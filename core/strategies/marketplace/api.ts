/**
 * TONAIAgent - Strategy Marketplace API Handler
 *
 * Framework-agnostic REST API handler for the Strategy Marketplace.
 *
 * Endpoints (Issue #216):
 *   GET  /api/marketplace/strategies                   - List strategies with filters
 *   GET  /api/marketplace/strategies/:id               - Get strategy details
 *   GET  /api/marketplace/strategies/:id/performance   - Get strategy performance data
 *   GET  /api/marketplace/strategies/:id/reviews       - Get strategy reviews
 *   POST /api/marketplace/strategies/:id/deploy        - Deploy strategy to agent
 *   POST /api/marketplace/strategies/:id/rate          - Rate a strategy
 *   GET  /api/marketplace/categories                   - Get category list with stats
 *   GET  /api/marketplace/stats                        - Get marketplace statistics
 *   GET  /api/marketplace/top                          - Get top strategies
 *   GET  /api/marketplace/agents                       - Get user's deployed agents
 *   POST /api/marketplace/agents/:id/stop              - Stop a deployed agent
 *
 * Implements Issue #216: Strategy Marketplace UI
 */

import type {
  MarketplaceStrategyListing,
  MarketplaceStrategyFilter,
  DeployMarketplaceStrategyInput,
  MarketplaceDeployedAgent,
  MarketplaceRiskLevel,
  MarketplaceStrategyCategory,
} from './index';

import {
  DefaultStrategyMarketplace,
  createStrategyMarketplace,
} from './index';

import type {
  MarketplaceStats,
  StrategyCategoryInfo,
  StrategyReview,
  StrategyPerformanceSnapshot,
} from './types';

// ============================================================================
// API Types
// ============================================================================

/** Framework-agnostic API request */
export interface MarketplaceApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  /** User ID from authentication */
  userId?: string;
}

/** Framework-agnostic API response */
export interface MarketplaceApiResponse<T = unknown> {
  statusCode: number;
  body: MarketplaceApiResponseBody<T>;
}

/** Standard response envelope */
export interface MarketplaceApiResponseBody<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: MarketplaceErrorCode;
}

/** Error codes for marketplace operations */
export type MarketplaceErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'AGENT_NOT_FOUND'
  | 'INVALID_STRATEGY_ID'
  | 'INVALID_FILTER'
  | 'INSUFFICIENT_CAPITAL'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'OPERATION_FAILED';

