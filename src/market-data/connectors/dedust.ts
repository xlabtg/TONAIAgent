/**
 * TONAIAgent - DeDust DEX Connector
 *
 * Fetches market data from DeDust, one of the leading DEXs on TON blockchain.
 * DeDust provides AMM-style pools for token swaps with concentrated liquidity.
 *
 * Features:
 * - Pool discovery and liquidity data
 * - Real-time price extraction
 * - Swap routing information
 * - Trading history
 *
 * SDK Reference: https://github.com/dedust-io/sdk
 *
 * @see Issue #211 — Live Market Data Connectors (TON DEX)
 */

import { BaseTonDexProvider } from './base';
import type {
  TonDexProviderConfig,
  DexPriceQuote,
  LiquidityPool,
  SwapEvent,
  OHLCVCandle,
  CandleInterval,
  TokenInfo,
} from './types';
import { TonDexError } from './types';

// ============================================================================
// DeDust API Response Types
// ============================================================================

/** DeDust pool data from API */
interface DedustPoolData {
  address: string;
  lt: string;
  totalSupply: string;
  type: string;
  tradeFee: string;
  assets: DedustAsset[];
  reserves: string[];
  fees: string[];
  volume: DedustVolume;
  lastPrice?: string;
  tvlUsd?: number;
  aprEstimate?: number;
}

/** DeDust asset information */
interface DedustAsset {
  type: string;
  address?: string;
  metadata?: {
    symbol?: string;
    name?: string;
    decimals?: number;
    image?: string;
  };
}

/** DeDust volume data */
interface DedustVolume {
  day: string;
  week: string;
  month: string;
}

/** DeDust trade/swap event */
interface DedustTradeEvent {
  txHash: string;
  poolAddress: string;
  assetIn: DedustAsset;
  assetOut: DedustAsset;
  amountIn: string;
  amountOut: string;
  sender: string;
  timestamp: number;
}

/** DeDust stats response */
interface DedustStats {
  tvlUsd: number;
  volume24hUsd: number;
  pools: number;
  trades24h: number;
}

// ============================================================================
// DeDust Provider Configuration
// ============================================================================

const DEFAULT_DEDUST_CONFIG: Partial<TonDexProviderConfig> = {
  name: 'dedust',
  baseUrl: 'https://api.dedust.io/v2',
  timeoutMs: 15_000,
  maxRetries: 2,
};

// Known token mappings for DeDust
const DEDUST_TOKEN_MAP: Record<string, string> = {
  TON: 'native',
  USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  USDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
  WTON: 'EQDQoc5M3Bh8eWFephi9bClhevelbZZvWhkqdo80XuY_0qXv',
  NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  DOGS: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS',
  HMSTR: 'EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo',
};

// ============================================================================
// DeDust Provider
// ============================================================================

/**
 * DedustProvider — fetches market data from DeDust DEX.
 *
 * Capabilities:
 * - Pool discovery and liquidity data
 * - Token price extraction with confidence scoring
 * - Swap event tracking
 * - Historical candle data (when available)
 *
 * @example
 * ```typescript
 * const provider = createDedustProvider();
 * const price = await provider.getPrice('TON');
 * // { dex: 'dedust', asset: 'TON', priceUsd: 5.25, liquidityUsd: 1000000, ... }
 *
 * const pools = await provider.getPools();
 * // Returns all DeDust liquidity pools
 * ```
 */
export class DedustProvider extends BaseTonDexProvider {
  private readonly baseUrl: string;
  private cachedTokens: string[] | null = null;
  private tokensCacheTime = 0;
  private readonly tokensCacheTtl = 300_000; // 5 minutes

  constructor(config: Partial<TonDexProviderConfig> = {}) {
    super({
      name: 'dedust',
      ...DEFAULT_DEDUST_CONFIG,
      ...config,
    });
    this.baseUrl = this.config.baseUrl ?? DEFAULT_DEDUST_CONFIG.baseUrl!;
  }

  getName() {
    return 'dedust' as const;
  }

  /**
   * Returns the list of supported token symbols.
   * Dynamically fetches from DeDust API and caches the result.
   */
  async getSupportedTokens(): Promise<string[]> {
    // Return cached tokens if fresh
    if (this.cachedTokens && Date.now() - this.tokensCacheTime < this.tokensCacheTtl) {
      return this.cachedTokens;
    }

    try {
      const pools = await this.fetchPools();
      const tokens = new Set<string>();

      // Add known tokens
      Object.keys(DEDUST_TOKEN_MAP).forEach(t => tokens.add(t));

      // Extract tokens from pools
      for (const pool of pools) {
        for (const asset of pool.assets) {
          const symbol = this.extractSymbol(asset);
          if (symbol) {
            tokens.add(symbol);
          }
        }
      }

      this.cachedTokens = Array.from(tokens);
      this.tokensCacheTime = Date.now();
      return this.cachedTokens;
    } catch (err) {
      // Fallback to known tokens on error
      this.log('Failed to fetch tokens, using fallback', { error: String(err) });
      return Object.keys(DEDUST_TOKEN_MAP);
    }
  }

