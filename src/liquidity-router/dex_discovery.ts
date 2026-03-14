/**
 * TONAIAgent - DEX Discovery Module
 *
 * Queries liquidity pools from supported TON DEXs (DeDust, STON.fi, TONCO)
 * and collects real-time swap quotes for a given token pair.
 *
 * Responsibilities:
 * - Discover available pools per DEX
 * - Fetch swap quotes concurrently from all enabled DEXs
 * - Normalize responses into a common `DexQuote` format
 * - Return a `LiquiditySnapshot` with all collected data
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

import type {
  DexId,
  DexQuote,
  LiquidityPool,
  LiquiditySnapshot,
  LiquidityRouterConfig,
} from './types';
import { TON_TOKEN_ADDRESSES, TOKEN_DECIMALS, LiquidityRouterError } from './types';

// ============================================================================
// DEX API Configuration
// ============================================================================

const DEX_API_URLS: Record<DexId, string> = {
  dedust: 'https://api.dedust.io/v2',
  stonfi: 'https://api.ston.fi/v1',
  tonco: 'https://api.tonco.io/v1',
};

const DEFAULT_TIMEOUT_MS = 10_000;

// ============================================================================
// Quote Fetcher Interface
// ============================================================================

/**
 * Interface for fetching quotes from a single DEX.
 * Allows easy substitution with mocks in tests.
 */
