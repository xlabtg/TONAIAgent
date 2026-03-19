/**
 * TONAIAgent — Analytics Service (Issue #255, extended in Issue #259)
 *
 * Computes trade history metrics, portfolio performance statistics,
 * analytics dashboards, and multi-agent portfolio-level metrics.
 *
 * Architecture:
 *   Execution Engine → Trade Storage (taa_agent_executions)
 *     → Analytics Engine (this service)
 *       → /api/trades  /api/analytics  /api/portfolio/history
 *       → /api/portfolio/metrics  (portfolio-level, Issue #259)
 */

// ============================================================================
// Types
// ============================================================================

export interface TradeRecord {
  id: number;
  userId: number;
  strategy: string;
  pair: string;
  side: 'buy' | 'sell' | 'hold' | 'none';
  amount: number;
  executionPrice: number | null;
  pnl: number;
  slippageBps: number | null;
  dex: string | null;
  status: 'pending' | 'completed' | 'failed';
  mode: 'demo' | 'live';
  createdAt: Date;
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
}

export interface AnalyticsMetrics {
  totalTrades: number;
  executedTrades: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
}

export interface TradeDistribution {
  strategy: string;
  count: number;
  totalPnl: number;
  winRate: number;
}

export interface AnalyticsResult {
  metrics: AnalyticsMetrics;
  byStrategy: TradeDistribution[];
  equityCurve: PortfolioSnapshot[];
}

// ============================================================================
// Portfolio-Level Metrics (Issue #259)
// ============================================================================

/**
 * Per-agent allocation entry used when computing portfolio-level metrics.
 */
export interface AgentAllocationEntry {
  agentId: string;
  strategy: string;
  /** Fraction of total portfolio [0..1]. */
  allocationFraction: number;
}

/**
 * Portfolio-level analytics combining metrics across all agents.
 *
 * ```ts
 * {
 *   portfolioPnL,        // total PnL across all strategies
 *   diversificationScore,// 0-100: higher = better diversified
 *   riskExposure,        // 0-100: higher = more concentrated risk
 * }
 * ```
 */
export interface PortfolioMetrics {
  /** Combined PnL across all strategy agents. */
  portfolioPnL: number;
  /**
   * Diversification score [0..100].
   * Based on the Herfindahl-Hirschman Index (HHI):
   *   HHI = Σ(allocation_i²) ; score = (1 - HHI) × 100
   * Score of 100 = perfectly equal allocation; 0 = single strategy.
   */
  diversificationScore: number;
  /**
   * Risk exposure index [0..100].
   * Weighted average of per-strategy drawdown, scaled by allocation.
   * Higher value = more capital allocated to high-drawdown strategies.
   */
  riskExposure: number;
  /** Number of active strategy agents. */
  activeAgents: number;
  /** Per-strategy breakdown contributing to these metrics. */
  byStrategy: Array<{
    strategy: string;
    allocationFraction: number;
    pnl: number;
    maxDrawdown: number;
    contribution: number; // allocationFraction * pnl
  }>;
}

// ============================================================================
// Analytics Engine
// ============================================================================

