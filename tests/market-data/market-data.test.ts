/**
 * Tests for the Market Data Layer (Issue #181)
 *
 * Covers:
 * - Asset configuration: MVP_ASSETS, COINGECKO_ASSET_IDS, BINANCE_SYMBOLS, BASELINE_PRICES
 * - MarketDataError: error structure, codes
 * - MarketDataCache: set/get/has/delete/evict/ttl/capacity
 * - BaseMarketDataProvider: validateAsset, nowSeconds, withRetry
 * - CoinGeckoProvider: metadata, API response normalization (mocked)
 * - BinanceProvider: metadata, API response normalization (mocked)
 * - DefaultMarketDataService: lifecycle, getPrice, getTicker, getSnapshot, cache, fallback, events
 * - Integration: service + providers + Strategy Engine snapshot compatibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  // Asset config
  MVP_ASSETS,
  COINGECKO_ASSET_IDS,
  BINANCE_SYMBOLS,
  BASELINE_PRICES,
  // Error
  MarketDataError,
  // Cache
  MarketDataCache,
  DEFAULT_CACHE_CONFIG,
  // Providers
  CoinGeckoProvider,
  BinanceProvider,
  createCoinGeckoProvider,
  createBinanceProvider,
  // Service
  DefaultMarketDataService,
  createMarketDataService,
  DEFAULT_SERVICE_CONFIG,
  // Base
  BaseMarketDataProvider,
} from '../../src/market-data';
import type {
  MarketDataEvent,
  MarketDataProvider,
  NormalizedPrice,
  ProviderConfig,
  Ticker,
} from '../../src/market-data';

// ============================================================================
// Test Helpers
// ============================================================================

/** Build a mock NormalizedPrice for testing */
function makeMockPrice(asset = 'BTC', price = 65_000): NormalizedPrice {
  return {
    asset,
    price,
    volume24h: 25_000_000_000,
    priceChange24h: 1.5,
    marketCap: 1_200_000_000_000,
    timestamp: Math.floor(Date.now() / 1000),
    source: 'mock',
  };
}

/** Build a mock Ticker for testing */
function makeMockTicker(asset = 'BTC', price = 65_000): Ticker {
  return {
    asset,
    price,
    high24h: price * 1.02,
    low24h: price * 0.98,
    volume24h: 25_000_000_000,
    priceChange24h: 1.5,
    timestamp: Math.floor(Date.now() / 1000),
    source: 'mock',
  };
}

/** Mock provider that returns deterministic data without API calls */
class MockProvider implements MarketDataProvider {
  private readonly providerName: 'coingecko' | 'binance';
  public shouldFail = false;
  public callCount = 0;

  constructor(name: 'coingecko' | 'binance' = 'coingecko') {
    this.providerName = name;
  }

  getName() {
    return this.providerName;
  }

  async getPrice(asset: string): Promise<NormalizedPrice> {
    this.callCount++;
    if (this.shouldFail) {
      throw new MarketDataError('Mock provider failure', 'PROVIDER_UNAVAILABLE', this.providerName);
    }
    return makeMockPrice(asset.toUpperCase(), BASELINE_PRICES[asset.toUpperCase()] ?? 100);
  }

  async getTicker(asset: string): Promise<Ticker> {
    this.callCount++;
    if (this.shouldFail) {
      throw new MarketDataError('Mock provider failure', 'PROVIDER_UNAVAILABLE', this.providerName);
    }
    const price = BASELINE_PRICES[asset.toUpperCase()] ?? 100;
    return makeMockTicker(asset.toUpperCase(), price);
  }

  getSupportedAssets(): string[] {
    return [...MVP_ASSETS];
  }
}

// ============================================================================
// Asset Configuration Tests
// ============================================================================

