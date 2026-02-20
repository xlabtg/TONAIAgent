/**
 * TONAIAgent - Cross-Chain Strategy Engine
 *
 * Enables autonomous agents to execute complex cross-chain strategies
 * including arbitrage, yield rotation, hedging, and portfolio rebalancing.
 *
 * Features:
 * - Strategy definition and management
 * - Trigger-based execution
 * - Cross-chain action orchestration
 * - Performance tracking
 * - Risk parameter enforcement
 */

import {
  CrossChainStrategy,
  CrossChainStrategyConfig,
  CrossChainStrategyStatus,
  CrossChainStrategyPerformance,
  CrossChainStrategyType,
  StrategyTrigger,
  StrategyAction,
  StrategyCapitalAllocation,
  StrategyRiskParameters,
  StrategyExecutionRules,
  StrategyConfig,
  ChainId,
  OmnichainEvent,
  OmnichainEventCallback,
  ActionResult,
  TriggerType,
  ActionType,
} from './types';

// ============================================================================
// Strategy Engine Interface
// ============================================================================

export interface CrossChainStrategyEngine {
  // Strategy CRUD
  createStrategy(input: CreateStrategyInput): Promise<ActionResult<CrossChainStrategy>>;
  getStrategy(strategyId: string): Promise<ActionResult<CrossChainStrategy | null>>;
  updateStrategy(
    strategyId: string,
    updates: Partial<UpdateStrategyInput>
  ): Promise<ActionResult<CrossChainStrategy>>;
  deleteStrategy(strategyId: string): Promise<ActionResult<void>>;

  // Strategy lifecycle
  activateStrategy(strategyId: string): Promise<ActionResult<void>>;
  pauseStrategy(strategyId: string, reason?: string): Promise<ActionResult<void>>;
  stopStrategy(strategyId: string): Promise<ActionResult<void>>;

  // Strategy listing
  listStrategies(userId: string, filter?: StrategyFilter): Promise<ActionResult<CrossChainStrategy[]>>;
  getActiveStrategies(userId: string): Promise<ActionResult<CrossChainStrategy[]>>;

  // Trigger management
  checkTriggers(strategyId: string): Promise<ActionResult<TriggeredActions>>;
  simulateTrigger(strategyId: string, triggerId: string): Promise<ActionResult<TriggerSimulation>>;

  // Performance
  getPerformance(
    strategyId: string,
    period?: 'day' | 'week' | 'month' | 'all_time'
  ): Promise<ActionResult<CrossChainStrategyPerformance>>;

  // Templates
  getTemplates(): StrategyTemplate[];
  createFromTemplate(templateId: string, userId: string, agentId: string): Promise<ActionResult<CrossChainStrategy>>;

  // Events
  onEvent(callback: OmnichainEventCallback): void;
}

export interface CreateStrategyInput {
  name: string;
  description: string;
  type: CrossChainStrategyType;
  userId: string;
  agentId: string;
  allowedChains: ChainId[];
  allowedAssets: string[];
  config: Partial<CrossChainStrategyConfig>;
  capitalAllocation: Partial<StrategyCapitalAllocation>;
  riskParameters: Partial<StrategyRiskParameters>;
  executionRules?: Partial<StrategyExecutionRules>;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  allowedChains?: ChainId[];
  allowedAssets?: string[];
  config?: Partial<CrossChainStrategyConfig>;
  capitalAllocation?: Partial<StrategyCapitalAllocation>;
  riskParameters?: Partial<StrategyRiskParameters>;
  executionRules?: Partial<StrategyExecutionRules>;
}

export interface StrategyFilter {
  type?: CrossChainStrategyType;
  status?: CrossChainStrategyStatus;
  chainId?: ChainId;
}

export interface TriggeredActions {
  strategyId: string;
  triggeredAt: Date;
  triggers: TriggeredTrigger[];
  actions: PendingAction[];
}

export interface TriggeredTrigger {
  triggerId: string;
  type: TriggerType;
  condition: string;
  currentValue: number;
  threshold: number;
}

export interface PendingAction {
  actionId: string;
  type: ActionType;
  parameters: Record<string, unknown>;
  priority: number;
  estimatedCost: number;
}

export interface TriggerSimulation {
  triggerId: string;
  wouldTrigger: boolean;
  currentConditions: Record<string, unknown>;
  actionsToExecute: StrategyAction[];
  estimatedOutcome: SimulatedOutcome;
}

