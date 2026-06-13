# LOGIC-35 — Live risk-controls use a single trade notional as the portfolio-value proxy

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `core/trading/live/risk-controls.ts:282-289`

## Problem

When recording a trade for daily-loss tracking, the code sets `const portfolioValue = value;` where `value` is
the notional of the single trade being recorded, then derives the daily-loss percentage from it. Using one
trade's notional as the portfolio value makes the percentage meaningless.

## Evidence

```ts
const portfolioValue = value;   // 'value' is this trade's notional, not the portfolio
// daily-loss percentage is then computed against this single-trade proxy
```

## Impact

The live daily-loss percentage is computed against the wrong base, so the loss-percent threshold does not
reflect actual portfolio drawdown — the breaker can trip spuriously on a large single trade or fail to trip on
a real cumulative loss.

## Suggested fix

Thread the actual current portfolio value into `recordTrade` (it is available to the risk engine elsewhere)
and use it as the denominator; do not substitute the trade notional.

## Acceptance criteria

- [ ] Daily-loss percentage in live risk-controls uses the real portfolio value, not a single-trade notional.
- [ ] Regression test asserts the percentage matches the portfolio-relative loss.
