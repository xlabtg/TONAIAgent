/**
 * TONAIAgent - Market Data Layer Types
 *
 * Type definitions for the Market Data Layer that sits between external data providers
 * and the Strategy Engine, providing normalized, cached price data to all agents.
 *
 * Architecture:
 * ```
 *   External APIs (CoinGecko, Binance)
 *         |
 *   Market Data Providers
 *         |
 *   Data Normalizer
 *         |
 *   Cache Layer
 *         |
 *   Market Data Service
 *         |
 *   Strategy Engine
 * ```
 */

// ============================================================================
// Asset Types
// ============================================================================

/**
 * Supported asset symbols for the MVP.
 * Stored in config/assets.ts for easy extension.
 */
export type SupportedAsset = 'BTC' | 'ETH' | 'TON' | 'SOL' | 'USDT';

/** Normalized price data for a single asset returned by any provider */
export interface NormalizedPrice {
  /** Asset symbol (e.g. "BTC", "TON") */
  asset: string;
  /** Current price in USD */
  price: number;
  /** 24-hour trading volume in USD */
  volume24h: number;
  /** Price change percentage over 24 hours */
  priceChange24h?: number;
  /** Market capitalization in USD */
  marketCap?: number;
  /** UNIX timestamp (seconds) when this data was fetched from the provider */
  timestamp: number;
  /** Identifier of the provider that delivered this data (e.g. "coingecko", "binance") */
  source: string;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Supported data provider identifiers.
 * Determines which provider implementation is used.
 */
export type ProviderName = 'coingecko' | 'binance';

/** Configuration for a market data provider */
export interface ProviderConfig {
  /** Provider name identifier */
  name: ProviderName;
  /** Base URL override (defaults to public API endpoint) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Maximum number of retries on transient failure (default: 2) */
  maxRetries?: number;
}

// ============================================================================
// Ticker Types
// ============================================================================

/**
 * Full ticker information for an asset including order book data.
 * Superset of NormalizedPrice with additional exchange-level fields.
 */
export interface Ticker {
  /** Asset symbol */
  asset: string;
  /** Current price in USD */
  price: number;
  /** Highest price in the last 24 hours */
  high24h?: number;
  /** Lowest price in the last 24 hours */
  low24h?: number;
  /** 24-hour trading volume in USD */
  volume24h: number;
  /** 24-hour price change percent */
  priceChange24h?: number;
  /** Market cap in USD */
  marketCap?: number;
  /** UNIX timestamp (seconds) */
  timestamp: number;
  /** Data provider name */
  source: string;
}

// ============================================================================
// Cache Types
// ============================================================================

/** A single cache entry wrapping a value with an expiry time */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** UNIX timestamp (ms) when this entry expires */
  expiresAt: number;
}

/** Configuration for the in-memory cache */
export interface CacheConfig {
  /** Cache TTL in seconds (default: 30) */
  ttlSeconds: number;
  /** Maximum number of entries per provider (default: 100) */
  maxEntries: number;
}

// ============================================================================
// Market Data Service Types
// ============================================================================

/** Configuration for the Market Data Service */
export interface MarketDataServiceConfig {
  /** Primary data provider name (default: "coingecko") */
  primaryProvider: ProviderName;
  /** Secondary provider name used as fallback (default: "binance") */
  fallbackProvider?: ProviderName;
  /** Cache configuration */
  cache: CacheConfig;
  /** Provider-specific configurations */
  providers?: Partial<Record<ProviderName, ProviderConfig>>;
}

/** Result returned by the Market Data Service for a price request */
export interface PriceResult {
  /** Normalized price data */
  price: NormalizedPrice;
  /** Whether this result was served from cache */
  fromCache: boolean;
  /** Whether the fallback provider was used */
  usedFallback: boolean;
}

/** Snapshot of all supported asset prices, compatible with Strategy Engine MarketData */
export interface MarketDataSnapshot {
  /** Map of asset symbol → normalized price */
  prices: Record<string, NormalizedPrice>;
  /** Identifier of the provider that delivered this snapshot */
  source: string;
  /** Date when this snapshot was assembled */
  fetchedAt: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/** Market data service event types */
export type MarketDataEventType =
  | 'service.started'
  | 'service.stopped'
  | 'price.fetched'
  | 'price.cached'
  | 'price.cache_hit'
  | 'provider.error'
  | 'provider.fallback';

/** A market data service event */
export interface MarketDataEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: MarketDataEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related asset (if applicable) */
  asset?: string;
  /** Related provider name (if applicable) */
  provider?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type MarketDataEventHandler = (event: MarketDataEvent) => void;

/** Unsubscribe function */
export type MarketDataUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for market data operations */
export type MarketDataErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'ASSET_NOT_SUPPORTED'
  | 'FETCH_TIMEOUT'
  | 'ALL_PROVIDERS_FAILED';

/** Structured error for market data operations */
export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly code: MarketDataErrorCode,
    public readonly provider?: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

// ============================================================================
// Forward Declaration (MarketDataProvider referenced in service types)
// ============================================================================

/**
 * Import-compatible forward declaration.
 * The actual MarketDataProvider interface is defined in ./interface.ts
 */
export interface MarketDataProvider {
  getName(): ProviderName;
  getPrice(asset: string): Promise<NormalizedPrice>;
  getTicker(asset: string): Promise<Ticker>;
  getSupportedAssets(): string[];
}
