# LOGIC-44 — Capital-contention detection off-by-one misses two-agent contention

**Severity:** 🟡 Low
**Area:** Reliability
**Stage:** Stage 4 — Strategy / backtest / optimizer integrity
**Suggested labels:** `bug`, `severity:low`, `area:reliability`, `stage:4-strategy-integrity`, `audit:logic-review-v2`
**Location:** `core/multi-agent/resources/conflict-resolver.ts:193-216`

## Problem

The capital-contention detector enters its check only when `significantAllocations.length > 2` — i.e. it
requires **three or more** agents holding significant allocations before it even looks for simultaneous
execution. Contention between exactly two agents over the same capital pool is therefore never detected. The
outer threshold should be `>= 2` (two or more competitors is already contention); the inner
`conflictingAgents.length > 1` check is already correct.

## Evidence

```ts
const significantAllocations = Array.from(agentAllocations.entries())
  .filter(([, amount]) => amount > 1000);

if (significantAllocations.length > 2) {     // requires 3+; misses the 2-agent case
  const executingAgents = context.agents.filter((a) => a.status === 'executing').map((a) => a.agentId);
  const conflictingAgents = significantAllocations
    .filter(([agentId]) => executingAgents.includes(agentId))
    .map(([agentId]) => agentId);
  if (conflictingAgents.length > 1) { /* raise capital_contention conflict */ }
}
```

## Impact

The most common contention case — two agents wanting the same capital pool — is never surfaced or resolved by
the conflict resolver, so it falls through to whatever first-come behaviour exists.

## Suggested fix

Use `significantAllocations.length >= 2` (or `> 1`) so any two-or-more-way contention is evaluated; the inner
`conflictingAgents.length > 1` guard already handles the simultaneous-execution requirement.

## Acceptance criteria

- [ ] Two agents contending for the same resource are detected as a conflict.
- [ ] Regression test with exactly two competitors asserts a contention conflict is raised.
