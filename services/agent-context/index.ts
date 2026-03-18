/**
 * TONAIAgent — Agent Context Builder (Issue #263)
 *
 * Builds a rich context object from current agent metrics and memory,
 * which is then consumed by the Decision Engine to make memory-aware,
 * context-sensitive trading decisions.
 *
 * Architecture:
 *   AgentMemory + AgentMetrics
 *     ↓
 *   AgentContextBuilder  (this module)
 *     ↓
 *   AgentContext  { trendState, recentPerformance, volatilityLevel, confidenceScore }
 *     ↓
 *   Decision Engine  (services/agent-decision)
 *
 * Matches the issue specification:
 * ```ts
 * {
 *   trendState
 *   recentPerformance
 *   volatilityLevel
 *   confidenceScore
 * }
 * ```
 */

import type { AgentMemory, PatternDetectionResult } from '../../core/agent/memory';
import type { AgentMetrics } from '../agent-decision/index';

// ============================================================================
// Context Types
// ============================================================================

/**
 * Trend direction derived from recent performance history.
 *
 * - `rising`  — balance/PnL trending upward over recent snapshots
 * - `falling` — balance/PnL trending downward
 * - `neutral` — no clear trend (or insufficient data)
 */
export type TrendState = 'rising' | 'falling' | 'neutral';

/**
 * Bucketed volatility level derived from recent trade PnL variance.
 *
 * - `low`    — small, consistent moves
 * - `medium` — moderate fluctuations
 * - `high`   — large swings, increased risk
 */
export type VolatilityLevel = 'low' | 'medium' | 'high';

/**
 * Context object built from memory and current metrics.
 *
 * Consumed by `AgentDecisionEngine.decide()` to produce memory-aware decisions.
 */
export interface AgentContext {
  /**
   * Current trend in portfolio PnL/balance based on the last N snapshots.
   */
  trendState: TrendState;
  /**
   * Recent performance summary (win rate, average PnL per trade).
   */
  recentPerformance: RecentPerformanceSummary;
  /**
   * Volatility level based on PnL variance in recent trades.
   */
  volatilityLevel: VolatilityLevel;
  /**
   * Agent confidence score [0..1].
   *
   * Computed as:
   *   confidence = f(winRate, recentStreak, volatility)
   *
   * Specifically:
   *   - winRate contributes 50% of the score
   *   - streak bonus (positive) / penalty (negative) contributes 30%
   *   - volatility penalty contributes the remaining 20%
   *     (low = no penalty, medium = -0.1, high = -0.2)
   */
  confidenceScore: number;
  /**
   * Pattern detection results from memory scan.
   */
  patterns: PatternDetectionResult;
  /** ISO timestamp when this context was built. */
  builtAt: string;
}

/**
 * Summary of recent trading performance.
 */
export interface RecentPerformanceSummary {
  /** Win rate across recent trades [0..1]. */
  winRate: number;
  /** Average PnL per trade (can be negative). */
  avgPnlPerTrade: number;
  /** Total trades recorded in short-term memory. */
  tradeCount: number;
  /**
   * Length and direction of the current streak.
   * Positive = consecutive wins; negative = consecutive losses.
   */
  streak: number;
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Builds an `AgentContext` from current metrics and agent memory.
 *
 * Usage:
 * ```ts
 * const builder = new AgentContextBuilder();
 * const context = builder.build(memory, patterns, metrics);
 * ```
 */
export class AgentContextBuilder {
  /**
   * Number of recent performance snapshots to inspect when computing trend.
   * Default: 10
   */
  private readonly trendWindow: number;

  constructor(options?: { trendWindow?: number }) {
    this.trendWindow = options?.trendWindow ?? 10;
  }

