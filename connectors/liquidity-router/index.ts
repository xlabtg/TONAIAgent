/**
 * TONAIAgent - Cross-DEX Liquidity Router
 *
 * Discovers liquidity across multiple TON DEXs (DeDust, STON.fi, TONCO),
 * compares swap prices, estimates slippage, and selects the optimal
 * execution route for AI trading agents.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         ↓
 *   Agent Execution Loop
 *         ↓
 *   Cross-DEX Router  ← this module
 *         ↓
 *   DEX Execution Layer (#235)
 *         ↓
 *   TON Blockchain
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createLiquidityRouter } from '@tonaiagent/core/liquidity-router';
 *
 * const router = createLiquidityRouter({
 *   enabledDexes: ['dedust', 'stonfi', 'tonco'],
 *   slippageTolerance: 0.5,
 * });
 *
 * const plan = await router.route({
 *   pair: 'TON/USDT',
 *   action: 'BUY',
 *   amount: '100',      // 100 USDT to spend
 * });
 *
 * console.log(plan.dex);         // 'stonfi'
 * console.log(plan.expectedOut); // 47.3 (TON)
 * console.log(plan.slippage);    // '0.5%'
 * ```
 *
 * ## Individual Components
 *
 * ```typescript
 * import {
 *   createDexDiscovery,
 *   createPriceComparator,
 *   createRouteOptimizer,
 * } from '@tonaiagent/core/liquidity-router';
 *
 * // 1. Discover liquidity
 * const discovery = createDexDiscovery();
 * const snapshot = await discovery.discover({
 *   tokenIn: 'USDT',
 *   tokenOut: 'TON',
 *   amountIn: '100000000',
 *   slippageTolerance: 0.5,
 *   enabledDexes: ['dedust', 'stonfi', 'tonco'],
 * });
 *
 * // 2. Compare prices
 * const comparator = createPriceComparator({ minLiquidityUsd: 10_000 });
 * const comparison = comparator.compare(snapshot.quotes);
 * console.log(comparator.formatSummary(comparison));
 *
 * // 3. Optimize route
 * const optimizer = createRouteOptimizer();
 * const { bestRoute, selectionReason } = optimizer.optimize(comparison);
 * ```
 *
 * @see Issue #237 — Cross-DEX Liquidity Router
 */

// ============================================================================
// Types
// ============================================================================

export type {
  DexId,
  LiquidityPool,
  DexQuote,
  SingleHopRoute,
  MultiHopRoute,
  CandidateRoute,
  ExecutionPlan,
  LiquiditySnapshot,
  PriceComparison,
  PriceComparisonRow,
  LiquidityRouterConfig,
  SwapRequest,
  LiquidityRouterErrorCode,
} from './types';

export {
  DEFAULT_LIQUIDITY_ROUTER_CONFIG,
  TON_TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  LiquidityRouterError,
} from './types';

// ============================================================================
// DEX Discovery
// ============================================================================

export {
  DexDiscovery,
  HttpDexQuoteFetcher,
  createDexDiscovery,
  type DexQuoteFetcher,
} from './dex_discovery';

// ============================================================================
// Price Comparator
// ============================================================================

export {
  PriceComparator,
  createPriceComparator,
} from './price_comparator';

// ============================================================================
// Route Optimizer
// ============================================================================

export {
  RouteOptimizer,
  createRouteOptimizer,
} from './route_optimizer';

// ============================================================================
// Router (Main Entry Point)
// ============================================================================

export {
  LiquidityRouter,
  createLiquidityRouter,
} from './router';
