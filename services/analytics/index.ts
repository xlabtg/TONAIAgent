/**
 * TONAIAgent — Analytics Service (Issue #255)
 *
 * Computes trade history metrics, portfolio performance statistics,
 * and analytics dashboards from execution records.
 *
 * Architecture:
 *   Execution Engine → Trade Storage (taa_agent_executions)
 *     → Analytics Engine (this service)
 *       → /api/trades  /api/analytics  /api/portfolio/history
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
