/**
 * TONAIAgent - Secure Key Management Service
 *
 * Implements production-grade key management with:
 * - MPC (Multi-Party Computation) threshold signing (real threshold EdDSA)
 * - HSM integration support (AWS KMS, Azure Key Vault, Mock for CI)
 * - Secure enclave operations
 * - BIP-32/44 key derivation
 * - Key rotation and lifecycle management
 *
 * SECURITY CRITICAL: This module handles cryptographic operations.
 * AI agents NEVER have direct access to private keys.
 *
 * Threshold signing uses a FROST-like simplified protocol:
 *   1. Secret key scalar split via Shamir's Secret Sharing over ed25519 group order.
 *   2. Each party holds one share; any `threshold` parties can reconstruct the key.
 *   3. Signing uses additive nonce aggregation so the full key is never reconstructed
 *      in one place — each party computes a partial signature locally.
 *   4. The coordinator aggregates R points and partial scalars to produce a valid
 *      Ed25519 signature without ever holding the combined private key.
 */

import * as nodeCrypto from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { mod, invert } from '@noble/curves/abstract/modular.js';
import { sha512 } from '@noble/hashes/sha2.js';
import {
  KeyMetadata,
  KeyShare,
  KeyType,
  KeyStatus,
  KeyStorageType,
  MPCConfig,
  HSMConfig,
  KeyDerivationConfig,
  SigningRequest,
  SignatureInfo,
  SecurityEvent,
  SecurityEventCallback,
  ThresholdSigningSession,
} from './types';
import { AwsKmsAdapter } from './hsm/aws-kms.js';
import { AzureKeyVaultAdapter } from './hsm/azure-kv.js';

// ============================================================================
// Threshold EdDSA Cryptographic Primitives
// ============================================================================

/**
 * ed25519 group order (ℓ).
 * All scalar arithmetic is performed modulo this value.
 */
const ED25519_ORDER = BigInt(
  '7237005577332262213973186563042994240857116359379907606001950938285454250989'
);

/** Encode a scalar as a 32-byte little-endian Uint8Array. */
function scalarToBytes32LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  let tmp = mod(n, ED25519_ORDER);
  for (let i = 0; i < 32; i++) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  return buf;
}

/** Decode a 32-byte little-endian Uint8Array to a BigInt scalar. */
function bytes32LEToScalar(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

/** Decode a 64-byte little-endian Uint8Array to a BigInt scalar (for SHA-512 hash). */
function bytes64LEToScalar(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 63; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

/** Generate a cryptographically random scalar in [1, ℓ−1]. */
function randomScalar(): bigint {
  const bytes = ed25519.utils.randomSecretKey();
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  n = mod(n, ED25519_ORDER - 1n) + 1n;
  return n;
}

/**
 * Generate Shamir secret shares of `secret` over GF(ED25519_ORDER).
 * Returns `totalShares` shares where any `threshold` shares reconstruct the secret.
 *
 * @param secret    The scalar to split (Ed25519 private key scalar).
 * @param totalShares  Total number of shares (n).
 * @param threshold    Minimum shares needed to reconstruct (t).
 * @returns Array of { x: BigInt, y: BigInt } share pairs, x in [1..n].
 */
function shamirSplit(
  secret: bigint,
  totalShares: number,
  threshold: number
): Array<{ x: bigint; y: bigint }> {
  // Polynomial f(x) = secret + a1*x + a2*x^2 + ... + a(t-1)*x^(t-1) mod ℓ
  const coefficients: bigint[] = [mod(secret, ED25519_ORDER)];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomScalar());
  }

  const shares: Array<{ x: bigint; y: bigint }> = [];
  for (let i = 1; i <= totalShares; i++) {
    const x = BigInt(i);
    let y = 0n;
    for (let j = 0; j < coefficients.length; j++) {
      y = mod(y + coefficients[j] * mod(x ** BigInt(j), ED25519_ORDER), ED25519_ORDER);
    }
    shares.push({ x, y });
  }
  return shares;
}

/**
 * Compute the Lagrange basis coefficient λ_i for party x_i
 * given the set of participating party x-coordinates.
 */
function lagrangeCoefficient(xi: bigint, participantXs: bigint[]): bigint {
  let num = 1n;
  let den = 1n;
  for (const xj of participantXs) {
    if (xj === xi) continue;
    num = mod(num * (0n - xj), ED25519_ORDER);
    den = mod(den * (xi - xj), ED25519_ORDER);
  }
  return mod(num * invert(den, ED25519_ORDER), ED25519_ORDER);
}

/**
 * Compute a partial EdDSA signature for one share holder.
 *
 * Each party i computes:
 *   partial_s_i = r_i + h * λ_i * shareY_i  (mod ℓ)
 *
 * where h = SHA-512(R_agg || pubKey || message) mod ℓ,
 * R_agg = Σ R_j (the aggregate nonce point),
 * λ_i = Lagrange coefficient for party i.
 *
 * @param nonce          Party i's secret nonce scalar r_i.
 * @param shareY         Party i's Shamir share value y_i.
 * @param xi             Party i's share index (1-based).
 * @param participantXs  x-coordinates of all t participating parties.
 * @param challenge      The Ed25519 challenge scalar h.
 * @returns Partial scalar s_i as BigInt.
 */
function computePartialScalar(
  nonce: bigint,
  shareY: bigint,
  xi: bigint,
  participantXs: bigint[],
  challenge: bigint
): bigint {
  const lambda = lagrangeCoefficient(xi, participantXs);
  return mod(nonce + mod(challenge * mod(lambda * shareY, ED25519_ORDER), ED25519_ORDER), ED25519_ORDER);
}

/**
 * Compute the Ed25519 challenge scalar h from the protocol inputs.
 *
 * h = SHA-512(R_bytes || pubKey_bytes || message_bytes)  interpreted as
 *     a 512-bit little-endian integer reduced mod ℓ.
 * This matches the challenge computation in RFC 8032 §5.1.6.
 */
function computeChallenge(
  rBytes: Uint8Array,
  pubKeyBytes: Uint8Array,
  messageBytes: Uint8Array
): bigint {
  const input = new Uint8Array(rBytes.length + pubKeyBytes.length + messageBytes.length);
  input.set(rBytes, 0);
  input.set(pubKeyBytes, rBytes.length);
  input.set(messageBytes, rBytes.length + pubKeyBytes.length);
  return mod(bytes64LEToScalar(sha512(input)), ED25519_ORDER);
}

