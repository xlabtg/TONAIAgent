/**
 * TONAIAgent - Trading Engine (Simulation Layer) Types
 *
 * Type definitions for the Trading Engine that sits between the Strategy Engine
 * and the Portfolio Manager, executing trade signals in simulation mode,
 * tracking balances, and recording trade history.
 *
 * Architecture:
 * ```
 *   Strategy Engine
 *         |
 *   Trading Engine          ← this module
 *         |
 *    ┌────┴─────┐
 *    |          |
 * Portfolio   Trade
 * Manager   Executor
 *    |
 * Trade History
 * ```
 */

import type { TradeSignal } from '../../strategies/strategy-engine/types';

// Re-export TradeSignal so consumers only need one import
export type { TradeSignal, SignalAction } from '../../strategies/strategy-engine/types';

// ============================================================================
// Portfolio Types
// ============================================================================

/**
 * Supported tradeable asset symbols.
 * Aligned with the MVP asset list from Market Data Layer.
 */
export type TradingAsset = 'BTC' | 'ETH' | 'TON' | 'SOL' | 'USDT' | string;

/**
 * Portfolio balance map: asset symbol → quantity held.
 *
 * @example { USD: 10000, BTC: 0.25, ETH: 1.5 }
 */
export type PortfolioBalance = Record<string, number>;

/** A single agent's portfolio state */
export interface Portfolio {
  /** Owning agent ID */
  agentId: string;
  /** Current asset balances */
  balances: PortfolioBalance;
  /** When the portfolio was last updated */
  updatedAt: Date;
}

// ============================================================================
// Trade Types
// ============================================================================

/**
 * A simulated trade record stored in trade history.
 *
 * @example
 * {
 *   tradeId: 'trade-1710000000-abc123',
 *   agentId: 'agent-001',
 *   action: 'BUY',
 *   asset: 'BTC',
 *   amount: 0.01,
 *   price: 65000,
 *   value: 650,
 *   fee: 0,
 *   timestamp: Date,
 *   balanceBefore: { USD: 10000, BTC: 0 },
 *   balanceAfter: { USD: 9350, BTC: 0.01 },
 * }
 */
export interface TradeRecord {
  /** Unique trade identifier */
  tradeId: string;
  /** Agent that executed this trade */
  agentId: string;
  /** Trade action */
  action: 'BUY' | 'SELL';
  /** Asset traded */
  asset: string;
  /** Amount of asset bought or sold */
  amount: number;
  /** Execution price in USD per unit */
  price: number;
  /** Total trade value in USD (amount × price) */
  value: number;
  /** Simulated fee (0 for simulation MVP) */
  fee: number;
  /** Strategy that produced the originating signal */
  strategyId: string;
  /** Confidence score from originating signal */
  confidence: number;
  /** Timestamp when the trade was executed */
  timestamp: Date;
  /** Portfolio balances before the trade */
  balanceBefore: PortfolioBalance;
  /** Portfolio balances after the trade */
  balanceAfter: PortfolioBalance;
}

// ============================================================================
// Execution Result Types
// ============================================================================

/** Possible outcomes of a trade execution attempt */
export type TradeExecutionStatus =
  | 'executed'         // trade was successfully executed
  | 'rejected'         // trade was rejected (e.g. insufficient balance)
  | 'skipped'          // signal was HOLD — no trade needed
  | 'error';           // unexpected error during execution

