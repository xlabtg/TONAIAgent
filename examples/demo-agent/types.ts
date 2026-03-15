/**
 * TONAIAgent - MVP Demo Agent Types
 *
 * Type definitions for the MVP Demo Agent — an autonomous strategy execution
 * engine on The Open Network. Implements Issue #83: MVP Demo Agent.
 *
 * Supports simulation mode with virtual balances, PnL tracking, and trade history.
 */

// ============================================================================
// Agent Configuration Model
// ============================================================================

/**
 * Supported demo strategy types
 */
export type DemoStrategyType =
  | 'dca'           // Dollar-Cost Averaging
  | 'yield'         // Yield Simulation
  | 'grid'          // Grid Strategy (Simplified)
  | 'arbitrage';    // Arbitrage (Simulation Mode Only)

/**
 * Agent execution mode
 */
export type ExecutionMode = 'simulation' | 'live';

/**
 * Agent risk level
 */
export type AgentRiskLevel = 'low' | 'medium' | 'high';

/**
 * Agent operational status
 */
export type DemoAgentStatus =
  | 'created'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error';

/**
 * Main agent configuration model (as specified in issue)
 */
export interface AgentConfig {
  /** Agent display name */
  name: string;
  /** Budget in TON */
  budget: number;
  /** Risk level */
  riskLevel: AgentRiskLevel;
  /** Strategy type */
  strategy: DemoStrategyType;
  /** Execution mode */
  executionMode: ExecutionMode;
  /** Stop-loss percentage (0-100) */
  stopLoss: number;
  /** Maximum drawdown percentage (0-100) */
  maxDrawdown: number;
  /** Execution interval in milliseconds */
  executionIntervalMs: number;
}

/**
 * Default agent configuration values
 */
export const defaultAgentConfig: Omit<AgentConfig, 'name'> = {
  budget: 100,
  riskLevel: 'medium',
  strategy: 'dca',
  executionMode: 'simulation',
  stopLoss: 5,
  maxDrawdown: 10,
  executionIntervalMs: 60_000, // 1 minute
};

// ============================================================================
// Agent Record (persisted state)
// ============================================================================

/**
 * A stored demo agent record
 */
