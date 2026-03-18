/**
 * TONAIAgent - Cross-DEX Liquidity Router
 *
 * Main orchestrator that wires together DEX discovery, price comparison,
 * and route optimization to produce an ExecutionPlan for the DEX Execution Layer.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         ↓
 *   Agent Execution Loop
 *         ↓
 *   LiquidityRouter (this file)
 *     ├── DexDiscovery     → query pools & quotes from all enabled DEXs
 *     ├── PriceComparator  → rank quotes by net output
 *     └── RouteOptimizer   → select single- or multi-hop execution path
 *         ↓
 *   ExecutionPlan
 *         ↓
 *   DEX Execution Layer (#235)
 *         ↓
 *   TON Blockchain
 * ```
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

import type {
  SwapRequest,
  ExecutionPlan,
  LiquidityRouterConfig,
  LiquiditySnapshot,
} from './types';
import {
  DEFAULT_LIQUIDITY_ROUTER_CONFIG,
  TOKEN_DECIMALS,
  LiquidityRouterError,
} from './types';
import { DexDiscovery, createDexDiscovery, type DexQuoteFetcher } from './dex_discovery';
import { PriceComparator, createPriceComparator } from './price_comparator';
import { RouteOptimizer, createRouteOptimizer } from './route_optimizer';

// ============================================================================
// Liquidity Router
// ============================================================================

/**
 * LiquidityRouter — cross-DEX routing engine for TON swaps.
 *
 * @example
 * ```typescript
 * const router = createLiquidityRouter();
 *
 * const plan = await router.route({
 *   pair: 'TON/USDT',
 *   action: 'BUY',
 *   amount: '100',
 * });
 *
 * console.log(plan.dex);           // 'stonfi'
 * console.log(plan.expectedOut);   // 209
 * console.log(plan.slippage);      // '0.5%'
 * ```
 */
export class LiquidityRouter {
  private readonly config: LiquidityRouterConfig;
  private readonly discovery: DexDiscovery;
  private readonly comparator: PriceComparator;
  private readonly optimizer: RouteOptimizer;

  constructor(
    config: Partial<LiquidityRouterConfig> = {},
    fetcher?: DexQuoteFetcher
  ) {
    this.config = { ...DEFAULT_LIQUIDITY_ROUTER_CONFIG, ...config };
    this.discovery = createDexDiscovery(fetcher);
    this.comparator = createPriceComparator({
      minLiquidityUsd: this.config.minLiquidityUsd,
      maxPriceImpactPercent: this.config.maxPriceImpactPercent,
    });
    this.optimizer = createRouteOptimizer({
      enableMultiHop: this.config.enableMultiHop,
    });
  }

  /**
   * Returns the current router configuration.
   */
  getConfig(): LiquidityRouterConfig {
    return { ...this.config };
  }

  /**
   * Routes a swap request through the best available DEX.
   *
   * Steps:
   * 1. Parse pair and direction to determine tokenIn / tokenOut
   * 2. Convert amount to smallest token unit
   * 3. Discover liquidity across all enabled DEXs
   * 4. Compare prices
   * 5. Optimize route selection
   * 6. Return ExecutionPlan
   *
   * @throws LiquidityRouterError if routing fails at any step
   */
  async route(request: SwapRequest): Promise<ExecutionPlan> {
    const slippage = request.slippageTolerance ?? this.config.slippageTolerance;
    const { tokenIn, tokenOut } = this.resolveTokens(request);
    const amountInRaw = this.toSmallestUnit(request.amount, tokenIn);

    const snapshot = await this.discovery.discover({
      tokenIn,
      tokenOut,
      amountIn: amountInRaw,
      slippageTolerance: slippage,
      enabledDexes: this.config.enabledDexes,
    });

    if (this.config.debug) {
      console.log(
        `[LiquidityRouter] Discovery: ${snapshot.quotes.length} quotes, ` +
        `${snapshot.pools.length} pools in ${snapshot.discoveryDurationMs}ms`
      );
    }

    const comparison = this.comparator.compare(snapshot.quotes);

    if (this.config.debug) {
      const PriceComparatorClass = this.comparator as PriceComparator;
      // Use type assertion for formatSummary since it's on the class
      const summary = (PriceComparatorClass as unknown as { formatSummary: (c: typeof comparison) => string }).formatSummary(comparison);
      console.log(`[LiquidityRouter] Price comparison:\n${summary}`);
    }

    const { bestRoute, candidates, selectionReason } = this.optimizer.optimize(comparison);

    // Determine final output in display units
    const amountIn = parseFloat(request.amount);
    const expectedOut = this.fromSmallestUnit(
      bestRoute.type === 'single'
        ? bestRoute.quote.expectedAmountOut
        : bestRoute.estimatedAmountOut,
      tokenOut
    );

    return {
      dex: bestRoute.type === 'single' ? bestRoute.dex : bestRoute.hops[bestRoute.hops.length - 1].dex,
      pair: request.pair,
      amountIn,
      expectedOut,
      slippage: `${slippage}%`,
      route: bestRoute,
      candidates,
      selectionReason,
      generatedAt: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Discover liquidity pools for a pair without routing.
   * Useful for market data queries.
   */
  async discoverLiquidity(tokenA: string, tokenB: string): Promise<LiquiditySnapshot> {
    return this.discovery.discover({
      tokenIn: tokenA,
      tokenOut: tokenB,
      amountIn: '0',
      slippageTolerance: this.config.slippageTolerance,
      enabledDexes: this.config.enabledDexes,
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Resolves tokenIn and tokenOut from pair and action.
   * BUY TON/USDT → tokenIn=USDT (spend quote), tokenOut=TON (receive base)
   * SELL TON/USDT → tokenIn=TON (spend base), tokenOut=USDT (receive quote)
   */
  private resolveTokens(request: SwapRequest): { tokenIn: string; tokenOut: string } {
    const parts = request.pair.split('/');
    if (parts.length !== 2) {
      throw new LiquidityRouterError(
        `Invalid pair format: '${request.pair}'. Expected 'BASE/QUOTE'`,
        'INVALID_PAIR',
        { pair: request.pair }
      );
    }
    const [base, quote] = parts;
    if (request.action === 'BUY') {
      return { tokenIn: quote, tokenOut: base };
    }
    return { tokenIn: base, tokenOut: quote };
  }

  /**
   * Converts a display amount to smallest token unit.
   * E.g. 10 TON → 10_000_000_000 nanotons (9 decimals)
   *      100 USDT → 100_000_000 (6 decimals)
   */
  private toSmallestUnit(amount: string, token: string): string {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return '0';
    const decimals = TOKEN_DECIMALS[token] ?? 9;
    return Math.floor(value * Math.pow(10, decimals)).toString();
  }

  /**
   * Converts a smallest-unit amount back to display units.
   */
  private fromSmallestUnit(amount: string, token: string): number {
    const value = parseFloat(amount);
    if (isNaN(value)) return 0;
    const decimals = TOKEN_DECIMALS[token] ?? 9;
    return value / Math.pow(10, decimals);
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a LiquidityRouter with optional config and quote fetcher overrides.
 *
 * @example
 * ```typescript
 * // Production router
 * const router = createLiquidityRouter({
 *   enabledDexes: ['dedust', 'stonfi'],
 *   slippageTolerance: 0.5,
 * });
 *
 * // Test router with mock fetcher
 * const router = createLiquidityRouter({}, mockFetcher);
 * ```
 */
export function createLiquidityRouter(
  config?: Partial<LiquidityRouterConfig>,
  fetcher?: DexQuoteFetcher
): LiquidityRouter {
  return new LiquidityRouter(config, fetcher);
}
