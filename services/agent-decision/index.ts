/**
 * TONAIAgent — Agent Decision Service (Issue #261, #263)
 *
 * Implements the autonomous agent decision layer:
 *   goal + metrics + context + memory → choose strategy + params
 *
 * Architecture:
 *   Goal Engine
 *     ↓
 *   Decision Engine  (this module)
 *     ↓
 *   Strategy Selection
 *     ↓
 *   Execution
 *
 * Responsibilities:
 *   Step 2 — Decision Engine       (goal + metrics → strategy/params)
 *   Step 3 — Autonomous Loop       (analyze → decide → execute → evaluate → repeat)
 *   Step 4 — Strategy Switching    (trend → arbitrage, ai-signal → pause, …)
 *   Step 5 — Behavior Modes        (conservative | balanced | aggressive)
 *   Step 6 — Goal Evaluation       (progressToGoal)
 *   Step 7 — Safeguards            (overtrading, unstable switching, risk spikes)
 *   Step 8 — Context-aware decisions (Issue #263)
 */

import type { AgentGoal } from '../../core/agent/goals';
import type { AgentStrategy } from '../../core/agent/index';
import { computeGoalProgress } from '../../core/agent/goals';
import type { GoalProgress } from '../../core/agent/goals';
import type { AgentContext } from '../agent-context/index';

// ============================================================================
// Behavior Modes
// ============================================================================

/**
 * Agent behavior mode that modulates risk appetite and strategy selection.
 *
 * - `conservative` — prefer low-risk strategies (e.g. ai-signal, trend);
 *                    tight stop-losses; lower position sizes.
 * - `balanced`     — mixed approach; moderate risk across strategies.
 * - `aggressive`   — prefer high-return strategies (e.g. arbitrage, trend);
 *                    wider position sizes; accept more drawdown.
 */
export type AgentMode = 'conservative' | 'balanced' | 'aggressive';

// ============================================================================
// Decision Inputs
// ============================================================================

/**
 * Real-time metrics supplied to the Decision Engine each cycle.
 */
export interface AgentMetrics {
  /** Current portfolio balance in base currency units. */
  currentBalance: number;
  /** Starting balance (used for PnL and progress calculations). */
  initialBalance: number;
  /** Realised PnL since session start. */
  pnl: number;
  /**
   * Current maximum drawdown as a fraction [0..1].
   * 0 = no drawdown; 0.2 = 20% drawdown from peak.
   */
  currentDrawdown: number;
  /**
   * Number of trades executed in the most recent monitoring window.
   * Used for overtrading detection.
   */
  tradesInWindow: number;
  /**
   * Composite performance score of the currently active strategy [0..100].
   * Sourced from StrategyOptimizerService.
   */
  strategyScore: number;
}

// ============================================================================
// Decision Output
// ============================================================================

/**
 * The Decision Engine's recommendation for a single autonomous cycle.
 */
export interface DecisionResult {
  /** Strategy selected for the next execution cycle. */
  strategy: AgentStrategy;
  /**
   * Strategy parameters adjusted for the agent's mode and goal.
   * Keys are strategy-specific (e.g. lookbackPeriod, rsiThreshold).
   */
  params: Record<string, number | string | boolean>;
  /**
   * Whether the agent should actively execute trades this cycle.
   * False when safeguards trigger a pause.
   */
  shouldExecute: boolean;
  /** Human-readable explanation of the decision. */
  reason: string;
  /** Current goal progress snapshot. */
  goalProgress: GoalProgress;
  /** Active behavior mode used for this decision. */
  mode: AgentMode;
  /**
   * Agent confidence score [0..1] at the time of this decision.
   * Sourced from AgentContext when context is provided, otherwise
   * derived from strategyScore alone.
   */
  confidenceScore: number;
}

// ============================================================================
// Safeguard Configuration
// ============================================================================

/**
 * Thresholds that guard against dangerous autonomous behaviour.
 */
