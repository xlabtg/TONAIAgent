/**
 * TONAIAgent - Agent State Manager
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Manages the state machine for agent lifecycle transitions.
 * States: CREATED -> RUNNING <-> PAUSED -> STOPPED | ERROR
 */

import type {
  AgentConfig,
  AgentMetrics,
  AgentRuntimeState,
  AgentState,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeUnsubscribe,
  TradeRecord,
} from './types';
import { RuntimeError } from './types';

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions.
 */
const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  CREATED: ['RUNNING', 'STOPPED'],
  RUNNING: ['PAUSED', 'STOPPED', 'ERROR'],
  PAUSED: ['RUNNING', 'STOPPED'],
  STOPPED: [], // Terminal state
  ERROR: ['RUNNING', 'STOPPED'], // Can recover or stop
};

// ============================================================================
// Default Metrics
// ============================================================================

function createDefaultMetrics(): AgentMetrics {
  return {
    roi: 0,
    totalPnl: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    maxDrawdown: 0,
    sharpeRatio: null,
    winRate: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalCycles: 0,
    successfulCycles: 0,
    failedCycles: 0,
    avgCycleDurationMs: 0,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Agent State Manager
// ============================================================================

/**
 * Manages the state of a single agent.
 *
 * Implements the state machine:
 * - CREATED: Agent is registered but not yet started
 * - RUNNING: Agent is actively executing cycles
 * - PAUSED: Agent is temporarily suspended
 * - STOPPED: Agent is permanently stopped (terminal)
 * - ERROR: Agent encountered an error (can recover)
 *
 * @example
 * ```typescript
 * const stateManager = new AgentStateManager();
 *
 * // Create an agent
 * const state = stateManager.createAgent({
 *   agentId: 'agent-001',
 *   name: 'Momentum Bot',
 *   strategyId: 'momentum',
 *   tradingPair: 'TON/USDT',
 *   // ...
 * });
 *
 * // Start the agent
 * stateManager.startAgent('agent-001');
 *
 * // Pause the agent
 * stateManager.pauseAgent('agent-001');
 *
 * // Resume the agent
 * stateManager.resumeAgent('agent-001');
 *
 * // Stop the agent
 * stateManager.stopAgent('agent-001');
 * ```
 */
export class AgentStateManager {
  private readonly agents = new Map<string, AgentRuntimeState>();
  private readonly eventHandlers = new Set<RuntimeEventHandler>();

  // ============================================================================
  // Agent Lifecycle
  // ============================================================================

  /**
   * Create a new agent in CREATED state.
   */
  createAgent(config: AgentConfig): AgentRuntimeState {
    if (this.agents.has(config.agentId)) {
      throw new RuntimeError(
        `Agent ${config.agentId} already exists`,
        'AGENT_ALREADY_EXISTS',
        { agentId: config.agentId }
      );
    }

    const now = new Date();
    const initialValue = Object.values(config.initialBalance).reduce((sum, v) => sum + v, 0);

    const state: AgentRuntimeState = {
      agentId: config.agentId,
      state: 'CREATED',
      config,
      portfolioValue: initialValue,
      positions: { ...config.initialBalance },
      tradeHistory: [],
      metrics: createDefaultMetrics(),
      lastExecutionAt: null,
      nextExecutionAt: null,
      consecutiveErrors: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.agents.set(config.agentId, state);
    this.emitEvent('agent.created', config.agentId, {
      name: config.name,
      strategyId: config.strategyId,
      tradingPair: config.tradingPair,
    });

    return { ...state };
  }

  /**
   * Start an agent (transition to RUNNING).
   */
  startAgent(agentId: string): AgentRuntimeState {
    return this.transitionState(agentId, 'RUNNING', 'agent.started');
  }

  /**
   * Pause an agent (transition to PAUSED).
   */
  pauseAgent(agentId: string): AgentRuntimeState {
    return this.transitionState(agentId, 'PAUSED', 'agent.paused');
  }

  /**
   * Resume a paused agent (transition to RUNNING).
   * Only works from PAUSED state - use startAgent for CREATED state.
   */
  resumeAgent(agentId: string): AgentRuntimeState {
    const state = this.requireAgent(agentId);

    if (state.state !== 'PAUSED') {
      throw new RuntimeError(
        `Cannot resume agent ${agentId} from state ${state.state}. Only PAUSED agents can be resumed.`,
        'INVALID_STATE_TRANSITION',
        { agentId, currentState: state.state, targetState: 'RUNNING' }
      );
    }

    return this.transitionState(agentId, 'RUNNING', 'agent.resumed');
  }

  /**
   * Stop an agent (transition to STOPPED - terminal).
   */
  stopAgent(agentId: string): AgentRuntimeState {
    return this.transitionState(agentId, 'STOPPED', 'agent.stopped');
  }

  /**
   * Set an agent to ERROR state.
   */
  setAgentError(agentId: string, errorMessage: string): AgentRuntimeState {
    const state = this.requireAgent(agentId);

    if (!STATE_TRANSITIONS[state.state].includes('ERROR') && state.state !== 'RUNNING') {
      throw new RuntimeError(
        `Cannot transition from ${state.state} to ERROR`,
        'INVALID_STATE_TRANSITION',
        { agentId, currentState: state.state, targetState: 'ERROR' }
      );
    }

    state.state = 'ERROR';
    state.errorMessage = errorMessage;
    state.consecutiveErrors++;
    state.updatedAt = new Date();

    this.emitEvent('agent.error', agentId, {
      errorMessage,
      consecutiveErrors: state.consecutiveErrors,
    });

    return { ...state };
  }

  /**
   * Recover an agent from ERROR state.
   */
  recoverAgent(agentId: string): AgentRuntimeState {
    const state = this.requireAgent(agentId);

    if (state.state !== 'ERROR') {
      throw new RuntimeError(
        `Agent ${agentId} is not in ERROR state`,
        'INVALID_STATE_TRANSITION',
        { agentId, currentState: state.state }
      );
    }

    state.state = 'RUNNING';
    state.errorMessage = undefined;
    state.consecutiveErrors = 0;
    state.updatedAt = new Date();

    this.emitEvent('agent.started', agentId, {
      recoveredFrom: 'ERROR',
    });

    return { ...state };
  }

  // ============================================================================
  // State Updates
  // ============================================================================

  /**
   * Update agent positions after a trade.
   */
  updatePositions(agentId: string, positions: Record<string, number>): void {
    const state = this.requireAgent(agentId);
    state.positions = { ...positions };
    state.updatedAt = new Date();
  }

  /**
   * Update agent portfolio value.
   */
  updatePortfolioValue(agentId: string, value: number): void {
    const state = this.requireAgent(agentId);
    state.portfolioValue = value;
    state.updatedAt = new Date();
  }

  /**
   * Add a trade to history.
   */
  addTradeRecord(agentId: string, trade: TradeRecord): void {
    const state = this.requireAgent(agentId);
    state.tradeHistory.push(trade);
    state.updatedAt = new Date();
  }

  /**
   * Update agent metrics.
   */
  updateMetrics(agentId: string, metricsUpdate: Partial<AgentMetrics>): void {
    const state = this.requireAgent(agentId);
    state.metrics = {
      ...state.metrics,
      ...metricsUpdate,
      updatedAt: new Date(),
    };
    state.updatedAt = new Date();
  }

  /**
   * Update last execution timestamp.
   */
  updateLastExecution(agentId: string, timestamp: Date): void {
    const state = this.requireAgent(agentId);
    state.lastExecutionAt = timestamp;
    state.updatedAt = new Date();
  }

  /**
   * Update next scheduled execution timestamp.
   */
  updateNextExecution(agentId: string, timestamp: Date | null): void {
    const state = this.requireAgent(agentId);
    state.nextExecutionAt = timestamp;
    state.updatedAt = new Date();
  }

  /**
   * Reset consecutive error count.
   */
  resetErrors(agentId: string): void {
    const state = this.requireAgent(agentId);
    state.consecutiveErrors = 0;
    state.errorMessage = undefined;
    state.updatedAt = new Date();
  }

  /**
   * Increment cycle counts.
   */
  incrementCycleCounts(agentId: string, success: boolean, durationMs: number): void {
    const state = this.requireAgent(agentId);
    const metrics = state.metrics;

    metrics.totalCycles++;
    if (success) {
      metrics.successfulCycles++;
    } else {
      metrics.failedCycles++;
    }

    // Update average cycle duration
    const totalDuration = metrics.avgCycleDurationMs * (metrics.totalCycles - 1) + durationMs;
    metrics.avgCycleDurationMs = totalDuration / metrics.totalCycles;
    metrics.updatedAt = new Date();
    state.updatedAt = new Date();
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Get agent state by ID.
   */
  getAgent(agentId: string): AgentRuntimeState | undefined {
    const state = this.agents.get(agentId);
    return state ? { ...state } : undefined;
  }

  /**
   * Get agent state or throw if not found.
   */
  requireAgent(agentId: string): AgentRuntimeState {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new RuntimeError(
        `Agent ${agentId} not found`,
        'AGENT_NOT_FOUND',
        { agentId }
      );
    }
    return state;
  }

  /**
   * List all agents.
   */
  listAgents(): AgentRuntimeState[] {
    return Array.from(this.agents.values()).map((s) => ({ ...s }));
  }

  /**
   * List agents by state.
   */
  listAgentsByState(state: AgentState): AgentRuntimeState[] {
    return Array.from(this.agents.values())
      .filter((s) => s.state === state)
      .map((s) => ({ ...s }));
  }

  /**
   * Get total agent count.
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get count of agents in each state.
   */
  getStateCounts(): Record<AgentState, number> {
    const counts: Record<AgentState, number> = {
      CREATED: 0,
      RUNNING: 0,
      PAUSED: 0,
      STOPPED: 0,
      ERROR: 0,
    };

    for (const state of this.agents.values()) {
      counts[state.state]++;
    }

    return counts;
  }

  /**
   * Check if agent exists.
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Check if agent is in a runnable state.
   */
  isRunnable(agentId: string): boolean {
    const state = this.agents.get(agentId);
    return state?.state === 'RUNNING';
  }

  /**
   * Remove an agent from the manager.
   * Only stopped agents can be removed.
   */
  removeAgent(agentId: string): boolean {
    const state = this.agents.get(agentId);
    if (!state) return false;

    if (state.state !== 'STOPPED') {
      throw new RuntimeError(
        `Cannot remove agent ${agentId} in state ${state.state}. Stop the agent first.`,
        'INVALID_STATE_TRANSITION',
        { agentId, currentState: state.state }
      );
    }

    return this.agents.delete(agentId);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to state events.
   */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private transitionState(
    agentId: string,
    targetState: AgentState,
    eventType: RuntimeEvent['type']
  ): AgentRuntimeState {
    const state = this.requireAgent(agentId);
    const currentState = state.state;

    // Validate transition
    const validTransitions = STATE_TRANSITIONS[currentState];
    if (!validTransitions.includes(targetState)) {
      throw new RuntimeError(
        `Invalid state transition from ${currentState} to ${targetState}`,
        'INVALID_STATE_TRANSITION',
        { agentId, currentState, targetState }
      );
    }

    // Update state
    state.state = targetState;
    state.updatedAt = new Date();

    // Clear error info when leaving ERROR state
    if (currentState === 'ERROR') {
      state.errorMessage = undefined;
      state.consecutiveErrors = 0;
    }

    this.emitEvent(eventType, agentId, {
      previousState: currentState,
      newState: targetState,
    });

    return { ...state };
  }

  private emitEvent(
    type: RuntimeEvent['type'],
    agentId: string,
    data: Record<string, unknown>
  ): void {
    const event: RuntimeEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
      agentId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AgentStateManager instance.
 */
export function createAgentStateManager(): AgentStateManager {
  return new AgentStateManager();
}
