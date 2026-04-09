/**
 * TONAIAgent - Agent Manager
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Top-level manager that orchestrates multiple agents, combining:
 * - AgentStateManager for lifecycle management
 * - AgentScheduler for execution scheduling
 * - ExecutionLoop for cycle processing
 * - RuntimeMonitor for observability
 *
 * This is the main entry point for the Agent Execution Loop system.
 */

import type {
  AgentConfig,
  AgentManagerConfig,
  AgentMetrics,
  AgentRiskLimits,
  AgentRuntimeState,
  AgentState,
  AgentStatus,
  ExecutionCycleResult,
  ExecutionInterval,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeTelemetry,
  RuntimeUnsubscribe,
  SchedulerConfig,
} from './types';
import { RuntimeError } from './types';

import { AgentStateManager, createAgentStateManager } from './agent-state';
import { AgentScheduler, createAgentScheduler, intervalToMs } from './agent-scheduler';
import {
  ExecutionLoop,
  createExecutionLoop,
  MarketDataProvider,
  StrategyExecutor,
  RiskValidator,
  TradeExecutor,
} from './execution-loop';
import { RuntimeMonitor, createRuntimeMonitor, RuntimeMonitorConfig } from './runtime-monitor';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_AGENT_MANAGER_CONFIG: AgentManagerConfig = {
  maxAgents: 1000,
  scheduler: {
    maxConcurrentExecutions: 100,
    minIntervalMs: 1000,
    maxIntervalMs: 3600000,
    enableDriftCompensation: true,
    executionTimeoutMs: 30000,
  },
  defaultRiskLimits: {
    maxPositionSizePercent: 5,
    maxPortfolioExposurePercent: 20,
    stopLossPercent: 10,
    maxDailyLossPercent: 3,
    maxTradesPerDay: 100,
  },
  defaultInterval: {
    value: 10,
    unit: 'seconds',
  },
  enableObservability: true,
  logLevel: 'info',
};

// ============================================================================
// Agent Manager
// ============================================================================

/**
 * AgentManager - Top-level orchestrator for the Agent Execution Loop system.
 *
 * Manages multiple agents running in parallel, each with its own:
 * - Lifecycle state (CREATED -> RUNNING -> PAUSED -> STOPPED | ERROR)
 * - Execution schedule (configurable intervals)
 * - Strategy execution
 * - Risk validation
 * - Portfolio tracking
 * - Performance metrics
 *
 * @example
 * ```typescript
 * const manager = createAgentManager();
 * manager.start();
 *
 * // Create and start an agent
 * const agent = await manager.createAgent({
 *   agentId: 'agent-001',
 *   name: 'Momentum Bot',
 *   ownerId: 'user-123',
 *   strategyId: 'momentum',
 *   tradingPair: 'TON/USDT',
 *   interval: { value: 10, unit: 'seconds' },
 *   initialBalance: { USDT: 10000 },
 *   riskLimits: { maxPositionSizePercent: 5, ... },
 *   simulationMode: true,
 * });
 *
 * await manager.startAgent('agent-001');
 *
 * // Monitor agents
 * const telemetry = manager.getTelemetry();
 * console.log(telemetry.runningAgents);
 *
 * // Get agent status
 * const status = manager.getAgentStatus('agent-001');
 *
 * // Control agent
 * await manager.pauseAgent('agent-001');
 * await manager.resumeAgent('agent-001');
 * await manager.stopAgent('agent-001');
 *
 * manager.stop();
 * ```
 */
export class AgentManager {
  private readonly config: AgentManagerConfig;
  private readonly stateManager: AgentStateManager;
  private readonly scheduler: AgentScheduler;
  private readonly executionLoop: ExecutionLoop;
  private readonly monitor: RuntimeMonitor;
  private readonly eventHandlers = new Set<RuntimeEventHandler>();
  private running = false;

