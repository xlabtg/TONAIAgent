/**
 * TONAIAgent - Distributed Scheduler REST API
 *
 * Framework-agnostic REST API handler for the Distributed Scheduler.
 *
 * Endpoints:
 *   POST   /scheduler/jobs                          — Register a new job
 *   GET    /scheduler/jobs                          — List all jobs
 *   GET    /scheduler/jobs/:jobId                   — Get job details
 *   DELETE /scheduler/jobs/:jobId                   — Cancel a job
 *   POST   /scheduler/jobs/:jobId/trigger           — Manually trigger a job
 *   POST   /scheduler/jobs/:jobId/pause             — Pause a job
 *   POST   /scheduler/jobs/:jobId/resume            — Resume a paused job
 *   GET    /scheduler/jobs/:jobId/executions        — Job execution history
 *   POST   /scheduler/listeners                     — Register on-chain listener
 *   GET    /scheduler/listeners                     — List on-chain listeners
 *   GET    /scheduler/dlq                           — Get dead-letter queue
 *   POST   /scheduler/dlq/:jobId/acknowledge        — Acknowledge DLQ entry
 *   POST   /scheduler/dlq/:jobId/retry              — Retry from DLQ
 *   GET    /scheduler/workers                       — Worker pool status
 *   GET    /scheduler/health                        — Scheduler health check
 *   GET    /scheduler/metrics                       — Scheduler metrics
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  CreateJobInput,
  CreateListenerInput,
  DistributedSchedulerConfig,
  SchedulerApiRequest,
  SchedulerApiResponse,
} from './types';

import { DistributedSchedulerError } from './types';
import { DistributedScheduler, createDistributedScheduler } from './scheduler';

// ============================================================================
// Distributed Scheduler API
// ============================================================================

/**
 * Framework-agnostic REST API handler for the Distributed Scheduler.
 *
 * @example
 * ```typescript
 * // With Express:
 * const api = createDistributedSchedulerApi();
 * api.getScheduler().start();
 *
 * app.post('/scheduler/jobs', async (req, res) => {
 *   const result = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: req.body });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */
export class DistributedSchedulerApi {
  private readonly scheduler: DistributedScheduler;

  constructor(scheduler?: DistributedScheduler) {
    this.scheduler = scheduler ?? createDistributedScheduler();
  }

  /**
   * Handle an incoming API request.
   */
  async handle(req: SchedulerApiRequest): Promise<SchedulerApiResponse> {
    try {
      const { method, path } = req;

      // ── Job Endpoints ──────────────────────────────────────────────────────

      // POST /scheduler/jobs
      if (method === 'POST' && this.matchPath(path, '/scheduler/jobs')) {
        return this.handleRegisterJob(req);
      }

      // GET /scheduler/jobs
      if (method === 'GET' && this.matchPath(path, '/scheduler/jobs')) {
        return this.handleListJobs(req);
      }

      // POST /scheduler/jobs/:jobId/trigger
      const triggerMatch = this.matchParam(path, '/scheduler/jobs/:jobId/trigger');
      if (method === 'POST' && triggerMatch) {
        return await this.handleTriggerJob(triggerMatch.jobId);
      }

      // POST /scheduler/jobs/:jobId/pause
      const pauseMatch = this.matchParam(path, '/scheduler/jobs/:jobId/pause');
      if (method === 'POST' && pauseMatch) {
        return this.handlePauseJob(pauseMatch.jobId);
      }

      // POST /scheduler/jobs/:jobId/resume
      const resumeMatch = this.matchParam(path, '/scheduler/jobs/:jobId/resume');
      if (method === 'POST' && resumeMatch) {
        return this.handleResumeJob(resumeMatch.jobId);
      }

      // GET /scheduler/jobs/:jobId/executions
      const execMatch = this.matchParam(path, '/scheduler/jobs/:jobId/executions');
      if (method === 'GET' && execMatch) {
        return this.handleGetExecutions(execMatch.jobId, req);
      }

      // GET /scheduler/jobs/:jobId
      const jobMatch = this.matchParam(path, '/scheduler/jobs/:jobId');
      if (method === 'GET' && jobMatch) {
        return this.handleGetJob(jobMatch.jobId);
      }

      // DELETE /scheduler/jobs/:jobId
      if (method === 'DELETE' && jobMatch) {
        return this.handleCancelJob(jobMatch.jobId);
      }

      // ── Listener Endpoints ─────────────────────────────────────────────────

      // POST /scheduler/listeners
      if (method === 'POST' && this.matchPath(path, '/scheduler/listeners')) {
        return this.handleRegisterListener(req);
      }

      // GET /scheduler/listeners
      if (method === 'GET' && this.matchPath(path, '/scheduler/listeners')) {
        return this.handleListListeners(req);
      }

      // ── DLQ Endpoints ──────────────────────────────────────────────────────

      // GET /scheduler/dlq
      if (method === 'GET' && this.matchPath(path, '/scheduler/dlq')) {
        return this.handleGetDlq();
      }

      // POST /scheduler/dlq/:jobId/acknowledge
      const ackMatch = this.matchParam(path, '/scheduler/dlq/:jobId/acknowledge');
      if (method === 'POST' && ackMatch) {
        return this.handleAcknowledgeDlq(ackMatch.jobId);
      }

      // POST /scheduler/dlq/:jobId/retry
      const dlqRetryMatch = this.matchParam(path, '/scheduler/dlq/:jobId/retry');
      if (method === 'POST' && dlqRetryMatch) {
        return this.handleRetryFromDlq(dlqRetryMatch.jobId);
      }

      // ── Observability Endpoints ────────────────────────────────────────────

      // GET /scheduler/workers
      if (method === 'GET' && this.matchPath(path, '/scheduler/workers')) {
        return this.handleGetWorkers();
      }

      // GET /scheduler/health
      if (method === 'GET' && this.matchPath(path, '/scheduler/health')) {
        return this.handleGetHealth();
      }

      // GET /scheduler/metrics
      if (method === 'GET' && this.matchPath(path, '/scheduler/metrics')) {
        return this.handleGetMetrics();
      }

      return this.notFound(`Route not found: ${method} ${path}`);

    } catch (err) {
      return this.handleError(err);
    }
  }

