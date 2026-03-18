/**
 * TONAIAgent - Investment Portfolio Manager
 *
 * Personalized investment and portfolio management with risk profiling,
 * dynamic allocation, continuous optimization, and diversified portfolio strategies.
 */

import {
  InvestmentPortfolio,
  PortfolioType,
  RiskProfile,
  AssetAllocation,
  PortfolioHolding,
  PortfolioPerformance,
  RebalancingConfig,
  InvestmentAutomation,
  DCAConfig,
  AssetClass,
  RiskTolerance,
  InvestmentConfig,
  BenchmarkComparison,
  PersonalFinanceEvent,
  PersonalFinanceEventCallback,
} from './types';

// ============================================================================
// Portfolio Manager Interface
// ============================================================================

export interface PortfolioManager {
  readonly config: InvestmentConfig;

  // Portfolio management
  createPortfolio(params: CreatePortfolioParams): Promise<InvestmentPortfolio>;
  getPortfolio(portfolioId: string): Promise<InvestmentPortfolio | null>;
  getUserPortfolios(userId: string): Promise<InvestmentPortfolio[]>;
  updatePortfolio(portfolioId: string, updates: UpdatePortfolioParams): Promise<InvestmentPortfolio>;
  closePortfolio(portfolioId: string): Promise<void>;

  // Holdings management
  addHolding(portfolioId: string, holding: AddHoldingParams): Promise<PortfolioHolding>;
  updateHolding(portfolioId: string, holdingId: string, updates: UpdateHoldingParams): Promise<PortfolioHolding>;
  removeHolding(portfolioId: string, holdingId: string): Promise<void>;
  getHoldings(portfolioId: string): Promise<PortfolioHolding[]>;

  // Risk profiling
  assessRiskProfile(userId: string, answers: RiskAssessmentAnswers): Promise<RiskProfile>;
  getRiskProfile(userId: string): Promise<RiskProfile | null>;
  updateRiskProfile(userId: string, profile: Partial<RiskProfile>): Promise<RiskProfile>;

  // Allocation
  suggestAllocation(riskProfile: RiskProfile, amount: number): Promise<SuggestedAllocation>;
  optimizeAllocation(portfolioId: string): Promise<OptimizationResult>;
  checkAllocationDrift(portfolioId: string): Promise<DriftAnalysis>;

  // Rebalancing
  checkRebalanceNeeded(portfolioId: string): Promise<RebalanceCheck>;
  generateRebalancePlan(portfolioId: string): Promise<RebalancePlan>;
  executeRebalance(portfolioId: string, plan: RebalancePlan): Promise<RebalanceResult>;

  // DCA (Dollar Cost Averaging)
  configureDCA(portfolioId: string, config: DCAConfig): Promise<InvestmentPortfolio>;
  executeDCA(portfolioId: string): Promise<DCAExecutionResult>;
  getDCAHistory(portfolioId: string): Promise<DCAHistoryEntry[]>;

  // Performance
  calculatePerformance(portfolioId: string): Promise<PortfolioPerformance>;
  getPerformanceHistory(portfolioId: string, period?: string): Promise<PerformanceHistoryEntry[]>;
  compareToBenchmark(portfolioId: string, benchmark: string): Promise<BenchmarkComparison>;

  // Analysis
  analyzePortfolio(portfolioId: string): Promise<PortfolioAnalysis>;
  getRecommendations(portfolioId: string): Promise<PortfolioRecommendation[]>;

  // Configuration
  updateConfig(config: Partial<InvestmentConfig>): void;

  // Events
  onEvent(callback: PersonalFinanceEventCallback): void;
}

export interface CreatePortfolioParams {
  userId: string;
  name: string;
  type: PortfolioType;
  initialInvestment?: number;
  targetAllocation?: AssetAllocation[];
  automation?: Partial<InvestmentAutomation>;
}

export interface UpdatePortfolioParams {
  name?: string;
  type?: PortfolioType;
  targetAllocation?: AssetAllocation[];
  rebalancing?: Partial<RebalancingConfig>;
  automation?: Partial<InvestmentAutomation>;
  status?: 'active' | 'paused' | 'liquidating' | 'closed';
}

export interface AddHoldingParams {
  asset: string;
  assetClass: AssetClass;
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
}

export interface UpdateHoldingParams {
  quantity?: number;
  averageCost?: number;
  currentPrice?: number;
}

export interface RiskAssessmentAnswers {
  investmentExperience: 'none' | 'limited' | 'moderate' | 'extensive';
  investmentHorizon: 'short_term' | 'medium_term' | 'long_term' | 'very_long_term';
  volatilityComfort: 1 | 2 | 3 | 4 | 5;
  lossReaction: 'sell_all' | 'sell_some' | 'hold' | 'buy_more';
  incomeStability: 'unstable' | 'somewhat_stable' | 'stable' | 'very_stable';
  emergencyFund: 'none' | 'partial' | 'adequate' | 'extensive';
  investmentGoal: 'preservation' | 'income' | 'growth' | 'aggressive_growth';
}

