/**
 * TONAIAgent — Agent Abstraction (Issue #259, #261)
 *
 * Core Agent interface used by the Portfolio Allocator to represent a
 * strategy-running agent within the multi-agent system.
 *
 * Architecture:
 *   Agent A (trend) ─┐
 *   Agent B (arb)   ─┤→ Portfolio Allocator → Execution Engine
 *   Agent C (signal)─┘
 *
 * Issue #261 additions:
 *   - AgentGoal, GoalProgress, computeGoalProgress (via core/agent/goals)
 */

// Re-export goal model (Issue #261)
export type { AgentGoal, AgentGoalType, GoalProgress } from './goals';
export { createAgentGoal, computeGoalProgress } from './goals';

// ============================================================================
// Core Agent Interface
// ============================================================================

/**
 * Strategy types that an agent can run.
 */
export type AgentStrategy = 'trend' | 'arbitrage' | 'ai-signal' | string;

/**
 * Lifecycle status of an agent.
 */
export type AgentLifecycleStatus = 'active' | 'paused' | 'stopped';

/**
 * Lightweight agent descriptor used by the Portfolio Allocator.
 *
 * Each field maps directly to the issue specification:
 * - `id`         — unique identifier
 * - `strategy`   — strategy name this agent executes
 * - `allocation` — fraction of total capital assigned [0..1]
 */
export interface Agent {
  /** Unique agent identifier. */
  id: string;
  /** Strategy the agent is running (e.g. "trend", "arbitrage", "ai-signal"). */
  strategy: AgentStrategy;
  /**
   * Fraction of total portfolio capital allocated to this agent.
   * Value in [0..1]; sum of all agents' allocations should equal 1.
   */
  allocation: number;
}

// ============================================================================
// Extended Agent Information
// ============================================================================

/**
 * Extended agent record including performance and risk metadata.
 * Used internally by the Portfolio Allocator and Coordination Layer.
 */
export interface AgentRecord extends Agent {
  /** Human-readable display name. */
  name: string;
  /** Current lifecycle status. */
  status: AgentLifecycleStatus;
  /** Composite performance score [0..100] — higher is better. */
  score: number;
  /**
   * Maximum allowed capital fraction for this agent [0..1].
   * Enforces per-strategy exposure cap.
   */
  maxExposure: number;
  /**
   * Pearson-style correlation coefficient with other strategies [-1..1].
   * Used for basic diversification limits.
   */
  correlationGroup?: string;
  /** ISO timestamp of the last allocation update. */
  lastUpdatedAt: string;
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a minimal Agent descriptor.
 */
export function createAgent(
  id: string,
  strategy: AgentStrategy,
  allocation: number,
): Agent {
  return { id, strategy, allocation };
}

/**
 * Create a full AgentRecord with defaults.
 */
export function createAgentRecord(
  params: Pick<AgentRecord, 'id' | 'strategy' | 'name'> &
    Partial<Omit<AgentRecord, 'id' | 'strategy' | 'name'>>,
): AgentRecord {
  return {
    allocation: 0,
    status: 'active',
    score: 50,
    maxExposure: 0.5,
    lastUpdatedAt: new Date().toISOString(),
    ...params,
  };
}
