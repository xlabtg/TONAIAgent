/**
 * Tests for TON DEX Market Data Connectors (Issue #211)
 *
 * Covers:
 * - TonDexError: error structure and codes
 * - BaseTonDexProvider: retry logic, token validation
 * - DedustProvider: metadata, pool/price normalization (mocked)
 * - StonfiProvider: metadata, REST API integration (mocked)
 * - ToncoProvider: metadata, concentrated liquidity pools (mocked)
 * - MarketDataAggregator: multi-DEX aggregation, weighting, events
 * - Integration: aggregator + providers + Strategy Engine compatibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  // Error
  TonDexError,
  // Providers
  DedustProvider,
  StonfiProvider,
  ToncoProvider,
  createDedustProvider,
  createStonfiProvider,
  createToncoProvider,
  // Aggregator
  MarketDataAggregator,
  createMarketDataAggregator,
  DEFAULT_AGGREGATOR_CONFIG,
} from '../../src/market-data';
import type {
  TonDexProvider,
  TonDexProviderName,
  DexPriceQuote,
  LiquidityPool,
  SwapEvent,
  TonDexEvent,
  AggregatedPrice,
} from '../../src/market-data';

// ============================================================================
// Test Helpers
// ============================================================================

/** Build a mock DexPriceQuote for testing */
function makeMockQuote(
  dex: TonDexProviderName,
  asset: string,
  priceUsd: number,
  liquidityUsd: number = 100_000
): DexPriceQuote {
  return {
    dex,
    asset,
    priceUsd,
    liquidityUsd,
    volume24hUsd: liquidityUsd / 10,
    confidence: 0.9,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/** Build a mock LiquidityPool for testing */
function makeMockPool(
  dex: TonDexProviderName,
  token0: string,
  token1: string,
  tvlUsd: number = 100_000
): LiquidityPool {
  return {
    poolId: `${dex}-${token0}-${token1}`,
    dex,
    token0: {
      symbol: token0,
      name: `${token0} Token`,
      address: `addr-${token0.toLowerCase()}`,
      decimals: 9,
    },
    token1: {
      symbol: token1,
      name: `${token1} Token`,
      address: `addr-${token1.toLowerCase()}`,
      decimals: 9,
    },
    reserve0: '1000000000000',
    reserve1: '5000000000000',
    tvlUsd,
    feePercent: 0.3,
    volume24hUsd: tvlUsd / 10,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/** Mock TON DEX provider for testing */
class MockTonDexProvider implements TonDexProvider {
  private readonly providerName: TonDexProviderName;
  public shouldFail = false;
  public callCount = 0;
  public priceMultiplier = 1.0;

  constructor(name: TonDexProviderName = 'dedust') {
    this.providerName = name;
  }

  getName(): TonDexProviderName {
    return this.providerName;
  }

  async getSupportedTokens(): Promise<string[]> {
    return ['TON', 'USDT', 'USDC', 'NOT', 'DOGS'];
  }

  async getPrice(token: string): Promise<DexPriceQuote> {
    this.callCount++;
    if (this.shouldFail) {
      throw new TonDexError('Mock provider failure', 'PROVIDER_UNAVAILABLE', this.providerName);
    }
    const basePrices: Record<string, number> = {
      TON: 5.25,
      USDT: 1.0,
      USDC: 1.0,
      NOT: 0.015,
      DOGS: 0.0008,
    };
    const price = (basePrices[token.toUpperCase()] ?? 1.0) * this.priceMultiplier;
    return makeMockQuote(this.providerName, token.toUpperCase(), price);
  }

  async getPools(): Promise<LiquidityPool[]> {
    this.callCount++;
    if (this.shouldFail) {
      throw new TonDexError('Mock provider failure', 'PROVIDER_UNAVAILABLE', this.providerName);
    }
    return [
      makeMockPool(this.providerName, 'TON', 'USDT', 500_000),
      makeMockPool(this.providerName, 'TON', 'USDC', 300_000),
      makeMockPool(this.providerName, 'NOT', 'TON', 100_000),
    ];
  }

  async getPool(poolId: string): Promise<LiquidityPool | null> {
    const pools = await this.getPools();
    return pools.find(p => p.poolId === poolId) ?? null;
  }

  async getPoolsForToken(token: string): Promise<LiquidityPool[]> {
    const pools = await this.getPools();
    const normalized = token.toUpperCase();
    return pools.filter(
      p => p.token0.symbol === normalized || p.token1.symbol === normalized
    );
  }

  async getRecentSwaps(_limit?: number): Promise<SwapEvent[]> {
    return [];
  }

  async getSwapsForPool(_poolId: string, _limit?: number): Promise<SwapEvent[]> {
    return [];
  }

  async getCandles(): Promise<[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }
}

// ============================================================================
// TonDexError Tests
// ============================================================================

describe('TonDexError', () => {
  it('should be an instance of Error', () => {
    const err = new TonDexError('test', 'PROVIDER_UNAVAILABLE');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have name TonDexError', () => {
    const err = new TonDexError('test', 'FETCH_TIMEOUT');
    expect(err.name).toBe('TonDexError');
  });

  it('should carry code, provider, and metadata', () => {
    const err = new TonDexError('not found', 'TOKEN_NOT_SUPPORTED', 'dedust', { token: 'XYZ' });
    expect(err.code).toBe('TOKEN_NOT_SUPPORTED');
    expect(err.message).toBe('not found');
    expect(err.provider).toBe('dedust');
    expect(err.metadata).toEqual({ token: 'XYZ' });
  });

  it('should support all error codes', () => {
    const codes = [
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_RATE_LIMITED',
      'INVALID_RESPONSE',
      'TOKEN_NOT_SUPPORTED',
      'POOL_NOT_FOUND',
      'FETCH_TIMEOUT',
      'RPC_ERROR',
      'AGGREGATION_FAILED',
      'INSUFFICIENT_LIQUIDITY',
    ] as const;

    for (const code of codes) {
      const err = new TonDexError('test', code);
      expect(err.code).toBe(code);
    }
  });
});

// ============================================================================
// DedustProvider Tests
// ============================================================================

describe('DedustProvider', () => {
  it('getName() should return "dedust"', () => {
    const provider = new DedustProvider();
    expect(provider.getName()).toBe('dedust');
  });

  it('createDedustProvider() should return a DedustProvider instance', () => {
    expect(createDedustProvider()).toBeInstanceOf(DedustProvider);
  });

  it('getSupportedTokens() should include TON', async () => {
    const provider = new DedustProvider();
    // Mock fetch to avoid real API calls
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const tokens = await provider.getSupportedTokens();
    expect(tokens).toContain('TON');
  });

  it('healthCheck() should return boolean', async () => {
    const provider = new DedustProvider();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tvlUsd: 1000000, volume24hUsd: 100000, pools: 10, trades24h: 1000 }),
    } as Response);

    const healthy = await provider.healthCheck();
    expect(typeof healthy).toBe('boolean');
  });
});