export interface SuggestedAllocation {
  allocations: AssetAllocation[];
  rationale: string;
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
}

export interface OptimizationResult {
  currentAllocation: AssetAllocation[];
  optimizedAllocation: AssetAllocation[];
  expectedImprovement: {
    return: number;
    volatility: number;
    sharpeRatio: number;
  };
  trades: SuggestedTrade[];
}

export interface SuggestedTrade {
  asset: string;
  action: 'buy' | 'sell';
  quantity: number;
  estimatedValue: number;
  reason: string;
}

export interface DriftAnalysis {
  hasDrift: boolean;
  overallDrift: number;
  driftByAsset: AssetDrift[];
  rebalanceRecommended: boolean;
}

export interface AssetDrift {
  assetClass: AssetClass;
  targetPercentage: number;
  currentPercentage: number;
  drift: number;
  action: 'buy' | 'sell' | 'hold';
}

export interface RebalanceCheck {
  needsRebalancing: boolean;
  reason?: string;
  daysUntilScheduled?: number;
  driftPercentage: number;
}

export interface RebalancePlan {
  id: string;
  portfolioId: string;
  trades: SuggestedTrade[];
  estimatedCost: number;
  estimatedTaxImpact: number;
  currentAllocation: AssetAllocation[];
  targetAllocation: AssetAllocation[];
  createdAt: Date;
}

export interface RebalanceResult {
  success: boolean;
  planId: string;
  executedTrades: ExecutedTrade[];
  newAllocation: AssetAllocation[];
  totalCost: number;
  error?: string;
}

export interface ExecutedTrade {
  asset: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  timestamp: Date;
}

export interface DCAExecutionResult {
  success: boolean;
  portfolioId: string;
  totalInvested: number;
  purchases: DCAPurchase[];
  nextExecutionDate: Date;
  error?: string;
}

export interface DCAPurchase {
  asset: string;
  quantity: number;
  price: number;
  value: number;
}

export interface DCAHistoryEntry {
  date: Date;
  totalInvested: number;
  purchases: DCAPurchase[];
  portfolioValueAfter: number;
}

export interface PerformanceHistoryEntry {
  date: Date;
  portfolioValue: number;
  dailyReturn: number;
  cumulativeReturn: number;
}

export interface PortfolioAnalysis {
  portfolioId: string;
  analysisDate: Date;
  summary: AnalysisSummary;
  riskMetrics: RiskMetrics;
  diversificationScore: number;
  concentrationRisk: ConcentrationRisk[];
  correlationMatrix: CorrelationData;
  recommendations: PortfolioRecommendation[];
}

export interface AnalysisSummary {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  returnPercent: number;
  status: 'healthy' | 'needs_attention' | 'at_risk';
  highlights: string[];
  concerns: string[];
}

export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  beta: number;
}

export interface ConcentrationRisk {
  type: 'asset' | 'asset_class' | 'sector';
  name: string;
  percentage: number;
  threshold: number;
  isExcessive: boolean;
}

export interface CorrelationData {
  assets: string[];
  matrix: number[][];
  highlyCorrelated: Array<{ asset1: string; asset2: string; correlation: number }>;
}

