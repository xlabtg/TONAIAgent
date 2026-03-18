/**
 * TONAIAgent — Portfolio Allocator Service (Issue #259)
 *
 * Distributes capital across multiple strategy agents based on their
 * composite performance scores.  Higher score → higher allocation.
 *
 * Architecture:
 *   Agent scores (from StrategyOptimizerService)
 *     → PortfolioAllocatorService.allocate()
 *       → updated Agent.allocation values
 *         → allocateCapital(totalBalance)
 *           → per-agent capital amounts
 *
 * Step 2: Portfolio Allocation (score-weighted)
 * Step 3: Capital Distribution (allocateCapital)
 */

import type { Agent, AgentRecord } from '../../core/agent/index';

// ============================================================================
// Types
// ============================================================================

/** Input to the allocator — an agent with its current performance score. */
export interface AgentScoreInput {
  /** Agent identifier. */
  agentId: string;
  /** Strategy name. */
  strategy: string;
  /**
   * Composite performance score [0..100].
   * Typically sourced from StrategyOptimizerService.getConfig(strategy).score
   */
  score: number;
  /**
   * Hard cap: the maximum fraction of the portfolio this agent may receive [0..1].
   * Defaults to 0.5 if not provided.
   */
  maxExposure?: number;
}

/** Result of a single agent's allocation. */
export interface AgentAllocation {
  agentId: string;
  strategy: string;
  /** Score used for weighting. */
  score: number;
  /** Fraction of total portfolio [0..1]. */
  allocationFraction: number;
  /** Absolute capital amount in the same units as `totalBalance`. */
  capitalAmount: number;
}

/** Full output of one allocation cycle. */
export interface AllocationResult {
  /** ISO timestamp of this allocation run. */
  allocatedAt: string;
  /** Total capital distributed. */
  totalBalance: number;
  /** Per-agent breakdown. */
  allocations: AgentAllocation[];
  /** Unallocated remainder (due to caps or rounding). */
  unallocated: number;
}

// ============================================================================
// Portfolio Allocator Service
// ============================================================================

export class PortfolioAllocatorService {
  /** Minimum allocation fraction any active agent receives [0..1]. */
  private readonly minFraction: number;
  /** Default maximum exposure per agent if not provided in input. */
  private readonly defaultMaxExposure: number;

  constructor(options?: { minFraction?: number; defaultMaxExposure?: number }) {
    this.minFraction = options?.minFraction ?? 0.05;
    this.defaultMaxExposure = options?.defaultMaxExposure ?? 0.5;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Compute score-weighted allocations for a set of agents.
   *
   * Algorithm:
   *  1. Each agent receives a raw weight = max(0, score).
   *  2. Weights are normalised to sum to 1.
   *  3. Each allocation is clamped to [minFraction, maxExposure].
   *  4. After clamping, fractions are re-normalised so they sum to ≤1.
   *
   * @param agents - agents with their performance scores
   * @param totalBalance - total capital to distribute
   * @returns allocation fractions and capital amounts
   */
  allocate(agents: AgentScoreInput[], totalBalance: number): AllocationResult {
    if (agents.length === 0 || totalBalance <= 0) {
      return {
        allocatedAt: new Date().toISOString(),
        totalBalance,
        allocations: [],
        unallocated: totalBalance,
      };
    }

    // Step 1 — raw weights from scores (floor at 0)
    const weights = agents.map(a => Math.max(0, a.score));
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    // Step 2 — initial score-proportional fractions (equal if all scores are 0)
    const initial: number[] =
      totalWeight === 0
        ? agents.map(() => 1 / agents.length)
        : weights.map(w => w / totalWeight);

    const maxExposures = agents.map(a => a.maxExposure ?? this.defaultMaxExposure);
    const minFrac = this.minFraction;

    // Step 3 — Cap-preserving iterative allocation.
    //
    // Iterate: cap agents that exceed their maxExposure, then redistribute the
    // surplus proportionally among agents that still have room below their cap.
    // Any surplus that cannot be redistributed becomes `unallocated`.
    let fractions = [...initial];

    for (let iter = 0; iter < agents.length + 1; iter++) {
      let surplus = 0;
      const atCap: boolean[] = agents.map((_, i) => fractions[i]! >= maxExposures[i]!);

      for (let i = 0; i < agents.length; i++) {
        if (fractions[i]! > maxExposures[i]!) {
          surplus += fractions[i]! - maxExposures[i]!;
          fractions[i] = maxExposures[i]!;
        }
      }

      if (surplus < 1e-12) break;

      // Redistribute only to agents that have capacity below their cap
      let uncappedWeight = 0;
      for (let i = 0; i < agents.length; i++) {
        if (!atCap[i]) uncappedWeight += fractions[i]!;
      }

      if (uncappedWeight < 1e-12) break; // all agents at cap; surplus → unallocated

      for (let i = 0; i < agents.length; i++) {
        if (!atCap[i]) {
          const extra = surplus * (fractions[i]! / uncappedWeight);
          // Only add as much as the agent's remaining capacity allows
          const room = maxExposures[i]! - fractions[i]!;
          fractions[i] = fractions[i]! + Math.min(extra, room);
        }
      }
    }

    // Step 4 — Apply minFraction floor (may cause sum > 1; absorbed proportionally)
    for (let i = 0; i < agents.length; i++) {
      const lo = Math.min(minFrac, maxExposures[i]!);
      if (fractions[i]! < lo) fractions[i] = lo;
    }

    const normalised = fractions;

    // Build result
    let allocated = 0;
    const allocations: AgentAllocation[] = agents.map((agent, i) => {
      const fraction = normalised[i] ?? 0;
      const capital = fraction * totalBalance;
      allocated += capital;
      return {
        agentId: agent.agentId,
        strategy: agent.strategy,
        score: agent.score,
        allocationFraction: fraction,
        capitalAmount: capital,
      };
    });

    return {
      allocatedAt: new Date().toISOString(),
      totalBalance,
      allocations,
      unallocated: Math.max(0, totalBalance - allocated),
    };
  }

  /**
   * Convenience wrapper that converts AgentRecord[] to AgentScoreInput[] and
   * calls allocate(), then returns updated Agent descriptors.
   *
   * @param agentRecords - full agent records (must have `score` and `maxExposure`)
   * @param totalBalance - total capital
   */
  allocateCapital(agentRecords: AgentRecord[], totalBalance: number): {
    result: AllocationResult;
    agents: Agent[];
  } {
    const inputs: AgentScoreInput[] = agentRecords
      .filter(a => a.status === 'active')
      .map(a => ({
        agentId: a.id,
        strategy: a.strategy,
        score: a.score,
        maxExposure: a.maxExposure,
      }));

    const result = this.allocate(inputs, totalBalance);

    // Merge allocation fractions back to Agent descriptors
    const fractionById = new Map(
      result.allocations.map(a => [a.agentId, a.allocationFraction]),
    );

    const agents: Agent[] = agentRecords.map(a => ({
      id: a.id,
      strategy: a.strategy,
      allocation: fractionById.get(a.id) ?? 0,
    }));

    return { result, agents };
  }
}

// ============================================================================
// Singleton / factory
// ============================================================================

export const portfolioAllocatorService = new PortfolioAllocatorService();
export default portfolioAllocatorService;
