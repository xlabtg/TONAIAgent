# LOGIC-29 — executeDisbursement never debits the treasury balance / allocated balance

**Severity:** 🔴 High
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:high`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `services/ecosystem-fund/treasury.ts:471-523`
**Filed as:** [#439](https://github.com/xlabtg/TONAIAgent/issues/439)

## Problem

`executeDisbursement()` marks the disbursement `completed`, sets a tx hash, increments the
`stats.totalDisbursed` counter and records a transaction — but it never decrements the treasury's available
balance or the allocation's reserved/allocated balance. The fund's tracked balance is unchanged by a
disbursement.

## Evidence

```ts
disbursement.status = 'completed';
disbursement.disbursedAt = new Date();
disbursement.txHash = this.generateId('tx');

// only a stat counter is updated — no balance debit:
this.treasury.stats.totalDisbursed = (
  BigInt(this.treasury.stats.totalDisbursed) + BigInt(disbursement.amount)
).toString();
// ... records a transaction, but treasury.balance / allocatedBalance are never reduced
```

## Impact

The treasury can disburse without bound: balance never decreases, so balance-based guards (if any) never trip
and the books do not reflect outflows. Accounting is corrupted and over-disbursement is possible.

## Suggested fix

Debit the available balance (and release/settle the allocation's reserved amount) atomically when a
disbursement completes, after asserting sufficient balance. Reconcile `stats.totalDisbursed` with the actual
balance delta.

## Acceptance criteria

- [ ] A completed disbursement reduces the treasury available balance by the disbursed amount.
- [ ] Disbursing more than the available balance is rejected.
- [ ] Regression test asserts balance before/after and that over-disbursement throws.