export interface PortfolioRecommendation {
  id: string;
  type: 'rebalance' | 'diversify' | 'reduce_risk' | 'optimize' | 'tax_harvest';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  action?: SuggestedTrade[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultPortfolioManager implements PortfolioManager {
  private _config: InvestmentConfig;
  private readonly portfolios: Map<string, InvestmentPortfolio> = new Map();
  private readonly userPortfolios: Map<string, string[]> = new Map();
  private readonly riskProfiles: Map<string, RiskProfile> = new Map();
  private readonly eventCallbacks: PersonalFinanceEventCallback[] = [];

  // Default allocation templates by portfolio type
  private readonly allocationTemplates: Record<PortfolioType, AssetAllocation[]> = {
    conservative: [
      { assetClass: 'stablecoins', targetPercentage: 60, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'crypto', targetPercentage: 15, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'defi_yield', targetPercentage: 15, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'cash', targetPercentage: 10, currentPercentage: 0, currentValue: 0 },
    ],
    balanced: [
      { assetClass: 'crypto', targetPercentage: 35, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'stablecoins', targetPercentage: 30, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'defi_yield', targetPercentage: 20, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'liquid_staking', targetPercentage: 10, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'cash', targetPercentage: 5, currentPercentage: 0, currentValue: 0 },
    ],
    growth: [
      { assetClass: 'crypto', targetPercentage: 50, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'defi_yield', targetPercentage: 25, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'liquid_staking', targetPercentage: 15, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'stablecoins', targetPercentage: 10, currentPercentage: 0, currentValue: 0 },
    ],
    aggressive: [
      { assetClass: 'crypto', targetPercentage: 60, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'defi_yield', targetPercentage: 20, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'liquid_staking', targetPercentage: 15, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'nft', targetPercentage: 5, currentPercentage: 0, currentValue: 0 },
    ],
    income: [
      { assetClass: 'defi_yield', targetPercentage: 40, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'liquid_staking', targetPercentage: 30, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'stablecoins', targetPercentage: 20, currentPercentage: 0, currentValue: 0 },
      { assetClass: 'lending', targetPercentage: 10, currentPercentage: 0, currentValue: 0 },
    ],
    custom: [],
  };

  constructor(config?: Partial<InvestmentConfig>) {
    this._config = {
      enabled: true,
      minInvestmentAmount: 10,
      allowedAssetClasses: ['crypto', 'stablecoins', 'defi_yield', 'liquid_staking', 'lending', 'cash'],
      maxConcentration: 40,
      rebalanceThreshold: 5,
      dcaEnabled: true,
      ...config,
    };
  }

  get config(): InvestmentConfig {
    return this._config;
  }

  async createPortfolio(params: CreatePortfolioParams): Promise<InvestmentPortfolio> {
    const portfolioId = `port_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Get default allocation based on portfolio type
    const targetAllocation = params.targetAllocation ?? this.allocationTemplates[params.type];

    const portfolio: InvestmentPortfolio = {
      id: portfolioId,
      userId: params.userId,
      name: params.name,
      type: params.type,
      status: 'active',
      riskProfile: await this.getRiskProfile(params.userId) ?? this.getDefaultRiskProfile(),
      allocation: {
        targetAllocation,
        currentAllocation: targetAllocation.map(a => ({ ...a, currentPercentage: 0, currentValue: 0 })),
        driftTolerance: this._config.rebalanceThreshold,
        rebalanceThreshold: this._config.rebalanceThreshold,
      },
      holdings: [],
      performance: this.initializePerformance(),
      rebalancing: {
        enabled: true,
        strategy: 'threshold',
        thresholdPercent: this._config.rebalanceThreshold,
        autoExecute: false,
      },
      automation: {
        dollarCostAveraging: {
          enabled: params.automation?.dollarCostAveraging?.enabled ?? false,
          amount: params.automation?.dollarCostAveraging?.amount ?? 0,
          frequency: params.automation?.dollarCostAveraging?.frequency ?? 'monthly',
          assets: params.automation?.dollarCostAveraging?.assets ?? [],
        },
        autoRebalance: params.automation?.autoRebalance ?? false,
        taxLossHarvesting: params.automation?.taxLossHarvesting ?? false,
        dividendReinvestment: params.automation?.dividendReinvestment ?? true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.portfolios.set(portfolioId, portfolio);

    // Track user portfolios
    const userPorts = this.userPortfolios.get(params.userId) ?? [];
    userPorts.push(portfolioId);
    this.userPortfolios.set(params.userId, userPorts);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'investment_made',
      userId: params.userId,
      action: 'portfolio_created',
      resource: 'investment_portfolio',
      resourceId: portfolioId,
      details: {
        type: params.type,
        initialInvestment: params.initialInvestment ?? 0,
      },
      metadata: {},
    });

    return portfolio;
  }

  async getPortfolio(portfolioId: string): Promise<InvestmentPortfolio | null> {
    return this.portfolios.get(portfolioId) ?? null;
  }

  async getUserPortfolios(userId: string): Promise<InvestmentPortfolio[]> {
    const portfolioIds = this.userPortfolios.get(userId) ?? [];
    const portfolios: InvestmentPortfolio[] = [];

    for (const id of portfolioIds) {
      const portfolio = this.portfolios.get(id);
      if (portfolio) {
        portfolios.push(portfolio);
      }
    }

    return portfolios;
  }

  async updatePortfolio(
    portfolioId: string,
    updates: UpdatePortfolioParams
  ): Promise<InvestmentPortfolio> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    if (updates.name) portfolio.name = updates.name;
    if (updates.type) portfolio.type = updates.type;
    if (updates.status) portfolio.status = updates.status;

    if (updates.targetAllocation) {
      portfolio.allocation.targetAllocation = updates.targetAllocation;
    }

    if (updates.rebalancing) {
      portfolio.rebalancing = { ...portfolio.rebalancing, ...updates.rebalancing };
    }

    if (updates.automation) {
      portfolio.automation = { ...portfolio.automation, ...updates.automation };
    }

    portfolio.updatedAt = new Date();
    this.portfolios.set(portfolioId, portfolio);

    return portfolio;
  }

  async closePortfolio(portfolioId: string): Promise<void> {
    await this.updatePortfolio(portfolioId, { status: 'closed' });
  }

  async addHolding(portfolioId: string, params: AddHoldingParams): Promise<PortfolioHolding> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const holdingId = `hold_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const currentPrice = params.currentPrice ?? params.averageCost;
    const currentValue = params.quantity * currentPrice;
    const unrealizedPnL = currentValue - (params.quantity * params.averageCost);

    const holding: PortfolioHolding = {
      id: holdingId,
      asset: params.asset,
      assetClass: params.assetClass,
      symbol: params.symbol,
      quantity: params.quantity,
      averageCost: params.averageCost,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPercent: (unrealizedPnL / (params.quantity * params.averageCost)) * 100,
      weight: 0, // Will be calculated
      lastUpdated: new Date(),
    };

    portfolio.holdings.push(holding);
    this.recalculatePortfolio(portfolio);
    this.portfolios.set(portfolioId, portfolio);

    return holding;
  }

  async updateHolding(
    portfolioId: string,
    holdingId: string,
    updates: UpdateHoldingParams
  ): Promise<PortfolioHolding> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const holdingIndex = portfolio.holdings.findIndex(h => h.id === holdingId);
    if (holdingIndex === -1) {
      throw new Error(`Holding not found: ${holdingId}`);
    }

    const holding = portfolio.holdings[holdingIndex];

    if (updates.quantity !== undefined) holding.quantity = updates.quantity;
    if (updates.averageCost !== undefined) holding.averageCost = updates.averageCost;
    if (updates.currentPrice !== undefined) holding.currentPrice = updates.currentPrice;

    // Recalculate holding values
    holding.currentValue = holding.quantity * holding.currentPrice;
    holding.unrealizedPnL = holding.currentValue - (holding.quantity * holding.averageCost);
    holding.unrealizedPnLPercent = (holding.unrealizedPnL / (holding.quantity * holding.averageCost)) * 100;
    holding.lastUpdated = new Date();

    portfolio.holdings[holdingIndex] = holding;
    this.recalculatePortfolio(portfolio);
    this.portfolios.set(portfolioId, portfolio);

    return holding;
  }

  async removeHolding(portfolioId: string, holdingId: string): Promise<void> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    portfolio.holdings = portfolio.holdings.filter(h => h.id !== holdingId);
    this.recalculatePortfolio(portfolio);
    this.portfolios.set(portfolioId, portfolio);
  }

