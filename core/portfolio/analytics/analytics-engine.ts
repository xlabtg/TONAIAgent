/**
 * TONAIAgent - Portfolio Analytics Engine
 *
 * Computes comprehensive performance metrics including equity curves,
 * daily/cumulative returns, risk-adjusted returns, drawdowns, and
 * benchmark comparisons for the Portfolio Analytics Dashboard.
 */

import {
  AnalyticsPeriod,
  PortfolioOverview,
  PerformanceVisualization,
  EquityCurvePoint,
  DailyReturn,
  CumulativeReturn,
  BenchmarkComparison,
  RiskMetrics,
  PortfolioAnalyticsConfig,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
  DashboardMetrics,
  ChartData,
  ChartType,
  ChartSeries,
} from './types';
import { DefaultPortfolioDataModel } from './data-model';

// ============================================================================
// Analytics Engine Interface
// ============================================================================

export interface AnalyticsEngine {
  // Performance computations
  computePerformanceVisualization(
    agentId: string,
    period: AnalyticsPeriod
  ): PerformanceVisualization;

  computeRiskMetrics(
    agentId: string,
    period: AnalyticsPeriod
  ): RiskMetrics;

  computeBenchmarkComparison(
    agentReturns: number[],
    benchmarkReturns: number[],
    benchmarkName: string
  ): BenchmarkComparison;

  // Chart data generation
  generateChartData(type: ChartType, agentId: string, period: AnalyticsPeriod): ChartData;

  // Dashboard metrics
  buildDashboardMetrics(agentId: string, period: AnalyticsPeriod): Promise<DashboardMetrics>;

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Default Analytics Engine Implementation
// ============================================================================

export class DefaultAnalyticsEngine implements AnalyticsEngine {
  private readonly config: PortfolioAnalyticsConfig;
  private readonly dataModel: DefaultPortfolioDataModel;
  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];

  constructor(
    config: PortfolioAnalyticsConfig,
    dataModel: DefaultPortfolioDataModel
  ) {
    this.config = config;
    this.dataModel = dataModel;
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  computePerformanceVisualization(
    agentId: string,
    period: AnalyticsPeriod
  ): PerformanceVisualization {
    const equityCurve = this.dataModel.getEquityCurve(agentId, period);
    const dailyReturns = this.dataModel.getDailyReturns(agentId, period);

    const cumulativeReturns = this.computeCumulativeReturns(equityCurve);
    const benchmarkComparisons = this.computeBenchmarkComparisons(dailyReturns);

    return {
      agentId,
      period,
      equityCurve,
      dailyReturns,
      cumulativeReturns,
      benchmarkComparisons,
      generatedAt: new Date(),
    };
  }

  computeRiskMetrics(
    agentId: string,
    period: AnalyticsPeriod
  ): RiskMetrics {
    const dailyReturns = this.dataModel.getDailyReturns(agentId, period);

    if (dailyReturns.length < 2) {
      return this.createEmptyRiskMetrics();
    }

    const returns = dailyReturns.map(d => d.return / 100);
    const rfRate = this.config.riskFreeRate;
    const tradingDays = this.config.tradingDaysPerYear;
    const dailyRfRate = rfRate / tradingDays;

    // Volatility (daily standard deviation)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce(
      (sum, r) => sum + Math.pow(r - meanReturn, 2), 0
    ) / returns.length;
    const volatility = Math.sqrt(variance) * 100;
    const annualizedVolatility = volatility * Math.sqrt(tradingDays);

    // Sharpe Ratio = (Annualized Return - Risk Free Rate) / Annualized Volatility
    const annualizedReturn = meanReturn * tradingDays * 100;
    const excessReturn = annualizedReturn / 100 - rfRate;
    const sharpeRatio = annualizedVolatility > 0
      ? excessReturn / (annualizedVolatility / 100)
      : 0;

    // Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < dailyRfRate);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce(
          (sum, r) => sum + Math.pow(r - dailyRfRate, 2), 0
        ) / downsideReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0
      ? excessReturn / (downsideDeviation * Math.sqrt(tradingDays))
      : 0;

    // Drawdown analysis
    const equityCurve = this.dataModel.getEquityCurve(agentId, period);
    const drawdownData = this.computeDrawdownSeries(equityCurve);
    const drawdowns = drawdownData.map(d => d.drawdown);

    const maxDrawdown = drawdowns.length > 0 ? Math.max(...drawdowns) : 0;
    const avgDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length
      : 0;
    const currentDrawdown = drawdowns.length > 0 ? drawdowns[drawdowns.length - 1]! : 0;
    const maxDrawdownDuration = this.computeMaxDrawdownDuration(drawdownData);

