/**
 * TONAIAgent — Portfolio Coordination Layer (Issue #259)
 *
 * Ensures:
 *  - No conflicting trades across agents (Step 4)
 *  - Shared risk limits enforced portfolio-wide (Step 6)
 *  - Coordinated execution order
 *
 * Architecture:
 *   Agent A trade proposal ─┐
 *   Agent B trade proposal ─┤→ CoordinationLayer.validate()
 *   Agent C trade proposal ─┘         │
 *                                ┌────┴────┐
 *                            approved   rejected (conflict / risk limit)
 */

// ============================================================================
// Types
// ============================================================================

/** A trade proposal submitted by an agent before execution. */
export interface TradeProposal {
  /** Unique proposal identifier. */
  id: string;
  /** Agent submitting this trade. */
  agentId: string;
  /** Strategy of the submitting agent. */
  strategy: string;
  /** Trading pair, e.g. "TON/USDT". */
  pair: string;
  /** Trade direction. */
  side: 'buy' | 'sell';
  /** Notional size in portfolio base currency. */
  notional: number;
  /** Priority: lower number = higher priority. */
  priority: number;
}

/** Result of validating a trade proposal. */
export interface ValidationResult {
  proposalId: string;
  approved: boolean;
  /** Reason for rejection (if not approved). */
  reason?: string;
}

/** Portfolio-wide risk configuration. */
export interface RiskConfig {
  /**
   * Maximum total notional that may be active across ALL agents at once.
   * Protects against over-exposure.
   */
  maxTotalExposure: number;
  /**
   * Maximum notional per trading pair (e.g. "TON/USDT").
   * Prevents concentration in one market.
   */
  maxExposurePerPair: number;
  /**
   * Maximum notional per agent.
   * Acts as a per-strategy risk limit.
   */
  maxExposurePerAgent: number;
  /**
   * If two agents submit opposing sides for the same pair within this window
   * (ms), one will be blocked to prevent wash trading / conflicting trades.
   */
  conflictWindowMs: number;
}

/** A trade that has been approved and is considered active/pending execution. */
interface ActiveTrade {
  proposalId: string;
  agentId: string;
  strategy: string;
  pair: string;
  side: 'buy' | 'sell';
  notional: number;
  approvedAt: number; // epoch ms
}

// ============================================================================
// Coordination Layer
// ============================================================================

const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxTotalExposure: 100_000,
  maxExposurePerPair: 40_000,
  maxExposurePerAgent: 50_000,
  conflictWindowMs: 5_000,
};

export class CoordinationLayer {
  private readonly risk: RiskConfig;
  /** Approved trades not yet cleared. */
  private activeTrades: Map<string, ActiveTrade> = new Map();

