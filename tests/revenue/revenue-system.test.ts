/**
 * Strategy Revenue Sharing System Tests (Issue #219)
 *
 * Covers:
 * - FeeCalculator: performance, subscription, and hybrid fee calculations
 * - RevenueDistributionService: monetization configuration, revenue processing, earnings tracking
 * - RevenueApi: API endpoints for revenue management
 * - Integration: end-to-end workflow demonstration
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createFeeCalculator,
  createRevenueDistributionService,
  createRevenueApi,
  createDemoRevenueApi,
  DefaultFeeCalculator,
  DefaultRevenueDistributionService,
  RevenueApi,
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
} from '../../services/revenue';

import type {
  PerformanceFeeInput,
  SubscriptionFeeInput,
  RevenueSplitConfig,
  RevenueSystemEvent,
  FeeType,
} from '../../services/revenue';

// ============================================================================
// Test Helpers
// ============================================================================

function makePerformanceFeeInput(overrides: Partial<PerformanceFeeInput> = {}): PerformanceFeeInput {
  return {
    strategy_id: 'test_strategy',
    agent_id: 'test_agent',
    initial_capital: 10000,
    portfolio_value: 10800,
    fee_percent: 20,
    split_config: DEFAULT_REVENUE_SPLIT,
    ...overrides,
  };
}

function makeSubscriptionFeeInput(overrides: Partial<SubscriptionFeeInput> = {}): SubscriptionFeeInput {
  return {
    strategy_id: 'test_strategy',
    agent_id: 'test_agent',
    monthly_fee: 10,
    billing_period_days: 30,
    split_config: DEFAULT_REVENUE_SPLIT,
    ...overrides,
  };
}

// ============================================================================
// FeeCalculator Tests
// ============================================================================

describe('FeeCalculator', () => {
  let calculator: DefaultFeeCalculator;

  beforeEach(() => {
    calculator = createFeeCalculator();
  });

  describe('Performance Fee Calculation', () => {
    it('should calculate performance fee correctly', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 10800,
        fee_percent: 20,
      });

      const result = calculator.calculatePerformanceFee(input);

      // Profit: $800, Fee (20%): $160
      expect(result.profit).toBe(800);
      expect(result.fee_amount).toBe(160);
    });

    it('should split revenue between developer and platform', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 10800,
        fee_percent: 20,
        split_config: { developer_share: 70, platform_share: 30, referrer_share: 0 },
      });

      const result = calculator.calculatePerformanceFee(input);

      // Fee: $160, Developer (70%): $112, Platform (30%): $48
      expect(result.fee_amount).toBe(160);
      expect(result.developer_earnings).toBe(112);
      expect(result.platform_earnings).toBe(48);
      expect(result.referrer_earnings).toBe(0);
    });

    it('should include referrer share when configured', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 11000,
        fee_percent: 20,
        split_config: REVENUE_SPLIT_WITH_REFERRER,
        referrer_id: 'referrer_123',
      });

      const result = calculator.calculatePerformanceFee(input);

      // Profit: $1000, Fee: $200
      // Developer (65%): $130, Platform (25%): $50, Referrer (10%): $20
      expect(result.fee_amount).toBe(200);
      expect(result.developer_earnings).toBe(130);
      expect(result.platform_earnings).toBe(50);
      expect(result.referrer_earnings).toBe(20);
    });

    it('should not charge fee when there is no profit', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 9500,
        fee_percent: 20,
      });

      const result = calculator.calculatePerformanceFee(input);

      expect(result.profit).toBe(0);
      expect(result.fee_amount).toBe(0);
      expect(result.developer_earnings).toBe(0);
    });

    it('should use high water mark when provided', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 10500,
        high_water_mark: 10400,
        fee_percent: 20,
      });

      const result = calculator.calculatePerformanceFee(input);

      // Only profit above high water mark: $100 (10500 - 10400)
      // Fee: $20
      expect(result.profit).toBe(100);
      expect(result.fee_amount).toBe(20);
      expect(result.new_high_water_mark).toBe(10500);
    });

    it('should update high water mark', () => {
      const input = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 11000,
        fee_percent: 20,
      });

      const result = calculator.calculatePerformanceFee(input);

      expect(result.new_high_water_mark).toBe(11000);
    });
  });

  describe('Subscription Fee Calculation', () => {
    it('should calculate subscription fee correctly', () => {
      const input = makeSubscriptionFeeInput({
        monthly_fee: 10,
        billing_period_days: 30,
      });

      const result = calculator.calculateSubscriptionFee(input);

      // Full month: $10
      expect(result.fee_amount).toBe(10);
    });

    it('should prorate subscription fee for partial month', () => {
      const input = makeSubscriptionFeeInput({
        monthly_fee: 30,
        billing_period_days: 15,
      });

      const result = calculator.calculateSubscriptionFee(input);

      // Half month: $15
      expect(result.fee_amount).toBe(15);
    });

    it('should split subscription revenue correctly', () => {
      const input = makeSubscriptionFeeInput({
        monthly_fee: 10,
        billing_period_days: 30,
        split_config: { developer_share: 70, platform_share: 30, referrer_share: 0 },
      });

      const result = calculator.calculateSubscriptionFee(input);

      // Fee: $10, Developer (70%): $7, Platform (30%): $3
      expect(result.fee_amount).toBe(10);
      expect(result.developer_earnings).toBe(7);
      expect(result.platform_earnings).toBe(3);
    });

    it('should set next billing date', () => {
      const input = makeSubscriptionFeeInput({
        billing_period_days: 30,
      });

      const result = calculator.calculateSubscriptionFee(input);

      expect(result.next_billing_date).toBeInstanceOf(Date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      expect(result.next_billing_date.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe('Hybrid Fee Calculation', () => {
    it('should calculate both performance and subscription fees', () => {
      const perfInput = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 10500,
        fee_percent: 10,
      });

      const subInput = makeSubscriptionFeeInput({
        monthly_fee: 5,
        billing_period_days: 30,
      });

      const result = calculator.calculateHybridFee(perfInput, subInput);

      // Performance fee: $500 * 10% = $50
      // Subscription fee: $5
      // Total: $55
      expect(result.performance.fee_amount).toBe(50);
      expect(result.subscription.fee_amount).toBe(5);
      expect(result.total_fee_amount).toBe(55);
    });

    it('should aggregate earnings across fee types', () => {
      const perfInput = makePerformanceFeeInput({
        initial_capital: 10000,
        portfolio_value: 11000,
        fee_percent: 10,
        split_config: { developer_share: 70, platform_share: 30, referrer_share: 0 },
      });

      const subInput = makeSubscriptionFeeInput({
        monthly_fee: 10,
        billing_period_days: 30,
        split_config: { developer_share: 70, platform_share: 30, referrer_share: 0 },
      });

      const result = calculator.calculateHybridFee(perfInput, subInput);

      // Performance: $100 fee, Developer: $70, Platform: $30
      // Subscription: $10 fee, Developer: $7, Platform: $3
      expect(result.total_developer_earnings).toBe(77);
      expect(result.total_platform_earnings).toBe(33);
    });
  });

  describe('Revenue Splitting', () => {
    it('should split revenue according to percentages', () => {
      const split = calculator.splitRevenue(100, {
        developer_share: 70,
        platform_share: 30,
        referrer_share: 0,
      });

      expect(split.developer).toBe(70);
      expect(split.platform).toBe(30);
      expect(split.referrer).toBe(0);
    });

    it('should handle three-way split correctly', () => {
      const split = calculator.splitRevenue(100, {
        developer_share: 65,
        platform_share: 25,
        referrer_share: 10,
      });

      expect(split.developer).toBe(65);
      expect(split.platform).toBe(25);
      expect(split.referrer).toBe(10);
    });

    it('should handle rounding correctly', () => {
      const split = calculator.splitRevenue(100, {
        developer_share: 33.33,
        platform_share: 33.33,
        referrer_share: 33.34,
      });

      // Total should equal original amount
      const total = split.developer + split.platform + split.referrer;
      expect(total).toBeCloseTo(100, 2);
    });
  });

  describe('Validation', () => {
    it('should validate fee percentage within range', () => {
      expect(calculator.validateFeePercent(0)).toBe(true);
      expect(calculator.validateFeePercent(20)).toBe(true);
      expect(calculator.validateFeePercent(50)).toBe(true);
      expect(calculator.validateFeePercent(51)).toBe(false);
      expect(calculator.validateFeePercent(-1)).toBe(false);
    });

    it('should validate monthly fee within range', () => {
      expect(calculator.validateMonthlyFee(0)).toBe(true);
      expect(calculator.validateMonthlyFee(100)).toBe(true);
      expect(calculator.validateMonthlyFee(1000)).toBe(true);
      expect(calculator.validateMonthlyFee(1001)).toBe(false);
      expect(calculator.validateMonthlyFee(-1)).toBe(false);
    });
  });
});

// ============================================================================
// RevenueDistributionService Tests
// ============================================================================

describe('RevenueDistributionService', () => {
  let service: DefaultRevenueDistributionService;

  beforeEach(() => {
    service = createRevenueDistributionService();
  });

  describe('Monetization Configuration', () => {
    it('should configure strategy monetization', () => {
      const monetization = service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      expect(monetization.strategy_id).toBe('strategy_001');
      expect(monetization.developer_id).toBe('developer_001');
      expect(monetization.fee_type).toBe('performance');
      expect(monetization.fee_percent).toBe(20);
      expect(monetization.enabled).toBe(true);
    });

    it('should retrieve monetization configuration', () => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'subscription',
        { monthlyFee: 15 }
      );

      const monetization = service.getStrategyMonetization('strategy_001');

      expect(monetization).not.toBeNull();
      expect(monetization!.fee_type).toBe('subscription');
      expect(monetization!.monthly_fee).toBe(15);
    });

    it('should return null for unconfigured strategy', () => {
      const monetization = service.getStrategyMonetization('unknown');
      expect(monetization).toBeNull();
    });

    it('should update monetization settings', () => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      const updated = service.updateMonetization('strategy_001', { feePercent: 25 });

      expect(updated).not.toBeNull();
      expect(updated!.fee_percent).toBe(25);
    });

    it('should disable monetization', () => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      const success = service.disableMonetization('strategy_001');
      expect(success).toBe(true);

      const monetization = service.getStrategyMonetization('strategy_001');
      expect(monetization!.enabled).toBe(false);
    });

    it('should validate fee percent on configuration', () => {
      expect(() => {
        service.configureStrategyMonetization(
          'strategy_001',
          'developer_001',
          'performance',
          { feePercent: 60 }
        );
      }).toThrow();
    });
  });

  describe('Performance Fee Processing', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );
    });

    it('should process performance fee', () => {
      const event = service.processPerformanceFee(
        'strategy_001',
        'agent_001',
        10000,
        10800
      );

      expect(event).not.toBeNull();
      expect(event!.fee_type).toBe('performance');
      expect(event!.profit).toBe(800);
      expect(event!.fee_amount).toBe(160);
    });

    it('should return null when no profit', () => {
      const event = service.processPerformanceFee(
        'strategy_001',
        'agent_001',
        10000,
        9500
      );

      expect(event).toBeNull();
    });

    it('should return null for unconfigured strategy', () => {
      const event = service.processPerformanceFee(
        'unknown_strategy',
        'agent_001',
        10000,
        10800
      );

      expect(event).toBeNull();
    });

    it('should track high water mark across calls', () => {
      // First profit
      service.processPerformanceFee('strategy_001', 'agent_001', 10000, 10800);

      // Slight decrease - no new fee (below high water mark)
      const event2 = service.processPerformanceFee(
        'strategy_001',
        'agent_001',
        10000,
        10700
      );
      expect(event2).toBeNull();

      // New profit above high water mark
      const event3 = service.processPerformanceFee(
        'strategy_001',
        'agent_001',
        10000,
        11000
      );
      // Profit above HWM: 11000 - 10800 = 200, fee: $40
      expect(event3).not.toBeNull();
      expect(event3!.profit).toBe(200);
    });
  });

  describe('Subscription Fee Processing', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_002',
        'developer_002',
        'subscription',
        { monthlyFee: 10 }
      );
    });

    it('should process subscription fee', () => {
      const event = service.processSubscriptionFee(
        'strategy_002',
        'agent_002',
        30
      );

      expect(event).not.toBeNull();
      expect(event!.fee_type).toBe('subscription');
      expect(event!.fee_amount).toBe(10);
    });

    it('should return null for strategy with only performance fee', () => {
      service.configureStrategyMonetization(
        'perf_strategy',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      const event = service.processSubscriptionFee('perf_strategy', 'agent_001');
      expect(event).toBeNull();
    });
  });

  describe('Hybrid Fee Processing', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_003',
        'developer_003',
        'hybrid',
        { feePercent: 10, monthlyFee: 5 }
      );
    });

    it('should process both fee types', () => {
      const events = service.processHybridFee(
        'strategy_003',
        'agent_003',
        10000,
        10500,
        30
      );

      expect(events.length).toBe(2);
      expect(events.some(e => e.fee_type === 'performance')).toBe(true);
      expect(events.some(e => e.fee_type === 'subscription')).toBe(true);
    });
  });

  describe('Developer Earnings', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      // Process some fees
      service.processPerformanceFee('strategy_001', 'agent_001', 10000, 10800);
      service.processPerformanceFee('strategy_001', 'agent_002', 5000, 5400);
    });

    it('should calculate total developer earnings', () => {
      const earnings = service.getDeveloperEarnings('developer_001');

      expect(earnings.developer_id).toBe('developer_001');
      expect(earnings.total_earnings).toBeGreaterThan(0);
    });

    it('should track strategies with earnings', () => {
      const earnings = service.getDeveloperEarnings('developer_001');

      expect(earnings.strategies_with_earnings).toBe(1);
    });

    it('should track agents using strategies', () => {
      const earnings = service.getDeveloperEarnings('developer_001');

      expect(earnings.total_agents_using).toBe(2);
    });

    it('should return zero earnings for unknown developer', () => {
      const earnings = service.getDeveloperEarnings('unknown');

      expect(earnings.total_earnings).toBe(0);
      expect(earnings.monthly_earnings).toBe(0);
    });
  });

  describe('Strategy Earnings', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      service.processPerformanceFee('strategy_001', 'agent_001', 10000, 10800);
    });

    it('should get strategy-specific earnings', () => {
      const earnings = service.getStrategyEarnings('strategy_001');

      expect(earnings).not.toBeNull();
      expect(earnings!.strategy_id).toBe('strategy_001');
      expect(earnings!.total_earnings).toBeGreaterThan(0);
    });

    it('should return null for unknown strategy', () => {
      const earnings = service.getStrategyEarnings('unknown');
      expect(earnings).toBeNull();
    });

    it('should track agents using the strategy', () => {
      service.processPerformanceFee('strategy_001', 'agent_002', 5000, 5200);

      const earnings = service.getStrategyEarnings('strategy_001');
      expect(earnings!.agents_using).toBe(2);
    });
  });

  describe('Revenue Metrics', () => {
    beforeEach(() => {
      service.configureStrategyMonetization('s1', 'd1', 'performance', { feePercent: 20 });
      service.configureStrategyMonetization('s2', 'd2', 'subscription', { monthlyFee: 10 });

      service.processPerformanceFee('s1', 'a1', 10000, 10800);
      service.processSubscriptionFee('s2', 'a2', 30);
    });

    it('should get strategy revenue metrics', () => {
      const metrics = service.getStrategyRevenueMetrics('s1');

      expect(metrics).not.toBeNull();
      expect(metrics!.total_revenue).toBeGreaterThan(0);
      expect(metrics!.active_agents).toBe(1);
    });

    it('should get platform-wide metrics', () => {
      const metrics = service.getPlatformMetrics();

      expect(metrics.active_monetized_strategies).toBe(2);
      expect(metrics.total_platform_revenue).toBeGreaterThan(0);
      expect(metrics.total_developer_payouts).toBeGreaterThan(0);
    });
  });

  describe('Referrer Support', () => {
    beforeEach(() => {
      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );
    });

    it('should set referrer for agent', () => {
      service.setReferrer('strategy_001', 'agent_001', 'referrer_001');

      const event = service.processPerformanceFee(
        'strategy_001',
        'agent_001',
        10000,
        11000
      );

      expect(event).not.toBeNull();
      expect(event!.referrer_id).toBe('referrer_001');
      expect(event!.referrer_earnings).toBeGreaterThan(0);
    });
  });

  describe('Events', () => {
    it('should emit events on revenue distribution', () => {
      const events: RevenueSystemEvent[] = [];
      service.onEvent(e => events.push(e));

      service.configureStrategyMonetization(
        'strategy_001',
        'developer_001',
        'performance',
        { feePercent: 20 }
      );

      service.processPerformanceFee('strategy_001', 'agent_001', 10000, 10800);

      expect(events.some(e => e.type === 'monetization_configured')).toBe(true);
      expect(events.some(e => e.type === 'revenue_distributed')).toBe(true);
      expect(events.some(e => e.type === 'earnings_updated')).toBe(true);
    });
  });
});

// ============================================================================
// RevenueApi Tests
// ============================================================================

describe('RevenueApi', () => {
  let api: RevenueApi;

  beforeEach(() => {
    api = createRevenueApi();

    // Configure test strategies
    const service = api.getRevenueService() as DefaultRevenueDistributionService;
    service.configureStrategyMonetization('api_test_1', 'dev_001', 'performance', { feePercent: 20 });
    service.configureStrategyMonetization('api_test_2', 'dev_002', 'subscription', { monthlyFee: 10 });

    // Process some fees
    service.processPerformanceFee('api_test_1', 'agent_001', 10000, 10800);
    service.processSubscriptionFee('api_test_2', 'agent_002', 30);
  });

  describe('GET /api/strategies/{id}/revenue', () => {
    it('should return strategy revenue metrics', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/api_test_1/revenue',
      });

      expect(response.status).toBe(200);
      const body = response.body as { monthly_revenue: number; total_revenue: number; active_agents: number };
      expect(body.total_revenue).toBeGreaterThan(0);
      expect(body.active_agents).toBe(1);
    });

    it('should return zero metrics for unknown strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/unknown/revenue',
      });

      expect(response.status).toBe(200);
      const body = response.body as { total_revenue: number };
      expect(body.total_revenue).toBe(0);
    });
  });

  describe('GET /api/developers/{id}/earnings', () => {
    it('should return developer earnings', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/developers/dev_001/earnings',
      });

      expect(response.status).toBe(200);
      const body = response.body as { total_earnings: number; monthly_earnings: number };
      expect(body.total_earnings).toBeGreaterThan(0);
    });
  });

  describe('GET /api/strategies/{id}/monetization', () => {
    it('should return monetization configuration', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/api_test_1/monetization',
      });

      expect(response.status).toBe(200);
      const body = response.body as { fee_type: string; fee_percent: number };
      expect(body.fee_type).toBe('performance');
      expect(body.fee_percent).toBe(20);
    });

    it('should return 404 for unconfigured strategy', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/strategies/unconfigured/monetization',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/strategies/{id}/monetization', () => {
    it('should configure new monetization', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/new_strategy/monetization',
        body: {
          developer_id: 'dev_new',
          fee_type: 'performance',
          fee_percent: 15,
        },
      });

      expect(response.status).toBe(201);
      const body = response.body as { strategy_id: string; fee_percent: number };
      expect(body.strategy_id).toBe('new_strategy');
      expect(body.fee_percent).toBe(15);
    });

    it('should reject invalid fee type', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/new_strategy/monetization',
        body: {
          developer_id: 'dev_new',
          fee_type: 'invalid',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/new_strategy/monetization',
        body: { fee_type: 'performance' },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/strategies/{id}/monetization', () => {
    it('should update monetization settings', async () => {
      const response = await api.handle({
        method: 'PUT',
        path: '/api/strategies/api_test_1/monetization',
        body: { feePercent: 25 },
      });

      expect(response.status).toBe(200);
      const body = response.body as { fee_percent: number };
      expect(body.fee_percent).toBe(25);
    });

    it('should return 404 for unconfigured strategy', async () => {
      const response = await api.handle({
        method: 'PUT',
        path: '/api/strategies/unconfigured/monetization',
        body: { feePercent: 25 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/strategies/{id}/monetization', () => {
    it('should disable monetization', async () => {
      const response = await api.handle({
        method: 'DELETE',
        path: '/api/strategies/api_test_1/monetization',
      });

      expect(response.status).toBe(200);
      const body = response.body as { success: boolean };
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/strategies/{id}/agents/{agent_id}/fee', () => {
    it('should process performance fee', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/api_test_1/agents/agent_new/fee',
        body: {
          initial_capital: 10000,
          portfolio_value: 10500,
        },
      });

      expect(response.status).toBe(201);
      const body = response.body as { fee_type: string; fee_amount: number };
      expect(body.fee_type).toBe('performance');
      expect(body.fee_amount).toBeGreaterThan(0);
    });

    it('should process subscription fee', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/api_test_2/agents/agent_new/fee',
        body: {
          billing_period_days: 30,
        },
      });

      expect(response.status).toBe(201);
      const body = response.body as { fee_type: string; fee_amount: number };
      expect(body.fee_type).toBe('subscription');
    });

    it('should return 404 for unconfigured strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/api/strategies/unconfigured/agents/agent_001/fee',
        body: { initial_capital: 10000, portfolio_value: 10500 },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/revenue/platform', () => {
    it('should return platform metrics', async () => {
      const response = await api.handle({
        method: 'GET',
        path: '/api/revenue/platform',
      });

      expect(response.status).toBe(200);
      const body = response.body as { active_monetized_strategies: number; total_platform_revenue: number };
      expect(body.active_monetized_strategies).toBe(2);
      expect(body.total_platform_revenue).toBeGreaterThan(0);
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

describe('Demo RevenueApi', () => {
  it('should create demo API with sample data', async () => {
    const api = createDemoRevenueApi();

    const response = await api.handle({
      method: 'GET',
      path: '/api/revenue/platform',
    });

    expect(response.status).toBe(200);
    const body = response.body as { active_monetized_strategies: number };
    expect(body.active_monetized_strategies).toBe(5);
  });

  it('should have populated metrics for demo strategies', async () => {
    const api = createDemoRevenueApi();

    const response = await api.handle({
      method: 'GET',
      path: '/api/strategies/momentum_v1/revenue',
    });

    expect(response.status).toBe(200);
    const body = response.body as { total_revenue: number; active_agents: number };
    expect(body.total_revenue).toBeGreaterThan(0);
    expect(body.active_agents).toBeGreaterThan(0);
  });

  it('should have developer earnings for demo developers', async () => {
    const api = createDemoRevenueApi();

    const response = await api.handle({
      method: 'GET',
      path: '/api/developers/alice_dev/earnings',
    });

    expect(response.status).toBe(200);
    const body = response.body as { total_earnings: number };
    expect(body.total_earnings).toBeGreaterThan(0);
  });
});

// ============================================================================
// Integration Test: End-to-End Workflow
// ============================================================================

describe('Integration: Strategy Revenue Workflow', () => {
  it('should demonstrate full revenue workflow', async () => {
    const api = createRevenueApi();
    const events: RevenueSystemEvent[] = [];

    api.onEvent(e => events.push(e));

    // Step 1: Developer configures monetization for their strategy
    const configResponse = await api.handle({
      method: 'POST',
      path: '/api/strategies/ai_momentum/monetization',
      body: {
        developer_id: 'alice_dev',
        fee_type: 'performance',
        fee_percent: 20,
      },
    });

    expect(configResponse.status).toBe(201);

    // Step 2: User's agent starts using the strategy and makes profit
    const feeResponse = await api.handle({
      method: 'POST',
      path: '/api/strategies/ai_momentum/agents/user_agent_001/fee',
      body: {
        initial_capital: 10000,
        portfolio_value: 10800,
      },
    });

    expect(feeResponse.status).toBe(201);
    const feeEvent = feeResponse.body as { fee_amount: number; developer_earnings: number };
    // Profit: $800, Fee (20%): $160, Developer (70%): $112
    expect(feeEvent.fee_amount).toBe(160);
    expect(feeEvent.developer_earnings).toBe(112);

    // Step 3: Another user's agent also uses the strategy
    await api.handle({
      method: 'POST',
      path: '/api/strategies/ai_momentum/agents/user_agent_002/fee',
      body: {
        initial_capital: 5000,
        portfolio_value: 5500,
      },
    });

    // Step 4: Developer checks their earnings
    const earningsResponse = await api.handle({
      method: 'GET',
      path: '/api/developers/alice_dev/earnings',
    });

    expect(earningsResponse.status).toBe(200);
    const earnings = earningsResponse.body as { total_earnings: number };
    expect(earnings.total_earnings).toBeGreaterThan(112); // At least from first agent

    // Step 5: Check strategy revenue metrics
    const metricsResponse = await api.handle({
      method: 'GET',
      path: '/api/strategies/ai_momentum/revenue',
    });

    expect(metricsResponse.status).toBe(200);
    const metrics = metricsResponse.body as { active_agents: number; total_revenue: number };
    expect(metrics.active_agents).toBe(2);
    expect(metrics.total_revenue).toBeGreaterThan(0);

    // Step 6: Verify events were emitted
    expect(events.some(e => e.type === 'monetization_configured')).toBe(true);
    expect(events.some(e => e.type === 'revenue_distributed')).toBe(true);
    expect(events.some(e => e.type === 'earnings_updated')).toBe(true);

    // Step 7: Platform operator checks overall metrics
    const platformResponse = await api.handle({
      method: 'GET',
      path: '/api/revenue/platform',
    });

    expect(platformResponse.status).toBe(200);
    const platformMetrics = platformResponse.body as { total_platform_revenue: number; total_developer_payouts: number };
    expect(platformMetrics.total_platform_revenue).toBeGreaterThan(0);
    expect(platformMetrics.total_developer_payouts).toBeGreaterThan(0);
  });

  it('should demonstrate subscription model workflow', async () => {
    const api = createRevenueApi();

    // Step 1: Configure subscription-based monetization
    await api.handle({
      method: 'POST',
      path: '/api/strategies/premium_signals/monetization',
      body: {
        developer_id: 'bob_trader',
        fee_type: 'subscription',
        monthly_fee: 15,
      },
    });

    // Step 2: Multiple agents subscribe
    for (let i = 1; i <= 5; i++) {
      await api.handle({
        method: 'POST',
        path: `/api/strategies/premium_signals/agents/subscriber_${i}/fee`,
        body: { billing_period_days: 30 },
      });
    }

    // Step 3: Check developer earnings
    const earningsResponse = await api.handle({
      method: 'GET',
      path: '/api/developers/bob_trader/earnings',
    });

    const earnings = earningsResponse.body as { total_earnings: number };
    // 5 agents x $15 x 70% = $52.50
    expect(earnings.total_earnings).toBeCloseTo(52.5, 1);
  });

  it('should demonstrate hybrid model workflow', async () => {
    const api = createRevenueApi();

    // Step 1: Configure hybrid monetization
    await api.handle({
      method: 'POST',
      path: '/api/strategies/elite_strategy/monetization',
      body: {
        developer_id: 'charlie_quant',
        fee_type: 'hybrid',
        fee_percent: 10,
        monthly_fee: 5,
      },
    });

    // Step 2: Agent uses strategy with profit
    const feeResponse = await api.handle({
      method: 'POST',
      path: '/api/strategies/elite_strategy/agents/premium_agent/fee',
      body: {
        initial_capital: 20000,
        portfolio_value: 22000,
        billing_period_days: 30,
      },
    });

    expect(feeResponse.status).toBe(201);
    // Should return array with both fee events
    const body = feeResponse.body as Array<{ fee_type: string }>;
    expect(Array.isArray(body)).toBe(true);
    expect(body.some(e => e.fee_type === 'performance')).toBe(true);
    expect(body.some(e => e.fee_type === 'subscription')).toBe(true);
  });

  it('should demonstrate referrer revenue sharing', async () => {
    const api = createRevenueApi();
    const service = api.getRevenueService() as DefaultRevenueDistributionService;

    // Step 1: Configure monetization
    service.configureStrategyMonetization(
      'referral_strategy',
      'developer_001',
      'performance',
      { feePercent: 20 }
    );

    // Step 2: Set referrer for an agent
    service.setReferrer('referral_strategy', 'referred_agent', 'referrer_user');

    // Step 3: Process fee with referrer
    const event = service.processPerformanceFee(
      'referral_strategy',
      'referred_agent',
      10000,
      11000
    );

    // Profit: $1000, Fee: $200
    // With referrer split: Developer (65%): $130, Platform (25%): $50, Referrer (10%): $20
    expect(event).not.toBeNull();
    expect(event!.referrer_id).toBe('referrer_user');
    expect(event!.referrer_earnings).toBe(20);
    expect(event!.developer_earnings).toBe(130);
    expect(event!.platform_earnings).toBe(50);
  });
});
