/**
 * TONAIAgent - Agent Monitoring Dashboard Types
 *
 * Type definitions for the real-time monitoring dashboard that provides:
 * - Agent status monitoring
 * - Portfolio performance tracking
 * - Position visualization
 * - Trade history
 * - Performance metrics
 *
 * Implements Issue #215: Agent Monitoring Dashboard
 */

// ============================================================================
// Agent Status Types
// ============================================================================

/**
 * Agent operational states for monitoring display.
 * Maps to colored status indicators in the dashboard.
 */
export type AgentMonitoringStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR';

/**
 * Risk level classification for agents.
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Dashboard Overview Types
// ============================================================================

/**
 * Agent summary for the main dashboard overview.
 *
 * @example
 * ```
 * Agent Name        Status     Portfolio    ROI
 * ------------------------------------------------
 * Momentum Agent    RUNNING    $10,420      +4.2%
 * Mean Reversion    PAUSED     $9,800       -2.0%
 * AI Trader         RUNNING    $12,100      +21%
 * ```
 */
export interface AgentDashboardSummary {
  /** Agent unique identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Current operational status */
  status: AgentMonitoringStatus;
  /** Strategy being executed */
  strategy: string;
  /** Total portfolio value in base currency */
  portfolioValue: number;
  /** Return on Investment percentage */
  roi: number;
  /** Owner identifier */
  ownerId: string;
  /** Timestamp of last update */
  updatedAt: Date;
}

/**
 * Dashboard overview response with all agents.
 */
export interface DashboardOverview {
  /** List of all agent summaries */
  agents: AgentDashboardSummary[];
  /** Total number of agents */
  totalAgents: number;
  /** Number of agents by status */
  statusCounts: Record<AgentMonitoringStatus, number>;
  /** Timestamp when overview was generated */
  generatedAt: Date;
}

// ============================================================================
// Agent Metrics Types
// ============================================================================

/**
 * Comprehensive performance metrics for a single agent.
 *
 * @example
 * ```json
 * {
 *   "portfolioValue": 10420,
 *   "initialCapital": 10000,
 *   "totalProfit": 420,
 *   "roi": 4.2,
 *   "drawdown": -3.1,
 *   "tradeCount": 24
 * }
 * ```
 */
export interface AgentMetrics {
  /** Agent ID */
  agentId: string;
  /** Current portfolio value */
  portfolioValue: number;
  /** Initial capital invested */
  initialCapital: number;
  /** Total profit (realized + unrealized) */
  totalProfit: number;
  /** Return on Investment percentage */
  roi: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Current drawdown percentage */
  currentDrawdown: number;
  /** Total number of trades executed */
  tradeCount: number;
  /** Number of winning trades */
  winningTrades: number;
  /** Number of losing trades */
  losingTrades: number;
  /** Win rate percentage */
  winRate: number;
  /** Average profit per trade */
  avgProfit: number;
  /** Average loss per trade */
  avgLoss: number;
  /** Profit factor (gross profit / gross loss) */
  profitFactor: number;
  /** Total fees paid */
  totalFees: number;
  /** Timestamp when metrics were calculated */
  calculatedAt: Date;
}

// ============================================================================
// Position Types
// ============================================================================

/**
 * Active position information for monitoring.
 *
 * @example
 * ```
 * Asset     Size     Entry Price     Current Price     PnL
 * --------------------------------------------------------
 * TON       200      5.21            5.34              +26
 * ```
 */
export interface MonitoringPosition {
  /** Position unique identifier */
  positionId: string;
  /** Agent ID */
  agentId: string;
  /** Asset symbol */
  asset: string;
  /** Position size */
  size: number;
  /** Average entry price */
  entryPrice: number;
  /** Current market price */
  currentPrice: number;
  /** Unrealized PnL */
  unrealizedPnl: number;
  /** Unrealized PnL percentage */
  unrealizedPnlPct: number;
  /** Timestamp when position was opened */
  openedAt: Date;
}

/**
 * Positions response for monitoring API.
 */
export interface PositionsResponse {
  /** List of active positions */
  positions: MonitoringPosition[];
  /** Total number of positions */
  total: number;
  /** Agent ID */
  agentId: string;
}

// ============================================================================
// Trade History Types
// ============================================================================

/**
 * Trade record for monitoring display.
 *
 * @example
 * ```
 * Time        Pair       Side     Price     Size
 * ------------------------------------------------
 * 13:00       TON/USDT   BUY      5.21      200
 * 14:30       TON/USDT   SELL     5.35      100
 * ```
 */
