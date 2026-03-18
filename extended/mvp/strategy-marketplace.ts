/**
 * TONAIAgent - Strategy Marketplace MVP Service
 *
 * Decentralized marketplace for discovering, copying, and monetizing
 * trading strategies and AI agents.
 */

import type {
  MarketplaceConfig,
  StrategyListing,
  StrategyFilter,
  StrategyCategory,
  CreatorProfile,
  CreatorEarnings,
  CopyPosition,
  RiskLevel,
  ReputationTier,
  MVPEvent,
  MVPEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default marketplace configuration
 */
export const defaultMarketplaceConfig: MarketplaceConfig = {
  enabled: true,
  minScoreForListing: 50,
  copyTradingEnabled: true,
  minCopyAmount: 10,
  maxCopyAmount: 100000,
  defaultSlippageProtection: 0.5,
  maxFollowersPerAgent: 1000,
};

// ============================================================================
// Strategy Marketplace Manager
// ============================================================================

/**
 * Strategy Marketplace Manager for MVP
 *
 * Enables strategy discovery, copy trading, and creator monetization.
 */
export class StrategyMarketplaceManager {
  readonly config: MarketplaceConfig;

  private readonly strategies: Map<string, StrategyListing> = new Map();
  private readonly creators: Map<string, CreatorProfile> = new Map();
  private readonly copyPositions: Map<string, CopyPosition> = new Map();
  private readonly eventCallbacks: MVPEventCallback[] = [];

  constructor(config: Partial<MarketplaceConfig> = {}) {
    this.config = {
      ...defaultMarketplaceConfig,
      ...config,
    };

    // Initialize with default strategy templates
    this.initializeDefaultStrategies();
  }

  // ============================================================================
  // Strategy Discovery
  // ============================================================================

  /**
   * List strategies with filters
   */
  listStrategies(filter: StrategyFilter = {}): {
    strategies: StrategyListing[];
    total: number;
    page: number;
    pageSize: number;
  } {
    let filtered = Array.from(this.strategies.values());

    // Apply filters
    if (filter.category) {
      filtered = filtered.filter((s) => s.category === filter.category);
    }
    if (filter.riskLevel) {
      filtered = filtered.filter((s) => s.riskLevel === filter.riskLevel);
    }
    if (filter.minApy !== undefined) {
      filtered = filtered.filter((s) => s.apy >= filter.minApy!);
    }
    if (filter.maxApy !== undefined) {
      filtered = filtered.filter((s) => s.apy <= filter.maxApy!);
    }
    if (filter.minTvl !== undefined) {
      filtered = filtered.filter((s) => s.tvl >= filter.minTvl!);
    }
    if (filter.minRating !== undefined) {
      filtered = filtered.filter((s) => s.rating >= filter.minRating!);
    }
    if (filter.maxPerformanceFee !== undefined) {
      filtered = filtered.filter((s) => s.performanceFee <= filter.maxPerformanceFee!);
    }

    // Sort
    const sortBy = filter.sortBy ?? 'copiers';
    const sortOrder = filter.sortOrder ?? 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy as keyof StrategyListing] as number;
      const bVal = b[sortBy as keyof StrategyListing] as number;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Paginate
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      strategies: paginated,
      total: filtered.length,
      page,
      pageSize,
    };
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): StrategyListing | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get featured strategies
   */
  getFeaturedStrategies(): StrategyListing[] {
    return Array.from(this.strategies.values())
      .filter((s) => s.isFeatured)
      .slice(0, 10);
  }

  /**
   * Get top strategies by category
   */
  getTopByCategory(category: StrategyCategory, limit: number = 5): StrategyListing[] {
    return Array.from(this.strategies.values())
      .filter((s) => s.category === category)
      .sort((a, b) => b.copiers - a.copiers)
      .slice(0, limit);
  }

  /**
   * Search strategies by text
   */
  searchStrategies(query: string): StrategyListing[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.strategies.values()).filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================================================
  // Strategy Publishing (Creator Tools)
  // ============================================================================

  /**
   * Publish a new strategy to marketplace
   */
  async publishStrategy(input: PublishStrategyInput): Promise<StrategyListing> {
    const strategyId = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create creator profile
    let creator = this.creators.get(input.creatorId);
    if (!creator) {
      creator = this.createCreatorProfile(input.creatorId, input.creatorUsername);
    }

    const listing: StrategyListing = {
      id: strategyId,
      name: input.name,
      description: input.description,
      category: input.category,
      creatorId: input.creatorId,
      creatorUsername: creator.username,
      creatorReputation: creator.reputationScore,
      riskLevel: input.riskLevel,
      apy: 0, // Will be updated based on performance
      tvl: 0,
      copiers: 0,
      rating: 0,
      ratingCount: 0,
      minInvestment: input.minInvestment ?? this.config.minCopyAmount,
      performanceFee: Math.min(input.performanceFee ?? 10, 20), // Max 20%
      managementFee: input.managementFee ?? 0,
      isFeatured: false,
      tags: input.tags ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.strategies.set(strategyId, listing);

    // Update creator stats
    creator.totalStrategies++;
    this.creators.set(input.creatorId, creator);

    this.emitEvent({
      type: 'strategy_published',
      timestamp: new Date(),
      userId: input.creatorId,
      strategyId,
      data: {
        name: input.name,
        category: input.category,
        riskLevel: input.riskLevel,
      },
    });

    return listing;
  }

  /**
   * Update strategy listing
   */
  async updateStrategy(
    strategyId: string,
    update: Partial<StrategyListing>
  ): Promise<StrategyListing> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Update allowed fields
    if (update.name) strategy.name = update.name;
    if (update.description) strategy.description = update.description;
    if (update.tags) strategy.tags = update.tags;
    if (update.minInvestment !== undefined) strategy.minInvestment = update.minInvestment;
    strategy.updatedAt = new Date();

    this.strategies.set(strategyId, strategy);
    return strategy;
  }

  // ============================================================================
  // Copy Trading
  // ============================================================================

  /**
   * Start copying a strategy
   */
  async startCopying(input: StartCopyInput): Promise<CopyPosition> {
    const strategy = this.strategies.get(input.strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    if (input.capital < strategy.minInvestment) {
      throw new Error(`Minimum investment is ${strategy.minInvestment}`);
    }

    if (input.capital > this.config.maxCopyAmount) {
      throw new Error(`Maximum investment is ${this.config.maxCopyAmount}`);
    }

    if (strategy.copiers >= this.config.maxFollowersPerAgent) {
      throw new Error('Strategy has reached maximum followers');
    }

    const positionId = `copy_${input.userId}_${input.strategyId}_${Date.now()}`;

    const position: CopyPosition = {
      id: positionId,
      userId: input.userId,
      strategyId: input.strategyId,
      agentId: `agent_copy_${positionId}`,
      capitalAllocated: input.capital,
      currentValue: input.capital,
      pnl: 0,
      status: 'active',
      startedAt: new Date(),
      lastSyncAt: new Date(),
    };

    this.copyPositions.set(positionId, position);

    // Update strategy stats
    strategy.copiers++;
    strategy.tvl += input.capital;
    this.strategies.set(input.strategyId, strategy);

    // Update creator stats
    const creator = this.creators.get(strategy.creatorId);
    if (creator) {
      creator.totalCopiers++;
      creator.totalTvl += input.capital;
      this.creators.set(strategy.creatorId, creator);
    }

    this.emitEvent({
      type: 'strategy_copied',
      timestamp: new Date(),
      userId: input.userId,
      strategyId: input.strategyId,
      data: {
        positionId,
        capital: input.capital,
        strategyName: strategy.name,
      },
    });

    return position;
  }

  /**
   * Stop copying a strategy
   */
  async stopCopying(positionId: string): Promise<CopyPosition> {
    const position = this.copyPositions.get(positionId);
    if (!position) {
      throw new Error('Copy position not found');
    }

    position.status = 'stopped';

    // Update strategy stats
    const strategy = this.strategies.get(position.strategyId);
    if (strategy) {
      strategy.copiers = Math.max(0, strategy.copiers - 1);
      strategy.tvl = Math.max(0, strategy.tvl - position.capitalAllocated);
      this.strategies.set(position.strategyId, strategy);
    }

    this.copyPositions.set(positionId, position);
    return position;
  }

  /**
   * Get user's copy positions
   */
  getUserCopyPositions(userId: string): CopyPosition[] {
    return Array.from(this.copyPositions.values()).filter(
      (p) => p.userId === userId
    );
  }

  /**
   * Get copy position by ID
   */
  getCopyPosition(positionId: string): CopyPosition | undefined {
    return this.copyPositions.get(positionId);
  }

  // ============================================================================
  // Creator Profile & Monetization
  // ============================================================================

  /**
   * Get creator profile
   */
  getCreatorProfile(creatorId: string): CreatorProfile | undefined {
    return this.creators.get(creatorId);
  }

  /**
   * Update creator profile
   */
  async updateCreatorProfile(
    creatorId: string,
    update: Partial<CreatorProfile>
  ): Promise<CreatorProfile> {
    let creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    if (update.displayName) creator.displayName = update.displayName;
    if (update.bio) creator.bio = update.bio;
    if (update.avatarUrl) creator.avatarUrl = update.avatarUrl;

    this.creators.set(creatorId, creator);
    return creator;
  }

  /**
   * Get creator earnings
   */
  getCreatorEarnings(
    creatorId: string,
    period: '24h' | '7d' | '30d' | 'all'
  ): CreatorEarnings {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    // In production, this would aggregate from actual fee collections
    // For MVP, we calculate based on TVL and performance
    const strategies = Array.from(this.strategies.values()).filter(
      (s) => s.creatorId === creatorId
    );

    const totalTvl = strategies.reduce((sum, s) => sum + s.tvl, 0);
    const avgPerformanceFee = strategies.reduce((sum, s) => sum + s.performanceFee, 0) /
      (strategies.length || 1);

    // Simulated earnings based on TVL and fees
    const periodMultiplier = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 365;
    const dailyReturn = 0.001; // 0.1% daily simulated return
    const performanceFees = totalTvl * dailyReturn * periodMultiplier * (avgPerformanceFee / 100);
    const managementFees = totalTvl * (0.02 / 365) * periodMultiplier; // 2% annual

    return {
      creatorId,
      period,
      performanceFees,
      managementFees,
      subscriptionRevenue: 0,
      referralEarnings: 0,
      totalEarnings: performanceFees + managementFees,
      pendingPayout: performanceFees + managementFees,
    };
  }

  /**
   * Get all creators (leaderboard)
   */
  getTopCreators(limit: number = 20): CreatorProfile[] {
    return Array.from(this.creators.values())
      .sort((a, b) => b.totalTvl - a.totalTvl)
      .slice(0, limit);
  }

  // ============================================================================
  // Ratings & Reviews
  // ============================================================================

  /**
   * Rate a strategy
   */
  async rateStrategy(
    strategyId: string,
    _userId: string,
    rating: number,
    _review?: string
  ): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Update rolling average
    const newRatingCount = strategy.ratingCount + 1;
    const newRating =
      (strategy.rating * strategy.ratingCount + rating) / newRatingCount;

    strategy.rating = newRating;
    strategy.ratingCount = newRatingCount;
    strategy.updatedAt = new Date();

    this.strategies.set(strategyId, strategy);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to events
   */
  onEvent(callback: MVPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: MVPEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create creator profile
   */
  private createCreatorProfile(userId: string, username: string): CreatorProfile {
    const creator: CreatorProfile = {
      userId,
      displayName: username,
      username,
      isVerified: false,
      totalStrategies: 0,
      totalCopiers: 0,
      totalTvl: 0,
      avgApy: 0,
      reputationScore: 50,
      reputationTier: 'newcomer',
      totalEarnings: 0,
      joinedAt: new Date(),
    };

    this.creators.set(userId, creator);
    return creator;
  }

  /**
   * Initialize default strategy templates
   */
  private initializeDefaultStrategies(): void {
    const templates: Array<Omit<StrategyListing, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Conservative DCA - TON',
        description: 'Dollar-cost averaging into TON with conservative risk parameters. Buys TON daily regardless of price.',
        category: 'dca',
        creatorId: 'platform',
        creatorUsername: 'TON AI Agent',
        creatorReputation: 100,
        riskLevel: 'low',
        apy: 15,
        tvl: 250000,
        copiers: 1500,
        rating: 4.7,
        ratingCount: 320,
        minInvestment: 10,
        performanceFee: 10,
        managementFee: 0,
        isFeatured: true,
        tags: ['dca', 'ton', 'conservative', 'beginner-friendly'],
      },
      {
        name: 'DeFi Yield Optimizer',
        description: 'Automatically rotates between highest-yielding DeFi protocols on TON ecosystem.',
        category: 'yield_farming',
        creatorId: 'platform',
        creatorUsername: 'TON AI Agent',
        creatorReputation: 100,
        riskLevel: 'medium',
        apy: 35,
        tvl: 180000,
        copiers: 890,
        rating: 4.5,
        ratingCount: 245,
        minInvestment: 100,
        performanceFee: 15,
        managementFee: 0.5,
        isFeatured: true,
        tags: ['yield', 'defi', 'automated', 'medium-risk'],
      },
      {
        name: 'Liquidity Pool Manager',
        description: 'Manages LP positions across DEXs, auto-rebalances to minimize impermanent loss.',
        category: 'liquidity',
        creatorId: 'platform',
        creatorUsername: 'TON AI Agent',
        creatorReputation: 100,
        riskLevel: 'medium',
        apy: 28,
        tvl: 320000,
        copiers: 620,
        rating: 4.4,
        ratingCount: 180,
        minInvestment: 200,
        performanceFee: 12,
        managementFee: 0.3,
        isFeatured: true,
        tags: ['liquidity', 'lp', 'impermanent-loss', 'dex'],
      },
      {
        name: 'Smart Rebalancer',
        description: 'Portfolio rebalancing based on target allocations with drift tolerance.',
        category: 'rebalancing',
        creatorId: 'platform',
        creatorUsername: 'TON AI Agent',
        creatorReputation: 100,
        riskLevel: 'low',
        apy: 12,
        tvl: 450000,
        copiers: 2100,
        rating: 4.8,
        ratingCount: 410,
        minInvestment: 50,
        performanceFee: 8,
        managementFee: 0,
        isFeatured: true,
        tags: ['rebalancing', 'portfolio', 'conservative', 'set-and-forget'],
      },
      {
        name: 'Cross-DEX Arbitrage',
        description: 'Captures price differences across TON DEXs with low-latency execution.',
        category: 'arbitrage',
        creatorId: 'platform',
        creatorUsername: 'TON AI Agent',
        creatorReputation: 100,
        riskLevel: 'high',
        apy: 55,
        tvl: 95000,
        copiers: 340,
        rating: 4.2,
        ratingCount: 95,
        minInvestment: 500,
        performanceFee: 20,
        managementFee: 1,
        isFeatured: false,
        tags: ['arbitrage', 'high-frequency', 'advanced', 'high-risk'],
      },
    ];

    for (const template of templates) {
      const id = `strategy_default_${template.category}_${Date.now()}`;
      this.strategies.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create platform creator
    this.creators.set('platform', {
      userId: 'platform',
      displayName: 'TON AI Agent',
      username: 'TON AI Agent',
      isVerified: true,
      totalStrategies: templates.length,
      totalCopiers: templates.reduce((sum, t) => sum + t.copiers, 0),
      totalTvl: templates.reduce((sum, t) => sum + t.tvl, 0),
      avgApy: templates.reduce((sum, t) => sum + t.apy, 0) / templates.length,
      reputationScore: 100,
      reputationTier: 'legend',
      totalEarnings: 0,
      joinedAt: new Date('2024-01-01'),
    });
  }

  /**
   * Update reputation tier based on score
   */
  updateCreatorTier(creatorId: string): void {
    const creator = this.creators.get(creatorId);
    if (!creator) return;

    const score = creator.reputationScore;
    let tier: ReputationTier;

    if (score >= 95) tier = 'legend';
    else if (score >= 85) tier = 'master';
    else if (score >= 70) tier = 'expert';
    else if (score >= 55) tier = 'established';
    else if (score >= 40) tier = 'rising';
    else tier = 'newcomer';

    creator.reputationTier = tier;
    this.creators.set(creatorId, creator);
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Input for publishing a strategy
 */
export interface PublishStrategyInput {
  /** Creator ID */
  creatorId: string;
  /** Creator username */
  creatorUsername: string;
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Strategy category */
  category: StrategyCategory;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Minimum investment */
  minInvestment?: number;
  /** Performance fee percentage */
  performanceFee?: number;
  /** Management fee percentage */
  managementFee?: number;
  /** Tags */
  tags?: string[];
}

/**
 * Input for starting copy trading
 */
export interface StartCopyInput {
  /** User ID */
  userId: string;
  /** Strategy ID to copy */
  strategyId: string;
  /** Capital to allocate */
  capital: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Strategy Marketplace Manager
 */
export function createStrategyMarketplaceManager(
  config?: Partial<MarketplaceConfig>
): StrategyMarketplaceManager {
  return new StrategyMarketplaceManager(config);
}
