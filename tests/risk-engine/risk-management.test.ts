/**
 * Risk Management Engine — Tests (Issue #203)
 *
 * Tests for the enhanced Risk Management Engine components:
 *   1. Trade Validator
 *   2. Stop-Loss Manager
 *   3. Portfolio Protection
 *   4. Risk Metrics API
 *   5. Enhanced Risk Engine Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createRiskEngine,
  DefaultRiskEngine,
  createTradeValidator,
  createStopLossManager,
  createPortfolioProtection,
  createRiskMetricsAPI,
  createStrategyRiskEvaluator,
} from '../../core/risk-engine';

import type {
  TradeValidationRequest,
  Position,
  RiskEngineEvent,
  StrategyRiskInput,
} from '../../core/risk-engine';

// ============================================================================
// Helper Factories
// ============================================================================

function makeTradeRequest(overrides?: Partial<TradeValidationRequest>): TradeValidationRequest {
  return {
    requestId: 'req_001',
    agentId: 'agent_001',
    asset: 'TON',
    action: 'BUY',
    amount: 100,
    valueUsd: 500,
    currentPrice: 5.0,
    portfolioValueUsd: 10000,
    currentPosition: 0,
    currentDrawdownPercent: 0.05,
    ...overrides,
  };
}

function makePosition(overrides?: Partial<Omit<Position, 'stopLossPrice' | 'highestPrice' | 'lowestPrice' | 'stopLossTriggered'>>): Omit<Position, 'stopLossPrice' | 'highestPrice' | 'lowestPrice' | 'stopLossTriggered'> {
  return {
    positionId: 'pos_001',
    agentId: 'agent_001',
    asset: 'TON',
    entryPrice: 5.0,
    amount: 100,
    side: 'long',
    stopLossConfig: {
      type: 'fixed',
      percentageFromEntry: 5,
    },
    openedAt: new Date(),
    ...overrides,
  };
}

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

// ============================================================================
// Trade Validator Tests
// ============================================================================

describe('TradeValidator', () => {
  it('should create a validator with default config', () => {
    const validator = createTradeValidator();
    expect(validator).toBeDefined();
    expect(validator.getConfig().maxPositionSizePercent).toBe(5);
    expect(validator.getConfig().dailyLossLimitPercent).toBe(3);
  });

  it('should approve a trade within all limits', () => {
    const validator = createTradeValidator();
    const result = validator.validate(makeTradeRequest({
      valueUsd: 400, // 4% of portfolio, under 5% limit
    }));

    expect(result.approved).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should reject a trade exceeding position size limit', () => {
    const validator = createTradeValidator({ maxPositionSizePercent: 5 });
    const result = validator.validate(makeTradeRequest({
      valueUsd: 600, // 6% of portfolio, exceeds 5% limit
    }));

    expect(result.approved).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].limitType).toBe('max_position_size');
    expect(result.suggestedModifications).toBeDefined();
    expect(result.suggestedModifications?.maxSafeValueUsd).toBeLessThanOrEqual(500);
  });

  it('should reject a trade exceeding asset exposure limit', () => {
    const validator = createTradeValidator({ maxAssetExposurePercent: 20 });
    const result = validator.validate(makeTradeRequest({
      action: 'BUY',
      valueUsd: 400, // 4% of portfolio
      currentPosition: 350, // Already have $1750 worth
      currentPrice: 5.0,
      portfolioValueUsd: 10000,
    }));

    // Current exposure: 1750 + 400 = 2150, which is 21.5%
    expect(result.approved).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_strategy_allocation');
    expect(violation).toBeDefined();
  });

  it('should reject when max drawdown is exceeded', () => {
    const validator = createTradeValidator({ maxDrawdownPercent: 15 });
    const result = validator.validate(makeTradeRequest({
      currentDrawdownPercent: 0.18, // 18% drawdown
    }));

    expect(result.approved).toBe(false);
    const violation = result.violations.find(v => v.limitType === 'max_portfolio_drawdown');
    expect(violation).toBeDefined();
  });

  it('should emit warnings when approaching limits', () => {
    const validator = createTradeValidator({ maxPositionSizePercent: 5 });
    const result = validator.validate(makeTradeRequest({
      valueUsd: 450, // 4.5% of portfolio, 90% of limit
    }));

    expect(result.approved).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].type).toBe('position_size');
  });

  it('should track daily losses and disable trading', () => {
    const validator = createTradeValidator({
      dailyLossLimitPercent: 3,
      enableDailyLossLimit: true,
    });

    // Record some losses
    validator.recordTrade('agent_001', -100);
    validator.recordTrade('agent_001', -150);
    validator.recordTrade('agent_001', -100);

    // Check daily loss limit (need to provide portfolio value)
    validator.checkDailyLossLimit('agent_001', 10000); // 350/10000 = 3.5% > 3%

    expect(validator.isTradingDisabled('agent_001')).toBe(true);
    expect(validator.getDisabledAgents()).toContain('agent_001');

    // Validate should reject
    const result = validator.validate(makeTradeRequest());
    expect(result.approved).toBe(false);
  });

  it('should reset daily limits', () => {
    const validator = createTradeValidator();

    validator.recordTrade('agent_001', -100);
    validator.checkDailyLossLimit('agent_001', 1000);

    validator.resetDailyLimits();

    expect(validator.isTradingDisabled('agent_001')).toBe(false);
  });

  it('should emit events on validation', () => {
    const validator = createTradeValidator();
    const events: RiskEngineEvent[] = [];
    validator.onEvent(e => events.push(e));

    validator.validate(makeTradeRequest({ valueUsd: 600 })); // Will fail

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('limit_violated');
  });
});

// ============================================================================
// Stop-Loss Manager Tests
// ============================================================================

describe('StopLossManager', () => {
  it('should create a manager with default config', () => {
    const manager = createStopLossManager();
    expect(manager).toBeDefined();
    expect(manager.getConfig().defaultStopLossPercent).toBe(5);
  });

  it('should register a position with calculated stop-loss', () => {
    const manager = createStopLossManager();
    const position = manager.registerPosition(makePosition({
      entryPrice: 100,
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    expect(position.positionId).toBe('pos_001');
    expect(position.stopLossPrice).toBe(95); // 100 * (1 - 0.05)
    expect(position.stopLossTriggered).toBe(false);
  });

  it('should trigger stop-loss when price drops below threshold', () => {
    const manager = createStopLossManager();
    manager.registerPosition(makePosition({
      entryPrice: 100,
      side: 'long',
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    const check = manager.checkPosition('pos_001', 94); // Below 95 stop-loss

    expect(check.triggered).toBe(true);
    expect(check.exitSignal).toBeDefined();
    expect(check.exitSignal?.action).toBe('SELL');
    expect(check.exitSignal?.urgency).toBe('immediate');
  });

  it('should not trigger stop-loss when price is above threshold', () => {
    const manager = createStopLossManager();
    manager.registerPosition(makePosition({
      entryPrice: 100,
      side: 'long',
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    const check = manager.checkPosition('pos_001', 98); // Above 95 stop-loss

    expect(check.triggered).toBe(false);
    expect(check.exitSignal).toBeUndefined();
  });

  it('should update trailing stop-loss when price increases', () => {
    const manager = createStopLossManager();
    const position = manager.registerPosition(makePosition({
      entryPrice: 100,
      side: 'long',
      stopLossConfig: {
        type: 'trailing',
        percentageFromEntry: 5,
        trailingActivationPercent: 2,
      },
    }));

    expect(position.stopLossPrice).toBe(95);

    // Price goes up to 105 (5% gain, above 2% activation)
    manager.checkPosition('pos_001', 105);
    const updated = manager.getPosition('pos_001');

    // New stop-loss should be 105 * 0.95 = 99.75
    expect(updated?.stopLossPrice).toBeCloseTo(99.75, 2);
  });

  it('should handle short positions correctly', () => {
    const manager = createStopLossManager();
    const position = manager.registerPosition(makePosition({
      entryPrice: 100,
      side: 'short',
      amount: -100, // Negative for short
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    // Short stop-loss is ABOVE entry
    expect(position.stopLossPrice).toBe(105); // 100 * (1 + 0.05)

    // Price goes to 106 (above stop-loss for short)
    const check = manager.checkPosition('pos_001', 106);
    expect(check.triggered).toBe(true);
    expect(check.exitSignal?.action).toBe('BUY'); // Buy to cover
  });

  it('should check all positions at once', () => {
    const manager = createStopLossManager();

    manager.registerPosition(makePosition({
      positionId: 'pos_001',
      asset: 'TON',
      entryPrice: 5.0,
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    manager.registerPosition(makePosition({
      positionId: 'pos_002',
      asset: 'BTC',
      entryPrice: 65000,
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    const prices = new Map([
      ['TON', 4.7], // Below stop-loss
      ['BTC', 64000], // Above stop-loss
    ]);

    const checks = manager.checkAllPositions(prices);

    expect(checks).toHaveLength(2);
    const tonCheck = checks.find(c => c.positionId === 'pos_001');
    const btcCheck = checks.find(c => c.positionId === 'pos_002');

    expect(tonCheck?.triggered).toBe(true);
    expect(btcCheck?.triggered).toBe(false);
  });

  it('should close positions', () => {
    const manager = createStopLossManager();
    manager.registerPosition(makePosition());

    expect(manager.getPosition('pos_001')).toBeDefined();

    manager.closePosition('pos_001');

    expect(manager.getPosition('pos_001')).toBeUndefined();
  });

  it('should emit events on stop-loss trigger', () => {
    const manager = createStopLossManager();
    const events: RiskEngineEvent[] = [];
    manager.onEvent(e => events.push(e));

    manager.registerPosition(makePosition({ entryPrice: 100 }));
    manager.checkPosition('pos_001', 94); // Trigger stop-loss

    const triggerEvent = events.find(
      e => (e.payload as { event?: string })?.event === 'stop_loss_triggered'
    );
    expect(triggerEvent).toBeDefined();
  });
});

// ============================================================================
// Portfolio Protection Tests
// ============================================================================

describe('PortfolioProtection', () => {
  it('should create protection with default config', () => {
    const protection = createPortfolioProtection();
    expect(protection).toBeDefined();
    expect(protection.getConfig().maxDrawdownPercent).toBe(15);
  });

  it('should register an agent for protection', () => {
    const protection = createPortfolioProtection();
    const agent = protection.registerAgent('agent_001', 10000, ['strategy_001']);

    expect(agent.agentId).toBe('agent_001');
    expect(agent.status).toBe('active');
    expect(agent.portfolioValueUsd).toBe(10000);
    expect(agent.peakValueUsd).toBe(10000);
  });

  it('should calculate drawdown on update', () => {
    const protection = createPortfolioProtection();
    protection.registerAgent('agent_001', 10000);

    const agent = protection.updateAgent('agent_001', 8500); // 15% drop

    expect(agent.currentDrawdownPercent).toBe(15);
  });

  it('should pause agent when drawdown exceeds limit', () => {
    const protection = createPortfolioProtection({
      maxDrawdownPercent: 15,
      enableAutoPause: true,
      enableAutoSuspend: false, // Disable auto-suspend to test pause behavior
    });

    protection.registerAgent('agent_001', 10000);
    const agent = protection.updateAgent('agent_001', 8400); // 16% drop

    expect(agent.status).toBe('paused');
    expect(agent.statusReason).toContain('Drawdown');
  });

  it('should emit warning when approaching drawdown limit', () => {
    const protection = createPortfolioProtection({
      maxDrawdownPercent: 15,
      drawdownWarningPercent: 10,
    });

    protection.registerAgent('agent_001', 10000);
    protection.updateAgent('agent_001', 8800); // 12% drop

    const alerts = protection.getActiveAlerts();
    const warning = alerts.find(a => a.type === 'drawdown_warning');
    expect(warning).toBeDefined();
  });

  it('should track daily losses', () => {
    const protection = createPortfolioProtection({
      dailyLossLimitPercent: 3,
    });

    protection.registerAgent('agent_001', 10000);

    // Simulate losses through value updates
    protection.updateAgent('agent_001', 9700, -300);

    const agent = protection.getAgent('agent_001');
    expect(agent?.dailyLossUsd).toBe(300);
  });

  it('should disable trading on daily loss limit', () => {
    const protection = createPortfolioProtection({
      dailyLossLimitPercent: 3,
    });

    protection.registerAgent('agent_001', 10000);
    protection.updateAgent('agent_001', 9600, -400); // 4% loss

    const agent = protection.getAgent('agent_001');
    expect(agent?.tradingDisabledToday).toBe(true);
  });

  it('should resume agent manually', () => {
    const protection = createPortfolioProtection();
    protection.registerAgent('agent_001', 10000);
    protection.pauseAgent('agent_001', 'Manual pause');

    expect(protection.getAgent('agent_001')?.status).toBe('paused');

    protection.resumeAgent('agent_001');

    expect(protection.getAgent('agent_001')?.status).toBe('active');
  });

  it('should suspend agent on critical risk', () => {
    const protection = createPortfolioProtection({
      suspensionRiskThreshold: 85,
      enableAutoSuspend: true,
    });

    protection.registerAgent('agent_001', 10000);
    // Trigger very high risk through severe drawdown
    protection.updateAgent('agent_001', 5000); // 50% drawdown

    const agent = protection.getAgent('agent_001');
    expect(agent?.status).toBe('suspended');
  });

  it('should calculate protection metrics', () => {
    const protection = createPortfolioProtection();

    protection.registerAgent('agent_001', 10000);
    protection.registerAgent('agent_002', 20000);
    protection.pauseAgent('agent_002', 'Test');

    const metrics = protection.getMetrics();

    expect(metrics.totalAgents).toBe(2);
    expect(metrics.activeAgents).toBe(1);
    expect(metrics.pausedAgents).toBe(1);
    expect(metrics.totalPortfolioValueUsd).toBe(30000);
  });

  it('should reset daily counters', () => {
    const protection = createPortfolioProtection();
    protection.registerAgent('agent_001', 10000);
    protection.updateAgent('agent_001', 9700, -300);

    const agentBefore = protection.getAgent('agent_001');
    expect(agentBefore?.dailyLossUsd).toBe(300);

    protection.resetDailyCounters();

    const agentAfter = protection.getAgent('agent_001');
    expect(agentAfter?.dailyLossUsd).toBe(0);
    expect(agentAfter?.tradingDisabledToday).toBe(false);
  });
});

// ============================================================================
// Risk Metrics API Tests
// ============================================================================

describe('RiskMetricsAPI', () => {
  it('should create API with default metrics', () => {
    const api = createRiskMetricsAPI();
    expect(api).toBeDefined();

    const metrics = api.getPortfolioMetrics();
    expect(metrics.riskLevel).toBe('low');
    expect(metrics.riskScore).toBe(0);
  });

  it('should provide full snapshot', () => {
    const api = createRiskMetricsAPI();
    const snapshot = api.getSnapshot();

    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.portfolio).toBeDefined();
    expect(snapshot.agents).toBeDefined();
    expect(snapshot.strategies).toBeDefined();
    expect(snapshot.alerts).toBeDefined();
    expect(snapshot.activeControls).toBeDefined();
  });

  it('should update agent metrics', () => {
    const api = createRiskMetricsAPI();

    api.updateAgentMetrics('agent_001', {
      valueUsd: 10000,
      riskScore: 45,
      riskLevel: 'moderate',
    });

    const agent = api.getAgentMetrics('agent_001');
    expect(agent?.valueUsd).toBe(10000);
    expect(agent?.riskScore).toBe(45);
  });

  it('should update strategy ratings', () => {
    const api = createRiskMetricsAPI();

    api.updateStrategyRating('strategy_001', {
      name: 'Momentum Trader',
      riskScore: 35,
      riskLevel: 'moderate',
      maxDrawdown: 0.08,
      marketplaceLabel: 'Medium Risk',
    });

    const rating = api.getStrategyRiskRating('strategy_001');
    expect(rating?.name).toBe('Momentum Trader');
    expect(rating?.marketplaceLabel).toBe('Medium Risk');
  });

  it('should add and clear alerts', () => {
    const api = createRiskMetricsAPI();

    api.addAlert({
      type: 'drawdown_warning',
      severity: 'warning',
      entityId: 'agent_001',
      message: 'Drawdown approaching limit',
      timestamp: new Date(),
    });

    const summary = api.getAlertsSummary();
    expect(summary.totalActive).toBe(1);
    expect(summary.warnings).toBe(1);

    api.clearAlert(summary.recentAlerts[0].alertId);
    expect(api.getAlertsSummary().totalActive).toBe(0);
  });

  it('should generate user-friendly risk overview', () => {
    const api = createRiskMetricsAPI();

    api.updatePortfolioMetrics({
      riskScore: 45,
      currentDrawdownPercent: 8,
      totalExposurePercent: 70,
    });

    const overview = api.getUserRiskOverview();

    expect(overview.portfolioRiskLevel).toBe('Medium');
    expect(overview.riskColor).toBe('yellow');
    expect(overview.drawdownDisplay).toBe('8.0%');
    expect(overview.tips.length).toBeGreaterThan(0);
  });

  it('should calculate marketplace risk rating', () => {
    const evaluator = createStrategyRiskEvaluator();
    const api = createRiskMetricsAPI();

    // Use higher risk inputs to get a score > 30
    const profile = evaluator.evaluate(makeStrategyInput({
      volatility: 0.50,
      maxDrawdown: 0.30,
      leverageRatio: 4.0,
      assetConcentration: 0.60,
      historicalStability: 0.50,
    }));

    const rating = api.calculateMarketplaceRating('strategy_001', profile);

    expect(rating.strategyId).toBe('strategy_001');
    expect(rating.score).toBeGreaterThan(30); // Should be medium+ risk
    expect(['Medium Risk', 'High Risk']).toContain(rating.label);
    expect(rating.factors.length).toBe(4);
    expect(rating.displayInMarketplace).toBe(true);
  });
});

// ============================================================================
// Enhanced Risk Engine Integration Tests
// ============================================================================

describe('Enhanced RiskEngine (Issue #203)', () => {
  let engine: DefaultRiskEngine;

  beforeEach(() => {
    engine = createRiskEngine({
      riskLimits: {
        maxPositionSizePercent: 20,
        maxLeverageRatio: 5,
        maxPortfolioDrawdownPercent: 15,
        maxStrategyAllocationPercent: 30,
      },
      tradeValidator: {
        maxPositionSizePercent: 5,
        maxAssetExposurePercent: 20,
        dailyLossLimitPercent: 3,
      },
      stopLossManager: {
        defaultStopLossPercent: 5,
      },
      portfolioProtection: {
        maxDrawdownPercent: 15,
        dailyLossLimitPercent: 3,
      },
    });
  });

  it('should include all v2 components', () => {
    expect(engine.tradeValidator).toBeDefined();
    expect(engine.stopLossManager).toBeDefined();
    expect(engine.portfolioProtection).toBeDefined();
    expect(engine.metricsAPI).toBeDefined();
  });

  it('should include v2 fields in status', () => {
    const status = engine.getStatus();

    expect(status.protectionMetrics).toBeDefined();
    expect(status.metricsSnapshot).toBeDefined();
    expect(status.disabledAgents).toBeDefined();
    expect(status.activePositions).toBeDefined();
  });

  it('should forward events from all components', () => {
    const events: RiskEngineEvent[] = [];
    engine.onEvent(e => events.push(e));

    // Trigger events from different components
    engine.strategyEvaluator.evaluate(makeStrategyInput());
    engine.tradeValidator.validate(makeTradeRequest({ valueUsd: 600 }));
    engine.portfolioProtection.registerAgent('agent_001', 10000);

    expect(events.length).toBeGreaterThan(0);
  });

  it('should execute full trade validation flow', () => {
    // 1. Register agent for protection
    engine.portfolioProtection.registerAgent('agent_001', 10000, ['strategy_001']);

    // 2. Validate a trade
    const result = engine.tradeValidator.validate(makeTradeRequest({
      portfolioValueUsd: 10000,
      valueUsd: 400, // 4% - within limit
    }));

    expect(result.approved).toBe(true);

    // 3. If trade executes, register position for stop-loss
    const position = engine.stopLossManager.registerPosition(makePosition({
      entryPrice: 5.0,
      amount: 80,
    }));

    expect(position.stopLossPrice).toBeDefined();

    // 4. Update protection with new portfolio value
    engine.portfolioProtection.updateAgent('agent_001', 10400);

    const agent = engine.portfolioProtection.getAgent('agent_001');
    expect(agent?.portfolioValueUsd).toBe(10400);
  });

  it('should block trades when portfolio protection triggers', () => {
    // Register and trigger drawdown protection
    engine.portfolioProtection.registerAgent('agent_001', 10000);
    engine.portfolioProtection.updateAgent('agent_001', 8400); // 16% drawdown

    const agent = engine.portfolioProtection.getAgent('agent_001');
    // Agent is suspended due to critical risk score (severe drawdown + daily loss)
    expect(['paused', 'suspended']).toContain(agent?.status);

    // Trade should still be validated by trade validator
    const result = engine.tradeValidator.validate(makeTradeRequest({
      currentDrawdownPercent: 0.16, // 16%
    }));

    expect(result.approved).toBe(false);
  });

  it('should trigger stop-loss and update metrics', () => {
    // Register position
    engine.stopLossManager.registerPosition(makePosition({
      entryPrice: 100,
      stopLossConfig: { type: 'fixed', percentageFromEntry: 5 },
    }));

    // Check position (triggers stop-loss)
    const check = engine.stopLossManager.checkPosition('pos_001', 94);

    expect(check.triggered).toBe(true);

    // Update metrics
    engine.metricsAPI.addAlert({
      type: 'stop_loss_triggered',
      severity: 'critical',
      entityId: 'pos_001',
      message: 'Stop-loss triggered for position',
      timestamp: new Date(),
    });

    const alerts = engine.metricsAPI.getAlertsSummary();
    expect(alerts.critical).toBe(1);
  });

  it('should provide consistent risk overview', () => {
    engine.portfolioProtection.registerAgent('agent_001', 10000);
    engine.portfolioProtection.updateAgent('agent_001', 9500);

    engine.metricsAPI.updatePortfolioMetrics({
      totalValueUsd: 9500,
      currentDrawdownPercent: 5,
      riskScore: 35,
      riskLevel: 'moderate',
    });

    const overview = engine.metricsAPI.getUserRiskOverview();

    expect(overview.portfolioRiskLevel).toBe('Medium');
    expect(overview.drawdownDisplay).toBe('5.0%');
  });
});
