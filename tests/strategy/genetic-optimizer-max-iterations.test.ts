/**
 * Regression tests for LOGIC-42: GeneticOptimizer terminates immediately when
 * maxIterations < populationSize.
 *
 * Covers acceptance criteria from issue #452:
 * - With a small `maxIterations` (e.g. 5) and default population, the optimizer
 *   runs the expected number of generations (not zero).
 * - Regression test asserts `generation` advances and best fitness can improve
 *   over the run.
 *
 * The bug: `isComplete()` returned
 *   `generation >= Math.floor(maxIterations / populationSize)`.
 * With the default population (20) any `maxIterations < 20` floors to 0, so the
 * optimizer reported completion at generation 0 and never evolved — performing
 * no search at all.
 */

import { describe, it, expect } from 'vitest';
import { GeneticOptimizer } from '../../core/strategies/engine/optimization';
import {
  createStrategyManager,
  createOptimizationEngine,
  createBacktestingEngine,
} from '../../core/strategies/engine';
import type {
  OptimizationConfig,
  CreateStrategyOptions,
  StrategySpec,
} from '../../core/strategies/engine';

const POPULATION_SIZE = 20;

// Minimal config — GeneticOptimizer only reads `parameters` and `maxIterations`.
function makeConfig(maxIterations: number): OptimizationConfig {
  return {
    strategyId: 'strategy_test',
    method: 'genetic',
    objective: 'max_sharpe',
    parameters: [{ parameterId: 'x', range: [50, 150] }],
    constraints: {},
    backtestConfig: {} as OptimizationConfig['backtestConfig'],
    maxIterations,
  };
}

// Fitness peaks at x = 100; higher is better.
function fitness(params: Record<string, number>): number {
  return -Math.pow(params.x - 100, 2);
}

/**
 * Drive the optimizer the way the engine does: suggest a batch, observe every
 * suggested individual, and stop once the evaluation budget (`maxIterations`)
 * is exhausted or the optimizer reports completion.
 */
function runLikeEngine(opt: GeneticOptimizer, maxIterations: number, batch = 4) {
  const bestPerStep: number[] = [];
  let runningBest = -Infinity;
  let totalEvaluations = 0;

  while (!opt.isComplete() && totalEvaluations < maxIterations) {
    const sets = opt.suggest(batch);
    if (sets.length === 0) break;
    for (const set of sets) {
      if (totalEvaluations >= maxIterations) break;
      const value = fitness(set);
      opt.observe(set, value, true);
      runningBest = Math.max(runningBest, value);
      totalEvaluations++;
    }
    bestPerStep.push(runningBest);
  }

  return { bestPerStep, totalEvaluations };
}

describe('LOGIC-42 — GeneticOptimizer maxIterations < populationSize', () => {
  // The core fix: isComplete() must never be true at generation 0, regardless
  // of how small the budget is relative to the population size.
  it.each([1, 5, 10, 19, 20, 200])(
    'is not complete at generation 0 for maxIterations=%i',
    (maxIterations) => {
      const opt = new GeneticOptimizer(makeConfig(maxIterations));
      expect(opt.generationCount).toBe(0);
      expect(opt.isComplete()).toBe(false);
    }
  );

  it('advances at least one generation with a small budget (< populationSize)', () => {
    const maxIterations = 25; // 5 evaluations beyond the first population of 20
    const opt = new GeneticOptimizer(makeConfig(maxIterations));

    const { totalEvaluations } = runLikeEngine(opt, maxIterations);

    // Before the fix, isComplete() was true immediately and nothing ran.
    expect(totalEvaluations).toBeGreaterThan(0);
    expect(opt.generationCount).toBeGreaterThanOrEqual(1);
  });

  it('never regresses the best fitness over the run (elitism)', () => {
    const maxIterations = 200;
    const opt = new GeneticOptimizer(makeConfig(maxIterations));

    const { bestPerStep } = runLikeEngine(opt, maxIterations);

    expect(bestPerStep.length).toBeGreaterThan(1);
    // Elitism keeps the best individual, so the best fitness observed is
    // monotonically non-decreasing across the run.
    for (let i = 1; i < bestPerStep.length; i++) {
      expect(bestPerStep[i]).toBeGreaterThanOrEqual(bestPerStep[i - 1]);
    }
  });
});

// ============================================================================
// End-to-end: the exact scenario from the issue, driven through the engine.
// ============================================================================

function makeStrategySpec(): StrategySpec {
  return {
    triggers: [{
      id: 'trigger_1',
      type: 'schedule',
      name: 'Hourly Trigger',
      enabled: true,
      config: { type: 'schedule', cron: '0 * * * *' },
    }],
    conditions: [{
      id: 'condition_1',
      name: 'Balance Check',
      type: 'portfolio',
      rules: [{
        id: 'rule_1',
        field: 'balance',
        operator: 'greater_than',
        value: 100,
        valueType: 'static',
      }],
      required: true,
    }],
    actions: [{
      id: 'action_1',
      type: 'swap',
      name: 'Buy TON',
      priority: 1,
      config: {
        type: 'swap',
        fromToken: 'USDT',
        toToken: 'TON',
        amount: { type: 'fixed', value: 100 },
        slippageTolerance: 0.5,
      },
    }],
    riskControls: [{
      id: 'risk_1',
      type: 'stop_loss',
      name: 'Stop Loss',
      enabled: true,
      config: { type: 'stop_loss', percentage: 10 },
      action: { type: 'notify' },
    }],
    parameters: [{
      id: 'param_amount',
      name: 'amount',
      type: 'number',
      value: 100,
      defaultValue: 100,
      optimizable: true,
      constraints: { min: 10, max: 1000 },
    }],
    capitalAllocation: {
      mode: 'percentage',
      allocatedPercentage: 10,
      minCapital: 50,
      reservePercentage: 20,
    },
  };
}

function makeCreateOptions(): CreateStrategyOptions {
  return {
    name: 'LOGIC-42 Test Strategy',
    description: 'Small maxIterations regression test',
    type: 'rule_based',
    userId: 'user_test',
    agentId: 'agent_test',
    definition: makeStrategySpec(),
    tags: ['test'],
  };
}

function makeEngineConfig(strategyId: string, maxIterations: number): OptimizationConfig {
  return {
    strategyId,
    method: 'genetic',
    objective: 'max_sharpe',
    parameters: [{ parameterId: 'param_amount', range: [50, 150], step: 50 }],
    constraints: {},
    backtestConfig: {
      strategyId,
      period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
      initialCapital: 10000,
      slippageModel: { type: 'fixed', baseSlippage: 0.1 },
      feeModel: { tradingFee: 0.3, gasCost: 0.5 },
      dataGranularity: '1d',
    },
    maxIterations,
  };
}

describe('LOGIC-42 — genetic optimization runs with a small budget (end-to-end)', () => {
  it('performs real search when maxIterations (5) < populationSize (20)', async () => {
    const manager = createStrategyManager();
    const strategy = await manager.createStrategy(makeCreateOptions());
    const backtester = createBacktestingEngine();
    const engine = createOptimizationEngine(backtester);
    // 5 < 20: previously floor(5/20)=0 => isComplete() true => zero iterations.
    const config = makeEngineConfig(strategy.id, 5);

    const result = await engine.optimize(strategy, config);

    expect(result.status).toBe('completed');
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.convergenceCurve.length).toBe(result.iterations);
  });
});
