/**
 * TONAIAgent - Stability-Linked Incentive System (Issue #123)
 *
 * Reward system that ties incentives to protocol health metrics:
 * - Protocol stability score
 * - Liquidity depth
 * - Risk exposure
 * - Agent performance
 *
 * Encourages conservative risk, long-term behavior, and capital discipline.
 */

import type {
  StabilityFactors,
  IncentiveMultiplier,
  StabilityRewardTier,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface StabilityLinkedIncentiveSystem {
  // Multiplier computation
  computeMultiplier(factors: StabilityFactors): IncentiveMultiplier;
  getLatestMultiplier(): IncentiveMultiplier | undefined;

  // Reward tiers
  getRewardTiers(): StabilityRewardTier[];
  getEligibleTier(
    userDrawdown: number,
    holdingDays: number,
    capitalEfficiency: number
  ): StabilityRewardTier | undefined;

  // Yield calculation
  computeEffectiveYield(
    baseYieldPercent: number,
    multiplier: IncentiveMultiplier,
    tier?: StabilityRewardTier
  ): number;

  // History
  getMultiplierHistory(limit?: number): IncentiveMultiplier[];

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Default Reward Tiers
// ============================================================================

const DEFAULT_REWARD_TIERS: StabilityRewardTier[] = [
  {
    tier: 'conservative',
    description: 'Rewards participants with minimal drawdown and long holding periods',
    baseYieldBoost: 3.0,
    requirements: {
      maxDrawdown: 0.05,        // Max 5% drawdown
      minHoldingPeriodDays: 90,
      minCapitalEfficiency: 0.7,
    },
    active: true,
  },
  {
    tier: 'balanced',
    description: 'Rewards balanced risk-return profile with moderate holding period',
    baseYieldBoost: 1.5,
    requirements: {
      maxDrawdown: 0.15,
      minHoldingPeriodDays: 30,
      minCapitalEfficiency: 0.5,
    },
    active: true,
  },
  {
    tier: 'growth',
    description: 'Standard rewards for growth-oriented participants',
    baseYieldBoost: 0.5,
    requirements: {
      maxDrawdown: 0.25,
      minHoldingPeriodDays: 7,
      minCapitalEfficiency: 0.3,
    },
    active: true,
  },
  {
    tier: 'aggressive',
    description: 'Base rewards only — high-risk strategies earn no bonus',
    baseYieldBoost: 0.0,
    requirements: {
      maxDrawdown: 1.0,
      minHoldingPeriodDays: 0,
      minCapitalEfficiency: 0.0,
    },
    active: true,
  },
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultStabilityLinkedIncentiveSystem implements StabilityLinkedIncentiveSystem {
  private readonly multiplierHistory: IncentiveMultiplier[] = [];
  private readonly rewardTiers: StabilityRewardTier[];
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];

  constructor(tiers?: StabilityRewardTier[]) {
    this.rewardTiers = tiers ?? DEFAULT_REWARD_TIERS.map(t => ({ ...t }));
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  computeMultiplier(factors: StabilityFactors): IncentiveMultiplier {
    const { stabilityScore, liquidityDepthScore, riskExposureScore, agentPerformanceScore } =
      factors;

    // Base multiplier = 1.0
    const base = 1.0;

    // Stability bonus: up to +0.5 for perfect stability
    const stabilityBonus = (stabilityScore / 100) * 0.5;

    // Liquidity bonus: up to +0.3 for deep liquidity
    const liquidityBonus = (liquidityDepthScore / 100) * 0.3;

    // Risk penalty: up to -0.4 for max risk exposure
    // riskExposureScore: 0 = no risk, 100 = maximum risk
    const riskPenalty = (riskExposureScore / 100) * 0.4;

    // Performance bonus: up to +0.3 for top agent performance
    const performanceBonus = (agentPerformanceScore / 100) * 0.3;

    // Effective multiplier
    const effective = Math.max(
      0.5, // floor at 0.5x
      Math.min(
        2.0, // ceiling at 2.0x
        base + stabilityBonus + liquidityBonus - riskPenalty + performanceBonus
      )
    );

    const multiplier: IncentiveMultiplier = {
      base,
      stabilityBonus,
      liquidityBonus,
      riskPenalty,
      performanceBonus,
      effective,
      computedAt: new Date(),
    };

    this.multiplierHistory.push(multiplier);

    this.emit('incentive.multiplier_updated', {
      effective,
      stabilityBonus,
      liquidityBonus,
      riskPenalty,
      performanceBonus,
      factors,
    });

    return multiplier;
  }

  getLatestMultiplier(): IncentiveMultiplier | undefined {
    return this.multiplierHistory[this.multiplierHistory.length - 1];
  }

  getRewardTiers(): StabilityRewardTier[] {
    return this.rewardTiers.filter(t => t.active);
  }

  getEligibleTier(
    userDrawdown: number,
    holdingDays: number,
    capitalEfficiency: number
  ): StabilityRewardTier | undefined {
    // Return the best tier the user qualifies for (lowest drawdown requirement first)
    const activeTiers = this.rewardTiers
      .filter(t => t.active)
      .sort((a, b) => a.requirements.maxDrawdown - b.requirements.maxDrawdown);

    for (const tier of activeTiers) {
      const { maxDrawdown, minHoldingPeriodDays, minCapitalEfficiency } = tier.requirements;
      if (
        userDrawdown <= maxDrawdown &&
        holdingDays >= minHoldingPeriodDays &&
        capitalEfficiency >= minCapitalEfficiency
      ) {
        return tier;
      }
    }
    return undefined;
  }

  computeEffectiveYield(
    baseYieldPercent: number,
    multiplier: IncentiveMultiplier,
    tier?: StabilityRewardTier
  ): number {
    const tierBoost = tier?.baseYieldBoost ?? 0;
    return baseYieldPercent * multiplier.effective + tierBoost;
  }

  getMultiplierHistory(limit?: number): IncentiveMultiplier[] {
    const sorted = [...this.multiplierHistory].sort(
      (a, b) => b.computedAt.getTime() - a.computedAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createStabilityLinkedIncentiveSystem(
  tiers?: StabilityRewardTier[]
): DefaultStabilityLinkedIncentiveSystem {
  return new DefaultStabilityLinkedIncentiveSystem(tiers);
}