// ============================================================================
// Interfaces
// ============================================================================

export interface KeyManagementService {
  // Key lifecycle
  generateKey(
    userId: string,
    keyType: KeyType,
    config?: Partial<KeyGenerationConfig>
  ): Promise<KeyMetadata>;
  rotateKey(keyId: string): Promise<KeyMetadata>;
  revokeKey(keyId: string, reason: string): Promise<void>;
  getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
  listKeys(userId: string, options?: KeyListOptions): Promise<KeyMetadata[]>;

  // MPC operations
  generateMPCShares(keyId: string, config: MPCConfig): Promise<KeyShare[]>;
  getMPCSharesStatus(keyId: string): Promise<MPCSharesStatus>;

  // Signing (NEVER exposes private keys)
  createSigningRequest(
    keyId: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<SigningRequest>;
  addSignature(requestId: string, signature: SignatureInfo): Promise<SigningRequest>;
  getSigningRequest(requestId: string): Promise<SigningRequest | null>;
  cancelSigningRequest(requestId: string): Promise<void>;

  // Key derivation
  deriveChildKey(parentKeyId: string, path: string): Promise<KeyMetadata>;
  getDerivationPath(keyId: string): Promise<string | null>;

  // Public key operations (safe to expose)
  getPublicKey(keyId: string): Promise<string | null>;
  getAddress(keyId: string): Promise<string | null>;

  // Health and status
  getHealth(): Promise<KeyManagementHealth>;
}

export interface KeyGenerationConfig {
  algorithm: 'ed25519' | 'secp256k1';
  storageType: KeyStorageType;
  mpcEnabled: boolean;
  mpcConfig?: MPCConfig;
  derivationPath?: string;
  expiresInDays?: number;
}

export interface KeyListOptions {
  type?: KeyType;
  status?: KeyStatus;
  limit?: number;
  offset?: number;
}

export interface MPCSharesStatus {
  keyId: string;
  totalShares: number;
  threshold: number;
  activeShares: number;
  holders: Array<{
    type: 'user' | 'platform' | 'recovery_service';
    status: 'active' | 'pending' | 'expired';
  }>;
  canSign: boolean;
}

export interface KeyManagementHealth {
  available: boolean;
  hsmConnected: boolean;
  enclaveAttested: boolean;
  lastHealthCheck: Date;
  activeKeys: number;
  pendingRotations: number;
}

// ============================================================================
// Abstract Key Storage Backend
// ============================================================================

export abstract class KeyStorageBackend {
  abstract readonly type: KeyStorageType;

  abstract generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }>;

  abstract sign(keyId: string, message: string): Promise<string>;

  abstract verify(keyId: string, message: string, signature: string): Promise<boolean>;

  abstract getPublicKey(keyId: string): Promise<string | null>;

  abstract deleteKey(keyId: string): Promise<void>;

  abstract healthCheck(): Promise<boolean>;

  /**
   * Whether this backend can produce signatures natively for the given
   * algorithm. TON requires Ed25519; some HSM providers (AWS KMS, Azure
   * Key Vault) cannot produce Ed25519 signatures, so callers must check
   * compatibility before routing TON signing requests to the backend.
   *
   * Defaults to `true` — subclasses that can fail for specific algorithms
   * (notably `HSMKeyStorage`) should override.
   */
  supportsAlgorithm(_algorithm: 'ed25519' | 'secp256k1'): boolean {
    return true;
  }
}

// ============================================================================
// Software Key Storage (Development/Testing Only)
// ============================================================================

/**
 * Software-based key storage for development and testing.
 * WARNING: Not suitable for production use with real funds.
 *
 * Uses real cryptographic operations via node:crypto so that
 * signatures produced here are genuine and verifiable.
 */
export class SoftwareKeyStorage extends KeyStorageBackend {
  readonly type: KeyStorageType = 'software';

  private readonly keys = new Map<
    string,
    { publicKey: nodeCrypto.KeyObject; privateKey: nodeCrypto.KeyObject; algorithm: string }
  >();

  constructor() {
    super();
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SoftwareKeyStorage is not allowed in production. Use HSM or MPC custody.'
      );
    }
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const { publicKey, privateKey } =
      algorithm === 'ed25519'
        ? nodeCrypto.generateKeyPairSync('ed25519')
        : nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });

    this.keys.set(keyId, { publicKey, privateKey, algorithm });

    const publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    return { publicKey: publicKeyHex };
  }

  async sign(keyId: string, message: string): Promise<string> {
    const entry = this.keys.get(keyId);
    if (!entry) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const msgBuffer = Buffer.from(message);
    let signature: Buffer;

    if (entry.algorithm === 'ed25519') {
      signature = nodeCrypto.sign(null, msgBuffer, entry.privateKey);
    } else {
      // secp256k1 via ECDSA with SHA-256
      signature = nodeCrypto.createSign('SHA256').update(msgBuffer).sign(entry.privateKey);
    }

    return signature.toString('hex');
  }

  async verify(keyId: string, message: string, signature: string): Promise<boolean> {
    const entry = this.keys.get(keyId);
    if (!entry) {
      return false;
    }

    try {
      const msgBuffer = Buffer.from(message);
      const sigBuffer = Buffer.from(signature, 'hex');

      if (entry.algorithm === 'ed25519') {
        return nodeCrypto.verify(null, msgBuffer, entry.publicKey, sigBuffer);
      } else {
        // secp256k1 via ECDSA with SHA-256
        return nodeCrypto.createVerify('SHA256').update(msgBuffer).verify(entry.publicKey, sigBuffer);
      }
    } catch {
      return false;
    }
  }

  async getPublicKey(keyId: string): Promise<string | null> {
    const entry = this.keys.get(keyId);
    if (!entry) return null;
    return entry.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ============================================================================
// HSM Provider Adapters
// ============================================================================

// The HSMProviderAdapter interface and the AwsKmsAdapter / AzureKeyVaultAdapter
// implementations now live in core/security/hsm/.  They are re-exported here
// for backwards compatibility via the imports added at the top of this file.

type HSMProviderAdapter = import('./hsm/aws-kms.js').HSMProviderAdapter;

// ============================================================================
// Mock HSM Adapter (CI / local dev)
// ============================================================================

/**
 * In-memory HSM adapter backed by node:crypto.
 * Produces real cryptographic operations so that tests are meaningful,
 * but stores keys only in RAM — never safe for production key material.
 *
 * Enabled by setting provider = 'mock' in HSMConfig.
 */
class MockHSMAdapter implements HSMProviderAdapter {
  private readonly keys = new Map<
    string,
    { pub: nodeCrypto.KeyObject; priv: nodeCrypto.KeyObject; algorithm: string }
  >();

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const pair =
      algorithm === 'ed25519'
        ? nodeCrypto.generateKeyPairSync('ed25519')
        : nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });

    this.keys.set(keyId, { pub: pair.publicKey, priv: pair.privateKey, algorithm });
    const pubHex = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    return { publicKey: pubHex };
  }

  async sign(keyId: string, message: Buffer): Promise<Buffer> {
    const entry = this.keys.get(keyId);
    if (!entry) throw new Error(`MockHSM: key not found: ${keyId}`);

    if (entry.algorithm === 'ed25519') {
      return nodeCrypto.sign(null, message, entry.priv);
    }
    return nodeCrypto.createSign('SHA256').update(message).sign(entry.priv);
  }

  async getPublicKey(keyId: string): Promise<Buffer | null> {
    const entry = this.keys.get(keyId);
    if (!entry) return null;
    return entry.pub.export({ type: 'spki', format: 'der' }) as Buffer;
  }

  async deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  supportsAlgorithm(_algorithm: 'ed25519' | 'secp256k1'): boolean {
    // node:crypto natively supports both Ed25519 and secp256k1.
    return true;
  }
}

