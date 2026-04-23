# TONAIAgent — Prometheus Metrics Reference

All metrics are exposed at `GET /metrics` in the [Prometheus text format](https://prometheus.io/docs/instrumenting/exposition_formats/).

The registry is defined in `core/observability/metrics.ts`.

---

## Cardinality Rules

- `agent_id` labels are only used on low-volume counters (agent errors, requests). Never use per-agent labels on high-frequency trade counters.
- `status`, `result`, `severity`, `reason` labels are bounded enums. No free-form strings.
- HSM `provider` and `operation` labels must come from a known set (e.g. `aws_cloudhsm`, `sign`, `verify`).
- Histogram buckets are aligned to the alerting thresholds in `docs/monitoring-runbook.md`.

---

## Agent Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tonaiagent_agents_active_total` | Gauge | — | Number of currently active trading agents |
| `tonaiagent_agent_errors_total` | Counter | `agent_id` | Total agent errors |
| `tonaiagent_agent_requests_total` | Counter | `agent_id`, `status` | Total agent execution requests |

---

## Circuit Breaker Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tonaiagent_circuit_breaker_tripped` | Gauge | — | 1 when the circuit breaker is currently tripped, 0 otherwise |
| `tonaiagent_circuit_breaker_trips_total` | Counter | `reason`, `severity` | Total circuit-breaker trips |

### `reason` label values

`agent_error_rate_warning`, `agent_error_rate_critical`, `portfolio_drawdown_warning`, `portfolio_drawdown_critical`, `trade_volume_warning`, `trade_volume_critical`, `key_management_error`, `api_latency_warning`, `api_latency_critical`

### `severity` label values

`warning`, `critical`

---

## Portfolio Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tonaiagent_portfolio_drawdown_ratio` | Gauge | — | Current drawdown as a ratio (0 = no drawdown, 1 = 100% loss) |
| `tonaiagent_portfolio_value_usd` | Gauge | — | Current portfolio value in USD |
| `tonaiagent_portfolio_pnl_usd` | Gauge | — | Unrealised portfolio PnL in USD |

---

## Trade Metrics

| Metric | Type | Labels | Buckets | Description |
|--------|------|--------|---------|-------------|
| `tonaiagent_trade_volume_total` | Counter | — | — | Cumulative trade volume in USD |
| `tonaiagent_trades_total` | Counter | `status` | — | Total trade executions |
| `tonaiagent_trade_latency_seconds` | Histogram | — | 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10 | Trade execution latency in seconds |
| `tonaiagent_trade_slippage_bps` | Histogram | — | 1, 5, 10, 25, 50, 100, 250, 500 | Trade slippage in basis points |

### `status` label values for `tonaiagent_trades_total`

`completed`, `partially_completed`, `failed`

---

## KYC / AML Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tonaiagent_kyc_decision_total` | Counter | `result` | Total KYC/AML decisions |

### `result` label values

`approved`, `rejected`, `pending`, `escalated`

---

## Key Management / MPC / HSM Metrics

| Metric | Type | Labels | Buckets | Description |
|--------|------|--------|---------|-------------|
| `tonaiagent_mpc_sign_duration_seconds` | Histogram | — | 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5 | Duration of MPC signing operations |
| `tonaiagent_hsm_operation_total` | Counter | `provider`, `operation`, `status` | — | Total HSM operations |
| `tonaiagent_key_management_errors_total` | Counter | — | — | Total key-management errors |

### `provider` label values

`aws_cloudhsm`, `azure_dedicated_hsm`, `thales`, `local`

### `operation` label values

`sign`, `verify`, `generate`, `import`, `export`, `delete`

---

## API / System Metrics

| Metric | Type | Labels | Buckets | Description |
|--------|------|--------|---------|-------------|
| `tonaiagent_api_request_duration_ms` | Histogram | `method`, `route`, `status_code` | 10, 50, 100, 250, 500, 1000, 2000, 5000 | HTTP API request duration in milliseconds |
| `tonaiagent_errors_total` | Counter | `error_type` | — | Total application errors |

---

## Emergency / Safety Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tonaiagent_active_emergencies_total` | Gauge | — | Number of currently active emergency events |
| `tonaiagent_kill_switch_active` | Gauge | — | 1 when the global kill switch is active, 0 otherwise |
| `tonaiagent_emergency_events_total` | Counter | `type` | Total emergency events |
| `tonaiagent_system_healthy` | Gauge | — | 2 = healthy, 1 = degraded, 0 = unhealthy |

### `type` label values for `tonaiagent_emergency_events_total`

`anomaly_detected`, `risk_limit_breach`, `suspicious_activity`, `security_breach`, `system_failure`

---

## Default Node.js Metrics

Standard `prom-client` default metrics are also collected, including:

- `process_resident_memory_bytes`
- `process_heap_bytes`
- `process_cpu_seconds_total`
- `nodejs_eventloop_lag_seconds`
- `nodejs_gc_duration_seconds`

---

## Grafana Dashboards

The dashboards in `infrastructure/grafana/` reference these metrics. After adding `prom-client` scraping in your Prometheus config, the dashboards will render with live data without any further changes.

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: tonaiagent
    static_configs:
      - targets: ['api:3000']
    metrics_path: /metrics
```