/** Result returned by the Trading Engine after processing a signal */
export interface TradeExecutionResult {
  /** Whether the execution succeeded */
  success: boolean;
  /** Execution outcome status */
  status: TradeExecutionStatus;
  /** The originating trade signal */
  signal: TradeSignal;
  /** The trade record (if executed) */
  trade?: TradeRecord;
  /** Human-readable reason for the status */
  message: string;
  /** Agent ID */
  agentId: string;
  /** Execution timestamp */
  executedAt: Date;
  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// PnL Types
// ============================================================================

/** Profit and loss summary for an agent */
export interface PnLSummary {
  /** Agent ID */
  agentId: string;
  /** Realized PnL from completed trades (USD) */
  realizedPnl: number;
  /** Unrealized PnL based on current prices (USD) */
  unrealizedPnl: number;
  /** Total PnL (realized + unrealized) */
  totalPnl: number;
  /** Total portfolio value at current prices (USD) */
  portfolioValueUsd: number;
  /** Initial portfolio value when agent started (USD) */
  initialValueUsd: number;
  /** Return on investment as percentage */
  roiPercent: number;
  /** Total number of trades executed */
  totalTrades: number;
  /** Number of winning trades (positive PnL contribution) */
  winningTrades: number;
  /** Number of losing trades (negative PnL contribution) */
  losingTrades: number;
  /** Win rate as a percentage */
  winRatePercent: number;
  /** Timestamp of this calculation */
  calculatedAt: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the Trading Engine */
export interface TradingEngineConfig {
  /** Whether the engine is enabled */
  enabled: boolean;
  /** USD denomination used as the quote currency */
  quoteCurrency: string;
  /** Simulated trading fee rate (0 = no fees for MVP) */
  feeRate: number;
  /** Minimum trade value in USD to accept */
  minTradeValueUsd: number;
  /** Maximum trade history records to keep per agent */
  maxHistoryPerAgent: number;
  /** Whether to log each trade execution */
  verbose: boolean;
}

/** Metrics for the Trading Engine */
export interface TradingEngineMetrics {
  /** Total signals processed (including HOLD and rejected) */
  totalSignalsProcessed: number;
  /** Total trades executed */
  totalTradesExecuted: number;
  /** Total BUY trades */
  totalBuyTrades: number;
  /** Total SELL trades */
  totalSellTrades: number;
  /** Total rejected signals */
  totalRejected: number;
  /** Total HOLD signals skipped */
  totalSkipped: number;
  /** Total USD volume traded */
  totalVolumeUsd: number;
  /** Number of active agent portfolios */
  activePortfolios: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/** Trading engine event types */
export type TradingEngineEventType =
  | 'engine.started'
  | 'engine.stopped'
  | 'trade.executed'
  | 'trade.rejected'
  | 'trade.skipped'
  | 'portfolio.created'
  | 'portfolio.updated';

/** A trading engine event */
export interface TradingEngineEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: TradingEngineEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID (if applicable) */
  agentId?: string;
  /** Related asset (if applicable) */
  asset?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type TradingEngineEventHandler = (event: TradingEngineEvent) => void;

/** Unsubscribe function */
export type TradingEngineUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for trading engine operations */
export type TradingEngineErrorCode =
  | 'ENGINE_DISABLED'
  | 'INSUFFICIENT_BALANCE'
  | 'PRICE_UNAVAILABLE'
  | 'INVALID_SIGNAL'
  | 'ASSET_NOT_SUPPORTED'
  | 'INVALID_AMOUNT'
  | 'PORTFOLIO_NOT_FOUND';

/** Structured error for trading engine operations */
export class TradingEngineError extends Error {
  constructor(
    message: string,
    public readonly code: TradingEngineErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TradingEngineError';
  }
}

// ============================================================================
// Portfolio Manager Interface (forward declaration)
// ============================================================================

/** Portfolio Manager interface used by the Trading Engine */
export interface PortfolioManagerInterface {
  getPortfolio(agentId: string): Portfolio;
  initPortfolio(agentId: string, initialBalances: PortfolioBalance): Portfolio;
  updateBalance(agentId: string, asset: string, delta: number): void;
  hasPortfolio(agentId: string): boolean;
}

// ============================================================================
// Trade History Repository Interface (forward declaration)
// ============================================================================

/** Trade History Repository interface used by the Trading Engine */
export interface TradeHistoryRepositoryInterface {
  save(trade: TradeRecord): void;
  getByAgent(agentId: string, limit?: number): TradeRecord[];
  getAll(limit?: number): TradeRecord[];
  countByAgent(agentId: string): number;
}
