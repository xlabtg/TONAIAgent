/**
 * TONAIAgent - TONCO DEX Connector
 *
 * Fetches market data from TONCO, one of the fastest-growing DEXs on TON blockchain.
 * TONCO uses the Algebra protocol for concentrated liquidity AMM.
 *
 * Features:
 * - Pool liquidity data
 * - Swap routing
 * - DEX price discovery
 * - Aggregated liquidity
 *
 * SDK Reference: https://github.com/cryptoalgebra/tonco-sdk
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
// TONCO API Response Types
// ============================================================================

/** TONCO pool data */
interface ToncoPoolData {
  id: string;
  address: string;
  token0: ToncoTokenData;
  token1: ToncoTokenData;
  liquidity: string;
  sqrtPrice: string;
  tick: number;
  fee: number;
  volumeUSD: string;
  tvlUSD: string;
  feesUSD: string;
  txCount: string;
  token0Price: string;
  token1Price: string;
}

/** TONCO token data */
interface ToncoTokenData {
  id: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  derivedTON?: string;
  derivedUSD?: string;
  volume?: string;
  volumeUSD?: string;
  txCount?: string;
  totalValueLocked?: string;
  totalValueLockedUSD?: string;
}

/** TONCO swap/trade data */
interface ToncoSwapData {
  id: string;
  transaction: {
    id: string;
    timestamp: string;
  };
  pool: {
    id: string;
  };
  sender: string;
  recipient: string;
  origin: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  tick: number;
  sqrtPriceX96: string;
}

/** TONCO global stats */
interface ToncoGlobalData {
  totalValueLockedUSD: string;
  totalVolumeUSD: string;
  txCount: string;
  poolCount: string;
  tokenCount: string;
}

// ============================================================================
// TONCO Provider Configuration
// ============================================================================

const DEFAULT_TONCO_CONFIG: Partial<TonDexProviderConfig> = {
  name: 'tonco',
  baseUrl: 'https://api.tonco.io/v1',
  timeoutMs: 15_000,
  maxRetries: 2,
};

// Known TONCO token addresses
const TONCO_TOKEN_MAP: Record<string, string> = {
  TON: 'native',
  USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  USDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
  NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
};

// ============================================================================
// TONCO Provider
// ============================================================================

/**
 * ToncoProvider — fetches market data from TONCO DEX.
 *
 * TONCO is built on Algebra protocol with concentrated liquidity,
 * providing efficient capital utilization and tighter spreads.
 *
 * Capabilities:
 * - Pool discovery with TVL and volume data
 * - Concentrated liquidity pool pricing
 * - Swap event tracking
 * - Real-time price discovery
 *
 * @example
 * ```typescript
 * const provider = createToncoProvider();
 * const price = await provider.getPrice('TON');
 * // { dex: 'tonco', asset: 'TON', priceUsd: 5.28, liquidityUsd: 500000, ... }
 *
 * const pools = await provider.getPools();
 * // Returns all TONCO liquidity pools
 * ```
 */
export class ToncoProvider extends BaseTonDexProvider {
  private readonly baseUrl: string;
  private tokenCache: Map<string, ToncoTokenData> = new Map();
  private tokensCacheTime = 0;
  private readonly tokensCacheTtl = 300_000; // 5 minutes

  constructor(config: Partial<TonDexProviderConfig> = {}) {
    super({
      name: 'tonco',
      ...DEFAULT_TONCO_CONFIG,
      ...config,
    });
    this.baseUrl = this.config.baseUrl ?? DEFAULT_TONCO_CONFIG.baseUrl!;
  }

  getName() {
    return 'tonco' as const;
  }

  /**
   * Returns the list of supported token symbols.
   */
  async getSupportedTokens(): Promise<string[]> {
    try {
      await this.refreshTokenCache();
      return Array.from(this.tokenCache.values()).map(t => t.symbol);
    } catch (err) {
      this.log('Failed to fetch tokens, using fallback', { error: String(err) });
      return Object.keys(TONCO_TOKEN_MAP);
    }
  }

