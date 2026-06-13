# LOGIC-30 — releaseCollateral is not idempotent → margin debited twice on repeat release

**Severity:** 🔴 High
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:high`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `services/clearing-house/collateral-management.ts:194-228`

## Problem

`releaseCollateral()` rejects only `seized` and `liquidated` positions. A position that is already
`released` is happily released again: it re-runs the margin-account reduction
(`initialMarginPosted -= adjustedValue`, etc.). Calling it twice on the same position subtracts the collateral
value from the margin account twice.

## Evidence

```ts
if (position.status === 'seized' || position.status === 'liquidated') {
  throw new Error(`Cannot release collateral in status: ${position.status}`);
}
// 'released' is NOT rejected — a second call re-runs the debit:
position.status = 'released';
if (position.heldFor === 'initial_margin') {
  account.initialMarginPosted = Math.max(0, account.initialMarginPosted - position.adjustedValue);
}
```

## Impact

A duplicate / retried release double-counts the margin reduction, understating posted margin and overstating
excess margin — which can in turn permit withdrawals or new positions that the real collateral does not support.

## Suggested fix

Make release idempotent: reject (or no-op) when `position.status === 'released'`, so the margin debit runs at
most once per position.

## Acceptance criteria

- [ ] Calling `releaseCollateral` twice on the same position debits the margin account only once (second call throws or is a no-op).
- [ ] Regression test asserts margin-account values are identical after one vs. two release calls.