export interface SimulatedOutcome {
  expectedPnl: number;
  expectedFees: number;
  riskAssessment: string;
  warnings: string[];
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  type: CrossChainStrategyType;
  config: CrossChainStrategyConfig;
  capitalAllocation: StrategyCapitalAllocation;
  riskParameters: StrategyRiskParameters;
  executionRules: StrategyExecutionRules;
  allowedChains: ChainId[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface StrategyEngineConfig extends Partial<StrategyConfig> {}

// ============================================================================
// Default Strategy Engine Implementation
// ============================================================================

export class DefaultCrossChainStrategyEngine implements CrossChainStrategyEngine {
  private readonly config: StrategyConfig;
  private readonly strategies: Map<string, CrossChainStrategy> = new Map();
  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private readonly templates: StrategyTemplate[];

  constructor(config: StrategyEngineConfig = {}) {
    this.config = {
      maxActiveStrategies: config.maxActiveStrategies ?? 10,
      defaultCheckIntervalMinutes: config.defaultCheckIntervalMinutes ?? 5,
      maxConcurrentExecutions: config.maxConcurrentExecutions ?? 3,
      emergencyPauseEnabled: config.emergencyPauseEnabled ?? true,
    };

    this.templates = this.initializeTemplates();
  }

  // ==========================================================================
  // Strategy CRUD
  // ==========================================================================

  async createStrategy(
    input: CreateStrategyInput
  ): Promise<ActionResult<CrossChainStrategy>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!input.name || input.name.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_CHAIN',
            message: 'Strategy name is required',
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      // Check active strategy limit
      const userStrategies = Array.from(this.strategies.values()).filter(
        s => s.userId === input.userId && s.status === 'active'
      );

      if (userStrategies.length >= this.config.maxActiveStrategies) {
        return {
          success: false,
          error: {
            code: 'POLICY_VIOLATION',
            message: `Maximum active strategies limit (${this.config.maxActiveStrategies}) reached`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const now = new Date();
      const strategy: CrossChainStrategy = {
        id: this.generateId(),
        name: input.name,
        description: input.description,
        type: input.type,
        userId: input.userId,
        agentId: input.agentId,
        status: 'draft',
        config: this.normalizeConfig(input.config),
        performance: this.createEmptyPerformance(),
        allowedChains: input.allowedChains,
        allowedAssets: input.allowedAssets,
        capitalAllocation: this.normalizeCapitalAllocation(input.capitalAllocation),
        riskParameters: this.normalizeRiskParameters(input.riskParameters),
        executionRules: this.normalizeExecutionRules(input.executionRules),
        createdAt: now,
        updatedAt: now,
      };

      this.strategies.set(strategy.id, strategy);

      this.emitEvent('info', 'strategy_triggered', {
        strategyId: strategy.id,
        name: strategy.name,
        type: strategy.type,
        userId: strategy.userId,
      });

      return {
        success: true,
        data: strategy,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getStrategy(
    strategyId: string
  ): Promise<ActionResult<CrossChainStrategy | null>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId) || null;

      return {
        success: true,
        data: strategy,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async updateStrategy(
    strategyId: string,
    updates: Partial<UpdateStrategyInput>
  ): Promise<ActionResult<CrossChainStrategy>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      // Cannot update active strategies (must pause first)
      if (strategy.status === 'active') {
        return {
          success: false,
          error: {
            code: 'POLICY_VIOLATION',
            message: 'Cannot update active strategy. Pause it first.',
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const updated: CrossChainStrategy = {
        ...strategy,
        name: updates.name ?? strategy.name,
        description: updates.description ?? strategy.description,
        allowedChains: updates.allowedChains ?? strategy.allowedChains,
        allowedAssets: updates.allowedAssets ?? strategy.allowedAssets,
        config: updates.config
          ? { ...strategy.config, ...updates.config }
          : strategy.config,
        capitalAllocation: updates.capitalAllocation
          ? { ...strategy.capitalAllocation, ...updates.capitalAllocation }
          : strategy.capitalAllocation,
        riskParameters: updates.riskParameters
          ? { ...strategy.riskParameters, ...updates.riskParameters }
          : strategy.riskParameters,
        executionRules: updates.executionRules
          ? { ...strategy.executionRules, ...updates.executionRules }
          : strategy.executionRules,
        updatedAt: new Date(),
      };

      this.strategies.set(strategyId, updated);

      this.emitEvent('info', 'strategy_executed', {
        strategyId,
        action: 'updated',
      });

      return {
        success: true,
        data: updated,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async deleteStrategy(strategyId: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      if (strategy.status === 'active') {
        return {
          success: false,
          error: {
            code: 'POLICY_VIOLATION',
            message: 'Cannot delete active strategy. Stop it first.',
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      this.strategies.delete(strategyId);

      this.emitEvent('info', 'strategy_executed', {
        strategyId,
        action: 'deleted',
      });

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Strategy Lifecycle
  // ==========================================================================

  async activateStrategy(strategyId: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      if (strategy.status === 'active') {
        return {
          success: true,
          warnings: ['Strategy is already active'],
          executionTime: Date.now() - startTime,
        };
      }

      strategy.status = 'active';
      strategy.updatedAt = new Date();
      this.strategies.set(strategyId, strategy);

      this.emitEvent('info', 'strategy_triggered', {
        strategyId,
        action: 'activated',
        status: 'active',
      });

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async pauseStrategy(strategyId: string, reason?: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      strategy.status = 'paused';
      strategy.updatedAt = new Date();
      this.strategies.set(strategyId, strategy);

      this.emitEvent('info', 'strategy_triggered', {
        strategyId,
        action: 'paused',
        reason,
      });

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async stopStrategy(strategyId: string): Promise<ActionResult<void>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      strategy.status = 'stopped';
      strategy.updatedAt = new Date();
      this.strategies.set(strategyId, strategy);

      this.emitEvent('info', 'strategy_triggered', {
        strategyId,
        action: 'stopped',
      });

      return {
        success: true,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Strategy Listing
  // ==========================================================================

  async listStrategies(
    userId: string,
    filter?: StrategyFilter
  ): Promise<ActionResult<CrossChainStrategy[]>> {
    const startTime = Date.now();

    try {
      let strategies = Array.from(this.strategies.values()).filter(
        s => s.userId === userId
      );

      if (filter?.type) {
        strategies = strategies.filter(s => s.type === filter.type);
      }

      if (filter?.status) {
        strategies = strategies.filter(s => s.status === filter.status);
      }

      if (filter?.chainId) {
        strategies = strategies.filter(s =>
          s.allowedChains.includes(filter.chainId!)
        );
      }

      return {
        success: true,
        data: strategies,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getActiveStrategies(
    userId: string
  ): Promise<ActionResult<CrossChainStrategy[]>> {
    return this.listStrategies(userId, { status: 'active' });
  }

  // ==========================================================================
  // Trigger Management
  // ==========================================================================

  async checkTriggers(strategyId: string): Promise<ActionResult<TriggeredActions>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const triggeredTriggers: TriggeredTrigger[] = [];
      const pendingActions: PendingAction[] = [];

      // Check each trigger condition
      for (const trigger of strategy.config.triggerConditions) {
        const result = this.evaluateTrigger(trigger);

        if (result.triggered) {
          triggeredTriggers.push({
            triggerId: trigger.id,
            type: trigger.type,
            condition: JSON.stringify(trigger.condition),
            currentValue: result.currentValue,
            threshold: result.threshold,
          });
        }
      }

      // If triggers fired, prepare actions
      if (triggeredTriggers.length > 0) {
        for (const action of strategy.config.actions) {
          pendingActions.push({
            actionId: action.id,
            type: action.type,
            parameters: action.parameters,
            priority: action.priority,
            estimatedCost: 0, // Would need actual cost estimation
          });
        }

        this.emitEvent('info', 'strategy_triggered', {
          strategyId,
          triggersCount: triggeredTriggers.length,
          actionsCount: pendingActions.length,
        });
      }

      return {
        success: true,
        data: {
          strategyId,
          triggeredAt: new Date(),
          triggers: triggeredTriggers,
          actions: pendingActions,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async simulateTrigger(
    strategyId: string,
    triggerId: string
  ): Promise<ActionResult<TriggerSimulation>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const trigger = strategy.config.triggerConditions.find(t => t.id === triggerId);

      if (!trigger) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Trigger ${triggerId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      const evaluation = this.evaluateTrigger(trigger);

      const simulation: TriggerSimulation = {
        triggerId,
        wouldTrigger: evaluation.triggered,
        currentConditions: {
          value: evaluation.currentValue,
          threshold: evaluation.threshold,
          operator: trigger.condition.operator,
        },
        actionsToExecute: evaluation.triggered ? strategy.config.actions : [],
        estimatedOutcome: {
          expectedPnl: 0, // Placeholder - would need market simulation
          expectedFees: 0,
          riskAssessment: 'low',
          warnings: [],
        },
      };

      return {
        success: true,
        data: simulation,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Performance
  // ==========================================================================

  async getPerformance(
    strategyId: string,
    period: 'day' | 'week' | 'month' | 'all_time' = 'all_time'
  ): Promise<ActionResult<CrossChainStrategyPerformance>> {
    const startTime = Date.now();

    try {
      const strategy = this.strategies.get(strategyId);

      if (!strategy) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN',
            message: `Strategy ${strategyId} not found`,
            retryable: false,
          },
          executionTime: Date.now() - startTime,
        };
      }

      // Return stored performance (would need actual tracking)
      const performance = {
        ...strategy.performance,
        period,
        lastUpdated: new Date(),
      };

      return {
        success: true,
        data: performance,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Templates
  // ==========================================================================

  getTemplates(): StrategyTemplate[] {
    return this.templates;
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    agentId: string
  ): Promise<ActionResult<CrossChainStrategy>> {
    const startTime = Date.now();

    const template = this.templates.find(t => t.id === templateId);

    if (!template) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: `Template ${templateId} not found`,
          retryable: false,
        },
        executionTime: Date.now() - startTime,
      };
    }

    return this.createStrategy({
      name: `${template.name} (Copy)`,
      description: template.description,
      type: template.type,
      userId,
      agentId,
      allowedChains: template.allowedChains,
      allowedAssets: [],
      config: template.config,
      capitalAllocation: template.capitalAllocation,
      riskParameters: template.riskParameters,
      executionRules: template.executionRules,
    });
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private evaluateTrigger(trigger: StrategyTrigger): {
    triggered: boolean;
    currentValue: number;
    threshold: number;
  } {
    // Placeholder evaluation - would need actual market data
    const currentValue = Math.random() * 100;
    const threshold =
      typeof trigger.condition.value === 'number'
        ? trigger.condition.value
        : (trigger.condition.value as number[])[0];

    let triggered = false;
    switch (trigger.condition.operator) {
      case 'gt':
        triggered = currentValue > threshold;
        break;
      case 'gte':
        triggered = currentValue >= threshold;
        break;
      case 'lt':
        triggered = currentValue < threshold;
        break;
      case 'lte':
        triggered = currentValue <= threshold;
        break;
      case 'eq':
        triggered = Math.abs(currentValue - threshold) < 0.001;
        break;
      case 'between':
        const [min, max] = trigger.condition.value as number[];
        triggered = currentValue >= min && currentValue <= max;
        break;
    }

    return { triggered, currentValue, threshold };
  }

  private normalizeConfig(
    config: Partial<CrossChainStrategyConfig>
  ): CrossChainStrategyConfig {
    return {
      triggerConditions: config.triggerConditions || [],
      actions: config.actions || [],
      fallbackActions: config.fallbackActions,
      checkIntervalMinutes:
        config.checkIntervalMinutes ?? this.config.defaultCheckIntervalMinutes,
      maxConcurrentExecutions:
        config.maxConcurrentExecutions ?? this.config.maxConcurrentExecutions,
      cooldownMinutes: config.cooldownMinutes ?? 5,
    };
  }

  private normalizeCapitalAllocation(
    allocation: Partial<StrategyCapitalAllocation>
  ): StrategyCapitalAllocation {
    return {
      maxTotalCapitalPercent: allocation.maxTotalCapitalPercent ?? 50,
      maxPerChainPercent: allocation.maxPerChainPercent ?? 30,
      maxPerAssetPercent: allocation.maxPerAssetPercent ?? 20,
      maxPerTransactionPercent: allocation.maxPerTransactionPercent ?? 10,
      reserveCapitalPercent: allocation.reserveCapitalPercent ?? 20,
    };
  }

  private normalizeRiskParameters(
    params: Partial<StrategyRiskParameters>
  ): StrategyRiskParameters {
    return {
      maxSlippagePercent: params.maxSlippagePercent ?? 1,
      maxGasCostPercent: params.maxGasCostPercent ?? 2,
      maxSingleLossPercent: params.maxSingleLossPercent ?? 5,
      maxDrawdownPercent: params.maxDrawdownPercent ?? 10,
      maxExposurePerChain: params.maxExposurePerChain ?? 50,
      stopLossPercent: params.stopLossPercent,
      takeProfitPercent: params.takeProfitPercent,
    };
  }

  private normalizeExecutionRules(
    rules?: Partial<StrategyExecutionRules>
  ): StrategyExecutionRules {
    return {
      executionWindow: rules?.executionWindow,
      minConfirmations: rules?.minConfirmations ?? 1,
      maxRetries: rules?.maxRetries ?? 3,
      retryDelayMinutes: rules?.retryDelayMinutes ?? 5,
      requireApprovalAbove: rules?.requireApprovalAbove,
    };
  }

  private createEmptyPerformance(): CrossChainStrategyPerformance {
    return {
      totalPnl: 0,
      totalPnlPercent: 0,
      winRate: 0,
      averageReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      transactionsCount: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalFeesUsd: 0,
      totalGasCostUsd: 0,
      period: 'all_time',
      lastUpdated: new Date(),
    };
  }

  private initializeTemplates(): StrategyTemplate[] {
    return [
      {
        id: 'arbitrage-basic',
        name: 'Cross-Chain Arbitrage',
        description:
          'Detect and execute arbitrage opportunities across chains using ChangeNOW',
        type: 'arbitrage',
        config: {
          triggerConditions: [
            {
              id: 'price-diff',
              type: 'price_threshold',
              condition: { operator: 'gt', value: 1 },
              parameters: { minProfitPercent: 1, chains: ['ton', 'eth'] },
              priority: 1,
            },
          ],
          actions: [
            {
              id: 'execute-arb',
              type: 'swap',
              parameters: { autoExecute: true },
              priority: 1,
            },
          ],
          checkIntervalMinutes: 1,
          maxConcurrentExecutions: 1,
          cooldownMinutes: 5,
        },
        capitalAllocation: {
          maxTotalCapitalPercent: 30,
          maxPerChainPercent: 20,
          maxPerAssetPercent: 15,
          maxPerTransactionPercent: 10,
          reserveCapitalPercent: 30,
        },
        riskParameters: {
          maxSlippagePercent: 0.5,
          maxGasCostPercent: 1,
          maxSingleLossPercent: 2,
          maxDrawdownPercent: 5,
          maxExposurePerChain: 30,
        },
        executionRules: {
          minConfirmations: 1,
          maxRetries: 2,
          retryDelayMinutes: 1,
        },
        allowedChains: ['ton', 'eth', 'bnb', 'polygon'],
        tags: ['arbitrage', 'defi', 'advanced'],
        difficulty: 'advanced',
      },
      {
        id: 'yield-rotation',
        name: 'Yield Rotation Strategy',
        description:
          'Automatically rotate capital to highest-yielding opportunities across chains',
        type: 'yield_rotation',
        config: {
          triggerConditions: [
            {
              id: 'yield-diff',
              type: 'yield_differential',
              condition: { operator: 'gt', value: 2 },
              parameters: { minYieldDifferential: 2 },
              priority: 1,
            },
          ],
          actions: [
            {
              id: 'rotate-yield',
              type: 'bridge',
              parameters: { targetYield: 'highest' },
              priority: 1,
            },
          ],
          checkIntervalMinutes: 60,
          maxConcurrentExecutions: 1,
          cooldownMinutes: 240,
        },
        capitalAllocation: {
          maxTotalCapitalPercent: 60,
          maxPerChainPercent: 40,
          maxPerAssetPercent: 30,
          maxPerTransactionPercent: 20,
          reserveCapitalPercent: 20,
        },
        riskParameters: {
          maxSlippagePercent: 1,
          maxGasCostPercent: 2,
          maxSingleLossPercent: 3,
          maxDrawdownPercent: 10,
          maxExposurePerChain: 50,
        },
        executionRules: {
          minConfirmations: 2,
          maxRetries: 3,
          retryDelayMinutes: 15,
        },
        allowedChains: ['ton', 'eth', 'bnb', 'arbitrum', 'optimism'],
        tags: ['yield', 'defi', 'intermediate'],
        difficulty: 'intermediate',
      },
      {
        id: 'stablecoin-diversification',
        name: 'Stablecoin Diversification',
        description:
          'Maintain a diversified stablecoin portfolio across multiple chains',
        type: 'stablecoin_diversification',
        config: {
          triggerConditions: [
            {
              id: 'allocation-drift',
              type: 'portfolio_drift',
              condition: { operator: 'gt', value: 5 },
              parameters: { maxDriftPercent: 5 },
              priority: 1,
            },
          ],
          actions: [
            {
              id: 'rebalance',
              type: 'rebalance',
              parameters: { targetAllocations: { usdt: 40, usdc: 40, dai: 20 } },
              priority: 1,
            },
          ],
          checkIntervalMinutes: 360,
          maxConcurrentExecutions: 2,
          cooldownMinutes: 720,
        },
        capitalAllocation: {
          maxTotalCapitalPercent: 80,
          maxPerChainPercent: 50,
          maxPerAssetPercent: 50,
          maxPerTransactionPercent: 25,
          reserveCapitalPercent: 10,
        },
        riskParameters: {
          maxSlippagePercent: 0.3,
          maxGasCostPercent: 1,
          maxSingleLossPercent: 1,
          maxDrawdownPercent: 3,
          maxExposurePerChain: 60,
        },
        executionRules: {
          minConfirmations: 2,
          maxRetries: 3,
          retryDelayMinutes: 30,
        },
        allowedChains: ['ton', 'eth', 'bnb', 'polygon', 'arbitrum'],
        tags: ['stablecoin', 'conservative', 'beginner'],
        difficulty: 'beginner',
      },
      {
        id: 'hedging-basic',
        name: 'Cross-Chain Hedging',
        description:
          'Hedge volatile asset exposure using stablecoins across chains',
        type: 'hedging',
        config: {
          triggerConditions: [
            {
              id: 'volatility-spike',
              type: 'price_threshold',
              condition: { operator: 'gt', value: 5 },
              parameters: { volatilityThreshold: 5 },
              priority: 1,
            },
          ],
          actions: [
            {
              id: 'hedge-position',
              type: 'swap',
              parameters: { targetAsset: 'stablecoin', hedgePercent: 50 },
              priority: 1,
            },
          ],
          checkIntervalMinutes: 15,
          maxConcurrentExecutions: 1,
          cooldownMinutes: 60,
        },
        capitalAllocation: {
          maxTotalCapitalPercent: 50,
          maxPerChainPercent: 30,
          maxPerAssetPercent: 25,
          maxPerTransactionPercent: 15,
          reserveCapitalPercent: 25,
        },
        riskParameters: {
          maxSlippagePercent: 1,
          maxGasCostPercent: 2,
          maxSingleLossPercent: 3,
          maxDrawdownPercent: 8,
          maxExposurePerChain: 40,
        },
        executionRules: {
          minConfirmations: 1,
          maxRetries: 2,
          retryDelayMinutes: 5,
        },
        allowedChains: ['ton', 'eth', 'bnb'],
        tags: ['hedging', 'risk-management', 'intermediate'],
        difficulty: 'intermediate',
      },
      {
        id: 'dca-multichain',
        name: 'Multi-Chain DCA',
        description:
          'Dollar cost average into multiple assets across different chains',
        type: 'dca',
        config: {
          triggerConditions: [
            {
              id: 'scheduled-buy',
              type: 'time_based',
              condition: { operator: 'eq', value: 0 },
              parameters: { intervalHours: 24 },
              priority: 1,
            },
          ],
          actions: [
            {
              id: 'dca-buy',
              type: 'swap',
              parameters: { fixedAmount: true, distributeAcrossChains: true },
              priority: 1,
            },
          ],
          checkIntervalMinutes: 60,
          maxConcurrentExecutions: 3,
          cooldownMinutes: 1440,
        },
        capitalAllocation: {
          maxTotalCapitalPercent: 100,
          maxPerChainPercent: 50,
          maxPerAssetPercent: 40,
          maxPerTransactionPercent: 20,
          reserveCapitalPercent: 5,
        },
        riskParameters: {
          maxSlippagePercent: 1,
          maxGasCostPercent: 3,
          maxSingleLossPercent: 10,
          maxDrawdownPercent: 30,
          maxExposurePerChain: 60,
        },
        executionRules: {
          minConfirmations: 2,
          maxRetries: 5,
          retryDelayMinutes: 60,
        },
        allowedChains: ['ton', 'eth', 'sol', 'bnb'],
        tags: ['dca', 'accumulation', 'beginner'],
        difficulty: 'beginner',
      },
    ];
  }

  private emitEvent(
    severity: OmnichainEvent['severity'],
    type: string,
    data: Record<string, unknown>
  ): void {
    const event: OmnichainEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: type as OmnichainEvent['type'],
      source: 'strategy_engine',
      severity,
      message: `Strategy: ${type}`,
      data,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private handleError(error: unknown, startTime: number): ActionResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message,
        retryable: false,
      },
      executionTime: Date.now() - startTime,
    };
  }

  private generateId(): string {
    return `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrossChainStrategyEngine(
  config?: StrategyEngineConfig
): DefaultCrossChainStrategyEngine {
  return new DefaultCrossChainStrategyEngine(config);
}

export default DefaultCrossChainStrategyEngine;
