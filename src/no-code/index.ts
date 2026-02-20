/**
 * TONAIAgent - No-Code Visual Strategy Builder
 *
 * A comprehensive no-code platform for creating, testing, and deploying
 * autonomous financial strategies on TON blockchain.
 *
 * Features:
 * - Visual drag-and-drop workflow builder
 * - Pre-built strategy templates
 * - AI-assisted strategy creation
 * - Real-time validation
 * - Historical backtesting and simulation
 * - Strategy lifecycle management
 * - Collaboration and sharing
 * - Version control
 * - Real-time observability
 *
 * @example
 * ```typescript
 * import {
 *   createNoCodeBuilder,
 *   NoCodeBuilderConfig,
 * } from '@tonaiagent/core/no-code';
 *
 * // Create the no-code builder
 * const builder = createNoCodeBuilder({
 *   enableAI: true,
 *   enableTemplates: true,
 *   enableBacktesting: true,
 * });
 *
 * // Get available templates
 * const templates = builder.templates.getAll();
 *
 * // Create strategy from template
 * const strategy = builder.templates.instantiate('dca_buy', {
 *   sourceToken: 'USDT',
 *   targetToken: 'TON',
 *   amountPerOrder: 100,
 * });
 *
 * // Or use AI to generate strategy
 * const aiStrategy = await builder.ai.generateStrategy({
 *   prompt: 'Create a low-risk stablecoin yield farming strategy',
 *   context: { riskTolerance: 'low' },
 * });
 *
 * // Validate strategy
 * const validation = builder.validator.validate(strategy);
 *
 * // Run backtest
 * const backtest = await builder.simulation.runBacktest(strategy, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-06-01'),
 *   initialCapital: 10000,
 * });
 *
 * // Deploy strategy
 * await builder.lifecycle.deploy(strategy.id);
 * ```
 */

// Export all types
export * from './types';

// Export DSL
export {
  BlockRegistry,
  DSLCompiler,
  createBlockRegistry,
  createDSLCompiler,
  type BlockDefinition,
  type ConfigSchema,
  type ConfigProperty,
  type CompiledStrategy,
  type CompiledTrigger,
  type CompiledNode,
  type CompiledEdge,
} from './dsl';

// Export templates
export {
  TemplateRegistry,
  createTemplateRegistry,
} from './templates';

// Export AI assistant
export {
  AIStrategyAssistant,
  createAIStrategyAssistant,
  type AIAssistantConfig,
} from './ai-assistant';

// Export validation
export {
  StrategyValidator,
  createStrategyValidator,
  validateStrategy,
  isDeployable,
  getValidationSummary,
  type ValidationConfig,
  type CustomValidationRule,
} from './validation';

// Export simulation
export {
  SimulationEngine,
  createSimulationEngine,
  type SimulationEngineConfig,
  type PriceDataProvider,
  type PricePoint,
  type MonteCarloResult,
  type SandboxResult,
  type PerformanceEstimate,
} from './simulation';

// Export lifecycle management
export {
  StrategyLifecycleManager,
  WorkspaceManager,
  ObservabilityManager,
  createLifecycleManager,
  createWorkspaceManager,
  createObservabilityManager,
  type LifecycleManagerConfig,
  type StrategyFilter,
  type TransitionResult,
  type DeploymentResult,
  type VersionComparison,
} from './lifecycle';

// ============================================================================
// Unified No-Code Builder
// ============================================================================

import { BlockRegistry, DSLCompiler } from './dsl';
import { TemplateRegistry } from './templates';
import { AIStrategyAssistant, AIAssistantConfig } from './ai-assistant';
import { StrategyValidator, ValidationConfig } from './validation';
import { SimulationEngine, SimulationEngineConfig } from './simulation';
import {
  StrategyLifecycleManager,
  WorkspaceManager,
  ObservabilityManager,
  LifecycleManagerConfig,
} from './lifecycle';
import {
  Strategy,
  Block,
  SimulationConfig,
  BacktestResult,
  ValidationResult,
  AIStrategyResponse,
} from './types';

/**
 * Configuration for the No-Code Builder
 */
