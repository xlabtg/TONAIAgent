/**
 * FROST Binding Factor
 *
 * Implements the per-signer binding factor ρ_i that binds each signer's nonce
 * contribution to the specific message m and the full set of nonce commitments B.
 * This prevents Wagner's generalized birthday attack and rogue-nonce forgeries.
 *
 * Protocol (per FROST §4.2):
 *   B = [(i, D_i, E_i) for each participant i]  — ordered commitment list
 *   ρ_i = H("rho" ‖ i ‖ m ‖ B)  (mod ℓ)
 *
 * The binding factor is computed by EVERY party independently and deterministically,
 * ensuring the coordinator cannot bias any party's effective nonce.
 *
 * References:
 *   FROST paper §4.2: https://eprint.iacr.org/2020/852.pdf
 *   FROST IETF §4.4: https://datatracker.ietf.org/doc/draft-irtf-cfrg-frost/
 */

import { sha512 } from '@noble/hashes/sha2.js';
import { mod } from '@noble/curves/abstract/modular.js';
import type { NonceCommitment } from './protocol.js';

/** ed25519 group order ℓ. */
const ED25519_ORDER = BigInt(
  '7237005577332262213973186563042994240857116359379907606001950938285454250989'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a positive integer as a 4-byte big-endian buffer. */
function u32BE(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, n, false);
  return buf;
}

/** Decode a 64-byte little-endian hash output to a BigInt scalar. */
function bytes64LEToScalar(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 63; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
  return n;
}

// ---------------------------------------------------------------------------
// Binding-list serialisation
// ---------------------------------------------------------------------------

/**
 * Canonically serialise the commitment list B so that all parties compute the
 * same binding factors from the same input.
 *
 * Encoding:
 *   B_bytes = concat( u32BE(len(commitments)),
 *               for each c in sorted-by-index commitments:
 *                 u32BE(c.participantIndex) || hex2bytes(c.D) || hex2bytes(c.E) )
 */
export function serialiseCommitmentList(commitments: NonceCommitment[]): Uint8Array {
  const sorted = [...commitments].sort((a, b) => a.participantIndex - b.participantIndex);

  const parts: Uint8Array[] = [u32BE(sorted.length)];
  for (const c of sorted) {
    parts.push(u32BE(c.participantIndex));
    parts.push(Buffer.from(c.D, 'hex'));
    parts.push(Buffer.from(c.E, 'hex'));
  }

  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Binding factor derivation
// ---------------------------------------------------------------------------

/**
 * Compute the binding factor ρ_i for participant `participantIndex`.
 *
 *   ρ_i = H("frost-bind-v1" ‖ u32BE(i) ‖ message ‖ B_bytes)  mod ℓ
 *
 * @param participantIndex  1-based Shamir share index of the signer.
 * @param message           The message bytes being signed.
 * @param commitments       All Round-1 nonce commitments from participating parties.
 * @returns Binding factor scalar ρ_i as a BigInt in [0, ℓ).
 */
export function computeBindingFactor(
  participantIndex: number,
  message: Uint8Array,
  commitments: NonceCommitment[]
): bigint {
  const domainSep = Buffer.from('frost-bind-v1', 'utf8');
  const idxBytes = u32BE(participantIndex);
  const bBytes = serialiseCommitmentList(commitments);

  const preimage = new Uint8Array(
    domainSep.length + idxBytes.length + message.length + bBytes.length
  );
  let off = 0;
  preimage.set(domainSep, off);   off += domainSep.length;
  preimage.set(idxBytes, off);    off += idxBytes.length;
  preimage.set(message, off);     off += message.length;
  preimage.set(bBytes, off);

  return mod(bytes64LEToScalar(sha512(preimage)), ED25519_ORDER);
}

/**
 * Compute all binding factors for every participating party.
 *
 * @param participantIndices  1-based indices of the participating signers.
 * @param message             Message bytes.
 * @param commitments         Round-1 nonce commitments.
 * @returns Map from participantIndex to binding factor scalar.
 */
export function computeAllBindingFactors(
  participantIndices: number[],
  message: Uint8Array,
  commitments: NonceCommitment[]
): Map<number, bigint> {
  const result = new Map<number, bigint>();
  for (const idx of participantIndices) {
    result.set(idx, computeBindingFactor(idx, message, commitments));
  }
  return result;
}

/**
 * Compute the aggregate nonce point R_agg using FROST binding:
 *   R_agg = Σ_i (D_i + ρ_i · E_i)
 *
 * This binds each party's nonce contribution to the message and participant
 * set, preventing an adversary from cancelling nonces or forging signatures.
 *
 * @param commitments       All nonce commitments (D_i, E_i) from participants.
 * @param bindingFactors    Map from participantIndex to binding factor ρ_i.
 * @param ed25519Point      Ed25519 curve point constructor (passed in to avoid
 *                          circular imports; use `ed25519.Point.BASE` from
 *                          @noble/curves).
 * @returns The aggregate nonce point R_agg.
 */
export function computeAggregateNonce<P extends { add(other: P): P; multiply(scalar: bigint): P }>(
  commitments: NonceCommitment[],
  bindingFactors: Map<number, bigint>,
  hexToPoint: (hex: string) => P
): P {
  let R: P | null = null;

  const sorted = [...commitments].sort((a, b) => a.participantIndex - b.participantIndex);
  for (const c of sorted) {
    const rho = bindingFactors.get(c.participantIndex);
    if (rho === undefined) {
      throw new Error(`Binding factor missing for participant ${c.participantIndex}`);
    }
    const D = hexToPoint(c.D);
    const E = hexToPoint(c.E);
    const contribution = D.add(E.multiply(rho));
    R = R === null ? contribution : R.add(contribution);
  }

  if (R === null) {
    throw new Error('No commitments provided for aggregate nonce computation');
  }
  return R;
}
