/**
 * TONAIAgent - Strategy Backtesting Framework Type Definitions
 *
 * Core types for the standalone backtesting framework that enables
 * historical strategy validation before live capital deployment.
 *
 * Issue #155: Strategy Backtesting Framework
 */

// ============================================================================
// Primitive Type Aliases
// ============================================================================

export type AssetSymbol = string;
export type BacktestId = string;
export type ReportId = string;
export type SessionId = string;

// ============================================================================
// Historical Market Data Types
// ============================================================================

export type DataGranularity =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w';

export interface OHLCVCandle {
  timestamp: Date;
  asset: AssetSymbol;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volumeUsd?: number;
}

export interface TradeRecord {
  timestamp: Date;
  asset: AssetSymbol;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  tradeId?: string;
}

export interface OrderBookSnapshot {
  timestamp: Date;
  asset: AssetSymbol;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  midPrice: number;
  spread: number;
}

export interface VolatilityIndicator {
  timestamp: Date;
  asset: AssetSymbol;
  historicalVolatility: number;    // annualized, percentage
  atr: number;                     // Average True Range
  bollingerBandWidth: number;      // Bollinger Band Width
  vixEquivalent?: number;          // TON market VIX-equivalent
}

export interface MarketDataSnapshot {
  timestamp: Date;
  candle: OHLCVCandle;
  orderBook?: OrderBookSnapshot;
  volatility?: VolatilityIndicator;
  tradeHistory?: TradeRecord[];
}

// ============================================================================
// Data Source & Provider Types
// ============================================================================

export type DataSourceType =
  | 'synthetic'
  | 'csv'
  | 'json'
  | 'api'
  | 'database';

export interface DataSourceConfig {
  type: DataSourceType;
  assets: AssetSymbol[];
  startDate: Date;
  endDate: Date;
  granularity: DataGranularity;
  // For file-based sources
  filePath?: string;
  // For API sources
  apiEndpoint?: string;
  apiKey?: string;
  // For synthetic data generation
  syntheticConfig?: SyntheticDataConfig;
}

export interface SyntheticDataConfig {
  initialPrices: Record<AssetSymbol, number>;
  volatility: number;         // daily volatility (0-1)
  drift: number;              // daily drift (-1 to 1)
  seed?: number;              // for deterministic generation
  includeGaps?: boolean;      // simulate data gaps
  gapProbability?: number;    // probability of gap at each step
}

export interface DataValidationResult {
  valid: boolean;
  assetCount: number;
  candleCount: number;
  dateRange: { start: Date; end: Date };
  missingDataPoints: number;
  gaps: Array<{ asset: AssetSymbol; from: Date; to: Date }>;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Market Replay Engine Types
// ============================================================================

export type ReplaySpeed = 'realtime' | 'fast' | 'instant' | number;

export interface ReplayConfig {
  speed: ReplaySpeed;
  startDate: Date;
  endDate: Date;
  granularity: DataGranularity;
  assets: AssetSymbol[];
  // Replay precision settings
  enableOrderBookReplay?: boolean;
  enableTradeHistoryReplay?: boolean;
  enableVolatilityIndicators?: boolean;
}

export interface ReplayState {
  sessionId: SessionId;
  currentTime: Date;
  startTime: Date;
  endTime: Date;
  status: ReplayStatus;
  processedCandles: number;
  totalCandles: number;
  progressPercent: number;
}

export type ReplayStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ReplayEvent {
  id: string;
  sessionId: SessionId;
  timestamp: Date;
  type: ReplayEventType;
  data: MarketDataSnapshot | Record<string, unknown>;
}

export type ReplayEventType =
  | 'candle_closed'
  | 'price_updated'
  | 'orderbook_updated'
  | 'volatility_updated'
  | 'session_started'
  | 'session_completed'
  | 'session_paused'
  | 'session_cancelled';

export type ReplayEventCallback = (event: ReplayEvent) => void | Promise<void>;

// ============================================================================
// Simulated Trading Environment Types
// ============================================================================

export interface SimulationConfig {
  sessionId: SessionId;
  initialCapital: number;
  currency: string;
  slippageModel: SlippageModel;
  feeModel: FeeModel;
  fillModel: FillModel;
  // Risk limits
  maxPositionSizePercent?: number;
  maxDrawdownPercent?: number;
  // Deterministic simulation
  seed?: number;
}

export interface SlippageModel {
  type: 'fixed' | 'volume_based' | 'market_impact';
  baseSlippage: number;               // basis points
  volumeImpactFactor?: number;        // for volume_based
  marketImpactExponent?: number;      // for market_impact
}

export interface FeeModel {
  tradingFeePercent: number;          // e.g. 0.3 for 0.3%
  gasCostUsd: number;                 // fixed gas cost per trade
  protocolFeePercent?: number;        // optional protocol fee
  makerFeePercent?: number;
  takerFeePercent?: number;
}

export interface FillModel {
  type: 'immediate' | 'limit' | 'realistic';
  // For 'realistic': partial fill probability based on order size vs volume
  partialFillProbability?: number;
  // Maximum fill percent for large orders
  maxFillPercent?: number;
}

export interface SimulatedOrder {
  id: string;
  sessionId: SessionId;
  timestamp: Date;
  asset: AssetSymbol;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  requestedAmount: number;
  filledAmount: number;
  requestedPrice?: number;
  executedPrice: number;
  fees: number;
  slippage: number;
  status: OrderStatus;
  metadata?: Record<string, unknown>;
}

export type OrderStatus =
  | 'pending'
  | 'filled'
  | 'partially_filled'
  | 'cancelled'
  | 'rejected';

export interface SimulatedPosition {
  asset: AssetSymbol;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  entryTime: Date;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  positionValue: number;
  costBasis: number;
}

export interface PortfolioState {
  sessionId: SessionId;
  timestamp: Date;
  cash: number;
  positions: Map<AssetSymbol, SimulatedPosition>;
  totalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  drawdown: number;
  maxEquity: number;
  peakEquity: number;
}

// ============================================================================
// Performance Analysis Types
// ============================================================================

export interface PerformanceReport {
  backtestId: BacktestId;
  strategyName: string;
  period: { start: Date; end: Date; durationDays: number };
  summary: PerformanceSummary;
  returns: ReturnMetrics;
  risk: RiskMetrics;
  trades: TradeMetrics;
  equityCurve: EquityCurvePoint[];
  drawdownCurve: DrawdownPoint[];
  monthlyReturns: MonthlyReturn[];
  benchmark?: BenchmarkComparison;
}

export interface PerformanceSummary {
  capitalStart: number;
  capitalEnd: number;
  totalReturn: number;             // percentage
  annualizedReturn: number;        // percentage
  absoluteProfit: number;          // in currency
}

export interface ReturnMetrics {
  totalReturn: number;
  annualizedReturn: number;
  monthlyReturnAvg: number;
  bestMonth: number;
  worstMonth: number;
  positiveMonths: number;
  negativeMonths: number;
}

export interface RiskMetrics {
  maxDrawdown: number;             // percentage
  maxDrawdownDuration: number;     // days
  currentDrawdown: number;         // percentage
  volatility: number;              // annualized percentage
  downSideDeviation: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;                   // Value at Risk 95%
  cvar95: number;                  // Conditional VaR 95%
  beta?: number;
  correlation?: number;
}

export interface TradeMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;                 // percentage
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;            // gross profit / gross loss
  expectancy: number;              // expected value per trade
  averageHoldingDays: number;
  totalFeesPaid: number;
  totalSlippage: number;
  avgSlippage: number;
}

