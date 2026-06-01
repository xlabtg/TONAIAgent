# LOGIC-19 — Optimizer early-stopping ignores invalid evaluations → patience never triggers

**Severity:** 🟡 Low
**Area:** Strategy / Optimizer
**Stage:** 4 — Strategy/backtest integrity
**Suggested labels:** `bug`, `severity:low`, `area:strategy`
**Location:** `core/strategies/engine/optimization.ts:143-162`

## Problem

`iterationsWithoutImprovement` is only incremented for `valid` evaluations. A long run of
constraint-violating (`valid === false`) evaluations neither resets nor increments the counter, so early
stopping can never trigger during such stretches. Combined with optimizers that don't set `isComplete()`
early, the loop can run all the way to `config.maxIterations` with no progress.

## Evidence

```ts
if (evaluation.valid) {
  if (!bestResult || this.isBetter(evaluation, bestResult, config.objective)) {
    bestResult = evaluation;
    iterationsWithoutImprovement = 0;
  } else {
    iterationsWithoutImprovement++;
  }
}
...
if (iterationsWithoutImprovement >= this.config.earlyStoppingPatience) {
  break;
}
```

## Impact

Early-stopping patience is defeated whenever constraints are frequently violated, wasting large amounts of
compute on backtests with no chance of improving the best result.

## Suggested fix

Count every non-improving evaluation (including invalid ones) toward `iterationsWithoutImprovement`,
resetting only on a genuine improvement.

## Acceptance criteria

- [ ] A run of invalid evaluations advances the early-stopping counter.
- [ ] Early stopping triggers after `earlyStoppingPatience` non-improving iterations regardless of validity.
- [ ] Test asserting early stop under all-invalid evaluations.
