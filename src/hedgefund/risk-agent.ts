/**
 * TONAIAgent - Risk Agent
 *
 * Monitors portfolio risk, enforces limits, and provides real-time
 * risk analytics for the autonomous hedge fund.
 */

import {
  RiskAgentConfig,
  RiskLimits,
  StressScenario,
  StressTestResult,
  PositionImpact,
  HedgingStrategy,
  RiskMetricsSnapshot,
  RiskAlert,
  RiskAlertType,
  HedgeFundEvent,
  HedgeFundEventCallback,
  PortfolioPosition,
} from './types';

// ============================================================================
// Risk Agent Interface
// ============================================================================

export interface RiskAgent {
  readonly config: RiskAgentConfig;

  // Configuration
  configure(config: Partial<RiskAgentConfig>): Promise<void>;
  setLimits(limits: Partial<RiskLimits>): Promise<void>;

  // Risk metrics
  calculateVaR(positions: PortfolioPosition[], portfolioValue: number): VaRResult;
  calculateMetrics(positions: PortfolioPosition[], portfolioValue: number): RiskMetricsSnapshot;
  getLatestMetrics(): RiskMetricsSnapshot | undefined;

  // Limit checking
  checkLimits(metrics: RiskMetricsSnapshot): LimitCheckResult;
  checkTransactionImpact(transaction: TransactionRiskRequest): TransactionImpactResult;

  // Stress testing
  runStressTest(scenario: StressScenario, positions: PortfolioPosition[]): StressTestResult;
  runAllStressTests(positions: PortfolioPosition[]): StressTestResult[];
  getStressScenarios(): StressScenario[];

  // Hedging
  checkHedgingNeeded(metrics: RiskMetricsSnapshot): HedgingRecommendation | undefined;
  calculateHedgePositions(strategy: HedgingStrategy, portfolioValue: number): HedgePosition[];

  // Alerts
  getAlerts(filters?: AlertFilters): RiskAlert[];
  acknowledgeAlert(alertId: string, userId: string): Promise<boolean>;
  clearAlerts(): void;

  // Events
  onEvent(callback: HedgeFundEventCallback): void;
}

export interface VaRResult {
  var95: number;
  var99: number;
  cvar: number; // Conditional VaR / Expected Shortfall
  method: string;
  confidence: number;
  timeHorizon: number;
}

export interface LimitCheckResult {
  passed: boolean;
  violations: LimitViolation[];
  warnings: LimitWarning[];
}

export interface LimitViolation {
  limit: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface LimitWarning {
  limit: string;
  currentValue: number;
  threshold: number;
  percentUsed: number;
  message: string;
}

export interface TransactionRiskRequest {
  side: 'buy' | 'sell';
  asset: string;
  quantity: number;
  estimatedPrice: number;
  currentPositions: PortfolioPosition[];
  portfolioValue: number;
}

export interface TransactionImpactResult {
  approved: boolean;
  newVaR: number;
  varChange: number;
  newConcentration: number;
  concentrationChange: number;
  newLeverage: number;
  leverageChange: number;
  violations: string[];
  warnings: string[];
}

export interface HedgingRecommendation {
  needed: boolean;
  reason: string;
  strategy: HedgingStrategy;
  urgency: 'low' | 'medium' | 'high';
  estimatedCost: number;
}

export interface HedgePosition {
  asset: string;
  side: 'buy' | 'sell';
  quantity: number;
  notional: number;
  purpose: string;
}

export interface AlertFilters {
  type?: RiskAlertType[];
  severity?: ('info' | 'warning' | 'critical')[];
  acknowledged?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

// ============================================================================
// Built-in Stress Scenarios
// ============================================================================

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'financial_crisis_2008',
    name: '2008 Financial Crisis',
    description: 'Simulates the 2008 global financial crisis with severe market decline',
    marketMove: -0.55,
    volatilitySpike: 3.0,
    correlationBreakdown: true,
    liquidityCrisis: true,
    duration: 90,
  },
  {
    id: 'covid_crash_2020',
    name: '2020 COVID Crash',
    description: 'Simulates the March 2020 COVID-19 market crash',
    marketMove: -0.35,
    volatilitySpike: 4.0,
    correlationBreakdown: false,
    liquidityCrisis: true,
    duration: 30,
  },
  {
    id: 'terra_luna_2022',
    name: '2022 Terra/Luna Collapse',
    description: 'Simulates the Terra/Luna ecosystem collapse',
    marketMove: -0.70,
    volatilitySpike: 5.0,
    correlationBreakdown: true,
    liquidityCrisis: true,
    duration: 14,
  },
  {
    id: 'ftx_collapse_2022',
    name: '2022 FTX Collapse',
    description: 'Simulates the FTX exchange collapse and contagion',
    marketMove: -0.25,
    volatilitySpike: 2.5,
    correlationBreakdown: false,
    liquidityCrisis: true,
    duration: 7,
  },
  {
    id: 'black_swan',
    name: 'Black Swan Event',
    description: 'Extreme tail risk scenario',
    marketMove: -0.80,
    volatilitySpike: 10.0,
    correlationBreakdown: true,
    liquidityCrisis: true,
    duration: 3,
  },
  {
    id: 'moderate_correction',
    name: 'Moderate Market Correction',
    description: 'Standard 20% market correction',
    marketMove: -0.20,
    volatilitySpike: 1.5,
    correlationBreakdown: false,
    liquidityCrisis: false,
    duration: 60,
  },
];

