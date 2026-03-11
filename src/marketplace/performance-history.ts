/**
 * TONAIAgent - Strategy Performance History Tracker
 *
 * Records and analyzes historical performance data for strategies:
 * - Monthly returns and benchmark comparisons
 * - Historical volatility time-series
 * - Drawdown periods and recovery tracking
 * - Consistency metrics for trust scoring
 *
 * Longer, more stable histories gain higher trust scores in the Reputation &
 * Ranking System.
 */

import {
  StrategyPerformanceHistory,
  MonthlyReturnRecord,
  VolatilityRecord,
  DrawdownRecord,
  PerformanceConsistencyMetrics,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Performance History Manager Interface
// ============================================================================

export interface RecordMonthlyReturnInput {
  strategyId: string;
  year: number;
  month: number; // 1-12
  returnPercent: number;
  benchmarkReturn?: number;
  volatility: number;
  tradingDays: number;
}

export interface RecordVolatilityInput {
  strategyId: string;
  daily: number;
  weekly: number;
  monthly: number;
  annualized: number;
}

export interface RecordDrawdownInput {
  strategyId: string;
  startDate: Date;
  peakValue: number;
  troughValue: number;
  drawdownPercent: number;
  endDate?: Date;
  recoveredAt?: Date;
}

export interface PerformanceHistoryManager {
  // Monthly returns
  recordMonthlyReturn(input: RecordMonthlyReturnInput): Promise<MonthlyReturnRecord>;
  getMonthlyReturns(strategyId: string, months?: number): Promise<MonthlyReturnRecord[]>;

  // Volatility tracking
  recordVolatility(input: RecordVolatilityInput): Promise<VolatilityRecord>;
  getVolatilityHistory(strategyId: string, limit?: number): Promise<VolatilityRecord[]>;

  // Drawdown tracking
  recordDrawdown(input: RecordDrawdownInput): Promise<DrawdownRecord>;
  closeDrawdown(strategyId: string, startDate: Date, recoveredAt: Date): Promise<DrawdownRecord>;
  getDrawdownHistory(strategyId: string): Promise<DrawdownRecord[]>;

  // Aggregate history
  getPerformanceHistory(strategyId: string): Promise<StrategyPerformanceHistory | null>;
  computeConsistencyMetrics(strategyId: string): Promise<PerformanceConsistencyMetrics>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default Performance History Manager Implementation
// ============================================================================

export interface PerformanceHistoryManagerConfig {
  maxMonthlyReturnRecords: number;
  maxVolatilityRecords: number;
  maxDrawdownRecords: number;
}

export class DefaultPerformanceHistoryManager implements PerformanceHistoryManager {
  private readonly monthlyReturns: Map<string, MonthlyReturnRecord[]> = new Map();
  private readonly volatilityHistory: Map<string, VolatilityRecord[]> = new Map();
  private readonly drawdownHistory: Map<string, DrawdownRecord[]> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: PerformanceHistoryManagerConfig;

  constructor(config?: Partial<PerformanceHistoryManagerConfig>) {
    this.config = {
      maxMonthlyReturnRecords: config?.maxMonthlyReturnRecords ?? 120, // 10 years
      maxVolatilityRecords: config?.maxVolatilityRecords ?? 365,
      maxDrawdownRecords: config?.maxDrawdownRecords ?? 50,
    };
  }

  async recordMonthlyReturn(input: RecordMonthlyReturnInput): Promise<MonthlyReturnRecord> {
    if (input.month < 1 || input.month > 12) {
      throw new Error(`Invalid month: ${input.month}. Must be 1-12.`);
    }

    const records = this.monthlyReturns.get(input.strategyId) ?? [];

    // Upsert: replace if same year/month exists
    const existing = records.findIndex(r => r.year === input.year && r.month === input.month);
    const record: MonthlyReturnRecord = {
      year: input.year,
      month: input.month,
      returnPercent: input.returnPercent,
      benchmarkReturn: input.benchmarkReturn,
      volatility: input.volatility,
      tradingDays: input.tradingDays,
    };

    if (existing >= 0) {
      records[existing] = record;
    } else {
      records.push(record);
    }

    // Sort by date and trim
    records.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    const trimmed = records.slice(-this.config.maxMonthlyReturnRecords);
    this.monthlyReturns.set(input.strategyId, trimmed);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'performance_snapshot_recorded',
      severity: 'info',
      source: 'performance_history_manager',
      message: `Monthly return recorded for strategy ${input.strategyId}: ${input.returnPercent.toFixed(2)}% (${input.year}-${String(input.month).padStart(2, '0')})`,
      data: { strategyId: input.strategyId, year: input.year, month: input.month, returnPercent: input.returnPercent },
    });

    return record;
  }

  async getMonthlyReturns(strategyId: string, months?: number): Promise<MonthlyReturnRecord[]> {
    const records = this.monthlyReturns.get(strategyId) ?? [];
    if (!months) return records;
    return records.slice(-months);
  }

  async recordVolatility(input: RecordVolatilityInput): Promise<VolatilityRecord> {
    const records = this.volatilityHistory.get(input.strategyId) ?? [];
    const record: VolatilityRecord = {
      timestamp: new Date(),
      daily: input.daily,
      weekly: input.weekly,
      monthly: input.monthly,
      annualized: input.annualized,
    };

    records.push(record);
    const trimmed = records.slice(-this.config.maxVolatilityRecords);
    this.volatilityHistory.set(input.strategyId, trimmed);

    return record;
  }

  async getVolatilityHistory(strategyId: string, limit?: number): Promise<VolatilityRecord[]> {
    const records = this.volatilityHistory.get(strategyId) ?? [];
    return limit ? records.slice(-limit) : records;
  }

  async recordDrawdown(input: RecordDrawdownInput): Promise<DrawdownRecord> {
    const records = this.drawdownHistory.get(input.strategyId) ?? [];

    const record: DrawdownRecord = {
      startDate: input.startDate,
      endDate: input.endDate,
      peakValue: input.peakValue,
      troughValue: input.troughValue,
      drawdownPercent: input.drawdownPercent,
      recoveredAt: input.recoveredAt,
      durationDays: input.endDate
        ? Math.round((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
    };

    records.push(record);
    const trimmed = records.slice(-this.config.maxDrawdownRecords);
    this.drawdownHistory.set(input.strategyId, trimmed);

    return record;
  }

  async closeDrawdown(strategyId: string, startDate: Date, recoveredAt: Date): Promise<DrawdownRecord> {
    const records = this.drawdownHistory.get(strategyId) ?? [];
    const idx = records.findIndex(r => r.startDate.getTime() === startDate.getTime() && !r.recoveredAt);

    if (idx < 0) {
      throw new Error(`Open drawdown not found for strategy ${strategyId} starting ${startDate.toISOString()}`);
    }

    const record = records[idx];
    const updated: DrawdownRecord = {
      ...record,
      recoveredAt,
      endDate: recoveredAt,
      durationDays: Math.round(
        (recoveredAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    };

    records[idx] = updated;
    this.drawdownHistory.set(strategyId, records);

    return updated;
  }

  async getDrawdownHistory(strategyId: string): Promise<DrawdownRecord[]> {
    return this.drawdownHistory.get(strategyId) ?? [];
  }

  async getPerformanceHistory(strategyId: string): Promise<StrategyPerformanceHistory | null> {
    const monthlyReturns = this.monthlyReturns.get(strategyId);
    if (!monthlyReturns || monthlyReturns.length === 0) return null;

    const volatilityHistory = this.volatilityHistory.get(strategyId) ?? [];
    const drawdownHistory = this.drawdownHistory.get(strategyId) ?? [];
    const consistencyMetrics = await this.computeConsistencyMetrics(strategyId);

    return {
      strategyId,
      monthlyReturns,
      volatilityHistory,
      drawdownHistory,
      consistencyMetrics,
      updatedAt: new Date(),
    };
  }

  async computeConsistencyMetrics(strategyId: string): Promise<PerformanceConsistencyMetrics> {
    const monthly = this.monthlyReturns.get(strategyId) ?? [];

    if (monthly.length === 0) {
      return {
        positiveMonthsPercent: 0,
        avgMonthlyReturn: 0,
        returnStdDev: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        calmarRatio: 0,
        trustScore: 0,
      };
    }

    const returns = monthly.map(r => r.returnPercent);
    const positiveCount = returns.filter(r => r > 0).length;
    const positiveMonthsPercent = (positiveCount / returns.length) * 100;

    const avgMonthlyReturn = returns.reduce((s, r) => s + r, 0) / returns.length;

    const variance = returns.reduce((s, r) => s + Math.pow(r - avgMonthlyReturn, 2), 0) / returns.length;
    const returnStdDev = Math.sqrt(variance);

    // Win/loss streaks
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWin = 0;
    let currentLoss = 0;
    for (const r of returns) {
      if (r > 0) {
        currentWin++;
        currentLoss = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWin);
      } else {
        currentLoss++;
        currentWin = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLoss);
      }
    }

    // Calmar ratio: annualized return / max drawdown
    const annualizedReturn = avgMonthlyReturn * 12;
    const drawdowns = this.drawdownHistory.get(strategyId) ?? [];
    const maxDrawdown = drawdowns.reduce((max, d) => Math.max(max, d.drawdownPercent), 0);
    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : annualizedReturn > 0 ? 10 : 0;

    // Information ratio (vs benchmark if available)
    const withBenchmark = monthly.filter(r => r.benchmarkReturn !== undefined);
    let informationRatio: number | undefined;
    if (withBenchmark.length >= 3) {
      const excessReturns = withBenchmark.map(r => r.returnPercent - (r.benchmarkReturn ?? 0));
      const avgExcess = excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
      const excessVariance = excessReturns.reduce((s, r) => s + Math.pow(r - avgExcess, 2), 0) / excessReturns.length;
      const trackingError = Math.sqrt(excessVariance) * Math.sqrt(12); // annualized
      informationRatio = trackingError > 0 ? (avgExcess * 12) / trackingError : 0;
    }

    // Trust score: 0-100 based on history length and stability
    const historyScore = Math.min(100, (monthly.length / 24) * 100); // Saturates at 24 months
    const stabilityScore = Math.max(0, 100 - returnStdDev * 5); // Lower std dev = higher stability
    const trustScore = Math.round((historyScore * 0.6 + stabilityScore * 0.4) * 100) / 100;

    return {
      positiveMonthsPercent: Math.round(positiveMonthsPercent * 100) / 100,
      avgMonthlyReturn: Math.round(avgMonthlyReturn * 100) / 100,
      returnStdDev: Math.round(returnStdDev * 100) / 100,
      longestWinStreak,
      longestLossStreak,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      informationRatio,
      trustScore: Math.min(100, Math.max(0, trustScore)),
    };
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
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
// Factory Function
// ============================================================================

export function createPerformanceHistoryManager(
  config?: Partial<PerformanceHistoryManagerConfig>,
): DefaultPerformanceHistoryManager {
  return new DefaultPerformanceHistoryManager(config);
}
