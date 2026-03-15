/**
 * TONAIAgent - Strategy Interface
 *
 * Common interface that all trading strategies must implement.
 * Each strategy receives market data and configurable parameters,
 * and returns a JSON trade signal with action (BUY/SELL/HOLD), asset, and amount.
 */

import type { MarketData, StrategyMetadata, StrategyParams, TradeSignal } from './types';

/**
 * StrategyInterface — the contract every strategy class must fulfill.
 *
 * @example
 * ```typescript
 * class MyStrategy implements StrategyInterface {
 *   getMetadata(): StrategyMetadata {
 *     return {
 *       id: 'my-strategy',
 *       name: 'My Strategy',
 *       description: 'A custom trading strategy',
 *       version: '1.0.0',
 *       params: [
 *         { name: 'threshold', type: 'number', defaultValue: 0.5, description: 'Signal threshold' },
 *       ],
 *       supportedAssets: ['TON'],
 *     };
 *   }
 *
 *   async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
 *     // Implement your strategy logic here
 *     return {
 *       action: 'BUY',
 *       asset: 'TON',
 *       amount: '100000000',
 *       confidence: 0.8,
 *       reason: 'Signal threshold exceeded',
 *       strategyId: this.getMetadata().id,
 *       generatedAt: new Date(),
 *     };
 *   }
 * }
 * ```
 */
export interface StrategyInterface {
  /**
   * Returns the strategy's metadata including ID, name, description,
   * version, parameter definitions, and supported assets.
   */
  getMetadata(): StrategyMetadata;

  /**
   * Executes the strategy logic against the provided market data
   * and returns a trade signal.
   *
   * @param marketData - Current market data snapshot
   * @param params - Strategy parameters (merged with defaults)
   * @returns A trade signal indicating BUY, SELL, or HOLD
   */
  execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal>;
}

/**
 * Abstract base class for strategies, providing parameter merging utility.
 * Strategies may extend this for convenience, or implement StrategyInterface directly.
 */
export abstract class BaseStrategy implements StrategyInterface {
  abstract getMetadata(): StrategyMetadata;
  abstract execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal>;

  /**
   * Merges provided params with the strategy's default values.
   * Ensures all declared parameters have a resolved value.
   */
  protected mergeParams(params: StrategyParams): StrategyParams {
    const metadata = this.getMetadata();
    const merged: StrategyParams = {};

    for (const paramDef of metadata.params) {
      merged[paramDef.name] = paramDef.name in params ? params[paramDef.name] : paramDef.defaultValue;
    }

    // Also pass through any extra params provided
    for (const [key, value] of Object.entries(params)) {
      if (!(key in merged)) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Helper to get the current price of an asset from market data.
   * Returns undefined if the asset is not present.
   */
  protected getPrice(marketData: MarketData, asset: string): number | undefined {
    return marketData.prices[asset]?.price;
  }

  /**
   * Helper to generate a unique signal ID.
   */
  protected generateSignalId(): string {
    return `signal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
