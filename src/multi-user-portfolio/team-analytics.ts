/**
 * TONAIAgent - Team Analytics Dashboard
 *
 * Provides portfolio-level and team-level analytics for multi-user portfolios.
 * Tracks portfolio performance, strategy contributions, risk exposure,
 * and member activity for institutional and collaborative use cases.
 */

import {
  TeamAnalyticsDashboard,
  AnalyticsPeriod,
  TeamPortfolioPerformance,
  StrategyContribution,
  TeamRiskExposure,
  MemberActivitySummary,
  ActivityLogEntry,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
  PortfolioRoleName,
} from './types';

// ============================================================================
// Analytics Input Types
// ============================================================================

export interface TradeRecord {
  id: string;
  portfolioId: string;
  executedBy: string;
  assetId: string;
  assetName: string;
  side: 'buy' | 'sell';
  amountUsd: number;
  executedAt: Date;
  profitable?: boolean;
  pnlUsd?: number;
}

export interface PortfolioSnapshot {
  portfolioId: string;
  timestamp: Date;
  totalValueUsd: number;
  allocations: Array<{
    assetId: string;
    assetName: string;
    valueUsd: number;
    percent: number;
  }>;
}

export interface StrategyRecord {
  id: string;
  portfolioId: string;
  name: string;
  allocationPercent: number;
  returnContributionPercent: number;
  riskContributionPercent: number;
  proposedBy?: string;
  implementedAt?: Date;
}

// ============================================================================
// Team Analytics Manager Interface
// ============================================================================

export interface TeamAnalyticsManager {
  recordTrade(trade: TradeRecord): void;
  recordSnapshot(snapshot: PortfolioSnapshot): void;
  setStrategies(portfolioId: string, strategies: StrategyRecord[]): void;

  getDashboard(
    portfolioId: string,
    members: Array<{ userId: string; role: PortfolioRoleName }>,
    activityLog: ActivityLogEntry[],
    periodLabel?: AnalyticsPeriod['label'],
  ): TeamAnalyticsDashboard;

  getPerformance(portfolioId: string, period?: AnalyticsPeriod): TeamPortfolioPerformance;
  getStrategyContributions(portfolioId: string): StrategyContribution[];
  getRiskExposure(portfolioId: string): TeamRiskExposure;
  getMemberActivity(
    portfolioId: string,
    members: Array<{ userId: string; role: PortfolioRoleName }>,
    activityLog: ActivityLogEntry[],
  ): MemberActivitySummary[];

  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

// ============================================================================
// Default Team Analytics Manager Implementation
// ============================================================================

export class DefaultTeamAnalyticsManager implements TeamAnalyticsManager {
  private readonly trades = new Map<string, TradeRecord[]>();
  private readonly snapshots = new Map<string, PortfolioSnapshot[]>();
  private readonly strategies = new Map<string, StrategyRecord[]>();
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];

  recordTrade(trade: TradeRecord): void {
    const existing = this.trades.get(trade.portfolioId) ?? [];
    this.trades.set(trade.portfolioId, [...existing, trade]);
  }

  recordSnapshot(snapshot: PortfolioSnapshot): void {
    const existing = this.snapshots.get(snapshot.portfolioId) ?? [];
    this.snapshots.set(snapshot.portfolioId, [...existing, snapshot]);
  }

  setStrategies(portfolioId: string, strategies: StrategyRecord[]): void {
    this.strategies.set(portfolioId, strategies);
  }

