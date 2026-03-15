/**
 * TONAIAgent - Agent Lifecycle Manager
 *
 * Manages agent lifecycle operations: start, stop, restart.
 * Validates state transitions and emits events to subscribers.
 *
 * Valid transitions:
 *   stopped  -> running  (start)
 *   running  -> stopped  (stop)
 *   paused   -> stopped  (stop)
 *   error    -> stopped  (stop)
 *   *        -> running  (restart: stop then start)
 *
 * Implements Issue #185: Agent Control API
 */

import type {
  AgentActionResult,
  AgentControlConfig,
  AgentControlEvent,
  AgentControlEventHandler,
  AgentControlState,
  AgentControlUnsubscribe,
  AgentStatus,
  AgentSummary,
  ListAgentsResult,
} from './types';

import { AgentControlError } from './types';
import { AgentRegistry, createDemoRegistry } from './registry';
import type { AgentRecord } from './registry';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_AGENT_CONTROL_CONFIG: AgentControlConfig = {
  enabled: true,
  maxAgents: 1000,
  enableEvents: true,
};

// ============================================================================
// Agent Manager
// ============================================================================

/** Manages agent lifecycle operations and state transitions */
export class AgentManager {
  private readonly config: AgentControlConfig;
  private readonly registry: AgentRegistry;
  private readonly subscribers = new Set<AgentControlEventHandler>();

  constructor(registry?: AgentRegistry, config: Partial<AgentControlConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONTROL_CONFIG, ...config };
    this.registry = registry ?? createDemoRegistry();
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** List all registered agents as summaries. */
  listAgents(): ListAgentsResult {
    const agents = this.registry.listAll().map(r => AgentRegistry.toSummary(r));
    return { agents, total: agents.length };
  }

  /**
   * Get the full status of a single agent.
   * Throws AGENT_NOT_FOUND if the ID is unknown.
   */
  getAgentStatus(agentId: string): AgentStatus {
    this.validateAgentId(agentId);
    const record = this.registry.require(agentId);
    return AgentRegistry.toStatus(record);
  }

  // --------------------------------------------------------------------------
  // Lifecycle Operations
  // --------------------------------------------------------------------------

  /**
   * Start a stopped agent.
   * Throws AGENT_ALREADY_RUNNING if the agent is already running.
   * Throws AGENT_NOT_FOUND if the agent ID is unknown.
   */
  startAgent(agentId: string): AgentActionResult {
    this.validateAgentId(agentId);
    const record = this.registry.require(agentId);

    if (record.status === 'running') {
      throw new AgentControlError(
        `Agent '${agentId}' is already running`,
        'AGENT_ALREADY_RUNNING',
        { agentId, currentStatus: record.status }
      );
    }

    const previousStatus = record.status;
    const updated = this.registry.update(agentId, {
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    });

    this.emit({
      type: 'agent.started',
      agentId,
      previousStatus,
      newStatus: 'running',
      timestamp: updated.updatedAt,
    });

    return {
      agentId,
      status: 'running',
      message: `Agent '${record.name}' started successfully`,
    };
  }

  /**
   * Stop a running or paused agent.
   * Throws AGENT_ALREADY_STOPPED if the agent is already stopped.
   * Throws AGENT_NOT_FOUND if the agent ID is unknown.
   */
  stopAgent(agentId: string): AgentActionResult {
    this.validateAgentId(agentId);
    const record = this.registry.require(agentId);

    if (record.status === 'stopped') {
      throw new AgentControlError(
        `Agent '${agentId}' is already stopped`,
        'AGENT_ALREADY_STOPPED',
        { agentId, currentStatus: record.status }
      );
    }

    const previousStatus = record.status;
    const updated = this.registry.update(agentId, {
      status: 'stopped',
      startedAt: null,
      errorMessage: null,
    });

    this.emit({
      type: 'agent.stopped',
      agentId,
      previousStatus,
      newStatus: 'stopped',
      timestamp: updated.updatedAt,
    });

    return {
      agentId,
      status: 'stopped',
      message: `Agent '${record.name}' stopped successfully`,
    };
  }

  /**
   * Restart an agent (stop then start).
   * Works from any current state.
   * Throws AGENT_NOT_FOUND if the agent ID is unknown.
   */
  restartAgent(agentId: string): AgentActionResult {
    this.validateAgentId(agentId);
    const record = this.registry.require(agentId);

    const previousStatus = record.status;
    const updated = this.registry.update(agentId, {
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    });

    this.emit({
      type: 'agent.restarted',
      agentId,
      previousStatus,
      newStatus: 'running',
      timestamp: updated.updatedAt,
    });

    return {
      agentId,
      status: 'running',
      message: `Agent '${record.name}' restarted successfully`,
    };
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /** Subscribe to agent control events. Returns an unsubscribe function. */
  subscribe(handler: AgentControlEventHandler): AgentControlUnsubscribe {
    this.subscribers.add(handler);
    return () => { this.subscribers.delete(handler); };
  }

  // --------------------------------------------------------------------------
  // Registry Access (for testing / integration)
  // --------------------------------------------------------------------------

  /** Expose the underlying registry (e.g. for seeding in tests). */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private validateAgentId(agentId: string): void {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new AgentControlError(
        'Agent ID must be a non-empty string',
        'INVALID_AGENT_ID',
        { provided: agentId }
      );
    }
  }

  private emit(event: AgentControlEvent): void {
    if (!this.config.enableEvents) return;
    for (const handler of this.subscribers) {
      try {
        handler(event);
      } catch {
        // Subscribers must not crash the manager
      }
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/** Create an AgentManager with the default demo registry. */
export function createAgentManager(
  registry?: AgentRegistry,
  config?: Partial<AgentControlConfig>
): AgentManager {
  return new AgentManager(registry, config);
}
