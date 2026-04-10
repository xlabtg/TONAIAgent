/**
 * Tests for TradingCircuitBreaker (Issue #313)
 *
 * Covers:
 * - DEFAULT_CIRCUIT_BREAKER_THRESHOLDS shape
 * - createCircuitBreaker factory
 * - onTrip subscribe / unsubscribe
 * - checkAndTrip: agent error rate (warning + critical)
 * - checkAndTrip: portfolio drawdown (warning + critical)
 * - checkAndTrip: trade volume anomaly (warning + critical)
 * - checkAndTrip: key management errors (always critical)
 * - checkAndTrip: API latency (warning + critical)
 * - EmergencyController integration (critical trips invoke triggerEmergency)
 * - Warning trips do NOT invoke EmergencyController
 * - No-op when all metrics are within thresholds
 * - Subscriber error isolation (a throwing handler does not break the loop)
 * - getTripCount / reset
 * - Null emergency controller (stand-alone mode)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  TradingCircuitBreaker,
  createCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_THRESHOLDS,
} from '../../services/observability/circuit-breaker';

import type {
  CircuitBreakerMetrics,
  CircuitTripEvent,
  CircuitBreakerThresholds,
} from '../../services/observability/circuit-breaker';

import type { EmergencyController } from '../../core/security/emergency';
import type { EmergencyType } from '../../core/security/types';

// ============================================================================
// Helpers
// ============================================================================

/** Baseline metrics that are well within all thresholds — should produce zero trips. */
function safeMetrics(overrides: Partial<CircuitBreakerMetrics> = {}): CircuitBreakerMetrics {
  return {
    agentErrorRate: 0.01, // 1% — well below warning
    affectedAgentIds: [],
    portfolioDrawdownPct: -1, // -1% — well above warning
    tradeVolumeRatio: 1.5, // 1.5x — well below warning
    keyManagementErrors: 0,
    apiLatencyP99Ms: 500, // 500 ms — well below warning
    ...overrides,
  };
}

/** Create a mock EmergencyController that records calls. */
function makeMockEC() {
  const calls: Array<{ type: EmergencyType; triggeredBy: string; agentIds: string[] }> = [];

  const ec: Pick<EmergencyController, 'triggerEmergency'> = {
    triggerEmergency: vi.fn(async (type, triggeredBy, affectedAgents = []) => {
      calls.push({ type, triggeredBy, agentIds: affectedAgents as string[] });
      return {} as ReturnType<EmergencyController['triggerEmergency']>;
    }),
  };

  return { ec: ec as EmergencyController, calls };
}

// ============================================================================
// DEFAULT_CIRCUIT_BREAKER_THRESHOLDS
// ============================================================================

describe('DEFAULT_CIRCUIT_BREAKER_THRESHOLDS', () => {
  it('should have agentErrorRateWarning = 0.05', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.agentErrorRateWarning).toBe(0.05);
  });

  it('should have agentErrorRateCritical = 0.20', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.agentErrorRateCritical).toBe(0.20);
  });

  it('should have portfolioDrawdownWarning = -10', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.portfolioDrawdownWarning).toBe(-10);
  });

  it('should have portfolioDrawdownCritical = -20', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.portfolioDrawdownCritical).toBe(-20);
  });

  it('should have tradeVolumeWarning = 3', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.tradeVolumeWarning).toBe(3);
  });

  it('should have tradeVolumeCritical = 10', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.tradeVolumeCritical).toBe(10);
  });

  it('should have apiLatencyWarningMs = 2000', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.apiLatencyWarningMs).toBe(2_000);
  });

  it('should have apiLatencyCriticalMs = 5000', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.apiLatencyCriticalMs).toBe(5_000);
  });
});

// ============================================================================
// createCircuitBreaker factory
// ============================================================================

describe('createCircuitBreaker', () => {
  it('should return a TradingCircuitBreaker instance', () => {
    const cb = createCircuitBreaker(null);
    expect(cb).toBeInstanceOf(TradingCircuitBreaker);
  });

  it('should accept custom threshold overrides', () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.10 });
    expect(cb.getThresholds().agentErrorRateWarning).toBe(0.10);
  });

  it('should keep default thresholds for non-overridden fields', () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.10 });
    expect(cb.getThresholds().agentErrorRateCritical).toBe(
      DEFAULT_CIRCUIT_BREAKER_THRESHOLDS.agentErrorRateCritical
    );
  });
});

// ============================================================================
// onTrip subscribe / unsubscribe
// ============================================================================

