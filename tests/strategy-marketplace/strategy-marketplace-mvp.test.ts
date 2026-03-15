/**
 * Strategy Marketplace MVP Tests (Issue #201)
 *
 * Tests for the Strategy Marketplace MVP integration layer that connects
 * the Strategy Engine, Marketplace, and Agent Runtime.
 *
 * Covers:
 * - Built-in marketplace strategies
 * - Strategy listing and filtering
 * - Strategy deployment
 * - Agent lifecycle management
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createStrategyMarketplace,
  DefaultStrategyMarketplace,
  BUILTIN_STRATEGIES,
} from '../../core/strategies/marketplace';

import type {
  MarketplaceStrategyListing,
  MarketplaceStrategyFilter,
  DeployMarketplaceStrategyInput,
} from '../../core/strategies/marketplace';

// ============================================================================
// Built-in Strategies Tests
// ============================================================================

describe('BUILTIN_STRATEGIES', () => {
  it('should have at least 5 built-in strategies', () => {
    expect(BUILTIN_STRATEGIES.length).toBeGreaterThanOrEqual(5);
  });

  it('should have required fields for all strategies', () => {
    for (const strategy of BUILTIN_STRATEGIES) {
      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBeDefined();
      expect(strategy.description).toBeDefined();
      expect(strategy.author).toBeDefined();
      expect(strategy.category).toBeDefined();
      expect(strategy.riskLevel).toBeDefined();
      expect(strategy.supportedAssets).toBeDefined();
      expect(Array.isArray(strategy.supportedAssets)).toBe(true);
      expect(strategy.version).toBeDefined();
      expect(strategy.verified).toBeDefined();
      expect(typeof strategy.roi30d).toBe('number');
      expect(typeof strategy.winRate).toBe('number');
      expect(typeof strategy.totalTrades).toBe('number');
      expect(typeof strategy.maxDrawdown).toBe('number');
      expect(typeof strategy.sharpeRatio).toBe('number');
      expect(typeof strategy.reputationScore).toBe('number');
      expect(typeof strategy.activeUsers).toBe('number');
      expect(typeof strategy.minCapital).toBe('number');
      expect(strategy.publishedAt).toBeInstanceOf(Date);
      expect(Array.isArray(strategy.tags)).toBe(true);
    }
  });

  it('should have unique IDs for all strategies', () => {
    const ids = BUILTIN_STRATEGIES.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid categories', () => {
    const validCategories = [
      'momentum',
      'mean_reversion',
      'arbitrage',
      'grid_trading',
      'yield_farming',
      'trend_following',
      'experimental',
    ];
    for (const strategy of BUILTIN_STRATEGIES) {
      expect(validCategories).toContain(strategy.category);
    }
  });

  it('should have valid risk levels', () => {
    const validRiskLevels = ['low', 'medium', 'high'];
    for (const strategy of BUILTIN_STRATEGIES) {
      expect(validRiskLevels).toContain(strategy.riskLevel);
    }
  });

  it('should have reputation scores between 0 and 10', () => {
    for (const strategy of BUILTIN_STRATEGIES) {
      expect(strategy.reputationScore).toBeGreaterThanOrEqual(0);
      expect(strategy.reputationScore).toBeLessThanOrEqual(10);
    }
  });
});

// ============================================================================
// Strategy Marketplace Tests
// ============================================================================

describe('DefaultStrategyMarketplace', () => {
  let marketplace: DefaultStrategyMarketplace;

  beforeEach(() => {
    marketplace = createStrategyMarketplace();
  });

  describe('listStrategies', () => {
    it('should list all built-in strategies', async () => {
      const strategies = await marketplace.listStrategies();
      expect(strategies.length).toBe(BUILTIN_STRATEGIES.length);
    });

    it('should filter by category', async () => {
      const strategies = await marketplace.listStrategies({ category: 'momentum' });
      expect(strategies.every(s => s.category === 'momentum')).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should filter by risk level', async () => {
      const strategies = await marketplace.listStrategies({ riskLevel: 'low' });
      expect(strategies.every(s => s.riskLevel === 'low')).toBe(true);
    });

    it('should filter by minimum ROI', async () => {
      const strategies = await marketplace.listStrategies({ minRoi: 10 });
      expect(strategies.every(s => s.roi30d >= 10)).toBe(true);
    });

    it('should filter by maximum drawdown', async () => {
      const strategies = await marketplace.listStrategies({ maxDrawdown: 5 });
      expect(strategies.every(s => s.maxDrawdown <= 5)).toBe(true);
    });

    it('should search by name', async () => {
      const strategies = await marketplace.listStrategies({ search: 'momentum' });
      expect(strategies.length).toBeGreaterThan(0);
      expect(
        strategies.some(
          s =>
            s.name.toLowerCase().includes('momentum') ||
            s.description.toLowerCase().includes('momentum') ||
            s.tags.some(t => t.toLowerCase().includes('momentum'))
        )
      ).toBe(true);
    });

    it('should sort by ROI descending', async () => {
      const strategies = await marketplace.listStrategies({ sortBy: 'roi', sortOrder: 'desc' });
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].roi30d).toBeGreaterThanOrEqual(strategies[i].roi30d);
      }
    });

    it('should sort by Sharpe ratio', async () => {
      const strategies = await marketplace.listStrategies({ sortBy: 'sharpe', sortOrder: 'desc' });
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].sharpeRatio).toBeGreaterThanOrEqual(strategies[i].sharpeRatio);
      }
    });

    it('should sort by popularity (active users)', async () => {
      const strategies = await marketplace.listStrategies({ sortBy: 'popularity', sortOrder: 'desc' });
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].activeUsers).toBeGreaterThanOrEqual(strategies[i].activeUsers);
      }
    });

    it('should sort by newest', async () => {
      const strategies = await marketplace.listStrategies({ sortBy: 'newest', sortOrder: 'desc' });
      for (let i = 1; i < strategies.length; i++) {
        expect(strategies[i - 1].publishedAt.getTime()).toBeGreaterThanOrEqual(
          strategies[i].publishedAt.getTime()
        );
      }
    });

    it('should support pagination with limit and offset', async () => {
      const page1 = await marketplace.listStrategies({ limit: 2, offset: 0 });
      const page2 = await marketplace.listStrategies({ limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      expect(page1[0].id).not.toBe(page2[0]?.id);
    });
  });

  describe('getStrategy', () => {
    it('should return a strategy by ID', async () => {
      const strategy = await marketplace.getStrategy('momentum-trader');
      expect(strategy).not.toBeNull();
      expect(strategy!.id).toBe('momentum-trader');
      expect(strategy!.name).toBe('Momentum Trader');
    });

    it('should return null for unknown ID', async () => {
      const strategy = await marketplace.getStrategy('nonexistent-strategy');
      expect(strategy).toBeNull();
    });
  });

  describe('getTopStrategies', () => {
    it('should return top strategies by ROI', async () => {
      const top = await marketplace.getTopStrategies('roi', 3);
      expect(top.length).toBe(3);

      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].roi30d).toBeGreaterThanOrEqual(top[i].roi30d);
      }
    });

    it('should return top strategies by Sharpe ratio', async () => {
      const top = await marketplace.getTopStrategies('sharpe', 3);
      expect(top.length).toBe(3);

      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].sharpeRatio).toBeGreaterThanOrEqual(top[i].sharpeRatio);
      }
    });

    it('should return top strategies by popularity', async () => {
      const top = await marketplace.getTopStrategies('popularity', 3);
      expect(top.length).toBe(3);

      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].activeUsers).toBeGreaterThanOrEqual(top[i].activeUsers);
      }
    });
  });

  describe('deployStrategy', () => {
    it('should deploy a strategy and return agent info', async () => {
      const input: DeployMarketplaceStrategyInput = {
        strategyId: 'momentum-trader',
        userId: 'user_123',
        capitalTON: 100,
        simulationMode: true,
      };

      const agent = await marketplace.deployStrategy(input);

      expect(agent.agentId).toBeDefined();
      expect(agent.strategyId).toBe('momentum-trader');
      expect(agent.strategyName).toBe('Momentum Trader');
      expect(agent.userId).toBe('user_123');
      expect(agent.capitalAllocated).toBe(100);
      expect(agent.simulationMode).toBe(true);
      expect(agent.status).toBe('running');
      expect(agent.deployedAt).toBeInstanceOf(Date);
    });

    it('should use default agent name if not provided', async () => {
      const agent = await marketplace.deployStrategy({
        strategyId: 'yield-optimizer',
        userId: 'user_456',
        capitalTON: 200,
      });

      expect(agent.name).toBe('Yield Optimizer Agent');
    });

    it('should use custom agent name if provided', async () => {
      const agent = await marketplace.deployStrategy({
        strategyId: 'mean-reversion-pro',
        userId: 'user_789',
        capitalTON: 100,
        agentName: 'My Custom Bot',
      });

      expect(agent.name).toBe('My Custom Bot');
    });

    it('should throw error for unknown strategy', async () => {
      await expect(
        marketplace.deployStrategy({
          strategyId: 'nonexistent',
          userId: 'user_123',
          capitalTON: 100,
        })
      ).rejects.toThrow('Strategy not found');
    });

    it('should throw error for insufficient capital', async () => {
      // Yield Optimizer requires 100 TON minimum
      await expect(
        marketplace.deployStrategy({
          strategyId: 'yield-optimizer',
          userId: 'user_123',
          capitalTON: 50, // Below 100 minimum
        })
      ).rejects.toThrow('Minimum capital');
    });

    it('should increment active users after deployment', async () => {
      const before = await marketplace.getStrategy('grid-trading-bot');
      const beforeUsers = before!.activeUsers;

      await marketplace.deployStrategy({
        strategyId: 'grid-trading-bot',
        userId: 'user_test',
        capitalTON: 50,
      });

      const after = await marketplace.getStrategy('grid-trading-bot');
      expect(after!.activeUsers).toBe(beforeUsers + 1);
    });
  });

  describe('stopAgent', () => {
    it('should stop a running agent', async () => {
      const agent = await marketplace.deployStrategy({
        strategyId: 'momentum-trader',
        userId: 'user_stop_test',
        capitalTON: 100,
      });

      await marketplace.stopAgent(agent.agentId);

      const agents = await marketplace.getUserAgents('user_stop_test');
      const stoppedAgent = agents.find(a => a.agentId === agent.agentId);
      expect(stoppedAgent!.status).toBe('stopped');
    });

    it('should decrement active users after stopping', async () => {
      const agent = await marketplace.deployStrategy({
        strategyId: 'dex-arbitrage-hunter',
        userId: 'user_dec_test',
        capitalTON: 200,
      });

      const before = await marketplace.getStrategy('dex-arbitrage-hunter');
      const beforeUsers = before!.activeUsers;

      await marketplace.stopAgent(agent.agentId);

      const after = await marketplace.getStrategy('dex-arbitrage-hunter');
      expect(after!.activeUsers).toBe(beforeUsers - 1);
    });

    it('should throw error for unknown agent', async () => {
      await expect(marketplace.stopAgent('nonexistent-agent')).rejects.toThrow('Agent not found');
    });
  });

  describe('getUserAgents', () => {
    it('should return agents for a specific user', async () => {
      await marketplace.deployStrategy({
        strategyId: 'momentum-trader',
        userId: 'user_multi',
        capitalTON: 100,
      });

      await marketplace.deployStrategy({
        strategyId: 'yield-optimizer',
        userId: 'user_multi',
        capitalTON: 200,
      });

      await marketplace.deployStrategy({
        strategyId: 'grid-trading-bot',
        userId: 'other_user',
        capitalTON: 50,
      });

      const userAgents = await marketplace.getUserAgents('user_multi');
      expect(userAgents.length).toBe(2);
      expect(userAgents.every(a => a.userId === 'user_multi')).toBe(true);
    });

    it('should return empty array for user with no agents', async () => {
      const agents = await marketplace.getUserAgents('user_no_agents');
      expect(agents).toEqual([]);
    });
  });

  describe('registerStrategy', () => {
    it('should register a custom strategy', async () => {
      const customStrategy: MarketplaceStrategyListing = {
        id: 'custom-strategy',
        name: 'Custom Strategy',
        description: 'A custom trading strategy',
        author: 'CustomDev',
        authorId: 'custom_dev_001',
        category: 'experimental',
        riskLevel: 'medium',
        supportedAssets: ['TON'],
        version: '1.0.0',
        verified: false,
        roi30d: 5.0,
        winRate: 60.0,
        totalTrades: 50,
        maxDrawdown: 10.0,
        sharpeRatio: 1.0,
        reputationScore: 6.0,
        activeUsers: 10,
        minCapital: 25,
        publishedAt: new Date(),
        tags: ['custom', 'experimental'],
      };

      marketplace.registerStrategy(customStrategy);

      const found = await marketplace.getStrategy('custom-strategy');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Custom Strategy');
    });
  });

  describe('getStats', () => {
    it('should return marketplace statistics', () => {
      const stats = marketplace.getStats();

      expect(stats.totalStrategies).toBe(BUILTIN_STRATEGIES.length);
      expect(typeof stats.totalUsers).toBe('number');
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(typeof stats.topRoi).toBe('number');
      expect(stats.topRoi).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Demo Flow Test: Strategy Marketplace MVP
// ============================================================================

describe('Demo Flow: Strategy Marketplace MVP (Issue #201)', () => {
  it('should complete the full marketplace MVP flow', async () => {
    const marketplace = createStrategyMarketplace();

    // Step 1: User browses marketplace
    const allStrategies = await marketplace.listStrategies();
    expect(allStrategies.length).toBeGreaterThan(0);

    // Step 2: User filters by category and risk
    const lowRiskYield = await marketplace.listStrategies({
      category: 'yield_farming',
      riskLevel: 'low',
    });
    expect(lowRiskYield.length).toBeGreaterThan(0);
    expect(lowRiskYield.every(s => s.category === 'yield_farming' && s.riskLevel === 'low')).toBe(true);

    // Step 3: User views top performing strategies
    const topStrategies = await marketplace.getTopStrategies('roi', 3);
    expect(topStrategies.length).toBe(3);

    // Step 4: User selects a strategy to view details
    const selectedStrategy = await marketplace.getStrategy(topStrategies[0].id);
    expect(selectedStrategy).not.toBeNull();
    expect(selectedStrategy!.description).toBeDefined();
    expect(selectedStrategy!.supportedAssets.length).toBeGreaterThan(0);

    // Step 5: User deploys the strategy (simulation mode)
    const agent = await marketplace.deployStrategy({
      strategyId: selectedStrategy!.id,
      userId: 'demo_user_001',
      capitalTON: selectedStrategy!.minCapital + 50,
      simulationMode: true,
      agentName: 'Demo Trading Agent',
    });

    expect(agent.status).toBe('running');
    expect(agent.simulationMode).toBe(true);
    expect(agent.name).toBe('Demo Trading Agent');

    // Step 6: User views their deployed agents
    const userAgents = await marketplace.getUserAgents('demo_user_001');
    expect(userAgents.length).toBe(1);
    expect(userAgents[0].strategyId).toBe(selectedStrategy!.id);

    // Step 7: Strategy active users should have increased
    const updatedStrategy = await marketplace.getStrategy(selectedStrategy!.id);
    expect(updatedStrategy!.activeUsers).toBe(selectedStrategy!.activeUsers + 1);

    // Step 8: User stops the agent
    await marketplace.stopAgent(agent.agentId);

    const agentsAfterStop = await marketplace.getUserAgents('demo_user_001');
    expect(agentsAfterStop[0].status).toBe('stopped');

    // Step 9: Verify marketplace stats
    const stats = marketplace.getStats();
    expect(stats.totalStrategies).toBeGreaterThan(0);
    expect(stats.topRoi).toBeGreaterThan(0);
  });
});
