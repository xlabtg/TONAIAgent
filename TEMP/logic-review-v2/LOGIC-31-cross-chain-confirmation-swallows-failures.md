# LOGIC-31 — Cross-chain waitForConfirmation reports success on missing connector / still-pending tx

**Severity:** 🔴 High
**Area:** Reliability
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:high`, `area:reliability`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `connectors/cross-chain-liquidity/execution.ts:379-405 (consumed at :142-163)`

## Problem

`waitForConfirmation()` has two unsafe exits: (1) if no connector is registered for the chain it returns a
synthetic `{ status: 'confirmed' }`; (2) after `maxAttempts` polls without confirmation it returns
`connector.checkTransactionStatus(txHash)` once more, which can still be `pending`. The caller (`executeTrade`)
only treats `status === 'failed'` as an error, so both a missing connector and a never-confirmed tx are treated
as a completed leg.

## Evidence

```ts
const connector = this.registry.get(chainId);
if (!connector) {
  return { hash: txHash, chainId, status: 'confirmed', confirmations: 1, submittedAt: new Date() }; // phantom success
}
for (let attempt = 0; attempt < maxAttempts; attempt++) { ... }
return connector.checkTransactionStatus(txHash);   // may still be 'pending'

// caller only rejects on 'failed':
if (txDetails.status === 'failed') { throw new Error(`Transaction failed: ${txDetails.hash}`); }
```

## Impact

A multi-leg cross-chain swap can be reported as confirmed when a leg's transaction never actually confirmed
(or no connector exists), so the engine proceeds to the next leg / marks the trade complete while funds are
in limbo. This can strand or double-spend value across chains.

## Suggested fix

Treat a missing connector as an error (fail-closed), and treat a non-`confirmed` terminal poll result as
unconfirmed (throw / mark the leg pending-for-retry) rather than returning it as success. The caller should
require `status === 'confirmed'` to proceed, not merely "not failed".

## Acceptance criteria

- [ ] A missing connector causes `waitForConfirmation` to fail-closed (no synthetic `confirmed`).
- [ ] A tx still `pending` after `maxAttempts` does not advance the trade as if confirmed.
- [ ] The caller proceeds only on `status === "confirmed"`.
- [ ] Regression tests cover missing-connector and timeout-still-pending paths.
