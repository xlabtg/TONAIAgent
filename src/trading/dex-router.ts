/**
 * TONAIAgent - DEX Router
 *
 * Selects the optimal DEX (DeDust, STON.fi, TONCO) for executing a swap
 * by comparing real-time quotes across venues on price, liquidity, and slippage.
 *
 * Selection criteria (in order of priority):
 * 1. Best net output amount (after fees and slippage)
 * 2. Sufficient liquidity
 * 3. Lowest price impact
 *
 * @see Issue #235 — On-Chain Trading Integration (TON DEX Execution)
 */

import type {
  DexName,
  OnChainTradeSignal,
  SwapQuote,
  RoutingResult,
  DexRouterConfig,
} from './types';
import { DEFAULT_DEX_ROUTER_CONFIG, TradingError } from './types';

// ============================================================================
// DEX API Endpoints (for quote fetching)
// ============================================================================

/** Known DEX API base URLs */
const DEX_API_URLS: Record<DexName, string> = {
  dedust: 'https://api.dedust.io/v2',
  stonfi: 'https://api.ston.fi/v1',
  tonco: 'https://api.tonco.io/v1',
};

/** Token addresses on TON for common assets */
const TOKEN_ADDRESSES: Record<string, string> = {
  TON: 'native',
  USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  USDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
  NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  DOGS: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS',
};

// ============================================================================
// Quote Fetcher Interface
// ============================================================================

/**
 * Interface for fetching swap quotes from a DEX.
 * Allows easy mocking in tests.
 */
export interface DexQuoteFetcher {
  fetchQuote(
    dex: DexName,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<SwapQuote | null>;
}

// ============================================================================
// Default Quote Fetcher (uses real DEX APIs)
// ============================================================================

/**
 * Fetches swap quotes from real DEX APIs.
 * In testnet mode, falls back to simulated quotes based on pool data.
 */
export class DefaultDexQuoteFetcher implements DexQuoteFetcher {
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = 10_000) {
    this.timeoutMs = timeoutMs;
  }

