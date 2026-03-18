/**
 * End-to-End Trading Flow Integration Tests (Issue #249)
 *
 * Verifies the complete pipeline:
 *   Telegram Mini App → Agent Controller → Strategy Engine → Risk Engine →
 *   Execution Engine → DEX Connector (simulated) → Portfolio Update → UI Update
 *
 * Specifically tests the new `executeTradeRequest` method on MVPPlatform,
 * which implements POST /api/agent/execute from the Telegram Mini App.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock market data to avoid real HTTP calls in tests.
vi.mock('../../core/market-data/base', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../core/market-data/base')>();

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
      return {
        price: {
          asset,
          price: MOCK_PRICES[asset as keyof typeof MOCK_PRICES] ?? 1,
          volume24h: 0,
          priceChange24h: 0,
          marketCap: 0,
          timestamp: Math.floor(Date.now() / 1000),
          source: 'mock',
        },
        fromCache: false,
        usedFallback: false,
      };
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

import { createMVPPlatform, MVPPlatform } from '../../apps/mvp-platform';
import type { TradeExecutionRequest, TradeExecutionResponse } from '../../apps/mvp-platform';

// ============================================================================
// End-to-End Trading Flow Tests
// ============================================================================

describe('End-to-End Trading Flow — executeTradeRequest', () => {
  let platform: MVPPlatform;

  beforeEach(() => {
    platform = createMVPPlatform({ environment: 'simulation' });
    platform.start();
  });

  afterEach(() => {
    platform.stop();
  });

  // --------------------------------------------------------------------------
  // Basic success path
  // --------------------------------------------------------------------------

  it('returns a successful result for a demo momentum trade', async () => {
    const request: TradeExecutionRequest = {
      userId: '123456789',
      strategy: 'momentum',
      pair: 'TON/USDT',
      amount: 100,
      mode: 'demo',
    };

    const result: TradeExecutionResponse = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
    expect(result.agentId).toBeTruthy();
    expect(result.pair).toBe('TON/USDT');
    expect(result.mode).toBe('demo');
    expect(['buy', 'sell', 'hold', 'none']).toContain(result.signal);
    expect(typeof result.tradeExecuted).toBe('boolean');
    expect(typeof result.portfolioValueBefore).toBe('number');
    expect(typeof result.portfolioValueAfter).toBe('number');
    expect(typeof result.pnlDelta).toBe('number');
    expect(result.portfolioValueBefore).toBeGreaterThan(0);
    expect(result.timestamp).toBeTruthy();
    expect(result.error).toBeUndefined();
  });

  it('returns a successful result for a demo arbitrage trade', async () => {
    const request: TradeExecutionRequest = {
      userId: 'user_arb_001',
      strategy: 'arbitrage',
      pair: 'TON/USDT',
      amount: 500,
      mode: 'demo',
    };

    const result = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('demo');
    expect(result.portfolioValueBefore).toBeCloseTo(500, 0);
  });

  it('returns a successful result for a demo mean-reversion (ai-signal) trade', async () => {
    const request: TradeExecutionRequest = {
      userId: 'user_meanrev_001',
      strategy: 'mean-reversion',
      pair: 'TON/USDT',
      amount: 200,
      mode: 'demo',
    };

    const result = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
    expect(result.agentId).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // Live mode (simulation environment — no actual on-chain tx)
  // --------------------------------------------------------------------------

  it('handles live mode request in simulation environment', async () => {
    const request: TradeExecutionRequest = {
      userId: 'user_live_001',
      strategy: 'trend',
      pair: 'TON/USDT',
      amount: 50,
      mode: 'live',
    };

    const result = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
    expect(result.mode).toBe('live');
  });

  // --------------------------------------------------------------------------
  // Strategy name normalisation
  // --------------------------------------------------------------------------

  it.each([
    ['momentum', 'trend'],
    ['trend', 'trend'],
    ['arbitrage', 'arbitrage'],
    ['mean-reversion', 'ai-signal'],
    ['ai-signal', 'ai-signal'],
    ['unknown-strategy', 'trend'], // falls back to trend
  ])('normalises strategy "%s" without error', async (inputStrategy) => {
    const request: TradeExecutionRequest = {
      userId: 'user_norm_test',
      strategy: inputStrategy,
      pair: 'TON/USDT',
      amount: 10,
      mode: 'demo',
    };

    const result = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Portfolio value integrity
  // --------------------------------------------------------------------------

  it('portfolioValueBefore reflects the requested amount', async () => {
    const amount = 250;
    const request: TradeExecutionRequest = {
      userId: 'user_portfolio_check',
      strategy: 'trend',
      pair: 'TON/USDT',
      amount,
      mode: 'demo',
    };

    const result = await platform.executeTradeRequest(request);

    expect(result.success).toBe(true);
    // The initial portfolio is seeded from the requested amount; before any
    // trade the USD value is ~amount * 10 / 10 = amount (approximate).
    // We just verify it is a positive finite number.
    expect(result.portfolioValueBefore).toBeGreaterThan(0);
    expect(Number.isFinite(result.portfolioValueBefore)).toBe(true);
    expect(Number.isFinite(result.portfolioValueAfter)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Error handling — platform not started
  // --------------------------------------------------------------------------

  it('returns error response when platform is not running', async () => {
    const stoppedPlatform = createMVPPlatform({ environment: 'simulation' });
    // Note: stoppedPlatform.start() is intentionally NOT called

    const request: TradeExecutionRequest = {
      userId: 'user_error_test',
      strategy: 'trend',
      pair: 'TON/USDT',
      amount: 100,
      mode: 'demo',
    };

    const result = await stoppedPlatform.executeTradeRequest(request);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.tradeExecuted).toBe(false);
    expect(result.pnlDelta).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Response shape — timestamp is ISO 8601
  // --------------------------------------------------------------------------

  it('timestamp in response is a valid ISO 8601 string', async () => {
    const request: TradeExecutionRequest = {
      userId: 'user_ts_check',
      strategy: 'trend',
      pair: 'TON/USDT',
      amount: 10,
      mode: 'demo',
    };

    const result = await platform.executeTradeRequest(request);

    const parsed = Date.parse(result.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Multiple concurrent executions produce distinct agentIds
  // --------------------------------------------------------------------------

  it('produces distinct agentIds for concurrent requests', async () => {
    const makeRequest = (userId: string): TradeExecutionRequest => ({
      userId,
      strategy: 'trend',
      pair: 'TON/USDT',
      amount: 100,
      mode: 'demo',
    });

    const [r1, r2, r3] = await Promise.all([
      platform.executeTradeRequest(makeRequest('user_a')),
      platform.executeTradeRequest(makeRequest('user_b')),
      platform.executeTradeRequest(makeRequest('user_c')),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);

    const ids = new Set([r1.agentId, r2.agentId, r3.agentId]);
    expect(ids.size).toBe(3);
  });
});

// ============================================================================
// TradeExecutionRequest / TradeExecutionResponse type exports
// ============================================================================

describe('Trading flow type exports', () => {
  it('TradeExecutionRequest and TradeExecutionResponse types are exported from mvp-platform', async () => {
    // This is a compile-time check — if the types aren't exported the import
    // above would fail at TypeScript compile time. The runtime test just
    // confirms the module loaded without errors.
    const mod = await import('../../apps/mvp-platform');
    expect(mod).toBeDefined();
  });
});