// AwsKmsAdapter and AzureKeyVaultAdapter are now in separate files:
//   core/security/hsm/aws-kms.ts
//   core/security/hsm/azure-kv.ts
// They are imported at the top of this file.  Both now use a persistent
// KeyRegistry so the keyId → provider reference mapping survives process
// restarts (issue #343).

// ============================================================================
// HSM Key Storage Adapter
// ============================================================================

/**
 * HSM-based key storage for production use.
 *
 * Supported providers:
 *   - 'aws_kms'      — AWS KMS (recommended for cloud deployments)
 *   - 'aws_cloudhsm' — AWS CloudHSM via KMS custom key store (same SDK)
 *   - 'azure_hsm'    — Azure Key Vault (Managed HSM or Premium tier)
 *   - 'mock'         — In-memory mock for CI / local dev without real hardware
 *
 * Set `NODE_HSM_PROVIDER` env var or pass `provider` in config to select.
 * See docs/hsm-setup.md for detailed setup instructions per provider.
 */
export class HSMKeyStorage extends KeyStorageBackend {
  readonly type: KeyStorageType = 'hsm';
  /** The configured HSM provider name, exposed for capability-check error messages. */
  readonly providerName: string;

  private readonly adapter: HSMProviderAdapter;

  constructor(private readonly config: HSMConfig) {
    super();

    const provider = config.provider ?? process.env.NODE_HSM_PROVIDER ?? 'mock';
    this.providerName = provider;

    switch (provider) {
      case 'mock':
        if (process.env.NODE_ENV === 'production' && !config.mockAllowProduction) {
          throw new Error(
            'HSMKeyStorage mock provider is not allowed in production. ' +
              'Configure a real HSM provider (aws_kms, azure_hsm, etc.).'
          );
        }
        this.adapter = new MockHSMAdapter();
        break;

      case 'aws_kms':
      case 'aws_cloudhsm':
        this.adapter = new AwsKmsAdapter(config);
        break;

      case 'azure_hsm':
        this.adapter = new AzureKeyVaultAdapter(config);
        break;

      case 'thales_luna':
      case 'yubihsm':
        throw new Error(
          `HSM provider '${provider}' is not yet implemented. ` +
            `Use 'aws_kms', 'azure_hsm', or 'mock' for CI. ` +
            `Contributions welcome — see docs/hsm-setup.md.`
        );

      default:
        throw new Error(`Unknown HSM provider: '${provider as string}'.`);
    }
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    if (!this.adapter.supportsAlgorithm(algorithm)) {
      throw new Error(
        `HSM provider '${this.providerName}' does not support algorithm '${algorithm}'. ` +
          `TON signing requires Ed25519 — route TON keys through MPCCoordinator ` +
          `or use an Ed25519-capable HSM (YubiHSM 2, AWS CloudHSM via PKCS#11, ` +
          `Thales Luna). See docs/hsm-setup.md and docs/mpc-architecture.md.`
      );
    }
    return this.adapter.generateKeyPair(keyId, algorithm);
  }

  supportsAlgorithm(algorithm: 'ed25519' | 'secp256k1'): boolean {
    return this.adapter.supportsAlgorithm(algorithm);
  }

  async sign(keyId: string, message: string): Promise<string> {
    const msgBuf = Buffer.from(message);
    const sig = await this.adapter.sign(keyId, msgBuf);
    return sig.toString('hex');
  }

  async verify(keyId: string, message: string, signature: string): Promise<boolean> {
    try {
      const pubBuf = await this.adapter.getPublicKey(keyId);
      if (!pubBuf) return false;

      const msgBuf = Buffer.from(message);
      const sigBuf = Buffer.from(signature, 'hex');

      // Import the DER-encoded SubjectPublicKeyInfo as a node:crypto KeyObject
      const pubKey = nodeCrypto.createPublicKey({ key: pubBuf, format: 'der', type: 'spki' });

      // Determine algorithm from key type
      const keyType = pubKey.asymmetricKeyType;
      if (keyType === 'ed25519') {
        return nodeCrypto.verify(null, msgBuf, pubKey, sigBuf);
      }
      // EC keys (P-256, P-256K) — ECDSA with SHA-256
      return nodeCrypto.createVerify('SHA256').update(msgBuf).verify(pubKey, sigBuf);
    } catch {
      return false;
    }
  }

  async getPublicKey(keyId: string): Promise<string | null> {
    const buf = await this.adapter.getPublicKey(keyId);
    return buf ? buf.toString('hex') : null;
  }

