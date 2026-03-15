/**
 * TONAIAgent - Risk Evaluation Integration
 *
 * Evaluates strategy backtests against Risk Engine v1 criteria:
 *   - Drawdown scenario analysis
 *   - Asset concentration risk evaluation
 *   - Exposure volatility measurement
 *   - Risk grading (A/B/C/D/F)
 *   - Actionable risk recommendations
 *
 * Designed to integrate with the systemic-risk module for cross-strategy
 * risk analysis and portfolio-level monitoring.
 */

import {
  AssetSymbol,
  BacktestId,
  ConcentrationRisk,
  DrawdownAnalysis,
  DrawdownScenario,
  DrawdownScenarioResult,
  EquityCurvePoint,
  ExposureVolatility,
  PerformanceReport,
  RiskEvaluationResult,
  RiskGrade,
  RiskRecommendation,
  RiskThresholds,
  SimulatedOrder,
} from './types';

// ============================================================================
// Predefined Drawdown Scenarios (analogous to systemic-risk stress scenarios)
// ============================================================================

export const DEFAULT_DRAWDOWN_SCENARIOS: DrawdownScenario[] = [
  {
    name: 'Market Correction',
    description: 'Standard market correction of 20%',
    maxDrawdownThreshold: 20,
    durationDays: 30,
    triggerConditions: ['Market-wide decline', 'Risk-off sentiment'],
  },
  {
    name: 'Bear Market',
    description: 'Sustained bear market with 40% drawdown',
    maxDrawdownThreshold: 40,
    durationDays: 180,
    triggerConditions: ['Prolonged declining trend', 'Macro deterioration'],
  },
  {
    name: 'Crypto Crash',
    description: 'Severe crypto market crash of 60%+',
    maxDrawdownThreshold: 60,
    durationDays: 90,
    triggerConditions: ['Black swan event', 'Regulatory shock', 'Liquidity crisis'],
  },
  {
    name: 'Flash Crash',
    description: 'Rapid intraday price drop of 30%',
    maxDrawdownThreshold: 30,
    durationDays: 1,
    triggerConditions: ['Sudden liquidity drain', 'Large market sell order'],
  },
];

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  maxAcceptableDrawdown: 30,
  minAcceptableSharpe: 0.5,
  maxConcentrationPercent: 50,
  minWinRate: 30,
};

// ============================================================================
// Risk Evaluator
// ============================================================================

export class BacktestRiskEvaluator {
  constructor(
    private readonly thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
    private readonly scenarios: DrawdownScenario[] = DEFAULT_DRAWDOWN_SCENARIOS
  ) {}

  /**
   * Evaluate a completed backtest and return a comprehensive risk assessment
   */
  evaluate(
    backtestId: BacktestId,
    performance: PerformanceReport,
    orders: SimulatedOrder[],
    equityCurve: EquityCurvePoint[]
  ): RiskEvaluationResult {
    const concentrationRisks = this.evaluateConcentrationRisk(orders, equityCurve);
    const exposureVolatility = this.evaluateExposureVolatility(orders, equityCurve, performance);
    const drawdownAnalysis = this.evaluateDrawdownScenarios(performance, equityCurve);
    const recommendations = this.generateRecommendations(
      performance,
      concentrationRisks,
      exposureVolatility,
      drawdownAnalysis
    );

    const { riskScore, failureReasons } = this.scoreRisk(
      performance,
      concentrationRisks,
      drawdownAnalysis
    );

    const riskGrade = this.calculateRiskGrade(riskScore);
    const passed = failureReasons.length === 0;

    return {
      backtestId,
      evaluatedAt: new Date(),
      overallRiskScore: riskScore,
      riskGrade,
      drawdownAnalysis,
      concentrationRisks,
      exposureVolatility,
      recommendations,
      passed,
      failureReasons,
    };
  }

  // ============================================================================
  // Concentration Risk
  // ============================================================================

