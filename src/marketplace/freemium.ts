/**
 * TONAIAgent - Freemium Monetization Module
 *
 * Implements the freemium tier system for the Agent Marketplace Economy.
 * Handles trial periods, feature gating, tier upgrades, and plan management.
 *
 * Tier Hierarchy:
 *   Free → Starter → Professional → Enterprise
 *
 * Features:
 * - Multi-tier access control (free, starter, professional, enterprise)
 * - Trial period management with grace periods
 * - Feature gating per tier
 * - Automatic tier upgrade recommendations
 * - Usage tracking against tier limits
 * - Creator plan management
 * - Subscriber lifecycle management
 */

import {
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Freemium Types
// ============================================================================

export type FreemiumTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type FeatureKey =
  | 'strategy_publish'
  | 'strategy_analytics'
  | 'copy_trading'
  | 'advanced_risk'
  | 'api_access'
  | 'custom_parameters'
  | 'priority_support'
  | 'white_label'
  | 'performance_fee_revenue'
  | 'sandbox_testing'
  | 'audit_certification'
  | 'unlimited_followers'
  | 'dao_governance';

export interface FreemiumPlan {
  id: string;
  tier: FreemiumTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: FeatureKey[];
  limits: FreemiumLimits;
  trialDays: number;
  active: boolean;
}

export interface FreemiumLimits {
  maxStrategies: number; // -1 = unlimited
  maxActiveAgents: number;
  maxFollowers: number;
  maxCapitalManaged: number; // in TON, -1 = unlimited
  maxApiCallsPerDay: number;
  maxSandboxSessions: number;
  performanceFeeCapPercent: number; // max performance fee they can charge
  analyticsRetentionDays: number;
}

export interface FreemiumSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: FreemiumTier;
  status: SubscriptionStatus;
  trialStartDate?: Date;
  trialEndDate?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: SubscriptionUsage;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'paused';

export interface SubscriptionUsage {
  strategiesPublished: number;
  activeAgents: number;
  currentFollowers: number;
  capitalManaged: number;
  apiCallsToday: number;
  sandboxSessionsThisMonth: number;
  lastUpdated: Date;
}

export interface FeatureAccess {
  feature: FeatureKey;
  allowed: boolean;
  reason?: string;
  upgradeRequired?: FreemiumTier;
  currentTier: FreemiumTier;
}

export interface TierUpgradeRecommendation {
  currentTier: FreemiumTier;
  recommendedTier: FreemiumTier;
  reasons: string[];
  estimatedMonthlyCost: number;
  estimatedMonthlyRevenue: number;
  roi: number;
  urgency: 'low' | 'medium' | 'high';
}

export interface UsageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt?: Date;
  upgradeRequired?: FreemiumTier;
}

// ============================================================================
// Freemium Manager Interface
// ============================================================================

export interface FreemiumManager {
  // Plan management
  getPlans(): Promise<FreemiumPlan[]>;
  getPlan(planId: string): Promise<FreemiumPlan | null>;
  getPlanByTier(tier: FreemiumTier): Promise<FreemiumPlan | null>;

  // Subscription management
  createSubscription(
    userId: string,
    tier: FreemiumTier,
    startTrial?: boolean
  ): Promise<FreemiumSubscription>;
  getSubscription(subscriptionId: string): Promise<FreemiumSubscription | null>;
  getUserSubscription(userId: string): Promise<FreemiumSubscription | null>;
  upgradeSubscription(userId: string, newTier: FreemiumTier): Promise<FreemiumSubscription>;
  downgradeSubscription(userId: string, newTier: FreemiumTier): Promise<FreemiumSubscription>;
  cancelSubscription(userId: string, atPeriodEnd?: boolean): Promise<FreemiumSubscription>;
  reactivateSubscription(userId: string): Promise<FreemiumSubscription>;

  // Trial management
  startTrial(userId: string, tier: FreemiumTier): Promise<FreemiumSubscription>;
  isInTrial(userId: string): Promise<boolean>;
  getTrialDaysRemaining(userId: string): Promise<number>;
  convertTrialToSubscription(userId: string): Promise<FreemiumSubscription>;

  // Feature access
  checkFeatureAccess(userId: string, feature: FeatureKey): Promise<FeatureAccess>;
  checkUsageLimit(
    userId: string,
    limitType: keyof FreemiumLimits
  ): Promise<UsageLimitCheck>;
  incrementUsage(
    userId: string,
    metric: keyof SubscriptionUsage,
    amount?: number
  ): Promise<SubscriptionUsage>;

