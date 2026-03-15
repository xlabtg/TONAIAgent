/**
 * TONAIAgent - Strategy Engine
 *
 * Autonomous Strategy Engine for AI Agents on TON blockchain.
 *
 * Features:
 * - Strategy definition and abstraction (rule-based, AI-driven, hybrid)
 * - Domain-Specific Language (DSL) for strategy configuration
 * - Real-time execution engine with scheduling and triggers
 * - Comprehensive monitoring and feedback system
 * - Backtesting and historical simulation
 * - Continuous optimization with multiple methods
 * - Risk-aware decision making
 * - AI integration for strategy generation and analysis
 *
 * @example
 * ```typescript
 * import {
 *   createStrategyEngine,
 *   StrategyEngineConfig,
 * } from './strategy';
 *
 * const config: StrategyEngineConfig = {
 *   enabled: true,
 *   maxActiveStrategies: 10,
 *   enableSimulation: true,
 * };
 *
 * const engine = createStrategyEngine(config);
 *
 * // Create a strategy
 * const strategy = await engine.manager.createStrategy({
 *   name: 'DCA TON',
 *   description: 'Dollar-cost averaging into TON',
 *   type: 'rule_based',
 *   userId: 'user_123',
 *   agentId: 'agent_123',
 *   definition: {
 *     triggers: [{ id: 't1', type: 'schedule', name: 'Daily', enabled: true, config: { type: 'schedule', cron: '0 0 * * *' } }],
 *     conditions: [],
 *     actions: [{ id: 'a1', type: 'swap', name: 'Buy TON', priority: 1, config: { type: 'swap', fromToken: 'USDT', toToken: 'TON', amount: { type: 'fixed', value: 100 }, slippageTolerance: 0.5 } }],
 *     riskControls: [],
 *     parameters: [],
 *     capitalAllocation: { mode: 'fixed', allocatedAmount: 100, minCapital: 10, reservePercentage: 20 },
 *   },
 * });
 *
 * // Activate and run
 * await engine.manager.activateStrategy(strategy.id);
 * engine.scheduler.schedule(strategy);
 * ```
 */

// Export all types
export * from './types';

// Export Strategy Manager
export {
  StrategyManager,
  createStrategyManager,
  type CreateStrategyOptions,
  type UpdateStrategyOptions,
  type CloneStrategyOptions,
  type StrategyQuery,
  type StrategyQueryResult,
  type StrategyValidationResult as StrategyValidationDetails,
  type ValidationError,
  type ValidationWarning,
  type StrategyStatistics,
} from './strategy-manager';

// Export DSL
export {
  StrategyDSLParser,
  StrategyDSLValidator,
  DSLParseError,
  createDSLParser,
  createDSLValidator,
  type StrategyDSL,
  type DSLTrigger,
  type DSLCondition,
  type DSLAction,
  type DSLRiskControl,
  type DSLParameter,
  type DSLCapitalAllocation,
  type DSLValidationResult,
  type DSLValidationError,
  type DSLValidationWarning,
  type StrategyAnalysisResult,
  type AnalysisIssue,
  type AnalysisSuggestion,
} from './dsl';

// Export Execution Engine
export {
  StrategyScheduler,
  StrategyExecutor,
  ExecutionMonitor,
  DefaultActionExecutor,
  DefaultConditionEvaluator,
  DefaultRiskControlEvaluator,
  createExecutionEngine,
  type ExecutionEngineConfig,
  type ExecutionContext as StrategyExecutionContext,
  type ActionExecutor,
  type TriggerEvaluator,
  type ConditionEvaluator,
  type RiskControlEvaluator,
  type RiskControlResult,
  type MarketDataProvider,
  type PortfolioProvider,
  type ScheduledJob,
  type ExecutionMetrics as StrategyExecutionMetrics,
} from './execution';

// Export Backtesting
export {
  BacktestingEngine,
  createBacktestingEngine,
  type HistoricalDataProvider,
  type OHLCV,
  type VolumeData,
  type LiquidityData,
  type BacktestState,
  type Position,
} from './backtesting';

// Export Optimization
export {
  OptimizationEngine,
  createOptimizationEngine,
  type OptimizationEngineConfig,
  type ParameterSet,
  type EvaluationResult,
} from './optimization';

// Export AI Integration
export {
  AIStrategyGenerator,
  createAIStrategyGenerator,
  type AIIntegrationConfig,
  type StrategyGenerationRequest,
  type StrategyAnalysisRequest,
  type StrategyImprovementRequest,
} from './ai-integration';

// ============================================================================
// Strategy Engine - Unified Entry Point
// ============================================================================

import {
  StrategyEngineConfig,
  StrategyEngineHealth,
  StrategyEvent,
  StrategyEventCallback,
} from './types';

