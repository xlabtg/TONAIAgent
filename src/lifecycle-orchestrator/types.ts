/**
 * TONAIAgent - Agent Lifecycle Cloud Orchestrator Types
 *
 * Type definitions for the cloud-native orchestration layer that manages the
 * full lifecycle of autonomous agents at scale.
 *
 * Implements Issue #92: Agent Lifecycle Cloud Orchestrator
 *
 * Architecture:
 *   Control Plane
 *     → Lifecycle Manager   (state machine: Created → Active → Running → Paused → Suspended → Terminated)
 *     → Scheduler           (cron, event-based, market triggers, on-chain triggers)
 *     → Runtime Allocator   (resource assignment, cost optimization, horizontal scaling)
 *     → Health Monitor      (health checks, metrics, anomaly detection, risk scoring)
 *     → Scaling Engine      (horizontal scaling, load balancing, capacity planning)
 *     → Governance Engine   (permissions, compliance, audit trails, explainability)
 *   Agent Runtime Nodes
 */

// ============================================================================
// Lifecycle State Machine
// ============================================================================

/**
 * Full lifecycle state of an agent in the cloud orchestration layer.
 *
 * State transitions:
 *   created → active (on activation)
 *   active → running (on first execution cycle)
 *   running → paused (on user/admin pause)
 *   paused → running (on resume)
 *   running → suspended (on risk alert / admin action)
 *   suspended → running (on governance approval)
 *   any → terminated (on shutdown/deallocation)
 */
export type LifecycleState =
  | 'created'     // Agent registered, resources not yet allocated
  | 'active'      // Resources allocated, agent initialized and ready
  | 'running'     // Actively executing strategies (24/7 continuous operation)
  | 'paused'      // Temporarily paused by user or scheduled downtime
  | 'suspended'   // Forcibly suspended by governance/risk engine (requires approval to resume)
  | 'terminated'; // Permanently shut down; resources deallocated, keys archived

/**
 * Valid transitions from each lifecycle state.
 * Used by the state machine to validate transition requests.
 */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  created:    ['active', 'terminated'],
  active:     ['running', 'paused', 'terminated'],
  running:    ['paused', 'suspended', 'terminated'],
  paused:     ['running', 'suspended', 'terminated'],
  suspended:  ['running', 'paused', 'terminated'],
  terminated: [],
};

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Execution trigger type for the distributed scheduler.
 */
export type ScheduleTriggerType =
  | 'cron'         // Time-based: standard cron expression (e.g., "*/5 * * * *")
  | 'event'        // External event: webhook, message queue, API signal
  | 'market'       // Market condition: price threshold, volume spike, volatility alert
  | 'on-chain'     // TON blockchain event: new block, contract call, token transfer
  | 'manual';      // Triggered explicitly via API

/** Cron-based schedule configuration */
export interface CronSchedule {
  type: 'cron';
  /** Standard cron expression: "min hour day month weekday" */
  expression: string;
  /** Optional timezone (default: UTC) */
  timezone?: string;
}

/** Event-based trigger configuration */
export interface EventSchedule {
  type: 'event';
  /** Event source identifier */
  source: string;
  /** Event name to listen for */
  eventName: string;
  /** Optional filter conditions on the event payload */
  filter?: Record<string, unknown>;
}

/** Market-condition trigger configuration */
export interface MarketSchedule {
  type: 'market';
  /** Trading pair or asset to monitor (e.g., "TON/USDT") */
  asset: string;
  /** Condition type */
  condition: 'price_above' | 'price_below' | 'volume_spike' | 'volatility_alert' | 'drawdown_limit';
  /** Threshold value */
  threshold: number;
}

/** On-chain trigger configuration */
export interface OnChainSchedule {
  type: 'on-chain';
  /** TON network to monitor */
  network: 'mainnet' | 'testnet';
  /** Contract address to watch (null = watch all) */
  contractAddress: string | null;
  /** Event type on-chain */
  onChainEvent: 'new_block' | 'contract_call' | 'token_transfer' | 'nft_mint';
}

/** Manual trigger configuration */
export interface ManualSchedule {
  type: 'manual';
}

/** Union type for all schedule configurations */
export type ScheduleConfig =
  | CronSchedule
  | EventSchedule
  | MarketSchedule
  | OnChainSchedule
  | ManualSchedule;

