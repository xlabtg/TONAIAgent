/**
 * TONAIAgent - Central Prometheus Metrics Registry
 *
 * Defines all Prometheus metric instruments used across the application and
 * referenced by the Grafana dashboards in infrastructure/grafana/.
 *
 * Implements Issue #353: Wire CircuitBreakerMetrics and Add Prometheus Exporter
 *
 * Cardinality rules:
 *   - agent_id labels are omitted from high-volume counters; use aggregates.
 *   - status/result/reason labels are bounded enums only.
 *   - Histogram buckets match the alerting thresholds in docs/monitoring-runbook.md.
 */

import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
} from 'prom-client';

// ============================================================================
// Registry
// ============================================================================

/** Singleton Prometheus registry for the whole process. */
export const registry = new Registry();

// Collect Node.js default metrics (CPU, memory, event loop lag, GC, …)
collectDefaultMetrics({ register: registry });

// ============================================================================
// Agent metrics
// ============================================================================

export const agentsActiveTotal = new Gauge({
  name: 'tonaiagent_agents_active_total',
  help: 'Number of currently active trading agents',
  registers: [registry],
});

export const agentErrorsTotal = new Counter({
  name: 'tonaiagent_agent_errors_total',
  help: 'Total agent errors, labelled by agent_id',
  labelNames: ['agent_id'] as const,
  registers: [registry],
});

export const agentRequestsTotal = new Counter({
  name: 'tonaiagent_agent_requests_total',
  help: 'Total agent execution requests',
  labelNames: ['agent_id', 'status'] as const,
  registers: [registry],
});

// ============================================================================
// Circuit breaker metrics
// ============================================================================

export const circuitBreakerTripped = new Gauge({
  name: 'tonaiagent_circuit_breaker_tripped',
  help: '1 when the circuit breaker is currently tripped, 0 otherwise',
  registers: [registry],
});

export const circuitBreakerTripsTotal = new Counter({
  name: 'tonaiagent_circuit_breaker_trips_total',
  help: 'Total circuit-breaker trips, labelled by reason and severity',
  labelNames: ['reason', 'severity'] as const,
  registers: [registry],
});

// ============================================================================
// Portfolio metrics
// ============================================================================

export const portfolioDrawdownRatio = new Gauge({
  name: 'tonaiagent_portfolio_drawdown_ratio',
  help: 'Current portfolio drawdown as a ratio (0 = no drawdown, 1 = 100% loss)',
  registers: [registry],
});

export const portfolioValueUsd = new Gauge({
  name: 'tonaiagent_portfolio_value_usd',
  help: 'Current portfolio value in USD',
  registers: [registry],
});

export const portfolioPnlUsd = new Gauge({
  name: 'tonaiagent_portfolio_pnl_usd',
  help: 'Unrealised portfolio PnL in USD',
  registers: [registry],
});

// ============================================================================
// Trade metrics
// ============================================================================

export const tradeVolumeTotal = new Counter({
  name: 'tonaiagent_trade_volume_total',
  help: 'Cumulative trade volume in USD',
  registers: [registry],
});

export const tradesTotal = new Counter({
  name: 'tonaiagent_trades_total',
  help: 'Total trade executions',
  labelNames: ['status'] as const,
  registers: [registry],
});

/** Histogram buckets match the alerting thresholds (2 s warning, 5 s critical). */
export const tradeLatencySeconds = new Histogram({
  name: 'tonaiagent_trade_latency_seconds',
  help: 'Trade execution latency in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const tradeSlippageBps = new Histogram({
  name: 'tonaiagent_trade_slippage_bps',
  help: 'Trade slippage in basis points',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [registry],
});

// ============================================================================
// KYC / AML metrics
// ============================================================================

export const kycDecisionTotal = new Counter({
  name: 'tonaiagent_kyc_decision_total',
  help: 'Total KYC/AML decisions, labelled by result',
  labelNames: ['result'] as const,
  registers: [registry],
});

// ============================================================================
// Key management / MPC / HSM metrics
// ============================================================================

export const mpcSignDurationSeconds = new Histogram({
  name: 'tonaiagent_mpc_sign_duration_seconds',
  help: 'Duration of MPC signing operations in seconds',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const hsmOperationTotal = new Counter({
  name: 'tonaiagent_hsm_operation_total',
  help: 'Total HSM operations, labelled by provider, operation, and status',
  labelNames: ['provider', 'operation', 'status'] as const,
  registers: [registry],
});

export const keyManagementErrorsTotal = new Counter({
  name: 'tonaiagent_key_management_errors_total',
  help: 'Total key-management errors observed',
  registers: [registry],
});

// ============================================================================
// API / system metrics
// ============================================================================

/** Histogram buckets match the alerting thresholds (2 s warning, 5 s critical). */
export const apiRequestDurationMs = new Histogram({
  name: 'tonaiagent_api_request_duration_ms',
  help: 'HTTP API request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000],
  registers: [registry],
});

export const errorsTotal = new Counter({
  name: 'tonaiagent_errors_total',
  help: 'Total application errors, labelled by error_type',
  labelNames: ['error_type'] as const,
  registers: [registry],
});

// ============================================================================
// Emergency / safety metrics
// ============================================================================

export const activeEmergenciesTotal = new Gauge({
  name: 'tonaiagent_active_emergencies_total',
  help: 'Number of currently active emergency events',
  registers: [registry],
});

export const killSwitchActive = new Gauge({
  name: 'tonaiagent_kill_switch_active',
  help: '1 when the global kill switch is active, 0 otherwise',
  registers: [registry],
});

export const emergencyEventsTotal = new Counter({
  name: 'tonaiagent_emergency_events_total',
  help: 'Total emergency events, labelled by type',
  labelNames: ['type'] as const,
  registers: [registry],
});

// ============================================================================
// Trading mode metrics
// ============================================================================

/** Tracks simulation ↔ live transitions with outcome labels. */
export const tradingModeTransitionsTotal = new Counter({
  name: 'tonaiagent_trading_mode_transitions_total',
  help: 'Total server-side trading mode transition attempts, labelled by from/to mode and result',
  labelNames: ['from', 'to', 'result'] as const,
  registers: [registry],
});

// ============================================================================
// Health
// ============================================================================

export const systemHealthy = new Gauge({
  name: 'tonaiagent_system_healthy',
  help: '2 = healthy, 1 = degraded, 0 = unhealthy',
  registers: [registry],
});
