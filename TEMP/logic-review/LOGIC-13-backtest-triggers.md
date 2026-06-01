# LOGIC-13 — Backtest `checkTriggers` always returns true; crossover triggers never fire

**Severity:** 🟠 Medium
**Area:** Strategy / Backtesting
**Stage:** 4 — Strategy/backtest integrity
**Suggested labels:** `bug`, `severity:medium`, `area:strategy`
**Location:** `core/strategies/engine/backtesting.ts:469-497`, `:682-701`

## Problem

Two compounding correctness defects:

1. `checkTriggers` falls through to `return true` unconditionally (`:496`), so even a `price` trigger whose
   condition is false still executes — per-trigger evaluation is meaningless and the strategy fires on
   every bar regardless of configured triggers.
2. `crosses_above` / `crosses_below` always return `false` (no previous-value state), so any
   crossover-based strategy is silently un-triggerable in backtests.

There is also no warm-up period before trading begins.

## Evidence

```ts
private checkTriggers(...): boolean {
  for (const trigger of definition.triggers) {
    ...
    if (trigger.config.type === 'price') {
      const price = prices.get(config.token);
      if (price && this.compareValues(price, config.operator, config.value)) {
        return true;
      }
    }
  }
  return true; // Default to executing for backtest   <-- always fires
}

case 'crosses_above':
case 'crosses_below':
  // Would need previous value tracking
  return false;   // crossover strategies never trigger
```

## Impact

Backtest results do not reflect the configured strategy logic: price/crossover-gated strategies are either
always-on or never-on, producing performance metrics unrelated to live behavior. These metrics then drive
optimization and marketplace decisions.

## Suggested fix

Replace the unconditional `return true` with `return false` (no trigger matched → do not execute).
Implement crossover triggers by tracking the previous price/indicator value across time steps. Add an
explicit warm-up window before signals are honored.

## Acceptance criteria

- [ ] `checkTriggers` returns `true` only when a configured trigger actually matches.
- [ ] `crosses_above` / `crosses_below` evaluate against the previous step's value.
- [ ] Warm-up window applied before signals are honored.
- [ ] Tests: a never-matching trigger produces zero trades; a crossover fires exactly at the cross.
