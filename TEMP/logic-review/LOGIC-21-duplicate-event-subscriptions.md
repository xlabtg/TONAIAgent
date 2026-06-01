# LOGIC-21 — Event jobs subscribed twice (per-topic + global `*`) → latent double-trigger

**Severity:** 🟡 Low
**Area:** Reliability / Distributed scheduler
**Stage:** 5 — Runtime hygiene
**Suggested labels:** `bug`, `severity:low`, `area:reliability`
**Location:** `services/distributed-scheduler/scheduler.ts:297-301`, `:421-433`; dispatch `event-bus.ts:101-111`

## Problem

Every event/hybrid job matches two subscriptions for the same event: its own per-topic subscription and
the global `'*'` subscription whose `onBusEvent` (`:795-805`) re-scans all jobs and triggers matching ones.
In practice the duplicate is currently suppressed because `triggerJob` flips `job.status` to `'running'`
synchronously and both callbacks guard on `status === 'pending'` — but this dedup depends entirely on
dispatch ordering and the synchronous status flip.

## Evidence

```ts
// constructor:
this.eventBus.subscribe('*', (event) => { this.onBusEvent(event); });
...
// registerJob, for event/hybrid jobs:
for (const topic of input.triggerTopics) {
  this.eventBus.subscribe(topic, (event) => {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') { void this.triggerJob(job, 'event', event); }
  });
}
```

## Impact

Latent double-trigger risk: any change making the trigger asynchronous, or an event arriving while a retry
has momentarily reset the job to `pending`, reintroduces a genuine duplicate execution. The redundant
`onBusEvent` scan is also O(jobs) wasted work per event.

## Suggested fix

Pick one routing path: either drop the per-topic subscriptions and rely solely on `onBusEvent`, or drop
the global `'*'` subscription for job triggering. Alternatively add an explicit per-event idempotency guard
keyed by `(jobId, eventId)`.

## Acceptance criteria

- [ ] Each event triggers a matching job at most once via a single routing path (or an explicit idempotency guard).
- [ ] No O(jobs) rescan on every event when per-topic routing is used.
- [ ] Test asserting a single execution per event even under retry/status churn.
