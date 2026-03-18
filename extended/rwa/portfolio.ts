/**
 * TONAIAgent - Hybrid Portfolio Engine
 *
 * Manages crypto + RWA hybrid portfolios with dynamic rebalancing,
 * risk-adjusted capital flows, yield stacking, and performance analytics.
 */

import {
  HybridPortfolio,
  CryptoPosition,
  RWAPosition,
  PortfolioPerformance,
  PortfolioRiskMetrics,
  RebalanceOrder,
  AllocationConfig,
  RWAAssetClass,
  TokenizedFund,
  FundInvestor,
  FundSubscription,
  FundRedemption,
  RWAEvent,
  RWAEventCallback,
} from './types';

// ============================================================================
// Hybrid Portfolio Engine Interface
// ============================================================================

export interface HybridPortfolioEngine {
  // Portfolio management
  createPortfolio(
    name: string,
    ownerId: string,
    allocationConfig: AllocationConfig,
    initialCash?: number
  ): Promise<HybridPortfolio>;
  getPortfolio(portfolioId: string): HybridPortfolio | undefined;
  listPortfolios(ownerId?: string): HybridPortfolio[];
  updateAllocationConfig(portfolioId: string, config: Partial<AllocationConfig>): Promise<HybridPortfolio>;

  // Position management
  addCryptoPosition(portfolioId: string, position: Omit<CryptoPosition, 'id'>): Promise<CryptoPosition>;
  updateCryptoPosition(portfolioId: string, positionId: string, updates: Partial<CryptoPosition>): Promise<CryptoPosition>;
  removeCryptoPosition(portfolioId: string, positionId: string): Promise<void>;

  addRWAPosition(portfolioId: string, position: Omit<RWAPosition, 'id'>): Promise<RWAPosition>;
  updateRWAPosition(portfolioId: string, positionId: string, updates: Partial<RWAPosition>): Promise<RWAPosition>;
  removeRWAPosition(portfolioId: string, positionId: string): Promise<void>;

  // Cash management
  addCash(portfolioId: string, amount: number): Promise<void>;
  withdrawCash(portfolioId: string, amount: number): Promise<void>;

  // Rebalancing
  checkRebalanceNeeded(portfolioId: string): RebalanceCheck;
  generateRebalanceOrders(portfolioId: string): RebalanceOrder[];
  executeRebalance(portfolioId: string, orders: RebalanceOrder[]): Promise<RebalanceResult>;

  // Analytics
  calculatePerformance(portfolioId: string, period?: PortfolioPerformance['period']): PortfolioPerformance;
  calculateRiskMetrics(portfolioId: string): PortfolioRiskMetrics;
  getYieldDashboard(portfolioId: string): YieldDashboard;

  // Tokenized fund management
  createTokenizedFund(config: TokenizedFundConfig): Promise<TokenizedFund>;
  getFund(fundId: string): TokenizedFund | undefined;
  listFunds(filters?: FundFilters): TokenizedFund[];
  subscribeFund(fundId: string, investorId: string, amount: number, currency: string): Promise<FundSubscription>;
  redeemFund(fundId: string, investorId: string, shares: number): Promise<FundRedemption>;
  processSubscriptions(fundId: string): Promise<ProcessingResult>;
  processRedemptions(fundId: string): Promise<ProcessingResult>;

  // Events
  onEvent(callback: RWAEventCallback): void;
}

export interface RebalanceCheck {
  needsRebalance: boolean;
  currentCryptoAllocation: number;
  currentRwaAllocation: number;
  currentCashAllocation: number;
  targetCryptoAllocation: number;
  targetRwaAllocation: number;
  driftAmount: number;
  maxDrift: number;
  reasons: string[];
}

export interface RebalanceResult {
  portfolioId: string;
  ordersExecuted: number;
  totalTradeValue: number;
  newCryptoAllocation: number;
  newRwaAllocation: number;
  success: boolean;
  errors: string[];
  executedAt: Date;
}

export interface YieldDashboard {
  portfolioId: string;
  totalYieldEarned: number;
  annualizedYield: number;
  cryptoYield: number;
  rwaYield: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  yieldByAsset: YieldByAsset[];
  upcomingDistributions: UpcomingDistribution[];
  generatedAt: Date;
}

export interface YieldByAsset {
  assetId: string;
  assetName: string;
  assetClass: RWAAssetClass | 'crypto';
  yieldEarned: number;
  yieldRate: number;
  weight: number;
}

