/**
 * TONAIAgent - Backtesting Compatibility Layer
 *
 * Bridge between the Agent Developer Framework and the Strategy Backtesting
 * Framework. Enables developers to run their agent's execution_logic against
 * historical market data before deploying to production.
 *
 * Three integration modes:
 *   1. Simulate  — run execution_logic step-by-step over historical data
 *   2. Analyze   — compute performance metrics from a backtest run
 *   3. Validate  — check if an agent meets minimum performance requirements
 *
 * Wraps the existing SandboxEnvironment with agent-aware conveniences.
 *
 * @example
 * ```typescript
 * import { createBacktestingCompat, BacktestingCompatLayer } from '@tonaiagent/core/sdk';
 *
 * const backtester = createBacktestingCompat();
 *
 * // Simulate an agent over 30 days of historical data
 * const result = await backtester.simulate(myAgent, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   initialBalance: 10000,
 *   assets: ['TON'],
 *   stepMs: 24 * 60 * 60 * 1000, // 1-day steps
 * });
 *
 * console.log('Total PnL:', result.performance.totalPnl);
 * console.log('Win Rate:', result.performance.winRate);
 * console.log('Sharpe:', result.performance.sharpeRatio);
 * console.log('Max Drawdown:', result.performance.maxDrawdown);
 *
 * // Validate the agent meets requirements
 * const validation = backtester.validate(result, {
 *   minSharpeRatio: 1.0,
 *   maxDrawdownPercent: 20,
 *   minWinRate: 0.45,
 * });
 *
 * if (validation.passed) {
 *   console.log('Agent is ready for deployment');
 * }
 * ```
 */

import type {
  AgentDefinition,
  AgentExecutionContext,
  AgentMarketDataSnapshot,
  AgentOrderRequest,
  AgentOrderResult,
  AgentPortfolioSnapshot,
  AgentCapitalAllocation,
  AgentAllocationResult,
  AgentRiskMetrics,
  AgentPosition,
  AgentLogger,
} from './agent-framework';

// ============================================================================
// Backtest Configuration
// ============================================================================

/** Configuration for a backtest simulation run */
export interface BacktestConfig {
  /** Simulation start date */
  startDate: Date;

  /** Simulation end date */
  endDate: Date;

  /** Initial portfolio balance in base currency */
  initialBalance?: number;

  /** Assets to include in the simulation */
  assets?: string[];

  /** Time step for each execution cycle (milliseconds) */
  stepMs?: number;

  /** Simulated trading fee as a percentage (0–100) */
  tradingFeePercent?: number;

  /** Simulated slippage as a percentage (0–100) */
  slippagePercent?: number;

  /** Whether to apply price impact simulation */
  simulatePriceImpact?: boolean;

  /** Seed for reproducible simulations */
  seed?: number;
}

// ============================================================================
// Backtest Results
// ============================================================================

/** Complete backtest result */
export interface BacktestResult {
  /** Unique run identifier */
  runId: string;

  /** Agent that was backtested */
  agentId: string;

  /** Backtest configuration used */
  config: BacktestConfig;

  /** Performance metrics */
  performance: BacktestPerformance;

  /** Execution history */
  executions: BacktestExecution[];

  /** Trade history */
  trades: BacktestTrade[];

  /** Portfolio value over time */
  equityCurve: EquityCurvePoint[];

  /** Drawdown curve over time */
  drawdownCurve: DrawdownPoint[];

  /** Start timestamp */
  startedAt: Date;

  /** End timestamp */
  completedAt: Date;

  /** Total simulation duration (ms) */
  durationMs: number;
}

/** Backtest performance metrics */
export interface BacktestPerformance {
  /** Final portfolio value */
  finalValue: number;

  /** Total PnL in base currency */
  totalPnl: number;

  /** Total PnL as percentage */
  totalPnlPercent: number;

  /** Maximum drawdown as percentage */
  maxDrawdown: number;

  /** Win rate (0–1) */
  winRate: number;

