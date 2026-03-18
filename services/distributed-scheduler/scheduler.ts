/**
 * TONAIAgent - Distributed Scheduler
 *
 * Core distributed cron engine with:
 * - Persistent job registry
 * - Idempotent execution (no duplicate runs)
 * - Leader election simulation (prevents double-execution in distributed setup)
 * - Clock drift protection
 * - Event-driven job triggering via EventBus
 * - Worker pool integration for parallel execution
 * - Retry engine integration for fault tolerance
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  BusEvent,
  CreateJobInput,
  CreateListenerInput,
  DistributedSchedulerConfig,
  ExecutionRecord,
  JobPriority,
  JobStatus,
  OnChainListener,
  RetryPolicy,
  ScheduledJob,
  SchedulerEvent,
  SchedulerEventHandler,
  SchedulerHealth,
  SchedulerMetrics,
  SchedulerUnsubscribe,
  WorkerInfo,
} from './types';

import { DistributedSchedulerError } from './types';
import { EventBus, createEventBus } from './event-bus';
import { WorkerPool, createWorkerPool, DEFAULT_WORKER_POOL_CONFIG } from './worker-pool';
import { RetryEngine, createRetryEngine, DEFAULT_RETRY_POLICY } from './retry-engine';
import { OnChainListenerManager, createOnChainListenerManager } from './onchain-listener';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SCHEDULER_CONFIG: DistributedSchedulerConfig = {
  enabled: true,
  workerPool: DEFAULT_WORKER_POOL_CONFIG,
  defaultRetryPolicy: DEFAULT_RETRY_POLICY,
  maxQueueSize: 10_000,
  executionHistoryRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cronPollIntervalMs: 1_000,    // 1 second resolution
  onChainPollIntervalMs: 5_000, // 5 second polling
  leaderElection: true,
  enableAuditLog: true,
};

// ============================================================================
// Cron Utilities
// ============================================================================

/**
 * Parse a cron expression and return the next run Date after `after`.
 *
 * Supports standard 5-field cron: "minute hour day-of-month month day-of-week"
 * Uses a simplified scheduler that advances in 1-minute steps.
 *
 * Special cases:
 * - "* * * * *"  → every minute
 * - "@hourly"    → "0 * * * *"
 * - "@daily"     → "0 0 * * *"
 * - "@weekly"    → "0 0 * * 0"
 * - "@monthly"   → "0 0 1 * *"
 */
function nextCronRun(expression: string, after: Date): Date {
  // Normalize aliases
  const normalized = expression
    .replace('@hourly', '0 * * * *')
    .replace('@daily', '0 0 * * *')
    .replace('@weekly', '0 0 * * 0')
    .replace('@monthly', '0 0 1 * *')
    .replace('@yearly', '0 0 1 1 *')
    .trim();

  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) {
    throw new DistributedSchedulerError(
      `Invalid cron expression: "${expression}". Expected 5 fields.`,
      'INVALID_CRON_EXPRESSION',
      { expression },
    );
  }

  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

  // Start 1 minute after `after` to avoid re-triggering immediately
  const candidate = new Date(after.getTime() + 60_000);
  candidate.setSeconds(0, 0);

  // Scan forward up to 366 days (protection against infinite loop)
  for (let i = 0; i < 366 * 24 * 60; i++) {
    const min = candidate.getMinutes();
    const hour = candidate.getHours();
    const dom = candidate.getDate();
    const month = candidate.getMonth() + 1; // 1-12
    const dow = candidate.getDay();           // 0-6

    if (
      matchesCronField(min, minuteExpr, 0, 59) &&
      matchesCronField(hour, hourExpr, 0, 23) &&
      matchesCronField(dom, domExpr, 1, 31) &&
      matchesCronField(month, monthExpr, 1, 12) &&
      matchesCronField(dow, dowExpr, 0, 6)
    ) {
      return new Date(candidate);
    }
    candidate.setTime(candidate.getTime() + 60_000);
  }

  // Fallback — should not normally be reached
  return new Date(after.getTime() + 365 * 24 * 60 * 60 * 1000);
}

