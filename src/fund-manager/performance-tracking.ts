/**
 * TONAIAgent - Fund Performance Tracking
 *
 * Tracks and calculates key fund performance metrics:
 * - Total and annualized returns
 * - Risk-adjusted ratios (Sharpe, Sortino)
 * - Maximum drawdown
 * - Win rate
 * - Volatility
 * - AUM history snapshots
 */

import {
  AumSnapshot,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPerformanceMetrics,
  FundPortfolio,
} from './types';

// ============================================================================
// Performance Tracking Service
// ============================================================================

/** Configuration for the PerformanceTrackingService */
export interface PerformanceTrackingConfig {
  /** Maximum AUM snapshots to retain per fund */
  maxSnapshotsPerFund: number;
  /** Risk-free rate for Sharpe ratio calculation (annualized %) */
  riskFreeRatePercent: number;
}

const DEFAULT_CONFIG: PerformanceTrackingConfig = {
  maxSnapshotsPerFund: 365, // 1 year of daily snapshots
  riskFreeRatePercent: 4.0, // ~current risk-free rate
};

export class PerformanceTrackingService {
  private readonly config: PerformanceTrackingConfig;
  private readonly aumHistory = new Map<string, AumSnapshot[]>();
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<PerformanceTrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Snapshot Management
  // ============================================================================

  /**
   * Record an AUM snapshot for a fund.
   * Called periodically (daily) to build performance history.
   */
  recordSnapshot(
    portfolio: FundPortfolio,
    investorCount: number
  ): AumSnapshot {
    const snapshot: AumSnapshot = {
      fundId: portfolio.fundId,
      aum: portfolio.totalAum,
      navPerShare: portfolio.navPerShare,
      investorCount,
      timestamp: new Date(),
    };

    const history = this.aumHistory.get(portfolio.fundId) ?? [];
    history.push(snapshot);

    // Keep bounded history
    if (history.length > this.config.maxSnapshotsPerFund) {
      history.splice(0, history.length - this.config.maxSnapshotsPerFund);
    }

    this.aumHistory.set(portfolio.fundId, history);

    this.emitEvent('performance.snapshot_taken', portfolio.fundId, {
      fundId: portfolio.fundId,
      aum: portfolio.totalAum.toString(),
      navPerShare: portfolio.navPerShare.toString(),
      investorCount,
    });

    return snapshot;
  }

  // ============================================================================
  // Performance Metrics
  // ============================================================================