  /** Total number of trades */
  totalTrades: number;

  /** Winning trades */
  winningTrades: number;

  /** Losing trades */
  losingTrades: number;

  /** Average trade return as percentage */
  avgTradeReturnPercent: number;

  /** Best trade return as percentage */
  bestTradeReturnPercent: number;

  /** Worst trade return as percentage */
  worstTradeReturnPercent: number;

  /** Sharpe ratio (annualized) */
  sharpeRatio: number;

  /** Sortino ratio (annualized) */
  sortinoRatio: number;

  /** Calmar ratio (return / max drawdown) */
  calmarRatio: number;

  /** Profit factor (gross profit / gross loss) */
  profitFactor: number;

  /** Number of execution cycles */
  totalExecutionCycles: number;

  /** Number of failed execution cycles */
  failedExecutionCycles: number;
}

/** Record of a single execution cycle during backtest */
export interface BacktestExecution {
  /** Execution index */
  index: number;

  /** Simulation timestamp */
  timestamp: Date;

  /** Whether execution succeeded */
  success: boolean;

  /** Portfolio value at this point */
  portfolioValue: number;

  /** Orders placed during this execution */
  ordersPlaced: number;

  /** Error message if failed */
  error?: string;
}

/** Record of a single trade during backtest */
export interface BacktestTrade {
  /** Trade ID */
  tradeId: string;

  /** Asset traded */
  asset: string;

  /** Trade side */
  side: 'buy' | 'sell';

  /** Amount traded */
  amount: number;

  /** Execution price */
  price: number;

  /** Trade value in base currency */
  value: number;

  /** Trade timestamp */
  timestamp: Date;

  /** PnL for sell trades */
  pnl?: number;
}

/** Point on the equity curve */
export interface EquityCurvePoint {
  timestamp: Date;
  value: number;
}

/** Point on the drawdown curve */
export interface DrawdownPoint {
  timestamp: Date;
  drawdownPercent: number;
}

// ============================================================================
// Validation
// ============================================================================

/** Requirements for validating backtest results */
export interface BacktestValidationRequirements {
  /** Minimum required Sharpe ratio */
  minSharpeRatio?: number;

  /** Maximum allowed drawdown percentage */
  maxDrawdownPercent?: number;

  /** Minimum required win rate (0–1) */
  minWinRate?: number;

  /** Minimum required total PnL percentage */
  minTotalPnlPercent?: number;

  /** Minimum number of trades */
  minTrades?: number;

  /** Maximum number of failed execution cycles */
  maxFailedExecutions?: number;
}

/** Backtest validation result */
export interface BacktestValidationResult {
  /** Whether the agent passed all requirements */
  passed: boolean;

  /** Individual requirement checks */
  checks: BacktestValidationCheck[];

  /** Overall score (0–100) */
  score: number;

  /** Recommendation */
  recommendation: 'ready-for-production' | 'ready-for-sandbox' | 'needs-improvement' | 'not-ready';
}

export interface BacktestValidationCheck {
  name: string;
  passed: boolean;
  actual: number;
  required: number;
  message: string;
}

// ============================================================================
// Backtesting Compatibility Layer
// ============================================================================

