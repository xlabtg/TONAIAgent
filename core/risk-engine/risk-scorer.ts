/**
 * Risk Engine v1 — Risk Scoring Model
 * Issue #154: Risk Engine v1
 *
 * Maintains dynamic risk scores for strategies, funds, and agent portfolios.
 * Scores update continuously based on current market conditions and exposure.
 *
 * Risk Score Range:
 *   0–30   → Low Risk
 *   31–60  → Moderate Risk
 *   61–80  → High Risk
 *   81–100 → Critical Risk
 */

import type {
  StrategyId,
  FundId,
  AgentId,
  RiskScore,
  RiskCategory,
  StrategyRiskProfile,
  PortfolioExposureSnapshot,
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Score Input
// ============================================================================

export interface StrategyScoreInput {
  strategyProfile: StrategyRiskProfile;
}

export interface PortfolioScoreInput {
  agentId: AgentId;
  snapshot: PortfolioExposureSnapshot;
  strategyProfiles?: StrategyRiskProfile[];
}

export interface FundScoreInput {
  fundId: FundId;
  strategyProfiles: StrategyRiskProfile[];
  totalCapital: number;
  drawdownPercent: number;    // current fund drawdown (0–1)
  leverageRatio: number;      // current fund leverage
}

// ============================================================================
// Risk Scorer Interface
// ============================================================================

export interface RiskScorer {
  scoreStrategy(input: StrategyScoreInput): RiskScore;
  scorePortfolio(input: PortfolioScoreInput): RiskScore;
  scoreFund(input: FundScoreInput): RiskScore;
  getLatestScore(entityId: StrategyId | AgentId | FundId): RiskScore | undefined;
  getAllScores(): Map<string, RiskScore>;
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Risk Scorer Implementation
// ============================================================================

export class DefaultRiskScorer implements RiskScorer {
  private readonly scores = new Map<string, RiskScore>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

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

  scoreStrategy(input: StrategyScoreInput): RiskScore {
    // Strategy score is directly taken from the evaluated risk profile
    const score = input.strategyProfile.riskScore;
    this.storeAndEmit(input.strategyProfile.strategyId, score, 'strategy');
    return score;
  }

  scorePortfolio(input: PortfolioScoreInput): RiskScore {
    const { snapshot, strategyProfiles = [] } = input;

    // Components:
    // 1. Capital concentration (top asset exposure)
    const concentrationScore = snapshot.capitalConcentrationScore * 100;

    // 2. Unrealized loss ratio
    const unrealizedLossScore =
      snapshot.totalValue > 0
        ? Math.min((snapshot.unrealizedLosses / snapshot.totalValue) * 200, 100)
        : 0;

    // 3. Average strategy risk (if available)
    const avgStrategyScore =
      strategyProfiles.length > 0
        ? strategyProfiles.reduce((sum, p) => sum + p.riskScore.value, 0) / strategyProfiles.length
        : 50;

    // Weighted composite
    const rawScore =
      concentrationScore * 0.35 +
      unrealizedLossScore * 0.35 +
      avgStrategyScore * 0.30;

    const value = clamp(Math.round(rawScore), 0, 100);
    const category = scoreToCategory(value);
    const score: RiskScore = {
      value,
      category,
      timestamp: new Date(),
      explanation: buildPortfolioExplanation(value, category, {
        concentrationScore,
        unrealizedLossScore,
        avgStrategyScore,
      }),
    };

    this.storeAndEmit(input.agentId, score, 'portfolio');
    return score;
  }

  scoreFund(input: FundScoreInput): RiskScore {
    // Components:
    // 1. Drawdown score
    const drawdownScore = Math.min(input.drawdownPercent * 200, 100);

    // 2. Leverage score (1x = 0, 10x = 100)
    const leverageScore = Math.min(Math.max((input.leverageRatio - 1) / 9, 0) * 100, 100);

    // 3. Average strategy risk
    const avgStrategyScore =
      input.strategyProfiles.length > 0
        ? input.strategyProfiles.reduce((sum, p) => sum + p.riskScore.value, 0) / input.strategyProfiles.length
        : 50;

    // Weighted composite
    const rawScore =
      drawdownScore * 0.40 +
      leverageScore * 0.30 +
      avgStrategyScore * 0.30;

    const value = clamp(Math.round(rawScore), 0, 100);
    const category = scoreToCategory(value);
    const score: RiskScore = {
      value,
      category,
      timestamp: new Date(),
      explanation: buildFundExplanation(value, category, {
        drawdownScore,
        leverageScore,
        avgStrategyScore,
      }),
    };

    this.storeAndEmit(input.fundId, score, 'fund');
    return score;
  }

  getLatestScore(entityId: string): RiskScore | undefined {
    return this.scores.get(entityId);
  }

  getAllScores(): Map<string, RiskScore> {
    return new Map(this.scores);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private storeAndEmit(entityId: string, score: RiskScore, entityType: string): void {
    this.scores.set(entityId, score);
    this.emitEvent({
      type: 'risk_score_updated',
      payload: {
        entityId,
        entityType,
        value: score.value,
        category: score.category,
      },
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskScorer(): DefaultRiskScorer {
  return new DefaultRiskScorer();
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildPortfolioExplanation(
  value: number,
  category: RiskCategory,
  scores: { concentrationScore: number; unrealizedLossScore: number; avgStrategyScore: number },
): string {
  const { concentrationScore, unrealizedLossScore, avgStrategyScore } = scores;
  const dominant = [
    ['concentration', concentrationScore],
    ['unrealized losses', unrealizedLossScore],
    ['strategy risk', avgStrategyScore],
  ].sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  return `Portfolio risk score ${value}/100 (${category}). Dominant factor: ${dominant}.`;
}

function buildFundExplanation(
  value: number,
  category: RiskCategory,
  scores: { drawdownScore: number; leverageScore: number; avgStrategyScore: number },
): string {
  const { drawdownScore, leverageScore, avgStrategyScore } = scores;
  const dominant = [
    ['drawdown', drawdownScore],
    ['leverage', leverageScore],
    ['strategy risk', avgStrategyScore],
  ].sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  return `Fund risk score ${value}/100 (${category}). Dominant factor: ${dominant}.`;
}
