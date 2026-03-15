/**
 * TONAIAgent - Agent Developer SDK Tests (Issue #158)
 *
 * Comprehensive tests covering:
 *   1. Agent Development Framework — defineAgent, validate, deploy, mock context
 *   2. Runtime Integration API — getMarketData, placeOrder, getPortfolio, allocateCapital, getRiskMetrics
 *   3. Strategy Development Toolkit — templates, RiskConfigHelper, execution utilities, ExampleAlgorithms
 *   4. Backtesting Compatibility Layer — simulate, analyze, validate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Agent Framework
  AgentDeveloperFramework,
  createAgentFramework,
  AgentFrameworkError,
  type AgentDefinition,
  type AgentExecutionContext,

  // Runtime API
  DefaultRuntimeAPI,
  createRuntimeAPI,
  RuntimeAPIError,

  // Strategy Toolkit
  StrategyDevelopmentToolkit,
  createStrategyToolkit,
  RiskConfigHelper,
  ExampleAlgorithms,

  // Backtesting
  BacktestingCompatLayer,
  createBacktestingCompat,
  type BacktestConfig,
} from '../../packages/sdk';

// ============================================================================
// Test Helpers
// ============================================================================

function createMinimalAgentDefinition(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    strategy: {
      type: 'dca',
      parameters: { asset: 'TON', amount: 50 },
    },
    risk_rules: {
      maxPositionSize: 1000,
      maxDailyLoss: 100,
      stopLossPercent: 5,
    },
    execution_logic: async (_ctx) => {},
    configuration: {
      environment: 'sandbox',
      simulationMode: true,
      initialCapital: 10000,
    },
    event_handlers: {},
    ...overrides,
  };
}

// ============================================================================
// 1. Agent Development Framework Tests
// ============================================================================

describe('AgentDeveloperFramework', () => {
  let framework: AgentDeveloperFramework;

  beforeEach(() => {
    framework = createAgentFramework();
  });

  describe('createAgentFramework()', () => {
    it('should create a new framework instance', () => {
      expect(framework).toBeInstanceOf(AgentDeveloperFramework);
    });

    it('should start with no registered agents', () => {
      expect(framework.listAgents()).toHaveLength(0);
    });
  });

  describe('defineAgent()', () => {
    it('should define and register a valid agent', () => {
      const def = createMinimalAgentDefinition();
      const agent = framework.defineAgent(def);
      expect(agent.id).toBe('test-agent');
      expect(framework.listAgents()).toHaveLength(1);
    });

    it('should throw AgentFrameworkError for invalid definition', () => {
      expect(() =>
        framework.defineAgent({ id: '', name: '', version: '' } as AgentDefinition)
      ).toThrow(AgentFrameworkError);
    });

    it('should make the agent retrievable by id', () => {
      const def = createMinimalAgentDefinition();
      framework.defineAgent(def);
      const retrieved = framework.getAgent('test-agent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Agent');
    });
  });

  describe('validate()', () => {
    it('should return valid for a complete definition', () => {
      const result = framework.validate(createMinimalAgentDefinition());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error when id is missing', () => {
      const result = framework.validate({ ...createMinimalAgentDefinition(), id: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should report error when id has invalid characters', () => {
      const result = framework.validate({ ...createMinimalAgentDefinition(), id: 'My Agent!' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should report error when name is missing', () => {
      const result = framework.validate({ ...createMinimalAgentDefinition(), name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should report error for invalid version format', () => {
      const result = framework.validate({ ...createMinimalAgentDefinition(), version: 'v1' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should report error when strategy is missing', () => {
      const def = createMinimalAgentDefinition();
      const result = framework.validate({ ...def, strategy: undefined as never });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'strategy')).toBe(true);
    });

    it('should report error when execution_logic is not a function', () => {
      const result = framework.validate({
        ...createMinimalAgentDefinition(),
        execution_logic: 'not a function' as never,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'execution_logic')).toBe(true);
    });

    it('should warn when no risk_rules are provided', () => {
      const result = framework.validate({
        ...createMinimalAgentDefinition(),
        risk_rules: undefined as never,
      });
      expect(result.warnings.some(w => w.field === 'risk_rules')).toBe(true);
    });

    it('should warn when stop-loss is above 50%', () => {
      const result = framework.validate({
        ...createMinimalAgentDefinition(),
        risk_rules: { stopLossPercent: 60 },
      });
      expect(result.warnings.some(w => w.field === 'risk_rules.stopLossPercent')).toBe(true);
    });

    it('should error when maxExposurePercent exceeds 100', () => {
      const result = framework.validate({
        ...createMinimalAgentDefinition(),
        risk_rules: { maxExposurePercent: 150 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'risk_rules.maxExposurePercent')).toBe(true);
    });
  });

  describe('deploy()', () => {
    it('should deploy a valid agent in sandbox mode', async () => {
      const def = createMinimalAgentDefinition();
      const result = await framework.deploy(def, { mode: 'sandbox' });
      expect(result.status).toBe('deployed');
      expect(result.agentId).toBe('test-agent');
      expect(result.environment).toBe('sandbox');
    });

    it('should return failed status for invalid definition', async () => {
      const def = { ...createMinimalAgentDefinition(), id: '' };
      const result = await framework.deploy(def, { mode: 'sandbox' });
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });

    it('should apply config overrides on deploy', async () => {
      const def = createMinimalAgentDefinition({ configuration: { environment: 'production', simulationMode: false } });
      const result = await framework.deploy(def, {
        mode: 'sandbox',
        configOverride: { initialCapital: 5000 },
      });
      expect(result.status).toBe('deployed');
      expect(result.environment).toBe('sandbox');
    });
  });

  describe('listAgents() and removeAgent()', () => {
    it('should list all registered agents', () => {
      framework.defineAgent(createMinimalAgentDefinition({ id: 'agent-1', name: 'Agent 1' }));
      framework.defineAgent(createMinimalAgentDefinition({ id: 'agent-2', name: 'Agent 2' }));
      expect(framework.listAgents()).toHaveLength(2);
    });

    it('should remove a registered agent', () => {
      framework.defineAgent(createMinimalAgentDefinition());
      const removed = framework.removeAgent('test-agent');
      expect(removed).toBe(true);
      expect(framework.listAgents()).toHaveLength(0);
    });

    it('should return false when removing non-existent agent', () => {
      expect(framework.removeAgent('does-not-exist')).toBe(false);
    });
  });

  describe('createMockContext()', () => {
    it('should create a functional mock context', async () => {
      const ctx = framework.createMockContext('test-agent');
      expect(ctx.agentId).toBe('test-agent');
      expect(ctx.isSimulation).toBe(true);
    });

    it('mock context getMarketData should return data for any asset', async () => {
      const ctx = framework.createMockContext('test-agent');
      const data = await ctx.getMarketData('TON');
      expect(data.asset).toBe('TON');
      expect(typeof data.current).toBe('number');
      expect(data.current).toBeGreaterThan(0);
    });

    it('mock context placeOrder should return a filled result', async () => {
      const ctx = framework.createMockContext('test-agent');
      const result = await ctx.placeOrder({ asset: 'TON', side: 'buy', amount: 10 });
      expect(result.status).toBe('filled');
      expect(result.orderId).toBeDefined();
    });

    it('mock context getPortfolio should return initial state', async () => {
      const ctx = framework.createMockContext('test-agent');
      const portfolio = await ctx.getPortfolio();
      expect(portfolio.totalValue).toBe(10000);
      expect(portfolio.positions).toHaveLength(0);
    });

    it('mock context allocateCapital should succeed', async () => {
      const ctx = framework.createMockContext('test-agent');
      const result = await ctx.allocateCapital({ asset: 'TON', amount: 100, mode: 'fixed' });
      expect(result.success).toBe(true);
    });

    it('mock context getRiskMetrics should return initial safe metrics', async () => {
      const ctx = framework.createMockContext('test-agent');
      const metrics = await ctx.getRiskMetrics();
      expect(metrics.circuitBreakerActive).toBe(false);
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it('mock context can be overridden', async () => {
      const customPrice = 5.0;
      const ctx = framework.createMockContext('test-agent', {
        getMarketData: async (asset) => ({
          asset,
          current: customPrice,
          change24h: 0,
          volume24h: 0,
          timestamp: new Date(),
        }),
      });
      const data = await ctx.getMarketData('TON');
      expect(data.current).toBe(customPrice);
    });
  });
});

// ============================================================================
// 2. Runtime Integration API Tests
// ============================================================================

describe('DefaultRuntimeAPI', () => {
  let api: DefaultRuntimeAPI;

  beforeEach(() => {
    api = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 10000 });
  });

  describe('createRuntimeAPI()', () => {
    it('should create a simulation API by default', () => {
      const defaultApi = createRuntimeAPI();
      expect(defaultApi.isSimulation).toBe(true);
    });

    it('should respect simulationMode: false', () => {
      const liveApi = createRuntimeAPI({ simulationMode: false });
      expect(liveApi.isSimulation).toBe(false);
    });
  });

  describe('getMarketData()', () => {
    it('should return market data in simulation mode', async () => {
      const data = await api.getMarketData('TON');
      expect(data.asset).toBe('TON');
      expect(data.current).toBeGreaterThan(0);
      expect(data.timestamp).toBeInstanceOf(Date);
    });

    it('should return different prices for different assets', async () => {
      const ton = await api.getMarketData('TON');
      const btc = await api.getMarketData('BTC');
      expect(btc.current).toBeGreaterThan(ton.current);
    });

    it('should throw in live mode', async () => {
      const liveApi = createRuntimeAPI({ simulationMode: false });
      await expect(liveApi.getMarketData('TON')).rejects.toThrow(RuntimeAPIError);
    });

    it('should include bid/ask spread', async () => {
      const data = await api.getMarketData('TON');
      expect(data.bid).toBeDefined();
      expect(data.ask).toBeDefined();
      expect(data.ask!).toBeGreaterThan(data.bid!);
    });
  });

  describe('getHistoricalData()', () => {
    it('should return OHLCV bars', async () => {
      const bars = await api.getHistoricalData({ asset: 'TON', limit: 10 });
      expect(bars).toHaveLength(10);
      expect(bars[0]).toHaveProperty('open');
      expect(bars[0]).toHaveProperty('high');
      expect(bars[0]).toHaveProperty('low');
      expect(bars[0]).toHaveProperty('close');
      expect(bars[0]).toHaveProperty('volume');
    });

    it('should return bars in chronological order', async () => {
      const bars = await api.getHistoricalData({ asset: 'TON', limit: 5 });
      for (let i = 1; i < bars.length; i++) {
        expect(bars[i].timestamp.getTime()).toBeGreaterThan(bars[i - 1].timestamp.getTime());
      }
    });

    it('should have high >= low for each bar', async () => {
      const bars = await api.getHistoricalData({ asset: 'TON', limit: 20 });
      for (const bar of bars) {
        expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      }
    });
  });

  describe('placeOrder()', () => {
    it('should fill a buy order in simulation mode', async () => {
      const result = await api.placeOrder({ asset: 'TON', side: 'buy', amount: 100 });
      expect(result.status).toBe('filled');
      expect(result.executedPrice).toBeGreaterThan(0);
      expect(result.executedAmount).toBe(100);
    });

    it('should fail buy order when insufficient balance', async () => {
      const smallApi = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 1 });
      const result = await smallApi.placeOrder({ asset: 'TON', side: 'buy', amount: 1000 });
      expect(result.status).toBe('failed');
      expect(result.error).toContain('balance');
    });

    it('should fill a sell order after buying', async () => {
      await api.placeOrder({ asset: 'TON', side: 'buy', amount: 100 });
      const sell = await api.placeOrder({ asset: 'TON', side: 'sell', amount: 50 });
      expect(sell.status).toBe('filled');
    });

    it('should fail sell when no position', async () => {
      const result = await api.placeOrder({ asset: 'TON', side: 'sell', amount: 100 });
      expect(result.status).toBe('failed');
    });

    it('should throw in live mode', async () => {
      const liveApi = createRuntimeAPI({ simulationMode: false });
      await expect(liveApi.placeOrder({ asset: 'TON', side: 'buy', amount: 1 })).rejects.toThrow(RuntimeAPIError);
    });
  });

  describe('getPortfolio()', () => {
    it('should return initial portfolio state', async () => {
      const portfolio = await api.getPortfolio();
      expect(portfolio.totalValue).toBeCloseTo(10000);
      expect(portfolio.positions).toHaveLength(0);
      expect(portfolio.availableBalance).toBeCloseTo(10000);
    });

    it('should reflect trades in portfolio', async () => {
      await api.placeOrder({ asset: 'TON', side: 'buy', amount: 100 });
      const portfolio = await api.getPortfolio();
      expect(portfolio.positions.some(p => p.asset === 'TON')).toBe(true);
      expect(portfolio.availableBalance).toBeLessThan(10000);
    });

    it('should include daily PnL fields', async () => {
      const portfolio = await api.getPortfolio();
      expect(portfolio).toHaveProperty('dailyPnl');
      expect(portfolio).toHaveProperty('dailyPnlPercent');
      expect(portfolio).toHaveProperty('totalPnl');
      expect(portfolio).toHaveProperty('totalPnlPercent');
    });
  });

  describe('allocateCapital()', () => {
    it('should allocate fixed amount', async () => {
      const result = await api.allocateCapital({ asset: 'TON', amount: 250, mode: 'fixed' });
      expect(result.success).toBe(true);
      expect(result.allocatedAmount).toBeGreaterThan(0);
    });

    it('should allocate percentage of portfolio', async () => {
      const result = await api.allocateCapital({ asset: 'TON', amount: 10, mode: 'percent' });
      expect(result.success).toBe(true);
    });

    it('should fail with insufficient balance', async () => {
      const smallApi = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 1 });
      const result = await smallApi.allocateCapital({ asset: 'TON', amount: 1000, mode: 'fixed' });
      expect(result.success).toBe(false);
    });
  });

  describe('getRiskMetrics()', () => {
    it('should return risk metrics', async () => {
      const metrics = await api.getRiskMetrics();
      expect(metrics).toHaveProperty('currentDrawdown');
      expect(metrics).toHaveProperty('maxDrawdown');
      expect(metrics).toHaveProperty('dailyPnl');
      expect(metrics).toHaveProperty('riskLevel');
      expect(metrics).toHaveProperty('totalExposure');
      expect(metrics.circuitBreakerActive).toBe(false);
    });

    it('should reflect exposure after buying', async () => {
      await api.placeOrder({ asset: 'TON', side: 'buy', amount: 1000 });
      const metrics = await api.getRiskMetrics();
      expect(metrics.totalExposure).toBeGreaterThan(0);
      expect(metrics.exposurePercent).toBeGreaterThan(0);
    });

    it('should classify risk level correctly', async () => {
      const metrics = await api.getRiskMetrics();
      expect(['low', 'medium', 'high', 'critical']).toContain(metrics.riskLevel);
    });
  });

  describe('getSimulationState()', () => {
    it('should return simulation state in simulation mode', () => {
      const state = api.getSimulationState();
      expect(state).not.toBeNull();
      expect(state?.balance).toBe(10000);
      expect(state?.totalTrades).toBe(0);
    });

    it('should return null in live mode', () => {
      const liveApi = createRuntimeAPI({ simulationMode: false });
      expect(liveApi.getSimulationState()).toBeNull();
    });

    it('should track trades in simulation state', async () => {
      await api.placeOrder({ asset: 'TON', side: 'buy', amount: 10 });
      const state = api.getSimulationState();
      expect(state?.totalTrades).toBe(1);
    });
  });
});

// ============================================================================
// 3. Strategy Development Toolkit Tests
// ============================================================================

describe('StrategyDevelopmentToolkit', () => {
  let toolkit: StrategyDevelopmentToolkit;

  beforeEach(() => {
    toolkit = createStrategyToolkit();
  });

  describe('createStrategyToolkit()', () => {
    it('should create a toolkit instance', () => {
      expect(toolkit).toBeInstanceOf(StrategyDevelopmentToolkit);
    });
  });

  describe('listTemplates()', () => {
    it('should return built-in templates', () => {
      const templates = toolkit.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter by type', () => {
      const dcaTemplates = toolkit.listTemplates({ type: 'dca' });
      expect(dcaTemplates.every(t => t.type === 'dca')).toBe(true);
    });

    it('should filter by complexity', () => {
      const beginnerTemplates = toolkit.listTemplates({ complexity: 'beginner' });
      expect(beginnerTemplates.every(t => t.complexity === 'beginner')).toBe(true);
    });

    it('should include required template fields', () => {
      const templates = toolkit.listTemplates();
      for (const t of templates) {
        expect(t.id).toBeDefined();
        expect(t.name).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t.strategy).toBeDefined();
        expect(t.recommendedRiskRules).toBeDefined();
        expect(t.example).toBeDefined();
      }
    });
  });

  describe('getTemplate()', () => {
    it('should return dca-basic template', () => {
      const template = toolkit.getTemplate('dca-basic');
      expect(template).toBeDefined();
      expect(template?.id).toBe('dca-basic');
      expect(template?.type).toBe('dca');
    });

    it('should return momentum-rsi template', () => {
      const template = toolkit.getTemplate('momentum-rsi');
      expect(template).toBeDefined();
      expect(template?.type).toBe('momentum');
    });

    it('should return undefined for unknown template', () => {
      expect(toolkit.getTemplate('unknown-template')).toBeUndefined();
    });
  });

  describe('buildRiskRules()', () => {
    it('should create a RiskConfigHelper', () => {
      const helper = toolkit.buildRiskRules();
      expect(helper).toBeInstanceOf(RiskConfigHelper);
    });

    it('should build conservative preset', () => {
      const risk = toolkit.buildRiskRules().conservative().build();
      expect(risk.maxPositionSize).toBeDefined();
      expect(risk.stopLossPercent).toBeLessThanOrEqual(5);
    });

    it('should chain modifiers', () => {
      const risk = toolkit.buildRiskRules()
        .conservative()
        .withStopLoss(8)
        .withMaxDailyLoss(200)
        .build();
      expect(risk.stopLossPercent).toBe(8);
      expect(risk.maxDailyLoss).toBe(200);
    });
  });

  describe('fromTemplate()', () => {
    it('should create an agent from a template', () => {
      const agent = toolkit.fromTemplate('dca-basic', {
        id: 'my-dca',
        name: 'My DCA',
        version: '1.0.0',
        execution_logic: async (_ctx) => {},
        event_handlers: {},
      });
      expect(agent.id).toBe('my-dca');
      expect(agent.strategy.type).toBe('dca');
    });

    it('should allow overriding template fields', () => {
      const customRisk = { maxDailyLoss: 500 };
      const agent = toolkit.fromTemplate('dca-basic', {
        id: 'my-dca',
        name: 'My DCA',
        version: '1.0.0',
        risk_rules: customRisk,
        execution_logic: async (_ctx) => {},
        event_handlers: {},
      });
      expect(agent.risk_rules.maxDailyLoss).toBe(500);
    });

    it('should throw for unknown template', () => {
      expect(() => toolkit.fromTemplate('nonexistent', {
        id: 'x', name: 'X', version: '1.0.0',
        execution_logic: async (_ctx) => {},
        event_handlers: {},
      })).toThrow();
    });
  });

  describe('utils — execution utilities', () => {
    const prices = [1.0, 1.05, 1.02, 1.08, 1.10, 1.07, 1.12, 1.09, 1.15, 1.13];

    it('simpleMovingAverage should return correct SMA', () => {
      const sma3 = toolkit.utils.simpleMovingAverage(prices, 3);
      const expected = (1.09 + 1.15 + 1.13) / 3;
      expect(sma3).toBeCloseTo(expected);
    });

    it('simpleMovingAverage with period > length returns last price', () => {
      const sma = toolkit.utils.simpleMovingAverage([1.5], 10);
      expect(sma).toBe(1.5);
    });

    it('exponentialMovingAverage should return a number', () => {
      const ema = toolkit.utils.exponentialMovingAverage(prices, 5);
      expect(typeof ema).toBe('number');
      expect(ema).toBeGreaterThan(0);
    });

    it('rsi should return value between 0 and 100', () => {
      const longPrices = Array.from({ length: 30 }, (_, i) => 1.0 + i * 0.01);
      const rsi = toolkit.utils.rsi(longPrices, 14);
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });

    it('rsi with insufficient data returns 50', () => {
      expect(toolkit.utils.rsi([1.0, 1.1], 14)).toBe(50);
    });

    it('bollingerBands should return upper > middle > lower', () => {
      const longPrices = Array.from({ length: 25 }, (_, i) => 1.0 + Math.sin(i) * 0.1);
      const bands = toolkit.utils.bollingerBands(longPrices, 20);
      expect(bands.upper).toBeGreaterThan(bands.middle);
      expect(bands.middle).toBeGreaterThan(bands.lower);
    });

    it('macd should return macd, signal, histogram', () => {
      const longPrices = Array.from({ length: 40 }, (_, i) => 1.0 + i * 0.01);
      const result = toolkit.utils.macd(longPrices);
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
    });

    it('positionSize should calculate correct units', () => {
      const size = toolkit.utils.positionSize({
        portfolioValue: 10000,
        riskPercent: 1,
        entryPrice: 2.5,
        stopLossPrice: 2.25,
      });
      // risk = 10000 * 0.01 = 100, riskPerUnit = 0.25, size = 100/0.25 = 400
      expect(size).toBeCloseTo(400);
    });

    it('positionSize with zero risk per unit returns 0', () => {
      const size = toolkit.utils.positionSize({
        portfolioValue: 10000,
        riskPercent: 1,
        entryPrice: 2.5,
        stopLossPrice: 2.5,
      });
      expect(size).toBe(0);
    });

    it('isCrossover detects upward crossover', () => {
      const fast = [0.9, 1.0, 1.1];
      const slow = [1.0, 1.0, 1.05];
      // prev fast (1.0) <= prev slow (1.0) AND curr fast (1.1) > curr slow (1.05)
      expect(toolkit.utils.isCrossover(fast, slow)).toBe(true);
    });

    it('isCrossunder detects downward crossunder', () => {
      const fast = [1.1, 1.0, 0.9];
      const slow = [1.0, 1.0, 0.95];
      // prev fast (1.0) >= prev slow (1.0) AND curr fast (0.9) < curr slow (0.95)
      expect(toolkit.utils.isCrossunder(fast, slow)).toBe(true);
    });

    it('percentChange calculates correctly', () => {
      expect(toolkit.utils.percentChange(100, 110)).toBeCloseTo(10);
      expect(toolkit.utils.percentChange(100, 90)).toBeCloseTo(-10);
      expect(toolkit.utils.percentChange(0, 100)).toBe(0);
    });

    it('clamp restricts value to range', () => {
      expect(toolkit.utils.clamp(150, 0, 100)).toBe(100);
      expect(toolkit.utils.clamp(-10, 0, 100)).toBe(0);
      expect(toolkit.utils.clamp(50, 0, 100)).toBe(50);
    });
  });

  describe('ExampleAlgorithms', () => {
    it('dca() should return an execution function', () => {
      const fn = ExampleAlgorithms.dca('TON', 50);
      expect(typeof fn).toBe('function');
    });

    it('dca() should place a buy order when balance is sufficient', async () => {
      const framework = createAgentFramework();
      let orderPlaced = false;
      const ctx = framework.createMockContext('test', {
        placeOrder: async (order) => {
          orderPlaced = true;
          expect(order.side).toBe('buy');
          expect(order.asset).toBe('TON');
          return { orderId: 'mock', status: 'filled' };
        },
      });
      await ExampleAlgorithms.dca('TON', 50)(ctx);
      expect(orderPlaced).toBe(true);
    });

    it('momentum() should return an execution function', () => {
      const fn = ExampleAlgorithms.momentum('TON');
      expect(typeof fn).toBe('function');
    });

    it('maCrossover() should return an execution function', () => {
      const fn = ExampleAlgorithms.maCrossover('TON');
      expect(typeof fn).toBe('function');
    });

    it('momentum() should buy when RSI is oversold', async () => {
      const framework = createAgentFramework();
      let orderSide: string | undefined;
      const ctx = framework.createMockContext('test', {
        getMarketData: async (asset) => ({
          asset,
          current: 2.5,
          change24h: 0,
          volume24h: 0,
          rsi14: 25, // oversold
          timestamp: new Date(),
        }),
        placeOrder: async (order) => {
          orderSide = order.side;
          return { orderId: 'mock', status: 'filled' };
        },
      });
      await ExampleAlgorithms.momentum('TON', 30, 70, 10)(ctx);
      expect(orderSide).toBe('buy');
    });
  });
});

// ============================================================================
// 4. RiskConfigHelper Tests
// ============================================================================

describe('RiskConfigHelper', () => {
  it('should build with conservative preset', () => {
    const risk = new RiskConfigHelper().conservative().build();
    expect(risk.maxPositionSize).toBeDefined();
    expect(risk.circuitBreaker?.enabled).toBe(true);
  });

  it('should build with moderate preset', () => {
    const risk = new RiskConfigHelper().moderate().build();
    expect(risk.maxPositionSize).toBeGreaterThan(0);
  });

  it('should build with aggressive preset', () => {
    const risk = new RiskConfigHelper().aggressive().build();
    expect(risk.maxExposurePercent).toBeGreaterThan(60);
  });

  it('should chain all modifiers', () => {
    const risk = new RiskConfigHelper()
      .withMaxPositionSize(5000)
      .withMaxDailyLoss(300)
      .withStopLoss(8)
      .withTakeProfit(20)
      .withMaxExposure(70)
      .withCircuitBreaker(5)
      .withCustomRule('custom_key', 'custom_value')
      .build();

    expect(risk.maxPositionSize).toBe(5000);
    expect(risk.maxDailyLoss).toBe(300);
    expect(risk.stopLossPercent).toBe(8);
    expect(risk.takeProfitPercent).toBe(20);
    expect(risk.maxExposurePercent).toBe(70);
    expect(risk.circuitBreaker?.maxConsecutiveFailures).toBe(5);
    expect(risk.custom?.custom_key).toBe('custom_value');
  });

  it('later preset overwrites earlier modifiers', () => {
    const risk = new RiskConfigHelper()
      .withStopLoss(5)
      .aggressive() // overrides conservative
      .build();
    expect(risk.stopLossPercent).toBe(15); // aggressive default
  });
});

// ============================================================================
// 5. Backtesting Compatibility Layer Tests
// ============================================================================

describe('BacktestingCompatLayer', () => {
  let backtester: BacktestingCompatLayer;

  beforeEach(() => {
    backtester = createBacktestingCompat();
  });

  describe('createBacktestingCompat()', () => {
    it('should create a backtesting instance', () => {
      expect(backtester).toBeInstanceOf(BacktestingCompatLayer);
    });
  });

  describe('simulate()', () => {
    it('should run a basic DCA simulation', async () => {
      const agent = createMinimalAgentDefinition({
        id: 'bt-dca',
        execution_logic: ExampleAlgorithms.dca('TON', 50),
      });

      const config: BacktestConfig = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'), // 7 days
        initialBalance: 1000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000, // daily
        tradingFeePercent: 0.1,
      };

      const result = await backtester.simulate(agent, config);

      expect(result.agentId).toBe('bt-dca');
      expect(result.runId).toContain('bt-dca');
      expect(result.executions.length).toBeGreaterThan(0);
      expect(result.equityCurve.length).toBeGreaterThan(0);
      expect(result.performance).toBeDefined();
    });

    it('should track equity curve over time', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-eq' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        initialBalance: 5000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      expect(result.equityCurve.length).toBeGreaterThan(1);
      expect(result.equityCurve[0]).toHaveProperty('timestamp');
      expect(result.equityCurve[0]).toHaveProperty('value');
    });

    it('should record trades when orders are placed', async () => {
      const agent = createMinimalAgentDefinition({
        id: 'bt-trades',
        execution_logic: ExampleAlgorithms.dca('TON', 50),
      });

      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        initialBalance: 10000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      expect(result.trades.length).toBeGreaterThan(0);
      const buyTrade = result.trades.find(t => t.side === 'buy');
      expect(buyTrade).toBeDefined();
      expect(buyTrade?.asset).toBe('TON');
    });

    it('should handle execution errors gracefully', async () => {
      let callCount = 0;
      const agent = createMinimalAgentDefinition({
        id: 'bt-errors',
        execution_logic: async (_ctx) => {
          callCount++;
          if (callCount % 2 === 0) throw new Error('Simulated execution error');
        },
      });

      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-06'),
        initialBalance: 1000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const failedExecs = result.executions.filter(e => !e.success);
      expect(failedExecs.length).toBeGreaterThan(0);
      expect(result.performance.failedExecutionCycles).toBeGreaterThan(0);
    });

    it('performance should have all required fields', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-perf' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        initialBalance: 10000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const p = result.performance;
      expect(p).toHaveProperty('finalValue');
      expect(p).toHaveProperty('totalPnl');
      expect(p).toHaveProperty('totalPnlPercent');
      expect(p).toHaveProperty('maxDrawdown');
      expect(p).toHaveProperty('winRate');
      expect(p).toHaveProperty('totalTrades');
      expect(p).toHaveProperty('sharpeRatio');
      expect(p).toHaveProperty('sortinoRatio');
      expect(p).toHaveProperty('calmarRatio');
      expect(p).toHaveProperty('profitFactor');
    });
  });

  describe('analyze()', () => {
    it('should return a formatted analysis string', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-analyze' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        initialBalance: 1000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const analysis = backtester.analyze(result);
      expect(typeof analysis).toBe('string');
      expect(analysis).toContain('Backtest Analysis');
      expect(analysis).toContain('Sharpe Ratio');
      expect(analysis).toContain('Win Rate');
      expect(analysis).toContain('Max Drawdown');
    });
  });

  describe('validate()', () => {
    it('should pass validation when all requirements met', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-validate' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-30'),
        initialBalance: 10000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      // Use very lenient requirements to ensure pass
      const validation = backtester.validate(result, {
        maxDrawdownPercent: 100,
        maxFailedExecutions: 1000,
      });

      expect(validation.passed).toBe(true);
      expect(validation.score).toBe(100);
    });

    it('should fail validation when requirements not met', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-fail-validate' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        initialBalance: 10000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const validation = backtester.validate(result, {
        minSharpeRatio: 100, // impossible requirement
        minWinRate: 1.0,     // impossible requirement
      });

      expect(validation.passed).toBe(false);
      expect(validation.score).toBeLessThan(100);
    });

    it('should produce checks for each requirement', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-checks' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        initialBalance: 1000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const validation = backtester.validate(result, {
        minSharpeRatio: 0,
        maxDrawdownPercent: 100,
        minWinRate: 0,
        minTotalPnlPercent: -100,
        maxFailedExecutions: 1000,
      });

      expect(validation.checks).toHaveLength(5);
      expect(validation.recommendation).toBeDefined();
      expect(['ready-for-production', 'ready-for-sandbox', 'needs-improvement', 'not-ready'])
        .toContain(validation.recommendation);
    });

    it('should return 100 score with empty requirements', async () => {
      const agent = createMinimalAgentDefinition({ id: 'bt-empty-req' });
      const result = await backtester.simulate(agent, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        initialBalance: 1000,
        assets: ['TON'],
        stepMs: 24 * 60 * 60 * 1000,
      });

      const validation = backtester.validate(result);
      expect(validation.score).toBe(100);
      expect(validation.passed).toBe(true);
    });
  });
});

// ============================================================================
// 6. Integration Tests — Full Workflow
// ============================================================================

describe('Agent Developer SDK — Full Workflow Integration', () => {
  it('should support the complete developer workflow: define → validate → backtest → deploy', async () => {
    const framework = createAgentFramework();
    const toolkit = createStrategyToolkit();
    const backtester = createBacktestingCompat();

    // Step 1: Build an agent from a template
    const agent = toolkit.fromTemplate('dca-basic', {
      id: 'integration-dca',
      name: 'Integration DCA Bot',
      version: '1.0.0',
      execution_logic: ExampleAlgorithms.dca('TON', 100),
      event_handlers: {
        onStart: async () => {},
        onStop: async () => {},
        onError: async (_err) => {},
      },
    });

    // Step 2: Validate the agent definition
    const validation = framework.validate(agent);
    expect(validation.valid).toBe(true);

    // Step 3: Backtest the agent
    const backtestResult = await backtester.simulate(agent, {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-15'),
      initialBalance: 5000,
      assets: ['TON'],
      stepMs: 24 * 60 * 60 * 1000,
    });

    expect(backtestResult.agentId).toBe('integration-dca');
    expect(backtestResult.executions.length).toBeGreaterThan(0);

    // Step 4: Validate backtesting results
    const backTestValidation = backtester.validate(backtestResult, {
      maxDrawdownPercent: 100,
      maxFailedExecutions: 100,
    });
    expect(backTestValidation.passed).toBe(true);

    // Step 5: Deploy to sandbox
    framework.defineAgent(agent);
    const deployment = await framework.deploy(agent, { mode: 'sandbox' });
    expect(deployment.status).toBe('deployed');
    expect(deployment.environment).toBe('sandbox');
  });

  it('should support testing execution_logic in isolation with mock context', async () => {
    const framework = createAgentFramework();
    const orders: Array<{ asset: string; side: string }> = [];

    const ctx = framework.createMockContext('isolation-test', {
      getMarketData: async (asset) => ({
        asset,
        current: 2.5,
        change24h: -2,
        volume24h: 5000000,
        rsi14: 25, // oversold — should trigger buy
        timestamp: new Date(),
      }),
      placeOrder: async (order) => {
        orders.push({ asset: order.asset, side: order.side });
        return { orderId: 'mock', status: 'filled', executedPrice: 2.5, executedAmount: order.amount };
      },
    });

    // Run momentum algo directly
    await ExampleAlgorithms.momentum('TON', 30, 70, 10)(ctx);

    expect(orders).toHaveLength(1);
    expect(orders[0].side).toBe('buy');
    expect(orders[0].asset).toBe('TON');
  });

  it('should support runtime API in agent execution context', async () => {
    const api = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 5000 });

    // Use the runtime API as a data source for strategy decisions
    const marketData = await api.getMarketData('TON');
    expect(marketData.current).toBeGreaterThan(0);

    const portfolio = await api.getPortfolio();
    expect(portfolio.totalValue).toBeCloseTo(5000);

    await api.placeOrder({ asset: 'TON', side: 'buy', amount: 100 });
    const updatedPortfolio = await api.getPortfolio();
    expect(updatedPortfolio.positions.length).toBe(1);

    const risk = await api.getRiskMetrics();
    expect(risk.totalExposure).toBeGreaterThan(0);
  });
});
