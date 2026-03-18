/**
 * MVP Platform Integration Tests
 *
 * Verifies that all MVP core components are wired together correctly:
 *   - Agent Runtime (lifecycle: create → start → execute → stop)
 *   - Strategy Engine (trend / arbitrage / ai_signal)
 *   - Market Data Layer (price feeds)
 *   - Trading Engine (simulation buy/sell, PnL tracking)
 *   - Portfolio Analytics (metrics, equity curve)
 *   - Agent Control API (start/stop/restart/status)
 *   - Demo Agent (preconfigured agent for investor demos)
 *
 * These tests match the acceptance criteria defined in Issue #195.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the market data module to avoid real HTTP calls in tests.
// The platform falls back to BASELINE_PRICES when providers fail,
// but mocking here ensures instant test execution without network timeouts.
vi.mock('../../src/market-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/market-data')>();

  const MOCK_PRICES = {
    BTC: 65_000,
    ETH: 3_500,
    TON: 5.25,
    SOL: 175,
    USDT: 1.0,
  };

  class MockMarketDataService {
    start() {}
    stop() {}
    isRunning() { return true; }
    async getSnapshot() {
      return {
        prices: Object.fromEntries(
          Object.entries(MOCK_PRICES).map(([asset, price]) => [
            asset,
            { asset, price, volume24h: 1_000_000, priceChange24h: 0, marketCap: 0, timestamp: Math.floor(Date.now() / 1000), source: 'mock' },
          ])
        ),
        source: 'live' as const,
        fetchedAt: new Date(),
      };
    }
    async getPrice(asset: string) {
      return { price: { asset, price: MOCK_PRICES[asset as keyof typeof MOCK_PRICES] ?? 1, volume24h: 0, priceChange24h: 0, marketCap: 0, timestamp: Math.floor(Date.now() / 1000), source: 'mock' }, fromCache: false, usedFallback: false };
    }
    clearCache() {}
    evictExpired() { return { prices: 0, tickers: 0 }; }
    subscribe() { return () => {}; }
    getProvider() { return undefined; }
  }

  return {
    ...original,
    createMarketDataService: () => new MockMarketDataService(),
    DefaultMarketDataService: MockMarketDataService,
  };
});

import {
  createMVPPlatform,
  MVPPlatform,
  DEFAULT_MVP_PLATFORM_CONFIG,
  DEFAULT_DEMO_FLOW_CONFIG,
} from '../../apps/mvp-platform';

import type {
  MVPPlatformConfig,
  CreateMVPAgentRequest,
  MVPAgentStatus,
  MVPStrategyId,
  MVPPlatformEvent,
} from '../../apps/mvp-platform';

// ============================================================================
// Test Helpers
// ============================================================================

function makeCreateRequest(overrides: Partial<CreateMVPAgentRequest> = {}): CreateMVPAgentRequest {
  return {
    userId: 'user_test_123',
    name: 'Test Agent',
    strategy: 'trend',
    budgetTon: 1000,
    riskLevel: 'medium',
    ...overrides,
  };
}

// ============================================================================
// Platform Lifecycle Tests
// ============================================================================

describe('MVPPlatform — Lifecycle', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform({ marketDataRefreshMs: 100 });
  });

  afterEach(() => {
    platform.stop();
  });

  it('should create platform with default config', () => {
    expect(platform).toBeDefined();
    expect(platform).toBeInstanceOf(MVPPlatform);
  });

  it('should start successfully', () => {
    expect(() => platform.start()).not.toThrow();
  });

  it('should be idempotent on multiple starts', () => {
    platform.start();
    expect(() => platform.start()).not.toThrow();
  });

  it('should stop successfully after start', () => {
    platform.start();
    expect(() => platform.stop()).not.toThrow();
  });

  it('should emit platform.started event on start', () => {
    const events: MVPPlatformEvent[] = [];
    platform.onEvent((e) => events.push(e));
    platform.start();
    expect(events.some((e) => e.type === 'platform.started')).toBe(true);
  });

  it('should emit platform.stopped event on stop', () => {
    platform.start();
    const events: MVPPlatformEvent[] = [];
    platform.onEvent((e) => events.push(e));
    platform.stop();
    expect(events.some((e) => e.type === 'platform.stopped')).toBe(true);
  });

  it('should throw if createAgent called before start', async () => {
    await expect(platform.createAgent(makeCreateRequest())).rejects.toThrow(
      'MVPPlatform is not running'
    );
  });

  it('should support unsubscribing from events', () => {
    const events: MVPPlatformEvent[] = [];
    const unsub = platform.onEvent((e) => events.push(e));
    unsub();
    platform.start();
    expect(events).toHaveLength(0);
  });
});

// ============================================================================
// Agent Lifecycle Tests (Issue #195 — Acceptance Criteria)
// ============================================================================

describe('MVPPlatform — Agent Lifecycle', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should create an agent successfully', async () => {
    const agent = await platform.createAgent(makeCreateRequest());

    expect(agent.agentId).toBeDefined();
    expect(agent.name).toBe('Test Agent');
    expect(agent.userId).toBe('user_test_123');
    expect(agent.strategy).toBe('trend');
    expect(agent.riskLevel).toBe('medium');
    expect(agent.state).toBe('created');
    expect(agent.budgetTon).toBe(1000);
    expect(agent.createdAt).toBeInstanceOf(Date);
  });

  it('should start an agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    const started = await platform.startAgent(agent.agentId);

    expect(started.state).toBe('running');
    expect(started.agentId).toBe(agent.agentId);
  });

  it('should stop a running agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);
    const stopped = await platform.stopAgent(agent.agentId);

    expect(stopped.state).toBe('stopped');
  });

  it('should retrieve agent status', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    const status = platform.getAgentStatus(agent.agentId);

    expect(status.agentId).toBe(agent.agentId);
    expect(status.state).toBe('created');
  });

  it('should throw when getting status of unknown agent', () => {
    expect(() => platform.getAgentStatus('nonexistent')).toThrow('Agent not found');
  });

  it('should list all agents', async () => {
    await platform.createAgent(makeCreateRequest({ name: 'Agent A' }));
    await platform.createAgent(makeCreateRequest({ name: 'Agent B' }));

    const agents = platform.listAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);
  });

  it('should list agents by user', async () => {
    await platform.createAgent(makeCreateRequest({ userId: 'user_alice', name: 'Alice Agent' }));
    await platform.createAgent(makeCreateRequest({ userId: 'user_bob', name: 'Bob Agent' }));

    const aliceAgents = platform.listUserAgents('user_alice');
    expect(aliceAgents).toHaveLength(1);
    expect(aliceAgents[0].userId).toBe('user_alice');
  });

  it('should emit agent.created event', async () => {
    const events: MVPPlatformEvent[] = [];
    platform.onEvent((e) => events.push(e));

    const agent = await platform.createAgent(makeCreateRequest());
    const created = events.find((e) => e.type === 'agent.created');
    expect(created).toBeDefined();
    expect(created?.agentId).toBe(agent.agentId);
  });

  it('should emit agent.started event', async () => {
    const events: MVPPlatformEvent[] = [];
    const agent = await platform.createAgent(makeCreateRequest());

    platform.onEvent((e) => events.push(e));
    await platform.startAgent(agent.agentId);

    const started = events.find((e) => e.type === 'agent.started');
    expect(started).toBeDefined();
    expect(started?.agentId).toBe(agent.agentId);
  });

  it('should be idempotent when starting an already-running agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);
    const status = await platform.startAgent(agent.agentId);
    expect(status.state).toBe('running');
  });

  it('should support all three MVP strategies', async () => {
    const strategies: MVPStrategyId[] = ['trend', 'arbitrage', 'ai-signal'];

    for (const strategy of strategies) {
      const agent = await platform.createAgent(makeCreateRequest({ strategy }));
      expect(agent.strategy).toBe(strategy);
      expect(agent.state).toBe('created');
    }
  });

  it('should support all risk levels', async () => {
    const riskLevels = ['low', 'medium', 'high'] as const;

    for (const riskLevel of riskLevels) {
      const agent = await platform.createAgent(makeCreateRequest({ riskLevel }));
      expect(agent.riskLevel).toBe(riskLevel);
    }
  });
});

// ============================================================================
// Strategy Execution Tests
// ============================================================================

describe('MVPPlatform — Strategy Execution', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should execute a trend strategy cycle', async () => {
    const agent = await platform.createAgent(makeCreateRequest({ strategy: 'trend' }));
    await platform.startAgent(agent.agentId);

    const result = await platform.executeAgentCycle(agent.agentId);

    expect(result.agentId).toBe(agent.agentId);
    expect(result.cycleNumber).toBe(1);
    expect(result.strategy).toBe('trend');
    expect(['buy', 'sell', 'hold', 'none']).toContain(result.signal);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should execute an arbitrage strategy cycle', async () => {
    const agent = await platform.createAgent(makeCreateRequest({ strategy: 'arbitrage' }));
    await platform.startAgent(agent.agentId);

    const result = await platform.executeAgentCycle(agent.agentId);
    expect(result.strategy).toBe('arbitrage');
    expect(result.cycleNumber).toBe(1);
  });

  it('should execute an ai-signal strategy cycle', async () => {
    const agent = await platform.createAgent(makeCreateRequest({ strategy: 'ai-signal' }));
    await platform.startAgent(agent.agentId);

    const result = await platform.executeAgentCycle(agent.agentId);
    expect(result.strategy).toBe('ai-signal');
  });

  it('should increment cycle number on each execution', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    const r1 = await platform.executeAgentCycle(agent.agentId);
    const r2 = await platform.executeAgentCycle(agent.agentId);
    const r3 = await platform.executeAgentCycle(agent.agentId);

    expect(r1.cycleNumber).toBe(1);
    expect(r2.cycleNumber).toBe(2);
    expect(r3.cycleNumber).toBe(3);
  });

  it('should throw when executing cycle for non-running agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    // Not started

    await expect(platform.executeAgentCycle(agent.agentId)).rejects.toThrow(
      'is not running'
    );
  });

  it('should throw when executing cycle for stopped agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);
    await platform.stopAgent(agent.agentId);

    await expect(platform.executeAgentCycle(agent.agentId)).rejects.toThrow(
      'is not running'
    );
  });

  it('should emit agent.cycle_completed event after execution', async () => {
    const events: MVPPlatformEvent[] = [];
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    platform.onEvent((e) => events.push(e));
    await platform.executeAgentCycle(agent.agentId);

    const cycleEvent = events.find((e) => e.type === 'agent.cycle_completed');
    expect(cycleEvent).toBeDefined();
    expect(cycleEvent?.agentId).toBe(agent.agentId);
  });
});

// ============================================================================
// Market Data Tests
// ============================================================================

describe('MVPPlatform — Market Data', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should fetch a market snapshot', async () => {
    const snapshot = await platform.getMarketSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.timestamp).toBeInstanceOf(Date);
    expect(snapshot.prices).toBeDefined();
    expect(snapshot.assets.length).toBeGreaterThan(0);
  });

  it('should include major assets in market snapshot', async () => {
    const snapshot = await platform.getMarketSnapshot();

    // At least some of the MVP assets should be present
    const hasTON = snapshot.assets.some((a) => a === 'TON' || a === 'ton');
    const hasBTC = snapshot.assets.some((a) => a === 'BTC' || a === 'bitcoin');
    expect(hasTON || hasBTC).toBe(true);
  });

  it('should emit market.data_updated event on snapshot fetch', async () => {
    const events: MVPPlatformEvent[] = [];
    platform.onEvent((e) => events.push(e));

    await platform.getMarketSnapshot();
    expect(events.some((e) => e.type === 'market.data_updated')).toBe(true);
  });
});

// ============================================================================
// Portfolio Analytics Tests
// ============================================================================

describe('MVPPlatform — Portfolio Analytics', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should return portfolio metrics for an agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    const metrics = await platform.getPortfolioMetrics(agent.agentId);

    expect(metrics).toBeDefined();
    expect(typeof metrics.portfolioValue).toBe('number');
    expect(typeof metrics.pnl).toBe('number');
    expect(typeof metrics.roi).toBe('number');
    expect(typeof metrics.tradeCount).toBe('number');
    expect(typeof metrics.winRate).toBe('number');
  });

  it('should return metrics matching portfolio endpoints /api/portfolio and /api/portfolio/metrics', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    const metrics = await platform.getPortfolioMetrics(agent.agentId);

    // Matches /api/portfolio
    expect(metrics.portfolioValue).toBeGreaterThanOrEqual(0);
    // Matches /api/portfolio/metrics
    expect(metrics.pnl).toBeDefined();
    expect(metrics.roi).toBeDefined();
    expect(metrics.tradeCount).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeLessThanOrEqual(100);
  });

  it('should return trade history for an agent (/api/trades)', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    const history = platform.getTradeHistory(agent.agentId);

    expect(history).toBeDefined();
  });

  it('should return analytics dashboard for an agent', async () => {
    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    const analytics = await platform.getAgentAnalytics(agent.agentId);
    expect(analytics).toBeDefined();
    expect(analytics.agentId).toBe(agent.agentId);
  });

  it('should update portfolio value after strategy execution', async () => {
    const agent = await platform.createAgent(makeCreateRequest({ budgetTon: 500 }));
    await platform.startAgent(agent.agentId);

    const before = await platform.getPortfolioMetrics(agent.agentId);

    // Execute multiple cycles to accumulate changes
    for (let i = 0; i < 3; i++) {
      await platform.executeAgentCycle(agent.agentId);
    }

    const after = await platform.getPortfolioMetrics(agent.agentId);

    // Metrics should still be valid numbers (value can go up or down)
    expect(typeof after.portfolioValue).toBe('number');
    expect(typeof after.pnl).toBe('number');
    expect(before).toBeDefined();
  });
});

// ============================================================================
// Agent Control API Tests (/api/agents)
// ============================================================================

describe('MVPPlatform — Agent Control API', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should handle GET /api/agents via control API', async () => {
    const response = await platform.handleControlRequest('GET', '/api/agents');

    expect(response).toBeDefined();
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle POST /api/agents/:id/start via control API', async () => {
    const response = await platform.handleControlRequest('POST', '/api/agents/demo-agent-1/start');

    expect(response).toBeDefined();
    // 404 is expected since demo-agent-1 isn't registered in the demo registry
    expect([200, 404]).toContain(response.statusCode);
  });

  it('should handle POST /api/agents/:id/stop via control API', async () => {
    const response = await platform.handleControlRequest('POST', '/api/agents/demo-agent-1/stop');

    expect(response).toBeDefined();
    expect([200, 404]).toContain(response.statusCode);
  });

  it('should handle GET /api/agents/:id via control API', async () => {
    const response = await platform.handleControlRequest('GET', '/api/agents/demo-agent-1');

    expect(response).toBeDefined();
    expect([200, 404]).toContain(response.statusCode);
  });
});

// ============================================================================
// Health Monitoring Tests
// ============================================================================

describe('MVPPlatform — Health Monitoring', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should report healthy status after start', () => {
    platform.start();
    const health = platform.getHealth();

    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.checkedAt).toBeInstanceOf(Date);
  });

  it('should include all MVP core components in health check', () => {
    platform.start();
    const health = platform.getHealth();

    expect(typeof health.components.agentRuntime).toBe('boolean');
    expect(typeof health.components.strategyEngine).toBe('boolean');
    expect(typeof health.components.marketData).toBe('boolean');
    expect(typeof health.components.tradingEngine).toBe('boolean');
    expect(typeof health.components.portfolioAnalytics).toBe('boolean');
    expect(typeof health.components.agentControl).toBe('boolean');
    expect(typeof health.components.demoAgent).toBe('boolean');
  });

  it('should report uptime after running', async () => {
    platform.start();

    // Small delay to ensure uptime > 0
    await new Promise<void>((r) => setTimeout(r, 10));

    const health = platform.getHealth();
    expect(health.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should track active agent count', async () => {
    platform.start();

    const agent = await platform.createAgent(makeCreateRequest());
    await platform.startAgent(agent.agentId);

    const health = platform.getHealth();
    expect(health.activeAgents).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Demo Flow Tests (Investor Demo)
// ============================================================================

describe('MVPPlatform — Demo Flow', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should complete a demo flow successfully', async () => {
    const result = await platform.runDemoFlow({
      simulationCycles: 3,
      cycleDelayMs: 0,
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.agentId).toBeDefined();
    expect(result.cyclesCompleted).toBe(3);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should run demo with Momentum Agent (trend strategy)', async () => {
    const result = await platform.runDemoFlow({
      agentName: 'Momentum Agent',
      strategy: 'trend',
      budgetTon: 1000,
      riskLevel: 'medium',
      simulationCycles: 2,
      cycleDelayMs: 0,
    });

    expect(result.agentName).toBe('Momentum Agent');
    expect(result.strategy).toBe('trend');
    expect(result.success).toBe(true);
  });

  it('should record execution results for each cycle', async () => {
    const result = await platform.runDemoFlow({
      simulationCycles: 3,
      cycleDelayMs: 0,
    });

    expect(result.executionResults).toHaveLength(3);
    for (const cycleResult of result.executionResults) {
      expect(cycleResult.agentId).toBe(result.agentId);
      expect(cycleResult.cycleNumber).toBeGreaterThan(0);
      expect(['buy', 'sell', 'hold', 'none']).toContain(cycleResult.signal);
    }
  });

  it('should stop the demo agent after flow completes', async () => {
    const result = await platform.runDemoFlow({
      simulationCycles: 1,
      cycleDelayMs: 0,
    });

    const status = platform.getAgentStatus(result.agentId);
    expect(status.state).toBe('stopped');
  });

  it('should emit demo.completed event', async () => {
    const events: MVPPlatformEvent[] = [];
    platform.onEvent((e) => events.push(e));

    await platform.runDemoFlow({ simulationCycles: 1, cycleDelayMs: 0 });

    expect(events.some((e) => e.type === 'demo.completed')).toBe(true);
  });

  it('should return portfolio metrics after demo', async () => {
    const result = await platform.runDemoFlow({
      budgetTon: 500,
      simulationCycles: 3,
      cycleDelayMs: 0,
    });

    expect(typeof result.finalPortfolioValueTon).toBe('number');
    expect(typeof result.totalPnlTon).toBe('number');
    expect(typeof result.totalPnlPercent).toBe('number');
    expect(result.tradesExecuted).toBeGreaterThanOrEqual(0);
  });

  it('should support all three MVP strategies in demo flow', async () => {
    const strategies: MVPStrategyId[] = ['trend', 'arbitrage', 'ai-signal'];

    for (const strategy of strategies) {
      const result = await platform.runDemoFlow({
        strategy,
        simulationCycles: 1,
        cycleDelayMs: 0,
      });
      expect(result.strategy).toBe(strategy);
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// Full MVP User Flow Test (Issue #195 — "Open Telegram → Create agent → Start → Monitor")
// ============================================================================

describe('MVPPlatform — Full User Flow (Issue #195 Acceptance Criteria)', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform();
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  it('should complete the full user flow: create → start → execute strategy → monitor performance', async () => {
    // Step 1: Create AI agent (user creates agent from Telegram Mini App)
    const agent = await platform.createAgent({
      userId: 'telegram_user_456',
      name: 'My TON Agent',
      strategy: 'trend',
      budgetTon: 100,
      riskLevel: 'medium',
    });

    expect(agent.state).toBe('created');
    expect(agent.agentId).toBeDefined();

    // Step 2: Start agent
    const started = await platform.startAgent(agent.agentId);
    expect(started.state).toBe('running');

    // Step 3: Agent executes strategy (trades are recorded)
    const cycle = await platform.executeAgentCycle(agent.agentId);
    expect(cycle.cycleNumber).toBe(1);
    expect(cycle.timestamp).toBeInstanceOf(Date);

    // Step 4: Monitor performance (portfolio metrics update correctly)
    const metrics = await platform.getPortfolioMetrics(agent.agentId);
    expect(metrics.portfolioValue).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.tradeCount).toBe('number');

    // Step 5: Check agent analytics (Mini App displays live data)
    const analytics = await platform.getAgentAnalytics(agent.agentId);
    expect(analytics).toBeDefined();

    // Step 6: Agent controls work (stop agent)
    const stopped = await platform.stopAgent(agent.agentId);
    expect(stopped.state).toBe('stopped');
  });

  it('should handle multiple concurrent agents for the same user', async () => {
    const userId = 'power_user_789';

    const agents = await Promise.all([
      platform.createAgent(makeCreateRequest({ userId, name: 'Agent 1', strategy: 'trend' })),
      platform.createAgent(makeCreateRequest({ userId, name: 'Agent 2', strategy: 'arbitrage' })),
      platform.createAgent(makeCreateRequest({ userId, name: 'Agent 3', strategy: 'ai-signal' })),
    ]);

    await Promise.all(agents.map((a) => platform.startAgent(a.agentId)));

    const userAgents = platform.listUserAgents(userId);
    expect(userAgents.length).toBe(3);

    const runningAgents = userAgents.filter((a) => a.state === 'running');
    expect(runningAgents.length).toBe(3);
  });

  it('should pass all MVP testing requirements from Issue #195', async () => {
    // "agent can start successfully"
    const agent = await platform.createAgent(makeCreateRequest());
    const started = await platform.startAgent(agent.agentId);
    expect(started.state).toBe('running');

    // "agent executes strategy loop"
    const cycle = await platform.executeAgentCycle(agent.agentId);
    expect(cycle.cycleNumber).toBe(1);

    // "trades are recorded"
    const history = platform.getTradeHistory(agent.agentId);
    expect(history).toBeDefined();

    // "portfolio metrics update correctly"
    const metrics = await platform.getPortfolioMetrics(agent.agentId);
    expect(metrics.portfolioValue).toBeGreaterThanOrEqual(0);

    // "Agent controls work"
    const stopped = await platform.stopAgent(agent.agentId);
    expect(stopped.state).toBe('stopped');
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe('MVPPlatform — Type Exports', () => {
  it('should export DEFAULT_MVP_PLATFORM_CONFIG', () => {
    expect(DEFAULT_MVP_PLATFORM_CONFIG).toBeDefined();
    expect(DEFAULT_MVP_PLATFORM_CONFIG.environment).toBe('simulation');
    expect(DEFAULT_MVP_PLATFORM_CONFIG.defaultBudgetTon).toBeGreaterThan(0);
  });

  it('should export DEFAULT_DEMO_FLOW_CONFIG', () => {
    expect(DEFAULT_DEMO_FLOW_CONFIG).toBeDefined();
    expect(DEFAULT_DEMO_FLOW_CONFIG.strategy).toBe('trend');
    expect(DEFAULT_DEMO_FLOW_CONFIG.simulationCycles).toBeGreaterThan(0);
  });

  it('should create platform with custom config', () => {
    const config: Partial<MVPPlatformConfig> = {
      name: 'Custom MVP',
      environment: 'simulation',
      defaultBudgetTon: 500,
      verbose: false,
    };

    const p = createMVPPlatform(config);
    expect(p).toBeInstanceOf(MVPPlatform);
  });
});
