# LOGIC-41 — Partial capital allocation favours the lowest-priority requests (priority semantics inverted)

**Severity:** 🟠 Medium
**Area:** Strategy
**Stage:** Stage 4 — Strategy / backtest / optimizer integrity
**Suggested labels:** `bug`, `severity:medium`, `area:strategy`, `stage:4-strategy-integrity`, `audit:logic-review-v2`
**Location:** `core/multi-agent/resources/capital-manager.ts:90-101 (TaskPriority defined at core/multi-agent/types.ts:301)`

## Problem

`TaskPriority` is documented as `1 | 2 | 3 | 4 | 5; // 1 = highest`. When available capital is insufficient,
the partial-allocation path is guarded by `request.priority >= 3` — i.e. it fires only for the *lower-priority*
half (3-5). Highest-priority requests (1-2) take the `else` branch and are rejected outright, while
low-priority requests are partially funded.

## Evidence

```ts
// TaskPriority: 1 = highest
if (request.amount > pool.availableCapital) {
  if (request.priority >= 3 && pool.availableCapital > 0) {   // only LOW priority gets partial fill
    request.amount = pool.availableCapital;
  } else {
    request.status = 'rejected';                              // HIGH priority rejected entirely
    return null;
  }
}
```

## Impact

Under capital contention the highest-priority agents are starved (rejected) while the lowest-priority ones
receive the remaining capital — the opposite of the intended prioritisation.

## Suggested fix

Decide the intended policy and make the comparison match `1 = highest`. If partial fills should favour
high-priority requests, gate on `request.priority <= N`; document the chosen semantics with a named constant
rather than a bare `>= 3`.

## Acceptance criteria

- [ ] Under contention, partial allocation favours higher-priority requests per the documented `1 = highest` ordering (or the chosen policy is documented and tested).
- [ ] Regression test contrasts a priority-1 and a priority-5 request against the same limited pool.
