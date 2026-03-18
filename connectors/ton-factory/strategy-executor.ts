/**
 * TONAIAgent - Strategy Execution Model
 *
 * Hybrid execution model: off-chain orchestration + on-chain logic.
 * Handles: strategy scheduling, lifecycle management, gas tracking,
 * auto-stop conditions, performance tracking, and emergency stop.
 */

import {
  Strategy,
  DeployStrategyInput,
  ExecutionContext,
  ExecutionResult,
  TransactionResult,
  StrategyPerformance,
  StrategySchedule,
  StrategyStatus,
  RiskLevel,
  AgentId,
  StrategyId,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
} from './types';

// ============================================================================
// Default Performance
// ============================================================================

function defaultPerformance(): StrategyPerformance {
  return {
    totalPnl: BigInt(0),
    successfulExecutions: 0,
    failedExecutions: 0,
    totalGasSpent: BigInt(0),
    winRate: 0,
    avgExecutionTimeMs: 0,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Strategy Registry
// ============================================================================

/**
 * Manages strategy lifecycle: creation, scheduling, execution, stopping.
 */
export class StrategyExecutor {
  private readonly strategies: Map<StrategyId, Strategy> = new Map();
  private readonly executions: Map<string, ExecutionResult> = new Map();
  private readonly strategyExecutions: Map<StrategyId, string[]> = new Map();
  private readonly scheduledTimers: Map<StrategyId, ReturnType<typeof setInterval>> = new Map();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private executionCounter = 0;
  private strategyCounter = 0;

  /**
   * Create and register a new strategy.
   */
  createStrategy(input: DeployStrategyInput): Strategy {
    this.strategyCounter++;
    const strategyId: StrategyId = `strat_${input.agentId}_${this.strategyCounter}`;

    const strategy: Strategy = {
      strategyId,
      agentId: input.agentId,
      type: input.strategyType,
      params: input.params,
      status: 'pending',
      version: input.version,
      riskLevel: input.riskLevel,
      contractAddress: input.contractAddress ?? undefined,
      maxGasBudget: input.maxGasBudget,
      gasUsed: BigInt(0),
      stopConditions: input.stopConditions,
      performance: defaultPerformance(),
      schedule: undefined,
      createdAt: new Date(),
      lastExecutedAt: undefined,
    };

    this.strategies.set(strategyId, strategy);
    this.strategyExecutions.set(strategyId, []);

    this.emitEvent({
      type: 'strategy.deployed',
      timestamp: new Date(),
      agentId: input.agentId,
      strategyId,
      data: {
        strategyType: input.strategyType,
        riskLevel: input.riskLevel,
        maxGasBudget: input.maxGasBudget.toString(),
      },
    });

    return strategy;
  }

  /**
   * Start a strategy (transition from pending to running).
   */
  async startStrategy(strategyId: StrategyId): Promise<void> {
    const strategy = this.requireStrategy(strategyId);

    if (strategy.status === 'running') {
      throw new Error(`Strategy ${strategyId} is already running`);
    }

    if (strategy.status === 'stopped' || strategy.status === 'completed') {
      throw new Error(`Strategy ${strategyId} is ${strategy.status} and cannot be restarted`);
    }

    strategy.status = 'running';
    this.strategies.set(strategyId, strategy);

    this.emitEvent({
      type: 'strategy.started',
      timestamp: new Date(),
      agentId: strategy.agentId,
      strategyId,
      data: { strategyType: strategy.type },
    });
  }

  /**
   * Execute a strategy once (one execution cycle).
   */
  async executeStrategy(
    strategyId: StrategyId,
    availableBalance: bigint,
    marketData?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const strategy = this.requireStrategy(strategyId);

    if (strategy.status !== 'running') {
      throw new Error(
        `Strategy ${strategyId} is not running (status: ${strategy.status})`
      );
    }

    // Check gas budget
    const remainingGas = strategy.maxGasBudget - strategy.gasUsed;
    if (remainingGas <= BigInt(0)) {
      if (strategy.stopConditions?.stopOnGasExhaustion) {
        await this.stopStrategy(strategyId, 'Gas budget exhausted');
        throw new Error(`Strategy ${strategyId} stopped: gas budget exhausted`);
      }
    }

    this.executionCounter++;
    const executionId = `exec_${strategyId}_${this.executionCounter}`;
    const gasBudget = remainingGas > BigInt(0) ? remainingGas : BigInt(1_000_000);

    const context: ExecutionContext = {
      executionId,
      strategyId,
      agentId: strategy.agentId,
      marketData,
      availableBalance,
      gasBudget,
      startedAt: new Date(),
    };

    const startMs = Date.now();
    let result: ExecutionResult;

    try {
      // Execute the strategy logic (off-chain orchestration)
      const transactions = this.runStrategyLogic(strategy, context);
      const gasUsed = BigInt(transactions.length) * BigInt(5_000_000);
      const pnl = this.calculatePnl(strategy, transactions);
      const durationMs = Date.now() - startMs;

      result = {
        executionId,
        strategyId,
        success: true,
        transactions,
        gasUsed,
        pnl,
        durationMs,
        completedAt: new Date(),
      };

      // Update strategy state
      strategy.gasUsed += gasUsed;
      strategy.lastExecutedAt = new Date();
      this.updatePerformance(strategy, result);

    } catch (error) {
      const durationMs = Date.now() - startMs;
      result = {
        executionId,
        strategyId,
        success: false,
        transactions: [],
        gasUsed: BigInt(0),
        pnl: BigInt(0),
        durationMs,
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      };

      strategy.lastExecutedAt = new Date();
      strategy.performance.failedExecutions++;
    }

    this.executions.set(executionId, result);
    const executionIds = this.strategyExecutions.get(strategyId) ?? [];
    executionIds.push(executionId);
    this.strategyExecutions.set(strategyId, executionIds);
    this.strategies.set(strategyId, strategy);

    // Emit appropriate event
    this.emitEvent({
      type: result.success ? 'strategy.completed' : 'strategy.failed',
      timestamp: new Date(),
      agentId: strategy.agentId,
      strategyId,
      data: {
        executionId,
        success: result.success,
        gasUsed: result.gasUsed.toString(),
        pnl: result.pnl.toString(),
        durationMs: result.durationMs,
        error: result.error,
      },
    });

    // Check auto-stop conditions
    await this.checkStopConditions(strategy, result);

    return result;
  }

  /**
   * Stop a running strategy.
   */
  async stopStrategy(strategyId: StrategyId, reason?: string): Promise<void> {
    const strategy = this.requireStrategy(strategyId);

    if (strategy.status === 'stopped' || strategy.status === 'completed') {
      return; // Already stopped
    }

    // Cancel any scheduled timer
    const timer = this.scheduledTimers.get(strategyId);
    if (timer) {
      clearInterval(timer);
      this.scheduledTimers.delete(strategyId);
    }

    strategy.status = 'stopped';
    this.strategies.set(strategyId, strategy);

    this.emitEvent({
      type: 'strategy.stopped',
      timestamp: new Date(),
      agentId: strategy.agentId,
      strategyId,
      data: { reason: reason ?? 'Manual stop' },
    });
  }

  /**
   * Schedule strategy for periodic execution.
   */
  scheduleStrategy(
    strategyId: StrategyId,
    schedule: StrategySchedule
  ): void {
    const strategy = this.requireStrategy(strategyId);
    strategy.schedule = schedule;
    this.strategies.set(strategyId, strategy);

    // In production: this would integrate with a proper scheduler (cron, etc.)
    // Here we just store the schedule metadata.
    if (schedule.nextRunAt) {
      strategy.schedule!.nextRunAt = schedule.nextRunAt;
    }
  }

  /**
   * Update a strategy's risk level.
   */
  updateRiskLevel(strategyId: StrategyId, newLevel: RiskLevel): void {
    const strategy = this.requireStrategy(strategyId);
    strategy.riskLevel = newLevel;
    this.strategies.set(strategyId, strategy);
  }

  /**
   * Get all strategies for an agent.
   */
  getAgentStrategies(agentId: AgentId): Strategy[] {
    return Array.from(this.strategies.values()).filter(
      (s) => s.agentId === agentId
    );
  }

  /**
   * Get strategies by status.
   */
  getStrategiesByStatus(status: StrategyStatus): Strategy[] {
    return Array.from(this.strategies.values()).filter((s) => s.status === status);
  }

  getStrategy(strategyId: StrategyId): Strategy | undefined {
    return this.strategies.get(strategyId);
  }

  getAllStrategies(): Strategy[] {
    return Array.from(this.strategies.values());
  }

  getExecution(executionId: string): ExecutionResult | undefined {
    return this.executions.get(executionId);
  }

  getStrategyExecutions(strategyId: StrategyId): ExecutionResult[] {
    const ids = this.strategyExecutions.get(strategyId) ?? [];
    return ids.map((id) => this.executions.get(id)).filter(Boolean) as ExecutionResult[];
  }

  getPerformanceSummary(agentId: AgentId): {
    totalStrategies: number;
    activeStrategies: number;
    totalPnl: bigint;
    totalGasSpent: bigint;
    overallWinRate: number;
  } {
    const agentStrategies = this.getAgentStrategies(agentId);

    let totalPnl = BigInt(0);
    let totalGasSpent = BigInt(0);
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const s of agentStrategies) {
      totalPnl += s.performance.totalPnl;
      totalGasSpent += s.performance.totalGasSpent;
      totalSuccess += s.performance.successfulExecutions;
      totalFailed += s.performance.failedExecutions;
    }

    const totalExecs = totalSuccess + totalFailed;
    const overallWinRate = totalExecs > 0 ? (totalSuccess / totalExecs) * 100 : 0;

    return {
      totalStrategies: agentStrategies.length,
      activeStrategies: agentStrategies.filter((s) => s.status === 'running').length,
      totalPnl,
      totalGasSpent,
      overallWinRate,
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private requireStrategy(strategyId: StrategyId): Strategy {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }
    return strategy;
  }

  /**
   * Run strategy logic (off-chain orchestration).
   * In production this dispatches to specific strategy type handlers.
   */
  private runStrategyLogic(
    strategy: Strategy,
    context: ExecutionContext
  ): TransactionResult[] {
    const txCount = this.getExpectedTxCount(strategy.type);

    return Array.from({ length: txCount }, (_, i) => ({
      txHash: `${context.executionId}_tx_${i}`,
      success: true,
      blockSeqno: 1000000 + this.executionCounter * 10 + i,
      gasUsed: BigInt(5_000_000),
      exitCode: 0,
      timestamp: new Date(),
    }));
  }

  private getExpectedTxCount(strategyType: string): number {
    switch (strategyType) {
      case 'simple_transfer': return 1;
      case 'dca': return 1; // Dollar Cost Averaging: 1 swap per run
      case 'arbitrage': return 2; // Buy + Sell
      case 'liquidity_provision': return 2; // Two token approvals + LP deposit
      case 'yield_farming': return 3; // Harvest + Reinvest + Stake
      case 'grid_trading': return 2; // Buy + Sell orders
      default: return 1;
    }
  }

  private calculatePnl(
    _strategy: Strategy,
    transactions: TransactionResult[]
  ): bigint {
    // Simplified PnL: in production this tracks actual token balances
    const successCount = transactions.filter((t) => t.success).length;

    // Simulate positive PnL for successful executions
    if (successCount > 0) {
      const baseReturn = BigInt(10_000_000); // 0.01 TON base return per tx
      return baseReturn * BigInt(successCount);
    }
    return BigInt(0);
  }

  private updatePerformance(strategy: Strategy, result: ExecutionResult): void {
    const perf = strategy.performance;

    if (result.success) {
      perf.successfulExecutions++;
      perf.totalPnl += result.pnl;
    } else {
      perf.failedExecutions++;
    }

    perf.totalGasSpent += result.gasUsed;

    const total = perf.successfulExecutions + perf.failedExecutions;
    perf.winRate = total > 0 ? (perf.successfulExecutions / total) * 100 : 0;

    // Rolling average execution time
    const prevAvg = perf.avgExecutionTimeMs;
    const count = perf.successfulExecutions + perf.failedExecutions;
    perf.avgExecutionTimeMs = count > 1
      ? (prevAvg * (count - 1) + result.durationMs) / count
      : result.durationMs;

    perf.updatedAt = new Date();
    strategy.performance = perf;
  }

  private async checkStopConditions(
    strategy: Strategy,
    _result: ExecutionResult
  ): Promise<void> {
    const conds = strategy.stopConditions;
    if (!conds) return;

    let shouldStop = false;
    let reason = '';

    // Check max loss
    if (conds.maxLoss !== undefined) {
      const totalLoss = strategy.performance.totalPnl < BigInt(0)
        ? -strategy.performance.totalPnl
        : BigInt(0);
      if (totalLoss >= conds.maxLoss) {
        shouldStop = true;
        reason = `Max loss ${conds.maxLoss} reached`;
      }
    }

    // Check max executions
    if (conds.maxExecutions !== undefined) {
      const total = strategy.performance.successfulExecutions + strategy.performance.failedExecutions;
      if (total >= conds.maxExecutions) {
        shouldStop = true;
        reason = `Max executions ${conds.maxExecutions} reached`;
      }
    }

    // Check expiry
    if (conds.expiresAt && new Date() >= conds.expiresAt) {
      shouldStop = true;
      reason = 'Strategy expired';
    }

    // Check gas exhaustion
    if (conds.stopOnGasExhaustion && strategy.gasUsed >= strategy.maxGasBudget) {
      shouldStop = true;
      reason = 'Gas budget exhausted';
    }

    if (shouldStop && strategy.status === 'running') {
      await this.stopStrategy(strategy.strategyId, reason);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyExecutor(): StrategyExecutor {
  return new StrategyExecutor();
}

export default StrategyExecutor;
