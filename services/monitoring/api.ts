/**
 * TONAIAgent - Monitoring API Handler
 *
 * Framework-agnostic REST API handler for the Agent Monitoring Dashboard.
 *
 * Endpoints (Issue #215):
 *   GET  /api/monitoring/dashboard           - Get dashboard overview
 *   GET  /api/monitoring/agents/:id/metrics  - Get agent metrics
 *   GET  /api/monitoring/agents/:id/positions - Get agent positions
 *   GET  /api/monitoring/agents/:id/trades   - Get agent trade history
 *   GET  /api/monitoring/agents/:id/performance - Get agent performance (equity curve)
 *   GET  /api/monitoring/agents/:id/risk     - Get agent risk indicators
 *
 * Implements Issue #215: Agent Monitoring Dashboard
 */

import type {
  MonitoringApiRequest,
  MonitoringApiResponse,
  MonitoringConfig,
  DashboardOverview,
  AgentMetrics,
  PositionsResponse,
  TradeHistoryResponse,
  EquityCurveResponse,
  RiskIndicators,
} from './types';

import { MonitoringError } from './types';
import {
  MonitoringMetricsService,
  createMonitoringMetricsService,
  createDemoMonitoringMetricsService,
} from './metrics';

// ============================================================================
// Monitoring API
// ============================================================================

/**
 * Framework-agnostic REST handler for the Monitoring API.
 *
 * @example
 * ```typescript
 * const api = createMonitoringApi();
 *
 * // Handle a request
 * const response = await api.handle({
 *   method: 'GET',
 *   path: '/api/monitoring/dashboard',
 * });
 *
 * // Response
 * // {
 * //   statusCode: 200,
 * //   body: {
 * //     success: true,
 * //     data: {
 * //       agents: [...],
 * //       totalAgents: 5,
 * //       statusCounts: { RUNNING: 2, PAUSED: 1, ... }
 * //     }
 * //   }
 * // }
 * ```
 */
export class MonitoringApi {
  private readonly service: MonitoringMetricsService;

  constructor(service?: MonitoringMetricsService) {
    this.service = service ?? createMonitoringMetricsService();
  }

  /** Dispatch an incoming request to the appropriate handler */
  async handle(req: MonitoringApiRequest): Promise<MonitoringApiResponse> {
    const { method, path } = req;

    // GET /api/monitoring/dashboard - Dashboard overview
    if (method === 'GET' && this.matchExact(path, '/api/monitoring/dashboard')) {
      return this.handleGetDashboard();
    }

    // GET /api/monitoring/agents/:id/metrics - Agent metrics
    const metricsMatch = this.matchParam(path, '/api/monitoring/agents/:id/metrics');
    if (method === 'GET' && metricsMatch) {
      return this.handleGetMetrics(metricsMatch.id);
    }

    // GET /api/monitoring/agents/:id/positions - Agent positions
    const positionsMatch = this.matchParam(path, '/api/monitoring/agents/:id/positions');
    if (method === 'GET' && positionsMatch) {
      return this.handleGetPositions(positionsMatch.id);
    }

    // GET /api/monitoring/agents/:id/trades - Agent trade history
    const tradesMatch = this.matchParam(path, '/api/monitoring/agents/:id/trades');
    if (method === 'GET' && tradesMatch) {
      return this.handleGetTrades(tradesMatch.id, req.query);
    }

    // GET /api/monitoring/agents/:id/performance - Agent equity curve
    const performanceMatch = this.matchParam(path, '/api/monitoring/agents/:id/performance');
    if (method === 'GET' && performanceMatch) {
      return this.handleGetPerformance(performanceMatch.id, req.query);
    }

    // GET /api/monitoring/agents/:id/risk - Agent risk indicators
    const riskMatch = this.matchParam(path, '/api/monitoring/agents/:id/risk');
    if (method === 'GET' && riskMatch) {
      return this.handleGetRisk(riskMatch.id);
    }

    return this.notFound();
  }

  /** Expose the underlying service */
  getService(): MonitoringMetricsService {
    return this.service;
  }

  // --------------------------------------------------------------------------
  // Request Handlers
  // --------------------------------------------------------------------------

  private handleGetDashboard(): MonitoringApiResponse<DashboardOverview> {
    try {
      const overview = this.service.getDashboardOverview();
      return this.ok(overview);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<DashboardOverview>;
    }
  }

  private handleGetMetrics(agentId: string): MonitoringApiResponse<AgentMetrics> {
    try {
      const metrics = this.service.getAgentMetrics(agentId);
      return this.ok(metrics);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<AgentMetrics>;
    }
  }

  private handleGetPositions(agentId: string): MonitoringApiResponse<PositionsResponse> {
    try {
      const positions = this.service.getPositions(agentId);
      return this.ok(positions);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<PositionsResponse>;
    }
  }

  private handleGetTrades(
    agentId: string,
    query?: Record<string, string>
  ): MonitoringApiResponse<TradeHistoryResponse> {
    try {
      const limit = query?.limit ? parseInt(query.limit, 10) : 100;
      const offset = query?.offset ? parseInt(query.offset, 10) : 0;

      const trades = this.service.getTrades(agentId, limit, offset);
      return this.ok(trades);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<TradeHistoryResponse>;
    }
  }

  private handleGetPerformance(
    agentId: string,
    query?: Record<string, string>
  ): MonitoringApiResponse<EquityCurveResponse> {
    try {
      const timeframe = (query?.timeframe || 'day') as 'hour' | 'day' | 'week' | 'month' | 'all';
      const equityCurve = this.service.getEquityCurve(agentId, timeframe);
      return this.ok(equityCurve);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<EquityCurveResponse>;
    }
  }

  private handleGetRisk(agentId: string): MonitoringApiResponse<RiskIndicators> {
    try {
      const risk = this.service.getRiskIndicators(agentId);
      return this.ok(risk);
    } catch (err) {
      return this.handleError(err) as MonitoringApiResponse<RiskIndicators>;
    }
  }

  // --------------------------------------------------------------------------
  // Response Helpers
  // --------------------------------------------------------------------------

  private ok<T>(data: T): MonitoringApiResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private notFound(): MonitoringApiResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'AGENT_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): MonitoringApiResponse {
    if (err instanceof MonitoringError) {
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
      case 'PORTFOLIO_NOT_FOUND':
        return 404;
      case 'INVALID_AGENT_ID':
      case 'INVALID_TIMEFRAME':
        return 400;
      case 'SERVICE_UNAVAILABLE':
        return 503;
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
   * Match a path with named segments (e.g. '/api/monitoring/agents/:id/metrics').
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
// Factory Functions
// ============================================================================

/**
 * Create a MonitoringApi instance.
 */
export function createMonitoringApi(service?: MonitoringMetricsService): MonitoringApi {
  return new MonitoringApi(service);
}

/**
 * Create a MonitoringApi with demo data.
 */
export function createDemoMonitoringApi(): MonitoringApi {
  const service = createDemoMonitoringMetricsService();
  return new MonitoringApi(service);
}
