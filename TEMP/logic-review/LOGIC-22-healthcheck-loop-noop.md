# LOGIC-22 — `startHealthCheckLoop()` is a no-op → `autoHealthChecks` silently disabled

**Severity:** 🟡 Low
**Area:** Reliability / Agent lifecycle
**Stage:** 1 — Safety re-wiring
**Suggested labels:** `bug`, `severity:low`, `area:reliability`
**Location:** `core/agents/lifecycle/lifecycle-orchestrator.ts:1216-1220` (called from constructor `:250-252`)

## Problem

The method body never assigns `healthCheckTimer` or calls `setInterval`. A repo-wide search shows no other
place starts it — the comment claims it is started lazily in `registerAgent`, but `registerAgent` does not
start it either. So when `autoHealthChecks` is enabled, periodic health checks (and the auto-suspend /
auto-pause-on-risk logic at `:740-782`, which only runs from `performHealthCheck`) never fire automatically.

## Evidence

```ts
private startHealthCheckLoop(): void {
  if (this.healthCheckTimer !== null) return;
  // We defer starting the timer to avoid running it in unit tests unless explicitly needed.
  // The timer is started lazily on the first registerAgent() call in a non-test environment.
}
```

## Impact

Operators relying on `autoHealthChecks` get no automatic anomaly detection or auto-suspend/pause on
critical risk scores — the safety automation is silently disabled unless health checks are invoked
manually.

## Suggested fix

Actually start the interval (guarded by the existing null check), and ensure `shutdown()` clears it (it
already does):

```ts
this.healthCheckTimer = setInterval(
  () => { void this.runAllHealthChecks(); },
  this.config.healthCheckIntervalMs
);
```

Consider an env guard to keep it off in unit tests if needed.

## Acceptance criteria

- [ ] When `autoHealthChecks` is enabled, the health-check interval runs.
- [ ] `shutdown()` clears the timer (no leak / open handle in tests).
- [ ] Test (fake timers) asserting `performHealthCheck` runs on the configured interval.
