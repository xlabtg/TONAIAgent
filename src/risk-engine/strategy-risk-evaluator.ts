/**
 * Risk Engine v1 — Strategy Risk Evaluator
 * Issue #154: Risk Engine v1
 *
 * Evaluates each strategy's risk profile before deployment, computing
 * a composite risk score from volatility, drawdown, leverage, concentration,
 * and historical stability metrics.
 *
 * Risk Score Range:
 *   0–30   → Low Risk
 *   31–60  → Moderate Risk
 *   61–80  → High Risk
 *   81–100 → Critical Risk
 */

import type {
  StrategyId,
  StrategyRiskProfile,
  StrategyRiskInput,
  RiskScore,
  RiskCategory,
  RiskEngineEvent,
  RiskEngineEventCallback,
  StrategyEvaluatorConfig,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_EVALUATOR_CONFIG: StrategyEvaluatorConfig = {
  volatilityWeight: 0.25,
  drawdownWeight: 0.30,
  leverageWeight: 0.20,
  concentrationWeight: 0.15,
  stabilityWeight: 0.10,
};

// ============================================================================
// Strategy Risk Evaluator Interface
// ============================================================================

export interface StrategyRiskEvaluator {
  evaluate(input: StrategyRiskInput): StrategyRiskProfile;
  getProfile(strategyId: StrategyId): StrategyRiskProfile | undefined;
  getAllProfiles(): StrategyRiskProfile[];
  clearProfile(strategyId: StrategyId): void;
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Strategy Risk Evaluator Implementation
// ============================================================================

export class DefaultStrategyRiskEvaluator implements StrategyRiskEvaluator {
  private readonly config: StrategyEvaluatorConfig;
  private readonly profiles = new Map<StrategyId, StrategyRiskProfile>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: Partial<StrategyEvaluatorConfig>) {
    this.config = {
      ...DEFAULT_EVALUATOR_CONFIG,
      ...config,
    };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<RiskEngineEvent, 'timestamp'>): void {
    const fullEvent: RiskEngineEvent = {
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  evaluate(input: StrategyRiskInput): StrategyRiskProfile {
    const riskScore = this.computeRiskScore(input);

    const profile: StrategyRiskProfile = {
      strategyId: input.strategyId,
      volatility: input.volatility,
      maxDrawdown: input.maxDrawdown,
      leverageRatio: input.leverageRatio,
      assetConcentration: input.assetConcentration,
      historicalStability: input.historicalStability,
      riskScore,
      evaluatedAt: new Date(),
    };

    this.profiles.set(input.strategyId, profile);

    this.emitEvent({
      type: 'strategy_evaluated',
      payload: {
        strategyId: input.strategyId,
        riskScore: riskScore.value,
        category: riskScore.category,
      },
    });

    return profile;
  }

  getProfile(strategyId: StrategyId): StrategyRiskProfile | undefined {
    return this.profiles.get(strategyId);
  }

  getAllProfiles(): StrategyRiskProfile[] {
    return Array.from(this.profiles.values());
  }

  clearProfile(strategyId: StrategyId): void {
    this.profiles.delete(strategyId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private computeRiskScore(input: StrategyRiskInput): RiskScore {
    const { config } = this;

    // Normalize each metric to a 0–100 contribution:
    // Higher raw value → higher risk sub-score for most metrics.
    // Stability is inverted: lower stability → higher risk.

    // Volatility: 0 = 0 risk, 1 (100%) annualized vol = 100 risk
    const volatilityScore = Math.min(input.volatility * 100, 100);

    // Max drawdown: 0 = 0 risk, 1 (100% drawdown) = 100 risk
    const drawdownScore = Math.min(input.maxDrawdown * 100, 100);

    // Leverage ratio: 1x = 0 risk, 10x = 100 risk (scaled linearly from 1)
    const leverageScore = Math.min(Math.max((input.leverageRatio - 1) / 9, 0) * 100, 100);

    // Concentration: 0 = 0 risk, 1 (100% in one asset) = 100 risk
    const concentrationScore = Math.min(input.assetConcentration * 100, 100);

    // Historical stability: 0 (unstable) = 100 risk, 1 (fully stable) = 0 risk
    const stabilityScore = Math.min((1 - input.historicalStability) * 100, 100);

    const compositeScore =
      volatilityScore * config.volatilityWeight +
      drawdownScore * config.drawdownWeight +
      leverageScore * config.leverageWeight +
      concentrationScore * config.concentrationWeight +
      stabilityScore * config.stabilityWeight;

    const value = Math.min(Math.max(Math.round(compositeScore), 0), 100);
    const category = scoreToCategory(value);
    const explanation = buildExplanation(value, category, {
      volatilityScore,
      drawdownScore,
      leverageScore,
      concentrationScore,
      stabilityScore,
    });

    return {
      value,
      category,
      timestamp: new Date(),
      explanation,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyRiskEvaluator(
  config?: Partial<StrategyEvaluatorConfig>,
): DefaultStrategyRiskEvaluator {
  return new DefaultStrategyRiskEvaluator(config);
}

// ============================================================================
// Helpers
// ============================================================================

function scoreToCategory(value: number): RiskCategory {
  if (value <= 30) return 'low';
  if (value <= 60) return 'moderate';
  if (value <= 80) return 'high';
  return 'critical';
}

function buildExplanation(
  value: number,
  category: RiskCategory,
  scores: {
    volatilityScore: number;
    drawdownScore: number;
    leverageScore: number;
    concentrationScore: number;
    stabilityScore: number;
  },
): string {
  const dominant = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
  const dominantLabel: Record<string, string> = {
    volatilityScore: 'volatility',
    drawdownScore: 'drawdown history',
    leverageScore: 'leverage usage',
    concentrationScore: 'asset concentration',
    stabilityScore: 'historical instability',
  };
  return (
    `Risk score ${value}/100 (${category}). ` +
    `Dominant risk factor: ${dominantLabel[dominant] ?? dominant}.`
  );
}
