/**
 * TONAIAgent — Strategy Registry (Issue #273)
 *
 * Core registry for user-published trading strategies.
 * Supports:
 * - Strategy definition with creator ownership
 * - Publishing, discovery, and subscription lifecycle
 * - Performance-based ranking (winRate × 0.4 + avgPnL × 0.3 + (1 - drawdown) × 0.3)
 * - Monetization: free | subscription | performance_fee
 * - RBAC: only owner can edit, only subscribers can execute premium strategies
 */

// ============================================================================
// Strategy Definition
// ============================================================================

/** Strategy type classification */
export type StrategyType = 'trend' | 'arbitrage' | 'ai-signal' | 'custom';

/** Revenue model for the strategy */
export type RevenueModel = 'free' | 'subscription' | 'performance_fee';

/**
 * Core strategy definition — published by a creator to the registry.
 */
export interface StrategyDefinition {
  /** Unique strategy identifier */
  id: string;
  /** Human-readable strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Creator (owner) user ID */
  creatorId: string;
  /** Creator display name */
  creatorName: string;
  /** Strategy type */
  type: StrategyType;
  /** Risk level: 1 = very low, 10 = very high */
  riskLevel: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Whether the strategy is publicly discoverable */
  isPublic: boolean;
  /** Revenue model */
  revenueModel: RevenueModel;
  /** Monthly subscription fee in USD (used when revenueModel = 'subscription') */
  subscriptionFeeUsd: number;
  /** Performance fee percentage 0-100 (used when revenueModel = 'performance_fee') */
  performanceFeePercent: number;
  /** Tags for search and discovery */
  tags: string[];
  /** Minimum capital required in TON */
  minCapitalTON: number;
  /** Supported trading pairs */
  supportedPairs: string[];
  /** Number of active subscribers */
  subscriberCount: number;
  /** Whether the strategy has been verified by platform admins */
  verified: boolean;
  /** Suspension status (admin override) */
  suspended: boolean;
}

// ============================================================================
// Strategy Performance
// ============================================================================

/**
 * Real-execution performance metrics for a strategy.
 * Used for ranking and subscriber decision-making.
 */
export interface StrategyPerformanceMetrics {
  /** Strategy identifier */
  strategyId: string;
  /** Win rate (0–1) */
  winRate: number;
  /** Average PnL per trade (normalized 0–1 for ranking) */
  avgPnLNormalized: number;
  /** Maximum drawdown (0–1) */
  maxDrawdown: number;
  /** Composite ranking score = winRate×0.4 + avgPnL×0.3 + (1−drawdown)×0.3 */
  rankingScore: number;
  /** Raw average PnL value */
  avgPnL: number;
  /** Total trades executed */
  totalTrades: number;
  /** 30-day ROI percentage */
  roi30d: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Total revenue generated (for creator) */
  totalRevenueUsd: number;
  /** Last updated ISO timestamp */
  updatedAt: string;
}

/**
 * Calculate the composite ranking score per Issue #273 spec.
 *
 * score = winRate × 0.4 + avgPnL × 0.3 + (1 - drawdown) × 0.3
 *
 * All inputs should be in [0, 1] range.
 */
export function calculateRankingScore(
  winRate: number,
  avgPnLNormalized: number,
  maxDrawdown: number
): number {
  const bounded = (v: number) => Math.max(0, Math.min(1, v));
  return (
    bounded(winRate) * 0.4 +
    bounded(avgPnLNormalized) * 0.3 +
    (1 - bounded(maxDrawdown)) * 0.3
  );
}

// ============================================================================
// Subscription
// ============================================================================

/**
 * User subscription to a strategy.
 * Connects a user to a published strategy with a capital allocation.
 */
export interface StrategySubscription {
  /** Unique subscription identifier */
  id: string;
  /** Subscriber user ID */
  userId: string;
  /** Strategy being subscribed to */
  strategyId: string;
  /** Percentage of portfolio allocated to this strategy (0–100) */
  allocation: number;
  /** ISO timestamp of subscription creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Subscription status */
  status: 'active' | 'paused' | 'cancelled';
}

// ============================================================================
// Publishing
// ============================================================================

/** Input for publishing a new strategy */
export interface PublishStrategyInput {
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Creator user ID */
  creatorId: string;
  /** Creator display name */
  creatorName: string;
  /** Strategy type */
  type: StrategyType;
  /** Risk level 1–10 */
  riskLevel: number;
  /** Whether publicly visible */
  isPublic?: boolean;
  /** Revenue model */
  revenueModel?: RevenueModel;
  /** Monthly fee USD */
  subscriptionFeeUsd?: number;
  /** Performance fee percent */
  performanceFeePercent?: number;
  /** Tags */
  tags?: string[];
  /** Minimum capital in TON */
  minCapitalTON?: number;
  /** Supported trading pairs */
  supportedPairs?: string[];
}

