/**
 * Performance Transparency Layer
 *
 * APY, Sharpe ratio, drawdown, volatility, historical returns, and strategy
 * contribution analytics. Dashboard-ready metrics for the Autonomous AI
 * Investment Layer.
 */

import type {
  VaultPerformanceMetrics,
  PerformanceSnapshot,
  HistoricalReturn,
  StrategyContribution,
  PerformanceDashboardData,
  Vault,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface PerformanceAnalyticsEngine {
  // Snapshots
  takeSnapshot(vault: Vault, unrealizedPnl?: number, realizedPnl?: number): Promise<PerformanceSnapshot>;
  getLatestSnapshot(vaultId: string): Promise<PerformanceSnapshot | null>;
  listSnapshots(vaultId: string, limit?: number): Promise<PerformanceSnapshot[]>;

  // Historical returns
  recordReturn(
    vaultId: string,
    date: Date,
    openValue: number,
    closeValue: number,
    strategyId?: string
  ): Promise<HistoricalReturn>;
  getHistoricalReturns(vaultId: string, strategyId?: string, days?: number): Promise<HistoricalReturn[]>;

  // Performance metrics
  computeMetrics(vaultId: string, period: VaultPerformanceMetrics['period']): Promise<VaultPerformanceMetrics>;
  computeStrategyContributions(vaultId: string, period: string): Promise<StrategyContribution[]>;

  // Dashboard
  getDashboardData(vault: Vault): Promise<PerformanceDashboardData>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface PerformanceAnalyticsConfig {
  snapshotRetentionDays: number;
  returnHistoryRetentionDays: number;
  riskFreeRate: number; // Annual risk-free rate for Sharpe calculation
  tradingDaysPerYear: number;
}

const DEFAULT_CONFIG: PerformanceAnalyticsConfig = {
  snapshotRetentionDays: 365,
  returnHistoryRetentionDays: 730,
  riskFreeRate: 0.05, // 5% annual
  tradingDaysPerYear: 252,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultPerformanceAnalyticsEngine implements PerformanceAnalyticsEngine {
  private readonly config: PerformanceAnalyticsConfig;
  private readonly snapshots: Map<string, PerformanceSnapshot[]> = new Map();
  private readonly historicalReturns: Map<string, HistoricalReturn[]> = new Map();
  private readonly strategyReturns: Map<string, HistoricalReturn[]> = new Map();
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<PerformanceAnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async takeSnapshot(vault: Vault, unrealizedPnl = 0, realizedPnl = 0): Promise<PerformanceSnapshot> {
    const now = new Date();
    const snapshots = this.snapshots.get(vault.id) ?? [];

    const prevSnapshot = snapshots[snapshots.length - 1];
    const dailyPnl = prevSnapshot
      ? vault.balance - prevSnapshot.totalValue
      : 0;

    const snapshot: PerformanceSnapshot = {
      id: this.generateId('snap'),
      vaultId: vault.id,
      timestamp: now,
      totalValue: vault.balance,
      allocatedValue: vault.allocatedBalance,
      availableValue: vault.availableBalance,
      unrealizedPnl,
      realizedPnl,
      dailyPnl,
    };

    snapshots.push(snapshot);
    this.snapshots.set(vault.id, snapshots);

    this.emitEvent({
      type: 'performance_snapshot_taken',
      timestamp: now,
      data: { vaultId: vault.id, totalValue: vault.balance, dailyPnl },
    });

    return snapshot;
  }

  async getLatestSnapshot(vaultId: string): Promise<PerformanceSnapshot | null> {
    const snapshots = this.snapshots.get(vaultId);
    if (!snapshots || snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1];
  }

  async listSnapshots(vaultId: string, limit?: number): Promise<PerformanceSnapshot[]> {
    const snapshots = this.snapshots.get(vaultId) ?? [];
    if (limit !== undefined) return snapshots.slice(-limit);
    return snapshots;
  }

  async recordReturn(
    vaultId: string,
    date: Date,
    openValue: number,
    closeValue: number,
    strategyId?: string
  ): Promise<HistoricalReturn> {
    const dailyReturn = openValue > 0 ? ((closeValue - openValue) / openValue) * 100 : 0;

    // Compute cumulative return
    const key = strategyId ? `${vaultId}:${strategyId}` : vaultId;
    const history = strategyId
      ? (this.strategyReturns.get(key) ?? [])
      : (this.historicalReturns.get(key) ?? []);

    const prevRecord = history[history.length - 1];
    const cumulativeReturn = prevRecord
      ? ((1 + prevRecord.cumulativeReturn / 100) * (1 + dailyReturn / 100) - 1) * 100
      : dailyReturn;

    const record: HistoricalReturn = {
      vaultId,
      strategyId,
      date,
      openValue,
      closeValue,
      dailyReturn,
      cumulativeReturn,
    };

    history.push(record);
    if (strategyId) {
      this.strategyReturns.set(key, history);
    } else {
      this.historicalReturns.set(key, history);
    }

    return record;
  }

  async getHistoricalReturns(vaultId: string, strategyId?: string, days?: number): Promise<HistoricalReturn[]> {
    const key = strategyId ? `${vaultId}:${strategyId}` : vaultId;
    const history = strategyId
      ? (this.strategyReturns.get(key) ?? [])
      : (this.historicalReturns.get(key) ?? []);

    if (days !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return history.filter(r => r.date >= cutoff);
    }

    return history;
  }

  async computeMetrics(vaultId: string, period: VaultPerformanceMetrics['period']): Promise<VaultPerformanceMetrics> {
    const returns = await this.getHistoricalReturns(vaultId, undefined, this.periodToDays(period));
    const snapshots = await this.listSnapshots(vaultId);

    const dailyReturns = returns.map(r => r.dailyReturn);
    const totalReturn = returns.length > 0 ? returns[returns.length - 1].cumulativeReturn : 0;
    const absoluteReturn = snapshots.length >= 2
      ? snapshots[snapshots.length - 1].totalValue - snapshots[0].totalValue
      : 0;

    // APY: annualize total return
    const periodDays = this.periodToDays(period);
    const apy = periodDays > 0 ? ((1 + totalReturn / 100) ** (365 / periodDays) - 1) * 100 : 0;

    // Volatility
    const volatility = this.calculateStdDev(dailyReturns) * Math.sqrt(this.config.tradingDaysPerYear);

    // Sharpe ratio
    const avgDailyReturn = dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
    const annualizedReturn = avgDailyReturn * this.config.tradingDaysPerYear;
    const dailyRiskFree = this.config.riskFreeRate / this.config.tradingDaysPerYear;
    const excessReturn = annualizedReturn - this.config.riskFreeRate * 100;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Sortino ratio
    const negativeReturns = dailyReturns.filter(r => r < dailyRiskFree * 100);
    const downsideStdDev = this.calculateStdDev(negativeReturns) * Math.sqrt(this.config.tradingDaysPerYear);
    const sortinoRatio = downsideStdDev > 0 ? excessReturn / downsideStdDev : 0;

    // Max drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let cumulative = 0;
    for (const r of dailyReturns) {
      cumulative += r;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Current drawdown
    const latestSnapshot = snapshots[snapshots.length - 1];
    const peakSnapshot = snapshots.reduce((max, s) => s.totalValue > max.totalValue ? s : max, snapshots[0] ?? { totalValue: 0 });
    const currentDrawdown = peakSnapshot && latestSnapshot && peakSnapshot.totalValue > 0
      ? ((peakSnapshot.totalValue - latestSnapshot.totalValue) / peakSnapshot.totalValue) * 100
      : 0;

    // Win rate
    const winRate = dailyReturns.length > 0
      ? (dailyReturns.filter(r => r > 0).length / dailyReturns.length) * 100
      : 0;

    const strategyContributions = await this.computeStrategyContributions(vaultId, period);

    return {
      vaultId,
      period,
      totalReturn,
      absoluteReturn,
      apy,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility,
      winRate,
      strategyContributions,
      calculatedAt: new Date(),
    };
  }

  async computeStrategyContributions(vaultId: string, period: string): Promise<StrategyContribution[]> {
    const contributions: StrategyContribution[] = [];

    // Collect all strategy returns for this vault
    for (const [key, returns] of this.strategyReturns.entries()) {
      if (!key.startsWith(`${vaultId}:`)) continue;
      const strategyId = key.split(':')[1];

      if (returns.length === 0) continue;

      const lastReturn = returns[returns.length - 1];
      const firstReturn = returns[0];
      const absoluteContribution = lastReturn.closeValue - firstReturn.openValue;

      // Find agent ID from returns (stored in agentId field if we had it — using strategyId as proxy)
      contributions.push({
        strategyId,
        agentId: `agent-for-${strategyId}`,
        contribution: lastReturn.cumulativeReturn,
        absoluteContribution,
        period,
      });
    }

    return contributions;
  }

  async getDashboardData(vault: Vault): Promise<PerformanceDashboardData> {
    const metrics = await this.computeMetrics(vault.id, 'monthly');
    const snapshots = await this.listSnapshots(vault.id, 30);
    const historicalReturns = await this.getHistoricalReturns(vault.id, undefined, 90);

    return {
      vault,
      metrics,
      snapshots,
      historicalReturns,
      strategyBreakdown: [],
      lastUpdated: new Date(),
    };
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private periodToDays(period: VaultPerformanceMetrics['period']): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'annual': return 365;
      case 'all_time': return 3650;
    }
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  private emitEvent(event: InvestmentEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Swallow callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createPerformanceAnalyticsEngine(
  config?: Partial<PerformanceAnalyticsConfig>
): DefaultPerformanceAnalyticsEngine {
  return new DefaultPerformanceAnalyticsEngine(config);
}
