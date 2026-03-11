/**
 * TONAIAgent - Strategy Engine v1 Types
 *
 * Type definitions for the Strategy Engine that sits between the Agent Runtime
 * and the Trading Engine, enabling agents to execute configurable trading strategies.
 *
 * Architecture:
 *   Agent Runtime
 *         |
 *   Strategy Engine
 *         |
 *    TrendStrategy   ArbitrageStrategy   AISignalStrategy
 *         |
 *   Trading Engine
 */

// ============================================================================
// Signal Types
// ============================================================================

/**
 * Trading signal action produced by a strategy.
 * - BUY: open or increase a long position
 * - SELL: close or decrease a long position
 * - HOLD: no action required
 */
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

/** A trading signal produced by a strategy execution */
export interface TradeSignal {
  /** Signal action */
  action: SignalAction;
  /** Target asset (e.g. "TON", "USDT", "BTC") */
  asset: string;
  /** Amount in nanoTON or base units (as string to preserve precision) */
  amount: string;
  /** Confidence score 0–1 */
  confidence: number;
  /** Human-readable reasoning for the signal */
  reason: string;
  /** Strategy that produced this signal */
  strategyId: string;
  /** Timestamp when the signal was generated */
  generatedAt: Date;
  /** Optional metadata (indicators, prices, etc.) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Market Data Types
// ============================================================================

/** Price data for a single asset at a point in time */
export interface AssetPrice {
  /** Asset symbol */
  asset: string;
  /** Current price in USD */
  price: number;
  /** 24-hour volume in USD */
  volume24h: number;
  /** Price change in percent over 24 hours */
  priceChange24h?: number;
  /** Timestamp of the price */
  timestamp: Date;
}

/** Market data snapshot passed to strategies */
export interface MarketData {
  /** Map of asset symbol to price data */
  prices: Record<string, AssetPrice>;
  /** Data source identifier */
  source: string;
  /** When this market data was fetched */
  fetchedAt: Date;
}

// ============================================================================
// Strategy Parameter Types
// ============================================================================

/** Supported parameter value types */
export type StrategyParamValue = string | number | boolean;

/** A single configurable strategy parameter */
export interface StrategyParam {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean';
  /** Default value */
  defaultValue: StrategyParamValue;
  /** Human-readable description */
  description: string;
  /** Optional minimum value for numbers */
  min?: number;
  /** Optional maximum value for numbers */
  max?: number;
}

/** Resolved parameter map keyed by parameter name */
export type StrategyParams = Record<string, StrategyParamValue>;

// ============================================================================
// Strategy Types
// ============================================================================

/** Known strategy type IDs for the built-in strategies */
export type BuiltInStrategyType = 'trend' | 'arbitrage' | 'ai-signal';

/** Strategy status in its lifecycle */
export type StrategyStatus = 'active' | 'inactive' | 'error';

/** Metadata describing a strategy class (used by the registry) */
export interface StrategyMetadata {
  /** Unique strategy identifier (e.g. "trend", "arbitrage") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the strategy does */
  description: string;
  /** Strategy version */
  version: string;
  /** Declared parameter definitions */
  params: StrategyParam[];
  /** Assets this strategy operates on */
  supportedAssets: string[];
}

// ============================================================================
// Execution Types
// ============================================================================

/** Result of a single strategy execution */
export interface StrategyExecutionResult {
  /** Unique execution ID */
  executionId: string;
  /** Strategy that was executed */
  strategyId: string;
  /** Agent that triggered the execution */
  agentId: string;
  /** The trade signal produced */
  signal: TradeSignal;
  /** Whether the execution succeeded */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Execution start time */
  startedAt: Date;
  /** Execution completion time */
  completedAt: Date;
  /** Whether the signal was forwarded to the Trading Engine */
  signalForwarded: boolean;
}

// ============================================================================
// Strategy Execution Engine Types
// ============================================================================

/** Configuration for the Strategy Execution Engine */
export interface StrategyEngineConfig {
  /** Whether the engine is enabled */
  enabled: boolean;
  /** Maximum parallel strategy executions */
  maxParallelExecutions: number;
  /** Default asset to trade if strategy doesn't specify */
  defaultAsset: string;
  /** Default amount in nanoTON to trade per signal */
  defaultAmountNano: string;
  /** Whether to forward signals to the Trading Engine */
  forwardSignals: boolean;
  /** Maximum execution history records per agent */
  maxHistoryPerAgent: number;
}

/** Metrics for the Strategy Execution Engine */
export interface StrategyEngineMetrics {
  /** Total strategies registered */
  totalStrategiesRegistered: number;
  /** Total strategy executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Count of BUY signals generated */
  buySignals: number;
  /** Count of SELL signals generated */
  sellSignals: number;
  /** Count of HOLD signals generated */
  holdSignals: number;
  /** Last updated */
  updatedAt: Date;
}

// ============================================================================
// Loader Types
// ============================================================================

/** Describes a registered strategy class (used internally by loader) */
export interface RegisteredStrategyClass {
  /** Strategy metadata */
  metadata: StrategyMetadata;
  /** Factory function to create a strategy instance with given params */
  factory: (params: StrategyParams) => StrategyInterface;
}

// ============================================================================
// Event Types
// ============================================================================

/** Strategy engine event types */
export type StrategyEngineEventType =
  | 'engine.started'
  | 'engine.stopped'
  | 'strategy.registered'
  | 'strategy.unregistered'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'signal.generated'
  | 'signal.forwarded';

/** A strategy engine event */
export interface StrategyEngineEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: StrategyEngineEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related strategy ID (if applicable) */
  strategyId?: string;
  /** Related agent ID (if applicable) */
  agentId?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type StrategyEngineEventHandler = (event: StrategyEngineEvent) => void;

/** Unsubscribe function */
export type StrategyEngineUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for strategy engine operations */
export type StrategyEngineErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'STRATEGY_ALREADY_REGISTERED'
  | 'STRATEGY_EXECUTION_FAILED'
  | 'INVALID_PARAMS'
  | 'ENGINE_DISABLED'
  | 'MARKET_DATA_UNAVAILABLE';

/** Structured error for strategy engine operations */
export class StrategyEngineError extends Error {
  constructor(
    message: string,
    public readonly code: StrategyEngineErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StrategyEngineError';
  }
}

// ============================================================================
// Forward Declaration (StrategyInterface referenced in loader types)
// ============================================================================

/**
 * Import-compatible forward declaration.
 * The actual StrategyInterface is defined in ./interface.ts
 */
export interface StrategyInterface {
  getMetadata(): StrategyMetadata;
  execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal>;
}
