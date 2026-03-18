/**
 * TONAIAgent - Strategy Metrics Aggregation
 *
 * Aggregates performance, risk, usage, and community metrics for strategies.
 * Collects data from multiple sources:
 * - Portfolio Engine (#214)
 * - Agent Monitoring (#215)
 * - Strategy Registry (#217)
 * - Trade History
 *
 * Implements Issue #218: Strategy Reputation & Ranking Engine
 */

import {
  StrategyPerformanceMetrics,
  StrategyRiskMetrics,
  StrategyUsageMetrics,
  StrategyCommunityFeedback,
  AggregatedStrategyMetrics,
  RiskLevel,
  ReputationEvent,
  ReputationEventCallback,
} from '../types';

// ============================================================================
// Metrics Aggregator Interface
// ============================================================================

/**
 * Interface for the metrics aggregation engine.
 */
export interface MetricsAggregator {
  // Performance metrics
  getPerformanceMetrics(strategyId: string): StrategyPerformanceMetrics | null;
  updatePerformanceMetrics(strategyId: string, metrics: Partial<StrategyPerformanceMetrics>): StrategyPerformanceMetrics;
  recordTrade(strategyId: string, trade: TradeRecord): void;

  // Risk metrics
  getRiskMetrics(strategyId: string): StrategyRiskMetrics | null;
  updateRiskMetrics(strategyId: string, metrics: Partial<StrategyRiskMetrics>): StrategyRiskMetrics;
  calculateRiskLevel(riskScore: number): RiskLevel;

  // Usage metrics
  getUsageMetrics(strategyId: string): StrategyUsageMetrics | null;
  updateUsageMetrics(strategyId: string, metrics: Partial<StrategyUsageMetrics>): StrategyUsageMetrics;
  recordAgentDeployment(strategyId: string): void;
  recordAgentRemoval(strategyId: string): void;

  // Community feedback
  getCommunityFeedback(strategyId: string): StrategyCommunityFeedback | null;
  updateCommunityFeedback(strategyId: string, feedback: Partial<StrategyCommunityFeedback>): StrategyCommunityFeedback;
  recordRating(strategyId: string, rating: number, verified: boolean): void;

  // Aggregation
  getAggregatedMetrics(strategyId: string): AggregatedStrategyMetrics | null;
  aggregateAllMetrics(strategyId: string): AggregatedStrategyMetrics;

  // Events
  onEvent(callback: ReputationEventCallback): void;
}

/**
 * Trade record for metrics calculation.
 */
export interface TradeRecord {
  /** Trade ID */
  trade_id: string;
  /** Strategy ID */
  strategy_id: string;
  /** Profit/loss amount */
  pnl: number;
  /** Profit/loss percentage */
  pnl_percent: number;
  /** Trade volume */
  volume: number;
  /** Whether the trade was profitable */
  profitable: boolean;
  /** Trade timestamp */
  timestamp: Date;
}

/**
 * Configuration for the metrics aggregator.
 */
export interface MetricsAggregatorConfig {
  /** Risk score threshold for low risk */
  low_risk_threshold: number;
  /** Risk score threshold for high risk */
  high_risk_threshold: number;
  /** Minimum trades for reliable metrics */
  min_trades_for_metrics: number;
  /** Volatility calculation window in days */
  volatility_window_days: number;
}

// ============================================================================
// Default Metrics Aggregator Implementation
// ============================================================================

/**
 * Default implementation of the metrics aggregation engine.
 */
export class DefaultMetricsAggregator implements MetricsAggregator {
  private readonly config: MetricsAggregatorConfig;
  private readonly performanceMetrics: Map<string, StrategyPerformanceMetrics> = new Map();
  private readonly riskMetrics: Map<string, StrategyRiskMetrics> = new Map();
  private readonly usageMetrics: Map<string, StrategyUsageMetrics> = new Map();
  private readonly communityFeedback: Map<string, StrategyCommunityFeedback> = new Map();
  private readonly tradeHistory: Map<string, TradeRecord[]> = new Map();
  private readonly ratingHistory: Map<string, Array<{ rating: number; verified: boolean }>> = new Map();
  private readonly eventCallbacks: ReputationEventCallback[] = [];

