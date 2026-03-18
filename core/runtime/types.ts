/**
 * TONAIAgent - Agent Execution Loop Types
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Type definitions for the agent runtime execution loop, scheduler,
 * state manager, and monitoring components.
 */

// ============================================================================
// Agent State Types
// ============================================================================

/**
 * Agent lifecycle states as defined in Issue #212.
 */
export type AgentState =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR';

/**
 * Execution cycle result action from strategy engine.
 */
export type ExecutionAction = 'BUY' | 'SELL' | 'HOLD';

/**
 * Interval configuration for agent execution.
 * Supports seconds, minutes, or milliseconds.
 */
export interface ExecutionInterval {
  /** Value of the interval */
  value: number;
  /** Unit of the interval */
  unit: 'seconds' | 'minutes' | 'milliseconds';
}

/**
 * Risk limits for an agent.
 */
export interface AgentRiskLimits {
  /** Maximum position size as percentage of portfolio (e.g., 5 = 5%) */
  maxPositionSizePercent: number;
  /** Maximum portfolio exposure to single asset (e.g., 20 = 20%) */
  maxPortfolioExposurePercent: number;
  /** Stop-loss threshold as percentage (e.g., 10 = 10%) */
  stopLossPercent: number;
  /** Maximum daily loss as percentage of portfolio */
  maxDailyLossPercent: number;
  /** Maximum number of trades per day */
  maxTradesPerDay: number;
}

/**
 * Agent configuration for the execution loop.
 */