// ============================================================================
// StonfiProvider Tests
// ============================================================================

describe('StonfiProvider', () => {
  it('getName() should return "stonfi"', () => {
    const provider = new StonfiProvider();
    expect(provider.getName()).toBe('stonfi');
  });

  it('createStonfiProvider() should return a StonfiProvider instance', () => {
    expect(createStonfiProvider()).toBeInstanceOf(StonfiProvider);
  });

  it('getSupportedTokens() should include TON', async () => {
    const provider = new StonfiProvider();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jettons: [{ address: 'native', symbol: 'TON', name: 'Toncoin', decimals: 9, default_symbol: true }] }),
    } as Response);

    const tokens = await provider.getSupportedTokens();
    expect(tokens).toContain('TON');
  });

  it('healthCheck() should return boolean', async () => {
    const provider = new StonfiProvider();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tvl_usd: '1000000', volume_24h: '100000', pools_count: 10, jettons_count: 50 }),
    } as Response);

    const healthy = await provider.healthCheck();
    expect(typeof healthy).toBe('boolean');
  });
});

// ============================================================================
// ToncoProvider Tests
// ============================================================================

describe('ToncoProvider', () => {
  it('getName() should return "tonco"', () => {
    const provider = new ToncoProvider();
    expect(provider.getName()).toBe('tonco');
  });

  it('createToncoProvider() should return a ToncoProvider instance', () => {
    expect(createToncoProvider()).toBeInstanceOf(ToncoProvider);
  });

  it('getSupportedTokens() should include TON', async () => {
    const provider = new ToncoProvider();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tokens: [{ id: 'native', address: 'native', symbol: 'TON', name: 'Toncoin', decimals: 9 }] }),
    } as Response);

    const tokens = await provider.getSupportedTokens();
    expect(tokens).toContain('TON');
  });

  it('healthCheck() should return boolean', async () => {
    const provider = new ToncoProvider();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalValueLockedUSD: '500000', totalVolumeUSD: '10000000', txCount: '5000', poolCount: '20', tokenCount: '100' }),
    } as Response);

    const healthy = await provider.healthCheck();
    expect(typeof healthy).toBe('boolean');
  });
});

