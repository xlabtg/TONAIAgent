/**
 * TONAIAgent - Strategy Ranking Engine
 *
 * Calculates reputation scores and rankings for strategies based on:
 * - Performance metrics (ROI, win rate)
 * - Risk metrics (drawdown, volatility)
 * - Usage metrics (popularity, trading volume)
 * - Community feedback (ratings, reviews)
 *
 * Implements Issue #218: Strategy Reputation & Ranking Engine
 *
 * Reputation Score Formula:
 *   Reputation Score =
 *     (ROI x 0.35)
 *     + (Win Rate x 0.20)
 *     + (Popularity x 0.20)
 *     + (User Rating x 0.15)
 *     - (Drawdown x 0.10)
 */

import {
  StrategyReputationScore,
  ReputationTier,
  ReputationBadge,
  RankingCategory,
  Leaderboard,
  LeaderboardEntry,
  ReputationWeights,
  RankingEngineConfig,
  AggregatedStrategyMetrics,
  RiskLevel,
  ReputationEvent,
  ReputationEventCallback,
} from '../types';

import { MetricsAggregator, DefaultMetricsAggregator, createMetricsAggregator } from '../metrics';

// ============================================================================
// Strategy Ranking Engine Interface
// ============================================================================

/**
 * Interface for the strategy ranking engine.
 */
export interface StrategyRankingEngine {
  // Score calculation
  calculateReputationScore(strategyId: string): StrategyReputationScore | null;
  recalculateAllScores(): void;

  // Strategy management
  registerStrategy(strategyId: string, strategyName: string, authorId: string): StrategyReputationScore;
  updateStrategyMetrics(strategyId: string, metrics: Partial<StrategyMetricsInput>): StrategyReputationScore | null;
  removeStrategy(strategyId: string): void;
  getStrategyScore(strategyId: string): StrategyReputationScore | null;

  // Leaderboards
  getLeaderboard(category: RankingCategory): Leaderboard;
  getAllLeaderboards(): Leaderboard[];

  // Tier and badges
  determineTier(score: number, metrics: AggregatedStrategyMetrics): ReputationTier;
  computeBadges(score: StrategyReputationScore, metrics: AggregatedStrategyMetrics): ReputationBadge[];

  // Metrics access
  getMetricsAggregator(): MetricsAggregator;

  // Events
  onEvent(callback: ReputationEventCallback): void;
}

/**
 * Input for updating strategy metrics.
 */
export interface StrategyMetricsInput {
  // Performance
  roi?: number;
  win_rate?: number;
  max_drawdown?: number;
  trade_count?: number;
  profit_factor?: number;
  sharpe_ratio?: number;

  // Risk
  risk_score?: number;
  volatility?: number;

  // Usage
  agents_using?: number;
  daily_trades?: number;
  volume?: number;

  // Community
  rating?: number;
  reviews?: number;
}

/**
 * Internal strategy data for ranking.
 */
interface StrategyData {
  strategy_id: string;
  strategy_name: string;
  author_id: string;
  registered_at: Date;
}

// ============================================================================
// Default Ranking Engine Implementation
// ============================================================================

/**
 * Default implementation of the strategy ranking engine.
 */
export class DefaultStrategyRankingEngine implements StrategyRankingEngine {
  private readonly config: RankingEngineConfig;
  private readonly metricsAggregator: DefaultMetricsAggregator;
  private readonly strategies: Map<string, StrategyData> = new Map();
  private readonly scores: Map<string, StrategyReputationScore> = new Map();
  private readonly eventCallbacks: ReputationEventCallback[] = [];

  constructor(config?: Partial<RankingEngineConfig>) {
    this.config = {
      weights: {
        roi: config?.weights?.roi ?? 0.35,
        win_rate: config?.weights?.win_rate ?? 0.20,
        popularity: config?.weights?.popularity ?? 0.20,
        user_rating: config?.weights?.user_rating ?? 0.15,
        drawdown_penalty: config?.weights?.drawdown_penalty ?? 0.10,
      },
      update_interval_minutes: config?.update_interval_minutes ?? 10,
      leaderboard_size: config?.leaderboard_size ?? 100,
      min_history_for_trusted: config?.min_history_for_trusted ?? 90,
      min_investors_for_elite: config?.min_investors_for_elite ?? 50,
    };

    this.metricsAggregator = createMetricsAggregator();

    // Forward metrics events
    this.metricsAggregator.onEvent((event) => {
      this.emitEvent(event);
    });
  }