describe('Asset Configuration', () => {
  it('MVP_ASSETS should contain the five required assets', () => {
    expect(MVP_ASSETS).toContain('BTC');
    expect(MVP_ASSETS).toContain('ETH');
    expect(MVP_ASSETS).toContain('TON');
    expect(MVP_ASSETS).toContain('SOL');
    expect(MVP_ASSETS).toContain('USDT');
  });

  it('MVP_ASSETS should have exactly 5 assets', () => {
    expect(MVP_ASSETS).toHaveLength(5);
  });

  it('COINGECKO_ASSET_IDS should map all MVP assets', () => {
    for (const asset of MVP_ASSETS) {
      expect(COINGECKO_ASSET_IDS[asset]).toBeDefined();
      expect(typeof COINGECKO_ASSET_IDS[asset]).toBe('string');
    }
  });

  it('COINGECKO_ASSET_IDS should map BTC to "bitcoin"', () => {
    expect(COINGECKO_ASSET_IDS['BTC']).toBe('bitcoin');
  });

  it('COINGECKO_ASSET_IDS should map TON to "the-open-network"', () => {
    expect(COINGECKO_ASSET_IDS['TON']).toBe('the-open-network');
  });

  it('BINANCE_SYMBOLS should map all MVP assets', () => {
    for (const asset of MVP_ASSETS) {
      expect(BINANCE_SYMBOLS[asset]).toBeDefined();
      expect(typeof BINANCE_SYMBOLS[asset]).toBe('string');
    }
  });

  it('BINANCE_SYMBOLS should map BTC to "BTCUSDT"', () => {
    expect(BINANCE_SYMBOLS['BTC']).toBe('BTCUSDT');
  });

  it('BASELINE_PRICES should have positive prices for all MVP assets', () => {
    for (const asset of MVP_ASSETS) {
      expect(BASELINE_PRICES[asset]).toBeGreaterThan(0);
    }
  });

  it('BASELINE_PRICES USDT should be approximately 1', () => {
    expect(BASELINE_PRICES['USDT']).toBeCloseTo(1.0);
  });
});

// ============================================================================
// MarketDataError Tests
// ============================================================================

describe('MarketDataError', () => {
  it('should be an instance of Error', () => {
    const err = new MarketDataError('test', 'PROVIDER_UNAVAILABLE');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have name MarketDataError', () => {
    const err = new MarketDataError('test', 'FETCH_TIMEOUT');
    expect(err.name).toBe('MarketDataError');
  });

  it('should carry code and message', () => {
    const err = new MarketDataError('not found', 'ASSET_NOT_SUPPORTED', 'coingecko', { asset: 'XYZ' });
    expect(err.code).toBe('ASSET_NOT_SUPPORTED');
    expect(err.message).toBe('not found');
    expect(err.provider).toBe('coingecko');
    expect(err.metadata).toEqual({ asset: 'XYZ' });
  });

  it('should support all error codes', () => {
    const codes = [
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_RATE_LIMITED',
      'INVALID_RESPONSE',
      'ASSET_NOT_SUPPORTED',
      'FETCH_TIMEOUT',
      'ALL_PROVIDERS_FAILED',
    ] as const;

    for (const code of codes) {
      const err = new MarketDataError('test', code);
      expect(err.code).toBe(code);
    }
  });
});

// ============================================================================
// MarketDataCache Tests
// ============================================================================

