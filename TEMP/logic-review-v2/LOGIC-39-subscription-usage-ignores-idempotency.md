# LOGIC-39 — reportUsage ignores its idempotencyKey → duplicate usage events double-bill

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 3 — Compliance & sanctions hardening
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:3-compliance-hardening`, `audit:logic-review-v2`
**Location:** `services/payments/subscription-engine.ts:808-830 (UsageReport.idempotencyKey at :141)`
**Filed as:** [#449](https://github.com/xlabtg/TONAIAgent/issues/449)

## Problem

`UsageReport` carries an optional `idempotencyKey` (defined at line 141), but `reportUsage()` never consults
it: it unconditionally accumulates `usage.value` into `currentPeriodUsage[usage.metric]`. A retried or
duplicated usage report (same key) is counted twice.

## Evidence

```ts
export interface UsageReport {
  // ...
  idempotencyKey?: string;        // line 141 — declared but never read
}

async reportUsage(subscriptionId: string, usage: UsageReport): Promise<Subscription> {
  // ...
  const currentUsage = subscription.usage.currentPeriodUsage[usage.metric] || 0;
  subscription.usage.currentPeriodUsage[usage.metric] = currentUsage + usage.value;  // no idempotency guard
  // ...
}
```

## Impact

At-least-once delivery (network retries, client retries) leads to duplicate metered-usage records, which
inflates usage-based billing — customers are over-charged for the same usage.

## Suggested fix

Track processed `idempotencyKey`s per subscription and short-circuit (return the prior result) when a key
recurs, so each logical usage event is recorded exactly once.

## Acceptance criteria

- [ ] Two `reportUsage` calls with the same `idempotencyKey` record usage once.
- [ ] A call without a key behaves as before.
- [ ] Regression test asserts idempotent accumulation.
