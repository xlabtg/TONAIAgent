/**
 * TONAIAgent - Portfolio Analytics Dashboard
 *
 * Primary interface for investors and fund managers providing real-time
 * insights into investment performance, risk exposure, and capital allocation.
 *
 * Integrates with:
 *   - Live Trading Infrastructure (portfolio state, execution results)
 *   - Strategy Engine (strategy performance, allocation)
 *   - Risk Engine v1 (risk checks, circuit breakers, drawdown tracking)
 *   - Strategy Marketplace (agent analytics, benchmarks)
 *
 * Dashboard Components:
 *   1. Portfolio Overview — total value, PnL, return %, capital allocation summary
 *   2. Performance Visualization — equity curve, daily/cumulative returns, benchmark comparisons
 *   3. Strategy Allocation Breakdown — pie charts, timelines, contribution to returns
 *   4. Risk Monitoring Panel — volatility, drawdown, leverage, concentration, alerts
 *   5. Strategy Performance Comparison — ROI, Sharpe, win rate, drawdown per strategy
 *   6. Trade & Activity History — executed trades, rebalancing events, allocation updates
 */

export * from './types';
export {
  DefaultPortfolioDataModel,
  createPortfolioDataModel,
  type PortfolioDataModel,
  type PortfolioDataModelConfig,
} from './data-model';
export {
  DefaultAnalyticsEngine,
  createAnalyticsEngine,
  type AnalyticsEngine,
} from './analytics-engine';
export {
  DefaultRiskMonitor,
  createRiskMonitor,
  type RiskMonitor,
  type RiskMonitorConfig,
} from './risk-monitor';
export {
  DefaultStrategyComparison,
  createStrategyComparison,
  type StrategyComparison,
  type StrategyTradeRecord,
} from './strategy-comparison';
export {
  DefaultTradeHistoryManager,
  createTradeHistoryManager,
  type TradeHistoryManager,
  type TradeHistoryFilter,
  type TradeHistorySummary,
} from './trade-history';

import {
  PortfolioAnalyticsConfig,
  DEFAULT_PORTFOLIO_ANALYTICS_CONFIG,
  PortfolioOverview,
  AllocationBreakdown,
  StrategyAllocation,
  DashboardMetrics,
  RiskMonitoringPanel,
  StrategyComparisonResult,
  TradeActivity,
  TradeActivityHistory,
  EquityCurvePoint,
  ChartData,
  ChartType,
  PortfolioReport,
  ReportFormat,
  AnalyticsPeriod,
  ExposureMetrics,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
} from './types';
import {
  DefaultPortfolioDataModel,
  createPortfolioDataModel,
} from './data-model';
import {
  DefaultAnalyticsEngine,
  createAnalyticsEngine,
} from './analytics-engine';
import { DefaultRiskMonitor, createRiskMonitor } from './risk-monitor';
import {
  DefaultStrategyComparison,
  createStrategyComparison,
  StrategyTradeRecord,
} from './strategy-comparison';
import {
  DefaultTradeHistoryManager,
  createTradeHistoryManager,
  TradeHistoryFilter,
  TradeHistorySummary,
} from './trade-history';

// ============================================================================
// Dashboard Health & Metrics Types
// ============================================================================

export interface PortfolioAnalyticsDashboardHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    dataModel: boolean;
    analyticsEngine: boolean;
    riskMonitor: boolean;
    strategyComparison: boolean;
    tradeHistory: boolean;
  };
  lastCheck: Date;
}

export interface PortfolioAnalyticsDashboardMetrics {
  totalAgentsTracked: number;
  totalEventsEmitted: number;
  lastUpdated: Date;
}

// ============================================================================
// Portfolio Analytics Dashboard Interface
// ============================================================================

export interface PortfolioAnalyticsDashboard {
  readonly config: PortfolioAnalyticsConfig;
  readonly dataModel: DefaultPortfolioDataModel;
  readonly analyticsEngine: DefaultAnalyticsEngine;
  readonly riskMonitor: DefaultRiskMonitor;
  readonly strategyComparison: DefaultStrategyComparison;
  readonly tradeHistory: DefaultTradeHistoryManager;

