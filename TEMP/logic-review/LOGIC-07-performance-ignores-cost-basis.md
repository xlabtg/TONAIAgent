# LOGIC-07 — Backtest win/loss metrics ignore cost basis → ~100% win rate

**Severity:** 🔴 High
**Area:** Strategy / Backtesting
**Stage:** 4 — Strategy/backtest integrity
**Suggested labels:** `bug`, `severity:high`, `area:strategy`
**Location:** `core/strategies/backtesting/performance-analysis.ts:394-427`

## Problem

Per-sell P&L is computed as `proceeds - fees` with **no entry cost subtracted**. For any non-trivial
trade `proceeds > fees`, so `pnl > 0` and essentially every sell is classified as a winning trade. Win
rate trends to ~100%, `grossLoss ≈ 0` so `profitFactor` becomes `Infinity` (coerced to 0 at `:424`), and
`avgWin`/`expectancy` reflect gross proceeds rather than realized profit.

## Evidence

```ts
const tradeResults = sells.map((order) => {
  const proceeds = order.filledAmount * order.executedPrice;
  // Approximate cost by assuming entry at a fair price (will be 0 for market orders ...)
  return { pnl: proceeds - order.fees, value: proceeds };   // no cost basis
});

const winningTrades = tradeResults.filter((t) => t.pnl > 0);   // ~all sells
const losingTrades  = tradeResults.filter((t) => t.pnl <= 0);
const winRate = sells.length > 0 ? (winningTrades.length / sells.length) * 100 : 0;
const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
```

## Impact

`PerformanceReport` feeds strategy validation, the risk evaluator's `minWinRate` gate
(`risk-evaluation.ts:320-330`), and marketplace ranking. Losing strategies are reported with near-100% win
rates and meaningless profit factors, so they pass validation and are surfaced/ranked as high quality —
directly misleading users.

## Suggested fix

Track average entry price per asset during simulation (as execution already does) and compute
`pnl = proceeds - costBasis - fees`. Do not classify trades or compute profit factor / expectancy from
proceeds alone.

## Acceptance criteria

- [ ] Realized P&L per closing trade subtracts the matched cost basis and fees.
- [ ] A strategy that buys high and sells low reports a losing trade and win rate < 100%.
- [ ] `profitFactor` is finite and meaningful for mixed win/loss runs.
- [ ] Test with a deterministic buy/sell sequence asserting correct win rate, profit factor, expectancy.
