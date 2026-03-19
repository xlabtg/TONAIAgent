/**
 * TONAIAgent — Growth API Handler (Issue #277)
 *
 * Framework-agnostic REST handler for the Growth Engine & Viral Loop endpoints.
 *
 * Endpoints:
 *   POST /api/referrals/generate         — generate (or retrieve) referral code for a user
 *   GET  /api/referrals/my               — list referrals for authenticated user
 *   POST /api/referrals/claim            — activate a referral (first-trade trigger)
 *   GET  /api/rewards                    — list rewards for authenticated user
 *   GET  /api/leaderboard/referrals      — top referrers leaderboard
 *
 * Architecture:
 *   Request → GrowthApiHandler.handle() → ReferralSystem / RewardsEngine
 *                                        → buildReferralLeaderboard / computeGrowthMetrics
 *
 * Usage:
 *   ```typescript
 *   const api = createGrowthApi();
 *
 *   const res = await api.handle({
 *     method: 'POST',
 *     path: '/api/referrals/generate',
 *     userId: 'user_123',
 *     body: {},
 *   });
 *   // { statusCode: 200, body: { success: true, data: { code: 'ABC12345', ... } } }
 *   ```
 */

import { ReferralSystem, createReferralSystem } from '../../core/referrals/index';
import { RewardsEngine, createRewardsEngine } from '../rewards/index';
import {
  computeGrowthMetrics,
  buildReferralLeaderboard,
  type ReferralGrowthRecord,
} from '../analytics/index';

// ============================================================================
// API Types
// ============================================================================

export interface GrowthApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  /** Authenticated user ID (populated by auth middleware) */
  userId?: string;
  /** Path params extracted from the URL (e.g. { id: '123' }) */
  params?: Record<string, string>;
  /** Query string params */
  query?: Record<string, string>;
  /** Parsed request body */
  body?: Record<string, unknown>;
  /** Optional metadata for abuse prevention */
  ipHash?: string;
  deviceHash?: string;
}

export interface GrowthApiResponse {
  statusCode: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
}

// ============================================================================
// GrowthApiHandler
// ============================================================================

export class GrowthApiHandler {
  private readonly referrals: ReferralSystem;
  private readonly rewards: RewardsEngine;
  /**
   * In a real deployment this would come from a database query.
   * For this in-memory implementation we accept an injectable data
   * source so tests can supply controlled fixtures.
   */
  private readonly getGrowthRecords: () => ReferralGrowthRecord[];

  constructor(options: {
    referrals?: ReferralSystem;
    rewards?: RewardsEngine;
    growthRecords?: () => ReferralGrowthRecord[];
  } = {}) {
    this.referrals = options.referrals ?? createReferralSystem();
    this.rewards = options.rewards ?? createRewardsEngine();
    this.getGrowthRecords = options.growthRecords ?? (() => []);
  }

