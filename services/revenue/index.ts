/**
 * TONAIAgent - Strategy Revenue Sharing System
 *
 * A monetization system that enables developers to earn revenue from their strategies:
 * - Performance fees (percentage of profit)
 * - Subscription fees (fixed monthly amount)
 * - Hybrid fees (combination of both)
 *
 * Revenue is automatically distributed between:
 * - Strategy developer
 * - Platform treasury
 * - Referrer (optional)
 *
 * Architecture:
 * ```
 * User Agent Profit
 *       ↓
 * Performance Fee / Subscription
 *       ↓
 * Fee Calculator        ← src/revenue/calculation/
 *       ↓
 * Revenue Distribution  ← src/revenue/distribution/
 *       ↓
 * Revenue API           ← src/revenue/api.ts
 * ```
 *
 * Implements Issue #219: Strategy Revenue Sharing System
 *
 * @example
 * ```typescript
 * import {
 *   createRevenueApi,
 *   createRevenueDistributionService,
 *   createFeeCalculator,
 * } from '@tonaiagent/core/revenue';
 *
 * // Create the revenue distribution service
 * const revenueService = createRevenueDistributionService();
 *
 * // Configure monetization for a strategy
 * revenueService.configureStrategyMonetization(
 *   'momentum_v1',
 *   'developer_123',
 *   'performance',
 *   { feePercent: 20 }
 * );
 *
 * // Process a performance fee when agent makes profit
 * const event = revenueService.processPerformanceFee(
 *   'momentum_v1',
 *   'agent_001',
 *   10000,  // initial capital
 *   10800   // current value
 * );
 * // Result: { fee_amount: 160, developer_earnings: 112, platform_earnings: 48 }
 *
 * // Get developer earnings
 * const earnings = revenueService.getDeveloperEarnings('developer_123');
 * console.log(`Total earnings: $${earnings.total_earnings}`);
 *
 * // Or use the API
 * const api = createRevenueApi(revenueService);
 * const response = await api.handle({
 *   method: 'GET',
 *   path: '/api/strategies/momentum_v1/revenue',
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Monetization types
  FeeType,
  StrategyMonetization,
  RevenueSplitConfig,

  // Fee calculation types
  PerformanceFeeInput,
  PerformanceFeeResult,
  SubscriptionFeeInput,
  SubscriptionFeeResult,

  // Revenue event types
  RevenueEvent,
  RevenueSystemEvent,
  RevenueEventType,
  RevenueEventCallback,

  // Earnings types
  DeveloperEarnings,
  StrategyEarnings,
  StrategyRevenueMetrics,
  PlatformRevenueMetrics,

  // API types
  GetStrategyRevenueRequest,
  GetStrategyRevenueResponse,
  GetDeveloperEarningsRequest,
  GetDeveloperEarningsResponse,
  ConfigureMonetizationRequest,

  // Database schema types
  StrategyMonetizationRecord,
  RevenueEventRecord,
  DeveloperEarningsRecord,

  // Configuration
  RevenueEngineConfig,
} from './types';

export {
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
  DEFAULT_REVENUE_CONFIG,
} from './types';

// ============================================================================
// Fee Calculation Module
// ============================================================================

export {
  // Fee calculator
  DefaultFeeCalculator,
  createFeeCalculator,

  // Types
  type FeeCalculator,
  type HybridFeeResult,
  type RevenueSplit,
} from './calculation';

// ============================================================================
// Revenue Distribution Module
// ============================================================================

export {
  // Distribution service
  DefaultRevenueDistributionService,
  createRevenueDistributionService,

  // Types
  type RevenueDistributionService,
  type MonetizationOptions,
} from './distribution';

// ============================================================================
// API Module
// ============================================================================

export {
  // API handler
  RevenueApi,
  createRevenueApi,
  createDemoRevenueApi,

  // Error types
  RevenueApiError,

  // Types
  type RevenueApiRequest,
  type RevenueApiResponse,
  type RevenueApiResponseBody,
  type RevenueApiErrorCode,
} from './api';

// ============================================================================
// Default Export
// ============================================================================

export { RevenueApi as default } from './api';
