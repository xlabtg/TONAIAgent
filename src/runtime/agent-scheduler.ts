/**
 * TONAIAgent - Agent Scheduler
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Manages scheduling of agent execution cycles on configurable intervals.
 * Supports multiple agents running in parallel with independent schedules.
 */

import type {
  AgentRuntimeState,
  ExecutionInterval,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeUnsubscribe,
  ScheduledAgent,
  SchedulerConfig,
} from './types';
import { RuntimeError } from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrentExecutions: 100,
  minIntervalMs: 1000,      // 1 second minimum
  maxIntervalMs: 3600000,   // 1 hour maximum
  enableDriftCompensation: true,
  executionTimeoutMs: 30000, // 30 seconds
};

// ============================================================================
// Interval Utilities
// ============================================================================

/**
 * Convert an ExecutionInterval to milliseconds.
 */
export function intervalToMs(interval: ExecutionInterval): number {
  switch (interval.unit) {
    case 'milliseconds':
      return interval.value;
    case 'seconds':
      return interval.value * 1000;
    case 'minutes':
      return interval.value * 60 * 1000;
    default:
      return interval.value * 1000; // Default to seconds
  }
}

/**
 * Parse an interval string like "10s", "5m", "1000ms" to ExecutionInterval.
 */
export function parseInterval(input: string): ExecutionInterval {
  const match = input.match(/^(\d+)(ms|s|m)$/);
  if (!match) {
    throw new RuntimeError(
      `Invalid interval format: ${input}. Expected format: 10s, 5m, or 1000ms`,
      'CONFIGURATION_ERROR',
      { input }
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as 'ms' | 's' | 'm';

  const unitMap: Record<string, ExecutionInterval['unit']> = {
    ms: 'milliseconds',
    s: 'seconds',
    m: 'minutes',
  };

  return {
    value,
    unit: unitMap[unit],
  };
}

// ============================================================================
// Agent Scheduler
// ============================================================================

/**
 * AgentScheduler - Manages execution scheduling for multiple agents.
 *
 * Features:
 * - Configurable execution intervals (seconds, minutes, milliseconds)
 * - Drift compensation for accurate timing
 * - Concurrent execution limits
 * - Graceful pause/resume/stop
 *
 * @example
 * ```typescript
 * const scheduler = new AgentScheduler();
 * scheduler.start();
 *
 * // Schedule an agent to run every 10 seconds
 * scheduler.scheduleAgent('agent-001', { value: 10, unit: 'seconds' }, async () => {
 *   console.log('Executing agent-001');
 * });
 *
 * // Pause an agent
 * scheduler.pauseAgent('agent-001');
 *
 * // Resume an agent
 * scheduler.resumeAgent('agent-001');
 *
 * // Unschedule an agent
 * scheduler.unscheduleAgent('agent-001');
 *
 * scheduler.stop();
 * ```
 */
export class AgentScheduler {
  private readonly config: SchedulerConfig;
  private readonly scheduledAgents = new Map<string, ScheduledAgent>();
  private readonly executionCallbacks = new Map<string, () => Promise<void>>();
  private readonly eventHandlers = new Set<RuntimeEventHandler>();
  private running = false;
  private currentExecutions = 0;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the scheduler.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.emitEvent('scheduler.started', undefined, {
      maxConcurrentExecutions: this.config.maxConcurrentExecutions,
    });
  }

  /**
   * Stop the scheduler and clear all scheduled agents.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    // Clear all timers
    for (const scheduled of this.scheduledAgents.values()) {
      if (scheduled.timerId) {
        clearTimeout(scheduled.timerId);
      }
    }

    this.scheduledAgents.clear();
    this.executionCallbacks.clear();

    this.emitEvent('scheduler.stopped', undefined, {});
  }

  /**
   * Check if scheduler is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Agent Scheduling
  // ============================================================================

  /**
   * Schedule an agent for periodic execution.
   */
  scheduleAgent(
    agentId: string,
    interval: ExecutionInterval,
    callback: () => Promise<void>
  ): ScheduledAgent {
    if (!this.running) {
      throw new RuntimeError(
        'Scheduler is not running. Call start() first.',
        'SCHEDULER_ERROR'
      );
    }

    const intervalMs = intervalToMs(interval);

    // Validate interval
    if (intervalMs < this.config.minIntervalMs) {
      throw new RuntimeError(
        `Interval ${intervalMs}ms is below minimum ${this.config.minIntervalMs}ms`,
        'CONFIGURATION_ERROR',
        { intervalMs, minIntervalMs: this.config.minIntervalMs }
      );
    }

    if (intervalMs > this.config.maxIntervalMs) {
      throw new RuntimeError(
        `Interval ${intervalMs}ms exceeds maximum ${this.config.maxIntervalMs}ms`,
        'CONFIGURATION_ERROR',
        { intervalMs, maxIntervalMs: this.config.maxIntervalMs }
      );
    }

    // Unschedule existing if present
    if (this.scheduledAgents.has(agentId)) {
      this.unscheduleAgent(agentId);
    }

    const now = new Date();
    const scheduled: ScheduledAgent = {
      agentId,
      intervalMs,
      nextRunAt: new Date(now.getTime() + intervalMs),
      lastRunAt: null,
      isRunning: false,
    };

    this.scheduledAgents.set(agentId, scheduled);
    this.executionCallbacks.set(agentId, callback);

    // Schedule first execution
    this.scheduleNextRun(agentId);

    return { ...scheduled };
  }

  /**
   * Unschedule an agent.
   */
  unscheduleAgent(agentId: string): boolean {
    const scheduled = this.scheduledAgents.get(agentId);
    if (!scheduled) return false;

    if (scheduled.timerId) {
      clearTimeout(scheduled.timerId);
    }

    this.scheduledAgents.delete(agentId);
    this.executionCallbacks.delete(agentId);

    return true;
  }

  /**
   * Pause an agent's scheduled executions.
   */
  pauseAgent(agentId: string): boolean {
    const scheduled = this.scheduledAgents.get(agentId);
    if (!scheduled) return false;

    if (scheduled.timerId) {
      clearTimeout(scheduled.timerId);
      scheduled.timerId = undefined;
    }

    return true;
  }

  /**
   * Resume a paused agent's scheduled executions.
   */
  resumeAgent(agentId: string): boolean {
    const scheduled = this.scheduledAgents.get(agentId);
    if (!scheduled) return false;

    // Recalculate next run time
    const now = new Date();
    scheduled.nextRunAt = new Date(now.getTime() + scheduled.intervalMs);

    this.scheduleNextRun(agentId);

    return true;
  }

  /**
   * Update an agent's execution interval.
   */
  updateInterval(agentId: string, interval: ExecutionInterval): boolean {
    const scheduled = this.scheduledAgents.get(agentId);
    if (!scheduled) return false;

    const intervalMs = intervalToMs(interval);

    // Validate
    if (intervalMs < this.config.minIntervalMs || intervalMs > this.config.maxIntervalMs) {
      throw new RuntimeError(
        `Invalid interval: ${intervalMs}ms`,
        'CONFIGURATION_ERROR'
      );
    }

    // Clear existing timer
    if (scheduled.timerId) {
      clearTimeout(scheduled.timerId);
    }

    scheduled.intervalMs = intervalMs;
    scheduled.nextRunAt = new Date(Date.now() + intervalMs);

    this.scheduleNextRun(agentId);

    return true;
  }

  /**
   * Trigger an immediate execution for an agent.
   */
  async triggerNow(agentId: string): Promise<boolean> {
    const callback = this.executionCallbacks.get(agentId);
    if (!callback) return false;

    await this.executeAgent(agentId);
    return true;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get scheduled agent info.
   */
  getScheduledAgent(agentId: string): ScheduledAgent | undefined {
    const scheduled = this.scheduledAgents.get(agentId);
    return scheduled ? { ...scheduled, timerId: undefined } : undefined;
  }

  /**
   * List all scheduled agents.
   */
  listScheduledAgents(): ScheduledAgent[] {
    return Array.from(this.scheduledAgents.values()).map((s) => ({
      ...s,
      timerId: undefined,
    }));
  }

  /**
   * Get number of currently executing agents.
   */
  getCurrentExecutionCount(): number {
    return this.currentExecutions;
  }

  /**
   * Get scheduler metrics.
   */
  getMetrics(): {
    scheduledAgents: number;
    runningAgents: number;
    currentExecutions: number;
    isRunning: boolean;
  } {
    return {
      scheduledAgents: this.scheduledAgents.size,
      runningAgents: Array.from(this.scheduledAgents.values()).filter((s) => s.isRunning).length,
      currentExecutions: this.currentExecutions,
      isRunning: this.running,
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to scheduler events.
   */
  subscribe(handler: RuntimeEventHandler): RuntimeUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private scheduleNextRun(agentId: string): void {
    const scheduled = this.scheduledAgents.get(agentId);
    if (!scheduled || !this.running) return;

    const now = Date.now();
    const targetTime = scheduled.nextRunAt.getTime();
    let delay = targetTime - now;

    // Ensure minimum delay of 0
    if (delay < 0) {
      delay = 0;
    }

    scheduled.timerId = setTimeout(() => {
      void this.executeAgent(agentId);
    }, delay);
  }

  private async executeAgent(agentId: string): Promise<void> {
    const scheduled = this.scheduledAgents.get(agentId);
    const callback = this.executionCallbacks.get(agentId);

    if (!scheduled || !callback || !this.running) return;

    // Check concurrent execution limit
    if (this.currentExecutions >= this.config.maxConcurrentExecutions) {
      // Reschedule for later
      scheduled.nextRunAt = new Date(Date.now() + 1000); // Retry in 1 second
      this.scheduleNextRun(agentId);
      return;
    }

    scheduled.isRunning = true;
    this.currentExecutions++;

    const startTime = Date.now();

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Execution timeout')),
          this.config.executionTimeoutMs
        );
      });

      await Promise.race([callback(), timeoutPromise]);
    } catch (error) {
      // Log error but continue scheduling
      this.emitEvent('cycle.failed', agentId, {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      scheduled.isRunning = false;
      this.currentExecutions--;
      scheduled.lastRunAt = new Date();

      // Calculate next run time with drift compensation
      const executionDuration = Date.now() - startTime;

      if (this.config.enableDriftCompensation) {
        // Compensate for execution time to maintain consistent intervals
        const nextDelay = Math.max(0, scheduled.intervalMs - executionDuration);
        scheduled.nextRunAt = new Date(Date.now() + nextDelay);
      } else {
        scheduled.nextRunAt = new Date(Date.now() + scheduled.intervalMs);
      }

      // Schedule next run
      if (this.running && this.scheduledAgents.has(agentId)) {
        this.scheduleNextRun(agentId);
      }
    }
  }

  private emitEvent(
    type: RuntimeEvent['type'],
    agentId: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: RuntimeEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      timestamp: new Date(),
      agentId,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AgentScheduler instance.
 */
export function createAgentScheduler(config?: Partial<SchedulerConfig>): AgentScheduler {
  return new AgentScheduler(config);
}
