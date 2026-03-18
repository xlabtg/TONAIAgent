/**
 * TONAIAgent - Strategy Reputation & Ranking Engine
 *
 * Evaluates strategies based on performance, risk adjustment, stability, and
 * user reputation to produce composite scores and sortable leaderboards.
 *
 * Scoring model:
 *   Overall Score = Performance Score + Risk Adjustment + Stability Score + Reputation Score
 *
 * Integration with Risk Engine v1 data via risk adjustment factor.
 */

import {
  StrategyRankingScore,
  StrategyRankingTier,
  StrategyBadge,
  StrategyRankingEntry,
  StrategyRankingHighlights,
  RankingLeaderboard,
  StrategyRankingCategory,
  StrategyRankingSortField,
  AnalyticsPeriod,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Ranking Engine Interface
// ============================================================================

export interface StrategyRankingInput {
  strategyId: string;
  strategyName: string;
  creatorId: string;
  publishedAt: Date;
  // Performance metrics
  roi30d: number;
  roi90d?: number;
  roi365d?: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  maxDrawdown: number; // percentage (positive number)
  winRate: number; // 0-100
  profitFactor?: number;
  // Risk metrics
  volatility: number; // annualized, percentage
  leverageUsed?: number; // 1 = no leverage
  // User/reputation metrics
  avgUserRating: number; // 1-5
  ratingCount: number;
  activeInvestors: number;
  totalAUM: number; // in TON
  // History
  monthsOfHistory: number;
  positiveMonthsPercent?: number; // 0-100
}

export interface RankingEngine {
  // Score calculation
  calculateScore(input: StrategyRankingInput): StrategyRankingScore;
  recalculateAll(): void;

  // Leaderboard management
  getLeaderboard(category: RankingLeaderboard['category'], period?: AnalyticsPeriod): RankingLeaderboard;
  getCategories(): StrategyRankingCategory[];
  getRankingEntry(strategyId: string): StrategyRankingEntry | null;

  // Strategy registration for ongoing tracking
  registerStrategy(input: StrategyRankingInput): StrategyRankingScore;
  updateStrategy(strategyId: string, updates: Partial<StrategyRankingInput>): StrategyRankingScore;
  removeStrategy(strategyId: string): void;

  // Badges
  computeBadges(score: StrategyRankingScore, input: StrategyRankingInput): StrategyBadge[];

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default Ranking Engine Config
// ============================================================================

export interface RankingEngineConfig {
  performanceWeight: number;
  riskWeight: number;
  stabilityWeight: number;
  reputationWeight: number;
  minHistoryDaysForTrusted: number;
  minInvestorsForElite: number;
  leaderboardSize: number;
}

// ============================================================================
// Default Ranking Engine Implementation
// ============================================================================

export class DefaultRankingEngine implements RankingEngine {
  private readonly config: RankingEngineConfig;
  private readonly strategies: Map<string, StrategyRankingInput> = new Map();
  private readonly scores: Map<string, StrategyRankingScore> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];

  constructor(config?: Partial<RankingEngineConfig>) {
    this.config = {
      performanceWeight: config?.performanceWeight ?? 0.35,
      riskWeight: config?.riskWeight ?? 0.25,
      stabilityWeight: config?.stabilityWeight ?? 0.20,
      reputationWeight: config?.reputationWeight ?? 0.20,
      minHistoryDaysForTrusted: config?.minHistoryDaysForTrusted ?? 90,
      minInvestorsForElite: config?.minInvestorsForElite ?? 50,
      leaderboardSize: config?.leaderboardSize ?? 100,
    };
  }

  calculateScore(input: StrategyRankingInput): StrategyRankingScore {
    const performanceScore = this.calcPerformanceScore(input);
    const riskAdjustmentScore = this.calcRiskAdjustmentScore(input);
    const stabilityScore = this.calcStabilityScore(input);
    const reputationScore = this.calcReputationScore(input);

    const { performanceWeight, riskWeight, stabilityWeight, reputationWeight } = this.config;

    const overallScore = Math.min(
      100,
      Math.max(
        0,
        performanceScore * performanceWeight +
          riskAdjustmentScore * riskWeight +
          stabilityScore * stabilityWeight +
          reputationScore * reputationWeight,
      ),
    );

    const tier = this.calcTier(input, overallScore);
    const badges = this.computeBadges(
      // Partial score object for badge computation
      {
        strategyId: input.strategyId,
        overallScore,
        performanceScore,
        riskAdjustmentScore,
        stabilityScore,
        reputationScore,
        badges: [],
        tier,
        calculatedAt: new Date(),
      },
      input,
    );

    const score: StrategyRankingScore = {
      strategyId: input.strategyId,
      overallScore: Math.round(overallScore * 100) / 100,
      performanceScore: Math.round(performanceScore * 100) / 100,
      riskAdjustmentScore: Math.round(riskAdjustmentScore * 100) / 100,
      stabilityScore: Math.round(stabilityScore * 100) / 100,
      reputationScore: Math.round(reputationScore * 100) / 100,
      badges,
      tier,
      calculatedAt: new Date(),
    };

    return score;
  }

  recalculateAll(): void {
    for (const [strategyId, input] of this.strategies.entries()) {
      const previousScore = this.scores.get(strategyId);
      const newScore = this.calculateScore(input);
      this.scores.set(strategyId, newScore);

      if (previousScore && Math.abs(newScore.overallScore - previousScore.overallScore) >= 1) {
        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'ranking_updated',
          severity: 'info',
          source: 'ranking_engine',
          message: `Strategy ${strategyId} score updated to ${newScore.overallScore.toFixed(1)}`,
          data: { strategyId, previousScore: previousScore.overallScore, newScore: newScore.overallScore },
        });
      }
    }
  }

  registerStrategy(input: StrategyRankingInput): StrategyRankingScore {
    this.strategies.set(input.strategyId, input);
    const score = this.calculateScore(input);
    this.scores.set(input.strategyId, score);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'ranking_updated',
      severity: 'info',
      source: 'ranking_engine',
      message: `Strategy ${input.strategyId} registered with score ${score.overallScore.toFixed(1)}`,
      data: { strategyId: input.strategyId, score: score.overallScore, tier: score.tier },
    });

    return score;
  }

  updateStrategy(strategyId: string, updates: Partial<StrategyRankingInput>): StrategyRankingScore {
    const existing = this.strategies.get(strategyId);
    if (!existing) {
      throw new Error(`Strategy not found in ranking engine: ${strategyId}`);
    }

    const updated = { ...existing, ...updates };
    this.strategies.set(strategyId, updated);
    const score = this.calculateScore(updated);
    this.scores.set(strategyId, score);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'ranking_updated',
      severity: 'info',
      source: 'ranking_engine',
      message: `Strategy ${strategyId} score recalculated to ${score.overallScore.toFixed(1)}`,
      data: { strategyId, score: score.overallScore, tier: score.tier },
    });

    return score;
  }

  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
    this.scores.delete(strategyId);
  }

  getLeaderboard(
    category: RankingLeaderboard['category'],
    period: AnalyticsPeriod = '30d',
  ): RankingLeaderboard {
    const entries = this.buildLeaderboardEntries(category);

    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    return {
      id: `leaderboard_${category}_${period}`,
      category,
      entries,
      period,
      generatedAt: now,
      nextUpdate,
    };
  }

  getCategories(): StrategyRankingCategory[] {
    const sortFields: Array<{ id: string; name: string; description: string; sortField: StrategyRankingSortField }> = [
      {
        id: 'top_performing',
        name: 'Top Performing',
        description: 'Strategies with the highest risk-adjusted returns',
        sortField: 'performance_score',
      },
      {
        id: 'lowest_risk',
        name: 'Lowest Risk',
        description: 'Strategies with the best risk control and minimal drawdowns',
        sortField: 'risk_adjusted',
      },
      {
        id: 'most_trusted',
        name: 'Most Trusted',
        description: 'Strategies with highest user ratings and active investor base',
        sortField: 'reputation_score',
      },
      {
        id: 'most_consistent',
        name: 'Most Consistent',
        description: 'Strategies with the most stable historical performance',
        sortField: 'stability_score',
      },
    ];

    const now = new Date();

    return sortFields.map(sf => {
      const entries = this.buildSortedEntries(sf.sortField);
      return {
        id: sf.id,
        name: sf.name,
        description: sf.description,
        sortField: sf.sortField,
        entries,
        generatedAt: now,
      };
    });
  }

  getRankingEntry(strategyId: string): StrategyRankingEntry | null {
    const score = this.scores.get(strategyId);
    const input = this.strategies.get(strategyId);
    if (!score || !input) return null;

    // Compute rank from overall sorted list
    const allEntries = this.buildSortedEntries('overall_score');
    const rank = allEntries.findIndex(e => e.strategyId === strategyId) + 1;

    return {
      rank: rank > 0 ? rank : allEntries.length + 1,
      strategyId,
      strategyName: input.strategyName,
      creatorId: input.creatorId,
      score: { ...score, rank },
      highlights: this.buildHighlights(input),
    };
  }

  computeBadges(score: StrategyRankingScore, input: StrategyRankingInput): StrategyBadge[] {
    const badges: StrategyBadge[] = [];

    // Top Performer: high performance score
    if (score.performanceScore >= 80) {
      badges.push('top_performer');
    }

    // Low Risk: low drawdown AND low volatility
    if (input.maxDrawdown <= 10 && input.volatility <= 15) {
      badges.push('low_risk');
    }

    // Verified: long history and sufficient data
    if (input.monthsOfHistory >= 6 && input.ratingCount >= 5) {
      badges.push('verified');
    }

    // Trending: high active investors relative to peers
    if (input.activeInvestors >= 20) {
      badges.push('trending');
    }

    // Most Trusted: high average rating with multiple verified reviews
    if (input.avgUserRating >= 4.5 && input.ratingCount >= 10) {
      badges.push('most_trusted');
    }

    // Most Consistent: high stability score
    if (score.stabilityScore >= 80) {
      badges.push('most_consistent');
    }

    // High AUM
    if (input.totalAUM >= 100_000) {
      badges.push('high_aum');
    }

    return badges;
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Scoring Methods
  // ============================================================================

  private calcPerformanceScore(input: StrategyRankingInput): number {
    let score = 0;

    // ROI contribution (30-day primary, with bonuses for longer periods)
    // Map roi30d: -50% → 0, 0% → 50, +50% → 100
    const roiScore = Math.min(100, Math.max(0, input.roi30d + 50));
    score += roiScore * 0.40;

    // Sharpe ratio contribution — excellent >2, good >1, ok >0
    // Map: <0 → 0, 0 → 40, 1 → 60, 2 → 80, 3+ → 100
    const sharpeScore = Math.min(100, Math.max(0, input.sharpeRatio * 30 + 40));
    score += sharpeScore * 0.30;

    // Win rate contribution
    score += input.winRate * 0.20;

    // Profit factor contribution (>1 = profitable, 2+ = strong)
    const profitFactor = input.profitFactor ?? 1;
    const pfScore = Math.min(100, Math.max(0, (profitFactor - 1) * 50));
    score += pfScore * 0.10;

    return Math.min(100, Math.max(0, score));
  }

  private calcRiskAdjustmentScore(input: StrategyRankingInput): number {
    // Risk adjustment: start at 100 and subtract penalties for bad risk factors
    let score = 100;

    // Max drawdown penalty — ideally <10%, extreme >50%
    // drawdown 0% → -0, 10% → -10, 25% → -35, 50%+ → -70
    const drawdownPenalty = Math.min(70, input.maxDrawdown * 1.4);
    score -= drawdownPenalty;

    // Volatility penalty — ideally <20% annualized
    // vol 0 → -0, 20% → -10, 50%+ → -30
    const volPenalty = Math.min(30, Math.max(0, (input.volatility - 20) * 0.6));
    score -= volPenalty;

    // Leverage penalty
    const leverage = input.leverageUsed ?? 1;
    if (leverage > 2) {
      score -= Math.min(20, (leverage - 2) * 5);
    }

    return Math.min(100, Math.max(0, score));
  }

  private calcStabilityScore(input: StrategyRankingInput): number {
    let score = 0;

    // History length contribution — longer history = higher trust
    // <1 month → 10, 3 months → 40, 6 months → 60, 12 months → 80, 24+ months → 100
    const historyScore = Math.min(100, (input.monthsOfHistory / 24) * 100);
    score += historyScore * 0.50;

    // Positive months percent contribution
    const positiveMonths = input.positiveMonthsPercent ?? 50;
    score += positiveMonths * 0.30;

    // Sortino ratio contribution (downside risk-adjusted)
    const sortinoRatio = input.sortinoRatio ?? input.sharpeRatio;
    const sortinoScore = Math.min(100, Math.max(0, sortinoRatio * 30 + 40));
    score += sortinoScore * 0.20;

    return Math.min(100, Math.max(0, score));
  }

  private calcReputationScore(input: StrategyRankingInput): number {
    let score = 0;

    // User rating contribution (1-5 scale → 0-100)
    const ratingScore = ((input.avgUserRating - 1) / 4) * 100;
    // Weight by review count (more reviews = more reliable)
    const ratingWeight = Math.min(1, input.ratingCount / 20); // saturates at 20 reviews
    score += (ratingScore * ratingWeight + 50 * (1 - ratingWeight)) * 0.40;

    // Active investors contribution
    // 0 → 0, 10 → 30, 50 → 60, 200+ → 100
    const investorScore = Math.min(100, Math.log1p(input.activeInvestors) * 20);
    score += investorScore * 0.30;

    // Strategy age / longevity contribution (trust increases over time)
    // Same as history length but for reputation framing
    const ageScore = Math.min(100, (input.monthsOfHistory / 18) * 100);
    score += ageScore * 0.30;

    return Math.min(100, Math.max(0, score));
  }

  private calcTier(input: StrategyRankingInput, overallScore: number): StrategyRankingTier {
    const hasHistory = input.monthsOfHistory >= this.config.minHistoryDaysForTrusted / 30;
    const hasInvestors = input.activeInvestors >= this.config.minInvestorsForElite;

    if (overallScore >= 85 && hasHistory && hasInvestors) return 'elite';
    if (overallScore >= 70 && hasHistory) return 'trusted';
    if (overallScore >= 50) return 'established';
    return 'emerging';
  }

  private buildHighlights(input: StrategyRankingInput): StrategyRankingHighlights {
    return {
      roi30d: input.roi30d,
      sharpeRatio: input.sharpeRatio,
      maxDrawdown: input.maxDrawdown,
      winRate: input.winRate,
      activeInvestors: input.activeInvestors,
      totalAUM: input.totalAUM,
      avgRating: input.avgUserRating,
      strategyAgeDays: input.monthsOfHistory * 30,
    };
  }

  private buildSortedEntries(sortField: StrategyRankingSortField): StrategyRankingEntry[] {
    const entries: StrategyRankingEntry[] = [];

    for (const [strategyId, input] of this.strategies.entries()) {
      const score = this.scores.get(strategyId);
      if (!score) continue;

      entries.push({
        rank: 0, // Will be assigned after sort
        strategyId,
        strategyName: input.strategyName,
        creatorId: input.creatorId,
        score,
        highlights: this.buildHighlights(input),
      });
    }

    // Sort by the requested field
    entries.sort((a, b) => {
      switch (sortField) {
        case 'performance_score':
          return b.score.performanceScore - a.score.performanceScore;
        case 'risk_adjusted':
          return b.score.riskAdjustmentScore - a.score.riskAdjustmentScore;
        case 'reputation_score':
          return b.score.reputationScore - a.score.reputationScore;
        case 'stability_score':
          return b.score.stabilityScore - a.score.stabilityScore;
        case 'trending':
          return b.highlights.activeInvestors - a.highlights.activeInvestors;
        case 'overall_score':
        default:
          return b.score.overallScore - a.score.overallScore;
      }
    });

    // Assign ranks after sorting
    return entries
      .slice(0, this.config.leaderboardSize)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        score: { ...entry.score, rank: idx + 1 },
      }));
  }

  private buildLeaderboardEntries(category: RankingLeaderboard['category']): StrategyRankingEntry[] {
    const sortFieldMap: Record<RankingLeaderboard['category'], StrategyRankingSortField> = {
      top_performing: 'performance_score',
      lowest_risk: 'risk_adjusted',
      trending: 'trending',
      most_trusted: 'reputation_score',
    };

    return this.buildSortedEntries(sortFieldMap[category]);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRankingEngine(config?: Partial<RankingEngineConfig>): DefaultRankingEngine {
  return new DefaultRankingEngine(config);
}
