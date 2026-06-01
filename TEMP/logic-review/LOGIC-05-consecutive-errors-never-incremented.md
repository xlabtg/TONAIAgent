# LOGIC-05 — `consecutiveErrors` never incremented → agents never auto-fail/pause

**Severity:** 🔴 High
**Area:** Reliability / Runtime
**Stage:** 1 — Safety re-wiring
**Suggested labels:** `bug`, `severity:high`, `area:reliability`
**Location:** `core/runtime/agent-manager.ts:569-578` and `:603-609`

## Problem

On a failed cycle the code reads `consecutiveErrors` and compares it to 5 **before** anything increments
it. The comment says "Increment consecutive errors" but no increment happens. A repo-wide search shows
`consecutiveErrors++` occurs in exactly one place — inside `AgentStateManager.setAgentError`
(`core/runtime/agent-state.ts:203`), i.e. only *after* the agent is already being moved to ERROR.
`resetErrors()` (called on every success) keeps it at 0. So the counter never climbs to the threshold via
normal cycle failures.

## Evidence

```ts
} else {
  // Increment consecutive errors
  const currentState = this.stateManager.requireAgent(agentId);

  // Check if we should transition to ERROR state
  if (currentState.consecutiveErrors >= 5) {        // always 0 here
    this.stateManager.setAgentError(agentId, result.error ?? 'Too many consecutive errors');
    this.scheduler.pauseAgent(agentId);
  }
}
```

## Impact

An agent that fails every cycle (market-data outage, repeatedly failing strategy/trade) is never moved to
ERROR and never paused — it burns cycles forever. Because the counter stays 0, the related alert in
`runtime-monitor.ts:489` (`state.consecutiveErrors >= maxConsecutiveErrors`) is also dead code.

## Suggested fix

Add `AgentStateManager.incrementConsecutiveErrors(agentId)` and call it in both the `else` branch
(`~:571`) and the `catch` block (`~:604`) **before** the `>= 5` comparison.

## Acceptance criteria

- [ ] `consecutiveErrors` increments on every failed cycle.
- [ ] After 5 consecutive failures the agent transitions to ERROR and is paused.
- [ ] A successful cycle still resets the counter.
- [ ] Regression test driving 5 failing cycles and asserting ERROR + pause.
