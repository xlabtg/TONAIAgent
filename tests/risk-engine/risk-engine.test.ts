/**
 * Risk Engine v1 — Tests
 * Issue #154: Risk Engine v1
 *
 * Covers all six core components:
 *   1. Strategy Risk Evaluator
 *   2. Real-Time Exposure Monitor
 *   3. Risk Limits Enforcer
 *   4. Risk Response Handler
 *   5. Risk Scorer
 *   6. Risk Dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createRiskEngine,
  DefaultRiskEngine,
  createStrategyRiskEvaluator,
  createRealTimeExposureMonitor,
  createRiskLimitsEnforcer,
  createRiskResponseHandler,
  createRiskScorer,
  createRiskDashboard,
  buildDrawdownAlert,
  buildLeverageAlert,
} from '../../core/risk-engine';

import type {
  StrategyRiskInput,
  RiskEngineEvent,
  ExposureUpdateInput,
  RiskLimitsCheckInput,
} from '../../core/risk-engine';

// ============================================================================
// Helper Factories
// ============================================================================

function makeStrategyInput(overrides?: Partial<StrategyRiskInput>): StrategyRiskInput {
  return {
    strategyId: 'strategy_001',
    volatility: 0.20,
    maxDrawdown: 0.10,
    leverageRatio: 2.0,
    assetConcentration: 0.30,
    historicalStability: 0.80,
    ...overrides,
  };
}

function makeExposureInput(overrides?: Partial<ExposureUpdateInput>): ExposureUpdateInput {
  return {
    agentId: 'agent_001',
    totalValue: 100000,
    assetExposures: [
      { assetId: 'TON', value: 40000 },
      { assetId: 'USDT', value: 60000 },
    ],
    unrealizedLosses: 5000,
    ...overrides,
  };
}

function makeLimitsCheckInput(overrides?: Partial<RiskLimitsCheckInput>): RiskLimitsCheckInput {
  return {
    entityId: 'agent_001',
    entityType: 'agent',
    positionSizePercent: 10,
    leverageRatio: 2,
    portfolioDrawdownPercent: 5,
    strategyAllocationPercent: 20,
    ...overrides,
  };
}

// ============================================================================
// Strategy Risk Evaluator
// ============================================================================

describe('StrategyRiskEvaluator', () => {
  it('should create an evaluator with default config', () => {
    const evaluator = createStrategyRiskEvaluator();
    expect(evaluator).toBeDefined();
  });

  it('should evaluate a low-risk strategy and return score ≤ 30', () => {
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(
      makeStrategyInput({
        volatility: 0.05,
        maxDrawdown: 0.03,
        leverageRatio: 1.0,
        assetConcentration: 0.10,
        historicalStability: 0.95,
      }),
    );

    expect(profile.strategyId).toBe('strategy_001');
    expect(profile.riskScore.value).toBeGreaterThanOrEqual(0);
    expect(profile.riskScore.value).toBeLessThanOrEqual(30);
    expect(profile.riskScore.category).toBe('low');
  });

  it('should evaluate a high-risk strategy and return score > 60', () => {
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(
      makeStrategyInput({
        volatility: 0.80,
        maxDrawdown: 0.50,
        leverageRatio: 8.0,
        assetConcentration: 0.90,
        historicalStability: 0.10,
      }),
    );

    expect(profile.riskScore.value).toBeGreaterThan(60);
    expect(['high', 'critical']).toContain(profile.riskScore.category);
  });

  it('should evaluate a critical-risk strategy and return score > 80', () => {
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(
      makeStrategyInput({
        volatility: 1.0,
        maxDrawdown: 1.0,
        leverageRatio: 10.0,
        assetConcentration: 1.0,
        historicalStability: 0.0,
      }),
    );

    expect(profile.riskScore.value).toBeGreaterThan(80);
    expect(profile.riskScore.category).toBe('critical');
  });

  it('should store and retrieve profiles', () => {
    const evaluator = createStrategyRiskEvaluator();
    evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_a' }));
    evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_b' }));

    expect(evaluator.getProfile('strat_a')).toBeDefined();
    expect(evaluator.getProfile('strat_b')).toBeDefined();
    expect(evaluator.getAllProfiles()).toHaveLength(2);
  });

  it('should clear a profile', () => {
    const evaluator = createStrategyRiskEvaluator();
    evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_a' }));
    evaluator.clearProfile('strat_a');
    expect(evaluator.getProfile('strat_a')).toBeUndefined();
  });

  it('should emit strategy_evaluated event', () => {
    const evaluator = createStrategyRiskEvaluator();
    const events: RiskEngineEvent[] = [];
    evaluator.onEvent(e => events.push(e));

    evaluator.evaluate(makeStrategyInput());

    const evaluated = events.find(e => e.type === 'strategy_evaluated');
    expect(evaluated).toBeDefined();
    expect((evaluated?.payload as { strategyId: string }).strategyId).toBe('strategy_001');
  });

  it('should include an explanation in the risk score', () => {
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(makeStrategyInput());

    expect(profile.riskScore.explanation).toBeTruthy();
    expect(profile.riskScore.explanation).toContain('Risk score');
  });
});

// ============================================================================
// Real-Time Exposure Monitor
// ============================================================================

describe('RealTimeExposureMonitor', () => {
  it('should create a monitor with default config', () => {
    const monitor = createRealTimeExposureMonitor();
    expect(monitor).toBeDefined();
  });

  it('should compute asset exposure percentages correctly', () => {
    const monitor = createRealTimeExposureMonitor();
    const snapshot = monitor.update(makeExposureInput());

    const ton = snapshot.assetExposures.find(a => a.assetId === 'TON');
    const usdt = snapshot.assetExposures.find(a => a.assetId === 'USDT');

    expect(ton?.percentage).toBeCloseTo(0.4, 2);
    expect(usdt?.percentage).toBeCloseTo(0.6, 2);
  });

  it('should track capital concentration score', () => {
    const monitor = createRealTimeExposureMonitor();
    const snapshot = monitor.update(makeExposureInput());

    // Max concentration is USDT at 60%
    expect(snapshot.capitalConcentrationScore).toBeCloseTo(0.6, 2);
  });

  it('should store and retrieve snapshots', () => {
    const monitor = createRealTimeExposureMonitor();
    monitor.update(makeExposureInput({ agentId: 'agent_a' }));
    monitor.update(makeExposureInput({ agentId: 'agent_b' }));

    expect(monitor.getSnapshot('agent_a')).toBeDefined();
    expect(monitor.getSnapshot('agent_b')).toBeDefined();
    expect(monitor.getAllSnapshots()).toHaveLength(2);
  });

  it('should emit exposure_updated event', () => {
    const monitor = createRealTimeExposureMonitor();
    const events: RiskEngineEvent[] = [];
    monitor.onEvent(e => events.push(e));

    monitor.update(makeExposureInput());

    const updated = events.find(e => e.type === 'exposure_updated');
    expect(updated).toBeDefined();
  });

  it('should emit drawdown_alert when unrealized losses exceed warn threshold', () => {
    const monitor = createRealTimeExposureMonitor({
      unrealizedLossWarnPercent: 0.05,
    });
    const events: RiskEngineEvent[] = [];
    monitor.onEvent(e => events.push(e));

    // 10% unrealized loss, warn threshold 5%
    monitor.update(makeExposureInput({ unrealizedLosses: 10000, totalValue: 100000 }));

    const alert = events.find(
      e => e.type === 'drawdown_alert' &&
        (e.payload as { alertType: string }).alertType === 'unrealized_loss',
    );
    expect(alert).toBeDefined();
  });

  it('should emit drawdown_alert when asset concentration exceeds warn threshold', () => {
    const monitor = createRealTimeExposureMonitor({
      concentrationWarnThreshold: 0.25,
    });
    const events: RiskEngineEvent[] = [];
    monitor.onEvent(e => events.push(e));

    // USDT at 60% > 25% warn threshold
    monitor.update(makeExposureInput());

    const alert = events.find(
      e => e.type === 'drawdown_alert' &&
        (e.payload as { alertType: string }).alertType === 'concentration',
    );
    expect(alert).toBeDefined();
  });
});

// ============================================================================
// Risk Limits Enforcer
// ============================================================================

describe('RiskLimitsEnforcer', () => {
  it('should create an enforcer with default config', () => {
    const enforcer = createRiskLimitsEnforcer();
    expect(enforcer).toBeDefined();
    expect(enforcer.getLimits()).toHaveLength(4);
  });

  it('should pass when all values are within limits', () => {
    const enforcer = createRiskLimitsEnforcer();
    const result = enforcer.check(makeLimitsCheckInput());

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should detect max position size violation', () => {
    const enforcer = createRiskLimitsEnforcer({ maxPositionSizePercent: 20 });
    const result = enforcer.check(
      makeLimitsCheckInput({ positionSizePercent: 25 }),
    );

    expect(result.passed).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_position_size');
    expect(violation).toBeDefined();
    expect(violation?.action).toBe('reduce');
  });

  it('should detect max leverage violation', () => {
    const enforcer = createRiskLimitsEnforcer({ maxLeverageRatio: 5 });
    const result = enforcer.check(
      makeLimitsCheckInput({ leverageRatio: 8 }),
    );

    expect(result.passed).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_leverage');
    expect(violation).toBeDefined();
    expect(violation?.action).toBe('block');
  });

  it('should detect max portfolio drawdown violation', () => {
    const enforcer = createRiskLimitsEnforcer({ maxPortfolioDrawdownPercent: 15 });
    const result = enforcer.check(
      makeLimitsCheckInput({ portfolioDrawdownPercent: 20 }),
    );

    expect(result.passed).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_portfolio_drawdown');
    expect(violation).toBeDefined();
    expect(violation?.action).toBe('rebalance');
  });

  it('should detect max strategy allocation violation', () => {
    const enforcer = createRiskLimitsEnforcer({ maxStrategyAllocationPercent: 30 });
    const result = enforcer.check(
      makeLimitsCheckInput({ strategyAllocationPercent: 35 }),
    );

    expect(result.passed).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_strategy_allocation');
    expect(violation).toBeDefined();
  });

  it('should emit warnings when approaching limits', () => {
    const enforcer = createRiskLimitsEnforcer({ maxPositionSizePercent: 20 });
    const result = enforcer.check(
      // 17% = 85% of 20% limit → within warning zone
      makeLimitsCheckInput({ positionSizePercent: 17 }),
    );

    expect(result.passed).toBe(true);
    const warning = result.warnings.find(w => w.limitType === 'max_position_size');
    expect(warning).toBeDefined();
  });

  it('should include recommended actions for violations', () => {
    const enforcer = createRiskLimitsEnforcer({ maxLeverageRatio: 5 });
    const result = enforcer.check(
      makeLimitsCheckInput({ leverageRatio: 8 }),
    );

    expect(result.recommendedActions.length).toBeGreaterThan(0);
    expect(result.recommendedActions[0].type).toBe('block_trade');
  });

  it('should allow limit updates', () => {
    const enforcer = createRiskLimitsEnforcer({ maxLeverageRatio: 5 });
    enforcer.updateLimit('max_leverage', 10);

    const result = enforcer.check(
      makeLimitsCheckInput({ leverageRatio: 8 }),
    );
    expect(result.passed).toBe(true);
  });

  it('should emit limit_violated event on violation', () => {
    const enforcer = createRiskLimitsEnforcer({ maxLeverageRatio: 5 });
    const events: RiskEngineEvent[] = [];
    enforcer.onEvent(e => events.push(e));

    enforcer.check(makeLimitsCheckInput({ leverageRatio: 8 }));

    const violated = events.find(e => e.type === 'limit_violated');
    expect(violated).toBeDefined();
  });
});

// ============================================================================
// Risk Response Handler
// ============================================================================

describe('RiskResponseHandler', () => {
  it('should create a handler with default config', () => {
    const handler = createRiskResponseHandler();
    expect(handler).toBeDefined();
    expect(handler.getActiveResponses()).toHaveLength(0);
  });

  it('should trigger emergency_shutdown for critical risk score', () => {
    const handler = createRiskResponseHandler({ criticalScoreThreshold: 81 });
    const response = handler.handleRiskScore('strategy_001', 'strategy', {
      value: 90,
      category: 'critical',
      timestamp: new Date(),
      explanation: 'Test critical score',
    });

    expect(response).not.toBeNull();
    expect(response?.actions).toContain('emergency_shutdown');
    expect(response?.actions).toContain('pause_strategy');
  });

  it('should trigger pause_strategy for high risk score', () => {
    const handler = createRiskResponseHandler({
      criticalScoreThreshold: 81,
      highScoreThreshold: 61,
    });
    const response = handler.handleRiskScore('strategy_001', 'strategy', {
      value: 70,
      category: 'high',
      timestamp: new Date(),
      explanation: 'Test high score',
    });

    expect(response).not.toBeNull();
    expect(response?.actions).toContain('pause_strategy');
    expect(response?.actions).toContain('reduce_position');
    expect(response?.actions).not.toContain('emergency_shutdown');
  });

  it('should return null for low risk score', () => {
    const handler = createRiskResponseHandler();
    const response = handler.handleRiskScore('strategy_001', 'strategy', {
      value: 25,
      category: 'low',
      timestamp: new Date(),
      explanation: 'Test low score',
    });

    expect(response).toBeNull();
  });

  it('should trigger reduce_position for drawdown breach', () => {
    const handler = createRiskResponseHandler({ drawdownBreachPercent: 0.15 });
    const response = handler.handleDrawdownBreach('agent_001', 'agent', 0.20);

    expect(response).not.toBeNull();
    expect(response?.actions).toContain('reduce_position');
  });

  it('should return null when drawdown is below threshold', () => {
    const handler = createRiskResponseHandler({ drawdownBreachPercent: 0.20 });
    const response = handler.handleDrawdownBreach('agent_001', 'agent', 0.10);

    expect(response).toBeNull();
  });

  it('should handle manual override', () => {
    const handler = createRiskResponseHandler();
    const response = handler.handleManualOverride('fund_001', 'fund', ['emergency_shutdown']);

    expect(response).toBeDefined();
    expect(response.trigger).toBe('manual_override');
    expect(response.actions).toContain('emergency_shutdown');
  });

  it('should track active responses', () => {
    const handler = createRiskResponseHandler();
    handler.handleManualOverride('fund_001', 'fund', ['pause_strategy']);

    expect(handler.getActiveResponses()).toHaveLength(1);
  });

  it('should complete and archive responses', () => {
    const handler = createRiskResponseHandler();
    const response = handler.handleManualOverride('fund_001', 'fund', ['pause_strategy']);

    handler.completeResponse(response.id, true);

    expect(handler.getActiveResponses()).toHaveLength(0);
    expect(handler.getResponseHistory()).toHaveLength(1);
    expect(handler.getResponseHistory()[0].status).toBe('completed');
  });

  it('should emit risk_response_triggered event', () => {
    const handler = createRiskResponseHandler();
    const events: RiskEngineEvent[] = [];
    handler.onEvent(e => events.push(e));

    handler.handleManualOverride('fund_001', 'fund', ['pause_strategy']);

    const triggered = events.find(e => e.type === 'risk_response_triggered');
    expect(triggered).toBeDefined();
  });

  it('should emit risk_response_completed event', () => {
    const handler = createRiskResponseHandler();
    const events: RiskEngineEvent[] = [];
    handler.onEvent(e => events.push(e));

    const response = handler.handleManualOverride('fund_001', 'fund', ['pause_strategy']);
    handler.completeResponse(response.id, true);

    const completed = events.find(e => e.type === 'risk_response_completed');
    expect(completed).toBeDefined();
  });
});

// ============================================================================
// Risk Scorer
// ============================================================================

describe('RiskScorer', () => {
  it('should create a scorer', () => {
    const scorer = createRiskScorer();
    expect(scorer).toBeDefined();
  });

  it('should score a strategy from its risk profile', () => {
    const evaluator = createStrategyRiskEvaluator();
    const scorer = createRiskScorer();

    const profile = evaluator.evaluate(makeStrategyInput());
    const score = scorer.scoreStrategy({ strategyProfile: profile });

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(100);
  });

  it('should score a portfolio from its exposure snapshot', () => {
    const scorer = createRiskScorer();
    const monitor = createRealTimeExposureMonitor();
    const snapshot = monitor.update(makeExposureInput());

    const score = scorer.scorePortfolio({
      agentId: 'agent_001',
      snapshot,
    });

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(100);
  });

  it('should score a fund from its state', () => {
    const evaluator = createStrategyRiskEvaluator();
    const scorer = createRiskScorer();

    const profile1 = evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_a', leverageRatio: 3 }));
    const profile2 = evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_b', leverageRatio: 4 }));

    const score = scorer.scoreFund({
      fundId: 'fund_001',
      strategyProfiles: [profile1, profile2],
      totalCapital: 500000,
      drawdownPercent: 0.10,
      leverageRatio: 3.5,
    });

    expect(score).toBeDefined();
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(100);
  });

  it('should store and retrieve scores', () => {
    const evaluator = createStrategyRiskEvaluator();
    const scorer = createRiskScorer();
    const profile = evaluator.evaluate(makeStrategyInput({ strategyId: 'strat_a' }));

    scorer.scoreStrategy({ strategyProfile: profile });

    expect(scorer.getLatestScore('strat_a')).toBeDefined();
  });

  it('should emit risk_score_updated event', () => {
    const evaluator = createStrategyRiskEvaluator();
    const scorer = createRiskScorer();
    const events: RiskEngineEvent[] = [];
    scorer.onEvent(e => events.push(e));

    const profile = evaluator.evaluate(makeStrategyInput());
    scorer.scoreStrategy({ strategyProfile: profile });

    const updated = events.find(e => e.type === 'risk_score_updated');
    expect(updated).toBeDefined();
  });
});

// ============================================================================
// Risk Dashboard
// ============================================================================

describe('RiskDashboard', () => {
  it('should create a dashboard', () => {
    const dashboard = createRiskDashboard();
    expect(dashboard).toBeDefined();
  });

  it('should store and retrieve strategy profiles', () => {
    const dashboard = createRiskDashboard();
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(makeStrategyInput());

    dashboard.updateStrategyProfile(profile);

    expect(dashboard.getStrategyRating('strategy_001')).toBeDefined();
  });

  it('should store and retrieve portfolio snapshots', () => {
    const dashboard = createRiskDashboard();
    const monitor = createRealTimeExposureMonitor();
    const snapshot = monitor.update(makeExposureInput());

    dashboard.updatePortfolioSnapshot(snapshot);

    expect(dashboard.getPortfolioExposure('agent_001')).toBeDefined();
  });

  it('should add and retrieve drawdown alerts', () => {
    const dashboard = createRiskDashboard();
    const alert = buildDrawdownAlert('agent_001', 'agent', 0.20, 0.15);

    dashboard.addDrawdownAlert(alert);

    expect(dashboard.getActiveDrawdownAlerts()).toHaveLength(1);
    expect(dashboard.getActiveDrawdownAlerts('agent_001')).toHaveLength(1);
    expect(dashboard.getActiveDrawdownAlerts('agent_002')).toHaveLength(0);
  });

  it('should add and retrieve leverage alerts', () => {
    const dashboard = createRiskDashboard();
    const alert = buildLeverageAlert('fund_001', 'fund', 7, 5);

    dashboard.addLeverageAlert(alert);

    expect(dashboard.getActiveLeverageAlerts()).toHaveLength(1);
  });

  it('should replace alerts for the same entity', () => {
    const dashboard = createRiskDashboard();

    dashboard.addDrawdownAlert(buildDrawdownAlert('agent_001', 'agent', 0.15, 0.10));
    dashboard.addDrawdownAlert(buildDrawdownAlert('agent_001', 'agent', 0.20, 0.10));

    // Should only keep latest
    expect(dashboard.getActiveDrawdownAlerts('agent_001')).toHaveLength(1);
    expect(dashboard.getActiveDrawdownAlerts('agent_001')[0].currentDrawdown).toBe(0.20);
  });

  it('should clear alerts for a specific entity', () => {
    const dashboard = createRiskDashboard();
    dashboard.addDrawdownAlert(buildDrawdownAlert('agent_001', 'agent', 0.20, 0.15));
    dashboard.addDrawdownAlert(buildDrawdownAlert('agent_002', 'agent', 0.20, 0.15));

    dashboard.clearAlerts('agent_001');

    expect(dashboard.getActiveDrawdownAlerts('agent_001')).toHaveLength(0);
    expect(dashboard.getActiveDrawdownAlerts('agent_002')).toHaveLength(1);
  });

  it('should return dashboard metrics', () => {
    const dashboard = createRiskDashboard();
    const evaluator = createStrategyRiskEvaluator();
    const profile = evaluator.evaluate(makeStrategyInput());
    dashboard.updateStrategyProfile(profile);

    const score = profile.riskScore;
    dashboard.updateSystemRiskScore(score);

    const metrics = dashboard.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.strategyRiskRatings).toHaveLength(1);
    expect(metrics.overallSystemRiskScore).toBeDefined();
    expect(metrics.timestamp).toBeDefined();
  });

  it('should emit drawdown_alert event on addDrawdownAlert', () => {
    const dashboard = createRiskDashboard();
    const events: RiskEngineEvent[] = [];
    dashboard.onEvent(e => events.push(e));

    dashboard.addDrawdownAlert(buildDrawdownAlert('agent_001', 'agent', 0.20, 0.15));

    const alertEvent = events.find(e => e.type === 'drawdown_alert');
    expect(alertEvent).toBeDefined();
  });
});

// ============================================================================
// Unified Risk Engine
// ============================================================================

describe('RiskEngine', () => {
  let engine: DefaultRiskEngine;

  beforeEach(() => {
    engine = createRiskEngine({
      riskLimits: {
        maxPositionSizePercent: 20,
        maxLeverageRatio: 5,
        maxPortfolioDrawdownPercent: 15,
        maxStrategyAllocationPercent: 30,
      },
      autoResponse: {
        criticalScoreThreshold: 81,
        highScoreThreshold: 61,
      },
    });
  });

  it('should create a risk engine with all components', () => {
    expect(engine.strategyEvaluator).toBeDefined();
    expect(engine.exposureMonitor).toBeDefined();
    expect(engine.riskLimits).toBeDefined();
    expect(engine.riskResponse).toBeDefined();
    expect(engine.riskScorer).toBeDefined();
    expect(engine.dashboard).toBeDefined();
  });

  it('should report engine status', () => {
    const status = engine.getStatus();

    expect(status.activeResponses).toBe(0);
    expect(status.monitoredAgents).toBe(0);
    expect(status.evaluatedStrategies).toBe(0);
    expect(status.dashboardMetrics).toBeDefined();
  });

  it('should forward events from all components via onEvent', () => {
    const events: RiskEngineEvent[] = [];
    engine.onEvent(e => events.push(e));

    // Trigger an event from each component
    engine.strategyEvaluator.evaluate(makeStrategyInput());
    engine.exposureMonitor.update(makeExposureInput());
    engine.riskLimits.check(makeLimitsCheckInput({ leverageRatio: 8 })); // triggers violation
    engine.riskResponse.handleManualOverride('agent_001', 'agent', ['pause_strategy']);

    const types = events.map(e => e.type);
    expect(types).toContain('strategy_evaluated');
    expect(types).toContain('exposure_updated');
    expect(types).toContain('limit_violated');
    expect(types).toContain('risk_response_triggered');
  });

  it('should update monitored agents count in status after exposure update', () => {
    engine.exposureMonitor.update(makeExposureInput({ agentId: 'agent_001' }));
    engine.exposureMonitor.update(makeExposureInput({ agentId: 'agent_002' }));

    const status = engine.getStatus();
    expect(status.monitoredAgents).toBe(2);
  });

  it('should update evaluated strategies count in status', () => {
    engine.strategyEvaluator.evaluate(makeStrategyInput({ strategyId: 'strat_a' }));
    engine.strategyEvaluator.evaluate(makeStrategyInput({ strategyId: 'strat_b' }));

    const status = engine.getStatus();
    expect(status.evaluatedStrategies).toBe(2);
  });

  it('should execute end-to-end risk evaluation flow', () => {
    // 1. Evaluate strategy risk
    const profile = engine.strategyEvaluator.evaluate(
      makeStrategyInput({
        volatility: 0.60,
        maxDrawdown: 0.40,
        leverageRatio: 6.0,
        assetConcentration: 0.70,
        historicalStability: 0.20,
      }),
    );

    // 2. Score the strategy
    const strategyScore = engine.riskScorer.scoreStrategy({ strategyProfile: profile });
    expect(strategyScore.value).toBeGreaterThan(30);

    // 3. Check limits
    const limitResult = engine.riskLimits.check({
      entityId: 'strategy_001',
      entityType: 'strategy',
      leverageRatio: 6.0,  // exceeds limit of 5
    });
    expect(limitResult.passed).toBe(false);

    // 4. If critical risk score, trigger automated response
    if (strategyScore.category === 'critical' || strategyScore.category === 'high') {
      const response = engine.riskResponse.handleRiskScore(
        'strategy_001',
        'strategy',
        strategyScore,
      );
      expect(response).not.toBeNull();
    }
  });

  it('should demonstrate demo flow: different risk levels, thresholds, automatic responses', () => {
    const events: RiskEngineEvent[] = [];
    engine.onEvent(e => events.push(e));

    // Low-risk strategy
    const lowRisk = engine.strategyEvaluator.evaluate(
      makeStrategyInput({
        strategyId: 'conservative',
        volatility: 0.05,
        maxDrawdown: 0.02,
        leverageRatio: 1.0,
        assetConcentration: 0.15,
        historicalStability: 0.95,
      }),
    );
    expect(lowRisk.riskScore.category).toBe('low');

    // High-risk strategy simulating volatile market
    const highRisk = engine.strategyEvaluator.evaluate(
      makeStrategyInput({
        strategyId: 'aggressive',
        volatility: 0.90,
        maxDrawdown: 0.60,
        leverageRatio: 9.0,
        assetConcentration: 0.85,
        historicalStability: 0.10,
      }),
    );
    expect(['high', 'critical']).toContain(highRisk.riskScore.category);

    // Trigger risk response for high-risk strategy
    const response = engine.riskResponse.handleRiskScore(
      'aggressive',
      'strategy',
      highRisk.riskScore,
    );
    expect(response).not.toBeNull();

    // Verify events were emitted
    const evaluatedEvents = events.filter(e => e.type === 'strategy_evaluated');
    expect(evaluatedEvents).toHaveLength(2);
    const responseEvents = events.filter(e => e.type === 'risk_response_triggered');
    expect(responseEvents).toHaveLength(1);
  });
});
