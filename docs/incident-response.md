# TONAIAgent — Incident Response Runbook

This runbook defines the step-by-step procedures for detecting, containing,
investigating, and recovering from operational incidents in TONAIAgent.

**Audience:** On-call engineers, platform operators, and security team members.

---

## Table of Contents

1. [Severity Levels](#1-severity-levels)
2. [Contact and Escalation](#2-contact-and-escalation)
3. [Detection](#3-detection)
4. [Triage Checklist](#4-triage-checklist)
5. [Containment](#5-containment)
6. [Investigation](#6-investigation)
7. [Recovery](#7-recovery)
8. [Post-Mortem](#8-post-mortem)
9. [Incident-Specific Playbooks](#9-incident-specific-playbooks)
   - [9.1 Agent Error Rate Spike](#91-agent-error-rate-spike)
   - [9.2 Portfolio Drawdown Breach](#92-portfolio-drawdown-breach)
   - [9.3 Unusual Trade Volume](#93-unusual-trade-volume)
   - [9.4 Key Management Error](#94-key-management-error)
   - [9.5 API Latency Degradation](#95-api-latency-degradation)
   - [9.6 Circuit Breaker Tripped](#96-circuit-breaker-tripped)
   - [9.7 Kill Switch Activated](#97-kill-switch-activated)

---

## 1. Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P1 — Critical** | Trading halted or user funds at risk | Immediate (< 5 min) | Key compromise, circuit breaker open |
| **P2 — High** | Material trading degradation | < 30 min | Error rate > 20%, drawdown > 20% |
| **P3 — Medium** | Performance degraded, no fund risk | < 2 h | High API latency, error rate 5–20% |
| **P4 — Low** | Minor anomaly, system stable | Next business day | Single agent failed, low slippage spike |

---

## 2. Contact and Escalation

Configure the following in your team's alerting system (PagerDuty / OpsGenie / Telegram):

```
P1/P2 → Page on-call engineer immediately
P3    → Slack #platform-alerts + email
P4    → Log ticket, review in next standup
```

Keep an up-to-date on-call rotation in your team wiki.

---

## 3. Detection

An incident may be detected via:

- **Automatic alert** — `TradingCircuitBreaker` fires and notifies configured channels
  (Telegram, PagerDuty, OpsGenie) when a metric breaches a critical threshold.
- **Grafana alert rule** — Prometheus Alertmanager fires based on `tonaiagent_*` metrics.
- **User report** — A user reports unexpected agent behaviour through the app or support.
- **Manual observation** — Operator notices anomaly on the [Agent Overview](../infrastructure/grafana/agent-overview.json)
  or [System Health](../infrastructure/grafana/system-health.json) dashboards.

### Alert Thresholds

| Metric | Warning | Critical | Auto-Action |
|--------|---------|----------|-------------|
| Agent error rate | > 5% / 5 min | > 20% / 5 min | Pause affected agents |
| Portfolio drawdown | > 10% / 1 h | > 20% / 1 h | Stop trading |
| Trade volume ratio | 3× average | 10× average | Flag for review |
| Key management errors | Any | Any | Immediate critical alert |
| API latency p99 | > 2 s | > 5 s | Scale alert |

---

## 4. Triage Checklist

Upon receiving an alert, complete this checklist **within the first 5 minutes**:

- [ ] Open the **[Agent Overview](../infrastructure/grafana/agent-overview.json)** dashboard.
- [ ] Note: Is the circuit breaker open (`tonaiagent_circuit_breaker_tripped == 1`)?
- [ ] Note: Is the kill switch active (`tonaiagent_kill_switch_active == 1`)?
- [ ] Note: How many active agents are there (`tonaiagent_agents_active_total`)?
- [ ] Check `tonaiagent_active_emergencies_total` — any active emergency events?
- [ ] Identify the metric(s) that triggered the alert.
- [ ] Assess blast radius: which agents, users, or strategies are affected?
- [ ] Assign severity (P1–P4) based on the table in §1.
- [ ] Open an incident channel (Slack/Teams) and notify stakeholders.

---

## 5. Containment

### 5.1 Pause specific agents

Use the admin CLI or the REST API:

```bash
# Via CLI (if implemented)
tonai-admin agent pause --id agent_001 --reason "Incident INC-2024-001"

# Via TypeScript (from service code)
import { createEmergencyController } from './core/security/emergency';
const ec = createEmergencyController();
await ec.pauseAgent('agent_001', 'Incident INC-2024-001');
```

### 5.2 Pause ALL agents (emergency stop)

> **Use this when** error rate is critical, drawdown is critical, or key
> management errors are detected.

```bash
# Via admin command
tonai-admin agent pause-all --reason "Incident INC-2024-001"

# Via TypeScript
await ec.pauseAllAgents('Incident INC-2024-001');
```

### 5.3 Activate the kill switch

> **Use this when** fund security is at risk (e.g., key compromise confirmed).

```typescript
await ec.activateKillSwitch('Key compromise detected — INC-2024-001', 'oncall-engineer');
```

The kill switch blocks all outgoing transactions until explicitly deactivated.

### 5.4 Manual circuit-breaker trip

If the automatic circuit breaker has not fired but you need to halt trading:

```typescript
import { createCircuitBreaker } from './services/observability/circuit-breaker';
import { createEmergencyController } from './core/security/emergency';

const ec = createEmergencyController();
const cb = createCircuitBreaker(ec);
await ec.triggerEmergency('manual_trigger', 'oncall-engineer', []);
```

---

## 6. Investigation

After containment, investigate the root cause.

### 6.1 Read audit logs

```typescript
import { createAuditService } from './core/security/audit';
const audit = createAuditService();
const recent = audit.getRecentEvents(100);
```

Or query logs directly:

```bash
# Structured JSON logs — filter by severity
grep '"level":"error"' /var/log/tonaiagent/app.log | jq .

# Filter by agent
grep '"agentId":"agent_001"' /var/log/tonaiagent/app.log | jq .

# Filter by time window
awk '/2024-01-15T10:00/,/2024-01-15T11:00/' /var/log/tonaiagent/app.log | jq .
```

### 6.2 Check Grafana dashboards

- **Agent Overview** — error rate, circuit-breaker trips, agent status table
- **Trading Performance** — PnL curve, slippage distribution around the incident time
- **System Health** — API latency, memory usage, emergency events timeline

### 6.3 Key questions to answer

1. When did the anomaly start? (Use Grafana to identify the exact timestamp.)
2. Which agents / strategies were involved?
3. Was there a deployment, configuration change, or market event at that time?
4. Is there evidence of external attack (key errors, unusual origins in logs)?
5. Was the circuit breaker triggered automatically or manually?

---

## 7. Recovery

Only resume trading after confirming the root cause is resolved.

### 7.1 Resume specific agents

```typescript
await ec.resumeAgent('agent_001', 'Root cause resolved — INC-2024-001');
```

### 7.2 Resume all agents

```typescript
// Resume individual agents one by one after validation
const paused = ec.getPausedAgents();
for (const agentId of paused) {
  await ec.resumeAgent(agentId, 'Root cause resolved — INC-2024-001');
}
```

### 7.3 Deactivate the kill switch

```typescript
await ec.deactivateKillSwitch('Threat resolved — INC-2024-001', 'oncall-engineer');
```

### 7.4 Resolve the emergency event

```typescript
const active = ec.getActiveEmergencies();
for (const event of active) {
  await ec.resolveEmergency(event.id, 'oncall-engineer', 'Root cause: ...');
}
```

### 7.5 Recovery validation checklist

- [ ] Error rate back to normal (< 5% over 5 min)
- [ ] Portfolio drawdown within acceptable range (> -10%)
- [ ] API latency p99 below warning threshold (< 2 s)
- [ ] No active emergency events
- [ ] Kill switch deactivated
- [ ] All required agents resumed and healthy
- [ ] Monitoring dashboards show green for 10 consecutive minutes

---

## 8. Post-Mortem

Complete a post-mortem document **within 48 hours** of resolution.

### Post-Mortem Template

```markdown
## Incident INC-YYYY-NNN Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** HH:MM (detection → resolution)
**Severity:** P1/P2/P3/P4
**Author:** <on-call engineer>
**Reviewers:** <team members>

### Summary
One paragraph describing what happened and the impact.

### Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired — <alert name> |
| HH:MM | On-call engineer paged |
| HH:MM | Agents paused |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Agents resumed |
| HH:MM | Incident resolved |

### Root Cause
Detailed technical explanation.

### Impact
- Users affected: N
- Estimated PnL impact: $X
- Duration of trading halt: HH:MM

### What Went Well
- ...

### What Went Wrong
- ...

### Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| ... | ... | ... |
```

Store post-mortems in `docs/post-mortems/INC-YYYY-NNN.md`.

---

## 9. Incident-Specific Playbooks

### 9.1 Agent Error Rate Spike

**Trigger:** `tonaiagent_agent_errors_total` spike detected by circuit breaker.

1. Identify which agents have elevated error rates (Agent Overview dashboard → Agent Status Table).
2. Check logs for the error type:
   ```bash
   grep '"agentId":"agent_001"' /var/log/tonaiagent/app.log | grep '"level":"error"' | jq '{time:.timestamp, msg:.message, err:.metadata.error}'
   ```
3. **If transient network error:** Wait 5 min; if error rate recovers, no action needed.
4. **If persistent error:** Pause the affected agents, investigate root cause.
5. **If error rate > 20%:** Circuit breaker will auto-pause. Validate containment.
6. Check if a recent deployment caused the regression.

---

### 9.2 Portfolio Drawdown Breach

**Trigger:** `tonaiagent_portfolio_drawdown_pct` breaches warning (-10%) or critical (-20%).

1. Open Trading Performance dashboard → Portfolio Value Over Time.
2. Identify which strategies/agents drove the drawdown.
3. **Warning (-10%):** Notify portfolio manager; increase monitoring frequency.
4. **Critical (-20%):** Circuit breaker auto-stops trading. Confirm all agents are paused.
5. Review strategy parameters — was drawdown within strategy's defined risk limits?
6. Do not resume until portfolio manager approves and root cause is understood.

---

### 9.3 Unusual Trade Volume

**Trigger:** `tradeVolumeRatio` exceeds 3× average (warning) or 10× average (critical).

1. Check the Trading Performance dashboard → Trades Per Agent.
2. Identify which agent(s) are generating excessive volume.
3. **3× average (warning):** Flag for manual review; notify portfolio manager.
4. **10× average (critical):** Circuit breaker triggers. Pause the offending agent.
5. Determine whether this is a legitimate strategy change or runaway behaviour.
6. Review AI decision logs for the agent to understand the source of volume.

---

### 9.4 Key Management Error

**Trigger:** Any `tonaiagent_key_management_errors_total` increment.

> This is always a P1 incident.

1. **Immediately activate the kill switch** to block all transactions.
2. Alert the security team and management.
3. Check key management audit logs:
   ```typescript
   import { createAuditService } from './core/security/audit';
   const audit = createAuditService();
   const events = audit.getRecentEvents(50).filter(e => e.type.includes('key'));
   ```
4. Determine if a key was compromised, rotated incorrectly, or expired.
5. Follow the key rotation procedure in `docs/security.md`.
6. Do **not** deactivate kill switch until key integrity is confirmed.

---

### 9.5 API Latency Degradation

**Trigger:** API p99 latency > 2 s (warning) or > 5 s (critical).

1. Open System Health dashboard → API Latency Over Time.
2. Identify which endpoint(s) are slow (check application logs with request paths).
3. **Warning (> 2 s):** Investigate the slow endpoint; check database/network performance.
4. **Critical (> 5 s):** Circuit breaker fires. Check if agents are timing out on API calls.
5. Check external dependency health (TON node, DEX APIs, data feeds).
6. Scale up infrastructure if resource-constrained.

---

### 9.6 Circuit Breaker Tripped

**Trigger:** `tonaiagent_circuit_breaker_tripped == 1` alert fires.

1. Check the circuit-breaker trip reason in logs:
   ```bash
   grep '"service":"circuit-breaker"' /var/log/tonaiagent/app.log | tail -20 | jq .
   ```
2. Identify the specific metric that caused the trip (see `TripReason` in the log).
3. Follow the playbook for the underlying metric (§9.1–9.5 above).
4. Verify the emergency controller has paused the appropriate agents.
5. After root cause is resolved, explicitly resume agents (circuit breaker does **not** auto-resume).

---

### 9.7 Kill Switch Activated

**Trigger:** `tonaiagent_kill_switch_active == 1` alert fires.

1. Identify who activated it and why (check audit logs).
2. **If automatic (circuit breaker + key error):** Follow §9.4.
3. **If manual:** Contact the person who activated it; understand the reason.
4. Confirm the underlying threat is resolved before deactivation.
5. Deactivation requires explicit approval from the security team lead.
6. After deactivation, resume agents incrementally and monitor closely.

---

*Last updated: 2026-04-10 | Issue #313*
