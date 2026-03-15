/**
 * TONAIAgent - Agent Lifecycle Cloud Orchestrator API
 *
 * Framework-agnostic REST API handler for the Lifecycle Orchestrator.
 *
 * Endpoints:
 *   POST   /lifecycle/agents                       — Register agent into lifecycle system
 *   GET    /lifecycle/agents                       — List all managed agents
 *   GET    /lifecycle/agents/:agentId              — Get agent lifecycle record
 *   GET    /lifecycle/agents/user/:userId          — List agents for a user
 *   GET    /lifecycle/agents/state/:state          — List agents by lifecycle state
 *   PATCH  /lifecycle/agents/:agentId/state        — Transition lifecycle state
 *   DELETE /lifecycle/agents/:agentId              — Terminate agent
 *   POST   /lifecycle/agents/:agentId/jobs         — Schedule a job for an agent
 *   POST   /lifecycle/agents/:agentId/jobs/:jobId/execute — Execute a job
 *   POST   /lifecycle/agents/:agentId/scale        — Scale agent resources
 *   GET    /lifecycle/agents/:agentId/health       — Run health check on agent
 *   POST   /lifecycle/agents/:agentId/alerts       — Create an alert
 *   PATCH  /lifecycle/agents/:agentId/alerts/:alertId/ack — Acknowledge alert
 *   GET    /lifecycle/health                       — Orchestrator health check
 *   GET    /lifecycle/metrics                      — Aggregate metrics
 *   GET    /lifecycle/audit                        — Audit log
 *
 * Issue #92: Agent Lifecycle Cloud Orchestrator
 *
 * @example
 * ```typescript
 * // With Express:
 * const api = createLifecycleOrchestratorApi();
 *
 * app.post('/lifecycle/agents', async (req, res) => {
 *   const result = await api.handle({ method: 'POST', path: '/lifecycle/agents', body: req.body });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */

import type {
  LifecycleApiRequest,
  LifecycleApiResponse,
  LifecycleOrchestratorConfig,
  LifecycleState,
  MigrationType,
  RegisterAgentInput,
  ResourceTier,
  ScheduleConfig,
  TransitionStateInput,
} from './types';

import { LifecycleOrchestratorError } from './types';
import { LifecycleOrchestrator, createLifecycleOrchestrator } from './lifecycle-orchestrator';

// ============================================================================
// Lifecycle Orchestrator API
// ============================================================================

/**
 * Framework-agnostic API handler for the Lifecycle Orchestrator.
 *
 * Routes incoming requests to the appropriate orchestrator method and
 * returns structured responses in a standard envelope format.
 */
export class LifecycleOrchestratorApi {
  private readonly orchestrator: LifecycleOrchestrator;

  constructor(orchestrator?: LifecycleOrchestrator) {
    this.orchestrator = orchestrator ?? createLifecycleOrchestrator();
  }

