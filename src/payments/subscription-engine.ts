/**
 * TONAIAgent - Subscription Engine
 *
 * Smart subscription management enabling recurring payments, dynamic billing,
 * trial periods, usage-based pricing, and AI-optimized subscription management.
 */

import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  BillingCycle,
  BillingDetails,
  SubscriptionPricing,
  TrialDetails,
  SubscriptionPreferences,
  SubscriptionAutomation,
  SubscriptionHistoryEntry,
  SubscriptionAction,
  Currency,
  PaymentMethod,
  SubscriptionsConfig,
  PaymentsEvent,
  PaymentsEventCallback,
} from './types';

// ============================================================================
// Subscription Engine Interface
// ============================================================================

export interface SubscriptionEngine {
  readonly config: SubscriptionsConfig;

  // Plan management
  createPlan(params: CreatePlanParams): Promise<SubscriptionPlan>;
  updatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  archivePlan(planId: string): Promise<SubscriptionPlan>;
  getPlan(planId: string): Promise<SubscriptionPlan | null>;
  listPlans(filters?: PlanFilters): Promise<SubscriptionPlan[]>;

  // Subscription lifecycle
  createSubscription(params: CreateSubscriptionParams): Promise<Subscription>;
  activateSubscription(subscriptionId: string): Promise<Subscription>;
  pauseSubscription(subscriptionId: string, reason?: string): Promise<Subscription>;
  resumeSubscription(subscriptionId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string, reason?: string, immediate?: boolean): Promise<Subscription>;
  renewSubscription(subscriptionId: string): Promise<RenewalResult>;

  // Subscription queries
  getSubscription(subscriptionId: string): Promise<Subscription | null>;
  listSubscriptions(filters: SubscriptionFilters): Promise<SubscriptionListResult>;
  getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistoryEntry[]>;

  // Plan changes
  upgradePlan(subscriptionId: string, newPlanId: string, prorate?: boolean): Promise<PlanChangeResult>;
  downgradePlan(subscriptionId: string, newPlanId: string, effectiveAt?: 'immediately' | 'period_end'): Promise<PlanChangeResult>;
  applyDiscount(subscriptionId: string, discount: DiscountApplication): Promise<Subscription>;

  // Usage tracking
  reportUsage(subscriptionId: string, usage: UsageReport): Promise<Subscription>;
  getUsage(subscriptionId: string, period?: 'current' | 'previous' | 'all'): Promise<UsageDetails>;
  calculateUsageCharges(subscriptionId: string): Promise<UsageCharges>;

  // Billing
  previewInvoice(subscriptionId: string): Promise<InvoicePreview>;
  generateInvoice(subscriptionId: string): Promise<Invoice>;
  processBilling(subscriptionId: string): Promise<BillingResult>;
  handleFailedPayment(subscriptionId: string, retryCount: number): Promise<PaymentRetryResult>;

  // Trial management
  startTrial(subscriptionId: string, days?: number): Promise<Subscription>;
  endTrial(subscriptionId: string, convert?: boolean): Promise<Subscription>;
  extendTrial(subscriptionId: string, additionalDays: number): Promise<Subscription>;