  // Portfolio Overview
  getPortfolioOverview(agentId: string): PortfolioOverview;

  // Performance Visualization
  getEquityCurve(agentId: string, period: AnalyticsPeriod): EquityCurvePoint[];
  getChartData(type: ChartType, agentId: string, period: AnalyticsPeriod): ChartData;

  // Strategy Allocation
  getAllocationBreakdown(agentId: string): AllocationBreakdown;
  updateStrategyAllocation(agentId: string, allocation: StrategyAllocation): void;

  // Risk Monitoring
  getRiskPanel(agentId: string): RiskMonitoringPanel;
  updateExposureMetrics(agentId: string, exposure: Partial<ExposureMetrics>): void;
  evaluateRiskAlerts(agentId: string): void;

  // Strategy Comparison
  compareStrategies(agentId: string, period: AnalyticsPeriod): StrategyComparisonResult;

  // Trade & Activity History
  recordTrade(
    agentId: string,
    trade: Omit<TradeActivity, 'id' | 'timestamp'>
  ): TradeActivity;
  getTradeHistory(
    agentId: string,
    filter?: TradeHistoryFilter
  ): TradeActivityHistory;
  getTradeHistorySummary(
    agentId: string,
    period: AnalyticsPeriod
  ): TradeHistorySummary;

  // Full Dashboard
  getDashboardMetrics(
    agentId: string,
    period: AnalyticsPeriod
  ): Promise<DashboardMetrics>;

  // Portfolio equity updates
  recordEquityPoint(agentId: string, point: EquityCurvePoint): void;
  updatePortfolioValue(agentId: string, totalValue: number, totalPnl: number): void;

  // Strategy trade recording (for comparison engine)
  recordStrategyTrade(
    agentId: string,
    strategyId: string,
    trade: StrategyTradeRecord
  ): void;

  // Reports
  generateReport(
    agentId: string,
    period: AnalyticsPeriod,
    format: ReportFormat
  ): PortfolioReport;

  // Health & Metrics
  getHealth(): PortfolioAnalyticsDashboardHealth;
  getDashboardOperationalMetrics(): PortfolioAnalyticsDashboardMetrics;

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Default Portfolio Analytics Dashboard Implementation
// ============================================================================

export class DefaultPortfolioAnalyticsDashboard
  implements PortfolioAnalyticsDashboard
{
  readonly config: PortfolioAnalyticsConfig;
  readonly dataModel: DefaultPortfolioDataModel;
  readonly analyticsEngine: DefaultAnalyticsEngine;
  readonly riskMonitor: DefaultRiskMonitor;
  readonly strategyComparison: DefaultStrategyComparison;
  readonly tradeHistory: DefaultTradeHistoryManager;

  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];
  private eventsEmitted = 0;
  private readonly trackedAgents = new Set<string>();
  private reportCounter = 0;

  constructor(config: Partial<PortfolioAnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_PORTFOLIO_ANALYTICS_CONFIG, ...config };

    // Initialize sub-components
    this.dataModel = createPortfolioDataModel(this.config);
    this.analyticsEngine = createAnalyticsEngine(this.config, this.dataModel);
    this.riskMonitor = createRiskMonitor(this.config, this.analyticsEngine, this.dataModel);
    this.strategyComparison = createStrategyComparison(
      this.config,
      this.dataModel,
      this.analyticsEngine
    );
    this.tradeHistory = createTradeHistoryManager(this.config, this.dataModel);

    // Forward events from sub-components
    this.wireEventForwarding();
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Portfolio Overview
  // ============================================================================

  getPortfolioOverview(agentId: string): PortfolioOverview {
    this.trackedAgents.add(agentId);
    return this.dataModel.getPortfolioOverview(agentId);
  }