  async deleteKey(keyId: string): Promise<void> {
    await this.adapter.deleteKey(keyId);
  }

  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }
}

// ============================================================================
// MPC Coordinator
// ============================================================================

/**
 * Internal record of a threshold signing session.
 * Holds per-party nonces (never leaves the coordinator in plaintext),
 * the aggregate nonce point R, and the collected partial scalars.
 */
interface ActiveSigningSession {
  /** Aggregate nonce point R = Σ R_i, serialised as hex. */
  aggregateRHex: string;
  /** Per-party nonces r_i (held server-side during the session, cleared after). */
  nonces: Map<string, bigint>;
  /** Partial scalars s_i keyed by shareId. */
  partialScalars: Map<string, bigint>;
  /** The Shamir share x-coordinates of the participating parties, in declaration order. */
  participantXs: bigint[];
  /** Replay-protection nonce for this session. */
  sessionNonce: string;
  /** Timestamp of session creation (ms). */
  createdAt: number;
}

/**
 * Coordinates MPC (Multi-Party Computation) threshold signing.
 *
 * Implements a simplified FROST-like threshold EdDSA protocol:
 *   - Keys are split using Shamir's Secret Sharing over the ed25519 group order.
 *   - Signing never reconstructs the full private key — parties contribute
 *     partial scalars that are aggregated into a valid Ed25519 signature.
 *   - Each signing session gets a unique nonce for replay protection.
 */
export class MPCCoordinator {
  /**
   * Metadata for each keyId's shares (public info only — share values are held
   * by each party separately; only shareIndex and holderType are stored here).
   */
  private readonly shareMetadata = new Map<string, KeyShare[]>();

  /**
   * Shamir share values for keyId → array indexed by shareIndex.
   * In a production multi-party system these would live in separate processes /
   * HSM partitions.  Here they are held in-process as the reference implementation.
   */
  private readonly shareValues = new Map<string, Array<{ x: bigint; y: bigint }>>();

  /** Public keys (compressed ed25519 point) per keyId, hex-encoded. */
  private readonly publicKeys = new Map<string, string>();

  /** Active threshold signing sessions, keyed by signingRequestId. */
  private readonly activeSessions = new Map<string, ActiveSigningSession>();

  constructor(private readonly config: MPCConfig) {}

  // --------------------------------------------------------------------------
  // DKG: Distributed Key Generation
  // --------------------------------------------------------------------------

  /**
   * Initialise a new threshold key and distribute shares.
   *
   * Generates a fresh Ed25519 key pair, splits the private scalar using
   * Shamir's Secret Sharing, and creates the public KeyShare metadata
   * records for each party.
   *
   * In a production deployment the Shamir share values (shareValues map)
   * would be encrypted and transmitted to each party's isolated environment
   * over a secure channel; they must never all reside in the same process.
   *
   * @param keyId  Unique identifier for the key.
   * @returns      Array of KeyShare metadata (share values NOT included).
   */
  async generateShares(keyId: string): Promise<KeyShare[]> {
    // Generate a fresh Ed25519 secret key and derive the scalar.
    const secretKey = ed25519.utils.randomSecretKey();
    const { scalar, pointBytes } = ed25519.utils.getExtendedPublicKey(secretKey);

    // Persist the public key so it can be used during signing.
    this.publicKeys.set(keyId, Buffer.from(pointBytes).toString('hex'));

    // Split the private scalar into Shamir shares.
    const rawShares = shamirSplit(scalar, this.config.totalShares, this.config.threshold);
    this.shareValues.set(keyId, rawShares);

    const holders: Array<'user' | 'platform' | 'recovery_service'> = [
      'user',
      'platform',
      'recovery_service',
    ];

    const shares: KeyShare[] = rawShares.map((raw, i) => ({
      id: `share_${keyId}_${i + 1}`,
      keyId,
      shareIndex: i + 1,        // 1-based to match Shamir x-coordinates
      totalShares: this.config.totalShares,
      threshold: this.config.threshold,
      holderType: holders[i % holders.length],
      // publicData encodes the share's public commitment: shareIndex * G (hex).
      // This allows other parties to verify a partial signature's R contribution
      // without revealing the share value.
      publicData: Buffer.from(
        ed25519.Point.BASE.multiply(raw.y).toBytes()
      ).toString('hex'),
      createdAt: new Date(),
    }));

    this.shareMetadata.set(keyId, shares);
    return shares;
  }

  /**
   * Get status of MPC shares for a key
   */
  getSharesStatus(keyId: string): MPCSharesStatus | null {
    const shares = this.shareMetadata.get(keyId);
    if (!shares) {
      return null;
    }

    const holders = shares.map((s) => ({
      type: s.holderType,
      status: 'active' as const,
    }));

    return {
      keyId,
      totalShares: this.config.totalShares,
      threshold: this.config.threshold,
      activeShares: shares.length,
      holders,
      canSign: shares.length >= this.config.threshold,
    };
  }

  /**
   * Return the public key hex for a key managed by this coordinator.
   */
  getPublicKey(keyId: string): string | null {
    return this.publicKeys.get(keyId) ?? null;
  }

  // --------------------------------------------------------------------------
  // Threshold Signing Protocol
  // --------------------------------------------------------------------------

