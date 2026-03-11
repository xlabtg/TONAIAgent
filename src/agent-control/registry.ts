/**
 * TONAIAgent - Agent Control Registry
 *
 * In-memory registry that tracks all known agents and their control states.
 * Provides fast lookups and listing with optional seeding for demo/test data.
 *
 * Implements Issue #185: Agent Control API
 */

import type {
  AgentControlState,
  AgentStatus,
  AgentSummary,
} from './types';

import { AgentControlError } from './types';

// ============================================================================
// Internal Agent Record
// ============================================================================

/** Internal mutable agent record stored in the registry */
export interface AgentRecord {
  id: string;
  name: string;
  status: AgentControlState;
  strategy: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  lastExecutedAt: Date | null;
  tradesExecuted: number;
  errorMessage: string | null;
}

// ============================================================================
// Agent Registry
// ============================================================================

/** Registry of all known agents and their control states */
export class AgentRegistry {
  private readonly agents = new Map<string, AgentRecord>();

  // --------------------------------------------------------------------------
  // Mutations
  // --------------------------------------------------------------------------

  /** Register a new agent. Throws if the ID is already taken. */
  register(record: AgentRecord): void {
    if (this.agents.has(record.id)) {
      throw new AgentControlError(
        `Agent with ID '${record.id}' is already registered`,
        'INVALID_AGENT_ID',
        { agentId: record.id }
      );
    }
    this.agents.set(record.id, { ...record });
  }

  /**
   * Update an existing agent record (partial update).
   * Returns the updated record.
   * Throws AGENT_NOT_FOUND if the ID is unknown.
   */
  update(id: string, patch: Partial<AgentRecord>): AgentRecord {
    const existing = this.require(id);
    const updated: AgentRecord = { ...existing, ...patch, id, updatedAt: new Date() };
    this.agents.set(id, updated);
    return { ...updated };
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Return the full record for an agent or null if not found. */
  find(id: string): AgentRecord | null {
    const record = this.agents.get(id);
    return record ? { ...record } : null;
  }

  /**
   * Return the full record for an agent.
   * Throws AGENT_NOT_FOUND if the ID is unknown.
   */
  require(id: string): AgentRecord {
    const record = this.agents.get(id);
    if (!record) {
      throw new AgentControlError(
        `Agent '${id}' not found`,
        'AGENT_NOT_FOUND',
        { agentId: id }
      );
    }
    return { ...record };
  }

  /** Return all registered agents. */
  listAll(): AgentRecord[] {
    return Array.from(this.agents.values()).map(r => ({ ...r }));
  }

  /** Total number of registered agents. */
  get size(): number {
    return this.agents.size;
  }

  // --------------------------------------------------------------------------
  // Projection Helpers
  // --------------------------------------------------------------------------

  /** Project a record to a lightweight AgentSummary. */
  static toSummary(record: AgentRecord): AgentSummary {
    return {
      id: record.id,
      name: record.name,
      status: record.status,
      strategy: record.strategy,
      ownerId: record.ownerId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /** Project a record to a full AgentStatus. */
  static toStatus(record: AgentRecord): AgentStatus {
    let uptimeSeconds: number | null = null;
    if (record.status === 'running' && record.startedAt) {
      uptimeSeconds = Math.floor((Date.now() - record.startedAt.getTime()) / 1000);
    }

    return {
      id: record.id,
      name: record.name,
      status: record.status,
      strategy: record.strategy,
      ownerId: record.ownerId,
      uptimeSeconds,
      tradesExecuted: record.tradesExecuted,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastExecutedAt: record.lastExecutedAt,
      errorMessage: record.errorMessage,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/** Create an AgentRegistry pre-populated with demo agents. */
export function createDemoRegistry(): AgentRegistry {
  const registry = new AgentRegistry();

  const now = new Date();
  const minus1h = new Date(now.getTime() - 3_600_000);
  const minus3h = new Date(now.getTime() - 10_800_000);
  const minus1d = new Date(now.getTime() - 86_400_000);

  registry.register({
    id: 'agent_001',
    name: 'TON Trend Trader',
    status: 'running',
    strategy: 'trading',
    ownerId: 'demo_user',
    createdAt: minus1d,
    updatedAt: minus1h,
    startedAt: minus3h,
    lastExecutedAt: minus1h,
    tradesExecuted: 42,
    errorMessage: null,
  });

  registry.register({
    id: 'agent_002',
    name: 'Yield Optimizer',
    status: 'stopped',
    strategy: 'yield',
    ownerId: 'demo_user',
    createdAt: minus1d,
    updatedAt: minus1d,
    startedAt: null,
    lastExecutedAt: minus1d,
    tradesExecuted: 15,
    errorMessage: null,
  });

  registry.register({
    id: 'agent_003',
    name: 'Arbitrage Scout',
    status: 'paused',
    strategy: 'arbitrage',
    ownerId: 'demo_user',
    createdAt: minus1d,
    updatedAt: minus3h,
    startedAt: minus3h,
    lastExecutedAt: minus3h,
    tradesExecuted: 8,
    errorMessage: null,
  });

  return registry;
}