// ============================================================================
// Default Risk Agent Implementation
// ============================================================================

export class DefaultRiskAgent implements RiskAgent {
  private _config: RiskAgentConfig;
  private readonly alerts: RiskAlert[] = [];
  private readonly eventCallbacks: HedgeFundEventCallback[] = [];
  private latestMetrics?: RiskMetricsSnapshot;
  private historicalReturns: number[] = [];

  constructor(config?: Partial<RiskAgentConfig>) {
    this._config = {
      enabled: true,
      varConfig: {
        confidenceLevel: 0.99,
        timeHorizon: 1,
        method: 'historical',
        lookbackPeriod: 252,
        simulations: 10000,
      },
      limits: {
        maxDrawdown: 0.15,
        maxDailyLoss: 0.05,
        maxWeeklyLoss: 0.10,
        maxLeverage: 2.0,
        maxConcentration: 0.25,
        maxVaR: 0.10,
        minLiquidity: 0.10,
      },
      stressTestConfig: {
        enabled: true,
        scenarios: ['financial_crisis_2008', 'covid_crash_2020', 'terra_luna_2022'],
        frequency: 'daily',
      },
      hedgingConfig: {
        enabled: true,
        strategies: [],
        rehedgeFrequency: 'daily',
        maxHedgeCost: 0.01,
      },
      alertConfig: {
        varBreachPercent: 0.80,
        drawdownWarning: 0.10,
        concentrationWarning: 0.20,
        channels: ['email', 'telegram'],
      },
      parameters: {},
      ...config,
    };
  }

  get config(): RiskAgentConfig {
    return { ...this._config };
  }

  async configure(config: Partial<RiskAgentConfig>): Promise<void> {
    // Deep merge to preserve nested config objects
    if (config.varConfig) {
      this._config.varConfig = { ...this._config.varConfig, ...config.varConfig };
    }
    if (config.limits) {
      this._config.limits = { ...this._config.limits, ...config.limits };
    }
    if (config.stressTestConfig) {
      this._config.stressTestConfig = { ...this._config.stressTestConfig, ...config.stressTestConfig };
    }
    if (config.hedgingConfig) {
      this._config.hedgingConfig = { ...this._config.hedgingConfig, ...config.hedgingConfig };
    }
    if (config.alertConfig) {
      this._config.alertConfig = { ...this._config.alertConfig, ...config.alertConfig };
    }
    if (config.enabled !== undefined) {
      this._config.enabled = config.enabled;
    }
    if (config.parameters) {
      this._config.parameters = { ...this._config.parameters, ...config.parameters };
    }
    this.emitEvent('info', 'risk_agent', 'Risk agent configuration updated');
  }

  async setLimits(limits: Partial<RiskLimits>): Promise<void> {
    this._config.limits = { ...this._config.limits, ...limits };
    this.emitEvent('info', 'risk_agent', 'Risk limits updated', { limits });
  }

