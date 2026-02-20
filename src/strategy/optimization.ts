/**
 * TONAIAgent - Strategy Optimization Engine
 *
 * Automated parameter tuning and strategy optimization using various methods
 * including grid search, Bayesian optimization, and genetic algorithms.
 */

import {
  Strategy,
  StrategyPerformance,
  OptimizationConfig,
  OptimizationResult,
  OptimizableParameter,
  OptimizationConstraints,
  OptimizationObjective,
  ParameterSensitivity,
  OptimizationRecommendation,
  StrategyEvent,
  StrategyEventCallback,
} from './types';

import { BacktestingEngine } from './backtesting';

// ============================================================================
// Interfaces
// ============================================================================

export interface OptimizationEngineConfig {
  maxParallelBacktests: number;
  convergenceThreshold: number;
  earlyStoppingPatience: number;
}

export interface ParameterSet {
  [parameterId: string]: number;
}

export interface EvaluationResult {
  parameters: ParameterSet;
  objectiveValue: number;
  performance: StrategyPerformance;
  valid: boolean;
  violatedConstraints: string[];
}

// ============================================================================
// Optimization Engine Implementation
// ============================================================================

export class OptimizationEngine {
  private readonly results: Map<string, OptimizationResult> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];

  constructor(
    private readonly backtestEngine: BacktestingEngine,
    private readonly config: OptimizationEngineConfig = {
      maxParallelBacktests: 4,
      convergenceThreshold: 0.001,
      earlyStoppingPatience: 10,
    }
  ) {}

  /**
   * Run optimization for a strategy
   */
  async optimize(
    strategy: Strategy,
    config: OptimizationConfig
  ): Promise<OptimizationResult> {
    const id = this.generateId();
    const startTime = new Date();

    const result: OptimizationResult = {
      id,
      strategyId: strategy.id,
      config,
      status: 'running',
      startedAt: startTime,
      iterations: 0,
      bestParameters: {},
      bestPerformance: this.createEmptyPerformance(strategy.id),
      convergenceCurve: [],
      parameterSensitivity: [],
      recommendations: [],
    };

    this.results.set(id, result);

    this.emitEvent({
      id: this.generateId(),
      type: 'optimization_completed',
      strategyId: strategy.id,
      timestamp: startTime,
      data: { optimizationId: id, status: 'started' },
      severity: 'info',
    });

    try {
      let optimizer: Optimizer;

      switch (config.method) {
        case 'grid_search':
          optimizer = new GridSearchOptimizer(config);
          break;
        case 'random_search':
          optimizer = new RandomSearchOptimizer(config);
          break;
        case 'bayesian':
          optimizer = new BayesianOptimizer(config);
          break;
        case 'genetic':
          optimizer = new GeneticOptimizer(config);
          break;
        default:
          optimizer = new GridSearchOptimizer(config);
      }

      // Run optimization
      const evaluations: EvaluationResult[] = [];
      let bestResult: EvaluationResult | null = null;
      let iterationsWithoutImprovement = 0;

      while (!optimizer.isComplete() && result.iterations < config.maxIterations) {
        // Get next parameter set to evaluate
        const parameterSets = optimizer.suggest(this.config.maxParallelBacktests);

        // Evaluate each parameter set
        for (const params of parameterSets) {
          result.iterations++;

          const evaluation = await this.evaluate(
            strategy,
            config,
            params
          );

          evaluations.push(evaluation);

          // Update optimizer with result
          optimizer.observe(params, evaluation.objectiveValue, evaluation.valid);

          // Track best result
          if (evaluation.valid) {
            if (!bestResult || this.isBetter(evaluation, bestResult, config.objective)) {
              bestResult = evaluation;
              iterationsWithoutImprovement = 0;
            } else {
              iterationsWithoutImprovement++;
            }
          }

          // Record convergence point
          result.convergenceCurve.push({
            iteration: result.iterations,
            objectiveValue: evaluation.objectiveValue,
            parameters: params,
          });

          // Check for early stopping
          if (iterationsWithoutImprovement >= this.config.earlyStoppingPatience) {
            break;
          }
        }

        // Check for convergence
        if (optimizer.hasConverged(this.config.convergenceThreshold)) {
          break;
        }
      }

      // Calculate parameter sensitivity
      const sensitivity = this.calculateSensitivity(evaluations, config.parameters);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        evaluations,
        bestResult,
        config
      );

      // Update result
      result.status = 'completed';
      result.completedAt = new Date();
      result.bestParameters = bestResult?.parameters ?? {};
      result.bestPerformance = bestResult?.performance ?? this.createEmptyPerformance(strategy.id);
      result.parameterSensitivity = sensitivity;
      result.recommendations = recommendations;

      this.results.set(id, result);

      this.emitEvent({
        id: this.generateId(),
        type: 'optimization_completed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: {
          optimizationId: id,
          status: 'completed',
          iterations: result.iterations,
          bestObjective: bestResult?.objectiveValue ?? 0,
        },
        severity: 'info',
      });

      return result;

    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date();

      this.results.set(id, result);

      this.emitEvent({
        id: this.generateId(),
        type: 'optimization_completed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: { optimizationId: id, status: 'failed', error: String(error) },
        severity: 'error',
      });

      return result;
    }
  }

  /**
   * Get optimization result by ID
   */
  getResult(id: string): OptimizationResult | undefined {
    return this.results.get(id);
  }

  /**
   * Subscribe to optimization events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async evaluate(
    strategy: Strategy,
    config: OptimizationConfig,
    params: ParameterSet
  ): Promise<EvaluationResult> {
    // Create modified strategy with new parameters
    const modifiedStrategy = this.applyParameters(strategy, params);

    // Run backtest
    const backtestResult = await this.backtestEngine.runBacktest(
      modifiedStrategy,
      config.backtestConfig
    );

    // Calculate objective value
    const objectiveValue = this.calculateObjective(
      backtestResult.performance,
      config.objective,
      config.customObjective
    );

    // Check constraints
    const violatedConstraints = this.checkConstraints(
      backtestResult.performance,
      config.constraints
    );

    return {
      parameters: params,
      objectiveValue,
      performance: backtestResult.performance,
      valid: violatedConstraints.length === 0,
      violatedConstraints,
    };
  }

  private applyParameters(strategy: Strategy, params: ParameterSet): Strategy {
    const updatedParameters = strategy.definition.parameters.map(p => {
      const newValue = params[p.id];
      if (newValue !== undefined) {
        return { ...p, value: newValue };
      }
      return p;
    });

    return {
      ...strategy,
      definition: {
        ...strategy.definition,
        parameters: updatedParameters,
      },
    };
  }

  private calculateObjective(
    performance: StrategyPerformance,
    objective: OptimizationObjective,
    _customObjective?: string
  ): number {
    switch (objective) {
      case 'max_return':
        return performance.metrics.totalReturn;
      case 'max_sharpe':
        return performance.metrics.sharpeRatio;
      case 'max_sortino':
        return performance.metrics.sortinoRatio;
      case 'min_drawdown':
        return -performance.metrics.maxDrawdown; // Negate for minimization
      case 'custom':
        // Would need expression evaluation
        return performance.metrics.sharpeRatio;
      default:
        return performance.metrics.sharpeRatio;
    }
  }

  private checkConstraints(
    performance: StrategyPerformance,
    constraints: OptimizationConstraints
  ): string[] {
    const violations: string[] = [];

    if (constraints.maxDrawdown !== undefined) {
      if (performance.metrics.maxDrawdown > constraints.maxDrawdown) {
        violations.push(`Max drawdown ${performance.metrics.maxDrawdown.toFixed(2)}% exceeds limit ${constraints.maxDrawdown}%`);
      }
    }

    if (constraints.minSharpe !== undefined) {
      if (performance.metrics.sharpeRatio < constraints.minSharpe) {
        violations.push(`Sharpe ratio ${performance.metrics.sharpeRatio.toFixed(2)} below minimum ${constraints.minSharpe}`);
      }
    }

    if (constraints.minWinRate !== undefined) {
      if (performance.trades.winRate < constraints.minWinRate) {
        violations.push(`Win rate ${performance.trades.winRate.toFixed(2)}% below minimum ${constraints.minWinRate}%`);
      }
    }

    if (constraints.maxTradesPerDay !== undefined) {
      // Would need to calculate average trades per day
    }

    return violations;
  }

  private isBetter(
    a: EvaluationResult,
    b: EvaluationResult,
    objective: OptimizationObjective
  ): boolean {
    // Higher is better for most objectives
    if (objective === 'min_drawdown') {
      return a.objectiveValue > b.objectiveValue; // Less negative = better
    }
    return a.objectiveValue > b.objectiveValue;
  }

  private calculateSensitivity(
    evaluations: EvaluationResult[],
    parameters: OptimizableParameter[]
  ): ParameterSensitivity[] {
    const sensitivities: ParameterSensitivity[] = [];

    for (const param of parameters) {
      // Group evaluations by parameter value
      const valueGroups = new Map<number, number[]>();

      for (const eval$ of evaluations) {
        const value = eval$.parameters[param.parameterId];
        if (value !== undefined) {
          const group = valueGroups.get(value) ?? [];
          group.push(eval$.objectiveValue);
          valueGroups.set(value, group);
        }
      }

      // Calculate variance across parameter values
      const avgByValue = Array.from(valueGroups.entries())
        .map(([value, objectives]) => ({
          value,
          avg: objectives.reduce((a, b) => a + b, 0) / objectives.length,
        }));

      if (avgByValue.length < 2) {
        sensitivities.push({
          parameterId: param.parameterId,
          importance: 0,
          optimalRange: param.range,
          robustness: 1,
        });
        continue;
      }

      // Calculate importance as variance of means
      const overallMean = avgByValue.reduce((sum, v) => sum + v.avg, 0) / avgByValue.length;
      const variance = avgByValue.reduce((sum, v) => sum + Math.pow(v.avg - overallMean, 2), 0) / avgByValue.length;
      const importance = Math.sqrt(variance);

      // Find optimal range (top 20% of values)
      avgByValue.sort((a, b) => b.avg - a.avg);
      const topValues = avgByValue.slice(0, Math.ceil(avgByValue.length * 0.2)).map(v => v.value);
      const optimalRange: [number, number] = [
        Math.min(...topValues),
        Math.max(...topValues),
      ];

      // Robustness: how stable is performance in optimal range
      const optimalObjectives = evaluations
        .filter(e => {
          const v = e.parameters[param.parameterId];
          return v !== undefined && v >= optimalRange[0] && v <= optimalRange[1];
        })
        .map(e => e.objectiveValue);

      const optimalMean = optimalObjectives.reduce((a, b) => a + b, 0) / optimalObjectives.length;
      const optimalVariance = optimalObjectives.reduce((sum, v) => sum + Math.pow(v - optimalMean, 2), 0) / optimalObjectives.length;
      const robustness = 1 / (1 + Math.sqrt(optimalVariance));

      sensitivities.push({
        parameterId: param.parameterId,
        importance: Math.min(importance / (Math.abs(overallMean) || 1), 1),
        optimalRange,
        robustness,
      });
    }

    // Normalize importance scores
    const maxImportance = Math.max(...sensitivities.map(s => s.importance), 1);
    for (const s of sensitivities) {
      s.importance /= maxImportance;
    }

    return sensitivities.sort((a, b) => b.importance - a.importance);
  }

  private generateRecommendations(
    _evaluations: EvaluationResult[],
    bestResult: EvaluationResult | null,
    config: OptimizationConfig
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (!bestResult) {
      recommendations.push({
        type: 'structure_change',
        description: 'No valid parameter combinations found. Consider relaxing constraints or changing strategy structure.',
        impact: 0,
        confidence: 1,
      });
      return recommendations;
    }

    // Check if best result violates constraints
    if (bestResult.violatedConstraints.length > 0) {
      for (const constraint of bestResult.violatedConstraints) {
        recommendations.push({
          type: 'risk_adjustment',
          description: `Constraint violated: ${constraint}. Consider adjusting risk controls or strategy logic.`,
          impact: 0.5,
          confidence: 0.8,
        });
      }
    }

    // Parameter change recommendations
    for (const param of config.parameters) {
      const bestValue = bestResult.parameters[param.parameterId];
      const [minRange, maxRange] = param.range;

      if (bestValue !== undefined) {
        // Check if best value is at boundary
        if (Math.abs(bestValue - minRange) < 0.01 * (maxRange - minRange)) {
          recommendations.push({
            type: 'parameter_change',
            description: `Parameter ${param.parameterId} optimum may be below current range. Consider expanding lower bound.`,
            impact: 0.3,
            confidence: 0.6,
          });
        } else if (Math.abs(bestValue - maxRange) < 0.01 * (maxRange - minRange)) {
          recommendations.push({
            type: 'parameter_change',
            description: `Parameter ${param.parameterId} optimum may be above current range. Consider expanding upper bound.`,
            impact: 0.3,
            confidence: 0.6,
          });
        }
      }
    }

    // Performance-based recommendations
    const perf = bestResult.performance;

    if (perf.metrics.maxDrawdown > 20) {
      recommendations.push({
        type: 'risk_adjustment',
        description: `High maximum drawdown (${perf.metrics.maxDrawdown.toFixed(1)}%). Consider adding tighter stop-loss or reducing position sizes.`,
        impact: 0.7,
        confidence: 0.9,
      });
    }

    if (perf.trades.winRate < 40) {
      recommendations.push({
        type: 'structure_change',
        description: `Low win rate (${perf.trades.winRate.toFixed(1)}%). Consider adjusting entry conditions or adding confirmation signals.`,
        impact: 0.5,
        confidence: 0.7,
      });
    }

    if (perf.trades.avgSlippage > 1) {
      recommendations.push({
        type: 'parameter_change',
        description: `High average slippage (${perf.trades.avgSlippage.toFixed(2)}%). Consider reducing order sizes or using limit orders.`,
        impact: 0.4,
        confidence: 0.8,
      });
    }

    return recommendations;
  }

  private createEmptyPerformance(strategyId: string): StrategyPerformance {
    const now = new Date();
    return {
      strategyId,
      period: { start: now, end: now, type: 'all_time' },
      metrics: {
        totalReturn: 0,
        annualizedReturn: 0,
        absoluteProfit: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdown: 0,
        currentDrawdown: 0,
      },
      trades: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        averageHoldingTime: 0,
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

  private generateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private emitEvent(event: StrategyEvent): void {
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
// Optimizer Interface and Implementations
// ============================================================================

interface Optimizer {
  suggest(count: number): ParameterSet[];
  observe(params: ParameterSet, value: number, valid: boolean): void;
  isComplete(): boolean;
  hasConverged(threshold: number): boolean;
}

class GridSearchOptimizer implements Optimizer {
  private readonly parameterGrid: ParameterSet[] = [];
  private currentIndex = 0;

  constructor(config: OptimizationConfig) {
    this.parameterGrid = this.generateGrid(config.parameters);
  }

  suggest(count: number): ParameterSet[] {
    const results: ParameterSet[] = [];
    for (let i = 0; i < count && this.currentIndex < this.parameterGrid.length; i++) {
      results.push(this.parameterGrid[this.currentIndex++]);
    }
    return results;
  }

  observe(): void {
    // Grid search doesn't adapt based on observations
  }

  isComplete(): boolean {
    return this.currentIndex >= this.parameterGrid.length;
  }

  hasConverged(): boolean {
    return this.isComplete();
  }

  private generateGrid(params: OptimizableParameter[]): ParameterSet[] {
    if (params.length === 0) return [{}];

    const [first, ...rest] = params;
    const restGrid = this.generateGrid(rest);

    const values = this.getParameterValues(first);
    const result: ParameterSet[] = [];

    for (const value of values) {
      for (const restParams of restGrid) {
        result.push({
          [first.parameterId]: value,
          ...restParams,
        });
      }
    }

    return result;
  }

  private getParameterValues(param: OptimizableParameter): number[] {
    const [min, max] = param.range;
    const step = param.step ?? (max - min) / 10;
    const values: number[] = [];

    for (let v = min; v <= max; v += step) {
      values.push(v);
    }

    // Ensure max is included
    if (values[values.length - 1] !== max) {
      values.push(max);
    }

    return values;
  }
}

class RandomSearchOptimizer implements Optimizer {
  private iterations = 0;
  private readonly maxIterations: number;

  constructor(private readonly config: OptimizationConfig) {
    this.maxIterations = config.maxIterations;
  }

  suggest(count: number): ParameterSet[] {
    const results: ParameterSet[] = [];
    for (let i = 0; i < count && this.iterations < this.maxIterations; i++) {
      results.push(this.generateRandom());
      this.iterations++;
    }
    return results;
  }

  observe(): void {
    // Random search doesn't adapt
  }

  isComplete(): boolean {
    return this.iterations >= this.maxIterations;
  }

  hasConverged(): boolean {
    return this.isComplete();
  }

  private generateRandom(): ParameterSet {
    const params: ParameterSet = {};
    for (const param of this.config.parameters) {
      const [min, max] = param.range;
      if (param.scale === 'log') {
        const logMin = Math.log(min);
        const logMax = Math.log(max);
        params[param.parameterId] = Math.exp(logMin + Math.random() * (logMax - logMin));
      } else {
        params[param.parameterId] = min + Math.random() * (max - min);
      }

      // Round to step if specified
      if (param.step) {
        params[param.parameterId] = Math.round(params[param.parameterId] / param.step) * param.step;
      }
    }
    return params;
  }
}

class BayesianOptimizer implements Optimizer {
  private readonly observations: Array<{ params: ParameterSet; value: number }> = [];
  private iterations = 0;

  constructor(private readonly config: OptimizationConfig) {}

  suggest(count: number): ParameterSet[] {
    const results: ParameterSet[] = [];

    for (let i = 0; i < count; i++) {
      if (this.observations.length < 5) {
        // Initial exploration phase
        results.push(this.generateRandom());
      } else {
        // Exploitation with UCB (Upper Confidence Bound)
        results.push(this.suggestWithUCB());
      }
    }

    return results;
  }

  observe(params: ParameterSet, value: number): void {
    this.observations.push({ params, value });
    this.iterations++;
  }

  isComplete(): boolean {
    return this.iterations >= this.config.maxIterations;
  }

  hasConverged(threshold: number): boolean {
    if (this.observations.length < 10) return false;

    // Check if recent improvements are below threshold
    const recent = this.observations.slice(-10).map(o => o.value);
    const best = Math.max(...recent);
    const secondBest = Math.max(...recent.filter(v => v !== best));

    return (best - secondBest) / Math.abs(best || 1) < threshold;
  }

  private generateRandom(): ParameterSet {
    const params: ParameterSet = {};
    for (const param of this.config.parameters) {
      const [min, max] = param.range;
      params[param.parameterId] = min + Math.random() * (max - min);
    }
    return params;
  }

  private suggestWithUCB(): ParameterSet {
    // Simplified UCB: sample near best observed points with some noise
    const best = this.observations.reduce(
      (best, obs) => (obs.value > best.value ? obs : best),
      this.observations[0]
    );

    const params: ParameterSet = {};
    for (const param of this.config.parameters) {
      const [min, max] = param.range;
      const bestValue = best.params[param.parameterId] ?? (min + max) / 2;

      // Add noise proportional to remaining budget
      const explorationFactor = 1 - this.iterations / this.config.maxIterations;
      const noise = (Math.random() - 0.5) * (max - min) * explorationFactor * 0.3;

      params[param.parameterId] = Math.max(min, Math.min(max, bestValue + noise));
    }

    return params;
  }
}

class GeneticOptimizer implements Optimizer {
  private population: Array<{ params: ParameterSet; fitness: number }> = [];
  private generation = 0;
  private readonly populationSize = 20;
  private readonly mutationRate = 0.1;
  private readonly crossoverRate = 0.8;

  constructor(private readonly config: OptimizationConfig) {
    // Initialize population
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push({
        params: this.generateRandom(),
        fitness: 0,
      });
    }
  }

  suggest(count: number): ParameterSet[] {
    // Return unevaluated individuals
    const unevaluated = this.population
      .filter(p => p.fitness === 0)
      .slice(0, count);

    if (unevaluated.length > 0) {
      return unevaluated.map(p => p.params);
    }

    // Evolve new generation
    this.evolve();
    return this.population.slice(0, count).map(p => p.params);
  }

  observe(params: ParameterSet, value: number): void {
    const individual = this.population.find(p =>
      this.config.parameters.every(param =>
        p.params[param.parameterId] === params[param.parameterId]
      )
    );

    if (individual) {
      individual.fitness = value;
    }
  }

  isComplete(): boolean {
    return this.generation >= Math.floor(this.config.maxIterations / this.populationSize);
  }

  hasConverged(threshold: number): boolean {
    if (this.population.length < 2) return false;

    const fitnesses = this.population.map(p => p.fitness).filter(f => f > 0);
    if (fitnesses.length < 5) return false;

    const best = Math.max(...fitnesses);
    const avg = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;

    return (best - avg) / Math.abs(best || 1) < threshold;
  }

  private generateRandom(): ParameterSet {
    const params: ParameterSet = {};
    for (const param of this.config.parameters) {
      const [min, max] = param.range;
      params[param.parameterId] = min + Math.random() * (max - min);
    }
    return params;
  }

  private evolve(): void {
    this.generation++;

    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    // Select top half
    const selected = this.population.slice(0, this.populationSize / 2);

    // Generate new population
    const newPopulation = [...selected];

    while (newPopulation.length < this.populationSize) {
      const parent1 = this.selectParent(selected);
      const parent2 = this.selectParent(selected);

      let child: ParameterSet;

      if (Math.random() < this.crossoverRate) {
        child = this.crossover(parent1.params, parent2.params);
      } else {
        child = { ...parent1.params };
      }

      if (Math.random() < this.mutationRate) {
        child = this.mutate(child);
      }

      newPopulation.push({ params: child, fitness: 0 });
    }

    this.population = newPopulation;
  }

  private selectParent(population: Array<{ params: ParameterSet; fitness: number }>): typeof population[0] {
    // Tournament selection
    const tournamentSize = 3;
    let best = population[Math.floor(Math.random() * population.length)];

    for (let i = 1; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (candidate.fitness > best.fitness) {
        best = candidate;
      }
    }

    return best;
  }

  private crossover(parent1: ParameterSet, parent2: ParameterSet): ParameterSet {
    const child: ParameterSet = {};
    for (const param of this.config.parameters) {
      // Uniform crossover
      if (Math.random() < 0.5) {
        child[param.parameterId] = parent1[param.parameterId];
      } else {
        child[param.parameterId] = parent2[param.parameterId];
      }
    }
    return child;
  }

  private mutate(params: ParameterSet): ParameterSet {
    const mutated = { ...params };
    const paramToMutate = this.config.parameters[
      Math.floor(Math.random() * this.config.parameters.length)
    ];

    const [min, max] = paramToMutate.range;
    const currentValue = mutated[paramToMutate.parameterId] ?? (min + max) / 2;
    const range = max - min;

    // Gaussian mutation
    const mutation = (Math.random() * 2 - 1) * range * 0.1;
    mutated[paramToMutate.parameterId] = Math.max(min, Math.min(max, currentValue + mutation));

    return mutated;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createOptimizationEngine(
  backtestEngine: BacktestingEngine,
  config?: Partial<OptimizationEngineConfig>
): OptimizationEngine {
  return new OptimizationEngine(backtestEngine, {
    maxParallelBacktests: config?.maxParallelBacktests ?? 4,
    convergenceThreshold: config?.convergenceThreshold ?? 0.001,
    earlyStoppingPatience: config?.earlyStoppingPatience ?? 10,
  });
}