export interface UpcomingDistribution {
  assetId: string;
  assetName: string;
  estimatedAmount: number;
  estimatedDate: Date;
  distributionType: 'interest' | 'dividend' | 'rental' | 'principal';
}

export interface TokenizedFundConfig {
  name: string;
  symbol: string;
  fundType: TokenizedFund['fundType'];
  strategy: AllocationConfig['strategy'];
  currency: string;
  managementFee: number;
  performanceFee: number;
  hurdle?: number;
  minimumInvestment: number;
  lockupPeriod?: number;
  redemptionNoticeDays: number;
  allocationConfig: AllocationConfig;
}

export interface FundFilters {
  strategy?: AllocationConfig['strategy'][];
  status?: TokenizedFund['status'][];
  minAum?: number;
}

export interface ProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  totalValue: number;
  errors: string[];
}

// ============================================================================
// Default Hybrid Portfolio Engine
// ============================================================================

export class DefaultHybridPortfolioEngine implements HybridPortfolioEngine {
  private readonly portfolios: Map<string, HybridPortfolio> = new Map();
  private readonly funds: Map<string, TokenizedFund> = new Map();
  private readonly subscriptions: Map<string, FundSubscription[]> = new Map();
  private readonly redemptions: Map<string, FundRedemption[]> = new Map();
  private readonly eventCallbacks: RWAEventCallback[] = [];

  async createPortfolio(
    name: string,
    ownerId: string,
    allocationConfig: AllocationConfig,
    initialCash = 0
  ): Promise<HybridPortfolio> {
    const portfolioId = this.generateId('portfolio');

    const portfolio: HybridPortfolio = {
      id: portfolioId,
      name,
      ownerId,
      totalValue: initialCash,
      currency: 'USD',
      cryptoPositions: [],
      rwaPositions: [],
      cashBalance: initialCash,
      allocationConfig,
      performance: this.createEmptyPerformance(),
      riskMetrics: this.createEmptyRiskMetrics(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, portfolio);

    this.emitEvent('info', 'portfolio', `Portfolio created: ${name}`, {
      portfolioId,
      ownerId,
    });

    return this.clonePortfolio(portfolio);
  }

  getPortfolio(portfolioId: string): HybridPortfolio | undefined {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return undefined;
    this.recalculatePortfolio(portfolio);
    return this.clonePortfolio(portfolio);
  }

  listPortfolios(ownerId?: string): HybridPortfolio[] {
    let portfolios = Array.from(this.portfolios.values());
    if (ownerId) {
      portfolios = portfolios.filter(p => p.ownerId === ownerId);
    }
    portfolios.forEach(p => this.recalculatePortfolio(p));
    return portfolios.map(p => this.clonePortfolio(p));
  }

  async updateAllocationConfig(
    portfolioId: string,
    config: Partial<AllocationConfig>
  ): Promise<HybridPortfolio> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    portfolio.allocationConfig = { ...portfolio.allocationConfig, ...config };
    portfolio.updatedAt = new Date();

    return this.clonePortfolio(portfolio);
  }

  async addCryptoPosition(
    portfolioId: string,
    position: Omit<CryptoPosition, 'id'>
  ): Promise<CryptoPosition> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const newPosition: CryptoPosition = {
      ...position,
      id: this.generateId('pos'),
    };

