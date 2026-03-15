/**
 * TONAIAgent - Backtest Report Generator
 *
 * Generates structured backtest reports including:
 *   - Performance summary (Capital Start/End, Return, Max Drawdown, Sharpe)
 *   - Full performance metrics
 *   - Risk evaluation results
 *   - Trade history
 *   - Equity curve
 *   - Monte Carlo analysis (optional)
 *   - Marketplace metrics (for Strategy Marketplace integration)
 *   - Optimization hints
 */

import {
  BacktestReport,
  BacktestRunResult,
  MarketplaceMetrics,
  MonteCarloAnalysis,
  OptimizationHint,
  PerformanceReport,
  ReportId,
  ReportSummary,
  RiskEvaluationResult,
} from './types';

// ============================================================================
// Report Generator
// ============================================================================

export class BacktestReportGenerator {
  /**
   * Generate a full backtest report from a completed run result
   */
  generateReport(result: BacktestRunResult): BacktestReport {
    if (!result.performance || !result.riskEvaluation) {
      throw new Error(
        'Cannot generate report: backtest result is missing performance or risk evaluation data'
      );
    }

    const reportId = this.generateReportId();
    const summary = this.buildSummary(result.performance, result.riskEvaluation);
    const marketplaceMetrics = this.calculateMarketplaceMetrics(
      result.performance,
      result.riskEvaluation
    );
    const optimizationHints = this.generateOptimizationHints(
      result.performance,
      result.riskEvaluation
    );

    return {
      id: reportId,
      backtestId: result.id,
      generatedAt: new Date(),
      strategyName: result.strategyName,
      version: '1.0.0',
      summary,
      performance: result.performance,
      riskEvaluation: result.riskEvaluation,
      tradeHistory: result.orders,
      equityCurve: result.equityCurve,
      monteCarlo: result.performance.summary.totalReturn !== 0
        ? undefined // Monte Carlo is generated separately if requested
        : undefined,
      optimizationHints,
      marketplaceMetrics,
    };
  }

  /**
   * Generate a report with Monte Carlo analysis attached
   */
  attachMonteCarlo(report: BacktestReport, monteCarlo: MonteCarloAnalysis): BacktestReport {
    return { ...report, monteCarlo };
  }

  /**
   * Format the report summary as a human-readable string
   * (as specified in the issue)
   *
   * Example: "Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85"
   */
  formatSummaryString(report: BacktestReport): string {
    const s = report.summary;
    const returnSign = s.totalReturnPercent >= 0 ? '+' : '';
    const drawdownSign = s.maxDrawdownPercent > 0 ? '-' : '';

    return [
      `Capital Start: ${this.formatCurrency(s.capitalStart)}`,
      `Capital End: ${this.formatCurrency(s.capitalEnd)}`,
      `Return: ${returnSign}${s.totalReturnPercent.toFixed(1)}%`,
      `Max Drawdown: ${drawdownSign}${Math.abs(s.maxDrawdownPercent).toFixed(1)}%`,
      `Sharpe Ratio: ${s.sharpeRatio.toFixed(2)}`,
      `Win Rate: ${s.winRate.toFixed(1)}%`,
      `Total Trades: ${s.totalTrades}`,
      `Risk Grade: ${s.riskGrade}`,
    ].join(' / ');
  }

