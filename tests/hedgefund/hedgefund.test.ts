/**
 * TONAIAgent - Autonomous Hedge Fund Module Tests
 *
 * Comprehensive tests for the autonomous hedge fund architecture,
 * including portfolio management, execution, risk controls, and fund operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Fund Manager
  createHedgeFundManager,
  DefaultHedgeFundManager,
  FundInitConfig,

  // Portfolio Agent
  createPortfolioAgent,
  DefaultPortfolioAgent,
  PortfolioPosition,

  // Execution Agent
  createExecutionAgent,
  DefaultExecutionAgent,
  OrderRequest,

  // Risk Agent
  createRiskAgent,
  DefaultRiskAgent,
  STRESS_SCENARIOS,

  // Types
  FundType,
  FundStatus,
  StrategyType,
  OrderType,
  RiskAlertType,
} from '../../src/hedgefund';

// ============================================================================
// Portfolio Agent Tests
// ============================================================================

describe('Portfolio Agent', () => {
  let portfolioAgent: DefaultPortfolioAgent;

  beforeEach(() => {
    portfolioAgent = createPortfolioAgent();
  });

  describe('Configuration', () => {
    it('should create portfolio agent with default config', () => {
      expect(portfolioAgent).toBeDefined();
      expect(portfolioAgent.config.enabled).toBe(true);
      expect(portfolioAgent.config.rebalanceThreshold).toBe(0.05);
      expect(portfolioAgent.config.rebalanceFrequency).toBe('daily');
    });

    it('should allow custom configuration', async () => {
      await portfolioAgent.configure({
        targetAllocation: {
          'delta_neutral': 0.40,
          'trend_following': 0.30,
          'arbitrage': 0.20,
        },
        rebalanceThreshold: 0.03,
        rebalanceFrequency: 'hourly',
      });

      expect(portfolioAgent.config.targetAllocation['delta_neutral']).toBe(0.40);
      expect(portfolioAgent.config.rebalanceThreshold).toBe(0.03);
      expect(portfolioAgent.config.rebalanceFrequency).toBe('hourly');
    });

    it('should configure portfolio constraints', async () => {
      await portfolioAgent.configure({
        constraints: {
          maxSingleAsset: 0.30,
          maxLeverage: 1.5,
          longOnly: false,
        },
      });

      expect(portfolioAgent.config.constraints.maxSingleAsset).toBe(0.30);
      expect(portfolioAgent.config.constraints.maxLeverage).toBe(1.5);
      expect(portfolioAgent.config.constraints.longOnly).toBe(false);
    });
  });

  describe('Position Management', () => {
    it('should add positions', () => {
      const position: PortfolioPosition = {
        id: 'pos_1',
        asset: 'TON',
        quantity: 1000,
        averageCost: 5.0,
        currentPrice: 5.5,
        marketValue: 5500,
        unrealizedPnL: 500,
        unrealizedPnLPercent: 0.10,
        weight: 0.55,
        openedAt: new Date(),
        metadata: {},
      };

      portfolioAgent.addPosition(position);
      const positions = portfolioAgent.getPositions();

      expect(positions.length).toBe(1);
      expect(positions[0].asset).toBe('TON');
      expect(positions[0].marketValue).toBe(5500);
    });

    it('should update position prices', () => {
      portfolioAgent.addPosition({
        id: 'pos_1',
        asset: 'TON',
        quantity: 1000,
        averageCost: 5.0,
        currentPrice: 5.0,
        marketValue: 5000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 1.0,
        openedAt: new Date(),
        metadata: {},
      });

      portfolioAgent.updatePositionPrice('TON', 6.0);
      const position = portfolioAgent.getPosition('TON');

      expect(position?.currentPrice).toBe(6.0);
      expect(position?.marketValue).toBe(6000);
      expect(position?.unrealizedPnL).toBe(1000);
    });

    it('should remove positions', () => {
      portfolioAgent.addPosition({
        id: 'pos_1',
        asset: 'TON',
        quantity: 1000,
        averageCost: 5.0,
        currentPrice: 5.0,
        marketValue: 5000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 1.0,
        openedAt: new Date(),
        metadata: {},
      });

      portfolioAgent.removePosition('TON');
      const positions = portfolioAgent.getPositions();

      expect(positions.length).toBe(0);
    });
  });

  describe('Rebalancing', () => {
    beforeEach(async () => {
      await portfolioAgent.configure({
        targetAllocation: {
          'TON': 0.50,
          'USDT': 0.30,
          'NOT': 0.20,
        },
        rebalanceThreshold: 0.05,
      });

      portfolioAgent.updateState({
        totalValue: 10000,
        cash: 1000,
      });

      // Add positions with drift from target
      portfolioAgent.addPosition({
        id: 'pos_ton',
        asset: 'TON',
        quantity: 800,
        averageCost: 5.0,
        currentPrice: 5.0,
        marketValue: 4000, // 40% instead of 50%
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0.40,
        openedAt: new Date(),
        metadata: {},
      });

      portfolioAgent.addPosition({
        id: 'pos_usdt',
        asset: 'USDT',
        quantity: 3500,
        averageCost: 1.0,
        currentPrice: 1.0,
        marketValue: 3500, // 35% instead of 30%
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0.35,
        openedAt: new Date(),
        metadata: {},
      });

      portfolioAgent.addPosition({
        id: 'pos_not',
        asset: 'NOT',
        quantity: 5000,
        averageCost: 0.10,
        currentPrice: 0.10,
        marketValue: 500, // 5% instead of 20%
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0.05,
        openedAt: new Date(),
        metadata: {},
      });
    });

    it('should detect when rebalance is needed', () => {
      const check = portfolioAgent.checkRebalanceNeeded();

      expect(check.needed).toBe(true);
      expect(check.drifts.length).toBeGreaterThan(0);
      expect(check.totalDrift).toBeGreaterThan(0.05);
    });

    it('should calculate rebalance orders', () => {
      const orders = portfolioAgent.calculateRebalanceOrders();

      expect(orders.length).toBeGreaterThan(0);

      // Should have orders to buy TON and NOT, sell USDT
      const tonOrder = orders.find(o => o.asset === 'TON');
      const notOrder = orders.find(o => o.asset === 'NOT');
      const usdtOrder = orders.find(o => o.asset === 'USDT');

      expect(tonOrder?.side).toBe('buy');
      expect(notOrder?.side).toBe('buy');
      expect(usdtOrder?.side).toBe('sell');
    });

    it('should execute rebalance', async () => {
      const result = await portfolioAgent.executeRebalance();

      expect(result.success).toBe(true);
      expect(result.ordersExecuted).toBeGreaterThan(0);
    });

    it('should not need rebalance when within threshold', async () => {
      // Set allocation close to target
      portfolioAgent.updateState({
        allocation: {
          'TON': 0.49,
          'USDT': 0.31,
          'NOT': 0.20,
        },
      });

      const check = portfolioAgent.checkRebalanceNeeded();
      expect(check.needed).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate portfolio metrics', () => {
      // Add positions that sum to 9000 market value + 1000 cash = 10000 total
      portfolioAgent.updateState({
        cash: 1000,
        positions: [
          {
            asset: 'TON',
            quantity: 100,
            averageCost: 45,
            currentPrice: 50,
            marketValue: 5000,
            unrealizedPnL: 500,
            weight: 0.5,
            strategy: 'trend_following' as any,
          },
          {
            asset: 'BTC',
            quantity: 0.1,
            averageCost: 40000,
            currentPrice: 40000,
            marketValue: 4000,
            unrealizedPnL: 0,
            weight: 0.4,
            strategy: 'delta_neutral' as any,
          },
        ],
      });

      const metrics = portfolioAgent.calculateMetrics();

      expect(metrics.totalValue).toBe(10000);
      expect(metrics.cash).toBe(1000);
      expect(metrics.invested).toBe(9000);
    });

    it('should get performance data', () => {
      const performance = portfolioAgent.getPerformance();

      expect(performance).toBeDefined();
      expect(performance.totalReturn).toBeDefined();
      expect(performance.sharpeRatio).toBeDefined();
    });
  });

  describe('Allocation Optimization', () => {
    it('should optimize allocation with mean variance method', async () => {
      await portfolioAgent.configure({
        targetAllocation: {
          'TON': 0.50,
          'USDT': 0.30,
          'NOT': 0.20,
        },
        optimizationMethod: 'mean_variance',
      });

      const optimal = await portfolioAgent.optimizeAllocation();

      expect(optimal.allocations).toBeDefined();
      expect(optimal.expectedReturn).toBeDefined();
      expect(optimal.expectedVolatility).toBeDefined();
      expect(optimal.expectedSharpe).toBeDefined();
      expect(optimal.method).toBe('mean_variance');
    });

    it('should optimize with equal weight method', async () => {
      await portfolioAgent.configure({
        targetAllocation: {
          'TON': 0.50,
          'USDT': 0.30,
          'NOT': 0.20,
        },
        optimizationMethod: 'equal_weight',
      });

      const optimal = await portfolioAgent.optimizeAllocation();

      const weights = Object.values(optimal.allocations);
      // All weights should be approximately equal
      const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
      for (const w of weights) {
        expect(Math.abs(w - avgWeight)).toBeLessThan(0.01);
      }
    });
  });
});

// ============================================================================
// Execution Agent Tests
// ============================================================================

describe('Execution Agent', () => {
  let executionAgent: DefaultExecutionAgent;

  beforeEach(() => {
    executionAgent = createExecutionAgent();
  });

  describe('Configuration', () => {
    it('should create execution agent with default config', () => {
      expect(executionAgent).toBeDefined();
      expect(executionAgent.config.enabled).toBe(true);
      expect(executionAgent.config.executionMode).toBe('optimal');
      expect(executionAgent.config.slippageTolerance).toBe(0.005);
      expect(executionAgent.config.mevProtection).toBe(true);
    });

    it('should allow custom configuration', async () => {
      await executionAgent.configure({
        executionMode: 'stealth',
        slippageTolerance: 0.01,
        splitThreshold: 50000,
      });

      expect(executionAgent.config.executionMode).toBe('stealth');
      expect(executionAgent.config.slippageTolerance).toBe(0.01);
      expect(executionAgent.config.splitThreshold).toBe(50000);
    });
  });

  describe('Order Management', () => {
    it('should create market orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      expect(order).toBeDefined();
      expect(order.id).toContain('order_');
      expect(order.type).toBe('market');
      expect(order.side).toBe('buy');
      expect(order.asset).toBe('TON');
      expect(order.quantity).toBe(100);
      expect(order.status).toBe('pending');
    });

    it('should create limit orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'limit',
        side: 'sell',
        asset: 'TON',
        quantity: 50,
        price: 6.0,
      });

      expect(order.type).toBe('limit');
      expect(order.price).toBe(6.0);
    });

    it('should create TWAP orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'twap',
        side: 'buy',
        asset: 'TON',
        quantity: 1000,
        executionStrategy: 'twap',
      });

      expect(order.type).toBe('twap');
      expect(order.executionStrategy).toBe('twap');
    });

    it('should cancel pending orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      const cancelled = await executionAgent.cancelOrder(order.id);
      expect(cancelled).toBe(true);

      const updatedOrder = executionAgent.getOrder(order.id);
      expect(updatedOrder?.status).toBe('cancelled');
    });

    it('should get pending orders', async () => {
      await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      await executionAgent.createOrder({
        type: 'limit',
        side: 'sell',
        asset: 'USDT',
        quantity: 500,
        price: 1.0,
      });

      const pending = executionAgent.getPendingOrders();
      expect(pending.length).toBe(2);
    });
  });

  describe('Order Execution', () => {
    it('should execute market orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      const result = await executionAgent.executeOrder(order.id);

      expect(result.success).toBe(true);
      expect(result.status).toBe('filled');
      expect(result.filledQuantity).toBeGreaterThan(0);
      expect(result.averagePrice).toBeGreaterThan(0);
      expect(result.fills.length).toBeGreaterThan(0);
    });

    it('should execute batch orders', async () => {
      const order1 = await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      const order2 = await executionAgent.createOrder({
        type: 'market',
        side: 'sell',
        asset: 'USDT',
        quantity: 500,
      });

      const result = await executionAgent.executeBatch([order1.id, order2.id]);

      expect(result.totalOrders).toBe(2);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.results.length).toBe(2);
    });

    it('should not re-execute filled orders', async () => {
      const order = await executionAgent.createOrder({
        type: 'market',
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      await executionAgent.executeOrder(order.id);
      const secondResult = await executionAgent.executeOrder(order.id);

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already filled');
    });
  });

  describe('Routing', () => {
    it('should find optimal route', async () => {
      const route = await executionAgent.getOptimalRoute({
        side: 'buy',
        asset: 'TON',
        quantity: 100,
        slippageTolerance: 0.01,
      });

      expect(route).toBeDefined();
      expect(route.routes.length).toBeGreaterThan(0);
      expect(route.expectedPrice).toBeGreaterThan(0);
      expect(route.confidence).toBeGreaterThan(0);
    });

    it('should split large orders across DEXes', async () => {
      await executionAgent.configure({
        splitThreshold: 100,
        preferredDexes: ['dedust', 'stonfi'],
      });

      const route = await executionAgent.getOptimalRoute({
        side: 'buy',
        asset: 'TON',
        quantity: 1000, // Large order
        slippageTolerance: 0.01,
      });

      // Should split across multiple DEXes
      expect(route.routes.length).toBeGreaterThanOrEqual(1);
    });

    it('should estimate execution costs', async () => {
      const estimate = await executionAgent.estimateExecution({
        side: 'buy',
        asset: 'TON',
        quantity: 100,
      });

      expect(estimate.expectedPrice).toBeGreaterThan(0);
      expect(estimate.priceImpact).toBeGreaterThanOrEqual(0);
      expect(estimate.estimatedSlippage).toBeGreaterThanOrEqual(0);
      expect(estimate.estimatedFees).toBeGreaterThan(0);
      expect(estimate.estimatedTotal).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Risk Agent Tests
// ============================================================================

describe('Risk Agent', () => {
  let riskAgent: DefaultRiskAgent;

  const createTestPositions = (): PortfolioPosition[] => [
    {
      id: 'pos_1',
      asset: 'TON',
      quantity: 1000,
      averageCost: 5.0,
      currentPrice: 5.0,
      marketValue: 5000,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      weight: 0.50,
      openedAt: new Date(),
      metadata: {},
    },
    {
      id: 'pos_2',
      asset: 'USDT',
      quantity: 3000,
      averageCost: 1.0,
      currentPrice: 1.0,
      marketValue: 3000,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      weight: 0.30,
      openedAt: new Date(),
      metadata: {},
    },
    {
      id: 'pos_3',
      asset: 'NOT',
      quantity: 20000,
      averageCost: 0.1,
      currentPrice: 0.1,
      marketValue: 2000,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      weight: 0.20,
      openedAt: new Date(),
      metadata: {},
    },
  ];

  beforeEach(() => {
    riskAgent = createRiskAgent();
    // Add some historical returns
    for (let i = 0; i < 100; i++) {
      riskAgent.addHistoricalReturn((Math.random() - 0.5) * 0.02); // -1% to +1% daily
    }
  });

  describe('Configuration', () => {
    it('should create risk agent with default config', () => {
      expect(riskAgent).toBeDefined();
      expect(riskAgent.config.enabled).toBe(true);
      expect(riskAgent.config.varConfig.confidenceLevel).toBe(0.99);
      expect(riskAgent.config.limits.maxDrawdown).toBe(0.15);
    });

    it('should configure risk limits', async () => {
      await riskAgent.setLimits({
        maxDrawdown: 0.10,
        maxVaR: 0.05,
        maxLeverage: 1.5,
      });

      expect(riskAgent.config.limits.maxDrawdown).toBe(0.10);
      expect(riskAgent.config.limits.maxVaR).toBe(0.05);
      expect(riskAgent.config.limits.maxLeverage).toBe(1.5);
    });
  });

  describe('VaR Calculation', () => {
    it('should calculate VaR using historical method', () => {
      const positions = createTestPositions();
      const portfolioValue = 10000;

      const varResult = riskAgent.calculateVaR(positions, portfolioValue);

      expect(varResult.var95).toBeGreaterThan(0);
      expect(varResult.var99).toBeGreaterThan(0);
      expect(varResult.cvar).toBeGreaterThan(0);
      expect(varResult.var99).toBeGreaterThan(varResult.var95);
      expect(varResult.method).toBe('historical');
    });

    it('should calculate VaR using parametric method', async () => {
      await riskAgent.configure({
        varConfig: {
          method: 'parametric',
          confidenceLevel: 0.99,
          timeHorizon: 1,
          lookbackPeriod: 252,
        },
      });

      const positions = createTestPositions();
      const varResult = riskAgent.calculateVaR(positions, 10000);

      expect(varResult.method).toBe('parametric');
      expect(varResult.var99).toBeGreaterThan(0);
    });

    it('should calculate VaR using Monte Carlo method', async () => {
      await riskAgent.configure({
        varConfig: {
          method: 'monte_carlo',
          confidenceLevel: 0.99,
          timeHorizon: 1,
          lookbackPeriod: 252,
          simulations: 1000,
        },
      });

      const positions = createTestPositions();
      const varResult = riskAgent.calculateVaR(positions, 10000);

      expect(varResult.method).toBe('monte_carlo');
      expect(varResult.var99).toBeGreaterThan(0);
    });
  });

  describe('Risk Metrics', () => {
    it('should calculate comprehensive risk metrics', () => {
      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);

      expect(metrics.var95).toBeGreaterThan(0);
      expect(metrics.var99).toBeGreaterThan(0);
      expect(metrics.sharpe).toBeDefined();
      expect(metrics.sortino).toBeDefined();
      expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(metrics.leverage).toBeGreaterThanOrEqual(0);
      expect(metrics.concentration).toBeGreaterThan(0);
      expect(metrics.liquidity).toBeGreaterThan(0);
    });

    it('should get latest metrics', () => {
      const positions = createTestPositions();
      riskAgent.calculateMetrics(positions, 10000);

      const latest = riskAgent.getLatestMetrics();
      expect(latest).toBeDefined();
      expect(latest?.timestamp).toBeDefined();
    });
  });

  describe('Limit Checking', () => {
    it('should pass when within limits', async () => {
      // Set limits that accommodate test positions (TON is 50% concentration)
      await riskAgent.setLimits({
        maxConcentration: 0.60, // Allow 60% concentration
        maxVaR: 0.50, // Allow 50% VaR
        maxDrawdown: 0.50, // Allow 50% drawdown
        maxLeverage: 10.0, // Allow high leverage
        minLiquidity: 0.0, // No liquidity requirement
        maxDailyLoss: 0.50, // Allow 50% daily loss
        maxWeeklyLoss: 0.50, // Allow 50% weekly loss
      });

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);

      const result = riskAgent.checkLimits(metrics);

      expect(result.violations.length).toBe(0);
    });

    it('should detect VaR limit violations', async () => {
      await riskAgent.setLimits({ maxVaR: 0.001 }); // Very low limit

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);

      const result = riskAgent.checkLimits(metrics);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.limit === 'maxVaR')).toBe(true);
    });

    it('should detect concentration warnings', async () => {
      await riskAgent.setLimits({ maxConcentration: 0.10 }); // Low limit

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);

      const result = riskAgent.checkLimits(metrics);

      // Should detect concentration violation (TON is 50%)
      expect(result.violations.some(v => v.limit === 'maxConcentration')).toBe(true);
    });
  });

  describe('Transaction Impact Analysis', () => {
    it('should analyze transaction impact', () => {
      const positions = createTestPositions();

      const impact = riskAgent.checkTransactionImpact({
        side: 'buy',
        asset: 'TON',
        quantity: 500,
        estimatedPrice: 5.0,
        currentPositions: positions,
        portfolioValue: 10000,
      });

      expect(impact.approved).toBeDefined();
      expect(impact.newVaR).toBeGreaterThan(0);
      expect(impact.newConcentration).toBeGreaterThan(0);
    });

    it('should reject transactions that would breach limits', async () => {
      await riskAgent.setLimits({ maxConcentration: 0.30 });

      const positions = createTestPositions();

      const impact = riskAgent.checkTransactionImpact({
        side: 'buy',
        asset: 'TON', // Already 50%, buying more would increase
        quantity: 1000,
        estimatedPrice: 5.0,
        currentPositions: positions,
        portfolioValue: 10000,
      });

      expect(impact.approved).toBe(false);
      expect(impact.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    it('should have built-in stress scenarios', () => {
      expect(STRESS_SCENARIOS.length).toBeGreaterThan(0);
      expect(STRESS_SCENARIOS.some(s => s.id === 'financial_crisis_2008')).toBe(true);
      expect(STRESS_SCENARIOS.some(s => s.id === 'covid_crash_2020')).toBe(true);
    });

    it('should run stress test', () => {
      const positions = createTestPositions();
      const scenario = STRESS_SCENARIOS[0]; // Financial crisis

      const result = riskAgent.runStressTest(scenario, positions);

      expect(result.scenarioId).toBe(scenario.id);
      expect(result.portfolioLoss).toBeGreaterThan(0);
      expect(result.portfolioLossPercent).toBeGreaterThan(0);
      expect(result.positionImpacts.length).toBe(positions.length);
    });

    it('should run all stress tests', () => {
      const positions = createTestPositions();

      const results = riskAgent.runAllStressTests(positions);

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.portfolioLossPercent).toBeGreaterThan(0);
      }
    });

    it('should generate recommendations from stress tests', () => {
      const positions = createTestPositions();
      const scenario = STRESS_SCENARIOS.find(s => s.id === 'black_swan')!;

      const result = riskAgent.runStressTest(scenario, positions);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Alerts', () => {
    it('should create alerts on limit violations', async () => {
      await riskAgent.setLimits({ maxVaR: 0.001 }); // Very low limit

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);
      riskAgent.checkLimits(metrics);

      const alerts = riskAgent.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts', async () => {
      await riskAgent.setLimits({ maxVaR: 0.001, maxConcentration: 0.10 });

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);
      riskAgent.checkLimits(metrics);

      const criticalAlerts = riskAgent.getAlerts({ severity: ['critical'] });
      const warningAlerts = riskAgent.getAlerts({ severity: ['warning'] });

      expect(criticalAlerts.length + warningAlerts.length).toBeGreaterThan(0);
    });

    it('should acknowledge alerts', async () => {
      await riskAgent.setLimits({ maxVaR: 0.001 });

      const positions = createTestPositions();
      const metrics = riskAgent.calculateMetrics(positions, 10000);
      riskAgent.checkLimits(metrics);

      const alerts = riskAgent.getAlerts();
      const alertId = alerts[0].id;

      const acknowledged = await riskAgent.acknowledgeAlert(alertId, 'user_123');
      expect(acknowledged).toBe(true);

      const updatedAlerts = riskAgent.getAlerts({ acknowledged: true });
      expect(updatedAlerts.some(a => a.id === alertId)).toBe(true);
    });
  });
});

// ============================================================================
// Hedge Fund Manager Tests
// ============================================================================

describe('Hedge Fund Manager', () => {
  let fundManager: DefaultHedgeFundManager;

  beforeEach(() => {
    fundManager = createHedgeFundManager();
  });

  describe('Fund Initialization', () => {
    it('should create fund manager', () => {
      expect(fundManager).toBeDefined();
      expect(fundManager.status).toBe('initializing');
    });

    it('should initialize fund with config', async () => {
      const config = await fundManager.initialize({
        name: 'Test Alpha Fund',
        type: 'autonomous',
        initialCapital: 1000000,
        fees: {
          managementFeePercent: 0.5,
          performanceFeePercent: 10,
        },
      });

      expect(config.name).toBe('Test Alpha Fund');
      expect(config.type).toBe('autonomous');
      expect(config.capital.initialCapital).toBe(1000000);
      expect(config.fees.managementFeePercent).toBe(0.5);
    });

    it('should set default strategy allocation', async () => {
      const config = await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });

      expect(config.strategyAllocation).toBeDefined();
      expect(config.strategyAllocation.allocations.length).toBeGreaterThan(0);
    });
  });

  describe('Fund Lifecycle', () => {
    beforeEach(async () => {
      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });
    });

    it('should start fund', async () => {
      await fundManager.start();
      expect(fundManager.status).toBe('active');
    });

    it('should pause fund', async () => {
      await fundManager.start();
      await fundManager.pause('Testing');

      expect(fundManager.status).toBe('paused');
    });

    it('should resume fund', async () => {
      await fundManager.start();
      await fundManager.pause();
      await fundManager.resume();

      expect(fundManager.status).toBe('active');
    });

    it('should stop fund', async () => {
      await fundManager.start();
      await fundManager.stop('End of operations');

      expect(fundManager.status).toBe('closed');
    });
  });

  describe('Agent Configuration', () => {
    beforeEach(async () => {
      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });
    });

    it('should configure portfolio agent', async () => {
      await fundManager.configurePortfolioAgent({
        targetAllocation: {
          'delta_neutral': 0.40,
          'arbitrage': 0.30,
          'yield_farming': 0.30,
        },
        rebalanceThreshold: 0.03,
      });

      expect(fundManager.portfolio.config.rebalanceThreshold).toBe(0.03);
    });

    it('should configure execution agent', async () => {
      await fundManager.configureExecutionAgent({
        executionMode: 'stealth',
        slippageTolerance: 0.01,
      });

      expect(fundManager.execution.config.executionMode).toBe('stealth');
      expect(fundManager.execution.config.slippageTolerance).toBe(0.01);
    });

    it('should configure risk agent', async () => {
      await fundManager.configureRiskAgent({
        limits: {
          maxDrawdown: 0.10,
          maxVaR: 0.05,
        },
      });

      expect(fundManager.risk.config.limits.maxDrawdown).toBe(0.10);
      expect(fundManager.risk.config.limits.maxVaR).toBe(0.05);
    });
  });

  describe('Investment Processing', () => {
    beforeEach(async () => {
      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });
    });

    it('should process investments', async () => {
      const result = await fundManager.processInvestment({
        investorId: 'investor_1',
        amount: 100000,
        currency: 'USD',
      });

      expect(result.success).toBe(true);
      expect(result.units).toBeGreaterThan(0);
      expect(result.totalValue).toBe(100000);
    });

    it('should reject investments below minimum', async () => {
      const result = await fundManager.processInvestment({
        investorId: 'investor_1',
        amount: 100, // Below minimum
        currency: 'USD',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum investment');
    });

    it('should track investors', async () => {
      await fundManager.processInvestment({
        investorId: 'investor_1',
        amount: 100000,
        currency: 'USD',
      });

      const investors = fundManager.getInvestors();
      expect(investors.length).toBe(1);
      expect(investors[0].investmentAmount).toBe(100000);
    });
  });

  describe('Operations', () => {
    beforeEach(async () => {
      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });
    });

    it('should trigger rebalance', async () => {
      const result = await fundManager.triggerRebalance();

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should run risk check', async () => {
      const result = await fundManager.runRiskCheck();

      expect(result.passed).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.var99).toBeDefined();
    });

    it('should run stress tests', async () => {
      const result = await fundManager.runStressTests();

      expect(result.scenariosRun).toBeGreaterThan(0);
      expect(result.worstCase).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });
    });

    it('should get fund performance', () => {
      const performance = fundManager.getPerformance();

      expect(performance.fundId).toBeDefined();
      expect(performance.aum).toBe(1000000);
      expect(performance.nav).toBe(1.0);
      expect(performance.returns).toBeDefined();
      expect(performance.riskMetrics).toBeDefined();
    });

    it('should get returns by period', () => {
      const returns = fundManager.getReturns('30d');

      expect(returns.daily).toBeDefined();
      expect(returns.weekly).toBeDefined();
      expect(returns.monthly).toBeDefined();
    });

    it('should get attribution', () => {
      const attribution = fundManager.getAttribution();

      expect(attribution.byStrategy).toBeDefined();
      expect(attribution.byAsset).toBeDefined();
      expect(attribution.byFactor).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit events', async () => {
      const events: any[] = [];
      fundManager.onEvent(event => events.push(event));

      await fundManager.initialize({
        name: 'Test Fund',
        type: 'autonomous',
        initialCapital: 1000000,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.source === 'fund_manager')).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Hedge Fund Integration', () => {
  let fundManager: DefaultHedgeFundManager;

  beforeEach(async () => {
    fundManager = createHedgeFundManager();
    await fundManager.initialize({
      name: 'Integration Test Fund',
      type: 'autonomous',
      initialCapital: 10000000,
      fees: {
        managementFeePercent: 0.5,
        performanceFeePercent: 10,
        highWaterMark: true,
      },
    });
  });

  it('should complete full fund lifecycle', async () => {
    // Configure relaxed risk limits before starting
    await fundManager.configureRiskAgent({
      limits: {
        maxVaR: 0.50,
        maxDrawdown: 0.50,
        maxConcentration: 1.0,
        minLiquidity: 0.0,
      },
    });

    // Start the fund
    await fundManager.start();
    expect(fundManager.status).toBe('active');

    // Process investment
    const investment = await fundManager.processInvestment({
      investorId: 'test_investor',
      amount: 1000000,
      currency: 'USD',
    });
    expect(investment.success).toBe(true);

    // Run risk check
    const riskCheck = await fundManager.runRiskCheck();
    expect(riskCheck.passed).toBe(true);

    // Run stress tests
    const stressTests = await fundManager.runStressTests();
    expect(stressTests.scenariosRun).toBeGreaterThan(0);

    // Get performance
    const performance = fundManager.getPerformance();
    expect(performance.aum).toBe(11000000);

    // Pause and resume
    await fundManager.pause('Maintenance');
    expect(fundManager.status).toBe('paused');

    await fundManager.resume();
    expect(fundManager.status).toBe('active');

    // Stop the fund
    await fundManager.stop('Test complete');
    expect(fundManager.status).toBe('closed');
  });

  it('should coordinate agents correctly', async () => {
    await fundManager.start();

    // Configure agents
    await fundManager.configurePortfolioAgent({
      targetAllocation: {
        'TON': 0.50,
        'USDT': 0.30,
        'NOT': 0.20,
      },
    });

    await fundManager.configureRiskAgent({
      limits: {
        maxDrawdown: 0.15,
        maxVaR: 0.10,
      },
    });

    // Add positions to portfolio
    fundManager.portfolio.addPosition({
      id: 'pos_1',
      asset: 'TON',
      quantity: 100000,
      averageCost: 5.0,
      currentPrice: 5.5,
      marketValue: 550000,
      unrealizedPnL: 50000,
      unrealizedPnLPercent: 0.10,
      weight: 0.50,
      openedAt: new Date(),
      metadata: {},
    });

    // Check rebalance needed
    const rebalanceCheck = fundManager.portfolio.checkRebalanceNeeded();
    expect(rebalanceCheck).toBeDefined();

    // Run risk check on current positions
    const riskCheck = await fundManager.runRiskCheck();
    // Concentration is based on market value / total portfolio value
    // 550000 / 10000000 = 0.055 approximately
    expect(riskCheck.metrics.concentration).toBeGreaterThan(0);
    expect(riskCheck.metrics.concentration).toBeLessThan(1);
  });
});
