/**
 * Tests for the Autonomous Capital Markets Stack (ACMS)
 * Issue #125
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createACMSManager,
  DefaultACMSManager,
  DEFAULT_ACMS_CONFIG,
} from '../../research/acms';

import {
  createAssetLayerManager,
  DefaultAssetLayerManager,
} from '../../research/acms/asset-layer';

import {
  createAgentFundLayerManager,
  DefaultAgentFundLayerManager,
} from '../../research/acms/agent-fund-layer';

import {
  createLiquidityLayerManager,
  DefaultLiquidityLayerManager,
} from '../../research/acms/liquidity-layer';

import {
  createPrimeBrokerageLayerManager,
  DefaultPrimeBrokerageLayerManager,
} from '../../research/acms/prime-brokerage-layer';

import {
  createClearingSettlementLayerManager,
  DefaultClearingSettlementLayerManager,
} from '../../research/acms/clearing-settlement-layer';

import {
  createRiskStabilityLayerManager,
  DefaultRiskStabilityLayerManager,
} from '../../research/acms/risk-stability-layer';

import {
  createMonetaryTreasuryLayerManager,
  DefaultMonetaryTreasuryLayerManager,
} from '../../research/acms/monetary-treasury-layer';

import {
  createInterProtocolLayerManager,
  DefaultInterProtocolLayerManager,
} from '../../research/acms/inter-protocol-layer';

import {
  createGovernanceLayerManager,
  DefaultGovernanceLayerManager,
} from '../../research/acms/governance-layer';

// ============================================================================
// Layer 1: Asset Layer Tests
// ============================================================================

describe('AssetLayerManager', () => {
  let manager: DefaultAssetLayerManager;

  beforeEach(() => {
    manager = createAssetLayerManager();
  });

  it('should issue a new crypto asset', () => {
    const asset = manager.issueAsset({
      proposerId: 'agent_1',
      assetType: 'crypto',
      symbol: 'TON',
      name: 'The Open Network',
      chainId: 'ton',
      initialSupply: 5_000_000_000,
      metadata: { website: 'https://ton.org' },
    });
    expect(asset.id).toBeDefined();
    expect(asset.symbol).toBe('TON');
    expect(asset.type).toBe('crypto');
    expect(asset.status).toBe('active');
    expect(asset.totalSupply).toBe(5_000_000_000);
  });

  it('should issue a tokenized fund', () => {
    const fund = manager.createTokenizedFund({
      fundManagerId: 'agent_manager_1',
      name: 'TON Alpha Fund',
      symbol: 'TALF',
      chainId: 'ton',
      initialNavPerShare: 100,
      initialShares: 1_000_000,
      managementFeeRate: 0.02,
      performanceFeeRate: 0.2,
      redemptionNoticeDays: 30,
      strategyDescription: 'AI-driven arbitrage',
    });
    expect(fund.type).toBe('tokenized_fund');
    expect(fund.navPerShare).toBe(100);
    expect(fund.aum).toBe(100_000_000);
    expect(fund.managementFeeRate).toBe(0.02);
  });

  it('should create a structured product', () => {
    const product = manager.createStructuredProduct({
      issuerAgentId: 'issuer_1',
      name: 'TON Protected Note',
      symbol: 'TOPN',
      chainId: 'ton',
      underlyingAssets: ['asset_ton', 'asset_usdt'],
      maturityDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      principalProtected: true,
      targetYield: 0.12,
      riskRating: 'BBB',
      notionalAmount: 10_000_000,
    });
    expect(product.type).toBe('structured_product');
    expect(product.principalProtected).toBe(true);
    expect(product.riskRating).toBe('BBB');
    expect(product.targetYield).toBe(0.12);
  });

  it('should list and filter assets', () => {
    manager.issueAsset({ proposerId: 'a1', assetType: 'crypto', symbol: 'TON', name: 'TON', chainId: 'ton', initialSupply: 1000, metadata: {} });
    manager.issueAsset({ proposerId: 'a1', assetType: 'stablecoin', symbol: 'USDT', name: 'Tether', chainId: 'ton', initialSupply: 1000, metadata: {} });
    const allAssets = manager.listAssets();
    expect(allAssets.length).toBe(2);
    const cryptoOnly = manager.listAssets({ type: 'crypto' });
    expect(cryptoOnly.length).toBe(1);
    expect(cryptoOnly[0].symbol).toBe('TON');
  });

  it('should update asset price', () => {
    const asset = manager.issueAsset({ proposerId: 'a1', assetType: 'crypto', symbol: 'TON', name: 'TON', chainId: 'ton', initialSupply: 1000, metadata: {} });
    manager.updatePrice(asset.id, 5.0);
    const updated = manager.getAsset(asset.id);
    expect(updated?.priceUsd).toBe(5.0);
    expect(updated?.marketCapUsd).toBe(5000);
  });

  it('should delist an asset', () => {
    const asset = manager.issueAsset({ proposerId: 'a1', assetType: 'crypto', symbol: 'OLD', name: 'Old Token', chainId: 'ton', initialSupply: 100, metadata: {} });
    manager.delistAsset(asset.id);
    const delisted = manager.getAsset(asset.id);
    expect(delisted?.status).toBe('delisted');
  });

  it('should provide layer status', () => {
    manager.issueAsset({ proposerId: 'a1', assetType: 'crypto', symbol: 'TON', name: 'TON', chainId: 'ton', initialSupply: 1000, metadata: {} });
    manager.createTokenizedFund({
      fundManagerId: 'm1', name: 'Fund A', symbol: 'FA', chainId: 'ton',
      initialNavPerShare: 10, initialShares: 100000, managementFeeRate: 0.01,
      performanceFeeRate: 0.1, redemptionNoticeDays: 7, strategyDescription: 'Test',
    });
    const status = manager.getLayerStatus();
    expect(status.totalAssets).toBe(2);
    expect(status.activeAssets).toBe(2);
    expect(status.tokenizedFunds).toBe(1);
  });
});

// ============================================================================
// Layer 2: Agent & Fund Layer Tests
// ============================================================================

describe('AgentFundLayerManager', () => {
  let manager: DefaultAgentFundLayerManager;

  beforeEach(() => {
    manager = createAgentFundLayerManager();
  });

  it('should deploy a new agent', () => {
    const agent = manager.deployAgent({
      name: 'Arbitrage Bot Alpha',
      type: 'arbitrage_agent',
      allocationUsd: 1_000_000,
      maxLeverage: 3,
      strategies: ['cross-dex', 'funding-rate'],
    });
    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Arbitrage Bot Alpha');
    expect(agent.type).toBe('arbitrage_agent');
    expect(agent.status).toBe('active');
    expect(agent.maxLeverage).toBe(3);
  });

  it('should suspend and resume an agent', () => {
    const agent = manager.deployAgent({ name: 'Agent A', type: 'strategy_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });
    manager.suspendAgent(agent.id, 'risk limit breach');
    expect(manager.getAgent(agent.id)?.status).toBe('suspended');
    manager.resumeAgent(agent.id);
    expect(manager.getAgent(agent.id)?.status).toBe('active');
  });

  it('should terminate an agent', () => {
    const agent = manager.deployAgent({ name: 'Agent B', type: 'strategy_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });
    manager.terminateAgent(agent.id);
    expect(manager.getAgent(agent.id)?.status).toBe('terminated');
  });

  it('should create a fund and add agents', () => {
    const managerAgent = manager.deployAgent({ name: 'Fund Manager', type: 'hedge_fund', allocationUsd: 0, maxLeverage: 1, strategies: [] });
    const fund = manager.createFund({
      name: 'AI Quant Fund',
      fundType: 'hedge_fund',
      managerAgentId: managerAgent.id,
      initialAum: 50_000_000,
      initialNavPerShare: 100,
      targetReturn: 0.3,
    });
    expect(fund.id).toBeDefined();
    expect(fund.totalAum).toBe(50_000_000);
    expect(fund.status).toBe('open');

    const agent = manager.deployAgent({ name: 'Agent C', type: 'strategy_agent', allocationUsd: 5000000, maxLeverage: 2, strategies: [] });
    manager.addAgentToFund(fund.id, agent.id);
    const updatedFund = manager.getFund(fund.id);
    expect(updatedFund?.agentIds).toContain(agent.id);
  });

  it('should filter agents by type and status', () => {
    manager.deployAgent({ name: 'A1', type: 'arbitrage_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });
    manager.deployAgent({ name: 'A2', type: 'strategy_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });
    manager.deployAgent({ name: 'A3', type: 'arbitrage_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });

    const arbitrageAgents = manager.listAgents({ type: 'arbitrage_agent' });
    expect(arbitrageAgents.length).toBe(2);
    const activeAgents = manager.listAgents({ status: 'active' });
    expect(activeAgents.length).toBe(3);
  });

  it('should update fund NAV', () => {
    const managerAgent = manager.deployAgent({ name: 'FM', type: 'hedge_fund', allocationUsd: 0, maxLeverage: 1, strategies: [] });
    const fund = manager.createFund({ name: 'Fund', fundType: 'hedge_fund', managerAgentId: managerAgent.id, initialAum: 10_000_000, initialNavPerShare: 100, targetReturn: 0.15 });
    manager.updateFundNAV(fund.id, 115, 0.15);
    const updated = manager.getFund(fund.id);
    expect(updated?.navPerShare).toBe(115);
    expect(updated?.actualReturn).toBe(0.15);
  });

  it('should provide layer status', () => {
    const mgr = manager.deployAgent({ name: 'FM', type: 'hedge_fund', allocationUsd: 0, maxLeverage: 1, strategies: [] });
    manager.createFund({ name: 'F1', fundType: 'hedge_fund', managerAgentId: mgr.id, initialAum: 10_000_000, initialNavPerShare: 100, targetReturn: 0.1 });
    manager.deployAgent({ name: 'A1', type: 'strategy_agent', allocationUsd: 1_000_000, maxLeverage: 2, strategies: [] });
    const status = manager.getLayerStatus();
    expect(status.totalAgents).toBe(2);
    expect(status.totalFunds).toBe(1);
  });
});

// ============================================================================
// Layer 3: Liquidity Layer Tests
// ============================================================================

describe('LiquidityLayerManager', () => {
  let manager: DefaultLiquidityLayerManager;

  beforeEach(() => {
    manager = createLiquidityLayerManager();
  });

  it('should register a liquidity source', () => {
    const source = manager.registerSource({
      type: 'dex_onchain',
      name: 'TON DEX',
      chainId: 'ton',
      tvlUsd: 100_000_000,
      dailyVolumeUsd: 10_000_000,
      feeBps: 30,
      latencyMs: 200,
    });
    expect(source.id).toBeDefined();
    expect(source.name).toBe('TON DEX');
    expect(source.isActive).toBe(true);
    expect(source.feeBps).toBe(30);
  });

  it('should create a liquidity pool', () => {
    const pool = manager.createPool({
      name: 'TON/USDT Pool',
      assetIds: ['TON', 'USDT'],
      initialTvlUsd: 5_000_000,
      targetApy: 0.12,
    });
    expect(pool.id).toBeDefined();
    expect(pool.tvlUsd).toBe(5_000_000);
    expect(pool.assetIds).toEqual(['TON', 'USDT']);
  });

  it('should add and remove liquidity from pool', () => {
    const pool = manager.createPool({ name: 'Test Pool', assetIds: ['TON'], initialTvlUsd: 1_000_000, targetApy: 0.1 });
    manager.addLiquidityToPool(pool.id, 500_000);
    expect(manager.getPool(pool.id)?.tvlUsd).toBe(1_500_000);
    manager.removeLiquidityFromPool(pool.id, 200_000);
    expect(manager.getPool(pool.id)?.tvlUsd).toBe(1_300_000);
  });

  it('should route an order with smart order routing', () => {
    manager.registerSource({ type: 'dex_onchain', name: 'DEX1', chainId: 'ton', tvlUsd: 50_000_000, dailyVolumeUsd: 5_000_000, feeBps: 30, latencyMs: 200 });
    manager.registerSource({ type: 'otc_desk', name: 'OTC1', chainId: 'ton', tvlUsd: 100_000_000, dailyVolumeUsd: 20_000_000, feeBps: 10, latencyMs: 50 });

    const route = manager.routeOrder({
      assetIn: 'TON',
      assetOut: 'USDT',
      amountIn: 100_000,
      orderType: 'market',
      side: 'sell',
      maxSlippageBps: 50,
    });
    expect(route.id).toBeDefined();
    expect(route.assetIn).toBe('TON');
    expect(route.amountIn).toBe(100_000);
    expect(route.routeSegments.length).toBeGreaterThan(0);
    expect(route.totalFeeBps).toBeGreaterThan(0);
  });

  it('should execute a route', () => {
    manager.registerSource({ type: 'dex_onchain', name: 'DEX1', chainId: 'ton', tvlUsd: 50_000_000, dailyVolumeUsd: 5_000_000, feeBps: 30, latencyMs: 200 });
    const route = manager.routeOrder({ assetIn: 'TON', assetOut: 'USDT', amountIn: 10000, orderType: 'market', side: 'sell', maxSlippageBps: 100 });
    const result = manager.executeRoute(route.id);
    expect(result.executed).toBe(true);
    expect(result.executedAmountIn).toBe(10000);
    expect(result.executedAmountOut).toBeGreaterThan(0);
  });

  it('should filter sources', () => {
    manager.registerSource({ type: 'dex_onchain', name: 'DEX1', chainId: 'ton', tvlUsd: 50_000_000, dailyVolumeUsd: 5_000_000, feeBps: 30, latencyMs: 200 });
    manager.registerSource({ type: 'otc_desk', name: 'OTC1', chainId: 'ethereum', tvlUsd: 100_000_000, dailyVolumeUsd: 20_000_000, feeBps: 10, latencyMs: 50 });
    const tonSources = manager.listSources({ chainId: 'ton' });
    expect(tonSources.length).toBe(1);
    expect(tonSources[0].name).toBe('DEX1');
  });

  it('should provide layer status', () => {
    manager.registerSource({ type: 'dex_onchain', name: 'DEX1', chainId: 'ton', tvlUsd: 50_000_000, dailyVolumeUsd: 5_000_000, feeBps: 30, latencyMs: 200 });
    manager.createPool({ name: 'Pool1', assetIds: ['TON'], initialTvlUsd: 1_000_000, targetApy: 0.1 });
    const status = manager.getLayerStatus();
    expect(status.totalSources).toBe(1);
    expect(status.liquidityPools).toBe(1);
    expect(status.totalTvlUsd).toBe(50_000_000);
  });
});

// ============================================================================
// Layer 4: Prime Brokerage Layer Tests
// ============================================================================

describe('PrimeBrokerageLayerManager', () => {
  let manager: DefaultPrimeBrokerageLayerManager;

  beforeEach(() => {
    manager = createPrimeBrokerageLayerManager();
  });

  it('should create a capital pool', () => {
    const pool = manager.createCapitalPool('Institutional Pool Alpha', 100_000_000);
    expect(pool.id).toBeDefined();
    expect(pool.name).toBe('Institutional Pool Alpha');
    expect(pool.totalCapital).toBe(100_000_000);
    expect(pool.availableCapital).toBe(100_000_000);
  });

  it('should allocate funds to a pool', () => {
    const pool = manager.createCapitalPool('Main Pool', 100_000_000);
    manager.allocateFundToPool(pool.id, 'fund_1', 'Alpha Fund', 40_000_000, 2.5);
    const updated = manager.getCapitalPool(pool.id);
    expect(updated?.allocatedCapital).toBe(40_000_000);
    expect(updated?.availableCapital).toBe(60_000_000);
    expect(updated?.fundAllocations).toHaveLength(1);
    expect(updated?.utilizationRate).toBeCloseTo(0.4);
  });

  it('should create and update a margin account', () => {
    const account = manager.createMarginAccount('agent_1', 'agent');
    expect(account.id).toBeDefined();
    expect(account.status).toBe('healthy');
    const updated = manager.updateMarginAccount(account.id, {
      totalEquity: 1_000_000,
      usedMargin: 500_000,
      leverage: 2.0,
    });
    expect(updated.totalEquity).toBe(1_000_000);
    expect(updated.availableMargin).toBe(500_000);
    expect(updated.status).toBe('healthy');
  });

  it('should trigger margin call when utilization is high', () => {
    const account = manager.createMarginAccount('agent_2', 'agent');
    manager.updateMarginAccount(account.id, { totalEquity: 1_000_000, usedMargin: 850_000, leverage: 5 });
    const result = manager.issueMarginCall(account.id);
    expect(result.newStatus).toBe('margin_call');
    expect(result.requiredDepositUsd).toBeGreaterThan(0);
    expect(result.deadline).toBeDefined();
  });

  it('should deposit and withdraw collateral', () => {
    const receipt = manager.depositCollateral('agent_1', 'TON', 10000, 35000);
    expect(receipt.id).toBeDefined();
    expect(receipt.amount).toBe(10000);
    expect(receipt.valueUsd).toBe(35000);
    manager.withdrawCollateral(receipt.id, 5000);
    const receipts = manager.listMarginAccounts(); // just testing no error
    expect(receipts).toBeDefined();
  });

  it('should compute net exposure', () => {
    manager.depositCollateral('agent_1', 'TON', 10000, 35000);
    const margin = manager.createMarginAccount('agent_1', 'agent');
    manager.updateMarginAccount(margin.id, { totalEquity: 35000, usedMargin: 20000, leverage: 2 });
    const exposure = manager.getNetExposure('agent_1');
    expect(exposure.agentId).toBe('agent_1');
    expect(exposure.grossExposureUsd).toBe(20000);
  });

  it('should provide layer status', () => {
    manager.createCapitalPool('Pool A', 50_000_000);
    manager.createMarginAccount('agent_1', 'agent');
    const status = manager.getLayerStatus();
    expect(status.capitalPools).toBe(1);
    expect(status.marginAccounts).toBe(1);
    expect(status.totalPooledCapitalUsd).toBe(50_000_000);
  });
});

// ============================================================================
// Layer 5: Clearing & Settlement Layer Tests
// ============================================================================

describe('ClearingSettlementLayerManager', () => {
  let manager: DefaultClearingSettlementLayerManager;

  beforeEach(() => {
    manager = createClearingSettlementLayerManager();
  });

  it('should submit a trade for clearing', () => {
    const entry = manager.submitTrade({
      tradeId: 'trade_001',
      buyerId: 'buyer_1',
      sellerId: 'seller_1',
      assetId: 'TON',
      quantity: 10000,
      priceUsd: 3.5,
    });
    expect(entry.id).toBeDefined();
    expect(entry.status).toBe('pending');
    expect(entry.grossValueUsd).toBe(35000);
    expect(entry.settlementMethod).toBe('dvp');
  });

  it('should process multilateral netting', () => {
    manager.submitTrade({ tradeId: 't1', buyerId: 'participant_1', sellerId: 'participant_2', assetId: 'TON', quantity: 1000, priceUsd: 3.5 });
    manager.submitTrade({ tradeId: 't2', buyerId: 'participant_3', sellerId: 'participant_1', assetId: 'TON', quantity: 800, priceUsd: 3.5 });
    const result = manager.processNetting('participant_1');
    expect(result.participantId).toBe('participant_1');
    expect(result.grossBuyValueUsd).toBe(3500);
    expect(result.grossSellValueUsd).toBe(2800);
    expect(result.nettingEfficiencyPercent).toBeGreaterThan(0);
  });

  it('should settle a clearing entry', () => {
    const entry = manager.submitTrade({ tradeId: 't1', buyerId: 'b1', sellerId: 's1', assetId: 'TON', quantity: 100, priceUsd: 3.5 });
    manager.settleEntry(entry.id);
    const settled = manager.getClearingEntry(entry.id);
    expect(settled?.status).toBe('settled');
    expect(settled?.actualSettlementDate).toBeDefined();
  });

  it('should manage collateral pools', () => {
    const pool = manager.createCollateralPool('participant_1', 'TON', 1_000_000);
    expect(pool.id).toBeDefined();
    expect(pool.totalValueUsd).toBe(1_000_000);
    manager.lockCollateral(pool.id, 300_000, 'margin');
    const updated = manager.getCollateralPool(pool.id);
    expect(updated?.lockedValueUsd).toBe(300_000);
    expect(updated?.availableValueUsd).toBe(700_000);
    manager.releaseCollateral(pool.id, 100_000);
    const released = manager.getCollateralPool(pool.id);
    expect(released?.lockedValueUsd).toBe(200_000);
  });

  it('should resolve a default', () => {
    manager.createCollateralPool('defaulter_1', 'TON', 500_000);
    const plan = manager.resolveDefault('defaulter_1', 600_000);
    expect(plan.defaultedParticipantId).toBe('defaulter_1');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(['fully_covered', 'partially_covered', 'not_covered']).toContain(plan.resolution);
  });

  it('should manage insurance fund', () => {
    const initial = manager.getInsuranceFundBalance();
    expect(initial).toBeGreaterThan(0);
    manager.addToInsuranceFund(500_000);
    expect(manager.getInsuranceFundBalance()).toBe(initial + 500_000);
  });

  it('should filter clearing entries by status', () => {
    const e1 = manager.submitTrade({ tradeId: 't1', buyerId: 'b1', sellerId: 's1', assetId: 'TON', quantity: 100, priceUsd: 3.5 });
    manager.submitTrade({ tradeId: 't2', buyerId: 'b2', sellerId: 's2', assetId: 'USDT', quantity: 200, priceUsd: 1.0 });
    manager.settleEntry(e1.id);
    const pending = manager.listClearingEntries({ status: 'pending' });
    expect(pending.length).toBe(1);
    const settled = manager.listClearingEntries({ status: 'settled' });
    expect(settled.length).toBe(1);
  });

  it('should provide layer status', () => {
    manager.submitTrade({ tradeId: 't1', buyerId: 'b1', sellerId: 's1', assetId: 'TON', quantity: 1000, priceUsd: 3.5 });
    manager.createCollateralPool('p1', 'TON', 5_000_000);
    const status = manager.getLayerStatus();
    expect(status.pendingEntries).toBe(1);
    expect(status.collateralPoolsCount).toBe(1);
    expect(status.insuranceFundUsd).toBeGreaterThan(0);
  });
});

// ============================================================================
// Layer 6: Risk & Stability Layer Tests
// ============================================================================

describe('RiskStabilityLayerManager', () => {
  let manager: DefaultRiskStabilityLayerManager;

  beforeEach(() => {
    manager = createRiskStabilityLayerManager();
  });

  it('should compute the stability index', () => {
    const index = manager.computeStabilityIndex({
      liquidityScore: 85,
      leverageScore: 75,
      collateralizationScore: 90,
      concentrationScore: 70,
      volatilityScore: 80,
    });
    expect(index.score).toBeGreaterThan(0);
    expect(index.score).toBeLessThanOrEqual(100);
    expect(index.riskLevel).toBeDefined();
    expect(['improving', 'stable', 'deteriorating']).toContain(index.trend);
  });

  it('should identify critical risk level for low score', () => {
    const index = manager.computeStabilityIndex({ liquidityScore: 10, leverageScore: 15, collateralizationScore: 20, concentrationScore: 10, volatilityScore: 15 });
    expect(index.riskLevel).toBe('critical');
    expect(index.score).toBeLessThan(30);
  });

  it('should detect stability trend', () => {
    manager.computeStabilityIndex({ liquidityScore: 60, leverageScore: 60, collateralizationScore: 60, concentrationScore: 60, volatilityScore: 60 });
    const index2 = manager.computeStabilityIndex({ liquidityScore: 80, leverageScore: 80, collateralizationScore: 80, concentrationScore: 80, volatilityScore: 80 });
    expect(index2.trend).toBe('improving');
  });

  it('should register and trigger circuit breakers', () => {
    const breaker = manager.registerCircuitBreaker({
      name: 'Leverage Limit Breaker',
      triggerCondition: 'system_leverage > threshold',
      triggerThreshold: 8,
      affectedSystems: ['margin_engine', 'prime_brokerage'],
    });
    expect(breaker.state).toBe('normal');
    const triggered = manager.triggerCircuitBreaker(breaker.id, 9);
    expect(triggered.state).toBe('triggered');
    manager.resetCircuitBreaker(breaker.id);
    expect(manager.getCircuitBreaker(breaker.id)?.state).toBe('normal');
  });

  it('should not trigger circuit breaker below threshold', () => {
    const breaker = manager.registerCircuitBreaker({ name: 'CB', triggerCondition: 'x > 100', triggerThreshold: 100, affectedSystems: [] });
    const result = manager.triggerCircuitBreaker(breaker.id, 50);
    expect(result.state).toBe('normal');
  });

  it('should manage leverage governor', () => {
    const governor = manager.updateLeverageGovernor({ systemMaxLeverage: 8, autoDeleverageThreshold: 6 });
    expect(governor.systemMaxLeverage).toBe(8);
    expect(governor.autoDeleverageThreshold).toBe(6);
    manager.setAgentLeverageLimit('agent_1', 5);
    expect(manager.getLeverageGovernor().agentLeverageLimits.get('agent_1')).toBe(5);
  });

  it('should run a stress test', () => {
    const result = manager.runStressTest({
      name: 'Market Crash 2025',
      description: 'Simulates a 40% asset price decline',
      liquidityShock: 30,
      priceShock: 40,
      leverageShock: 2,
      correlationBreakdown: true,
    });
    expect(result.id).toBeDefined();
    expect(result.scenarioName).toBe('Market Crash 2025');
    expect(result.systemLossUsd).toBeGreaterThan(0);
    expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
  });

  it('should manage insurance fund', () => {
    const initial = manager.getInsuranceFund().totalValueUsd;
    manager.addInsurancePremium(1_000_000);
    expect(manager.getInsuranceFund().totalValueUsd).toBe(initial + 1_000_000);
    const drawdown = manager.drawFromInsuranceFund(500_000, 'defaulter coverage');
    expect(drawdown.amount).toBe(500_000);
    expect(drawdown.purpose).toBe('defaulter coverage');
  });

  it('should provide layer status', () => {
    manager.computeStabilityIndex({ liquidityScore: 80, leverageScore: 75, collateralizationScore: 85, concentrationScore: 70, volatilityScore: 80 });
    manager.registerCircuitBreaker({ name: 'CB1', triggerCondition: 'x > 10', triggerThreshold: 10, affectedSystems: [] });
    const status = manager.getLayerStatus();
    expect(status.stabilityIndex).toBeGreaterThan(0);
    expect(status.circuitBreakersTotal).toBe(1);
    expect(status.insuranceFundUsd).toBeGreaterThan(0);
  });
});

// ============================================================================
// Layer 7: Monetary & Treasury Layer Tests
// ============================================================================

describe('MonetaryTreasuryLayerManager', () => {
  let manager: DefaultMonetaryTreasuryLayerManager;

  beforeEach(() => {
    manager = createMonetaryTreasuryLayerManager();
  });

  it('should create a monetary policy', () => {
    const policy = manager.createMonetaryPolicy({
      name: 'Conservative Policy',
      targetInflationRate: 0.02,
      initialEmissionRate: 100_000,
      reserveRatio: 0.2,
      collateralizationRatio: 1.5,
      stabilizationBuffer: 500_000,
    });
    expect(policy.id).toBeDefined();
    expect(policy.name).toBe('Conservative Policy');
    expect(policy.currentEmissionRate).toBe(100_000);
    expect(policy.reserveRatio).toBe(0.2);
  });

  it('should execute monetary actions', () => {
    const policy = manager.createMonetaryPolicy({ name: 'P1', targetInflationRate: 0.03, initialEmissionRate: 100_000, reserveRatio: 0.15, collateralizationRatio: 1.5, stabilizationBuffer: 200_000 });
    const result = manager.executeMonetaryAction(policy.id, 'emission_decrease');
    expect(result.newEmissionRate).toBeLessThan(result.previousEmissionRate);
    expect(result.action).toBe('emission_decrease');
  });

  it('should halt emissions', () => {
    const policy = manager.createMonetaryPolicy({ name: 'P2', targetInflationRate: 0, initialEmissionRate: 50_000, reserveRatio: 0.1, collateralizationRatio: 1.2, stabilizationBuffer: 100_000 });
    const result = manager.executeMonetaryAction(policy.id, 'emission_halt');
    expect(result.newEmissionRate).toBe(0);
  });

  it('should create and advance emission schedule', () => {
    const schedule = manager.createEmissionSchedule({
      assetId: 'TONA',
      epochDurationDays: 30,
      initialEpochEmission: 1_000_000,
      totalScheduledEmission: 100_000_000,
      decayRate: 5,
    });
    expect(schedule.currentEpoch).toBe(1);
    expect(schedule.epochEmission).toBe(1_000_000);
    const advanced = manager.advanceEpoch(schedule.id);
    expect(advanced.currentEpoch).toBe(2);
    expect(advanced.emittedToDate).toBe(1_000_000);
    expect(advanced.epochEmission).toBeLessThan(1_000_000); // Decay applied
  });

  it('should pause and resume emission', () => {
    const schedule = manager.createEmissionSchedule({ assetId: 'TONA', epochDurationDays: 30, initialEpochEmission: 100_000, totalScheduledEmission: 10_000_000, decayRate: 1 });
    manager.pauseEmission(schedule.id);
    expect(() => manager.advanceEpoch(schedule.id)).toThrow('paused');
    manager.resumeEmission(schedule.id);
    const advanced = manager.advanceEpoch(schedule.id);
    expect(advanced.currentEpoch).toBe(2);
  });

  it('should allocate and spend treasury funds', () => {
    const initialBalance = manager.getTotalTreasuryValueUsd();
    const allocation = manager.allocateTreasury({ purpose: 'grants', amountUsd: 1_000_000, approvedBy: 'proposal_1', expiresInDays: 90 });
    expect(allocation.allocatedAmountUsd).toBe(1_000_000);
    expect(manager.getTotalTreasuryValueUsd()).toBe(initialBalance - 1_000_000);
    manager.spendTreasuryAllocation(allocation.id, 250_000, 'Q1 grants payout');
    const updated = manager.getTreasuryAllocation(allocation.id);
    expect(updated?.spentAmountUsd).toBe(250_000);
    expect(updated?.remainingAmountUsd).toBe(750_000);
  });

  it('should deposit to treasury', () => {
    const before = manager.getTotalTreasuryValueUsd();
    manager.depositToTreasury(5_000_000);
    expect(manager.getTotalTreasuryValueUsd()).toBe(before + 5_000_000);
  });

  it('should provide layer status', () => {
    manager.createMonetaryPolicy({ name: 'P', targetInflationRate: 0.02, initialEmissionRate: 100_000, reserveRatio: 0.15, collateralizationRatio: 1.5, stabilizationBuffer: 200_000 });
    manager.allocateTreasury({ purpose: 'operations', amountUsd: 1_000_000, approvedBy: 'prop_1' });
    const status = manager.getLayerStatus();
    expect(status.activePolicies).toBe(1);
    expect(status.allocationCount).toBe(1);
    expect(status.treasuryValueUsd).toBeGreaterThan(0);
  });
});

// ============================================================================
// Layer 8: Inter-Protocol Layer Tests
// ============================================================================

describe('InterProtocolLayerManager', () => {
  let manager: DefaultInterProtocolLayerManager;

  beforeEach(() => {
    manager = createInterProtocolLayerManager();
  });

  it('should register an external protocol', () => {
    const protocol = manager.registerProtocol({
      name: 'TON Lending Protocol',
      type: 'defi_lending',
      chainId: 'ton',
      tvlUsd: 50_000_000,
      integrationType: 'bidirectional',
      adapterVersion: '1.0.0',
    });
    expect(protocol.id).toBeDefined();
    expect(protocol.name).toBe('TON Lending Protocol');
    expect(protocol.isActive).toBe(true);
    expect(protocol.integrationType).toBe('bidirectional');
  });

  it('should issue a liquidity passport', () => {
    const p1 = manager.registerProtocol({ name: 'P1', type: 'dex', chainId: 'ton', tvlUsd: 10_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const passport = manager.issuePassport({
      fundId: 'fund_1',
      issuedTo: 'agent_1',
      eligibleProtocols: [p1.id],
      maxAllocationUsd: 5_000_000,
      validForDays: 30,
    });
    expect(passport.id).toBeDefined();
    expect(passport.issuedTo).toBe('agent_1');
    expect(passport.eligibleProtocols).toContain(p1.id);
    expect(passport.expiresAt).toBeDefined();
  });

  it('should add a protocol to a passport', () => {
    const p1 = manager.registerProtocol({ name: 'P1', type: 'dex', chainId: 'ton', tvlUsd: 10_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const p2 = manager.registerProtocol({ name: 'P2', type: 'defi_lending', chainId: 'ton', tvlUsd: 5_000_000, integrationType: 'read_only', adapterVersion: '1.0' });
    const passport = manager.issuePassport({ fundId: 'fund_1', issuedTo: 'agent_1', eligibleProtocols: [p1.id], maxAllocationUsd: 5_000_000, validForDays: 30 });
    manager.addProtocolToPassport(passport.id, p2.id);
    expect(manager.getPassport(passport.id)?.eligibleProtocols).toContain(p2.id);
  });

  it('should register and update cross-chain positions', () => {
    const pos = manager.registerCrossChainPosition({ holderId: 'agent_1', chainId: 'ethereum', assetId: 'USDT', amount: 100000, valueUsd: 100000, bridgedFrom: 'ton' });
    expect(pos.id).toBeDefined();
    expect(pos.bridgedFrom).toBe('ton');
    manager.updateCrossChainPosition(pos.id, 90000, 90000);
    expect(manager.getCrossChainPosition(pos.id)?.amount).toBe(90000);
  });

  it('should compute consolidated portfolio', () => {
    manager.registerCrossChainPosition({ holderId: 'agent_1', chainId: 'ton', assetId: 'TON', amount: 10000, valueUsd: 35000 });
    manager.registerCrossChainPosition({ holderId: 'agent_1', chainId: 'ethereum', assetId: 'USDT', amount: 50000, valueUsd: 50000 });
    const total = manager.getConsolidatedPortfolioUsd('agent_1');
    expect(total).toBe(85000);
  });

  it('should initiate and complete a cross-protocol allocation', () => {
    const p1 = manager.registerProtocol({ name: 'P1', type: 'dex', chainId: 'ton', tvlUsd: 10_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const p2 = manager.registerProtocol({ name: 'P2', type: 'defi_lending', chainId: 'ton', tvlUsd: 5_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const allocation = manager.initiateAllocation({ fromProtocolId: p1.id, toProtocolId: p2.id, assetId: 'USDT', amount: 1_000_000, purpose: 'yield_optimization' });
    expect(allocation.status).toBe('pending');
    manager.completeAllocation(allocation.id);
    expect(manager.getAllocation(allocation.id)?.status).toBe('completed');
  });

  it('should fail an allocation', () => {
    const p1 = manager.registerProtocol({ name: 'P1', type: 'dex', chainId: 'ton', tvlUsd: 10_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const p2 = manager.registerProtocol({ name: 'P2', type: 'dex', chainId: 'ton', tvlUsd: 5_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const allocation = manager.initiateAllocation({ fromProtocolId: p1.id, toProtocolId: p2.id, assetId: 'TON', amount: 100, purpose: 'test' });
    manager.failAllocation(allocation.id, 'bridge_timeout');
    expect(manager.getAllocation(allocation.id)?.status).toBe('failed');
  });

  it('should provide layer status', () => {
    manager.registerProtocol({ name: 'P1', type: 'dex', chainId: 'ton', tvlUsd: 10_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    manager.issuePassport({ fundId: 'f1', issuedTo: 'a1', eligibleProtocols: [], maxAllocationUsd: 1_000_000, validForDays: 30 });
    const status = manager.getLayerStatus();
    expect(status.connectedProtocols).toBe(1);
    expect(status.activePassports).toBe(1);
  });
});

// ============================================================================
// Layer 9: Governance Layer Tests
// ============================================================================

describe('GovernanceLayerManager', () => {
  let manager: DefaultGovernanceLayerManager;

  beforeEach(() => {
    manager = createGovernanceLayerManager();
  });

  it('should create a governance proposal', () => {
    const proposal = manager.createProposal({
      type: 'parameter_change',
      title: 'Reduce Max Leverage',
      description: 'Reduce system max leverage from 10x to 8x',
      proposerId: 'token_holder_1',
      targetLayer: 6,
      targetParameter: 'maxSystemLeverage',
      proposedValue: 8,
      currentValue: 10,
      votingDurationHours: 72,
      quorumRequired: 1_000_000,
    });
    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('active');
    expect(proposal.type).toBe('parameter_change');
    expect(proposal.targetLayer).toBe(6);
  });

  it('should cast votes on a proposal', () => {
    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Test', description: 'Test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 1000 });
    manager.castVote(proposal.id, { voterId: 'voter_1', vote: 'for', votingPower: 500 });
    manager.castVote(proposal.id, { voterId: 'voter_2', vote: 'for', votingPower: 600 });
    manager.castVote(proposal.id, { voterId: 'voter_3', vote: 'against', votingPower: 200 });
    const updated = manager.getProposal(proposal.id);
    expect(updated?.votesFor).toBe(1100);
    expect(updated?.votesAgainst).toBe(200);
  });

  it('should finalize a passing proposal', () => {
    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Test', description: 'Test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 1000 });
    manager.castVote(proposal.id, { voterId: 'v1', vote: 'for', votingPower: 700 });
    manager.castVote(proposal.id, { voterId: 'v2', vote: 'for', votingPower: 400 });
    manager.castVote(proposal.id, { voterId: 'v3', vote: 'against', votingPower: 100 });
    const result = manager.finalizeProposal(proposal.id);
    expect(result.passed).toBe(true);
    expect(result.quorumReached).toBe(true);
    expect(result.status).toBe('passed');
  });

  it('should finalize a failing proposal', () => {
    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Test', description: 'Test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 10000 });
    manager.castVote(proposal.id, { voterId: 'v1', vote: 'for', votingPower: 500 });
    const result = manager.finalizeProposal(proposal.id);
    expect(result.passed).toBe(false);
    expect(result.quorumReached).toBe(false);
    expect(result.status).toBe('rejected');
  });

  it('should execute a passed proposal', () => {
    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Test', description: 'Test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 500 });
    manager.castVote(proposal.id, { voterId: 'v1', vote: 'for', votingPower: 600 });
    manager.finalizeProposal(proposal.id);
    manager.executeProposal(proposal.id);
    expect(manager.getProposal(proposal.id)?.status).toBe('executed');
  });

  it('should cancel a proposal', () => {
    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Test', description: 'Test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 1000 });
    manager.cancelProposal(proposal.id, 'withdrawn by proposer');
    expect(manager.getProposal(proposal.id)?.status).toBe('cancelled');
  });

  it('should manage parameter registry', () => {
    const param = manager.registerParameter({
      layer: 6,
      parameter: 'maxSystemLeverage',
      currentValue: 10,
      minValue: 1,
      maxValue: 20,
      description: 'Maximum allowed system-wide leverage',
      initialProposalId: 'prop_genesis',
    });
    expect(param.layer).toBe(6);
    expect(param.parameter).toBe('maxSystemLeverage');
    expect(param.currentValue).toBe(10);

    const proposal = manager.createProposal({ type: 'parameter_change', title: 'Change Leverage', description: 'Reduce leverage', proposerId: 'p1', targetLayer: 6, votingDurationHours: 24, quorumRequired: 500 });
    manager.castVote(proposal.id, { voterId: 'v1', vote: 'for', votingPower: 600 });
    manager.finalizeProposal(proposal.id);
    manager.executeProposal(proposal.id);

    const updated = manager.updateParameter(6, 'maxSystemLeverage', 8, proposal.id);
    expect(updated.currentValue).toBe(8);
  });

  it('should activate and resolve emergency overrides', () => {
    const override = manager.activateEmergencyOverride({
      type: 'system_halt',
      triggeredBy: 'risk_committee',
      reason: 'Critical exploit detected',
      affectedLayer: 3,
      expectedDurationMinutes: 60,
    });
    expect(override.id).toBeDefined();
    expect(override.isActive).toBe(true);
    expect(override.type).toBe('system_halt');
    manager.resolveEmergencyOverride(override.id);
    expect(manager.getEmergencyOverride(override.id)?.isActive).toBe(false);
  });

  it('should list active overrides only', () => {
    const o1 = manager.activateEmergencyOverride({ type: 'circuit_break', triggeredBy: 'admin', reason: 'Test 1', affectedLayer: 5 });
    const o2 = manager.activateEmergencyOverride({ type: 'emission_halt', triggeredBy: 'admin', reason: 'Test 2', affectedLayer: 7 });
    manager.resolveEmergencyOverride(o1.id);
    const activeOnly = manager.listEmergencyOverrides(true);
    expect(activeOnly.length).toBe(1);
    expect(activeOnly[0].id).toBe(o2.id);
  });

  it('should provide layer status', () => {
    manager.createProposal({ type: 'parameter_change', title: 'P1', description: 'test', proposerId: 'p1', targetLayer: 1, votingDurationHours: 24, quorumRequired: 1000 });
    manager.registerParameter({ layer: 1, parameter: 'param1', currentValue: 10, description: 'test', initialProposalId: 'gen' });
    const status = manager.getLayerStatus();
    expect(status.activeProposals).toBe(1);
    expect(status.parametersManaged).toBe(1);
  });
});

// ============================================================================
// Unified ACMS Manager Tests
// ============================================================================

describe('DefaultACMSManager (Unified)', () => {
  let acms: DefaultACMSManager;

  beforeEach(() => {
    acms = createACMSManager({
      networkId: 'ton-testnet',
      environment: 'sandbox',
      maxSystemLeverage: 10,
      stabilityIndexTarget: 80,
    });
  });

  it('should initialize all 9 layers', () => {
    expect(acms.assetLayer).toBeInstanceOf(DefaultAssetLayerManager);
    expect(acms.agentFundLayer).toBeInstanceOf(DefaultAgentFundLayerManager);
    expect(acms.liquidityLayer).toBeInstanceOf(DefaultLiquidityLayerManager);
    expect(acms.primeBrokerageLayer).toBeInstanceOf(DefaultPrimeBrokerageLayerManager);
    expect(acms.clearingSettlementLayer).toBeInstanceOf(DefaultClearingSettlementLayerManager);
    expect(acms.riskStabilityLayer).toBeInstanceOf(DefaultRiskStabilityLayerManager);
    expect(acms.monetaryTreasuryLayer).toBeInstanceOf(DefaultMonetaryTreasuryLayerManager);
    expect(acms.interProtocolLayer).toBeInstanceOf(DefaultInterProtocolLayerManager);
    expect(acms.governanceLayer).toBeInstanceOf(DefaultGovernanceLayerManager);
  });

  it('should use provided config', () => {
    expect(acms.config.networkId).toBe('ton-testnet');
    expect(acms.config.environment).toBe('sandbox');
    expect(acms.config.maxSystemLeverage).toBe(10);
  });

  it('should use default config when not provided', () => {
    const defaultAcms = createACMSManager();
    expect(defaultAcms.config.networkId).toBe(DEFAULT_ACMS_CONFIG.networkId);
    expect(defaultAcms.config.environment).toBe(DEFAULT_ACMS_CONFIG.environment);
  });

  it('should provide a full stack status', () => {
    const status = acms.getStackStatus();
    expect(status.layer1AssetLayer).toBeDefined();
    expect(status.layer2AgentFundLayer).toBeDefined();
    expect(status.layer3LiquidityLayer).toBeDefined();
    expect(status.layer4PrimeBrokerage).toBeDefined();
    expect(status.layer5ClearingSettlement).toBeDefined();
    expect(status.layer6RiskStability).toBeDefined();
    expect(status.layer7MonetaryTreasury).toBeDefined();
    expect(status.layer8InterProtocol).toBeDefined();
    expect(status.layer9Governance).toBeDefined();
    expect(status.generatedAt).toBeInstanceOf(Date);
  });

  it('should forward events from all layers', () => {
    const events: { type: string; layer: number }[] = [];
    acms.onEvent(event => events.push({ type: event.type, layer: event.layer }));

    // Layer 1 event
    acms.assetLayer.issueAsset({ proposerId: 'a1', assetType: 'crypto', symbol: 'TON', name: 'TON', chainId: 'ton', initialSupply: 1000, metadata: {} });
    // Layer 2 events
    acms.agentFundLayer.deployAgent({ name: 'Bot', type: 'strategy_agent', allocationUsd: 100000, maxLeverage: 2, strategies: [] });
    const mgr = acms.agentFundLayer.deployAgent({ name: 'FM', type: 'hedge_fund', allocationUsd: 0, maxLeverage: 1, strategies: [] });
    acms.agentFundLayer.createFund({ name: 'Fund', fundType: 'hedge_fund', managerAgentId: mgr.id, initialAum: 1_000_000, initialNavPerShare: 100, targetReturn: 0.1 });
    // Layer 3 event
    acms.liquidityLayer.registerSource({ type: 'dex_onchain', name: 'DEX', chainId: 'ton', tvlUsd: 10_000_000, dailyVolumeUsd: 1_000_000, feeBps: 30, latencyMs: 200 });
    acms.liquidityLayer.routeOrder({ assetIn: 'TON', assetOut: 'USDT', amountIn: 1000, orderType: 'market', side: 'sell', maxSlippageBps: 50 });

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.type === 'asset_issued')).toBe(true);
    expect(events.some(e => e.type === 'agent_deployed')).toBe(true);
    expect(events.some(e => e.type === 'fund_created')).toBe(true);
    expect(events.some(e => e.type === 'liquidity_routed')).toBe(true);
  });

  it('should execute the full end-to-end ACMS demo flow', () => {
    // Layer 1: Issue assets
    const ton = acms.assetLayer.issueAsset({ proposerId: 'system', assetType: 'crypto', symbol: 'TON', name: 'The Open Network', chainId: 'ton', initialSupply: 5_000_000_000, metadata: {} });
    acms.assetLayer.issueAsset({ proposerId: 'system', assetType: 'stablecoin', symbol: 'USDT', name: 'Tether', chainId: 'ton', initialSupply: 1_000_000_000, metadata: {} });
    const fundToken = acms.assetLayer.createTokenizedFund({
      fundManagerId: 'manager_1', name: 'Alpha Fund', symbol: 'TONA', chainId: 'ton',
      initialNavPerShare: 100, initialShares: 1_000_000, managementFeeRate: 0.02,
      performanceFeeRate: 0.2, redemptionNoticeDays: 30, strategyDescription: 'AI arbitrage',
    });
    expect(acms.assetLayer.getLayerStatus().totalAssets).toBe(3);

    // Layer 2: Deploy fund and agents
    const managerAgent = acms.agentFundLayer.deployAgent({ name: 'Fund Manager', type: 'hedge_fund', allocationUsd: 0, maxLeverage: 1, strategies: ['allocation'] });
    const fund = acms.agentFundLayer.createFund({ name: 'AI Quant Fund', fundType: 'hedge_fund', managerAgentId: managerAgent.id, initialAum: 10_000_000, initialNavPerShare: 100, targetReturn: 0.25 });
    const agent1 = acms.agentFundLayer.deployAgent({ name: 'Arb Agent', type: 'arbitrage_agent', fundId: fund.id, allocationUsd: 2_000_000, maxLeverage: 3, strategies: ['cross-dex'] });
    acms.agentFundLayer.addAgentToFund(fund.id, agent1.id);
    expect(acms.agentFundLayer.getLayerStatus().totalFunds).toBe(1);
    expect(acms.agentFundLayer.getLayerStatus().totalAgents).toBe(2);

    // Layer 3: Set up liquidity
    acms.liquidityLayer.registerSource({ type: 'dex_onchain', name: 'TON DEX', chainId: 'ton', tvlUsd: 100_000_000, dailyVolumeUsd: 10_000_000, feeBps: 30, latencyMs: 200 });
    acms.liquidityLayer.registerSource({ type: 'otc_desk', name: 'OTC Desk', chainId: 'ton', tvlUsd: 200_000_000, dailyVolumeUsd: 30_000_000, feeBps: 10, latencyMs: 50 });
    const route = acms.liquidityLayer.routeOrder({ assetIn: ton.id, assetOut: 'USDT', amountIn: 500_000, orderType: 'twap', side: 'sell', maxSlippageBps: 30 });
    const execResult = acms.liquidityLayer.executeRoute(route.id);
    expect(execResult.executed).toBe(true);

    // Layer 4: Prime brokerage
    const pool = acms.primeBrokerageLayer.createCapitalPool('Institutional Pool', 50_000_000);
    acms.primeBrokerageLayer.allocateFundToPool(pool.id, fund.id, fund.name, 20_000_000, 2.5);
    const marginAcct = acms.primeBrokerageLayer.createMarginAccount(agent1.id, 'agent');
    acms.primeBrokerageLayer.updateMarginAccount(marginAcct.id, { totalEquity: 2_000_000, usedMargin: 1_200_000, leverage: 3 });
    expect(acms.primeBrokerageLayer.getLayerStatus().capitalPools).toBe(1);

    // Layer 5: Clear and settle
    const clearing = acms.clearingSettlementLayer.submitTrade({ tradeId: 'trade_001', buyerId: agent1.id, sellerId: 'counterparty_1', assetId: ton.id, quantity: 10000, priceUsd: 3.5 });
    const netting = acms.clearingSettlementLayer.processNetting(agent1.id);
    acms.clearingSettlementLayer.settleEntry(clearing.id);
    expect(netting.participantId).toBe(agent1.id);
    expect(acms.clearingSettlementLayer.getClearingEntry(clearing.id)?.status).toBe('settled');

    // Layer 6: Risk monitoring
    const stability = acms.riskStabilityLayer.computeStabilityIndex({ liquidityScore: 85, leverageScore: 70, collateralizationScore: 90, concentrationScore: 75, volatilityScore: 80 });
    acms.riskStabilityLayer.registerCircuitBreaker({ name: 'Leverage CB', triggerCondition: 'leverage > 8', triggerThreshold: 8, affectedSystems: ['prime_brokerage'] });
    expect(stability.score).toBeGreaterThan(0);

    // Layer 7: Monetary policy
    const policy = acms.monetaryTreasuryLayer.createMonetaryPolicy({ name: 'Growth Policy', targetInflationRate: 0.03, initialEmissionRate: 100_000, reserveRatio: 0.15, collateralizationRatio: 1.5, stabilizationBuffer: 500_000 });
    const actionResult = acms.monetaryTreasuryLayer.executeMonetaryAction(policy.id, 'emission_decrease');
    expect(actionResult.newEmissionRate).toBeLessThan(100_000);

    // Layer 8: Inter-protocol
    const lendingProtocol = acms.interProtocolLayer.registerProtocol({ name: 'TON Lending', type: 'defi_lending', chainId: 'ton', tvlUsd: 50_000_000, integrationType: 'bidirectional', adapterVersion: '1.0' });
    const passport = acms.interProtocolLayer.issuePassport({ fundId: fund.id, issuedTo: agent1.id, eligibleProtocols: [lendingProtocol.id], maxAllocationUsd: 1_000_000, validForDays: 30 });
    expect(passport.eligibleProtocols).toContain(lendingProtocol.id);

    // Layer 9: Governance
    const proposal = acms.governanceLayer.createProposal({ type: 'parameter_change', title: 'Adjust stability target', description: 'Update stability index target from 80 to 85', proposerId: 'governance_multisig', targetLayer: 6, targetParameter: 'stabilityIndexTarget', proposedValue: 85, currentValue: 80, votingDurationHours: 72, quorumRequired: 500_000 });
    acms.governanceLayer.castVote(proposal.id, { voterId: 'major_holder_1', vote: 'for', votingPower: 600_000 });
    const finalResult = acms.governanceLayer.finalizeProposal(proposal.id);
    expect(finalResult.passed).toBe(true);

    // Full stack status
    const stackStatus = acms.getStackStatus();
    expect(stackStatus.layer1AssetLayer.totalAssets).toBe(3);
    expect(stackStatus.layer2AgentFundLayer.totalAgents).toBe(2);
    expect(stackStatus.layer3LiquidityLayer.activeSources).toBe(2);
    expect(stackStatus.layer4PrimeBrokerage.capitalPools).toBe(1);
    expect(stackStatus.layer5ClearingSettlement.insuranceFundUsd).toBeGreaterThan(0);
    expect(stackStatus.layer6RiskStability.stabilityIndex).toBeGreaterThan(0);
    expect(stackStatus.layer7MonetaryTreasury.activePolicies).toBe(1);
    expect(stackStatus.layer8InterProtocol.connectedProtocols).toBe(1);
    expect(stackStatus.layer9Governance.activeProposals).toBe(0); // proposal was finalized
    expect(stackStatus.generatedAt).toBeInstanceOf(Date);
    expect(stackStatus.totalAumUsd).toBeGreaterThan(0);
    expect(stackStatus.systemStabilityIndex).toBeGreaterThan(0);
  });
});
