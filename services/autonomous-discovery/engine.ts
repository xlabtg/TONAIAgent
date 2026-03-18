/**
 * TONAIAgent - Autonomous Strategy Discovery Engine
 *
 * Orchestrates the full autonomous strategy discovery loop:
 *   AI Strategy Generator → Backtesting Engine → Risk Engine → Strategy Ranking → Marketplace
 *
 * The engine runs continuously in cycles, generating candidate strategies,
 * evaluating them, and publishing the best ones to the marketplace.
 */

import { createBacktestingEngine } from '../../core/strategies/engine/backtesting';
import type { StrategyEventCallback } from '../../core/strategies/engine';

import {
  StrategyGenerationEngine,
  createStrategyGenerationEngine,
} from './generator';
import {
  DiscoveryPipeline,
  createDiscoveryPipeline,
} from './pipeline';
import {
  ContinuousLearningSystem,
  createContinuousLearningSystem,
} from './learning';
import {
  StrategyPublisher,
  createStrategyPublisher,
} from './publisher';
import type { MarketplacePublisher } from './publisher';

import type {
  CandidateStrategy,
  DiscoveryCycle,
  DiscoveryEngineConfig,
  DiscoveryEngineHealth,
  DiscoveryEngineStats,
  DiscoveryEvent,
  DiscoveryEventCallback,
  DiscoveryStatus,
  EvaluationThresholds,
  GenerationApproach,
  LearningInsights,
  PublishingResult,
  RiskFilterConfig,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: DiscoveryEngineConfig = {
  enabled: true,
  maxCandidatesPerCycle: 10,
  cycleIntervalMs: 3600000, // 1 hour
  generationApproaches: [
    'template_mutation',
    'parameter_optimization',
    'ai_rule_generation',
    'evolutionary',
  ],
  evaluationThresholds: {
    minROI: 5,
    minSharpe: 0.5,
    maxDrawdown: 30,
    minWinRate: 0.4,
    minTrades: 5,
  },
  riskFilter: {
    maxDrawdownPercent: 35,
    maxLeverage: 3,
    minStabilityScore: 0.3,
    applyStressTest: false,
  },
  autoPublish: true,
  publishThreshold: 65,
  elitePoolSize: 20,
  continuousLearningEnabled: true,
};

// ============================================================================
// Autonomous Discovery Engine Interface
// ============================================================================

export interface AutonomousDiscoveryEngine {
  readonly config: DiscoveryEngineConfig;

  /** Start the discovery engine (begins automatic cycling) */
  start(): void;

  /** Stop the discovery engine */
  stop(): void;

  /** Pause the discovery engine (can be resumed) */
  pause(): void;

  /** Resume a paused engine */
  resume(): void;

  /** Run a single discovery cycle manually */
  runCycle(): Promise<DiscoveryCycle>;

  /** Get current engine health */
  getHealth(): DiscoveryEngineHealth;

  /** Get cumulative engine statistics */
  getStats(): DiscoveryEngineStats;

  /** Get all candidates from the current elite pool */
  getElitePool(): CandidateStrategy[];

  /** Get all completed cycles */
  getCycles(): DiscoveryCycle[];

  /** Get learning insights from the continuous learning system */
  getLearningInsights(): LearningInsights;

  /** Subscribe to discovery events */
  onEvent(callback: DiscoveryEventCallback): void;

  /** Subscribe to strategy events (forwarded to strategy engine) */
  onStrategyEvent(callback: StrategyEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAutonomousDiscoveryEngine implements AutonomousDiscoveryEngine {
  readonly config: DiscoveryEngineConfig;

  private status: DiscoveryStatus = 'idle';
  private cycleTimer?: ReturnType<typeof setTimeout>;
  private readonly cycles: DiscoveryCycle[] = [];
  private readonly elitePool: CandidateStrategy[] = [];
  private readonly eventCallbacks: DiscoveryEventCallback[] = [];
  private cycleCounter = 0;

  private readonly generator: StrategyGenerationEngine;
  private readonly pipeline: DiscoveryPipeline;
  private readonly learningSystem: ContinuousLearningSystem;
  private readonly publisher: StrategyPublisher;

  constructor(
    config: Partial<DiscoveryEngineConfig> = {},
    marketplace?: MarketplacePublisher
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      evaluationThresholds: {
        ...DEFAULT_CONFIG.evaluationThresholds,
        ...config.evaluationThresholds,
      },
      riskFilter: {
        ...DEFAULT_CONFIG.riskFilter,
        ...config.riskFilter,
      },
    };

    const backtester = createBacktestingEngine();
    this.generator = createStrategyGenerationEngine();
    this.pipeline = createDiscoveryPipeline(
      backtester,
      this.config.evaluationThresholds,
      this.config.riskFilter
    );
    this.learningSystem = createContinuousLearningSystem();
    this.publisher = createStrategyPublisher(marketplace, this.config.publishThreshold);
  }

  // ============================================================================
  // Engine Control
  // ============================================================================

  start(): void {
    if (!this.config.enabled) {
      this.emitEvent('engine_stopped', { reason: 'Engine is disabled in config' });
      return;
    }

    if (this.status === 'running') return;

    this.status = 'running';
    this.emitEvent('engine_started', { cycleIntervalMs: this.config.cycleIntervalMs });
    this.scheduleNextCycle();
  }

  stop(): void {
    this.status = 'stopped';
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = undefined;
    }
    this.emitEvent('engine_stopped', {});
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = undefined;
    }
    this.emitEvent('engine_paused', {});
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.emitEvent('engine_started', { resumed: true });
    this.scheduleNextCycle();
  }

  // ============================================================================
  // Discovery Cycle
  // ============================================================================

  async runCycle(): Promise<DiscoveryCycle> {
    const cycleId = `cycle_${++this.cycleCounter}_${Date.now()}`;
    const startedAt = new Date();

    this.emitEvent('cycle_started', { cycleId });

    const cycle: DiscoveryCycle = {
      id: cycleId,
      startedAt,
      candidatesGenerated: 0,
      backtestsPassed: 0,
      riskFiltersPassed: 0,
      evaluationsPassed: 0,
      published: 0,
      stats: {
        avgEvaluationScore: 0,
        avgSharpe: 0,
        avgROI: 0,
        avgDrawdown: 0,
        passRate: 0,
      },
    };

    try {
      // Step 1: Generate candidates
      const insights = this.config.continuousLearningEnabled
        ? this.learningSystem.getInsights()
        : undefined;

      const candidates = this.generateCandidates(cycleId, insights);
      cycle.candidatesGenerated = candidates.length;

      // Emit generation events
      for (const c of candidates) {
        this.emitEvent('candidate_generated', { candidateId: c.id, approach: c.generationApproach });
      }

      // Step 2: Process through pipeline (backtest → risk filter → evaluate)
      const processed: CandidateStrategy[] = [];
      for (const candidate of candidates) {
        const result = await this.pipeline.processCandiate(candidate);
        processed.push(result);

        if (result.status !== 'generated') {
          this.emitEvent('candidate_backtested', {
            candidateId: result.id,
            status: result.status,
            rejection: result.rejectionReason,
          });
        }
      }

      // Step 3: Count results
      const backtestPassed = processed.filter(
        c => c.status !== 'failed' || c.rejectionReason !== 'backtest_error'
      );
      cycle.backtestsPassed = backtestPassed.filter(
        c => c.backtestResult?.status === 'completed'
      ).length;

      cycle.riskFiltersPassed = processed.filter(
        c => c.status === 'evaluating' || c.status === 'passed' || c.status === 'published'
      ).length;

      const passed = processed.filter(c => c.status === 'passed');
      cycle.evaluationsPassed = passed.length;

      // Step 4: Update elite pool
      this.updateElitePool(passed);

      // Step 5: Learning
      if (this.config.continuousLearningEnabled) {
        for (const c of passed) {
          this.learningSystem.recordSuccess(c);
        }
        for (const c of processed.filter(c => c.status === 'failed')) {
          this.learningSystem.recordFailure(c);
        }
        if (passed.length > 0) {
          this.emitEvent('learning_updated', {
            successCount: passed.length,
            failCount: processed.length - passed.length,
          });
        }
      }

      // Step 6: Auto-publish if enabled
      let publishingResults: PublishingResult[] = [];
      if (this.config.autoPublish && passed.length > 0) {
        // Only publish top candidates
        const topCandidates = passed
          .sort((a, b) => (b.evaluationScore ?? 0) - (a.evaluationScore ?? 0))
          .slice(0, 3);

        publishingResults = await this.publisher.publishBatch(topCandidates);

        for (const result of publishingResults) {
          if (result.published) {
            const publishedCandidate = passed.find(c => c.id === result.candidateId);
            if (publishedCandidate) {
              publishedCandidate.status = 'published';
            }
            this.emitEvent('strategy_published', {
              candidateId: result.candidateId,
              marketplaceId: result.marketplaceStrategyId,
            });
          }
        }

        cycle.published = publishingResults.filter(r => r.published).length;
      }

      // Step 7: Compute cycle stats
      cycle.stats = this.computeCycleStats(processed, passed);
      cycle.completedAt = new Date();

      // Best candidate
      if (passed.length > 0) {
        cycle.bestCandidate = passed.reduce((best, c) =>
          (c.evaluationScore ?? 0) > (best.evaluationScore ?? 0) ? c : best
        );
      }

      this.cycles.push(cycle);
      this.emitEvent('cycle_completed', {
        cycleId,
        generated: cycle.candidatesGenerated,
        passed: cycle.evaluationsPassed,
        published: cycle.published,
        passRate: cycle.stats.passRate,
      });
    } catch (error) {
      cycle.completedAt = new Date();
      this.cycles.push(cycle);
      this.emitEvent('cycle_completed', {
        cycleId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return cycle;
  }

  // ============================================================================
  // Observability
  // ============================================================================

  getHealth(): DiscoveryEngineHealth {
    const lastCycle = this.cycles[this.cycles.length - 1];
    const nextCycleAt =
      this.status === 'running'
        ? new Date(Date.now() + this.config.cycleIntervalMs)
        : undefined;

    const totalCandidates = this.cycles.reduce((s, c) => s + c.candidatesGenerated, 0);
    const totalPassed = this.cycles.reduce((s, c) => s + c.evaluationsPassed, 0);

    return {
      status: this.status,
      isHealthy: this.status !== 'stopped',
      cyclesCompleted: this.cycles.length,
      totalCandidatesGenerated: totalCandidates,
      totalStrategiesPublished: this.cycles.reduce((s, c) => s + c.published, 0),
      averagePassRate: totalCandidates > 0 ? totalPassed / totalCandidates : 0,
      lastCycleAt: lastCycle?.completedAt,
      nextCycleAt,
    };
  }

  getStats(): DiscoveryEngineStats {
    const allCycles = this.cycles;
    const totalCandidates = allCycles.reduce((s, c) => s + c.candidatesGenerated, 0);
    const totalPassed = allCycles.reduce((s, c) => s + c.evaluationsPassed, 0);

    const allSharpe = allCycles.map(c => c.stats.avgSharpe).filter(v => v > 0);
    const avgSharpe = allSharpe.length > 0 ? allSharpe.reduce((s, v) => s + v, 0) / allSharpe.length : 0;

    const bestScore = this.elitePool.reduce(
      (best, c) => Math.max(best, c.evaluationScore ?? 0),
      0
    );

    return {
      totalCycles: allCycles.length,
      totalCandidates,
      totalPublished: allCycles.reduce((s, c) => s + c.published, 0),
      overallPassRate: totalCandidates > 0 ? totalPassed / totalCandidates : 0,
      bestEvaluationScore: bestScore,
      avgSharpeAcrossCycles: avgSharpe,
      learningRecords: this.learningSystem.getRecordCount(),
    };
  }

  getElitePool(): CandidateStrategy[] {
    return [...this.elitePool];
  }

  getCycles(): DiscoveryCycle[] {
    return [...this.cycles];
  }

  getLearningInsights(): LearningInsights {
    return this.learningSystem.getInsights();
  }

  onEvent(callback: DiscoveryEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  onStrategyEvent(_callback: StrategyEventCallback): void {
    // Strategy events are forwarded if a strategy engine is wired in.
    // Currently a pass-through for future integration.
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateCandidates(
    cycleId: string,
    insights?: LearningInsights
  ): CandidateStrategy[] {
    const all: CandidateStrategy[] = [];
    const approaches = this.config.generationApproaches;
    const perApproach = Math.ceil(
      this.config.maxCandidatesPerCycle / approaches.length
    );

    for (const approach of approaches) {
      const count = Math.min(
        perApproach,
        this.config.maxCandidatesPerCycle - all.length
      );
      const candidates = this.generator.generateCandidates(
        count,
        approach,
        cycleId,
        insights
      );
      all.push(...candidates);
    }

    // If elite pool exists and evolutionary approach is enabled, also mutate top candidates
    if (
      approaches.includes('evolutionary') &&
      this.elitePool.length > 0 &&
      all.length < this.config.maxCandidatesPerCycle
    ) {
      const parents = this.elitePool
        .slice(0, 3)
        .filter(c => c.status === 'passed' || c.status === 'published');

      if (parents.length > 0) {
        const mutations = this.generator.evolveCandidates(parents, cycleId);
        all.push(...mutations.slice(0, this.config.maxCandidatesPerCycle - all.length));
      }
    }

    return all;
  }

  private updateElitePool(passed: CandidateStrategy[]): void {
    // Add passed candidates to the pool
    this.elitePool.push(...passed);

    // Keep only the top N by score
    this.elitePool.sort(
      (a, b) => (b.evaluationScore ?? 0) - (a.evaluationScore ?? 0)
    );

    if (this.elitePool.length > this.config.elitePoolSize) {
      this.elitePool.splice(this.config.elitePoolSize);
    }
  }

  private computeCycleStats(
    processed: CandidateStrategy[],
    passed: CandidateStrategy[]
  ): DiscoveryCycle['stats'] {
    if (processed.length === 0) {
      return { avgEvaluationScore: 0, avgSharpe: 0, avgROI: 0, avgDrawdown: 0, passRate: 0 };
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    const scores = passed.map(c => c.evaluationScore ?? 0);
    const sharpes = passed
      .map(c => c.backtestResult?.performance.metrics.sharpeRatio ?? 0)
      .filter(v => v > 0);
    const rois = passed
      .map(c => c.backtestResult?.performance.metrics.totalReturn ?? 0)
      .filter(v => v !== 0);
    const drawdowns = passed.map(c =>
      Math.abs(c.backtestResult?.performance.metrics.maxDrawdown ?? 0)
    );

    return {
      avgEvaluationScore: avg(scores),
      avgSharpe: avg(sharpes),
      avgROI: avg(rois),
      avgDrawdown: avg(drawdowns),
      passRate: processed.length > 0 ? passed.length / processed.length : 0,
    };
  }

  private scheduleNextCycle(): void {
    if (this.status !== 'running') return;

    this.cycleTimer = setTimeout(async () => {
      if (this.status === 'running') {
        try {
          await this.runCycle();
        } catch {
          // Cycle errors are caught inside runCycle
        }
        this.scheduleNextCycle();
      }
    }, this.config.cycleIntervalMs);
  }

  private emitEvent(
    type: DiscoveryEvent['type'],
    data: Record<string, unknown>,
    severity: DiscoveryEvent['severity'] = 'info'
  ): void {
    const event: DiscoveryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: new Date(),
      data,
      severity,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAutonomousDiscoveryEngine(
  config?: Partial<DiscoveryEngineConfig>,
  marketplace?: MarketplacePublisher
): DefaultAutonomousDiscoveryEngine {
  return new DefaultAutonomousDiscoveryEngine(config, marketplace);
}

// Re-export approach and threshold types for convenience
export type {
  EvaluationThresholds,
  RiskFilterConfig,
  GenerationApproach,
};
