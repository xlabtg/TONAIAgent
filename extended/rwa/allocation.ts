/**
 * TONAIAgent - AI Allocation Engine for RWAs
 *
 * AI-driven allocation into RWAs, yield comparison between crypto and RWAs,
 * risk-adjusted return optimization, volatility hedging, and stable
 * real-world yield allocation.
 */

import {
  AllocationConfig,
  AllocationStrategy,
  AllocationRecommendation,
  RWAOpportunity,
  RWAAllocationItem,
  YieldComparison,
  RWAAssetClass,
  AllocationEngineConfig,
  RWAEvent,
  RWAEventCallback,
} from './types';

// ============================================================================
// Allocation Engine Interface
// ============================================================================

export interface AllocationEngine {
  readonly config: AllocationEngineConfig;

  // Configuration
  configure(config: Partial<AllocationEngineConfig>): void;

  // Market data
  registerOpportunity(opportunity: RWAOpportunity): void;
  updateOpportunity(assetId: string, updates: Partial<RWAOpportunity>): void;
  removeOpportunity(assetId: string): void;
  getOpportunity(assetId: string): RWAOpportunity | undefined;
  listOpportunities(filters?: OpportunityFilters): RWAOpportunity[];

  // AI recommendations
  generateRecommendation(
    portfolioValue: number,
    allocationConfig: AllocationConfig,
    cryptoYield?: number
  ): AllocationRecommendation;
  compareYields(
    cryptoYield: number,
    rwaOpportunities: RWAOpportunity[]
  ): YieldComparison;

  // Optimization
  optimizeAllocation(
    budget: number,
    opportunities: RWAOpportunity[],
    config: AllocationConfig
  ): OptimizationResult;

  // Risk analysis
  calculateRWARisk(positions: RWAAllocationItem[]): RWARiskAnalysis;
  calculateVolatilityHedge(
    cryptoVolatility: number,
    portfolioValue: number
  ): HedgeRecommendation;

  // Events
  onEvent(callback: RWAEventCallback): void;
}

export interface OpportunityFilters {
  assetClass?: RWAAssetClass[];
  minYield?: number;
  maxRisk?: number;
  minLiquidity?: number;
  jurisdiction?: string[];
  minAiScore?: number;
}

export interface OptimizationResult {
  allocations: RWAAllocationItem[];
  totalAllocated: number;
  expectedYield: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationScore: number;
  optimizationMethod: string;
}

export interface RWARiskAnalysis {
  overallRisk: number; // 0-100
  concentrationRisk: number;
  liquidityRisk: number;
  counterpartyRisk: number;
  jurisdictionRisk: number;
  creditRisk: number;
  maturityRisk: number;
  riskByAssetClass: Record<string, number>;
  recommendations: string[];
}

export interface HedgeRecommendation {
  rwaAllocationIncrease: number; // % increase in RWA allocation recommended
  targetAssetClasses: RWAAssetClass[];
  expectedVolatilityReduction: number;
  expectedYieldImprovement: number;
  reasoning: string;
}

// ============================================================================
// Default AI Allocation Engine
// ============================================================================

export class DefaultAllocationEngine implements AllocationEngine {
  private _config: AllocationEngineConfig;
  private readonly opportunities: Map<string, RWAOpportunity> = new Map();
  private readonly eventCallbacks: RWAEventCallback[] = [];
  private readonly historicalRecommendations: AllocationRecommendation[] = [];

  constructor(config?: Partial<AllocationEngineConfig>) {
    this._config = {
      defaultStrategy: 'balanced',
      aiEnabled: true,
      rebalanceFrequency: 'daily',
      yieldUpdateFrequency: 'hourly',
      maxSlippage: 0.01, // 1%
      ...config,
    };
  }

  get config(): AllocationEngineConfig {
    return { ...this._config };
  }

  configure(config: Partial<AllocationEngineConfig>): void {
    this._config = { ...this._config, ...config };
    this.emitEvent('info', 'allocation', 'Allocation engine configuration updated', {});
  }

