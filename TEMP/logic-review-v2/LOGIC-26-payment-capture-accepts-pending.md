# LOGIC-26 — capturePayment accepts `pending` payments, bypassing the authorization step

**Severity:** 🔴 High
**Area:** Financial
**Stage:** Stage 1 — Safety re-wiring & fail-open access control
**Suggested labels:** `bug`, `severity:high`, `area:financial`, `stage:1-safety-rewiring`, `audit:logic-review-v2`
**Location:** `services/payments/payment-gateway.ts:332-354`

## Problem

`capturePayment()` permits capture when the status is either `authorized` **or** `pending`. A capture should
only follow a successful authorization. Accepting `pending` lets a payment that was never authorised be
captured and then processed to completion.

## Evidence

```ts
if (payment.status !== 'authorized' && payment.status !== 'pending') {
  throw new Error(`Cannot capture payment with status: ${payment.status}`);
}
// ...
payment.status = 'captured';
await this.processPayment(payment);   // proceeds to completion
```

## Impact

The authorization gate is bypassable: a freshly-created `pending` payment can be captured directly, skipping
authorization (and any limit/risk checks attached to it). Funds are moved for a payment that was never
authorised.

## Suggested fix

Require `payment.status === 'authorized'` for capture. If a "capture without explicit prior authorize" flow is
genuinely needed, model it as an explicit auth-and-capture method that performs the authorization checks first,
rather than silently treating `pending` as capturable.

## Acceptance criteria

- [ ] Capturing a `pending` (never-authorized) payment throws.
- [ ] Only `authorized` payments can be captured (or an explicit auth+capture path runs the authorization checks).
- [ ] Regression test covers capture attempts from each status.
