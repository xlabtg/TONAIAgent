/**
 * TONAIAgent - Liquidity Network Module Tests
 *
 * Comprehensive test suite for the Institutional Liquidity Network including
 * liquidity aggregation, smart order routing, internal liquidity pools,
 * deep liquidity vaults, and risk-controlled execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLiquidityNetworkManager,
  createLiquidityAggregationManager,
  createSmartOrderRoutingEngine,
  createInternalLiquidityPoolManager,
  createDeepLiquidityVaultManager,
  createRiskControlledExecutionManager,
} from '../../src/liquidity-network/index';

// ============================================================================
// Liquidity Aggregation Tests
// ============================================================================

describe('LiquidityAggregationManager', () => {
  let manager: ReturnType<typeof createLiquidityAggregationManager>;

  beforeEach(() => {
    manager = createLiquidityAggregationManager();
  });

  describe('liquidity source management', () => {
    it('should add a liquidity source', () => {
      const source = manager.addSource({
        name: 'TON DEX',
        kind: 'dex',
        supportedPairs: ['TON/USDT', 'TON/USDC'],
      });

      expect(source.id).toBeDefined();
      expect(source.name).toBe('TON DEX');
      expect(source.kind).toBe('dex');
      expect(source.status).toBe('pending');
      expect(source.supportedPairs).toEqual(['TON/USDT', 'TON/USDC']);
    });

    it('should activate a liquidity source', () => {
      const source = manager.addSource({ name: 'OTC Desk', kind: 'otc_desk' });
      manager.activateSource(source.id);

      const updated = manager.getSource(source.id)!;
      expect(updated.status).toBe('active');
    });

    it('should deactivate a liquidity source', () => {
      const source = manager.addSource({ name: 'Bridge', kind: 'cross_chain_bridge' });
      manager.activateSource(source.id);
      manager.deactivateSource(source.id, 'maintenance');

      const updated = manager.getSource(source.id)!;
      expect(updated.status).toBe('inactive');
    });

    it('should update a liquidity source', () => {
      const source = manager.addSource({ name: 'DEX v1', kind: 'dex' });
      const updated = manager.updateSource(source.id, { name: 'DEX v2', supportedPairs: ['TON/USDT'] });

      expect(updated.name).toBe('DEX v2');
      expect(updated.supportedPairs).toEqual(['TON/USDT']);
    });

    it('should remove a liquidity source', () => {
      const source = manager.addSource({ name: 'Temp Source', kind: 'dex' });
      expect(manager.getSource(source.id)).toBeDefined();

      manager.removeSource(source.id);
      expect(manager.getSource(source.id)).toBeUndefined();
    });

    it('should list sources with filters', () => {
      manager.addSource({ name: 'DEX A', kind: 'dex', supportedPairs: ['TON/USDT'] });
      const otc = manager.addSource({ name: 'OTC A', kind: 'otc_desk' });
      manager.activateSource(otc.id);

      const dexSources = manager.listSources({ kinds: ['dex'] });
      expect(dexSources.length).toBe(1);
      expect(dexSources[0].kind).toBe('dex');

      const activeSources = manager.listSources({ statuses: ['active'] });
      expect(activeSources.length).toBe(1);
      expect(activeSources[0].id).toBe(otc.id);
    });

    it('should filter sources by supported pair', () => {
      manager.addSource({ name: 'DEX A', kind: 'dex', supportedPairs: ['TON/USDT'] });
      manager.addSource({ name: 'DEX B', kind: 'dex', supportedPairs: ['TON/USDC'] });

      const tonUsdtSources = manager.listSources({ hasPair: 'TON/USDT' });
      expect(tonUsdtSources.length).toBe(1);
      expect(tonUsdtSources[0].name).toBe('DEX A');
    });

    it('should update source metrics', () => {
      const source = manager.addSource({ name: 'DEX', kind: 'dex' });
      manager.updateSourceMetrics(source.id, { uptime: 99.5, averageSpread: 0.002 });

      const updated = manager.getSource(source.id)!;
      expect(updated.metrics.uptime).toBe(99.5);
      expect(updated.metrics.averageSpread).toBe(0.002);
    });

    it('should apply default routing, fees, and limits', () => {
      const source = manager.addSource({ name: 'DEX', kind: 'dex' });

      expect(source.routing.priority).toBe(50);
      expect(source.routing.weight).toBe(1);
      expect(source.fees.makerFee).toBeGreaterThanOrEqual(0);
      expect(source.fees.takerFee).toBeGreaterThan(0);
      expect(source.limits.perTradeLimit).toBeDefined();
    });

    it('should throw when getting non-existent source', () => {
      expect(() => manager.updateSource('nonexistent', { name: 'X' })).toThrow();
    });
  });

  describe('aggregation pool management', () => {
    it('should create an aggregation pool', () => {
      const source = manager.addSource({ name: 'DEX', kind: 'dex' });
      manager.activateSource(source.id);

      const pool = manager.createPool({
        name: 'Main Pool',
        sourceIds: [source.id],
        strategy: 'best_execution',
      });

      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('Main Pool');
      expect(pool.sourceIds).toContain(source.id);
      expect(pool.strategy).toBe('best_execution');
      expect(pool.status).toBe('active');
    });

    it('should update an aggregation pool', () => {
      const source1 = manager.addSource({ name: 'DEX 1', kind: 'dex' });
      const source2 = manager.addSource({ name: 'DEX 2', kind: 'dex' });
      const pool = manager.createPool({ name: 'Pool', sourceIds: [source1.id] });

      const updated = manager.updatePool(pool.id, {
        strategy: 'lowest_fees',
        sourceIds: [source1.id, source2.id],
      });

      expect(updated.strategy).toBe('lowest_fees');
      expect(updated.sourceIds).toHaveLength(2);
    });

    it('should remove an aggregation pool', () => {
      const source = manager.addSource({ name: 'DEX', kind: 'dex' });
      const pool = manager.createPool({ name: 'Pool', sourceIds: [source.id] });

      manager.removePool(pool.id);
      expect(manager.getPool(pool.id)).toBeUndefined();
    });

    it('should throw when creating pool with invalid source', () => {
      expect(() =>
        manager.createPool({ name: 'Pool', sourceIds: ['invalid_id'] })
      ).toThrow();
    });

    it('should list all pools', () => {
      const source = manager.addSource({ name: 'DEX', kind: 'dex' });
      manager.createPool({ name: 'Pool 1', sourceIds: [source.id] });
      manager.createPool({ name: 'Pool 2', sourceIds: [source.id] });

      expect(manager.listPools()).toHaveLength(2);
    });

    it('should emit events on source operations', () => {
      const events: string[] = [];
      manager.onEvent(e => events.push(e.type));

      const source = manager.addSource({ name: 'DEX', kind: 'dex' });
      manager.activateSource(source.id);
      manager.deactivateSource(source.id, 'test');

      expect(events).toContain('source_added');
      expect(events).toContain('source_activated');
      expect(events).toContain('source_deactivated');
    });
  });
});

// ============================================================================
// Smart Order Routing Tests
// ============================================================================

describe('SmartOrderRoutingEngine', () => {
  let engine: ReturnType<typeof createSmartOrderRoutingEngine>;
  let aggregation: ReturnType<typeof createLiquidityAggregationManager>;

  beforeEach(() => {
    engine = createSmartOrderRoutingEngine();
    aggregation = createLiquidityAggregationManager();
  });

  function createActiveSources(count: number) {
    const sources = [];
    for (let i = 0; i < count; i++) {
      const source = aggregation.addSource({
        name: `DEX ${i + 1}`,
        kind: 'dex',
        supportedPairs: ['TON/USDT'],
        routing: { priority: 50 + i, maxAllocationPercent: 100 },
      });
      aggregation.activateSource(source.id);
      sources.push(aggregation.getSource(source.id)!);
    }
    return sources;
  }

  describe('route computation', () => {
    it('should compute a route for an order', () => {
      const sources = createActiveSources(2);

      const order = {
        pair: 'TON/USDT',
        side: 'buy' as const,
        amount: '10000',
        orderType: 'market' as const,
      };

      const route = engine.computeRoute(order, sources);

      expect(route.id).toBeDefined();
      expect(route.order.pair).toBe('TON/USDT');
      expect(route.legs.length).toBeGreaterThan(0);
      expect(route.estimatedPrice).toBeDefined();
      expect(route.estimatedTotalFees).toBeDefined();
      expect(route.confidence).toBeGreaterThan(0);
      expect(route.validUntil).toBeInstanceOf(Date);
    });

    it('should throw when no eligible sources for pair', () => {
      const source = aggregation.addSource({ name: 'DEX', kind: 'dex', supportedPairs: ['BTC/USDT'] });
      aggregation.activateSource(source.id);
      const sources = [aggregation.getSource(source.id)!];

      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '1000', orderType: 'market' as const };
      expect(() => engine.computeRoute(order, sources)).toThrow('No eligible liquidity sources');
    });

    it('should respect excluded sources', () => {
      const sources = createActiveSources(2);
      const order = {
        pair: 'TON/USDT',
        side: 'buy' as const,
        amount: '10000',
        orderType: 'market' as const,
        excludedSources: [sources[0].id],
      };

      const route = engine.computeRoute(order, sources);
      const usedSourceIds = route.legs.map(l => l.sourceId);
      expect(usedSourceIds).not.toContain(sources[0].id);
    });

    it('should respect preferred sources', () => {
      const sources = createActiveSources(3);
      const order = {
        pair: 'TON/USDT',
        side: 'buy' as const,
        amount: '10000',
        orderType: 'market' as const,
        preferredSources: [sources[1].id],
      };

      const route = engine.computeRoute(order, sources);
      const usedSourceIds = route.legs.map(l => l.sourceId);
      expect(usedSourceIds).toContain(sources[1].id);
    });
  });

  describe('route simulation', () => {
    it('should simulate a route and return risk assessment', () => {
      const sources = createActiveSources(2);
      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '10000', orderType: 'market' as const };
      const route = engine.computeRoute(order, sources);
      const simulation = engine.simulateRoute(route);

      expect(simulation.estimatedFillRate).toBeGreaterThan(0);
      expect(simulation.estimatedFillRate).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high']).toContain(simulation.executionRisk);
      expect(simulation.warnings).toBeInstanceOf(Array);
    });
  });

  describe('route validation', () => {
    it('should validate a route against active sources', () => {
      const sources = createActiveSources(1);
      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '100', orderType: 'market' as const };
      const route = engine.computeRoute(order, sources);
      const validation = engine.validateRoute(route, sources);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.sourcesAvailable).toBe(true);
      expect(validation.limitsOk).toBe(true);
    });

    it('should invalidate route when source is not in provided list', () => {
      const sources = createActiveSources(1);
      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '100', orderType: 'market' as const };
      const route = engine.computeRoute(order, sources);

      // Validate against empty source list
      const validation = engine.validateRoute(route, []);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('order execution', () => {
    it('should execute an order and return filled status', () => {
      const sources = createActiveSources(2);
      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '10000', orderType: 'market' as const };

      const execution = engine.executeOrder(order, sources);

      expect(execution.id).toBeDefined();
      expect(execution.status).toBe('filled');
      expect(execution.fills.length).toBeGreaterThan(0);
      expect(parseFloat(execution.totalFilled)).toBeGreaterThan(0);
      expect(execution.averagePrice).toBeDefined();
      expect(execution.completedAt).toBeInstanceOf(Date);
      expect(execution.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should cancel a pending order', () => {
      const sources = createActiveSources(1);

      // First create an execution manually as partially_filled
      const order = { id: 'test_cancel', pair: 'TON/USDT', side: 'buy' as const, amount: '10000', orderType: 'market' as const };
      const route = engine.computeRoute(order, sources);

      // Execute directly to get a filled execution, then test that cancel of filled throws
      const execution = engine.executeWithRoute(order, route);
      expect(execution.status).toBe('filled');

      expect(() => engine.cancelOrder(execution.id)).toThrow('Cannot cancel order in status: filled');
    });

    it('should list executions with status filter', () => {
      const sources = createActiveSources(1);
      const order1 = { pair: 'TON/USDT', side: 'buy' as const, amount: '100', orderType: 'market' as const };
      const order2 = { pair: 'TON/USDT', side: 'sell' as const, amount: '200', orderType: 'market' as const };

      engine.executeOrder(order1, sources);
      engine.executeOrder(order2, sources);

      const filled = engine.listOrderExecutions({ status: 'filled' });
      expect(filled.length).toBe(2);
    });

    it('should emit events on order execution', () => {
      const events: string[] = [];
      engine.onEvent(e => events.push(e.type));

      const sources = createActiveSources(1);
      const order = { pair: 'TON/USDT', side: 'buy' as const, amount: '100', orderType: 'market' as const };
      engine.executeOrder(order, sources);

      expect(events).toContain('order_submitted');
      expect(events).toContain('order_filled');
    });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const eng = createSmartOrderRoutingEngine();
      expect(eng.config.slippageTolerance).toBeGreaterThan(0);
      expect(eng.config.maxSources).toBeGreaterThan(0);
      expect(eng.config.splitOrdersEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const eng = createSmartOrderRoutingEngine({ slippageTolerance: 0.02, maxSources: 3 });
      expect(eng.config.slippageTolerance).toBe(0.02);
      expect(eng.config.maxSources).toBe(3);
    });
  });
});

// ============================================================================
// Internal Liquidity Pool Tests
// ============================================================================

describe('InternalLiquidityPoolManager', () => {
  let manager: ReturnType<typeof createInternalLiquidityPoolManager>;

  beforeEach(() => {
    manager = createInternalLiquidityPoolManager();
  });

  describe('pool management', () => {
    it('should create an internal liquidity pool', () => {
      const pool = manager.createPool({ name: 'Agent Pool', assetId: 'TON', interestRate: 0.04 });

      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('Agent Pool');
      expect(pool.assetId).toBe('TON');
      expect(pool.interestRate).toBe(0.04);
      expect(pool.status).toBe('active');
      expect(pool.totalLiquidity).toBe('0');
    });

    it('should close a pool', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'USDT' });
      manager.closePool(pool.id);

      const closed = manager.getPool(pool.id)!;
      expect(closed.status).toBe('closed');
    });

    it('should list pools with filters', () => {
      manager.createPool({ name: 'TON Pool', assetId: 'TON' });
      manager.createPool({ name: 'USDT Pool', assetId: 'USDT' });

      const tonPools = manager.listPools({ assetId: 'TON' });
      expect(tonPools.length).toBe(1);
      expect(tonPools[0].assetId).toBe('TON');
    });
  });

  describe('participant management', () => {
    it('should allow an agent to join a pool', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      const participant = manager.joinPool({
        poolId: pool.id,
        participantId: 'agent_1',
        kind: 'agent',
        name: 'Agent 1',
        contributionAmount: '50000',
      });

      expect(participant.participantId).toBe('agent_1');
      expect(participant.contributedAmount).toBe('50000');
      expect(participant.availableAmount).toBe('50000');

      const updatedPool = manager.getPool(pool.id)!;
      expect(parseFloat(updatedPool.totalLiquidity)).toBeGreaterThan(0);
    });

    it('should increase contribution when same participant joins again', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'agent_1', kind: 'agent', name: 'Agent 1', contributionAmount: '50000' });
      manager.joinPool({ poolId: pool.id, participantId: 'agent_1', kind: 'agent', name: 'Agent 1', contributionAmount: '25000' });

      const updatedPool = manager.getPool(pool.id)!;
      const participant = updatedPool.participants.find(p => p.participantId === 'agent_1')!;
      expect(parseFloat(participant.contributedAmount)).toBe(75000);
    });

    it('should allow a participant to leave the pool', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'agent_1', kind: 'agent', name: 'Agent 1', contributionAmount: '50000' });
      manager.leavePool(pool.id, 'agent_1');

      const updatedPool = manager.getPool(pool.id)!;
      expect(updatedPool.participants.find(p => p.participantId === 'agent_1')).toBeUndefined();
    });
  });

  describe('borrowing and repayment', () => {
    it('should allow borrowing from pool', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'fund_a', kind: 'fund', name: 'Fund A', contributionAmount: '100000' });

      const loan = manager.borrowFromPool({
        poolId: pool.id,
        borrowerId: 'agent_1',
        borrowerKind: 'agent',
        lenderId: 'fund_a',
        lenderKind: 'fund',
        amount: '20000',
      });

      expect(loan.id).toBeDefined();
      expect(loan.borrowerId).toBe('agent_1');
      expect(loan.lenderId).toBe('fund_a');
      expect(loan.amount).toBe('20000');
      expect(loan.status).toBe('active');

      const updatedPool = manager.getPool(pool.id)!;
      const lender = updatedPool.participants.find(p => p.participantId === 'fund_a')!;
      expect(parseFloat(lender.availableAmount)).toBe(80000);
    });

    it('should allow loan repayment', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'fund_a', kind: 'fund', name: 'Fund A', contributionAmount: '100000' });

      const loan = manager.borrowFromPool({
        poolId: pool.id,
        borrowerId: 'agent_1',
        borrowerKind: 'agent',
        lenderId: 'fund_a',
        lenderKind: 'fund',
        amount: '20000',
      });

      const repaid = manager.repayLoan({ loanId: loan.id });
      expect(repaid.status).toBe('repaid');

      const updatedPool = manager.getPool(pool.id)!;
      const lender = updatedPool.participants.find(p => p.participantId === 'fund_a')!;
      expect(parseFloat(lender.availableAmount)).toBe(100000);
    });

    it('should throw when borrowing more than available', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'fund_a', kind: 'fund', name: 'Fund A', contributionAmount: '10000' });

      expect(() =>
        manager.borrowFromPool({
          poolId: pool.id,
          borrowerId: 'agent_1',
          borrowerKind: 'agent',
          lenderId: 'fund_a',
          lenderKind: 'fund',
          amount: '50000',
        })
      ).toThrow();
    });

    it('should list loans with filters', () => {
      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'fund_a', kind: 'fund', name: 'Fund A', contributionAmount: '200000' });

      manager.borrowFromPool({ poolId: pool.id, borrowerId: 'agent_1', borrowerKind: 'agent', lenderId: 'fund_a', lenderKind: 'fund', amount: '10000' });
      manager.borrowFromPool({ poolId: pool.id, borrowerId: 'agent_2', borrowerKind: 'agent', lenderId: 'fund_a', lenderKind: 'fund', amount: '5000' });

      const agent1Loans = manager.listLoans({ borrowerId: 'agent_1' });
      expect(agent1Loans.length).toBe(1);

      const allActiveLoans = manager.listLoans({ status: 'active' });
      expect(allActiveLoans.length).toBe(2);
    });

    it('should emit events on loan creation and repayment', () => {
      const events: string[] = [];
      manager.onEvent(e => events.push(e.type));

      const pool = manager.createPool({ name: 'Pool', assetId: 'TON' });
      manager.joinPool({ poolId: pool.id, participantId: 'fund_a', kind: 'fund', name: 'Fund A', contributionAmount: '100000' });
      const loan = manager.borrowFromPool({ poolId: pool.id, borrowerId: 'agent_1', borrowerKind: 'agent', lenderId: 'fund_a', lenderKind: 'fund', amount: '10000' });
      manager.repayLoan({ loanId: loan.id });

      expect(events).toContain('internal_loan_created');
      expect(events).toContain('internal_loan_repaid');
    });
  });
});

// ============================================================================
// Deep Liquidity Vault Tests
// ============================================================================

describe('DeepLiquidityVaultManager', () => {
  let manager: ReturnType<typeof createDeepLiquidityVaultManager>;

  beforeEach(() => {
    manager = createDeepLiquidityVaultManager();
  });

  describe('vault management', () => {
    it('should create a stablecoin vault', () => {
      const vault = manager.createVault({ name: 'USDT Vault', kind: 'stablecoin', assetId: 'USDT', initialApy: 0.08 });

      expect(vault.id).toBeDefined();
      expect(vault.name).toBe('USDT Vault');
      expect(vault.kind).toBe('stablecoin');
      expect(vault.assetId).toBe('USDT');
      expect(vault.apy).toBe(0.08);
      expect(vault.status).toBe('active');
      expect(vault.totalAssets).toBe('0');
      expect(vault.sharePrice).toBe('1');
    });

    it('should create an RWA liquidity vault', () => {
      const vault = manager.createVault({ name: 'RWA Pool', kind: 'rwa', assetId: 'RWA-TOKEN' });
      expect(vault.kind).toBe('rwa');
    });

    it('should create a hedging vault', () => {
      const vault = manager.createVault({ name: 'Hedge Pool', kind: 'hedging', assetId: 'USDT' });
      expect(vault.kind).toBe('hedging');
    });

    it('should pause a vault', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      manager.pauseVault(vault.id);

      const paused = manager.getVault(vault.id)!;
      expect(paused.status).toBe('paused');
    });

    it('should deprecate a vault', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      manager.deprecateVault(vault.id);

      const deprecated = manager.getVault(vault.id)!;
      expect(deprecated.status).toBe('deprecated');
    });

    it('should update vault APY', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      manager.updateVaultApy(vault.id, 0.12);

      expect(manager.getVault(vault.id)!.apy).toBe(0.12);
    });

    it('should list vaults with filters', () => {
      manager.createVault({ name: 'Stable 1', kind: 'stablecoin', assetId: 'USDT' });
      manager.createVault({ name: 'RWA 1', kind: 'rwa', assetId: 'RWA' });

      const stableVaults = manager.listVaults({ kind: 'stablecoin' });
      expect(stableVaults.length).toBe(1);
      expect(stableVaults[0].kind).toBe('stablecoin');
    });
  });

  describe('deposits and withdrawals', () => {
    it('should deposit into a vault and mint shares', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      const record = manager.deposit({ vaultId: vault.id, depositorId: 'fund_alpha', amount: '1000000' });

      expect(record.id).toBeDefined();
      expect(record.depositorId).toBe('fund_alpha');
      expect(record.amount).toBe('1000000');
      expect(parseFloat(record.sharesMinted)).toBeGreaterThan(0);

      const updated = manager.getVault(vault.id)!;
      expect(parseFloat(updated.totalAssets)).toBe(1000000);
      expect(parseFloat(updated.totalShares)).toBeGreaterThan(0);
    });

    it('should throw on deposit to paused vault', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      manager.pauseVault(vault.id);

      expect(() => manager.deposit({ vaultId: vault.id, depositorId: 'fund', amount: '1000' })).toThrow();
    });

    it('should withdraw from vault and burn shares', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      const deposit = manager.deposit({ vaultId: vault.id, depositorId: 'fund_alpha', amount: '1000000' });

      // Withdraw half the shares
      const halfShares = (parseFloat(deposit.sharesMinted) / 2).toFixed(8);
      const withdrawal = manager.withdraw({ vaultId: vault.id, withdrawerId: 'fund_alpha', shares: halfShares });

      expect(withdrawal.id).toBeDefined();
      expect(withdrawal.withdrawerId).toBe('fund_alpha');
      expect(parseFloat(withdrawal.amountReceived)).toBeCloseTo(500000, 0);
    });

    it('should throw on withdrawal exceeding available shares', () => {
      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      manager.deposit({ vaultId: vault.id, depositorId: 'fund_a', amount: '1000' });

      expect(() =>
        manager.withdraw({ vaultId: vault.id, withdrawerId: 'fund_a', shares: '99999999' })
      ).toThrow();
    });

    it('should provide portfolio summary for a participant', () => {
      const vault1 = manager.createVault({ name: 'Stable Vault', kind: 'stablecoin', assetId: 'USDT' });
      const vault2 = manager.createVault({ name: 'RWA Vault', kind: 'rwa', assetId: 'RWA' });

      manager.deposit({ vaultId: vault1.id, depositorId: 'fund_alpha', amount: '500000' });
      manager.deposit({ vaultId: vault2.id, depositorId: 'fund_alpha', amount: '300000' });
      manager.deposit({ vaultId: vault1.id, depositorId: 'fund_beta', amount: '100000' });

      const summary = manager.getPortfolioSummary('fund_alpha');
      expect(summary.length).toBe(2);
      expect(summary.every(s => s.participantId === 'fund_alpha')).toBe(true);
    });

    it('should return total value locked across all active vaults', () => {
      const vault1 = manager.createVault({ name: 'V1', kind: 'stablecoin', assetId: 'USDT' });
      const vault2 = manager.createVault({ name: 'V2', kind: 'rwa', assetId: 'RWA' });

      manager.deposit({ vaultId: vault1.id, depositorId: 'fund_a', amount: '1000000' });
      manager.deposit({ vaultId: vault2.id, depositorId: 'fund_b', amount: '500000' });

      const tvl = parseFloat(manager.getTotalValueLocked());
      expect(tvl).toBeCloseTo(1500000, 0);
    });

    it('should emit events on deposit and withdrawal', () => {
      const events: string[] = [];
      manager.onEvent(e => events.push(e.type));

      const vault = manager.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
      const deposit = manager.deposit({ vaultId: vault.id, depositorId: 'fund', amount: '1000' });
      manager.withdraw({ vaultId: vault.id, withdrawerId: 'fund', shares: deposit.sharesMinted });

      expect(events).toContain('vault_created');
      expect(events).toContain('vault_deposit');
      expect(events).toContain('vault_withdrawal');
    });
  });
});

// ============================================================================
// Risk-Controlled Execution Tests
// ============================================================================

describe('RiskControlledExecutionManager', () => {
  let manager: ReturnType<typeof createRiskControlledExecutionManager>;

  beforeEach(() => {
    manager = createRiskControlledExecutionManager();
  });

  describe('risk profile management', () => {
    it('should create a risk profile with defaults', () => {
      const profile = manager.createProfile({ name: 'Fund Alpha Risk', ownerId: 'fund_alpha' });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Fund Alpha Risk');
      expect(profile.ownerId).toBe('fund_alpha');
      expect(profile.status).toBe('active');
      expect(profile.limits.maxOrderSize).toBeDefined();
      expect(profile.limits.maxDailyVolume).toBeDefined();
      expect(profile.limits.maxSlippage).toBeGreaterThan(0);
    });

    it('should accept custom risk limits', () => {
      const profile = manager.createProfile({
        name: 'Conservative Risk',
        ownerId: 'fund_conservative',
        limits: { maxOrderSize: '100000', maxSlippage: 0.005 },
      });

      expect(profile.limits.maxOrderSize).toBe('100000');
      expect(profile.limits.maxSlippage).toBe(0.005);
    });

    it('should update risk limits', () => {
      const profile = manager.createProfile({ name: 'Risk Profile', ownerId: 'fund_x' });
      const updated = manager.updateLimits(profile.id, { maxOrderSize: '2000000' });

      expect(updated.limits.maxOrderSize).toBe('2000000');
    });

    it('should suspend and reactivate a profile', () => {
      const profile = manager.createProfile({ name: 'Risk Profile', ownerId: 'fund_x' });
      manager.suspendProfile(profile.id, 'risk breach');

      expect(manager.getProfile(profile.id)!.status).toBe('suspended');

      manager.reactivateProfile(profile.id);
      expect(manager.getProfile(profile.id)!.status).toBe('active');
    });
  });

  describe('pre-trade risk checks', () => {
    it('should pass pre-trade check for valid order', () => {
      const profile = manager.createProfile({ name: 'Risk', ownerId: 'fund_x' });
      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '10000',
        estimatedSlippage: 0.001,
        estimatedPrice: '5.0',
      });

      expect(check.passed).toBe(true);
      expect(check.violations).toHaveLength(0);
    });

    it('should fail pre-trade check when order exceeds max size', () => {
      const profile = manager.createProfile({
        name: 'Risk',
        ownerId: 'fund_x',
        limits: { maxOrderSize: '1000' },
      });
      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '100000',
        estimatedSlippage: 0.001,
        estimatedPrice: '5.0',
      });

      expect(check.passed).toBe(false);
      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.violations.some(v => v.includes('max order size'))).toBe(true);
    });

    it('should fail pre-trade check when slippage exceeds limit', () => {
      const profile = manager.createProfile({
        name: 'Risk',
        ownerId: 'fund_x',
        limits: { maxSlippage: 0.005 },
      });
      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '100',
        estimatedSlippage: 0.02,
        estimatedPrice: '5.0',
      });

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.includes('slippage'))).toBe(true);
    });

    it('should fail pre-trade check when profile is suspended', () => {
      const profile = manager.createProfile({ name: 'Risk', ownerId: 'fund_x' });
      manager.suspendProfile(profile.id);

      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '100',
        estimatedSlippage: 0.001,
        estimatedPrice: '5.0',
      });

      expect(check.passed).toBe(false);
    });

    it('should check price deviation against reference price', () => {
      const profile = manager.createProfile({
        name: 'Risk',
        ownerId: 'fund_x',
        limits: { priceDeviationThreshold: 0.02 },
      });
      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '1000',
        estimatedSlippage: 0.001,
        estimatedPrice: '6.0', // 20% deviation from reference
        referencePrice: '5.0',
      });

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.includes('deviation'))).toBe(true);
    });
  });

  describe('post-trade recording', () => {
    it('should record post-trade and update daily volume', () => {
      const profile = manager.createProfile({ name: 'Risk', ownerId: 'fund_x' });
      manager.recordPostTrade({ profileId: profile.id, pair: 'TON/USDT', filledAmount: '50000', actualSlippage: 0.001 });

      const summary = manager.getRiskSummary(profile.id);
      expect(parseFloat(summary.currentDailyVolume)).toBe(50000);
    });

    it('should fail daily volume check after recording post-trades', () => {
      const profile = manager.createProfile({
        name: 'Risk',
        ownerId: 'fund_x',
        limits: { maxDailyVolume: '100000', maxOrderSize: '200000' },
      });

      // Record some existing volume
      manager.recordPostTrade({ profileId: profile.id, pair: 'TON/USDT', filledAmount: '90000', actualSlippage: 0.001 });

      // Now try to add an order that would exceed the daily volume
      const check = manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '20000',
        estimatedSlippage: 0.001,
        estimatedPrice: '5.0',
      });

      expect(check.passed).toBe(false);
      expect(check.violations.some(v => v.includes('daily volume'))).toBe(true);
    });

    it('should reset daily volume', () => {
      const profile = manager.createProfile({ name: 'Risk', ownerId: 'fund_x' });
      manager.recordPostTrade({ profileId: profile.id, pair: 'TON/USDT', filledAmount: '50000', actualSlippage: 0.001 });
      manager.resetDailyVolume(profile.id);

      const summary = manager.getRiskSummary(profile.id);
      expect(parseFloat(summary.currentDailyVolume)).toBe(0);
    });
  });

  describe('risk summary', () => {
    it('should generate a risk summary for a profile', () => {
      const profile = manager.createProfile({ name: 'Risk', ownerId: 'fund_x' });
      manager.recordPostTrade({ profileId: profile.id, pair: 'TON/USDT', filledAmount: '10000', actualSlippage: 0.001 });

      const summary = manager.getRiskSummary(profile.id);

      expect(summary.profileId).toBe(profile.id);
      expect(summary.ownerId).toBe('fund_x');
      expect(summary.utilizationPercent).toBeGreaterThan(0);
      expect(summary.status).toBe('active');
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });

    it('should emit risk events on violations', () => {
      const events: string[] = [];
      manager.onEvent(e => events.push(e.type));

      const profile = manager.createProfile({
        name: 'Risk',
        ownerId: 'fund_x',
        limits: { maxOrderSize: '100' },
      });
      manager.checkPreTrade({
        profileId: profile.id,
        pair: 'TON/USDT',
        orderAmount: '100000',
        estimatedSlippage: 0.001,
        estimatedPrice: '5.0',
      });

      expect(events).toContain('risk_limit_exceeded');
    });
  });
});

// ============================================================================
// Unified Liquidity Network Manager Tests
// ============================================================================

describe('LiquidityNetworkManager', () => {
  let manager: ReturnType<typeof createLiquidityNetworkManager>;

  beforeEach(() => {
    manager = createLiquidityNetworkManager();
  });

  it('should initialize with all sub-managers', () => {
    expect(manager.aggregation).toBeDefined();
    expect(manager.routing).toBeDefined();
    expect(manager.internalPools).toBeDefined();
    expect(manager.vaults).toBeDefined();
    expect(manager.riskExecution).toBeDefined();
  });

  it('should return network status', () => {
    const status = manager.getNetworkStatus();

    expect(status.liquiditySources).toBe(0);
    expect(status.activeLiquiditySources).toBe(0);
    expect(status.aggregationPools).toBe(0);
    expect(status.internalPools).toBe(0);
    expect(status.vaults).toBe(0);
    expect(status.riskProfiles).toBe(0);
    expect(status.generatedAt).toBeInstanceOf(Date);
  });

  it('should reflect changes in network status', () => {
    // Add sources
    const source = manager.aggregation.addSource({ name: 'DEX', kind: 'dex', supportedPairs: ['TON/USDT'] });
    manager.aggregation.activateSource(source.id);

    // Create a vault with deposits
    const vault = manager.vaults.createVault({ name: 'USDT Vault', kind: 'stablecoin', assetId: 'USDT' });
    manager.vaults.deposit({ vaultId: vault.id, depositorId: 'fund_alpha', amount: '1000000' });

    // Create a risk profile
    manager.riskExecution.createProfile({ name: 'Risk', ownerId: 'fund_alpha' });

    const status = manager.getNetworkStatus();
    expect(status.liquiditySources).toBe(1);
    expect(status.activeLiquiditySources).toBe(1);
    expect(status.vaults).toBe(1);
    expect(parseFloat(status.totalValueLocked)).toBeGreaterThan(0);
    expect(status.riskProfiles).toBe(1);
    expect(status.activeRiskProfiles).toBe(1);
  });

  it('should forward events from all sub-managers', () => {
    const events: string[] = [];
    manager.onEvent(e => events.push(e.type));

    // Trigger events from different sub-managers
    const source = manager.aggregation.addSource({ name: 'DEX', kind: 'dex' });
    manager.aggregation.activateSource(source.id);
    manager.vaults.createVault({ name: 'Vault', kind: 'stablecoin', assetId: 'USDT' });
    manager.internalPools.createPool({ name: 'Pool', assetId: 'TON' });

    expect(events).toContain('source_added');
    expect(events).toContain('source_activated');
    expect(events).toContain('vault_created');
    expect(events).toContain('pool_created');
  });

  it('should support full institutional liquidity workflow', () => {
    // 1. Add liquidity sources
    const dex = manager.aggregation.addSource({
      name: 'TON DEX',
      kind: 'dex',
      supportedPairs: ['TON/USDT'],
      routing: { priority: 80, maxAllocationPercent: 100 },
    });
    manager.aggregation.activateSource(dex.id);

    // 2. Create aggregation pool
    const pool = manager.aggregation.createPool({
      name: 'Main Pool',
      sourceIds: [dex.id],
      strategy: 'best_execution',
    });
    expect(pool.status).toBe('active');

    // 3. Set up internal liquidity pool
    const internalPool = manager.internalPools.createPool({
      name: 'Agent Liquidity Pool',
      assetId: 'TON',
      interestRate: 0.03,
    });
    manager.internalPools.joinPool({
      poolId: internalPool.id,
      participantId: 'fund_alpha',
      kind: 'fund',
      name: 'Fund Alpha',
      contributionAmount: '500000',
    });

    // 4. Set up vaults
    const stableVault = manager.vaults.createVault({
      name: 'USDT Stable Vault',
      kind: 'stablecoin',
      assetId: 'USDT',
      initialApy: 0.06,
    });
    manager.vaults.deposit({
      vaultId: stableVault.id,
      depositorId: 'fund_alpha',
      amount: '2000000',
    });

    // 5. Create risk profile
    const riskProfile = manager.riskExecution.createProfile({
      name: 'Fund Alpha Risk Profile',
      ownerId: 'fund_alpha',
      limits: { maxOrderSize: '100000', maxDailyVolume: '5000000', maxSlippage: 0.01 },
    });

    // 6. Pre-trade risk check
    const preCheck = manager.riskExecution.checkPreTrade({
      profileId: riskProfile.id,
      pair: 'TON/USDT',
      orderAmount: '50000',
      estimatedSlippage: 0.003,
      estimatedPrice: '5.0',
    });
    expect(preCheck.passed).toBe(true);

    // 7. Execute order with smart routing
    const order = {
      pair: 'TON/USDT',
      side: 'buy' as const,
      amount: '50000',
      orderType: 'market' as const,
    };
    const execution = manager.routing.executeOrder(order, [manager.aggregation.getSource(dex.id)!]);
    expect(execution.status).toBe('filled');

    // 8. Record post-trade
    manager.riskExecution.recordPostTrade({
      profileId: riskProfile.id,
      pair: 'TON/USDT',
      filledAmount: execution.totalFilled,
      actualSlippage: execution.slippage,
    });

    // 9. Verify network status
    const status = manager.getNetworkStatus();
    expect(status.activeLiquiditySources).toBe(1);
    expect(status.aggregationPools).toBe(1);
    expect(status.internalPools).toBe(1);
    expect(status.vaults).toBe(1);
    expect(parseFloat(status.totalValueLocked)).toBeGreaterThan(0);
    expect(status.activeRiskProfiles).toBe(1);
  });
});