export interface EquityCurvePoint {
  timestamp: Date;
  equity: number;
  drawdown: number;                // current drawdown percentage
  positions: Record<AssetSymbol, number>;
  cash: number;
}

export interface DrawdownPoint {
  timestamp: Date;
  drawdown: number;
  drawdownDuration: number;       // days since peak
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;                  // percentage
  trades: number;
}

export interface BenchmarkComparison {
  benchmarkName: string;
  benchmarkReturn: number;
  strategyReturn: number;
  alpha: number;
  beta?: number;
  informationRatio?: number;
}

// ============================================================================
// Risk Evaluation Integration Types
// ============================================================================

export interface DrawdownScenario {
  name: string;
  description: string;
  maxDrawdownThreshold: number;    // percentage
  durationDays?: number;
  triggerConditions: string[];
}

export interface ConcentrationRisk {
  asset: AssetSymbol;
  currentExposure: number;         // percentage of portfolio
  maxAllowedExposure: number;      // percentage
  riskScore: number;               // 0-100
  alert: boolean;
}

export interface ExposureVolatility {
  asset: AssetSymbol;
  exposurePercent: number;
  volatility30d: number;
  volatilityAdjustedExposure: number;
  riskContribution: number;        // contribution to portfolio volatility
}

export interface RiskEvaluationResult {
  backtestId: BacktestId;
  evaluatedAt: Date;
  overallRiskScore: number;        // 0-100
  riskGrade: RiskGrade;
  drawdownAnalysis: DrawdownAnalysis;
  concentrationRisks: ConcentrationRisk[];
  exposureVolatility: ExposureVolatility[];
  recommendations: RiskRecommendation[];
  passed: boolean;
  failureReasons: string[];
}

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DrawdownAnalysis {
  maxObservedDrawdown: number;
  drawdownScenarios: DrawdownScenarioResult[];
  worstCaseEstimate: number;       // from Monte Carlo
  timeToRecoveryAvg: number;       // average recovery days
}

export interface DrawdownScenarioResult {
  scenario: DrawdownScenario;
  strategyWouldSurvive: boolean;
  estimatedImpact: number;         // percentage loss
  recoveryTimeDays: number;
}

export interface RiskRecommendation {
  type: 'position_sizing' | 'diversification' | 'stop_loss' | 'exposure_limit' | 'leverage';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  suggestedAction: string;
}

// ============================================================================
// Backtest Report Types
// ============================================================================

