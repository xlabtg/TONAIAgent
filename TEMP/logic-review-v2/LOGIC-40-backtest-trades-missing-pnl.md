# LOGIC-40 — Backtest trades never carry per-trade pnl → win rate, expectancy and returns are always zero

**Severity:** 🔴 High
**Area:** Strategy
**Stage:** Stage 4 — Strategy / backtest / optimizer integrity
**Suggested labels:** `bug`, `severity:high`, `area:strategy`, `stage:4-strategy-integrity`, `audit:logic-review-v2`
**Location:** `core/strategies/engine/backtesting.ts:602-617, 650-666, 767-841`

## Problem

Trade records pushed during a backtest never set a `pnl` field. Buy trades are pushed without `pnl`; the
sell path computes a local `pnl` and adds it to `realizedPnl` but does not record a trade carrying it.
The performance summary then derives `winningTrades = trades.filter(t => (t.pnl ?? 0) > 0)`,
`winRate`, `avgWin`, `expectancy`, and per-trade `returns` — all of which collapse because every
`t.pnl` is `undefined → 0`.

## Evidence

```ts
// buy trade pushed — no pnl:
trades.push({ id: ..., type: 'buy', token, amount: tokensReceived, price: effectivePrice, value: amount, fees, slippage });

// sell path computes pnl locally but records no trade with it:
const pnl = (position.currentPrice - position.entryPrice) * sellAmount;
state.realizedPnl += pnl;

// summary depends on t.pnl, which is always undefined:
const winningTrades = trades.filter(t => (t.pnl ?? 0) > 0);     // always empty
const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;  // always 0
const returns = trades.map(t => (t.pnl ?? 0) / t.value);        // all 0
```

## Impact

Every backtest reports a 0% win rate, zero expectancy, and zero per-trade returns regardless of the strategy's
actual performance. Any ranking, selection, or marketplace surfacing built on these metrics is meaningless.

## Suggested fix

Record realized P&L on the closing (sell) trade (and/or attach `pnl` to the trade objects the summary
consumes). Ensure `winningTrades`/`losingTrades`/`returns` read a populated `pnl`. Add a test asserting a
known winning strategy yields a non-zero win rate.

## Acceptance criteria

- [ ] Closed trades carry a realized `pnl` consumed by the performance summary.
- [ ] A deterministic profitable scenario yields `winRate > 0` and non-zero expectancy.
- [ ] Per-trade `returns` reflect realized P&L.
