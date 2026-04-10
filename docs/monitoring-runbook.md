# TONAIAgent — Monitoring Runbook

Operational guide for running, configuring, and maintaining the TONAIAgent
monitoring stack in production.

**Audience:** DevOps engineers and platform operators.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Alert Thresholds Reference](#2-alert-thresholds-reference)
3. [Circuit Breaker Operation](#3-circuit-breaker-operation)
4. [Alerting Channels](#4-alerting-channels)
5. [Grafana Dashboards](#5-grafana-dashboards)
6. [Routine Checks](#6-routine-checks)
7. [Configuration Reference](#7-configuration-reference)
8. [Emergency Admin Commands](#8-emergency-admin-commands)
9. [Health Check Endpoints](#9-health-check-endpoints)
10. [Log Reference](#10-log-reference)

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        TONAIAgent                              │
│                                                                │
│  ┌──────────────┐   metrics    ┌──────────────────────────┐   │
│  │ Trading      │ ──────────► │ MetricsCollector          │   │
│  │ Agents       │             │ (observability/metrics)   │   │
│  └──────────────┘             └──────────┬───────────────┘   │
│                                          │                     │
│                                ┌─────────▼──────────────┐     │
│                                │ TradingCircuitBreaker  │     │
│                                │ (observability/        │     │
│                                │  circuit-breaker)      │     │
│                                └──────┬─────────────────┘     │
│                                       │ trip events            │
│                      ┌────────────────▼──────────────────┐    │
│                      │ EmergencyController               │    │
│                      │ (core/security/emergency)         │    │
│                      │ • pauseAgent()                    │    │
│                      │ • pauseAllAgents()                │    │
│                      │ • activateKillSwitch()            │    │
│                      └────────────────┬──────────────────┘    │
│                                       │                        │
│                      ┌────────────────▼──────────────────┐    │
│                      │ AlertingManager                   │    │
│                      │ (observability/alerting)          │    │
│                      │ • Console                         │    │
│                      │ • Telegram                        │    │
│                      │ • PagerDuty                       │    │
│                      │ • OpsGenie                        │    │
│                      │ • Webhooks                        │    │
│                      └───────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
         │ /metrics (Prometheus)
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Prometheus    │────►│     Grafana      │
└─────────────────┘     └─────────────────┘
```

### Module Summary

| Module | File | Responsibility |
|--------|------|----------------|
| Circuit Breaker | `services/observability/circuit-breaker.ts` | Evaluate metrics, trip on threshold breach, invoke EmergencyController |
| Multi-Channel Alerting | `services/observability/alerting.ts` | Route alerts to Telegram / PagerDuty / OpsGenie / Webhook |
| Alert Detection | `services/alerts/alerts.ts` | Detect drawdown, failure spikes, slippage anomalies |
| Production Monitor | `services/monitoring/production.ts` | Aggregate health check + anomaly detection HTTP endpoints |
| Emergency Controller | `core/security/emergency.ts` | Pause agents, activate kill switch, manage emergencies |
| Audit | `core/security/audit.ts` | Immutable event log for forensics |

---

## 2. Alert Thresholds Reference

All thresholds are configurable via `CircuitBreakerThresholds` and `AlertThresholds`.

### Circuit Breaker Thresholds

| Metric | Warning | Critical | Emergency Action |
|--------|---------|----------|-----------------|
| Agent error rate | > 5% / window | > 20% / window | Pause affected agents |
| Portfolio drawdown | > -10% / 1 h | > -20% / 1 h | Stop all trading |
| Trade volume ratio | > 3× avg | > 10× avg | Flag + manual review |
| Key management errors | — | Any | Immediate stop |
| API latency p99 | > 2,000 ms | > 5,000 ms | Scale alert |

### Alert Service Thresholds (services/alerts)

| Threshold | Default | Description |
|-----------|---------|-------------|
| `maxDrawdownPct` | -5% | Drawdown below which a high-drawdown alert fires |
| `executionFailureSpike` | 5 | Failure count within window triggering spike alert |
| `failureWindowMs` | 60,000 ms | Rolling window for failure spike detection |
| `apiErrorSpike` | 10 | API error count within window triggering spike alert |
| `apiErrorWindowMs` | 60,000 ms | Rolling window for API error spike detection |
| `minWinRatePct` | 10% | Win rate below which abnormal-behaviour alert fires |
| `maxAvgSlippageBps` | 100 bps | Slippage above which high-slippage alert fires |

---

## 3. Circuit Breaker Operation

### How it works

1. On each evaluation cycle, `TradingCircuitBreaker.checkAndTrip(metrics)` is called
   with a `CircuitBreakerMetrics` snapshot.
2. If any metric breaches a **critical** threshold, the circuit breaker:
   - Emits a `CircuitTripEvent` to all subscribers.
   - Calls `EmergencyController.triggerEmergency()` with the appropriate `EmergencyType`.
3. The `EmergencyController` then pauses affected agents and emits its own events.
4. If any metric breaches only a **warning** threshold, a warning trip event is emitted
   but the emergency controller is **not** invoked.

### Wiring the circuit breaker (recommended integration pattern)

```typescript
import { createCircuitBreaker } from './services/observability/circuit-breaker';
import { createEmergencyController } from './core/security/emergency';
import { createAlertingManager } from './services/observability/alerting';
import { createAlertService } from './services/alerts';

// 1. Set up the emergency controller
const ec = createEmergencyController({ autoTriggerEnabled: true });

// 2. Set up the alerting manager (configure channels via env vars)
const alerting = createAlertingManager({
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
  },
  pagerDuty: {
    routingKey: process.env.PAGERDUTY_ROUTING_KEY!,
  },
  minSeverity: 'warning',
});

// 3. Set up the alert service (drawdown, slippage, etc.)
const alertSvc = createAlertService();
alertSvc.subscribe(async (alert) => {
  await alerting.send(alert);
});

// 4. Set up the circuit breaker
const cb = createCircuitBreaker(ec, {
  agentErrorRateWarning: 0.05,
  agentErrorRateCritical: 0.20,
  portfolioDrawdownWarning: -10,
  portfolioDrawdownCritical: -20,
});

// 5. Subscribe to circuit-breaker trip events for logging/alerting
cb.onTrip(async (trip) => {
  // Optionally send circuit-breaker trips to alerting channels too
  console.error('Circuit breaker trip:', trip);
});

// 6. In your monitoring loop (e.g. every 30 seconds):
setInterval(async () => {
  const metrics = await collectCurrentMetrics(); // your metric collection logic
  await cb.checkAndTrip(metrics);
}, 30_000);
```

### Manually tripping the circuit breaker

For testing or manual intervention:

```typescript
await ec.triggerEmergency('manual_trigger', 'operator-name', []);
```

### Resetting after a trip

The circuit breaker does **not** auto-reset. Agents must be resumed manually:

```typescript
const paused = ec.getPausedAgents();
for (const id of paused) {
  await ec.resumeAgent(id, 'Incident resolved by operator');
}
```

---

## 4. Alerting Channels

### 4.1 Console (always active)

All alerts are logged to the application's structured JSON logger at the
appropriate severity level. No configuration required.

### 4.2 Telegram

Best for small teams who want instant mobile notifications.

**Setup:**
1. Create a bot via [@BotFather](https://t.me/BotFather) and note the token.
2. Add the bot to your alert group/channel and obtain the chat ID.
3. Set environment variables:
   ```
   TELEGRAM_BOT_TOKEN=1234567890:ABC-xyz
   TELEGRAM_CHAT_ID=-1001234567890
   ```
4. Wire in code:
   ```typescript
   createAlertingManager({
     telegram: {
       botToken: process.env.TELEGRAM_BOT_TOKEN!,
       chatId: process.env.TELEGRAM_CHAT_ID!,
     },
   });
   ```

### 4.3 PagerDuty

Best for 24/7 on-call rotation with escalation policies.

**Setup:**
1. In PagerDuty, create a service → Integrations → Events API v2.
2. Copy the **Routing Key**.
3. Set environment variable:
   ```
   PAGERDUTY_ROUTING_KEY=<32-char-key>
   ```
4. Wire in code:
   ```typescript
   createAlertingManager({
     pagerDuty: { routingKey: process.env.PAGERDUTY_ROUTING_KEY! },
   });
   ```

Alert severity mapping: `info → info`, `warning → warning`, `critical → critical`.

### 4.4 OpsGenie

Best for teams already using Atlassian/OpsGenie.

**Setup:**
1. In OpsGenie, create a REST API Integration for your team.
2. Copy the **API key** and note your **team name**.
3. Set environment variables:
   ```
   OPSGENIE_API_KEY=<api-key>
   OPSGENIE_TEAM_NAME=platform-team
   ```
4. Wire in code:
   ```typescript
   createAlertingManager({
     opsGenie: {
       apiKey: process.env.OPSGENIE_API_KEY!,
       teamName: process.env.OPSGENIE_TEAM_NAME!,
     },
   });
   ```

Priority mapping: `info → P5`, `warning → P3`, `critical → P1`.

### 4.5 Generic Webhook

Send alerts to any HTTP endpoint (Slack incoming webhook, custom handler, etc.).

```typescript
createAlertingManager({
  webhooks: [
    {
      url: 'https://hooks.slack.com/services/T00/B00/xxx',
      headers: { 'X-Custom-Header': 'value' },
      minSeverity: 'critical', // only send critical alerts to this webhook
    },
  ],
});
```

---

## 5. Grafana Dashboards

Dashboard templates are in `infrastructure/grafana/`.

| Dashboard | File | Refresh |
|-----------|------|---------|
| Agent Overview | `agent-overview.json` | 30 s |
| Trading Performance | `trading-performance.json` | 1 min |
| System Health | `system-health.json` | 15 s |

### Import procedure

1. Open Grafana → Dashboards → Import.
2. Upload the JSON file.
3. Select the Prometheus data source when prompted.
4. Click **Import**.

See `infrastructure/grafana/README.md` for the full metric list and example
Prometheus alert rules.

---

## 6. Routine Checks

### Daily

- [ ] Review Grafana → Agent Overview for any persistent warnings.
- [ ] Check error rate trend over the past 24 hours.
- [ ] Confirm all expected agents are active.
- [ ] Verify no key management errors in the last 24 hours.

### Weekly

- [ ] Review trading performance dashboard — PnL, slippage, drawdown trend.
- [ ] Check alert history for any patterns:
  ```typescript
  const alertSvc = createAlertService();
  const history = alertSvc.getHistory();
  ```
- [ ] Confirm circuit-breaker trip count is low or zero.
- [ ] Review and rotate API keys if approaching expiry.

### Monthly

- [ ] Run the incident response flow end-to-end in staging:
  1. Inject a high error rate artificially.
  2. Verify circuit breaker trips.
  3. Verify agents are paused.
  4. Verify alerts reach all configured channels.
  5. Resume agents and confirm recovery.
- [ ] Update alert thresholds based on observed baseline metrics.
- [ ] Review on-call rotation and update contact list.
- [ ] Archive resolved post-mortems.

---

## 7. Configuration Reference

### Circuit Breaker

```typescript
import { createCircuitBreaker, DEFAULT_CIRCUIT_BREAKER_THRESHOLDS } from
  './services/observability/circuit-breaker';

const cb = createCircuitBreaker(emergencyController, {
  // Agent error rate (0–1)
  agentErrorRateWarning: 0.05,   // 5%
  agentErrorRateCritical: 0.20,  // 20%

  // Portfolio drawdown %  (negative — lower is worse)
  portfolioDrawdownWarning: -10,
  portfolioDrawdownCritical: -20,

  // Trade volume multiplier vs rolling average
  tradeVolumeWarning: 3,
  tradeVolumeCritical: 10,

  // API latency p99 (ms)
  apiLatencyWarningMs: 2_000,
  apiLatencyCriticalMs: 5_000,
});
```

### Alert Service

```typescript
import { createAlertService } from './services/alerts';

const alerts = createAlertService({
  maxDrawdownPct: -5,
  executionFailureSpike: 5,
  failureWindowMs: 60_000,
  apiErrorSpike: 10,
  apiErrorWindowMs: 60_000,
  minWinRatePct: 10,
  maxAvgSlippageBps: 100,
});
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | If using Telegram | Bot API token |
| `TELEGRAM_CHAT_ID` | If using Telegram | Target chat/group/channel ID |
| `PAGERDUTY_ROUTING_KEY` | If using PagerDuty | Events v2 routing key |
| `OPSGENIE_API_KEY` | If using OpsGenie | REST API integration key |
| `OPSGENIE_TEAM_NAME` | If using OpsGenie | OpsGenie team name |
| `LOG_LEVEL` | No (default: info) | Minimum log level to emit |

---

## 8. Emergency Admin Commands

### Via TypeScript (service layer)

```typescript
import { createEmergencyController } from './core/security/emergency';

const ec = createEmergencyController();

// Pause a specific agent
await ec.pauseAgent('agent_001', 'reason');

// Resume a specific agent
await ec.resumeAgent('agent_001', 'reason');

// Pause ALL agents immediately
await ec.pauseAllAgents('reason');

// Get list of paused agents
const paused = ec.getPausedAgents();

// Activate kill switch (blocks all transactions)
await ec.activateKillSwitch('reason', 'operator-name');

// Deactivate kill switch
await ec.deactivateKillSwitch('reason', 'operator-name');

// Trigger an emergency manually
await ec.triggerEmergency('manual_trigger', 'operator-name', ['agent_001']);

// Get active emergencies
const active = ec.getActiveEmergencies();

// Resolve an emergency
await ec.resolveEmergency(active[0].id, 'operator-name', 'Resolution description');
```

---

## 9. Health Check Endpoints

The `ProductionMonitoringService` exposes two HTTP-style endpoints:

```typescript
import { createProductionMonitoringService } from './services/monitoring/production';

const monitor = createProductionMonitoringService();

// GET /api/health
const health = monitor.getSystemHealth();
// Returns: { status: 'healthy' | 'degraded' | 'unhealthy', uptimeMs, agentsActive, riskLevel, checkedAt, components }

// GET /api/metrics
const metricsSnapshot = monitor.collectMetrics();
// Returns: AllMetrics snapshot

// GET /api/anomalies
const anomalies = monitor.detectAnomalies();
// Returns: { hasAnomalies, anomalies, checkedAt }
```

These endpoints should be wired to your HTTP server:

```typescript
// Example with express or any HTTP framework
app.get('/api/health', (req, res) => {
  res.json(monitor.getSystemHealth());
});
```

For a Kubernetes readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
```

---

## 10. Log Reference

All components use the structured logger from `services/observability/logger.ts`.
Log entries are JSON-formatted with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `level` | string | `debug`, `info`, `warn`, `error` |
| `service` | string | Originating module (e.g. `circuit-breaker`) |
| `message` | string | Human-readable description |
| `timestamp` | string | ISO-8601 |
| `metadata` | object | Additional context |

### Log service names

| Service Name | Module |
|-------------|--------|
| `circuit-breaker` | `services/observability/circuit-breaker.ts` |
| `alerting-manager` | `services/observability/alerting.ts` |
| `alert-service` | `services/alerts/alerts.ts` |
| `production-monitor` | `services/monitoring/production.ts` |
| `emergency-controller` | `core/security/emergency.ts` |

### Querying logs in production

```bash
# All circuit-breaker trips
grep '"service":"circuit-breaker"' app.log | jq '{time:.timestamp, msg:.message}'

# All critical alerts
grep '"level":"error"' app.log | jq '{service:.service, msg:.message, meta:.metadata}'

# Emergency events
grep '"emergency"' app.log | jq .

# Agent-specific logs
grep '"agentId":"agent_001"' app.log | jq .
```

---

*Last updated: 2026-04-10 | Issue #313*