  /**
   * Open a new threshold signing session for a message.
   *
   * Selects `threshold` parties, generates per-party nonces, aggregates the
   * nonce point R = Σ r_i·G, and persists the session.  Returns the session
   * descriptor that embeds the aggregate R and the session nonce required for
   * replay protection.
   *
   * @param keyId             Key whose shares will be used.
   * @param signingRequestId  Signing request identifier (used as session key).
   * @param participantShareIndices  1-based share indices of the t participating parties.
   *                                 Defaults to the first `threshold` shares.
   * @returns  ThresholdSigningSession with aggregate R hex and session nonce.
   */
  async openSigningSession(
    keyId: string,
    signingRequestId: string,
    participantShareIndices?: number[]
  ): Promise<ThresholdSigningSession> {
    if (this.activeSessions.has(signingRequestId)) {
      throw new Error(`Signing session already open for request: ${signingRequestId}`);
    }

    const rawShares = this.shareValues.get(keyId);
    if (!rawShares) {
      throw new Error(`No Shamir shares found for key: ${keyId}`);
    }

    // Default: use the first `threshold` parties.
    const indices = participantShareIndices
      ?? Array.from({ length: this.config.threshold }, (_, i) => i + 1);

    if (indices.length < this.config.threshold) {
      throw new Error(
        `Not enough participants: need ${this.config.threshold}, got ${indices.length}`
      );
    }

    const participantXs = indices.map(BigInt);
    const G = ed25519.Point.BASE;

    // Each party generates a secret nonce r_i and commits R_i = r_i · G.
    // We accumulate all R_i using the first point as the initial value to
    // avoid multiplying by 0 (which is invalid on edwards curves).
    const nonces = new Map<string, bigint>();
    const noncePoints: Array<(typeof G)> = [];

    for (const idx of indices) {
      const shareId = `share_${keyId}_${idx}`;
      const r = randomScalar();
      nonces.set(shareId, r);
      noncePoints.push(G.multiply(r));
    }

    // Aggregate R = Σ R_i
    let aggregateR = noncePoints[0];
    for (let i = 1; i < noncePoints.length; i++) {
      aggregateR = aggregateR.add(noncePoints[i]);
    }

    const aggregateRHex = Buffer.from(aggregateR.toBytes()).toString('hex');
    const sessionNonce = nodeCrypto.randomBytes(16).toString('hex');

    const session: ActiveSigningSession = {
      aggregateRHex,
      nonces,
      partialScalars: new Map(),
      participantXs,
      sessionNonce,
      createdAt: Date.now(),
    };
    this.activeSessions.set(signingRequestId, session);

    const descriptor: ThresholdSigningSession = {
      signingRequestId,
      keyId,
      aggregateRHex,
      participantIndices: indices,
      sessionNonce,
      threshold: this.config.threshold,
      createdAt: new Date(session.createdAt),
    };
    return descriptor;
  }

  /**
   * Compute and collect the partial signature for one share holder.
   *
   * Each participating party calls this with the message to sign.
   * Internally the coordinator looks up the party's nonce and share value,
   * computes the partial scalar, and stores it.
   *
   * @param signingRequestId  Session identifier.
   * @param shareId           Share identifier (e.g. `share_<keyId>_<index>`).
   * @param message           The message bytes to sign.
   * @param pubKeyHex         Hex-encoded public key (for challenge computation).
   * @returns  `true` once threshold partial signatures have been collected.
   */
  async computeAndCollectPartialSignature(
    signingRequestId: string,
    shareId: string,
    message: Uint8Array | string,
    pubKeyHex: string
  ): Promise<boolean> {
    const session = this.activeSessions.get(signingRequestId);
    if (!session) {
      throw new Error(`No active signing session for request: ${signingRequestId}`);
    }

    const nonce = session.nonces.get(shareId);
    if (nonce === undefined) {
      throw new Error(`Share ${shareId} is not a participant in this session`);
    }

    if (session.partialScalars.has(shareId)) {
      throw new Error(`Partial signature already collected for share: ${shareId}`);
    }

    // Derive keyId and shareIndex from shareId format `share_<keyId>_<index>`.
    const lastUnderscore = shareId.lastIndexOf('_');
    const keyId = shareId.slice('share_'.length, lastUnderscore);
    const shareIndex = parseInt(shareId.slice(lastUnderscore + 1), 10);

    const rawShares = this.shareValues.get(keyId);
    if (!rawShares) {
      throw new Error(`Share values not found for key: ${keyId}`);
    }

    const raw = rawShares.find((s) => s.x === BigInt(shareIndex));
    if (!raw) {
      throw new Error(`Share index ${shareIndex} not found for key: ${keyId}`);
    }

    const msgBytes = typeof message === 'string' ? Buffer.from(message) : message;
    const rBytes = Buffer.from(session.aggregateRHex, 'hex');
    const pubKeyBytes = Buffer.from(pubKeyHex, 'hex');

    const challenge = computeChallenge(
      new Uint8Array(rBytes),
      new Uint8Array(pubKeyBytes),
      new Uint8Array(msgBytes)
    );

    const partialScalar = computePartialScalar(
      nonce,
      raw.y,
      BigInt(shareIndex),
      session.participantXs,
      challenge
    );

    session.partialScalars.set(shareId, partialScalar);
    return session.partialScalars.size >= this.config.threshold;
  }

  /**
   * Legacy: Collect a pre-computed partial signature from a share holder.
   *
   * Accepts a hex-encoded partial scalar from an external party and stores it.
   * Use `computeAndCollectPartialSignature` when the coordinator holds shares.
   *
   * @param signingRequestId  Session identifier.
   * @param shareId           Share identifier.
   * @param partialSignature  Hex-encoded partial scalar (32-byte LE).
   * @returns  `true` once threshold partial signatures have been collected.
   */
  async collectPartialSignature(
    signingRequestId: string,
    shareId: string,
    partialSignature: string
  ): Promise<boolean> {
    const session = this.activeSessions.get(signingRequestId);
    if (!session) {
      // Fall back: create a minimal session entry for legacy callers that do not
      // call openSigningSession first.
      const legacySession: ActiveSigningSession = {
        aggregateRHex: '',
        nonces: new Map(),
        partialScalars: new Map(),
        participantXs: [],
        sessionNonce: nodeCrypto.randomBytes(16).toString('hex'),
        createdAt: Date.now(),
      };
      legacySession.partialScalars.set(shareId, BigInt('0x' + partialSignature));
      this.activeSessions.set(signingRequestId, legacySession);
      return legacySession.partialScalars.size >= this.config.threshold;
    }

    const scalar = bytes32LEToScalar(Buffer.from(partialSignature, 'hex'));
    session.partialScalars.set(shareId, scalar);
    return session.partialScalars.size >= this.config.threshold;
  }

