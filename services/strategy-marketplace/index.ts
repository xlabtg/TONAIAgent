/**
 * TONAIAgent — Strategy Marketplace Service (Issue #273)
 *
 * High-level marketplace service combining:
 * - Strategy registry (publishing, discovery, subscriptions)
 * - Revenue integration (fee collection from monetised strategies)
 * - API request handler for REST endpoints
 *
 * REST endpoints provided:
 *   GET  /api/strategies                    — list / search strategies
 *   GET  /api/strategies/:id                — strategy details + performance
 *   POST /api/strategies/publish            — publish a new strategy (auth required)
 *   POST /api/strategies/:id/subscribe      — subscribe (auth required)
 *   POST /api/strategies/:id/unsubscribe    — unsubscribe (auth required)
 *   GET  /api/strategies/:id/performance    — performance metrics
 *   GET  /api/strategies/:id/subscribers    — subscriber list (owner / admin)
 */

import {
  DefaultStrategyRegistry,
  createStrategyRegistry,
  calculateRankingScore,
} from '../../core/strategies/registry';

export type {
  StrategyDefinition,
  StrategyType,
  RevenueModel,
  StrategyPerformanceMetrics,
  StrategySubscription,
  PublishStrategyInput,
  UpdateStrategyInput,
  StrategyFilter,
  StrategySortBy,
  StrategyListResult,
  StrategyRegistryService,
} from '../../core/strategies/registry';

export {
  DefaultStrategyRegistry,
  createStrategyRegistry,
  calculateRankingScore,
} from '../../core/strategies/registry';

// ============================================================================
// Request / Response types for the Marketplace API
// ============================================================================

export interface MarketplaceApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /** Caller user ID (from auth middleware) */
  callerId?: string;
  /** Whether the caller has admin role */
  isAdmin?: boolean;
}

export interface MarketplaceApiResponse {
  statusCode: number;
  body: MarketplaceApiResponseBody;
}

export interface MarketplaceApiResponseBody {
  success: boolean;
  data?: unknown;
  error?: string;
  errorCode?: string;
}

export type MarketplaceErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'ALREADY_SUBSCRIBED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

export class MarketplaceServiceError extends Error {
  constructor(
    public readonly code: MarketplaceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'MarketplaceServiceError';
  }
}

// ============================================================================
// Marketplace Service
// ============================================================================

/**
 * Full Strategy Marketplace service: registry + API handler.
 */
export class StrategyMarketplaceService {
  readonly registry: DefaultStrategyRegistry;

  constructor(adminIds: string[] = []) {
    this.registry = createStrategyRegistry(adminIds);
  }

  // --------------------------------------------------------------------------
  // REST API handler
  // --------------------------------------------------------------------------

