/**
 * TONAIAgent - Revenue Distribution Service
 *
 * Manages the distribution of revenue between parties:
 * - Tracks strategy monetization configurations
 * - Records revenue events
 * - Calculates and aggregates developer earnings
 * - Provides revenue metrics
 *
 * Revenue flow:
 * ```
 * User Agent Profit
 *       ↓
 * Performance Fee / Subscription
 *       ↓
 * Revenue Split
 *       ↓
 * Developer Wallet
 * Platform Treasury
 * Referrer (optional)
 * ```
 *
 * Implements Issue #219: Strategy Revenue Sharing System
 */

import {
  StrategyMonetization,
  RevenueSplitConfig,
  RevenueEvent,
  DeveloperEarnings,
  StrategyEarnings,
  StrategyRevenueMetrics,
  PlatformRevenueMetrics,
  FeeType,
  RevenueSystemEvent,
  RevenueEventCallback,
  RevenueEngineConfig,
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
  DEFAULT_REVENUE_CONFIG,
} from '../types';

import {
  FeeCalculator,
  DefaultFeeCalculator,
  createFeeCalculator,
  PerformanceFeeInput,
  SubscriptionFeeInput,
} from '../calculation';

// ============================================================================
// Revenue Distribution Service Interface
// ============================================================================

/**
 * Interface for the revenue distribution service.
 */
export interface RevenueDistributionService {
  // Monetization configuration
  configureStrategyMonetization(
    strategyId: string,
    developerId: string,
    feeType: FeeType,
    options: MonetizationOptions
  ): StrategyMonetization;
  getStrategyMonetization(strategyId: string): StrategyMonetization | null;
  updateMonetization(strategyId: string, updates: Partial<MonetizationOptions>): StrategyMonetization | null;
  disableMonetization(strategyId: string): boolean;

  // Revenue processing
  processPerformanceFee(
    strategyId: string,
    agentId: string,
    initialCapital: number,
    portfolioValue: number,
    highWaterMark?: number
  ): RevenueEvent | null;

  processSubscriptionFee(
    strategyId: string,
    agentId: string,
    billingPeriodDays?: number
  ): RevenueEvent | null;

  processHybridFee(
    strategyId: string,
    agentId: string,
    initialCapital: number,
    portfolioValue: number,
    billingPeriodDays?: number,
    highWaterMark?: number
  ): RevenueEvent[];

  // Developer earnings
  getDeveloperEarnings(developerId: string): DeveloperEarnings;
  getStrategyEarnings(strategyId: string): StrategyEarnings | null;
  getDeveloperStrategies(developerId: string): StrategyEarnings[];

  // Revenue metrics
  getStrategyRevenueMetrics(strategyId: string): StrategyRevenueMetrics | null;
  getPlatformMetrics(): PlatformRevenueMetrics;

  // Revenue events
  getRevenueEvents(strategyId: string, limit?: number): RevenueEvent[];
  getRecentEvents(limit?: number): RevenueEvent[];

  // Event subscription
  onEvent(callback: RevenueEventCallback): void;

  // Helpers
  setReferrer(strategyId: string, agentId: string, referrerId: string): void;
}

/**
 * Options for monetization configuration.
 */
export interface MonetizationOptions {
  /** Performance fee percentage (0-100) */
  feePercent?: number;
  /** Monthly subscription fee in USD */
  monthlyFee?: number;
  /** Custom revenue split */
  splitConfig?: Partial<RevenueSplitConfig>;
}

// ============================================================================
// Agent Context (tracks agent-specific data)
// ============================================================================

interface AgentContext {
  agentId: string;
  strategyId: string;
  highWaterMark: number;
  referrerId?: string;
  lastBillingDate?: Date;
}

// ============================================================================
// Default Revenue Distribution Service Implementation
// ============================================================================

/**
 * Default implementation of the revenue distribution service.
 */
export class DefaultRevenueDistributionService implements RevenueDistributionService {
  private readonly config: RevenueEngineConfig;
  private readonly feeCalculator: FeeCalculator;
  private readonly monetizations: Map<string, StrategyMonetization> = new Map();
  private readonly revenueEvents: RevenueEvent[] = [];
  private readonly agentContexts: Map<string, AgentContext> = new Map();
  private readonly eventCallbacks: RevenueEventCallback[] = [];