  /**
   * Fetches the current price for a token in USD.
   */
  async getPrice(token: string): Promise<DexPriceQuote> {
    const normalizedToken = this.normalizeSymbol(token);

    return this.withRetry(async () => {
      // Find pools containing this token
      const pools = await this.getPoolsForToken(normalizedToken);

      if (pools.length === 0) {
        throw new TonDexError(
          `No liquidity pools found for token '${token}' on DeDust`,
          'TOKEN_NOT_SUPPORTED',
          'dedust',
          { token }
        );
      }

      // Aggregate price from pools with USD pairs (prefer USDT/USDC)
      let totalLiquidity = 0;
      let weightedPrice = 0;
      let totalVolume = 0;

      for (const pool of pools) {
        const quoteToken = this.getQuoteToken(pool, normalizedToken);
        if (!quoteToken) continue;

        const price = this.calculatePriceFromPool(pool, normalizedToken);
        if (price === null) continue;

        // Convert to USD if needed
        const priceUsd = await this.convertToUsd(price, quoteToken);
        if (priceUsd === null) continue;

        const poolLiquidity = pool.tvlUsd / 2; // Approximate token-side liquidity
        weightedPrice += priceUsd * poolLiquidity;
        totalLiquidity += poolLiquidity;
        totalVolume += pool.volume24hUsd;
      }

      if (totalLiquidity === 0) {
        throw new TonDexError(
          `Unable to determine price for token '${token}' on DeDust`,
          'INSUFFICIENT_LIQUIDITY',
          'dedust',
          { token, poolCount: pools.length }
        );
      }

      const finalPrice = weightedPrice / totalLiquidity;

      return {
        dex: 'dedust',
        asset: normalizedToken,
        priceUsd: finalPrice,
        liquidityUsd: totalLiquidity * 2, // Total pool liquidity
        volume24hUsd: totalVolume,
        confidence: this.calculateConfidence(totalLiquidity * 2, totalVolume),
        timestamp: this.nowSeconds(),
      };
    });
  }

  /**
   * Fetches all liquidity pools.
   */
  async getPools(): Promise<LiquidityPool[]> {
    return this.withRetry(async () => {
      const rawPools = await this.fetchPools();
      return rawPools.map(pool => this.normalizPool(pool)).filter((p): p is LiquidityPool => p !== null);
    });
  }