  /**
   * Handle an incoming API request.
   *
   * Routes:
   *   POST   /lifecycle/agents                             → registerAgent
   *   GET    /lifecycle/agents                             → listAgents
   *   GET    /lifecycle/agents/health (before :agentId)   → getHealth (orchestrator)
   *   GET    /lifecycle/agents/metrics                     → getMetrics
   *   GET    /lifecycle/agents/audit                       → getAuditLog
   *   GET    /lifecycle/agents/user/:userId                → listAgentsByUser
   *   GET    /lifecycle/agents/state/:state                → listAgentsByState
   *   GET    /lifecycle/agents/:agentId                    → getAgent
   *   GET    /lifecycle/agents/:agentId/health             → runHealthCheck
   *   PATCH  /lifecycle/agents/:agentId/state              → transitionState
   *   DELETE /lifecycle/agents/:agentId                    → terminateAgent
   *   POST   /lifecycle/agents/:agentId/jobs               → scheduleJob
   *   POST   /lifecycle/agents/:agentId/jobs/:jobId/execute → executeJob
   *   POST   /lifecycle/agents/:agentId/scale              → scaleAgent
   *   POST   /lifecycle/agents/:agentId/alerts             → createAlert
   *   PATCH  /lifecycle/agents/:agentId/alerts/:alertId/ack → acknowledgeAlert
   *   POST   /lifecycle/agents/:agentId/migrations         → startMigration
   *   PATCH  /lifecycle/agents/:agentId/migrations/:migrationId → completeMigration
   *   GET    /lifecycle/health                             → getHealth (alternative path)
   *   GET    /lifecycle/metrics                            → getMetrics (alternative path)
   *   GET    /lifecycle/audit                              → getAuditLog (alternative path)
   */
  async handle(req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    try {
      const { method, path } = req;

      // POST /lifecycle/agents — Register agent
      if (method === 'POST' && this.matchPath(path, '/lifecycle/agents')) {
        return await this.handleRegisterAgent(req);
      }

      // GET /lifecycle/agents/health — Orchestrator health (must come before :agentId)
      if (method === 'GET' && (
        this.matchPath(path, '/lifecycle/agents/health') ||
        this.matchPath(path, '/lifecycle/health')
      )) {
        return this.handleGetHealth();
      }

      // GET /lifecycle/agents/metrics
      if (method === 'GET' && (
        this.matchPath(path, '/lifecycle/agents/metrics') ||
        this.matchPath(path, '/lifecycle/metrics')
      )) {
        return this.handleGetMetrics();
      }

      // GET /lifecycle/agents/audit
      if (method === 'GET' && (
        this.matchPath(path, '/lifecycle/agents/audit') ||
        this.matchPath(path, '/lifecycle/audit')
      )) {
        return this.handleGetAuditLog(req);
      }

      // GET /lifecycle/agents/user/:userId
      const userMatch = this.matchParam(path, '/lifecycle/agents/user/:userId');
      if (method === 'GET' && userMatch) {
        return this.handleListAgentsByUser(userMatch.userId);
      }

      // GET /lifecycle/agents/state/:state
      const stateFilterMatch = this.matchParam(path, '/lifecycle/agents/state/:state');
      if (method === 'GET' && stateFilterMatch) {
        return this.handleListAgentsByState(stateFilterMatch.state as LifecycleState);
      }

      // GET /lifecycle/agents — List all
      if (method === 'GET' && this.matchPath(path, '/lifecycle/agents')) {
        return this.handleListAgents();
      }

      // GET /lifecycle/agents/:agentId/health — Agent health check
      const agentHealthMatch = this.matchParam(path, '/lifecycle/agents/:agentId/health');
      if (method === 'GET' && agentHealthMatch) {
        return await this.handleRunHealthCheck(agentHealthMatch.agentId);
      }

      // PATCH /lifecycle/agents/:agentId/state — Transition state
      const stateMatch = this.matchParam(path, '/lifecycle/agents/:agentId/state');
      if (method === 'PATCH' && stateMatch) {
        return await this.handleTransitionState(stateMatch.agentId, req);
      }

      // POST /lifecycle/agents/:agentId/jobs/:jobId/execute — Execute job
      const executeJobMatch = this.matchParam(path, '/lifecycle/agents/:agentId/jobs/:jobId/execute');
      if (method === 'POST' && executeJobMatch) {
        return await this.handleExecuteJob(executeJobMatch.agentId, executeJobMatch.jobId);
      }

      // POST /lifecycle/agents/:agentId/jobs — Schedule job
      const jobsMatch = this.matchParam(path, '/lifecycle/agents/:agentId/jobs');
      if (method === 'POST' && jobsMatch) {
        return this.handleScheduleJob(jobsMatch.agentId, req);
      }

      // POST /lifecycle/agents/:agentId/scale — Scale agent
      const scaleMatch = this.matchParam(path, '/lifecycle/agents/:agentId/scale');
      if (method === 'POST' && scaleMatch) {
        return await this.handleScaleAgent(scaleMatch.agentId, req);
      }

      // PATCH /lifecycle/agents/:agentId/alerts/:alertId/ack — Acknowledge alert
      const ackAlertMatch = this.matchParam(path, '/lifecycle/agents/:agentId/alerts/:alertId/ack');
      if (method === 'PATCH' && ackAlertMatch) {
        return this.handleAcknowledgeAlert(ackAlertMatch.agentId, ackAlertMatch.alertId);
      }

      // POST /lifecycle/agents/:agentId/alerts — Create alert
      const alertsMatch = this.matchParam(path, '/lifecycle/agents/:agentId/alerts');
      if (method === 'POST' && alertsMatch) {
        return await this.handleCreateAlert(alertsMatch.agentId, req);
      }

      // PATCH /lifecycle/agents/:agentId/migrations/:migrationId — Complete migration
      const completeMigMatch = this.matchParam(path, '/lifecycle/agents/:agentId/migrations/:migrationId');
      if (method === 'PATCH' && completeMigMatch) {
        return this.handleCompleteMigration(completeMigMatch.agentId, completeMigMatch.migrationId, req);
      }

      // POST /lifecycle/agents/:agentId/migrations — Start migration
      const migrationsMatch = this.matchParam(path, '/lifecycle/agents/:agentId/migrations');
      if (method === 'POST' && migrationsMatch) {
        return await this.handleStartMigration(migrationsMatch.agentId, req);
      }

      // DELETE /lifecycle/agents/:agentId — Terminate agent
      const deleteMatch = this.matchParam(path, '/lifecycle/agents/:agentId');
      if (method === 'DELETE' && deleteMatch) {
        return await this.handleTerminateAgent(deleteMatch.agentId, req);
      }

      // GET /lifecycle/agents/:agentId — Get agent
      const agentMatch = this.matchParam(path, '/lifecycle/agents/:agentId');
      if (method === 'GET' && agentMatch) {
        return this.handleGetAgent(agentMatch.agentId);
      }

      return this.notFound(`Route not found: ${method} ${path}`);
    } catch (err) {
      if (err instanceof LifecycleOrchestratorError) {
        const statusMap: Record<string, number> = {
          AGENT_NOT_FOUND: 404,
          JOB_NOT_FOUND: 404,
          ALERT_NOT_FOUND: 404,
          MIGRATION_NOT_FOUND: 404,
          AGENT_ALREADY_REGISTERED: 409,
          INVALID_STATE_TRANSITION: 422,
          INVALID_STATE: 422,
          INVALID_SCHEDULE: 422,
          PERMISSION_DENIED: 403,
          ORCHESTRATOR_DISABLED: 503,
          MAX_AGENTS_REACHED: 503,
          RUNTIME_ALLOCATION_FAILED: 500,
          HEALTH_CHECK_FAILED: 500,
          GOVERNANCE_VIOLATION: 403,
        };
        return this.error(statusMap[err.code] ?? 400, err.message);
      }
      return this.error(500, 'Internal server error');
    }
  }

