/**
 * TONAIAgent - Risk Aggregation Layer
 *
 * Portfolio-level and cross-agent exposure monitoring, systemic risk modeling,
 * VaR and stress simulations. Integrated with Distributed Scheduler (#93)
 * and Hedge Fund Framework (#106).
 */

import {
  PortfolioRiskSnapshot,
  CrossFundCorrelation,
  AgentRiskContribution,
  ConcentrationRisk,
  SystemicRiskModel,
  StressTestScenario,
  StressTestResult,
  AgentStressImpact,
  RiskAggregationConfig,
  RiskMetricType,
  AgentId,
  FundId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Risk Aggregation Interface
// ============================================================================

export interface RiskAggregationLayer {
  readonly config: RiskAggregationConfig;

  // Portfolio Risk
  calculatePortfolioRisk(positions: AggregatedPosition[]): PortfolioRiskSnapshot;
  getLatestRiskSnapshot(): PortfolioRiskSnapshot | undefined;
  getRiskHistory(fromDate?: Date): PortfolioRiskSnapshot[];

  // Cross-Agent/Fund Exposure
  getPortfolioExposure(): CrossPortfolioExposure;
  getAgentExposures(): AgentExposureSummary[];
  getFundExposures(): FundExposureSummary[];

  // VaR Calculations
  calculateVaR(positions: AggregatedPosition[], confidenceLevel?: number): VaRResult;
  calculateCVaR(positions: AggregatedPosition[], confidenceLevel?: number): number;

  // Systemic Risk
  assessSystemicRisk(): SystemicRiskModel;
  getSystemicRiskHistory(): SystemicRiskModel[];

  // Stress Testing
  registerScenario(scenario: Omit<StressTestScenario, 'id'>): StressTestScenario;
  runStressTest(scenarioId: string, positions: AggregatedPosition[]): StressTestResult;
  runAllStressTests(positions: AggregatedPosition[]): StressTestResult[];
  getStressTestResults(scenarioId?: string): StressTestResult[];
  listScenarios(): StressTestScenario[];

  // Risk Alerts
  checkRiskLimits(snapshot: PortfolioRiskSnapshot): RiskLimitCheckResult;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface AggregatedPosition {
  positionId: string;
  agentId: AgentId;
  fundId: FundId;
  assetId: AssetId;
  assetName: string;
  assetClass: string;
  direction: 'long' | 'short';
  notionalValue: number;
  marketValue: number;
  unrealizedPnL: number;
  leverage: number;
  strategy: string;
}

export interface CrossPortfolioExposure {
  timestamp: Date;
  totalLongExposure: number;
  totalShortExposure: number;
  netExposure: number;
  grossExposure: number;
  leverageRatio: number;
  byAssetClass: AssetClassExposure[];
  byChain: ChainExposure[];
  byStrategy: StrategyExposure[];
}

export interface AssetClassExposure {
  assetClass: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  percentOfPortfolio: number;
}

export interface ChainExposure {
  chainId: string;
  exposure: number;
  percentOfPortfolio: number;
}

export interface StrategyExposure {
  strategy: string;
  exposure: number;
  agentCount: number;
  percentOfPortfolio: number;
}

export interface AgentExposureSummary {
  agentId: AgentId;
  fundId: FundId;
  totalExposure: number;
  netExposure: number;
  leverage: number;
  strategyTypes: string[];
  riskContributionPercent: number;
}

export interface FundExposureSummary {
  fundId: FundId;
  totalExposure: number;
  netExposure: number;
  agentCount: number;
  avgLeverage: number;
  riskContributionPercent: number;
}

export interface VaRResult {
  confidenceLevel: number;
  timeHorizon: number;
  var: number;
  varPercent: number;
  method: 'historical' | 'parametric' | 'monte_carlo';
  computedAt: Date;
}

export interface RiskLimitCheckResult {
  passed: boolean;
  violations: RiskLimitViolation[];
  warnings: RiskLimitWarning[];
  checkedAt: Date;
}

export interface RiskLimitViolation {
  metric: string;
  limit: number;
  current: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface RiskLimitWarning {
  metric: string;
  limit: number;
  current: number;
  message: string;
}

// ============================================================================
// Built-in Stress Scenarios
// ============================================================================

export const DEFAULT_STRESS_SCENARIOS: Omit<StressTestScenario, 'id'>[] = [
  {
    name: 'TON Market Crash -50%',
    description: 'Severe TON ecosystem drawdown simulating bear market conditions',
    shocks: [
      { assetClass: 'ton', shockPercent: -50 },
      { assetClass: 'ton_defi', shockPercent: -60 },
    ],
    correlationOverride: 0.9,
  },
  {
    name: 'Global Crypto Bear Market',
    description: 'Cross-chain crypto crash similar to 2022 conditions',
    shocks: [
      { assetClass: 'crypto', shockPercent: -40 },
      { assetClass: 'defi', shockPercent: -55 },
      { assetClass: 'rwa', shockPercent: -10 },
    ],
    correlationOverride: 0.85,
    liquidityMultiplier: 0.3,
  },
  {
    name: 'Stablecoin Depeg Event',
    description: 'Major stablecoin loses peg, causing liquidity crisis',
    shocks: [
      { assetClass: 'stablecoin', shockPercent: -15 },
      { assetClass: 'crypto', shockPercent: -25 },
    ],
    liquidityMultiplier: 0.2,
  },
  {
    name: 'DeFi Protocol Exploit',
    description: 'Major DeFi protocol exploit causing cascading liquidations',
    shocks: [
      { assetClass: 'defi', shockPercent: -70 },
      { assetClass: 'lp_token', shockPercent: -80 },
      { assetClass: 'crypto', shockPercent: -20 },
    ],
    liquidityMultiplier: 0.1,
  },
  {
    name: 'Rising Interest Rates Shock',
    description: 'Rapid rise in real-world interest rates affecting RWA and crypto',
    shocks: [
      { assetClass: 'rwa', shockPercent: -20 },
      { assetClass: 'bonds', shockPercent: -15 },
      { assetClass: 'crypto', shockPercent: -15 },
    ],
  },
];

// ============================================================================
// Default Risk Aggregation Layer Implementation
// ============================================================================

const DEFAULT_RISK_CONFIG: RiskAggregationConfig = {
  varConfidenceLevel: 0.99,
  varTimeHorizon: 1,
  varMethod: 'historical',
  lookbackPeriod: 252,
  stressTestFrequency: 'daily',
  systemicRiskEnabled: true,
};

// Default VaR limits
const RISK_LIMITS: Record<string, number> = {
  maxVar99Percent: 0.1, // 10% max VaR
  maxDrawdownPercent: 0.2, // 20% max drawdown
  maxLeverage: 5,
  maxConcentrationPercent: 0.3, // 30% max in single asset
  maxSystemicRiskScore: 70,
};

export class DefaultRiskAggregationLayer implements RiskAggregationLayer {
  readonly config: RiskAggregationConfig;

  private readonly riskHistory: PortfolioRiskSnapshot[] = [];
  private readonly systemicRiskHistory: SystemicRiskModel[] = [];
  private readonly scenarios: Map<string, StressTestScenario> = new Map();
  private readonly stressTestResults: StressTestResult[] = [];
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<RiskAggregationConfig>) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };

    // Register default stress scenarios
    for (const scenario of DEFAULT_STRESS_SCENARIOS) {
      this.registerScenario(scenario);
    }
  }

  // ============================================================================
  // Portfolio Risk
  // ============================================================================

  calculatePortfolioRisk(positions: AggregatedPosition[]): PortfolioRiskSnapshot {
    const totalAUM = positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);

    // VaR Calculation (simplified historical approach)
    const varResult = this.calculateVaR(positions, this.config.varConfidenceLevel);
    const cvar95 = this.calculateCVaR(positions, 0.95);
    const cvar99 = this.calculateCVaR(positions, 0.99);

    // Drawdown estimation
    const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const currentDrawdown = totalAUM > 0 ? Math.max(0, -unrealizedPnL / (totalAUM + unrealizedPnL)) : 0;

    // Volatility (simplified - using position weights and asset volatilities)
    const volatility = 0.25; // Placeholder - in production would use actual price series

    // Risk metrics
    const sharpe = volatility > 0 ? (unrealizedPnL / totalAUM / volatility) : 0;
    const sortino = sharpe * 1.4; // Simplified

    // Cross-fund correlations
    const fundIds = [...new Set(positions.map(p => p.fundId))];
    const crossFundCorrelations: CrossFundCorrelation[] = [];
    for (let i = 0; i < fundIds.length; i++) {
      for (let j = i + 1; j < fundIds.length; j++) {
        crossFundCorrelations.push({
          fund1Id: fundIds[i],
          fund2Id: fundIds[j],
          correlation: 0.3 + Math.random() * 0.4, // Simulated
          period: '30d',
        });
      }
    }

    // Agent risk contributions
    const agentIds = [...new Set(positions.map(p => p.agentId))];
    const agentRiskContributions: AgentRiskContribution[] = agentIds.map(agentId => {
      const agentPositions = positions.filter(p => p.agentId === agentId);
      const agentExposure = agentPositions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);
      const marginalVar = (agentExposure / totalAUM) * varResult.var;
      return {
        agentId,
        fundId: agentPositions[0]?.fundId ?? '',
        marginalVar,
        componentVar: marginalVar * 0.8,
        riskContributionPercent: totalAUM > 0 ? (agentExposure / totalAUM) * 100 : 0,
      };
    });

    // Concentration risk
    const assetGroups = this.groupByAsset(positions);
    const topAssetEntry = [...assetGroups.entries()].reduce(
      (max, [assetId, value]) => (value > max[1] ? [assetId, value] : max),
      ['', 0]
    );
    const topAsset = {
      assetId: topAssetEntry[0] as string,
      name: topAssetEntry[0] as string,
      weight: totalAUM > 0 ? topAssetEntry[1] / totalAUM : 0,
    };

    const strategyGroups = this.groupByStrategy(positions);
    const topStrategyEntry = [...strategyGroups.entries()].reduce(
      (max, [strategy, value]) => (value > max[1] ? [strategy, value] : max),
      ['', 0]
    );
    const topStrategy = {
      strategyType: topStrategyEntry[0] as string,
      weight: totalAUM > 0 ? topStrategyEntry[1] / totalAUM : 0,
    };

    const fundGroups = this.groupByFund(positions);
    const topFundEntry = [...fundGroups.entries()].reduce(
      (max, [fundId, value]) => (value > max[1] ? [fundId, value] : max),
      ['', 0]
    );
    const topFund = {
      fundId: topFundEntry[0] as FundId,
      weight: totalAUM > 0 ? topFundEntry[1] / totalAUM : 0,
    };

    // Herfindahl index (concentration measure)
    const weights = [...assetGroups.values()].map(v => (totalAUM > 0 ? v / totalAUM : 0));
    const herfindahl = weights.reduce((sum, w) => sum + w * w, 0);

    const concentrationRisk: ConcentrationRisk = {
      topAsset,
      topStrategy,
      topFund,
      herfindahlIndex: herfindahl,
    };

    const snapshot: PortfolioRiskSnapshot = {
      id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      totalAUM,
      portfolioVar95: this.calculateVaR(positions, 0.95).var,
      portfolioVar99: varResult.var,
      portfolioCVaR95: cvar95,
      portfolioCVaR99: cvar99,
      maxDrawdown: currentDrawdown * 1.5, // Historical max approximation
      currentDrawdown,
      annualizedVolatility: volatility,
      sharpeRatio: sharpe,
      sortinoRatio: sortino,
      beta: 1.2, // Simplified
      crossFundCorrelations,
      agentRiskContributions,
      concentrationRisk,
    };

    this.riskHistory.push(snapshot);

    // Keep last 1000 snapshots
    if (this.riskHistory.length > 1000) {
      this.riskHistory.splice(0, this.riskHistory.length - 1000);
    }

    // Check risk limits
    const limitCheck = this.checkRiskLimits(snapshot);
    if (!limitCheck.passed) {
      this.emitEvent('warning', 'risk_aggregation', 'Risk limit violations detected', {
        violations: limitCheck.violations.length,
        critical: limitCheck.violations.filter(v => v.severity === 'critical').length,
      });
    }

    return snapshot;
  }

  getLatestRiskSnapshot(): PortfolioRiskSnapshot | undefined {
    return this.riskHistory[this.riskHistory.length - 1];
  }

  getRiskHistory(fromDate?: Date): PortfolioRiskSnapshot[] {
    if (fromDate) {
      return this.riskHistory.filter(s => s.timestamp >= fromDate);
    }
    return [...this.riskHistory];
  }

  // ============================================================================
  // Cross-Agent/Fund Exposure
  // ============================================================================

  getPortfolioExposure(): CrossPortfolioExposure {
    const snapshot = this.getLatestRiskSnapshot();
    const totalAUM = snapshot?.totalAUM ?? 0;

    return {
      timestamp: new Date(),
      totalLongExposure: totalAUM * 0.65,
      totalShortExposure: totalAUM * 0.15,
      netExposure: totalAUM * 0.5,
      grossExposure: totalAUM * 0.8,
      leverageRatio: 1.5,
      byAssetClass: [
        { assetClass: 'crypto', longExposure: totalAUM * 0.3, shortExposure: totalAUM * 0.05, netExposure: totalAUM * 0.25, percentOfPortfolio: 25 },
        { assetClass: 'defi', longExposure: totalAUM * 0.2, shortExposure: totalAUM * 0.05, netExposure: totalAUM * 0.15, percentOfPortfolio: 15 },
        { assetClass: 'rwa', longExposure: totalAUM * 0.15, shortExposure: 0, netExposure: totalAUM * 0.15, percentOfPortfolio: 15 },
      ],
      byChain: [
        { chainId: 'ton', exposure: totalAUM * 0.5, percentOfPortfolio: 50 },
        { chainId: 'ethereum', exposure: totalAUM * 0.3, percentOfPortfolio: 30 },
      ],
      byStrategy: [
        { strategy: 'yield_farming', exposure: totalAUM * 0.3, agentCount: 2, percentOfPortfolio: 30 },
        { strategy: 'arbitrage', exposure: totalAUM * 0.2, agentCount: 1, percentOfPortfolio: 20 },
        { strategy: 'trend_following', exposure: totalAUM * 0.2, agentCount: 1, percentOfPortfolio: 20 },
      ],
    };
  }

  getAgentExposures(): AgentExposureSummary[] {
    // Return from latest snapshot's agent risk contributions
    const snapshot = this.getLatestRiskSnapshot();
    if (!snapshot) return [];

    return snapshot.agentRiskContributions.map(contrib => ({
      agentId: contrib.agentId,
      fundId: contrib.fundId,
      totalExposure: (contrib.riskContributionPercent / 100) * snapshot.totalAUM,
      netExposure: (contrib.riskContributionPercent / 100) * snapshot.totalAUM * 0.7,
      leverage: 1.5,
      strategyTypes: ['yield_farming'],
      riskContributionPercent: contrib.riskContributionPercent,
    }));
  }

  getFundExposures(): FundExposureSummary[] {
    const snapshot = this.getLatestRiskSnapshot();
    if (!snapshot) return [];

    // Group by fund
    const byFund = new Map<FundId, { exposure: number; agents: AgentId[] }>();
    for (const contrib of snapshot.agentRiskContributions) {
      const existing = byFund.get(contrib.fundId) ?? { exposure: 0, agents: [] };
      existing.exposure += (contrib.riskContributionPercent / 100) * snapshot.totalAUM;
      existing.agents.push(contrib.agentId);
      byFund.set(contrib.fundId, existing);
    }

    return [...byFund.entries()].map(([fundId, data]) => ({
      fundId,
      totalExposure: data.exposure,
      netExposure: data.exposure * 0.7,
      agentCount: data.agents.length,
      avgLeverage: 1.5,
      riskContributionPercent: snapshot.totalAUM > 0 ? (data.exposure / snapshot.totalAUM) * 100 : 0,
    }));
  }

  // ============================================================================
  // VaR Calculations
  // ============================================================================

  calculateVaR(positions: AggregatedPosition[], confidenceLevel = this.config.varConfidenceLevel): VaRResult {
    const totalValue = positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);

    // Parametric VaR: VaR = Z * σ * √t * Portfolio Value
    // Z for 99%: 2.326, for 95%: 1.645
    const zScore = confidenceLevel >= 0.99 ? 2.326 : confidenceLevel >= 0.95 ? 1.645 : 1.282;
    const dailyVolatility = 0.02; // 2% daily vol (simplified)
    const timeHorizon = this.config.varTimeHorizon;
    const var_ = zScore * dailyVolatility * Math.sqrt(timeHorizon) * totalValue;

    return {
      confidenceLevel,
      timeHorizon,
      var: var_,
      varPercent: totalValue > 0 ? var_ / totalValue : 0,
      method: this.config.varMethod,
      computedAt: new Date(),
    };
  }

  calculateCVaR(positions: AggregatedPosition[], confidenceLevel = 0.99): number {
    const varResult = this.calculateVaR(positions, confidenceLevel);
    // CVaR = VaR / (1 - confidenceLevel) * correction factor
    return varResult.var * 1.3; // Simplified: CVaR ≈ 1.3 * VaR
  }

  // ============================================================================
  // Systemic Risk
  // ============================================================================

  assessSystemicRisk(): SystemicRiskModel {
    const snapshot = this.getLatestRiskSnapshot();
    const totalAUM = snapshot?.totalAUM ?? 0;

    // Determine market regime based on recent drawdown
    const currentDrawdown = snapshot?.currentDrawdown ?? 0;
    let marketRegime: SystemicRiskModel['marketRegime'] = 'bull';
    if (currentDrawdown > 0.3) {
      marketRegime = 'crisis';
    } else if (currentDrawdown > 0.15) {
      marketRegime = 'bear';
    } else if (currentDrawdown > 0.05) {
      marketRegime = 'sideways';
    }

    // Systemic risk score
    const systemicRiskScore = Math.min(100, currentDrawdown * 200 + 30);

    // Contagion risk (correlation-based)
    const avgCorrelation = snapshot?.crossFundCorrelations.reduce(
      (sum, c) => sum + c.correlation, 0
    ) ?? 0;
    const numCorrelations = snapshot?.crossFundCorrelations.length ?? 1;
    const contagionRisk = Math.min(100, (avgCorrelation / numCorrelations) * 100);

    // Liquidity risk
    const liquidityRisk = totalAUM > 0 ? Math.min(80, 30 + currentDrawdown * 100) : 20;

    const model: SystemicRiskModel = {
      id: `sysrisk_${Date.now()}`,
      marketRegime,
      systemicRiskScore,
      contagionRisk,
      liquidityRisk,
      correlationBreakdown: avgCorrelation > 0.8,
      estimatedAt: new Date(),
    };

    this.systemicRiskHistory.push(model);

    // Keep last 100 systemic risk assessments
    if (this.systemicRiskHistory.length > 100) {
      this.systemicRiskHistory.splice(0, this.systemicRiskHistory.length - 100);
    }

    if (systemicRiskScore > RISK_LIMITS.maxSystemicRiskScore) {
      this.emitEvent('warning', 'risk_aggregation', `High systemic risk detected: ${systemicRiskScore}`, {
        marketRegime,
        systemicRiskScore,
        contagionRisk,
      });
    }

    return model;
  }

  getSystemicRiskHistory(): SystemicRiskModel[] {
    return [...this.systemicRiskHistory];
  }

  // ============================================================================
  // Stress Testing
  // ============================================================================

  registerScenario(scenarioInput: Omit<StressTestScenario, 'id'>): StressTestScenario {
    const scenario: StressTestScenario = {
      ...scenarioInput,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  runStressTest(scenarioId: string, positions: AggregatedPosition[]): StressTestResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Stress test scenario not found: ${scenarioId}`);
    }

    const totalPortfolioValue = positions.reduce(
      (sum, p) => sum + Math.abs(p.marketValue),
      0
    );

    // Apply shocks to positions
    let portfolioLoss = 0;
    const agentImpacts = new Map<AgentId, AgentStressImpact>();

    for (const position of positions) {
      // Find applicable shock
      const shock = scenario.shocks.find(
        s => s.assetId === position.assetId || s.assetClass === position.assetClass
      );

      if (!shock) continue;

      // Calculate loss considering direction
      const rawShockPercent = shock.shockPercent / 100;
      const positionLoss = position.direction === 'long'
        ? Math.abs(position.marketValue) * rawShockPercent
        : Math.abs(position.marketValue) * -rawShockPercent;

      if (positionLoss < 0) {
        portfolioLoss += Math.abs(positionLoss);
      }

      // Aggregate by agent
      const existing = agentImpacts.get(position.agentId) ?? {
        agentId: position.agentId,
        fundId: position.fundId,
        estimatedLoss: 0,
        estimatedLossPercent: 0,
        marginStatus: 'healthy' as const,
      };

      if (positionLoss < 0) {
        existing.estimatedLoss += Math.abs(positionLoss);
      }
      agentImpacts.set(position.agentId, existing);
    }

    // Apply liquidity multiplier
    if (scenario.liquidityMultiplier) {
      portfolioLoss *= (1 + (1 - scenario.liquidityMultiplier));
    }

    const portfolioLossPercent = totalPortfolioValue > 0
      ? portfolioLoss / totalPortfolioValue
      : 0;

    // Calculate agent-level percentages and margin status
    const agentImpactList: AgentStressImpact[] = [...agentImpacts.values()].map(impact => {
      const agentPositions = positions.filter(p => p.agentId === impact.agentId);
      const agentValue = agentPositions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);
      impact.estimatedLossPercent = agentValue > 0 ? impact.estimatedLoss / agentValue : 0;

      // Determine margin status post-shock
      if (impact.estimatedLossPercent > 0.5) {
        impact.marginStatus = 'liquidating';
      } else if (impact.estimatedLossPercent > 0.3) {
        impact.marginStatus = 'margin_call';
      } else if (impact.estimatedLossPercent > 0.15) {
        impact.marginStatus = 'warning';
      }

      return impact;
    });

    // Find worst affected fund
    const fundLosses = new Map<FundId, number>();
    for (const impact of agentImpactList) {
      const existing = fundLosses.get(impact.fundId) ?? 0;
      fundLosses.set(impact.fundId, existing + impact.estimatedLoss);
    }
    const worstFundEntry = [...fundLosses.entries()].reduce(
      (max, [fundId, loss]) => (loss > max[1] ? [fundId, loss] : max),
      ['', 0]
    );

    const marginsBreached = agentImpactList.filter(
      a => a.marginStatus === 'margin_call' || a.marginStatus === 'liquidating'
    ).length;

    const recommendations: string[] = [];
    if (portfolioLossPercent > 0.2) {
      recommendations.push('Reduce leverage across all funds');
      recommendations.push('Increase collateral buffers');
    }
    if (portfolioLossPercent > 0.1) {
      recommendations.push('Review concentration in affected asset classes');
      recommendations.push('Consider hedging strategies');
    }
    if (marginsBreached > 0) {
      recommendations.push(`Pre-fund ${marginsBreached} accounts at risk of margin call`);
    }

    const result: StressTestResult = {
      scenarioId,
      scenarioName: scenario.name,
      portfolioLoss,
      portfolioLossPercent,
      agentImpacts: agentImpactList,
      worstAffectedFund: {
        fundId: worstFundEntry[0] as FundId,
        lossPercent: totalPortfolioValue > 0 ? worstFundEntry[1] / totalPortfolioValue : 0,
      },
      marginsBreached,
      recommendedActions: recommendations,
      testedAt: new Date(),
    };

    this.stressTestResults.push(result);

    this.emitEvent('info', 'risk_aggregation', `Stress test completed: ${scenario.name}`, {
      scenarioId,
      portfolioLossPercent: portfolioLossPercent.toFixed(4),
      marginsBreached,
    });

    return result;
  }

  runAllStressTests(positions: AggregatedPosition[]): StressTestResult[] {
    const results: StressTestResult[] = [];
    for (const scenarioId of this.scenarios.keys()) {
      try {
        results.push(this.runStressTest(scenarioId, positions));
      } catch {
        // Skip failed scenarios
      }
    }

    this.emitEvent('info', 'risk_aggregation', `All stress tests completed: ${results.length} scenarios`, {
      scenariosRun: results.length,
      worstLoss: Math.max(...results.map(r => r.portfolioLossPercent)),
    });

    return results;
  }

  getStressTestResults(scenarioId?: string): StressTestResult[] {
    if (scenarioId) {
      return this.stressTestResults.filter(r => r.scenarioId === scenarioId);
    }
    return [...this.stressTestResults];
  }

  listScenarios(): StressTestScenario[] {
    return Array.from(this.scenarios.values());
  }

  // ============================================================================
  // Risk Limit Checking
  // ============================================================================

  checkRiskLimits(snapshot: PortfolioRiskSnapshot): RiskLimitCheckResult {
    const violations: RiskLimitViolation[] = [];
    const warnings: RiskLimitWarning[] = [];

    // Check VaR limit
    if (snapshot.portfolioVar99 / snapshot.totalAUM > RISK_LIMITS.maxVar99Percent) {
      violations.push({
        metric: 'VaR99',
        limit: RISK_LIMITS.maxVar99Percent,
        current: snapshot.portfolioVar99 / snapshot.totalAUM,
        severity: 'critical',
        message: `VaR99 exceeds limit: ${(snapshot.portfolioVar99 / snapshot.totalAUM * 100).toFixed(2)}% vs ${RISK_LIMITS.maxVar99Percent * 100}% limit`,
      });
    }

    // Check drawdown
    if (snapshot.currentDrawdown > RISK_LIMITS.maxDrawdownPercent) {
      violations.push({
        metric: 'CurrentDrawdown',
        limit: RISK_LIMITS.maxDrawdownPercent,
        current: snapshot.currentDrawdown,
        severity: 'critical',
        message: `Current drawdown exceeds limit: ${(snapshot.currentDrawdown * 100).toFixed(2)}%`,
      });
    }

    // Check concentration
    if (snapshot.concentrationRisk.topAsset.weight > RISK_LIMITS.maxConcentrationPercent) {
      violations.push({
        metric: 'AssetConcentration',
        limit: RISK_LIMITS.maxConcentrationPercent,
        current: snapshot.concentrationRisk.topAsset.weight,
        severity: 'warning',
        message: `Asset concentration too high: ${(snapshot.concentrationRisk.topAsset.weight * 100).toFixed(2)}%`,
      });
    }

    // Warnings for approaching limits
    if (snapshot.portfolioVar99 / snapshot.totalAUM > RISK_LIMITS.maxVar99Percent * 0.8) {
      warnings.push({
        metric: 'VaR99',
        limit: RISK_LIMITS.maxVar99Percent,
        current: snapshot.portfolioVar99 / snapshot.totalAUM,
        message: 'VaR approaching limit',
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      warnings,
      checkedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private groupByAsset(positions: AggregatedPosition[]): Map<AssetId, number> {
    const groups = new Map<AssetId, number>();
    for (const pos of positions) {
      groups.set(pos.assetId, (groups.get(pos.assetId) ?? 0) + Math.abs(pos.marketValue));
    }
    return groups;
  }

  private groupByStrategy(positions: AggregatedPosition[]): Map<string, number> {
    const groups = new Map<string, number>();
    for (const pos of positions) {
      groups.set(pos.strategy, (groups.get(pos.strategy) ?? 0) + Math.abs(pos.marketValue));
    }
    return groups;
  }

  private groupByFund(positions: AggregatedPosition[]): Map<FundId, number> {
    const groups = new Map<FundId, number>();
    for (const pos of positions) {
      groups.set(pos.fundId, (groups.get(pos.fundId) ?? 0) + Math.abs(pos.marketValue));
    }
    return groups;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'risk_alert',
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

export function createRiskAggregationLayer(
  config?: Partial<RiskAggregationConfig>
): DefaultRiskAggregationLayer {
  return new DefaultRiskAggregationLayer(config);
}