  // ============================================================================
  // Route Handlers — Jobs
  // ============================================================================

  private handleRegisterJob(req: SchedulerApiRequest): SchedulerApiResponse {
    const body = req.body as Partial<CreateJobInput> | undefined;
    if (!body) return this.badRequest('Request body is required');
    if (!body.name) return this.badRequest('name is required');
    if (!body.agentId) return this.badRequest('agentId is required');
    if (!body.executionMode) return this.badRequest('executionMode is required');

    const input: CreateJobInput = {
      name: String(body.name),
      agentId: String(body.agentId),
      executionMode: body.executionMode,
      cronExpression: body.cronExpression,
      intervalMs: body.intervalMs,
      triggerTopics: body.triggerTopics,
      payload: body.payload,
      priority: body.priority,
      maxRetries: body.maxRetries,
      timeoutMs: body.timeoutMs,
      idempotencyKey: body.idempotencyKey,
      metadata: body.metadata,
    };

    const job = this.scheduler.registerJob(input);
    return {
      status: 201,
      body: { success: true, data: job, timestamp: new Date().toISOString() },
    };
  }

  private handleListJobs(req: SchedulerApiRequest): SchedulerApiResponse {
    const agentId = req.query?.agentId;
    const statusFilter = req.query?.status as import('./types').JobStatus | undefined;
    const jobs = this.scheduler.listJobs(agentId, statusFilter);
    return this.ok({ jobs, total: jobs.length });
  }

  private handleGetJob(jobId: string): SchedulerApiResponse {
    const job = this.scheduler.getJob(jobId);
    return this.ok(job);
  }

  private handleCancelJob(jobId: string): SchedulerApiResponse {
    const job = this.scheduler.cancelJob(jobId);
    return this.ok({ jobId: job.jobId, status: job.status, cancelled: true });
  }

  private async handleTriggerJob(jobId: string): Promise<SchedulerApiResponse> {
    const record = await this.scheduler.triggerJobManually(jobId);
    return this.ok(record);
  }

  private handlePauseJob(jobId: string): SchedulerApiResponse {
    const job = this.scheduler.pauseJob(jobId);
    return this.ok({ jobId: job.jobId, status: job.status });
  }

  private handleResumeJob(jobId: string): SchedulerApiResponse {
    const job = this.scheduler.resumeJob(jobId);
    return this.ok({ jobId: job.jobId, status: job.status });
  }

  private handleGetExecutions(jobId: string, req: SchedulerApiRequest): SchedulerApiResponse {
    const limit = req.query?.limit ? parseInt(req.query.limit, 10) : 50;
    const records = this.scheduler.getExecutionHistory(jobId, limit);
    return this.ok({ records, total: records.length, jobId });
  }

  // ============================================================================
  // Route Handlers — Listeners
  // ============================================================================

  private handleRegisterListener(req: SchedulerApiRequest): SchedulerApiResponse {
    const body = req.body as Partial<CreateListenerInput> | undefined;
    if (!body) return this.badRequest('Request body is required');
    if (!body.name) return this.badRequest('name is required');
    if (!body.agentId) return this.badRequest('agentId is required');
    if (!body.eventType) return this.badRequest('eventType is required');
    if (!body.address) return this.badRequest('address is required');

    const input: CreateListenerInput = {
      name: String(body.name),
      agentId: String(body.agentId),
      eventType: body.eventType,
      address: String(body.address),
      eventSignature: body.eventSignature,
      minValue: body.minValue,
      publishTopic: body.publishTopic,
      metadata: body.metadata,
    };

    const listener = this.scheduler.registerOnChainListener(input);
    return {
      status: 201,
      body: { success: true, data: listener, timestamp: new Date().toISOString() },
    };
  }

