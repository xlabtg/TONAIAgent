/**
 * TONAIAgent - Automated Backtesting & Risk Filtering Pipeline
 *
 * Runs each generated candidate through the full evaluation pipeline:
 * 1. Backtesting via BacktestingEngine
 * 2. Risk filtering based on configurable thresholds
 * 3. Performance evaluation and scoring
 */

import type { BacktestingEngine } from '../strategy/backtesting';
import type { BacktestConfig, BacktestResult, Strategy, StrategyPerformance } from '../strategy/types';
import type {
  CandidateStrategy,
  EvaluationThresholds,
  RiskFilterConfig,
} from './types';

// ============================================================================
// Discovery Pipeline
// ============================================================================

export class DiscoveryPipeline {
  constructor(
    private readonly backtestingEngine: BacktestingEngine,
    private readonly thresholds: EvaluationThresholds,
    private readonly riskFilter: RiskFilterConfig
  ) {}

  /**
   * Run a candidate through the full pipeline: backtest → risk filter → evaluate
   */
  async processCandiate(candidate: CandidateStrategy): Promise<CandidateStrategy> {
    // Step 1: Backtesting
    const afterBacktest = await this.runBacktest(candidate);
    if (afterBacktest.status === 'failed') {
      return afterBacktest;
    }

    // Step 2: Risk filtering
    const afterRisk = this.applyRiskFilter(afterBacktest);
    if (afterRisk.status === 'failed') {
      return afterRisk;
    }

    // Step 3: Performance evaluation
    return this.evaluate(afterRisk);
  }

  /**
   * Run backtest for a candidate
   */
  private async runBacktest(candidate: CandidateStrategy): Promise<CandidateStrategy> {
    const updated: CandidateStrategy = { ...candidate, status: 'backtesting' };

    try {
      // Build a minimal Strategy wrapper for the backtesting engine
      const strategy = this.buildStrategy(candidate);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 86400000); // 90 days

      const config: BacktestConfig = {
        strategyId: strategy.id,
        period: { start: startDate, end: endDate },
        initialCapital: 10000,
        slippageModel: { type: 'fixed', baseSlippage: 0.5 },
        feeModel: { tradingFee: 0.002, gasCost: 0.1 },
        dataGranularity: '1d',
      };

      // BacktestingEngine uses its own internal data provider (synthetic fallback)
      const result: BacktestResult = await this.backtestingEngine.runBacktest(strategy, config);

      return {
        ...updated,
        backtestResult: result,
        status: result.status === 'completed' ? 'risk_filtering' : 'failed',
        rejectionReason: result.status !== 'completed' ? 'backtest_error' : undefined,
      };
    } catch {
      return {
        ...updated,
        status: 'failed',
        rejectionReason: 'backtest_error',
      };
    }
  }

  /**
   * Apply risk filters to a candidate
   */
  private applyRiskFilter(candidate: CandidateStrategy): CandidateStrategy {
    const perf = candidate.backtestResult?.performance;
    if (!perf) {
      return { ...candidate, status: 'failed', rejectionReason: 'backtest_error' };
    }

    // Check maximum drawdown
    const drawdown = Math.abs(perf.metrics.maxDrawdown);
    if (drawdown > this.riskFilter.maxDrawdownPercent) {
      return { ...candidate, status: 'failed', rejectionReason: 'excessive_drawdown' };
    }

    // Check return stability (coefficient of variation approximation)
    const stabilityScore = this.calculateStabilityScore(perf);
    if (stabilityScore < this.riskFilter.minStabilityScore) {
      return { ...candidate, status: 'failed', rejectionReason: 'unstable_returns' };
    }

    return { ...candidate, status: 'evaluating' };
  }

  /**
   * Evaluate a candidate and compute final score
   */
  private evaluate(candidate: CandidateStrategy): CandidateStrategy {
    const perf = candidate.backtestResult?.performance;
    if (!perf) {
      return { ...candidate, status: 'failed', rejectionReason: 'backtest_error' };
    }

    // Check minimum thresholds
    if (perf.metrics.totalReturn < this.thresholds.minROI) {
      return { ...candidate, status: 'failed', rejectionReason: 'insufficient_roi' };
    }

    if (perf.metrics.sharpeRatio < this.thresholds.minSharpe) {
      return { ...candidate, status: 'failed', rejectionReason: 'low_sharpe' };
    }

    const drawdown = Math.abs(perf.metrics.maxDrawdown);
    if (drawdown > this.thresholds.maxDrawdown) {
      return { ...candidate, status: 'failed', rejectionReason: 'excessive_drawdown' };
    }

    if (perf.trades.winRate < this.thresholds.minWinRate) {
      return { ...candidate, status: 'failed', rejectionReason: 'insufficient_roi' };
    }

    // Compute composite score (0-100)
    const evaluationScore = this.computeScore(perf);

    return {
      ...candidate,
      evaluationScore,
      status: 'passed',
    };
  }

  /**
   * Compute a composite evaluation score from performance metrics
   */
  private computeScore(perf: StrategyPerformance): number {
    // Weighted scoring: totalReturn 30%, Sharpe 30%, Drawdown 25%, WinRate 15%
    const roiScore = Math.min(100, Math.max(0, (perf.metrics.totalReturn / 50) * 100));
    const sharpeScore = Math.min(100, Math.max(0, (perf.metrics.sharpeRatio / 3) * 100));
    const drawdownScore = Math.min(100, Math.max(0, (1 - Math.abs(perf.metrics.maxDrawdown) / 50) * 100));
    const winRateScore = Math.min(100, Math.max(0, perf.trades.winRate * 100));

    return Math.round(
      roiScore * 0.30 +
      sharpeScore * 0.30 +
      drawdownScore * 0.25 +
      winRateScore * 0.15
    );
  }

  /**
   * Calculate a stability score (0-1) from performance metrics
   */
  private calculateStabilityScore(perf: StrategyPerformance): number {
    // Higher Sharpe = more stable, lower drawdown = more stable
    const sharpeContrib = Math.min(1, Math.max(0, perf.metrics.sharpeRatio / 2));
    const drawdownContrib = Math.min(1, Math.max(0, 1 - Math.abs(perf.metrics.maxDrawdown) / 30));
    return (sharpeContrib + drawdownContrib) / 2;
  }

  /**
   * Build a minimal Strategy object from a CandidateStrategy
   */
  private buildStrategy(candidate: CandidateStrategy): Strategy {
    return {
      id: candidate.id,
      name: `Discovery Candidate ${candidate.id}`,
      description: `Auto-generated strategy via ${candidate.generationApproach}`,
      type: 'ai_driven',
      version: 1,
      status: 'backtesting',
      userId: 'discovery_engine',
      agentId: 'discovery_engine',
      definition: candidate.spec,
      createdAt: candidate.generatedAt,
      updatedAt: candidate.generatedAt,
      tags: ['auto-generated', candidate.generationApproach],
      metadata: {
        generationApproach: candidate.generationApproach,
        cycleId: candidate.cycleId,
        generation: candidate.generation,
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDiscoveryPipeline(
  backtestingEngine: BacktestingEngine,
  thresholds: EvaluationThresholds,
  riskFilter: RiskFilterConfig
): DiscoveryPipeline {
  return new DiscoveryPipeline(backtestingEngine, thresholds, riskFilter);
}
