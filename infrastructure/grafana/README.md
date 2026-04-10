# TONAIAgent — Grafana Dashboard Templates

This directory contains Grafana dashboard JSON templates for operating TONAIAgent in production.
Import them via **Grafana → Dashboards → Import → Upload JSON file**.

## Dashboards

| File | UID | Description |
|------|-----|-------------|
| `agent-overview.json` | `tonai-agent-overview` | Real-time agent status, circuit-breaker state, error rates |
| `trading-performance.json` | `tonai-trading-performance` | PnL, success rate, slippage, drawdown |
| `system-health.json` | `tonai-system-health` | API latency, error rates, memory, emergency events |

## Prerequisites

- Grafana ≥ 10.0
- Prometheus data source configured (label it `DS_PROMETHEUS` during import)
- TONAIAgent exposing a `/metrics` endpoint in Prometheus exposition format

## Metric Names

All dashboards query the `tonaiagent_*` metric namespace.
Key metrics to expose from the application:

| Metric | Type | Description |
|--------|------|-------------|
| `tonaiagent_agents_active_total` | Gauge | Number of currently active agents |
| `tonaiagent_agent_errors_total` | Counter | Agent-level error count |
| `tonaiagent_agent_requests_total` | Counter | Agent-level request count |
| `tonaiagent_circuit_breaker_tripped` | Gauge | 1 if circuit breaker is open, 0 if closed |
| `tonaiagent_circuit_breaker_trips_total` | Counter | Total trips, labelled by `reason` |
| `tonaiagent_portfolio_drawdown_pct` | Gauge | Current portfolio drawdown % |
| `tonaiagent_portfolio_value_usd` | Gauge | Portfolio value in USD |
| `tonaiagent_portfolio_pnl_usd` | Gauge | Cumulative PnL in USD |
| `tonaiagent_trades_total` | Counter | Total trades |
| `tonaiagent_trades_success_total` | Counter | Successful trades |
| `tonaiagent_trade_execution_ms` | Histogram | Trade execution latency |
| `tonaiagent_trade_slippage_bps` | Histogram | Trade slippage in basis points |
| `tonaiagent_api_request_duration_ms` | Histogram | API endpoint latency |
| `tonaiagent_errors_total` | Counter | Total application errors, labelled by `error_type` |
| `tonaiagent_key_management_errors_total` | Counter | Key management errors |
| `tonaiagent_active_emergencies_total` | Gauge | Active emergency events |
| `tonaiagent_kill_switch_active` | Gauge | 1 if kill switch is active |
| `tonaiagent_emergency_events_total` | Counter | Emergency events, labelled by `type` |
| `tonaiagent_system_healthy` | Gauge | 2=healthy, 1=degraded, 0=unhealthy |
| `tonaiagent_agent_status` | Gauge | Per-agent status, labelled by `agent_id` and `status` |
| `process_resident_memory_bytes` | Gauge | RSS memory (Node.js standard) |
| `process_heap_bytes` | Gauge | Heap memory (Node.js standard) |
| `process_uptime_seconds` | Counter | Process uptime (Node.js standard) |

## Alert Rules (Prometheus Alertmanager)

Recommended alert rules to pair with these dashboards:

```yaml
groups:
  - name: tonaiagent
    rules:
      - alert: AgentErrorRateCritical
        expr: rate(tonaiagent_agent_errors_total[5m]) / rate(tonaiagent_agent_requests_total[5m]) > 0.20
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Agent error rate critical (> 20%)"

      - alert: PortfolioDrawdownCritical
        expr: tonaiagent_portfolio_drawdown_pct < -20
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Portfolio drawdown exceeds -20%"

      - alert: CircuitBreakerOpen
        expr: tonaiagent_circuit_breaker_tripped == 1
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open — trading halted"

      - alert: KeyManagementError
        expr: increase(tonaiagent_key_management_errors_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Key management error detected"

      - alert: ApiLatencyHigh
        expr: histogram_quantile(0.99, rate(tonaiagent_api_request_duration_ms_bucket[5m])) > 5000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API p99 latency exceeds 5 s"
```