/** Input for updating a strategy (owner only) */
export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  riskLevel?: number;
  revenueModel?: RevenueModel;
  subscriptionFeeUsd?: number;
  performanceFeePercent?: number;
  tags?: string[];
  minCapitalTON?: number;
  supportedPairs?: string[];
}

// ============================================================================
// Filter / Sort
// ============================================================================

export type StrategySortBy = 'score' | 'roi' | 'subscribers' | 'newest' | 'winRate';

/** Filter options for listing strategies */
export interface StrategyFilter {
  /** Filter by strategy type */
  type?: StrategyType;
  /** Filter by revenue model */
  revenueModel?: RevenueModel;
  /** Minimum ranking score */
  minScore?: number;
  /** Maximum risk level */
  maxRiskLevel?: number;
  /** Only verified strategies */
  verifiedOnly?: boolean;
  /** Text search in name/description/tags */
  search?: string;
  /** Sort by field */
  sortBy?: StrategySortBy;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

/** Paginated list result */
export interface StrategyListResult {
  strategies: StrategyDefinition[];
  performance: Map<string, StrategyPerformanceMetrics>;
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// Strategy Registry Interface
// ============================================================================

/**
 * Core registry for the Strategy Marketplace.
 * Handles publishing, discovery, subscriptions, and RBAC.
 */
export interface StrategyRegistryService {
  // --- Discovery ---
  listStrategies(filter?: StrategyFilter): Promise<StrategyListResult>;
  getStrategy(strategyId: string): Promise<StrategyDefinition | null>;
  getStrategyPerformance(strategyId: string): Promise<StrategyPerformanceMetrics | null>;

  // --- Publishing (creator) ---
  publishStrategy(input: PublishStrategyInput): Promise<StrategyDefinition>;
  updateStrategy(strategyId: string, callerId: string, update: UpdateStrategyInput): Promise<StrategyDefinition>;
  unpublishStrategy(strategyId: string, callerId: string): Promise<void>;

  // --- Subscriptions ---
  subscribeToStrategy(userId: string, strategyId: string, allocation: number): Promise<StrategySubscription>;
  unsubscribeFromStrategy(userId: string, strategyId: string): Promise<void>;
  getUserSubscriptions(userId: string): Promise<StrategySubscription[]>;
  getStrategySubscribers(strategyId: string, callerId: string): Promise<StrategySubscription[]>;
  isSubscribed(userId: string, strategyId: string): Promise<boolean>;
  canExecuteStrategy(userId: string, strategyId: string): Promise<boolean>;

  // --- Performance ---
  updatePerformance(strategyId: string, metrics: Partial<StrategyPerformanceMetrics>): Promise<void>;

  // --- Admin ---
  verifyStrategy(strategyId: string, adminId: string): Promise<void>;
  suspendStrategy(strategyId: string, adminId: string): Promise<void>;
}

// ============================================================================
// In-Memory Implementation
// ============================================================================

/** Simple ID generator */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * In-memory implementation of StrategyRegistryService.
 * Suitable for testing and non-persistent deployments.
 */
export class DefaultStrategyRegistry implements StrategyRegistryService {
  private readonly strategies = new Map<string, StrategyDefinition>();
  private readonly performance = new Map<string, StrategyPerformanceMetrics>();
  private readonly subscriptions = new Map<string, StrategySubscription>();
  private readonly adminIds: Set<string>;

  constructor(adminIds: string[] = []) {
    this.adminIds = new Set(adminIds);
  }

  // --------------------------------------------------------------------------
  // Discovery
  // --------------------------------------------------------------------------

