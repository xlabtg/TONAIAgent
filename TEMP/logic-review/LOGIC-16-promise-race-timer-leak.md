# LOGIC-16 — `Promise.race` execution timeout leaks a live timer every cycle

**Severity:** 🟠 Medium
**Area:** Reliability / Runtime
**Stage:** 5 — Runtime hygiene
**Suggested labels:** `bug`, `severity:medium`, `area:reliability`
**Location:** `core/runtime/agent-scheduler.ts:421-428`, `core/runtime/execution-loop.ts:611-624`

## Problem

The timeout `setTimeout` handle is never captured and never cleared. When `callback()` (or the strategy
promise) wins the race, the timeout timer remains pending until `executionTimeoutMs` elapses, holding its
closure alive. Same pattern in `executeStrategy` with `strategyTimeoutMs`.

## Evidence

```ts
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(
    () => reject(new Error('Execution timeout')),
    this.config.executionTimeoutMs
  );
});
await Promise.race([callback(), timeoutPromise]);   // winner never clears the timeout
```

## Impact

Under steady operation (e.g. agents on 1s intervals with a 30s timeout), dozens of dangling timers per
agent accumulate, retaining closures, keeping the event loop busy, and preventing clean shutdown — a
continual minor leak that scales with agent count and cycle frequency.

## Suggested fix

Capture the timer id and `clearTimeout` it in a `finally`, or reuse the existing correct `withTimeout`
helper (`core/runtime/worker-pool.ts:275`) which clears the timer on settle.

## Acceptance criteria

- [ ] Timeout timer is cleared when the work promise settles first.
- [ ] No growth in active timer count over repeated fast cycles (verifiable with fake timers).
