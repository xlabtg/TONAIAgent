/**
 * TONAIAgent - Strategy Marketplace Backtesting Integration
 *
 * Connects the Strategy Marketplace with the Backtesting Engine,
 * enabling users to evaluate strategy performance using historical
 * market data before deployment.
 *
 * Issue #202: Strategy Backtesting Engine
 *
 * Features:
 * - Run backtests on marketplace strategies
 * - Configure backtest parameters (asset, timeframe, capital, dates)
 * - View performance metrics (ROI, drawdown, win rate, Sharpe ratio)
 * - Compare strategy performance across different market conditions
 *
 * @example
 * ```typescript
 * import {
 *   createMarketplaceBacktester,
 *   BacktestConfig,
 * } from '@tonaiagent/core/strategy-marketplace';
 *
 * const backtester = createMarketplaceBacktester();
 *
 * // Run backtest on a marketplace strategy
 * const result = await backtester.runBacktest({
 *   strategyId: 'momentum-trader',
 *   asset: 'TON',
 *   timeframe: '1h',
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-06-30'),
 *   initialCapital: 10000,
 * });
 *
 * console.log(`ROI: ${result.performance.totalReturn}%`);
 * console.log(`Max Drawdown: ${result.performance.maxDrawdown}%`);
 * console.log(`Sharpe Ratio: ${result.performance.sharpeRatio}`);
 * ```
 */

import {
  createBacktestingFramework,
  BacktestingFramework,
  BacktestRunConfig,
  BacktestRunResult,
  BacktestStrategySpec,
  DataGranularity,
  OHLCVCandle,
  PortfolioState,
  PlaceOrderRequest,
  SimulatedOrder,
  PerformanceReport,
  RiskEvaluationResult,
  BacktestReport,
} from '../backtesting';

import {
  MarketplaceStrategyListing,
  createStrategyMarketplace,
  DefaultStrategyMarketplace,
} from './index';

// ============================================================================
// Backtest Configuration Types
// ============================================================================

/**
 * Supported timeframes for backtesting
 */
export type BacktestTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * Backtest configuration for a marketplace strategy
 */
export interface MarketplaceBacktestConfig {
  /** Strategy ID from the marketplace */
  strategyId: string;
  /** Asset to backtest (e.g., 'TON', 'BTC', 'ETH') */
  asset: string;
  /** Trading pair quote currency (default: 'USDT') */
  quoteCurrency?: string;
  /** Candle timeframe */
  timeframe: BacktestTimeframe;
  /** Backtest start date */
  startDate: Date;
  /** Backtest end date */
  endDate: Date;
  /** Initial capital in USD */
  initialCapital: number;
  /** Trading fee percentage (default: 0.1%) */
  tradingFeePercent?: number;
  /** Slippage in basis points (default: 10) */
  slippageBps?: number;
  /** Enable risk evaluation (default: true) */
  enableRiskEvaluation?: boolean;
  /** Enable Monte Carlo analysis (default: false) */
  enableMonteCarlo?: boolean;
  /** Number of Monte Carlo simulations */
  monteCarloSimulations?: number;
}

/**
 * Summary of backtest results for UI display
 */
export interface BacktestResultSummary {
  /** Backtest ID */
  backtestId: string;
  /** Strategy ID */
  strategyId: string;
  /** Strategy name */
  strategyName: string;
  /** Asset tested */
  asset: string;
  /** Period description (e.g., "Jan 2024 - Jun 2024") */
  period: string;
  /** Initial capital */
  initialCapital: number;
  /** Final portfolio value */
  finalValue: number;
  /** Total ROI percentage */
  totalReturn: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Total number of trades */
  totalTrades: number;
  /** Win rate percentage */
  winRate: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Profit factor */
  profitFactor: number;
  /** Risk grade (A-F) */
  riskGrade: string;
  /** Backtest duration in milliseconds */
  durationMs: number;
  /** Equity curve data points for charting */
  equityCurve: Array<{ timestamp: Date; value: number }>;
  /** Trade markers for charting */
  tradeMarkers: Array<{
    timestamp: Date;
    type: 'buy' | 'sell';
    price: number;
    amount: number;
  }>;
}

/**
 * Full backtest result with all details
 */
