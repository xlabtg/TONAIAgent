/**
 * Tests for OptimizationEngine early-stopping logic (Issue #404 / LOGIC-19)
 *
 * Covers:
 *   - Early stopping triggers when all evaluations are invalid (constraint-violating)
 *   - Early stopping triggers when valid but non-improving evaluations fill patience
 *   - A genuine improvement resets the counter
 *   - Early stopping does not trigger prematurely (before patience is exhausted)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  OptimizationEngine,
  createOptimizationEngine,
} from '../../core/strategies/engine/optimization';
import type { BacktestingEngine } from '../../core/strategies/engine/backtesting';
import type {
  Strategy,
  OptimizationConfig,
  StrategyPerformance,
  BacktestResult,
} from '../../core/strategies/engine/types';

// ============================================================================
// Helpers
// ============================================================================

function makePerformance(sharpe: number, drawdown = 5): StrategyPerformance {
  const now = new Date();
  return {
    strategyId: 'test',
    period: { start: now, end: now, type: 'all_time' },
    metrics: {
      totalReturn: 0,
      annualizedReturn: 0,
      absoluteProfit: 0,
      sharpeRatio: sharpe,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: drawdown,
      currentDrawdown: 0,
    },
    trades: {
      totalTrades: 10,
      winningTrades: 5,
      losingTrades: 5,
      winRate: 50,
      averageWin: 1,
      averageLoss: 1,
      profitFactor: 1,
      expectancy: 0,
      averageHoldingTime: 60,
      avgSlippage: 0,
      totalFees: 0,
    },
    riskMetrics: {
      volatility: 0,
      var95: 0,
      cvar95: 0,
      beta: 0,
      correlation: 0,
      informationRatio: 0,
    },
    comparison: { vsTon: 0, vsBtc: 0, vsHodl: 0, vsBenchmark: 0, benchmarkName: '' },
    lastUpdated: now,
  };
}

function makeBacktestResult(sharpe: number, drawdown = 5): BacktestResult {
  return {
    id: 'bt_test',
    strategyId: 'test',
    config: {
      strategyId: 'test',
      period: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      initialCapital: 10_000,
      slippageModel: { type: 'fixed', baseSlippage: 0.001 },
      feeModel: { tradingFee: 0.001, gasCost: 0 },
      dataGranularity: '1d',
    },
    status: 'completed',
    startedAt: new Date(),
    performance: makePerformance(sharpe, drawdown),
    equityCurve: [],
    trades: [],
    warnings: [],
  };
}

function makeStrategy(): Strategy {
  return {
    id: 'strat-1',
    name: 'Test',
    description: '',
    type: 'rule_based',
    version: 1,
    status: 'active',
    userId: 'u1',
    agentId: 'a1',
    definition: {
      triggers: [],
      conditions: [],
      actions: [],
      riskControls: [],
      parameters: [{
        id: 'p1',
        name: 'P1',
        type: 'number',
        value: 1,
        defaultValue: 1,
        optimizable: true,
      }],
      capitalAllocation: {
        mode: 'fixed',
        minCapital: 1000,
        reservePercentage: 0,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    metadata: {},
  };
}

function makeOptimizationConfig(maxIterations: number): OptimizationConfig {
  return {
    strategyId: 'strat-1',
    method: 'random_search',
    objective: 'max_sharpe',
    parameters: [{ parameterId: 'p1', range: [1, 10] }],
    constraints: { minSharpe: 0.5 },
    backtestConfig: {
      strategyId: 'strat-1',
      period: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
      initialCapital: 10_000,
      slippageModel: { type: 'fixed', baseSlippage: 0.001 },
      feeModel: { tradingFee: 0.001, gasCost: 0 },
      dataGranularity: '1d',
    },
    maxIterations,
  };
}

/**
 * Build a mock BacktestingEngine whose runBacktest() returns results from a
 * pre-defined sequence. After the sequence is exhausted every subsequent call
 * returns the last entry.
 */
function makeMockBacktest(results: BacktestResult[]): BacktestingEngine {
  let callCount = 0;
  return {
    runBacktest: vi.fn(async () => {
      const idx = Math.min(callCount++, results.length - 1);
      return results[idx];
    }),
  } as unknown as BacktestingEngine;
}

// ============================================================================
// Tests
// ============================================================================

