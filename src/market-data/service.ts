/**
 * TONAIAgent - Market Data Service
 *
 * The central service for fetching, caching, and distributing market data.
 * Orchestrates provider selection, fallback logic, normalization, and caching.
 *
 * This is the primary entry point for the Strategy Engine and agents to access
 * real-time price data.
 *
 * Architecture:
 * ```
 *   Strategy Engine / Agents
 *         |
 *   MarketDataService (this module)
 *         |         \
 *   Cache Layer    Provider (primary → fallback)
 *                      |
 *               External APIs (CoinGecko / Binance)
 * ```
 */

import type { MarketDataProvider } from './interface';
import type {
  MarketDataEvent,
  MarketDataEventHandler,
  MarketDataServiceConfig,
  MarketDataSnapshot,
  MarketDataUnsubscribe,
  NormalizedPrice,
  ProviderName,
  Ticker,
  PriceResult,
} from './types';
import { MarketDataError } from './types';
import { MarketDataCache, DEFAULT_CACHE_CONFIG } from './cache';
import { CoinGeckoProvider } from './providers/coingecko';
import { BinanceProvider } from './providers/binance';
import { MVP_ASSETS } from './config/assets';

// ============================================================================
// Default Service Configuration
// ============================================================================

export const DEFAULT_SERVICE_CONFIG: MarketDataServiceConfig = {
  primaryProvider: 'coingecko',
  fallbackProvider: 'binance',
  cache: DEFAULT_CACHE_CONFIG,
};

// ============================================================================
// Market Data Service
// ============================================================================

/**
 * DefaultMarketDataService — the single source of truth for market price data.
 *
 * Features:
 * - Multi-provider support with automatic fallback
 * - In-memory cache with configurable TTL (default: 30s)
 * - Normalized NormalizedPrice output regardless of provider
 * - Strategy Engine compatible MarketDataSnapshot output
 * - Event-driven pub/sub for observability
 *
 * @example
 * ```typescript
 * const service = createMarketDataService();
 * service.start();
 *
 * // Get a single price
 * const result = await service.getPrice('BTC');
 * console.log(result.price); // { asset: 'BTC', price: 65000, ... }
 * console.log(result.fromCache); // false
 *
 * // Get all supported asset prices (for Strategy Engine)
 * const snapshot = await service.getSnapshot();
 * console.log(snapshot.prices['BTC'].price); // 65000
 * ```
 */
export class DefaultMarketDataService {
  private readonly config: MarketDataServiceConfig;
  private readonly providers: Map<ProviderName, MarketDataProvider>;
  private readonly priceCache: MarketDataCache<NormalizedPrice>;
  private readonly tickerCache: MarketDataCache<Ticker>;
  private readonly eventHandlers = new Set<MarketDataEventHandler>();
  private running = false;

  constructor(
    config: Partial<MarketDataServiceConfig> = {},
    providers?: Partial<Record<ProviderName, MarketDataProvider>>
  ) {
    this.config = {
      ...DEFAULT_SERVICE_CONFIG,
      ...config,
      cache: { ...DEFAULT_CACHE_CONFIG, ...(config.cache ?? {}) },
    };

    this.priceCache = new MarketDataCache<NormalizedPrice>(this.config.cache);
    this.tickerCache = new MarketDataCache<Ticker>(this.config.cache);

    // Build provider map — use injected providers or construct defaults
    this.providers = new Map();
    const providerConfigs = config.providers ?? {};

    this.providers.set(
      'coingecko',
      providers?.coingecko ?? new CoinGeckoProvider(providerConfigs.coingecko)
    );
    this.providers.set(
      'binance',
      providers?.binance ?? new BinanceProvider(providerConfigs.binance)
    );
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the market data service */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.emitEvent('service.started', undefined, undefined, {});
  }

