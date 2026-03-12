/**
 * TONAIAgent - Market Data Aggregator
 *
 * Aggregates price data from multiple TON DEX providers (DeDust, STON.fi, TONCO)
 * to provide reliable, manipulation-resistant pricing.
 *
 * Features:
 * - Multi-DEX price aggregation with configurable weighting
 * - Liquidity-weighted and volume-weighted price calculation
 * - Outlier detection and filtering
 * - Real-time polling with caching
 * - Event-driven updates
 *
 * Architecture:
 * ```
 *   DEX Connectors (DeDust, STON.fi, TONCO)
 *         |
 *   Market Data Aggregator (this module)
 *         |
 *   Price Engine / Strategy Engine
 * ```
 *
 * @see Issue #211 — Live Market Data Connectors (TON DEX)
 */

import type {
  TonDexProvider,
  TonDexProviderName,
  AggregatorConfig,
  AggregatedPrice,
  DexPriceQuote,
  LiquidityPool,
  TradingPair,
  TonDexEvent,
  TonDexEventHandler,
  TonDexUnsubscribe,
} from './types';
import { TonDexError } from './types';
import { DedustProvider } from './dedust';
import { StonfiProvider } from './stonfi';
import { ToncoProvider } from './tonco';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_AGGREGATOR_CONFIG: AggregatorConfig = {
  providers: ['dedust', 'stonfi', 'tonco'],
  aggregationMethod: 'liquidity_weighted',
  minLiquidityUsd: 1000,
  maxSpreadPercent: 10,
  cacheTtlSeconds: 10,
  pollingIntervalMs: 5000,
};

// ============================================================================
// Market Data Aggregator
// ============================================================================

/**
 * MarketDataAggregator — aggregates price data from multiple TON DEX providers.
 *
 * This provides a unified view of TON DeFi market data, preventing:
 * - Price manipulation from single sources
 * - Low liquidity distortions
 * - Stale data issues
 *
 * @example
 * ```typescript
 * const aggregator = createMarketDataAggregator();
 * aggregator.start();
 *
 * // Get aggregated price
 * const price = await aggregator.getAggregatedPrice('TON');
 * console.log(price.priceUsd);        // Weighted average price
 * console.log(price.spreadPercent);   // Price spread across DEXs
 * console.log(price.quotes);          // Individual DEX quotes
 *
 * // Get all trading pairs
 * const pairs = await aggregator.getTradingPairs();
 * ```
 */
export class MarketDataAggregator {
  private readonly config: AggregatorConfig;
  private readonly providers: Map<TonDexProviderName, TonDexProvider>;
  private readonly priceCache: Map<string, { price: AggregatedPrice; expiresAt: number }>;
  private readonly eventHandlers = new Set<TonDexEventHandler>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(config: Partial<AggregatorConfig> = {}) {
    this.config = { ...DEFAULT_AGGREGATOR_CONFIG, ...config };
    this.providers = new Map();
    this.priceCache = new Map();

    // Initialize providers based on config
    this.initializeProviders();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Starts the aggregator, enabling automatic polling for price updates.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.emitEvent('provider.connected', undefined, { providers: this.config.providers });

    // Start polling if interval is set
    if (this.config.pollingIntervalMs > 0) {
      this.pollingInterval = setInterval(
        () => this.pollPrices(),
        this.config.pollingIntervalMs
      );
    }
  }

  /**
   * Stops the aggregator and clears all caches.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.priceCache.clear();
    this.emitEvent('provider.disconnected', undefined, {});
  }

  /**
   * Returns whether the aggregator is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Price Aggregation
  // ============================================================================

  /**
   * Gets the aggregated price for a token from all DEX providers.
   *
   * @param token - Token symbol (e.g., "TON", "USDT")
   * @returns Aggregated price with individual quotes
   */
  async getAggregatedPrice(token: string): Promise<AggregatedPrice> {
    const normalizedToken = token.toUpperCase();
    const cacheKey = `price:${normalizedToken}`;

    // Check cache
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.price;
    }

    // Fetch quotes from all providers in parallel
    const quotes = await this.fetchQuotesFromAllProviders(normalizedToken);

    if (quotes.length === 0) {
      throw new TonDexError(
        `No price quotes available for token '${token}'`,
        'INSUFFICIENT_LIQUIDITY',
        undefined,
        { token }
      );
    }

    // Filter out low-liquidity quotes
    const validQuotes = quotes.filter(q => q.liquidityUsd >= this.config.minLiquidityUsd);

    if (validQuotes.length === 0) {
      throw new TonDexError(
        `All quotes for token '${token}' have insufficient liquidity`,
        'INSUFFICIENT_LIQUIDITY',
        undefined,
        { token, minLiquidity: this.config.minLiquidityUsd }
      );
    }