  updatePortfolioValue(agentId: string, totalValue: number, totalPnl: number): void {
    this.trackedAgents.add(agentId);
    this.dataModel.updatePortfolioValue(agentId, totalValue, totalPnl);
  }

  // ============================================================================
  // Performance Visualization
  // ============================================================================

  getEquityCurve(agentId: string, period: AnalyticsPeriod): EquityCurvePoint[] {
    return this.dataModel.getEquityCurve(agentId, period);
  }

  recordEquityPoint(agentId: string, point: EquityCurvePoint): void {
    this.trackedAgents.add(agentId);
    this.dataModel.recordEquityPoint(agentId, point);
  }

  getChartData(type: ChartType, agentId: string, period: AnalyticsPeriod): ChartData {
    return this.analyticsEngine.generateChartData(type, agentId, period);
  }

  // ============================================================================
  // Strategy Allocation
  // ============================================================================

  getAllocationBreakdown(agentId: string): AllocationBreakdown {
    return this.dataModel.getAllocationBreakdown(agentId);
  }

  updateStrategyAllocation(agentId: string, allocation: StrategyAllocation): void {
    this.trackedAgents.add(agentId);
    this.dataModel.updateStrategyAllocation(agentId, allocation);
    this.dataModel.recordAllocationSnapshot(agentId);
  }

  // ============================================================================
  // Risk Monitoring
  // ============================================================================

  getRiskPanel(agentId: string): RiskMonitoringPanel {
    return this.riskMonitor.getRiskPanel(agentId);
  }

  updateExposureMetrics(agentId: string, exposure: Partial<ExposureMetrics>): void {
    this.riskMonitor.updateExposureMetrics(agentId, exposure);
  }

  evaluateRiskAlerts(agentId: string): void {
    this.riskMonitor.evaluateRiskAlerts(agentId);
  }

  // ============================================================================
  // Strategy Comparison
  // ============================================================================

  compareStrategies(agentId: string, period: AnalyticsPeriod): StrategyComparisonResult {
    return this.strategyComparison.compareStrategies(agentId, period);
  }

  recordStrategyTrade(
    agentId: string,
    strategyId: string,
    trade: StrategyTradeRecord
  ): void {
    this.strategyComparison.recordStrategyTrade(agentId, strategyId, trade);
  }

  // ============================================================================
  // Trade & Activity History
  // ============================================================================

  recordTrade(
    agentId: string,
    trade: Omit<TradeActivity, 'id' | 'timestamp'>
  ): TradeActivity {
    this.trackedAgents.add(agentId);
    return this.tradeHistory.recordTrade(agentId, trade);
  }

  getTradeHistory(
    agentId: string,
    filter: TradeHistoryFilter = {}
  ): TradeActivityHistory {
    return this.tradeHistory.getHistory(agentId, filter);
  }

  getTradeHistorySummary(
    agentId: string,
    period: AnalyticsPeriod
  ): TradeHistorySummary {
    return this.tradeHistory.getSummary(agentId, period);
  }

  // ============================================================================
  // Full Dashboard Metrics
  // ============================================================================

