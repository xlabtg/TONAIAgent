/**
 * TONAIAgent - Retry Engine & Dead-Letter Queue
 *
 * Exponential backoff retry engine with jitter, dead-letter queue (DLQ),
 * and alerting hooks for failed job executions.
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  DeadLetterEntry,
  ExecutionRecord,
  RetryPolicy,
  ScheduledJob,
} from './types';

// ============================================================================
// Default Retry Policy
// ============================================================================

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1_000,
  backoffMultiplier: 2,
  maxDelayMs: 60_000,
  jitter: true,
};

// ============================================================================
// Execution-History Retention
// ============================================================================

/** Default retention window for execution history (7 days). */
export const DEFAULT_EXECUTION_HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hard cap on the number of execution records kept per job. Acts as a second
 * guard so a single, frequently-retried job cannot accumulate an unbounded
 * number of records within the retention window.
 */
export const DEFAULT_MAX_EXECUTION_HISTORY_PER_JOB = 1_000;

/** Options controlling how the retry engine retains execution history. */
export interface RetryEngineOptions {
  /**
   * Records whose `startedAt` is older than this many milliseconds are pruned
   * on insert. Set to 0 (or a negative value) to disable age-based pruning.
   */
  executionHistoryRetentionMs?: number;
  /**
   * Maximum number of execution records kept per job. Older records are
   * dropped once this limit is exceeded. Set to 0 (or a negative value) to
   * disable count-based pruning.
   */
  maxExecutionHistoryPerJob?: number;
}

// ============================================================================
// Retry Engine
// ============================================================================

/**
 * Manages retry scheduling and dead-letter queue (DLQ) for failed jobs.
 *
 * On each failure:
 *   1. Calculates next retry delay using exponential backoff with optional jitter.
 *   2. Schedules the retry by returning a delay in ms (caller sets a timer).
 *   3. After maxAttempts exhausted, moves the job to the DLQ.
 *
 * @example
 * ```typescript
 * const engine = createRetryEngine();
 *
 * // On job failure:
 * const delay = engine.scheduleRetry(job, record, policy);
 * if (delay === null) {
 *   // No more retries — job is now in DLQ
 *   const dlq = engine.getDeadLetterQueue();
 * }
 * ```
 */
export class RetryEngine {
  /** job ID -> list of execution records */
  private readonly executionHistory: Map<string, ExecutionRecord[]> = new Map();

  /** Dead-letter queue entries */
  private readonly deadLetterQueue: Map<string, DeadLetterEntry> = new Map();

  private dlqCounter = 0;

  /** How long execution records are retained before being pruned (ms). */
  private readonly executionHistoryRetentionMs: number;

  /** Hard cap on the number of execution records kept per job. */
  private readonly maxExecutionHistoryPerJob: number;

  constructor(options: RetryEngineOptions = {}) {
    this.executionHistoryRetentionMs =
      options.executionHistoryRetentionMs ?? DEFAULT_EXECUTION_HISTORY_RETENTION_MS;
    this.maxExecutionHistoryPerJob =
      options.maxExecutionHistoryPerJob ?? DEFAULT_MAX_EXECUTION_HISTORY_PER_JOB;
  }

  // ============================================================================
  // Retry Scheduling
  // ============================================================================

  /**
   * Record a completed execution attempt (success or failure).
   *
   * Applies the configured retention policy on insert so per-job history stays
   * bounded by age (`executionHistoryRetentionMs`) and count
   * (`maxExecutionHistoryPerJob`) — preventing unbounded memory growth for
   * recurring/retried jobs that reuse a `jobId`.
   */
  recordExecution(record: ExecutionRecord): void {
    const history = this.executionHistory.get(record.jobId) ?? [];
    history.push(record);
    this.executionHistory.set(record.jobId, this.pruneHistory(history));
  }

  /**
   * Prune execution records that fall outside the retention window or exceed
   * the per-job count cap. Pruning is relative to the most recent record so it
   * behaves deterministically regardless of wall-clock time.
   */
  private pruneHistory(history: ExecutionRecord[]): ExecutionRecord[] {
    let pruned = history;

    // Age-based pruning: drop records older than the retention window, measured
    // from the newest record's start time (the latest known activity).
    if (this.executionHistoryRetentionMs > 0 && pruned.length > 0) {
      let newest = pruned[0].startedAt.getTime();
      for (const r of pruned) {
        const t = r.startedAt.getTime();
        if (t > newest) newest = t;
      }
      const cutoff = newest - this.executionHistoryRetentionMs;
      pruned = pruned.filter((r) => r.startedAt.getTime() >= cutoff);
    }

    // Count-based pruning: keep only the most recent N records.
    if (this.maxExecutionHistoryPerJob > 0 && pruned.length > this.maxExecutionHistoryPerJob) {
      pruned = pruned.slice(pruned.length - this.maxExecutionHistoryPerJob);
    }

    return pruned;
  }