  constructor(options: {
    config?: Partial<AgentManagerConfig>;
    marketDataProvider?: MarketDataProvider;
    strategyExecutor?: StrategyExecutor;
    riskValidator?: RiskValidator;
    tradeExecutor?: TradeExecutor;
    monitorConfig?: Partial<RuntimeMonitorConfig>;
  } = {}) {
    this.config = {
      ...DEFAULT_AGENT_MANAGER_CONFIG,
      ...options.config,
      scheduler: {
        ...DEFAULT_AGENT_MANAGER_CONFIG.scheduler,
        ...options.config?.scheduler,
      },
      defaultRiskLimits: {
        ...DEFAULT_AGENT_MANAGER_CONFIG.defaultRiskLimits,
        ...options.config?.defaultRiskLimits,
      },
      defaultInterval: {
        ...DEFAULT_AGENT_MANAGER_CONFIG.defaultInterval,
        ...options.config?.defaultInterval,
      },
    };

    this.stateManager = createAgentStateManager();
    this.scheduler = createAgentScheduler(this.config.scheduler);
    this.executionLoop = createExecutionLoop({
      marketDataProvider: options.marketDataProvider,
      strategyExecutor: options.strategyExecutor,
      riskValidator: options.riskValidator,
      tradeExecutor: options.tradeExecutor,
    });
    this.monitor = createRuntimeMonitor(options.monitorConfig);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the agent manager.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Register global handlers to prevent silent process crashes from unhandled async errors
    if (!process.listenerCount('unhandledRejection')) {
      process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
        console.error('[AgentManager] Unhandled promise rejection:', { reason, promise });
      });
    }
    if (!process.listenerCount('uncaughtException')) {
      process.on('uncaughtException', (error: Error) => {
        console.error('[AgentManager] Uncaught exception:', error);
        process.exit(1);
      });
    }

    this.scheduler.start();
    this.monitor.start();

    this.log('info', 'AgentManager started');
  }

  /**
   * Stop the agent manager.
   * All running agents will be stopped.
   */
  stop(): void {
    if (!this.running) return;

    // Stop all running agents
    const runningAgents = this.stateManager.listAgentsByState('RUNNING');
    for (const agent of runningAgents) {
      try {
        this.stopAgentSync(agent.agentId);
      } catch {
        // Ignore errors during shutdown
      }
    }

    this.scheduler.stop();
    this.monitor.stop();
    this.running = false;

    this.log('info', 'AgentManager stopped');
  }

  /**
   * Check if manager is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Create a new agent.
   * Agent starts in CREATED state.
   */
  async createAgent(config: AgentConfig): Promise<AgentRuntimeState> {
    if (!this.running) {
      throw new RuntimeError('AgentManager is not running', 'SCHEDULER_ERROR');
    }

    if (this.stateManager.getAgentCount() >= this.config.maxAgents) {
      throw new RuntimeError(
        `Maximum agents (${this.config.maxAgents}) reached`,
        'CONFIGURATION_ERROR'
      );
    }

    // Apply defaults
    const fullConfig: AgentConfig = {
      ...config,
      riskLimits: {
        ...this.config.defaultRiskLimits,
        ...config.riskLimits,
      },
      interval: config.interval ?? this.config.defaultInterval,
    };

    // Create agent state
    const state = this.stateManager.createAgent(fullConfig);

    // Register with monitor
    this.monitor.registerAgent(state);

    this.log('info', `Agent ${config.agentId} created`);

    return state;
  }

  /**
   * Start an agent.
   * Transitions from CREATED/PAUSED to RUNNING and schedules execution.
   */
  async startAgent(agentId: string): Promise<AgentRuntimeState> {
    const state = this.stateManager.requireAgent(agentId);

    // Transition state
    const newState = this.stateManager.startAgent(agentId);

    // Schedule execution
    this.scheduler.scheduleAgent(
      agentId,
      state.config.interval,
      async () => {
        await this.executeAgentCycle(agentId);
      }
    );

    // Update next execution time
    const scheduled = this.scheduler.getScheduledAgent(agentId);
    if (scheduled) {
      this.stateManager.updateNextExecution(agentId, scheduled.nextRunAt);
    }

    // Update monitor
    this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

    this.log('info', `Agent ${agentId} started`);

    return newState;
  }

  /**
   * Pause an agent.
   * Transitions from RUNNING to PAUSED and suspends scheduling.
   */
  async pauseAgent(agentId: string): Promise<AgentRuntimeState> {
    const newState = this.stateManager.pauseAgent(agentId);

    // Pause scheduling
    this.scheduler.pauseAgent(agentId);
    this.stateManager.updateNextExecution(agentId, null);

    // Update monitor
    this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

    this.log('info', `Agent ${agentId} paused`);

    return newState;
  }

  /**
   * Resume a paused agent.
   * Transitions from PAUSED to RUNNING and resumes scheduling.
   */
  async resumeAgent(agentId: string): Promise<AgentRuntimeState> {
    const newState = this.stateManager.resumeAgent(agentId);

    // Resume scheduling
    this.scheduler.resumeAgent(agentId);

    // Update next execution time
    const scheduled = this.scheduler.getScheduledAgent(agentId);
    if (scheduled) {
      this.stateManager.updateNextExecution(agentId, scheduled.nextRunAt);
    }

    // Update monitor
    this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

    this.log('info', `Agent ${agentId} resumed`);

    return newState;
  }

  /**
   * Stop an agent.
   * Transitions to STOPPED (terminal state) and removes from scheduling.
   */
  async stopAgent(agentId: string): Promise<AgentRuntimeState> {
    return this.stopAgentSync(agentId);
  }

  /**
   * Trigger an immediate execution cycle for an agent.
   */
  async triggerAgent(agentId: string): Promise<ExecutionCycleResult> {
    const state = this.stateManager.requireAgent(agentId);

    if (state.state !== 'RUNNING') {
      throw new RuntimeError(
        `Agent ${agentId} is not running (state: ${state.state})`,
        'AGENT_NOT_RUNNING'
      );
    }

    return this.executeAgentCycle(agentId);
  }

  /**
   * Update agent execution interval.
   */
  async updateAgentInterval(agentId: string, interval: ExecutionInterval): Promise<void> {
    const state = this.stateManager.requireAgent(agentId);

    // Update config (note: this modifies the internal state)
    state.config.interval = interval;

    // Update scheduler if running
    if (state.state === 'RUNNING') {
      this.scheduler.updateInterval(agentId, interval);

      const scheduled = this.scheduler.getScheduledAgent(agentId);
      if (scheduled) {
        this.stateManager.updateNextExecution(agentId, scheduled.nextRunAt);
      }
    }

    this.log('info', `Agent ${agentId} interval updated to ${interval.value}${interval.unit}`);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get agent state by ID.
   */
  getAgent(agentId: string): AgentRuntimeState | undefined {
    return this.stateManager.getAgent(agentId);
  }

  /**
   * Get agent status summary.
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.monitor.getAgentStatus(agentId);
  }

  /**
   * List all agents.
   */
  listAgents(): AgentRuntimeState[] {
    return this.stateManager.listAgents();
  }

  /**
   * List agents by state.
   */
  listAgentsByState(state: AgentState): AgentRuntimeState[] {
    return this.stateManager.listAgentsByState(state);
  }

  /**
   * Get all agent statuses.
   */
  getAllAgentStatuses(): AgentStatus[] {
    return this.monitor.getAllAgentStatuses();
  }

  /**
   * Get agent count.
   */
  getAgentCount(): number {
    return this.stateManager.getAgentCount();
  }

  /**
   * Get state counts.
   */
  getStateCounts(): Record<AgentState, number> {
    return this.stateManager.getStateCounts();
  }

  // ============================================================================
  // Monitoring & Telemetry
  // ============================================================================

  /**
   * Get runtime telemetry.
   */
  getTelemetry(): RuntimeTelemetry {
    return this.monitor.getTelemetry();
  }

  /**
   * Get scheduler metrics.
   */
  getSchedulerMetrics(): {
    scheduledAgents: number;
    runningAgents: number;
    currentExecutions: number;
    isRunning: boolean;
  } {
    return this.scheduler.getMetrics();
  }

  /**
   * Get recent events.
   */
  getEventHistory(limit = 100): RuntimeEvent[] {
    return this.monitor.getEventHistory(limit);
  }

  /**
   * Get events for a specific agent.
   */
  getAgentEvents(agentId: string, limit = 100): RuntimeEvent[] {
    return this.monitor.getAgentEvents(agentId, limit);
  }

  /**
   * Get active alerts.
   */
  getAlerts() {
    return this.monitor.getAlerts();
  }

  /**
   * Acknowledge an alert.
   */
  acknowledgeAlert(alertId: string): boolean {
    return this.monitor.acknowledgeAlert(alertId);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to runtime events.
   */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Subscribe to alerts.
   */
  onAlert(handler: (alert: import('./runtime-monitor').RuntimeAlert) => void): () => void {
    return this.monitor.onAlert(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private stopAgentSync(agentId: string): AgentRuntimeState {
    const newState = this.stateManager.stopAgent(agentId);

    // Remove from scheduler
    this.scheduler.unscheduleAgent(agentId);
    this.stateManager.updateNextExecution(agentId, null);

    // Update monitor
    this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

    this.log('info', `Agent ${agentId} stopped`);

    return newState;
  }

  private async executeAgentCycle(agentId: string): Promise<ExecutionCycleResult> {
    const state = this.stateManager.requireAgent(agentId);

    // Verify agent is still running
    if (state.state !== 'RUNNING') {
      throw new RuntimeError(
        `Agent ${agentId} is not running`,
        'AGENT_NOT_RUNNING'
      );
    }

    try {
      // Execute the cycle
      const result = await this.executionLoop.executeCycle(state);

      // Update state based on result
      this.stateManager.updateLastExecution(agentId, result.completedAt);
      this.stateManager.incrementCycleCounts(agentId, result.success, result.durationMs);

      if (result.success) {
        this.stateManager.resetErrors(agentId);

        // Update portfolio if trade was executed
        if (result.trade && result.portfolioUpdate) {
          this.stateManager.updatePositions(agentId, result.portfolioUpdate.newPositions);
          this.stateManager.updatePortfolioValue(agentId, result.portfolioUpdate.newValue);
          this.stateManager.addTradeRecord(agentId, result.trade);

          // Update metrics
          const currentState = this.stateManager.requireAgent(agentId);
          const metrics = this.calculateMetrics(currentState, result);
          this.stateManager.updateMetrics(agentId, metrics);
        }
      } else {
        // Increment consecutive errors
        const currentState = this.stateManager.requireAgent(agentId);

        // Check if we should transition to ERROR state
        if (currentState.consecutiveErrors >= 5) {
          this.stateManager.setAgentError(agentId, result.error ?? 'Too many consecutive errors');
          this.scheduler.pauseAgent(agentId);
        }
      }

      // Record event for monitoring
      this.monitor.recordEvent({
        id: `evt-${Date.now()}`,
        type: result.success ? 'cycle.completed' : 'cycle.failed',
        timestamp: new Date(),
        agentId,
        data: {
          cycleId: result.cycleId,
          durationMs: result.durationMs,
          action: result.signal?.action,
          error: result.error,
          value: result.trade?.value,
        },
      });

      // Update monitor state
      this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failure
      this.stateManager.incrementCycleCounts(agentId, false, 0);
      const currentState = this.stateManager.requireAgent(agentId);

      if (currentState.consecutiveErrors >= 5) {
        this.stateManager.setAgentError(agentId, errorMessage);
        this.scheduler.pauseAgent(agentId);
      }

      this.monitor.updateAgentState(this.stateManager.requireAgent(agentId));

      throw error;
    }
  }

  private calculateMetrics(
    state: AgentRuntimeState,
    result: ExecutionCycleResult
  ): Partial<AgentMetrics> {
    const initialValue = Object.values(state.config.initialBalance).reduce((a, b) => a + b, 0);
    const currentValue = state.portfolioValue;

    // Calculate ROI
    const roi = ((currentValue - initialValue) / initialValue) * 100;

    // Calculate realized PnL from trades
    const realizedPnl = state.tradeHistory
      .filter((t) => t.pnl !== undefined)
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    // Calculate unrealized PnL
    const unrealizedPnl = currentValue - initialValue - realizedPnl;

    // Calculate win rate
    const winningTrades = state.tradeHistory.filter((t) => (t.pnl ?? 0) > 0).length;
    const losingTrades = state.tradeHistory.filter((t) => (t.pnl ?? 0) < 0).length;
    const totalTrades = state.tradeHistory.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate max drawdown (simplified)
    let maxValue = initialValue;
    let maxDrawdown = 0;
    for (const trade of state.tradeHistory) {
      const valueAfterTrade = trade.value;
      if (valueAfterTrade > maxValue) {
        maxValue = valueAfterTrade;
      }
      const drawdown = ((maxValue - valueAfterTrade) / maxValue) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      roi,
      totalPnl: realizedPnl + unrealizedPnl,
      realizedPnl,
      unrealizedPnl,
      maxDrawdown,
      winRate,
      totalTrades,
      winningTrades,
      losingTrades,
    };
  }

  private setupEventForwarding(): void {
    // Forward state manager events
    this.stateManager.subscribe((event) => {
      this.forwardEvent(event);
      this.monitor.recordEvent(event);
    });

    // Forward scheduler events
    this.scheduler.subscribe((event) => {
      this.forwardEvent(event);
      this.monitor.recordEvent(event);
    });

    // Forward execution loop events
    this.executionLoop.subscribe((event) => {
      this.forwardEvent(event);
      this.monitor.recordEvent(event);
    });
  }

  private forwardEvent(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.enableObservability) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.config.logLevel]) return;

    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: 'agent-manager',
    };

    // In production, this would go to a proper logging system
    // For now, use console
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    }
    // Skip info and debug to avoid noisy output
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AgentManager instance.
 *
 * @example
 * ```typescript
 * const manager = createAgentManager({
 *   config: {
 *     maxAgents: 100,
 *     enableObservability: true,
 *   },
 * });
 *
 * manager.start();
 *
 * await manager.createAgent({
 *   agentId: 'agent-001',
 *   name: 'Momentum Bot',
 *   // ...
 * });
 *
 * await manager.startAgent('agent-001');
 * ```
 */
export function createAgentManager(options?: {
  config?: Partial<AgentManagerConfig>;
  marketDataProvider?: MarketDataProvider;
  strategyExecutor?: StrategyExecutor;
  riskValidator?: RiskValidator;
  tradeExecutor?: TradeExecutor;
  monitorConfig?: Partial<RuntimeMonitorConfig>;
}): AgentManager {
  return new AgentManager(options);
}