  /**
   * Fetches the current price for a token in USD.
   */
  async getPrice(token: string): Promise<DexPriceQuote> {
    const normalizedToken = this.normalizeSymbol(token);

    return this.withRetry(async () => {
      // Try to get price from token data
      await this.refreshTokenCache();
      const tokenData = this.findTokenBySymbol(normalizedToken);

      if (tokenData && tokenData.derivedUSD) {
        const priceUsd = parseFloat(tokenData.derivedUSD);
        const liquidityUsd = parseFloat(tokenData.totalValueLockedUSD || '0');
        const volumeUsd = parseFloat(tokenData.volumeUSD || '0');

        return {
          dex: 'tonco',
          asset: normalizedToken,
          priceUsd,
          liquidityUsd,
          volume24hUsd: volumeUsd,
          confidence: this.calculateConfidence(liquidityUsd, volumeUsd),
          timestamp: this.nowSeconds(),
        };
      }

      // Fallback: Calculate from pools
      const pools = await this.getPoolsForToken(normalizedToken);

      if (pools.length === 0) {
        throw new TonDexError(
          `No liquidity pools found for token '${token}' on TONCO`,
          'TOKEN_NOT_SUPPORTED',
          'tonco',
          { token }
        );
      }

      // Aggregate price from pools
      let totalLiquidity = 0;
      let weightedPrice = 0;
      let totalVolume = 0;

      for (const pool of pools) {
        const priceUsd = this.calculatePoolPrice(pool, normalizedToken);
        if (priceUsd === null) continue;

        const poolLiquidity = pool.tvlUsd / 2;
        weightedPrice += priceUsd * poolLiquidity;
        totalLiquidity += poolLiquidity;
        totalVolume += pool.volume24hUsd;
      }

      if (totalLiquidity === 0) {
        throw new TonDexError(
          `Unable to determine price for token '${token}' on TONCO`,
          'INSUFFICIENT_LIQUIDITY',
          'tonco',
          { token, poolCount: pools.length }
        );
      }

      return {
        dex: 'tonco',
        asset: normalizedToken,
        priceUsd: weightedPrice / totalLiquidity,
        liquidityUsd: totalLiquidity * 2,
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
      const url = `${this.baseUrl}/pools`;
      const data = await this.fetchJson<{ pools: ToncoPoolData[] }>(url);

      const pools: LiquidityPool[] = [];
      for (const pool of data.pools || []) {
        const normalized = this.normalizePool(pool);
        if (normalized) {
          pools.push(normalized);
        }
      }

      return pools;
    });
  }

  /**
   * Fetches a specific liquidity pool by ID.
   */
  async getPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      const url = `${this.baseUrl}/pools/${poolId}`;
      const data = await this.fetchJson<{ pool: ToncoPoolData }>(url);
      return this.normalizePool(data.pool);
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
      const url = `${this.baseUrl}/swaps?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<{ swaps: ToncoSwapData[] }>(url);
      return (data.swaps || []).map(swap => this.normalizeSwapEvent(swap));
    });
  }

  /**
   * Fetches swap events for a specific pool.
   */
  async getSwapsForPool(poolId: string, limit: number = 100): Promise<SwapEvent[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/pools/${poolId}/swaps?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<{ swaps: ToncoSwapData[] }>(url);
      return (data.swaps || []).map(swap => this.normalizeSwapEvent(swap));
    });
  }

  /**
   * Fetches historical OHLCV candles.
   */
  async getCandles(
    token: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number
  ): Promise<OHLCVCandle[]> {
    // TONCO may provide candle data through their indexer
    this.log('Candle data fetching from TONCO', { token, interval });

    // Attempt to fetch from API
    try {
      const intervalMap: Record<CandleInterval, string> = {
        '1m': 'minute',
        '5m': '5minute',
        '15m': '15minute',
        '1h': 'hour',
        '4h': '4hour',
        '1d': 'day',
        '1w': 'week',
      };

      const tokenData = this.findTokenBySymbol(this.normalizeSymbol(token));
      if (!tokenData) return [];

      const url = `${this.baseUrl}/tokens/${tokenData.address}/candles?interval=${intervalMap[interval]}&from=${startTime}&to=${endTime}`;
      const data = await this.fetchJson<{ candles: Array<{
        openTime: number;
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
        volumeUSD: string;
        closeTime: number;
      }> }>(url);

      return (data.candles || []).map(c => ({
        openTime: c.openTime,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume),
        volumeUsd: parseFloat(c.volumeUSD),
        closeTime: c.closeTime,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Checks if the provider is available and responsive.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/global`;
      const data = await this.fetchJson<ToncoGlobalData>(url);
      return typeof data.totalValueLockedUSD === 'string' && parseFloat(data.totalValueLockedUSD) > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Refreshes the token cache if stale.
   */
  private async refreshTokenCache(): Promise<void> {
    if (Date.now() - this.tokensCacheTime < this.tokensCacheTtl) {
      return;
    }

    try {
      const url = `${this.baseUrl}/tokens`;
      const data = await this.fetchJson<{ tokens: ToncoTokenData[] }>(url);

      this.tokenCache.clear();
      for (const token of data.tokens || []) {
        this.tokenCache.set(token.address, token);
      }

      // Add native TON if not present
      if (!this.findTokenBySymbol('TON')) {
        this.tokenCache.set('native', {
          id: 'native',
          address: 'native',
          symbol: 'TON',
          name: 'Toncoin',
          decimals: 9,
        });
      }

      this.tokensCacheTime = Date.now();
    } catch (err) {
      this.log('Failed to refresh token cache', { error: String(err) });
    }
  }

  /**
   * Finds a token by symbol in the cache.
   */
  private findTokenBySymbol(symbol: string): ToncoTokenData | null {
    const normalized = this.normalizeSymbol(symbol);
    for (const token of this.tokenCache.values()) {
      if (this.normalizeSymbol(token.symbol) === normalized) {
        return token;
      }
    }
    return null;
  }

  /**
   * Normalizes a TONCO pool to the standard LiquidityPool format.
   */
  private normalizePool(pool: ToncoPoolData): LiquidityPool | null {
    const token0: TokenInfo = {
      symbol: pool.token0.symbol,
      name: pool.token0.name,
      address: pool.token0.address,
      decimals: pool.token0.decimals,
    };

    const token1: TokenInfo = {
      symbol: pool.token1.symbol,
      name: pool.token1.name,
      address: pool.token1.address,
      decimals: pool.token1.decimals,
    };

    // For concentrated liquidity, reserves are derived differently
    // Using token prices and TVL for approximation
    const tvlUsd = parseFloat(pool.tvlUSD || '0');
    const token0PriceUsd = parseFloat(pool.token0.derivedUSD || '0');
    const token1PriceUsd = parseFloat(pool.token1.derivedUSD || '0');

    // Approximate reserves from TVL and prices
    const reserve0 = token0PriceUsd > 0 ? String((tvlUsd / 2) / token0PriceUsd) : '0';
    const reserve1 = token1PriceUsd > 0 ? String((tvlUsd / 2) / token1PriceUsd) : '0';

    // Fee is in basis points (e.g., 3000 = 0.3%)
    const feePercent = pool.fee / 10000;

    return {
      poolId: pool.address,
      dex: 'tonco',
      token0,
      token1,
      reserve0,
      reserve1,
      tvlUsd,
      feePercent,
      volume24hUsd: parseFloat(pool.volumeUSD || '0'),
      timestamp: this.nowSeconds(),
    };
  }

  /**
   * Normalizes a TONCO swap to SwapEvent format.
   */
  private normalizeSwapEvent(swap: ToncoSwapData): SwapEvent {
    // Determine direction from amounts
    const amount0 = parseFloat(swap.amount0);
    const amount1 = parseFloat(swap.amount1);

    // Positive amount = token received, negative = token sent
    const tokenIn = amount0 < 0 ? 'token0' : 'token1';
    const tokenOut = amount0 > 0 ? 'token0' : 'token1';
    const amountIn = String(Math.abs(amount0 < 0 ? amount0 : amount1));
    const amountOut = String(Math.abs(amount0 > 0 ? amount0 : amount1));

    return {
      txHash: swap.transaction.id,
      dex: 'tonco',
      poolId: swap.pool.id,
      tokenIn,
      amountIn,
      tokenOut,
      amountOut,
      valueUsd: parseFloat(swap.amountUSD || '0'),
      sender: swap.sender,
      timestamp: parseInt(swap.transaction.timestamp),
    };
  }

  /**
   * Calculates USD price from a pool for a given token.
   */
  private calculatePoolPrice(pool: LiquidityPool, token: string): number | null {
    const normalizedToken = this.normalizeSymbol(token);

    // For TONCO, we have direct token prices in pool data
    // This is a fallback using reserves
    const isToken0 = this.normalizeSymbol(pool.token0.symbol) === normalizedToken;

    const reserve0 = parseFloat(pool.reserve0);
    const reserve1 = parseFloat(pool.reserve1);

    if (reserve0 === 0 || reserve1 === 0) return null;

    const price = isToken0 ? reserve1 / reserve0 : reserve0 / reserve1;
    const quoteToken = isToken0 ? pool.token1.symbol : pool.token0.symbol;

    return this.convertToUsd(price, quoteToken);
  }

  /**
   * Converts price to USD based on quote token.
   */
  private convertToUsd(price: number, quoteToken: string): number | null {
    const normalizedQuote = this.normalizeSymbol(quoteToken);

    // Direct USD stablecoins
    if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(normalizedQuote)) {
      return price;
    }

    // For TON, use approximate price
    if (normalizedQuote === 'TON') {
      return price * 5.0; // Placeholder
    }

    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TONCO provider instance with optional configuration overrides.
 *
 * @example
 * ```typescript
 * const provider = createToncoProvider();
 * const price = await provider.getPrice('TON');
 * const pools = await provider.getPools();
 * ```
 */
export function createToncoProvider(config?: Partial<TonDexProviderConfig>): ToncoProvider {
  return new ToncoProvider(config);
}
