# LOGIC-46 — Retry-engine execution history grows unbounded; retention config is never applied

**Severity:** 🔴 High
**Area:** Reliability
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:high`, `area:reliability`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `services/distributed-scheduler/retry-engine.ts:69-73 (config at services/distributed-scheduler/scheduler.ts:50)`

## Problem

`recordExecution()` appends to `executionHistory` per job and never trims it. The configured
`executionHistoryRetentionMs` (default 7 days) is declared in the scheduler config but never read anywhere in
the retry engine — entries are only ever removed by an explicit `cleanupJob(jobId)`. For recurring jobs that
reuse a `jobId`, history accumulates without bound.

## Evidence

```ts
recordExecution(record: ExecutionRecord): void {
  const history = this.executionHistory.get(record.jobId) ?? [];
  history.push(record);                       // never trimmed by age/size
  this.executionHistory.set(record.jobId, history);
}
// executionHistoryRetentionMs (scheduler.ts:50) is never referenced by the retry engine
```

## Impact

Long-running schedulers leak memory as execution history grows for every retried/recurring job, eventually
risking OOM. The 7-day retention the operator configured silently has no effect.

## Suggested fix

Apply `executionHistoryRetentionMs`: prune records older than the retention window (and/or cap per-job history
length) on insert or on a periodic sweep.

## Acceptance criteria

- [ ] Execution records older than `executionHistoryRetentionMs` are pruned.
- [ ] Per-job history is bounded (by age and/or count).
- [ ] Regression test inserts old records and asserts they are evicted.
