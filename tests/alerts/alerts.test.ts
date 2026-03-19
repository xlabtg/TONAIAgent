/**
 * Tests for Alert System (Issue #275)
 *
 * Covers:
 * - AlertService: subscribe/unsubscribe, alert history
 * - checkDrawdown: fires on threshold breach, severity
 * - recordExecutionFailure: spike detection
 * - recordApiError: spike detection
 * - checkAgentWinRate: abnormal behaviour detection
 * - checkSlippage: high slippage detection
 * - checkSuccessRate: low success rate detection
 * - DEFAULT_ALERT_THRESHOLDS
 * - createAlertService factory
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  AlertService,
  createAlertService,
  DEFAULT_ALERT_THRESHOLDS,
} from '../../services/alerts';

import type { AlertEvent } from '../../services/alerts';

// ============================================================================
// DEFAULT_ALERT_THRESHOLDS
// ============================================================================

describe('DEFAULT_ALERT_THRESHOLDS', () => {
  it('should have negative maxDrawdownPct', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.maxDrawdownPct).toBeLessThan(0);
  });

  it('should have positive executionFailureSpike', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.executionFailureSpike).toBeGreaterThan(0);
  });

  it('should have positive apiErrorSpike', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.apiErrorSpike).toBeGreaterThan(0);
  });

  it('should have positive minWinRatePct', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.minWinRatePct).toBeGreaterThan(0);
  });

  it('should have positive maxAvgSlippageBps', () => {
    expect(DEFAULT_ALERT_THRESHOLDS.maxAvgSlippageBps).toBeGreaterThan(0);
  });
});

// ============================================================================
// createAlertService
// ============================================================================

describe('createAlertService', () => {
  it('should create an AlertService instance', () => {
    const svc = createAlertService();
    expect(svc).toBeInstanceOf(AlertService);
  });

  it('should accept custom thresholds', () => {
    const svc = createAlertService({ maxDrawdownPct: -3 });
    expect(svc.getThresholds().maxDrawdownPct).toBe(-3);
  });
});

// ============================================================================
// Subscribe / Unsubscribe
// ============================================================================

describe('subscribe / unsubscribe', () => {
  it('should receive alerts via subscribe', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -5);
    expect(received).toHaveLength(1);
  });

  it('should stop receiving alerts after unsubscribe', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    const received: AlertEvent[] = [];
    const unsub = svc.subscribe((a) => received.push(a));
    unsub();
    svc.checkDrawdown('agent_001', -5);
    expect(received).toHaveLength(0);
  });

  it('should support multiple subscribers', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    const received1: AlertEvent[] = [];
    const received2: AlertEvent[] = [];
    svc.subscribe((a) => received1.push(a));
    svc.subscribe((a) => received2.push(a));
    svc.checkDrawdown('agent_001', -5);
    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  it('should not throw if subscriber throws', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    svc.subscribe(() => { throw new Error('handler error'); });
    expect(() => svc.checkDrawdown('agent_001', -5)).not.toThrow();
  });
});

// ============================================================================
// Alert History
// ============================================================================

describe('alert history', () => {
  it('should accumulate fired alerts', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    svc.checkDrawdown('agent_001', -5);
    svc.checkDrawdown('agent_002', -6);
    expect(svc.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    svc.checkDrawdown('agent_001', -5);
    svc.clearHistory();
    expect(svc.getHistory()).toHaveLength(0);
  });
});

// ============================================================================
// checkDrawdown
// ============================================================================

describe('checkDrawdown', () => {
  it('should NOT fire when drawdown is above threshold', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -2); // -2 > -5, no alert
    expect(received).toHaveLength(0);
  });

  it('should fire when drawdown equals threshold', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -5); // exactly at threshold
    expect(received).toHaveLength(1);
  });

  it('should fire when drawdown is below threshold', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -8);
    expect(received[0]?.type).toBe('high_drawdown');
    expect(received[0]?.agentId).toBe('agent_001');
  });

  it('should set severity=critical for very large drawdown', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -11); // below 2x threshold (-10)
    expect(received[0]?.severity).toBe('critical');
  });

  it('should set severity=warning for moderate drawdown', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkDrawdown('agent_001', -6); // below threshold but above 2x
    expect(received[0]?.severity).toBe('warning');
  });

  it('should include drawdown value in context', () => {
    const svc = createAlertService({ maxDrawdownPct: -5 });
    svc.checkDrawdown('agent_001', -7);
    const alert = svc.getHistory()[0] as AlertEvent;
    expect(alert.context.drawdownPct).toBe(-7);
  });
});

// ============================================================================
// recordExecutionFailure
// ============================================================================

describe('recordExecutionFailure', () => {
  it('should NOT fire below spike threshold', () => {
    const svc = createAlertService({ executionFailureSpike: 5, failureWindowMs: 60_000 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    for (let i = 0; i < 4; i++) svc.recordExecutionFailure('agent_001');
    expect(received.filter((a) => a.type === 'execution_failure_spike')).toHaveLength(0);
  });

  it('should fire when spike threshold is reached', () => {
    const svc = createAlertService({ executionFailureSpike: 3, failureWindowMs: 60_000 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    for (let i = 0; i < 3; i++) svc.recordExecutionFailure('agent_001');
    const spikes = received.filter((a) => a.type === 'execution_failure_spike');
    expect(spikes.length).toBeGreaterThanOrEqual(1);
  });

  it('should set severity=critical for spike', () => {
    const svc = createAlertService({ executionFailureSpike: 2, failureWindowMs: 60_000 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.recordExecutionFailure();
    svc.recordExecutionFailure();
    const spike = received.find((a) => a.type === 'execution_failure_spike');
    expect(spike?.severity).toBe('critical');
  });
});

// ============================================================================
// recordApiError
// ============================================================================

describe('recordApiError', () => {
  it('should NOT fire below spike threshold', () => {
    const svc = createAlertService({ apiErrorSpike: 5, apiErrorWindowMs: 60_000 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    for (let i = 0; i < 4; i++) svc.recordApiError();
    expect(received.filter((a) => a.type === 'api_error_spike')).toHaveLength(0);
  });

  it('should fire when api error spike threshold is reached', () => {
    const svc = createAlertService({ apiErrorSpike: 3, apiErrorWindowMs: 60_000 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    for (let i = 0; i < 3; i++) svc.recordApiError();
    const spikes = received.filter((a) => a.type === 'api_error_spike');
    expect(spikes.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// checkAgentWinRate
// ============================================================================

describe('checkAgentWinRate', () => {
  it('should NOT fire when win rate is above threshold', () => {
    const svc = createAlertService({ minWinRatePct: 20 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkAgentWinRate('agent_001', 50);
    expect(received).toHaveLength(0);
  });

  it('should fire when win rate is below threshold', () => {
    const svc = createAlertService({ minWinRatePct: 20 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkAgentWinRate('agent_001', 10);
    expect(received[0]?.type).toBe('abnormal_agent_behavior');
    expect(received[0]?.agentId).toBe('agent_001');
  });

  it('should include win rate in context', () => {
    const svc = createAlertService({ minWinRatePct: 20 });
    svc.checkAgentWinRate('agent_001', 5);
    const alert = svc.getHistory()[0] as AlertEvent;
    expect(alert.context.winRatePct).toBe(5);
  });
});

// ============================================================================
// checkSlippage
// ============================================================================

describe('checkSlippage', () => {
  it('should NOT fire when slippage is at or below threshold', () => {
    const svc = createAlertService({ maxAvgSlippageBps: 100 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkSlippage(100); // exactly at threshold, no alert
    expect(received).toHaveLength(0);
  });

  it('should fire when slippage exceeds threshold', () => {
    const svc = createAlertService({ maxAvgSlippageBps: 100 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkSlippage(150);
    expect(received[0]?.type).toBe('high_slippage');
  });

  it('should optionally include agentId', () => {
    const svc = createAlertService({ maxAvgSlippageBps: 10 });
    svc.checkSlippage(50, 'agent_001');
    const alert = svc.getHistory()[0] as AlertEvent;
    expect(alert.agentId).toBe('agent_001');
  });
});

// ============================================================================
// checkSuccessRate
// ============================================================================

describe('checkSuccessRate', () => {
  it('should NOT fire when success rate is above minWinRatePct', () => {
    const svc = createAlertService({ minWinRatePct: 20 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkSuccessRate(50);
    expect(received).toHaveLength(0);
  });

  it('should fire when success rate is below minWinRatePct', () => {
    const svc = createAlertService({ minWinRatePct: 20 });
    const received: AlertEvent[] = [];
    svc.subscribe((a) => received.push(a));
    svc.checkSuccessRate(10);
    expect(received[0]?.type).toBe('low_success_rate');
  });
});

// ============================================================================
// Alert event shape
// ============================================================================

describe('alert event shape', () => {
  it('should have all required fields', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    svc.checkDrawdown('agent_001', -5);
    const alert = svc.getHistory()[0] as AlertEvent;
    expect(typeof alert.alertId).toBe('string');
    expect(alert.alertId.length).toBeGreaterThan(0);
    expect(typeof alert.type).toBe('string');
    expect(['info', 'warning', 'critical']).toContain(alert.severity);
    expect(typeof alert.message).toBe('string');
    expect(typeof alert.firedAt).toBe('string');
    expect(new Date(alert.firedAt).getTime()).toBeGreaterThan(0);
    expect(typeof alert.context).toBe('object');
  });

  it('should have unique alertIds', () => {
    const svc = createAlertService({ maxDrawdownPct: -1 });
    svc.checkDrawdown('a1', -5);
    svc.checkDrawdown('a2', -5);
    const history = svc.getHistory();
    expect(history[0]?.alertId).not.toBe(history[1]?.alertId);
  });
});