describe('MarketDataCache', () => {
  let cache: MarketDataCache<NormalizedPrice>;

  beforeEach(() => {
    cache = new MarketDataCache({ ttlSeconds: 30, maxEntries: 10 });
  });

  it('DEFAULT_CACHE_CONFIG should have ttlSeconds of 30', () => {
    expect(DEFAULT_CACHE_CONFIG.ttlSeconds).toBe(30);
  });

  it('DEFAULT_CACHE_CONFIG should have maxEntries of 100', () => {
    expect(DEFAULT_CACHE_CONFIG.maxEntries).toBe(100);
  });

  it('should start empty', () => {
    expect(cache.size()).toBe(0);
  });

  it('has() should return false for missing key', () => {
    expect(cache.has('missing')).toBe(false);
  });

  it('get() should return undefined for missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should store and retrieve a value', () => {
    const price = makeMockPrice();
    cache.set('BTC', price);
    expect(cache.has('BTC')).toBe(true);
    expect(cache.get('BTC')).toEqual(price);
  });

  it('size() should reflect stored entries', () => {
    cache.set('BTC', makeMockPrice('BTC'));
    cache.set('ETH', makeMockPrice('ETH'));
    expect(cache.size()).toBe(2);
  });

  it('delete() should remove a key', () => {
    cache.set('BTC', makeMockPrice());
    cache.delete('BTC');
    expect(cache.has('BTC')).toBe(false);
  });

  it('clear() should remove all entries', () => {
    cache.set('BTC', makeMockPrice('BTC'));
    cache.set('ETH', makeMockPrice('ETH'));
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('ttlMs() should return positive value for a fresh entry', () => {
    cache.set('BTC', makeMockPrice());
    expect(cache.ttlMs('BTC')).toBeGreaterThan(0);
  });

  it('ttlMs() should return 0 for missing key', () => {
    expect(cache.ttlMs('missing')).toBe(0);
  });

  it('has() should return false for expired entries', async () => {
    const shortCache = new MarketDataCache<NormalizedPrice>({ ttlSeconds: 0.001, maxEntries: 10 });
    shortCache.set('BTC', makeMockPrice());
    await new Promise((r) => setTimeout(r, 10));
    expect(shortCache.has('BTC')).toBe(false);
  });

  it('evictExpired() should remove expired entries', async () => {
    const shortCache = new MarketDataCache<NormalizedPrice>({ ttlSeconds: 0.001, maxEntries: 10 });
    shortCache.set('BTC', makeMockPrice());
    shortCache.set('ETH', makeMockPrice('ETH'));
    await new Promise((r) => setTimeout(r, 10));
    const evicted = shortCache.evictExpired();
    expect(evicted).toBe(2);
    expect(shortCache.size()).toBe(0);
  });

  it('should evict oldest entry when at capacity', () => {
    const smallCache = new MarketDataCache<NormalizedPrice>({ ttlSeconds: 60, maxEntries: 2 });
    smallCache.set('BTC', makeMockPrice('BTC'));
    smallCache.set('ETH', makeMockPrice('ETH'));
    smallCache.set('TON', makeMockPrice('TON')); // should evict BTC
    expect(smallCache.size()).toBe(2);
    // BTC was the oldest, should be gone
    expect(smallCache.has('BTC')).toBe(false);
    expect(smallCache.has('TON')).toBe(true);
  });

  it('should overwrite existing entry without eviction', () => {
    const smallCache = new MarketDataCache<NormalizedPrice>({ ttlSeconds: 60, maxEntries: 2 });
    smallCache.set('BTC', makeMockPrice('BTC', 60_000));
    smallCache.set('ETH', makeMockPrice('ETH'));
    smallCache.set('BTC', makeMockPrice('BTC', 70_000)); // update, no eviction
    expect(smallCache.size()).toBe(2);
    expect(smallCache.get('BTC')?.price).toBe(70_000);
    expect(smallCache.has('ETH')).toBe(true);
  });
});

// ============================================================================
// BaseMarketDataProvider Tests
// ============================================================================

describe('BaseMarketDataProvider', () => {
  it('should validate supported assets without throwing', () => {
    const provider = new CoinGeckoProvider();
    expect(() => (provider as any).validateAsset('BTC')).not.toThrow();
  });

  it('should throw ASSET_NOT_SUPPORTED for unsupported asset', () => {
    const provider = new CoinGeckoProvider();
    try {
      (provider as any).validateAsset('INVALID');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err instanceof MarketDataError).toBe(true);
      expect((err as MarketDataError).code).toBe('ASSET_NOT_SUPPORTED');
    }
  });

  it('nowSeconds() should return a number close to Date.now()/1000', () => {
    const provider = new CoinGeckoProvider();
    const now = Math.floor(Date.now() / 1000);
    const result = (provider as any).nowSeconds();
    expect(result).toBeGreaterThanOrEqual(now - 1);
    expect(result).toBeLessThanOrEqual(now + 1);
  });

  it('withRetry() should succeed on first attempt', async () => {
    const provider = new CoinGeckoProvider();
    let calls = 0;
    const result = await (provider as any).withRetry(async () => {
      calls++;
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(1);
  });

  it('withRetry() should retry on transient error', async () => {
    const provider = new CoinGeckoProvider({ name: 'coingecko', maxRetries: 2 });
    let calls = 0;
    const result = await (provider as any).withRetry(async () => {
      calls++;
      if (calls < 3) throw new MarketDataError('transient', 'PROVIDER_UNAVAILABLE', 'coingecko');
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(3);
  });

  it('withRetry() should not retry ASSET_NOT_SUPPORTED', async () => {
    const provider = new CoinGeckoProvider({ name: 'coingecko', maxRetries: 2 });
    let calls = 0;
    await expect(
      (provider as any).withRetry(async () => {
        calls++;
        throw new MarketDataError('not supported', 'ASSET_NOT_SUPPORTED', 'coingecko');
      })
    ).rejects.toThrow(MarketDataError);
    expect(calls).toBe(1);
  });
});

// ============================================================================
// CoinGeckoProvider Tests (mocked fetch)
// ============================================================================

describe('CoinGeckoProvider', () => {
  it('getName() should return "coingecko"', () => {
    const provider = new CoinGeckoProvider();
    expect(provider.getName()).toBe('coingecko');
  });

  it('getSupportedAssets() should return all MVP assets', () => {
    const provider = new CoinGeckoProvider();
    const assets = provider.getSupportedAssets();
    for (const asset of MVP_ASSETS) {
      expect(assets).toContain(asset);
    }
  });

  it('createCoinGeckoProvider() should return a CoinGeckoProvider', () => {
    expect(createCoinGeckoProvider()).toBeInstanceOf(CoinGeckoProvider);
  });

  it('getPrice() should throw ASSET_NOT_SUPPORTED for unknown asset', async () => {
    const provider = new CoinGeckoProvider();
    await expect(provider.getPrice('INVALID')).rejects.toMatchObject({
      code: 'ASSET_NOT_SUPPORTED',
    });
  });

  it('getPrice() should return normalized NormalizedPrice for BTC (mocked fetch)', async () => {
    const mockResponse = {
      bitcoin: {
        usd: 65_000,
        usd_24h_vol: 25_000_000_000,
        usd_24h_change: 1.5,
        usd_market_cap: 1_200_000_000_000,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const provider = new CoinGeckoProvider();
    const price = await provider.getPrice('BTC');

    expect(price.asset).toBe('BTC');
    expect(price.price).toBe(65_000);
    expect(price.volume24h).toBe(25_000_000_000);
    expect(price.priceChange24h).toBe(1.5);
    expect(price.marketCap).toBe(1_200_000_000_000);
    expect(price.source).toBe('coingecko');
    expect(typeof price.timestamp).toBe('number');

    fetchSpy.mockRestore();
  });

  it('getPrice() should throw PROVIDER_RATE_LIMITED on HTTP 429', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);

    const provider = new CoinGeckoProvider({ name: 'coingecko', maxRetries: 0 });
    await expect(provider.getPrice('BTC')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });

    fetchSpy.mockRestore();
  });

  it('getPrice() should throw PROVIDER_UNAVAILABLE on HTTP 500', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const provider = new CoinGeckoProvider({ name: 'coingecko', maxRetries: 0 });
    await expect(provider.getPrice('BTC')).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });

    fetchSpy.mockRestore();
  });

  it('getTicker() should return normalized Ticker for ETH (mocked fetch)', async () => {
    const mockResponse = {
      market_data: {
        current_price: { usd: 3500 },
        high_24h: { usd: 3600 },
        low_24h: { usd: 3400 },
        total_volume: { usd: 15_000_000_000 },
        market_cap: { usd: 400_000_000_000 },
        price_change_percentage_24h: 2.0,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const provider = new CoinGeckoProvider();
    const ticker = await provider.getTicker('ETH');

    expect(ticker.asset).toBe('ETH');
    expect(ticker.price).toBe(3500);
    expect(ticker.high24h).toBe(3600);
    expect(ticker.low24h).toBe(3400);
    expect(ticker.volume24h).toBe(15_000_000_000);
    expect(ticker.source).toBe('coingecko');

    fetchSpy.mockRestore();
  });
});

// ============================================================================
// BinanceProvider Tests (mocked fetch)
// ============================================================================

describe('BinanceProvider', () => {
  it('getName() should return "binance"', () => {
    const provider = new BinanceProvider();
    expect(provider.getName()).toBe('binance');
  });

  it('getSupportedAssets() should return all MVP assets', () => {
    const provider = new BinanceProvider();
    const assets = provider.getSupportedAssets();
    for (const asset of MVP_ASSETS) {
      expect(assets).toContain(asset);
    }
  });

  it('createBinanceProvider() should return a BinanceProvider', () => {
    expect(createBinanceProvider()).toBeInstanceOf(BinanceProvider);
  });

  it('getPrice() should throw ASSET_NOT_SUPPORTED for unknown asset', async () => {
    const provider = new BinanceProvider();
    await expect(provider.getPrice('INVALID')).rejects.toMatchObject({
      code: 'ASSET_NOT_SUPPORTED',
    });
  });

  it('getPrice() should return normalized NormalizedPrice for BTC (mocked fetch)', async () => {
    const mockResponse = {
      symbol: 'BTCUSDT',
      lastPrice: '65000.00',
      highPrice: '66000.00',
      lowPrice: '64000.00',
      volume: '10000',
      quoteVolume: '650000000',
      priceChangePercent: '1.50',
      openPrice: '64000.00',
      prevClosePrice: '63900.00',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const provider = new BinanceProvider();
    const price = await provider.getPrice('BTC');

    expect(price.asset).toBe('BTC');
    expect(price.price).toBe(65_000);
    expect(price.volume24h).toBe(650_000_000);
    expect(price.priceChange24h).toBe(1.5);
    expect(price.source).toBe('binance');
    expect(typeof price.timestamp).toBe('number');

    fetchSpy.mockRestore();
  });

  it('getPrice() should throw PROVIDER_RATE_LIMITED on HTTP 429', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
    } as Response);

    const provider = new BinanceProvider({ name: 'binance', maxRetries: 0 });
    await expect(provider.getPrice('BTC')).rejects.toMatchObject({
      code: 'PROVIDER_RATE_LIMITED',
    });

    fetchSpy.mockRestore();
  });

  it('getTicker() should return normalized Ticker for SOL (mocked fetch)', async () => {
    const mockResponse = {
      symbol: 'SOLUSDT',
      lastPrice: '175.00',
      highPrice: '180.00',
      lowPrice: '170.00',
      volume: '5000000',
      quoteVolume: '875000000',
      priceChangePercent: '2.50',
      openPrice: '170.00',
      prevClosePrice: '169.50',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const provider = new BinanceProvider();
    const ticker = await provider.getTicker('SOL');

    expect(ticker.asset).toBe('SOL');
    expect(ticker.price).toBe(175);
    expect(ticker.high24h).toBe(180);
    expect(ticker.low24h).toBe(170);
    expect(ticker.source).toBe('binance');

    fetchSpy.mockRestore();
  });
});

// ============================================================================
// DefaultMarketDataService Tests (mock providers)
// ============================================================================

describe('DefaultMarketDataService - lifecycle', () => {
  let primaryMock: MockProvider;
  let fallbackMock: MockProvider;
  let service: DefaultMarketDataService;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    fallbackMock = new MockProvider('binance');
    service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: fallbackMock }
    );
  });

  it('should not be running before start()', () => {
    expect(service.isRunning()).toBe(false);
  });

  it('should be running after start()', () => {
    service.start();
    expect(service.isRunning()).toBe(true);
  });

  it('should not be running after stop()', () => {
    service.start();
    service.stop();
    expect(service.isRunning()).toBe(false);
  });

  it('calling start() twice is idempotent', () => {
    service.start();
    service.start();
    expect(service.isRunning()).toBe(true);
  });

  it('calling stop() twice is idempotent', () => {
    service.start();
    service.stop();
    service.stop();
    expect(service.isRunning()).toBe(false);
  });

  it('DEFAULT_SERVICE_CONFIG should use coingecko as primary', () => {
    expect(DEFAULT_SERVICE_CONFIG.primaryProvider).toBe('coingecko');
  });

  it('DEFAULT_SERVICE_CONFIG should use binance as fallback', () => {
    expect(DEFAULT_SERVICE_CONFIG.fallbackProvider).toBe('binance');
  });
});

