# LOGIC-24 — Threshold signing counts unverified signatures toward the required-signature quorum

**Severity:** 🔴 High
**Area:** Security
**Stage:** Stage 1 — Safety re-wiring & fail-open access control
**Suggested labels:** `bug`, `security`, `severity:high`, `area:security`, `stage:1-safety-rewiring`, `audit:logic-review-v2`
**Location:** `core/security/key-management.ts:1439-1472`
**Filed as:** [#434](https://github.com/xlabtg/TONAIAgent/issues/434)

## Problem

`addSignature()` verifies each incoming signature and stores the boolean on `signatureWithVerification.verified`,
but the threshold gate that flips a request to `ready_to_broadcast` compares
`request.collectedSignatures.length` — the count of **all** collected signatures — to `requiredSignatures`.
A signature whose `verified === false` still counts toward the quorum.

## Evidence

```ts
const verified = await this.storage.verify(signature.publicKey, request.message, signature.signature);
const signatureWithVerification = { ...signature, verified };
request.collectedSignatures.push(signatureWithVerification);

// quorum uses the array length, not the count of verified === true:
if (request.collectedSignatures.length >= request.requiredSignatures) {
  request.status = 'ready_to_broadcast';
}
```

## Impact

A multi-sig / threshold-signing request can reach `ready_to_broadcast` with invalid signatures. An attacker
who can submit junk signatures (or a buggy signer) drives the request to "ready" without contributing a valid
signature, defeating the threshold guarantee for fund-moving transactions.

## Suggested fix

Gate on the number of **verified** signatures:
`request.collectedSignatures.filter(s => s.verified).length >= request.requiredSignatures`. Optionally reject
unverified signatures outright (don't store them), and reject duplicate public keys so one signer cannot fill
multiple slots.

## Acceptance criteria

- [ ] The `ready_to_broadcast` transition counts only signatures with `verified === true`.
- [ ] Duplicate public keys cannot occupy more than one signature slot.
- [ ] Regression test: a request with `requiredSignatures = 2` and one valid + one invalid signature stays in `collecting_signatures`; it becomes `ready_to_broadcast` only after two valid signatures.
