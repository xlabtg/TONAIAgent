/**
 * TONAIAgent - Portfolio Engine Types
 *
 * Type definitions for the Portfolio Storage Engine that provides
 * persistent portfolio tracking including:
 * - Balances
 * - Positions
 * - Trade History
 * - PnL Metrics
 *
 * Implements Issue #214: Portfolio Storage & Trade History
 */

// ============================================================================
// Core Enumerations
// ============================================================================

/** Trade side: buy or sell */
export type TradeSide = 'BUY' | 'SELL';

/** Position status */
export type PositionStatus = 'open' | 'closed' | 'partially_closed';

// ============================================================================
// Portfolio Types
// ============================================================================

/**
 * Portfolio overview for an agent.
 *
 * @example
 * {
 *   agentId: "agent_001",
 *   totalValue: 10420,
 *   baseCurrency: "USDT",
 *   positions: [...],
 *   updatedAt: Date
 * }
 */
export interface Portfolio {
  /** Portfolio unique identifier */
  portfolioId: string;
  /** Owning agent ID */
  agentId: string;
  /** Base currency for valuation (e.g., USDT) */
  baseCurrency: string;
  /** Total portfolio value in base currency */
  totalValue: number;
  /** Timestamp when the portfolio was created */
  createdAt: Date;
  /** Timestamp when the portfolio was last updated */
  updatedAt: Date;
}

/**
 * Portfolio summary with positions and balances.
 */
export interface PortfolioSummary {
  /** Portfolio metadata */
  portfolio: Portfolio;
  /** Open positions */
  positions: Position[];
  /** Asset balances */
  balances: BalanceRecord[];
  /** Portfolio metrics */
  metrics: PortfolioMetrics;
}

// ============================================================================
// Position Types
// ============================================================================

/**
 * A position represents holdings in a specific asset.
 *
 * @example
 * {
 *   positionId: "pos_123",
 *   agentId: "agent_001",
 *   asset: "TON",
 *   size: 200,
 *   avgEntryPrice: 5.21,
 *   currentPrice: 5.34,
 *   unrealizedPnl: 26,
 *   status: "open"
 * }
 */
export interface Position {
  /** Unique position identifier */
  positionId: string;
  /** Owning agent ID */
  agentId: string;
  /** Asset symbol (e.g., TON, BTC, ETH) */
  asset: string;
  /** Position size (quantity held) */
  size: number;
  /** Average entry price */
  avgEntryPrice: number;
  /** Current market price (last known) */
  currentPrice: number;
  /** Unrealized PnL based on current price */
  unrealizedPnl: number;
  /** Total cost basis */
  costBasis: number;
  /** Position status */
  status: PositionStatus;
  /** Timestamp when position was opened */
  openedAt: Date;
  /** Timestamp of last update */
  updatedAt: Date;
  /** Timestamp when position was closed (if applicable) */
  closedAt: Date | null;
}

// ============================================================================
// Trade Types
// ============================================================================

/**
 * A trade record representing an executed trade.
 *
 * @example
 * {
 *   tradeId: "trade_123",
 *   agentId: "agent_001",
 *   pair: "TON/USDT",
 *   side: "BUY",
 *   price: 5.21,
 *   quantity: 200,
 *   value: 1042,
 *   fee: 1.042,
 *   timestamp: Date
 * }
 */
export interface Trade {
  /** Unique trade identifier */
  tradeId: string;
  /** Owning agent ID */
  agentId: string;
  /** Trading pair (e.g., TON/USDT) */
  pair: string;
  /** Trade side */
  side: TradeSide;
  /** Execution price */
  price: number;
  /** Trade quantity */
  quantity: number;
  /** Trade value in quote currency (price * quantity) */
  value: number;
  /** Trading fee */
  fee: number;
  /** Realized PnL from this trade (for sells) */
  realizedPnl: number;
  /** Strategy ID that generated the trade */
  strategyId: string | null;
  /** Trade execution timestamp */
  timestamp: Date;
}

/**
 * Trade filter options for querying trade history.
 */
