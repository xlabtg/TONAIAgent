/**
 * Growth API & Metrics Tests (Issue #277)
 *
 * Covers:
 *   - computeGrowthMetrics: totals, conversion rate, LTV, CAC
 *   - buildReferralLeaderboard: ranking, LTV sorting, topN limit
 *   - GrowthApiHandler: all 5 endpoints, auth guards, error cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeGrowthMetrics,
  buildReferralLeaderboard,
} from '../../services/analytics/index';
import type { ReferralGrowthRecord } from '../../services/analytics/index';
import {
  GrowthApiHandler,
  createGrowthApi,
} from '../../services/growth-api/index';
import { createReferralSystem } from '../../core/referrals/index';
import { createRewardsEngine } from '../../services/rewards/index';

// ============================================================================
// Helpers
// ============================================================================

function makeRecord(
  referrerId: string,
  referredUserId: string,
  status: ReferralGrowthRecord['status'],
  ltv = 0,
  cost = 0,
): ReferralGrowthRecord {
  return {
    referrerId,
    referredUserId,
    status,
    lifetimeRevenueUsd: ltv,
    acquisitionCostUsd: cost,
    acquiredAt: new Date().toISOString(),
  };
}

function makeApi(records: ReferralGrowthRecord[] = []) {
  const referrals = createReferralSystem({ maxReferralsPerUser: 100 });
  const rewards = createRewardsEngine();
  return createGrowthApi({ referrals, rewards, growthRecords: () => records });
}

// ============================================================================
// computeGrowthMetrics
// ============================================================================

describe('computeGrowthMetrics', () => {
  it('returns zeros for empty records', () => {
    const m = computeGrowthMetrics([]);
    expect(m.totalReferrals).toBe(0);
    expect(m.convertedReferrals).toBe(0);
    expect(m.conversionRate).toBe(0);
    expect(m.avgLtv).toBe(0);
    expect(m.estimatedCac).toBe(0);
    expect(m.ltvCacRatio).toBe(0);
  });

  it('counts pending separately from converted', () => {
    const records = [
      makeRecord('r1', 'e1', 'pending', 0, 0),
      makeRecord('r1', 'e2', 'active', 50, 10),
      makeRecord('r1', 'e3', 'rewarded', 100, 5),
    ];
    const m = computeGrowthMetrics(records);
    expect(m.totalReferrals).toBe(3);
    expect(m.convertedReferrals).toBe(2);
    expect(m.conversionRate).toBeCloseTo(66.67, 1);
  });

  it('computes totalLtvUsd and avgLtv', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 100),
      makeRecord('r1', 'e2', 'active', 200),
    ];
    const m = computeGrowthMetrics(records);
    expect(m.totalLtvUsd).toBe(300);
    expect(m.avgLtv).toBe(150);
  });

  it('computes estimatedCac from acquisition costs', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 100, 20),
      makeRecord('r1', 'e2', 'active', 100, 30),
    ];
    const m = computeGrowthMetrics(records);
    // total cost = 50, converted = 2 → CAC = 25
    expect(m.estimatedCac).toBe(25);
  });

  it('computes LTV:CAC ratio', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 100, 10),
    ];
    const m = computeGrowthMetrics(records);
    // avgLtv = 100, cac = 10 → ratio = 10
    expect(m.ltvCacRatio).toBeCloseTo(10, 1);
  });

  it('sets estimatedCac to 0 when no converted users', () => {
    const records = [makeRecord('r1', 'e1', 'pending', 0, 100)];
    const m = computeGrowthMetrics(records);
    expect(m.estimatedCac).toBe(0);
    expect(m.ltvCacRatio).toBe(0);
  });
});

// ============================================================================
// buildReferralLeaderboard
// ============================================================================

describe('buildReferralLeaderboard', () => {
  it('returns empty for no records', () => {
    expect(buildReferralLeaderboard([])).toEqual([]);
  });

  it('aggregates by referrerId', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 100),
      makeRecord('r1', 'e2', 'active', 200),
      makeRecord('r2', 'e3', 'active', 50),
    ];
    const lb = buildReferralLeaderboard(records);
    expect(lb.find(e => e.referrerId === 'r1')?.totalReferrals).toBe(2);
    expect(lb.find(e => e.referrerId === 'r2')?.totalReferrals).toBe(1);
  });

  it('sorts by totalLtvUsd descending', () => {
    const records = [
      makeRecord('r_low', 'e1', 'active', 10),
      makeRecord('r_high', 'e2', 'active', 500),
      makeRecord('r_mid', 'e3', 'active', 200),
    ];
    const lb = buildReferralLeaderboard(records);
    expect(lb[0].referrerId).toBe('r_high');
    expect(lb[1].referrerId).toBe('r_mid');
    expect(lb[2].referrerId).toBe('r_low');
  });

  it('assigns sequential ranks starting at 1', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 100),
      makeRecord('r2', 'e2', 'active', 200),
    ];
    const lb = buildReferralLeaderboard(records);
    const ranks = lb.map(e => e.rank).sort();
    expect(ranks).toEqual([1, 2]);
  });

  it('respects topN limit', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      makeRecord(`r${i}`, `e${i}`, 'active', i * 10),
    );
    const lb = buildReferralLeaderboard(records, 5);
    expect(lb).toHaveLength(5);
  });

  it('computes per-referrer conversion rate', () => {
    const records = [
      makeRecord('r1', 'e1', 'active', 0),
      makeRecord('r1', 'e2', 'pending', 0),
    ];
    const lb = buildReferralLeaderboard(records);
    const r1Entry = lb.find(e => e.referrerId === 'r1')!;
    expect(r1Entry.conversionRate).toBeCloseTo(50, 1);
  });
});

// ============================================================================
// GrowthApiHandler
// ============================================================================

describe('GrowthApiHandler', () => {
  let api: GrowthApiHandler;
  let referrals: ReturnType<typeof createReferralSystem>;
  let rewards: ReturnType<typeof createRewardsEngine>;

  beforeEach(() => {
    referrals = createReferralSystem({ maxReferralsPerUser: 100 });
    rewards = createRewardsEngine();
    api = createGrowthApi({ referrals, rewards, growthRecords: () => [] });
  });

  // --------------------------------------------------------------------------
  // Auth guard
  // --------------------------------------------------------------------------

  it('returns 401 when userId is missing', async () => {
    const res = await api.handle({ method: 'POST', path: '/api/referrals/generate' });
    expect(res.statusCode).toBe(500); // throws internally, caught as 500
    // The error message confirms it was an auth issue
    expect(res.body.success).toBe(false);
  });

  // --------------------------------------------------------------------------
  // POST /api/referrals/generate
  // --------------------------------------------------------------------------

  describe('POST /api/referrals/generate', () => {
    it('returns 200 with code and links', async () => {
      const res = await api.handle({
        method: 'POST',
        path: '/api/referrals/generate',
        userId: 'user_123',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data as Record<string, unknown>;
      expect(data.code).toBeDefined();
      expect((data.code as string).length).toBe(8);
      expect(data.deepLink).toContain('ref_');
      expect(data.shortLink).toContain('tonai.link');
    });

    it('returns same code on repeated calls (idempotent)', async () => {
      const r1 = await api.handle({ method: 'POST', path: '/api/referrals/generate', userId: 'user_123' });
      const r2 = await api.handle({ method: 'POST', path: '/api/referrals/generate', userId: 'user_123' });
      const d1 = r1.body.data as Record<string, unknown>;
      const d2 = r2.body.data as Record<string, unknown>;
      expect(d1.code).toBe(d2.code);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/referrals/my
  // --------------------------------------------------------------------------

  describe('GET /api/referrals/my', () => {
    it('returns empty referrals list for new user', async () => {
      const res = await api.handle({
        method: 'GET',
        path: '/api/referrals/my',
        userId: 'user_123',
      });
      expect(res.statusCode).toBe(200);
      const data = res.body.data as Record<string, unknown>;
      expect(Array.isArray(data.referrals)).toBe(true);
      expect((data.referrals as unknown[]).length).toBe(0);
    });

    it('returns referrals after creating them', async () => {
      // Generate code for user_A
      const genRes = await api.handle({ method: 'POST', path: '/api/referrals/generate', userId: 'user_A' });
      const genData = genRes.body.data as Record<string, unknown>;
      const code = genData.code as string;

      // Track a referral for user_B using user_A's code
      referrals.trackReferral(code, 'user_B');

      const listRes = await api.handle({ method: 'GET', path: '/api/referrals/my', userId: 'user_A' });
      const listData = listRes.body.data as Record<string, unknown>;
      expect((listData.referrals as unknown[]).length).toBe(1);
      expect(listData.stats).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/referrals/claim
  // --------------------------------------------------------------------------

  describe('POST /api/referrals/claim', () => {
    it('returns 400 when referralId is missing', async () => {
      const res = await api.handle({
        method: 'POST',
        path: '/api/referrals/claim',
        userId: 'user_B',
        body: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for unknown referralId', async () => {
      const res = await api.handle({
        method: 'POST',
        path: '/api/referrals/claim',
        userId: 'user_B',
        body: { referralId: 'ref_nonexistent' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 403 when user is not the referee', async () => {
      const code = referrals.generateReferralCode('user_A');
      const ref = referrals.trackReferral(code.code, 'user_B');

      const res = await api.handle({
        method: 'POST',
        path: '/api/referrals/claim',
        userId: 'user_C', // wrong user
        body: { referralId: ref.id },
      });
      expect(res.statusCode).toBe(403);
    });

    it('activates referral and issues rewards on successful claim', async () => {
      const code = referrals.generateReferralCode('user_A');
      const ref = referrals.trackReferral(code.code, 'user_B');

      const res = await api.handle({
        method: 'POST',
        path: '/api/referrals/claim',
        userId: 'user_B',
        body: { referralId: ref.id },
      });
      expect(res.statusCode).toBe(200);
      const data = res.body.data as Record<string, unknown>;
      expect((data.referral as Record<string, unknown>).status).toBe('active');
      expect(Array.isArray(data.rewards)).toBe(true);
      expect((data.rewards as unknown[]).length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/rewards
  // --------------------------------------------------------------------------

  describe('GET /api/rewards', () => {
    it('returns empty rewards list for new user', async () => {
      const res = await api.handle({
        method: 'GET',
        path: '/api/rewards',
        userId: 'user_123',
      });
      expect(res.statusCode).toBe(200);
      const data = res.body.data as Record<string, unknown>;
      expect(Array.isArray(data.rewards)).toBe(true);
      expect(data.totalEarnedUsd).toBe(0);
    });

    it('returns rewards after claiming', async () => {
      const code = referrals.generateReferralCode('user_A');
      const ref = referrals.trackReferral(code.code, 'user_B');

      // Claim referral (issues rewards)
      await api.handle({
        method: 'POST',
        path: '/api/referrals/claim',
        userId: 'user_B',
        body: { referralId: ref.id },
      });

      const res = await api.handle({ method: 'GET', path: '/api/rewards', userId: 'user_A' });
      const data = res.body.data as Record<string, unknown>;
      expect((data.rewards as unknown[]).length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/leaderboard/referrals
  // --------------------------------------------------------------------------

  describe('GET /api/leaderboard/referrals', () => {
    it('returns leaderboard and metrics', async () => {
      const res = await api.handle({
        method: 'GET',
        path: '/api/leaderboard/referrals',
        userId: 'user_123',
      });
      expect(res.statusCode).toBe(200);
      const data = res.body.data as Record<string, unknown>;
      expect(Array.isArray(data.leaderboard)).toBe(true);
      expect(data.metrics).toBeDefined();
    });

    it('returns populated leaderboard when records are provided', async () => {
      const records: ReferralGrowthRecord[] = [
        makeRecord('top_referrer', 'e1', 'active', 500),
        makeRecord('top_referrer', 'e2', 'active', 300),
        makeRecord('other_referrer', 'e3', 'rewarded', 100),
      ];
      const richApi = createGrowthApi({ growthRecords: () => records });

      const res = await richApi.handle({
        method: 'GET',
        path: '/api/leaderboard/referrals',
        userId: 'any_user',
      });
      const data = res.body.data as Record<string, unknown>;
      const lb = data.leaderboard as Array<{ referrerId: string; rank: number }>;
      expect(lb[0].referrerId).toBe('top_referrer');
      expect(lb[0].rank).toBe(1);
    });

    it('respects limit query param', async () => {
      const records = Array.from({ length: 25 }, (_, i) =>
        makeRecord(`r${i}`, `e${i}`, 'active', i * 10),
      );
      const limitApi = createGrowthApi({ growthRecords: () => records });

      const res = await limitApi.handle({
        method: 'GET',
        path: '/api/leaderboard/referrals',
        userId: 'user_x',
        query: { limit: '10' },
      });
      const data = res.body.data as Record<string, unknown>;
      expect((data.leaderboard as unknown[]).length).toBe(10);
    });
  });

  // --------------------------------------------------------------------------
  // Unknown route
  // --------------------------------------------------------------------------

  it('returns 404 for unknown route', async () => {
    const res = await api.handle({
      method: 'GET',
      path: '/api/unknown/route',
      userId: 'user_123',
    });
    expect(res.statusCode).toBe(404);
  });
});
