/**
 * TONAIAgent - Strategy Agent with Continuous Learning
 *
 * Implements the continuous learning engine for the autonomous hedge fund.
 * Manages strategy optimization, backtesting, reinforcement learning,
 * and live adaptation based on market performance feedback.
 */

import {
  StrategyAgentConfig,
  StrategyType,
  StrategyPerformance,
  StrategyAllocation,
  StrategyAllocationItem,
  RLAgentConfig,
  BacktestConfig,
  LiveAdaptationConfig,
  OptimizationConfig,
  HedgeFundEvent,
  HedgeFundEventCallback,
} from './types';

// ============================================================================
// Strategy Agent Interface
// ============================================================================

export interface StrategyAgent {
  readonly config: StrategyAgentConfig;

  // Configuration
  configure(config: Partial<StrategyAgentConfig>): Promise<void>;

  // Strategy management
  getActiveStrategies(): StrategyType[];
  getStrategyAllocation(): StrategyAllocation;
  updateStrategyAllocation(allocation: Partial<StrategyAllocation>): Promise<void>;

  // Backtesting
  runBacktest(strategy: StrategyType, params?: BacktestParams): Promise<BacktestResult>;
  getBacktestHistory(strategy: StrategyType): BacktestResult[];

  // Strategy optimization
  optimizeStrategy(strategy: StrategyType, params?: OptimizationParams): Promise<OptimizationResult>;
  optimizeAllStrategies(): Promise<OptimizationResult[]>;

  // Reinforcement learning
  registerRLAgent(config: RLAgentConfig): Promise<RLAgentState>;
  updateRLAgent(agentId: string, experience: RLExperience): Promise<void>;
  getRLAgentState(agentId: string): RLAgentState | undefined;
  listRLAgents(): RLAgentState[];

  // Performance tracking
  recordPerformance(strategy: StrategyType, performance: Partial<StrategyPerformance>): void;
  getPerformance(strategy: StrategyType): StrategyPerformance | undefined;
  getAllPerformance(): StrategyPerformance[];

  // Live adaptation
  checkAdaptationNeeded(strategy: StrategyType): AdaptationCheck;
  applyAdaptation(strategy: StrategyType, params: AdaptationParams): Promise<AdaptationResult>;
  rollbackAdaptation(strategy: StrategyType, snapshotId: string): Promise<void>;

  // Signal weighting
  updateSignalWeights(strategy: StrategyType, weights: SignalWeightUpdate[]): Promise<void>;
  getSignalWeights(strategy: StrategyType): SignalWeightMap;

  // Meta-strategy optimization
  runMetaOptimization(): Promise<MetaOptimizationResult>;
  getCapitalRecommendations(): CapitalAllocationRecommendation[];

  // Events
  onEvent(callback: HedgeFundEventCallback): void;
}

// ============================================================================
// Strategy Agent Types
// ============================================================================

export interface BacktestParams {
  startDate?: Date;
  endDate?: Date;
  initialCapital?: number;
  customConfig?: Record<string, unknown>;
}

export interface BacktestResult {
  id: string;
  strategy: StrategyType;
  timestamp: Date;
  params: BacktestParams;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  annualizedReturn: number;
  winRate: number;
  profitFactor: number;
  tradesCount: number;
  passed: boolean;
  failureReasons: string[];
}

export interface OptimizationParams {
  targetMetric?: 'sharpe' | 'sortino' | 'returns' | 'calmar';
  method?: 'grid_search' | 'bayesian' | 'genetic' | 'random';
  iterations?: number;
  lookbackDays?: number;
}

export interface OptimizationResult {
  strategy: StrategyType;
  timestamp: Date;
  method: string;
  bestParams: Record<string, unknown>;
  expectedImprovement: number;
  currentMetric: number;
  optimizedMetric: number;
  iterations: number;
  applied: boolean;
}

export interface RLAgentState {
  id: string;
  config: RLAgentConfig;
  state: 'training' | 'evaluation' | 'live';
  totalEpisodes: number;
  totalReward: number;
  averageReward: number;
  explorationRate: number;
  lastUpdatedAt: Date;
  performance: {
    recentReward: number;
    bestEpisodeReward: number;
    convergenceScore: number;
  };
}

