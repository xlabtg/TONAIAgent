/**
 * TONAIAgent — Mini App UI Types (Issue #261)
 *
 * Type definitions for the Telegram Mini App autonomous agent controls:
 *   - Agent goals display
 *   - Mode selector
 *   - Progress bar data
 *   - "Autonomous" toggle
 */

import type { AgentGoal, GoalProgress } from '../../core/agent/goals';
import type { AgentMode } from './index';
import type { AgentStrategy } from '../../core/agent/index';

// ============================================================================
// Mini App State
// ============================================================================

/**
 * Full UI state for an autonomous agent card in the Mini App.
 */
export interface AgentAutonomousUIState {
  /** Agent identifier. */
  agentId: string;
  /** Human-readable agent name. */
  agentName: string;

  // --- Goal section ---
  /** The agent's current goal. */
  goal: AgentGoal;
  /** Live goal progress for the progress bar. */
  goalProgress: GoalProgress;

  // --- Mode selector ---
  /** Currently selected behavior mode. */
  mode: AgentMode;

  // --- Strategy display ---
  /** Currently executing strategy. */
  currentStrategy: AgentStrategy;

  // --- Autonomous toggle ---
  /**
   * Whether the agent is running in autonomous mode.
   * When false, the agent waits for manual triggers.
   */
  autonomousEnabled: boolean;

  // --- Status ---
  /**
   * Whether the agent is actively executing (not paused by safeguards).
   */
  isExecuting: boolean;
  /**
   * Human-readable status message (e.g. reason for pause, current action).
   */
  statusMessage: string;
}

// ============================================================================
// Control Events
// ============================================================================

/**
 * User action: change the agent's behavior mode.
 */
export interface SetModeEvent {
  type: 'set_mode';
  agentId: string;
  mode: AgentMode;
}

/**
 * User action: update the agent's goal.
 */
export interface SetGoalEvent {
  type: 'set_goal';
  agentId: string;
  goal: AgentGoal;
}

/**
 * User action: toggle autonomous execution on/off.
 */
export interface ToggleAutonomousEvent {
  type: 'toggle_autonomous';
  agentId: string;
  enabled: boolean;
}

/** Union of all Mini App control events. */
export type AgentControlEvent = SetModeEvent | SetGoalEvent | ToggleAutonomousEvent;

// ============================================================================
// Progress Bar Helper
// ============================================================================

/**
 * Converts a GoalProgress snapshot to a percentage [0..100] suitable for
 * rendering a progress bar in the Mini App.
 */
export function goalProgressPercent(progress: GoalProgress): number {
  return Math.round(progress.progressToGoal * 100);
}

/**
 * Returns a human-readable label for the current goal.
 */
export function goalLabel(goal: AgentGoal): string {
  switch (goal.type) {
    case 'maximize_profit':
      return goal.target !== undefined
        ? `Maximize profit (target: ${goal.target})`
        : 'Maximize profit';
    case 'minimize_risk':
      return goal.target !== undefined
        ? `Minimize risk (max drawdown: ${(goal.target * 100).toFixed(0)}%)`
        : 'Minimize risk';
    case 'grow_balance':
      return goal.target !== undefined
        ? `Grow balance to ${goal.target}${goal.timeframe ? ` in ${goal.timeframe}` : ''}`
        : 'Grow balance';
  }
}

/**
 * Returns a display label for a behavior mode.
 */
export function modeLabel(mode: AgentMode): string {
  switch (mode) {
    case 'conservative': return 'Conservative 🛡️';
    case 'balanced':     return 'Balanced ⚖️';
    case 'aggressive':   return 'Aggressive 🚀';
  }
}
