/**
 * TONAIAgent — Rewards Engine (Issue #277)
 *
 * Implements the growth rewards engine:
 *   - RewardType definitions
 *   - Reward lifecycle: pending → paid
 *   - Reward issuance on referral activation
 *   - Bonus examples: referral_bonus ($5 after first trade), trading_cashback (fee %), subscription_bonus
 *   - Integration with ReferralSystem for automatic reward creation
 *
 * Architecture:
 *   activateReferral() → RewardsEngine.issueReferralRewards()
 *     → Reward(referral_bonus) for referrer
 *     → Reward(referral_bonus) for referee (welcome bonus)
 *   trade() → RewardsEngine.issueTradingCashback()
 *     → Reward(trading_cashback) for user
 */

// ============================================================================
// Types
// ============================================================================

export type RewardType =
  | 'referral_bonus'
  | 'trading_cashback'
  | 'subscription_bonus';

export type RewardStatus = 'pending' | 'approved' | 'paid' | 'expired' | 'rejected';

export type RewardRecipient = 'referrer' | 'referee' | 'user';

export interface Reward {
  /** Unique reward ID */
  id: string;
  /** User ID who receives the reward */
  userId: string;
  /** Role context (referrer, referee, or generic user) */
  recipientType: RewardRecipient;
  /** Reward category */
  type: RewardType;
  /** Amount in USD */
  amountUsd: number;
  /** Current lifecycle status */
  status: RewardStatus;
  /** Human-readable description */
  description: string;
  /** Source referral ID (if applicable) */
  referralId?: string;
  /** Reward creation timestamp */
  createdAt: string;
  /** Approval timestamp */
  approvedAt?: string;
  /** Payout timestamp */
  paidAt?: string;
  /** On-chain transaction hash (filled on payout) */
  txHash?: string;
  /** Expiry (if unclaimed after a period) */
  expiresAt?: string;
}

export interface RewardsConfig {
  /** Flat USD bonus for referrer when referred user activates */
  referralBonusReferrerUsd: number;
  /** Flat USD welcome bonus for the referee on activation */
  referralBonusRefereeUsd: number;
  /** Trading cashback as a fraction of fees (0–1) */
  tradingCashbackRate: number;
  /** Maximum cashback per trade in USD */
  tradingCashbackCapUsd: number;
  /** Subscription bonus USD */
  subscriptionBonusUsd: number;
  /** Days before unclaimed rewards expire (0 = no expiry) */
  rewardExpiryDays: number;
  /** Minimum payout threshold in USD */
  minPayoutUsd: number;
}

const DEFAULT_CONFIG: RewardsConfig = {
  referralBonusReferrerUsd: 5,
  referralBonusRefereeUsd: 5,
  tradingCashbackRate: 0.1, // 10% of fees
  tradingCashbackCapUsd: 20,
  subscriptionBonusUsd: 10,
  rewardExpiryDays: 90,
  minPayoutUsd: 1,
};

// ============================================================================
// RewardStore — in-memory persistence
// ============================================================================

class RewardStore {
  private rewards = new Map<string, Reward>();
  /** userId → Set of reward IDs */
  private userIndex = new Map<string, Set<string>>();

  save(reward: Reward): void {
    this.rewards.set(reward.id, reward);
    const set = this.userIndex.get(reward.userId) ?? new Set<string>();
    set.add(reward.id);
    this.userIndex.set(reward.userId, set);
  }

  get(id: string): Reward | undefined {
    return this.rewards.get(id);
  }

  getByUser(userId: string): Reward[] {
    const ids = this.userIndex.get(userId) ?? new Set<string>();
    return Array.from(ids)
      .map(id => this.rewards.get(id)!)
      .filter(Boolean);
  }

  getAll(): Reward[] {
    return Array.from(this.rewards.values());
  }
}

// ============================================================================
// RewardsEngine
// ============================================================================

export class RewardsEngine {
  private readonly store: RewardStore;
  readonly config: RewardsConfig;

  constructor(config: Partial<RewardsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new RewardStore();
  }

  // --------------------------------------------------------------------------
  // Issuance API
  // --------------------------------------------------------------------------

  /**
   * Issue rewards when a referral is activated (first qualifying trade).
   *
   * Creates two rewards:
   *   - referral_bonus for the referrer
   *   - referral_bonus (welcome bonus) for the referee
   *
   * @returns Array of created rewards [referrerReward, refereeReward]
   */
  issueReferralRewards(
    referralId: string,
    referrerId: string,
    refereeId: string,
  ): [Reward, Reward] {
    const now = new Date().toISOString();
    const expiry = this._expiryDate();

    const referrerReward = this._createReward({
      userId: referrerId,
      recipientType: 'referrer',
      type: 'referral_bonus',
      amountUsd: this.config.referralBonusReferrerUsd,
      description: `Referral bonus for inviting a new user (referral: ${referralId})`,
      referralId,
      createdAt: now,
      expiresAt: expiry,
    });

    const refereeReward = this._createReward({
      userId: refereeId,
      recipientType: 'referee',
      type: 'referral_bonus',
      amountUsd: this.config.referralBonusRefereeUsd,
      description: `Welcome bonus for joining via referral (referral: ${referralId})`,
      referralId,
      createdAt: now,
      expiresAt: expiry,
    });

    return [referrerReward, refereeReward];
  }

