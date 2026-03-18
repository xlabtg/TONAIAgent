/**
 * TONAIAgent — Mini App UI Types (Issue #261, #263, #265)
 *
 * Type definitions for the Telegram Mini App autonomous agent controls:
 *   - Agent goals display
 *   - Mode selector
 *   - Progress bar data
 *   - "Autonomous" toggle
 *   - Confidence metric display (Issue #263)
 *   - Recent decisions log (Issue #263)
 *   - Memory insights panel (Issue #263)
 *   - Sentiment indicator and signal strength (Issue #265)
 *   - Market mood display (Issue #265)
 */

import type { AgentGoal, GoalProgress } from '../../core/agent/goals';
import type { AgentMode } from './index';
import type { AgentStrategy } from '../../core/agent/index';
import type { TrendState, VolatilityLevel, RecentPerformanceSummary } from '../agent-context/index';
import type { SentimentLevel } from '../signal-aggregator/index';

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

  // --- Memory & Context (Issue #263) ---
  /**
   * Agent confidence score [0..1] derived from memory and context.
   * Displayed as a percentage gauge in the Mini App.
   */
  confidenceScore: number;
  /**
   * Recent decision log entries for the decisions panel.
   */
  recentDecisions: DecisionLogEntry[];
  /**
   * Memory insights for the insights panel.
   */
  memoryInsights: MemoryInsightPanel;

  // --- External Signals & Market Intelligence (Issue #265) ---
  /**
   * Current market sentiment panel for the Mini App.
   * Shows sentiment indicator, market mood, and signal strength.
   */
  marketSignals: MarketSignalPanel;
}

// ============================================================================
// Memory UI Types (Issue #263)
// ============================================================================

/**
 * A single entry in the recent decisions log panel.
 */
export interface DecisionLogEntry {
  /** ISO timestamp. */
  decidedAt: string;
  /** Strategy that was selected. */
  strategy: AgentStrategy;
  /** Whether the decision resulted in execution. */
  executed: boolean;
  /** Short reason string. */
  reason: string;
  /** Confidence score at decision time [0..1]. */
  confidence: number;
}

/**
 * Aggregated memory insights shown in the Mini App insights panel.
 */
export interface MemoryInsightPanel {
  /** Win rate across recent trades [0..1]. */
  winRate: number;
  /** Average PnL per trade. */
  avgPnlPerTrade: number;
  /** Current streak (positive = wins, negative = losses). */
  streak: number;
  /** Current trend direction. */
  trendState: TrendState;
  /** Volatility level. */
  volatilityLevel: VolatilityLevel;
  /** Whether the pattern detector flagged consecutive losses. */
  consecutiveLossAlert: boolean;
  /** Whether a strategy failure pattern was detected. */
  strategyFailureAlert: boolean;
  /** Number of trades recorded in short-term memory. */
  tradeCount: number;
}

// ============================================================================
// Market Signal UI Types (Issue #265)
// ============================================================================

/**
 * Market signal panel displayed in the Mini App.
 *
 * Shows:
 *   - Sentiment indicator (positive / neutral / negative)
 *   - Market mood label (e.g. "Bullish", "Bearish", "Neutral")
 *   - Signal strength [0..100]
 *   - Raw external signal score [-1..+1]
 *   - Number of signal sources contributing
 */
export interface MarketSignalPanel {
  /**
   * Bucketed sentiment level (Issue #265).
   */
  sentimentLevel: SentimentLevel;
  /**
   * Human-readable market mood label.
   */
  marketMood: string;
  /**
   * Signal strength [0..100].
   * Derived from the absolute value of externalSignalScore × 100.
   */
  signalStrength: number;
  /**
   * Raw aggregated external signal score [-1..+1].
   */
  externalSignalScore: number;
  /**
   * Whether external signals are actively influencing decisions.
   * True when |externalSignalScore| > 0.15.
   */
  isSignalActive: boolean;
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

// ============================================================================
// Memory/Context UI Helpers (Issue #263)
// ============================================================================

/**
 * Converts a confidence score [0..1] to a percentage [0..100].
 */
export function confidencePercent(score: number): number {
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}

/**
 * Returns a human-readable label for a confidence score.
 *
 * - 0..33  → Low
 * - 34..66 → Moderate
 * - 67..100 → High
 */
export function confidenceLabel(score: number): string {
  const pct = confidencePercent(score);
  if (pct <= 33) return 'Low';
  if (pct <= 66) return 'Moderate';
  return 'High';
}

/**
 * Returns a human-readable label for a trend state.
 */
export function trendStateLabel(trend: TrendState): string {
  switch (trend) {
    case 'rising':  return 'Rising ↑';
    case 'falling': return 'Falling ↓';
    case 'neutral': return 'Neutral →';
  }
}

/**
 * Returns a human-readable label for a volatility level.
 */
export function volatilityLabel(volatility: VolatilityLevel): string {
  switch (volatility) {
    case 'low':    return 'Low';
    case 'medium': return 'Medium';
    case 'high':   return 'High ⚠️';
  }
}

/**
 * Build a MemoryInsightPanel from context and performance data.
 */
export function buildMemoryInsightPanel(
  performance: RecentPerformanceSummary,
  trendState: TrendState,
  volatilityLevel: VolatilityLevel,
  consecutiveLossAlert: boolean,
  strategyFailureAlert: boolean,
): MemoryInsightPanel {
  return {
    winRate: performance.winRate,
    avgPnlPerTrade: performance.avgPnlPerTrade,
    streak: performance.streak,
    trendState,
    volatilityLevel,
    consecutiveLossAlert,
    strategyFailureAlert,
    tradeCount: performance.tradeCount,
  };
}

// ============================================================================
// Market Signal UI Helpers (Issue #265)
// ============================================================================

/**
 * Returns a human-readable sentiment level label.
 */
export function sentimentLevelLabel(level: SentimentLevel): string {
  switch (level) {
    case 'positive': return 'Positive';
    case 'negative': return 'Negative';
    case 'neutral':  return 'Neutral';
  }
}

/**
 * Returns a market mood label based on the external signal score.
 *
 * Thresholds:
 *   score > +0.5  → "Strongly Bullish"
 *   score > +0.15 → "Bullish"
 *   score < -0.5  → "Strongly Bearish"
 *   score < -0.15 → "Bearish"
 *   otherwise     → "Neutral"
 */
export function marketMoodLabel(externalSignalScore: number): string {
  if (externalSignalScore > 0.5)  return 'Strongly Bullish';
  if (externalSignalScore > 0.15) return 'Bullish';
  if (externalSignalScore < -0.5) return 'Strongly Bearish';
  if (externalSignalScore < -0.15) return 'Bearish';
  return 'Neutral';
}

/**
 * Convert an external signal score [-1, +1] to a signal strength [0..100].
 *
 * Strength is the absolute magnitude of the score, scaled to 100.
 */
export function signalStrengthPercent(externalSignalScore: number): number {
  return Math.round(Math.abs(Math.max(-1, Math.min(1, externalSignalScore))) * 100);
}

/**
 * Build a MarketSignalPanel from aggregated signal data.
 */
export function buildMarketSignalPanel(
  sentimentLevel: SentimentLevel,
  externalSignalScore: number,
): MarketSignalPanel {
  const score = Math.max(-1, Math.min(1, externalSignalScore));
  return {
    sentimentLevel,
    marketMood: marketMoodLabel(score),
    signalStrength: signalStrengthPercent(score),
    externalSignalScore: score,
    isSignalActive: Math.abs(score) > 0.15,
  };
}