/** A registered job in the scheduler */
export interface ScheduledJob {
  /** Unique job identifier */
  jobId: string;
  /** Agent this job belongs to */
  agentId: string;
  /** Schedule configuration */
  schedule: ScheduleConfig;
  /** Whether the job is currently active */
  enabled: boolean;
  /** Last execution timestamp (null if never run) */
  lastExecutedAt: Date | null;
  /** Next scheduled execution timestamp (null for event/manual) */
  nextExecutionAt: Date | null;
  /** Total execution count */
  executionCount: number;
  /** Failed execution count */
  failureCount: number;
  /** Created timestamp */
  createdAt: Date;
}

// ============================================================================
// Runtime Allocation
// ============================================================================

/** Resource tier for compute allocation */
export type ResourceTier = 'minimal' | 'standard' | 'performance' | 'dedicated';

/** Runtime compute environment */
export type ComputeEnvironment = 'serverless' | 'container' | 'edge' | 'hybrid';

/** Cloud provider target */
export type CloudProvider = 'aws' | 'ton-cloud' | 'vercel' | 'kubernetes' | 'on-prem';

/** Allocated runtime for an agent */
export interface RuntimeAllocation {
  /** Unique allocation identifier */
  allocationId: string;
  /** Agent this runtime belongs to */
  agentId: string;
  /** Resource tier */
  tier: ResourceTier;
  /** Compute environment */
  environment: ComputeEnvironment;
  /** Cloud provider */
  provider: CloudProvider;
  /** CPU allocation (millicores) */
  cpuMillicores: number;
  /** Memory allocation (megabytes) */
  memoryMb: number;
  /** Estimated hourly cost in USD (0 for simulated) */
  estimatedHourlyCostUsd: number;
  /** Allocation timestamp */
  allocatedAt: Date;
  /** Last heartbeat from this runtime */
  lastHeartbeatAt: Date | null;
  /** Whether this runtime is healthy */
  healthy: boolean;
}

// ============================================================================
// Health Monitoring
// ============================================================================

/** Health status levels */
export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

/** Single health check result */
export interface HealthCheckResult {
  /** Check identifier */
  checkId: string;
  /** Agent being checked */
  agentId: string;
  /** Overall health status */
  status: HealthStatus;
  /** Individual component health */
  components: {
    runtime: HealthStatus;
    strategy: HealthStatus;
    wallet: HealthStatus;
    network: HealthStatus;
  };
  /** Performance metrics at time of check */
  metrics: AgentPerformanceMetrics;
  /** Anomalies detected (empty if none) */
  anomalies: AnomalyReport[];
  /** Risk score (0-100; higher = more risk) */
  riskScore: number;
  /** Timestamp of this check */
  checkedAt: Date;
}

/** Performance metrics for a single agent */
export interface AgentPerformanceMetrics {
  /** Agent identifier */
  agentId: string;
  /** Uptime percentage (0-100) */
  uptimePercent: number;
  /** Average strategy execution latency in milliseconds */
  avgExecutionLatencyMs: number;
  /** Number of strategy executions in last hour */
  executionsLastHour: number;
  /** Number of failed executions in last hour */
  failedExecutionsLastHour: number;
  /** Strategy P&L in USD (simulated in demo mode) */
  strategyPnlUsd: number;
  /** Total transactions processed */
  totalTransactions: number;
  /** Last execution timestamp */
  lastExecutionAt: Date | null;
  /** Data snapshot timestamp */
  snapshotAt: Date;
}

/** Anomaly report from the monitoring system */
export interface AnomalyReport {
  /** Anomaly type */
  type: 'execution_failure_spike' | 'high_latency' | 'unusual_pnl' | 'network_disconnect' | 'resource_exhaustion';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable description */
  description: string;
  /** Recommended action */
  recommendation: 'monitor' | 'alert_user' | 'auto_pause' | 'emergency_stop';
  /** When the anomaly was detected */
  detectedAt: Date;
}

// ============================================================================
// Scaling Engine
// ============================================================================

/** Scaling policy type */
export type ScalingPolicyType = 'fixed' | 'auto' | 'scheduled' | 'manual';

/** Horizontal scaling policy */
export interface ScalingPolicy {
  /** Policy identifier */
  policyId: string;
  /** Policy type */
  type: ScalingPolicyType;
  /** Minimum number of runtime instances */
  minInstances: number;
  /** Maximum number of runtime instances */
  maxInstances: number;
  /** Scale-up trigger: CPU utilization threshold (0-100) */
  scaleUpCpuThreshold: number;
  /** Scale-down trigger: CPU utilization threshold (0-100) */
  scaleDownCpuThreshold: number;
  /** Cool-down period between scaling events in seconds */
  cooldownSeconds: number;
}