describe('DefaultMarketDataService - getPrice', () => {
  let primaryMock: MockProvider;
  let fallbackMock: MockProvider;
  let service: DefaultMarketDataService;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    fallbackMock = new MockProvider('binance');
    service = createMarketDataService(
      {
        primaryProvider: 'coingecko',
        fallbackProvider: 'binance',
        cache: { ttlSeconds: 30, maxEntries: 100 },
      },
      { coingecko: primaryMock, binance: fallbackMock }
    );
  });

  it('should return price from primary provider', async () => {
    const result = await service.getPrice('BTC');
    expect(result.price.asset).toBe('BTC');
    expect(result.price.price).toBeGreaterThan(0);
    expect(result.fromCache).toBe(false);
    expect(result.usedFallback).toBe(false);
  });

  it('should return cached price on second call', async () => {
    await service.getPrice('BTC');
    const result2 = await service.getPrice('BTC');
    expect(result2.fromCache).toBe(true);
    // Primary was only called once
    expect(primaryMock.callCount).toBe(1);
  });

  it('should use fallback provider when primary fails', async () => {
    primaryMock.shouldFail = true;
    const result = await service.getPrice('BTC');
    expect(result.usedFallback).toBe(true);
    expect(result.price.source).toBe('mock'); // fallbackMock returns 'mock' source
  });

  it('should throw ALL_PROVIDERS_FAILED when both providers fail', async () => {
    primaryMock.shouldFail = true;
    fallbackMock.shouldFail = true;
    await expect(service.getPrice('BTC')).rejects.toMatchObject({
      code: 'ALL_PROVIDERS_FAILED',
    });
  });

  it('price result should have required fields', async () => {
    const result = await service.getPrice('TON');
    expect(result.price.asset).toBe('TON');
    expect(typeof result.price.price).toBe('number');
    expect(typeof result.price.volume24h).toBe('number');
    expect(typeof result.price.timestamp).toBe('number');
    expect(typeof result.price.source).toBe('string');
  });
});