export interface TradeFilter {
  /** Filter by agent ID */
  agentId?: string;
  /** Filter by trading pair */
  pair?: string;
  /** Filter by trade side */
  side?: TradeSide;
  /** Filter by start date */
  startDate?: Date;
  /** Filter by end date */
  endDate?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// Balance Types
// ============================================================================

/**
 * Balance record for a specific asset.
 *
 * @example
 * {
 *   agentId: "agent_001",
 *   asset: "USDT",
 *   balance: 9500,
 *   available: 9000,
 *   reserved: 500
 * }
 */
export interface BalanceRecord {
  /** Owning agent ID */
  agentId: string;
  /** Asset symbol */
  asset: string;
  /** Total balance */
  balance: number;
  /** Available balance (not in open orders) */
  available: number;
  /** Reserved balance (in open orders) */
  reserved: number;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Balance update operation.
 */
export interface BalanceUpdate {
  /** Asset symbol */
  asset: string;
  /** Delta to apply (positive = credit, negative = debit) */
  delta: number;
  /** Reason for update */
  reason: 'trade' | 'fee' | 'deposit' | 'withdrawal' | 'adjustment';
}

// ============================================================================
// Portfolio Metrics Types
// ============================================================================

/**
 * Portfolio performance metrics.
 *
 * @example
 * {
 *   portfolioValue: 10420,
 *   realizedPnl: 320,
 *   unrealizedPnl: 100,
 *   totalPnl: 420,
 *   roi: 4.2,
 *   totalTrades: 42
 * }
 */
export interface PortfolioMetrics {
  /** Agent ID */
  agentId: string;
  /** Total portfolio value in base currency */
  portfolioValue: number;
  /** Initial portfolio value */
  initialValue: number;
  /** Realized PnL from closed trades */
  realizedPnl: number;
  /** Unrealized PnL from open positions */
  unrealizedPnl: number;
  /** Total PnL (realized + unrealized) */
  totalPnl: number;
  /** Return on Investment percentage */
  roi: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Total number of trades */
  totalTrades: number;
  /** Number of winning trades */
  winningTrades: number;
  /** Number of losing trades */
  losingTrades: number;
  /** Win rate percentage */
  winRate: number;
  /** Total fees paid */
  totalFees: number;
  /** Timestamp when metrics were calculated */
  calculatedAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Framework-agnostic API request */
export interface PortfolioApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Framework-agnostic API response */
export interface PortfolioApiResponse<T = unknown> {
  statusCode: number;
  body: PortfolioApiResponseBody<T>;
}

/** Standard response envelope */
export interface PortfolioApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: PortfolioErrorCode;
}

/** Response for portfolio overview endpoint */
export interface PortfolioOverviewResponse {
  portfolioValue: number;
  baseCurrency: string;
  positions: Position[];
  balances: Record<string, number>;
  metrics: PortfolioMetrics;
}

/** Response for trade history endpoint */
export interface TradeHistoryResponse {
  trades: Trade[];
  total: number;
  limit: number;
  offset: number;
}

/** Response for positions endpoint */
export interface PositionsResponse {
  positions: Position[];
  total: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the Portfolio Engine */
export interface PortfolioEngineConfig {
  /** Whether the engine is enabled */
  enabled: boolean;
  /** Default base currency */
  baseCurrency: string;
  /** Initial balance for new portfolios */
  initialBalance: number;
  /** Maximum trade history records to keep per agent */
  maxTradeHistoryPerAgent: number;
  /** Fee rate for trades (0-1, e.g., 0.001 = 0.1%) */
  feeRate: number;
  /** Whether to emit events on updates */
  enableEvents: boolean;
}

/** Default configuration */
export const DEFAULT_PORTFOLIO_ENGINE_CONFIG: PortfolioEngineConfig = {
  enabled: true,
  baseCurrency: 'USDT',
  initialBalance: 10000,
  maxTradeHistoryPerAgent: 10000,
  feeRate: 0.001, // 0.1%
  enableEvents: true,
};

// ============================================================================
// Event Types
// ============================================================================

/** Portfolio engine event types */
export type PortfolioEventType =
  | 'portfolio.created'
  | 'portfolio.updated'
  | 'trade.executed'
  | 'position.opened'
  | 'position.updated'
  | 'position.closed'
  | 'balance.updated'
  | 'metrics.calculated';

/** Portfolio engine event */
export interface PortfolioEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: PortfolioEventType;
  /** Agent ID */
  agentId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event data payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type PortfolioEventHandler = (event: PortfolioEvent) => void;

/** Unsubscribe function */
export type PortfolioUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for portfolio operations */
export type PortfolioErrorCode =
  | 'PORTFOLIO_NOT_FOUND'
  | 'POSITION_NOT_FOUND'
  | 'TRADE_NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_AGENT_ID'
  | 'INVALID_AMOUNT'
  | 'INVALID_PRICE'
  | 'OPERATION_FAILED';

/** Structured error for portfolio operations */
export class PortfolioError extends Error {
  constructor(
    message: string,
    public readonly code: PortfolioErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PortfolioError';
  }
}
