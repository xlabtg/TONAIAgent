/**
 * Strategy Marketplace v1 Tests (Issue #150)
 *
 * Covers:
 * - Strategy Registry: register, publish, discover, update performance, capital allocation
 * - Marketplace API: publishStrategy, listStrategies, deployStrategy, allocateCapital,
 *   updatePerformance, calculateCreatorRevenue, verifyStrategy
 * - Demo flow: publish → list → allocate → deploy → track performance
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createStrategyRegistry,
  DefaultStrategyRegistry,
  createMarketplaceAPI,
  DefaultMarketplaceAPI,
} from '../../apps/marketplace';

import type {
  RegisterStrategyInput,
  StrategyRegistryEntry,
  RegistryFilter,
  DeployStrategyInput,
  AllocateCapitalInput,
} from '../../apps/marketplace';

// ============================================================================
// Test Helpers
// ============================================================================

function makeRegisterInput(overrides: Partial<RegisterStrategyInput> = {}): RegisterStrategyInput {
  return {
    creatorId: 'creator_001',
    name: 'DeFi Yield Optimizer',
    description: 'Automated yield farming across TON DeFi protocols with risk management',
    category: 'yield_farming',
    strategyType: 'defi_yield',
    assetTypes: ['TON', 'Jetton'],
    deploymentConfig: {
      minCapital: 100,
      maxCapital: 500_000,
      protocols: ['STON.fi', 'DeDust'],
      rebalanceIntervalMinutes: 60,
      stopLossPercent: 10,
      takeProfitPercent: 30,
      maxSlippagePercent: 1,
      sandboxEnabled: true,
    },
    revenueConfig: {
      performanceFeePercent: 20,
      managementFeeAnnualPercent: 2,
      creatorSharePercent: 80,
    },
    tags: ['yield', 'defi', 'automated'],
    ...overrides,
  };
}

// ============================================================================
// Strategy Registry Tests
// ============================================================================

describe('StrategyRegistry', () => {
  let registry: DefaultStrategyRegistry;

  beforeEach(() => {
    registry = createStrategyRegistry();
  });

  describe('register', () => {
    it('should register a new strategy with valid input', async () => {
      const input = makeRegisterInput();
      const entry = await registry.register(input);

      expect(entry.id).toBeDefined();
      expect(entry.creatorId).toBe(input.creatorId);
      expect(entry.name).toBe(input.name);
      expect(entry.description).toBe(input.description);
      expect(entry.category).toBe(input.category);
      expect(entry.strategyType).toBe(input.strategyType);
      expect(entry.assetTypes).toEqual(input.assetTypes);
      expect(entry.status).toBe('draft');
      expect(entry.version).toBe('1.0.0');
    });

    it('should set default revenue config with 20% performance fee and 2% management fee', async () => {
      const input = makeRegisterInput({ revenueConfig: undefined });
      const entry = await registry.register(input);

      expect(entry.revenueConfig.performanceFeePercent).toBe(20);
      expect(entry.revenueConfig.managementFeeAnnualPercent).toBe(2);
      expect(entry.revenueConfig.creatorSharePercent).toBe(80);
      expect(entry.revenueConfig.platformSharePercent).toBe(20);
    });

    it('should initialize with empty performance metrics', async () => {
      const entry = await registry.register(makeRegisterInput());

      expect(entry.performanceMetrics.roi).toBe(0);
      expect(entry.performanceMetrics.sharpeRatio).toBe(0);
      expect(entry.performanceMetrics.maxDrawdown).toBe(0);
      expect(entry.performanceMetrics.winRate).toBe(0);
      expect(entry.performanceMetrics.historicalReturns).toHaveLength(0);
    });

    it('should initialize with empty capital allocation', async () => {
      const entry = await registry.register(makeRegisterInput());

      expect(entry.capitalAllocation.totalAUM).toBe(0);
      expect(entry.capitalAllocation.directAllocators).toBe(0);
      expect(entry.capitalAllocation.copyTraders).toBe(0);
    });

    it('should set default security info as unverified', async () => {
      const entry = await registry.register(makeRegisterInput());

      expect(entry.securityInfo.verificationLevel).toBe('unverified');
      expect(entry.securityInfo.sandboxTested).toBe(false);
      expect(entry.securityInfo.audited).toBe(false);
      expect(entry.securityInfo.verifiedCreator).toBe(false);
    });

    it('should reject input with missing creatorId', async () => {
      const input = makeRegisterInput({ creatorId: '' });
      await expect(registry.register(input)).rejects.toThrow('creatorId is required');
    });

    it('should reject input with name too short', async () => {
      const input = makeRegisterInput({ name: 'ab' });
      await expect(registry.register(input)).rejects.toThrow('name must be at least 3 characters');
    });

    it('should reject input with empty assetTypes', async () => {
      const input = makeRegisterInput({ assetTypes: [] });
      await expect(registry.register(input)).rejects.toThrow('at least one assetType is required');
    });

    it('should cap performance fee at 30%', async () => {
      const input = makeRegisterInput({
        revenueConfig: { performanceFeePercent: 50, creatorSharePercent: 80, managementFeeAnnualPercent: 2 },
      });
      const entry = await registry.register(input);
      expect(entry.revenueConfig.performanceFeePercent).toBe(30);
    });
  });

  describe('publish / unpublish', () => {
    it('should publish a draft strategy and set status to active', async () => {
      const entry = await registry.register(makeRegisterInput());
      const published = await registry.publish(entry.id);

      expect(published.status).toBe('active');
      expect(published.publishedAt).toBeDefined();
    });

    it('should reject publishing non-draft strategy', async () => {
      const entry = await registry.register(makeRegisterInput());
      await registry.publish(entry.id);

      await expect(registry.publish(entry.id)).rejects.toThrow('Cannot publish strategy in "active" status');
    });

    it('should unpublish an active strategy and set status to paused', async () => {
      const entry = await registry.register(makeRegisterInput());
      await registry.publish(entry.id);
      const paused = await registry.unpublish(entry.id);

      expect(paused.status).toBe('paused');
    });

    it('should reject unpublishing a non-active strategy', async () => {
      const entry = await registry.register(makeRegisterInput());
      await expect(registry.unpublish(entry.id)).rejects.toThrow('Can only unpublish active strategies');
    });
  });

  describe('updatePerformance', () => {
    it('should update performance metrics', async () => {
      const entry = await registry.register(makeRegisterInput());
      await registry.publish(entry.id);

      await registry.updatePerformance(entry.id, {
        roi: 25.5,
        roi30d: 8.2,
        sharpeRatio: 1.8,
        maxDrawdown: 12.3,
        winRate: 67.4,
        historicalReturnSnapshot: {
          timestamp: new Date(),
          cumulativeReturn: 25.5,
          periodReturn: 8.2,
        },
      });

      const updated = await registry.get(entry.id);
      expect(updated!.performanceMetrics.roi).toBe(25.5);
      expect(updated!.performanceMetrics.sharpeRatio).toBe(1.8);
      expect(updated!.performanceMetrics.maxDrawdown).toBe(12.3);
      expect(updated!.performanceMetrics.winRate).toBe(67.4);
      expect(updated!.performanceMetrics.historicalReturns).toHaveLength(1);
    });

    it('should accumulate historical return snapshots', async () => {
      const entry = await registry.register(makeRegisterInput());
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        await registry.updatePerformance(entry.id, {
          historicalReturnSnapshot: {
            timestamp: new Date(now + i * 86_400_000),
            cumulativeReturn: i * 2,
            periodReturn: 2,
          },
        });
      }

      const updated = await registry.get(entry.id);
      expect(updated!.performanceMetrics.historicalReturns).toHaveLength(5);
    });
  });

  describe('updateCapitalAllocation', () => {
    it('should increase AUM on allocation', async () => {
      const entry = await registry.register(makeRegisterInput());

      await registry.updateCapitalAllocation(entry.id, {
        deltaAUM: 5000,
        directAllocatorDelta: 1,
      });

      const updated = await registry.get(entry.id);
      expect(updated!.capitalAllocation.totalAUM).toBe(5000);
      expect(updated!.capitalAllocation.directAllocators).toBe(1);
    });

    it('should not let AUM go below zero', async () => {
      const entry = await registry.register(makeRegisterInput());

      await registry.updateCapitalAllocation(entry.id, { deltaAUM: -9999 });

      const updated = await registry.get(entry.id);
      expect(updated!.capitalAllocation.totalAUM).toBe(0);
    });
  });

  describe('discover', () => {
    let entryA: StrategyRegistryEntry;
    let entryB: StrategyRegistryEntry;
    let entryC: StrategyRegistryEntry;

    beforeEach(async () => {
      entryA = await registry.register(makeRegisterInput({
        name: 'DeFi Yield Optimizer',
        category: 'yield_farming',
        strategyType: 'defi_yield',
        assetTypes: ['TON'],
        tags: ['yield'],
      }));
      await registry.publish(entryA.id);
      await registry.updatePerformance(entryA.id, { roi: 30, sharpeRatio: 2.0 });

      entryB = await registry.register(makeRegisterInput({
        name: 'Cross-DEX Arbitrage Bot',
        category: 'arbitrage',
        strategyType: 'arbitrage',
        assetTypes: ['TON', 'Jetton'],
        tags: ['arb'],
      }));
      await registry.publish(entryB.id);
      await registry.updatePerformance(entryB.id, { roi: 55, sharpeRatio: 1.5 });

      entryC = await registry.register(makeRegisterInput({
        name: 'Conservative DCA',
        category: 'momentum',
        strategyType: 'dca',
        assetTypes: ['TON'],
        tags: ['dca', 'yield'],
      }));
      // entryC stays in draft
    });

    it('should return all strategies with no filter', async () => {
      const result = await registry.discover();
      expect(result.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await registry.discover({ status: ['active'] });
      expect(result.total).toBe(2);
    });

    it('should filter by category', async () => {
      const result = await registry.discover({ categories: ['arbitrage'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entryB.id);
    });

    it('should filter by strategyType', async () => {
      const result = await registry.discover({ strategyTypes: ['dca'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entryC.id);
    });

    it('should filter by assetType', async () => {
      const result = await registry.discover({ assetTypes: ['Jetton'] });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entryB.id);
    });

    it('should filter by minROI', async () => {
      const result = await registry.discover({ minROI: 40 });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entryB.id);
    });

    it('should filter by tag', async () => {
      const result = await registry.discover({ tags: ['yield'] });
      expect(result.total).toBe(2);
    });

    it('should sort by roi descending', async () => {
      const result = await registry.discover({ sortBy: 'roi', sortOrder: 'desc' });
      expect(result.entries[0].id).toBe(entryB.id); // roi=55
    });

    it('should support pagination', async () => {
      const page1 = await registry.discover({ limit: 2, offset: 0 });
      const page2 = await registry.discover({ limit: 2, offset: 2 });
      expect(page1.entries).toHaveLength(2);
      expect(page2.entries).toHaveLength(1);
    });

    it('should search by name', async () => {
      const result = await registry.discover({ search: 'arbitrage' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe(entryB.id);
    });
  });

  describe('verify', () => {
    it('should update verification level', async () => {
      const entry = await registry.register(makeRegisterInput());

      const verified = await registry.verify(entry.id, 'audited', {
        audited: true,
        auditor: 'CertiK',
        auditDate: new Date(),
        codeVerified: true,
        riskScore: 25,
      });

      expect(verified.securityInfo.verificationLevel).toBe('audited');
      expect(verified.securityInfo.audited).toBe(true);
      expect(verified.securityInfo.auditor).toBe('CertiK');
      expect(verified.securityInfo.riskScore).toBe(25);
    });
  });

  describe('deregister', () => {
    it('should remove strategy when no AUM', async () => {
      const entry = await registry.register(makeRegisterInput());
      await registry.deregister(entry.id);
      expect(await registry.get(entry.id)).toBeNull();
    });

    it('should reject deregistering strategy with active AUM', async () => {
      const entry = await registry.register(makeRegisterInput());
      await registry.updateCapitalAllocation(entry.id, { deltaAUM: 1000 });

      await expect(registry.deregister(entry.id)).rejects.toThrow('active capital allocation');
    });
  });
});

// ============================================================================
// Marketplace API Tests
// ============================================================================

describe('MarketplaceAPI', () => {
  let api: DefaultMarketplaceAPI;

  beforeEach(() => {
    api = createMarketplaceAPI({ enforceCapitalMinimum: false });
  });

  describe('publishStrategy', () => {
    it('should publish a strategy and return registry entry', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      expect(entry.id).toBeDefined();
      expect(entry.status).toBe('draft');
    });
  });

  describe('activateStrategy / deactivateStrategy', () => {
    it('should activate a draft strategy', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      const active = await api.activateStrategy(entry.id);
      expect(active.status).toBe('active');
    });

    it('should deactivate an active strategy', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);
      const paused = await api.deactivateStrategy(entry.id);
      expect(paused.status).toBe('paused');
    });
  });

  describe('listStrategies', () => {
    it('should list all strategies', async () => {
      await api.publishStrategy(makeRegisterInput({ name: 'Strategy Alpha' }));
      await api.publishStrategy(makeRegisterInput({ name: 'Strategy Beta' }));
      const result = await api.listStrategies();
      expect(result.total).toBe(2);
    });

    it('should filter by category', async () => {
      await api.publishStrategy(makeRegisterInput({ category: 'yield_farming', strategyType: 'defi_yield' }));
      await api.publishStrategy(makeRegisterInput({ category: 'arbitrage', strategyType: 'arbitrage', name: 'Arb Bot' }));

      const result = await api.listStrategies({ categories: ['arbitrage'] });
      expect(result.total).toBe(1);
    });
  });

  describe('getStrategy', () => {
    it('should return strategy by ID', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      const found = await api.getStrategy(entry.id);
      expect(found!.id).toBe(entry.id);
    });

    it('should return null for unknown ID', async () => {
      const result = await api.getStrategy('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deployStrategy', () => {
    it('should deploy a strategy as an AI agent', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      const deployInput: DeployStrategyInput = {
        strategyId: entry.id,
        userId: 'user_001',
        capitalTON: 500,
        simulationMode: true,
      };

      const agent = await api.deployStrategy(deployInput);

      expect(agent.agentId).toBeDefined();
      expect(agent.strategyId).toBe(entry.id);
      expect(agent.userId).toBe('user_001');
      expect(agent.capitalAllocated).toBe(500);
      expect(agent.simulationMode).toBe(true);
      expect(agent.status).toBe('running');
    });

    it('should reject deploying an inactive strategy', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      // status is 'draft', not 'active'

      await expect(api.deployStrategy({
        strategyId: entry.id,
        userId: 'user_001',
        capitalTON: 500,
      })).rejects.toThrow('not active');
    });

    it('should update capital allocation after deployment', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      await api.deployStrategy({
        strategyId: entry.id,
        userId: 'user_001',
        capitalTON: 1000,
      });

      const strategy = await api.getStrategy(entry.id);
      expect(strategy!.capitalAllocation.totalAUM).toBe(1000);
    });
  });

  describe('stopAgent', () => {
    it('should stop a running agent and release capital', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      const agent = await api.deployStrategy({
        strategyId: entry.id,
        userId: 'user_001',
        capitalTON: 2000,
      });

      await api.stopAgent(agent.agentId);

      const stopped = await api.getDeployedAgent(agent.agentId);
      expect(stopped!.status).toBe('stopped');

      const strategy = await api.getStrategy(entry.id);
      expect(strategy!.capitalAllocation.totalAUM).toBe(0);
    });
  });

  describe('allocateCapital', () => {
    it('should allocate capital and track allocation', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      const allocInput: AllocateCapitalInput = {
        userId: 'user_002',
        strategyId: entry.id,
        amountTON: 3000,
        allocationType: 'copy_trading',
      };

      const allocation = await api.allocateCapital(allocInput);

      expect(allocation.id).toBeDefined();
      expect(allocation.userId).toBe('user_002');
      expect(allocation.amountTON).toBe(3000);
      expect(allocation.allocationType).toBe('copy_trading');
      expect(allocation.status).toBe('active');

      const strategy = await api.getStrategy(entry.id);
      expect(strategy!.capitalAllocation.totalAUM).toBe(3000);
      expect(strategy!.capitalAllocation.copyTraders).toBe(1);
    });

    it('should reject allocating to inactive strategy', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());

      await expect(api.allocateCapital({
        userId: 'user_002',
        strategyId: entry.id,
        amountTON: 1000,
        allocationType: 'direct',
      })).rejects.toThrow('not active');
    });

    it('should reject negative allocation', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      await expect(api.allocateCapital({
        userId: 'user_002',
        strategyId: entry.id,
        amountTON: -100,
        allocationType: 'direct',
      })).rejects.toThrow('must be positive');
    });
  });

  describe('withdrawCapital', () => {
    it('should withdraw capital and update registry', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      const allocation = await api.allocateCapital({
        userId: 'user_003',
        strategyId: entry.id,
        amountTON: 4000,
        allocationType: 'fund_pool',
      });

      await api.withdrawCapital(allocation.id);

      const withdrawn = await api.getAllocation(allocation.id);
      expect(withdrawn!.status).toBe('withdrawn');

      const strategy = await api.getStrategy(entry.id);
      expect(strategy!.capitalAllocation.totalAUM).toBe(0);
      expect(strategy!.capitalAllocation.poolParticipants).toBe(0);
    });

    it('should reject withdrawing already-withdrawn allocation', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      const allocation = await api.allocateCapital({
        userId: 'user_003',
        strategyId: entry.id,
        amountTON: 1000,
        allocationType: 'direct',
      });

      await api.withdrawCapital(allocation.id);

      await expect(api.withdrawCapital(allocation.id)).rejects.toThrow('not active');
    });
  });

  describe('updatePerformance', () => {
    it('should update strategy performance metrics via API', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());

      await api.updatePerformance(entry.id, {
        roi: 42.0,
        sharpeRatio: 2.1,
        maxDrawdown: 8.5,
        winRate: 72.0,
      });

      const updated = await api.getStrategy(entry.id);
      expect(updated!.performanceMetrics.roi).toBe(42.0);
      expect(updated!.performanceMetrics.sharpeRatio).toBe(2.1);
    });
  });

  describe('calculateCreatorRevenue', () => {
    it('should calculate revenue based on AUM and performance', async () => {
      const entry = await api.publishStrategy(makeRegisterInput({
        revenueConfig: {
          performanceFeePercent: 20,
          managementFeeAnnualPercent: 2,
          creatorSharePercent: 80,
        },
      }));
      await api.activateStrategy(entry.id);

      // Allocate capital
      await api.allocateCapital({
        userId: 'investor_001',
        strategyId: entry.id,
        amountTON: 100_000,
        allocationType: 'direct',
      });

      // Simulate positive performance
      await api.updatePerformance(entry.id, { roi: 10 }); // 10% ROI

      const records = await api.calculateCreatorRevenue('creator_001', '2026-03');
      expect(records).toHaveLength(1);

      const record = records[0];
      expect(record.strategyId).toBe(entry.id);
      expect(record.performanceFees).toBeGreaterThan(0);
      expect(record.managementFees).toBeGreaterThan(0);
      expect(record.creatorShare).toBeCloseTo(record.totalRevenue * 0.8, 5);
      expect(record.platformShare).toBeCloseTo(record.totalRevenue * 0.2, 5);
    });

    it('should return zero performance fees when ROI is negative', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);

      await api.allocateCapital({
        userId: 'investor_001',
        strategyId: entry.id,
        amountTON: 50_000,
        allocationType: 'direct',
      });

      await api.updatePerformance(entry.id, { roi: -5 }); // negative ROI

      const records = await api.calculateCreatorRevenue('creator_001', '2026-03');
      expect(records[0].performanceFees).toBe(0);
    });
  });

  describe('verifyStrategy', () => {
    it('should verify a strategy and set verification level', async () => {
      const entry = await api.publishStrategy(makeRegisterInput());

      const verified = await api.verifyStrategy(entry.id, 'certified', {
        audited: true,
        auditor: 'Quantstamp',
        codeVerified: true,
        riskScore: 20,
        verifiedCreator: true,
      });

      expect(verified.securityInfo.verificationLevel).toBe('certified');
      expect(verified.securityInfo.audited).toBe(true);
      expect(verified.securityInfo.riskScore).toBe(20);
    });
  });

  describe('getTopStrategies', () => {
    it('should return top strategies sorted by metric', async () => {
      const s1 = await api.publishStrategy(makeRegisterInput({ name: 'Strategy One' }));
      const s2 = await api.publishStrategy(makeRegisterInput({ name: 'Strategy Two' }));
      const s3 = await api.publishStrategy(makeRegisterInput({ name: 'Strategy Three' }));

      await api.activateStrategy(s1.id);
      await api.activateStrategy(s2.id);
      await api.activateStrategy(s3.id);

      await api.updatePerformance(s1.id, { roi: 10 });
      await api.updatePerformance(s2.id, { roi: 30 });
      await api.updatePerformance(s3.id, { roi: 20 });

      const top = await api.getTopStrategies('roi', 3);
      expect(top[0].performanceMetrics.roi).toBe(30);
      expect(top[1].performanceMetrics.roi).toBe(20);
      expect(top[2].performanceMetrics.roi).toBe(10);
    });
  });

  describe('listUserAllocations / listStrategyAllocations', () => {
    it('should list allocations per user', async () => {
      const s1 = await api.publishStrategy(makeRegisterInput({ name: 'Strategy S1' }));
      const s2 = await api.publishStrategy(makeRegisterInput({ name: 'Strategy S2' }));
      await api.activateStrategy(s1.id);
      await api.activateStrategy(s2.id);

      await api.allocateCapital({ userId: 'userA', strategyId: s1.id, amountTON: 100, allocationType: 'direct' });
      await api.allocateCapital({ userId: 'userA', strategyId: s2.id, amountTON: 200, allocationType: 'direct' });
      await api.allocateCapital({ userId: 'userB', strategyId: s1.id, amountTON: 300, allocationType: 'copy_trading' });

      const userAAllocations = await api.listUserAllocations('userA');
      expect(userAAllocations).toHaveLength(2);

      const s1Allocations = await api.listStrategyAllocations(s1.id);
      expect(s1Allocations).toHaveLength(2);
    });
  });

  describe('events', () => {
    it('should emit events for marketplace operations', async () => {
      const events: string[] = [];
      api.onEvent(event => events.push(event.type));

      const entry = await api.publishStrategy(makeRegisterInput());
      await api.activateStrategy(entry.id);
      await api.allocateCapital({ userId: 'u1', strategyId: entry.id, amountTON: 500, allocationType: 'direct' });

      expect(events).toContain('strategy_published');
      expect(events).toContain('copy_started');
    });
  });
});

// ============================================================================
// Demo Flow Test: publish → list → allocate → deploy → track
// ============================================================================

describe('Demo Flow: Strategy Marketplace v1', () => {
  it('should complete the full marketplace demo flow', async () => {
    const api = createMarketplaceAPI({ enforceCapitalMinimum: false });

    // Step 1: Creator publishes a strategy
    const strategy = await api.publishStrategy({
      creatorId: 'creator_alice',
      name: 'AI Portfolio Manager',
      description: 'AI-driven portfolio rebalancing across TON DeFi with risk controls',
      category: 'momentum',
      strategyType: 'portfolio_management',
      assetTypes: ['TON', 'Jetton', 'LP_Token'],
      deploymentConfig: {
        minCapital: 100,
        maxCapital: 1_000_000,
        protocols: ['STON.fi', 'DeDust', 'Tonstakers'],
        rebalanceIntervalMinutes: 1440,
        stopLossPercent: 15,
        takeProfitPercent: 50,
        maxSlippagePercent: 0.5,
        sandboxEnabled: true,
      },
      revenueConfig: {
        performanceFeePercent: 20,
        managementFeeAnnualPercent: 2,
        creatorSharePercent: 80,
      },
      tags: ['ai', 'portfolio', 'automated'],
    });
    expect(strategy.status).toBe('draft');

    // Step 2: Activate to marketplace
    const active = await api.activateStrategy(strategy.id);
    expect(active.status).toBe('active');

    // Step 3: Investors discover strategy in marketplace
    const listing = await api.listStrategies({ status: ['active'], categories: ['momentum'] });
    expect(listing.total).toBe(1);
    expect(listing.entries[0].name).toBe('AI Portfolio Manager');

    // Step 4: Investor allocates capital (copy trading)
    const allocation = await api.allocateCapital({
      userId: 'investor_bob',
      strategyId: strategy.id,
      amountTON: 5000,
      allocationType: 'copy_trading',
    });
    expect(allocation.status).toBe('active');
    expect(allocation.amountTON).toBe(5000);

    // Step 5: Deploy strategy as an AI agent (simulation mode)
    const agent = await api.deployStrategy({
      strategyId: strategy.id,
      userId: 'investor_bob',
      capitalTON: 5000,
      simulationMode: true,
      agentName: 'Bob\'s AI Portfolio Agent',
    });
    expect(agent.status).toBe('running');
    expect(agent.simulationMode).toBe(true);

    // Step 6: Agent runtime updates performance metrics
    await api.updatePerformance(strategy.id, {
      roi: 12.5,
      roi30d: 4.2,
      sharpeRatio: 1.9,
      maxDrawdown: 6.8,
      winRate: 71.3,
      historicalReturnSnapshot: {
        timestamp: new Date(),
        cumulativeReturn: 12.5,
        periodReturn: 4.2,
      },
    });

    const withMetrics = await api.getStrategy(strategy.id);
    expect(withMetrics!.performanceMetrics.roi).toBe(12.5);
    expect(withMetrics!.capitalAllocation.totalAUM).toBe(10000); // allocation + deployment

    // Step 7: Calculate creator revenue
    const revenue = await api.calculateCreatorRevenue('creator_alice', '2026-03');
    expect(revenue).toHaveLength(1);
    expect(revenue[0].performanceFees).toBeGreaterThan(0);
    expect(revenue[0].creatorShare).toBeGreaterThan(0);

    // Step 8: Verify strategy (platform audits it)
    const verified = await api.verifyStrategy(strategy.id, 'audited', {
      audited: true,
      auditor: 'TON Security Labs',
      codeVerified: true,
      riskScore: 30,
    });
    expect(verified.securityInfo.verificationLevel).toBe('audited');
  });
});
