/**
 * TONAIAgent - On-Chain Registry
 *
 * Tracks all deployed agents with their metadata:
 * - Agent address, strategy hash, risk score
 * - Performance metrics, owner, status
 * - Audit trail, Telegram user mapping
 * - Registry queries and updates
 */

import {
  AgentRegistryEntry,
  AgentPerformanceMetrics,
  AuditEntry,
  RegistryQueryFilter,
  TelegramWalletMapping,
  ContractEvent,
  AgentStatus,
  TonAddress,
  AgentId,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function defaultPerformanceMetrics(): AgentPerformanceMetrics {
  return {
    totalPnl: BigInt(0),
    totalVolume: BigInt(0),
    strategiesExecuted: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdownBps: 0,
    return30dBps: 0,
  };
}

function generateStrategyHash(params: Record<string, unknown>): string {
  // Simplified hash: in production uses keccak256(abi.encode(params))
  const str = JSON.stringify(params);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
}

// ============================================================================
// Agent Registry
// ============================================================================

/**
 * On-chain registry for agents.
 * Simulates what would be stored in a TON smart contract.
 */
export class AgentRegistry {
  private readonly entries: Map<AgentId, AgentRegistryEntry> = new Map();
  private readonly ownerIndex: Map<TonAddress, AgentId[]> = new Map();
  private readonly telegramMappings: Map<string, TelegramWalletMapping> = new Map();
  private readonly contractEvents: ContractEvent[] = [];
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private entryCounter = 0;

  /**
   * Register a new agent in the registry.
   */
  registerAgent(
    agentId: AgentId,
    ownerAddress: TonAddress,
    contractAddress: TonAddress,
    strategyParams: Record<string, unknown> = {},
    options: {
      telegramUserId?: string;
      tags?: string[];
      version?: string;
    } = {}
  ): AgentRegistryEntry {
    if (this.entries.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }

    this.entryCounter++;
    const strategyHash = generateStrategyHash(strategyParams);

    const entry: AgentRegistryEntry = {
      agentId,
      ownerAddress,
      contractAddress,
      strategyHash,
      riskScore: 100, // Default: low risk (100/1000)
      performance: defaultPerformanceMetrics(),
      status: 'active',
      version: options.version ?? '1.0.0',
      telegramUserId: options.telegramUserId,
      registeredAt: new Date(),
      updatedAt: new Date(),
      auditTrail: [
        {
          entryId: `audit_${Date.now()}_${this.entryCounter}`,
          action: 'agent.registered',
          actor: ownerAddress,
          details: { strategyHash, contractAddress },
          timestamp: new Date(),
        },
      ],
      tags: options.tags ?? [],
    };

    this.entries.set(agentId, entry);

    // Update owner index
    const ownerAgents = this.ownerIndex.get(ownerAddress) ?? [];
    ownerAgents.push(agentId);
    this.ownerIndex.set(ownerAddress, ownerAgents);

    this.emitEvent({
      type: 'registry.updated',
      timestamp: new Date(),
      agentId,
      data: { action: 'registered', contractAddress, ownerAddress },
    });

    return entry;
  }

  /**
   * Update agent status.
   */
  updateStatus(agentId: AgentId, status: AgentStatus, actor: TonAddress): void {
    const entry = this.requireEntry(agentId);
    const previousStatus = entry.status;
    entry.status = status;
    entry.updatedAt = new Date();

    entry.auditTrail.push({
      entryId: `audit_${Date.now()}_${++this.entryCounter}`,
      action: 'status.updated',
      actor,
      details: { previousStatus, newStatus: status },
      timestamp: new Date(),
    });

    this.entries.set(agentId, entry);
    this.emitRegistryUpdate(agentId, 'status.updated');
  }

  /**
   * Update agent performance metrics.
   */
  updatePerformance(
    agentId: AgentId,
    updates: Partial<AgentPerformanceMetrics>
  ): void {
    const entry = this.requireEntry(agentId);

    entry.performance = {
      ...entry.performance,
      ...updates,
    };
    entry.updatedAt = new Date();

    this.entries.set(agentId, entry);
    this.emitRegistryUpdate(agentId, 'performance.updated');
  }

  /**
   * Update agent risk score.
   */
  updateRiskScore(agentId: AgentId, riskScore: number, actor: TonAddress): void {
    if (riskScore < 0 || riskScore > 1000) {
      throw new Error(`Risk score must be between 0 and 1000, got ${riskScore}`);
    }

    const entry = this.requireEntry(agentId);
    const previousScore = entry.riskScore;
    entry.riskScore = riskScore;
    entry.updatedAt = new Date();

    entry.auditTrail.push({
      entryId: `audit_${Date.now()}_${++this.entryCounter}`,
      action: 'risk.updated',
      actor,
      details: { previousScore, newScore: riskScore },
      timestamp: new Date(),
    });

    this.entries.set(agentId, entry);
    this.emitRegistryUpdate(agentId, 'risk.updated');
  }

  /**
   * Add an audit trail entry.
   */
  addAuditEntry(
    agentId: AgentId,
    action: string,
    actor: TonAddress,
    details: Record<string, unknown>,
    txHash?: string
  ): AuditEntry {
    const entry = this.requireEntry(agentId);

    const auditEntry: AuditEntry = {
      entryId: `audit_${Date.now()}_${++this.entryCounter}`,
      action,
      actor,
      details,
      timestamp: new Date(),
      txHash,
    };

    entry.auditTrail.push(auditEntry);
    entry.updatedAt = new Date();
    this.entries.set(agentId, entry);

    return auditEntry;
  }

  /**
   * Update strategy hash (when strategy params change).
   */
  updateStrategyHash(
    agentId: AgentId,
    newParams: Record<string, unknown>,
    actor: TonAddress
  ): void {
    const entry = this.requireEntry(agentId);
    const newHash = generateStrategyHash(newParams);
    const previousHash = entry.strategyHash;
    entry.strategyHash = newHash;
    entry.updatedAt = new Date();

    entry.auditTrail.push({
      entryId: `audit_${Date.now()}_${++this.entryCounter}`,
      action: 'strategy.updated',
      actor,
      details: { previousHash, newHash },
      timestamp: new Date(),
    });

    this.entries.set(agentId, entry);
    this.emitRegistryUpdate(agentId, 'strategy.updated');
  }

  // ============================================================================
  // Telegram User Mapping
  // ============================================================================

  /**
   * Map a Telegram user to their TON wallet and agents.
   */
  mapTelegramUser(
    telegramUserId: string,
    walletAddress: TonAddress,
    agentId?: AgentId
  ): TelegramWalletMapping {
    const existing = this.telegramMappings.get(telegramUserId);

    if (existing) {
      // Update existing mapping
      if (agentId && !existing.agentIds.includes(agentId)) {
        existing.agentIds.push(agentId);
      }
      existing.lastActiveAt = new Date();
      this.telegramMappings.set(telegramUserId, existing);
      return existing;
    }

    const mapping: TelegramWalletMapping = {
      telegramUserId,
      walletAddress,
      agentIds: agentId ? [agentId] : [],
      registeredAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.telegramMappings.set(telegramUserId, mapping);
    return mapping;
  }

  getTelegramMapping(telegramUserId: string): TelegramWalletMapping | undefined {
    return this.telegramMappings.get(telegramUserId);
  }

  getAgentsByTelegramUser(telegramUserId: string): AgentRegistryEntry[] {
    const mapping = this.telegramMappings.get(telegramUserId);
    if (!mapping) return [];

    return mapping.agentIds
      .map((id) => this.entries.get(id))
      .filter(Boolean) as AgentRegistryEntry[];
  }

  updateTelegramActivity(telegramUserId: string): void {
    const mapping = this.telegramMappings.get(telegramUserId);
    if (mapping) {
      mapping.lastActiveAt = new Date();
      this.telegramMappings.set(telegramUserId, mapping);
    }
  }

  // ============================================================================
  // Contract Event Tracking
  // ============================================================================

  /**
   * Record a contract event for monitoring.
   */
  recordContractEvent(event: ContractEvent): void {
    this.contractEvents.push(event);

    // Update registry entry if event is for a known agent
    const entry = Array.from(this.entries.values()).find(
      (e) => e.contractAddress === event.contractAddress
    );

    if (entry) {
      this.addAuditEntry(
        entry.agentId,
        `contract.event.${event.type}`,
        event.contractAddress,
        event.data,
        event.txHash
      );
    }
  }

  getContractEvents(
    contractAddress?: TonAddress,
    limit = 100
  ): ContractEvent[] {
    let events = this.contractEvents;

    if (contractAddress) {
      events = events.filter((e) => e.contractAddress === contractAddress);
    }

    return events.slice(-limit);
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getAgent(agentId: AgentId): AgentRegistryEntry | undefined {
    return this.entries.get(agentId);
  }

  getAllAgents(): AgentRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getAgentsByOwner(ownerAddress: TonAddress): AgentRegistryEntry[] {
    const agentIds = this.ownerIndex.get(ownerAddress) ?? [];
    return agentIds.map((id) => this.entries.get(id)).filter(Boolean) as AgentRegistryEntry[];
  }

  /**
   * Query agents with filters.
   */
  queryAgents(filter: RegistryQueryFilter): AgentRegistryEntry[] {
    let results = Array.from(this.entries.values());

    if (filter.ownerAddress) {
      results = results.filter((e) => e.ownerAddress === filter.ownerAddress);
    }

    if (filter.status) {
      results = results.filter((e) => e.status === filter.status);
    }

    if (filter.maxRiskScore !== undefined) {
      results = results.filter((e) => e.riskScore <= filter.maxRiskScore!);
    }

    if (filter.minWinRate !== undefined) {
      results = results.filter((e) => e.performance.winRate >= filter.minWinRate!);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((e) =>
        filter.tags!.some((tag) => e.tags.includes(tag))
      );
    }

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get top performing agents sorted by total PnL.
   */
  getTopPerformers(limit = 10): AgentRegistryEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.status === 'active')
      .sort((a, b) => {
        const pnlDiff = b.performance.totalPnl - a.performance.totalPnl;
        return pnlDiff > BigInt(0) ? 1 : pnlDiff < BigInt(0) ? -1 : 0;
      })
      .slice(0, limit);
  }

  getAuditTrail(agentId: AgentId): AuditEntry[] {
    const entry = this.entries.get(agentId);
    return entry?.auditTrail ?? [];
  }

  getTotalRegistered(): number {
    return this.entries.size;
  }

  getActiveCount(): number {
    return Array.from(this.entries.values()).filter((e) => e.status === 'active').length;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitRegistryUpdate(agentId: AgentId, action: string): void {
    this.emitEvent({
      type: 'registry.updated',
      timestamp: new Date(),
      agentId,
      data: { action },
    });
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

  private requireEntry(agentId: AgentId): AgentRegistryEntry {
    const entry = this.entries.get(agentId);
    if (!entry) {
      throw new Error(`Agent ${agentId} not found in registry`);
    }
    return entry;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgentRegistry(): AgentRegistry {
  return new AgentRegistry();
}

export default AgentRegistry;
