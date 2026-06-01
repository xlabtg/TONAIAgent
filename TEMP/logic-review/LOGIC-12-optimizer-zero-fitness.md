# LOGIC-12 — Genetic optimizer treats a zero objective value as "not yet evaluated"

**Severity:** 🟠 Medium
**Area:** Strategy / Optimizer
**Stage:** 4 — Strategy/backtest integrity
**Suggested labels:** `bug`, `severity:medium`, `area:strategy`
**Location:** `core/strategies/engine/optimization.ts:786-828` (esp. `:805-807`, `:818-827`); objective at `:310-311`

## Problem

`fitness === 0` is overloaded as both "uninitialized" and a valid evaluated score of zero. Population is
initialized with `fitness: 0`, and the objective can legitimately be 0 (e.g. `min_drawdown` returns
`-maxDrawdown` → 0 for a 0% drawdown run; or a Sharpe of exactly 0). Any individual whose true objective
value is 0 is permanently mis-classified as unevaluated.

## Evidence

```ts
suggest(count: number): ParameterSet[] {
  const unevaluated = this.population
    .filter(p => p.fitness === 0)   // a real evaluated score of 0 looks "unevaluated"
    .slice(0, count);
  ...
}

observe(params: ParameterSet, value: number): void {
  const individual = this.population.find(...);
  if (individual) {
    individual.fitness = value;   // legitimately may be 0
  }
}
```

## Impact

`suggest()` keeps re-emitting already-scored individuals (wasted backtest evaluations), `evolve()`'s
selection treats them as worst, and genuinely break-even / zero-Sharpe strategies are discarded —
non-convergent or degenerate optimization for objectives that can produce 0.

## Suggested fix

Use a separate `evaluated: boolean` flag (or `fitness: number | undefined`) to distinguish "not yet
evaluated" from "evaluated to 0".

## Acceptance criteria

- [ ] Unevaluated vs. evaluated-to-zero are distinguished by an explicit flag.
- [ ] `suggest()` never re-emits an already-evaluated individual.
- [ ] Test: an individual scored exactly 0 is not re-suggested and participates in selection.