  registerOpportunity(opportunity: RWAOpportunity): void {
    // Calculate AI score if not provided or explicitly 0
    const scoredOpportunity = {
      ...opportunity,
      aiScore: (opportunity.aiScore != null && opportunity.aiScore > 0)
        ? opportunity.aiScore
        : this.calculateAiScore(opportunity),
    };

    this.opportunities.set(opportunity.assetId, scoredOpportunity);

    this.emitEvent('info', 'allocation', `RWA opportunity registered: ${opportunity.name}`, {
      assetId: opportunity.assetId,
      aiScore: scoredOpportunity.aiScore,
    });
  }

  updateOpportunity(assetId: string, updates: Partial<RWAOpportunity>): void {
    const opportunity = this.opportunities.get(assetId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${assetId}`);
    }

    const updated = { ...opportunity, ...updates };
    // Recalculate AI score if key metrics changed
    if (updates.yieldRate !== undefined || updates.riskScore !== undefined) {
      updated.aiScore = this.calculateAiScore(updated);
    }

    this.opportunities.set(assetId, updated);
  }

  removeOpportunity(assetId: string): void {
    this.opportunities.delete(assetId);
  }

  getOpportunity(assetId: string): RWAOpportunity | undefined {
    const opp = this.opportunities.get(assetId);
    if (!opp) return undefined;
    return { ...opp };
  }

  listOpportunities(filters?: OpportunityFilters): RWAOpportunity[] {
    let opps = Array.from(this.opportunities.values());

    if (filters) {
      if (filters.assetClass?.length) {
        opps = opps.filter(o => filters.assetClass!.includes(o.assetClass));
      }
      if (filters.minYield !== undefined) {
        opps = opps.filter(o => o.yieldRate >= filters.minYield!);
      }
      if (filters.maxRisk !== undefined) {
        opps = opps.filter(o => o.riskScore <= filters.maxRisk!);
      }
      if (filters.minLiquidity !== undefined) {
        opps = opps.filter(o => o.liquidityScore >= filters.minLiquidity!);
      }
      if (filters.jurisdiction?.length) {
        opps = opps.filter(o => filters.jurisdiction!.includes(o.jurisdiction));
      }
      if (filters.minAiScore !== undefined) {
        opps = opps.filter(o => o.aiScore >= filters.minAiScore!);
      }
    }

    return opps.map(o => ({ ...o }));
  }

  generateRecommendation(
    portfolioValue: number,
    allocationConfig: AllocationConfig,
    cryptoYield = 0.08
  ): AllocationRecommendation {
    const availableOpportunities = this.listOpportunities();

    // Filter by preferences
    const filteredOpps = availableOpportunities.filter(opp => {
      if (allocationConfig.preferredAssetClasses?.length) {
        // Don't hard exclude, just prefer
      }
      if (allocationConfig.excludedAssetClasses?.includes(opp.assetClass)) {
        return false;
      }
      if (allocationConfig.jurisdictionPreferences?.length) {
        if (!allocationConfig.jurisdictionPreferences.includes(opp.jurisdiction)) {
          return false;
        }
      }
      return true;
    });

    // Determine optimal split based on strategy
    const { cryptoAllocation, rwaAllocation, cashAllocation } = this.determineAllocationSplit(
      allocationConfig,
      cryptoYield,
      filteredOpps
    );

    // Optimize RWA breakdown
    const rwaAmount = portfolioValue * rwaAllocation;
    const optimization = this.optimizeAllocation(rwaAmount, filteredOpps, allocationConfig);

    const expectedYield =
      cryptoAllocation * cryptoYield +
      rwaAllocation * optimization.expectedYield +
      cashAllocation * 0.05; // Cash/stablecoin yield

    const expectedRisk = this.calculatePortfolioRisk(
      cryptoAllocation,
      rwaAllocation,
      optimization.expectedRisk,
      allocationConfig.riskTolerance
    );

    const sharpeRatio = expectedRisk > 0
      ? (expectedYield - 0.05) / expectedRisk
      : 0;

    const confidence = this.calculateRecommendationConfidence(
      filteredOpps.length,
      portfolioValue,
      allocationConfig
    );

    const recommendation: AllocationRecommendation = {
      id: this.generateId('rec'),
      generatedAt: new Date(),
      strategy: allocationConfig.strategy,
      cryptoAllocation,
      rwaAllocation,
      cashAllocation,
      rwaBreakdown: optimization.allocations,
      expectedYield,
      expectedRisk,
      sharpeRatio,
      reasoning: this.generateReasoning(
        allocationConfig,
        cryptoYield,
        optimization.expectedYield,
        cryptoAllocation,
        rwaAllocation
      ),
      confidence,
    };

    this.historicalRecommendations.push(recommendation);

    this.emitEvent('info', 'allocation', 'Allocation recommendation generated', {
      recommendationId: recommendation.id,
      cryptoAllocation,
      rwaAllocation,
      expectedYield,
    });

    return recommendation;
  }

  compareYields(
    cryptoYield: number,
    rwaOpportunities: RWAOpportunity[]
  ): YieldComparison {
    const avgRwaYield = rwaOpportunities.length > 0
      ? rwaOpportunities.reduce((sum, o) => sum + o.yieldRate, 0) / rwaOpportunities.length
      : 0;

    // Apply risk adjustments (crypto is ~3x more volatile than RWA)
    const cryptoRiskFactor = 3.0;
    const rwaRiskFactor = 1.0;

    const riskAdjustedCryptoYield = cryptoYield / cryptoRiskFactor;
    const riskAdjustedRwaYield = avgRwaYield / rwaRiskFactor;

    let recommendation: YieldComparison['recommendation'];
    let reasoning: string;

    if (riskAdjustedRwaYield > riskAdjustedCryptoYield * 1.2) {
      recommendation = 'increase_rwa';
      reasoning = `Risk-adjusted RWA yield (${(riskAdjustedRwaYield * 100).toFixed(2)}%) significantly exceeds crypto (${(riskAdjustedCryptoYield * 100).toFixed(2)}%). Recommend increasing RWA allocation.`;
    } else if (riskAdjustedCryptoYield > riskAdjustedRwaYield * 1.5) {
      recommendation = 'increase_crypto';
      reasoning = `Crypto yield premium compensates for additional risk. Current market conditions favor crypto.`;
    } else {
      recommendation = 'maintain';
      reasoning = `Yields are balanced on a risk-adjusted basis. Maintain current allocation split.`;
    }

    return {
      cryptoYield,
      rwaYield: avgRwaYield,
      riskAdjustedCryptoYield,
      riskAdjustedRwaYield,
      recommendation,
      reasoning,
    };
  }

  optimizeAllocation(
    budget: number,
    opportunities: RWAOpportunity[],
    config: AllocationConfig
  ): OptimizationResult {
    if (opportunities.length === 0) {
      return {
        allocations: [],
        totalAllocated: 0,
        expectedYield: 0,
        expectedRisk: 0,
        sharpeRatio: 0,
        diversificationScore: 0,
        optimizationMethod: 'none',
      };
    }

    // Sort by AI score (descending)
    const sorted = [...opportunities].sort((a, b) => b.aiScore - a.aiScore);

    // Apply strategy-specific optimization
    let allocations: RWAAllocationItem[];
    let method: string;

    switch (config.strategy) {
      case 'yield_maximization':
        ({ allocations, method } = this.yieldMaximizationStrategy(sorted, budget, config));
        break;
      case 'risk_minimization':
        ({ allocations, method } = this.riskMinimizationStrategy(sorted, budget, config));
        break;
      case 'balanced':
      default:
        ({ allocations, method } = this.balancedStrategy(sorted, budget, config));
        break;
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocationAmount, 0);
    const expectedYield = allocations.length > 0
      ? allocations.reduce((sum, a) => sum + a.expectedYield * a.allocationPercent, 0)
      : 0;
    const expectedRisk = this.calculateAllocationRisk(allocations);

    const sharpeRatio = expectedRisk > 0
      ? (expectedYield - 0.05) / expectedRisk
      : 0;

    const diversificationScore = this.calculateDiversificationScore(allocations);

    return {
      allocations,
      totalAllocated,
      expectedYield,
      expectedRisk,
      sharpeRatio,
      diversificationScore,
      optimizationMethod: method,
    };
  }

  calculateRWARisk(positions: RWAAllocationItem[]): RWARiskAnalysis {
    if (positions.length === 0) {
      return {
        overallRisk: 0,
        concentrationRisk: 0,
        liquidityRisk: 0,
        counterpartyRisk: 0,
        jurisdictionRisk: 0,
        creditRisk: 0,
        maturityRisk: 0,
        riskByAssetClass: {},
        recommendations: [],
      };
    }

    const totalAmount = positions.reduce((sum, p) => sum + p.allocationAmount, 0);

    // Concentration risk - highest single position weight
    const maxWeight = Math.max(...positions.map(p => p.allocationPercent));
    const concentrationRisk = maxWeight > 0.3 ? 70 : maxWeight > 0.2 ? 50 : 30;

    // Risk by asset class
    const riskByAssetClass: Record<string, number> = {};
    const riskScoreByClass: Record<string, number> = {
      treasury_bills: 5,
      government_bonds: 10,
      money_market: 15,
      corporate_bonds: 30,
      private_credit: 45,
      real_estate: 40,
      commodities: 55,
      infrastructure: 35,
      private_equity: 65,
      structured_products: 60,
    };

    let weightedRisk = 0;
    for (const position of positions) {
      const weight = totalAmount > 0 ? position.allocationAmount / totalAmount : 0;
      const classRisk = riskScoreByClass[position.assetClass] ?? 50;
      weightedRisk += classRisk * weight;
      riskByAssetClass[position.assetClass] = classRisk;
    }

    // Simplified risk scores
    const liquidityRisk = 50; // Would require actual liquidity data
    const counterpartyRisk = 30;
    const jurisdictionRisk = 25;
    const creditRisk = weightedRisk * 0.6;
    const maturityRisk = 20;

    const overallRisk = Math.min(
      100,
      (concentrationRisk * 0.25 +
        weightedRisk * 0.35 +
        liquidityRisk * 0.20 +
        counterpartyRisk * 0.10 +
        jurisdictionRisk * 0.10)
    );

    const recommendations: string[] = [];

    if (concentrationRisk > 60) {
      recommendations.push('High concentration risk - consider diversifying across more assets');
    }
    if (liquidityRisk > 70) {
      recommendations.push('High liquidity risk - ensure adequate liquid reserves');
    }
    if (weightedRisk > 60) {
      recommendations.push('Consider shifting towards lower-risk asset classes like government bonds');
    }

    return {
      overallRisk,
      concentrationRisk,
      liquidityRisk,
      counterpartyRisk,
      jurisdictionRisk,
      creditRisk,
      maturityRisk,
      riskByAssetClass,
      recommendations,
    };
  }

  calculateVolatilityHedge(
    cryptoVolatility: number,
    portfolioValue: number
  ): HedgeRecommendation {
    // High volatility -> recommend more RWAs as hedge
    let rwaAllocationIncrease: number;
    let targetAssetClasses: RWAAssetClass[];
    let expectedVolatilityReduction: number;

    if (cryptoVolatility > 0.05) {
      // > 5% daily volatility
      rwaAllocationIncrease = 0.20;
      targetAssetClasses = ['treasury_bills', 'government_bonds', 'money_market'];
      expectedVolatilityReduction = 0.35;
    } else if (cryptoVolatility > 0.03) {
      rwaAllocationIncrease = 0.10;
      targetAssetClasses = ['government_bonds', 'corporate_bonds', 'real_estate'];
      expectedVolatilityReduction = 0.20;
    } else {
      rwaAllocationIncrease = 0.05;
      targetAssetClasses = ['corporate_bonds', 'private_credit'];
      expectedVolatilityReduction = 0.10;
    }

    const currentRwaYield = 0.06; // Estimated
    const expectedYieldImprovement = rwaAllocationIncrease * currentRwaYield;

    const reasoning = `Crypto market volatility of ${(cryptoVolatility * 100).toFixed(1)}% per day warrants ` +
      `${(rwaAllocationIncrease * 100).toFixed(0)}% additional RWA allocation. ` +
      `Focus on ${targetAssetClasses.join(', ')} for stability.`;

    return {
      rwaAllocationIncrease,
      targetAssetClasses,
      expectedVolatilityReduction,
      expectedYieldImprovement,
      reasoning,
    };
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateAiScore(opportunity: RWAOpportunity): number {
    // Composite score: yield (40%), inverse risk (30%), liquidity (30%)
    const yieldScore = Math.min(100, opportunity.yieldRate * 1000); // 10% yield = 100 score
    const riskScore = 100 - opportunity.riskScore;
    const liquidityScore = opportunity.liquidityScore;

    return yieldScore * 0.40 + riskScore * 0.30 + liquidityScore * 0.30;
  }

  private determineAllocationSplit(
    config: AllocationConfig,
    cryptoYield: number,
    opportunities: RWAOpportunity[]
  ): { cryptoAllocation: number; rwaAllocation: number; cashAllocation: number } {
    const avgRwaYield = opportunities.length > 0
      ? opportunities.reduce((sum, o) => sum + o.yieldRate, 0) / opportunities.length
      : 0;

    let rwaAllocation: number;

    switch (config.strategy) {
      case 'yield_maximization':
        // Maximize yield - more crypto if crypto yield is higher, more RWA if RWA yield is higher
        rwaAllocation = avgRwaYield > cryptoYield * 0.8
          ? Math.min(config.maxRWAAllocation, 0.60)
          : Math.max(0.10, config.maxRWAAllocation * 0.4);
        break;
      case 'risk_minimization':
        // Minimize risk - maximize RWA allocation
        rwaAllocation = config.maxRWAAllocation;
        break;
      case 'balanced':
      default:
        rwaAllocation = config.maxRWAAllocation * 0.6; // 60% of max
        break;
    }

    const cryptoAllocation = Math.max(config.minCryptoAllocation, 1 - rwaAllocation - 0.05);
    const cashAllocation = Math.max(0, 1 - cryptoAllocation - rwaAllocation);

    return { cryptoAllocation, rwaAllocation, cashAllocation };
  }

  private balancedStrategy(
    opportunities: RWAOpportunity[],
    budget: number,
    config: AllocationConfig
  ): { allocations: RWAAllocationItem[]; method: string } {
    // Equal weight with score-based selection
    const maxPositions = Math.min(10, opportunities.length);
    const selected = opportunities.slice(0, maxPositions);

    if (selected.length === 0) {
      return { allocations: [], method: 'balanced' };
    }

    const perPosition = budget / selected.length;
    const allocations: RWAAllocationItem[] = selected.map(opp => ({
      assetId: opp.assetId,
      assetName: opp.name,
      assetClass: opp.assetClass,
      allocationPercent: 1 / selected.length,
      allocationAmount: perPosition,
      expectedYield: opp.yieldRate,
      riskContribution: opp.riskScore / selected.length,
    }));

    return { allocations, method: 'balanced_equal_weight' };
  }

  private yieldMaximizationStrategy(
    opportunities: RWAOpportunity[],
    budget: number,
    _config: AllocationConfig
  ): { allocations: RWAAllocationItem[]; method: string } {
    // Sort by yield, concentrate in top performers
    const sorted = [...opportunities].sort((a, b) => b.yieldRate - a.yieldRate);
    const selected = sorted.slice(0, Math.min(5, sorted.length));

    if (selected.length === 0) {
      return { allocations: [], method: 'yield_maximization' };
    }

    // Weight by yield
    const totalYield = selected.reduce((sum, o) => sum + o.yieldRate, 0);
    const allocations: RWAAllocationItem[] = selected.map(opp => {
      const weight = totalYield > 0 ? opp.yieldRate / totalYield : 1 / selected.length;
      return {
        assetId: opp.assetId,
        assetName: opp.name,
        assetClass: opp.assetClass,
        allocationPercent: weight,
        allocationAmount: budget * weight,
        expectedYield: opp.yieldRate,
        riskContribution: opp.riskScore * weight,
      };
    });

    return { allocations, method: 'yield_weighted' };
  }

  private riskMinimizationStrategy(
    opportunities: RWAOpportunity[],
    budget: number,
    _config: AllocationConfig
  ): { allocations: RWAAllocationItem[]; method: string } {
    // Sort by risk score (lowest first), focus on low-risk assets
    const sorted = [...opportunities].sort((a, b) => a.riskScore - b.riskScore);
    const selected = sorted.slice(0, Math.min(8, sorted.length));

    if (selected.length === 0) {
      return { allocations: [], method: 'risk_minimization' };
    }

    // Inverse-risk weighting
    const inverseRisks = selected.map(o => 100 - o.riskScore);
    const totalInverseRisk = inverseRisks.reduce((sum, r) => sum + r, 0);

    const allocations: RWAAllocationItem[] = selected.map((opp, idx) => {
      const weight = totalInverseRisk > 0 ? inverseRisks[idx] / totalInverseRisk : 1 / selected.length;
      return {
        assetId: opp.assetId,
        assetName: opp.name,
        assetClass: opp.assetClass,
        allocationPercent: weight,
        allocationAmount: budget * weight,
        expectedYield: opp.yieldRate,
        riskContribution: opp.riskScore * weight,
      };
    });

    return { allocations, method: 'inverse_risk_weighted' };
  }

  private calculatePortfolioRisk(
    cryptoAllocation: number,
    rwaAllocation: number,
    rwaRisk: number,
    riskTolerance: string
  ): number {
    const cryptoVolatility = 0.80; // 80% annualized crypto volatility
    const rwaVolatility = rwaRisk * 0.005; // Convert risk score to volatility
    const correlation = -0.2; // Negative correlation between crypto and RWA

    // Portfolio variance formula
    const portfolioVariance =
      Math.pow(cryptoAllocation * cryptoVolatility, 2) +
      Math.pow(rwaAllocation * rwaVolatility, 2) +
      2 * cryptoAllocation * rwaAllocation * cryptoVolatility * rwaVolatility * correlation;

    return Math.sqrt(portfolioVariance);
  }

  private calculateAllocationRisk(allocations: RWAAllocationItem[]): number {
    if (allocations.length === 0) return 0;
    const avgRiskContribution = allocations.reduce((sum, a) => sum + a.riskContribution, 0);
    return avgRiskContribution / 100; // Normalize to 0-1
  }

  private calculateDiversificationScore(allocations: RWAAllocationItem[]): number {
    if (allocations.length <= 1) return 0;

    // Count unique asset classes
    const uniqueClasses = new Set(allocations.map(a => a.assetClass)).size;
    const weights = allocations.map(a => a.allocationPercent);

    // Herfindahl-Hirschman Index (lower = more diversified)
    const hhi = weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
    const minHhi = 1 / allocations.length; // Perfect equality
    const maxHhi = 1; // One position

    // Normalize to 0-100 (higher = more diversified)
    const diversification = ((maxHhi - hhi) / (maxHhi - minHhi)) * 100;
    const classBonus = Math.min(20, uniqueClasses * 4); // Up to 20 points for class diversity

    return Math.min(100, diversification + classBonus);
  }

  private calculateRecommendationConfidence(
    opportunityCount: number,
    portfolioValue: number,
    config: AllocationConfig
  ): number {
    let confidence = 0.7; // Base confidence

    // More opportunities = more confidence
    if (opportunityCount >= 10) confidence += 0.1;
    else if (opportunityCount >= 5) confidence += 0.05;

    // Larger portfolios have more data
    if (portfolioValue >= 10000000) confidence += 0.05;

    // Specific strategy is more confident
    if (config.strategy !== 'balanced') confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private generateReasoning(
    config: AllocationConfig,
    cryptoYield: number,
    rwaYield: number,
    cryptoAllocation: number,
    rwaAllocation: number
  ): string {
    const parts: string[] = [];

    parts.push(`Strategy: ${config.strategy}.`);
    parts.push(`Crypto allocation: ${(cryptoAllocation * 100).toFixed(0)}% (yield: ${(cryptoYield * 100).toFixed(1)}%).`);
    parts.push(`RWA allocation: ${(rwaAllocation * 100).toFixed(0)}% (expected yield: ${(rwaYield * 100).toFixed(1)}%).`);

    if (rwaYield > cryptoYield) {
      parts.push('RWA yield currently exceeds crypto yield on a risk-adjusted basis.');
    } else {
      parts.push('Maintaining RWA allocation for portfolio stability and yield diversification.');
    }

    if (config.riskTolerance === 'conservative') {
      parts.push('Conservative risk profile - prioritizing capital preservation.');
    } else if (config.riskTolerance === 'aggressive') {
      parts.push('Aggressive risk profile - maximizing return potential.');
    }

    return parts.join(' ');
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown>
  ): void {
    const event: RWAEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'allocation_updated',
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

export function createAllocationEngine(
  config?: Partial<AllocationEngineConfig>
): DefaultAllocationEngine {
  return new DefaultAllocationEngine(config);
}