  /**
   * Issue a trading cashback reward.
   *
   * @param userId     - User who executed the trade
   * @param feePaidUsd - Fee amount paid in USD
   * @returns The created reward or null if amount is below minimum
   */
  issueTradingCashback(userId: string, feePaidUsd: number): Reward | null {
    const rawAmount = feePaidUsd * this.config.tradingCashbackRate;
    const amountUsd = Math.min(rawAmount, this.config.tradingCashbackCapUsd);

    if (amountUsd < this.config.minPayoutUsd) {
      return null;
    }

    return this._createReward({
      userId,
      recipientType: 'user',
      type: 'trading_cashback',
      amountUsd,
      description: `Trading fee cashback (${(this.config.tradingCashbackRate * 100).toFixed(0)}% of $${feePaidUsd.toFixed(2)} fee)`,
      createdAt: new Date().toISOString(),
      expiresAt: this._expiryDate(),
    });
  }

  /**
   * Issue a subscription bonus reward.
   *
   * @param userId - Subscriber user ID
   * @param plan   - Subscription plan name
   */
  issueSubscriptionBonus(userId: string, plan: string): Reward {
    return this._createReward({
      userId,
      recipientType: 'user',
      type: 'subscription_bonus',
      amountUsd: this.config.subscriptionBonusUsd,
      description: `Subscription bonus for ${plan} plan`,
      createdAt: new Date().toISOString(),
      expiresAt: this._expiryDate(),
    });
  }

  // --------------------------------------------------------------------------
  // Lifecycle API
  // --------------------------------------------------------------------------

  /**
   * Approve a pending reward (admin / compliance gate before payout).
   */
  approveReward(rewardId: string): Reward {
    const reward = this._getOrThrow(rewardId);
    if (reward.status !== 'pending') {
      throw new Error(
        `Reward ${rewardId} cannot be approved (current status: ${reward.status})`,
      );
    }
    reward.status = 'approved';
    reward.approvedAt = new Date().toISOString();
    this.store.save(reward);
    return reward;
  }

  /**
   * Mark a reward as paid and record transaction hash.
   */
  markPaid(rewardId: string, txHash: string): Reward {
    const reward = this._getOrThrow(rewardId);
    if (reward.status !== 'approved' && reward.status !== 'pending') {
      throw new Error(
        `Reward ${rewardId} cannot be marked paid (current status: ${reward.status})`,
      );
    }
    reward.status = 'paid';
    reward.paidAt = new Date().toISOString();
    reward.txHash = txHash;
    this.store.save(reward);
    return reward;
  }

  /**
   * Reject a reward (e.g., abuse detected after issuance).
   */
  rejectReward(rewardId: string, reason: string): Reward {
    const reward = this._getOrThrow(rewardId);
    if (reward.status === 'paid') {
      throw new Error(`Cannot reject already-paid reward ${rewardId}`);
    }
    reward.status = 'rejected';
    reward.description += ` [REJECTED: ${reason}]`;
    this.store.save(reward);
    return reward;
  }

  // --------------------------------------------------------------------------
  // Query API
  // --------------------------------------------------------------------------

  getReward(rewardId: string): Reward | null {
    return this.store.get(rewardId) ?? null;
  }

  getRewardsByUser(userId: string): Reward[] {
    return this.store.getByUser(userId);
  }

  getPendingRewardsByUser(userId: string): Reward[] {
    return this.store.getByUser(userId).filter(r => r.status === 'pending');
  }

  getApprovedRewardsByUser(userId: string): Reward[] {
    return this.store.getByUser(userId).filter(r => r.status === 'approved');
  }

  getTotalEarnedByUser(userId: string): number {
    return this.store
      .getByUser(userId)
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.amountUsd, 0);
  }

  /**
   * Get all rewards pending payout (for batch processing).
   */
  getPendingPayouts(minAmount = 0): Reward[] {
    return this.store
      .getAll()
      .filter(r => r.status === 'approved' && r.amountUsd >= minAmount);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _createReward(fields: Omit<Reward, 'id' | 'status'>): Reward {
    const reward: Reward = {
      id: `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      status: 'pending',
      ...fields,
    };
    this.store.save(reward);
    return reward;
  }

  private _getOrThrow(rewardId: string): Reward {
    const reward = this.store.get(rewardId);
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }
    return reward;
  }

  private _expiryDate(): string | undefined {
    if (this.config.rewardExpiryDays === 0) return undefined;
    return new Date(
      Date.now() + this.config.rewardExpiryDays * 86_400_000,
    ).toISOString();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createRewardsEngine(
  config?: Partial<RewardsConfig>,
): RewardsEngine {
  return new RewardsEngine(config);
}

export default RewardsEngine;
