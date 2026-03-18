/**
 * TONAIAgent — Strategy Optimizer Service (Issue #257)
 *
 * AI feedback loop that evaluates per-strategy analytics metrics and
 * automatically adjusts strategy parameters to improve performance over time.
 *
 * Architecture:
 *   Trade Data → Analytics Engine → Strategy Optimizer → Updated Config
 *                                                        → Execution Engine
 *
 * Feedback loop cycle: execute → measure → optimize → update → repeat
 */

import type { TradeDistribution } from '../analytics/index';

// ============================================================================
// Types
// ============================================================================

/** Tunable parameters for a strategy. All values are normalised ratios [0..1]. */
export interface StrategyParams {
  /** Risk exposure ratio (0 = no risk, 1 = max risk). */
  riskLevel: number;
  /** Trade size as a fraction of available capital [0..1]. */
  tradeSize: number;
  /** Stop-loss percentage (0 = no stop, 1 = 100% loss tolerated). */
  stopLoss: number;
  /** Take-profit percentage (0 = no target, 1 = 100% gain target). */
  takeProfit: number;
}

/** A strategy's current configuration, keyed by strategy name. */
export interface StrategyConfig {
  strategyId: string;
  params: StrategyParams;
  /** Number of completed optimization cycles for this strategy. */
  optimizationCycles: number;
  /** ISO timestamp of the last optimization run. */
  lastOptimizedAt: string;
  /** Composite score in [0..100] computed after the last optimization. */
  score: number;
  /** Whether the optimizer has applied at least one adjustment. */
  autoOptimized: boolean;
}

/** Full result returned by a single optimize() call. */
export interface OptimizationResult {
  strategyId: string;
  previousParams: StrategyParams;
  updatedParams: StrategyParams;
  score: number;
  adjustments: string[];
  recommendations: string[];
}

/** Ranked strategy entry returned by topStrategies(). */
export interface RankedStrategy {
  strategyId: string;
  score: number;
  rank: number;
  config: StrategyConfig;
}

// ============================================================================
// Default parameter bounds (safety caps)
// ============================================================================

const PARAM_MIN: StrategyParams = {
  riskLevel: 0.05,
  tradeSize: 0.02,
  stopLoss: 0.01,
  takeProfit: 0.02,
};

const PARAM_MAX: StrategyParams = {
  riskLevel: 0.9,
  tradeSize: 0.5,
  stopLoss: 0.25,
  takeProfit: 1.0,
};

/** Maximum fractional change applied per optimization cycle (prevents overfitting). */
const MAX_STEP = 0.15;

// ============================================================================
// Scoring helpers
// ============================================================================

/**
 * Compute a composite performance score in [0..100].
 *
 * Weights:
 *   - winRate       40 %   (primary quality signal)
 *   - avgPnL        35 %   (profitability per trade, capped at ±USDT 100)
 *   - maxDrawdown   25 %   (risk penalty — high drawdown reduces score)
 */
export function computeScore(dist: TradeDistribution, avgPnL: number, maxDrawdown: number): number {
  const winRateScore = Math.max(0, Math.min(100, dist.winRate));
  // Normalise avgPnL: $100 gain per trade → 100, $100 loss → 0
  const pnlScore = Math.max(0, Math.min(100, (avgPnL + 100) / 2));
  // Drawdown penalty: 0% drawdown → 100, 50%+ → 0
  const ddScore = Math.max(0, 100 - maxDrawdown * 2);

  return 0.4 * winRateScore + 0.35 * pnlScore + 0.25 * ddScore;
}

// ============================================================================
// Clamp / step helpers
// ============================================================================

function clamp(value: number, key: keyof StrategyParams): number {
  return Math.max(PARAM_MIN[key], Math.min(PARAM_MAX[key], value));
}

function gradualChange(current: number, target: number): number {
  const delta = target - current;
  // Never move more than MAX_STEP per cycle
  const capped = Math.sign(delta) * Math.min(Math.abs(delta), MAX_STEP * Math.max(1, Math.abs(current)));
  return current + capped;
}

// ============================================================================
// Strategy Optimizer Service
// ============================================================================

export class StrategyOptimizerService {
  private readonly configs: Map<string, StrategyConfig> = new Map();

  /**
   * Return the current config for a strategy, initialising with sensible
   * defaults if it has never been optimized before.
   */
  getConfig(strategyId: string): StrategyConfig {
    return this.configs.get(strategyId) ?? this.defaultConfig(strategyId);
  }

