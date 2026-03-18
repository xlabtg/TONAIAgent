/**
 * TONAIAgent - Strategy Reputation & Ranking Engine Types
 *
 * Type definitions for the Strategy Reputation & Ranking Engine (Issue #218).
 * These types define the data structures for strategy metrics, reputation scores,
 * rankings, and leaderboards.
 */

// ============================================================================
// Strategy Performance Metrics
// ============================================================================

/**
 * Core performance metrics for a strategy.
 * These metrics are used to calculate the reputation score.
 */
export interface StrategyPerformanceMetrics {
  /** Strategy identifier */
  strategy_id: string;
  /** Return on investment as a percentage */
  roi: number;
  /** Win rate as a percentage (0-100) */
  win_rate: number;
  /** Maximum drawdown as a percentage (negative value) */
  max_drawdown: number;
  /** Total number of trades executed */
  trade_count: number;
  /** Profit factor (gross profit / gross loss) */
  profit_factor: number;
  /** Sharpe ratio for risk-adjusted returns */
  sharpe_ratio?: number;
  /** Sortino ratio for downside risk-adjusted returns */
  sortino_ratio?: number;
  /** Last update timestamp */
  updated_at: Date;
}

// ============================================================================
// Risk Metrics
// ============================================================================

/**
 * Risk metrics for a strategy.
 */
export interface StrategyRiskMetrics {
  /** Strategy identifier */
  strategy_id: string;
  /** Composite risk score (0-1, higher = riskier) */
  risk_score: number;
  /** Maximum drawdown as a percentage */
  drawdown: number;
  /** Volatility measure (annualized standard deviation) */
  volatility: number;
  /** Maximum position exposure percentage */
  position_exposure?: number;
  /** Longest consecutive loss streak */
  loss_streak?: number;
  /** Risk level classification */
  risk_level: RiskLevel;
  /** Last update timestamp */
  updated_at: Date;
}

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high';

// ============================================================================
// Usage Metrics
// ============================================================================

/**
 * Usage and popularity metrics for a strategy.
 */
export interface StrategyUsageMetrics {
  /** Strategy identifier */
  strategy_id: string;
  /** Number of agents currently using this strategy */
  agents_using: number;
  /** Number of daily trades across all agents */
  daily_trades: number;
  /** Total trading volume in TON */
  volume: number;
  /** Active deployments count */
  active_deployments: number;
  /** Last update timestamp */
  updated_at: Date;
}

// ============================================================================
// Community Feedback
// ============================================================================

/**
 * Community feedback and ratings for a strategy.
 */
export interface StrategyCommunityFeedback {
  /** Strategy identifier */
  strategy_id: string;
  /** Average rating (1-5 stars) */
  rating: number;
  /** Total number of reviews */
  reviews: number;
  /** Verified reviews count */
  verified_reviews: number;
  /** Last update timestamp */
  updated_at: Date;
}

// ============================================================================
// Aggregated Strategy Metrics
// ============================================================================

/**
 * Aggregated metrics combining all metric types for a strategy.
 */
export interface AggregatedStrategyMetrics {
  /** Strategy identifier */
  strategy_id: string;
  /** Performance metrics */
  performance: StrategyPerformanceMetrics;
  /** Risk metrics */
  risk: StrategyRiskMetrics;
  /** Usage metrics */
  usage: StrategyUsageMetrics;
  /** Community feedback */
  community: StrategyCommunityFeedback;
  /** Aggregation timestamp */
  aggregated_at: Date;
}

// ============================================================================
// Reputation Score
// ============================================================================

/**
 * Reputation score for a strategy.
 */
export interface StrategyReputationScore {
  /** Strategy identifier */
  strategy_id: string;
  /** Overall reputation score (0-100) */
  reputation_score: number;
  /** Performance component score (0-100) */
  performance_score: number;
  /** Risk component score (0-100, lower risk = higher score) */
  risk_score: number;
  /** Popularity component score (0-100) */
  popularity_score: number;
  /** Community rating component score (0-100) */
  community_score: number;
  /** Reputation tier */
  tier: ReputationTier;
  /** Earned badges */
  badges: ReputationBadge[];
  /** Rank position in overall leaderboard */
  rank?: number;
  /** Previous rank position */
  previous_rank?: number;
  /** Score calculation timestamp */
  calculated_at: Date;
}

/** Reputation tier classification */
export type ReputationTier = 'emerging' | 'established' | 'trusted' | 'elite';

/** Reputation badges that can be earned */
export type ReputationBadge =
  | 'top_performer'
  | 'low_risk'
  | 'verified'
  | 'trending'
  | 'most_trusted'
  | 'most_consistent'
  | 'high_volume'
  | 'new_strategy';