  // AI optimization
  getOptimizationRecommendations(subscriberId: string): Promise<SubscriptionOptimization[]>;
  applyOptimization(subscriptionId: string, optimizationId: string): Promise<Subscription>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface CreatePlanParams {
  merchantId: string;
  name: string;
  description: string;
  features: { name: string; description?: string; included: boolean; limit?: number | string }[];
  pricing: Partial<SubscriptionPricing>;
  limits?: Partial<SubscriptionPlan['limits']>;
  trial?: { enabled: boolean; duration: number; durationUnit: 'days' | 'weeks' | 'months'; requirePaymentMethod?: boolean };
  visibility?: 'public' | 'private' | 'invite_only';
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionParams {
  subscriberId: string;
  merchantId: string;
  planId: string;
  paymentMethod: PaymentMethod;
  currency?: Currency;
  trial?: boolean;
  couponCode?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanFilters {
  merchantId?: string;
  status?: 'draft' | 'active' | 'archived';
  visibility?: 'public' | 'private' | 'invite_only';
  minPrice?: string;
  maxPrice?: string;
}

export interface SubscriptionFilters {
  subscriberId?: string;
  merchantId?: string;
  planId?: string;
  status?: SubscriptionStatus | SubscriptionStatus[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface DiscountApplication {
  type: 'percentage' | 'fixed' | 'trial';
  value: string;
  reason: string;
  validUntil?: Date;
  code?: string;
}

export interface UsageReport {
  metric: string;
  value: number;
  timestamp?: Date;
  idempotencyKey?: string;
}

// ============================================================================
// Result Types
// ============================================================================

export interface SubscriptionListResult {
  subscriptions: Subscription[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface RenewalResult {
  subscription: Subscription;
  invoiceId: string;
  paymentId?: string;
  status: 'success' | 'failed' | 'pending';
  nextRenewalDate: Date;
  error?: string;
}

export interface PlanChangeResult {
  subscription: Subscription;
  previousPlanId: string;
  newPlanId: string;
  effectiveAt: Date;
  proratedAmount?: string;
  creditApplied?: string;
  chargeAmount?: string;
}

export interface UsageDetails {
  subscriptionId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    name: string;
    used: number;
    included: number;
    overage: number;
    cost: string;
  }[];
  totalCost: string;
}

export interface UsageCharges {
  subscriptionId: string;
  period: {
    start: Date;
    end: Date;
  };
  charges: {
    metric: string;
    units: number;
    rate: string;
    amount: string;
  }[];
  total: string;
}

export interface InvoicePreview {
  subscriptionId: string;
  items: InvoiceItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: Currency;
  dueDate: Date;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  merchantId: string;
  subscriberId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  items: InvoiceItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: Currency;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  type: 'subscription' | 'usage' | 'proration' | 'discount' | 'tax';
}

export interface BillingResult {
  subscriptionId: string;
  invoiceId: string;
  paymentId?: string;
  status: 'success' | 'failed' | 'pending';
  amount: string;
  currency: Currency;
  error?: string;
  nextBillingDate?: Date;
}

export interface PaymentRetryResult {
  subscriptionId: string;
  retryCount: number;
  success: boolean;
  paymentId?: string;
  nextRetryAt?: Date;
  suspendedAt?: Date;
  error?: string;
}

export interface SubscriptionOptimization {
  id: string;
  type: 'downgrade' | 'upgrade' | 'bundle' | 'timing' | 'usage';
  title: string;
  description: string;
  potentialSavings: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  expiresAt?: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSubscriptionEngine implements SubscriptionEngine {
  readonly config: SubscriptionsConfig;

  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private billingTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCallbacks: PaymentsEventCallback[] = [];

  constructor(config?: Partial<SubscriptionsConfig>) {
    this.config = {
      enabled: true,
      trialEnabled: true,
      maxTrialDays: 30,
      gracePeriodDays: 3,
      maxRetries: 4,
      retryInterval: 24 * 60 * 60 * 1000, // 24 hours
      dunningEnabled: true,
      ...config,
    };
  }

  // ============================================================================
  // Plan Management
  // ============================================================================

  async createPlan(params: CreatePlanParams): Promise<SubscriptionPlan> {
    const planId = this.generateId('plan');
    const now = new Date();

    const pricing: SubscriptionPricing = {
      type: 'fixed',
      baseAmount: '0',
      currency: 'TON',
      ...params.pricing,
    };

    const plan: SubscriptionPlan = {
      id: planId,
      merchantId: params.merchantId,
      name: params.name,
      description: params.description,
      features: params.features.map(f => ({
        name: f.name,
        description: f.description,
        included: f.included,
        limit: f.limit,
      })),
      pricing,
      limits: {
        maxSubscribers: params.limits?.maxSubscribers,
        minSubscriptionDuration: params.limits?.minSubscriptionDuration,
        maxPauseDuration: params.limits?.maxPauseDuration,
        cancellationNoticeDays: params.limits?.cancellationNoticeDays,
      },
      trial: params.trial
        ? {
            enabled: params.trial.enabled,
            duration: params.trial.duration,
            durationUnit: params.trial.durationUnit,
            requirePaymentMethod: params.trial.requirePaymentMethod ?? true,
          }
        : undefined,
      status: 'active',
      visibility: params.visibility || 'public',
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(planId, plan);
    return plan;
  }

  async updatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = await this.getPlanOrThrow(planId);

    // Don't allow changing certain fields
    const { id, merchantId, createdAt, ...allowedUpdates } = updates;

    Object.assign(plan, allowedUpdates);
    plan.updatedAt = new Date();

    return plan;
  }

  async archivePlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.getPlanOrThrow(planId);
    plan.status = 'archived';
    plan.updatedAt = new Date();
    return plan;
  }

  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    return this.plans.get(planId) || null;
  }

  async listPlans(filters?: PlanFilters): Promise<SubscriptionPlan[]> {
    let plans = Array.from(this.plans.values());

    if (filters) {
      if (filters.merchantId) {
        plans = plans.filter(p => p.merchantId === filters.merchantId);
      }
      if (filters.status) {
        plans = plans.filter(p => p.status === filters.status);
      }
      if (filters.visibility) {
        plans = plans.filter(p => p.visibility === filters.visibility);
      }
      if (filters.minPrice) {
        plans = plans.filter(p => BigInt(p.pricing.baseAmount) >= BigInt(filters.minPrice!));
      }
      if (filters.maxPrice) {
        plans = plans.filter(p => BigInt(p.pricing.baseAmount) <= BigInt(filters.maxPrice!));
      }
    }

    return plans;
  }

  // ============================================================================
  // Subscription Lifecycle
  // ============================================================================

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const plan = await this.getPlanOrThrow(params.planId);

    const subscriptionId = this.generateId('sub');
    const now = new Date();

    // Calculate billing dates
    const currentPeriodStart = now;
    const currentPeriodEnd = this.calculatePeriodEnd(now, this.getBillingCycle(plan));

    // Check for trial
    const startWithTrial = params.trial && this.config.trialEnabled && plan.trial?.enabled;

    const trial: TrialDetails | undefined = startWithTrial
      ? {
          enabled: true,
          duration: plan.trial!.duration,
          durationUnit: plan.trial!.durationUnit,
          startDate: now,
          endDate: this.calculateTrialEnd(now, plan.trial!.duration, plan.trial!.durationUnit),
          converted: false,
        }
      : undefined;

    // Apply discount if coupon code provided
    const discounts = params.couponCode
      ? [this.validateCoupon(params.couponCode, plan)]
      : [];

    const billing: BillingDetails = {
      cycle: this.getBillingCycle(plan),
      anchor: now,
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate: startWithTrial ? trial!.endDate : currentPeriodEnd,
      billingAttempts: 0,
      maxRetries: this.config.maxRetries,
    };

    const pricing: SubscriptionPricing = {
      ...plan.pricing,
      discounts,
    };

    const subscription: Subscription = {
      id: subscriptionId,
      subscriberId: params.subscriberId,
      merchantId: params.merchantId,
      planId: params.planId,
      status: startWithTrial ? 'active' : 'pending_activation',
      billing,
      pricing,
      trial,
      preferences: this.createDefaultPreferences(params.paymentMethod),
      automation: this.createDefaultAutomation(),
      history: [
        {
          id: this.generateId('hist'),
          timestamp: now,
          action: 'created',
          actor: params.subscriberId,
          actorType: 'user',
        },
      ],
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
      activatedAt: startWithTrial ? now : undefined,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.scheduleBilling(subscription);

    this.emitEvent('subscription.created', 'subscription', subscriptionId, 'created', subscription);

    return subscription;
  }

  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (subscription.status !== 'pending_activation') {
      throw new Error(`Cannot activate subscription with status: ${subscription.status}`);
    }

    subscription.status = 'active';
    subscription.activatedAt = new Date();
    subscription.updatedAt = new Date();

    this.addHistoryEntry(subscription, 'activated', 'system', 'system');
    this.emitEvent('subscription.activated', 'subscription', subscriptionId, 'activated', subscription);

    return subscription;
  }

  async pauseSubscription(subscriptionId: string, reason?: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (subscription.status !== 'active') {
      throw new Error(`Cannot pause subscription with status: ${subscription.status}`);
    }

    if (!subscription.preferences.allowPause) {
      throw new Error('This subscription does not allow pausing');
    }

    subscription.status = 'paused';
    subscription.updatedAt = new Date();

    this.addHistoryEntry(subscription, 'paused', subscription.subscriberId, 'user', { reason });
    this.cancelBillingTimer(subscriptionId);
    this.emitEvent('subscription.paused', 'subscription', subscriptionId, 'paused', subscription);

    return subscription;
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (subscription.status !== 'paused') {
      throw new Error(`Cannot resume subscription with status: ${subscription.status}`);
    }

    subscription.status = 'active';
    subscription.updatedAt = new Date();

    // Recalculate billing dates
    const now = new Date();
    subscription.billing.currentPeriodStart = now;
    subscription.billing.currentPeriodEnd = this.calculatePeriodEnd(now, subscription.billing.cycle);
    subscription.billing.nextBillingDate = subscription.billing.currentPeriodEnd;

    this.addHistoryEntry(subscription, 'resumed', subscription.subscriberId, 'user');
    this.scheduleBilling(subscription);

    return subscription;
  }

  async cancelSubscription(subscriptionId: string, reason?: string, immediate?: boolean): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (['cancelled', 'expired'].includes(subscription.status)) {
      throw new Error(`Subscription already ${subscription.status}`);
    }

    if (immediate) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
    } else {
      // Cancel at end of billing period
      subscription.expiresAt = subscription.billing.currentPeriodEnd;
    }

    subscription.updatedAt = new Date();

    this.addHistoryEntry(subscription, 'cancelled', subscription.subscriberId, 'user', {
      reason,
      immediate,
    });

    if (immediate) {
      this.cancelBillingTimer(subscriptionId);
    }

    this.emitEvent('subscription.cancelled', 'subscription', subscriptionId, 'cancelled', subscription);

    return subscription;
  }

  async renewSubscription(subscriptionId: string): Promise<RenewalResult> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (subscription.status !== 'active') {
      throw new Error(`Cannot renew subscription with status: ${subscription.status}`);
    }

    // Check if subscription should expire
    if (subscription.expiresAt && subscription.expiresAt <= new Date()) {
      subscription.status = 'expired';
      subscription.updatedAt = new Date();
      return {
        subscription,
        invoiceId: '',
        status: 'failed',
        nextRenewalDate: new Date(),
        error: 'Subscription expired',
      };
    }

    // Generate invoice and process payment
    const invoice = await this.generateInvoice(subscriptionId);
    const billingResult = await this.processBilling(subscriptionId);

    if (billingResult.status === 'success') {
      // Update billing dates
      subscription.billing.currentPeriodStart = subscription.billing.currentPeriodEnd;
      subscription.billing.currentPeriodEnd = this.calculatePeriodEnd(
        subscription.billing.currentPeriodStart,
        subscription.billing.cycle
      );
      subscription.billing.nextBillingDate = subscription.billing.currentPeriodEnd;
      subscription.billing.lastPaymentId = billingResult.paymentId;
      subscription.billing.lastPaymentAt = new Date();
      subscription.billing.lastPaymentStatus = 'completed';
      subscription.billing.billingAttempts = 0;
      subscription.updatedAt = new Date();

      this.addHistoryEntry(subscription, 'renewed', 'system', 'system', {
        invoiceId: invoice.id,
        paymentId: billingResult.paymentId,
      });

      this.emitEvent('subscription.renewed', 'subscription', subscriptionId, 'renewed', subscription);
    }

    return {
      subscription,
      invoiceId: invoice.id,
      paymentId: billingResult.paymentId,
      status: billingResult.status,
      nextRenewalDate: subscription.billing.nextBillingDate,
      error: billingResult.error,
    };
  }

  // ============================================================================
  // Subscription Queries
  // ============================================================================

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async listSubscriptions(filters: SubscriptionFilters): Promise<SubscriptionListResult> {
    let subscriptions = Array.from(this.subscriptions.values());

    if (filters.subscriberId) {
      subscriptions = subscriptions.filter(s => s.subscriberId === filters.subscriberId);
    }
    if (filters.merchantId) {
      subscriptions = subscriptions.filter(s => s.merchantId === filters.merchantId);
    }
    if (filters.planId) {
      subscriptions = subscriptions.filter(s => s.planId === filters.planId);
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      subscriptions = subscriptions.filter(s => statuses.includes(s.status));
    }
    if (filters.fromDate) {
      subscriptions = subscriptions.filter(s => s.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      subscriptions = subscriptions.filter(s => s.createdAt <= filters.toDate!);
    }

    const total = subscriptions.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const paginatedSubscriptions = subscriptions.slice(offset, offset + limit);

    return {
      subscriptions: paginatedSubscriptions,
      total,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : undefined,
    };
  }

  async getSubscriptionHistory(subscriptionId: string): Promise<SubscriptionHistoryEntry[]> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    return subscription.history;
  }

  // ============================================================================
  // Plan Changes
  // ============================================================================

  async upgradePlan(subscriptionId: string, newPlanId: string, prorate: boolean = true): Promise<PlanChangeResult> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    const currentPlan = await this.getPlanOrThrow(subscription.planId);
    const newPlan = await this.getPlanOrThrow(newPlanId);

    // Verify it's actually an upgrade
    if (BigInt(newPlan.pricing.baseAmount) <= BigInt(currentPlan.pricing.baseAmount)) {
      throw new Error('New plan must have higher price for upgrade');
    }

    const previousPlanId = subscription.planId;
    const now = new Date();

    // Calculate proration if needed
    let proratedAmount: string | undefined;
    let chargeAmount: string | undefined;

    if (prorate) {
      const daysRemaining = this.calculateDaysRemaining(subscription);
      const totalDays = this.calculateTotalDays(subscription.billing.cycle);
      const proratedOld = (BigInt(currentPlan.pricing.baseAmount) * BigInt(daysRemaining)) / BigInt(totalDays);
      const proratedNew = (BigInt(newPlan.pricing.baseAmount) * BigInt(daysRemaining)) / BigInt(totalDays);
      proratedAmount = (proratedNew - proratedOld).toString();
      chargeAmount = proratedAmount;
    }

    // Update subscription
    subscription.planId = newPlanId;
    subscription.pricing = { ...newPlan.pricing };
    subscription.updatedAt = now;

    this.addHistoryEntry(subscription, 'upgraded', subscription.subscriberId, 'user', {
      previousPlanId,
      newPlanId,
      prorate,
      chargeAmount,
    });

    return {
      subscription,
      previousPlanId,
      newPlanId,
      effectiveAt: now,
      proratedAmount,
      chargeAmount,
    };
  }

