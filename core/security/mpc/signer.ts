/**
 * MPC Signer v2
 *
 * Each MPCSigner holds exactly ONE Shamir share and produces partial signatures
 * without ever exposing the share value to the coordinator. The coordinator
 * orchestrates rounds (collects commitments, broadcasts session descriptor,
 * collects partial sigs) but never holds raw share values or secret nonces.
 *
 * Signing flow per party i:
 *   Round 1: sample (d_i, e_i) ← random scalars
 *            compute commitments (D_i, E_i) = (d_i·G, e_i·G)
 *            send commitments to coordinator
 *
 *   Round 2: receive session descriptor (message m, commitment list B)
 *            compute binding factor ρ_i = H(i, m, B)
 *            compute aggregate R = Σ (D_j + ρ_j·E_j)
 *            compute challenge  c = H(R, A, m) mod ℓ
 *            compute Lagrange   λ_i
 *            compute partial    z_i = d_i + (e_i·ρ_i) + λ_i·y_i·c  (mod ℓ)
 *            send z_i to coordinator  (nonces d_i, e_i zeroized after use)
 *
 * Security property: the coordinator never holds ≥ threshold share values.
 *
 * References:
 *   FROST paper §4: https://eprint.iacr.org/2020/852.pdf
 */

import * as nodeCrypto from 'node:crypto';
import { ed25519 } from '@noble/curves/ed25519.js';
import { mod, invert } from '@noble/curves/abstract/modular.js';
import { sha512 } from '@noble/hashes/sha2.js';
import type { NonceCommitment, PartialSignature, SigningSessionDescriptor } from './protocol.js';
import { computeBindingFactor, computeAggregateNonce } from './binding-factor.js';

/** ed25519 group order ℓ. */
const ED25519_ORDER = BigInt(
  '7237005577332262213973186563042994240857116359379907606001950938285454250989'
);

// ---------------------------------------------------------------------------
// Scalar helpers (duplicated from key-management to keep modules independent)
// ---------------------------------------------------------------------------

function scalarToBytes32LE(n: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  let tmp = mod(n, ED25519_ORDER);
  for (let i = 0; i < 32; i++) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  return buf;
}