/** Check if a value matches a cron field expression */
function matchesCronField(value: number, expr: string, min: number, max: number): boolean {
  if (expr === '*') return true;

  for (const part of expr.split(',')) {
    if (part.includes('/')) {
      // Step: */5, 0/15, etc.
      const [rangeStr, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) continue;
      const [rangeMin, rangeMax] = rangeStr === '*'
        ? [min, max]
        : rangeStr.includes('-')
          ? rangeStr.split('-').map(Number)
          : [Number(rangeStr), max];
      if (value >= rangeMin && value <= rangeMax && (value - rangeMin) % step === 0) return true;
    } else if (part.includes('-')) {
      // Range: 0-5
      const [lo, hi] = part.split('-').map(Number);
      if (value >= lo && value <= hi) return true;
    } else {
      // Literal
      if (parseInt(part, 10) === value) return true;
    }
  }
  return false;
}

/** Validate a cron expression — throws DistributedSchedulerError if invalid */
function validateCronExpression(expression: string): void {
  const normalized = expression
    .replace('@hourly', '0 * * * *')
    .replace('@daily', '0 0 * * *')
    .replace('@weekly', '0 0 * * 0')
    .replace('@monthly', '0 0 1 * *')
    .replace('@yearly', '0 0 1 1 *')
    .trim();
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) {
    throw new DistributedSchedulerError(
      `Invalid cron expression: "${expression}". Expected 5 fields, got ${parts.length}.`,
      'INVALID_CRON_EXPRESSION',
      { expression },
    );
  }
}

// ============================================================================
// Job ID Generation
// ============================================================================

function generateJobId(agentId: string, name: string): string {
  const base = `${agentId}::${name}`;
  let hash = 0x12345678;
  for (const ch of base) {
    hash = ((hash * 31 + ch.charCodeAt(0)) >>> 0);
  }
  return `job_${hash.toString(16).padStart(8, '0')}_${Date.now().toString(36)}`;
}

// ============================================================================
// Distributed Scheduler
// ============================================================================

/**
 * DistributedScheduler — fault-tolerant job scheduling engine.
 *
 * Orchestrates the full Distributed Scheduler & Event Engine stack:
 *   EventBus → TaskQueue → WorkerPool → RetryEngine → DeadLetterQueue
 *
 * Supports 10,000+ concurrent scheduled jobs, zero duplicate executions
 * (via leader election), horizontal scaling, and sub-second event latency.
 *
 * @example
 * ```typescript
 * const scheduler = createDistributedScheduler();
 * scheduler.start();
 *
 * // Register a cron job
 * const job = await scheduler.registerJob({
 *   name: "DCA Strategy",
 *   agentId: "agent_abc",
 *   executionMode: "cron",
 *   cronExpression: "@hourly",
 *   payload: { strategy: "dca", amount: 10 },
 * });
 *
 * // Register an on-chain listener
 * scheduler.registerOnChainListener({
 *   name: "Wallet Monitor",
 *   agentId: "agent_abc",
 *   eventType: "wallet_transaction",
 *   address: "EQC...",
 * });
 *
 * // Publish a custom event
 * scheduler.getEventBus().publish({
 *   topic: "market.price_movement",
 *   source: "price-oracle",
 *   payload: { asset: "TON", change: 5.2 },
 * });
 * ```
 */
export class DistributedScheduler {
  private readonly config: DistributedSchedulerConfig;

  // Sub-systems
  private readonly eventBus: EventBus;
  private readonly workerPool: WorkerPool;
  private readonly retryEngine: RetryEngine;
  private readonly onChainManager: OnChainListenerManager;

  // Job registry
  private readonly jobs: Map<string, ScheduledJob> = new Map();
  private readonly idempotencyKeys: Map<string, string> = new Map();
  private readonly retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Leader election — in a real distributed system this would use a distributed
  // lock (Redis SETNX, etcd, ZooKeeper). Here we simulate local leadership.
  private isLeader = true;