// ============================================================================
// Alerting Engine
// ============================================================================

/** Alert severity */
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

/** Alert channel */
export type AlertChannel = 'telegram' | 'email' | 'webhook' | 'dashboard';

/** Alert record */
export interface Alert {
  /** Unique alert identifier */
  alertId: string;
  /** Related agent (null for system-level alerts) */
  agentId: string | null;
  /** Related user */
  userId: string | null;
  /** Severity */
  severity: AlertSeverity;
  /** Alert title */
  title: string;
  /** Detailed message */
  message: string;
  /** Whether auto-action was triggered (e.g., auto-pause) */
  autoActionTaken: boolean;
  /** Description of auto-action taken */
  autoAction: string | null;
  /** Channels this alert was delivered to */
  deliveredTo: AlertChannel[];
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
  /** Timestamp */
  createdAt: Date;
}

// ============================================================================
// Governance Layer
// ============================================================================

/** Permission scope for governance */
export type PermissionScope =
  | 'agent.read'
  | 'agent.create'
  | 'agent.pause'
  | 'agent.resume'
  | 'agent.terminate'
  | 'agent.suspend'
  | 'lifecycle.manage'
  | 'scheduler.manage'
  | 'governance.admin';

/** Governance permission grant */
export interface GovernancePermission {
  /** Entity being granted permissions (userId or role) */
  principal: string;
  /** Principal type */
  principalType: 'user' | 'role' | 'service';
  /** Granted permissions */
  scopes: PermissionScope[];
  /** Optional expiry (null = permanent) */
  expiresAt: Date | null;
  /** Granted by */
  grantedBy: string;
  /** Grant timestamp */
  grantedAt: Date;
}

/** Audit log entry */
export interface AuditEntry {
  /** Unique entry identifier */
  entryId: string;
  /** Timestamp */
  timestamp: Date;
  /** Acting principal */
  principal: string;
  /** Action performed */
  action: string;
  /** Related agent (null if system action) */
  agentId: string | null;
  /** Before state (for state changes) */
  stateBefore: string | null;
  /** After state (for state changes) */
  stateAfter: string | null;
  /** Additional context */
  context: Record<string, unknown>;
  /** Whether this was an automated action */
  automated: boolean;
}

// ============================================================================
// Migration Support
// ============================================================================

/** Migration type */
export type MigrationType =
  | 'cloud_provider'   // Move to different cloud provider
  | 'runtime_upgrade'  // Upgrade runtime version
  | 'wallet_strategy'  // Migrate wallet or change custody model
  | 'multi_chain';     // Expand to additional chains

/** Migration record */
export interface MigrationRecord {
  /** Migration identifier */
  migrationId: string;
  /** Agent being migrated */
  agentId: string;
  /** Migration type */
  type: MigrationType;
  /** Migration status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  /** Source configuration */
  sourceConfig: Record<string, unknown>;
  /** Target configuration */
  targetConfig: Record<string, unknown>;
  /** Started at */
  startedAt: Date | null;
  /** Completed at */
  completedAt: Date | null;
  /** Error if failed */
  error: string | null;
}

// ============================================================================
// Agent Lifecycle Record (main persisted entity)
// ============================================================================

/**
 * Full lifecycle record for an agent managed by the cloud orchestrator.
 * Represents the complete agent state including runtime, scheduling, health, etc.
 */
export interface AgentLifecycleRecord {
  /** Agent identifier (from agent-orchestrator) */
  agentId: string;
  /** Human-readable name */
  agentName: string;
  /** Owning user */
  userId: string;
  /** Current lifecycle state */
  state: LifecycleState;
  /** Previous lifecycle state (for transition tracking) */
  previousState: LifecycleState | null;
  /** Deployment environment */
  environment: 'demo' | 'testnet' | 'mainnet';
  /** Allocated runtime */
  runtimeAllocation: RuntimeAllocation | null;
  /** Scheduled jobs for this agent */
  scheduledJobs: ScheduledJob[];
  /** Latest health check result */
  latestHealthCheck: HealthCheckResult | null;
  /** Active scaling policy */
  scalingPolicy: ScalingPolicy | null;
  /** Active alerts (unacknowledged) */
  activeAlerts: Alert[];
  /** Cumulative performance metrics */
  cumulativeMetrics: AgentPerformanceMetrics;
  /** Governance permissions granted on this agent */
  permissions: GovernancePermission[];
  /** Pending or completed migrations */
  migrations: MigrationRecord[];
  /** State transition history */
  stateHistory: StateTransition[];
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Terminated timestamp (null if not terminated) */
  terminatedAt: Date | null;
  /** Final report (populated on termination) */
  finalReport: TerminationReport | null;
}

