/**
 * TONAIAgent - Strategy Reputation API
 *
 * REST API endpoints for the Strategy Reputation & Ranking Engine.
 *
 * Endpoints:
 * - GET /strategies/ranking - Get ranked strategies
 * - GET /strategies/{strategy_id}/metrics - Get strategy metrics
 * - GET /strategies/{strategy_id}/reputation - Get strategy reputation score
 * - GET /leaderboards - Get all leaderboards
 * - GET /leaderboards/{category} - Get specific leaderboard
 *
 * Implements Issue #218: Strategy Reputation & Ranking Engine
 */

import {
  GetRankingRequest,
  GetRankingResponse,
  GetStrategyMetricsRequest,
  GetStrategyMetricsResponse,
  RankingCategory,
  Leaderboard,
  StrategyReputationScore,
  ReputationEventCallback,
} from './types';

import {
  StrategyRankingEngine,
  DefaultStrategyRankingEngine,
  createStrategyRankingEngine,
  StrategyMetricsInput,
} from './ranking';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * API request structure.
 */
export interface ReputationApiRequest {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request path */
  path: string;
  /** Request body (for POST/PUT) */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string>;
}

/**
 * API response structure.
 */
export interface ReputationApiResponse {
  /** HTTP status code */
  status: number;
  /** Response body */
  body: ReputationApiResponseBody;
}

/**
 * API response body types.
 */
export type ReputationApiResponseBody =
  | GetRankingResponse
  | GetStrategyMetricsResponse
  | StrategyReputationScore
  | Leaderboard
  | Leaderboard[]
  | { error: string; code: string }
  | { success: boolean; message: string };

// ============================================================================
// API Error Types
// ============================================================================

/** API error codes */
export type ReputationApiErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INVALID_CATEGORY'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

/**
 * API error class.
 */
export class ReputationApiError extends Error {
  constructor(
    public readonly code: ReputationApiErrorCode,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'ReputationApiError';
  }
}

// ============================================================================
// Reputation API Implementation
// ============================================================================

/**
 * Strategy Reputation API handler.
 */
export class ReputationApi {
  private readonly rankingEngine: DefaultStrategyRankingEngine;

  constructor(rankingEngine?: DefaultStrategyRankingEngine) {
    this.rankingEngine = rankingEngine ?? createStrategyRankingEngine();
  }

