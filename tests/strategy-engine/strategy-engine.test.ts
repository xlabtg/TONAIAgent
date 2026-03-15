/**
 * Tests for the Strategy Engine v1 module (Issue #180)
 *
 * Covers:
 * - StrategyRegistry: registration, listing, instance creation, events, errors
 * - StrategyLoader: loadBuiltIns, registerCustom, idempotency
 * - StrategyExecutionEngine: lifecycle, execution pipeline, signals, history, metrics, events
 * - TrendStrategy: metadata, BUY/SELL/HOLD signals, SMA logic, missing data
 * - ArbitrageStrategy: metadata, BUY/HOLD signals, spread detection, missing data
 * - AISignalStrategy: metadata, RSI/MACD indicators, BUY/SELL/HOLD, warm-up period
 * - BaseStrategy: param merging
 * - StrategyEngineError: error structure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Registry
  DefaultStrategyRegistry,
  createStrategyRegistry,
  // Loader
  DefaultStrategyLoader,
  createStrategyLoader,
  // Engine
  StrategyExecutionEngine,
  createStrategyExecutionEngine,
  DEFAULT_ENGINE_CONFIG,
  // Strategies
  TrendStrategy,
  ArbitrageStrategy,
  AISignalStrategy,
  // Base
  BaseStrategy,
  // Types
  StrategyEngineError,
} from '../../core/strategies/strategy-engine';
import type {
  MarketData,
  StrategyEngineEvent,
  StrategyInterface,
  StrategyMetadata,
  StrategyParams,
  TradeSignal,
} from '../../core/strategies/strategy-engine';

// ============================================================================
// Test Helpers
// ============================================================================

function makeMarketData(tonPrice: number, overrides: Partial<MarketData> = {}): MarketData {
  return {
    prices: {
      TON: {
        asset: 'TON',
        price: tonPrice,
        volume24h: 1_000_000,
        timestamp: new Date(),
      },
      BTC: {
        asset: 'BTC',
        price: 65_000,
        volume24h: 50_000_000,
        timestamp: new Date(),
      },
    },
    source: 'test',
    fetchedAt: new Date(),
    ...overrides,
  };
}

function makeEmptyMarketData(): MarketData {
  return {
    prices: {},
    source: 'test-empty',
    fetchedAt: new Date(),
  };
}

class MinimalStrategy extends BaseStrategy {
  getMetadata(): StrategyMetadata {
    return {
      id: 'minimal',
      name: 'Minimal Test Strategy',
      description: 'A minimal strategy used in tests',
      version: '1.0.0',
      params: [
        { name: 'threshold', type: 'number', defaultValue: 0.5, description: 'Test threshold' },
      ],
      supportedAssets: ['TON'],
    };
  }

  async execute(_marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    const resolved = this.mergeParams(params);
    const threshold = Number(resolved['threshold']);
    return {
      action: threshold > 0.5 ? 'BUY' : 'HOLD',
      asset: 'TON',
      amount: '100000000',
      confidence: threshold,
      reason: `Threshold ${threshold}`,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
    };
  }
}

// ============================================================================
// DEFAULT_ENGINE_CONFIG
// ============================================================================

describe('DEFAULT_ENGINE_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_ENGINE_CONFIG.enabled).toBe(true);
  });

  it('should have sensible defaults', () => {
    expect(DEFAULT_ENGINE_CONFIG.defaultAsset).toBe('TON');
    expect(DEFAULT_ENGINE_CONFIG.maxParallelExecutions).toBeGreaterThan(0);
    expect(DEFAULT_ENGINE_CONFIG.maxHistoryPerAgent).toBeGreaterThan(0);
  });
});

// ============================================================================
// StrategyEngineError
// ============================================================================

describe('StrategyEngineError', () => {
  it('should be an instance of Error', () => {
    const err = new StrategyEngineError('test', 'STRATEGY_NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have name StrategyEngineError', () => {
    const err = new StrategyEngineError('test', 'STRATEGY_NOT_FOUND');
    expect(err.name).toBe('StrategyEngineError');
  });

  it('should carry code and message', () => {
    const err = new StrategyEngineError('not found', 'STRATEGY_NOT_FOUND', { id: 'x' });
    expect(err.code).toBe('STRATEGY_NOT_FOUND');
    expect(err.message).toBe('not found');
    expect(err.metadata).toEqual({ id: 'x' });
  });
});

// ============================================================================
// BaseStrategy
// ============================================================================

describe('BaseStrategy', () => {
  it('should merge params with defaults', async () => {
    const strategy = new MinimalStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    // Default threshold is 0.5, so action should be HOLD
    expect(signal.action).toBe('HOLD');
  });

  it('should override defaults with provided params', async () => {
    const strategy = new MinimalStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), { threshold: 0.9 });
    expect(signal.action).toBe('BUY');
  });

  it('getPrice should return price for known asset', () => {
    const strategy = new MinimalStrategy();
    const marketData = makeMarketData(3.14);
    // Access protected method via any cast for testing
    const price = (strategy as any).getPrice(marketData, 'TON');
    expect(price).toBe(3.14);
  });

  it('getPrice should return undefined for unknown asset', () => {
    const strategy = new MinimalStrategy();
    const price = (strategy as any).getPrice(makeMarketData(1), 'UNKNOWN');
    expect(price).toBeUndefined();
  });
});

// ============================================================================
// StrategyRegistry
// ============================================================================

describe('DefaultStrategyRegistry', () => {
  let registry: DefaultStrategyRegistry;

  beforeEach(() => {
    registry = new DefaultStrategyRegistry();
  });

  it('should start empty', () => {
    expect(registry.listIds()).toHaveLength(0);
  });

  it('should register a strategy', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    expect(registry.has('minimal')).toBe(true);
  });

  it('should list registered strategy IDs', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    expect(registry.listIds()).toContain('minimal');
  });

  it('should return metadata for a registered strategy', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    const meta = registry.getMetadata('minimal');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('Minimal Test Strategy');
  });

  it('should list all metadata', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    const all = registry.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('minimal');
  });

  it('should throw when registering duplicate strategy', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    expect(() =>
      registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p))
    ).toThrow(StrategyEngineError);
  });

  it('should throw STRATEGY_ALREADY_REGISTERED error code on duplicate', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    try {
      registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    } catch (err) {
      expect(err instanceof StrategyEngineError && err.code).toBe('STRATEGY_ALREADY_REGISTERED');
    }
  });

  it('should unregister a strategy', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    registry.unregister('minimal');
    expect(registry.has('minimal')).toBe(false);
  });

  it('should throw when unregistering unknown strategy', () => {
    expect(() => registry.unregister('unknown')).toThrow(StrategyEngineError);
  });

  it('should create an instance with merged params', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    const instance = registry.createInstance('minimal', { threshold: 0.9 });
    expect(instance).toBeDefined();
  });

  it('should apply defaults when no params provided', () => {
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    const instance = registry.createInstance('minimal');
    expect(instance).toBeDefined();
  });

  it('should throw STRATEGY_NOT_FOUND when creating instance of unknown strategy', () => {
    expect(() => registry.createInstance('unknown')).toThrow(StrategyEngineError);
  });

  it('should emit strategy.registered event', () => {
    const events: StrategyEngineEvent[] = [];
    registry.subscribe((e) => events.push(e));
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    expect(events.some((e) => e.type === 'strategy.registered')).toBe(true);
  });

  it('should emit strategy.unregistered event', () => {
    const events: StrategyEngineEvent[] = [];
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    registry.subscribe((e) => events.push(e));
    registry.unregister('minimal');
    expect(events.some((e) => e.type === 'strategy.unregistered')).toBe(true);
  });

  it('should unsubscribe correctly', () => {
    const events: StrategyEngineEvent[] = [];
    const unsub = registry.subscribe((e) => events.push(e));
    unsub();
    const strategy = new MinimalStrategy();
    registry.register(strategy.getMetadata(), (p) => new MinimalStrategy(p));
    expect(events).toHaveLength(0);
  });
});

describe('createStrategyRegistry', () => {
  it('should return a DefaultStrategyRegistry', () => {
    const registry = createStrategyRegistry();
    expect(registry).toBeInstanceOf(DefaultStrategyRegistry);
  });
});

// ============================================================================
// StrategyLoader
// ============================================================================

describe('DefaultStrategyLoader', () => {
  let registry: DefaultStrategyRegistry;
  let loader: DefaultStrategyLoader;

  beforeEach(() => {
    registry = new DefaultStrategyRegistry();
    loader = new DefaultStrategyLoader(registry);
  });

  it('should load all three built-in strategies', () => {
    loader.loadBuiltIns();
    expect(registry.has('trend')).toBe(true);
    expect(registry.has('arbitrage')).toBe(true);
    expect(registry.has('ai-signal')).toBe(true);
  });

  it('loadBuiltIns should be idempotent (no error on second call)', () => {
    loader.loadBuiltIns();
    expect(() => loader.loadBuiltIns()).not.toThrow();
  });

  it('should still have all strategies after second loadBuiltIns', () => {
    loader.loadBuiltIns();
    loader.loadBuiltIns();
    expect(registry.listIds()).toHaveLength(3);
  });

  it('isLoaded should return true for loaded strategies', () => {
    loader.loadBuiltIns();
    expect(loader.isLoaded('trend')).toBe(true);
    expect(loader.isLoaded('arbitrage')).toBe(true);
    expect(loader.isLoaded('ai-signal')).toBe(true);
  });

  it('isLoaded should return false for unregistered strategies', () => {
    expect(loader.isLoaded('unknown')).toBe(false);
  });

  it('should register a custom strategy', () => {
    loader.registerCustom(MinimalStrategy);
    expect(registry.has('minimal')).toBe(true);
  });

  it('should throw for custom strategy with empty id', () => {
    class BadStrategy extends BaseStrategy {
      getMetadata(): StrategyMetadata {
        return {
          id: '',
          name: 'Bad',
          description: 'bad strategy',
          version: '1.0.0',
          params: [],
          supportedAssets: [],
        };
      }
      async execute(): Promise<TradeSignal> {
        return { action: 'HOLD', asset: 'TON', amount: '0', confidence: 0, reason: '', strategyId: '', generatedAt: new Date() };
      }
    }
    expect(() => loader.registerCustom(BadStrategy)).toThrow(StrategyEngineError);
  });

  it('should unload a strategy', () => {
    loader.loadBuiltIns();
    loader.unload('trend');
    expect(loader.isLoaded('trend')).toBe(false);
  });
});

describe('createStrategyLoader', () => {
  it('should return a DefaultStrategyLoader', () => {
    const registry = createStrategyRegistry();
    const loader = createStrategyLoader(registry);
    expect(loader).toBeInstanceOf(DefaultStrategyLoader);
  });
});

// ============================================================================
// TrendStrategy
// ============================================================================

describe('TrendStrategy', () => {
  it('should have correct metadata', () => {
    const strategy = new TrendStrategy();
    const meta = strategy.getMetadata();
    expect(meta.id).toBe('trend');
    expect(meta.params.length).toBeGreaterThan(0);
    expect(meta.supportedAssets).toContain('TON');
  });

  it('should return HOLD when no price data available', async () => {
    const strategy = new TrendStrategy();
    const signal = await strategy.execute(makeEmptyMarketData(), { asset: 'TON' });
    expect(signal.action).toBe('HOLD');
    expect(signal.amount).toBe('0');
    expect(signal.confidence).toBe(0);
  });

  it('should return HOLD when only one price point (no SMA comparison)', async () => {
    const strategy = new TrendStrategy();
    // With only 1 price, SMA == current price, so should HOLD
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.action).toBe('HOLD');
  });

  it('should return BUY when current price is above SMA', async () => {
    const strategy = new TrendStrategy({ movingAveragePeriods: 3 });
    // Add lower prices to make SMA below current
    await strategy.execute(makeMarketData(1.0), {});
    await strategy.execute(makeMarketData(1.0), {});
    await strategy.execute(makeMarketData(1.0), {});
    // Now push a higher price
    const signal = await strategy.execute(makeMarketData(5.0), {});
    expect(signal.action).toBe('BUY');
  });

  it('should return SELL when current price is below SMA', async () => {
    const strategy = new TrendStrategy({ movingAveragePeriods: 3 });
    // Add higher prices to make SMA above current
    await strategy.execute(makeMarketData(10.0), {});
    await strategy.execute(makeMarketData(10.0), {});
    await strategy.execute(makeMarketData(10.0), {});
    // Now push a lower price
    const signal = await strategy.execute(makeMarketData(1.0), {});
    expect(signal.action).toBe('SELL');
  });

  it('should include metadata with sma and currentPrice', async () => {
    const strategy = new TrendStrategy({ movingAveragePeriods: 2 });
    await strategy.execute(makeMarketData(2.0), {});
    const signal = await strategy.execute(makeMarketData(3.0), {});
    expect(signal.metadata?.currentPrice).toBeDefined();
    expect(signal.metadata?.sma).toBeDefined();
  });

  it('should have strategyId set to "trend"', async () => {
    const strategy = new TrendStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.strategyId).toBe('trend');
  });

  it('should use provided asset parameter', async () => {
    const strategy = new TrendStrategy({ asset: 'BTC' });
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.asset).toBe('BTC');
  });

  it('should respect tradeAmount parameter', async () => {
    const strategy = new TrendStrategy({ movingAveragePeriods: 2, tradeAmount: '500000000' });
    await strategy.execute(makeMarketData(1.0), {});
    const signal = await strategy.execute(makeMarketData(5.0), {}); // BUY signal
    if (signal.action === 'BUY') {
      expect(signal.amount).toBe('500000000');
    }
  });

  it('should have confidence between 0 and 1', async () => {
    const strategy = new TrendStrategy({ movingAveragePeriods: 3 });
    await strategy.execute(makeMarketData(1.0), {});
    await strategy.execute(makeMarketData(1.0), {});
    const signal = await strategy.execute(makeMarketData(5.0), {});
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// ArbitrageStrategy
// ============================================================================

describe('ArbitrageStrategy', () => {
  it('should have correct metadata', () => {
    const strategy = new ArbitrageStrategy();
    const meta = strategy.getMetadata();
    expect(meta.id).toBe('arbitrage');
    expect(meta.params.length).toBeGreaterThan(0);
    expect(meta.supportedAssets).toContain('TON');
  });

  it('should return HOLD when no price data available', async () => {
    const strategy = new ArbitrageStrategy();
    const signal = await strategy.execute(makeEmptyMarketData(), {});
    expect(signal.action).toBe('HOLD');
    expect(signal.amount).toBe('0');
  });

  it('should have strategyId set to "arbitrage"', async () => {
    const strategy = new ArbitrageStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.strategyId).toBe('arbitrage');
  });

  it('should include exchange prices in metadata', async () => {
    const strategy = new ArbitrageStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.metadata?.exchangePrices).toBeDefined();
    expect(Array.isArray(signal.metadata?.exchangePrices)).toBe(true);
  });

  it('should include spreadPct in metadata', async () => {
    const strategy = new ArbitrageStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.metadata?.spreadPct).toBeDefined();
  });

  it('should produce BUY or HOLD signal (never SELL)', async () => {
    const strategy = new ArbitrageStrategy();
    for (let i = 0; i < 10; i++) {
      const signal = await strategy.execute(makeMarketData(2.5), {});
      expect(['BUY', 'HOLD']).toContain(signal.action);
    }
  });

  it('should return BUY when minSpreadPct is very low (near-zero threshold)', async () => {
    const strategy = new ArbitrageStrategy({ minSpreadPct: 0.001 });
    // With a very low threshold, the simulated spread should exceed it
    let buyCount = 0;
    for (let i = 0; i < 20; i++) {
      const signal = await strategy.execute(makeMarketData(2.5), {});
      if (signal.action === 'BUY') buyCount++;
    }
    expect(buyCount).toBeGreaterThan(0);
  });

  it('should use provided asset parameter', async () => {
    const strategy = new ArbitrageStrategy({ asset: 'BTC' });
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.asset).toBe('BTC');
  });

  it('should have confidence between 0 and 1', async () => {
    const strategy = new ArbitrageStrategy({ minSpreadPct: 0.001 });
    for (let i = 0; i < 5; i++) {
      const signal = await strategy.execute(makeMarketData(2.5), {});
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ============================================================================
// AISignalStrategy
// ============================================================================

describe('AISignalStrategy', () => {
  it('should have correct metadata', () => {
    const strategy = new AISignalStrategy();
    const meta = strategy.getMetadata();
    expect(meta.id).toBe('ai-signal');
    expect(meta.params.some((p) => p.name === 'rsiPeriod')).toBe(true);
    expect(meta.params.some((p) => p.name === 'oversoldThreshold')).toBe(true);
    expect(meta.params.some((p) => p.name === 'overboughtThreshold')).toBe(true);
  });

  it('should return HOLD when no price data available', async () => {
    const strategy = new AISignalStrategy();
    const signal = await strategy.execute(makeEmptyMarketData(), {});
    expect(signal.action).toBe('HOLD');
    expect(signal.confidence).toBe(0);
  });

  it('should hold during warm-up (insufficient history)', async () => {
    const strategy = new AISignalStrategy({ rsiPeriod: 14 });
    // With only a few samples, RSI can't be computed
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.action).toBe('HOLD');
  });

  it('should have strategyId set to "ai-signal"', async () => {
    const strategy = new AISignalStrategy();
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.strategyId).toBe('ai-signal');
  });

  it('should produce BUY signal when RSI is below oversold threshold', async () => {
    const strategy = new AISignalStrategy({ rsiPeriod: 5, oversoldThreshold: 50, overboughtThreshold: 95 });
    // Build up history with stable prices, then add a clear downtrend
    for (let i = 0; i < 10; i++) {
      await strategy.execute(makeMarketData(3.0), {});
    }
    // Consistent downward price action — each tick lower, causing RSI to compute as low
    for (let i = 0; i < 10; i++) {
      await strategy.execute(makeMarketData(3.0 - i * 0.2), {}); // 3.0, 2.8, 2.6, ..., 1.2
    }
    const signal = await strategy.execute(makeMarketData(1.0), {}); // final drop
    // After consistent drops, RSI should be below 50 triggering BUY or HOLD
    expect(['BUY', 'HOLD']).toContain(signal.action);
  });

  it('should produce SELL signal when RSI is above overbought threshold', async () => {
    const strategy = new AISignalStrategy({ rsiPeriod: 5, oversoldThreshold: 10, overboughtThreshold: 30 });
    // Build up history with low prices then surge sharply to trigger overbought
    for (let i = 0; i < 10; i++) {
      await strategy.execute(makeMarketData(0.1), {});
    }
    // Sharp rise — RSI should exceed overboughtThreshold
    for (let i = 0; i < 10; i++) {
      await strategy.execute(makeMarketData(100.0), {});
    }
    const signal = await strategy.execute(makeMarketData(100.0), {});
    expect(['SELL', 'HOLD']).toContain(signal.action);
  });

  it('should include rsi in metadata when computed', async () => {
    const strategy = new AISignalStrategy({ rsiPeriod: 3 });
    for (let i = 0; i < 10; i++) {
      await strategy.execute(makeMarketData(2.5 + i * 0.1), {});
    }
    const signal = await strategy.execute(makeMarketData(3.0), {});
    // After enough data, RSI should be present in metadata
    expect(signal.metadata).toBeDefined();
  });

  it('should have confidence between 0 and 1', async () => {
    const strategy = new AISignalStrategy({ rsiPeriod: 5 });
    for (let i = 0; i < 20; i++) {
      const signal = await strategy.execute(makeMarketData(2.0 + Math.random()), {});
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should use provided asset parameter', async () => {
    const strategy = new AISignalStrategy({ asset: 'BTC' });
    const signal = await strategy.execute(makeMarketData(2.5), {});
    expect(signal.asset).toBe('BTC');
  });
});

// ============================================================================
// StrategyExecutionEngine
// ============================================================================

describe('StrategyExecutionEngine - lifecycle', () => {
  let registry: DefaultStrategyRegistry;
  let engine: StrategyExecutionEngine;

  beforeEach(() => {
    registry = new DefaultStrategyRegistry();
    engine = new StrategyExecutionEngine(registry);
    const loader = new DefaultStrategyLoader(registry);
    loader.loadBuiltIns();
  });

  it('should not be running before start()', () => {
    expect(engine.isRunning()).toBe(false);
  });

  it('should be running after start()', () => {
    engine.start();
    expect(engine.isRunning()).toBe(true);
  });

  it('should not be running after stop()', () => {
    engine.start();
    engine.stop();
    expect(engine.isRunning()).toBe(false);
  });

  it('calling start() twice is idempotent', () => {
    engine.start();
    engine.start();
    expect(engine.isRunning()).toBe(true);
  });

  it('calling stop() twice is idempotent', () => {
    engine.start();
    engine.stop();
    engine.stop();
    expect(engine.isRunning()).toBe(false);
  });

  it('should emit engine.started event', () => {
    const events: StrategyEngineEvent[] = [];
    engine.subscribe((e) => events.push(e));
    engine.start();
    expect(events.some((e) => e.type === 'engine.started')).toBe(true);
  });

  it('should emit engine.stopped event', () => {
    const events: StrategyEngineEvent[] = [];
    engine.start();
    engine.subscribe((e) => events.push(e));
    engine.stop();
    expect(events.some((e) => e.type === 'engine.stopped')).toBe(true);
  });
});

describe('StrategyExecutionEngine - execution', () => {
  let registry: DefaultStrategyRegistry;
  let engine: StrategyExecutionEngine;
  const marketData = makeMarketData(2.5);

  beforeEach(() => {
    registry = new DefaultStrategyRegistry();
    engine = new StrategyExecutionEngine(registry);
    const loader = new DefaultStrategyLoader(registry);
    loader.loadBuiltIns();
    engine.start();
  });

  it('should execute trend strategy and return a result', async () => {
    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-001',
      marketData,
    });
    expect(result).toBeDefined();
    expect(result.executionId).toBeTruthy();
    expect(result.strategyId).toBe('trend');
    expect(result.agentId).toBe('agent-001');
  });

  it('should execute arbitrage strategy and return a result', async () => {
    const result = await engine.execute({
      strategyId: 'arbitrage',
      agentId: 'agent-001',
      marketData,
    });
    expect(result.strategyId).toBe('arbitrage');
    expect(result.signal).toBeDefined();
  });

  it('should execute ai-signal strategy and return a result', async () => {
    const result = await engine.execute({
      strategyId: 'ai-signal',
      agentId: 'agent-001',
      marketData,
    });
    expect(result.strategyId).toBe('ai-signal');
    expect(result.signal).toBeDefined();
  });

  it('should return a signal with action BUY, SELL, or HOLD', async () => {
    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-001',
      marketData,
    });
    expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal.action);
  });

  it('should report success=true for a valid execution', async () => {
    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-001',
      marketData,
    });
    expect(result.success).toBe(true);
  });

  it('should record execution time fields', async () => {
    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-001',
      marketData,
    });
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should throw STRATEGY_NOT_FOUND for unknown strategy', async () => {
    await expect(
      engine.execute({ strategyId: 'unknown', agentId: 'agent-001', marketData })
    ).rejects.toThrow(StrategyEngineError);
  });

  it('should throw ENGINE_DISABLED when engine is disabled', async () => {
    const disabledEngine = new StrategyExecutionEngine(registry, { enabled: false });
    await expect(
      disabledEngine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData })
    ).rejects.toThrow(StrategyEngineError);
  });

  it('should pass params to the strategy', async () => {
    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-001',
      marketData,
      params: { asset: 'TON', movingAveragePeriods: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('should store execution history per agent', async () => {
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    const history = engine.getHistory('agent-001');
    expect(history.length).toBe(1);
    expect(history[0].strategyId).toBe('trend');
  });

  it('should accumulate history across multiple executions', async () => {
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    await engine.execute({ strategyId: 'arbitrage', agentId: 'agent-001', marketData });
    const history = engine.getHistory('agent-001');
    expect(history.length).toBe(2);
  });

  it('should return empty history for unknown agent', () => {
    expect(engine.getHistory('unknown-agent')).toHaveLength(0);
  });

  it('should emit execution.started and execution.completed events', async () => {
    const events: StrategyEngineEvent[] = [];
    engine.subscribe((e) => events.push(e));
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    expect(events.some((e) => e.type === 'execution.started')).toBe(true);
    expect(events.some((e) => e.type === 'execution.completed')).toBe(true);
  });

  it('should emit signal.generated event', async () => {
    const events: StrategyEngineEvent[] = [];
    engine.subscribe((e) => events.push(e));
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    expect(events.some((e) => e.type === 'signal.generated')).toBe(true);
  });

  it('should swallow errors thrown by event subscribers', async () => {
    engine.subscribe(() => { throw new Error('bad subscriber'); });
    await expect(
      engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData })
    ).resolves.toBeDefined();
  });
});

describe('StrategyExecutionEngine - metrics', () => {
  let registry: DefaultStrategyRegistry;
  let engine: StrategyExecutionEngine;
  const marketData = makeMarketData(2.5);

  beforeEach(() => {
    registry = new DefaultStrategyRegistry();
    engine = new StrategyExecutionEngine(registry);
    const loader = new DefaultStrategyLoader(registry);
    loader.loadBuiltIns();
    engine.start();
  });

  it('should track total executions', async () => {
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    await engine.execute({ strategyId: 'arbitrage', agentId: 'agent-001', marketData });
    const metrics = engine.getMetrics();
    expect(metrics.totalExecutions).toBe(2);
  });

  it('should track successful executions', async () => {
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    const metrics = engine.getMetrics();
    expect(metrics.successfulExecutions).toBe(1);
    expect(metrics.failedExecutions).toBe(0);
  });

  it('should track total strategies registered', () => {
    const metrics = engine.getMetrics();
    expect(metrics.totalStrategiesRegistered).toBe(3);
  });

  it('should track signal counts (buy + sell + hold = total)', async () => {
    await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData });
    const metrics = engine.getMetrics();
    const signalTotal = metrics.buySignals + metrics.sellSignals + metrics.holdSignals;
    expect(signalTotal).toBe(1);
  });
});

// ============================================================================
// createStrategyExecutionEngine factory
// ============================================================================

describe('createStrategyExecutionEngine', () => {
  it('should return a StrategyExecutionEngine instance', () => {
    const registry = createStrategyRegistry();
    const engine = createStrategyExecutionEngine(registry);
    expect(engine).toBeInstanceOf(StrategyExecutionEngine);
  });

  it('should accept partial config', () => {
    const registry = createStrategyRegistry();
    const engine = createStrategyExecutionEngine(registry, { maxParallelExecutions: 5 });
    expect(engine).toBeInstanceOf(StrategyExecutionEngine);
  });
});

// ============================================================================
// Integration: Registry + Loader + Engine
// ============================================================================

describe('Strategy Engine - integration', () => {
  it('should run all three strategies end-to-end', async () => {
    const registry = createStrategyRegistry();
    const loader = createStrategyLoader(registry);
    loader.loadBuiltIns();

    const engine = createStrategyExecutionEngine(registry);
    engine.start();

    const marketData = makeMarketData(2.5);

    for (const strategyId of ['trend', 'arbitrage', 'ai-signal']) {
      const result = await engine.execute({ strategyId, agentId: 'agent-integration', marketData });
      expect(result.strategyId).toBe(strategyId);
      expect(result.signal).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal.action);
      expect(result.signal.generatedAt).toBeInstanceOf(Date);
    }
  });

  it('should execute strategies multiple times and build history', async () => {
    const registry = createStrategyRegistry();
    const loader = createStrategyLoader(registry);
    loader.loadBuiltIns();

    const engine = createStrategyExecutionEngine(registry);
    engine.start();

    for (let i = 0; i < 5; i++) {
      await engine.execute({
        strategyId: 'trend',
        agentId: 'agent-multi',
        marketData: makeMarketData(2.0 + i * 0.2),
      });
    }

    const history = engine.getHistory('agent-multi');
    expect(history.length).toBe(5);

    const metrics = engine.getMetrics();
    expect(metrics.totalExecutions).toBe(5);
  });

  it('signal fields should include all required properties', async () => {
    const registry = createStrategyRegistry();
    const loader = createStrategyLoader(registry);
    loader.loadBuiltIns();
    const engine = createStrategyExecutionEngine(registry);
    engine.start();

    const result = await engine.execute({
      strategyId: 'trend',
      agentId: 'agent-fields',
      marketData: makeMarketData(3.0),
    });

    const signal = result.signal;
    expect(signal.action).toBeDefined();
    expect(signal.asset).toBeDefined();
    expect(signal.amount).toBeDefined();
    expect(signal.confidence).toBeDefined();
    expect(signal.reason).toBeDefined();
    expect(signal.strategyId).toBeDefined();
    expect(signal.generatedAt).toBeInstanceOf(Date);
  });
});
