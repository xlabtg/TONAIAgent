/**
 * Portfolio Analytics Dashboard Tests
 *
 * Comprehensive tests for the Portfolio Analytics Dashboard module,
 * covering: portfolio overview, performance visualization, strategy allocation,
 * risk monitoring, strategy comparison, and trade activity history.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createPortfolioAnalyticsDashboard,
  DefaultPortfolioAnalyticsDashboard,
  createPortfolioDataModel,
  DefaultPortfolioDataModel,
  createAnalyticsEngine,
  DefaultAnalyticsEngine,
  createRiskMonitor,
  DefaultRiskMonitor,
  createStrategyComparison,
  DefaultStrategyComparison,
  createTradeHistoryManager,
  DefaultTradeHistoryManager,
} from '../../core/portfolio/analytics';

import type {
  PortfolioAnalyticsConfig,
  StrategyAllocation,
  EquityCurvePoint,
  TradeActivity,
  PortfolioAnalyticsEvent,
  RiskAlert,
} from '../../core/portfolio/analytics';

// ============================================================================
// Test Helpers
// ============================================================================

function createConfig(overrides: Partial<PortfolioAnalyticsConfig> = {}): PortfolioAnalyticsConfig {
  return {
    riskFreeRate: 0.05,
    benchmarks: ['TON', 'BTC'],
    tradingDaysPerYear: 365,
    maxHistoryDays: 365,
    drawdownAlertThreshold: 10,
    volatilityAlertThreshold: 5,
    concentrationAlertThreshold: 30,
    maxLeverageLimit: 3,
    dailyLossLimitPercent: 5,
    emitOnUpdate: true,
    cacheDurationMinutes: 5,
    ...overrides,
  };
}

function createAllocation(overrides: Partial<StrategyAllocation> = {}): StrategyAllocation {
  return {
    strategyId: `strat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    strategyName: 'Momentum Strategy',
    allocatedCapital: 10000,
    allocatedPercent: 50,
    currentValue: 11000,
    pnl: 1000,
    pnlPercent: 10,
    contributionToReturn: 5,
    status: 'active',
    lastRebalanced: new Date(),
    ...overrides,
  };
}

function generateEquityCurve(
  initialValue: number,
  days: number,
  dailyReturnPct = 0.2
): EquityCurvePoint[] {
  const points: EquityCurvePoint[] = [];
  let value = initialValue;
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const pnl = value - initialValue;
    points.push({
      timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
      value,
      pnl,
      pnlPercent: (pnl / initialValue) * 100,
    });
    value *= 1 + dailyReturnPct / 100 + (Math.random() * 0.004 - 0.002);
  }

  return points;
}

// ============================================================================
// DefaultPortfolioDataModel Tests
// ============================================================================

describe('DefaultPortfolioDataModel', () => {
  let dataModel: DefaultPortfolioDataModel;

  beforeEach(() => {
    dataModel = createPortfolioDataModel(createConfig());
  });

  describe('portfolio overview', () => {
    it('should initialize an empty portfolio overview', () => {
      const overview = dataModel.getPortfolioOverview('agent_1');

      expect(overview.agentId).toBe('agent_1');
      expect(overview.totalValue).toBe(0);
      expect(overview.totalPnl).toBe(0);
      expect(overview.strategyCount).toBe(0);
    });

    it('should update portfolio value', () => {
      dataModel.updatePortfolioValue('agent_1', 50000, 5000);
      const overview = dataModel.getPortfolioOverview('agent_1');

      expect(overview.totalValue).toBe(50000);
      expect(overview.totalPnl).toBe(5000);
    });

    it('should update day change', () => {
      dataModel.updatePortfolioValue('agent_1', 50000, 5000);
      dataModel.updateDayChange('agent_1', 500, 1.0);
      const overview = dataModel.getPortfolioOverview('agent_1');

      expect(overview.dayChange).toBe(500);
      expect(overview.dayChangePercent).toBe(1.0);
    });
  });

  describe('strategy allocations', () => {
    it('should add a strategy allocation', () => {
      const alloc = createAllocation({ strategyId: 'strat_1', strategyName: 'Alpha Strategy' });
      dataModel.updateStrategyAllocation('agent_1', alloc);

      const overview = dataModel.getPortfolioOverview('agent_1');
      expect(overview.strategyCount).toBe(1);
    });

    it('should return allocation breakdown with strategies', () => {
      const alloc1 = createAllocation({ strategyId: 'strat_1', strategyName: 'Strategy A', allocatedPercent: 60 });
      const alloc2 = createAllocation({ strategyId: 'strat_2', strategyName: 'Strategy B', allocatedPercent: 40 });
      dataModel.updateStrategyAllocation('agent_1', alloc1);
      dataModel.updateStrategyAllocation('agent_1', alloc2);

      const breakdown = dataModel.getAllocationBreakdown('agent_1');

      expect(breakdown.strategies.length).toBe(2);
      expect(breakdown.agentId).toBe('agent_1');
    });

    it('should remove a strategy allocation', () => {
      const alloc = createAllocation({ strategyId: 'strat_to_remove' });
      dataModel.updateStrategyAllocation('agent_1', alloc);
      dataModel.removeStrategyAllocation('agent_1', 'strat_to_remove');

      const overview = dataModel.getPortfolioOverview('agent_1');
      expect(overview.strategyCount).toBe(0);
    });

    it('should record allocation timeline snapshots', () => {
      const alloc = createAllocation({ strategyId: 'strat_1' });
      dataModel.updateStrategyAllocation('agent_1', alloc);
      dataModel.recordAllocationSnapshot('agent_1');

      const breakdown = dataModel.getAllocationBreakdown('agent_1');
      expect(breakdown.timeline.length).toBe(1);
    });
  });

  describe('equity curve', () => {
    it('should record and retrieve equity points', () => {
      const points = generateEquityCurve(10000, 10);
      for (const point of points) {
        dataModel.recordEquityPoint('agent_1', point);
      }

      const curve = dataModel.getEquityCurve('agent_1', 'all_time');
      expect(curve.length).toBe(points.length);
    });

    it('should filter equity curve by period', () => {
      const allPoints = generateEquityCurve(10000, 60);
      for (const point of allPoints) {
        dataModel.recordEquityPoint('agent_1', point);
      }

      const curve7d = dataModel.getEquityCurve('agent_1', '7d');
      expect(curve7d.length).toBeLessThan(allPoints.length);
      expect(curve7d.length).toBeGreaterThan(0);
    });

    it('should compute daily returns from equity curve', () => {
      const points = generateEquityCurve(10000, 30);
      for (const point of points) {
        dataModel.recordEquityPoint('agent_1', point);
      }

      const dailyReturns = dataModel.getDailyReturns('agent_1', 'all_time');
      expect(dailyReturns.length).toBe(points.length - 1);
    });
  });

  describe('trade history', () => {
    it('should record and retrieve trade activities', () => {
      const activity: TradeActivity = {
        id: 'trade_1',
        agentId: 'agent_1',
        type: 'trade_executed',
        description: 'Bought TON',
        symbol: 'TON/USDT',
        side: 'buy',
        quantity: 100,
        price: 2.5,
        value: 250,
        fees: 0.25,
        timestamp: new Date(),
      };

      dataModel.recordTradeActivity('agent_1', activity);

      const history = dataModel.getTradeHistory('agent_1', 'all_time');
      expect(history.activities.length).toBe(1);
      expect(history.totalTrades).toBe(1);
    });

    it('should filter trade history by period', () => {
      // Add old activity (outside 7d)
      const oldActivity: TradeActivity = {
        id: 'old_trade',
        agentId: 'agent_1',
        type: 'trade_executed',
        description: 'Old trade',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const recentActivity: TradeActivity = {
        id: 'recent_trade',
        agentId: 'agent_1',
        type: 'trade_executed',
        description: 'Recent trade',
        timestamp: new Date(),
      };

      dataModel.recordTradeActivity('agent_1', oldActivity);
      dataModel.recordTradeActivity('agent_1', recentActivity);

      const history7d = dataModel.getTradeHistory('agent_1', '7d');
      expect(history7d.activities.length).toBe(1);
      expect(history7d.activities[0]!.id).toBe('recent_trade');
    });
  });

  describe('events', () => {
    it('should emit events on portfolio value update', () => {
      const events: PortfolioAnalyticsEvent[] = [];
      dataModel.onEvent(e => events.push(e));

      dataModel.updatePortfolioValue('agent_1', 50000, 5000);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.type).toBe('metrics_updated');
    });
  });
});

// ============================================================================
// DefaultAnalyticsEngine Tests
// ============================================================================

describe('DefaultAnalyticsEngine', () => {
  let dataModel: DefaultPortfolioDataModel;
  let analyticsEngine: DefaultAnalyticsEngine;

  beforeEach(() => {
    const config = createConfig();
    dataModel = createPortfolioDataModel(config);
    analyticsEngine = createAnalyticsEngine(config, dataModel);
  });

  describe('performance visualization', () => {
    it('should compute empty performance visualization when no data', () => {
      const perf = analyticsEngine.computePerformanceVisualization('agent_1', '30d');

      expect(perf.agentId).toBe('agent_1');
      expect(perf.period).toBe('30d');
      expect(perf.equityCurve).toHaveLength(0);
      expect(perf.dailyReturns).toHaveLength(0);
    });

    it('should compute performance visualization with equity data', () => {
      const points = generateEquityCurve(10000, 30);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      const perf = analyticsEngine.computePerformanceVisualization('agent_1', '30d');

      expect(perf.equityCurve.length).toBeGreaterThan(0);
      expect(perf.dailyReturns.length).toBeGreaterThan(0);
      expect(perf.cumulativeReturns.length).toBeGreaterThan(0);
      expect(perf.benchmarkComparisons.length).toBeGreaterThan(0);
    });

    it('should compute cumulative returns starting from 0', () => {
      const points = generateEquityCurve(10000, 10);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      const perf = analyticsEngine.computePerformanceVisualization('agent_1', 'all_time');
      const firstCumReturn = perf.cumulativeReturns[0];

      expect(firstCumReturn).toBeDefined();
      expect(firstCumReturn!.cumulativeReturn).toBe(0);
    });
  });

  describe('risk metrics', () => {
    it('should return empty risk metrics when no data', () => {
      const risk = analyticsEngine.computeRiskMetrics('agent_1', '30d');

      expect(risk.volatility).toBe(0);
      expect(risk.sharpeRatio).toBe(0);
      expect(risk.maxDrawdown).toBe(0);
    });

    it('should compute risk metrics with sufficient data', () => {
      const points = generateEquityCurve(10000, 60);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      const risk = analyticsEngine.computeRiskMetrics('agent_1', 'all_time');

      expect(risk.volatility).toBeGreaterThanOrEqual(0);
      expect(risk.annualizedVolatility).toBeGreaterThanOrEqual(0);
      expect(risk.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(risk.var95).toBeGreaterThanOrEqual(0);
      expect(risk.var99).toBeGreaterThanOrEqual(0);
    });

    it('should compute Sharpe ratio with positive returns', () => {
      // 0.5% daily return — very high Sharpe expected
      const points = generateEquityCurve(10000, 90, 0.5);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      const risk = analyticsEngine.computeRiskMetrics('agent_1', 'all_time');
      expect(risk.sharpeRatio).toBeGreaterThan(0);
    });
  });

  describe('benchmark comparison', () => {
    it('should compute benchmark comparison with equal returns', () => {
      const returns = [1, 2, -1, 3, 0.5];
      const comparison = analyticsEngine.computeBenchmarkComparison(returns, returns, 'TON');

      expect(comparison.benchmark).toBe('TON');
      expect(comparison.outperformance).toBeCloseTo(0, 1);
    });

    it('should compute outperformance when portfolio beats benchmark', () => {
      const agentReturns = [2, 3, 1, 4, 2];
      const benchmarkReturns = [1, 1, 0, 2, 1];
      const comparison = analyticsEngine.computeBenchmarkComparison(
        agentReturns,
        benchmarkReturns,
        'BTC'
      );

      expect(comparison.outperformance).toBeGreaterThan(0);
      expect(comparison.portfolioReturn).toBeGreaterThan(comparison.benchmarkReturn);
    });

    it('should handle empty returns gracefully', () => {
      const comparison = analyticsEngine.computeBenchmarkComparison([], [], 'ETH');

      expect(comparison.benchmarkReturn).toBe(0);
      expect(comparison.portfolioReturn).toBe(0);
      expect(comparison.outperformance).toBe(0);
    });
  });

  describe('chart data generation', () => {
    beforeEach(() => {
      const points = generateEquityCurve(10000, 30);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }
    });

    it('should generate equity curve chart', () => {
      const chart = analyticsEngine.generateChartData('equity_curve', 'agent_1', '30d');

      expect(chart.type).toBe('equity_curve');
      expect(chart.series.length).toBe(1);
      expect(chart.series[0]!.data.length).toBeGreaterThan(0);
    });

    it('should generate daily returns chart', () => {
      const chart = analyticsEngine.generateChartData('daily_returns', 'agent_1', '30d');

      expect(chart.type).toBe('daily_returns');
      expect(chart.series.length).toBe(1);
    });

    it('should generate cumulative returns chart', () => {
      const chart = analyticsEngine.generateChartData('cumulative_returns', 'agent_1', '30d');

      expect(chart.type).toBe('cumulative_returns');
    });

    it('should generate drawdown chart', () => {
      const chart = analyticsEngine.generateChartData('drawdown', 'agent_1', '30d');

      expect(chart.type).toBe('drawdown');
    });

    it('should generate allocation pie chart', () => {
      const alloc = createAllocation({ strategyId: 'strat_1', strategyName: 'Strategy A' });
      dataModel.updateStrategyAllocation('agent_1', alloc);

      const chart = analyticsEngine.generateChartData('allocation_pie', 'agent_1', 'all_time');

      expect(chart.type).toBe('allocation_pie');
    });
  });

  describe('dashboard metrics', () => {
    it('should build complete dashboard metrics', async () => {
      const points = generateEquityCurve(10000, 30);
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      dataModel.updatePortfolioValue('agent_1', 11000, 1000);

      const metrics = await analyticsEngine.buildDashboardMetrics('agent_1', '30d');

      expect(metrics.agentId).toBe('agent_1');
      expect(metrics.period).toBe('30d');
      expect(metrics.overview).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.allocation).toBeDefined();
    });
  });
});

// ============================================================================
// DefaultRiskMonitor Tests
// ============================================================================

describe('DefaultRiskMonitor', () => {
  let dataModel: DefaultPortfolioDataModel;
  let analyticsEngine: DefaultAnalyticsEngine;
  let riskMonitor: DefaultRiskMonitor;

  beforeEach(() => {
    const config = createConfig({
      drawdownAlertThreshold: 10,
      volatilityAlertThreshold: 5,
      concentrationAlertThreshold: 30,
      maxLeverageLimit: 3,
    });
    dataModel = createPortfolioDataModel(config);
    analyticsEngine = createAnalyticsEngine(config, dataModel);
    riskMonitor = createRiskMonitor(config, analyticsEngine, dataModel);
  });

  describe('risk panel', () => {
    it('should return a risk panel with default values', () => {
      const panel = riskMonitor.getRiskPanel('agent_1');

      expect(panel.agentId).toBe('agent_1');
      expect(panel.riskMetrics).toBeDefined();
      expect(panel.exposureMetrics).toBeDefined();
      expect(panel.activeAlerts).toBeDefined();
      expect(panel.riskGrade).toMatch(/[ABCDF]/);
      expect(panel.riskScore).toBeGreaterThanOrEqual(0);
      expect(panel.riskScore).toBeLessThanOrEqual(100);
    });

    it('should compute risk grade A for low-risk portfolio', () => {
      // Good Sharpe, low drawdown — expect high grade
      const points = generateEquityCurve(10000, 60, 0.1); // steady 0.1% daily gain
      for (const p of points) {
        dataModel.recordEquityPoint('agent_1', p);
      }

      const panel = riskMonitor.getRiskPanel('agent_1');
      expect(['A', 'B']).toContain(panel.riskGrade);
    });
  });

  describe('alert management', () => {
    it('should trigger a drawdown alert', () => {
      const alert = riskMonitor.triggerAlert(
        'agent_1',
        'drawdown_threshold',
        15,
        10,
        'Drawdown exceeded 15%'
      );

      expect(alert.id).toBeDefined();
      expect(alert.type).toBe('drawdown_threshold');
      expect(alert.triggered).toBe(true);
      expect(alert.severity).toBeDefined();
    });

    it('should list active alerts', () => {
      riskMonitor.triggerAlert('agent_1', 'drawdown_threshold', 15, 10, 'Alert 1');
      riskMonitor.triggerAlert('agent_1', 'volatility_spike', 8, 5, 'Alert 2');

      const activeAlerts = riskMonitor.getActiveAlerts('agent_1');
      expect(activeAlerts.length).toBe(2);
    });

    it('should resolve an alert and move it to history', () => {
      const alert = riskMonitor.triggerAlert(
        'agent_1',
        'drawdown_threshold',
        15,
        10,
        'Test alert'
      );

      riskMonitor.resolveAlert('agent_1', alert.id);

      const activeAlerts = riskMonitor.getActiveAlerts('agent_1');
      const history = riskMonitor.getAlertHistory('agent_1');

      expect(activeAlerts.length).toBe(0);
      expect(history.length).toBe(1);
      expect(history[0]!.resolvedAt).toBeDefined();
    });

    it('should assign critical severity for very high values', () => {
      const alert = riskMonitor.triggerAlert(
        'agent_1',
        'drawdown_threshold',
        30,  // 3x threshold
        10,
        'Very high drawdown'
      );

      expect(['critical', 'error']).toContain(alert.severity);
    });

    it('should evaluate risk alerts from metrics', () => {
      // Set high leverage to trigger alert
      riskMonitor.updateExposureMetrics('agent_1', {
        grossLeverage: 5, // exceeds limit of 3
        netLeverage: 5,
        totalExposure: 50000,
        netExposure: 50000,
        topConcentrations: [],
      });

      const triggered = riskMonitor.evaluateRiskAlerts('agent_1');
      expect(triggered.length).toBeGreaterThan(0);
      expect(triggered.some(a => a.type === 'leverage_limit')).toBe(true);
    });

    it('should trigger concentration alert for high concentration', () => {
      riskMonitor.updateExposureMetrics('agent_1', {
        grossLeverage: 1,
        netLeverage: 1,
        totalExposure: 50000,
        netExposure: 50000,
        topConcentrations: [
          { asset: 'TON', exposurePercent: 45, value: 22500 }, // > 30% threshold
        ],
      });

      const triggered = riskMonitor.evaluateRiskAlerts('agent_1');
      expect(triggered.some(a => a.type === 'concentration_risk')).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit event on alert triggered', () => {
      const events: PortfolioAnalyticsEvent[] = [];
      riskMonitor.onEvent(e => events.push(e));

      riskMonitor.triggerAlert('agent_1', 'drawdown_threshold', 15, 10, 'Test');

      expect(events.some(e => e.type === 'alert_triggered')).toBe(true);
    });

    it('should emit event on alert resolved', () => {
      const events: PortfolioAnalyticsEvent[] = [];
      riskMonitor.onEvent(e => events.push(e));

      const alert = riskMonitor.triggerAlert('agent_1', 'drawdown_threshold', 15, 10, 'Test');
      riskMonitor.resolveAlert('agent_1', alert.id);

      expect(events.some(e => e.type === 'alert_resolved')).toBe(true);
    });
  });
});

// ============================================================================
// DefaultStrategyComparison Tests
// ============================================================================

describe('DefaultStrategyComparison', () => {
  let dataModel: DefaultPortfolioDataModel;
  let analyticsEngine: DefaultAnalyticsEngine;
  let strategyComparison: DefaultStrategyComparison;

  beforeEach(() => {
    const config = createConfig();
    dataModel = createPortfolioDataModel(config);
    analyticsEngine = createAnalyticsEngine(config, dataModel);
    strategyComparison = createStrategyComparison(config, dataModel, analyticsEngine);
  });

  function setupTwoStrategies(): void {
    const alloc1 = createAllocation({
      strategyId: 'strat_a',
      strategyName: 'Strategy A',
      allocatedCapital: 10000,
      pnl: 2000, // 20% ROI
    });
    const alloc2 = createAllocation({
      strategyId: 'strat_b',
      strategyName: 'Strategy B',
      allocatedCapital: 10000,
      pnl: 500, // 5% ROI
    });
    dataModel.updateStrategyAllocation('agent_1', alloc1);
    dataModel.updateStrategyAllocation('agent_1', alloc2);

    // Record trades for strat_a (mostly winning)
    for (let i = 0; i < 10; i++) {
      strategyComparison.recordStrategyTrade('agent_1', 'strat_a', {
        strategyId: 'strat_a',
        pnl: i % 3 === 0 ? -100 : 200,
        returnPercent: i % 3 === 0 ? -1 : 2,
        timestamp: new Date(),
      });
    }

    // Record trades for strat_b (mostly losing)
    for (let i = 0; i < 10; i++) {
      strategyComparison.recordStrategyTrade('agent_1', 'strat_b', {
        strategyId: 'strat_b',
        pnl: i % 2 === 0 ? 50 : -200,
        returnPercent: i % 2 === 0 ? 0.5 : -2,
        timestamp: new Date(),
      });
    }
  }

  describe('strategy metrics', () => {
    it('should compute strategy metrics for a tracked strategy', () => {
      const alloc = createAllocation({
        strategyId: 'strat_1',
        strategyName: 'Test Strategy',
        allocatedCapital: 10000,
        pnl: 1000,
      });
      dataModel.updateStrategyAllocation('agent_1', alloc);

      const metrics = strategyComparison.computeStrategyMetrics('agent_1', 'strat_1', '30d');

      expect(metrics.strategyId).toBe('strat_1');
      expect(metrics.strategyName).toBe('Test Strategy');
      expect(metrics.roi).toBeCloseTo(10, 1); // 1000/10000 * 100 = 10%
    });

    it('should compute win rate from recorded trades', () => {
      const alloc = createAllocation({ strategyId: 'strat_1' });
      dataModel.updateStrategyAllocation('agent_1', alloc);

      // 3 winning, 2 losing
      for (let i = 0; i < 5; i++) {
        strategyComparison.recordStrategyTrade('agent_1', 'strat_1', {
          strategyId: 'strat_1',
          pnl: i < 3 ? 100 : -50,
          returnPercent: i < 3 ? 1 : -0.5,
          timestamp: new Date(),
        });
      }

      const metrics = strategyComparison.computeStrategyMetrics('agent_1', 'strat_1', 'all_time');
      expect(metrics.winRate).toBeCloseTo(60, 0); // 3/5 = 60%
    });
  });

  describe('comparison', () => {
    it('should return empty comparison when no strategies', () => {
      const result = strategyComparison.compareStrategies('agent_1', '30d');

      expect(result.strategies).toHaveLength(0);
      expect(result.bestByROI).toBe('');
    });

    it('should identify best strategy by ROI', () => {
      setupTwoStrategies();
      const result = strategyComparison.compareStrategies('agent_1', 'all_time');

      expect(result.strategies.length).toBe(2);
      expect(result.bestByROI).toBe('strat_a'); // 20% ROI > 5% ROI
    });

    it('should identify best strategy by win rate', () => {
      setupTwoStrategies();
      const result = strategyComparison.compareStrategies('agent_1', 'all_time');

      // strat_a: 7/10 wins (70%), strat_b: 5/10 wins (50%)
      expect(result.bestByWinRate).toBe('strat_a');
    });
  });

  describe('rankings', () => {
    it('should rank strategies by ROI descending', () => {
      setupTwoStrategies();
      const ranked = strategyComparison.rankByROI('agent_1', 'all_time');

      expect(ranked[0]!.strategyId).toBe('strat_a');
      expect(ranked[0]!.roi).toBeGreaterThan(ranked[1]!.roi);
    });

    it('should rank strategies by Sharpe ratio descending', () => {
      setupTwoStrategies();
      const ranked = strategyComparison.rankBySharpe('agent_1', 'all_time');

      expect(ranked.length).toBe(2);
      if (ranked.length >= 2) {
        expect(ranked[0]!.sharpeRatio).toBeGreaterThanOrEqual(ranked[1]!.sharpeRatio);
      }
    });

    it('should rank strategies by drawdown ascending (lowest first)', () => {
      setupTwoStrategies();
      const ranked = strategyComparison.rankByDrawdown('agent_1', 'all_time');

      expect(ranked.length).toBe(2);
      if (ranked.length >= 2) {
        expect(ranked[0]!.maxDrawdown).toBeLessThanOrEqual(ranked[1]!.maxDrawdown);
      }
    });
  });
});

// ============================================================================
// DefaultTradeHistoryManager Tests
// ============================================================================

describe('DefaultTradeHistoryManager', () => {
  let dataModel: DefaultPortfolioDataModel;
  let historyManager: DefaultTradeHistoryManager;

  beforeEach(() => {
    const config = createConfig();
    dataModel = createPortfolioDataModel(config);
    historyManager = createTradeHistoryManager(config, dataModel);
  });

  describe('recording trades', () => {
    it('should record a trade and assign ID and timestamp', () => {
      const trade = historyManager.recordTrade('agent_1', {
        agentId: 'agent_1',
        strategyId: 'strat_1',
        strategyName: 'Test Strategy',
        type: 'trade_executed',
        symbol: 'TON/USDT',
        side: 'buy',
        quantity: 100,
        price: 2.50,
        value: 250,
        fees: 0.25,
        pnl: 0,
        description: 'Bought 100 TON',
      });

      expect(trade.id).toBeDefined();
      expect(trade.timestamp).toBeDefined();
      expect(trade.symbol).toBe('TON/USDT');
    });

    it('should record a rebalancing event', () => {
      const prevAllocations = [createAllocation({ strategyId: 'strat_1', allocatedPercent: 50 })];
      const newAllocations = [
        createAllocation({ strategyId: 'strat_1', allocatedPercent: 40 }),
        createAllocation({ strategyId: 'strat_2', allocatedPercent: 60 }),
      ];

      const event = historyManager.recordRebalancing(
        'agent_1',
        'Quarterly rebalancing',
        prevAllocations,
        newAllocations,
        100000,
        100500
      );

      expect(event.id).toBeDefined();
      expect(event.reason).toBe('Quarterly rebalancing');
      expect(event.totalValueBefore).toBe(100000);
      expect(event.totalValueAfter).toBe(100500);
    });

    it('should record allocation update activity', () => {
      const activity = historyManager.recordAllocationUpdate(
        'agent_1',
        'strat_1',
        'Momentum Strategy',
        50,
        60
      );

      expect(activity.type).toBe('allocation_update');
      expect(activity.description).toContain('50.0%');
      expect(activity.description).toContain('60.0%');
    });
  });

  describe('querying history', () => {
    beforeEach(() => {
      // Record multiple trades
      for (let i = 0; i < 5; i++) {
        historyManager.recordTrade('agent_1', {
          agentId: 'agent_1',
          strategyId: `strat_${i % 2}`,
          type: 'trade_executed',
          value: 100 + i * 50,
          pnl: i % 2 === 0 ? 10 : -5,
          fees: 0.1,
          description: `Trade ${i}`,
        });
      }
    });

    it('should retrieve all history', () => {
      const history = historyManager.getHistory('agent_1');
      expect(history.activities.length).toBe(5);
    });

    it('should filter by activity type', () => {
      historyManager.recordAllocationUpdate('agent_1', 'strat_1', 'Test', 50, 60);

      const history = historyManager.getHistory('agent_1', {
        types: ['allocation_update'],
      });

      expect(history.activities.every(a => a.type === 'allocation_update')).toBe(true);
    });

    it('should filter by strategy ID', () => {
      const history = historyManager.getHistory('agent_1', {
        strategyId: 'strat_0',
      });

      expect(history.activities.every(a => a.strategyId === 'strat_0')).toBe(true);
    });

    it('should support pagination with limit and offset', () => {
      const historyPage1 = historyManager.getHistory('agent_1', { limit: 2, offset: 0 });
      const historyPage2 = historyManager.getHistory('agent_1', { limit: 2, offset: 2 });

      expect(historyPage1.activities.length).toBe(2);
      expect(historyPage2.activities.length).toBe(2);
      expect(historyPage1.activities[0]!.id).not.toBe(historyPage2.activities[0]!.id);
    });

    it('should return recent activities sorted by timestamp', () => {
      const recent = historyManager.getRecentActivities('agent_1', 3);

      expect(recent.length).toBe(3);
      // Most recent should be first
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
          recent[i + 1]!.timestamp.getTime()
        );
      }
    });
  });

  describe('summary statistics', () => {
    it('should compute summary with win rate', () => {
      // 3 winning, 2 losing trades
      for (let i = 0; i < 5; i++) {
        historyManager.recordTrade('agent_1', {
          agentId: 'agent_1',
          type: 'trade_executed',
          pnl: i < 3 ? 100 : -50,
          value: 1000,
          fees: 1,
          description: `Trade ${i}`,
        });
      }

      const summary = historyManager.getSummary('agent_1', 'all_time');

      expect(summary.totalTrades).toBe(5);
      expect(summary.winningTrades).toBe(3);
      expect(summary.losingTrades).toBe(2);
      expect(summary.winRate).toBeCloseTo(60, 0);
    });

    it('should compute total volume and fees', () => {
      for (let i = 0; i < 3; i++) {
        historyManager.recordTrade('agent_1', {
          agentId: 'agent_1',
          type: 'trade_executed',
          value: 1000,
          fees: 2,
          description: `Trade ${i}`,
        });
      }

      const summary = historyManager.getSummary('agent_1', 'all_time');

      expect(summary.totalVolume).toBe(3000);
      expect(summary.totalFees).toBe(6);
    });
  });
});

// ============================================================================
// DefaultPortfolioAnalyticsDashboard Integration Tests
// ============================================================================

describe('DefaultPortfolioAnalyticsDashboard', () => {
  let dashboard: DefaultPortfolioAnalyticsDashboard;

  beforeEach(() => {
    dashboard = createPortfolioAnalyticsDashboard({
      drawdownAlertThreshold: 10,
      volatilityAlertThreshold: 5,
      concentrationAlertThreshold: 30,
    });
  });

  describe('portfolio overview', () => {
    it('should return empty portfolio for new agent', () => {
      const overview = dashboard.getPortfolioOverview('agent_1');

      expect(overview.agentId).toBe('agent_1');
      expect(overview.totalValue).toBe(0);
    });

    it('should update and retrieve portfolio value', () => {
      dashboard.updatePortfolioValue('agent_1', 100000, 10000);
      const overview = dashboard.getPortfolioOverview('agent_1');

      expect(overview.totalValue).toBe(100000);
      expect(overview.totalPnl).toBe(10000);
    });
  });

  describe('equity curve and performance', () => {
    it('should record and retrieve equity curve', () => {
      const points = generateEquityCurve(50000, 30);
      for (const p of points) {
        dashboard.recordEquityPoint('agent_1', p);
      }

      const curve = dashboard.getEquityCurve('agent_1', 'all_time');
      expect(curve.length).toBe(points.length);
    });

    it('should generate equity curve chart', () => {
      const points = generateEquityCurve(50000, 30);
      for (const p of points) {
        dashboard.recordEquityPoint('agent_1', p);
      }

      const chart = dashboard.getChartData('equity_curve', 'agent_1', '30d');
      expect(chart.type).toBe('equity_curve');
      expect(chart.series.length).toBeGreaterThan(0);
    });
  });

  describe('strategy allocation', () => {
    it('should update and retrieve strategy allocation', () => {
      const alloc = createAllocation({ strategyId: 'strat_1', strategyName: 'Alpha Fund' });
      dashboard.updateStrategyAllocation('agent_1', alloc);

      const breakdown = dashboard.getAllocationBreakdown('agent_1');
      expect(breakdown.strategies.length).toBe(1);
      expect(breakdown.strategies[0]!.strategyName).toBe('Alpha Fund');
    });

    it('should record allocation timeline snapshot on update', () => {
      const alloc = createAllocation({ strategyId: 'strat_1' });
      dashboard.updateStrategyAllocation('agent_1', alloc);

      const breakdown = dashboard.getAllocationBreakdown('agent_1');
      expect(breakdown.timeline.length).toBe(1);
    });

    it('should generate allocation pie chart', () => {
      const alloc1 = createAllocation({
        strategyId: 'strat_1',
        strategyName: 'Strategy A',
        allocatedPercent: 60,
      });
      const alloc2 = createAllocation({
        strategyId: 'strat_2',
        strategyName: 'Strategy B',
        allocatedPercent: 40,
      });
      dashboard.updateStrategyAllocation('agent_1', alloc1);
      dashboard.updateStrategyAllocation('agent_1', alloc2);

      const chart = dashboard.getChartData('allocation_pie', 'agent_1', 'all_time');
      expect(chart.type).toBe('allocation_pie');
      expect(chart.series[0]!.data.length).toBeGreaterThan(0);
    });
  });

  describe('risk monitoring', () => {
    it('should return risk panel for agent', () => {
      const panel = dashboard.getRiskPanel('agent_1');

      expect(panel.agentId).toBe('agent_1');
      expect(panel.riskScore).toBeGreaterThanOrEqual(0);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(panel.riskGrade);
    });

    it('should trigger risk alert when leverage exceeds limit', () => {
      dashboard.updateExposureMetrics('agent_1', {
        grossLeverage: 5,
        netLeverage: 4,
        totalExposure: 100000,
        netExposure: 80000,
        topConcentrations: [],
      });

      dashboard.evaluateRiskAlerts('agent_1');
      const panel = dashboard.getRiskPanel('agent_1');

      expect(panel.activeAlerts.length).toBeGreaterThan(0);
      expect(panel.activeAlerts.some((a: RiskAlert) => a.type === 'leverage_limit')).toBe(true);
    });
  });

  describe('strategy comparison', () => {
    it('should compare strategies and find best performers', () => {
      const alloc1 = createAllocation({
        strategyId: 'strat_1',
        strategyName: 'Strategy A',
        allocatedCapital: 10000,
        pnl: 3000, // 30% ROI
      });
      const alloc2 = createAllocation({
        strategyId: 'strat_2',
        strategyName: 'Strategy B',
        allocatedCapital: 10000,
        pnl: 500, // 5% ROI
      });

      dashboard.updateStrategyAllocation('agent_1', alloc1);
      dashboard.updateStrategyAllocation('agent_1', alloc2);

      const result = dashboard.compareStrategies('agent_1', '30d');

      expect(result.strategies.length).toBe(2);
      expect(result.bestByROI).toBe('strat_1');
    });

    it('should record strategy trades for win rate computation', () => {
      const alloc = createAllocation({ strategyId: 'strat_1' });
      dashboard.updateStrategyAllocation('agent_1', alloc);

      for (let i = 0; i < 10; i++) {
        dashboard.recordStrategyTrade('agent_1', 'strat_1', {
          strategyId: 'strat_1',
          pnl: i % 4 === 0 ? -100 : 200,
          returnPercent: i % 4 === 0 ? -1 : 2,
          timestamp: new Date(),
        });
      }

      const result = dashboard.compareStrategies('agent_1', 'all_time');
      const strat1 = result.strategies.find(s => s.strategyId === 'strat_1');

      expect(strat1).toBeDefined();
      expect(strat1!.winRate).toBeGreaterThan(0);
    });
  });

  describe('trade history', () => {
    it('should record and retrieve trade history', () => {
      dashboard.recordTrade('agent_1', {
        agentId: 'agent_1',
        type: 'trade_executed',
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: 0.1,
        price: 40000,
        value: 4000,
        fees: 4,
        pnl: 0,
        description: 'Bought 0.1 BTC',
      });

      const history = dashboard.getTradeHistory('agent_1');
      expect(history.activities.length).toBe(1);
    });

    it('should compute trade history summary', () => {
      for (let i = 0; i < 5; i++) {
        dashboard.recordTrade('agent_1', {
          agentId: 'agent_1',
          type: 'trade_executed',
          value: 1000,
          pnl: i % 2 === 0 ? 50 : -25,
          fees: 1,
          description: `Trade ${i}`,
        });
      }

      const summary = dashboard.getTradeHistorySummary('agent_1', 'all_time');

      expect(summary.totalTrades).toBe(5);
      expect(summary.totalVolume).toBe(5000);
      expect(summary.totalFees).toBe(5);
    });
  });

  describe('full dashboard metrics', () => {
    it('should build complete dashboard metrics', async () => {
      // Setup data
      dashboard.updatePortfolioValue('agent_1', 100000, 10000);

      const points = generateEquityCurve(90000, 30);
      for (const p of points) {
        dashboard.recordEquityPoint('agent_1', p);
      }

      const alloc = createAllocation({
        strategyId: 'strat_1',
        strategyName: 'Main Strategy',
        allocatedCapital: 90000,
        pnl: 10000,
      });
      dashboard.updateStrategyAllocation('agent_1', alloc);

      const metrics = await dashboard.getDashboardMetrics('agent_1', '30d');

      expect(metrics.agentId).toBe('agent_1');
      expect(metrics.period).toBe('30d');
      expect(metrics.overview).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.allocation).toBeDefined();
      expect(metrics.risk).toBeDefined();
      expect(metrics.strategyComparison).toBeDefined();
      expect(metrics.tradeHistory).toBeDefined();
      expect(metrics.generatedAt).toBeDefined();
    });
  });

  describe('report generation', () => {
    it('should generate a portfolio report', () => {
      dashboard.updatePortfolioValue('agent_1', 50000, 5000);

      const points = generateEquityCurve(45000, 30);
      for (const p of points) {
        dashboard.recordEquityPoint('agent_1', p);
      }

      const report = dashboard.generateReport('agent_1', '30d', 'json');

      expect(report.id).toBeDefined();
      expect(report.agentId).toBe('agent_1');
      expect(report.period).toBe('30d');
      expect(report.format).toBe('json');
      expect(report.summary.length).toBeGreaterThan(0);
      expect(report.charts.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeDefined();
    });

    it('should include charts in the report', () => {
      const report = dashboard.generateReport('agent_1', 'all_time', 'summary');

      const chartTypes = report.charts.map(c => c.type);
      expect(chartTypes).toContain('equity_curve');
      expect(chartTypes).toContain('daily_returns');
      expect(chartTypes).toContain('allocation_pie');
    });
  });

  describe('health and metrics', () => {
    it('should report healthy status initially', () => {
      const health = dashboard.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.dataModel).toBe(true);
      expect(health.components.analyticsEngine).toBe(true);
      expect(health.components.riskMonitor).toBe(true);
      expect(health.components.strategyComparison).toBe(true);
      expect(health.components.tradeHistory).toBe(true);
    });

    it('should track number of agents', () => {
      dashboard.getPortfolioOverview('agent_1');
      dashboard.getPortfolioOverview('agent_2');
      dashboard.getPortfolioOverview('agent_3');

      const metrics = dashboard.getDashboardOperationalMetrics();
      expect(metrics.totalAgentsTracked).toBe(3);
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all sub-components', () => {
      const events: PortfolioAnalyticsEvent[] = [];
      dashboard.onEvent(e => events.push(e));

      // Trigger events from different sub-components
      dashboard.updatePortfolioValue('agent_1', 50000, 5000);
      dashboard.updateStrategyAllocation('agent_1', createAllocation({ strategyId: 'strat_1' }));

      expect(events.length).toBeGreaterThan(0);
    });

    it('should emit report_generated event', () => {
      const events: PortfolioAnalyticsEvent[] = [];
      dashboard.onEvent(e => events.push(e));

      dashboard.generateReport('agent_1', '30d', 'json');

      expect(events.some(e => e.type === 'report_generated')).toBe(true);
    });
  });
});

// ============================================================================
// Demo: Full Portfolio Analytics Flow
// ============================================================================

describe('Portfolio Analytics Demo Flow', () => {
  it('should demonstrate complete portfolio analytics workflow', async () => {
    const dashboard = createPortfolioAnalyticsDashboard({
      drawdownAlertThreshold: 15,
      concentrationAlertThreshold: 35,
    });

    const agentId = 'demo_agent_001';
    const events: PortfolioAnalyticsEvent[] = [];
    dashboard.onEvent(e => events.push(e));

    // 1. Portfolio Overview: Initialize portfolio
    dashboard.updatePortfolioValue(agentId, 1_000_000, 0);

    // 2. Strategy Allocation Breakdown: Set up allocations
    const strategies = [
      { id: 'momentum_01', name: 'Momentum Alpha', capital: 400000, pnl: 50000, percent: 40 },
      { id: 'arbitrage_01', name: 'Arb Strategy', capital: 300000, pnl: 20000, percent: 30 },
      { id: 'market_making_01', name: 'Market Making', capital: 200000, pnl: -5000, percent: 20 },
      { id: 'carry_01', name: 'Carry Trade', capital: 100000, pnl: 8000, percent: 10 },
    ];

    for (const s of strategies) {
      dashboard.updateStrategyAllocation(agentId, {
        strategyId: s.id,
        strategyName: s.name,
        allocatedCapital: s.capital,
        allocatedPercent: s.percent,
        currentValue: s.capital + s.pnl,
        pnl: s.pnl,
        pnlPercent: (s.pnl / s.capital) * 100,
        contributionToReturn: (s.pnl / 1_000_000) * 100,
        status: 'active',
        lastRebalanced: new Date(),
      });
    }

    // 3. Performance Visualization: Add equity curve data
    const equityPoints = generateEquityCurve(1_000_000, 90, 0.15);
    for (const p of equityPoints) {
      dashboard.recordEquityPoint(agentId, p);
    }

    // 4. Trade Activity History: Record trades
    const tradeSymbols = ['TON/USDT', 'BTC/USDT', 'ETH/USDT'];
    for (let i = 0; i < 20; i++) {
      dashboard.recordTrade(agentId, {
        agentId,
        strategyId: strategies[i % 4]!.id,
        strategyName: strategies[i % 4]!.name,
        type: 'trade_executed',
        symbol: tradeSymbols[i % 3],
        side: i % 2 === 0 ? 'buy' : 'sell',
        quantity: 100 + i * 10,
        price: 2.5 + i * 0.05,
        value: (100 + i * 10) * (2.5 + i * 0.05),
        pnl: i % 3 === 0 ? -500 : 1200,
        fees: 5 + i,
        description: `Strategy execution for ${strategies[i % 4]!.name}`,
      });
    }

    // Record strategy trades for comparison
    for (const s of strategies) {
      for (let t = 0; t < 15; t++) {
        dashboard.recordStrategyTrade(agentId, s.id, {
          strategyId: s.id,
          pnl: t % 4 === 0 ? -200 : 400,
          returnPercent: t % 4 === 0 ? -2 : 4,
          timestamp: new Date(Date.now() - t * 24 * 60 * 60 * 1000),
        });
      }
    }

    // 5. Risk Monitoring: Evaluate alerts
    dashboard.evaluateRiskAlerts(agentId);

    // 6. Get Full Dashboard Metrics
    const metrics = await dashboard.getDashboardMetrics(agentId, '90d');

    // Assertions: Portfolio Overview
    expect(metrics.overview.strategyCount).toBe(4);

    // Assertions: Performance
    expect(metrics.performance.equityCurve.length).toBeGreaterThan(0);
    expect(metrics.performance.dailyReturns.length).toBeGreaterThan(0);
    expect(metrics.performance.cumulativeReturns.length).toBeGreaterThan(0);
    expect(metrics.performance.benchmarkComparisons.length).toBeGreaterThan(0);

    // Assertions: Allocation
    expect(metrics.allocation.strategies.length).toBe(4);

    // Assertions: Risk
    expect(metrics.risk.agentId).toBe(agentId);
    expect(metrics.risk.riskGrade).toMatch(/[ABCDF]/);

    // Assertions: Strategy Comparison
    expect(metrics.strategyComparison.strategies.length).toBe(4);
    expect(metrics.strategyComparison.bestByROI).toBeDefined();

    // Assertions: Trade History
    expect(metrics.tradeHistory.totalTrades).toBe(20);
    expect(metrics.tradeHistory.totalVolume).toBeGreaterThan(0);

    // Assertions: Report
    const report = dashboard.generateReport(agentId, '90d', 'json');
    expect(report.summary).toContain('TON');
    expect(report.charts.length).toBeGreaterThan(0);

    // Assertions: Health
    const health = dashboard.getHealth();
    expect(health.overall).toBe('healthy');

    // Assertions: Events were emitted
    expect(events.length).toBeGreaterThan(0);
  });
});