// ============================================================================
// MarketDataAggregator Tests - Configuration
// ============================================================================

describe('MarketDataAggregator - Configuration', () => {
  it('DEFAULT_AGGREGATOR_CONFIG should have expected defaults', () => {
    expect(DEFAULT_AGGREGATOR_CONFIG.providers).toContain('dedust');
    expect(DEFAULT_AGGREGATOR_CONFIG.providers).toContain('stonfi');
    expect(DEFAULT_AGGREGATOR_CONFIG.providers).toContain('tonco');
    expect(DEFAULT_AGGREGATOR_CONFIG.aggregationMethod).toBe('liquidity_weighted');
    expect(DEFAULT_AGGREGATOR_CONFIG.minLiquidityUsd).toBe(1000);
    expect(DEFAULT_AGGREGATOR_CONFIG.maxSpreadPercent).toBe(10);
  });

  it('createMarketDataAggregator() should return an instance', () => {
    expect(createMarketDataAggregator()).toBeInstanceOf(MarketDataAggregator);
  });

  it('should accept partial config', () => {
    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      aggregationMethod: 'median',
    });
    expect(aggregator).toBeInstanceOf(MarketDataAggregator);
  });
});

// ============================================================================
// MarketDataAggregator Tests - Lifecycle
// ============================================================================

