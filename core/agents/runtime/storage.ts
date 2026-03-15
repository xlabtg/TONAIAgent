/**
 * TONAIAgent - Agent Storage Layer
 *
 * In-memory storage for agent metadata with support for CRUD operations,
 * filtering, and pagination. Can be extended to use persistent storage
 * (PostgreSQL, Redis, etc.) in production.
 *
 * Implements Issue #213: Agent Manager API (Agent Lifecycle Management)
 */

import type {
  AgentRecord,
  AgentLifecycleStatus,
  AgentSummary,
} from './types';

import { AgentError } from './types';

// ============================================================================
// Agent Storage Interface
// ============================================================================

/**
 * Storage interface for agent persistence.
 * Allows swapping in-memory storage with database-backed storage.
 */
export interface AgentStorage {
  /** Create a new agent record */
  create(record: AgentRecord): void;
  /** Update an existing agent record */
  update(agentId: string, patch: Partial<AgentRecord>): AgentRecord;
  /** Find an agent by ID (returns null if not found) */
  find(agentId: string): AgentRecord | null;
  /** Get an agent by ID (throws if not found) */
  require(agentId: string): AgentRecord;
  /** Delete an agent by ID */
  delete(agentId: string): void;
  /** List all agents */
  listAll(): AgentRecord[];
  /** List agents matching a filter */
  listByStatus(status: AgentLifecycleStatus): AgentRecord[];
  /** List agents by owner */
  listByOwner(ownerId: string): AgentRecord[];
  /** Check if an agent exists */
  exists(agentId: string): boolean;
  /** Get total count of agents */
  count(): number;
  /** Clear all agents (for testing) */
  clear(): void;
}

// ============================================================================
// In-Memory Agent Storage
// ============================================================================

/**
 * In-memory storage implementation for agent records.
 * Suitable for development and testing. Use a database-backed
 * implementation for production.
 */
export class InMemoryAgentStorage implements AgentStorage {
  private readonly agents = new Map<string, AgentRecord>();

  // --------------------------------------------------------------------------
  // Mutations
  // --------------------------------------------------------------------------

  /** Create a new agent record */
  create(record: AgentRecord): void {
    if (this.agents.has(record.agent_id)) {
      throw new AgentError(
        `Agent with ID '${record.agent_id}' already exists`,
        'AGENT_ALREADY_EXISTS',
        { agent_id: record.agent_id }
      );
    }
    this.agents.set(record.agent_id, { ...record });
  }

  /** Update an existing agent record */
  update(agentId: string, patch: Partial<AgentRecord>): AgentRecord {
    const existing = this.require(agentId);
    const updated: AgentRecord = {
      ...existing,
      ...patch,
      agent_id: agentId, // Ensure ID cannot be changed
      updated_at: new Date(),
    };
    this.agents.set(agentId, updated);
    return { ...updated };
  }

  /** Delete an agent by ID */
  delete(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new AgentError(
        `Agent '${agentId}' not found`,
        'AGENT_NOT_FOUND',
        { agent_id: agentId }
      );
    }
    this.agents.delete(agentId);
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Find an agent by ID (returns null if not found) */
  find(agentId: string): AgentRecord | null {
    const record = this.agents.get(agentId);
    return record ? { ...record } : null;
  }

  /** Get an agent by ID (throws if not found) */
  require(agentId: string): AgentRecord {
    const record = this.agents.get(agentId);
    if (!record) {
      throw new AgentError(
        `Agent '${agentId}' not found`,
        'AGENT_NOT_FOUND',
        { agent_id: agentId }
      );
    }
    return { ...record };
  }

  /** List all agents */
  listAll(): AgentRecord[] {
    return Array.from(this.agents.values()).map(r => ({ ...r }));
  }

  /** List agents matching a status filter */
  listByStatus(status: AgentLifecycleStatus): AgentRecord[] {
    return this.listAll().filter(r => r.status === status);
  }

  /** List agents by owner */
  listByOwner(ownerId: string): AgentRecord[] {
    return this.listAll().filter(r => r.owner_id === ownerId);
  }

  /** Check if an agent exists */
  exists(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /** Get total count of agents */
  count(): number {
    return this.agents.size;
  }

  /** Clear all agents (for testing) */
  clear(): void {
    this.agents.clear();
  }
}

// ============================================================================
// Projection Helpers
// ============================================================================

/**
 * Convert an AgentRecord to an AgentSummary for list responses.
 */
export function toAgentSummary(record: AgentRecord): AgentSummary {
  return {
    agent_id: record.agent_id,
    name: record.name,
    status: record.status,
    strategy: record.strategy,
    portfolio_value: record.portfolio_value,
    owner_id: record.owner_id,
    created_at: record.created_at,
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new in-memory agent storage instance.
 */
export function createAgentStorage(): AgentStorage {
  return new InMemoryAgentStorage();
}

/**
 * Create an agent storage pre-populated with demo agents.
 */
export function createDemoAgentStorage(): AgentStorage {
  const storage = createAgentStorage();
  const now = new Date();
  const minus1h = new Date(now.getTime() - 3_600_000);
  const minus1d = new Date(now.getTime() - 86_400_000);

  storage.create({
    agent_id: 'agent_001',
    name: 'Momentum Trader',
    strategy: 'momentum',
    status: 'RUNNING',
    initial_balance: 10000,
    base_asset: 'USDT',
    pairs: ['TON/USDT'],
    config: {
      strategy_params: { lookback_period: 20, entry_threshold: 0.03 },
      risk_params: { max_position_size: 0.1, stop_loss: 0.05 },
    },
    execution_interval: '10s',
    owner_id: 'demo_user',
    portfolio_value: 10420,
    trades_executed: 42,
    created_at: minus1d,
    updated_at: minus1h,
    started_at: minus1h,
    stopped_at: null,
    error_message: null,
  });

  storage.create({
    agent_id: 'agent_002',
    name: 'Mean Reversion Bot',
    strategy: 'mean_reversion',
    status: 'PAUSED',
    initial_balance: 5000,
    base_asset: 'USDT',
    pairs: ['TON/USDT', 'NOT/USDT'],
    config: {
      strategy_params: { lookback_period: 14, entry_threshold: 0.02 },
      risk_params: { max_position_size: 0.15, stop_loss: 0.03 },
    },
    execution_interval: '30s',
    owner_id: 'demo_user',
    portfolio_value: 4800,
    trades_executed: 18,
    created_at: minus1d,
    updated_at: minus1h,
    started_at: minus1d,
    stopped_at: null,
    error_message: null,
  });

  storage.create({
    agent_id: 'agent_003',
    name: 'Arbitrage Scanner',
    strategy: 'arbitrage',
    status: 'STOPPED',
    initial_balance: 20000,
    base_asset: 'USDT',
    pairs: ['TON/USDT'],
    config: {
      strategy_params: { entry_threshold: 0.005 },
      risk_params: { max_position_size: 0.2, stop_loss: 0.01 },
    },
    execution_interval: '5s',
    owner_id: 'demo_user',
    portfolio_value: 20150,
    trades_executed: 87,
    created_at: minus1d,
    updated_at: minus1h,
    started_at: minus1d,
    stopped_at: minus1h,
    error_message: null,
  });

  return storage;
}
