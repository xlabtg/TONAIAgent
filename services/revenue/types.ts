/**
 * TONAIAgent - Strategy Revenue Sharing System Types
 *
 * Type definitions for the Strategy Revenue Sharing System (Issue #219).
 * These types define the data structures for monetization models, fee calculation,
 * revenue distribution, and developer earnings.
 */

// ============================================================================
// Monetization Models
// ============================================================================

/** Fee type classification */
export type FeeType = 'performance' | 'subscription' | 'hybrid';

/**
 * Strategy monetization configuration.
 * Defines how a strategy generates revenue for its developer.
 */
export interface StrategyMonetization {
  /** Strategy identifier */
  strategy_id: string;
  /** Developer identifier */
  developer_id: string;
  /** Fee type (performance, subscription, or hybrid) */
  fee_type: FeeType;
  /** Performance fee percentage (0-100) */
  fee_percent: number;
  /** Monthly subscription fee in USD */
  monthly_fee: number;
  /** Whether monetization is enabled */
  enabled: boolean;
  /** Creation timestamp */
  created_at: Date;
  /** Last update timestamp */
  updated_at: Date;
}

/**
 * Revenue split configuration between parties.
 */
export interface RevenueSplitConfig {
  /** Developer's share percentage (0-100) */
  developer_share: number;
  /** Platform's share percentage (0-100) */
  platform_share: number;
  /** Referrer's share percentage (0-100), optional */
  referrer_share: number;
}

/** Default revenue split configuration */
export const DEFAULT_REVENUE_SPLIT: RevenueSplitConfig = {
  developer_share: 70,
  platform_share: 30,
  referrer_share: 0,
};

/** Revenue split with referrer */
export const REVENUE_SPLIT_WITH_REFERRER: RevenueSplitConfig = {
  developer_share: 65,
  platform_share: 25,
  referrer_share: 10,
};

// ============================================================================
// Fee Calculation
// ============================================================================

/**
 * Input for performance fee calculation.
 */
export interface PerformanceFeeInput {
  /** Strategy identifier */
  strategy_id: string;
  /** Agent identifier */
  agent_id: string;
  /** Initial capital */
  initial_capital: number;
  /** Current portfolio value */
  portfolio_value: number;
  /** High water mark (for avoiding double fees) */
  high_water_mark?: number;
  /** Performance fee percentage */
  fee_percent: number;
  /** Revenue split configuration */
  split_config: RevenueSplitConfig;
  /** Referrer ID (optional) */
  referrer_id?: string;
}

/**
 * Result of performance fee calculation.
 */
export interface PerformanceFeeResult {
  /** Profit amount */
  profit: number;
  /** Total fee amount */
  fee_amount: number;
  /** Developer's earnings */
  developer_earnings: number;
  /** Platform's earnings */
  platform_earnings: number;
  /** Referrer's earnings (if applicable) */
  referrer_earnings: number;
  /** Updated high water mark */
  new_high_water_mark: number;
}

/**
 * Input for subscription fee calculation.
 */
export interface SubscriptionFeeInput {
  /** Strategy identifier */
  strategy_id: string;
  /** Agent identifier */
  agent_id: string;
  /** Monthly subscription fee in USD */
  monthly_fee: number;
  /** Billing period (days) */
  billing_period_days: number;
  /** Revenue split configuration */
  split_config: RevenueSplitConfig;
  /** Referrer ID (optional) */
  referrer_id?: string;
}

/**
 * Result of subscription fee calculation.
 */
export interface SubscriptionFeeResult {
  /** Total fee amount */
  fee_amount: number;
  /** Developer's earnings */
  developer_earnings: number;
  /** Platform's earnings */
  platform_earnings: number;
  /** Referrer's earnings (if applicable) */
  referrer_earnings: number;
  /** Next billing date */
  next_billing_date: Date;
}

// ============================================================================
// Revenue Events
// ============================================================================

/**
 * Revenue event record.
 * Tracks individual revenue events for strategies.
 */
export interface RevenueEvent {
  /** Event identifier */
  event_id: string;
  /** Strategy identifier */
  strategy_id: string;
  /** Agent identifier */
  agent_id: string;
  /** Developer identifier */
  developer_id: string;
  /** Fee type */
  fee_type: FeeType;
  /** Profit amount (for performance fees) */
  profit?: number;
  /** Total fee amount */
  fee_amount: number;
  /** Developer's earnings */
  developer_earnings: number;
  /** Platform's earnings */
  platform_earnings: number;
  /** Referrer's earnings */
  referrer_earnings: number;
  /** Referrer ID (optional) */
  referrer_id?: string;
  /** Currency (default: USD) */
  currency: string;
  /** Event timestamp */
  timestamp: Date;
}

// ============================================================================
// Developer Earnings
// ============================================================================

/**
 * Developer earnings summary.
 */
export interface DeveloperEarnings {
  /** Developer identifier */
  developer_id: string;
  /** Total lifetime earnings */
  total_earnings: number;
  /** Monthly earnings (current month) */
  monthly_earnings: number;
  /** Daily earnings (today) */
  daily_earnings: number;
  /** Number of strategies with earnings */
  strategies_with_earnings: number;
  /** Total agents using developer's strategies */
  total_agents_using: number;
  /** Last update timestamp */
  updated_at: Date;
}

/**
 * Earnings breakdown by strategy.
 */