/** A single state transition in the lifecycle */
export interface StateTransition {
  /** From state */
  from: LifecycleState;
  /** To state */
  to: LifecycleState;
  /** Who triggered this transition */
  triggeredBy: string;
  /** Reason for transition */
  reason: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether this was automated */
  automated: boolean;
}

/** Final report generated on agent termination */
export interface TerminationReport {
  /** Agent identifier */
  agentId: string;
  /** Total active duration in milliseconds */
  totalActiveDurationMs: number;
  /** Total executions performed */
  totalExecutions: number;
  /** Net P&L in USD */
  netPnlUsd: number;
  /** Reason for termination */
  terminationReason: string;
  /** Whether keys were securely archived */
  keysArchived: boolean;
  /** Audit log reference */
  auditLogRef: string;
  /** Generated at */
  generatedAt: Date;
}

// ============================================================================
// Orchestrator Input/Output
// ============================================================================

/** Input for registering an existing agent into the lifecycle orchestrator */
export interface RegisterAgentInput {
  /** Agent ID from agent-orchestrator */
  agentId: string;
  /** Agent name */
  agentName: string;
  /** Owner user ID */
  userId: string;
  /** Deployment environment */
  environment: 'demo' | 'testnet' | 'mainnet';
  /** Initial resource tier */
  resourceTier?: ResourceTier;
  /** Initial compute environment */
  computeEnvironment?: ComputeEnvironment;
  /** Initial cloud provider */
  cloudProvider?: CloudProvider;
  /** Whether to immediately activate the agent */
  autoActivate?: boolean;
  /** Initial scheduled jobs to add */
  initialJobs?: Omit<ScheduledJob, 'jobId' | 'createdAt' | 'lastExecutedAt' | 'nextExecutionAt' | 'executionCount' | 'failureCount'>[];
}

/** Result of registering an agent */
export interface RegisterAgentResult {
  /** The lifecycle record */
  record: AgentLifecycleRecord;
  /** Runtime that was allocated */
  allocation: RuntimeAllocation;
  /** Jobs that were scheduled */
  scheduledJobs: ScheduledJob[];
}

/** Input to transition agent lifecycle state */
export interface TransitionStateInput {
  /** Agent to transition */
  agentId: string;
  /** Target state */
  targetState: LifecycleState;
  /** Who is requesting the transition */
  requestedBy: string;
  /** Reason for transition */
  reason: string;
  /** Whether this is an automated/system-triggered transition */
  automated?: boolean;
}

/** Input for scheduling a job */
export interface ScheduleJobInput {
  /** Agent to schedule for */
  agentId: string;
  /** Schedule configuration */
  schedule: ScheduleConfig;
  /** Whether to enable immediately */
  enabled?: boolean;
}

/** Input for the scaling engine */
export interface ScaleAgentInput {
  /** Agent to scale */
  agentId: string;
  /** New resource tier (optional) */
  tier?: ResourceTier;
  /** New instance count (for manual scaling) */
  instanceCount?: number;
  /** Reason for scaling */
  reason: string;
}

// ============================================================================
// Lifecycle Orchestrator Configuration
// ============================================================================

/** Configuration for the Lifecycle Orchestrator */
export interface LifecycleOrchestratorConfig {
  /** Whether the orchestrator is enabled */
  enabled: boolean;
  /** Default resource tier for new agents */
  defaultResourceTier: ResourceTier;
  /** Default compute environment */
  defaultComputeEnvironment: ComputeEnvironment;
  /** Default cloud provider */
  defaultCloudProvider: CloudProvider;
  /** Health check interval in milliseconds */
  healthCheckIntervalMs: number;
  /** How long between heartbeat checks before declaring runtime unhealthy (ms) */
  heartbeatTimeoutMs: number;
  /** Auto-pause agent when risk score exceeds this threshold (0 = disabled) */
  autoPauseRiskThreshold: number;
  /** Auto-suspend agent when risk score exceeds this threshold (0 = disabled) */
  autoSuspendRiskThreshold: number;
  /** Maximum agents supported by this orchestrator instance */
  maxAgents: number;
  /** Whether to automatically run health checks */
  autoHealthChecks: boolean;
  /** Alert configuration */
  alerting: AlertingConfig;
  /** Governance configuration */
  governance: GovernanceConfig;
}

