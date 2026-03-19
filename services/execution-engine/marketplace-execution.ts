/**
 * TONAIAgent — Marketplace-Aware Execution Wrapper (Issue #273)
 *
 * Extends the execution pipeline with:
 * - Strategy creator ID tracking on every execution
 * - Automatic revenue share calculation after profitable trades
 * - Subscription gating: blocks execution for premium strategies
 *   when the user lacks an active subscription
 *
 * Architecture:
 *   MarketplaceExecutionEngine
 *     → canExecuteStrategy() (StrategyRegistryService)
 *     → RiskAwareExecutionEngine (existing)
 *     → RevenueDistributionService.processPerformanceFee() (existing)
 */

import type { SmartExecutionRequest, SmartExecutionResult } from './smart-execution';
import type { RiskAwareExecutionRequest, RiskAwareExecutionResult } from './risk-aware-execution';
import {
  DefaultRiskAwareExecutionEngine,
  createRiskAwareExecutionEngine,
} from './risk-aware-execution';
import type { StrategyRegistryService } from '../../core/strategies/registry';
import type { RevenueDistributionService } from '../revenue/distribution';

// ============================================================================
// Types
// ============================================================================

/**
 * Execution request enriched with marketplace context.
 * Adds `creatorId` and optional revenue configuration.
 */
export interface MarketplaceExecutionRequest extends RiskAwareExecutionRequest {
  /**
   * ID of the strategy creator (owner).
   * Used for revenue share calculation and attribution.
   */
  creatorId?: string;
  /**
   * Performance fee percentage (0–100) to apply if the trade is profitable.
   * Falls back to 0 (free) when omitted.
   */
  performanceFeePercent?: number;
  /**
   * Initial capital used to determine profit (for performance fee basis).
   * Required when performanceFeePercent > 0.
   */
  initialCapital?: number;
}

/** Revenue share details appended to execution result */
export interface ExecutionRevenueShare {
  /** Whether any revenue share was collected */
  collected: boolean;
  /** Creator's earnings (USD equivalent) */
  creatorEarnings: number;
  /** Platform's earnings (USD equivalent) */
  platformEarnings: number;
  /** Total fee deducted */
  totalFee: number;
}

/** Marketplace-aware execution result */
export interface MarketplaceExecutionResult {
  /** Underlying risk-aware execution result */
  execution: RiskAwareExecutionResult;
  /** Revenue share details (undefined when no fee applies) */
  revenueShare?: ExecutionRevenueShare;
  /** Strategy ID for attribution */
  strategyId?: string;
  /** Creator ID for attribution */
  creatorId?: string;
}

// ============================================================================
// Engine
// ============================================================================

/**
 * MarketplaceExecutionEngine — wraps the risk-aware execution engine with
 * marketplace subscription gating and revenue share calculation.
 */
export class MarketplaceExecutionEngine {
  private readonly inner: DefaultRiskAwareExecutionEngine;
  private readonly registry?: StrategyRegistryService;
  private readonly revenueService?: RevenueDistributionService;

  constructor(
    registry?: StrategyRegistryService,
    revenueService?: RevenueDistributionService
  ) {
    this.inner = createRiskAwareExecutionEngine();
    this.registry = registry;
    this.revenueService = revenueService;
  }

  /**
   * Execute a trade with marketplace-aware gating and revenue tracking.
   */
  async execute(req: MarketplaceExecutionRequest): Promise<MarketplaceExecutionResult> {
    const { strategyId, userId, creatorId, performanceFeePercent = 0, initialCapital } = req;

    // --- Subscription gate ---
    if (strategyId && userId && this.registry) {
      const allowed = await this.registry.canExecuteStrategy(userId, strategyId);
      if (!allowed) {
        return {
          execution: {
            approved: false,
            reason: 'DAILY_LOSS_LIMIT' as never,
            message: `User ${userId} does not have an active subscription to strategy ${strategyId}`,
            currentDrawdown: 0,
            riskScore: 0,
          },
          strategyId,
          creatorId,
        };
      }
    }

    // --- Execute via risk-aware engine ---
    const execution = await this.inner.execute(req);

    // --- Revenue share (only for approved, profitable, fee-bearing executions) ---
    let revenueShare: ExecutionRevenueShare | undefined;

    if (
      execution.approved &&
      execution.executionResult.success &&
      strategyId &&
      creatorId &&
      performanceFeePercent > 0 &&
      initialCapital !== undefined &&
      this.revenueService
    ) {
      // Estimate current portfolio value from execution result
      const estimatedProfit = execution.executionResult.netAmountOut
        ? Number(execution.executionResult.netAmountOut) - initialCapital
        : 0;

      if (estimatedProfit > 0) {
        try {
          const event = this.revenueService.processPerformanceFee(
            strategyId,
            req.agentId ?? 'unknown',
            initialCapital,
            initialCapital + estimatedProfit
          );

          revenueShare = {
            collected: true,
            creatorEarnings: event.developer_earnings,
            platformEarnings: event.platform_earnings,
            totalFee: event.fee_amount,
          };
        } catch {
          // Revenue processing failure should not block trade result
          revenueShare = { collected: false, creatorEarnings: 0, platformEarnings: 0, totalFee: 0 };
        }
      }
    }

    return { execution, revenueShare, strategyId, creatorId };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMarketplaceExecutionEngine(
  registry?: StrategyRegistryService,
  revenueService?: RevenueDistributionService
): MarketplaceExecutionEngine {
  return new MarketplaceExecutionEngine(registry, revenueService);
}
