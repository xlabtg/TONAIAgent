/**
 * Strategy Optimizer Service Tests (Issue #257)
 *
 * Covers:
 *   - computeScore: zero trades, all wins, all losses, mixed
 *   - optimizeStrategy: low win rate, high avg PnL, high drawdown, combined
 *   - optimizeAll: batch optimization
 *   - topStrategies: ranking by score
 *   - safety caps: parameters stay within bounds after many cycles
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StrategyOptimizerService,
  computeScore,
} from '../../services/strategy-optimizer/index';
import type { TradeDistribution } from '../../services/analytics/index';

// ============================================================================
// Helpers
// ============================================================================

function dist(overrides: Partial<TradeDistribution> = {}): TradeDistribution {
  return {
    strategy: 'trend',
    count: 10,
    totalPnl: 50,
    winRate: 60,
    ...overrides,
  };
}

// ============================================================================
// computeScore
// ============================================================================

describe('computeScore', () => {
  it('returns 0 when all metrics are worst-case', () => {
    const d = dist({ winRate: 0 });
    // avgPnL = -100 (worst), maxDrawdown = 50 (worst cutoff)
    const score = computeScore(d, -100, 50);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(20);
  });

  it('returns ~100 when all metrics are best-case', () => {
    const d = dist({ winRate: 100 });
    // avgPnL = +100 (best), maxDrawdown = 0 (no drawdown)
    const score = computeScore(d, 100, 0);
    expect(score).toBeGreaterThan(90);
  });

  it('weighs win rate most heavily', () => {
    const highWin = computeScore(dist({ winRate: 80 }), 0, 10);
    const lowWin = computeScore(dist({ winRate: 20 }), 0, 10);
    expect(highWin).toBeGreaterThan(lowWin);
  });

  it('penalises high drawdown', () => {
    const noDD = computeScore(dist(), 5, 0);
    const highDD = computeScore(dist(), 5, 40);
    expect(noDD).toBeGreaterThan(highDD);
  });
});

// ============================================================================
// StrategyOptimizerService.getConfig
// ============================================================================

describe('StrategyOptimizerService.getConfig', () => {
  it('returns a default config for an unknown strategy', () => {
    const svc = new StrategyOptimizerService();
    const cfg = svc.getConfig('unknown');
    expect(cfg.strategyId).toBe('unknown');
    expect(cfg.optimizationCycles).toBe(0);
    expect(cfg.autoOptimized).toBe(false);
    expect(cfg.params.riskLevel).toBeGreaterThan(0);
  });
});

// ============================================================================
// StrategyOptimizerService.optimizeStrategy
// ============================================================================

describe('StrategyOptimizerService.optimizeStrategy', () => {
  let svc: StrategyOptimizerService;

  beforeEach(() => {
    svc = new StrategyOptimizerService();
  });

  it('increments optimizationCycles after each call', () => {
    svc.optimizeStrategy('s1', dist(), 5, 10);
    svc.optimizeStrategy('s1', dist(), 5, 10);
    expect(svc.getConfig('s1').optimizationCycles).toBe(2);
  });

  it('marks strategy as autoOptimized after first run', () => {
    svc.optimizeStrategy('s1', dist(), 5, 10);
    expect(svc.getConfig('s1').autoOptimized).toBe(true);
  });

  it('reduces risk when win rate is low (< 40%)', () => {
    const before = svc.getConfig('s1').params.riskLevel;
    const result = svc.optimizeStrategy('s1', dist({ winRate: 30 }), -3, 15);
    expect(result.updatedParams.riskLevel).toBeLessThan(before);
    expect(result.adjustments.some(a => /risk/i.test(a))).toBe(true);
  });

  it('increases trade size when avg PnL is positive and high', () => {
    const before = svc.getConfig('s1').params.tradeSize;
    const result = svc.optimizeStrategy('s1', dist({ winRate: 60 }), 20, 5);
    expect(result.updatedParams.tradeSize).toBeGreaterThan(before);
  });

  it('tightens stop-loss when drawdown is high (> 20%)', () => {
    const before = svc.getConfig('s1').params.stopLoss;
    const result = svc.optimizeStrategy('s1', dist({ winRate: 50 }), 2, 30);
    expect(result.updatedParams.stopLoss).toBeLessThan(before);
    expect(result.adjustments.some(a => /stop-loss/i.test(a))).toBe(true);
  });

  it('keeps parameters within safe bounds after many cycles', () => {
    // Simulate many cycles with extreme metrics to stress the caps
    for (let i = 0; i < 50; i++) {
      svc.optimizeStrategy('s1', dist({ winRate: 10 }), -50, 60);
    }
    const params = svc.getConfig('s1').params;
    expect(params.riskLevel).toBeGreaterThanOrEqual(0.05);
    expect(params.tradeSize).toBeGreaterThanOrEqual(0.02);
    expect(params.stopLoss).toBeGreaterThanOrEqual(0.01);
    expect(params.takeProfit).toBeGreaterThanOrEqual(0.02);
  });

  it('keeps parameters below maximum caps under bullish conditions', () => {
    for (let i = 0; i < 50; i++) {
      svc.optimizeStrategy('s1', dist({ winRate: 90 }), 100, 0);
    }
    const params = svc.getConfig('s1').params;
    expect(params.riskLevel).toBeLessThanOrEqual(0.9);
    expect(params.tradeSize).toBeLessThanOrEqual(0.5);
    expect(params.stopLoss).toBeLessThanOrEqual(0.25);
    expect(params.takeProfit).toBeLessThanOrEqual(1.0);
  });

  it('returns a score between 0 and 100', () => {
    const result = svc.optimizeStrategy('s1', dist(), 10, 8);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('stores previousParams and updatedParams separately', () => {
    const result = svc.optimizeStrategy('s1', dist({ winRate: 20 }), -5, 25);
    // Previous should not equal updated when adjustments were made
    expect(result.previousParams).not.toEqual(result.updatedParams);
  });

  it('includes recommendations when win rate is very low', () => {
    const result = svc.optimizeStrategy('s1', dist({ winRate: 30 }), -5, 25);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// StrategyOptimizerService.optimizeAll
// ============================================================================

describe('StrategyOptimizerService.optimizeAll', () => {
  it('returns one result per strategy distribution', () => {
    const svc = new StrategyOptimizerService();
    const distributions = [
      dist({ strategy: 'trend',     winRate: 60 }),
      dist({ strategy: 'arbitrage', winRate: 45 }),
      dist({ strategy: 'momentum',  winRate: 30 }),
    ];
    const avgPnL = new Map([['trend', 8], ['arbitrage', 2], ['momentum', -4]]);
    const maxDD  = new Map([['trend', 5], ['arbitrage', 12], ['momentum', 25]]);

    const results = svc.optimizeAll(distributions, avgPnL, maxDD);
    expect(results).toHaveLength(3);
    expect(results.map(r => r.strategyId).sort()).toEqual(['arbitrage', 'momentum', 'trend']);
  });

  it('assigns each strategy an independent config', () => {
    const svc = new StrategyOptimizerService();
    const distributions = [
      dist({ strategy: 'A', winRate: 80 }),
      dist({ strategy: 'B', winRate: 20 }),
    ];
    const avgPnL = new Map([['A', 15], ['B', -10]]);
    const maxDD  = new Map([['A', 3],  ['B', 35]]);

    svc.optimizeAll(distributions, avgPnL, maxDD);

    const cfgA = svc.getConfig('A');
    const cfgB = svc.getConfig('B');

    // A should have a higher score than B
    expect(cfgA.score).toBeGreaterThan(cfgB.score);
    // A's risk should be ≥ B's risk (B is penalised more)
    expect(cfgA.params.riskLevel).toBeGreaterThanOrEqual(cfgB.params.riskLevel);
  });
});

// ============================================================================
// StrategyOptimizerService.topStrategies
// ============================================================================

describe('StrategyOptimizerService.topStrategies', () => {
  it('returns empty array when no strategies have been optimized', () => {
    const svc = new StrategyOptimizerService();
    expect(svc.topStrategies()).toEqual([]);
  });

  it('ranks strategies from highest to lowest score', () => {
    const svc = new StrategyOptimizerService();

    svc.optimizeStrategy('bad',  dist({ strategy: 'bad',  winRate: 20 }), -5, 30);
    svc.optimizeStrategy('ok',   dist({ strategy: 'ok',   winRate: 50 }), 3,  15);
    svc.optimizeStrategy('best', dist({ strategy: 'best', winRate: 80 }), 20, 3);

    const ranked = svc.topStrategies();
    expect(ranked[0].strategyId).toBe('best');
    expect(ranked[ranked.length - 1].strategyId).toBe('bad');
  });

  it('assigns correct rank numbers starting at 1', () => {
    const svc = new StrategyOptimizerService();
    svc.optimizeStrategy('a', dist({ strategy: 'a', winRate: 70 }), 10, 5);
    svc.optimizeStrategy('b', dist({ strategy: 'b', winRate: 40 }), 1,  20);

    const ranked = svc.topStrategies();
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
  });
});