export class AnalyticsService {
  /**
   * Compute aggregate metrics for a list of trade records.
   */
  computeMetrics(trades: TradeRecord[]): AnalyticsMetrics {
    const totalTrades = trades.length;

    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        executedTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
        bestTrade: 0,
        worstTrade: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
      };
    }

    const executed = trades.filter(t => t.side === 'buy' || t.side === 'sell');
    const pnlValues = executed.map(t => t.pnl);

    const winners = pnlValues.filter(p => p > 0);
    const losers = pnlValues.filter(p => p < 0);

    const totalPnL = pnlValues.reduce((s, p) => s + p, 0);
    const avgPnL = executed.length > 0 ? totalPnL / executed.length : 0;
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;
    const winRate = executed.length > 0 ? (winners.length / executed.length) * 100 : 0;

    const grossProfit = winners.reduce((s, p) => s + p, 0);
    const grossLoss = Math.abs(losers.reduce((s, p) => s + p, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const sharpeRatio = this._sharpeRatio(pnlValues);
    const maxDrawdown = this._maxDrawdown(pnlValues);

    return {
      totalTrades,
      executedTrades: executed.length,
      winRate,
      totalPnL,
      avgPnL,
      bestTrade,
      worstTrade,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
    };
  }

  /**
   * Break down metrics per strategy.
   */
  computeByStrategy(trades: TradeRecord[]): TradeDistribution[] {
    const map = new Map<string, TradeRecord[]>();
    for (const t of trades) {
      const bucket = map.get(t.strategy) ?? [];
      bucket.push(t);
      map.set(t.strategy, bucket);
    }

    const result: TradeDistribution[] = [];
    for (const [strategy, group] of map.entries()) {
      const executed = group.filter(t => t.side === 'buy' || t.side === 'sell');
      const winners = executed.filter(t => t.pnl > 0);
      result.push({
        strategy,
        count: executed.length,
        totalPnl: executed.reduce((s, t) => s + t.pnl, 0),
        winRate: executed.length > 0 ? (winners.length / executed.length) * 100 : 0,
      });
    }

    return result.sort((a, b) => b.totalPnl - a.totalPnl);
  }

  /**
   * Build an equity curve from portfolio snapshots.
   * When no snapshots are available, derive a simple curve from trade PnL.
   */
  buildEquityCurve(
    trades: TradeRecord[],
    existingSnapshots: PortfolioSnapshot[],
    initialValue: number,
  ): PortfolioSnapshot[] {
    if (existingSnapshots.length > 0) {
      return existingSnapshots.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Derive daily curve from sorted trades
    const byDay = new Map<string, number>();
    for (const t of trades) {
      const day = t.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + t.pnl);
    }

    const days = Array.from(byDay.keys()).sort();
    let cumPnl = 0;
    return days.map(date => {
      const pnl = byDay.get(date) ?? 0;
      cumPnl += pnl;
      return {
        date,
        portfolioValue: initialValue + cumPnl,
        realizedPnl: cumPnl,
        unrealizedPnl: 0,
        totalPnl: cumPnl,
      };
    });
  }

  /**
   * Full analytics result combining all computed data.
   */
  computeAll(
    trades: TradeRecord[],
    snapshots: PortfolioSnapshot[],
    initialValue: number,
  ): AnalyticsResult {
    return {
      metrics: this.computeMetrics(trades),
      byStrategy: this.computeByStrategy(trades),
      equityCurve: this.buildEquityCurve(trades, snapshots, initialValue),
    };
  }

  // ============================================================================
  // Portfolio-Level Metrics (Issue #259)
  // ============================================================================

  /**
   * Compute portfolio-level metrics across multiple strategy agents.
   *
   * @param trades - all trade records across all agents/strategies
   * @param allocations - current agent allocation fractions
   * @returns PortfolioMetrics with portfolioPnL, diversificationScore, riskExposure
   */
  computePortfolioMetrics(
    trades: TradeRecord[],
    allocations: AgentAllocationEntry[],
  ): PortfolioMetrics {
    const distributions = this.computeByStrategy(trades);

    // Map strategy → distribution for quick lookup
    const distByStrategy = new Map(distributions.map(d => [d.strategy, d]));

    // Map strategy → max drawdown
    const drawdownByStrategy = new Map<string, number>();
    const tradesByStrategy = new Map<string, TradeRecord[]>();
    for (const t of trades) {
      const bucket = tradesByStrategy.get(t.strategy) ?? [];
      bucket.push(t);
      tradesByStrategy.set(t.strategy, bucket);
    }
    for (const [strategy, group] of tradesByStrategy.entries()) {
      const pnls = group
        .filter(t => t.side === 'buy' || t.side === 'sell')
        .map(t => t.pnl);
      drawdownByStrategy.set(strategy, this._maxDrawdown(pnls));
    }

    // Normalise allocations (should already sum to 1, but guard against drift)
    const totalFraction = allocations.reduce((s, a) => s + a.allocationFraction, 0);
    const normalised = totalFraction > 0
      ? allocations.map(a => ({ ...a, allocationFraction: a.allocationFraction / totalFraction }))
      : allocations;

    // Build per-strategy breakdown
    const byStrategy = normalised.map(entry => {
      const dist = distByStrategy.get(entry.strategy);
      const pnl = dist?.totalPnl ?? 0;
      const maxDrawdown = drawdownByStrategy.get(entry.strategy) ?? 0;
      return {
        strategy: entry.strategy,
        allocationFraction: entry.allocationFraction,
        pnl,
        maxDrawdown,
        contribution: entry.allocationFraction * pnl,
      };
    });

    const portfolioPnL = byStrategy.reduce((s, b) => s + b.pnl, 0);

    // Diversification score via HHI
    const hhi = normalised.reduce((s, a) => s + Math.pow(a.allocationFraction, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    // Risk exposure: weighted avg drawdown (0-100)
    const riskExposure = Math.min(
      100,
      Math.round(
        byStrategy.reduce((s, b) => s + b.allocationFraction * b.maxDrawdown, 0),
      ),
    );

    return {
      portfolioPnL,
      diversificationScore,
      riskExposure,
      activeAgents: allocations.length,
      byStrategy,
    };
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private _sharpeRatio(returns: number[], riskFreeRate = 0): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
      returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return (mean - riskFreeRate) / stdDev;
  }

  private _maxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    let peak = 0;
    let cumPnl = 0;
    let maxDD = 0;

    for (const r of returns) {
      cumPnl += r;
      if (cumPnl > peak) peak = cumPnl;
      const drawdown = peak > 0 ? ((peak - cumPnl) / peak) * 100 : 0;
      if (drawdown > maxDD) maxDD = drawdown;
    }

    return maxDD;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

// ============================================================================
// Portfolio Risk Analytics (Issue #269)
// Real-time drawdown tracking, per-asset exposure, rolling loss windows
// ============================================================================

export interface PortfolioRiskSnapshot {
  /** Current portfolio value in USD */
  currentValueUsd: number;
  /** Peak portfolio value in USD */
  peakValueUsd: number;
  /** Current drawdown from peak (percent) */
  drawdownPercent: number;
  /** Total exposure (sum of open positions) as percent of portfolio */
  exposurePercent: number;
  /** Cumulative loss over the last 24 hours in USD */
  loss24hUsd: number;
  /** Cumulative loss over the last 7 days in USD */
  loss7dUsd: number;
  /** Concentration risk: normalized HHI (0–1, 1 = fully concentrated) */
  concentrationRisk: number;
  /** Per-asset exposure breakdown */
  assetExposures: Array<{ assetId: string; valueUsd: number; percent: number }>;
  /** Timestamp of this snapshot */
  timestamp: Date;
}

interface RollingLossEntry {
  timestamp: number;
  lossUsd: number;
}

/**
 * PortfolioRiskAnalytics provides real-time risk tracking for a single portfolio.
 *
 * Tracks:
 *   - Real-time drawdown from peak
 *   - Per-asset exposure and concentration (HHI)
 *   - Rolling loss windows (24h, 7d)
 */
export class PortfolioRiskAnalytics {
  private peakValueUsd = 0;
  private readonly lossHistory: RollingLossEntry[] = [];

  /**
   * Compute a full risk snapshot from current portfolio state.
   *
   * @param currentValueUsd   - current portfolio value
   * @param assetPositions    - open positions by asset
   * @param recentPnlHistory  - array of { timestamp, pnlUsd } for rolling loss tracking
   */
  snapshot(
    currentValueUsd: number,
    assetPositions: Array<{ assetId: string; valueUsd: number }>,
    recentPnlHistory: Array<{ timestamp: number; pnlUsd: number }> = [],
  ): PortfolioRiskSnapshot {
    // Update peak
    if (currentValueUsd > this.peakValueUsd) {
      this.peakValueUsd = currentValueUsd;
    }

    // Drawdown
    const drawdownPercent = this.peakValueUsd > 0
      ? Math.max(0, ((this.peakValueUsd - currentValueUsd) / this.peakValueUsd) * 100)
      : 0;

    // Exposure
    const totalExposureUsd = assetPositions.reduce((s, p) => s + p.valueUsd, 0);
    const exposurePercent = currentValueUsd > 0
      ? Math.min(100, (totalExposureUsd / currentValueUsd) * 100)
      : 0;

    // Per-asset breakdown
    const assetExposures = assetPositions.map(p => ({
      assetId: p.assetId,
      valueUsd: p.valueUsd,
      percent: totalExposureUsd > 0 ? (p.valueUsd / totalExposureUsd) * 100 : 0,
    }));

    // Concentration risk (HHI)
    const hhi = assetPositions.length > 0
      ? assetPositions.reduce((acc, p) => {
          const share = totalExposureUsd > 0 ? p.valueUsd / totalExposureUsd : 0;
          return acc + share * share;
        }, 0)
      : 0;
    const concentrationRisk = Math.min(1, hhi); // normalized 0–1

    // Rolling loss windows from provided history
    const now = Date.now();
    const window24h = now - 24 * 60 * 60 * 1000;
    const window7d = now - 7 * 24 * 60 * 60 * 1000;

    const loss24hUsd = recentPnlHistory
      .filter(e => e.timestamp > window24h && e.pnlUsd < 0)
      .reduce((s, e) => s + Math.abs(e.pnlUsd), 0);

    const loss7dUsd = recentPnlHistory
      .filter(e => e.timestamp > window7d && e.pnlUsd < 0)
      .reduce((s, e) => s + Math.abs(e.pnlUsd), 0);

    return {
      currentValueUsd,
      peakValueUsd: this.peakValueUsd,
      drawdownPercent,
      exposurePercent,
      loss24hUsd,
      loss7dUsd,
      concentrationRisk,
      assetExposures,
      timestamp: new Date(),
    };
  }

  /**
   * Compute real-time drawdown without full snapshot overhead.
   */
  getDrawdown(currentValueUsd: number): number {
    if (currentValueUsd > this.peakValueUsd) this.peakValueUsd = currentValueUsd;
    return this.peakValueUsd > 0
      ? Math.max(0, ((this.peakValueUsd - currentValueUsd) / this.peakValueUsd) * 100)
      : 0;
  }

  /** Reset the peak value (e.g. at start of new period). */
  resetPeak(): void {
    this.peakValueUsd = 0;
  }

  /** Returns current tracked peak value. */
  getPeak(): number {
    return this.peakValueUsd;
  }
}

export function createPortfolioRiskAnalytics(): PortfolioRiskAnalytics {
  return new PortfolioRiskAnalytics();
}

// ============================================================================
// Creator / Strategy Analytics Extension (Issue #273)
// Metrics per strategy creator: subscriber count, revenue generated, trade stats
// ============================================================================

/**
 * Aggregated analytics for a single strategy creator.
 */
export interface CreatorAnalytics {
  /** Creator user ID */
  creatorId: string;
  /** Creator display name */
  creatorName: string;
  /** Number of strategies published */
  strategyCount: number;
  /** Total active subscribers across all strategies */
  totalSubscribers: number;
  /** Total revenue generated across all strategies (USD) */
  totalRevenueUsd: number;
  /** Total trades executed across all strategies */
  totalTrades: number;
  /** Weighted average win rate (0–100) */
  avgWinRate: number;
  /** Best strategy ROI (30-day) */
  bestRoi30d: number;
  /** Last updated ISO timestamp */
  updatedAt: string;
}

/**
 * Per-strategy breakdown for a creator analytics view.
 */
export interface CreatorStrategyBreakdown {
  /** Strategy ID */
  strategyId: string;
  /** Strategy name */
  strategyName: string;
  /** Active subscriber count */
  subscriberCount: number;
  /** Revenue generated (USD) */
  revenueUsd: number;
  /** Win rate (0–100) */
  winRate: number;
  /** 30-day ROI */
  roi30d: number;
  /** Total trades */
  totalTrades: number;
}

/** Input entry for computing creator analytics */
export interface CreatorStrategyInput {
  strategyId: string;
  strategyName: string;
  subscriberCount: number;
  revenueUsd: number;
  trades: TradeRecord[];
  roi30d: number;
}

/**
 * Compute aggregated analytics for a strategy creator.
 *
 * @param creatorId   - Creator user ID
 * @param creatorName - Creator display name
 * @param strategies  - Array of strategy inputs with their trades
 */
export function computeCreatorAnalytics(
  creatorId: string,
  creatorName: string,
  strategies: CreatorStrategyInput[]
): { summary: CreatorAnalytics; breakdown: CreatorStrategyBreakdown[] } {
  const svc = new AnalyticsService();
  let totalSubscribers = 0;
  let totalRevenueUsd = 0;
  let totalTrades = 0;
  let totalWinRate = 0;
  let bestRoi30d = 0;

  const breakdown: CreatorStrategyBreakdown[] = [];

  for (const s of strategies) {
    const metrics = svc.computeMetrics(s.trades);
    totalSubscribers += s.subscriberCount;
    totalRevenueUsd += s.revenueUsd;
    totalTrades += metrics.executedTrades;
    totalWinRate += metrics.winRate;
    if (s.roi30d > bestRoi30d) bestRoi30d = s.roi30d;

    breakdown.push({
      strategyId: s.strategyId,
      strategyName: s.strategyName,
      subscriberCount: s.subscriberCount,
      revenueUsd: s.revenueUsd,
      winRate: metrics.winRate,
      roi30d: s.roi30d,
      totalTrades: metrics.executedTrades,
    });
  }

  const avgWinRate = strategies.length > 0 ? totalWinRate / strategies.length : 0;

  const summary: CreatorAnalytics = {
    creatorId,
    creatorName,
    strategyCount: strategies.length,
    totalSubscribers,
    totalRevenueUsd,
    totalTrades,
    avgWinRate,
    bestRoi30d,
    updatedAt: new Date().toISOString(),
  };

  return { summary, breakdown };
}

// ============================================================================
// Growth Metrics (Issue #277)
// Referral conversion tracking, LTV estimation, CAC approximation,
// and referral leaderboard computation.
// ============================================================================

/**
 * Input record for computing growth metrics.
 * Each entry represents one referred user and their lifetime activity.
 */
export interface ReferralGrowthRecord {
  /** Referred user ID */
  referredUserId: string;
  /** User who sent the referral */
  referrerId: string;
  /** Referral status */
  status: 'pending' | 'active' | 'rewarded';
  /** Total revenue generated by this user in USD (lifetime) */
  lifetimeRevenueUsd: number;
  /** Acquisition cost for this channel/campaign in USD (0 if organic/referral) */
  acquisitionCostUsd: number;
  /** Date this user was acquired (ISO string) */
  acquiredAt: string;
}

/**
 * Aggregate growth metrics for a referral programme.
 */
export interface GrowthMetrics {
  /** Total referrals created (pending + active + rewarded) */
  totalReferrals: number;
  /** Referrals that reached 'active' or 'rewarded' status */
  convertedReferrals: number;
  /** Conversion rate: converted / total (0–100) */
  conversionRate: number;
  /** Average Lifetime Value per acquired user in USD */
  avgLtv: number;
  /** Total revenue generated by referred users in USD */
  totalLtvUsd: number;
  /** Approximate Customer Acquisition Cost in USD (total cost / converted) */
  estimatedCac: number;
  /** LTV : CAC ratio (higher = better unit economics) */
  ltvCacRatio: number;
}

/**
 * Single entry in the referral leaderboard.
 */
export interface ReferralLeaderboardEntry {
  rank: number;
  referrerId: string;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalLtvUsd: number;
}

/**
 * Compute aggregate growth metrics from a set of referral records.
 */
export function computeGrowthMetrics(
  records: ReferralGrowthRecord[],
): GrowthMetrics {
  const total = records.length;

  if (total === 0) {
    return {
      totalReferrals: 0,
      convertedReferrals: 0,
      conversionRate: 0,
      avgLtv: 0,
      totalLtvUsd: 0,
      estimatedCac: 0,
      ltvCacRatio: 0,
    };
  }

  const converted = records.filter(
    r => r.status === 'active' || r.status === 'rewarded',
  );
  const convertedCount = converted.length;
  const conversionRate = (convertedCount / total) * 100;

  const totalLtvUsd = records.reduce((s, r) => s + r.lifetimeRevenueUsd, 0);
  const avgLtv = total > 0 ? totalLtvUsd / total : 0;

  const totalAcquisitionCost = records.reduce(
    (s, r) => s + r.acquisitionCostUsd,
    0,
  );
  const estimatedCac =
    convertedCount > 0 ? totalAcquisitionCost / convertedCount : 0;

  const ltvCacRatio = estimatedCac > 0 ? avgLtv / estimatedCac : 0;

  return {
    totalReferrals: total,
    convertedReferrals: convertedCount,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgLtv: Math.round(avgLtv * 100) / 100,
    totalLtvUsd: Math.round(totalLtvUsd * 100) / 100,
    estimatedCac: Math.round(estimatedCac * 100) / 100,
    ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
  };
}

/**
 * Build a leaderboard of top referrers sorted by total LTV generated.
 *
 * @param records  - Referral growth records
 * @param topN     - Maximum entries to return (default: 20)
 */
export function buildReferralLeaderboard(
  records: ReferralGrowthRecord[],
  topN = 20,
): ReferralLeaderboardEntry[] {
  // Aggregate by referrerId
  const referrerMap = new Map<
    string,
    { total: number; converted: number; ltv: number }
  >();

  for (const r of records) {
    const entry = referrerMap.get(r.referrerId) ?? {
      total: 0,
      converted: 0,
      ltv: 0,
    };
    entry.total += 1;
    if (r.status === 'active' || r.status === 'rewarded') {
      entry.converted += 1;
    }
    entry.ltv += r.lifetimeRevenueUsd;
    referrerMap.set(r.referrerId, entry);
  }

  // Sort by total LTV descending, then by converted count as tiebreaker
  const sorted = Array.from(referrerMap.entries())
    .sort(([, a], [, b]) => {
      if (b.ltv !== a.ltv) return b.ltv - a.ltv;
      return b.converted - a.converted;
    })
    .slice(0, topN);

  return sorted.map(([referrerId, data], idx) => ({
    rank: idx + 1,
    referrerId,
    totalReferrals: data.total,
    convertedReferrals: data.converted,
    conversionRate:
      data.total > 0
        ? Math.round((data.converted / data.total) * 10000) / 100
        : 0,
    totalLtvUsd: Math.round(data.ltv * 100) / 100,
  }));
}
