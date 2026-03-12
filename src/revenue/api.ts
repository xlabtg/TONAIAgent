/**
 * TONAIAgent - Revenue Sharing API
 *
 * REST API endpoints for the Strategy Revenue Sharing System.
 *
 * Endpoints:
 * - GET /strategies/{strategy_id}/revenue - Get strategy revenue metrics
 * - GET /developers/{developer_id}/earnings - Get developer earnings
 * - GET /strategies/{strategy_id}/monetization - Get monetization config
 * - POST /strategies/{strategy_id}/monetization - Configure monetization
 * - PUT /strategies/{strategy_id}/monetization - Update monetization
 * - DELETE /strategies/{strategy_id}/monetization - Disable monetization
 * - POST /strategies/{strategy_id}/agents/{agent_id}/fee - Process fee
 * - GET /revenue/platform - Get platform-wide revenue metrics
 *
 * Implements Issue #219: Strategy Revenue Sharing System
 */

import {
  FeeType,
  RevenueEventCallback,
  GetStrategyRevenueResponse,
  GetDeveloperEarningsResponse,
  ConfigureMonetizationRequest,
  StrategyMonetization,
  StrategyRevenueMetrics,
  DeveloperEarnings,
  StrategyEarnings,
  PlatformRevenueMetrics,
  RevenueEvent,
} from './types';

import {
  RevenueDistributionService,
  DefaultRevenueDistributionService,
  createRevenueDistributionService,
  MonetizationOptions,
} from './distribution';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * API request structure.
 */
export interface RevenueApiRequest {
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
export interface RevenueApiResponse {
  /** HTTP status code */
  status: number;
  /** Response body */
  body: RevenueApiResponseBody;
}

/**
 * API response body types.
 */
export type RevenueApiResponseBody =
  | GetStrategyRevenueResponse
  | GetDeveloperEarningsResponse
  | StrategyMonetization
  | StrategyRevenueMetrics
  | DeveloperEarnings
  | StrategyEarnings
  | StrategyEarnings[]
  | PlatformRevenueMetrics
  | RevenueEvent
  | RevenueEvent[]
  | { error: string; code: string }
  | { success: boolean; message: string };

// ============================================================================
// API Error Types
// ============================================================================

/** API error codes */
export type RevenueApiErrorCode =
  | 'STRATEGY_NOT_FOUND'
  | 'DEVELOPER_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INVALID_FEE_TYPE'
  | 'MONETIZATION_NOT_CONFIGURED'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

/**
 * API error class.
 */
export class RevenueApiError extends Error {
  constructor(
    public readonly code: RevenueApiErrorCode,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'RevenueApiError';
  }
}

// ============================================================================
// Revenue API Implementation
// ============================================================================

/**
 * Strategy Revenue Sharing API handler.
 */
export class RevenueApi {
  private readonly revenueService: DefaultRevenueDistributionService;

  constructor(revenueService?: DefaultRevenueDistributionService) {
    this.revenueService = revenueService ?? createRevenueDistributionService();
  }