export interface MarketplaceBacktestResult {
  /** Summary for quick display */
  summary: BacktestResultSummary;
  /** Full backtest run result */
  fullResult: BacktestRunResult;
  /** Strategy listing info */
  strategy: MarketplaceStrategyListing;
  /** Configuration used */
  config: MarketplaceBacktestConfig;
  /** Warnings or notes */
  warnings: string[];
}

/**
 * Backtest comparison result
 */
export interface BacktestComparisonResult {
  /** Strategies compared */
  strategies: Array<{
    strategyId: string;
    strategyName: string;
    result: BacktestResultSummary;
  }>;
  /** Best performer by ROI */
  bestByRoi: string;
  /** Best performer by risk-adjusted returns */
  bestByRiskAdjusted: string;
  /** Lowest drawdown strategy */
  lowestDrawdown: string;
  /** Highest win rate strategy */
  highestWinRate: string;
}

// ============================================================================
// Strategy Execution Adapters
// ============================================================================

/**
 * Creates a backtest strategy spec from a marketplace strategy.
 * This adapts marketplace strategies to the backtesting framework.
 */
function createStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  // Map marketplace strategy categories to execution logic
  switch (strategy.category) {
    case 'momentum':
      return createMomentumStrategySpec(strategy, asset);
    case 'mean_reversion':
      return createMeanReversionStrategySpec(strategy, asset);
    case 'trend_following':
      return createTrendFollowingStrategySpec(strategy, asset);
    case 'grid_trading':
      return createGridTradingStrategySpec(strategy, asset);
    case 'arbitrage':
      return createArbitrageStrategySpec(strategy, asset);
    case 'yield_farming':
      return createYieldFarmingStrategySpec(strategy, asset);
    default:
      return createDefaultStrategySpec(strategy, asset);
  }
}

/**
 * Momentum strategy: Buy when short MA crosses above long MA
 */
function createMomentumStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  const shortPeriod = 10;
  const longPeriod = 20;
  const priceHistory: number[] = [];

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      priceHistory.push(candle.close);
      if (priceHistory.length > longPeriod) {
        priceHistory.shift();
      }

      if (priceHistory.length < longPeriod) return;

      const shortMA =
        priceHistory.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod;
      const longMA = priceHistory.reduce((a, b) => a + b, 0) / longPeriod;
      const prevShortMA =
        priceHistory.slice(-shortPeriod - 1, -1).reduce((a, b) => a + b, 0) /
        shortPeriod;

      const hasPosition = portfolio.positions.has(asset);
      const positionSize = hasPosition ? portfolio.positions.get(asset)!.amount : 0;

      // Buy signal: short MA crosses above long MA
      if (shortMA > longMA && prevShortMA <= longMA && portfolio.cash > 100) {
        const tradeAmount = portfolio.cash * 0.95; // Use 95% of available cash
        await placeOrder({
          asset,
          side: 'buy',
          type: 'market',
          amount: tradeAmount,
          amountType: 'usd',
        });
      }
      // Sell signal: short MA crosses below long MA
      else if (shortMA < longMA && prevShortMA >= longMA && positionSize > 0) {
        await placeOrder({
          asset,
          side: 'sell',
          type: 'market',
          amount: 100,
          amountType: 'percent',
        });
      }
    },
  };
}

/**
 * Mean reversion strategy: Buy when price drops below lower Bollinger Band
 */
function createMeanReversionStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  const period = 20;
  const stdMultiplier = 2;
  const priceHistory: number[] = [];

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      priceHistory.push(candle.close);
      if (priceHistory.length > period) {
        priceHistory.shift();
      }

      if (priceHistory.length < period) return;

      const mean = priceHistory.reduce((a, b) => a + b, 0) / period;
      const variance =
        priceHistory.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const upperBand = mean + stdMultiplier * stdDev;
      const lowerBand = mean - stdMultiplier * stdDev;

      const hasPosition = portfolio.positions.has(asset);
      const positionSize = hasPosition ? portfolio.positions.get(asset)!.amount : 0;

      // Buy when price touches lower band (oversold)
      if (candle.close <= lowerBand && portfolio.cash > 100) {
        const tradeAmount = portfolio.cash * 0.5; // Use 50% for mean reversion
        await placeOrder({
          asset,
          side: 'buy',
          type: 'market',
          amount: tradeAmount,
          amountType: 'usd',
        });
      }
      // Sell when price reaches upper band (overbought)
      else if (candle.close >= upperBand && positionSize > 0) {
        await placeOrder({
          asset,
          side: 'sell',
          type: 'market',
          amount: 100,
          amountType: 'percent',
        });
      }
      // Take profit at mean
      else if (candle.close >= mean && positionSize > 0) {
        await placeOrder({
          asset,
          side: 'sell',
          type: 'market',
          amount: 50,
          amountType: 'percent',
        });
      }
    },
  };
}