export interface DemoAgent {
  /** Unique agent ID */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Agent configuration */
  config: AgentConfig;
  /** Current status */
  status: DemoAgentStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last execution timestamp */
  lastExecutionAt?: Date;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

// ============================================================================
// Market Data
// ============================================================================

/**
 * Simulated market data for a trading pair
 */
export interface MarketData {
  /** Asset symbol (e.g. 'TON') */
  symbol: string;
  /** Current price in USD */
  price: number;
  /** 24h price change percentage */
  change24h: number;
  /** 24h trading volume in USD */
  volume24h: number;
  /** Bid price */
  bid: number;
  /** Ask price */
  ask: number;
  /** Spread (ask - bid) */
  spread: number;
  /** Market liquidity score 0-1 */
  liquidity: number;
  /** Data timestamp */
  timestamp: Date;
}

// ============================================================================
// Trade & Execution
// ============================================================================

/**
 * A simulated or live trade
 */
export interface Trade {
  /** Trade ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Trade type */
  type: 'buy' | 'sell';
  /** Asset symbol */
  symbol: string;
  /** Amount of asset */
  amount: number;
  /** Price at execution */
  price: number;
  /** Total value in USD */
  totalUsd: number;
  /** Profit/Loss for this trade */
  pnl: number;
  /** Fee paid */
  fee: number;
  /** Was simulated */
  isSimulated: boolean;
  /** Strategy that triggered */
  strategyType: DemoStrategyType;
  /** Execution timestamp */
  executedAt: Date;
}

/**
 * AI decision produced by the agent
 */
export interface AgentDecision {
  /** Decision type */
  action: 'buy' | 'sell' | 'hold';
  /** Asset symbol */
  symbol: string;
  /** Amount (for buy/sell) */
  amount?: number;
  /** Reasoning from AI */
  reasoning: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Decision timestamp */
  decidedAt: Date;
}

// ============================================================================
// Simulation State
// ============================================================================

/**
 * Simulation balance sheet
 */
export interface SimulationBalance {
  /** Agent ID */
  agentId: string;
  /** Virtual TON balance */
  tonBalance: number;
  /** Virtual USD balance */
  usdBalance: number;
  /** Initial budget in TON */
  initialBudget: number;
  /** Realized PnL in USD */
  realizedPnl: number;
  /** Unrealized PnL in USD */
  unrealizedPnl: number;
  /** Total PnL (realized + unrealized) */
  totalPnl: number;
  /** ROI percentage */
  roi: number;
  /** Trade history */
  trades: Trade[];
  /** Last update */
  updatedAt: Date;
}

// ============================================================================
// Execution Log & Metrics
// ============================================================================

/**
 * Execution log entry (one per agent cycle)
 */
export interface ExecutionLog {
  /** Log entry ID */
  id: string;
  /** Agent ID */
  agentId: string;
  /** Execution step */
  step: ExecutionStep;
  /** Log message */
  message: string;
  /** Log level */
  level: 'info' | 'warn' | 'error';
  /** Additional data */
  data?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Steps in the 9-step agent execution cycle
 */
export type ExecutionStep =
  | 'load_config'
  | 'fetch_market_data'
  | 'call_ai'
  | 'generate_decision'
  | 'validate_risk'
  | 'simulate_execute'
  | 'log_trade'
  | 'update_metrics'
  | 'notify';

/**
 * Agent performance metrics snapshot
 */
export interface AgentMetrics {
  /** Agent ID */
  agentId: string;
  /** Total executions run */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Total trades executed */
  totalTrades: number;
  /** Win rate (profitable trades / total trades) */
  winRate: number;
  /** Current ROI percentage */
  roi: number;
  /** Current PnL in USD */
  totalPnl: number;
  /** Max drawdown experienced */
  maxDrawdownExperienced: number;
  /** Average trade profit in USD */
  avgTradeProfit: number;
  /** Agent uptime percentage */
  uptime: number;
  /** Last updated */
  updatedAt: Date;
}

// ============================================================================
// Risk Controls
// ============================================================================

/**
 * Risk validation result
 */
export interface RiskValidationResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason if blocked */
  reason?: string;
  /** Active risk flags */
  flags: RiskFlag[];
}

/**
 * Risk flags
 */
export type RiskFlag =
  | 'stop_loss_triggered'
  | 'max_drawdown_exceeded'
  | 'budget_cap_exceeded'
  | 'kill_switch_active'
  | 'auto_paused';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * POST /agent/create request body
 */
export interface CreateAgentRequest {
  userId: string;
  config: AgentConfig;
}

/**
 * POST /agent/start request body
 */
export interface StartAgentRequest {
  agentId: string;
}

/**
 * POST /agent/pause request body
 */
export interface PauseAgentRequest {
  agentId: string;
  reason?: string;
}

/**
 * GET /agent/status response
 */
export interface AgentStatusResponse {
  agent: DemoAgent;
  balance: SimulationBalance;
  metrics: AgentMetrics;
}

/**
 * GET /agent/metrics response
 */
export interface AgentMetricsResponse {
  metrics: AgentMetrics;
  recentLogs: ExecutionLog[];
}

/**
 * GET /agent/history response
 */
export interface AgentHistoryResponse {
  agentId: string;
  trades: Trade[];
  logs: ExecutionLog[];
  totalPages: number;
  page: number;
}

// ============================================================================
// Demo Agent Service Interface
// ============================================================================

/**
 * Demo Agent Service interface
 */
export interface DemoAgentService {
  /** Create a new demo agent */
  createAgent(request: CreateAgentRequest): Promise<DemoAgent>;

  /** Start an agent */
  startAgent(agentId: string): Promise<DemoAgent>;

  /** Pause a running agent */
  pauseAgent(agentId: string, reason?: string): Promise<DemoAgent>;

  /** Stop an agent permanently */
  stopAgent(agentId: string): Promise<DemoAgent>;

  /** Get agent status with balance and metrics */
  getAgentStatus(agentId: string): AgentStatusResponse;

  /** Get agent metrics */
  getAgentMetrics(agentId: string): AgentMetricsResponse;

  /** Get agent trade history */
  getAgentHistory(agentId: string, page?: number, pageSize?: number): AgentHistoryResponse;

  /** Manually trigger one execution cycle */
  executeOnce(agentId: string): Promise<ExecutionLog[]>;

  /** Reset simulation state */
  resetSimulation(agentId: string): Promise<SimulationBalance>;

  /** Activate kill switch on agent */
  activateKillSwitch(agentId: string, reason: string): Promise<DemoAgent>;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Demo agent event types
 */
export type DemoAgentEventType =
  | 'agent_created'
  | 'agent_started'
  | 'agent_paused'
  | 'agent_stopped'
  | 'agent_error'
  | 'trade_executed'
  | 'risk_triggered'
  | 'kill_switch_activated'
  | 'metrics_updated';

/**
 * Demo agent event
 */
export interface DemoAgentEvent {
  type: DemoAgentEventType;
  agentId: string;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Event callback function
 */
export type DemoAgentEventCallback = (event: DemoAgentEvent) => void;
