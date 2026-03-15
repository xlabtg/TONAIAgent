/**
 * TONAIAgent - Strategy Registry
 *
 * Maintains a registry of available strategies, powering agent creation
 * and future marketplace integration. Strategies are registered by their
 * metadata and factory functions; the registry does not hold live instances.
 */

import type {
  RegisteredStrategyClass,
  StrategyEngineEvent,
  StrategyEngineEventHandler,
  StrategyEngineUnsubscribe,
  StrategyInterface,
  StrategyMetadata,
  StrategyParams,
} from './types';
import { StrategyEngineError } from './types';

// ============================================================================
// Strategy Registry Interface
// ============================================================================

/** Public interface for the strategy registry */
export interface StrategyRegistry {
  /**
   * Register a strategy class with its factory function.
   * @param metadata - Strategy metadata (id, name, params, etc.)
   * @param factory - Factory that creates instances with given params
   */
  register(metadata: StrategyMetadata, factory: (params: StrategyParams) => StrategyInterface): void;

  /** Unregister a strategy by ID */
  unregister(strategyId: string): void;

  /** Check if a strategy is registered */
  has(strategyId: string): boolean;

  /** Get metadata for a registered strategy */
  getMetadata(strategyId: string): StrategyMetadata | undefined;

  /** List all registered strategy IDs */
  listIds(): string[];

  /** List metadata for all registered strategies */
  listAll(): StrategyMetadata[];

  /** Create a live instance of a strategy with the given params */
  createInstance(strategyId: string, params?: StrategyParams): StrategyInterface;

  /** Subscribe to registry events */
  subscribe(handler: StrategyEngineEventHandler): StrategyEngineUnsubscribe;
}

// ============================================================================
// Default Strategy Registry Implementation
// ============================================================================

/**
 * DefaultStrategyRegistry maintains all available strategy classes.
 *
 * @example
 * ```typescript
 * const registry = createStrategyRegistry();
 *
 * // Register a strategy
 * registry.register(
 *   myStrategy.getMetadata(),
 *   (params) => new MyStrategy(params)
 * );
 *
 * // List available strategies
 * const ids = registry.listIds(); // ['my-strategy']
 *
 * // Create a live instance
 * const instance = registry.createInstance('my-strategy', { threshold: 0.8 });
 * ```
 */
export class DefaultStrategyRegistry implements StrategyRegistry {
  private readonly strategies = new Map<string, RegisteredStrategyClass>();
  private readonly eventHandlers = new Set<StrategyEngineEventHandler>();

  register(metadata: StrategyMetadata, factory: (params: StrategyParams) => StrategyInterface): void {
    if (this.strategies.has(metadata.id)) {
      throw new StrategyEngineError(
        `Strategy '${metadata.id}' is already registered`,
        'STRATEGY_ALREADY_REGISTERED',
        { strategyId: metadata.id }
      );
    }

    this.strategies.set(metadata.id, { metadata, factory });
    this.emitEvent('strategy.registered', metadata.id, { metadata });
  }

  unregister(strategyId: string): void {
    if (!this.strategies.has(strategyId)) {
      throw new StrategyEngineError(
        `Strategy '${strategyId}' is not registered`,
        'STRATEGY_NOT_FOUND',
        { strategyId }
      );
    }

    this.strategies.delete(strategyId);
    this.emitEvent('strategy.unregistered', strategyId, { strategyId });
  }

  has(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }

  getMetadata(strategyId: string): StrategyMetadata | undefined {
    return this.strategies.get(strategyId)?.metadata;
  }

  listIds(): string[] {
    return Array.from(this.strategies.keys());
  }

  listAll(): StrategyMetadata[] {
    return Array.from(this.strategies.values()).map((s) => s.metadata);
  }

  createInstance(strategyId: string, params: StrategyParams = {}): StrategyInterface {
    const registered = this.strategies.get(strategyId);
    if (!registered) {
      throw new StrategyEngineError(
        `Strategy '${strategyId}' is not registered`,
        'STRATEGY_NOT_FOUND',
        { strategyId }
      );
    }

    // Merge provided params with defaults declared in metadata
    const merged: StrategyParams = {};
    for (const paramDef of registered.metadata.params) {
      merged[paramDef.name] = paramDef.name in params ? params[paramDef.name] : paramDef.defaultValue;
    }

    return registered.factory(merged);
  }

  subscribe(handler: StrategyEngineEventHandler): StrategyEngineUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(
    type: StrategyEngineEvent['type'],
    strategyId: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: StrategyEngineEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
      strategyId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to protect the registry
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/** Create a new StrategyRegistry instance */
export function createStrategyRegistry(): StrategyRegistry {
  return new DefaultStrategyRegistry();
}
