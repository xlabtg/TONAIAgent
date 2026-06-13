# LOGIC-49 — Runtime telemetry double-counts each agent cycle (explicit recordEvent + forwarded loop event)

**Severity:** 🟠 Medium
**Area:** Reliability
**Stage:** Stage 5 — Runtime reliability & resource hygiene
**Suggested labels:** `bug`, `severity:medium`, `area:reliability`, `stage:5-runtime-hygiene`, `audit:logic-review-v2`
**Location:** `core/runtime/agent-manager.ts:587-599 & 693-696 (events from core/runtime/execution-loop.ts:437,504,542)`
**Filed as:** [#459](https://github.com/xlabtg/TONAIAgent/issues/459)

## Problem

Each agent cycle is recorded to the monitor twice. `executeAgentCycle()` explicitly calls
`this.monitor.recordEvent({ type: cycle.completed | cycle.failed, ... })`. Separately, the manager subscribes to
the execution loop (`this.executionLoop.subscribe(event => { this.forwardEvent(event); this.monitor.recordEvent(event); })`),
and the execution loop already emits `cycle.completed` / `cycle.failed` for the same cycle. The monitor thus
receives two events per cycle.

## Evidence

```ts
// explicit, in executeAgentCycle:
this.monitor.recordEvent({ type: result.success ? 'cycle.completed' : 'cycle.failed', ... });

// and again via the loop subscription:
this.executionLoop.subscribe((event) => {
  this.forwardEvent(event);
  this.monitor.recordEvent(event);     // execution-loop already emits cycle.completed/failed
});
```

## Impact

Cycle counts, success/failure rates and any metric derived from these events are inflated ~2×. Dashboards,
alert thresholds, and health/auto-pause logic that count cycle events are driven by wrong numbers.

## Suggested fix

Record the cycle once: either drop the explicit `recordEvent` in `executeAgentCycle` and rely on the forwarded
loop event, or stop forwarding cycle events to the monitor and keep the explicit call. Ensure exactly one path
records each cycle event.

## Acceptance criteria

- [ ] Exactly one monitor event is recorded per completed/failed cycle.
- [ ] Regression test runs one cycle and asserts a single `cycle.completed` (or `cycle.failed`) is recorded.