  async getDashboardMetrics(
    agentId: string,
    period: AnalyticsPeriod
  ): Promise<DashboardMetrics> {
    this.trackedAgents.add(agentId);

    // Build base metrics from analytics engine
    const baseMetrics = await this.analyticsEngine.buildDashboardMetrics(agentId, period);

    // Override risk panel with full risk monitor data
    const riskPanel = this.riskMonitor.getRiskPanel(agentId);

    // Override strategy comparison with full comparison engine data
    const strategyComparisonResult = this.strategyComparison.compareStrategies(
      agentId,
      period
    );

    return {
      ...baseMetrics,
      risk: riskPanel,
      strategyComparison: strategyComparisonResult,
    };
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  generateReport(
    agentId: string,
    period: AnalyticsPeriod,
    format: ReportFormat
  ): PortfolioReport {
    const overview = this.getPortfolioOverview(agentId);
    const allocation = this.getAllocationBreakdown(agentId);
    const riskPanel = this.getRiskPanel(agentId);
    const strategyComp = this.compareStrategies(agentId, period);
    const tradeHistoryData = this.tradeHistory.getHistory(agentId, { period });

    const performance = this.analyticsEngine.computePerformanceVisualization(agentId, period);

    const metrics: DashboardMetrics = {
      agentId,
      period,
      overview,
      performance,
      allocation,
      risk: riskPanel,
      strategyComparison: strategyComp,
      tradeHistory: tradeHistoryData,
      generatedAt: new Date(),
    };

    // Build chart data for the report
    const charts: ChartData[] = [
      this.analyticsEngine.generateChartData('equity_curve', agentId, period),
      this.analyticsEngine.generateChartData('daily_returns', agentId, period),
      this.analyticsEngine.generateChartData('cumulative_returns', agentId, period),
      this.analyticsEngine.generateChartData('drawdown', agentId, period),
      this.analyticsEngine.generateChartData('allocation_pie', agentId, period),
    ];

    const summary = this.buildReportSummary(metrics);

    const report: PortfolioReport = {
      id: `report_${++this.reportCounter}_${Date.now()}`,
      agentId,
      period,
      format,
      title: `Portfolio Analytics Report — ${agentId}`,
      summary,
      metrics,
      charts,
      generatedAt: new Date(),
    };

    this.emitEvent({
      type: 'report_generated',
      agentId,
      severity: 'info',
      message: `Portfolio report generated for period: ${period}`,
      data: { reportId: report.id, format, period },
    });

    return report;
  }

  // ============================================================================
  // Health & Operational Metrics
  // ============================================================================

  getHealth(): PortfolioAnalyticsDashboardHealth {
    const components = {
      dataModel: true,
      analyticsEngine: true,
      riskMonitor: true,
      strategyComparison: true,
      tradeHistory: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: PortfolioAnalyticsDashboardHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= Math.ceil(totalCount / 2)) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
    };
  }

  getDashboardOperationalMetrics(): PortfolioAnalyticsDashboardMetrics {
    return {
      totalAgentsTracked: this.trackedAgents.size,
      totalEventsEmitted: this.eventsEmitted,
      lastUpdated: new Date(),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private wireEventForwarding(): void {
    const forward = (event: PortfolioAnalyticsEvent): void => {
      this.eventsEmitted++;
      for (const cb of this.eventCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.dataModel.onEvent(forward);
    this.analyticsEngine.onEvent(forward);
    this.riskMonitor.onEvent(forward);
    this.strategyComparison.onEvent(forward);
    this.tradeHistory.onEvent(forward);
  }

  private buildReportSummary(metrics: DashboardMetrics): string {
    const { overview, risk } = metrics;
    const pnlDirection = overview.totalPnl >= 0 ? 'up' : 'down';
    const pnlAbs = Math.abs(overview.totalPnl).toFixed(2);
    const pnlPct = Math.abs(overview.totalPnlPercent).toFixed(2);

    return (
      `Portfolio ${pnlDirection} ${pnlAbs} TON (${pnlPct}%). ` +
      `Total value: ${overview.totalValue.toFixed(2)} TON. ` +
      `${overview.strategyCount} active strategies. ` +
      `Risk grade: ${risk.riskGrade} (score: ${risk.riskScore.toFixed(0)}). ` +
      `${risk.activeAlerts.length} active alerts.`
    );
  }

  private emitEvent(
    event: Omit<PortfolioAnalyticsEvent, 'id' | 'timestamp'>
  ): void {
    const fullEvent: PortfolioAnalyticsEvent = {
      id: generateId('evt'),
      timestamp: new Date(),
      ...event,
    };

    this.eventsEmitted++;
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioAnalyticsDashboard(
  config?: Partial<PortfolioAnalyticsConfig>
): DefaultPortfolioAnalyticsDashboard {
  return new DefaultPortfolioAnalyticsDashboard(config);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