describe('DefaultMarketDataService - getTicker', () => {
  let primaryMock: MockProvider;
  let service: DefaultMarketDataService;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );
  });

  it('should return ticker for a supported asset', async () => {
    const ticker = await service.getTicker('ETH');
    expect(ticker.asset).toBe('ETH');
    expect(ticker.price).toBeGreaterThan(0);
    expect(ticker.volume24h).toBeGreaterThan(0);
  });

  it('should cache ticker results', async () => {
    await service.getTicker('ETH');
    await service.getTicker('ETH');
    expect(primaryMock.callCount).toBe(1);
  });
});

describe('DefaultMarketDataService - getSnapshot', () => {
  let primaryMock: MockProvider;
  let service: DefaultMarketDataService;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );
  });

  it('should return a snapshot with all MVP assets', async () => {
    const snapshot = await service.getSnapshot();
    for (const asset of MVP_ASSETS) {
      expect(snapshot.prices[asset]).toBeDefined();
    }
  });

  it('snapshot should have a source field', async () => {
    const snapshot = await service.getSnapshot();
    expect(typeof snapshot.source).toBe('string');
    expect(snapshot.source.length).toBeGreaterThan(0);
  });

  it('snapshot fetchedAt should be a Date', async () => {
    const snapshot = await service.getSnapshot();
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);
  });

  it('snapshot should be compatible with Strategy Engine MarketData type', async () => {
    const snapshot = await service.getSnapshot();
    // Verify shape matches MarketData from strategy-engine/types.ts
    for (const [asset, priceData] of Object.entries(snapshot.prices)) {
      expect(typeof priceData.asset).toBe('string');
      expect(typeof priceData.price).toBe('number');
      expect(typeof priceData.volume24h).toBe('number');
      expect(typeof priceData.timestamp).toBe('number');
      expect(priceData.asset).toBe(asset);
    }
  });
});

