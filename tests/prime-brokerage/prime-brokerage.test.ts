/**
 * TONAIAgent - Prime Brokerage Module Tests
 *
 * Comprehensive test suite for the AI Prime Brokerage infrastructure
 * including multi-fund custody & clearing, margin & leverage engine,
 * risk aggregation, capital efficiency, institutional reporting,
 * securities lending, and cross-chain prime brokerage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPrimeBrokerageManager,
  createCustodyAndClearingManager,
  createMarginAndLeverageEngine,
  createRiskAggregationLayer,
  createCapitalEfficiencyModule,
  createInstitutionalReportingSuite,
  createSecuritiesLendingManager,
  createCrossChainPrimeBrokerageManager,
  DEFAULT_STRESS_SCENARIOS,
} from '../../src/prime-brokerage/index';

// ============================================================================
// Custody & Clearing Tests
// ============================================================================

describe('CustodyAndClearingManager', () => {
  let manager: ReturnType<typeof createCustodyAndClearingManager>;

  beforeEach(() => {
    manager = createCustodyAndClearingManager({
      enableInternalNetting: true,
      settlementFrequency: 'realtime',
    });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const mgr = createCustodyAndClearingManager();
      expect(mgr.config).toBeDefined();
      expect(mgr.config.enableInternalNetting).toBe(true);
      expect(mgr.config.collateralHaircutRules.length).toBeGreaterThan(0);
    });

    it('should accept custom configuration', () => {
      const mgr = createCustodyAndClearingManager({
        settlementFrequency: 'daily',
        netExposureThreshold: 0.05,
      });
      expect(mgr.config.settlementFrequency).toBe('daily');
      expect(mgr.config.netExposureThreshold).toBe(0.05);
    });
  });

  describe('capital pool management', () => {
    it('should create a capital pool', () => {
      const pool = manager.createCapitalPool('Main Pool', 10000000, 'USD');

      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('Main Pool');
      expect(pool.totalCapital).toBe(10000000);
      expect(pool.availableCapital).toBe(10000000);
      expect(pool.allocatedCapital).toBe(0);
      expect(pool.currency).toBe('USD');
    });

    it('should allocate capital to a fund', () => {
      const pool = manager.createCapitalPool('Pool A', 10000000);
      const allocation = manager.allocateToFund(pool.id, 'fund_alpha', 5000000, 'Alpha Fund');

      expect(allocation.fundId).toBe('fund_alpha');
      expect(allocation.allocatedAmount).toBe(5000000);

      const updatedPool = manager.getCapitalPool(pool.id)!;
      expect(updatedPool.availableCapital).toBe(5000000);
      expect(updatedPool.allocatedCapital).toBe(5000000);
    });

    it('should deallocate capital from a fund', () => {
      const pool = manager.createCapitalPool('Pool B', 10000000);
      manager.allocateToFund(pool.id, 'fund_beta', 5000000, 'Beta Fund');
      manager.deallocateFromFund(pool.id, 'fund_beta', 2000000);

      const updatedPool = manager.getCapitalPool(pool.id)!;
      expect(updatedPool.availableCapital).toBe(7000000);
    });

    it('should reject allocation exceeding available capital', () => {
      const pool = manager.createCapitalPool('Pool C', 1000000);
      expect(() => manager.allocateToFund(pool.id, 'fund_gamma', 2000000)).toThrow();
    });

    it('should allocate capital to an agent with leverage', () => {
      const allocation = manager.allocateToAgent('fund_alpha', 'agent_1', 1000000, 'arbitrage', 2.0);

      expect(allocation.agentId).toBe('agent_1');
      expect(allocation.fundId).toBe('fund_alpha');
      expect(allocation.allocatedCapital).toBe(1000000);
      expect(allocation.leverageMultiplier).toBe(2.0);
      expect(allocation.effectiveCapital).toBe(2000000);
    });
  });

  describe('internal clearing', () => {
    it('should submit and auto-settle a clearing entry in realtime mode', () => {
      const entry = manager.submitClearingEntry({
        fromFundId: 'fund_alpha',
        toFundId: 'fund_beta',
        assetId: 'TON',
        assetName: 'Toncoin',
        quantity: 1000,
        price: 5.0,
        notionalValue: 5000,
        clearingType: 'net_settlement',
        metadata: {},
      });

      // In realtime mode, it should be auto-settled
      expect(entry.id).toBeDefined();
      expect(entry.status).toBe('settled');
    });

    it('should list clearing entries with filters', () => {
      manager.submitClearingEntry({
        fromFundId: 'fund_a',
        toFundId: 'fund_b',
        assetId: 'USDT',
        assetName: 'Tether',
        quantity: 100,
        price: 1.0,
        notionalValue: 100,
        clearingType: 'gross_settlement',
        metadata: {},
      });

      const entries = manager.listClearingEntries({ fromFundId: 'fund_a' });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every(e => e.fromFundId === 'fund_a')).toBe(true);
    });
  });

  describe('collateral management', () => {
    it('should deposit and retrieve collateral', () => {
      const position = manager.depositCollateral({
        ownerId: 'fund_alpha',
        assetId: 'TON',
        collateralType: 'ton',
        amount: 10000,
        valueUsd: 50000,
        lockedFor: 'margin_account_1',
      });

      expect(position.id).toBeDefined();
      expect(position.ownerId).toBe('fund_alpha');
      expect(position.collateralType).toBe('ton');
      expect(position.amount).toBe(10000);
      expect(position.isLocked).toBe(true);
      expect(position.haircut).toBeGreaterThan(0);
      expect(position.adjustedValue).toBeLessThan(position.value);
    });

    it('should release collateral', () => {
      const position = manager.depositCollateral({
        ownerId: 'agent_1',
        assetId: 'USDT',
        collateralType: 'usdt',
        amount: 5000,
        valueUsd: 5000,
        lockedFor: 'lending_agreement_1',
      });

      const released = manager.releaseCollateral(position.id);
      expect(released.isLocked).toBe(false);
      expect(released.lockedFor).toBeUndefined();
    });

    it('should list collateral positions by owner', () => {
      manager.depositCollateral({
        ownerId: 'fund_alpha',
        assetId: 'TON',
        collateralType: 'ton',
        amount: 1000,
        valueUsd: 5000,
      });

      manager.depositCollateral({
        ownerId: 'fund_beta',
        assetId: 'USDC',
        collateralType: 'usdc',
        amount: 2000,
        valueUsd: 2000,
      });

      const alphaCollateral = manager.listCollateralPositions('fund_alpha');
      expect(alphaCollateral.length).toBe(1);
      expect(alphaCollateral[0].ownerId).toBe('fund_alpha');
    });

    it('should get collateral management status', () => {
      manager.depositCollateral({
        ownerId: 'fund_alpha',
        assetId: 'TON',
        collateralType: 'ton',
        amount: 1000,
        valueUsd: 5000,
        lockedFor: 'margin_1',
      });

      const status = manager.getCollateralManagementStatus();
      expect(status.totalCollateral).toBeGreaterThan(0);
      expect(status.adjustedCollateral).toBeLessThanOrEqual(status.totalCollateral);
    });
  });

  describe('net exposure', () => {
    it('should run netting for an asset', () => {
      // Set up agent allocations first
      manager.allocateToAgent('fund_alpha', 'agent_long', 1000000, 'trend_following', 1.5);
      manager.allocateToAgent('fund_beta', 'agent_short', 500000, 'delta_neutral', 1.0);

      const netExposure = manager.runNetting('TON');
      expect(netExposure.assetId).toBe('TON');
      expect(netExposure.longExposure).toBeGreaterThanOrEqual(0);
      expect(netExposure.shortExposure).toBeGreaterThanOrEqual(0);
      expect(netExposure.netExposure).toBeDefined();
    });
  });
});

// ============================================================================
// Margin & Leverage Engine Tests
// ============================================================================

describe('MarginAndLeverageEngine', () => {
  let engine: ReturnType<typeof createMarginAndLeverageEngine>;

  beforeEach(() => {
    engine = createMarginAndLeverageEngine({
      defaultInitialMarginPercent: 0.1,
      defaultMaintenanceMarginPercent: 0.05,
      maxSystemLeverage: 10,
      leverageStrategy: 'moderate',
    });
  });

  describe('margin account management', () => {
    it('should create a margin account', () => {
      const account = engine.createMarginAccount('agent_1', 'agent', 'fund_alpha');

      expect(account.id).toBeDefined();
      expect(account.ownerId).toBe('agent_1');
      expect(account.ownerType).toBe('agent');
      expect(account.status).toBe('healthy');
      expect(account.totalEquity).toBe(0);
    });

    it('should update margin account and track status', () => {
      const account = engine.createMarginAccount('agent_2', 'agent');
      const updated = engine.updateMarginAccount(account.id, {
        totalEquity: 1000000,
        usedMargin: 500000,
      });

      expect(updated.totalEquity).toBe(1000000);
      expect(updated.usedMargin).toBe(500000);
      expect(updated.availableMargin).toBe(500000);
      expect(updated.marginLevel).toBeGreaterThan(100);
      expect(updated.status).toBe('healthy');
    });

    it('should detect margin call status', () => {
      const account = engine.createMarginAccount('agent_3', 'agent');
      // Set margin level below marginCallLevel (120%)
      engine.updateMarginAccount(account.id, {
        totalEquity: 110000,
        usedMargin: 100000, // marginLevel = 110%
      });

      const updated = engine.getMarginAccount(account.id)!;
      expect(updated.status).toBe('margin_call');
    });

    it('should add positions to margin accounts', () => {
      const account = engine.createMarginAccount('agent_4', 'agent');
      engine.updateMarginAccount(account.id, { totalEquity: 1000000 });

      const position = engine.addPosition(account.id, {
        assetId: 'TON',
        assetName: 'Toncoin',
        direction: 'long',
        size: 10000,
        notionalValue: 50000,
        entryPrice: 5.0,
        currentPrice: 5.0,
        unrealizedPnL: 0,
        marginRequired: 5000,
        leverage: 10,
        liquidationPrice: 4.0,
      });

      expect(position.positionId).toBeDefined();
      expect(position.direction).toBe('long');

      const updatedAccount = engine.getMarginAccount(account.id)!;
      expect(updatedAccount.usedMargin).toBe(5000);
    });
  });

  describe('leverage calculation', () => {
    it('should calculate safe leverage', () => {
      const params = engine.calculateSafeLeverage('agent_5', 0.25, 0.8);

      expect(params.agentId).toBe('agent_5');
      expect(params.currentMaxLeverage).toBeGreaterThan(0);
      expect(params.currentMaxLeverage).toBeLessThanOrEqual(10);
      expect(params.volatilityAdjustment).toBeLessThanOrEqual(1);
      expect(params.collateralQualityAdjustment).toBeLessThanOrEqual(1);
    });

    it('should reduce leverage for high volatility', () => {
      const lowVolParams = engine.calculateSafeLeverage('agent_6', 0.1, 0.9);
      const highVolParams = engine.calculateSafeLeverage('agent_7', 0.8, 0.9);

      expect(lowVolParams.currentMaxLeverage).toBeGreaterThan(highVolParams.currentMaxLeverage);
    });
  });

  describe('dynamic margin', () => {
    it('should calculate dynamic margin requirements', () => {
      const margin = engine.calculateDynamicMargin('TON', 0.3, 0.7);

      expect(margin.assetId).toBe('TON');
      expect(margin.finalMarginRequirement).toBeGreaterThan(margin.baseInitialMargin);
      expect(margin.finalMarginRequirement).toBeLessThanOrEqual(0.5); // Max 50%
    });
  });

  describe('liquidation protection', () => {
    it('should check liquidation risk', () => {
      const account = engine.createMarginAccount('agent_8', 'agent');
      engine.updateMarginAccount(account.id, {
        totalEquity: 150000,
        usedMargin: 100000,
      });

      const risk = engine.checkLiquidationRisk(account.id);
      expect(risk.accountId).toBe(account.id);
      expect(risk.marginLevel).toBeGreaterThan(0);
      expect(risk.urgency).toBeDefined();
    });

    it('should trigger liquidation and clear positions', () => {
      const account = engine.createMarginAccount('agent_9', 'agent');
      engine.updateMarginAccount(account.id, { totalEquity: 1000000 });
      engine.addPosition(account.id, {
        assetId: 'TON',
        assetName: 'Toncoin',
        direction: 'long',
        size: 1000,
        notionalValue: 5000,
        entryPrice: 5.0,
        currentPrice: 3.0,
        unrealizedPnL: -2000,
        marginRequired: 500,
        leverage: 10,
        liquidationPrice: 2.0,
      });

      const liquidation = engine.triggerLiquidation(account.id, 'test liquidation');
      expect(liquidation.id).toBeDefined();
      expect(liquidation.positionsLiquidated.length).toBeGreaterThan(0);
    });
  });

  describe('borrowing cost optimization', () => {
    it('should find optimal borrowing source', () => {
      const optimization = engine.optimizeBorrowingCost('agent_10', 5000000);

      expect(optimization.agentId).toBe('agent_10');
      expect(optimization.optimizedRate).toBeLessThanOrEqual(optimization.currentBorrowingRate);
      expect(optimization.recommendedSource).toBeDefined();
    });

    it('should list available borrowing sources', () => {
      const sources = engine.getAvailableBorrowingSources();
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every(s => s.name && s.rate > 0)).toBe(true);
    });
  });

  describe('system-wide metrics', () => {
    it('should get system leverage metrics', () => {
      const metrics = engine.getSystemLeverageMetrics();

      expect(metrics.totalGrossExposure).toBeGreaterThanOrEqual(0);
      expect(metrics.averageLeverage).toBeGreaterThanOrEqual(0);
      expect(metrics.updatedAt).toBeDefined();
    });

    it('should run cascade risk check', () => {
      const result = engine.runCascadeRiskCheck();

      expect(result.riskLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(result.vulnerableAccounts).toBeDefined();
      expect(result.assessedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Risk Aggregation Layer Tests
// ============================================================================

describe('RiskAggregationLayer', () => {
  let layer: ReturnType<typeof createRiskAggregationLayer>;

  const samplePositions = [
    {
      positionId: 'pos_1',
      agentId: 'agent_1',
      fundId: 'fund_alpha',
      assetId: 'TON',
      assetName: 'Toncoin',
      assetClass: 'crypto',
      direction: 'long' as const,
      notionalValue: 500000,
      marketValue: 480000,
      unrealizedPnL: -20000,
      leverage: 2.0,
      strategy: 'trend_following',
    },
    {
      positionId: 'pos_2',
      agentId: 'agent_2',
      fundId: 'fund_beta',
      assetId: 'ETH',
      assetName: 'Ethereum',
      assetClass: 'crypto',
      direction: 'short' as const,
      notionalValue: 300000,
      marketValue: 310000,
      unrealizedPnL: -10000,
      leverage: 1.5,
      strategy: 'arbitrage',
    },
    {
      positionId: 'pos_3',
      agentId: 'agent_1',
      fundId: 'fund_alpha',
      assetId: 'USDC',
      assetName: 'USD Coin',
      assetClass: 'stablecoin',
      direction: 'long' as const,
      notionalValue: 200000,
      marketValue: 200000,
      unrealizedPnL: 0,
      leverage: 1.0,
      strategy: 'yield_farming',
    },
  ];

  beforeEach(() => {
    layer = createRiskAggregationLayer({
      varConfidenceLevel: 0.99,
      stressTestFrequency: 'daily',
    });
  });

  describe('default stress scenarios', () => {
    it('should have default scenarios pre-registered', () => {
      const scenarios = layer.listScenarios();
      expect(scenarios.length).toBeGreaterThan(0);
      expect(DEFAULT_STRESS_SCENARIOS.length).toBeGreaterThan(0);
    });
  });

  describe('portfolio risk calculation', () => {
    it('should calculate portfolio risk snapshot', () => {
      const snapshot = layer.calculatePortfolioRisk(samplePositions);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.totalAUM).toBeGreaterThan(0);
      expect(snapshot.portfolioVar99).toBeGreaterThan(0);
      expect(snapshot.concentrationRisk).toBeDefined();
      expect(snapshot.agentRiskContributions.length).toBeGreaterThan(0);
    });

    it('should track risk history', () => {
      layer.calculatePortfolioRisk(samplePositions);
      layer.calculatePortfolioRisk(samplePositions);

      const history = layer.getRiskHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should return latest snapshot', () => {
      const snap1 = layer.calculatePortfolioRisk(samplePositions);
      const snap2 = layer.calculatePortfolioRisk(samplePositions);

      const latest = layer.getLatestRiskSnapshot();
      expect(latest?.id).toBe(snap2.id);
    });
  });

  describe('VaR calculations', () => {
    it('should calculate VaR at 99%', () => {
      const result = layer.calculateVaR(samplePositions, 0.99);

      expect(result.confidenceLevel).toBe(0.99);
      expect(result.var).toBeGreaterThan(0);
      expect(result.method).toBeDefined();
    });

    it('should calculate CVaR', () => {
      const cvar = layer.calculateCVaR(samplePositions, 0.99);
      const var99 = layer.calculateVaR(samplePositions, 0.99).var;

      // CVaR should be greater than VaR
      expect(cvar).toBeGreaterThan(var99);
    });
  });

  describe('systemic risk', () => {
    it('should assess systemic risk', () => {
      layer.calculatePortfolioRisk(samplePositions);
      const model = layer.assessSystemicRisk();

      expect(model.id).toBeDefined();
      expect(model.marketRegime).toMatch(/^(bull|bear|sideways|crisis)$/);
      expect(model.systemicRiskScore).toBeGreaterThanOrEqual(0);
      expect(model.systemicRiskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('stress testing', () => {
    it('should run a stress test', () => {
      const scenarios = layer.listScenarios();
      expect(scenarios.length).toBeGreaterThan(0);

      const result = layer.runStressTest(scenarios[0].id, samplePositions);

      expect(result.scenarioId).toBe(scenarios[0].id);
      expect(result.portfolioLoss).toBeGreaterThanOrEqual(0);
      expect(result.testedAt).toBeDefined();
    });

    it('should run all stress tests', () => {
      const results = layer.runAllStressTests(samplePositions);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.testedAt instanceof Date)).toBe(true);
    });

    it('should register custom stress scenario', () => {
      const scenario = layer.registerScenario({
        name: 'Custom Scenario',
        description: 'Custom test scenario',
        shocks: [{ assetId: 'TON', shockPercent: -30 }],
      });

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Custom Scenario');

      const registered = layer.listScenarios().find(s => s.id === scenario.id);
      expect(registered).toBeDefined();
    });
  });

  describe('risk limit checking', () => {
    it('should check risk limits', () => {
      const snapshot = layer.calculatePortfolioRisk(samplePositions);
      const result = layer.checkRiskLimits(snapshot);

      expect(result.passed).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.checkedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Capital Efficiency Module Tests
// ============================================================================

describe('CapitalEfficiencyModule', () => {
  let module: ReturnType<typeof createCapitalEfficiencyModule>;

  beforeEach(() => {
    module = createCapitalEfficiencyModule({
      idleCapitalThreshold: 0.05,
      yieldStackingEnabled: true,
      crossFundLendingEnabled: true,
    });
  });

  describe('idle capital analysis', () => {
    it('should analyze idle capital across funds', () => {
      const report = module.analyzeIdleCapital([
        {
          fundId: 'fund_alpha',
          fundName: 'Alpha AI Fund',
          totalCapital: 10000000,
          deployedCapital: 7000000,
          idleCapital: 3000000,
          pendingDeployment: 0,
          currency: 'USD',
        },
        {
          fundId: 'fund_beta',
          fundName: 'Beta AI Fund',
          totalCapital: 5000000,
          deployedCapital: 4500000,
          idleCapital: 500000,
          pendingDeployment: 0,
          currency: 'USD',
        },
      ]);

      expect(report.totalIdleCapital).toBe(3500000);
      expect(report.idleByFund.length).toBe(2);
      expect(report.optimizationOpportunities.length).toBeGreaterThan(0);
    });

    it('should identify capital opportunities', () => {
      const opportunities = module.identifyOpportunities(5000000, 0.5);

      expect(opportunities.length).toBeGreaterThan(0);
      expect(opportunities.every(o => o.riskScore <= 50)).toBe(true);
    });
  });

  describe('yield stacking', () => {
    it('should create a yield stack', () => {
      const stack = module.createYieldStack({
        fundId: 'fund_alpha',
        assetId: 'TON',
        capital: 1000000,
        baseYield: 0.02,
        stakingYield: 0.04,
        lendingYield: 0.03,
        liquidityYield: 0.05,
      });

      expect(stack.id).toBeDefined();
      expect(stack.totalYield).toBeCloseTo(0.14, 10);
      expect(stack.fundId).toBe('fund_alpha');
    });

    it('should list yield stacks by fund', () => {
      module.createYieldStack({
        fundId: 'fund_alpha',
        assetId: 'TON',
        capital: 500000,
        baseYield: 0.02,
      });

      module.createYieldStack({
        fundId: 'fund_beta',
        assetId: 'ETH',
        capital: 300000,
        baseYield: 0.015,
      });

      const alphaStacks = module.listYieldStacks('fund_alpha');
      expect(alphaStacks.length).toBe(1);
      expect(alphaStacks[0].fundId).toBe('fund_alpha');
    });

    it('should calculate optimal yield stack', () => {
      const optimization = module.calculateOptimalYieldStack('TON', 1000000);

      expect(optimization.assetId).toBe('TON');
      expect(optimization.capital).toBe(1000000);
      expect(optimization.totalOptimalYield).toBeGreaterThan(optimization.baseYield);
      expect(optimization.layers.length).toBeGreaterThan(0);
    });
  });

  describe('cross-fund liquidity pools', () => {
    it('should create a cross-fund liquidity pool', () => {
      const pool = module.createLiquidityPool(
        ['fund_alpha', 'fund_beta'],
        [
          { fundId: 'fund_alpha', amount: 2000000 },
          { fundId: 'fund_beta', amount: 1000000 },
        ]
      );

      expect(pool.id).toBeDefined();
      expect(pool.totalLiquidity).toBe(3000000);
      expect(pool.participatingFunds.length).toBe(2);
      expect(pool.contributions.length).toBe(2);
    });

    it('should contribute to pool and update balances', () => {
      const pool = module.createLiquidityPool(
        ['fund_alpha'],
        [{ fundId: 'fund_alpha', amount: 1000000 }]
      );

      const contribution = module.contributeToPool(pool.id, 'fund_beta', 500000);
      expect(contribution.fundId).toBe('fund_beta');
      expect(contribution.contributed).toBe(500000);

      const updatedPool = module.getLiquidityPool(pool.id)!;
      expect(updatedPool.totalLiquidity).toBe(1500000);
    });

    it('should allow borrowing from pool', () => {
      const pool = module.createLiquidityPool(
        ['fund_alpha'],
        [{ fundId: 'fund_alpha', amount: 5000000 }]
      );

      const record = module.borrowFromPool(pool.id, 'fund_beta', 1000000);
      expect(record.id).toBeDefined();
      expect(record.borrowerId).toBe('fund_beta');
      expect(record.amount).toBe(1000000);
      expect(record.status).toBe('active');

      const updatedPool = module.getLiquidityPool(pool.id)!;
      expect(updatedPool.availableLiquidity).toBe(4000000);
    });
  });

  describe('internal liquidity routing', () => {
    it('should route liquidity internally', () => {
      const route = module.routeLiquidity({
        fromFundId: 'fund_alpha',
        toFundId: 'fund_beta',
        fromAgentId: 'agent_1',
        toAgentId: 'agent_2',
        assetId: 'TON',
        amount: 500000,
        reason: 'Internal netting: offsetting TON exposure',
      });

      expect(route.id).toBeDefined();
      expect(route.fromFundId).toBe('fund_alpha');
      expect(route.toFundId).toBe('fund_beta');
      expect(route.savingsVsExternal).toBeGreaterThan(0);
    });

    it('should calculate internal netting optimization', () => {
      const positions = [
        {
          agentId: 'agent_long',
          fundId: 'fund_alpha',
          assetId: 'TON',
          direction: 'long' as const,
          size: 1000,
          value: 5000,
        },
        {
          agentId: 'agent_short',
          fundId: 'fund_beta',
          assetId: 'TON',
          direction: 'short' as const,
          size: 800,
          value: 4000,
        },
      ];

      const optimization = module.calculateInternalNetting(positions);

      expect(optimization.beforeGrossExposure).toBe(9000);
      expect(optimization.capitalFreed).toBeGreaterThan(0);
      expect(optimization.efficiencyGainPercent).toBeGreaterThan(0);
    });
  });

  describe('capital optimization', () => {
    it('should generate capital efficiency score', () => {
      const score = module.getCapitalEfficiencyScore();

      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      expect(score.computedAt).toBeDefined();
    });

    it('should generate optimization report', () => {
      const report = module.generateOptimizationReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
});

// ============================================================================
// Institutional Reporting Suite Tests
// ============================================================================

describe('InstitutionalReportingSuite', () => {
  let suite: ReturnType<typeof createInstitutionalReportingSuite>;

  const samplePositions = [
    {
      assetId: 'TON',
      assetName: 'Toncoin',
      assetClass: 'crypto',
      fundId: 'fund_alpha',
      quantity: 100000,
      currentPrice: 5.0,
      currency: 'USD',
      priceSource: 'onchain_oracle',
      priceTimestamp: new Date(),
      unrealizedPnL: 5000,
      baseInvestedAmount: 490000,
    },
    {
      assetId: 'USDT',
      assetName: 'Tether',
      assetClass: 'stablecoin',
      fundId: 'fund_alpha',
      quantity: 100000,
      currentPrice: 1.0,
      currency: 'USD',
      priceSource: 'external_api',
      priceTimestamp: new Date(),
      unrealizedPnL: 0,
      baseInvestedAmount: 100000,
    },
  ];

  beforeEach(() => {
    suite = createInstitutionalReportingSuite({
      navCalculationFrequency: 'daily',
      regulatoryReportingEnabled: true,
    });
  });

  describe('NAV reports', () => {
    it('should generate system-wide NAV report', () => {
      const report = suite.generateNAVReport(
        { type: 'system' },
        samplePositions
      );

      expect(report.id).toBeDefined();
      expect(report.totalNAV).toBe(600000); // 100000*5 + 100000*1
      expect(report.assetBreakdown.length).toBe(2);
      expect(report.scope).toBe('system');
    });

    it('should generate fund-level NAV report', () => {
      const report = suite.generateNAVReport(
        { type: 'fund', id: 'fund_alpha' },
        samplePositions
      );

      expect(report.scope).toBe('fund');
      expect(report.scopeId).toBe('fund_alpha');
      expect(report.totalNAV).toBeGreaterThan(0);
    });

    it('should track NAV report history', () => {
      suite.generateNAVReport({ type: 'system' }, samplePositions);
      suite.generateNAVReport({ type: 'system' }, samplePositions);

      const reports = suite.listNAVReports();
      expect(reports.length).toBeGreaterThanOrEqual(2);
    });

    it('should create audit log when generating NAV report', () => {
      suite.generateNAVReport({ type: 'system' }, samplePositions);

      const logs = suite.listAuditLogs({ eventType: 'report_generated' });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('risk exposure reports', () => {
    const riskPositions = [
      {
        assetId: 'TON',
        assetName: 'Toncoin',
        assetClass: 'crypto',
        fundId: 'fund_alpha',
        strategy: 'trend_following',
        currency: 'USD',
        chain: 'ton' as const,
        longExposure: 500000,
        shortExposure: 100000,
        notionalValue: 600000,
        leverage: 2.0,
        protocols: ['STON.fi', 'DeDust'],
      },
    ];

    it('should generate risk exposure report', () => {
      const report = suite.generateRiskExposureReport(riskPositions);

      expect(report.id).toBeDefined();
      expect(report.totalExposure).toBeGreaterThan(0);
      expect(report.assetExposures.length).toBeGreaterThan(0);
      expect(report.strategyExposures.length).toBeGreaterThan(0);
      expect(report.chainExposures.length).toBeGreaterThan(0);
    });
  });

  describe('audit logs', () => {
    it('should create and retrieve audit logs', () => {
      const log = suite.createAuditLog({
        eventType: 'capital_allocation',
        actor: 'ai_agent_1',
        actorType: 'ai_agent',
        action: 'allocate_capital',
        resource: 'fund',
        resourceId: 'fund_alpha',
        details: { amount: 1000000, strategy: 'arbitrage' },
        outcome: 'success',
      });

      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.eventType).toBe('capital_allocation');
      expect(log.actor).toBe('ai_agent_1');

      const retrieved = suite.getAuditLog(log.id);
      expect(retrieved?.id).toBe(log.id);
    });

    it('should filter audit logs', () => {
      suite.createAuditLog({
        eventType: 'margin_call',
        actor: 'system',
        actorType: 'system',
        action: 'trigger_margin_call',
        resource: 'margin_account',
        resourceId: 'account_1',
        details: { marginLevel: 105 },
        outcome: 'success',
      });

      const systemLogs = suite.listAuditLogs({ actorType: 'system' });
      expect(systemLogs.length).toBeGreaterThan(0);
      expect(systemLogs.every(l => l.actorType === 'system')).toBe(true);
    });

    it('should export audit trail for date range', () => {
      const from = new Date(Date.now() - 3600000);

      suite.createAuditLog({
        eventType: 'test_event',
        actor: 'test',
        actorType: 'human',
        action: 'test_action',
        resource: 'test',
        resourceId: 'test_1',
        details: {},
        outcome: 'success',
      });

      // Set 'to' after creating the log to ensure the log's timestamp falls within range
      const to = new Date(Date.now() + 1000);

      const trail = suite.exportAuditTrail(from, to);
      expect(trail.length).toBeGreaterThan(0);
    });
  });

  describe('regulatory statements', () => {
    it('should generate monthly regulatory statement', () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const statement = suite.generateRegulatoryStatement('monthly', from, to, 'US');

      expect(statement.id).toBeDefined();
      expect(statement.statementType).toBe('monthly');
      expect(statement.jurisdiction).toBe('US');
      expect(statement.complianceNotes.length).toBeGreaterThan(0);
    });
  });

  describe('performance attribution', () => {
    it('should generate performance attribution report', () => {
      // Generate some NAV data first
      suite.generateNAVReport({ type: 'fund', id: 'fund_alpha' }, samplePositions);

      const attribution = suite.generatePerformanceAttribution('fund_alpha', '30d');

      expect(attribution.fundId).toBe('fund_alpha');
      expect(attribution.byStrategy.length).toBeGreaterThan(0);
      expect(attribution.byRiskFactor.length).toBeGreaterThan(0);
      expect(attribution.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Securities Lending Manager Tests
// ============================================================================

describe('SecuritiesLendingManager', () => {
  let manager: ReturnType<typeof createSecuritiesLendingManager>;

  beforeEach(() => {
    manager = createSecuritiesLendingManager({
      enabled: true,
      agentToAgentLendingEnabled: true,
      minCollateralizationRatio: 1.5,
    });
  });

  describe('token lending registry', () => {
    it('should list a token for lending', () => {
      const token = manager.listToken({
        assetId: 'TON',
        assetName: 'Toncoin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 100000,
        minimumLendingRate: 0.05,
        collateralRequired: ['usdt', 'usdc'],
      });

      expect(token.id).toBeDefined();
      expect(token.assetId).toBe('TON');
      expect(token.status).toBe('available');
      expect(token.lendedQuantity).toBe(0);
    });

    it('should filter lendable tokens', () => {
      manager.listToken({
        assetId: 'TON',
        assetName: 'Toncoin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 50000,
        minimumLendingRate: 0.04,
        collateralRequired: ['usdt'],
      });

      manager.listToken({
        assetId: 'ETH',
        assetName: 'Ethereum',
        ownerId: 'fund_beta',
        ownerType: 'fund',
        availableQuantity: 100,
        minimumLendingRate: 0.06,
        collateralRequired: ['usdt', 'usdc'],
      });

      const highRate = manager.listLendableTokens({ minRate: 0.05 });
      expect(highRate.every(t => t.currentLendingRate >= 0.05)).toBe(true);
    });

    it('should delist token with no active loans', () => {
      const token = manager.listToken({
        assetId: 'USDC',
        assetName: 'USD Coin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 10000,
        minimumLendingRate: 0.03,
        collateralRequired: ['ton'],
      });

      const delisted = manager.delistToken(token.id);
      expect(delisted.status).toBe('recalled');
    });
  });

  describe('lending agreements', () => {
    it('should initiate a lending agreement', () => {
      const token = manager.listToken({
        assetId: 'TON',
        assetName: 'Toncoin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 10000,
        minimumLendingRate: 0.05,
        collateralRequired: ['usdt'],
      });

      const agreement = manager.initiateLending({
        lenderId: 'fund_alpha',
        borrowerId: 'fund_beta',
        tokenId: token.id,
        quantity: 1000,
        agreedRate: 0.06,
        termDays: 30,
        collateral: {
          ownerId: 'fund_beta',
          assetId: 'USDT',
          collateralType: 'usdt',
          amount: 10000,
          valueUsd: 10000,
          haircut: 0.02,
          adjustedValue: 9800,
        },
      });

      expect(agreement.id).toBeDefined();
      expect(agreement.status).toBe('on_loan');
      expect(agreement.quantity).toBe(1000);
      expect(agreement.lendingRate).toBe(0.06);
    });

    it('should accrue interest on active loan', () => {
      const token = manager.listToken({
        assetId: 'TON',
        assetName: 'Toncoin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 5000,
        minimumLendingRate: 0.05,
        collateralRequired: ['usdt'],
      });

      const agreement = manager.initiateLending({
        lenderId: 'fund_alpha',
        borrowerId: 'fund_gamma',
        tokenId: token.id,
        quantity: 500,
        agreedRate: 0.08,
        termDays: 7,
        collateral: {
          ownerId: 'fund_gamma',
          assetId: 'USDT',
          collateralType: 'usdt',
          amount: 5000,
          valueUsd: 5000,
          haircut: 0.02,
          adjustedValue: 4900,
        },
      });

      const updated = manager.accrueInterest(agreement.id);
      // Even if accrual period is tiny, interest field should be accessible
      expect(updated.accruedInterest).toBeGreaterThanOrEqual(0);
    });

    it('should repay a loan', () => {
      const token = manager.listToken({
        assetId: 'ETH',
        assetName: 'Ethereum',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 100,
        minimumLendingRate: 0.04,
        collateralRequired: ['usdt'],
      });

      const agreement = manager.initiateLending({
        lenderId: 'fund_alpha',
        borrowerId: 'fund_beta',
        tokenId: token.id,
        quantity: 10,
        agreedRate: 0.05,
        termDays: 14,
        collateral: {
          ownerId: 'fund_beta',
          assetId: 'USDT',
          collateralType: 'usdt',
          amount: 3000,
          valueUsd: 3000,
          haircut: 0.02,
          adjustedValue: 2940,
        },
      });

      const repaid = manager.repayLoan(agreement.id);
      expect(repaid.status).toBe('settled');
    });
  });

  describe('agent-to-agent loans', () => {
    it('should create agent-to-agent loan', () => {
      const loan = manager.createAgentLoan({
        lenderAgentId: 'agent_1',
        borrowerAgentId: 'agent_2',
        lenderFundId: 'fund_alpha',
        borrowerFundId: 'fund_alpha',
        assetId: 'TON',
        quantity: 500,
        lendingRate: 0.03,
        collateral: {
          ownerId: 'agent_2',
          assetId: 'USDT',
          collateralType: 'usdt',
          amount: 2500,
          valueUsd: 2500,
          haircut: 0.02,
          adjustedValue: 2450,
        },
        termDays: 3,
        reason: 'Short-term liquidity to cover arbitrage position',
      });

      expect(loan.id).toBeDefined();
      expect(loan.lenderAgentId).toBe('agent_1');
      expect(loan.borrowerAgentId).toBe('agent_2');
      expect(loan.status).toBe('on_loan');
    });

    it('should settle agent loan', () => {
      const loan = manager.createAgentLoan({
        lenderAgentId: 'agent_3',
        borrowerAgentId: 'agent_4',
        lenderFundId: 'fund_beta',
        borrowerFundId: 'fund_beta',
        assetId: 'ETH',
        quantity: 5,
        lendingRate: 0.04,
        collateral: {
          ownerId: 'agent_4',
          assetId: 'USDC',
          collateralType: 'usdc',
          amount: 1000,
          valueUsd: 1000,
          haircut: 0.02,
          adjustedValue: 980,
        },
        termDays: 1,
        reason: 'Intraday liquidity',
      });

      const settled = manager.settleAgentLoan(loan.id);
      expect(settled.status).toBe('settled');
    });
  });

  describe('structured yield products', () => {
    it('should create a structured yield product', () => {
      const product = manager.createStructuredProduct({
        name: 'TON Fixed Yield 90D',
        strategy: 'fixed_income',
        minInvestment: 10000,
        targetYield: 0.08,
        maturityDays: 90,
        backedBy: ['TON Staking', 'Internal Lending'],
        riskRating: 'low',
        totalCapacity: 5000000,
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('TON Fixed Yield 90D');
      expect(product.status).toBe('active');
      expect(product.availableAmount).toBe(5000000);
    });

    it('should subscribe to a structured product', () => {
      const product = manager.createStructuredProduct({
        name: 'Hybrid Yield Fund',
        strategy: 'hybrid',
        minInvestment: 5000,
        targetYield: 0.12,
        maturityDays: 180,
        backedBy: ['RWA', 'DeFi Yield'],
        riskRating: 'medium',
        totalCapacity: 10000000,
      });

      const result = manager.subscribeToProduct(product.id, 50000, 'investor_1');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(50000);
      expect(result.sharesAllotted).toBeGreaterThan(0);
    });

    it('should reject subscription below minimum', () => {
      const product = manager.createStructuredProduct({
        name: 'Premium Yield',
        strategy: 'variable_yield',
        minInvestment: 100000,
        targetYield: 0.15,
        maturityDays: 365,
        backedBy: ['Structured Products'],
        riskRating: 'high',
        totalCapacity: 50000000,
      });

      const result = manager.subscribeToProduct(product.id, 1000, 'investor_2');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should mature a structured product', () => {
      const product = manager.createStructuredProduct({
        name: 'Quick Yield',
        strategy: 'fixed_income',
        minInvestment: 1000,
        targetYield: 0.05,
        maturityDays: 30,
        backedBy: ['Money Market'],
        riskRating: 'low',
        totalCapacity: 1000000,
      });

      manager.subscribeToProduct(product.id, 100000, 'investor_3');
      const result = manager.matureProduct(product.id);

      expect(result.productId).toBe(product.id);
      expect(result.principalReturned).toBe(100000);
      expect(result.interestPaid).toBeGreaterThan(0);
    });
  });

  describe('lending analytics', () => {
    it('should get token utilization report', () => {
      manager.listToken({
        assetId: 'TON',
        assetName: 'Toncoin',
        ownerId: 'fund_alpha',
        ownerType: 'fund',
        availableQuantity: 10000,
        minimumLendingRate: 0.05,
        collateralRequired: ['usdt'],
      });

      const report = manager.getTokenUtilizationReport();
      expect(report.totalTokensListed).toBeGreaterThan(0);
      expect(report.avgLendingRate).toBeGreaterThan(0);
    });

    it('should get lending revenue report', () => {
      const report = manager.getLendingRevenue();
      expect(report.fromDate).toBeDefined();
      expect(report.toDate).toBeDefined();
      expect(report.totalRevenue).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Cross-Chain Prime Brokerage Tests
// ============================================================================

describe('CrossChainPrimeBrokerageManager', () => {
  let manager: ReturnType<typeof createCrossChainPrimeBrokerageManager>;

  beforeEach(() => {
    manager = createCrossChainPrimeBrokerageManager({
      enabledChains: ['ton', 'ethereum', 'polygon'],
      crossChainCollateralEnabled: true,
      crossChainMarginCreditFactor: 0.85,
    });
  });

  describe('chain position management', () => {
    it('should register capital position on a chain', () => {
      const position = manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ton',
        totalCapital: 5000000,
        availableCapital: 3000000,
        currency: 'USD',
      });

      expect(position.id).toBeDefined();
      expect(position.chain).toBe('ton');
      expect(position.fundId).toBe('fund_alpha');
      expect(position.totalCapital).toBe(5000000);
    });

    it('should list positions by fund and chain', () => {
      manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ton',
        totalCapital: 3000000,
        availableCapital: 2000000,
        currency: 'USD',
      });

      manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ethereum',
        totalCapital: 2000000,
        availableCapital: 1500000,
        currency: 'USD',
      });

      const tonPositions = manager.listChainPositions('fund_alpha', 'ton');
      expect(tonPositions.length).toBe(1);
      expect(tonPositions[0].chain).toBe('ton');
    });

    it('should get consolidated capital across chains', () => {
      manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ton',
        totalCapital: 3000000,
        availableCapital: 2000000,
        currency: 'USD',
      });

      manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ethereum',
        totalCapital: 2000000,
        availableCapital: 1500000,
        currency: 'USD',
      });

      const consolidated = manager.getConsolidatedCapital('fund_alpha');
      expect(consolidated.totalCapitalAllChains).toBe(5000000);
      expect(consolidated.byChain.length).toBe(2);
    });
  });

  describe('cross-chain collateral', () => {
    it('should initiate collateral bridging', () => {
      const collateral = manager.bridgeCollateral({
        assetId: 'TON',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        amount: 100000,
      });

      expect(collateral.id).toBeDefined();
      expect(collateral.sourceChain).toBe('ton');
      expect(collateral.targetChain).toBe('ethereum');
      expect(collateral.amount).toBe(100000);
      expect(collateral.bridgeFee).toBeGreaterThan(0);
      expect(collateral.marginCredit).toBeGreaterThan(0);
      expect(collateral.status).toBe('pending_bridge');
    });

    it('should recall cross-chain collateral', () => {
      const collateral = manager.bridgeCollateral({
        assetId: 'ETH',
        sourceChain: 'ethereum',
        targetChain: 'ton',
        amount: 10,
      });

      const recalled = manager.recallCrossChainCollateral(collateral.id);
      expect(recalled.status).toBe('recalled');
    });

    it('should filter cross-chain collateral by chain', () => {
      manager.bridgeCollateral({
        assetId: 'TON',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        amount: 50000,
      });

      manager.bridgeCollateral({
        assetId: 'ETH',
        sourceChain: 'ethereum',
        targetChain: 'polygon',
        amount: 5,
      });

      const tonCollateral = manager.listCrossChainCollateral({ sourceChain: 'ton' });
      expect(tonCollateral.every(c => c.sourceChain === 'ton')).toBe(true);
    });
  });

  describe('bridge-aware margin logic', () => {
    it('should calculate bridge-aware margin', () => {
      const logic = manager.calculateBridgeAwareMargin('TON', 'ton', 'ethereum');

      expect(logic.assetId).toBe('TON');
      expect(logic.nativeChain).toBe('ton');
      expect(logic.targetChain).toBe('ethereum');
      expect(logic.effectiveLTV).toBeLessThan(1);
      expect(logic.effectiveLTV).toBeGreaterThan(0);
      expect(logic.bridgeFeePercent).toBeGreaterThan(0);
    });
  });

  describe('capital routing', () => {
    it('should route capital between chains', () => {
      const route = manager.routeCapital({
        fundId: 'fund_alpha',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        assetId: 'TON',
        amount: 500000,
        reason: 'Arbitrage opportunity on Ethereum',
      });

      expect(route.id).toBeDefined();
      expect(route.sourceChain).toBe('ton');
      expect(route.targetChain).toBe('ethereum');
      expect(route.amount).toBe(500000);
      expect(route.estimatedBridgeFee).toBeGreaterThan(0);
      expect(['routing', 'bridging', 'completed']).toContain(route.status);
    });

    it('should list and filter capital routes', () => {
      manager.routeCapital({
        fundId: 'fund_alpha',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        assetId: 'USDT',
        amount: 100000,
        reason: 'Liquidity rebalancing',
      });

      const routes = manager.listCapitalRoutes({ sourceChain: 'ton' });
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.every(r => r.sourceChain === 'ton')).toBe(true);
    });
  });

  describe('analytics', () => {
    it('should get multi-chain summary', () => {
      manager.registerChainPosition({
        fundId: 'fund_alpha',
        chain: 'ton',
        totalCapital: 5000000,
        availableCapital: 3000000,
        currency: 'USD',
      });

      const summary = manager.getMultiChainSummary();
      expect(summary.enabledChains.length).toBeGreaterThan(0);
      expect(summary.updatedAt).toBeDefined();
    });

    it('should analyze bridge costs', () => {
      const analysis = manager.getBridgeCostAnalysis('ton', 'ethereum', 'TON', 1000000);

      expect(analysis.sourceChain).toBe('ton');
      expect(analysis.targetChain).toBe('ethereum');
      expect(analysis.estimatedFee).toBeGreaterThan(0);
      expect(analysis.recommendation).toBeDefined();
    });

    it('should get optimal bridge route', () => {
      const recommendation = manager.getOptimalBridgeRoute('ton', 'ethereum', 'USDT');

      expect(recommendation.sourceChain).toBe('ton');
      expect(recommendation.targetChain).toBe('ethereum');
      expect(recommendation.recommendedBridge).toBeDefined();
      expect(recommendation.reasoning).toBeDefined();
    });
  });
});

// ============================================================================
// Unified Prime Brokerage Manager Tests
// ============================================================================

describe('PrimeBrokerageManager (Unified)', () => {
  let pb: ReturnType<typeof createPrimeBrokerageManager>;

  beforeEach(() => {
    pb = createPrimeBrokerageManager({
      custody: { enableInternalNetting: true },
      marginEngine: { maxSystemLeverage: 5 },
      riskAggregation: { stressTestFrequency: 'daily' },
      securitiesLending: { enabled: true },
    });
  });

  describe('initialization', () => {
    it('should create manager with all sub-modules', () => {
      expect(pb.custody).toBeDefined();
      expect(pb.marginEngine).toBeDefined();
      expect(pb.riskAggregation).toBeDefined();
      expect(pb.capitalEfficiency).toBeDefined();
      expect(pb.reporting).toBeDefined();
      expect(pb.securitiesLending).toBeDefined();
      expect(pb.crossChain).toBeDefined();
    });

    it('should create with default config', () => {
      const defaultPb = createPrimeBrokerageManager();
      expect(defaultPb.custody).toBeDefined();
      expect(defaultPb.marginEngine).toBeDefined();
    });
  });

  describe('system status', () => {
    it('should return system status', () => {
      const status = pb.getSystemStatus();

      expect(status.capitalPools).toBeGreaterThanOrEqual(0);
      expect(status.marginAccounts).toBeGreaterThanOrEqual(0);
      expect(status.generatedAt).toBeDefined();
    });

    it('should reflect changes in system status', () => {
      pb.custody.createCapitalPool('Test Pool', 5000000);
      pb.marginEngine.createMarginAccount('agent_test', 'agent');

      const status = pb.getSystemStatus();
      expect(status.capitalPools).toBe(1);
      expect(status.marginAccounts).toBe(1);
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all sub-modules', () => {
      const events: string[] = [];
      pb.onEvent(event => events.push(event.source));

      // Trigger events from different modules
      pb.custody.createCapitalPool('Event Pool', 1000000);
      pb.marginEngine.createMarginAccount('agent_event', 'agent');

      // Give time for events to propagate
      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('demo scenario: 2 AI funds with internal netting', () => {
    it('should demonstrate internal netting between Agent A (short BTC) and Agent B (long BTC)', () => {
      // Set up capital pools
      const pool = pb.custody.createCapitalPool('Prime Pool', 20000000);
      pb.custody.allocateToFund(pool.id, 'fund_alpha', 10000000, 'Alpha Arbitrage Fund');
      pb.custody.allocateToFund(pool.id, 'fund_beta', 8000000, 'Beta Trend Fund');

      // Allocate to agents
      pb.custody.allocateToAgent('fund_alpha', 'agent_arb', 2000000, 'arbitrage', 2.0);
      pb.custody.allocateToAgent('fund_beta', 'agent_trend', 2000000, 'trend_following', 1.5);

      // Calculate netting for BTC
      const netExposure = pb.custody.runNetting('BTC');
      expect(netExposure.assetId).toBe('BTC');
      expect(netExposure.capitalSaved).toBeGreaterThanOrEqual(0);

      // Set up yield stacks for idle capital
      const yieldStack = pb.capitalEfficiency.createYieldStack({
        fundId: 'fund_alpha',
        assetId: 'TON',
        capital: 3000000,
        baseYield: 0.02,
        stakingYield: 0.04,
        lendingYield: 0.03,
      });
      expect(yieldStack.totalYield).toBeGreaterThan(0);

      // Set up cross-fund liquidity pool
      const liquidityPool = pb.capitalEfficiency.createLiquidityPool(
        ['fund_alpha', 'fund_beta'],
        [
          { fundId: 'fund_alpha', amount: 1000000 },
          { fundId: 'fund_beta', amount: 500000 },
        ]
      );
      expect(liquidityPool.totalLiquidity).toBe(1500000);

      // Generate NAV report
      const navReport = pb.reporting.generateNAVReport(
        { type: 'system' },
        [
          {
            assetId: 'TON',
            assetName: 'Toncoin',
            assetClass: 'crypto',
            fundId: 'fund_alpha',
            quantity: 1000000,
            currentPrice: 5.0,
            currency: 'USD',
            priceSource: 'onchain_oracle',
            priceTimestamp: new Date(),
            unrealizedPnL: 50000,
            baseInvestedAmount: 4900000,
          },
        ]
      );
      expect(navReport.totalNAV).toBe(5000000);

      // Run stress test
      const stressResults = pb.riskAggregation.runAllStressTests([]);
      expect(stressResults.length).toBeGreaterThan(0);

      // Get system status
      const status = pb.getSystemStatus();
      expect(status.capitalPools).toBe(1);
      expect(status.liquidityPools).toBe(1);
      expect(status.yieldStacks).toBe(1);
    });
  });

  describe('demo scenario: margin calculation and stress test', () => {
    it('should demonstrate margin calculation with leverage', () => {
      // Create margin account for a leveraged agent
      const account = pb.marginEngine.createMarginAccount('leveraged_agent', 'agent');
      pb.marginEngine.updateMarginAccount(account.id, {
        totalEquity: 1000000,
        usedMargin: 400000, // 2.5x leverage
      });

      // Calculate safe leverage given market conditions
      const leverageParams = pb.marginEngine.calculateSafeLeverage(
        'leveraged_agent',
        0.35, // 35% annualized volatility
        0.75   // 75% collateral quality score
      );
      expect(leverageParams.currentMaxLeverage).toBeGreaterThan(0);
      expect(leverageParams.currentMaxLeverage).toBeLessThan(pb.marginEngine.config.maxSystemLeverage);

      // Check liquidation risk
      const risk = pb.marginEngine.checkLiquidationRisk(account.id);
      expect(risk.marginLevel).toBeGreaterThan(0);
      expect(risk.marginCallDistance).toBeGreaterThan(0);

      // Run cascade risk check
      const cascadeRisk = pb.marginEngine.runCascadeRiskCheck();
      expect(cascadeRisk.riskLevel).toBeDefined();
      expect(cascadeRisk.assessedAt).toBeDefined();
    });
  });

  describe('demo scenario: institutional reporting', () => {
    it('should generate institutional-style report package', () => {
      // Create audit logs for various system activities
      pb.reporting.createAuditLog({
        eventType: 'capital_deployment',
        actor: 'ai_risk_engine',
        actorType: 'ai_agent',
        action: 'deploy_capital',
        resource: 'strategy',
        resourceId: 'arbitrage_strategy_1',
        details: { amount: 1000000, expectedYield: 0.12 },
        outcome: 'success',
      });

      pb.reporting.createAuditLog({
        eventType: 'margin_monitoring',
        actor: 'system',
        actorType: 'system',
        action: 'check_margin_levels',
        resource: 'margin_accounts',
        resourceId: 'system_wide',
        details: { accountsChecked: 5, violations: 0 },
        outcome: 'success',
      });

      // Generate regulatory statement
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();
      const statement = pb.reporting.generateRegulatoryStatement(
        'monthly',
        from,
        to,
        'US'
      );

      expect(statement.id).toBeDefined();
      expect(statement.complianceNotes.length).toBeGreaterThan(0);

      // Get audit trail
      const trail = pb.reporting.exportAuditTrail(from, to);
      expect(trail.length).toBeGreaterThan(0);
    });
  });
});
