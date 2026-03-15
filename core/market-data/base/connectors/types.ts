/**
 * TONAIAgent - TON DEX Connector Types
 *
 * Type definitions for TON DeFi DEX connectors (DeDust, STON.fi, TONCO).
 * These types extend the base Market Data Layer to support:
 * - Liquidity pool data
 * - Swap events and trading history
 * - DEX-specific pricing with aggregation
 *
 * @see Issue #211 — Live Market Data Connectors (TON DEX)
 */

// ============================================================================
// TON DEX Provider Names
// ============================================================================

/**
 * Supported TON DEX provider identifiers.
 */
export type TonDexProviderName = 'dedust' | 'stonfi' | 'tonco';

// ============================================================================
// Liquidity Pool Types
// ============================================================================

/**
 * Represents a liquidity pool on a TON DEX.
 */
export interface LiquidityPool {
  /** Unique pool identifier (DEX-specific address or ID) */
  poolId: string;
  /** DEX that hosts this pool */
  dex: TonDexProviderName;
  /** First token in the pair */
  token0: TokenInfo;
  /** Second token in the pair */
  token1: TokenInfo;
  /** Reserve amount of token0 */
  reserve0: string;
  /** Reserve amount of token1 */
  reserve1: string;
  /** Total Value Locked in USD */
  tvlUsd: number;
  /** Swap fee percentage (e.g., 0.3 for 0.3%) */
  feePercent: number;
  /** 24-hour trading volume in USD */
  volume24hUsd: number;
  /** Pool APR/APY if available */
  apr?: number;
  /** Timestamp when data was fetched */
  timestamp: number;
}

/**
 * Token information for pool pairs.
 */
export interface TokenInfo {
  /** Token symbol (e.g., "TON", "USDT") */
  symbol: string;
  /** Token name (e.g., "Toncoin", "Tether USD") */
  name: string;
  /** Token contract address (jetton master address for TON) */
  address: string;
  /** Number of decimals */
  decimals: number;
}

// ============================================================================
// Trading Pair Types
// ============================================================================

/**
 * Represents a trading pair with aggregated data across DEXs.
 */
export interface TradingPair {
  /** Base token symbol (e.g., "TON") */
  base: string;
  /** Quote token symbol (e.g., "USDT") */
  quote: string;
  /** Pair identifier (e.g., "TON/USDT") */
  pair: string;
  /** Current price (base in terms of quote) */
  price: number;
  /** 24-hour trading volume in USD */
  volume24hUsd: number;
  /** Total liquidity across all DEXs in USD */
  liquidityUsd: number;
  /** Price change percentage over 24 hours */
  priceChange24h: number;
  /** DEXs where this pair is available */
  availableOn: TonDexProviderName[];
  /** Timestamp when data was fetched */
  timestamp: number;
}

// ============================================================================
// Swap Event Types
// ============================================================================

/**
 * Represents a swap event (trade) on a TON DEX.
 */
export interface SwapEvent {
  /** Transaction hash */
  txHash: string;
  /** DEX where the swap occurred */
  dex: TonDexProviderName;
  /** Pool where the swap occurred */
  poolId: string;
  /** Token sold */
  tokenIn: string;
  /** Amount sold (in token units, as string for precision) */
  amountIn: string;
  /** Token received */
  tokenOut: string;
  /** Amount received (in token units, as string for precision) */
  amountOut: string;
  /** Swap value in USD */
  valueUsd: number;
  /** Sender address */
  sender: string;
  /** Unix timestamp of the swap */
  timestamp: number;
}

// ============================================================================
// Price Quote Types
// ============================================================================

/**
 * Price quote from a single DEX.
 */
export interface DexPriceQuote {
  /** DEX providing this quote */
  dex: TonDexProviderName;
  /** Asset symbol */
  asset: string;
  /** Price in USD */
  priceUsd: number;
  /** Available liquidity in USD */
  liquidityUsd: number;
  /** 24-hour volume in USD */
  volume24hUsd: number;
  /** Confidence score (0-1) based on liquidity and volume */
  confidence: number;
  /** Timestamp when quote was fetched */
  timestamp: number;
}

/**
 * Aggregated price from multiple DEXs.
 */
export interface AggregatedPrice {
  /** Asset symbol */
  asset: string;
  /** Weighted average price in USD */
  priceUsd: number;
  /** Individual quotes from each DEX */
  quotes: DexPriceQuote[];
  /** Total liquidity across all DEXs in USD */
  totalLiquidityUsd: number;
  /** Total 24-hour volume across all DEXs in USD */
  totalVolume24hUsd: number;
  /** Aggregation method used */
  aggregationMethod: 'liquidity_weighted' | 'volume_weighted' | 'median';
  /** Price spread across DEXs (max - min) / avg */
  spreadPercent: number;
  /** Timestamp when aggregation was performed */
  timestamp: number;
}

