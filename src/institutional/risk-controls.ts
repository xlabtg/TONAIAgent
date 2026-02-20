/**
 * TONAIAgent - Institutional Risk Control Layer
 *
 * Implements portfolio risk management:
 * - Portfolio risk limits
 * - Stress testing
 * - VaR models
 * - Scenario simulation
 * - Real-time monitoring
 */

import {
  InstitutionalRiskConfig,
  PortfolioLimits,
  VaRConfig,
  VaRMethodology,
  StressTestConfig,
  StressScenario,
  CustomStressScenario,
  MarketShock,
  RiskAlertThresholds,
  RiskMetrics,
  VaRMetric,
  ConcentrationMetric,
  CorrelationMatrix,
  StressTestResult,
  AssetImpact,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface RiskControlManager {
  // Configuration
  configureRisk(accountId: string, config: Partial<InstitutionalRiskConfig>): Promise<InstitutionalRiskConfig>;
  getConfig(accountId: string): Promise<InstitutionalRiskConfig | null>;
  updateLimits(accountId: string, limits: Partial<PortfolioLimits>): Promise<PortfolioLimits>;
  updateThresholds(accountId: string, thresholds: Partial<RiskAlertThresholds>): Promise<RiskAlertThresholds>;

  // Portfolio State
  updatePortfolio(accountId: string, portfolio: PortfolioState): Promise<void>;
  getPortfolio(accountId: string): Promise<PortfolioState | null>;

  // VaR Calculations
  calculateVaR(
    accountId: string,
    methodology?: VaRMethodology,
    confidenceLevel?: number
  ): Promise<VaRMetric>;
  calculateExpectedShortfall(accountId: string, confidenceLevel?: number): Promise<number>;

  // Stress Testing
  addStressScenario(accountId: string, scenario: Omit<StressScenario, 'id'>): Promise<StressScenario>;
  addCustomScenario(
    accountId: string,
    scenario: Omit<CustomStressScenario, 'id' | 'createdAt'>
  ): Promise<CustomStressScenario>;
  runStressTest(accountId: string, scenarioId: string): Promise<StressTestResult>;
  runAllStressTests(accountId: string): Promise<StressTestResult[]>;

  // Risk Metrics
  calculateRiskMetrics(accountId: string): Promise<RiskMetrics>;
  getConcentrationRisk(accountId: string): Promise<ConcentrationMetric[]>;
  getCorrelationMatrix(accountId: string): Promise<CorrelationMatrix>;

  // Limit Monitoring
  checkLimits(accountId: string): Promise<LimitCheckResult[]>;
  checkTransactionImpact(
    accountId: string,
    transaction: TransactionImpactRequest
  ): Promise<TransactionImpactResult>;

  // Alerts
  getActiveAlerts(accountId: string): Promise<RiskControlAlert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;

  // Real-time Monitoring
  startMonitoring(accountId: string): Promise<void>;
  stopMonitoring(accountId: string): Promise<void>;
  isMonitoring(accountId: string): boolean;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface PortfolioState {
  timestamp: Date;
  totalValue: number;
  positions: Position[];
  historicalReturns: HistoricalReturn[];
  marketData: MarketDataSnapshot;
}

export interface Position {
  asset: string;
  symbol: string;
  quantity: number;
  currentPrice: number;
  value: number;
  weight: number;
  costBasis: number;
  unrealizedPnL: number;
  category: string;
}

export interface HistoricalReturn {
  date: Date;
  return: number;
  portfolioValue: number;
}

export interface MarketDataSnapshot {
  timestamp: Date;
  prices: Record<string, number>;
  volatilities: Record<string, number>;
  correlations?: Record<string, Record<string, number>>;
}

export interface LimitCheckResult {
  limit: string;
  type: 'position' | 'concentration' | 'drawdown' | 'leverage' | 'loss';
  currentValue: number;
  limitValue: number;
  percentage: number;
  status: 'ok' | 'warning' | 'breach';
  message?: string;
}

export interface TransactionImpactRequest {
  type: 'buy' | 'sell' | 'transfer';
  asset: string;
  amount: number;
  value: number;
}

export interface TransactionImpactResult {
  allowed: boolean;
  impacts: ImpactDetail[];
  warnings: string[];
  blockers: string[];
}

export interface ImpactDetail {
  metric: string;
  before: number;
  after: number;
  change: number;
  status: 'ok' | 'warning' | 'breach';
}

export interface RiskControlAlert {
  id: string;
  accountId: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
}

type AlertType =
  | 'var_breach'
  | 'concentration_breach'
  | 'drawdown_warning'
  | 'drawdown_critical'
  | 'loss_limit_breach'
  | 'volatility_spike'
  | 'correlation_breakdown';

// ============================================================================
// Historical Stress Scenarios
// ============================================================================

const HISTORICAL_STRESS_SCENARIOS: Omit<StressScenario, 'id'>[] = [
  {
    name: 'March 2020 COVID Crash',
    type: 'historical',
    description: 'Market crash during COVID-19 pandemic onset',
    marketShocks: [
      { asset: 'BTC', changePercent: -50, volatilityMultiplier: 3 },
      { asset: 'ETH', changePercent: -60, volatilityMultiplier: 3.5 },
      { asset: 'TON', changePercent: -45, volatilityMultiplier: 2.5 },
      { asset: 'USDT', changePercent: 0 },
    ],
    enabled: true,
  },
  {
    name: 'FTX Collapse',
    type: 'historical',
    description: 'Market impact from FTX exchange collapse',
    marketShocks: [
      { asset: 'BTC', changePercent: -25 },
      { asset: 'ETH', changePercent: -30 },
      { asset: 'TON', changePercent: -35 },
      { asset: 'Altcoins', changePercent: -50 },
    ],
    enabled: true,
  },
  {
    name: 'Terra/LUNA Collapse',
    type: 'historical',
    description: 'Algorithmic stablecoin de-peg scenario',
    marketShocks: [
      { asset: 'Stablecoins', changePercent: -10 },
      { asset: 'BTC', changePercent: -15 },
      { asset: 'DeFi', changePercent: -40 },
    ],
    enabled: true,
  },
  {
    name: 'Flash Crash',
    type: 'hypothetical',
    description: 'Sudden market flash crash scenario',
    marketShocks: [
      { asset: 'ALL', changePercent: -30, volatilityMultiplier: 5 },
    ],
    enabled: true,
  },
  {
    name: 'Liquidity Crisis',
    type: 'hypothetical',
    description: 'Severe liquidity withdrawal scenario',
    marketShocks: [
      { asset: 'ALL', changePercent: -20 },
      { asset: 'DeFi', changePercent: -50 },
      { asset: 'Altcoins', changePercent: -60 },
    ],
    enabled: true,
  },
];

// ============================================================================
// Risk Control Manager Implementation
// ============================================================================

export class DefaultRiskControlManager implements RiskControlManager {
  private readonly configs = new Map<string, InstitutionalRiskConfig>();
  private readonly portfolios = new Map<string, PortfolioState>();
  private readonly alerts = new Map<string, RiskControlAlert>();
  private readonly alertsByAccount = new Map<string, Set<string>>();
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private scenarioCounter = 0;
  private alertCounter = 0;

  async configureRisk(
    accountId: string,
    config: Partial<InstitutionalRiskConfig>
  ): Promise<InstitutionalRiskConfig> {
    const existing = this.configs.get(accountId);

    const defaultLimits: PortfolioLimits = {
      maxPositionSize: 1000000,
      maxConcentration: 25,
      maxLeverage: 1,
      maxDrawdown: 20,
      maxDailyLoss: 5,
      maxWeeklyLoss: 10,
      maxMonthlyLoss: 20,
    };

    const defaultVaRConfig: VaRConfig = {
      confidenceLevel: 95,
      holdingPeriod: 1,
      methodology: 'historical',
      lookbackPeriod: 252,
      updateFrequency: 'daily',
    };

    const defaultStressTestConfig: StressTestConfig = {
      enabled: true,
      scenarios: [],
      customScenarios: [],
      runFrequency: 'weekly',
    };

    const defaultThresholds: RiskAlertThresholds = {
      varBreachPercent: 100,
      concentrationBreachPercent: 80,
      drawdownWarning: 50,
      drawdownCritical: 80,
      volatilityMultiplier: 2,
    };

    const newConfig: InstitutionalRiskConfig = {
      accountId,
      enabled: config.enabled ?? existing?.enabled ?? true,
      portfolioLimits: { ...defaultLimits, ...existing?.portfolioLimits, ...config.portfolioLimits },
      varConfig: { ...defaultVaRConfig, ...existing?.varConfig, ...config.varConfig },
      stressTestConfig: { ...defaultStressTestConfig, ...existing?.stressTestConfig, ...config.stressTestConfig },
      alertThresholds: { ...defaultThresholds, ...existing?.alertThresholds, ...config.alertThresholds },
      realTimeMonitoring: config.realTimeMonitoring ?? existing?.realTimeMonitoring ?? true,
    };

    // Add default stress scenarios if none exist
    if (newConfig.stressTestConfig.scenarios.length === 0) {
      for (const scenario of HISTORICAL_STRESS_SCENARIOS) {
        const id = this.generateScenarioId();
        newConfig.stressTestConfig.scenarios.push({ ...scenario, id });
      }
    }

    this.configs.set(accountId, newConfig);
    return newConfig;
  }

  async getConfig(accountId: string): Promise<InstitutionalRiskConfig | null> {
    return this.configs.get(accountId) ?? null;
  }

  async updateLimits(
    accountId: string,
    limits: Partial<PortfolioLimits>
  ): Promise<PortfolioLimits> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Risk config not found for account: ${accountId}`);
    }

    config.portfolioLimits = { ...config.portfolioLimits, ...limits };
    return config.portfolioLimits;
  }

  async updateThresholds(
    accountId: string,
    thresholds: Partial<RiskAlertThresholds>
  ): Promise<RiskAlertThresholds> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Risk config not found for account: ${accountId}`);
    }

    config.alertThresholds = { ...config.alertThresholds, ...thresholds };
    return config.alertThresholds;
  }

  async updatePortfolio(accountId: string, portfolio: PortfolioState): Promise<void> {
    this.portfolios.set(accountId, portfolio);

    // Check limits after portfolio update
    if (this.configs.get(accountId)?.enabled) {
      await this.checkAndGenerateAlerts(accountId);
    }
  }

  async getPortfolio(accountId: string): Promise<PortfolioState | null> {
    return this.portfolios.get(accountId) ?? null;
  }

  async calculateVaR(
    accountId: string,
    methodology?: VaRMethodology,
    confidenceLevel?: number
  ): Promise<VaRMetric> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      return {
        value: 0,
        confidenceLevel: confidenceLevel ?? 95,
        holdingPeriod: 1,
        methodology: methodology ?? 'historical',
        calculatedAt: new Date(),
      };
    }

    const method = methodology ?? config.varConfig.methodology;
    const confidence = confidenceLevel ?? config.varConfig.confidenceLevel;

    let varValue: number;

    switch (method) {
      case 'historical':
        varValue = this.calculateHistoricalVaR(portfolio, confidence);
        break;
      case 'parametric':
        varValue = this.calculateParametricVaR(portfolio, confidence);
        break;
      case 'monte_carlo':
        varValue = this.calculateMonteCarloVaR(portfolio, confidence);
        break;
      default:
        varValue = this.calculateHistoricalVaR(portfolio, confidence);
    }

    return {
      value: varValue,
      confidenceLevel: confidence,
      holdingPeriod: config.varConfig.holdingPeriod,
      methodology: method,
      calculatedAt: new Date(),
    };
  }

  async calculateExpectedShortfall(
    accountId: string,
    confidenceLevel?: number
  ): Promise<number> {
    const portfolio = this.portfolios.get(accountId);
    if (!portfolio || portfolio.historicalReturns.length === 0) {
      return 0;
    }

    const confidence = confidenceLevel ?? 95;
    const returns = portfolio.historicalReturns.map((r) => r.return).sort((a, b) => a - b);
    const cutoffIndex = Math.floor(returns.length * (1 - confidence / 100));

    if (cutoffIndex === 0) {
      return Math.abs(returns[0]) * portfolio.totalValue;
    }

    const tailReturns = returns.slice(0, cutoffIndex);
    const averageTailLoss = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;

    return Math.abs(averageTailLoss) * portfolio.totalValue;
  }

  async addStressScenario(
    accountId: string,
    scenario: Omit<StressScenario, 'id'>
  ): Promise<StressScenario> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Risk config not found for account: ${accountId}`);
    }

    const id = this.generateScenarioId();
    const newScenario: StressScenario = { ...scenario, id };
    config.stressTestConfig.scenarios.push(newScenario);

    return newScenario;
  }

  async addCustomScenario(
    accountId: string,
    scenario: Omit<CustomStressScenario, 'id' | 'createdAt'>
  ): Promise<CustomStressScenario> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Risk config not found for account: ${accountId}`);
    }

    const id = this.generateScenarioId();
    const newScenario: CustomStressScenario = {
      ...scenario,
      id,
      createdAt: new Date(),
    };
    config.stressTestConfig.customScenarios.push(newScenario);

    return newScenario;
  }

  async runStressTest(accountId: string, scenarioId: string): Promise<StressTestResult> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      throw new Error(`Risk config or portfolio not found for account: ${accountId}`);
    }

    const scenario =
      config.stressTestConfig.scenarios.find((s) => s.id === scenarioId) ??
      config.stressTestConfig.customScenarios.find((s) => s.id === scenarioId);

    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const shocks = 'shocks' in scenario ? scenario.shocks : scenario.marketShocks;
    const assetImpacts: AssetImpact[] = [];
    let totalImpact = 0;

    for (const position of portfolio.positions) {
      const shock = this.findApplicableShock(position, shocks);
      if (shock) {
        const impactValue = position.value * (shock.changePercent / 100);
        const stressedValue = position.value + impactValue;

        assetImpacts.push({
          asset: position.asset,
          currentValue: position.value,
          stressedValue,
          impactPercent: shock.changePercent,
        });

        totalImpact += impactValue;
      } else {
        assetImpacts.push({
          asset: position.asset,
          currentValue: position.value,
          stressedValue: position.value,
          impactPercent: 0,
        });
      }
    }

    const result: StressTestResult = {
      scenarioId,
      scenarioName: scenario.name,
      portfolioImpact: totalImpact,
      portfolioImpactPercent: (totalImpact / portfolio.totalValue) * 100,
      assetImpacts,
      runAt: new Date(),
    };

    config.stressTestConfig.lastRunAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'risk_limit_breach',
      accountId,
      actorId: 'system',
      actorRole: 'risk_manager',
      action: 'stress_test_completed',
      resource: 'stress_test',
      resourceId: scenarioId,
      details: { scenarioName: scenario.name, impact: result.portfolioImpactPercent },
      metadata: {},
    });

    return result;
  }

  async runAllStressTests(accountId: string): Promise<StressTestResult[]> {
    const config = this.configs.get(accountId);
    if (!config) {
      return [];
    }

    const results: StressTestResult[] = [];

    for (const scenario of config.stressTestConfig.scenarios) {
      if (scenario.enabled) {
        const result = await this.runStressTest(accountId, scenario.id);
        results.push(result);
      }
    }

    for (const scenario of config.stressTestConfig.customScenarios) {
      const result = await this.runStressTest(accountId, scenario.id);
      results.push(result);
    }

    return results;
  }

  async calculateRiskMetrics(accountId: string): Promise<RiskMetrics> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      throw new Error(`Risk config or portfolio not found for account: ${accountId}`);
    }

    const var95 = await this.calculateVaR(accountId, 'historical', 95);
    const es = await this.calculateExpectedShortfall(accountId, 95);
    const concentration = await this.getConcentrationRisk(accountId);
    const correlations = await this.getCorrelationMatrix(accountId);
    const stressResults = await this.runAllStressTests(accountId);

    const returns = portfolio.historicalReturns.map((r) => r.return);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252); // Annualized

    const riskFreeRate = 0.02; // Assumed 2% risk-free rate
    const sharpeRatio = (avgReturn * 252 - riskFreeRate) / volatility;

    // Sortino ratio (only downside deviation)
    const downsideReturns = returns.filter((r) => r < 0);
    const downsideVariance =
      downsideReturns.length > 0
        ? downsideReturns.reduce((a, b) => a + b * b, 0) / downsideReturns.length
        : 0;
    const downsideDeviation = Math.sqrt(downsideVariance * 252);
    const sortinoRatio = downsideDeviation > 0 ? (avgReturn * 252 - riskFreeRate) / downsideDeviation : 0;

    // Drawdown calculations
    let peak = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;

    for (const entry of portfolio.historicalReturns) {
      if (entry.portfolioValue > peak) {
        peak = entry.portfolioValue;
      }
      const drawdown = ((peak - entry.portfolioValue) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
      currentDrawdown = drawdown;
    }

    return {
      accountId,
      timestamp: new Date(),
      portfolioValue: portfolio.totalValue,
      var: var95,
      expectedShortfall: es,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility: volatility * 100,
      beta: this.calculateBeta(portfolio),
      concentration,
      correlations,
      stressTestResults: stressResults,
    };
  }

  async getConcentrationRisk(accountId: string): Promise<ConcentrationMetric[]> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      return [];
    }

    const metrics: ConcentrationMetric[] = [];

    // By individual asset
    for (const position of portfolio.positions) {
      const percentage = position.weight;
      const limit = config.portfolioLimits.maxConcentration;
      let status: 'within_limit' | 'warning' | 'breach' = 'within_limit';

      if (percentage >= limit) {
        status = 'breach';
      } else if (percentage >= limit * 0.8) {
        status = 'warning';
      }

      metrics.push({
        category: 'asset',
        name: position.asset,
        value: position.value,
        percentage,
        limit,
        status,
      });
    }

    // By category
    const categoryTotals = new Map<string, number>();
    for (const position of portfolio.positions) {
      const current = categoryTotals.get(position.category) ?? 0;
      categoryTotals.set(position.category, current + position.value);
    }

    for (const [category, value] of categoryTotals) {
      const percentage = (value / portfolio.totalValue) * 100;
      const limit = config.portfolioLimits.sectorLimits?.[category] ?? 50;
      let status: 'within_limit' | 'warning' | 'breach' = 'within_limit';

      if (percentage >= limit) {
        status = 'breach';
      } else if (percentage >= limit * 0.8) {
        status = 'warning';
      }

      metrics.push({
        category: 'sector',
        name: category,
        value,
        percentage,
        limit,
        status,
      });
    }

    return metrics;
  }

  async getCorrelationMatrix(accountId: string): Promise<CorrelationMatrix> {
    const portfolio = this.portfolios.get(accountId);
    if (!portfolio) {
      return { assets: [], matrix: [], calculatedAt: new Date() };
    }

    const assets = portfolio.positions.map((p) => p.asset);

    // Generate correlation matrix (simplified - would use actual return data in production)
    const matrix: number[][] = [];
    for (let i = 0; i < assets.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < assets.length; j++) {
        if (i === j) {
          row.push(1);
        } else if (portfolio.marketData.correlations?.[assets[i]]?.[assets[j]] !== undefined) {
          row.push(portfolio.marketData.correlations[assets[i]][assets[j]]);
        } else {
          // Default moderate correlation
          row.push(0.5 + Math.random() * 0.3 - 0.15);
        }
      }
      matrix.push(row);
    }

    return { assets, matrix, calculatedAt: new Date() };
  }

  async checkLimits(accountId: string): Promise<LimitCheckResult[]> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      return [];
    }

    const results: LimitCheckResult[] = [];
    const limits = config.portfolioLimits;

    // Position size limits
    for (const position of portfolio.positions) {
      if (position.value > limits.maxPositionSize) {
        results.push({
          limit: 'maxPositionSize',
          type: 'position',
          currentValue: position.value,
          limitValue: limits.maxPositionSize,
          percentage: (position.value / limits.maxPositionSize) * 100,
          status: 'breach',
          message: `Position ${position.asset} exceeds max size`,
        });
      }
    }

    // Concentration limits
    const concentration = await this.getConcentrationRisk(accountId);
    for (const metric of concentration) {
      if (metric.status !== 'within_limit') {
        results.push({
          limit: 'maxConcentration',
          type: 'concentration',
          currentValue: metric.percentage,
          limitValue: metric.limit,
          percentage: (metric.percentage / metric.limit) * 100,
          status: metric.status,
          message: `${metric.name} concentration ${metric.status === 'breach' ? 'exceeds' : 'approaching'} limit`,
        });
      }
    }

    // Drawdown limits
    const metrics = await this.calculateRiskMetrics(accountId);

    if (metrics.currentDrawdown >= limits.maxDrawdown) {
      results.push({
        limit: 'maxDrawdown',
        type: 'drawdown',
        currentValue: metrics.currentDrawdown,
        limitValue: limits.maxDrawdown,
        percentage: (metrics.currentDrawdown / limits.maxDrawdown) * 100,
        status: 'breach',
        message: 'Maximum drawdown exceeded',
      });
    } else if (
      metrics.currentDrawdown >= limits.maxDrawdown * config.alertThresholds.drawdownWarning / 100
    ) {
      results.push({
        limit: 'maxDrawdown',
        type: 'drawdown',
        currentValue: metrics.currentDrawdown,
        limitValue: limits.maxDrawdown,
        percentage: (metrics.currentDrawdown / limits.maxDrawdown) * 100,
        status: 'warning',
        message: 'Drawdown approaching limit',
      });
    }

    return results;
  }

  async checkTransactionImpact(
    accountId: string,
    transaction: TransactionImpactRequest
  ): Promise<TransactionImpactResult> {
    const config = this.configs.get(accountId);
    const portfolio = this.portfolios.get(accountId);

    if (!config || !portfolio) {
      return { allowed: true, impacts: [], warnings: [], blockers: [] };
    }

    const impacts: ImpactDetail[] = [];
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Simulate position change
    const currentPosition = portfolio.positions.find((p) => p.asset === transaction.asset);
    const currentValue = currentPosition?.value ?? 0;
    const newValue =
      transaction.type === 'buy' || transaction.type === 'transfer'
        ? currentValue + transaction.value
        : currentValue - transaction.value;

    // Check position size impact
    if (newValue > config.portfolioLimits.maxPositionSize) {
      blockers.push(`Transaction would exceed position size limit for ${transaction.asset}`);
      impacts.push({
        metric: 'positionSize',
        before: currentValue,
        after: newValue,
        change: newValue - currentValue,
        status: 'breach',
      });
    }

    // Check concentration impact
    const newWeight = (newValue / portfolio.totalValue) * 100;
    const currentWeight = currentPosition?.weight ?? 0;

    if (newWeight > config.portfolioLimits.maxConcentration) {
      blockers.push(`Transaction would exceed concentration limit for ${transaction.asset}`);
      impacts.push({
        metric: 'concentration',
        before: currentWeight,
        after: newWeight,
        change: newWeight - currentWeight,
        status: 'breach',
      });
    } else if (newWeight > config.portfolioLimits.maxConcentration * 0.8) {
      warnings.push(`Transaction would approach concentration limit for ${transaction.asset}`);
      impacts.push({
        metric: 'concentration',
        before: currentWeight,
        after: newWeight,
        change: newWeight - currentWeight,
        status: 'warning',
      });
    } else {
      impacts.push({
        metric: 'concentration',
        before: currentWeight,
        after: newWeight,
        change: newWeight - currentWeight,
        status: 'ok',
      });
    }

    return {
      allowed: blockers.length === 0,
      impacts,
      warnings,
      blockers,
    };
  }

  async getActiveAlerts(accountId: string): Promise<RiskControlAlert[]> {
    const alertIds = this.alertsByAccount.get(accountId);
    if (!alertIds) {
      return [];
    }

    return Array.from(alertIds)
      .map((id) => this.alerts.get(id))
      .filter((a): a is RiskControlAlert => a !== undefined && !a.resolved)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
  }

  async startMonitoring(accountId: string): Promise<void> {
    if (this.monitoringIntervals.has(accountId)) {
      return; // Already monitoring
    }

    const interval = setInterval(async () => {
      await this.checkAndGenerateAlerts(accountId);
    }, 60000); // Check every minute

    this.monitoringIntervals.set(accountId, interval);
  }

  async stopMonitoring(accountId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(accountId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(accountId);
    }
  }

  isMonitoring(accountId: string): boolean {
    return this.monitoringIntervals.has(accountId);
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private generateScenarioId(): string {
    this.scenarioCounter++;
    return `scenario_${Date.now()}_${this.scenarioCounter.toString(36)}`;
  }

  private generateAlertId(): string {
    this.alertCounter++;
    return `risk_alert_${Date.now()}_${this.alertCounter.toString(36)}`;
  }

  private calculateHistoricalVaR(portfolio: PortfolioState, confidenceLevel: number): number {
    if (portfolio.historicalReturns.length === 0) {
      return 0;
    }

    const returns = portfolio.historicalReturns.map((r) => r.return).sort((a, b) => a - b);
    const percentile = 1 - confidenceLevel / 100;
    const index = Math.floor(returns.length * percentile);

    return Math.abs(returns[index]) * portfolio.totalValue;
  }

  private calculateParametricVaR(portfolio: PortfolioState, confidenceLevel: number): number {
    if (portfolio.historicalReturns.length === 0) {
      return 0;
    }

    const returns = portfolio.historicalReturns.map((r) => r.return);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for confidence level
    const zScores: Record<number, number> = {
      90: 1.28,
      95: 1.65,
      99: 2.33,
    };
    const z = zScores[confidenceLevel] ?? 1.65;

    return (mean - z * stdDev) * portfolio.totalValue * -1;
  }

  private calculateMonteCarloVaR(portfolio: PortfolioState, confidenceLevel: number): number {
    if (portfolio.historicalReturns.length === 0) {
      return 0;
    }

    const returns = portfolio.historicalReturns.map((r) => r.return);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Run Monte Carlo simulation
    const simulations = 10000;
    const simulatedReturns: number[] = [];

    for (let i = 0; i < simulations; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const simulatedReturn = mean + stdDev * z;
      simulatedReturns.push(simulatedReturn);
    }

    simulatedReturns.sort((a, b) => a - b);
    const percentile = 1 - confidenceLevel / 100;
    const index = Math.floor(simulations * percentile);

    return Math.abs(simulatedReturns[index]) * portfolio.totalValue;
  }

  private calculateBeta(_portfolio: PortfolioState): number {
    // Simplified beta calculation
    // In production, would calculate against market benchmark
    return 1.0;
  }

  private findApplicableShock(position: Position, shocks: MarketShock[]): MarketShock | null {
    // First, try exact asset match
    const exactMatch = shocks.find((s) => s.asset === position.asset);
    if (exactMatch) return exactMatch;

    // Then, try category match
    const categoryMatch = shocks.find((s) => s.asset === position.category);
    if (categoryMatch) return categoryMatch;

    // Finally, check for 'ALL' shock
    const allShock = shocks.find((s) => s.asset === 'ALL');
    if (allShock) return allShock;

    return null;
  }

  private async checkAndGenerateAlerts(accountId: string): Promise<void> {
    const limitChecks = await this.checkLimits(accountId);

    for (const check of limitChecks) {
      if (check.status !== 'ok') {
        const alertType = this.mapLimitTypeToAlertType(check.type, check.status);
        const existingAlert = this.findExistingAlert(accountId, alertType, check.limit);

        if (!existingAlert) {
          const alertId = this.generateAlertId();
          const alert: RiskControlAlert = {
            id: alertId,
            accountId,
            type: alertType,
            severity: check.status === 'breach' ? 'high' : 'medium',
            title: this.getAlertTitle(alertType),
            description: check.message ?? '',
            metric: check.limit,
            currentValue: check.currentValue,
            thresholdValue: check.limitValue,
            createdAt: new Date(),
            resolved: false,
          };

          this.alerts.set(alertId, alert);
          if (!this.alertsByAccount.has(accountId)) {
            this.alertsByAccount.set(accountId, new Set());
          }
          this.alertsByAccount.get(accountId)!.add(alertId);

          this.emitEvent({
            id: `event_${Date.now()}`,
            timestamp: new Date(),
            type: 'risk_limit_breach',
            accountId,
            actorId: 'system',
            actorRole: 'risk_manager',
            action: 'alert_generated',
            resource: 'risk_alert',
            resourceId: alertId,
            details: { alertType, metric: check.limit, value: check.currentValue },
            metadata: {},
          });
        }
      }
    }
  }

  private mapLimitTypeToAlertType(type: string, status: string): AlertType {
    switch (type) {
      case 'position':
      case 'concentration':
        return 'concentration_breach';
      case 'drawdown':
        return status === 'breach' ? 'drawdown_critical' : 'drawdown_warning';
      case 'loss':
        return 'loss_limit_breach';
      default:
        return 'var_breach';
    }
  }

  private findExistingAlert(accountId: string, type: AlertType, metric: string): RiskControlAlert | undefined {
    const alertIds = this.alertsByAccount.get(accountId);
    if (!alertIds) return undefined;

    for (const alertId of alertIds) {
      const alert = this.alerts.get(alertId);
      if (alert && !alert.resolved && alert.type === type && alert.metric === metric) {
        return alert;
      }
    }

    return undefined;
  }

  private getAlertTitle(type: AlertType): string {
    const titles: Record<AlertType, string> = {
      var_breach: 'VaR Limit Breach',
      concentration_breach: 'Concentration Limit Breach',
      drawdown_warning: 'Drawdown Warning',
      drawdown_critical: 'Critical Drawdown Alert',
      loss_limit_breach: 'Loss Limit Breach',
      volatility_spike: 'Volatility Spike Detected',
      correlation_breakdown: 'Correlation Breakdown',
    };
    return titles[type];
  }

  private emitEvent(event: Parameters<InstitutionalEventCallback>[0]): void {
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

export function createRiskControlManager(): DefaultRiskControlManager {
  return new DefaultRiskControlManager();
}

export { HISTORICAL_STRESS_SCENARIOS };
