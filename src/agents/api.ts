/**
 * TONAIAgent - Agent Manager API Handler
 *
 * Framework-agnostic REST API handler for the Agent Manager API.
 *
 * Endpoints (Issue #213):
 *   POST   /agents                    - Create a new agent
 *   POST   /agents/:id/config         - Configure agent strategy and risk params
 *   POST   /agents/:id/start          - Start an agent
 *   POST   /agents/:id/pause          - Pause an agent
 *   POST   /agents/:id/resume         - Resume a paused agent
 *   POST   /agents/:id/stop           - Stop an agent
 *   DELETE /agents/:id                - Delete an agent
 *   GET    /agents                    - List all agents
 *   GET    /agents/:id                - Get agent details
 *
 * Implements Issue #213: Agent Manager API (Agent Lifecycle Management)
 */

import type {
  AgentApiRequest,
  AgentApiResponse,
  AgentApiResponseBody,
  AgentDetailsResponse,
  ConfigureAgentRequest,
  CreateAgentRequest,
  ListAgentsResponse,
} from './types';

import { AgentError } from './types';
import { AgentManagerService, createAgentManagerService, DEFAULT_AGENT_MANAGER_CONFIG } from './service';
import type { AgentManagerConfig } from './types';
import type { AgentStorage } from './storage';

// ============================================================================
// Agent Manager API
// ============================================================================

/**
 * Framework-agnostic REST handler for the Agent Manager API.
 *
 * @example
 * ```typescript
 * const api = createAgentManagerApi();
 *
 * // Handle a create request
 * const response = await api.handle({
 *   method: 'POST',
 *   path: '/agents',
 *   body: {
 *     name: 'My Bot',
 *     strategy: 'momentum',
 *     initial_balance: 10000,
 *     base_asset: 'USDT',
 *     pairs: ['TON/USDT'],
 *   },
 * });
 *
 * // Handle a start request
 * const startResponse = await api.handle({
 *   method: 'POST',
 *   path: '/agents/agent_001/start',
 * });
 * ```
 */
export class AgentManagerApi {
  private readonly service: AgentManagerService;

  constructor(service?: AgentManagerService) {
    this.service = service ?? createAgentManagerService();
  }

  /**
   * Dispatch an incoming request to the appropriate handler.
   */
  async handle(req: AgentApiRequest): Promise<AgentApiResponse> {
    const { method, path } = req;

    try {
      // POST /agents - Create agent
      if (method === 'POST' && this.matchExact(path, '/agents')) {
        return this.handleCreateAgent(req.body as CreateAgentRequest);
      }

      // POST /agents/:id/config - Configure agent
      const configMatch = this.matchParam(path, '/agents/:id/config');
      if (method === 'POST' && configMatch) {
        return this.handleConfigureAgent(configMatch.id, req.body as ConfigureAgentRequest);
      }

      // POST /agents/:id/start - Start agent
      const startMatch = this.matchParam(path, '/agents/:id/start');
      if (method === 'POST' && startMatch) {
        return this.handleStartAgent(startMatch.id);
      }

      // POST /agents/:id/pause - Pause agent
      const pauseMatch = this.matchParam(path, '/agents/:id/pause');
      if (method === 'POST' && pauseMatch) {
        return this.handlePauseAgent(pauseMatch.id);
      }

      // POST /agents/:id/resume - Resume agent
      const resumeMatch = this.matchParam(path, '/agents/:id/resume');
      if (method === 'POST' && resumeMatch) {
        return this.handleResumeAgent(resumeMatch.id);
      }

      // POST /agents/:id/stop - Stop agent
      const stopMatch = this.matchParam(path, '/agents/:id/stop');
      if (method === 'POST' && stopMatch) {
        return this.handleStopAgent(stopMatch.id);
      }

      // DELETE /agents/:id - Delete agent
      const deleteMatch = this.matchParam(path, '/agents/:id');
      if (method === 'DELETE' && deleteMatch) {
        return this.handleDeleteAgent(deleteMatch.id);
      }

      // GET /agents - List agents
      if (method === 'GET' && this.matchExact(path, '/agents')) {
        const ownerId = req.query?.owner_id;
        return this.handleListAgents(ownerId);
      }

      // GET /agents/:id - Get agent details (must come after action routes)
      const detailsMatch = this.matchParam(path, '/agents/:id');
      if (method === 'GET' && detailsMatch) {
        return this.handleGetAgent(detailsMatch.id);
      }

      // No route matched
      return this.notFound();
    } catch (err) {
      return this.handleError(err);
    }
  }

