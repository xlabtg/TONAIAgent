/**
 * TONAIAgent - Agent Runtime Orchestrator
 *
 * Core runtime infrastructure that bridges AI decision-making with
 * on-chain execution on the TON blockchain. Implements:
 *
 * - Agent lifecycle management (Created -> Funded -> Active -> ... -> Terminated)
 * - 9-step execution pipeline (fetch_data -> ... -> update_analytics)
 * - Simulation mode with fake balances and mock execution
 * - Risk controls and emergency stop
 * - Structured observability (logs + metrics)
 * - Integration with OrchestrationEngine and TON Factory
 */

import {
  AgentLifecycleState,
  AgentRuntimeConfig,
  AgentRuntimeError,
  LifecycleTransition,
  LifecycleTransitionReason,
  ObservabilityConfig,
  OrchestratorHealth,
  OrchestratorMetrics,
  PipelineExecution,
  PipelineStep,
  PipelineStepResult,
  RuntimeAgentConfig,
  RuntimeAgentState,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeEventType,
  RuntimeUnsubscribe,
  SimulatedTransaction,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RUNTIME_CONFIG: AgentRuntimeConfig = {
  enabled: true,
  maxPipelineHistoryPerAgent: 100,
  maxConcurrentAgents: 50,
  defaultSimulation: {
    enabled: true,
    fakeBalance: BigInt(10_000_000_000), // 10 TON
    slippagePct: 0.5,
    networkLatencyMs: 200,
  },
  defaultRiskLimits: {
    maxLossPerExecutionNano: BigInt(1_000_000_000), // 1 TON
    maxDailyLossNano: BigInt(5_000_000_000), // 5 TON
    maxDailyGasBudgetNano: BigInt(500_000_000), // 0.5 TON
    maxTransactionSizeNano: BigInt(2_000_000_000), // 2 TON
    maxTransactionsPerDay: 100,
    maxConsecutiveFailures: 3,
  },
  observability: {
    enableLogging: true,
    enableMetrics: true,
    logLevel: 'info',
    metricsPrefix: 'tonai_runtime',
  },
};

// ============================================================================
// Agent Runtime Orchestrator
// ============================================================================

/**
 * AgentRuntimeOrchestrator is the top-level service that connects
 * AI decision-making with on-chain TON execution.
 *
 * @example
 * ```typescript
 * const runtime = createAgentRuntimeOrchestrator({ enabled: true });
 *
 * // Register an agent in simulation mode
 * runtime.registerAgent({
 *   agentId: 'agent-001',
 *   name: 'DCA Bot',
 *   ownerId: 'telegram_user_123',
 *   ownerAddress: 'EQD...',
 *   strategyIds: ['dca-strategy-1'],
 *   simulation: { enabled: true, fakeBalance: BigInt(10_000_000_000) },
 *   riskLimits: { ... },
 *   maxConcurrentExecutions: 2,
 *   enableObservability: true,
 * });
 *
 * // Start the agent
 * await runtime.startAgent('agent-001');
 *
 * // Run a pipeline execution
 * const result = await runtime.runPipeline('agent-001', 'dca-strategy-1');
 * ```
 */
export class AgentRuntimeOrchestrator {
  private readonly config: AgentRuntimeConfig;
  private readonly agents = new Map<string, RuntimeAgentConfig>();
  private readonly agentStates = new Map<string, RuntimeAgentState>();
  private readonly eventHandlers = new Set<RuntimeEventHandler>();
  private readonly metrics: OrchestratorMetrics;
  private readonly startTime: Date;
  private running = false;

  constructor(config: Partial<AgentRuntimeConfig> = {}) {
    this.config = {
      ...DEFAULT_RUNTIME_CONFIG,
      ...config,
      defaultSimulation: {
        ...DEFAULT_RUNTIME_CONFIG.defaultSimulation,
        ...config.defaultSimulation,
      },
      defaultRiskLimits: {
        ...DEFAULT_RUNTIME_CONFIG.defaultRiskLimits,
        ...config.defaultRiskLimits,
      },
      observability: {
        ...DEFAULT_RUNTIME_CONFIG.observability,
        ...config.observability,
      },
    };

    this.startTime = new Date();
    this.metrics = this.initMetrics();
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /** Start the runtime orchestrator */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.log('info', 'AgentRuntimeOrchestrator started');
    this.emitEvent('orchestrator.started', undefined, {});
  }

  /** Stop the runtime orchestrator (graceful shutdown) */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.log('info', 'AgentRuntimeOrchestrator stopped');
    this.emitEvent('orchestrator.stopped', undefined, {});
  }

  /** Whether the orchestrator is running */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Agent Registration & Lifecycle
  // ============================================================================

  /**
   * Register a new agent with the runtime.
   * Agent starts in 'created' state.
   */
  registerAgent(agentConfig: RuntimeAgentConfig): void {
    if (this.agents.size >= this.config.maxConcurrentAgents) {
      throw new AgentRuntimeError(
        `Maximum concurrent agents (${this.config.maxConcurrentAgents}) reached`,
        'AGENT_LIMIT_REACHED'
      );
    }

    if (this.agents.has(agentConfig.agentId)) {
      throw new AgentRuntimeError(
        `Agent ${agentConfig.agentId} is already registered`,
        'AGENT_ALREADY_EXISTS'
      );
    }

    // Merge with defaults
    const config: RuntimeAgentConfig = {
      ...agentConfig,
      simulation: { ...this.config.defaultSimulation, ...agentConfig.simulation },
      riskLimits: { ...this.config.defaultRiskLimits, ...agentConfig.riskLimits },
    };

    this.agents.set(config.agentId, config);

    const initialState: RuntimeAgentState = {
      agentId: config.agentId,
      lifecycleState: 'created',
      transitionHistory: [],
      balance: config.simulation.enabled ? config.simulation.fakeBalance : BigInt(0),
      dailyGasUsed: BigInt(0),
      dailyLoss: BigInt(0),
      dailyTransactionCount: 0,
      consecutiveFailures: 0,
      activePipelineIds: [],
      pipelineHistory: [],
    };

    this.agentStates.set(config.agentId, initialState);

    this.metrics.totalAgents++;
    this.log('info', `Agent registered: ${config.agentId} (${config.name})`);
    this.emitEvent('agent.registered', config.agentId, { agentId: config.agentId, name: config.name });
  }

  /**
   * Fund an agent — transitions it from 'created' to 'funded'.
   * In simulation mode, sets the simulated balance.
   */
  fundAgent(agentId: string, amountNano: bigint): void {
    const state = this.requireAgentState(agentId);
    this.requireLifecycleState(agentId, state, ['created']);

    state.balance += amountNano;
    this.transitionLifecycle(agentId, state, 'funded', 'funding_received', 'system', {
      amountNano: amountNano.toString(),
    });

    this.log('info', `Agent ${agentId} funded with ${amountNano} nanoTON`);
  }

  /**
   * Start an agent — transitions it from 'funded' or 'paused' to 'active'.
   */
  async startAgent(agentId: string, actor = 'system'): Promise<void> {
    const state = this.requireAgentState(agentId);
    this.requireLifecycleState(agentId, state, ['funded', 'paused']);

    this.transitionLifecycle(agentId, state, 'active', 'started_by_user', actor);
    this.metrics.activeAgents++;

    this.log('info', `Agent ${agentId} started by ${actor}`);
    this.emitEvent('agent.started', agentId, { agentId, actor });
  }

  /**
   * Pause an agent — transitions it from 'active' to 'paused'.
   */
  pauseAgent(agentId: string, actor = 'system'): void {
    const state = this.requireAgentState(agentId);
    this.requireLifecycleState(agentId, state, ['active']);

    this.transitionLifecycle(agentId, state, 'paused', 'paused_by_user', actor);
    this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
    this.metrics.pausedAgents++;

    this.log('info', `Agent ${agentId} paused by ${actor}`);
    this.emitEvent('agent.paused', agentId, { agentId, actor });
  }

  /**
   * Resume a paused agent — transitions it from 'paused' to 'active'.
   */
  resumeAgent(agentId: string, actor = 'system'): void {
    const state = this.requireAgentState(agentId);
    this.requireLifecycleState(agentId, state, ['paused']);

    this.transitionLifecycle(agentId, state, 'active', 'resumed_by_user', actor);
    this.metrics.activeAgents++;
    this.metrics.pausedAgents = Math.max(0, this.metrics.pausedAgents - 1);

    this.log('info', `Agent ${agentId} resumed by ${actor}`);
    this.emitEvent('agent.resumed', agentId, { agentId, actor });
  }

  /**
   * Terminate an agent permanently.
   */
  terminateAgent(agentId: string, actor = 'system', reason: LifecycleTransitionReason = 'terminated_by_user'): void {
    const state = this.requireAgentState(agentId);

    const wasActive = state.lifecycleState === 'active';
    const wasPaused = state.lifecycleState === 'paused';

    this.transitionLifecycle(agentId, state, 'terminated', reason, actor);

    if (wasActive) this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
    if (wasPaused) this.metrics.pausedAgents = Math.max(0, this.metrics.pausedAgents - 1);

    this.log('info', `Agent ${agentId} terminated by ${actor}, reason: ${reason}`);
    this.emitEvent('agent.terminated', agentId, { agentId, actor, reason });
  }

  // ============================================================================
  // Execution Pipeline
  // ============================================================================

  /**
   * Run the full 9-step execution pipeline for an agent strategy.
   *
   * Steps:
   * 1. fetch_data       - Fetch market and on-chain data
   * 2. load_memory      - Load agent memory and context
   * 3. call_ai          - Call AI model for decision
   * 4. validate_risk    - Validate risk controls
   * 5. generate_plan    - Generate execution plan
   * 6. simulate_tx      - Simulate the transaction
   * 7. execute_onchain  - Execute on TON (or simulate)
   * 8. record_outcome   - Record result to registry
   * 9. update_analytics - Update performance analytics
   */
  async runPipeline(agentId: string, strategyId?: string): Promise<PipelineExecution> {
    const state = this.requireAgentState(agentId);
    const config = this.requireAgentConfig(agentId);

    if (state.lifecycleState !== 'active') {
      throw new AgentRuntimeError(
        `Agent ${agentId} is not active (state: ${state.lifecycleState})`,
        'AGENT_NOT_ACTIVE'
      );
    }

    const executionId = this.generateId('exec');
    const isSimulation = config.simulation.enabled;
    const startedAt = new Date();

    this.log('info', `Pipeline started: ${executionId} for agent ${agentId}${strategyId ? ` strategy ${strategyId}` : ''} (simulation=${isSimulation})`);

    state.activePipelineIds.push(executionId);
    this.metrics.totalPipelineExecutions++;
    this.emitEvent('pipeline.started', agentId, { executionId, agentId, strategyId, isSimulation });

    const steps: PipelineStepResult[] = [];
    let pipelineError: string | undefined;
    let pipelineSuccess = true;

    const pipelineSteps: PipelineStep[] = [
      'fetch_data',
      'load_memory',
      'call_ai',
      'validate_risk',
      'generate_plan',
      'simulate_tx',
      'execute_onchain',
      'record_outcome',
      'update_analytics',
    ];

    for (const step of pipelineSteps) {
      const stepResult = await this.runPipelineStep(step, executionId, agentId, strategyId, config, state, steps);
      steps.push(stepResult);

      this.emitEvent('pipeline.step_completed', agentId, {
        executionId,
        step,
        status: stepResult.status,
        durationMs: stepResult.durationMs,
      });

      // Stop pipeline on critical step failure
      if (stepResult.status === 'failed') {
        pipelineSuccess = false;
        pipelineError = stepResult.error;
        this.log('warn', `Pipeline ${executionId} failed at step ${step}: ${stepResult.error}`);
        break;
      }
    }

    const completedAt = new Date();
    const totalDurationMs = completedAt.getTime() - startedAt.getTime();

    const execution: PipelineExecution = {
      executionId,
      agentId,
      strategyId,
      isSimulation,
      steps,
      success: pipelineSuccess,
      totalDurationMs,
      startedAt,
      completedAt,
      error: pipelineError,
    };

    // Update agent state
    state.activePipelineIds = state.activePipelineIds.filter((id) => id !== executionId);
    state.lastExecutedAt = completedAt;

    // Keep bounded pipeline history
    state.pipelineHistory.unshift(execution);
    if (state.pipelineHistory.length > this.config.maxPipelineHistoryPerAgent) {
      state.pipelineHistory = state.pipelineHistory.slice(0, this.config.maxPipelineHistoryPerAgent);
    }

    // Update metrics
    if (pipelineSuccess) {
      this.metrics.successfulPipelineExecutions++;
      state.consecutiveFailures = 0;
    } else {
      this.metrics.failedPipelineExecutions++;
      state.consecutiveFailures++;
      this.checkConsecutiveFailures(agentId, config, state);
    }

    if (pipelineSuccess) {
      this.log('info', `Pipeline completed: ${executionId} in ${totalDurationMs}ms`);
      this.emitEvent('pipeline.completed', agentId, { executionId, totalDurationMs, isSimulation });
    } else {
      this.emitEvent('pipeline.failed', agentId, { executionId, totalDurationMs, error: pipelineError });
    }

    return execution;
  }

  // ============================================================================
  // Pipeline Step Implementations
  // ============================================================================

  private async runPipelineStep(
    step: PipelineStep,
    executionId: string,
    agentId: string,
    strategyId: string | undefined,
    config: RuntimeAgentConfig,
    state: RuntimeAgentState,
    previousSteps: PipelineStepResult[]
  ): Promise<PipelineStepResult> {
    const stepStart = new Date();
    const startedAt = stepStart;

    try {
      let output: Record<string, unknown>;

      switch (step) {
        case 'fetch_data':
          output = await this.stepFetchData(agentId, config);
          break;
        case 'load_memory':
          output = await this.stepLoadMemory(agentId, executionId);
          break;
        case 'call_ai':
          output = await this.stepCallAI(agentId, strategyId, previousSteps);
          break;
        case 'validate_risk':
          output = await this.stepValidateRisk(agentId, config, state, previousSteps);
          break;
        case 'generate_plan':
          output = await this.stepGeneratePlan(agentId, previousSteps);
          break;
        case 'simulate_tx':
          output = await this.stepSimulateTransaction(agentId, config, state, previousSteps);
          break;
        case 'execute_onchain':
          output = await this.stepExecuteOnchain(agentId, config, state, previousSteps);
          break;
        case 'record_outcome':
          output = await this.stepRecordOutcome(agentId, executionId, previousSteps);
          break;
        case 'update_analytics':
          output = await this.stepUpdateAnalytics(agentId, state, previousSteps);
          break;
      }

      const completedAt = new Date();
      return {
        step,
        status: 'completed',
        output,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        completedAt,
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        step,
        status: 'failed',
        error: errorMessage,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        startedAt,
        completedAt,
      };
    }
  }

  /** Step 1: Fetch market data and on-chain state */
  private async stepFetchData(agentId: string, config: RuntimeAgentConfig): Promise<Record<string, unknown>> {
    const isSimulation = config.simulation.enabled;
    this.log('debug', `[${agentId}] fetch_data: isSimulation=${isSimulation}`);

    if (isSimulation && config.simulation.useHistoricalData) {
      // Return synthetic historical data for replay
      return {
        source: 'historical',
        marketData: {
          TON: { price: 2.5 + Math.random() * 0.5, volume24h: 1_000_000 },
          USDT: { price: 1.0, volume24h: 5_000_000 },
        },
        onChainData: {
          balance: config.simulation.fakeBalance.toString(),
          blockHeight: 40_000_000,
        },
        timestamp: new Date().toISOString(),
      };
    }

    // Real or live-sim data fetch (placeholder for real integration)
    return {
      source: isSimulation ? 'simulated' : 'live',
      marketData: {
        TON: { price: 2.5 + Math.random() * 0.5, volume24h: 1_000_000 },
        USDT: { price: 1.0, volume24h: 5_000_000 },
      },
      onChainData: {
        balance: config.simulation.fakeBalance.toString(),
        blockHeight: 40_000_000 + Math.floor(Math.random() * 100),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /** Step 2: Load agent memory and execution context */
  private async stepLoadMemory(agentId: string, executionId: string): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] load_memory: executionId=${executionId}`);

    const state = this.agentStates.get(agentId);
    const recentExecutions = state?.pipelineHistory.slice(0, 5).map((e) => ({
      executionId: e.executionId,
      success: e.success,
      durationMs: e.totalDurationMs,
      completedAt: e.completedAt?.toISOString(),
    })) ?? [];

    return {
      agentId,
      executionId,
      recentExecutions,
      consecutiveFailures: state?.consecutiveFailures ?? 0,
      lastExecutedAt: state?.lastExecutedAt?.toISOString(),
    };
  }

  /** Step 3: Call AI model to produce a decision */
  private async stepCallAI(
    agentId: string,
    strategyId: string | undefined,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] call_ai`);

    const dataStep = previousSteps.find((s) => s.step === 'fetch_data');
    const memoryStep = previousSteps.find((s) => s.step === 'load_memory');

    // In a full implementation, this calls OrchestrationEngine.execute()
    // with the market data and memory context as tool results / messages.
    // For now, we produce a structured decision stub.
    const marketData = dataStep?.output?.['marketData'] as Record<string, unknown> | undefined;
    const tonPrice = (marketData?.['TON'] as Record<string, unknown> | undefined)?.['price'] as number ?? 2.5;

    const decision = {
      action: tonPrice > 2.7 ? 'sell' : tonPrice < 2.3 ? 'buy' : 'hold',
      confidence: 0.75,
      reasoning: `TON price is ${tonPrice.toFixed(2)} — ${tonPrice > 2.7 ? 'above target, sell signal' : tonPrice < 2.3 ? 'below target, buy signal' : 'within range, hold'}`,
      suggestedAmount: BigInt(100_000_000).toString(), // 0.1 TON
      strategyId,
      provider: 'groq',
      model: 'llama3-70b-8192',
      generatedAt: new Date().toISOString(),
      memoryContext: memoryStep?.output,
    };

    return { decision };
  }

  /** Step 4: Validate against risk controls */
  private async stepValidateRisk(
    agentId: string,
    config: RuntimeAgentConfig,
    state: RuntimeAgentState,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] validate_risk`);

    const checks: Array<{ rule: string; passed: boolean; reason?: string }> = [];
    const aiStep = previousSteps.find((s) => s.step === 'call_ai');
    const decision = aiStep?.output?.['decision'] as Record<string, unknown> | undefined;
    const suggestedAmountStr = decision?.['suggestedAmount'] as string | undefined;
    const suggestedAmount = suggestedAmountStr ? BigInt(suggestedAmountStr) : BigInt(0);

    // Daily loss limit
    const dailyLossOk = state.dailyLoss < config.riskLimits.maxDailyLossNano;
    checks.push({ rule: 'daily_loss_limit', passed: dailyLossOk, reason: dailyLossOk ? undefined : 'Daily loss limit reached' });

    // Daily gas budget
    const gasOk = state.dailyGasUsed < config.riskLimits.maxDailyGasBudgetNano;
    checks.push({ rule: 'daily_gas_budget', passed: gasOk, reason: gasOk ? undefined : 'Daily gas budget exhausted' });

    // Transaction size
    const txSizeOk = suggestedAmount <= config.riskLimits.maxTransactionSizeNano;
    checks.push({ rule: 'transaction_size', passed: txSizeOk, reason: txSizeOk ? undefined : 'Transaction exceeds max size' });

    // Daily transaction count
    const txCountOk = state.dailyTransactionCount < config.riskLimits.maxTransactionsPerDay;
    checks.push({ rule: 'daily_tx_count', passed: txCountOk, reason: txCountOk ? undefined : 'Daily transaction limit reached' });

    // Balance check
    const balanceOk = state.balance >= suggestedAmount;
    checks.push({ rule: 'sufficient_balance', passed: balanceOk, reason: balanceOk ? undefined : 'Insufficient balance' });

    const allPassed = checks.every((c) => c.passed);
    const failedChecks = checks.filter((c) => !c.passed);

    if (!allPassed) {
      this.emitEvent('risk.limit_reached', agentId, { agentId, failedChecks });
      throw new AgentRuntimeError(
        `Risk validation failed: ${failedChecks.map((c) => c.reason).join('; ')}`,
        'RISK_VALIDATION_FAILED'
      );
    }

    return { allPassed, checks };
  }

  /** Step 5: Generate execution plan from AI decision */
  private async stepGeneratePlan(
    agentId: string,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] generate_plan`);

    const aiStep = previousSteps.find((s) => s.step === 'call_ai');
    const decision = aiStep?.output?.['decision'] as Record<string, unknown> | undefined;
    const action = decision?.['action'] as string ?? 'hold';

    const plan = {
      action,
      transactions:
        action === 'hold'
          ? []
          : [
              {
                type: action === 'buy' ? 'swap' : 'swap',
                from: action === 'buy' ? 'USDT' : 'TON',
                to: action === 'buy' ? 'TON' : 'USDT',
                amount: decision?.['suggestedAmount'] ?? '0',
                slippagePct: 0.5,
              },
            ],
      estimatedGas: BigInt(50_000_000).toString(), // 0.05 TON
      generatedAt: new Date().toISOString(),
    };

    return { plan };
  }

  /** Step 6: Simulate the planned transactions */
  private async stepSimulateTransaction(
    agentId: string,
    config: RuntimeAgentConfig,
    state: RuntimeAgentState,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] simulate_tx`);

    const planStep = previousSteps.find((s) => s.step === 'generate_plan');
    const plan = planStep?.output?.['plan'] as Record<string, unknown> | undefined;
    const transactions = plan?.['transactions'] as Array<Record<string, unknown>> | undefined ?? [];

    const simulatedTxs: SimulatedTransaction[] = transactions.map((tx) => ({
      txId: this.generateId('sim-tx'),
      type: tx['type'] as string ?? 'swap',
      agentId,
      to: 'EQD_simulated_address',
      amount: BigInt(tx['amount'] as string ?? '0'),
      success: true,
      gasUsed: BigInt(plan?.['estimatedGas'] as string ?? '50000000'),
      pnl: BigInt(0),
      timestamp: new Date(),
    }));

    this.metrics.totalSimulatedTransactions += simulatedTxs.length;

    return {
      simulatedTransactions: simulatedTxs.map((tx) => ({
        ...tx,
        amount: tx.amount.toString(),
        gasUsed: tx.gasUsed.toString(),
        pnl: tx.pnl.toString(),
        timestamp: tx.timestamp.toISOString(),
      })),
      simulationPassed: true,
      totalSimulatedGas: simulatedTxs.reduce((acc, tx) => acc + tx.gasUsed, BigInt(0)).toString(),
    };
  }

  /** Step 7: Execute on TON blockchain (or mock in simulation mode) */
  private async stepExecuteOnchain(
    agentId: string,
    config: RuntimeAgentConfig,
    state: RuntimeAgentState,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] execute_onchain: isSimulation=${config.simulation.enabled}`);

    const planStep = previousSteps.find((s) => s.step === 'generate_plan');
    const plan = planStep?.output?.['plan'] as Record<string, unknown> | undefined;
    const transactions = plan?.['transactions'] as Array<Record<string, unknown>> | undefined ?? [];
    const estimatedGas = BigInt(plan?.['estimatedGas'] as string ?? '50000000');

    if (transactions.length === 0) {
      return { action: 'hold', transactionsExecuted: 0, gasUsed: '0' };
    }

    if (config.simulation.enabled) {
      // Simulate execution delay
      const latency = config.simulation.networkLatencyMs ?? 200;
      await new Promise((resolve) => setTimeout(resolve, Math.min(latency, 50)));

      // Update simulated state
      state.dailyGasUsed += estimatedGas;
      state.dailyTransactionCount += transactions.length;
      this.metrics.totalSimulatedTransactions += transactions.length;

      const txHashes = transactions.map(() => `sim-${this.generateId('tx')}`);

      this.emitEvent('simulation.transaction', agentId, {
        agentId,
        txHashes,
        gasUsed: estimatedGas.toString(),
        isSimulation: true,
      });

      return {
        isSimulation: true,
        transactionsExecuted: transactions.length,
        txHashes,
        gasUsed: estimatedGas.toString(),
        newBalance: (state.balance - estimatedGas).toString(),
      };
    }

    // Real on-chain execution via TON Factory (placeholder — integrate with StrategyExecutor)
    this.metrics.totalRealTransactions += transactions.length;
    state.dailyGasUsed += estimatedGas;
    state.dailyTransactionCount += transactions.length;

    return {
      isSimulation: false,
      transactionsExecuted: transactions.length,
      txHashes: transactions.map(() => `tx-${this.generateId('real')}`),
      gasUsed: estimatedGas.toString(),
    };
  }

  /** Step 8: Record execution outcome to registry */
  private async stepRecordOutcome(
    agentId: string,
    executionId: string,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] record_outcome`);

    const executeStep = previousSteps.find((s) => s.step === 'execute_onchain');
    const aiStep = previousSteps.find((s) => s.step === 'call_ai');

    const outcome = {
      agentId,
      executionId,
      recordedAt: new Date().toISOString(),
      transactionsExecuted: executeStep?.output?.['transactionsExecuted'] ?? 0,
      gasUsed: executeStep?.output?.['gasUsed'] ?? '0',
      action: (aiStep?.output?.['decision'] as Record<string, unknown> | undefined)?.['action'] ?? 'hold',
      success: true,
    };

    // In a real implementation, this would call registry.updatePerformance(agentId, outcome)
    return { outcome };
  }

  /** Step 9: Update performance analytics */
  private async stepUpdateAnalytics(
    agentId: string,
    state: RuntimeAgentState,
    previousSteps: PipelineStepResult[]
  ): Promise<Record<string, unknown>> {
    this.log('debug', `[${agentId}] update_analytics`);

    const totalExecutions = state.pipelineHistory.length + 1; // +1 for current
    const successfulExecutions = state.pipelineHistory.filter((e) => e.success).length + 1;
    const winRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const avgDurationMs =
      state.pipelineHistory.length > 0
        ? state.pipelineHistory.reduce((acc, e) => acc + e.totalDurationMs, 0) / state.pipelineHistory.length
        : 0;

    const analytics = {
      agentId,
      totalExecutions,
      successfulExecutions,
      winRate: winRate.toFixed(2),
      avgDurationMs: avgDurationMs.toFixed(0),
      dailyGasUsed: state.dailyGasUsed.toString(),
      dailyTransactionCount: state.dailyTransactionCount,
      updatedAt: new Date().toISOString(),
    };

    // Update global metrics
    this.metrics.updatedAt = new Date();

    return { analytics };
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /** Get the current state of an agent */
  getAgentState(agentId: string): RuntimeAgentState | undefined {
    return this.agentStates.get(agentId);
  }

  /** Get the config of a registered agent */
  getAgentConfig(agentId: string): RuntimeAgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /** List all registered agent IDs */
  listAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /** List agents in a specific lifecycle state */
  listAgentsByState(state: AgentLifecycleState): string[] {
    return Array.from(this.agentStates.entries())
      .filter(([, s]) => s.lifecycleState === state)
      .map(([id]) => id);
  }

  /** Get pipeline execution history for an agent */
  getPipelineHistory(agentId: string): PipelineExecution[] {
    return this.agentStates.get(agentId)?.pipelineHistory ?? [];
  }

  /** Get orchestrator-level metrics */
  getMetrics(): OrchestratorMetrics {
    return {
      ...this.metrics,
      uptimeMs: Date.now() - this.startTime.getTime(),
      updatedAt: new Date(),
    };
  }

  /** Get health status of the orchestrator */
  getHealth(): OrchestratorHealth {
    const metrics = this.getMetrics();
    const overall: OrchestratorHealth['overall'] = this.running ? 'healthy' : 'unhealthy';

    return {
      overall,
      running: this.running,
      aiAvailable: true, // In full integration, check OrchestrationEngine health
      tonFactoryAvailable: true, // In full integration, check TonFactoryService health
      metrics,
      lastCheck: new Date(),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /** Subscribe to runtime events */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private transitionLifecycle(
    agentId: string,
    state: RuntimeAgentState,
    to: AgentLifecycleState,
    reason: LifecycleTransitionReason,
    actor: string,
    metadata?: Record<string, unknown>
  ): void {
    const from = state.lifecycleState;
    const transition: LifecycleTransition = {
      id: this.generateId('trans'),
      from,
      to,
      reason,
      actor,
      timestamp: new Date(),
      metadata,
    };
    state.lifecycleState = to;
    state.transitionHistory.push(transition);

    this.emitEvent('agent.lifecycle_changed', agentId, { agentId, from, to, reason, actor });
  }

  private checkConsecutiveFailures(
    agentId: string,
    config: RuntimeAgentConfig,
    state: RuntimeAgentState
  ): void {
    if (state.consecutiveFailures >= config.riskLimits.maxConsecutiveFailures) {
      this.log('warn', `Agent ${agentId} suspended: too many consecutive failures (${state.consecutiveFailures})`);
      this.emitEvent('risk.emergency_stop', agentId, {
        agentId,
        reason: 'max_consecutive_failures',
        count: state.consecutiveFailures,
      });

      if (state.lifecycleState === 'active') {
        this.transitionLifecycle(agentId, state, 'suspended', 'suspended_error', 'system', {
          consecutiveFailures: state.consecutiveFailures,
        });
        this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
      }
    }
  }

  private requireAgentState(agentId: string): RuntimeAgentState {
    const state = this.agentStates.get(agentId);
    if (!state) {
      throw new AgentRuntimeError(`Agent ${agentId} is not registered`, 'AGENT_NOT_FOUND');
    }
    return state;
  }

  private requireAgentConfig(agentId: string): RuntimeAgentConfig {
    const config = this.agents.get(agentId);
    if (!config) {
      throw new AgentRuntimeError(`Agent ${agentId} is not registered`, 'AGENT_NOT_FOUND');
    }
    return config;
  }

  private requireLifecycleState(
    agentId: string,
    state: RuntimeAgentState,
    allowed: AgentLifecycleState[]
  ): void {
    if (!allowed.includes(state.lifecycleState)) {
      throw new AgentRuntimeError(
        `Agent ${agentId} is in state '${state.lifecycleState}', expected one of: ${allowed.join(', ')}`,
        'INVALID_LIFECYCLE_STATE'
      );
    }
  }

  private emitEvent(
    type: RuntimeEventType,
    agentId: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: RuntimeEvent = {
      id: this.generateId('evt'),
      type,
      timestamp: new Date(),
      agentId: agentId || undefined,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to protect the runtime
      }
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.observability.enableLogging) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.config.observability.logLevel]) return;

    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: 'agent-runtime',
    };

    // Structured log output
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      // info + debug go to console.log in dev; in prod pipe to logging system
      // Using console.log intentionally for structured output
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private initMetrics(): OrchestratorMetrics {
    return {
      totalAgents: 0,
      activeAgents: 0,
      pausedAgents: 0,
      totalPipelineExecutions: 0,
      successfulPipelineExecutions: 0,
      failedPipelineExecutions: 0,
      totalSimulatedTransactions: 0,
      totalRealTransactions: 0,
      totalVolumeProcessed: BigInt(0),
      uptimeMs: 0,
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an Agent Runtime Orchestrator instance.
 *
 * @example
 * ```typescript
 * const runtime = createAgentRuntimeOrchestrator({ enabled: true });
 * runtime.start();
 *
 * runtime.registerAgent({
 *   agentId: 'agent-001',
 *   name: 'DCA Bot',
 *   ownerId: 'tg_123',
 *   ownerAddress: 'EQD...',
 *   strategyIds: ['dca-1'],
 *   simulation: { enabled: true, fakeBalance: BigInt(10_000_000_000) },
 *   riskLimits: { ... },
 *   maxConcurrentExecutions: 2,
 *   enableObservability: true,
 * });
 *
 * runtime.fundAgent('agent-001', BigInt(5_000_000_000));
 * await runtime.startAgent('agent-001');
 * const result = await runtime.runPipeline('agent-001', 'dca-1');
 * ```
 */
export function createAgentRuntimeOrchestrator(
  config?: Partial<AgentRuntimeConfig>
): AgentRuntimeOrchestrator {
  return new AgentRuntimeOrchestrator(config);
}