  constructor(config?: Partial<MetricsAggregatorConfig>) {
    this.config = {
      low_risk_threshold: config?.low_risk_threshold ?? 0.3,
      high_risk_threshold: config?.high_risk_threshold ?? 0.7,
      min_trades_for_metrics: config?.min_trades_for_metrics ?? 10,
      volatility_window_days: config?.volatility_window_days ?? 30,
    };
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  getPerformanceMetrics(strategyId: string): StrategyPerformanceMetrics | null {
    return this.performanceMetrics.get(strategyId) ?? null;
  }

  updatePerformanceMetrics(
    strategyId: string,
    metrics: Partial<StrategyPerformanceMetrics>
  ): StrategyPerformanceMetrics {
    const existing = this.performanceMetrics.get(strategyId);
    const now = new Date();

    const updated: StrategyPerformanceMetrics = {
      strategy_id: strategyId,
      roi: metrics.roi ?? existing?.roi ?? 0,
      win_rate: metrics.win_rate ?? existing?.win_rate ?? 0,
      max_drawdown: metrics.max_drawdown ?? existing?.max_drawdown ?? 0,
      trade_count: metrics.trade_count ?? existing?.trade_count ?? 0,
      profit_factor: metrics.profit_factor ?? existing?.profit_factor ?? 1,
      sharpe_ratio: metrics.sharpe_ratio ?? existing?.sharpe_ratio,
      sortino_ratio: metrics.sortino_ratio ?? existing?.sortino_ratio,
      updated_at: now,
    };

    this.performanceMetrics.set(strategyId, updated);
    this.emitEvent({
      id: this.generateId('event'),
      type: 'metrics_updated',
      timestamp: now,
      strategy_id: strategyId,
      data: { metric_type: 'performance', metrics: updated },
    });

    return updated;
  }

  recordTrade(strategyId: string, trade: TradeRecord): void {
    const history = this.tradeHistory.get(strategyId) ?? [];
    history.push(trade);
    this.tradeHistory.set(strategyId, history);

    // Recalculate performance metrics
    this.recalculatePerformanceMetrics(strategyId);
  }

  private recalculatePerformanceMetrics(strategyId: string): void {
    const trades = this.tradeHistory.get(strategyId) ?? [];
    if (trades.length < this.config.min_trades_for_metrics) {
      return;
    }

    const totalPnl = trades.reduce((sum, t) => sum + t.pnl_percent, 0);
    const winningTrades = trades.filter(t => t.profitable);
    const losingTrades = trades.filter(t => !t.profitable);

    const roi = totalPnl;
    const winRate = (winningTrades.length / trades.length) * 100;

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const trade of trades) {
      cumulative += trade.pnl_percent;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const grossLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 1;

    this.updatePerformanceMetrics(strategyId, {
      roi,
      win_rate: winRate,
      max_drawdown: -maxDrawdown,
      trade_count: trades.length,
      profit_factor: Math.min(profitFactor, 100), // Cap at 100 for display
    });
  }

  // ============================================================================
  // Risk Metrics
  // ============================================================================

  getRiskMetrics(strategyId: string): StrategyRiskMetrics | null {
    return this.riskMetrics.get(strategyId) ?? null;
  }

  updateRiskMetrics(
    strategyId: string,
    metrics: Partial<StrategyRiskMetrics>
  ): StrategyRiskMetrics {
    const existing = this.riskMetrics.get(strategyId);
    const now = new Date();

    const riskScore = metrics.risk_score ?? existing?.risk_score ?? 0.5;
    const riskLevel = this.calculateRiskLevel(riskScore);

    const updated: StrategyRiskMetrics = {
      strategy_id: strategyId,
      risk_score: riskScore,
      drawdown: metrics.drawdown ?? existing?.drawdown ?? 0,
      volatility: metrics.volatility ?? existing?.volatility ?? 0,
      position_exposure: metrics.position_exposure ?? existing?.position_exposure,
      loss_streak: metrics.loss_streak ?? existing?.loss_streak,
      risk_level: riskLevel,
      updated_at: now,
    };

    this.riskMetrics.set(strategyId, updated);
    this.emitEvent({
      id: this.generateId('event'),
      type: 'metrics_updated',
      timestamp: now,
      strategy_id: strategyId,
      data: { metric_type: 'risk', metrics: updated },
    });

    return updated;
  }

  calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore <= this.config.low_risk_threshold) {
      return 'low';
    }
    if (riskScore >= this.config.high_risk_threshold) {
      return 'high';
    }
    return 'medium';
  }

  // ============================================================================
  // Usage Metrics
  // ============================================================================

  getUsageMetrics(strategyId: string): StrategyUsageMetrics | null {
    return this.usageMetrics.get(strategyId) ?? null;
  }

  updateUsageMetrics(
    strategyId: string,
    metrics: Partial<StrategyUsageMetrics>
  ): StrategyUsageMetrics {
    const existing = this.usageMetrics.get(strategyId);
    const now = new Date();

    const updated: StrategyUsageMetrics = {
      strategy_id: strategyId,
      agents_using: metrics.agents_using ?? existing?.agents_using ?? 0,
      daily_trades: metrics.daily_trades ?? existing?.daily_trades ?? 0,
      volume: metrics.volume ?? existing?.volume ?? 0,
      active_deployments: metrics.active_deployments ?? existing?.active_deployments ?? 0,
      updated_at: now,
    };

    this.usageMetrics.set(strategyId, updated);
    this.emitEvent({
      id: this.generateId('event'),
      type: 'metrics_updated',
      timestamp: now,
      strategy_id: strategyId,
      data: { metric_type: 'usage', metrics: updated },
    });

    return updated;
  }

  recordAgentDeployment(strategyId: string): void {
    const existing = this.usageMetrics.get(strategyId);
    this.updateUsageMetrics(strategyId, {
      agents_using: (existing?.agents_using ?? 0) + 1,
      active_deployments: (existing?.active_deployments ?? 0) + 1,
    });
  }

  recordAgentRemoval(strategyId: string): void {
    const existing = this.usageMetrics.get(strategyId);
    const agentsUsing = Math.max(0, (existing?.agents_using ?? 0) - 1);
    const activeDeployments = Math.max(0, (existing?.active_deployments ?? 0) - 1);
    this.updateUsageMetrics(strategyId, {
      agents_using: agentsUsing,
      active_deployments: activeDeployments,
    });
  }

  // ============================================================================
  // Community Feedback
  // ============================================================================

  getCommunityFeedback(strategyId: string): StrategyCommunityFeedback | null {
    return this.communityFeedback.get(strategyId) ?? null;
  }

  updateCommunityFeedback(
    strategyId: string,
    feedback: Partial<StrategyCommunityFeedback>
  ): StrategyCommunityFeedback {
    const existing = this.communityFeedback.get(strategyId);
    const now = new Date();

    const updated: StrategyCommunityFeedback = {
      strategy_id: strategyId,
      rating: feedback.rating ?? existing?.rating ?? 0,
      reviews: feedback.reviews ?? existing?.reviews ?? 0,
      verified_reviews: feedback.verified_reviews ?? existing?.verified_reviews ?? 0,
      updated_at: now,
    };

    this.communityFeedback.set(strategyId, updated);
    this.emitEvent({
      id: this.generateId('event'),
      type: 'metrics_updated',
      timestamp: now,
      strategy_id: strategyId,
      data: { metric_type: 'community', metrics: updated },
    });

    return updated;
  }

  recordRating(strategyId: string, rating: number, verified: boolean): void {
    const history = this.ratingHistory.get(strategyId) ?? [];
    history.push({ rating, verified });
    this.ratingHistory.set(strategyId, history);

    // Recalculate community feedback
    const totalReviews = history.length;
    const verifiedReviews = history.filter(r => r.verified).length;

    // Calculate weighted average (verified reviews count 1.5x)
    let totalWeight = 0;
    let weightedSum = 0;
    for (const r of history) {
      const weight = r.verified ? 1.5 : 1;
      weightedSum += r.rating * weight;
      totalWeight += weight;
    }
    const avgRating = totalWeight > 0 ? weightedSum / totalWeight : 0;

    this.updateCommunityFeedback(strategyId, {
      rating: Math.round(avgRating * 10) / 10,
      reviews: totalReviews,
      verified_reviews: verifiedReviews,
    });
  }

  // ============================================================================
  // Aggregation
  // ============================================================================

  getAggregatedMetrics(strategyId: string): AggregatedStrategyMetrics | null {
    const performance = this.getPerformanceMetrics(strategyId);
    const risk = this.getRiskMetrics(strategyId);
    const usage = this.getUsageMetrics(strategyId);
    const community = this.getCommunityFeedback(strategyId);

    if (!performance && !risk && !usage && !community) {
      return null;
    }

    return {
      strategy_id: strategyId,
      performance: performance ?? this.createDefaultPerformanceMetrics(strategyId),
      risk: risk ?? this.createDefaultRiskMetrics(strategyId),
      usage: usage ?? this.createDefaultUsageMetrics(strategyId),
      community: community ?? this.createDefaultCommunityFeedback(strategyId),
      aggregated_at: new Date(),
    };
  }

  aggregateAllMetrics(strategyId: string): AggregatedStrategyMetrics {
    const existing = this.getAggregatedMetrics(strategyId);
    if (existing) {
      return existing;
    }

    // Initialize all metrics with defaults
    const performance = this.createDefaultPerformanceMetrics(strategyId);
    const risk = this.createDefaultRiskMetrics(strategyId);
    const usage = this.createDefaultUsageMetrics(strategyId);
    const community = this.createDefaultCommunityFeedback(strategyId);

    this.performanceMetrics.set(strategyId, performance);
    this.riskMetrics.set(strategyId, risk);
    this.usageMetrics.set(strategyId, usage);
    this.communityFeedback.set(strategyId, community);

    return {
      strategy_id: strategyId,
      performance,
      risk,
      usage,
      community,
      aggregated_at: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: ReputationEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: ReputationEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private createDefaultPerformanceMetrics(strategyId: string): StrategyPerformanceMetrics {
    return {
      strategy_id: strategyId,
      roi: 0,
      win_rate: 0,
      max_drawdown: 0,
      trade_count: 0,
      profit_factor: 1,
      updated_at: new Date(),
    };
  }

  private createDefaultRiskMetrics(strategyId: string): StrategyRiskMetrics {
    return {
      strategy_id: strategyId,
      risk_score: 0.5,
      drawdown: 0,
      volatility: 0,
      risk_level: 'medium',
      updated_at: new Date(),
    };
  }

  private createDefaultUsageMetrics(strategyId: string): StrategyUsageMetrics {
    return {
      strategy_id: strategyId,
      agents_using: 0,
      daily_trades: 0,
      volume: 0,
      active_deployments: 0,
      updated_at: new Date(),
    };
  }

  private createDefaultCommunityFeedback(strategyId: string): StrategyCommunityFeedback {
    return {
      strategy_id: strategyId,
      rating: 0,
      reviews: 0,
      verified_reviews: 0,
      updated_at: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new metrics aggregator instance.
 */
export function createMetricsAggregator(
  config?: Partial<MetricsAggregatorConfig>
): DefaultMetricsAggregator {
  return new DefaultMetricsAggregator(config);
}

// Export types
export type {
  StrategyPerformanceMetrics,
  StrategyRiskMetrics,
  StrategyUsageMetrics,
  StrategyCommunityFeedback,
  AggregatedStrategyMetrics,
  RiskLevel,
} from '../types';
