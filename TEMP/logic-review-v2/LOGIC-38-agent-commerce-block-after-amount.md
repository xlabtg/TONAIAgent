# LOGIC-38 — Agent-commerce authorization checks blocked merchant/category after the large-amount approval branch

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 3 — Compliance & sanctions hardening
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:3-compliance-hardening`, `audit:logic-review-v2`
**Location:** `services/payments/agent-commerce.ts:516-552`

## Problem

`checkAuthorization()` evaluates the amount limit before the blocked-merchant / blocked-category checks. When
the amount exceeds `maxAmount` and a matching approval threshold requires approval, it `return`s
`{ authorized: true, requiresApproval: true }` immediately — before reaching the `blockedMerchants` and
`blockedCategories` checks. A transaction to a blocked merchant therefore returns "authorized (pending
approval)" instead of being denied.

## Evidence

```ts
if (BigInt(transaction.amount) > BigInt(auth.scope.maxAmount)) {
  for (const threshold of config.limits.approvalRequired) {
    if (... threshold.requiresApproval) {
      return { authorized: true, requiresApproval: true, ... };   // returns BEFORE the block checks below
    }
  }
  return { authorized: false, reason: 'Amount exceeds maximum authorized amount' };
}
if (config.limits.blockedMerchants.includes(transaction.merchantId)) { return { authorized: false, ... }; }
if (transaction.category && config.limits.blockedCategories.includes(transaction.category)) { ... }
```

## Impact

A blocked merchant or category can be authorised (subject only to human approval) as long as the amount is
large enough to take the approval branch — the deny-list is bypassed for exactly the high-value transactions
that most need it.

## Suggested fix

Evaluate the hard deny-lists (blocked merchants/categories) **before** the amount/approval logic, so a blocked
counterparty is rejected regardless of amount.

## Acceptance criteria

- [ ] A transaction to a blocked merchant/category is denied even when the amount triggers the approval branch.
- [ ] Deny-list checks run before the amount-limit/approval logic.
- [ ] Regression test: large-amount transaction to a blocked merchant returns `authorized: false`.