export interface RLExperience {
  state: Record<string, number>;
  action: number | string;
  reward: number;
  nextState: Record<string, number>;
  done: boolean;
}

export interface AdaptationCheck {
  needed: boolean;
  strategy: StrategyType;
  reason?: string;
  confidence: number;
  suggestedChanges: string[];
  dataPointsAvailable: number;
  minRequired: number;
}

export interface AdaptationParams {
  learningRate?: number;
  paramUpdates?: Record<string, unknown>;
  signalWeightUpdates?: SignalWeightUpdate[];
  reason?: string;
}

export interface AdaptationResult {
  snapshotId: string;
  strategy: StrategyType;
  applied: boolean;
  changes: Record<string, { from: unknown; to: unknown }>;
  timestamp: Date;
  rollbackAvailable: boolean;
}

export interface SignalWeightUpdate {
  signalType: string;
  weight: number;
}

export type SignalWeightMap = Record<string, number>;

export interface MetaOptimizationResult {
  timestamp: Date;
  strategiesAnalyzed: number;
  recommendedAllocations: Record<StrategyType, number>;
  expectedPortfolioSharpe: number;
  currentPortfolioSharpe: number;
  insights: string[];
}

export interface CapitalAllocationRecommendation {
  strategy: StrategyType;
  currentPercent: number;
  recommendedPercent: number;
  reason: string;
  confidence: number;
  expectedImpact: string;
}

// ============================================================================
// Default Strategy Agent Implementation
// ============================================================================

export class DefaultStrategyAgent implements StrategyAgent {
  private _config: StrategyAgentConfig;

  private readonly strategyPerformance: Map<StrategyType, InternalStrategyPerformance> = new Map();
  private readonly backtestHistory: Map<StrategyType, BacktestResult[]> = new Map();
  private readonly rlAgents: Map<string, RLAgentState> = new Map();
  private readonly signalWeights: Map<StrategyType, SignalWeightMap> = new Map();
  private readonly adaptationSnapshots: Map<string, AdaptationSnapshot> = new Map();
  private readonly eventCallbacks: HedgeFundEventCallback[] = [];

  private dataPointsCollected: Map<StrategyType, number> = new Map();

  constructor(config?: Partial<StrategyAgentConfig>) {
    this._config = this.createDefaultConfig(config);
    this.initializePerformanceTracking();
    this.initializeDefaultSignalWeights();
  }

  get config(): StrategyAgentConfig {
    return { ...this._config };
  }

  async configure(config: Partial<StrategyAgentConfig>): Promise<void> {
    this._config = {
      ...this._config,
      ...config,
      optimization: config.optimization
        ? { ...this._config.optimization, ...config.optimization }
        : this._config.optimization,
      backtesting: config.backtesting
        ? { ...this._config.backtesting, ...config.backtesting }
        : this._config.backtesting,
      liveAdaptation: config.liveAdaptation
        ? { ...this._config.liveAdaptation, ...config.liveAdaptation }
        : this._config.liveAdaptation,
    };
  }

  getActiveStrategies(): StrategyType[] {
    return this._config.strategyTypes.filter(() => this._config.enabled);
  }

  getStrategyAllocation(): StrategyAllocation {
    const allocations: StrategyAllocationItem[] = this._config.strategyTypes.map((strategy) => {
      const perf = this.strategyPerformance.get(strategy);
      return {
        strategyType: strategy,
        targetPercent: this.calculateTargetAllocation(strategy),
        currentPercent: perf ? 1 / this._config.strategyTypes.length : 0,
        minPercent: 0.05,
        maxPercent: 0.50,
        enabled: true,
      };
    });

    return {
      allocations,
      rebalanceThreshold: 0.05,
      lastRebalance: new Date(),
    };
  }

  async updateStrategyAllocation(allocation: Partial<StrategyAllocation>): Promise<void> {
    this.emitEvent('info', 'strategy_agent', 'Strategy allocation updated', {
      allocation,
    });
  }

