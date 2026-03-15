/**
 * Tests for the Trading Engine v1 module (Issue #182)
 *
 * Covers:
 * - TradingEngineError: error structure and codes
 * - DefaultPortfolioManager: init, balance updates, snapshots, events, errors
 * - DefaultTradeHistoryRepository: save, query, count, limits
 * - SimulationTradeExecutor: BUY/SELL execution, HOLD skip, insufficient balance,
 *   price unavailable, invalid amount, min trade value
 * - TradingEngine: lifecycle, signal processing, portfolio init, trade history,
 *   PnL calculation, metrics, events, integration with strategy signals
 * - DEFAULT_TRADING_ENGINE_CONFIG and BASELINE_PRICES defaults
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Engine
  TradingEngine,
  createTradingEngine,
  DEFAULT_TRADING_ENGINE_CONFIG,
  BASELINE_PRICES,
  // Portfolio Manager
  DefaultPortfolioManager,
  createPortfolioManager,
  DEFAULT_INITIAL_BALANCES,
  // Trade History
  DefaultTradeHistoryRepository,
  createTradeHistoryRepository,
  // Trade Executor
  SimulationTradeExecutor,
  createSimulationTradeExecutor,
  // Error
  TradingEngineError,
} from '../../core/trading/engine';
import type {
  TradeSignal,
  TradeRecord,
  TradingEngineEvent,
  PortfolioBalance,
} from '../../core/trading/engine';

// ============================================================================
// Test Helpers
// ============================================================================

function makeSignal(overrides: Partial<TradeSignal> = {}): TradeSignal {
  return {
    action: 'BUY',
    asset: 'BTC',
    amount: '0.01',
    confidence: 0.8,
    reason: 'Test signal',
    strategyId: 'test-strategy',
    generatedAt: new Date(),
    ...overrides,
  };
}

function makePrices(overrides: Record<string, number> = {}): Record<string, number> {
  return {
    BTC: 65000,
    ETH: 3500,
    TON: 5.25,
    SOL: 175,
    USDT: 1.0,
    ...overrides,
  };
}

const TEST_INITIAL_BALANCES: PortfolioBalance = {
  USD: 10000,
  BTC: 0,
  ETH: 0,
  TON: 0,
  SOL: 0,
};

// ============================================================================
// TradingEngineError
// ============================================================================

describe('TradingEngineError', () => {
  it('should have the correct name', () => {
    const err = new TradingEngineError('test error', 'ENGINE_DISABLED');
    expect(err.name).toBe('TradingEngineError');
    expect(err.message).toBe('test error');
    expect(err.code).toBe('ENGINE_DISABLED');
  });

  it('should extend Error', () => {
    const err = new TradingEngineError('test', 'INSUFFICIENT_BALANCE');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TradingEngineError);
  });

  it('should store optional metadata', () => {
    const err = new TradingEngineError('test', 'PORTFOLIO_NOT_FOUND', { agentId: 'agent-001' });
    expect(err.metadata).toEqual({ agentId: 'agent-001' });
  });

  it('should work without metadata', () => {
    const err = new TradingEngineError('test', 'PRICE_UNAVAILABLE');
    expect(err.metadata).toBeUndefined();
  });
});

// ============================================================================
// DEFAULT_TRADING_ENGINE_CONFIG and BASELINE_PRICES
// ============================================================================

describe('DEFAULT_TRADING_ENGINE_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_TRADING_ENGINE_CONFIG.enabled).toBe(true);
    expect(DEFAULT_TRADING_ENGINE_CONFIG.quoteCurrency).toBe('USD');
    expect(DEFAULT_TRADING_ENGINE_CONFIG.feeRate).toBe(0);
    expect(DEFAULT_TRADING_ENGINE_CONFIG.minTradeValueUsd).toBeGreaterThan(0);
    expect(DEFAULT_TRADING_ENGINE_CONFIG.maxHistoryPerAgent).toBeGreaterThan(0);
  });
});

describe('BASELINE_PRICES', () => {
  it('should include all MVP assets', () => {
    expect(BASELINE_PRICES['BTC']).toBeGreaterThan(0);
    expect(BASELINE_PRICES['ETH']).toBeGreaterThan(0);
    expect(BASELINE_PRICES['TON']).toBeGreaterThan(0);
    expect(BASELINE_PRICES['SOL']).toBeGreaterThan(0);
    expect(BASELINE_PRICES['USDT']).toBe(1.0);
  });
});

// ============================================================================
// DefaultPortfolioManager
// ============================================================================

describe('DefaultPortfolioManager', () => {
  let manager: DefaultPortfolioManager;

  beforeEach(() => {
    manager = createPortfolioManager();
  });

  it('should create instance via factory', () => {
    expect(manager).toBeInstanceOf(DefaultPortfolioManager);
  });

  it('should initialize a new portfolio', () => {
    const portfolio = manager.initPortfolio('agent-001', { USD: 10000, BTC: 0 });
    expect(portfolio.agentId).toBe('agent-001');
    expect(portfolio.balances.USD).toBe(10000);
    expect(portfolio.balances.BTC).toBe(0);
  });

  it('should return existing portfolio on second init call (idempotent)', () => {
    manager.initPortfolio('agent-001', { USD: 10000 });
    manager.updateBalance('agent-001', 'USD', -500);
    // Second init should NOT reset balances
    manager.initPortfolio('agent-001', { USD: 99999 });
    const portfolio = manager.getPortfolio('agent-001');
    expect(portfolio.balances.USD).toBe(9500); // unchanged
  });

  it('should use DEFAULT_INITIAL_BALANCES when no balances provided', () => {
    const portfolio = manager.initPortfolio('agent-001');
    expect(portfolio.balances.USD).toBe(DEFAULT_INITIAL_BALANCES.USD);
  });

  it('should throw PORTFOLIO_NOT_FOUND for unknown agent', () => {
    expect(() => manager.getPortfolio('unknown')).toThrow(TradingEngineError);
    try {
      manager.getPortfolio('unknown');
    } catch (err) {
      expect(err).toBeInstanceOf(TradingEngineError);
      expect((err as TradingEngineError).code).toBe('PORTFOLIO_NOT_FOUND');
    }
  });

  it('should report hasPortfolio correctly', () => {
    expect(manager.hasPortfolio('agent-001')).toBe(false);
    manager.initPortfolio('agent-001');
    expect(manager.hasPortfolio('agent-001')).toBe(true);
  });

  it('should update balance correctly (positive delta)', () => {
    manager.initPortfolio('agent-001', { USD: 10000, BTC: 0 });
    manager.updateBalance('agent-001', 'BTC', 0.5);
    expect(manager.getBalance('agent-001', 'BTC')).toBe(0.5);
  });

  it('should update balance correctly (negative delta)', () => {
    manager.initPortfolio('agent-001', { USD: 10000 });
    manager.updateBalance('agent-001', 'USD', -1000);
    expect(manager.getBalance('agent-001', 'USD')).toBe(9000);
  });

  it('should return 0 for unknown asset balance', () => {
    manager.initPortfolio('agent-001', { USD: 10000 });
    expect(manager.getBalance('agent-001', 'XYZ')).toBe(0);
  });

  it('should snapshot balances as a copy', () => {
    manager.initPortfolio('agent-001', { USD: 10000, BTC: 0.5 });
    const snapshot = manager.snapshotBalances('agent-001');
    expect(snapshot).toEqual({ USD: 10000, BTC: 0.5 });
    // Mutating snapshot should not affect portfolio
    snapshot.USD = 99999;
    expect(manager.getBalance('agent-001', 'USD')).toBe(10000);
  });

  it('should list all agent IDs', () => {
    manager.initPortfolio('agent-001');
    manager.initPortfolio('agent-002');
    const ids = manager.listAgentIds();
    expect(ids).toContain('agent-001');
    expect(ids).toContain('agent-002');
  });

  it('should emit portfolio.created event on init', () => {
    const events: TradingEngineEvent[] = [];
    manager.subscribe((e) => events.push(e));
    manager.initPortfolio('agent-001', { USD: 5000 });
    const created = events.find((e) => e.type === 'portfolio.created');
    expect(created).toBeDefined();
    expect(created?.agentId).toBe('agent-001');
  });

  it('should emit portfolio.updated event on balance update', () => {
    const events: TradingEngineEvent[] = [];
    manager.initPortfolio('agent-001', { USD: 10000 });
    manager.subscribe((e) => events.push(e));
    manager.updateBalance('agent-001', 'USD', -500);
    const updated = events.find((e) => e.type === 'portfolio.updated');
    expect(updated).toBeDefined();
    expect(updated?.agentId).toBe('agent-001');
  });

  it('should return unsubscribe function that stops further events', () => {
    const events: TradingEngineEvent[] = [];
    manager.initPortfolio('agent-001', { USD: 10000 });
    const unsubscribe = manager.subscribe((e) => events.push(e));
    manager.updateBalance('agent-001', 'USD', -100);
    unsubscribe();
    manager.updateBalance('agent-001', 'USD', -100);
    const updatedCount = events.filter((e) => e.type === 'portfolio.updated').length;
    expect(updatedCount).toBe(1);
  });
});

// ============================================================================
// DefaultTradeHistoryRepository
// ============================================================================

describe('DefaultTradeHistoryRepository', () => {
  let repo: DefaultTradeHistoryRepository;

  function makeTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
    return {
      tradeId: `trade-${Date.now()}-${Math.random()}`,
      agentId: 'agent-001',
      action: 'BUY',
      asset: 'BTC',
      amount: 0.01,
      price: 65000,
      value: 650,
      fee: 0,
      strategyId: 'test',
      confidence: 0.8,
      timestamp: new Date(),
      balanceBefore: { USD: 10000, BTC: 0 },
      balanceAfter: { USD: 9350, BTC: 0.01 },
      ...overrides,
    };
  }

  beforeEach(() => {
    repo = createTradeHistoryRepository(10);
  });

  it('should create instance via factory', () => {
    expect(repo).toBeInstanceOf(DefaultTradeHistoryRepository);
  });

  it('should save and retrieve a trade', () => {
    const trade = makeTrade();
    repo.save(trade);
    const retrieved = repo.getByAgent('agent-001');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].tradeId).toBe(trade.tradeId);
  });

  it('should return trades newest first (prepend order)', () => {
    const t1 = makeTrade({ tradeId: 'trade-1' });
    const t2 = makeTrade({ tradeId: 'trade-2' });
    repo.save(t1);
    repo.save(t2);
    const history = repo.getByAgent('agent-001');
    expect(history[0].tradeId).toBe('trade-2'); // newest first
    expect(history[1].tradeId).toBe('trade-1');
  });

  it('should return empty array for unknown agent', () => {
    expect(repo.getByAgent('unknown')).toEqual([]);
  });

  it('should enforce max per-agent limit', () => {
    for (let i = 0; i < 15; i++) {
      repo.save(makeTrade({ tradeId: `trade-${i}` }));
    }
    expect(repo.getByAgent('agent-001')).toHaveLength(10);
  });

  it('should support limit parameter in getByAgent', () => {
    for (let i = 0; i < 5; i++) repo.save(makeTrade({ tradeId: `trade-${i}` }));
    expect(repo.getByAgent('agent-001', 3)).toHaveLength(3);
  });

  it('should count trades correctly', () => {
    repo.save(makeTrade());
    repo.save(makeTrade());
    expect(repo.countByAgent('agent-001')).toBe(2);
    expect(repo.countByAgent('agent-999')).toBe(0);
  });

  it('should store trades from multiple agents separately', () => {
    repo.save(makeTrade({ agentId: 'agent-001' }));
    repo.save(makeTrade({ agentId: 'agent-002' }));
    expect(repo.getByAgent('agent-001')).toHaveLength(1);
    expect(repo.getByAgent('agent-002')).toHaveLength(1);
  });

  it('should return all trades via getAll()', () => {
    repo.save(makeTrade({ agentId: 'agent-001' }));
    repo.save(makeTrade({ agentId: 'agent-002' }));
    expect(repo.getAll()).toHaveLength(2);
  });

  it('should support limit parameter in getAll()', () => {
    for (let i = 0; i < 5; i++) repo.save(makeTrade({ tradeId: `t-${i}` }));
    expect(repo.getAll(3)).toHaveLength(3);
  });

  it('should report totalCount', () => {
    repo.save(makeTrade({ agentId: 'agent-001' }));
    repo.save(makeTrade({ agentId: 'agent-002' }));
    expect(repo.totalCount()).toBe(2);
  });

  it('should list agent IDs with trades', () => {
    repo.save(makeTrade({ agentId: 'agent-001' }));
    repo.save(makeTrade({ agentId: 'agent-002' }));
    const ids = repo.listAgentIds();
    expect(ids).toContain('agent-001');
    expect(ids).toContain('agent-002');
  });
});

// ============================================================================
// SimulationTradeExecutor
// ============================================================================

describe('SimulationTradeExecutor', () => {
  let portfolioManager: DefaultPortfolioManager;
  let historyRepo: DefaultTradeHistoryRepository;
  let executor: SimulationTradeExecutor;

  beforeEach(() => {
    portfolioManager = createPortfolioManager();
    historyRepo = createTradeHistoryRepository();
    executor = createSimulationTradeExecutor(portfolioManager, historyRepo, {
      ...DEFAULT_TRADING_ENGINE_CONFIG,
    });
    portfolioManager.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
  });

  it('should create instance via factory', () => {
    expect(executor).toBeInstanceOf(SimulationTradeExecutor);
  });

  describe('HOLD signals', () => {
    it('should skip HOLD signal without executing a trade', async () => {
      const result = await executor.execute(makeSignal({ action: 'HOLD' }), 'agent-001', makePrices());
      expect(result.status).toBe('skipped');
      expect(result.success).toBe(true);
      expect(result.trade).toBeUndefined();
    });
  });

  describe('BUY execution', () => {
    it('should execute a valid BUY trade', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('executed');
      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
      expect(result.trade!.action).toBe('BUY');
      expect(result.trade!.asset).toBe('BTC');
      expect(result.trade!.amount).toBe(0.01);
      expect(result.trade!.price).toBe(65000);
      expect(result.trade!.value).toBe(650);
    });

    it('should deduct USD and credit BTC after BUY', async () => {
      await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(portfolioManager.getBalance('agent-001', 'USD')).toBeCloseTo(9350, 2);
      expect(portfolioManager.getBalance('agent-001', 'BTC')).toBeCloseTo(0.01, 8);
    });

    it('should reject BUY with insufficient USD balance', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '1' }), // 1 BTC = $65000
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('rejected');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/[Ii]nsufficient/);
    });

    it('should record trade in history after BUY', async () => {
      await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices()
      );
      expect(historyRepo.countByAgent('agent-001')).toBe(1);
    });

    it('should capture balanceBefore and balanceAfter in trade record', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.trade!.balanceBefore.USD).toBe(10000);
      expect(result.trade!.balanceAfter.USD).toBeCloseTo(9350, 2);
      expect(result.trade!.balanceAfter.BTC).toBeCloseTo(0.01, 8);
    });
  });

  describe('SELL execution', () => {
    beforeEach(async () => {
      // First BUY some BTC
      await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
    });

    it('should execute a valid SELL trade', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.05' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('executed');
      expect(result.success).toBe(true);
      expect(result.trade!.action).toBe('SELL');
      expect(result.trade!.amount).toBe(0.05);
      expect(result.trade!.value).toBe(3250);
    });

    it('should deduct BTC and credit USD after SELL', async () => {
      const usdBefore = portfolioManager.getBalance('agent-001', 'USD');
      await executor.execute(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.05' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(portfolioManager.getBalance('agent-001', 'BTC')).toBeCloseTo(0.05, 8);
      expect(portfolioManager.getBalance('agent-001', 'USD')).toBeCloseTo(usdBefore + 3250, 2);
    });

    it('should reject SELL with insufficient asset balance', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '99' }), // way more than we have
        'agent-001',
        makePrices()
      );
      expect(result.status).toBe('rejected');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/[Ii]nsufficient/);
    });
  });

  describe('Price unavailable', () => {
    it('should reject when price is not in the prices map', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'UNKNOWN_ASSET', amount: '1' }),
        'agent-001',
        {} // empty prices
      );
      expect(result.status).toBe('rejected');
      expect(result.message).toMatch(/[Pp]rice not available/);
    });
  });

  describe('Invalid signal', () => {
    it('should reject negative amount', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '-1' }),
        'agent-001',
        makePrices()
      );
      expect(result.status).toBe('rejected');
      expect(result.message).toMatch(/[Ii]nvalid.*amount/i);
    });

    it('should reject zero amount', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0' }),
        'agent-001',
        makePrices()
      );
      expect(result.status).toBe('rejected');
    });

    it('should reject non-numeric amount', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: 'abc' }),
        'agent-001',
        makePrices()
      );
      expect(result.status).toBe('rejected');
    });
  });

  describe('Auto portfolio initialization', () => {
    it('should auto-initialize portfolio if agent has no portfolio', async () => {
      const result = await executor.execute(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.001' }),
        'new-agent',
        makePrices({ BTC: 65000 })
      );
      // new-agent gets DEFAULT_INITIAL_BALANCES (USD: 10000)
      expect(result.status).toBe('executed');
    });
  });
});

// ============================================================================
// TradingEngine (Core)
// ============================================================================

describe('TradingEngine', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = createTradingEngine();
    engine.start();
  });

  describe('Lifecycle', () => {
    it('should create instance via factory', () => {
      expect(engine).toBeInstanceOf(TradingEngine);
    });

    it('should start and report isRunning', () => {
      expect(engine.isRunning()).toBe(true);
    });

    it('should stop and report not running', () => {
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('start() should be idempotent', () => {
      engine.start();
      engine.start();
      expect(engine.isRunning()).toBe(true);
    });

    it('stop() should be idempotent', () => {
      engine.stop();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('should throw ENGINE_DISABLED when processing signal while disabled', async () => {
      const disabledEngine = createTradingEngine({ enabled: false });
      disabledEngine.start();
      disabledEngine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
      await expect(disabledEngine.processSignal(makeSignal(), 'agent-001', makePrices()))
        .rejects.toThrow(TradingEngineError);
    });
  });

  describe('Portfolio initialization', () => {
    it('should initialize a portfolio for an agent', () => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
      const portfolio = engine.getPortfolio('agent-001');
      expect(portfolio.agentId).toBe('agent-001');
      expect(portfolio.balances.USD).toBe(10000);
    });

    it('initPortfolio() should be idempotent', () => {
      engine.initPortfolio('agent-001', { USD: 10000 });
      engine.initPortfolio('agent-001', { USD: 99999 }); // should not reset
      expect(engine.getPortfolio('agent-001').balances.USD).toBe(10000);
    });
  });

  describe('BUY signal processing', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
    });

    it('should execute BUY signal and return executed result', async () => {
      const result = await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('executed');
      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
    });

    it('should update portfolio balances after BUY', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      const portfolio = engine.getPortfolio('agent-001');
      expect(portfolio.balances.USD).toBeCloseTo(9350, 2);
      expect(portfolio.balances.BTC).toBeCloseTo(0.01, 8);
    });
  });

  describe('SELL signal processing', () => {
    beforeEach(async () => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
      // First buy some BTC
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
    });

    it('should execute SELL signal', async () => {
      const result = await engine.processSignal(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.05' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('executed');
      expect(result.trade!.action).toBe('SELL');
    });

    it('should update portfolio after SELL', async () => {
      await engine.processSignal(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.05' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      const portfolio = engine.getPortfolio('agent-001');
      expect(portfolio.balances.BTC).toBeCloseTo(0.05, 8);
    });
  });

  describe('HOLD signal processing', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
    });

    it('should skip HOLD signals', async () => {
      const result = await engine.processSignal(
        makeSignal({ action: 'HOLD' }),
        'agent-001',
        makePrices()
      );
      expect(result.status).toBe('skipped');
      expect(result.trade).toBeUndefined();
    });

    it('should not modify portfolio on HOLD', async () => {
      await engine.processSignal(makeSignal({ action: 'HOLD' }), 'agent-001', makePrices());
      expect(engine.getPortfolio('agent-001').balances.USD).toBe(10000);
    });
  });

  describe('Insufficient balance', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', { USD: 100 }); // very small balance
    });

    it('should reject BUY when USD balance is insufficient', async () => {
      const result = await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '1' }), // $65000
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(result.status).toBe('rejected');
      expect(result.success).toBe(false);
    });
  });

  describe('Trade history', () => {
    beforeEach(async () => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices()
      );
    });

    it('should record trade in history', () => {
      const history = engine.getTradeHistory('agent-001');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('BUY');
    });

    it('should return empty history for agent with no trades', () => {
      expect(engine.getTradeHistory('no-trades-agent')).toEqual([]);
    });

    it('should support limit parameter', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'ETH', amount: '0.1' }),
        'agent-001',
        makePrices()
      );
      expect(engine.getTradeHistory('agent-001', 1)).toHaveLength(1);
    });

    it('should return all trades via getAllTrades()', async () => {
      engine.initPortfolio('agent-002', TEST_INITIAL_BALANCES);
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'ETH', amount: '0.1' }),
        'agent-002',
        makePrices()
      );
      expect(engine.getAllTrades()).toHaveLength(2);
    });
  });

  describe('PnL calculation', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', { USD: 10000, BTC: 0, ETH: 0 });
    });

    it('should return zero PnL for fresh portfolio with no trades', () => {
      const pnl = engine.calculatePnL('agent-001', makePrices());
      expect(pnl.realizedPnl).toBe(0);
      expect(pnl.unrealizedPnl).toBe(0);
      expect(pnl.totalPnl).toBe(0);
      expect(pnl.totalTrades).toBe(0);
    });

    it('should calculate unrealized PnL after a BUY when price increases', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        { BTC: 65000 }
      );
      // BTC price goes up to $66000
      const pnl = engine.calculatePnL('agent-001', { BTC: 66000 });
      expect(pnl.unrealizedPnl).toBeCloseTo(10, 2); // 0.01 × ($66000 - $65000)
      expect(pnl.roiPercent).toBeGreaterThan(0);
    });

    it('should calculate unrealized loss when price decreases', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        { BTC: 65000 }
      );
      // Price drops
      const pnl = engine.calculatePnL('agent-001', { BTC: 60000 });
      expect(pnl.unrealizedPnl).toBeCloseTo(-50, 2); // 0.01 × ($60000 - $65000)
      expect(pnl.totalPnl).toBeLessThan(0);
    });

    it('should calculate realized PnL after BUY + SELL at higher price', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 60000 }
      );
      await engine.processSignal(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 65000 }
      );
      const pnl = engine.calculatePnL('agent-001', { BTC: 65000 });
      // Bought 0.1 BTC at $60000 = $6000 cost
      // Sold 0.1 BTC at $65000 = $6500 proceeds
      // Realized PnL = $500
      expect(pnl.realizedPnl).toBeCloseTo(500, 1);
      expect(pnl.totalTrades).toBe(2);
      expect(pnl.winningTrades).toBe(1);
    });

    it('should calculate realized loss after BUY + SELL at lower price', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 65000 }
      );
      await engine.processSignal(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 60000 }
      );
      const pnl = engine.calculatePnL('agent-001', { BTC: 60000 });
      expect(pnl.realizedPnl).toBeCloseTo(-500, 1);
      expect(pnl.losingTrades).toBe(1);
    });

    it('should include portfolioValueUsd in PnL summary', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        { BTC: 65000 }
      );
      const pnl = engine.calculatePnL('agent-001', { BTC: 65000 });
      // USD: ~9350, BTC: 0.01 × 65000 = 650 → total ≈ 10000
      expect(pnl.portfolioValueUsd).toBeCloseTo(10000, 0);
    });

    it('should use BASELINE_PRICES when no current prices provided', async () => {
      await engine.processSignal(makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }), 'agent-001', {});
      const pnl = engine.calculatePnL('agent-001'); // no prices argument
      expect(pnl.portfolioValueUsd).toBeGreaterThan(0);
    });

    it('should include ROI in PnL summary', () => {
      const pnl = engine.calculatePnL('agent-001', makePrices());
      expect(typeof pnl.roiPercent).toBe('number');
      expect(pnl.roiPercent).toBe(0);
    });

    it('should include win rate in PnL summary', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 60000 }
      );
      await engine.processSignal(
        makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.1' }),
        'agent-001',
        { BTC: 65000 }
      );
      const pnl = engine.calculatePnL('agent-001', { BTC: 65000 });
      // 2 total trades (1 BUY + 1 SELL), 1 winning SELL → 50% win rate
      expect(pnl.winRatePercent).toBeCloseTo(50, 0);
      expect(pnl.winningTrades).toBe(1);
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
    });

    it('should increment totalSignalsProcessed for any signal', async () => {
      await engine.processSignal(makeSignal({ action: 'HOLD' }), 'agent-001', makePrices());
      const metrics = engine.getMetrics();
      expect(metrics.totalSignalsProcessed).toBe(1);
    });

    it('should increment totalTradesExecuted after a successful trade', async () => {
      await engine.processSignal(makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }), 'agent-001', makePrices());
      expect(engine.getMetrics().totalTradesExecuted).toBe(1);
    });

    it('should increment totalSkipped for HOLD', async () => {
      await engine.processSignal(makeSignal({ action: 'HOLD' }), 'agent-001', makePrices());
      expect(engine.getMetrics().totalSkipped).toBe(1);
    });

    it('should increment totalRejected for rejected signals', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '100' }), // way over budget
        'agent-001',
        makePrices()
      );
      expect(engine.getMetrics().totalRejected).toBe(1);
    });

    it('should track totalBuyTrades and totalSellTrades', async () => {
      await engine.processSignal(makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }), 'agent-001', makePrices());
      await engine.processSignal(makeSignal({ action: 'SELL', asset: 'BTC', amount: '0.005' }), 'agent-001', makePrices());
      const metrics = engine.getMetrics();
      expect(metrics.totalBuyTrades).toBe(1);
      expect(metrics.totalSellTrades).toBe(1);
    });

    it('should accumulate totalVolumeUsd', async () => {
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices({ BTC: 65000 })
      );
      expect(engine.getMetrics().totalVolumeUsd).toBeCloseTo(650, 2);
    });

    it('should report activePortfolios', () => {
      expect(engine.getMetrics().activePortfolios).toBe(1);
    });
  });

  describe('Events', () => {
    beforeEach(() => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
    });

    it('should emit engine.started event on start()', () => {
      const newEngine = createTradingEngine();
      const events: TradingEngineEvent[] = [];
      newEngine.subscribe((e) => events.push(e));
      newEngine.start();
      expect(events.some((e) => e.type === 'engine.started')).toBe(true);
    });

    it('should emit engine.stopped event on stop()', () => {
      const events: TradingEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine.stop();
      expect(events.some((e) => e.type === 'engine.stopped')).toBe(true);
    });

    it('should emit trade.executed event after successful trade', async () => {
      const events: TradingEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }),
        'agent-001',
        makePrices()
      );
      expect(events.some((e) => e.type === 'trade.executed')).toBe(true);
    });

    it('should emit trade.rejected event when trade is rejected', async () => {
      const events: TradingEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '100' }),
        'agent-001',
        makePrices()
      );
      expect(events.some((e) => e.type === 'trade.rejected')).toBe(true);
    });

    it('should emit trade.skipped event for HOLD', async () => {
      const events: TradingEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      await engine.processSignal(makeSignal({ action: 'HOLD' }), 'agent-001', makePrices());
      expect(events.some((e) => e.type === 'trade.skipped')).toBe(true);
    });

    it('should return unsubscribe function', () => {
      const events: TradingEngineEvent[] = [];
      const unsub = engine.subscribe((e) => events.push(e));
      engine.stop();
      unsub();
      engine.start();
      // After unsubscribe, engine.started should not be collected
      const startedCount = events.filter((e) => e.type === 'engine.started').length;
      expect(startedCount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should use BASELINE_PRICES as fallback when no prices provided', async () => {
      engine.initPortfolio('agent-001', TEST_INITIAL_BALANCES);
      const result = await engine.processSignal(
        makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.001' }),
        'agent-001'
        // no prices argument
      );
      // BTC baseline is 65000, 0.001 BTC = $65 which is > min trade value
      expect(result.status).toBe('executed');
    });

    it('should allow customizing config', () => {
      const customEngine = createTradingEngine({
        feeRate: 0.001,
        minTradeValueUsd: 100,
      });
      expect(customEngine).toBeInstanceOf(TradingEngine);
    });

    it('should process signals for multiple agents independently', async () => {
      engine.initPortfolio('agent-001', { USD: 10000 });
      engine.initPortfolio('agent-002', { USD: 5000 });
      await engine.processSignal(makeSignal({ action: 'BUY', asset: 'BTC', amount: '0.01' }), 'agent-001', makePrices({ BTC: 65000 }));
      // agent-002 USD should not be affected by agent-001's trade
      expect(engine.getPortfolio('agent-002').balances.USD).toBe(5000);
    });
  });
});

// ============================================================================
// Integration: Strategy Engine → Trading Engine
// ============================================================================

describe('Integration: Strategy Engine signal → Trading Engine execution', () => {
  it('should process a real TradeSignal from strategy-engine types', async () => {
    const engine = createTradingEngine();
    engine.start();
    engine.initPortfolio('agent-001', { USD: 10000, BTC: 0, ETH: 0 });

    // Simulate a signal as would be produced by StrategyExecutionEngine
    const signal: TradeSignal = {
      action: 'BUY',
      asset: 'ETH',
      amount: '0.5',
      confidence: 0.75,
      reason: 'Trend upward detected',
      strategyId: 'trend',
      generatedAt: new Date(),
      metadata: { indicator: 'SMA', value: 3450 },
    };

    const result = await engine.processSignal(signal, 'agent-001', { ETH: 3500 });

    expect(result.success).toBe(true);
    expect(result.status).toBe('executed');
    expect(result.trade?.asset).toBe('ETH');
    expect(result.trade?.value).toBeCloseTo(1750, 2);

    // Portfolio check
    const portfolio = engine.getPortfolio('agent-001');
    expect(portfolio.balances.ETH).toBeCloseTo(0.5, 8);
    expect(portfolio.balances.USD).toBeCloseTo(8250, 2);

    // Trade history check
    const history = engine.getTradeHistory('agent-001');
    expect(history).toHaveLength(1);
    expect(history[0].strategyId).toBe('trend');

    // PnL (no price change → no unrealized PnL)
    const pnl = engine.calculatePnL('agent-001', { ETH: 3500 });
    expect(pnl.unrealizedPnl).toBeCloseTo(0, 1);
    expect(pnl.totalTrades).toBe(1);
  });

  it('should handle full BUY then SELL cycle with profit', async () => {
    const engine = createTradingEngine();
    engine.start();
    engine.initPortfolio('agent-001', { USD: 10000, BTC: 0 });

    // BUY
    await engine.processSignal(
      { action: 'BUY', asset: 'BTC', amount: '0.1', confidence: 0.9, reason: 'buy', strategyId: 'trend', generatedAt: new Date() },
      'agent-001',
      { BTC: 50000 }
    );

    // SELL at higher price
    await engine.processSignal(
      { action: 'SELL', asset: 'BTC', amount: '0.1', confidence: 0.9, reason: 'sell', strategyId: 'trend', generatedAt: new Date() },
      'agent-001',
      { BTC: 60000 }
    );

    const pnl = engine.calculatePnL('agent-001', { BTC: 60000 });
    // Bought 0.1 BTC at $50000 = $5000
    // Sold 0.1 BTC at $60000 = $6000
    // Realized PnL = $1000
    expect(pnl.realizedPnl).toBeCloseTo(1000, 1);
    expect(pnl.roiPercent).toBeCloseTo(10, 1); // 1000/10000 × 100
    expect(pnl.winningTrades).toBe(1);
    // 2 total trades (BUY + SELL), 1 winning SELL → 50% win rate
    expect(pnl.winRatePercent).toBeCloseTo(50, 0);
  });
});
