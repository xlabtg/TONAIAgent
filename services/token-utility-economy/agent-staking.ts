/**
 * TONAIAgent - Agent Staking & Reputation
 *
 * Manages developer staking requirements for agent publication.
 * Higher stake = higher trust and visibility. Includes slashing
 * for poor performance to ensure quality control.
 */

import {
  AgentPublicationStake,
  AgentTrustTier,
  AgentTrustTierConfig,
  AgentSlashRecord,
  AgentSlashReason,
  AgentPublicationRequest,
  AgentStakingHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_TRUST_TIER_CONFIGS: Record<AgentTrustTier, AgentTrustTierConfig> = {
  unverified: {
    tier: 'unverified',
    minStake: '0',
    trustBonus: 0,
    features: ['basic_listing'],
    slashProtection: 0,
  },
  verified: {
    tier: 'verified',
    minStake: '1000000000000',         // 1,000 tokens
    trustBonus: 0.10,
    features: ['basic_listing', 'verified_badge', 'analytics_basic'],
    slashProtection: 0.05,
  },
  trusted: {
    tier: 'trusted',
    minStake: '10000000000000',        // 10,000 tokens
    trustBonus: 0.25,
    features: ['basic_listing', 'verified_badge', 'analytics_advanced', 'featured_placement'],
    slashProtection: 0.10,
  },
  certified: {
    tier: 'certified',
    minStake: '50000000000000',        // 50,000 tokens
    trustBonus: 0.50,
    features: ['all_listings', 'certified_badge', 'analytics_full', 'featured_placement', 'institutional_visibility'],
    slashProtection: 0.20,
  },
  elite: {
    tier: 'elite',
    minStake: '200000000000000',       // 200,000 tokens
    trustBonus: 1.0,
    features: ['all_listings', 'elite_badge', 'analytics_full', 'top_placement', 'institutional_visibility', 'co_investment_access'],
    slashProtection: 0.30,
  },
};

const SLASH_AMOUNTS: Record<AgentSlashReason, Record<string, number>> = {
  poor_performance: { minor: 0.02, moderate: 0.05, severe: 0.10, critical: 0.20 },
  malicious_behavior: { minor: 0.10, moderate: 0.25, severe: 0.50, critical: 1.00 },
  false_reporting: { minor: 0.05, moderate: 0.15, severe: 0.30, critical: 0.50 },
  protocol_violation: { minor: 0.05, moderate: 0.10, severe: 0.20, critical: 0.40 },
  inactivity: { minor: 0.02, moderate: 0.05, severe: 0.08, critical: 0.10 },
  collusion: { minor: 0.15, moderate: 0.30, severe: 0.60, critical: 1.00 },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface AgentStakingConfig {
  slashingEnabled?: boolean;
  minSlashableStake?: string;
  appealPeriodDays?: number;
  performanceEvaluationDays?: number;
}

export interface SlashAgentRequest {
  agentId: string;
  reason: AgentSlashReason;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  evidence: string[];
  executedBy: string;
}

export interface AgentStakingModule {
  readonly trustTierConfigs: Record<AgentTrustTier, AgentTrustTierConfig>;

  publishWithStake(request: AgentPublicationRequest): AgentPublicationStake;
  getAgentStake(agentId: string): AgentPublicationStake | null;
  getTrustTierForStake(stakedAmount: string): AgentTrustTier;
  updateAgentPerformance(agentId: string, performanceScore: number): AgentPublicationStake | null;
  slashAgent(request: SlashAgentRequest): AgentSlashRecord;
  getSlashHistory(agentId: string): AgentSlashRecord[];
  withdrawStake(agentId: string): { success: boolean; amount: string; reason?: string };
  getHealth(): AgentStakingHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAgentStakingModule implements AgentStakingModule {
  readonly trustTierConfigs: Record<AgentTrustTier, AgentTrustTierConfig>;

  private readonly stakes: Map<string, AgentPublicationStake> = new Map();
  private readonly slashHistory: Map<string, AgentSlashRecord[]> = new Map();
  private readonly config: Required<AgentStakingConfig>;
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: AgentStakingConfig = {}) {
    this.config = {
      slashingEnabled: config.slashingEnabled ?? true,
      minSlashableStake: config.minSlashableStake ?? '1000000000000',
      appealPeriodDays: config.appealPeriodDays ?? 7,
      performanceEvaluationDays: config.performanceEvaluationDays ?? 30,
    };
    this.trustTierConfigs = { ...DEFAULT_TRUST_TIER_CONFIGS };
  }

  publishWithStake(request: AgentPublicationRequest): AgentPublicationStake {
    const tier = this.getTrustTierForStake(request.stakeAmount);
    const tierConfig = this.trustTierConfigs[tier];

    const stake: AgentPublicationStake = {
      id: `stake-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId: request.agentId,
      developerId: request.developerId,
      stakedAmount: request.stakeAmount,
      requiredAmount: tierConfig.minStake,
      trustScore: this.computeTrustScore(request.stakeAmount, tier, []),
      tier,
      slashRisk: 0,
      performanceScore: 50, // Neutral initial score
      slashHistory: [],
      stakedAt: new Date(),
      lastEvaluatedAt: new Date(),
      status: 'active',
    };

    this.stakes.set(request.agentId, stake);
    this.slashHistory.set(request.agentId, []);

    this.emitEvent({
      id: `stake-${Date.now()}`,
      type: 'agent.staked',
      data: {
        agentId: request.agentId,
        developerId: request.developerId,
        amount: request.stakeAmount,
        tier,
        trustScore: stake.trustScore,
      },
      agentId: request.agentId,
      timestamp: new Date(),
    });

    return stake;
  }

  getAgentStake(agentId: string): AgentPublicationStake | null {
    return this.stakes.get(agentId) ?? null;
  }

  getTrustTierForStake(stakedAmount: string): AgentTrustTier {
    const staked = BigInt(stakedAmount);
    const tiers: AgentTrustTier[] = ['elite', 'certified', 'trusted', 'verified', 'unverified'];
    for (const tier of tiers) {
      if (staked >= BigInt(this.trustTierConfigs[tier].minStake)) {
        return tier;
      }
    }
    return 'unverified';
  }

  updateAgentPerformance(agentId: string, performanceScore: number): AgentPublicationStake | null {
    const stake = this.stakes.get(agentId);
    if (!stake) return null;

    const clampedScore = Math.max(0, Math.min(100, performanceScore));
    const slashRisk = clampedScore < 30 ? (30 - clampedScore) / 30 : 0;
    const newStatus = slashRisk >= 0.5 ? 'at_risk' : 'active';

    const updated: AgentPublicationStake = {
      ...stake,
      performanceScore: clampedScore,
      trustScore: this.computeTrustScore(stake.stakedAmount, stake.tier, stake.slashHistory),
      slashRisk,
      status: newStatus,
      lastEvaluatedAt: new Date(),
    };

    this.stakes.set(agentId, updated);

    this.emitEvent({
      id: `trust-${Date.now()}`,
      type: 'agent.trust_updated',
      data: { agentId, performanceScore: clampedScore, trustScore: updated.trustScore, slashRisk },
      agentId,
      timestamp: new Date(),
    });

    return updated;
  }

  slashAgent(request: SlashAgentRequest): AgentSlashRecord {
    const stake = this.stakes.get(request.agentId);
    if (!stake) {
      throw new Error(`Agent ${request.agentId} stake not found`);
    }

    if (!this.config.slashingEnabled) {
      throw new Error('Slashing is disabled');
    }

    const slashPercent = SLASH_AMOUNTS[request.reason]?.[request.severity] ?? 0.05;
    const tierConfig = this.trustTierConfigs[stake.tier];
    const effectiveSlashPercent = slashPercent * (1 - tierConfig.slashProtection);

    const stakedBig = BigInt(stake.stakedAmount);
    const slashAmount = (stakedBig * BigInt(Math.floor(effectiveSlashPercent * 10000))) / BigInt(10000);
    const remainingStake = stakedBig - slashAmount;

    const appealDeadline = new Date();
    appealDeadline.setDate(appealDeadline.getDate() + this.config.appealPeriodDays);

    const slashRecord: AgentSlashRecord = {
      id: `slash-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      agentId: request.agentId,
      reason: request.reason,
      amount: slashAmount.toString(),
      evidence: request.evidence,
      severity: request.severity,
      executedAt: new Date(),
      executedBy: request.executedBy,
      appealDeadline,
      status: 'pending',
    };

    // Update the stake record
    const history = this.slashHistory.get(request.agentId) ?? [];
    history.push(slashRecord);
    this.slashHistory.set(request.agentId, history);

    const newTier = this.getTrustTierForStake(remainingStake.toString());
    const updatedStake: AgentPublicationStake = {
      ...stake,
      stakedAmount: remainingStake.toString(),
      tier: newTier,
      trustScore: this.computeTrustScore(remainingStake.toString(), newTier, history),
      slashHistory: history,
      status: remainingStake <= BigInt(0) ? 'slashed' : 'active',
      lastEvaluatedAt: new Date(),
    };

    this.stakes.set(request.agentId, updatedStake);

    this.emitEvent({
      id: `slash-event-${Date.now()}`,
      type: 'agent.slashed',
      data: {
        agentId: request.agentId,
        reason: request.reason,
        severity: request.severity,
        amount: slashAmount.toString(),
        remainingStake: remainingStake.toString(),
      },
      agentId: request.agentId,
      timestamp: new Date(),
    });

    return slashRecord;
  }

  getSlashHistory(agentId: string): AgentSlashRecord[] {
    return this.slashHistory.get(agentId) ?? [];
  }

  withdrawStake(agentId: string): { success: boolean; amount: string; reason?: string } {
    const stake = this.stakes.get(agentId);
    if (!stake) {
      return { success: false, amount: '0', reason: 'Stake not found' };
    }
    if (stake.status === 'slashed') {
      return { success: false, amount: '0', reason: 'Stake has been fully slashed' };
    }

    const amount = stake.stakedAmount;
    this.stakes.set(agentId, { ...stake, stakedAmount: '0', status: 'withdrawn' });

    return { success: true, amount };
  }

  getHealth(): AgentStakingHealth {
    const stakes = Array.from(this.stakes.values());
    const activeStakes = stakes.filter(s => s.status === 'active' || s.status === 'at_risk');
    const totalStakedValue = activeStakes.reduce(
      (acc, s) => acc + BigInt(s.stakedAmount),
      BigInt(0)
    );
    const avgTrustScore = activeStakes.length > 0
      ? activeStakes.reduce((acc, s) => acc + s.trustScore, 0) / activeStakes.length
      : 100;
    const slashEvents = Array.from(this.slashHistory.values()).flat();
    const recentSlashes = slashEvents.filter(s => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return s.executedAt >= cutoff;
    }).length;
    const slashingRate = activeStakes.length > 0 ? recentSlashes / activeStakes.length : 0;

    const agentsByTier: Record<AgentTrustTier, number> = {
      unverified: 0, verified: 0, trusted: 0, certified: 0, elite: 0,
    };
    for (const s of activeStakes) {
      agentsByTier[s.tier]++;
    }

    return {
      overall: slashingRate > 0.1 ? 'degraded' : 'healthy',
      totalAgentsStaked: activeStakes.length,
      totalStakedValue: totalStakedValue.toString(),
      averageTrustScore: Math.round(avgTrustScore),
      slashingRate,
      agentsByTier,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private computeTrustScore(
    stakedAmount: string,
    tier: AgentTrustTier,
    slashHistory: AgentSlashRecord[]
  ): number {
    const tierConfig = this.trustTierConfigs[tier];
    const baseScore = 40 + tierConfig.trustBonus * 40; // 40-80 from tier

    const slashPenalty = slashHistory.filter(s => s.status !== 'reversed').reduce((acc, s) => {
      const penalty = s.severity === 'critical' ? 20
        : s.severity === 'severe' ? 10
        : s.severity === 'moderate' ? 5 : 2;
      return acc + penalty;
    }, 0);

    const stakeBonus = Math.min(20, Number(BigInt(stakedAmount) / BigInt('10000000000000'))); // Up to 20 pts

    return Math.max(0, Math.min(100, Math.round(baseScore + stakeBonus - slashPenalty)));
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createAgentStakingModule(
  config?: AgentStakingConfig
): DefaultAgentStakingModule {
  return new DefaultAgentStakingModule(config);
}