  async handle(req: MarketplaceApiRequest): Promise<MarketplaceApiResponse> {
    try {
      const path = req.path.replace(/\/$/, '');
      const segments = path.split('/').filter(Boolean);
      // Expected shapes:
      //   ['api', 'strategies']
      //   ['api', 'strategies', ':id']
      //   ['api', 'strategies', 'publish']
      //   ['api', 'strategies', ':id', 'subscribe']
      //   ['api', 'strategies', ':id', 'unsubscribe']
      //   ['api', 'strategies', ':id', 'performance']
      //   ['api', 'strategies', ':id', 'subscribers']

      if (segments[0] !== 'api' || segments[1] !== 'strategies') {
        return this._error(404, 'NOT_FOUND' as MarketplaceErrorCode, 'Route not found');
      }

      const third = segments[2]; // id or 'publish' or undefined
      const fourth = segments[3]; // 'subscribe' | 'unsubscribe' | 'performance' | 'subscribers'

      // GET /api/strategies
      if (!third && req.method === 'GET') {
        return await this._handleList(req);
      }

      // POST /api/strategies/publish
      if (third === 'publish' && req.method === 'POST') {
        return await this._handlePublish(req);
      }

      // Routes that require a strategy ID
      if (third && !fourth) {
        if (req.method === 'GET') return await this._handleGetStrategy(req, third);
        if (req.method === 'PUT' || req.method === 'PATCH') return await this._handleUpdateStrategy(req, third);
        if (req.method === 'DELETE') return await this._handleUnpublish(req, third);
      }

      if (third && fourth) {
        if (fourth === 'subscribe' && req.method === 'POST') return await this._handleSubscribe(req, third);
        if (fourth === 'unsubscribe' && req.method === 'POST') return await this._handleUnsubscribe(req, third);
        if (fourth === 'performance' && req.method === 'GET') return await this._handlePerformance(third);
        if (fourth === 'subscribers' && req.method === 'GET') return await this._handleSubscribers(req, third);
      }

      return this._error(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    } catch (err) {
      if (err instanceof MarketplaceServiceError) {
        const code = err.code;
        const status = code === 'FORBIDDEN' ? 403 : code === 'STRATEGY_NOT_FOUND' ? 404 : 400;
        return this._error(status, code, err.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      return this._error(500, 'INTERNAL_ERROR', message);
    }
  }

  // --------------------------------------------------------------------------
  // List strategies  GET /api/strategies
  // --------------------------------------------------------------------------

  private async _handleList(req: MarketplaceApiRequest): Promise<MarketplaceApiResponse> {
    const q = req.query ?? {};
    const result = await this.registry.listStrategies({
      type: q['type'] as never,
      revenueModel: q['revenueModel'] as never,
      maxRiskLevel: q['maxRiskLevel'] ? Number(q['maxRiskLevel']) : undefined,
      verifiedOnly: q['verifiedOnly'] === 'true',
      search: q['search'],
      minScore: q['minScore'] ? Number(q['minScore']) : undefined,
      sortBy: (q['sortBy'] as never) ?? 'score',
      sortOrder: (q['sortOrder'] as 'asc' | 'desc') ?? 'desc',
      offset: q['offset'] ? Number(q['offset']) : 0,
      limit: q['limit'] ? Math.min(Number(q['limit']), 100) : 20,
    });

    return this._ok({
      strategies: result.strategies,
      performance: Object.fromEntries(result.performance),
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  }

  // --------------------------------------------------------------------------
  // Get strategy  GET /api/strategies/:id
  // --------------------------------------------------------------------------

  private async _handleGetStrategy(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    const strategy = await this.registry.getStrategy(strategyId);
    if (!strategy) {
      throw new MarketplaceServiceError('STRATEGY_NOT_FOUND', `Strategy not found: ${strategyId}`);
    }

    const performance = await this.registry.getStrategyPerformance(strategyId);

    let isSubscribed = false;
    if (req.callerId) {
      isSubscribed = await this.registry.isSubscribed(req.callerId, strategyId);
    }

    let canExecute = false;
    if (req.callerId) {
      canExecute = await this.registry.canExecuteStrategy(req.callerId, strategyId);
    }

    return this._ok({ strategy, performance, isSubscribed, canExecute });
  }

  // --------------------------------------------------------------------------
  // Publish strategy  POST /api/strategies/publish
  // --------------------------------------------------------------------------

  private async _handlePublish(req: MarketplaceApiRequest): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required to publish a strategy');
    }

    const body = req.body as Record<string, unknown> ?? {};
    const strategy = await this.registry.publishStrategy({
      name: body['name'] as string,
      description: (body['description'] as string) ?? '',
      creatorId: req.callerId,
      creatorName: (body['creatorName'] as string) ?? '',
      type: body['type'] as never,
      riskLevel: Number(body['riskLevel'] ?? 5),
      isPublic: body['isPublic'] !== false,
      revenueModel: (body['revenueModel'] as never) ?? 'free',
      subscriptionFeeUsd: Number(body['subscriptionFeeUsd'] ?? 0),
      performanceFeePercent: Number(body['performanceFeePercent'] ?? 0),
      tags: (body['tags'] as string[]) ?? [],
      minCapitalTON: Number(body['minCapitalTON'] ?? 10),
      supportedPairs: (body['supportedPairs'] as string[]) ?? ['TON/USDT'],
    });

    return { statusCode: 201, body: { success: true, data: { strategy } } };
  }

  // --------------------------------------------------------------------------
  // Update strategy  PUT/PATCH /api/strategies/:id
  // --------------------------------------------------------------------------

  private async _handleUpdateStrategy(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required');
    }

    const body = (req.body as Record<string, unknown>) ?? {};
    const strategy = await this.registry.updateStrategy(strategyId, req.callerId, {
      name: body['name'] as string,
      description: body['description'] as string,
      isPublic: body['isPublic'] as boolean,
      riskLevel: body['riskLevel'] !== undefined ? Number(body['riskLevel']) : undefined,
      revenueModel: body['revenueModel'] as never,
      subscriptionFeeUsd: body['subscriptionFeeUsd'] !== undefined ? Number(body['subscriptionFeeUsd']) : undefined,
      performanceFeePercent: body['performanceFeePercent'] !== undefined ? Number(body['performanceFeePercent']) : undefined,
      tags: body['tags'] as string[],
      minCapitalTON: body['minCapitalTON'] !== undefined ? Number(body['minCapitalTON']) : undefined,
      supportedPairs: body['supportedPairs'] as string[],
    });

    return this._ok({ strategy });
  }

  // --------------------------------------------------------------------------
  // Unpublish  DELETE /api/strategies/:id
  // --------------------------------------------------------------------------

  private async _handleUnpublish(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required');
    }

    await this.registry.unpublishStrategy(strategyId, req.callerId);
    return this._ok({ message: 'Strategy unpublished' });
  }

  // --------------------------------------------------------------------------
  // Subscribe  POST /api/strategies/:id/subscribe
  // --------------------------------------------------------------------------

  private async _handleSubscribe(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required to subscribe');
    }

    const body = (req.body as Record<string, unknown>) ?? {};
    const allocation = Number(body['allocation'] ?? 10);

    const subscription = await this.registry.subscribeToStrategy(
      req.callerId,
      strategyId,
      allocation
    );

    return { statusCode: 201, body: { success: true, data: { subscription } } };
  }

