/**
 * Strategy Marketplace API Tests (Issue #216)
 *
 * Tests for the Strategy Marketplace REST API handler that provides
 * endpoints for browsing, filtering, and deploying strategies.
 *
 * Covers:
 * - Strategy listing and filtering endpoints
 * - Strategy details and performance endpoints
 * - Strategy deployment endpoints
 * - Strategy rating endpoints
 * - Category and stats endpoints
 * - User agents management
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  MarketplaceApi,
  createMarketplaceApi,
  createDemoMarketplaceApi,
} from '../../src/strategy-marketplace/api';

import type {
  MarketplaceApiRequest,
  StrategyListResponse,
  StrategyDetailsResponse,
  StrategyPerformanceData,
  CategoriesResponse,
  TopStrategiesResponse,
} from '../../src/strategy-marketplace/api';

import type {
  MarketplaceStats,
  StrategyReview,
} from '../../src/strategy-marketplace/types';

import type {
  MarketplaceDeployedAgent,
} from '../../src/strategy-marketplace';

// ============================================================================
// API Setup
// ============================================================================

describe('MarketplaceApi', () => {
  let api: MarketplaceApi;

  beforeEach(() => {
    api = createDemoMarketplaceApi();
  });

  // ==========================================================================
  // GET /api/marketplace/strategies
  // ==========================================================================

  describe('GET /api/marketplace/strategies', () => {
    it('should list all strategies', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as StrategyListResponse;
      expect(data.strategies.length).toBeGreaterThan(0);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should filter by category', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { category: 'momentum' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.body.data as StrategyListResponse;
      expect(data.strategies.every(s => s.category === 'momentum')).toBe(true);
    });

    it('should filter by risk level', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { riskLevel: 'low' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.body.data as StrategyListResponse;
      expect(data.strategies.every(s => s.riskLevel === 'low')).toBe(true);
    });

    it('should filter by minimum ROI', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { minRoi: '10' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.body.data as StrategyListResponse;
      expect(data.strategies.every(s => s.roi30d >= 10)).toBe(true);
    });

    it('should search by text query', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { search: 'yield' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.body.data as StrategyListResponse;
      expect(data.strategies.length).toBeGreaterThan(0);
    });

    it('should sort by ROI descending', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { sortBy: 'roi', sortOrder: 'desc' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.body.data as StrategyListResponse;

      for (let i = 1; i < data.strategies.length; i++) {
        expect(data.strategies[i - 1].roi30d).toBeGreaterThanOrEqual(
          data.strategies[i].roi30d
        );
      }
    });

    it('should support pagination', async () => {
      const page1 = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { limit: '2', offset: '0' },
      });

      const page2 = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies',
        query: { limit: '2', offset: '2' },
      });

      expect(page1.statusCode).toBe(200);
      expect(page2.statusCode).toBe(200);

      const data1 = page1.body.data as StrategyListResponse;
      const data2 = page2.body.data as StrategyListResponse;

      expect(data1.strategies.length).toBe(2);
      expect(data1.strategies[0].id).not.toBe(data2.strategies[0]?.id);
    });
  });

  // ==========================================================================
  // GET /api/marketplace/strategies/:id
  // ==========================================================================

  describe('GET /api/marketplace/strategies/:id', () => {
    it('should return strategy details', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies/momentum-trader',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as StrategyDetailsResponse;
      expect(data.strategy.id).toBe('momentum-trader');
      expect(data.strategy.name).toBe('Momentum Trader');
      expect(data.performance).toBeDefined();
      expect(data.recentReviews).toBeDefined();
      expect(data.similarStrategies).toBeDefined();
    });

    it('should return 404 for unknown strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('STRATEGY_NOT_FOUND');
    });
  });

  // ==========================================================================
  // GET /api/marketplace/strategies/:id/performance
  // ==========================================================================

  describe('GET /api/marketplace/strategies/:id/performance', () => {
    it('should return strategy performance data', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies/momentum-trader/performance',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as StrategyPerformanceData;
      expect(data.equityCurve).toBeDefined();
      expect(data.equityCurve.length).toBeGreaterThan(0);
      expect(data.drawdownCurve).toBeDefined();
      expect(data.tradeDistribution).toBeDefined();
      expect(data.monthlyReturns).toBeDefined();
      expect(data.snapshots).toBeDefined();
    });

    it('should return 404 for unknown strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies/nonexistent/performance',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // GET /api/marketplace/strategies/:id/reviews
  // ==========================================================================

  describe('GET /api/marketplace/strategies/:id/reviews', () => {
    it('should return empty reviews for new strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/strategies/momentum-trader/reviews',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as { reviews: StrategyReview[]; total: number };
      expect(data.reviews).toBeDefined();
      expect(Array.isArray(data.reviews)).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/marketplace/strategies/:id/deploy
  // ==========================================================================

  describe('POST /api/marketplace/strategies/:id/deploy', () => {
    it('should deploy a strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/deploy',
        body: {
          capitalTON: 100,
          simulationMode: true,
          agentName: 'Test Agent',
        },
        userId: 'test_user_123',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const agent = response.body.data as MarketplaceDeployedAgent;
      expect(agent.agentId).toBeDefined();
      expect(agent.strategyId).toBe('momentum-trader');
      expect(agent.strategyName).toBe('Momentum Trader');
      expect(agent.capitalAllocated).toBe(100);
      expect(agent.simulationMode).toBe(true);
      expect(agent.name).toBe('Test Agent');
      expect(agent.status).toBe('running');
    });

    it('should require authentication', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/deploy',
        body: { capitalTON: 100 },
        // No userId
      });

      expect(response.statusCode).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should validate capital amount', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/deploy',
        body: { capitalTON: 0 },
        userId: 'test_user',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should check minimum capital requirement', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/yield-optimizer/deploy',
        body: { capitalTON: 50 }, // Yield Optimizer requires 100 TON
        userId: 'test_user',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('INSUFFICIENT_CAPITAL');
    });
  });

  // ==========================================================================
  // POST /api/marketplace/strategies/:id/rate
  // ==========================================================================

  describe('POST /api/marketplace/strategies/:id/rate', () => {
    it('should rate a strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/rate',
        body: {
          rating: 4,
          title: 'Great strategy!',
          content: 'Works well for trending markets.',
        },
        userId: 'test_reviewer',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const review = response.body.data as StrategyReview;
      expect(review.id).toBeDefined();
      expect(review.strategyId).toBe('momentum-trader');
      expect(review.userId).toBe('test_reviewer');
      expect(review.rating).toBe(4);
      expect(review.title).toBe('Great strategy!');
    });

    it('should require authentication', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/rate',
        body: { rating: 4 },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate rating range', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/rate',
        body: { rating: 10 }, // Invalid - should be 1-5
        userId: 'test_user',
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // GET /api/marketplace/categories
  // ==========================================================================

  describe('GET /api/marketplace/categories', () => {
    it('should return category list with stats', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/categories',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as CategoriesResponse;
      expect(data.categories).toBeDefined();
      expect(data.categories.length).toBeGreaterThan(0);

      const category = data.categories[0];
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.description).toBeDefined();
      expect(typeof category.strategyCount).toBe('number');
      expect(typeof category.averageRoi).toBe('number');
    });
  });

  // ==========================================================================
  // GET /api/marketplace/stats
  // ==========================================================================

  describe('GET /api/marketplace/stats', () => {
    it('should return marketplace statistics', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/stats',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const stats = response.body.data as MarketplaceStats;
      expect(stats.totalStrategies).toBeGreaterThan(0);
      expect(stats.totalActiveUsers).toBeGreaterThan(0);
      expect(typeof stats.totalAUM).toBe('number');
      expect(stats.topRoi).toBeGreaterThan(0);
      expect(typeof stats.averageRoi).toBe('number');
      expect(stats.categoryCounts).toBeDefined();
    });
  });

  // ==========================================================================
  // GET /api/marketplace/top
  // ==========================================================================

  describe('GET /api/marketplace/top', () => {
    it('should return top strategies by different metrics', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/top',
        query: { limit: '3' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as TopStrategiesResponse;
      expect(data.byRoi).toBeDefined();
      expect(data.byRoi.length).toBeLessThanOrEqual(3);
      expect(data.bySharpe).toBeDefined();
      expect(data.byPopularity).toBeDefined();
      expect(data.newest).toBeDefined();
    });
  });

  // ==========================================================================
  // GET /api/marketplace/agents
  // ==========================================================================

  describe('GET /api/marketplace/agents', () => {
    it('should return user agents', async () => {
      // First deploy a strategy
      await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/deploy',
        body: { capitalTON: 100, simulationMode: true },
        userId: 'agents_test_user',
      });

      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/agents',
        userId: 'agents_test_user',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as { agents: MarketplaceDeployedAgent[] };
      expect(data.agents.length).toBe(1);
      expect(data.agents[0].userId).toBe('agents_test_user');
    });

    it('should require authentication', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/agents',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // POST /api/marketplace/agents/:id/stop
  // ==========================================================================

  describe('POST /api/marketplace/agents/:id/stop', () => {
    it('should stop a running agent', async () => {
      // First deploy a strategy
      const deployResponse = await api.handle({
        method: 'POST',
        path: '/api/marketplace/strategies/momentum-trader/deploy',
        body: { capitalTON: 100 },
        userId: 'stop_test_user',
      });

      const agent = deployResponse.body.data as MarketplaceDeployedAgent;

      const stopResponse = await api.handle({
        method: 'POST',
        path: `/api/marketplace/agents/${agent.agentId}/stop`,
      });

      expect(stopResponse.statusCode).toBe(200);
      expect(stopResponse.body.success).toBe(true);

      const data = stopResponse.body.data as { stopped: boolean };
      expect(data.stopped).toBe(true);
    });

    it('should return 404 for unknown agent', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/marketplace/agents/nonexistent/stop',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // 404 for unknown routes
  // ==========================================================================

  describe('Unknown routes', () => {
    it('should return 404 for unknown path', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/marketplace/unknown',
      });

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

// ============================================================================
// Demo Flow Test: Strategy Marketplace UI API (Issue #216)
// ============================================================================

describe('Demo Flow: Strategy Marketplace UI API (Issue #216)', () => {
  it('should complete the full marketplace UI flow via API', async () => {
    const api = createDemoMarketplaceApi();
    const userId = 'demo_ui_user';

    // Step 1: User opens marketplace - view stats
    const statsResponse = await api.handle({
      method: 'GET',
      path: '/api/marketplace/stats',
    });
    expect(statsResponse.statusCode).toBe(200);
    const stats = statsResponse.body.data as MarketplaceStats;
    expect(stats.totalStrategies).toBeGreaterThan(0);

    // Step 2: User browses categories
    const categoriesResponse = await api.handle({
      method: 'GET',
      path: '/api/marketplace/categories',
    });
    expect(categoriesResponse.statusCode).toBe(200);

    // Step 3: User views top strategies
    const topResponse = await api.handle({
      method: 'GET',
      path: '/api/marketplace/top',
    });
    expect(topResponse.statusCode).toBe(200);
    const topData = topResponse.body.data as TopStrategiesResponse;

    // Step 4: User filters strategies
    const filteredResponse = await api.handle({
      method: 'GET',
      path: '/api/marketplace/strategies',
      query: {
        riskLevel: 'medium',
        sortBy: 'roi',
        sortOrder: 'desc',
      },
    });
    expect(filteredResponse.statusCode).toBe(200);
    const filteredData = filteredResponse.body.data as StrategyListResponse;

    // Step 5: User selects a strategy to view details
    const strategyId = filteredData.strategies[0].id;
    const detailsResponse = await api.handle({
      method: 'GET',
      path: `/api/marketplace/strategies/${strategyId}`,
    });
    expect(detailsResponse.statusCode).toBe(200);
    const details = detailsResponse.body.data as StrategyDetailsResponse;

    // Step 6: User views strategy performance charts
    const performanceResponse = await api.handle({
      method: 'GET',
      path: `/api/marketplace/strategies/${strategyId}/performance`,
    });
    expect(performanceResponse.statusCode).toBe(200);
    const performance = performanceResponse.body.data as StrategyPerformanceData;
    expect(performance.equityCurve.length).toBeGreaterThan(0);

    // Step 7: User deploys the strategy
    const deployResponse = await api.handle({
      method: 'POST',
      path: `/api/marketplace/strategies/${strategyId}/deploy`,
      body: {
        capitalTON: details.strategy.minCapital + 50,
        simulationMode: true,
        agentName: 'My Trading Bot',
      },
      userId,
    });
    expect(deployResponse.statusCode).toBe(200);
    const agent = deployResponse.body.data as MarketplaceDeployedAgent;
    expect(agent.status).toBe('running');

    // Step 8: User rates the strategy
    const rateResponse = await api.handle({
      method: 'POST',
      path: `/api/marketplace/strategies/${strategyId}/rate`,
      body: {
        rating: 5,
        title: 'Excellent!',
        content: 'Very good results so far.',
      },
      userId,
    });
    expect(rateResponse.statusCode).toBe(200);

    // Step 9: User views their deployed agents
    const agentsResponse = await api.handle({
      method: 'GET',
      path: '/api/marketplace/agents',
      userId,
    });
    expect(agentsResponse.statusCode).toBe(200);
    const agentsData = agentsResponse.body.data as { agents: MarketplaceDeployedAgent[] };
    expect(agentsData.agents.length).toBe(1);

    // Step 10: User stops the agent
    const stopResponse = await api.handle({
      method: 'POST',
      path: `/api/marketplace/agents/${agent.agentId}/stop`,
    });
    expect(stopResponse.statusCode).toBe(200);
  });
});