    // Calmar Ratio = Annualized Return / Max Drawdown
    const calmarRatio = maxDrawdown > 0 ? Math.abs(annualizedReturn) / maxDrawdown : 0;

    // Value at Risk (percentile-based)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.max(0, Math.floor(sortedReturns.length * 0.05));
    const var99Index = Math.max(0, Math.floor(sortedReturns.length * 0.01));
    const var95 = Math.abs((sortedReturns[var95Index] ?? 0) * 100);
    const var99 = Math.abs((sortedReturns[var99Index] ?? 0) * 100);

    // CVaR (Expected Shortfall)
    const tailReturns = sortedReturns.slice(0, var95Index + 1);
    const cvar95 = tailReturns.length > 0
      ? Math.abs(
          (tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) * 100
        )
      : 0;

    return {
      volatility,
      annualizedVolatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      currentDrawdown,
      maxDrawdownDuration,
      avgDrawdown,
      var95,
      var99,
      cvar95,
    };
  }

  computeBenchmarkComparison(
    agentReturns: number[],
    benchmarkReturns: number[],
    benchmarkName: string
  ): BenchmarkComparison {
    if (agentReturns.length === 0 || benchmarkReturns.length === 0) {
      return {
        benchmark: benchmarkName,
        benchmarkReturn: 0,
        portfolioReturn: 0,
        outperformance: 0,
        trackingError: 0,
        informationRatio: 0,
      };
    }

    // Cumulative returns
    const portfolioCumReturn =
      agentReturns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;
    const benchmarkCumReturn =
      benchmarkReturns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;

    const portfolioReturn = portfolioCumReturn * 100;
    const benchmarkReturn = benchmarkCumReturn * 100;
    const outperformance = portfolioReturn - benchmarkReturn;

    // Tracking error
    const minLen = Math.min(agentReturns.length, benchmarkReturns.length);
    const returnDiffs: number[] = [];
    for (let i = 0; i < minLen; i++) {
      returnDiffs.push(agentReturns[i]! - benchmarkReturns[i]!);
    }

    const meanDiff = returnDiffs.reduce((a, b) => a + b, 0) / returnDiffs.length;
    const trackingVariance =
      returnDiffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) /
      returnDiffs.length;
    const trackingError = Math.sqrt(trackingVariance);

    // Information Ratio
    const informationRatio = trackingError > 0 ? meanDiff / trackingError : 0;

    return {
      benchmark: benchmarkName,
      benchmarkReturn,
      portfolioReturn,
      outperformance,
      trackingError,
      informationRatio,
    };
  }

  generateChartData(
    type: ChartType,
    agentId: string,
    period: AnalyticsPeriod
  ): ChartData {
    switch (type) {
      case 'equity_curve':
        return this.buildEquityCurveChart(agentId, period);
      case 'daily_returns':
        return this.buildDailyReturnsChart(agentId, period);
      case 'cumulative_returns':
        return this.buildCumulativeReturnsChart(agentId, period);
      case 'drawdown':
        return this.buildDrawdownChart(agentId, period);
      case 'allocation_pie':
        return this.buildAllocationPieChart(agentId);
      case 'allocation_timeline':
        return this.buildAllocationTimelineChart(agentId, period);
      default:
        return this.buildEquityCurveChart(agentId, period);
    }
  }

  async buildDashboardMetrics(
    agentId: string,
    period: AnalyticsPeriod
  ): Promise<DashboardMetrics> {
    const overview = this.dataModel.getPortfolioOverview(agentId);
    const performance = this.computePerformanceVisualization(agentId, period);
    const allocation = this.dataModel.getAllocationBreakdown(agentId);
    const tradeHistory = this.dataModel.getTradeHistory(agentId, period);

    // Risk panel is computed separately (risk-monitor.ts)
    const riskMetrics = this.computeRiskMetrics(agentId, period);

    // Strategy comparison (placeholder — strategy-comparison.ts builds this)
    const strategyComparison = {
      agentId,
      period,
      strategies: [],
      bestByROI: '',
      bestBySharpe: '',
      bestByWinRate: '',
      lowestDrawdown: '',
      generatedAt: new Date(),
    };

    // Risk panel (placeholder — risk-monitor.ts builds this fully)
    const risk = {
      agentId,
      riskMetrics,
      exposureMetrics: {
        totalExposure: overview.totalValue,
        netExposure: overview.totalValue,
        grossLeverage: 1,
        netLeverage: 1,
        topConcentrations: [],
      },
      activeAlerts: [],
      alertHistory: [],
      riskScore: this.computeRiskScore(riskMetrics),
      riskGrade: this.computeRiskGrade(riskMetrics) as 'A' | 'B' | 'C' | 'D' | 'F',
      lastAssessed: new Date(),
    };

    const metrics: DashboardMetrics = {
      agentId,
      period,
      overview,
      performance,
      allocation,
      risk,
      strategyComparison,
      tradeHistory,
      generatedAt: new Date(),
    };

    this.emitEvent({
      type: 'metrics_updated',
      agentId,
      severity: 'info',
      message: `Dashboard metrics computed for period: ${period}`,
      data: { period, overviewValue: overview.totalValue },
    });

    return metrics;
  }

  // ============================================================================
  // Private Computation Methods
  // ============================================================================

  private computeCumulativeReturns(
    equityCurve: EquityCurvePoint[]
  ): CumulativeReturn[] {
    if (equityCurve.length === 0) return [];

    const initialValue = equityCurve[0]!.value;
    return equityCurve.map(point => ({
      date: point.timestamp,
      cumulativeReturn: initialValue > 0
        ? ((point.value - initialValue) / initialValue) * 100
        : 0,
    }));
  }

  private computeBenchmarkComparisons(dailyReturns: DailyReturn[]): BenchmarkComparison[] {
    const agentReturns = dailyReturns.map(d => d.return);

    // In production, fetch real benchmark data. Placeholder for demo.
    return this.config.benchmarks.map(benchmark => {
      const benchmarkReturns = agentReturns.map(() => (Math.random() * 4 - 1));
      return this.computeBenchmarkComparison(agentReturns, benchmarkReturns, benchmark);
    });
  }

  private computeDrawdownSeries(
    equityCurve: EquityCurvePoint[]
  ): Array<{ timestamp: Date; drawdown: number }> {
    const drawdowns: Array<{ timestamp: Date; drawdown: number }> = [];
    let peak = 0;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0;
      drawdowns.push({ timestamp: point.timestamp, drawdown });
    }

    return drawdowns;
  }

  private computeMaxDrawdownDuration(
    drawdownData: Array<{ timestamp: Date; drawdown: number }>
  ): number {
    let maxDuration = 0;
    let currentDuration = 0;

    for (const dd of drawdownData) {
      if (dd.drawdown > 0) {
        currentDuration++;
        maxDuration = Math.max(maxDuration, currentDuration);
      } else {
        currentDuration = 0;
      }
    }

    return maxDuration;
  }

  private computeRiskScore(riskMetrics: RiskMetrics): number {
    // Score from 0 (highest risk) to 100 (lowest risk)
    let score = 100;

    // Penalize for high max drawdown
    score -= Math.min(40, riskMetrics.maxDrawdown * 2);

    // Penalize for high volatility
    score -= Math.min(30, riskMetrics.annualizedVolatility * 0.5);

    // Reward for high Sharpe ratio
    score += Math.min(20, riskMetrics.sharpeRatio * 5);

    return Math.max(0, Math.min(100, score));
  }

  private computeRiskGrade(riskMetrics: RiskMetrics): string {
    const score = this.computeRiskScore(riskMetrics);
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
  }

  // ============================================================================
  // Chart Building Methods
  // ============================================================================

  private buildEquityCurveChart(agentId: string, period: AnalyticsPeriod): ChartData {
    const equityCurve = this.dataModel.getEquityCurve(agentId, period);

    const series: ChartSeries = {
      name: 'Portfolio Value',
      data: equityCurve.map(point => ({
        x: point.timestamp,
        y: point.value,
        label: `Value: ${point.value.toFixed(2)}`,
      })),
      color: '#4CAF50',
    };

    return {
      type: 'equity_curve',
      title: 'Portfolio Equity Curve',
      series: [series],
      xAxisLabel: 'Date',
      yAxisLabel: 'Portfolio Value (TON)',
    };
  }

  private buildDailyReturnsChart(agentId: string, period: AnalyticsPeriod): ChartData {
    const dailyReturns = this.dataModel.getDailyReturns(agentId, period);

    const series: ChartSeries = {
      name: 'Daily Return %',
      data: dailyReturns.map(r => ({
        x: r.date,
        y: r.return,
        label: `${r.return.toFixed(2)}%`,
      })),
      color: '#2196F3',
    };

    return {
      type: 'daily_returns',
      title: 'Daily Returns',
      series: [series],
      xAxisLabel: 'Date',
      yAxisLabel: 'Return (%)',
    };
  }

  private buildCumulativeReturnsChart(
    agentId: string,
    period: AnalyticsPeriod
  ): ChartData {
    const equityCurve = this.dataModel.getEquityCurve(agentId, period);
    const cumReturns = this.computeCumulativeReturns(equityCurve);

    const series: ChartSeries = {
      name: 'Cumulative Return %',
      data: cumReturns.map(r => ({
        x: r.date,
        y: r.cumulativeReturn,
        label: `${r.cumulativeReturn.toFixed(2)}%`,
      })),
      color: '#9C27B0',
    };

    return {
      type: 'cumulative_returns',
      title: 'Cumulative Returns',
      series: [series],
      xAxisLabel: 'Date',
      yAxisLabel: 'Cumulative Return (%)',
    };
  }

  private buildDrawdownChart(agentId: string, period: AnalyticsPeriod): ChartData {
    const equityCurve = this.dataModel.getEquityCurve(agentId, period);
    const drawdownData = this.computeDrawdownSeries(equityCurve);

    const series: ChartSeries = {
      name: 'Drawdown %',
      data: drawdownData.map(d => ({
        x: d.timestamp,
        y: -d.drawdown,
        label: `-${d.drawdown.toFixed(2)}%`,
      })),
      color: '#F44336',
    };

    return {
      type: 'drawdown',
      title: 'Portfolio Drawdown',
      series: [series],
      xAxisLabel: 'Date',
      yAxisLabel: 'Drawdown (%)',
    };
  }

  private buildAllocationPieChart(agentId: string): ChartData {
    const breakdown = this.dataModel.getAllocationBreakdown(agentId);

    const series: ChartSeries = {
      name: 'Strategy Allocation',
      data: breakdown.strategies.map(s => ({
        x: s.strategyName,
        y: s.allocatedPercent,
        label: `${s.strategyName}: ${s.allocatedPercent.toFixed(1)}%`,
      })),
    };

    if (breakdown.cashReserve > 0 && breakdown.totalAllocated + breakdown.cashReserve > 0) {
      const cashPercent =
        (breakdown.cashReserve /
          (breakdown.totalAllocated + breakdown.cashReserve)) *
        100;
      series.data.push({
        x: 'Cash Reserve',
        y: cashPercent,
        label: `Cash Reserve: ${cashPercent.toFixed(1)}%`,
      });
    }

    return {
      type: 'allocation_pie',
      title: 'Strategy Allocation Breakdown',
      series: [series],
    };
  }

  private buildAllocationTimelineChart(
    agentId: string,
    period: AnalyticsPeriod
  ): ChartData {
    const breakdown = this.dataModel.getAllocationBreakdown(agentId);
    const cutoff = this.getPeriodCutoff(period);

    const timeline = cutoff
      ? breakdown.timeline.filter(p => p.timestamp >= cutoff)
      : breakdown.timeline;

    // Group by strategy for multiple series
    const strategyNames = new Set<string>();
    for (const point of timeline) {
      for (const alloc of point.allocations) {
        strategyNames.add(alloc.strategyName);
      }
    }

    const seriesList: ChartSeries[] = Array.from(strategyNames).map(name => ({
      name,
      data: timeline.map(point => {
        const alloc = point.allocations.find(a => a.strategyName === name);
        return {
          x: point.timestamp,
          y: alloc?.percent ?? 0,
          label: `${name}: ${(alloc?.percent ?? 0).toFixed(1)}%`,
        };
      }),
    }));

    return {
      type: 'allocation_timeline',
      title: 'Allocation Timeline',
      series: seriesList,
      xAxisLabel: 'Date',
      yAxisLabel: 'Allocation (%)',
    };
  }

  private getPeriodCutoff(period: AnalyticsPeriod): Date | null {
    const periodDays: Record<AnalyticsPeriod, number | null> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
      'all_time': null,
      'custom': null,
    };
    const days = periodDays[period];
    if (days === null) return null;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private createEmptyRiskMetrics(): RiskMetrics {
    return {
      volatility: 0,
      annualizedVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      maxDrawdownDuration: 0,
      avgDrawdown: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
    };
  }

  private emitEvent(
    event: Omit<PortfolioAnalyticsEvent, 'id' | 'timestamp'>
  ): void {
    const fullEvent: PortfolioAnalyticsEvent = {
      id: generateId('evt'),
      timestamp: new Date(),
      ...event,
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAnalyticsEngine(
  config: PortfolioAnalyticsConfig,
  dataModel: DefaultPortfolioDataModel
): DefaultAnalyticsEngine {
  return new DefaultAnalyticsEngine(config, dataModel);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
