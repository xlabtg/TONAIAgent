/**
 * TONAIAgent - Portfolio Analytics Dashboard Types
 *
 * Comprehensive type definitions for the Portfolio Analytics Dashboard,
 * providing real-time insights into investment performance, risk exposure,
 * and capital allocation for investors and fund managers.
 */

// ============================================================================
// Core Enumerations and Primitive Types
// ============================================================================

export type AnalyticsPeriod =
  | '1d'
  | '7d'
  | '30d'
  | '90d'
  | '365d'
  | 'all_time'
  | 'custom';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertType =
  | 'drawdown_threshold'
  | 'volatility_spike'
  | 'concentration_risk'
  | 'leverage_limit'
  | 'stop_loss_triggered'
  | 'performance_degradation'
  | 'allocation_drift'
  | 'circuit_breaker'
  | 'emergency_stop'
  | 'daily_loss_limit';

export type TradeActivityType =
  | 'trade_executed'
  | 'position_opened'
  | 'position_closed'
  | 'rebalancing'
  | 'allocation_update'
  | 'strategy_activated'
  | 'strategy_deactivated'
  | 'emergency_stop';

export type ChartType =
  | 'equity_curve'
  | 'daily_returns'
  | 'cumulative_returns'
  | 'drawdown'
  | 'allocation_pie'
  | 'allocation_timeline'
  | 'strategy_comparison'
  | 'risk_heatmap';

export type ReportFormat = 'json' | 'csv' | 'summary';

export type AllocationStatus = 'active' | 'paused' | 'rebalancing' | 'closed';

// ============================================================================
// Portfolio Overview Types
// ============================================================================

export interface PortfolioOverview {
  agentId: string;
  portfolioId: string;
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalFeesPaid: number;
  dayChange: number;
  dayChangePercent: number;
  openPositionCount: number;
  strategyCount: number;
  capitalUtilization: number;
  lastUpdated: Date;
}

// ============================================================================
// Performance Visualization Types
// ============================================================================

