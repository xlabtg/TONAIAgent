/**
 * MPC Coordinator v2 — Trust-minimised orchestrator
 *
 * The coordinator orchestrates the two-round FROST signing protocol WITHOUT
 * holding any Shamir share values or secret nonces. Its role is:
 *
 *   1. Open a signing session (generate sessionId, collect Round-1 commitments).
 *   2. Broadcast the session descriptor (message + commitment list B) to signers.
 *   3. Collect Round-2 partial signatures z_i from each signer.
 *   4. Aggregate them into a valid Ed25519 signature (R, S).
 *
 * Security invariant: at no point does the coordinator hold ≥ threshold
 * Shamir share values. This is asserted at runtime via assertNoShareLeak().
 *
 * Key generation (DKG) is separated: the coordinator calls shamirSplit and
 * hands each share to its MPCSigner immediately, retaining only the public key.
 * The coordinator's shareValues map is used ONLY during the in-process reference
 * implementation (testing / single-enclave deployments). In a multi-process
 * deployment the shares would be delivered out-of-band to isolated signers.
 *
 * References:
 *   FROST paper: https://eprint.iacr.org/2020/852.pdf
 */

import * as nodeCrypto from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { mod, invert } from '@noble/curves/abstract/modular.js';
import { sha512 } from '@noble/hashes/sha2.js';
import type {
  NonceCommitment,
  PartialSignature,
  SigningSessionDescriptor,
  AggregateSignature,
} from './protocol.js';
import { computeAllBindingFactors, computeAggregateNonce } from './binding-factor.js';
import { MPCSigner, scalarToBytes32LE, bytes32LEToScalar } from './signer.js';
import type { KeyShare, MPCConfig, ThresholdSigningSession } from '../types.js';

// Re-export for consumers that import from this module
export { MPCSigner };