  private evaluateConcentrationRisk(
    orders: SimulatedOrder[],
    equityCurve: EquityCurvePoint[]
  ): ConcentrationRisk[] {
    if (equityCurve.length === 0) return [];

    // Build asset exposure from the last equity curve point
    const lastPoint = equityCurve[equityCurve.length - 1];
    const totalEquity = lastPoint.equity;
    if (totalEquity <= 0) return [];

    const risks: ConcentrationRisk[] = [];
    const allAssets = new Set<AssetSymbol>();

    // Collect unique assets from orders
    for (const order of orders) {
      allAssets.add(order.asset);
    }

    for (const asset of allAssets) {
      // Approximate exposure from position data in last equity point
      const positionAmount = lastPoint.positions[asset] ?? 0;

      // Estimate asset price from last sell orders
      const lastSell = [...orders]
        .reverse()
        .find((o) => o.asset === asset && o.side === 'sell');
      const lastBuy = [...orders]
        .reverse()
        .find((o) => o.asset === asset && o.side === 'buy');
      const estimatedPrice = lastSell?.executedPrice ?? lastBuy?.executedPrice ?? 1;

      const positionValue = positionAmount * estimatedPrice;
      const exposurePercent = (positionValue / totalEquity) * 100;
      const maxAllowed = this.thresholds.maxConcentrationPercent;
      const riskScore = Math.min(100, (exposurePercent / maxAllowed) * 100);

      risks.push({
        asset,
        currentExposure: exposurePercent,
        maxAllowedExposure: maxAllowed,
        riskScore,
        alert: exposurePercent > maxAllowed,
      });
    }

    return risks.sort((a, b) => b.currentExposure - a.currentExposure);
  }

  // ============================================================================
  // Exposure Volatility
  // ============================================================================

  private evaluateExposureVolatility(
    orders: SimulatedOrder[],
    equityCurve: EquityCurvePoint[],
    performance: PerformanceReport
  ): ExposureVolatility[] {
    if (equityCurve.length === 0 || orders.length === 0) return [];

    const allAssets = new Set<AssetSymbol>(orders.map((o) => o.asset));
    const totalEquity = equityCurve[equityCurve.length - 1].equity;
    const results: ExposureVolatility[] = [];

    for (const asset of allAssets) {
      // Extract asset-specific equity contributions over time
      const assetEquitySeries: number[] = equityCurve.map((pt) => {
        const amount = pt.positions[asset] ?? 0;
        return amount * 1; // Price approximation using position value directly
      });

      // Calculate asset volatility from equity contributions
      const assetReturns: number[] = [];
      for (let i = 1; i < assetEquitySeries.length; i++) {
        const prev = assetEquitySeries[i - 1];
        const curr = assetEquitySeries[i];
        if (prev > 0) {
          assetReturns.push((curr - prev) / prev);
        }
      }

      const vol30d = this.calculateVolatility(assetReturns.slice(-30));
      const lastPoint = equityCurve[equityCurve.length - 1];
      const positionAmt = lastPoint.positions[asset] ?? 0;
      const exposure = totalEquity > 0 ? (positionAmt / totalEquity) * 100 : 0;
      const volAdjustedExposure = exposure * (1 + vol30d / 100);

      // Risk contribution (simplified: exposure * correlation with portfolio)
      const riskContribution = exposure * (vol30d / Math.max(performance.risk.volatility, 1));

      results.push({
        asset,
        exposurePercent: exposure,
        volatility30d: vol30d,
        volatilityAdjustedExposure: volAdjustedExposure,
        riskContribution: Math.min(riskContribution, 100),
      });
    }

    return results.sort((a, b) => b.riskContribution - a.riskContribution);
  }

  // ============================================================================
  // Drawdown Scenarios
  // ============================================================================

