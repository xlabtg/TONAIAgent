/**
 * TONAIAgent - Strategy Backtesting Engine
 *
 * Historical simulation and what-if analysis for strategy validation.
 * Provides performance metrics, risk analysis, and optimization.
 */

import {
  Strategy,
  StrategySpec,
  StrategyPerformance,
  BacktestConfig,
  BacktestResult,
  BacktestWarning,
  EquityPoint,
  SimulatedTrade,
  MonteCarloResult,
  SlippageModel,
  FeeModel,
  StrategyEvent,
  StrategyEventCallback,
  Timeframe,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface HistoricalDataProvider {
  getPrices(token: string, start: Date, end: Date, granularity: Timeframe): Promise<OHLCV[]>;
  getVolume(token: string, start: Date, end: Date, granularity: Timeframe): Promise<VolumeData[]>;
  getLiquidity(pool: string, start: Date, end: Date): Promise<LiquidityData[]>;
}

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeData {
  timestamp: Date;
  volume: number;
  volumeUsd: number;
}

export interface LiquidityData {
  timestamp: Date;
  liquidity: number;
  liquidityUsd: number;
}

export interface BacktestState {
  timestamp: Date;
  equity: number;
  cash: number;
  positions: Map<string, Position>;
  unrealizedPnl: number;
  realizedPnl: number;
  trades: SimulatedTrade[];
  drawdown: number;
  maxEquity: number;
}

export interface Position {
  token: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  entryTime: Date;
}

// ============================================================================
// Backtesting Engine Implementation
// ============================================================================

export class BacktestingEngine {
  private readonly results: Map<string, BacktestResult> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];

  constructor(
    private readonly dataProvider?: HistoricalDataProvider
  ) {}

  /**
   * Run a backtest for a strategy
   */
  async runBacktest(
    strategy: Strategy,
    config: BacktestConfig
  ): Promise<BacktestResult> {
    const id = this.generateId();
    const startTime = new Date();

    const result: BacktestResult = {
      id,
      strategyId: strategy.id,
      config,
      status: 'running',
      startedAt: startTime,
      performance: this.createEmptyPerformance(strategy.id, config),
      equityCurve: [],
      trades: [],
      warnings: [],
    };

    this.results.set(id, result);

    this.emitEvent({
      id: this.generateId(),
      type: 'backtest_completed', // Will be updated
      strategyId: strategy.id,
      timestamp: startTime,
      data: { backtestId: id, status: 'started' },
      severity: 'info',
    });

    try {
      // Initialize backtest state
      const state = this.initializeState(config);

      // Get historical data
      const priceData = await this.getHistoricalData(strategy.definition, config);

      // Run simulation
      const { equityCurve, trades, warnings } = await this.simulate(
        strategy.definition,
        config,
        state,
        priceData
      );

      // Calculate performance metrics
      const performance = this.calculatePerformance(
        strategy.id,
        config,
        equityCurve,
        trades
      );

      // Run Monte Carlo if enabled
      let monteCarlo: MonteCarloResult | undefined;
      if (config.monteCarlo?.enabled) {
        monteCarlo = this.runMonteCarlo(trades, config.monteCarlo);
      }

      // Update result
      result.status = 'completed';
      result.completedAt = new Date();
      result.equityCurve = equityCurve;
      result.trades = trades;
      result.performance = performance;
      result.monteCarlo = monteCarlo;
      result.warnings = warnings;

      this.results.set(id, result);

      this.emitEvent({
        id: this.generateId(),
        type: 'backtest_completed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: {
          backtestId: id,
          status: 'completed',
          totalReturn: performance.metrics.totalReturn,
          sharpeRatio: performance.metrics.sharpeRatio,
        },
        severity: 'info',
      });

      return result;

    } catch (error) {
      result.status = 'failed';
      result.completedAt = new Date();
      result.error = {
        code: 'BACKTEST_ERROR',
        message: String(error),
        retryable: true,
      };

      this.results.set(id, result);

      this.emitEvent({
        id: this.generateId(),
        type: 'backtest_completed',
        strategyId: strategy.id,
        timestamp: new Date(),
        data: { backtestId: id, status: 'failed', error: String(error) },
        severity: 'error',
      });

      return result;
    }
  }

  /**
   * Get backtest result by ID
   */
  getResult(id: string): BacktestResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get results for a strategy
   */
  getResults(strategyId: string): BacktestResult[] {
    return Array.from(this.results.values())
      .filter(r => r.strategyId === strategyId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Cancel a running backtest
   */
  cancel(id: string): void {
    const result = this.results.get(id);
    if (result && result.status === 'running') {
      result.status = 'cancelled';
      result.completedAt = new Date();
      this.results.set(id, result);
    }
  }

  /**
   * Subscribe to backtest events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeState(config: BacktestConfig): BacktestState {
    return {
      timestamp: config.period.start,
      equity: config.initialCapital,
      cash: config.initialCapital,
      positions: new Map(),
      unrealizedPnl: 0,
      realizedPnl: 0,
      trades: [],
      drawdown: 0,
      maxEquity: config.initialCapital,
    };
  }

  private async getHistoricalData(
    definition: StrategySpec,
    config: BacktestConfig
  ): Promise<Map<string, OHLCV[]>> {
    const data = new Map<string, OHLCV[]>();

    // Extract tokens from strategy
    const tokens = this.extractTokens(definition);

    // Generate synthetic data if no data provider
    for (const token of tokens) {
      if (this.dataProvider) {
        const prices = await this.dataProvider.getPrices(
          token,
          config.period.start,
          config.period.end,
          config.dataGranularity
        );
        data.set(token, prices);
      } else {
        // Generate synthetic data for testing
        data.set(token, this.generateSyntheticData(
          token,
          config.period.start,
          config.period.end,
          config.dataGranularity
        ));
      }
    }

    return data;
  }

  private extractTokens(definition: StrategySpec): string[] {
    const tokens = new Set<string>();

    // From triggers
    for (const trigger of definition.triggers) {
      const config = trigger.config as { token?: string; tokens?: string[] };
      if (config.token) tokens.add(config.token);
      if (config.tokens) config.tokens.forEach(t => tokens.add(t));
    }

    // From actions
    for (const action of definition.actions) {
      const config = action.config as {
        token?: string;
        fromToken?: string;
        toToken?: string;
        tokenA?: string;
        tokenB?: string;
      };
      if (config.token) tokens.add(config.token);
      if (config.fromToken) tokens.add(config.fromToken);
      if (config.toToken) tokens.add(config.toToken);
      if (config.tokenA) tokens.add(config.tokenA);
      if (config.tokenB) tokens.add(config.tokenB);
    }

    // Always include TON
    tokens.add('TON');

    return Array.from(tokens);
  }

  private generateSyntheticData(
    token: string,
    start: Date,
    end: Date,
    granularity: Timeframe
  ): OHLCV[] {
    const data: OHLCV[] = [];
    const intervalMs = this.timeframeToMs(granularity);

    let currentTime = start.getTime();
    let price = token === 'TON' ? 5.0 : 1.0;

    while (currentTime <= end.getTime()) {
      // Random walk with drift
      const change = (Math.random() - 0.48) * 0.02; // Slight upward bias
      price *= (1 + change);

      const high = price * (1 + Math.random() * 0.01);
      const low = price * (1 - Math.random() * 0.01);

      data.push({
        timestamp: new Date(currentTime),
        open: price * (1 + (Math.random() - 0.5) * 0.005),
        high,
        low,
        close: price,
        volume: Math.random() * 1000000 + 100000,
      });

      currentTime += intervalMs;
    }

    return data;
  }

  private timeframeToMs(tf: Timeframe): number {
    const map: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return map[tf] ?? 60 * 60 * 1000;
  }

  private async simulate(
    definition: StrategySpec,
    config: BacktestConfig,
    state: BacktestState,
    priceData: Map<string, OHLCV[]>
  ): Promise<{
    equityCurve: EquityPoint[];
    trades: SimulatedTrade[];
    warnings: BacktestWarning[];
  }> {
    const equityCurve: EquityPoint[] = [];
    const warnings: BacktestWarning[] = [];

    // Get all timestamps
    const allTimestamps = new Set<number>();
    for (const prices of priceData.values()) {
      for (const p of prices) {
        allTimestamps.add(p.timestamp.getTime());
      }
    }
    const sortedTimestamps = Array.from(allTimestamps).sort();

    // Simulate each time step
    for (const ts of sortedTimestamps) {
      const timestamp = new Date(ts);
      state.timestamp = timestamp;

      // Update prices and positions
      const currentPrices = new Map<string, number>();
      for (const [token, prices] of priceData) {
        const price = prices.find(p => p.timestamp.getTime() === ts);
        if (price) {
          currentPrices.set(token, price.close);
        }
      }

      this.updatePositions(state, currentPrices);

      // Check triggers (simplified)
      const shouldExecute = this.checkTriggers(definition, state, currentPrices, timestamp);

      if (shouldExecute) {
        // Check conditions
        const conditionsMet = this.checkConditions(definition, state, currentPrices);

        if (conditionsMet) {
          // Execute actions
          const trades = this.executeActions(
            definition,
            state,
            currentPrices,
            config,
            timestamp
          );
          state.trades.push(...trades);
        }
      }

      // Check risk controls
      this.checkRiskControls(definition, state, currentPrices);

      // Calculate equity
      const equity = this.calculateEquity(state, currentPrices);
      state.equity = equity;

      if (equity > state.maxEquity) {
        state.maxEquity = equity;
      }
      state.drawdown = (state.maxEquity - equity) / state.maxEquity;

      // Record equity curve point
      equityCurve.push({
        timestamp,
        equity,
        drawdown: state.drawdown,
        positions: Object.fromEntries(
          Array.from(state.positions.entries()).map(([k, v]) => [k, v.amount])
        ),
      });
    }

    return { equityCurve, trades: state.trades, warnings };
  }

  private updatePositions(state: BacktestState, prices: Map<string, number>): void {
    let totalUnrealized = 0;

    for (const [token, position] of state.positions) {
      const price = prices.get(token);
      if (price) {
        position.currentPrice = price;
        position.unrealizedPnl = (price - position.entryPrice) * position.amount;
        totalUnrealized += position.unrealizedPnl;
      }
    }

    state.unrealizedPnl = totalUnrealized;
  }

  private checkTriggers(
    definition: StrategySpec,
    _state: BacktestState,
    prices: Map<string, number>,
    _timestamp: Date
  ): boolean {
    // Simplified trigger checking for backtest
    // In a real implementation, this would evaluate all trigger conditions

    for (const trigger of definition.triggers) {
      if (!trigger.enabled) continue;

      if (trigger.config.type === 'schedule') {
        // For backtest, we'll trigger at each time step
        // In production, would check cron expression
        return true;
      }

      if (trigger.config.type === 'price') {
        const config = trigger.config as { token: string; operator: string; value: number };
        const price = prices.get(config.token);
        if (price && this.compareValues(price, config.operator, config.value)) {
          return true;
        }
      }
    }

    return true; // Default to executing for backtest
  }

  private checkConditions(
    definition: StrategySpec,
    state: BacktestState,
    _prices: Map<string, number>
  ): boolean {
    // Simplified condition checking
    for (const condition of definition.conditions) {
      if (!condition.required) continue;

      for (const rule of condition.rules) {
        // Check balance conditions
        if (rule.field.includes('balance')) {
          if (state.cash < Number(rule.value)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private executeActions(
    definition: StrategySpec,
    state: BacktestState,
    prices: Map<string, number>,
    config: BacktestConfig,
    timestamp: Date
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];

    for (const action of definition.actions) {
      if (action.type === 'swap') {
        const actionConfig = action.config as {
          fromToken: string;
          toToken: string;
          amount: { type: string; value: number };
          slippageTolerance: number;
        };

        const fromPrice = prices.get(actionConfig.fromToken) ?? 1;
        const toPrice = prices.get(actionConfig.toToken) ?? 1;

        // Calculate amount
        let amount: number;
        if (actionConfig.amount.type === 'percentage') {
          amount = state.cash * (actionConfig.amount.value / 100);
        } else if (actionConfig.amount.type === 'fixed') {
          amount = actionConfig.amount.value;
        } else {
          amount = state.cash * 0.1; // Default 10%
        }

        // Apply slippage
        const slippage = this.calculateSlippage(config.slippageModel, amount, fromPrice);
        const effectivePrice = toPrice * (1 + slippage);

        // Calculate fees
        const fees = this.calculateFees(config.feeModel, amount);

        // Execute trade
        const netAmount = amount - fees;
        const tokensReceived = netAmount / effectivePrice;

        if (amount <= state.cash) {
          state.cash -= amount;

          // Add or update position
          const existing = state.positions.get(actionConfig.toToken);
          if (existing) {
            const totalAmount = existing.amount + tokensReceived;
            const avgPrice = (existing.entryPrice * existing.amount + effectivePrice * tokensReceived) / totalAmount;
            existing.amount = totalAmount;
            existing.entryPrice = avgPrice;
          } else {
            state.positions.set(actionConfig.toToken, {
              token: actionConfig.toToken,
              amount: tokensReceived,
              entryPrice: effectivePrice,
              currentPrice: toPrice,
              unrealizedPnl: 0,
              entryTime: timestamp,
            });
          }

          trades.push({
            id: `trade_${timestamp.getTime()}`,
            timestamp,
            type: 'buy',
            token: actionConfig.toToken,
            amount: tokensReceived,
            price: effectivePrice,
            value: amount,
            fees,
            slippage,
          });
        }
      }
    }

    return trades;
  }

  private checkRiskControls(
    definition: StrategySpec,
    state: BacktestState,
    _prices: Map<string, number>
  ): void {
    for (const control of definition.riskControls) {
      if (!control.enabled) continue;

      if (control.type === 'stop_loss') {
        const config = control.config as { percentage: number; token?: string };

        for (const [token, position] of state.positions) {
          if (config.token && config.token !== token) continue;

          const loss = (position.entryPrice - position.currentPrice) / position.entryPrice;
          if (loss >= config.percentage / 100) {
            // Trigger stop loss - close position
            const value = position.amount * position.currentPrice;
            state.cash += value;
            state.realizedPnl += position.unrealizedPnl;
            state.positions.delete(token);
          }
        }
      }

      if (control.type === 'take_profit') {
        const config = control.config as { percentage: number; token?: string; sellPercentage?: number };

        for (const [token, position] of state.positions) {
          if (config.token && config.token !== token) continue;

          const gain = (position.currentPrice - position.entryPrice) / position.entryPrice;
          if (gain >= config.percentage / 100) {
            const sellPercent = (config.sellPercentage ?? 100) / 100;
            const sellAmount = position.amount * sellPercent;
            const value = sellAmount * position.currentPrice;
            const pnl = (position.currentPrice - position.entryPrice) * sellAmount;

            state.cash += value;
            state.realizedPnl += pnl;
            position.amount -= sellAmount;

            if (position.amount <= 0) {
              state.positions.delete(token);
            }
          }
        }
      }
    }
  }

  private calculateSlippage(model: SlippageModel, amount: number, _price: number): number {
    if (model.type === 'fixed') {
      return model.baseSlippage / 100;
    }

    if (model.type === 'volume_based') {
      // Higher amounts = higher slippage
      const volumeImpact = (model.volumeImpactFactor ?? 0.001) * Math.log10(amount);
      return (model.baseSlippage / 100) + volumeImpact;
    }

    return model.baseSlippage / 100;
  }

  private calculateFees(model: FeeModel, amount: number): number {
    return amount * (model.tradingFee / 100) + model.gasCost;
  }

  private calculateEquity(state: BacktestState, prices: Map<string, number>): number {
    let positionsValue = 0;

    for (const [token, position] of state.positions) {
      const price = prices.get(token) ?? position.currentPrice;
      positionsValue += position.amount * price;
    }

    return state.cash + positionsValue;
  }

  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'greater_or_equal':
        return actual >= expected;
      case 'less_or_equal':
        return actual <= expected;
      case 'equals':
        return Math.abs(actual - expected) < 0.0001;
      case 'crosses_above':
      case 'crosses_below':
        // Would need previous value tracking
        return false;
      default:
        return false;
    }
  }

  private calculatePerformance(
    strategyId: string,
    config: BacktestConfig,
    equityCurve: EquityPoint[],
    trades: SimulatedTrade[]
  ): StrategyPerformance {
    if (equityCurve.length === 0) {
      return this.createEmptyPerformance(strategyId, config);
    }

    const initialEquity = config.initialCapital;
    const finalEquity = equityCurve[equityCurve.length - 1].equity;

    // Returns calculation
    const totalReturn = ((finalEquity - initialEquity) / initialEquity) * 100;
    const days = (config.period.end.getTime() - config.period.start.getTime()) / (24 * 60 * 60 * 1000);
    const annualizedReturn = ((Math.pow(finalEquity / initialEquity, 365 / days) - 1) * 100);

    // Daily returns for volatility
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      dailyReturns.push(dailyReturn);
    }

    // Volatility
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

    // Sharpe ratio (assuming 5% risk-free rate)
    const riskFreeRate = 0.05;
    const excessReturn = annualizedReturn / 100 - riskFreeRate;
    const sharpeRatio = volatility > 0 ? excessReturn / (volatility / 100) : 0;

    // Sortino ratio (downside deviation only)
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
    const sortinoRatio = downsideDeviation > 0 ? excessReturn / downsideDeviation : sharpeRatio;

    // Max drawdown
    const maxDrawdown = Math.max(...equityCurve.map(e => e.drawdown)) * 100;

    // Calmar ratio
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn;

    // Trade statistics
    const winningTrades = trades.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl ?? 0) <= 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losingTrades.length)
      : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin;

    // VaR and CVaR
    const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var95 = sortedReturns[var95Index] ?? 0;
    const cvar95 = var95Index > 0
      ? sortedReturns.slice(0, var95Index).reduce((a, b) => a + b, 0) / var95Index
      : var95;

    return {
      strategyId,
      period: {
        start: config.period.start,
        end: config.period.end,
        type: 'all_time',
      },
      metrics: {
        totalReturn,
        annualizedReturn,
        absoluteProfit: finalEquity - initialEquity,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        maxDrawdown,
        currentDrawdown: equityCurve[equityCurve.length - 1].drawdown * 100,
      },
      trades: {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        averageWin: avgWin,
        averageLoss: avgLoss,
        profitFactor,
        expectancy: winRate / 100 * avgWin - (1 - winRate / 100) * avgLoss,
        averageHoldingTime: 0, // Would need position tracking
        avgSlippage: trades.length > 0
          ? trades.reduce((sum, t) => sum + t.slippage, 0) / trades.length
          : 0,
        totalFees: trades.reduce((sum, t) => sum + t.fees, 0),
      },
      riskMetrics: {
        volatility,
        var95: var95 * 100,
        cvar95: cvar95 * 100,
        beta: 1, // Would need benchmark comparison
        correlation: 0,
        informationRatio: sharpeRatio, // Simplified
      },
      comparison: {
        vsTon: 0, // Would need TON price data
        vsBtc: 0,
        vsHodl: totalReturn,
        vsBenchmark: 0,
        benchmarkName: 'TON HODL',
      },
      lastUpdated: new Date(),
    };
  }

  private runMonteCarlo(
    trades: SimulatedTrade[],
    config: { simulations: number; confidenceLevel: number }
  ): MonteCarloResult {
    const returns = trades.map(t => (t.pnl ?? 0) / t.value);
    const distribution: number[] = [];

    for (let i = 0; i < config.simulations; i++) {
      let portfolioReturn = 0;

      // Randomly sample from historical returns
      for (let j = 0; j < returns.length; j++) {
        const randomIndex = Math.floor(Math.random() * returns.length);
        portfolioReturn += returns[randomIndex] ?? 0;
      }

      distribution.push(portfolioReturn);
    }

    distribution.sort((a, b) => a - b);

    const varIndex = Math.floor(distribution.length * (1 - config.confidenceLevel));
    const cvarIndex = Math.floor(distribution.length * (1 - config.confidenceLevel));

    return {
      simulations: config.simulations,
      expectedReturn: distribution.reduce((a, b) => a + b, 0) / distribution.length * 100,
      var95: distribution[varIndex] ?? 0,
      cvar95: distribution.slice(0, cvarIndex).reduce((a, b) => a + b, 0) / cvarIndex,
      worstCase: distribution[0] ?? 0,
      bestCase: distribution[distribution.length - 1] ?? 0,
      distribution: distribution.map(d => d * 100),
    };
  }

  private createEmptyPerformance(strategyId: string, config: BacktestConfig): StrategyPerformance {
    return {
      strategyId,
      period: {
        start: config.period.start,
        end: config.period.end,
        type: 'all_time',
      },
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
      comparison: {
        vsTon: 0,
        vsBtc: 0,
        vsHodl: 0,
        vsBenchmark: 0,
        benchmarkName: '',
      },
      lastUpdated: new Date(),
    };
  }

  private generateId(): string {
    return `bt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
// Factory Functions
// ============================================================================

export function createBacktestingEngine(
  dataProvider?: HistoricalDataProvider
): BacktestingEngine {
  return new BacktestingEngine(dataProvider);
}