  // ============================================================================
  // Score Calculation
  // ============================================================================

  calculateReputationScore(strategyId: string): StrategyReputationScore | null {
    const strategyData = this.strategies.get(strategyId);
    if (!strategyData) {
      return null;
    }

    const metrics = this.metricsAggregator.aggregateAllMetrics(strategyId);
    const weights = this.config.weights;

    // Normalize ROI to 0-100 scale
    // Map ROI: -50% -> 0, 0% -> 50, +50% -> 100
    const normalizedRoi = Math.min(100, Math.max(0, metrics.performance.roi + 50));

    // Win rate is already 0-100
    const normalizedWinRate = Math.min(100, Math.max(0, metrics.performance.win_rate));

    // Normalize popularity based on agents using (log scale)
    // 0 agents -> 0, 10 agents -> 50, 100+ agents -> 100
    const popularityScore = Math.min(100, Math.log1p(metrics.usage.agents_using) * 20);

    // Normalize rating from 1-5 to 0-100
    const normalizedRating = ((metrics.community.rating - 1) / 4) * 100;

    // Drawdown penalty (already negative, convert to positive penalty)
    const drawdownPenalty = Math.min(50, Math.abs(metrics.performance.max_drawdown));

    // Calculate component scores
    const performanceScore = normalizedRoi * 0.6 + normalizedWinRate * 0.4;
    const riskScore = 100 - (drawdownPenalty * 2); // Higher score = lower risk
    const popularityComponentScore = popularityScore;
    const communityScore = normalizedRating;

    // Calculate weighted overall score
    const reputationScore = Math.min(
      100,
      Math.max(
        0,
        performanceScore * weights.roi +
        normalizedWinRate * weights.win_rate +
        popularityComponentScore * weights.popularity +
        communityScore * weights.user_rating -
        drawdownPenalty * weights.drawdown_penalty
      )
    );

    // Determine tier
    const tier = this.determineTier(reputationScore, metrics);

    // Get previous score for rank tracking
    const previousScore = this.scores.get(strategyId);
    const previousRank = previousScore?.rank;

    // Build score object
    const score: StrategyReputationScore = {
      strategy_id: strategyId,
      reputation_score: Math.round(reputationScore * 10) / 10,
      performance_score: Math.round(performanceScore * 10) / 10,
      risk_score: Math.round(riskScore * 10) / 10,
      popularity_score: Math.round(popularityComponentScore * 10) / 10,
      community_score: Math.round(communityScore * 10) / 10,
      tier,
      badges: [],
      previous_rank: previousRank,
      calculated_at: new Date(),
    };

    // Compute badges
    score.badges = this.computeBadges(score, metrics);

    // Store the score
    this.scores.set(strategyId, score);

    // Update ranks
    this.updateRanks();

    // Emit event
    this.emitEvent({
      id: this.generateId('event'),
      type: 'score_calculated',
      timestamp: new Date(),
      strategy_id: strategyId,
      data: { score: score.reputation_score, tier, badges: score.badges },
    });

    // Check for tier change
    if (previousScore && previousScore.tier !== tier) {
      this.emitEvent({
        id: this.generateId('event'),
        type: 'tier_changed',
        timestamp: new Date(),
        strategy_id: strategyId,
        data: { old_tier: previousScore.tier, new_tier: tier },
      });
    }

    return score;
  }

  recalculateAllScores(): void {
    for (const strategyId of this.strategies.keys()) {
      this.calculateReputationScore(strategyId);
    }

    this.emitEvent({
      id: this.generateId('event'),
      type: 'ranking_updated',
      timestamp: new Date(),
      data: { strategies_count: this.strategies.size },
    });
  }

  // ============================================================================
  // Strategy Management
  // ============================================================================

  registerStrategy(
    strategyId: string,
    strategyName: string,
    authorId: string
  ): StrategyReputationScore {
    const now = new Date();

    this.strategies.set(strategyId, {
      strategy_id: strategyId,
      strategy_name: strategyName,
      author_id: authorId,
      registered_at: now,
    });

    // Initialize metrics
    this.metricsAggregator.aggregateAllMetrics(strategyId);

    // Calculate initial score
    const score = this.calculateReputationScore(strategyId)!;

    return score;
  }