export interface BacktestReport {
  id: ReportId;
  backtestId: BacktestId;
  generatedAt: Date;
  strategyName: string;
  version: string;
  // Core sections
  summary: ReportSummary;
  performance: PerformanceReport;
  riskEvaluation: RiskEvaluationResult;
  tradeHistory: SimulatedOrder[];
  equityCurve: EquityCurvePoint[];
  // Optional enhanced analysis
  monteCarlo?: MonteCarloAnalysis;
  optimizationHints?: OptimizationHint[];
  marketplaceMetrics?: MarketplaceMetrics;
}

export interface ReportSummary {
  // As per issue requirement example format:
  // Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85
  capitalStart: number;
  capitalEnd: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  totalTrades: number;
  winRate: number;
  backtestPeriod: string;          // human-readable, e.g. "Jan 2024 – Jun 2024"
  dataGranularity: DataGranularity;
  riskGrade: RiskGrade;
}

export interface MonteCarloAnalysis {
  simulations: number;
  confidenceLevel: number;         // e.g. 0.95
  expectedReturn: number;
  var95: number;
  cvar95: number;
  worstCase: number;
  bestCase: number;
  probabilityOfProfit: number;     // percentage
  returnDistribution: number[];
}

export interface OptimizationHint {
  parameterName: string;
  currentValue: number | string;
  suggestedValue: number | string;
  expectedImprovement: number;
  confidence: number;
}

export interface MarketplaceMetrics {
  strategyRating: number;          // 1-5 stars
  riskCategory: 'conservative' | 'moderate' | 'aggressive' | 'speculative';
  suitableForBeginners: boolean;
  minimumCapital: number;
  backtestScore: number;           // 0-100 composite score
  consistencyScore: number;        // 0-100 consistency of returns
}

// ============================================================================
// Backtesting Framework Config & Events
// ============================================================================

export interface BacktestingFrameworkConfig {
  // Data layer config
  defaultDataGranularity: DataGranularity;
  maxDataPointsPerRun: number;
  enableDataCaching: boolean;
  // Simulation defaults
  defaultInitialCapital: number;
  defaultSlippageModel: SlippageModel;
  defaultFeeModel: FeeModel;
  defaultFillModel: FillModel;
  // Performance
  enableMonteCarlo: boolean;
  defaultMonteCarloSimulations: number;
  // Risk evaluation integration
  enableRiskEvaluation: boolean;
  riskEvaluationThresholds: RiskThresholds;
  // Reporting
  reportFormat: 'json' | 'detailed';
  includeMarketplaceMetrics: boolean;
}

export interface RiskThresholds {
  maxAcceptableDrawdown: number;    // percentage, e.g. 30
  minAcceptableSharpe: number;      // e.g. 0.5
  maxConcentrationPercent: number;  // e.g. 40
  minWinRate: number;               // percentage, e.g. 30
}

export type BacktestingEventType =
  | 'backtest_started'
  | 'backtest_progress'
  | 'backtest_completed'
  | 'backtest_failed'
  | 'backtest_cancelled'
  | 'report_generated'
  | 'risk_evaluated'
  | 'data_loaded'
  | 'data_validation_failed';

export interface BacktestingEvent {
  id: string;
  type: BacktestingEventType;
  backtestId: BacktestId;
  timestamp: Date;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error';
}

export type BacktestingEventCallback = (event: BacktestingEvent) => void;

export interface BacktestRunConfig {
  id?: BacktestId;
  strategyId: string;
  strategyName: string;
  strategySpec: BacktestStrategySpec;
  dataConfig: DataSourceConfig;
  simulationConfig: Omit<SimulationConfig, 'sessionId'>;
  monteCarlo?: { enabled: boolean; simulations: number; confidenceLevel: number };
  riskEvaluation?: boolean;
  generateReport?: boolean;
}

/**
 * Minimal strategy specification for backtesting.
 * This is framework-agnostic to allow testing any strategy.
 */
export interface BacktestStrategySpec {
  assets: AssetSymbol[];
  // Strategy logic as an event-driven callback
  onCandle: (
    candle: OHLCVCandle,
    portfolio: Readonly<PortfolioState>,
    placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
  ) => void | Promise<void>;
  // Optional lifecycle hooks
  onStart?: (portfolio: Readonly<PortfolioState>) => void | Promise<void>;
  onEnd?: (portfolio: Readonly<PortfolioState>) => void | Promise<void>;
  parameters?: Record<string, number | string | boolean>;
}

export interface PlaceOrderRequest {
  asset: AssetSymbol;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  amount: number;                  // in base asset units OR as percent if amountType='percent'
  amountType?: 'units' | 'percent' | 'usd';
  limitPrice?: number;             // for limit orders
  stopPrice?: number;              // for stop orders
  metadata?: Record<string, unknown>;
}

export interface BacktestRunResult {
  id: BacktestId;
  strategyId: string;
  strategyName: string;
  config: BacktestRunConfig;
  status: BacktestRunStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  performance?: PerformanceReport;
  riskEvaluation?: RiskEvaluationResult;
  report?: BacktestReport;
  orders: SimulatedOrder[];
  equityCurve: EquityCurvePoint[];
  finalPortfolio?: PortfolioState;
  error?: { code: string; message: string };
  warnings: string[];
}

export type BacktestRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
