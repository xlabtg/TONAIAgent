# LOGIC-42 — Genetic optimizer terminates immediately when maxIterations < populationSize

**Severity:** 🟠 Medium
**Area:** Strategy
**Stage:** Stage 4 — Strategy / backtest / optimizer integrity
**Suggested labels:** `bug`, `severity:medium`, `area:strategy`, `stage:4-strategy-integrity`, `audit:logic-review-v2`
**Location:** `core/strategies/engine/optimization.ts:837-839`
**Filed as:** [#452](https://github.com/xlabtg/TONAIAgent/issues/452)

## Problem

`isComplete()` returns `this.generation >= Math.floor(this.config.maxIterations / this.populationSize)`. The
iteration budget is divided by the population size, so with the default `populationSize` (20) any
`maxIterations < 20` yields `floor(maxIterations / 20) === 0` and the optimizer is "complete" at generation 0 —
it never evolves a single generation. Even moderate budgets are silently cut by a factor of `populationSize`.

## Evidence

```ts
isComplete(): boolean {
  return this.generation >= Math.floor(this.config.maxIterations / this.populationSize);
}
```

## Impact

Genetic optimization runs effectively perform no search for typical configs: the returned parameters are the
initial random population's best, not an optimized result. Users believe tuning happened when it did not.

## Suggested fix

Interpret `maxIterations` as the number of generations directly (`generation >= maxIterations`), or convert a
function-evaluation budget to generations explicitly and guard against a zero result (`max(1, ...)`). Document
the unit of `maxIterations`.

## Acceptance criteria

- [ ] With a small `maxIterations` (e.g. 5) and default population, the optimizer runs the expected number of generations (not zero).
- [ ] Regression test asserts `generation` advances and best fitness can improve over the run.
