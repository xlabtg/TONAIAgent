/**
 * TONAIAgent - Performance Analysis Module
 *
 * Calculates comprehensive performance metrics from backtest results:
 *   - Total return, annualized return
 *   - Sharpe ratio, Sortino ratio, Calmar ratio
 *   - Maximum drawdown and drawdown duration
 *   - Win/loss statistics and profit factor
 *   - Value at Risk (VaR) and Conditional VaR
 *   - Monthly returns breakdown
 *   - Equity curve and drawdown curve generation
 */

import {
  BenchmarkComparison,
  DrawdownPoint,
  EquityCurvePoint,
  MonthlyReturn,
  MonteCarloAnalysis,
  PerformanceReport,
  PerformanceSummary,
  ReturnMetrics,
  RiskMetrics,
  SimulatedOrder,
  TradeMetrics,
} from './types';

// ============================================================================
// Performance Calculator
// ============================================================================

export class PerformanceCalculator {
  private readonly riskFreeRate: number;

  constructor(riskFreeRateAnnual: number = 0.05) {
    this.riskFreeRate = riskFreeRateAnnual;
  }

  /**
   * Build a complete performance report from equity curve and trade history
   */
  buildReport(
    backtestId: string,
    strategyName: string,
    initialCapital: number,
    equityCurve: EquityCurvePoint[],
    orders: SimulatedOrder[],
    benchmarkReturns?: number[]
  ): PerformanceReport {
    if (equityCurve.length === 0) {
      return this.buildEmptyReport(backtestId, strategyName, initialCapital);
    }

    const startDate = equityCurve[0].timestamp;
    const endDate = equityCurve[equityCurve.length - 1].timestamp;
    const durationDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);

    const finalEquity = equityCurve[equityCurve.length - 1].equity;
    const periodicReturns = this.calculatePeriodicReturns(equityCurve);
    const drawdownCurve = this.calculateDrawdownCurve(equityCurve);
    const monthlyReturns = this.calculateMonthlyReturns(equityCurve);

    const summary = this.calculateSummary(initialCapital, finalEquity, periodicReturns, durationDays);
    const returns = this.calculateReturnMetrics(periodicReturns, monthlyReturns, durationDays);
    const risk = this.calculateRiskMetrics(equityCurve, periodicReturns, drawdownCurve);
    const trades = this.calculateTradeMetrics(orders);

    const benchmark = benchmarkReturns
      ? this.calculateBenchmarkComparison(summary.totalReturn, benchmarkReturns)
      : undefined;

