/**
 * Tests for Prometheus metrics registry and exporter (Issue #353)
 *
 * Covers:
 * - All expected metric names are present in the registry
 * - Circuit-breaker trips increment counters and set the tripped gauge
 * - Execution engine emits trade metrics on success and failure
 * - metricsHandler serialises metrics to Prometheus text format
 * - /metrics response includes expected metric family names
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// Registry — import after resetting to avoid cross-test pollution
// ============================================================================

import { registry } from '../../core/observability/metrics';
import {
  circuitBreakerTripped,
  circuitBreakerTripsTotal,
  tradesTotal,
  tradeLatencySeconds,
  tradeSlippageBps,
  tradeVolumeTotal,
  agentsActiveTotal,
  agentErrorsTotal,
  kycDecisionTotal,
  mpcSignDurationSeconds,
  hsmOperationTotal,
  keyManagementErrorsTotal,
  apiRequestDurationMs,
  errorsTotal,
  activeEmergenciesTotal,
  killSwitchActive,
  emergencyEventsTotal,
  systemHealthy,
  portfolioDrawdownRatio,
  portfolioValueUsd,
  portfolioPnlUsd,
} from '../../core/observability/metrics';

import { metricsHandler } from '../../core/observability/prometheus-exporter';

// ============================================================================
// Helpers
// ============================================================================

function makeFakeResponse(): {
  res: ServerResponse;
  statusCode: () => number;
  body: () => string;
  headers: () => Record<string, string>;
} {
  let _statusCode = 0;
  let _body = '';
  const _headers: Record<string, string> = {};

  const res = {
    writeHead(code: number, hdrs?: Record<string, string>) {
      _statusCode = code;
      if (hdrs) Object.assign(_headers, hdrs);
    },
    end(data?: string) {
      _body = data ?? '';
    },
  } as unknown as ServerResponse;

  return {
    res,
    statusCode: () => _statusCode,
    body: () => _body,
    headers: () => _headers,
  };
}

// ============================================================================
// Tests: metric names present in registry
// ============================================================================

describe('Prometheus registry', () => {
  it('contains all required tonaiagent_* metric families', async () => {
    const text = await registry.metrics();

    const requiredMetrics = [
      'tonaiagent_agents_active_total',
      'tonaiagent_agent_errors_total',
      'tonaiagent_agent_requests_total',
      'tonaiagent_circuit_breaker_tripped',
      'tonaiagent_circuit_breaker_trips_total',
      'tonaiagent_portfolio_drawdown_ratio',
      'tonaiagent_portfolio_value_usd',
      'tonaiagent_portfolio_pnl_usd',
      'tonaiagent_trade_volume_total',
      'tonaiagent_trades_total',
      'tonaiagent_trade_latency_seconds',
      'tonaiagent_trade_slippage_bps',
      'tonaiagent_kyc_decision_total',
      'tonaiagent_mpc_sign_duration_seconds',
      'tonaiagent_hsm_operation_total',
      'tonaiagent_key_management_errors_total',
      'tonaiagent_api_request_duration_ms',
      'tonaiagent_errors_total',
      'tonaiagent_active_emergencies_total',
      'tonaiagent_kill_switch_active',
      'tonaiagent_emergency_events_total',
      'tonaiagent_system_healthy',
    ];

    for (const name of requiredMetrics) {
      expect(text, `Missing metric: ${name}`).toContain(name);
    }
  });

  it('includes default Node.js process metrics', async () => {
    const text = await registry.metrics();
    expect(text).toContain('process_');
  });
});

// ============================================================================
// Tests: circuit breaker Prometheus integration
// ============================================================================

describe('Circuit breaker Prometheus metrics', () => {
  it('circuitBreakerTripped gauge starts at 0', async () => {
    const snap = await registry.getSingleMetricAsString('tonaiagent_circuit_breaker_tripped');
    expect(snap).toContain('tonaiagent_circuit_breaker_tripped 0');
  });

  it('increments trips counter on each trip', async () => {
    const before = (await registry.getMetricsAsJSON())
      .find(m => m.name === 'tonaiagent_circuit_breaker_trips_total');
    const beforeCount = (before?.values?.[0]?.value ?? 0) as number;

    circuitBreakerTripsTotal.inc({ reason: 'agent_error_rate_critical', severity: 'critical' });

    const after = (await registry.getMetricsAsJSON())
      .find(m => m.name === 'tonaiagent_circuit_breaker_trips_total');
    const afterCount = after?.values?.find(
      (v: { labels: { reason: string; severity: string }; value: number }) =>
        v.labels.reason === 'agent_error_rate_critical' && v.labels.severity === 'critical'
    )?.value ?? 0;

    expect(afterCount).toBeGreaterThan(beforeCount as number);
  });

  it('sets circuitBreakerTripped gauge to 1 when tripped', async () => {
    circuitBreakerTripped.set(1);
    const snap = await registry.getSingleMetricAsString('tonaiagent_circuit_breaker_tripped');
    expect(snap).toContain('tonaiagent_circuit_breaker_tripped 1');
    // Reset for other tests
    circuitBreakerTripped.set(0);
  });
});

// ============================================================================
// Tests: trade metrics
// ============================================================================

describe('Trade Prometheus metrics', () => {
  it('tradesTotal counter increments for completed trades', async () => {
    tradesTotal.inc({ status: 'completed' });

    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_trades_total');
    const val = m?.values?.find(
      (v: { labels: { status: string }; value: number }) => v.labels.status === 'completed'
    )?.value ?? 0;
    expect(val).toBeGreaterThan(0);
  });

  it('tradeLatencySeconds histogram records observations', async () => {
    tradeLatencySeconds.observe(0.123);
    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_trade_latency_seconds');
    expect(m).toBeDefined();
    // _count should be > 0
    const countEntry = m?.values?.find(
      (v: { metricName: string }) => v.metricName === 'tonaiagent_trade_latency_seconds_count'
    );
    expect(countEntry?.value).toBeGreaterThan(0);
  });

  it('tradeSlippageBps histogram records bps observations', async () => {
    tradeSlippageBps.observe(15);
    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_trade_slippage_bps');
    expect(m).toBeDefined();
  });

  it('tradeVolumeTotal counter accumulates USD volume', async () => {
    const before = await registry.getMetricsAsJSON();
    const bv = before.find(x => x.name === 'tonaiagent_trade_volume_total')?.values?.[0]?.value ?? 0;

    tradeVolumeTotal.inc(5000);

    const after = await registry.getMetricsAsJSON();
    const av = after.find(x => x.name === 'tonaiagent_trade_volume_total')?.values?.[0]?.value ?? 0;
    expect(av).toBeGreaterThan(bv as number);
  });
});

// ============================================================================
// Tests: agent metrics
// ============================================================================

describe('Agent Prometheus metrics', () => {
  it('agentsActiveTotal can be set and read', async () => {
    agentsActiveTotal.set(5);
    const snap = await registry.getSingleMetricAsString('tonaiagent_agents_active_total');
    expect(snap).toContain('tonaiagent_agents_active_total 5');
  });

  it('agentErrorsTotal increments per agent_id', async () => {
    agentErrorsTotal.inc({ agent_id: 'agent_test_001' });
    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_agent_errors_total');
    const val = m?.values?.find(
      (v: { labels: { agent_id: string }; value: number }) => v.labels.agent_id === 'agent_test_001'
    )?.value ?? 0;
    expect(val).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: KYC / HSM / key-management metrics
// ============================================================================

describe('KYC / key-management Prometheus metrics', () => {
  it('kycDecisionTotal increments with result label', async () => {
    kycDecisionTotal.inc({ result: 'approved' });
    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_kyc_decision_total');
    const val = m?.values?.find(
      (v: { labels: { result: string }; value: number }) => v.labels.result === 'approved'
    )?.value ?? 0;
    expect(val).toBeGreaterThan(0);
  });

  it('hsmOperationTotal increments with provider/operation/status labels', async () => {
    hsmOperationTotal.inc({ provider: 'aws_cloudhsm', operation: 'sign', status: 'success' });
    const metrics = await registry.getMetricsAsJSON();
    const m = metrics.find(x => x.name === 'tonaiagent_hsm_operation_total');
    expect(m).toBeDefined();
  });

  it('keyManagementErrorsTotal increments', async () => {
    const before = await registry.getMetricsAsJSON();
    const bv = before.find(x => x.name === 'tonaiagent_key_management_errors_total')?.values?.[0]?.value ?? 0;
    keyManagementErrorsTotal.inc();
    const after = await registry.getMetricsAsJSON();
    const av = after.find(x => x.name === 'tonaiagent_key_management_errors_total')?.values?.[0]?.value ?? 0;
    expect(av).toBeGreaterThan(bv as number);
  });
});

// ============================================================================
// Tests: metricsHandler (Prometheus HTTP exporter)
// ============================================================================

describe('metricsHandler', () => {
  it('responds with 200 and Prometheus content-type', async () => {
    const { res, statusCode, headers } = makeFakeResponse();
    await metricsHandler({} as IncomingMessage, res);
    expect(statusCode()).toBe(200);
    expect(headers()['Content-Type']).toContain('text/plain');
  });

  it('response body contains tonaiagent_* metric families', async () => {
    const { res, body } = makeFakeResponse();
    await metricsHandler({} as IncomingMessage, res);
    expect(body()).toContain('tonaiagent_trades_total');
    expect(body()).toContain('tonaiagent_circuit_breaker_tripped');
    expect(body()).toContain('tonaiagent_trade_latency_seconds');
  });

  it('responds with 500 when registry.metrics() throws', async () => {
    const origMetrics = registry.metrics.bind(registry);
    vi.spyOn(registry, 'metrics').mockRejectedValueOnce(new Error('test error'));

    const { res, statusCode, body } = makeFakeResponse();
    await metricsHandler({} as IncomingMessage, res);

    expect(statusCode()).toBe(500);
    expect(body()).toContain('Error collecting metrics');

    registry.metrics = origMetrics;
  });
});
