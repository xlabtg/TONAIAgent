/**
 * GAAMP Stability Index (Public Stability Score)
 * Composite public metric covering capital adequacy, leverage ratios,
 * exposure concentration, liquidity depth, and insurance coverage.
 * Visible to institutions, DAO governance, and investors.
 */

import {
  type StabilityGrade,
  type StabilityComponent,
  type StabilityIndex,
  type StabilityScoreConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StabilityInputs {
  /** Ratio of capital to risk-weighted assets (e.g. 0.12 = 12%) */
  capitalAdequacyRatio: number;
  /** Current system average leverage (e.g. 3.5) */
  currentLeverage: number;
  /** Maximum allowed leverage at current market regime (e.g. 8) */
  maxLeverage: number;
  /** Highest single-asset concentration percentage (e.g. 0.25 = 25%) */
  topConcentrationPct: number;
  /** Ratio of liquid assets to total (e.g. 0.60) */
  liquidityRatio: number;
  /** Insurance coverage ratio (pool / total system exposure, e.g. 0.05) */
  insuranceCoverageRatio: number;
  /** Optional: previous score for trend calculation */
  previousScore?: number;
  /** Optional: latest stress test survivability result */
  lastStressTestResult?: 'passes' | 'marginal' | 'fails';
}

export interface StabilityScoreEngine {
  computeScore(inputs: StabilityInputs): StabilityIndex;
  getLatestIndex(): StabilityIndex | undefined;
  getHistory(): StabilityIndex[];
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_STABILITY_CONFIG: StabilityScoreConfig = {
  capitalAdequacyWeight: 0.25,
  leverageRatiosWeight: 0.25,
  exposureConcentrationWeight: 0.20,
  liquidityDepthWeight: 0.15,
  insuranceCoverageWeight: 0.15,
  historySize: 100,
};

// ─── Score → Grade mapping ────────────────────────────────────────────────────

function scoreToGrade(score: number): StabilityGrade {
  if (score >= 90) return 'AAA';
  if (score >= 80) return 'AA';
  if (score >= 70) return 'A';
  if (score >= 60) return 'BBB';
  if (score >= 50) return 'BB';
  if (score >= 40) return 'B';
  if (score >= 25) return 'CCC';
  return 'D';
}

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultStabilityScoreEngine implements StabilityScoreEngine {
  private readonly config: StabilityScoreConfig;
  private history: StabilityIndex[] = [];
  private eventCallbacks: SystemicRiskEventCallback[] = [];

  constructor(config?: Partial<StabilityScoreConfig>) {
    this.config = { ...DEFAULT_STABILITY_CONFIG, ...config };
  }

  computeScore(inputs: StabilityInputs): StabilityIndex {
    const capitalAdequacy = this.scoreCapitalAdequacy(inputs.capitalAdequacyRatio);
    const leverageRatios = this.scoreLeverage(inputs.currentLeverage, inputs.maxLeverage);
    const exposureConcentration = this.scoreConcentration(inputs.topConcentrationPct);
    const liquidityDepth = this.scoreLiquidity(inputs.liquidityRatio);
    const insuranceCoverage = this.scoreInsurance(inputs.insuranceCoverageRatio);

    const totalScore =
      capitalAdequacy.weightedScore +
      leverageRatios.weightedScore +
      exposureConcentration.weightedScore +
      liquidityDepth.weightedScore +
      insuranceCoverage.weightedScore;

    const grade = scoreToGrade(totalScore);
    const trend = this.computeTrend(totalScore, inputs.previousScore ?? this.getLatestScore());

    const index: StabilityIndex = {
      score: Math.round(totalScore * 10) / 10,
      grade,
      timestamp: Date.now(),
      components: {
        capitalAdequacy,
        leverageRatios,
        exposureConcentration,
        liquidityDepth,
        insuranceCoverage,
      },
      trend,
      publicSummary: this.buildPublicSummary(totalScore, grade, trend, inputs),
      lastStressTestResult: inputs.lastStressTestResult,
    };

    this.history.push(index);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    this.emit({ type: 'stability_index_updated', timestamp: Date.now(), payload: index });

    return index;
  }

  getLatestIndex(): StabilityIndex | undefined {
    return this.history[this.history.length - 1];
  }

  getHistory(): StabilityIndex[] {
    return [...this.history];
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Component Scorers ───────────────────────────────────────────────────────

  private scoreCapitalAdequacy(ratio: number): StabilityComponent {
    // Tier 1 Capital ratio: Basel III minimum is 8%, well-capitalised is 12%+
    let score: number;
    let details: string;
    if (ratio >= 0.20) {
      score = 100;
      details = `Excellent capital adequacy at ${(ratio * 100).toFixed(1)}% (≥20%)`;
    } else if (ratio >= 0.12) {
      score = 75 + (ratio - 0.12) / (0.20 - 0.12) * 25;
      details = `Strong capital base at ${(ratio * 100).toFixed(1)}%`;
    } else if (ratio >= 0.08) {
      score = 50 + (ratio - 0.08) / (0.12 - 0.08) * 25;
      details = `Adequate capital at ${(ratio * 100).toFixed(1)}% (above minimum)`;
    } else {
      score = Math.max(0, (ratio / 0.08) * 50);
      details = `Capital adequacy below minimum at ${(ratio * 100).toFixed(1)}%`;
    }
    const weight = this.config.capitalAdequacyWeight;
    return {
      name: 'Capital Adequacy',
      score,
      weight,
      weightedScore: score * weight,
      trend: 'stable',
      details,
    };
  }

  private scoreLeverage(currentLeverage: number, maxLeverage: number): StabilityComponent {
    const utilizationPct = maxLeverage > 0 ? currentLeverage / maxLeverage : 1;
    let score: number;
    let details: string;
    if (utilizationPct <= 0.30) {
      score = 100;
      details = `Very low leverage utilisation (${(utilizationPct * 100).toFixed(1)}% of max)`;
    } else if (utilizationPct <= 0.60) {
      score = 100 - (utilizationPct - 0.30) / 0.30 * 40;
      details = `Moderate leverage at ${currentLeverage.toFixed(1)}x (${(utilizationPct * 100).toFixed(1)}% of max)`;
    } else if (utilizationPct <= 0.85) {
      score = 60 - (utilizationPct - 0.60) / 0.25 * 30;
      details = `Elevated leverage utilisation at ${(utilizationPct * 100).toFixed(1)}%`;
    } else {
      score = Math.max(0, 30 - (utilizationPct - 0.85) / 0.15 * 30);
      details = `High leverage risk — ${currentLeverage.toFixed(1)}x against ${maxLeverage.toFixed(1)}x limit`;
    }
    const weight = this.config.leverageRatiosWeight;
    return {
      name: 'Leverage Ratios',
      score,
      weight,
      weightedScore: score * weight,
      trend: 'stable',
      details,
    };
  }

  private scoreConcentration(topConcentrationPct: number): StabilityComponent {
    let score: number;
    let details: string;
    if (topConcentrationPct <= 0.10) {
      score = 100;
      details = `Well-diversified portfolio (top asset ${(topConcentrationPct * 100).toFixed(1)}%)`;
    } else if (topConcentrationPct <= 0.20) {
      score = 100 - (topConcentrationPct - 0.10) / 0.10 * 30;
      details = `Moderate concentration, top asset at ${(topConcentrationPct * 100).toFixed(1)}%`;
    } else if (topConcentrationPct <= 0.30) {
      score = 70 - (topConcentrationPct - 0.20) / 0.10 * 30;
      details = `Elevated concentration risk at ${(topConcentrationPct * 100).toFixed(1)}%`;
    } else {
      score = Math.max(0, 40 - (topConcentrationPct - 0.30) / 0.70 * 40);
      details = `High concentration — ${(topConcentrationPct * 100).toFixed(1)}% in single asset`;
    }
    const weight = this.config.exposureConcentrationWeight;
    return {
      name: 'Exposure Concentration',
      score,
      weight,
      weightedScore: score * weight,
      trend: 'stable',
      details,
    };
  }

  private scoreLiquidity(liquidityRatio: number): StabilityComponent {
    let score: number;
    let details: string;
    if (liquidityRatio >= 0.80) {
      score = 100;
      details = `High liquidity buffer at ${(liquidityRatio * 100).toFixed(1)}%`;
    } else if (liquidityRatio >= 0.60) {
      score = 75 + (liquidityRatio - 0.60) / 0.20 * 25;
      details = `Good liquidity at ${(liquidityRatio * 100).toFixed(1)}%`;
    } else if (liquidityRatio >= 0.40) {
      score = 50 + (liquidityRatio - 0.40) / 0.20 * 25;
      details = `Adequate liquidity at ${(liquidityRatio * 100).toFixed(1)}%`;
    } else {
      score = Math.max(0, (liquidityRatio / 0.40) * 50);
      details = `Liquidity concern — ratio at ${(liquidityRatio * 100).toFixed(1)}%`;
    }
    const weight = this.config.liquidityDepthWeight;
    return {
      name: 'Liquidity Depth',
      score,
      weight,
      weightedScore: score * weight,
      trend: 'stable',
      details,
    };
  }

  private scoreInsurance(coverageRatio: number): StabilityComponent {
    let score: number;
    let details: string;
    if (coverageRatio >= 0.10) {
      score = 100;
      details = `Excellent insurance coverage at ${(coverageRatio * 100).toFixed(1)}% of system`;
    } else if (coverageRatio >= 0.05) {
      score = 60 + (coverageRatio - 0.05) / 0.05 * 40;
      details = `Adequate insurance pool at ${(coverageRatio * 100).toFixed(1)}%`;
    } else if (coverageRatio >= 0.02) {
      score = 30 + (coverageRatio - 0.02) / 0.03 * 30;
      details = `Low insurance coverage at ${(coverageRatio * 100).toFixed(1)}%`;
    } else {
      score = Math.max(0, (coverageRatio / 0.02) * 30);
      details = `Critical: insurance pool nearly empty (${(coverageRatio * 100).toFixed(2)}%)`;
    }
    const weight = this.config.insuranceCoverageWeight;
    return {
      name: 'Insurance Coverage',
      score,
      weight,
      weightedScore: score * weight,
      trend: 'stable',
      details,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private computeTrend(
    score: number,
    previousScore: number | undefined,
  ): 'improving' | 'stable' | 'deteriorating' {
    if (previousScore === undefined) return 'stable';
    const delta = score - previousScore;
    if (delta > 2) return 'improving';
    if (delta < -2) return 'deteriorating';
    return 'stable';
  }

  private getLatestScore(): number | undefined {
    return this.history[this.history.length - 1]?.score;
  }

  private buildPublicSummary(
    score: number,
    grade: StabilityGrade,
    trend: 'improving' | 'stable' | 'deteriorating',
    inputs: StabilityInputs,
  ): string {
    const trendText = trend === 'improving' ? '↑ improving'
      : trend === 'deteriorating' ? '↓ deteriorating' : '→ stable';

    return (
      `GAAMP Stability Index: ${score.toFixed(1)}/100 (${grade}) — ${trendText}. ` +
      `Capital adequacy: ${(inputs.capitalAdequacyRatio * 100).toFixed(1)}%, ` +
      `Leverage: ${inputs.currentLeverage.toFixed(1)}x/${inputs.maxLeverage.toFixed(1)}x max, ` +
      `Top concentration: ${(inputs.topConcentrationPct * 100).toFixed(1)}%, ` +
      `Liquidity: ${(inputs.liquidityRatio * 100).toFixed(1)}%, ` +
      `Insurance coverage: ${(inputs.insuranceCoverageRatio * 100).toFixed(2)}%.`
    );
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createStabilityScoreEngine(
  config?: Partial<StabilityScoreConfig>,
): StabilityScoreEngine {
  return new DefaultStabilityScoreEngine(config);
}
