/**
 * TONAIAgent - Strategy Engine v1
 *
 * Decision-making layer that sits between the Agent Runtime Core and the Trading Engine.
 * Agents use the Strategy Engine to load configurable trading strategies, process market data,
 * and generate trade signals that trigger simulated (or real) trades.
 *
 * Architecture:
 * ```
 *   Agent Runtime
 *         |
 *   Strategy Engine          ← this module
 *         |
 *    TrendStrategy   ArbitrageStrategy   AISignalStrategy
 *         |
 *   Trading Engine
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   createStrategyRegistry,
 *   createStrategyLoader,
 *   createStrategyExecutionEngine,
 * } from '@tonaiagent/core/strategy-engine';
 *
 * // 1. Create and populate the registry
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 * loader.loadBuiltIns(); // registers: trend, arbitrage, ai-signal
 *
 * // 2. Start the execution engine
 * const engine = createStrategyExecutionEngine(registry);
 * engine.start();
 *
 * // 3. Execute a strategy
 * const result = await engine.execute({
 *   strategyId: 'trend',
 *   agentId: 'agent-001',
 *   marketData: {
 *     prices: {
 *       TON: { asset: 'TON', price: 2.85, volume24h: 1_000_000, timestamp: new Date() },
 *     },
 *     source: 'live',
 *     fetchedAt: new Date(),
 *   },
 *   params: { movingAveragePeriods: 20 },
 * });
 *
 * console.log(result.signal); // { action: 'BUY', asset: 'TON', amount: '100000000', ... }
 * ```
 *
 * ## Integration with Agent Runtime
 *
 * The Strategy Engine is called during the `call_ai` and `generate_plan` steps
 * of the Agent Runtime's 9-step execution pipeline:
 *
 * ```typescript
 * import { createAgentRuntimeOrchestrator } from '@tonaiagent/core/agent-runtime';
 * import {
 *   createStrategyRegistry,
 *   createStrategyLoader,
 *   createStrategyExecutionEngine,
 * } from '@tonaiagent/core/strategy-engine';
 *
 * const registry = createStrategyRegistry();
 * const loader = createStrategyLoader(registry);
 * loader.loadBuiltIns();
 *
 * const strategyEngine = createStrategyExecutionEngine(registry);
 * strategyEngine.start();
 *
 * const runtime = createAgentRuntimeOrchestrator();
 * runtime.start();
 *
 * // Register agent with a strategy
 * runtime.registerAgent({
 *   agentId: 'agent-001',
 *   strategyIds: ['trend'],
 *   // ...
 * });
 *
 * // Agents can now execute strategies during the pipeline
 * await runtime.runPipeline('agent-001', 'trend');
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Signal types
  SignalAction,
  TradeSignal,
  // Market data types
  AssetPrice,
  MarketData,
  // Strategy parameter types
  StrategyParamValue,
  StrategyParam,
  StrategyParams,
  // Strategy types
  BuiltInStrategyType,
  StrategyStatus,
  StrategyMetadata,
  // Execution types
  StrategyExecutionResult,
  // Engine config types
  StrategyEngineConfig,
  StrategyEngineMetrics,
  // Loader types
  RegisteredStrategyClass,
  // Event types
  StrategyEngineEventType,
  StrategyEngineEvent,
  StrategyEngineEventHandler,
  StrategyEngineUnsubscribe,
  // Error types
  StrategyEngineErrorCode,
  // Interface
  StrategyInterface,
} from './types';

export { StrategyEngineError } from './types';

// ============================================================================
// Interface & Base Class
// ============================================================================

export { BaseStrategy } from './interface';

// ============================================================================
// Registry
// ============================================================================

export type { StrategyRegistry } from './registry';
export { DefaultStrategyRegistry, createStrategyRegistry } from './registry';

// ============================================================================
// Loader
// ============================================================================

export type { StrategyLoader } from './loader';
export { DefaultStrategyLoader, createStrategyLoader } from './loader';

// ============================================================================
// Execution Engine
// ============================================================================

export {
  StrategyExecutionEngine,
  createStrategyExecutionEngine,
  DEFAULT_ENGINE_CONFIG,
} from './execution-engine';

// ============================================================================
// Built-in Strategies
// ============================================================================

export { TrendStrategy } from './strategies/trend-strategy';
export { ArbitrageStrategy } from './strategies/arbitrage-strategy';
export { AISignalStrategy } from './strategies/ai-signal-strategy';
