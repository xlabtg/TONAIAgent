/**
 * TONAIAgent - Strategy Execution Engine
 *
 * Implements the pipeline:
 *   Receive Market Data → Load Strategy → Run Strategy Logic → Generate Signal → Send to Trading Engine
 *
 * The engine is the bridge between the Agent Runtime's execution pipeline and
 * the configured strategies. It runs strategies on demand, collects signals,
 * and forwards them to the Trading Engine.
 */

import type {
  MarketData,
  StrategyEngineConfig,
  StrategyEngineEvent,
  StrategyEngineEventHandler,
  StrategyEngineMetrics,
  StrategyEngineUnsubscribe,
  StrategyExecutionResult,
  StrategyParams,
  TradeSignal,
} from './types';
import { StrategyEngineError } from './types';
import type { StrategyRegistry } from './registry';

// ============================================================================
// Default Engine Configuration
// ============================================================================

export const DEFAULT_ENGINE_CONFIG: StrategyEngineConfig = {
  enabled: true,
  maxParallelExecutions: 10,
  defaultAsset: 'TON',
  defaultAmountNano: '100000000', // 0.1 TON
  forwardSignals: true,
  maxHistoryPerAgent: 100,
};

// ============================================================================
// Strategy Execution Engine
// ============================================================================

/**
 * StrategyExecutionEngine orchestrates strategy execution.
 *
 * Integrates with:
 * - StrategyRegistry: to look up and instantiate strategies
 * - AgentRuntimeOrchestrator: receives calls during the `call_ai` + `generate_plan` pipeline steps
 * - Trading Engine: receives forwarded trade signals
 *
 * @example
 * ```typescript
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 * loader.loadBuiltIns();
 *
 * const engine = createStrategyExecutionEngine(registry);
 * engine.start();
 *
 * const result = await engine.execute({
 *   strategyId: 'trend',
 *   agentId: 'agent-001',
 *   marketData: { prices: { TON: { asset: 'TON', price: 2.85, volume24h: 1_000_000, timestamp: new Date() } }, source: 'live', fetchedAt: new Date() },
 *   params: { movingAveragePeriods: 20 },
 * });
 * console.log(result.signal); // { action: 'BUY', asset: 'TON', ... }
 * ```
 */
export class StrategyExecutionEngine {
  private readonly config: StrategyEngineConfig;
  private readonly metrics: StrategyEngineMetrics;
  private readonly eventHandlers = new Set<StrategyEngineEventHandler>();
  private readonly executionHistory = new Map<string, StrategyExecutionResult[]>();
  private running = false;

  constructor(
    private readonly registry: StrategyRegistry,
    config: Partial<StrategyEngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.metrics = this.initMetrics();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the strategy execution engine */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.emitEvent('engine.started', undefined, undefined, {});
  }