export interface NoCodeBuilderConfig {
  /** Enable AI-assisted features */
  enableAI?: boolean;
  /** Enable template library */
  enableTemplates?: boolean;
  /** Enable backtesting */
  enableBacktesting?: boolean;
  /** Enable collaboration features */
  enableCollaboration?: boolean;
  /** AI configuration */
  ai?: Partial<AIAssistantConfig>;
  /** Validation configuration */
  validation?: Partial<ValidationConfig>;
  /** Simulation configuration */
  simulation?: Partial<SimulationEngineConfig>;
  /** Lifecycle configuration */
  lifecycle?: Partial<LifecycleManagerConfig>;
}

const DEFAULT_BUILDER_CONFIG: NoCodeBuilderConfig = {
  enableAI: true,
  enableTemplates: true,
  enableBacktesting: true,
  enableCollaboration: true,
};

/**
 * Unified No-Code Visual Strategy Builder
 */
export class NoCodeBuilder {
  /** Block registry for available block types */
  readonly blocks: BlockRegistry;
  /** DSL compiler for strategy serialization */
  readonly dsl: DSLCompiler;
  /** Template registry for pre-built strategies */
  readonly templates: TemplateRegistry;
  /** AI assistant for strategy generation */
  readonly ai: AIStrategyAssistant;
  /** Strategy validator */
  readonly validator: StrategyValidator;
  /** Simulation engine for backtesting */
  readonly simulation: SimulationEngine;
  /** Lifecycle manager for strategy management */
  readonly lifecycle: StrategyLifecycleManager;
  /** Workspace manager for collaboration */
  readonly workspaces: WorkspaceManager;
  /** Observability manager for monitoring */
  readonly observability: ObservabilityManager;

  private readonly config: NoCodeBuilderConfig;

  constructor(config: Partial<NoCodeBuilderConfig> = {}) {
    this.config = { ...DEFAULT_BUILDER_CONFIG, ...config };

    // Initialize core components
    this.blocks = new BlockRegistry();
    this.dsl = new DSLCompiler(this.blocks);
    this.templates = new TemplateRegistry();

    // Initialize AI assistant
    this.ai = new AIStrategyAssistant(
      this.config.ai,
      this.blocks,
      this.templates
    );

    // Initialize validator
    this.validator = new StrategyValidator(this.config.validation, this.blocks);

    // Initialize simulation
    this.simulation = new SimulationEngine(this.config.simulation);

    // Initialize lifecycle management
    this.lifecycle = new StrategyLifecycleManager(this.config.lifecycle);
    this.workspaces = new WorkspaceManager();
    this.observability = new ObservabilityManager();
  }

  // ============================================================================
  // Quick Actions
  // ============================================================================

  /**
   * Create a new strategy from scratch
   */
  createStrategy(
    name: string,
    category: Strategy['category'],
    author: { id: string; name?: string }
  ): Strategy {
    return this.lifecycle.create(name, category, author);
  }

  /**
   * Create a strategy from a template
   */
  createFromTemplate(
    templateId: string,
    author: { id: string; name?: string },
    inputs?: Record<string, unknown>
  ): Strategy | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    const strategy = this.lifecycle.create(template.name, template.category, author);

    // Apply template blocks and connections
    strategy.blocks = this.applyTemplateInputs(template.blocks, inputs);
    strategy.connections = JSON.parse(JSON.stringify(template.connections));
    strategy.tags = [...template.tags];
    strategy.description = template.description;

    if (template.config) {
      Object.assign(strategy.config, template.config);
    }
    if (template.riskParams) {
      Object.assign(strategy.riskParams, template.riskParams);
    }

    this.lifecycle.update(strategy.id, strategy);
    this.lifecycle.saveVersion(strategy.id, `Created from template: ${template.name}`);