  // ============================================================================
  // Handler Implementations
  // ============================================================================

  private async handleRegisterAgent(req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as Partial<RegisterAgentInput> | undefined;
    if (!body?.agentId || !body.userId || !body.agentName || !body.environment) {
      return this.error(400, 'agentId, userId, agentName, and environment are required');
    }

    const input: RegisterAgentInput = {
      agentId: body.agentId,
      agentName: body.agentName,
      userId: body.userId,
      environment: body.environment,
      resourceTier: body.resourceTier,
      computeEnvironment: body.computeEnvironment,
      cloudProvider: body.cloudProvider,
      autoActivate: body.autoActivate,
      initialJobs: body.initialJobs,
    };

    const result = await this.orchestrator.registerAgent(input);
    return this.success(201, result);
  }

  private handleListAgents(): LifecycleApiResponse {
    const agents = this.orchestrator.listAgents();
    return this.success(200, { agents, total: agents.length });
  }

  private handleGetAgent(agentId: string): LifecycleApiResponse {
    const record = this.orchestrator.getAgent(agentId);
    return this.success(200, record);
  }

  private handleListAgentsByUser(userId: string): LifecycleApiResponse {
    const agents = this.orchestrator.listAgentsByUser(userId);
    return this.success(200, { agents, total: agents.length, userId });
  }

  private handleListAgentsByState(state: LifecycleState): LifecycleApiResponse {
    const validStates: LifecycleState[] = ['created', 'active', 'running', 'paused', 'suspended', 'terminated'];
    if (!validStates.includes(state)) {
      return this.error(400, `Invalid state '${state}'. Valid states: ${validStates.join(', ')}`);
    }
    const agents = this.orchestrator.listAgentsByState(state);
    return this.success(200, { agents, total: agents.length, state });
  }

  private async handleTransitionState(agentId: string, req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as Partial<TransitionStateInput> | undefined;
    if (!body?.targetState || !body.requestedBy) {
      return this.error(400, 'targetState and requestedBy are required');
    }
    const record = await this.orchestrator.transitionState({
      agentId,
      targetState: body.targetState,
      requestedBy: body.requestedBy,
      reason: body.reason ?? 'No reason provided',
      automated: body.automated,
    });
    return this.success(200, record);
  }

  private async handleTerminateAgent(agentId: string, req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as { requestedBy?: string; reason?: string } | undefined;
    const requestedBy = body?.requestedBy ?? 'api';
    const reason = body?.reason ?? 'Terminated via API';
    const record = await this.orchestrator.transitionState({
      agentId,
      targetState: 'terminated',
      requestedBy,
      reason,
    });
    return this.success(200, { terminated: true, agentId, finalReport: record.finalReport });
  }

  private handleScheduleJob(agentId: string, req: LifecycleApiRequest): LifecycleApiResponse {
    const body = req.body as { schedule?: ScheduleConfig; enabled?: boolean } | undefined;
    if (!body?.schedule?.type) {
      return this.error(400, 'schedule (with type) is required');
    }
    const job = this.orchestrator.scheduleJob({
      agentId,
      schedule: body.schedule,
      enabled: body.enabled,
    });
    return this.success(201, job);
  }

  private async handleExecuteJob(agentId: string, jobId: string): Promise<LifecycleApiResponse> {
    await this.orchestrator.executeJob(agentId, jobId);
    return this.success(200, { executed: true, agentId, jobId });
  }

  private async handleScaleAgent(agentId: string, req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as { tier?: ResourceTier; instanceCount?: number; reason?: string } | undefined;
    const allocation = await this.orchestrator.scaleAgent({
      agentId,
      tier: body?.tier,
      instanceCount: body?.instanceCount,
      reason: body?.reason ?? 'Manual scale via API',
    });
    return this.success(200, allocation);
  }

