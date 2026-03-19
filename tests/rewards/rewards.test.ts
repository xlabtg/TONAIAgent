/**
 * Rewards Engine Tests (Issue #277)
 *
 * Covers:
 *   - issueReferralRewards: amounts, recipient types, status
 *   - issueTradingCashback: rate calculation, cap, minimum
 *   - issueSubscriptionBonus: amount, description
 *   - approveReward / markPaid / rejectReward: lifecycle transitions
 *   - getReward / getRewardsByUser / getPendingRewardsByUser
 *   - getTotalEarnedByUser
 *   - getPendingPayouts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RewardsEngine, createRewardsEngine } from '../../services/rewards/index';
import type { Reward } from '../../services/rewards/index';

// ============================================================================
// Helpers
// ============================================================================

function makeEngine(overrides = {}) {
  return createRewardsEngine({
    referralBonusReferrerUsd: 5,
    referralBonusRefereeUsd: 5,
    tradingCashbackRate: 0.1,
    tradingCashbackCapUsd: 20,
    subscriptionBonusUsd: 10,
    rewardExpiryDays: 0, // No expiry in tests
    minPayoutUsd: 1,
    ...overrides,
  });
}

// ============================================================================
// issueReferralRewards
// ============================================================================

describe('RewardsEngine.issueReferralRewards', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('returns two rewards (referrer and referee)', () => {
    const [referrerRwd, refereeRwd] = engine.issueReferralRewards(
      'ref_001', 'referrer_1', 'referee_1',
    );
    expect(referrerRwd).toBeDefined();
    expect(refereeRwd).toBeDefined();
  });

  it('assigns correct recipientType', () => {
    const [referrerRwd, refereeRwd] = engine.issueReferralRewards(
      'ref_001', 'referrer_1', 'referee_1',
    );
    expect(referrerRwd.recipientType).toBe('referrer');
    expect(refereeRwd.recipientType).toBe('referee');
  });

  it('assigns correct userId', () => {
    const [referrerRwd, refereeRwd] = engine.issueReferralRewards(
      'ref_001', 'referrer_1', 'referee_1',
    );
    expect(referrerRwd.userId).toBe('referrer_1');
    expect(refereeRwd.userId).toBe('referee_1');
  });

  it('uses configured bonus amounts', () => {
    const [referrerRwd, refereeRwd] = engine.issueReferralRewards(
      'ref_001', 'r1', 'e1',
    );
    expect(referrerRwd.amountUsd).toBe(5);
    expect(refereeRwd.amountUsd).toBe(5);
  });

  it('starts with pending status', () => {
    const [r1, r2] = engine.issueReferralRewards('ref_001', 'r1', 'e1');
    expect(r1.status).toBe('pending');
    expect(r2.status).toBe('pending');
  });

  it('stores referralId on rewards', () => {
    const [r1, r2] = engine.issueReferralRewards('ref_007', 'r1', 'e1');
    expect(r1.referralId).toBe('ref_007');
    expect(r2.referralId).toBe('ref_007');
  });

  it('assigns type referral_bonus', () => {
    const [r1] = engine.issueReferralRewards('ref_001', 'r1', 'e1');
    expect(r1.type).toBe('referral_bonus');
  });

  it('generates unique reward IDs', () => {
    const [r1, r2] = engine.issueReferralRewards('ref_001', 'r1', 'e1');
    expect(r1.id).not.toBe(r2.id);
  });
});

// ============================================================================
// issueTradingCashback
// ============================================================================

describe('RewardsEngine.issueTradingCashback', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('returns cashback reward at configured rate', () => {
    const reward = engine.issueTradingCashback('user_1', 100);
    expect(reward).not.toBeNull();
    expect(reward!.amountUsd).toBeCloseTo(10, 5); // 10% of $100
  });

  it('caps cashback at configured maximum', () => {
    const reward = engine.issueTradingCashback('user_1', 500);
    // 10% of $500 = $50, but cap is $20
    expect(reward!.amountUsd).toBe(20);
  });

  it('returns null when amount is below minimum payout', () => {
    const smallEngine = makeEngine({ tradingCashbackRate: 0.001, minPayoutUsd: 1 });
    // 0.1% of $5 = $0.005 — below $1 minimum
    const reward = smallEngine.issueTradingCashback('user_1', 5);
    expect(reward).toBeNull();
  });

  it('sets type to trading_cashback', () => {
    const reward = engine.issueTradingCashback('user_1', 50);
    expect(reward!.type).toBe('trading_cashback');
  });

  it('starts as pending', () => {
    const reward = engine.issueTradingCashback('user_1', 50);
    expect(reward!.status).toBe('pending');
  });
});

// ============================================================================
// issueSubscriptionBonus
// ============================================================================

describe('RewardsEngine.issueSubscriptionBonus', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('issues bonus with configured amount', () => {
    const reward = engine.issueSubscriptionBonus('user_1', 'pro');
    expect(reward.amountUsd).toBe(10);
  });

  it('sets type to subscription_bonus', () => {
    const reward = engine.issueSubscriptionBonus('user_1', 'pro');
    expect(reward.type).toBe('subscription_bonus');
  });

  it('description mentions plan name', () => {
    const reward = engine.issueSubscriptionBonus('user_1', 'enterprise');
    expect(reward.description).toContain('enterprise');
  });
});

// ============================================================================
// Lifecycle: approveReward / markPaid / rejectReward
// ============================================================================

describe('RewardsEngine reward lifecycle', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  function createReward(): Reward {
    const [r] = engine.issueReferralRewards('ref_001', 'r1', 'e1');
    return r;
  }

  it('approveReward transitions pending → approved', () => {
    const r = createReward();
    const approved = engine.approveReward(r.id);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeTruthy();
  });

  it('approveReward throws if not pending', () => {
    const r = createReward();
    engine.approveReward(r.id);
    expect(() => engine.approveReward(r.id)).toThrow('cannot be approved');
  });

  it('markPaid transitions approved → paid', () => {
    const r = createReward();
    engine.approveReward(r.id);
    const paid = engine.markPaid(r.id, 'tx_abc123');
    expect(paid.status).toBe('paid');
    expect(paid.txHash).toBe('tx_abc123');
    expect(paid.paidAt).toBeTruthy();
  });

  it('markPaid also works directly from pending', () => {
    const r = createReward();
    const paid = engine.markPaid(r.id, 'tx_direct');
    expect(paid.status).toBe('paid');
  });

  it('markPaid throws if already paid', () => {
    const r = createReward();
    engine.markPaid(r.id, 'tx1');
    expect(() => engine.markPaid(r.id, 'tx2')).toThrow('cannot be marked paid');
  });

  it('rejectReward transitions pending → rejected', () => {
    const r = createReward();
    const rejected = engine.rejectReward(r.id, 'Abuse detected');
    expect(rejected.status).toBe('rejected');
    expect(rejected.description).toContain('REJECTED');
  });

  it('rejectReward throws if already paid', () => {
    const r = createReward();
    engine.markPaid(r.id, 'tx1');
    expect(() => engine.rejectReward(r.id, 'reason')).toThrow('Cannot reject');
  });

  it('throws for unknown reward ID', () => {
    expect(() => engine.approveReward('rwd_unknown')).toThrow('not found');
    expect(() => engine.markPaid('rwd_unknown', 'tx1')).toThrow('not found');
    expect(() => engine.rejectReward('rwd_unknown', 'x')).toThrow('not found');
  });
});

// ============================================================================
// Query methods
// ============================================================================

describe('RewardsEngine query methods', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('getReward returns null for unknown ID', () => {
    expect(engine.getReward('rwd_unknown')).toBeNull();
  });

  it('getReward returns saved reward', () => {
    const [r] = engine.issueReferralRewards('ref_001', 'r1', 'e1');
    expect(engine.getReward(r.id)).not.toBeNull();
  });

  it('getRewardsByUser returns all rewards for a user', () => {
    engine.issueReferralRewards('ref_001', 'user_A', 'user_B');
    engine.issueTradingCashback('user_A', 100);
    const rewards = engine.getRewardsByUser('user_A');
    // referrerReward + cashback = 2
    expect(rewards).toHaveLength(2);
  });

  it('getRewardsByUser returns empty for unknown user', () => {
    expect(engine.getRewardsByUser('nobody')).toEqual([]);
  });

  it('getPendingRewardsByUser returns only pending rewards', () => {
    const [r1, r2] = engine.issueReferralRewards('ref_001', 'u1', 'u2');
    engine.approveReward(r1.id);

    const pending = engine.getPendingRewardsByUser('u1');
    expect(pending.every(r => r.status === 'pending')).toBe(true);
  });

  it('getApprovedRewardsByUser returns only approved rewards', () => {
    const [r] = engine.issueReferralRewards('ref_001', 'u1', 'u2');
    engine.approveReward(r.id);

    const approved = engine.getApprovedRewardsByUser('u1');
    expect(approved).toHaveLength(1);
    expect(approved[0].status).toBe('approved');
  });
});

// ============================================================================
// getTotalEarnedByUser
// ============================================================================

describe('RewardsEngine.getTotalEarnedByUser', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('returns 0 for user with no paid rewards', () => {
    engine.issueReferralRewards('ref_001', 'u1', 'u2');
    expect(engine.getTotalEarnedByUser('u1')).toBe(0);
  });

  it('sums only paid rewards', () => {
    const [r1] = engine.issueReferralRewards('ref_001', 'u1', 'u2');
    const cashback = engine.issueTradingCashback('u1', 100); // $10
    engine.markPaid(r1.id, 'tx1'); // $5
    engine.markPaid(cashback!.id, 'tx2'); // $10
    expect(engine.getTotalEarnedByUser('u1')).toBeCloseTo(15, 5);
  });
});

// ============================================================================
// getPendingPayouts
// ============================================================================

describe('RewardsEngine.getPendingPayouts', () => {
  let engine: RewardsEngine;

  beforeEach(() => { engine = makeEngine(); });

  it('returns only approved rewards', () => {
    const [r1] = engine.issueReferralRewards('ref_001', 'u1', 'u2');
    engine.approveReward(r1.id);
    // r2 stays pending
    const payouts = engine.getPendingPayouts();
    expect(payouts.every(r => r.status === 'approved')).toBe(true);
    expect(payouts.some(r => r.id === r1.id)).toBe(true);
  });

  it('respects minimum amount filter', () => {
    const cashback = engine.issueTradingCashback('u1', 100); // $10
    engine.approveReward(cashback!.id);
    // Filter by $15 minimum — should exclude $10 reward
    const payouts = engine.getPendingPayouts(15);
    expect(payouts.some(r => r.id === cashback!.id)).toBe(false);
  });
});
