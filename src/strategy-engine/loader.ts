/**
 * TONAIAgent - Strategy Loader
 *
 * Discovers and loads strategy classes into the registry.
 * In production this scans /app/strategies/ on disk; in the TypeScript SDK
 * it auto-registers the built-in core strategies and exposes an API for
 * registering additional custom strategies.
 */

import type { StrategyInterface, StrategyParams } from './types';
import { StrategyEngineError } from './types';
import type { StrategyRegistry } from './registry';
import { TrendStrategy } from './strategies/trend-strategy';
import { ArbitrageStrategy } from './strategies/arbitrage-strategy';
import { AISignalStrategy } from './strategies/ai-signal-strategy';

// ============================================================================
// Strategy Loader Interface
// ============================================================================

/** Public interface for the strategy loader */
export interface StrategyLoader {
  /**
   * Load (register) all built-in core strategies into the registry.
   * Safe to call multiple times — already-registered strategies are skipped.
   */
  loadBuiltIns(): void;

  /**
   * Register a custom strategy class.
   * The strategy's metadata is extracted via getMetadata(), and a factory
   * is created that instantiates it with the provided params.
   *
   * @param StrategyClass - Constructor of the strategy
   */
  registerCustom(StrategyClass: new (params: StrategyParams) => StrategyInterface): void;

  /**
   * Unload (unregister) a strategy by ID.
   * @param strategyId - ID of the strategy to unregister
   */
  unload(strategyId: string): void;

  /**
   * Check if a strategy with the given ID is loaded.
   */
  isLoaded(strategyId: string): boolean;
}

// ============================================================================
// Default Strategy Loader Implementation
// ============================================================================

/**
 * DefaultStrategyLoader auto-registers the three built-in core strategies
 * (Trend, Arbitrage, AISignal) and lets callers register additional custom
 * strategies with the same registry.
 *
 * @example
 * ```typescript
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 *
 * // Load all built-in strategies
 * loader.loadBuiltIns();
 *
 * // Optionally register a custom strategy
 * loader.registerCustom(MyCustomStrategy);
 *
 * // Now use the registry to create instances
 * const trend = registry.createInstance('trend', { asset: 'TON', movingAveragePeriods: 20 });
 * ```
 */
export class DefaultStrategyLoader implements StrategyLoader {
  constructor(private readonly registry: StrategyRegistry) {}

  loadBuiltIns(): void {
    const builtIns: Array<new (params?: StrategyParams) => StrategyInterface> = [
      TrendStrategy,
      ArbitrageStrategy,
      AISignalStrategy,
    ];

    for (const StrategyClass of builtIns) {
      const instance = new StrategyClass();
      const metadata = instance.getMetadata();

      if (this.registry.has(metadata.id)) {
        // Already registered — skip silently
        continue;
      }

      this.registry.register(metadata, (params: StrategyParams) => new StrategyClass(params));
    }
  }

  registerCustom(StrategyClass: new (params: StrategyParams) => StrategyInterface): void {
    // Instantiate with empty params to get metadata
    const probe = new StrategyClass({});
    const metadata = probe.getMetadata();

    if (!metadata.id || metadata.id.trim() === '') {
      throw new StrategyEngineError(
        'Custom strategy must declare a non-empty id in its metadata',
        'INVALID_PARAMS'
      );
    }

    this.registry.register(metadata, (params: StrategyParams) => new StrategyClass(params));
  }

  unload(strategyId: string): void {
    this.registry.unregister(strategyId);
  }

  isLoaded(strategyId: string): boolean {
    return this.registry.has(strategyId);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new StrategyLoader bound to the provided registry.
 *
 * @param registry - The strategy registry to load strategies into
 */
export function createStrategyLoader(registry: StrategyRegistry): StrategyLoader {
  return new DefaultStrategyLoader(registry);
}