  async getHoldings(portfolioId: string): Promise<PortfolioHolding[]> {
    const portfolio = this.portfolios.get(portfolioId);
    return portfolio?.holdings ?? [];
  }

  async assessRiskProfile(userId: string, answers: RiskAssessmentAnswers): Promise<RiskProfile> {
    // Calculate risk score based on answers
    let score = 0;

    // Investment experience (0-20 points)
    const experienceScores = { none: 0, limited: 7, moderate: 14, extensive: 20 };
    score += experienceScores[answers.investmentExperience];

    // Investment horizon (0-20 points)
    const horizonScores = { short_term: 5, medium_term: 10, long_term: 15, very_long_term: 20 };
    score += horizonScores[answers.investmentHorizon];

    // Volatility comfort (0-20 points)
    score += answers.volatilityComfort * 4;

    // Loss reaction (0-20 points)
    const lossScores = { sell_all: 0, sell_some: 7, hold: 14, buy_more: 20 };
    score += lossScores[answers.lossReaction];

    // Income stability (0-10 points)
    const incomeScores = { unstable: 0, somewhat_stable: 3, stable: 7, very_stable: 10 };
    score += incomeScores[answers.incomeStability];

    // Emergency fund (0-10 points)
    const fundScores = { none: 0, partial: 3, adequate: 7, extensive: 10 };
    score += fundScores[answers.emergencyFund];

    // Determine tolerance level
    let tolerance: RiskTolerance;
    if (score < 30) {
      tolerance = 'conservative';
    } else if (score < 50) {
      tolerance = 'moderate';
    } else if (score < 70) {
      tolerance = 'aggressive';
    } else {
      tolerance = 'very_aggressive';
    }

    // Determine capacity
    let capacity: 'low' | 'medium' | 'high';
    if (answers.emergencyFund === 'extensive' && answers.incomeStability === 'very_stable') {
      capacity = 'high';
    } else if (answers.emergencyFund === 'none' || answers.incomeStability === 'unstable') {
      capacity = 'low';
    } else {
      capacity = 'medium';
    }

    const profile: RiskProfile = {
      score,
      tolerance,
      capacity,
      volatilityTolerance: answers.volatilityComfort * 10,
      maxDrawdownTolerance: this.getMaxDrawdownByTolerance(tolerance),
      assessmentDate: new Date(),
    };

    this.riskProfiles.set(userId, profile);

    return profile;
  }

  async getRiskProfile(userId: string): Promise<RiskProfile | null> {
    return this.riskProfiles.get(userId) ?? null;
  }

  async updateRiskProfile(userId: string, updates: Partial<RiskProfile>): Promise<RiskProfile> {
    const existing = this.riskProfiles.get(userId);
    const profile: RiskProfile = {
      ...(existing ?? this.getDefaultRiskProfile()),
      ...updates,
      assessmentDate: new Date(),
    };

    this.riskProfiles.set(userId, profile);
    return profile;
  }