// ============================================================================
// Ranking Categories
// ============================================================================

/** Strategy ranking categories */
export type RankingCategory =
  | 'top_performing'
  | 'most_popular'
  | 'low_risk'
  | 'new_strategies'
  | 'trending';

/**
 * Leaderboard entry for a strategy.
 */
export interface LeaderboardEntry {
  /** Rank position */
  rank: number;
  /** Previous rank position */
  previous_rank?: number;
  /** Strategy identifier */
  strategy_id: string;
  /** Strategy name */
  strategy_name: string;
  /** Strategy author/developer ID */
  author_id: string;
  /** Reputation score */
  reputation_score: number;
  /** ROI percentage */
  roi: number;
  /** Risk level */
  risk: RiskLevel;
  /** Badges earned */
  badges: ReputationBadge[];
  /** Number of agents using */
  agents_using: number;
  /** Average rating */
  avg_rating: number;
}

/**
 * Leaderboard for a specific category.
 */
export interface Leaderboard {
  /** Category of this leaderboard */
  category: RankingCategory;
  /** Display name for the category */
  category_name: string;
  /** List of entries */
  entries: LeaderboardEntry[];
  /** Generation timestamp */
  generated_at: Date;
  /** Next scheduled update */
  next_update: Date;
}

// ============================================================================
// Ranking Configuration
// ============================================================================

/**
 * Configuration for reputation score calculation weights.
 */
export interface ReputationWeights {
  /** Weight for ROI component (default: 0.35) */
  roi: number;
  /** Weight for win rate component (default: 0.20) */
  win_rate: number;
  /** Weight for popularity component (default: 0.20) */
  popularity: number;
  /** Weight for user rating component (default: 0.15) */
  user_rating: number;
  /** Weight for drawdown penalty (default: 0.10) */
  drawdown_penalty: number;
}

/**
 * Configuration for the ranking engine.
 */
export interface RankingEngineConfig {
  /** Weights for reputation score calculation */
  weights: ReputationWeights;
  /** Update interval in minutes */
  update_interval_minutes: number;
  /** Maximum entries per leaderboard */
  leaderboard_size: number;
  /** Minimum history months for trusted tier */
  min_history_for_trusted: number;
  /** Minimum investors for elite tier */
  min_investors_for_elite: number;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to get strategy ranking.
 */
export interface GetRankingRequest {
  /** Optional category filter */
  category?: RankingCategory;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Response with strategy ranking.
 */
export interface GetRankingResponse {
  /** List of ranked strategies */
  strategies: LeaderboardEntry[];
  /** Total count */
  total: number;
  /** Current offset */
  offset: number;
  /** Page limit */
  limit: number;
}

/**
 * Request to get strategy metrics.
 */
export interface GetStrategyMetricsRequest {
  /** Strategy ID */
  strategy_id: string;
}

/**
 * Response with strategy metrics.
 */
export interface GetStrategyMetricsResponse {
  /** Strategy identifier */
  strategy_id: string;
  /** Performance metrics */
  performance: StrategyPerformanceMetrics;
  /** Risk metrics */
  risk: StrategyRiskMetrics;
  /** Usage/popularity metrics */
  popularity: StrategyUsageMetrics;
  /** Community rating */
  rating: StrategyCommunityFeedback;
  /** Overall reputation score */
  reputation_score: number;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Event types for the reputation system.
 */
export type ReputationEventType =
  | 'metrics_updated'
  | 'score_calculated'
  | 'ranking_updated'
  | 'tier_changed'
  | 'badge_earned';

/**
 * Event emitted by the reputation system.
 */
export interface ReputationEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: ReputationEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Strategy ID (if applicable) */
  strategy_id?: string;
  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Callback for reputation events.
 */
export type ReputationEventCallback = (event: ReputationEvent) => void;

// ============================================================================
// Database Schema Types (for reference)
// ============================================================================

/**
 * strategy_metrics table schema.
 */
export interface StrategyMetricsRecord {
  strategy_id: string;
  roi: number;
  win_rate: number;
  max_drawdown: number;
  trade_count: number;
  profit_factor?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * strategy_usage table schema.
 */
export interface StrategyUsageRecord {
  strategy_id: string;
  agents_using: number;
  daily_trades: number;
  volume: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * strategy_ratings table schema.
 */
export interface StrategyRatingsRecord {
  strategy_id: string;
  rating: number;
  reviews: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * strategy_reputation table schema.
 */
export interface StrategyReputationRecord {
  strategy_id: string;
  reputation_score: number;
  rank: number;
  tier: ReputationTier;
  badges: ReputationBadge[];
  created_at: Date;
  updated_at: Date;
}