/** Alerting configuration */
export interface AlertingConfig {
  /** Default channels for alerts */
  defaultChannels: AlertChannel[];
  /** Minimum severity to trigger an alert */
  minSeverity: AlertSeverity;
  /** Whether to auto-pause agents on critical alerts */
  autoPauseOnCritical: boolean;
  /** Whether to auto-suspend agents on emergency alerts */
  autoSuspendOnEmergency: boolean;
}

/** Governance configuration */
export interface GovernanceConfig {
  /** Whether audit logging is enabled */
  enableAuditLog: boolean;
  /** Whether all state transitions require a reason */
  requireTransitionReason: boolean;
  /** Whether to enforce permission checks */
  enforcePermissions: boolean;
}

// ============================================================================
// Orchestrator Health & Metrics
// ============================================================================

/** Overall health of the lifecycle orchestrator */
export interface LifecycleOrchestratorHealth {
  /** Overall status */
  overall: HealthStatus;
  /** Whether the orchestrator is running */
  running: boolean;
  /** Component health */
  components: {
    lifecycleManager: boolean;
    scheduler: boolean;
    runtimeAllocator: boolean;
    healthMonitor: boolean;
    scalingEngine: boolean;
    governanceEngine: boolean;
    alertingEngine: boolean;
  };
  /** Aggregate metrics */
  metrics: LifecycleOrchestratorMetrics;
  /** Last health check */
  lastCheck: Date;
}

/** Aggregate metrics across all managed agents */
export interface LifecycleOrchestratorMetrics {
  /** Total agents registered */
  totalAgents: number;
  /** Agents by state */
  agentsByState: Record<LifecycleState, number>;
  /** Total scheduled jobs */
  totalScheduledJobs: number;
  /** Active jobs (enabled) */
  activeJobs: number;
  /** Total executions across all agents */
  totalExecutions: number;
  /** Total alerts generated */
  totalAlerts: number;
  /** Unacknowledged alerts */
  unacknowledgedAlerts: number;
  /** Average uptime across all running agents */
  avgUptimePercent: number;
  /** Total estimated hourly cost (USD) */
  totalHourlyCostUsd: number;
}

// ============================================================================
// Lifecycle Orchestrator Events
// ============================================================================

/** Event types emitted by the lifecycle orchestrator */
export type LifecycleEventType =
  | 'agent.registered'
  | 'agent.state_changed'
  | 'agent.terminated'
  | 'job.scheduled'
  | 'job.executed'
  | 'job.failed'
  | 'health.check_completed'
  | 'health.anomaly_detected'
  | 'alert.created'
  | 'alert.acknowledged'
  | 'scaling.triggered'
  | 'migration.started'
  | 'migration.completed'
  | 'migration.failed';

/** Lifecycle orchestrator event */
export interface LifecycleEvent {
  /** Event type */
  type: LifecycleEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related agent ID (null for system events) */
  agentId: string | null;
  /** Related user ID (null for system events) */
  userId: string | null;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type LifecycleEventHandler = (event: LifecycleEvent) => void;

/** Unsubscribe function */
export type LifecycleUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for lifecycle orchestrator operations */
export type LifecycleOrchestratorErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AGENT_ALREADY_REGISTERED'
  | 'INVALID_STATE_TRANSITION'
  | 'INVALID_STATE'
  | 'PERMISSION_DENIED'
  | 'JOB_NOT_FOUND'
  | 'ALERT_NOT_FOUND'
  | 'MIGRATION_NOT_FOUND'
  | 'RUNTIME_ALLOCATION_FAILED'
  | 'HEALTH_CHECK_FAILED'
  | 'ORCHESTRATOR_DISABLED'
  | 'MAX_AGENTS_REACHED'
  | 'INVALID_SCHEDULE'
  | 'GOVERNANCE_VIOLATION';

/** Structured error for lifecycle orchestrator operations */
export class LifecycleOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly code: LifecycleOrchestratorErrorCode,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LifecycleOrchestratorError';
  }
}

// ============================================================================
// API Layer Types
// ============================================================================

/** Standard API request wrapper (framework-agnostic) */
export interface LifecycleApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/** Standard API response envelope */
export interface LifecycleApiResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
  };
}
