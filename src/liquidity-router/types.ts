/**
 * TONAIAgent - Cross-DEX Liquidity Router Types
 *
 * Type definitions for the Cross-DEX Liquidity Router that discovers liquidity
 * across multiple TON DEXs (DeDust, STON.fi, TONCO), compares swap prices,
 * estimates slippage, and selects the optimal execution route.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         ↓
 *   Agent Execution Loop
 *         ↓
 *   Cross-DEX Router          ← this module
 *         ↓
 *   DEX Execution Layer
 *         ↓
 *   TON Blockchain
 * ```
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

// ============================================================================
// DEX Identifiers
// ============================================================================

/** Supported TON DEX identifiers. */
export type DexId = 'dedust' | 'stonfi' | 'tonco';

// ============================================================================
// Pool & Liquidity Types
// ============================================================================

/**
 * A liquidity pool discovered on a specific DEX.
 */
export interface LiquidityPool {
  /** Unique pool address on TON */
  poolAddress: string;
  /** DEX this pool belongs to */
  dex: DexId;
  /** First token in the pair */
  tokenA: string;
  /** Second token in the pair */
  tokenB: string;
  /** Total Value Locked in USD */
  tvlUsd: number;
  /** 24h trading volume in USD */
  volume24hUsd: number;
  /** Pool fee percentage (e.g. 0.3 for 0.3%) */
  feePercent: number;
  /** When this pool data was fetched (Unix timestamp) */
  discoveredAt: number;
}

/**
 * Price quote from a specific DEX for a swap.
 */
export interface DexQuote {
  /** DEX providing this quote */
  dex: DexId;
  /** Pool used for this quote */
  poolAddress: string;
  /** Token being swapped in (symbol, e.g. "TON") */
  tokenIn: string;
  /** Token being received (symbol, e.g. "USDT") */
  tokenOut: string;
  /** Amount in (in token's smallest unit) */
  amountIn: string;
  /** Expected amount out (in token's smallest unit) */
  expectedAmountOut: string;
  /** Execution price: amountOut / amountIn (in display units) */
  executionPrice: number;
  /** Price impact as percentage (0–100) */
  priceImpactPercent: number;
  /** Slippage estimate as percentage */
  slippagePercent: number;
  /** Available liquidity in USD */
  liquidityUsd: number;
  /** DEX fee percentage */
  feePercent: number;
  /** Minimum amount out after slippage tolerance */
  minimumAmountOut: string;
  /** When this quote was fetched (Unix timestamp) */
  timestamp: number;
}

// ============================================================================
// Route Types
// ============================================================================

/**
 * A single-hop route: swap directly on one DEX.
 */
export interface SingleHopRoute {
  type: 'single';
  /** DEX to execute on */
  dex: DexId;
  /** Token in */
  tokenIn: string;
  /** Token out */
  tokenOut: string;
  /** Quote for this route */
  quote: DexQuote;
}

/**
 * A multi-hop route: chain swaps across DEXs for better pricing.
 * Example: TON → USDT → TokenX
 */
export interface MultiHopRoute {
  type: 'multi';
  /** Ordered list of hops */
  hops: SingleHopRoute[];
  /** Total token in */
  tokenIn: string;
  /** Total token out */
  tokenOut: string;
  /** Estimated total output after all hops (in smallest unit) */
  estimatedAmountOut: string;
  /** Estimated total slippage across all hops */
  totalSlippagePercent: number;
  /** Combined fees across all hops */
  totalFeePercent: number;
}

/** A candidate route (single or multi-hop). */
export type CandidateRoute = SingleHopRoute | MultiHopRoute;

// ============================================================================
// Execution Plan
// ============================================================================

/**
 * The final execution plan returned by the router.
 * This is consumed by the DEX Execution Layer.
 */
export interface ExecutionPlan {
  /** Selected DEX for execution */
  dex: DexId;
  /** Trading pair (e.g. "TON/USDT") */
  pair: string;
  /** Input amount (in display units, e.g. "100") */
  amountIn: number;
  /** Expected output amount (in display units) */
  expectedOut: number;
  /** Maximum acceptable slippage percentage */
  slippage: string;
  /** Selected route details */
  route: CandidateRoute;
  /** All candidate routes evaluated */
  candidates: CandidateRoute[];
  /** Reason for route selection */
  selectionReason: string;
  /** When this plan was generated (Unix timestamp) */
  generatedAt: number;
}

