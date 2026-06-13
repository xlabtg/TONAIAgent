# LOGIC-45 — Worker pool hands out a busy worker when the pool is exhausted (over-subscription)

**Severity:** 🔴 High
**Area:** Reliability
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:high`, `area:reliability`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `services/distributed-scheduler/worker-pool.ts:229-256`

## Problem

`acquireWorker()` returns an idle worker, or spawns one while under `maxWorkers`. When the pool is exhausted
it returns `Array.from(this.workers.values())[0]` — the first worker — regardless of whether it is busy. The
inline comment acknowledges "here we pick first busy worker". A second job is thus assigned to a worker already
running a job.

## Evidence

```ts
if (activeCount < this.config.maxWorkers) {
  return this.spawnWorker();
}
// Pool exhausted — reuse the least-loaded worker (best effort)
// In production this would queue the job; here we pick first busy worker
const first = Array.from(this.workers.values())[0];
if (!first) return this.spawnWorker();
return first;   // may be busy
```

## Impact

Under load the pool over-subscribes: two jobs share one worker, corrupting per-job worker state (current job,
status, metrics) and violating the `maxWorkers` concurrency bound. Results can be attributed to the wrong job
or lost.

## Suggested fix

Queue the job until a worker frees up (back-pressure) instead of returning a busy worker; or pick a genuinely
idle worker and block/await otherwise. Never hand out a worker whose status is not `idle`.

## Acceptance criteria

- [ ] When all workers are busy and at `maxWorkers`, jobs queue rather than being assigned to a busy worker.
- [ ] A worker is never assigned two concurrent jobs.
- [ ] Regression test saturates the pool and asserts no double-assignment.