  constructor(config?: Partial<RevenueEngineConfig>) {
    this.config = {
      default_split: config?.default_split ?? DEFAULT_REVENUE_CONFIG.default_split,
      min_fee_amount: config?.min_fee_amount ?? DEFAULT_REVENUE_CONFIG.min_fee_amount,
      max_fee_percent: config?.max_fee_percent ?? DEFAULT_REVENUE_CONFIG.max_fee_percent,
      max_monthly_fee: config?.max_monthly_fee ?? DEFAULT_REVENUE_CONFIG.max_monthly_fee,
      metrics_update_interval_minutes: config?.metrics_update_interval_minutes ?? DEFAULT_REVENUE_CONFIG.metrics_update_interval_minutes,
      use_high_water_mark: config?.use_high_water_mark ?? DEFAULT_REVENUE_CONFIG.use_high_water_mark,
    };

    this.feeCalculator = createFeeCalculator(config);
  }

  // ============================================================================
  // Monetization Configuration
  // ============================================================================

  configureStrategyMonetization(
    strategyId: string,
    developerId: string,
    feeType: FeeType,
    options: MonetizationOptions
  ): StrategyMonetization {
    const now = new Date();

    // Validate inputs
    if (options.feePercent !== undefined) {
      if (!this.feeCalculator.validateFeePercent(options.feePercent)) {
        throw new Error(`Fee percent must be between 0 and ${this.config.max_fee_percent}`);
      }
    }

    if (options.monthlyFee !== undefined) {
      if (!this.feeCalculator.validateMonthlyFee(options.monthlyFee)) {
        throw new Error(`Monthly fee must be between 0 and ${this.config.max_monthly_fee}`);
      }
    }

    const monetization: StrategyMonetization = {
      strategy_id: strategyId,
      developer_id: developerId,
      fee_type: feeType,
      fee_percent: options.feePercent ?? 0,
      monthly_fee: options.monthlyFee ?? 0,
      enabled: true,
      created_at: now,
      updated_at: now,
    };

    this.monetizations.set(strategyId, monetization);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'monetization_configured',
      timestamp: now,
      strategy_id: strategyId,
      developer_id: developerId,
      data: {
        fee_type: feeType,
        fee_percent: monetization.fee_percent,
        monthly_fee: monetization.monthly_fee,
      },
    });

    return monetization;
  }

  getStrategyMonetization(strategyId: string): StrategyMonetization | null {
    return this.monetizations.get(strategyId) ?? null;
  }

  updateMonetization(strategyId: string, updates: Partial<MonetizationOptions>): StrategyMonetization | null {
    const existing = this.monetizations.get(strategyId);
    if (!existing) {
      return null;
    }

    // Validate updates
    if (updates.feePercent !== undefined) {
      if (!this.feeCalculator.validateFeePercent(updates.feePercent)) {
        throw new Error(`Fee percent must be between 0 and ${this.config.max_fee_percent}`);
      }
      existing.fee_percent = updates.feePercent;
    }

    if (updates.monthlyFee !== undefined) {
      if (!this.feeCalculator.validateMonthlyFee(updates.monthlyFee)) {
        throw new Error(`Monthly fee must be between 0 and ${this.config.max_monthly_fee}`);
      }
      existing.monthly_fee = updates.monthlyFee;
    }

    existing.updated_at = new Date();
    this.monetizations.set(strategyId, existing);

    return existing;
  }

  disableMonetization(strategyId: string): boolean {
    const existing = this.monetizations.get(strategyId);
    if (!existing) {
      return false;
    }

    existing.enabled = false;
    existing.updated_at = new Date();
    this.monetizations.set(strategyId, existing);

    return true;
  }

  // ============================================================================
  // Revenue Processing
  // ============================================================================

  processPerformanceFee(
    strategyId: string,
    agentId: string,
    initialCapital: number,
    portfolioValue: number,
    highWaterMark?: number
  ): RevenueEvent | null {
    const monetization = this.monetizations.get(strategyId);
    if (!monetization || !monetization.enabled) {
      return null;
    }

    if (monetization.fee_type !== 'performance' && monetization.fee_type !== 'hybrid') {
      return null;
    }

    const context = this.getOrCreateAgentContext(agentId, strategyId, initialCapital);
    const splitConfig = this.getSplitConfig(context.referrerId);

    const input: PerformanceFeeInput = {
      strategy_id: strategyId,
      agent_id: agentId,
      initial_capital: initialCapital,
      portfolio_value: portfolioValue,
      high_water_mark: highWaterMark ?? context.highWaterMark,
      fee_percent: monetization.fee_percent,
      split_config: splitConfig,
      referrer_id: context.referrerId,
    };

    const result = this.feeCalculator.calculatePerformanceFee(input);

    // Update context with new high water mark
    context.highWaterMark = result.new_high_water_mark;
    this.agentContexts.set(this.getContextKey(agentId, strategyId), context);

    // Skip if no fee generated
    if (result.fee_amount === 0) {
      return null;
    }

    // Record the event
    const event = this.recordRevenueEvent(
      strategyId,
      agentId,
      monetization.developer_id,
      'performance',
      result.profit,
      result.fee_amount,
      result.developer_earnings,
      result.platform_earnings,
      result.referrer_earnings,
      context.referrerId
    );

    return event;
  }

  processSubscriptionFee(
    strategyId: string,
    agentId: string,
    billingPeriodDays: number = 30
  ): RevenueEvent | null {
    const monetization = this.monetizations.get(strategyId);
    if (!monetization || !monetization.enabled) {
      return null;
    }

    if (monetization.fee_type !== 'subscription' && monetization.fee_type !== 'hybrid') {
      return null;
    }

    const context = this.getOrCreateAgentContext(agentId, strategyId, 0);
    const splitConfig = this.getSplitConfig(context.referrerId);

    const input: SubscriptionFeeInput = {
      strategy_id: strategyId,
      agent_id: agentId,
      monthly_fee: monetization.monthly_fee,
      billing_period_days: billingPeriodDays,
      split_config: splitConfig,
      referrer_id: context.referrerId,
    };

    const result = this.feeCalculator.calculateSubscriptionFee(input);

    // Update context with billing date
    context.lastBillingDate = new Date();
    this.agentContexts.set(this.getContextKey(agentId, strategyId), context);

    // Skip if no fee generated
    if (result.fee_amount === 0) {
      return null;
    }

    // Record the event
    const event = this.recordRevenueEvent(
      strategyId,
      agentId,
      monetization.developer_id,
      'subscription',
      undefined,
      result.fee_amount,
      result.developer_earnings,
      result.platform_earnings,
      result.referrer_earnings,
      context.referrerId
    );

    this.emitEvent({
      id: this.generateId('event'),
      type: 'subscription_billed',
      timestamp: new Date(),
      strategy_id: strategyId,
      agent_id: agentId,
      data: {
        fee_amount: result.fee_amount,
        next_billing_date: result.next_billing_date.toISOString(),
      },
    });

    return event;
  }

  processHybridFee(
    strategyId: string,
    agentId: string,
    initialCapital: number,
    portfolioValue: number,
    billingPeriodDays: number = 30,
    highWaterMark?: number
  ): RevenueEvent[] {
    const events: RevenueEvent[] = [];

    const performanceEvent = this.processPerformanceFee(
      strategyId,
      agentId,
      initialCapital,
      portfolioValue,
      highWaterMark
    );

    if (performanceEvent) {
      events.push(performanceEvent);
    }

    const subscriptionEvent = this.processSubscriptionFee(
      strategyId,
      agentId,
      billingPeriodDays
    );

    if (subscriptionEvent) {
      events.push(subscriptionEvent);
    }

    return events;
  }

  // ============================================================================
  // Developer Earnings
  // ============================================================================

  getDeveloperEarnings(developerId: string): DeveloperEarnings {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all events for this developer
    const developerEvents = this.revenueEvents.filter(
      e => e.developer_id === developerId
    );

    // Calculate totals
    const totalEarnings = developerEvents.reduce(
      (sum, e) => sum + e.developer_earnings,
      0
    );

    const monthlyEarnings = developerEvents
      .filter(e => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.developer_earnings, 0);

    const dailyEarnings = developerEvents
      .filter(e => e.timestamp >= startOfDay)
      .reduce((sum, e) => sum + e.developer_earnings, 0);

    // Count unique strategies with earnings
    const strategiesWithEarnings = new Set(developerEvents.map(e => e.strategy_id)).size;

    // Count total agents using developer's strategies
    const developerStrategies = Array.from(this.monetizations.values())
      .filter(m => m.developer_id === developerId)
      .map(m => m.strategy_id);

    const totalAgentsUsing = new Set(
      this.revenueEvents
        .filter(e => developerStrategies.includes(e.strategy_id))
        .map(e => e.agent_id)
    ).size;

    return {
      developer_id: developerId,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      monthly_earnings: Math.round(monthlyEarnings * 100) / 100,
      daily_earnings: Math.round(dailyEarnings * 100) / 100,
      strategies_with_earnings: strategiesWithEarnings,
      total_agents_using: totalAgentsUsing,
      updated_at: now,
    };
  }

  getStrategyEarnings(strategyId: string): StrategyEarnings | null {
    const monetization = this.monetizations.get(strategyId);
    if (!monetization) {
      return null;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all events for this strategy
    const strategyEvents = this.revenueEvents.filter(
      e => e.strategy_id === strategyId
    );

    // Calculate totals
    const totalEarnings = strategyEvents.reduce(
      (sum, e) => sum + e.developer_earnings,
      0
    );

    const monthlyEarnings = strategyEvents
      .filter(e => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.developer_earnings, 0);

    const dailyEarnings = strategyEvents
      .filter(e => e.timestamp >= startOfDay)
      .reduce((sum, e) => sum + e.developer_earnings, 0);

    // Count unique agents
    const agentsUsing = new Set(strategyEvents.map(e => e.agent_id)).size;

    // Get last earning timestamp
    const lastEvent = strategyEvents.length > 0
      ? strategyEvents[strategyEvents.length - 1]
      : null;

    return {
      strategy_id: strategyId,
      developer_id: monetization.developer_id,
      total_earnings: Math.round(totalEarnings * 100) / 100,
      monthly_earnings: Math.round(monthlyEarnings * 100) / 100,
      daily_earnings: Math.round(dailyEarnings * 100) / 100,
      agents_using: agentsUsing,
      fee_type: monetization.fee_type,
      last_earning_at: lastEvent?.timestamp,
    };
  }

  getDeveloperStrategies(developerId: string): StrategyEarnings[] {
    const developerStrategies = Array.from(this.monetizations.values())
      .filter(m => m.developer_id === developerId);

    return developerStrategies
      .map(m => this.getStrategyEarnings(m.strategy_id))
      .filter((e): e is StrategyEarnings => e !== null);
  }

  // ============================================================================
  // Revenue Metrics
  // ============================================================================

  getStrategyRevenueMetrics(strategyId: string): StrategyRevenueMetrics | null {
    const monetization = this.monetizations.get(strategyId);
    if (!monetization) {
      return null;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get all events for this strategy
    const strategyEvents = this.revenueEvents.filter(
      e => e.strategy_id === strategyId
    );

    // Calculate totals
    const totalRevenue = strategyEvents.reduce(
      (sum, e) => sum + e.fee_amount,
      0
    );

    const monthlyRevenue = strategyEvents
      .filter(e => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.fee_amount, 0);

    const prevMonthRevenue = strategyEvents
      .filter(e => e.timestamp >= startOfPrevMonth && e.timestamp < startOfMonth)
      .reduce((sum, e) => sum + e.fee_amount, 0);

    // Count unique active agents
    const activeAgents = new Set(
      strategyEvents
        .filter(e => e.timestamp >= startOfMonth)
        .map(e => e.agent_id)
    ).size;

    // Calculate average revenue per agent
    const avgRevenuePerAgent = activeAgents > 0
      ? monthlyRevenue / activeAgents
      : 0;

    // Calculate revenue trend (percentage change from previous month)
    const revenueTrend = prevMonthRevenue > 0
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : 0;

    return {
      strategy_id: strategyId,
      monthly_revenue: Math.round(monthlyRevenue * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      active_agents: activeAgents,
      avg_revenue_per_agent: Math.round(avgRevenuePerAgent * 100) / 100,
      revenue_trend: Math.round(revenueTrend * 10) / 10,
      calculated_at: now,
    };
  }

  getPlatformMetrics(): PlatformRevenueMetrics {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate platform totals
    const totalPlatformRevenue = this.revenueEvents.reduce(
      (sum, e) => sum + e.platform_earnings,
      0
    );

    const monthlyPlatformRevenue = this.revenueEvents
      .filter(e => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.platform_earnings, 0);

    const totalDeveloperPayouts = this.revenueEvents.reduce(
      (sum, e) => sum + e.developer_earnings,
      0
    );

    const monthlyDeveloperPayouts = this.revenueEvents
      .filter(e => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.developer_earnings, 0);

    // Count active monetized strategies
    const activeMonetizedStrategies = Array.from(this.monetizations.values())
      .filter(m => m.enabled).length;

    // Count active paying agents
    const activePayingAgents = new Set(
      this.revenueEvents
        .filter(e => e.timestamp >= startOfMonth)
        .map(e => e.agent_id)
    ).size;

    return {
      total_platform_revenue: Math.round(totalPlatformRevenue * 100) / 100,
      monthly_platform_revenue: Math.round(monthlyPlatformRevenue * 100) / 100,
      total_developer_payouts: Math.round(totalDeveloperPayouts * 100) / 100,
      monthly_developer_payouts: Math.round(monthlyDeveloperPayouts * 100) / 100,
      active_monetized_strategies: activeMonetizedStrategies,
      active_paying_agents: activePayingAgents,
      calculated_at: now,
    };
  }

  // ============================================================================
  // Revenue Events Access
  // ============================================================================

  getRevenueEvents(strategyId: string, limit: number = 100): RevenueEvent[] {
    return this.revenueEvents
      .filter(e => e.strategy_id === strategyId)
      .slice(-limit);
  }

  getRecentEvents(limit: number = 100): RevenueEvent[] {
    return this.revenueEvents.slice(-limit);
  }

  // ============================================================================
  // Referrer Management
  // ============================================================================

  setReferrer(strategyId: string, agentId: string, referrerId: string): void {
    const context = this.getOrCreateAgentContext(agentId, strategyId, 0);
    context.referrerId = referrerId;
    this.agentContexts.set(this.getContextKey(agentId, strategyId), context);
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  onEvent(callback: RevenueEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private recordRevenueEvent(
    strategyId: string,
    agentId: string,
    developerId: string,
    feeType: FeeType,
    profit: number | undefined,
    feeAmount: number,
    developerEarnings: number,
    platformEarnings: number,
    referrerEarnings: number,
    referrerId?: string
  ): RevenueEvent {
    const event: RevenueEvent = {
      event_id: this.generateId('rev'),
      strategy_id: strategyId,
      agent_id: agentId,
      developer_id: developerId,
      fee_type: feeType,
      profit,
      fee_amount: feeAmount,
      developer_earnings: developerEarnings,
      platform_earnings: platformEarnings,
      referrer_earnings: referrerEarnings,
      referrer_id: referrerId,
      currency: 'USD',
      timestamp: new Date(),
    };

    this.revenueEvents.push(event);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'revenue_distributed',
      timestamp: event.timestamp,
      strategy_id: strategyId,
      developer_id: developerId,
      agent_id: agentId,
      data: {
        fee_type: feeType,
        fee_amount: feeAmount,
        developer_earnings: developerEarnings,
        platform_earnings: platformEarnings,
        referrer_earnings: referrerEarnings,
      },
    });

    this.emitEvent({
      id: this.generateId('event'),
      type: 'earnings_updated',
      timestamp: event.timestamp,
      developer_id: developerId,
      data: {
        earnings_added: developerEarnings,
      },
    });

    return event;
  }

  private getSplitConfig(referrerId?: string): RevenueSplitConfig {
    if (referrerId) {
      return REVENUE_SPLIT_WITH_REFERRER;
    }
    return this.config.default_split;
  }

  private getOrCreateAgentContext(
    agentId: string,
    strategyId: string,
    initialCapital: number
  ): AgentContext {
    const key = this.getContextKey(agentId, strategyId);
    let context = this.agentContexts.get(key);

    if (!context) {
      context = {
        agentId,
        strategyId,
        highWaterMark: initialCapital,
      };
      this.agentContexts.set(key, context);
    }

    return context;
  }

  private getContextKey(agentId: string, strategyId: string): string {
    return `${agentId}:${strategyId}`;
  }

  private emitEvent(event: RevenueSystemEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new revenue distribution service instance.
 */
export function createRevenueDistributionService(
  config?: Partial<RevenueEngineConfig>
): DefaultRevenueDistributionService {
  return new DefaultRevenueDistributionService(config);
}

// Export types
export type {
  StrategyMonetization,
  RevenueSplitConfig,
  RevenueEvent,
  DeveloperEarnings,
  StrategyEarnings,
  StrategyRevenueMetrics,
  PlatformRevenueMetrics,
  FeeType,
  RevenueSystemEvent,
  RevenueEventCallback,
  RevenueEngineConfig,
} from '../types';

export {
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
  DEFAULT_REVENUE_CONFIG,
} from '../types';