  calculateVaR(positions: PortfolioPosition[], portfolioValue: number): VaRResult {
    const { method, confidenceLevel, timeHorizon, simulations } = this._config.varConfig;

    let var95: number;
    let var99: number;
    let cvar: number;

    switch (method) {
      case 'parametric':
        ({ var95, var99, cvar } = this.calculateParametricVaR(positions, portfolioValue, confidenceLevel));
        break;
      case 'monte_carlo':
        ({ var95, var99, cvar } = this.calculateMonteCarloVaR(positions, portfolioValue, simulations || 10000));
        break;
      case 'historical':
      default:
        ({ var95, var99, cvar } = this.calculateHistoricalVaR(this.historicalReturns, portfolioValue));
        break;
    }

    // Scale by time horizon (square root of time)
    const scaleFactor = Math.sqrt(timeHorizon);
    var95 *= scaleFactor;
    var99 *= scaleFactor;
    cvar *= scaleFactor;

    return {
      var95,
      var99,
      cvar,
      method,
      confidence: confidenceLevel,
      timeHorizon,
    };
  }

  calculateMetrics(positions: PortfolioPosition[], portfolioValue: number): RiskMetricsSnapshot {
    const varResult = this.calculateVaR(positions, portfolioValue);

    // Convert VaR from absolute value to percentage of portfolio
    const var95 = portfolioValue > 0 ? varResult.var95 / portfolioValue : 0;
    const var99 = portfolioValue > 0 ? varResult.var99 / portfolioValue : 0;
    const cvar = portfolioValue > 0 ? varResult.cvar / portfolioValue : 0;

    // Calculate concentration (largest position weight)
    const concentration = positions.length > 0
      ? Math.max(...positions.map(p => p.weight))
      : 0;

    // Calculate leverage
    const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.marketValue), 0);
    const leverage = portfolioValue > 0 ? totalExposure / portfolioValue : 0;

    // Calculate liquidity (estimate based on position sizes)
    const liquidAssets = positions.filter(p => p.marketValue < 100000); // Simplified
    const liquidity = positions.length > 0
      ? liquidAssets.reduce((sum, p) => sum + p.marketValue, 0) / portfolioValue
      : 1;

    // Calculate Sharpe and other ratios
    const returns = this.historicalReturns;
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const volatility = this.calculateVolatility(returns);
    const downsideVolatility = this.calculateDownsideVolatility(returns);
    const riskFreeRate = 0.05 / 365; // Daily risk-free rate

    const sharpe = volatility > 0 ? (avgReturn - riskFreeRate) * Math.sqrt(365) / volatility : 0;
    const sortino = downsideVolatility > 0 ? (avgReturn - riskFreeRate) * Math.sqrt(365) / downsideVolatility : 0;

    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const currentDrawdown = this.calculateCurrentDrawdown(returns);

    const metrics: RiskMetricsSnapshot = {
      timestamp: new Date(),
      var95,  // Now as percentage
      var99,  // Now as percentage
      cvar,   // Now as percentage
      beta: 1.0, // Would require benchmark data
      sharpe,
      sortino,
      maxDrawdown,
      currentDrawdown,
      leverage,
      concentration,
      liquidity,
    };

    this.latestMetrics = metrics;

    return metrics;
  }

  getLatestMetrics(): RiskMetricsSnapshot | undefined {
    return this.latestMetrics ? { ...this.latestMetrics } : undefined;
  }

  checkLimits(metrics: RiskMetricsSnapshot): LimitCheckResult {
    const violations: LimitViolation[] = [];
    const warnings: LimitWarning[] = [];
    const limits = this._config.limits;
    const alertConfig = this._config.alertConfig;

    // Check VaR limit
    if (metrics.var99 > limits.maxVaR) {
      violations.push({
        limit: 'maxVaR',
        currentValue: metrics.var99,
        threshold: limits.maxVaR,
        severity: 'critical',
        message: `VaR (${(metrics.var99 * 100).toFixed(2)}%) exceeds limit (${(limits.maxVaR * 100).toFixed(2)}%)`,
      });
      this.createAlert('var_breach', 'critical', 'VaR', metrics.var99, limits.maxVaR);
    } else if (metrics.var99 > limits.maxVaR * alertConfig.varBreachPercent) {
      warnings.push({
        limit: 'maxVaR',
        currentValue: metrics.var99,
        threshold: limits.maxVaR,
        percentUsed: metrics.var99 / limits.maxVaR,
        message: `VaR approaching limit (${(metrics.var99 / limits.maxVaR * 100).toFixed(1)}% utilized)`,
      });
    }

    // Check drawdown limits
    if (metrics.currentDrawdown > limits.maxDrawdown) {
      violations.push({
        limit: 'maxDrawdown',
        currentValue: metrics.currentDrawdown,
        threshold: limits.maxDrawdown,
        severity: 'critical',
        message: `Drawdown (${(metrics.currentDrawdown * 100).toFixed(2)}%) exceeds limit (${(limits.maxDrawdown * 100).toFixed(2)}%)`,
      });
      this.createAlert('drawdown_limit', 'critical', 'Drawdown', metrics.currentDrawdown, limits.maxDrawdown);
    } else if (metrics.currentDrawdown > alertConfig.drawdownWarning) {
      warnings.push({
        limit: 'drawdownWarning',
        currentValue: metrics.currentDrawdown,
        threshold: alertConfig.drawdownWarning,
        percentUsed: metrics.currentDrawdown / limits.maxDrawdown,
        message: `Drawdown warning (${(metrics.currentDrawdown * 100).toFixed(2)}%)`,
      });
      this.createAlert('drawdown_warning', 'warning', 'Drawdown', metrics.currentDrawdown, alertConfig.drawdownWarning);
    }

    // Check leverage
    if (metrics.leverage > limits.maxLeverage) {
      violations.push({
        limit: 'maxLeverage',
        currentValue: metrics.leverage,
        threshold: limits.maxLeverage,
        severity: 'critical',
        message: `Leverage (${metrics.leverage.toFixed(2)}x) exceeds limit (${limits.maxLeverage}x)`,
      });
      this.createAlert('leverage_warning', 'critical', 'Leverage', metrics.leverage, limits.maxLeverage);
    }

    // Check concentration
    if (metrics.concentration > limits.maxConcentration) {
      violations.push({
        limit: 'maxConcentration',
        currentValue: metrics.concentration,
        threshold: limits.maxConcentration,
        severity: 'warning',
        message: `Concentration (${(metrics.concentration * 100).toFixed(2)}%) exceeds limit (${(limits.maxConcentration * 100).toFixed(2)}%)`,
      });
      this.createAlert('concentration_warning', 'warning', 'Concentration', metrics.concentration, limits.maxConcentration);
    }

    // Check liquidity
    if (metrics.liquidity < limits.minLiquidity) {
      violations.push({
        limit: 'minLiquidity',
        currentValue: metrics.liquidity,
        threshold: limits.minLiquidity,
        severity: 'warning',
        message: `Liquidity (${(metrics.liquidity * 100).toFixed(2)}%) below minimum (${(limits.minLiquidity * 100).toFixed(2)}%)`,
      });
      this.createAlert('liquidity_warning', 'warning', 'Liquidity', metrics.liquidity, limits.minLiquidity);
    }

    const passed = violations.length === 0;

    if (!passed) {
      this.emitEvent('warning', 'risk_agent', `Risk limit violations detected: ${violations.length}`, {
        violations,
      });
    }

    return { passed, violations, warnings };
  }

  checkTransactionImpact(request: TransactionRiskRequest): TransactionImpactResult {
    const { side, asset, quantity, estimatedPrice, currentPositions, portfolioValue } = request;

    // Calculate new positions after transaction
    const newPositions = [...currentPositions];
    const existingPositionIndex = newPositions.findIndex(p => p.asset === asset);
    const transactionValue = quantity * estimatedPrice;

    if (existingPositionIndex >= 0) {
      const existing = newPositions[existingPositionIndex];
      const newQuantity = side === 'buy'
        ? existing.quantity + quantity
        : existing.quantity - quantity;

      if (newQuantity <= 0) {
        newPositions.splice(existingPositionIndex, 1);
      } else {
        newPositions[existingPositionIndex] = {
          ...existing,
          quantity: newQuantity,
          marketValue: newQuantity * estimatedPrice,
          weight: (newQuantity * estimatedPrice) / portfolioValue,
        };
      }
    } else if (side === 'buy') {
      newPositions.push({
        id: `new_${asset}`,
        asset,
        quantity,
        averageCost: estimatedPrice,
        currentPrice: estimatedPrice,
        marketValue: transactionValue,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: transactionValue / portfolioValue,
        openedAt: new Date(),
        metadata: {},
      });
    }

    // Calculate new metrics
    const currentMetrics = this.calculateMetrics(currentPositions, portfolioValue);
    const newMetrics = this.calculateMetrics(newPositions, portfolioValue);

    const violations: string[] = [];
    const warnings: string[] = [];

    // Check if new metrics violate limits
    if (newMetrics.var99 > this._config.limits.maxVaR) {
      violations.push(`Transaction would breach VaR limit (${(newMetrics.var99 * 100).toFixed(2)}% > ${(this._config.limits.maxVaR * 100).toFixed(2)}%)`);
    }

    if (newMetrics.concentration > this._config.limits.maxConcentration) {
      violations.push(`Transaction would breach concentration limit (${(newMetrics.concentration * 100).toFixed(2)}% > ${(this._config.limits.maxConcentration * 100).toFixed(2)}%)`);
    }

    if (newMetrics.leverage > this._config.limits.maxLeverage) {
      violations.push(`Transaction would breach leverage limit (${newMetrics.leverage.toFixed(2)}x > ${this._config.limits.maxLeverage}x)`);
    }

    // Check for warnings
    if (newMetrics.var99 > this._config.limits.maxVaR * 0.8) {
      warnings.push(`Transaction would bring VaR to ${(newMetrics.var99 / this._config.limits.maxVaR * 100).toFixed(1)}% of limit`);
    }

    return {
      approved: violations.length === 0,
      newVaR: newMetrics.var99,
      varChange: newMetrics.var99 - currentMetrics.var99,
      newConcentration: newMetrics.concentration,
      concentrationChange: newMetrics.concentration - currentMetrics.concentration,
      newLeverage: newMetrics.leverage,
      leverageChange: newMetrics.leverage - currentMetrics.leverage,
      violations,
      warnings,
    };
  }

  runStressTest(scenario: StressScenario, positions: PortfolioPosition[]): StressTestResult {
    const portfolioValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const positionImpacts: PositionImpact[] = [];

    let totalStressedValue = 0;

    for (const position of positions) {
      // Apply market move with some asset-specific adjustment
      const assetBeta = 1.0 + (Math.random() * 0.4 - 0.2); // Simulate different betas
      const assetMove = scenario.marketMove * assetBeta;

      // Apply correlation breakdown effect
      const correlationEffect = scenario.correlationBreakdown
        ? 1 + (Math.random() * 0.2) // Additional 0-20% impact
        : 1;

      const stressedValue = position.marketValue * (1 + assetMove * correlationEffect);
      const loss = position.marketValue - stressedValue;

      positionImpacts.push({
        asset: position.asset,
        currentValue: position.marketValue,
        stressedValue,
        loss,
        lossPercent: loss / position.marketValue,
      });

      totalStressedValue += stressedValue;
    }

    const portfolioLoss = portfolioValue - totalStressedValue;
    const worstPosition = positionImpacts.reduce(
      (worst, current) => current.loss > worst.loss ? current : worst,
      positionImpacts[0]
    );

    // Generate recommendations
    const recommendations: string[] = [];

    if (portfolioLoss / portfolioValue > 0.15) {
      recommendations.push('Consider reducing overall portfolio exposure');
    }

    if (worstPosition && worstPosition.lossPercent > 0.3) {
      recommendations.push(`Consider reducing position in ${worstPosition.asset} or adding hedges`);
    }

    if (scenario.liquidityCrisis) {
      recommendations.push('Maintain higher cash reserves for liquidity events');
    }

    // Calculate stressed risk metrics
    const stressedMetrics: RiskMetricsSnapshot = {
      timestamp: new Date(),
      var95: portfolioLoss * 0.8,
      var99: portfolioLoss,
      cvar: portfolioLoss * 1.2,
      beta: 1.0,
      sharpe: 0,
      sortino: 0,
      maxDrawdown: portfolioLoss / portfolioValue,
      currentDrawdown: portfolioLoss / portfolioValue,
      leverage: 1.0,
      concentration: 0,
      liquidity: scenario.liquidityCrisis ? 0.05 : 0.20,
    };

    const result: StressTestResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      timestamp: new Date(),
      portfolioLoss,
      portfolioLossPercent: portfolioLoss / portfolioValue,
      worstAsset: worstPosition?.asset || '',
      worstAssetLoss: worstPosition?.loss || 0,
      positionImpacts,
      riskMetrics: stressedMetrics,
      recommendations,
    };

    this.emitEvent('info', 'risk_agent', `Stress test completed: ${scenario.name}`, {
      scenarioId: scenario.id,
      portfolioLossPercent: result.portfolioLossPercent,
    });

    return result;
  }

  runAllStressTests(positions: PortfolioPosition[]): StressTestResult[] {
    const scenarios = this.getStressScenarios();
    return scenarios.map(scenario => this.runStressTest(scenario, positions));
  }

  getStressScenarios(): StressScenario[] {
    const enabledIds = this._config.stressTestConfig.scenarios;
    const builtIn = STRESS_SCENARIOS.filter(s => enabledIds.includes(s.id));
    const custom = this._config.stressTestConfig.customScenarios || [];
    return [...builtIn, ...custom];
  }

  checkHedgingNeeded(metrics: RiskMetricsSnapshot): HedgingRecommendation | undefined {
    if (!this._config.hedgingConfig.enabled) {
      return undefined;
    }

    for (const strategy of this._config.hedgingConfig.strategies) {
      const trigger = strategy.trigger;
      let metricValue: number;

      switch (trigger.metric) {
        case 'var':
          metricValue = metrics.var99;
          break;
        case 'volatility':
          metricValue = this.calculateVolatility(this.historicalReturns);
          break;
        case 'drawdown':
          metricValue = metrics.currentDrawdown;
          break;
        case 'beta':
          metricValue = metrics.beta;
          break;
        case 'correlation':
          metricValue = 0.5; // Would need correlation calculation
          break;
        default:
          continue;
      }

      const triggered = trigger.operator === 'above'
        ? metricValue > trigger.threshold
        : metricValue < trigger.threshold;

      if (triggered) {
        const urgency = metricValue > trigger.threshold * 1.2 ? 'high'
          : metricValue > trigger.threshold * 1.1 ? 'medium'
          : 'low';

        return {
          needed: true,
          reason: `${trigger.metric} (${metricValue.toFixed(4)}) ${trigger.operator} threshold (${trigger.threshold})`,
          strategy,
          urgency,
          estimatedCost: this._config.hedgingConfig.maxHedgeCost * 0.5,
        };
      }
    }

    return undefined;
  }

  calculateHedgePositions(strategy: HedgingStrategy, portfolioValue: number): HedgePosition[] {
    const positions: HedgePosition[] = [];
    const targetNotional = portfolioValue * strategy.targetExposure;

    for (const instrument of strategy.instruments) {
      positions.push({
        asset: instrument,
        side: 'sell', // Hedges are typically short
        quantity: targetNotional / 100, // Simplified
        notional: targetNotional / strategy.instruments.length,
        purpose: `${strategy.type} hedge`,
      });
    }

    return positions;
  }

  getAlerts(filters?: AlertFilters): RiskAlert[] {
    let filtered = [...this.alerts];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(a => filters.type!.includes(a.type));
      }
      if (filters.severity) {
        filtered = filtered.filter(a => filters.severity!.includes(a.severity));
      }
      if (filters.acknowledged !== undefined) {
        filtered = filtered.filter(a => a.acknowledged === filters.acknowledged);
      }
      if (filters.fromDate) {
        filtered = filtered.filter(a => a.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        filtered = filtered.filter(a => a.createdAt <= filters.toDate!);
      }
    }

    return filtered;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    return true;
  }

  clearAlerts(): void {
    this.alerts.length = 0;
  }

  onEvent(callback: HedgeFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // State Management
  // ============================================================================

  addHistoricalReturn(dailyReturn: number): void {
    this.historicalReturns.push(dailyReturn);

    // Keep last N days based on lookback period
    const maxDays = this._config.varConfig.lookbackPeriod;
    if (this.historicalReturns.length > maxDays) {
      this.historicalReturns.shift();
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateHistoricalVaR(
    returns: number[],
    portfolioValue: number
  ): { var95: number; var99: number; cvar: number } {
    if (returns.length < 30) {
      // Not enough data, use parametric estimate
      return {
        var95: portfolioValue * 0.02,
        var99: portfolioValue * 0.03,
        cvar: portfolioValue * 0.04,
      };
    }

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const n = sortedReturns.length;

    const index95 = Math.floor(n * 0.05);
    const index99 = Math.floor(n * 0.01);

    const var95 = -sortedReturns[index95] * portfolioValue;
    const var99 = -sortedReturns[index99] * portfolioValue;

    // CVaR is average of losses beyond VaR
    const tailReturns = sortedReturns.slice(0, index99 + 1);
    const avgTailReturn = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
    const cvar = -avgTailReturn * portfolioValue;

    return { var95, var99, cvar };
  }

  private calculateParametricVaR(
    _positions: PortfolioPosition[],
    portfolioValue: number,
    _confidenceLevel: number
  ): { var95: number; var99: number; cvar: number } {
    // Simplified parametric VaR assuming normal distribution
    const volatility = this.calculateVolatility(this.historicalReturns);
    const zScore95 = 1.645;
    const zScore99 = 2.326;

    const var95 = portfolioValue * volatility * zScore95;
    const var99 = portfolioValue * volatility * zScore99;
    const cvar = var99 * 1.15; // Approximate CVaR

    return { var95, var99, cvar };
  }

  private calculateMonteCarloVaR(
    _positions: PortfolioPosition[],
    portfolioValue: number,
    simulations: number
  ): { var95: number; var99: number; cvar: number } {
    // Simplified Monte Carlo simulation
    const volatility = this.calculateVolatility(this.historicalReturns) || 0.02;
    const simulatedReturns: number[] = [];

    for (let i = 0; i < simulations; i++) {
      // Generate random normal return
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const simulatedReturn = z * volatility;
      simulatedReturns.push(simulatedReturn);
    }

    return this.calculateHistoricalVaR(simulatedReturns, portfolioValue);
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0.02; // Default 2% daily vol

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (returns.length - 1);

    return Math.sqrt(variance);
  }

  private calculateDownsideVolatility(returns: number[], threshold = 0): number {
    const downsideReturns = returns.filter(r => r < threshold);
    if (downsideReturns.length < 2) return 0.02;

    const squaredDiffs = downsideReturns.map(r => Math.pow(r - threshold, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / downsideReturns.length;

    return Math.sqrt(variance);
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 1;
    let maxDrawdown = 0;
    let cumReturn = 1;

    for (const ret of returns) {
      cumReturn *= (1 + ret);
      if (cumReturn > peak) {
        peak = cumReturn;
      }
      const drawdown = (peak - cumReturn) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateCurrentDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;

    let peak = 1;
    let cumReturn = 1;

    for (const ret of returns) {
      cumReturn *= (1 + ret);
      if (cumReturn > peak) {
        peak = cumReturn;
      }
    }

    return (peak - cumReturn) / peak;
  }

  private createAlert(
    type: RiskAlertType,
    severity: 'info' | 'warning' | 'critical',
    metric: string,
    currentValue: number,
    threshold: number
  ): void {
    const alert: RiskAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: '',
      type,
      severity,
      metric,
      currentValue,
      threshold,
      message: `${metric}: ${currentValue.toFixed(4)} ${type.includes('min') ? 'below' : 'exceeds'} threshold ${threshold.toFixed(4)}`,
      acknowledged: false,
      createdAt: new Date(),
      metadata: {},
    };

    this.alerts.push(alert);

    this.emitEvent(
      severity === 'critical' ? 'critical' : 'warning',
      'risk_agent',
      alert.message,
      { alertId: alert.id, type, metric, currentValue, threshold }
    );
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: HedgeFundEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fundId: '',
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

export function createRiskAgent(config?: Partial<RiskAgentConfig>): DefaultRiskAgent {
  return new DefaultRiskAgent(config);
}
