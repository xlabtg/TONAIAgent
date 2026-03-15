/**
 * TONAIAgent - Portfolio API Handler
 *
 * Framework-agnostic REST API handler for the Portfolio Engine.
 *
 * Endpoints (Issue #214):
 *   GET  /api/portfolio/:agentId              - Get portfolio overview
 *   GET  /api/portfolio/:agentId/trades       - Get trade history
 *   GET  /api/portfolio/:agentId/positions    - Get active positions
 *   GET  /api/portfolio/:agentId/balances     - Get balances
 *   GET  /api/portfolio/:agentId/metrics      - Get portfolio metrics
 *   POST /api/portfolio/:agentId/trades       - Execute a new trade
 *
 * Implements Issue #214: Portfolio Storage & Trade History
 */

import type {
  PortfolioApiRequest,
  PortfolioApiResponse,
  PortfolioOverviewResponse,
  TradeHistoryResponse,
  PositionsResponse,
  BalanceRecord,
  PortfolioMetrics,
  Trade,
  TradeSide,
} from './types';

import { PortfolioError } from './types';
import {
  PortfolioEngine,
  createPortfolioEngine,
  createDemoPortfolioEngine,
  ExecuteTradeRequest,
  ExecuteTradeResult,
} from './engine';

// ============================================================================
// Portfolio API
// ============================================================================

/**
 * Framework-agnostic REST handler for the Portfolio API.
 *
 * @example
 * ```typescript
 * const api = createPortfolioApi();
 *
 * // Handle a request
 * const response = await api.handle({
 *   method: 'GET',
 *   path: '/api/portfolio/agent_001',
 * });
 *
 * // Response
 * // {
 * //   statusCode: 200,
 * //   body: {
 * //     success: true,
 * //     data: {
 * //       portfolioValue: 10420,
 * //       positions: [...],
 * //       balances: {...}
 * //     }
 * //   }
 * // }
 * ```
 */
export class PortfolioApi {
  private readonly engine: PortfolioEngine;

  constructor(engine?: PortfolioEngine) {
    this.engine = engine ?? createPortfolioEngine();
  }

  /** Dispatch an incoming request to the appropriate handler */
  async handle(req: PortfolioApiRequest): Promise<PortfolioApiResponse> {
    const { method, path } = req;

    // POST /api/portfolio/:agentId/trades - Execute trade
    const tradePostMatch = this.matchParam(path, '/api/portfolio/:agentId/trades');
    if (method === 'POST' && tradePostMatch) {
      return this.handleExecuteTrade(tradePostMatch.agentId, req.body);
    }

    // GET /api/portfolio/:agentId/trades - Trade history
    const tradesMatch = this.matchParam(path, '/api/portfolio/:agentId/trades');
    if (method === 'GET' && tradesMatch) {
      return this.handleGetTrades(tradesMatch.agentId, req.query);
    }

    // GET /api/portfolio/:agentId/positions - Positions
    const positionsMatch = this.matchParam(path, '/api/portfolio/:agentId/positions');
    if (method === 'GET' && positionsMatch) {
      return this.handleGetPositions(positionsMatch.agentId);
    }

    // GET /api/portfolio/:agentId/balances - Balances
    const balancesMatch = this.matchParam(path, '/api/portfolio/:agentId/balances');
    if (method === 'GET' && balancesMatch) {
      return this.handleGetBalances(balancesMatch.agentId);
    }

    // GET /api/portfolio/:agentId/metrics - Metrics
    const metricsMatch = this.matchParam(path, '/api/portfolio/:agentId/metrics');
    if (method === 'GET' && metricsMatch) {
      return this.handleGetMetrics(metricsMatch.agentId);
    }

    // GET /api/portfolio/:agentId - Portfolio overview (must come last)
    const portfolioMatch = this.matchParam(path, '/api/portfolio/:agentId');
    if (method === 'GET' && portfolioMatch) {
      return this.handleGetPortfolio(portfolioMatch.agentId);
    }

    return this.notFound();
  }

  /** Expose the underlying engine */
  getEngine(): PortfolioEngine {
    return this.engine;
  }

  // --------------------------------------------------------------------------
  // Request Handlers
  // --------------------------------------------------------------------------

  private handleGetPortfolio(agentId: string): PortfolioApiResponse<PortfolioOverviewResponse> {
    try {
      const summary = this.engine.getPortfolioSummary(agentId);
      const balancesMap: Record<string, number> = {};
      for (const balance of summary.balances) {
        balancesMap[balance.asset] = balance.balance;
      }

      const response: PortfolioOverviewResponse = {
        portfolioValue: summary.portfolio.totalValue,
        baseCurrency: summary.portfolio.baseCurrency,
        positions: summary.positions,
        balances: balancesMap,
        metrics: summary.metrics,
      };

      return this.ok(response);
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<PortfolioOverviewResponse>;
    }
  }