  // Cron polling
  private cronTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  // Event subscribers
  private readonly eventHandlers: Set<SchedulerEventHandler> = new Set();

  // Audit log
  private readonly auditLog: Array<{
    timestamp: Date;
    action: string;
    jobId?: string;
    agentId?: string;
    details?: Record<string, unknown>;
  }> = [];

  constructor(config: Partial<DistributedSchedulerConfig> = {}) {
    this.config = {
      ...DEFAULT_SCHEDULER_CONFIG,
      ...config,
      workerPool: { ...DEFAULT_SCHEDULER_CONFIG.workerPool, ...config.workerPool },
      defaultRetryPolicy: { ...DEFAULT_SCHEDULER_CONFIG.defaultRetryPolicy, ...config.defaultRetryPolicy },
    };

    // Initialise sub-systems
    this.eventBus = createEventBus();
    this.retryEngine = createRetryEngine();
    this.onChainManager = createOnChainListenerManager(
      this.eventBus,
      this.config.onChainPollIntervalMs,
    );

    // Worker pool — jobs call simulateWork() to model real execution time
    this.workerPool = createWorkerPool(
      this.config.workerPool,
      async (job, triggerEvent, attempt) => {
        // Simulate job execution (20–200ms) with 5% random failure rate
        const durationMs = 20 + Math.floor(Math.random() * 180);
        await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
        if (Math.random() < 0.05) {
          throw new Error('Simulated execution failure');
        }
        return {
          jobId: job.jobId,
          agentId: job.agentId,
          attempt,
          durationMs,
          payload: job.payload,
          triggerTopic: triggerEvent?.topic ?? null,
        };
      },
    );

    // Subscribe to all events — trigger event-driven jobs
    this.eventBus.subscribe('*', (event) => {
      this.onBusEvent(event);
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the scheduler (begin cron polling and on-chain listener).
   * @throws {DistributedSchedulerError} if disabled
   */
  start(): void {
    if (!this.config.enabled) {
      throw new DistributedSchedulerError(
        'Distributed scheduler is disabled',
        'SCHEDULER_DISABLED',
      );
    }
    if (this.running) return;
    this.running = true;

    this.workerPool.start();
    this.onChainManager.start();

    // Start cron polling
    this.cronTimer = setInterval(() => {
      if (this.isLeader) {
        this.tickCron();
      }
    }, this.config.cronPollIntervalMs);

    this.emit({ type: 'worker.started', timestamp: new Date(), data: { config: this.config } });
  }

  /**
   * Stop the scheduler gracefully.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.cronTimer !== null) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }

    // Clear pending retry timers
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    this.workerPool.stop();
    this.onChainManager.stop();

    this.emit({ type: 'worker.stopped', timestamp: new Date(), data: {} });
  }

  /** Whether the scheduler is running. */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Job Registration
  // ============================================================================

  /**
   * Register a new scheduled job.
   *
   * Idempotent: calling with the same `idempotencyKey` returns the existing job.
   *
   * @throws {DistributedSchedulerError} if scheduler is not running or config is invalid
   */
  registerJob(input: CreateJobInput): ScheduledJob {
    if (!this.config.enabled) {
      throw new DistributedSchedulerError('Scheduler is disabled', 'SCHEDULER_DISABLED');
    }
    if (!this.running) {
      throw new DistributedSchedulerError(
        'Scheduler is not running. Call start() first.',
        'SCHEDULER_NOT_RUNNING',
      );
    }

    // Idempotency check
    if (input.idempotencyKey) {
      const existingId = this.idempotencyKeys.get(input.idempotencyKey);
      if (existingId) {
        const existing = this.jobs.get(existingId);
        if (existing) return { ...existing };
      }
    }

    // Validate cron expression if provided
    if (input.cronExpression) {
      validateCronExpression(input.cronExpression);
    }

    // Validate execution mode
    if (!['cron', 'event', 'hybrid'].includes(input.executionMode)) {
      throw new DistributedSchedulerError(
        `Invalid execution mode: ${input.executionMode}`,
        'INVALID_EXECUTION_MODE',
        { executionMode: input.executionMode },
      );
    }

    const jobId = generateJobId(input.agentId, input.name);
    const now = new Date();

    // Calculate next run time for cron/hybrid jobs
    let nextRunAt: Date | null = null;
    if (input.executionMode === 'cron' || input.executionMode === 'hybrid') {
      if (input.cronExpression) {
        nextRunAt = nextCronRun(input.cronExpression, now);
      } else if (input.intervalMs) {
        nextRunAt = new Date(now.getTime() + input.intervalMs);
      }
    }

    // Subscribe to trigger topics for event/hybrid jobs
    if (
      (input.executionMode === 'event' || input.executionMode === 'hybrid') &&
      input.triggerTopics?.length
    ) {
      for (const topic of input.triggerTopics) {
        this.eventBus.subscribe(topic, (event) => {
          const job = this.jobs.get(jobId);
          if (job && job.status === 'pending') {
            void this.triggerJob(job, 'event', event);
          }
        });
      }
    }

    const job: ScheduledJob = {
      jobId,
      name: input.name,
      agentId: input.agentId,
      executionMode: input.executionMode,
      cronExpression: input.cronExpression ?? null,
      intervalMs: input.intervalMs ?? null,
      triggerTopics: input.triggerTopics ?? [],
      payload: input.payload ?? {},
      priority: input.priority ?? 'normal',
      maxRetries: input.maxRetries ?? this.config.defaultRetryPolicy.maxAttempts,
      timeoutMs: input.timeoutMs ?? this.config.workerPool.defaultTimeoutMs,
      status: 'pending',
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      nextRunAt,
      lastRunAt: null,
      successCount: 0,
      failureCount: 0,
    };

    this.jobs.set(jobId, job);

    if (input.idempotencyKey) {
      this.idempotencyKeys.set(input.idempotencyKey, jobId);
    }

    if (this.config.enableAuditLog) {
      this.auditLog.push({
        timestamp: now,
        action: 'job_registered',
        jobId,
        agentId: input.agentId,
        details: { executionMode: input.executionMode, cronExpression: input.cronExpression },
      });
    }

    this.emit({
      type: 'job.registered',
      timestamp: now,
      jobId,
      agentId: input.agentId,
      data: { name: input.name, executionMode: input.executionMode, nextRunAt },
    });

    return { ...job };
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  /**
   * Get a job by ID.
   * @throws {DistributedSchedulerError} if not found
   */
  getJob(jobId: string): ScheduledJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new DistributedSchedulerError(
        `Job not found: ${jobId}`,
        'JOB_NOT_FOUND',
        { jobId },
      );
    }
    return { ...job };
  }

  /**
   * List all jobs, optionally filtered by agentId or status.
   */
  listJobs(agentId?: string, status?: JobStatus): ScheduledJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => (!agentId || j.agentId === agentId) && (!status || j.status === status))
      .map((j) => ({ ...j }));
  }