  constructor(risk?: Partial<RiskConfig>) {
    this.risk = { ...DEFAULT_RISK_CONFIG, ...risk };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Validate a batch of trade proposals in priority order.
   * Each proposal is checked against:
   *  1. Per-agent exposure limit
   *  2. Per-pair exposure limit
   *  3. Total portfolio exposure limit
   *  4. Conflict detection (opposing side on same pair within conflict window)
   *
   * Approved proposals are added to the active trades registry.
   *
   * @param proposals - trade proposals to validate (will be sorted by priority)
   * @returns per-proposal validation results
   */
  validate(proposals: TradeProposal[]): ValidationResult[] {
    // Process highest-priority trades first (lowest priority number)
    const ordered = [...proposals].sort((a, b) => a.priority - b.priority);
    const results: ValidationResult[] = [];

    for (const proposal of ordered) {
      const result = this.validateOne(proposal);
      results.push(result);
      if (result.approved) {
        this.activeTrades.set(proposal.id, {
          proposalId: proposal.id,
          agentId: proposal.agentId,
          strategy: proposal.strategy,
          pair: proposal.pair,
          side: proposal.side,
          notional: proposal.notional,
          approvedAt: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Mark a trade as completed (clears it from the active registry).
   */
  clearTrade(proposalId: string): void {
    this.activeTrades.delete(proposalId);
  }

  /**
   * Clear all active trades (e.g. on system restart).
   */
  clearAll(): void {
    this.activeTrades.clear();
  }

  /**
   * Return a snapshot of currently active (approved, pending execution) trades.
   */
  getActiveTrades(): ActiveTrade[] {
    return Array.from(this.activeTrades.values());
  }

  /**
   * Compute current portfolio exposure metrics.
   */
  getExposureMetrics(): ExposureMetrics {
    const trades = this.getActiveTrades();
    const totalExposure = trades.reduce((s, t) => s + t.notional, 0);

    const byAgent: Record<string, number> = {};
    const byPair: Record<string, number> = {};

    for (const t of trades) {
      byAgent[t.agentId] = (byAgent[t.agentId] ?? 0) + t.notional;
      byPair[t.pair] = (byPair[t.pair] ?? 0) + t.notional;
    }

    return { totalExposure, byAgent, byPair };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private validateOne(proposal: TradeProposal): ValidationResult {
    // ── 1. Per-agent exposure ──────────────────────────────────────────────
    const agentExposure = this.currentExposureForAgent(proposal.agentId);
    if (agentExposure + proposal.notional > this.risk.maxExposurePerAgent) {
      return {
        proposalId: proposal.id,
        approved: false,
        reason: `Agent ${proposal.agentId} would exceed per-agent exposure limit ` +
                `(current ${agentExposure.toFixed(2)}, limit ${this.risk.maxExposurePerAgent})`,
      };
    }

    // ── 2. Per-pair exposure ───────────────────────────────────────────────
    const pairExposure = this.currentExposureForPair(proposal.pair);
    if (pairExposure + proposal.notional > this.risk.maxExposurePerPair) {
      return {
        proposalId: proposal.id,
        approved: false,
        reason: `Pair ${proposal.pair} would exceed per-pair exposure limit ` +
                `(current ${pairExposure.toFixed(2)}, limit ${this.risk.maxExposurePerPair})`,
      };
    }

    // ── 3. Total portfolio exposure ────────────────────────────────────────
    const totalExposure = this.currentTotalExposure();
    if (totalExposure + proposal.notional > this.risk.maxTotalExposure) {
      return {
        proposalId: proposal.id,
        approved: false,
        reason: `Trade would exceed total portfolio exposure limit ` +
                `(current ${totalExposure.toFixed(2)}, limit ${this.risk.maxTotalExposure})`,
      };
    }

    // ── 4. Conflict detection ──────────────────────────────────────────────
    const conflict = this.detectConflict(proposal);
    if (conflict) {
      return {
        proposalId: proposal.id,
        approved: false,
        reason: `Conflicting trade detected: agent ${conflict.agentId} submitted ` +
                `${conflict.side} on ${conflict.pair} within conflict window`,
      };
    }

    return { proposalId: proposal.id, approved: true };
  }

  private currentExposureForAgent(agentId: string): number {
    let total = 0;
    for (const t of this.activeTrades.values()) {
      if (t.agentId === agentId) total += t.notional;
    }
    return total;
  }

  private currentExposureForPair(pair: string): number {
    let total = 0;
    for (const t of this.activeTrades.values()) {
      if (t.pair === pair) total += t.notional;
    }
    return total;
  }

  private currentTotalExposure(): number {
    let total = 0;
    for (const t of this.activeTrades.values()) {
      total += t.notional;
    }
    return total;
  }

  /**
   * Detect if there is an opposing-side active trade on the same pair from a
   * different agent within the conflict window.
   */
  private detectConflict(proposal: TradeProposal): ActiveTrade | undefined {
    const oppositeSide: 'buy' | 'sell' = proposal.side === 'buy' ? 'sell' : 'buy';
    const windowStart = Date.now() - this.risk.conflictWindowMs;

    for (const t of this.activeTrades.values()) {
      if (
        t.pair === proposal.pair &&
        t.side === oppositeSide &&
        t.agentId !== proposal.agentId &&
        t.approvedAt >= windowStart
      ) {
        return t;
      }
    }
    return undefined;
  }
}

// ============================================================================
// Exposure Metrics Type
// ============================================================================

export interface ExposureMetrics {
  totalExposure: number;
  byAgent: Record<string, number>;
  byPair: Record<string, number>;
}

// ============================================================================
// Factory
// ============================================================================

export function createCoordinationLayer(risk?: Partial<RiskConfig>): CoordinationLayer {
  return new CoordinationLayer(risk);
}