  // Recommendations
  getUpgradeRecommendation(userId: string): Promise<TierUpgradeRecommendation | null>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Freemium Manager Config
// ============================================================================

export interface FreemiumManagerConfig {
  defaultTrialDays: number;
  gracePeriodDays: number;
  plans: FreemiumPlan[];
}

// ============================================================================
// Default Plans Configuration
// ============================================================================

const FREE_PLAN: FreemiumPlan = {
  id: 'plan_free',
  tier: 'free',
  name: 'Free',
  description: 'Get started with basic marketplace access',
  monthlyPrice: 0,
  annualPrice: 0,
  currency: 'TON',
  features: [
    'strategy_analytics',
    'copy_trading',
  ],
  limits: {
    maxStrategies: 1,
    maxActiveAgents: 1,
    maxFollowers: 50,
    maxCapitalManaged: 1000,
    maxApiCallsPerDay: 100,
    maxSandboxSessions: 1,
    performanceFeeCapPercent: 10,
    analyticsRetentionDays: 7,
  },
  trialDays: 0,
  active: true,
};

const STARTER_PLAN: FreemiumPlan = {
  id: 'plan_starter',
  tier: 'starter',
  name: 'Starter',
  description: 'For creators building their first strategies',
  monthlyPrice: 10,
  annualPrice: 96,
  currency: 'TON',
  features: [
    'strategy_publish',
    'strategy_analytics',
    'copy_trading',
    'custom_parameters',
    'sandbox_testing',
    'performance_fee_revenue',
  ],
  limits: {
    maxStrategies: 5,
    maxActiveAgents: 5,
    maxFollowers: 500,
    maxCapitalManaged: 50000,
    maxApiCallsPerDay: 1000,
    maxSandboxSessions: 10,
    performanceFeeCapPercent: 20,
    analyticsRetentionDays: 30,
  },
  trialDays: 14,
  active: true,
};

const PROFESSIONAL_PLAN: FreemiumPlan = {
  id: 'plan_professional',
  tier: 'professional',
  name: 'Professional',
  description: 'For serious creators with established strategies',
  monthlyPrice: 50,
  annualPrice: 480,
  currency: 'TON',
  features: [
    'strategy_publish',
    'strategy_analytics',
    'copy_trading',
    'advanced_risk',
    'api_access',
    'custom_parameters',
    'priority_support',
    'sandbox_testing',
    'audit_certification',
    'performance_fee_revenue',
  ],
  limits: {
    maxStrategies: 20,
    maxActiveAgents: 50,
    maxFollowers: 5000,
    maxCapitalManaged: 1000000,
    maxApiCallsPerDay: 10000,
    maxSandboxSessions: 100,
    performanceFeeCapPercent: 30,
    analyticsRetentionDays: 365,
  },
  trialDays: 14,
  active: true,
};

const ENTERPRISE_PLAN: FreemiumPlan = {
  id: 'plan_enterprise',
  tier: 'enterprise',
  name: 'Enterprise',
  description: 'Unlimited access for institutional creators',
  monthlyPrice: 200,
  annualPrice: 1920,
  currency: 'TON',
  features: [
    'strategy_publish',
    'strategy_analytics',
    'copy_trading',
    'advanced_risk',
    'api_access',
    'custom_parameters',
    'priority_support',
    'white_label',
    'sandbox_testing',
    'audit_certification',
    'performance_fee_revenue',
    'unlimited_followers',
    'dao_governance',
  ],
  limits: {
    maxStrategies: -1,
    maxActiveAgents: -1,
    maxFollowers: -1,
    maxCapitalManaged: -1,
    maxApiCallsPerDay: -1,
    maxSandboxSessions: -1,
    performanceFeeCapPercent: 40,
    analyticsRetentionDays: -1,
  },
  trialDays: 30,
  active: true,
};

const DEFAULT_PLANS: FreemiumPlan[] = [FREE_PLAN, STARTER_PLAN, PROFESSIONAL_PLAN, ENTERPRISE_PLAN];

const DEFAULT_CONFIG: FreemiumManagerConfig = {
  defaultTrialDays: 14,
  gracePeriodDays: 3,
  plans: DEFAULT_PLANS,
};

function generateId(): string {
  return `freemium_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function emitEvent(
  callbacks: MarketplaceEventCallback[],
  type: string,
  source: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const event: MarketplaceEvent = {
    id: generateId(),
    timestamp: new Date(),
    type: type as MarketplaceEvent['type'],
    severity: 'info',
    source,
    message,
    data,
  };
  for (const cb of callbacks) {
    try {
      cb(event);
    } catch {
      // Ignore callback errors
    }
  }
}

// ============================================================================
// Default Freemium Manager Implementation
// ============================================================================

export class DefaultFreemiumManager implements FreemiumManager {
  private readonly plans: Map<string, FreemiumPlan> = new Map();
  private readonly subscriptions: Map<string, FreemiumSubscription> = new Map();
  private readonly userSubscriptions: Map<string, string> = new Map(); // userId -> subscriptionId
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: FreemiumManagerConfig;

  constructor(config: Partial<FreemiumManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Load plans
    const plans = config.plans ?? DEFAULT_PLANS;
    for (const plan of plans) {
      this.plans.set(plan.id, plan);
    }
  }

  async getPlans(): Promise<FreemiumPlan[]> {
    return Array.from(this.plans.values()).filter(p => p.active);
  }

  async getPlan(planId: string): Promise<FreemiumPlan | null> {
    return this.plans.get(planId) ?? null;
  }

  async getPlanByTier(tier: FreemiumTier): Promise<FreemiumPlan | null> {
    return Array.from(this.plans.values()).find(p => p.tier === tier && p.active) ?? null;
  }

  async createSubscription(
    userId: string,
    tier: FreemiumTier,
    startTrial = false
  ): Promise<FreemiumSubscription> {
    // Check if user already has a subscription
    const existingSubId = this.userSubscriptions.get(userId);
    if (existingSubId) {
      throw new Error(`User ${userId} already has an active subscription`);
    }

    const plan = await this.getPlanByTier(tier);
    if (!plan) {
      throw new Error(`No active plan found for tier ${tier}`);
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const isTrialing = startTrial && plan.trialDays > 0;
    const trialEndDate = isTrialing ? new Date(now) : undefined;
    if (trialEndDate) {
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);
    }

    const subscription: FreemiumSubscription = {
      id: generateId(),
      userId,
      planId: plan.id,
      tier,
      status: isTrialing ? 'trialing' : 'active',
      trialStartDate: isTrialing ? now : undefined,
      trialEndDate,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      usage: {
        strategiesPublished: 0,
        activeAgents: 0,
        currentFollowers: 0,
        capitalManaged: 0,
        apiCallsToday: 0,
        sandboxSessionsThisMonth: 0,
        lastUpdated: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscription.id, subscription);
    this.userSubscriptions.set(userId, subscription.id);

    emitEvent(
      this.eventCallbacks,
      'agent_deployed',
      'freemium_manager',
      `Subscription created for user ${userId}: ${tier}${isTrialing ? ' (trial)' : ''}`,
      { subscriptionId: subscription.id, userId, tier, status: subscription.status }
    );

    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<FreemiumSubscription | null> {
    return this.subscriptions.get(subscriptionId) ?? null;
  }

  async getUserSubscription(userId: string): Promise<FreemiumSubscription | null> {
    const subId = this.userSubscriptions.get(userId);
    if (!subId) return null;
    return this.subscriptions.get(subId) ?? null;
  }

  async upgradeSubscription(userId: string, newTier: FreemiumTier): Promise<FreemiumSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    const tierOrder: FreemiumTier[] = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(subscription.tier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex <= currentIndex) {
      throw new Error(`Cannot upgrade from ${subscription.tier} to ${newTier} (use downgrade instead)`);
    }

    const newPlan = await this.getPlanByTier(newTier);
    if (!newPlan) {
      throw new Error(`No active plan found for tier ${newTier}`);
    }

    subscription.tier = newTier;
    subscription.planId = newPlan.id;
    subscription.status = 'active';
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    emitEvent(
      this.eventCallbacks,
      'agent_deployed',
      'freemium_manager',
      `Subscription upgraded for user ${userId}: ${subscription.tier} → ${newTier}`,
      { subscriptionId: subscription.id, userId, newTier }
    );

    return subscription;
  }

  async downgradeSubscription(userId: string, newTier: FreemiumTier): Promise<FreemiumSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    const tierOrder: FreemiumTier[] = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(subscription.tier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex >= currentIndex) {
      throw new Error(`Cannot downgrade from ${subscription.tier} to ${newTier} (use upgrade instead)`);
    }

    const newPlan = await this.getPlanByTier(newTier);
    if (!newPlan) {
      throw new Error(`No active plan found for tier ${newTier}`);
    }

    subscription.tier = newTier;
    subscription.planId = newPlan.id;
    subscription.cancelAtPeriodEnd = false;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    emitEvent(
      this.eventCallbacks,
      'agent_deployed',
      'freemium_manager',
      `Subscription downgraded for user ${userId}: → ${newTier}`,
      { subscriptionId: subscription.id, userId, newTier }
    );

    return subscription;
  }

  async cancelSubscription(userId: string, atPeriodEnd = true): Promise<FreemiumSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    if (atPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
    } else {
      subscription.status = 'cancelled';
      subscription.currentPeriodEnd = new Date();
    }

    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);

    emitEvent(
      this.eventCallbacks,
      'agent_stopped',
      'freemium_manager',
      `Subscription cancelled for user ${userId} (atPeriodEnd: ${atPeriodEnd})`,
      { subscriptionId: subscription.id, userId, atPeriodEnd }
    );

    return subscription;
  }

  async reactivateSubscription(userId: string): Promise<FreemiumSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    if (subscription.status !== 'cancelled' && !subscription.cancelAtPeriodEnd) {
      throw new Error(`Subscription is not cancelled`);
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.status = 'active';
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    emitEvent(
      this.eventCallbacks,
      'agent_deployed',
      'freemium_manager',
      `Subscription reactivated for user ${userId}`,
      { subscriptionId: subscription.id, userId }
    );

    return subscription;
  }

  async startTrial(userId: string, tier: FreemiumTier): Promise<FreemiumSubscription> {
    return this.createSubscription(userId, tier, true);
  }

  async isInTrial(userId: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (!sub) return false;
    return sub.status === 'trialing';
  }

  async getTrialDaysRemaining(userId: string): Promise<number> {
    const sub = await this.getUserSubscription(userId);
    if (!sub || sub.status !== 'trialing' || !sub.trialEndDate) return 0;

    const now = new Date();
    const diffMs = sub.trialEndDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  async convertTrialToSubscription(userId: string): Promise<FreemiumSubscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error(`No subscription found for user ${userId}`);
    }
    if (subscription.status !== 'trialing') {
      throw new Error(`User ${userId} is not in trial`);
    }

    subscription.status = 'active';
    subscription.trialEndDate = undefined;
    subscription.updatedAt = new Date();

    this.subscriptions.set(subscription.id, subscription);

    emitEvent(
      this.eventCallbacks,
      'agent_deployed',
      'freemium_manager',
      `Trial converted to active subscription for user ${userId}`,
      { subscriptionId: subscription.id, userId, tier: subscription.tier }
    );

    return subscription;
  }

  async checkFeatureAccess(userId: string, feature: FeatureKey): Promise<FeatureAccess> {
    const sub = await this.getUserSubscription(userId);
    const tier: FreemiumTier = sub?.tier ?? 'free';

    const plan = await this.getPlanByTier(tier);
    if (!plan) {
      return {
        feature,
        allowed: false,
        reason: 'No active plan',
        currentTier: tier,
      };
    }

    // Check if subscription is active
    if (sub && (sub.status === 'cancelled' || sub.status === 'expired')) {
      return {
        feature,
        allowed: false,
        reason: 'Subscription is not active',
        upgradeRequired: 'free',
        currentTier: tier,
      };
    }

    const allowed = plan.features.includes(feature);

    if (!allowed) {
      // Find minimum tier that has this feature
      const tierOrder: FreemiumTier[] = ['free', 'starter', 'professional', 'enterprise'];
      let upgradeRequired: FreemiumTier | undefined;

      for (const t of tierOrder) {
        const p = await this.getPlanByTier(t);
        if (p?.features.includes(feature)) {
          upgradeRequired = t;
          break;
        }
      }

      return {
        feature,
        allowed: false,
        reason: `Feature requires ${upgradeRequired ?? 'enterprise'} tier or higher`,
        upgradeRequired,
        currentTier: tier,
      };
    }

    return {
      feature,
      allowed: true,
      currentTier: tier,
    };
  }

  async checkUsageLimit(
    userId: string,
    limitType: keyof FreemiumLimits
  ): Promise<UsageLimitCheck> {
    const sub = await this.getUserSubscription(userId);
    const tier: FreemiumTier = sub?.tier ?? 'free';

    const plan = await this.getPlanByTier(tier);
    if (!plan) {
      return { allowed: false, current: 0, limit: 0, remaining: 0 };
    }

    const limit = plan.limits[limitType] as number;
    const usage = sub?.usage;

    // Map limit type to usage metric
    const usageMap: Partial<Record<keyof FreemiumLimits, number>> = {
      maxStrategies: usage?.strategiesPublished ?? 0,
      maxActiveAgents: usage?.activeAgents ?? 0,
      maxFollowers: usage?.currentFollowers ?? 0,
      maxCapitalManaged: usage?.capitalManaged ?? 0,
      maxApiCallsPerDay: usage?.apiCallsToday ?? 0,
      maxSandboxSessions: usage?.sandboxSessionsThisMonth ?? 0,
    };

    const current = usageMap[limitType] ?? 0;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current < limit;

    // Find upgrade tier if limit exceeded
    let upgradeRequired: FreemiumTier | undefined;
    if (!allowed) {
      const tierOrder: FreemiumTier[] = ['free', 'starter', 'professional', 'enterprise'];
      const currentTierIndex = tierOrder.indexOf(tier);
      for (let i = currentTierIndex + 1; i < tierOrder.length; i++) {
        const p = await this.getPlanByTier(tierOrder[i]);
        if (p && ((p.limits[limitType] as number) === -1 || (p.limits[limitType] as number) > current)) {
          upgradeRequired = tierOrder[i];
          break;
        }
      }
    }

    return { allowed, current, limit, remaining, upgradeRequired };
  }

  async incrementUsage(
    userId: string,
    metric: keyof SubscriptionUsage,
    amount = 1
  ): Promise<SubscriptionUsage> {
    const sub = await this.getUserSubscription(userId);
    if (!sub) {
      throw new Error(`No subscription found for user ${userId}`);
    }

    if (metric !== 'lastUpdated') {
      (sub.usage[metric] as number) += amount;
    }
    sub.usage.lastUpdated = new Date();
    sub.updatedAt = new Date();

    this.subscriptions.set(sub.id, sub);
    return sub.usage;
  }

  async getUpgradeRecommendation(userId: string): Promise<TierUpgradeRecommendation | null> {
    const sub = await this.getUserSubscription(userId);
    if (!sub) return null;

    const currentTier = sub.tier;
    const tierOrder: FreemiumTier[] = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex >= tierOrder.length - 1) return null;

    const reasons: string[] = [];

    // Check usage limits
    const plan = await this.getPlanByTier(currentTier);
    if (plan) {
      const usage = sub.usage;

      if (plan.limits.maxStrategies !== -1 &&
        usage.strategiesPublished >= plan.limits.maxStrategies * 0.8) {
        reasons.push(`Approaching strategy limit (${usage.strategiesPublished}/${plan.limits.maxStrategies})`);
      }

      if (plan.limits.maxFollowers !== -1 &&
        usage.currentFollowers >= plan.limits.maxFollowers * 0.8) {
        reasons.push(`Approaching follower limit (${usage.currentFollowers}/${plan.limits.maxFollowers})`);
      }

      if (plan.limits.maxCapitalManaged !== -1 &&
        usage.capitalManaged >= plan.limits.maxCapitalManaged * 0.8) {
        reasons.push(`Approaching capital management limit`);
      }
    }

    if (reasons.length === 0) return null;

    const nextTier = tierOrder[currentIndex + 1];
    const nextPlan = await this.getPlanByTier(nextTier);
    if (!nextPlan) return null;

    const monthlyCost = nextPlan.monthlyPrice;
    // Estimate revenue based on follower count and capital
    const estimatedRevenue = sub.usage.capitalManaged * 0.002; // 0.2% monthly estimate

    const urgency = reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low';

    return {
      currentTier,
      recommendedTier: nextTier,
      reasons,
      estimatedMonthlyCost: monthlyCost,
      estimatedMonthlyRevenue: estimatedRevenue,
      roi: monthlyCost > 0 ? estimatedRevenue / monthlyCost : 0,
      urgency,
    };
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFreemiumManager(
  config?: Partial<FreemiumManagerConfig>
): DefaultFreemiumManager {
  return new DefaultFreemiumManager(config);
}

export default DefaultFreemiumManager;