    return {
      backtestId,
      strategyName,
      period: { start: startDate, end: endDate, durationDays },
      summary,
      returns,
      risk,
      trades,
      equityCurve,
      drawdownCurve,
      monthlyReturns,
      benchmark,
    };
  }

  /**
   * Run Monte Carlo simulation on the trade returns
   */
  runMonteCarlo(
    orders: SimulatedOrder[],
    simulations: number = 1000,
    confidenceLevel: number = 0.95
  ): MonteCarloAnalysis {
    // Calculate return per trade
    const tradeReturns = orders
      .filter((o) => o.status === 'filled' || o.status === 'partially_filled')
      .map((o) => {
        const grossReturn = o.side === 'sell' ? o.filledAmount * o.executedPrice : 0;
        const cost = o.side === 'buy' ? o.filledAmount * o.executedPrice + o.fees : 0;
        return grossReturn > 0 ? (grossReturn - o.fees - cost) / Math.max(cost, 1) : 0;
      })
      .filter((r) => isFinite(r));

    if (tradeReturns.length < 2) {
      return {
        simulations,
        confidenceLevel,
        expectedReturn: 0,
        var95: 0,
        cvar95: 0,
        worstCase: 0,
        bestCase: 0,
        probabilityOfProfit: 50,
        returnDistribution: [],
      };
    }

    // Bootstrap sampling
    const portfolioReturns: number[] = [];
    for (let i = 0; i < simulations; i++) {
      let portfolioReturn = 1;
      for (let j = 0; j < tradeReturns.length; j++) {
        const idx = Math.floor(Math.random() * tradeReturns.length);
        portfolioReturn *= 1 + (tradeReturns[idx] ?? 0);
      }
      portfolioReturns.push((portfolioReturn - 1) * 100);
    }

    portfolioReturns.sort((a, b) => a - b);

    const varIdx = Math.floor(portfolioReturns.length * (1 - confidenceLevel));
    const cvarValues = portfolioReturns.slice(0, Math.max(varIdx, 1));
    const probabilityOfProfit =
      (portfolioReturns.filter((r) => r > 0).length / portfolioReturns.length) * 100;

    return {
      simulations,
      confidenceLevel,
      expectedReturn:
        portfolioReturns.reduce((a, b) => a + b, 0) / portfolioReturns.length,
      var95: portfolioReturns[varIdx] ?? 0,
      cvar95: cvarValues.reduce((a, b) => a + b, 0) / Math.max(cvarValues.length, 1),
      worstCase: portfolioReturns[0] ?? 0,
      bestCase: portfolioReturns[portfolioReturns.length - 1] ?? 0,
      probabilityOfProfit,
      returnDistribution: portfolioReturns,
    };
  }

  // ============================================================================
  // Core Calculation Methods
  // ============================================================================

  private calculatePeriodicReturns(equityCurve: EquityCurvePoint[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    return returns;
  }

  private calculateDrawdownCurve(equityCurve: EquityCurvePoint[]): DrawdownPoint[] {
    const drawdownCurve: DrawdownPoint[] = [];
    let peakEquity = equityCurve[0]?.equity ?? 0;
    let peakIndex = 0;

    for (let i = 0; i < equityCurve.length; i++) {
      const point = equityCurve[i];
      if (point.equity > peakEquity) {
        peakEquity = point.equity;
        peakIndex = i;
      }

      const drawdown = peakEquity > 0
        ? ((peakEquity - point.equity) / peakEquity) * 100
        : 0;
      const durationDays =
        (point.timestamp.getTime() - equityCurve[peakIndex].timestamp.getTime()) /
        (24 * 60 * 60 * 1000);

      drawdownCurve.push({
        timestamp: point.timestamp,
        drawdown,
        drawdownDuration: durationDays,
      });
    }

    return drawdownCurve;
  }

  private calculateMonthlyReturns(equityCurve: EquityCurvePoint[]): MonthlyReturn[] {
    if (equityCurve.length === 0) return [];

    // Group equity points by year-month
    const monthlyData = new Map<string, { startEquity: number; endEquity: number; trades: number }>();

    for (const point of equityCurve) {
      const year = point.timestamp.getUTCFullYear();
      const month = point.timestamp.getUTCMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      const existing = monthlyData.get(key);
      if (!existing) {
        monthlyData.set(key, {
          startEquity: point.equity,
          endEquity: point.equity,
          trades: 0,
        });
      } else {
        existing.endEquity = point.equity;
      }
    }

    return Array.from(monthlyData.entries()).map(([key, data]) => {
      const [year, month] = key.split('-').map(Number);
      const returnPct =
        data.startEquity > 0
          ? ((data.endEquity - data.startEquity) / data.startEquity) * 100
          : 0;
      return {
        year: year ?? 0,
        month: month ?? 0,
        return: returnPct,
        trades: data.trades,
      };
    });
  }

  private calculateSummary(
    initialCapital: number,
    finalEquity: number,
    periodicReturns: number[],
    durationDays: number
  ): PerformanceSummary {
    const totalReturn = initialCapital > 0
      ? ((finalEquity - initialCapital) / initialCapital) * 100
      : 0;

    const annualizedReturn = durationDays > 0 && initialCapital > 0
      ? (Math.pow(finalEquity / initialCapital, 365 / durationDays) - 1) * 100
      : 0;

    return {
      capitalStart: initialCapital,
      capitalEnd: finalEquity,
      totalReturn,
      annualizedReturn,
      absoluteProfit: finalEquity - initialCapital,
    };
  }

  private calculateReturnMetrics(
    periodicReturns: number[],
    monthlyReturns: MonthlyReturn[],
    durationDays: number
  ): ReturnMetrics {
    if (periodicReturns.length === 0 || durationDays <= 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        monthlyReturnAvg: 0,
        bestMonth: 0,
        worstMonth: 0,
        positiveMonths: 0,
        negativeMonths: 0,
      };
    }

    const totalReturn = (periodicReturns.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100;
    const annualizedReturn = (Math.pow(1 + totalReturn / 100, 365 / durationDays) - 1) * 100;
    const monthlyReturnValues = monthlyReturns.map((m) => m.return);

    return {
      totalReturn,
      annualizedReturn,
      monthlyReturnAvg:
        monthlyReturnValues.length > 0
          ? monthlyReturnValues.reduce((a, b) => a + b, 0) / monthlyReturnValues.length
          : 0,
      bestMonth:
        monthlyReturnValues.length > 0 ? Math.max(...monthlyReturnValues) : 0,
      worstMonth:
        monthlyReturnValues.length > 0 ? Math.min(...monthlyReturnValues) : 0,
      positiveMonths: monthlyReturnValues.filter((r) => r > 0).length,
      negativeMonths: monthlyReturnValues.filter((r) => r < 0).length,
    };
  }

  private calculateRiskMetrics(
    equityCurve: EquityCurvePoint[],
    periodicReturns: number[],
    drawdownCurve: DrawdownPoint[]
  ): RiskMetrics {
    if (periodicReturns.length < 2) {
      return {
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        volatility: 0,
        downSideDeviation: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        var95: 0,
        cvar95: 0,
      };
    }

    // Annualized volatility
    const avgReturn = periodicReturns.reduce((a, b) => a + b, 0) / periodicReturns.length;
    const variance =
      periodicReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      (periodicReturns.length - 1);
    const periodsPerYear = this.estimatePeriodsPerYear(equityCurve);
    const volatility = Math.sqrt(variance) * Math.sqrt(periodsPerYear) * 100;

    // Downside deviation (for Sortino)
    const negativeReturns = periodicReturns.filter((r) => r < 0);
    const downsideVariance =
      negativeReturns.length > 0
        ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
        : 0;
    const downSideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(periodsPerYear) * 100;

    // Drawdown metrics
    const maxDrawdown = drawdownCurve.length > 0
      ? Math.max(...drawdownCurve.map((d) => d.drawdown))
      : 0;
    const maxDrawdownDuration = drawdownCurve.length > 0
      ? Math.max(...drawdownCurve.map((d) => d.drawdownDuration))
      : 0;
    const currentDrawdown = drawdownCurve.length > 0
      ? drawdownCurve[drawdownCurve.length - 1].drawdown
      : 0;

    // Annualized return for ratio calculations
    const totalReturn =
      (periodicReturns.reduce((acc, r) => acc * (1 + r), 1) - 1) * 100;
    const durationDays = equityCurve.length > 1
      ? (equityCurve[equityCurve.length - 1].timestamp.getTime() -
          equityCurve[0].timestamp.getTime()) /
        (24 * 60 * 60 * 1000)
      : 365;
    const annualizedReturn =
      durationDays > 0
        ? (Math.pow(1 + totalReturn / 100, 365 / durationDays) - 1) * 100
        : totalReturn;

    const excessReturn = annualizedReturn / 100 - this.riskFreeRate;

    const sharpeRatio =
      volatility > 0 ? excessReturn / (volatility / 100) : 0;
    const sortinoRatio =
      downSideDeviation > 0 ? excessReturn / (downSideDeviation / 100) : sharpeRatio;
    const calmarRatio =
      maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn;

    // VaR and CVaR at 95%
    const sortedReturns = [...periodicReturns].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var95 = (sortedReturns[var95Index] ?? 0) * 100;
    const cvar95Values = sortedReturns.slice(0, Math.max(var95Index, 1));
    const cvar95 =
      cvar95Values.length > 0
        ? (cvar95Values.reduce((a, b) => a + b, 0) / cvar95Values.length) * 100
        : var95;

    return {
      maxDrawdown,
      maxDrawdownDuration,
      currentDrawdown,
      volatility,
      downSideDeviation,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      var95,
      cvar95,
    };
  }

  private calculateTradeMetrics(orders: SimulatedOrder[]): TradeMetrics {
    const filledOrders = orders.filter(
      (o) => o.status === 'filled' || o.status === 'partially_filled'
    );
    const sells = filledOrders.filter((o) => o.side === 'sell');

    // Calculate P&L per sell order (simplified: sell revenue minus cost basis estimation)
    const tradeResults = sells.map((order) => {
      const proceeds = order.filledAmount * order.executedPrice;
      // Approximate cost by assuming entry at a fair price (will be 0 for market orders without buy reference)
      return { pnl: proceeds - order.fees, value: proceeds };
    });

    const winningTrades = tradeResults.filter((t) => t.pnl > 0);
    const losingTrades = tradeResults.filter((t) => t.pnl <= 0);

    const totalFeesPaid = filledOrders.reduce((sum, o) => sum + o.fees, 0);
    const totalSlippage = filledOrders.reduce(
      (sum, o) => sum + o.slippage * o.filledAmount * o.executedPrice,
      0
    );
    const avgSlippage =
      filledOrders.length > 0
        ? filledOrders.reduce((sum, o) => sum + o.slippage, 0) / filledOrders.length
        : 0;

    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
        : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const winRate = sells.length > 0 ? (winningTrades.length / sells.length) * 100 : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;

    return {
      totalTrades: sells.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin: avgWin,
      averageLoss: avgLoss,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl)) : 0,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      expectancy,
      averageHoldingDays: 0, // Would need entry/exit timestamp matching
      totalFeesPaid,
      totalSlippage,
      avgSlippage: avgSlippage * 100, // Convert to percentage
    };
  }

  private calculateBenchmarkComparison(
    strategyReturn: number,
    benchmarkReturns: number[]
  ): BenchmarkComparison {
    const benchmarkReturn = benchmarkReturns.reduce((acc, r) => acc * (1 + r), 1);
    const benchmarkReturnPct = (benchmarkReturn - 1) * 100;
    const alpha = strategyReturn - benchmarkReturnPct;

    return {
      benchmarkName: 'Benchmark',
      benchmarkReturn: benchmarkReturnPct,
      strategyReturn,
      alpha,
    };
  }

  private estimatePeriodsPerYear(equityCurve: EquityCurvePoint[]): number {
    if (equityCurve.length < 2) return 252;

    const durationDays =
      (equityCurve[equityCurve.length - 1].timestamp.getTime() -
        equityCurve[0].timestamp.getTime()) /
      (24 * 60 * 60 * 1000);

    if (durationDays <= 0) return 252;

    const periodsPerDay = equityCurve.length / durationDays;
    return periodsPerDay * 365;
  }

  private buildEmptyReport(
    backtestId: string,
    strategyName: string,
    initialCapital: number
  ): PerformanceReport {
    const now = new Date();
    return {
      backtestId,
      strategyName,
      period: { start: now, end: now, durationDays: 0 },
      summary: {
        capitalStart: initialCapital,
        capitalEnd: initialCapital,
        totalReturn: 0,
        annualizedReturn: 0,
        absoluteProfit: 0,
      },
      returns: {
        totalReturn: 0,
        annualizedReturn: 0,
        monthlyReturnAvg: 0,
        bestMonth: 0,
        worstMonth: 0,
        positiveMonths: 0,
        negativeMonths: 0,
      },
      risk: {
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        volatility: 0,
        downSideDeviation: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        var95: 0,
        cvar95: 0,
      },
      trades: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        averageHoldingDays: 0,
        totalFeesPaid: 0,
        totalSlippage: 0,
        avgSlippage: 0,
      },
      equityCurve: [],
      drawdownCurve: [],
      monthlyReturns: [],
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPerformanceCalculator(
  riskFreeRate?: number
): PerformanceCalculator {
  return new PerformanceCalculator(riskFreeRate);
}