  /**
   * Remove execution records older than the retention window across all jobs.
   * Intended for a periodic sweep; insert-time pruning already keeps active
   * jobs bounded, but this also reclaims memory for idle jobs that stopped
   * recording. Returns the number of records evicted.
   */
  sweepExecutionHistory(now: Date = new Date()): number {
    if (this.executionHistoryRetentionMs <= 0) return 0;
    const cutoff = now.getTime() - this.executionHistoryRetentionMs;
    let evicted = 0;
    for (const [jobId, history] of this.executionHistory) {
      const kept = history.filter((r) => r.startedAt.getTime() >= cutoff);
      evicted += history.length - kept.length;
      if (kept.length === 0) {
        this.executionHistory.delete(jobId);
      } else if (kept.length !== history.length) {
        this.executionHistory.set(jobId, kept);
      }
    }
    return evicted;
  }

  /**
   * Determine whether a job should be retried and calculate the delay.
   *
   * Returns the delay in ms before the next retry, or null if the job
   * has exhausted all attempts and should be moved to the DLQ.
   */
  scheduleRetry(
    job: ScheduledJob,
    failedRecord: ExecutionRecord,
    policy: RetryPolicy,
  ): number | null {
    const history = this.executionHistory.get(job.jobId) ?? [];
    const failedAttempts = history.filter((r) => !r.success).length;

    if (failedAttempts >= policy.maxAttempts) {
      // Exhausted — move to DLQ
      this.moveToDeadLetter(job, history, failedRecord.error ?? 'Unknown error');
      return null;
    }

    // Exponential backoff: delay = initialDelay * multiplier^(attempt-1)
    const delay = this.calculateDelay(failedAttempts, policy);
    return delay;
  }

  /**
   * Calculate retry delay with exponential backoff and optional jitter.
   */
  calculateDelay(attempt: number, policy: RetryPolicy): number {
    const base = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
    const capped = Math.min(base, policy.maxDelayMs);
    if (!policy.jitter) return capped;
    // Equal jitter: delay in [capped/2, capped), so the lower bound grows with attempt
    const half = capped / 2;
    return Math.floor(half + Math.random() * half);
  }

  // ============================================================================
  // Dead-Letter Queue
  // ============================================================================

  /**
   * Move a permanently failed job to the dead-letter queue.
   */
  private moveToDeadLetter(
    job: ScheduledJob,
    attempts: ExecutionRecord[],
    finalError: string,
  ): void {
    const dlqId = `dlq_${++this.dlqCounter}_${job.jobId}`;
    const entry: DeadLetterEntry = {
      dlqId,
      jobId: job.jobId,
      attempts: [...attempts],
      finalError,
      deadAt: new Date(),
      acknowledged: false,
    };
    this.deadLetterQueue.set(job.jobId, entry);
  }

  /**
   * Get all entries in the dead-letter queue.
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Get the DLQ entry for a specific job.
   */
  getDeadLetterEntry(jobId: string): DeadLetterEntry | undefined {
    return this.deadLetterQueue.get(jobId);
  }

  /**
   * Acknowledge a DLQ entry (mark as reviewed by an operator).
   * Returns true if the entry was found and acknowledged.
   */
  acknowledgeDlqEntry(jobId: string): boolean {
    const entry = this.deadLetterQueue.get(jobId);
    if (!entry) return false;
    entry.acknowledged = true;
    return true;
  }

  /**
   * Retry a DLQ entry — remove it from the DLQ so the scheduler can re-queue the job.
   * Returns true if the entry was found and removed.
   */
  retryFromDlq(jobId: string): boolean {
    if (!this.deadLetterQueue.has(jobId)) return false;
    this.deadLetterQueue.delete(jobId);
    // Clear execution history so retry count resets
    this.executionHistory.delete(jobId);
    return true;
  }

  // ============================================================================
  // Execution History
  // ============================================================================

  /**
   * Get execution history for a job.
   */
  getExecutionHistory(jobId: string, limit = 50): ExecutionRecord[] {
    const history = this.executionHistory.get(jobId) ?? [];
    return history.slice(-limit);
  }

  /**
   * Get all execution records (across all jobs), newest first.
   */
  getAllExecutions(limit = 200): ExecutionRecord[] {
    const all: ExecutionRecord[] = [];
    for (const records of this.executionHistory.values()) {
      all.push(...records);
    }
    return all
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Count total executions tracked.
   */
  getTotalExecutionCount(): number {
    let total = 0;
    for (const records of this.executionHistory.values()) {
      total += records.length;
    }
    return total;
  }

  /**
   * Count successful executions.
   */
  getSuccessCount(): number {
    let count = 0;
    for (const records of this.executionHistory.values()) {
      count += records.filter((r) => r.success).length;
    }
    return count;
  }

  /**
   * Count failed executions.
   */
  getFailureCount(): number {
    let count = 0;
    for (const records of this.executionHistory.values()) {
      count += records.filter((r) => !r.success).length;
    }
    return count;
  }

  /**
   * Average execution time across all successful executions.
   */
  getAvgExecutionTimeMs(): number {
    const records: ExecutionRecord[] = [];
    for (const r of this.executionHistory.values()) {
      records.push(...r.filter((x) => x.success && x.durationMs !== null));
    }
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + (r.durationMs ?? 0), 0);
    return Math.round(total / records.length);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a RetryEngine instance.
 */
export function createRetryEngine(options: RetryEngineOptions = {}): RetryEngine {
  return new RetryEngine(options);
}
