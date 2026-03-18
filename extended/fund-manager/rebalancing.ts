/**
 * TONAIAgent - Automatic Rebalancing Engine
 *
 * Executes automatic rebalancing of fund portfolios based on:
 * - Weight drift threshold (deviation from target allocations)
 * - Scheduled interval (time-based forced rebalance)
 * - Volatility spikes (market-condition triggered rebalance)
 * - Risk threshold breaches (risk-management triggered rebalance)
 * - Manual triggers (operator-initiated rebalance)
 */

import {
  FundConfig,
  FundManagerError,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
  RebalancingAction,
  RebalancingPlan,
  RebalancingResult,
  RebalanceTrigger,
  StrategyAllocation,
} from './types';

// ============================================================================
// Rebalancing Engine
// ============================================================================

/** Configuration for the RebalancingEngine */
export interface RebalancingEngineConfig {
  /** Simulated gas cost per rebalancing action in nanoTON */
  gasCostPerActionNano: bigint;
}

const DEFAULT_CONFIG: RebalancingEngineConfig = {
  gasCostPerActionNano: BigInt(50_000_000), // 0.05 TON per action
};

export class RebalancingEngine {
  private readonly config: RebalancingEngineConfig;
  private readonly lastRebalanceTimes = new Map<string, Date>();
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<RebalancingEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Trigger Detection
  // ============================================================================

  /**
   * Check whether a rebalancing should be triggered for a fund.
   * Returns the trigger reason or null if no rebalancing is needed.
   */
  shouldRebalance(
    fund: FundConfig,
    portfolio: FundPortfolio,
    currentVolatilityPercent?: number
  ): RebalanceTrigger | null {
    const rules = fund.rebalancingRules;
    const now = new Date();

    // 1. Check drift threshold
    for (const allocation of portfolio.allocations) {
      const drift = Math.abs(allocation.currentWeightPercent - allocation.targetWeightPercent);
      if (drift >= rules.driftThresholdPercent) {
        return 'drift_threshold';
      }
    }

    // 2. Check max interval (forced periodic rebalance)
    const lastRebalance = this.lastRebalanceTimes.get(fund.fundId);
    if (lastRebalance) {
      const elapsedSeconds = (now.getTime() - lastRebalance.getTime()) / 1000;
      if (elapsedSeconds >= rules.maxIntervalSeconds) {
        return 'scheduled_interval';
      }
    } else {
      // Never rebalanced — trigger if any capital is allocated
      if (portfolio.totalAum > BigInt(0)) {
        return 'scheduled_interval';
      }
    }

    // 3. Check volatility spike
    if (
      rules.rebalanceOnVolatility &&
      currentVolatilityPercent !== undefined &&
      currentVolatilityPercent >= rules.volatilityThresholdPercent
    ) {
      return 'volatility_spike';
    }

    return null;
  }

  /**
   * Check minimum interval — return false if too soon to rebalance.
   */
  canRebalance(fund: FundConfig): boolean {
    const lastRebalance = this.lastRebalanceTimes.get(fund.fundId);
    if (!lastRebalance) return true;

    const elapsedSeconds = (Date.now() - lastRebalance.getTime()) / 1000;
    return elapsedSeconds >= fund.rebalancingRules.minIntervalSeconds;
  }

  // ============================================================================
  // Plan Generation
  // ============================================================================

  /**
   * Generate a rebalancing plan for a fund portfolio.
   *
   * Computes the actions needed to bring current weights back to target weights.
   * Does not execute — returns a plan for inspection and approval.
   */
  generatePlan(
    fund: FundConfig,
    portfolio: FundPortfolio,
    trigger: RebalanceTrigger
  ): RebalancingPlan {
    const planId = this.generateId('plan');
    const actions: RebalancingAction[] = [];

    const totalAum = portfolio.totalAum;
    if (totalAum === BigInt(0)) {
      return { planId, fundId: fund.fundId, trigger, actions: [], estimatedGasCost: BigInt(0), createdAt: new Date() };
    }

    // Calculate target capital for each strategy
    const targetCapitals = new Map<string, bigint>();
    for (const alloc of fund.strategyAllocations) {
      const target = (totalAum * BigInt(Math.round(alloc.targetWeightPercent * 100))) / BigInt(10000);
      targetCapitals.set(alloc.strategyId, target);
    }

    // Determine over- and under-allocated strategies
    const overAllocated: Array<{ strategyId: string; excess: bigint }> = [];
    const underAllocated: Array<{ strategyId: string; deficit: bigint; targetWeight: number }> = [];

    for (const allocation of portfolio.allocations) {
      const target = targetCapitals.get(allocation.strategyId) ?? BigInt(0);
      const diff = allocation.allocatedCapital - target;

      if (diff > BigInt(0)) {
        overAllocated.push({ strategyId: allocation.strategyId, excess: diff });
      } else if (diff < BigInt(0)) {
        const targetWeight = fund.strategyAllocations.find(
          (s) => s.strategyId === allocation.strategyId
        )?.targetWeightPercent ?? allocation.targetWeightPercent;
        underAllocated.push({ strategyId: allocation.strategyId, deficit: -diff, targetWeight });
      }
    }

    // Generate actions: reduce over-allocated → increase under-allocated
    for (const over of overAllocated) {
      let remaining = over.excess;
      for (const under of underAllocated) {
        if (remaining === BigInt(0)) break;
        if (under.deficit === BigInt(0)) continue;

        const moveAmount = remaining < under.deficit ? remaining : under.deficit;
        actions.push({
          fromStrategyId: over.strategyId,
          toStrategyId: under.strategyId,
          amountToMove: moveAmount,
          newTargetWeightPercent: under.targetWeight,
        });

        remaining -= moveAmount;
        under.deficit -= moveAmount;
      }
    }

    const estimatedGasCost =
      BigInt(actions.length) * this.config.gasCostPerActionNano;

    return {
      planId,
      fundId: fund.fundId,
      trigger,
      actions,
      estimatedGasCost,
      createdAt: new Date(),
    };
  }

