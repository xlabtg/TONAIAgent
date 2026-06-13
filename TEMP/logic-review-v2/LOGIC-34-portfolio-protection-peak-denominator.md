# LOGIC-34 — Daily-loss percent uses peak value as denominator → loss% understated, breaker trips late

**Severity:** 🟠 Medium
**Area:** Financial
**Stage:** Stage 2 — Funds & accounting correctness
**Suggested labels:** `bug`, `severity:medium`, `area:financial`, `stage:2-funds-correctness`, `audit:logic-review-v2`
**Location:** `core/risk-engine/portfolio-protection.ts:428-430`
**Filed as:** [#444](https://github.com/xlabtg/TONAIAgent/issues/444)

## Problem

The daily-loss breaker computes `dailyLossPercent = dailyLossUsd / peakValueUsd`. Using the all-time *peak*
portfolio value as the denominator (instead of the current portfolio value, or the day's starting value)
systematically understates the loss percentage whenever the portfolio has drawn down from its peak.

## Evidence

```ts
const dailyLossPercent = this.state.peakValueUsd > 0
  ? (dailyLossUsd / this.state.peakValueUsd) * 100
  : 0;
```

## Impact

After a drawdown, the same dollar loss maps to a smaller percentage than reality, so the daily-loss circuit
breaker trips later than its configured threshold — exactly when capital is already depleted and protection
matters most.

## Suggested fix

Use the appropriate base for "daily loss percent": the day's starting equity (or current portfolio value),
not the historical peak. Define the denominator explicitly and document it.

## Acceptance criteria

- [ ] Daily-loss percentage is computed against the day-start (or current) portfolio value, not the historical peak.
- [ ] Regression test: a fixed dollar loss after a drawdown yields the correct percentage and trips the breaker at the configured threshold.