  private handleGetTrades(
    agentId: string,
    query?: Record<string, string>
  ): PortfolioApiResponse<TradeHistoryResponse> {
    try {
      const limit = query?.limit ? parseInt(query.limit, 10) : 100;
      const offset = query?.offset ? parseInt(query.offset, 10) : 0;

      const trades = this.engine.getTrades({
        agentId,
        limit,
        offset,
      });

      const total = this.engine.getStorage().countTradesByAgent(agentId);

      const response: TradeHistoryResponse = {
        trades,
        total,
        limit,
        offset,
      };

      return this.ok(response);
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<TradeHistoryResponse>;
    }
  }

  private handleGetPositions(agentId: string): PortfolioApiResponse<PositionsResponse> {
    try {
      const positions = this.engine.getPositions(agentId);

      const response: PositionsResponse = {
        positions,
        total: positions.length,
      };

      return this.ok(response);
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<PositionsResponse>;
    }
  }

  private handleGetBalances(agentId: string): PortfolioApiResponse<BalanceRecord[]> {
    try {
      const balances = this.engine.getBalances(agentId);
      return this.ok(balances);
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<BalanceRecord[]>;
    }
  }

  private handleGetMetrics(agentId: string): PortfolioApiResponse<PortfolioMetrics> {
    try {
      const metrics = this.engine.calculateMetrics(agentId);
      return this.ok(metrics);
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<PortfolioMetrics>;
    }
  }

  private handleExecuteTrade(
    agentId: string,
    body: unknown
  ): PortfolioApiResponse<ExecuteTradeResult> {
    try {
      const tradeRequest = this.parseTradeRequest(agentId, body);
      const result = this.engine.executeTrade(tradeRequest);

      if (result.success) {
        return this.ok(result);
      } else {
        return {
          statusCode: 400,
          body: { success: false, error: result.error, code: 'OPERATION_FAILED' },
        };
      }
    } catch (err) {
      return this.handleError(err) as PortfolioApiResponse<ExecuteTradeResult>;
    }
  }

  // --------------------------------------------------------------------------
  // Response Helpers
  // --------------------------------------------------------------------------

  private ok<T>(data: T): PortfolioApiResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private notFound(): PortfolioApiResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'PORTFOLIO_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): PortfolioApiResponse {
    if (err instanceof PortfolioError) {
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
      case 'PORTFOLIO_NOT_FOUND':
      case 'POSITION_NOT_FOUND':
      case 'TRADE_NOT_FOUND':
        return 404;
      case 'INSUFFICIENT_BALANCE':
      case 'INVALID_AGENT_ID':
      case 'INVALID_AMOUNT':
      case 'INVALID_PRICE':
        return 400;
      default:
        return 500;
    }
  }

  // --------------------------------------------------------------------------
  // Path Matching Helpers
  // --------------------------------------------------------------------------

  /**
   * Match a path with named segments (e.g. '/api/portfolio/:agentId').
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

  // --------------------------------------------------------------------------
  // Request Parsing
  // --------------------------------------------------------------------------

  private parseTradeRequest(agentId: string, body: unknown): ExecuteTradeRequest {
    if (!body || typeof body !== 'object') {
      throw new PortfolioError(
        'Request body must be an object',
        'OPERATION_FAILED',
        { body }
      );
    }

    const data = body as Record<string, unknown>;

    const pair = data.pair;
    const side = data.side;
    const quantity = data.quantity;
    const price = data.price;
    const strategyId = data.strategyId;

    if (typeof pair !== 'string') {
      throw new PortfolioError('Missing or invalid "pair" field', 'OPERATION_FAILED');
    }

    if (side !== 'BUY' && side !== 'SELL') {
      throw new PortfolioError('Invalid "side" field. Must be "BUY" or "SELL"', 'OPERATION_FAILED');
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new PortfolioError('Missing or invalid "quantity" field', 'INVALID_AMOUNT');
    }

    if (typeof price !== 'number' || price <= 0) {
      throw new PortfolioError('Missing or invalid "price" field', 'INVALID_PRICE');
    }

    return {
      agentId,
      pair,
      side: side as TradeSide,
      quantity,
      price,
      strategyId: typeof strategyId === 'string' ? strategyId : undefined,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a PortfolioApi instance */
export function createPortfolioApi(engine?: PortfolioEngine): PortfolioApi {
  return new PortfolioApi(engine);
}

/** Create a PortfolioApi with demo data */
export function createDemoPortfolioApi(): PortfolioApi {
  const engine = createDemoPortfolioEngine();
  return new PortfolioApi(engine);
}
