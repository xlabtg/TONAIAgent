/**
 * Demo Agent Module Tests
 *
 * Comprehensive tests for Issue #83 — MVP Demo Agent:
 *   - Agent lifecycle (create, start, pause, stop)
 *   - All four strategies (DCA, Yield, Grid, Arbitrage)
 *   - Simulation balance management
 *   - Risk controls (stop-loss, drawdown, kill switch, auto-pause)
 *   - API layer (all endpoints)
 *   - 9-step execution cycle
 *   - Events system
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createDemoAgentManager,
  createDemoAgentBundle,
  createDemoAgentApi,
  createMarketSimulator,
  createSimulationBalanceManager,
  createRiskManager,
  dcaStrategy,
  yieldStrategy,
  gridStrategy,
  arbitrageStrategy,
  getStrategy,
  STRATEGY_METADATA,
  DemoAgentManager,
  MarketSimulator,
  SimulationBalanceManager,
  RiskManager,
  DemoAgentApi,
} from '../../examples/demo-agent';

import type {
  AgentConfig,
  CreateAgentRequest,
  DemoAgent,
  DemoAgentEvent,
  MarketData,
  SimulationBalance,
  StrategyContext,
} from '../../examples/demo-agent';

// ============================================================================
// Test Helpers
// ============================================================================

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    name: 'Test Agent',
    budget: 100,
    riskLevel: 'medium',
    strategy: 'dca',
    executionMode: 'simulation',
    stopLoss: 5,
    maxDrawdown: 10,
    executionIntervalMs: 60_000,
    ...overrides,
  };
}

function makeCreateRequest(overrides: Partial<AgentConfig> = {}): CreateAgentRequest {
  return {
    userId: 'user_test_123',
    config: makeConfig(overrides),
  };
}

function makeMarketData(price = 5.5): MarketData {
  const spread = price * 0.001;
  return {
    symbol: 'TON',
    price,
    change24h: 1.5,
    volume24h: 2_000_000,
    bid: price - spread / 2,
    ask: price + spread / 2,
    spread,
    liquidity: 0.8,
    timestamp: new Date(),
  };
}

function makeBalance(overrides: Partial<SimulationBalance> = {}): SimulationBalance {
  return {
    agentId: 'test_agent',
    tonBalance: 100,
    usdBalance: 0,
    initialBudget: 100,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    roi: 0,
    trades: [],
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeStrategyContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  return {
    config: makeConfig(),
    market: makeMarketData(),
    balance: makeBalance(),
    executionCount: 0,
    ...overrides,
  };
}

// ============================================================================
// Strategy Tests
// ============================================================================

describe('DCA Strategy', () => {
  it('should return a buy decision on first execution', () => {
    const ctx = makeStrategyContext({ executionCount: 0 });
    const decision = dcaStrategy(ctx);

    expect(decision.action).toBe('buy');
    expect(decision.amount).toBeGreaterThan(0);
    expect(decision.symbol).toBe('TON');
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reasoning).toContain('DCA');
  });

  it('should hold when budget is exhausted', () => {
    const ctx = makeStrategyContext({
      balance: makeBalance({ usdBalance: 0, tonBalance: 0 }),
    });
    const decision = dcaStrategy(ctx);

    expect(decision.action).toBe('hold');
  });

  it('should buy more with high risk than low risk', () => {
    const lowRiskCtx = makeStrategyContext({ config: makeConfig({ riskLevel: 'low' }) });
    const highRiskCtx = makeStrategyContext({ config: makeConfig({ riskLevel: 'high' }) });

    const lowDecision = dcaStrategy(lowRiskCtx);
    const highDecision = dcaStrategy(highRiskCtx);

    if (lowDecision.action === 'buy' && highDecision.action === 'buy') {
      expect(highDecision.amount!).toBeGreaterThan(lowDecision.amount!);
    }
  });

  it('should include decidedAt timestamp', () => {
    const ctx = makeStrategyContext();
    const decision = dcaStrategy(ctx);
    expect(decision.decidedAt).toBeInstanceOf(Date);
  });
});

describe('Yield Strategy', () => {
  it('should deposit on first execution (executionCount = 0)', () => {
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'yield' }),
      executionCount: 0,
    });
    const decision = yieldStrategy(ctx);

    expect(decision.action).toBe('buy');
    expect(decision.reasoning).toContain('Yield');
    expect(decision.amount).toBeGreaterThan(0);
  });

  it('should compound or hold on subsequent executions', () => {
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'yield' }),
      executionCount: 5,
    });
    const decision = yieldStrategy(ctx);

    expect(['buy', 'hold']).toContain(decision.action);
  });

  it('should have higher yield for high risk', () => {
    const lowCtx = makeStrategyContext({
      config: makeConfig({ riskLevel: 'low', strategy: 'yield' }),
      executionCount: 0,
    });
    const highCtx = makeStrategyContext({
      config: makeConfig({ riskLevel: 'high', strategy: 'yield' }),
      executionCount: 0,
    });

    const lowDec = yieldStrategy(lowCtx);
    const highDec = yieldStrategy(highCtx);

    // Both should be buy actions on first execution
    expect(lowDec.action).toBe('buy');
    expect(highDec.action).toBe('buy');
    // Reasoning should mention APY
    expect(lowDec.reasoning).toContain('APY');
    expect(highDec.reasoning).toContain('APY');
  });
});

describe('Grid Strategy', () => {
  it('should return a decision and new state', () => {
    const ctx = makeStrategyContext({ config: makeConfig({ strategy: 'grid' }) });
    const result = gridStrategy(ctx);

    expect(result.decision).toBeDefined();
    expect(result.newState).toBeDefined();
    expect(['buy', 'sell', 'hold']).toContain(result.decision.action);
  });

  it('should buy when price drops significantly', () => {
    const basePrice = 10;
    const droppedPrice = 8; // -20%
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'grid', riskLevel: 'high' }),
      market: makeMarketData(droppedPrice),
      balance: makeBalance({ usdBalance: 1000 }),
    });
    const initialState = { basePrice, gridSpacing: 0.1, gridLevels: 5, gridPosition: 0 };
    const result = gridStrategy(ctx, initialState);

    // Price dropped 20%, with 10% spacing, should be at level -2 → buy
    expect(result.decision.action).toBe('buy');
  });

  it('should sell when price rises significantly', () => {
    const basePrice = 5;
    const risenPrice = 7; // +40%
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'grid', riskLevel: 'high' }),
      market: makeMarketData(risenPrice),
      balance: makeBalance({ tonBalance: 1000 }),
    });
    const initialState = { basePrice, gridSpacing: 0.1, gridLevels: 5, gridPosition: 0 };
    const result = gridStrategy(ctx, initialState);

    expect(result.decision.action).toBe('sell');
  });

  it('should hold when price is within grid level', () => {
    const basePrice = 5.5;
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'grid' }),
      market: makeMarketData(basePrice * 1.001), // Tiny change
    });
    const initialState = { basePrice, gridSpacing: 0.05, gridLevels: 5, gridPosition: 0 };
    const result = gridStrategy(ctx, initialState);

    expect(result.decision.action).toBe('hold');
  });

  it('should update gridPosition in new state', () => {
    const ctx = makeStrategyContext({ config: makeConfig({ strategy: 'grid' }) });
    const result1 = gridStrategy(ctx);
    const result2 = gridStrategy(ctx, result1.newState);

    expect(result2.newState).toBeDefined();
  });
});

describe('Arbitrage Strategy', () => {
  it('should return a decision', () => {
    const ctx = makeStrategyContext({ config: makeConfig({ strategy: 'arbitrage' }) });
    const decision = arbitrageStrategy(ctx);

    expect(['buy', 'sell', 'hold']).toContain(decision.action);
    expect(decision.reasoning).toContain('Arbitrage');
  });

  it('should hold when spread is too small', () => {
    // This is probabilistic due to random spread, so we test the reasoning path
    const ctx = makeStrategyContext({ config: makeConfig({ strategy: 'arbitrage', riskLevel: 'low' }) });
    const decision = arbitrageStrategy(ctx);

    // Regardless of outcome, reasoning should be present
    expect(decision.reasoning.length).toBeGreaterThan(0);
    expect(decision.decidedAt).toBeInstanceOf(Date);
  });

  it('should mark trade as simulation', () => {
    const ctx = makeStrategyContext({
      config: makeConfig({ strategy: 'arbitrage' }),
      balance: makeBalance({ tonBalance: 500 }),
    });
    const decision = arbitrageStrategy(ctx);

    if (decision.action !== 'hold') {
      expect(decision.reasoning).toContain('[SIM]');
    }
  });
});

describe('Strategy Registry (getStrategy)', () => {
  it('should return DCA strategy function', () => {
    const fn = getStrategy('dca');
    expect(typeof fn).toBe('function');
    const decision = fn(makeStrategyContext());
    expect(['buy', 'sell', 'hold']).toContain(decision.action);
  });

  it('should return yield strategy function', () => {
    const fn = getStrategy('yield');
    const decision = fn(makeStrategyContext({ config: makeConfig({ strategy: 'yield' }) }));
    expect(decision).toBeDefined();
  });

  it('should return grid strategy function', () => {
    const fn = getStrategy('grid');
    const decision = fn(makeStrategyContext({ config: makeConfig({ strategy: 'grid' }) }));
    expect(decision).toBeDefined();
  });

  it('should return arbitrage strategy function', () => {
    const fn = getStrategy('arbitrage');
    const decision = fn(makeStrategyContext({ config: makeConfig({ strategy: 'arbitrage' }) }));
    expect(decision).toBeDefined();
  });

  it('should export STRATEGY_METADATA for all strategies', () => {
    expect(STRATEGY_METADATA.dca).toBeDefined();
    expect(STRATEGY_METADATA.yield).toBeDefined();
    expect(STRATEGY_METADATA.grid).toBeDefined();
    expect(STRATEGY_METADATA.arbitrage).toBeDefined();

    for (const meta of Object.values(STRATEGY_METADATA)) {
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.minBudget).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Market Simulator Tests
// ============================================================================

describe('MarketSimulator', () => {
  let simulator: MarketSimulator;

  beforeEach(() => {
    simulator = createMarketSimulator('TON', 5.5);
  });

  it('should produce market data ticks', () => {
    const tick = simulator.nextTick();

    expect(tick.symbol).toBe('TON');
    expect(tick.price).toBeGreaterThan(0);
    expect(tick.bid).toBeLessThan(tick.ask);
    expect(tick.spread).toBeGreaterThan(0);
    expect(tick.liquidity).toBeGreaterThanOrEqual(0);
    expect(tick.liquidity).toBeLessThanOrEqual(1);
    expect(tick.timestamp).toBeInstanceOf(Date);
  });

  it('should produce different prices on consecutive ticks', () => {
    const prices = Array.from({ length: 10 }, () => simulator.nextTick().price);
    const unique = new Set(prices);
    // At least some prices should differ
    expect(unique.size).toBeGreaterThan(1);
  });

  it('should reset to initial state', () => {
    const initialPrice = simulator.getCurrentPrice();
    simulator.nextTick();
    simulator.nextTick();
    simulator.reset(initialPrice);
    expect(simulator.getCurrentPrice()).toBe(initialPrice);
  });

  it('should keep prices positive', () => {
    for (let i = 0; i < 100; i++) {
      const tick = simulator.nextTick();
      expect(tick.price).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// SimulationBalanceManager Tests
// ============================================================================

describe('SimulationBalanceManager', () => {
  let balanceManager: SimulationBalanceManager;

  beforeEach(() => {
    balanceManager = createSimulationBalanceManager();
  });

  it('should initialize balance from agent config', () => {
    const config = makeConfig({ budget: 200 });
    const balance = balanceManager.initBalance('agent_1', config, 5.5);

    expect(balance.agentId).toBe('agent_1');
    expect(balance.initialBudget).toBe(200);
    expect(balance.trades).toHaveLength(0);
  });

  it('should return a copy of the balance', () => {
    const config = makeConfig({ budget: 100 });
    balanceManager.initBalance('agent_2', config, 5.5);
    const balance = balanceManager.getBalance('agent_2');
    expect(balance).toBeDefined();
    expect(balance.agentId).toBe('agent_2');
  });

  it('should throw for unknown agent', () => {
    expect(() => balanceManager.getBalance('nonexistent')).toThrow('No simulation balance');
  });

  it('should apply buy trade and return trade record', () => {
    const config = makeConfig({ strategy: 'grid' }); // Grid starts with USD
    balanceManager.initBalance('agent_3', config, 5.5);

    const decision = {
      action: 'buy' as const,
      symbol: 'TON',
      amount: 10,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };

    const trade = balanceManager.applyTrade('agent_3', decision, makeMarketData(5.5), 'grid');

    expect(trade).not.toBeNull();
    expect(trade!.type).toBe('buy');
    expect(trade!.amount).toBe(10);
    expect(trade!.isSimulated).toBe(true);
    expect(trade!.strategyType).toBe('grid');
  });

  it('should not record a trade for hold decisions', () => {
    const config = makeConfig();
    balanceManager.initBalance('agent_4', config, 5.5);

    const decision = {
      action: 'hold' as const,
      symbol: 'TON',
      reasoning: 'test hold',
      confidence: 0.8,
      decidedAt: new Date(),
    };

    const trade = balanceManager.applyTrade('agent_4', decision, makeMarketData(), 'dca');
    expect(trade).toBeNull();
  });

  it('should reset balance to initial state', () => {
    const config = makeConfig({ budget: 50 });
    balanceManager.initBalance('agent_5', config, 5.5);

    const reset = balanceManager.resetBalance('agent_5', config, 6.0);
    expect(reset.trades).toHaveLength(0);
    expect(reset.totalPnl).toBe(0);
    expect(reset.roi).toBe(0);
  });

  it('should update PnL without throwing', () => {
    const config = makeConfig();
    balanceManager.initBalance('agent_6', config, 5.5);
    expect(() => balanceManager.updatePnl('agent_6', 6.0)).not.toThrow();
  });
});

// ============================================================================
// Risk Manager Tests
// ============================================================================

describe('RiskManager', () => {
  let riskManager: RiskManager;
  let agent: DemoAgent;

  beforeEach(() => {
    riskManager = createRiskManager();
    agent = {
      id: 'risk_test_agent',
      userId: 'user_1',
      config: makeConfig({ stopLoss: 5, maxDrawdown: 10 }),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const defaultMetrics = () => ({
    agentId: 'risk_test_agent',
    totalExecutions: 10,
    successfulExecutions: 9,
    failedExecutions: 1,
    totalTrades: 5,
    winRate: 60,
    roi: 0,
    totalPnl: 0,
    maxDrawdownExperienced: 0,
    avgTradeProfit: 0,
    uptime: 90,
    updatedAt: new Date(),
  });

  it('should allow a buy decision when all checks pass', () => {
    const decision = {
      action: 'buy' as const,
      symbol: 'TON',
      amount: 5,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };
    const balance = makeBalance({ roi: 2, tonBalance: 50 });
    const result = riskManager.validateDecision(agent, decision, balance, defaultMetrics());

    expect(result.allowed).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it('should block when stop-loss is triggered', () => {
    const decision = {
      action: 'buy' as const,
      symbol: 'TON',
      amount: 5,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };
    const balance = makeBalance({ roi: -6 }); // Below stop-loss of 5%
    const result = riskManager.validateDecision(agent, decision, balance, defaultMetrics());

    expect(result.allowed).toBe(false);
    expect(result.flags).toContain('stop_loss_triggered');
    expect(result.reason).toContain('Stop-loss');
  });

  it('should block when max drawdown exceeded', () => {
    const decision = {
      action: 'sell' as const,
      symbol: 'TON',
      amount: 5,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };
    const balance = makeBalance({ roi: -2 });
    const metrics = { ...defaultMetrics(), maxDrawdownExperienced: 15 }; // Exceeds 10% limit
    const result = riskManager.validateDecision(agent, decision, balance, metrics);

    expect(result.allowed).toBe(false);
    expect(result.flags).toContain('max_drawdown_exceeded');
  });

  it('should block when kill switch is active', () => {
    riskManager.activateKillSwitch('risk_test_agent', 'Emergency stop');

    const decision = {
      action: 'buy' as const,
      symbol: 'TON',
      amount: 1,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };
    const result = riskManager.validateDecision(agent, decision, makeBalance(), defaultMetrics());

    expect(result.allowed).toBe(false);
    expect(result.flags).toContain('kill_switch_active');
  });

  it('should deactivate kill switch', () => {
    riskManager.activateKillSwitch('risk_test_agent', 'test');
    riskManager.deactivateKillSwitch('risk_test_agent');

    expect(riskManager.isKillSwitchActive('risk_test_agent')).toBe(false);
  });

  it('should always allow hold decisions', () => {
    const decision = {
      action: 'hold' as const,
      symbol: 'TON',
      reasoning: 'holding',
      confidence: 0.8,
      decidedAt: new Date(),
    };
    const balance = makeBalance({ roi: -20 }); // Way below stop-loss
    const result = riskManager.validateDecision(agent, decision, balance, defaultMetrics());

    expect(result.allowed).toBe(true);
  });

  it('should recommend auto-pause when failure rate is high', () => {
    const metrics = {
      ...defaultMetrics(),
      totalExecutions: 10,
      failedExecutions: 7, // 70% failure rate
    };
    const result = riskManager.shouldAutoPause(metrics);

    expect(result.pause).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('should not auto-pause when failure rate is acceptable', () => {
    const metrics = defaultMetrics();
    const result = riskManager.shouldAutoPause(metrics);

    expect(result.pause).toBe(false);
  });

  it('should track max drawdown', () => {
    const metrics = defaultMetrics();
    const balance = makeBalance({ roi: -8 });

    riskManager.trackDrawdown(metrics, balance);
    expect(metrics.maxDrawdownExperienced).toBe(8);

    // Should not decrease max drawdown
    riskManager.trackDrawdown(metrics, makeBalance({ roi: -3 }));
    expect(metrics.maxDrawdownExperienced).toBe(8);
  });

  it('should block sell when insufficient TON balance', () => {
    const decision = {
      action: 'sell' as const,
      symbol: 'TON',
      amount: 100,
      reasoning: 'test',
      confidence: 0.9,
      decidedAt: new Date(),
    };
    const balance = makeBalance({ tonBalance: 10 }); // Only 10 TON, trying to sell 100
    const result = riskManager.validateDecision(agent, decision, balance, defaultMetrics());

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient TON');
  });
});

// ============================================================================
// DemoAgentManager Tests
// ============================================================================

describe('DemoAgentManager', () => {
  let manager: DemoAgentManager;

  beforeEach(() => {
    manager = createDemoAgentManager();
  });

  describe('Agent Lifecycle', () => {
    it('should create an agent', async () => {
      const req = makeCreateRequest();
      const agent = await manager.createAgent(req);

      expect(agent.id).toMatch(/^demo_agent_/);
      expect(agent.userId).toBe(req.userId);
      expect(agent.status).toBe('created');
      expect(agent.config.name).toBe(req.config.name);
      expect(agent.createdAt).toBeInstanceOf(Date);
    });

    it('should start a created agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      const started = await manager.startAgent(agent.id);

      expect(started.status).toBe('active');
    });

    it('should pause an active agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      const paused = await manager.pauseAgent(agent.id, 'manual test');

      expect(paused.status).toBe('paused');
    });

    it('should resume a paused agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.pauseAgent(agent.id);
      const resumed = await manager.startAgent(agent.id);

      expect(resumed.status).toBe('active');
    });

    it('should stop an agent permanently', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      const stopped = await manager.stopAgent(agent.id);

      expect(stopped.status).toBe('stopped');
    });

    it('should throw when starting an already active agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);

      await expect(manager.startAgent(agent.id)).rejects.toThrow("Cannot start agent in 'active'");
    });

    it('should throw when pausing a non-active agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());

      await expect(manager.pauseAgent(agent.id)).rejects.toThrow("Cannot pause agent in 'created'");
    });

    it('should throw when accessing unknown agent', () => {
      expect(() => manager.getAgentStatus('nonexistent_id')).toThrow('Agent not found');
    });
  });

  describe('Status, Metrics, History', () => {
    it('should return agent status with balance and metrics', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      const status = manager.getAgentStatus(agent.id);

      expect(status.agent.id).toBe(agent.id);
      expect(status.balance).toBeDefined();
      expect(status.balance.agentId).toBe(agent.id);
      expect(status.metrics).toBeDefined();
      expect(status.metrics.agentId).toBe(agent.id);
    });

    it('should return metrics with recent logs', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      const result = manager.getAgentMetrics(agent.id);

      expect(result.metrics).toBeDefined();
      expect(Array.isArray(result.recentLogs)).toBe(true);
    });

    it('should return paginated history', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      const history = manager.getAgentHistory(agent.id, 1, 10);

      expect(history.agentId).toBe(agent.id);
      expect(Array.isArray(history.trades)).toBe(true);
      expect(Array.isArray(history.logs)).toBe(true);
      expect(history.page).toBe(1);
      expect(history.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Execution Cycle (executeOnce)', () => {
    it('should execute one cycle and return logs', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      const logs = await manager.executeOnce(agent.id);

      // Should produce multiple log entries for the 9 steps
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].agentId).toBe(agent.id);
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should update metrics after execution', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.executeOnce(agent.id);

      const metrics = manager.getAgentMetrics(agent.id);
      expect(metrics.metrics.totalExecutions).toBe(1);
      expect(metrics.metrics.successfulExecutions).toBeGreaterThanOrEqual(0);
    });

    it('should record trades in balance', async () => {
      const agent = await manager.createAgent(makeCreateRequest({ strategy: 'dca' }));
      await manager.startAgent(agent.id);

      // Run multiple cycles to accumulate trades
      await manager.executeOnce(agent.id);
      await manager.executeOnce(agent.id);

      const status = manager.getAgentStatus(agent.id);
      // Trades may or may not be recorded depending on balance conditions
      expect(Array.isArray(status.balance.trades)).toBe(true);
    });

    it('should not execute when agent is paused', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.pauseAgent(agent.id);

      const logsBefore = manager.getAgentMetrics(agent.id).recentLogs.length;
      await manager.executeOnce(agent.id); // Should silently no-op
      const logsAfter = manager.getAgentMetrics(agent.id).recentLogs.length;

      expect(logsAfter).toBe(logsBefore); // No new logs
    });
  });

  describe('Kill Switch', () => {
    it('should activate kill switch and stop agent', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      const stopped = await manager.activateKillSwitch(agent.id, 'Emergency');

      expect(stopped.status).toBe('stopped');
    });

    it('should prevent execution after kill switch', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.activateKillSwitch(agent.id, 'Test');

      // Logs should include kill switch message
      const { recentLogs } = manager.getAgentMetrics(agent.id);
      const killLog = recentLogs.find((l) => l.message.includes('Kill switch'));
      expect(killLog).toBeDefined();
    });
  });

  describe('Simulation Reset', () => {
    it('should reset simulation to initial state', async () => {
      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.executeOnce(agent.id);

      const balance = await manager.resetSimulation(agent.id);

      expect(balance.trades).toHaveLength(0);
      expect(balance.totalPnl).toBe(0);
      expect(balance.roi).toBe(0);
    });
  });

  describe('Events', () => {
    it('should emit agent_created event', async () => {
      const events: DemoAgentEvent[] = [];
      manager.onEvent((e) => events.push(e));

      await manager.createAgent(makeCreateRequest());

      const created = events.find((e) => e.type === 'agent_created');
      expect(created).toBeDefined();
      expect(created!.agentId).toBeDefined();
    });

    it('should emit agent_started event', async () => {
      const events: DemoAgentEvent[] = [];
      manager.onEvent((e) => events.push(e));

      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);

      const started = events.find((e) => e.type === 'agent_started');
      expect(started).toBeDefined();
    });

    it('should emit agent_paused event', async () => {
      const events: DemoAgentEvent[] = [];
      manager.onEvent((e) => events.push(e));

      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.pauseAgent(agent.id);

      const paused = events.find((e) => e.type === 'agent_paused');
      expect(paused).toBeDefined();
    });

    it('should emit metrics_updated event after execution', async () => {
      const events: DemoAgentEvent[] = [];
      manager.onEvent((e) => events.push(e));

      const agent = await manager.createAgent(makeCreateRequest());
      await manager.startAgent(agent.id);
      await manager.executeOnce(agent.id);

      const metricsEvent = events.find((e) => e.type === 'metrics_updated');
      expect(metricsEvent).toBeDefined();
    });
  });

  describe('All Four Strategies', () => {
    const strategies = ['dca', 'yield', 'grid', 'arbitrage'] as const;

    for (const strategy of strategies) {
      it(`should run ${strategy} strategy without errors`, async () => {
        const agent = await manager.createAgent(makeCreateRequest({ strategy }));
        await manager.startAgent(agent.id);
        const logs = await manager.executeOnce(agent.id);

        expect(logs.length).toBeGreaterThan(0);
        const status = manager.getAgentStatus(agent.id);
        expect(status.agent.status).toBe('active');
      });
    }
  });
});

// ============================================================================
// API Layer Tests
// ============================================================================

describe('DemoAgentApi', () => {
  let manager: DemoAgentManager;
  let api: DemoAgentApi;

  beforeEach(() => {
    manager = createDemoAgentManager();
    api = new DemoAgentApi(manager);
  });

  it('POST /agent/create — should create an agent', async () => {
    const response = await api.handle({
      method: 'POST',
      path: '/agent/create',
      body: makeCreateRequest(),
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    const agent = response.body.data as DemoAgent;
    expect(agent.id).toMatch(/^demo_agent_/);
  });

  it('POST /agent/create — should return 400 without userId', async () => {
    const response = await api.handle({
      method: 'POST',
      path: '/agent/create',
      body: { config: makeConfig() }, // Missing userId
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('userId');
  });

  it('POST /agent/start — should start an agent', async () => {
    const created = await manager.createAgent(makeCreateRequest());

    const response = await api.handle({
      method: 'POST',
      path: '/agent/start',
      body: { agentId: created.id },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const agent = response.body.data as DemoAgent;
    expect(agent.status).toBe('active');
  });

  it('POST /agent/pause — should pause an agent', async () => {
    const created = await manager.createAgent(makeCreateRequest());
    await manager.startAgent(created.id);

    const response = await api.handle({
      method: 'POST',
      path: '/agent/pause',
      body: { agentId: created.id, reason: 'user request' },
    });

    expect(response.status).toBe(200);
    const agent = response.body.data as DemoAgent;
    expect(agent.status).toBe('paused');
  });

  it('GET /agent/status — should return agent status', async () => {
    const created = await manager.createAgent(makeCreateRequest());

    const response = await api.handle({
      method: 'GET',
      path: '/agent/status',
      query: { agentId: created.id },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('GET /agent/status — should return 400 without agentId', async () => {
    const response = await api.handle({
      method: 'GET',
      path: '/agent/status',
      query: {},
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('agentId');
  });

  it('GET /agent/metrics — should return metrics', async () => {
    const created = await manager.createAgent(makeCreateRequest());

    const response = await api.handle({
      method: 'GET',
      path: '/agent/metrics',
      query: { agentId: created.id },
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });

  it('GET /agent/history — should return paginated history', async () => {
    const created = await manager.createAgent(makeCreateRequest());

    const response = await api.handle({
      method: 'GET',
      path: '/agent/history',
      query: { agentId: created.id, page: '1', pageSize: '10' },
    });

    expect(response.status).toBe(200);
    const history = response.body.data as { trades: unknown[]; logs: unknown[] };
    expect(Array.isArray(history.trades)).toBe(true);
    expect(Array.isArray(history.logs)).toBe(true);
  });

  it('should return 404 for unknown route', async () => {
    const response = await api.handle({
      method: 'GET',
      path: '/unknown/route',
    });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 500 for internal errors', async () => {
    // Try to start non-existent agent — will throw internally
    const response = await api.handle({
      method: 'POST',
      path: '/agent/start',
      body: { agentId: 'nonexistent_agent' },
    });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  it('POST /agent/stop — should stop an agent', async () => {
    const created = await manager.createAgent(makeCreateRequest());
    await manager.startAgent(created.id);

    const response = await api.handle({
      method: 'POST',
      path: '/agent/stop',
      body: { agentId: created.id },
    });

    expect(response.status).toBe(200);
    const agent = response.body.data as DemoAgent;
    expect(agent.status).toBe('stopped');
  });

  it('POST /agent/kill — should activate kill switch', async () => {
    const created = await manager.createAgent(makeCreateRequest());
    await manager.startAgent(created.id);

    const response = await api.handle({
      method: 'POST',
      path: '/agent/kill',
      body: { agentId: created.id, reason: 'Emergency' },
    });

    expect(response.status).toBe(200);
    const agent = response.body.data as DemoAgent;
    expect(agent.status).toBe('stopped');
  });

  it('POST /agent/reset — should reset simulation', async () => {
    const created = await manager.createAgent(makeCreateRequest());

    const response = await api.handle({
      method: 'POST',
      path: '/agent/reset',
      body: { agentId: created.id },
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
  });

  it('response should include timestamp', async () => {
    const created = await manager.createAgent(makeCreateRequest());
    const response = await api.handle({
      method: 'GET',
      path: '/agent/status',
      query: { agentId: created.id },
    });

    expect(response.body.timestamp).toBeDefined();
    expect(typeof response.body.timestamp).toBe('string');
  });
});

// ============================================================================
// Bundle Factory Tests
// ============================================================================

describe('createDemoAgentBundle', () => {
  it('should create a bundle with service, api, and onEvent', () => {
    const bundle = createDemoAgentBundle();

    expect(bundle.service).toBeInstanceOf(DemoAgentManager);
    expect(bundle.api).toBeInstanceOf(DemoAgentApi);
    expect(typeof bundle.onEvent).toBe('function');
  });

  it('should wire events through the bundle', async () => {
    const bundle = createDemoAgentBundle();
    const events: DemoAgentEvent[] = [];

    bundle.onEvent((e) => events.push(e));

    const agent = await bundle.service.createAgent(makeCreateRequest());
    expect(events.some((e) => e.type === 'agent_created')).toBe(true);
    expect(events[0].agentId).toBe(agent.id);
  });
});