  private evaluateDrawdownScenarios(
    performance: PerformanceReport,
    equityCurve: EquityCurvePoint[]
  ): DrawdownAnalysis {
    const maxObservedDrawdown = performance.risk.maxDrawdown;

    const scenarioResults: DrawdownScenarioResult[] = this.scenarios.map((scenario) => {
      // Strategy survives if its max drawdown is less than the scenario threshold
      // AND its Sharpe ratio is positive
      const strategyWouldSurvive =
        maxObservedDrawdown < scenario.maxDrawdownThreshold &&
        performance.risk.sharpeRatio > 0;

      // Estimate recovery time based on historical drawdown duration
      const recoveryTimeDays = performance.risk.maxDrawdownDuration > 0
        ? performance.risk.maxDrawdownDuration * (scenario.maxDrawdownThreshold / Math.max(maxObservedDrawdown, 1))
        : scenario.durationDays ?? 30;

      return {
        scenario,
        strategyWouldSurvive,
        estimatedImpact: Math.min(scenario.maxDrawdownThreshold, maxObservedDrawdown * 1.5),
        recoveryTimeDays: Math.round(recoveryTimeDays),
      };
    });

    // Worst case estimate from Monte Carlo or max observed * stress factor
    const worstCaseEstimate = Math.min(maxObservedDrawdown * 2, 100);

    return {
      maxObservedDrawdown,
      drawdownScenarios: scenarioResults,
      worstCaseEstimate,
      timeToRecoveryAvg:
        scenarioResults.length > 0
          ? scenarioResults.reduce((sum, s) => sum + s.recoveryTimeDays, 0) /
            scenarioResults.length
          : 0,
    };
  }

  // ============================================================================
  // Risk Scoring & Grading
  // ============================================================================

  private scoreRisk(
    performance: PerformanceReport,
    concentrationRisks: ConcentrationRisk[],
    drawdownAnalysis: DrawdownAnalysis
  ): { riskScore: number; failureReasons: string[] } {
    const failureReasons: string[] = [];
    let penaltyPoints = 0;

    // 1. Drawdown check (max 40 points penalty)
    if (performance.risk.maxDrawdown > this.thresholds.maxAcceptableDrawdown) {
      const excess = performance.risk.maxDrawdown - this.thresholds.maxAcceptableDrawdown;
      const penalty = Math.min(40, excess * 1.5);
      penaltyPoints += penalty;
      failureReasons.push(
        `Max drawdown ${performance.risk.maxDrawdown.toFixed(1)}% exceeds threshold ${this.thresholds.maxAcceptableDrawdown}%`
      );
    }

    // 2. Sharpe ratio check (max 30 points penalty)
    if (performance.risk.sharpeRatio < this.thresholds.minAcceptableSharpe) {
      const deficit = this.thresholds.minAcceptableSharpe - performance.risk.sharpeRatio;
      const penalty = Math.min(30, deficit * 30);
      penaltyPoints += penalty;
      failureReasons.push(
        `Sharpe ratio ${performance.risk.sharpeRatio.toFixed(2)} below threshold ${this.thresholds.minAcceptableSharpe}`
      );
    }

    // 3. Concentration risk (max 20 points penalty)
    const highConcentrationCount = concentrationRisks.filter((r) => r.alert).length;
    if (highConcentrationCount > 0) {
      const penalty = Math.min(20, highConcentrationCount * 7);
      penaltyPoints += penalty;
      failureReasons.push(
        `${highConcentrationCount} asset(s) exceed concentration limit of ${this.thresholds.maxConcentrationPercent}%`
      );
    }

    // 4. Win rate check (max 10 points penalty)
    if (
      performance.trades.totalTrades > 10 &&
      performance.trades.winRate < this.thresholds.minWinRate
    ) {
      const deficit = this.thresholds.minWinRate - performance.trades.winRate;
      const penalty = Math.min(10, deficit * 0.5);
      penaltyPoints += penalty;
      failureReasons.push(
        `Win rate ${performance.trades.winRate.toFixed(1)}% below minimum ${this.thresholds.minWinRate}%`
      );
    }

    // 5. Scenario survival (informational only, no hard failure)
    const survivedScenarios = drawdownAnalysis.drawdownScenarios.filter(
      (s) => !s.strategyWouldSurvive
    ).length;
    if (survivedScenarios > 2) {
      penaltyPoints += 5;
    }

    const riskScore = Math.max(0, 100 - penaltyPoints);
    return { riskScore, failureReasons };
  }

