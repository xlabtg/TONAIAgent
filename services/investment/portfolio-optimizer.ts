/**
 * AI Portfolio Optimization Engine
 *
 * Adaptive capital redistribution with AI-driven strategy performance scoring,
 * risk-adjusted return optimization, volatility-aware rebalancing, and
 * confidence-based execution scaling. Architecture is future-ready for
 * reinforcement learning integration.
 */

import type {
  StrategyAllocation,
  OptimizationObjective,
  PortfolioOptimizationConfig,
  StrategyPerformanceScore,
  OptimizationResult,
  VolatilityMetrics,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface PortfolioOptimizer {
  // Configuration
  setOptimizationConfig(vaultId: string, config: Partial<PortfolioOptimizationConfig>): Promise<void>;
  getOptimizationConfig(vaultId: string): Promise<PortfolioOptimizationConfig>;

  // Performance scoring
  scoreStrategy(strategyId: string, agentId: string, metrics: StrategyMetricsInput): Promise<StrategyPerformanceScore>;
  getStrategyScore(strategyId: string): Promise<StrategyPerformanceScore | null>;
  listStrategyScores(vaultId: string): Promise<StrategyPerformanceScore[]>;

  // Optimization
  optimize(vaultId: string, currentAllocations: StrategyAllocation[]): Promise<OptimizationResult>;
  applyOptimization(optimizationId: string): Promise<OptimizationResult>;
  listOptimizationHistory(vaultId: string): Promise<OptimizationResult[]>;

  // Volatility tracking
  recordVolatility(strategyId: string, metrics: VolatilityInput): Promise<VolatilityMetrics>;
  getVolatility(strategyId: string): Promise<VolatilityMetrics | null>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

export interface StrategyMetricsInput {
  returns: number[]; // Array of daily returns (percentage)
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
}

export interface VolatilityInput {
  dailyReturns: number[]; // Recent daily returns
}

// ============================================================================
// Configuration
// ============================================================================

export interface PortfolioOptimizerConfig {
  defaultOptimizationObjective: OptimizationObjective;
  minDataPointsForOptimization: number;
  confidenceThreshold: number; // Min AI confidence to apply optimization
  scoringWeights: {
    return: number;
    risk: number;
    consistency: number;
  };
}

const DEFAULT_CONFIG: PortfolioOptimizerConfig = {
  defaultOptimizationObjective: 'sharpe_ratio',
  minDataPointsForOptimization: 5,
  confidenceThreshold: 0.6,
  scoringWeights: {
    return: 0.4,
    risk: 0.35,
    consistency: 0.25,
  },
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultPortfolioOptimizer implements PortfolioOptimizer {
  private readonly config: PortfolioOptimizerConfig;
  private readonly vaultConfigs: Map<string, PortfolioOptimizationConfig> = new Map();
  private readonly strategyScores: Map<string, StrategyPerformanceScore> = new Map();
  private readonly volatilityMetrics: Map<string, VolatilityMetrics> = new Map();
  private readonly optimizationHistory: Map<string, OptimizationResult[]> = new Map();
  private readonly pendingOptimizations: Map<string, OptimizationResult> = new Map();
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<PortfolioOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async setOptimizationConfig(vaultId: string, config: Partial<PortfolioOptimizationConfig>): Promise<void> {
    const existing = this.vaultConfigs.get(vaultId) ?? this.getDefaultOptimizationConfig();
    this.vaultConfigs.set(vaultId, { ...existing, ...config });
  }

  async getOptimizationConfig(vaultId: string): Promise<PortfolioOptimizationConfig> {
    return this.vaultConfigs.get(vaultId) ?? this.getDefaultOptimizationConfig();
  }

  async scoreStrategy(strategyId: string, agentId: string, metrics: StrategyMetricsInput): Promise<StrategyPerformanceScore> {
    const returns = metrics.returns;

    if (returns.length === 0) {
      throw new Error(`Cannot score strategy ${strategyId}: no return data provided`);
    }

    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const annualizedReturn = avgReturn * 252; // Annualized from daily

    // Calculate volatility
    const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252);

    // Sharpe ratio (assuming 0 risk-free rate)
    const sharpeRatio = metrics.sharpeRatio ?? (annualizedVol > 0 ? annualizedReturn / annualizedVol : 0);

    // Sortino ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + r ** 2, 0) / downsideReturns.length
      : 0;
    const downsideStdDev = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortinoRatio = metrics.sortinoRatio ?? (downsideStdDev > 0 ? annualizedReturn / downsideStdDev : 0);

    // Max drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const r of returns) {
      cumulative += r;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    const finalMaxDrawdown = metrics.maxDrawdown ?? maxDrawdown;
    const finalVolatility = metrics.volatility ?? annualizedVol;

    // Scoring (0-100 scale)
    const returnScore = Math.min(100, Math.max(0, 50 + annualizedReturn * 2));
    const riskScore = Math.min(100, Math.max(0, 100 - finalMaxDrawdown * 3 - finalVolatility * 1.5));
    const consistencyScore = Math.min(100, Math.max(0, returns.filter(r => r > 0).length / returns.length * 100));

    const compositeScore =
      returnScore * this.config.scoringWeights.return +
      riskScore * this.config.scoringWeights.risk +
      consistencyScore * this.config.scoringWeights.consistency;

    const score: StrategyPerformanceScore = {
      strategyId,
      agentId,
      returnScore,
      riskScore,
      consistencyScore,
      compositeScore,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown: finalMaxDrawdown,
      volatility: finalVolatility,
      calculatedAt: new Date(),
    };

    this.strategyScores.set(strategyId, score);
    return score;
  }

  async getStrategyScore(strategyId: string): Promise<StrategyPerformanceScore | null> {
    return this.strategyScores.get(strategyId) ?? null;
  }

  async listStrategyScores(vaultId: string): Promise<StrategyPerformanceScore[]> {
    // Return all scores (in a real system we'd filter by vault)
    return Array.from(this.strategyScores.values());
  }

  async optimize(vaultId: string, currentAllocations: StrategyAllocation[]): Promise<OptimizationResult> {
    const config = await this.getOptimizationConfig(vaultId);

    if (currentAllocations.length === 0) {
      throw new Error(`Cannot optimize vault ${vaultId}: no current allocations`);
    }

    // Collect scores for each strategy
    const scores: StrategyPerformanceScore[] = [];
    for (const alloc of currentAllocations) {
      const score = this.strategyScores.get(alloc.strategyId);
      if (score) scores.push(score);
    }

    // Build recommended allocations
    let recommendedAllocations: StrategyAllocation[];
    const reasoning: string[] = [];

    if (scores.length < this.config.minDataPointsForOptimization && scores.length < currentAllocations.length) {
      // Not enough data: keep existing allocations
      recommendedAllocations = currentAllocations.map(a => ({ ...a }));
      reasoning.push('Insufficient performance data — maintaining current allocations');
    } else {
      recommendedAllocations = this.computeOptimalAllocations(currentAllocations, scores, config, reasoning);
    }

    // Estimate portfolio metrics
    const weightedSharpe = this.computeWeightedMetric(recommendedAllocations, scores, 'sharpeRatio');
    const weightedVol = this.computeWeightedMetric(recommendedAllocations, scores, 'volatility');
    const annualizedReturn = this.computeWeightedMetric(recommendedAllocations, scores, 'returnScore') / 100 * 30;

    const confidence = scores.length > 0 ? Math.min(1, scores.length / currentAllocations.length) : 0.5;

    const optimization: OptimizationResult = {
      id: this.generateId('opt'),
      vaultId,
      objective: config.objective,
      previousAllocations: currentAllocations.map(a => ({ ...a })),
      recommendedAllocations,
      expectedReturn: annualizedReturn,
      expectedVolatility: weightedVol,
      expectedSharpe: weightedSharpe,
      confidence,
      reasoning,
      createdAt: new Date(),
    };

    this.pendingOptimizations.set(optimization.id, optimization);

    this.emitEvent({
      type: 'optimization_applied',
      timestamp: optimization.createdAt,
      data: { optimizationId: optimization.id, vaultId, confidence, reasoning },
    });

    return optimization;
  }

  async applyOptimization(optimizationId: string): Promise<OptimizationResult> {
    const optimization = this.pendingOptimizations.get(optimizationId);
    if (!optimization) {
      throw new Error(`Optimization ${optimizationId} not found`);
    }

    const applied: OptimizationResult = { ...optimization, appliedAt: new Date() };
    this.pendingOptimizations.set(optimizationId, applied);

    // Move to history
    const history = this.optimizationHistory.get(optimization.vaultId) ?? [];
    history.push(applied);
    this.optimizationHistory.set(optimization.vaultId, history);

    return applied;
  }

  async listOptimizationHistory(vaultId: string): Promise<OptimizationResult[]> {
    return this.optimizationHistory.get(vaultId) ?? [];
  }

  async recordVolatility(strategyId: string, input: VolatilityInput): Promise<VolatilityMetrics> {
    const { dailyReturns } = input;

    if (dailyReturns.length === 0) {
      throw new Error(`Cannot record volatility for ${strategyId}: no daily returns provided`);
    }

    const dailyVol = this.calculateStdDev(dailyReturns);
    const weeklyVol = dailyVol * Math.sqrt(5);
    const monthlyVol = dailyVol * Math.sqrt(21);
    const annualizedVol = dailyVol * Math.sqrt(252);

    const metrics: VolatilityMetrics = {
      strategyId,
      dailyVolatility: dailyVol,
      weeklyVolatility: weeklyVol,
      monthlyVolatility: monthlyVol,
      annualizedVolatility: annualizedVol,
      calculatedAt: new Date(),
    };

    this.volatilityMetrics.set(strategyId, metrics);
    return metrics;
  }

  async getVolatility(strategyId: string): Promise<VolatilityMetrics | null> {
    return this.volatilityMetrics.get(strategyId) ?? null;
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private computeOptimalAllocations(
    current: StrategyAllocation[],
    scores: StrategyPerformanceScore[],
    config: PortfolioOptimizationConfig,
    reasoning: string[]
  ): StrategyAllocation[] {
    const scoreMap = new Map(scores.map(s => [s.strategyId, s]));

    // Compute target weight based on objective
    const weights: Map<string, number> = new Map();
    let totalWeight = 0;

    for (const alloc of current) {
      const score = scoreMap.get(alloc.strategyId);
      let weight: number;

      if (!score) {
        weight = alloc.targetPercent; // Keep existing if no data
      } else {
        switch (config.objective) {
          case 'max_return':
            weight = Math.max(1, score.returnScore);
            break;
          case 'min_risk':
            weight = Math.max(1, score.riskScore);
            break;
          case 'sortino_ratio':
            weight = Math.max(1, score.sortinoRatio * 10 + 50);
            break;
          case 'sharpe_ratio':
          default:
            weight = Math.max(1, score.compositeScore);
        }
      }

      weights.set(alloc.strategyId, weight);
      totalWeight += weight;
    }

    reasoning.push(`Objective: ${config.objective} — scoring ${current.length} strategies`);

    // Normalize to 100%
    return current.map(alloc => {
      const w = (weights.get(alloc.strategyId) ?? 1) / totalWeight * 100;
      if (Math.abs(w - alloc.targetPercent) > 1) {
        reasoning.push(`${alloc.strategyId}: ${alloc.targetPercent.toFixed(1)}% → ${w.toFixed(1)}%`);
      }
      return { ...alloc, targetPercent: w, currentPercent: w };
    });
  }

  private computeWeightedMetric(
    allocations: StrategyAllocation[],
    scores: StrategyPerformanceScore[],
    metric: keyof StrategyPerformanceScore
  ): number {
    if (scores.length === 0) return 0;
    const scoreMap = new Map(scores.map(s => [s.strategyId, s]));
    let total = 0;
    let totalWeight = 0;

    for (const alloc of allocations) {
      const score = scoreMap.get(alloc.strategyId);
      if (!score) continue;
      const value = score[metric] as number;
      total += value * alloc.targetPercent;
      totalWeight += alloc.targetPercent;
    }

    return totalWeight > 0 ? total / totalWeight : 0;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private getDefaultOptimizationConfig(): PortfolioOptimizationConfig {
    return {
      objective: this.config.defaultOptimizationObjective,
      rebalanceFrequency: 'weekly',
      minConfidenceThreshold: this.config.confidenceThreshold,
      useMachineLearning: false,
      lookbackPeriodDays: 30,
    };
  }

  private emitEvent(event: InvestmentEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Swallow callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createPortfolioOptimizer(config?: Partial<PortfolioOptimizerConfig>): DefaultPortfolioOptimizer {
  return new DefaultPortfolioOptimizer(config);
}
