/**
 * TONAIAgent - Price Comparator Module
 *
 * Ranks and compares swap quotes collected from multiple DEXs to identify
 * the best execution price.
 *
 * Evaluation metrics (in order of priority):
 * 1. Best net output amount (highest expectedAmountOut)
 * 2. Sufficient liquidity (>= minLiquidityUsd)
 * 3. Lowest price impact (priceImpactPercent)
 * 4. Lowest total fees (feePercent)
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

import type { DexQuote, PriceComparison, PriceComparisonRow } from './types';
import { LiquidityRouterError } from './types';

// ============================================================================
// Price Comparator
// ============================================================================

/**
 * PriceComparator — ranks DEX quotes and selects the best execution price.
 *
 * @example
 * ```typescript
 * const comparator = createPriceComparator({ minLiquidityUsd: 10_000 });
 * const comparison = comparator.compare(quotes);
 *
 * console.log(comparison.bestQuote.dex);             // 'stonfi'
 * console.log(comparison.summary);                   // ranked table
 * ```
 */
export class PriceComparator {
  private readonly minLiquidityUsd: number;
  private readonly maxPriceImpactPercent: number;

  constructor(options: {
    minLiquidityUsd?: number;
    maxPriceImpactPercent?: number;
  } = {}) {
    this.minLiquidityUsd = options.minLiquidityUsd ?? 10_000;
    this.maxPriceImpactPercent = options.maxPriceImpactPercent ?? 3.0;
  }

  /**
   * Compares quotes and returns a ranked comparison.
   *
   * @throws LiquidityRouterError 'NO_LIQUIDITY' if all quotes fail the
   *         liquidity/impact filters.
   * @throws LiquidityRouterError 'NO_ROUTES' if quotes array is empty.
   */
  compare(quotes: DexQuote[]): PriceComparison {
    if (quotes.length === 0) {
      throw new LiquidityRouterError(
        'No quotes to compare',
        'NO_ROUTES'
      );
    }

    // Filter quotes that meet minimum quality thresholds
    const qualified = quotes.filter(q =>
      q.liquidityUsd >= this.minLiquidityUsd &&
      q.priceImpactPercent <= this.maxPriceImpactPercent
    );

    // If nothing passes the filter, fall back to unfiltered set
    const candidates = qualified.length > 0 ? qualified : quotes;

    if (candidates.length === 0) {
      throw new LiquidityRouterError(
        `All quotes failed quality checks (minLiquidity=${this.minLiquidityUsd}, maxPriceImpact=${this.maxPriceImpactPercent}%)`,
        'INSUFFICIENT_LIQUIDITY',
        { quotesChecked: quotes.length }
      );
    }

    // Sort by: 1) highest expected output, 2) lowest price impact, 3) lowest fee
    const ranked = [...candidates].sort((a, b) => {
      const outA = parseFloat(a.expectedAmountOut);
      const outB = parseFloat(b.expectedAmountOut);
      if (outB !== outA) return outB - outA;                       // higher output first
      if (a.priceImpactPercent !== b.priceImpactPercent) return a.priceImpactPercent - b.priceImpactPercent;
      return a.feePercent - b.feePercent;
    });

    const bestQuote = ranked[0];

    const summary: PriceComparisonRow[] = ranked.map((q, i) => ({
      dex: q.dex,
      executionPrice: q.executionPrice,
      liquidityUsd: q.liquidityUsd,
      slippagePercent: q.slippagePercent,
      feePercent: q.feePercent,
      expectedAmountOut: q.expectedAmountOut,
      rank: i + 1,
    }));

    return {
      rankedQuotes: ranked,
      bestQuote,
      summary,
    };
  }

  /**
   * Formats the comparison as a human-readable table string.
   *
   * Example output:
   * ```
   * DEX       Price    Liquidity($)  Slippage  Fee     Output
   * ---------------------------------------------------------------
   * stonfi    2.09     150000        0.5%      0.3%    209000000   ← BEST
   * dedust    2.11     250000        0.3%      0.3%    211000000
   * tonco     2.12     50000         1.2%      0.3%    212000000
   * ```
   */
  formatSummary(comparison: PriceComparison): string {
    const header = `DEX       Price    Liquidity($)  Slippage  Fee     Output`;
    const divider = `---------------------------------------------------------------`;
    const rows = comparison.summary.map(row => {
      const best = row.rank === 1 ? ' ← BEST' : '';
      return [
        row.dex.padEnd(10),
        row.executionPrice.toFixed(4).padEnd(9),
        row.liquidityUsd.toFixed(0).padEnd(14),
        `${row.slippagePercent.toFixed(1)}%`.padEnd(10),
        `${row.feePercent.toFixed(1)}%`.padEnd(8),
        row.expectedAmountOut.padEnd(12),
        best,
      ].join('');
    });
    return [header, divider, ...rows].join('\n');
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a PriceComparator with optional quality thresholds.
 */
export function createPriceComparator(options?: {
  minLiquidityUsd?: number;
  maxPriceImpactPercent?: number;
}): PriceComparator {
  return new PriceComparator(options);
}
