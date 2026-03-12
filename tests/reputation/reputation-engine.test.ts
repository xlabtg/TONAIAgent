/**
 * Strategy Reputation & Ranking Engine Tests (Issue #218)
 *
 * Covers:
 * - MetricsAggregator: performance, risk, usage, and community metrics
 * - StrategyRankingEngine: score calculation, tier determination, badges
 * - ReputationApi: API endpoints for ranking and metrics
 * - Integration: end-to-end workflow demonstration
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createMetricsAggregator,
  createStrategyRankingEngine,
  createReputationApi,
  createDemoReputationApi,
  DefaultMetricsAggregator,
  DefaultStrategyRankingEngine,
  ReputationApi,
} from '../../src/reputation';

import type {
  ReputationEvent,
  StrategyMetricsInput,
  TradeRecord,
} from '../../src/reputation';

// ============================================================================
// Test Helpers
// ============================================================================

function makeTradeRecord(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    trade_id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    strategy_id: 'test_strategy',
    pnl: 100,
    pnl_percent: 5.0,
    volume: 1000,
    profitable: true,
    timestamp: new Date(),
    ...overrides,
  };
}

function makeMetricsInput(overrides: Partial<StrategyMetricsInput> = {}): StrategyMetricsInput {
  return {
    roi: 15.0,
    win_rate: 60,
    max_drawdown: -10,
    trade_count: 100,
    profit_factor: 1.8,
    agents_using: 50,
    daily_trades: 200,
    volume: 50000,
    rating: 4.2,
    reviews: 25,
    ...overrides,
  };
}

// ============================================================================
// MetricsAggregator Tests
// ============================================================================

describe('MetricsAggregator', () => {
  let aggregator: DefaultMetricsAggregator;

  beforeEach(() => {
    aggregator = createMetricsAggregator();
  });

  describe('Performance Metrics', () => {
    it('should update performance metrics', () => {
      const metrics = aggregator.updatePerformanceMetrics('strategy_001', {
        roi: 18.5,
        win_rate: 65,
        max_drawdown: -12,
        trade_count: 250,
      });

      expect(metrics.strategy_id).toBe('strategy_001');
      expect(metrics.roi).toBe(18.5);
      expect(metrics.win_rate).toBe(65);
      expect(metrics.max_drawdown).toBe(-12);
      expect(metrics.trade_count).toBe(250);
    });

    it('should retrieve performance metrics', () => {
      aggregator.updatePerformanceMetrics('strategy_001', { roi: 20.0 });
      const metrics = aggregator.getPerformanceMetrics('strategy_001');

      expect(metrics).not.toBeNull();
      expect(metrics!.roi).toBe(20.0);
    });

    it('should return null for unknown strategy', () => {
      const metrics = aggregator.getPerformanceMetrics('unknown');
      expect(metrics).toBeNull();
    });

    it('should recalculate metrics from trade history', () => {
      const strategyId = 'trade_test';

      // Record winning trades
      for (let i = 0; i < 6; i++) {
        aggregator.recordTrade(strategyId, makeTradeRecord({
          strategy_id: strategyId,
          pnl: 100,
          pnl_percent: 5.0,
          profitable: true,
        }));
      }

      // Record losing trades
      for (let i = 0; i < 4; i++) {
        aggregator.recordTrade(strategyId, makeTradeRecord({
          strategy_id: strategyId,
          pnl: -50,
          pnl_percent: -2.5,
          profitable: false,
        }));
      }

      const metrics = aggregator.getPerformanceMetrics(strategyId);
      expect(metrics).not.toBeNull();
      expect(metrics!.trade_count).toBe(10);
      expect(metrics!.win_rate).toBe(60); // 6/10 = 60%
    });
  });

  describe('Risk Metrics', () => {
    it('should update risk metrics', () => {
      const metrics = aggregator.updateRiskMetrics('strategy_001', {
        risk_score: 0.42,
        drawdown: -12.1,
        volatility: 0.31,
      });

      expect(metrics.risk_score).toBe(0.42);
      expect(metrics.drawdown).toBe(-12.1);
      expect(metrics.volatility).toBe(0.31);
    });

    it('should calculate risk level correctly', () => {
      expect(aggregator.calculateRiskLevel(0.1)).toBe('low');
      expect(aggregator.calculateRiskLevel(0.5)).toBe('medium');
      expect(aggregator.calculateRiskLevel(0.9)).toBe('high');
    });

    it('should set risk level based on risk score', () => {
      const lowRisk = aggregator.updateRiskMetrics('low_risk', { risk_score: 0.2 });
      const mediumRisk = aggregator.updateRiskMetrics('med_risk', { risk_score: 0.5 });
      const highRisk = aggregator.updateRiskMetrics('high_risk', { risk_score: 0.8 });

      expect(lowRisk.risk_level).toBe('low');
      expect(mediumRisk.risk_level).toBe('medium');
      expect(highRisk.risk_level).toBe('high');
    });
  });

  describe('Usage Metrics', () => {
    it('should update usage metrics', () => {
      const metrics = aggregator.updateUsageMetrics('strategy_001', {
        agents_using: 148,
        daily_trades: 520,
        volume: 210000,
      });

      expect(metrics.agents_using).toBe(148);
      expect(metrics.daily_trades).toBe(520);
      expect(metrics.volume).toBe(210000);
    });

    it('should track agent deployments', () => {
      aggregator.recordAgentDeployment('strategy_001');
      aggregator.recordAgentDeployment('strategy_001');
      aggregator.recordAgentDeployment('strategy_001');

      const metrics = aggregator.getUsageMetrics('strategy_001');
      expect(metrics).not.toBeNull();
      expect(metrics!.agents_using).toBe(3);
      expect(metrics!.active_deployments).toBe(3);
    });

    it('should track agent removals', () => {
      aggregator.recordAgentDeployment('strategy_001');
      aggregator.recordAgentDeployment('strategy_001');
      aggregator.recordAgentRemoval('strategy_001');

      const metrics = aggregator.getUsageMetrics('strategy_001');
      expect(metrics!.agents_using).toBe(1);
    });

    it('should not go below zero on removal', () => {
      aggregator.recordAgentRemoval('strategy_001');
      const metrics = aggregator.getUsageMetrics('strategy_001');
      expect(metrics!.agents_using).toBe(0);
    });
  });

  describe('Community Feedback', () => {
    it('should update community feedback', () => {
      const feedback = aggregator.updateCommunityFeedback('strategy_001', {
        rating: 4.6,
        reviews: 82,
        verified_reviews: 45,
      });

      expect(feedback.rating).toBe(4.6);
      expect(feedback.reviews).toBe(82);
      expect(feedback.verified_reviews).toBe(45);
    });

    it('should calculate weighted average for ratings', () => {
      aggregator.recordRating('strategy_001', 5, true);  // Verified, weight 1.5
      aggregator.recordRating('strategy_001', 3, false); // Unverified, weight 1.0

      const feedback = aggregator.getCommunityFeedback('strategy_001');
      expect(feedback).not.toBeNull();
      // Weighted: (5*1.5 + 3*1.0) / (1.5 + 1.0) = 10.5 / 2.5 = 4.2
      expect(feedback!.rating).toBeCloseTo(4.2, 1);
      expect(feedback!.reviews).toBe(2);
      expect(feedback!.verified_reviews).toBe(1);
    });
  });

  describe('Aggregation', () => {
    it('should aggregate all metrics for a strategy', () => {
      const strategyId = 'full_strategy';

      aggregator.updatePerformanceMetrics(strategyId, { roi: 20.0, win_rate: 70 });
      aggregator.updateRiskMetrics(strategyId, { risk_score: 0.3 });
      aggregator.updateUsageMetrics(strategyId, { agents_using: 100 });
      aggregator.updateCommunityFeedback(strategyId, { rating: 4.5 });

      const aggregated = aggregator.getAggregatedMetrics(strategyId);

      expect(aggregated).not.toBeNull();
      expect(aggregated!.performance.roi).toBe(20.0);
      expect(aggregated!.risk.risk_score).toBe(0.3);
      expect(aggregated!.usage.agents_using).toBe(100);
      expect(aggregated!.community.rating).toBe(4.5);
    });

    it('should return null for strategy with no metrics', () => {
      const aggregated = aggregator.getAggregatedMetrics('unknown');
      expect(aggregated).toBeNull();
    });

    it('should initialize all metrics when aggregating', () => {
      const aggregated = aggregator.aggregateAllMetrics('new_strategy');

      expect(aggregated.strategy_id).toBe('new_strategy');
      expect(aggregated.performance).toBeDefined();
      expect(aggregated.risk).toBeDefined();
      expect(aggregated.usage).toBeDefined();
      expect(aggregated.community).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit events on metrics updates', () => {
      const events: ReputationEvent[] = [];
      aggregator.onEvent(e => events.push(e));

      aggregator.updatePerformanceMetrics('strategy_001', { roi: 10 });
      aggregator.updateRiskMetrics('strategy_001', { risk_score: 0.5 });
      aggregator.updateUsageMetrics('strategy_001', { agents_using: 10 });
      aggregator.updateCommunityFeedback('strategy_001', { rating: 4.0 });

      expect(events.length).toBe(4);
      expect(events.every(e => e.type === 'metrics_updated')).toBe(true);
    });
  });
});

// ============================================================================
// StrategyRankingEngine Tests
// ============================================================================

describe('StrategyRankingEngine', () => {
  let engine: DefaultStrategyRankingEngine;

  beforeEach(() => {
    engine = createStrategyRankingEngine();
  });

  describe('Strategy Registration', () => {
    it('should register a strategy', () => {
      const score = engine.registerStrategy('momentum_v1', 'Momentum Strategy', 'dev_001');

      expect(score.strategy_id).toBe('momentum_v1');
      expect(score.reputation_score).toBeGreaterThanOrEqual(0);
      expect(score.tier).toBeDefined();
      expect(score.calculated_at).toBeInstanceOf(Date);
    });

    it('should assign initial tier of emerging', () => {
      const score = engine.registerStrategy('new_strategy', 'New Strategy', 'dev_001');
      expect(score.tier).toBe('emerging');
    });

    it('should assign new_strategy badge to fresh strategies', () => {
      const score = engine.registerStrategy('brand_new', 'Brand New', 'dev_001');
      expect(score.badges).toContain('new_strategy');
    });
  });

  describe('Score Calculation', () => {
    it('should calculate reputation score from metrics', () => {
      engine.registerStrategy('test_strategy', 'Test Strategy', 'dev_001');
      const score = engine.updateStrategyMetrics('test_strategy', makeMetricsInput());

      expect(score).not.toBeNull();
      expect(score!.reputation_score).toBeGreaterThan(0);
      expect(score!.reputation_score).toBeLessThanOrEqual(100);
    });

    it('should produce higher score for better ROI', () => {
      engine.registerStrategy('low_roi', 'Low ROI', 'dev_001');
      engine.registerStrategy('high_roi', 'High ROI', 'dev_002');

      engine.updateStrategyMetrics('low_roi', makeMetricsInput({ roi: 5.0 }));
      engine.updateStrategyMetrics('high_roi', makeMetricsInput({ roi: 30.0 }));

      const lowScore = engine.getStrategyScore('low_roi');
      const highScore = engine.getStrategyScore('high_roi');

      expect(highScore!.reputation_score).toBeGreaterThan(lowScore!.reputation_score);
    });

    it('should penalize high drawdown', () => {
      engine.registerStrategy('safe', 'Safe Strategy', 'dev_001');
      engine.registerStrategy('risky', 'Risky Strategy', 'dev_002');

      engine.updateStrategyMetrics('safe', makeMetricsInput({ max_drawdown: -5 }));
      engine.updateStrategyMetrics('risky', makeMetricsInput({ max_drawdown: -40 }));

      const safeScore = engine.getStrategyScore('safe');
      const riskyScore = engine.getStrategyScore('risky');

      expect(safeScore!.reputation_score).toBeGreaterThan(riskyScore!.reputation_score);
    });

    it('should reward popularity', () => {
      engine.registerStrategy('popular', 'Popular', 'dev_001');
      engine.registerStrategy('unpopular', 'Unpopular', 'dev_002');

      engine.updateStrategyMetrics('popular', makeMetricsInput({ agents_using: 200 }));
      engine.updateStrategyMetrics('unpopular', makeMetricsInput({ agents_using: 2 }));

      const popularScore = engine.getStrategyScore('popular');
      const unpopularScore = engine.getStrategyScore('unpopular');

      expect(popularScore!.popularity_score).toBeGreaterThan(unpopularScore!.popularity_score);
    });

    it('should reward high user ratings', () => {
      engine.registerStrategy('loved', 'Loved', 'dev_001');
      engine.registerStrategy('hated', 'Hated', 'dev_002');

      engine.updateStrategyMetrics('loved', makeMetricsInput({ rating: 4.9 }));
      engine.updateStrategyMetrics('hated', makeMetricsInput({ rating: 1.5 }));

      const lovedScore = engine.getStrategyScore('loved');
      const hatedScore = engine.getStrategyScore('hated');

      expect(lovedScore!.community_score).toBeGreaterThan(hatedScore!.community_score);
    });
  });

  describe('Tier Determination', () => {
    it('should assign emerging tier to new low-scoring strategies', () => {
      engine.registerStrategy('emerging', 'Emerging', 'dev_001');
      engine.updateStrategyMetrics('emerging', makeMetricsInput({
        roi: -10,
        win_rate: 40,
        max_drawdown: -30,
        agents_using: 2,
        rating: 2.0,
      }));

      const score = engine.getStrategyScore('emerging');
      expect(score!.tier).toBe('emerging');
    });

    it('should assign established tier to moderate strategies', () => {
      engine.registerStrategy('established', 'Established', 'dev_001');
      engine.updateStrategyMetrics('established', makeMetricsInput({
        roi: 15,
        win_rate: 60,
        max_drawdown: -10,
        agents_using: 30,
        rating: 4.0,
      }));

      const score = engine.getStrategyScore('established');
      expect(['established', 'trusted']).toContain(score!.tier);
    });
  });

  describe('Badges', () => {
    it('should award top_performer badge for high performance', () => {
      engine.registerStrategy('performer', 'Top Performer', 'dev_001');
      engine.updateStrategyMetrics('performer', makeMetricsInput({
        roi: 40,
        win_rate: 80,
        profit_factor: 2.5,
      }));

      const score = engine.getStrategyScore('performer');
      expect(score!.badges).toContain('top_performer');
    });

    it('should award low_risk badge for safe strategies', () => {
      engine.registerStrategy('safe', 'Safe', 'dev_001');
      engine.updateStrategyMetrics('safe', makeMetricsInput({
        max_drawdown: -5,
        risk_score: 0.2,
      }));

      const score = engine.getStrategyScore('safe');
      expect(score!.badges).toContain('low_risk');
    });

    it('should award trending badge for popular strategies', () => {
      engine.registerStrategy('trending', 'Trending', 'dev_001');
      engine.updateStrategyMetrics('trending', makeMetricsInput({
        agents_using: 50,
      }));

      const score = engine.getStrategyScore('trending');
      expect(score!.badges).toContain('trending');
    });

    it('should award high_volume badge for high trading volume', () => {
      engine.registerStrategy('volume', 'High Volume', 'dev_001');
      engine.updateStrategyMetrics('volume', makeMetricsInput({
        volume: 150000,
      }));

      const score = engine.getStrategyScore('volume');
      expect(score!.badges).toContain('high_volume');
    });
  });

  describe('Leaderboards', () => {
    beforeEach(() => {
      // Register multiple strategies for leaderboard tests
      engine.registerStrategy('s1', 'Strategy 1', 'dev_001');
      engine.registerStrategy('s2', 'Strategy 2', 'dev_002');
      engine.registerStrategy('s3', 'Strategy 3', 'dev_003');

      engine.updateStrategyMetrics('s1', makeMetricsInput({ roi: 25, agents_using: 100 }));
      engine.updateStrategyMetrics('s2', makeMetricsInput({ roi: 15, agents_using: 50 }));
      engine.updateStrategyMetrics('s3', makeMetricsInput({ roi: 35, agents_using: 30 }));
    });

    it('should generate top_performing leaderboard sorted by reputation score', () => {
      const leaderboard = engine.getLeaderboard('top_performing');

      expect(leaderboard.category).toBe('top_performing');
      expect(leaderboard.entries.length).toBe(3);
      expect(leaderboard.entries[0].rank).toBe(1);

      // Entries should be sorted by reputation score
      for (let i = 1; i < leaderboard.entries.length; i++) {
        expect(leaderboard.entries[i - 1].reputation_score)
          .toBeGreaterThanOrEqual(leaderboard.entries[i].reputation_score);
      }
    });

    it('should generate most_popular leaderboard sorted by agents', () => {
      const leaderboard = engine.getLeaderboard('most_popular');

      expect(leaderboard.category).toBe('most_popular');
      expect(leaderboard.entries[0].strategy_id).toBe('s1'); // 100 agents
      expect(leaderboard.entries[0].agents_using).toBe(100);
    });

    it('should generate low_risk leaderboard', () => {
      engine.updateStrategyMetrics('s1', { risk_score: 0.2 }); // Low
      engine.updateStrategyMetrics('s2', { risk_score: 0.8 }); // High
      engine.updateStrategyMetrics('s3', { risk_score: 0.5 }); // Medium

      const leaderboard = engine.getLeaderboard('low_risk');

      expect(leaderboard.category).toBe('low_risk');
      expect(leaderboard.entries[0].risk).toBe('low');
    });

    it('should get all leaderboards', () => {
      const leaderboards = engine.getAllLeaderboards();

      expect(leaderboards.length).toBe(5);
      const categories = leaderboards.map(l => l.category);
      expect(categories).toContain('top_performing');
      expect(categories).toContain('most_popular');
      expect(categories).toContain('low_risk');
      expect(categories).toContain('new_strategies');
      expect(categories).toContain('trending');
    });
  });

  describe('Strategy Removal', () => {
    it('should remove a strategy', () => {
      engine.registerStrategy('to_remove', 'To Remove', 'dev_001');
      expect(engine.getStrategyScore('to_remove')).not.toBeNull();

      engine.removeStrategy('to_remove');
      expect(engine.getStrategyScore('to_remove')).toBeNull();
    });
  });

  describe('Events', () => {
    it('should emit events on score calculation', () => {
      const events: ReputationEvent[] = [];
      engine.onEvent(e => events.push(e));

      engine.registerStrategy('event_test', 'Event Test', 'dev_001');

      expect(events.some(e => e.type === 'score_calculated')).toBe(true);
    });

    it('should emit ranking_updated on recalculate all', () => {
      const events: ReputationEvent[] = [];

      engine.registerStrategy('s1', 'S1', 'dev_001');
      engine.registerStrategy('s2', 'S2', 'dev_002');

      engine.onEvent(e => events.push(e));
      engine.recalculateAllScores();

      expect(events.some(e => e.type === 'ranking_updated')).toBe(true);
    });
  });
});

// ============================================================================
// ReputationApi Tests
// ============================================================================

describe('ReputationApi', () => {
  let api: ReputationApi;

  beforeEach(() => {
    api = createReputationApi();

    // Register some test strategies
    const engine = api.getRankingEngine();
    engine.registerStrategy('api_test_1', 'API Test 1', 'dev_001');
    engine.registerStrategy('api_test_2', 'API Test 2', 'dev_002');

    engine.updateStrategyMetrics('api_test_1', makeMetricsInput({ roi: 20 }));
    engine.updateStrategyMetrics('api_test_2', makeMetricsInput({ roi: 10 }));
  });

  describe('GET /api/strategies/ranking', () => {
    it('should return ranked strategies', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/ranking',
      });

      expect(response.status).toBe(200);
      const body = response.body as { strategies: unknown[]; total: number };
      expect(body.strategies).toBeDefined();
      expect(body.strategies.length).toBeGreaterThan(0);
    });

    it('should filter by category', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/ranking',
        query: { category: 'most_popular' },
      });

      expect(response.status).toBe(200);
    });

    it('should paginate results', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/ranking',
        query: { limit: '1', offset: '0' },
      });

      expect(response.status).toBe(200);
      const body = response.body as { strategies: unknown[]; limit: number };
      expect(body.strategies.length).toBe(1);
      expect(body.limit).toBe(1);
    });

    it('should reject invalid category', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/ranking',
        query: { category: 'invalid_category' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/strategies/{id}/metrics', () => {
    it('should return strategy metrics', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/api_test_1/metrics',
      });

      expect(response.status).toBe(200);
      const body = response.body as { strategy_id: string; performance: { roi: number } };
      expect(body.strategy_id).toBe('api_test_1');
      expect(body.performance).toBeDefined();
      expect(body.performance.roi).toBe(20);
    });

    it('should return 404 for unknown strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/unknown_strategy/metrics',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/strategies/{id}/reputation', () => {
    it('should return strategy reputation score', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/api_test_1/reputation',
      });

      expect(response.status).toBe(200);
      const body = response.body as { strategy_id: string; reputation_score: number; tier: string };
      expect(body.strategy_id).toBe('api_test_1');
      expect(body.reputation_score).toBeGreaterThan(0);
      expect(body.tier).toBeDefined();
    });
  });

  describe('GET /api/leaderboards', () => {
    it('should return all leaderboards', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/leaderboards',
      });

      expect(response.status).toBe(200);
      const body = response.body as Array<{ category: string }>;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(5);
    });
  });

  describe('GET /api/leaderboards/{category}', () => {
    it('should return specific leaderboard', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/leaderboards/top_performing',
      });

      expect(response.status).toBe(200);
      const body = response.body as { category: string; entries: unknown[] };
      expect(body.category).toBe('top_performing');
      expect(body.entries).toBeDefined();
    });

    it('should reject invalid category', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/leaderboards/invalid',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/strategies/{id}/register', () => {
    it('should register a new strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/new_strategy/register',
        body: {
          strategy_name: 'New Strategy',
          author_id: 'dev_new',
        },
      });

      expect(response.status).toBe(201);
      const body = response.body as { strategy_id: string };
      expect(body.strategy_id).toBe('new_strategy');
    });

    it('should reject missing required fields', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/incomplete/register',
        body: { strategy_name: 'Incomplete' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/strategies/{id}/metrics', () => {
    it('should update strategy metrics', async () => {
      const response = await api.handle({
        method: 'PUT',
        path: '/api/strategies/api_test_1/metrics',
        body: { roi: 30, win_rate: 75 },
      });

      expect(response.status).toBe(200);
      const body = response.body as { reputation_score: number };
      expect(body.reputation_score).toBeGreaterThan(0);
    });

    it('should return 404 for unknown strategy', async () => {
      const response = await api.handle({
        method: 'PUT',
        path: '/api/strategies/unknown/metrics',
        body: { roi: 10 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/strategies/{id}', () => {
    it('should remove a strategy', async () => {
      const response = await api.handle({
        method: 'DELETE',
        path: '/api/strategies/api_test_2',
      });

      expect(response.status).toBe(200);

      // Verify removal
      const getResponse = await api.handle({
        method: 'GET',
        path: '/api/strategies/api_test_2/reputation',
      });
      expect(getResponse.status).toBe(404);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/unknown/path',
      });

      expect(response.status).toBe(404);
    });
  });
});

// ============================================================================
// Demo API Tests
// ============================================================================

describe('Demo ReputationApi', () => {
  it('should create demo API with sample data', async () => {
    const api = createDemoReputationApi();

    const response = await api.handle({
      method: 'GET',
      path: '/api/strategies/ranking',
    });

    expect(response.status).toBe(200);
    const body = response.body as { strategies: unknown[]; total: number };
    expect(body.strategies.length).toBe(5);
    expect(body.total).toBe(5);
  });

  it('should have populated metrics for demo strategies', async () => {
    const api = createDemoReputationApi();

    const response = await api.handle({
      method: 'GET',
      path: '/api/strategies/momentum_v1/metrics',
    });

    expect(response.status).toBe(200);
    const body = response.body as {
      performance: { roi: number; win_rate: number };
      popularity: { agents_using: number };
      rating: { rating: number };
    };
    expect(body.performance.roi).toBe(18.4);
    expect(body.performance.win_rate).toBe(62);
    expect(body.popularity.agents_using).toBe(148);
    expect(body.rating.rating).toBe(4.6);
  });
});

// ============================================================================
// Integration Test: End-to-End Workflow
// ============================================================================

describe('Integration: Strategy Reputation Workflow', () => {
  it('should demonstrate full reputation workflow', async () => {
    const api = createReputationApi();
    const engine = api.getRankingEngine();
    const events: ReputationEvent[] = [];

    api.onEvent(e => events.push(e));

    // Step 1: Register strategies
    const strategies = [
      { id: 'yield_alpha', name: 'DeFi Yield Alpha', author: 'alice' },
      { id: 'arb_bot', name: 'Cross-DEX Arbitrage', author: 'bob' },
      { id: 'grid_master', name: 'Grid Trading Master', author: 'charlie' },
    ];

    for (const s of strategies) {
      await api.handle({
        method: 'POST',
        path: `/api/strategies/${s.id}/register`,
        body: { strategy_name: s.name, author_id: s.author },
      });
    }

    // Step 2: Update metrics based on performance
    // Note: risk_score determines risk_level: <0.3 = low, 0.3-0.7 = medium, >0.7 = high
    const metricsData = [
      { id: 'yield_alpha', roi: 22.5, win_rate: 65, max_drawdown: -8, agents_using: 85, rating: 4.5, risk_score: 0.4 },
      { id: 'arb_bot', roi: 35.2, win_rate: 78, max_drawdown: -12, agents_using: 42, rating: 4.2, risk_score: 0.6 },
      { id: 'grid_master', roi: 15.8, win_rate: 72, max_drawdown: -5, agents_using: 120, rating: 4.8, risk_score: 0.15 },
    ];

    for (const m of metricsData) {
      await api.handle({
        method: 'PUT',
        path: `/api/strategies/${m.id}/metrics`,
        body: m,
      });
    }

    // Step 3: Get the leaderboard
    const rankingResponse = await api.handle({
      method: 'GET',
      path: '/api/strategies/ranking',
    });

    expect(rankingResponse.status).toBe(200);
    const ranking = rankingResponse.body as { strategies: Array<{ strategy_id: string; reputation_score: number }> };

    // Verify all strategies are ranked
    expect(ranking.strategies.length).toBe(3);
    expect(ranking.strategies[0].reputation_score).toBeGreaterThan(ranking.strategies[2].reputation_score);

    // Step 4: Check individual strategy metrics
    const metricsResponse = await api.handle({
      method: 'GET',
      path: '/api/strategies/yield_alpha/metrics',
    });

    expect(metricsResponse.status).toBe(200);
    const metrics = metricsResponse.body as {
      performance: { roi: number };
      reputation_score: number;
    };
    expect(metrics.performance.roi).toBe(22.5);
    expect(metrics.reputation_score).toBeGreaterThan(0);

    // Step 5: Verify events were emitted
    expect(events.some(e => e.type === 'score_calculated')).toBe(true);
    expect(events.some(e => e.type === 'metrics_updated')).toBe(true);

    // Step 6: Get category leaderboards
    const lowRiskResponse = await api.handle({
      method: 'GET',
      path: '/api/leaderboards/low_risk',
    });

    expect(lowRiskResponse.status).toBe(200);
    const lowRiskBoard = lowRiskResponse.body as { category: string; entries: Array<{ strategy_id: string }> };
    expect(lowRiskBoard.category).toBe('low_risk');

    // Grid Master should be top for low risk (lowest drawdown)
    expect(lowRiskBoard.entries[0].strategy_id).toBe('grid_master');

    // Step 7: Most popular should be Grid Master (most agents)
    const popularResponse = await api.handle({
      method: 'GET',
      path: '/api/leaderboards/most_popular',
    });

    const popularBoard = popularResponse.body as { entries: Array<{ strategy_id: string; agents_using: number }> };
    expect(popularBoard.entries[0].strategy_id).toBe('grid_master');
    expect(popularBoard.entries[0].agents_using).toBe(120);
  });
});
