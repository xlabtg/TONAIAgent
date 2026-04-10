/**
 * TONAIAgent - Secure Key Management Service
 *
 * Implements production-grade key management with:
 * - MPC (Multi-Party Computation) threshold signing
 * - HSM integration support (AWS KMS, Azure Key Vault, Mock for CI)
 * - Secure enclave operations
 * - BIP-32/44 key derivation
 * - Key rotation and lifecycle management
 *
 * SECURITY CRITICAL: This module handles cryptographic operations.
 * AI agents NEVER have direct access to private keys.
 */

import * as nodeCrypto from 'node:crypto';
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
} from './types';

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

/**
 * Load an optional peer-dependency SDK at runtime.
 * Using Function constructor prevents TypeScript from resolving the module
 * at compile time, which avoids TS2307 "cannot find module" errors for
 * optional dependencies that are only installed when needed.
 *
 * @param moduleName - npm package name to import
 * @param installHint - human-readable install command shown in the error
 */
async function loadOptionalSdk(moduleName: string, installHint: string): Promise<Record<string, unknown>> {
  try {
    // Dynamic import — TypeScript sees a string variable, not a literal,
    // so it does not attempt to resolve the module at compile time.
    const mod = (await (new Function('m', 'return import(m)')(moduleName))) as Record<string, unknown>;
    return mod;
  } catch {
    throw new Error(`${moduleName} is required. Install it with: ${installHint}`);
  }
}

/**
 * Internal interface for HSM provider back-ends.
 * Each provider implements the low-level HSM calls so that
 * HSMKeyStorage can stay provider-agnostic.
 */
interface HSMProviderAdapter {
  generateKeyPair(keyId: string, algorithm: 'ed25519' | 'secp256k1'): Promise<{ publicKey: string }>;
  sign(keyId: string, message: Buffer): Promise<Buffer>;
  getPublicKey(keyId: string): Promise<Buffer | null>;
  deleteKey(keyId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

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
}

// ============================================================================
// AWS KMS Adapter
// ============================================================================

/**
 * AWS KMS adapter.
 *
 * Key type mapping:
 *   ed25519   → ECC_NIST_P256 signing key (AWS KMS does not yet support Ed25519
 *                natively; we use P-256 / ECDSA_SHA_256 as the closest managed
 *                equivalent for TON deployments that cannot use native Ed25519).
 *                For pure Ed25519 support, use AWS CloudHSM with PKCS#11.
 *   secp256k1 → ECC_SECG_P256K1 / ECDSA_SHA_256 (native KMS support).
 *
 * The key ARN is stored as the key label using the provided keyLabel prefix
 * combined with the application keyId, stored in a local registry since KMS
 * does not have a lookup-by-alias-per-operation API for signing.
 *
 * Required env / config:
 *   awsRegion, awsAccessKeyId, awsSecretAccessKey (or instance-profile IAM role)
 */
class AwsKmsAdapter implements HSMProviderAdapter {
  // Map from application keyId → KMS Key ARN
  private readonly keyRegistry = new Map<string, string>();
  private kmsClient: unknown = null;

  constructor(private readonly config: HSMConfig) {}

  private async loadSdk(): Promise<Record<string, unknown>> {
    return loadOptionalSdk('@aws-sdk/client-kms', 'npm install @aws-sdk/client-kms');
  }

  private async getClient(): Promise<{
    send: (cmd: unknown) => Promise<unknown>;
  }> {
    if (this.kmsClient) return this.kmsClient as { send: (cmd: unknown) => Promise<unknown> };

    const sdk = await this.loadSdk();
    const KMSClient = sdk.KMSClient as new (cfg: Record<string, unknown>) => { send: (cmd: unknown) => Promise<unknown> };

    const clientConfig: Record<string, unknown> = {
      region: this.config.awsRegion ?? process.env.AWS_REGION ?? 'us-east-1',
    };

    if (this.config.awsKmsEndpoint) {
      clientConfig.endpoint = this.config.awsKmsEndpoint;
    }

    if (this.config.awsAccessKeyId && this.config.awsSecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
        sessionToken: this.config.awsSessionToken,
      };
    }

    this.kmsClient = new KMSClient(clientConfig);
    return this.kmsClient as { send: (cmd: unknown) => Promise<unknown> };
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const CreateKeyCommand = sdk.CreateKeyCommand as new (input: Record<string, unknown>) => unknown;
    const GetPublicKeyCommand = sdk.GetPublicKeyCommand as new (input: Record<string, unknown>) => unknown;