  async runBacktest(strategy: StrategyType, params: BacktestParams = {}): Promise<BacktestResult> {
    this.emitEvent('info', 'strategy_agent', `Running backtest for ${strategy}`);

    const backtestConfig = this._config.backtesting;
    const lookbackDays = params.customConfig?.lookbackDays as number ?? backtestConfig.lookbackPeriod;
    const initialCapital = params.initialCapital ?? 1000000;

    // Simulate backtest computation
    const result = this.simulateBacktest(strategy, initialCapital, lookbackDays);

    const passed =
      result.sharpeRatio >= backtestConfig.minSharpe &&
      result.maxDrawdown <= backtestConfig.maxDrawdown &&
      result.winRate >= backtestConfig.minWinRate;

    const failureReasons: string[] = [];
    if (result.sharpeRatio < backtestConfig.minSharpe) {
      failureReasons.push(
        `Sharpe ratio ${result.sharpeRatio.toFixed(2)} below minimum ${backtestConfig.minSharpe}`
      );
    }
    if (result.maxDrawdown > backtestConfig.maxDrawdown) {
      failureReasons.push(
        `Max drawdown ${(result.maxDrawdown * 100).toFixed(1)}% exceeds limit ${(backtestConfig.maxDrawdown * 100).toFixed(1)}%`
      );
    }
    if (result.winRate < backtestConfig.minWinRate) {
      failureReasons.push(
        `Win rate ${(result.winRate * 100).toFixed(1)}% below minimum ${(backtestConfig.minWinRate * 100).toFixed(1)}%`
      );
    }

    const backtestResult: BacktestResult = {
      id: `backtest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      strategy,
      timestamp: new Date(),
      params,
      ...result,
      passed,
      failureReasons,
    };

    // Store in history
    const history = this.backtestHistory.get(strategy) ?? [];
    history.push(backtestResult);
    this.backtestHistory.set(strategy, history);

    this.emitEvent('info', 'strategy_agent', `Backtest completed for ${strategy}`, {
      strategyId: strategy,
      passed,
      sharpe: result.sharpeRatio,
      maxDrawdown: result.maxDrawdown,
    });

    return backtestResult;
  }

  getBacktestHistory(strategy: StrategyType): BacktestResult[] {
    return this.backtestHistory.get(strategy) ?? [];
  }

  async optimizeStrategy(
    strategy: StrategyType,
    params: OptimizationParams = {}
  ): Promise<OptimizationResult> {
    const optConfig = this._config.optimization;
    const method = params.method ?? optConfig.method;
    const targetMetric = params.targetMetric ?? optConfig.targetMetric;
    const iterations = params.iterations ?? 50;

    this.emitEvent('info', 'strategy_agent', `Optimizing strategy ${strategy} using ${method}`);

    // Run multiple backtests with varying parameters
    const currentPerf = this.strategyPerformance.get(strategy);
    const currentMetric = this.getMetricValue(currentPerf, targetMetric);

    // Simulate optimization search
    const bestParams = this.runOptimizationSearch(strategy, method, iterations);
    const optimizedMetric = currentMetric * (1 + 0.05 + Math.random() * 0.15);

    const result: OptimizationResult = {
      strategy,
      timestamp: new Date(),
      method,
      bestParams,
      expectedImprovement: optimizedMetric - currentMetric,
      currentMetric,
      optimizedMetric,
      iterations,
      applied: false,
    };

    this.emitEvent('info', 'strategy_agent', `Optimization completed for ${strategy}`, {
      strategy,
      method,
      improvement: result.expectedImprovement,
    });

    return result;
  }

  async optimizeAllStrategies(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    for (const strategy of this._config.strategyTypes) {
      const result = await this.optimizeStrategy(strategy);
      results.push(result);
    }
    return results;
  }

  async registerRLAgent(config: RLAgentConfig): Promise<RLAgentState> {
    const state: RLAgentState = {
      id: config.id,
      config,
      state: config.state,
      totalEpisodes: 0,
      totalReward: 0,
      averageReward: 0,
      explorationRate: 1.0, // Start with full exploration
      lastUpdatedAt: new Date(),
      performance: {
        recentReward: 0,
        bestEpisodeReward: 0,
        convergenceScore: 0,
      },
    };

    this.rlAgents.set(config.id, state);

    this.emitEvent('info', 'strategy_agent', `RL agent registered: ${config.id}`, {
      agentId: config.id,
      algorithm: config.algorithm,
      environment: config.environment,
    });

    return state;
  }

  async updateRLAgent(agentId: string, experience: RLExperience): Promise<void> {
    const agent = this.rlAgents.get(agentId);
    if (!agent) {
      throw new Error(`RL agent ${agentId} not found`);
    }

    agent.totalEpisodes += 1;
    agent.totalReward += experience.reward;
    agent.averageReward = agent.totalReward / agent.totalEpisodes;

    // Update performance tracking
    if (experience.done) {
      agent.performance.recentReward = experience.reward;
      if (experience.reward > agent.performance.bestEpisodeReward) {
        agent.performance.bestEpisodeReward = experience.reward;
      }
      // Calculate convergence score based on reward variance
      agent.performance.convergenceScore = Math.min(
        1,
        agent.totalEpisodes / 1000 // Convergence after ~1000 episodes
      );
    }

    // Decay exploration rate (epsilon-greedy)
    agent.explorationRate = Math.max(0.01, agent.explorationRate * 0.995);
    agent.lastUpdatedAt = new Date();
  }

  getRLAgentState(agentId: string): RLAgentState | undefined {
    return this.rlAgents.get(agentId);
  }

  listRLAgents(): RLAgentState[] {
    return Array.from(this.rlAgents.values());
  }

  recordPerformance(strategy: StrategyType, performance: Partial<StrategyPerformance>): void {
    const existing = this.strategyPerformance.get(strategy);
    const updated: InternalStrategyPerformance = {
      strategyType: strategy,
      totalReturn: performance.totalReturn ?? existing?.totalReturn ?? 0,
      sharpeRatio: performance.sharpeRatio ?? existing?.sharpeRatio ?? 0,
      sortinoRatio: performance.sortinoRatio ?? existing?.sortinoRatio ?? 0,
      maxDrawdown: performance.maxDrawdown ?? existing?.maxDrawdown ?? 0,
      winRate: performance.winRate ?? existing?.winRate ?? 0,
      profitFactor: performance.profitFactor ?? existing?.profitFactor ?? 1,
      tradesCount: performance.tradesCount ?? existing?.tradesCount ?? 0,
      avgTradeReturn: performance.avgTradeReturn ?? existing?.avgTradeReturn ?? 0,
      period: performance.period ?? 'current',
    };

    this.strategyPerformance.set(strategy, updated);

    // Track data points for adaptation
    const current = this.dataPointsCollected.get(strategy) ?? 0;
    this.dataPointsCollected.set(strategy, current + 1);
  }

  getPerformance(strategy: StrategyType): StrategyPerformance | undefined {
    return this.strategyPerformance.get(strategy);
  }

  getAllPerformance(): StrategyPerformance[] {
    return Array.from(this.strategyPerformance.values());
  }

  checkAdaptationNeeded(strategy: StrategyType): AdaptationCheck {
    const liveConfig = this._config.liveAdaptation;
    const dataPoints = this.dataPointsCollected.get(strategy) ?? 0;
    const perf = this.strategyPerformance.get(strategy);

    if (!liveConfig.enabled) {
      return {
        needed: false,
        strategy,
        reason: 'Live adaptation is disabled',
        confidence: 0,
        suggestedChanges: [],
        dataPointsAvailable: dataPoints,
        minRequired: liveConfig.minDataPoints,
      };
    }

    if (dataPoints < liveConfig.minDataPoints) {
      return {
        needed: false,
        strategy,
        reason: `Insufficient data: ${dataPoints}/${liveConfig.minDataPoints} data points`,
        confidence: dataPoints / liveConfig.minDataPoints,
        suggestedChanges: [],
        dataPointsAvailable: dataPoints,
        minRequired: liveConfig.minDataPoints,
      };
    }

    // Check if performance has degraded
    const degraded = perf && perf.sharpeRatio < 1.0;
    const lowWinRate = perf && perf.winRate < 0.45;
    const highDrawdown = perf && perf.maxDrawdown > 0.15;

    const needed = degraded || lowWinRate || highDrawdown;
    const suggestedChanges: string[] = [];

    if (degraded) suggestedChanges.push('Increase signal weighting for momentum indicators');
    if (lowWinRate) suggestedChanges.push('Adjust entry/exit thresholds to improve win rate');
    if (highDrawdown) suggestedChanges.push('Tighten stop-loss parameters');

    const confidence = perf ? Math.min(1.0, dataPoints / (liveConfig.minDataPoints * 2)) : 0;

    return {
      needed: needed ?? false,
      strategy,
      reason: needed ? 'Performance degradation detected' : 'Performance within acceptable range',
      confidence,
      suggestedChanges,
      dataPointsAvailable: dataPoints,
      minRequired: liveConfig.minDataPoints,
    };
  }

  async applyAdaptation(
    strategy: StrategyType,
    params: AdaptationParams = {}
  ): Promise<AdaptationResult> {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const liveConfig = this._config.liveAdaptation;

    // Save current state as snapshot for rollback
    const currentWeights = { ...this.getSignalWeights(strategy) };
    this.adaptationSnapshots.set(snapshotId, {
      strategy,
      signalWeights: currentWeights,
      timestamp: new Date(),
    });

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Apply signal weight updates
    if (params.signalWeightUpdates) {
      for (const update of params.signalWeightUpdates) {
        const currentWeight = currentWeights[update.signalType] ?? 0;
        changes[`signal_${update.signalType}`] = {
          from: currentWeight,
          to: update.weight,
        };
      }
      await this.updateSignalWeights(strategy, params.signalWeightUpdates);
    }

    // Apply learning rate adjustment
    if (params.learningRate !== undefined) {
      changes['learningRate'] = {
        from: liveConfig.learningRate,
        to: params.learningRate,
      };
      this._config = {
        ...this._config,
        liveAdaptation: {
          ...liveConfig,
          learningRate: params.learningRate,
        },
      };
    }

    this.emitEvent('info', 'strategy_agent', `Adaptation applied to ${strategy}`, {
      strategy,
      snapshotId,
      changesCount: Object.keys(changes).length,
      reason: params.reason,
    });

    return {
      snapshotId,
      strategy,
      applied: true,
      changes,
      timestamp: new Date(),
      rollbackAvailable: liveConfig.rollbackEnabled,
    };
  }

  async rollbackAdaptation(strategy: StrategyType, snapshotId: string): Promise<void> {
    const snapshot = this.adaptationSnapshots.get(snapshotId);
    if (!snapshot || snapshot.strategy !== strategy) {
      throw new Error(`Snapshot ${snapshotId} not found for strategy ${strategy}`);
    }

    // Restore signal weights from snapshot
    this.signalWeights.set(strategy, snapshot.signalWeights);

    this.emitEvent('warning', 'strategy_agent', `Adaptation rolled back for ${strategy}`, {
      strategy,
      snapshotId,
    });
  }

  async updateSignalWeights(
    strategy: StrategyType,
    weights: SignalWeightUpdate[]
  ): Promise<void> {
    const current = this.signalWeights.get(strategy) ?? {};
    for (const update of weights) {
      current[update.signalType] = Math.max(0, Math.min(1, update.weight));
    }
    this.signalWeights.set(strategy, current);
  }

  getSignalWeights(strategy: StrategyType): SignalWeightMap {
    return { ...(this.signalWeights.get(strategy) ?? this.getDefaultSignalWeights(strategy)) };
  }

  async runMetaOptimization(): Promise<MetaOptimizationResult> {
    this.emitEvent('info', 'strategy_agent', 'Running meta-strategy optimization');

    const performances = this.getAllPerformance();
    const strategiesAnalyzed = performances.length;

    // Calculate optimal allocations using risk-adjusted returns
    const recommendedAllocations: Record<string, number> = {};
    let totalScore = 0;
    const scores: Record<string, number> = {};

    for (const perf of performances) {
      const score = Math.max(0, perf.sharpeRatio * perf.winRate * (1 - perf.maxDrawdown));
      scores[perf.strategyType] = score;
      totalScore += score;
    }

    // Normalize to sum to 1
    if (totalScore > 0) {
      for (const [strategy, score] of Object.entries(scores)) {
        recommendedAllocations[strategy] = score / totalScore;
      }
    } else {
      // Equal weight if no performance data
      const equalWeight = 1 / Math.max(1, strategiesAnalyzed);
      for (const perf of performances) {
        recommendedAllocations[perf.strategyType] = equalWeight;
      }
    }

    const currentSharpe = performances.length > 0
      ? performances.reduce((sum, p) => sum + p.sharpeRatio, 0) / performances.length
      : 0;

    const expectedSharpe = currentSharpe * 1.1; // Modest improvement expectation

    const insights: string[] = [];
    const topStrategy = performances.sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0];
    const worstStrategy = performances.sort((a, b) => a.sharpeRatio - b.sharpeRatio)[0];

    if (topStrategy) {
      insights.push(
        `${topStrategy.strategyType} is the top performer with Sharpe ratio of ${topStrategy.sharpeRatio.toFixed(2)}`
      );
    }
    if (worstStrategy && worstStrategy.sharpeRatio < 1.0) {
      insights.push(
        `${worstStrategy.strategyType} underperforming — consider reducing allocation or parameter optimization`
      );
    }
    insights.push('Dynamic capital allocation recommended based on rolling performance windows');
    insights.push('Consider correlation-adjusted position sizing to reduce portfolio risk');

    this.emitEvent('info', 'strategy_agent', 'Meta-optimization completed', {
      strategiesAnalyzed,
      expectedSharpe,
    });

    return {
      timestamp: new Date(),
      strategiesAnalyzed,
      recommendedAllocations: recommendedAllocations as Record<StrategyType, number>,
      expectedPortfolioSharpe: expectedSharpe,
      currentPortfolioSharpe: currentSharpe,
      insights,
    };
  }

  getCapitalRecommendations(): CapitalAllocationRecommendation[] {
    const performances = this.getAllPerformance();
    const metaResult = this.getStrategyAllocation();

    return performances.map((perf) => {
      const currentAlloc = metaResult.allocations.find(
        (a) => a.strategyType === perf.strategyType
      );
      const currentPercent = currentAlloc?.currentPercent ?? 0;
      const recommendedPercent = this.calculateTargetAllocation(perf.strategyType);
      const delta = recommendedPercent - currentPercent;

      let reason = 'Maintain current allocation';
      if (delta > 0.05) {
        reason = `Increase allocation: strong Sharpe ratio (${perf.sharpeRatio.toFixed(2)}) and win rate (${(perf.winRate * 100).toFixed(0)}%)`;
      } else if (delta < -0.05) {
        reason = `Reduce allocation: underperforming with drawdown ${(perf.maxDrawdown * 100).toFixed(1)}%`;
      }

      return {
        strategy: perf.strategyType,
        currentPercent,
        recommendedPercent,
        reason,
        confidence: Math.min(1.0, (this.dataPointsCollected.get(perf.strategyType) ?? 0) / 100),
        expectedImpact: delta > 0
          ? `+${(delta * 100).toFixed(1)}% capital → estimated +${(delta * perf.sharpeRatio * 0.1 * 100).toFixed(2)}% portfolio Sharpe improvement`
          : `${(delta * 100).toFixed(1)}% capital reallocation to better-performing strategies`,
      };
    });
  }

  onEvent(callback: HedgeFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createDefaultConfig(override?: Partial<StrategyAgentConfig>): StrategyAgentConfig {
    const defaultOptimization: OptimizationConfig = {
      method: 'bayesian',
      frequency: 'weekly',
      lookbackPeriod: 90,
      targetMetric: 'sharpe',
    };

    const defaultBacktesting: BacktestConfig = {
      enabled: true,
      minSharpe: 1.5,
      maxDrawdown: 0.20,
      minWinRate: 0.45,
      lookbackPeriod: 365,
    };

    const defaultLiveAdaptation: LiveAdaptationConfig = {
      enabled: true,
      learningRate: 0.01,
      adaptationFrequency: 'daily',
      minDataPoints: 100,
      confidenceThreshold: 0.95,
      rollbackEnabled: true,
    };

    return {
      enabled: override?.enabled ?? true,
      strategyTypes: override?.strategyTypes ?? [
        'delta_neutral',
        'trend_following',
        'arbitrage',
        'yield_farming',
        'momentum',
      ],
      optimization: override?.optimization
        ? { ...defaultOptimization, ...override.optimization }
        : defaultOptimization,
      backtesting: override?.backtesting
        ? { ...defaultBacktesting, ...override.backtesting }
        : defaultBacktesting,
      liveAdaptation: override?.liveAdaptation
        ? { ...defaultLiveAdaptation, ...override.liveAdaptation }
        : defaultLiveAdaptation,
      parameters: override?.parameters ?? {},
    };
  }

  private initializePerformanceTracking(): void {
    for (const strategy of this._config.strategyTypes) {
      this.strategyPerformance.set(strategy, {
        strategyType: strategy,
        totalReturn: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 1,
        tradesCount: 0,
        avgTradeReturn: 0,
        period: 'inception',
      });
    }
  }

  private initializeDefaultSignalWeights(): void {
    const defaultWeights: SignalWeightMap = {
      technical: 0.30,
      momentum: 0.25,
      mean_reversion: 0.20,
      sentiment: 0.15,
      onchain: 0.10,
    };

    for (const strategy of this._config.strategyTypes) {
      this.signalWeights.set(strategy, { ...defaultWeights });
    }
  }

  private getDefaultSignalWeights(strategy: StrategyType): SignalWeightMap {
    const weightsByStrategy: Record<string, SignalWeightMap> = {
      delta_neutral: { technical: 0.20, momentum: 0.15, mean_reversion: 0.40, sentiment: 0.10, onchain: 0.15 },
      trend_following: { technical: 0.35, momentum: 0.40, mean_reversion: 0.05, sentiment: 0.10, onchain: 0.10 },
      arbitrage: { technical: 0.25, momentum: 0.15, mean_reversion: 0.30, sentiment: 0.05, onchain: 0.25 },
      yield_farming: { technical: 0.15, momentum: 0.10, mean_reversion: 0.20, sentiment: 0.10, onchain: 0.45 },
      momentum: { technical: 0.25, momentum: 0.50, mean_reversion: 0.05, sentiment: 0.15, onchain: 0.05 },
      mean_reversion: { technical: 0.30, momentum: 0.10, mean_reversion: 0.45, sentiment: 0.10, onchain: 0.05 },
      statistical_arbitrage: { technical: 0.30, momentum: 0.20, mean_reversion: 0.30, sentiment: 0.05, onchain: 0.15 },
      liquidity_provision: { technical: 0.15, momentum: 0.10, mean_reversion: 0.20, sentiment: 0.10, onchain: 0.45 },
    };

    return weightsByStrategy[strategy] ?? {
      technical: 0.30,
      momentum: 0.25,
      mean_reversion: 0.20,
      sentiment: 0.15,
      onchain: 0.10,
    };
  }

  private simulateBacktest(
    strategy: StrategyType,
    _initialCapital: number,
    lookbackDays: number
  ): Omit<BacktestResult, 'id' | 'strategy' | 'timestamp' | 'params' | 'passed' | 'failureReasons'> {
    // Strategy-specific performance profiles based on typical characteristics
    const strategyProfiles: Record<string, {
      baseSharpe: number;
      baseReturn: number;
      baseDrawdown: number;
      baseWinRate: number;
    }> = {
      delta_neutral: { baseSharpe: 1.8, baseReturn: 0.12, baseDrawdown: 0.08, baseWinRate: 0.58 },
      trend_following: { baseSharpe: 1.5, baseReturn: 0.18, baseDrawdown: 0.15, baseWinRate: 0.45 },
      arbitrage: { baseSharpe: 2.2, baseReturn: 0.10, baseDrawdown: 0.05, baseWinRate: 0.72 },
      yield_farming: { baseSharpe: 1.3, baseReturn: 0.15, baseDrawdown: 0.12, baseWinRate: 0.60 },
      momentum: { baseSharpe: 1.6, baseReturn: 0.20, baseDrawdown: 0.18, baseWinRate: 0.48 },
      mean_reversion: { baseSharpe: 1.7, baseReturn: 0.14, baseDrawdown: 0.10, baseWinRate: 0.62 },
      statistical_arbitrage: { baseSharpe: 2.0, baseReturn: 0.11, baseDrawdown: 0.06, baseWinRate: 0.68 },
      liquidity_provision: { baseSharpe: 1.4, baseReturn: 0.13, baseDrawdown: 0.09, baseWinRate: 0.65 },
    };

    const profile = strategyProfiles[strategy] ?? {
      baseSharpe: 1.5,
      baseReturn: 0.15,
      baseDrawdown: 0.12,
      baseWinRate: 0.50,
    };

    // Add some noise based on lookback period (more data = more stable estimates)
    const noiseFactor = Math.sqrt(252 / lookbackDays);
    const sharpeRatio = Math.max(0, profile.baseSharpe + (Math.random() - 0.5) * 0.4 * noiseFactor);
    const totalReturn = profile.baseReturn + (Math.random() - 0.5) * 0.05 * noiseFactor;
    const maxDrawdown = Math.max(0.01, profile.baseDrawdown + (Math.random() - 0.5) * 0.04 * noiseFactor);
    const winRate = Math.max(0.3, Math.min(0.9, profile.baseWinRate + (Math.random() - 0.5) * 0.1 * noiseFactor));
    const tradesCount = Math.floor((lookbackDays / 5) * (1 + Math.random()));
    const profitFactor = Math.max(1.0, sharpeRatio * 0.8 + Math.random() * 0.4);

    return {
      sharpeRatio,
      sortinoRatio: sharpeRatio * 1.2,
      maxDrawdown,
      totalReturn,
      annualizedReturn: totalReturn * (365 / lookbackDays),
      winRate,
      profitFactor,
      tradesCount,
    };
  }

  private runOptimizationSearch(
    _strategy: StrategyType,
    method: string,
    iterations: number
  ): Record<string, unknown> {
    // Simulate parameter optimization results
    const baseParams: Record<string, unknown> = {
      lookbackPeriod: 14 + Math.floor(Math.random() * 50),
      signalThreshold: 0.5 + Math.random() * 0.4,
      positionSize: 0.02 + Math.random() * 0.08,
      stopLoss: 0.01 + Math.random() * 0.04,
      takeProfit: 0.02 + Math.random() * 0.08,
    };

    if (method === 'bayesian') {
      // Bayesian optimization tends to find better parameters
      baseParams['bayesianExploration'] = 0.1 + Math.random() * 0.2;
    } else if (method === 'genetic') {
      baseParams['populationSize'] = iterations;
      baseParams['mutationRate'] = 0.01 + Math.random() * 0.05;
    }

    return baseParams;
  }

  private getMetricValue(
    perf: InternalStrategyPerformance | undefined,
    metric: string
  ): number {
    if (!perf) return 0;
    switch (metric) {
      case 'sharpe': return perf.sharpeRatio;
      case 'sortino': return perf.sortinoRatio;
      case 'returns': return perf.totalReturn;
      case 'calmar': return perf.maxDrawdown > 0 ? (perf.annualizedReturn ?? perf.totalReturn) / perf.maxDrawdown : 0;
      default: return perf.sharpeRatio;
    }
  }

  private calculateTargetAllocation(strategy: StrategyType): number {
    const perf = this.strategyPerformance.get(strategy);
    if (!perf || perf.sharpeRatio === 0) {
      return 1 / this._config.strategyTypes.length;
    }

    // Risk-adjusted allocation based on Sharpe ratio
    const totalSharpe = Array.from(this.strategyPerformance.values())
      .reduce((sum, p) => sum + Math.max(0, p.sharpeRatio), 0);

    if (totalSharpe === 0) return 1 / this._config.strategyTypes.length;

    return Math.max(0, perf.sharpeRatio) / totalSharpe;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: HedgeFundEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fundId: '',
      type: 'strategy_updated',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
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
// Internal Types
// ============================================================================

interface AdaptationSnapshot {
  strategy: StrategyType;
  signalWeights: SignalWeightMap;
  timestamp: Date;
}

interface InternalStrategyPerformance extends StrategyPerformance {
  annualizedReturn?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyAgent(
  config?: Partial<StrategyAgentConfig>
): DefaultStrategyAgent {
  return new DefaultStrategyAgent(config);
}
