/**
 * TONAIAgent - Route Optimizer Module
 *
 * Builds and evaluates candidate routes (single-hop and multi-hop) for a
 * given swap, then selects the optimal execution path.
 *
 * Single-hop: direct swap on the best DEX.
 * Multi-hop:  chained swaps through an intermediate token when the combined
 *             path yields better pricing (future-ready, disabled by default).
 *
 * Route scoring uses:
 *   score = expectedAmountOut × (1 - totalSlippagePercent/100)
 *           × (1 - totalFeePercent/100)
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

import type {
  DexQuote,
  CandidateRoute,
  SingleHopRoute,
  MultiHopRoute,
  PriceComparison,
} from './types';
import { LiquidityRouterError } from './types';

// ============================================================================
// Route Score
// ============================================================================

/** Numeric score for a candidate route (higher = better). */
function scoreRoute(route: CandidateRoute): number {
  if (route.type === 'single') {
    const out = parseFloat(route.quote.expectedAmountOut);
    return out
      * (1 - route.quote.slippagePercent / 100)
      * (1 - route.quote.feePercent / 100);
  }

  // Multi-hop: use estimatedAmountOut minus combined costs
  const out = parseFloat(route.estimatedAmountOut);
  return out
    * (1 - route.totalSlippagePercent / 100)
    * (1 - route.totalFeePercent / 100);
}

// ============================================================================
// Route Builder
// ============================================================================

/**
 * Builds single-hop candidate routes from a PriceComparison result.
 */
function buildSingleHopRoutes(comparison: PriceComparison): SingleHopRoute[] {
  return comparison.rankedQuotes.map(quote => ({
    type: 'single' as const,
    dex: quote.dex,
    tokenIn: quote.tokenIn,
    tokenOut: quote.tokenOut,
    quote,
  }));
}

/**
 * Builds multi-hop candidate routes by chaining two quotes through an
 * intermediate token (e.g. TON → USDT → TokenX).
 *
 * Only builds routes where intermediate token is present in both quote sets.
 */
function buildMultiHopRoutes(
  leg1Quotes: DexQuote[],
  leg2Quotes: DexQuote[]
): MultiHopRoute[] {
  const routes: MultiHopRoute[] = [];

  for (const q1 of leg1Quotes) {
    for (const q2 of leg2Quotes) {
      // Ensure leg1 output token matches leg2 input token
      if (q1.tokenOut !== q2.tokenIn) continue;
      // Skip routes using the same DEX for both legs (trivial path)
      if (q1.dex === q2.dex) continue;

      const estimatedOut = q2.expectedAmountOut;
      const totalSlippage = q1.slippagePercent + q2.slippagePercent;
      const totalFee = q1.feePercent + q2.feePercent;

      routes.push({
        type: 'multi',
        hops: [
          { type: 'single', dex: q1.dex, tokenIn: q1.tokenIn, tokenOut: q1.tokenOut, quote: q1 },
          { type: 'single', dex: q2.dex, tokenIn: q2.tokenIn, tokenOut: q2.tokenOut, quote: q2 },
        ],
        tokenIn: q1.tokenIn,
        tokenOut: q2.tokenOut,
        estimatedAmountOut: estimatedOut,
        totalSlippagePercent: totalSlippage,
        totalFeePercent: totalFee,
      });
    }
  }

  return routes;
}

// ============================================================================
// Route Optimizer
// ============================================================================

/**
 * RouteOptimizer — evaluates candidate routes and selects the optimal path.
 *
 * @example
 * ```typescript
 * const optimizer = createRouteOptimizer({ enableMultiHop: false });
 * const { bestRoute, candidates, selectionReason } = optimizer.optimize(comparison);
 *
 * console.log(bestRoute.dex);        // 'stonfi'
 * console.log(selectionReason);      // 'Best net output from stonfi: ...'
 * ```
 */
export class RouteOptimizer {
  private readonly enableMultiHop: boolean;

  constructor(options: { enableMultiHop?: boolean } = {}) {
    this.enableMultiHop = options.enableMultiHop ?? false;
  }

  /**
   * Selects the optimal route from a price comparison.
   *
   * @throws LiquidityRouterError 'NO_ROUTES' if no candidates can be built.
   */
  optimize(
    comparison: PriceComparison,
    multiHopLeg2Quotes?: DexQuote[]
  ): {
    bestRoute: CandidateRoute;
    candidates: CandidateRoute[];
    selectionReason: string;
  } {
    const candidates: CandidateRoute[] = buildSingleHopRoutes(comparison);

    if (this.enableMultiHop && multiHopLeg2Quotes && multiHopLeg2Quotes.length > 0) {
      const multiHop = buildMultiHopRoutes(comparison.rankedQuotes, multiHopLeg2Quotes);
      candidates.push(...multiHop);
    }

    if (candidates.length === 0) {
      throw new LiquidityRouterError('No routes available to optimize', 'NO_ROUTES');
    }

    // Sort candidates by score descending
    const ranked = [...candidates].sort((a, b) => scoreRoute(b) - scoreRoute(a));
    const bestRoute = ranked[0];
    const selectionReason = this.buildReason(bestRoute, ranked);

    return { bestRoute, candidates: ranked, selectionReason };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private buildReason(best: CandidateRoute, all: CandidateRoute[]): string {
    if (best.type === 'single') {
      const quote = best.quote;
      const others = all
        .filter(r => r !== best)
        .map(r => {
          if (r.type === 'single') return `${r.dex}: ${r.quote.expectedAmountOut}`;
          return `multi-hop: ${r.estimatedAmountOut}`;
        })
        .join(', ');

      const base = `Best net output from ${best.dex}: ${quote.expectedAmountOut} ${quote.tokenOut}`;
      return others ? `${base} (vs ${others})` : base;
    }

    const hops = best.hops.map(h => `${h.dex}(${h.tokenIn}→${h.tokenOut})`).join(' → ');
    return `Multi-hop route [${hops}]: ${best.estimatedAmountOut} (totalSlippage=${best.totalSlippagePercent.toFixed(2)}%)`;
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a RouteOptimizer instance.
 */
export function createRouteOptimizer(options?: {
  enableMultiHop?: boolean;
}): RouteOptimizer {
  return new RouteOptimizer(options);
}
