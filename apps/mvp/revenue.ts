/**
 * TONAIAgent - Revenue MVP Service
 *
 * Comprehensive revenue and monetization system including
 * performance fees, premium AI, strategy creator revenue share,
 * and payout management.
 */

import type {
  RevenueConfig,
  RevenueMetrics,
  PremiumSubscription,
  MVPEvent,
  MVPEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default revenue configuration
 */
export const defaultRevenueConfig: RevenueConfig = {
  enabled: true,
  defaultPerformanceFee: 10, // 10%
  maxPerformanceFee: 20, // 20%
  platformFee: 2.5, // 2.5%
  premiumAiEnabled: true,
  premiumAiPrice: 29, // $29/month
  creatorRevenueShare: 70, // 70% to creator, 30% to platform
  payoutThreshold: 10, // $10 minimum
  payoutFrequency: 'weekly',
};

/**
 * Premium tier configurations
 */
export const premiumTiers: PremiumTierConfig[] = [
  {
    tier: 'basic',
    name: 'Starter',
    price: 0,
    features: [
      '3 active agents',
      'Basic strategies',
      'Community support',
      'Standard AI assistant',
    ],
    maxAgents: 3,
    maxStrategies: 5,
    aiRequestsPerDay: 50,
    prioritySupport: false,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 29,
    features: [
      '10 active agents',
      'Advanced strategies',
      'Priority support',
      'Advanced AI analytics',
      'Custom risk controls',
      'API access',
    ],
    maxAgents: 10,
    maxStrategies: 20,
    aiRequestsPerDay: 500,
    prioritySupport: true,
  },
  {
    tier: 'institutional',
    name: 'Institutional',
    price: 299,
    features: [
      'Unlimited agents',
      'All strategies',
      'Dedicated support',
      'White-label options',
      'Custom integrations',
      'Compliance tools',
      'Dedicated account manager',
    ],
    maxAgents: -1, // Unlimited
    maxStrategies: -1,
    aiRequestsPerDay: -1,
    prioritySupport: true,
  },
];

// ============================================================================
// Revenue Manager
// ============================================================================

/**
 * Revenue Manager for MVP
 *
 * Handles all revenue-related functionality including fees,
 * subscriptions, and payouts.
 */
export class RevenueManager {
  readonly config: RevenueConfig;

  private readonly subscriptions: Map<string, PremiumSubscription> = new Map();
  private readonly feeRecords: Map<string, FeeRecord[]> = new Map();
  private readonly creatorBalances: Map<string, CreatorBalance> = new Map();
  private readonly payoutHistory: Map<string, Payout[]> = new Map();
  private readonly eventCallbacks: MVPEventCallback[] = [];

  // Accumulated revenue metrics
  private totalRevenue: RevenueAccumulator = {
    performanceFees: 0,
    managementFees: 0,
    platformFees: 0,
    premiumRevenue: 0,
    totalRevenue: 0,
  };

  constructor(config: Partial<RevenueConfig> = {}) {
    this.config = {
      ...defaultRevenueConfig,
      ...config,
    };
  }

  // ============================================================================
  // Fee Collection
  // ============================================================================

  /**
   * Record performance fee from agent trade
   */
  async recordPerformanceFee(input: RecordFeeInput): Promise<FeeRecord> {
    const platformCut = input.feeAmount * (1 - this.config.creatorRevenueShare / 100);
    const creatorCut = input.feeAmount * (this.config.creatorRevenueShare / 100);

    const record: FeeRecord = {
      id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'performance',
      agentId: input.agentId,
      strategyId: input.strategyId,
      creatorId: input.creatorId,
      userId: input.userId,
      profitAmount: input.profitAmount,
      feePercentage: input.feePercentage,
      feeAmount: input.feeAmount,
      platformShare: platformCut,
      creatorShare: creatorCut,
      timestamp: new Date(),
    };

    // Store record
    const userRecords = this.feeRecords.get(input.userId) ?? [];
    userRecords.push(record);
    this.feeRecords.set(input.userId, userRecords);

    // Update creator balance
    await this.updateCreatorBalance(input.creatorId, creatorCut);

    // Update totals
    this.totalRevenue.performanceFees += platformCut;
    this.totalRevenue.totalRevenue += platformCut;

    this.emitEvent({
      type: 'revenue_collected',
      timestamp: new Date(),
      userId: input.userId,
      agentId: input.agentId,
      data: {
        type: 'performance_fee',
        amount: input.feeAmount,
        platformShare: platformCut,
        creatorShare: creatorCut,
      },
    });

    return record;
  }

  /**
   * Record management fee
   */
  async recordManagementFee(input: RecordFeeInput): Promise<FeeRecord> {
    const platformCut = input.feeAmount * (1 - this.config.creatorRevenueShare / 100);
    const creatorCut = input.feeAmount * (this.config.creatorRevenueShare / 100);

    const record: FeeRecord = {
      id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'management',
      agentId: input.agentId,
      strategyId: input.strategyId,
      creatorId: input.creatorId,
      userId: input.userId,
      profitAmount: input.profitAmount,
      feePercentage: input.feePercentage,
      feeAmount: input.feeAmount,
      platformShare: platformCut,
      creatorShare: creatorCut,
      timestamp: new Date(),
    };

    const userRecords = this.feeRecords.get(input.userId) ?? [];
    userRecords.push(record);
    this.feeRecords.set(input.userId, userRecords);

    await this.updateCreatorBalance(input.creatorId, creatorCut);

    this.totalRevenue.managementFees += platformCut;
    this.totalRevenue.totalRevenue += platformCut;

    return record;
  }

  /**
   * Get fee history for user
   */
  getUserFeeHistory(userId: string): FeeRecord[] {
    return this.feeRecords.get(userId) ?? [];
  }

  // ============================================================================
  // Premium Subscriptions
  // ============================================================================

  /**
   * Create or update subscription
   */
  async createSubscription(
    userId: string,
    tier: 'basic' | 'pro' | 'institutional',
    autoRenew: boolean = true
  ): Promise<PremiumSubscription> {
    const tierConfig = premiumTiers.find((t) => t.tier === tier);
    if (!tierConfig) {
      throw new Error('Invalid tier');
    }

    const subscription: PremiumSubscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      tier,
      status: 'active',
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      pricePaid: tierConfig.price,
      features: tierConfig.features,
      autoRenew,
    };

    this.subscriptions.set(userId, subscription);

    if (tierConfig.price > 0) {
      this.totalRevenue.premiumRevenue += tierConfig.price;
      this.totalRevenue.totalRevenue += tierConfig.price;
    }

    return subscription;
  }

  /**
   * Get user subscription
   */
  getSubscription(userId: string): PremiumSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(
    userId: string,
    newTier: 'pro' | 'institutional'
  ): Promise<PremiumSubscription> {
    const currentSub = this.subscriptions.get(userId);
    const newTierConfig = premiumTiers.find((t) => t.tier === newTier);

    if (!newTierConfig) {
      throw new Error('Invalid tier');
    }

    // Calculate prorated amount if upgrading mid-cycle
    let priceToPay = newTierConfig.price;
    if (currentSub && currentSub.status === 'active') {
      const currentTierConfig = premiumTiers.find((t) => t.tier === currentSub.tier);
      if (currentTierConfig) {
        const daysRemaining = Math.max(
          0,
          (currentSub.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        const currentDailyRate = currentTierConfig.price / 30;
        const newDailyRate = newTierConfig.price / 30;
        priceToPay = (newDailyRate - currentDailyRate) * daysRemaining;
      }
    }

    const subscription: PremiumSubscription = {
      id: `sub_${userId}_${Date.now()}`,
      userId,
      tier: newTier,
      status: 'active',
      startedAt: new Date(),
      endsAt: currentSub?.endsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      pricePaid: priceToPay,
      features: newTierConfig.features,
      autoRenew: currentSub?.autoRenew ?? true,
    };

    this.subscriptions.set(userId, subscription);

    if (priceToPay > 0) {
      this.totalRevenue.premiumRevenue += priceToPay;
      this.totalRevenue.totalRevenue += priceToPay;
    }

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<PremiumSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'canceled';
    subscription.autoRenew = false;
    this.subscriptions.set(userId, subscription);

    return subscription;
  }

  /**
   * Check if user has premium feature access
   */
  hasFeatureAccess(userId: string, feature: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      // Check basic tier
      const basicTier = premiumTiers.find((t) => t.tier === 'basic');
      return basicTier?.features.includes(feature) ?? false;
    }
    return subscription.features.includes(feature);
  }

  /**
   * Get user's subscription limits
   */
  getSubscriptionLimits(userId: string): SubscriptionLimits {
    const subscription = this.subscriptions.get(userId);
    const tier = subscription?.tier ?? 'basic';
    const tierConfig = premiumTiers.find((t) => t.tier === tier);

    return {
      maxAgents: tierConfig?.maxAgents ?? 3,
      maxStrategies: tierConfig?.maxStrategies ?? 5,
      aiRequestsPerDay: tierConfig?.aiRequestsPerDay ?? 50,
      prioritySupport: tierConfig?.prioritySupport ?? false,
    };
  }

  // ============================================================================
  // Creator Payouts
  // ============================================================================

  /**
   * Get creator balance
   */
  getCreatorBalance(creatorId: string): CreatorBalance {
    return (
      this.creatorBalances.get(creatorId) ?? {
        creatorId,
        available: 0,
        pending: 0,
        lifetime: 0,
        lastPayout: undefined,
      }
    );
  }

  /**
   * Request payout
   */
  async requestPayout(
    creatorId: string,
    amount: number,
    walletAddress: string
  ): Promise<Payout> {
    const balance = this.getCreatorBalance(creatorId);

    if (amount > balance.available) {
      throw new Error('Insufficient balance');
    }

    if (amount < this.config.payoutThreshold) {
      throw new Error(`Minimum payout is $${this.config.payoutThreshold}`);
    }

    const payout: Payout = {
      id: `payout_${creatorId}_${Date.now()}`,
      creatorId,
      amount,
      walletAddress,
      status: 'pending',
      requestedAt: new Date(),
    };

    // Update balance
    balance.available -= amount;
    balance.pending += amount;
    this.creatorBalances.set(creatorId, balance);

    // Store payout
    const payouts = this.payoutHistory.get(creatorId) ?? [];
    payouts.push(payout);
    this.payoutHistory.set(creatorId, payouts);

    this.emitEvent({
      type: 'payout_processed',
      timestamp: new Date(),
      userId: creatorId,
      data: {
        payoutId: payout.id,
        amount,
        status: 'pending',
      },
    });

    return payout;
  }

  /**
   * Process pending payout (admin/system action)
   */
  async processPayout(payoutId: string): Promise<Payout> {
    // Find payout
    for (const [creatorId, payouts] of this.payoutHistory.entries()) {
      const payout = payouts.find((p) => p.id === payoutId);
      if (payout) {
        payout.status = 'completed';
        payout.processedAt = new Date();

        // Update balance
        const balance = this.getCreatorBalance(creatorId);
        balance.pending -= payout.amount;
        this.creatorBalances.set(creatorId, balance);

        return payout;
      }
    }

    throw new Error('Payout not found');
  }

  /**
   * Get creator payout history
   */
  getPayoutHistory(creatorId: string): Payout[] {
    return this.payoutHistory.get(creatorId) ?? [];
  }

  // ============================================================================
  // Revenue Metrics
  // ============================================================================

  /**
   * Get revenue metrics
   */
  getRevenueMetrics(period: '24h' | '7d' | '30d' | 'all'): RevenueMetrics {
    // In production, would filter by period from actual records
    // For MVP, return accumulated totals with simulated period adjustments
    const periodMultiplier =
      period === '24h' ? 1/30 :
      period === '7d' ? 7/30 :
      period === '30d' ? 1 :
      12;

    const metrics: RevenueMetrics = {
      period,
      performanceFees: this.totalRevenue.performanceFees * periodMultiplier,
      managementFees: this.totalRevenue.managementFees * periodMultiplier,
      platformFees: this.totalRevenue.platformFees * periodMultiplier,
      premiumRevenue: this.totalRevenue.premiumRevenue * periodMultiplier,
      totalRevenue: this.totalRevenue.totalRevenue * periodMultiplier,
      revenueGrowth: 15, // Simulated 15% growth
      arpu: this.calculateARPU(),
      ltv: this.calculateLTV(),
    };

    return metrics;
  }

  /**
   * Get total platform revenue
   */
  getTotalRevenue(): RevenueAccumulator {
    return { ...this.totalRevenue };
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
   * Update creator balance
   */
  private async updateCreatorBalance(
    creatorId: string,
    amount: number
  ): Promise<void> {
    const balance = this.getCreatorBalance(creatorId);
    balance.available += amount;
    balance.lifetime += amount;
    this.creatorBalances.set(creatorId, balance);
  }

  /**
   * Calculate Average Revenue Per User
   */
  private calculateARPU(): number {
    const activeSubscribers = Array.from(this.subscriptions.values()).filter(
      (s) => s.status === 'active'
    ).length;

    if (activeSubscribers === 0) return 0;
    return this.totalRevenue.totalRevenue / activeSubscribers;
  }

  /**
   * Calculate Lifetime Value
   */
  private calculateLTV(): number {
    // Simplified LTV calculation
    const arpu = this.calculateARPU();
    const avgMonthsRetained = 12; // Assumed
    return arpu * avgMonthsRetained;
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Premium tier configuration
 */
export interface PremiumTierConfig {
  tier: 'basic' | 'pro' | 'institutional';
  name: string;
  price: number;
  features: string[];
  maxAgents: number;
  maxStrategies: number;
  aiRequestsPerDay: number;
  prioritySupport: boolean;
}

/**
 * Fee record
 */
export interface FeeRecord {
  id: string;
  type: 'performance' | 'management' | 'platform';
  agentId: string;
  strategyId: string;
  creatorId: string;
  userId: string;
  profitAmount: number;
  feePercentage: number;
  feeAmount: number;
  platformShare: number;
  creatorShare: number;
  timestamp: Date;
}

/**
 * Record fee input
 */
export interface RecordFeeInput {
  agentId: string;
  strategyId: string;
  creatorId: string;
  userId: string;
  profitAmount: number;
  feePercentage: number;
  feeAmount: number;
}

/**
 * Creator balance
 */
export interface CreatorBalance {
  creatorId: string;
  available: number;
  pending: number;
  lifetime: number;
  lastPayout?: Date;
}

/**
 * Payout record
 */
export interface Payout {
  id: string;
  creatorId: string;
  amount: number;
  walletAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  processedAt?: Date;
  transactionHash?: string;
}

/**
 * Subscription limits
 */
export interface SubscriptionLimits {
  maxAgents: number;
  maxStrategies: number;
  aiRequestsPerDay: number;
  prioritySupport: boolean;
}

/**
 * Revenue accumulator
 */
export interface RevenueAccumulator {
  performanceFees: number;
  managementFees: number;
  platformFees: number;
  premiumRevenue: number;
  totalRevenue: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Revenue Manager
 */
export function createRevenueManager(
  config?: Partial<RevenueConfig>
): RevenueManager {
  return new RevenueManager(config);
}