    portfolio.cryptoPositions.push(newPosition);
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);

    this.emitEvent('info', 'portfolio', `Crypto position added: ${position.asset}`, {
      portfolioId,
      asset: position.asset,
      value: position.marketValue,
    });

    return { ...newPosition };
  }

  async updateCryptoPosition(
    portfolioId: string,
    positionId: string,
    updates: Partial<CryptoPosition>
  ): Promise<CryptoPosition> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const posIdx = portfolio.cryptoPositions.findIndex(p => p.id === positionId);
    if (posIdx === -1) throw new Error(`Position not found: ${positionId}`);

    portfolio.cryptoPositions[posIdx] = { ...portfolio.cryptoPositions[posIdx], ...updates };
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);

    return { ...portfolio.cryptoPositions[posIdx] };
  }

  async removeCryptoPosition(portfolioId: string, positionId: string): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const posIdx = portfolio.cryptoPositions.findIndex(p => p.id === positionId);
    if (posIdx === -1) throw new Error(`Position not found: ${positionId}`);

    portfolio.cryptoPositions.splice(posIdx, 1);
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);
  }

  async addRWAPosition(
    portfolioId: string,
    position: Omit<RWAPosition, 'id'>
  ): Promise<RWAPosition> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const newPosition: RWAPosition = {
      ...position,
      id: this.generateId('rwapos'),
    };

    portfolio.rwaPositions.push(newPosition);
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);

    this.emitEvent('info', 'portfolio', `RWA position added: ${position.assetName}`, {
      portfolioId,
      assetId: position.assetId,
      value: position.marketValue,
    });

    return { ...newPosition };
  }

  async updateRWAPosition(
    portfolioId: string,
    positionId: string,
    updates: Partial<RWAPosition>
  ): Promise<RWAPosition> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const posIdx = portfolio.rwaPositions.findIndex(p => p.id === positionId);
    if (posIdx === -1) throw new Error(`RWA position not found: ${positionId}`);

    portfolio.rwaPositions[posIdx] = { ...portfolio.rwaPositions[posIdx], ...updates };
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);

    return { ...portfolio.rwaPositions[posIdx] };
  }

  async removeRWAPosition(portfolioId: string, positionId: string): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const posIdx = portfolio.rwaPositions.findIndex(p => p.id === positionId);
    if (posIdx === -1) throw new Error(`RWA position not found: ${positionId}`);

    portfolio.rwaPositions.splice(posIdx, 1);
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);
  }

  async addCash(portfolioId: string, amount: number): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    portfolio.cashBalance += amount;
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);
  }

  async withdrawCash(portfolioId: string, amount: number): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    if (portfolio.cashBalance < amount) {
      throw new Error(`Insufficient cash balance: ${portfolio.cashBalance} < ${amount}`);
    }

    portfolio.cashBalance -= amount;
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);
  }

  checkRebalanceNeeded(portfolioId: string): RebalanceCheck {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    this.recalculatePortfolio(portfolio);

    const totalValue = portfolio.totalValue;
    const cryptoValue = portfolio.cryptoPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const rwaValue = portfolio.rwaPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const cashValue = portfolio.cashBalance;

    const currentCryptoAllocation = totalValue > 0 ? cryptoValue / totalValue : 0;
    const currentRwaAllocation = totalValue > 0 ? rwaValue / totalValue : 0;
    const currentCashAllocation = totalValue > 0 ? cashValue / totalValue : 0;

    const targetRwaAllocation = portfolio.allocationConfig.maxRWAAllocation * 0.6; // Target 60% of max
    const targetCryptoAllocation = portfolio.allocationConfig.minCryptoAllocation;

    const rraDrift = Math.abs(currentRwaAllocation - targetRwaAllocation);
    const cryptoDrift = Math.abs(currentCryptoAllocation - targetCryptoAllocation);
    const maxDrift = Math.max(rraDrift, cryptoDrift);
    const threshold = portfolio.allocationConfig.rebalanceThreshold;

    const needsRebalance = maxDrift > threshold;
    const reasons: string[] = [];

    if (rraDrift > threshold) {
      reasons.push(
        `RWA allocation drift: ${(rraDrift * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`
      );
    }
    if (cryptoDrift > threshold) {
      reasons.push(
        `Crypto allocation drift: ${(cryptoDrift * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`
      );
    }

    return {
      needsRebalance,
      currentCryptoAllocation,
      currentRwaAllocation,
      currentCashAllocation,
      targetCryptoAllocation,
      targetRwaAllocation,
      driftAmount: maxDrift,
      maxDrift: threshold,
      reasons,
    };
  }

  generateRebalanceOrders(portfolioId: string): RebalanceOrder[] {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const check = this.checkRebalanceNeeded(portfolioId);
    if (!check.needsRebalance) return [];

    const orders: RebalanceOrder[] = [];
    const totalValue = portfolio.totalValue;
    const targetRwaValue = totalValue * check.targetRwaAllocation;
    const currentRwaValue = portfolio.rwaPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const rwaDiff = targetRwaValue - currentRwaValue;

    if (rwaDiff > 100) {
      // Need to buy more RWA
      const order: RebalanceOrder = {
        id: this.generateId('order'),
        portfolioId,
        type: 'rwa_buy',
        assetId: 'rwa_target',
        assetName: 'RWA Allocation',
        targetAmount: targetRwaValue,
        currentAmount: currentRwaValue,
        tradeSizeUsd: rwaDiff,
        priority: 1,
        status: 'pending',
        createdAt: new Date(),
      };
      orders.push(order);
    } else if (rwaDiff < -100) {
      // Need to sell RWA
      const order: RebalanceOrder = {
        id: this.generateId('order'),
        portfolioId,
        type: 'rwa_sell',
        assetId: 'rwa_target',
        assetName: 'RWA Allocation',
        targetAmount: targetRwaValue,
        currentAmount: currentRwaValue,
        tradeSizeUsd: Math.abs(rwaDiff),
        priority: 1,
        status: 'pending',
        createdAt: new Date(),
      };
      orders.push(order);
    }

    const targetCryptoValue = totalValue * check.targetCryptoAllocation;
    const currentCryptoValue = portfolio.cryptoPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const cryptoDiff = targetCryptoValue - currentCryptoValue;

    if (cryptoDiff > 100) {
      orders.push({
        id: this.generateId('order'),
        portfolioId,
        type: 'crypto_buy',
        assetId: 'crypto_target',
        assetName: 'Crypto Allocation',
        targetAmount: targetCryptoValue,
        currentAmount: currentCryptoValue,
        tradeSizeUsd: cryptoDiff,
        priority: 2,
        status: 'pending',
        createdAt: new Date(),
      });
    } else if (cryptoDiff < -100) {
      orders.push({
        id: this.generateId('order'),
        portfolioId,
        type: 'crypto_sell',
        assetId: 'crypto_target',
        assetName: 'Crypto Allocation',
        targetAmount: targetCryptoValue,
        currentAmount: currentCryptoValue,
        tradeSizeUsd: Math.abs(cryptoDiff),
        priority: 2,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    return orders;
  }

  async executeRebalance(
    portfolioId: string,
    orders: RebalanceOrder[]
  ): Promise<RebalanceResult> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const errors: string[] = [];
    let executedCount = 0;
    let totalTradeValue = 0;

    for (const order of orders) {
      try {
        order.status = 'executing';

        // Simulate order execution
        totalTradeValue += order.tradeSizeUsd;
        order.status = 'completed';
        order.executedAt = new Date();
        executedCount++;
      } catch (e) {
        order.status = 'failed';
        errors.push(`Order ${order.id} failed: ${e}`);
      }
    }

    portfolio.lastRebalancedAt = new Date();
    portfolio.updatedAt = new Date();
    this.recalculatePortfolio(portfolio);

    const totalValue = portfolio.totalValue;
    const cryptoValue = portfolio.cryptoPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const rwaValue = portfolio.rwaPositions.reduce((sum, p) => sum + p.marketValue, 0);

    this.emitEvent('info', 'portfolio', `Portfolio rebalanced: ${portfolioId}`, {
      portfolioId,
      ordersExecuted: executedCount,
      totalTradeValue,
    });

    return {
      portfolioId,
      ordersExecuted: executedCount,
      totalTradeValue,
      newCryptoAllocation: totalValue > 0 ? cryptoValue / totalValue : 0,
      newRwaAllocation: totalValue > 0 ? rwaValue / totalValue : 0,
      success: errors.length === 0,
      errors,
      executedAt: new Date(),
    };
  }

  calculatePerformance(
    portfolioId: string,
    period: PortfolioPerformance['period'] = '30d'
  ): PortfolioPerformance {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const cryptoReturn = portfolio.cryptoPositions.reduce(
      (sum, p) => sum + p.unrealizedPnL,
      0
    );
    const rwaReturn = portfolio.rwaPositions.reduce(
      (sum, p) => sum + p.unrealizedPnL,
      0
    );
    const yieldIncome = portfolio.rwaPositions.reduce(
      (sum, p) => sum + p.accruedYield,
      0
    );

    const totalReturn = cryptoReturn + rwaReturn + yieldIncome;
    const totalReturnPercent = portfolio.totalValue > 0
      ? totalReturn / (portfolio.totalValue - totalReturn)
      : 0;

    // Simplified annualization
    const periodDays: Record<string, number> = {
      '1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': 365
    };
    const days = periodDays[period] ?? 30;
    const annualizedReturn = Math.pow(1 + totalReturnPercent, 365 / days) - 1;

    // Simplified risk metrics
    const volatility = 0.25; // Placeholder - would calculate from historical returns
    const sharpeRatio = volatility > 0 ? (annualizedReturn - 0.05) / volatility : 0;
    const sortinoRatio = sharpeRatio * 1.2; // Simplified
    const maxDrawdown = 0.10; // Placeholder

    const performance: PortfolioPerformance = {
      totalReturn,
      totalReturnPercent,
      cryptoReturn,
      rwaReturn,
      yieldIncome,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      volatility,
      period,
    };

    portfolio.performance = performance;

    return { ...performance };
  }

  calculateRiskMetrics(portfolioId: string): PortfolioRiskMetrics {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    this.recalculatePortfolio(portfolio);

    const totalValue = portfolio.totalValue;

    // Concentration risk
    const allWeights = [
      ...portfolio.cryptoPositions.map(p => p.weight),
      ...portfolio.rwaPositions.map(p => p.weight),
    ];
    const concentration = allWeights.length > 0 ? Math.max(...allWeights) : 0;

    // Liquidity risk based on RWA positions
    const illiquidRwaClasses: RWAAssetClass[] = ['private_equity', 'real_estate', 'infrastructure'];
    const illiquidValue = portfolio.rwaPositions
      .filter(p => illiquidRwaClasses.includes(p.assetClass))
      .reduce((sum, p) => sum + p.marketValue, 0);
    const liquidityRisk = totalValue > 0 ? (illiquidValue / totalValue) * 100 : 0;

    const riskMetrics: PortfolioRiskMetrics = {
      var95: totalValue * 0.05, // Simplified 5% daily VaR
      var99: totalValue * 0.08,
      beta: 0.6, // Hybrid portfolio has lower beta than pure crypto
      concentration,
      cryptoCorrelation: 0.4, // Partial correlation due to RWA holdings
      liquidityRisk,
      counterpartyRisk: 30,
      jurisdictionRisk: 20,
    };

    portfolio.riskMetrics = riskMetrics;

    return { ...riskMetrics };
  }

  getYieldDashboard(portfolioId: string): YieldDashboard {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) throw new Error(`Portfolio not found: ${portfolioId}`);

    const rwaYield = portfolio.rwaPositions.reduce((sum, p) => sum + p.accruedYield, 0);
    const cryptoYield = 0; // Simplified - no yield staking in this demo

    const totalYieldEarned = rwaYield + cryptoYield;
    const totalValue = portfolio.totalValue;
    const annualizedYield = totalValue > 0
      ? portfolio.rwaPositions.reduce(
          (sum, p) => sum + p.yieldRate * (p.marketValue / totalValue),
          0
        )
      : 0;

    const yieldByAsset: YieldByAsset[] = portfolio.rwaPositions.map(p => ({
      assetId: p.assetId,
      assetName: p.assetName,
      assetClass: p.assetClass,
      yieldEarned: p.accruedYield,
      yieldRate: p.yieldRate,
      weight: p.weight,
    }));

    // Upcoming distributions (simplified)
    const upcomingDistributions: UpcomingDistribution[] = portfolio.rwaPositions
      .filter(p => p.yieldRate > 0)
      .map(p => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30); // Monthly distributions
        return {
          assetId: p.assetId,
          assetName: p.assetName,
          estimatedAmount: p.marketValue * (p.yieldRate / 12),
          estimatedDate: nextDate,
          distributionType: 'interest' as const,
        };
      });

    return {
      portfolioId,
      totalYieldEarned,
      annualizedYield,
      cryptoYield,
      rwaYield,
      dailyYield: totalYieldEarned / 365,
      weeklyYield: totalYieldEarned / 52,
      monthlyYield: totalYieldEarned / 12,
      yieldByAsset,
      upcomingDistributions,
      generatedAt: new Date(),
    };
  }

  async createTokenizedFund(config: TokenizedFundConfig): Promise<TokenizedFund> {
    const fundId = this.generateId('fund');

    // Create the underlying portfolio
    const portfolio = await this.createPortfolio(
      `${config.name} Portfolio`,
      fundId,
      config.allocationConfig
    );

    const fund: TokenizedFund = {
      id: fundId,
      name: config.name,
      symbol: config.symbol,
      fundType: config.fundType,
      strategy: config.strategy,
      nav: 1.00, // Start at $1 per share
      totalShares: 0,
      totalAum: 0,
      currency: config.currency,
      managementFee: config.managementFee,
      performanceFee: config.performanceFee,
      hurdle: config.hurdle,
      minimumInvestment: config.minimumInvestment,
      lockupPeriod: config.lockupPeriod,
      redemptionNoticeDays: config.redemptionNoticeDays,
      portfolio: this.clonePortfolio(this.portfolios.get(portfolio.id)!),
      investors: [],
      status: 'active',
      launchedAt: new Date(),
      metadata: {},
    };

    this.funds.set(fundId, fund);
    this.subscriptions.set(fundId, []);
    this.redemptions.set(fundId, []);

    this.emitEvent('info', 'fund', `Tokenized fund created: ${config.name}`, {
      fundId,
      symbol: config.symbol,
    });

    return { ...fund };
  }

  getFund(fundId: string): TokenizedFund | undefined {
    const fund = this.funds.get(fundId);
    if (!fund) return undefined;
    return { ...fund };
  }

  listFunds(filters?: FundFilters): TokenizedFund[] {
    let funds = Array.from(this.funds.values());

    if (filters) {
      if (filters.strategy?.length) {
        funds = funds.filter(f => filters.strategy!.includes(f.strategy));
      }
      if (filters.status?.length) {
        funds = funds.filter(f => filters.status!.includes(f.status));
      }
      if (filters.minAum !== undefined) {
        funds = funds.filter(f => f.totalAum >= filters.minAum!);
      }
    }

    return funds.map(f => ({ ...f }));
  }

  async subscribeFund(
    fundId: string,
    investorId: string,
    amount: number,
    currency: string
  ): Promise<FundSubscription> {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund not found: ${fundId}`);

    if (fund.status !== 'active') {
      throw new Error(`Fund is not active: ${fundId}`);
    }

    if (amount < fund.minimumInvestment) {
      throw new Error(`Amount ${amount} below minimum investment ${fund.minimumInvestment}`);
    }

    const subscription: FundSubscription = {
      id: this.generateId('sub'),
      fundId,
      investorId,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date(),
    };

    const fundSubs = this.subscriptions.get(fundId) ?? [];
    fundSubs.push(subscription);
    this.subscriptions.set(fundId, fundSubs);

    this.emitEvent('info', 'fund', `Fund subscription submitted: ${fundId}`, {
      subscriptionId: subscription.id,
      investorId,
      amount,
    });

    return { ...subscription };
  }

  async redeemFund(
    fundId: string,
    investorId: string,
    shares: number
  ): Promise<FundRedemption> {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund not found: ${fundId}`);

    const investor = fund.investors.find(i => i.investorId === investorId);
    if (!investor) throw new Error(`Investor not found in fund: ${investorId}`);

    if (shares > investor.sharesOwned) {
      throw new Error(`Insufficient shares: ${investor.sharesOwned} < ${shares}`);
    }

    const redemption: FundRedemption = {
      id: this.generateId('redeem'),
      fundId,
      investorId,
      sharesRedeemed: shares,
      estimatedValue: shares * fund.nav,
      status: 'pending',
      requestedAt: new Date(),
    };

    const fundRedemptions = this.redemptions.get(fundId) ?? [];
    fundRedemptions.push(redemption);
    this.redemptions.set(fundId, fundRedemptions);

    this.emitEvent('info', 'fund', `Fund redemption submitted: ${fundId}`, {
      redemptionId: redemption.id,
      investorId,
      shares,
    });

    return { ...redemption };
  }

  async processSubscriptions(fundId: string): Promise<ProcessingResult> {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund not found: ${fundId}`);

    const pendingSubs = (this.subscriptions.get(fundId) ?? []).filter(
      s => s.status === 'pending'
    );

    let successful = 0;
    let failed = 0;
    let totalValue = 0;
    const errors: string[] = [];

    for (const sub of pendingSubs) {
      try {
        sub.status = 'processing';

        // Calculate shares at current NAV
        const sharesAllocated = sub.amount / fund.nav;
        sub.sharesAllocated = sharesAllocated;
        sub.navAtSubscription = fund.nav;

        // Update fund state
        fund.totalShares += sharesAllocated;
        fund.totalAum += sub.amount;

        // Add or update investor record
        const existingInvestor = fund.investors.find(i => i.investorId === sub.investorId);
        if (existingInvestor) {
          existingInvestor.sharesOwned += sharesAllocated;
          existingInvestor.totalInvested += sub.amount;
          existingInvestor.lastTransactionDate = new Date();
        } else {
          const fundInvestor: FundInvestor = {
            id: this.generateId('finvestor'),
            investorId: sub.investorId,
            sharesOwned: sharesAllocated,
            totalInvested: sub.amount,
            currentValue: sub.amount,
            unrealizedPnL: 0,
            yieldEarned: 0,
            subscriptionDate: new Date(),
            lastTransactionDate: new Date(),
          };
          fund.investors.push(fundInvestor);
        }

        sub.status = 'completed';
        sub.processedAt = new Date();
        totalValue += sub.amount;
        successful++;
      } catch (e) {
        sub.status = 'rejected';
        errors.push(`Subscription ${sub.id} failed: ${e}`);
        failed++;
      }
    }

    this.emitEvent('info', 'fund', `Subscriptions processed: ${fundId}`, {
      fundId,
      successful,
      failed,
      totalValue,
    });

    return { processed: pendingSubs.length, successful, failed, totalValue, errors };
  }

  async processRedemptions(fundId: string): Promise<ProcessingResult> {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund not found: ${fundId}`);

    const pendingRedemptions = (this.redemptions.get(fundId) ?? []).filter(
      r => r.status === 'pending'
    );

    let successful = 0;
    let failed = 0;
    let totalValue = 0;
    const errors: string[] = [];

    for (const redemption of pendingRedemptions) {
      try {
        redemption.status = 'processing';

        const investor = fund.investors.find(i => i.investorId === redemption.investorId);
        if (!investor) {
          throw new Error(`Investor not found: ${redemption.investorId}`);
        }

        if (investor.sharesOwned < redemption.sharesRedeemed) {
          throw new Error(`Insufficient shares`);
        }

        const actualValue = redemption.sharesRedeemed * fund.nav;

        // Apply early redemption penalty if applicable
        const penalty = fund.lockupPeriod ? actualValue * 0.01 : 0; // 1% penalty
        const netValue = actualValue - penalty;

        investor.sharesOwned -= redemption.sharesRedeemed;
        investor.lastTransactionDate = new Date();

        fund.totalShares -= redemption.sharesRedeemed;
        fund.totalAum -= actualValue;

        redemption.actualValue = netValue;
        redemption.navAtRedemption = fund.nav;
        redemption.penalty = penalty;
        redemption.status = 'completed';
        redemption.processedAt = new Date();

        totalValue += netValue;
        successful++;
      } catch (e) {
        redemption.status = 'rejected';
        errors.push(`Redemption ${redemption.id} failed: ${e}`);
        failed++;
      }
    }

    return { processed: pendingRedemptions.length, successful, failed, totalValue, errors };
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private recalculatePortfolio(portfolio: HybridPortfolio): void {
    const cryptoValue = portfolio.cryptoPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const rwaValue = portfolio.rwaPositions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalValue = cryptoValue + rwaValue + portfolio.cashBalance;

    portfolio.totalValue = totalValue;

    // Update weights
    if (totalValue > 0) {
      portfolio.cryptoPositions.forEach(p => {
        p.weight = p.marketValue / totalValue;
      });
      portfolio.rwaPositions.forEach(p => {
        p.weight = p.marketValue / totalValue;
      });
    }
  }

  private createEmptyPerformance(): PortfolioPerformance {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      cryptoReturn: 0,
      rwaReturn: 0,
      yieldIncome: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      period: '30d',
    };
  }

  private createEmptyRiskMetrics(): PortfolioRiskMetrics {
    return {
      var95: 0,
      var99: 0,
      beta: 0,
      concentration: 0,
      cryptoCorrelation: 0,
      liquidityRisk: 0,
      counterpartyRisk: 0,
      jurisdictionRisk: 0,
    };
  }

  private clonePortfolio(portfolio: HybridPortfolio): HybridPortfolio {
    return {
      ...portfolio,
      cryptoPositions: portfolio.cryptoPositions.map(p => ({ ...p })),
      rwaPositions: portfolio.rwaPositions.map(p => ({ ...p })),
      allocationConfig: { ...portfolio.allocationConfig },
      performance: { ...portfolio.performance },
      riskMetrics: { ...portfolio.riskMetrics },
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: RWAEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'portfolio_rebalanced',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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

export function createHybridPortfolioEngine(): DefaultHybridPortfolioEngine {
  return new DefaultHybridPortfolioEngine();
}
