/**
 * TONAIAgent - Staking Module
 *
 * Manages token staking, unstaking, rewards, and agent collateral requirements.
 * Supports multiple lock periods, auto-compounding, and slashing mechanisms.
 */

import {
  StakingConfig,
  StakeRequest,
  StakePosition,
  StakingPosition,
  UnstakeRequest,
  UnstakeResult,
  ClaimRewardsResult,
  RewardBreakdown,
  RewardsCalculation,
  AgentStakeRequirements,
  AgentStakeStatus,
  SlashEvent,
  SlashConditionType,
  TokenTier,
  TokenomicsEvent,
  TokenomicsEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_STAKING_CONFIG: StakingConfig = {
  enabled: true,
  minStakeAmount: '100000000000', // 100 tokens with 9 decimals
  maxStakeAmount: '10000000000000000000', // 10 billion
  lockPeriods: [7, 30, 90, 365], // days
  rewardRates: [0.05, 0.08, 0.12, 0.20], // APY for each lock period
  slashingEnabled: true,
  compoundingEnabled: true,
  cooldownPeriod: 86400, // 24 hours in seconds
};

// Agent staking requirements by type
const AGENT_REQUIREMENTS: Record<string, AgentStakeRequirements> = {
  trading: {
    minStake: '1000000000000', // 1000 tokens
    requiredDuration: 30,
    slashable: true,
    requiredTier: 'silver',
  },
  strategy_deployment: {
    minStake: '5000000000000', // 5000 tokens
    requiredDuration: 90,
    slashable: true,
    requiredTier: 'gold',
  },
  liquidity_provision: {
    minStake: '10000000000000', // 10000 tokens
    requiredDuration: 90,
    slashable: true,
    requiredTier: 'gold',
  },
  governance: {
    minStake: '10000000000000', // 10000 tokens
    requiredDuration: 30,
    slashable: false,
    requiredTier: 'gold',
  },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface StakingModule {
  readonly config: StakingConfig;

  // Core staking operations
  stake(request: StakeRequest): Promise<StakePosition>;
  unstake(request: UnstakeRequest): Promise<UnstakeResult>;
  getPosition(userId: string): Promise<StakingPosition>;
  getStake(stakeId: string): Promise<StakePosition | null>;

  // Rewards
  claimRewards(userId: string): Promise<ClaimRewardsResult>;
  calculateRewards(params: RewardsCalculationParams): RewardsCalculation;
  compoundRewards(userId: string): Promise<ClaimRewardsResult>;

  // Agent staking
  stakeForAgent(request: AgentStakeRequest): Promise<StakePosition>;
  getAgentRequirements(agentType: string): AgentStakeRequirements;
  getAgentStakeStatus(agentId: string): Promise<AgentStakeStatus>;

  // Slashing
  executeSlash(request: SlashRequest): Promise<SlashEvent>;
  getSlashHistory(targetId: string): Promise<SlashEvent[]>;

  // Utilities
  getRewardRate(lockPeriod: number): number;
  estimateRewards(amount: string, lockPeriod: number, duration: number): string;
  getTierFromStake(amount: string): TokenTier;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

export interface RewardsCalculationParams {
  amount: string;
  lockPeriod: number;
  duration: number; // days staked so far
  autoCompound?: boolean;
}

export interface AgentStakeRequest extends StakeRequest {
  agentId: string;
  agentType: string;
}

export interface SlashRequest {
  targetId: string;
  targetType: 'user' | 'agent';
  condition: SlashConditionType;
  amount: string;
  evidence: string[];
  executedBy: string;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultStakingModule implements StakingModule {
  readonly config: StakingConfig;
  private readonly stakes: Map<string, StakePosition> = new Map();
  private readonly userStakes: Map<string, Set<string>> = new Map();
  private readonly agentStakes: Map<string, string> = new Map(); // agentId -> stakeId
  private readonly slashHistory: Map<string, SlashEvent[]> = new Map();
  private readonly eventCallbacks: TokenomicsEventCallback[] = [];

  constructor(config: Partial<StakingConfig> = {}) {
    this.config = { ...DEFAULT_STAKING_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Core Staking Operations
  // --------------------------------------------------------------------------

  async stake(request: StakeRequest): Promise<StakePosition> {
    // Validate request
    this.validateStakeRequest(request);

    // Create stake position
    const stakeId = `stake_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const unlockDate = new Date(now.getTime() + request.lockPeriod * 24 * 60 * 60 * 1000);

    const position: StakePosition = {
      id: stakeId,
      userId: request.userId,
      agentId: request.agentId,
      amount: request.amount,
      lockPeriod: request.lockPeriod,
      lockStartDate: now,
      unlockDate,
      rewardRate: this.getRewardRate(request.lockPeriod),
      expectedApy: this.getRewardRate(request.lockPeriod) * 100,
      autoCompound: request.autoCompound ?? false,
      purpose: request.purpose ?? 'general',
      pendingRewards: '0',
      claimedRewards: '0',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // Store stake
    this.stakes.set(stakeId, position);

    // Update user stakes index
    if (!this.userStakes.has(request.userId)) {
      this.userStakes.set(request.userId, new Set());
    }
    this.userStakes.get(request.userId)!.add(stakeId);

    // Emit event
    this.emitEvent({
      type: 'stake_created',
      category: 'staking',
      data: {
        stakeId,
        userId: request.userId,
        amount: request.amount,
        lockPeriod: request.lockPeriod,
        unlockDate: unlockDate.toISOString(),
      },
      userId: request.userId,
      agentId: request.agentId,
    });

    return position;
  }

  private validateStakeRequest(request: StakeRequest): void {
    const amount = BigInt(request.amount);

    if (amount < BigInt(this.config.minStakeAmount)) {
      throw new Error(`Minimum stake amount is ${this.config.minStakeAmount}`);
    }

    if (amount > BigInt(this.config.maxStakeAmount)) {
      throw new Error(`Maximum stake amount is ${this.config.maxStakeAmount}`);
    }

    if (!this.config.lockPeriods.includes(request.lockPeriod)) {
      throw new Error(`Invalid lock period. Valid periods: ${this.config.lockPeriods.join(', ')} days`);
    }
  }

  async unstake(request: UnstakeRequest): Promise<UnstakeResult> {
    const stake = this.stakes.get(request.stakeId);

    if (!stake) {
      return {
        success: false,
        stakeId: request.stakeId,
        amount: '0',
        penaltyAmount: '0',
        netAmount: '0',
        reason: 'Stake not found',
      };
    }

    if (stake.userId !== request.userId) {
      return {
        success: false,
        stakeId: request.stakeId,
        amount: '0',
        penaltyAmount: '0',
        netAmount: '0',
        reason: 'Unauthorized',
      };
    }

    const now = new Date();
    const isLocked = now < stake.unlockDate;
    const amount = BigInt(request.amount ?? stake.amount);

    // Calculate penalty for early unstake
    let penaltyAmount = BigInt(0);
    if (isLocked) {
      // Early unstake penalty: 10% + proportional to remaining lock time
      const totalLockTime = stake.unlockDate.getTime() - stake.lockStartDate.getTime();
      const remainingTime = stake.unlockDate.getTime() - now.getTime();
      const remainingRatio = remainingTime / totalLockTime;

      // Base 10% + up to 20% based on remaining time
      const penaltyRate = 0.10 + (0.20 * remainingRatio);
      penaltyAmount = (amount * BigInt(Math.floor(penaltyRate * 1000))) / BigInt(1000);
    }

    const netAmount = amount - penaltyAmount;

    // Update or remove stake
    if (request.amount && BigInt(request.amount) < BigInt(stake.amount)) {
      // Partial unstake
      stake.amount = (BigInt(stake.amount) - amount).toString();
      stake.updatedAt = now;
    } else {
      // Full unstake
      stake.status = 'withdrawn';
      stake.updatedAt = now;
      this.userStakes.get(request.userId)?.delete(request.stakeId);
    }

    // Calculate cooldown
    const cooldownEndDate = new Date(now.getTime() + this.config.cooldownPeriod * 1000);

    // Emit event
    this.emitEvent({
      type: 'stake_withdrawn',
      category: 'staking',
      data: {
        stakeId: request.stakeId,
        userId: request.userId,
        amount: amount.toString(),
        penaltyAmount: penaltyAmount.toString(),
        netAmount: netAmount.toString(),
        earlyWithdrawal: isLocked,
      },
      userId: request.userId,
    });

    return {
      success: true,
      stakeId: request.stakeId,
      amount: amount.toString(),
      penaltyAmount: penaltyAmount.toString(),
      netAmount: netAmount.toString(),
      cooldownEndDate,
    };
  }

  async getPosition(userId: string): Promise<StakingPosition> {
    const stakeIds = this.userStakes.get(userId) ?? new Set();
    const stakes: StakePosition[] = [];

    let totalStaked = BigInt(0);
    let totalLocked = BigInt(0);
    let availableToUnstake = BigInt(0);
    let pendingRewards = BigInt(0);
    let claimedRewards = BigInt(0);

    const now = new Date();

    for (const stakeId of stakeIds) {
      const stake = this.stakes.get(stakeId);
      if (stake && stake.status === 'active') {
        stakes.push(stake);

        const amount = BigInt(stake.amount);
        totalStaked += amount;

        if (now < stake.unlockDate) {
          totalLocked += amount;
        } else {
          availableToUnstake += amount;
        }

        pendingRewards += BigInt(stake.pendingRewards);
        claimedRewards += BigInt(stake.claimedRewards);
      }
    }

    // Calculate voting power (simplified)
    const votingPower = totalStaked.toString();

    // Calculate tier
    const tier = this.getTierFromStake(totalStaked.toString());

    return {
      userId,
      totalStaked: totalStaked.toString(),
      totalLocked: totalLocked.toString(),
      availableToUnstake: availableToUnstake.toString(),
      pendingRewards: pendingRewards.toString(),
      claimedRewards: claimedRewards.toString(),
      stakes,
      tier,
      votingPower,
      lastClaimDate: undefined, // Would track in production
    };
  }

  async getStake(stakeId: string): Promise<StakePosition | null> {
    return this.stakes.get(stakeId) ?? null;
  }

  // --------------------------------------------------------------------------
  // Rewards
  // --------------------------------------------------------------------------

  async claimRewards(userId: string): Promise<ClaimRewardsResult> {
    const position = await this.getPosition(userId);

    if (BigInt(position.pendingRewards) === BigInt(0)) {
      return {
        success: false,
        amount: '0',
        rewardBreakdown: this.emptyRewardBreakdown(),
      };
    }

    // Calculate detailed reward breakdown
    const breakdown = await this.calculateRewardBreakdown(userId);

    // Reset pending rewards on all stakes
    for (const stake of position.stakes) {
      stake.claimedRewards = (BigInt(stake.claimedRewards) + BigInt(stake.pendingRewards)).toString();
      stake.pendingRewards = '0';
      stake.updatedAt = new Date();
    }

    // Emit event
    this.emitEvent({
      type: 'rewards_claimed',
      category: 'rewards',
      data: {
        userId,
        amount: position.pendingRewards,
        breakdown,
      },
      userId,
    });

    return {
      success: true,
      amount: position.pendingRewards,
      rewardBreakdown: breakdown,
    };
  }

  private async calculateRewardBreakdown(userId: string): Promise<RewardBreakdown> {
    const position = await this.getPosition(userId);
    const total = BigInt(position.pendingRewards);

    // For now, all rewards are staking rewards
    // In production, this would break down by source
    return {
      stakingRewards: total.toString(),
      performanceRewards: '0',
      referralRewards: '0',
      bonusRewards: '0',
      total: total.toString(),
    };
  }

  private emptyRewardBreakdown(): RewardBreakdown {
    return {
      stakingRewards: '0',
      performanceRewards: '0',
      referralRewards: '0',
      bonusRewards: '0',
      total: '0',
    };
  }

  calculateRewards(params: RewardsCalculationParams): RewardsCalculation {
    const amount = BigInt(params.amount);
    const rewardRate = this.getRewardRate(params.lockPeriod);

    // Calculate daily reward rate
    const dailyRate = rewardRate / 365;

    // Base reward (without compounding)
    const baseReward = (amount * BigInt(Math.floor(dailyRate * params.duration * 1e9))) / BigInt(1e9);

    // Bonus for auto-compound
    let bonusReward = BigInt(0);
    let compoundedReward = BigInt(0);

    if (params.autoCompound && this.config.compoundingEnabled) {
      // Simple compound interest approximation
      const compoundFactor = Math.pow(1 + dailyRate, params.duration);
      compoundedReward = (amount * BigInt(Math.floor((compoundFactor - 1) * 1e9))) / BigInt(1e9);
      bonusReward = compoundedReward - baseReward;
    }

    const totalPending = baseReward + bonusReward;

    // Calculate current APY (effective with compounding)
    const currentApy = params.autoCompound
      ? (Math.pow(1 + dailyRate, 365) - 1) * 100
      : rewardRate * 100;

    // Project annual reward
    const projectedAnnualReward = (amount * BigInt(Math.floor(rewardRate * 1e9))) / BigInt(1e9);

    return {
      baseReward: baseReward.toString(),
      bonusReward: bonusReward.toString(),
      compoundedReward: compoundedReward.toString(),
      totalPending: totalPending.toString(),
      currentApy,
      projectedAnnualReward: projectedAnnualReward.toString(),
    };
  }

  async compoundRewards(userId: string): Promise<ClaimRewardsResult> {
    const position = await this.getPosition(userId);

    if (BigInt(position.pendingRewards) === BigInt(0)) {
      return {
        success: false,
        amount: '0',
        rewardBreakdown: this.emptyRewardBreakdown(),
      };
    }

    // Add pending rewards to stake
    for (const stake of position.stakes) {
      if (stake.autoCompound) {
        stake.amount = (BigInt(stake.amount) + BigInt(stake.pendingRewards)).toString();
        stake.claimedRewards = (BigInt(stake.claimedRewards) + BigInt(stake.pendingRewards)).toString();
        stake.pendingRewards = '0';
        stake.updatedAt = new Date();
      }
    }

    const breakdown = await this.calculateRewardBreakdown(userId);

    return {
      success: true,
      amount: position.pendingRewards,
      rewardBreakdown: breakdown,
    };
  }

  // --------------------------------------------------------------------------
  // Agent Staking
  // --------------------------------------------------------------------------

  async stakeForAgent(request: AgentStakeRequest): Promise<StakePosition> {
    // Validate against agent requirements
    const requirements = this.getAgentRequirements(request.agentType);

    if (BigInt(request.amount) < BigInt(requirements.minStake)) {
      throw new Error(`Minimum stake for ${request.agentType} is ${requirements.minStake}`);
    }

    if (request.lockPeriod < requirements.requiredDuration) {
      throw new Error(`Minimum lock period for ${request.agentType} is ${requirements.requiredDuration} days`);
    }

    // Create stake with agent-specific purpose
    const stakeRequest: StakeRequest = {
      ...request,
      purpose: request.purpose ?? 'strategy_deployment',
    };

    const stake = await this.stake(stakeRequest);

    // Track agent stake
    this.agentStakes.set(request.agentId, stake.id);

    return stake;
  }

  getAgentRequirements(agentType: string): AgentStakeRequirements {
    const requirements = AGENT_REQUIREMENTS[agentType];
    if (!requirements) {
      // Default requirements for unknown agent types
      return {
        minStake: '1000000000000',
        requiredDuration: 30,
        slashable: true,
        requiredTier: 'silver',
      };
    }
    return requirements;
  }

  async getAgentStakeStatus(agentId: string): Promise<AgentStakeStatus> {
    const stakeId = this.agentStakes.get(agentId);

    if (!stakeId) {
      return {
        agentId,
        staked: '0',
        locked: false,
        slashRisk: 0,
        collateralRatio: 0,
        status: 'insufficient',
      };
    }

    const stake = this.stakes.get(stakeId);
    if (!stake || stake.status !== 'active') {
      return {
        agentId,
        staked: '0',
        locked: false,
        slashRisk: 0,
        collateralRatio: 0,
        status: 'insufficient',
      };
    }

    const now = new Date();
    const isLocked = now < stake.unlockDate;

    // Calculate slash risk based on various factors
    // In production, this would consider agent behavior, performance, etc.
    const slashRisk = 0.02; // 2% base risk

    // Calculate collateral ratio (staked / required)
    const requirements = this.getAgentRequirements('trading');
    const collateralRatio = Number(BigInt(stake.amount) * BigInt(100) / BigInt(requirements.minStake)) / 100;

    return {
      agentId,
      staked: stake.amount,
      locked: isLocked,
      unlockDate: stake.unlockDate,
      slashRisk,
      collateralRatio,
      status: collateralRatio >= 1 ? 'active' : 'at_risk',
    };
  }

  // --------------------------------------------------------------------------
  // Slashing
  // --------------------------------------------------------------------------

  async executeSlash(request: SlashRequest): Promise<SlashEvent> {
    if (!this.config.slashingEnabled) {
      throw new Error('Slashing is not enabled');
    }

    const slashId = `slash_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const slashEvent: SlashEvent = {
      id: slashId,
      targetId: request.targetId,
      targetType: request.targetType,
      condition: request.condition,
      amount: request.amount,
      evidence: request.evidence,
      executedAt: now,
      executedBy: request.executedBy,
      appealable: true,
      appealDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'executed',
    };

    // Apply slash to stake
    if (request.targetType === 'agent') {
      const stakeId = this.agentStakes.get(request.targetId);
      if (stakeId) {
        const stake = this.stakes.get(stakeId);
        if (stake) {
          const slashAmount = BigInt(request.amount);
          const currentAmount = BigInt(stake.amount);
          stake.amount = (currentAmount - slashAmount).toString();
          stake.status = 'slashed';
          stake.updatedAt = now;
        }
      }
    }

    // Store slash history
    if (!this.slashHistory.has(request.targetId)) {
      this.slashHistory.set(request.targetId, []);
    }
    this.slashHistory.get(request.targetId)!.push(slashEvent);

    // Emit event
    this.emitEvent({
      type: 'slash_executed',
      category: 'staking',
      data: {
        slashId,
        targetId: request.targetId,
        targetType: request.targetType,
        condition: request.condition,
        amount: request.amount,
      },
      agentId: request.targetType === 'agent' ? request.targetId : undefined,
    });

    return slashEvent;
  }

  async getSlashHistory(targetId: string): Promise<SlashEvent[]> {
    return this.slashHistory.get(targetId) ?? [];
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  getRewardRate(lockPeriod: number): number {
    const periodIndex = this.config.lockPeriods.indexOf(lockPeriod);
    if (periodIndex === -1) {
      // Return lowest rate for invalid periods
      return this.config.rewardRates[0];
    }
    return this.config.rewardRates[periodIndex];
  }

  estimateRewards(amount: string, lockPeriod: number, duration: number): string {
    const calculation = this.calculateRewards({
      amount,
      lockPeriod,
      duration,
      autoCompound: false,
    });
    return calculation.totalPending;
  }

  getTierFromStake(amount: string): TokenTier {
    const stakeAmount = BigInt(amount);

    // Tier thresholds (with 9 decimals)
    if (stakeAmount >= BigInt('1000000000000000000')) return 'diamond'; // 1M+
    if (stakeAmount >= BigInt('100000000000000000')) return 'platinum'; // 100K+
    if (stakeAmount >= BigInt('10000000000000000')) return 'gold'; // 10K+
    if (stakeAmount >= BigInt('1000000000000000')) return 'silver'; // 1K+
    if (stakeAmount >= BigInt('100000000000000')) return 'bronze'; // 100+

    return 'bronze'; // Default
  }

  // --------------------------------------------------------------------------
  // Event Functions
  // --------------------------------------------------------------------------

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<TokenomicsEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TokenomicsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // --------------------------------------------------------------------------
  // Internal: Update rewards (would be called periodically)
  // --------------------------------------------------------------------------

  /**
   * Update pending rewards for all stakes (for testing/simulation)
   */
  updatePendingRewards(): void {
    const now = new Date();

    for (const stake of this.stakes.values()) {
      if (stake.status !== 'active') continue;

      const daysSinceUpdate = (now.getTime() - stake.updatedAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceUpdate < 1) continue; // Update daily

      const dailyRate = stake.rewardRate / 365;
      const rewards = (BigInt(stake.amount) * BigInt(Math.floor(dailyRate * daysSinceUpdate * 1e9))) / BigInt(1e9);

      stake.pendingRewards = (BigInt(stake.pendingRewards) + rewards).toString();
      stake.updatedAt = now;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStakingModule(config?: Partial<StakingConfig>): DefaultStakingModule {
  return new DefaultStakingModule(config);
}

export default DefaultStakingModule;
