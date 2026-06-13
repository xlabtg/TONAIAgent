# LOGIC-47 — Iceberg execution loops forever on an unfilled resting limit order

**Severity:** 🔴 High
**Area:** Reliability
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:high`, `area:reliability`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `core/trading/live/execution-engine.ts:471-500`

## Problem

`executeIceberg` slices the order with `while (remainingQuantity > 0 && status !== 'cancelled')`, decrementing
`remainingQuantity` by `order.filledQuantity`. It `break`s only on `rejected`/`expired` status (or a thrown
error). A limit order that rests unfilled (status `open`/`new`, `filledQuantity === 0`) leaves
`remainingQuantity` unchanged, so the loop repeats forever (with a 1s sleep per slice), re-placing slices
indefinitely.

## Evidence

```ts
while (remainingQuantity > 0 && (execution.status as string) !== 'cancelled') {
  const order = await connector.placeOrder({ type: 'limit', price: request.priceLimit, ... });
  execution.orders.push(order);
  remainingQuantity -= order.filledQuantity;          // 0 if the limit order just rests
  if (order.status === 'rejected' || order.status === 'expired') break;  // 'open'/'new' never breaks
  if (remainingQuantity > 0) await sleep(1000);
}
```

## Impact

Against a limit price that is not immediately marketable, the engine spins forever, continuously placing new
resting slices — unbounded order spam, resource exhaustion, and a stuck execution that never completes or fails.

## Suggested fix

Add a termination condition independent of fill: a maximum number of slices / total timeout, and handle
resting (non-terminal) order statuses — cancel-and-repost with a bound, or abort the iceberg after N
unproductive iterations. Make zero forward progress over a slice a stop condition.

## Acceptance criteria

- [ ] An iceberg whose slices rest unfilled terminates after a bounded number of attempts / a timeout.
- [ ] The loop cannot place an unbounded number of orders.
- [ ] Regression test with a connector that always returns `filledQuantity: 0` asserts the loop exits.
