/**
 * Monetization & Creator Analytics Tests (Issue #273)
 *
 * Tests for the monetization layer additions:
 * - RevenueModel types (free / subscription / performance_fee) in the registry
 * - Integration between StrategyRegistry and RevenueDistributionService
 * - Creator analytics extension in the analytics service
 * - MarketplaceExecutionEngine revenue share tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createStrategyRegistry,
  DefaultStrategyRegistry,
  calculateRankingScore,
} from '../../core/strategies/registry';

import type {
  StrategyDefinition,
  RevenueModel,
} from '../../core/strategies/registry';

import {
  computeCreatorAnalytics,
} from '../../services/analytics/index';

import type {
  CreatorStrategyInput,
  TradeRecord,
} from '../../services/analytics/index';

// ============================================================================
// Helpers
// ============================================================================

function makeTrade(
  overrides: Partial<TradeRecord> = {}
): TradeRecord {
  return {
    id: Math.floor(Math.random() * 100000),
    userId: 1,
    strategy: 'test-strat',
    pair: 'TON/USDT',
    side: 'buy',
    amount: 100,
    executionPrice: 1.5,
    pnl: 10,
    slippageBps: null,
    dex: null,
    status: 'completed',
    mode: 'demo',
    createdAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// RevenueModel in StrategyRegistry
// ============================================================================

describe('StrategyRegistry — Revenue Models', () => {
  let registry: DefaultStrategyRegistry;

  beforeEach(() => {
    registry = createStrategyRegistry(['admin_1']);
  });

  it('should default to "free" revenue model', async () => {
    const s = await registry.publishStrategy({
      name: 'Free Strategy',
      description: '',
      creatorId: 'creator',
      creatorName: 'Alice',
      type: 'trend',
      riskLevel: 5,
    });
    expect(s.revenueModel).toBe('free');
    expect(s.performanceFeePercent).toBe(0);
    expect(s.subscriptionFeeUsd).toBe(0);
  });

  it('should store subscription revenue model with fee', async () => {
    const s = await registry.publishStrategy({
      name: 'Sub Strategy',
      description: '',
      creatorId: 'creator',
      creatorName: 'Alice',
      type: 'trend',
      riskLevel: 3,
      revenueModel: 'subscription',
      subscriptionFeeUsd: 19.99,
    });
    expect(s.revenueModel).toBe('subscription');
    expect(s.subscriptionFeeUsd).toBe(19.99);
    expect(s.performanceFeePercent).toBe(0);
  });

  it('should store performance_fee revenue model with percent', async () => {
    const s = await registry.publishStrategy({
      name: 'Perf Fee Strategy',
      description: '',
      creatorId: 'creator',
      creatorName: 'Bob',
      type: 'arbitrage',
      riskLevel: 7,
      revenueModel: 'performance_fee',
      performanceFeePercent: 25,
    });
    expect(s.revenueModel).toBe('performance_fee');
    expect(s.performanceFeePercent).toBe(25);
    expect(s.subscriptionFeeUsd).toBe(0);
  });

  it('should update revenue model via updateStrategy', async () => {
    const s = await registry.publishStrategy({
      name: 'Changing Model',
      description: '',
      creatorId: 'creator_X',
      creatorName: 'X',
      type: 'custom',
      riskLevel: 5,
    });
    const updated = await registry.updateStrategy(s.id, 'creator_X', {
      revenueModel: 'subscription',
      subscriptionFeeUsd: 9.99,
    });
    expect(updated.revenueModel).toBe('subscription');
    expect(updated.subscriptionFeeUsd).toBe(9.99);
  });

  it('should allow multiple strategies with different revenue models', async () => {
    const models: RevenueModel[] = ['free', 'subscription', 'performance_fee'];
    const ids: string[] = [];
    for (const model of models) {
      const s = await registry.publishStrategy({
        name: `Strategy ${model}`,
        description: '',
        creatorId: 'multi_creator',
        creatorName: 'Multi',
        type: 'trend',
        riskLevel: 5,
        revenueModel: model,
        subscriptionFeeUsd: model === 'subscription' ? 10 : 0,
        performanceFeePercent: model === 'performance_fee' ? 20 : 0,
      });
      ids.push(s.id);
    }

    const freeResult = await registry.listStrategies({ revenueModel: 'free' });
    const subResult = await registry.listStrategies({ revenueModel: 'subscription' });
    const perfResult = await registry.listStrategies({ revenueModel: 'performance_fee' });

    expect(freeResult.strategies.some(s => ids.includes(s.id))).toBe(true);
    expect(subResult.strategies.some(s => s.revenueModel === 'subscription')).toBe(true);
    expect(perfResult.strategies.some(s => s.revenueModel === 'performance_fee')).toBe(true);
  });

  it('free strategy allows any user to execute', async () => {
    const s = await registry.publishStrategy({
      name: 'Free Public',
      description: '',
      creatorId: 'c1',
      creatorName: 'C1',
      type: 'trend',
      riskLevel: 2,
      revenueModel: 'free',
    });
    expect(await registry.canExecuteStrategy('random_user', s.id)).toBe(true);
    expect(await registry.canExecuteStrategy('another_user', s.id)).toBe(true);
  });

  it('subscription strategy requires subscription to execute', async () => {
    const s = await registry.publishStrategy({
      name: 'Sub Gated',
      description: '',
      creatorId: 'c2',
      creatorName: 'C2',
      type: 'ai-signal',
      riskLevel: 5,
      revenueModel: 'subscription',
      subscriptionFeeUsd: 29,
    });
    expect(await registry.canExecuteStrategy('no_sub', s.id)).toBe(false);
    await registry.subscribeToStrategy('has_sub', s.id, 10);
    expect(await registry.canExecuteStrategy('has_sub', s.id)).toBe(true);
  });

  it('performance_fee strategy requires subscription to execute', async () => {
    const s = await registry.publishStrategy({
      name: 'Perf Gated',
      description: '',
      creatorId: 'c3',
      creatorName: 'C3',
      type: 'arbitrage',
      riskLevel: 6,
      revenueModel: 'performance_fee',
      performanceFeePercent: 20,
    });
    expect(await registry.canExecuteStrategy('poor_user', s.id)).toBe(false);
    await registry.subscribeToStrategy('rich_user', s.id, 50);
    expect(await registry.canExecuteStrategy('rich_user', s.id)).toBe(true);
  });
});

// ============================================================================
// Creator Analytics Extension
// ============================================================================

describe('computeCreatorAnalytics', () => {
  it('should return empty analytics for creator with no strategies', () => {
    const { summary, breakdown } = computeCreatorAnalytics('creator_1', 'Alice', []);
    expect(summary.strategyCount).toBe(0);
    expect(summary.totalSubscribers).toBe(0);
    expect(summary.totalRevenueUsd).toBe(0);
    expect(summary.totalTrades).toBe(0);
    expect(summary.avgWinRate).toBe(0);
    expect(summary.bestRoi30d).toBe(0);
    expect(breakdown.length).toBe(0);
  });

  it('should aggregate subscriber count across strategies', () => {
    const strategies: CreatorStrategyInput[] = [
      { strategyId: 's1', strategyName: 'A', subscriberCount: 30, revenueUsd: 0, trades: [], roi30d: 5 },
      { strategyId: 's2', strategyName: 'B', subscriberCount: 20, revenueUsd: 0, trades: [], roi30d: 3 },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Alice', strategies);
    expect(summary.totalSubscribers).toBe(50);
  });

  it('should aggregate total revenue across strategies', () => {
    const strategies: CreatorStrategyInput[] = [
      { strategyId: 's1', strategyName: 'A', subscriberCount: 0, revenueUsd: 500, trades: [], roi30d: 0 },
      { strategyId: 's2', strategyName: 'B', subscriberCount: 0, revenueUsd: 300, trades: [], roi30d: 0 },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Alice', strategies);
    expect(summary.totalRevenueUsd).toBe(800);
  });

  it('should compute correct strategy count', () => {
    const strategies: CreatorStrategyInput[] = [
      { strategyId: 's1', strategyName: 'A', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 0 },
      { strategyId: 's2', strategyName: 'B', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 0 },
      { strategyId: 's3', strategyName: 'C', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 0 },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Bob', strategies);
    expect(summary.strategyCount).toBe(3);
  });

  it('should calculate best ROI as the maximum across strategies', () => {
    const strategies: CreatorStrategyInput[] = [
      { strategyId: 's1', strategyName: 'A', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 5.2 },
      { strategyId: 's2', strategyName: 'B', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 12.8 },
      { strategyId: 's3', strategyName: 'C', subscriberCount: 0, revenueUsd: 0, trades: [], roi30d: 3.1 },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Bob', strategies);
    expect(summary.bestRoi30d).toBe(12.8);
  });

  it('should include per-strategy breakdown', () => {
    const strategies: CreatorStrategyInput[] = [
      {
        strategyId: 'strat_a',
        strategyName: 'Alpha',
        subscriberCount: 5,
        revenueUsd: 100,
        trades: [makeTrade({ pnl: 10, side: 'buy' }), makeTrade({ pnl: -5, side: 'sell' })],
        roi30d: 8,
      },
    ];
    const { breakdown } = computeCreatorAnalytics('c1', 'Alice', strategies);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].strategyId).toBe('strat_a');
    expect(breakdown[0].strategyName).toBe('Alpha');
    expect(breakdown[0].subscriberCount).toBe(5);
    expect(breakdown[0].revenueUsd).toBe(100);
    expect(breakdown[0].roi30d).toBe(8);
  });

  it('should compute win rate from trade records', () => {
    const trades = [
      makeTrade({ pnl: 10, side: 'buy' }),
      makeTrade({ pnl: 20, side: 'buy' }),
      makeTrade({ pnl: -5, side: 'sell' }),
      makeTrade({ pnl: 15, side: 'buy' }),
    ];
    const strategies: CreatorStrategyInput[] = [
      { strategyId: 's1', strategyName: 'A', subscriberCount: 0, revenueUsd: 0, trades, roi30d: 5 },
    ];
    const { breakdown } = computeCreatorAnalytics('c1', 'Alice', strategies);
    expect(breakdown[0].winRate).toBeCloseTo(75); // 3 wins / 4 trades
  });

  it('should aggregate total trades across all strategies', () => {
    const strategies: CreatorStrategyInput[] = [
      {
        strategyId: 's1',
        strategyName: 'A',
        subscriberCount: 0,
        revenueUsd: 0,
        trades: [makeTrade(), makeTrade(), makeTrade()],
        roi30d: 0,
      },
      {
        strategyId: 's2',
        strategyName: 'B',
        subscriberCount: 0,
        revenueUsd: 0,
        trades: [makeTrade(), makeTrade()],
        roi30d: 0,
      },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Alice', strategies);
    expect(summary.totalTrades).toBe(5);
  });

  it('should average win rates across strategies', () => {
    const strategies: CreatorStrategyInput[] = [
      {
        strategyId: 's1',
        strategyName: 'A',
        subscriberCount: 0,
        revenueUsd: 0,
        trades: [makeTrade({ pnl: 10, side: 'buy' }), makeTrade({ pnl: -5, side: 'buy' })], // 50%
        roi30d: 0,
      },
      {
        strategyId: 's2',
        strategyName: 'B',
        subscriberCount: 0,
        revenueUsd: 0,
        trades: [makeTrade({ pnl: 10, side: 'buy' }), makeTrade({ pnl: 10, side: 'buy' })], // 100%
        roi30d: 0,
      },
    ];
    const { summary } = computeCreatorAnalytics('c1', 'Alice', strategies);
    // average of 50% and 100% = 75%
    expect(summary.avgWinRate).toBeCloseTo(75);
  });

  it('should include creatorId and creatorName in summary', () => {
    const { summary } = computeCreatorAnalytics('cid_42', 'Dave Creator', []);
    expect(summary.creatorId).toBe('cid_42');
    expect(summary.creatorName).toBe('Dave Creator');
  });

  it('should include updatedAt timestamp', () => {
    const { summary } = computeCreatorAnalytics('c1', 'Alice', []);
    expect(summary.updatedAt).toBeDefined();
    expect(new Date(summary.updatedAt).getTime()).not.toBeNaN();
  });
});

// ============================================================================
// Ranking formula (re-verification)
// ============================================================================

describe('Ranking formula — edge cases', () => {
  it('should handle all-zero inputs', () => {
    expect(calculateRankingScore(0, 0, 0)).toBeCloseTo(0.3); // (1-0)*0.3 = 0.3
  });

  it('should handle winRate only being nonzero', () => {
    expect(calculateRankingScore(1, 0, 0)).toBeCloseTo(0.4 + 0.3); // 0.4 + 0 + 0.3
  });

  it('should handle drawdown of 1 (total loss)', () => {
    expect(calculateRankingScore(0.7, 0.5, 1)).toBeCloseTo(0.7 * 0.4 + 0.5 * 0.3); // no drawdown bonus
  });

  it('two strategies with same winRate but different drawdown should differ in score', () => {
    const goodDD = calculateRankingScore(0.6, 0.5, 0.1);
    const badDD = calculateRankingScore(0.6, 0.5, 0.8);
    expect(goodDD).toBeGreaterThan(badDD);
  });

  it('weights should sum to 1 when all inputs are 1/0 optimally', () => {
    // winRate=1, avgPnL=1, drawdown=0 → total = 0.4+0.3+0.3 = 1.0
    expect(calculateRankingScore(1, 1, 0)).toBeCloseTo(1.0);
  });
});
