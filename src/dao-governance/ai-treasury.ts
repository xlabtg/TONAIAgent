/**
 * TONAIAgent - AI Treasury Management Module (Issue #103)
 *
 * AI-driven treasury management within governance-set constraints.
 * Generates rebalancing recommendations, optimizes yield, and enforces
 * human-set risk limits with emergency override capabilities.
 */

import type {
  TreasuryAllocation,
  AiRebalanceRecommendation,
  TreasuryRebalanceAction,
  AiTreasuryConfig,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface AiTreasuryManager {
  // Recommendation engine
  generateRebalanceRecommendation(
    currentAllocations: TreasuryAllocation[],
    totalTreasuryValue: number,
    availableValue: number
  ): Promise<AiRebalanceRecommendation>;

  getLatestRecommendation(): AiRebalanceRecommendation | undefined;
  getRecommendationHistory(limit?: number): AiRebalanceRecommendation[];

  // Auto-allocation (within governance limits)
  autoAllocate(
    availableAmount: number,
    eligibleStrategies: Array<{ strategyId: string; expectedYield: number; riskScore: number }>
  ): Promise<Array<{ strategyId: string; amount: number; rationale: string }>>;

  // Yield optimization
  optimizeYield(
    currentAllocations: TreasuryAllocation[],
    totalValue: number
  ): YieldOptimizationResult;

  // Configuration
  getConfig(): AiTreasuryConfig;
  updateConfig(config: Partial<AiTreasuryConfig>): void;

  // Human override
  overrideRecommendation(recommendationId: string, overriddenBy: string, reason: string): void;

  // Emergency override
  triggerEmergencyExit(strategyIds: string[], triggeredBy: string, reason: string): EmergencyExitPlan;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

export interface YieldOptimizationResult {
  currentYieldEstimate: number;
  optimizedYieldEstimate: number;
  improvementPercent: number;
  recommendedChanges: TreasuryRebalanceAction[];
  confidence: number;
  optimizedAt: Date;
}

export interface EmergencyExitPlan {
  id: string;
  triggeredBy: string;
  reason: string;
  strategyIds: string[];
  estimatedLoss: number;
  exitSteps: Array<{ strategyId: string; action: string; priority: number }>;
  createdAt: Date;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_AI_TREASURY_CONFIG: AiTreasuryConfig = {
  enabled: true,
  maxAutoAllocationPercent: 20,          // AI can auto-allocate up to 20% without vote
  requireGovernanceAbovePercent: 20,     // Requires governance vote above 20%
  optimizationObjective: 'risk_adjusted',
  rebalanceFrequency: 'weekly',
  humanOverrideEnabled: true,
  emergencyOverrideEnabled: true,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAiTreasuryManager implements AiTreasuryManager {
  private config: AiTreasuryConfig;
  private readonly recommendations: AiRebalanceRecommendation[] = [];
  private readonly overrides = new Map<string, { by: string; reason: string; at: Date }>();
  private readonly eventCallbacks: DaoEventCallback[] = [];

  constructor(config: Partial<AiTreasuryConfig> = {}) {
    this.config = { ...DEFAULT_AI_TREASURY_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Recommendation Engine
  // --------------------------------------------------------------------------

  async generateRebalanceRecommendation(
    currentAllocations: TreasuryAllocation[],
    totalTreasuryValue: number,
    availableValue: number
  ): Promise<AiRebalanceRecommendation> {
    const actions: TreasuryRebalanceAction[] = [];

    // Sort allocations by risk-adjusted return
    const sorted = [...currentAllocations].sort((a, b) => {
      const scoreA = a.pnlPercent - a.riskScore * 0.3;
      const scoreB = b.pnlPercent - b.riskScore * 0.3;
      return scoreB - scoreA;
    });

    const currentAllocs: Record<string, number> = {};
    const recommendedAllocs: Record<string, number> = {};
    let expectedImprovement = 0;
    let expectedRiskReduction = 0;

    for (const alloc of currentAllocations) {
      currentAllocs[alloc.strategyId] = totalTreasuryValue > 0
        ? (alloc.currentValue / totalTreasuryValue) * 100
        : 0;
    }

    // AI logic: increase allocation to top performers, decrease underperformers
    for (const alloc of sorted) {
      const currentPercent = currentAllocs[alloc.strategyId] ?? 0;
      let targetPercent = currentPercent;

      if (alloc.pnlPercent > 5 && alloc.riskScore < 60) {
        // Increase by up to 5% for strong performers
        targetPercent = Math.min(currentPercent + 5, 30);
        expectedImprovement += (targetPercent - currentPercent) * alloc.pnlPercent / 100;
      } else if (alloc.pnlPercent < -5 || alloc.riskScore > 80) {
        // Decrease by up to 10% for underperformers
        targetPercent = Math.max(currentPercent - 10, 5);
        expectedRiskReduction += (currentPercent - targetPercent) * alloc.riskScore / 100;
      }

      recommendedAllocs[alloc.strategyId] = targetPercent;

      const deltaPercent = targetPercent - currentPercent;
      const delta = (deltaPercent / 100) * totalTreasuryValue;

      if (Math.abs(deltaPercent) >= 2) {
        const actionType: TreasuryRebalanceAction['type'] =
          delta > 0 ? 'increase' : 'decrease';

        actions.push({
          type: actionType,
          strategyId: alloc.strategyId,
          strategyName: alloc.strategyName,
          currentAmount: alloc.currentValue,
          targetAmount: alloc.currentValue + delta,
          delta,
          deltaPercent,
          reason: delta > 0
            ? `Strong risk-adjusted returns (${alloc.pnlPercent.toFixed(1)}% PnL, ${alloc.riskScore} risk score)`
            : `Underperforming or high-risk (${alloc.pnlPercent.toFixed(1)}% PnL, ${alloc.riskScore} risk score)`,
        });
      }
    }

    // If available funds, suggest new allocations
    if (availableValue > 0 && sorted.length > 0) {
      const topStrategy = sorted[0];
      if (topStrategy.pnlPercent > 0 && topStrategy.riskScore < 70) {
        const suggestedAmount = Math.min(availableValue, totalTreasuryValue * 0.1);
        actions.push({
          type: 'increase',
          strategyId: topStrategy.strategyId,
          strategyName: topStrategy.strategyName,
          currentAmount: topStrategy.currentValue,
          targetAmount: topStrategy.currentValue + suggestedAmount,
          delta: suggestedAmount,
          deltaPercent: totalTreasuryValue > 0 ? (suggestedAmount / totalTreasuryValue) * 100 : 0,
          reason: `Deploy idle capital to top-performing strategy`,
        });
      }
    }

    const requiresGovernance = actions.some(a =>
      Math.abs(a.deltaPercent) > this.config.requireGovernanceAbovePercent
    );

    const recommendation: AiRebalanceRecommendation = {
      id: this.generateId(),
      currentAllocations: currentAllocs,
      recommendedAllocations: recommendedAllocs,
      expectedImprovement,
      expectedRiskReduction,
      confidence: this.computeConfidence(currentAllocations),
      rationale: this.buildRationale(actions, currentAllocations),
      actions,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),  // 7 day validity
      requiresGovernanceApproval: requiresGovernance,
    };

    this.recommendations.push(recommendation);

    this.emit({ type: 'ai.rebalance_recommended', data: { recommendation }, timestamp: new Date() });

    return recommendation;
  }

  getLatestRecommendation(): AiRebalanceRecommendation | undefined {
    return this.recommendations[this.recommendations.length - 1];
  }

  getRecommendationHistory(limit = 10): AiRebalanceRecommendation[] {
    return this.recommendations.slice(-limit).reverse();
  }

  // --------------------------------------------------------------------------
  // Auto-Allocation
  // --------------------------------------------------------------------------

  async autoAllocate(
    availableAmount: number,
    eligibleStrategies: Array<{ strategyId: string; expectedYield: number; riskScore: number }>
  ): Promise<Array<{ strategyId: string; amount: number; rationale: string }>> {
    if (!this.config.enabled) return [];

    const maxAutoAmount = availableAmount * (this.config.maxAutoAllocationPercent / 100);

    // Filter to manageable strategies
    const viable = eligibleStrategies.filter(s => s.riskScore < 75 && s.expectedYield > 0);
    if (viable.length === 0) return [];

    // Score by yield / risk
    const scored = viable
      .map(s => ({ ...s, score: s.expectedYield / (s.riskScore + 1) }))
      .sort((a, b) => b.score - a.score);

    const allocations: Array<{ strategyId: string; amount: number; rationale: string }> = [];
    let remaining = maxAutoAmount;

    for (const strategy of scored.slice(0, 3)) {  // Top 3 strategies
      if (remaining <= 0) break;
      const alloc = remaining * 0.4;  // Spread across strategies
      allocations.push({
        strategyId: strategy.strategyId,
        amount: alloc,
        rationale: `AI auto-allocation: yield score ${strategy.score.toFixed(2)} ` +
          `(${strategy.expectedYield}% yield, ${strategy.riskScore} risk)`,
      });
      remaining -= alloc;
    }

    return allocations;
  }

  // --------------------------------------------------------------------------
  // Yield Optimization
  // --------------------------------------------------------------------------

  optimizeYield(
    currentAllocations: TreasuryAllocation[],
    totalValue: number
  ): YieldOptimizationResult {
    const currentYield = currentAllocations.reduce(
      (sum, a) => sum + (a.pnlPercent * a.currentValue) / totalValue,
      0
    );

    // Simple optimization: find strategies with negative PnL and reduce them
    const changes: TreasuryRebalanceAction[] = [];
    let optimizedYield = currentYield;

    for (const alloc of currentAllocations) {
      if (alloc.pnlPercent < -2) {
        const reduction = alloc.currentValue * 0.2;  // Reduce by 20%
        changes.push({
          type: 'decrease',
          strategyId: alloc.strategyId,
          strategyName: alloc.strategyName,
          currentAmount: alloc.currentValue,
          targetAmount: alloc.currentValue - reduction,
          delta: -reduction,
          deltaPercent: totalValue > 0 ? (-reduction / totalValue) * 100 : 0,
          reason: `Negative PnL (${alloc.pnlPercent.toFixed(1)}%) — reduce exposure`,
        });
        optimizedYield += (2 - alloc.pnlPercent) * (reduction / totalValue);
      }
    }

    const improvementPercent = currentYield !== 0
      ? ((optimizedYield - currentYield) / Math.abs(currentYield)) * 100
      : 0;

    return {
      currentYieldEstimate: currentYield,
      optimizedYieldEstimate: optimizedYield,
      improvementPercent,
      recommendedChanges: changes,
      confidence: this.computeConfidence(currentAllocations),
      optimizedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  getConfig(): AiTreasuryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AiTreasuryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // --------------------------------------------------------------------------
  // Human Override
  // --------------------------------------------------------------------------

  overrideRecommendation(recommendationId: string, overriddenBy: string, reason: string): void {
    this.overrides.set(recommendationId, { by: overriddenBy, reason, at: new Date() });
  }

  // --------------------------------------------------------------------------
  // Emergency Override
  // --------------------------------------------------------------------------

  triggerEmergencyExit(
    strategyIds: string[],
    triggeredBy: string,
    reason: string
  ): EmergencyExitPlan {
    const steps = strategyIds.map((id, idx) => ({
      strategyId: id,
      action: 'emergency_exit',
      priority: idx + 1,
    }));

    return {
      id: this.generateId(),
      triggeredBy,
      reason,
      strategyIds,
      estimatedLoss: 0,  // Would be computed from live data
      exitSteps: steps,
      createdAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private computeConfidence(allocations: TreasuryAllocation[]): number {
    if (allocations.length === 0) return 0.5;

    // Confidence increases with more data points and lower variance
    const avgPnl = allocations.reduce((s, a) => s + a.pnlPercent, 0) / allocations.length;
    const variance = allocations.reduce((s, a) => s + Math.pow(a.pnlPercent - avgPnl, 2), 0) / allocations.length;
    const stdDev = Math.sqrt(variance);

    // Higher std dev = lower confidence
    const rawConfidence = Math.max(0, 1 - stdDev / 20);
    return Math.min(1, Math.max(0.2, rawConfidence));
  }

  private buildRationale(
    actions: TreasuryRebalanceAction[],
    allocations: TreasuryAllocation[]
  ): string {
    if (actions.length === 0) {
      return 'Portfolio is well-balanced. No rebalancing required at this time.';
    }

    const increases = actions.filter(a => a.type === 'increase').length;
    const decreases = actions.filter(a => a.type === 'decrease').length;
    const avgRisk = allocations.length > 0
      ? allocations.reduce((s, a) => s + a.riskScore, 0) / allocations.length
      : 0;

    return `AI analysis recommends ${increases} allocation increase(s) and ${decreases} decrease(s) ` +
      `to improve risk-adjusted returns. Current portfolio average risk score: ${avgRisk.toFixed(0)}.`;
  }

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createAiTreasuryManager(config?: Partial<AiTreasuryConfig>): AiTreasuryManager {
  return new DefaultAiTreasuryManager(config);
}