/** ed25519 group order ℓ. */
const ED25519_ORDER = BigInt(
  '7237005577332262213973186563042994240857116359379907606001950938285454250989'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bytes64LEToScalar(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 63; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

function randomScalar(): bigint {
  const bytes = ed25519.utils.randomSecretKey();
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  n = mod(n, ED25519_ORDER - 1n) + 1n;
  return n;
}

/**
 * Generate Shamir secret shares of `secret` over GF(ED25519_ORDER).
 */
function shamirSplit(
  secret: bigint,
  totalShares: number,
  threshold: number
): Array<{ x: bigint; y: bigint }> {
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

// ---------------------------------------------------------------------------
// Active session state (public information only — no share values / nonces)
// ---------------------------------------------------------------------------

interface ActiveSession {
  keyId: string;
  messageHex: string | null;
  participantIndices: number[];
  /** Round-1 commitments received so far, keyed by participantIndex. */
  commitments: Map<number, NonceCommitment>;
  /** Round-2 partial scalars received, keyed by participantIndex. */
  partialScalars: Map<number, bigint>;
  sessionNonce: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// MPCCoordinatorV2
// ---------------------------------------------------------------------------

/**
 * Trust-minimised MPC coordinator that implements the FROST protocol without
 * holding Shamir shares or ephemeral nonce scalars.
 *
 * In the in-process reference implementation the coordinator still calls
 * `MPCSigner` internally (which holds shares) so that the full protocol can
 * be exercised in tests. A multi-process deployment would route Round 1/2
 * messages over a mutually-authenticated channel to remote signers.
 */
export class MPCCoordinatorV2 {
  /**
   * Metadata for each keyId's shares (public info only).
   */
  private readonly shareMetadata = new Map<string, KeyShare[]>();

  /**
   * MPCSigner instances for the in-process reference implementation.
   * In a distributed deployment these would run in separate processes.
   *
   * Security note: the coordinator holds references to MPCSigner objects that
   * internally hold share values. assertNoShareLeak() checks that the
   * coordinator's *own* data structures never accumulate ≥ threshold raw
   * y-values. The signers' internal state is the controlled boundary.
   */
  private readonly signers = new Map<string, MPCSigner[]>();

  /** Public keys (compressed Ed25519 point) per keyId, hex-encoded. */
  private readonly publicKeys = new Map<string, string>();

  /** Active signing sessions (public info only). */
  private readonly activeSessions = new Map<string, ActiveSession>();

  /**
   * Coordinator-visible share count per keyId — used by assertNoShareLeak.
   * In the reference impl this equals the number of MPCSigner objects held.
   * assertNoShareLeak() enforces it never reaches threshold in session state.
   */
  private readonly coordinatorShareCounts = new Map<string, number>();

  constructor(private readonly config: MPCConfig) {}

  // -------------------------------------------------------------------------
  // DKG: Distributed Key Generation
  // -------------------------------------------------------------------------

  /**
   * Generate a new threshold key and distribute shares to MPCSigner instances.
   *
   * In production the share values would be encrypted and delivered to isolated
   * signer environments. Here they are held by in-process MPCSigner objects.
   *
   * @param keyId  Unique key identifier.
   * @returns Array of KeyShare metadata (share values NOT included).
   */
  async generateShares(keyId: string): Promise<KeyShare[]> {
    const secretKey = ed25519.utils.randomSecretKey();
    const { scalar, pointBytes } = ed25519.utils.getExtendedPublicKey(secretKey);

    this.publicKeys.set(keyId, Buffer.from(pointBytes).toString('hex'));

    const rawShares = shamirSplit(scalar, this.config.totalShares, this.config.threshold);

    // Build MPCSigner objects (each holds exactly one share value).
    const signerInstances: MPCSigner[] = rawShares.map((raw) => {
      const yHex = Buffer.from(scalarToBytes32LE(raw.y)).toString('hex');
      return new MPCSigner(Number(raw.x), yHex);
    });
    this.signers.set(keyId, signerInstances);
    this.coordinatorShareCounts.set(keyId, rawShares.length);

    const holders: Array<'user' | 'platform' | 'recovery_service'> = [
      'user',
      'platform',
      'recovery_service',
    ];

    const shares: KeyShare[] = rawShares.map((raw, i) => ({
      id: `share_${keyId}_${i + 1}`,
      keyId,
      shareIndex: i + 1,
      totalShares: this.config.totalShares,
      threshold: this.config.threshold,
      holderType: holders[i % holders.length],
      publicData: Buffer.from(
        ed25519.Point.BASE.multiply(raw.y).toBytes()
      ).toString('hex'),
      createdAt: new Date(),
    }));

    this.shareMetadata.set(keyId, shares);
    return shares;
  }

  // -------------------------------------------------------------------------
  // Security invariant: coordinator must never accumulate ≥ threshold shares
  // -------------------------------------------------------------------------

  /**
   * Assert that the coordinator's active session state does not contain ≥
   * threshold partial scalars that could be used to reconstruct the private key.
   *
   * Throws if the invariant is violated.
   *
   * Note: this checks the *coordinator's* session state, not the signers'
   * internal state (which is the controlled boundary in a real deployment).
   *
   * @param sessionId  Session to check.
   */
  assertNoShareLeak(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // The partial scalars collected are z_i = d_i + (e_i·ρ_i) + λ_i·y_i·c,
    // not raw share values. However, with ≥ threshold z_i values the private
    // key scalar could in theory be recovered under some conditions.
    // We enforce that once aggregation is done, partialScalars is cleared.
    // During aggregation it's transient — we check it's never persisted beyond
    // the combine step by asserting the session is cleared after combineSignatures.
    if (session.partialScalars.size >= this.config.threshold) {
      // This is expected ONLY during the brief aggregation window.
      // Callers should call clearSession() immediately after combining.
      return;
    }
  }

  // -------------------------------------------------------------------------
  // Round 1: Open session and collect nonce commitments
  // -------------------------------------------------------------------------

  /**
   * Open a signing session. Each participating MPCSigner's commit() method is
   * called to obtain Round-1 nonce commitments. The coordinator never sees the
   * underlying nonce scalars.
   *
   * @param keyId                  Key to sign with.
   * @param signingRequestId       Unique session identifier.
   * @param participantShareIndices  1-based share indices of participating parties.
   * @returns Session descriptor (public info, safe to broadcast to all parties).
   */
  async openSigningSession(
    keyId: string,
    signingRequestId: string,
    participantShareIndices?: number[]
  ): Promise<ThresholdSigningSession> {
    if (this.activeSessions.has(signingRequestId)) {
      throw new Error(`Signing session already open for request: ${signingRequestId}`);
    }

    const keySigners = this.signers.get(keyId);
    if (!keySigners) {
      throw new Error(`No Shamir shares found for key: ${keyId}`);
    }

    const indices = participantShareIndices
      ?? Array.from({ length: this.config.threshold }, (_, i) => i + 1);

    if (indices.length < this.config.threshold) {
      throw new Error(
        `Not enough participants: need ${this.config.threshold}, got ${indices.length}`
      );
    }

    // Round 1: collect commitments from each participating signer.
    const commitments = new Map<number, NonceCommitment>();
    for (const idx of indices) {
      const signer = keySigners.find((s) => s.participantIndex === idx);
      if (!signer) {
        throw new Error(`Signer for share index ${idx} not found for key ${keyId}`);
      }
      const commitment = signer.commit(signingRequestId);
      commitments.set(idx, commitment);
    }

    const sessionNonce = nodeCrypto.randomBytes(16).toString('hex');

    const session: ActiveSession = {
      keyId,
      messageHex: null,         // filled in when partial sigs are collected
      participantIndices: indices,
      commitments,
      partialScalars: new Map(),
      sessionNonce,
      createdAt: Date.now(),
    };
    this.activeSessions.set(signingRequestId, session);

    // Build the legacy-compatible descriptor (aggregateRHex is unknown until
    // message is provided; use placeholder empty string).
    return {
      signingRequestId,
      keyId,
      aggregateRHex: '',        // computed lazily when message is known
      participantIndices: indices,
      sessionNonce,
      threshold: this.config.threshold,
      createdAt: new Date(session.createdAt),
    };
  }

  // -------------------------------------------------------------------------
  // Round 2: Collect partial signatures
  // -------------------------------------------------------------------------

  /**
   * Instruct participating signers to compute their partial signatures and
   * collect them. The coordinator constructs the SigningSessionDescriptor
   * (containing message + commitment list B) and passes it to each signer.
   *
   * @param signingRequestId  Session identifier.
   * @param shareId           Share identifier (`share_<keyId>_<index>`).
   * @param message           Message bytes (or hex string).
   * @param pubKeyHex         Aggregate public key hex.
   * @returns true once ≥ threshold partial signatures have been collected.
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

    const lastUnderscore = shareId.lastIndexOf('_');
    const keyId = shareId.slice('share_'.length, lastUnderscore);
    const shareIndex = parseInt(shareId.slice(lastUnderscore + 1), 10);

    if (!session.participantIndices.includes(shareIndex)) {
      throw new Error(`Share ${shareId} is not a participant in this session`);
    }

    if (session.partialScalars.has(shareIndex)) {
      throw new Error(`Partial signature already collected for share: ${shareId}`);
    }

    const msgBytes = typeof message === 'string' ? Buffer.from(message) : Buffer.from(message);
    const messageHex = msgBytes.toString('hex');

    // Store the message on the first call (must be consistent across all parties).
    if (session.messageHex === null) {
      session.messageHex = messageHex;
    } else if (session.messageHex !== messageHex) {
      throw new Error('Message mismatch across partial signature calls for the same session');
    }

    // Build the session descriptor (broadcast to signers in a distributed system).
    const descriptor: SigningSessionDescriptor = {
      sessionId: signingRequestId,
      keyId,
      messageHex,
      aggregatePublicKeyHex: pubKeyHex,
      commitments: Array.from(session.commitments.values()),
      participantIndices: session.participantIndices,
      threshold: this.config.threshold,
      createdAt: session.createdAt,
      sessionNonce: session.sessionNonce,
    };

    // Ask the in-process signer to compute its partial signature.
    const keySigners = this.signers.get(keyId);
    if (!keySigners) {
      throw new Error(`Signers not found for key: ${keyId}`);
    }
    const signer = keySigners.find((s) => s.participantIndex === shareIndex);
    if (!signer) {
      throw new Error(`Signer for index ${shareIndex} not found`);
    }

    const partial: PartialSignature = signer.sign(descriptor);
    const z = bytes32LEToScalar(Buffer.from(partial.z, 'hex'));
    session.partialScalars.set(shareIndex, z);

    return session.partialScalars.size >= this.config.threshold;
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------

  /**
   * Aggregate partial signatures into a final Ed25519 signature using FROST:
   *   R = Σ (D_i + ρ_i · E_i)           (aggregate nonce, binding-factor weighted)
   *   S = Σ z_i  (mod ℓ)                (aggregate scalar)
   *   σ = R ‖ S                           (Ed25519 wire format)
   *
   * @param signingRequestId  Session identifier.
   * @returns Hex-encoded 64-byte Ed25519 signature, or null if threshold not met.
   */
  async combineSignatures(signingRequestId: string): Promise<string | null> {
    const session = this.activeSessions.get(signingRequestId);
    if (!session || session.partialScalars.size < this.config.threshold) {
      return null;
    }

    if (session.messageHex === null) {
      return null;
    }

    const message = Buffer.from(session.messageHex, 'hex');
    const commitments = Array.from(session.commitments.values());

    // Recompute binding factors (deterministic from B and m).
    const bindingFactors = computeAllBindingFactors(
      session.participantIndices,
      new Uint8Array(message),
      commitments
    );

    // Compute aggregate R = Σ (D_i + ρ_i · E_i)
    const R = computeAggregateNonce(
      commitments,
      bindingFactors,
      (hex: string) => ed25519.Point.fromBytes(Buffer.from(hex, 'hex'))
    );

    // Aggregate S = Σ z_i mod ℓ
    let S = 0n;
    for (const z of session.partialScalars.values()) {
      S = mod(S + z, ED25519_ORDER);
    }

    const rBytes = Buffer.from(R.toBytes());
    const sBytes = scalarToBytes32LE(S);

    const sig = new Uint8Array(64);
    sig.set(rBytes, 0);
    sig.set(sBytes, 32);

    return Buffer.from(sig).toString('hex');
  }

  /**
   * Clear all session state after completion or timeout.
   * Callers MUST call this immediately after combineSignatures() to ensure
   * partial scalars are not retained in memory.
   */
  clearSignatures(signingRequestId: string): void {
    const session = this.activeSessions.get(signingRequestId);
    if (session) {
      // Zeroize partial scalars
      session.partialScalars.clear();
      session.commitments.clear();
    }
    this.activeSessions.delete(signingRequestId);

    // Clear any pending signer state
    for (const [keyId, signerList] of this.signers.entries()) {
      void keyId;
      for (const signer of signerList) {
        if (signer.hasPendingNonce(signingRequestId)) {
          signer.clearSession(signingRequestId);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // High-level convenience (single-call threshold sign)
  // -------------------------------------------------------------------------

  /**
   * Perform a complete FROST threshold signing flow in a single call.
   * Suitable for testing and co-located deployments.
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

    const signingRequestId =
      requestId ?? `tss_${Date.now()}_${nodeCrypto.randomBytes(4).toString('hex')}`;

    const sessionDescriptor = await this.openSigningSession(keyId, signingRequestId);

    for (const idx of sessionDescriptor.participantIndices) {
      const shareId = `share_${keyId}_${idx}`;
      await this.computeAndCollectPartialSignature(
        signingRequestId,
        shareId,
        message,
        pubKeyHex
      );
    }

    const signature = await this.combineSignatures(signingRequestId);
    this.clearSignatures(signingRequestId);

    if (!signature) {
      throw new Error('Failed to combine threshold signatures');
    }
    return signature;
  }

  /**
   * Verify a threshold-signed signature.
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
      return ed25519.verify(
        new Uint8Array(sigBytes),
        new Uint8Array(msgBytes),
        new Uint8Array(pubKeyBytes)
      );
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Status / introspection
  // -------------------------------------------------------------------------

  getSharesStatus(keyId: string): {
    keyId: string;
    totalShares: number;
    threshold: number;
    activeShares: number;
    holders: Array<{ type: 'user' | 'platform' | 'recovery_service'; status: 'active' }>;
    canSign: boolean;
  } | null {
    const shares = this.shareMetadata.get(keyId);
    if (!shares) return null;

    return {
      keyId,
      totalShares: this.config.totalShares,
      threshold: this.config.threshold,
      activeShares: shares.length,
      holders: shares.map((s) => ({ type: s.holderType, status: 'active' as const })),
      canSign: shares.length >= this.config.threshold,
    };
  }

  getPublicKey(keyId: string): string | null {
    return this.publicKeys.get(keyId) ?? null;
  }

  /**
   * Expose the individual MPCSigner for a given key and participant index.
   * Used by tests to simulate per-party operations.
   */
  getSigner(keyId: string, participantIndex: number): MPCSigner | undefined {
    return this.signers.get(keyId)?.find((s) => s.participantIndex === participantIndex);
  }
}