  // ============================================================================
  // Plan Execution
  // ============================================================================

  /**
   * Execute a rebalancing plan.
   *
   * Applies allocation changes to the portfolio state.
   * In a full implementation, each action dispatches through the Agent Runtime.
   */
  async executePlan(
    plan: RebalancingPlan,
    portfolio: FundPortfolio
  ): Promise<{ result: RebalancingResult; updatedPortfolio: FundPortfolio }> {
    const fund_id = plan.fundId;

    this.emitEvent('rebalancing.triggered', fund_id, {
      planId: plan.planId,
      trigger: plan.trigger,
      actionCount: plan.actions.length,
    });

    if (plan.actions.length === 0) {
      const result: RebalancingResult = {
        planId: plan.planId,
        fundId: fund_id,
        success: true,
        actionsCompleted: 0,
        actionsFailed: 0,
        gasUsed: BigInt(0),
        newPortfolio: portfolio,
        completedAt: new Date(),
      };
      this.lastRebalanceTimes.set(fund_id, new Date());
      return { result, updatedPortfolio: portfolio };
    }

    let actionsCompleted = 0;
    let actionsFailed = 0;
    let gasUsed = BigInt(0);
    let currentPortfolio = { ...portfolio, allocations: [...portfolio.allocations] };
    let overallSuccess = true;

    for (const action of plan.actions) {
      try {
        currentPortfolio = this.applyAction(action, currentPortfolio);
        actionsCompleted++;
        gasUsed += this.config.gasCostPerActionNano;
      } catch {
        actionsFailed++;
        overallSuccess = false;
      }
    }

    // Update timestamps on strategy allocations
    const now = new Date();
    currentPortfolio.allocations = currentPortfolio.allocations.map((a) => ({
      ...a,
      lastRebalancedAt: now,
    }));
    currentPortfolio.lastSyncedAt = now;

    this.lastRebalanceTimes.set(fund_id, now);

    const result: RebalancingResult = {
      planId: plan.planId,
      fundId: fund_id,
      success: overallSuccess,
      actionsCompleted,
      actionsFailed,
      gasUsed,
      newPortfolio: currentPortfolio,
      completedAt: now,
    };

    if (overallSuccess) {
      this.emitEvent('rebalancing.completed', fund_id, {
        planId: plan.planId,
        actionsCompleted,
        gasUsed: gasUsed.toString(),
      });
    } else {
      this.emitEvent('rebalancing.failed', fund_id, {
        planId: plan.planId,
        actionsFailed,
      });
    }

    return { result, updatedPortfolio: currentPortfolio };
  }

  /**
   * Get the timestamp of the last rebalance for a fund.
   */
  getLastRebalanceTime(fundId: string): Date | undefined {
    return this.lastRebalanceTimes.get(fundId);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private applyAction(action: RebalancingAction, portfolio: FundPortfolio): FundPortfolio {
    const allocations = portfolio.allocations.map((a): StrategyAllocation => {
      if (action.fromStrategyId !== 'cash' && a.strategyId === action.fromStrategyId) {
        if (a.allocatedCapital < action.amountToMove) {
          throw new FundManagerError(
            `Strategy ${a.strategyId} has insufficient capital for rebalancing action`,
            'REBALANCING_FAILED'
          );
        }
        return { ...a, allocatedCapital: a.allocatedCapital - action.amountToMove };
      }
      if (action.toStrategyId !== 'cash' && a.strategyId === action.toStrategyId) {
        return {
          ...a,
          allocatedCapital: a.allocatedCapital + action.amountToMove,
          currentWeightPercent: action.newTargetWeightPercent,
        };
      }
      return a;
    });

    return { ...portfolio, allocations };
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

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRebalancingEngine(
  config?: Partial<RebalancingEngineConfig>
): RebalancingEngine {
  return new RebalancingEngine(config);
}
