# Task: Persist Circuit Breaker State Across Restarts

**Priority:** 🟡 MEDIUM
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §8)
**Suggested labels:** `observability`, `reliability`, `circuit-breaker`

## Problem

`TradingCircuitBreaker` keeps state (tripped / warning / ok, counts, timestamps) in memory. After a process restart:

- A breaker that tripped just before the restart comes back in the "ok" state.
- Historical data is lost — post-incident analysis becomes guesswork.
- During a rolling deploy of N replicas, each replica has independent state — they disagree on whether the breaker is tripped.

For an emergency-stop primitive, that behaviour is dangerous.

## Acceptance Criteria

- [ ] Add a persistence layer for breaker state (`BreakerStateStore`) with `load`, `save`, `subscribe` (pub/sub for multi-replica).
- [ ] Implement at least a Redis-backed store (state saved on every transition, pub/sub on change).
- [ ] Make persistence configurable; keep `MemoryStateStore` for tests only.
- [ ] On process start, the breaker loads persisted state before accepting any trading traffic.
- [ ] Multi-replica behaviour: a trip on any replica propagates to all others within seconds via pub/sub.
- [ ] Keep a rolling history (e.g. last 100 transitions) for dashboarding.
- [ ] Tests:
  - Trip → restart → still tripped
  - Trip on replica A → replica B observes trip within 5s
  - Fail-closed when the store is unreachable at startup (don't accept traffic without known state)

## Implementation Notes

- Do not conflate "breaker tripped" with "emergency controller engaged" — the breaker triggers the emergency path, but the emergency latch itself is a separate persistent fact.
- State transitions should also be emitted as metrics (see [`12-metrics-wiring.md`](./12-metrics-wiring.md)).

## Files to Create/Modify

- `services/observability/breaker-state-store.ts` (new)
- `services/observability/breaker-state-redis.ts` (new)
- `services/observability/circuit-breaker.ts` — accept a `BreakerStateStore`
- `tests/observability/breaker-persistence.test.ts`
- `docs/monitoring-runbook.md` — persistence ops notes

## References

- Re-audit report §8: Monitoring & Incident Response
- PR #316 (merged)
