/**
 * TONAIAgent - Referral System
 *
 * Implements multi-level referral tracking, smart incentives,
 * performance-based rewards, and automated payouts.
 */

import {
  Referral,
  ReferralCode,
  ReferralReward,
  ReferralTier,
  ReferralTree,
  ReferralTreeNode,
  ReferralConfig,
  ReferralMetadata,
  TieredCommission,
  GrowthEvent,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Referral System Interface
// ============================================================================

export interface ReferralSystem {
  // Code management
  createCode(ownerId: string, options?: CreateCodeOptions): Promise<ReferralCode>;
  getCode(code: string): Promise<ReferralCode | null>;
  getUserCodes(userId: string): Promise<ReferralCode[]>;
  deactivateCode(code: string): Promise<void>;
  updateCodeRewards(code: string, rewards: Partial<ReferralCode['rewards']>): Promise<ReferralCode>;

  // Referral tracking
  createReferral(refereeId: string, code: string, metadata?: Partial<ReferralMetadata>): Promise<Referral>;
  activateReferral(referralId: string): Promise<Referral>;
  getReferral(referralId: string): Promise<Referral | null>;
  getUserReferrals(userId: string, asReferrer: boolean): Promise<Referral[]>;

  // Reward management
  calculateRewards(referralId: string, milestone?: string): Promise<ReferralReward[]>;
  claimReward(rewardId: string): Promise<ReferralReward>;
  getUnclaimedRewards(userId: string): Promise<ReferralReward[]>;
  processPayouts(): Promise<ProcessPayoutsResult>;

  // Tree management
  getReferralTree(userId: string, maxDepth?: number): Promise<ReferralTree>;
  getNetworkStats(userId: string): Promise<NetworkStats>;

  // Tier management
  getUserTier(userId: string): Promise<ReferralTier>;
  upgradeTier(userId: string, newTier: ReferralTier): Promise<void>;
  getTierBenefits(tier: ReferralTier): TierBenefits;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface CreateCodeOptions {
  type?: ReferralCode['type'];
  tier?: ReferralTier;
  customRewards?: Partial<ReferralCode['rewards']>;
  limits?: Partial<ReferralCode['limits']>;
  expiresAt?: Date;
}

export interface ProcessPayoutsResult {
  processed: number;
  successful: number;
  failed: number;
  totalAmount: number;
  errors: PayoutError[];
}

export interface PayoutError {
  rewardId: string;
  userId: string;
  error: string;
}

export interface NetworkStats {
  totalReferrals: number;
  directReferrals: number;
  indirectReferrals: number;
  activeReferrals: number;
  totalVolume: number;
  totalCommissions: number;
  conversionRate: number;
  avgRevenuePerReferral: number;
}

export interface TierBenefits {
  tier: ReferralTier;
  commissionRate: number;
  maxLevels: number;
  bonusMultiplier: number;
  perks: string[];
}

export interface ReferralSystemConfig {
  maxLevels: number;
  defaultReferrerBonus: number;
  defaultRefereeBonus: number;
  commissionPercent: number;
  codeExpirationDays: number;
  minCapitalForReward: number;
  cooldownHours: number;
  tieredCommissions: TieredCommission[];
}

// ============================================================================
// Default Referral System Implementation
// ============================================================================

export class DefaultReferralSystem implements ReferralSystem {
  private readonly codes: Map<string, ReferralCode> = new Map();
  private readonly referrals: Map<string, Referral> = new Map();
  private readonly rewards: Map<string, ReferralReward> = new Map();
  private readonly userTiers: Map<string, ReferralTier> = new Map();
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: ReferralSystemConfig;

  constructor(config?: Partial<ReferralConfig>) {
    this.config = {
      maxLevels: config?.maxLevels ?? 3,
      defaultReferrerBonus: config?.defaultReferrerBonus ?? 10,
      defaultRefereeBonus: config?.defaultRefereeBonus ?? 5,
      commissionPercent: config?.commissionPercent ?? 10,
      codeExpirationDays: config?.codeExpirationDays ?? 90,
      minCapitalForReward: config?.minCapitalForReward ?? 10,
      cooldownHours: config?.cooldownHours ?? 24,
      tieredCommissions: [
        { minReferrals: 0, commissionPercent: 10 },
        { minReferrals: 10, commissionPercent: 12, bonusAmount: 5 },
        { minReferrals: 50, commissionPercent: 15, bonusAmount: 10 },
        { minReferrals: 100, commissionPercent: 18, bonusAmount: 20 },
        { minReferrals: 500, commissionPercent: 20, bonusAmount: 50 },
      ],
    };
  }

  async createCode(ownerId: string, options?: CreateCodeOptions): Promise<ReferralCode> {
    const now = new Date();
    const code = this.generateUniqueCode();
    const tier = options?.tier ?? this.userTiers.get(ownerId) ?? 'standard';

    const defaultRewards = this.getDefaultRewards(tier);
    const rewards = {
      ...defaultRewards,
      ...options?.customRewards,
    };

    const referralCode: ReferralCode = {
      code,
      ownerId,
      type: options?.type ?? 'personal',
      tier,
      rewards,
      limits: {
        maxUses: options?.limits?.maxUses,
        maxDailyUses: options?.limits?.maxDailyUses,
        minCapitalRequired: options?.limits?.minCapitalRequired ?? this.config.minCapitalForReward,
        validCountries: options?.limits?.validCountries,
        excludedCountries: options?.limits?.excludedCountries,
      },
      stats: {
        totalUses: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalRewardsEarned: 0,
        totalVolumeGenerated: 0,
      },
      active: true,
      createdAt: now,
      expiresAt: options?.expiresAt ?? new Date(now.getTime() + this.config.codeExpirationDays * 24 * 60 * 60 * 1000),
    };

    this.codes.set(code, referralCode);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'referral_created',
      severity: 'info',
      source: 'referral_system',
      userId: ownerId,
      message: `Referral code created: ${code}`,
      data: { code, ownerId, tier },
    });

    return referralCode;
  }

  async getCode(code: string): Promise<ReferralCode | null> {
    return this.codes.get(code.toUpperCase()) ?? null;
  }

  async getUserCodes(userId: string): Promise<ReferralCode[]> {
    return Array.from(this.codes.values()).filter(c => c.ownerId === userId);
  }

  async deactivateCode(code: string): Promise<void> {
    const referralCode = this.codes.get(code.toUpperCase());
    if (!referralCode) {
      throw new Error(`Referral code not found: ${code}`);
    }

    referralCode.active = false;
    this.codes.set(code.toUpperCase(), referralCode);
  }

  async updateCodeRewards(
    code: string,
    rewards: Partial<ReferralCode['rewards']>
  ): Promise<ReferralCode> {
    const referralCode = this.codes.get(code.toUpperCase());
    if (!referralCode) {
      throw new Error(`Referral code not found: ${code}`);
    }

    referralCode.rewards = {
      ...referralCode.rewards,
      ...rewards,
    };

    this.codes.set(code.toUpperCase(), referralCode);
    return referralCode;
  }

  async createReferral(
    refereeId: string,
    code: string,
    metadata?: Partial<ReferralMetadata>
  ): Promise<Referral> {
    const referralCode = await this.getCode(code);
    if (!referralCode) {
      throw new Error(`Invalid referral code: ${code}`);
    }

    if (!referralCode.active) {
      throw new Error(`Referral code is inactive: ${code}`);
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      throw new Error(`Referral code has expired: ${code}`);
    }

    if (referralCode.limits.maxUses && referralCode.stats.totalUses >= referralCode.limits.maxUses) {
      throw new Error(`Referral code has reached maximum uses: ${code}`);
    }

    // Check if user already has a referral
    const existingReferrals = await this.getUserReferrals(refereeId, false);
    if (existingReferrals.length > 0) {
      throw new Error(`User already has a referral: ${refereeId}`);
    }

    // Prevent self-referral
    if (referralCode.ownerId === refereeId) {
      throw new Error('Self-referral is not allowed');
    }

    const now = new Date();
    const referralId = this.generateId('ref');

    const referral: Referral = {
      id: referralId,
      referrerId: referralCode.ownerId,
      refereeId,
      code: referralCode.code,
      status: 'pending',
      tier: referralCode.tier,
      rewards: [],
      metadata: {
        source: metadata?.source ?? 'direct',
        campaign: metadata?.campaign,
        utmSource: metadata?.utmSource,
        utmMedium: metadata?.utmMedium,
        utmCampaign: metadata?.utmCampaign,
        ipCountry: metadata?.ipCountry,
        deviceType: metadata?.deviceType,
        level: 1,
      },
      createdAt: now,
    };

    this.referrals.set(referralId, referral);

    // Update code stats
    referralCode.stats.totalUses++;
    referralCode.stats.pendingReferrals++;
    this.codes.set(referralCode.code, referralCode);

    return referral;
  }

  async activateReferral(referralId: string): Promise<Referral> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      throw new Error(`Referral not found: ${referralId}`);
    }

    if (referral.status !== 'pending') {
      throw new Error(`Referral is not pending: ${referralId}`);
    }

    const now = new Date();
    referral.status = 'active';
    referral.activatedAt = now;

    // Calculate and create initial rewards
    const initialRewards = await this.calculateRewards(referralId, 'signup');
    referral.rewards = initialRewards;

    this.referrals.set(referralId, referral);

    // Update code stats
    const referralCode = this.codes.get(referral.code);
    if (referralCode) {
      referralCode.stats.pendingReferrals--;
      referralCode.stats.successfulReferrals++;
      this.codes.set(referral.code, referralCode);
    }

    // Create multi-level referrals
    await this.createMultiLevelReferrals(referral);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'referral_activated',
      severity: 'info',
      source: 'referral_system',
      userId: referral.refereeId,
      message: `Referral activated for user ${referral.refereeId}`,
      data: { referralId, referrerId: referral.referrerId, tier: referral.tier },
    });

    return referral;
  }

  async getReferral(referralId: string): Promise<Referral | null> {
    return this.referrals.get(referralId) ?? null;
  }

  async getUserReferrals(userId: string, asReferrer: boolean): Promise<Referral[]> {
    return Array.from(this.referrals.values()).filter(r =>
      asReferrer ? r.referrerId === userId : r.refereeId === userId
    );
  }

  async calculateRewards(referralId: string, milestone?: string): Promise<ReferralReward[]> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      throw new Error(`Referral not found: ${referralId}`);
    }

    const referralCode = this.codes.get(referral.code);
    if (!referralCode) {
      throw new Error(`Referral code not found: ${referral.code}`);
    }

    const now = new Date();
    const rewards: ReferralReward[] = [];

    const rewardConfig = referralCode.rewards;
    const effectiveMilestone = milestone ?? 'signup';

    // Calculate referrer bonus
    if (rewardConfig.referrerBonus > 0) {
      const referrerReward: ReferralReward = {
        id: this.generateId('reward'),
        referralId,
        recipientId: referral.referrerId,
        recipientType: 'referrer',
        type: effectiveMilestone === 'signup' ? 'signup_bonus' : 'milestone_bonus',
        amount: rewardConfig.referrerBonus,
        currency: 'TON',
        status: 'pending',
        milestone: effectiveMilestone,
        createdAt: now,
      };
      rewards.push(referrerReward);
      this.rewards.set(referrerReward.id, referrerReward);
    }

    // Calculate referee bonus
    if (rewardConfig.refereeBonus > 0) {
      const refereeReward: ReferralReward = {
        id: this.generateId('reward'),
        referralId,
        recipientId: referral.refereeId,
        recipientType: 'referee',
        type: effectiveMilestone === 'signup' ? 'signup_bonus' : 'milestone_bonus',
        amount: rewardConfig.refereeBonus,
        currency: 'TON',
        status: 'pending',
        milestone: effectiveMilestone,
        createdAt: now,
      };
      rewards.push(refereeReward);
      this.rewards.set(refereeReward.id, refereeReward);
    }

    // Add fee discount rewards
    if (rewardConfig.referrerFeeDiscount > 0) {
      const feeDiscountReward: ReferralReward = {
        id: this.generateId('reward'),
        referralId,
        recipientId: referral.referrerId,
        recipientType: 'referrer',
        type: 'fee_discount',
        amount: rewardConfig.referrerFeeDiscount,
        currency: 'PERCENT',
        status: 'pending',
        milestone: effectiveMilestone,
        createdAt: now,
      };
      rewards.push(feeDiscountReward);
      this.rewards.set(feeDiscountReward.id, feeDiscountReward);
    }

    return rewards;
  }

  async claimReward(rewardId: string): Promise<ReferralReward> {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }

    if (reward.status !== 'pending') {
      throw new Error(`Reward is not claimable: ${rewardId} (status: ${reward.status})`);
    }

    const now = new Date();
    reward.status = 'processing';
    this.rewards.set(rewardId, reward);

    // Simulate payout processing
    reward.status = 'paid';
    reward.paidAt = now;
    reward.txHash = `0x${this.generateId('tx')}`;
    this.rewards.set(rewardId, reward);

    // Update code stats
    const referral = this.referrals.get(reward.referralId);
    if (referral) {
      const referralCode = this.codes.get(referral.code);
      if (referralCode) {
        referralCode.stats.totalRewardsEarned += reward.amount;
        this.codes.set(referral.code, referralCode);
      }
    }

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'reward_paid',
      severity: 'info',
      source: 'referral_system',
      userId: reward.recipientId,
      message: `Reward paid: ${reward.amount} ${reward.currency}`,
      data: { rewardId, amount: reward.amount, type: reward.type },
    });

    return reward;
  }

  async getUnclaimedRewards(userId: string): Promise<ReferralReward[]> {
    return Array.from(this.rewards.values()).filter(
      r => r.recipientId === userId && r.status === 'pending'
    );
  }

  async processPayouts(): Promise<ProcessPayoutsResult> {
    const pendingRewards = Array.from(this.rewards.values()).filter(r => r.status === 'pending');
    const result: ProcessPayoutsResult = {
      processed: pendingRewards.length,
      successful: 0,
      failed: 0,
      totalAmount: 0,
      errors: [],
    };

    for (const reward of pendingRewards) {
      try {
        await this.claimReward(reward.id);
        result.successful++;
        result.totalAmount += reward.amount;
      } catch (error) {
        result.failed++;
        result.errors.push({
          rewardId: reward.id,
          userId: reward.recipientId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async getReferralTree(userId: string, maxDepth: number = 3): Promise<ReferralTree> {
    const directReferrals = await this.getUserReferrals(userId, true);
    const directNodes: ReferralTreeNode[] = directReferrals.map(r => ({
      userId: r.refereeId,
      level: 1,
      referralId: r.id,
      status: r.status,
      joinedAt: r.createdAt,
      totalVolume: 0, // Would be calculated from actual trading volume
      commissionsGenerated: r.rewards.reduce((sum, rw) => sum + rw.amount, 0),
    }));

    const indirectNodes: ReferralTreeNode[] = [];
    if (maxDepth > 1) {
      for (const node of directNodes) {
        const childReferrals = await this.buildSubtree(node.userId, 2, maxDepth);
        indirectNodes.push(...childReferrals);
      }
    }

    // Find referrer
    const userReferral = await this.getUserReferrals(userId, false);
    let referrer: ReferralTreeNode | undefined;
    if (userReferral.length > 0) {
      const ref = userReferral[0];
      referrer = {
        userId: ref.referrerId,
        level: 0,
        referralId: ref.id,
        status: ref.status,
        joinedAt: ref.createdAt,
        totalVolume: 0,
        commissionsGenerated: 0,
      };
    }

    const totalNetworkVolume = [...directNodes, ...indirectNodes].reduce(
      (sum, n) => sum + n.totalVolume,
      0
    );

    return {
      userId,
      level: 0,
      referrer,
      directReferrals: directNodes,
      indirectReferrals: indirectNodes,
      totalNetworkSize: directNodes.length + indirectNodes.length,
      totalNetworkVolume,
    };
  }

  async getNetworkStats(userId: string): Promise<NetworkStats> {
    const tree = await this.getReferralTree(userId);
    const allReferrals = [...tree.directReferrals, ...tree.indirectReferrals];
    const activeReferrals = allReferrals.filter(r => r.status === 'active');

    const totalCommissions = allReferrals.reduce((sum, r) => sum + r.commissionsGenerated, 0);
    const totalVolume = allReferrals.reduce((sum, r) => sum + r.totalVolume, 0);

    return {
      totalReferrals: allReferrals.length,
      directReferrals: tree.directReferrals.length,
      indirectReferrals: tree.indirectReferrals.length,
      activeReferrals: activeReferrals.length,
      totalVolume,
      totalCommissions,
      conversionRate: allReferrals.length > 0
        ? (activeReferrals.length / allReferrals.length) * 100
        : 0,
      avgRevenuePerReferral: allReferrals.length > 0
        ? totalCommissions / allReferrals.length
        : 0,
    };
  }

  async getUserTier(userId: string): Promise<ReferralTier> {
    return this.userTiers.get(userId) ?? 'standard';
  }

  async upgradeTier(userId: string, newTier: ReferralTier): Promise<void> {
    const currentTier = await this.getUserTier(userId);
    const tierOrder: ReferralTier[] = ['standard', 'premium', 'elite', 'ambassador'];

    if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTier)) {
      throw new Error(`Cannot downgrade tier from ${currentTier} to ${newTier}`);
    }

    this.userTiers.set(userId, newTier);

    // Update all user's active codes to new tier
    const userCodes = await this.getUserCodes(userId);
    for (const code of userCodes) {
      if (code.active) {
        code.tier = newTier;
        code.rewards = this.getDefaultRewards(newTier);
        this.codes.set(code.code, code);
      }
    }
  }

  getTierBenefits(tier: ReferralTier): TierBenefits {
    const benefits: Record<ReferralTier, TierBenefits> = {
      standard: {
        tier: 'standard',
        commissionRate: 10,
        maxLevels: 2,
        bonusMultiplier: 1,
        perks: [
          'Basic referral tracking',
          '10% commission on direct referrals',
          '2-level referral tree',
        ],
      },
      premium: {
        tier: 'premium',
        commissionRate: 15,
        maxLevels: 3,
        bonusMultiplier: 1.25,
        perks: [
          'Advanced analytics dashboard',
          '15% commission on direct referrals',
          '3-level referral tree',
          '25% bonus multiplier on rewards',
          'Custom referral codes',
        ],
      },
      elite: {
        tier: 'elite',
        commissionRate: 20,
        maxLevels: 4,
        bonusMultiplier: 1.5,
        perks: [
          'Real-time analytics',
          '20% commission on direct referrals',
          '4-level referral tree',
          '50% bonus multiplier on rewards',
          'Priority support',
          'Featured placement in marketplace',
        ],
      },
      ambassador: {
        tier: 'ambassador',
        commissionRate: 25,
        maxLevels: 5,
        bonusMultiplier: 2,
        perks: [
          'Full API access',
          '25% commission on direct referrals',
          '5-level referral tree',
          '100% bonus multiplier on rewards',
          'Dedicated account manager',
          'Co-marketing opportunities',
          'Early access to features',
          'Custom campaigns',
        ],
      },
    };

    return benefits[tier];
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateUniqueCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.codes.has(code));
    return code;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getDefaultRewards(tier: ReferralTier): ReferralCode['rewards'] {
    const tierMultipliers: Record<ReferralTier, number> = {
      standard: 1,
      premium: 1.25,
      elite: 1.5,
      ambassador: 2,
    };

    const multiplier = tierMultipliers[tier];

    return {
      referrerBonus: Math.round(this.config.defaultReferrerBonus * multiplier),
      refereeBonus: Math.round(this.config.defaultRefereeBonus * multiplier),
      referrerFeeDiscount: tier === 'standard' ? 5 : tier === 'premium' ? 10 : tier === 'elite' ? 15 : 20,
      refereeFeeDiscount: tier === 'standard' ? 5 : tier === 'premium' ? 10 : tier === 'elite' ? 15 : 20,
      commissionPercent: this.getTierBenefits(tier).commissionRate,
      tieredCommissions: this.config.tieredCommissions,
    };
  }

  private async buildSubtree(
    userId: string,
    currentLevel: number,
    maxLevel: number
  ): Promise<ReferralTreeNode[]> {
    if (currentLevel > maxLevel) {
      return [];
    }

    const referrals = await this.getUserReferrals(userId, true);
    const nodes: ReferralTreeNode[] = referrals.map(r => ({
      userId: r.refereeId,
      level: currentLevel,
      referralId: r.id,
      status: r.status,
      joinedAt: r.createdAt,
      totalVolume: 0,
      commissionsGenerated: r.rewards.reduce((sum, rw) => sum + rw.amount, 0),
    }));

    const childNodes: ReferralTreeNode[] = [];
    for (const node of nodes) {
      const children = await this.buildSubtree(node.userId, currentLevel + 1, maxLevel);
      childNodes.push(...children);
    }

    return [...nodes, ...childNodes];
  }

  private async createMultiLevelReferrals(referral: Referral): Promise<void> {
    // Find the referrer's referrer (level 2)
    const referrerReferrals = await this.getUserReferrals(referral.referrerId, false);

    for (const parentReferral of referrerReferrals) {
      if (parentReferral.metadata.level < this.config.maxLevels) {
        // Create level 2+ commission reward
        const commissionRate = this.getMultiLevelCommissionRate(parentReferral.metadata.level + 1);
        if (commissionRate > 0) {
          const reward: ReferralReward = {
            id: this.generateId('reward'),
            referralId: referral.id,
            recipientId: parentReferral.referrerId,
            recipientType: 'referrer',
            type: 'commission',
            amount: commissionRate, // Percentage to be calculated on actual volume
            currency: 'PERCENT',
            status: 'pending',
            milestone: `level_${parentReferral.metadata.level + 1}`,
            createdAt: new Date(),
          };
          this.rewards.set(reward.id, reward);
        }
      }
    }
  }

  private getMultiLevelCommissionRate(level: number): number {
    const rates = [10, 5, 3, 2, 1]; // Level 1-5 commission percentages
    return level <= rates.length ? rates[level - 1] : 0;
  }

  private emitEvent(event: GrowthEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createReferralSystem(
  config?: Partial<ReferralConfig>
): DefaultReferralSystem {
  return new DefaultReferralSystem(config);
}
