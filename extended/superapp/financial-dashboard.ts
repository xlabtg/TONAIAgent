/**
 * TONAIAgent - Financial Dashboard Module
 *
 * Unified view of portfolio, risk, yield, allocations, and cross-chain exposure.
 *
 * Features:
 * - Real-time portfolio tracking
 * - Performance analytics
 * - Risk monitoring and VaR
 * - Asset allocation insights
 * - Transaction history
 * - Yield tracking
 */

import type {
  FinancialDashboard,
  PortfolioOverview,
  PortfolioAsset,
  PerformanceOverview,
  PerformanceDataPoint,
  RiskOverview,
  RiskBreakdownItem,
  RiskWarning,
  AllocationOverview,
  AllocationCategory,
  AllocationRecommendation,
  RecentTransactions,
  TransactionSummary,
  TransactionType,
  TransactionStatus,
  Currency,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface FinancialDashboardConfig {
  baseCurrency: Currency;
  supportedCurrencies: Currency[];
  priceUpdateIntervalMs: number;
  performanceHistoryDays: number;
  riskCalculationMethod: 'historical' | 'parametric' | 'monte_carlo';
  maxRecentTransactions: number;
}

// ============================================================================
// Financial Dashboard Manager Interface
// ============================================================================

export interface FinancialDashboardManager {
  // Dashboard
  getDashboard(userId: string): Promise<FinancialDashboard>;
  refreshDashboard(userId: string): Promise<FinancialDashboard>;

  // Portfolio
  getPortfolio(userId: string): Promise<PortfolioOverview>;
  addAsset(userId: string, asset: Omit<PortfolioAsset, 'change24h' | 'change24hPercent'>): Promise<void>;
  removeAsset(userId: string, symbol: string): Promise<void>;
  updateAssetAmount(userId: string, symbol: string, amount: number): Promise<void>;

  // Performance
  getPerformance(userId: string, days?: number): Promise<PerformanceOverview>;
  getPerformanceHistory(userId: string, days?: number): Promise<PerformanceDataPoint[]>;

  // Risk
  getRiskOverview(userId: string): Promise<RiskOverview>;
  calculateVaR(userId: string, confidenceLevel: number): Promise<number>;
  getWarnings(userId: string): Promise<RiskWarning[]>;

  // Allocations
  getAllocations(userId: string): Promise<AllocationOverview>;
  getRecommendations(userId: string): Promise<AllocationRecommendation[]>;

  // Transactions
  getRecentTransactions(userId: string, limit?: number): Promise<RecentTransactions>;
  addTransaction(userId: string, transaction: Omit<TransactionSummary, 'id'>): Promise<TransactionSummary>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultFinancialDashboardManager implements FinancialDashboardManager {
  private readonly config: FinancialDashboardConfig;
  private readonly portfolios = new Map<string, PortfolioAsset[]>();
  private readonly performanceHistory = new Map<string, PerformanceDataPoint[]>();
  private readonly transactions = new Map<string, TransactionSummary[]>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<FinancialDashboardConfig> = {}) {
    this.config = {
      baseCurrency: config.baseCurrency ?? 'TON',
      supportedCurrencies: config.supportedCurrencies ?? ['TON', 'USDT', 'USDC', 'BTC', 'ETH'],
      priceUpdateIntervalMs: config.priceUpdateIntervalMs ?? 60000,
      performanceHistoryDays: config.performanceHistoryDays ?? 365,
      riskCalculationMethod: config.riskCalculationMethod ?? 'historical',
      maxRecentTransactions: config.maxRecentTransactions ?? 100,
    };
  }

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboard(userId: string): Promise<FinancialDashboard> {
    const [portfolio, performance, risk, allocations, transactions] = await Promise.all([
      this.getPortfolio(userId),
      this.getPerformance(userId),
      this.getRiskOverview(userId),
      this.getAllocations(userId),
      this.getRecentTransactions(userId),
    ]);

    return {
      userId,
      portfolio,
      performance,
      risk,
      allocations,
      transactions,
      lastUpdatedAt: new Date(),
    };
  }

  async refreshDashboard(userId: string): Promise<FinancialDashboard> {
    // In production, this would fetch latest prices and recalculate metrics
    await this.updatePrices(userId);
    return this.getDashboard(userId);
  }

  // ============================================================================
  // Portfolio
  // ============================================================================

  async getPortfolio(userId: string): Promise<PortfolioOverview> {
    const assets = this.portfolios.get(userId) ?? this.initializeDefaultPortfolio();

    const totalValueUsd = assets.reduce((sum, a) => sum + a.valueUsd, 0);
    const totalValueTon = totalValueUsd / 5; // Assume TON = $5

    // Calculate changes (simulated)
    const change24h = totalValueUsd * ((Math.random() - 0.4) * 0.05);
    const change24hPercent = totalValueUsd > 0 ? (change24h / totalValueUsd) * 100 : 0;
    const change7d = totalValueUsd * ((Math.random() - 0.4) * 0.15);
    const change7dPercent = totalValueUsd > 0 ? (change7d / totalValueUsd) * 100 : 0;
    const change30d = totalValueUsd * ((Math.random() - 0.35) * 0.3);
    const change30dPercent = totalValueUsd > 0 ? (change30d / totalValueUsd) * 100 : 0;

    return {
      totalValueUsd,
      totalValueTon,
      change24h,
      change24hPercent,
      change7d,
      change7dPercent,
      change30d,
      change30dPercent,
      assets,
      topHoldings: assets.slice(0, 5),
    };
  }

  async addAsset(
    userId: string,
    asset: Omit<PortfolioAsset, 'change24h' | 'change24hPercent'>
  ): Promise<void> {
    const assets = this.portfolios.get(userId) ?? [];

    const existingIndex = assets.findIndex((a) => a.symbol === asset.symbol);
    if (existingIndex >= 0) {
      assets[existingIndex] = {
        ...asset,
        change24h: (Math.random() - 0.4) * asset.valueUsd * 0.05,
        change24hPercent: (Math.random() - 0.4) * 5,
      };
    } else {
      assets.push({
        ...asset,
        change24h: (Math.random() - 0.4) * asset.valueUsd * 0.05,
        change24hPercent: (Math.random() - 0.4) * 5,
      });
    }

    // Sort by value
    assets.sort((a, b) => b.valueUsd - a.valueUsd);
    this.portfolios.set(userId, assets);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'portfolio_updated',
      severity: 'info',
      source: 'financial-dashboard',
      userId,
      message: `Asset ${asset.symbol} added to portfolio`,
      data: { symbol: asset.symbol, amount: asset.amount },
    });
  }

  async removeAsset(userId: string, symbol: string): Promise<void> {
    const assets = this.portfolios.get(userId) ?? [];
    const filtered = assets.filter((a) => a.symbol !== symbol);
    this.portfolios.set(userId, filtered);
  }

  async updateAssetAmount(userId: string, symbol: string, amount: number): Promise<void> {
    const assets = this.portfolios.get(userId) ?? [];
    const asset = assets.find((a) => a.symbol === symbol);
    if (asset) {
      asset.amount = amount;
      // Recalculate value based on price
      const pricePerUnit = asset.valueUsd / (asset.amount || 1);
      asset.valueUsd = amount * pricePerUnit;
      this.portfolios.set(userId, assets);
    }
  }

  // ============================================================================
  // Performance
  // ============================================================================

  async getPerformance(userId: string, _days = 30): Promise<PerformanceOverview> {
    const history = await this.getPerformanceHistory(userId);

    const totalPnl = history.length > 0 ? history[history.length - 1].pnl : 0;
    const totalPnlPercent = history.length > 0 ? history[history.length - 1].pnlPercent : 0;

    return {
      totalPnl,
      totalPnlPercent,
      realizedPnl: totalPnl * 0.7,
      unrealizedPnl: totalPnl * 0.3,
      todayPnl: (Math.random() - 0.4) * 200,
      weeklyPnl: (Math.random() - 0.35) * 1000,
      monthlyPnl: (Math.random() - 0.3) * 3000,
      yearlyPnl: totalPnl,
      sharpeRatio: 0.8 + Math.random() * 1.5,
      sortinoRatio: 1.0 + Math.random() * 1.8,
      performanceHistory: history,
    };
  }

  async getPerformanceHistory(userId: string, days = 30): Promise<PerformanceDataPoint[]> {
    let history = this.performanceHistory.get(userId);

    if (!history || history.length === 0) {
      history = this.generatePerformanceHistory(days);
      this.performanceHistory.set(userId, history);
    }

    return history.slice(-days);
  }

  // ============================================================================
  // Risk
  // ============================================================================

  async getRiskOverview(userId: string): Promise<RiskOverview> {
    const portfolio = await this.getPortfolio(userId);
    const warnings = await this.getWarnings(userId);

    const var95 = await this.calculateVaR(userId, 0.95);
    const var99 = await this.calculateVaR(userId, 0.99);

    const volatility = 15 + Math.random() * 20;
    const currentDrawdown = Math.random() * 10;
    const maxDrawdown = currentDrawdown + Math.random() * 10;

    let riskScore = 50;
    if (volatility > 30) riskScore += 20;
    if (maxDrawdown > 15) riskScore += 15;
    if (portfolio.assets.some((a) => a.percentage > 40)) riskScore += 10;
    riskScore = Math.min(100, riskScore);

    const overallRiskLevel =
      riskScore < 30
        ? 'low'
        : riskScore < 50
        ? 'medium'
        : riskScore < 75
        ? 'high'
        : 'extreme';

    const diversificationScore = this.calculateDiversificationScore(portfolio.assets);

    return {
      overallRiskLevel,
      riskScore,
      currentDrawdown,
      maxDrawdown,
      var95,
      var99,
      volatility,
      diversificationScore,
      riskBreakdown: this.calculateRiskBreakdown(portfolio.assets),
      warnings,
    };
  }

  async calculateVaR(userId: string, confidenceLevel: number): Promise<number> {
    const portfolio = await this.getPortfolio(userId);
    const totalValue = portfolio.totalValueUsd;

    // Simplified VaR calculation
    const zScore = confidenceLevel === 0.99 ? 2.33 : 1.65;
    const volatility = 0.02; // Daily volatility estimate
    const var_ = totalValue * zScore * volatility;

    return var_;
  }

  async getWarnings(userId: string): Promise<RiskWarning[]> {
    const portfolio = await this.getPortfolio(userId);
    const warnings: RiskWarning[] = [];

    // Check concentration
    for (const asset of portfolio.assets) {
      if (asset.percentage > 40) {
        warnings.push({
          id: `warn_conc_${asset.symbol}`,
          type: 'concentration',
          severity: asset.percentage > 60 ? 'high' : 'medium',
          message: `${asset.symbol} represents ${asset.percentage.toFixed(1)}% of portfolio`,
          recommendation: `Consider diversifying by reducing ${asset.symbol} exposure`,
        });
      }
    }

    // Check drawdown
    const currentDrawdown = Math.random() * 15;
    if (currentDrawdown > 10) {
      warnings.push({
        id: 'warn_drawdown',
        type: 'drawdown',
        severity: currentDrawdown > 15 ? 'high' : 'medium',
        message: `Current drawdown is ${currentDrawdown.toFixed(1)}%`,
        recommendation: 'Consider reviewing positions and risk exposure',
      });
    }

    return warnings;
  }

  // ============================================================================
  // Allocations
  // ============================================================================

  async getAllocations(userId: string): Promise<AllocationOverview> {
    const portfolio = await this.getPortfolio(userId);

    const byAsset = portfolio.assets.map((asset) => ({
      name: asset.symbol,
      value: asset.valueUsd,
      percentage: asset.percentage,
      change24h: asset.change24hPercent,
      color: this.getAssetColor(asset.symbol),
    }));

    const byProtocol = this.aggregateByProtocol(portfolio.assets);
    const byRiskLevel = this.aggregateByRiskLevel(portfolio.assets);
    const byStrategy: AllocationCategory[] = [
      { name: 'Yield Farming', value: portfolio.totalValueUsd * 0.4, percentage: 40, change24h: 2.5 },
      { name: 'Trading', value: portfolio.totalValueUsd * 0.35, percentage: 35, change24h: -1.2 },
      { name: 'Holding', value: portfolio.totalValueUsd * 0.25, percentage: 25, change24h: 0.8 },
    ];

    return {
      byAsset,
      byProtocol,
      byRiskLevel,
      byStrategy,
      recommendations: await this.getRecommendations(userId),
    };
  }

  async getRecommendations(userId: string): Promise<AllocationRecommendation[]> {
    const portfolio = await this.getPortfolio(userId);
    const recommendations: AllocationRecommendation[] = [];

    // Check for rebalancing needs
    const maxConcentration = Math.max(...portfolio.assets.map((a) => a.percentage));
    if (maxConcentration > 35) {
      recommendations.push({
        type: 'rebalance',
        priority: 'high',
        title: 'Portfolio Rebalancing Suggested',
        description: 'Your portfolio has high concentration in a single asset',
        suggestedAction: 'Consider reducing position in largest holding to below 35%',
      });
    }

    // Check for diversification
    if (portfolio.assets.length < 4) {
      recommendations.push({
        type: 'diversify',
        priority: 'medium',
        title: 'Increase Diversification',
        description: 'Your portfolio has limited asset diversity',
        suggestedAction: 'Consider adding more assets to spread risk',
      });
    }

    // Check for stablecoin allocation
    const stableCoins = portfolio.assets.filter((a) =>
      ['USDT', 'USDC'].includes(a.symbol)
    );
    const stablePercent = stableCoins.reduce((sum, a) => sum + a.percentage, 0);
    if (stablePercent < 10) {
      recommendations.push({
        type: 'reduce_risk',
        priority: 'low',
        title: 'Consider Stable Assets',
        description: 'Low stablecoin allocation increases volatility exposure',
        suggestedAction: 'Allocate 10-20% to stablecoins for reduced volatility',
      });
    }

    return recommendations;
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  async getRecentTransactions(userId: string, limit = 20): Promise<RecentTransactions> {
    const userTxs = this.transactions.get(userId) ?? this.initializeDefaultTransactions();
    const items = userTxs.slice(0, limit);

    return {
      items,
      totalCount: userTxs.length,
      hasMore: userTxs.length > limit,
    };
  }

  async addTransaction(
    userId: string,
    transaction: Omit<TransactionSummary, 'id'>
  ): Promise<TransactionSummary> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const fullTx: TransactionSummary = {
      ...transaction,
      id: txId,
    };

    const userTxs = this.transactions.get(userId) ?? [];
    userTxs.unshift(fullTx);

    if (userTxs.length > this.config.maxRecentTransactions) {
      userTxs.pop();
    }

    this.transactions.set(userId, userTxs);
    return fullTx;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private initializeDefaultPortfolio(): PortfolioAsset[] {
    return [
      {
        symbol: 'TON',
        name: 'Toncoin',
        type: 'native',
        amount: 1000,
        valueUsd: 5000,
        percentage: 50,
        change24h: 120,
        change24hPercent: 2.4,
        icon: 'https://ton.org/icon.png',
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        type: 'jetton',
        amount: 2000,
        valueUsd: 2000,
        percentage: 20,
        change24h: 0,
        change24hPercent: 0,
        contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      },
      {
        symbol: 'STON',
        name: 'STON.fi',
        type: 'jetton',
        amount: 500,
        valueUsd: 1500,
        percentage: 15,
        change24h: -30,
        change24hPercent: -2.0,
      },
      {
        symbol: 'SCALE',
        name: 'Scaleton',
        type: 'jetton',
        amount: 1000,
        valueUsd: 1000,
        percentage: 10,
        change24h: 50,
        change24hPercent: 5.0,
      },
      {
        symbol: 'LP-TON-USDT',
        name: 'TON-USDT LP',
        type: 'lp_token',
        amount: 10,
        valueUsd: 500,
        percentage: 5,
        change24h: 10,
        change24hPercent: 2.0,
      },
    ];
  }

  private initializeDefaultTransactions(): TransactionSummary[] {
    const types: TransactionType[] = ['transfer', 'swap', 'stake', 'claim'];
    const statuses: TransactionStatus[] = ['confirmed', 'confirmed', 'confirmed', 'pending'];
    const transactions: TransactionSummary[] = [];

    for (let i = 0; i < 10; i++) {
      transactions.push({
        id: `tx_${Date.now() - i * 3600000}_${Math.random().toString(36).slice(2, 11)}`,
        type: types[Math.floor(Math.random() * types.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        description: `Transaction ${i + 1}`,
        amount: Math.random() * 100,
        currency: 'TON',
        valueUsd: Math.random() * 500,
        timestamp: new Date(Date.now() - i * 3600000),
      });
    }

    return transactions;
  }

  private generatePerformanceHistory(days: number): PerformanceDataPoint[] {
    const history: PerformanceDataPoint[] = [];
    let value = 10000;
    let cumulativePnl = 0;

    for (let i = days; i >= 0; i--) {
      const dailyReturn = (Math.random() - 0.45) * 0.03;
      const pnl = value * dailyReturn;
      cumulativePnl += pnl;
      value += pnl;

      history.push({
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        value,
        pnl: cumulativePnl,
        pnlPercent: (cumulativePnl / 10000) * 100,
      });
    }

    return history;
  }

  private async updatePrices(_userId: string): Promise<void> {
    // In production, fetch live prices from oracles/APIs
    // For now, simulate price updates
  }

  private calculateDiversificationScore(assets: PortfolioAsset[]): number {
    if (assets.length === 0) return 0;
    if (assets.length === 1) return 10;

    // Herfindahl-Hirschman Index based score
    const hhi = assets.reduce((sum, a) => sum + Math.pow(a.percentage / 100, 2), 0);
    const score = Math.round((1 - hhi) * 100);
    return Math.min(100, Math.max(0, score));
  }

  private calculateRiskBreakdown(assets: PortfolioAsset[]): RiskBreakdownItem[] {
    return [
      {
        category: 'Market Risk',
        score: 35 + Math.random() * 30,
        contribution: 40,
        details: 'Exposure to market-wide price movements',
      },
      {
        category: 'Concentration Risk',
        score: assets.length < 3 ? 60 : 30 + Math.random() * 20,
        contribution: 25,
        details: 'Risk from portfolio concentration',
      },
      {
        category: 'Liquidity Risk',
        score: 20 + Math.random() * 20,
        contribution: 20,
        details: 'Risk from asset illiquidity',
      },
      {
        category: 'Smart Contract Risk',
        score: 25 + Math.random() * 25,
        contribution: 15,
        details: 'Risk from smart contract vulnerabilities',
      },
    ];
  }

  private aggregateByProtocol(assets: PortfolioAsset[]): AllocationCategory[] {
    // Simulate protocol allocation
    const totalValue = assets.reduce((sum, a) => sum + a.valueUsd, 0);
    return [
      { name: 'DeDust', value: totalValue * 0.35, percentage: 35, change24h: 1.5 },
      { name: 'STON.fi', value: totalValue * 0.25, percentage: 25, change24h: -0.5 },
      { name: 'TonStakers', value: totalValue * 0.20, percentage: 20, change24h: 0.2 },
      { name: 'Wallet', value: totalValue * 0.20, percentage: 20, change24h: 2.0 },
    ];
  }

  private aggregateByRiskLevel(assets: PortfolioAsset[]): AllocationCategory[] {
    const totalValue = assets.reduce((sum, a) => sum + a.valueUsd, 0);
    return [
      { name: 'Low Risk', value: totalValue * 0.25, percentage: 25, change24h: 0.3, color: '#4CAF50' },
      { name: 'Medium Risk', value: totalValue * 0.45, percentage: 45, change24h: 1.2, color: '#FFC107' },
      { name: 'High Risk', value: totalValue * 0.30, percentage: 30, change24h: -0.8, color: '#F44336' },
    ];
  }

  private getAssetColor(symbol: string): string {
    const colors: Record<string, string> = {
      TON: '#0088CC',
      USDT: '#26A17B',
      USDC: '#2775CA',
      BTC: '#F7931A',
      ETH: '#627EEA',
    };
    return colors[symbol] ?? '#808080';
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createFinancialDashboardManager(
  config?: Partial<FinancialDashboardConfig>
): DefaultFinancialDashboardManager {
  return new DefaultFinancialDashboardManager(config);
}

export default DefaultFinancialDashboardManager;