  /**
   * Fetches a specific liquidity pool by ID (address).
   */
  async getPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      const url = `${this.baseUrl}/pools/${poolId}`;
      const data = await this.fetchJson<DedustPoolData>(url);
      return this.normalizPool(data);
    } catch (err) {
      if (err instanceof TonDexError && err.code === 'INVALID_RESPONSE') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Fetches pools containing a specific token.
   */
  async getPoolsForToken(token: string): Promise<LiquidityPool[]> {
    const normalizedToken = this.normalizeSymbol(token);
    const pools = await this.getPools();

    return pools.filter(pool => {
      const symbols = [pool.token0.symbol, pool.token1.symbol].map(s => this.normalizeSymbol(s));
      return symbols.includes(normalizedToken);
    });
  }

  /**
   * Fetches recent swap events.
   */
  async getRecentSwaps(limit: number = 100): Promise<SwapEvent[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/trades?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<DedustTradeEvent[]>(url);
      return data.map(trade => this.normalizeSwapEvent(trade));
    });
  }

  /**
   * Fetches swap events for a specific pool.
   */
  async getSwapsForPool(poolId: string, limit: number = 100): Promise<SwapEvent[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/pools/${poolId}/trades?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<DedustTradeEvent[]>(url);
      return data.map(trade => this.normalizeSwapEvent(trade));
    });
  }

  /**
   * Fetches historical OHLCV candles.
   * Note: DeDust may have limited historical data availability.
   */
  async getCandles(
    token: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number
  ): Promise<OHLCVCandle[]> {
    // DeDust API may not support candles directly
    // Return empty array for now, can be enhanced with indexer data
    this.log('Candle data not directly available from DeDust API', { token, interval });
    return [];
  }

  /**
   * Checks if the provider is available and responsive.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/stats`;
      const data = await this.fetchJson<DedustStats>(url);
      return typeof data.tvlUsd === 'number' && data.tvlUsd > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Fetches raw pool data from DeDust API.
   */
  private async fetchPools(): Promise<DedustPoolData[]> {
    const url = `${this.baseUrl}/pools`;
    return this.fetchJson<DedustPoolData[]>(url);
  }

  /**
   * Normalizes a DeDust pool to the standard LiquidityPool format.
   */
  private normalizPool(pool: DedustPoolData): LiquidityPool | null {
    if (pool.assets.length < 2) return null;

    const token0 = this.normalizeAsset(pool.assets[0]);
    const token1 = this.normalizeAsset(pool.assets[1]);

    if (!token0 || !token1) return null;

    // Parse reserves
    const reserve0 = pool.reserves[0] ?? '0';
    const reserve1 = pool.reserves[1] ?? '0';

    // Parse fee (DeDust uses basis points, e.g., "30" = 0.3%)
    const feePercent = parseFloat(pool.tradeFee || '30') / 100;

    // Parse volume
    const volume24hUsd = parseFloat(pool.volume?.day || '0');

    return {
      poolId: pool.address,
      dex: 'dedust',
      token0,
      token1,
      reserve0,
      reserve1,
      tvlUsd: pool.tvlUsd ?? 0,
      feePercent,
      volume24hUsd,
      apr: pool.aprEstimate,
      timestamp: this.nowSeconds(),
    };
  }

  /**
   * Normalizes a DeDust asset to TokenInfo.
   */
  private normalizeAsset(asset: DedustAsset): TokenInfo | null {
    const symbol = this.extractSymbol(asset);
    if (!symbol) return null;

    return {
      symbol,
      name: asset.metadata?.name ?? symbol,
      address: asset.address ?? 'native',
      decimals: asset.metadata?.decimals ?? 9,
    };
  }

  /**
   * Extracts symbol from DeDust asset.
   */
  private extractSymbol(asset: DedustAsset): string | null {
    if (asset.type === 'native') return 'TON';
    if (asset.metadata?.symbol) return asset.metadata.symbol;

    // Try to find symbol from address
    if (asset.address) {
      for (const [symbol, addr] of Object.entries(DEDUST_TOKEN_MAP)) {
        if (addr === asset.address) return symbol;
      }
    }

    return null;
  }

  /**
   * Normalizes a DeDust trade event to SwapEvent.
   */
  private normalizeSwapEvent(trade: DedustTradeEvent): SwapEvent {
    return {
      txHash: trade.txHash,
      dex: 'dedust',
      poolId: trade.poolAddress,
      tokenIn: this.extractSymbol(trade.assetIn) ?? 'UNKNOWN',
      amountIn: trade.amountIn,
      tokenOut: this.extractSymbol(trade.assetOut) ?? 'UNKNOWN',
      amountOut: trade.amountOut,
      valueUsd: 0, // Would need price lookup
      sender: trade.sender,
      timestamp: trade.timestamp,
    };
  }

  /**
   * Gets the quote token from a pool for a given base token.
   */
  private getQuoteToken(pool: LiquidityPool, baseToken: string): string | null {
    const symbols = [pool.token0.symbol, pool.token1.symbol];
    const normalizedBase = this.normalizeSymbol(baseToken);

    for (const sym of symbols) {
      if (this.normalizeSymbol(sym) !== normalizedBase) {
        return sym;
      }
    }
    return null;
  }

  /**
   * Calculates price from pool reserves.
   */
  private calculatePriceFromPool(pool: LiquidityPool, token: string): number | null {
    const normalizedToken = this.normalizeSymbol(token);
    const isToken0 = this.normalizeSymbol(pool.token0.symbol) === normalizedToken;

    const reserve0 = parseFloat(pool.reserve0) / Math.pow(10, pool.token0.decimals);
    const reserve1 = parseFloat(pool.reserve1) / Math.pow(10, pool.token1.decimals);

    if (reserve0 === 0 || reserve1 === 0) return null;

    // Price = other_reserve / this_reserve
    return isToken0 ? reserve1 / reserve0 : reserve0 / reserve1;
  }

  /**
   * Converts price to USD based on quote token.
   */
  private async convertToUsd(price: number, quoteToken: string): Promise<number | null> {
    const normalizedQuote = this.normalizeSymbol(quoteToken);

    // Direct USD stablecoins
    if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(normalizedQuote)) {
      return price;
    }

    // For TON, we'd need another source for TON/USD
    // For now, use a placeholder (in production, integrate with external oracle)
    if (normalizedQuote === 'TON') {
      // This is a simplified placeholder
      // In production, fetch TON/USD from CoinGecko or another reliable source
      return price * 5.0; // Approximate TON price, should be dynamic
    }

    // Unknown quote currency
    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DeDust provider instance with optional configuration overrides.
 *
 * @example
 * ```typescript
 * const provider = createDedustProvider();
 * const price = await provider.getPrice('TON');
 * const pools = await provider.getPools();
 * ```
 */
export function createDedustProvider(config?: Partial<TonDexProviderConfig>): DedustProvider {
  return new DedustProvider(config);
}