  /** Stop the strategy execution engine */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.emitEvent('engine.stopped', undefined, undefined, {});
  }

  /** Whether the engine is running */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Execution Pipeline
  // ============================================================================

  /**
   * Execute a strategy and return the trade signal.
   *
   * Pipeline:
   * 1. Validate engine state and strategy availability
   * 2. Create a strategy instance with the provided parameters
   * 3. Run the strategy against the market data
   * 4. Record and optionally forward the signal
   */
  async execute(options: {
    strategyId: string;
    agentId: string;
    marketData: MarketData;
    params?: StrategyParams;
  }): Promise<StrategyExecutionResult> {
    const { strategyId, agentId, marketData, params = {} } = options;

    if (!this.config.enabled) {
      throw new StrategyEngineError('Strategy Engine is disabled', 'ENGINE_DISABLED');
    }

    if (!this.registry.has(strategyId)) {
      throw new StrategyEngineError(
        `Strategy '${strategyId}' is not registered`,
        'STRATEGY_NOT_FOUND',
        { strategyId }
      );
    }

    const executionId = this.generateId('exec');
    const startedAt = new Date();

    this.emitEvent('execution.started', strategyId, agentId, {
      executionId,
      strategyId,
      agentId,
    });

    this.metrics.totalExecutions++;

    let signal: TradeSignal;
    let success = false;
    let error: string | undefined;

    try {
      // Create a fresh strategy instance with merged params
      const instance = this.registry.createInstance(strategyId, params);

      // Execute strategy
      signal = await instance.execute(marketData, params);

      success = true;

      // Update signal metrics
      if (signal.action === 'BUY') this.metrics.buySignals++;
      else if (signal.action === 'SELL') this.metrics.sellSignals++;
      else this.metrics.holdSignals++;

      this.metrics.successfulExecutions++;

      this.emitEvent('signal.generated', strategyId, agentId, {
        executionId,
        signal,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      this.metrics.failedExecutions++;

      // Create a HOLD signal as fallback
      signal = {
        action: 'HOLD',
        asset: this.config.defaultAsset,
        amount: '0',
        confidence: 0,
        reason: `Strategy execution failed: ${error}`,
        strategyId,
        generatedAt: new Date(),
      };

      this.emitEvent('execution.failed', strategyId, agentId, {
        executionId,
        error,
      });
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Forward signal to Trading Engine (in production, calls the Trading Engine API)
    let signalForwarded = false;
    if (success && this.config.forwardSignals && signal.action !== 'HOLD') {
      signalForwarded = await this.forwardSignal(signal, agentId);
    }

    const result: StrategyExecutionResult = {
      executionId,
      strategyId,
      agentId,
      signal,
      success,
      error,
      durationMs,
      startedAt,
      completedAt,
      signalForwarded,
    };

    // Record history per agent
    if (!this.executionHistory.has(agentId)) {
      this.executionHistory.set(agentId, []);
    }
    const agentHistory = this.executionHistory.get(agentId)!;
    agentHistory.unshift(result);
    if (agentHistory.length > this.config.maxHistoryPerAgent) {
      agentHistory.splice(this.config.maxHistoryPerAgent);
    }

    this.metrics.updatedAt = new Date();

    if (success) {
      this.emitEvent('execution.completed', strategyId, agentId, {
        executionId,
        durationMs,
        action: signal.action,
        signalForwarded,
      });
    }

    return result;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /** Get execution history for an agent */
  getHistory(agentId: string): StrategyExecutionResult[] {
    return this.executionHistory.get(agentId) ?? [];
  }

  /** Get current engine metrics */
  getMetrics(): StrategyEngineMetrics {
    return {
      ...this.metrics,
      totalStrategiesRegistered: this.registry.listIds().length,
      updatedAt: new Date(),
    };
  }

  /** Subscribe to engine events */
  subscribe(handler: StrategyEngineEventHandler): StrategyEngineUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Forward a signal to the Trading Engine.
   * In production, this calls the real Trading Engine API.
   * In simulation/MVP mode, it logs the signal and returns true.
   */
  private async forwardSignal(signal: TradeSignal, agentId: string): Promise<boolean> {
    try {
      // Placeholder: in production, call the Trading Engine API
      // e.g.: await tradingEngine.submitOrder({ agentId, signal });
      this.emitEvent('signal.forwarded', signal.strategyId, agentId, {
        action: signal.action,
        asset: signal.asset,
        amount: signal.amount,
        confidence: signal.confidence,
      });
      return true;
    } catch {
      return false;
    }
  }

  private emitEvent(
    type: StrategyEngineEvent['type'],
    strategyId: string | undefined,
    agentId: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: StrategyEngineEvent = {
      id: this.generateId('evt'),
      type,
      timestamp: new Date(),
      strategyId,
      agentId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private initMetrics(): StrategyEngineMetrics {
    return {
      totalStrategiesRegistered: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      buySignals: 0,
      sellSignals: 0,
      holdSignals: 0,
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Strategy Execution Engine bound to the given registry.
 *
 * @example
 * ```typescript
 * const registry = createStrategyRegistry();
 * const engine = createStrategyExecutionEngine(registry);
 * engine.start();
 * ```
 */
export function createStrategyExecutionEngine(
  registry: StrategyRegistry,
  config?: Partial<StrategyEngineConfig>
): StrategyExecutionEngine {
  return new StrategyExecutionEngine(registry, config);
}
