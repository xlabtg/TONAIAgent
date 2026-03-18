/**
 * TONAIAgent - Distributed Scheduler & Event Engine Types
 *
 * Type definitions for the Distributed Scheduler that provides:
 * - Persistent scheduled execution (distributed cron)
 * - Event-driven execution (pub/sub event bus)
 * - On-chain event listeners (TON blockchain)
 * - Fault-tolerant worker pool with retry/dead-letter queue
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

// ============================================================================
// Execution Mode Types
// ============================================================================

/**
 * How a scheduled job is triggered.
 * - cron: time-based scheduling (cron expression or interval)
 * - event: triggered by an event on the event bus
 * - hybrid: both cron and event triggers are active simultaneously
 */
export type ExecutionMode = 'cron' | 'event' | 'hybrid';

// ============================================================================
// Job Types
// ============================================================================

/**
 * Priority level for queued jobs. Higher priority jobs are executed first.
 */
export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Current lifecycle state of a scheduled job.
 */
export type JobStatus =
  | 'pending'    // Registered, not yet triggered
  | 'queued'     // In the task queue, awaiting a worker
  | 'running'    // Currently executing in a worker
  | 'completed'  // Finished successfully
  | 'failed'     // Execution failed; may be retried
  | 'dead'       // Exhausted retries; moved to dead-letter queue
  | 'paused'     // Temporarily paused by the owner
  | 'cancelled'; // Permanently cancelled

/**
 * Input to register a new scheduled job.
 *
 * @example
 * ```typescript
 * const job: CreateJobInput = {
 *   name: "DCA Strategy",
 *   agentId: "agent_abc",
 *   executionMode: "cron",
 *   cronExpression: "0 * * * *", // hourly
 *   payload: { strategy: "dca", amount: 10 },
 * };
 * ```
 */
export interface CreateJobInput {
  /** Human-readable job name */
  name: string;
  /** Agent that owns this job */
  agentId: string;
  /** How the job is triggered */
  executionMode: ExecutionMode;
  /** Cron expression (required for 'cron' and 'hybrid' modes) */
  cronExpression?: string;
  /** Interval in ms as alternative to cronExpression */
  intervalMs?: number;
  /** Event topics that trigger this job (required for 'event' and 'hybrid' modes) */
  triggerTopics?: string[];
  /** Arbitrary payload passed to the worker on each execution */
  payload?: Record<string, unknown>;
  /** Job priority in the task queue */
  priority?: JobPriority;
  /** Maximum number of retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Timeout for a single execution attempt in ms (default: 30000) */
  timeoutMs?: number;
  /** Idempotency key to prevent duplicate job registration */
  idempotencyKey?: string;
  /** Optional metadata attached to the job */
  metadata?: Record<string, unknown>;
}

/**
 * A registered scheduled job.
 */
export interface ScheduledJob {
  /** Unique job identifier */
  jobId: string;
  /** Human-readable name */
  name: string;
  /** Owning agent */
  agentId: string;
  /** Execution mode */
  executionMode: ExecutionMode;
  /** Cron expression (if applicable) */
  cronExpression: string | null;
  /** Interval in ms (if applicable) */
  intervalMs: number | null;
  /** Event topics that trigger this job */
  triggerTopics: string[];
  /** Payload for each execution */
  payload: Record<string, unknown>;
  /** Priority in task queue */
  priority: JobPriority;
  /** Max retry attempts */
  maxRetries: number;
  /** Execution timeout in ms */
  timeoutMs: number;
  /** Current lifecycle status */
  status: JobStatus;
  /** Idempotency key (if provided) */
  idempotencyKey: string | null;
  /** Optional metadata */
  metadata: Record<string, unknown>;
  /** When the job was registered */
  createdAt: Date;
  /** When the job was last updated */
  updatedAt: Date;
  /** Next scheduled execution time (null if event-only) */
  nextRunAt: Date | null;
  /** Last execution time */
  lastRunAt: Date | null;
  /** Total number of successful executions */
  successCount: number;
  /** Total number of failed execution attempts */
  failureCount: number;
}

// ============================================================================
// Execution Record Types
// ============================================================================

/**
 * Record of a single job execution attempt.
 */
export interface ExecutionRecord {
  /** Unique execution identifier */
  executionId: string;
  /** Job that was executed */
  jobId: string;
  /** Worker that handled this execution */
  workerId: string;
  /** What triggered this execution */
  trigger: 'cron' | 'event' | 'manual';
  /** The event that triggered execution (null for cron/manual) */
  triggerEvent: BusEvent | null;
  /** When execution started */
  startedAt: Date;
  /** When execution finished (null if still running) */
  completedAt: Date | null;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if execution failed */
  error: string | null;
  /** Retry attempt number (0 = first attempt) */
  attempt: number;
  /** Result payload from the worker */
  result: Record<string, unknown> | null;
}

// ============================================================================
// Event Bus Types
// ============================================================================

/**
 * Built-in event topics published by the system.
 * Custom topics can be any string.
 */