/** Structured error for marketplace operations */
export class MarketplaceError extends Error {
  constructor(
    message: string,
    public readonly code: MarketplaceErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

// ============================================================================
// Response Types
// ============================================================================

/** Strategy list response */
export interface StrategyListResponse {
  strategies: MarketplaceStrategyListing[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/** Strategy details response with extended info */
export interface StrategyDetailsResponse {
  strategy: MarketplaceStrategyListing;
  performance: StrategyPerformanceData;
  recentReviews: StrategyReview[];
  similarStrategies: MarketplaceStrategyListing[];
}

/** Strategy performance data for charts */
export interface StrategyPerformanceData {
  /** Equity curve for the last 30 days */
  equityCurve: Array<{ timestamp: Date; value: number }>;
  /** Drawdown history */
  drawdownCurve: Array<{ timestamp: Date; value: number }>;
  /** Trade distribution by outcome */
  tradeDistribution: {
    wins: number;
    losses: number;
    breakeven: number;
  };
  /** Monthly returns */
  monthlyReturns: Array<{ month: string; return: number }>;
  /** Performance snapshots */
  snapshots: StrategyPerformanceSnapshot[];
}

/** Deploy strategy request body */
export interface DeployStrategyRequest {
  capitalTON: number;
  simulationMode?: boolean;
  agentName?: string;
  parameters?: Record<string, unknown>;
}

/** Rate strategy request body */
export interface RateStrategyRequest {
  rating: number;
  title?: string;
  content?: string;
}

/** Category info response */
export interface CategoriesResponse {
  categories: StrategyCategoryInfo[];
}

/** Top strategies response */
export interface TopStrategiesResponse {
  byRoi: MarketplaceStrategyListing[];
  bySharpe: MarketplaceStrategyListing[];
  byPopularity: MarketplaceStrategyListing[];
  newest: MarketplaceStrategyListing[];
}

// ============================================================================
// Marketplace API
// ============================================================================

/**
 * Framework-agnostic REST handler for the Strategy Marketplace API.
 *
 * @example
 * ```typescript
 * const api = createMarketplaceApi();
 *
 * // List strategies
 * const response = await api.handle({
 *   method: 'GET',
 *   path: '/api/marketplace/strategies',
 *   query: { category: 'momentum', riskLevel: 'medium' },
 * });
 *
 * // Deploy a strategy
 * const deployResponse = await api.handle({
 *   method: 'POST',
 *   path: '/api/marketplace/strategies/momentum-trader/deploy',
 *   body: { capitalTON: 100, simulationMode: true },
 *   userId: 'user_123',
 * });
 * ```
 */
export class MarketplaceApi {
  private readonly marketplace: DefaultStrategyMarketplace;
  private readonly reviews: Map<string, StrategyReview[]> = new Map();
  private reviewIdCounter = 0;

  constructor(marketplace?: DefaultStrategyMarketplace) {
    this.marketplace = marketplace ?? createStrategyMarketplace();
  }

  /** Dispatch an incoming request to the appropriate handler */
  async handle(req: MarketplaceApiRequest): Promise<MarketplaceApiResponse> {
    const { method, path } = req;

    // GET /api/marketplace/strategies - List strategies
    if (method === 'GET' && this.matchExact(path, '/api/marketplace/strategies')) {
      return this.handleListStrategies(req.query);
    }

    // GET /api/marketplace/strategies/:id - Get strategy details
    const detailsMatch = this.matchParam(path, '/api/marketplace/strategies/:id');
    if (method === 'GET' && detailsMatch && !path.includes('/performance') && !path.includes('/reviews') && !path.includes('/deploy') && !path.includes('/rate')) {
      return this.handleGetStrategy(detailsMatch.id);
    }

    // GET /api/marketplace/strategies/:id/performance - Get strategy performance
    const performanceMatch = this.matchParam(path, '/api/marketplace/strategies/:id/performance');
    if (method === 'GET' && performanceMatch) {
      return this.handleGetPerformance(performanceMatch.id, req.query);
    }

    // GET /api/marketplace/strategies/:id/reviews - Get strategy reviews
    const reviewsMatch = this.matchParam(path, '/api/marketplace/strategies/:id/reviews');
    if (method === 'GET' && reviewsMatch) {
      return this.handleGetReviews(reviewsMatch.id, req.query);
    }

    // POST /api/marketplace/strategies/:id/deploy - Deploy strategy
    const deployMatch = this.matchParam(path, '/api/marketplace/strategies/:id/deploy');
    if (method === 'POST' && deployMatch) {
      return this.handleDeployStrategy(deployMatch.id, req.body as DeployStrategyRequest, req.userId);
    }

    // POST /api/marketplace/strategies/:id/rate - Rate strategy
    const rateMatch = this.matchParam(path, '/api/marketplace/strategies/:id/rate');
    if (method === 'POST' && rateMatch) {
      return this.handleRateStrategy(rateMatch.id, req.body as RateStrategyRequest, req.userId);
    }

    // GET /api/marketplace/categories - Get categories
    if (method === 'GET' && this.matchExact(path, '/api/marketplace/categories')) {
      return this.handleGetCategories();
    }

    // GET /api/marketplace/stats - Get marketplace stats
    if (method === 'GET' && this.matchExact(path, '/api/marketplace/stats')) {
      return this.handleGetStats();
    }

    // GET /api/marketplace/top - Get top strategies
    if (method === 'GET' && this.matchExact(path, '/api/marketplace/top')) {
      return this.handleGetTopStrategies(req.query);
    }

    // GET /api/marketplace/agents - Get user's agents
    if (method === 'GET' && this.matchExact(path, '/api/marketplace/agents')) {
      return this.handleGetUserAgents(req.userId);
    }

    // POST /api/marketplace/agents/:id/stop - Stop agent
    const stopMatch = this.matchParam(path, '/api/marketplace/agents/:id/stop');
    if (method === 'POST' && stopMatch) {
      return this.handleStopAgent(stopMatch.id);
    }

    return this.notFound();
  }

  /** Expose the underlying marketplace */
  getMarketplace(): DefaultStrategyMarketplace {
    return this.marketplace;
  }

  // --------------------------------------------------------------------------
  // Request Handlers
  // --------------------------------------------------------------------------

  private async handleListStrategies(
    query?: Record<string, string>
  ): Promise<MarketplaceApiResponse<StrategyListResponse>> {
    try {
      const filter: MarketplaceStrategyFilter = {};

      if (query?.category && query.category !== 'all') {
        filter.category = query.category as MarketplaceStrategyCategory;
      }
      if (query?.riskLevel && query.riskLevel !== 'all') {
        filter.riskLevel = query.riskLevel as MarketplaceRiskLevel;
      }
      if (query?.minRoi) {
        filter.minRoi = parseFloat(query.minRoi);
      }
      if (query?.maxDrawdown) {
        filter.maxDrawdown = parseFloat(query.maxDrawdown);
      }
      if (query?.search) {
        filter.search = query.search;
      }
      if (query?.sortBy) {
        filter.sortBy = query.sortBy as 'roi' | 'sharpe' | 'popularity' | 'newest';
      }
      if (query?.sortOrder) {
        filter.sortOrder = query.sortOrder as 'asc' | 'desc';
      }

      const limit = query?.limit ? parseInt(query.limit, 10) : 20;
      const offset = query?.offset ? parseInt(query.offset, 10) : 0;
      filter.limit = limit + 1; // Fetch one extra to determine hasMore
      filter.offset = offset;

      const strategies = await this.marketplace.listStrategies(filter);
      const hasMore = strategies.length > limit;
      const resultStrategies = hasMore ? strategies.slice(0, limit) : strategies;

      return this.ok({
        strategies: resultStrategies,
        total: resultStrategies.length + offset + (hasMore ? 1 : 0),
        offset,
        limit,
        hasMore,
      });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<StrategyListResponse>;
    }
  }

  private async handleGetStrategy(
    strategyId: string
  ): Promise<MarketplaceApiResponse<StrategyDetailsResponse>> {
    try {
      const strategy = await this.marketplace.getStrategy(strategyId);
      if (!strategy) {
        throw new MarketplaceError(
          `Strategy not found: ${strategyId}`,
          'STRATEGY_NOT_FOUND'
        );
      }

      // Get performance data
      const performance = this.generatePerformanceData(strategy);

      // Get recent reviews
      const reviews = this.reviews.get(strategyId) ?? [];
      const recentReviews = reviews.slice(-5);

      // Get similar strategies
      const similar = await this.marketplace.listStrategies({
        category: strategy.category,
        limit: 4,
      });
      const similarStrategies = similar.filter((s) => s.id !== strategyId).slice(0, 3);

      return this.ok({
        strategy,
        performance,
        recentReviews,
        similarStrategies,
      });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<StrategyDetailsResponse>;
    }
  }

  private async handleGetPerformance(
    strategyId: string,
    query?: Record<string, string>
  ): Promise<MarketplaceApiResponse<StrategyPerformanceData>> {
    try {
      const strategy = await this.marketplace.getStrategy(strategyId);
      if (!strategy) {
        throw new MarketplaceError(
          `Strategy not found: ${strategyId}`,
          'STRATEGY_NOT_FOUND'
        );
      }

      const performance = this.generatePerformanceData(strategy);
      return this.ok(performance);
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<StrategyPerformanceData>;
    }
  }

  private async handleGetReviews(
    strategyId: string,
    query?: Record<string, string>
  ): Promise<MarketplaceApiResponse<{ reviews: StrategyReview[]; total: number }>> {
    try {
      const strategy = await this.marketplace.getStrategy(strategyId);
      if (!strategy) {
        throw new MarketplaceError(
          `Strategy not found: ${strategyId}`,
          'STRATEGY_NOT_FOUND'
        );
      }

      const reviews = this.reviews.get(strategyId) ?? [];
      const limit = query?.limit ? parseInt(query.limit, 10) : 10;
      const offset = query?.offset ? parseInt(query.offset, 10) : 0;

      return this.ok({
        reviews: reviews.slice(offset, offset + limit),
        total: reviews.length,
      });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<{ reviews: StrategyReview[]; total: number }>;
    }
  }

  private async handleDeployStrategy(
    strategyId: string,
    body: DeployStrategyRequest,
    userId?: string
  ): Promise<MarketplaceApiResponse<MarketplaceDeployedAgent>> {
    try {
      if (!userId) {
        throw new MarketplaceError('Authentication required', 'UNAUTHORIZED');
      }

      if (!body.capitalTON || body.capitalTON <= 0) {
        throw new MarketplaceError(
          'Capital amount must be positive',
          'VALIDATION_ERROR'
        );
      }

      const input: DeployMarketplaceStrategyInput = {
        strategyId,
        userId,
        capitalTON: body.capitalTON,
        simulationMode: body.simulationMode,
        agentName: body.agentName,
        parameters: body.parameters,
      };

      const agent = await this.marketplace.deployStrategy(input);
      return this.ok(agent);
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<MarketplaceDeployedAgent>;
    }
  }

  private async handleRateStrategy(
    strategyId: string,
    body: RateStrategyRequest,
    userId?: string
  ): Promise<MarketplaceApiResponse<StrategyReview>> {
    try {
      if (!userId) {
        throw new MarketplaceError('Authentication required', 'UNAUTHORIZED');
      }

      if (!body.rating || body.rating < 1 || body.rating > 5) {
        throw new MarketplaceError(
          'Rating must be between 1 and 5',
          'VALIDATION_ERROR'
        );
      }

      const strategy = await this.marketplace.getStrategy(strategyId);
      if (!strategy) {
        throw new MarketplaceError(
          `Strategy not found: ${strategyId}`,
          'STRATEGY_NOT_FOUND'
        );
      }

      const review: StrategyReview = {
        id: `review_${++this.reviewIdCounter}`,
        strategyId,
        userId,
        rating: body.rating,
        title: body.title ?? '',
        content: body.content ?? '',
        verified: false, // Would need to check if user deployed the strategy
        helpfulVotes: 0,
        createdAt: new Date(),
      };

      const existingReviews = this.reviews.get(strategyId) ?? [];
      existingReviews.push(review);
      this.reviews.set(strategyId, existingReviews);

      return this.ok(review);
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<StrategyReview>;
    }
  }

  private async handleGetCategories(): Promise<MarketplaceApiResponse<CategoriesResponse>> {
    try {
      const allStrategies = await this.marketplace.listStrategies();
      const categoryMap = new Map<MarketplaceStrategyCategory, MarketplaceStrategyListing[]>();

      for (const strategy of allStrategies) {
        const list = categoryMap.get(strategy.category) ?? [];
        list.push(strategy);
        categoryMap.set(strategy.category, list);
      }

      const categoryNames: Record<MarketplaceStrategyCategory, string> = {
        momentum: 'Momentum Trading',
        mean_reversion: 'Mean Reversion',
        arbitrage: 'Arbitrage',
        grid_trading: 'Grid Trading',
        yield_farming: 'Yield Farming',
        trend_following: 'Trend Following',
        experimental: 'Experimental',
      };

      const categoryDescriptions: Record<MarketplaceStrategyCategory, string> = {
        momentum: 'Strategies that capture price momentum and trends',
        mean_reversion: 'Strategies that profit from price returning to average',
        arbitrage: 'Strategies that exploit price differences across markets',
        grid_trading: 'Automated trading at predefined price levels',
        yield_farming: 'Strategies focused on DeFi yield optimization',
        trend_following: 'Multi-timeframe trend following strategies',
        experimental: 'New and unverified strategies',
      };

      const categories: StrategyCategoryInfo[] = [];
      for (const [id, strategies] of categoryMap) {
        const avgRoi = strategies.reduce((sum, s) => sum + s.roi30d, 0) / strategies.length;
        categories.push({
          id,
          name: categoryNames[id],
          description: categoryDescriptions[id],
          strategyCount: strategies.length,
          averageRoi: Math.round(avgRoi * 10) / 10,
        });
      }

      // Sort by strategy count
      categories.sort((a, b) => b.strategyCount - a.strategyCount);

      return this.ok({ categories });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<CategoriesResponse>;
    }
  }

  private async handleGetStats(): Promise<MarketplaceApiResponse<MarketplaceStats>> {
    try {
      const baseStats = this.marketplace.getStats();
      const allStrategies = await this.marketplace.listStrategies();

      const categoryCounts: Record<MarketplaceStrategyCategory, number> = {
        momentum: 0,
        mean_reversion: 0,
        arbitrage: 0,
        grid_trading: 0,
        yield_farming: 0,
        trend_following: 0,
        experimental: 0,
      };

      let totalRoi = 0;
      let totalAUM = 0;

      for (const strategy of allStrategies) {
        categoryCounts[strategy.category]++;
        totalRoi += strategy.roi30d;
        totalAUM += strategy.activeUsers * strategy.minCapital; // Estimate
      }

      const stats: MarketplaceStats = {
        totalStrategies: baseStats.totalStrategies,
        totalActiveUsers: baseStats.totalUsers,
        totalAUM,
        topRoi: baseStats.topRoi,
        averageRoi: allStrategies.length > 0 ? totalRoi / allStrategies.length : 0,
        categoryCounts,
      };

      return this.ok(stats);
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<MarketplaceStats>;
    }
  }

  private async handleGetTopStrategies(
    query?: Record<string, string>
  ): Promise<MarketplaceApiResponse<TopStrategiesResponse>> {
    try {
      const limit = query?.limit ? parseInt(query.limit, 10) : 5;

      const [byRoi, bySharpe, byPopularity, newest] = await Promise.all([
        this.marketplace.getTopStrategies('roi', limit),
        this.marketplace.getTopStrategies('sharpe', limit),
        this.marketplace.getTopStrategies('popularity', limit),
        this.marketplace.listStrategies({ sortBy: 'newest', sortOrder: 'desc', limit }),
      ]);

      return this.ok({ byRoi, bySharpe, byPopularity, newest });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<TopStrategiesResponse>;
    }
  }

  private async handleGetUserAgents(
    userId?: string
  ): Promise<MarketplaceApiResponse<{ agents: MarketplaceDeployedAgent[] }>> {
    try {
      if (!userId) {
        throw new MarketplaceError('Authentication required', 'UNAUTHORIZED');
      }

      const agents = await this.marketplace.getUserAgents(userId);
      return this.ok({ agents });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<{ agents: MarketplaceDeployedAgent[] }>;
    }
  }

  private async handleStopAgent(
    agentId: string
  ): Promise<MarketplaceApiResponse<{ stopped: boolean }>> {
    try {
      await this.marketplace.stopAgent(agentId);
      return this.ok({ stopped: true });
    } catch (err) {
      return this.handleError(err) as MarketplaceApiResponse<{ stopped: boolean }>;
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private generatePerformanceData(strategy: MarketplaceStrategyListing): StrategyPerformanceData {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Generate equity curve (30 days)
    const equityCurve: Array<{ timestamp: Date; value: number }> = [];
    const drawdownCurve: Array<{ timestamp: Date; value: number }> = [];
    let baseValue = 10000;
    let peakValue = baseValue;
    const dailyReturn = strategy.roi30d / 30 / 100;

    for (let i = 30; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * msPerDay);
      const randomness = (Math.random() - 0.5) * 0.02;
      baseValue = baseValue * (1 + dailyReturn + randomness);
      peakValue = Math.max(peakValue, baseValue);
      const drawdown = ((baseValue - peakValue) / peakValue) * 100;

      equityCurve.push({ timestamp, value: Math.round(baseValue * 100) / 100 });
      drawdownCurve.push({ timestamp, value: Math.round(drawdown * 100) / 100 });
    }

    // Trade distribution
    const totalWinLoss = strategy.totalTrades;
    const wins = Math.round(totalWinLoss * (strategy.winRate / 100));
    const losses = totalWinLoss - wins;
    const breakeven = Math.round(losses * 0.1);

    // Monthly returns (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = now.getMonth();
    const monthlyReturns = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthReturn = (Math.random() - 0.3) * strategy.roi30d / 3;
      monthlyReturns.push({
        month: months[monthIndex % 6],
        return: Math.round(monthReturn * 10) / 10,
      });
    }

    // Performance snapshots
    const snapshots: StrategyPerformanceSnapshot[] = [];
    for (let i = 6; i >= 0; i--) {
      snapshots.push({
        timestamp: new Date(now.getTime() - i * 7 * msPerDay),
        roi: strategy.roi30d * (1 - i * 0.1),
        totalTrades: Math.round(strategy.totalTrades * (1 - i * 0.1)),
        winRate: strategy.winRate + (Math.random() - 0.5) * 5,
        drawdown: strategy.maxDrawdown * (0.5 + Math.random() * 0.5),
      });
    }

    return {
      equityCurve,
      drawdownCurve,
      tradeDistribution: { wins, losses: losses - breakeven, breakeven },
      monthlyReturns,
      snapshots,
    };
  }

  // --------------------------------------------------------------------------
  // Response Helpers
  // --------------------------------------------------------------------------

  private ok<T>(data: T): MarketplaceApiResponse<T> {
    return {
      statusCode: 200,
      body: { success: true, data },
    };
  }

  private notFound(): MarketplaceApiResponse {
    return {
      statusCode: 404,
      body: { success: false, error: 'Route not found', code: 'STRATEGY_NOT_FOUND' },
    };
  }

  private handleError(err: unknown): MarketplaceApiResponse {
    if (err instanceof MarketplaceError) {
      const statusCode = this.errorCodeToStatus(err.code);
      return {
        statusCode,
        body: { success: false, error: err.message, code: err.code },
      };
    }
    if (err instanceof Error && err.message.includes('not found')) {
      return {
        statusCode: 404,
        body: { success: false, error: err.message, code: 'STRATEGY_NOT_FOUND' },
      };
    }
    if (err instanceof Error && err.message.includes('Minimum capital')) {
      return {
        statusCode: 400,
        body: { success: false, error: err.message, code: 'INSUFFICIENT_CAPITAL' },
      };
    }
    return {
      statusCode: 500,
      body: { success: false, error: 'Internal server error', code: 'OPERATION_FAILED' },
    };
  }

  private errorCodeToStatus(code: MarketplaceErrorCode): number {
    switch (code) {
      case 'STRATEGY_NOT_FOUND':
      case 'AGENT_NOT_FOUND':
        return 404;
      case 'INVALID_STRATEGY_ID':
      case 'INVALID_FILTER':
      case 'INSUFFICIENT_CAPITAL':
      case 'VALIDATION_ERROR':
        return 400;
      case 'UNAUTHORIZED':
        return 401;
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
   * Match a path with named segments (e.g. '/api/marketplace/strategies/:id').
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
 * Create a MarketplaceApi instance.
 */
export function createMarketplaceApi(marketplace?: DefaultStrategyMarketplace): MarketplaceApi {
  return new MarketplaceApi(marketplace);
}

/**
 * Create a MarketplaceApi with demo data (uses built-in strategies).
 */
export function createDemoMarketplaceApi(): MarketplaceApi {
  return new MarketplaceApi();
}