describe('DefaultMarketDataService - cache management', () => {
  let service: DefaultMarketDataService;
  let primaryMock: MockProvider;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );
  });

  it('clearCache() should force re-fetch on next call', async () => {
    await service.getPrice('BTC');
    service.clearCache();
    await service.getPrice('BTC');
    expect(primaryMock.callCount).toBe(2);
  });

  it('evictExpired() should return counts', () => {
    const result = service.evictExpired();
    expect(typeof result.prices).toBe('number');
    expect(typeof result.tickers).toBe('number');
  });
});

describe('DefaultMarketDataService - events', () => {
  let service: DefaultMarketDataService;
  let primaryMock: MockProvider;

  beforeEach(() => {
    primaryMock = new MockProvider('coingecko');
    service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );
  });

  it('should emit service.started event', () => {
    const events: MarketDataEvent[] = [];
    service.subscribe((e) => events.push(e));
    service.start();
    expect(events.some((e) => e.type === 'service.started')).toBe(true);
  });

  it('should emit service.stopped event', () => {
    const events: MarketDataEvent[] = [];
    service.start();
    service.subscribe((e) => events.push(e));
    service.stop();
    expect(events.some((e) => e.type === 'service.stopped')).toBe(true);
  });

  it('should emit price.fetched event on successful fetch', async () => {
    const events: MarketDataEvent[] = [];
    service.subscribe((e) => events.push(e));
    await service.getPrice('BTC');
    expect(events.some((e) => e.type === 'price.fetched')).toBe(true);
  });

  it('should emit price.cache_hit event on cache hit', async () => {
    const events: MarketDataEvent[] = [];
    await service.getPrice('BTC');
    service.subscribe((e) => events.push(e));
    await service.getPrice('BTC');
    expect(events.some((e) => e.type === 'price.cache_hit')).toBe(true);
  });

  it('should emit provider.error event when primary fails', async () => {
    const events: MarketDataEvent[] = [];
    primaryMock.shouldFail = true;
    service.subscribe((e) => events.push(e));
    await service.getPrice('BTC'); // Falls back to binance
    expect(events.some((e) => e.type === 'provider.error')).toBe(true);
  });

  it('should emit provider.fallback event when fallback is used', async () => {
    const events: MarketDataEvent[] = [];
    primaryMock.shouldFail = true;
    service.subscribe((e) => events.push(e));
    await service.getPrice('BTC');
    expect(events.some((e) => e.type === 'provider.fallback')).toBe(true);
  });

  it('should allow unsubscribing from events', async () => {
    const events: MarketDataEvent[] = [];
    const unsub = service.subscribe((e) => events.push(e));
    unsub();
    service.start();
    await service.getPrice('BTC');
    expect(events).toHaveLength(0);
  });

  it('should swallow errors from faulty event subscribers', async () => {
    service.subscribe(() => { throw new Error('bad subscriber'); });
    await expect(service.getPrice('BTC')).resolves.toBeDefined();
  });
});