// ============================================================================
// Discovery & Comparator Types
// ============================================================================

/**
 * Snapshot of liquidity data collected during discovery.
 */
export interface LiquiditySnapshot {
  /** All pools discovered across DEXs */
  pools: LiquidityPool[];
  /** All quotes collected for the requested swap */
  quotes: DexQuote[];
  /** When discovery started (Unix timestamp) */
  discoveredAt: number;
  /** Time taken to complete discovery in ms */
  discoveryDurationMs: number;
}

/**
 * Comparison result from the price comparator.
 */
export interface PriceComparison {
  /** Sorted quotes from best to worst (by net output) */
  rankedQuotes: DexQuote[];
  /** Best quote selected */
  bestQuote: DexQuote;
  /** Summary table rows for logging/display */
  summary: PriceComparisonRow[];
}

/**
 * A single row in the price comparison table.
 */
export interface PriceComparisonRow {
  dex: DexId;
  executionPrice: number;
  liquidityUsd: number;
  slippagePercent: number;
  feePercent: number;
  expectedAmountOut: string;
  rank: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the Cross-DEX Liquidity Router.
 */
export interface LiquidityRouterConfig {
  /** DEXs to query */
  enabledDexes: DexId[];
  /** Slippage tolerance percentage (e.g. 0.5 for 0.5%) */
  slippageTolerance: number;
  /** Minimum required liquidity in USD */
  minLiquidityUsd: number;
  /** Maximum acceptable price impact percentage */
  maxPriceImpactPercent: number;
  /** Quote cache TTL in seconds */
  quoteCacheTtlSeconds: number;
  /** Enable multi-hop routing */
  enableMultiHop: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default router configuration.
 */
export const DEFAULT_LIQUIDITY_ROUTER_CONFIG: LiquidityRouterConfig = {
  enabledDexes: ['dedust', 'stonfi', 'tonco'],
  slippageTolerance: 0.5,
  minLiquidityUsd: 10_000,
  maxPriceImpactPercent: 3.0,
  quoteCacheTtlSeconds: 10,
  enableMultiHop: false,  // multi-hop ready but off by default
};

// ============================================================================
// Swap Request
// ============================================================================

/**
 * A swap request from the Strategy Engine / Agent Execution Loop.
 */
export interface SwapRequest {
  /** Base/quote pair, e.g. "TON/USDT" */
  pair: string;
  /** Trade direction */
  action: 'BUY' | 'SELL';
  /**
   * Amount to swap in display units (e.g. "100" for 100 USDT).
   * For BUY: amount of quote token to spend.
   * For SELL: amount of base token to sell.
   */
  amount: string;
  /** Optional override slippage tolerance */
  slippageTolerance?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for liquidity router operations. */
export type LiquidityRouterErrorCode =
  | 'DISCOVERY_FAILED'
  | 'NO_LIQUIDITY'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'NO_ROUTES'
  | 'PRICE_IMPACT_TOO_HIGH'
  | 'INVALID_PAIR'
  | 'QUOTE_FETCH_FAILED';

/** Structured error for router operations. */
export class LiquidityRouterError extends Error {
  constructor(
    message: string,
    public readonly code: LiquidityRouterErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LiquidityRouterError';
  }
}

// ============================================================================
// Token Address Registry
// ============================================================================

/** Known token addresses on TON mainnet for common assets. */
export const TON_TOKEN_ADDRESSES: Record<string, string> = {
  TON: 'native',
  USDT: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  USDC: 'EQB-MPwrd1G6WKNkLz_VnV6WqBDd142KMQv-g1O-8QUA3728',
  NOT: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT',
  DOGS: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS',
};

/** Token decimal places for amount conversion. */
export const TOKEN_DECIMALS: Record<string, number> = {
  TON: 9,
  USDT: 6,
  USDC: 6,
  NOT: 9,
  DOGS: 9,
};
