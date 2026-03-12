/**
 * TONAIAgent - Agent Manager API Types
 *
 * Type definitions for the Agent Manager API that enables full lifecycle
 * management of AI agents including creation, configuration, execution control,
 * and monitoring.
 *
 * Implements Issue #213: Agent Manager API (Agent Lifecycle Management)
 */

// ============================================================================
// Agent Lifecycle States
// ============================================================================

/**
 * Agent lifecycle states as defined in Issue #213.
 *
 * Lifecycle flow:
 *   CREATED -> CONFIGURED -> RUNNING -> PAUSED -> STOPPED -> DELETED
 *                                ↓
 *                              ERROR
 */
export type AgentLifecycleStatus =
  | 'CREATED'
  | 'CONFIGURED'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'ERROR'
  | 'DELETED';

// ============================================================================
// Agent Configuration Types
// ============================================================================

/** Strategy parameters for agent configuration */
export interface StrategyParams {
  /** Lookback period for technical indicators */
  lookback_period?: number;
  /** Entry threshold for signals */
  entry_threshold?: number;
  /** Exit threshold for signals */
  exit_threshold?: number;
  /** Additional custom parameters */
  [key: string]: unknown;
}

/** Risk parameters for agent configuration */
export interface RiskParams {
  /** Maximum position size as a percentage of portfolio (0-1) */
  max_position_size?: number;
  /** Stop loss percentage (0-1) */
  stop_loss?: number;
  /** Take profit percentage (0-1) */
  take_profit?: number;
  /** Maximum daily loss percentage (0-1) */
  max_daily_loss?: number;
  /** Maximum drawdown percentage (0-1) */
  max_drawdown?: number;
}

/** Full agent configuration */
export interface AgentConfig {
  /** Strategy-specific parameters */
  strategy_params?: StrategyParams;
  /** Risk management parameters */
  risk_params?: RiskParams;
}

// ============================================================================
// Agent Core Types
// ============================================================================

/** Request body for creating a new agent */
export interface CreateAgentRequest {
  /** Human-readable agent name */
  name: string;
  /** Strategy identifier (e.g., 'momentum', 'mean_reversion', 'arbitrage') */
  strategy: string;
  /** Initial balance in the base asset */
  initial_balance: number;
  /** Base asset for the agent (e.g., 'USDT', 'TON') */
  base_asset: string;
  /** Trading pairs the agent operates on (e.g., ['TON/USDT']) */
  pairs: string[];
  /** Optional execution interval (e.g., '10s', '1m', '5m') */
  execution_interval?: string;
  /** Optional owner identifier */
  owner_id?: string;
}

/** Request body for configuring an agent */
export interface ConfigureAgentRequest {
  /** Strategy-specific parameters */
  strategy_params?: StrategyParams;
  /** Risk management parameters */
  risk_params?: RiskParams;
}

