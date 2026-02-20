/**
 * TONAIAgent - Social Trading Infrastructure
 *
 * Implements social follows, community portfolios, trading signals,
 * and collaborative investing features for viral growth.
 */

import {
  SocialFollow,
  FollowNotificationSettings,
  CommunityPortfolio,
  PortfolioMember,
  PortfolioAllocation,
  PortfolioRules,
  TradingSignal,
  SignalPerformance,
  SignalReactions,
  SocialTradingConfig,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Social Trading Engine Interface
// ============================================================================

export interface SocialTradingEngine {
  // Social follows
  follow(followerId: string, followedId: string, type: SocialFollow['type']): Promise<SocialFollow>;
  unfollow(followId: string): Promise<void>;
  getFollowers(userId: string, type?: SocialFollow['type']): Promise<SocialFollow[]>;
  getFollowing(userId: string, type?: SocialFollow['type']): Promise<SocialFollow[]>;
  updateNotificationSettings(followId: string, settings: Partial<FollowNotificationSettings>): Promise<SocialFollow>;

  // Community portfolios
  createPortfolio(input: CreatePortfolioInput): Promise<CommunityPortfolio>;
  getPortfolio(portfolioId: string): Promise<CommunityPortfolio | null>;
  updatePortfolio(portfolioId: string, updates: UpdatePortfolioInput): Promise<CommunityPortfolio>;
  joinPortfolio(portfolioId: string, userId: string, capital: number): Promise<PortfolioMember>;
  leavePortfolio(portfolioId: string, userId: string): Promise<void>;
  updateAllocations(portfolioId: string, allocations: PortfolioAllocation[]): Promise<CommunityPortfolio>;
  listPortfolios(filter?: PortfolioFilter): Promise<CommunityPortfolio[]>;

  // Trading signals
  createSignal(input: CreateSignalInput): Promise<TradingSignal>;
  getSignal(signalId: string): Promise<TradingSignal | null>;
  updateSignalPerformance(signalId: string, performance: SignalPerformance): Promise<TradingSignal>;
  reactToSignal(signalId: string, userId: string, reaction: ReactionType): Promise<SignalReactions>;
  listSignals(filter?: SignalFilter): Promise<TradingSignal[]>;
  getUserSignals(userId: string): Promise<TradingSignal[]>;

  // Social feed
  getFeed(userId: string, limit?: number): Promise<FeedItem[]>;
  getSocialStats(userId: string): Promise<SocialStats>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface CreatePortfolioInput {
  name: string;
  description: string;
  creatorId: string;
  visibility: CommunityPortfolio['visibility'];
  type: CommunityPortfolio['type'];
  rules?: Partial<PortfolioRules>;
  initialAllocations?: PortfolioAllocation[];
}

export interface UpdatePortfolioInput {
  name?: string;
  description?: string;
  visibility?: CommunityPortfolio['visibility'];
  rules?: Partial<PortfolioRules>;
}

export interface PortfolioFilter {
  type?: CommunityPortfolio['type'];
  visibility?: CommunityPortfolio['visibility'];
  minMembers?: number;
  minPerformance?: number;
  creatorId?: string;
  sortBy?: 'performance' | 'members' | 'created' | 'name';
  limit?: number;
}

export interface CreateSignalInput {
  creatorId: string;
  type: TradingSignal['type'];
  asset: string;
  confidence: number;
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  visibility: TradingSignal['visibility'];
  expiresAt?: Date;
}

export interface SignalFilter {
  creatorId?: string;
  type?: TradingSignal['type'];
  asset?: string;
  minConfidence?: number;
  visibility?: TradingSignal['visibility'];
  active?: boolean;
  sortBy?: 'confidence' | 'created' | 'reactions' | 'performance';
  limit?: number;
}

export type ReactionType = 'like' | 'comment' | 'share' | 'copy';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  actorId: string;
  actorName: string;
  content: string;
  relatedEntity?: { type: string; id: string; name: string };
  timestamp: Date;
  reactions: { likes: number; comments: number; shares: number };
}

export type FeedItemType =
  | 'signal_created'
  | 'portfolio_joined'
  | 'milestone_reached'
  | 'trade_executed'
  | 'achievement_earned'
  | 'user_followed';

export interface SocialStats {
  followers: number;
  following: number;
  portfoliosCreated: number;
  portfoliosJoined: number;
  signalsCreated: number;
  signalAccuracy: number;
  totalReactions: number;
  socialScore: number;
}

export interface SocialTradingEngineConfig {
  maxFollowsPerUser: number;
  signalsPremiumOnly: boolean;
  portfolioMinMembers: number;
  portfolioMaxMembers: number;
  signalExpirationHours: number;
  feedItemsLimit: number;
}

// ============================================================================
// Default Social Trading Engine Implementation
// ============================================================================

export class DefaultSocialTradingEngine implements SocialTradingEngine {
  private readonly follows: Map<string, SocialFollow> = new Map();
  private readonly portfolios: Map<string, CommunityPortfolio> = new Map();
  private readonly signals: Map<string, TradingSignal> = new Map();
  private readonly feedItems: Map<string, FeedItem[]> = new Map();
  private readonly signalReactions: Map<string, Set<string>> = new Map(); // signalId -> userIds who reacted
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: SocialTradingEngineConfig;

  constructor(config?: Partial<SocialTradingConfig>) {
    this.config = {
      maxFollowsPerUser: config?.maxFollowsPerUser ?? 1000,
      signalsPremiumOnly: config?.signalsPremiumOnly ?? false,
      portfolioMinMembers: config?.portfolioMinMembers ?? 2,
      portfolioMaxMembers: config?.portfolioMaxMembers ?? 100,
      signalExpirationHours: 24,
      feedItemsLimit: 100,
    };
  }

  // ============================================================================
  // Social Follows
  // ============================================================================

  async follow(
    followerId: string,
    followedId: string,
    type: SocialFollow['type']
  ): Promise<SocialFollow> {
    // Prevent self-follow
    if (followerId === followedId && type === 'user') {
      throw new Error('Cannot follow yourself');
    }

    // Check follow limit
    const currentFollowing = await this.getFollowing(followerId);
    if (currentFollowing.length >= this.config.maxFollowsPerUser) {
      throw new Error(`Maximum follow limit reached: ${this.config.maxFollowsPerUser}`);
    }

    // Check for existing follow
    const existingFollow = Array.from(this.follows.values()).find(
      f => f.followerId === followerId && f.followedId === followedId && f.type === type
    );
    if (existingFollow) {
      throw new Error('Already following this entity');
    }

    const now = new Date();
    const followId = this.generateId('follow');

    const follow: SocialFollow = {
      id: followId,
      followerId,
      followedId,
      type,
      status: 'active',
      notifications: {
        onTrade: true,
        onPerformanceMilestone: true,
        onStrategyUpdate: true,
        onNewContent: true,
        frequency: 'realtime',
      },
      createdAt: now,
      updatedAt: now,
    };

    this.follows.set(followId, follow);

    // Add to feed
    await this.addFeedItem(followerId, {
      type: 'user_followed',
      actorId: followerId,
      relatedEntity: { type, id: followedId, name: followedId },
    });

    return follow;
  }

  async unfollow(followId: string): Promise<void> {
    const follow = this.follows.get(followId);
    if (!follow) {
      throw new Error(`Follow not found: ${followId}`);
    }

    this.follows.delete(followId);
  }

  async getFollowers(userId: string, type?: SocialFollow['type']): Promise<SocialFollow[]> {
    return Array.from(this.follows.values()).filter(
      f => f.followedId === userId && f.status === 'active' && (!type || f.type === type)
    );
  }

  async getFollowing(userId: string, type?: SocialFollow['type']): Promise<SocialFollow[]> {
    return Array.from(this.follows.values()).filter(
      f => f.followerId === userId && f.status === 'active' && (!type || f.type === type)
    );
  }

  async updateNotificationSettings(
    followId: string,
    settings: Partial<FollowNotificationSettings>
  ): Promise<SocialFollow> {
    const follow = this.follows.get(followId);
    if (!follow) {
      throw new Error(`Follow not found: ${followId}`);
    }

    follow.notifications = {
      ...follow.notifications,
      ...settings,
    };
    follow.updatedAt = new Date();

    this.follows.set(followId, follow);
    return follow;
  }

  // ============================================================================
  // Community Portfolios
  // ============================================================================

  async createPortfolio(input: CreatePortfolioInput): Promise<CommunityPortfolio> {
    const now = new Date();
    const portfolioId = this.generateId('portfolio');

    const defaultRules: PortfolioRules = {
      minInvestment: 10,
      maxInvestment: 100000,
      lockPeriodDays: 7,
      entryFee: 0,
      exitFee: 0,
      performanceFee: 20,
      rebalanceFrequency: 'weekly',
      votingEnabled: input.type === 'collaborative',
      votingThreshold: 0.51,
    };

    const portfolio: CommunityPortfolio = {
      id: portfolioId,
      name: input.name,
      description: input.description,
      creatorId: input.creatorId,
      visibility: input.visibility,
      type: input.type,
      members: [
        {
          userId: input.creatorId,
          role: 'owner',
          capitalContributed: 0,
          joinedAt: now,
          permissions: ['manage', 'allocate', 'invite', 'remove'],
        },
      ],
      allocations: input.initialAllocations ?? [],
      performance: {
        totalValue: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        roi30d: 0,
        roi90d: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        followerCount: 0,
        updatedAt: now,
      },
      rules: { ...defaultRules, ...input.rules },
      createdAt: now,
      updatedAt: now,
    };

    this.portfolios.set(portfolioId, portfolio);

    await this.addFeedItem(input.creatorId, {
      type: 'portfolio_joined',
      actorId: input.creatorId,
      relatedEntity: { type: 'portfolio', id: portfolioId, name: input.name },
    });

    return portfolio;
  }

  async getPortfolio(portfolioId: string): Promise<CommunityPortfolio | null> {
    return this.portfolios.get(portfolioId) ?? null;
  }

  async updatePortfolio(
    portfolioId: string,
    updates: UpdatePortfolioInput
  ): Promise<CommunityPortfolio> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    if (updates.name) portfolio.name = updates.name;
    if (updates.description) portfolio.description = updates.description;
    if (updates.visibility) portfolio.visibility = updates.visibility;
    if (updates.rules) {
      portfolio.rules = { ...portfolio.rules, ...updates.rules };
    }
    portfolio.updatedAt = new Date();

    this.portfolios.set(portfolioId, portfolio);
    return portfolio;
  }

  async joinPortfolio(
    portfolioId: string,
    userId: string,
    capital: number
  ): Promise<PortfolioMember> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    // Check if already a member
    if (portfolio.members.some(m => m.userId === userId)) {
      throw new Error('Already a member of this portfolio');
    }

    // Check member limit
    if (portfolio.members.length >= this.config.portfolioMaxMembers) {
      throw new Error('Portfolio has reached maximum members');
    }

    // Validate capital
    if (capital < portfolio.rules.minInvestment) {
      throw new Error(`Minimum investment is ${portfolio.rules.minInvestment}`);
    }
    if (capital > portfolio.rules.maxInvestment) {
      throw new Error(`Maximum investment is ${portfolio.rules.maxInvestment}`);
    }

    const now = new Date();
    const member: PortfolioMember = {
      userId,
      role: 'follower',
      capitalContributed: capital,
      joinedAt: now,
      permissions: ['view'],
    };

    portfolio.members.push(member);
    portfolio.performance.totalValue += capital;
    portfolio.performance.followerCount = portfolio.members.length - 1; // Exclude owner
    portfolio.updatedAt = now;

    this.portfolios.set(portfolioId, portfolio);

    await this.addFeedItem(userId, {
      type: 'portfolio_joined',
      actorId: userId,
      relatedEntity: { type: 'portfolio', id: portfolioId, name: portfolio.name },
    });

    return member;
  }

  async leavePortfolio(portfolioId: string, userId: string): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const memberIndex = portfolio.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error('Not a member of this portfolio');
    }

    const member = portfolio.members[memberIndex];
    if (member.role === 'owner') {
      throw new Error('Owner cannot leave the portfolio');
    }

    portfolio.performance.totalValue -= member.capitalContributed;
    portfolio.performance.followerCount--;
    portfolio.members.splice(memberIndex, 1);
    portfolio.updatedAt = new Date();

    this.portfolios.set(portfolioId, portfolio);
  }

  async updateAllocations(
    portfolioId: string,
    allocations: PortfolioAllocation[]
  ): Promise<CommunityPortfolio> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    // Validate total weight
    const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Allocation weights must sum to 100%');
    }

    portfolio.allocations = allocations;
    portfolio.updatedAt = new Date();

    this.portfolios.set(portfolioId, portfolio);
    return portfolio;
  }

  async listPortfolios(filter?: PortfolioFilter): Promise<CommunityPortfolio[]> {
    let portfolios = Array.from(this.portfolios.values());

    if (filter?.type) {
      portfolios = portfolios.filter(p => p.type === filter.type);
    }
    if (filter?.visibility) {
      portfolios = portfolios.filter(p => p.visibility === filter.visibility);
    }
    if (filter?.minMembers) {
      portfolios = portfolios.filter(p => p.members.length >= filter.minMembers!);
    }
    if (filter?.minPerformance) {
      portfolios = portfolios.filter(p => p.performance.totalPnlPercent >= filter.minPerformance!);
    }
    if (filter?.creatorId) {
      portfolios = portfolios.filter(p => p.creatorId === filter.creatorId);
    }

    // Sort
    if (filter?.sortBy) {
      portfolios.sort((a, b) => {
        switch (filter.sortBy) {
          case 'performance':
            return b.performance.totalPnlPercent - a.performance.totalPnlPercent;
          case 'members':
            return b.members.length - a.members.length;
          case 'created':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'name':
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
    }

    if (filter?.limit) {
      portfolios = portfolios.slice(0, filter.limit);
    }

    return portfolios;
  }

  // ============================================================================
  // Trading Signals
  // ============================================================================

  async createSignal(input: CreateSignalInput): Promise<TradingSignal> {
    if (input.confidence < 0 || input.confidence > 100) {
      throw new Error('Confidence must be between 0 and 100');
    }

    const now = new Date();
    const signalId = this.generateId('signal');

    const signal: TradingSignal = {
      id: signalId,
      creatorId: input.creatorId,
      type: input.type,
      asset: input.asset,
      confidence: input.confidence,
      reasoning: input.reasoning,
      targetPrice: input.targetPrice,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      timeframe: input.timeframe,
      visibility: input.visibility,
      reactions: {
        likes: 0,
        comments: 0,
        shares: 0,
        copies: 0,
      },
      createdAt: now,
      expiresAt: input.expiresAt ?? new Date(now.getTime() + this.config.signalExpirationHours * 60 * 60 * 1000),
    };

    this.signals.set(signalId, signal);
    this.signalReactions.set(signalId, new Set());

    await this.addFeedItem(input.creatorId, {
      type: 'signal_created',
      actorId: input.creatorId,
      relatedEntity: { type: 'signal', id: signalId, name: `${input.type.toUpperCase()} ${input.asset}` },
    });

    return signal;
  }

  async getSignal(signalId: string): Promise<TradingSignal | null> {
    return this.signals.get(signalId) ?? null;
  }

  async updateSignalPerformance(
    signalId: string,
    performance: SignalPerformance
  ): Promise<TradingSignal> {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    signal.performance = performance;
    this.signals.set(signalId, signal);

    if (performance.hitTarget) {
      await this.addFeedItem(signal.creatorId, {
        type: 'milestone_reached',
        actorId: signal.creatorId,
        relatedEntity: { type: 'signal', id: signalId, name: `${signal.type.toUpperCase()} ${signal.asset} hit target!` },
      });
    }

    return signal;
  }

  async reactToSignal(
    signalId: string,
    userId: string,
    reaction: ReactionType
  ): Promise<SignalReactions> {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    const reactions = this.signalReactions.get(signalId) ?? new Set();
    const reactionKey = `${userId}:${reaction}`;

    if (reactions.has(reactionKey)) {
      throw new Error('Already reacted with this type');
    }

    reactions.add(reactionKey);
    this.signalReactions.set(signalId, reactions);

    switch (reaction) {
      case 'like':
        signal.reactions.likes++;
        break;
      case 'comment':
        signal.reactions.comments++;
        break;
      case 'share':
        signal.reactions.shares++;
        break;
      case 'copy':
        signal.reactions.copies++;
        break;
    }

    this.signals.set(signalId, signal);
    return signal.reactions;
  }

  async listSignals(filter?: SignalFilter): Promise<TradingSignal[]> {
    const now = new Date();
    let signals = Array.from(this.signals.values());

    // Filter out expired signals by default
    if (filter?.active !== false) {
      signals = signals.filter(s => !s.expiresAt || s.expiresAt > now);
    }

    if (filter?.creatorId) {
      signals = signals.filter(s => s.creatorId === filter.creatorId);
    }
    if (filter?.type) {
      signals = signals.filter(s => s.type === filter.type);
    }
    if (filter?.asset) {
      signals = signals.filter(s => s.asset === filter.asset);
    }
    if (filter?.minConfidence) {
      signals = signals.filter(s => s.confidence >= filter.minConfidence!);
    }
    if (filter?.visibility) {
      signals = signals.filter(s => s.visibility === filter.visibility);
    }

    // Sort
    if (filter?.sortBy) {
      signals.sort((a, b) => {
        switch (filter.sortBy) {
          case 'confidence':
            return b.confidence - a.confidence;
          case 'created':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'reactions':
            return (b.reactions.likes + b.reactions.shares) - (a.reactions.likes + a.reactions.shares);
          case 'performance':
            return (b.performance?.actualPnlPercent ?? 0) - (a.performance?.actualPnlPercent ?? 0);
          default:
            return 0;
        }
      });
    }

    if (filter?.limit) {
      signals = signals.slice(0, filter.limit);
    }

    return signals;
  }

  async getUserSignals(userId: string): Promise<TradingSignal[]> {
    return this.listSignals({ creatorId: userId });
  }

  // ============================================================================
  // Social Feed
  // ============================================================================

  async getFeed(userId: string, limit: number = 50): Promise<FeedItem[]> {
    // Get items from user and followed users
    const following = await this.getFollowing(userId);
    const followedIds = [userId, ...following.map(f => f.followedId)];

    const items: FeedItem[] = [];
    for (const id of followedIds) {
      const userItems = this.feedItems.get(id) ?? [];
      items.push(...userItems);
    }

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return items.slice(0, limit);
  }

  async getSocialStats(userId: string): Promise<SocialStats> {
    const followers = await this.getFollowers(userId);
    const following = await this.getFollowing(userId);
    const portfolios = await this.listPortfolios({ creatorId: userId });
    const memberPortfolios = Array.from(this.portfolios.values()).filter(
      p => p.members.some(m => m.userId === userId)
    );
    const signals = await this.getUserSignals(userId);

    // Calculate signal accuracy
    const evaluatedSignals = signals.filter(s => s.performance);
    const accurateSignals = evaluatedSignals.filter(s => s.performance?.hitTarget);
    const signalAccuracy = evaluatedSignals.length > 0
      ? (accurateSignals.length / evaluatedSignals.length) * 100
      : 0;

    // Calculate total reactions
    const totalReactions = signals.reduce(
      (sum, s) => sum + s.reactions.likes + s.reactions.comments + s.reactions.shares + s.reactions.copies,
      0
    );

    // Calculate social score (weighted combination)
    const socialScore = Math.min(
      100,
      followers.length * 2 +
      signals.length * 5 +
      signalAccuracy * 0.5 +
      portfolios.length * 10 +
      totalReactions * 0.1
    );

    return {
      followers: followers.length,
      following: following.length,
      portfoliosCreated: portfolios.length,
      portfoliosJoined: memberPortfolios.length,
      signalsCreated: signals.length,
      signalAccuracy,
      totalReactions,
      socialScore,
    };
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async addFeedItem(
    userId: string,
    item: Partial<FeedItem> & { type: FeedItemType; actorId: string }
  ): Promise<void> {
    const feedItem: FeedItem = {
      id: this.generateId('feed'),
      type: item.type,
      actorId: item.actorId,
      actorName: item.actorName ?? item.actorId,
      content: this.generateFeedContent(item.type, item.relatedEntity),
      relatedEntity: item.relatedEntity,
      timestamp: new Date(),
      reactions: { likes: 0, comments: 0, shares: 0 },
    };

    const userFeed = this.feedItems.get(userId) ?? [];
    userFeed.unshift(feedItem);

    // Keep only recent items
    if (userFeed.length > this.config.feedItemsLimit) {
      userFeed.pop();
    }

    this.feedItems.set(userId, userFeed);
  }

  private generateFeedContent(
    type: FeedItemType,
    entity?: { type: string; id: string; name: string }
  ): string {
    switch (type) {
      case 'signal_created':
        return `Created a new trading signal: ${entity?.name ?? 'Signal'}`;
      case 'portfolio_joined':
        return `Joined portfolio: ${entity?.name ?? 'Portfolio'}`;
      case 'milestone_reached':
        return `Reached a milestone: ${entity?.name ?? 'Achievement'}`;
      case 'trade_executed':
        return `Executed a trade`;
      case 'achievement_earned':
        return `Earned an achievement: ${entity?.name ?? 'Achievement'}`;
      case 'user_followed':
        return `Started following ${entity?.name ?? 'someone'}`;
      default:
        return 'Activity';
    }
  }

}

// ============================================================================
// Factory Function
// ============================================================================

export function createSocialTradingEngine(
  config?: Partial<SocialTradingConfig>
): DefaultSocialTradingEngine {
  return new DefaultSocialTradingEngine(config);
}