  async listStrategies(filter: StrategyFilter = {}): Promise<StrategyListResult> {
    let results = Array.from(this.strategies.values()).filter((s) => !s.suspended);

    // Only public strategies visible to non-owner queries
    results = results.filter((s) => s.isPublic);

    if (filter.type) {
      results = results.filter((s) => s.type === filter.type);
    }

    if (filter.revenueModel) {
      results = results.filter((s) => s.revenueModel === filter.revenueModel);
    }

    if (filter.maxRiskLevel !== undefined) {
      results = results.filter((s) => s.riskLevel <= filter.maxRiskLevel!);
    }

    if (filter.verifiedOnly) {
      results = results.filter((s) => s.verified);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter.minScore !== undefined) {
      results = results.filter((s) => {
        const perf = this.performance.get(s.id);
        return perf ? perf.rankingScore >= filter.minScore! : false;
      });
    }

    // Sort
    const sortBy = filter.sortBy ?? 'score';
    const sortOrder = filter.sortOrder ?? 'desc';
    const direction = sortOrder === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      switch (sortBy) {
        case 'score': {
          const aScore = this.performance.get(a.id)?.rankingScore ?? 0;
          const bScore = this.performance.get(b.id)?.rankingScore ?? 0;
          return direction * (aScore - bScore);
        }
        case 'roi': {
          const aRoi = this.performance.get(a.id)?.roi30d ?? 0;
          const bRoi = this.performance.get(b.id)?.roi30d ?? 0;
          return direction * (aRoi - bRoi);
        }
        case 'subscribers':
          return direction * (a.subscriberCount - b.subscriberCount);
        case 'winRate': {
          const aWr = this.performance.get(a.id)?.winRate ?? 0;
          const bWr = this.performance.get(b.id)?.winRate ?? 0;
          return direction * (aWr - bWr);
        }
        case 'newest':
          return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        default:
          return 0;
      }
    });

    const total = results.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 20;
    const page = results.slice(offset, offset + limit);

    const perfMap = new Map<string, StrategyPerformanceMetrics>();
    for (const s of page) {
      const perf = this.performance.get(s.id);
      if (perf) perfMap.set(s.id, perf);
    }

    return {
      strategies: page,
      performance: perfMap,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  }

  async getStrategy(strategyId: string): Promise<StrategyDefinition | null> {
    const s = this.strategies.get(strategyId);
    return s?.suspended ? null : (s ?? null);
  }

  async getStrategyPerformance(strategyId: string): Promise<StrategyPerformanceMetrics | null> {
    return this.performance.get(strategyId) ?? null;
  }

  // --------------------------------------------------------------------------
  // Publishing
  // --------------------------------------------------------------------------

  async publishStrategy(input: PublishStrategyInput): Promise<StrategyDefinition> {
    if (!input.name?.trim()) throw new Error('Strategy name is required');
    if (!input.creatorId?.trim()) throw new Error('Creator ID is required');
    if (input.riskLevel < 1 || input.riskLevel > 10)
      throw new Error('Risk level must be between 1 and 10');

    const now = new Date().toISOString();
    const id = generateId('strat');

    const strategy: StrategyDefinition = {
      id,
      name: input.name.trim(),
      description: input.description ?? '',
      creatorId: input.creatorId,
      creatorName: input.creatorName ?? 'Unknown',
      type: input.type,
      riskLevel: input.riskLevel,
      createdAt: now,
      updatedAt: now,
      isPublic: input.isPublic ?? true,
      revenueModel: input.revenueModel ?? 'free',
      subscriptionFeeUsd: input.subscriptionFeeUsd ?? 0,
      performanceFeePercent: input.performanceFeePercent ?? 0,
      tags: input.tags ?? [],
      minCapitalTON: input.minCapitalTON ?? 10,
      supportedPairs: input.supportedPairs ?? ['TON/USDT'],
      subscriberCount: 0,
      verified: false,
      suspended: false,
    };

    this.strategies.set(id, strategy);

    // Initialize empty performance record
    this.performance.set(id, {
      strategyId: id,
      winRate: 0,
      avgPnLNormalized: 0,
      maxDrawdown: 0,
      rankingScore: 0,
      avgPnL: 0,
      totalTrades: 0,
      roi30d: 0,
      sharpeRatio: 0,
      totalRevenueUsd: 0,
      updatedAt: now,
    });

    return strategy;
  }

  async updateStrategy(
    strategyId: string,
    callerId: string,
    update: UpdateStrategyInput
  ): Promise<StrategyDefinition> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    if (strategy.creatorId !== callerId && !this.adminIds.has(callerId)) {
      throw new Error('Only the strategy owner or an admin can update this strategy');
    }

    const updated: StrategyDefinition = {
      ...strategy,
      ...Object.fromEntries(
        Object.entries(update).filter(([, v]) => v !== undefined)
      ),
      updatedAt: new Date().toISOString(),
    };

    this.strategies.set(strategyId, updated);
    return updated;
  }

  async unpublishStrategy(strategyId: string, callerId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    if (strategy.creatorId !== callerId && !this.adminIds.has(callerId)) {
      throw new Error('Only the strategy owner or an admin can unpublish this strategy');
    }

    this.strategies.set(strategyId, { ...strategy, isPublic: false, updatedAt: new Date().toISOString() });
  }

  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------

