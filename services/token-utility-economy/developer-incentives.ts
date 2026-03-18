/**
 * TONAIAgent - Developer Incentive Layer
 *
 * Manages grants, ecosystem fund distributions, growth mining,
 * and agent creation rewards for developers building on the platform.
 */

import {
  DeveloperIncentiveType,
  DeveloperIncentive,
  IncentiveVestingSchedule,
  DeveloperMetrics,
  DeveloperTier,
  DeveloperIncentiveProgramHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_INCENTIVE_AMOUNTS: Record<DeveloperIncentiveType, string> = {
  ecosystem_grant: '50000000000000',         // 50,000 tokens
  growth_mining: '5000000000000',            // 5,000 tokens per milestone
  agent_creation_reward: '2000000000000',    // 2,000 tokens per quality agent
  bug_bounty: '10000000000000',              // 10,000 tokens for critical bugs
  referral_reward: '1000000000000',          // 1,000 tokens per referral
  hackathon_prize: '100000000000000',        // 100,000 tokens for winners
};

const DEFAULT_VESTING: Record<DeveloperIncentiveType, Partial<IncentiveVestingSchedule>> = {
  ecosystem_grant: { cliffDays: 90, vestingDays: 365, immediatePercent: 0.10 },
  growth_mining: { cliffDays: 0, vestingDays: 90, immediatePercent: 0.25 },
  agent_creation_reward: { cliffDays: 30, vestingDays: 180, immediatePercent: 0.20 },
  bug_bounty: { cliffDays: 0, vestingDays: 30, immediatePercent: 0.50 },
  referral_reward: { cliffDays: 7, vestingDays: 90, immediatePercent: 0.30 },
  hackathon_prize: { cliffDays: 30, vestingDays: 180, immediatePercent: 0.25 },
};

const TIER_THRESHOLDS: Record<DeveloperTier, { minAgents: number; minAum: bigint; minReputation: number }> = {
  newcomer: { minAgents: 0, minAum: BigInt(0), minReputation: 0 },
  contributor: { minAgents: 1, minAum: BigInt('1000000000000'), minReputation: 30 },
  builder: { minAgents: 5, minAum: BigInt('10000000000000'), minReputation: 50 },
  expert: { minAgents: 15, minAum: BigInt('100000000000000'), minReputation: 70 },
  core: { minAgents: 30, minAum: BigInt('1000000000000000'), minReputation: 85 },
};

const PROGRAM_BUDGET = BigInt('10000000000000000'); // 10M tokens program budget

// ============================================================================
// Interfaces
// ============================================================================

export interface DeveloperIncentivesConfig {
  incentiveAmounts?: Partial<Record<DeveloperIncentiveType, string>>;
  programBudget?: string;
}

export interface AwardIncentiveRequest {
  developerId: string;
  type: DeveloperIncentiveType;
  criteria: string[];
  customAmount?: string;
  metadata?: Record<string, unknown>;
}

export interface DeveloperIncentivesModule {
  registerDeveloper(developerId: string, joinedAt?: Date): DeveloperMetrics;
  getDeveloperMetrics(developerId: string): DeveloperMetrics | null;
  updateDeveloperMetrics(
    developerId: string,
    update: Partial<Pick<DeveloperMetrics, 'agentsPublished' | 'activeAgents' | 'totalAum' | 'totalUsersServed' | 'revenueGenerated' | 'reputationScore'>>
  ): DeveloperMetrics | null;
  awardIncentive(request: AwardIncentiveRequest): DeveloperIncentive;
  claimIncentive(incentiveId: string): { success: boolean; amount: string; reason?: string };
  getIncentives(developerId: string): DeveloperIncentive[];
  computeDeveloperTier(metrics: DeveloperMetrics): DeveloperTier;
  getHealth(): DeveloperIncentiveProgramHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultDeveloperIncentivesModule implements DeveloperIncentivesModule {
  private readonly developerMetrics: Map<string, DeveloperMetrics> = new Map();
  private readonly incentives: Map<string, DeveloperIncentive> = new Map();
  private readonly developerIncentives: Map<string, string[]> = new Map(); // developerId -> incentiveIds
  private totalDistributed: bigint = BigInt(0);
  private totalPending: bigint = BigInt(0);
  private readonly programBudget: bigint;
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];
  private readonly config: Required<DeveloperIncentivesConfig>;

  constructor(config: DeveloperIncentivesConfig = {}) {
    this.config = {
      incentiveAmounts: { ...DEFAULT_INCENTIVE_AMOUNTS, ...(config.incentiveAmounts ?? {}) },
      programBudget: config.programBudget ?? PROGRAM_BUDGET.toString(),
    };
    this.programBudget = BigInt(this.config.programBudget);
  }

  registerDeveloper(developerId: string, joinedAt: Date = new Date()): DeveloperMetrics {
    const metrics: DeveloperMetrics = {
      developerId,
      agentsPublished: 0,
      activeAgents: 0,
      totalAum: '0',
      totalUsersServed: 0,
      revenueGenerated: '0',
      reputationScore: 0,
      incentivesEarned: '0',
      incentivesPending: '0',
      tier: 'newcomer',
      joinedAt,
    };
    this.developerMetrics.set(developerId, metrics);
    this.developerIncentives.set(developerId, []);
    return metrics;
  }

  getDeveloperMetrics(developerId: string): DeveloperMetrics | null {
    return this.developerMetrics.get(developerId) ?? null;
  }

  updateDeveloperMetrics(
    developerId: string,
    update: Partial<Pick<DeveloperMetrics, 'agentsPublished' | 'activeAgents' | 'totalAum' | 'totalUsersServed' | 'revenueGenerated' | 'reputationScore'>>
  ): DeveloperMetrics | null {
    const metrics = this.developerMetrics.get(developerId);
    if (!metrics) return null;

    const updated: DeveloperMetrics = {
      ...metrics,
      ...update,
    };
    updated.tier = this.computeDeveloperTier(updated);
    this.developerMetrics.set(developerId, updated);
    return updated;
  }

  awardIncentive(request: AwardIncentiveRequest): DeveloperIncentive {
    const baseAmount = this.config.incentiveAmounts[request.type] ?? DEFAULT_INCENTIVE_AMOUNTS[request.type];
    const amount = request.customAmount ?? baseAmount;
    const vestingDefaults = DEFAULT_VESTING[request.type];

    const cliffDays = vestingDefaults.cliffDays ?? 0;
    const vestingDays = vestingDefaults.vestingDays ?? 90;
    const immediatePercent = vestingDefaults.immediatePercent ?? 0.25;

    const totalAmount = BigInt(amount);
    const immediateAmount = (totalAmount * BigInt(Math.floor(immediatePercent * 10000))) / BigInt(10000);
    const vestingAmount = totalAmount - immediateAmount;

    const claimableAt = new Date();
    claimableAt.setDate(claimableAt.getDate() + cliffDays);

    const vestingSchedule: IncentiveVestingSchedule = {
      totalAmount: amount,
      cliffDays,
      vestingDays,
      immediatePercent,
      vestedAmount: immediateAmount.toString(),
      claimedAmount: '0',
      nextVestingDate: cliffDays > 0 ? claimableAt : new Date(),
      nextVestingAmount: (vestingAmount / BigInt(Math.max(1, vestingDays))).toString(),
    };

    const incentive: DeveloperIncentive = {
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      developerId: request.developerId,
      type: request.type,
      amount,
      vestingSchedule,
      criteria: request.criteria,
      status: cliffDays > 0 ? 'active' : 'vesting',
      awardedAt: new Date(),
      claimableAt,
      metadata: request.metadata,
    };

    this.incentives.set(incentive.id, incentive);
    const devIncentives = this.developerIncentives.get(request.developerId) ?? [];
    devIncentives.push(incentive.id);
    this.developerIncentives.set(request.developerId, devIncentives);

    this.totalPending += totalAmount;

    // Update developer metrics
    const metrics = this.developerMetrics.get(request.developerId);
    if (metrics) {
      const updatedEarned = (BigInt(metrics.incentivesEarned) + totalAmount).toString();
      const updatedPending = (BigInt(metrics.incentivesPending) + totalAmount).toString();
      this.developerMetrics.set(request.developerId, { ...metrics, incentivesEarned: updatedEarned, incentivesPending: updatedPending });
    }

    this.emitEvent({
      id: incentive.id,
      type: 'incentive.awarded',
      data: { developerId: request.developerId, type: request.type, amount, criteria: request.criteria },
      userId: request.developerId,
      timestamp: new Date(),
    });

    return incentive;
  }

  claimIncentive(incentiveId: string): { success: boolean; amount: string; reason?: string } {
    const incentive = this.incentives.get(incentiveId);
    if (!incentive) {
      return { success: false, amount: '0', reason: 'Incentive not found' };
    }
    if (incentive.status === 'claimed' || incentive.status === 'expired') {
      return { success: false, amount: '0', reason: `Incentive is ${incentive.status}` };
    }

    const now = new Date();
    if (incentive.claimableAt && now < incentive.claimableAt) {
      return { success: false, amount: '0', reason: 'Incentive is not yet claimable (cliff not reached)' };
    }

    const vesting = incentive.vestingSchedule;
    if (!vesting) {
      return { success: false, amount: '0', reason: 'No vesting schedule' };
    }

    const claimable = (BigInt(vesting.vestedAmount) - BigInt(vesting.claimedAmount)).toString();
    if (BigInt(claimable) === BigInt(0)) {
      return { success: false, amount: '0', reason: 'No tokens available to claim' };
    }

    // Update vesting record
    const updatedVesting: IncentiveVestingSchedule = {
      ...vesting,
      claimedAmount: vesting.vestedAmount, // Claim all vested
    };

    const allClaimed = BigInt(updatedVesting.claimedAmount) >= BigInt(vesting.totalAmount);
    const updatedIncentive: DeveloperIncentive = {
      ...incentive,
      status: allClaimed ? 'claimed' : 'vesting',
      vestingSchedule: updatedVesting,
    };
    this.incentives.set(incentiveId, updatedIncentive);

    const claimedAmount = BigInt(claimable);
    this.totalDistributed += claimedAmount;
    this.totalPending = this.totalPending > claimedAmount ? this.totalPending - claimedAmount : BigInt(0);

    // Update developer metrics
    const metrics = this.developerMetrics.get(incentive.developerId);
    if (metrics) {
      const updatedPending = (BigInt(metrics.incentivesPending) - claimedAmount).toString();
      this.developerMetrics.set(incentive.developerId, { ...metrics, incentivesPending: updatedPending });
    }

    this.emitEvent({
      id: `claim-${Date.now()}`,
      type: 'incentive.claimed',
      data: { incentiveId, developerId: incentive.developerId, amount: claimable },
      userId: incentive.developerId,
      timestamp: new Date(),
    });

    return { success: true, amount: claimable };
  }

  getIncentives(developerId: string): DeveloperIncentive[] {
    const ids = this.developerIncentives.get(developerId) ?? [];
    return ids.map(id => this.incentives.get(id)).filter(Boolean) as DeveloperIncentive[];
  }

  computeDeveloperTier(metrics: DeveloperMetrics): DeveloperTier {
    const aum = BigInt(metrics.totalAum);
    const tiers: DeveloperTier[] = ['core', 'expert', 'builder', 'contributor', 'newcomer'];
    for (const tier of tiers) {
      const thresholds = TIER_THRESHOLDS[tier];
      if (
        metrics.agentsPublished >= thresholds.minAgents &&
        aum >= thresholds.minAum &&
        metrics.reputationScore >= thresholds.minReputation
      ) {
        return tier;
      }
    }
    return 'newcomer';
  }

  getHealth(): DeveloperIncentiveProgramHealth {
    const allMetrics = Array.from(this.developerMetrics.values());
    const activeDevelopers = allMetrics.filter(m => m.agentsPublished > 0).length;

    const totalIncentivesDistributed = this.totalDistributed;
    const pendingIncentives = this.totalPending;

    const avgIncentive = activeDevelopers > 0
      ? totalIncentivesDistributed / BigInt(activeDevelopers)
      : BigInt(0);

    const budgetRemaining = this.programBudget - totalIncentivesDistributed - pendingIncentives;

    const developersByTier: Record<DeveloperTier, number> = {
      newcomer: 0, contributor: 0, builder: 0, expert: 0, core: 0,
    };
    for (const m of allMetrics) {
      developersByTier[m.tier]++;
    }

    return {
      overall: budgetRemaining > BigInt(0) ? 'healthy' : 'critical',
      activeDevelopers,
      totalIncentivesDistributed: totalIncentivesDistributed.toString(),
      pendingIncentives: pendingIncentives.toString(),
      averageIncentivePerDeveloper: avgIncentive.toString(),
      programBudgetRemaining: (budgetRemaining < BigInt(0) ? BigInt(0) : budgetRemaining).toString(),
      developersByTier,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createDeveloperIncentivesModule(
  config?: DeveloperIncentivesConfig
): DefaultDeveloperIncentivesModule {
  return new DefaultDeveloperIncentivesModule(config);
}
