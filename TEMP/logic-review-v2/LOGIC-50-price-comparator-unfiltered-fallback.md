# LOGIC-50 — Liquidity router falls back to unfiltered quotes, bypassing liquidity/impact safety filters

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `connectors/liquidity-router/price_comparator.ts:62-77`
**Filed as:** [#460](https://github.com/xlabtg/TONAIAgent/issues/460)

## Problem

After filtering candidate venues by liquidity / price-impact safety constraints, if the filtered set is empty
the comparator falls back to the **unfiltered** quote list and picks the best of those. This silently bypasses
the very constraints that removed those venues, and the `INSUFFICIENT_LIQUIDITY` branch becomes unreachable.

## Evidence

```ts
const qualified = quotes.filter(q =>
  q.liquidityUsd >= this.minLiquidityUsd &&
  q.priceImpactPercent <= this.maxPriceImpactPercent
);
// If nothing passes the filter, fall back to unfiltered set:
const candidates = qualified.length > 0 ? qualified : quotes;   // bypasses the filter

if (candidates.length === 0) {                 // unreachable: quotes.length===0 already threw NO_ROUTES above
  throw new LiquidityRouterError(..., 'INSUFFICIENT_LIQUIDITY', ...);
}
// ranking then picks the best of UNFILTERED candidates
```

## Impact

A trade can be routed to a venue with insufficient liquidity or excessive price impact precisely when no safe
venue exists — the safety filter is defeated exactly when it matters, and the user is not told liquidity was
insufficient.

## Suggested fix

When no venue passes the safety filter, return `INSUFFICIENT_LIQUIDITY` (or surface the constraint breach to the
caller) instead of routing through an unfiltered fallback. If a degraded fallback is intentional, gate it behind
an explicit opt-in and report the breached constraint.

## Acceptance criteria

- [ ] With no venue passing the liquidity/impact filter, the router reports `INSUFFICIENT_LIQUIDITY` rather than routing anyway.
- [ ] Any intentional fallback is explicit and reported.
- [ ] Regression test with all venues failing the filter asserts the insufficient-liquidity outcome.