  updateStrategyMetrics(
    strategyId: string,
    metrics: Partial<StrategyMetricsInput>
  ): StrategyReputationScore | null {
    if (!this.strategies.has(strategyId)) {
      return null;
    }

    // Update performance metrics
    if (metrics.roi !== undefined || metrics.win_rate !== undefined ||
        metrics.max_drawdown !== undefined || metrics.trade_count !== undefined ||
        metrics.profit_factor !== undefined || metrics.sharpe_ratio !== undefined) {
      this.metricsAggregator.updatePerformanceMetrics(strategyId, {
        roi: metrics.roi,
        win_rate: metrics.win_rate,
        max_drawdown: metrics.max_drawdown,
        trade_count: metrics.trade_count,
        profit_factor: metrics.profit_factor,
        sharpe_ratio: metrics.sharpe_ratio,
      });
    }

    // Update risk metrics
    if (metrics.risk_score !== undefined || metrics.volatility !== undefined) {
      this.metricsAggregator.updateRiskMetrics(strategyId, {
        risk_score: metrics.risk_score,
        volatility: metrics.volatility,
        drawdown: metrics.max_drawdown,
      });
    }

    // Update usage metrics
    if (metrics.agents_using !== undefined || metrics.daily_trades !== undefined ||
        metrics.volume !== undefined) {
      this.metricsAggregator.updateUsageMetrics(strategyId, {
        agents_using: metrics.agents_using,
        daily_trades: metrics.daily_trades,
        volume: metrics.volume,
      });
    }

    // Update community feedback
    if (metrics.rating !== undefined || metrics.reviews !== undefined) {
      this.metricsAggregator.updateCommunityFeedback(strategyId, {
        rating: metrics.rating,
        reviews: metrics.reviews,
      });
    }

    // Recalculate score
    return this.calculateReputationScore(strategyId);
  }

  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
    this.scores.delete(strategyId);
    this.updateRanks();
  }

  getStrategyScore(strategyId: string): StrategyReputationScore | null {
    return this.scores.get(strategyId) ?? null;
  }

  // ============================================================================
  // Leaderboards
  // ============================================================================

  getLeaderboard(category: RankingCategory): Leaderboard {
    const entries = this.buildLeaderboardEntries(category);
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + this.config.update_interval_minutes * 60 * 1000);

    const categoryNames: Record<RankingCategory, string> = {
      top_performing: 'Top Performing',
      most_popular: 'Most Popular',
      low_risk: 'Low Risk',
      new_strategies: 'New Strategies',
      trending: 'Trending',
    };

    return {
      category,
      category_name: categoryNames[category],
      entries,
      generated_at: now,
      next_update: nextUpdate,
    };
  }

  getAllLeaderboards(): Leaderboard[] {
    const categories: RankingCategory[] = [
      'top_performing',
      'most_popular',
      'low_risk',
      'new_strategies',
      'trending',
    ];

    return categories.map(category => this.getLeaderboard(category));
  }

  private buildLeaderboardEntries(category: RankingCategory): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const [strategyId, strategyData] of this.strategies.entries()) {
      const score = this.scores.get(strategyId);
      if (!score) continue;

      const metrics = this.metricsAggregator.getAggregatedMetrics(strategyId);
      if (!metrics) continue;

      entries.push({
        rank: 0, // Will be set after sorting
        previous_rank: score.previous_rank,
        strategy_id: strategyId,
        strategy_name: strategyData.strategy_name,
        author_id: strategyData.author_id,
        reputation_score: score.reputation_score,
        roi: metrics.performance.roi,
        risk: metrics.risk.risk_level,
        badges: score.badges,
        agents_using: metrics.usage.agents_using,
        avg_rating: metrics.community.rating,
      });
    }

    // Sort based on category
    switch (category) {
      case 'top_performing':
        entries.sort((a, b) => b.reputation_score - a.reputation_score);
        break;
      case 'most_popular':
        entries.sort((a, b) => b.agents_using - a.agents_using);
        break;
      case 'low_risk':
        entries.sort((a, b) => {
          const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
          return riskOrder[a.risk] - riskOrder[b.risk];
        });
        break;
      case 'new_strategies':
        entries.sort((a, b) => {
          const dataA = this.strategies.get(a.strategy_id);
          const dataB = this.strategies.get(b.strategy_id);
          return (dataB?.registered_at.getTime() ?? 0) - (dataA?.registered_at.getTime() ?? 0);
        });
        break;
      case 'trending':
        // Sort by combination of recent popularity growth and rating
        entries.sort((a, b) => {
          const trendA = a.agents_using * 0.6 + a.avg_rating * 8 * 0.4;
          const trendB = b.agents_using * 0.6 + b.avg_rating * 8 * 0.4;
          return trendB - trendA;
        });
        break;
    }

    // Assign ranks and limit
    return entries.slice(0, this.config.leaderboard_size).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }

  private updateRanks(): void {
    const sortedScores = Array.from(this.scores.entries())
      .sort((a, b) => b[1].reputation_score - a[1].reputation_score);

    sortedScores.forEach(([strategyId, score], idx) => {
      score.rank = idx + 1;
      this.scores.set(strategyId, score);
    });
  }

  // ============================================================================
  // Tier and Badges
  // ============================================================================

  determineTier(score: number, metrics: AggregatedStrategyMetrics): ReputationTier {
    const daysSinceRegistration = this.getDaysSinceRegistration(metrics.strategy_id);
    const hasHistory = daysSinceRegistration >= this.config.min_history_for_trusted;
    const hasInvestors = metrics.usage.agents_using >= this.config.min_investors_for_elite;

    if (score >= 85 && hasHistory && hasInvestors) {
      return 'elite';
    }
    if (score >= 70 && hasHistory) {
      return 'trusted';
    }
    if (score >= 50) {
      return 'established';
    }
    return 'emerging';
  }

  computeBadges(
    score: StrategyReputationScore,
    metrics: AggregatedStrategyMetrics
  ): ReputationBadge[] {
    const badges: ReputationBadge[] = [];

    // Top Performer: high performance score
    if (score.performance_score >= 80) {
      badges.push('top_performer');
    }

    // Low Risk: low drawdown AND risk level is low
    if (Math.abs(metrics.performance.max_drawdown) <= 10 && metrics.risk.risk_level === 'low') {
      badges.push('low_risk');
    }

    // Verified: long history and sufficient reviews
    const daysSinceRegistration = this.getDaysSinceRegistration(metrics.strategy_id);
    if (daysSinceRegistration >= 30 && metrics.community.reviews >= 5) {
      badges.push('verified');
    }

    // Trending: high active users relative to age
    if (metrics.usage.agents_using >= 20) {
      badges.push('trending');
    }

    // Most Trusted: high rating with many verified reviews
    if (metrics.community.rating >= 4.5 && metrics.community.verified_reviews >= 10) {
      badges.push('most_trusted');
    }

    // Most Consistent: high risk score (low risk)
    if (score.risk_score >= 80) {
      badges.push('most_consistent');
    }

    // High Volume: significant trading volume
    if (metrics.usage.volume >= 100000) {
      badges.push('high_volume');
    }

    // New Strategy: registered within last 7 days
    if (daysSinceRegistration <= 7) {
      badges.push('new_strategy');
    }

    // Emit badge earned events for new badges
    const previousScore = this.scores.get(metrics.strategy_id);
    if (previousScore) {
      const newBadges = badges.filter(b => !previousScore.badges.includes(b));
      for (const badge of newBadges) {
        this.emitEvent({
          id: this.generateId('event'),
          type: 'badge_earned',
          timestamp: new Date(),
          strategy_id: metrics.strategy_id,
          data: { badge },
        });
      }
    }

    return badges;
  }

  private getDaysSinceRegistration(strategyId: string): number {
    const strategyData = this.strategies.get(strategyId);
    if (!strategyData) return 0;

    const now = new Date();
    const diff = now.getTime() - strategyData.registered_at.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // ============================================================================
  // Metrics Access
  // ============================================================================

  getMetricsAggregator(): MetricsAggregator {
    return this.metricsAggregator;
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
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new strategy ranking engine instance.
 */
export function createStrategyRankingEngine(
  config?: Partial<RankingEngineConfig>
): DefaultStrategyRankingEngine {
  return new DefaultStrategyRankingEngine(config);
}

// Export types
export type {
  StrategyReputationScore,
  ReputationTier,
  ReputationBadge,
  RankingCategory,
  Leaderboard,
  LeaderboardEntry,
  ReputationWeights,
  RankingEngineConfig,
} from '../types';