describe('onTrip subscribe / unsubscribe', () => {
  it('should receive trip events via subscribe', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('should stop receiving events after unsubscribe', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    const unsub = cb.onTrip((e) => events.push(e));
    unsub();
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(events).toHaveLength(0);
  });

  it('should support multiple subscribers', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    const events1: CircuitTripEvent[] = [];
    const events2: CircuitTripEvent[] = [];
    cb.onTrip((e) => events1.push(e));
    cb.onTrip((e) => events2.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(events1.length).toBeGreaterThanOrEqual(1);
    expect(events2.length).toBeGreaterThanOrEqual(1);
  });

  it('should not throw if a subscriber throws', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    cb.onTrip(() => { throw new Error('subscriber error'); });
    await expect(cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }))).resolves.not.toThrow();
  });
});

// ============================================================================
// No-op when all metrics are within thresholds
// ============================================================================

describe('no trip when metrics are safe', () => {
  it('should emit zero trip events for safe metrics', async () => {
    const cb = createCircuitBreaker(null);
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics());
    expect(events).toHaveLength(0);
  });

  it('should not increment trip count for safe metrics', async () => {
    const cb = createCircuitBreaker(null);
    await cb.checkAndTrip(safeMetrics());
    expect(cb.getTripCount()).toBe(0);
  });
});

// ============================================================================
// Agent error rate
// ============================================================================

describe('agent error rate', () => {
  it('should NOT fire when error rate is below warning', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.10 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    const errorRateEvents = events.filter((e) => e.reason.includes('agent_error_rate'));
    expect(errorRateEvents).toHaveLength(0);
  });

  it('should fire WARNING when error rate is at warning threshold', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.05, agentErrorRateCritical: 0.20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    const warn = events.find((e) => e.reason === 'agent_error_rate_warning');
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe('warning');
  });

  it('should fire CRITICAL when error rate is at critical threshold', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.05, agentErrorRateCritical: 0.20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.20 }));
    const crit = events.find((e) => e.reason === 'agent_error_rate_critical');
    expect(crit).toBeDefined();
    expect(crit?.severity).toBe('critical');
  });

  it('should include metric value and threshold in trip event', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.05, agentErrorRateCritical: 0.99 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.08 }));
    const warn = events.find((e) => e.reason === 'agent_error_rate_warning');
    expect(warn?.metricValue).toBe(0.08);
    expect(warn?.threshold).toBe(0.05);
  });

  it('should include affected agent IDs in trip event', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.01, agentErrorRateCritical: 0.99 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({
      agentErrorRate: 0.05,
      affectedAgentIds: ['agent_001', 'agent_002'],
    }));
    const warn = events.find((e) => e.reason === 'agent_error_rate_warning');
    expect(warn?.affectedAgentIds).toEqual(['agent_001', 'agent_002']);
  });
});

// ============================================================================
// Portfolio drawdown
// ============================================================================

describe('portfolio drawdown', () => {
  it('should NOT fire when drawdown is above warning', async () => {
    const cb = createCircuitBreaker(null, { portfolioDrawdownWarning: -10, portfolioDrawdownCritical: -20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ portfolioDrawdownPct: -5 }));
    const drawdownEvents = events.filter((e) => e.reason.includes('portfolio_drawdown'));
    expect(drawdownEvents).toHaveLength(0);
  });

  it('should fire WARNING when drawdown equals warning threshold', async () => {
    const cb = createCircuitBreaker(null, { portfolioDrawdownWarning: -10, portfolioDrawdownCritical: -20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ portfolioDrawdownPct: -10 }));
    const warn = events.find((e) => e.reason === 'portfolio_drawdown_warning');
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe('warning');
  });

  it('should fire CRITICAL when drawdown equals critical threshold', async () => {
    const cb = createCircuitBreaker(null, { portfolioDrawdownWarning: -10, portfolioDrawdownCritical: -20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ portfolioDrawdownPct: -20 }));
    const crit = events.find((e) => e.reason === 'portfolio_drawdown_critical');
    expect(crit).toBeDefined();
    expect(crit?.severity).toBe('critical');
  });

  it('should fire CRITICAL (not WARNING) when drawdown exceeds critical threshold', async () => {
    const cb = createCircuitBreaker(null, { portfolioDrawdownWarning: -10, portfolioDrawdownCritical: -20 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ portfolioDrawdownPct: -25 }));
    // Should have critical but NOT warning (critical takes precedence)
    const crit = events.find((e) => e.reason === 'portfolio_drawdown_critical');
    const warn = events.find((e) => e.reason === 'portfolio_drawdown_warning');
    expect(crit).toBeDefined();
    expect(warn).toBeUndefined();
  });
});

// ============================================================================
// Trade volume anomaly
// ============================================================================