export interface StrategyEarnings {
  /** Strategy identifier */
  strategy_id: string;
  /** Strategy name */
  strategy_name?: string;
  /** Developer identifier */
  developer_id: string;
  /** Total lifetime earnings */
  total_earnings: number;
  /** Monthly earnings */
  monthly_earnings: number;
  /** Daily earnings */
  daily_earnings: number;
  /** Number of agents using this strategy */
  agents_using: number;
  /** Fee type */
  fee_type: FeeType;
  /** Last earning event timestamp */
  last_earning_at?: Date;
}

// ============================================================================
// Revenue Metrics
// ============================================================================

/**
 * Strategy revenue metrics for display.
 */
export interface StrategyRevenueMetrics {
  /** Strategy identifier */
  strategy_id: string;
  /** Monthly revenue */
  monthly_revenue: number;
  /** Total revenue */
  total_revenue: number;
  /** Number of active agents */
  active_agents: number;
  /** Average revenue per agent */
  avg_revenue_per_agent: number;
  /** Revenue trend (positive = growing) */
  revenue_trend: number;
  /** Last calculation timestamp */
  calculated_at: Date;
}

/**
 * Platform-wide revenue metrics.
 */
export interface PlatformRevenueMetrics {
  /** Total platform revenue */
  total_platform_revenue: number;
  /** Monthly platform revenue */
  monthly_platform_revenue: number;
  /** Total developer payouts */
  total_developer_payouts: number;
  /** Monthly developer payouts */
  monthly_developer_payouts: number;
  /** Active monetized strategies */
  active_monetized_strategies: number;
  /** Active paying agents */
  active_paying_agents: number;
  /** Last calculation timestamp */
  calculated_at: Date;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to get strategy revenue.
 */
export interface GetStrategyRevenueRequest {
  /** Strategy ID */
  strategy_id: string;
}

/**
 * Response with strategy revenue metrics.
 */
export interface GetStrategyRevenueResponse {
  /** Monthly revenue */
  monthly_revenue: number;
  /** Total revenue */
  total_revenue: number;
  /** Number of active agents */
  active_agents: number;
}

/**
 * Request to get developer earnings.
 */
export interface GetDeveloperEarningsRequest {
  /** Developer ID */
  developer_id: string;
}

/**
 * Response with developer earnings.
 */
export interface GetDeveloperEarningsResponse {
  /** Total lifetime earnings */
  total_earnings: number;
  /** Monthly earnings */
  monthly_earnings: number;
}

/**
 * Request to configure strategy monetization.
 */
export interface ConfigureMonetizationRequest {
  /** Fee type */
  fee_type: FeeType;
  /** Performance fee percentage (for performance/hybrid) */
  fee_percent?: number;
  /** Monthly subscription fee (for subscription/hybrid) */
  monthly_fee?: number;
  /** Revenue split configuration */
  split_config?: Partial<RevenueSplitConfig>;
}

// ============================================================================
// Events
// ============================================================================

/** Revenue system event types */
export type RevenueEventType =
  | 'fee_calculated'
  | 'revenue_distributed'
  | 'earnings_updated'
  | 'monetization_configured'
  | 'subscription_billed';

/**
 * Revenue system event.
 */
export interface RevenueSystemEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: RevenueEventType;
  /** Event timestamp */
  timestamp: Date;
  /** Strategy ID (if applicable) */
  strategy_id?: string;
  /** Developer ID (if applicable) */
  developer_id?: string;
  /** Agent ID (if applicable) */
  agent_id?: string;
  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Callback for revenue system events.
 */
export type RevenueEventCallback = (event: RevenueSystemEvent) => void;

// ============================================================================
// Database Schema Types (for reference)
// ============================================================================

/**
 * strategy_monetization table schema.
 */
export interface StrategyMonetizationRecord {
  strategy_id: string;
  developer_id: string;
  fee_type: FeeType;
  fee_percent: number;
  monthly_fee: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * revenue_events table schema.
 */
export interface RevenueEventRecord {
  event_id: string;
  strategy_id: string;
  agent_id: string;
  developer_id: string;
  fee_type: FeeType;
  profit: number | null;
  fee_amount: number;
  developer_earnings: number;
  platform_earnings: number;
  referrer_earnings: number;
  referrer_id: string | null;
  currency: string;
  timestamp: Date;
}

/**
 * developer_earnings table schema.
 */
export interface DeveloperEarningsRecord {
  developer_id: string;
  strategy_id: string;
  amount: number;
  fee_type: FeeType;
  timestamp: Date;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Revenue engine configuration.
 */
export interface RevenueEngineConfig {
  /** Default revenue split */
  default_split: RevenueSplitConfig;
  /** Minimum fee amount (to avoid micro-transactions) */
  min_fee_amount: number;
  /** Maximum performance fee percentage */
  max_fee_percent: number;
  /** Maximum subscription fee (monthly) */
  max_monthly_fee: number;
  /** Update interval for cached metrics (minutes) */
  metrics_update_interval_minutes: number;
  /** Enable high water mark for performance fees */
  use_high_water_mark: boolean;
}

/** Default revenue engine configuration */
export const DEFAULT_REVENUE_CONFIG: RevenueEngineConfig = {
  default_split: DEFAULT_REVENUE_SPLIT,
  min_fee_amount: 0.01,
  max_fee_percent: 50,
  max_monthly_fee: 1000,
  metrics_update_interval_minutes: 15,
  use_high_water_mark: true,
};