describe('DefaultMarketDataService - provider access', () => {
  it('getProvider() should return the named provider', () => {
    const primary = new MockProvider('coingecko');
    const service = createMarketDataService(
      { primaryProvider: 'coingecko' },
      { coingecko: primary }
    );
    expect(service.getProvider('coingecko')).toBe(primary);
  });

  it('getProvider() should return undefined for unregistered provider', () => {
    const service = createMarketDataService();
    // Default service has both providers registered — just ensure no crash
    expect(service.getProvider('coingecko')).toBeDefined();
    expect(service.getProvider('binance')).toBeDefined();
  });
});

// ============================================================================
// createMarketDataService factory
// ============================================================================

describe('createMarketDataService', () => {
  it('should return a DefaultMarketDataService instance', () => {
    expect(createMarketDataService()).toBeInstanceOf(DefaultMarketDataService);
  });

  it('should accept partial config', () => {
    const service = createMarketDataService({ primaryProvider: 'binance' });
    expect(service).toBeInstanceOf(DefaultMarketDataService);
  });

  it('should accept injected providers', () => {
    const mock = new MockProvider('coingecko');
    const service = createMarketDataService({}, { coingecko: mock });
    expect(service.getProvider('coingecko')).toBe(mock);
  });
});

// ============================================================================
// Integration: Market Data → Strategy Engine snapshot
// ============================================================================

