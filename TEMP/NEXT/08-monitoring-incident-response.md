# Task: Implement Monitoring, Alerting, and Incident Response

**Priority:** MEDIUM  
**Effort:** ~1 week  
**Related Issue:** #304

## Problem

`services/observability/` has logging infrastructure, but no documented:
- Real-time alerting for critical events (key compromise, unusual trades)
- Incident response runbook
- Circuit breaker for trading when anomalies detected
- Dashboard for operator visibility

## Acceptance Criteria

- [ ] Define and implement alert thresholds (PnL drawdown, trade frequency, error rate)
- [ ] Integrate with alerting system (PagerDuty, OpsGenie, or Telegram bot for small teams)
- [ ] Implement circuit breaker: auto-pause all agents if error rate > threshold
- [ ] Create incident response runbook in `docs/incident-response.md`
- [ ] Add Grafana dashboard templates for key metrics
- [ ] Implement `emergency stop all agents` admin command
- [ ] Test incident response flow end-to-end in staging

## Key Metrics to Alert On

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|--------|
| Agent error rate | >5% in 5 min | >20% in 5 min | Pause agents |
| Portfolio drawdown | >10% in 1h | >20% in 1h | Stop trading |
| Unusual trade volume | 3x average | 10x average | Manual review |
| Key management errors | Any | Any | Immediate alert |
| API response time | >2s p99 | >5s p99 | Scale up |

## Emergency Stop Mechanism

```typescript
// Already exists in core/security/emergency.ts
// Need to wire it to monitoring trigger:

// services/observability/circuit-breaker.ts
export class TradingCircuitBreaker {
  async checkAndTrip(metrics: SystemMetrics): Promise<void> {
    if (metrics.agentErrorRate > CRITICAL_ERROR_RATE) {
      await this.emergencyController.triggerEmergency(
        'market_anomaly',
        'circuit_breaker',
        metrics.affectedAgentIds
      );
    }
  }
}
```

## Files to Create/Modify

- `services/observability/circuit-breaker.ts` — new, auto-pause on anomaly
- `services/observability/alerting.ts` — new, send alerts to configured channels
- `docs/incident-response.md` — new, step-by-step runbook
- `docs/monitoring-runbook.md` — new, operational monitoring guide
- `infrastructure/grafana/` — new, dashboard JSON templates

## Incident Response Runbook Outline

1. **Detection**: Alert fires or user reports issue
2. **Triage**: Check monitoring dashboard, assess scope
3. **Containment**: Pause affected agents via emergency stop
4. **Investigation**: Review audit logs, identify root cause
5. **Recovery**: Resume agents with root cause fixed
6. **Post-Mortem**: Document incident, update runbook