  /**
   * Format the full report as a readable text block
   */
  formatDetailedReport(report: BacktestReport): string {
    const p = report.performance;
    const r = report.riskEvaluation;
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push(`BACKTEST REPORT: ${report.strategyName}`);
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Report ID: ${report.id}`);
    lines.push('='.repeat(60));

    lines.push('');
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(this.formatSummaryString(report));

    lines.push('');
    lines.push('PERFORMANCE METRICS');
    lines.push('-'.repeat(40));
    lines.push(`Period: ${p.period.start.toDateString()} – ${p.period.end.toDateString()} (${p.period.durationDays.toFixed(0)} days)`);
    lines.push(`Total Return:        ${p.summary.totalReturn.toFixed(2)}%`);
    lines.push(`Annualized Return:   ${p.summary.annualizedReturn.toFixed(2)}%`);
    lines.push(`Absolute Profit:     ${this.formatCurrency(p.summary.absoluteProfit)}`);
    lines.push(`Sharpe Ratio:        ${p.risk.sharpeRatio.toFixed(3)}`);
    lines.push(`Sortino Ratio:       ${p.risk.sortinoRatio.toFixed(3)}`);
    lines.push(`Calmar Ratio:        ${p.risk.calmarRatio.toFixed(3)}`);
    lines.push(`Volatility (ann.):   ${p.risk.volatility.toFixed(2)}%`);
    lines.push(`Max Drawdown:        ${p.risk.maxDrawdown.toFixed(2)}%`);
    lines.push(`VaR 95%:             ${p.risk.var95.toFixed(2)}%`);
    lines.push(`CVaR 95%:            ${p.risk.cvar95.toFixed(2)}%`);

    lines.push('');
    lines.push('TRADE STATISTICS');
    lines.push('-'.repeat(40));
    lines.push(`Total Trades:        ${p.trades.totalTrades}`);
    lines.push(`Win Rate:            ${p.trades.winRate.toFixed(1)}%`);
    lines.push(`Winning Trades:      ${p.trades.winningTrades}`);
    lines.push(`Losing Trades:       ${p.trades.losingTrades}`);
    lines.push(`Average Win:         ${this.formatCurrency(p.trades.averageWin)}`);
    lines.push(`Average Loss:        ${this.formatCurrency(p.trades.averageLoss)}`);
    lines.push(`Profit Factor:       ${p.trades.profitFactor.toFixed(2)}`);
    lines.push(`Expectancy:          ${this.formatCurrency(p.trades.expectancy)}`);
    lines.push(`Total Fees Paid:     ${this.formatCurrency(p.trades.totalFeesPaid)}`);
    lines.push(`Avg Slippage:        ${p.trades.avgSlippage.toFixed(4)}%`);

    lines.push('');
    lines.push('RISK EVALUATION');
    lines.push('-'.repeat(40));
    lines.push(`Risk Grade:          ${r.riskGrade}`);
    lines.push(`Risk Score:          ${r.overallRiskScore.toFixed(0)}/100`);
    lines.push(`Evaluation Status:   ${r.passed ? 'PASSED' : 'FAILED'}`);

    if (!r.passed) {
      lines.push('');
      lines.push('Failure Reasons:');
      for (const reason of r.failureReasons) {
        lines.push(`  ✗ ${reason}`);
      }
    }

    if (r.recommendations.length > 0) {
      lines.push('');
      lines.push('Recommendations:');
      for (const rec of r.recommendations) {
        const icon = rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : 'ℹ️';
        lines.push(`  ${icon} [${rec.type.toUpperCase()}] ${rec.description}`);
        lines.push(`     → ${rec.suggestedAction}`);
      }
    }

    if (report.monteCarlo) {
      const mc = report.monteCarlo;
      lines.push('');
      lines.push('MONTE CARLO ANALYSIS');
      lines.push('-'.repeat(40));
      lines.push(`Simulations:         ${mc.simulations.toLocaleString()}`);
      lines.push(`Expected Return:     ${mc.expectedReturn.toFixed(2)}%`);
      lines.push(`Probability Profit:  ${mc.probabilityOfProfit.toFixed(1)}%`);
      lines.push(`Worst Case:          ${mc.worstCase.toFixed(2)}%`);
      lines.push(`Best Case:           ${mc.bestCase.toFixed(2)}%`);
      lines.push(`VaR 95%:             ${mc.var95.toFixed(2)}%`);
    }

    if (report.marketplaceMetrics) {
      const mm = report.marketplaceMetrics;
      lines.push('');
      lines.push('MARKETPLACE METRICS');
      lines.push('-'.repeat(40));
      lines.push(`Strategy Rating:     ${mm.strategyRating}/5`);
      lines.push(`Risk Category:       ${mm.riskCategory}`);
      lines.push(`Beginner Suitable:   ${mm.suitableForBeginners ? 'Yes' : 'No'}`);
      lines.push(`Min Capital:         ${this.formatCurrency(mm.minimumCapital)}`);
      lines.push(`Backtest Score:      ${mm.backtestScore}/100`);
      lines.push(`Consistency Score:   ${mm.consistencyScore}/100`);
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Convert report to a JSON-serializable object
   * (safe for API responses and storage)
   */
  toJSON(report: BacktestReport): Record<string, unknown> {
    return {
      ...report,
      generatedAt: report.generatedAt.toISOString(),
      performance: {
        ...report.performance,
        period: {
          ...report.performance.period,
          start: report.performance.period.start.toISOString(),
          end: report.performance.period.end.toISOString(),
        },
        equityCurve: report.equityCurve.map((p) => ({
          ...p,
          timestamp: p.timestamp.toISOString(),
        })),
        drawdownCurve: report.performance.drawdownCurve.map((p) => ({
          ...p,
          timestamp: p.timestamp.toISOString(),
        })),
      },
      riskEvaluation: {
        ...report.riskEvaluation,
        evaluatedAt: report.riskEvaluation.evaluatedAt.toISOString(),
      },
      tradeHistory: report.tradeHistory.map((o) => ({
        ...o,
        timestamp: o.timestamp.toISOString(),
      })),
      equityCurve: report.equityCurve.map((p) => ({
        ...p,
        timestamp: p.timestamp.toISOString(),
      })),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildSummary(
    performance: PerformanceReport,
    riskEvaluation: RiskEvaluationResult
  ): ReportSummary {
    const startDate = performance.period.start;
    const endDate = performance.period.end;
    const backtestPeriod = `${this.formatMonthYear(startDate)} – ${this.formatMonthYear(endDate)}`;

    return {
      capitalStart: performance.summary.capitalStart,
      capitalEnd: performance.summary.capitalEnd,
      totalReturnPercent: performance.summary.totalReturn,
      maxDrawdownPercent: performance.risk.maxDrawdown,
      sharpeRatio: performance.risk.sharpeRatio,
      totalTrades: performance.trades.totalTrades,
      winRate: performance.trades.winRate,
      backtestPeriod,
      dataGranularity: '1h', // Will be set from config in the orchestrator
      riskGrade: riskEvaluation.riskGrade,
    };
  }

  private calculateMarketplaceMetrics(
    performance: PerformanceReport,
    riskEvaluation: RiskEvaluationResult
  ): MarketplaceMetrics {
    // Composite backtest score: weighted combination of key metrics
    const returnScore = Math.min(100, Math.max(0, performance.summary.totalReturn + 50));
    const sharpeScore = Math.min(100, Math.max(0, performance.risk.sharpeRatio * 20));
    const drawdownScore = Math.max(0, 100 - performance.risk.maxDrawdown * 2);
    const winRateScore = performance.trades.winRate;

    const backtestScore = Math.round(
      returnScore * 0.3 +
      sharpeScore * 0.3 +
      drawdownScore * 0.25 +
      winRateScore * 0.15
    );

    // Consistency: based on low volatility of monthly returns
    const monthlyReturns = performance.monthlyReturns.map((m) => m.return);
    const stdDev =
      monthlyReturns.length > 1
        ? Math.sqrt(
            monthlyReturns.reduce((sum, r) => {
              const mean =
                monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
              return sum + Math.pow(r - mean, 2);
            }, 0) / monthlyReturns.length
          )
        : 0;
    const consistencyScore = Math.round(Math.max(0, 100 - stdDev * 5));

    // Risk category
    const riskCategory = this.categorizeRisk(performance, riskEvaluation);

    // Strategy rating (1-5 stars)
    const strategyRating = Math.min(5, Math.max(1, Math.round(riskEvaluation.overallRiskScore / 20)));

    // Minimum capital: roughly 10x the average trade value
    const avgTradeValue =
      performance.trades.totalTrades > 0
        ? performance.summary.capitalStart / Math.max(performance.trades.totalTrades, 1)
        : performance.summary.capitalStart;
    const minimumCapital = Math.max(100, avgTradeValue * 10);

    return {
      strategyRating,
      riskCategory,
      suitableForBeginners:
        riskCategory === 'conservative' && performance.risk.maxDrawdown < 15,
      minimumCapital,
      backtestScore: Math.min(100, backtestScore),
      consistencyScore: Math.min(100, consistencyScore),
    };
  }

  private categorizeRisk(
    performance: PerformanceReport,
    riskEvaluation: RiskEvaluationResult
  ): MarketplaceMetrics['riskCategory'] {
    const score = riskEvaluation.overallRiskScore;
    const drawdown = performance.risk.maxDrawdown;

    if (score >= 80 && drawdown < 15) return 'conservative';
    if (score >= 65 && drawdown < 25) return 'moderate';
    if (score >= 45 && drawdown < 40) return 'aggressive';
    return 'speculative';
  }

  private generateOptimizationHints(
    performance: PerformanceReport,
    riskEvaluation: RiskEvaluationResult
  ): OptimizationHint[] {
    const hints: OptimizationHint[] = [];

    // Hint: Improve position sizing if win rate is low
    if (performance.trades.winRate < 40 && performance.trades.totalTrades >= 10) {
      hints.push({
        parameterName: 'positionSize',
        currentValue: 'auto',
        suggestedValue: 'reduce by 20-30%',
        expectedImprovement: 5,
        confidence: 0.6,
      });
    }

    // Hint: Add stop-loss if drawdown is high
    if (performance.risk.maxDrawdown > 20) {
      hints.push({
        parameterName: 'stopLossPercent',
        currentValue: 'none',
        suggestedValue: (performance.risk.maxDrawdown * 0.5).toFixed(0) + '%',
        expectedImprovement: 15,
        confidence: 0.75,
      });
    }

    // Hint: Consider different timeframe if Sharpe is low
    if (performance.risk.sharpeRatio < 0.5) {
      hints.push({
        parameterName: 'dataGranularity',
        currentValue: '1h',
        suggestedValue: '4h',
        expectedImprovement: 10,
        confidence: 0.5,
      });
    }

    return hints;
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatMonthYear(date: Date): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  private generateReportId(): ReportId {
    return `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createReportGenerator(): BacktestReportGenerator {
  return new BacktestReportGenerator();
}
