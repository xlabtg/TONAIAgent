/**
 * TONAIAgent - Agent Runtime Orchestrator Types
 *
 * Type definitions for the Agent Runtime Orchestrator that bridges
 * AI decision-making with on-chain execution on the TON blockchain.
 */

// ============================================================================
// Agent Lifecycle Types
// ============================================================================

/**
 * Agent lifecycle states as defined in the issue requirements.
 * Transitions: Created -> Funded -> Active <-> Paused
 *              Active -> Suspended | Migrated | Terminated
 */
export type AgentLifecycleState =
  | 'created'
  | 'funded'
  | 'active'
  | 'paused'
  | 'suspended'
  | 'migrated'
  | 'terminated';

/** Reason for a lifecycle state transition */
export type LifecycleTransitionReason =
  | 'initialized'
  | 'funding_received'
  | 'started_by_user'
  | 'paused_by_user'
  | 'resumed_by_user'
  | 'suspended_risk_limit'
  | 'suspended_gas_exhausted'
  | 'suspended_error'
  | 'migrated_to_new_contract'
  | 'terminated_by_user'
  | 'terminated_stop_condition'
  | 'emergency_stop';

/** Single lifecycle transition record */
export interface LifecycleTransition {
  /** Transition ID */
  id: string;
  /** Previous state */
  from: AgentLifecycleState;
  /** New state */
  to: AgentLifecycleState;
  /** Reason for transition */
  reason: LifecycleTransitionReason;
  /** Actor that triggered the transition (address or 'system') */
  actor: string;
  /** Timestamp */
  timestamp: Date;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Execution Pipeline Types
// ============================================================================

/**
 * Steps in the 9-step execution pipeline.
 * fetch_data -> load_memory -> call_ai -> validate_risk ->
 * generate_plan -> simulate_tx -> execute_onchain -> record_outcome -> update_analytics
 */
export type PipelineStep =
  | 'fetch_data'
  | 'load_memory'
  | 'call_ai'
  | 'validate_risk'
  | 'generate_plan'
  | 'simulate_tx'
  | 'execute_onchain'
  | 'record_outcome'
  | 'update_analytics';

/** Status of a single pipeline step execution */
export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Result of a single pipeline step */
export interface PipelineStepResult {
  /** Step name */
  step: PipelineStep;
  /** Execution status */
  status: PipelineStepStatus;
  /** Step output data */
  output?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Step start timestamp */
  startedAt: Date;
  /** Step completion timestamp */
  completedAt?: Date;
}

/** Full pipeline execution record */
export interface PipelineExecution {
  /** Unique execution ID */
  executionId: string;
  /** Agent that ran this pipeline */
  agentId: string;
  /** Strategy ID being executed */
  strategyId?: string;
  /** Whether this was a simulation run */
  isSimulation: boolean;
  /** Steps completed in order */
  steps: PipelineStepResult[];
  /** Overall success */
  success: boolean;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Pipeline start time */
  startedAt: Date;
  /** Pipeline completion time */
  completedAt?: Date;
  /** Error if pipeline failed */
  error?: string;
}

// ============================================================================
// Simulation Mode Types
// ============================================================================

/** Simulation mode configuration */
export interface SimulationConfig {
  /** Whether simulation mode is active */
  enabled: boolean;
  /** Simulated wallet balance in nanoTON */
  fakeBalance: bigint;
  /** Whether to replay historical data instead of live data */
  useHistoricalData?: boolean;
  /** Historical data start date (for replay) */
  historicalStart?: Date;
  /** Historical data end date (for replay) */
  historicalEnd?: Date;
  /** Simulated slippage percentage (0-100) */
  slippagePct?: number;
  /** Simulated network latency in ms */
  networkLatencyMs?: number;
}

/** Result of a simulated transaction */
export interface SimulatedTransaction {
  /** Simulated transaction ID */
  txId: string;
  /** Transaction type */
  type: string;
  /** Source agent */
  agentId: string;
  /** Destination address */
  to: string;
  /** Amount in nanoTON */
  amount: bigint;
  /** Whether simulation succeeded */
  success: boolean;
  /** Simulated gas cost in nanoTON */
  gasUsed: bigint;
  /** Simulated PnL in nanoTON */
  pnl: bigint;
  /** Simulation timestamp */
  timestamp: Date;
}

// ============================================================================
// Runtime Agent Types
// ============================================================================

/** Runtime agent configuration */
export interface RuntimeAgentConfig {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable agent name */
  name: string;
  /** Owner identifier (Telegram user ID, address, etc.) */
  ownerId: string;
  /** Owner's TON wallet address */
  ownerAddress: string;
  /** Strategy IDs this agent will execute */
  strategyIds: string[];
  /** Simulation mode configuration */
  simulation: SimulationConfig;
  /** Risk limits */
  riskLimits: RuntimeRiskLimits;
  /** Execution schedule (cron or interval) */
  schedule?: RuntimeSchedule;
  /** Maximum concurrent strategy executions */
  maxConcurrentExecutions: number;
  /** Whether observability is enabled */
  enableObservability: boolean;
}

/** Risk limits for the runtime agent */
export interface RuntimeRiskLimits {
  /** Maximum loss per execution in nanoTON */
  maxLossPerExecutionNano: bigint;
  /** Maximum daily loss in nanoTON */
  maxDailyLossNano: bigint;
  /** Maximum gas budget per day in nanoTON */
  maxDailyGasBudgetNano: bigint;
  /** Maximum single transaction size in nanoTON */
  maxTransactionSizeNano: bigint;
  /** Maximum number of transactions per day */
  maxTransactionsPerDay: number;
  /** Stop on consecutive failures */
  maxConsecutiveFailures: number;
}

/** Execution schedule configuration */
export interface RuntimeSchedule {
  /** Cron expression (e.g. every 5 minutes: "star/5 * * * *") */
  cron?: string;
  /** Fixed interval in seconds */
  intervalSeconds?: number;
  /** Manual trigger only (no automatic scheduling) */
  manualOnly?: boolean;
}

/** Runtime agent state snapshot */
export interface RuntimeAgentState {
  /** Agent ID */
  agentId: string;
  /** Current lifecycle state */
  lifecycleState: AgentLifecycleState;
  /** State transition history */
  transitionHistory: LifecycleTransition[];
  /** Current simulated or real balance in nanoTON */
  balance: bigint;
  /** Gas used today in nanoTON */
  dailyGasUsed: bigint;
  /** Daily loss accumulated in nanoTON */
  dailyLoss: bigint;
  /** Transactions executed today */
  dailyTransactionCount: number;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** Last execution time */
  lastExecutedAt?: Date;
  /** Next scheduled execution time */
  nextScheduledAt?: Date;
  /** Active pipeline execution IDs */
  activePipelineIds: string[];
  /** Completed pipeline history (last N) */
  pipelineHistory: PipelineExecution[];
}

// ============================================================================
// Runtime Orchestrator Types
// ============================================================================

/** Configuration for the Agent Runtime Orchestrator */
export interface AgentRuntimeConfig {
  /** Whether the runtime is enabled */
  enabled: boolean;
  /** Maximum pipeline history records per agent */
  maxPipelineHistoryPerAgent: number;
  /** Maximum concurrent agents */
  maxConcurrentAgents: number;
  /** Default simulation config for new agents */
  defaultSimulation: SimulationConfig;
  /** Default risk limits for new agents */
  defaultRiskLimits: RuntimeRiskLimits;
  /** Observability configuration */
  observability: ObservabilityConfig;
}

/** Observability configuration */
export interface ObservabilityConfig {
  /** Whether structured logging is enabled */
  enableLogging: boolean;
  /** Whether metrics collection is enabled */
  enableMetrics: boolean;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Metrics prefix */
  metricsPrefix: string;
}

/** Runtime orchestrator metrics */
export interface OrchestratorMetrics {
  /** Total agents registered */
  totalAgents: number;
  /** Currently active agents */
  activeAgents: number;
  /** Paused agents */
  pausedAgents: number;
  /** Total pipeline executions */
  totalPipelineExecutions: number;
  /** Successful pipeline executions */
  successfulPipelineExecutions: number;
  /** Failed pipeline executions */
  failedPipelineExecutions: number;
  /** Total simulated transactions */
  totalSimulatedTransactions: number;
  /** Total real transactions */
  totalRealTransactions: number;
  /** Total volume processed in nanoTON */
  totalVolumeProcessed: bigint;
  /** Uptime since orchestrator start */
  uptimeMs: number;
  /** Last updated */
  updatedAt: Date;
}

/** Runtime orchestrator health */
export interface OrchestratorHealth {
  /** Overall health status */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** Whether the runtime is running */
  running: boolean;
  /** Whether AI orchestration is available */
  aiAvailable: boolean;
  /** Whether TON factory is available */
  tonFactoryAvailable: boolean;
  /** Metrics summary */
  metrics: OrchestratorMetrics;
  /** Last health check */
  lastCheck: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/** Agent runtime event types */
export type RuntimeEventType =
  | 'agent.registered'
  | 'agent.lifecycle_changed'
  | 'agent.started'
  | 'agent.paused'
  | 'agent.resumed'
  | 'agent.terminated'
  | 'pipeline.started'
  | 'pipeline.step_completed'
  | 'pipeline.completed'
  | 'pipeline.failed'
  | 'simulation.transaction'
  | 'risk.limit_reached'
  | 'risk.emergency_stop'
  | 'orchestrator.started'
  | 'orchestrator.stopped';

/** Agent runtime event */
export interface RuntimeEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: RuntimeEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID (if applicable) */
  agentId?: string;
  /** Related pipeline execution ID (if applicable) */
  executionId?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type RuntimeEventHandler = (event: RuntimeEvent) => void;

/** Unsubscribe function */
export type RuntimeUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for agent runtime operations */
export type AgentRuntimeErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_EXISTS'
  | 'AGENT_NOT_ACTIVE'
  | 'AGENT_LIMIT_REACHED'
  | 'INVALID_LIFECYCLE_STATE'
  | 'RISK_VALIDATION_FAILED'
  | 'PIPELINE_FAILED'
  | 'SIMULATION_ERROR'
  | 'ONCHAIN_EXECUTION_FAILED';

/** Structured error for agent runtime operations */
export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: AgentRuntimeErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}