function bytes32LEToScalar(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 31; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

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

/** Compute Lagrange basis coefficient λ_i for party x_i. */
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

/** Compute the Ed25519 challenge scalar h = SHA-512(R ‖ A ‖ m) mod ℓ. */
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
// Per-session nonce state (ephemeral, zeroized after signing)
// ---------------------------------------------------------------------------

interface EphemeralNonces {
  d: bigint;  // hiding nonce scalar
  e: bigint;  // binding nonce scalar
}

// ---------------------------------------------------------------------------
// MPCSigner
// ---------------------------------------------------------------------------

/**
 * Holds ONE Shamir share and implements the signer role of the FROST protocol.
 *
 * In production each signer runs in a separate isolated process or hardware
 * enclave; the share value never leaves the signer boundary.
 */
export class MPCSigner {
  /** Shamir x-coordinate (1-based share index). */
  readonly participantIndex: number;

  /** Shamir share value y_i (secret — never transmitted). */
  private readonly shareY: bigint;

  /** Pending nonces per sessionId, zeroized after Round 2. */
  private readonly pendingNonces = new Map<string, EphemeralNonces>();

  /** Track sessions this signer has already committed to (replay guard). */
  private readonly committedSessions = new Set<string>();

  constructor(participantIndex: number, shareYHex: string) {
    if (participantIndex < 1) {
      throw new Error('participantIndex must be ≥ 1');
    }
    this.participantIndex = participantIndex;
    this.shareY = bytes32LEToScalar(Buffer.from(shareYHex, 'hex'));
  }

  // -------------------------------------------------------------------------
  // Round 1: Nonce commitment
  // -------------------------------------------------------------------------

  /**
   * Generate a fresh nonce pair and return the public commitments.
   * Must be called once per signing session before the session descriptor
   * is available. The nonces are kept in memory until `sign` is called.
   *
   * @param sessionId  Unique session identifier from the coordinator.
   * @returns Commitment (D_i, E_i) to broadcast.
   */
  commit(sessionId: string): NonceCommitment {
    if (this.committedSessions.has(sessionId)) {
      throw new Error(`Already committed to session ${sessionId}`);
    }

    const d = randomScalar();
    const e = randomScalar();

    this.pendingNonces.set(sessionId, { d, e });
    this.committedSessions.add(sessionId);

    const G = ed25519.Point.BASE;
    const D = Buffer.from(G.multiply(d).toBytes()).toString('hex');
    const E = Buffer.from(G.multiply(e).toBytes()).toString('hex');

    return {
      participantIndex: this.participantIndex,
      D,
      E,
    };
  }

  // -------------------------------------------------------------------------
  // Round 2: Partial signature
  // -------------------------------------------------------------------------

  /**
   * Compute the partial signature scalar z_i using the FROST protocol.
   *
   *   z_i = d_i + (e_i · ρ_i) + λ_i · y_i · c  (mod ℓ)
   *
   * The ephemeral nonces d_i and e_i are zeroized after this call.
   *
   * @param descriptor  Session descriptor from the coordinator (includes B and m).
   * @returns Partial signature for this signer.
   */
  sign(descriptor: SigningSessionDescriptor): PartialSignature {
    const { sessionId } = descriptor;
    const nonces = this.pendingNonces.get(sessionId);
    if (!nonces) {
      throw new Error(`No pending nonces for session ${sessionId}. Call commit() first.`);
    }

    const message = Buffer.from(descriptor.messageHex, 'hex');
    const participantXs = descriptor.participantIndices.map(BigInt);

    // Compute binding factor ρ_i
    const rho = computeBindingFactor(
      this.participantIndex,
      new Uint8Array(message),
      descriptor.commitments
    );

    // Compute aggregate nonce R_agg = Σ (D_j + ρ_j · E_j)
    const G = ed25519.Point.BASE;
    const R = computeAggregateNonce(
      descriptor.commitments,
      (() => {
        const factors = new Map<number, bigint>();
        for (const idx of descriptor.participantIndices) {
          factors.set(idx, computeBindingFactor(idx, new Uint8Array(message), descriptor.commitments));
        }
        return factors;
      })(),
      (hex: string) => ed25519.Point.fromBytes(Buffer.from(hex, 'hex'))
    );

    const aggregateRHex = Buffer.from(R.toBytes()).toString('hex');
    const pubKeyBytes = Buffer.from(descriptor.aggregatePublicKeyHex, 'hex');
    const rBytes = Buffer.from(aggregateRHex, 'hex');

    // Compute challenge c = H(R, A, m) mod ℓ
    const c = computeChallenge(
      new Uint8Array(rBytes),
      new Uint8Array(pubKeyBytes),
      new Uint8Array(message)
    );

    // Compute Lagrange coefficient λ_i
    const xi = BigInt(this.participantIndex);
    const lambda = lagrangeCoefficient(xi, participantXs);

    // z_i = d_i + (e_i · ρ_i) + λ_i · y_i · c  (mod ℓ)
    const z = mod(
      nonces.d +
        mod(nonces.e * rho, ED25519_ORDER) +
        mod(lambda * mod(this.shareY * c, ED25519_ORDER), ED25519_ORDER),
      ED25519_ORDER
    );

    // Zeroize ephemeral nonces (best-effort in JS; GC will collect objects)
    this.pendingNonces.delete(sessionId);

    return {
      participantIndex: this.participantIndex,
      z: Buffer.from(scalarToBytes32LE(z)).toString('hex'),
    };
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  /** Return this signer's public share commitment y_i·G (hex). */
  getPublicCommitment(): string {
    const G = ed25519.Point.BASE;
    return Buffer.from(G.multiply(this.shareY).toBytes()).toString('hex');
  }

  /** True if this signer has committed to but not yet signed the given session. */
  hasPendingNonce(sessionId: string): boolean {
    return this.pendingNonces.has(sessionId);
  }

  /** Discard pending nonces for a session (e.g., on timeout). */
  clearSession(sessionId: string): void {
    this.pendingNonces.delete(sessionId);
    this.committedSessions.delete(sessionId);
  }

  // -------------------------------------------------------------------------
  // Share serialisation (encrypted output to secure storage)
  // -------------------------------------------------------------------------

  /**
   * Export this signer's share index and share value as hex.
   * The caller is responsible for encrypting the output before persisting.
   */
  exportShare(): { index: number; yHex: string } {
    return {
      index: this.participantIndex,
      yHex: Buffer.from(scalarToBytes32LE(this.shareY)).toString('hex'),
    };
  }
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create an MPCSigner from a raw Shamir share { x, y }.
 * The y value must already be stored as a 32-byte LE hex string.
 */
export function createSignerFromShare(
  participantIndex: number,
  shareYHex: string
): MPCSigner {
  return new MPCSigner(participantIndex, shareYHex);
}

/** Alias for bytes32LEToScalar for external use. */
export { scalarToBytes32LE, bytes32LEToScalar };
