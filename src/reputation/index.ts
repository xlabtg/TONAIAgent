/**
 * TONAIAgent - Strategy Reputation & Ranking Engine
 *
 * A ranking system that evaluates strategies using:
 * - Performance metrics (ROI, win rate, profit factor)
 * - Risk metrics (drawdown, volatility)
 * - Usage metrics (agents using, trading volume)
 * - Community feedback (ratings, reviews)
 *
 * The ranking engine determines:
 * - Strategy order in marketplace
 * - Strategy reputation score
 * - Strategy trust level (tier)
 *
 * Architecture:
 * ```
 * Trade History
 *       ↓
 * Portfolio Analytics
 *       ↓
 * Strategy Metrics Engine  ← src/reputation/metrics/
 *       ↓
 * Reputation Score         ← src/reputation/ranking/
 *       ↓
 * Marketplace Ranking      ← src/reputation/api.ts
 * ```
 *
 * Implements Issue #218: Strategy Reputation & Ranking Engine
 *
 * @example
 * ```typescript
 * import {
 *   createReputationApi,
 *   createStrategyRankingEngine,
 *   createMetricsAggregator,
 * } from '@tonaiagent/core/reputation';
 *
 * // Create the ranking engine
 * const engine = createStrategyRankingEngine();
 *
 * // Register a strategy
 * engine.registerStrategy('momentum_v1', 'AI Momentum Pro', 'developer_123');
 *
 * // Update metrics
 * engine.updateStrategyMetrics('momentum_v1', {
 *   roi: 18.4,
 *   win_rate: 62,
 *   max_drawdown: -12,
 *   trade_count: 312,
 *   agents_using: 148,
 *   rating: 4.6,
 *   reviews: 82,
 * });
 *
 * // Get the reputation score
 * const score = engine.getStrategyScore('momentum_v1');
 * console.log(`Reputation: ${score.reputation_score}, Tier: ${score.tier}`);
 *
 * // Get leaderboards
 * const topPerforming = engine.getLeaderboard('top_performing');
 * console.log('Top Strategies:', topPerforming.entries);
 *
 * // Or use the API
 * const api = createReputationApi(engine);
 * const response = await api.handle({
 *   method: 'GET',
 *   path: '/api/strategies/ranking',
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core metric types
  StrategyPerformanceMetrics,
  StrategyRiskMetrics,
  StrategyUsageMetrics,
  StrategyCommunityFeedback,
  AggregatedStrategyMetrics,
  RiskLevel,

  // Reputation types
  StrategyReputationScore,
  ReputationTier,
  ReputationBadge,

  // Ranking types
  RankingCategory,
  Leaderboard,
  LeaderboardEntry,
  ReputationWeights,
  RankingEngineConfig,

  // API types
  GetRankingRequest,
  GetRankingResponse,
  GetStrategyMetricsRequest,
  GetStrategyMetricsResponse,

  // Event types
  ReputationEvent,
  ReputationEventType,
  ReputationEventCallback,

  // Database schema types
  StrategyMetricsRecord,
  StrategyUsageRecord,
  StrategyRatingsRecord,
  StrategyReputationRecord,
} from './types';

// ============================================================================
// Metrics Module
// ============================================================================

export {
  // Metrics aggregator
  DefaultMetricsAggregator,
  createMetricsAggregator,

  // Types
  type MetricsAggregator,
  type MetricsAggregatorConfig,
  type TradeRecord,
} from './metrics';

// ============================================================================
// Ranking Module
// ============================================================================

export {
  // Ranking engine
  DefaultStrategyRankingEngine,
  createStrategyRankingEngine,

  // Types
  type StrategyRankingEngine,
  type StrategyMetricsInput,
} from './ranking';

// ============================================================================
// API Module
// ============================================================================

export {
  // API handler
  ReputationApi,
  createReputationApi,
  createDemoReputationApi,

  // Error types
  ReputationApiError,

  // Types
  type ReputationApiRequest,
  type ReputationApiResponse,
  type ReputationApiResponseBody,
  type ReputationApiErrorCode,
} from './api';

// ============================================================================
// Default Export
// ============================================================================

export { ReputationApi as default } from './api';