  async suggestAllocation(riskProfile: RiskProfile, amount: number): Promise<SuggestedAllocation> {
    // Get base allocation template based on risk tolerance
    const templateType = this.getPortfolioTypeForRisk(riskProfile.tolerance);
    const allocations = this.allocationTemplates[templateType].map(a => ({
      ...a,
      currentValue: amount * (a.targetPercentage / 100),
    }));

    // Calculate expected metrics
    const expectedReturn = this.getExpectedReturn(templateType);
    const expectedVolatility = this.getExpectedVolatility(templateType);

    return {
      allocations,
      rationale: this.getAllocationRationale(riskProfile.tolerance),
      expectedReturn,
      expectedVolatility,
      sharpeRatio: (expectedReturn - 0.02) / expectedVolatility, // Assuming 2% risk-free rate
    };
  }

  async optimizeAllocation(portfolioId: string): Promise<OptimizationResult> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const currentAllocation = portfolio.allocation.currentAllocation;
    const targetAllocation = portfolio.allocation.targetAllocation;

    // Generate trades to move toward target allocation
    const trades: SuggestedTrade[] = [];
    const totalValue = portfolio.performance.totalValue;

    for (const target of targetAllocation) {
      const current = currentAllocation.find(c => c.assetClass === target.assetClass);
      const currentValue = current?.currentValue ?? 0;
      const targetValue = totalValue * (target.targetPercentage / 100);
      const difference = targetValue - currentValue;

      if (Math.abs(difference) > totalValue * 0.01) { // More than 1% difference
        trades.push({
          asset: target.assetClass,
          action: difference > 0 ? 'buy' : 'sell',
          quantity: 0, // Would calculate based on prices
          estimatedValue: Math.abs(difference),
          reason: `Rebalance ${target.assetClass} to target allocation`,
        });
      }
    }

