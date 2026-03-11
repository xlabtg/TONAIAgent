/**
 * TONAIAgent - Strategy Backtesting Framework
 *
 * Comprehensive historical simulation and validation framework for strategy
 * testing before deploying with live capital.
 *
 * Issue #155: Strategy Backtesting Framework
 *
 * Architecture:
 *   Historical Market Data
 *           |
 *   Market Replay Engine
 *           |
 *   Strategy Agent Runtime (via BacktestStrategySpec.onCandle)
 *           |
 *   Simulated Trading Engine
 *           |
 *   Performance Analysis + Risk Evaluation
 *           |
 *   Structured Backtest Reports
 *
 * Core Components:
 *   1. HistoricalDataManager   — OHLCV candles, trade history, order book, volatility
 *   2. MarketReplayEngine      — Sequential, event-driven market replay
 *   3. SimulationEnvironment   — Sandboxed capital + order execution
 *   4. PerformanceCalculator   — Sharpe, Sortino, drawdown, win rate, VaR
 *   5. BacktestRiskEvaluator   — Risk Engine v1 integration (drawdown/concentration/volatility)
 *   6. BacktestReportGenerator — Structured report with equity curve, trade history
 *   7. BacktestingFramework    — Unified orchestrator (entry point)
 *
 * @example
 * ```typescript
 * import { createBacktestingFramework } from '@tonaiagent/core/backtesting';
 *
 * const framework = createBacktestingFramework();
 *
 * const result = await framework.run({
 *   strategyId: 'strategy_001',
 *   strategyName: 'DCA TON',
 *   strategySpec: {
 *     assets: ['TON'],
 *     onCandle: async (candle, portfolio, placeOrder) => {
 *       // Buy $100 of TON every day
 *       if (portfolio.cash >= 100) {
 *         await placeOrder({
 *           asset: 'TON',
 *           side: 'buy',
 *           type: 'market',
 *           amount: 100,
 *           amountType: 'usd',
 *         });
 *       }
 *     },
 *   },
 *   dataConfig: {
 *     type: 'synthetic',
 *     assets: ['TON'],
 *     startDate: new Date('2024-01-01'),
 *     endDate: new Date('2024-06-30'),
 *     granularity: '1d',
 *   },
 *   simulationConfig: {
 *     initialCapital: 10000,
 *     currency: 'USD',
 *     slippageModel: { type: 'fixed', baseSlippage: 10 },
 *     feeModel: { tradingFeePercent: 0.3, gasCostUsd: 0.05 },
 *     fillModel: { type: 'immediate' },
 *   },
 *   riskEvaluation: true,
 *   generateReport: true,
 * });
 *
 * console.log(framework.reports.formatSummaryString(result.report!));
 * // Capital Start: 10,000.00 / Capital End: 13,450.00 / Return: +34.5% / ...
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Component Exports
// ============================================================================

// Historical Data Layer
export {
  HistoricalDataManager,
  SyntheticDataGenerator,
  JsonDataProvider,
  createHistoricalDataManager,
  createSyntheticDataGenerator,
  createJsonDataProvider,
  granularityToMs,
  countCandles,
  type HistoricalDataProvider,
} from './historical-data';

// Market Replay Engine
export {
  MarketReplayEngine,
  MarketReplaySession,
  createMarketReplayEngine,
} from './market-replay';

// Simulation Environment
export {
  SimulationEnvironment,
  createSimulationEnvironment,
  DEFAULT_SLIPPAGE_MODEL,
  DEFAULT_FEE_MODEL,
  DEFAULT_FILL_MODEL,
} from './simulation-env';

// Performance Analysis
export {
  PerformanceCalculator,
  createPerformanceCalculator,
} from './performance-analysis';

// Risk Evaluation
export {
  BacktestRiskEvaluator,
  createBacktestRiskEvaluator,
  DEFAULT_DRAWDOWN_SCENARIOS,
  DEFAULT_RISK_THRESHOLDS,
} from './risk-evaluation';

// Report Generator
export {
  BacktestReportGenerator,
  createReportGenerator,
} from './report-generator';

// ============================================================================
// Unified Backtesting Framework
// ============================================================================

import {
  BacktestRunConfig,
  BacktestRunResult,
  BacktestRunStatus,
  BacktestingEvent,
  BacktestingEventCallback,
  BacktestingEventType,
  BacktestingFrameworkConfig,
  DataGranularity,
  OHLCVCandle,
  PortfolioState,
  SimulatedOrder,
} from './types';

import {
  HistoricalDataManager,
  createHistoricalDataManager,
} from './historical-data';

import {
  MarketReplayEngine,
  createMarketReplayEngine,
} from './market-replay';

import {
  SimulationEnvironment,
  DEFAULT_SLIPPAGE_MODEL,
  DEFAULT_FEE_MODEL,
  DEFAULT_FILL_MODEL,
  createSimulationEnvironment,
} from './simulation-env';

import {
  PerformanceCalculator,
  createPerformanceCalculator,
} from './performance-analysis';

import {
  BacktestRiskEvaluator,
  DEFAULT_RISK_THRESHOLDS,
  createBacktestRiskEvaluator,
} from './risk-evaluation';

import {
  BacktestReportGenerator,
  createReportGenerator,
} from './report-generator';

// ============================================================================
// Framework Interface
// ============================================================================

export interface BacktestingFramework {
  readonly config: BacktestingFrameworkConfig;
  readonly dataManager: HistoricalDataManager;
  readonly replayEngine: MarketReplayEngine;
  readonly performance: PerformanceCalculator;
  readonly riskEvaluator: BacktestRiskEvaluator;
  readonly reports: BacktestReportGenerator;

  /** Run a full backtest with the given configuration */
  run(config: BacktestRunConfig): Promise<BacktestRunResult>;

  /** Get a previously completed backtest result by ID */
  getResult(backtestId: string): BacktestRunResult | undefined;

  /** Get all backtest results */
  getAllResults(): BacktestRunResult[];

  /** Subscribe to framework events */
  onEvent(callback: BacktestingEventCallback): void;
}

