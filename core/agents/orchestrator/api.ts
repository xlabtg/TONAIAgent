/**
 * TONAIAgent - One-Click Agent Creation API
 *
 * Framework-agnostic REST API handler for the Agent Orchestrator.
 *
 * Endpoints:
 *   POST /agents                — Create a new agent (one-click)
 *   GET  /agents                — List all agents
 *   GET  /agents/:agentId       — Get agent details
 *   GET  /agents/user/:userId   — List agents for a user
 *   DELETE /agents/:agentId     — Terminate an agent
 *   GET  /agents/strategies     — List available strategy templates
 *   GET  /agents/health         — Orchestrator health check
 *
 * Issue #91: Implement One-Click Agent Creation API
 *
 * @example
 * ```typescript
 * // With Express:
 * const api = createAgentOrchestratorApi();
 *
 * app.post('/agents', async (req, res) => {
 *   const result = await api.handle({ method: 'POST', path: '/agents', body: req.body });
 *   res.status(result.status).json(result.body);
 * });
 * ```
 */

import type {
  AgentOrchestratorConfig,
  CreateAgentInput,
  OrchestratorApiRequest,
  OrchestratorApiResponse,
} from './types';

import { AgentOrchestratorError } from './types';
import { AgentOrchestrator, createAgentOrchestrator } from './orchestrator';

// ============================================================================
// Agent Orchestrator API
// ============================================================================

/**
 * Framework-agnostic API handler for the Agent Orchestrator.
 *
 * Routes incoming requests to the appropriate orchestrator method and
 * returns structured responses in a standard envelope format.
 */
export class AgentOrchestratorApi {
  private readonly orchestrator: AgentOrchestrator;

  constructor(orchestrator?: AgentOrchestrator) {
    this.orchestrator = orchestrator ?? createAgentOrchestrator();
  }

  /**
   * Handle an incoming API request.
   *
   * Routes:
   *   POST /agents                — createAgent
   *   GET  /agents                — listAllAgents
   *   GET  /agents/health         — getHealth
   *   GET  /agents/strategies     — listStrategies
   *   GET  /agents/user/:userId   — listAgentsByUser
   *   GET  /agents/:agentId       — getAgent
   *   DELETE /agents/:agentId     — terminateAgent
   */
  async handle(req: OrchestratorApiRequest): Promise<OrchestratorApiResponse> {
    try {
      const { method, path } = req;

      // POST /agents — Create agent (main endpoint)
      if (method === 'POST' && this.matchPath(path, '/agents')) {
        return await this.handleCreateAgent(req);
      }

      // GET /agents/health
      if (method === 'GET' && this.matchPath(path, '/agents/health')) {
        return this.handleGetHealth();
      }

      // GET /agents/strategies
      if (method === 'GET' && this.matchPath(path, '/agents/strategies')) {
        return this.handleListStrategies();
      }

      // GET /agents/user/:userId
      const userMatch = this.matchParam(path, '/agents/user/:userId');
      if (method === 'GET' && userMatch) {
        return this.handleListAgentsByUser(userMatch.userId);
      }

      // GET /agents
      if (method === 'GET' && this.matchPath(path, '/agents')) {
        return this.handleListAllAgents();
      }

      // GET /agents/:agentId
      const agentMatch = this.matchParam(path, '/agents/:agentId');
      if (method === 'GET' && agentMatch) {
        return this.handleGetAgent(agentMatch.agentId);
      }

      // DELETE /agents/:agentId
      if (method === 'DELETE' && agentMatch) {
        return await this.handleTerminateAgent(agentMatch.agentId);
      }

      return this.notFound(`Route not found: ${method} ${path}`);

    } catch (err) {
      return this.handleError(err);
    }
  }

  // ============================================================================
  // Route Handlers
  // ============================================================================