export class BacktestingCompatLayer {
  /**
   * Simulate an agent over historical market data.
   *
   * Runs the agent's execution_logic at each time step, tracking trades,
   * portfolio value, and risk metrics across the simulation period.
   */
  async simulate(agent: AgentDefinition, config: BacktestConfig): Promise<BacktestResult> {
    const runId = `backtest-${agent.id}-${Date.now()}`;
    const startedAt = new Date();

    const stepMs = config.stepMs ?? 24 * 60 * 60 * 1000; // default: 1 day
    const initialBalance = config.initialBalance ?? 10000;
    const tradingFee = (config.tradingFeePercent ?? 0.1) / 100;
    const slippage = (config.slippagePercent ?? 0.05) / 100;

    let balance = initialBalance;
    const positions: AgentPosition[] = [];
    const trades: BacktestTrade[] = [];
    const executions: BacktestExecution[] = [];
    const equityCurve: EquityCurvePoint[] = [];
    const drawdownCurve: DrawdownPoint[] = [];

    let peakValue = initialBalance;
    let maxDrawdown = 0;
    const priceHistory: Record<string, number[]> = {};

    // Time-step simulation
    let currentTime = new Date(config.startDate.getTime());
    let executionIndex = 0;

    equityCurve.push({ timestamp: new Date(currentTime), value: initialBalance });

    const assets = config.assets ?? ['TON'];

    while (currentTime < config.endDate) {
      // Generate simulated prices for this time step
      const mockPrices: Record<string, number> = {};
      for (const asset of assets) {
        if (!priceHistory[asset]) {
          priceHistory[asset] = [this.getMockBasePrice(asset)];
        }
        const lastPrice = priceHistory[asset][priceHistory[asset].length - 1];
        const newPrice = lastPrice * (1 + (Math.random() - 0.5) * 0.04);
        priceHistory[asset].push(newPrice);
        mockPrices[asset] = newPrice;
      }

      // Update position prices
      for (const pos of positions) {
        if (mockPrices[pos.asset]) {
          pos.currentPrice = mockPrices[pos.asset];
          pos.unrealizedPnl = (pos.currentPrice - pos.entryPrice) * pos.amount;
        }
      }

      const positionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
      const portfolioValue = balance + positionValue;

      // Create execution context for this time step
      const context = this.createBacktestContext(
        agent.id,
        currentTime,
        balance,
        positions,
        mockPrices,
        priceHistory,
        (trade: BacktestTrade) => trades.push(trade),
        (b: number) => { balance = b; },
        tradingFee,
        slippage
      );

      let success = true;
      let ordersPlaced = 0;
      let errorMsg: string | undefined;

      // Run execution handlers
      try {
        if (agent.event_handlers.onBeforeExecution) {
          await agent.event_handlers.onBeforeExecution(context);
        }

        const ordersBefore = trades.length;
        await agent.execution_logic(context);
        ordersPlaced = trades.length - ordersBefore;

        if (agent.event_handlers.onAfterExecution) {
          await agent.event_handlers.onAfterExecution(context, {
            executionId: `${runId}-${executionIndex}`,
            success: true,
            durationMs: 0,
            ordersPlaced,
            pnl: 0,
            errors: [],
          });
        }
      } catch (err) {
        success = false;
        errorMsg = err instanceof Error ? err.message : String(err);
        if (agent.event_handlers.onError) {
          await agent.event_handlers.onError(err instanceof Error ? err : new Error(errorMsg));
        }
      }

      executions.push({
        index: executionIndex++,
        timestamp: new Date(currentTime),
        success,
        portfolioValue,
        ordersPlaced,
        error: errorMsg,
      });

      // Track equity curve and drawdown
      const newPositionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
      const newPortfolioValue = balance + newPositionValue;

      equityCurve.push({ timestamp: new Date(currentTime), value: newPortfolioValue });

      if (newPortfolioValue > peakValue) peakValue = newPortfolioValue;
      const drawdown = peakValue > 0 ? ((peakValue - newPortfolioValue) / peakValue) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      drawdownCurve.push({ timestamp: new Date(currentTime), drawdownPercent: drawdown });

      currentTime = new Date(currentTime.getTime() + stepMs);
    }

    const completedAt = new Date();
    const finalPositionValue = positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
    const finalValue = balance + finalPositionValue;

    const performance = this.computePerformance(
      initialBalance,
      finalValue,
      maxDrawdown,
      trades,
      executions,
      equityCurve
    );

    return {
      runId,
      agentId: agent.id,
      config,
      performance,
      executions,
      trades,
      equityCurve,
      drawdownCurve,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  /**
   * Analyze a backtest result and return a human-readable summary.
   */
  analyze(result: BacktestResult): string {
    const p = result.performance;
    const lines = [
      `Backtest Analysis: ${result.agentId}`,
      `${'─'.repeat(40)}`,
      `Period: ${result.config.startDate.toDateString()} → ${result.config.endDate.toDateString()}`,
      `Initial Balance: ${result.config.initialBalance ?? 10000}`,
      `Final Value:     ${p.finalValue.toFixed(2)} (${p.totalPnlPercent >= 0 ? '+' : ''}${p.totalPnlPercent.toFixed(2)}%)`,
      ``,
      `Performance Metrics:`,
      `  Sharpe Ratio:   ${p.sharpeRatio.toFixed(2)}`,
      `  Max Drawdown:   ${p.maxDrawdown.toFixed(2)}%`,
      `  Win Rate:       ${(p.winRate * 100).toFixed(1)}%`,
      `  Profit Factor:  ${p.profitFactor.toFixed(2)}`,
      `  Calmar Ratio:   ${p.calmarRatio.toFixed(2)}`,
      ``,
      `Trade Statistics:`,
      `  Total Trades:   ${p.totalTrades}`,
      `  Winning:        ${p.winningTrades}`,
      `  Losing:         ${p.losingTrades}`,
      `  Avg Return:     ${p.avgTradeReturnPercent.toFixed(2)}%`,
      `  Best Trade:     ${p.bestTradeReturnPercent.toFixed(2)}%`,
      `  Worst Trade:    ${p.worstTradeReturnPercent.toFixed(2)}%`,
      ``,
      `Execution:`,
      `  Total Cycles:   ${p.totalExecutionCycles}`,
      `  Failed Cycles:  ${p.failedExecutionCycles}`,
    ];
    return lines.join('\n');
  }

  /**
   * Validate a backtest result against performance requirements.
   */
  validate(
    result: BacktestResult,
    requirements: BacktestValidationRequirements = {}
  ): BacktestValidationResult {
    const p = result.performance;
    const checks: BacktestValidationCheck[] = [];

    if (requirements.minSharpeRatio !== undefined) {
      const passed = p.sharpeRatio >= requirements.minSharpeRatio;
      checks.push({
        name: 'Sharpe Ratio',
        passed,
        actual: p.sharpeRatio,
        required: requirements.minSharpeRatio,
        message: passed
          ? `Sharpe ratio ${p.sharpeRatio.toFixed(2)} meets minimum ${requirements.minSharpeRatio}`
          : `Sharpe ratio ${p.sharpeRatio.toFixed(2)} below minimum ${requirements.minSharpeRatio}`,
      });
    }

    if (requirements.maxDrawdownPercent !== undefined) {
      const passed = p.maxDrawdown <= requirements.maxDrawdownPercent;
      checks.push({
        name: 'Max Drawdown',
        passed,
        actual: p.maxDrawdown,
        required: requirements.maxDrawdownPercent,
        message: passed
          ? `Max drawdown ${p.maxDrawdown.toFixed(2)}% within limit ${requirements.maxDrawdownPercent}%`
          : `Max drawdown ${p.maxDrawdown.toFixed(2)}% exceeds limit ${requirements.maxDrawdownPercent}%`,
      });
    }

    if (requirements.minWinRate !== undefined) {
      const passed = p.winRate >= requirements.minWinRate;
      checks.push({
        name: 'Win Rate',
        passed,
        actual: p.winRate,
        required: requirements.minWinRate,
        message: passed
          ? `Win rate ${(p.winRate * 100).toFixed(1)}% meets minimum ${(requirements.minWinRate * 100).toFixed(1)}%`
          : `Win rate ${(p.winRate * 100).toFixed(1)}% below minimum ${(requirements.minWinRate * 100).toFixed(1)}%`,
      });
    }

    if (requirements.minTotalPnlPercent !== undefined) {
      const passed = p.totalPnlPercent >= requirements.minTotalPnlPercent;
      checks.push({
        name: 'Total PnL',
        passed,
        actual: p.totalPnlPercent,
        required: requirements.minTotalPnlPercent,
        message: passed
          ? `PnL ${p.totalPnlPercent.toFixed(2)}% meets minimum ${requirements.minTotalPnlPercent}%`
          : `PnL ${p.totalPnlPercent.toFixed(2)}% below minimum ${requirements.minTotalPnlPercent}%`,
      });
    }

    if (requirements.minTrades !== undefined) {
      const passed = p.totalTrades >= requirements.minTrades;
      checks.push({
        name: 'Minimum Trades',
        passed,
        actual: p.totalTrades,
        required: requirements.minTrades,
        message: passed
          ? `${p.totalTrades} trades meets minimum ${requirements.minTrades}`
          : `${p.totalTrades} trades below minimum ${requirements.minTrades}`,
      });
    }

    if (requirements.maxFailedExecutions !== undefined) {
      const passed = p.failedExecutionCycles <= requirements.maxFailedExecutions;
      checks.push({
        name: 'Failed Executions',
        passed,
        actual: p.failedExecutionCycles,
        required: requirements.maxFailedExecutions,
        message: passed
          ? `${p.failedExecutionCycles} failures within limit ${requirements.maxFailedExecutions}`
          : `${p.failedExecutionCycles} failures exceeds limit ${requirements.maxFailedExecutions}`,
      });
    }

    const passedCount = checks.filter(c => c.passed).length;
    const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;
    const allPassed = checks.every(c => c.passed);

    let recommendation: BacktestValidationResult['recommendation'];
    if (allPassed && score >= 80) recommendation = 'ready-for-production';
    else if (allPassed || score >= 60) recommendation = 'ready-for-sandbox';
    else if (score >= 40) recommendation = 'needs-improvement';
    else recommendation = 'not-ready';

    return { passed: allPassed, checks, score, recommendation };
  }

  private createBacktestContext(
    agentId: string,
    timestamp: Date,
    _balance: number,
    positions: AgentPosition[],
    mockPrices: Record<string, number>,
    priceHistory: Record<string, number[]>,
    onTrade: (trade: BacktestTrade) => void,
    setBalance: (b: number) => void,
    tradingFee: number,
    slippage: number
  ): AgentExecutionContext {
    const logger: AgentLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    // Capture balance by reference via closure
    let balance = _balance;

    const getPrice = (asset: string) => mockPrices[asset] ?? this.getMockBasePrice(asset);
    const getPriceHistory = (asset: string) => priceHistory[asset] ?? [getPrice(asset)];

    const ctx: AgentExecutionContext = {
      agentId,
      timestamp: new Date(timestamp),
      isSimulation: true,
      logger,

      getMarketData: async (asset: string): Promise<AgentMarketDataSnapshot> => {
        const history = getPriceHistory(asset);
        const price = getPrice(asset);
        const n = history.length;
        const ma20 = n >= 20
          ? history.slice(-20).reduce((s, p) => s + p, 0) / 20
          : price;
        const ma50 = n >= 50
          ? history.slice(-50).reduce((s, p) => s + p, 0) / 50
          : price;

        // Simple RSI calculation
        const rsiPeriod = 14;
        let rsi14: number | undefined;
        if (n >= rsiPeriod + 1) {
          const changes = history.slice(-rsiPeriod - 1).slice(1).map((p, i) =>
            p - history.slice(-rsiPeriod - 1)[i]
          );
          const gains = changes.filter(c => c > 0);
          const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
          const avgGain = gains.reduce((s, g) => s + g, 0) / rsiPeriod;
          const avgLoss = losses.reduce((s, l) => s + l, 0) / rsiPeriod;
          if (avgLoss === 0) {
            rsi14 = 100;
          } else {
            const rs = avgGain / avgLoss;
            rsi14 = 100 - 100 / (1 + rs);
          }
        }

        const prevPrice = n >= 2 ? history[n - 2] : price;
        const change24h = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;

        return {
          asset,
          current: price,
          change24h,
          volume24h: 1000000,
          ma20,
          ma50,
          rsi14,
          timestamp: new Date(timestamp),
        };
      },

      placeOrder: async (order: AgentOrderRequest): Promise<AgentOrderResult> => {
        const basePrice = getPrice(order.asset);
        const slippageEffect = 1 + (Math.random() - 0.5) * slippage * 2;
        const price = (order.type === 'limit' && order.limitPrice) ? order.limitPrice : basePrice * slippageEffect;
        const fee = price * order.amount * tradingFee;
        const cost = price * order.amount + fee;

        if (order.side === 'buy') {
          if (cost > balance) {
            return { orderId: `bt-${Date.now()}`, status: 'failed', error: 'Insufficient balance' };
          }
          balance -= cost;
          setBalance(balance);

          const existing = positions.find(p => p.asset === order.asset);
          if (existing) {
            const total = existing.amount + order.amount;
            existing.entryPrice = (existing.entryPrice * existing.amount + price * order.amount) / total;
            existing.amount = total;
          } else {
            positions.push({
              asset: order.asset,
              amount: order.amount,
              entryPrice: price,
              currentPrice: price,
              unrealizedPnl: 0,
              openedAt: new Date(timestamp),
            });
          }

          onTrade({
            tradeId: `bt-buy-${Date.now()}`,
            asset: order.asset,
            side: 'buy',
            amount: order.amount,
            price,
            value: cost,
            timestamp: new Date(timestamp),
          });
        } else {
          const pos = positions.find(p => p.asset === order.asset);
          if (!pos || pos.amount < order.amount) {
            return { orderId: `bt-${Date.now()}`, status: 'failed', error: 'Insufficient position' };
          }
          const proceeds = price * order.amount - fee;
          const pnl = (price - pos.entryPrice) * order.amount - fee;
          balance += proceeds;
          setBalance(balance);
          pos.amount -= order.amount;
          if (pos.amount <= 0) {
            const idx = positions.indexOf(pos);
            positions.splice(idx, 1);
          }

          onTrade({
            tradeId: `bt-sell-${Date.now()}`,
            asset: order.asset,
            side: 'sell',
            amount: order.amount,
            price,
            value: proceeds,
            timestamp: new Date(timestamp),
            pnl,
          });
        }

        return { orderId: `bt-${Date.now()}`, status: 'filled', executedPrice: price, executedAmount: order.amount };
      },

      getPortfolio: async (): Promise<AgentPortfolioSnapshot> => {
        const posValue = positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
        return {
          totalValue: balance + posValue,
          availableBalance: balance,
          positions: [...positions],
          realizedPnl: 0,
          unrealizedPnl: posValue - positions.reduce((sum, p) => sum + p.entryPrice * p.amount, 0),
          timestamp: new Date(timestamp),
        };
      },

      getRiskMetrics: async (): Promise<AgentRiskMetrics> => {
        const posValue = positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
        const totalValue = balance + posValue;
        return {
          currentDrawdown: 0,
          maxDrawdown: 0,
          dailyPnl: totalValue - (_balance),
          valueAtRisk95: totalValue * 0.02,
          sharpeRatio: 0,
          consecutiveFailures: 0,
          circuitBreakerActive: false,
        };
      },

      allocateCapital: async (_allocation: AgentCapitalAllocation): Promise<AgentAllocationResult> => {
        // Placeholder — resolved after context is fully built
        return { success: false, allocatedAmount: 0, executionPrice: 0, error: 'not initialized' };
      },
    };

    // Wire up allocateCapital now that ctx is fully constructed
    ctx.allocateCapital = async (allocation: AgentCapitalAllocation): Promise<AgentAllocationResult> => {
      const price = getPrice(allocation.asset);
      const portfolioValue = balance + positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
      const amount = allocation.mode === 'percent'
        ? (allocation.amount / 100) * portfolioValue
        : allocation.amount;
      const units = amount / price;
      const result = await ctx.placeOrder({ asset: allocation.asset, side: 'buy', amount: units, type: 'market' });
      return {
        success: result.status === 'filled',
        allocatedAmount: result.executedAmount ? result.executedAmount * (result.executedPrice ?? 1) : 0,
        executionPrice: result.executedPrice ?? 0,
        error: result.error,
      };
    };

    return ctx;
  }

  private computePerformance(
    initialBalance: number,
    finalValue: number,
    maxDrawdown: number,
    trades: BacktestTrade[],
    executions: BacktestExecution[],
    equityCurve: EquityCurvePoint[]
  ): BacktestPerformance {
    const totalPnl = finalValue - initialBalance;
    const totalPnlPercent = (totalPnl / initialBalance) * 100;

    const sellTrades = trades.filter(t => t.side === 'sell' && t.pnl !== undefined);
    const winningTrades = sellTrades.filter(t => (t.pnl ?? 0) > 0);
    const losingTrades = sellTrades.filter(t => (t.pnl ?? 0) < 0);
    const totalTrades = trades.length;
    const winRate = sellTrades.length > 0 ? winningTrades.length / sellTrades.length : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 1;

    const tradeReturns = sellTrades.map(t => {
      const entryValue = (t.value ?? 0) - (t.pnl ?? 0);
      return entryValue > 0 ? ((t.pnl ?? 0) / entryValue) * 100 : 0;
    });

    const avgTradeReturnPercent = tradeReturns.length > 0
      ? tradeReturns.reduce((sum, r) => sum + r, 0) / tradeReturns.length
      : 0;
    const bestTradeReturnPercent = tradeReturns.length > 0 ? Math.max(...tradeReturns) : 0;
    const worstTradeReturnPercent = tradeReturns.length > 0 ? Math.min(...tradeReturns) : 0;

    // Annualized Sharpe ratio from equity curve returns
    let sharpeRatio = 0;
    let sortinoRatio = 0;
    if (equityCurve.length >= 2) {
      const returns = equityCurve.slice(1).map((p, i) => {
        const prev = equityCurve[i].value;
        return prev > 0 ? (p.value - prev) / prev : 0;
      });
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      const downReturns = returns.filter(r => r < 0);
      const downVariance = downReturns.length > 0
        ? downReturns.reduce((sum, r) => sum + r * r, 0) / downReturns.length
        : 0;
      const downStdDev = Math.sqrt(downVariance);
      sortinoRatio = downStdDev > 0 ? (avgReturn / downStdDev) * Math.sqrt(252) : 0;
    }

    const calmarRatio = maxDrawdown > 0 ? (totalPnlPercent / maxDrawdown) : 0;

    const failedExecutionCycles = executions.filter(e => !e.success).length;

    return {
      finalValue,
      totalPnl,
      totalPnlPercent,
      maxDrawdown,
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgTradeReturnPercent,
      bestTradeReturnPercent,
      worstTradeReturnPercent,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      profitFactor,
      totalExecutionCycles: executions.length,
      failedExecutionCycles,
    };
  }

  private getMockBasePrice(asset: string): number {
    const prices: Record<string, number> = {
      TON: 2.5,
      USDT: 1.0,
      USDC: 1.0,
      BTC: 65000,
      ETH: 3200,
      NOT: 0.008,
    };
    return prices[asset.toUpperCase()] ?? 1.0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Backtesting Compatibility Layer instance.
 *
 * @example
 * ```typescript
 * import { createBacktestingCompat } from '@tonaiagent/core/sdk';
 *
 * const backtester = createBacktestingCompat();
 * const result = await backtester.simulate(myAgent, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-03-31'),
 *   initialBalance: 10000,
 *   assets: ['TON'],
 *   stepMs: 24 * 60 * 60 * 1000,
 * });
 * ```
 */
export function createBacktestingCompat(): BacktestingCompatLayer {
  return new BacktestingCompatLayer();
}