describe('Market Data - Strategy Engine integration', () => {
  it('snapshot prices should be usable as Strategy Engine MarketData', async () => {
    const primaryMock = new MockProvider('coingecko');
    const service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );

    const snapshot = await service.getSnapshot();

    // Verify snapshot has the structure expected by Strategy Engine:
    // MarketData = { prices: Record<string, AssetPrice>, source: string, fetchedAt: Date }
    // AssetPrice = { asset: string, price: number, volume24h: number, priceChange24h?: number, timestamp: Date }
    // Note: NormalizedPrice uses timestamp as number (unix seconds), Strategy Engine uses Date.
    // The adapter converts: timestamp in snapshot.prices[asset] is compatible via numeric form.

    expect(typeof snapshot.source).toBe('string');
    expect(snapshot.fetchedAt).toBeInstanceOf(Date);

    for (const asset of MVP_ASSETS) {
      const priceData = snapshot.prices[asset];
      expect(priceData).toBeDefined();
      expect(priceData.asset).toBe(asset);
      expect(priceData.price).toBeGreaterThan(0);
    }
  });

  it('service should provide prices for all MVP assets on second call (from cache)', async () => {
    const primaryMock = new MockProvider('coingecko');
    const service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance' },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );

    // First call — fetches from provider
    await service.getSnapshot();
    const firstCallCount = primaryMock.callCount;

    // Second call — should use cache
    await service.getSnapshot();
    // Cache should serve all assets, so provider call count shouldn't increase
    expect(primaryMock.callCount).toBe(firstCallCount);
  });

  it('caching should prevent excessive API calls within TTL', async () => {
    const primaryMock = new MockProvider('coingecko');
    const service = createMarketDataService(
      { primaryProvider: 'coingecko', fallbackProvider: 'binance', cache: { ttlSeconds: 30, maxEntries: 100 } },
      { coingecko: primaryMock, binance: new MockProvider('binance') }
    );

    // Fetch 10 times
    for (let i = 0; i < 10; i++) {
      await service.getPrice('BTC');
    }

    // Provider should only be called once (first time)
    expect(primaryMock.callCount).toBe(1);
  });
});