  private calculateRiskGrade(score: number): RiskGrade {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  private generateRecommendations(
    performance: PerformanceReport,
    concentrationRisks: ConcentrationRisk[],
    exposureVolatility: ExposureVolatility[],
    drawdownAnalysis: DrawdownAnalysis
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // Drawdown recommendations
    if (performance.risk.maxDrawdown > this.thresholds.maxAcceptableDrawdown) {
      recommendations.push({
        type: 'stop_loss',
        severity: 'critical',
        description: `Maximum drawdown of ${performance.risk.maxDrawdown.toFixed(1)}% is too high`,
        suggestedAction: 'Add or tighten stop-loss controls to limit drawdown to under 20%',
      });
    } else if (performance.risk.maxDrawdown > this.thresholds.maxAcceptableDrawdown * 0.7) {
      recommendations.push({
        type: 'stop_loss',
        severity: 'warning',
        description: `Drawdown of ${performance.risk.maxDrawdown.toFixed(1)}% is approaching the threshold`,
        suggestedAction: 'Consider adding trailing stop-loss to protect profits',
      });
    }

    // Position sizing recommendations
    if (performance.risk.volatility > 50) {
      recommendations.push({
        type: 'position_sizing',
        severity: 'warning',
        description: `Strategy volatility of ${performance.risk.volatility.toFixed(1)}% is high`,
        suggestedAction: 'Reduce position sizes or trade lower-volatility assets',
      });
    }

    // Concentration recommendations
    for (const risk of concentrationRisks) {
      if (risk.alert) {
        recommendations.push({
          type: 'diversification',
          severity: 'warning',
          description: `Asset ${risk.asset} concentration at ${risk.currentExposure.toFixed(1)}% exceeds ${risk.maxAllowedExposure}%`,
          suggestedAction: `Cap ${risk.asset} allocation to ${risk.maxAllowedExposure}% of portfolio`,
        });
      }
    }

    // Exposure volatility recommendations
    const highVolExposure = exposureVolatility.filter((e) => e.volatility30d > 60);
    if (highVolExposure.length > 0) {
      recommendations.push({
        type: 'exposure_limit',
        severity: 'info',
        description: `${highVolExposure.length} asset(s) have 30-day volatility above 60%`,
        suggestedAction: 'Reduce allocation to high-volatility assets or hedge exposure',
      });
    }

    // Scenario survival recommendations
    const failedScenarios = drawdownAnalysis.drawdownScenarios.filter(
      (s) => !s.strategyWouldSurvive
    );
    if (failedScenarios.length > 0) {
      recommendations.push({
        type: 'stop_loss',
        severity: 'info',
        description: `Strategy may not survive: ${failedScenarios.map((s) => s.scenario.name).join(', ')}`,
        suggestedAction: 'Add circuit breaker rules to halt trading during extreme market conditions',
      });
    }

    // Sharpe ratio recommendations
    if (performance.risk.sharpeRatio < 0.5) {
      recommendations.push({
        type: 'position_sizing',
        severity: 'warning',
        description: `Low Sharpe ratio of ${performance.risk.sharpeRatio.toFixed(2)}`,
        suggestedAction: 'Optimize strategy parameters or consider a different strategy approach',
      });
    }

    return recommendations;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createBacktestRiskEvaluator(
  thresholds?: Partial<RiskThresholds>,
  scenarios?: DrawdownScenario[]
): BacktestRiskEvaluator {
  const mergedThresholds = thresholds
    ? { ...DEFAULT_RISK_THRESHOLDS, ...thresholds }
    : DEFAULT_RISK_THRESHOLDS;

  return new BacktestRiskEvaluator(mergedThresholds, scenarios ?? DEFAULT_DRAWDOWN_SCENARIOS);
}
