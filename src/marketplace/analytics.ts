/**
 * TONAIAgent - Performance Analytics
 *
 * Comprehensive analytics engine for calculating ROI, Sharpe ratio, drawdowns,
 * win rate, volatility, time-weighted returns, and benchmark comparisons.
 */

import {
  PerformanceAnalytics,
  AnalyticsPeriod,
  ReturnMetrics,
  RiskMetrics,
  TradingMetrics,
  ComparisonMetrics,
  BenchmarkComparison,
  PeerRanking,
  TradingAgent,
  AgentPerformance,
  PerformanceSnapshot,
  StrategyCategory,
  MarketplaceEvent,
  MarketplaceEventCallback,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardType,
} from './types';

// ============================================================================
// Analytics Engine Interface
// ============================================================================

export interface AnalyticsEngine {
  // Performance calculations
  calculateAnalytics(agentId: string, period: AnalyticsPeriod): Promise<PerformanceAnalytics>;
  calculateReturns(snapshots: PerformanceSnapshot[], period: AnalyticsPeriod): ReturnMetrics;
  calculateRisk(snapshots: PerformanceSnapshot[], riskFreeRate?: number): RiskMetrics;
  calculateTrading(performance: AgentPerformance): TradingMetrics;

  // Comparisons
  calculateBenchmarkComparison(agentReturns: number[], benchmarkReturns: number[], benchmarkName: string): BenchmarkComparison;
  calculatePeerRanking(agentId: string, category: StrategyCategory): Promise<PeerRanking>;

  // Leaderboards
  generateLeaderboard(type: LeaderboardType, period: AnalyticsPeriod, category?: StrategyCategory): Promise<Leaderboard>;
  getLeaderboard(leaderboardId: string): Promise<Leaderboard | null>;

  // Historical data
  getHistoricalAnalytics(agentId: string, periods: AnalyticsPeriod[]): Promise<Map<AnalyticsPeriod, PerformanceAnalytics>>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default Analytics Engine Implementation
// ============================================================================

export class DefaultAnalyticsEngine implements AnalyticsEngine {
  private readonly analytics: Map<string, Map<AnalyticsPeriod, PerformanceAnalytics>> = new Map();
  private readonly leaderboards: Map<string, Leaderboard> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: AnalyticsEngineConfig;

  // Simulated agent data - in production would be fetched from database
  private readonly agents: Map<string, TradingAgent> = new Map();

  constructor(config?: Partial<AnalyticsEngineConfig>) {
    this.config = {
      riskFreeRate: config?.riskFreeRate ?? 0.05, // 5% annual risk-free rate
      benchmarks: config?.benchmarks ?? ['TON', 'BTC', 'ETH'],
      leaderboardCacheMinutes: config?.leaderboardCacheMinutes ?? 15,
      maxHistoryDays: config?.maxHistoryDays ?? 365,
      tradingDaysPerYear: config?.tradingDaysPerYear ?? 365, // Crypto trades 24/7
    };
  }

  async calculateAnalytics(agentId: string, period: AnalyticsPeriod): Promise<PerformanceAnalytics> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      // Create placeholder analytics for demo
      return this.createPlaceholderAnalytics(agentId, period);
    }

    const snapshots = agent.performance.performanceHistory;
    const filteredSnapshots = this.filterSnapshotsByPeriod(snapshots, period);

    const now = new Date();
    const analytics: PerformanceAnalytics = {
      agentId,
      period,
      returns: this.calculateReturns(filteredSnapshots, period),
      risk: this.calculateRisk(filteredSnapshots),
      trading: this.calculateTrading(agent.performance),
      comparison: await this.calculateComparisons(agentId, filteredSnapshots),
      generatedAt: now,
    };

    // Cache analytics
    let agentAnalytics = this.analytics.get(agentId);
    if (!agentAnalytics) {
      agentAnalytics = new Map();
      this.analytics.set(agentId, agentAnalytics);
    }
    agentAnalytics.set(period, analytics);

