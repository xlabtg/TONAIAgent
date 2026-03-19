/**
 * Strategy Registry Tests (Issue #273)
 *
 * Tests for the core Strategy Registry that powers the Marketplace:
 * - StrategyDefinition publishing and CRUD
 * - StrategySubscription lifecycle
 * - Performance-based ranking formula
 * - Monetization models
 * - RBAC: owner-only edit, admin override, subscription gating
 * - Multi-user isolation: no cross-user leaks
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  DefaultStrategyRegistry,
  createStrategyRegistry,
  calculateRankingScore,
} from '../../core/strategies/registry';

import type {
  StrategyDefinition,
  StrategySubscription,
  PublishStrategyInput,
  StrategyFilter,
} from '../../core/strategies/registry';

// ============================================================================
// Helpers
// ============================================================================

function makePublishInput(overrides: Partial<PublishStrategyInput> = {}): PublishStrategyInput {
  return {
    name: 'Test Strategy',
    description: 'A test strategy',
    creatorId: 'user_creator',
    creatorName: 'Alice',
    type: 'trend',
    riskLevel: 5,
    ...overrides,
  };
}

// ============================================================================
// calculateRankingScore
// ============================================================================

describe('calculateRankingScore', () => {
  it('should produce max score for perfect metrics', () => {
    // winRate=1, avgPnL=1, drawdown=0 → 0.4 + 0.3 + 0.3 = 1.0
    expect(calculateRankingScore(1, 1, 0)).toBeCloseTo(1.0);
  });

  it('should produce zero score for zero metrics', () => {
    // winRate=0, avgPnL=0, drawdown=1 → 0 + 0 + 0 = 0
    expect(calculateRankingScore(0, 0, 1)).toBeCloseTo(0);
  });

  it('should apply formula: winRate×0.4 + avgPnL×0.3 + (1-drawdown)×0.3', () => {
    const score = calculateRankingScore(0.68, 0.55, 0.12);
    const expected = 0.68 * 0.4 + 0.55 * 0.3 + (1 - 0.12) * 0.3;
    expect(score).toBeCloseTo(expected);
  });

  it('should clamp inputs above 1 to 1', () => {
    const clamped = calculateRankingScore(1.5, 1.5, -0.5);
    const normal = calculateRankingScore(1, 1, 0);
    expect(clamped).toBeCloseTo(normal);
  });

  it('should produce different scores for different metrics', () => {
    const highWinRate = calculateRankingScore(0.9, 0.4, 0.1);
    const highPnL = calculateRankingScore(0.4, 0.9, 0.1);
    expect(highWinRate).not.toBeCloseTo(highPnL);
  });

  it('should weight drawdown penalty correctly', () => {
    const lowDrawdown = calculateRankingScore(0.6, 0.5, 0.05);
    const highDrawdown = calculateRankingScore(0.6, 0.5, 0.5);
    expect(lowDrawdown).toBeGreaterThan(highDrawdown);
  });
});

// ============================================================================
// DefaultStrategyRegistry — Publishing
// ============================================================================

describe('DefaultStrategyRegistry — publishing', () => {
  let registry: DefaultStrategyRegistry;

  beforeEach(() => {
    registry = createStrategyRegistry(['admin_001']);
  });

  it('should publish a strategy and return a StrategyDefinition', async () => {
    const strat = await registry.publishStrategy(makePublishInput());
    expect(strat.id).toBeDefined();
    expect(strat.name).toBe('Test Strategy');
    expect(strat.creatorId).toBe('user_creator');
    expect(strat.type).toBe('trend');
    expect(strat.riskLevel).toBe(5);
    expect(strat.isPublic).toBe(true);
    expect(strat.verified).toBe(false);
    expect(strat.suspended).toBe(false);
    expect(strat.subscriberCount).toBe(0);
    expect(strat.revenueModel).toBe('free');
  });

  it('should assign a unique ID to each published strategy', async () => {
    const a = await registry.publishStrategy(makePublishInput({ name: 'A' }));
    const b = await registry.publishStrategy(makePublishInput({ name: 'B' }));
    expect(a.id).not.toBe(b.id);
  });

  it('should initialize performance metrics on publish', async () => {
    const strat = await registry.publishStrategy(makePublishInput());
    const perf = await registry.getStrategyPerformance(strat.id);
    expect(perf).not.toBeNull();
    expect(perf!.strategyId).toBe(strat.id);
    expect(perf!.winRate).toBe(0);
    expect(perf!.totalTrades).toBe(0);
  });

  it('should throw when name is empty', async () => {
    await expect(registry.publishStrategy(makePublishInput({ name: '' }))).rejects.toThrow();
  });

  it('should throw when riskLevel is out of range', async () => {
    await expect(registry.publishStrategy(makePublishInput({ riskLevel: 0 }))).rejects.toThrow();
    await expect(registry.publishStrategy(makePublishInput({ riskLevel: 11 }))).rejects.toThrow();
  });

  it('should set revenueModel correctly', async () => {
    const strat = await registry.publishStrategy(
      makePublishInput({ revenueModel: 'performance_fee', performanceFeePercent: 20 })
    );
    expect(strat.revenueModel).toBe('performance_fee');
    expect(strat.performanceFeePercent).toBe(20);
  });

  it('should support subscription revenue model', async () => {
    const strat = await registry.publishStrategy(
      makePublishInput({ revenueModel: 'subscription', subscriptionFeeUsd: 29 })
    );
    expect(strat.revenueModel).toBe('subscription');
    expect(strat.subscriptionFeeUsd).toBe(29);
  });

  it('should default isPublic to true', async () => {
    const strat = await registry.publishStrategy(makePublishInput());
    expect(strat.isPublic).toBe(true);
  });

  it('should allow publishing private strategies', async () => {
    const strat = await registry.publishStrategy(makePublishInput({ isPublic: false }));
    expect(strat.isPublic).toBe(false);
  });
});

// ============================================================================
// DefaultStrategyRegistry — getStrategy / listStrategies
// ============================================================================

describe('DefaultStrategyRegistry — discovery', () => {
  let registry: DefaultStrategyRegistry;
  let s1: StrategyDefinition;
  let s2: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry(['admin_001']);
    s1 = await registry.publishStrategy(makePublishInput({
      name: 'Trend Strategy',
      creatorId: 'creator_A',
      type: 'trend',
      riskLevel: 4,
      tags: ['trend'],
    }));
    s2 = await registry.publishStrategy(makePublishInput({
      name: 'Arb Bot',
      creatorId: 'creator_B',
      type: 'arbitrage',
      riskLevel: 7,
      revenueModel: 'performance_fee',
      performanceFeePercent: 15,
      tags: ['arbitrage'],
    }));
  });

  it('should retrieve a strategy by ID', async () => {
    const found = await registry.getStrategy(s1.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Trend Strategy');
  });

  it('should return null for unknown strategy', async () => {
    const found = await registry.getStrategy('nonexistent-id');
    expect(found).toBeNull();
  });

  it('should list all public strategies', async () => {
    const result = await registry.listStrategies();
    expect(result.strategies.length).toBe(2);
    expect(result.total).toBe(2);
  });

  it('should filter by type', async () => {
    const result = await registry.listStrategies({ type: 'arbitrage' });
    expect(result.strategies.length).toBe(1);
    expect(result.strategies[0].type).toBe('arbitrage');
  });

  it('should filter by revenueModel', async () => {
    const result = await registry.listStrategies({ revenueModel: 'performance_fee' });
    expect(result.strategies.length).toBe(1);
    expect(result.strategies[0].id).toBe(s2.id);
  });

  it('should filter by maxRiskLevel', async () => {
    const result = await registry.listStrategies({ maxRiskLevel: 5 });
    expect(result.strategies.every(s => s.riskLevel <= 5)).toBe(true);
  });

  it('should filter by text search (name)', async () => {
    const result = await registry.listStrategies({ search: 'Arb' });
    expect(result.strategies.length).toBe(1);
    expect(result.strategies[0].type).toBe('arbitrage');
  });

  it('should filter by text search (tags)', async () => {
    const result = await registry.listStrategies({ search: 'trend' });
    expect(result.strategies.some(s => s.id === s1.id)).toBe(true);
  });

  it('should not list suspended strategies', async () => {
    await registry.suspendStrategy(s1.id, 'admin_001');
    const result = await registry.listStrategies();
    expect(result.strategies.find(s => s.id === s1.id)).toBeUndefined();
  });

  it('should not list private strategies', async () => {
    const priv = await registry.publishStrategy(makePublishInput({ isPublic: false, name: 'Private' }));
    const result = await registry.listStrategies();
    expect(result.strategies.find(s => s.id === priv.id)).toBeUndefined();
  });

  it('should paginate results', async () => {
    const page1 = await registry.listStrategies({ limit: 1, offset: 0 });
    const page2 = await registry.listStrategies({ limit: 1, offset: 1 });
    expect(page1.strategies.length).toBe(1);
    expect(page2.strategies.length).toBe(1);
    expect(page1.strategies[0].id).not.toBe(page2.strategies[0].id);
    expect(page1.hasMore).toBe(true);
    expect(page2.hasMore).toBe(false);
  });

  it('should sort by subscribers descending', async () => {
    await registry.subscribeToStrategy('user_x', s2.id, 10);
    const result = await registry.listStrategies({ sortBy: 'subscribers', sortOrder: 'desc' });
    expect(result.strategies[0].id).toBe(s2.id);
  });
});

// ============================================================================
// DefaultStrategyRegistry — update / unpublish
// ============================================================================

describe('DefaultStrategyRegistry — update / unpublish', () => {
  let registry: DefaultStrategyRegistry;
  let strat: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry(['admin_001']);
    strat = await registry.publishStrategy(makePublishInput());
  });

  it('should allow owner to update strategy', async () => {
    const updated = await registry.updateStrategy(strat.id, 'user_creator', {
      name: 'Updated Name',
      riskLevel: 7,
    });
    expect(updated.name).toBe('Updated Name');
    expect(updated.riskLevel).toBe(7);
  });

  it('should allow admin to update strategy', async () => {
    const updated = await registry.updateStrategy(strat.id, 'admin_001', { name: 'Admin Edit' });
    expect(updated.name).toBe('Admin Edit');
  });

  it('should reject update by non-owner non-admin', async () => {
    await expect(
      registry.updateStrategy(strat.id, 'other_user', { name: 'Hack' })
    ).rejects.toThrow();
  });

  it('should allow owner to unpublish strategy', async () => {
    await registry.unpublishStrategy(strat.id, 'user_creator');
    const found = await registry.getStrategy(strat.id);
    expect(found!.isPublic).toBe(false);
  });

  it('should reject unpublish by non-owner', async () => {
    await expect(
      registry.unpublishStrategy(strat.id, 'hacker')
    ).rejects.toThrow();
  });
});

// ============================================================================
// DefaultStrategyRegistry — subscriptions
// ============================================================================

describe('DefaultStrategyRegistry — subscriptions', () => {
  let registry: DefaultStrategyRegistry;
  let strat: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry(['admin_001']);
    strat = await registry.publishStrategy(makePublishInput());
  });

  it('should subscribe a user to a strategy', async () => {
    const sub = await registry.subscribeToStrategy('user_A', strat.id, 20);
    expect(sub.userId).toBe('user_A');
    expect(sub.strategyId).toBe(strat.id);
    expect(sub.allocation).toBe(20);
    expect(sub.status).toBe('active');
  });

  it('should increment subscriberCount on subscribe', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    const found = await registry.getStrategy(strat.id);
    expect(found!.subscriberCount).toBe(1);
  });

  it('should return active subscriptions for a user', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 15);
    const subs = await registry.getUserSubscriptions('user_A');
    expect(subs.length).toBe(1);
    expect(subs[0].allocation).toBe(15);
  });

  it('should report isSubscribed correctly', async () => {
    expect(await registry.isSubscribed('user_A', strat.id)).toBe(false);
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    expect(await registry.isSubscribed('user_A', strat.id)).toBe(true);
  });

  it('should allow unsubscribing', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    await registry.unsubscribeFromStrategy('user_A', strat.id);
    expect(await registry.isSubscribed('user_A', strat.id)).toBe(false);
  });

  it('should decrement subscriberCount on unsubscribe', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    await registry.unsubscribeFromStrategy('user_A', strat.id);
    const found = await registry.getStrategy(strat.id);
    expect(found!.subscriberCount).toBe(0);
  });

  it('should throw when unsubscribing with no active subscription', async () => {
    await expect(
      registry.unsubscribeFromStrategy('user_X', strat.id)
    ).rejects.toThrow();
  });

  it('should prevent duplicate active subscriptions', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    await expect(
      registry.subscribeToStrategy('user_A', strat.id, 20)
    ).rejects.toThrow();
  });

  it('should reject invalid allocation percentage', async () => {
    await expect(registry.subscribeToStrategy('user_A', strat.id, -1)).rejects.toThrow();
    await expect(registry.subscribeToStrategy('user_A', strat.id, 101)).rejects.toThrow();
  });

  it('should reject subscribing to private strategy', async () => {
    const priv = await registry.publishStrategy(makePublishInput({ isPublic: false, name: 'Private' }));
    await expect(registry.subscribeToStrategy('user_B', priv.id, 10)).rejects.toThrow();
  });

  it('should isolate subscriptions between users', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    const subsBfora = await registry.getUserSubscriptions('user_A');
    const subsB = await registry.getUserSubscriptions('user_B');
    expect(subsBfora.length).toBe(1);
    expect(subsB.length).toBe(0);
  });

  it('owner can view subscribers list', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    await registry.subscribeToStrategy('user_B', strat.id, 20);
    const subs = await registry.getStrategySubscribers(strat.id, 'user_creator');
    expect(subs.length).toBe(2);
  });

  it('non-owner cannot view subscribers list', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    await expect(
      registry.getStrategySubscribers(strat.id, 'outsider')
    ).rejects.toThrow();
  });

  it('admin can view subscribers list', async () => {
    await registry.subscribeToStrategy('user_A', strat.id, 10);
    const subs = await registry.getStrategySubscribers(strat.id, 'admin_001');
    expect(subs.length).toBe(1);
  });
});

// ============================================================================
// DefaultStrategyRegistry — canExecuteStrategy (RBAC)
// ============================================================================

describe('DefaultStrategyRegistry — canExecuteStrategy', () => {
  let registry: DefaultStrategyRegistry;
  let freeStrat: StrategyDefinition;
  let paidStrat: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry(['admin_001']);
    freeStrat = await registry.publishStrategy(makePublishInput({
      name: 'Free',
      revenueModel: 'free',
      creatorId: 'creator_X',
    }));
    paidStrat = await registry.publishStrategy(makePublishInput({
      name: 'Premium',
      revenueModel: 'performance_fee',
      performanceFeePercent: 20,
      creatorId: 'creator_X',
    }));
  });

  it('should allow anyone to execute a free strategy', async () => {
    expect(await registry.canExecuteStrategy('any_user', freeStrat.id)).toBe(true);
  });

  it('should allow owner to execute their own premium strategy', async () => {
    expect(await registry.canExecuteStrategy('creator_X', paidStrat.id)).toBe(true);
  });

  it('should allow admin to execute any strategy', async () => {
    expect(await registry.canExecuteStrategy('admin_001', paidStrat.id)).toBe(true);
  });

  it('should deny non-subscriber from executing premium strategy', async () => {
    expect(await registry.canExecuteStrategy('non_subscriber', paidStrat.id)).toBe(false);
  });

  it('should allow subscriber to execute premium strategy', async () => {
    await registry.subscribeToStrategy('subscriber_user', paidStrat.id, 10);
    expect(await registry.canExecuteStrategy('subscriber_user', paidStrat.id)).toBe(true);
  });

  it('should deny after unsubscribing from premium strategy', async () => {
    await registry.subscribeToStrategy('subscriber_user', paidStrat.id, 10);
    await registry.unsubscribeFromStrategy('subscriber_user', paidStrat.id);
    expect(await registry.canExecuteStrategy('subscriber_user', paidStrat.id)).toBe(false);
  });

  it('should deny execution of suspended strategy', async () => {
    await registry.suspendStrategy(freeStrat.id, 'admin_001');
    expect(await registry.canExecuteStrategy('any_user', freeStrat.id)).toBe(false);
  });
});

// ============================================================================
// DefaultStrategyRegistry — performance updates & ranking
// ============================================================================

describe('DefaultStrategyRegistry — performance & ranking', () => {
  let registry: DefaultStrategyRegistry;
  let stratA: StrategyDefinition;
  let stratB: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry();
    stratA = await registry.publishStrategy(makePublishInput({ name: 'High Performance', creatorId: 'c1' }));
    stratB = await registry.publishStrategy(makePublishInput({ name: 'Low Performance', creatorId: 'c2' }));
  });

  it('should update performance metrics', async () => {
    await registry.updatePerformance(stratA.id, {
      winRate: 0.75,
      avgPnLNormalized: 0.6,
      maxDrawdown: 0.1,
      roi30d: 12.5,
      totalTrades: 300,
    });

    const perf = await registry.getStrategyPerformance(stratA.id);
    expect(perf!.winRate).toBe(0.75);
    expect(perf!.roi30d).toBe(12.5);
    expect(perf!.totalTrades).toBe(300);
  });

  it('should recompute rankingScore after update', async () => {
    await registry.updatePerformance(stratA.id, {
      winRate: 0.8,
      avgPnLNormalized: 0.7,
      maxDrawdown: 0.05,
    });
    const perf = await registry.getStrategyPerformance(stratA.id);
    const expected = calculateRankingScore(0.8, 0.7, 0.05);
    expect(perf!.rankingScore).toBeCloseTo(expected);
  });

  it('should sort strategies by ranking score', async () => {
    await registry.updatePerformance(stratA.id, { winRate: 0.9, avgPnLNormalized: 0.8, maxDrawdown: 0.05 });
    await registry.updatePerformance(stratB.id, { winRate: 0.3, avgPnLNormalized: 0.2, maxDrawdown: 0.4 });

    const result = await registry.listStrategies({ sortBy: 'score', sortOrder: 'desc' });
    expect(result.strategies[0].id).toBe(stratA.id);
    expect(result.strategies[1].id).toBe(stratB.id);
  });

  it('should filter by minScore', async () => {
    await registry.updatePerformance(stratA.id, { winRate: 0.9, avgPnLNormalized: 0.8, maxDrawdown: 0.05 });
    await registry.updatePerformance(stratB.id, { winRate: 0.3, avgPnLNormalized: 0.2, maxDrawdown: 0.4 });

    const highScore = calculateRankingScore(0.9, 0.8, 0.05);
    const result = await registry.listStrategies({ minScore: highScore - 0.01 });
    expect(result.strategies.length).toBe(1);
    expect(result.strategies[0].id).toBe(stratA.id);
  });
});

// ============================================================================
// DefaultStrategyRegistry — admin operations
// ============================================================================

describe('DefaultStrategyRegistry — admin operations', () => {
  let registry: DefaultStrategyRegistry;
  let strat: StrategyDefinition;

  beforeEach(async () => {
    registry = createStrategyRegistry(['admin_001']);
    strat = await registry.publishStrategy(makePublishInput());
  });

  it('should verify a strategy (admin only)', async () => {
    await registry.verifyStrategy(strat.id, 'admin_001');
    const found = await registry.getStrategy(strat.id);
    expect(found!.verified).toBe(true);
  });

  it('should reject verify by non-admin', async () => {
    await expect(registry.verifyStrategy(strat.id, 'random_user')).rejects.toThrow();
  });

  it('should suspend a strategy (admin only)', async () => {
    await registry.suspendStrategy(strat.id, 'admin_001');
    const found = await registry.getStrategy(strat.id);
    expect(found).toBeNull(); // suspended → hidden from get
  });

  it('should reject suspend by non-admin', async () => {
    await expect(registry.suspendStrategy(strat.id, 'not_admin')).rejects.toThrow();
  });

  it('should filter verifiedOnly correctly', async () => {
    const other = await registry.publishStrategy(makePublishInput({ name: 'Other', creatorId: 'c2' }));
    await registry.verifyStrategy(strat.id, 'admin_001');
    const result = await registry.listStrategies({ verifiedOnly: true });
    expect(result.strategies.length).toBe(1);
    expect(result.strategies[0].id).toBe(strat.id);
    expect(result.strategies.find(s => s.id === other.id)).toBeUndefined();
  });
});

// ============================================================================
// StrategyMarketplaceService (API layer)
// ============================================================================

import {
  StrategyMarketplaceService,
  createStrategyMarketplaceService,
  createDemoStrategyMarketplaceService,
} from '../../services/strategy-marketplace';

describe('StrategyMarketplaceService — API', () => {
  let svc: StrategyMarketplaceService;

  beforeEach(() => {
    svc = createStrategyMarketplaceService(['admin_test']);
  });

  it('should list strategies via GET /api/strategies', async () => {
    await svc.registry.publishStrategy(makePublishInput({ name: 'Listed', creatorId: 'c1' }));
    const res = await svc.handle({ method: 'GET', path: '/api/strategies' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(Array.isArray(data?.strategies)).toBe(true);
  });

  it('should return 404 for unknown strategy', async () => {
    const res = await svc.handle({ method: 'GET', path: '/api/strategies/unknown-id' });
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('STRATEGY_NOT_FOUND');
  });

  it('should publish via POST /api/strategies/publish', async () => {
    const res = await svc.handle({
      method: 'POST',
      path: '/api/strategies/publish',
      callerId: 'user_pub',
      body: {
        name: 'New Strategy',
        description: 'desc',
        type: 'trend',
        riskLevel: 4,
        revenueModel: 'free',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    const strategy = data?.strategy as StrategyDefinition;
    expect(strategy?.creatorId).toBe('user_pub');
  });

  it('should require auth to publish', async () => {
    const res = await svc.handle({
      method: 'POST',
      path: '/api/strategies/publish',
      body: { name: 'Anon', type: 'trend', riskLevel: 5 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should subscribe via POST /api/strategies/:id/subscribe', async () => {
    const strat = await svc.registry.publishStrategy(makePublishInput({ name: 'Sub Target', creatorId: 'c1' }));
    const res = await svc.handle({
      method: 'POST',
      path: `/api/strategies/${strat.id}/subscribe`,
      callerId: 'subscriber',
      body: { allocation: 15 },
    });
    expect(res.statusCode).toBe(201);
    expect((res.body.data as Record<string, unknown>)?.subscription).toBeDefined();
  });

  it('should unsubscribe via POST /api/strategies/:id/unsubscribe', async () => {
    const strat = await svc.registry.publishStrategy(makePublishInput({ name: 'Sub Target 2', creatorId: 'c1' }));
    await svc.registry.subscribeToStrategy('user_unsub', strat.id, 10);
    const res = await svc.handle({
      method: 'POST',
      path: `/api/strategies/${strat.id}/unsubscribe`,
      callerId: 'user_unsub',
    });
    expect(res.statusCode).toBe(200);
  });

  it('should get performance via GET /api/strategies/:id/performance', async () => {
    const strat = await svc.registry.publishStrategy(makePublishInput({ name: 'Perf Target', creatorId: 'c1' }));
    const res = await svc.handle({
      method: 'GET',
      path: `/api/strategies/${strat.id}/performance`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.body.data as Record<string, unknown>;
    expect(data?.performance).toBeDefined();
  });

  it('should get subscribers via GET /api/strategies/:id/subscribers (owner)', async () => {
    const strat = await svc.registry.publishStrategy(makePublishInput({ name: 'Owner Sub', creatorId: 'owner_X' }));
    await svc.registry.subscribeToStrategy('sub_user', strat.id, 10);
    const res = await svc.handle({
      method: 'GET',
      path: `/api/strategies/${strat.id}/subscribers`,
      callerId: 'owner_X',
    });
    expect(res.statusCode).toBe(200);
    const data = res.body.data as Record<string, unknown>;
    expect(Array.isArray(data?.subscribers)).toBe(true);
    expect((data?.subscribers as StrategySubscription[]).length).toBe(1);
  });

  it('should deny subscribers list to non-owner', async () => {
    const strat = await svc.registry.publishStrategy(makePublishInput({ name: 'Restricted', creatorId: 'real_owner' }));
    const res = await svc.handle({
      method: 'GET',
      path: `/api/strategies/${strat.id}/subscribers`,
      callerId: 'intruder',
    });
    expect(res.statusCode).toBe(403);
  });

  it('should return 405 for unsupported method on /api/strategies', async () => {
    const res = await svc.handle({ method: 'DELETE', path: '/api/strategies' });
    expect(res.statusCode).toBe(405);
  });
});

describe('createDemoStrategyMarketplaceService', () => {
  it('should create a demo service without throwing', () => {
    const svc = createDemoStrategyMarketplaceService();
    expect(svc).toBeDefined();
    expect(svc.registry).toBeDefined();
  });

  it('demo service should handle GET /api/strategies', async () => {
    const svc = createDemoStrategyMarketplaceService();
    // Wait a tick for seeding to complete
    await new Promise(r => setTimeout(r, 50));
    const res = await svc.handle({ method: 'GET', path: '/api/strategies' });
    expect(res.statusCode).toBe(200);
  });
});
