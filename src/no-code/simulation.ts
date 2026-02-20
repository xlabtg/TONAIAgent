/**
 * TONAIAgent - Simulation and Backtesting Engine
 *
 * Provides historical backtesting, Monte Carlo simulation,
 * and sandbox testing for strategies before deployment.
 */

import {
  Strategy,
  SimulationConfig,
  BacktestResult,
  StrategyMetrics,
  SimulatedTrade,
  EquityPoint,
  DrawdownPoint,
  MonthlyReturn,
  MarketConditions,
  ActionType,
} from './types';

// ============================================================================
// Simulation Configuration
// ============================================================================

export interface SimulationEngineConfig {
  /** Default data source */
  dataSource?: 'historical' | 'synthetic';
  /** Price data provider */
  priceProvider?: PriceDataProvider;
  /** Enable caching */
  enableCache?: boolean;
  /** Maximum simulation duration (ms) */
  maxDuration?: number;
  /** Default Monte Carlo runs */
  defaultMonteCarloRuns?: number;
}

export interface PriceDataProvider {
  getHistoricalPrices(token: string, startDate: Date, endDate: Date): Promise<PricePoint[]>;
  getCurrentPrice(token: string): Promise<number>;
}

export interface PricePoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const DEFAULT_ENGINE_CONFIG: SimulationEngineConfig = {
  dataSource: 'synthetic',
  enableCache: true,
  maxDuration: 300000, // 5 minutes
  defaultMonteCarloRuns: 100,
};

// ============================================================================
// Simulation Engine
// ============================================================================

/**
 * Engine for running strategy simulations and backtests
 */
export class SimulationEngine {
  private readonly config: SimulationEngineConfig;
  private readonly cache: Map<string, BacktestResult> = new Map();

  constructor(config: Partial<SimulationEngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
  }

  /**
   * Run a backtest on historical data
   */
  async runBacktest(
    strategy: Strategy,
    config: SimulationConfig
  ): Promise<BacktestResult> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.getCacheKey(strategy, config);
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Get price data
    const priceData = await this.getPriceData(strategy, config);

    // Initialize simulation state
    const state = this.initializeSimulationState(config);

    // Run simulation
    const trades: SimulatedTrade[] = [];
    const equityCurve: EquityPoint[] = [];
    const drawdownCurve: DrawdownPoint[] = [];

    let peakEquity = config.initialCapital;

    for (const point of priceData) {
      // Update prices
      state.currentPrices = point;

      // Check triggers and conditions
      const shouldExecute = this.checkStrategyTriggers(strategy, state, point);

      if (shouldExecute) {
        // Execute strategy actions
        const newTrades = this.executeStrategyActions(strategy, state, point);
        trades.push(...newTrades);
      }

      // Calculate current equity
      const currentEquity = this.calculateEquity(state);
      equityCurve.push({ timestamp: point.timestamp, value: currentEquity });

      // Track peak and drawdown
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
      drawdownCurve.push({ timestamp: point.timestamp, drawdown });

      // Check timeout
      if (Date.now() - startTime > this.config.maxDuration!) {
        break;
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades, equityCurve, config);

    // Calculate monthly returns
    const monthlyReturns = this.calculateMonthlyReturns(equityCurve);

    const result: BacktestResult = {
      id: `backtest_${Date.now()}`,
      strategyId: strategy.id,
      config,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      status: 'completed',
      metrics,
      trades,
      equityCurve,
      drawdownCurve,
      monthlyReturns,
    };

    // Cache result
    if (this.config.enableCache) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarlo(
    strategy: Strategy,
    config: SimulationConfig,
    runs?: number
  ): Promise<MonteCarloResult> {
    const numRuns = runs ?? this.config.defaultMonteCarloRuns ?? 100;
    const results: BacktestResult[] = [];

    for (let i = 0; i < numRuns; i++) {
      // Create varied market conditions
      const variedConfig: SimulationConfig = {
        ...config,
        priceDataSource: 'synthetic',
        marketConditions: this.randomizeMarketConditions(config.marketConditions),
      };

      const result = await this.runBacktest(strategy, variedConfig);
      results.push(result);
    }

    // Aggregate results
    return this.aggregateMonteCarloResults(results);
  }

  /**
   * Run a quick sandbox test
   */
  async runSandbox(strategy: Strategy, durationHours = 24): Promise<SandboxResult> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - durationHours * 60 * 60 * 1000);