// ============================================================================
// Default Framework Config
// ============================================================================

export const DEFAULT_FRAMEWORK_CONFIG: BacktestingFrameworkConfig = {
  defaultDataGranularity: '1h',
  maxDataPointsPerRun: 50000,
  enableDataCaching: true,
  defaultInitialCapital: 10000,
  defaultSlippageModel: DEFAULT_SLIPPAGE_MODEL,
  defaultFeeModel: DEFAULT_FEE_MODEL,
  defaultFillModel: DEFAULT_FILL_MODEL,
  enableMonteCarlo: false,
  defaultMonteCarloSimulations: 1000,
  enableRiskEvaluation: true,
  riskEvaluationThresholds: DEFAULT_RISK_THRESHOLDS,
  reportFormat: 'detailed',
  includeMarketplaceMetrics: true,
};

// ============================================================================
// Default Backtesting Framework Implementation
// ============================================================================

export class DefaultBacktestingFramework implements BacktestingFramework {
  readonly config: BacktestingFrameworkConfig;
  readonly dataManager: HistoricalDataManager;
  readonly replayEngine: MarketReplayEngine;
  readonly performance: PerformanceCalculator;
  readonly riskEvaluator: BacktestRiskEvaluator;
  readonly reports: BacktestReportGenerator;

  private readonly results = new Map<string, BacktestRunResult>();
  private readonly eventCallbacks: BacktestingEventCallback[] = [];

  constructor(config: Partial<BacktestingFrameworkConfig> = {}) {
    this.config = { ...DEFAULT_FRAMEWORK_CONFIG, ...config };

    this.dataManager = createHistoricalDataManager();
    this.replayEngine = createMarketReplayEngine(this.dataManager);
    this.performance = createPerformanceCalculator();
    this.riskEvaluator = createBacktestRiskEvaluator(
      this.config.riskEvaluationThresholds
    );
    this.reports = createReportGenerator();
  }