  /**
   * Build a complete AgentContext from memory and live metrics.
   *
   * @param memory   - the agent's current memory (from AgentMemoryStore)
   * @param patterns - pre-computed pattern detection result
   * @param metrics  - live metrics snapshot from the current cycle
   */
  build(
    memory: Readonly<AgentMemory>,
    patterns: PatternDetectionResult,
    metrics: AgentMetrics,
  ): AgentContext {
    const recentPerformance = this._buildPerformanceSummary(memory, patterns);
    const trendState = this._computeTrend(memory, metrics);
    const volatilityLevel = this._computeVolatility(memory);
    const confidenceScore = this._computeConfidence(recentPerformance, volatilityLevel, metrics);

    return {
      trendState,
      recentPerformance,
      volatilityLevel,
      confidenceScore,
      patterns,
      builtAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Trend State (Step 4 sub-component)
  // --------------------------------------------------------------------------

  /**
   * Derive trend from the last `trendWindow` performance snapshots.
   *
   * Uses a simple linear-regression slope sign:
   *   rising  → slope > 0 by more than a small epsilon
   *   falling → slope < 0 by more than a small epsilon
   *   neutral → near-zero slope or too few data points
   */
  private _computeTrend(memory: Readonly<AgentMemory>, metrics: AgentMetrics): TrendState {
    const history = memory.performanceHistory;

    // Need at least 2 snapshots for a meaningful trend
    if (history.length < 2) {
      // Fall back to single-snapshot vs current balance comparison
      if (history.length === 1) {
        const diff = metrics.currentBalance - history[0].balance;
        if (diff > metrics.initialBalance * 0.005) return 'rising';
        if (diff < -(metrics.initialBalance * 0.005)) return 'falling';
      }
      return 'neutral';
    }

    // Use the most recent `trendWindow` snapshots
    const window = history.slice(-this.trendWindow);
    const n = window.length;

    // Simple linear regression on balance values
    const xMean = (n - 1) / 2;
    const yMean = window.reduce((s, snap) => s + snap.balance, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (window[i].balance - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;

    // Epsilon = 0.1% of initial balance per snapshot
    const epsilon = metrics.initialBalance * 0.001;
    if (slope > epsilon) return 'rising';
    if (slope < -epsilon) return 'falling';
    return 'neutral';
  }

  // --------------------------------------------------------------------------
  // Volatility (based on PnL variance)
  // --------------------------------------------------------------------------

  /**
   * Compute volatility from variance of recent trade PnL values.
   *
   * Bucketing thresholds (as fraction of average |pnl|):
   *   CV < 0.5  → low
   *   CV < 1.5  → medium
   *   otherwise → high
   *
   * Where CV = stddev / mean(|pnl|)
   */
  private _computeVolatility(memory: Readonly<AgentMemory>): VolatilityLevel {
    const trades = memory.recentTrades;
    if (trades.length < 2) return 'low';

    const pnls = trades.map(t => t.pnl);
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length;
    const stddev = Math.sqrt(variance);

    const absMean = Math.abs(mean);
    if (absMean < 1e-9) {
      // All PnL near zero — low volatility
      return stddev < 1 ? 'low' : 'medium';
    }

    const cv = stddev / absMean;
    if (cv < 0.5) return 'low';
    if (cv < 1.5) return 'medium';
    return 'high';
  }

  // --------------------------------------------------------------------------
  // Recent Performance Summary
  // --------------------------------------------------------------------------

  private _buildPerformanceSummary(
    memory: Readonly<AgentMemory>,
    patterns: PatternDetectionResult,
  ): RecentPerformanceSummary {
    const trades = memory.recentTrades;

    if (trades.length === 0) {
      return { winRate: 0.5, avgPnlPerTrade: 0, tradeCount: 0, streak: 0 };
    }

    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const avgPnlPerTrade = totalPnl / trades.length;

    // Streak: positive = consecutive wins at tail, negative = consecutive losses
    const streak = patterns.consecutiveLosses
      ? -patterns.consecutiveLossCount
      : this._computeWinStreak(trades);

    return {
      winRate: patterns.winRate,
      avgPnlPerTrade,
      tradeCount: trades.length,
      streak,
    };
  }

  /**
   * Count consecutive wins at the tail of the trades array.
   * Returns 0 if the last trade was not a win.
   */
  private _computeWinStreak(trades: readonly { outcome: string }[]): number {
    let streak = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].outcome === 'profit') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // --------------------------------------------------------------------------
  // Confidence Score (Step 8)
  // --------------------------------------------------------------------------

  /**
   * Compute the agent confidence score [0..1].
   *
   * Formula (Issue #263, Step 8):
   *   confidence = f(winRate, recent streak, volatility)
   *
   * Components:
   *   winRateComponent    = winRate                       [0..1] × 0.50 weight
   *   streakBonus         = clamp(streak / 10, -0.3, 0.3) × 0.30 weight
   *   volatilityPenalty   = { low: 0, medium: -0.10, high: -0.20 } × 0.20 weight
   *
   * The result is clamped to [0, 1].
   */
  private _computeConfidence(
    performance: RecentPerformanceSummary,
    volatility: VolatilityLevel,
    metrics: AgentMetrics,
  ): number {
    // No trade data yet — use current strategy score as a proxy
    if (performance.tradeCount === 0) {
      return Math.max(0, Math.min(1, metrics.strategyScore / 100));
    }

    const winRateContrib = performance.winRate * 0.5;

    const streakNorm = Math.max(-0.3, Math.min(0.3, performance.streak / 10));
    const streakContrib = streakNorm * 0.3;

    const volatilityPenaltyMap: Record<VolatilityLevel, number> = {
      low: 0,
      medium: -0.10,
      high: -0.20,
    };
    const volatilityContrib = volatilityPenaltyMap[volatility] * 0.2;

    const raw = winRateContrib + streakContrib + volatilityContrib + 0.5;
    return Math.max(0, Math.min(1, raw));
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a default AgentContextBuilder.
 */
export function createAgentContextBuilder(
  options?: { trendWindow?: number },
): AgentContextBuilder {
  return new AgentContextBuilder(options);
}

/** Singleton builder for convenience. */
export const agentContextBuilder = new AgentContextBuilder();
