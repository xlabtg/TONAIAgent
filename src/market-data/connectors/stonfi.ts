/**
 * TONAIAgent - STON.fi DEX Connector
 *
 * Fetches market data from STON.fi, a leading AMM DEX on TON blockchain.
 * STON.fi provides a REST API for easy integration alongside SDK support.
 *
 * Features:
 * - AMM liquidity pools
 * - Jetton trading pairs
 * - Swap events and history
 * - REST API integration
 *
 * API Reference: https://api.ston.fi
 * SDK Reference: https://github.com/ston-fi/sdk
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
// STON.fi API Response Types
// ============================================================================

/** STON.fi pool data */
interface StonfiPoolData {
  address: string;
  router_address: string;
  reserve0: string;
  reserve1: string;
  token0_address: string;
  token1_address: string;
  lp_fee: string;
  protocol_fee: string;
  ref_fee: string;
  protocol_fee_address: string;
  collected_token0_protocol_fee: string;
  collected_token1_protocol_fee: string;
  tvl_usd?: string;
  volume_24h?: string;
  apy?: string;
}

/** STON.fi token/jetton data */
interface StonfiJettonData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  dex_price_usd?: string;
  total_supply?: string;
  default_symbol: boolean;
}

/** STON.fi stats response */
interface StonfiStats {
  tvl_usd: string;
  volume_24h: string;
  pools_count: number;
  jettons_count: number;
}

/** STON.fi swap operation */
interface StonfiSwapOperation {
  tx_hash: string;
  pool_address: string;
  sender_address: string;
  token0_address: string;
  token1_address: string;
  amount0_in: string;
  amount1_in: string;
  amount0_out: string;
  amount1_out: string;
  timestamp: number;
  lt: string;
}

// ============================================================================
// STON.fi Provider Configuration
// ============================================================================

const DEFAULT_STONFI_CONFIG: Partial<TonDexProviderConfig> = {
  name: 'stonfi',
  baseUrl: 'https://api.ston.fi/v1',
  timeoutMs: 15_000,
  maxRetries: 2,
};

// ============================================================================
// STON.fi Provider
// ============================================================================

/**
 * StonfiProvider — fetches market data from STON.fi DEX via REST API.
 *
 * Capabilities:
 * - Pool discovery with TVL and volume data
 * - Token/jetton price extraction
 * - Swap event tracking
 * - Full REST API integration
 *
 * @example
 * ```typescript
 * const provider = createStonfiProvider();
 * const price = await provider.getPrice('TON');
 * // { dex: 'stonfi', asset: 'TON', priceUsd: 5.30, liquidityUsd: 2000000, ... }
 *
 * const pools = await provider.getPools();
 * // Returns all STON.fi liquidity pools
 * ```
 */
export class StonfiProvider extends BaseTonDexProvider {
  private readonly baseUrl: string;
  private jettonCache: Map<string, StonfiJettonData> = new Map();
  private jettonsCacheTime = 0;
  private readonly jettonsCacheTtl = 300_000; // 5 minutes

  constructor(config: Partial<TonDexProviderConfig> = {}) {
    super({
      name: 'stonfi',
      ...DEFAULT_STONFI_CONFIG,
      ...config,
    });
    this.baseUrl = this.config.baseUrl ?? DEFAULT_STONFI_CONFIG.baseUrl!;
  }

  getName() {
    return 'stonfi' as const;
  }

  /**
   * Returns the list of supported token symbols.
   * Fetches from STON.fi jettons endpoint.
   */
  async getSupportedTokens(): Promise<string[]> {
    try {
      await this.refreshJettonCache();
      return Array.from(this.jettonCache.values()).map(j => j.symbol);
    } catch (err) {
      this.log('Failed to fetch jettons, using fallback', { error: String(err) });
      return ['TON', 'USDT', 'USDC', 'NOT', 'DOGS', 'HMSTR'];
    }
  }

