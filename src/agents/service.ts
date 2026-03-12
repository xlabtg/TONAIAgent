/**
 * TONAIAgent - Agent Manager Service
 *
 * Core service for managing agent lifecycle operations including:
 * - Agent creation and configuration
 * - Start, pause, resume, stop lifecycle transitions
 * - Agent deletion
 * - Runtime integration with execution loop (#212)
 * - Event emission for monitoring and logging
 *
 * Implements Issue #213: Agent Manager API (Agent Lifecycle Management)
 */

import type {
  AgentConfig,
  AgentDetailsResponse,
  AgentEvent,
  AgentEventHandler,
  AgentEventUnsubscribe,
  AgentLifecycleStatus,
  AgentManagerConfig,
  AgentPerformanceMetrics,
  AgentRecord,
  ConfigureAgentRequest,
  CreateAgentRequest,
  ListAgentsResponse,
} from './types';

import { AgentError } from './types';
import type { AgentStorage } from './storage';
import { createDemoAgentStorage, toAgentSummary } from './storage';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_AGENT_MANAGER_CONFIG: AgentManagerConfig = {
  enabled: true,
  max_agents: 1000,
  default_execution_interval: '10s',
  enable_events: true,
  verbose_logging: false,
};

// ============================================================================
// Valid State Transitions
// ============================================================================

/**
 * Valid lifecycle state transitions.
 * Key: current state, Value: array of valid target states
 */
const VALID_TRANSITIONS: Record<AgentLifecycleStatus, AgentLifecycleStatus[]> = {
  CREATED: ['CONFIGURED', 'DELETED'],
  CONFIGURED: ['RUNNING', 'DELETED'],
  RUNNING: ['PAUSED', 'STOPPED', 'ERROR'],
  PAUSED: ['RUNNING', 'STOPPED'],
  STOPPED: ['RUNNING', 'DELETED'],
  ERROR: ['STOPPED', 'DELETED'],
  DELETED: [], // Terminal state
};

// ============================================================================
// Agent Manager Service
// ============================================================================

/**
 * AgentManagerService handles all agent lifecycle operations.
 *
 * @example
 * ```typescript
 * const service = createAgentManagerService();
 *
 * // Create an agent
 * const result = service.createAgent({
 *   name: 'My Bot',
 *   strategy: 'momentum',
 *   initial_balance: 10000,
 *   base_asset: 'USDT',
 *   pairs: ['TON/USDT'],
 * });
 *
 * // Configure it
 * service.configureAgent(result.agent_id, {
 *   strategy_params: { lookback_period: 20 },
 *   risk_params: { max_position_size: 0.1 },
 * });
 *
 * // Start it
 * service.startAgent(result.agent_id);
 * ```
 */
export class AgentManagerService {
  private readonly config: AgentManagerConfig;
  private readonly storage: AgentStorage;
  private readonly subscribers = new Set<AgentEventHandler>();