// ============================================================================
// Historical Data Types
// ============================================================================

/**
 * OHLCV candle data for charting and backtesting.
 */
export interface OHLCVCandle {
  /** Candle open time (Unix timestamp) */
  openTime: number;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close price */
  close: number;
  /** Trading volume in base asset */
  volume: number;
  /** Trading volume in USD */
  volumeUsd: number;
  /** Candle close time (Unix timestamp) */
  closeTime: number;
}

/**
 * Supported candle intervals.
 */
export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

// ============================================================================
// TON DEX Provider Interface
// ============================================================================

/**
 * Interface for TON DEX data providers.
 * Extends basic price fetching with DEX-specific capabilities.
 */
export interface TonDexProvider {
  /**
   * Returns the provider's unique identifier.
   */
  getName(): TonDexProviderName;

  /**
   * Returns the list of supported token symbols.
   */
  getSupportedTokens(): Promise<string[]>;

  /**
   * Fetches the current price for a token in USD.
   */
  getPrice(token: string): Promise<DexPriceQuote>;

  /**
   * Fetches all liquidity pools.
   */
  getPools(): Promise<LiquidityPool[]>;

  /**
   * Fetches a specific liquidity pool by ID.
   */
  getPool(poolId: string): Promise<LiquidityPool | null>;

  /**
   * Fetches pools containing a specific token.
   */
  getPoolsForToken(token: string): Promise<LiquidityPool[]>;

  /**
   * Fetches recent swap events.
   * @param limit - Maximum number of events to return (default: 100)
   */
  getRecentSwaps(limit?: number): Promise<SwapEvent[]>;

  /**
   * Fetches swap events for a specific pool.
   */
  getSwapsForPool(poolId: string, limit?: number): Promise<SwapEvent[]>;

  /**
   * Fetches historical OHLCV candles.
   */
  getCandles(
    token: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number
  ): Promise<OHLCVCandle[]>;

  /**
   * Checks if the provider is available and responsive.
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// TON DEX Provider Configuration
// ============================================================================

/**
 * Configuration for a TON DEX provider.
 */
export interface TonDexProviderConfig {
  /** Provider name */
  name: TonDexProviderName;
  /** Base URL for API requests (optional override) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Maximum number of retries (default: 2) */
  maxRetries?: number;
  /** Whether to enable debug logging */
  debug?: boolean;
  /** TON RPC endpoint for on-chain queries */
  tonRpcEndpoint?: string;
}

// ============================================================================
// Aggregator Configuration
// ============================================================================

/**
 * Configuration for the Market Data Aggregator.
 */
export interface AggregatorConfig {
  /** Providers to aggregate from */
  providers: TonDexProviderName[];
  /** Default aggregation method */
  aggregationMethod: 'liquidity_weighted' | 'volume_weighted' | 'median';
  /** Minimum liquidity threshold in USD to include a quote */
  minLiquidityUsd: number;
  /** Maximum allowed price spread before flagging anomaly */
  maxSpreadPercent: number;
  /** Cache TTL in seconds for aggregated prices */
  cacheTtlSeconds: number;
  /** Polling interval in milliseconds for real-time updates */
  pollingIntervalMs: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by TON DEX providers and aggregator.
 */
export type TonDexEventType =
  | 'provider.connected'
  | 'provider.disconnected'
  | 'provider.error'
  | 'price.updated'
  | 'pool.updated'
  | 'swap.detected'
  | 'aggregation.completed'
  | 'anomaly.detected';

/**
 * TON DEX event payload.
 */
export interface TonDexEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: TonDexEventType;
  /** Timestamp */
  timestamp: Date;
  /** Source provider (if applicable) */
  provider?: TonDexProviderName;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Event handler callback.
 */
export type TonDexEventHandler = (event: TonDexEvent) => void;

/**
 * Unsubscribe function.
 */
export type TonDexUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for TON DEX operations.
 */
export type TonDexErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'INVALID_RESPONSE'
  | 'TOKEN_NOT_SUPPORTED'
  | 'POOL_NOT_FOUND'
  | 'FETCH_TIMEOUT'
  | 'RPC_ERROR'
  | 'AGGREGATION_FAILED'
  | 'INSUFFICIENT_LIQUIDITY';

/**
 * Structured error for TON DEX operations.
 */
export class TonDexError extends Error {
  constructor(
    message: string,
    public readonly code: TonDexErrorCode,
    public readonly provider?: TonDexProviderName,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TonDexError';
  }
}
