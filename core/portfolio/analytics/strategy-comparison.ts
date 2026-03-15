/**
 * TONAIAgent - Strategy Performance Comparison
 *
 * Provides tools to compare performance across multiple strategies within
 * a portfolio, calculating ROI, Sharpe ratio, win rate, drawdown, and
 * other key metrics per strategy for the Portfolio Analytics Dashboard.
 */

import {
  AnalyticsPeriod,
  StrategyPerformanceMetrics,
  StrategyComparisonResult,
  PortfolioAnalyticsConfig,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
  StrategyAllocation,
} from './types';
import { DefaultPortfolioDataModel } from './data-model';
import { DefaultAnalyticsEngine } from './analytics-engine';

// ============================================================================
// Strategy Comparison Interface
// ============================================================================

export interface StrategyComparison {
  // Metrics per strategy
  computeStrategyMetrics(
    agentId: string,
    strategyId: string,
    period: AnalyticsPeriod
  ): StrategyPerformanceMetrics;

  // Comparison across strategies
  compareStrategies(
    agentId: string,
    period: AnalyticsPeriod
  ): StrategyComparisonResult;

  // Rankings
  rankByROI(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[];
  rankBySharpe(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[];
  rankByWinRate(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[];
  rankByDrawdown(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[];

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Strategy Trade Record (for per-strategy win/loss calculation)
// ============================================================================

export interface StrategyTradeRecord {
  strategyId: string;
  pnl: number;
  returnPercent: number;
  timestamp: Date;
}

// ============================================================================
// Default Strategy Comparison Implementation
// ============================================================================

export class DefaultStrategyComparison implements StrategyComparison {
  private readonly config: PortfolioAnalyticsConfig;
  private readonly dataModel: DefaultPortfolioDataModel;
  private readonly analyticsEngine: DefaultAnalyticsEngine;
  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];

  // Per-strategy trade records for win rate calculations
  private readonly strategyTrades = new Map<string, Map<string, StrategyTradeRecord[]>>();

  constructor(
    config: PortfolioAnalyticsConfig,
    dataModel: DefaultPortfolioDataModel,
    analyticsEngine: DefaultAnalyticsEngine
  ) {
    this.config = config;
    this.dataModel = dataModel;
    this.analyticsEngine = analyticsEngine;
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  computeStrategyMetrics(
    agentId: string,
    strategyId: string,
    period: AnalyticsPeriod
  ): StrategyPerformanceMetrics {
    const allocation = this.getStrategyAllocation(agentId, strategyId);
    const trades = this.getStrategyTrades(agentId, strategyId, period);

    // Compute ROI from allocation data
    const roi = allocation
      ? (allocation.allocatedCapital > 0
          ? (allocation.pnl / allocation.allocatedCapital) * 100
          : 0)
      : 0;

    const annualizedReturn = this.annualizeReturn(roi, period);

    // Compute win rate from trade records
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    // Compute profit factor
    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(
      trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Average trade return
    const avgTradeReturn = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.returnPercent, 0) / trades.length
      : 0;

    // Volatility of trade returns
    const returnValues = trades.map(t => t.returnPercent);
    const volatility = this.computeVolatility(returnValues);

    // Sharpe ratio (simplified per-strategy)
    const rfDaily = this.config.riskFreeRate / this.config.tradingDaysPerYear;
    const excessReturn = annualizedReturn / 100 - this.config.riskFreeRate;
    const annualizedVol = volatility * Math.sqrt(this.config.tradingDaysPerYear);
    const sharpeRatio = annualizedVol > 0 ? excessReturn / (annualizedVol / 100) : 0;

    // Sortino ratio
    const downsideReturns = returnValues.filter(r => r / 100 < rfDaily);
    const downsideVol = this.computeVolatility(downsideReturns);
    const annualizedDownsideVol = downsideVol * Math.sqrt(this.config.tradingDaysPerYear);
    const sortinoRatio = annualizedDownsideVol > 0
      ? excessReturn / (annualizedDownsideVol / 100)
      : 0;

    // Max drawdown from trade returns (running)
    const maxDrawdown = this.computeMaxDrawdown(returnValues);

    return {
      strategyId,
      strategyName: allocation?.strategyName ?? strategyId,
      roi,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      winRate,
      maxDrawdown,
      profitFactor,
      totalTrades: trades.length,
      avgTradeReturn,
      volatility,
      period,
      lastUpdated: new Date(),
    };
  }

  compareStrategies(agentId: string, period: AnalyticsPeriod): StrategyComparisonResult {
    const allocation = this.dataModel.getAllocationBreakdown(agentId);
    const strategyIds = allocation.strategies.map(s => s.strategyId);

    if (strategyIds.length === 0) {
      return {
        agentId,
        period,
        strategies: [],
        bestByROI: '',
        bestBySharpe: '',
        bestByWinRate: '',
        lowestDrawdown: '',
        generatedAt: new Date(),
      };
    }

    const strategies = strategyIds.map(id =>
      this.computeStrategyMetrics(agentId, id, period)
    );

    const bestByROI = strategies.reduce((best, s) =>
      s.roi > best.roi ? s : best
    ).strategyId;

    const bestBySharpe = strategies.reduce((best, s) =>
      s.sharpeRatio > best.sharpeRatio ? s : best
    ).strategyId;

    const bestByWinRate = strategies.reduce((best, s) =>
      s.winRate > best.winRate ? s : best
    ).strategyId;

    const lowestDrawdown = strategies.reduce((best, s) =>
      s.maxDrawdown < best.maxDrawdown ? s : best
    ).strategyId;

    const result: StrategyComparisonResult = {
      agentId,
      period,
      strategies,
      bestByROI,
      bestBySharpe,
      bestByWinRate,
      lowestDrawdown,
      generatedAt: new Date(),
    };

    this.emitEvent({
      type: 'metrics_updated',
      agentId,
      severity: 'info',
      message: `Strategy comparison computed for ${strategies.length} strategies`,
      data: { strategyCount: strategies.length, period },
    });

    return result;
  }

  rankByROI(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[] {
    const result = this.compareStrategies(agentId, period);
    return [...result.strategies].sort((a, b) => b.roi - a.roi);
  }

  rankBySharpe(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[] {
    const result = this.compareStrategies(agentId, period);
    return [...result.strategies].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  }

  rankByWinRate(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[] {
    const result = this.compareStrategies(agentId, period);
    return [...result.strategies].sort((a, b) => b.winRate - a.winRate);
  }

  rankByDrawdown(agentId: string, period: AnalyticsPeriod): StrategyPerformanceMetrics[] {
    const result = this.compareStrategies(agentId, period);
    return [...result.strategies].sort((a, b) => a.maxDrawdown - b.maxDrawdown);
  }

  // ============================================================================
  // Trade Recording (for win rate & metrics computation)
  // ============================================================================

  recordStrategyTrade(
    agentId: string,
    strategyId: string,
    trade: StrategyTradeRecord
  ): void {
    let agentTrades = this.strategyTrades.get(agentId);
    if (!agentTrades) {
      agentTrades = new Map<string, StrategyTradeRecord[]>();
      this.strategyTrades.set(agentId, agentTrades);
    }

    let trades = agentTrades.get(strategyId);
    if (!trades) {
      trades = [];
      agentTrades.set(strategyId, trades);
    }

    trades.push(trade);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getStrategyAllocation(
    agentId: string,
    strategyId: string
  ): StrategyAllocation | undefined {
    const breakdown = this.dataModel.getAllocationBreakdown(agentId);
    return breakdown.strategies.find(s => s.strategyId === strategyId);
  }

  private getStrategyTrades(
    agentId: string,
    strategyId: string,
    period: AnalyticsPeriod
  ): StrategyTradeRecord[] {
    const agentTrades = this.strategyTrades.get(agentId);
    if (!agentTrades) return [];

    const trades = agentTrades.get(strategyId) ?? [];
    const cutoff = this.getPeriodCutoff(period);

    return cutoff ? trades.filter(t => t.timestamp >= cutoff) : trades;
  }

  private annualizeReturn(totalReturn: number, period: AnalyticsPeriod): number {
    const periodDays: Record<AnalyticsPeriod, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
      'all_time': 365,
      'custom': 365,
    };
    const days = periodDays[period] ?? 365;
    if (days <= 0) return totalReturn;
    return Math.pow(1 + totalReturn / 100, 365 / days) * 100 - 100;
  }

  private computeVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private computeMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let value = 100;
    let maxDrawdown = 0;

    for (const ret of returns) {
      value *= 1 + ret / 100;
      if (value > peak) {
        peak = value;
      }
      const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
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

export function createStrategyComparison(
  config: PortfolioAnalyticsConfig,
  dataModel: DefaultPortfolioDataModel,
  analyticsEngine: DefaultAnalyticsEngine
): DefaultStrategyComparison {
  return new DefaultStrategyComparison(config, dataModel, analyticsEngine);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
