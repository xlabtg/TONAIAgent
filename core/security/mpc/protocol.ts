/**
 * MPC Protocol v2 — Message Schemas
 *
 * Defines typed message schemas exchanged between coordinator and signers
 * during the FROST-like threshold EdDSA protocol. The coordinator orchestrates
 * rounds but never holds raw share values or secret nonces.
 *
 * Round 1: Commitment  — signers broadcast (D_i, E_i) nonce commitments
 * Round 2: Signing     — signers produce partial signatures z_i
 * Aggregation          — coordinator sums partial signatures into (R, S)
 *
 * References:
 *   FROST paper: https://eprint.iacr.org/2020/852.pdf
 *   FROST IETF:  https://datatracker.ietf.org/doc/draft-irtf-cfrg-frost/
 */

// ---------------------------------------------------------------------------
// Participant identity
// ---------------------------------------------------------------------------

export interface ParticipantId {
  /** 1-based Shamir x-coordinate / share index. */
  index: number;
  /** Role label (informational only). */
  role: 'user' | 'platform' | 'recovery_service';
}

// ---------------------------------------------------------------------------
// Round 1: Nonce commitment
// ---------------------------------------------------------------------------

/**
 * Each signer pre-computes two nonce scalars (d_i, e_i) and broadcasts their
 * curve points as commitments before any message is known. This prevents the
 * coordinator from choosing nonces adversarially.
 *
 * Commitment: (D_i, E_i) = (d_i·G, e_i·G)
 */
export interface NonceCommitment {
  /** Signer's Shamir index. */
  participantIndex: number;
  /** d_i·G — hiding nonce commitment (hex-encoded compressed Ed25519 point, 32 bytes). */
  D: string;
  /** e_i·G — binding nonce commitment (hex-encoded compressed Ed25519 point, 32 bytes). */
  E: string;
}

/**
 * Message sent by a signer in Round 1.
 */
export interface Round1Message {
  type: 'round1_commitment';
  sessionId: string;
  commitment: NonceCommitment;
}

// ---------------------------------------------------------------------------
// Round 2: Partial signature
// ---------------------------------------------------------------------------

/**
 * Message sent by a signer in Round 2 after seeing the full commitment list B
 * and the message m.
 *
 * The partial signature scalar is:
 *   z_i = d_i + (e_i · ρ_i) + λ_i · y_i · c
 *
 * where:
 *   ρ_i = H(i, m, B)           — binding factor (ties nonce to message + participants)
 *   c   = H(R_agg, A, m) mod ℓ — Ed25519 challenge
 *   λ_i = Lagrange coefficient for party i
 *   y_i = Shamir share value for party i
 */
export interface PartialSignature {
  /** Signer's Shamir index. */
  participantIndex: number;
  /**
   * Partial scalar z_i encoded as 32-byte little-endian hex.
   * Note: the coordinator must NOT be able to reconstruct y_i from z_i.
   */
  z: string;
}

/**
 * Message sent by a signer in Round 2.
 */
export interface Round2Message {
  type: 'round2_partial_sig';
  sessionId: string;
  partial: PartialSignature;
}

// ---------------------------------------------------------------------------
// Session state (coordinator-side, public info only)
// ---------------------------------------------------------------------------

/**
 * Public session descriptor broadcast by the coordinator after Round 1.
 * Contains the commitment list B and the message — never share values or nonces.
 */
export interface SigningSessionDescriptor {
  sessionId: string;
  keyId: string;
  /** Message to sign (hex). */
  messageHex: string;
  /** Aggregate public key (hex, 32 bytes Ed25519 point). */
  aggregatePublicKeyHex: string;
  /** Ordered list of all nonce commitments — the binding list B. */
  commitments: NonceCommitment[];
  /** Indices of parties participating in this session. */
  participantIndices: number[];
  /** Session threshold. */
  threshold: number;
  /** Session creation timestamp (ms). */
  createdAt: number;
  /** Unique anti-replay nonce (hex, 16 bytes). */
  sessionNonce: string;
}

// ---------------------------------------------------------------------------
// Final aggregate signature
// ---------------------------------------------------------------------------

/**
 * The coordinator's output after aggregating all partial signatures.
 */
export interface AggregateSignature {
  sessionId: string;
  /** Hex-encoded 64-byte Ed25519 signature: R_bytes (32) || S_bytes (32). */
  signatureHex: string;
  /** Aggregate R point (32 bytes, hex). */
  aggregateRHex: string;
  /** Aggregate S scalar (32 bytes LE, hex). */
  aggregateSHex: string;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type MPCProtocolError =
  | 'SESSION_NOT_FOUND'
  | 'DUPLICATE_COMMITMENT'
  | 'DUPLICATE_PARTIAL_SIG'
  | 'NOT_A_PARTICIPANT'
  | 'THRESHOLD_NOT_MET'
  | 'INVALID_PARTIAL_SIG'
  | 'INVALID_COMMITMENT'
  | 'SESSION_ALREADY_OPEN'
  | 'SHARES_NOT_FOUND'
  | 'COORDINATOR_SHARE_LEAK';