  /**
   * Handle an API request.
   */
  async handle(request: ReputationApiRequest): Promise<ReputationApiResponse> {
    try {
      const { method, path } = request;

      // Route the request
      // GET /strategies/ranking
      if (method === 'GET' && path === '/api/strategies/ranking') {
        return this.handleGetRanking(request);
      }

      // GET /strategies/{strategy_id}/metrics
      const metricsMatch = path.match(/^\/api\/strategies\/([^/]+)\/metrics$/);
      if (method === 'GET' && metricsMatch) {
        return this.handleGetStrategyMetrics(metricsMatch[1]);
      }

      // GET /strategies/{strategy_id}/reputation
      const reputationMatch = path.match(/^\/api\/strategies\/([^/]+)\/reputation$/);
      if (method === 'GET' && reputationMatch) {
        return this.handleGetStrategyReputation(reputationMatch[1]);
      }

      // GET /leaderboards
      if (method === 'GET' && path === '/api/leaderboards') {
        return this.handleGetAllLeaderboards();
      }

      // GET /leaderboards/{category}
      const leaderboardMatch = path.match(/^\/api\/leaderboards\/([^/]+)$/);
      if (method === 'GET' && leaderboardMatch) {
        return this.handleGetLeaderboard(leaderboardMatch[1]);
      }

      // POST /strategies/{strategy_id}/register
      const registerMatch = path.match(/^\/api\/strategies\/([^/]+)\/register$/);
      if (method === 'POST' && registerMatch) {
        return this.handleRegisterStrategy(registerMatch[1], request.body as RegisterStrategyBody);
      }

      // PUT /strategies/{strategy_id}/metrics
      const updateMetricsMatch = path.match(/^\/api\/strategies\/([^/]+)\/metrics$/);
      if (method === 'PUT' && updateMetricsMatch) {
        return this.handleUpdateStrategyMetrics(updateMetricsMatch[1], request.body as StrategyMetricsInput);
      }

      // DELETE /strategies/{strategy_id}
      const deleteMatch = path.match(/^\/api\/strategies\/([^/]+)$/);
      if (method === 'DELETE' && deleteMatch) {
        return this.handleDeleteStrategy(deleteMatch[1]);
      }

      // Unknown route
      return {
        status: 404,
        body: { error: 'Not found', code: 'NOT_FOUND' },
      };
    } catch (error) {
      if (error instanceof ReputationApiError) {
        return {
          status: error.statusCode,
          body: { error: error.message, code: error.code },
        };
      }
      return {
        status: 500,
        body: { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      };
    }
  }

  /**
   * GET /strategies/ranking
   */
  private handleGetRanking(request: ReputationApiRequest): ReputationApiResponse {
    const query = request.query ?? {};
    const category = query.category as RankingCategory | undefined;
    const limit = parseInt(query.limit ?? '50', 10);
    const offset = parseInt(query.offset ?? '0', 10);

    let leaderboard: Leaderboard;
    if (category) {
      if (!this.isValidCategory(category)) {
        throw new ReputationApiError('INVALID_CATEGORY', `Invalid category: ${category}`);
      }
      leaderboard = this.rankingEngine.getLeaderboard(category);
    } else {
      leaderboard = this.rankingEngine.getLeaderboard('top_performing');
    }

    const strategies = leaderboard.entries.slice(offset, offset + limit);
    const total = leaderboard.entries.length;

    const response: GetRankingResponse = {
      strategies,
      total,
      offset,
      limit,
    };

    return { status: 200, body: response };
  }

  /**
   * GET /strategies/{strategy_id}/metrics
   */
  private handleGetStrategyMetrics(strategyId: string): ReputationApiResponse {
    const metricsAggregator = this.rankingEngine.getMetricsAggregator();
    const metrics = metricsAggregator.getAggregatedMetrics(strategyId);

    if (!metrics) {
      throw new ReputationApiError('STRATEGY_NOT_FOUND', `Strategy not found: ${strategyId}`, 404);
    }

    const score = this.rankingEngine.getStrategyScore(strategyId);

    const response: GetStrategyMetricsResponse = {
      strategy_id: strategyId,
      performance: metrics.performance,
      risk: metrics.risk,
      popularity: metrics.usage,
      rating: metrics.community,
      reputation_score: score?.reputation_score ?? 0,
    };

    return { status: 200, body: response };
  }

  /**
   * GET /strategies/{strategy_id}/reputation
   */
  private handleGetStrategyReputation(strategyId: string): ReputationApiResponse {
    const score = this.rankingEngine.getStrategyScore(strategyId);

    if (!score) {
      throw new ReputationApiError('STRATEGY_NOT_FOUND', `Strategy not found: ${strategyId}`, 404);
    }

    return { status: 200, body: score };
  }

  /**
   * GET /leaderboards
   */
  private handleGetAllLeaderboards(): ReputationApiResponse {
    const leaderboards = this.rankingEngine.getAllLeaderboards();
    return { status: 200, body: leaderboards };
  }

  /**
   * GET /leaderboards/{category}
   */
  private handleGetLeaderboard(category: string): ReputationApiResponse {
    if (!this.isValidCategory(category)) {
      throw new ReputationApiError('INVALID_CATEGORY', `Invalid category: ${category}`);
    }

    const leaderboard = this.rankingEngine.getLeaderboard(category as RankingCategory);
    return { status: 200, body: leaderboard };
  }

  /**
   * POST /strategies/{strategy_id}/register
   */
  private handleRegisterStrategy(
    strategyId: string,
    body: RegisterStrategyBody
  ): ReputationApiResponse {
    if (!body || !body.strategy_name || !body.author_id) {
      throw new ReputationApiError('INVALID_REQUEST', 'Missing required fields: strategy_name, author_id');
    }

    const score = this.rankingEngine.registerStrategy(
      strategyId,
      body.strategy_name,
      body.author_id
    );

    return { status: 201, body: score };
  }

  /**
   * PUT /strategies/{strategy_id}/metrics
   */
  private handleUpdateStrategyMetrics(
    strategyId: string,
    body: StrategyMetricsInput
  ): ReputationApiResponse {
    if (!body) {
      throw new ReputationApiError('INVALID_REQUEST', 'Missing request body');
    }

    const score = this.rankingEngine.updateStrategyMetrics(strategyId, body);

    if (!score) {
      throw new ReputationApiError('STRATEGY_NOT_FOUND', `Strategy not found: ${strategyId}`, 404);
    }

    return { status: 200, body: score };
  }

  /**
   * DELETE /strategies/{strategy_id}
   */
  private handleDeleteStrategy(strategyId: string): ReputationApiResponse {
    this.rankingEngine.removeStrategy(strategyId);
    return { status: 200, body: { success: true, message: 'Strategy removed from ranking' } };
  }

  /**
   * Get the underlying ranking engine.
   */
  getRankingEngine(): StrategyRankingEngine {
    return this.rankingEngine;
  }

  /**
   * Subscribe to events.
   */
  onEvent(callback: ReputationEventCallback): void {
    this.rankingEngine.onEvent(callback);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private isValidCategory(category: string): category is RankingCategory {
    const validCategories: RankingCategory[] = [
      'top_performing',
      'most_popular',
      'low_risk',
      'new_strategies',
      'trending',
    ];
    return validCategories.includes(category as RankingCategory);
  }
}

/**
 * Request body for registering a strategy.
 */
interface RegisterStrategyBody {
  strategy_name: string;
  author_id: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new Reputation API instance.
 */
export function createReputationApi(
  rankingEngine?: DefaultStrategyRankingEngine
): ReputationApi {
  return new ReputationApi(rankingEngine);
}

/**
 * Creates a demo Reputation API with sample data.
 */
export function createDemoReputationApi(): ReputationApi {
  const api = new ReputationApi();
  const engine = api.getRankingEngine();

  // Register demo strategies
  const demoStrategies = [
    { id: 'momentum_v1', name: 'AI Momentum Pro', author: 'alice_dev' },
    { id: 'arbitrage_v1', name: 'TON Arbitrage Bot', author: 'bob_trader' },
    { id: 'defi_swing', name: 'DeFi Swing Trader', author: 'charlie_quant' },
    { id: 'grid_trading', name: 'Grid Trading Master', author: 'diana_algo' },
    { id: 'yield_optimizer', name: 'Yield Farm Optimizer', author: 'eve_defi' },
  ];

  for (const strategy of demoStrategies) {
    engine.registerStrategy(strategy.id, strategy.name, strategy.author);
  }

  // Add demo metrics
  engine.updateStrategyMetrics('momentum_v1', {
    roi: 18.4,
    win_rate: 62,
    max_drawdown: -12,
    trade_count: 312,
    agents_using: 148,
    rating: 4.6,
    reviews: 82,
  });

  engine.updateStrategyMetrics('arbitrage_v1', {
    roi: 24.2,
    win_rate: 78,
    max_drawdown: -8,
    trade_count: 1240,
    agents_using: 95,
    rating: 4.3,
    reviews: 56,
  });

  engine.updateStrategyMetrics('defi_swing', {
    roi: 15.8,
    win_rate: 55,
    max_drawdown: -18,
    trade_count: 156,
    agents_using: 72,
    rating: 4.1,
    reviews: 34,
  });

  engine.updateStrategyMetrics('grid_trading', {
    roi: 12.5,
    win_rate: 68,
    max_drawdown: -6,
    trade_count: 890,
    agents_using: 210,
    rating: 4.8,
    reviews: 124,
  });

  engine.updateStrategyMetrics('yield_optimizer', {
    roi: 8.2,
    win_rate: 72,
    max_drawdown: -4,
    trade_count: 45,
    agents_using: 320,
    rating: 4.5,
    reviews: 98,
  });

  return api;
}