  /**
   * Core optimization function.
   *
   * Reads analytics metrics for a single strategy and applies rule-based
   * adjustments to its parameters:
   *
   *   - Low win rate  → reduce riskLevel + tradeSize (be more conservative)
   *   - High avg PnL  → increase tradeSize (capitalise on edge)
   *   - High drawdown → tighten stopLoss
   *   - High PnL      → widen takeProfit
   *
   * All changes are gradual (≤ MAX_STEP per cycle) and clamped within
   * safe bounds to prevent instability.
   */
  optimizeStrategy(
    strategyId: string,
    dist: TradeDistribution,
    avgPnL: number,
    maxDrawdown: number,
  ): OptimizationResult {
    const current = this.getConfig(strategyId);
    const prev = { ...current.params };
    const next = { ...current.params };
    const adjustments: string[] = [];
    const recommendations: string[] = [];

    // ── Win rate ─────────────────────────────────────────────────────────────
    if (dist.winRate < 40) {
      // Too many losers — reduce risk exposure
      next.riskLevel = gradualChange(next.riskLevel, next.riskLevel * 0.8);
      next.tradeSize = gradualChange(next.tradeSize, next.tradeSize * 0.85);
      adjustments.push(`Win rate ${dist.winRate.toFixed(1)}% is low — reduced risk and trade size`);
      recommendations.push('Review entry conditions; consider adding confirmation signals');
    } else if (dist.winRate >= 65) {
      // Strong win rate — allow slightly more risk
      next.riskLevel = gradualChange(next.riskLevel, next.riskLevel * 1.05);
      adjustments.push(`Win rate ${dist.winRate.toFixed(1)}% is strong — slightly increased risk`);
    }

    // ── Average PnL ──────────────────────────────────────────────────────────
    if (avgPnL > 5) {
      // Profitable edge — increase allocation
      next.tradeSize = gradualChange(next.tradeSize, next.tradeSize * 1.1);
      next.takeProfit = gradualChange(next.takeProfit, next.takeProfit * 1.05);
      adjustments.push(`Avg PnL $${avgPnL.toFixed(2)} is positive — increased allocation and take-profit`);
    } else if (avgPnL < -2) {
      // Consistently losing — scale back hard
      next.tradeSize = gradualChange(next.tradeSize, next.tradeSize * 0.75);
      adjustments.push(`Avg PnL $${avgPnL.toFixed(2)} is negative — reduced trade size significantly`);
      recommendations.push('Strategy may need structural review');
    }

    // ── Max drawdown ─────────────────────────────────────────────────────────
    if (maxDrawdown > 20) {
      // High drawdown risk — tighten stop-loss
      next.stopLoss = gradualChange(next.stopLoss, next.stopLoss * 0.85);
      adjustments.push(`Max drawdown ${maxDrawdown.toFixed(1)}% is high — tightened stop-loss`);
      recommendations.push('Consider reducing position sizes or adding portfolio-level risk controls');
    } else if (maxDrawdown < 5 && dist.winRate >= 50) {
      // Very controlled drawdown — can afford wider stops
      next.stopLoss = gradualChange(next.stopLoss, next.stopLoss * 1.05);
      adjustments.push(`Max drawdown ${maxDrawdown.toFixed(1)}% is well-controlled — slightly widened stop-loss`);
    }

    // ── Clamp all parameters within safe bounds ───────────────────────────────
    for (const key of Object.keys(next) as (keyof StrategyParams)[]) {
      next[key] = clamp(next[key], key);
    }

    const score = computeScore(dist, avgPnL, maxDrawdown);

    const updated: StrategyConfig = {
      strategyId,
      params: next,
      optimizationCycles: current.optimizationCycles + 1,
      lastOptimizedAt: new Date().toISOString(),
      score,
      autoOptimized: true,
    };

    this.configs.set(strategyId, updated);

    return {
      strategyId,
      previousParams: prev,
      updatedParams: next,
      score,
      adjustments,
      recommendations,
    };
  }

  /**
   * Run the optimizer for all strategies present in the analytics output.
   *
   * @param distributions - per-strategy metrics from AnalyticsService.computeByStrategy()
   * @param avgPnLByStrategy - map of strategy → average PnL per trade
   * @param maxDrawdownByStrategy - map of strategy → max drawdown percentage
   */
  optimizeAll(
    distributions: TradeDistribution[],
    avgPnLByStrategy: Map<string, number>,
    maxDrawdownByStrategy: Map<string, number>,
  ): OptimizationResult[] {
    return distributions.map(dist =>
      this.optimizeStrategy(
        dist.strategy,
        dist,
        avgPnLByStrategy.get(dist.strategy) ?? 0,
        maxDrawdownByStrategy.get(dist.strategy) ?? 0,
      ),
    );
  }

  /**
   * Return all strategies ranked by their composite score (highest first).
   */
  topStrategies(): RankedStrategy[] {
    return Array.from(this.configs.values())
      .sort((a, b) => b.score - a.score)
      .map((config, index) => ({
        strategyId: config.strategyId,
        score: config.score,
        rank: index + 1,
        config,
      }));
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private defaultConfig(strategyId: string): StrategyConfig {
    return {
      strategyId,
      params: {
        riskLevel: 0.3,
        tradeSize: 0.1,
        stopLoss: 0.05,
        takeProfit: 0.1,
      },
      optimizationCycles: 0,
      lastOptimizedAt: new Date().toISOString(),
      score: 50,
      autoOptimized: false,
    };
  }
}

export const strategyOptimizerService = new StrategyOptimizerService();
export default strategyOptimizerService;
