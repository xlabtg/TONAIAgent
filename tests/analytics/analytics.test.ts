/**
 * Analytics Service Tests (Issue #255)
 *
 * Covers:
 *   - computeMetrics: 0 trades, all wins, all losses, mixed
 *   - computeByStrategy: grouping, ordering
 *   - buildEquityCurve: from snapshots vs derived from trades
 *   - computeAll: full integration
 */

import { describe, it, expect } from 'vitest';
import { AnalyticsService } from '../../services/analytics/index';
import type { TradeRecord, PortfolioSnapshot } from '../../services/analytics/index';

// ============================================================================
// Helpers
// ============================================================================

function makeDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 86400000);
}

function trade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    id: Math.floor(Math.random() * 1000),
    userId: 1,
    strategy: 'trend',
    pair: 'TON/USDT',
    side: 'buy',
    amount: 100,
    executionPrice: 5.25,
    pnl: 1.2,
    slippageBps: 30,
    dex: 'dedust',
    status: 'completed',
    mode: 'demo',
    createdAt: makeDate(1),
    ...overrides,
  };
}

function snapshot(date: string, value: number, pnl: number): PortfolioSnapshot {
  return {
    date,
    portfolioValue: value,
    realizedPnl: pnl,
    unrealizedPnl: 0,
    totalPnl: pnl,
  };
}

// ============================================================================
// AnalyticsService.computeMetrics
// ============================================================================

describe('AnalyticsService.computeMetrics', () => {
  const svc = new AnalyticsService();

  it('returns zeros for empty trade list', () => {
    const m = svc.computeMetrics([]);
    expect(m.totalTrades).toBe(0);
    expect(m.executedTrades).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.totalPnL).toBe(0);
    expect(m.avgPnL).toBe(0);
    expect(m.bestTrade).toBe(0);
    expect(m.worstTrade).toBe(0);
    expect(m.sharpeRatio).toBe(0);
    expect(m.maxDrawdown).toBe(0);
    expect(m.profitFactor).toBe(0);
  });

  it('computes correctly when all trades are wins', () => {
    const trades = [
      trade({ pnl: 10 }),
      trade({ pnl: 20 }),
      trade({ pnl: 5 }),
    ];
    const m = svc.computeMetrics(trades);

    expect(m.totalTrades).toBe(3);
    expect(m.executedTrades).toBe(3);
    expect(m.winRate).toBeCloseTo(100, 1);
    expect(m.totalPnL).toBeCloseTo(35, 5);
    expect(m.bestTrade).toBe(20);
    expect(m.worstTrade).toBe(5);
    // No losses → profitFactor should be large / non-zero
    expect(m.profitFactor).toBeGreaterThan(0);
  });

  it('computes correctly when all trades are losses', () => {
    const trades = [
      trade({ pnl: -10 }),
      trade({ pnl: -5 }),
    ];
    const m = svc.computeMetrics(trades);

    expect(m.winRate).toBe(0);
    expect(m.totalPnL).toBeCloseTo(-15, 5);
    expect(m.bestTrade).toBe(-5);
    expect(m.worstTrade).toBe(-10);
    expect(m.profitFactor).toBe(0);
  });

  it('computes win rate correctly for mixed trades', () => {
    const trades = [
      trade({ pnl: 10 }),
      trade({ pnl: -5 }),
      trade({ pnl: 3 }),
      trade({ pnl: -2 }),
    ];
    const m = svc.computeMetrics(trades);

    expect(m.executedTrades).toBe(4);
    expect(m.winRate).toBeCloseTo(50, 1);
    expect(m.totalPnL).toBeCloseTo(6, 5);
    expect(m.profitFactor).toBeCloseTo(13 / 7, 3);
  });

  it('does not count hold/none signals as executed trades', () => {
    const trades = [
      trade({ side: 'hold', pnl: 0 }),
      trade({ side: 'none', pnl: 0 }),
      trade({ side: 'buy', pnl: 5 }),
    ];
    const m = svc.computeMetrics(trades);

    expect(m.totalTrades).toBe(3);
    expect(m.executedTrades).toBe(1);
  });

  it('max drawdown is 0 when all trades are profitable', () => {
    const trades = [
      trade({ pnl: 10 }),
      trade({ pnl: 20 }),
    ];
    const m = svc.computeMetrics(trades);
    expect(m.maxDrawdown).toBe(0);
  });

  it('computes max drawdown for declining sequence', () => {
    const trades = [
      trade({ pnl: 100 }),
      trade({ pnl: -50 }),
    ];
    const m = svc.computeMetrics(trades);
    // Peak = 100, drawdown at 50 = (100-50)/100 = 50%
    expect(m.maxDrawdown).toBeCloseTo(50, 1);
  });
});