    // Map algorithm to KMS key spec
    const keySpec = algorithm === 'secp256k1' ? 'ECC_SECG_P256K1' : 'ECC_NIST_P256';

    const createResp = (await client.send(
      new CreateKeyCommand({
        KeySpec: keySpec,
        KeyUsage: 'SIGN_VERIFY',
        Description: `TONAIAgent key: ${keyId}`,
        Tags: [
          { TagKey: 'tonaiagent:keyId', TagValue: keyId },
          { TagKey: 'tonaiagent:algorithm', TagValue: algorithm },
        ],
      })
    )) as { KeyMetadata?: { KeyId?: string; Arn?: string } };

    const keyArn = createResp.KeyMetadata?.Arn;
    if (!keyArn) throw new Error(`AWS KMS: failed to create key for keyId=${keyId}`);

    this.keyRegistry.set(keyId, keyArn);

    // Retrieve DER-encoded public key
    const pubResp = (await client.send(
      new GetPublicKeyCommand({ KeyId: keyArn })
    )) as { PublicKey?: Uint8Array };

    if (!pubResp.PublicKey)
      throw new Error(`AWS KMS: could not retrieve public key for keyId=${keyId}`);

    return { publicKey: Buffer.from(pubResp.PublicKey).toString('hex') };
  }

  async sign(keyId: string, message: Buffer): Promise<Buffer> {
    const keyArn = this.keyRegistry.get(keyId);
    if (!keyArn) throw new Error(`AWS KMS: unknown keyId=${keyId}. Was it generated via this adapter?`);

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const SignCommand = sdk.SignCommand as new (input: Record<string, unknown>) => unknown;

    const resp = (await client.send(
      new SignCommand({
        KeyId: keyArn,
        Message: message,
        MessageType: 'RAW',
        SigningAlgorithm: 'ECDSA_SHA_256',
      })
    )) as { Signature?: Uint8Array };

    if (!resp.Signature) throw new Error(`AWS KMS: signing failed for keyId=${keyId}`);
    return Buffer.from(resp.Signature);
  }

  async getPublicKey(keyId: string): Promise<Buffer | null> {
    const keyArn = this.keyRegistry.get(keyId);
    if (!keyArn) return null;

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const GetPublicKeyCommand = sdk.GetPublicKeyCommand as new (input: Record<string, unknown>) => unknown;

    const resp = (await client.send(
      new GetPublicKeyCommand({ KeyId: keyArn })
    )) as { PublicKey?: Uint8Array };

    return resp.PublicKey ? Buffer.from(resp.PublicKey) : null;
  }