/** Agent record stored in the registry */
export interface AgentRecord {
  /** Unique agent identifier */
  agent_id: string;
  /** Human-readable agent name */
  name: string;
  /** Strategy being executed */
  strategy: string;
  /** Current lifecycle status */
  status: AgentLifecycleStatus;
  /** Initial balance in the base asset */
  initial_balance: number;
  /** Base asset for the agent */
  base_asset: string;
  /** Trading pairs the agent operates on */
  pairs: string[];
  /** Current configuration (populated after configure) */
  config?: AgentConfig;
  /** Execution interval (e.g., '10s', '1m', '5m') */
  execution_interval: string;
  /** Owner identifier */
  owner_id: string;
  /** Current portfolio value (updated during runtime) */
  portfolio_value: number;
  /** Total trades executed */
  trades_executed: number;
  /** Timestamp when the agent was created */
  created_at: Date;
  /** Timestamp of last update */
  updated_at: Date;
  /** Timestamp when the agent was started (null if never started) */
  started_at: Date | null;
  /** Timestamp when the agent was last stopped (null if never stopped) */
  stopped_at: Date | null;
  /** Error message if status is ERROR */
  error_message: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Response for creating an agent */
export interface CreateAgentResponse {
  /** Unique agent identifier */
  agent_id: string;
  /** Current status after creation */
  status: AgentLifecycleStatus;
}

/** Response for configuring an agent */
export interface ConfigureAgentResponse {
  /** Unique agent identifier */
  agent_id: string;
  /** Current status after configuration */
  status: AgentLifecycleStatus;
  /** Applied configuration */
  config: AgentConfig;
}

/** Response for lifecycle actions (start, pause, stop) */
export interface AgentActionResponse {
  /** Unique agent identifier */
  agent_id: string;
  /** Current status after the action */
  status: AgentLifecycleStatus;
  /** Human-readable message */
  message: string;
}

/** Agent summary for list responses */
export interface AgentSummary {
  /** Unique agent identifier */
  agent_id: string;
  /** Human-readable agent name */
  name: string;
  /** Current lifecycle status */
  status: AgentLifecycleStatus;
  /** Strategy being executed */
  strategy: string;
  /** Current portfolio value */
  portfolio_value: number;
  /** Owner identifier */
  owner_id: string;
  /** Timestamp when the agent was created */
  created_at: Date;
}

/** Response for listing agents */
export interface ListAgentsResponse {
  /** List of agent summaries */
  agents: AgentSummary[];
  /** Total count of agents */
  total: number;
}

/** Full agent details response */
export interface AgentDetailsResponse {
  /** Unique agent identifier */
  agent_id: string;
  /** Human-readable agent name */
  name: string;
  /** Current lifecycle status */
  status: AgentLifecycleStatus;
  /** Strategy being executed */
  strategy: string;
  /** Trading pairs */
  pairs: string[];
  /** Initial balance */
  initial_balance: number;
  /** Base asset */
  base_asset: string;
  /** Current configuration */
  config?: AgentConfig;
  /** Execution interval */
  execution_interval: string;
  /** Owner identifier */
  owner_id: string;
  /** Current portfolio value */
  portfolio_value: number;
  /** Total trades executed */
  trades_executed: number;
  /** Performance metrics */
  performance?: AgentPerformanceMetrics;
  /** Timestamp when the agent was created */
  created_at: Date;
  /** Timestamp of last update */
  updated_at: Date;
  /** Error message if status is ERROR */
  error_message: string | null;
}

/** Agent performance metrics */
export interface AgentPerformanceMetrics {
  /** Total return percentage */
  total_return_pct: number;
  /** Sharpe ratio */
  sharpe_ratio: number;
  /** Maximum drawdown percentage */
  max_drawdown_pct: number;
  /** Win rate (0-1) */
  win_rate: number;
  /** Total number of trades */
  total_trades: number;
  /** Profit factor */
  profit_factor: number;
  /** Average trade duration in seconds */
  avg_trade_duration_sec: number;
  /** Last updated timestamp */
  updated_at: Date;
}

// ============================================================================
// API Request/Response Envelope
// ============================================================================

/** HTTP methods supported by the API */
export type AgentApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Framework-agnostic API request */
export interface AgentApiRequest {
  /** HTTP method */
  method: AgentApiMethod;
  /** Request path */
  path: string;
  /** URL path parameters */
  params?: Record<string, string>;
  /** URL query parameters */
  query?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Request headers */
  headers?: Record<string, string>;
}

/** Framework-agnostic API response */
export interface AgentApiResponse<T = unknown> {
  /** HTTP status code */
  statusCode: number;
  /** Response body */
  body: AgentApiResponseBody<T>;
}

/** Standard response envelope */
export interface AgentApiResponseBody<T = unknown> {
  /** Whether the request succeeded */
  success: boolean;
  /** Response data (on success) */
  data?: T;
  /** Error message (on failure) */
  error?: string;
  /** Error code (on failure) */
  code?: AgentErrorCode;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Configuration for the Agent Manager Service */
export interface AgentManagerConfig {
  /** Whether the service is enabled */
  enabled: boolean;
  /** Maximum number of agents allowed */
  max_agents: number;
  /** Default execution interval for new agents */
  default_execution_interval: string;
  /** Whether to emit lifecycle events */
  enable_events: boolean;
  /** Whether to enable verbose logging */
  verbose_logging: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/** Agent manager event types */
export type AgentEventType =
  | 'agent_created'
  | 'agent_configured'
  | 'agent_started'
  | 'agent_paused'
  | 'agent_resumed'
  | 'agent_stopped'
  | 'agent_deleted'
  | 'agent_error';

/** Agent manager event */
export interface AgentEvent {
  /** Event type */
  type: AgentEventType;
  /** Agent identifier */
  agent_id: string;
  /** Previous status (for transitions) */
  previous_status?: AgentLifecycleStatus;
  /** New status (for transitions) */
  new_status: AgentLifecycleStatus;
  /** Event timestamp */
  timestamp: Date;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/** Event handler callback */
export type AgentEventHandler = (event: AgentEvent) => void;

/** Unsubscribe function */
export type AgentEventUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for agent operations */
export type AgentErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_EXISTS'
  | 'AGENT_NOT_CONFIGURED'
  | 'AGENT_ALREADY_RUNNING'
  | 'AGENT_ALREADY_STOPPED'
  | 'AGENT_ALREADY_PAUSED'
  | 'AGENT_IN_ERROR_STATE'
  | 'AGENT_DELETED'
  | 'INVALID_AGENT_ID'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_STATUS_TRANSITION'
  | 'MAX_AGENTS_REACHED'
  | 'OPERATION_FAILED'
  | 'ROUTE_NOT_FOUND';

/** Structured error for agent operations */
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: AgentErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