    return analytics;
  }

  calculateReturns(snapshots: PerformanceSnapshot[], period: AnalyticsPeriod): ReturnMetrics {
    if (snapshots.length === 0) {
      return this.createEmptyReturnMetrics();
    }

    const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const initialValue = sortedSnapshots[0].totalValue;
    const finalValue = sortedSnapshots[sortedSnapshots.length - 1].totalValue;

    // Calculate total return
    const totalReturn = initialValue > 0 ? ((finalValue - initialValue) / initialValue) * 100 : 0;
    const absoluteReturn = finalValue - initialValue;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < sortedSnapshots.length; i++) {
      const prevValue = sortedSnapshots[i - 1].totalValue;
      const currentValue = sortedSnapshots[i].totalValue;
      const dailyReturn = prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;
      dailyReturns.push(dailyReturn);
    }

    // Calculate weekly returns
    const weeklyReturns = this.aggregateReturns(sortedSnapshots, 7);

    // Calculate monthly returns
    const monthlyReturns = this.aggregateReturns(sortedSnapshots, 30);

    // Annualized return
    const periodDays = this.getPeriodDays(period);
    const annualizedReturn = periodDays > 0
      ? Math.pow(1 + totalReturn / 100, 365 / periodDays) * 100 - 100
      : 0;

    // Time-weighted return (simplified TWR calculation)
    const timeWeightedReturn = this.calculateTimeWeightedReturn(dailyReturns);

    // Money-weighted return (simplified IRR approximation)
    const moneyWeightedReturn = totalReturn; // Simplified for demo

    // Best/worst periods
    const bestDay = this.findBestPeriod(dailyReturns, sortedSnapshots, 1);
    const worstDay = this.findWorstPeriod(dailyReturns, sortedSnapshots, 1);
    const bestMonth = this.findBestPeriod(monthlyReturns, sortedSnapshots, 30);
    const worstMonth = this.findWorstPeriod(monthlyReturns, sortedSnapshots, 30);

    // Count positive/negative months
    const positiveMonths = monthlyReturns.filter(r => r > 0).length;
    const negativeMonths = monthlyReturns.filter(r => r < 0).length;

    return {
      totalReturn,
      absoluteReturn,
      annualizedReturn,
      dailyReturns,
      weeklyReturns,
      monthlyReturns,
      timeWeightedReturn,
      moneyWeightedReturn,
      bestDay,
      worstDay,
      bestMonth,
      worstMonth,
      positiveMonths,
      negativeMonths,
    };
  }

  calculateRisk(snapshots: PerformanceSnapshot[], riskFreeRate?: number): RiskMetrics {
    if (snapshots.length < 2) {
      return this.createEmptyRiskMetrics();
    }

    const rfRate = riskFreeRate ?? this.config.riskFreeRate;
    const dailyRfRate = rfRate / this.config.tradingDaysPerYear;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = snapshots[i - 1].totalValue;
      const currentValue = snapshots[i].totalValue;
      const dailyReturn = prevValue > 0 ? ((currentValue - prevValue) / prevValue) : 0;
      dailyReturns.push(dailyReturn);
    }

    // Volatility (standard deviation of returns)
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance) * 100;
    const annualizedVolatility = volatility * Math.sqrt(this.config.tradingDaysPerYear);

    // Sharpe Ratio = (Mean Return - Risk Free Rate) / Volatility
    const excessReturn = (meanReturn * this.config.tradingDaysPerYear) - rfRate;
    const sharpeRatio = annualizedVolatility > 0 ? excessReturn / (annualizedVolatility / 100) : 0;

    // Sortino Ratio (uses only downside deviation)
    const downsideReturns = dailyReturns.filter(r => r < dailyRfRate);
    const downsideVariance = downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + Math.pow(r - dailyRfRate, 2), 0) / downsideReturns.length
      : 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? excessReturn / (downsideDeviation * Math.sqrt(this.config.tradingDaysPerYear)) : 0;

    // Drawdown calculations
    const drawdowns = this.calculateDrawdowns(snapshots);
    const maxDrawdown = Math.min(...drawdowns.map(d => d.drawdown));
    const maxDrawdownDuration = this.calculateMaxDrawdownDuration(drawdowns);
    const avgDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((sum, d) => sum + d.drawdown, 0) / drawdowns.length
      : 0;
    const currentDrawdown = drawdowns.length > 0 ? drawdowns[drawdowns.length - 1].drawdown : 0;

    // Calmar Ratio = Annualized Return / Max Drawdown
    const annualizedReturn = meanReturn * this.config.tradingDaysPerYear * 100;
    const calmarRatio = maxDrawdown < 0 ? -annualizedReturn / maxDrawdown : 0;

    // Value at Risk (VaR) - 95% and 99%
    const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var99Index = Math.floor(sortedReturns.length * 0.01);
    const var95 = sortedReturns[var95Index] ? sortedReturns[var95Index] * 100 : 0;
    const var99 = sortedReturns[var99Index] ? sortedReturns[var99Index] * 100 : 0;

    // Conditional VaR (CVaR) / Expected Shortfall
    const tailReturns = sortedReturns.slice(0, var95Index + 1);
    const cvar95 = tailReturns.length > 0
      ? (tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length) * 100
      : 0;

    return {
      volatility,
      annualizedVolatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: Math.abs(maxDrawdown),
      maxDrawdownDuration,
      avgDrawdown: Math.abs(avgDrawdown),
      currentDrawdown: Math.abs(currentDrawdown),
      var95: Math.abs(var95),
      var99: Math.abs(var99),
      cvar95: Math.abs(cvar95),
    };
  }

  calculateTrading(performance: AgentPerformance): TradingMetrics {
    const totalTrades = performance.totalTrades;
    const winningTrades = performance.successfulTrades;
    const losingTrades = performance.failedTrades;

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate average win/loss from positions
    const positions = performance.currentPositions;
    const wins = positions.filter(p => p.pnl > 0);
    const losses = positions.filter(p => p.pnl < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, p) => sum + p.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0) / losses.length) : 0;

    // Profit factor = Gross Profit / Gross Loss
    const grossProfit = wins.reduce((sum, p) => sum + p.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Largest win/loss
    const largestWin = wins.length > 0 ? Math.max(...wins.map(p => p.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(p => p.pnl))) : 0;

    // Consecutive wins/losses (simplified)
    const consecutiveWins = this.calculateMaxConsecutive(positions.map(p => p.pnl > 0));
    const consecutiveLosses = this.calculateMaxConsecutive(positions.map(p => p.pnl < 0));

    // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
    const lossRate = totalTrades > 0 ? (losingTrades / totalTrades) : 0;
    const expectancy = ((winRate / 100) * avgWin) - (lossRate * avgLoss);

    // Average trades per day
    const history = performance.performanceHistory;
    const tradingDays = history.length > 0
      ? Math.max(1, (history[history.length - 1].timestamp.getTime() - history[0].timestamp.getTime()) / (24 * 60 * 60 * 1000))
      : 1;
    const avgTradesPerDay = totalTrades / tradingDays;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgHoldingPeriod: performance.avgHoldingPeriod,
      avgTradesPerDay,
      largestWin,
      largestLoss,
      consecutiveWins,
      consecutiveLosses,
      expectancy,
    };
  }

  calculateBenchmarkComparison(
    agentReturns: number[],
    benchmarkReturns: number[],
    benchmarkName: string
  ): BenchmarkComparison {
    if (agentReturns.length === 0 || benchmarkReturns.length === 0) {
      return {
        benchmark: benchmarkName,
        benchmarkReturn: 0,
        agentReturn: 0,
        outperformance: 0,
        trackingError: 0,
        informationRatio: 0,
      };
    }

    // Calculate cumulative returns
    const agentCumReturn = agentReturns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;
    const benchmarkCumReturn = benchmarkReturns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;

    const agentReturn = agentCumReturn * 100;
    const benchmarkReturn = benchmarkCumReturn * 100;
    const outperformance = agentReturn - benchmarkReturn;

    // Tracking error (standard deviation of return differences)
    const returnDifferences: number[] = [];
    const minLength = Math.min(agentReturns.length, benchmarkReturns.length);
    for (let i = 0; i < minLength; i++) {
      returnDifferences.push(agentReturns[i] - benchmarkReturns[i]);
    }

    const meanDiff = returnDifferences.reduce((a, b) => a + b, 0) / returnDifferences.length;
    const trackingVariance = returnDifferences.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / returnDifferences.length;
    const trackingError = Math.sqrt(trackingVariance);

    // Information Ratio = Outperformance / Tracking Error
    const informationRatio = trackingError > 0 ? meanDiff / trackingError : 0;

    return {
      benchmark: benchmarkName,
      benchmarkReturn,
      agentReturn,
      outperformance,
      trackingError,
      informationRatio,
    };
  }

  async calculatePeerRanking(agentId: string, category: StrategyCategory): Promise<PeerRanking> {
    // Get all agents in category
    const categoryAgents = Array.from(this.agents.values()).filter(
      a => a.id !== agentId // Exclude self for demo
    );

    const totalAgents = categoryAgents.length + 1; // Include self

    // Calculate rankings by different metrics
    const agent = this.agents.get(agentId);
    const agentReturn = agent?.performance.totalPnlPercent ?? 0;

    // Sort by returns to get rank
    const returnRanks = categoryAgents
      .map(a => a.performance.totalPnlPercent)
      .concat(agentReturn)
      .sort((a, b) => b - a);
    const returnRank = returnRanks.indexOf(agentReturn) + 1;

    const percentile = totalAgents > 1 ? ((totalAgents - returnRank) / (totalAgents - 1)) * 100 : 100;

    return {
      category,
      totalAgents,
      rank: returnRank,
      percentile,
      rankByMetric: {
        returns: returnRank,
        sharpe: Math.ceil(totalAgents / 2), // Placeholder
        drawdown: Math.ceil(totalAgents / 2),
        winRate: Math.ceil(totalAgents / 2),
      },
    };
  }

  async generateLeaderboard(
    type: LeaderboardType,
    period: AnalyticsPeriod,
    category?: StrategyCategory
  ): Promise<Leaderboard> {
    const leaderboardId = `${type}_${period}_${category ?? 'all'}`;
    const now = new Date();

    // Generate entries based on type
    const entries = await this.generateLeaderboardEntries(type, period, category);

    const leaderboard: Leaderboard = {
      id: leaderboardId,
      name: this.getLeaderboardName(type),
      type,
      period,
      category,
      entries,
      generatedAt: now,
      nextUpdate: new Date(now.getTime() + this.config.leaderboardCacheMinutes * 60 * 1000),
    };

    this.leaderboards.set(leaderboardId, leaderboard);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'leaderboard_updated',
      severity: 'info',
      source: 'analytics_engine',
      message: `Leaderboard ${type} updated`,
      data: { leaderboardId, entriesCount: entries.length },
    });

    return leaderboard;
  }

  async getLeaderboard(leaderboardId: string): Promise<Leaderboard | null> {
    return this.leaderboards.get(leaderboardId) ?? null;
  }

  async getHistoricalAnalytics(
    agentId: string,
    periods: AnalyticsPeriod[]
  ): Promise<Map<AnalyticsPeriod, PerformanceAnalytics>> {
    const results = new Map<AnalyticsPeriod, PerformanceAnalytics>();

    for (const period of periods) {
      const analytics = await this.calculateAnalytics(agentId, period);
      results.set(period, analytics);
    }

    return results;
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private filterSnapshotsByPeriod(
    snapshots: PerformanceSnapshot[],
    period: AnalyticsPeriod
  ): PerformanceSnapshot[] {
    const now = new Date();
    const periodDays = this.getPeriodDays(period);

    if (periodDays === 0) {
      return snapshots; // All time
    }

    const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    return snapshots.filter(s => s.timestamp >= cutoff);
  }

  private getPeriodDays(period: AnalyticsPeriod): number {
    const periodMap: Record<AnalyticsPeriod, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
      'all_time': 0,
      'custom': 0,
    };
    return periodMap[period] ?? 0;
  }

  private aggregateReturns(snapshots: PerformanceSnapshot[], periodDays: number): number[] {
    const returns: number[] = [];
    if (snapshots.length < 2) return returns;

    let periodStart = 0;
    for (let i = periodDays; i < snapshots.length; i += periodDays) {
      const startValue = snapshots[periodStart].totalValue;
      const endValue = snapshots[Math.min(i, snapshots.length - 1)].totalValue;
      const periodReturn = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
      returns.push(periodReturn);
      periodStart = i;
    }

    return returns;
  }

  private calculateTimeWeightedReturn(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;

    // TWR = Product of (1 + daily return) - 1
    const twr = dailyReturns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1;
    return twr * 100;
  }

  private findBestPeriod(
    returns: number[],
    snapshots: PerformanceSnapshot[],
    periodDays: number
  ): { date: Date; return: number } {
    if (returns.length === 0) {
      return { date: new Date(), return: 0 };
    }

    const maxReturn = Math.max(...returns);
    const index = returns.indexOf(maxReturn);
    const snapshotIndex = Math.min(index * periodDays + periodDays, snapshots.length - 1);

    return {
      date: snapshots[snapshotIndex]?.timestamp ?? new Date(),
      return: maxReturn,
    };
  }

  private findWorstPeriod(
    returns: number[],
    snapshots: PerformanceSnapshot[],
    periodDays: number
  ): { date: Date; return: number } {
    if (returns.length === 0) {
      return { date: new Date(), return: 0 };
    }

    const minReturn = Math.min(...returns);
    const index = returns.indexOf(minReturn);
    const snapshotIndex = Math.min(index * periodDays + periodDays, snapshots.length - 1);

    return {
      date: snapshots[snapshotIndex]?.timestamp ?? new Date(),
      return: minReturn,
    };
  }

  private calculateDrawdowns(snapshots: PerformanceSnapshot[]): Array<{ timestamp: Date; drawdown: number }> {
    const drawdowns: Array<{ timestamp: Date; drawdown: number }> = [];
    let peak = 0;

    for (const snapshot of snapshots) {
      if (snapshot.totalValue > peak) {
        peak = snapshot.totalValue;
      }
      const drawdown = peak > 0 ? ((snapshot.totalValue - peak) / peak) * 100 : 0;
      drawdowns.push({ timestamp: snapshot.timestamp, drawdown });
    }

    return drawdowns;
  }

  private calculateMaxDrawdownDuration(drawdowns: Array<{ timestamp: Date; drawdown: number }>): number {
    if (drawdowns.length === 0) return 0;

    let maxDuration = 0;
    let currentDuration = 0;
    let inDrawdown = false;

    for (const dd of drawdowns) {
      if (dd.drawdown < 0) {
        if (!inDrawdown) {
          inDrawdown = true;
          currentDuration = 1;
        } else {
          currentDuration++;
        }
        maxDuration = Math.max(maxDuration, currentDuration);
      } else {
        inDrawdown = false;
        currentDuration = 0;
      }
    }

    return maxDuration;
  }

  private calculateMaxConsecutive(results: boolean[]): number {
    let maxConsecutive = 0;
    let current = 0;

    for (const result of results) {
      if (result) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }

    return maxConsecutive;
  }

  private async calculateComparisons(
    agentId: string,
    _snapshots: PerformanceSnapshot[]
  ): Promise<ComparisonMetrics> {
    const benchmarks: BenchmarkComparison[] = [];

    // Generate placeholder benchmark comparisons
    for (const benchmark of this.config.benchmarks) {
      benchmarks.push({
        benchmark,
        benchmarkReturn: Math.random() * 20 - 10, // Placeholder
        agentReturn: Math.random() * 30 - 5,
        outperformance: Math.random() * 20 - 10,
        trackingError: Math.random() * 5,
        informationRatio: Math.random() * 2 - 0.5,
      });
    }

    // Get peer ranking
    const peerRanking = await this.calculatePeerRanking(agentId, 'arbitrage');

    return {
      benchmarks,
      peerRanking,
      categoryAverage: Math.random() * 15,
    };
  }

  private async generateLeaderboardEntries(
    type: LeaderboardType,
    _period: AnalyticsPeriod,
    _category?: StrategyCategory
  ): Promise<LeaderboardEntry[]> {
    // Generate placeholder entries for demo
    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < 10; i++) {
      entries.push({
        rank: i + 1,
        previousRank: Math.random() > 0.5 ? i + 1 + Math.floor(Math.random() * 3) : undefined,
        agentId: `agent_${i + 1}`,
        name: `Agent ${i + 1}`,
        score: 100 - i * 8 + Math.random() * 5,
        change: Math.random() * 10 - 5,
        metric: this.getLeaderboardMetric(type),
        secondaryMetrics: {
          returns: 20 - i + Math.random() * 10,
          followers: 100 - i * 8,
          aum: 10000 - i * 800,
        },
      });
    }

    return entries;
  }

  private getLeaderboardName(type: LeaderboardType): string {
    const names: Record<LeaderboardType, string> = {
      top_performers: 'Top Performers',
      top_risk_adjusted: 'Best Risk-Adjusted Returns',
      most_followed: 'Most Followed',
      highest_aum: 'Highest AUM',
      most_consistent: 'Most Consistent',
      rising_stars: 'Rising Stars',
      top_creators: 'Top Creators',
    };
    return names[type] ?? type;
  }

  private getLeaderboardMetric(type: LeaderboardType): string {
    const metrics: Record<LeaderboardType, string> = {
      top_performers: 'ROI',
      top_risk_adjusted: 'Sharpe Ratio',
      most_followed: 'Followers',
      highest_aum: 'AUM (TON)',
      most_consistent: 'Consistency Score',
      rising_stars: 'Growth Rate',
      top_creators: 'Total Earnings',
    };
    return metrics[type] ?? 'Score';
  }

  private createPlaceholderAnalytics(agentId: string, period: AnalyticsPeriod): PerformanceAnalytics {
    return {
      agentId,
      period,
      returns: this.createEmptyReturnMetrics(),
      risk: this.createEmptyRiskMetrics(),
      trading: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        avgHoldingPeriod: 0,
        avgTradesPerDay: 0,
        largestWin: 0,
        largestLoss: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        expectancy: 0,
      },
      comparison: {
        benchmarks: [],
        peerRanking: {
          category: 'arbitrage',
          totalAgents: 0,
          rank: 0,
          percentile: 0,
          rankByMetric: {},
        },
        categoryAverage: 0,
      },
      generatedAt: new Date(),
    };
  }

  private createEmptyReturnMetrics(): ReturnMetrics {
    return {
      totalReturn: 0,
      absoluteReturn: 0,
      annualizedReturn: 0,
      dailyReturns: [],
      weeklyReturns: [],
      monthlyReturns: [],
      timeWeightedReturn: 0,
      moneyWeightedReturn: 0,
      bestDay: { date: new Date(), return: 0 },
      worstDay: { date: new Date(), return: 0 },
      bestMonth: { date: new Date(), return: 0 },
      worstMonth: { date: new Date(), return: 0 },
      positiveMonths: 0,
      negativeMonths: 0,
    };
  }

  private createEmptyRiskMetrics(): RiskMetrics {
    return {
      volatility: 0,
      annualizedVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      avgDrawdown: 0,
      currentDrawdown: 0,
      var95: 0,
      var99: 0,
      cvar95: 0,
    };
  }

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
// Configuration Types
// ============================================================================

export interface AnalyticsEngineConfig {
  riskFreeRate: number;
  benchmarks: string[];
  leaderboardCacheMinutes: number;
  maxHistoryDays: number;
  tradingDaysPerYear: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAnalyticsEngine(config?: Partial<AnalyticsEngineConfig>): DefaultAnalyticsEngine {
  return new DefaultAnalyticsEngine(config);
}
