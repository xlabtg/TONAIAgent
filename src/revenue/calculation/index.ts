/**
 * TONAIAgent - Fee Calculation Engine
 *
 * Calculates fees for strategy usage based on monetization models:
 * - Performance fees (percentage of profit)
 * - Subscription fees (fixed monthly amount)
 * - Hybrid fees (combination of both)
 *
 * Supports:
 * - High water mark for performance fees
 * - Revenue splitting between developer, platform, and referrer
 * - Minimum fee thresholds
 *
 * Implements Issue #219: Strategy Revenue Sharing System
 */

import {
  PerformanceFeeInput,
  PerformanceFeeResult,
  SubscriptionFeeInput,
  SubscriptionFeeResult,
  RevenueSplitConfig,
  DEFAULT_REVENUE_SPLIT,
  RevenueEngineConfig,
  DEFAULT_REVENUE_CONFIG,
} from '../types';

// ============================================================================
// Fee Calculator Interface
// ============================================================================

/**
 * Interface for the fee calculation engine.
 */
export interface FeeCalculator {
  // Performance fee calculation
  calculatePerformanceFee(input: PerformanceFeeInput): PerformanceFeeResult;

  // Subscription fee calculation
  calculateSubscriptionFee(input: SubscriptionFeeInput): SubscriptionFeeResult;

  // Hybrid fee calculation
  calculateHybridFee(
    performanceInput: PerformanceFeeInput,
    subscriptionInput: SubscriptionFeeInput
  ): HybridFeeResult;

  // Revenue splitting
  splitRevenue(amount: number, splitConfig: RevenueSplitConfig): RevenueSplit;

  // Validation
  validateFeePercent(percent: number): boolean;
  validateMonthlyFee(fee: number): boolean;
}

/**
 * Result of hybrid fee calculation.
 */
export interface HybridFeeResult {
  /** Performance fee result */
  performance: PerformanceFeeResult;
  /** Subscription fee result */
  subscription: SubscriptionFeeResult;
  /** Total fee amount */
  total_fee_amount: number;
  /** Total developer earnings */
  total_developer_earnings: number;
  /** Total platform earnings */
  total_platform_earnings: number;
  /** Total referrer earnings */
  total_referrer_earnings: number;
}

/**
 * Revenue split result.
 */
export interface RevenueSplit {
  /** Developer's portion */
  developer: number;
  /** Platform's portion */
  platform: number;
  /** Referrer's portion */
  referrer: number;
}

// ============================================================================
// Default Fee Calculator Implementation
// ============================================================================

/**
 * Default implementation of the fee calculation engine.
 */
export class DefaultFeeCalculator implements FeeCalculator {
  private readonly config: RevenueEngineConfig;

  constructor(config?: Partial<RevenueEngineConfig>) {
    this.config = {
      default_split: config?.default_split ?? DEFAULT_REVENUE_CONFIG.default_split,
      min_fee_amount: config?.min_fee_amount ?? DEFAULT_REVENUE_CONFIG.min_fee_amount,
      max_fee_percent: config?.max_fee_percent ?? DEFAULT_REVENUE_CONFIG.max_fee_percent,
      max_monthly_fee: config?.max_monthly_fee ?? DEFAULT_REVENUE_CONFIG.max_monthly_fee,
      metrics_update_interval_minutes: config?.metrics_update_interval_minutes ?? DEFAULT_REVENUE_CONFIG.metrics_update_interval_minutes,
      use_high_water_mark: config?.use_high_water_mark ?? DEFAULT_REVENUE_CONFIG.use_high_water_mark,
    };
  }

  // ============================================================================
  // Performance Fee Calculation
  // ============================================================================

  /**
   * Calculate performance fee based on profit.
   *
   * Example:
   *   Initial capital: $10,000
   *   Portfolio value: $10,800
   *   Profit: $800
   *   Performance fee (20%): $160
   *   Developer (70%): $112
   *   Platform (30%): $48
   */
  calculatePerformanceFee(input: PerformanceFeeInput): PerformanceFeeResult {
    const {
      initial_capital,
      portfolio_value,
      high_water_mark,
      fee_percent,
      split_config,
    } = input;

    // Determine the baseline for profit calculation
    let baseline = initial_capital;
    if (this.config.use_high_water_mark && high_water_mark !== undefined) {
      baseline = Math.max(initial_capital, high_water_mark);
    }

    // Calculate profit (only positive profit generates fees)
    const profit = Math.max(0, portfolio_value - baseline);

    // Calculate fee amount
    let feeAmount = profit * (fee_percent / 100);

    // Apply minimum fee threshold
    if (feeAmount < this.config.min_fee_amount) {
      feeAmount = 0;
    }

    // Round to 2 decimal places
    feeAmount = Math.round(feeAmount * 100) / 100;

    // Split revenue
    const split = this.splitRevenue(feeAmount, split_config);

    // Calculate new high water mark
    const newHighWaterMark = Math.max(
      baseline,
      portfolio_value
    );

    return {
      profit: Math.round(profit * 100) / 100,
      fee_amount: feeAmount,
      developer_earnings: split.developer,
      platform_earnings: split.platform,
      referrer_earnings: split.referrer,
      new_high_water_mark: newHighWaterMark,
    };
  }

