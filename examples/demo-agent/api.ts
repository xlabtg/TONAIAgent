/**
 * TONAIAgent - Demo Agent API Layer
 *
 * Implements the REST API endpoints specified in Issue #83:
 *
 *   POST /agent/create   — create a new demo agent
 *   POST /agent/start    — start/activate an agent
 *   POST /agent/pause    — pause a running agent
 *   GET  /agent/status   — get agent status, balance, metrics
 *   GET  /agent/metrics  — get detailed metrics + recent logs
 *   GET  /agent/history  — get trade and execution log history
 *
 * This is a framework-agnostic request/response handler.
 * Integrate with Express, Hono, or Bun.serve as a thin adapter.
 */

import type {
  AgentHistoryResponse,
  AgentMetricsResponse,
  AgentStatusResponse,
  CreateAgentRequest,
  DemoAgent,
  DemoAgentService,
  PauseAgentRequest,
  SimulationBalance,
  StartAgentRequest,
} from './types';

// ============================================================================
// HTTP-style Request/Response types (framework-agnostic)
// ============================================================================

/**
 * Generic API request
 */
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * Generic API response
 */
export interface ApiResponse<T = unknown> {
  status: number;
  body: ApiResponseBody<T>;
}

/**
 * Standard API response envelope
 */
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ============================================================================
// API Handler
// ============================================================================

/**
 * DemoAgent API handler.
 *
 * Routes requests to the appropriate service method and returns
 * a standard API response envelope.
 *
 * @example
 * ```typescript
 * const api = new DemoAgentApi(agentService);
 *
 * // With Express:
 * app.post('/agent/create', async (req, res) => {
 *   const result = await api.handle({ method: 'POST', path: '/agent/create', body: req.body });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */
export class DemoAgentApi {
  private readonly service: DemoAgentService;

  constructor(service: DemoAgentService) {
    this.service = service;
  }

  /**
   * Route and handle an incoming API request
   */
  async handle(req: ApiRequest): Promise<ApiResponse> {
    try {
      const { method, path, body, query, params } = req;

      // POST /agent/create
      if (method === 'POST' && path === '/agent/create') {
        return await this.createAgent(body as CreateAgentRequest);
      }

      // POST /agent/start
      if (method === 'POST' && path === '/agent/start') {
        return await this.startAgent(body as StartAgentRequest);
      }

      // POST /agent/pause
      if (method === 'POST' && path === '/agent/pause') {
        return await this.pauseAgent(body as PauseAgentRequest);
      }

      // GET /agent/status?agentId=xxx
      if (method === 'GET' && path === '/agent/status') {
        const agentId = query?.agentId ?? params?.agentId;
        if (!agentId) return badRequest('agentId is required');
        return this.getStatus(agentId);
      }

      // GET /agent/metrics?agentId=xxx
      if (method === 'GET' && path === '/agent/metrics') {
        const agentId = query?.agentId ?? params?.agentId;
        if (!agentId) return badRequest('agentId is required');
        return this.getMetrics(agentId);
      }

      // GET /agent/history?agentId=xxx&page=1&pageSize=20
      if (method === 'GET' && path === '/agent/history') {
        const agentId = query?.agentId ?? params?.agentId;
        if (!agentId) return badRequest('agentId is required');
        const page = parseInt(query?.page ?? '1', 10);
        const pageSize = parseInt(query?.pageSize ?? '20', 10);
        return this.getHistory(agentId, page, pageSize);
      }

      // POST /agent/stop
      if (method === 'POST' && path === '/agent/stop') {
        const { agentId } = (body ?? {}) as { agentId?: string };
        if (!agentId) return badRequest('agentId is required');
        return await this.stopAgent(agentId);
      }

      // POST /agent/kill
      if (method === 'POST' && path === '/agent/kill') {
        const { agentId, reason } = (body ?? {}) as { agentId?: string; reason?: string };
        if (!agentId) return badRequest('agentId is required');
        return await this.killAgent(agentId, reason ?? 'Manual kill switch');
      }

      // POST /agent/reset
      if (method === 'POST' && path === '/agent/reset') {
        const { agentId } = (body ?? {}) as { agentId?: string };
        if (!agentId) return badRequest('agentId is required');
        return await this.resetSimulation(agentId);
      }

      return notFound(`No handler for ${method} ${path}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return internalError(message);
    }
  }

  // ============================================================================
  // Route Handlers
  // ============================================================================

  /** POST /agent/create */
  async createAgent(req: CreateAgentRequest): Promise<ApiResponse<DemoAgent>> {
    if (!req.userId) return badRequest('userId is required') as ApiResponse<DemoAgent>;
    if (!req.config) return badRequest('config is required') as ApiResponse<DemoAgent>;
    if (!req.config.name) return badRequest('config.name is required') as ApiResponse<DemoAgent>;

    const agent = await this.service.createAgent(req);
    return ok(agent, 201);
  }

  /** POST /agent/start */
  async startAgent(req: StartAgentRequest): Promise<ApiResponse<DemoAgent>> {
    if (!req.agentId) return badRequest('agentId is required') as ApiResponse<DemoAgent>;
    const agent = await this.service.startAgent(req.agentId);
    return ok(agent);
  }

  /** POST /agent/pause */
  async pauseAgent(req: PauseAgentRequest): Promise<ApiResponse<DemoAgent>> {
    if (!req.agentId) return badRequest('agentId is required') as ApiResponse<DemoAgent>;
    const agent = await this.service.pauseAgent(req.agentId, req.reason);
    return ok(agent);
  }

  /** POST /agent/stop */
  async stopAgent(agentId: string): Promise<ApiResponse<DemoAgent>> {
    const agent = await this.service.stopAgent(agentId);
    return ok(agent);
  }

  /** GET /agent/status */
  getStatus(agentId: string): ApiResponse<AgentStatusResponse> {
    const status = this.service.getAgentStatus(agentId);
    return ok(status);
  }

  /** GET /agent/metrics */
  getMetrics(agentId: string): ApiResponse<AgentMetricsResponse> {
    const metrics = this.service.getAgentMetrics(agentId);
    return ok(metrics);
  }

  /** GET /agent/history */
  getHistory(agentId: string, page: number, pageSize: number): ApiResponse<AgentHistoryResponse> {
    const history = this.service.getAgentHistory(agentId, page, pageSize);
    return ok(history);
  }

  /** POST /agent/kill */
  async killAgent(agentId: string, reason: string): Promise<ApiResponse<DemoAgent>> {
    const agent = await this.service.activateKillSwitch(agentId, reason);
    return ok(agent);
  }

  /** POST /agent/reset */
  async resetSimulation(agentId: string): Promise<ApiResponse<SimulationBalance>> {
    const balance = await this.service.resetSimulation(agentId);
    return ok(balance);
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

function ok<T>(data: T, status = 200): ApiResponse<T> {
  return {
    status,
    body: {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
  };
}

function badRequest(error: string): ApiResponse {
  return {
    status: 400,
    body: {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
  };
}

function notFound(error: string): ApiResponse {
  return {
    status: 404,
    body: {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
  };
}

function internalError(error: string): ApiResponse {
  return {
    status: 500,
    body: {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new DemoAgentApi instance
 */
export function createDemoAgentApi(service: DemoAgentService): DemoAgentApi {
  return new DemoAgentApi(service);
}
