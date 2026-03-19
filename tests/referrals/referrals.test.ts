/**
 * Core Referral System Tests (Issue #277)
 *
 * Covers:
 *   - generateReferralCode: idempotency, code format
 *   - trackReferral: happy path, self-referral, duplicate, rate limit, IP abuse
 *   - activateReferral: status transitions, error cases
 *   - markRewarded: happy path, error cases
 *   - getReferral / getReferralsByReferrer / getReferralByReferee
 *   - getStats: conversion rate calculation
 *   - deactivateCode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferralSystem,
  createReferralSystem,
} from '../../core/referrals/index';
import type { Referral, ReferralCode } from '../../core/referrals/index';

// ============================================================================
// Helpers
// ============================================================================

function makeSystem(overrides = {}) {
  return createReferralSystem({ codeLength: 8, maxReferralsPerUser: 5, maxUsersPerIp: 3, ...overrides });
}

// ============================================================================
// generateReferralCode
// ============================================================================

describe('ReferralSystem.generateReferralCode', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('returns a code with the configured length', () => {
    const code = sys.generateReferralCode('user_1');
    expect(code.code).toHaveLength(8);
  });

  it('sets ownerId and active flag correctly', () => {
    const code = sys.generateReferralCode('user_1');
    expect(code.ownerId).toBe('user_1');
    expect(code.active).toBe(true);
  });

  it('is idempotent — second call returns same code', () => {
    const first = sys.generateReferralCode('user_1');
    const second = sys.generateReferralCode('user_1');
    expect(first.code).toBe(second.code);
  });

  it('generates unique codes for different users', () => {
    const a = sys.generateReferralCode('user_A');
    const b = sys.generateReferralCode('user_B');
    expect(a.code).not.toBe(b.code);
  });

  it('uses only characters from the configured alphabet', () => {
    const alphabet = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    const code = sys.generateReferralCode('user_1');
    for (const ch of code.code) {
      expect(alphabet.has(ch)).toBe(true);
    }
  });

  it('sets createdAt to a valid ISO date', () => {
    const code = sys.generateReferralCode('user_1');
    expect(() => new Date(code.createdAt)).not.toThrow();
    expect(new Date(code.createdAt).toISOString()).toBe(code.createdAt);
  });

  it('initialises useCount to 0', () => {
    const code = sys.generateReferralCode('user_1');
    expect(code.useCount).toBe(0);
  });
});

// ============================================================================
// getCode
// ============================================================================

describe('ReferralSystem.getCode', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('returns null for unknown code', () => {
    expect(sys.getCode('UNKNOWN0')).toBeNull();
  });

  it('returns code after creation', () => {
    const created = sys.generateReferralCode('user_1');
    const retrieved = sys.getCode(created.code);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.code).toBe(created.code);
  });
});

// ============================================================================
// deactivateCode
// ============================================================================

describe('ReferralSystem.deactivateCode', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('marks code as inactive', () => {
    const code = sys.generateReferralCode('user_1');
    sys.deactivateCode(code.code);
    const retrieved = sys.getCode(code.code);
    expect(retrieved?.active).toBe(false);
  });

  it('prevents trackReferral on deactivated code', () => {
    const code = sys.generateReferralCode('user_1');
    sys.deactivateCode(code.code);
    expect(() => sys.trackReferral(code.code, 'user_2')).toThrow('inactive');
  });
});

// ============================================================================
// trackReferral
// ============================================================================

describe('ReferralSystem.trackReferral', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('creates a pending referral with correct fields', () => {
    const code = sys.generateReferralCode('referrer_1');
    const referral = sys.trackReferral(code.code, 'referee_1');

    expect(referral.id).toMatch(/^ref_/);
    expect(referral.referrerUserId).toBe('referrer_1');
    expect(referral.referredUserId).toBe('referee_1');
    expect(referral.code).toBe(code.code);
    expect(referral.status).toBe('pending');
    expect(referral.createdAt).toBeTruthy();
  });

  it('increments use count on the code', () => {
    const code = sys.generateReferralCode('referrer_1');
    sys.trackReferral(code.code, 'referee_1');
    const updated = sys.getCode(code.code);
    expect(updated?.useCount).toBe(1);
  });

  it('throws for unknown code', () => {
    expect(() => sys.trackReferral('BADCODE1', 'user_1')).toThrow('not found');
  });

  it('throws for self-referral', () => {
    const code = sys.generateReferralCode('user_1');
    expect(() => sys.trackReferral(code.code, 'user_1')).toThrow('Self-referral');
  });

  it('throws if user already has a referral', () => {
    const code = sys.generateReferralCode('referrer_1');
    sys.trackReferral(code.code, 'referee_1');
    expect(() => sys.trackReferral(code.code, 'referee_1')).toThrow('already has a referral');
  });

  it('throws when referrer exceeds rate limit', () => {
    const code = sys.generateReferralCode('referrer_1');
    // max = 5 per system config
    for (let i = 0; i < 5; i++) {
      sys.trackReferral(code.code, `referee_${i}`);
    }
    expect(() => sys.trackReferral(code.code, 'referee_overflow')).toThrow(
      'Rate limit exceeded',
    );
  });

  it('throws on IP abuse (too many users from same IP)', () => {
    const code = sys.generateReferralCode('referrer_1');
    const ipHash = 'abc123hash';
    // maxUsersPerIp = 3 — add 3 users from same IP first (this should succeed)
    sys.trackReferral(code.code, 'u1', { ipHash });
    sys.trackReferral(code.code, 'u2', { ipHash });
    sys.trackReferral(code.code, 'u3', { ipHash });
    // 4th user from same IP should be rejected
    expect(() =>
      sys.trackReferral(code.code, 'u4', { ipHash }),
    ).toThrow('IP abuse');
  });

  it('stores optional metadata', () => {
    const code = sys.generateReferralCode('referrer_1');
    const referral = sys.trackReferral(code.code, 'referee_1', {
      ipHash: 'hash1',
      deviceHash: 'dev1',
      source: 'telegram',
    });
    expect(referral.metadata?.ipHash).toBe('hash1');
    expect(referral.metadata?.source).toBe('telegram');
  });
});

// ============================================================================
// activateReferral
// ============================================================================

describe('ReferralSystem.activateReferral', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  function createPendingReferral(): Referral {
    const code = sys.generateReferralCode('referrer_1');
    return sys.trackReferral(code.code, 'referee_1');
  }

  it('transitions status to active', () => {
    const ref = createPendingReferral();
    const activated = sys.activateReferral(ref.id);
    expect(activated.status).toBe('active');
  });

  it('sets activatedAt timestamp', () => {
    const ref = createPendingReferral();
    const activated = sys.activateReferral(ref.id);
    expect(activated.activatedAt).toBeTruthy();
    expect(() => new Date(activated.activatedAt!)).not.toThrow();
  });

  it('throws for unknown referral ID', () => {
    expect(() => sys.activateReferral('ref_nonexistent')).toThrow('not found');
  });

  it('throws if referral is not pending', () => {
    const ref = createPendingReferral();
    sys.activateReferral(ref.id);
    // Try to activate again
    expect(() => sys.activateReferral(ref.id)).toThrow('cannot be activated');
  });
});

// ============================================================================
// markRewarded
// ============================================================================

describe('ReferralSystem.markRewarded', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('transitions active → rewarded', () => {
    const code = sys.generateReferralCode('referrer_1');
    const ref = sys.trackReferral(code.code, 'referee_1');
    sys.activateReferral(ref.id);
    const rewarded = sys.markRewarded(ref.id);
    expect(rewarded.status).toBe('rewarded');
    expect(rewarded.rewardedAt).toBeTruthy();
  });

  it('throws if not active', () => {
    const code = sys.generateReferralCode('referrer_1');
    const ref = sys.trackReferral(code.code, 'referee_1');
    // Still pending — markRewarded should reject
    expect(() => sys.markRewarded(ref.id)).toThrow('cannot be marked as rewarded');
  });
});

// ============================================================================
// getReferral / getReferralsByReferrer / getReferralByReferee
// ============================================================================

describe('ReferralSystem query methods', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem(); });

  it('getReferral returns null for unknown ID', () => {
    expect(sys.getReferral('ref_unknown')).toBeNull();
  });

  it('getReferral returns saved referral', () => {
    const code = sys.generateReferralCode('r1');
    const ref = sys.trackReferral(code.code, 'e1');
    expect(sys.getReferral(ref.id)).not.toBeNull();
    expect(sys.getReferral(ref.id)!.id).toBe(ref.id);
  });

  it('getReferralsByReferrer returns all referrals for a referrer', () => {
    const code = sys.generateReferralCode('r1');
    sys.trackReferral(code.code, 'e1');
    sys.trackReferral(code.code, 'e2');
    const list = sys.getReferralsByReferrer('r1');
    expect(list).toHaveLength(2);
  });

  it('getReferralsByReferrer returns empty for unknown referrer', () => {
    expect(sys.getReferralsByReferrer('nobody')).toEqual([]);
  });

  it('getReferralByReferee returns the referral for a given referee', () => {
    const code = sys.generateReferralCode('r1');
    const ref = sys.trackReferral(code.code, 'e1');
    expect(sys.getReferralByReferee('e1')?.id).toBe(ref.id);
  });

  it('getReferralByReferee returns null if no referral', () => {
    expect(sys.getReferralByReferee('nobody')).toBeNull();
  });
});

// ============================================================================
// getStats
// ============================================================================

describe('ReferralSystem.getStats', () => {
  let sys: ReferralSystem;

  beforeEach(() => { sys = makeSystem({ maxReferralsPerUser: 100 }); });

  it('returns zeros for new user', () => {
    const stats = sys.getStats('nobody');
    expect(stats.totalReferrals).toBe(0);
    expect(stats.conversionRate).toBe(0);
  });

  it('counts total, pending, active, rewarded', () => {
    const code = sys.generateReferralCode('r1');
    // 3 pending
    sys.trackReferral(code.code, 'e1');
    const ref2 = sys.trackReferral(code.code, 'e2');
    const ref3 = sys.trackReferral(code.code, 'e3');
    // activate 2
    sys.activateReferral(ref2.id);
    sys.activateReferral(ref3.id);
    // reward 1
    sys.markRewarded(ref3.id);

    const stats = sys.getStats('r1');
    expect(stats.totalReferrals).toBe(3);
    expect(stats.pendingReferrals).toBe(1);
    expect(stats.activeReferrals).toBe(1);
    expect(stats.rewardedReferrals).toBe(1);
  });

  it('computes conversion rate correctly', () => {
    const code = sys.generateReferralCode('r1');
    sys.trackReferral(code.code, 'e1'); // pending
    const ref2 = sys.trackReferral(code.code, 'e2');
    sys.activateReferral(ref2.id); // active

    const stats = sys.getStats('r1');
    // 1 of 2 converted = 50%
    expect(stats.conversionRate).toBeCloseTo(50, 1);
  });
});