  /**
   * Fetches the current price for a token in USD.
   */
  async getPrice(token: string): Promise<DexPriceQuote> {
    const normalizedToken = this.normalizeSymbol(token);

    return this.withRetry(async () => {
      // Try to get price directly from jetton data
      await this.refreshJettonCache();
      const jetton = this.findJettonBySymbol(normalizedToken);

      if (jetton && jetton.dex_price_usd) {
        const priceUsd = parseFloat(jetton.dex_price_usd);

        // Get liquidity from pools
        const pools = await this.getPoolsForToken(normalizedToken);
        const totalLiquidity = pools.reduce((sum, p) => sum + p.tvlUsd, 0);
        const totalVolume = pools.reduce((sum, p) => sum + p.volume24hUsd, 0);

        return {
          dex: 'stonfi',
          asset: normalizedToken,
          priceUsd,
          liquidityUsd: totalLiquidity,
          volume24hUsd: totalVolume,
          confidence: this.calculateConfidence(totalLiquidity, totalVolume),
          timestamp: this.nowSeconds(),
        };
      }

      // Fallback: Calculate from pools
      const pools = await this.getPoolsForToken(normalizedToken);

      if (pools.length === 0) {
        throw new TonDexError(
          `No liquidity pools found for token '${token}' on STON.fi`,
          'TOKEN_NOT_SUPPORTED',
          'stonfi',
          { token }
        );
      }

      // Aggregate price from pools
      let totalLiquidity = 0;
      let weightedPrice = 0;
      let totalVolume = 0;

      for (const pool of pools) {
        const priceUsd = await this.calculatePoolPrice(pool, normalizedToken);
        if (priceUsd === null) continue;

        const poolLiquidity = pool.tvlUsd / 2;
        weightedPrice += priceUsd * poolLiquidity;
        totalLiquidity += poolLiquidity;
        totalVolume += pool.volume24hUsd;
      }

      if (totalLiquidity === 0) {
        throw new TonDexError(
          `Unable to determine price for token '${token}' on STON.fi`,
          'INSUFFICIENT_LIQUIDITY',
          'stonfi',
          { token, poolCount: pools.length }
        );
      }

      return {
        dex: 'stonfi',
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
      const data = await this.fetchJson<{ pools: StonfiPoolData[] }>(url);

      // Ensure jetton cache is populated for symbol lookup
      await this.refreshJettonCache();

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
   * Fetches a specific liquidity pool by address.
   */
  async getPool(poolId: string): Promise<LiquidityPool | null> {
    try {
      const url = `${this.baseUrl}/pools/${poolId}`;
      const data = await this.fetchJson<{ pool: StonfiPoolData }>(url);
      await this.refreshJettonCache();
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
      const url = `${this.baseUrl}/operations/swaps?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<{ operations: StonfiSwapOperation[] }>(url);

      await this.refreshJettonCache();
      return (data.operations || []).map(op => this.normalizeSwapEvent(op));
    });
  }

  /**
   * Fetches swap events for a specific pool.
   */
  async getSwapsForPool(poolId: string, limit: number = 100): Promise<SwapEvent[]> {
    return this.withRetry(async () => {
      const url = `${this.baseUrl}/pools/${poolId}/operations?limit=${Math.min(limit, 500)}`;
      const data = await this.fetchJson<{ operations: StonfiSwapOperation[] }>(url);

      await this.refreshJettonCache();
      return (data.operations || []).map(op => this.normalizeSwapEvent(op));
    });
  }

  /**
   * Fetches historical OHLCV candles.
   * STON.fi may provide limited historical data through their API.
   */
  async getCandles(
    token: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number
  ): Promise<OHLCVCandle[]> {
    // STON.fi API may not support candles directly
    this.log('Candle data not directly available from STON.fi API', { token, interval });
    return [];
  }

  /**
   * Checks if the provider is available and responsive.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/stats`;
      const data = await this.fetchJson<StonfiStats>(url);
      return typeof data.tvl_usd === 'string' && parseFloat(data.tvl_usd) > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Refreshes the jetton cache if stale.
   */
  private async refreshJettonCache(): Promise<void> {
    if (Date.now() - this.jettonsCacheTime < this.jettonsCacheTtl) {
      return;
    }

    try {
      const url = `${this.baseUrl}/jettons`;
      const data = await this.fetchJson<{ jettons: StonfiJettonData[] }>(url);

      this.jettonCache.clear();
      for (const jetton of data.jettons || []) {
        this.jettonCache.set(jetton.address, jetton);
      }

      // Add native TON
      this.jettonCache.set('native', {
        address: 'native',
        symbol: 'TON',
        name: 'Toncoin',
        decimals: 9,
        default_symbol: true,
      });

      this.jettonsCacheTime = Date.now();
    } catch (err) {
      this.log('Failed to refresh jetton cache', { error: String(err) });
    }
  }

  /**
   * Finds a jetton by symbol in the cache.
   */
  private findJettonBySymbol(symbol: string): StonfiJettonData | null {
    const normalized = this.normalizeSymbol(symbol);
    for (const jetton of this.jettonCache.values()) {
      if (this.normalizeSymbol(jetton.symbol) === normalized) {
        return jetton;
      }
    }
    return null;
  }

  /**
   * Gets a jetton by address from the cache.
   */
  private getJettonByAddress(address: string): StonfiJettonData | null {
    if (address === 'native' || address === 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c') {
      return this.jettonCache.get('native') ?? null;
    }
    return this.jettonCache.get(address) ?? null;
  }

  /**
   * Normalizes a STON.fi pool to the standard LiquidityPool format.
   */
  private normalizePool(pool: StonfiPoolData): LiquidityPool | null {
    const jetton0 = this.getJettonByAddress(pool.token0_address);
    const jetton1 = this.getJettonByAddress(pool.token1_address);

    const token0: TokenInfo = {
      symbol: jetton0?.symbol ?? 'UNKNOWN',
      name: jetton0?.name ?? 'Unknown Token',
      address: pool.token0_address,
      decimals: jetton0?.decimals ?? 9,
    };

    const token1: TokenInfo = {
      symbol: jetton1?.symbol ?? 'UNKNOWN',
      name: jetton1?.name ?? 'Unknown Token',
      address: pool.token1_address,
      decimals: jetton1?.decimals ?? 9,
    };

    // Skip pools with unknown tokens
    if (token0.symbol === 'UNKNOWN' && token1.symbol === 'UNKNOWN') {
      return null;
    }

    // Parse fees (STON.fi uses basis points)
    const lpFee = parseFloat(pool.lp_fee || '0');
    const protocolFee = parseFloat(pool.protocol_fee || '0');
    const totalFee = (lpFee + protocolFee) / 10000; // Convert from basis points to percentage

    return {
      poolId: pool.address,
      dex: 'stonfi',
      token0,
      token1,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1,
      tvlUsd: parseFloat(pool.tvl_usd || '0'),
      feePercent: totalFee * 100,
      volume24hUsd: parseFloat(pool.volume_24h || '0'),
      apr: pool.apy ? parseFloat(pool.apy) : undefined,
      timestamp: this.nowSeconds(),
    };
  }

  /**
   * Normalizes a STON.fi swap operation to SwapEvent.
   */
  private normalizeSwapEvent(op: StonfiSwapOperation): SwapEvent {
    const token0 = this.getJettonByAddress(op.token0_address);
    const token1 = this.getJettonByAddress(op.token1_address);

    // Determine direction
    const amount0In = parseFloat(op.amount0_in || '0');
    const amount1In = parseFloat(op.amount1_in || '0');
    const amount0Out = parseFloat(op.amount0_out || '0');
    const amount1Out = parseFloat(op.amount1_out || '0');

    const tokenIn = amount0In > 0 ? (token0?.symbol ?? 'UNKNOWN') : (token1?.symbol ?? 'UNKNOWN');
    const tokenOut = amount0Out > 0 ? (token0?.symbol ?? 'UNKNOWN') : (token1?.symbol ?? 'UNKNOWN');
    const amountIn = amount0In > 0 ? op.amount0_in : op.amount1_in;
    const amountOut = amount0Out > 0 ? op.amount0_out : op.amount1_out;

    return {
      txHash: op.tx_hash,
      dex: 'stonfi',
      poolId: op.pool_address,
      tokenIn,
      amountIn,
      tokenOut,
      amountOut,
      valueUsd: 0, // Would need price lookup
      sender: op.sender_address,
      timestamp: op.timestamp,
    };
  }

  /**
   * Calculates USD price from a pool for a given token.
   */
  private async calculatePoolPrice(pool: LiquidityPool, token: string): Promise<number | null> {
    const normalizedToken = this.normalizeSymbol(token);
    const isToken0 = this.normalizeSymbol(pool.token0.symbol) === normalizedToken;

    const reserve0 = parseFloat(pool.reserve0) / Math.pow(10, pool.token0.decimals);
    const reserve1 = parseFloat(pool.reserve1) / Math.pow(10, pool.token1.decimals);

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
    if (['USDT', 'USDC', 'DAI', 'BUSD', 'jUSDT', 'jUSDC'].includes(normalizedQuote)) {
      return price;
    }

    // For TON, use approximate price (should be from external oracle in production)
    if (normalizedQuote === 'TON') {
      return price * 5.0; // Placeholder, should be dynamic
    }

    return null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a STON.fi provider instance with optional configuration overrides.
 *
 * @example
 * ```typescript
 * const provider = createStonfiProvider();
 * const price = await provider.getPrice('TON');
 * const pools = await provider.getPools();
 * ```
 */
export function createStonfiProvider(config?: Partial<TonDexProviderConfig>): StonfiProvider {
  return new StonfiProvider(config);
}
