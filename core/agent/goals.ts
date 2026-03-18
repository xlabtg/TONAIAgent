/**
 * TONAIAgent — Agent Goal Model (Issue #261)
 *
 * Defines goals that drive autonomous agent behaviour.  A goal captures
 * the agent's objective, an optional numeric target, and an optional
 * timeframe within which to achieve it.
 *
 * Architecture:
 *   AgentGoal
 *     ↓
 *   DecisionEngine  (services/agent-decision)
 *     ↓
 *   Strategy selection + params
 *     ↓
 *   Execution
 */

// ============================================================================
// Goal Model
// ============================================================================

/**
 * High-level objective type an agent can pursue.
 *
 * - `maximize_profit`  — grow absolute PnL as fast as possible
 * - `minimize_risk`    — preserve capital; prefer lower-volatility strategies
 * - `grow_balance`     — achieve a target balance (requires `target` field)
 */
export type AgentGoalType = 'maximize_profit' | 'minimize_risk' | 'grow_balance';

/**
 * Goal definition for an autonomous agent.
 *
 * Maps directly to the issue specification:
 * ```ts
 * type AgentGoal = {
 *   type: "maximize_profit" | "minimize_risk" | "grow_balance"
 *   target?: number
 *   timeframe?: string
 * }
 * ```
 */
export interface AgentGoal {
  /** Objective type driving strategy selection. */
  type: AgentGoalType;
  /**
   * Numeric target for the goal.
   * - For `grow_balance`    : desired balance in portfolio units (e.g. USDT).
   * - For `maximize_profit` : optional minimum PnL target.
   * - For `minimize_risk`   : optional maximum drawdown threshold [0..1].
   */
  target?: number;
  /**
   * Human-readable timeframe for the goal, e.g. "7d", "30d", "1y".
   * Used for display and deadline calculations; not enforced by the engine.
   */
  timeframe?: string;
}

// ============================================================================
// Goal Progress
// ============================================================================

/**
 * Snapshot of how far an agent has progressed toward its goal.
 * Surfaced in the UI progress bar and decision engine.
 */
export interface GoalProgress {
  /** The goal being tracked. */
  goal: AgentGoal;
  /**
   * Progress toward the goal expressed as a fraction [0..1].
   * 0 = not started, 1 = fully achieved.
   */
  progressToGoal: number;
  /** Current metric value (e.g. current balance or current PnL). */
  currentValue: number;
  /** ISO timestamp of this snapshot. */
  snapshotAt: string;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an AgentGoal with type, optional target, and optional timeframe.
 */
export function createAgentGoal(
  type: AgentGoalType,
  target?: number,
  timeframe?: string,
): AgentGoal {
  return { type, ...(target !== undefined ? { target } : {}), ...(timeframe !== undefined ? { timeframe } : {}) };
}

/**
 * Compute progress toward a goal given current and initial values.
 *
 * Progress rules:
 * - `grow_balance`    : (current - initial) / (target - initial), clamped [0,1]
 * - `maximize_profit` : currentPnL / target, clamped [0,1] (or 0 if no target)
 * - `minimize_risk`   : 1 − (currentDrawdown / maxDrawdown), clamped [0,1]
 *
 * @param goal         - the agent's goal
 * @param currentValue - current observed metric (balance, PnL, or drawdown)
 * @param initialValue - starting value (used for `grow_balance`)
 */
export function computeGoalProgress(
  goal: AgentGoal,
  currentValue: number,
  initialValue: number,
): GoalProgress {
  let progressToGoal = 0;

  switch (goal.type) {
    case 'grow_balance': {
      if (goal.target !== undefined && goal.target > initialValue) {
        progressToGoal = (currentValue - initialValue) / (goal.target - initialValue);
      } else if (goal.target !== undefined && currentValue >= goal.target) {
        progressToGoal = 1;
      }
      break;
    }
    case 'maximize_profit': {
      if (goal.target !== undefined && goal.target > 0) {
        progressToGoal = currentValue / goal.target;
      } else {
        // No explicit target — treat any positive PnL as partial progress (capped at 1)
        progressToGoal = currentValue > 0 ? Math.min(currentValue / 1, 1) : 0;
      }
      break;
    }
    case 'minimize_risk': {
      // currentValue = current drawdown [0..1]; target = max acceptable drawdown
      const maxDrawdown = goal.target ?? 0.2; // default 20% max drawdown tolerance
      if (currentValue <= 0) {
        progressToGoal = 1; // no drawdown at all — goal fully met
      } else {
        progressToGoal = 1 - Math.min(currentValue / maxDrawdown, 1);
      }
      break;
    }
  }

  return {
    goal,
    progressToGoal: Math.max(0, Math.min(1, progressToGoal)),
    currentValue,
    snapshotAt: new Date().toISOString(),
  };
}