    const config: SimulationConfig = {
      startDate,
      endDate,
      initialCapital: 1000,
      priceDataSource: 'historical',
      slippageModel: 'realistic',
      gasModel: 'historical',
    };

    const result = await this.runBacktest(strategy, config);

    return {
      success: true,
      trades: result.trades.length,
      finalEquity: result.equityCurve[result.equityCurve.length - 1]?.value ?? config.initialCapital,
      pnl: result.metrics.totalReturn,
      issues: this.detectSandboxIssues(result),
    };
  }

  /**
   * Estimate strategy performance
   */
  async estimatePerformance(
    strategy: Strategy,
    horizon: 'short' | 'medium' | 'long'
  ): Promise<PerformanceEstimate> {
    const durations = {
      short: 7,
      medium: 30,
      long: 90,
    };

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - durations[horizon] * 24 * 60 * 60 * 1000);

    const config: SimulationConfig = {
      startDate,
      endDate,
      initialCapital: 10000,
      priceDataSource: 'historical',
      slippageModel: 'realistic',
      gasModel: 'historical',
    };

    const backtest = await this.runBacktest(strategy, config);
    const monteCarlo = await this.runMonteCarlo(strategy, config, 50);

    return {
      expectedReturn: monteCarlo.medianReturn,
      bestCase: monteCarlo.percentile95Return,
      worstCase: monteCarlo.percentile5Return,
      confidence: this.calculateConfidence(backtest, monteCarlo),
      sharpeRatio: backtest.metrics.sharpeRatio,
      maxDrawdown: backtest.metrics.maxDrawdown,
      winRate: backtest.metrics.winRate,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async getPriceData(
    strategy: Strategy,
    config: SimulationConfig
  ): Promise<SimulationPricePoint[]> {
    if (config.priceDataSource === 'synthetic') {
      return this.generateSyntheticPrices(config);
    }

    // Historical data
    if (this.config.priceProvider) {
      const tokens = this.extractTokensFromStrategy(strategy);
      const allPrices: Map<string, PricePoint[]> = new Map();

      for (const token of tokens) {
        const prices = await this.config.priceProvider.getHistoricalPrices(
          token,
          config.startDate,
          config.endDate
        );
        allPrices.set(token, prices);
      }

      return this.mergePriceData(allPrices);
    }

    // Fallback to synthetic
    return this.generateSyntheticPrices(config);
  }

  private generateSyntheticPrices(config: SimulationConfig): SimulationPricePoint[] {
    const points: SimulationPricePoint[] = [];
    const duration = config.endDate.getTime() - config.startDate.getTime();
    const intervals = Math.floor(duration / (60 * 60 * 1000)); // Hourly

    let currentPrice = 5; // TON starting price
    const conditions = config.marketConditions ?? { volatility: 'medium', trend: 'sideways', liquidity: 'medium' };

    // Volatility multipliers
    const volatilityMap = { low: 0.005, medium: 0.015, high: 0.03 };
    const volatility = volatilityMap[conditions.volatility];

    // Trend drift
    const trendMap = { bull: 0.0005, bear: -0.0005, sideways: 0 };
    const drift = trendMap[conditions.trend];

    for (let i = 0; i < intervals; i++) {
      const timestamp = new Date(config.startDate.getTime() + i * 60 * 60 * 1000);

      // Random walk with drift
      const randomReturn = (Math.random() - 0.5) * 2 * volatility + drift;
      currentPrice = currentPrice * (1 + randomReturn);
      currentPrice = Math.max(currentPrice, 0.01); // Floor

      points.push({
        timestamp,
        prices: {
          TON: currentPrice,
          USDT: 1,
          USDC: 1,
          ETH: currentPrice * 500,
        },
        volume: Math.random() * 1000000,
        gasPrice: 0.05 + Math.random() * 0.05,
      });
    }

    return points;
  }

  private extractTokensFromStrategy(strategy: Strategy): string[] {
    const tokens = new Set<string>();

    strategy.blocks.forEach((block) => {
      const config = block.config as Record<string, unknown>;
      if (config.token) tokens.add(config.token as string);
      if (config.fromToken) tokens.add(config.fromToken as string);
      if (config.toToken) tokens.add(config.toToken as string);
    });

    // Always include basics
    tokens.add('TON');
    tokens.add('USDT');

    return Array.from(tokens);
  }

  private mergePriceData(allPrices: Map<string, PricePoint[]>): SimulationPricePoint[] {
    const points: SimulationPricePoint[] = [];
    const firstToken = Array.from(allPrices.keys())[0];
    const timestamps = allPrices.get(firstToken)?.map((p) => p.timestamp) ?? [];

    timestamps.forEach((timestamp, i) => {
      const prices: Record<string, number> = {};
      allPrices.forEach((tokenPrices, token) => {
        prices[token] = tokenPrices[i]?.close ?? 1;
      });

      points.push({
        timestamp,
        prices,
        volume: 1000000,
        gasPrice: 0.05,
      });
    });

    return points;
  }

  private initializeSimulationState(config: SimulationConfig): SimulationState {
    return {
      capital: config.initialCapital,
      positions: {},
      currentPrices: {
        timestamp: config.startDate,
        prices: { TON: 5, USDT: 1 },
        volume: 0,
        gasPrice: 0.05,
      },
      tradeCount: 0,
      dailyPnl: 0,
      dailyTradeCount: 0,
      lastExecutionTime: config.startDate,
    };
  }

  private checkStrategyTriggers(
    strategy: Strategy,
    state: SimulationState,
    pricePoint: SimulationPricePoint
  ): boolean {
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');

    for (const trigger of triggers) {
      const config = trigger.config as Record<string, unknown>;

      switch (config.type || trigger.name) {
        case 'time_schedule':
        case 'Schedule':
          const interval = (config.interval as number) || 86400;
          const elapsed = (pricePoint.timestamp.getTime() - state.lastExecutionTime.getTime()) / 1000;
          if (elapsed >= interval) {
            return true;
          }
          break;

        case 'price_threshold':
        case 'Price Threshold':
          const token = (config.token as string) || 'TON';
          const threshold = config.threshold as number;
          const direction = (config.direction as string) || 'above';
          const currentPrice = pricePoint.prices[token] || 5;

          if (direction === 'above' && currentPrice > threshold) return true;
          if (direction === 'below' && currentPrice < threshold) return true;
          break;
      }
    }

    return false;
  }

  private executeStrategyActions(
    strategy: Strategy,
    state: SimulationState,
    pricePoint: SimulationPricePoint
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];
    const actions = strategy.blocks.filter((b) => b.category === 'action');

    for (const action of actions) {
      const config = action.config as Record<string, unknown>;

      if (action.name.toLowerCase().includes('swap')) {
        const trade = this.simulateSwap(state, config, pricePoint);
        if (trade) {
          trades.push(trade);
          state.lastExecutionTime = pricePoint.timestamp;
          state.tradeCount++;
        }
      } else if (action.name.toLowerCase().includes('stake')) {
        const trade = this.simulateStake(state, config, pricePoint);
        if (trade) {
          trades.push(trade);
          state.lastExecutionTime = pricePoint.timestamp;
        }
      }
    }

    return trades;
  }

  private simulateSwap(
    state: SimulationState,
    config: Record<string, unknown>,
    pricePoint: SimulationPricePoint
  ): SimulatedTrade | null {
    const fromToken = (config.fromToken as string) || 'USDT';
    const toToken = (config.toToken as string) || 'TON';
    const amountType = (config.amountType as string) || 'percentage';
    const amount = (config.amount as number) || 10;
    const maxSlippage = (config.maxSlippage as number) || 1;

    const fromBalance = state.positions[fromToken] || state.capital;
    if (fromBalance <= 0) return null;

    let swapAmount: number;
    if (amountType === 'percentage') {
      swapAmount = fromBalance * (amount / 100);
    } else if (amountType === 'all') {
      swapAmount = fromBalance;
    } else {
      swapAmount = Math.min(amount, fromBalance);
    }

    const fromPrice = pricePoint.prices[fromToken] || 1;
    const toPrice = pricePoint.prices[toToken] || 5;
    const rate = fromPrice / toPrice;

    // Apply slippage
    const slippage = Math.random() * maxSlippage / 100;
    const effectiveRate = rate * (1 - slippage);

    const toAmount = swapAmount * effectiveRate;
    const gasCost = pricePoint.gasPrice;

    // Update state
    if (state.positions[fromToken]) {
      state.positions[fromToken] -= swapAmount;
    } else {
      state.capital -= swapAmount;
    }
    state.positions[toToken] = (state.positions[toToken] || 0) + toAmount;
    state.capital -= gasCost;

    const pnl = (toAmount * toPrice - swapAmount * fromPrice) / (swapAmount * fromPrice) * 100;
    state.dailyPnl += pnl;

    return {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: pricePoint.timestamp,
      type: 'swap' as ActionType,
      fromToken,
      toToken,
      fromAmount: swapAmount,
      toAmount,
      price: rate,
      slippage: slippage * 100,
      gas: gasCost,
      pnl,
      cumPnl: state.dailyPnl,
    };
  }

  private simulateStake(
    state: SimulationState,
    config: Record<string, unknown>,
    pricePoint: SimulationPricePoint
  ): SimulatedTrade | null {
    const token = (config.token as string) || 'TON';
    const amountType = (config.amountType as string) || 'percentage';
    const amount = (config.amount as number) || 50;

    const balance = state.positions[token] || 0;
    if (balance <= 0) return null;

    let stakeAmount: number;
    if (amountType === 'percentage') {
      stakeAmount = balance * (amount / 100);
    } else if (amountType === 'all') {
      stakeAmount = balance;
    } else {
      stakeAmount = Math.min(amount, balance);
    }

    // Update state
    state.positions[token] = balance - stakeAmount;
    state.positions[`staked_${token}`] = (state.positions[`staked_${token}`] || 0) + stakeAmount;

    return {
      id: `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: pricePoint.timestamp,
      type: 'stake' as ActionType,
      fromToken: token,
      toToken: `staked_${token}`,
      fromAmount: stakeAmount,
      toAmount: stakeAmount,
      price: 1,
      slippage: 0,
      gas: pricePoint.gasPrice,
      pnl: 0,
      cumPnl: state.dailyPnl,
    };
  }

  private calculateEquity(state: SimulationState): number {
    let equity = state.capital;

    for (const [token, amount] of Object.entries(state.positions)) {
      const price = state.currentPrices.prices[token] ||
        state.currentPrices.prices[token.replace('staked_', '')] || 1;
      equity += amount * price;
    }

    return equity;
  }

  private calculateMetrics(
    trades: SimulatedTrade[],
    equityCurve: EquityPoint[],
    config: SimulationConfig
  ): StrategyMetrics {
    if (trades.length === 0 || equityCurve.length === 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
        avgTradeReturn: 0,
        avgHoldingPeriod: 0,
        volatility: 0,
      };
    }

    const initialEquity = config.initialCapital;
    const finalEquity = equityCurve[equityCurve.length - 1].value;
    const totalReturn = ((finalEquity - initialEquity) / initialEquity) * 100;

    // Calculate annualized return
    const durationDays = (config.endDate.getTime() - config.startDate.getTime()) / (24 * 60 * 60 * 1000);
    const annualizedReturn = totalReturn * (365 / durationDays);

    // Calculate returns for Sharpe/Sortino
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    const riskFreeRate = 0.03 / 365; // Daily risk-free rate
    const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility * Math.sqrt(365) : 0;

    // Sortino (only downside deviation)
    const negativeReturns = returns.filter((r) => r < 0);
    const downsideDeviation = negativeReturns.length > 0
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
      : 0;
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn - riskFreeRate) / downsideDeviation * Math.sqrt(365) : 0;

    // Max drawdown
    let peak = initialEquity;
    let maxDrawdown = 0;
    equityCurve.forEach((point) => {
      if (point.value > peak) peak = point.value;
      const dd = ((peak - point.value) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // Win rate
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Average trade return
    const avgTradeReturn = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length
      : 0;

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      avgTradeReturn,
      avgHoldingPeriod: 24, // Assuming daily trades
      volatility: volatility * Math.sqrt(365) * 100,
    };
  }

  private calculateMonthlyReturns(equityCurve: EquityPoint[]): MonthlyReturn[] {
    const monthlyReturns: MonthlyReturn[] = [];
    const monthlyData: Map<string, { start: number; end: number }> = new Map();

    equityCurve.forEach((point) => {
      const key = `${point.timestamp.getFullYear()}-${point.timestamp.getMonth()}`;
      const existing = monthlyData.get(key);
      if (!existing) {
        monthlyData.set(key, { start: point.value, end: point.value });
      } else {
        existing.end = point.value;
      }
    });

    monthlyData.forEach((data, key) => {
      const [year, month] = key.split('-').map(Number);
      const ret = ((data.end - data.start) / data.start) * 100;
      monthlyReturns.push({ year, month, return: ret });
    });

    return monthlyReturns;
  }

  private randomizeMarketConditions(_base?: MarketConditions): MarketConditions {
    const volatilities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
    const trends: Array<'bull' | 'bear' | 'sideways'> = ['bull', 'bear', 'sideways'];
    const liquidities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    return {
      volatility: volatilities[Math.floor(Math.random() * 3)],
      trend: trends[Math.floor(Math.random() * 3)],
      liquidity: liquidities[Math.floor(Math.random() * 3)],
    };
  }

  private aggregateMonteCarloResults(results: BacktestResult[]): MonteCarloResult {
    const returns = results.map((r) => r.metrics.totalReturn).sort((a, b) => a - b);
    const drawdowns = results.map((r) => r.metrics.maxDrawdown).sort((a, b) => a - b);
    const sharpes = results.map((r) => r.metrics.sharpeRatio);

    const medianReturn = returns[Math.floor(returns.length / 2)];
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const percentile5Return = returns[Math.floor(returns.length * 0.05)];
    const percentile95Return = returns[Math.floor(returns.length * 0.95)];

    const medianDrawdown = drawdowns[Math.floor(drawdowns.length / 2)];
    const maxDrawdown = Math.max(...drawdowns);

    const avgSharpe = sharpes.reduce((a, b) => a + b, 0) / sharpes.length;

    return {
      runs: results.length,
      medianReturn,
      avgReturn,
      percentile5Return,
      percentile95Return,
      medianDrawdown,
      maxDrawdown,
      avgSharpe,
      results,
    };
  }

  private calculateConfidence(backtest: BacktestResult, monteCarlo: MonteCarloResult): number {
    let confidence = 0.5;

    // Higher confidence if backtest Sharpe > 1
    if (backtest.metrics.sharpeRatio > 1) confidence += 0.1;
    if (backtest.metrics.sharpeRatio > 2) confidence += 0.1;

    // Higher confidence if win rate > 50%
    if (backtest.metrics.winRate > 0.5) confidence += 0.05;
    if (backtest.metrics.winRate > 0.6) confidence += 0.05;

    // Higher confidence if drawdown < 20%
    if (backtest.metrics.maxDrawdown < 20) confidence += 0.1;
    if (backtest.metrics.maxDrawdown < 10) confidence += 0.05;

    // Monte Carlo consistency
    const returnRange = monteCarlo.percentile95Return - monteCarlo.percentile5Return;
    if (returnRange < 50) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private detectSandboxIssues(result: BacktestResult): string[] {
    const issues: string[] = [];

    if (result.trades.length === 0) {
      issues.push('No trades executed - check trigger conditions');
    }

    if (result.metrics.winRate < 0.3) {
      issues.push('Low win rate - consider adjusting entry conditions');
    }

    if (result.metrics.maxDrawdown > 30) {
      issues.push('High drawdown - consider tighter risk controls');
    }

    const failedTrades = result.trades.filter((t) => t.slippage > 5);
    if (failedTrades.length > 0) {
      issues.push('Some trades had high slippage - consider lower position sizes');
    }

    return issues;
  }

  private getCacheKey(strategy: Strategy, config: SimulationConfig): string {
    return `${strategy.id}_${strategy.version}_${config.startDate.getTime()}_${config.endDate.getTime()}`;
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface SimulationPricePoint {
  timestamp: Date;
  prices: Record<string, number>;
  volume: number;
  gasPrice: number;
}

interface SimulationState {
  capital: number;
  positions: Record<string, number>;
  currentPrices: SimulationPricePoint;
  tradeCount: number;
  dailyPnl: number;
  dailyTradeCount: number;
  lastExecutionTime: Date;
}

export interface MonteCarloResult {
  runs: number;
  medianReturn: number;
  avgReturn: number;
  percentile5Return: number;
  percentile95Return: number;
  medianDrawdown: number;
  maxDrawdown: number;
  avgSharpe: number;
  results: BacktestResult[];
}

export interface SandboxResult {
  success: boolean;
  trades: number;
  finalEquity: number;
  pnl: number;
  issues: string[];
}

export interface PerformanceEstimate {
  expectedReturn: number;
  bestCase: number;
  worstCase: number;
  confidence: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new simulation engine
 */
export function createSimulationEngine(
  config?: Partial<SimulationEngineConfig>
): SimulationEngine {
  return new SimulationEngine(config);
}
