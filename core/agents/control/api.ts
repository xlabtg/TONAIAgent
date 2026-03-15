/**
 * TONAIAgent - Agent Control API Handler
 *
 * Framework-agnostic REST API handler for the Agent Control API.
 *
 * Endpoints (Issue #185):
 *   GET  /api/agents              — List all agents
 *   GET  /api/agents/:id          — Get agent status (id, status, strategy, uptime, trades)
 *   POST /api/agents/:id/start    — Start a stopped agent
 *   POST /api/agents/:id/stop     — Stop an active agent
 *   POST /api/agents/:id/restart  — Restart an agent
 *
 * Implements Issue #185: Agent Control API
 */

import type {
  AgentActionResult,
  AgentControlRequest,
  AgentControlResponse,
  AgentControlResponseBody,
  AgentStatus,
  ListAgentsResult,
} from './types';

import { AgentControlError } from './types';
import { AgentManager, createAgentManager, DEFAULT_AGENT_CONTROL_CONFIG } from './manager';
import type { AgentControlConfig } from './types';

// ============================================================================
// Agent Control API
// ============================================================================

/** Framework-agnostic REST handler for the Agent Control API */
export class AgentControlApi {
  private readonly manager: AgentManager;

  constructor(manager?: AgentManager) {
    this.manager = manager ?? createAgentManager();
  }

  /** Dispatch an incoming request to the appropriate handler. */
  async handle(req: AgentControlRequest): Promise<AgentControlResponse> {
    const { method, path } = req;

    // GET /api/agents
    if (method === 'GET' && this.matchExact(path, '/api/agents')) {
      return this.handleListAgents();
    }

    // POST /api/agents/:id/start
    const startMatch = this.matchParam(path, '/api/agents/:id/start');
    if (method === 'POST' && startMatch) {
      return this.handleStartAgent(startMatch.id);
    }

    // POST /api/agents/:id/stop
    const stopMatch = this.matchParam(path, '/api/agents/:id/stop');
    if (method === 'POST' && stopMatch) {
      return this.handleStopAgent(stopMatch.id);
    }

    // POST /api/agents/:id/restart
    const restartMatch = this.matchParam(path, '/api/agents/:id/restart');
    if (method === 'POST' && restartMatch) {
      return this.handleRestartAgent(restartMatch.id);
    }

    // GET /api/agents/:id   (must come after the action routes to avoid shadowing)
    const agentMatch = this.matchParam(path, '/api/agents/:id');
    if (method === 'GET' && agentMatch) {
      return this.handleGetAgent(agentMatch.id);
    }

    return this.notFound();
  }

  /** Expose the underlying manager (e.g. for event subscription). */
  getManager(): AgentManager {
    return this.manager;
  }

  // --------------------------------------------------------------------------
  // Request Handlers
  // --------------------------------------------------------------------------

  private handleListAgents(): AgentControlResponse<ListAgentsResult> {
    const result = this.manager.listAgents();
    return this.ok(result);
  }

  private handleGetAgent(agentId: string): AgentControlResponse {
    try {
      const status = this.manager.getAgentStatus(agentId);
      return this.ok(status);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleStartAgent(agentId: string): AgentControlResponse {
    try {
      const result = this.manager.startAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleStopAgent(agentId: string): AgentControlResponse {
    try {
      const result = this.manager.stopAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleRestartAgent(agentId: string): AgentControlResponse {
    try {
      const result = this.manager.restartAgent(agentId);
      return this.ok(result);
    } catch (err) {
      return this.handleError(err);
    }
  }

  // --------------------------------------------------------------------------
  // Response Helpers
  // --------------------------------------------------------------------------

  private ok<T>(data: T): AgentControlResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private notFound(): AgentControlResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'AGENT_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): AgentControlResponse {
    if (err instanceof AgentControlError) {
      const statusCode = this.errorCodeToStatus(err.code);
      return {
        statusCode,
        body: { success: false, error: err.message, code: err.code },
      };
    }
    return {
      statusCode: 500,
      body: { success: false, error: 'Internal server error', code: 'OPERATION_FAILED' },
    };
  }

  private errorCodeToStatus(code: string): number {
    switch (code) {
      case 'AGENT_NOT_FOUND':
        return 404;
      case 'AGENT_ALREADY_RUNNING':
      case 'AGENT_ALREADY_STOPPED':
      case 'AGENT_IN_ERROR_STATE':
        return 409;
      case 'INVALID_AGENT_ID':
        return 400;
      default:
        return 500;
    }
  }

  // --------------------------------------------------------------------------
  // Path Matching Helpers
  // --------------------------------------------------------------------------

  private matchExact(actual: string, pattern: string): boolean {
    return actual === pattern || actual === pattern + '/';
  }

  /**
   * Match a path with a single named segment (e.g. '/api/agents/:id').
   * Returns an object with extracted param values, or null if no match.
   */
  private matchParam(actual: string, pattern: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const actualParts = actual.split('/');

    if (patternParts.length !== actualParts.length) return null;

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
// Factory
// ============================================================================

/** Create an AgentControlApi with default demo data. */
export function createAgentControlApi(
  manager?: AgentManager,
): AgentControlApi {
  return new AgentControlApi(manager);
}

/** Create an AgentControlApi with a custom config (uses default demo registry). */
export function createAgentControlApiWithConfig(
  config: Partial<AgentControlConfig>
): AgentControlApi {
  const manager = createAgentManager(undefined, config);
  return new AgentControlApi(manager);
}

export { DEFAULT_AGENT_CONTROL_CONFIG };