export interface EquityCurvePoint {
  timestamp: Date;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface DailyReturn {
  date: Date;
  return: number;
  absoluteReturn: number;
  tradeCount: number;
}

export interface CumulativeReturn {
  date: Date;
  cumulativeReturn: number;
  benchmarkReturn?: number;
}

export interface BenchmarkComparison {
  benchmark: string;
  benchmarkReturn: number;
  portfolioReturn: number;
  outperformance: number;
  trackingError: number;
  informationRatio: number;
  beta?: number;
  alpha?: number;
  correlation?: number;
}

export interface PerformanceVisualization {
  agentId: string;
  period: AnalyticsPeriod;
  equityCurve: EquityCurvePoint[];
  dailyReturns: DailyReturn[];
  cumulativeReturns: CumulativeReturn[];
  benchmarkComparisons: BenchmarkComparison[];
  generatedAt: Date;
}

// ============================================================================
// Strategy Allocation Types
// ============================================================================

export interface StrategyAllocation {
  strategyId: string;
  strategyName: string;
  allocatedCapital: number;
  allocatedPercent: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  contributionToReturn: number;
  status: AllocationStatus;
  lastRebalanced: Date;
}

export interface AllocationTimelinePoint {
  timestamp: Date;
  allocations: Array<{
    strategyId: string;
    strategyName: string;
    percent: number;
    value: number;
  }>;
}

export interface AllocationBreakdown {
  agentId: string;
  totalAllocated: number;
  cashReserve: number;
  strategies: StrategyAllocation[];
  timeline: AllocationTimelinePoint[];
  lastUpdated: Date;
}

// ============================================================================
// Risk Monitoring Types
// ============================================================================

export interface RiskAlert {
  id: string;
  agentId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  thresholdValue: number;
  triggered: boolean;
  triggeredAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface RiskMetrics {
  volatility: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  maxDrawdownDuration: number;
  avgDrawdown: number;
  var95: number;
  var99: number;
  cvar95: number;
  beta?: number;
  alpha?: number;
  correlation?: number;
}

export interface ExposureMetrics {
  totalExposure: number;
  netExposure: number;
  grossLeverage: number;
  netLeverage: number;
  topConcentrations: Array<{
    asset: string;
    exposurePercent: number;
    value: number;
  }>;
}

export interface RiskMonitoringPanel {
  agentId: string;
  riskMetrics: RiskMetrics;
  exposureMetrics: ExposureMetrics;
  activeAlerts: RiskAlert[];
  alertHistory: RiskAlert[];
  riskScore: number;
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastAssessed: Date;
}

// ============================================================================
// Strategy Performance Comparison Types
// ============================================================================

export interface StrategyPerformanceMetrics {
  strategyId: string;
  strategyName: string;
  roi: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturn: number;
  volatility: number;
  period: AnalyticsPeriod;
  lastUpdated: Date;
}

export interface StrategyComparisonResult {
  agentId: string;
  period: AnalyticsPeriod;
  strategies: StrategyPerformanceMetrics[];
  bestByROI: string;
  bestBySharpe: string;
  bestByWinRate: string;
  lowestDrawdown: string;
  generatedAt: Date;
}

// ============================================================================
// Trade Activity History Types
// ============================================================================

export interface TradeActivity {
  id: string;
  agentId: string;
  strategyId?: string;
  strategyName?: string;
  type: TradeActivityType;
  symbol?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  price?: number;
  value?: number;
  pnl?: number;
  fees?: number;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface RebalancingEvent {
  id: string;
  agentId: string;
  reason: string;
  previousAllocations: StrategyAllocation[];
  newAllocations: StrategyAllocation[];
  executedTrades: TradeActivity[];
  totalValueBefore: number;
  totalValueAfter: number;
  timestamp: Date;
}

export interface TradeActivityHistory {
  agentId: string;
  period: AnalyticsPeriod;
  activities: TradeActivity[];
  rebalancingEvents: RebalancingEvent[];
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  lastUpdated: Date;
}

// ============================================================================
// Dashboard Metrics (Unified View)
// ============================================================================

export interface DashboardMetrics {
  agentId: string;
  period: AnalyticsPeriod;
  overview: PortfolioOverview;
  performance: PerformanceVisualization;
  allocation: AllocationBreakdown;
  risk: RiskMonitoringPanel;
  strategyComparison: StrategyComparisonResult;
  tradeHistory: TradeActivityHistory;
  generatedAt: Date;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartData {
  type: ChartType;
  title: string;
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Report Types
// ============================================================================

export interface PortfolioReport {
  id: string;
  agentId: string;
  period: AnalyticsPeriod;
  format: ReportFormat;
  title: string;
  summary: string;
  metrics: DashboardMetrics;
  charts: ChartData[];
  generatedAt: Date;
}

// ============================================================================
// Portfolio Analytics Event Types
// ============================================================================

export type PortfolioAnalyticsEventType =
  | 'metrics_updated'
  | 'alert_triggered'
  | 'alert_resolved'
  | 'rebalancing_detected'
  | 'performance_milestone'
  | 'risk_threshold_breached'
  | 'report_generated'
  | 'allocation_changed';

export interface PortfolioAnalyticsEvent {
  id: string;
  type: PortfolioAnalyticsEventType;
  agentId: string;
  timestamp: Date;
  severity: AlertSeverity;
  message: string;
  data: Record<string, unknown>;
}

export type PortfolioAnalyticsEventCallback = (event: PortfolioAnalyticsEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface PortfolioAnalyticsConfig {
  /** Risk-free rate for Sharpe ratio calculations (annual) */
  riskFreeRate: number;
  /** Benchmarks for comparison */
  benchmarks: string[];
  /** Trading days per year */
  tradingDaysPerYear: number;
  /** Maximum history days to retain */
  maxHistoryDays: number;
  /** Drawdown alert threshold percentage */
  drawdownAlertThreshold: number;
  /** Volatility spike alert threshold (daily %) */
  volatilityAlertThreshold: number;
  /** Concentration alert threshold percentage */
  concentrationAlertThreshold: number;
  /** Max leverage limit */
  maxLeverageLimit: number;
  /** Daily loss limit percentage */
  dailyLossLimitPercent: number;
  /** Whether to emit events on each update */
  emitOnUpdate: boolean;
  /** Cache duration in minutes for computed metrics */
  cacheDurationMinutes: number;
}

export const DEFAULT_PORTFOLIO_ANALYTICS_CONFIG: PortfolioAnalyticsConfig = {
  riskFreeRate: 0.05,
  benchmarks: ['TON', 'BTC', 'ETH'],
  tradingDaysPerYear: 365,
  maxHistoryDays: 365,
  drawdownAlertThreshold: 10,
  volatilityAlertThreshold: 5,
  concentrationAlertThreshold: 30,
  maxLeverageLimit: 3,
  dailyLossLimitPercent: 5,
  emitOnUpdate: true,
  cacheDurationMinutes: 5,
};