  /**
   * Expose the underlying service (e.g., for event subscription).
   */
  getService(): AgentManagerService {
    return this.service;
  }

  // --------------------------------------------------------------------------
  // Request Handlers
  // --------------------------------------------------------------------------

  private handleCreateAgent(body: CreateAgentRequest): AgentApiResponse {
    try {
      const result = this.service.createAgent(body);
      return this.created(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleConfigureAgent(agentId: string, body: ConfigureAgentRequest): AgentApiResponse {
    try {
      const result = this.service.configureAgent(agentId, body);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleStartAgent(agentId: string): AgentApiResponse {
    try {
      const result = this.service.startAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handlePauseAgent(agentId: string): AgentApiResponse {
    try {
      const result = this.service.pauseAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleResumeAgent(agentId: string): AgentApiResponse {
    try {
      const result = this.service.resumeAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleStopAgent(agentId: string): AgentApiResponse {
    try {
      const result = this.service.stopAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleDeleteAgent(agentId: string): AgentApiResponse {
    try {
      const result = this.service.deleteAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleListAgents(ownerId?: string): AgentApiResponse<ListAgentsResponse> {
    try {
      const result = this.service.listAgents(ownerId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err) as AgentApiResponse<ListAgentsResponse>;
    }
  }

  private handleGetAgent(agentId: string): AgentApiResponse<AgentDetailsResponse> {
    try {
      const result = this.service.getAgentDetails(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err) as AgentApiResponse<AgentDetailsResponse>;
    }
  }

  // --------------------------------------------------------------------------
  // Response Helpers
  // --------------------------------------------------------------------------

  private ok<T>(data: T): AgentApiResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private created<T>(data: T): AgentApiResponse<T> {
    return {
      statusCode: 201,
      body: { success: true, data },
    };
  }

  private notFound(): AgentApiResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'ROUTE_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): AgentApiResponse {
    if (err instanceof AgentError) {
      const statusCode = this.errorCodeToStatus(err.code);
      return {
        statusCode,
        body: { success: false, error: err.message, code: err.code },
      };
    }

    // Unknown error
    const message = err instanceof Error ? err.message : 'Internal server error';
    return {
      statusCode: 500,
      body: { success: false, error: message, code: 'OPERATION_FAILED' },
    };
  }

  private errorCodeToStatus(code: string): number {
    switch (code) {
      case 'AGENT_NOT_FOUND':
      case 'ROUTE_NOT_FOUND':
        return 404;
      case 'AGENT_ALREADY_EXISTS':
      case 'AGENT_ALREADY_RUNNING':
      case 'AGENT_ALREADY_STOPPED':
      case 'AGENT_ALREADY_PAUSED':
      case 'INVALID_STATUS_TRANSITION':
        return 409;
      case 'INVALID_AGENT_ID':
      case 'INVALID_CONFIGURATION':
      case 'AGENT_NOT_CONFIGURED':
        return 400;
      case 'MAX_AGENTS_REACHED':
        return 429;
      case 'AGENT_DELETED':
        return 410;
      case 'AGENT_IN_ERROR_STATE':
        return 503;
      default:
        return 500;
    }
  }

  // --------------------------------------------------------------------------
  // Path Matching Helpers
  // --------------------------------------------------------------------------

  private matchExact(actual: string, pattern: string): boolean {
    const normalized = actual.endsWith('/') ? actual.slice(0, -1) : actual;
    return normalized === pattern;
  }

  /**
   * Match a path with named segments (e.g., '/agents/:id').
   * Returns extracted params or null if no match.
   */
  private matchParam(actual: string, pattern: string): Record<string, string> | null {
    const actualParts = actual.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    if (actualParts.length !== patternParts.length) return null;

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      const ap = actualParts[i];

      if (pp.startsWith(':')) {
        params[pp.slice(1)] = ap;
      } else if (pp !== ap) {
        return null;
      }
    }

    return params;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an AgentManagerApi with default demo data.
 */
export function createAgentManagerApi(service?: AgentManagerService): AgentManagerApi {
  return new AgentManagerApi(service);
}

/**
 * Create an AgentManagerApi with custom configuration.
 */
export function createAgentManagerApiWithConfig(
  storage?: AgentStorage,
  config?: Partial<AgentManagerConfig>
): AgentManagerApi {
  const service = createAgentManagerService(storage, config);
  return new AgentManagerApi(service);
}

export { DEFAULT_AGENT_MANAGER_CONFIG };