  async subscribeToStrategy(
    userId: string,
    strategyId: string,
    allocation: number
  ): Promise<StrategySubscription> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || strategy.suspended) throw new Error(`Strategy not found: ${strategyId}`);
    if (!strategy.isPublic) throw new Error('Cannot subscribe to a private strategy');

    if (allocation < 0 || allocation > 100) {
      throw new Error('Allocation must be between 0 and 100 percent');
    }

    // Check if already subscribed
    const existing = this._findSubscription(userId, strategyId);
    if (existing) {
      if (existing.status === 'active') {
        throw new Error('Already subscribed to this strategy');
      }
      // Re-activate
      const reactivated: StrategySubscription = {
        ...existing,
        allocation,
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
      this.subscriptions.set(existing.id, reactivated);
      return reactivated;
    }

    const now = new Date().toISOString();
    const sub: StrategySubscription = {
      id: generateId('sub'),
      userId,
      strategyId,
      allocation,
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };

    this.subscriptions.set(sub.id, sub);

    // Increment subscriber count
    this.strategies.set(strategyId, {
      ...strategy,
      subscriberCount: strategy.subscriberCount + 1,
    });

    return sub;
  }

  async unsubscribeFromStrategy(userId: string, strategyId: string): Promise<void> {
    const sub = this._findSubscription(userId, strategyId);
    if (!sub || sub.status !== 'active') {
      throw new Error('No active subscription found');
    }

    this.subscriptions.set(sub.id, {
      ...sub,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });

    const strategy = this.strategies.get(strategyId);
    if (strategy && strategy.subscriberCount > 0) {
      this.strategies.set(strategyId, {
        ...strategy,
        subscriberCount: strategy.subscriberCount - 1,
      });
    }
  }

  async getUserSubscriptions(userId: string): Promise<StrategySubscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (s) => s.userId === userId && s.status === 'active'
    );
  }

  async getStrategySubscribers(strategyId: string, callerId: string): Promise<StrategySubscription[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

    // Only owner or admin can see subscriber list
    if (strategy.creatorId !== callerId && !this.adminIds.has(callerId)) {
      throw new Error('Only the strategy owner or an admin can view subscribers');
    }

    return Array.from(this.subscriptions.values()).filter(
      (s) => s.strategyId === strategyId && s.status === 'active'
    );
  }

  async isSubscribed(userId: string, strategyId: string): Promise<boolean> {
    const sub = this._findSubscription(userId, strategyId);
    return sub?.status === 'active';
  }

  async canExecuteStrategy(userId: string, strategyId: string): Promise<boolean> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy || strategy.suspended) return false;

    // Free strategies: anyone can execute
    if (strategy.revenueModel === 'free') return true;

    // Owner can always execute own strategy
    if (strategy.creatorId === userId) return true;

    // Admin override
    if (this.adminIds.has(userId)) return true;

    // Premium strategies: require active subscription
    return this.isSubscribed(userId, strategyId);
  }

  // --------------------------------------------------------------------------
  // Performance
  // --------------------------------------------------------------------------

  async updatePerformance(
    strategyId: string,
    metrics: Partial<StrategyPerformanceMetrics>
  ): Promise<void> {
    const existing = this.performance.get(strategyId);
    if (!existing) throw new Error(`Strategy not found: ${strategyId}`);

    const updated: StrategyPerformanceMetrics = {
      ...existing,
      ...metrics,
      strategyId,
      updatedAt: new Date().toISOString(),
    };

    // Recompute ranking score if relevant fields changed
    updated.rankingScore = calculateRankingScore(
      updated.winRate,
      updated.avgPnLNormalized,
      updated.maxDrawdown
    );

    this.performance.set(strategyId, updated);
  }

  // --------------------------------------------------------------------------
  // Admin
  // --------------------------------------------------------------------------

  async verifyStrategy(strategyId: string, adminId: string): Promise<void> {
    if (!this.adminIds.has(adminId)) throw new Error('Admin privileges required');
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    this.strategies.set(strategyId, { ...strategy, verified: true });
  }

  async suspendStrategy(strategyId: string, adminId: string): Promise<void> {
    if (!this.adminIds.has(adminId)) throw new Error('Admin privileges required');
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);
    this.strategies.set(strategyId, { ...strategy, suspended: true });
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _findSubscription(userId: string, strategyId: string): StrategySubscription | undefined {
    return Array.from(this.subscriptions.values()).find(
      (s) => s.userId === userId && s.strategyId === strategyId
    );
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new Strategy Registry instance.
 * @param adminIds - User IDs granted admin privileges
 */
export function createStrategyRegistry(adminIds?: string[]): DefaultStrategyRegistry {
  return new DefaultStrategyRegistry(adminIds);
}