export type SystemEventTopic =
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.error'
  | 'market.price_movement'
  | 'market.volume_spike'
  | 'market.liquidity_change'
  | 'onchain.wallet_transaction'
  | 'onchain.contract_event'
  | 'onchain.token_transfer'
  | 'onchain.liquidity_change'
  | 'scheduler.job_completed'
  | 'scheduler.job_failed'
  | 'scheduler.job_dead'
  | 'webhook.received';

/**
 * An event published on the event bus.
 */
export interface BusEvent {
  /** Unique event identifier */
  eventId: string;
  /** Topic the event is published on */
  topic: string;
  /** Source that published this event */
  source: string;
  /** Event payload */
  payload: Record<string, unknown>;
  /** Event timestamp */
  timestamp: Date;
  /** Optional correlation ID for tracing */
  correlationId?: string;
}

/**
 * Callback invoked when a subscribed event arrives.
 */
export type EventSubscriberCallback = (event: BusEvent) => void | Promise<void>;

/**
 * Unsubscribe function returned by EventBus.subscribe().
 */
export type EventUnsubscribe = () => void;

/**
 * Options for subscribing to a topic.
 */
export interface SubscribeOptions {
  /** Filter events to those matching this source (undefined = all sources) */
  sourceFilter?: string;
}

// ============================================================================
// Worker Pool Types
// ============================================================================

/**
 * Current status of a worker in the pool.
 */
export type WorkerStatus = 'idle' | 'busy' | 'draining' | 'stopped';

/**
 * Information about a single worker.
 */
export interface WorkerInfo {
  /** Unique worker identifier */
  workerId: string;
  /** Current status */
  status: WorkerStatus;
  /** Job currently being executed (null if idle) */
  currentJobId: string | null;
  /** Total executions handled */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** When the worker was started */
  startedAt: Date;
}

/**
 * Configuration for the worker pool.
 */
export interface WorkerPoolConfig {
  /** Minimum number of workers always running */
  minWorkers: number;
  /** Maximum number of workers allowed */
  maxWorkers: number;
  /** How long a worker waits for a job before scaling down (ms) */
  idleTimeoutMs: number;
  /** Default execution timeout per job (ms) */
  defaultTimeoutMs: number;
  /** Enable per-agent isolation (one worker per agent at a time) */
  agentIsolation: boolean;
}

// ============================================================================
// On-Chain Listener Types
// ============================================================================

/**
 * Type of on-chain event to listen for.
 */
export type OnChainEventType =
  | 'wallet_transaction' // Any transaction to/from a wallet
  | 'contract_event'     // Smart contract event emission
  | 'token_transfer'     // Jetton/NFT transfer
  | 'liquidity_change';  // DEX liquidity pool change

/**
 * Input to register an on-chain event listener.
 */
