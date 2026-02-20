/**
 * TONAIAgent - Strategy Execution Engine
 *
 * Real-time execution system for strategy triggers and actions.
 * Provides scheduling, orchestration, and transaction management.
 */

import {
  Strategy,
  StrategyTrigger,
  StrategyAction,
  StrategyCondition,
  RiskControl,
  StrategyExecution,
  TriggerContext,
  ConditionResult,
  ActionResult,
  StrategyEvent,
  StrategyEventCallback,
  TriggerType,
  RiskControlAction,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ExecutionEngineConfig {
  maxConcurrentExecutions: number;
  defaultTimeoutMs: number;
  maxRetries: number;
  enableSimulation: boolean;
  eventCallback?: StrategyEventCallback;
}

export interface ExecutionContext {
  strategyId: string;
  executionId: string;
  userId: string;
  agentId: string;
  simulationMode: boolean;
  startTime: Date;
  timeout: number;
  metadata: Record<string, unknown>;
}

export interface ActionExecutor {
  execute(
    action: StrategyAction,
    context: ExecutionContext,
    previousResults: ActionResult[]
  ): Promise<ActionResult>;
}

export interface TriggerEvaluator {
  evaluate(
    trigger: StrategyTrigger,
    context: TriggerContext
  ): Promise<boolean>;
}

export interface ConditionEvaluator {
  evaluate(
    condition: StrategyCondition,
    context: ExecutionContext
  ): Promise<ConditionResult>;
}

export interface RiskControlEvaluator {
  evaluate(
    control: RiskControl,
    context: ExecutionContext,
    pendingActions: StrategyAction[]
  ): Promise<RiskControlResult>;
}

export interface RiskControlResult {
  passed: boolean;
  controlId: string;
  triggered: boolean;
  action?: RiskControlAction;
  reason?: string;
}

export interface MarketDataProvider {
  getPrice(token: string, currency: 'USD' | 'TON'): Promise<number>;
  getVolume(token: string, timeframe: string): Promise<number>;
  getIndicator(indicator: string, token: string, timeframe: string): Promise<number>;
}

export interface PortfolioProvider {
  getBalance(token: string): Promise<number>;
  getTotalValue(): Promise<number>;
  getUnrealizedPnl(): Promise<number>;
  getPositions(): Promise<Map<string, number>>;
}

// ============================================================================
// Scheduler Implementation
// ============================================================================

export class StrategyScheduler {
  private readonly scheduledJobs: Map<string, ScheduledJob> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];
  private readonly timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly executor: StrategyExecutor
  ) {}

  /**
   * Schedule a strategy for execution
   */
  schedule(strategy: Strategy): void {
    // Cancel any existing schedule
    this.unschedule(strategy.id);

    for (const trigger of strategy.definition.triggers) {
      if (!trigger.enabled) continue;

      if (trigger.config.type === 'schedule') {
        this.scheduleChronJob(strategy, trigger);
      } else {
        // Event-based triggers are handled differently
        this.registerEventTrigger(strategy, trigger);
      }
    }

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_activated',
      strategyId: strategy.id,
      timestamp: new Date(),
      data: { triggersCount: strategy.definition.triggers.length },
      severity: 'info',
    });
  }

  /**
   * Unschedule a strategy
   */
  unschedule(strategyId: string): void {
    const jobs = Array.from(this.scheduledJobs.entries())
      .filter(([key]) => key.startsWith(`${strategyId}_`));

    for (const [key] of jobs) {
      const timer = this.timers.get(key);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(key);
      }
      this.scheduledJobs.delete(key);
    }
  }

  /**
   * Manually trigger a strategy
   */
  async triggerManually(strategy: Strategy, triggerId?: string): Promise<StrategyExecution> {
    const trigger = triggerId
      ? strategy.definition.triggers.find(t => t.id === triggerId)
      : strategy.definition.triggers[0];

    if (!trigger) {
      throw new Error('No trigger found');
    }

    const context: TriggerContext = {
      type: 'custom' as TriggerType,
      timestamp: new Date(),
      data: { manual: true, triggerId: trigger.id },
    };

    return this.executor.execute(strategy, trigger, context);
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.scheduledJobs.values());
  }

  /**
   * Subscribe to scheduler events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private scheduleChronJob(strategy: Strategy, trigger: StrategyTrigger): void {
    const config = trigger.config as { cron: string };
    const jobKey = `${strategy.id}_${trigger.id}`;

    // Parse cron and calculate next run
    const intervalMs = this.parseCronToInterval(config.cron);

    const timer = setInterval(async () => {
      try {
        const context: TriggerContext = {
          type: 'schedule',
          timestamp: new Date(),
          data: { cron: config.cron },
        };

        await this.executor.execute(strategy, trigger, context);
      } catch (error) {
        this.emitEvent({
          id: this.generateId(),
          type: 'execution_failed',
          strategyId: strategy.id,
          timestamp: new Date(),
          data: { error: String(error), triggerId: trigger.id },
          severity: 'error',
        });
      }
    }, intervalMs);

    this.timers.set(jobKey, timer);
    this.scheduledJobs.set(jobKey, {
      strategyId: strategy.id,
      triggerId: trigger.id,
      nextRun: new Date(Date.now() + intervalMs),
      intervalMs,
    });
  }

  private registerEventTrigger(strategy: Strategy, trigger: StrategyTrigger): void {
    // Store event trigger for evaluation when events occur
    const jobKey = `${strategy.id}_${trigger.id}`;
    this.scheduledJobs.set(jobKey, {
      strategyId: strategy.id,
      triggerId: trigger.id,
      eventBased: true,
      triggerType: trigger.config.type,
    });
  }

  /**
   * Evaluate event-based triggers
   */
  async evaluateEventTriggers(
    _eventType: string,
    _eventData: Record<string, unknown>
  ): Promise<StrategyExecution[]> {
    // This would be called by external event sources to find matching triggers
    // Filter for event-based jobs and match events to triggers
    // const eventJobs = Array.from(this.scheduledJobs.values()).filter(job => job.eventBased);
    // Implementation would iterate through eventJobs and match against eventType/eventData

    return [];
  }

  private parseCronToInterval(cron: string): number {
    // Simplified cron parsing - in production, use a proper cron library
    const parts = cron.split(' ');

    // "*/5 * * * *" = every 5 minutes
    if (parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].slice(2), 10);
      return minutes * 60 * 1000;
    }

    // "0 */6 * * *" = every 6 hours
    if (parts[1].startsWith('*/')) {
      const hours = parseInt(parts[1].slice(2), 10);
      return hours * 60 * 60 * 1000;
    }

    // Default to hourly
    return 60 * 60 * 1000;
  }

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private emitEvent(event: StrategyEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export interface ScheduledJob {
  strategyId: string;
  triggerId: string;
  nextRun?: Date;
  intervalMs?: number;
  eventBased?: boolean;
  triggerType?: string;
}

// ============================================================================
// Executor Implementation
// ============================================================================

export class StrategyExecutor {
  private readonly executions: Map<string, StrategyExecution> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];
  private readonly executionCooldowns: Map<string, number> = new Map();

  constructor(
    private readonly config: ExecutionEngineConfig,
    private readonly actionExecutor: ActionExecutor,
    private readonly conditionEvaluator: ConditionEvaluator,
    private readonly riskEvaluator: RiskControlEvaluator
  ) {}

  /**
   * Execute a strategy
   */
  async execute(
    strategy: Strategy,
    trigger: StrategyTrigger,
    triggerContext: TriggerContext
  ): Promise<StrategyExecution> {
    const executionId = this.generateId();
    const now = new Date();

    // Check cooldown
    const cooldownKey = `${strategy.id}_${trigger.id}`;
    const lastExecution = this.executionCooldowns.get(cooldownKey);
    if (lastExecution && trigger.cooldownSeconds) {
      const cooldownMs = trigger.cooldownSeconds * 1000;
      if (Date.now() - lastExecution < cooldownMs) {
        return this.createSkippedExecution(
          executionId,
          strategy.id,
          trigger.id,
          triggerContext,
          'Cooldown period not elapsed'
        );
      }
    }

    const execution: StrategyExecution = {
      id: executionId,
      strategyId: strategy.id,
      triggerId: trigger.id,
      status: 'executing',
      startedAt: now,
      triggerContext,
      conditionResults: [],
      actionResults: [],
      metadata: {},
    };

    this.executions.set(executionId, execution);

    this.emitEvent({
      id: this.generateId(),
      type: 'execution_started',
      strategyId: strategy.id,
      timestamp: now,
      data: { executionId, triggerId: trigger.id },
      severity: 'info',
    });

    try {
      const context: ExecutionContext = {
        strategyId: strategy.id,
        executionId,
        userId: strategy.userId,
        agentId: strategy.agentId,
        simulationMode: this.config.enableSimulation,
        startTime: now,
        timeout: this.config.defaultTimeoutMs,
        metadata: {},
      };

      // Evaluate conditions
      const conditionsPassed = await this.evaluateConditions(
        strategy.definition.conditions,
        context,
        execution
      );

      if (!conditionsPassed) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.metadata.skippedReason = 'Conditions not met';
        this.executions.set(executionId, execution);
        return execution;
      }

      // Evaluate risk controls before execution
      const riskPassed = await this.evaluateRiskControls(
        strategy.definition.riskControls,
        context,
        strategy.definition.actions
      );

      if (!riskPassed.passed) {
        execution.status = 'cancelled';
        execution.completedAt = new Date();
        execution.metadata.cancelledReason = riskPassed.reason;
        execution.metadata.triggeredControl = riskPassed.controlId;
        this.executions.set(executionId, execution);

        this.emitEvent({
          id: this.generateId(),
          type: 'risk_control_triggered',
          strategyId: strategy.id,
          timestamp: new Date(),
          data: { controlId: riskPassed.controlId, reason: riskPassed.reason },
          severity: 'warning',
        });

        return execution;
      }

      // Execute actions in order
      await this.executeActions(
        strategy.definition.actions,
        context,
        execution
      );

      // Determine final status
      const failedActions = execution.actionResults.filter(r => r.status === 'failed');
      const completedActions = execution.actionResults.filter(r => r.status === 'completed');

      if (failedActions.length === 0) {
        execution.status = 'completed';
      } else if (completedActions.length > 0) {
        execution.status = 'partially_completed';
      } else {
        execution.status = 'failed';
      }

      execution.completedAt = new Date();
      this.executions.set(executionId, execution);

      // Update cooldown
      this.executionCooldowns.set(cooldownKey, Date.now());

      this.emitEvent({
        id: this.generateId(),
        type: 'execution_completed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: {
          executionId,
          status: execution.status,
          actionsExecuted: execution.actionResults.length,
          actionsFailed: failedActions.length,
        },
        severity: execution.status === 'completed' ? 'info' : 'warning',
      });

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: String(error),
        retryable: false,
      };
      this.executions.set(executionId, execution);

      this.emitEvent({
        id: this.generateId(),
        type: 'execution_failed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: { executionId, error: String(error) },
        severity: 'error',
      });

      return execution;
    }
  }

  /**
   * Get execution by ID
   */
  getExecution(id: string): StrategyExecution | undefined {
    return this.executions.get(id);
  }

  /**
   * Get executions for a strategy
   */
  getExecutions(strategyId: string, limit: number = 100): StrategyExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.strategyId === strategyId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Subscribe to executor events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private async evaluateConditions(
    conditions: StrategyCondition[],
    context: ExecutionContext,
    execution: StrategyExecution
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = await this.conditionEvaluator.evaluate(condition, context);
      execution.conditionResults.push(result);

      this.emitEvent({
        id: this.generateId(),
        type: 'condition_evaluated',
        strategyId: context.strategyId,
        timestamp: new Date(),
        data: { conditionId: condition.id, passed: result.passed },
        severity: 'info',
      });

      if (condition.required && !result.passed) {
        return false;
      }
    }

    return true;
  }

  private async evaluateRiskControls(
    controls: RiskControl[],
    context: ExecutionContext,
    pendingActions: StrategyAction[]
  ): Promise<{ passed: boolean; controlId?: string; reason?: string }> {
    for (const control of controls) {
      if (!control.enabled) continue;

      const result = await this.riskEvaluator.evaluate(control, context, pendingActions);

      if (result.triggered) {
        return {
          passed: false,
          controlId: control.id,
          reason: result.reason ?? `Risk control ${control.type} triggered`,
        };
      }
    }

    return { passed: true };
  }

  private async executeActions(
    actions: StrategyAction[],
    context: ExecutionContext,
    execution: StrategyExecution
  ): Promise<void> {
    // Sort by priority
    const sortedActions = [...actions].sort((a, b) => a.priority - b.priority);

    for (const action of sortedActions) {
      const result = await this.executeActionWithRetry(action, context, execution.actionResults);
      execution.actionResults.push(result);

      this.emitEvent({
        id: this.generateId(),
        type: 'action_executed',
        strategyId: context.strategyId,
        timestamp: new Date(),
        data: {
          actionId: action.id,
          actionType: action.type,
          status: result.status,
          transactionIds: result.transactionIds,
        },
        severity: result.status === 'completed' ? 'info' : 'warning',
      });

      // If action failed and has a fallback, execute fallback
      if (result.status === 'failed' && action.fallbackActionId) {
        const fallbackAction = actions.find(a => a.id === action.fallbackActionId);
        if (fallbackAction) {
          const fallbackResult = await this.executeActionWithRetry(
            fallbackAction,
            context,
            execution.actionResults
          );
          execution.actionResults.push(fallbackResult);
        }
      }
    }
  }

  private async executeActionWithRetry(
    action: StrategyAction,
    context: ExecutionContext,
    previousResults: ActionResult[]
  ): Promise<ActionResult> {
    const maxAttempts = action.retryConfig?.maxAttempts ?? this.config.maxRetries;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.actionExecutor.execute(action, context, previousResults);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts && action.retryConfig) {
          const delay = action.retryConfig.delayMs *
            Math.pow(action.retryConfig.backoffMultiplier, attempt - 1);
          const cappedDelay = Math.min(delay, action.retryConfig.maxDelayMs);
          await this.sleep(cappedDelay);
        }
      }
    }

    return {
      actionId: action.id,
      status: 'failed',
      startedAt: new Date(),
      completedAt: new Date(),
      error: {
        code: 'ACTION_FAILED',
        message: lastError?.message ?? 'Unknown error',
        retryable: false,
      },
      retryCount: maxAttempts - 1,
    };
  }

  private createSkippedExecution(
    id: string,
    strategyId: string,
    triggerId: string,
    triggerContext: TriggerContext,
    reason: string
  ): StrategyExecution {
    return {
      id,
      strategyId,
      triggerId,
      status: 'cancelled',
      startedAt: new Date(),
      completedAt: new Date(),
      triggerContext,
      conditionResults: [],
      actionResults: [],
      metadata: { skippedReason: reason },
    };
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private emitEvent(event: StrategyEvent): void {
    if (this.config.eventCallback) {
      this.config.eventCallback(event);
    }
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Default Implementations
// ============================================================================

export class DefaultActionExecutor implements ActionExecutor {
  constructor(
    private readonly simulationMode: boolean = true
  ) {}

  async execute(
    action: StrategyAction,
    context: ExecutionContext,
    _previousResults: ActionResult[]
  ): Promise<ActionResult> {
    const startTime = new Date();

    // In simulation mode, just simulate the action
    if (context.simulationMode || this.simulationMode) {
      return this.simulateAction(action, startTime);
    }

    // Real execution would integrate with TON blockchain here
    // For now, return simulated result
    return this.simulateAction(action, startTime);
  }

  private simulateAction(action: StrategyAction, startTime: Date): ActionResult {
    // Simulate success with random transaction ID
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    return {
      actionId: action.id,
      status: 'completed',
      startedAt: startTime,
      completedAt: new Date(),
      transactionIds: [txId],
      result: {
        simulated: true,
        actionType: action.type,
        config: action.config,
      },
      retryCount: 0,
    };
  }
}

export class DefaultConditionEvaluator implements ConditionEvaluator {
  constructor(
    private readonly marketData?: MarketDataProvider,
    private readonly portfolio?: PortfolioProvider
  ) {}

  async evaluate(
    condition: StrategyCondition,
    context: ExecutionContext
  ): Promise<ConditionResult> {
    const ruleResults = await Promise.all(
      condition.rules.map(async rule => {
        const actualValue = await this.getFieldValue(rule.field, context);
        const passed = this.compareValues(actualValue, rule.operator, rule.value);

        return {
          ruleId: rule.id,
          passed,
          actualValue,
          expectedValue: rule.value,
        };
      })
    );

    // Combine results based on operator
    let passed: boolean;
    if (condition.operator === 'or') {
      passed = ruleResults.some(r => r.passed);
    } else {
      passed = ruleResults.every(r => r.passed);
    }

    return {
      conditionId: condition.id,
      passed,
      evaluatedRules: ruleResults,
      evaluatedAt: new Date(),
    };
  }

  private async getFieldValue(field: string, context: ExecutionContext): Promise<unknown> {
    // Parse field path like "portfolio.balance('TON')" or "market.price('TON')"
    const match = field.match(/^(\w+)\.(\w+)\('([^']+)'\)$/);
    if (!match) {
      // Simple field reference
      return context.metadata[field];
    }

    const [, namespace, method, arg] = match;

    switch (namespace) {
      case 'portfolio':
        if (this.portfolio) {
          switch (method) {
            case 'balance':
              return this.portfolio.getBalance(arg);
            case 'total_value':
              return this.portfolio.getTotalValue();
          }
        }
        break;

      case 'market':
        if (this.marketData) {
          switch (method) {
            case 'price':
              return this.marketData.getPrice(arg, 'USD');
          }
        }
        break;
    }

    return undefined;
  }

  private compareValues(actual: unknown, operator: string, expected: unknown): boolean {
    if (actual === undefined || actual === null) {
      // In simulation mode without real data providers, assume conditions pass
      return true;
    }

    const numActual = Number(actual);
    const numExpected = Number(expected);

    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'greater_than':
        return numActual > numExpected;
      case 'less_than':
        return numActual < numExpected;
      case 'greater_or_equal':
        return numActual >= numExpected;
      case 'less_or_equal':
        return numActual <= numExpected;
      default:
        return false;
    }
  }
}

export class DefaultRiskControlEvaluator implements RiskControlEvaluator {
  // In a real implementation, this would use a PortfolioProvider to check actual state
  // constructor(private readonly portfolio?: PortfolioProvider) {}

  async evaluate(
    control: RiskControl,
    _context: ExecutionContext,
    _pendingActions: StrategyAction[]
  ): Promise<RiskControlResult> {
    // In a real implementation, this would check against actual portfolio state
    // using this.portfolio. For now, return a passing result.

    return {
      passed: true,
      controlId: control.id,
      triggered: false,
    };
  }
}

// ============================================================================
// Execution Monitor
// ============================================================================

export class ExecutionMonitor {
  private readonly metrics: Map<string, ExecutionMetrics> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];

  /**
   * Record execution metrics
   */
  recordExecution(execution: StrategyExecution): void {
    const strategyId = execution.strategyId;
    let metrics = this.metrics.get(strategyId);

    if (!metrics) {
      metrics = this.createInitialMetrics(strategyId);
      this.metrics.set(strategyId, metrics);
    }

    // Update metrics
    metrics.totalExecutions++;

    switch (execution.status) {
      case 'completed':
        metrics.successfulExecutions++;
        break;
      case 'failed':
        metrics.failedExecutions++;
        break;
      case 'partially_completed':
        metrics.partialExecutions++;
        break;
    }

    if (execution.completedAt && execution.startedAt) {
      const durationMs = execution.completedAt.getTime() - execution.startedAt.getTime();
      metrics.totalDurationMs += durationMs;
      metrics.avgDurationMs = metrics.totalDurationMs / metrics.totalExecutions;
    }

    metrics.lastExecutionAt = execution.completedAt ?? new Date();
    metrics.updatedAt = new Date();
  }

  /**
   * Get metrics for a strategy
   */
  getMetrics(strategyId: string): ExecutionMetrics | undefined {
    return this.metrics.get(strategyId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): ExecutionMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(strategyId: string): number {
    const metrics = this.metrics.get(strategyId);
    if (!metrics || metrics.totalExecutions === 0) {
      return 0;
    }
    return metrics.successfulExecutions / metrics.totalExecutions;
  }

  /**
   * Subscribe to monitor events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private createInitialMetrics(strategyId: string): ExecutionMetrics {
    return {
      strategyId,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      partialExecutions: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export interface ExecutionMetrics {
  strategyId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  partialExecutions: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastExecutionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createExecutionEngine(
  config?: Partial<ExecutionEngineConfig>
): {
  scheduler: StrategyScheduler;
  executor: StrategyExecutor;
  monitor: ExecutionMonitor;
} {
  const fullConfig: ExecutionEngineConfig = {
    maxConcurrentExecutions: config?.maxConcurrentExecutions ?? 10,
    defaultTimeoutMs: config?.defaultTimeoutMs ?? 30000,
    maxRetries: config?.maxRetries ?? 3,
    enableSimulation: config?.enableSimulation ?? true,
    eventCallback: config?.eventCallback,
  };

  const actionExecutor = new DefaultActionExecutor(fullConfig.enableSimulation);
  const conditionEvaluator = new DefaultConditionEvaluator();
  const riskEvaluator = new DefaultRiskControlEvaluator();

  const executor = new StrategyExecutor(
    fullConfig,
    actionExecutor,
    conditionEvaluator,
    riskEvaluator
  );

  const scheduler = new StrategyScheduler(executor);
  const monitor = new ExecutionMonitor();

  // Wire up monitoring
  executor.onEvent(event => {
    if (event.type === 'execution_completed' || event.type === 'execution_failed') {
      const execution = executor.getExecution(event.data.executionId as string);
      if (execution) {
        monitor.recordExecution(execution);
      }
    }
  });

  return { scheduler, executor, monitor };
}