  async downgradePlan(subscriptionId: string, newPlanId: string, effectiveAt: 'immediately' | 'period_end' = 'period_end'): Promise<PlanChangeResult> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    const currentPlan = await this.getPlanOrThrow(subscription.planId);
    const newPlan = await this.getPlanOrThrow(newPlanId);

    // Verify it's actually a downgrade
    if (BigInt(newPlan.pricing.baseAmount) >= BigInt(currentPlan.pricing.baseAmount)) {
      throw new Error('New plan must have lower price for downgrade');
    }

    const previousPlanId = subscription.planId;
    const effectiveDate = effectiveAt === 'immediately'
      ? new Date()
      : subscription.billing.currentPeriodEnd;

    // Calculate credit if downgrading immediately
    let creditApplied: string | undefined;
    if (effectiveAt === 'immediately') {
      const daysRemaining = this.calculateDaysRemaining(subscription);
      const totalDays = this.calculateTotalDays(subscription.billing.cycle);
      creditApplied = ((BigInt(currentPlan.pricing.baseAmount) - BigInt(newPlan.pricing.baseAmount)) * BigInt(daysRemaining) / BigInt(totalDays)).toString();

      subscription.planId = newPlanId;
      subscription.pricing = { ...newPlan.pricing };
    } else {
      // Schedule change for period end
      subscription.metadata = {
        ...subscription.metadata,
        pendingDowngrade: {
          newPlanId,
          effectiveAt: effectiveDate,
        },
      };
    }

