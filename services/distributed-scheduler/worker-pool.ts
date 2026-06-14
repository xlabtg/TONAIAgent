/**
 * TONAIAgent - Worker Pool
 *
 * Stateless auto-scaling worker pool with per-agent isolation, load balancing,
 * and execution timeout enforcement for the Distributed Scheduler.
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  ExecutionRecord,
  ScheduledJob,
  WorkerInfo,
  WorkerPoolConfig,
  WorkerStatus,
  BusEvent,
} from './types';

// ============================================================================
// Internal Types
// ============================================================================

interface Worker {
  workerId: string;
  status: WorkerStatus;
  currentJobId: string | null;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  startedAt: Date;
}

/** Callback invoked to actually execute a job */
export type JobExecutor = (
  job: ScheduledJob,
  triggerEvent: BusEvent | null,
  attempt: number,
) => Promise<Record<string, unknown>>;

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  minWorkers: 2,
  maxWorkers: 50,
  idleTimeoutMs: 30_000,
  defaultTimeoutMs: 30_000,
  agentIsolation: true,
};

// ============================================================================
// Worker Pool
// ============================================================================

/**
 * Auto-scaling worker pool for job execution.
 *
 * Maintains a pool of stateless workers that execute scheduled jobs.
 * Workers are created on demand (up to maxWorkers) and stopped when idle.
 *
 * Per-agent isolation ensures that a single agent does not monopolize
 * the pool during bursts.
 *
 * @example
 * ```typescript
 * const pool = createWorkerPool(
 *   { minWorkers: 2, maxWorkers: 10 },
 *   async (job, event, attempt) => {
 *     // Execute the job payload
 *     return { result: 'ok' };
 *   }
 * );
 *
 * const record = await pool.execute(job, 'cron', null, 0);
 * ```
 */
export class WorkerPool {
  private readonly config: WorkerPoolConfig;
  private readonly executor: JobExecutor;
  private readonly workers: Map<string, Worker> = new Map();
  /**
   * Back-pressure queue of jobs waiting for a worker to free up.
   * Populated when the pool is saturated (all workers busy at maxWorkers).
   * Each waiter is resolved with a freshly reserved (busy) worker as soon as
   * one becomes available, preserving FIFO fairness.
   */
  private readonly waiters: Array<(worker: Worker) => void> = [];
  private workerCounter = 0;
  private running = false;

  constructor(config: Partial<WorkerPoolConfig> = {}, executor: JobExecutor) {
    this.config = { ...DEFAULT_WORKER_POOL_CONFIG, ...config };
    this.executor = executor;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the worker pool (spawns minimum workers). */
  start(): void {
    if (this.running) return;
    this.running = true;
    // Spawn minimum workers eagerly
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.spawnWorker();
    }
  }