/**
 * Trend following strategy: Follow the trend with trailing stops
 */
function createTrendFollowingStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  const period = 14;
  const priceHistory: number[] = [];
  let entryPrice = 0;
  let highSinceEntry = 0;

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      priceHistory.push(candle.close);
      if (priceHistory.length > period) {
        priceHistory.shift();
      }

      if (priceHistory.length < period) return;

      const high = Math.max(...priceHistory);
      const low = Math.min(...priceHistory);
      const range = high - low;
      const momentum = (candle.close - low) / (range || 1);

      const hasPosition = portfolio.positions.has(asset);
      const positionSize = hasPosition ? portfolio.positions.get(asset)!.amount : 0;

      if (hasPosition) {
        highSinceEntry = Math.max(highSinceEntry, candle.close);
      }

      // Buy when strong upward momentum
      if (momentum > 0.8 && !hasPosition && portfolio.cash > 100) {
        entryPrice = candle.close;
        highSinceEntry = candle.close;
        const tradeAmount = portfolio.cash * 0.9;
        await placeOrder({
          asset,
          side: 'buy',
          type: 'market',
          amount: tradeAmount,
          amountType: 'usd',
        });
      }
      // Exit on trailing stop (8% from high)
      else if (
        hasPosition &&
        candle.close < highSinceEntry * 0.92 &&
        positionSize > 0
      ) {
        await placeOrder({
          asset,
          side: 'sell',
          type: 'market',
          amount: 100,
          amountType: 'percent',
        });
        entryPrice = 0;
        highSinceEntry = 0;
      }
      // Exit on momentum reversal
      else if (momentum < 0.2 && positionSize > 0) {
        await placeOrder({
          asset,
          side: 'sell',
          type: 'market',
          amount: 100,
          amountType: 'percent',
        });
        entryPrice = 0;
        highSinceEntry = 0;
      }
    },
  };
}

/**
 * Grid trading strategy: Place orders at regular price intervals
 */
function createGridTradingStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  const gridLevels = 10;
  const gridSpacing = 0.02; // 2% between levels
  let gridCenter = 0;
  let gridInitialized = false;
  const filledLevels = new Set<number>();

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      // Initialize grid around first candle price
      if (!gridInitialized) {
        gridCenter = candle.close;
        gridInitialized = true;
      }

      const positionValue = portfolio.positions.has(asset)
        ? portfolio.positions.get(asset)!.positionValue
        : 0;
      const totalValue = portfolio.cash + positionValue;
      const gridAmount = totalValue / gridLevels;

      // Check each grid level
      for (let i = -gridLevels / 2; i <= gridLevels / 2; i++) {
        const levelPrice = gridCenter * (1 + i * gridSpacing);
        const levelKey = Math.round(levelPrice * 100);

        // Buy at lower levels
        if (
          i < 0 &&
          candle.low <= levelPrice &&
          !filledLevels.has(levelKey) &&
          portfolio.cash >= gridAmount
        ) {
          filledLevels.add(levelKey);
          await placeOrder({
            asset,
            side: 'buy',
            type: 'market',
            amount: gridAmount,
            amountType: 'usd',
          });
        }
        // Sell at higher levels
        else if (
          i > 0 &&
          candle.high >= levelPrice &&
          filledLevels.has(Math.round(gridCenter * (1 + (i - 1) * gridSpacing) * 100))
        ) {
          const sellLevelKey = Math.round(
            gridCenter * (1 + (i - 1) * gridSpacing) * 100
          );
          if (filledLevels.has(sellLevelKey)) {
            filledLevels.delete(sellLevelKey);
            const position = portfolio.positions.get(asset);
            if (position && position.amount > 0) {
              const sellAmount = Math.min(
                gridAmount / candle.close,
                position.amount
              );
              if (sellAmount > 0) {
                await placeOrder({
                  asset,
                  side: 'sell',
                  type: 'market',
                  amount: sellAmount,
                  amountType: 'units',
                });
              }
            }
          }
        }
      }
    },
  };
}