describe('OptimizationEngine — early-stopping (LOGIC-19)', () => {
  /**
   * LOGIC-19 regression: a run of all-invalid evaluations must advance the
   * patience counter so early stopping can trigger.
   */
  it('triggers early stopping after earlyStoppingPatience all-invalid evaluations', async () => {
    const patience = 5;
    const maxIter = 50;

    // Every backtest violates the minSharpe constraint (sharpe = 0 < 0.5)
    const allInvalidResult = makeBacktestResult(0 /* sharpe */, 10 /* drawdown */);

    const mockBacktest = makeMockBacktest(
      Array.from({ length: maxIter }, () => allInvalidResult),
    );

    const engine = createOptimizationEngine(mockBacktest, {
      maxParallelBacktests: 1,
      convergenceThreshold: 0.001,
      earlyStoppingPatience: patience,
    });

    const result = await engine.optimize(makeStrategy(), makeOptimizationConfig(maxIter));

    // Should have stopped after `patience` iterations, not run all maxIter
    expect(result.iterations).toBe(patience);
    expect(result.status).toBe('completed');
  });

  /**
   * A genuine improvement must reset the counter, preventing premature stopping.
   */
  it('resets counter on a genuine improvement and stops later', async () => {
    const patience = 3;
    // 2 invalid, then 1 valid improvement, then 3 invalid → stop at 2+1+3 = 6
    const results = [
      makeBacktestResult(0),   // invalid (sharpe 0 < 0.5)
      makeBacktestResult(0),   // invalid
      makeBacktestResult(1.0), // valid improvement → counter resets
      makeBacktestResult(0),   // invalid
      makeBacktestResult(0),   // invalid
      makeBacktestResult(0),   // invalid → counter reaches patience
      // Should never reach here
      makeBacktestResult(2.0),
    ];

    const mockBacktest = makeMockBacktest(results);

    const engine = createOptimizationEngine(mockBacktest, {
      maxParallelBacktests: 1,
      convergenceThreshold: 0.001,
      earlyStoppingPatience: patience,
    });

    const result = await engine.optimize(makeStrategy(), makeOptimizationConfig(20));

    expect(result.iterations).toBe(6);
    // Best result is the valid one at iteration 3
    expect(result.status).toBe('completed');
  });

  /**
   * When only valid non-improving evaluations appear the counter should still
   * advance and trigger stopping.
   */
  it('triggers early stopping on valid but non-improving evaluations', async () => {
    const patience = 4;
    const results = [
      makeBacktestResult(1.5), // valid improvement (establishes best)
      makeBacktestResult(1.0), // valid but worse
      makeBacktestResult(0.8), // valid but worse
      makeBacktestResult(1.2), // valid but worse (1.2 < 1.5)
      makeBacktestResult(0.9), // valid but worse → reaches patience
      makeBacktestResult(2.0), // should never be reached
    ];

    const mockBacktest = makeMockBacktest(results);

    const engine = createOptimizationEngine(mockBacktest, {
      maxParallelBacktests: 1,
      convergenceThreshold: 0.001,
      earlyStoppingPatience: patience,
    });

    const result = await engine.optimize(makeStrategy(), makeOptimizationConfig(20));

    expect(result.iterations).toBe(5); // 1 (best) + 4 (patience filled)
    expect(result.status).toBe('completed');
  });

  /**
   * Early stopping must NOT trigger before patience is exhausted.
   */
  it('does not stop before patience is fully exhausted', async () => {
    const patience = 5;
    // Only 4 non-improving (< patience), then a valid improvement
    const results = [
      makeBacktestResult(1.0), // best
      makeBacktestResult(0),   // invalid
      makeBacktestResult(0),   // invalid
      makeBacktestResult(0),   // invalid
      makeBacktestResult(0),   // invalid (counter = 4, < patience=5)
      makeBacktestResult(1.5), // improvement → counter resets
    ];

    const mockBacktest = makeMockBacktest(results);

    const engine = createOptimizationEngine(mockBacktest, {
      maxParallelBacktests: 1,
      convergenceThreshold: 0.001,
      earlyStoppingPatience: patience,
    });

    // Give enough iterations to process all 6 results
    const result = await engine.optimize(makeStrategy(), makeOptimizationConfig(6));

    expect(result.iterations).toBe(6);
    expect(result.status).toBe('completed');
  });
});
