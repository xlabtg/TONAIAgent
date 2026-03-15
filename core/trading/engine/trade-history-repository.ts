/**
 * TONAIAgent - Trade History Repository
 *
 * In-memory store for trade records.
 * For the MVP, trade history is stored in process memory.
 * In production, this would be replaced with a MySQL-backed implementation.
 *
 * The repository enforces a configurable maximum records limit per agent
 * and provides query methods by agent ID.
 */

import type {
  TradeRecord,
  TradeHistoryRepositoryInterface,
} from './types';

// ============================================================================
// Trade History Repository
// ============================================================================

/**
 * DefaultTradeHistoryRepository stores trade records in memory.
 *
 * Records are sorted newest-first per agent (most recent prepended).
 * Oldest records beyond the per-agent cap are automatically dropped.
 *
 * @example
 * ```typescript
 * const repo = createTradeHistoryRepository(100);
 *
 * repo.save(tradeRecord);
 *
 * const history = repo.getByAgent('agent-001');
 * console.log(history[0]); // most recent trade
 * ```
 */
export class DefaultTradeHistoryRepository implements TradeHistoryRepositoryInterface {
  /** Per-agent trade records, newest first */
  private readonly tradesByAgent = new Map<string, TradeRecord[]>();
  /** All trades in insertion order */
  private readonly allTrades: TradeRecord[] = [];

  constructor(private readonly maxPerAgent: number = 1000) {}

  /**
   * Persist a trade record.
   * Records are prepended so index 0 is always the newest trade.
   *
   * @param trade - The trade record to persist
   */
  save(trade: TradeRecord): void {
    // Append to global list
    this.allTrades.push(trade);

    // Prepend to per-agent list
    if (!this.tradesByAgent.has(trade.agentId)) {
      this.tradesByAgent.set(trade.agentId, []);
    }
    const agentTrades = this.tradesByAgent.get(trade.agentId)!;
    agentTrades.unshift(trade);

    // Enforce max per-agent limit
    if (agentTrades.length > this.maxPerAgent) {
      agentTrades.splice(this.maxPerAgent);
    }
  }

  /**
   * Retrieve trade history for a specific agent.
   * Returns records newest-first.
   *
   * @param agentId - Unique agent identifier
   * @param limit - Maximum number of records to return (default: all)
   */
  getByAgent(agentId: string, limit?: number): TradeRecord[] {
    const trades = this.tradesByAgent.get(agentId) ?? [];
    if (limit !== undefined && limit > 0) {
      return trades.slice(0, limit);
    }
    return [...trades];
  }

  /**
   * Retrieve all trade records across all agents.
   * Returns records in insertion order (oldest first).
   *
   * @param limit - Maximum number of records to return (default: all)
   */
  getAll(limit?: number): TradeRecord[] {
    if (limit !== undefined && limit > 0) {
      return this.allTrades.slice(-limit);
    }
    return [...this.allTrades];
  }

  /**
   * Count the number of trades for a specific agent.
   *
   * @param agentId - Unique agent identifier
   */
  countByAgent(agentId: string): number {
    return this.tradesByAgent.get(agentId)?.length ?? 0;
  }

  /**
   * List all agent IDs that have trade records.
   */
  listAgentIds(): string[] {
    return Array.from(this.tradesByAgent.keys());
  }

  /**
   * Get the total number of trade records across all agents.
   */
  totalCount(): number {
    return this.allTrades.length;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Trade History Repository.
 *
 * @param maxPerAgent - Maximum records per agent (default: 1000)
 *
 * @example
 * ```typescript
 * const repo = createTradeHistoryRepository(500);
 * ```
 */
export function createTradeHistoryRepository(maxPerAgent = 1000): DefaultTradeHistoryRepository {
  return new DefaultTradeHistoryRepository(maxPerAgent);
}
