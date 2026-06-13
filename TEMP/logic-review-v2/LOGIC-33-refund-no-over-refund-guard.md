# LOGIC-33 — refundPayment has no upper-bound guard → refund can exceed the captured amount

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `services/payments/payment-gateway.ts:377-408`
**Filed as:** [#443](https://github.com/xlabtg/TONAIAgent/issues/443)

## Problem

`refundPayment()` accepts an arbitrary `amount` and never checks it against the captured payment amount. It
computes `isPartialRefund = BigInt(refundAmount) < BigInt(payment.amount)`; when `refundAmount` is *greater*
than `payment.amount` this is `false`, so the payment is marked fully `refunded` and the oversized
`refundAmount` is returned as the refund. There is also no cumulative-refund tracking, so the remaining
balance after a partial refund cannot be refunded (status leaves `completed`) — the two issues bracket the
missing amount accounting.

## Evidence

```ts
const refundAmount = amount || payment.amount;
const isPartialRefund = BigInt(refundAmount) < BigInt(payment.amount);   // no upper bound
payment.status = isPartialRefund ? 'partially_refunded' : 'refunded';
// returns refundAmount verbatim, even if > payment.amount
```

## Impact

A caller can request a refund larger than what was captured and the gateway will report a successful refund of
that larger amount, enabling over-refund / fund leakage. Conversely, a single partial refund locks the
remainder because the status guard only allows refunding a `completed` payment.

## Suggested fix

Validate `refundAmount <= payment.amount - alreadyRefunded`. Track cumulative refunded amount on the payment so
multiple partial refunds are supported up to (but not beyond) the captured total, and reject any request that
would exceed it.

## Acceptance criteria

- [ ] A refund greater than the captured amount (minus prior refunds) is rejected.
- [ ] Cumulative partial refunds are allowed up to the captured total and no further.
- [ ] Regression test covers over-refund and sequential partial refunds.
