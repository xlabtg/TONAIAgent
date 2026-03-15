/**
 * TONAIAgent - Strategy Marketplace Types
 *
 * Type definitions for the Strategy Marketplace MVP.
 * These types define the marketplace-specific data structures
 * that differ from the core marketplace module types.
 */

// Re-export main types from index
export type {
  MarketplaceStrategyCategory,
  MarketplaceRiskLevel,
  MarketplaceStrategyListing,
  DeployMarketplaceStrategyInput,
  MarketplaceDeployedAgent,
  MarketplaceStrategyFilter,
  StrategyMarketplace,
} from './index';

// ============================================================================
// Additional Types for Marketplace MVP
// ============================================================================

/**
 * Performance snapshot for a strategy
 */
export interface StrategyPerformanceSnapshot {
  /** Timestamp of snapshot */
  timestamp: Date;
  /** ROI at this point */
  roi: number;
  /** Total trades at this point */
  totalTrades: number;
  /** Win rate at this point */
  winRate: number;
  /** Drawdown at this point */
  drawdown: number;
}

/**
 * User's allocation to a strategy
 */
export interface UserStrategyAllocation {
  /** Unique allocation ID */
  id: string;
  /** User ID */
  userId: string;
  /** Strategy ID */
  strategyId: string;
  /** Amount allocated in TON */
  amountTON: number;
  /** Current value in TON */
  currentValueTON: number;
  /** Unrealized PnL */
  unrealizedPnL: number;
  /** When allocated */
  allocatedAt: Date;
  /** Allocation status */
  status: 'active' | 'pending' | 'withdrawn';
}

/**
 * Strategy reputation factors
 */
export interface StrategyReputationFactors {
  /** Performance score (0-100) */
  performanceScore: number;
  /** Stability score (0-100) */
  stabilityScore: number;
  /** User rating score (0-100) */
  userRatingScore: number;
  /** Longevity score (0-100) */
  longevityScore: number;
  /** Overall reputation (0-10) */
  overallReputation: number;
}

/**
 * Strategy discovery result with pagination
 */
export interface StrategyDiscoveryResult {
  /** List of strategies */
  strategies: import('./index').MarketplaceStrategyListing[];
  /** Total count */
  total: number;
  /** Current offset */
  offset: number;
  /** Page size */
  limit: number;
  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Strategy category metadata
 */
export interface StrategyCategoryInfo {
  /** Category ID */
  id: import('./index').MarketplaceStrategyCategory;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Number of strategies in this category */
  strategyCount: number;
  /** Average ROI for this category */
  averageRoi: number;
}

/**
 * Marketplace statistics
 */
export interface MarketplaceStats {
  /** Total number of strategies */
  totalStrategies: number;
  /** Total number of active users */
  totalActiveUsers: number;
  /** Total capital under management */
  totalAUM: number;
  /** Best performing strategy ROI */
  topRoi: number;
  /** Average strategy ROI */
  averageRoi: number;
  /** Number of strategies by category */
  categoryCounts: Record<import('./index').MarketplaceStrategyCategory, number>;
}

/**
 * Strategy rating/review
 */
export interface StrategyReview {
  /** Review ID */
  id: string;
  /** Strategy ID */
  strategyId: string;
  /** User ID */
  userId: string;
  /** Rating (1-5) */
  rating: number;
  /** Review title */
  title: string;
  /** Review content */
  content: string;
  /** Whether user actually used the strategy */
  verified: boolean;
  /** Helpful votes */
  helpfulVotes: number;
  /** Created at */
  createdAt: Date;
}

/**
 * Event emitted by the marketplace
 */
export interface MarketplaceEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type:
    | 'strategy_deployed'
    | 'strategy_stopped'
    | 'strategy_registered'
    | 'review_submitted'
    | 'allocation_changed';
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Callback for marketplace events
 */
export type MarketplaceEventCallback = (event: MarketplaceEvent) => void;