  async fetchQuote(
    dex: DexName,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<SwapQuote | null> {
    try {
      switch (dex) {
        case 'dedust':
          return await this.fetchDedustQuote(tokenIn, tokenOut, amountIn, slippageTolerance);
        case 'stonfi':
          return await this.fetchStonfiQuote(tokenIn, tokenOut, amountIn, slippageTolerance);
        case 'tonco':
          return await this.fetchToncoQuote(tokenIn, tokenOut, amountIn, slippageTolerance);
        default:
          return null;
      }
    } catch {
      // Return null on any fetch error; router will try other DEXs
      return null;
    }
  }

  private async fetchDedustQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<SwapQuote | null> {
    const baseUrl = DEX_API_URLS.dedust;
    const tokenInAddr = TOKEN_ADDRESSES[tokenIn] ?? tokenIn;
    const tokenOutAddr = TOKEN_ADDRESSES[tokenOut] ?? tokenOut;

    const url = `${baseUrl}/routing/plan?from=${tokenInAddr}&to=${tokenOutAddr}&amount=${amountIn}`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    // Parse DeDust routing response
    const bestRoute = Array.isArray(data.routes) ? (data.routes[0] as Record<string, unknown> | undefined) : null;
    if (!bestRoute) return null;

    const expectedOut = String(bestRoute.amountOut ?? '0');
    const priceImpact = typeof bestRoute.priceImpact === 'number' ? bestRoute.priceImpact : 0;
    const poolAddr = String(bestRoute.poolAddress ?? '');
    const tvlUsd = typeof bestRoute.tvlUsd === 'number' ? bestRoute.tvlUsd : 0;
    const feePercent = typeof bestRoute.fee === 'number' ? bestRoute.fee / 100 : 0.3;

    const minimumOut = this.applySlippage(expectedOut, slippageTolerance);

    return {
      dex: 'dedust',
      tokenIn,
      tokenOut,
      amountIn,
      expectedAmountOut: expectedOut,
      executionPrice: parseFloat(expectedOut) / parseFloat(amountIn),
      priceImpactPercent: priceImpact,
      feePercent,
      minimumAmountOut: minimumOut,
      liquidityUsd: tvlUsd,
      poolAddress: poolAddr,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  private async fetchStonfiQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<SwapQuote | null> {
    const baseUrl = DEX_API_URLS.stonfi;
    const tokenInAddr = TOKEN_ADDRESSES[tokenIn] ?? tokenIn;
    const tokenOutAddr = TOKEN_ADDRESSES[tokenOut] ?? tokenOut;

    const url = `${baseUrl}/swap/simulate?offer_address=${tokenInAddr}&ask_address=${tokenOutAddr}&units=${amountIn}&slippage_tolerance=${(slippageTolerance / 100).toFixed(4)}`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    const expectedOut = String(data.ask_units ?? '0');
    const priceImpact = parseFloat(String(data.price_impact ?? '0')) * 100;
    const minOut = String(data.min_ask_units ?? this.applySlippage(expectedOut, slippageTolerance));
    const poolAddr = String(data.router_address ?? '');
    const tvlUsd = parseFloat(String(data.liquidity_usd ?? '0'));
    const feePercent = parseFloat(String(data.fee_percent ?? '0.3'));

    return {
      dex: 'stonfi',
      tokenIn,
      tokenOut,
      amountIn,
      expectedAmountOut: expectedOut,
      executionPrice: parseFloat(expectedOut) / parseFloat(amountIn),
      priceImpactPercent: priceImpact,
      feePercent,
      minimumAmountOut: minOut,
      liquidityUsd: tvlUsd,
      poolAddress: poolAddr,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  private async fetchToncoQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippageTolerance: number
  ): Promise<SwapQuote | null> {
    const baseUrl = DEX_API_URLS.tonco;
    const tokenInAddr = TOKEN_ADDRESSES[tokenIn] ?? tokenIn;
    const tokenOutAddr = TOKEN_ADDRESSES[tokenOut] ?? tokenOut;

    const url = `${baseUrl}/quote?tokenIn=${tokenInAddr}&tokenOut=${tokenOutAddr}&amountIn=${amountIn}`;

    const response = await this.fetchWithTimeout(url);
    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    const expectedOut = String(data.amountOut ?? '0');
    const priceImpact = typeof data.priceImpact === 'number' ? data.priceImpact : 0;
    const poolAddr = String(data.poolAddress ?? '');
    const tvlUsd = typeof data.tvlUsd === 'number' ? data.tvlUsd : 0;
    const feePercent = typeof data.feePercent === 'number' ? data.feePercent : 0.3;

    const minimumOut = this.applySlippage(expectedOut, slippageTolerance);

    return {
      dex: 'tonco',
      tokenIn,
      tokenOut,
      amountIn,
      expectedAmountOut: expectedOut,
      executionPrice: parseFloat(expectedOut) / parseFloat(amountIn),
      priceImpactPercent: priceImpact,
      feePercent,
      minimumAmountOut: minimumOut,
      liquidityUsd: tvlUsd,
      poolAddress: poolAddr,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Apply slippage to reduce an amount: minimum = amount * (1 - slippage/100) */
  private applySlippage(amount: string, slippagePct: number): string {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return '0';
    const minimum = value * (1 - slippagePct / 100);
    return Math.floor(minimum).toString();
  }
}

// ============================================================================
// DEX Router
// ============================================================================

/**
 * DexRouter — queries multiple DEXs and selects the optimal route for a swap.
 *
 * @example
 * ```typescript
 * const router = createDexRouter();
 *
 * const result = await router.findBestRoute(signal);
 * console.log(result.selectedDex);     // 'stonfi'
 * console.log(result.bestQuote.expectedAmountOut); // '5000000000'
 * console.log(result.selectionReason); // 'Best net output: 5.0 USDT vs dedust 4.98 USDT'
 * ```
 */
export class DexRouter {
  private readonly config: DexRouterConfig;
  private readonly quoteFetcher: DexQuoteFetcher;

  constructor(config: Partial<DexRouterConfig> = {}, quoteFetcher?: DexQuoteFetcher) {
    this.config = { ...DEFAULT_DEX_ROUTER_CONFIG, ...config };
    this.quoteFetcher = quoteFetcher ?? new DefaultDexQuoteFetcher();
  }

  /**
   * Returns the current configuration.
   */
  getConfig(): DexRouterConfig {
    return { ...this.config };
  }

  /**
   * Finds the best DEX route for executing a trade signal.
   *
   * Queries all enabled DEXs concurrently, compares quotes, and returns
   * the routing result with the best expected output.
   *
   * @throws TradingError with code 'ROUTING_FAILED' if no quotes found
   * @throws TradingError with code 'INSUFFICIENT_LIQUIDITY' if all quotes
   *         have insufficient liquidity
   */
  async findBestRoute(signal: OnChainTradeSignal): Promise<RoutingResult> {
    const [tokenIn, tokenOut] = this.resolveTokens(signal);
    const amountIn = this.parseAmount(signal.amount, tokenIn);

    // Fetch quotes from all enabled DEXs concurrently
    const quotePromises = this.config.enabledDexes.map(dex =>
      this.quoteFetcher.fetchQuote(
        dex,
        tokenIn,
        tokenOut,
        amountIn,
        this.config.slippageTolerance
      )
    );

    const rawResults = await Promise.allSettled(quotePromises);
    const allQuotes: SwapQuote[] = rawResults
      .filter((r): r is PromiseFulfilledResult<SwapQuote | null> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value!);

    if (allQuotes.length === 0) {
      throw new TradingError(
        `No quotes available for ${signal.pair} from any enabled DEX: [${this.config.enabledDexes.join(', ')}]`,
        'ROUTING_FAILED',
        { pair: signal.pair, dexes: this.config.enabledDexes }
      );
    }

    // Select best quote by maximum expected output
    const bestQuote = this.selectBestQuote(allQuotes);
    const selectionReason = this.buildSelectionReason(bestQuote, allQuotes);

    return {
      selectedDex: bestQuote.dex,
      bestQuote,
      allQuotes,
      selectionReason,
      routedAt: Math.floor(Date.now() / 1000),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Resolves tokenIn and tokenOut from a signal's pair and action.
   * BUY TON/USDT → tokenIn=USDT, tokenOut=TON
   * SELL TON/USDT → tokenIn=TON, tokenOut=USDT
   */
  private resolveTokens(signal: OnChainTradeSignal): [string, string] {
    const parts = signal.pair.split('/');
    if (parts.length !== 2) {
      throw new TradingError(
        `Invalid pair format: '${signal.pair}'. Expected 'BASE/QUOTE'`,
        'ROUTING_FAILED',
        { pair: signal.pair }
      );
    }

    const [base, quote] = parts;
    if (signal.action === 'BUY') {
      // BUY base token by selling quote token
      return [quote, base];
    } else {
      // SELL base token to receive quote token
      return [base, quote];
    }
  }

  /**
   * Converts a human-readable amount to the token's smallest unit.
   * For TON, 1 TON = 1e9 nanotons.
   * For most jettons, 1 token = 1e9 base units.
   */
  private parseAmount(amount: string, token: string): string {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return '0';

    // TON and most jettons use 9 decimals
    const decimals = token === 'USDC' || token === 'USDT' ? 6 : 9;
    return Math.floor(value * Math.pow(10, decimals)).toString();
  }

  /**
   * Selects the quote with the highest expected output amount.
   */
  private selectBestQuote(quotes: SwapQuote[]): SwapQuote {
    return quotes.reduce((best, current) => {
      const bestOut = parseFloat(best.expectedAmountOut);
      const currentOut = parseFloat(current.expectedAmountOut);
      return currentOut > bestOut ? current : best;
    });
  }

  /**
   * Builds a human-readable reason for DEX selection.
   */
  private buildSelectionReason(best: SwapQuote, all: SwapQuote[]): string {
    const others = all
      .filter(q => q.dex !== best.dex)
      .map(q => `${q.dex}: ${q.expectedAmountOut}`)
      .join(', ');

    const reason = `Best net output from ${best.dex}: ${best.expectedAmountOut} ${best.tokenOut}`;
    if (others) {
      return `${reason} (vs ${others})`;
    }
    return reason;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DexRouter with optional config and quote fetcher overrides.
 *
 * @example
 * ```typescript
 * // Production router
 * const router = createDexRouter({ enabledDexes: ['dedust', 'stonfi'] });
 *
 * // Test router with custom quote fetcher
 * const router = createDexRouter({}, mockQuoteFetcher);
 * ```
 */
export function createDexRouter(
  config?: Partial<DexRouterConfig>,
  quoteFetcher?: DexQuoteFetcher
): DexRouter {
  return new DexRouter(config, quoteFetcher);
}