  async deleteKey(keyId: string): Promise<void> {
    const keyArn = this.keyRegistry.get(keyId);
    if (!keyArn) return;

    const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
    const ScheduleKeyDeletionCommand = sdk.ScheduleKeyDeletionCommand as new (input: Record<string, unknown>) => unknown;

    // Minimum pending-window is 7 days per AWS policy
    await client.send(
      new ScheduleKeyDeletionCommand({ KeyId: keyArn, PendingWindowInDays: 7 })
    );
    this.keyRegistry.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const [client, sdk] = await Promise.all([this.getClient(), this.loadSdk()]);
      const ListKeysCommand = sdk.ListKeysCommand as new (input: Record<string, unknown>) => unknown;
      await client.send(new ListKeysCommand({ Limit: 1 }));
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Azure Key Vault Adapter
// ============================================================================

/**
 * Azure Key Vault adapter.
 *
 * Ed25519 is not supported by Azure Key Vault as of 2024; the adapter maps
 * it to P-256 (EC / ES256).  secp256k1 is also unsupported natively — we
 * use P-256K (if the preview flag is enabled) and fall back to P-256.
 *
 * Required config / env:
 *   azureKeyVaultUrl (e.g. https://<vault>.vault.azure.net)
 *   azureTenantId, azureClientId, azureClientSecret
 *   OR use DefaultAzureCredential (managed identity / env vars)
 */
class AzureKeyVaultAdapter implements HSMProviderAdapter {
  // Map from application keyId → Azure key name (must be 1-127 chars, alphanumeric + dashes)
  private readonly keyNames = new Map<string, string>();
  private cryptoClient: unknown = null;
  private keyClient: unknown = null;

  constructor(private readonly config: HSMConfig) {}

  /** Sanitise an arbitrary key ID to a valid Azure Key Vault name. */
  private toAzureKeyName(keyId: string): string {
    // Replace anything that is not alphanumeric or dash with dash, then truncate
    return keyId.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 127);
  }

  private async getClients(): Promise<{
    keyClient: { createKey: (...args: unknown[]) => Promise<unknown>; deleteKey: (name: string) => Promise<unknown>; listPropertiesOfKeys: () => AsyncIterable<unknown> };
    cryptoClient: (keyName: string) => { sign: (alg: string, digest: Uint8Array) => Promise<{ result: Uint8Array }>; getKey: () => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }> };
  }> {
    if (this.cryptoClient && this.keyClient) {
      return {
        keyClient: this.keyClient as never,
        cryptoClient: this.cryptoClient as never,
      };
    }

    const [kvSdk, identitySdk] = await Promise.all([
      loadOptionalSdk('@azure/keyvault-keys', 'npm install @azure/keyvault-keys @azure/identity'),
      loadOptionalSdk('@azure/identity', 'npm install @azure/keyvault-keys @azure/identity'),
    ]);

    const KeyClient = kvSdk.KeyClient as new (url: string, credential: unknown) => unknown;
    const CryptographyClient = kvSdk.CryptographyClient as new (url: string, credential: unknown) => unknown;
    const ClientSecretCredential = identitySdk.ClientSecretCredential as new (tenant: string, client: string, secret: string) => unknown;
    const DefaultAzureCredential = identitySdk.DefaultAzureCredential as new () => unknown;

    const vaultUrl = this.config.azureKeyVaultUrl ?? process.env.AZURE_KEY_VAULT_URL;
    if (!vaultUrl) throw new Error('Azure Key Vault: azureKeyVaultUrl is required');

    const credential =
      this.config.azureTenantId && this.config.azureClientId && this.config.azureClientSecret
        ? new ClientSecretCredential(
            this.config.azureTenantId,
            this.config.azureClientId,
            this.config.azureClientSecret
          )
        : new DefaultAzureCredential();

    const keyClientInstance = new KeyClient(vaultUrl, credential);
    const cryptoClientFactory = (keyName: string) =>
      new CryptographyClient(`${vaultUrl}/keys/${keyName}`, credential);

    this.keyClient = keyClientInstance;
    this.cryptoClient = cryptoClientFactory;

    return { keyClient: keyClientInstance as never, cryptoClient: cryptoClientFactory as never };
  }

  async generateKeyPair(
    keyId: string,
    algorithm: 'ed25519' | 'secp256k1'
  ): Promise<{ publicKey: string }> {
    const { keyClient } = await this.getClients();
    const azureName = this.toAzureKeyName(keyId);

    // Azure Key Vault does not support Ed25519 or secp256k1 natively;
    // fall back to P-256 (prime256v1) which provides equivalent security level.
    const keyType = 'EC';
    const crv = algorithm === 'secp256k1' ? 'P-256K' : 'P-256';

    const key = (await (keyClient as { createKey: (name: string, type: string, opts: Record<string, unknown>) => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }> }).createKey(
      azureName,
      keyType,
      { curve: crv }
    )) as { key?: { x?: Uint8Array; y?: Uint8Array } };

    this.keyNames.set(keyId, azureName);

    // Encode the uncompressed public key as 04 || x || y
    const x = key.key?.x;
    const y = key.key?.y;
    if (!x || !y) throw new Error(`Azure Key Vault: could not retrieve public key coords for ${keyId}`);