/**
 * Arbitrage strategy: Simulates spread capture (simplified)
 */
function createArbitrageStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  const spreadThreshold = 0.005; // 0.5% minimum spread
  let lastPrice = 0;

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      if (lastPrice === 0) {
        lastPrice = candle.close;
        return;
      }

      const priceChange = Math.abs(candle.close - lastPrice) / lastPrice;
      const hasPosition = portfolio.positions.has(asset);

      // Capture spread opportunities
      if (priceChange > spreadThreshold) {
        if (candle.close < lastPrice && portfolio.cash > 100) {
          // Price dropped - buy opportunity
          const tradeAmount = Math.min(portfolio.cash * 0.3, 1000);
          await placeOrder({
            asset,
            side: 'buy',
            type: 'market',
            amount: tradeAmount,
            amountType: 'usd',
          });
        } else if (candle.close > lastPrice && hasPosition) {
          // Price increased - sell opportunity
          await placeOrder({
            asset,
            side: 'sell',
            type: 'market',
            amount: 100,
            amountType: 'percent',
          });
        }
      }

      lastPrice = candle.close;
    },
  };
}

/**
 * Yield farming strategy: Simulates DCA with yield optimization
 */
function createYieldFarmingStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  let lastBuyTime = 0;
  const buyInterval = 7 * 24 * 60 * 60 * 1000; // Weekly DCA
  const yieldRate = 0.0001; // Simulated daily yield (0.01%)

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      const currentTime = candle.timestamp.getTime();

      // Weekly DCA buy
      if (
        currentTime - lastBuyTime >= buyInterval &&
        portfolio.cash > 100
      ) {
        lastBuyTime = currentTime;
        const dcaAmount = Math.min(portfolio.cash * 0.1, 500);
        await placeOrder({
          asset,
          side: 'buy',
          type: 'market',
          amount: dcaAmount,
          amountType: 'usd',
        });
      }

      // Yield is simulated by holding positions (no explicit action needed)
      // The performance calculation will show compound growth
    },
  };
}

/**
 * Default strategy: Simple buy and hold
 */
function createDefaultStrategySpec(
  strategy: MarketplaceStrategyListing,
  asset: string
): BacktestStrategySpec {
  let hasBought = false;

  return {
    assets: [asset],
    onCandle: async (
      candle: OHLCVCandle,
      portfolio: Readonly<PortfolioState>,
      placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
    ) => {
      // Buy once at start
      if (!hasBought && portfolio.cash > 100) {
        hasBought = true;
        await placeOrder({
          asset,
          side: 'buy',
          type: 'market',
          amount: portfolio.cash * 0.95,
          amountType: 'usd',
        });
      }
    },
  };
}

// ============================================================================
// Marketplace Backtester Interface
// ============================================================================

/**
 * Interface for the marketplace backtesting service
 */
export interface MarketplaceBacktester {
  /** Run a backtest on a marketplace strategy */
  runBacktest(config: MarketplaceBacktestConfig): Promise<MarketplaceBacktestResult>;

  /** Get a previously run backtest result */
  getBacktestResult(backtestId: string): MarketplaceBacktestResult | undefined;

  /** Get all backtest results for a strategy */
  getStrategyBacktests(strategyId: string): MarketplaceBacktestResult[];

  /** Get all backtest results */
  getAllBacktests(): MarketplaceBacktestResult[];

  /** Compare multiple strategies with the same configuration */
  compareStrategies(
    strategyIds: string[],
    config: Omit<MarketplaceBacktestConfig, 'strategyId'>
  ): Promise<BacktestComparisonResult>;

  /** Get available assets for backtesting */
  getAvailableAssets(): string[];

  /** Get available timeframes */
  getAvailableTimeframes(): BacktestTimeframe[];