export interface DexQuoteFetcher {
  fetchQuote(params: {
    dex: DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null>;

  discoverPools(params: {
    dex: DexId;
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]>;
}

// ============================================================================
// HTTP Fetcher (Real API)
// ============================================================================

/**
 * Fetches quotes and pool data from real DEX REST APIs.
 */
export class HttpDexQuoteFetcher implements DexQuoteFetcher {
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  async fetchQuote(params: {
    dex: DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null> {
    try {
      switch (params.dex) {
        case 'dedust':
          return await this.fetchDedustQuote(params);
        case 'stonfi':
          return await this.fetchStonfiQuote(params);
        case 'tonco':
          return await this.fetchToncoQuote(params);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  async discoverPools(params: {
    dex: DexId;
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]> {
    try {
      switch (params.dex) {
        case 'dedust':
          return await this.discoverDedustPools(params);
        case 'stonfi':
          return await this.discoverStonfiPools(params);
        case 'tonco':
          return await this.discoverToncoPools(params);
        default:
          return [];
      }
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // DeDust
  // --------------------------------------------------------------------------

  private async fetchDedustQuote(params: {
    dex: DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null> {
    const tokenInAddr = TON_TOKEN_ADDRESSES[params.tokenIn] ?? params.tokenIn;
    const tokenOutAddr = TON_TOKEN_ADDRESSES[params.tokenOut] ?? params.tokenOut;
    const url = `${DEX_API_URLS.dedust}/routing/plan?from=${tokenInAddr}&to=${tokenOutAddr}&amount=${params.amountIn}`;

    const response = await this.fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;
    const routes = Array.isArray(data.routes) ? data.routes : [];
    const bestRoute = routes[0] as Record<string, unknown> | undefined;
    if (!bestRoute) return null;

    const expectedOut = String(bestRoute.amountOut ?? '0');
    const priceImpact = typeof bestRoute.priceImpact === 'number' ? bestRoute.priceImpact : 0;
    const feePercent = typeof bestRoute.fee === 'number' ? bestRoute.fee / 100 : 0.3;
    const tvlUsd = typeof bestRoute.tvlUsd === 'number' ? bestRoute.tvlUsd : 0;
    const poolAddress = String(bestRoute.poolAddress ?? '');

    return this.buildQuote({
      dex: 'dedust',
      poolAddress,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      expectedAmountOut: expectedOut,
      priceImpactPercent: priceImpact,
      feePercent,
      liquidityUsd: tvlUsd,
      slippageTolerance: params.slippageTolerance,
    });
  }

  private async discoverDedustPools(params: {
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]> {
    const tokenAAddr = TON_TOKEN_ADDRESSES[params.tokenA] ?? params.tokenA;
    const tokenBAddr = TON_TOKEN_ADDRESSES[params.tokenB] ?? params.tokenB;
    const url = `${DEX_API_URLS.dedust}/pools?tokenA=${tokenAAddr}&tokenB=${tokenBAddr}`;

    const response = await this.fetch(url);
    if (!response.ok) return [];

    const data = await response.json() as Record<string, unknown>;
    const pools = Array.isArray(data.pools) ? data.pools : [];

    return (pools as Record<string, unknown>[]).map(p => ({
      poolAddress: String(p.address ?? ''),
      dex: 'dedust' as DexId,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      tvlUsd: typeof p.tvlUsd === 'number' ? p.tvlUsd : 0,
      volume24hUsd: typeof p.volume24h === 'number' ? p.volume24h : 0,
      feePercent: typeof p.fee === 'number' ? p.fee / 100 : 0.3,
      discoveredAt: Math.floor(Date.now() / 1000),
    }));
  }

  // --------------------------------------------------------------------------
  // STON.fi
  // --------------------------------------------------------------------------

  private async fetchStonfiQuote(params: {
    dex: DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null> {
    const tokenInAddr = TON_TOKEN_ADDRESSES[params.tokenIn] ?? params.tokenIn;
    const tokenOutAddr = TON_TOKEN_ADDRESSES[params.tokenOut] ?? params.tokenOut;
    const slippage = (params.slippageTolerance / 100).toFixed(4);
    const url = `${DEX_API_URLS.stonfi}/swap/simulate?offer_address=${tokenInAddr}&ask_address=${tokenOutAddr}&units=${params.amountIn}&slippage_tolerance=${slippage}`;

    const response = await this.fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;
    const expectedOut = String(data.ask_units ?? '0');
    const priceImpact = parseFloat(String(data.price_impact ?? '0')) * 100;
    const feePercent = parseFloat(String(data.fee_percent ?? '0.3'));
    const tvlUsd = parseFloat(String(data.liquidity_usd ?? '0'));
    const poolAddress = String(data.router_address ?? '');
    const minOut = String(data.min_ask_units ?? this.applySlippage(expectedOut, params.slippageTolerance));

    return {
      dex: 'stonfi',
      poolAddress,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      expectedAmountOut: expectedOut,
      executionPrice: this.calcExecutionPrice(expectedOut, params.amountIn, params.tokenIn, params.tokenOut),
      priceImpactPercent: priceImpact,
      slippagePercent: params.slippageTolerance,
      liquidityUsd: tvlUsd,
      feePercent,
      minimumAmountOut: minOut,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  private async discoverStonfiPools(params: {
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]> {
    const tokenAAddr = TON_TOKEN_ADDRESSES[params.tokenA] ?? params.tokenA;
    const tokenBAddr = TON_TOKEN_ADDRESSES[params.tokenB] ?? params.tokenB;
    const url = `${DEX_API_URLS.stonfi}/pools?token0=${tokenAAddr}&token1=${tokenBAddr}`;

    const response = await this.fetch(url);
    if (!response.ok) return [];

    const data = await response.json() as Record<string, unknown>;
    const pools = Array.isArray(data.pool_list) ? data.pool_list : [];

    return (pools as Record<string, unknown>[]).map(p => ({
      poolAddress: String(p.address ?? ''),
      dex: 'stonfi' as DexId,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      tvlUsd: typeof p.lp_total_supply_usd === 'number' ? p.lp_total_supply_usd : 0,
      volume24hUsd: typeof p.stats === 'object' && p.stats !== null
        ? (typeof (p.stats as Record<string, unknown>).volume_usd === 'number'
          ? (p.stats as Record<string, unknown>).volume_usd as number : 0)
        : 0,
      feePercent: typeof p.lp_fee === 'number' ? p.lp_fee : 0.3,
      discoveredAt: Math.floor(Date.now() / 1000),
    }));
  }

  // --------------------------------------------------------------------------
  // TONCO
  // --------------------------------------------------------------------------

  private async fetchToncoQuote(params: {
    dex: DexId;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
  }): Promise<DexQuote | null> {
    const tokenInAddr = TON_TOKEN_ADDRESSES[params.tokenIn] ?? params.tokenIn;
    const tokenOutAddr = TON_TOKEN_ADDRESSES[params.tokenOut] ?? params.tokenOut;
    const url = `${DEX_API_URLS.tonco}/quote?tokenIn=${tokenInAddr}&tokenOut=${tokenOutAddr}&amountIn=${params.amountIn}`;

    const response = await this.fetch(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;
    const expectedOut = String(data.amountOut ?? '0');
    const priceImpact = typeof data.priceImpact === 'number' ? data.priceImpact : 0;
    const feePercent = typeof data.feePercent === 'number' ? data.feePercent : 0.3;
    const tvlUsd = typeof data.tvlUsd === 'number' ? data.tvlUsd : 0;
    const poolAddress = String(data.poolAddress ?? '');

    return this.buildQuote({
      dex: 'tonco',
      poolAddress,
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      expectedAmountOut: expectedOut,
      priceImpactPercent: priceImpact,
      feePercent,
      liquidityUsd: tvlUsd,
      slippageTolerance: params.slippageTolerance,
    });
  }

  private async discoverToncoPools(params: {
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]> {
    const tokenAAddr = TON_TOKEN_ADDRESSES[params.tokenA] ?? params.tokenA;
    const tokenBAddr = TON_TOKEN_ADDRESSES[params.tokenB] ?? params.tokenB;
    const url = `${DEX_API_URLS.tonco}/pools?tokenA=${tokenAAddr}&tokenB=${tokenBAddr}`;

    const response = await this.fetch(url);
    if (!response.ok) return [];

    const data = await response.json() as Record<string, unknown>;
    const pools = Array.isArray(data.pools) ? data.pools : [];

    return (pools as Record<string, unknown>[]).map(p => ({
      poolAddress: String(p.poolAddress ?? ''),
      dex: 'tonco' as DexId,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      tvlUsd: typeof p.tvlUsd === 'number' ? p.tvlUsd : 0,
      volume24hUsd: typeof p.volumeUsd24h === 'number' ? p.volumeUsd24h : 0,
      feePercent: typeof p.feePercent === 'number' ? p.feePercent : 0.3,
      discoveredAt: Math.floor(Date.now() / 1000),
    }));
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private buildQuote(p: {
    dex: DexId;
    poolAddress: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedAmountOut: string;
    priceImpactPercent: number;
    feePercent: number;
    liquidityUsd: number;
    slippageTolerance: number;
  }): DexQuote {
    return {
      dex: p.dex,
      poolAddress: p.poolAddress,
      tokenIn: p.tokenIn,
      tokenOut: p.tokenOut,
      amountIn: p.amountIn,
      expectedAmountOut: p.expectedAmountOut,
      executionPrice: this.calcExecutionPrice(p.expectedAmountOut, p.amountIn, p.tokenIn, p.tokenOut),
      priceImpactPercent: p.priceImpactPercent,
      slippagePercent: p.slippageTolerance,
      liquidityUsd: p.liquidityUsd,
      feePercent: p.feePercent,
      minimumAmountOut: this.applySlippage(p.expectedAmountOut, p.slippageTolerance),
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /** Compute human-readable execution price accounting for decimal differences. */
  private calcExecutionPrice(
    amountOut: string,
    amountIn: string,
    tokenIn: string,
    tokenOut: string
  ): number {
    const decimalsIn = TOKEN_DECIMALS[tokenIn] ?? 9;
    const decimalsOut = TOKEN_DECIMALS[tokenOut] ?? 9;
    const inDisplay = parseFloat(amountIn) / Math.pow(10, decimalsIn);
    const outDisplay = parseFloat(amountOut) / Math.pow(10, decimalsOut);
    if (inDisplay <= 0) return 0;
    return outDisplay / inDisplay;
  }

  /** Reduce amount by slippage: minimum = amount * (1 - slippage/100) */
  private applySlippage(amount: string, slippagePct: number): string {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return '0';
    return Math.floor(value * (1 - slippagePct / 100)).toString();
  }

  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

// ============================================================================
// DEX Discovery Service
// ============================================================================

/**
 * DexDiscovery — queries all enabled DEXs concurrently to collect pools and
 * quotes for a given token pair and swap amount.
 *
 * @example
 * ```typescript
 * const discovery = createDexDiscovery();
 * const snapshot = await discovery.discover({
 *   tokenIn: 'TON',
 *   tokenOut: 'USDT',
 *   amountIn: '10000000000',   // 10 TON in nanotons
 *   slippageTolerance: 0.5,
 *   enabledDexes: ['dedust', 'stonfi', 'tonco'],
 * });
 * console.log(snapshot.quotes.length);   // number of DEX quotes received
 * console.log(snapshot.pools.length);    // number of pools discovered
 * ```
 */
export class DexDiscovery {
  private readonly fetcher: DexQuoteFetcher;

  constructor(fetcher?: DexQuoteFetcher) {
    this.fetcher = fetcher ?? new HttpDexQuoteFetcher();
  }

  /**
   * Discovers liquidity and quotes from all enabled DEXs concurrently.
   *
   * @throws LiquidityRouterError with code 'DISCOVERY_FAILED' only if all
   *         DEXs fail simultaneously (partial failures are silently skipped).
   */
  async discover(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageTolerance: number;
    enabledDexes: DexId[];
  }): Promise<LiquiditySnapshot> {
    const start = Date.now();

    // Fetch quotes and pool data concurrently across all DEXs
    const [quoteResults, poolResults] = await Promise.all([
      Promise.allSettled(
        params.enabledDexes.map(dex =>
          this.fetcher.fetchQuote({
            dex,
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountIn: params.amountIn,
            slippageTolerance: params.slippageTolerance,
          })
        )
      ),
      Promise.allSettled(
        params.enabledDexes.map(dex =>
          this.fetcher.discoverPools({
            dex,
            tokenA: params.tokenIn,
            tokenB: params.tokenOut,
          })
        )
      ),
    ]);

    const quotes: DexQuote[] = quoteResults
      .filter((r): r is PromiseFulfilledResult<DexQuote | null> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value!);

    const pools: LiquidityPool[] = poolResults
      .filter((r): r is PromiseFulfilledResult<LiquidityPool[]> =>
        r.status === 'fulfilled'
      )
      .flatMap(r => r.value);

    if (quotes.length === 0) {
      throw new LiquidityRouterError(
        `No quotes available for ${params.tokenIn}/${params.tokenOut} from DEXs: [${params.enabledDexes.join(', ')}]`,
        'DISCOVERY_FAILED',
        { tokenIn: params.tokenIn, tokenOut: params.tokenOut, dexes: params.enabledDexes }
      );
    }

    return {
      pools,
      quotes,
      discoveredAt: Math.floor(start / 1000),
      discoveryDurationMs: Date.now() - start,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a DexDiscovery instance.
 *
 * @param fetcher - Optional custom fetcher (useful for testing with mocks)
 */
export function createDexDiscovery(fetcher?: DexQuoteFetcher): DexDiscovery {
  return new DexDiscovery(fetcher);
}