  // ============================================================================
  // Subscription Fee Calculation
  // ============================================================================

  /**
   * Calculate subscription fee for a billing period.
   *
   * Example:
   *   Monthly fee: $10
   *   Billing period: 30 days
   *   Developer (70%): $7
   *   Platform (30%): $3
   */
  calculateSubscriptionFee(input: SubscriptionFeeInput): SubscriptionFeeResult {
    const {
      monthly_fee,
      billing_period_days,
      split_config,
    } = input;

    // Calculate prorated fee for the billing period
    const dailyFee = monthly_fee / 30;
    let feeAmount = dailyFee * billing_period_days;

    // Round to 2 decimal places
    feeAmount = Math.round(feeAmount * 100) / 100;

    // Apply minimum fee threshold
    if (feeAmount < this.config.min_fee_amount) {
      feeAmount = 0;
    }

    // Split revenue
    const split = this.splitRevenue(feeAmount, split_config);

    // Calculate next billing date
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + billing_period_days);

    return {
      fee_amount: feeAmount,
      developer_earnings: split.developer,
      platform_earnings: split.platform,
      referrer_earnings: split.referrer,
      next_billing_date: nextBillingDate,
    };
  }

  // ============================================================================
  // Hybrid Fee Calculation
  // ============================================================================

  /**
   * Calculate hybrid fee (combination of performance and subscription).
   *
   * Example:
   *   Monthly fee: $5
   *   Performance fee: 10%
   *   Profit: $500
   *   Performance fee amount: $50
   *   Subscription fee: $5
   *   Total: $55
   */
  calculateHybridFee(
    performanceInput: PerformanceFeeInput,
    subscriptionInput: SubscriptionFeeInput
  ): HybridFeeResult {
    const performance = this.calculatePerformanceFee(performanceInput);
    const subscription = this.calculateSubscriptionFee(subscriptionInput);

    return {
      performance,
      subscription,
      total_fee_amount: performance.fee_amount + subscription.fee_amount,
      total_developer_earnings: performance.developer_earnings + subscription.developer_earnings,
      total_platform_earnings: performance.platform_earnings + subscription.platform_earnings,
      total_referrer_earnings: performance.referrer_earnings + subscription.referrer_earnings,
    };
  }

  // ============================================================================
  // Revenue Splitting
  // ============================================================================

  /**
   * Split revenue between developer, platform, and referrer.
   */
  splitRevenue(amount: number, splitConfig: RevenueSplitConfig): RevenueSplit {
    // Ensure split percentages sum to 100
    const totalPercent = splitConfig.developer_share +
                         splitConfig.platform_share +
                         splitConfig.referrer_share;

    if (Math.abs(totalPercent - 100) > 0.01) {
      // Normalize to 100%
      const factor = 100 / totalPercent;
      splitConfig = {
        developer_share: splitConfig.developer_share * factor,
        platform_share: splitConfig.platform_share * factor,
        referrer_share: splitConfig.referrer_share * factor,
      };
    }

    const developer = Math.round((amount * splitConfig.developer_share / 100) * 100) / 100;
    const platform = Math.round((amount * splitConfig.platform_share / 100) * 100) / 100;
    const referrer = Math.round((amount * splitConfig.referrer_share / 100) * 100) / 100;

    // Handle rounding errors - adjust developer share to ensure total matches
    const total = developer + platform + referrer;
    const adjustment = Math.round((amount - total) * 100) / 100;

    return {
      developer: developer + adjustment,
      platform,
      referrer,
    };
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate that fee percentage is within acceptable range.
   */
  validateFeePercent(percent: number): boolean {
    return percent >= 0 && percent <= this.config.max_fee_percent;
  }

  /**
   * Validate that monthly fee is within acceptable range.
   */
  validateMonthlyFee(fee: number): boolean {
    return fee >= 0 && fee <= this.config.max_monthly_fee;
  }

  // ============================================================================
  // Configuration Access
  // ============================================================================

  /**
   * Get the current configuration.
   */
  getConfig(): RevenueEngineConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new fee calculator instance.
 */
export function createFeeCalculator(
  config?: Partial<RevenueEngineConfig>
): DefaultFeeCalculator {
  return new DefaultFeeCalculator(config);
}

// Export types
export type {
  PerformanceFeeInput,
  PerformanceFeeResult,
  SubscriptionFeeInput,
  SubscriptionFeeResult,
  RevenueSplitConfig,
  RevenueEngineConfig,
} from '../types';

export {
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
  DEFAULT_REVENUE_CONFIG,
} from '../types';