export interface MonitoringTrade {
  /** Trade unique identifier */
  tradeId: string;
  /** Agent ID */
  agentId: string;
  /** Trading pair */
  pair: string;
  /** Trade side */
  side: 'BUY' | 'SELL';
  /** Execution price */
  price: number;
  /** Trade quantity */
  quantity: number;
  /** Trade value */
  value: number;
  /** Realized PnL (for sells) */
  realizedPnl: number;
  /** Trade execution timestamp */
  timestamp: Date;
}

/**
 * Trade history response for monitoring API.
 */
export interface TradeHistoryResponse {
  /** List of trades */
  trades: MonitoringTrade[];
  /** Total number of trades */
  total: number;
  /** Pagination limit */
  limit: number;
  /** Pagination offset */
  offset: number;
  /** Agent ID */
  agentId: string;
}

// ============================================================================
// Equity Curve Types
// ============================================================================

/**
 * Single point on the equity curve.
 */
export interface EquityPoint {
  /** Timestamp */
  timestamp: Date;
  /** Portfolio value at this point */
  value: number;
  /** Cumulative PnL at this point */
  cumulativePnl: number;
  /** Drawdown at this point */
  drawdown: number;
}

/**
 * Equity curve response for chart visualization.
 */
export interface EquityCurveResponse {
  /** Agent ID */
  agentId: string;
  /** Equity curve data points */
  curve: EquityPoint[];
  /** Timeframe for the data */
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'all';
  /** Number of data points */
  pointCount: number;
}

// ============================================================================
// Risk Indicators Types
// ============================================================================

/**
 * Risk indicators for monitoring display.
 *
 * @example
 * ```
 * Risk Level: Medium
 * Drawdown: -3.1%
 * Exposure: 18%
 * ```
 */
export interface RiskIndicators {
  /** Agent ID */
  agentId: string;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Current drawdown percentage */
  drawdown: number;
  /** Current exposure percentage */
  exposure: number;
  /** Position concentration (largest position %) */
  concentration: number;
  /** Number of open positions */
  openPositions: number;
  /** Value at Risk (95% confidence) */
  valueAtRisk: number;
  /** Daily loss limit usage percentage */
  dailyLossUsage: number;
  /** Timestamp when indicators were calculated */
  calculatedAt: Date;
}

// ============================================================================
// Real-Time Update Types
// ============================================================================

/**
 * Types of monitoring updates.
 */
export type MonitoringUpdateType =
  | 'agent.status_changed'
  | 'portfolio.value_updated'
  | 'position.opened'
  | 'position.updated'
  | 'position.closed'
  | 'trade.executed'
  | 'metrics.updated'
  | 'risk.alert';

/**
 * Real-time monitoring update event.
 */
export interface MonitoringUpdate {
  /** Update type */
  type: MonitoringUpdateType;
  /** Agent ID */
  agentId: string;
  /** Update timestamp */
  timestamp: Date;
  /** Update payload */
  data: Record<string, unknown>;
}

/**
 * Real-time update handler callback.
 */
export type MonitoringUpdateHandler = (update: MonitoringUpdate) => void;

/**
 * Unsubscribe function for real-time updates.
 */
export type MonitoringUnsubscribe = () => void;

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Framework-agnostic API request */
export interface MonitoringApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Framework-agnostic API response */
export interface MonitoringApiResponse<T = unknown> {
  statusCode: number;
  body: MonitoringApiResponseBody<T>;
}

/** Standard response envelope */
export interface MonitoringApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: MonitoringErrorCode;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the Monitoring Service */
export interface MonitoringConfig {
  /** Whether monitoring is enabled */
  enabled: boolean;
  /** Update interval in milliseconds */
  updateIntervalMs: number;
  /** Whether to emit real-time updates */
  enableRealTimeUpdates: boolean;
  /** Whether to cache metrics */
  enableMetricsCache: boolean;
  /** Metrics cache TTL in milliseconds */
  metricsCacheTtlMs: number;
  /** Maximum equity curve points to return */
  maxEquityCurvePoints: number;
}

/** Default monitoring configuration */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  updateIntervalMs: 5000, // 5 seconds
  enableRealTimeUpdates: true,
  enableMetricsCache: true,
  metricsCacheTtlMs: 5000, // 5 seconds
  maxEquityCurvePoints: 1000,
};

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for monitoring operations */
export type MonitoringErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'PORTFOLIO_NOT_FOUND'
  | 'INVALID_AGENT_ID'
  | 'INVALID_TIMEFRAME'
  | 'SERVICE_UNAVAILABLE'
  | 'OPERATION_FAILED';

/** Structured error for monitoring operations */
export class MonitoringError extends Error {
  constructor(
    message: string,
    public readonly code: MonitoringErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}
