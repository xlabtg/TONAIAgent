/**
 * TONAIAgent - Super App Monetization Module
 *
 * Premium features, subscriptions, and revenue management for the Super App.
 *
 * Features:
 * - Subscription tiers (Free, Basic, Pro, Enterprise)
 * - Premium feature management
 * - Billing and payments via TON
 * - Usage tracking and limits
 * - Trial management
 */

import type {
  SuperAppSubscription,
  SubscriptionTier,
  SubscriptionFeature,
  PremiumFeature,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface SuperAppMonetizationConfig {
  enabled: boolean;
  subscriptionsEnabled: boolean;
  freeTrialDays: number;
  tiers: TierConfig[];
  premiumFeatures: PremiumFeature[];
  gracePeriodDays: number;
  autoRenewDefault: boolean;
}

export interface TierConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateSubscriptionInput {
  userId: string;
  tier: SubscriptionTier;
  billingFrequency: 'monthly' | 'yearly';
  paymentMethod: 'ton' | 'jetton' | 'subscription_nft';
  autoRenew?: boolean;
}

export interface UpgradeSubscriptionInput {
  userId: string;
  newTier: SubscriptionTier;
  prorate?: boolean;
}

export interface PurchaseFeatureInput {
  userId: string;
  featureId: string;
  quantity?: number;
}

// ============================================================================
// Monetization Manager Interface
// ============================================================================

export interface SuperAppMonetizationManager {
  // Subscriptions
  getSubscription(userId: string): Promise<SuperAppSubscription | null>;
  createSubscription(input: CreateSubscriptionInput): Promise<SuperAppSubscription>;
  upgradeSubscription(input: UpgradeSubscriptionInput): Promise<SuperAppSubscription>;
  downgradeSubscription(userId: string, newTier: SubscriptionTier): Promise<SuperAppSubscription>;
  cancelSubscription(userId: string): Promise<void>;
  renewSubscription(userId: string): Promise<SuperAppSubscription>;
  startTrial(userId: string): Promise<SuperAppSubscription>;

  // Features
  getAvailableFeatures(tier?: SubscriptionTier): Promise<PremiumFeature[]>;
  getFeature(featureId: string): Promise<PremiumFeature | null>;
  hasFeature(userId: string, featureId: string): Promise<boolean>;
  purchaseFeature(input: PurchaseFeatureInput): Promise<SubscriptionFeature>;
  getUsage(userId: string, featureId: string): Promise<{ used: number; limit: number }>;
  trackUsage(userId: string, featureId: string, amount?: number): Promise<void>;

  // Tiers
  getTiers(): TierConfig[];
  getTier(tier: SubscriptionTier): TierConfig | null;
  compareTiers(tier1: SubscriptionTier, tier2: SubscriptionTier): number;

  // Billing
  getBillingHistory(userId: string): Promise<BillingRecord[]>;
  processPayment(userId: string, amount: number, currency: string): Promise<PaymentResult>;
  refund(paymentId: string, amount?: number): Promise<RefundResult>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

export interface BillingRecord {
  id: string;
  userId: string;
  type: 'subscription' | 'feature' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  createdAt: Date;
  completedAt?: Date;
  txHash?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  txHash?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  txHash?: string;
  error?: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultSuperAppMonetizationManager implements SuperAppMonetizationManager {
  private readonly config: SuperAppMonetizationConfig;
  private readonly subscriptions = new Map<string, SuperAppSubscription>();
  private readonly billingRecords = new Map<string, BillingRecord[]>();
  private readonly featureUsage = new Map<string, Map<string, number>>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<SuperAppMonetizationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      subscriptionsEnabled: config.subscriptionsEnabled ?? true,
      freeTrialDays: config.freeTrialDays ?? 14,
      gracePeriodDays: config.gracePeriodDays ?? 7,
      autoRenewDefault: config.autoRenewDefault ?? true,
      tiers: config.tiers ?? this.getDefaultTiers(),
      premiumFeatures: config.premiumFeatures ?? this.getDefaultPremiumFeatures(),
    };
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  async getSubscription(userId: string): Promise<SuperAppSubscription | null> {
    return this.subscriptions.get(userId) ?? null;
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SuperAppSubscription> {
    const tierConfig = this.getTier(input.tier);
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${input.tier}`);
    }

    // Check if user already has subscription
    const existing = this.subscriptions.get(input.userId);
    if (existing && existing.status === 'active') {
      throw new Error('User already has an active subscription');
    }

    const price = input.billingFrequency === 'yearly'
      ? tierConfig.yearlyPrice
      : tierConfig.monthlyPrice;

    // Process payment
    const paymentResult = await this.processPayment(
      input.userId,
      price,
      tierConfig.currency
    );

    if (!paymentResult.success) {
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }

    const features = this.getFeaturesForTier(input.tier, tierConfig);
    const now = new Date();
    const expiresAt = new Date(now);
    if (input.billingFrequency === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const subscription: SuperAppSubscription = {
      userId: input.userId,
      tier: input.tier,
      status: 'active',
      features,
      billing: {
        method: input.paymentMethod,
        amount: price,
        currency: tierConfig.currency,
        frequency: input.billingFrequency,
        nextBillingDate: expiresAt,
        autoRenew: input.autoRenew ?? this.config.autoRenewDefault,
      },
      startedAt: now,
      expiresAt,
    };

    this.subscriptions.set(input.userId, subscription);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: now,
      type: 'subscription_started',
      severity: 'info',
      source: 'monetization',
      userId: input.userId,
      message: `Subscription started: ${tierConfig.name}`,
      data: { tier: input.tier, expiresAt },
    });

    return subscription;
  }

  async upgradeSubscription(input: UpgradeSubscriptionInput): Promise<SuperAppSubscription> {
    const subscription = this.subscriptions.get(input.userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    const currentTierRank = this.getTierRank(subscription.tier);
    const newTierRank = this.getTierRank(input.newTier);

    if (newTierRank <= currentTierRank) {
      throw new Error('Cannot upgrade to same or lower tier');
    }

    const newTierConfig = this.getTier(input.newTier);
    if (!newTierConfig) {
      throw new Error(`Invalid tier: ${input.newTier}`);
    }

    // Calculate prorated amount
    let amount = subscription.billing.frequency === 'yearly'
      ? newTierConfig.yearlyPrice
      : newTierConfig.monthlyPrice;

    if (input.prorate && subscription.expiresAt) {
      const remaining = subscription.expiresAt.getTime() - Date.now();
      const totalPeriod = subscription.billing.frequency === 'yearly'
        ? 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
      const usedRatio = 1 - remaining / totalPeriod;
      const currentPrice = subscription.billing.amount;
      const credit = currentPrice * (1 - usedRatio);
      amount = Math.max(0, amount - credit);
    }

    // Process payment
    if (amount > 0) {
      const paymentResult = await this.processPayment(
        input.userId,
        amount,
        newTierConfig.currency
      );

      if (!paymentResult.success) {
        throw new Error(`Payment failed: ${paymentResult.error}`);
      }
    }

    // Update subscription
    subscription.tier = input.newTier;
    subscription.features = this.getFeaturesForTier(input.newTier, newTierConfig);

    this.subscriptions.set(input.userId, subscription);

    return subscription;
  }

  async downgradeSubscription(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<SuperAppSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    const newTierConfig = this.getTier(newTier);
    if (!newTierConfig) {
      throw new Error(`Invalid tier: ${newTier}`);
    }

    // Downgrade takes effect at end of current period
    subscription.tier = newTier;
    subscription.features = this.getFeaturesForTier(newTier, newTierConfig);

    const newPrice = subscription.billing.frequency === 'yearly'
      ? newTierConfig.yearlyPrice
      : newTierConfig.monthlyPrice;

    subscription.billing.amount = newPrice;

    this.subscriptions.set(userId, subscription);

    return subscription;
  }

  async cancelSubscription(userId: string): Promise<void> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.billing.autoRenew = false;

    this.subscriptions.set(userId, subscription);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'subscription_cancelled',
      severity: 'info',
      source: 'monetization',
      userId,
      message: 'Subscription cancelled',
      data: { tier: subscription.tier, expiresAt: subscription.expiresAt },
    });
  }

  async renewSubscription(userId: string): Promise<SuperAppSubscription> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      throw new Error('No subscription found');
    }

    const tierConfig = this.getTier(subscription.tier);
    if (!tierConfig) {
      throw new Error('Invalid subscription tier');
    }

    // Process renewal payment
    const paymentResult = await this.processPayment(
      userId,
      subscription.billing.amount,
      subscription.billing.currency
    );

    if (!paymentResult.success) {
      subscription.status = 'past_due';
      this.subscriptions.set(userId, subscription);
      throw new Error(`Renewal payment failed: ${paymentResult.error}`);
    }

    // Extend subscription
    const now = new Date();
    const newExpiry = new Date(subscription.expiresAt ?? now);
    if (subscription.billing.frequency === 'yearly') {
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    } else {
      newExpiry.setMonth(newExpiry.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.expiresAt = newExpiry;
    subscription.billing.nextBillingDate = newExpiry;

    this.subscriptions.set(userId, subscription);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: now,
      type: 'subscription_renewed',
      severity: 'info',
      source: 'monetization',
      userId,
      message: 'Subscription renewed',
      data: { tier: subscription.tier, expiresAt: newExpiry },
    });

    return subscription;
  }

  async startTrial(userId: string): Promise<SuperAppSubscription> {
    const existing = this.subscriptions.get(userId);
    if (existing) {
      throw new Error('User already has a subscription');
    }

    const proTier = this.getTier('pro');
    if (!proTier) {
      throw new Error('Pro tier not found');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.config.freeTrialDays);

    const subscription: SuperAppSubscription = {
      userId,
      tier: 'pro',
      status: 'trial',
      features: this.getFeaturesForTier('pro', proTier),
      billing: {
        method: 'ton',
        amount: 0,
        currency: 'TON',
        frequency: 'monthly',
        autoRenew: false,
      },
      startedAt: now,
      expiresAt,
    };

    this.subscriptions.set(userId, subscription);

    return subscription;
  }

  // ============================================================================
  // Features
  // ============================================================================

  async getAvailableFeatures(tier?: SubscriptionTier): Promise<PremiumFeature[]> {
    if (tier) {
      return this.config.premiumFeatures.filter((f) => {
        const featureTierRank = this.getTierRank(f.requiredTier);
        const userTierRank = this.getTierRank(tier);
        return userTierRank >= featureTierRank;
      });
    }
    return this.config.premiumFeatures;
  }

  async getFeature(featureId: string): Promise<PremiumFeature | null> {
    return this.config.premiumFeatures.find((f) => f.id === featureId) ?? null;
  }

  async hasFeature(userId: string, featureId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || subscription.status !== 'active') {
      // Check if it's a free feature
      const feature = await this.getFeature(featureId);
      return feature?.requiredTier === 'free';
    }

    // Check subscription features first
    if (subscription.features.some((f) => f.id === featureId && f.enabled)) {
      return true;
    }

    // Check premium features based on tier
    const premiumFeature = this.config.premiumFeatures.find((f) => f.id === featureId);
    if (premiumFeature) {
      const userTierRank = this.getTierRank(subscription.tier);
      const requiredTierRank = this.getTierRank(premiumFeature.requiredTier);
      return userTierRank >= requiredTierRank;
    }

    return false;
  }

  async purchaseFeature(input: PurchaseFeatureInput): Promise<SubscriptionFeature> {
    const feature = await this.getFeature(input.featureId);
    if (!feature) {
      throw new Error('Feature not found');
    }

    if (!feature.price) {
      throw new Error('Feature is not purchasable');
    }

    const amount = feature.price.amount * (input.quantity ?? 1);

    // Process payment
    const paymentResult = await this.processPayment(
      input.userId,
      amount,
      feature.price.currency
    );

    if (!paymentResult.success) {
      throw new Error(`Payment failed: ${paymentResult.error}`);
    }

    // Add feature to subscription
    let subscription = this.subscriptions.get(input.userId);
    if (!subscription) {
      // Create free subscription with purchased feature
      subscription = {
        userId: input.userId,
        tier: 'free',
        status: 'active',
        features: [],
        billing: {
          method: 'ton',
          amount: 0,
          currency: 'TON',
          frequency: 'monthly',
          autoRenew: false,
        },
        startedAt: new Date(),
      };
    }

    const subscriptionFeature: SubscriptionFeature = {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      enabled: true,
      limit: input.quantity,
      used: 0,
    };

    const existingIndex = subscription.features.findIndex((f) => f.id === feature.id);
    if (existingIndex >= 0) {
      subscription.features[existingIndex].limit =
        (subscription.features[existingIndex].limit ?? 0) + (input.quantity ?? 1);
    } else {
      subscription.features.push(subscriptionFeature);
    }

    this.subscriptions.set(input.userId, subscription);

    return subscriptionFeature;
  }

  async getUsage(userId: string, featureId: string): Promise<{ used: number; limit: number }> {
    const subscription = this.subscriptions.get(userId);
    const feature = subscription?.features.find((f) => f.id === featureId);

    if (!feature) {
      return { used: 0, limit: 0 };
    }

    const userUsage = this.featureUsage.get(userId);
    const used = userUsage?.get(featureId) ?? 0;

    return {
      used,
      limit: feature.limit ?? Infinity,
    };
  }

  async trackUsage(userId: string, featureId: string, amount = 1): Promise<void> {
    let userUsage = this.featureUsage.get(userId);
    if (!userUsage) {
      userUsage = new Map();
      this.featureUsage.set(userId, userUsage);
    }

    const current = userUsage.get(featureId) ?? 0;
    userUsage.set(featureId, current + amount);

    // Update subscription feature usage
    const subscription = this.subscriptions.get(userId);
    if (subscription) {
      const feature = subscription.features.find((f) => f.id === featureId);
      if (feature) {
        feature.used = (feature.used ?? 0) + amount;
      }
    }
  }

  // ============================================================================
  // Tiers
  // ============================================================================

  getTiers(): TierConfig[] {
    return [...this.config.tiers];
  }

  getTier(tier: SubscriptionTier): TierConfig | null {
    return this.config.tiers.find((t) => t.tier === tier) ?? null;
  }

  compareTiers(tier1: SubscriptionTier, tier2: SubscriptionTier): number {
    return this.getTierRank(tier1) - this.getTierRank(tier2);
  }

  // ============================================================================
  // Billing
  // ============================================================================

  async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    return this.billingRecords.get(userId) ?? [];
  }

  async processPayment(
    userId: string,
    amount: number,
    currency: string
  ): Promise<PaymentResult> {
    // In production, this would integrate with TON payment system
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    const record: BillingRecord = {
      id: paymentId,
      userId,
      type: 'subscription',
      amount,
      currency,
      status: 'completed',
      description: `Payment of ${amount} ${currency}`,
      createdAt: new Date(),
      completedAt: new Date(),
      txHash,
    };

    const userRecords = this.billingRecords.get(userId) ?? [];
    userRecords.unshift(record);
    this.billingRecords.set(userId, userRecords);

    return {
      success: true,
      paymentId,
      txHash,
    };
  }

  async refund(paymentId: string, amount?: number): Promise<RefundResult> {
    // Find the payment
    let paymentRecord: BillingRecord | null = null;
    let userId: string | null = null;

    for (const [uid, records] of this.billingRecords) {
      const record = records.find((r) => r.id === paymentId);
      if (record) {
        paymentRecord = record;
        userId = uid;
        break;
      }
    }

    if (!paymentRecord || !userId) {
      return {
        success: false,
        refundId: '',
        amount: 0,
        error: 'Payment not found',
      };
    }

    const refundAmount = amount ?? paymentRecord.amount;
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    const refundRecord: BillingRecord = {
      id: refundId,
      userId,
      type: 'refund',
      amount: -refundAmount,
      currency: paymentRecord.currency,
      status: 'completed',
      description: `Refund for payment ${paymentId}`,
      createdAt: new Date(),
      completedAt: new Date(),
      txHash,
    };

    const userRecords = this.billingRecords.get(userId) ?? [];
    userRecords.unshift(refundRecord);
    this.billingRecords.set(userId, userRecords);

    // Update original payment status
    paymentRecord.status = 'refunded';

    return {
      success: true,
      refundId,
      amount: refundAmount,
      txHash,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getDefaultTiers(): TierConfig[] {
    return [
      {
        tier: 'free',
        name: 'Free',
        description: 'Get started with basic features',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: 'TON',
        features: [
          '1 AI Agent',
          'Basic Portfolio View',
          'Community Access',
          'Limited AI Assistant',
        ],
        limits: {
          agents: 1,
          strategies: 3,
          daily_trades: 10,
          ai_queries: 5,
        },
      },
      {
        tier: 'basic',
        name: 'Basic',
        description: 'For active traders',
        monthlyPrice: 10,
        yearlyPrice: 100,
        currency: 'TON',
        features: [
          '5 AI Agents',
          'Advanced Analytics',
          'Copy Trading',
          'Email Support',
          '100 AI Queries/month',
        ],
        limits: {
          agents: 5,
          strategies: 20,
          daily_trades: 100,
          ai_queries: 100,
        },
      },
      {
        tier: 'pro',
        name: 'Pro',
        description: 'For serious investors',
        monthlyPrice: 50,
        yearlyPrice: 500,
        currency: 'TON',
        features: [
          'Unlimited AI Agents',
          'Strategy Marketplace Access',
          'Priority Copy Trading',
          'Advanced Risk Tools',
          'API Access',
          'Priority Support',
          'Unlimited AI Queries',
        ],
        limits: {
          agents: -1, // unlimited
          strategies: -1,
          daily_trades: -1,
          ai_queries: -1,
        },
      },
      {
        tier: 'enterprise',
        name: 'Enterprise',
        description: 'For institutions and funds',
        monthlyPrice: 500,
        yearlyPrice: 5000,
        currency: 'TON',
        features: [
          'Everything in Pro',
          'Custom Integrations',
          'Dedicated Account Manager',
          'SLA Guarantee',
          'Institutional Compliance',
          'Multi-user Management',
          'White-label Options',
        ],
        limits: {
          agents: -1,
          strategies: -1,
          daily_trades: -1,
          ai_queries: -1,
        },
      },
    ];
  }

  private getDefaultPremiumFeatures(): PremiumFeature[] {
    return [
      {
        id: 'unlimited_agents',
        name: 'Unlimited AI Agents',
        description: 'Deploy unlimited AI agents',
        category: 'agents',
        requiredTier: 'pro',
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Deep portfolio analytics and insights',
        category: 'analytics',
        requiredTier: 'basic',
      },
      {
        id: 'api_access',
        name: 'API Access',
        description: 'Programmatic access to your portfolio',
        category: 'agents',
        requiredTier: 'pro',
      },
      {
        id: 'priority_support',
        name: 'Priority Support',
        description: '24/7 priority customer support',
        category: 'support',
        requiredTier: 'pro',
      },
      {
        id: 'strategy_builder',
        name: 'Strategy Builder',
        description: 'Create custom trading strategies',
        category: 'agents',
        requiredTier: 'basic',
      },
      {
        id: 'extra_ai_queries',
        name: 'AI Query Pack',
        description: '100 additional AI assistant queries',
        category: 'agents',
        requiredTier: 'free',
        price: { amount: 5, currency: 'TON', type: 'one_time' },
      },
      {
        id: 'social_features',
        name: 'Social Features',
        description: 'Access to social trading features',
        category: 'social',
        requiredTier: 'basic',
      },
    ];
  }

  private getTierRank(tier: SubscriptionTier): number {
    const ranks: Record<SubscriptionTier, number> = {
      free: 0,
      basic: 1,
      pro: 2,
      enterprise: 3,
    };
    return ranks[tier];
  }

  private getFeaturesForTier(_tier: SubscriptionTier, config: TierConfig): SubscriptionFeature[] {
    const features: SubscriptionFeature[] = [];

    for (const featureName of config.features) {
      features.push({
        id: featureName.toLowerCase().replace(/\s+/g, '_'),
        name: featureName,
        description: featureName,
        enabled: true,
      });
    }

    // Add limits as features
    for (const [key, limit] of Object.entries(config.limits)) {
      features.push({
        id: `limit_${key}`,
        name: key.replace(/_/g, ' '),
        description: `${key} limit`,
        enabled: true,
        limit: limit === -1 ? undefined : limit,
        used: 0,
      });
    }

    return features;
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createSuperAppMonetizationManager(
  config?: Partial<SuperAppMonetizationConfig>
): DefaultSuperAppMonetizationManager {
  return new DefaultSuperAppMonetizationManager(config);
}

export default DefaultSuperAppMonetizationManager;
