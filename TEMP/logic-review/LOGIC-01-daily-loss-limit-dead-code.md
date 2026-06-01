# LOGIC-01 — Daily loss limit is never enforced (dead safety code)

**Severity:** 🔴 High
**Area:** Financial / Risk engine
**Stage:** 1 — Safety re-wiring
**Suggested labels:** `bug`, `severity:high`, `area:financial`
**Location:** `core/risk-engine/trade-validator.ts:340-396` (and the interface at `:146-165`)

## Problem

The risk engine advertises a daily-loss circuit breaker ("Daily loss limits — disable trading until next
day"), but the control never activates at runtime.

- `recordTrade()` accumulates `totalLossUsd` but explicitly defers the percentage check
  ("For now... check percentage in `validate()`").
- `validate()` never performs that check — it only reads an already-set flag via `isTradingDisabled()`.
- The only method that sets `record.tradingDisabled = true` is `checkDailyLossLimit()`, which is **not**
  part of the `TradeValidator` interface and is called nowhere in production code (a repo-wide search
  finds it only in `tests/risk-engine/risk-management.test.ts` and its own definition).

So `tradingDisabled` is never flipped during normal operation; the unit test passes only because it calls
the dead method directly.

## Evidence

```ts
// recordTrade() — accumulates but never disables:
record.netPnlUsd = record.totalGainUsd - record.totalLossUsd;
// Check if daily loss limit should disable trading
// Note: We need portfolio value for percentage calculation
// For now, track absolute loss and check percentage in validate()
}

// The ONLY writer of tradingDisabled — never called in production:
checkDailyLossLimit(agentId: string, portfolioValueUsd: number): boolean {
  ...
  if (lossPercent >= this.config.dailyLossLimitPercent && !record.tradingDisabled) {
    record.tradingDisabled = true;
```

## Impact

The advertised daily-loss protection is inert. An agent can lose far beyond `dailyLossLimitPercent`
(default 3%) and `validate()` keeps approving trades, because nothing ever sets `tradingDisabled`.

## Suggested fix

`validate()` already receives `request.portfolioValueUsd`. Invoke the limit check inside `validate()`
before the `isTradingDisabled()` read, and/or call it at the end of `recordTrade()` by threading the
portfolio value through. Expose `checkDailyLossLimit` on the `TradeValidator` interface.

## Acceptance criteria

- [ ] `validate()` (or `recordTrade()`) calls `checkDailyLossLimit()` so the flag is set during normal flow.
- [ ] A trade that pushes cumulative daily loss past `dailyLossLimitPercent` is rejected by `validate()`.
- [ ] `checkDailyLossLimit` is added to the `TradeValidator` interface.
- [ ] Regression test that drives losses past the threshold **through `validate()`/`recordTrade()` only**
      (not by calling `checkDailyLossLimit` directly) and asserts subsequent trades are blocked.
