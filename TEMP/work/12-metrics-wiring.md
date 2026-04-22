# Task: Wire `CircuitBreakerMetrics` and Add Prometheus Exporter

**Priority:** 🟡 MEDIUM
**Effort:** ~1 week
**Related Issue:** #325 (re-audit finding §8)
**Suggested labels:** `observability`, `metrics`, `prometheus`, `integration`

## Problem

PR #316 delivered the `TradingCircuitBreaker`, `AlertingManager`, three Grafana dashboards (referencing `tonaiagent_*` metrics), and runbooks. But:

- `CircuitBreakerMetrics` must be constructed and passed in by the caller — nothing in the codebase currently collects live trading metrics and feeds them to the breaker.
- The Grafana dashboards expect `tonaiagent_*` metrics at a Prometheus scrape endpoint, but there is no `/metrics` exporter.
- Breaker state is in-memory only — see related [`15-circuit-breaker-persistence.md`](./15-circuit-breaker-persistence.md).

## Acceptance Criteria

- [ ] Add `prom-client` as a dependency and create a central metrics registry (`core/observability/metrics.ts`).
- [ ] Emit the metrics referenced by the dashboards:
  - `tonaiagent_agent_error_rate`
  - `tonaiagent_portfolio_drawdown_ratio`
  - `tonaiagent_trade_volume_total`
  - `tonaiagent_trade_latency_seconds`
  - `tonaiagent_kyc_decision_total{result}`
  - `tonaiagent_mpc_sign_duration_seconds`
  - `tonaiagent_hsm_operation_total{provider,operation,status}`
  - …and any others the dashboards reference.
- [ ] Wire `CircuitBreakerMetrics` construction into the trade-execution path so every trade updates the error rate + volume + latency.
- [ ] Expose `/metrics` in the HTTP server (see [`08-http-server-wiring.md`](./08-http-server-wiring.md)) using `register.metrics()`.
- [ ] Verify each dashboard renders with live data in a staging environment.
- [ ] Add integration tests that scrape `/metrics` and assert expected metric names/labels.
- [ ] Add `docs/metrics.md` listing every metric, its labels, and cardinality bounds.

## Implementation Notes

- Keep cardinality low — label values must be bounded (status codes, agent IDs capped, tier names).
- Use histogram buckets that match the alerting thresholds in `docs/monitoring-runbook.md`.
- For agent-scoped metrics, consider whether you want per-agent labels (high cardinality) or aggregate only.

## Files to Create/Modify

- `core/observability/metrics.ts` (new)
- `core/observability/prometheus-exporter.ts` (new)
- `services/observability/circuit-breaker.ts` — consume the new registry
- `core/trading/live/execution-engine.ts` — emit metrics on every trade
- `apps/api/**` — expose `/metrics`
- `docs/metrics.md`
- `tests/observability/metrics.test.ts`

## References

- Re-audit report §8: Monitoring & Incident Response
- PR #316 (merged)
- [prom-client](https://github.com/siimon/prom-client)
- Existing dashboards in `infrastructure/grafana/`