  /**
   * Handle an API request.
   */
  async handle(request: RevenueApiRequest): Promise<RevenueApiResponse> {
    try {
      const { method, path } = request;

      // GET /strategies/{strategy_id}/revenue
      const revenueMatch = path.match(/^\/api\/strategies\/([^/]+)\/revenue$/);
      if (method === 'GET' && revenueMatch) {
        return this.handleGetStrategyRevenue(revenueMatch[1]);
      }

      // GET /developers/{developer_id}/earnings
      const earningsMatch = path.match(/^\/api\/developers\/([^/]+)\/earnings$/);
      if (method === 'GET' && earningsMatch) {
        return this.handleGetDeveloperEarnings(earningsMatch[1]);
      }

      // GET /developers/{developer_id}/strategies
      const devStrategiesMatch = path.match(/^\/api\/developers\/([^/]+)\/strategies$/);
      if (method === 'GET' && devStrategiesMatch) {
        return this.handleGetDeveloperStrategies(devStrategiesMatch[1]);
      }

      // GET /strategies/{strategy_id}/monetization
      const getMonetizationMatch = path.match(/^\/api\/strategies\/([^/]+)\/monetization$/);
      if (method === 'GET' && getMonetizationMatch) {
        return this.handleGetMonetization(getMonetizationMatch[1]);
      }

      // POST /strategies/{strategy_id}/monetization
      const postMonetizationMatch = path.match(/^\/api\/strategies\/([^/]+)\/monetization$/);
      if (method === 'POST' && postMonetizationMatch) {
        return this.handleConfigureMonetization(postMonetizationMatch[1], request.body as ConfigureMonetizationBody);
      }

      // PUT /strategies/{strategy_id}/monetization
      const putMonetizationMatch = path.match(/^\/api\/strategies\/([^/]+)\/monetization$/);
      if (method === 'PUT' && putMonetizationMatch) {
        return this.handleUpdateMonetization(putMonetizationMatch[1], request.body as Partial<MonetizationOptions>);
      }

      // DELETE /strategies/{strategy_id}/monetization
      const deleteMonetizationMatch = path.match(/^\/api\/strategies\/([^/]+)\/monetization$/);
      if (method === 'DELETE' && deleteMonetizationMatch) {
        return this.handleDisableMonetization(deleteMonetizationMatch[1]);
      }

      // POST /strategies/{strategy_id}/agents/{agent_id}/fee
      const processFeeMatch = path.match(/^\/api\/strategies\/([^/]+)\/agents\/([^/]+)\/fee$/);
      if (method === 'POST' && processFeeMatch) {
        return this.handleProcessFee(processFeeMatch[1], processFeeMatch[2], request.body as ProcessFeeBody);
      }

      // GET /strategies/{strategy_id}/events
      const eventsMatch = path.match(/^\/api\/strategies\/([^/]+)\/events$/);
      if (method === 'GET' && eventsMatch) {
        const limit = request.query?.limit ? parseInt(request.query.limit, 10) : 100;
        return this.handleGetStrategyEvents(eventsMatch[1], limit);
      }

      // GET /revenue/platform
      if (method === 'GET' && path === '/api/revenue/platform') {
        return this.handleGetPlatformMetrics();
      }

      // GET /revenue/events
      if (method === 'GET' && path === '/api/revenue/events') {
        const limit = request.query?.limit ? parseInt(request.query.limit, 10) : 100;
        return this.handleGetRecentEvents(limit);
      }

      // POST /strategies/{strategy_id}/agents/{agent_id}/referrer
      const referrerMatch = path.match(/^\/api\/strategies\/([^/]+)\/agents\/([^/]+)\/referrer$/);
      if (method === 'POST' && referrerMatch) {
        return this.handleSetReferrer(referrerMatch[1], referrerMatch[2], request.body as SetReferrerBody);
      }

      // Unknown route
      return {
        status: 404,
        body: { error: 'Not found', code: 'NOT_FOUND' },
      };
    } catch (error) {
      if (error instanceof RevenueApiError) {
        return {
          status: error.statusCode,
          body: { error: error.message, code: error.code },
        };
      }
      if (error instanceof Error) {
        return {
          status: 400,
          body: { error: error.message, code: 'INVALID_REQUEST' },
        };
      }
      return {
        status: 500,
        body: { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      };
    }
  }

  // ============================================================================
  // Strategy Revenue
  // ============================================================================

  /**
   * GET /strategies/{strategy_id}/revenue
   */
  private handleGetStrategyRevenue(strategyId: string): RevenueApiResponse {
    const metrics = this.revenueService.getStrategyRevenueMetrics(strategyId);

    if (!metrics) {
      // Strategy might exist but have no monetization configured
      const response: GetStrategyRevenueResponse = {
        monthly_revenue: 0,
        total_revenue: 0,
        active_agents: 0,
      };
      return { status: 200, body: response };
    }

    const response: GetStrategyRevenueResponse = {
      monthly_revenue: metrics.monthly_revenue,
      total_revenue: metrics.total_revenue,
      active_agents: metrics.active_agents,
    };

    return { status: 200, body: response };
  }

  // ============================================================================
  // Developer Earnings
  // ============================================================================

  /**
   * GET /developers/{developer_id}/earnings
   */
  private handleGetDeveloperEarnings(developerId: string): RevenueApiResponse {
    const earnings = this.revenueService.getDeveloperEarnings(developerId);

    const response: GetDeveloperEarningsResponse = {
      total_earnings: earnings.total_earnings,
      monthly_earnings: earnings.monthly_earnings,
    };

    return { status: 200, body: response };
  }

  /**
   * GET /developers/{developer_id}/strategies
   */
  private handleGetDeveloperStrategies(developerId: string): RevenueApiResponse {
    const strategies = this.revenueService.getDeveloperStrategies(developerId);
    return { status: 200, body: strategies };
  }

  // ============================================================================
  // Monetization Configuration
  // ============================================================================

  /**
   * GET /strategies/{strategy_id}/monetization
   */
  private handleGetMonetization(strategyId: string): RevenueApiResponse {
    const monetization = this.revenueService.getStrategyMonetization(strategyId);

    if (!monetization) {
      throw new RevenueApiError(
        'MONETIZATION_NOT_CONFIGURED',
        `Monetization not configured for strategy: ${strategyId}`,
        404
      );
    }

    return { status: 200, body: monetization };
  }

  /**
   * POST /strategies/{strategy_id}/monetization
   */
  private handleConfigureMonetization(
    strategyId: string,
    body: ConfigureMonetizationBody
  ): RevenueApiResponse {
    if (!body || !body.developer_id || !body.fee_type) {
      throw new RevenueApiError(
        'INVALID_REQUEST',
        'Missing required fields: developer_id, fee_type'
      );
    }

    if (!this.isValidFeeType(body.fee_type)) {
      throw new RevenueApiError(
        'INVALID_FEE_TYPE',
        `Invalid fee type: ${body.fee_type}. Valid types: performance, subscription, hybrid`
      );
    }

    const options: MonetizationOptions = {
      feePercent: body.fee_percent,
      monthlyFee: body.monthly_fee,
      splitConfig: body.split_config,
    };

    const monetization = this.revenueService.configureStrategyMonetization(
      strategyId,
      body.developer_id,
      body.fee_type,
      options
    );

    return { status: 201, body: monetization };
  }

  /**
   * PUT /strategies/{strategy_id}/monetization
   */
  private handleUpdateMonetization(
    strategyId: string,
    body: Partial<MonetizationOptions>
  ): RevenueApiResponse {
    if (!body) {
      throw new RevenueApiError('INVALID_REQUEST', 'Missing request body');
    }

    const monetization = this.revenueService.updateMonetization(strategyId, body);

    if (!monetization) {
      throw new RevenueApiError(
        'MONETIZATION_NOT_CONFIGURED',
        `Monetization not configured for strategy: ${strategyId}`,
        404
      );
    }

    return { status: 200, body: monetization };
  }

  /**
   * DELETE /strategies/{strategy_id}/monetization
   */
  private handleDisableMonetization(strategyId: string): RevenueApiResponse {
    const success = this.revenueService.disableMonetization(strategyId);

    if (!success) {
      throw new RevenueApiError(
        'MONETIZATION_NOT_CONFIGURED',
        `Monetization not configured for strategy: ${strategyId}`,
        404
      );
    }

    return { status: 200, body: { success: true, message: 'Monetization disabled' } };
  }

  // ============================================================================
  // Fee Processing
  // ============================================================================

  /**
   * POST /strategies/{strategy_id}/agents/{agent_id}/fee
   */
  private handleProcessFee(
    strategyId: string,
    agentId: string,
    body: ProcessFeeBody
  ): RevenueApiResponse {
    if (!body) {
      throw new RevenueApiError('INVALID_REQUEST', 'Missing request body');
    }

    const monetization = this.revenueService.getStrategyMonetization(strategyId);
    if (!monetization) {
      throw new RevenueApiError(
        'MONETIZATION_NOT_CONFIGURED',
        `Monetization not configured for strategy: ${strategyId}`,
        404
      );
    }

    let events: RevenueEvent[] = [];

    switch (monetization.fee_type) {
      case 'performance':
        if (body.initial_capital === undefined || body.portfolio_value === undefined) {
          throw new RevenueApiError(
            'INVALID_REQUEST',
            'Performance fee requires initial_capital and portfolio_value'
          );
        }
        const perfEvent = this.revenueService.processPerformanceFee(
          strategyId,
          agentId,
          body.initial_capital,
          body.portfolio_value,
          body.high_water_mark
        );
        if (perfEvent) {
          events.push(perfEvent);
        }
        break;

      case 'subscription':
        const subEvent = this.revenueService.processSubscriptionFee(
          strategyId,
          agentId,
          body.billing_period_days
        );
        if (subEvent) {
          events.push(subEvent);
        }
        break;

      case 'hybrid':
        if (body.initial_capital === undefined || body.portfolio_value === undefined) {
          throw new RevenueApiError(
            'INVALID_REQUEST',
            'Hybrid fee requires initial_capital and portfolio_value'
          );
        }
        events = this.revenueService.processHybridFee(
          strategyId,
          agentId,
          body.initial_capital,
          body.portfolio_value,
          body.billing_period_days,
          body.high_water_mark
        );
        break;
    }

    if (events.length === 0) {
      return {
        status: 200,
        body: { success: true, message: 'No fee generated (no profit or below threshold)' },
      };
    }

    if (events.length === 1) {
      return { status: 201, body: events[0] };
    }

    return { status: 201, body: events };
  }

  // ============================================================================
  // Events
  // ============================================================================

  /**
   * GET /strategies/{strategy_id}/events
   */
  private handleGetStrategyEvents(strategyId: string, limit: number): RevenueApiResponse {
    const events = this.revenueService.getRevenueEvents(strategyId, limit);
    return { status: 200, body: events };
  }

  /**
   * GET /revenue/events
   */
  private handleGetRecentEvents(limit: number): RevenueApiResponse {
    const events = this.revenueService.getRecentEvents(limit);
    return { status: 200, body: events };
  }

  // ============================================================================
  // Platform Metrics
  // ============================================================================

  /**
   * GET /revenue/platform
   */
  private handleGetPlatformMetrics(): RevenueApiResponse {
    const metrics = this.revenueService.getPlatformMetrics();
    return { status: 200, body: metrics };
  }

  // ============================================================================
  // Referrer
  // ============================================================================

  /**
   * POST /strategies/{strategy_id}/agents/{agent_id}/referrer
   */
  private handleSetReferrer(
    strategyId: string,
    agentId: string,
    body: SetReferrerBody
  ): RevenueApiResponse {
    if (!body || !body.referrer_id) {
      throw new RevenueApiError('INVALID_REQUEST', 'Missing required field: referrer_id');
    }

    this.revenueService.setReferrer(strategyId, agentId, body.referrer_id);

    return { status: 200, body: { success: true, message: 'Referrer set' } };
  }

  // ============================================================================
  // Service Access
  // ============================================================================

  /**
   * Get the underlying revenue distribution service.
   */
  getRevenueService(): RevenueDistributionService {
    return this.revenueService;
  }

  /**
   * Subscribe to events.
   */
  onEvent(callback: RevenueEventCallback): void {
    this.revenueService.onEvent(callback);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private isValidFeeType(feeType: string): feeType is FeeType {
    return ['performance', 'subscription', 'hybrid'].includes(feeType);
  }
}

// ============================================================================
// Request Body Types
// ============================================================================

interface ConfigureMonetizationBody extends ConfigureMonetizationRequest {
  developer_id: string;
}

interface ProcessFeeBody {
  initial_capital?: number;
  portfolio_value?: number;
  high_water_mark?: number;
  billing_period_days?: number;
}

interface SetReferrerBody {
  referrer_id: string;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new Revenue API instance.
 */
export function createRevenueApi(
  revenueService?: DefaultRevenueDistributionService
): RevenueApi {
  return new RevenueApi(revenueService);
}

/**
 * Creates a demo Revenue API with sample data.
 */
export function createDemoRevenueApi(): RevenueApi {
  const api = new RevenueApi();
  const service = api.getRevenueService() as DefaultRevenueDistributionService;

  // Configure demo strategies
  const demoStrategies = [
    { id: 'momentum_v1', dev: 'alice_dev', feeType: 'performance' as FeeType, feePercent: 20 },
    { id: 'arbitrage_v1', dev: 'bob_trader', feeType: 'subscription' as FeeType, monthlyFee: 15 },
    { id: 'defi_swing', dev: 'charlie_quant', feeType: 'hybrid' as FeeType, feePercent: 10, monthlyFee: 5 },
    { id: 'grid_trading', dev: 'diana_algo', feeType: 'performance' as FeeType, feePercent: 15 },
    { id: 'yield_optimizer', dev: 'eve_defi', feeType: 'subscription' as FeeType, monthlyFee: 10 },
  ];

  for (const strategy of demoStrategies) {
    service.configureStrategyMonetization(
      strategy.id,
      strategy.dev,
      strategy.feeType,
      { feePercent: strategy.feePercent, monthlyFee: strategy.monthlyFee }
    );
  }

  // Simulate some revenue events
  const agentProfits = [
    { strategy: 'momentum_v1', agent: 'agent_001', initial: 10000, value: 10800 },
    { strategy: 'momentum_v1', agent: 'agent_002', initial: 5000, value: 5400 },
    { strategy: 'momentum_v1', agent: 'agent_003', initial: 20000, value: 21500 },
    { strategy: 'arbitrage_v1', agent: 'agent_004' },
    { strategy: 'arbitrage_v1', agent: 'agent_005' },
    { strategy: 'defi_swing', agent: 'agent_006', initial: 15000, value: 15750 },
    { strategy: 'grid_trading', agent: 'agent_007', initial: 8000, value: 8640 },
    { strategy: 'yield_optimizer', agent: 'agent_008' },
  ];

  for (const ap of agentProfits) {
    if (ap.initial !== undefined && ap.value !== undefined) {
      service.processPerformanceFee(ap.strategy, ap.agent, ap.initial, ap.value);
    } else {
      service.processSubscriptionFee(ap.strategy, ap.agent, 30);
    }
  }

  return api;
}