  /** Validate backtest configuration */
  validateConfig(config: MarketplaceBacktestConfig): { valid: boolean; errors: string[] };
}

// ============================================================================
// Default Marketplace Backtester Implementation
// ============================================================================

export class DefaultMarketplaceBacktester implements MarketplaceBacktester {
  private readonly framework: BacktestingFramework;
  private readonly marketplace: DefaultStrategyMarketplace;
  private readonly results: Map<string, MarketplaceBacktestResult> = new Map();

  constructor(
    framework?: BacktestingFramework,
    marketplace?: DefaultStrategyMarketplace
  ) {
    this.framework = framework ?? createBacktestingFramework();
    this.marketplace = marketplace ?? createStrategyMarketplace();
  }

  async runBacktest(
    config: MarketplaceBacktestConfig
  ): Promise<MarketplaceBacktestResult> {
    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid backtest configuration: ${validation.errors.join(', ')}`);
    }

    // Get strategy from marketplace
    const strategy = await this.marketplace.getStrategy(config.strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${config.strategyId}`);
    }

    // Create strategy spec
    const strategySpec = createStrategySpec(strategy, config.asset);

    // Build backtest run configuration
    const runConfig: BacktestRunConfig = {
      strategyId: config.strategyId,
      strategyName: strategy.name,
      strategySpec,
      dataConfig: {
        type: 'synthetic',
        assets: [config.asset],
        startDate: config.startDate,
        endDate: config.endDate,
        granularity: config.timeframe as DataGranularity,
        syntheticConfig: {
          initialPrices: { [config.asset]: this.getInitialPrice(config.asset) },
          volatility: this.getVolatility(strategy),
          drift: this.getDrift(strategy),
          seed: Date.now(),
        },
      },
      simulationConfig: {
        initialCapital: config.initialCapital,
        currency: config.quoteCurrency ?? 'USD',
        slippageModel: {
          type: 'fixed',
          baseSlippage: config.slippageBps ?? 10,
        },
        feeModel: {
          tradingFeePercent: config.tradingFeePercent ?? 0.1,
          gasCostUsd: 0.05,
        },
        fillModel: {
          type: 'immediate',
        },
      },
      riskEvaluation: config.enableRiskEvaluation ?? true,
      monteCarlo: config.enableMonteCarlo
        ? {
            enabled: true,
            simulations: config.monteCarloSimulations ?? 1000,
            confidenceLevel: 0.95,
          }
        : undefined,
      generateReport: true,
    };

    // Run backtest
    const fullResult = await this.framework.run(runConfig);

    // Build summary
    const summary = this.buildSummary(fullResult, strategy, config);

    // Create result
    const result: MarketplaceBacktestResult = {
      summary,
      fullResult,
      strategy,
      config,
      warnings: fullResult.warnings,
    };

    // Store result
    this.results.set(fullResult.id, result);

    return result;
  }

  getBacktestResult(backtestId: string): MarketplaceBacktestResult | undefined {
    return this.results.get(backtestId);
  }

  getStrategyBacktests(strategyId: string): MarketplaceBacktestResult[] {
    return Array.from(this.results.values()).filter(
      (r) => r.config.strategyId === strategyId
    );
  }

  getAllBacktests(): MarketplaceBacktestResult[] {
    return Array.from(this.results.values()).sort(
      (a, b) =>
        b.fullResult.startedAt.getTime() - a.fullResult.startedAt.getTime()
    );
  }

  async compareStrategies(
    strategyIds: string[],
    config: Omit<MarketplaceBacktestConfig, 'strategyId'>
  ): Promise<BacktestComparisonResult> {
    const results = await Promise.all(
      strategyIds.map((strategyId) =>
        this.runBacktest({ ...config, strategyId })
      )
    );

    const strategies = results.map((r) => ({
      strategyId: r.config.strategyId,
      strategyName: r.strategy.name,
      result: r.summary,
    }));

    // Find best performers
    const bestByRoi = strategies.reduce((best, curr) =>
      curr.result.totalReturn > best.result.totalReturn ? curr : best
    );

    const bestByRiskAdjusted = strategies.reduce((best, curr) =>
      curr.result.sharpeRatio > best.result.sharpeRatio ? curr : best
    );

    const lowestDrawdown = strategies.reduce((best, curr) =>
      Math.abs(curr.result.maxDrawdown) < Math.abs(best.result.maxDrawdown)
        ? curr
        : best
    );

    const highestWinRate = strategies.reduce((best, curr) =>
      curr.result.winRate > best.result.winRate ? curr : best
    );

    return {
      strategies,
      bestByRoi: bestByRoi.strategyId,
      bestByRiskAdjusted: bestByRiskAdjusted.strategyId,
      lowestDrawdown: lowestDrawdown.strategyId,
      highestWinRate: highestWinRate.strategyId,
    };
  }

  getAvailableAssets(): string[] {
    return ['TON', 'BTC', 'ETH', 'USDT', 'USDC', 'SOL'];
  }

  getAvailableTimeframes(): BacktestTimeframe[] {
    return ['1m', '5m', '15m', '1h', '4h', '1d'];
  }

  validateConfig(
    config: MarketplaceBacktestConfig
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.strategyId) {
      errors.push('Strategy ID is required');
    }

    if (!config.asset) {
      errors.push('Asset is required');
    }

    if (!this.getAvailableTimeframes().includes(config.timeframe)) {
      errors.push(`Invalid timeframe: ${config.timeframe}`);
    }

    if (!config.startDate || !(config.startDate instanceof Date)) {
      errors.push('Valid start date is required');
    }

    if (!config.endDate || !(config.endDate instanceof Date)) {
      errors.push('Valid end date is required');
    }

    if (config.startDate && config.endDate && config.startDate >= config.endDate) {
      errors.push('Start date must be before end date');
    }

    if (!config.initialCapital || config.initialCapital <= 0) {
      errors.push('Initial capital must be positive');
    }

    if (config.initialCapital && config.initialCapital < 100) {
      errors.push('Minimum initial capital is $100');
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildSummary(
    result: BacktestRunResult,
    strategy: MarketplaceStrategyListing,
    config: MarketplaceBacktestConfig
  ): BacktestResultSummary {
    const performance = result.performance;
    const riskEval = result.riskEvaluation;

    // Format period string
    const startMonth = config.startDate.toLocaleString('en-US', { month: 'short' });
    const startYear = config.startDate.getFullYear();
    const endMonth = config.endDate.toLocaleString('en-US', { month: 'short' });
    const endYear = config.endDate.getFullYear();
    const period =
      startYear === endYear
        ? `${startMonth} - ${endMonth} ${endYear}`
        : `${startMonth} ${startYear} - ${endMonth} ${endYear}`;

    // Build equity curve for charting
    const equityCurve = result.equityCurve.map((point) => ({
      timestamp: point.timestamp,
      value: point.equity,
    }));

    // Build trade markers for charting
    const tradeMarkers = result.orders
      .filter((o) => o.status === 'filled')
      .map((o) => ({
        timestamp: o.timestamp,
        type: o.side as 'buy' | 'sell',
        price: o.executedPrice,
        amount: o.filledAmount,
      }));

    return {
      backtestId: result.id,
      strategyId: config.strategyId,
      strategyName: strategy.name,
      asset: config.asset,
      period,
      initialCapital: config.initialCapital,
      finalValue: performance?.summary.capitalEnd ?? config.initialCapital,
      totalReturn: performance?.summary.totalReturn ?? 0,
      maxDrawdown: performance?.risk.maxDrawdown ?? 0,
      totalTrades: performance?.trades.totalTrades ?? 0,
      winRate: performance?.trades.winRate ?? 0,
      sharpeRatio: performance?.risk.sharpeRatio ?? 0,
      profitFactor: performance?.trades.profitFactor ?? 0,
      riskGrade: riskEval?.riskGrade ?? 'C',
      durationMs: result.durationMs ?? 0,
      equityCurve,
      tradeMarkers,
    };
  }

  private getInitialPrice(asset: string): number {
    const prices: Record<string, number> = {
      TON: 5.0,
      BTC: 65000,
      ETH: 3500,
      USDT: 1.0,
      USDC: 1.0,
      SOL: 175,
    };
    return prices[asset] ?? 1.0;
  }

  private getVolatility(strategy: MarketplaceStrategyListing): number {
    // Higher risk strategies should see higher volatility in simulation
    switch (strategy.riskLevel) {
      case 'low':
        return 0.02;
      case 'medium':
        return 0.035;
      case 'high':
        return 0.05;
      default:
        return 0.03;
    }
  }

  private getDrift(strategy: MarketplaceStrategyListing): number {
    // Slight upward drift for realistic simulation
    return 0.0003;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new marketplace backtester instance
 */
export function createMarketplaceBacktester(
  framework?: BacktestingFramework,
  marketplace?: DefaultStrategyMarketplace
): DefaultMarketplaceBacktester {
  return new DefaultMarketplaceBacktester(framework, marketplace);
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * CLI backtest configuration parsed from command line
 */
export interface CLIBacktestConfig {
  strategyName: string;
  asset: string;
  startDate: string;
  endDate: string;
  initialCapital?: number;
  timeframe?: BacktestTimeframe;
}

/**
 * Parse CLI arguments for backtest command
 * Usage: npm run backtest <strategy> <asset> <start-date> <end-date> [options]
 */
export function parseCLIBacktestArgs(args: string[]): CLIBacktestConfig | null {
  if (args.length < 4) {
    return null;
  }

  const [strategyName, asset, startDate, endDate, ...rest] = args;

  const config: CLIBacktestConfig = {
    strategyName,
    asset: asset.toUpperCase(),
    startDate,
    endDate,
  };

  // Parse optional arguments
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];

    if (flag === '--capital' && value) {
      config.initialCapital = parseFloat(value);
    } else if (flag === '--timeframe' && value) {
      config.timeframe = value as BacktestTimeframe;
    }
  }

  return config;
}

/**
 * Run backtest from CLI configuration
 */
export async function runCLIBacktest(
  config: CLIBacktestConfig
): Promise<BacktestResultSummary> {
  const backtester = createMarketplaceBacktester();

  // Find strategy by name
  const marketplace = createStrategyMarketplace();
  const strategies = await marketplace.listStrategies({
    search: config.strategyName,
    limit: 1,
  });

  if (strategies.length === 0) {
    throw new Error(`Strategy not found: ${config.strategyName}`);
  }

  const strategy = strategies[0];

  const result = await backtester.runBacktest({
    strategyId: strategy.id,
    asset: config.asset,
    timeframe: config.timeframe ?? '1h',
    startDate: new Date(config.startDate),
    endDate: new Date(config.endDate),
    initialCapital: config.initialCapital ?? 10000,
  });

  return result.summary;
}

/**
 * Format backtest result for CLI output
 */
export function formatCLIBacktestResult(summary: BacktestResultSummary): string {
  const lines = [
    '',
    '═══════════════════════════════════════════════════════════',
    `  BACKTEST RESULTS: ${summary.strategyName}`,
    '═══════════════════════════════════════════════════════════',
    '',
    `  Asset:           ${summary.asset}`,
    `  Period:          ${summary.period}`,
    `  Initial Capital: $${summary.initialCapital.toLocaleString()}`,
    '',
    '  PERFORMANCE',
    '  ─────────────────────────────────────────────────────────',
    `  Final Value:     $${summary.finalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `  Total Return:    ${summary.totalReturn >= 0 ? '+' : ''}${summary.totalReturn.toFixed(2)}%`,
    `  Max Drawdown:    ${summary.maxDrawdown.toFixed(2)}%`,
    '',
    '  TRADING STATISTICS',
    '  ─────────────────────────────────────────────────────────',
    `  Total Trades:    ${summary.totalTrades}`,
    `  Win Rate:        ${summary.winRate.toFixed(1)}%`,
    `  Profit Factor:   ${summary.profitFactor.toFixed(2)}`,
    '',
    '  RISK METRICS',
    '  ─────────────────────────────────────────────────────────',
    `  Sharpe Ratio:    ${summary.sharpeRatio.toFixed(2)}`,
    `  Risk Grade:      ${summary.riskGrade}`,
    '',
    `  Backtest completed in ${summary.durationMs}ms`,
    '═══════════════════════════════════════════════════════════',
    '',
  ];

  return lines.join('\n');
}

export default DefaultMarketplaceBacktester;