  /**
   * Calculate performance metrics for a fund over a given period.
   */
  calculateMetrics(
    fundId: string,
    period: FundPerformanceMetrics['period']
  ): FundPerformanceMetrics {
    const history = this.aumHistory.get(fundId) ?? [];
    const now = new Date();

    // Determine window
    const windowMs = this.getPeriodWindowMs(period);
    const cutoff = windowMs > 0 ? new Date(now.getTime() - windowMs) : new Date(0);

    const windowHistory = windowMs > 0
      ? history.filter((s) => s.timestamp >= cutoff)
      : history;

    if (windowHistory.length < 2) {
      return this.emptyMetrics(fundId, period);
    }

    const firstNav = windowHistory[0].navPerShare;
    const lastNav = windowHistory[windowHistory.length - 1].navPerShare;

    // Total return
    const totalReturnPercent = firstNav > BigInt(0)
      ? Number(((lastNav - firstNav) * BigInt(10000)) / firstNav) / 100
      : 0;

    // Annualized return (CAGR)
    const durationDays = (windowHistory[windowHistory.length - 1].timestamp.getTime() - windowHistory[0].timestamp.getTime()) / 86400000;
    const annualizedReturnPercent = durationDays > 0
      ? (Math.pow(1 + totalReturnPercent / 100, 365 / durationDays) - 1) * 100
      : 0;

    // Daily returns series
    const dailyReturns: number[] = [];
    for (let i = 1; i < windowHistory.length; i++) {
      const prev = windowHistory[i - 1].navPerShare;
      const curr = windowHistory[i].navPerShare;
      if (prev > BigInt(0)) {
        dailyReturns.push(Number(((curr - prev) * BigInt(10000)) / prev) / 100);
      }
    }

    // Volatility (annualized standard deviation of daily returns)
    const volatilityPercent = dailyReturns.length > 1
      ? this.annualizedStdDev(dailyReturns)
      : 0;

    // Sharpe ratio
    const dailyRiskFree = this.config.riskFreeRatePercent / 365;
    const avgDailyReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
    const sharpeRatio = volatilityPercent > 0
      ? ((avgDailyReturn - dailyRiskFree) * Math.sqrt(365)) / (volatilityPercent / 100 * Math.sqrt(365))
      : 0;

    // Sortino ratio (downside deviation only)
    const downside = dailyReturns.filter((r) => r < dailyRiskFree);
    const downsideStdDev = downside.length > 1 ? this.stdDev(downside) * Math.sqrt(365) : 0;
    const sortinoRatio = downsideStdDev > 0
      ? ((avgDailyReturn * 365 - this.config.riskFreeRatePercent) / 100) / (downsideStdDev / 100)
      : 0;

    // Max drawdown
    const maxDrawdownPercent = this.calculateMaxDrawdown(windowHistory);

    // Win rate (percent of days with positive return)
    const positiveDays = dailyReturns.filter((r) => r > 0).length;
    const winRatePercent = dailyReturns.length > 0
      ? (positiveDays / dailyReturns.length) * 100
      : 0;

    return {
      fundId,
      period,
      totalReturnPercent: Number(totalReturnPercent.toFixed(4)),
      annualizedReturnPercent: Number(annualizedReturnPercent.toFixed(4)),
      sharpeRatio: Number(sharpeRatio.toFixed(4)),
      sortinoRatio: Number(sortinoRatio.toFixed(4)),
      maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(4)),
      winRatePercent: Number(winRatePercent.toFixed(2)),
      volatilityPercent: Number(volatilityPercent.toFixed(4)),
      totalManagementFees: BigInt(0), // aggregated by fee distribution
      totalPerformanceFees: BigInt(0), // aggregated by fee distribution
      calculatedAt: now,
    };
  }

  // ============================================================================
  // NAV Update
  // ============================================================================

  /**
   * Update a fund's NAV per share based on new total AUM and shares outstanding.
   * Returns updated portfolio with new navPerShare.
   */
  updateNav(portfolio: FundPortfolio): FundPortfolio {
    if (portfolio.totalSharesOutstanding === BigInt(0)) {
      return portfolio;
    }

    // NAV per share = AUM / shares outstanding, scaled to nanoTON precision
    const newNavPerShare =
      (portfolio.totalAum * BigInt(1_000_000_000)) / portfolio.totalSharesOutstanding;

    return {
      ...portfolio,
      navPerShare: newNavPerShare,
      lastSyncedAt: new Date(),
    };
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  getAumHistory(fundId: string): AumSnapshot[] {
    return this.aumHistory.get(fundId) ?? [];
  }

  getLatestSnapshot(fundId: string): AumSnapshot | undefined {
    const history = this.aumHistory.get(fundId);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getPeriodWindowMs(period: FundPerformanceMetrics['period']): number {
    switch (period) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      case 'all_time': return 0;
    }
  }

  private calculateMaxDrawdown(history: AumSnapshot[]): number {
    let maxDrawdown = 0;
    let peak = BigInt(0);

    for (const snapshot of history) {
      if (snapshot.navPerShare > peak) {
        peak = snapshot.navPerShare;
      }
      if (peak > BigInt(0)) {
        const drawdown = Number(((peak - snapshot.navPerShare) * BigInt(10000)) / peak) / 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private annualizedStdDev(dailyReturns: number[]): number {
    return this.stdDev(dailyReturns) * Math.sqrt(252) * 100; // 252 trading days
  }

  private emptyMetrics(fundId: string, period: FundPerformanceMetrics['period']): FundPerformanceMetrics {
    return {
      fundId,
      period,
      totalReturnPercent: 0,
      annualizedReturnPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdownPercent: 0,
      winRatePercent: 0,
      volatilityPercent: 0,
      totalManagementFees: BigInt(0),
      totalPerformanceFees: BigInt(0),
      calculatedAt: new Date(),
    };
  }

  private emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPerformanceTrackingService(
  config?: Partial<PerformanceTrackingConfig>
): PerformanceTrackingService {
  return new PerformanceTrackingService(config);
}