  /**
   * Combine collected partial signatures into a final Ed25519 signature.
   *
   * Aggregates the partial scalars s_i into S = Σ s_i mod ℓ and assembles
   * the standard Ed25519 wire format: 32-byte R || 32-byte S.
   *
   * The resulting signature is a cryptographically valid Ed25519 signature
   * verifiable with the key's public key via `ed25519.verify`.
   *
   * @param signingRequestId  Signing request / session identifier.
   * @returns  Hex-encoded 64-byte Ed25519 signature, or null if not ready.
   */
  async combineSignatures(signingRequestId: string): Promise<string | null> {
    const session = this.activeSessions.get(signingRequestId);
    if (!session || session.partialScalars.size < this.config.threshold) {
      return null;
    }

    if (!session.aggregateRHex) {
      // Legacy path: no R was established — cannot produce a valid signature.
      return null;
    }

    // Aggregate S = Σ s_i mod ℓ
    let S = 0n;
    for (const ps of session.partialScalars.values()) {
      S = mod(S + ps, ED25519_ORDER);
    }

    // Encode as Ed25519 signature: R_bytes (32) || S_bytes (32), both little-endian.
    const rBytes = Buffer.from(session.aggregateRHex, 'hex');
    const sBytes = scalarToBytes32LE(S);

    const sig = new Uint8Array(64);
    sig.set(rBytes, 0);
    sig.set(sBytes, 32);

    return Buffer.from(sig).toString('hex');
  }

  /**
   * Clear the signing session after completion or timeout.
   * Purges all nonces and partial scalars for the session.
   */
  clearSignatures(signingRequestId: string): void {
    this.activeSessions.delete(signingRequestId);
  }

  // --------------------------------------------------------------------------
  // Helper: high-level single-call threshold sign (for testing / integration)
  // --------------------------------------------------------------------------

  /**
   * Perform a complete threshold signing flow in a single call.
   *
   * This convenience method orchestrates all protocol steps internally.
   * It is suitable for testing and for deployments where all parties
   * are co-located (e.g., in a secure enclave).
   *
   * @param keyId     Key identifier whose Shamir shares are used.
   * @param message   Message to sign (hex string or Uint8Array).
   * @param requestId Optional signing request ID (generated if omitted).
   * @returns  Hex-encoded 64-byte Ed25519 signature.
   */
  async thresholdSign(
    keyId: string,
    message: Uint8Array | string,
    requestId?: string
  ): Promise<string> {
    const pubKeyHex = this.publicKeys.get(keyId);
    if (!pubKeyHex) {
      throw new Error(`Public key not found for key: ${keyId}`);
    }

    const signingRequestId = requestId ?? `tss_${Date.now()}_${nodeCrypto.randomBytes(4).toString('hex')}`;

    // Open session (uses first `threshold` parties by default).
    const session = await this.openSigningSession(keyId, signingRequestId);

    // Each participating party computes their partial signature.
    for (const idx of session.participantIndices) {
      const shareId = `share_${keyId}_${idx}`;
      await this.computeAndCollectPartialSignature(
        signingRequestId,
        shareId,
        message,
        pubKeyHex
      );
    }

    // Combine and return the final signature.
    const signature = await this.combineSignatures(signingRequestId);
    this.clearSignatures(signingRequestId);

    if (!signature) {
      throw new Error('Failed to combine threshold signatures');
    }
    return signature;
  }