  /** POST /agents — One-click agent creation */
  private async handleCreateAgent(req: OrchestratorApiRequest): Promise<OrchestratorApiResponse> {
    const body = req.body as Partial<CreateAgentInput> | undefined;

    if (!body) {
      return this.badRequest('Request body is required');
    }

    const { userId, strategy, telegram, tonWallet, environment } = body;

    if (!userId) {
      return this.badRequest('userId is required');
    }
    if (!strategy) {
      return this.badRequest('strategy is required');
    }
    if (!environment) {
      return this.badRequest('environment is required');
    }

    const input: CreateAgentInput = {
      userId: String(userId),
      strategy,
      telegram: telegram ?? false,
      tonWallet: tonWallet ?? false,
      environment,
      name: body.name,
      strategyConfig: body.strategyConfig,
      budgetTon: body.budgetTon,
      idempotencyKey: body.idempotencyKey,
    };

    const result = await this.orchestrator.createAgent(input);

    return {
      status: 201,
      body: {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** GET /agents — List all agents */
  private handleListAllAgents(): OrchestratorApiResponse {
    const agents = this.orchestrator.listAllAgents();
    return {
      status: 200,
      body: {
        success: true,
        data: { agents, total: agents.length },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** GET /agents/:agentId — Get agent details */
  private handleGetAgent(agentId: string): OrchestratorApiResponse {
    const agent = this.orchestrator.getAgent(agentId);
    return {
      status: 200,
      body: {
        success: true,
        data: agent,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** GET /agents/user/:userId — List agents for user */
  private handleListAgentsByUser(userId: string): OrchestratorApiResponse {
    const agents = this.orchestrator.listAgentsByUser(userId);
    return {
      status: 200,
      body: {
        success: true,
        data: { agents, total: agents.length, userId },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** DELETE /agents/:agentId — Terminate an agent */
  private async handleTerminateAgent(agentId: string): Promise<OrchestratorApiResponse> {
    await this.orchestrator.terminateAgent(agentId);
    return {
      status: 200,
      body: {
        success: true,
        data: { agentId, terminated: true },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** GET /agents/strategies — List strategy templates */
  private handleListStrategies(): OrchestratorApiResponse {
    const strategies = this.orchestrator.listStrategies();
    return {
      status: 200,
      body: {
        success: true,
        data: { strategies, total: strategies.length },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** GET /agents/health — Orchestrator health check */
  private handleGetHealth(): OrchestratorApiResponse {
    const health = this.orchestrator.getHealth();
    const statusCode = health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 200 : 503;
    return {
      status: statusCode,
      body: {
        success: health.overall !== 'unhealthy',
        data: health,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  private ok<T>(data: T): OrchestratorApiResponse<T> {
    return {
      status: 200,
      body: { success: true, data, timestamp: new Date().toISOString() },
    };
  }

  private badRequest(error: string): OrchestratorApiResponse {
    return {
      status: 400,
      body: { success: false, error, timestamp: new Date().toISOString() },
    };
  }

  private notFound(error: string): OrchestratorApiResponse {
    return {
      status: 404,
      body: { success: false, error, timestamp: new Date().toISOString() },
    };
  }

  private handleError(err: unknown): OrchestratorApiResponse {
    if (err instanceof AgentOrchestratorError) {
      const statusMap: Record<string, number> = {
        AGENT_NOT_FOUND: 404,
        AGENT_ALREADY_EXISTS: 409,
        INVALID_STRATEGY: 400,
        INVALID_ENVIRONMENT: 400,
        RATE_LIMIT_EXCEEDED: 429,
        USER_AGENT_LIMIT_REACHED: 429,
        TOTAL_AGENT_LIMIT_REACHED: 503,
        ORCHESTRATOR_DISABLED: 503,
        WALLET_CREATION_FAILED: 500,
        TELEGRAM_PROVISIONING_FAILED: 500,
        RUNTIME_INITIALIZATION_FAILED: 500,
        STRATEGY_BINDING_FAILED: 500,
        PERSISTENCE_FAILED: 500,
        SECURITY_SETUP_FAILED: 500,
      };
      const status = statusMap[err.code] ?? 500;
      return {
        status,
        body: {
          success: false,
          error: err.message,
          timestamp: new Date().toISOString(),
        },
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

  /** Exact path match */
  private matchPath(path: string, pattern: string): boolean {
    return path === pattern || path === `${pattern}/`;
  }

  /** Path with a single parameter (e.g., '/agents/:agentId') */
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

  // ============================================================================
  // Orchestrator Access
  // ============================================================================

  /**
   * Get the underlying orchestrator instance.
   * Useful for direct programmatic access or testing.
   */
  getOrchestrator(): AgentOrchestrator {
    return this.orchestrator;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AgentOrchestratorApi instance.
 *
 * @param orchestratorOrConfig - An existing orchestrator instance or config to create one.
 *
 * @example
 * ```typescript
 * // With default config
 * const api = createAgentOrchestratorApi();
 *
 * // With custom config
 * const api = createAgentOrchestratorApi({ maxAgentsPerUser: 5 });
 *
 * // With existing orchestrator
 * const orchestrator = createAgentOrchestrator({ enabled: true });
 * const api = createAgentOrchestratorApi(orchestrator);
 * ```
 */
export function createAgentOrchestratorApi(
  orchestratorOrConfig?: AgentOrchestrator | Partial<AgentOrchestratorConfig>,
): AgentOrchestratorApi {
  if (orchestratorOrConfig instanceof AgentOrchestrator) {
    return new AgentOrchestratorApi(orchestratorOrConfig);
  }
  const orchestrator = createAgentOrchestrator(orchestratorOrConfig);
  return new AgentOrchestratorApi(orchestrator);
}

export default AgentOrchestratorApi;
