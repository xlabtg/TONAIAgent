/**
 * TONAIAgent - TON DEX Market Data Connectors
 *
 * Live market data connectors for major TON DeFi DEX protocols:
 * - DeDust: AMM with concentrated liquidity
 * - STON.fi: Leading TON DEX with REST API
 * - TONCO: Fast-growing DEX built on Algebra protocol
 *
 * This module provides:
 * - Individual DEX connectors for direct access
 * - Market Data Aggregator for multi-DEX price aggregation
 * - Unified types for pools, swaps, and pricing
 *
 * @example
 * ```typescript
 * import {
 *   createMarketDataAggregator,
 *   createDedustProvider,
 *   createStonfiProvider,
 *   createToncoProvider,
 * } from '@tonaiagent/core/market-data';
 *
 * // Use the aggregator for multi-DEX data
 * const aggregator = createMarketDataAggregator();
 * aggregator.start();
 *
 * const price = await aggregator.getAggregatedPrice('TON');
 * console.log(price.priceUsd);        // Weighted average price
 * console.log(price.spreadPercent);   // Price spread across DEXs
 *
 * // Or use individual providers
 * const dedust = createDedustProvider();
 * const stonfi = createStonfiProvider();
 * const tonco = createToncoProvider();
 *
 * const dedustPrice = await dedust.getPrice('TON');
 * const stonfiPools = await stonfi.getPools();
 * ```
 *
 * @see Issue #211 — Live Market Data Connectors (TON DEX)
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Provider types
  TonDexProviderName,
  TonDexProvider,
  TonDexProviderConfig,
  // Pool types
  LiquidityPool,
  TokenInfo,
  TradingPair,
  // Price types
  DexPriceQuote,
  AggregatedPrice,
  // Swap types
  SwapEvent,
  // Historical data types
  OHLCVCandle,
  CandleInterval,
  // Aggregator types
  AggregatorConfig,
  // Event types
  TonDexEventType,
  TonDexEvent,
  TonDexEventHandler,
  TonDexUnsubscribe,
  // Error types
  TonDexErrorCode,
} from './types';

export { TonDexError } from './types';

// ============================================================================
// Base Provider
// ============================================================================

export { BaseTonDexProvider } from './base';

// ============================================================================
// DEX Providers
// ============================================================================

export { DedustProvider, createDedustProvider } from './dedust';
export { StonfiProvider, createStonfiProvider } from './stonfi';
export { ToncoProvider, createToncoProvider } from './tonco';

// ============================================================================
// Aggregator
// ============================================================================

export {
  MarketDataAggregator,
  createMarketDataAggregator,
  DEFAULT_AGGREGATOR_CONFIG,
} from './aggregator';
