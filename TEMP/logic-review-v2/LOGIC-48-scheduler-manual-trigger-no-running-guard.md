# LOGIC-48 — triggerJobManually has no running-state guard → concurrent double execution

**Severity:** 🟠 Medium
**Area:** Reliability
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:medium`, `area:reliability`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `services/distributed-scheduler/scheduler.ts:561-567`
**Filed as:** [#458](https://github.com/xlabtg/TONAIAgent/issues/458)

## Problem

`triggerJobManually()` dispatches a job for immediate execution without checking whether that job is already
running. A manual trigger fired while a scheduled (or prior manual) run is in flight executes the same job
concurrently.

## Evidence

```ts
// no check that the job isn't already executing before dispatching:
async triggerJobManually(jobId: string): Promise<...> {
  const job = ...;
  // dispatches immediately regardless of in-flight status
}
```

## Impact

A job with side effects (placing trades, sending payments, rebalancing) can run twice simultaneously,
duplicating its effects — and non-reentrant jobs may corrupt shared state.

## Suggested fix

Guard on the job's running state: refuse (or queue) a manual trigger when the job is already executing, mirroring
the scheduler's normal concurrency control.

## Acceptance criteria

- [ ] A manual trigger for an already-running job is rejected or queued, not run concurrently.
- [ ] Regression test triggers a long-running job twice and asserts a single concurrent execution.