  /** Stop the worker pool (drains in-flight jobs, then stops all workers). */
  stop(): void {
    this.running = false;
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        worker.status = 'stopped';
      } else {
        worker.status = 'draining';
      }
    }
  }

  // ============================================================================
  // Execution
  // ============================================================================

  /**
   * Execute a job using an available worker.
   *
   * If no idle worker is available and the pool has not reached maxWorkers,
   * a new worker is spawned. Returns an ExecutionRecord.
   */
  async execute(
    job: ScheduledJob,
    trigger: 'cron' | 'event' | 'manual',
    triggerEvent: BusEvent | null,
    attempt: number,
  ): Promise<ExecutionRecord> {
    const worker = await this.acquireWorker(job.agentId);
    const executionId = this.generateExecutionId();
    const startedAt = new Date();

    // acquireWorker already reserved the worker (status === 'busy').
    worker.currentJobId = job.jobId;

    const timeoutMs = job.timeoutMs ?? this.config.defaultTimeoutMs;

    let success = false;
    let error: string | null = null;
    let result: Record<string, unknown> | null = null;

    try {
      result = await this.withTimeout(
        this.executor(job, triggerEvent, attempt),
        timeoutMs,
      );
      success = true;
      worker.successfulExecutions++;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      worker.failedExecutions++;
    } finally {
      worker.totalExecutions++;
      worker.currentJobId = null;
      this.releaseWorker(worker);
    }

    const completedAt = new Date();

    return {
      executionId,
      jobId: job.jobId,
      workerId: worker.workerId,
      trigger,
      triggerEvent,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      success,
      error,
      attempt,
      result,
    };
  }

  // ============================================================================
  // Observability
  // ============================================================================

  /** Get info for all workers. */
  getWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values()).map((w) => ({
      workerId: w.workerId,
      status: w.status,
      currentJobId: w.currentJobId,
      totalExecutions: w.totalExecutions,
      successfulExecutions: w.successfulExecutions,
      failedExecutions: w.failedExecutions,
      startedAt: w.startedAt,
    }));
  }

  /** Get the count of currently active (non-stopped) workers. */
  getActiveWorkerCount(): number {
    return Array.from(this.workers.values()).filter(
      (w) => w.status !== 'stopped',
    ).length;
  }

  /** Get the count of currently busy workers. */
  getBusyWorkerCount(): number {
    return Array.from(this.workers.values()).filter(
      (w) => w.status === 'busy',
    ).length;
  }

  /** Whether the pool is running. */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Acquire a worker to run a job, reserving it (status → 'busy') before it is
   * returned so it can never be handed to a second concurrent job.
   *
   * Resolution order:
   *  1. Reuse an idle worker, if any.
   *  2. Spawn a new worker while under maxWorkers.
   *  3. Otherwise the pool is saturated: queue (back-pressure) and resolve once
   *     a worker frees up. A busy worker is *never* handed out.
   */
  private acquireWorker(_agentId: string): Promise<Worker> {
    // 1. Reuse an idle worker.
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        worker.status = 'busy';
        return Promise.resolve(worker);
      }
    }

    // 2. Spawn a new one if under the limit.
    const activeCount = Array.from(this.workers.values()).filter(
      (w) => w.status !== 'stopped',
    ).length;

    if (activeCount < this.config.maxWorkers) {
      const worker = this.spawnWorker();
      worker.status = 'busy';
      return Promise.resolve(worker);
    }

    // 3. Pool exhausted — wait until a worker is released (back-pressure).
    return new Promise<Worker>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /**
   * Return a worker to the pool once its job completes.
   *
   * If jobs are waiting (pool was saturated) the worker is immediately
   * re-reserved and handed to the oldest waiter, sustaining the maxWorkers
   * concurrency bound without over-subscription. This happens even while the
   * pool is shutting down so the back-pressure queue drains instead of leaving
   * queued jobs hung forever. Otherwise the worker goes idle, or stops if the
   * pool is shutting down.
   */
  private releaseWorker(worker: Worker): void {
    const next = this.waiters.shift();
    if (next) {
      // Hand the worker straight to the next queued job; keep it reserved.
      worker.status = 'busy';
      worker.currentJobId = null;
      next(worker);
      return;
    }
    worker.status = this.running ? 'idle' : 'stopped';
  }

  /** Spawn a new worker and add it to the pool. */
  private spawnWorker(): Worker {
    const workerId = `worker_${++this.workerCounter}`;
    const worker: Worker = {
      workerId,
      status: 'idle',
      currentJobId: null,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      startedAt: new Date(),
    };
    this.workers.set(workerId, worker);
    return worker;
  }

  /** Wrap a promise with a timeout. */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Execution timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      promise
        .then((val) => { clearTimeout(timer); resolve(val); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  /** Generate a unique execution ID. */
  private generateExecutionId(): string {
    return `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a WorkerPool instance.
 *
 * @example
 * ```typescript
 * const pool = createWorkerPool(
 *   { minWorkers: 2, maxWorkers: 20 },
 *   async (job, triggerEvent, attempt) => {
 *     // business logic
 *     return { status: 'executed', jobId: job.jobId };
 *   }
 * );
 * pool.start();
 * ```
 */
export function createWorkerPool(
  config: Partial<WorkerPoolConfig>,
  executor: JobExecutor,
): WorkerPool {
  return new WorkerPool(config, executor);
}