describe('trade volume anomaly', () => {
  it('should NOT fire when volume ratio is below warning', async () => {
    const cb = createCircuitBreaker(null, { tradeVolumeWarning: 3, tradeVolumeCritical: 10 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ tradeVolumeRatio: 2 }));
    const volumeEvents = events.filter((e) => e.reason.includes('trade_volume'));
    expect(volumeEvents).toHaveLength(0);
  });

  it('should fire WARNING when volume ratio is at warning threshold', async () => {
    const cb = createCircuitBreaker(null, { tradeVolumeWarning: 3, tradeVolumeCritical: 10 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ tradeVolumeRatio: 3 }));
    const warn = events.find((e) => e.reason === 'trade_volume_warning');
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe('warning');
  });

  it('should fire CRITICAL when volume ratio is at critical threshold', async () => {
    const cb = createCircuitBreaker(null, { tradeVolumeWarning: 3, tradeVolumeCritical: 10 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ tradeVolumeRatio: 10 }));
    const crit = events.find((e) => e.reason === 'trade_volume_critical');
    expect(crit).toBeDefined();
    expect(crit?.severity).toBe('critical');
  });
});

// ============================================================================
// Key management errors
// ============================================================================

describe('key management errors', () => {
  it('should NOT fire when keyManagementErrors is 0', async () => {
    const cb = createCircuitBreaker(null);
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ keyManagementErrors: 0 }));
    const keyEvents = events.filter((e) => e.reason === 'key_management_error');
    expect(keyEvents).toHaveLength(0);
  });

  it('should fire CRITICAL when keyManagementErrors > 0', async () => {
    const cb = createCircuitBreaker(null);
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ keyManagementErrors: 1 }));
    const crit = events.find((e) => e.reason === 'key_management_error');
    expect(crit).toBeDefined();
    expect(crit?.severity).toBe('critical');
  });

  it('should fire CRITICAL even for a single key error', async () => {
    const cb = createCircuitBreaker(null);
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ keyManagementErrors: 1 }));
    const crit = events.find((e) => e.reason === 'key_management_error');
    expect(crit?.metricValue).toBe(1);
  });
});

// ============================================================================
// API latency
// ============================================================================

describe('API latency', () => {
  it('should NOT fire when latency is below warning', async () => {
    const cb = createCircuitBreaker(null, { apiLatencyWarningMs: 2_000, apiLatencyCriticalMs: 5_000 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ apiLatencyP99Ms: 1_500 }));
    const latencyEvents = events.filter((e) => e.reason.includes('api_latency'));
    expect(latencyEvents).toHaveLength(0);
  });

  it('should fire WARNING when latency is at warning threshold', async () => {
    const cb = createCircuitBreaker(null, { apiLatencyWarningMs: 2_000, apiLatencyCriticalMs: 5_000 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ apiLatencyP99Ms: 2_000 }));
    const warn = events.find((e) => e.reason === 'api_latency_warning');
    expect(warn).toBeDefined();
    expect(warn?.severity).toBe('warning');
  });

  it('should fire CRITICAL when latency is at critical threshold', async () => {
    const cb = createCircuitBreaker(null, { apiLatencyWarningMs: 2_000, apiLatencyCriticalMs: 5_000 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ apiLatencyP99Ms: 5_000 }));
    const crit = events.find((e) => e.reason === 'api_latency_critical');
    expect(crit).toBeDefined();
    expect(crit?.severity).toBe('critical');
  });
});

// ============================================================================
// EmergencyController integration
// ============================================================================