  getDashboard(
    portfolioId: string,
    members: Array<{ userId: string; role: PortfolioRoleName }>,
    activityLog: ActivityLogEntry[],
    periodLabel: AnalyticsPeriod['label'] = '30d',
  ): TeamAnalyticsDashboard {
    const period = this.buildPeriod(periodLabel);
    const filteredActivity = activityLog.filter(
      a => a.portfolioId === portfolioId &&
        a.timestamp >= period.start &&
        a.timestamp <= period.end,
    );

    const dashboard: TeamAnalyticsDashboard = {
      portfolioId,
      generatedAt: new Date(),
      period,
      portfolioPerformance: this.getPerformance(portfolioId, period),
      strategyContributions: this.getStrategyContributions(portfolioId),
      riskExposure: this.getRiskExposure(portfolioId),
      memberActivity: this.getMemberActivity(portfolioId, members, filteredActivity),
      recentActivities: filteredActivity.slice(-10), // last 10 activities
    };

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'report_generated',
      portfolioId,
      actorId: 'system',
      severity: 'info',
      source: 'TeamAnalyticsManager',
      message: `Team analytics dashboard generated for portfolio ${portfolioId}`,
      data: { portfolioId, periodLabel },
    });

    return dashboard;
  }

  getPerformance(portfolioId: string, period?: AnalyticsPeriod): TeamPortfolioPerformance {
    const snapshots = this.snapshots.get(portfolioId) ?? [];
    const trades = this.trades.get(portfolioId) ?? [];

    // Filter by period if provided
    const filteredTrades = period
      ? trades.filter(t => t.executedAt >= period.start && t.executedAt <= period.end)
      : trades;
    const filteredSnapshots = period
      ? snapshots.filter(s => s.timestamp >= period.start && s.timestamp <= period.end)
      : snapshots;

    const latestSnapshot = filteredSnapshots[filteredSnapshots.length - 1];
    const earliestSnapshot = filteredSnapshots[0];

    const totalValueUsd = latestSnapshot?.totalValueUsd ?? 0;
    const startValueUsd = earliestSnapshot?.totalValueUsd ?? totalValueUsd;

    const returnUsd = totalValueUsd - startValueUsd;
    const returnPercent = startValueUsd > 0 ? (returnUsd / startValueUsd) * 100 : 0;

    const profitableTrades = filteredTrades.filter(t => t.profitable === true).length;
    const totalTrades = filteredTrades.length;
    const winRate = totalTrades > 0 ? profitableTrades / totalTrades : 0;

    // Calculate volatility from daily returns (simplified)
    const dailyReturns = this.calculateDailyReturns(filteredSnapshots);
    const volatilityPercent = this.calculateVolatility(dailyReturns);
    const sharpeRatio = volatilityPercent > 0
      ? (returnPercent - 2) / volatilityPercent // assume 2% risk-free rate
      : 0;
    const maxDrawdownPercent = this.calculateMaxDrawdown(filteredSnapshots);

    return {
      totalValueUsd,
      returnPercent,
      returnUsd,
      sharpeRatio,
      maxDrawdownPercent,
      volatilityPercent,
      winRate,
      totalTrades,
      profitableTrades,
    };
  }

  getStrategyContributions(portfolioId: string): StrategyContribution[] {
    const strategies = this.strategies.get(portfolioId) ?? [];
    return strategies.map(s => ({
      strategyId: s.id,
      strategyName: s.name,
      allocationPercent: s.allocationPercent,
      returnContributionPercent: s.returnContributionPercent,
      riskContributionPercent: s.riskContributionPercent,
      proposedBy: s.proposedBy,
      implementedAt: s.implementedAt,
    }));
  }

  getRiskExposure(portfolioId: string): TeamRiskExposure {
    const snapshots = this.snapshots.get(portfolioId) ?? [];
    const latestSnapshot = snapshots[snapshots.length - 1];

    if (!latestSnapshot || latestSnapshot.allocations.length === 0) {
      return {
        overallRiskScore: 0,
        concentrationRisk: 0,
        liquidityRisk: 0,
        marketRisk: 0,
        topConcentrations: [],
        diversificationScore: 100,
      };
    }

    const allocations = latestSnapshot.allocations;
    const sortedByPercent = [...allocations].sort((a, b) => b.percent - a.percent);

    // Concentration risk: higher when top assets dominate
    const top3Percent = sortedByPercent.slice(0, 3).reduce((sum, a) => sum + a.percent, 0);
    const concentrationRisk = Math.min(100, top3Percent);

    // Diversification score: inverse of concentration
    const n = allocations.length;
    const herfindahlIndex = allocations.reduce((sum, a) => sum + (a.percent / 100) ** 2, 0);
    const diversificationScore = Math.max(0, Math.min(100, (1 - herfindahlIndex) * 100));

    // Market risk: simplified as volatility proxy based on concentration
    const marketRisk = concentrationRisk * 0.7;

    // Liquidity risk: simplified based on number of assets and concentration
    const liquidityRisk = n < 3 ? 70 : n < 5 ? 40 : 20;

    const overallRiskScore = (concentrationRisk + marketRisk + liquidityRisk) / 3;

    const topConcentrations = sortedByPercent.slice(0, 5).map(a => ({
      assetId: a.assetId,
      assetName: a.assetName,
      allocationPercent: a.percent,
      riskContributionPercent: (a.percent / 100) * concentrationRisk,
    }));

    return {
      overallRiskScore,
      concentrationRisk,
      liquidityRisk,
      marketRisk,
      topConcentrations,
      diversificationScore,
    };
  }

  getMemberActivity(
    portfolioId: string,
    members: Array<{ userId: string; role: PortfolioRoleName }>,
    activityLog: ActivityLogEntry[],
  ): MemberActivitySummary[] {
    return members.map(member => {
      const memberActivities = activityLog.filter(
        a => a.portfolioId === portfolioId && a.actorId === member.userId,
      );

      const tradesExecuted = memberActivities.filter(a => a.type === 'trade_executed').length;
      const strategiesProposed = memberActivities.filter(a => a.type === 'strategy_proposed').length;
      const strategiesApproved = memberActivities.filter(a => a.type === 'strategy_approved').length;
      const lastActivity = memberActivities[memberActivities.length - 1];

      return {
        userId: member.userId,
        role: member.role,
        totalActions: memberActivities.length,
        tradesExecuted,
        strategiesProposed,
        strategiesApproved,
        lastActivityAt: lastActivity?.timestamp,
      };
    });
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private buildPeriod(label: AnalyticsPeriod['label']): AnalyticsPeriod {
    const end = new Date();
    let start: Date;

    switch (label) {
      case '1d':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        start = new Date(0);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end, label };
  }

  private calculateDailyReturns(snapshots: PortfolioSnapshot[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1].totalValueUsd;
      const curr = snapshots[i].totalValueUsd;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }
    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // annualized volatility as percent
  }

  private calculateMaxDrawdown(snapshots: PortfolioSnapshot[]): number {
    if (snapshots.length === 0) return 0;
    let peak = snapshots[0].totalValueUsd;
    let maxDrawdown = 0;

    for (const snapshot of snapshots) {
      if (snapshot.totalValueUsd > peak) {
        peak = snapshot.totalValueUsd;
      }
      const drawdown = peak > 0 ? ((peak - snapshot.totalValueUsd) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createTeamAnalyticsManager(): DefaultTeamAnalyticsManager {
  return new DefaultTeamAnalyticsManager();
}
