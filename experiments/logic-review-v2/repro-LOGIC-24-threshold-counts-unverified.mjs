#!/usr/bin/env node
/**
 * Reproduction for LOGIC-24 — threshold signing counts UNVERIFIED signatures
 * toward the required-signature quorum.
 *
 * core/security/key-management.ts:1439-1472 (addSignature) verifies each
 * incoming signature and stores the boolean on `signatureWithVerification.verified`,
 * but the gate that flips a request to `ready_to_broadcast` compares the raw
 * array length, NOT the count of verified === true:
 *
 *     const verified = await this.storage.verify(...);
 *     request.collectedSignatures.push({ ...signature, verified });
 *
 *     if (request.collectedSignatures.length >= request.requiredSignatures) { // <-- bug
 *       request.status = 'ready_to_broadcast';
 *     }
 *
 * So a request can reach `ready_to_broadcast` with invalid signatures: an
 * attacker who can submit junk (or a buggy signer) drives the request to
 * "ready" without contributing a valid signature, defeating the threshold
 * guarantee for fund-moving transactions. A single signer re-submitting under
 * the same public key can likewise fill multiple slots.
 *
 * This script mirrors the arithmetic for a 2-of-N request and shows:
 *   - [buggy]  one valid + one invalid signature  -> ready_to_broadcast (WRONG)
 *   - [fixed]  same two signatures                -> collecting_signatures
 *   - [fixed]  only after a second VALID signature -> ready_to_broadcast
 *   - [fixed]  a duplicate public key cannot occupy more than one slot
 *
 * Run: node experiments/logic-review-v2/repro-LOGIC-24-threshold-counts-unverified.mjs
 */

const requiredSignatures = 2; // 2-of-N threshold request

// Three submissions: one valid signer, one junk/invalid signature from an
// attacker, then a second valid signer. `verified` is what storage.verify()
// would return for each.
const submissions = [
  { publicKey: 'signer-A', signature: 'valid-sig-A', verified: true },
  { publicKey: 'attacker', signature: 'junk-sig', verified: false },
  { publicKey: 'signer-B', signature: 'valid-sig-B', verified: true },
];

// ---- Current (buggy) behaviour: gate on raw array length ------------------
function buggyStatusAfter(n) {
  const collected = [];
  for (let i = 0; i < n; i++) collected.push(submissions[i]);
  return collected.length >= requiredSignatures ? 'ready_to_broadcast' : 'collecting_signatures';
}

// ---- Fixed behaviour: gate on the number of DISTINCT verified public keys --
function fixedStatusAfter(n) {
  const collected = [];
  for (let i = 0; i < n; i++) collected.push(submissions[i]);
  const verifiedSigners = new Set(collected.filter((s) => s.verified).map((s) => s.publicKey));
  return verifiedSigners.size >= requiredSignatures ? 'ready_to_broadcast' : 'collecting_signatures';
}

console.log('LOGIC-24 — unverified signatures counted toward the quorum');
console.log('---------------------------------------------------------');
console.log(`requiredSignatures: ${requiredSignatures}`);
console.log('');

// After the valid signer + the junk signature (2 rows, but only 1 verified):
const afterTwo = 2;
const buggyAfterTwo = buggyStatusAfter(afterTwo);
const fixedAfterTwo = fixedStatusAfter(afterTwo);
console.log(`after 1 valid + 1 invalid signature:`);
console.log(`  [buggy]  count rows      = 2 verified-or-not -> ${buggyAfterTwo}`);
console.log(`  [fixed]  count verified  = 1                 -> ${fixedAfterTwo}`);
console.log('');

// After a genuine second valid signature (3 rows, 2 verified):
const afterThree = 3;
console.log(`after a genuine second valid signature:`);
console.log(`  [fixed]  count verified  = 2                 -> ${fixedStatusAfter(afterThree)}`);
console.log('');

// Duplicate public-key slot stuffing: the same signer submits twice.
const dupSubmissions = [
  { publicKey: 'signer-A', signature: 'valid-sig-A', verified: true },
  { publicKey: 'signer-A', signature: 'valid-sig-A', verified: true },
];
const buggyDupCount = dupSubmissions.length; // raw rows
const fixedDupCount = new Set(dupSubmissions.filter((s) => s.verified).map((s) => s.publicKey)).size;
console.log(`duplicate public key (same signer submits twice):`);
console.log(`  [buggy]  rows counted        = ${buggyDupCount} -> ${buggyDupCount >= requiredSignatures ? 'ready_to_broadcast' : 'collecting_signatures'}`);
console.log(`  [fixed]  distinct verified   = ${fixedDupCount} -> ${fixedDupCount >= requiredSignatures ? 'ready_to_broadcast' : 'collecting_signatures'}`);
console.log('');

const bugReproduced =
  buggyAfterTwo === 'ready_to_broadcast' &&
  fixedAfterTwo === 'collecting_signatures' &&
  fixedStatusAfter(afterThree) === 'ready_to_broadcast' &&
  buggyDupCount >= requiredSignatures &&
  fixedDupCount < requiredSignatures;

console.log(
  bugReproduced
    ? 'BUG REPRODUCED: the length-based gate accepts unverified/duplicate signatures; the verified-distinct gate does not.'
    : 'No discrepancy — bug not reproduced.'
);

process.exit(bugReproduced ? 1 : 0);
