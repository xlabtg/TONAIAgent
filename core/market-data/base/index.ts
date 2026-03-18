/**
 * TONAIAgent - Market Data Layer v2
 *
 * Unified system for fetching, normalizing, caching, and distributing real-time
 * cryptocurrency market data to agents and strategies.
 *
 * **v2 Features (Issue #211):**
 * - TON DEX connectors: DeDust, STON.fi, TONCO
 * - Multi-DEX price aggregation with liquidity/volume weighting
 * - Liquidity pool data and trading pairs
 * - Swap event tracking
 * - Outlier detection and price manipulation protection
 *
 * Architecture:
 * ```
 *   External APIs                    TON DEX Protocols
 *   (CoinGecko, Binance)            (DeDust, STON.fi, TONCO)
 *         |                                   |
 *   Market Data Providers            TON DEX Connectors
 *         |                                   |
 *   Data Normalizer                  Market Data Aggregator
 *         |                                   |
 *   Cache Layer                       ← MarketDataCache (10s TTL)
 *         |                                   |
 *   Market Data Service  ←─────────── Aggregated Price Engine
 *         |
 *   Strategy Engine
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createMarketDataService,
 * } from '@tonaiagent/core/market-data';
 *
 * // 1. Create and start the service
 * const service = createMarketDataService();
 * service.start();
 *
 * // 2. Fetch a single asset price
 * const result = await service.getPrice('BTC');
 * console.log(result.price); // { asset: 'BTC', price: 65000, volume24h: ..., source: 'coingecko' }
 * console.log(result.fromCache); // false (first call)
 *
 * // 3. Fetch a full snapshot (all MVP assets) — compatible with Strategy Engine
 * const snapshot = await service.getSnapshot();
 * console.log(snapshot.prices['TON'].price); // 5.25
 * ```
 *
 * ## TON DEX Integration (v2)
 *
 * ```typescript
 * import {
 *   createMarketDataAggregator,
 *   createDedustProvider,
 *   createStonfiProvider,
 *   createToncoProvider,
 * } from '@tonaiagent/core/market-data';
 *
 * // Use the aggregator for multi-DEX data
 * const aggregator = createMarketDataAggregator();
 * aggregator.start();
 *
 * // Get aggregated price from all TON DEXs
 * const price = await aggregator.getAggregatedPrice('TON');
 * console.log(price.priceUsd);        // Weighted average price
 * console.log(price.spreadPercent);   // Price spread across DEXs
 * console.log(price.quotes);          // Individual DEX quotes
 *
 * // Get all liquidity pools
 * const pools = await aggregator.getAllPools();
 *
 * // Get trading pairs
 * const pairs = await aggregator.getTradingPairs();
 * ```
 *
 * ## Integration with Strategy Engine
 *
 * ```typescript
 * import { createMarketDataService } from '@tonaiagent/core/market-data';
 * import {
 *   createStrategyRegistry,
 *   createStrategyLoader,
 *   createStrategyExecutionEngine,
 * } from '@tonaiagent/core/strategy-engine';
 *
 * const marketDataService = createMarketDataService();
 * marketDataService.start();
 *
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 * loader.loadBuiltIns();
 *
 * const engine = createStrategyExecutionEngine(registry);
 * engine.start();
 *
 * // Fetch live market data and pass to strategy engine
 * const snapshot = await marketDataService.getSnapshot();
 *
 * const result = await engine.execute({
 *   strategyId: 'trend',
 *   agentId: 'agent-001',
 *   marketData: snapshot,
 * });
 *
 * console.log(result.signal); // { action: 'BUY', asset: 'TON', ... }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Asset types
  SupportedAsset,
  NormalizedPrice,
  // Provider types
  ProviderName,
  ProviderConfig,
  // Ticker types
  Ticker,
  // Cache types
  CacheEntry,
  CacheConfig,
  // Service types
  MarketDataServiceConfig,
  PriceResult,
  MarketDataSnapshot,
  // Event types
  MarketDataEventType,
  MarketDataEvent,
  MarketDataEventHandler,
  MarketDataUnsubscribe,
  // Error types
  MarketDataErrorCode,
  // Provider interface forward declaration
  MarketDataProvider,
} from './types';

export { MarketDataError } from './types';

// ============================================================================
// Provider Interface & Base Class
// ============================================================================

export { BaseMarketDataProvider } from './interface';

// ============================================================================
// Cache
// ============================================================================

export { MarketDataCache, DEFAULT_CACHE_CONFIG } from './cache';

// ============================================================================
// Providers
// ============================================================================

export { CoinGeckoProvider, createCoinGeckoProvider } from './providers/coingecko';
export { BinanceProvider, createBinanceProvider } from './providers/binance';

// ============================================================================
// Market Data Service
// ============================================================================

export {
  DefaultMarketDataService,
  createMarketDataService,
  DEFAULT_SERVICE_CONFIG,
} from './service';

// ============================================================================
// Asset Configuration
// ============================================================================

export {
  MVP_ASSETS,
  COINGECKO_ASSET_IDS,
  BINANCE_SYMBOLS,
  BASELINE_PRICES,
} from './config/assets';

// ============================================================================
// TON DEX Connectors (Issue #211)
// ============================================================================

export type {
  // TON DEX Provider types
  TonDexProviderName,
  TonDexProvider,
  TonDexProviderConfig,
  // Pool types
  LiquidityPool,
  TokenInfo,
  TradingPair,
  // Price types
  DexPriceQuote,
  AggregatedPrice,
  // Swap types
  SwapEvent,
  // Historical data types
  OHLCVCandle,
  CandleInterval,
  // Aggregator types
  AggregatorConfig,
  // Event types
  TonDexEventType,
  TonDexEvent,
  TonDexEventHandler,
  TonDexUnsubscribe,
  // Error types
  TonDexErrorCode,
} from './connectors';

export { TonDexError } from './connectors';

// TON DEX Providers
export {
  BaseTonDexProvider,
  DedustProvider,
  createDedustProvider,
  StonfiProvider,
  createStonfiProvider,
  ToncoProvider,
  createToncoProvider,
} from './connectors';

// Market Data Aggregator
export {
  MarketDataAggregator,
  createMarketDataAggregator,
  DEFAULT_AGGREGATOR_CONFIG,
} from './connectors';

// ============================================================================
// Real-Time Market Data Streaming (Issue #251)
// ============================================================================

export {
  MarketDataStream,
  createMarketDataStream,
  DEFAULT_STREAM_CONFIG,
} from './streaming';

export type {
  PriceTick,
  PriceTickHandler,
  StreamUnsubscribe,
  MarketDataStreamConfig,
  MarketDataStreamEvent,
  MarketDataStreamEventHandler,
  MarketDataStreamEventType,
} from './streaming';