describe('MarketDataAggregator - Lifecycle', () => {
  let aggregator: MarketDataAggregator;

  beforeEach(() => {
    aggregator = createMarketDataAggregator({
      pollingIntervalMs: 0, // Disable polling for tests
    });
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('should not be running before start()', () => {
    expect(aggregator.isRunning()).toBe(false);
  });

  it('should be running after start()', () => {
    aggregator.start();
    expect(aggregator.isRunning()).toBe(true);
  });

  it('should not be running after stop()', () => {
    aggregator.start();
    aggregator.stop();
    expect(aggregator.isRunning()).toBe(false);
  });

  it('calling start() twice is idempotent', () => {
    aggregator.start();
    aggregator.start();
    expect(aggregator.isRunning()).toBe(true);
  });

  it('calling stop() twice is idempotent', () => {
    aggregator.start();
    aggregator.stop();
    aggregator.stop();
    expect(aggregator.isRunning()).toBe(false);
  });
});

// ============================================================================
// MarketDataAggregator Tests - Provider Access
// ============================================================================

describe('MarketDataAggregator - Provider Access', () => {
  let aggregator: MarketDataAggregator;

  beforeEach(() => {
    aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi', 'tonco'],
      pollingIntervalMs: 0,
    });
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('getProvider() should return DedustProvider for "dedust"', () => {
    const provider = aggregator.getProvider('dedust');
    expect(provider).toBeDefined();
    expect(provider?.getName()).toBe('dedust');
  });

  it('getProvider() should return StonfiProvider for "stonfi"', () => {
    const provider = aggregator.getProvider('stonfi');
    expect(provider).toBeDefined();
    expect(provider?.getName()).toBe('stonfi');
  });

  it('getProvider() should return ToncoProvider for "tonco"', () => {
    const provider = aggregator.getProvider('tonco');
    expect(provider).toBeDefined();
    expect(provider?.getName()).toBe('tonco');
  });

  it('getProviders() should return all active providers', () => {
    const providers = aggregator.getProviders();
    expect(providers).toHaveLength(3);
    const names = providers.map(p => p.getName());
    expect(names).toContain('dedust');
    expect(names).toContain('stonfi');
    expect(names).toContain('tonco');
  });
});

// ============================================================================
// MarketDataAggregator Tests - Events
// ============================================================================

describe('MarketDataAggregator - Events', () => {
  let aggregator: MarketDataAggregator;

  beforeEach(() => {
    aggregator = createMarketDataAggregator({
      pollingIntervalMs: 0,
    });
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('should emit provider.connected event on start()', () => {
    const events: TonDexEvent[] = [];
    aggregator.subscribe((e) => events.push(e));
    aggregator.start();
    expect(events.some((e) => e.type === 'provider.connected')).toBe(true);
  });

  it('should emit provider.disconnected event on stop()', () => {
    const events: TonDexEvent[] = [];
    aggregator.start();
    aggregator.subscribe((e) => events.push(e));
    aggregator.stop();
    expect(events.some((e) => e.type === 'provider.disconnected')).toBe(true);
  });

  it('should allow unsubscribing from events', () => {
    const events: TonDexEvent[] = [];
    const unsub = aggregator.subscribe((e) => events.push(e));
    unsub();
    aggregator.start();
    expect(events).toHaveLength(0);
  });

  it('should swallow errors from faulty event subscribers', () => {
    aggregator.subscribe(() => { throw new Error('bad subscriber'); });
    expect(() => aggregator.start()).not.toThrow();
  });
});

// ============================================================================
// MarketDataAggregator Tests - Price Aggregation (with mocks)
// ============================================================================

describe('MarketDataAggregator - Price Aggregation', () => {
  it('should aggregate prices from multiple providers using liquidity weighting', async () => {
    // Create mock providers with different prices
    const mockDedust = new MockTonDexProvider('dedust');
    mockDedust.priceMultiplier = 1.0; // TON = $5.25

    const mockStonfi = new MockTonDexProvider('stonfi');
    mockStonfi.priceMultiplier = 1.02; // TON = $5.355 (2% higher)

    const mockTonco = new MockTonDexProvider('tonco');
    mockTonco.priceMultiplier = 0.98; // TON = $5.145 (2% lower)

    // Create aggregator with mock providers
    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi', 'tonco'],
      aggregationMethod: 'liquidity_weighted',
      minLiquidityUsd: 100,
      pollingIntervalMs: 0,
    });

    // Replace providers with mocks (testing internal state)
    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);
    (aggregator as any).providers.set('tonco', mockTonco);

    aggregator.start();

    const price = await aggregator.getAggregatedPrice('TON');

    expect(price.asset).toBe('TON');
    expect(price.priceUsd).toBeGreaterThan(0);
    expect(price.quotes).toHaveLength(3);
    expect(price.totalLiquidityUsd).toBeGreaterThan(0);
    expect(price.aggregationMethod).toBe('liquidity_weighted');

    // Check spread is calculated
    expect(price.spreadPercent).toBeGreaterThanOrEqual(0);

    aggregator.stop();
  });

  it('should handle provider failures gracefully', async () => {
    const mockDedust = new MockTonDexProvider('dedust');
    mockDedust.shouldFail = true;

    const mockStonfi = new MockTonDexProvider('stonfi');
    // Stonfi works normally

    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      minLiquidityUsd: 100,
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);

    aggregator.start();

    // Should still return price from working provider
    const price = await aggregator.getAggregatedPrice('TON');

    expect(price.asset).toBe('TON');
    expect(price.quotes).toHaveLength(1);
    expect(price.quotes[0].dex).toBe('stonfi');

    aggregator.stop();
  });

  it('should throw when all providers fail', async () => {
    const mockDedust = new MockTonDexProvider('dedust');
    mockDedust.shouldFail = true;

    const mockStonfi = new MockTonDexProvider('stonfi');
    mockStonfi.shouldFail = true;

    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);

    aggregator.start();

    await expect(aggregator.getAggregatedPrice('TON')).rejects.toThrow(TonDexError);

    aggregator.stop();
  });

  it('should filter out low-liquidity quotes', async () => {
    const mockDedust = new MockTonDexProvider('dedust');
    // Override getPrice to return low liquidity
    const originalGetPrice = mockDedust.getPrice.bind(mockDedust);
    mockDedust.getPrice = async (token: string) => {
      const quote = await originalGetPrice(token);
      quote.liquidityUsd = 500; // Below minLiquidityUsd of 1000
      return quote;
    };

    const mockStonfi = new MockTonDexProvider('stonfi');
    // Stonfi has normal liquidity

    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      minLiquidityUsd: 1000,
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);

    aggregator.start();

    const price = await aggregator.getAggregatedPrice('TON');

    // Only stonfi quote should be included
    expect(price.quotes).toHaveLength(1);
    expect(price.quotes[0].dex).toBe('stonfi');

    aggregator.stop();
  });

  it('should cache prices and serve from cache on repeated calls', async () => {
    const mockDedust = new MockTonDexProvider('dedust');

    const aggregator = createMarketDataAggregator({
      providers: ['dedust'],
      cacheTtlSeconds: 60,
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);

    aggregator.start();

    // First call
    await aggregator.getAggregatedPrice('TON');
    const callCount1 = mockDedust.callCount;

    // Second call should use cache
    await aggregator.getAggregatedPrice('TON');
    const callCount2 = mockDedust.callCount;

    expect(callCount2).toBe(callCount1);

    aggregator.stop();
  });
});