    return {
      currentAllocation,
      optimizedAllocation: targetAllocation,
      expectedImprovement: {
        return: 0.5, // Placeholder
        volatility: -1,
        sharpeRatio: 0.1,
      },
      trades,
    };
  }

  async checkAllocationDrift(portfolioId: string): Promise<DriftAnalysis> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const driftByAsset: AssetDrift[] = [];
    let totalDrift = 0;

    for (const target of portfolio.allocation.targetAllocation) {
      const current = portfolio.allocation.currentAllocation.find(
        c => c.assetClass === target.assetClass
      );
      const currentPercentage = current?.currentPercentage ?? 0;
      const drift = Math.abs(currentPercentage - target.targetPercentage);
      totalDrift += drift;

      let action: 'buy' | 'sell' | 'hold' = 'hold';
      if (currentPercentage < target.targetPercentage - portfolio.allocation.driftTolerance) {
        action = 'buy';
      } else if (currentPercentage > target.targetPercentage + portfolio.allocation.driftTolerance) {
        action = 'sell';
      }

      driftByAsset.push({
        assetClass: target.assetClass,
        targetPercentage: target.targetPercentage,
        currentPercentage,
        drift,
        action,
      });
    }

    const overallDrift = totalDrift / portfolio.allocation.targetAllocation.length;

    return {
      hasDrift: overallDrift > portfolio.allocation.driftTolerance,
      overallDrift,
      driftByAsset,
      rebalanceRecommended: overallDrift > portfolio.allocation.rebalanceThreshold,
    };
  }

  async checkRebalanceNeeded(portfolioId: string): Promise<RebalanceCheck> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const driftAnalysis = await this.checkAllocationDrift(portfolioId);

    // Check threshold-based rebalancing
    if (portfolio.rebalancing.strategy === 'threshold' || portfolio.rebalancing.strategy === 'hybrid') {
      if (driftAnalysis.overallDrift > portfolio.rebalancing.thresholdPercent) {
        return {
          needsRebalancing: true,
          reason: `Portfolio drift of ${driftAnalysis.overallDrift.toFixed(1)}% exceeds ${portfolio.rebalancing.thresholdPercent}% threshold`,
          driftPercentage: driftAnalysis.overallDrift,
        };
      }
    }

    // Check calendar-based rebalancing
    if (portfolio.rebalancing.strategy === 'calendar' || portfolio.rebalancing.strategy === 'hybrid') {
      const lastRebalance = portfolio.rebalancing.lastRebalanceDate;
      if (lastRebalance && portfolio.rebalancing.frequency) {
        const daysSinceRebalance = Math.floor(
          (Date.now() - lastRebalance.getTime()) / (1000 * 60 * 60 * 24)
        );
        const frequencyDays = this.getFrequencyDays(portfolio.rebalancing.frequency);

        if (daysSinceRebalance >= frequencyDays) {
          return {
            needsRebalancing: true,
            reason: `Scheduled ${portfolio.rebalancing.frequency} rebalancing is due`,
            driftPercentage: driftAnalysis.overallDrift,
          };
        }

        return {
          needsRebalancing: false,
          daysUntilScheduled: frequencyDays - daysSinceRebalance,
          driftPercentage: driftAnalysis.overallDrift,
        };
      }
    }

    return {
      needsRebalancing: false,
      driftPercentage: driftAnalysis.overallDrift,
    };
  }

  async generateRebalancePlan(portfolioId: string): Promise<RebalancePlan> {
    const optimization = await this.optimizeAllocation(portfolioId);

    return {
      id: `plan_${Date.now()}`,
      portfolioId,
      trades: optimization.trades,
      estimatedCost: optimization.trades.reduce((sum, t) => sum + t.estimatedValue * 0.001, 0), // 0.1% estimated fees
      estimatedTaxImpact: 0, // Would calculate based on gains
      currentAllocation: optimization.currentAllocation,
      targetAllocation: optimization.optimizedAllocation,
      createdAt: new Date(),
    };
  }

  async executeRebalance(portfolioId: string, plan: RebalancePlan): Promise<RebalanceResult> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      return {
        success: false,
        planId: plan.id,
        executedTrades: [],
        newAllocation: [],
        totalCost: 0,
        error: 'Portfolio not found',
      };
    }

    // Execute trades (simulated)
    const executedTrades: ExecutedTrade[] = plan.trades.map(trade => ({
      asset: trade.asset,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.estimatedValue / (trade.quantity || 1),
      value: trade.estimatedValue,
      timestamp: new Date(),
    }));

    // Update portfolio allocation
    portfolio.allocation.currentAllocation = plan.targetAllocation;
    portfolio.rebalancing.lastRebalanceDate = new Date();
    portfolio.updatedAt = new Date();

    this.portfolios.set(portfolioId, portfolio);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'portfolio_rebalanced',
      userId: portfolio.userId,
      action: 'rebalance_executed',
      resource: 'investment_portfolio',
      resourceId: portfolioId,
      details: {
        tradesExecuted: executedTrades.length,
        totalCost: plan.estimatedCost,
      },
      metadata: {},
    });

    return {
      success: true,
      planId: plan.id,
      executedTrades,
      newAllocation: plan.targetAllocation,
      totalCost: plan.estimatedCost,
    };
  }

  async configureDCA(portfolioId: string, dcaConfig: DCAConfig): Promise<InvestmentPortfolio> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    portfolio.automation.dollarCostAveraging = dcaConfig;
    portfolio.updatedAt = new Date();
    this.portfolios.set(portfolioId, portfolio);

    return portfolio;
  }

  async executeDCA(portfolioId: string): Promise<DCAExecutionResult> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      return {
        success: false,
        portfolioId,
        totalInvested: 0,
        purchases: [],
        nextExecutionDate: new Date(),
        error: 'Portfolio not found',
      };
    }

    const dca = portfolio.automation.dollarCostAveraging;
    if (!dca.enabled || dca.amount <= 0) {
      return {
        success: false,
        portfolioId,
        totalInvested: 0,
        purchases: [],
        nextExecutionDate: new Date(),
        error: 'DCA is not enabled or amount is invalid',
      };
    }

    // Execute purchases based on allocation
    const purchases: DCAPurchase[] = dca.assets.map(asset => ({
      asset: asset.symbol,
      quantity: 0, // Would calculate based on current price
      price: 0, // Would fetch current price
      value: dca.amount * (asset.allocation / 100),
    }));

    const totalInvested = purchases.reduce((sum, p) => sum + p.value, 0);

    // Calculate next execution date
    const nextExecutionDate = this.calculateNextDCADate(dca.frequency);
    portfolio.automation.dollarCostAveraging.nextExecutionDate = nextExecutionDate;

    this.portfolios.set(portfolioId, portfolio);

    return {
      success: true,
      portfolioId,
      totalInvested,
      purchases,
      nextExecutionDate,
    };
  }

  async getDCAHistory(_portfolioId: string): Promise<DCAHistoryEntry[]> {
    // Would fetch from database
    return [];
  }

  async calculatePerformance(portfolioId: string): Promise<PortfolioPerformance> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCost = portfolio.holdings.reduce((sum, h) => sum + h.quantity * h.averageCost, 0);
    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    const performance: PortfolioPerformance = {
      totalValue,
      totalCost,
      totalReturn,
      totalReturnPercent,
      dailyReturn: 0, // Would calculate from historical data
      weeklyReturn: 0,
      monthlyReturn: 0,
      yearlyReturn: 0,
      allTimeReturn: totalReturnPercent,
      sharpeRatio: 0, // Would calculate from returns and volatility
      volatility: 0,
      maxDrawdown: 0,
      lastCalculatedAt: new Date(),
    };

    portfolio.performance = performance;
    this.portfolios.set(portfolioId, portfolio);

    return performance;
  }

  async getPerformanceHistory(
    _portfolioId: string,
    _period: string = '1year'
  ): Promise<PerformanceHistoryEntry[]> {
    // Would fetch from database
    return [];
  }

  async compareToBenchmark(portfolioId: string, benchmark: string): Promise<BenchmarkComparison> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    // Simulated benchmark comparison
    return {
      benchmark,
      benchmarkReturn: 10, // 10% benchmark return
      alpha: portfolio.performance.totalReturnPercent - 10,
      beta: 1.1,
      correlations: 0.8,
    };
  }

  async analyzePortfolio(portfolioId: string): Promise<PortfolioAnalysis> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio not found: ${portfolioId}`);
    }

    await this.calculatePerformance(portfolioId);
    const driftAnalysis = await this.checkAllocationDrift(portfolioId);

    // Analyze concentration risks
    const concentrationRisks: ConcentrationRisk[] = [];
    for (const holding of portfolio.holdings) {
      if (holding.weight > this._config.maxConcentration) {
        concentrationRisks.push({
          type: 'asset',
          name: holding.symbol,
          percentage: holding.weight,
          threshold: this._config.maxConcentration,
          isExcessive: true,
        });
      }
    }

    // Generate recommendations
    const recommendations = await this.getRecommendations(portfolioId);

    // Determine status
    let status: 'healthy' | 'needs_attention' | 'at_risk' = 'healthy';
    if (concentrationRisks.some(r => r.isExcessive) || driftAnalysis.hasDrift) {
      status = 'needs_attention';
    }
    if (portfolio.performance.maxDrawdown > portfolio.riskProfile.maxDrawdownTolerance) {
      status = 'at_risk';
    }

    return {
      portfolioId,
      analysisDate: new Date(),
      summary: {
        totalValue: portfolio.performance.totalValue,
        totalCost: portfolio.performance.totalCost,
        totalReturn: portfolio.performance.totalReturn,
        returnPercent: portfolio.performance.totalReturnPercent,
        status,
        highlights: this.generateHighlights(portfolio),
        concerns: this.generateConcerns(portfolio, concentrationRisks, driftAnalysis),
      },
      riskMetrics: {
        volatility: portfolio.performance.volatility,
        sharpeRatio: portfolio.performance.sharpeRatio,
        maxDrawdown: portfolio.performance.maxDrawdown,
        valueAtRisk: portfolio.performance.totalValue * 0.05, // 5% VaR placeholder
        beta: portfolio.performance.benchmarkComparison?.beta ?? 1,
      },
      diversificationScore: this.calculateDiversificationScore(portfolio),
      concentrationRisk: concentrationRisks,
      correlationMatrix: {
        assets: portfolio.holdings.map(h => h.symbol),
        matrix: [],
        highlyCorrelated: [],
      },
      recommendations,
    };
  }

  async getRecommendations(portfolioId: string): Promise<PortfolioRecommendation[]> {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      return [];
    }

    const recommendations: PortfolioRecommendation[] = [];
    const rebalanceCheck = await this.checkRebalanceNeeded(portfolioId);

    if (rebalanceCheck.needsRebalancing) {
      recommendations.push({
        id: `rec_${Date.now()}_rebalance`,
        type: 'rebalance',
        priority: 'high',
        title: 'Rebalance Portfolio',
        description: rebalanceCheck.reason ?? 'Portfolio needs rebalancing',
        impact: 'Restore target allocation and maintain risk profile',
      });
    }

    // Check for diversification
    const assetClassCount = new Set(portfolio.holdings.map(h => h.assetClass)).size;
    if (assetClassCount < 3 && portfolio.holdings.length > 0) {
      recommendations.push({
        id: `rec_${Date.now()}_diversify`,
        type: 'diversify',
        priority: 'medium',
        title: 'Increase Diversification',
        description: 'Consider adding more asset classes to reduce risk',
        impact: 'Lower volatility and better risk-adjusted returns',
      });
    }

    return recommendations;
  }

  updateConfig(config: Partial<InvestmentConfig>): void {
    this._config = { ...this._config, ...config };
  }

  onEvent(callback: PersonalFinanceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private recalculatePortfolio(portfolio: InvestmentPortfolio): void {
    const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0);

    // Update weights
    for (const holding of portfolio.holdings) {
      holding.weight = totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0;
    }

    // Update current allocation
    const currentByClass: Record<string, number> = {};
    for (const holding of portfolio.holdings) {
      currentByClass[holding.assetClass] = (currentByClass[holding.assetClass] ?? 0) + holding.currentValue;
    }

    portfolio.allocation.currentAllocation = portfolio.allocation.targetAllocation.map(target => ({
      ...target,
      currentValue: currentByClass[target.assetClass] ?? 0,
      currentPercentage: totalValue > 0 ? ((currentByClass[target.assetClass] ?? 0) / totalValue) * 100 : 0,
    }));

    // Update performance total value
    portfolio.performance.totalValue = totalValue;
    portfolio.updatedAt = new Date();
  }

  private initializePerformance(): PortfolioPerformance {
    return {
      totalValue: 0,
      totalCost: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      dailyReturn: 0,
      weeklyReturn: 0,
      monthlyReturn: 0,
      yearlyReturn: 0,
      allTimeReturn: 0,
      sharpeRatio: 0,
      volatility: 0,
      maxDrawdown: 0,
      lastCalculatedAt: new Date(),
    };
  }

  private getDefaultRiskProfile(): RiskProfile {
    return {
      score: 50,
      tolerance: 'moderate',
      capacity: 'medium',
      volatilityTolerance: 30,
      maxDrawdownTolerance: 20,
      assessmentDate: new Date(),
    };
  }

  private getMaxDrawdownByTolerance(tolerance: RiskTolerance): number {
    const drawdowns = {
      conservative: 10,
      moderate: 20,
      aggressive: 35,
      very_aggressive: 50,
    };
    return drawdowns[tolerance];
  }

  private getPortfolioTypeForRisk(tolerance: RiskTolerance): PortfolioType {
    const mapping: Record<RiskTolerance, PortfolioType> = {
      conservative: 'conservative',
      moderate: 'balanced',
      aggressive: 'growth',
      very_aggressive: 'aggressive',
    };
    return mapping[tolerance];
  }

  private getExpectedReturn(type: PortfolioType): number {
    const returns = {
      conservative: 0.05,
      balanced: 0.08,
      growth: 0.12,
      aggressive: 0.18,
      income: 0.06,
      custom: 0.08,
    };
    return returns[type];
  }

  private getExpectedVolatility(type: PortfolioType): number {
    const volatilities = {
      conservative: 0.08,
      balanced: 0.15,
      growth: 0.25,
      aggressive: 0.40,
      income: 0.10,
      custom: 0.15,
    };
    return volatilities[type];
  }

  private getAllocationRationale(tolerance: RiskTolerance): string {
    const rationales = {
      conservative: 'This allocation emphasizes stability with a focus on stablecoins and low-risk assets.',
      moderate: 'This balanced approach combines growth potential with stability through diversification.',
      aggressive: 'This growth-focused allocation aims for higher returns with increased crypto exposure.',
      very_aggressive: 'This high-risk allocation maximizes growth potential with significant crypto exposure.',
    };
    return rationales[tolerance];
  }

  private getFrequencyDays(frequency: 'weekly' | 'monthly' | 'quarterly'): number {
    const days = { weekly: 7, monthly: 30, quarterly: 90 };
    return days[frequency];
  }

  private calculateNextDCADate(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'): Date {
    const now = new Date();
    const days = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
    return new Date(now.setDate(now.getDate() + days[frequency]));
  }

  private calculateDiversificationScore(portfolio: InvestmentPortfolio): number {
    const assetClasses = new Set(portfolio.holdings.map(h => h.assetClass)).size;
    const holdingsCount = portfolio.holdings.length;

    // Score based on number of asset classes and holdings
    const assetClassScore = Math.min(assetClasses * 15, 50);
    const holdingsScore = Math.min(holdingsCount * 5, 30);

    // Check for concentration
    const maxWeight = Math.max(...portfolio.holdings.map(h => h.weight), 0);
    const concentrationPenalty = maxWeight > 30 ? (maxWeight - 30) : 0;

    return Math.max(0, Math.min(100, assetClassScore + holdingsScore + 20 - concentrationPenalty));
  }

  private generateHighlights(portfolio: InvestmentPortfolio): string[] {
    const highlights: string[] = [];

    if (portfolio.performance.totalReturnPercent > 0) {
      highlights.push(`Portfolio is up ${portfolio.performance.totalReturnPercent.toFixed(1)}%`);
    }

    const topPerformer = portfolio.holdings.reduce((best, h) =>
      h.unrealizedPnLPercent > (best?.unrealizedPnLPercent ?? -Infinity) ? h : best
    , portfolio.holdings[0]);

    if (topPerformer && topPerformer.unrealizedPnLPercent > 10) {
      highlights.push(`${topPerformer.symbol} is your best performer (+${topPerformer.unrealizedPnLPercent.toFixed(1)}%)`);
    }

    return highlights;
  }

  private generateConcerns(
    portfolio: InvestmentPortfolio,
    concentrationRisks: ConcentrationRisk[],
    driftAnalysis: DriftAnalysis
  ): string[] {
    const concerns: string[] = [];

    if (concentrationRisks.some(r => r.isExcessive)) {
      concerns.push('Portfolio has concentration risk in some assets');
    }

    if (driftAnalysis.hasDrift) {
      concerns.push(`Portfolio has drifted ${driftAnalysis.overallDrift.toFixed(1)}% from target allocation`);
    }

    if (portfolio.performance.totalReturnPercent < -10) {
      concerns.push(`Portfolio is down ${Math.abs(portfolio.performance.totalReturnPercent).toFixed(1)}%`);
    }

    return concerns;
  }

  private emitEvent(event: PersonalFinanceEvent): void {
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

export function createPortfolioManager(
  config?: Partial<InvestmentConfig>
): DefaultPortfolioManager {
  return new DefaultPortfolioManager(config);
}