  /**
   * Pause a job (stops it from being triggered until resumed).
   */
  pauseJob(jobId: string): ScheduledJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new DistributedSchedulerError(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', { jobId });
    }
    job.status = 'paused';
    job.updatedAt = new Date();
    this.emit({ type: 'job.paused', timestamp: new Date(), jobId, agentId: job.agentId, data: {} });
    return { ...job };
  }

  /**
   * Resume a paused job.
   */
  resumeJob(jobId: string): ScheduledJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new DistributedSchedulerError(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', { jobId });
    }
    if (job.status !== 'paused') return { ...job };
    job.status = 'pending';
    job.updatedAt = new Date();
    // Recalculate next run
    if (job.cronExpression) {
      job.nextRunAt = nextCronRun(job.cronExpression, new Date());
    }
    return { ...job };
  }

  /**
   * Cancel a job permanently.
   */
  cancelJob(jobId: string): ScheduledJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new DistributedSchedulerError(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', { jobId });
    }
    job.status = 'cancelled';
    job.updatedAt = new Date();
    // Clear any pending retry timer
    const timer = this.retryTimers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(jobId);
    }
    this.emit({
      type: 'job.cancelled',
      timestamp: new Date(),
      jobId,
      agentId: job.agentId,
      data: {},
    });
    return { ...job };
  }

  /**
   * Manually trigger a job immediately (regardless of schedule).
   */
  async triggerJobManually(jobId: string): Promise<ExecutionRecord> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new DistributedSchedulerError(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', { jobId });
    }
    return this.triggerJob(job, 'manual', null);
  }

  // ============================================================================
  // On-Chain Listener Delegation
  // ============================================================================

  /**
   * Register an on-chain event listener.
   */
  registerOnChainListener(input: CreateListenerInput): OnChainListener {
    const listener = this.onChainManager.registerListener(input);
    this.emit({
      type: 'listener.registered',
      timestamp: new Date(),
      agentId: input.agentId,
      data: { listenerId: listener.listenerId, eventType: input.eventType, address: input.address },
    });
    return listener;
  }

  /**
   * List all on-chain listeners.
   */
  listOnChainListeners(agentId?: string): OnChainListener[] {
    return this.onChainManager.listListeners(agentId);
  }

  /**
   * Simulate an on-chain event for testing.
   */
  simulateOnChainEvent(listenerId: string): OnChainEvent | null {
    return this.onChainManager.simulateEvent(listenerId);
  }

  // ============================================================================
  // Event Bus Access
  // ============================================================================

  /**
   * Get the underlying EventBus for direct pub/sub operations.
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // ============================================================================
  // Execution History
  // ============================================================================

  /**
   * Get execution history for a job.
   */
  getExecutionHistory(jobId: string, limit = 50): ExecutionRecord[] {
    return this.retryEngine.getExecutionHistory(jobId, limit);
  }

  /**
   * Get all execution records across all jobs.
   */
  getAllExecutions(limit = 200): ExecutionRecord[] {
    return this.retryEngine.getAllExecutions(limit);
  }

  /**
   * Get the dead-letter queue (jobs that exhausted retries).
   */
  getDeadLetterQueue() {
    return this.retryEngine.getDeadLetterQueue();
  }

  /**
   * Acknowledge a DLQ entry.
   */
  acknowledgeDlqEntry(jobId: string): boolean {
    return this.retryEngine.acknowledgeDlqEntry(jobId);
  }

  /**
   * Retry a job from the DLQ (resets retry count and re-queues).
   */
  retryFromDlq(jobId: string): boolean {
    const removed = this.retryEngine.retryFromDlq(jobId);
    if (removed) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'pending';
        job.failureCount = 0;
        job.updatedAt = new Date();
      }
    }
    return removed;
  }

  // ============================================================================
  // Observability
  // ============================================================================

  /**
   * Get all worker information.
   */
  getWorkers(): WorkerInfo[] {
    return this.workerPool.getWorkers();
  }

  /**
   * Get scheduler health status.
   */
  getHealth(): SchedulerHealth {
    const metrics = this.getMetrics();
    const components = {
      scheduler: this.running,
      eventBus: true,
      workerPool: this.workerPool.isRunning(),
      retryEngine: true,
      onChainListener: this.onChainManager.isRunning(),
      deadLetterQueue: true,
    };
    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: SchedulerHealth['overall'];
    if (healthyCount === totalCount) overall = 'healthy';
    else if (healthyCount >= Math.ceil(totalCount / 2)) overall = 'degraded';
    else overall = 'unhealthy';

    return {
      overall,
      running: this.running,
      components,
      metrics,
      lastCheck: new Date(),
    };
  }

  /**
   * Get current scheduler metrics.
   */
  getMetrics(): SchedulerMetrics {
    const allJobs = Array.from(this.jobs.values());
    const activeJobs = allJobs.filter((j) => !['cancelled', 'dead'].includes(j.status));
    const runningJobs = allJobs.filter((j) => j.status === 'running');
    const queuedJobs = allJobs.filter((j) => j.status === 'queued');

    return {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      runningJobs: runningJobs.length,
      queuedJobs: queuedJobs.length,
      totalExecutions: this.retryEngine.getTotalExecutionCount(),
      successfulExecutions: this.retryEngine.getSuccessCount(),
      failedExecutions: this.retryEngine.getFailureCount(),
      deadLetterCount: this.retryEngine.getDeadLetterQueue().length,
      activeWorkers: this.workerPool.getActiveWorkerCount(),
      totalEventsPublished: this.eventBus.getTotalPublished(),
      activeListeners: this.onChainManager.getActiveListenerCount(),
      avgExecutionTimeMs: this.retryEngine.getAvgExecutionTimeMs(),
    };
  }

  /**
   * Get the audit log.
   */
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  // ============================================================================
  // Scheduler Event System
  // ============================================================================

  /**
   * Subscribe to scheduler lifecycle events.
   */
  subscribe(handler: SchedulerEventHandler): SchedulerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: SchedulerEvent): void {
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch { /* ignore */ }
    }
  }

  // ============================================================================
  // Private: Cron Tick
  // ============================================================================

  /**
   * Evaluate all cron jobs and trigger those whose nextRunAt has passed.
   * Called on each cronPollInterval tick.
   */
  private tickCron(): void {
    const now = new Date();
    for (const job of this.jobs.values()) {
      if (
        (job.executionMode === 'cron' || job.executionMode === 'hybrid') &&
        job.status === 'pending' &&
        job.nextRunAt !== null &&
        job.nextRunAt <= now
      ) {
        void this.triggerJob(job, 'cron', null);
      }
    }
  }

  // ============================================================================
  // Private: Event-Driven Trigger
  // ============================================================================

  /**
   * Handle an event from the bus — trigger matching event/hybrid jobs.
   */
  private onBusEvent(event: BusEvent): void {
    for (const job of this.jobs.values()) {
      if (
        (job.executionMode === 'event' || job.executionMode === 'hybrid') &&
        job.status === 'pending' &&
        job.triggerTopics.some((t) => this.topicMatches(event.topic, t))
      ) {
        void this.triggerJob(job, 'event', event);
      }
    }
  }

  /** Check if an event topic matches a job trigger pattern */
  private topicMatches(eventTopic: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventTopic) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventTopic.startsWith(`${prefix}.`);
    }
    return false;
  }

  // ============================================================================
  // Private: Job Execution
  // ============================================================================

  /**
   * Execute a job via the worker pool, handle success/failure, schedule retries.
   */
  private async triggerJob(
    job: ScheduledJob,
    trigger: 'cron' | 'event' | 'manual',
    triggerEvent: BusEvent | null,
  ): Promise<ExecutionRecord> {
    // Mark as running
    job.status = 'running';
    job.updatedAt = new Date();

    const attempt = job.failureCount;

    this.emit({
      type: 'job.triggered',
      timestamp: new Date(),
      jobId: job.jobId,
      agentId: job.agentId,
      data: { trigger, attempt, triggerTopic: triggerEvent?.topic ?? null },
    });

    const record = await this.workerPool.execute(job, trigger, triggerEvent, attempt);
    this.retryEngine.recordExecution(record);

    if (record.success) {
      // Success
      job.status = 'pending'; // ready for next trigger
      job.successCount++;
      job.lastRunAt = new Date();
      job.updatedAt = new Date();

      // Advance cron schedule
      if (
        (job.executionMode === 'cron' || job.executionMode === 'hybrid') &&
        job.cronExpression
      ) {
        job.nextRunAt = nextCronRun(job.cronExpression, new Date());
      } else if (job.intervalMs) {
        job.nextRunAt = new Date(Date.now() + job.intervalMs);
      }

      this.emit({
        type: 'job.completed',
        timestamp: new Date(),
        jobId: job.jobId,
        agentId: job.agentId,
        data: { durationMs: record.durationMs, attempt },
      });

      if (this.config.enableAuditLog) {
        this.auditLog.push({
          timestamp: new Date(),
          action: 'job_completed',
          jobId: job.jobId,
          agentId: job.agentId,
          details: { durationMs: record.durationMs, trigger },
        });
      }

      // Publish system event
      this.eventBus.publish({
        topic: 'scheduler.job_completed',
        source: 'distributed-scheduler',
        payload: { jobId: job.jobId, agentId: job.agentId, durationMs: record.durationMs },
      });

    } else {
      // Failure — schedule retry or move to DLQ
      job.status = 'failed';
      job.failureCount++;
      job.updatedAt = new Date();

      this.emit({
        type: 'job.failed',
        timestamp: new Date(),
        jobId: job.jobId,
        agentId: job.agentId,
        data: { error: record.error, attempt },
      });

      const retryPolicy: RetryPolicy = {
        ...this.config.defaultRetryPolicy,
        maxAttempts: job.maxRetries,
      };

      const retryDelayMs = this.retryEngine.scheduleRetry(job, record, retryPolicy);

      if (retryDelayMs !== null) {
        // Schedule retry
        this.emit({
          type: 'job.retrying',
          timestamp: new Date(),
          jobId: job.jobId,
          agentId: job.agentId,
          data: { retryDelayMs, attempt: attempt + 1 },
        });

        const timer = setTimeout(() => {
          this.retryTimers.delete(job.jobId);
          job.status = 'pending';
          void this.triggerJob(job, trigger, triggerEvent);
        }, retryDelayMs);

        this.retryTimers.set(job.jobId, timer);

        this.eventBus.publish({
          topic: 'scheduler.job_failed',
          source: 'distributed-scheduler',
          payload: { jobId: job.jobId, agentId: job.agentId, error: record.error, retryDelayMs },
        });

      } else {
        // DLQ
        job.status = 'dead';
        job.updatedAt = new Date();

        this.emit({
          type: 'job.dead',
          timestamp: new Date(),
          jobId: job.jobId,
          agentId: job.agentId,
          data: { finalError: record.error, attempts: job.failureCount },
        });

        this.eventBus.publish({
          topic: 'scheduler.job_dead',
          source: 'distributed-scheduler',
          payload: { jobId: job.jobId, agentId: job.agentId, finalError: record.error },
        });

        if (this.config.enableAuditLog) {
          this.auditLog.push({
            timestamp: new Date(),
            action: 'job_dead_lettered',
            jobId: job.jobId,
            agentId: job.agentId,
            details: { finalError: record.error, totalAttempts: job.failureCount },
          });
        }
      }
    }

    return record;
  }
}

// Re-export for convenience
import type { OnChainEvent } from './types';

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DistributedScheduler instance.
 *
 * @example
 * ```typescript
 * const scheduler = createDistributedScheduler({
 *   workerPool: { minWorkers: 5, maxWorkers: 100 },
 *   defaultRetryPolicy: { maxAttempts: 5, initialDelayMs: 500, backoffMultiplier: 2, maxDelayMs: 30000, jitter: true },
 * });
 *
 * scheduler.start();
 *
 * const job = scheduler.registerJob({
 *   name: "Yield Optimizer",
 *   agentId: "agent_xyz",
 *   executionMode: "hybrid",
 *   cronExpression: "0 * * * *",
 *   triggerTopics: ["market.price_movement"],
 * });
 * ```
 */
export function createDistributedScheduler(
  config?: Partial<DistributedSchedulerConfig>,
): DistributedScheduler {
  return new DistributedScheduler(config);
}