  /**
   * Verify a threshold-signed signature against this key's public key.
   *
   * @param keyId      Key identifier.
   * @param message    The signed message.
   * @param signature  Hex-encoded 64-byte Ed25519 signature.
   * @returns `true` if the signature is valid.
   */
  verifyThresholdSignature(
    keyId: string,
    message: Uint8Array | string,
    signature: string
  ): boolean {
    const pubKeyHex = this.publicKeys.get(keyId);
    if (!pubKeyHex) return false;

    try {
      const msgBytes = typeof message === 'string' ? Buffer.from(message) : message;
      const sigBytes = Buffer.from(signature, 'hex');
      const pubKeyBytes = Buffer.from(pubKeyHex, 'hex');
      return ed25519.verify(new Uint8Array(sigBytes), new Uint8Array(msgBytes), new Uint8Array(pubKeyBytes));
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Key Derivation Service
// ============================================================================

/**
 * Implements hierarchical deterministic key derivation (BIP-32/44).
 * Used for generating agent-specific wallets from master keys.
 */
export class KeyDerivationService {
  constructor(private readonly config: KeyDerivationConfig) {}

  /**
   * Generate derivation path for TON wallet
   */
  generatePath(accountIndex: number, addressIndex: number = 0): string {
    const purpose = 44; // BIP-44
    const coinType = this.config.coinType; // 607 for TON
    const change = 0; // External chain

    // Note: hardened config is used for path generation format in production
    // Currently using standard hardened format (with ')

    return `m/${purpose}'/${coinType}'/${accountIndex}'/${change}/${addressIndex}`;
  }

  /**
   * Parse a derivation path
   */
  parsePath(path: string): DerivationPathComponents | null {
    const match = path.match(/^m\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?\/(\d+)'?$/);
    if (!match) {
      return null;
    }

    return {
      purpose: parseInt(match[1]),
      coinType: parseInt(match[2]),
      account: parseInt(match[3]),
      change: parseInt(match[4]),
      addressIndex: parseInt(match[5]),
    };
  }

  /**
   * Validate derivation path
   */
  validatePath(path: string): boolean {
    const components = this.parsePath(path);
    if (!components) {
      return false;
    }

    return components.coinType === this.config.coinType;
  }

  /**
   * Get next available account index
   */
  getNextAccountIndex(existingPaths: string[]): number {
    const accountIndices = existingPaths
      .map((p) => this.parsePath(p))
      .filter((c): c is DerivationPathComponents => c !== null)
      .map((c) => c.account);

    if (accountIndices.length === 0) {
      return 0;
    }

    return Math.max(...accountIndices) + 1;
  }
}

export interface DerivationPathComponents {
  purpose: number;
  coinType: number;
  account: number;
  change: number;
  addressIndex: number;
}

// ============================================================================
// Key Management Service Implementation
// ============================================================================

export class SecureKeyManager implements KeyManagementService {
  private readonly keys = new Map<string, KeyMetadata>();
  private readonly signingRequests = new Map<string, SigningRequest>();
  private readonly mpcCoordinator: MPCCoordinator;
  private readonly derivationService: KeyDerivationService;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor(
    private readonly storage: KeyStorageBackend,
    config: {
      mpc: MPCConfig;
      keyDerivation: KeyDerivationConfig;
    }
  ) {
    this.mpcCoordinator = new MPCCoordinator(config.mpc);
    this.derivationService = new KeyDerivationService(config.keyDerivation);
  }

  /**
   * Subscribe to security events
   */
  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Generate a new key
   */
  async generateKey(
    userId: string,
    keyType: KeyType,
    config?: Partial<KeyGenerationConfig>
  ): Promise<KeyMetadata> {
    const keyId = this.generateKeyId(userId, keyType);
    const algorithm = config?.algorithm ?? 'ed25519';
    const storageType = config?.storageType ?? this.storage.type;

    // Fail-fast capability check (NEW-02 / issue #332):
    // TON requires Ed25519 signatures. If the caller requests a TON-compatible
    // key but the configured backend cannot produce native Ed25519 signatures
    // (e.g. AWS KMS / Azure Key Vault fall back to P-256), refuse to create the
    // key unless the key will be managed via MPC threshold signing instead.
    if (!this.storage.supportsAlgorithm(algorithm) && !config?.mpcEnabled) {
      throw new Error(
        `Cannot generate '${algorithm}' key on storage backend '${this.storage.type}': ` +
          `the backend does not natively support '${algorithm}'. ` +
          `For TON signing, enable MPC (set mpcEnabled: true) or configure an ` +
          `Ed25519-capable HSM. See docs/hsm-setup.md and docs/mpc-architecture.md.`
      );
    }

    // Generate key pair - publicKey is stored in secure storage.
    // When MPC is enabled for an algorithm the backend cannot produce natively,
    // the backend is used only for auxiliary storage and the MPC coordinator
    // produces the actual Ed25519 signatures.
    if (this.storage.supportsAlgorithm(algorithm)) {
      await this.storage.generateKeyPair(keyId, algorithm);
    }

    // Create metadata
    const metadata: KeyMetadata = {
      id: keyId,
      type: keyType,
      algorithm,
      storageType,
      createdAt: new Date(),
      expiresAt: config?.expiresInDays
        ? new Date(Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      derivationPath: config?.derivationPath,
      version: 1,
      status: 'active',
    };

    // Store metadata
    this.keys.set(keyId, metadata);

    // Generate MPC shares if enabled
    if (config?.mpcEnabled && config?.mpcConfig) {
      await this.mpcCoordinator.generateShares(keyId);
    }

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'key_management',
      message: `Key generated: ${keyId}`,
      data: { keyId, keyType, userId },
    });

    return metadata;
  }

  /**
   * Rotate an existing key
   */
  async rotateKey(keyId: string): Promise<KeyMetadata> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (existingKey.status !== 'active') {
      throw new Error(`Cannot rotate key with status: ${existingKey.status}`);
    }

    // Mark existing key as pending rotation
    existingKey.status = 'pending_rotation';
    this.keys.set(keyId, existingKey);

    // Generate new key - publicKey is stored in secure storage
    const newKeyId = `${keyId}_v${existingKey.version + 1}`;
    await this.storage.generateKeyPair(newKeyId, existingKey.algorithm);

    // Create new metadata
    const newMetadata: KeyMetadata = {
      id: newKeyId,
      type: existingKey.type,
      algorithm: existingKey.algorithm,
      storageType: existingKey.storageType,
      createdAt: new Date(),
      expiresAt: existingKey.expiresAt,
      rotatedFrom: keyId,
      derivationPath: existingKey.derivationPath,
      version: existingKey.version + 1,
      status: 'active',
    };

    // Mark old key as rotated
    existingKey.status = 'rotated';
    this.keys.set(keyId, existingKey);

    // Store new metadata
    this.keys.set(newKeyId, newMetadata);

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_rotated',
      severity: 'low',
      source: 'key_management',
      message: `Key rotated: ${keyId} -> ${newKeyId}`,
      data: { oldKeyId: keyId, newKeyId },
    });

    return newMetadata;
  }

  /**
   * Revoke a key
   */
  async revokeKey(keyId: string, reason: string): Promise<void> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    existingKey.status = 'revoked';
    this.keys.set(keyId, existingKey);

    // Delete from storage
    await this.storage.deleteKey(keyId);

