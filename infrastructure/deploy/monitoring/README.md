# TON AI Agent - Monitoring Stack

Production-grade observability for TON AI Agent using Prometheus and Grafana.

## Quick Start

### Docker Compose

```bash
cd deploy/monitoring
docker compose up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Alertmanager: http://localhost:9093

### Kubernetes

```bash
# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f kubernetes/prometheus-values.yaml
```

## Components

### Prometheus

Metrics collection and alerting.

**Configuration:**
- `prometheus/prometheus.yml` - Scrape configuration
- `prometheus/alerts/*.yml` - Alert rules

**Scrape Targets:**
- TON AI Agent application
- Workers
- PostgreSQL (via postgres-exporter)
- Redis (via redis-exporter)
- Node metrics (via node-exporter)

### Grafana

Visualization and dashboards.

**Dashboards:**
- TON AI Agent Overview
- AI Provider Performance
- TON Network Health
- Infrastructure

**Provisioning:**
- `grafana/provisioning/datasources/` - Data sources
- `grafana/provisioning/dashboards/` - Dashboard providers
- `grafana/dashboards/` - Dashboard JSON files

### Alertmanager

Alert routing and notifications.

**Notification Channels:**
- Slack
- Email
- PagerDuty
- Telegram

## Alert Rules

### Application Alerts

| Alert | Severity | Description |
|-------|----------|-------------|
| TONAIAgentDown | critical | Application unreachable |
| TONAIAgentHighErrorRate | warning | Error rate > 5% |
| TONAIAgentHighLatency | warning | P95 latency > 2s |
| TONAIAgentHighCPU | warning | CPU > 80% for 10m |
| TONAIAgentHighMemory | warning | Memory > 1.5GB |

### Infrastructure Alerts

| Alert | Severity | Description |
|-------|----------|-------------|
| PostgreSQLDown | critical | Database unreachable |
| PostgreSQLHighConnections | warning | Connections > 80% |
| RedisDown | critical | Cache unreachable |
| RedisHighMemory | warning | Memory > 90% |

## Metrics Exposed

The TON AI Agent application exposes these metrics:

### HTTP Metrics

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_in_progress` - Current active requests

### AI Provider Metrics

- `tonaiagent_ai_requests_total` - AI requests by provider
- `tonaiagent_ai_request_duration_seconds` - AI request latency
- `tonaiagent_ai_tokens_used_total` - Token usage

### TON Network Metrics

- `tonaiagent_ton_rpc_requests_total` - RPC requests
- `tonaiagent_ton_rpc_errors_total` - RPC errors
- `tonaiagent_ton_rpc_duration_seconds` - RPC latency

### Strategy Metrics

- `tonaiagent_strategies_total` - Total strategies
- `tonaiagent_strategy_executions_total` - Executions
- `tonaiagent_strategy_execution_duration_seconds` - Execution time

### Worker Metrics

- `tonaiagent_job_queue_length` - Pending jobs
- `tonaiagent_jobs_processed_total` - Processed jobs
- `tonaiagent_job_processing_duration_seconds` - Job duration

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROMETHEUS_URL` | Prometheus URL | http://prometheus:9090 |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | admin |
| `ALERTMANAGER_SLACK_URL` | Slack webhook URL | - |

### Grafana Configuration

Edit `grafana/grafana.ini` for custom settings:

```ini
[server]
root_url = https://grafana.example.com

[auth.generic_oauth]
enabled = true
name = OAuth
...
```

## Scaling

### Prometheus High Availability

For production, run Prometheus in HA mode:

```yaml
# prometheus-ha.yml
global:
  external_labels:
    cluster: production
    replica: $(POD_NAME)
```

Use Thanos or Cortex for long-term storage and global view.

### Grafana High Availability

Use external database (PostgreSQL/MySQL) for HA:

```ini
[database]
type = postgres
host = postgres:5432
name = grafana
user = grafana
password = ${GF_DATABASE_PASSWORD}
```

## Troubleshooting

### Prometheus not scraping targets

```bash
# Check target status
curl http://localhost:9090/api/v1/targets

# Check for errors
docker logs prometheus
```

### Grafana dashboards not loading

```bash
# Check provisioning
docker exec grafana grafana-cli plugins ls

# Check datasource
curl -u admin:admin http://localhost:3001/api/datasources
```

### Alerts not firing

```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check alertmanager
curl http://localhost:9093/api/v1/status
```

## Support

- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