  private async handleRunHealthCheck(agentId: string): Promise<LifecycleApiResponse> {
    const result = await this.orchestrator.runHealthCheck(agentId);
    return this.success(200, result);
  }

  private async handleCreateAlert(agentId: string, req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as {
      severity?: string;
      title?: string;
      message?: string;
      autoActionTaken?: boolean;
      autoAction?: string;
    } | undefined;

    if (!body?.severity || !body.title || !body.message) {
      return this.error(400, 'severity, title, and message are required');
    }

    const record = this.orchestrator.getAgent(agentId);
    const alert = await this.orchestrator.createAlert(agentId, record.userId, {
      severity: body.severity as 'info' | 'warning' | 'critical' | 'emergency',
      title: body.title,
      message: body.message,
      autoActionTaken: body.autoActionTaken,
      autoAction: body.autoAction,
    });
    return this.success(201, alert);
  }

  private handleAcknowledgeAlert(agentId: string, alertId: string): LifecycleApiResponse {
    const alert = this.orchestrator.acknowledgeAlert(agentId, alertId);
    return this.success(200, { acknowledged: true, alert });
  }

  private async handleStartMigration(agentId: string, req: LifecycleApiRequest): Promise<LifecycleApiResponse> {
    const body = req.body as {
      type?: string;
      sourceConfig?: Record<string, unknown>;
      targetConfig?: Record<string, unknown>;
    } | undefined;

    if (!body?.type) {
      return this.error(400, 'type is required (cloud_provider, runtime_upgrade, wallet_strategy, multi_chain)');
    }

    const migration = await this.orchestrator.startMigration(
      agentId,
      body.type as MigrationType,
      body.sourceConfig ?? {},
      body.targetConfig ?? {},
    );
    return this.success(201, migration);
  }

  private handleCompleteMigration(agentId: string, migrationId: string, req: LifecycleApiRequest): LifecycleApiResponse {
    const body = req.body as { success?: boolean; error?: string } | undefined;
    const migration = this.orchestrator.completeMigration(agentId, migrationId, body?.success ?? true, body?.error);
    return this.success(200, migration);
  }

  private handleGetHealth(): LifecycleApiResponse {
    const health = this.orchestrator.getHealth();
    const status = health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 200 : 503;
    return this.success(status, health);
  }

  private handleGetMetrics(): LifecycleApiResponse {
    const metrics = this.orchestrator.getMetrics();
    return this.success(200, metrics);
  }

  private handleGetAuditLog(req: LifecycleApiRequest): LifecycleApiResponse {
    const limit = req.query?.limit ? parseInt(req.query.limit, 10) : 100;
    const entries = this.orchestrator.getAuditLog(isNaN(limit) ? 100 : limit);
    return this.success(200, { entries, total: entries.length });
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private success<T>(status: number, data: T): LifecycleApiResponse<T> {
    return {
      status,
      body: {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private error(status: number, message: string): LifecycleApiResponse {
    return {
      status,
      body: {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private notFound(message: string): LifecycleApiResponse {
    return this.error(404, message);
  }

  // ============================================================================
  // Path Matching Utilities
  // ============================================================================

  private matchPath(actual: string, expected: string): boolean {
    // Normalize by stripping trailing slashes and query strings
    const norm = actual.split('?')[0].replace(/\/+$/, '');
    const exp = expected.replace(/\/+$/, '');
    return norm === exp;
  }

  private matchParam(actual: string, template: string): Record<string, string> | null {
    // Strip query string
    const path = actual.split('?')[0].replace(/\/+$/, '');
    const templateParts = template.split('/');
    const pathParts = path.split('/');

    if (templateParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < templateParts.length; i++) {
      const t = templateParts[i];
      const p = pathParts[i];
      if (t.startsWith(':')) {
        params[t.slice(1)] = p;
      } else if (t !== p) {
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
 * Create a new LifecycleOrchestratorApi instance.
 *
 * @example
 * ```typescript
 * import { createLifecycleOrchestratorApi } from '@tonaiagent/core/lifecycle-orchestrator';
 *
 * const api = createLifecycleOrchestratorApi();
 *
 * // Express:
 * app.use('/lifecycle', async (req, res) => {
 *   const result = await api.handle({
 *     method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
 *     path: req.path,
 *     body: req.body,
 *     query: req.query as Record<string, string>,
 *   });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */
export function createLifecycleOrchestratorApi(
  config?: Partial<LifecycleOrchestratorConfig>,
): LifecycleOrchestratorApi {
  const orchestrator = config ? createLifecycleOrchestrator(config) : undefined;
  return new LifecycleOrchestratorApi(orchestrator);
}