  // --------------------------------------------------------------------------
  // Unsubscribe  POST /api/strategies/:id/unsubscribe
  // --------------------------------------------------------------------------

  private async _handleUnsubscribe(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required');
    }

    await this.registry.unsubscribeFromStrategy(req.callerId, strategyId);
    return this._ok({ message: 'Unsubscribed successfully' });
  }

  // --------------------------------------------------------------------------
  // Performance  GET /api/strategies/:id/performance
  // --------------------------------------------------------------------------

  private async _handlePerformance(strategyId: string): Promise<MarketplaceApiResponse> {
    const strategy = await this.registry.getStrategy(strategyId);
    if (!strategy) {
      throw new MarketplaceServiceError('STRATEGY_NOT_FOUND', `Strategy not found: ${strategyId}`);
    }

    const performance = await this.registry.getStrategyPerformance(strategyId);
    return this._ok({ performance });
  }

  // --------------------------------------------------------------------------
  // Subscribers  GET /api/strategies/:id/subscribers
  // --------------------------------------------------------------------------

  private async _handleSubscribers(
    req: MarketplaceApiRequest,
    strategyId: string
  ): Promise<MarketplaceApiResponse> {
    if (!req.callerId) {
      throw new MarketplaceServiceError('FORBIDDEN', 'Authentication required');
    }

    try {
      const subscribers = await this.registry.getStrategySubscribers(strategyId, req.callerId);
      return this._ok({ subscribers, total: subscribers.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // RBAC errors from registry are access-denied
      if (msg.toLowerCase().includes('owner') || msg.toLowerCase().includes('admin')) {
        throw new MarketplaceServiceError('FORBIDDEN', msg);
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Response helpers
  // --------------------------------------------------------------------------

  private _ok(data: unknown): MarketplaceApiResponse {
    return { statusCode: 200, body: { success: true, data } };
  }

  private _error(
    statusCode: number,
    errorCode: MarketplaceErrorCode | string,
    message: string
  ): MarketplaceApiResponse {
    return {
      statusCode,
      body: { success: false, error: message, errorCode },
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/** Create a marketplace service instance */
export function createStrategyMarketplaceService(adminIds?: string[]): StrategyMarketplaceService {
  return new StrategyMarketplaceService(adminIds);
}

/** Create a marketplace service pre-populated with demo strategies */
export function createDemoStrategyMarketplaceService(): StrategyMarketplaceService {
  const adminId = 'admin_demo';
  const svc = new StrategyMarketplaceService([adminId]);

  // Seed demo strategies (non-blocking; errors are swallowed for demo convenience)
  void _seedDemoStrategies(svc, adminId);

  return svc;
}

async function _seedDemoStrategies(
  svc: StrategyMarketplaceService,
  adminId: string
): Promise<void> {
  const reg = svc.registry;

  const seeds = [
    {
      input: {
        name: 'Momentum Trend',
        description: 'Follows strong price momentum on TON/USDT',
        creatorId: 'creator_001',
        creatorName: 'Alice Trader',
        type: 'trend' as const,
        riskLevel: 5,
        revenueModel: 'free' as const,
        tags: ['momentum', 'trend'],
        supportedPairs: ['TON/USDT'],
        minCapitalTON: 20,
      },
      perf: { winRate: 0.68, avgPnLNormalized: 0.55, maxDrawdown: 0.12, avgPnL: 4.2, roi30d: 8.2, totalTrades: 340 },
    },
    {
      input: {
        name: 'DEX Arbitrage Pro',
        description: 'Exploits price differences across TON DEXes',
        creatorId: 'creator_002',
        creatorName: 'Bob Arb',
        type: 'arbitrage' as const,
        riskLevel: 7,
        revenueModel: 'performance_fee' as const,
        performanceFeePercent: 20,
        tags: ['arbitrage', 'dex'],
        supportedPairs: ['TON/USDT', 'USDC/USDT'],
        minCapitalTON: 50,
      },
      perf: { winRate: 0.61, avgPnLNormalized: 0.72, maxDrawdown: 0.22, avgPnL: 8.5, roi30d: 12.7, totalTrades: 1240 },
    },
    {
      input: {
        name: 'AI Signal Strategy',
        description: 'Generates signals using on-chain AI model',
        creatorId: 'creator_003',
        creatorName: 'Carol AI',
        type: 'ai-signal' as const,
        riskLevel: 6,
        revenueModel: 'subscription' as const,
        subscriptionFeeUsd: 29,
        tags: ['ai', 'signals'],
        supportedPairs: ['TON/USDT'],
        minCapitalTON: 30,
      },
      perf: { winRate: 0.72, avgPnLNormalized: 0.60, maxDrawdown: 0.15, avgPnL: 5.1, roi30d: 9.5, totalTrades: 520 },
    },
    {
      input: {
        name: 'Grid Bot Basic',
        description: 'Simple grid trading for ranging markets',
        creatorId: 'creator_004',
        creatorName: 'Dave Grid',
        type: 'custom' as const,
        riskLevel: 3,
        revenueModel: 'free' as const,
        tags: ['grid', 'low-risk'],
        supportedPairs: ['TON/USDT'],
        minCapitalTON: 10,
      },
      perf: { winRate: 0.65, avgPnLNormalized: 0.40, maxDrawdown: 0.08, avgPnL: 2.8, roi30d: 6.8, totalTrades: 890 },
    },
  ];

  for (const seed of seeds) {
    const strategy = await reg.publishStrategy(seed.input);
    await reg.updatePerformance(strategy.id, {
      ...seed.perf,
      sharpeRatio: seed.perf.winRate * 2.5,
      totalRevenueUsd: seed.perf.totalTrades * 0.5,
    });
    // Verify first two
    if (['creator_001', 'creator_002'].includes(seed.input.creatorId)) {
      await reg.verifyStrategy(strategy.id, adminId);
    }
  }
}

export default StrategyMarketplaceService;
