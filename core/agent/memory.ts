/**
 * TONAIAgent — Agent Memory Model (Issue #263)
 *
 * Defines the short-term and long-term memory structures used by agents
 * to remember past trades, decisions, and performance patterns.
 *
 * Architecture:
 *   Agent
 *     ↓
 *   AgentMemoryStore  (this module)
 *     ↓
 *   Context Builder  (services/agent-context)
 *     ↓
 *   Decision Engine  (services/agent-decision)
 */

import type { AgentStrategy } from './index';

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Outcome of an executed trade.
 */
export type TradeOutcome = 'profit' | 'loss' | 'neutral';

/**
 * Record of a single executed trade.
 */
export interface Trade {
  /** Unique trade identifier. */
  id: string;
  /** Strategy that generated this trade. */
  strategy: AgentStrategy;
  /** Trade outcome. */
  outcome: TradeOutcome;
  /**
   * PnL of this individual trade (positive = profit, negative = loss).
   * Expressed in the same units as the portfolio balance.
   */
  pnl: number;
  /** ISO timestamp of execution. */
  executedAt: string;
}

/**
 * Record of a single autonomous decision cycle.
 */
export interface Decision {
  /** Strategy that was selected. */
  strategy: AgentStrategy;
  /** Whether execution was allowed by safeguards. */
  executed: boolean;
  /** Human-readable reason for the decision. */
  reason: string;
  /**
   * Confidence score at the time of the decision [0..1].
   * Higher = the agent had strong evidence for this choice.
   */
  confidence: number;
  /** ISO timestamp. */
  decidedAt: string;
}

/**
 * Performance snapshot captured after each cycle.
 */
export interface MetricSnapshot {
  /** Portfolio balance at this point in time. */
  balance: number;
  /** Cumulative PnL since session start. */
  pnl: number;
  /** Current drawdown [0..1]. */
  drawdown: number;
  /** Composite strategy score [0..100]. */
  strategyScore: number;
  /** ISO timestamp. */
  capturedAt: string;
}

// ============================================================================
// Memory Model
// ============================================================================

/**
 * Full agent memory — both short-term (ring buffers) and long-term (aggregated).
 *
 * Matches the issue specification:
 * ```ts
 * type AgentMemory = {
 *   recentTrades: Trade[]
 *   recentDecisions: Decision[]
 *   performanceHistory: MetricSnapshot[]
 * }
 * ```
 */
export interface AgentMemory {
  /** Last N executed trades (short-term). */
  recentTrades: Trade[];
  /** Last N decision-cycle records (short-term). */
  recentDecisions: Decision[];
  /** Performance snapshots over time (long-term pattern store). */
  performanceHistory: MetricSnapshot[];
}

// ============================================================================
// Pattern Detection Results
// ============================================================================

/**
 * Result of lightweight pattern detection over the memory.
 */
export interface PatternDetectionResult {
  /**
   * True when the agent has recorded ≥ `consecutiveLossThreshold` losses in a
   * row — suggesting risk should be reduced.
   */
  consecutiveLosses: boolean;
  /** Number of consecutive losses detected at the tail of recentTrades. */
  consecutiveLossCount: number;
  /**
   * True when the same strategy has repeatedly failed (loss rate > 60%)
   * across its trades — suggesting it should be rotated away from.
   */
  repeatedStrategyFailure: boolean;
  /** Name of the failing strategy, or null if none detected. */
  failingStrategy: AgentStrategy | null;
  /**
   * Winrate across all recent trades [0..1].
   * 0 = all losses, 1 = all wins.
   */
  winRate: number;
}

// ============================================================================
// Memory Store
// ============================================================================

/**
 * Configuration for `AgentMemoryStore`.
 */
export interface AgentMemoryConfig {
  /**
   * Maximum number of trades kept in short-term memory.
   * Oldest entries are evicted when the buffer is full.
   * Default: 50
   */
  maxTrades: number;
  /**
   * Maximum number of decisions kept in short-term memory.
   * Default: 50
   */
  maxDecisions: number;
  /**
   * Maximum number of performance snapshots kept in long-term history.
   * Default: 200
   */
  maxSnapshots: number;
  /**
   * Number of consecutive losses that triggers the pattern flag.
   * Default: 3
   */
  consecutiveLossThreshold: number;
  /**
   * Minimum trades per strategy to evaluate repeatedStrategyFailure.
   * Default: 5
   */
  minTradesForPatternDetection: number;
}

const DEFAULT_MEMORY_CONFIG: AgentMemoryConfig = {
  maxTrades: 50,
  maxDecisions: 50,
  maxSnapshots: 200,
  consecutiveLossThreshold: 3,
  minTradesForPatternDetection: 5,
};

/**
 * Per-agent in-memory store that maintains the AgentMemory ring buffers and
 * exposes pattern-detection helpers used by the Context Builder.
 *
 * Usage:
 * ```ts
 * const store = new AgentMemoryStore();
 * store.recordTrade(agentId, trade);
 * store.recordDecision(agentId, decision);
 * store.recordSnapshot(agentId, snapshot);
 * const memory = store.getMemory(agentId);
 * const patterns = store.detectPatterns(agentId);
 * ```
 */
export class AgentMemoryStore {
  private readonly config: AgentMemoryConfig;
  private readonly memories = new Map<string, AgentMemory>();