export interface CreateListenerInput {
  /** Human-readable listener name */
  name: string;
  /** Agent that owns this listener */
  agentId: string;
  /** What on-chain event to listen for */
  eventType: OnChainEventType;
  /** Address to monitor (wallet, contract, or pool address) */
  address: string;
  /** Optional topic filter for contract events */
  eventSignature?: string;
  /** Minimum value threshold to trigger (in nanoTON, 0 = any) */
  minValue?: number;
  /** Event bus topic to publish detected events on */
  publishTopic?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A registered on-chain event listener.
 */
export interface OnChainListener {
  /** Unique listener identifier */
  listenerId: string;
  /** Human-readable name */
  name: string;
  /** Owning agent */
  agentId: string;
  /** Event type being monitored */
  eventType: OnChainEventType;
  /** Monitored address */
  address: string;
  /** Event signature filter */
  eventSignature: string | null;
  /** Minimum value threshold (nanoTON) */
  minValue: number;
  /** Topic to publish detected events to */
  publishTopic: string;
  /** Whether the listener is active */
  active: boolean;
  /** Optional metadata */
  metadata: Record<string, unknown>;
  /** When the listener was registered */
  createdAt: Date;
  /** Total events detected */
  eventsDetected: number;
  /** Last event detected at */
  lastEventAt: Date | null;
}

/**
 * An on-chain event detected by a listener.
 */
export interface OnChainEvent {
  /** Unique event identifier */
  onChainEventId: string;
  /** Listener that detected this event */
  listenerId: string;
  /** Event type */
  eventType: OnChainEventType;
  /** TON blockchain transaction hash */
  txHash: string;
  /** Block LT (logical time) */
  lt: string;
  /** Source address */
  from: string;
  /** Destination address */
  to: string;
  /** Value in nanoTON */
  value: number;
  /** Event-specific payload */
  payload: Record<string, unknown>;
  /** When the event was detected */
  detectedAt: Date;
}

// ============================================================================
// Retry Engine Types
// ============================================================================

/**
 * Retry policy configuration for a failed job.
 */
export interface RetryPolicy {
  /** Max retry attempts (0 = no retries) */
  maxAttempts: number;
  /** Initial delay in ms before first retry */
  initialDelayMs: number;
  /** Multiplier applied to delay on each subsequent retry */
  backoffMultiplier: number;
  /** Maximum delay in ms (cap on exponential backoff) */
  maxDelayMs: number;
  /** Whether to add random jitter to retry delay */
  jitter: boolean;
}

/**
 * An entry in the dead-letter queue — a job that exhausted all retry attempts.
 */
export interface DeadLetterEntry {
  /** Unique DLQ entry identifier */
  dlqId: string;
  /** The job that failed permanently */
  jobId: string;
  /** All execution attempts */
  attempts: ExecutionRecord[];
  /** The final error message */
  finalError: string;
  /** When the entry was added to DLQ */
  deadAt: Date;
  /** Whether a human has acknowledged this entry */
  acknowledged: boolean;
}

// ============================================================================
// Scheduler Configuration
// ============================================================================

/**
 * Configuration for the Distributed Scheduler.
 */
export interface DistributedSchedulerConfig {
  /** Whether the scheduler is enabled */
  enabled: boolean;
  /** Worker pool configuration */
  workerPool: WorkerPoolConfig;
  /** Default retry policy for jobs */
  defaultRetryPolicy: RetryPolicy;
  /** Maximum jobs in the task queue at any time */
  maxQueueSize: number;
  /** How long to keep completed execution records (ms) */
  executionHistoryRetentionMs: number;
  /** Polling interval for cron job evaluation (ms) */
  cronPollIntervalMs: number;
  /** Polling interval for on-chain listener simulation (ms) */
  onChainPollIntervalMs: number;
  /** Enable leader election simulation (prevents duplicate cron execution) */
  leaderElection: boolean;
  /** Enable execution audit logging */
  enableAuditLog: boolean;
}

// ============================================================================
// Scheduler Health & Metrics
// ============================================================================

/**
 * Scheduler health status.
 */
export interface SchedulerHealth {
  /** Overall health */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** Whether the scheduler is running */
  running: boolean;
  /** Component health map */
  components: {
    scheduler: boolean;
    eventBus: boolean;
    workerPool: boolean;
    retryEngine: boolean;
    onChainListener: boolean;
    deadLetterQueue: boolean;
  };
  /** Current metrics snapshot */
  metrics: SchedulerMetrics;
  /** Last health check time */
  lastCheck: Date;
}

/**
 * Scheduler metrics snapshot.
 */
export interface SchedulerMetrics {
  /** Total jobs registered */
  totalJobs: number;
  /** Currently active (non-cancelled/dead) jobs */
  activeJobs: number;
  /** Jobs currently running */
  runningJobs: number;
  /** Jobs in the task queue */
  queuedJobs: number;
  /** Total execution attempts */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions (including retried) */
  failedExecutions: number;
  /** Jobs in the dead-letter queue */
  deadLetterCount: number;
  /** Active workers in the pool */
  activeWorkers: number;
  /** Total events published on the event bus */
  totalEventsPublished: number;
  /** Active on-chain listeners */
  activeListeners: number;
  /** Average job execution time in ms */
  avgExecutionTimeMs: number;
}

// ============================================================================
// Scheduler Events
// ============================================================================

/** Event types emitted by the scheduler itself */
export type SchedulerEventType =
  | 'job.registered'
  | 'job.triggered'
  | 'job.completed'
  | 'job.failed'
  | 'job.retrying'
  | 'job.dead'
  | 'job.paused'
  | 'job.cancelled'
  | 'worker.started'
  | 'worker.stopped'
  | 'listener.registered'
  | 'listener.event_detected';

/** A scheduler lifecycle event */
export interface SchedulerEvent {
  /** Event type */
  type: SchedulerEventType;
  /** Timestamp */
  timestamp: Date;
  /** Related job ID */
  jobId?: string;
  /** Related agent ID */
  agentId?: string;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Handler for scheduler events */
export type SchedulerEventHandler = (event: SchedulerEvent) => void;

/** Unsubscribe function */
export type SchedulerUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for scheduler operations */
export type DistributedSchedulerErrorCode =
  | 'JOB_NOT_FOUND'
  | 'JOB_ALREADY_EXISTS'
  | 'LISTENER_NOT_FOUND'
  | 'QUEUE_FULL'
  | 'INVALID_CRON_EXPRESSION'
  | 'INVALID_EXECUTION_MODE'
  | 'WORKER_POOL_EXHAUSTED'
  | 'EXECUTION_TIMEOUT'
  | 'SCHEDULER_DISABLED'
  | 'SCHEDULER_NOT_RUNNING';

/** Structured error for scheduler operations */
export class DistributedSchedulerError extends Error {
  constructor(
    message: string,
    public readonly code: DistributedSchedulerErrorCode,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DistributedSchedulerError';
  }
}

// ============================================================================
// API Layer Types
// ============================================================================

/** Standard API request wrapper (framework-agnostic) */
export interface SchedulerApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/** Standard API response envelope */
export interface SchedulerApiResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
  };
}
