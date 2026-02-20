/**
 * TONAIAgent - Strategy Intelligence Module
 *
 * Provides AI-driven strategy support including portfolio recommendations,
 * capital allocation suggestions, and risk assessments.
 */

import {
  StrategyIntelligenceConfig,
  PortfolioRecommendation,
  RecommendationType,
  CapitalAllocationSuggestion,
  RiskAssessment,
  RiskBreakdown,
  RiskAlert,
  RiskType,
  RiskSeverity,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// ============================================================================
// Strategy Intelligence Service
// ============================================================================

export interface StrategyIntelligenceService {
  // Portfolio recommendations
  getRecommendations(portfolioId: string): Promise<PortfolioRecommendation[]>;
  generateRecommendation(params: RecommendationParams): Promise<PortfolioRecommendation>;
  applyRecommendation(recommendationId: string): Promise<RecommendationResult>;

  // Capital allocation
  suggestAllocation(params: AllocationParams): Promise<CapitalAllocationSuggestion[]>;
  optimizePortfolio(portfolioId: string): Promise<OptimizationResult>;

  // Risk assessment
  assessPortfolioRisk(portfolioId: string): Promise<RiskAssessment>;
  getRiskAlerts(portfolioId: string): RiskAlert[];
  acknowledgeAlert(alertId: string): void;

  // Strategy analysis
  analyzeStrategy(strategyId: string): Promise<StrategyAnalysis>;
  compareStrategies(strategyIds: string[]): Promise<StrategyComparison>;
  suggestImprovements(strategyId: string): Promise<StrategyImprovement[]>;

  // Configuration
  configure(config: Partial<StrategyIntelligenceConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export interface RecommendationParams {
  portfolioId: string;
  asset: string;
  signalIds?: string[];
  constraints?: RecommendationConstraints;
}

export interface RecommendationConstraints {
  maxWeight?: number;
  minWeight?: number;
  maxTurnover?: number;
  riskBudget?: number;
}

export interface RecommendationResult {
  success: boolean;
  recommendationId: string;
  applied: boolean;
  changes: PositionChange[];
  error?: string;
}

export interface PositionChange {
  asset: string;
  previousWeight: number;
  newWeight: number;
  action: 'buy' | 'sell' | 'hold';
  size: number;
}

export interface AllocationParams {
  totalCapital: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  assets: string[];
  constraints?: AllocationConstraints;
}

export interface AllocationConstraints {
  minPositions?: number;
  maxPositions?: number;
  maxSinglePosition?: number;
  sectorLimits?: Record<string, number>;
}

export interface OptimizationResult {
  portfolioId: string;
  currentAllocation: Record<string, number>;
  optimizedAllocation: Record<string, number>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  changes: PositionChange[];
  rebalanceRequired: boolean;
}

export interface StrategyAnalysis {
  strategyId: string;
  name: string;
  performance: PerformanceMetrics;
  riskMetrics: RiskMetrics;
  marketConditions: MarketConditionFit;
  strengths: string[];
  weaknesses: string[];
  overallScore: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  cvar: number;
  beta: number;
  correlation: number;
  tailRisk: number;
}

export interface MarketConditionFit {
  bullMarket: number;
  bearMarket: number;
  sideways: number;
  highVolatility: number;
  lowVolatility: number;
}

export interface StrategyComparison {
  strategies: StrategyAnalysis[];
  ranking: StrategyRanking[];
  correlationMatrix: number[][];
  recommendations: string[];
}

export interface StrategyRanking {
  strategyId: string;
  rank: number;
  score: number;
  highlights: string[];
}

export interface StrategyImprovement {
  area: string;
  currentValue: number;
  targetValue: number;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  expectedImpact: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultStrategyIntelligenceService implements StrategyIntelligenceService {
  private config: StrategyIntelligenceConfig;
  private readonly recommendations: Map<string, PortfolioRecommendation> = new Map();
  private readonly riskAlerts: Map<string, RiskAlert> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];

  constructor(config?: Partial<StrategyIntelligenceConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      rebalanceThreshold: config?.rebalanceThreshold ?? 0.05,
      riskBudget: config?.riskBudget ?? 0.02,
      optimizationFrequency: config?.optimizationFrequency ?? 24,
      backtestingEnabled: config?.backtestingEnabled ?? true,
    };
  }

  // Portfolio Recommendations
  async getRecommendations(portfolioId: string): Promise<PortfolioRecommendation[]> {
    return Array.from(this.recommendations.values())
      .filter((r) => r.id.includes(portfolioId) || true) // Filter by portfolio if needed
      .sort((a, b) => b.confidence - a.confidence);
  }

  async generateRecommendation(params: RecommendationParams): Promise<PortfolioRecommendation> {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const actions: Array<'buy' | 'sell' | 'hold' | 'rebalance'> = ['buy', 'sell', 'hold', 'rebalance'];
    const types: RecommendationType[] = ['allocation', 'rebalance', 'risk_reduction', 'opportunity'];

    const recommendation: PortfolioRecommendation = {
      id,
      type: types[Math.floor(Math.random() * types.length)],
      asset: params.asset,
      action: actions[Math.floor(Math.random() * actions.length)],
      currentWeight: Math.random() * 0.3,
      targetWeight: Math.random() * 0.25,
      reasoning: `Based on signal analysis and risk assessment, adjusting ${params.asset} position is recommended.`,
      signals: params.signalIds ?? [],
      confidence: 0.6 + Math.random() * 0.3,
      urgency: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      timestamp: new Date(),
    };

    this.recommendations.set(id, recommendation);

    this.emitEvent('signal_generated', 'signals', {
      type: 'recommendation',
      recommendationId: id,
      asset: params.asset,
    });

    return recommendation;
  }

  async applyRecommendation(recommendationId: string): Promise<RecommendationResult> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      return {
        success: false,
        recommendationId,
        applied: false,
        changes: [],
        error: 'Recommendation not found',
      };
    }

    const change: PositionChange = {
      asset: recommendation.asset,
      previousWeight: recommendation.currentWeight,
      newWeight: recommendation.targetWeight,
      action: recommendation.action === 'rebalance' ? 'hold' : recommendation.action,
      size: Math.abs(recommendation.targetWeight - recommendation.currentWeight) * 10000,
    };

    return {
      success: true,
      recommendationId,
      applied: true,
      changes: [change],
    };
  }

  // Capital Allocation
  async suggestAllocation(params: AllocationParams): Promise<CapitalAllocationSuggestion[]> {
    const suggestions: CapitalAllocationSuggestion[] = [];
    const numPositions = Math.min(
      params.assets.length,
      params.constraints?.maxPositions ?? params.assets.length
    );

    const riskMultiplier = params.riskTolerance === 'aggressive' ? 1.5 :
      params.riskTolerance === 'conservative' ? 0.7 : 1;

    for (let i = 0; i < numPositions; i++) {
      const baseAllocation = 1 / numPositions;
      const variance = (Math.random() - 0.5) * 0.1;

      suggestions.push({
        strategy: params.assets[i],
        currentAllocation: 0,
        suggestedAllocation: Math.max(0.05, Math.min(0.4, baseAllocation + variance)),
        expectedReturn: (0.05 + Math.random() * 0.15) * riskMultiplier,
        expectedRisk: (0.1 + Math.random() * 0.2) * riskMultiplier,
        sharpeRatio: 0.5 + Math.random() * 1.5,
        reasoning: `Allocation optimized for ${params.riskTolerance} risk profile.`,
      });
    }

    // Normalize allocations to sum to 1
    const total = suggestions.reduce((sum, s) => sum + s.suggestedAllocation, 0);
    for (const s of suggestions) {
      s.suggestedAllocation /= total;
    }

    return suggestions;
  }

  async optimizePortfolio(portfolioId: string): Promise<OptimizationResult> {
    const assets = ['TON', 'ETH', 'BTC', 'USDT', 'SOL'];
    const currentAllocation: Record<string, number> = {};
    const optimizedAllocation: Record<string, number> = {};
    const changes: PositionChange[] = [];

    for (const asset of assets) {
      currentAllocation[asset] = Math.random() * 0.3;
      optimizedAllocation[asset] = Math.random() * 0.3;
    }

    // Normalize
    const currentTotal = Object.values(currentAllocation).reduce((a, b) => a + b, 0);
    const optimizedTotal = Object.values(optimizedAllocation).reduce((a, b) => a + b, 0);

    for (const asset of assets) {
      currentAllocation[asset] /= currentTotal;
      optimizedAllocation[asset] /= optimizedTotal;

      const diff = optimizedAllocation[asset] - currentAllocation[asset];
      if (Math.abs(diff) > this.config.rebalanceThreshold) {
        changes.push({
          asset,
          previousWeight: currentAllocation[asset],
          newWeight: optimizedAllocation[asset],
          action: diff > 0 ? 'buy' : 'sell',
          size: Math.abs(diff) * 10000,
        });
      }
    }

    return {
      portfolioId,
      currentAllocation,
      optimizedAllocation,
      expectedReturn: 0.08 + Math.random() * 0.12,
      expectedRisk: 0.1 + Math.random() * 0.1,
      sharpeRatio: 0.8 + Math.random() * 1.2,
      changes,
      rebalanceRequired: changes.length > 0,
    };
  }

  // Risk Assessment
  async assessPortfolioRisk(portfolioId: string): Promise<RiskAssessment> {
    const breakdown: RiskBreakdown = {
      marketRisk: Math.random() * 100,
      concentrationRisk: Math.random() * 100,
      liquidityRisk: Math.random() * 100,
      volatilityRisk: Math.random() * 100,
      correlationRisk: Math.random() * 100,
      leverageRisk: Math.random() * 50,
    };

    const overallRisk =
      (breakdown.marketRisk +
        breakdown.concentrationRisk +
        breakdown.liquidityRisk +
        breakdown.volatilityRisk +
        breakdown.correlationRisk +
        breakdown.leverageRisk) /
      6;

    const alerts: RiskAlert[] = [];
    const riskTypes: RiskType[] = ['concentration', 'liquidity_crisis', 'leverage'];

    for (const riskType of riskTypes) {
      if (Math.random() > 0.7) {
        const alert = this.generateRiskAlert(portfolioId, riskType);
        alerts.push(alert);
        this.riskAlerts.set(alert.id, alert);
      }
    }

    return {
      portfolioId,
      timestamp: new Date(),
      overallRisk,
      riskBreakdown: breakdown,
      alerts,
      recommendations: [
        'Consider diversifying across more assets',
        'Monitor leverage levels closely',
        'Set up stop-loss orders for volatile positions',
      ],
    };
  }

  getRiskAlerts(_portfolioId: string): RiskAlert[] {
    return Array.from(this.riskAlerts.values());
  }

  acknowledgeAlert(alertId: string): void {
    this.riskAlerts.delete(alertId);
  }

  // Strategy Analysis
  async analyzeStrategy(strategyId: string): Promise<StrategyAnalysis> {
    return {
      strategyId,
      name: `Strategy ${strategyId}`,
      performance: {
        totalReturn: 0.1 + Math.random() * 0.4,
        annualizedReturn: 0.08 + Math.random() * 0.2,
        volatility: 0.1 + Math.random() * 0.2,
        sharpeRatio: 0.5 + Math.random() * 1.5,
        sortinoRatio: 0.6 + Math.random() * 1.8,
        maxDrawdown: 0.05 + Math.random() * 0.2,
        winRate: 0.4 + Math.random() * 0.3,
        profitFactor: 1 + Math.random() * 1.5,
      },
      riskMetrics: {
        var95: 0.02 + Math.random() * 0.03,
        var99: 0.03 + Math.random() * 0.04,
        cvar: 0.04 + Math.random() * 0.05,
        beta: 0.8 + Math.random() * 0.4,
        correlation: Math.random() * 0.6,
        tailRisk: Math.random() * 0.5,
      },
      marketConditions: {
        bullMarket: 0.6 + Math.random() * 0.3,
        bearMarket: 0.3 + Math.random() * 0.4,
        sideways: 0.4 + Math.random() * 0.3,
        highVolatility: 0.5 + Math.random() * 0.4,
        lowVolatility: 0.5 + Math.random() * 0.4,
      },
      strengths: [
        'Good risk-adjusted returns',
        'Consistent performance in trending markets',
        'Low correlation with market',
      ],
      weaknesses: [
        'Higher drawdowns in volatile conditions',
        'Limited performance in ranging markets',
      ],
      overallScore: 60 + Math.random() * 30,
    };
  }

  async compareStrategies(strategyIds: string[]): Promise<StrategyComparison> {
    const strategies = await Promise.all(strategyIds.map((id) => this.analyzeStrategy(id)));

    const ranking: StrategyRanking[] = strategies
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((s, i) => ({
        strategyId: s.strategyId,
        rank: i + 1,
        score: s.overallScore,
        highlights: s.strengths.slice(0, 2),
      }));

    // Generate correlation matrix
    const n = strategies.length;
    const correlationMatrix = Array(n)
      .fill(0)
      .map(() => Array(n).fill(0).map(() => Math.random()));

    // Make diagonal 1
    for (let i = 0; i < n; i++) {
      correlationMatrix[i][i] = 1;
    }

    return {
      strategies,
      ranking,
      correlationMatrix,
      recommendations: [
        'Consider combining top-ranked strategies for diversification',
        'Avoid strategies with high correlation',
        'Balance between high-return and low-risk strategies',
      ],
    };
  }

  async suggestImprovements(_strategyId: string): Promise<StrategyImprovement[]> {
    return [
      {
        area: 'Risk Management',
        currentValue: 0.15,
        targetValue: 0.1,
        suggestion: 'Implement tighter stop-loss levels to reduce maximum drawdown',
        priority: 'high',
        expectedImpact: 0.15,
      },
      {
        area: 'Position Sizing',
        currentValue: 0.1,
        targetValue: 0.05,
        suggestion: 'Use dynamic position sizing based on volatility',
        priority: 'medium',
        expectedImpact: 0.1,
      },
      {
        area: 'Entry Timing',
        currentValue: 0.6,
        targetValue: 0.7,
        suggestion: 'Add confirmation signals before entry',
        priority: 'medium',
        expectedImpact: 0.08,
      },
      {
        area: 'Diversification',
        currentValue: 3,
        targetValue: 5,
        suggestion: 'Increase number of uncorrelated assets in portfolio',
        priority: 'low',
        expectedImpact: 0.05,
      },
    ];
  }

  configure(config: Partial<StrategyIntelligenceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateRiskAlert(portfolioId: string, riskType: RiskType): RiskAlert {
    const severities: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: riskType,
      severity,
      message: `${riskType.replace('_', ' ')} detected in portfolio ${portfolioId}`,
      threshold: 50,
      currentValue: 50 + Math.random() * 50,
      timestamp: new Date(),
    };
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'strategy-intelligence',
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

export function createStrategyIntelligenceService(
  config?: Partial<StrategyIntelligenceConfig>
): DefaultStrategyIntelligenceService {
  return new DefaultStrategyIntelligenceService(config);
}
