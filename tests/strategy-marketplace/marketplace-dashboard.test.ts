/**
 * Strategy Marketplace Dashboard UI Tests (Issue #216)
 *
 * Tests for the Strategy Marketplace Dashboard UI components that render
 * strategy listings, details, and charts for display in the Telegram Mini App.
 *
 * Covers:
 * - Utility functions (formatters, emoji helpers)
 * - Strategy listing renderer
 * - Strategy card renderer
 * - Strategy details renderer
 * - Performance chart renderers
 * - Review renderers
 * - Dashboard composition
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  // Utilities
  getRiskLevelEmoji,
  getRiskLevelText,
  getCategoryEmoji,
  getStarRating,
  formatPercent,
  formatCurrency,
  formatNumber,
  getAgentStatusEmoji,
  // Renderers
  renderMarketplaceListing,
  renderStrategyCard,
  renderStrategyDetails,
  renderEquityCurve,
  renderDrawdownChart,
  renderTradeDistribution,
  renderMonthlyReturns,
  renderReviews,
  renderDeployedAgents,
  renderCategories,
  renderMarketplaceStats,
  // Dashboard
  MarketplaceDashboard,
  createMarketplaceDashboard,
} from '../../src/strategy-marketplace/dashboard';

import {
  BUILTIN_STRATEGIES,
} from '../../src/strategy-marketplace';

import type {
  MarketplaceStrategyListing,
  MarketplaceDeployedAgent,
} from '../../src/strategy-marketplace';

import type {
  MarketplaceStats,
  StrategyCategoryInfo,
  StrategyReview,
} from '../../src/strategy-marketplace/types';

import type {
  StrategyPerformanceData,
} from '../../src/strategy-marketplace/api';

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('getRiskLevelEmoji', () => {
    it('should return green emoji for low risk', () => {
      expect(getRiskLevelEmoji('low')).toBe('🟢');
    });

    it('should return yellow emoji for medium risk', () => {
      expect(getRiskLevelEmoji('medium')).toBe('🟡');
    });

    it('should return red emoji for high risk', () => {
      expect(getRiskLevelEmoji('high')).toBe('🔴');
    });
  });

  describe('getRiskLevelText', () => {
    it('should capitalize risk level text', () => {
      expect(getRiskLevelText('low')).toBe('Low');
      expect(getRiskLevelText('medium')).toBe('Medium');
      expect(getRiskLevelText('high')).toBe('High');
    });
  });

  describe('getCategoryEmoji', () => {
    it('should return appropriate emoji for each category', () => {
      expect(getCategoryEmoji('momentum')).toBe('🚀');
      expect(getCategoryEmoji('mean_reversion')).toBe('🔄');
      expect(getCategoryEmoji('arbitrage')).toBe('⚡');
      expect(getCategoryEmoji('grid_trading')).toBe('📊');
      expect(getCategoryEmoji('yield_farming')).toBe('🌾');
      expect(getCategoryEmoji('trend_following')).toBe('📈');
      expect(getCategoryEmoji('experimental')).toBe('🧪');
    });
  });

  describe('getStarRating', () => {
    it('should return correct star rating', () => {
      expect(getStarRating(5)).toBe('★★★★★');
      expect(getStarRating(4)).toBe('★★★★☆');
      expect(getStarRating(3)).toBe('★★★☆☆');
      expect(getStarRating(0)).toBe('☆☆☆☆☆');
    });

    it('should handle half stars', () => {
      expect(getStarRating(4.5)).toBe('★★★★☆');
      expect(getStarRating(3.5)).toBe('★★★☆☆');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percentages with plus sign', () => {
      expect(formatPercent(5.5)).toBe('+5.5%');
      expect(formatPercent(10)).toBe('+10.0%');
    });

    it('should format negative percentages', () => {
      expect(formatPercent(-3.2)).toBe('-3.2%');
    });

    it('should format zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with dollar sign by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should support custom currency symbol', () => {
      expect(formatCurrency(500, '€')).toBe('€500.00');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with K suffix', () => {
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(10000)).toBe('10.0K');
    });

    it('should format numbers with M suffix', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
    });

    it('should return plain number for small values', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(99)).toBe('99');
    });
  });

  describe('getAgentStatusEmoji', () => {
    it('should return correct emoji for each status', () => {
      expect(getAgentStatusEmoji('running')).toBe('🟢');
      expect(getAgentStatusEmoji('paused')).toBe('🟡');
      expect(getAgentStatusEmoji('stopped')).toBe('⚫');
      expect(getAgentStatusEmoji('error')).toBe('🔴');
    });
  });
});

// ============================================================================
// Renderer Tests
// ============================================================================

describe('Renderers', () => {
  const sampleStrategy: MarketplaceStrategyListing = BUILTIN_STRATEGIES[0];

  describe('renderMarketplaceListing', () => {
    it('should render marketplace listing with header', () => {
      const output = renderMarketplaceListing(BUILTIN_STRATEGIES);

      expect(output).toContain('STRATEGY MARKETPLACE');
      expect(output).toContain('Strategy Name');
      expect(output).toContain('ROI');
      expect(output).toContain('Risk');
      expect(output).toContain('Trades');
      expect(output).toContain('Rating');
    });

    it('should include all strategies', () => {
      const output = renderMarketplaceListing(BUILTIN_STRATEGIES);

      for (const strategy of BUILTIN_STRATEGIES) {
        expect(output).toContain(strategy.name.slice(0, 18)); // Name may be truncated
      }
    });

    it('should show count summary', () => {
      const output = renderMarketplaceListing(BUILTIN_STRATEGIES);
      expect(output).toContain(`Showing ${BUILTIN_STRATEGIES.length}`);
    });
  });

  describe('renderStrategyCard', () => {
    it('should render strategy card with name and rating', () => {
      const output = renderStrategyCard(sampleStrategy);

      expect(output).toContain(sampleStrategy.name);
      expect(output).toContain('★'); // Rating stars
      expect(output).toContain('Deploy Strategy');
    });

    it('should include ROI and risk', () => {
      const output = renderStrategyCard(sampleStrategy);

      expect(output).toContain('ROI:');
      expect(output).toContain('Risk:');
    });

    it('should include trade count and users', () => {
      const output = renderStrategyCard(sampleStrategy);

      expect(output).toContain('trades');
      expect(output).toContain('users');
    });
  });

  describe('renderStrategyDetails', () => {
    it('should render strategy details with all sections', () => {
      const output = renderStrategyDetails(sampleStrategy);

      expect(output).toContain(sampleStrategy.name.toUpperCase());
      expect(output).toContain('PERFORMANCE METRICS');
      expect(output).toContain('RISK PROFILE');
      expect(output).toContain('Rating:');
    });

    it('should include author and version', () => {
      const output = renderStrategyDetails(sampleStrategy);

      expect(output).toContain(`Author: ${sampleStrategy.author}`);
      expect(output).toContain(`Version: ${sampleStrategy.version}`);
    });

    it('should include performance metrics', () => {
      const output = renderStrategyDetails(sampleStrategy);

      expect(output).toContain('30-Day ROI:');
      expect(output).toContain('Win Rate:');
      expect(output).toContain('Max Drawdown:');
      expect(output).toContain('Sharpe Ratio:');
      expect(output).toContain('Total Trades:');
    });

    it('should show verified badge for verified strategies', () => {
      const verifiedStrategy = BUILTIN_STRATEGIES.find(s => s.verified);
      if (verifiedStrategy) {
        const output = renderStrategyDetails(verifiedStrategy);
        expect(output).toContain('Verified');
      }
    });
  });

  describe('renderEquityCurve', () => {
    const samplePerformance: StrategyPerformanceData = {
      equityCurve: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        value: 10000 + i * 100 + Math.random() * 50,
      })),
      drawdownCurve: [],
      tradeDistribution: { wins: 10, losses: 5, breakeven: 2 },
      monthlyReturns: [],
      snapshots: [],
    };

    it('should render equity curve chart', () => {
      const output = renderEquityCurve(samplePerformance);

      expect(output).toContain('EQUITY CURVE');
      expect(output).toContain('Current:');
    });

    it('should handle empty data', () => {
      const output = renderEquityCurve({ ...samplePerformance, equityCurve: [] });
      expect(output).toContain('No equity data');
    });
  });

  describe('renderDrawdownChart', () => {
    const samplePerformance: StrategyPerformanceData = {
      equityCurve: [],
      drawdownCurve: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        value: -Math.random() * 5,
      })),
      tradeDistribution: { wins: 10, losses: 5, breakeven: 2 },
      monthlyReturns: [],
      snapshots: [],
    };

    it('should render drawdown chart', () => {
      const output = renderDrawdownChart(samplePerformance);

      expect(output).toContain('DRAWDOWN CHART');
      expect(output).toContain('Max Drawdown:');
    });
  });

  describe('renderTradeDistribution', () => {
    const samplePerformance: StrategyPerformanceData = {
      equityCurve: [],
      drawdownCurve: [],
      tradeDistribution: { wins: 60, losses: 30, breakeven: 10 },
      monthlyReturns: [],
      snapshots: [],
    };

    it('should render trade distribution', () => {
      const output = renderTradeDistribution(samplePerformance);

      expect(output).toContain('TRADE DISTRIBUTION');
      expect(output).toContain('Wins:');
      expect(output).toContain('Losses:');
      expect(output).toContain('Total Trades:');
    });

    it('should handle zero trades', () => {
      const emptyPerformance = {
        ...samplePerformance,
        tradeDistribution: { wins: 0, losses: 0, breakeven: 0 },
      };
      const output = renderTradeDistribution(emptyPerformance);
      expect(output).toContain('No trade data');
    });
  });

  describe('renderMonthlyReturns', () => {
    const samplePerformance: StrategyPerformanceData = {
      equityCurve: [],
      drawdownCurve: [],
      tradeDistribution: { wins: 0, losses: 0, breakeven: 0 },
      monthlyReturns: [
        { month: 'Jan', return: 5.2 },
        { month: 'Feb', return: -2.1 },
        { month: 'Mar', return: 8.3 },
      ],
      snapshots: [],
    };

    it('should render monthly returns', () => {
      const output = renderMonthlyReturns(samplePerformance);

      expect(output).toContain('MONTHLY RETURNS');
      expect(output).toContain('Jan');
      expect(output).toContain('Feb');
      expect(output).toContain('Mar');
    });
  });

  describe('renderReviews', () => {
    const sampleReviews: StrategyReview[] = [
      {
        id: 'review_1',
        strategyId: 'test',
        userId: 'user_1',
        rating: 5,
        title: 'Great strategy!',
        content: 'Works well for me.',
        verified: true,
        helpfulVotes: 10,
        createdAt: new Date(),
      },
      {
        id: 'review_2',
        strategyId: 'test',
        userId: 'user_2',
        rating: 3,
        title: 'Average',
        content: 'Could be better.',
        verified: false,
        helpfulVotes: 2,
        createdAt: new Date(),
      },
    ];

    it('should render reviews', () => {
      const output = renderReviews(sampleReviews);

      expect(output).toContain('USER REVIEWS');
      expect(output).toContain('Great strategy!');
      expect(output).toContain('Average');
    });

    it('should show verified badge', () => {
      const output = renderReviews(sampleReviews);
      expect(output).toContain('✓');
    });

    it('should handle empty reviews', () => {
      const output = renderReviews([]);
      expect(output).toContain('No reviews yet');
    });
  });

  describe('renderDeployedAgents', () => {
    const sampleAgents: MarketplaceDeployedAgent[] = [
      {
        agentId: 'agent_1',
        strategyId: 'momentum-trader',
        strategyName: 'Momentum Trader',
        userId: 'user_1',
        name: 'My Bot',
        capitalAllocated: 100,
        simulationMode: true,
        status: 'running',
        deployedAt: new Date(),
      },
    ];

    it('should render deployed agents', () => {
      const output = renderDeployedAgents(sampleAgents);

      expect(output).toContain('MY DEPLOYED AGENTS');
      expect(output).toContain('My Bot');
      expect(output).toContain('Momentum Trader');
      expect(output).toContain('100 TON');
      expect(output).toContain('Simulation');
    });

    it('should handle empty agents list', () => {
      const output = renderDeployedAgents([]);
      expect(output).toContain('No agents deployed');
    });
  });

  describe('renderCategories', () => {
    const sampleCategories: StrategyCategoryInfo[] = [
      {
        id: 'momentum',
        name: 'Momentum Trading',
        description: 'Strategies that capture price momentum',
        strategyCount: 5,
        averageRoi: 8.5,
      },
      {
        id: 'yield_farming',
        name: 'Yield Farming',
        description: 'DeFi yield optimization strategies',
        strategyCount: 3,
        averageRoi: 4.2,
      },
    ];

    it('should render categories', () => {
      const output = renderCategories(sampleCategories);

      expect(output).toContain('STRATEGY CATEGORIES');
      expect(output).toContain('Momentum Trading');
      expect(output).toContain('Yield Farming');
      expect(output).toContain('5 strategies');
      expect(output).toContain('3 strategies');
    });
  });

  describe('renderMarketplaceStats', () => {
    const sampleStats: MarketplaceStats = {
      totalStrategies: 10,
      totalActiveUsers: 2500,
      totalAUM: 1500000,
      topRoi: 15.5,
      averageRoi: 7.2,
      categoryCounts: {
        momentum: 3,
        mean_reversion: 2,
        arbitrage: 1,
        grid_trading: 1,
        yield_farming: 2,
        trend_following: 1,
        experimental: 0,
      },
    };

    it('should render marketplace stats', () => {
      const output = renderMarketplaceStats(sampleStats);

      expect(output).toContain('MARKETPLACE STATISTICS');
      expect(output).toContain('Total Strategies:');
      expect(output).toContain('10');
      expect(output).toContain('Active Users:');
      expect(output).toContain('Top ROI:');
      expect(output).toContain('Average ROI:');
    });
  });
});

// ============================================================================
// Dashboard Composition Tests
// ============================================================================

describe('MarketplaceDashboard', () => {
  let dashboard: MarketplaceDashboard;

  beforeEach(() => {
    dashboard = createMarketplaceDashboard();
  });

  describe('renderOverview', () => {
    const sampleStats: MarketplaceStats = {
      totalStrategies: 6,
      totalActiveUsers: 2000,
      totalAUM: 1000000,
      topRoi: 12.7,
      averageRoi: 6.5,
      categoryCounts: {
        momentum: 1,
        mean_reversion: 1,
        arbitrage: 1,
        grid_trading: 1,
        yield_farming: 1,
        trend_following: 1,
        experimental: 0,
      },
    };

    const sampleCategories: StrategyCategoryInfo[] = [
      {
        id: 'momentum',
        name: 'Momentum',
        description: 'Momentum strategies',
        strategyCount: 2,
        averageRoi: 8.0,
      },
    ];

    it('should render complete overview', () => {
      const output = dashboard.renderOverview(
        BUILTIN_STRATEGIES,
        sampleStats,
        sampleCategories
      );

      expect(output).toContain('MARKETPLACE STATISTICS');
      expect(output).toContain('STRATEGY MARKETPLACE');
      expect(output).toContain('TOP CATEGORIES');
    });
  });

  describe('renderStrategyPage', () => {
    const samplePerformance: StrategyPerformanceData = {
      equityCurve: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        value: 10000 + i * 100,
      })),
      drawdownCurve: Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        value: -Math.random() * 3,
      })),
      tradeDistribution: { wins: 80, losses: 35, breakeven: 9 },
      monthlyReturns: [
        { month: 'Jan', return: 4.5 },
        { month: 'Feb', return: 3.2 },
      ],
      snapshots: [],
    };

    const sampleReviews: StrategyReview[] = [
      {
        id: 'r1',
        strategyId: 'momentum-trader',
        userId: 'u1',
        rating: 5,
        title: 'Excellent!',
        content: 'Great results.',
        verified: true,
        helpfulVotes: 15,
        createdAt: new Date(),
      },
    ];

    it('should render complete strategy page', () => {
      const strategy = BUILTIN_STRATEGIES[0];
      const output = dashboard.renderStrategyPage(
        strategy,
        samplePerformance,
        sampleReviews
      );

      expect(output).toContain(strategy.name.toUpperCase());
      expect(output).toContain('PERFORMANCE METRICS');
      expect(output).toContain('EQUITY CURVE');
      expect(output).toContain('TRADE DISTRIBUTION');
      expect(output).toContain('MONTHLY RETURNS');
      expect(output).toContain('USER REVIEWS');
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  it('should create MarketplaceDashboard instance', () => {
    const dashboard = createMarketplaceDashboard();
    expect(dashboard).toBeInstanceOf(MarketplaceDashboard);
  });
});