  constructor(config: Partial<AgentMemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Write Methods
  // --------------------------------------------------------------------------

  /**
   * Record an executed trade for an agent.
   * Evicts the oldest trade when the ring buffer is full.
   */
  recordTrade(agentId: string, trade: Trade): void {
    const memory = this._getOrCreate(agentId);
    memory.recentTrades.push(trade);
    if (memory.recentTrades.length > this.config.maxTrades) {
      memory.recentTrades.shift();
    }
  }

  /**
   * Record a decision cycle result for an agent.
   * Evicts the oldest decision when the ring buffer is full.
   */
  recordDecision(agentId: string, decision: Decision): void {
    const memory = this._getOrCreate(agentId);
    memory.recentDecisions.push(decision);
    if (memory.recentDecisions.length > this.config.maxDecisions) {
      memory.recentDecisions.shift();
    }
  }

  /**
   * Record a performance snapshot for an agent.
   * Evicts the oldest snapshot when the long-term history is full.
   */
  recordSnapshot(agentId: string, snapshot: MetricSnapshot): void {
    const memory = this._getOrCreate(agentId);
    memory.performanceHistory.push(snapshot);
    if (memory.performanceHistory.length > this.config.maxSnapshots) {
      memory.performanceHistory.shift();
    }
  }

  // --------------------------------------------------------------------------
  // Read Methods
  // --------------------------------------------------------------------------

  /**
   * Return a read-only view of the agent's current memory.
   * Returns an empty memory if the agent has no history yet.
   */
  getMemory(agentId: string): Readonly<AgentMemory> {
    return this._getOrCreate(agentId);
  }

  /**
   * Clear all memory for an agent (e.g. on restart).
   */
  clearMemory(agentId: string): void {
    this.memories.delete(agentId);
  }

  // --------------------------------------------------------------------------
  // Pattern Detection (Step 7)
  // --------------------------------------------------------------------------

  /**
   * Detect lightweight behavioural patterns in the agent's recent trade history.
   *
   * Patterns detected:
   * - 3+ consecutive losses → `consecutiveLosses: true` → reduce risk
   * - strategy loss rate > 60% over recent trades → `repeatedStrategyFailure: true`
   */
  detectPatterns(agentId: string): PatternDetectionResult {
    const memory = this._getOrCreate(agentId);
    const trades = memory.recentTrades;

    // ── Win rate ────────────────────────────────────────────────────────────
    const winRate = trades.length === 0
      ? 0.5 // no data → neutral assumption
      : trades.filter(t => t.outcome === 'profit').length / trades.length;

    // ── Consecutive losses (tail scan) ──────────────────────────────────────
    let consecutiveLossCount = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].outcome === 'loss') {
        consecutiveLossCount++;
      } else {
        break;
      }
    }
    const consecutiveLosses = consecutiveLossCount >= this.config.consecutiveLossThreshold;

    // ── Repeated strategy failure ────────────────────────────────────────────
    let failingStrategy: AgentStrategy | null = null;
    let repeatedStrategyFailure = false;

    if (trades.length >= this.config.minTradesForPatternDetection) {
      // Count losses per strategy
      const strategyLosses = new Map<string, number>();
      const strategyCounts = new Map<string, number>();

      for (const trade of trades) {
        strategyCounts.set(trade.strategy, (strategyCounts.get(trade.strategy) ?? 0) + 1);
        if (trade.outcome === 'loss') {
          strategyLosses.set(trade.strategy, (strategyLosses.get(trade.strategy) ?? 0) + 1);
        }
      }

      for (const [strategy, count] of strategyCounts) {
        if (count >= this.config.minTradesForPatternDetection) {
          const lossRate = (strategyLosses.get(strategy) ?? 0) / count;
          if (lossRate > 0.6) {
            repeatedStrategyFailure = true;
            failingStrategy = strategy;
            break;
          }
        }
      }
    }

    return {
      consecutiveLosses,
      consecutiveLossCount,
      repeatedStrategyFailure,
      failingStrategy,
      winRate,
    };
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private _getOrCreate(agentId: string): AgentMemory {
    if (!this.memories.has(agentId)) {
      this.memories.set(agentId, {
        recentTrades: [],
        recentDecisions: [],
        performanceHistory: [],
      });
    }
    return this.memories.get(agentId)!;
  }
}

// ============================================================================
// Factory helpers
// ============================================================================

/**
 * Create a new AgentMemoryStore with optional custom configuration.
 */
export function createAgentMemoryStore(
  config?: Partial<AgentMemoryConfig>,
): AgentMemoryStore {
  return new AgentMemoryStore(config);
}

/**
 * Create a Trade record.
 */
export function createTrade(
  strategy: AgentStrategy,
  outcome: TradeOutcome,
  pnl: number,
): Trade {
  return {
    id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    strategy,
    outcome,
    pnl,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Create a Decision record.
 */
export function createDecisionRecord(
  strategy: AgentStrategy,
  executed: boolean,
  reason: string,
  confidence: number,
): Decision {
  return {
    strategy,
    executed,
    reason,
    confidence: Math.max(0, Math.min(1, confidence)),
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Create a MetricSnapshot from current agent metrics.
 */
export function createMetricSnapshot(
  balance: number,
  pnl: number,
  drawdown: number,
  strategyScore: number,
): MetricSnapshot {
  return {
    balance,
    pnl,
    drawdown,
    strategyScore,
    capturedAt: new Date().toISOString(),
  };
}