// ============================================================================
// AnalyticsService.computeByStrategy
// ============================================================================

describe('AnalyticsService.computeByStrategy', () => {
  const svc = new AnalyticsService();

  it('returns empty array for no trades', () => {
    expect(svc.computeByStrategy([])).toEqual([]);
  });

  it('groups trades by strategy correctly', () => {
    const trades = [
      trade({ strategy: 'trend',     pnl: 10, side: 'buy' }),
      trade({ strategy: 'trend',     pnl: -5, side: 'sell' }),
      trade({ strategy: 'arbitrage', pnl: 20, side: 'buy' }),
    ];

    const result = svc.computeByStrategy(trades);
    expect(result).toHaveLength(2);

    const arb = result.find(r => r.strategy === 'arbitrage')!;
    const trend = result.find(r => r.strategy === 'trend')!;

    expect(arb.totalPnl).toBe(20);
    expect(trend.totalPnl).toBe(5);

    // Sorted descending by totalPnl
    expect(result[0].strategy).toBe('arbitrage');
  });

  it('computes win rate per strategy', () => {
    const trades = [
      trade({ strategy: 's1', pnl: 5,  side: 'buy' }),
      trade({ strategy: 's1', pnl: -2, side: 'sell' }),
      trade({ strategy: 's1', pnl: 3,  side: 'buy' }),
    ];
    const result = svc.computeByStrategy(trades);
    const s1 = result.find(r => r.strategy === 's1')!;
    expect(s1.winRate).toBeCloseTo(100 * 2 / 3, 1);
  });
});

// ============================================================================
// AnalyticsService.buildEquityCurve
// ============================================================================

describe('AnalyticsService.buildEquityCurve', () => {
  const svc = new AnalyticsService();

  it('returns existing snapshots sorted by date', () => {
    const snaps = [
      snapshot('2026-03-10', 10200, 200),
      snapshot('2026-03-08', 10000, 0),
      snapshot('2026-03-09', 10100, 100),
    ];
    const result = svc.buildEquityCurve([], snaps, 10000);
    expect(result[0].date).toBe('2026-03-08');
    expect(result[2].date).toBe('2026-03-10');
  });

  it('derives curve from trade PnL when no snapshots given', () => {
    const t1 = trade({ pnl: 50,  createdAt: new Date('2026-03-01') });
    const t2 = trade({ pnl: -20, createdAt: new Date('2026-03-02') });
    const t3 = trade({ pnl: 30,  createdAt: new Date('2026-03-03') });

    const result = svc.buildEquityCurve([t1, t2, t3], [], 1000);
    expect(result).toHaveLength(3);
    expect(result[0].portfolioValue).toBeCloseTo(1050, 2);
    expect(result[1].portfolioValue).toBeCloseTo(1030, 2);
    expect(result[2].portfolioValue).toBeCloseTo(1060, 2);
  });

  it('returns empty array when no trades and no snapshots', () => {
    const result = svc.buildEquityCurve([], [], 1000);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// AnalyticsService.computeAll
// ============================================================================

describe('AnalyticsService.computeAll', () => {
  const svc = new AnalyticsService();

  it('returns a full analytics result structure', () => {
    const trades = [
      trade({ strategy: 'trend',     pnl: 10, createdAt: new Date('2026-03-01') }),
      trade({ strategy: 'arbitrage', pnl: -3, createdAt: new Date('2026-03-02') }),
    ];

    const result = svc.computeAll(trades, [], 500);
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('byStrategy');
    expect(result).toHaveProperty('equityCurve');

    expect(result.metrics.totalTrades).toBe(2);
    expect(result.byStrategy).toHaveLength(2);
    expect(result.equityCurve.length).toBeGreaterThan(0);
  });
});