// ============================================================================
// MarketDataAggregator Tests - Pools and Pairs
// ============================================================================

describe('MarketDataAggregator - Pools and Pairs', () => {
  let aggregator: MarketDataAggregator;
  let mockDedust: MockTonDexProvider;
  let mockStonfi: MockTonDexProvider;

  beforeEach(() => {
    mockDedust = new MockTonDexProvider('dedust');
    mockStonfi = new MockTonDexProvider('stonfi');

    aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);
    aggregator.start();
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('getAllPools() should return pools from all providers', async () => {
    const pools = await aggregator.getAllPools();

    // Each mock returns 3 pools
    expect(pools.length).toBeGreaterThanOrEqual(3);

    const dexes = [...new Set(pools.map(p => p.dex))];
    expect(dexes).toContain('dedust');
    expect(dexes).toContain('stonfi');
  });

  it('getPoolsForToken() should return pools containing the token', async () => {
    const pools = await aggregator.getPoolsForToken('TON');

    expect(pools.length).toBeGreaterThan(0);
    for (const pool of pools) {
      const tokens = [pool.token0.symbol, pool.token1.symbol];
      expect(tokens).toContain('TON');
    }
  });

  it('getTradingPairs() should return aggregated pairs across DEXs', async () => {
    const pairs = await aggregator.getTradingPairs();

    expect(pairs.length).toBeGreaterThan(0);

    // Each pair should have combined data
    for (const pair of pairs) {
      expect(pair.pair).toBeDefined();
      expect(pair.base).toBeDefined();
      expect(pair.quote).toBeDefined();
      expect(pair.liquidityUsd).toBeGreaterThanOrEqual(0);
      expect(pair.availableOn.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// MarketDataAggregator Tests - Health Check
// ============================================================================

describe('MarketDataAggregator - Health Check', () => {
  it('healthCheck() should return status for all providers', async () => {
    const mockDedust = new MockTonDexProvider('dedust');
    const mockStonfi = new MockTonDexProvider('stonfi');
    mockStonfi.shouldFail = true;

    const aggregator = createMarketDataAggregator({
      providers: ['dedust', 'stonfi'],
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    (aggregator as any).providers.set('stonfi', mockStonfi);

    const health = await aggregator.healthCheck();

    expect(health.dedust).toBe(true);
    expect(health.stonfi).toBe(false);

    aggregator.stop();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration - Aggregator with Strategy Engine compatibility', () => {
  it('aggregated price should have required fields for Strategy Engine', async () => {
    const mockDedust = new MockTonDexProvider('dedust');

    const aggregator = createMarketDataAggregator({
      providers: ['dedust'],
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    aggregator.start();

    const price = await aggregator.getAggregatedPrice('TON');

    // Required fields for Strategy Engine compatibility
    expect(price.asset).toBe('TON');
    expect(typeof price.priceUsd).toBe('number');
    expect(price.priceUsd).toBeGreaterThan(0);
    expect(typeof price.totalLiquidityUsd).toBe('number');
    expect(typeof price.totalVolume24hUsd).toBe('number');
    expect(typeof price.timestamp).toBe('number');
    expect(Array.isArray(price.quotes)).toBe(true);

    aggregator.stop();
  });

  it('pools should have required fields for portfolio valuation', async () => {
    const mockDedust = new MockTonDexProvider('dedust');

    const aggregator = createMarketDataAggregator({
      providers: ['dedust'],
      pollingIntervalMs: 0,
    });

    (aggregator as any).providers.set('dedust', mockDedust);
    aggregator.start();

    const pools = await aggregator.getAllPools();

    expect(pools.length).toBeGreaterThan(0);

    for (const pool of pools) {
      expect(pool.poolId).toBeDefined();
      expect(pool.dex).toBeDefined();
      expect(pool.token0.symbol).toBeDefined();
      expect(pool.token1.symbol).toBeDefined();
      expect(typeof pool.tvlUsd).toBe('number');
      expect(typeof pool.volume24hUsd).toBe('number');
      expect(typeof pool.feePercent).toBe('number');
    }

    aggregator.stop();
  });
});

// ============================================================================
// Cleanup
// ============================================================================

afterEach(() => {
  vi.restoreAllMocks();
});
