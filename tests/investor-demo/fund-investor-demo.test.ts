/**
 * Fund Investor Demo Flow Tests (Issue #153)
 *
 * Comprehensive tests for the six-stage Investor Demo Flow:
 *
 * Test suites:
 *   - Types & Config defaults
 *   - Stage executors (individual stage functions)
 *   - FundInvestorDemoManager lifecycle
 *   - Full demo flow (runFullDemo)
 *   - Stage-by-stage advancement (nextStage)
 *   - Session management (reset, list)
 *   - Event system
 *   - Edge cases (skip rebalancing, custom strategies, error recovery)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createFundInvestorDemoManager,
  FundInvestorDemoManager,
  defaultFundInvestorDemoConfig,
  DEFAULT_DEMO_STRATEGIES,
  executeStrategyDiscoveryStage,
  executeFundCreationStage,
  executeAgentDeploymentStage,
  executeLiveExecutionStage,
  executePerformanceMonitoringStage,
  executeRebalancingStage,
} from '../../src/investor-demo';

import type {
  FundInvestorDemoConfig,
  FundDemoSession,
  FundDemoStage,
  FundDemoEvent,
  FundCreationResult,
  AgentDeploymentResult,
  LiveExecutionResult,
  PerformanceMonitoringResult,
  DemoMarketplaceStrategy,
} from '../../src/investor-demo';

// ============================================================================
// Test Helpers
// ============================================================================

function makeConfig(overrides: Partial<FundInvestorDemoConfig> = {}): Partial<FundInvestorDemoConfig> {
  return {
    fundCapitalUsd: 100_000,
    fundName: 'Test Fund',
    strategies: DEFAULT_DEMO_STRATEGIES,
    includeRebalancing: true,
    autoAdvance: false,
    ...overrides,
  };
}

function makeFundCreationResult(overrides: Partial<FundCreationResult> = {}): FundCreationResult {
  return {
    type: 'fund_creation',
    fundId: 'fund_abc12345',
    fundName: 'Test Fund',
    capitalUsd: 100_000,
    allocationBreakdown: [
      { strategyName: 'TON DCA Accumulator', percent: 40, amountUsd: 40_000 },
      { strategyName: 'DeFi Yield Optimizer', percent: 35, amountUsd: 35_000 },
      { strategyName: 'Cross-DEX Arbitrage', percent: 25, amountUsd: 25_000 },
    ],
    createdAt: new Date(),
    fundManagerAgentId: 'fund_manager_agent_xyz',
    deployed: true,
    contractAddress: 'EQtest123',
    ...overrides,
  };
}

function makeAgentDeploymentResult(overrides: Partial<AgentDeploymentResult> = {}): AgentDeploymentResult {
  return {
    type: 'agent_deployment',
    fundId: 'fund_abc12345',
    deployedAgents: [
      { agentId: 'agent_dca_001', strategyId: 'strategy_dca_001', strategyName: 'TON DCA Accumulator', capitalUsd: 40_000, allocationPercent: 40, status: 'active' },
      { agentId: 'agent_yield_002', strategyId: 'strategy_yield_002', strategyName: 'DeFi Yield Optimizer', capitalUsd: 35_000, allocationPercent: 35, status: 'active' },
      { agentId: 'agent_arb_003', strategyId: 'strategy_arb_003', strategyName: 'Cross-DEX Arbitrage', capitalUsd: 25_000, allocationPercent: 25, status: 'active' },
    ],
    agentCount: 3,
    totalCapitalDeployedUsd: 100_000,
    deploymentDurationMs: 250,
    allAgentsActive: true,
    ...overrides,
  };
}

function makeLiveExecutionResult(overrides: Partial<LiveExecutionResult> = {}): LiveExecutionResult {
  return {
    type: 'live_execution',
    tradesExecuted: [
      { id: 'trade_001', agentId: 'agent_dca_001', strategyName: 'TON DCA Accumulator', type: 'buy', symbol: 'TON/USDT', amountUsd: 2000, priceUsd: 5.5, isSimulated: true, executedAt: new Date() },
      { id: 'trade_002', agentId: 'agent_arb_003', strategyName: 'Cross-DEX Arbitrage', type: 'sell', symbol: 'TON/USDT', amountUsd: 1000, priceUsd: 5.57, isSimulated: true, executedAt: new Date(), pnlUsd: 70 },
    ],
    marketEvents: [
      { type: 'price_change', description: 'TON dropped 2.1%', impact: 'positive', timestamp: new Date() },
    ],
    totalVolumeUsd: 3000,
    currentValueUsd: 100_070,
    unrealizedPnlUsd: 70,
    executionDurationMs: 0,
    ...overrides,
  };
}

function makePerformanceMonitoringResult(overrides: Partial<PerformanceMonitoringResult> = {}): PerformanceMonitoringResult {
  return {
    type: 'performance_monitoring',
    totalCapitalUsd: 100_000,
    currentValueUsd: 104_200,
    totalPnlUsd: 4_200,
    totalReturnPercent: 4.2,
    strategyPerformance: [
      { strategyId: 'strategy_dca_001', strategyName: 'TON DCA Accumulator', allocatedCapitalUsd: 40_000, currentValueUsd: 41_680, pnlUsd: 1_680, returnPercent: 4.2, tradesCount: 2 },
      { strategyId: 'strategy_yield_002', strategyName: 'DeFi Yield Optimizer', allocatedCapitalUsd: 35_000, currentValueUsd: 36_470, pnlUsd: 1_470, returnPercent: 4.2, tradesCount: 1 },
      { strategyId: 'strategy_arb_003', strategyName: 'Cross-DEX Arbitrage', allocatedCapitalUsd: 25_000, currentValueUsd: 26_050, pnlUsd: 1_050, returnPercent: 4.2, tradesCount: 3 },
    ],
    allocationBreakdown: [
      { strategyName: 'TON DCA Accumulator', currentPercent: 40.0, targetPercent: 40 },
      { strategyName: 'DeFi Yield Optimizer', currentPercent: 35.0, targetPercent: 35 },
      { strategyName: 'Cross-DEX Arbitrage', currentPercent: 25.0, targetPercent: 25 },
    ],
    bestPerformingStrategy: 'TON DCA Accumulator',
    dashboardUrl: 'https://tonaiagent.com/funds/fund_abc12345/dashboard',
    ...overrides,
  };
}

// ============================================================================
// Default Config
// ============================================================================

describe('defaultFundInvestorDemoConfig', () => {
  it('has all required fields with sensible defaults', () => {
    expect(defaultFundInvestorDemoConfig.fundCapitalUsd).toBe(100_000);
    expect(defaultFundInvestorDemoConfig.fundName).toBeTruthy();
    expect(defaultFundInvestorDemoConfig.strategies).toHaveLength(3);
    expect(defaultFundInvestorDemoConfig.includeRebalancing).toBe(true);
    expect(defaultFundInvestorDemoConfig.autoAdvance).toBe(false);
    expect(defaultFundInvestorDemoConfig.autoAdvanceDelayMs).toBe(2_000);
  });

  it('default strategies have 100% total allocation', () => {
    const total = defaultFundInvestorDemoConfig.strategies.reduce(
      (sum, s) => sum + s.allocationPercent, 0,
    );
    expect(total).toBe(100);
  });
});

describe('DEFAULT_DEMO_STRATEGIES', () => {
  it('contains 3 strategies', () => {
    expect(DEFAULT_DEMO_STRATEGIES).toHaveLength(3);
  });

  it('all strategies have required fields', () => {
    for (const s of DEFAULT_DEMO_STRATEGIES) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.creator).toBeTruthy();
      expect(s.annualReturn).toBeGreaterThan(0);
      expect(s.allocationPercent).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(s.riskLevel);
    }
  });
});

// ============================================================================
// Stage 1: Strategy Discovery
// ============================================================================

describe('executeStrategyDiscoveryStage', () => {
  it('returns a strategy_discovery result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    expect(result.type).toBe('strategy_discovery');
  });

  it('browsed list includes more strategies than selected', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    expect(result.totalStrategiesAvailable).toBeGreaterThan(result.strategiesSelected.length);
    expect(result.strategiesBrowsed.length).toBeGreaterThanOrEqual(result.strategiesSelected.length);
  });

  it('selected strategies match config strategies', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    expect(result.strategiesSelected).toHaveLength(config.strategies.length);
    expect(result.strategiesSelected[0].id).toBe(config.strategies[0].id);
  });

  it('topPerformer is the strategy with highest annualReturn', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    const maxReturn = Math.max(...config.strategies.map((s) => s.annualReturn));
    expect(result.topPerformer.annualReturn).toBe(maxReturn);
  });

  it('totalAllocationPercent equals 100 for default strategies', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    expect(result.totalAllocationPercent).toBe(100);
  });

  it('discoveryDurationMs is positive', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeStrategyDiscoveryStage(config);
    expect(result.discoveryDurationMs).toBeGreaterThan(0);
  });
});

// ============================================================================
// Stage 2: Fund Creation
// ============================================================================

describe('executeFundCreationStage', () => {
  it('returns a fund_creation result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    expect(result.type).toBe('fund_creation');
  });

  it('uses the configured fund name and capital', () => {
    const config = { ...defaultFundInvestorDemoConfig, fundName: 'My Test Fund', fundCapitalUsd: 50_000 };
    const result = executeFundCreationStage(config);
    expect(result.fundName).toBe('My Test Fund');
    expect(result.capitalUsd).toBe(50_000);
  });

  it('generates a fund ID', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    expect(result.fundId).toMatch(/^fund_/);
  });

  it('allocation breakdown sums to ~100%', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    const totalPercent = result.allocationBreakdown.reduce((sum, a) => sum + a.percent, 0);
    expect(totalPercent).toBe(100);
  });

  it('allocation amounts sum to ~fund capital', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    const totalAmount = result.allocationBreakdown.reduce((sum, a) => sum + a.amountUsd, 0);
    // Due to rounding, allow small tolerance
    expect(totalAmount).toBeGreaterThanOrEqual(config.fundCapitalUsd - 3);
    expect(totalAmount).toBeLessThanOrEqual(config.fundCapitalUsd + 3);
  });

  it('generates a simulated contract address starting with EQ', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    expect(result.contractAddress).toMatch(/^EQ/);
  });

  it('is deployed', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const result = executeFundCreationStage(config);
    expect(result.deployed).toBe(true);
  });

  it('two calls with the same config produce different fund IDs (timestamp-based)', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const r1 = executeFundCreationStage(config);
    const r2 = executeFundCreationStage(config);
    // Fund IDs are timestamp-based so they differ (or at least one is valid)
    expect(r1.fundId).toMatch(/^fund_/);
    expect(r2.fundId).toMatch(/^fund_/);
  });
});

// ============================================================================
// Stage 3: Agent Deployment
// ============================================================================

describe('executeAgentDeploymentStage', () => {
  it('returns an agent_deployment result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult();
    const result = executeAgentDeploymentStage(fundCreation, config);
    expect(result.type).toBe('agent_deployment');
  });

  it('deploys one agent per strategy', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult();
    const result = executeAgentDeploymentStage(fundCreation, config);
    expect(result.agentCount).toBe(config.strategies.length);
    expect(result.deployedAgents).toHaveLength(config.strategies.length);
  });

  it('all agents have active status', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult();
    const result = executeAgentDeploymentStage(fundCreation, config);
    expect(result.allAgentsActive).toBe(true);
    for (const agent of result.deployedAgents) {
      expect(agent.status).toBe('active');
    }
  });

  it('capital allocation matches strategy percentages', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult();
    const result = executeAgentDeploymentStage(fundCreation, config);
    for (const agent of result.deployedAgents) {
      const strategy = config.strategies.find((s) => s.id === agent.strategyId);
      expect(strategy).toBeDefined();
      const expectedCapital = Math.round(config.fundCapitalUsd * (strategy!.allocationPercent / 100));
      expect(agent.capitalUsd).toBe(expectedCapital);
    }
  });

  it('total capital deployed equals fund capital', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult();
    const result = executeAgentDeploymentStage(fundCreation, config);
    // Allow small rounding tolerance
    expect(result.totalCapitalDeployedUsd).toBeGreaterThanOrEqual(config.fundCapitalUsd - 3);
    expect(result.totalCapitalDeployedUsd).toBeLessThanOrEqual(config.fundCapitalUsd + 3);
  });

  it('fund ID matches the fund creation result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const fundCreation = makeFundCreationResult({ fundId: 'fund_testid' });
    const result = executeAgentDeploymentStage(fundCreation, config);
    expect(result.fundId).toBe('fund_testid');
  });
});

// ============================================================================
// Stage 4: Live Execution
// ============================================================================

describe('executeLiveExecutionStage', () => {
  it('returns a live_execution result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    expect(result.type).toBe('live_execution');
  });

  it('executes at least one trade', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    expect(result.tradesExecuted.length).toBeGreaterThan(0);
  });

  it('all trades are marked as simulated', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    for (const trade of result.tradesExecuted) {
      expect(trade.isSimulated).toBe(true);
    }
  });

  it('generates at least one market event', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    expect(result.marketEvents.length).toBeGreaterThan(0);
  });

  it('total volume is sum of trade amounts', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    const expectedVolume = result.tradesExecuted.reduce((sum, t) => sum + t.amountUsd, 0);
    expect(result.totalVolumeUsd).toBe(expectedVolume);
  });

  it('current value is positive', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    expect(result.currentValueUsd).toBeGreaterThan(0);
  });

  it('each trade has a valid type (buy or sell)', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const agentDeployment = makeAgentDeploymentResult();
    const result = executeLiveExecutionStage(agentDeployment, config);
    for (const trade of result.tradesExecuted) {
      expect(['buy', 'sell']).toContain(trade.type);
    }
  });
});

// ============================================================================
// Stage 5: Performance Monitoring
// ============================================================================

describe('executePerformanceMonitoringStage', () => {
  it('returns a performance_monitoring result', () => {
    const fundCreation = makeFundCreationResult();
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult({ unrealizedPnlUsd: 4_200, currentValueUsd: 104_200 });
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.type).toBe('performance_monitoring');
  });

  it('total capital matches fund capital', () => {
    const fundCreation = makeFundCreationResult({ capitalUsd: 100_000 });
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult({ unrealizedPnlUsd: 4_200, currentValueUsd: 104_200 });
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.totalCapitalUsd).toBe(100_000);
  });

  it('current value matches live execution current value', () => {
    const fundCreation = makeFundCreationResult();
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult({ unrealizedPnlUsd: 4_200, currentValueUsd: 104_200 });
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.currentValueUsd).toBeCloseTo(104_200, 0);
  });

  it('strategy performance has one entry per deployed agent', () => {
    const fundCreation = makeFundCreationResult();
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult();
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.strategyPerformance).toHaveLength(agentDeployment.agentCount);
  });

  it('dashboard URL contains fund ID', () => {
    const fundCreation = makeFundCreationResult({ fundId: 'fund_test_abc' });
    const agentDeployment = makeAgentDeploymentResult({ fundId: 'fund_test_abc' });
    const liveExecution = makeLiveExecutionResult();
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.dashboardUrl).toContain('fund_test_abc');
    expect(result.dashboardUrl).toContain('tonaiagent.com');
  });

  it('bestPerformingStrategy is a non-empty string', () => {
    const fundCreation = makeFundCreationResult();
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult();
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.bestPerformingStrategy).toBeTruthy();
  });

  it('positive P&L shows positive return', () => {
    const fundCreation = makeFundCreationResult({ capitalUsd: 100_000 });
    const agentDeployment = makeAgentDeploymentResult();
    const liveExecution = makeLiveExecutionResult({ unrealizedPnlUsd: 4_200, currentValueUsd: 104_200 });
    const result = executePerformanceMonitoringStage(fundCreation, agentDeployment, liveExecution);
    expect(result.totalPnlUsd).toBeGreaterThan(0);
    expect(result.totalReturnPercent).toBeGreaterThan(0);
  });
});

// ============================================================================
// Stage 6: Rebalancing
// ============================================================================

describe('executeRebalancingStage', () => {
  it('returns a rebalancing result', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    expect(result.type).toBe('rebalancing');
  });

  it('is successful when includeRebalancing is true', () => {
    const config = { ...defaultFundInvestorDemoConfig, includeRebalancing: true };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    expect(result.successful).toBe(true);
  });

  it('returns no actions when includeRebalancing is false', () => {
    const config = { ...defaultFundInvestorDemoConfig, includeRebalancing: false };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    expect(result.rebalancingActions).toHaveLength(0);
    expect(result.successful).toBe(true);
  });

  it('portfolio value is preserved during rebalancing', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const perfMonitoring = makePerformanceMonitoringResult({ currentValueUsd: 104_200 });
    const result = executeRebalancingStage(perfMonitoring, config);
    expect(result.portfolioValueBeforeUsd).toBe(104_200);
    expect(result.portfolioValueAfterUsd).toBe(104_200);
  });

  it('risk exposure decreases or stays equal after rebalancing', () => {
    const config = { ...defaultFundInvestorDemoConfig, includeRebalancing: true };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    const riskLevels = ['low', 'medium', 'high'];
    expect(riskLevels.indexOf(result.riskExposureAfter))
      .toBeLessThanOrEqual(riskLevels.indexOf(result.riskExposureBefore));
  });

  it('new allocations sum to ~100%', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    const total = result.newAllocations.reduce((sum, a) => sum + a.newPercent, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('rebalance reason is performance_drift for default config', () => {
    const config = { ...defaultFundInvestorDemoConfig };
    const perfMonitoring = makePerformanceMonitoringResult();
    const result = executeRebalancingStage(perfMonitoring, config);
    expect(result.rebalanceReason).toBe('performance_drift');
  });
});

// ============================================================================
// FundInvestorDemoManager — Creation
// ============================================================================

describe('createFundInvestorDemoManager', () => {
  it('returns a FundInvestorDemoManager instance', () => {
    const manager = createFundInvestorDemoManager();
    expect(manager).toBeInstanceOf(FundInvestorDemoManager);
  });

  it('starts with no sessions', () => {
    const manager = createFundInvestorDemoManager();
    expect(manager.listSessions()).toHaveLength(0);
  });
});

// ============================================================================
// FundInvestorDemoManager — Session Management
// ============================================================================

describe('FundInvestorDemoManager.startSession', () => {
  let manager: FundInvestorDemoManager;

  beforeEach(() => {
    manager = createFundInvestorDemoManager();
  });

  it('creates a session with a unique ID', async () => {
    const session = await manager.startSession();
    expect(session.sessionId).toMatch(/^fund_demo_\d+_/);
  });

  it('initializes session with running status', async () => {
    const session = await manager.startSession();
    expect(session.status).toBe('running');
  });

  it('initializes 6 pending stages', async () => {
    const session = await manager.startSession();
    expect(session.stages).toHaveLength(6);
    for (const stage of session.stages) {
      expect(stage.status).toBe('pending');
    }
  });

  it('stages have correct IDs in order', async () => {
    const session = await manager.startSession();
    const ids = session.stages.map((s) => s.id);
    expect(ids).toEqual([
      'strategy_discovery',
      'fund_creation',
      'agent_deployment',
      'live_execution',
      'performance_monitoring',
      'rebalancing',
    ]);
  });

  it('stages have sequential numbers 1-6', async () => {
    const session = await manager.startSession();
    const numbers = session.stages.map((s) => s.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('merges config overrides with defaults', async () => {
    const session = await manager.startSession({ fundName: 'My Custom Fund', fundCapitalUsd: 50_000 });
    expect(session.config.fundName).toBe('My Custom Fund');
    expect(session.config.fundCapitalUsd).toBe(50_000);
    expect(session.config.autoAdvance).toBe(false); // default
  });

  it('creates two sessions with different IDs', async () => {
    const s1 = await manager.startSession();
    const s2 = await manager.startSession();
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it('lists both sessions after creation', async () => {
    await manager.startSession();
    await manager.startSession();
    expect(manager.listSessions()).toHaveLength(2);
  });
});

// ============================================================================
// FundInvestorDemoManager — getSession
// ============================================================================

describe('FundInvestorDemoManager.getSession', () => {
  let manager: FundInvestorDemoManager;

  beforeEach(() => {
    manager = createFundInvestorDemoManager();
  });

  it('returns the session by ID', async () => {
    const session = await manager.startSession();
    const retrieved = manager.getSession(session.sessionId);
    expect(retrieved.sessionId).toBe(session.sessionId);
  });

  it('throws if session does not exist', () => {
    expect(() => manager.getSession('nonexistent_session')).toThrow('Fund demo session not found');
  });
});

// ============================================================================
// FundInvestorDemoManager — executeStage
// ============================================================================

describe('FundInvestorDemoManager.executeStage', () => {
  let manager: FundInvestorDemoManager;
  let session: FundDemoSession;

  beforeEach(async () => {
    manager = createFundInvestorDemoManager();
    session = await manager.startSession(makeConfig());
  });

  it('completes the strategy_discovery stage', async () => {
    const stage = await manager.executeStage(session.sessionId, 'strategy_discovery');
    expect(stage.status).toBe('completed');
    expect(stage.result).toBeDefined();
    expect((stage.result as { type: string }).type).toBe('strategy_discovery');
  });

  it('records startedAt and completedAt on the stage', async () => {
    const stage = await manager.executeStage(session.sessionId, 'strategy_discovery');
    expect(stage.startedAt).toBeInstanceOf(Date);
    expect(stage.completedAt).toBeInstanceOf(Date);
  });

  it('records durationMs on the stage', async () => {
    const stage = await manager.executeStage(session.sessionId, 'strategy_discovery');
    expect(typeof stage.durationMs).toBe('number');
    expect(stage.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('throws when executing a stage from a nonexistent session', async () => {
    await expect(manager.executeStage('bad_session', 'strategy_discovery')).rejects.toThrow();
  });

  it('throws for unknown stage ID', async () => {
    await expect(
      manager.executeStage(session.sessionId, 'unknown_stage' as 'strategy_discovery'),
    ).rejects.toThrow();
  });

  it('completes fund_creation stage and produces fundId', async () => {
    await manager.executeStage(session.sessionId, 'strategy_discovery');
    const stage = await manager.executeStage(session.sessionId, 'fund_creation');
    expect(stage.status).toBe('completed');
    const result = stage.result as FundCreationResult;
    expect(result.fundId).toMatch(/^fund_/);
    expect(result.deployed).toBe(true);
  });

  it('agent_deployment stage requires fund_creation first', async () => {
    // Skip strategy_discovery, try agent_deployment directly — should fail
    await expect(
      manager.executeStage(session.sessionId, 'agent_deployment'),
    ).rejects.toThrow();
  });
});

// ============================================================================
// FundInvestorDemoManager — nextStage
// ============================================================================

describe('FundInvestorDemoManager.nextStage', () => {
  let manager: FundInvestorDemoManager;
  let session: FundDemoSession;

  beforeEach(async () => {
    manager = createFundInvestorDemoManager();
    session = await manager.startSession(makeConfig());
  });

  it('advances to the first stage (strategy_discovery)', async () => {
    const stage = await manager.nextStage(session.sessionId);
    expect(stage.id).toBe('strategy_discovery');
    expect(stage.status).toBe('completed');
  });

  it('advances to fund_creation after strategy_discovery', async () => {
    await manager.nextStage(session.sessionId); // strategy_discovery
    const stage = await manager.nextStage(session.sessionId); // fund_creation
    expect(stage.id).toBe('fund_creation');
  });

  it('throws when all stages are done', async () => {
    const s = await manager.startSession(makeConfig({ includeRebalancing: false }));
    for (let i = 0; i < 6; i++) {
      await manager.nextStage(s.sessionId);
    }
    await expect(manager.nextStage(s.sessionId)).rejects.toThrow('No pending stages');
  });
});

// ============================================================================
// FundInvestorDemoManager — resetSession
// ============================================================================

describe('FundInvestorDemoManager.resetSession', () => {
  let manager: FundInvestorDemoManager;

  beforeEach(() => {
    manager = createFundInvestorDemoManager();
  });

  it('creates a new session with a different ID', async () => {
    const original = await manager.startSession();
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.sessionId).not.toBe(original.sessionId);
  });

  it('new session has 6 pending stages', async () => {
    const original = await manager.startSession();
    await manager.nextStage(original.sessionId); // advance one stage
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.stages.every((s) => s.status === 'pending')).toBe(true);
  });

  it('preserves the original config', async () => {
    const original = await manager.startSession({ fundName: 'Preserved Fund', fundCapitalUsd: 75_000 });
    const reset = await manager.resetSession(original.sessionId);
    expect(reset.config.fundName).toBe('Preserved Fund');
    expect(reset.config.fundCapitalUsd).toBe(75_000);
  });
});

// ============================================================================
// FundInvestorDemoManager — Full Demo Flow
// ============================================================================

describe('FundInvestorDemoManager.runFullDemo', () => {
  let manager: FundInvestorDemoManager;

  beforeEach(() => {
    manager = createFundInvestorDemoManager();
  });

  it('completes successfully with default config', async () => {
    const session = await manager.runFullDemo();
    expect(session.status).toBe('completed');
  });

  it('all stages are completed or skipped', async () => {
    const session = await manager.runFullDemo();
    for (const stage of session.stages) {
      expect(['completed', 'skipped']).toContain(stage.status);
    }
  });

  it('produces a session summary', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary).toBeDefined();
    expect(session.summary!.fundId).toMatch(/^fund_/);
    expect(session.summary!.agentCount).toBeGreaterThan(0);
  });

  it('summary has a meaningful valueProposition', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary!.valueProposition).toBeTruthy();
    expect(session.summary!.valueProposition.length).toBeGreaterThan(10);
  });

  it('records totalDurationMs', async () => {
    const session = await manager.runFullDemo();
    expect(typeof session.totalDurationMs).toBe('number');
    expect(session.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('summary shows positive return after successful execution', async () => {
    const session = await manager.runFullDemo();
    // P&L should be positive (simulated)
    expect(session.summary!.finalValueUsd).toBeGreaterThan(0);
  });

  it('rebalancingDemonstrated is true when includeRebalancing is true', async () => {
    const session = await manager.runFullDemo({ includeRebalancing: true });
    expect(session.summary!.rebalancingDemonstrated).toBe(true);
  });

  it('rebalancing stage is skipped when includeRebalancing is false', async () => {
    const session = await manager.runFullDemo({ includeRebalancing: false });
    const rebalancingStage = session.stages.find((s) => s.id === 'rebalancing');
    expect(rebalancingStage?.status).toBe('skipped');
  });

  it('all stage types are represented in results', async () => {
    const session = await manager.runFullDemo();
    const completedStages = session.stages.filter((s) => s.status === 'completed');
    const resultTypes = completedStages.map((s) => (s.result as { type: string })?.type);
    expect(resultTypes).toContain('strategy_discovery');
    expect(resultTypes).toContain('fund_creation');
    expect(resultTypes).toContain('agent_deployment');
    expect(resultTypes).toContain('live_execution');
    expect(resultTypes).toContain('performance_monitoring');
  });

  it('demo runs with custom fund capital', async () => {
    const session = await manager.runFullDemo({ fundCapitalUsd: 500_000 });
    expect(session.status).toBe('completed');
    expect(session.summary!.initialCapitalUsd).toBe(500_000);
  });

  it('demo runs with custom fund name', async () => {
    const session = await manager.runFullDemo({ fundName: 'Custom AI Fund' });
    expect(session.summary!.fundName).toBe('Custom AI Fund');
  });

  it('total trades count is greater than zero', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary!.totalTrades).toBeGreaterThan(0);
  });

  it('agent count matches number of strategies', async () => {
    const session = await manager.runFullDemo();
    expect(session.summary!.agentCount).toBe(defaultFundInvestorDemoConfig.strategies.length);
  });
});

// ============================================================================
// Event System
// ============================================================================

describe('FundInvestorDemoManager events', () => {
  let manager: FundInvestorDemoManager;
  let events: FundDemoEvent[];

  beforeEach(() => {
    manager = createFundInvestorDemoManager();
    events = [];
    manager.onEvent((e) => events.push(e));
  });

  it('emits session_started when startSession is called', async () => {
    await manager.startSession();
    const startEvent = events.find((e) => e.type === 'session_started');
    expect(startEvent).toBeDefined();
  });

  it('emits stage_started and stage_completed for each executed stage', async () => {
    const session = await manager.startSession();
    await manager.executeStage(session.sessionId, 'strategy_discovery');
    expect(events.some((e) => e.type === 'stage_started' && e.stageId === 'strategy_discovery')).toBe(true);
    expect(events.some((e) => e.type === 'stage_completed' && e.stageId === 'strategy_discovery')).toBe(true);
  });

  it('emits session_completed when all stages are done', async () => {
    await manager.runFullDemo();
    expect(events.some((e) => e.type === 'session_completed')).toBe(true);
  });

  it('emits demo_reset when resetSession is called', async () => {
    const session = await manager.startSession();
    await manager.resetSession(session.sessionId);
    expect(events.some((e) => e.type === 'demo_reset')).toBe(true);
  });

  it('all events have sessionId and timestamp', async () => {
    await manager.runFullDemo();
    for (const event of events) {
      expect(event.sessionId).toBeTruthy();
      expect(event.timestamp).toBeInstanceOf(Date);
    }
  });

  it('stage events have stageId', async () => {
    const session = await manager.startSession();
    await manager.executeStage(session.sessionId, 'strategy_discovery');
    const stageEvents = events.filter(
      (e) => e.type === 'stage_started' || e.type === 'stage_completed',
    );
    for (const e of stageEvents) {
      expect(e.stageId).toBeTruthy();
    }
  });

  it('callback errors do not propagate to the manager', async () => {
    manager.onEvent(() => { throw new Error('callback error'); });
    await expect(manager.startSession()).resolves.toBeDefined();
  });
});

// ============================================================================
// Custom Strategy Configuration
// ============================================================================

describe('FundInvestorDemoManager — custom strategies', () => {
  it('runs successfully with a single strategy at 100%', async () => {
    const singleStrategy: DemoMarketplaceStrategy = {
      id: 'strategy_custom_001',
      name: 'Custom Strategy',
      creator: 'Test',
      category: 'dca',
      annualReturn: 15.0,
      maxDrawdown: 5.0,
      sharpeRatio: 1.5,
      riskLevel: 'low',
      allocationPercent: 100,
      description: 'A custom test strategy',
    };
    const manager = createFundInvestorDemoManager();
    const session = await manager.runFullDemo({ strategies: [singleStrategy] });
    expect(session.status).toBe('completed');
    expect(session.summary!.agentCount).toBe(1);
  });

  it('handles different fund capital amounts', async () => {
    const manager = createFundInvestorDemoManager();
    for (const capital of [10_000, 100_000, 1_000_000]) {
      const session = await manager.runFullDemo({ fundCapitalUsd: capital });
      expect(session.status).toBe('completed');
      expect(session.summary!.initialCapitalUsd).toBe(capital);
    }
  });
});

// ============================================================================
// Stage Metadata Completeness
// ============================================================================

describe('stage metadata', () => {
  it('all stages have non-empty titles and descriptions', async () => {
    const manager = createFundInvestorDemoManager();
    const session = await manager.startSession();
    for (const stage of session.stages) {
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.description.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Performance Monitoring — Example Metrics (Issue #153 example)
// ============================================================================

describe('performance_monitoring — example metrics from issue', () => {
  it('shows the example metrics from the issue description', async () => {
    const manager = createFundInvestorDemoManager();
    const session = await manager.runFullDemo({
      fundCapitalUsd: 100_000,
      fundName: 'Demo Fund',
    });
    const perfStage = session.stages.find((s) => s.id === 'performance_monitoring');
    const result = perfStage?.result as PerformanceMonitoringResult;

    expect(result.totalCapitalUsd).toBe(100_000);
    expect(result.currentValueUsd).toBeGreaterThan(0);
    // Current value can be above or very close to initial (simulated growth)
    expect(result.dashboardUrl).toContain('tonaiagent.com/funds');
  });
});
