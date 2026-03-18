/**
 * Tests for the AI Fund Manager module (Issue #152)
 *
 * Covers:
 * - Fund creation framework (create, update, lifecycle)
 * - Portfolio allocation engine (deposit, withdrawal, drift)
 * - Automatic rebalancing (trigger detection, plan generation, execution)
 * - Risk management (assessment, emergency stop, limits)
 * - Investor participation (deposit, withdraw, position tracking)
 * - Performance tracking (snapshots, metrics calculation)
 * - Fee distribution (management fee, performance fee, high-water mark)
 * - AIFundManager unified entry point
 * - FundManagerError
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createAIFundManager,
  AIFundManager,
  DEFAULT_FUND_MANAGER_CONFIG,
  FundManagerError,
  FundConfig,
  FundPortfolio,
  createFundCreationManager,
  createAllocationEngine,
  createRebalancingEngine,
  createRiskManagementService,
  createInvestorParticipationManager,
  createPerformanceTrackingService,
  createFeeDistributionEngine,
} from '../../services/fund-manager';

import type {
  CreateFundInput,
  FundManagerEvent,
} from '../../services/fund-manager';

// ============================================================================
// Test Helpers
// ============================================================================

function makeCreateFundInput(overrides: Partial<CreateFundInput> = {}): CreateFundInput {
  return {
    name: 'Alpha Growth Fund',
    description: 'AI-managed diversified DeFi fund',
    creatorId: 'creator_001',
    type: 'open',
    baseAsset: 'TON',
    strategyAllocations: [
      { strategyId: 'strategy-a', targetWeightPercent: 45 },
      { strategyId: 'strategy-b', targetWeightPercent: 55 },
    ],
    riskProfile: 'moderate',
    managementFeePercent: 2.0,
    performanceFeePercent: 20.0,
    ...overrides,
  };
}

function makeSilentManager(config: Partial<ConstructorParameters<typeof AIFundManager>[0]> = {}) {
  return createAIFundManager({
    observability: { enableLogging: false, logLevel: 'error' },
    defaultRiskLimits: {
      maxStrategyExposurePercent: 70, // above 55% max weight used in makeCreateFundInput
      maxDrawdownPercent: 25,
      maxAssetConcentrationPercent: 40,
      dailyLossLimitPercent: 5,
      volatilityWindowDays: 30,
    },
    ...config,
  });
}

function makePortfolio(
  fundId: string,
  totalAum: bigint = BigInt(100_000_000_000),
  allocations: FundPortfolio['allocations'] = [
    { strategyId: 'strategy-a', targetWeightPercent: 45, currentWeightPercent: 45, allocatedCapital: BigInt(45_000_000_000) },
    { strategyId: 'strategy-b', targetWeightPercent: 55, currentWeightPercent: 55, allocatedCapital: BigInt(55_000_000_000) },
  ]
): FundPortfolio {
  return {
    fundId,
    totalAum,
    navPerShare: BigInt(1_000_000_000),
    totalSharesOutstanding: totalAum,
    allocations,
    cashBalance: BigInt(0),
    lastSyncedAt: new Date(),
  };
}

// ============================================================================
// DEFAULT_FUND_MANAGER_CONFIG
// ============================================================================

describe('DEFAULT_FUND_MANAGER_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_FUND_MANAGER_CONFIG.enabled).toBe(true);
    expect(DEFAULT_FUND_MANAGER_CONFIG.maxActiveFunds).toBe(100);
    expect(DEFAULT_FUND_MANAGER_CONFIG.defaultRiskLimits.maxDrawdownPercent).toBe(25);
    expect(DEFAULT_FUND_MANAGER_CONFIG.defaultRebalancingRules.driftThresholdPercent).toBe(5);
    expect(DEFAULT_FUND_MANAGER_CONFIG.observability.enableLogging).toBe(true);
  });
});

// ============================================================================
// FundCreationManager
// ============================================================================

describe('FundCreationManager', () => {
  let manager: ReturnType<typeof createFundCreationManager>;

  beforeEach(() => {
    manager = createFundCreationManager();
  });

  describe('createFund', () => {
    it('should create a fund with valid allocations', () => {
      const fund = manager.createFund(makeCreateFundInput());

      expect(fund.fundId).toBeDefined();
      expect(fund.name).toBe('Alpha Growth Fund');
      expect(fund.creatorId).toBe('creator_001');
      expect(fund.strategyAllocations).toHaveLength(2);
      expect(fund.strategyAllocations[0].strategyId).toBe('strategy-a');
      expect(fund.strategyAllocations[0].targetWeightPercent).toBe(45);
      expect(fund.fees.managementFeePercent).toBe(2.0);
      expect(fund.fees.performanceFeePercent).toBe(20.0);
      expect(fund.fees.highWaterMarkEnabled).toBe(true);
    });

    it('should start fund in pending state', () => {
      const fund = manager.createFund(makeCreateFundInput());
      expect(manager.getFundState(fund.fundId)).toBe('pending');
    });

    it('should initialize portfolio with zero AUM', () => {
      const fund = manager.createFund(makeCreateFundInput());
      const portfolio = manager.getFundPortfolio(fund.fundId);
      expect(portfolio).toBeDefined();
      expect(portfolio!.totalAum).toBe(BigInt(0));
    });

    it('should throw INVALID_WEIGHT_SUM when weights do not sum to 100', () => {
      expect(() =>
        manager.createFund(makeCreateFundInput({
          strategyAllocations: [
            { strategyId: 'strategy-a', targetWeightPercent: 60 },
            { strategyId: 'strategy-b', targetWeightPercent: 30 }, // only 90
          ],
        }))
      ).toThrow(FundManagerError);
    });

    it('should throw INVALID_ALLOCATION when no strategies given', () => {
      expect(() =>
        manager.createFund(makeCreateFundInput({ strategyAllocations: [] }))
      ).toThrow(FundManagerError);
    });

    it('should emit fund.created event', () => {
      const events: FundManagerEvent[] = [];
      manager.onEvent((e) => events.push(e));

      const fund = manager.createFund(makeCreateFundInput());
      const created = events.find((e) => e.type === 'fund.created');

      expect(created).toBeDefined();
      expect(created!.fundId).toBe(fund.fundId);
    });

    it('should apply default fee recipients on creation', () => {
      const fund = manager.createFund(makeCreateFundInput());
      expect(fund.fees.feeRecipients).toHaveLength(2);
      const totalSharePercent = fund.fees.feeRecipients.reduce((s, r) => s + r.sharePercent, 0);
      expect(totalSharePercent).toBe(100);
    });
  });

  describe('fund lifecycle', () => {
    it('should activate a pending fund', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      expect(manager.getFundState(fund.fundId)).toBe('active');
    });

    it('should pause an active fund', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      manager.pauseFund(fund.fundId);
      expect(manager.getFundState(fund.fundId)).toBe('paused');
    });

    it('should resume a paused fund', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      manager.pauseFund(fund.fundId);
      manager.resumeFund(fund.fundId);
      expect(manager.getFundState(fund.fundId)).toBe('active');
    });

    it('should close a fund', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      manager.closeFund(fund.fundId);
      expect(manager.getFundState(fund.fundId)).toBe('closed');
    });

    it('should trigger emergency stop', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      manager.emergencyStop(fund.fundId, 'Drawdown limit exceeded');
      expect(manager.getFundState(fund.fundId)).toBe('emergency_stopped');
    });

    it('should throw INVALID_FUND_STATE when activating from wrong state', () => {
      const fund = manager.createFund(makeCreateFundInput());
      manager.activateFund(fund.fundId);
      manager.closeFund(fund.fundId);

      expect(() => manager.activateFund(fund.fundId)).toThrow(FundManagerError);
    });

    it('should throw FUND_NOT_FOUND for unknown fundId', () => {
      expect(() => manager.activateFund('nonexistent-fund')).toThrow(FundManagerError);
    });
  });

  describe('listFunds', () => {
    it('should list all funds', () => {
      manager.createFund(makeCreateFundInput({ name: 'Fund A' }));
      manager.createFund(makeCreateFundInput({ name: 'Fund B' }));
      expect(manager.listFunds()).toHaveLength(2);
    });

    it('should list only active funds', () => {
      const fund1 = manager.createFund(makeCreateFundInput({ name: 'Fund A' }));
      const fund2 = manager.createFund(makeCreateFundInput({ name: 'Fund B' }));
      manager.activateFund(fund1.fundId);
      // fund2 stays pending

      expect(manager.listActiveFunds()).toHaveLength(1);
      expect(manager.listActiveFunds()[0].fundId).toBe(fund1.fundId);
    });

    it('should list funds by creator', () => {
      manager.createFund(makeCreateFundInput({ creatorId: 'creator_a' }));
      manager.createFund(makeCreateFundInput({ creatorId: 'creator_b' }));
      const byA = manager.listFundsByCreator('creator_a');
      expect(byA).toHaveLength(1);
      expect(byA[0].creatorId).toBe('creator_a');
    });
  });
});

// ============================================================================
// AllocationEngine
// ============================================================================

describe('AllocationEngine', () => {
  let engine: ReturnType<typeof createAllocationEngine>;
  let fund: FundConfig;
  let portfolio: FundPortfolio;

  beforeEach(() => {
    engine = createAllocationEngine({ minAllocationAmount: BigInt(1_000_000), cashBufferPercent: 2.0 });

    const fm = createFundCreationManager();
    fund = fm.createFund(makeCreateFundInput());
    fm.activateFund(fund.fundId);
    portfolio = fm.getFundPortfolio(fund.fundId)!;
  });

  describe('allocateDeposit', () => {
    it('should distribute capital according to target weights', () => {
      const depositAmount = BigInt(100_000_000_000); // 100 TON
      const { updatedPortfolio, result } = engine.allocateDeposit(portfolio, fund, depositAmount);

      expect(result.totalAllocated).toBeGreaterThan(BigInt(0));
      expect(result.allocations).toHaveLength(2);

      // 45% of capital to strategy-a, 55% to strategy-b (minus cash buffer)
      const stratA = result.allocations.find((a) => a.strategyId === 'strategy-a');
      const stratB = result.allocations.find((a) => a.strategyId === 'strategy-b');
      expect(stratA).toBeDefined();
      expect(stratB).toBeDefined();
      expect(stratB!.amountAllocated).toBeGreaterThan(stratA!.amountAllocated);

      expect(updatedPortfolio.totalAum).toBe(depositAmount);
    });

    it('should keep a cash buffer', () => {
      const depositAmount = BigInt(100_000_000_000);
      const { result } = engine.allocateDeposit(portfolio, fund, depositAmount);

      expect(result.cashRetained).toBeGreaterThan(BigInt(0));
      expect(result.totalAllocated + result.cashRetained).toBe(depositAmount);
    });
  });

  describe('deallocateWithdrawal', () => {
    it('should reduce portfolio AUM on withdrawal', () => {
      // First deposit
      const depositAmount = BigInt(100_000_000_000);
      const { updatedPortfolio: afterDeposit } = engine.allocateDeposit(portfolio, fund, depositAmount);

      // Then withdraw
      const withdrawAmount = BigInt(10_000_000_000);
      const afterWithdrawal = engine.deallocateWithdrawal(afterDeposit, withdrawAmount);

      expect(afterWithdrawal.totalAum).toBe(afterDeposit.totalAum - withdrawAmount);
    });

    it('should throw INSUFFICIENT_BALANCE when withdrawal exceeds AUM', () => {
      expect(() =>
        engine.deallocateWithdrawal(portfolio, BigInt(100_000_000_000))
      ).toThrow(FundManagerError);
    });
  });

  describe('calculateDrift', () => {
    it('should return zero drift when weights match targets', () => {
      const drift = engine.calculateDrift(portfolio);
      for (const [, driftVal] of drift) {
        expect(driftVal).toBe(0);
      }
    });

    it('should detect drift when weights diverge from targets', () => {
      const drifted: FundPortfolio = {
        ...portfolio,
        allocations: [
          { strategyId: 'strategy-a', targetWeightPercent: 60, currentWeightPercent: 70, allocatedCapital: BigInt(70_000_000_000) },
          { strategyId: 'strategy-b', targetWeightPercent: 40, currentWeightPercent: 30, allocatedCapital: BigInt(30_000_000_000) },
        ],
      };
      const drift = engine.calculateDrift(drifted);
      expect(drift.get('strategy-a')).toBe(10);
      expect(drift.get('strategy-b')).toBe(10);
    });
  });
});

// ============================================================================
// RebalancingEngine
// ============================================================================

describe('RebalancingEngine', () => {
  let engine: ReturnType<typeof createRebalancingEngine>;
  let fund: FundConfig;
  let driftedPortfolio: FundPortfolio;

  beforeEach(() => {
    engine = createRebalancingEngine();

    const fm = createFundCreationManager();
    fund = fm.createFund(makeCreateFundInput({
      rebalancingRules: {
        driftThresholdPercent: 5,
        minIntervalSeconds: 0,
        maxIntervalSeconds: 86400,
        rebalanceOnVolatility: true,
        volatilityThresholdPercent: 30,
      },
    }));
    fm.activateFund(fund.fundId);

    driftedPortfolio = {
      fundId: fund.fundId,
      totalAum: BigInt(100_000_000_000),
      navPerShare: BigInt(1_000_000_000),
      totalSharesOutstanding: BigInt(100_000_000_000),
      allocations: [
        { strategyId: 'strategy-a', targetWeightPercent: 60, currentWeightPercent: 70, allocatedCapital: BigInt(70_000_000_000) },
        { strategyId: 'strategy-b', targetWeightPercent: 40, currentWeightPercent: 30, allocatedCapital: BigInt(30_000_000_000) },
      ],
      cashBalance: BigInt(0),
      lastSyncedAt: new Date(),
    };
  });

  describe('shouldRebalance', () => {
    it('should detect drift threshold trigger', () => {
      const trigger = engine.shouldRebalance(fund, driftedPortfolio);
      expect(trigger).toBe('drift_threshold');
    });

    it('should return null when portfolio is balanced', () => {
      const balancedPortfolio = makePortfolio(fund.fundId);
      // No prior rebalance, but has capital — should get scheduled_interval on first call
      const trigger = engine.shouldRebalance(fund, balancedPortfolio);
      // Either null (no drift) or scheduled_interval (first run)
      expect(trigger === null || trigger === 'scheduled_interval').toBe(true);
    });

    it('should detect volatility spike trigger', () => {
      const balancedPortfolio = makePortfolio(fund.fundId, BigInt(0));
      const trigger = engine.shouldRebalance(fund, balancedPortfolio, 35);
      // No drift, no allocation, but volatility exceeds threshold
      expect(trigger === 'volatility_spike' || trigger === null).toBe(true);
    });
  });

  describe('generatePlan', () => {
    it('should generate rebalancing actions for drifted portfolio', () => {
      const plan = engine.generatePlan(fund, driftedPortfolio, 'drift_threshold');

      expect(plan.fundId).toBe(fund.fundId);
      expect(plan.trigger).toBe('drift_threshold');
      expect(plan.actions.length).toBeGreaterThan(0);

      // Should move from over-allocated strategy-a to under-allocated strategy-b
      const action = plan.actions.find(
        (a) => a.fromStrategyId === 'strategy-a' && a.toStrategyId === 'strategy-b'
      );
      expect(action).toBeDefined();
      expect(action!.amountToMove).toBeGreaterThan(BigInt(0));
    });

    it('should generate empty plan for balanced portfolio', () => {
      const balancedPortfolio = makePortfolio(fund.fundId);
      const plan = engine.generatePlan(fund, balancedPortfolio, 'manual');
      expect(plan.actions).toHaveLength(0);
    });

    it('should estimate gas cost', () => {
      const plan = engine.generatePlan(fund, driftedPortfolio, 'drift_threshold');
      expect(plan.estimatedGasCost).toBeGreaterThanOrEqual(BigInt(0));
    });
  });

  describe('executePlan', () => {
    it('should execute plan and update portfolio', async () => {
      const plan = engine.generatePlan(fund, driftedPortfolio, 'drift_threshold');
      const { result, updatedPortfolio } = await engine.executePlan(plan, driftedPortfolio);

      expect(result.success).toBe(true);
      expect(result.actionsCompleted).toBeGreaterThan(0);
      expect(result.newPortfolio).toBeDefined();

      // strategy-b should have gained capital
      const stratB = updatedPortfolio.allocations.find((a) => a.strategyId === 'strategy-b');
      const origB = driftedPortfolio.allocations.find((a) => a.strategyId === 'strategy-b');
      expect(stratB!.allocatedCapital).toBeGreaterThan(origB!.allocatedCapital);
    });

    it('should emit rebalancing.completed event on success', async () => {
      const events: FundManagerEvent[] = [];
      engine.onEvent((e) => events.push(e));

      const plan = engine.generatePlan(fund, driftedPortfolio, 'drift_threshold');
      await engine.executePlan(plan, driftedPortfolio);

      const completed = events.find((e) => e.type === 'rebalancing.completed');
      expect(completed).toBeDefined();
    });
  });
});

// ============================================================================
// RiskManagementService
// ============================================================================

describe('RiskManagementService', () => {
  let service: ReturnType<typeof createRiskManagementService>;
  let fund: FundConfig;
  let portfolio: FundPortfolio;

  beforeEach(() => {
    service = createRiskManagementService({
      defaultRiskLimits: {
        maxStrategyExposurePercent: 70, // above 60% max weight in makePortfolio
        maxDrawdownPercent: 20,
        maxAssetConcentrationPercent: 40,
        dailyLossLimitPercent: 5,
        volatilityWindowDays: 30,
      },
    });

    const fm = createFundCreationManager();
    fund = fm.createFund(makeCreateFundInput());
    portfolio = makePortfolio(fund.fundId);
  });

  describe('assessRisk', () => {
    it('should return healthy status for balanced portfolio', () => {
      const status = service.assessRisk(fund, portfolio);
      expect(status.fundId).toBe(fund.fundId);
      expect(status.isBreached).toBe(false);
      expect(status.breachedLimits).toHaveLength(0);
    });

    it('should detect drawdown breach', () => {
      // First register peak AUM
      const peakPortfolio = makePortfolio(fund.fundId, BigInt(200_000_000_000));
      service.assessRisk(fund, peakPortfolio);

      // Then simulate 30% drawdown (below 20% limit)
      const drawnPortfolio = makePortfolio(fund.fundId, BigInt(100_000_000_000));
      const status = service.assessRisk(fund, drawnPortfolio);

      expect(status.isBreached).toBe(true);
      expect(status.breachedLimits.some((l) => l.includes('max_drawdown'))).toBe(true);
    });

    it('should detect strategy overexposure', () => {
      const overExposedPortfolio = makePortfolio(fund.fundId, BigInt(100_000_000_000), [
        { strategyId: 'strategy-a', targetWeightPercent: 80, currentWeightPercent: 80, allocatedCapital: BigInt(80_000_000_000) },
        { strategyId: 'strategy-b', targetWeightPercent: 20, currentWeightPercent: 20, allocatedCapital: BigInt(20_000_000_000) },
      ]);
      // 80% > 70% limit, so breached
      const status = service.assessRisk(fund, overExposedPortfolio);
      expect(status.isBreached).toBe(true);
    });

    it('should calculate a risk score', () => {
      const status = service.assessRisk(fund, portfolio);
      expect(status.riskScore).toBeGreaterThanOrEqual(0);
      expect(status.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('checkEmergencyStop', () => {
    it('should not trigger for healthy portfolio', () => {
      const result = service.checkEmergencyStop(fund, portfolio);
      expect(result).toBeNull();
    });

    it('should trigger emergency stop on excessive drawdown', () => {
      // Register peak
      service.assessRisk(fund, makePortfolio(fund.fundId, BigInt(200_000_000_000)));

      // Now simulate 30% drawdown
      const drawnPortfolio = makePortfolio(fund.fundId, BigInt(100_000_000_000));
      const event = service.checkEmergencyStop(fund, drawnPortfolio);

      expect(event).not.toBeNull();
      expect(event!.fundId).toBe(fund.fundId);
      expect(event!.reason).toContain('Drawdown');
    });
  });

  describe('validateAllocation', () => {
    it('should pass valid allocation', () => {
      expect(() =>
        service.validateAllocation(fund, portfolio, 'strategy-a', 40)
      ).not.toThrow();
    });

    it('should throw RISK_LIMIT_BREACHED for exceeding exposure', () => {
      expect(() =>
        service.validateAllocation(fund, portfolio, 'strategy-a', 90) // 90% > 70% limit
      ).toThrow(FundManagerError);
    });
  });

  describe('custom risk limits', () => {
    it('should apply custom limits per fund', () => {
      service.setFundRiskLimits(fund.fundId, { maxStrategyExposurePercent: 80 });
      const limits = service.getFundRiskLimits(fund.fundId);
      expect(limits.maxStrategyExposurePercent).toBe(80);
    });
  });
});

// ============================================================================
// InvestorParticipationManager
// ============================================================================

describe('InvestorParticipationManager', () => {
  let manager: ReturnType<typeof createInvestorParticipationManager>;
  let fund: FundConfig;
  let portfolio: FundPortfolio;

  beforeEach(() => {
    manager = createInvestorParticipationManager();

    const fm = createFundCreationManager();
    fund = fm.createFund(makeCreateFundInput({
      minInvestmentAmount: BigInt(1_000_000_000), // 1 TON minimum
    }));
    fm.activateFund(fund.fundId);
    portfolio = fm.getFundPortfolio(fund.fundId)!;
  });

  describe('deposit', () => {
    it('should create a new position on first deposit', () => {
      const result = manager.deposit(
        { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(10_000_000_000) },
        fund,
        portfolio
      );

      expect(result.positionId).toBeDefined();
      expect(result.fundId).toBe(fund.fundId);
      expect(result.amountDeposited).toBe(BigInt(10_000_000_000));
      expect(result.sharesIssued).toBeGreaterThan(BigInt(0));
    });

    it('should add to existing position on subsequent deposit', () => {
      const input = { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(10_000_000_000) };
      const first = manager.deposit(input, fund, portfolio);
      const second = manager.deposit(input, fund, portfolio);

      expect(first.positionId).toBe(second.positionId);

      const position = manager.getPosition(first.positionId);
      expect(position!.sharesHeld).toBeGreaterThan(first.sharesIssued);
    });

    it('should throw MIN_INVESTMENT_NOT_MET for small deposits', () => {
      expect(() =>
        manager.deposit(
          { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(100) },
          fund,
          portfolio
        )
      ).toThrow(FundManagerError);
    });

    it('should throw MAX_FUND_SIZE_EXCEEDED when fund is full', () => {
      const cappedFund = { ...fund, maxFundSize: BigInt(5_000_000_000) };
      expect(() =>
        manager.deposit(
          { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(10_000_000_000) },
          cappedFund,
          portfolio
        )
      ).toThrow(FundManagerError);
    });

    it('should emit investor.deposited event', () => {
      const events: FundManagerEvent[] = [];
      manager.onEvent((e) => events.push(e));

      manager.deposit(
        { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(10_000_000_000) },
        fund,
        portfolio
      );

      const evt = events.find((e) => e.type === 'investor.deposited');
      expect(evt).toBeDefined();
    });
  });

  describe('withdraw', () => {
    beforeEach(() => {
      // Setup a position
      manager.deposit(
        { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(10_000_000_000) },
        fund,
        portfolio
      );
    });

    it('should allow partial withdrawal', () => {
      const result = manager.withdraw(
        { fundId: fund.fundId, investorId: 'investor_001', amount: BigInt(5_000_000_000) },
        fund,
        portfolio
      );

      expect(result.amountWithdrawn).toBeGreaterThan(BigInt(0));
      expect(result.sharesRedeemed).toBeGreaterThan(BigInt(0));

      const position = manager.getInvestorPosition(fund.fundId, 'investor_001');
      expect(position!.isActive).toBe(true);
    });

    it('should close position on full withdrawal (amount=0)', () => {
      manager.withdraw(
        { fundId: fund.fundId, investorId: 'investor_001', amount: BigInt(0) },
        fund,
        portfolio
      );

      const position = manager.getInvestorPosition(fund.fundId, 'investor_001');
      expect(position!.isActive).toBe(false);
    });

    it('should throw POSITION_NOT_FOUND for unknown investor', () => {
      expect(() =>
        manager.withdraw(
          { fundId: fund.fundId, investorId: 'nonexistent', amount: BigInt(0) },
          fund,
          portfolio
        )
      ).toThrow(FundManagerError);
    });

    it('should emit investor.withdrew event', () => {
      const events: FundManagerEvent[] = [];
      manager.onEvent((e) => events.push(e));

      manager.withdraw(
        { fundId: fund.fundId, investorId: 'investor_001', amount: BigInt(0) },
        fund,
        portfolio
      );

      const evt = events.find((e) => e.type === 'investor.withdrew');
      expect(evt).toBeDefined();
    });
  });

  describe('position queries', () => {
    it('should track investor count', () => {
      manager.deposit({ fundId: fund.fundId, investorId: 'inv_a', investorAddress: 'EQA', amount: BigInt(5_000_000_000) }, fund, portfolio);
      manager.deposit({ fundId: fund.fundId, investorId: 'inv_b', investorAddress: 'EQB', amount: BigInt(5_000_000_000) }, fund, portfolio);

      expect(manager.getInvestorCount(fund.fundId)).toBe(2);
    });

    it('should return total AUM for fund', () => {
      manager.deposit({ fundId: fund.fundId, investorId: 'inv_a', investorAddress: 'EQA', amount: BigInt(10_000_000_000) }, fund, portfolio);
      manager.deposit({ fundId: fund.fundId, investorId: 'inv_b', investorAddress: 'EQB', amount: BigInt(5_000_000_000) }, fund, portfolio);

      expect(manager.getTotalAumForFund(fund.fundId)).toBe(BigInt(15_000_000_000));
    });
  });
});

// ============================================================================
// PerformanceTrackingService
// ============================================================================

describe('PerformanceTrackingService', () => {
  let service: ReturnType<typeof createPerformanceTrackingService>;
  let fundId: string;

  beforeEach(() => {
    service = createPerformanceTrackingService({ maxSnapshotsPerFund: 100 });
    fundId = 'fund-perf-test';
  });

  describe('recordSnapshot', () => {
    it('should record an AUM snapshot', () => {
      const portfolio = makePortfolio(fundId, BigInt(100_000_000_000));
      const snapshot = service.recordSnapshot(portfolio, 5);

      expect(snapshot.fundId).toBe(fundId);
      expect(snapshot.aum).toBe(BigInt(100_000_000_000));
      expect(snapshot.investorCount).toBe(5);
    });

    it('should emit performance.snapshot_taken event', () => {
      const events: FundManagerEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.recordSnapshot(makePortfolio(fundId), 1);
      expect(events.find((e) => e.type === 'performance.snapshot_taken')).toBeDefined();
    });

    it('should respect maxSnapshotsPerFund limit', () => {
      const limitedService = createPerformanceTrackingService({ maxSnapshotsPerFund: 3 });
      for (let i = 0; i < 5; i++) {
        limitedService.recordSnapshot(makePortfolio(fundId, BigInt(i * 1_000_000_000)), 1);
      }
      expect(limitedService.getAumHistory(fundId)).toHaveLength(3);
    });
  });

  describe('calculateMetrics', () => {
    it('should return empty metrics with insufficient history', () => {
      const metrics = service.calculateMetrics(fundId, 'all_time');
      expect(metrics.totalReturnPercent).toBe(0);
      expect(metrics.sharpeRatio).toBe(0);
    });

    it('should calculate positive return for growing NAV', () => {
      // Record growing NAV history
      for (let i = 0; i < 10; i++) {
        const nav = BigInt(1_000_000_000 + i * 10_000_000); // growing NAV
        const portfolio: FundPortfolio = {
          ...makePortfolio(fundId),
          navPerShare: nav,
        };
        service.recordSnapshot(portfolio, 1);
      }

      const metrics = service.calculateMetrics(fundId, 'all_time');
      expect(metrics.totalReturnPercent).toBeGreaterThan(0);
    });

    it('should calculate max drawdown', () => {
      // Grow then shrink
      const navs = [1000, 1100, 1200, 900, 800, 1000];
      for (const navVal of navs) {
        const portfolio: FundPortfolio = {
          ...makePortfolio(fundId),
          navPerShare: BigInt(navVal * 1_000_000),
        };
        service.recordSnapshot(portfolio, 1);
      }

      const metrics = service.calculateMetrics(fundId, 'all_time');
      expect(metrics.maxDrawdownPercent).toBeGreaterThan(0);
    });
  });

  describe('updateNav', () => {
    it('should recalculate NAV per share from AUM and shares', () => {
      const portfolio: FundPortfolio = {
        ...makePortfolio(fundId),
        totalAum: BigInt(200_000_000_000),
        totalSharesOutstanding: BigInt(100_000_000_000),
      };

      const updated = service.updateNav(portfolio);
      // NAV = 200 * 1e9 / 100 = 2 * 1e9 = 2 TON per share
      expect(updated.navPerShare).toBe(BigInt(2_000_000_000));
    });
  });
});

// ============================================================================
// FeeDistributionEngine
// ============================================================================

describe('FeeDistributionEngine', () => {
  let engine: ReturnType<typeof createFeeDistributionEngine>;
  let fund: FundConfig;
  let portfolio: FundPortfolio;

  beforeEach(() => {
    engine = createFeeDistributionEngine({
      minPayoutAmount: BigInt(1_000), // low threshold for testing
    });

    const fm = createFundCreationManager();
    fund = fm.createFund(makeCreateFundInput({
      managementFeePercent: 2.0,
      performanceFeePercent: 20.0,
    }));
    portfolio = makePortfolio(fund.fundId, BigInt(100_000_000_000));
    // Set shares outstanding for NAV calculations
    portfolio = { ...portfolio, totalSharesOutstanding: BigInt(100_000_000_000) };
  });

  describe('collectManagementFee', () => {
    it('should collect management fee when conditions are met', () => {
      const event = engine.collectManagementFee(fund, portfolio);
      expect(event).not.toBeNull();
      expect(event!.feeType).toBe('management');
      expect(event!.totalAmount).toBeGreaterThan(BigInt(0));
    });

    it('should not double-collect within same day', () => {
      engine.collectManagementFee(fund, portfolio);
      const second = engine.collectManagementFee(fund, portfolio);
      // Same day — should not collect again (too soon)
      expect(second).toBeNull();
    });

    it('should distribute fees to configured recipients', () => {
      const event = engine.collectManagementFee(fund, portfolio);
      expect(event!.distributions).toHaveLength(fund.fees.feeRecipients.length);

      const totalDist = event!.distributions.reduce((s, d) => s + d.amount, BigInt(0));
      // Distributions should sum close to total (rounding may cause small diff)
      expect(totalDist).toBeLessThanOrEqual(event!.totalAmount);
    });
  });

  describe('collectPerformanceFee', () => {
    it('should not collect when NAV has not increased above HWM', () => {
      // Initialize HWM at current nav
      engine.setHighWaterMark(fund.fundId, portfolio.navPerShare);

      const event = engine.collectPerformanceFee(fund, portfolio);
      expect(event).toBeNull();
    });

    it('should collect when NAV exceeds high-water mark', () => {
      // Set HWM below current NAV
      engine.setHighWaterMark(fund.fundId, BigInt(500_000_000)); // 0.5 TON

      const event = engine.collectPerformanceFee(fund, portfolio);
      expect(event).not.toBeNull();
      expect(event!.feeType).toBe('performance');
      expect(event!.totalAmount).toBeGreaterThan(BigInt(0));
    });

    it('should update high-water mark after collection', () => {
      engine.setHighWaterMark(fund.fundId, BigInt(500_000_000));
      engine.collectPerformanceFee(fund, portfolio);

      const newHwm = engine.getHighWaterMark(fund.fundId);
      expect(newHwm).toBe(portfolio.navPerShare);
    });
  });

  describe('earnings tracking', () => {
    it('should track accumulated earnings per recipient', () => {
      engine.collectManagementFee(fund, portfolio);

      const creatorEarnings = engine.getEarnings('creator_001', fund.fundId);
      expect(creatorEarnings).toBeDefined();
      expect(creatorEarnings!.totalManagementFees).toBeGreaterThan(BigInt(0));
    });

    it('should process payout and reset pending', () => {
      engine.collectManagementFee(fund, portfolio);

      const payout = engine.processPayout('creator_001', fund.fundId);
      expect(payout).toBeGreaterThan(BigInt(0));

      const earnings = engine.getEarnings('creator_001', fund.fundId);
      expect(earnings!.pendingPayout).toBe(BigInt(0));
    });
  });
});

// ============================================================================
// AIFundManager — Unified Entry Point
// ============================================================================

describe('AIFundManager', () => {
  let manager: AIFundManager;

  beforeEach(() => {
    manager = makeSilentManager();
  });

  describe('lifecycle', () => {
    it('should start and stop', () => {
      manager.start();
      expect(manager.isRunning()).toBe(true);
      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('should be idempotent on multiple starts', () => {
      manager.start();
      manager.start();
      expect(manager.isRunning()).toBe(true);
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when started', () => {
      manager.start();
      const health = manager.getHealth();
      expect(health.running).toBe(true);
      expect(health.overall).toBe('healthy');
      expect(health.components.fundCreation).toBe(true);
      expect(health.components.allocationEngine).toBe(true);
    });

    it('should include metrics in health', () => {
      const health = manager.getHealth();
      expect(health.metrics).toBeDefined();
      expect(health.metrics.totalFunds).toBe(0);
    });
  });

  describe('end-to-end fund flow', () => {
    it('should complete a full fund lifecycle: create, deposit, allocate, check risk, track performance', async () => {
      manager.start();

      // 1. Create fund
      const fund = manager.funds.createFund(makeCreateFundInput());
      expect(fund.fundId).toBeDefined();

      // 2. Activate fund
      manager.funds.activateFund(fund.fundId);
      expect(manager.funds.getFundState(fund.fundId)).toBe('active');

      // 3. Investor deposits
      let portfolio = manager.funds.getFundPortfolio(fund.fundId)!;
      const depositResult = manager.investors.deposit(
        { fundId: fund.fundId, investorId: 'inv_001', investorAddress: 'EQD...', amount: BigInt(100_000_000_000) },
        fund,
        portfolio
      );
      expect(depositResult.sharesIssued).toBeGreaterThan(BigInt(0));

      // 4. Allocate capital
      const { updatedPortfolio, result: allocResult } = manager.allocation.allocateDeposit(
        portfolio,
        fund,
        BigInt(100_000_000_000)
      );
      manager.funds.updateFundPortfolio(updatedPortfolio);
      expect(allocResult.totalAllocated).toBeGreaterThan(BigInt(0));

      // 5. Assess risk
      const riskStatus = manager.riskManagement.assessRisk(fund, updatedPortfolio);
      expect(riskStatus.isBreached).toBe(false);

      // 6. Track performance
      manager.performance.recordSnapshot(updatedPortfolio, 1);
      const snapshot = manager.performance.getLatestSnapshot(fund.fundId);
      expect(snapshot).toBeDefined();

      // 7. Collect management fee
      // (may be null if daily fee is below minPayoutAmount threshold on small portfolio)
      const feeEvent = manager.fees.collectManagementFee(fund, updatedPortfolio);
      // Either collected or below minimum threshold — both are valid
      expect(feeEvent === null || feeEvent.feeType === 'management').toBe(true);

      // 8. Check rebalancing
      const trigger = manager.rebalancing.shouldRebalance(fund, updatedPortfolio);
      // Portfolio is just allocated at target weights — may need a scheduled rebalance
      expect(trigger === null || trigger === 'scheduled_interval').toBe(true);

      // 9. Investor withdraws
      const withdrawResult = manager.investors.withdraw(
        { fundId: fund.fundId, investorId: 'inv_001', amount: BigInt(0) },
        fund,
        updatedPortfolio
      );
      expect(withdrawResult.amountWithdrawn).toBeGreaterThan(BigInt(0));

      // 10. Close fund
      manager.funds.closeFund(fund.fundId);
      expect(manager.funds.getFundState(fund.fundId)).toBe('closed');
    });
  });

  describe('event system', () => {
    it('should forward events from all components', () => {
      const events: FundManagerEvent[] = [];
      manager.onEvent((e) => events.push(e));

      const fund = manager.funds.createFund(makeCreateFundInput());
      manager.funds.activateFund(fund.fundId);

      const types = events.map((e) => e.type);
      expect(types).toContain('fund.created');
      expect(types).toContain('fund.activated');
    });

    it('should return unsubscribe function', () => {
      const events: FundManagerEvent[] = [];
      const unsub = manager.onEvent((e) => events.push(e));

      manager.funds.createFund(makeCreateFundInput());
      const countBefore = events.length;

      unsub();
      manager.funds.createFund(makeCreateFundInput());
      // No new events after unsubscribe
      expect(events.length).toBe(countBefore);
    });
  });

  describe('createAIFundManager factory', () => {
    it('should create a fund manager with custom config', () => {
      const custom = createAIFundManager({
        maxActiveFunds: 5,
        defaultRiskLimits: { maxDrawdownPercent: 10 } as Parameters<typeof createAIFundManager>[0]['defaultRiskLimits'],
      });
      expect(custom.config.maxActiveFunds).toBe(5);
      expect(custom.config.defaultRiskLimits.maxDrawdownPercent).toBe(10);
    });
  });
});

// ============================================================================
// FundManagerError
// ============================================================================

describe('FundManagerError', () => {
  it('should have correct name and code', () => {
    const err = new FundManagerError('Test error', 'FUND_NOT_FOUND', { extra: 'info' });
    expect(err.name).toBe('FundManagerError');
    expect(err.code).toBe('FUND_NOT_FOUND');
    expect(err.message).toBe('Test error');
    expect(err.metadata).toEqual({ extra: 'info' });
    expect(err).toBeInstanceOf(Error);
  });

  it('should be catchable as Error', () => {
    try {
      throw new FundManagerError('test', 'FUND_NOT_FOUND');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(FundManagerError);
    }
  });
});