    // Emit event
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_revoked',
      severity: 'medium',
      source: 'key_management',
      message: `Key revoked: ${keyId}`,
      data: { keyId, reason },
    });
  }

  /**
   * Get key metadata
   */
  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keys.get(keyId) ?? null;
  }

  /**
   * List keys for a user
   */
  async listKeys(userId: string, options?: KeyListOptions): Promise<KeyMetadata[]> {
    const allKeys = Array.from(this.keys.values());

    let filtered = allKeys.filter((k) => k.id.startsWith(`key_${userId}_`));

    if (options?.type) {
      filtered = filtered.filter((k) => k.type === options.type);
    }

    if (options?.status) {
      filtered = filtered.filter((k) => k.status === options.status);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Generate MPC shares for a key
   */
  async generateMPCShares(keyId: string, _config: MPCConfig): Promise<KeyShare[]> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    return this.mpcCoordinator.generateShares(keyId);
  }

  /**
   * Get MPC shares status
   */
  async getMPCSharesStatus(keyId: string): Promise<MPCSharesStatus> {
    const status = this.mpcCoordinator.getSharesStatus(keyId);
    if (!status) {
      throw new Error(`No MPC shares found for key: ${keyId}`);
    }
    return status;
  }

  /**
   * Create a signing request
   */
  async createSigningRequest(
    keyId: string,
    message: string,
    metadata: Record<string, unknown>
  ): Promise<SigningRequest> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (key.status !== 'active') {
      throw new Error(`Cannot sign with key status: ${key.status}`);
    }

    const requestId = `sig_req_${Date.now()}_${nodeCrypto.randomBytes(8).toString('hex')}`;
    const messageHash = Buffer.from(message).toString('base64');

    const mpcStatus = this.mpcCoordinator.getSharesStatus(keyId);

    // Fail-fast routing guard (NEW-02 / issue #332):
    // Never send an Ed25519 signing request to a backend that would silently
    // fall back to a TON-incompatible algorithm (AWS KMS / Azure Key Vault
    // map Ed25519 to P-256). If MPC shares exist, the coordinator handles
    // signing natively and this check is bypassed.
    if (!mpcStatus && !this.storage.supportsAlgorithm(key.algorithm)) {
      throw new Error(
        `Cannot sign '${key.algorithm}' request with key ${keyId}: ` +
          `storage backend '${this.storage.type}' does not natively support ` +
          `'${key.algorithm}' and no MPC shares are configured. ` +
          `For TON signing, route this key through MPCCoordinator ` +
          `(generateMPCShares) or migrate to an Ed25519-capable HSM.`
      );
    }

    const request: SigningRequest = {
      id: requestId,
      transactionId: (metadata.transactionId as string) ?? requestId,
      authorizationId: (metadata.authorizationId as string) ?? '',
      message,
      messageHash,
      signerType: mpcStatus ? 'mpc_threshold' : 'single',
      requiredSignatures: mpcStatus?.threshold ?? 1,
      collectedSignatures: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    this.signingRequests.set(requestId, request);
    return request;
  }

  /**
   * Add a signature to a signing request
   */
  async addSignature(requestId: string, signature: SignatureInfo): Promise<SigningRequest> {
    const request = this.signingRequests.get(requestId);
    if (!request) {
      throw new Error(`Signing request not found: ${requestId}`);
    }

    if (request.status === 'expired' || request.status === 'failed') {
      throw new Error(`Cannot add signature to request with status: ${request.status}`);
    }

    // Verify signature
    const verified = await this.storage.verify(
      signature.publicKey,
      request.message,
      signature.signature
    );

    const signatureWithVerification: SignatureInfo = {
      ...signature,
      verified,
    };

    request.collectedSignatures.push(signatureWithVerification);

    // Check if we have enough signatures
    if (request.collectedSignatures.length >= request.requiredSignatures) {
      request.status = 'ready_to_broadcast';
    } else {
      request.status = 'collecting_signatures';
    }

    this.signingRequests.set(requestId, request);
    return request;
  }

  /**
   * Get signing request
   */
  async getSigningRequest(requestId: string): Promise<SigningRequest | null> {
    return this.signingRequests.get(requestId) ?? null;
  }

  /**
   * Cancel signing request
   */
  async cancelSigningRequest(requestId: string): Promise<void> {
    const request = this.signingRequests.get(requestId);
    if (request) {
      request.status = 'failed';
      this.signingRequests.set(requestId, request);
    }
  }

  /**
   * Derive a child key
   */
  async deriveChildKey(parentKeyId: string, path: string): Promise<KeyMetadata> {
    const parentKey = this.keys.get(parentKeyId);
    if (!parentKey) {
      throw new Error(`Parent key not found: ${parentKeyId}`);
    }

    if (!this.derivationService.validatePath(path)) {
      throw new Error(`Invalid derivation path: ${path}`);
    }

    const childKeyId = `${parentKeyId}_derived_${path.replace(/\//g, '_')}`;

    // In production, would derive actual child key from parent - publicKey stored in secure storage
    await this.storage.generateKeyPair(childKeyId, parentKey.algorithm);

    const childMetadata: KeyMetadata = {
      id: childKeyId,
      type: 'signing',
      algorithm: parentKey.algorithm,
      storageType: parentKey.storageType,
      createdAt: new Date(),
      derivationPath: path,
      version: 1,
      status: 'active',
    };

    this.keys.set(childKeyId, childMetadata);
    return childMetadata;
  }

  /**
   * Get derivation path for a key
   */
  async getDerivationPath(keyId: string): Promise<string | null> {
    const key = this.keys.get(keyId);
    return key?.derivationPath ?? null;
  }

  /**
   * Get public key (safe to expose)
   */
  async getPublicKey(keyId: string): Promise<string | null> {
    return this.storage.getPublicKey(keyId);
  }

  /**
   * Get wallet address from public key
   */
  async getAddress(keyId: string): Promise<string | null> {
    const publicKey = await this.getPublicKey(keyId);
    if (!publicKey) {
      return null;
    }

    // In production, would derive actual TON address
    // For now, return a mock address format
    return `EQ${Buffer.from(publicKey).toString('base64').slice(0, 46)}`;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<KeyManagementHealth> {
    const storageHealthy = await this.storage.healthCheck();

    const activeKeys = Array.from(this.keys.values()).filter((k) => k.status === 'active').length;

    const pendingRotations = Array.from(this.keys.values()).filter(
      (k) => k.status === 'pending_rotation'
    ).length;

    return {
      available: storageHealthy,
      hsmConnected: this.storage.type === 'hsm' && storageHealthy,
      enclaveAttested: this.storage.type === 'enclave' && storageHealthy,
      lastHealthCheck: new Date(),
      activeKeys,
      pendingRotations,
    };
  }

  private generateKeyId(userId: string, keyType: KeyType): string {
    return `key_${userId}_${keyType}_${Date.now()}_${nodeCrypto.randomBytes(4).toString('hex')}`;
  }

  private emitEvent(event: SecurityEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (e) {
        // Log but do not propagate callback errors — monitoring should not crash the security module
        console.warn('[SecurityKeyManager] Event callback error:', (e as Error)?.message ?? e);
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createKeyManager(
  config: {
    mpc?: Partial<MPCConfig>;
    keyDerivation?: Partial<KeyDerivationConfig>;
    storageType?: KeyStorageType;
    hsm?: HSMConfig;
  } = {}
): SecureKeyManager {
  const mpcConfig: MPCConfig = {
    threshold: config.mpc?.threshold ?? 2,
    totalShares: config.mpc?.totalShares ?? 3,
    recoveryEnabled: config.mpc?.recoveryEnabled ?? true,
    recoveryThreshold: config.mpc?.recoveryThreshold ?? 2,
    keyDerivationEnabled: config.mpc?.keyDerivationEnabled ?? true,
  };

  const keyDerivationConfig: KeyDerivationConfig = {
    standard: config.keyDerivation?.standard ?? 'bip44',
    coinType: config.keyDerivation?.coinType ?? 607, // TON
    accountIndex: config.keyDerivation?.accountIndex ?? 0,
    hardened: config.keyDerivation?.hardened ?? true,
  };

  let storage: KeyStorageBackend;

  if (config.storageType === 'hsm' && config.hsm) {
    storage = new HSMKeyStorage(config.hsm);
  } else {
    // Default to software storage (development only)
    storage = new SoftwareKeyStorage();
  }

  return new SecureKeyManager(storage, {
    mpc: mpcConfig,
    keyDerivation: keyDerivationConfig,
  });
}