describe('EmergencyController integration', () => {
  it('should call triggerEmergency on critical agent error rate', async () => {
    const { ec, calls } = makeMockEC();
    const cb = createCircuitBreaker(ec, { agentErrorRateCritical: 0.10 });
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(calls.some((c) => c.type === 'anomaly_detected')).toBe(true);
  });

  it('should call triggerEmergency on critical drawdown with risk_limit_breach', async () => {
    const { ec, calls } = makeMockEC();
    const cb = createCircuitBreaker(ec, { portfolioDrawdownCritical: -20 });
    await cb.checkAndTrip(safeMetrics({ portfolioDrawdownPct: -25 }));
    expect(calls.some((c) => c.type === 'risk_limit_breach')).toBe(true);
  });

  it('should call triggerEmergency with security_breach on key management error', async () => {
    const { ec, calls } = makeMockEC();
    const cb = createCircuitBreaker(ec);
    await cb.checkAndTrip(safeMetrics({ keyManagementErrors: 1 }));
    expect(calls.some((c) => c.type === 'security_breach')).toBe(true);
  });

  it('should pass triggeredBy = circuit_breaker to triggerEmergency', async () => {
    const { ec, calls } = makeMockEC();
    const cb = createCircuitBreaker(ec, { agentErrorRateCritical: 0.01 });
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(calls[0]?.triggeredBy).toBe('circuit_breaker');
  });

  it('should mark emergencyTriggered=true in trip event when EC succeeds', async () => {
    const { ec } = makeMockEC();
    const cb = createCircuitBreaker(ec, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    const crit = events.find((e) => e.severity === 'critical');
    expect(crit?.emergencyTriggered).toBe(true);
  });

  it('should NOT call triggerEmergency on WARNING trips', async () => {
    const { ec, calls } = makeMockEC();
    const cb = createCircuitBreaker(ec, {
      agentErrorRateWarning: 0.05,
      agentErrorRateCritical: 0.99, // critical threshold effectively unreachable
    });
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.10 })); // only warning
    expect(calls).toHaveLength(0);
  });

  it('should mark emergencyTriggered=false for warning trips', async () => {
    const { ec } = makeMockEC();
    const cb = createCircuitBreaker(ec, {
      agentErrorRateWarning: 0.05,
      agentErrorRateCritical: 0.99,
    });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.10 }));
    const warn = events.find((e) => e.severity === 'warning');
    expect(warn?.emergencyTriggered).toBe(false);
  });

  it('should handle EC throwing without propagating error', async () => {
    const failingEC: EmergencyController = {
      triggerEmergency: vi.fn().mockRejectedValue(new Error('EC failed')),
    } as unknown as EmergencyController;

    const cb = createCircuitBreaker(failingEC, { agentErrorRateCritical: 0.01 });
    await expect(cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }))).resolves.not.toThrow();
  });

  it('should mark emergencyTriggered=false when EC throws', async () => {
    const failingEC: EmergencyController = {
      triggerEmergency: vi.fn().mockRejectedValue(new Error('EC failed')),
    } as unknown as EmergencyController;

    const cb = createCircuitBreaker(failingEC, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    const crit = events.find((e) => e.severity === 'critical');
    expect(crit?.emergencyTriggered).toBe(false);
  });
});

// ============================================================================
// Null emergency controller (stand-alone mode)
// ============================================================================

describe('null emergency controller', () => {
  it('should still fire trip events without EC', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('should mark emergencyTriggered=false when EC is null', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    const crit = events.find((e) => e.severity === 'critical');
    expect(crit?.emergencyTriggered).toBe(false);
  });
});

// ============================================================================
// Trip event shape
// ============================================================================

describe('trip event shape', () => {
  it('should have all required fields', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.01, agentErrorRateCritical: 0.99 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));

    const event = events[0] as CircuitTripEvent;
    expect(typeof event.tripId).toBe('string');
    expect(event.tripId.length).toBeGreaterThan(0);
    expect(typeof event.reason).toBe('string');
    expect(['warning', 'critical']).toContain(event.severity);
    expect(typeof event.metricValue).toBe('number');
    expect(typeof event.threshold).toBe('number');
    expect(Array.isArray(event.affectedAgentIds)).toBe(true);
    expect(typeof event.trippedAt).toBe('string');
    expect(new Date(event.trippedAt).getTime()).toBeGreaterThan(0);
    expect(typeof event.emergencyTriggered).toBe('boolean');
  });

  it('should have unique tripIds across multiple trips', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.01, agentErrorRateCritical: 0.99 });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    expect(events[0]?.tripId).not.toBe(events[1]?.tripId);
  });
});

// ============================================================================
// getTripCount / reset
// ============================================================================

describe('getTripCount / reset', () => {
  it('should start at 0', () => {
    const cb = createCircuitBreaker(null);
    expect(cb.getTripCount()).toBe(0);
  });

  it('should increment for each trip', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.01, agentErrorRateCritical: 0.99 });
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    expect(cb.getTripCount()).toBe(2);
  });

  it('should reset trip count to 0', async () => {
    const cb = createCircuitBreaker(null, { agentErrorRateWarning: 0.01, agentErrorRateCritical: 0.99 });
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.05 }));
    cb.reset();
    expect(cb.getTripCount()).toBe(0);
  });
});

// ============================================================================
// Multiple simultaneous threshold breaches
// ============================================================================

describe('multiple simultaneous breaches', () => {
  it('should fire multiple trip events when multiple thresholds are breached', async () => {
    const cb = createCircuitBreaker(null, {
      agentErrorRateWarning: 0.01,
      agentErrorRateCritical: 0.99,
      portfolioDrawdownWarning: -5,
      portfolioDrawdownCritical: -50,
    });
    const events: CircuitTripEvent[] = [];
    cb.onTrip((e) => events.push(e));

    await cb.checkAndTrip(safeMetrics({
      agentErrorRate: 0.10, // warning
      portfolioDrawdownPct: -8, // warning
    }));

    expect(events.some((e) => e.reason === 'agent_error_rate_warning')).toBe(true);
    expect(events.some((e) => e.reason === 'portfolio_drawdown_warning')).toBe(true);
  });
});