export interface SafeguardConfig {
  /**
   * Maximum number of trades allowed in the monitoring window before
   * the engine pauses execution to prevent overtrading.
   * Default: 10
   */
  maxTradesPerWindow: number;
  /**
   * Maximum strategy switches allowed within `switchWindowMs` milliseconds.
   * Prevents unstable oscillation between strategies.
   * Default: 3
   */
  maxSwitchesPerWindow: number;
  /**
   * Time window (ms) for counting strategy switches.
   * Default: 60_000 (1 minute)
   */
  switchWindowMs: number;
  /**
   * Maximum acceptable drawdown fraction [0..1] before execution is paused.
   * Default: 0.15 (15%)
   */
  maxDrawdown: number;
}

// ============================================================================
// Autonomous Cycle State
// ============================================================================

/**
 * Internal per-agent state maintained between autonomous cycles.
 */
interface AgentCycleState {
  currentStrategy: AgentStrategy;
  /** Timestamps (ms) of recent strategy switches, used for switch rate limiting. */
  switchTimestamps: number[];
  /** Number of cycles since the last evaluate step updated the strategy. */
  cyclesOnCurrentStrategy: number;
}

// ============================================================================
// Decision Engine
// ============================================================================

/**
 * Decides which strategy an agent should run and whether to execute,
 * based on its goal, current metrics, and behavior mode.
 *
 * Usage:
 * ```ts
 * const engine = new AgentDecisionEngine({ mode: 'balanced', safeguards: {...} });
 * const decision = engine.decide(agentId, goal, metrics, currentStrategy);
 * if (decision.shouldExecute) runStrategy(decision.strategy, decision.params);
 * ```
 */
export class AgentDecisionEngine {
  private readonly mode: AgentMode;
  private readonly safeguards: SafeguardConfig;
  /** Per-agent cycle state keyed by agentId. */
  private readonly agentStates = new Map<string, AgentCycleState>();