export interface AgentConfig {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Owner identifier (e.g., Telegram user ID) */
  ownerId: string;
  /** Strategy ID to execute */
  strategyId: string;
  /** Trading pair (e.g., 'TON/USDT') */
  tradingPair: string;
  /** Execution interval configuration */
  interval: ExecutionInterval;
  /** Initial portfolio balance */
  initialBalance: Record<string, number>;
  /** Risk limits */
  riskLimits: AgentRiskLimits;
  /** Whether to run in simulation mode */
  simulationMode: boolean;
  /** Optional strategy parameters */
  strategyParams?: Record<string, unknown>;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Runtime state for an active agent.
 */
export interface AgentRuntimeState {
  /** Agent ID */
  agentId: string;
  /** Current lifecycle state */
  state: AgentState;
  /** Agent configuration */
  config: AgentConfig;
  /** Current portfolio value in base currency */
  portfolioValue: number;
  /** Current positions */
  positions: Record<string, number>;
  /** Trade history */
  tradeHistory: TradeRecord[];
  /** Performance metrics */
  metrics: AgentMetrics;
  /** Last execution timestamp */
  lastExecutionAt: Date | null;
  /** Next scheduled execution */
  nextExecutionAt: Date | null;
  /** Error message if in ERROR state */
  errorMessage?: string;
  /** Number of consecutive errors */
  consecutiveErrors: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Execution Cycle Types
// ============================================================================

/**
 * Trade signal from strategy execution.
 */
export interface TradeSignal {
  /** Action to take */
  action: ExecutionAction;
  /** Trading pair */
  pair: string;
  /** Trade size */
  size: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Reason for the signal */
  reason: string;
  /** Strategy that generated the signal */
  strategyId: string;
  /** Timestamp */
  generatedAt: Date;
}

/**
 * Risk validation result.
 */
export interface RiskValidationResult {
  /** Whether the trade passed risk validation */
  approved: boolean;
  /** Original signal */
  originalSignal: TradeSignal;
  /** Adjusted signal (if position was capped) */
  adjustedSignal?: TradeSignal;
  /** Validation checks performed */
  checks: RiskCheck[];
  /** Warnings (non-blocking) */
  warnings: string[];
  /** Reasons for rejection (if not approved) */
  rejectionReasons: string[];
}

/**
 * Individual risk check result.
 */
export interface RiskCheck {
  /** Check name */
  name: string;
  /** Whether check passed */
  passed: boolean;
  /** Current value */
  currentValue: number;
  /** Limit value */
  limitValue: number;
  /** Message */
  message: string;
}

/**
 * Trade record for history.
 */
export interface TradeRecord {
  /** Unique trade ID */
  tradeId: string;
  /** Agent ID */
  agentId: string;
  /** Action taken */
  action: ExecutionAction;
  /** Trading pair */
  pair: string;
  /** Trade size */
  size: number;
  /** Execution price */
  price: number;
  /** Total value */
  value: number;
  /** Trade timestamp */
  executedAt: Date;
  /** Whether simulated */
  simulated: boolean;
  /** Strategy that generated the trade */
  strategyId: string;
  /** PnL for this trade (if closing position) */
  pnl?: number;
}

/**
 * Result of a single execution cycle.
 */
export interface ExecutionCycleResult {
  /** Execution cycle ID */
  cycleId: string;
  /** Agent ID */
  agentId: string;
  /** Whether the cycle completed successfully */
  success: boolean;
  /** Cycle start timestamp */
  startedAt: Date;
  /** Cycle completion timestamp */
  completedAt: Date;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Market data snapshot used */
  marketData: MarketDataSnapshot;
  /** Signal generated by strategy */
  signal: TradeSignal | null;
  /** Risk validation result */
  riskValidation: RiskValidationResult | null;
  /** Trade executed (if any) */
  trade: TradeRecord | null;
  /** Updated portfolio state */
  portfolioUpdate: PortfolioUpdate | null;
  /** Error message if failed */
  error?: string;
  /** Step where failure occurred */
  failedStep?: ExecutionStep;
}

/**
 * Steps in the execution cycle.
 */
export type ExecutionStep =
  | 'fetch_market_data'
  | 'execute_strategy'
  | 'validate_risk'
  | 'execute_trade'
  | 'update_portfolio'
  | 'update_metrics';

/**
 * Market data snapshot for execution.
 */
export interface MarketDataSnapshot {
  /** Prices by asset */
  prices: Record<string, AssetPrice>;
  /** Source of the data */
  source: string;
  /** Timestamp of the fetch */
  fetchedAt: Date;
}

/**
 * Individual asset price data.
 */
export interface AssetPrice {
  /** Asset symbol */
  asset: string;
  /** Current price in USD */
  price: number;
  /** 24h volume */
  volume24h: number;
  /** 24h price change percentage */
  change24h?: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Portfolio update after trade execution.
 */
export interface PortfolioUpdate {
  /** Previous positions */
  previousPositions: Record<string, number>;
  /** New positions */
  newPositions: Record<string, number>;
  /** Previous portfolio value */
  previousValue: number;
  /** New portfolio value */
  newValue: number;
  /** Realized PnL from this update */
  realizedPnl: number;
  /** Unrealized PnL */
  unrealizedPnl: number;
}

// ============================================================================
// Agent Metrics Types
// ============================================================================

/**
 * Performance metrics for an agent.
 */
export interface AgentMetrics {
  /** Return on Investment percentage */
  roi: number;
  /** Total PnL in base currency */
  totalPnl: number;
  /** Realized PnL */
  realizedPnl: number;
  /** Unrealized PnL */
  unrealizedPnl: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Sharpe ratio (if sufficient data) */
  sharpeRatio: number | null;
  /** Win rate percentage */
  winRate: number;
  /** Total number of trades */
  totalTrades: number;
  /** Number of winning trades */
  winningTrades: number;
  /** Number of losing trades */
  losingTrades: number;
  /** Total execution cycles */
  totalCycles: number;
  /** Successful execution cycles */
  successfulCycles: number;
  /** Failed execution cycles */
  failedCycles: number;
  /** Average cycle duration in ms */
  avgCycleDurationMs: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Scheduled agent job.
 */
export interface ScheduledAgent {
  /** Agent ID */
  agentId: string;
  /** Interval in milliseconds */
  intervalMs: number;
  /** Next scheduled run timestamp */
  nextRunAt: Date;
  /** Last run timestamp */
  lastRunAt: Date | null;
  /** Whether currently running */
  isRunning: boolean;
  /** Timer reference (internal) */
  timerId?: ReturnType<typeof setTimeout>;
}

/**
 * Scheduler configuration.
 */
export interface SchedulerConfig {
  /** Maximum concurrent agent executions */
  maxConcurrentExecutions: number;
  /** Minimum interval allowed in milliseconds */
  minIntervalMs: number;
  /** Maximum interval allowed in milliseconds */
  maxIntervalMs: number;
  /** Enable drift compensation */
  enableDriftCompensation: boolean;
  /** Maximum execution time before timeout (ms) */
  executionTimeoutMs: number;
}

// ============================================================================
// Runtime Monitor Types
// ============================================================================

/**
 * Runtime telemetry data.
 */
export interface RuntimeTelemetry {
  /** Number of active agents */
  activeAgents: number;
  /** Number of running agents */
  runningAgents: number;
  /** Number of paused agents */
  pausedAgents: number;
  /** Number of stopped agents */
  stoppedAgents: number;
  /** Number of agents in error state */
  errorAgents: number;
  /** Total execution cycles across all agents */
  totalCycles: number;
  /** Total successful cycles */
  successfulCycles: number;
  /** Total failed cycles */
  failedCycles: number;
  /** Average cycle latency in ms */
  avgCycleLatencyMs: number;
  /** Total trades executed */
  totalTrades: number;
  /** Total volume processed */
  totalVolumeProcessed: number;
  /** Runtime uptime in ms */
  uptimeMs: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Agent status for monitoring.
 */
export interface AgentStatus {
  /** Agent ID */
  agentId: string;
  /** Agent name */
  name: string;
  /** Current state */
  state: AgentState;
  /** Strategy ID */
  strategyId: string;
  /** Portfolio value */
  portfolioValue: number;
  /** ROI */
  roi: number;
  /** Total trades */
  totalTrades: number;
  /** Last execution timestamp */
  lastExecutionAt: Date | null;
  /** Next scheduled execution */
  nextExecutionAt: Date | null;
  /** Error message if in error state */
  errorMessage?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Runtime event types.
 */
export type RuntimeEventType =
  | 'agent.created'
  | 'agent.started'
  | 'agent.paused'
  | 'agent.resumed'
  | 'agent.stopped'
  | 'agent.error'
  | 'cycle.started'
  | 'cycle.completed'
  | 'cycle.failed'
  | 'trade.executed'
  | 'risk.warning'
  | 'risk.rejected'
  | 'scheduler.started'
  | 'scheduler.stopped'
  | 'monitor.alert';

/**
 * Runtime event payload.
 */
export interface RuntimeEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: RuntimeEventType;
  /** Timestamp */
  timestamp: Date;
  /** Agent ID (if applicable) */
  agentId?: string;
  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Event handler function.
 */
export type RuntimeEventHandler = (event: RuntimeEvent) => void;

/**
 * Unsubscribe function.
 */
export type RuntimeUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/**
 * Runtime error codes.
 */
export type RuntimeErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_EXISTS'
  | 'AGENT_NOT_RUNNING'
  | 'AGENT_ALREADY_RUNNING'
  | 'INVALID_STATE_TRANSITION'
  | 'EXECUTION_TIMEOUT'
  | 'MARKET_DATA_ERROR'
  | 'STRATEGY_ERROR'
  | 'RISK_VALIDATION_ERROR'
  | 'TRADE_EXECUTION_ERROR'
  | 'SCHEDULER_ERROR'
  | 'CONFIGURATION_ERROR';

/**
 * Runtime error class.
 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: RuntimeErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RuntimeError';
  }
}

// ============================================================================
// Manager Configuration Types
// ============================================================================

/**
 * Agent Manager configuration.
 */
export interface AgentManagerConfig {
  /** Maximum number of agents that can be registered */
  maxAgents: number;
  /** Scheduler configuration */
  scheduler: SchedulerConfig;
  /** Default risk limits for new agents */
  defaultRiskLimits: AgentRiskLimits;
  /** Default execution interval */
  defaultInterval: ExecutionInterval;
  /** Enable observability/logging */
  enableObservability: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