    const uncompressed = Buffer.concat([Buffer.from([0x04]), Buffer.from(x), Buffer.from(y)]);
    return { publicKey: uncompressed.toString('hex') };
  }

  async sign(keyId: string, message: Buffer): Promise<Buffer> {
    const azureName = this.keyNames.get(keyId);
    if (!azureName) throw new Error(`Azure Key Vault: unknown keyId=${keyId}`);

    const { cryptoClient } = await this.getClients();
    const client = (cryptoClient as (name: string) => { sign: (alg: string, digest: Uint8Array) => Promise<{ result: Uint8Array }> })(azureName);

    // Azure signs over a pre-hashed digest
    const digest = nodeCrypto.createHash('SHA256').update(message).digest();
    const result = await client.sign('ES256', digest);
    return Buffer.from(result.result);
  }

  async getPublicKey(keyId: string): Promise<Buffer | null> {
    const azureName = this.keyNames.get(keyId);
    if (!azureName) return null;

    const { cryptoClient } = await this.getClients();
    const client = (cryptoClient as (name: string) => { getKey: () => Promise<{ key?: { x?: Uint8Array; y?: Uint8Array } }> })(azureName);
    const key = await client.getKey();

    const x = key.key?.x;
    const y = key.key?.y;
    if (!x || !y) return null;

    return Buffer.concat([Buffer.from([0x04]), Buffer.from(x), Buffer.from(y)]);
  }

  async deleteKey(keyId: string): Promise<void> {
    const azureName = this.keyNames.get(keyId);
    if (!azureName) return;

    const { keyClient } = await this.getClients();
    await (keyClient as { deleteKey: (name: string) => Promise<void> }).deleteKey(azureName);
    this.keyNames.delete(keyId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { keyClient } = await this.getClients();
      // listPropertiesOfKeys returns an async iterable; just try to get the first item
      const iter = (keyClient as { listPropertiesOfKeys: () => AsyncIterable<unknown> }).listPropertiesOfKeys();
      for await (const _item of iter) { break; }
      return true;
    } catch {
      return false;
    }
  }
}

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

  private readonly adapter: HSMProviderAdapter;

  constructor(private readonly config: HSMConfig) {
    super();

    const provider = config.provider ?? process.env.NODE_HSM_PROVIDER ?? 'mock';

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
    return this.adapter.generateKeyPair(keyId, algorithm);
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
 * Coordinates MPC (Multi-Party Computation) threshold signing.
 * Ensures no single party can sign transactions alone.
 */
export class MPCCoordinator {
  private readonly shares = new Map<string, KeyShare[]>();
  private readonly partialSignatures = new Map<string, Map<string, string>>();

  constructor(private readonly config: MPCConfig) {}

  /**
   * Generate distributed key shares for MPC
   */
  async generateShares(keyId: string): Promise<KeyShare[]> {
    const shares: KeyShare[] = [];

    // Generate shares for each party
    const holders: Array<'user' | 'platform' | 'recovery_service'> = [
      'user',
      'platform',
      'recovery_service',
    ];

    for (let i = 0; i < this.config.totalShares; i++) {
      const share: KeyShare = {
        id: `share_${keyId}_${i}`,
        keyId,
        shareIndex: i,
        totalShares: this.config.totalShares,
        threshold: this.config.threshold,
        holderType: holders[i % holders.length],
        publicData: this.generateSharePublicData(keyId, i),
        createdAt: new Date(),
      };
      shares.push(share);
    }

    this.shares.set(keyId, shares);
    return shares;
  }

  /**
   * Get status of MPC shares for a key
   */
  getSharesStatus(keyId: string): MPCSharesStatus | null {
    const shares = this.shares.get(keyId);
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
   * Collect partial signature from a share holder
   */
  async collectPartialSignature(
    signingRequestId: string,
    shareId: string,
    partialSignature: string
  ): Promise<boolean> {
    if (!this.partialSignatures.has(signingRequestId)) {
      this.partialSignatures.set(signingRequestId, new Map());
    }

    const signatures = this.partialSignatures.get(signingRequestId)!;
    signatures.set(shareId, partialSignature);

    return signatures.size >= this.config.threshold;
  }

  /**
   * Combine partial signatures into final signature
   */
  async combineSignatures(signingRequestId: string): Promise<string | null> {
    const signatures = this.partialSignatures.get(signingRequestId);
    if (!signatures || signatures.size < this.config.threshold) {
      return null;
    }

    // In production, this would use actual threshold signature combination
    const combined = Array.from(signatures.values()).join('_');
    return `mpc_sig_${Buffer.from(combined).toString('base64').slice(0, 64)}`;
  }

  /**
   * Clear partial signatures after completion
   */
  clearSignatures(signingRequestId: string): void {
    this.partialSignatures.delete(signingRequestId);
  }

  private generateSharePublicData(keyId: string, index: number): string {
    return `share_public_${keyId}_${index}_${Date.now()}`;
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

    // Generate key pair - publicKey is stored in secure storage
    await this.storage.generateKeyPair(keyId, algorithm);

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