  /**
   * Run a complete backtest:
   *  1. Load historical data
   *  2. Replay market events sequentially
   *  3. Execute strategy logic on each candle
   *  4. Calculate performance metrics
   *  5. Evaluate risk
   *  6. Generate report
   */
  async run(config: BacktestRunConfig): Promise<BacktestRunResult> {
    const backtestId = config.id ?? this.generateBacktestId();
    const startedAt = new Date();

    const result: BacktestRunResult = {
      id: backtestId,
      strategyId: config.strategyId,
      strategyName: config.strategyName,
      config,
      status: 'running',
      startedAt,
      orders: [],
      equityCurve: [],
      warnings: [],
    };

    this.results.set(backtestId, result);
    this.emitEvent('backtest_started', backtestId, {
      strategyId: config.strategyId,
      strategyName: config.strategyName,
    });

    try {
      // --- Step 1: Initialize simulation environment ---
      const simConfig = {
        initialCapital: config.simulationConfig.initialCapital,
        currency: config.simulationConfig.currency ?? 'USD',
        slippageModel: config.simulationConfig.slippageModel,
        feeModel: config.simulationConfig.feeModel,
        fillModel: config.simulationConfig.fillModel,
        maxPositionSizePercent: config.simulationConfig.maxPositionSizePercent,
        maxDrawdownPercent: config.simulationConfig.maxDrawdownPercent,
        seed: config.simulationConfig.seed,
      };

      const simEnv = createSimulationEnvironment(backtestId, simConfig);

      // --- Step 2: Call optional strategy start hook ---
      if (config.strategySpec.onStart) {
        await config.strategySpec.onStart(simEnv.getPortfolio());
      }

      // --- Step 3: Load data and validate ---
      const validationResult = await this.dataManager.validateData(
        config.dataConfig.assets,
        config.dataConfig.startDate,
        config.dataConfig.endDate,
        config.dataConfig.granularity as DataGranularity
      );

      if (!validationResult.valid) {
        this.emitEvent('data_validation_failed', backtestId, {
          errors: validationResult.errors,
        });
        result.status = 'failed';
        result.error = {
          code: 'DATA_VALIDATION_FAILED',
          message: validationResult.errors.join('; '),
        };
        result.completedAt = new Date();
        this.results.set(backtestId, result);
        return result;
      }

      if (validationResult.warnings.length > 0) {
        result.warnings.push(...validationResult.warnings);
      }

      this.emitEvent('data_loaded', backtestId, {
        candleCount: validationResult.candleCount,
        assetCount: validationResult.assetCount,
      });

      // --- Step 4: Create and run market replay session ---
      const session = this.replayEngine.createSession({
        speed: 'instant',
        startDate: config.dataConfig.startDate,
        endDate: config.dataConfig.endDate,
        granularity: config.dataConfig.granularity as DataGranularity,
        assets: config.dataConfig.assets,
      });

      await session.initialize();

      // Track progress
      let processedCount = 0;
      const totalCount = session.getState().totalCandles;

      await session.run(
        async (
          timestamp: Date,
          candles: OHLCVCandle[],
          currentPrices: Map<string, number>
        ) => {
          // Update portfolio valuations first
          simEnv.updatePrices(timestamp, currentPrices);

          // Run strategy logic
          await config.strategySpec.onCandle(
            candles[0] ?? {
              timestamp,
              asset: config.dataConfig.assets[0] ?? '',
              open: 0,
              high: 0,
              low: 0,
              close: 0,
              volume: 0,
            },
            simEnv.getPortfolio() as Readonly<PortfolioState>,
            async (orderRequest) => simEnv.placeOrder(orderRequest, currentPrices)
          );

          // Emit progress events every 5%
          processedCount++;
          const progress = Math.round((processedCount / totalCount) * 100);
          if (progress % 5 === 0 && processedCount > 1) {
            this.emitEvent('backtest_progress', backtestId, {
              progress,
              processedCandles: processedCount,
              totalCandles: totalCount,
            });
          }
        }
      );

      // --- Step 5: Close all positions at end ---
      const finalPrices = new Map<string, number>();
      const equityCurve = simEnv.getEquityCurve();
      if (equityCurve.length > 0) {
        const lastPoint = equityCurve[equityCurve.length - 1];
        for (const [asset, amount] of Object.entries(lastPoint.positions)) {
          if (amount > 0) {
            // Use last known price
            finalPrices.set(asset, amount);
          }
        }
      }
      simEnv.closeAllPositions(finalPrices);

      // --- Step 6: Call optional strategy end hook ---
      if (config.strategySpec.onEnd) {
        await config.strategySpec.onEnd(simEnv.getPortfolio());
      }

      // --- Step 7: Calculate performance metrics ---
      const allOrders = simEnv.getOrders();
      const finalEquityCurve = simEnv.getEquityCurve();
      const performanceReport = this.performance.buildReport(
        backtestId,
        config.strategyName,
        config.simulationConfig.initialCapital,
        finalEquityCurve,
        allOrders
      );

      result.orders = allOrders;
      result.equityCurve = finalEquityCurve;
      result.performance = performanceReport;
      result.finalPortfolio = { ...simEnv.getPortfolio() } as PortfolioState;

      // --- Step 8: Risk evaluation ---
      if (config.riskEvaluation ?? this.config.enableRiskEvaluation) {
        const riskResult = this.riskEvaluator.evaluate(
          backtestId,
          performanceReport,
          allOrders,
          finalEquityCurve
        );
        result.riskEvaluation = riskResult;

        this.emitEvent('risk_evaluated', backtestId, {
          riskGrade: riskResult.riskGrade,
          riskScore: riskResult.overallRiskScore,
          passed: riskResult.passed,
        });
      }

      // --- Step 9: Monte Carlo analysis ---
      if (config.monteCarlo?.enabled) {
        const monteCarlo = this.performance.runMonteCarlo(
          allOrders,
          config.monteCarlo.simulations,
          config.monteCarlo.confidenceLevel
        );

        if (result.report) {
          result.report = this.reports.attachMonteCarlo(result.report, monteCarlo);
        }
      }

      // --- Step 10: Generate full report ---
      if (config.generateReport ?? true) {
        if (result.performance && result.riskEvaluation) {
          const report = this.reports.generateReport(result);
          result.report = report;

          this.emitEvent('report_generated', backtestId, {
            reportId: report.id,
            riskGrade: report.summary.riskGrade,
          });
        }
      }

      // Mark as completed
      result.status = 'completed';
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();

      this.results.set(backtestId, result);

      this.emitEvent('backtest_completed', backtestId, {
        status: 'completed',
        durationMs: result.durationMs,
        totalReturn: result.performance?.summary.totalReturn,
        sharpeRatio: result.performance?.risk.sharpeRatio,
      });

      return result;

    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();
      result.error = {
        code: 'BACKTEST_ERROR',
        message: error instanceof Error ? error.message : String(error),
      };

      this.results.set(backtestId, result);

      this.emitEvent('backtest_failed', backtestId, {
        error: result.error.message,
      });

      return result;
    }
  }

  getResult(backtestId: string): BacktestRunResult | undefined {
    return this.results.get(backtestId);
  }

  getAllResults(): BacktestRunResult[] {
    return Array.from(this.results.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  onEvent(callback: BacktestingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private emitEvent(
    type: BacktestingEventType,
    backtestId: string,
    data: Record<string, unknown>,
    severity: BacktestingEvent['severity'] = 'info'
  ): void {
    const event: BacktestingEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      backtestId,
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

  private generateBacktestId(): string {
    return `bt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBacktestingFramework(
  config?: Partial<BacktestingFrameworkConfig>
): DefaultBacktestingFramework {
  return new DefaultBacktestingFramework(config);
}

// Default export
export default DefaultBacktestingFramework;
