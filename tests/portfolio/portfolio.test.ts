/**
 * Tests for the Portfolio Engine (Issue #214)
 *
 * Covers:
 * - PortfolioStorage: create, update, query portfolios, positions, trades, balances
 * - PortfolioEngine: portfolio lifecycle, trade execution, position tracking, metrics
 * - PortfolioApi: all REST endpoints, error handling, routing
 * - Event system: portfolio, trade, position events
 * - PortfolioError: instanceof, code, metadata
 * - Factory functions: createPortfolioEngine, createPortfolioApi, createDemoPortfolioStorage
 *
 * Test cases from Issue #214:
 * - Multiple trades updating positions
 * - Closing positions
 * - Large trade history datasets
 * - Multiple agents trading simultaneously
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  PortfolioStorage,
  PortfolioEngine,
  PortfolioApi,
  PortfolioError,
  createPortfolioStorage,
  createPortfolioEngine,
  createPortfolioApi,
  createDemoPortfolioStorage,
  createDemoPortfolioEngine,
  createDemoPortfolioApi,
  DEFAULT_PORTFOLIO_ENGINE_CONFIG,
} from '../../core/portfolio/base';

import type {
  Portfolio,
  Position,
  Trade,
  BalanceRecord,
  PortfolioEvent,
  PortfolioApiRequest,
} from '../../core/portfolio/base';

// ============================================================================
// Test Helpers
// ============================================================================

function makeRequest(
  method: PortfolioApiRequest['method'],
  path: string,
  body?: unknown,
  query?: Record<string, string>
): PortfolioApiRequest {
  return { method, path, body, query };
}

// ============================================================================
// DEFAULT_PORTFOLIO_ENGINE_CONFIG
// ============================================================================

describe('DEFAULT_PORTFOLIO_ENGINE_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_PORTFOLIO_ENGINE_CONFIG.enabled).toBe(true);
  });

  it('should have USDT as base currency', () => {
    expect(DEFAULT_PORTFOLIO_ENGINE_CONFIG.baseCurrency).toBe('USDT');
  });

  it('should have a positive initial balance', () => {
    expect(DEFAULT_PORTFOLIO_ENGINE_CONFIG.initialBalance).toBeGreaterThan(0);
  });

  it('should have events enabled', () => {
    expect(DEFAULT_PORTFOLIO_ENGINE_CONFIG.enableEvents).toBe(true);
  });
});

// ============================================================================
// PortfolioStorage
// ============================================================================

describe('PortfolioStorage', () => {
  let storage: PortfolioStorage;

  beforeEach(() => {
    storage = createPortfolioStorage();
  });

  describe('Portfolio Operations', () => {
    it('should create a new portfolio', () => {
      const portfolio = storage.createPortfolio('agent_001');
      expect(portfolio.agentId).toBe('agent_001');
      expect(portfolio.portfolioId).toBeTruthy();
      expect(portfolio.totalValue).toBe(DEFAULT_PORTFOLIO_ENGINE_CONFIG.initialBalance);
    });

    it('should throw when creating duplicate portfolio', () => {
      storage.createPortfolio('agent_001');
      expect(() => storage.createPortfolio('agent_001')).toThrow(PortfolioError);
    });

    it('should get portfolio by agent ID', () => {
      storage.createPortfolio('agent_001');
      const portfolio = storage.getPortfolioByAgent('agent_001');
      expect(portfolio).not.toBeNull();
      expect(portfolio?.agentId).toBe('agent_001');
    });

    it('should return null for unknown agent', () => {
      expect(storage.getPortfolioByAgent('unknown')).toBeNull();
    });

    it('should require portfolio by agent (throws on not found)', () => {
      expect(() => storage.requirePortfolioByAgent('unknown')).toThrow(PortfolioError);
      try {
        storage.requirePortfolioByAgent('unknown');
      } catch (e) {
        expect((e as PortfolioError).code).toBe('PORTFOLIO_NOT_FOUND');
      }
    });

    it('should update portfolio', () => {
      const portfolio = storage.createPortfolio('agent_001');
      const updated = storage.updatePortfolio(portfolio.portfolioId, { totalValue: 15000 });
      expect(updated.totalValue).toBe(15000);
    });

    it('should list all portfolios', () => {
      storage.createPortfolio('agent_001');
      storage.createPortfolio('agent_002');
      const portfolios = storage.listPortfolios();
      expect(portfolios).toHaveLength(2);
    });
  });

  describe('Position Operations', () => {
    it('should save and retrieve position', () => {
      const position: Position = {
        positionId: 'pos_001',
        agentId: 'agent_001',
        asset: 'TON',
        size: 100,
        avgEntryPrice: 5.0,
        currentPrice: 5.5,
        unrealizedPnl: 50,
        costBasis: 500,
        status: 'open',
        openedAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      };

      storage.savePosition(position);
      const retrieved = storage.getPosition('pos_001');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.asset).toBe('TON');
    });

    it('should get position by agent and asset', () => {
      const position: Position = {
        positionId: 'pos_001',
        agentId: 'agent_001',
        asset: 'TON',
        size: 100,
        avgEntryPrice: 5.0,
        currentPrice: 5.5,
        unrealizedPnl: 50,
        costBasis: 500,
        status: 'open',
        openedAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      };

      storage.savePosition(position);
      const found = storage.getPositionByAgentAndAsset('agent_001', 'TON');
      expect(found).not.toBeNull();
      expect(found?.positionId).toBe('pos_001');
    });

    it('should close position', () => {
      const position: Position = {
        positionId: 'pos_001',
        agentId: 'agent_001',
        asset: 'TON',
        size: 100,
        avgEntryPrice: 5.0,
        currentPrice: 5.5,
        unrealizedPnl: 50,
        costBasis: 500,
        status: 'open',
        openedAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      };

      storage.savePosition(position);
      const closed = storage.closePosition('pos_001');
      expect(closed.status).toBe('closed');
      expect(closed.size).toBe(0);
      expect(closed.closedAt).not.toBeNull();
    });
  });

  describe('Trade Operations', () => {
    it('should save and retrieve trade', () => {
      const trade: Trade = {
        tradeId: 'trade_001',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        price: 5.0,
        quantity: 100,
        value: 500,
        fee: 0.5,
        realizedPnl: 0,
        strategyId: 'test_strategy',
        timestamp: new Date(),
      };

      storage.saveTrade(trade);
      const retrieved = storage.getTrade('trade_001');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.pair).toBe('TON/USDT');
    });

    it('should get trades by agent', () => {
      const trade1: Trade = {
        tradeId: 'trade_001',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        price: 5.0,
        quantity: 100,
        value: 500,
        fee: 0.5,
        realizedPnl: 0,
        strategyId: null,
        timestamp: new Date(Date.now() - 1000),
      };

      const trade2: Trade = {
        tradeId: 'trade_002',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        price: 5.5,
        quantity: 50,
        value: 275,
        fee: 0.275,
        realizedPnl: 25,
        strategyId: null,
        timestamp: new Date(),
      };

      storage.saveTrade(trade1);
      storage.saveTrade(trade2);

      const trades = storage.getTradesByAgent('agent_001');
      expect(trades).toHaveLength(2);
      // Should be sorted by timestamp descending
      expect(trades[0].tradeId).toBe('trade_002');
    });

    it('should filter trades', () => {
      const trade1: Trade = {
        tradeId: 'trade_001',
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        price: 5.0,
        quantity: 100,
        value: 500,
        fee: 0.5,
        realizedPnl: 0,
        strategyId: null,
        timestamp: new Date(),
      };

      const trade2: Trade = {
        tradeId: 'trade_002',
        agentId: 'agent_001',
        pair: 'BTC/USDT',
        side: 'BUY',
        price: 50000,
        quantity: 0.01,
        value: 500,
        fee: 0.5,
        realizedPnl: 0,
        strategyId: null,
        timestamp: new Date(),
      };

      storage.saveTrade(trade1);
      storage.saveTrade(trade2);

      const filteredByPair = storage.getTrades({ pair: 'TON/USDT' });
      expect(filteredByPair).toHaveLength(1);
      expect(filteredByPair[0].pair).toBe('TON/USDT');
    });
  });

  describe('Balance Operations', () => {
    it('should save and retrieve balance', () => {
      const balance: BalanceRecord = {
        agentId: 'agent_001',
        asset: 'USDT',
        balance: 10000,
        available: 10000,
        reserved: 0,
        updatedAt: new Date(),
      };

      storage.saveBalance(balance);
      const retrieved = storage.getBalance('agent_001', 'USDT');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.balance).toBe(10000);
    });

    it('should update balance by delta', () => {
      storage.saveBalance({
        agentId: 'agent_001',
        asset: 'USDT',
        balance: 10000,
        available: 10000,
        reserved: 0,
        updatedAt: new Date(),
      });

      const updated = storage.updateBalance('agent_001', 'USDT', -500);
      expect(updated.balance).toBe(9500);
      expect(updated.available).toBe(9500);
    });

    it('should throw on insufficient balance', () => {
      storage.saveBalance({
        agentId: 'agent_001',
        asset: 'USDT',
        balance: 100,
        available: 100,
        reserved: 0,
        updatedAt: new Date(),
      });

      expect(() => storage.updateBalance('agent_001', 'USDT', -200)).toThrow(PortfolioError);
    });

    it('should get all balances by agent', () => {
      storage.saveBalance({
        agentId: 'agent_001',
        asset: 'USDT',
        balance: 10000,
        available: 10000,
        reserved: 0,
        updatedAt: new Date(),
      });

      storage.saveBalance({
        agentId: 'agent_001',
        asset: 'TON',
        balance: 100,
        available: 100,
        reserved: 0,
        updatedAt: new Date(),
      });

      const balances = storage.getBalancesByAgent('agent_001');
      expect(balances).toHaveLength(2);
    });
  });
});

// ============================================================================
// PortfolioEngine
// ============================================================================

describe('PortfolioEngine', () => {
  let engine: PortfolioEngine;

  beforeEach(() => {
    engine = createPortfolioEngine();
  });

  describe('Portfolio Operations', () => {
    it('should get or create portfolio', () => {
      const portfolio = engine.getOrCreatePortfolio('agent_001');
      expect(portfolio.agentId).toBe('agent_001');

      // Second call should return same portfolio
      const portfolio2 = engine.getOrCreatePortfolio('agent_001');
      expect(portfolio2.portfolioId).toBe(portfolio.portfolioId);
    });

    it('should throw INVALID_AGENT_ID for empty agent ID', () => {
      expect(() => engine.getOrCreatePortfolio('')).toThrow(PortfolioError);
      try {
        engine.getOrCreatePortfolio('');
      } catch (e) {
        expect((e as PortfolioError).code).toBe('INVALID_AGENT_ID');
      }
    });

    it('should get portfolio summary', () => {
      engine.getOrCreatePortfolio('agent_001');
      const summary = engine.getPortfolioSummary('agent_001');

      expect(summary.portfolio).toBeDefined();
      expect(summary.positions).toBeDefined();
      expect(summary.balances).toBeDefined();
      expect(summary.metrics).toBeDefined();
    });
  });

  describe('Trade Execution', () => {
    it('should execute BUY trade', () => {
      engine.getOrCreatePortfolio('agent_001');

      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
      expect(result.trade?.side).toBe('BUY');
      expect(result.trade?.quantity).toBe(100);
      expect(result.position).toBeDefined();
      expect(result.position?.size).toBe(100);
    });

    it('should execute SELL trade', () => {
      engine.getOrCreatePortfolio('agent_001');

      // First buy
      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      // Then sell
      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 50,
        price: 5.5,
      });

      expect(result.success).toBe(true);
      expect(result.trade?.side).toBe('SELL');
      expect(result.trade?.realizedPnl).toBe(25); // (5.5 - 5.0) * 50
    });

    it('should reject trade with insufficient balance', () => {
      engine.getOrCreatePortfolio('agent_001');

      // Try to buy more than available
      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 10000,
        price: 5.0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });

    it('should average into existing position', () => {
      engine.getOrCreatePortfolio('agent_001');

      // First buy at 5.0
      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      // Second buy at 6.0
      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 6.0,
      });

      expect(result.position?.size).toBe(200);
      expect(result.position?.avgEntryPrice).toBe(5.5); // (5.0 * 100 + 6.0 * 100) / 200
    });

    it('should close position when selling all', () => {
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 100,
        price: 5.5,
      });

      expect(result.position?.status).toBe('closed');
    });
  });

  describe('Position Management', () => {
    it('should get positions', () => {
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const positions = engine.getPositions('agent_001');
      expect(positions).toHaveLength(1);
      expect(positions[0].asset).toBe('TON');
    });
  });

  describe('Trade History', () => {
    it('should get trade history', () => {
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 50,
        price: 5.5,
      });

      const trades = engine.getTradeHistory('agent_001');
      expect(trades).toHaveLength(2);
    });

    it('should respect trade history limit', () => {
      engine.getOrCreatePortfolio('agent_001');

      // Execute many trades
      for (let i = 0; i < 5; i++) {
        engine.executeTrade({
          agentId: 'agent_001',
          pair: 'TON/USDT',
          side: 'BUY',
          quantity: 10,
          price: 5.0,
        });
      }

      const trades = engine.getTradeHistory('agent_001', 3);
      expect(trades).toHaveLength(3);
    });
  });

  describe('Balance Management', () => {
    it('should get balances', () => {
      engine.getOrCreatePortfolio('agent_001');
      const balances = engine.getBalances('agent_001');
      expect(balances.length).toBeGreaterThan(0);
    });

    it('should get balances as map', () => {
      engine.getOrCreatePortfolio('agent_001');
      const balancesMap = engine.getBalancesMap('agent_001');
      expect(balancesMap['USDT']).toBe(DEFAULT_PORTFOLIO_ENGINE_CONFIG.initialBalance);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate metrics', () => {
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 50,
        price: 5.5,
      });

      const metrics = engine.calculateMetrics('agent_001');

      expect(metrics.agentId).toBe('agent_001');
      expect(metrics.totalTrades).toBe(2);
      expect(metrics.realizedPnl).toBe(25);
      expect(metrics.winningTrades).toBe(1);
    });
  });

  describe('Event System', () => {
    it('should emit portfolio.created event', () => {
      const events: PortfolioEvent[] = [];
      engine.subscribe(e => events.push(e));

      engine.getOrCreatePortfolio('agent_001');

      const createEvent = events.find(e => e.type === 'portfolio.created');
      expect(createEvent).toBeDefined();
      expect(createEvent?.agentId).toBe('agent_001');
    });

    it('should emit trade.executed event', () => {
      const events: PortfolioEvent[] = [];
      engine.getOrCreatePortfolio('agent_001');
      engine.subscribe(e => events.push(e));

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const tradeEvent = events.find(e => e.type === 'trade.executed');
      expect(tradeEvent).toBeDefined();
    });

    it('should emit position.opened event', () => {
      const events: PortfolioEvent[] = [];
      engine.getOrCreatePortfolio('agent_001');
      engine.subscribe(e => events.push(e));

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const positionEvent = events.find(e => e.type === 'position.opened');
      expect(positionEvent).toBeDefined();
    });

    it('should stop emitting after unsubscribe', () => {
      const events: PortfolioEvent[] = [];
      const unsub = engine.subscribe(e => events.push(e));
      unsub();

      engine.getOrCreatePortfolio('agent_001');

      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// PortfolioApi
// ============================================================================

describe('PortfolioApi', () => {
  let api: PortfolioApi;

  beforeEach(() => {
    api = createDemoPortfolioApi();
  });

  describe('GET /api/portfolio/:agentId', () => {
    it('should return portfolio overview', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/agent_001'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('portfolioValue');
      expect(res.body.data).toHaveProperty('positions');
      expect(res.body.data).toHaveProperty('balances');
    });

    it('should return 404 for unknown agent', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/unknown_agent'));

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/portfolio/:agentId/trades', () => {
    it('should return trade history', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/agent_001/trades'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trades');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const res = await api.handle(
        makeRequest('GET', '/api/portfolio/agent_001/trades', undefined, { limit: '1', offset: '0' })
      );

      expect(res.statusCode).toBe(200);
      const data = res.body.data as { trades: Trade[]; limit: number };
      expect(data.limit).toBe(1);
    });
  });

  describe('GET /api/portfolio/:agentId/positions', () => {
    it('should return positions', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/agent_001/positions'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('positions');
      expect(res.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/portfolio/:agentId/balances', () => {
    it('should return balances', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/agent_001/balances'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/portfolio/:agentId/metrics', () => {
    it('should return metrics', async () => {
      const res = await api.handle(makeRequest('GET', '/api/portfolio/agent_001/metrics'));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('portfolioValue');
      expect(res.body.data).toHaveProperty('totalPnl');
    });
  });

  describe('POST /api/portfolio/:agentId/trades', () => {
    it('should execute trade', async () => {
      const res = await api.handle(
        makeRequest('POST', '/api/portfolio/agent_001/trades', {
          pair: 'BTC/USDT',
          side: 'BUY',
          quantity: 0.01,
          price: 50000,
        })
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('trade');
    });

    it('should reject invalid trade request', async () => {
      const res = await api.handle(
        makeRequest('POST', '/api/portfolio/agent_001/trades', {
          pair: 'TON/USDT',
          side: 'INVALID',
          quantity: 100,
          price: 5.0,
        })
      );

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('should reject trade with insufficient balance', async () => {
      const res = await api.handle(
        makeRequest('POST', '/api/portfolio/agent_001/trades', {
          pair: 'TON/USDT',
          side: 'BUY',
          quantity: 1000000,
          price: 5.0,
        })
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown path', async () => {
      const res = await api.handle(makeRequest('GET', '/api/unknown'));

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for DELETE method', async () => {
      const res = await api.handle(makeRequest('DELETE', '/api/portfolio/agent_001'));

      expect(res.statusCode).toBe(404);
    });
  });
});

// ============================================================================
// PortfolioError
// ============================================================================

describe('PortfolioError', () => {
  it('should be instanceof PortfolioError and Error', () => {
    const err = new PortfolioError('test', 'PORTFOLIO_NOT_FOUND');
    expect(err).toBeInstanceOf(PortfolioError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should expose code and message', () => {
    const err = new PortfolioError('oops', 'INSUFFICIENT_BALANCE', { asset: 'USDT' });
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
    expect(err.message).toBe('oops');
    expect(err.metadata).toEqual({ asset: 'USDT' });
  });

  it('should have name PortfolioError', () => {
    const err = new PortfolioError('x', 'OPERATION_FAILED');
    expect(err.name).toBe('PortfolioError');
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('Factory Functions', () => {
  describe('createPortfolioEngine', () => {
    it('should create an engine with default storage', () => {
      const engine = createPortfolioEngine();
      expect(engine).toBeInstanceOf(PortfolioEngine);
    });

    it('should accept custom config', () => {
      const engine = createPortfolioEngine(undefined, { initialBalance: 50000 });
      engine.getOrCreatePortfolio('agent_001');
      const balances = engine.getBalancesMap('agent_001');
      expect(balances['USDT']).toBe(50000);
    });
  });

  describe('createDemoPortfolioEngine', () => {
    it('should create engine with demo data', () => {
      const engine = createDemoPortfolioEngine();
      const portfolio = engine.getPortfolio('agent_001');
      expect(portfolio).toBeDefined();
    });
  });

  describe('createPortfolioApi', () => {
    it('should create API with default engine', () => {
      const api = createPortfolioApi();
      expect(api).toBeInstanceOf(PortfolioApi);
    });

    it('should expose its engine via getEngine()', () => {
      const api = createPortfolioApi();
      expect(api.getEngine()).toBeInstanceOf(PortfolioEngine);
    });
  });

  describe('createDemoPortfolioStorage', () => {
    it('should return storage with pre-populated demo data', () => {
      const storage = createDemoPortfolioStorage();
      const stats = storage.getStats();
      expect(stats.portfolios).toBeGreaterThan(0);
      expect(stats.positions).toBeGreaterThan(0);
      expect(stats.trades).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Issue #214 Test Cases
// ============================================================================

describe('Issue #214 Test Cases', () => {
  describe('Multiple trades updating positions', () => {
    it('should correctly average position on multiple buys', () => {
      const engine = createPortfolioEngine();
      engine.getOrCreatePortfolio('agent_001');

      // Buy at different prices
      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 200,
        price: 6.0,
      });

      const positions = engine.getPositions('agent_001');
      expect(positions[0].size).toBe(300);
      // Average: (100 * 5.0 + 200 * 6.0) / 300 = 1700 / 300 = 5.666...
      expect(positions[0].avgEntryPrice).toBeCloseTo(5.67, 1);
    });
  });

  describe('Closing positions', () => {
    it('should close position completely on full sell', () => {
      const engine = createPortfolioEngine();
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 100,
        price: 6.0,
      });

      expect(result.position?.status).toBe('closed');
      expect(result.trade?.realizedPnl).toBe(100); // (6.0 - 5.0) * 100
    });

    it('should partially close position', () => {
      const engine = createPortfolioEngine();
      engine.getOrCreatePortfolio('agent_001');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      const result = engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 50,
        price: 6.0,
      });

      expect(result.position?.status).toBe('partially_closed');
      expect(result.position?.size).toBe(50);
    });
  });

  describe('Large trade history datasets', () => {
    it('should handle 1000+ trades', () => {
      const engine = createPortfolioEngine(undefined, {
        maxTradeHistoryPerAgent: 2000,
        initialBalance: 1000000,
      });
      engine.getOrCreatePortfolio('agent_001');

      // Execute 1000 small trades
      for (let i = 0; i < 1000; i++) {
        engine.executeTrade({
          agentId: 'agent_001',
          pair: 'TON/USDT',
          side: 'BUY',
          quantity: 1,
          price: 5.0,
        });
      }

      const trades = engine.getTradeHistory('agent_001');
      expect(trades.length).toBe(1000);
    });
  });

  describe('Multiple agents trading simultaneously', () => {
    it('should isolate portfolios between agents', () => {
      const engine = createPortfolioEngine();

      engine.getOrCreatePortfolio('agent_001');
      engine.getOrCreatePortfolio('agent_002');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      engine.executeTrade({
        agentId: 'agent_002',
        pair: 'BTC/USDT',
        side: 'BUY',
        quantity: 0.01,
        price: 50000,
      });

      const positions1 = engine.getPositions('agent_001');
      const positions2 = engine.getPositions('agent_002');

      expect(positions1).toHaveLength(1);
      expect(positions1[0].asset).toBe('TON');

      expect(positions2).toHaveLength(1);
      expect(positions2[0].asset).toBe('BTC');
    });

    it('should calculate metrics independently per agent', () => {
      const engine = createPortfolioEngine();

      engine.getOrCreatePortfolio('agent_001');
      engine.getOrCreatePortfolio('agent_002');

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'BUY',
        quantity: 100,
        price: 5.0,
      });

      engine.executeTrade({
        agentId: 'agent_001',
        pair: 'TON/USDT',
        side: 'SELL',
        quantity: 100,
        price: 6.0,
      });

      const metrics1 = engine.calculateMetrics('agent_001');
      const metrics2 = engine.calculateMetrics('agent_002');

      expect(metrics1.totalTrades).toBe(2);
      expect(metrics1.realizedPnl).toBe(100);

      expect(metrics2.totalTrades).toBe(0);
      expect(metrics2.realizedPnl).toBe(0);
    });
  });
});