  /** Dispatch a request to the correct handler. */
  async handle(req: GrowthApiRequest): Promise<GrowthApiResponse> {
    try {
      const { method, path } = req;

      // POST /api/referrals/generate
      if (method === 'POST' && path === '/api/referrals/generate') {
        return this.handleGenerateCode(req);
      }

      // GET /api/referrals/my
      if (method === 'GET' && path === '/api/referrals/my') {
        return this.handleMyReferrals(req);
      }

      // POST /api/referrals/claim
      if (method === 'POST' && path === '/api/referrals/claim') {
        return this.handleClaimReferral(req);
      }

      // GET /api/rewards
      if (method === 'GET' && path === '/api/rewards') {
        return this.handleGetRewards(req);
      }

      // GET /api/leaderboard/referrals
      if (method === 'GET' && path === '/api/leaderboard/referrals') {
        return this.handleLeaderboard(req);
      }

      return this.notFound(`No route for ${method} ${path}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.error(message);
    }
  }

  // --------------------------------------------------------------------------
  // Route handlers
  // --------------------------------------------------------------------------

  /**
   * POST /api/referrals/generate
   *
   * Generate (or return existing) referral code for the authenticated user.
   *
   * Response:
   *   { code, deepLink, shortLink }
   */
  private handleGenerateCode(req: GrowthApiRequest): GrowthApiResponse {
    const userId = this.requireAuth(req);

    const codeEntry = this.referrals.generateReferralCode(userId);
    const deepLink = `https://t.me/TONAIAgentBot?start=ref_${codeEntry.code}`;
    const shortLink = `https://tonai.link/r/${codeEntry.code}`;

    return this.ok({
      code: codeEntry.code,
      ownerId: codeEntry.ownerId,
      active: codeEntry.active,
      useCount: codeEntry.useCount,
      createdAt: codeEntry.createdAt,
      deepLink,
      shortLink,
    });
  }

  /**
   * GET /api/referrals/my
   *
   * List all referrals where the authenticated user is the referrer.
   *
   * Response:
   *   { referrals: Referral[], stats: ReferralStats }
   */
  private handleMyReferrals(req: GrowthApiRequest): GrowthApiResponse {
    const userId = this.requireAuth(req);
    const referralList = this.referrals.getReferralsByReferrer(userId);
    const stats = this.referrals.getStats(userId);

    return this.ok({ referrals: referralList, stats });
  }

  /**
   * POST /api/referrals/claim
   *
   * Activate a referral for the authenticated user (called after first trade).
   *
   * Body: { referralId: string }
   *
   * Response:
   *   { referral, rewards: [referrerReward, refereeReward] }
   */
  private handleClaimReferral(req: GrowthApiRequest): GrowthApiResponse {
    const userId = this.requireAuth(req);
    const referralId = req.body?.referralId as string | undefined;

    if (!referralId) {
      return this.badRequest('referralId is required in request body');
    }

    const referral = this.referrals.getReferral(referralId);
    if (!referral) {
      return this.notFound(`Referral not found: ${referralId}`);
    }

    // Only the referred user can claim their own referral
    if (referral.referredUserId !== userId) {
      return this.forbidden('You can only claim your own referral');
    }

    const activated = this.referrals.activateReferral(referralId);

    // Issue rewards via the rewards engine
    const [referrerReward, refereeReward] = this.rewards.issueReferralRewards(
      referralId,
      activated.referrerUserId,
      activated.referredUserId,
    );

    return this.ok({
      referral: activated,
      rewards: [referrerReward, refereeReward],
    });
  }

  /**
   * GET /api/rewards
   *
   * List all rewards for the authenticated user.
   *
   * Query params:
   *   status  - filter by status (pending | approved | paid | all)
   *
   * Response:
   *   { rewards: Reward[], totalEarnedUsd: number }
   */
  private handleGetRewards(req: GrowthApiRequest): GrowthApiResponse {
    const userId = this.requireAuth(req);
    const statusFilter = req.query?.status ?? 'all';

    let rewardList = this.rewards.getRewardsByUser(userId);
    if (statusFilter !== 'all') {
      rewardList = rewardList.filter(r => r.status === statusFilter);
    }

    const totalEarnedUsd = this.rewards.getTotalEarnedByUser(userId);

    return this.ok({ rewards: rewardList, totalEarnedUsd });
  }

  /**
   * GET /api/leaderboard/referrals
   *
   * Top referrers leaderboard, sorted by total LTV generated.
   *
   * Query params:
   *   limit  - max entries to return (default: 20)
   *
   * Response:
   *   { leaderboard: ReferralLeaderboardEntry[], metrics: GrowthMetrics }
   */
  private handleLeaderboard(req: GrowthApiRequest): GrowthApiResponse {
    const limit = Math.min(
      parseInt(req.query?.limit ?? '20', 10) || 20,
      100,
    );

    const records = this.getGrowthRecords();
    const leaderboard = buildReferralLeaderboard(records, limit);
    const metrics = computeGrowthMetrics(records);

    return this.ok({ leaderboard, metrics });
  }

  // --------------------------------------------------------------------------
  // Auth helper
  // --------------------------------------------------------------------------

  private requireAuth(req: GrowthApiRequest): string {
    if (!req.userId) {
      throw Object.assign(new Error('Authentication required'), {
        statusCode: 401,
      });
    }
    return req.userId;
  }

  // --------------------------------------------------------------------------
  // Response helpers
  // --------------------------------------------------------------------------

  private ok(data: unknown): GrowthApiResponse {
    return { statusCode: 200, body: { success: true, data } };
  }

  private badRequest(msg: string): GrowthApiResponse {
    return { statusCode: 400, body: { success: false, error: msg } };
  }

  private forbidden(msg: string): GrowthApiResponse {
    return { statusCode: 403, body: { success: false, error: msg } };
  }

  private notFound(msg: string): GrowthApiResponse {
    return { statusCode: 404, body: { success: false, error: msg } };
  }

  private error(msg: string): GrowthApiResponse {
    return { statusCode: 500, body: { success: false, error: msg } };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createGrowthApi(options?: {
  referrals?: ReferralSystem;
  rewards?: RewardsEngine;
  growthRecords?: () => ReferralGrowthRecord[];
}): GrowthApiHandler {
  return new GrowthApiHandler(options);
}

export default GrowthApiHandler;