    subscription.updatedAt = new Date();

    this.addHistoryEntry(subscription, 'downgraded', subscription.subscriberId, 'user', {
      previousPlanId,
      newPlanId,
      effectiveAt,
      creditApplied,
    });

    return {
      subscription,
      previousPlanId,
      newPlanId,
      effectiveAt: effectiveDate,
      creditApplied,
    };
  }

  async applyDiscount(subscriptionId: string, discount: DiscountApplication): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (!subscription.pricing.discounts) {
      subscription.pricing.discounts = [];
    }

    subscription.pricing.discounts.push({
      type: discount.type,
      value: discount.value,
      reason: discount.reason,
      validUntil: discount.validUntil,
      code: discount.code,
    });

    // Recalculate effective amount
    subscription.pricing.effectiveAmount = this.calculateEffectiveAmount(subscription.pricing);
    subscription.updatedAt = new Date();

    return subscription;
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  async reportUsage(subscriptionId: string, usage: UsageReport): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (!subscription.usage) {
      subscription.usage = {
        metrics: [],
        currentPeriodUsage: {},
        billedUsage: {},
        lastReportedAt: new Date(),
      };
    }

    // Add or update metric
    const currentUsage = subscription.usage.currentPeriodUsage[usage.metric] || 0;
    subscription.usage.currentPeriodUsage[usage.metric] = currentUsage + usage.value;
    subscription.usage.lastReportedAt = new Date();
    subscription.updatedAt = new Date();

    // Check alerts
    this.checkUsageAlerts(subscription, usage.metric);

    return subscription;
  }

  async getUsage(subscriptionId: string, _period: 'current' | 'previous' | 'all' = 'current'): Promise<UsageDetails> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    const usage = subscription.usage?.currentPeriodUsage || {};
    const metrics = Object.entries(usage).map(([name, used]) => {
      const includedUnits = this.getIncludedUnits(subscription, name);
      const overage = Math.max(0, used - includedUnits);
      const rate = this.getUsageRate(subscription, name);
      const cost = (BigInt(overage) * BigInt(rate)).toString();

      return { name, used, included: includedUnits, overage, cost };
    });

    return {
      subscriptionId,
      period: {
        start: subscription.billing.currentPeriodStart,
        end: subscription.billing.currentPeriodEnd,
      },
      metrics,
      totalCost: metrics.reduce((sum, m) => (BigInt(sum) + BigInt(m.cost)).toString(), '0'),
    };
  }

  async calculateUsageCharges(subscriptionId: string): Promise<UsageCharges> {
    const usageDetails = await this.getUsage(subscriptionId);

    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    const charges = usageDetails.metrics
      .filter(m => m.overage > 0)
      .map(m => ({
        metric: m.name,
        units: m.overage,
        rate: this.getUsageRate(subscription, m.name),
        amount: m.cost,
      }));

    return {
      subscriptionId,
      period: usageDetails.period,
      charges,
      total: usageDetails.totalCost,
    };
  }

  // ============================================================================
  // Billing
  // ============================================================================

  async previewInvoice(subscriptionId: string): Promise<InvoicePreview> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    const plan = await this.getPlanOrThrow(subscription.planId);

    const items: InvoiceItem[] = [];

    // Base subscription
    items.push({
      description: `${plan.name} - ${this.formatBillingCycle(subscription.billing.cycle)}`,
      quantity: 1,
      unitPrice: plan.pricing.baseAmount,
      amount: plan.pricing.baseAmount,
      type: 'subscription',
    });

    // Usage charges
    const usageCharges = await this.calculateUsageCharges(subscriptionId);
    for (const charge of usageCharges.charges) {
      items.push({
        description: `Usage: ${charge.metric}`,
        quantity: charge.units,
        unitPrice: charge.rate,
        amount: charge.amount,
        type: 'usage',
      });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => (BigInt(sum) + BigInt(item.amount)).toString(), '0');

    // Apply discounts
    let discountAmount = '0';
    if (subscription.pricing.discounts) {
      for (const discount of subscription.pricing.discounts) {
        if (discount.validUntil && discount.validUntil < new Date()) continue;

        if (discount.type === 'percentage') {
          discountAmount = (BigInt(subtotal) * BigInt(discount.value) / BigInt(100)).toString();
        } else if (discount.type === 'fixed') {
          discountAmount = discount.value;
        }
      }
    }

    // Calculate tax
    const taxRate = subscription.pricing.taxes?.rate || 0;
    const taxableAmount = (BigInt(subtotal) - BigInt(discountAmount)).toString();
    const tax = (BigInt(taxableAmount) * BigInt(Math.floor(taxRate * 100)) / BigInt(10000)).toString();

    const total = (BigInt(taxableAmount) + BigInt(tax)).toString();

    return {
      subscriptionId,
      items,
      subtotal,
      discount: discountAmount,
      tax,
      total,
      currency: subscription.pricing.currency,
      dueDate: subscription.billing.nextBillingDate,
    };
  }

  async generateInvoice(subscriptionId: string): Promise<Invoice> {
    const preview = await this.previewInvoice(subscriptionId);
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    const invoiceId = this.generateId('inv');
    const now = new Date();

    const invoice: Invoice = {
      id: invoiceId,
      subscriptionId,
      merchantId: subscription.merchantId,
      subscriberId: subscription.subscriberId,
      status: 'open',
      items: preview.items,
      subtotal: preview.subtotal,
      discount: preview.discount,
      tax: preview.tax,
      total: preview.total,
      currency: preview.currency,
      dueDate: preview.dueDate,
      createdAt: now,
    };

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  async processBilling(subscriptionId: string): Promise<BillingResult> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    // Simulate payment processing
    const success = Math.random() > 0.1; // 90% success rate for simulation

    if (success) {
      subscription.billing.lastPaymentStatus = 'completed';
      subscription.billing.lastPaymentAt = new Date();
      subscription.billing.billingAttempts = 0;

      return {
        subscriptionId,
        invoiceId: this.generateId('inv'),
        paymentId: this.generateId('pay'),
        status: 'success',
        amount: subscription.pricing.effectiveAmount || subscription.pricing.baseAmount,
        currency: subscription.pricing.currency,
        nextBillingDate: subscription.billing.nextBillingDate,
      };
    } else {
      subscription.billing.lastPaymentStatus = 'failed';
      subscription.billing.billingAttempts++;

      this.emitEvent('subscription.payment_failed', 'subscription', subscriptionId, 'payment_failed', subscription);

      return {
        subscriptionId,
        invoiceId: this.generateId('inv'),
        status: 'failed',
        amount: subscription.pricing.effectiveAmount || subscription.pricing.baseAmount,
        currency: subscription.pricing.currency,
        error: 'Payment declined',
      };
    }
  }

  async handleFailedPayment(subscriptionId: string, retryCount: number): Promise<PaymentRetryResult> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (retryCount >= this.config.maxRetries) {
      // Suspend subscription
      subscription.status = 'suspended';
      subscription.updatedAt = new Date();

      this.addHistoryEntry(subscription, 'payment_failed', 'system', 'system', {
        retryCount,
        suspended: true,
      });

      return {
        subscriptionId,
        retryCount,
        success: false,
        suspendedAt: new Date(),
        error: 'Max retries exceeded',
      };
    }

    // Retry payment
    const billingResult = await this.processBilling(subscriptionId);

    if (billingResult.status === 'success') {
      return {
        subscriptionId,
        retryCount,
        success: true,
        paymentId: billingResult.paymentId,
      };
    }

    // Schedule next retry
    const nextRetryAt = new Date(Date.now() + this.config.retryInterval);

    return {
      subscriptionId,
      retryCount,
      success: false,
      nextRetryAt,
      error: billingResult.error,
    };
  }

  // ============================================================================
  // Trial Management
  // ============================================================================

  async startTrial(subscriptionId: string, days?: number): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (!this.config.trialEnabled) {
      throw new Error('Trials are not enabled');
    }

    const trialDays = Math.min(days || 14, this.config.maxTrialDays);
    const now = new Date();

    subscription.trial = {
      enabled: true,
      duration: trialDays,
      durationUnit: 'days',
      startDate: now,
      endDate: this.calculateTrialEnd(now, trialDays, 'days'),
      converted: false,
    };

    subscription.status = 'active';
    subscription.activatedAt = now;
    subscription.billing.nextBillingDate = subscription.trial.endDate;
    subscription.updatedAt = now;

    this.addHistoryEntry(subscription, 'activated', 'system', 'system', { trial: true, days: trialDays });

    return subscription;
  }

  async endTrial(subscriptionId: string, convert: boolean = true): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (!subscription.trial) {
      throw new Error('Subscription does not have a trial');
    }

    if (convert) {
      subscription.trial.converted = true;
      subscription.trial.conversionDate = new Date();

      // Process first payment
      await this.processBilling(subscriptionId);
    } else {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
    }

    subscription.updatedAt = new Date();

    return subscription;
  }

  async extendTrial(subscriptionId: string, additionalDays: number): Promise<Subscription> {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (!subscription.trial) {
      throw new Error('Subscription does not have a trial');
    }

    const newEndDate = new Date(subscription.trial.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    subscription.trial.endDate = newEndDate;
    subscription.trial.duration += additionalDays;
    subscription.billing.nextBillingDate = newEndDate;
    subscription.updatedAt = new Date();

    return subscription;
  }

  // ============================================================================
  // AI Optimization
  // ============================================================================

  async getOptimizationRecommendations(subscriberId: string): Promise<SubscriptionOptimization[]> {
    const subscriptions = await this.listSubscriptions({ subscriberId });
    const recommendations: SubscriptionOptimization[] = [];

    for (const sub of subscriptions.subscriptions) {
      // Check for underutilization
      if (sub.usage) {
        const utilizationRate = this.calculateUtilizationRate(sub);
        if (utilizationRate < 0.3) {
          const plan = await this.getPlan(sub.planId);
          if (plan) {
            recommendations.push({
              id: this.generateId('opt'),
              type: 'downgrade',
              title: `Consider downgrading ${plan.name}`,
              description: `You're only using ${Math.round(utilizationRate * 100)}% of your plan limits`,
              potentialSavings: (BigInt(plan.pricing.baseAmount) * BigInt(30) / BigInt(100)).toString(),
              recommendation: 'Downgrade to a smaller plan',
              impact: 'low',
              confidence: 0.85,
            });
          }
        }
      }

      // Check for annual billing opportunity
      if (sub.billing.cycle === 'monthly') {
        recommendations.push({
          id: this.generateId('opt'),
          type: 'timing',
          title: 'Switch to annual billing',
          description: 'Save up to 20% by switching to annual billing',
          potentialSavings: (BigInt(sub.pricing.baseAmount) * BigInt(12) * BigInt(20) / BigInt(100)).toString(),
          recommendation: 'Contact merchant about annual plans',
          impact: 'medium',
          confidence: 0.95,
        });
      }
    }

    return recommendations;
  }

  async applyOptimization(subscriptionId: string, _optimizationId: string): Promise<Subscription> {
    // In a real implementation, this would apply the specific optimization
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    subscription.updatedAt = new Date();
    return subscription;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PaymentsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async getPlanOrThrow(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }
    return plan;
  }

  private async getSubscriptionOrThrow(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }
    return subscription;
  }

  private getBillingCycle(_plan: SubscriptionPlan): BillingCycle {
    // Default to monthly
    return 'monthly';
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);

    switch (cycle) {
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'biweekly':
        end.setDate(end.getDate() + 14);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'annually':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return end;
  }

  private calculateTrialEnd(start: Date, duration: number, unit: 'days' | 'weeks' | 'months'): Date {
    const end = new Date(start);

    switch (unit) {
      case 'days':
        end.setDate(end.getDate() + duration);
        break;
      case 'weeks':
        end.setDate(end.getDate() + duration * 7);
        break;
      case 'months':
        end.setMonth(end.getMonth() + duration);
        break;
    }

    return end;
  }

  private calculateDaysRemaining(subscription: Subscription): number {
    const now = new Date();
    const end = subscription.billing.currentPeriodEnd;
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private calculateTotalDays(cycle: BillingCycle): number {
    switch (cycle) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'biweekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'annually': return 365;
      default: return 30;
    }
  }

  private validateCoupon(code: string, _plan: SubscriptionPlan): { type: 'percentage' | 'fixed'; value: string; reason: string; code: string } {
    // Simplified coupon validation
    return {
      type: 'percentage',
      value: '10',
      reason: 'Promotional discount',
      code,
    };
  }

  private createDefaultPreferences(paymentMethod: PaymentMethod): SubscriptionPreferences {
    return {
      autoRenew: true,
      reminderDays: 3,
      paymentMethod,
      fallbackMethods: [],
      notifyOnRenewal: true,
      notifyOnFailure: true,
      allowPause: true,
    };
  }

  private createDefaultAutomation(): SubscriptionAutomation {
    return {
      enabled: true,
      aiOptimization: true,
      autoUpgrade: false,
      autoDowngrade: false,
      usageAlerts: [],
      costOptimization: {
        enabled: true,
        recommendations: true,
        autoApplyOptimizations: false,
        thresholdPercent: 20,
      },
    };
  }

  private addHistoryEntry(
    subscription: Subscription,
    action: SubscriptionAction,
    actor: string,
    actorType: SubscriptionHistoryEntry['actorType'],
    details?: Record<string, unknown>
  ): void {
    subscription.history.push({
      id: this.generateId('hist'),
      timestamp: new Date(),
      action,
      actor,
      actorType,
      ...(details ? { previousState: details } : {}),
    });
  }

  private scheduleBilling(subscription: Subscription): void {
    const delay = subscription.billing.nextBillingDate.getTime() - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(async () => {
      await this.renewSubscription(subscription.id);
    }, Math.min(delay, 2147483647));

    this.billingTimers.set(subscription.id, timer);
  }

  private cancelBillingTimer(subscriptionId: string): void {
    const timer = this.billingTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.billingTimers.delete(subscriptionId);
    }
  }

  private getIncludedUnits(subscription: Subscription, metric: string): number {
    // Get included units from plan
    const rates = subscription.pricing.usageRates || [];
    const rate = rates.find(r => r.metric === metric);
    return rate?.includedUnits || 0;
  }

  private getUsageRate(subscription: Subscription, metric: string): string {
    const rates = subscription.pricing.usageRates || [];
    const rate = rates.find(r => r.metric === metric);
    return rate?.pricePerUnit || '0';
  }

  private checkUsageAlerts(subscription: Subscription, metric: string): void {
    const alerts = subscription.automation.usageAlerts || [];
    const usage = subscription.usage?.currentPeriodUsage[metric] || 0;

    for (const alert of alerts) {
      if (alert.metric !== metric) continue;

      let shouldTrigger = false;
      if (alert.operator === 'above' && usage > alert.threshold) {
        shouldTrigger = true;
      } else if (alert.operator === 'approaching' && usage > alert.threshold * 0.8) {
        shouldTrigger = true;
      }

      if (shouldTrigger && !alert.triggered) {
        alert.triggered = true;
        alert.lastTriggeredAt = new Date();
        // Would send notification here
      }
    }
  }

  private calculateUtilizationRate(subscription: Subscription): number {
    if (!subscription.usage) return 1;

    const usage = subscription.usage.currentPeriodUsage;
    let totalUsed = 0;
    let totalIncluded = 0;

    for (const metric of Object.keys(usage)) {
      totalUsed += usage[metric];
      totalIncluded += this.getIncludedUnits(subscription, metric);
    }

    if (totalIncluded === 0) return 1;
    return totalUsed / totalIncluded;
  }

  private calculateEffectiveAmount(pricing: SubscriptionPricing): string {
    let amount = BigInt(pricing.baseAmount);

    if (pricing.discounts) {
      for (const discount of pricing.discounts) {
        if (discount.validUntil && discount.validUntil < new Date()) continue;

        if (discount.type === 'percentage') {
          amount = amount - (amount * BigInt(discount.value) / BigInt(100));
        } else if (discount.type === 'fixed') {
          amount = amount - BigInt(discount.value);
        }
      }
    }

    return amount.toString();
  }

  private formatBillingCycle(cycle: BillingCycle): string {
    const formats: Record<BillingCycle, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annual',
    };
    return formats[cycle] || cycle;
  }

  private emitEvent(
    type: PaymentsEvent['type'],
    resourceType: PaymentsEvent['resourceType'],
    resourceId: string,
    action: string,
    data: unknown
  ): void {
    const event: PaymentsEvent = {
      id: this.generateId('evt'),
      timestamp: new Date(),
      type,
      resourceType,
      resourceId,
      action,
      actor: { type: 'system', id: 'subscription-engine' },
      data,
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSubscriptionEngine(config?: Partial<SubscriptionsConfig>): DefaultSubscriptionEngine {
  return new DefaultSubscriptionEngine(config);
}