    return strategy;
  }

  /**
   * Create a strategy using AI
   */
  async createWithAI(
    prompt: string,
    author: { id: string; name?: string },
    options?: { riskTolerance?: 'low' | 'medium' | 'high' }
  ): Promise<AIStrategyResponse> {
    const response = await this.ai.generateStrategy({
      prompt,
      context: options ? {
        riskTolerance: options.riskTolerance ?? 'medium',
        investmentHorizon: 'medium',
      } : undefined,
    });

    // Store the strategy
    response.strategy.author = author;
    this.lifecycle.update(response.strategy.id, response.strategy);

    return response;
  }

  /**
   * Validate and get deployment readiness
   */
  checkDeploymentReadiness(strategyId: string): DeploymentReadiness {
    const strategy = this.lifecycle.get(strategyId);
    if (!strategy) {
      return { ready: false, issues: ['Strategy not found'] };
    }

    const validation = this.validator.validate(strategy);
    // Detect risks (used internally for future risk-specific feedback)
    this.ai.detectRisks(strategy);

    const issues: string[] = [];

    if (!validation.valid) {
      issues.push(...validation.errors.map((e) => e.message));
    }

    if (validation.riskScore > 80) {
      issues.push('Risk score is very high');
    }

    if (strategy.status === 'draft' && !strategy.backtestResults?.length) {
      issues.push('Strategy has not been backtested');
    }

    return {
      ready: issues.length === 0,
      issues,
      validation,
      riskScore: validation.riskScore,
    };
  }

  /**
   * Quick backtest with default settings
   */
  async quickBacktest(
    strategyId: string,
    durationDays = 30
  ): Promise<BacktestResult | undefined> {
    const strategy = this.lifecycle.get(strategyId);
    if (!strategy) return undefined;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - durationDays * 24 * 60 * 60 * 1000);

    const config: SimulationConfig = {
      startDate,
      endDate,
      initialCapital: 10000,
      priceDataSource: 'historical',
      slippageModel: 'realistic',
      gasModel: 'historical',
    };

    const result = await this.simulation.runBacktest(strategy, config);

    // Store result
    if (!strategy.backtestResults) {
      strategy.backtestResults = [];
    }
    strategy.backtestResults.push(result);
    this.lifecycle.update(strategyId, strategy);

    return result;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(strategyId: string): string[] {
    const strategy = this.lifecycle.get(strategyId);
    if (!strategy) return [];

    const suggestions = this.ai.suggestOptimizations(strategy, strategy.backtestResults);
    const similarSuggestions = this.ai.getSimilarStrategySuggestions(strategy);

    return [
      ...suggestions.map((s) => s.reason),
      ...similarSuggestions,
    ];
  }

  /**
   * Export strategy to JSON
   */
  exportStrategy(strategyId: string): string | undefined {
    const strategy = this.lifecycle.get(strategyId);
    if (!strategy) return undefined;
    return this.dsl.toJSON(strategy);
  }

  /**
   * Import strategy from JSON
   */
  importStrategy(
    json: string,
    author: { id: string; name?: string }
  ): Strategy {
    const imported = this.dsl.fromJSON(json);
    imported.id = `strategy_${Date.now()}`;
    imported.author = author;
    imported.createdAt = new Date();
    imported.updatedAt = new Date();
    imported.status = 'draft';

    this.lifecycle.update(imported.id, imported);
    return imported;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private applyTemplateInputs(
    blocks: Block[],
    inputs?: Record<string, unknown>
  ): Block[] {
    if (!inputs) return JSON.parse(JSON.stringify(blocks));

    return blocks.map((block) => {
      const newBlock = JSON.parse(JSON.stringify(block));

      // Replace template variables in config
      const configStr = JSON.stringify(newBlock.config);
      let updatedConfigStr = configStr;

      Object.entries(inputs).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        updatedConfigStr = updatedConfigStr.replace(
          new RegExp(placeholder, 'g'),
          JSON.stringify(value).replace(/^"|"$/g, '')
        );
      });

      newBlock.config = JSON.parse(updatedConfigStr);
      return newBlock;
    });
  }
}

/**
 * Deployment readiness check result
 */
export interface DeploymentReadiness {
  ready: boolean;
  issues: string[];
  validation?: ValidationResult;
  riskScore?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new No-Code Visual Strategy Builder
 */
export function createNoCodeBuilder(
  config?: Partial<NoCodeBuilderConfig>
): NoCodeBuilder {
  return new NoCodeBuilder(config);
}

// Default export
export default NoCodeBuilder;