import { StrategyManager, createStrategyManager } from './strategy-manager';
import { StrategyDSLParser, StrategyDSLValidator, createDSLParser, createDSLValidator } from './dsl';
import { StrategyScheduler, StrategyExecutor, ExecutionMonitor, createExecutionEngine } from './execution';
import { BacktestingEngine, createBacktestingEngine } from './backtesting';
import { OptimizationEngine, createOptimizationEngine } from './optimization';
import { AIStrategyGenerator, createAIStrategyGenerator } from './ai-integration';

export interface StrategyEngine {
  readonly config: StrategyEngineConfig;
  readonly manager: StrategyManager;
  readonly dslParser: StrategyDSLParser;
  readonly dslValidator: StrategyDSLValidator;
  readonly scheduler: StrategyScheduler;
  readonly executor: StrategyExecutor;
  readonly monitor: ExecutionMonitor;
  readonly backtester: BacktestingEngine;
  readonly optimizer: OptimizationEngine;
  readonly aiGenerator: AIStrategyGenerator;

  // Health check
  getHealth(): Promise<StrategyEngineHealth>;

  // Events
  onEvent(callback: StrategyEventCallback): void;
}

export class DefaultStrategyEngine implements StrategyEngine {
  readonly config: StrategyEngineConfig;
  readonly manager: StrategyManager;
  readonly dslParser: StrategyDSLParser;
  readonly dslValidator: StrategyDSLValidator;
  readonly scheduler: StrategyScheduler;
  readonly executor: StrategyExecutor;
  readonly monitor: ExecutionMonitor;
  readonly backtester: BacktestingEngine;
  readonly optimizer: OptimizationEngine;
  readonly aiGenerator: AIStrategyGenerator;

  private readonly eventCallbacks: StrategyEventCallback[] = [];

  constructor(config: Partial<StrategyEngineConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxActiveStrategies: config.maxActiveStrategies ?? 20,
      maxExecutionsPerMinute: config.maxExecutionsPerMinute ?? 60,
      defaultSlippage: config.defaultSlippage ?? 0.5,
      defaultGasBuffer: config.defaultGasBuffer ?? 1.2,
      backtestingEnabled: config.backtestingEnabled ?? true,
      optimizationEnabled: config.optimizationEnabled ?? true,
      aiIntegrationEnabled: config.aiIntegrationEnabled ?? true,
      simulationMode: config.simulationMode ?? true,
      dataRetentionDays: config.dataRetentionDays ?? 90,
    };

    // Initialize components
    this.manager = createStrategyManager();
    this.dslParser = createDSLParser();
    this.dslValidator = createDSLValidator();

    // Initialize execution engine
    const execution = createExecutionEngine({
      maxConcurrentExecutions: 10,
      defaultTimeoutMs: 30000,
      maxRetries: 3,
      enableSimulation: this.config.simulationMode,
      eventCallback: (event) => this.handleEvent(event),
    });
    this.scheduler = execution.scheduler;
    this.executor = execution.executor;
    this.monitor = execution.monitor;

    // Initialize backtesting and optimization
    this.backtester = createBacktestingEngine();
    this.optimizer = createOptimizationEngine(this.backtester);

    // Initialize AI
    this.aiGenerator = createAIStrategyGenerator({
      enabled: this.config.aiIntegrationEnabled,
    });

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<StrategyEngineHealth> {
    const strategies = await this.manager.queryStrategies({ status: 'active' });
    const metrics = this.monitor.getAllMetrics();

    const pendingExecutions = metrics.reduce(
      (sum, m) => sum + (m.totalExecutions - m.successfulExecutions - m.failedExecutions),
      0
    );

    return {
      overall: this.config.enabled ? 'healthy' : 'unhealthy',
      components: {
        scheduler: true,
        executor: true,
        monitor: true,
        backtester: this.config.backtestingEnabled,
        optimizer: this.config.optimizationEnabled,
      },
      activeStrategies: strategies.total,
      pendingExecutions,
      lastCheck: new Date(),
    };
  }

  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private handleEvent(event: StrategyEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private setupEventForwarding(): void {
    // Forward events from manager
    this.manager.onEvent((event) => this.handleEvent(event));

    // Forward events from scheduler
    this.scheduler.onEvent((event) => this.handleEvent(event));

    // Forward events from executor
    this.executor.onEvent((event) => this.handleEvent(event));

    // Forward events from monitor
    this.monitor.onEvent((event) => this.handleEvent(event));

    // Forward events from backtester
    this.backtester.onEvent((event) => this.handleEvent(event));

    // Forward events from optimizer
    this.optimizer.onEvent((event) => this.handleEvent(event));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyEngine(
  config?: Partial<StrategyEngineConfig>
): DefaultStrategyEngine {
  return new DefaultStrategyEngine(config);
}

// Default export
export default DefaultStrategyEngine;