    // Calculate aggregated price
    const aggregatedPrice = this.calculateAggregatedPrice(normalizedToken, validQuotes);

    // Check for anomalies
    if (aggregatedPrice.spreadPercent > this.config.maxSpreadPercent) {
      this.emitEvent('anomaly.detected', undefined, {
        token: normalizedToken,
        spreadPercent: aggregatedPrice.spreadPercent,
        maxAllowed: this.config.maxSpreadPercent,
        quotes: validQuotes,
      });
    }

    // Cache result
    this.priceCache.set(cacheKey, {
      price: aggregatedPrice,
      expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
    });

    this.emitEvent('aggregation.completed', undefined, {
      token: normalizedToken,
      price: aggregatedPrice.priceUsd,
      quoteCount: validQuotes.length,
    });

    return aggregatedPrice;
  }

  /**
   * Gets all available trading pairs across DEXs.
   */
  async getTradingPairs(): Promise<TradingPair[]> {
    const pairMap = new Map<string, TradingPair>();

    // Fetch pools from all providers
    const poolPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        return await provider.getPools();
      } catch (err) {
        this.emitEvent('provider.error', provider.getName(), {
          error: String(err),
          operation: 'getPools',
        });
        return [];
      }
    });

    const allPoolArrays = await Promise.all(poolPromises);
    const allPools = allPoolArrays.flat();

    // Build trading pairs from pools
    for (const pool of allPools) {
      const pairKey = this.formatPairKey(pool.token0.symbol, pool.token1.symbol);

      if (pairMap.has(pairKey)) {
        // Merge with existing pair
        const existing = pairMap.get(pairKey)!;
        existing.volume24hUsd += pool.volume24hUsd;
        existing.liquidityUsd += pool.tvlUsd;
        if (!existing.availableOn.includes(pool.dex)) {
          existing.availableOn.push(pool.dex);
        }
      } else {
        // Create new pair
        pairMap.set(pairKey, {
          base: pool.token0.symbol,
          quote: pool.token1.symbol,
          pair: pairKey,
          price: 0, // Will be updated if price is calculable
          volume24hUsd: pool.volume24hUsd,
          liquidityUsd: pool.tvlUsd,
          priceChange24h: 0,
          availableOn: [pool.dex],
          timestamp: this.nowSeconds(),
        });
      }
    }

    return Array.from(pairMap.values());
  }

  /**
   * Gets all liquidity pools across DEXs.
   */
  async getAllPools(): Promise<LiquidityPool[]> {
    const poolPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        return await provider.getPools();
      } catch (err) {
        this.emitEvent('provider.error', provider.getName(), {
          error: String(err),
          operation: 'getPools',
        });
        return [];
      }
    });

    const allPoolArrays = await Promise.all(poolPromises);
    return allPoolArrays.flat();
  }

  /**
   * Gets liquidity pools for a specific token across all DEXs.
   */
  async getPoolsForToken(token: string): Promise<LiquidityPool[]> {
    const normalizedToken = token.toUpperCase();

    const poolPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        return await provider.getPoolsForToken(normalizedToken);
      } catch (err) {
        this.emitEvent('provider.error', provider.getName(), {
          error: String(err),
          operation: 'getPoolsForToken',
          token: normalizedToken,
        });
        return [];
      }
    });

    const allPoolArrays = await Promise.all(poolPromises);
    return allPoolArrays.flat();
  }

  /**
   * Performs a health check on all providers.
   */
  async healthCheck(): Promise<Record<TonDexProviderName, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results as Record<TonDexProviderName, boolean>;
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to aggregator events.
   */
  subscribe(handler: TonDexEventHandler): TonDexUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Provider Access
  // ============================================================================

  /**
   * Gets a specific provider by name.
   */
  getProvider(name: TonDexProviderName): TonDexProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Gets all active providers.
   */
  getProviders(): TonDexProvider[] {
    return Array.from(this.providers.values());
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Initializes providers based on configuration.
   */
  private initializeProviders(): void {
    for (const name of this.config.providers) {
      switch (name) {
        case 'dedust':
          this.providers.set('dedust', new DedustProvider());
          break;
        case 'stonfi':
          this.providers.set('stonfi', new StonfiProvider());
          break;
        case 'tonco':
          this.providers.set('tonco', new ToncoProvider());
          break;
      }
    }
  }

  /**
   * Fetches price quotes from all providers for a token.
   */
  private async fetchQuotesFromAllProviders(token: string): Promise<DexPriceQuote[]> {
    const quotes: DexPriceQuote[] = [];

    const quotePromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const quote = await provider.getPrice(token);
        return quote;
      } catch (err) {
        this.emitEvent('provider.error', provider.getName(), {
          error: String(err),
          operation: 'getPrice',
          token,
        });
        return null;
      }
    });

    const results = await Promise.all(quotePromises);

    for (const result of results) {
      if (result) {
        quotes.push(result);
      }
    }

    return quotes;
  }

  /**
   * Calculates the aggregated price from multiple quotes.
   */
  private calculateAggregatedPrice(token: string, quotes: DexPriceQuote[]): AggregatedPrice {
    let aggregatedPriceUsd: number;
    const totalLiquidity = quotes.reduce((sum, q) => sum + q.liquidityUsd, 0);
    const totalVolume = quotes.reduce((sum, q) => sum + q.volume24hUsd, 0);

    switch (this.config.aggregationMethod) {
      case 'liquidity_weighted':
        aggregatedPriceUsd = this.liquidityWeightedPrice(quotes);
        break;
      case 'volume_weighted':
        aggregatedPriceUsd = this.volumeWeightedPrice(quotes);
        break;
      case 'median':
        aggregatedPriceUsd = this.medianPrice(quotes);
        break;
      default:
        aggregatedPriceUsd = this.liquidityWeightedPrice(quotes);
    }

    // Calculate spread
    const prices = quotes.map(q => q.priceUsd);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = aggregatedPriceUsd;
    const spreadPercent = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;

    return {
      asset: token,
      priceUsd: aggregatedPriceUsd,
      quotes,
      totalLiquidityUsd: totalLiquidity,
      totalVolume24hUsd: totalVolume,
      aggregationMethod: this.config.aggregationMethod,
      spreadPercent,
      timestamp: this.nowSeconds(),
    };
  }

  /**
   * Calculates liquidity-weighted average price.
   */
  private liquidityWeightedPrice(quotes: DexPriceQuote[]): number {
    const totalLiquidity = quotes.reduce((sum, q) => sum + q.liquidityUsd, 0);
    if (totalLiquidity === 0) return quotes[0]?.priceUsd ?? 0;

    let weightedSum = 0;
    for (const quote of quotes) {
      weightedSum += quote.priceUsd * (quote.liquidityUsd / totalLiquidity);
    }

    return weightedSum;
  }

  /**
   * Calculates volume-weighted average price.
   */
  private volumeWeightedPrice(quotes: DexPriceQuote[]): number {
    const totalVolume = quotes.reduce((sum, q) => sum + q.volume24hUsd, 0);
    if (totalVolume === 0) return this.liquidityWeightedPrice(quotes);

    let weightedSum = 0;
    for (const quote of quotes) {
      weightedSum += quote.priceUsd * (quote.volume24hUsd / totalVolume);
    }

    return weightedSum;
  }

  /**
   * Calculates median price.
   */
  private medianPrice(quotes: DexPriceQuote[]): number {
    const prices = quotes.map(q => q.priceUsd).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);

    if (prices.length % 2 === 0) {
      return (prices[mid - 1] + prices[mid]) / 2;
    }

    return prices[mid];
  }

  /**
   * Polls prices for common tokens (called by interval).
   */
  private async pollPrices(): Promise<void> {
    const commonTokens = ['TON', 'USDT', 'USDC', 'NOT'];

    for (const token of commonTokens) {
      try {
        await this.getAggregatedPrice(token);
      } catch {
        // Errors are already emitted via events
      }
    }
  }

  /**
   * Formats a pair key for consistent storage.
   */
  private formatPairKey(token0: string, token1: string): string {
    const [base, quote] = [token0.toUpperCase(), token1.toUpperCase()].sort();
    return `${base}/${quote}`;
  }

  /**
   * Returns current UNIX timestamp in seconds.
   */
  private nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Emits an event to all subscribers.
   */
  private emitEvent(
    type: TonDexEvent['type'],
    provider: TonDexProviderName | undefined,
    data: Record<string, unknown>
  ): void {
    const event: TonDexEvent = {
      id: `tde-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
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
 * Create a Market Data Aggregator with optional configuration.
 *
 * @example
 * ```typescript
 * const aggregator = createMarketDataAggregator();
 * aggregator.start();
 *
 * const price = await aggregator.getAggregatedPrice('TON');
 * console.log(price.priceUsd);        // 5.25
 * console.log(price.spreadPercent);   // 0.5 (0.5% spread across DEXs)
 *
 * const pairs = await aggregator.getTradingPairs();
 * console.log(pairs.length);          // Number of available trading pairs
 * ```
 */
export function createMarketDataAggregator(
  config?: Partial<AggregatorConfig>
): MarketDataAggregator {
  return new MarketDataAggregator(config);
}
