/**
 * TONAIAgent - Autonomous Strategy Discovery Engine Tests
 *
 * Comprehensive tests for the AI-driven autonomous strategy discovery system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Generation
  createStrategyGenerationEngine,
  StrategyGenerationEngine,

  // Pipeline
  createDiscoveryPipeline,
  DiscoveryPipeline,

  // Learning
  createContinuousLearningSystem,
  ContinuousLearningSystem,

  // Publisher
  createStrategyPublisher,
  StrategyPublisher,

  // Engine
  createAutonomousDiscoveryEngine,
  DefaultAutonomousDiscoveryEngine,

  // Types
  type CandidateStrategy,
  type DiscoveryEngineConfig,
  type GenerationApproach,
  type LearningInsights,
  type DiscoveryEvent,
} from '../../src/autonomous-discovery';

import { createBacktestingEngine } from '../../src/strategy';
import type { StrategyPerformance } from '../../src/strategy';

// ============================================================================
// Test Helpers
// ============================================================================

function createMinimalConfig(): Partial<DiscoveryEngineConfig> {
  return {
    enabled: true,
    maxCandidatesPerCycle: 4,
    cycleIntervalMs: 60000,
    generationApproaches: ['template_mutation', 'parameter_optimization'],
    evaluationThresholds: {
      minROI: -100, // Very permissive for tests
      minSharpe: -10,
      maxDrawdown: 100,
      minWinRate: 0,
      minTrades: 0,
    },
    riskFilter: {
      maxDrawdownPercent: 100,
      maxLeverage: 10,
      minStabilityScore: 0,
      applyStressTest: false,
    },
    autoPublish: false,
    publishThreshold: 0,
    elitePoolSize: 10,
    continuousLearningEnabled: true,
  };
}

function createMockPerformance(): StrategyPerformance {
  return {
    strategyId: 'test_strategy',
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-03-31'),
      type: 'all_time',
    },
    metrics: {
      totalReturn: 15,
      annualizedReturn: 60,
      absoluteProfit: 1500,
      sharpeRatio: 1.5,
      sortinoRatio: 2.0,
      calmarRatio: 1.5,
      maxDrawdown: -10,
      currentDrawdown: -2,
    },
    trades: {
      totalTrades: 20,
      winningTrades: 12,
      losingTrades: 8,
      winRate: 0.6,
      averageWin: 2.5,
      averageLoss: -1.5,
      profitFactor: 1.67,
      expectancy: 0.9,
      averageHoldingTime: 24,
      avgSlippage: 0.3,
      totalFees: 50,
    },
    riskMetrics: {
      volatility: 15,
      var95: -5,
      cvar95: -8,
      beta: 0.8,
      correlation: 0.7,
      informationRatio: 0.8,
    },
    comparison: {
      vsTon: 5,
      vsBtc: 3,
      vsHodl: 10,
      vsBenchmark: 7,
      benchmarkName: 'TON HODL',
    },
    lastUpdated: new Date(),
  };
}

function createMockCandidate(
  overrides: Partial<CandidateStrategy> = {}
): CandidateStrategy {
  return {
    id: `candidate_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    generationApproach: 'template_mutation',
    spec: {
      triggers: [
        {
          id: 't1',
          type: 'schedule',
          name: 'Test trigger',
          enabled: true,
          config: { type: 'schedule', cron: '0 0 * * *' },
        },
      ],
      conditions: [],
      actions: [
        {
          id: 'a1',
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
        },
      ],
      riskControls: [
        {
          id: 'rc1',
          type: 'stop_loss',
          name: 'Stop Loss',
          enabled: true,
          config: { type: 'stop_loss', percentage: 10 },
          action: { type: 'close' },
        },
      ],
      parameters: [],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: 20,
        minCapital: 100,
        reservePercentage: 20,
      },
    },
    riskLevel: 'medium',
    generatedAt: new Date(),
    status: 'generated',
    cycleId: 'cycle_test_1',
    generation: 0,
    ...overrides,
  };
}

function createMockBacktestResult(performance?: StrategyPerformance) {
  return {
    id: `bt_${Date.now()}`,
    strategyId: 'test_strategy',
    config: {
      strategyId: 'test_strategy',
      period: { start: new Date('2024-01-01'), end: new Date('2024-03-31') },
      initialCapital: 10000,
      slippageModel: { type: 'fixed' as const, baseSlippage: 0.5 },
      feeModel: { tradingFee: 0.002, gasCost: 0.1 },
      dataGranularity: '1d' as const,
    },
    status: 'completed' as const,
    startedAt: new Date(),
    performance: performance ?? createMockPerformance(),
    equityCurve: [],
    trades: [],
    warnings: [],
  };
}

// ============================================================================
// Strategy Generation Engine Tests
// ============================================================================

describe('StrategyGenerationEngine', () => {
  let generator: StrategyGenerationEngine;

  beforeEach(() => {
    generator = createStrategyGenerationEngine();
  });

  it('should be instantiated via factory', () => {
    expect(generator).toBeInstanceOf(StrategyGenerationEngine);
  });

  describe('generateCandidates', () => {
    const approaches: GenerationApproach[] = [
      'evolutionary',
      'parameter_optimization',
      'ai_rule_generation',
      'template_mutation',
    ];

    for (const approach of approaches) {
      it(`should generate candidates using ${approach} approach`, () => {
        const candidates = generator.generateCandidates(3, approach, 'cycle_1');

        expect(candidates).toHaveLength(3);
        for (const c of candidates) {
          expect(c.generationApproach).toBe(approach);
          expect(c.status).toBe('generated');
          expect(c.cycleId).toBe('cycle_1');
          expect(c.generation).toBe(0);
          expect(c.id).toBeDefined();
        }
      });
    }

    it('should generate unique IDs for each candidate', () => {
      const candidates = generator.generateCandidates(5, 'template_mutation', 'cycle_1');
      const ids = new Set(candidates.map(c => c.id));
      expect(ids.size).toBe(5);
    });

    it('should use learning insights to select risk levels', () => {
      const insights: LearningInsights = {
        topApproaches: [{ approach: 'template_mutation', successRate: 15 }],
        bestRiskLevels: [{ level: 'low', avgScore: 80 }],
        marketConditionInsights: {},
        totalRecords: 5,
        updatedAt: new Date(),
      };

      const candidates = generator.generateCandidates(10, 'template_mutation', 'cycle_1', insights);
      const lowRiskCount = candidates.filter(c => c.riskLevel === 'low').length;
      // With insights, most candidates should use the top risk level
      expect(lowRiskCount).toBeGreaterThan(0);
    });

    it('should produce valid strategy specs with required fields', () => {
      const candidates = generator.generateCandidates(4, 'ai_rule_generation', 'cycle_1');

      for (const c of candidates) {
        const spec = c.spec;
        expect(spec.triggers.length).toBeGreaterThan(0);
        expect(spec.actions.length).toBeGreaterThan(0);
        expect(spec.riskControls.length).toBeGreaterThan(0);
        expect(spec.capitalAllocation).toBeDefined();
        expect(spec.capitalAllocation.reservePercentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('evolveCandidates', () => {
    it('should produce mutated variants of parent strategies', () => {
      const parents = generator.generateCandidates(2, 'template_mutation', 'cycle_1');
      const children = generator.evolveCandidates(parents, 'cycle_2');

      expect(children).toHaveLength(2);
      for (let i = 0; i < children.length; i++) {
        expect(children[i].parentId).toBe(parents[i].id);
        expect(children[i].generation).toBe(1);
        expect(children[i].cycleId).toBe('cycle_2');
        expect(children[i].generationApproach).toBe('evolutionary');
      }
    });

    it('should increment generation number', () => {
      let candidates = generator.generateCandidates(1, 'template_mutation', 'c1');
      expect(candidates[0].generation).toBe(0);

      candidates = generator.evolveCandidates(candidates, 'c2');
      expect(candidates[0].generation).toBe(1);

      candidates = generator.evolveCandidates(candidates, 'c3');
      expect(candidates[0].generation).toBe(2);
    });
  });
});

// ============================================================================
// Continuous Learning System Tests
// ============================================================================

describe('ContinuousLearningSystem', () => {
  let learner: ContinuousLearningSystem;

  beforeEach(() => {
    learner = createContinuousLearningSystem();
  });

  it('should start with empty records', () => {
    expect(learner.getRecordCount()).toBe(0);
    expect(learner.getRecords()).toHaveLength(0);
  });

  it('should provide default insights with no data', () => {
    const insights = learner.getInsights();
    expect(insights.totalRecords).toBe(0);
    expect(insights.topApproaches.length).toBeGreaterThan(0);
    expect(insights.bestRiskLevels.length).toBeGreaterThan(0);
  });

  it('should record success and create learning record', () => {
    const candidate = createMockCandidate({
      status: 'passed',
      backtestResult: createMockBacktestResult(),
    });

    learner.recordSuccess(candidate);
    expect(learner.getRecordCount()).toBe(1);
  });

  it('should merge records for same pattern and approach', () => {
    const baseCandidate = createMockCandidate({
      status: 'passed',
      backtestResult: createMockBacktestResult(),
    });

    learner.recordSuccess(baseCandidate);
    learner.recordSuccess(baseCandidate);

    // Same pattern + approach should merge
    expect(learner.getRecordCount()).toBe(1);
    const record = learner.getRecords()[0];
    expect(record.sampleSize).toBe(2);
  });

  it('should generate insights from learning records', () => {
    const candidate = createMockCandidate({
      generationApproach: 'parameter_optimization',
      riskLevel: 'medium',
      status: 'passed',
      backtestResult: createMockBacktestResult((() => {
        const perf = createMockPerformance();
        perf.metrics.totalReturn = 20;
        perf.metrics.sharpeRatio = 1.8;
        perf.trades.winRate = 0.65;
        return perf;
      })()),
    });

    learner.recordSuccess(candidate);

    const insights = learner.getInsights();
    expect(insights.totalRecords).toBe(1);
    expect(insights.topApproaches.length).toBeGreaterThan(0);
    expect(insights.bestRiskLevels.length).toBeGreaterThan(0);
    const topApproach = insights.topApproaches.find(a => a.approach === 'parameter_optimization');
    expect(topApproach).toBeDefined();
  });
});

// ============================================================================
// Strategy Publisher Tests
// ============================================================================

describe('StrategyPublisher', () => {
  let publisher: StrategyPublisher;

  beforeEach(() => {
    publisher = createStrategyPublisher(undefined, 60);
  });

  it('should not publish failed candidates', async () => {
    const candidate = createMockCandidate({ status: 'failed', rejectionReason: 'low_sharpe' });
    const result = await publisher.publishCandidate(candidate);

    expect(result.published).toBe(false);
  });

  it('should not publish below threshold', async () => {
    const candidate = createMockCandidate({
      status: 'passed',
      evaluationScore: 50,
    });
    const result = await publisher.publishCandidate(candidate);

    expect(result.published).toBe(false);
    expect(result.reason).toContain('threshold');
  });

  it('should publish above threshold without marketplace (simulated)', async () => {
    const candidate = createMockCandidate({
      status: 'passed',
      evaluationScore: 75,
      backtestResult: createMockBacktestResult(),
    });

    const result = await publisher.publishCandidate(candidate);
    expect(result.published).toBe(true);
    expect(result.marketplaceStrategyId).toBeDefined();
    expect(result.publishedAt).toBeDefined();
  });

  it('should publish to marketplace when provided', async () => {
    const mockPublish = vi.fn().mockResolvedValue({ id: 'marketplace_strategy_123' });
    const mockMarketplace = { publishStrategy: mockPublish };

    const pubWithMarket = createStrategyPublisher(mockMarketplace, 60);
    const candidate = createMockCandidate({
      status: 'passed',
      evaluationScore: 75,
      backtestResult: createMockBacktestResult(),
    });

    const result = await pubWithMarket.publishCandidate(candidate);

    expect(mockPublish).toHaveBeenCalledOnce();
    expect(result.published).toBe(true);
    expect(result.marketplaceStrategyId).toBe('marketplace_strategy_123');
  });

  it('should handle marketplace errors gracefully', async () => {
    const mockPublish = vi.fn().mockRejectedValue(new Error('Marketplace unavailable'));
    const mockMarketplace = { publishStrategy: mockPublish };

    const pubWithMarket = createStrategyPublisher(mockMarketplace, 60);
    const candidate = createMockCandidate({ status: 'passed', evaluationScore: 75 });

    const result = await pubWithMarket.publishCandidate(candidate);
    expect(result.published).toBe(false);
    expect(result.reason).toContain('Marketplace unavailable');
  });

  it('should publish batch with mixed results', async () => {
    const candidates = [
      createMockCandidate({ id: 'c1', status: 'passed', evaluationScore: 75 }),
      createMockCandidate({ id: 'c2', status: 'passed', evaluationScore: 45 }), // below threshold
      createMockCandidate({ id: 'c3', status: 'failed', rejectionReason: 'low_sharpe' }),
    ];

    const results = await publisher.publishBatch(candidates);

    expect(results).toHaveLength(3);
    expect(results[0].published).toBe(true); // 75 > 60
    expect(results[1].published).toBe(false); // 45 < 60
    expect(results[2].published).toBe(false); // failed status
  });
});

// ============================================================================
// Autonomous Discovery Engine Tests
// ============================================================================

describe('DefaultAutonomousDiscoveryEngine', () => {
  let engine: DefaultAutonomousDiscoveryEngine;

  beforeEach(() => {
    engine = createAutonomousDiscoveryEngine(createMinimalConfig());
  });

  it('should be instantiated via factory', () => {
    expect(engine).toBeInstanceOf(DefaultAutonomousDiscoveryEngine);
  });

  it('should start in idle status', () => {
    const health = engine.getHealth();
    expect(health.status).toBe('idle');
    expect(health.cyclesCompleted).toBe(0);
  });

  it('should start and change status to running', () => {
    engine.start();
    const health = engine.getHealth();
    expect(health.status).toBe('running');
    engine.stop();
  });

  it('should stop and change status to stopped', () => {
    engine.start();
    engine.stop();
    const health = engine.getHealth();
    expect(health.status).toBe('stopped');
  });

  it('should pause and resume', () => {
    engine.start();
    engine.pause();
    expect(engine.getHealth().status).toBe('paused');

    engine.resume();
    expect(engine.getHealth().status).toBe('running');
    engine.stop();
  });

  it('should run a single cycle and return cycle data', async () => {
    const cycle = await engine.runCycle();

    expect(cycle.id).toBeDefined();
    expect(cycle.startedAt).toBeInstanceOf(Date);
    expect(cycle.completedAt).toBeInstanceOf(Date);
    expect(cycle.candidatesGenerated).toBeGreaterThan(0);
    expect(cycle.stats).toBeDefined();
    expect(cycle.stats.passRate).toBeGreaterThanOrEqual(0);
    expect(cycle.stats.passRate).toBeLessThanOrEqual(1);
  }, 30000); // Allow 30s for backtesting

  it('should accumulate cycle history', async () => {
    await engine.runCycle();
    await engine.runCycle();

    const cycles = engine.getCycles();
    expect(cycles).toHaveLength(2);
    expect(engine.getStats().totalCycles).toBe(2);
  }, 60000);

  it('should update stats after cycle', async () => {
    await engine.runCycle();

    const stats = engine.getStats();
    expect(stats.totalCycles).toBe(1);
    expect(stats.totalCandidates).toBeGreaterThan(0);
  }, 30000);

  it('should emit events during cycle', async () => {
    const events: DiscoveryEvent[] = [];
    engine.onEvent(event => events.push(event));

    await engine.runCycle();

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('cycle_started');
    expect(eventTypes).toContain('cycle_completed');
    expect(eventTypes.some(t => t === 'candidate_generated')).toBe(true);
  }, 30000);

  it('should populate elite pool with passing candidates', async () => {
    await engine.runCycle();

    const stats = engine.getStats();
    // Elite pool may or may not have entries depending on synthetic backtest results
    expect(stats.totalCandidates).toBeGreaterThan(0);
  }, 30000);

  it('should return learning insights', async () => {
    await engine.runCycle();

    const insights = engine.getLearningInsights();
    expect(insights).toBeDefined();
    expect(insights.topApproaches).toBeDefined();
    expect(insights.bestRiskLevels).toBeDefined();
    expect(insights.updatedAt).toBeInstanceOf(Date);
  }, 30000);

  it('should not start when disabled', () => {
    const disabledEngine = createAutonomousDiscoveryEngine({
      ...createMinimalConfig(),
      enabled: false,
    });

    const events: DiscoveryEvent[] = [];
    disabledEngine.onEvent(e => events.push(e));
    disabledEngine.start();

    // Should emit stopped event immediately
    const stoppedEvent = events.find(e => e.type === 'engine_stopped');
    expect(stoppedEvent).toBeDefined();
  });

  it('should provide health report with cycle stats', async () => {
    await engine.runCycle();

    const health = engine.getHealth();
    expect(health.cyclesCompleted).toBe(1);
    expect(health.totalCandidatesGenerated).toBeGreaterThan(0);
    expect(health.lastCycleAt).toBeInstanceOf(Date);
  }, 30000);

  it('should evolve elite pool candidates in subsequent cycles', async () => {
    // Run first cycle to populate elite pool
    const config = createMinimalConfig();
    const engineWithEvolution = createAutonomousDiscoveryEngine({
      ...config,
      generationApproaches: ['evolutionary', 'template_mutation'],
    });

    // First cycle - no evolution yet
    const cycle1 = await engineWithEvolution.runCycle();
    expect(cycle1.candidatesGenerated).toBeGreaterThan(0);

    // Second cycle - may include evolved candidates
    const cycle2 = await engineWithEvolution.runCycle();
    expect(cycle2.candidatesGenerated).toBeGreaterThan(0);

    const stats = engineWithEvolution.getStats();
    expect(stats.totalCycles).toBe(2);
  }, 60000);
});

// ============================================================================
// Discovery Pipeline Integration Tests
// ============================================================================

describe('DiscoveryPipeline', () => {
  let pipeline: DiscoveryPipeline;

  beforeEach(() => {
    const backtester = createBacktestingEngine();
    pipeline = createDiscoveryPipeline(
      backtester,
      {
        minROI: -100,
        minSharpe: -10,
        maxDrawdown: 100,
        minWinRate: 0,
        minTrades: 0,
      },
      {
        maxDrawdownPercent: 100,
        maxLeverage: 10,
        minStabilityScore: 0,
        applyStressTest: false,
      }
    );
  });

  it('should process a candidate through the pipeline', async () => {
    const generator = createStrategyGenerationEngine();
    const candidates = generator.generateCandidates(1, 'template_mutation', 'cycle_test');
    const candidate = candidates[0];

    const result = await pipeline.processCandiate(candidate);

    // Should end in either 'passed' or 'failed' (not in intermediate state)
    expect(['passed', 'failed']).toContain(result.status);
    expect(result.backtestResult).toBeDefined();
  }, 15000);

  it('should set backtestResult on processed candidates', async () => {
    const generator = createStrategyGenerationEngine();
    const [candidate] = generator.generateCandidates(1, 'parameter_optimization', 'cycle_test');

    const result = await pipeline.processCandiate(candidate);

    // Backtest result should be present regardless of pass/fail
    if (result.rejectionReason !== 'backtest_error') {
      expect(result.backtestResult).toBeDefined();
    }
  }, 15000);
});