  /** Stop the market data service */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.priceCache.clear();
    this.tickerCache.clear();
    this.emitEvent('service.stopped', undefined, undefined, {});
  }

  /** Whether the service is running */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Price Retrieval
  // ============================================================================

  /**
   * Fetches the current price for a single asset.
   *
   * Flow:
   * 1. Check price cache
   * 2. If hit → return cached value with fromCache: true
   * 3. If miss → try primary provider
   * 4. If primary fails → try fallback provider
   * 5. Store result in cache
   * 6. Return result with provenance metadata
   *
   * @param asset - Asset symbol (e.g. "BTC", "TON")
   * @returns PriceResult with price data and cache/fallback metadata
   * @throws MarketDataError if all providers fail
   */
  async getPrice(asset: string): Promise<PriceResult> {
    const cacheKey = `price:${this.config.primaryProvider}:${asset.toUpperCase()}`;

    // Cache hit
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey)!;
      this.emitEvent('price.cache_hit', asset, cached.source, { asset, source: cached.source });
      return { price: cached, fromCache: true, usedFallback: false };
    }

    // Try primary provider
    const primaryName = this.config.primaryProvider;
    const primary = this.providers.get(primaryName);

    if (primary) {
      try {
        const price = await primary.getPrice(asset);
        this.priceCache.set(cacheKey, price);
        this.emitEvent('price.fetched', asset, primaryName, { asset, source: primaryName });
        this.emitEvent('price.cached', asset, primaryName, { asset, cacheKey });
        return { price, fromCache: false, usedFallback: false };
      } catch (err) {
        this.emitEvent('provider.error', asset, primaryName, {
          asset,
          provider: primaryName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Try fallback provider
    const fallbackName = this.config.fallbackProvider;
    if (fallbackName) {
      const fallback = this.providers.get(fallbackName);
      const fallbackCacheKey = `price:${fallbackName}:${asset.toUpperCase()}`;

      if (fallback) {
        try {
          const price = await fallback.getPrice(asset);
          this.priceCache.set(fallbackCacheKey, price);
          this.emitEvent('provider.fallback', asset, fallbackName, { asset, provider: fallbackName });
          this.emitEvent('price.fetched', asset, fallbackName, { asset, source: fallbackName });
          return { price, fromCache: false, usedFallback: true };
        } catch (err) {
          this.emitEvent('provider.error', asset, fallbackName, {
            asset,
            provider: fallbackName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    throw new MarketDataError(
      `All providers failed to fetch price for asset '${asset}'`,
      'ALL_PROVIDERS_FAILED',
      undefined,
      { asset, primaryProvider: primaryName, fallbackProvider: fallbackName }
    );
  }

  /**
   * Fetches full ticker data for a single asset.
   *
   * Same caching and fallback logic as getPrice().
   *
   * @param asset - Asset symbol (e.g. "BTC", "TON")
   * @returns Ticker data
   * @throws MarketDataError if all providers fail
   */
  async getTicker(asset: string): Promise<Ticker> {
    const cacheKey = `ticker:${this.config.primaryProvider}:${asset.toUpperCase()}`;

    if (this.tickerCache.has(cacheKey)) {
      return this.tickerCache.get(cacheKey)!;
    }

    const primaryName = this.config.primaryProvider;
    const primary = this.providers.get(primaryName);

    if (primary) {
      try {
        const ticker = await primary.getTicker(asset);
        this.tickerCache.set(cacheKey, ticker);
        return ticker;
      } catch (err) {
        this.emitEvent('provider.error', asset, primaryName, {
          asset,
          provider: primaryName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const fallbackName = this.config.fallbackProvider;
    if (fallbackName) {
      const fallback = this.providers.get(fallbackName);
      if (fallback) {
        try {
          const ticker = await fallback.getTicker(asset);
          this.tickerCache.set(`ticker:${fallbackName}:${asset.toUpperCase()}`, ticker);
          return ticker;
        } catch (err) {
          this.emitEvent('provider.error', asset, fallbackName, {
            asset,
            provider: fallbackName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    throw new MarketDataError(
      `All providers failed to fetch ticker for asset '${asset}'`,
      'ALL_PROVIDERS_FAILED',
      undefined,
      { asset }
    );
  }

  /**
   * Fetches a snapshot of all supported asset prices.
   * Compatible with the Strategy Engine's MarketData type.
   *
   * @returns MarketDataSnapshot with all MVP assets
   */
  async getSnapshot(): Promise<MarketDataSnapshot> {
    const prices: Record<string, NormalizedPrice> = {};
    const errors: string[] = [];

    for (const asset of MVP_ASSETS) {
      try {
        const result = await this.getPrice(asset);
        prices[asset] = result.price;
      } catch (err) {
        errors.push(`${asset}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const sources = [...new Set(Object.values(prices).map((p) => p.source))];
    const source = sources.length === 1 ? sources[0] : sources.join('+') || this.config.primaryProvider;

    return {
      prices,
      source,
      fetchedAt: new Date(),
    };
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /** Clear the price and ticker caches */
  clearCache(): void {
    this.priceCache.clear();
    this.tickerCache.clear();
  }

  /** Evict all expired entries from both caches */
  evictExpired(): { prices: number; tickers: number } {
    return {
      prices: this.priceCache.evictExpired(),
      tickers: this.tickerCache.evictExpired(),
    };
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /** Subscribe to market data service events */
  subscribe(handler: MarketDataEventHandler): MarketDataUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Provider Access
  // ============================================================================

  /** Get a registered provider by name */
  getProvider(name: ProviderName): MarketDataProvider | undefined {
    return this.providers.get(name);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private emitEvent(
    type: MarketDataEvent['type'],
    asset: string | undefined,
    provider: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: MarketDataEvent = {
      id: `mde-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
      asset,
      provider,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Market Data Service with optional configuration.
 *
 * @example
 * ```typescript
 * const service = createMarketDataService();
 * service.start();
 *
 * const result = await service.getPrice('TON');
 * console.log(result.price.price); // 5.25
 *
 * const snapshot = await service.getSnapshot();
 * // Use directly with Strategy Engine:
 * await engine.execute({ strategyId: 'trend', agentId: 'agent-001', marketData: snapshot });
 * ```
 */
export function createMarketDataService(
  config?: Partial<MarketDataServiceConfig>,
  providers?: Partial<Record<ProviderName, MarketDataProvider>>
): DefaultMarketDataService {
  return new DefaultMarketDataService(config, providers);
}
