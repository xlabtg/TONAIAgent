/**
 * TONAIAgent - AI Monetary Policy Engine (Issue #123)
 *
 * Continuously analyzes protocol-wide signals and generates monetary policy
 * recommendations: emission adjustments, staking yield changes, treasury
 * reallocations, and risk-weight updates.
 *
 * Inputs: Stability Index, Liquidity Depth, Clearing Exposure, Market Volatility,
 *         Protocol Growth Metrics
 * Outputs: Emission Adjustments, Staking Yield Changes, Treasury Reallocation,
 *          Risk-Weight Adjustments
 */

import type {
  MonetaryPolicyInputs,
  MonetaryPolicyOutputs,
  EmissionAdjustment,
  EmissionMechanism,
  StakingYieldChange,
  TierYieldAdjustment,
  TreasuryReallocationPlan,
  RiskWeightAdjustment,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface AiMonetaryPolicyEngine {
  // Core analysis
  analyze(inputs: MonetaryPolicyInputs): MonetaryPolicyOutputs;

  // History
  getLatestRecommendation(): MonetaryPolicyOutputs | undefined;
  getRecommendationHistory(limit?: number): MonetaryPolicyOutputs[];

  // Governance integration
  markApproved(recommendationId: string, approvedBy: string): void;
  markRejected(recommendationId: string, rejectedBy: string, reason: string): void;

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAiMonetaryPolicyEngine implements AiMonetaryPolicyEngine {
  private readonly recommendations: MonetaryPolicyOutputs[] = [];
  private readonly approvals = new Map<string, { by: string; at: Date }>();
  private readonly rejections = new Map<string, { by: string; reason: string; at: Date }>();
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];
  private idCounter = 0;

  private nextId(): string {
    return `mp-rec-${++this.idCounter}-${Date.now()}`;
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  // ---------------------------------------------------------------
  // Core analysis helpers
  // ---------------------------------------------------------------

  private computeEmissionAdjustment(inputs: MonetaryPolicyInputs): EmissionAdjustment {
    const {
      stabilityIndex,
      liquidityDepth,
      marketVolatility,
      protocolGrowthRate,
      currentEmissionRate,
    } = inputs;

    let mechanism: EmissionMechanism;
    let direction: 'increase' | 'decrease' | 'maintain';
    let adjustmentPercent: number;
    let rationale: string;
    let burnAmount: number | undefined;

    // High volatility → stress phase → deflation (highest priority)
    if (marketVolatility > 0.7) {
      mechanism = 'deflation';
      direction = 'decrease';
      adjustmentPercent = -Math.min(30, marketVolatility * 40);
      rationale = `High market volatility (${(marketVolatility * 100).toFixed(1)}%) triggers deflationary adjustment to stabilize token price.`;
    }
    // Liquidity gap → boost incentives (second priority: critical gaps addressed first)
    else if (liquidityDepth < 30) {
      mechanism = 'incentive_boost';
      direction = 'increase';
      adjustmentPercent = Math.min(25, (30 - liquidityDepth) * 0.8);
      rationale = `Low liquidity depth (${liquidityDepth.toFixed(1)}) requires incentive boost emission to attract liquidity providers.`;
    }
    // High profitability + very high stability → burn (peak conditions: deflationary mechanism)
    else if (stabilityIndex > 80 && protocolGrowthRate > 0.5) {
      mechanism = 'burn';
      direction = 'decrease';
      adjustmentPercent = -10;
      burnAmount = currentEmissionRate * 0.1;
      rationale = `High protocol profitability and stability enables token burn to reduce supply and increase token value.`;
    }
    // Strong growth + high stability → growth phase → inflation
    else if (protocolGrowthRate > 0.3 && stabilityIndex > 70) {
      mechanism = 'inflation';
      direction = 'increase';
      adjustmentPercent = Math.min(20, protocolGrowthRate * 30);
      rationale = `Strong protocol growth (${(protocolGrowthRate * 100).toFixed(1)}% annualized) with high stability supports inflationary emission to incentivize participation.`;
    }
    // Otherwise stable
    else {
      mechanism = 'stable';
      direction = 'maintain';
      adjustmentPercent = 0;
      rationale = `Protocol metrics within normal ranges. Maintaining current emission rate for stability.`;
    }

    const recommendedRate = currentEmissionRate * (1 + adjustmentPercent / 100);

    return {
      currentRate: currentEmissionRate,
      recommendedRate: Math.max(0, recommendedRate),
      adjustmentPercent,
      direction,
      mechanism,
      burnAmount,
      rationale,
    };
  }

  private computeStakingYieldChange(inputs: MonetaryPolicyInputs): StakingYieldChange {
    const { stabilityIndex, stakingParticipation, protocolGrowthRate } = inputs;

    // Base yield target: 8-20% APY depending on conditions
    const baseYield = 8;
    const maxYield = 20;
    const currentYield = baseYield + (stabilityIndex / 100) * (maxYield - baseYield);

    // Adjust for participation: low participation → higher yield to attract stakers
    const participationFactor = stakingParticipation < 0.3 ? 1.2 : stakingParticipation > 0.7 ? 0.9 : 1.0;
    const growthFactor = 1 + Math.min(0.3, protocolGrowthRate * 0.2);

    const recommendedYield = Math.min(maxYield, currentYield * participationFactor * growthFactor);
    const changePercent = ((recommendedYield - currentYield) / currentYield) * 100;

    const tiers: Array<'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'> = [
      'bronze', 'silver', 'gold', 'platinum', 'diamond',
    ];
    const tierMultipliers = [1.0, 1.2, 1.5, 1.8, 2.2];

    const tierAdjustments: TierYieldAdjustment[] = tiers.map((tier, i) => ({
      tier,
      currentYield: currentYield * tierMultipliers[i],
      recommendedYield: recommendedYield * tierMultipliers[i],
    }));

    return {
      currentYieldPercent: currentYield,
      recommendedYieldPercent: recommendedYield,
      changePercent,
      tierAdjustments,
      effectiveDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      rationale: `Staking participation at ${(stakingParticipation * 100).toFixed(1)}% with stability index ${stabilityIndex.toFixed(1)}. Yield adjusted to ${recommendedYield.toFixed(2)}% APY.`,
    };
  }

  private computeTreasuryReallocation(inputs: MonetaryPolicyInputs): TreasuryReallocationPlan {
    const { liquidityDepth, stabilityIndex, clearingExposure, treasuryValueTon } = inputs;
    const actions = [];
    let totalReallocated = 0;

    // If liquidity is low, move from strategic to liquidity buffer
    if (liquidityDepth < 40) {
      const amount = treasuryValueTon * 0.05;
      actions.push({
        fromCategory: 'strategic_capital' as const,
        toCategory: 'liquidity_buffer' as const,
        amount,
        reason: `Low liquidity depth (${liquidityDepth.toFixed(1)}) — reinforcing liquidity buffer`,
        priority: 'high' as const,
      });
      totalReallocated += amount;
    }

    // High clearing exposure → reinforce insurance fund
    if (clearingExposure > 0.6) {
      const amount = treasuryValueTon * 0.03;
      actions.push({
        fromCategory: 'protocol_reserves' as const,
        toCategory: 'insurance_fund' as const,
        amount,
        reason: `High clearing exposure (${(clearingExposure * 100).toFixed(1)}%) — strengthening insurance fund`,
        priority: 'high' as const,
      });
      totalReallocated += amount;
    }

    // High stability → move idle buffer to strategic capital
    if (stabilityIndex > 85 && liquidityDepth > 70) {
      const amount = treasuryValueTon * 0.02;
      actions.push({
        fromCategory: 'liquidity_buffer' as const,
        toCategory: 'strategic_capital' as const,
        amount,
        reason: `High stability (${stabilityIndex.toFixed(1)}) and deep liquidity — deploying idle buffer to strategic capital`,
        priority: 'low' as const,
      });
      totalReallocated += amount;
    }

    return {
      id: `realloc-${Date.now()}`,
      actions,
      totalReallocated,
      expectedYieldImprovement: actions.length * 0.5,
      expectedRiskReduction: actions.length * 2,
      rationale:
        actions.length > 0
          ? `${actions.length} reallocation(s) recommended based on current market conditions.`
          : 'No treasury reallocation required — current allocation is optimal.',
    };
  }

  private computeRiskWeightAdjustments(inputs: MonetaryPolicyInputs): RiskWeightAdjustment[] {
    const { marketVolatility, stabilityIndex, clearingExposure } = inputs;
    const adjustments: RiskWeightAdjustment[] = [];

    // High volatility → increase weight on high-risk strategies
    if (marketVolatility > 0.6) {
      adjustments.push({
        targetId: 'high_risk_strategies',
        targetType: 'strategy',
        targetName: 'High Risk Strategies',
        currentWeight: 0.3,
        recommendedWeight: Math.min(0.5, 0.3 + marketVolatility * 0.2),
        adjustmentReason: `Elevated market volatility requires higher risk weighting for exposure management`,
      });
    }

    // Low stability → increase weight on protocol-level risk
    if (stabilityIndex < 50) {
      adjustments.push({
        targetId: 'protocol_risk',
        targetType: 'protocol',
        targetName: 'Protocol Risk',
        currentWeight: 0.15,
        recommendedWeight: Math.min(0.35, 0.15 + (50 - stabilityIndex) / 100),
        adjustmentReason: `Low stability index (${stabilityIndex.toFixed(1)}) warrants increased protocol risk weighting`,
      });
    }

    // High clearing exposure → reduce clearing settlement risk weight
    if (clearingExposure > 0.5) {
      adjustments.push({
        targetId: 'clearing_settlement',
        targetType: 'protocol',
        targetName: 'Clearing & Settlement',
        currentWeight: 0.1,
        recommendedWeight: Math.min(0.25, 0.1 + clearingExposure * 0.15),
        adjustmentReason: `Elevated clearing exposure (${(clearingExposure * 100).toFixed(1)}%) requires risk weight adjustment`,
      });
    }

    return adjustments;
  }

  private assessConfidence(inputs: MonetaryPolicyInputs): number {
    // Higher confidence when multiple signals agree
    let confidence = 0.7; // base
    const { stabilityIndex, liquidityDepth, marketVolatility } = inputs;

    if (stabilityIndex > 70 && liquidityDepth > 60 && marketVolatility < 0.4) {
      confidence += 0.2; // Strong consensus → high confidence
    } else if (marketVolatility > 0.8) {
      confidence -= 0.2; // Extreme volatility → lower confidence
    }
    return Math.min(1, Math.max(0, confidence));
  }

  private requiresGovernanceApproval(
    emissionAdj: EmissionAdjustment,
    treasuryRealloc: TreasuryReallocationPlan
  ): boolean {
    // Governance required for large emission changes or large reallocations
    return (
      Math.abs(emissionAdj.adjustmentPercent) > 15 ||
      emissionAdj.mechanism === 'burn' ||
      treasuryRealloc.totalReallocated > 0
    );
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  analyze(inputs: MonetaryPolicyInputs): MonetaryPolicyOutputs {
    const emissionAdjustment = this.computeEmissionAdjustment(inputs);
    const stakingYieldChange = this.computeStakingYieldChange(inputs);
    const treasuryReallocation = this.computeTreasuryReallocation(inputs);
    const riskWeightAdjustments = this.computeRiskWeightAdjustments(inputs);

    const confidence = this.assessConfidence(inputs);
    const requiresGovernanceApproval = this.requiresGovernanceApproval(
      emissionAdjustment,
      treasuryReallocation
    );

    const output: MonetaryPolicyOutputs = {
      id: this.nextId(),
      inputs,
      emissionAdjustment,
      stakingYieldChange,
      treasuryReallocation,
      riskWeightAdjustments,
      policyRationale: [
        emissionAdjustment.rationale,
        stakingYieldChange.rationale,
        treasuryReallocation.rationale,
      ].join(' | '),
      confidence,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      requiresGovernanceApproval,
    };

    this.recommendations.push(output);

    this.emit('policy.recommendation_generated', {
      recommendationId: output.id,
      emissionDirection: emissionAdjustment.direction,
      emissionMechanism: emissionAdjustment.mechanism,
      confidence,
      requiresGovernanceApproval,
    });

    return output;
  }

  getLatestRecommendation(): MonetaryPolicyOutputs | undefined {
    return this.recommendations[this.recommendations.length - 1];
  }

  getRecommendationHistory(limit?: number): MonetaryPolicyOutputs[] {
    const sorted = [...this.recommendations].sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  markApproved(recommendationId: string, approvedBy: string): void {
    this.approvals.set(recommendationId, { by: approvedBy, at: new Date() });
    this.emit('governance.proposal_executed', {
      recommendationId,
      approvedBy,
      action: 'approved',
    });
  }

  markRejected(recommendationId: string, rejectedBy: string, reason: string): void {
    this.rejections.set(recommendationId, { by: rejectedBy, reason, at: new Date() });
    this.emit('governance.proposal_executed', {
      recommendationId,
      rejectedBy,
      reason,
      action: 'rejected',
    });
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createAiMonetaryPolicyEngine(): DefaultAiMonetaryPolicyEngine {
  return new DefaultAiMonetaryPolicyEngine();
}