  constructor(options?: {
    mode?: AgentMode;
    safeguards?: Partial<SafeguardConfig>;
  }) {
    this.mode = options?.mode ?? 'balanced';
    this.safeguards = {
      maxTradesPerWindow: options?.safeguards?.maxTradesPerWindow ?? 10,
      maxSwitchesPerWindow: options?.safeguards?.maxSwitchesPerWindow ?? 3,
      switchWindowMs: options?.safeguards?.switchWindowMs ?? 60_000,
      maxDrawdown: options?.safeguards?.maxDrawdown ?? 0.15,
    };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Run one autonomous decision cycle for an agent.
   *
   * Cycle steps:
   *   1. Analyze  — evaluate goal progress and current metrics
   *   2. Decide   — select optimal strategy for goal + mode + context
   *   3. Safeguard check — block execution if any limit is breached
   *   4. Evaluate — detect switching opportunity; update internal state
   *
   * @param agentId         - unique agent identifier
   * @param goal            - agent's current goal
   * @param metrics         - real-time performance metrics
   * @param currentStrategy - strategy the agent is currently running
   * @param context         - optional context built from memory (Issue #263)
   */
  decide(
    agentId: string,
    goal: AgentGoal,
    metrics: AgentMetrics,
    currentStrategy: AgentStrategy,
    context?: AgentContext,
  ): DecisionResult {
    // --- Step 1: Analyze — compute goal progress --------------------------
    const goalMetricValue = this._goalMetric(goal, metrics);
    const goalProgress = computeGoalProgress(goal, goalMetricValue, metrics.initialBalance);

    // --- Step 2: Decide — select strategy (context-aware) -----------------
    const selectedStrategy = this._selectStrategy(goal, metrics, currentStrategy, context);

    // --- Step 3: Safeguard check ------------------------------------------
    const safeguardResult = this._checkSafeguards(agentId, metrics, selectedStrategy, currentStrategy);

    // --- Step 4: Evaluate — update per-agent state ------------------------
    this._updateState(agentId, selectedStrategy, currentStrategy);

    // Build strategy params tuned for mode, goal, and context
    const params = this._buildParams(selectedStrategy, goal, metrics, context);

    // Confidence score: use context value when available, else derive from strategyScore
    const confidenceScore = context !== undefined
      ? context.confidenceScore
      : Math.max(0, Math.min(1, metrics.strategyScore / 100));

    return {
      strategy: safeguardResult.blocked ? currentStrategy : selectedStrategy,
      params: safeguardResult.blocked ? {} : params,
      shouldExecute: !safeguardResult.blocked,
      reason: safeguardResult.blocked ? safeguardResult.reason : this._buildReason(goal, selectedStrategy, currentStrategy, context),
      goalProgress,
      mode: this.mode,
      confidenceScore,
    };
  }

  /**
   * Reset all internal cycle state (e.g. on agent restart).
   */
  resetState(agentId: string): void {
    this.agentStates.delete(agentId);
  }

  /**
   * Reset all agents' state.
   */
  resetAll(): void {
    this.agentStates.clear();
  }

  // --------------------------------------------------------------------------
  // Strategy Selection Logic
  // --------------------------------------------------------------------------

  /**
   * Map goal + metrics + mode + context → best strategy.
   *
   * Strategy switching table:
   * ┌─────────────────┬───────────────┬────────────────────────────────────────┐
   * │ Goal            │ Mode          │ Preferred Strategy                     │
   * ├─────────────────┼───────────────┼────────────────────────────────────────┤
   * │ minimize_risk   │ any           │ ai-signal (RSI/MACD with tight exits)  │
   * │ grow_balance    │ conservative  │ trend                                  │
   * │ grow_balance    │ balanced      │ trend (switch to arbitrage if lagging) │
   * │ grow_balance    │ aggressive    │ arbitrage                              │
   * │ maximize_profit │ conservative  │ trend                                  │
   * │ maximize_profit │ balanced      │ trend → arbitrage if score drops       │
   * │ maximize_profit │ aggressive    │ arbitrage                              │
   * └─────────────────┴───────────────┴────────────────────────────────────────┘
   *
   * Dynamic switching:
   * - If strategy score < 40 AND mode != conservative → switch to next best
   * - If drawdown > 0.10 → switch to ai-signal (defensive)
   * - If drawdown > safeguards.maxDrawdown → pause (handled by safeguards)
   *
   * Memory-driven overrides (Issue #263):
   * - If 3+ consecutive losses detected → force defensive ai-signal
   * - If current strategy has repeated failure pattern → opportunistic switch
   * - If trend is falling AND mode is not conservative → defensive ai-signal
   */
  private _selectStrategy(
    goal: AgentGoal,
    metrics: AgentMetrics,
    currentStrategy: AgentStrategy,
    context?: AgentContext,
  ): AgentStrategy {
    // ── Memory-driven overrides (Issue #263) ─────────────────────────────
    if (context !== undefined) {
      // 3+ consecutive losses → reduce risk; switch to defensive ai-signal
      if (context.patterns.consecutiveLosses) {
        return 'ai-signal';
      }

      // Current strategy has been repeatedly failing → rotate away
      if (
        context.patterns.repeatedStrategyFailure &&
        context.patterns.failingStrategy === currentStrategy &&
        this.mode !== 'conservative'
      ) {
        return this._opportunisticSwitch(currentStrategy);
      }

      // Falling trend + low confidence + non-conservative → defensive
      if (
        context.trendState === 'falling' &&
        context.confidenceScore < 0.35 &&
        this.mode !== 'conservative'
      ) {
        return 'ai-signal';
      }
    }

    // ── Metric-driven switching (Issue #261) ─────────────────────────────

    // High drawdown → switch to defensive ai-signal
    if (metrics.currentDrawdown > 0.10 && metrics.currentDrawdown <= this.safeguards.maxDrawdown) {
      return 'ai-signal';
    }

    // Poor performing strategy AND not conservative → opportunistic switch
    if (metrics.strategyScore < 40 && this.mode !== 'conservative') {
      return this._opportunisticSwitch(currentStrategy);
    }

    // ── Goal-driven primary selection ─────────────────────────────────────

    if (goal.type === 'minimize_risk') {
      return 'ai-signal';
    }

    if (goal.type === 'grow_balance') {
      if (this.mode === 'aggressive') return 'arbitrage';
      if (this.mode === 'balanced') {
        // Switch to arbitrage if progress is lagging (< 30%) and balance needs to catch up
        const progress = computeGoalProgress(goal, metrics.currentBalance, metrics.initialBalance);
        if (progress.progressToGoal < 0.3 && metrics.strategyScore >= 50) return 'arbitrage';
        return 'trend';
      }
      return 'trend'; // conservative
    }

    // maximize_profit
    if (this.mode === 'aggressive') return 'arbitrage';
    if (this.mode === 'balanced') {
      // If score drops below threshold, switch from trend to arbitrage
      if (currentStrategy === 'trend' && metrics.strategyScore < 55) return 'arbitrage';
      if (currentStrategy === 'arbitrage' && metrics.strategyScore < 55) return 'trend';
      return currentStrategy || 'trend';
    }
    return 'trend'; // conservative maximize_profit
  }

  /**
   * When the current strategy is underperforming, cycle to the next best.
   *   trend → arbitrage → ai-signal → trend
   */
  private _opportunisticSwitch(current: AgentStrategy): AgentStrategy {
    if (current === 'trend') return 'arbitrage';
    if (current === 'arbitrage') return 'ai-signal';
    return 'trend';
  }

  // --------------------------------------------------------------------------
  // Safeguards
  // --------------------------------------------------------------------------

  private _checkSafeguards(
    agentId: string,
    metrics: AgentMetrics,
    selectedStrategy: AgentStrategy,
    currentStrategy: AgentStrategy,
  ): { blocked: boolean; reason: string } {
    // Safeguard 1: drawdown spike
    if (metrics.currentDrawdown > this.safeguards.maxDrawdown) {
      return {
        blocked: true,
        reason: `Execution paused: drawdown ${(metrics.currentDrawdown * 100).toFixed(1)}% exceeds limit ${(this.safeguards.maxDrawdown * 100).toFixed(1)}%`,
      };
    }

    // Safeguard 2: overtrading
    if (metrics.tradesInWindow > this.safeguards.maxTradesPerWindow) {
      return {
        blocked: true,
        reason: `Execution paused: ${metrics.tradesInWindow} trades in window exceeds limit ${this.safeguards.maxTradesPerWindow}`,
      };
    }

    // Safeguard 3: unstable strategy switching
    if (selectedStrategy !== currentStrategy) {
      const state = this._getOrCreateState(agentId, currentStrategy);
      const now = Date.now();
      const windowStart = now - this.safeguards.switchWindowMs;
      const recentSwitches = state.switchTimestamps.filter(t => t > windowStart);
      if (recentSwitches.length >= this.safeguards.maxSwitchesPerWindow) {
        return {
          blocked: true,
          reason: `Execution paused: ${recentSwitches.length} strategy switches in ${this.safeguards.switchWindowMs}ms window exceeds limit ${this.safeguards.maxSwitchesPerWindow}`,
        };
      }
    }

    return { blocked: false, reason: '' };
  }

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  private _getOrCreateState(agentId: string, currentStrategy: AgentStrategy): AgentCycleState {
    if (!this.agentStates.has(agentId)) {
      this.agentStates.set(agentId, {
        currentStrategy,
        switchTimestamps: [],
        cyclesOnCurrentStrategy: 0,
      });
    }
    return this.agentStates.get(agentId)!;
  }

  private _updateState(
    agentId: string,
    selectedStrategy: AgentStrategy,
    currentStrategy: AgentStrategy,
  ): void {
    const state = this._getOrCreateState(agentId, currentStrategy);
    if (selectedStrategy !== state.currentStrategy) {
      state.switchTimestamps.push(Date.now());
      state.currentStrategy = selectedStrategy;
      state.cyclesOnCurrentStrategy = 0;
    } else {
      state.cyclesOnCurrentStrategy += 1;
    }
  }

  // --------------------------------------------------------------------------
  // Parameter Tuning
  // --------------------------------------------------------------------------

  /**
   * Build strategy parameters adjusted for mode, goal, and context.
   *
   * Mode effects:
   * - conservative: smaller lookback, tighter RSI bands, smaller position multiplier
   * - aggressive:   larger lookback, wider RSI bands, larger position multiplier
   *
   * Context effects (Issue #263):
   * - low confidence → reduce position multiplier by 20%
   * - high volatility → tighten RSI bands / increase min spread
   */
  private _buildParams(
    strategy: AgentStrategy,
    goal: AgentGoal,
    _metrics: AgentMetrics,
    context?: AgentContext,
  ): Record<string, number | string | boolean> {
    let positionMultiplier =
      this.mode === 'conservative' ? 0.5
      : this.mode === 'aggressive' ? 1.5
      : 1.0;

    // Context adjustments
    if (context !== undefined) {
      // Low confidence → reduce position size
      if (context.confidenceScore < 0.4) {
        positionMultiplier *= 0.8;
      }
      // High volatility → further reduce size
      if (context.volatilityLevel === 'high') {
        positionMultiplier *= 0.9;
      }
    }

    if (strategy === 'trend') {
      return {
        lookbackPeriod: this.mode === 'conservative' ? 20 : this.mode === 'aggressive' ? 10 : 14,
        positionMultiplier,
        goalType: goal.type,
      };
    }

    if (strategy === 'arbitrage') {
      // High volatility → require wider spread before entering
      const volatilitySpreadAdj = context?.volatilityLevel === 'high' ? 10 : 0;
      return {
        minSpreadBps: (this.mode === 'conservative' ? 30 : this.mode === 'aggressive' ? 10 : 20) + volatilitySpreadAdj,
        positionMultiplier,
        goalType: goal.type,
      };
    }

    if (strategy === 'ai-signal') {
      return {
        rsiBuyThreshold: this.mode === 'conservative' ? 25 : this.mode === 'aggressive' ? 35 : 30,
        rsiSellThreshold: this.mode === 'conservative' ? 75 : this.mode === 'aggressive' ? 65 : 70,
        positionMultiplier,
        goalType: goal.type,
      };
    }

    // Generic fallback for custom strategies
    return { positionMultiplier, goalType: goal.type };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Extract the goal-relevant metric from the current metrics snapshot.
   */
  private _goalMetric(goal: AgentGoal, metrics: AgentMetrics): number {
    switch (goal.type) {
      case 'grow_balance':    return metrics.currentBalance;
      case 'maximize_profit': return metrics.pnl;
      case 'minimize_risk':   return metrics.currentDrawdown;
    }
  }

  private _buildReason(
    goal: AgentGoal,
    selectedStrategy: AgentStrategy,
    currentStrategy: AgentStrategy,
    context?: AgentContext,
  ): string {
    const switched = selectedStrategy !== currentStrategy;
    const modeLabel = this.mode;
    if (switched) {
      const contextSuffix = context !== undefined
        ? `, confidence: ${(context.confidenceScore * 100).toFixed(0)}%, trend: ${context.trendState}`
        : '';
      return `Strategy switched from ${currentStrategy} → ${selectedStrategy} (goal: ${goal.type}, mode: ${modeLabel}${contextSuffix})`;
    }
    const contextSuffix = context !== undefined
      ? ` [confidence: ${(context.confidenceScore * 100).toFixed(0)}%, trend: ${context.trendState}]`
      : '';
    return `Continuing ${selectedStrategy} (goal: ${goal.type}, mode: ${modeLabel})${contextSuffix}`;
  }
}

// ============================================================================
// Singleton / factory
// ============================================================================

export function createAgentDecisionEngine(options?: {
  mode?: AgentMode;
  safeguards?: Partial<SafeguardConfig>;
}): AgentDecisionEngine {
  return new AgentDecisionEngine(options);
}

export const agentDecisionEngine = new AgentDecisionEngine();
export default agentDecisionEngine;
