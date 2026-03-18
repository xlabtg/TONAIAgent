/**
 * TONAIAgent - Portfolio Allocation Engine
 *
 * Manages capital distribution across strategy agents within a fund.
 * Distributes investor capital according to target weights, adjusts exposure
 * dynamically, and integrates with the Agent Runtime for strategy execution.
 */

import {
  AllocationResult,
  FundConfig,
  FundManagerError,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
  StrategyAllocation,
} from './types';

// ============================================================================
// Allocation Engine
// ============================================================================

/** Configuration for the AllocationEngine */
export interface AllocationEngineConfig {
  /** Minimum allocation amount per strategy in base units */
  minAllocationAmount: bigint;
  /** Cash buffer to keep unallocated (percent of AUM, e.g. 2.0 = 2%) */
  cashBufferPercent: number;
}

const DEFAULT_CONFIG: AllocationEngineConfig = {
  minAllocationAmount: BigInt(1_000_000_000), // 1 TON minimum
  cashBufferPercent: 2.0,
};

export class AllocationEngine {
  private readonly config: AllocationEngineConfig;
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<AllocationEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Allocate capital from a deposit across all strategy allocations.
   *
   * Distributes according to target weights, keeping a small cash buffer.
   * Returns updated portfolio with new capital amounts.
   */
  allocateDeposit(
    portfolio: FundPortfolio,
    fund: FundConfig,
    depositAmount: bigint
  ): { updatedPortfolio: FundPortfolio; result: AllocationResult } {
    const now = new Date();

    // Reserve cash buffer
    const cashBufferAmount = (depositAmount * BigInt(Math.round(this.config.cashBufferPercent * 100))) / BigInt(10000);
    const capitalToAllocate = depositAmount - cashBufferAmount;

    const allocations: AllocationResult['allocations'] = [];
    const updatedStrategyAllocations: StrategyAllocation[] = [];

    for (const allocation of portfolio.allocations) {
      const strategyConfig = fund.strategyAllocations.find(
        (s) => s.strategyId === allocation.strategyId
      );
      const targetWeight = strategyConfig?.targetWeightPercent ?? allocation.targetWeightPercent;

      // Amount for this strategy based on target weight
      const amount = (capitalToAllocate * BigInt(Math.round(targetWeight * 100))) / BigInt(10000);

      // Only allocate if above minimum
      const finalAmount = amount >= this.config.minAllocationAmount ? amount : BigInt(0);

      updatedStrategyAllocations.push({
        ...allocation,
        allocatedCapital: allocation.allocatedCapital + finalAmount,
        currentWeightPercent: targetWeight,
        targetWeightPercent: targetWeight,
      });

      if (finalAmount > BigInt(0)) {
        allocations.push({
          strategyId: allocation.strategyId,
          amountAllocated: finalAmount,
          weightPercent: targetWeight,
        });
      }
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amountAllocated, BigInt(0));
    const cashRetained = depositAmount - totalAllocated;

    const updatedPortfolio: FundPortfolio = {
      ...portfolio,
      totalAum: portfolio.totalAum + depositAmount,
      allocations: updatedStrategyAllocations,
      cashBalance: portfolio.cashBalance + cashRetained,
      lastSyncedAt: now,
    };

    const result: AllocationResult = {
      fundId: portfolio.fundId,
      timestamp: now,
      allocations,
      totalAllocated,
      cashRetained,
    };

    this.emitEvent('allocation.executed', portfolio.fundId, {
      fundId: portfolio.fundId,
      totalAllocated: totalAllocated.toString(),
      cashRetained: cashRetained.toString(),
      strategyCount: allocations.length,
    });

    return { updatedPortfolio, result };
  }

  /**
   * Deallocate capital for a withdrawal.
   *
   * Reduces each strategy's allocation proportionally to their current weights.
   * Returns updated portfolio.
   */
  deallocateWithdrawal(
    portfolio: FundPortfolio,
    withdrawAmount: bigint
  ): FundPortfolio {
    if (withdrawAmount > portfolio.totalAum) {
      throw new FundManagerError(
        `Withdrawal amount ${withdrawAmount} exceeds fund AUM ${portfolio.totalAum}`,
        'INSUFFICIENT_BALANCE'
      );
    }

    const now = new Date();

    // First draw from cash balance
    const fromCash = withdrawAmount <= portfolio.cashBalance
      ? withdrawAmount
      : portfolio.cashBalance;
    const remainingToWithdraw = withdrawAmount - fromCash;

    const updatedAllocations: StrategyAllocation[] = portfolio.allocations.map((allocation) => {
      if (remainingToWithdraw === BigInt(0)) return allocation;

      // Proportional withdrawal from each strategy
      const proportion = portfolio.totalAum > BigInt(0)
        ? (allocation.allocatedCapital * BigInt(10000)) / portfolio.totalAum
        : BigInt(0);

      const amountToWithdraw = (remainingToWithdraw * proportion) / BigInt(10000);
      const newAllocation = allocation.allocatedCapital > amountToWithdraw
        ? allocation.allocatedCapital - amountToWithdraw
        : BigInt(0);

      return { ...allocation, allocatedCapital: newAllocation };
    });

    return {
      ...portfolio,
      totalAum: portfolio.totalAum - withdrawAmount,
      allocations: updatedAllocations,
      cashBalance: portfolio.cashBalance - fromCash,
      lastSyncedAt: now,
    };
  }

  /**
   * Recalculate current weights based on actual allocated capital.
   */
  recalculateWeights(portfolio: FundPortfolio): FundPortfolio {
    const totalAllocated = portfolio.allocations.reduce(
      (sum, a) => sum + a.allocatedCapital,
      BigInt(0)
    );

    if (totalAllocated === BigInt(0)) return portfolio;

    const updatedAllocations = portfolio.allocations.map((allocation) => {
      const currentWeightPercent = Number(
        (allocation.allocatedCapital * BigInt(10000)) / totalAllocated
      ) / 100;
      return { ...allocation, currentWeightPercent };
    });

    return { ...portfolio, allocations: updatedAllocations, lastSyncedAt: new Date() };
  }

  /**
   * Calculate drift between current and target weights.
   * Returns map of strategyId -> drift percent.
   */
  calculateDrift(portfolio: FundPortfolio): Map<string, number> {
    const drift = new Map<string, number>();
    for (const allocation of portfolio.allocations) {
      const d = Math.abs(allocation.currentWeightPercent - allocation.targetWeightPercent);
      drift.set(allocation.strategyId, d);
    }
    return drift;
  }

  /**
   * Get target capital for each strategy given a total AUM.
   */
  getTargetAllocations(
    fund: FundConfig,
    totalAum: bigint
  ): Map<string, bigint> {
    const targets = new Map<string, bigint>();
    for (const alloc of fund.strategyAllocations) {
      const target = (totalAum * BigInt(Math.round(alloc.targetWeightPercent * 100))) / BigInt(10000);
      targets.set(alloc.strategyId, target);
    }
    return targets;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAllocationEngine(
  config?: Partial<AllocationEngineConfig>
): AllocationEngine {
  return new AllocationEngine(config);
}
