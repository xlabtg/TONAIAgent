/**
 * TONAIAgent - Continuous Learning System
 *
 * Learns from successful and failed strategies to continuously improve
 * the quality of generated candidates over time.
 */

import type { StrategyRiskLevel } from '../../core/strategies/engine';
import type {
  CandidateStrategy,
  GenerationApproach,
  LearningInsights,
  LearningRecord,
} from './types';

// ============================================================================
// Continuous Learning System
// ============================================================================

export class ContinuousLearningSystem {
  private readonly records: LearningRecord[] = [];
  private recordCounter = 0;

  /**
   * Record a successful strategy's insights for future generation
   */
  recordSuccess(candidate: CandidateStrategy): void {
    if (!candidate.backtestResult?.performance) return;

    const marketConditions = this.inferMarketConditions(candidate);
    const perf = candidate.backtestResult.performance;

    const record: LearningRecord = {
      id: `learning_${++this.recordCounter}_${Date.now()}`,
      strategyPattern: this.extractPattern(candidate),
      effectiveApproach: candidate.generationApproach,
      successMetrics: perf,
      optimalRiskLevel: candidate.riskLevel,
      marketConditions,
      recordedAt: new Date(),
      sampleSize: 1,
    };

    // Check if similar record already exists and merge
    const existing = this.records.find(
      r =>
        r.effectiveApproach === record.effectiveApproach &&
        r.optimalRiskLevel === record.optimalRiskLevel &&
        r.strategyPattern === record.strategyPattern
    );

    if (existing) {
      // Merge by averaging metrics
      this.mergeRecord(existing, record);
    } else {
      this.records.push(record);
    }
  }

  /**
   * Record a failed strategy to avoid similar patterns
   */
  recordFailure(_candidate: CandidateStrategy): void {
    // Track failure patterns for future avoidance.
    // Currently a no-op: negative learning is implicit through low sample representation.
    // Future enhancement: penalize failed approach/risk combos.
  }

  /**
   * Get learning insights to guide next generation cycle
   */
  getInsights(): LearningInsights {
    if (this.records.length === 0) {
      return this.getDefaultInsights();
    }

    // Compute top approaches by average total return
    const approachStats = new Map<
      GenerationApproach,
      { totalScore: number; count: number }
    >();

    for (const record of this.records) {
      const current = approachStats.get(record.effectiveApproach) ?? {
        totalScore: 0,
        count: 0,
      };
      current.totalScore += record.successMetrics.metrics.totalReturn;
      current.count += record.sampleSize;
      approachStats.set(record.effectiveApproach, current);
    }

    const topApproaches = Array.from(approachStats.entries())
      .map(([approach, stats]) => ({
        approach,
        successRate: stats.totalScore / stats.count,
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Compute best risk levels by avg total return
    const riskStats = new Map<
      StrategyRiskLevel,
      { totalScore: number; count: number }
    >();

    for (const record of this.records) {
      const current = riskStats.get(record.optimalRiskLevel) ?? {
        totalScore: 0,
        count: 0,
      };
      current.totalScore += record.successMetrics.metrics.totalReturn;
      current.count += record.sampleSize;
      riskStats.set(record.optimalRiskLevel, current);
    }

    const bestRiskLevels = Array.from(riskStats.entries())
      .map(([level, stats]) => ({
        level,
        avgScore: stats.totalScore / stats.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // Market condition insights
    const conditionStats: Record<string, { totalScore: number; count: number }> = {};
    for (const record of this.records) {
      const key = `${record.marketConditions.trend}_${record.marketConditions.volatility}`;
      if (!conditionStats[key]) {
        conditionStats[key] = { totalScore: 0, count: 0 };
      }
      conditionStats[key].totalScore += record.successMetrics.metrics.totalReturn;
      conditionStats[key].count += record.sampleSize;
    }

    const marketConditionInsights: Record<
      string,
      { avgScore: number; sampleSize: number }
    > = {};
    for (const [key, stats] of Object.entries(conditionStats)) {
      marketConditionInsights[key] = {
        avgScore: stats.totalScore / stats.count,
        sampleSize: stats.count,
      };
    }

    return {
      topApproaches,
      bestRiskLevels,
      marketConditionInsights,
      totalRecords: this.records.length,
      updatedAt: new Date(),
    };
  }

  /**
   * Get all learning records
   */
  getRecords(): LearningRecord[] {
    return [...this.records];
  }

  /**
   * Get number of learning records
   */
  getRecordCount(): number {
    return this.records.length;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private extractPattern(candidate: CandidateStrategy): string {
    const triggerTypes = candidate.spec.triggers.map(t => t.config.type).sort().join(',');
    const actionTypes = candidate.spec.actions.map(a => a.type).sort().join(',');
    return `${triggerTypes}|${actionTypes}`;
  }

  private inferMarketConditions(
    candidate: CandidateStrategy
  ): LearningRecord['marketConditions'] {
    const perf = candidate.backtestResult?.performance;
    if (!perf) {
      return { trend: 'sideways', volatility: 'medium' };
    }

    const trend =
      perf.metrics.totalReturn > 10 ? 'bullish' : perf.metrics.totalReturn < -5 ? 'bearish' : 'sideways';
    const volatility =
      Math.abs(perf.metrics.maxDrawdown) > 20
        ? 'high'
        : Math.abs(perf.metrics.maxDrawdown) > 10
        ? 'medium'
        : 'low';

    return { trend, volatility };
  }

  private mergeRecord(existing: LearningRecord, newRecord: LearningRecord): void {
    const totalSamples = existing.sampleSize + newRecord.sampleSize;
    const w1 = existing.sampleSize / totalSamples;
    const w2 = newRecord.sampleSize / totalSamples;

    // Merge performance metrics via weighted average
    existing.successMetrics = {
      ...existing.successMetrics,
      metrics: {
        ...existing.successMetrics.metrics,
        totalReturn:
          existing.successMetrics.metrics.totalReturn * w1 +
          newRecord.successMetrics.metrics.totalReturn * w2,
        sharpeRatio:
          existing.successMetrics.metrics.sharpeRatio * w1 +
          newRecord.successMetrics.metrics.sharpeRatio * w2,
        maxDrawdown:
          existing.successMetrics.metrics.maxDrawdown * w1 +
          newRecord.successMetrics.metrics.maxDrawdown * w2,
      },
      trades: {
        ...existing.successMetrics.trades,
        winRate:
          existing.successMetrics.trades.winRate * w1 +
          newRecord.successMetrics.trades.winRate * w2,
      },
    };

    existing.sampleSize = totalSamples;
    existing.recordedAt = new Date();
  }

  private getDefaultInsights(): LearningInsights {
    const approaches: GenerationApproach[] = [
      'template_mutation',
      'parameter_optimization',
      'ai_rule_generation',
      'evolutionary',
    ];

    return {
      topApproaches: approaches.map(approach => ({ approach, successRate: 0 })),
      bestRiskLevels: [
        { level: 'medium', avgScore: 0 },
        { level: 'low', avgScore: 0 },
        { level: 'high', avgScore: 0 },
        { level: 'critical', avgScore: 0 },
      ],
      marketConditionInsights: {},
      totalRecords: 0,
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createContinuousLearningSystem(): ContinuousLearningSystem {
  return new ContinuousLearningSystem();
}