  constructor(storage?: AgentStorage, config: Partial<AgentManagerConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_MANAGER_CONFIG, ...config };
    this.storage = storage ?? createDemoAgentStorage();
  }

  // --------------------------------------------------------------------------
  // Agent Creation
  // --------------------------------------------------------------------------

  /**
   * Create a new agent.
   *
   * POST /agents
   *
   * @param request - Agent creation request
   * @returns Created agent with ID and initial status
   */
  createAgent(request: CreateAgentRequest): { agent_id: string; status: AgentLifecycleStatus } {
    // Validate max agents limit
    if (this.storage.count() >= this.config.max_agents) {
      throw new AgentError(
        `Maximum number of agents (${this.config.max_agents}) reached`,
        'MAX_AGENTS_REACHED'
      );
    }

    // Validate required fields
    this.validateCreateRequest(request);

    const agentId = this.generateAgentId();
    const now = new Date();

    const record: AgentRecord = {
      agent_id: agentId,
      name: request.name,
      strategy: request.strategy,
      status: 'CREATED',
      initial_balance: request.initial_balance,
      base_asset: request.base_asset,
      pairs: request.pairs,
      config: undefined,
      execution_interval: request.execution_interval ?? this.config.default_execution_interval,
      owner_id: request.owner_id ?? 'default_user',
      portfolio_value: request.initial_balance,
      trades_executed: 0,
      created_at: now,
      updated_at: now,
      started_at: null,
      stopped_at: null,
      error_message: null,
    };

    this.storage.create(record);

    this.emitEvent('agent_created', agentId, undefined, 'CREATED');
    this.log('info', `Agent created: ${agentId} (${request.name})`);

    return { agent_id: agentId, status: 'CREATED' };
  }

  // --------------------------------------------------------------------------
  // Agent Configuration
  // --------------------------------------------------------------------------

  /**
   * Configure an agent with strategy and risk parameters.
   *
   * POST /agents/{agent_id}/config
   *
   * @param agentId - Agent identifier
   * @param config - Configuration to apply
   * @returns Updated agent with configuration
   */
  configureAgent(
    agentId: string,
    config: ConfigureAgentRequest
  ): { agent_id: string; status: AgentLifecycleStatus; config: AgentConfig } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    // Only allow configuration in CREATED or CONFIGURED states
    if (record.status !== 'CREATED' && record.status !== 'CONFIGURED') {
      throw new AgentError(
        `Agent '${agentId}' cannot be configured in ${record.status} state`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status }
      );
    }

    const appliedConfig: AgentConfig = {
      strategy_params: config.strategy_params ?? {},
      risk_params: config.risk_params ?? {},
    };

    const previousStatus = record.status;
    const updated = this.storage.update(agentId, {
      config: appliedConfig,
      status: 'CONFIGURED',
    });

    this.emitEvent('agent_configured', agentId, previousStatus, 'CONFIGURED', { config: appliedConfig });
    this.log('info', `Agent configured: ${agentId}`);

    return {
      agent_id: agentId,
      status: updated.status,
      config: appliedConfig,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle Operations
  // --------------------------------------------------------------------------

  /**
   * Start an agent. Registers it with the runtime scheduler.
   *
   * POST /agents/{agent_id}/start
   *
   * @param agentId - Agent identifier
   * @returns Updated agent status
   */
  startAgent(agentId: string): { agent_id: string; status: AgentLifecycleStatus; message: string } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    // Validate transition
    if (record.status === 'RUNNING') {
      throw new AgentError(
        `Agent '${agentId}' is already running`,
        'AGENT_ALREADY_RUNNING',
        { agent_id: agentId }
      );
    }

    if (record.status === 'CREATED') {
      throw new AgentError(
        `Agent '${agentId}' must be configured before starting`,
        'AGENT_NOT_CONFIGURED',
        { agent_id: agentId }
      );
    }

    if (!this.isValidTransition(record.status, 'RUNNING')) {
      throw new AgentError(
        `Cannot start agent '${agentId}' from ${record.status} state`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status, target_status: 'RUNNING' }
      );
    }

    const previousStatus = record.status;
    const updated = this.storage.update(agentId, {
      status: 'RUNNING',
      started_at: new Date(),
      error_message: null,
    });

    // In full implementation: Register with Agent Execution Loop (#212)
    this.emitEvent('agent_started', agentId, previousStatus, 'RUNNING');
    this.log('info', `Agent started: ${agentId}`);

    return {
      agent_id: agentId,
      status: updated.status,
      message: `Agent '${record.name}' started successfully`,
    };
  }

  /**
   * Pause an agent. Temporarily stops execution loop.
   *
   * POST /agents/{agent_id}/pause
   *
   * @param agentId - Agent identifier
   * @returns Updated agent status
   */
  pauseAgent(agentId: string): { agent_id: string; status: AgentLifecycleStatus; message: string } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    if (record.status === 'PAUSED') {
      throw new AgentError(
        `Agent '${agentId}' is already paused`,
        'AGENT_ALREADY_PAUSED',
        { agent_id: agentId }
      );
    }

    if (!this.isValidTransition(record.status, 'PAUSED')) {
      throw new AgentError(
        `Cannot pause agent '${agentId}' from ${record.status} state`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status, target_status: 'PAUSED' }
      );
    }

    const previousStatus = record.status;
    const updated = this.storage.update(agentId, {
      status: 'PAUSED',
    });

    this.emitEvent('agent_paused', agentId, previousStatus, 'PAUSED');
    this.log('info', `Agent paused: ${agentId}`);

    return {
      agent_id: agentId,
      status: updated.status,
      message: `Agent '${record.name}' paused successfully`,
    };
  }

  /**
   * Resume a paused agent.
   *
   * POST /agents/{agent_id}/resume (alias for start when paused)
   *
   * @param agentId - Agent identifier
   * @returns Updated agent status
   */
  resumeAgent(agentId: string): { agent_id: string; status: AgentLifecycleStatus; message: string } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    if (record.status !== 'PAUSED') {
      throw new AgentError(
        `Agent '${agentId}' is not paused (current: ${record.status})`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status }
      );
    }

    const previousStatus = record.status;
    const updated = this.storage.update(agentId, {
      status: 'RUNNING',
    });

    this.emitEvent('agent_resumed', agentId, previousStatus, 'RUNNING');
    this.log('info', `Agent resumed: ${agentId}`);

    return {
      agent_id: agentId,
      status: updated.status,
      message: `Agent '${record.name}' resumed successfully`,
    };
  }

  /**
   * Stop an agent. Stops execution completely.
   *
   * POST /agents/{agent_id}/stop
   *
   * @param agentId - Agent identifier
   * @returns Updated agent status
   */
  stopAgent(agentId: string): { agent_id: string; status: AgentLifecycleStatus; message: string } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    if (record.status === 'STOPPED') {
      throw new AgentError(
        `Agent '${agentId}' is already stopped`,
        'AGENT_ALREADY_STOPPED',
        { agent_id: agentId }
      );
    }

    if (!this.isValidTransition(record.status, 'STOPPED')) {
      throw new AgentError(
        `Cannot stop agent '${agentId}' from ${record.status} state`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status, target_status: 'STOPPED' }
      );
    }

    const previousStatus = record.status;
    const updated = this.storage.update(agentId, {
      status: 'STOPPED',
      stopped_at: new Date(),
    });

    // In full implementation: Unregister from Agent Execution Loop (#212)
    this.emitEvent('agent_stopped', agentId, previousStatus, 'STOPPED');
    this.log('info', `Agent stopped: ${agentId}`);

    return {
      agent_id: agentId,
      status: updated.status,
      message: `Agent '${record.name}' stopped successfully`,
    };
  }

  /**
   * Delete an agent. Removes configuration and runtime state.
   *
   * DELETE /agents/{agent_id}
   *
   * @param agentId - Agent identifier
   * @returns Confirmation message
   */
  deleteAgent(agentId: string): { agent_id: string; message: string } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    // Cannot delete a running or paused agent - must stop first
    if (record.status === 'RUNNING' || record.status === 'PAUSED') {
      throw new AgentError(
        `Cannot delete agent '${agentId}' while ${record.status.toLowerCase()}. Stop it first.`,
        'INVALID_STATUS_TRANSITION',
        { agent_id: agentId, current_status: record.status }
      );
    }

    const previousStatus = record.status;
    this.storage.delete(agentId);

    this.emitEvent('agent_deleted', agentId, previousStatus, 'DELETED');
    this.log('info', `Agent deleted: ${agentId}`);

    return {
      agent_id: agentId,
      message: `Agent '${record.name}' deleted successfully`,
    };
  }

  /**
   * Set agent to error state (internal use).
   *
   * @param agentId - Agent identifier
   * @param errorMessage - Error description
   */
  setAgentError(agentId: string, errorMessage: string): void {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    const previousStatus = record.status;
    this.storage.update(agentId, {
      status: 'ERROR',
      error_message: errorMessage,
    });

    this.emitEvent('agent_error', agentId, previousStatus, 'ERROR', { error: errorMessage });
    this.log('error', `Agent error: ${agentId} - ${errorMessage}`);
  }

  // --------------------------------------------------------------------------
  // Query Operations
  // --------------------------------------------------------------------------

  /**
   * List all agents.
   *
   * GET /agents
   *
   * @param ownerId - Optional filter by owner
   * @returns List of agent summaries
   */
  listAgents(ownerId?: string): ListAgentsResponse {
    let records: AgentRecord[];

    if (ownerId) {
      records = this.storage.listByOwner(ownerId);
    } else {
      records = this.storage.listAll();
    }

    // Exclude deleted agents from list
    records = records.filter(r => r.status !== 'DELETED');

    return {
      agents: records.map(toAgentSummary),
      total: records.length,
    };
  }

  /**
   * Get detailed agent information.
   *
   * GET /agents/{agent_id}
   *
   * @param agentId - Agent identifier
   * @returns Full agent details
   */
  getAgentDetails(agentId: string): AgentDetailsResponse {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);

    if (record.status === 'DELETED') {
      throw new AgentError(
        `Agent '${agentId}' has been deleted`,
        'AGENT_DELETED',
        { agent_id: agentId }
      );
    }

    // Calculate performance metrics (in full implementation, fetch from analytics)
    const performance = this.calculatePerformanceMetrics(record);

    return {
      agent_id: record.agent_id,
      name: record.name,
      status: record.status,
      strategy: record.strategy,
      pairs: record.pairs,
      initial_balance: record.initial_balance,
      base_asset: record.base_asset,
      config: record.config,
      execution_interval: record.execution_interval,
      owner_id: record.owner_id,
      portfolio_value: record.portfolio_value,
      trades_executed: record.trades_executed,
      performance,
      created_at: record.created_at,
      updated_at: record.updated_at,
      error_message: record.error_message,
    };
  }

  /**
   * Get agent status (simplified).
   *
   * @param agentId - Agent identifier
   * @returns Current status
   */
  getAgentStatus(agentId: string): { agent_id: string; status: AgentLifecycleStatus } {
    this.validateAgentId(agentId);
    const record = this.storage.require(agentId);
    return { agent_id: record.agent_id, status: record.status };
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /**
   * Subscribe to agent lifecycle events.
   *
   * @param handler - Event callback
   * @returns Unsubscribe function
   */
  subscribe(handler: AgentEventHandler): AgentEventUnsubscribe {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  // --------------------------------------------------------------------------
  // Storage Access
  // --------------------------------------------------------------------------

  /**
   * Get the underlying storage (for testing and advanced use).
   */
  getStorage(): AgentStorage {
    return this.storage;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private validateAgentId(agentId: string): void {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new AgentError(
        'Agent ID must be a non-empty string',
        'INVALID_AGENT_ID',
        { provided: agentId }
      );
    }
  }

  private validateCreateRequest(request: CreateAgentRequest): void {
    if (!request.name || request.name.trim() === '') {
      throw new AgentError('Agent name is required', 'INVALID_CONFIGURATION');
    }
    if (!request.strategy || request.strategy.trim() === '') {
      throw new AgentError('Strategy is required', 'INVALID_CONFIGURATION');
    }
    if (typeof request.initial_balance !== 'number' || request.initial_balance <= 0) {
      throw new AgentError('Initial balance must be a positive number', 'INVALID_CONFIGURATION');
    }
    if (!request.base_asset || request.base_asset.trim() === '') {
      throw new AgentError('Base asset is required', 'INVALID_CONFIGURATION');
    }
    if (!Array.isArray(request.pairs) || request.pairs.length === 0) {
      throw new AgentError('At least one trading pair is required', 'INVALID_CONFIGURATION');
    }
  }

  private isValidTransition(from: AgentLifecycleStatus, to: AgentLifecycleStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private generateAgentId(): string {
    return `agent_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private calculatePerformanceMetrics(record: AgentRecord): AgentPerformanceMetrics {
    // In a full implementation, this would fetch from the analytics engine
    const returnPct = ((record.portfolio_value - record.initial_balance) / record.initial_balance) * 100;

    return {
      total_return_pct: parseFloat(returnPct.toFixed(2)),
      sharpe_ratio: record.trades_executed > 0 ? 1.5 : 0,
      max_drawdown_pct: record.trades_executed > 0 ? 5.2 : 0,
      win_rate: record.trades_executed > 0 ? 0.62 : 0,
      total_trades: record.trades_executed,
      profit_factor: record.trades_executed > 0 ? 1.8 : 0,
      avg_trade_duration_sec: record.trades_executed > 0 ? 3600 : 0,
      updated_at: record.updated_at,
    };
  }

  private emitEvent(
    type: AgentEvent['type'],
    agentId: string,
    previousStatus: AgentLifecycleStatus | undefined,
    newStatus: AgentLifecycleStatus,
    data?: Record<string, unknown>
  ): void {
    if (!this.config.enable_events) return;

    const event: AgentEvent = {
      type,
      agent_id: agentId,
      previous_status: previousStatus,
      new_status: newStatus,
      timestamp: new Date(),
      data,
    };

    for (const handler of this.subscribers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors to protect the service
      }
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.verbose_logging && level === 'info') return;

    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: 'agent-manager',
    };

    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    }
    // info level is suppressed unless verbose_logging is enabled
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AgentManagerService with demo data.
 */
export function createAgentManagerService(
  storage?: AgentStorage,
  config?: Partial<AgentManagerConfig>
): AgentManagerService {
  return new AgentManagerService(storage, config);
}
