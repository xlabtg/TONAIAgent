# LOGIC-09 — `triggerNow()` orphans the scheduled timer → double execution + leak

**Severity:** 🔴 High
**Area:** Reliability / Runtime
**Stage:** 5 — Runtime hygiene
**Suggested labels:** `bug`, `severity:high`, `area:reliability`
**Location:** `core/runtime/agent-scheduler.ts:312-318`, `:382-398`, `:450-453` (also `resumeAgent` at `:266`)

## Problem

`scheduleNextRun` assigns `scheduled.timerId` **without first clearing any existing timer**. `triggerNow`
invokes `executeAgent`, whose `finally` block calls `scheduleNextRun`, overwriting `timerId` while the
*original* scheduled `setTimeout` is still armed. The reference to the original timer is lost, so it is
neither cleared nor tracked — it still fires and runs an extra cycle.

## Evidence

```ts
async triggerNow(agentId: string): Promise<boolean> {
  const callback = this.executionCallbacks.get(agentId);
  if (!callback) return false;
  await this.executeAgent(agentId);   // does NOT clear the already-armed interval timer
  return true;
}

private scheduleNextRun(agentId: string): void {
  const scheduled = this.scheduledAgents.get(agentId);
  if (!scheduled || !this.running) return;
  ...
  scheduled.timerId = setTimeout(() => {   // overwrites timerId without clearing the old one
    void this.executeAgent(agentId);
  }, delay);
}
```

## Impact

Calling `triggerNow` on a scheduled agent yields an orphaned timer that fires an unscheduled extra
execution (double execution) and leaks until it fires. For a trading agent this can mean an extra,
unintended trade cycle.

## Suggested fix

At the top of `scheduleNextRun`, clear any existing handle first:

```ts
if (scheduled.timerId) clearTimeout(scheduled.timerId);
```

Have `triggerNow` / `resumeAgent` clear and reschedule deterministically.

## Acceptance criteria

- [ ] `scheduleNextRun` clears the previous timer before arming a new one.
- [ ] `triggerNow` on a scheduled agent results in exactly one extra execution, no orphaned timer.
- [ ] Test using fake timers asserting no double execution after `triggerNow`.