  private handleListListeners(req: SchedulerApiRequest): SchedulerApiResponse {
    const agentId = req.query?.agentId;
    const listeners = this.scheduler.listOnChainListeners(agentId);
    return this.ok({ listeners, total: listeners.length });
  }

  // ============================================================================
  // Route Handlers — DLQ
  // ============================================================================

  private handleGetDlq(): SchedulerApiResponse {
    const entries = this.scheduler.getDeadLetterQueue();
    return this.ok({ entries, total: entries.length });
  }

  private handleAcknowledgeDlq(jobId: string): SchedulerApiResponse {
    const ok = this.scheduler.acknowledgeDlqEntry(jobId);
    if (!ok) return this.notFound(`No DLQ entry for job: ${jobId}`);
    return this.ok({ jobId, acknowledged: true });
  }

  private handleRetryFromDlq(jobId: string): SchedulerApiResponse {
    const ok = this.scheduler.retryFromDlq(jobId);
    if (!ok) return this.notFound(`No DLQ entry for job: ${jobId}`);
    return this.ok({ jobId, retried: true });
  }

  // ============================================================================
  // Route Handlers — Observability
  // ============================================================================

  private handleGetWorkers(): SchedulerApiResponse {
    const workers = this.scheduler.getWorkers();
    return this.ok({ workers, total: workers.length });
  }

  private handleGetHealth(): SchedulerApiResponse {
    const health = this.scheduler.getHealth();
    const statusCode = health.overall === 'unhealthy' ? 503 : 200;
    return {
      status: statusCode,
      body: {
        success: health.overall !== 'unhealthy',
        data: health,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private handleGetMetrics(): SchedulerApiResponse {
    const metrics = this.scheduler.getMetrics();
    return this.ok(metrics);
  }

  // ============================================================================
  // Scheduler Access
  // ============================================================================

  /** Get the underlying scheduler instance. */
  getScheduler(): DistributedScheduler {
    return this.scheduler;
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private ok<T>(data: T): SchedulerApiResponse<T> {
    return {
      status: 200,
      body: { success: true, data, timestamp: new Date().toISOString() },
    };
  }

  private badRequest(error: string): SchedulerApiResponse {
    return {
      status: 400,
      body: { success: false, error, timestamp: new Date().toISOString() },
    };
  }

  private notFound(error: string): SchedulerApiResponse {
    return {
      status: 404,
      body: { success: false, error, timestamp: new Date().toISOString() },
    };
  }

  private handleError(err: unknown): SchedulerApiResponse {
    if (err instanceof DistributedSchedulerError) {
      const statusMap: Record<string, number> = {
        JOB_NOT_FOUND: 404,
        JOB_ALREADY_EXISTS: 409,
        LISTENER_NOT_FOUND: 404,
        QUEUE_FULL: 429,
        INVALID_CRON_EXPRESSION: 400,
        INVALID_EXECUTION_MODE: 400,
        WORKER_POOL_EXHAUSTED: 503,
        EXECUTION_TIMEOUT: 504,
        SCHEDULER_DISABLED: 503,
        SCHEDULER_NOT_RUNNING: 503,
      };
      return {
        status: statusMap[err.code] ?? 500,
        body: { success: false, error: err.message, timestamp: new Date().toISOString() },
      };
    }
    return {
      status: 500,
      body: {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // Path Matching Helpers
  // ============================================================================

  private matchPath(path: string, pattern: string): boolean {
    return path === pattern || path === `${pattern}/`;
  }

  private matchParam(path: string, pattern: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      const p = pathParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = p;
      } else if (pp !== p) {
        return null;
      }
    }
    return params;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DistributedSchedulerApi instance.
 *
 * @example
 * ```typescript
 * const api = createDistributedSchedulerApi();
 * api.getScheduler().start();
 *
 * // Or with an existing scheduler:
 * const scheduler = createDistributedScheduler({ workerPool: { maxWorkers: 20 } });
 * scheduler.start();
 * const api = createDistributedSchedulerApi(scheduler);
 * ```
 */
export function createDistributedSchedulerApi(
  schedulerOrConfig?: DistributedScheduler | Partial<DistributedSchedulerConfig>,
): DistributedSchedulerApi {
  if (schedulerOrConfig instanceof DistributedScheduler) {
    return new DistributedSchedulerApi(schedulerOrConfig);
  }
  const scheduler = createDistributedScheduler(schedulerOrConfig);
  return new DistributedSchedulerApi(scheduler);
}

export default DistributedSchedulerApi;
