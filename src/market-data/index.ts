/**
 * TONAIAgent - Market Data Layer v1
 *
 * Unified system for fetching, normalizing, caching, and distributing real-time
 * cryptocurrency market data to agents and strategies.
 *
 * Architecture:
 * ```
 *   External APIs (CoinGecko, Binance)
 *         |
 *   Market Data Providers     ← CoinGeckoProvider, BinanceProvider
 *         |
 *   Data Normalizer           ← Built into each provider
 *         |
 *   Cache Layer               ← MarketDataCache (30s TTL)
 *         |
 *   Market Data Service       ← DefaultMarketDataService
 *         |
 *   Strategy Engine           ← Issue #180
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
