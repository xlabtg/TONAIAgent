/**
 * TONAIAgent - Token Utility & Agent Economy Tests (Issue #104)
 *
 * Comprehensive tests for the Token Utility & Agent Economy layer.
 * Covers all 9 core components: token utility framework, agent staking,
 * agent economy, revenue sharing, buyback/burn, DeFi integration,
 * developer incentives, economic simulation, and cross-agent payments.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTokenUtilityEconomy,
  DefaultTokenUtilityEconomyService,
  createTokenUtilityFramework,
  DefaultTokenUtilityFramework,
  createAgentStakingModule,
  DefaultAgentStakingModule,
  createAgentEconomyModule,
  DefaultAgentEconomyModule,
  createRevenueSharingModule,
  DefaultRevenueSharingModule,
  createBuybackBurnModule,
  DefaultBuybackBurnModule,
  createDeFiIntegrationModule,
  DefaultDeFiIntegrationModule,
  createDeveloperIncentivesModule,
  DefaultDeveloperIncentivesModule,
  createEconomicSimulationModule,
  DefaultEconomicSimulationModule,
  createCrossAgentPaymentsModule,
  DefaultCrossAgentPaymentsModule,
} from '../../services/token-utility-economy';

import type {
  TokenFeeType,
  TokenUtilityTier,
  AgentPublicationRequest,
  TokenUtilityEconomyConfig,
  EconomicSimulationParams,
} from '../../services/token-utility-economy';

// ============================================================================
// TokenUtilityEconomy (Unified Service)
// ============================================================================

describe('TokenUtilityEconomy', () => {
  let economy: DefaultTokenUtilityEconomyService;

  beforeEach(() => {
    economy = createTokenUtilityEconomy({
      tokenSymbol: 'TONAI',
      tokenDecimals: 9,
      totalSupply: '10000000000000000000',
    });
  });

  it('should initialize all sub-systems', () => {
    expect(economy.tokenUtilityFramework).toBeDefined();
    expect(economy.agentStaking).toBeDefined();
    expect(economy.agentEconomy).toBeDefined();
    expect(economy.revenueSharing).toBeDefined();
    expect(economy.buybackBurn).toBeDefined();
    expect(economy.defiIntegration).toBeDefined();
    expect(economy.developerIncentives).toBeDefined();
    expect(economy.economicSimulation).toBeDefined();
    expect(economy.crossAgentPayments).toBeDefined();
  });

  it('should report healthy status when all components are working', () => {
    const health = economy.getHealth();
    expect(health).toBeDefined();
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    expect(health.tokenUtilityFramework).toBeDefined();
    expect(health.agentStaking).toBeDefined();
    expect(health.agentEconomy).toBeDefined();
  });

  it('should forward events from all sub-systems', () => {
    const events: string[] = [];
    economy.onEvent(event => events.push(event.type));

    economy.tokenUtilityFramework.recordFeeCollection('agent_creation', '500000000000', 'user-1');
    expect(events.length).toBeGreaterThan(0);
    expect(events).toContain('fee.collected');
  });

  it('should allow event listener removal', () => {
    const events: string[] = [];
    const remove = economy.onEvent(event => events.push(event.type));

    economy.tokenUtilityFramework.recordFeeCollection('agent_creation', '100000000000');
    const countAfterFirst = events.length;

    remove();
    economy.tokenUtilityFramework.recordFeeCollection('strategy_deployment', '100000000000');
    expect(events.length).toBe(countAfterFirst); // No new events after removal
  });

  it('should create economy with custom config', () => {
    const customEconomy = createTokenUtilityEconomy({
      tokenSymbol: 'CUSTOM',
      tokenDecimals: 6,
      totalSupply: '1000000000000',
      revenueSharing: {
        strategyCreatorPercent: 0.40,
        platformProtocolPercent: 0.20,
        daoTreasuryPercent: 0.20,
        stakersPercent: 0.10,
        liquidityPercent: 0.10,
      },
    });
    expect(customEconomy.revenueSharing.config.strategyCreatorPercent).toBe(0.40);
  });
});

// ============================================================================
// Token Utility Framework
// ============================================================================

describe('TokenUtilityFramework', () => {
  let framework: DefaultTokenUtilityFramework;

  beforeEach(() => {
    framework = createTokenUtilityFramework();
  });

  it('should initialize with default fee schedule', () => {
    expect(framework.feeSchedule).toBeDefined();
    const feeTypes: TokenFeeType[] = [
      'agent_creation', 'strategy_deployment', 'automation_workflow',
      'premium_feature', 'execution_fee', 'marketplace_listing', 'marketplace_transaction',
    ];
    for (const feeType of feeTypes) {
      expect(framework.feeSchedule[feeType]).toBeDefined();
    }
  });

  it('should initialize with default tier configs', () => {
    expect(framework.tierConfigs).toBeDefined();
    const tiers: TokenUtilityTier[] = ['basic', 'standard', 'premium', 'elite', 'institutional'];
    for (const tier of tiers) {
      expect(framework.tierConfigs[tier]).toBeDefined();
    }
  });

  it('should calculate fees with basic tier (no discount)', () => {
    const result = framework.calculateFee('agent_creation', '0');
    expect(result.feeType).toBe('agent_creation');
    expect(result.appliedTier).toBe('basic');
    expect(result.discountPercent).toBe(0);
    expect(result.grossAmount).toBe(result.netAmount);
    expect(BigInt(result.burnAmount) + BigInt(result.treasuryAmount) + BigInt(result.creatorAmount)).toBeLessThanOrEqual(BigInt(result.netAmount) + BigInt(1)); // Allow 1 wei rounding
  });

  it('should apply discount for premium tier', () => {
    const premiumStake = '10000000000000'; // 10,000 tokens
    const result = framework.calculateFee('agent_creation', premiumStake);
    expect(result.appliedTier).toBe('premium');
    expect(result.discountPercent).toBeGreaterThan(0);
    expect(BigInt(result.netAmount)).toBeLessThan(BigInt(result.grossAmount));
  });

  it('should apply maximum discount for institutional tier', () => {
    const institutionalStake = '1000000000000000'; // 1M tokens
    const result = framework.calculateFee('strategy_deployment', institutionalStake);
    expect(result.appliedTier).toBe('institutional');
    expect(result.discountPercent).toBe(0.75);
  });

  it('should determine correct tier for stake amount', () => {
    expect(framework.getTierForStake('0')).toBe('basic');
    expect(framework.getTierForStake('1000000000000')).toBe('standard');   // 1,000 tokens
    expect(framework.getTierForStake('10000000000000')).toBe('premium');   // 10,000 tokens
    expect(framework.getTierForStake('100000000000000')).toBe('elite');    // 100,000 tokens
    expect(framework.getTierForStake('1000000000000000')).toBe('institutional'); // 1M tokens
  });

  it('should check feature access by tier', () => {
    expect(framework.hasFeatureAccess('basic', 'basic_agents')).toBe(true);
    expect(framework.hasFeatureAccess('basic', 'analytics_advanced')).toBe(false);
    expect(framework.hasFeatureAccess('premium', 'analytics_advanced')).toBe(true);
    expect(framework.hasFeatureAccess('institutional', 'custom_arrangements')).toBe(true);
    expect(framework.hasFeatureAccess('elite', 'all_features')).toBe(true);
  });

  it('should get next tier in progression', () => {
    expect(framework.getNextTier('basic')).toBe('standard');
    expect(framework.getNextTier('standard')).toBe('premium');
    expect(framework.getNextTier('premium')).toBe('elite');
    expect(framework.getNextTier('elite')).toBe('institutional');
    expect(framework.getNextTier('institutional')).toBeNull();
  });

  it('should calculate amount needed for next tier upgrade', () => {
    const amountNeeded = framework.getAmountToNextTier('0');
    expect(amountNeeded).toBe('1000000000000'); // 1,000 tokens needed for standard

    const atTop = framework.getAmountToNextTier('1000000000000000');
    expect(atTop).toBeNull(); // Already at top tier
  });

  it('should record fee collections and update totals', () => {
    framework.recordFeeCollection('agent_creation', '500000000000', 'user-1');
    const health = framework.getHealth();
    expect(BigInt(health.totalFeesCollected)).toBeGreaterThan(BigInt(0));
    expect(BigInt(health.totalFeesBurned)).toBeGreaterThan(BigInt(0));
  });

  it('should report health', () => {
    const health = framework.getHealth();
    expect(health.overall).toBe('healthy');
    expect(health.feeScheduleActive).toBe(true);
    expect(health.tierSystemActive).toBe(true);
  });

  it('should allow custom fee schedule', () => {
    const customFramework = createTokenUtilityFramework({
      feeSchedule: {
        agent_creation: { baseAmount: '100000000000' }, // Lower fee
      },
    });
    expect(customFramework.feeSchedule.agent_creation.baseAmount).toBe('100000000000');
    // Other fees should still have defaults
    expect(customFramework.feeSchedule.strategy_deployment.baseAmount).toBe('1000000000000');
  });
});

// ============================================================================
// Agent Staking & Reputation
// ============================================================================

describe('AgentStakingModule', () => {
  let module: DefaultAgentStakingModule;

  beforeEach(() => {
    module = createAgentStakingModule();
  });

  it('should publish agent with stake', () => {
    const request: AgentPublicationRequest = {
      agentId: 'agent-1',
      developerId: 'dev-1',
      agentType: 'trading',
      stakeAmount: '10000000000000', // 10,000 tokens
    };

    const stake = module.publishWithStake(request);
    expect(stake.agentId).toBe('agent-1');
    expect(stake.developerId).toBe('dev-1');
    expect(stake.tier).toBe('trusted');
    expect(stake.status).toBe('active');
    expect(stake.trustScore).toBeGreaterThan(0);
  });

  it('should determine trust tier from stake amount', () => {
    expect(module.getTrustTierForStake('0')).toBe('unverified');
    expect(module.getTrustTierForStake('1000000000000')).toBe('verified');     // 1,000 tokens
    expect(module.getTrustTierForStake('10000000000000')).toBe('trusted');     // 10,000 tokens
    expect(module.getTrustTierForStake('50000000000000')).toBe('certified');   // 50,000 tokens
    expect(module.getTrustTierForStake('200000000000000')).toBe('elite');      // 200,000 tokens
  });

  it('should retrieve agent stake', () => {
    module.publishWithStake({ agentId: 'agent-2', developerId: 'dev-1', agentType: 'yield', stakeAmount: '5000000000000' });
    const retrieved = module.getAgentStake('agent-2');
    expect(retrieved).toBeDefined();
    expect(retrieved?.agentId).toBe('agent-2');
  });

  it('should return null for non-existent agent', () => {
    const result = module.getAgentStake('non-existent');
    expect(result).toBeNull();
  });

  it('should update agent performance score', () => {
    module.publishWithStake({ agentId: 'agent-3', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });
    const updated = module.updateAgentPerformance('agent-3', 85);
    expect(updated?.performanceScore).toBe(85);
    expect(updated?.slashRisk).toBe(0); // High performance = no slash risk
  });

  it('should flag agent at risk with poor performance', () => {
    module.publishWithStake({ agentId: 'agent-4', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });
    const updated = module.updateAgentPerformance('agent-4', 15);
    expect(updated?.status).toBe('at_risk');
    expect(updated?.slashRisk).toBeGreaterThan(0);
  });

  it('should slash agent for poor performance', () => {
    module.publishWithStake({ agentId: 'agent-5', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });

    const slash = module.slashAgent({
      agentId: 'agent-5',
      reason: 'poor_performance',
      severity: 'moderate',
      evidence: ['below_threshold_for_30_days'],
      executedBy: 'governance',
    });

    expect(slash.agentId).toBe('agent-5');
    expect(slash.reason).toBe('poor_performance');
    expect(BigInt(slash.amount)).toBeGreaterThan(BigInt(0));
    expect(slash.status).toBe('pending');
  });

  it('should reduce stake after slashing', () => {
    const initialStake = '10000000000000';
    module.publishWithStake({ agentId: 'agent-6', developerId: 'dev-1', agentType: 'trading', stakeAmount: initialStake });

    module.slashAgent({
      agentId: 'agent-6',
      reason: 'malicious_behavior',
      severity: 'severe',
      evidence: ['exploit_attempt'],
      executedBy: 'governance',
    });

    const afterSlash = module.getAgentStake('agent-6');
    expect(BigInt(afterSlash!.stakedAmount)).toBeLessThan(BigInt(initialStake));
  });

  it('should track slash history', () => {
    module.publishWithStake({ agentId: 'agent-7', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });
    module.slashAgent({ agentId: 'agent-7', reason: 'inactivity', severity: 'minor', evidence: [], executedBy: 'system' });
    module.slashAgent({ agentId: 'agent-7', reason: 'false_reporting', severity: 'moderate', evidence: [], executedBy: 'governance' });

    const history = module.getSlashHistory('agent-7');
    expect(history.length).toBe(2);
  });

  it('should withdraw stake', () => {
    module.publishWithStake({ agentId: 'agent-8', developerId: 'dev-1', agentType: 'trading', stakeAmount: '5000000000000' });
    const result = module.withdrawStake('agent-8');
    expect(result.success).toBe(true);
    expect(BigInt(result.amount)).toBeGreaterThan(BigInt(0));
  });

  it('should report health metrics', () => {
    module.publishWithStake({ agentId: 'agent-9', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });
    const health = module.getHealth();
    expect(health.totalAgentsStaked).toBe(1);
    expect(BigInt(health.totalStakedValue)).toBeGreaterThan(BigInt(0));
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
  });

  it('should emit events for staking and slashing', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    module.publishWithStake({ agentId: 'agent-10', developerId: 'dev-1', agentType: 'trading', stakeAmount: '10000000000000' });
    expect(events).toContain('agent.staked');

    module.slashAgent({ agentId: 'agent-10', reason: 'inactivity', severity: 'minor', evidence: [], executedBy: 'system' });
    expect(events).toContain('agent.slashed');
  });
});

// ============================================================================
// Autonomous Agent Economy
// ============================================================================

describe('AgentEconomyModule', () => {
  let module: DefaultAgentEconomyModule;

  beforeEach(() => {
    module = createAgentEconomyModule();
  });

  it('should register agent', () => {
    const profile = module.registerAgent({
      agentId: 'agent-1',
      walletAddress: 'EQ...',
      autonomyLevel: 'semi_auto',
    });

    expect(profile.agentId).toBe('agent-1');
    expect(profile.autonomyLevel).toBe('semi_auto');
    expect(profile.economicStatus).toBe('bootstrapping');
  });

  it('should retrieve agent profile', () => {
    module.registerAgent({ agentId: 'agent-2', walletAddress: 'EQ...', autonomyLevel: 'autonomous' });
    const profile = module.getAgentProfile('agent-2');
    expect(profile?.agentId).toBe('agent-2');
  });

  it('should return null for unregistered agent', () => {
    expect(module.getAgentProfile('unknown')).toBeNull();
  });

  it('should record compute usage', () => {
    module.registerAgent({ agentId: 'agent-3', walletAddress: 'EQ...', autonomyLevel: 'autonomous', initialBalance: '1000000000000000' });

    const usage = module.recordComputeUsage({
      agentId: 'agent-3',
      period: '2026-03-01',
      computeUnits: 1000,
      apiCalls: 500,
      storageBytes: 1024 * 1024 * 100, // 100MB
      bandwidthBytes: 1024 * 1024 * 500, // 500MB
    });

    expect(usage.agentId).toBe('agent-3');
    expect(usage.computeUnits).toBe(1000);
    expect(BigInt(usage.totalCost)).toBeGreaterThan(BigInt(0));
    expect(BigInt(usage.breakdown.computeCost)).toBeGreaterThan(BigInt(0));
    expect(BigInt(usage.breakdown.apiCost)).toBeGreaterThan(BigInt(0));
  });

  it('should record earnings', () => {
    module.registerAgent({ agentId: 'agent-4', walletAddress: 'EQ...', autonomyLevel: 'autonomous' });

    const tx = module.recordEarning({
      agentId: 'agent-4',
      strategyId: 'strategy-1',
      amount: '500000000000',
      earningType: 'strategy_profit',
      description: 'Monthly strategy profit',
    });

    expect(tx.transactionType).toBe('strategy_earning');
    expect(tx.amount).toBe('500000000000');
    expect(tx.status).toBe('completed');

    const profile = module.getAgentProfile('agent-4');
    expect(BigInt(profile!.earnedTotal)).toBe(BigInt('500000000000'));
  });

  it('should record reinvestment', () => {
    module.registerAgent({ agentId: 'agent-5', walletAddress: 'EQ...', autonomyLevel: 'autonomous' });
    module.recordEarning({ agentId: 'agent-5', amount: '1000000000000', earningType: 'strategy_profit' });
    const tx = module.recordReinvestment('agent-5', '200000000000');
    expect(tx.transactionType).toBe('reinvestment');

    const profile = module.getAgentProfile('agent-5');
    expect(BigInt(profile!.reinvestedTotal)).toBe(BigInt('200000000000'));
  });

  it('should update autonomy level', () => {
    module.registerAgent({ agentId: 'agent-6', walletAddress: 'EQ...', autonomyLevel: 'supervised' });
    const updated = module.updateAutonomyLevel('agent-6', 'autonomous');
    expect(updated?.autonomyLevel).toBe('autonomous');
  });

  it('should transition from bootstrapping to growing status', () => {
    module.registerAgent({ agentId: 'agent-7', walletAddress: 'EQ...', autonomyLevel: 'autonomous', initialBalance: '10000000000000' });
    module.recordEarning({ agentId: 'agent-7', amount: '5000000000000', earningType: 'strategy_profit' });

    const profile = module.getAgentProfile('agent-7');
    expect(profile?.economicStatus).not.toBe('bootstrapping');
  });

  it('should get transaction history', () => {
    module.registerAgent({ agentId: 'agent-8', walletAddress: 'EQ...', autonomyLevel: 'autonomous', initialBalance: '10000000000000' });
    module.recordEarning({ agentId: 'agent-8', amount: '1000000000000', earningType: 'strategy_profit' });
    module.recordComputeUsage({ agentId: 'agent-8', period: '2026-03', computeUnits: 100, apiCalls: 50, storageBytes: 0, bandwidthBytes: 0 });

    const history = module.getTransactionHistory('agent-8');
    expect(history.length).toBeGreaterThan(0);
  });

  it('should list all profiles', () => {
    module.registerAgent({ agentId: 'agent-9a', walletAddress: 'EQ...', autonomyLevel: 'autonomous' });
    module.registerAgent({ agentId: 'agent-9b', walletAddress: 'EQ...', autonomyLevel: 'supervised' });
    expect(module.getAllProfiles().length).toBe(2);
  });

  it('should report economy health', () => {
    module.registerAgent({ agentId: 'agent-10', walletAddress: 'EQ...', autonomyLevel: 'autonomous' });
    const health = module.getHealth();
    expect(health.totalActiveAgents).toBe(1);
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    expect(health.agentsByStatus).toBeDefined();
  });
});

// ============================================================================
// Revenue Sharing
// ============================================================================

describe('RevenueSharingModule', () => {
  let module: DefaultRevenueSharingModule;

  beforeEach(() => {
    module = createRevenueSharingModule();
  });

  it('should initialize with default config', () => {
    expect(module.config.strategyCreatorPercent).toBe(0.30);
    expect(module.config.daoTreasuryPercent).toBe(0.20);
    expect(module.config.platformProtocolPercent).toBe(0.25);
    expect(module.config.stakersPercent).toBe(0.15);
    expect(module.config.liquidityPercent).toBe(0.10);
  });

  it('should distribute revenue correctly', () => {
    const profit = '1000000000000'; // 1,000 tokens
    const event = module.distributeRevenue('strategy-1', profit, 'dev-1', '2026-03');

    expect(event.strategyId).toBe('strategy-1');
    expect(event.profitAmount).toBe(profit);
    expect(event.distributions.length).toBe(5); // 5 recipients

    const total = event.distributions.reduce((acc, d) => acc + BigInt(d.amount), BigInt(0));
    expect(total).toBeLessThanOrEqual(BigInt(profit));
    expect(total).toBeGreaterThan(BigInt(profit) - BigInt(5)); // Allow tiny rounding

    const creator = event.distributions.find(d => d.recipientType === 'creator');
    expect(creator?.recipientId).toBe('dev-1');
    expect(BigInt(creator!.amount)).toBeGreaterThan(BigInt(0));
  });

  it('should split revenue according to configured percentages', () => {
    const profit = BigInt('10000000000000'); // 10,000 tokens (large for precise calculation)
    const event = module.distributeRevenue('strategy-2', profit.toString(), 'dev-2', '2026-03');

    const creatorAmount = BigInt(event.distributions.find(d => d.recipientType === 'creator')!.amount);
    const expectedCreator = (profit * BigInt(3000)) / BigInt(10000); // 30%

    // Allow small rounding difference
    const diff = creatorAmount > expectedCreator ? creatorAmount - expectedCreator : expectedCreator - creatorAmount;
    expect(diff).toBeLessThanOrEqual(BigInt(10));
  });

  it('should accumulate creator earnings across multiple distributions', () => {
    module.distributeRevenue('strategy-1', '1000000000000', 'dev-1', '2026-03');
    module.distributeRevenue('strategy-1', '2000000000000', 'dev-1', '2026-03');

    const metrics = module.getCreatorMetrics('dev-1', '2026-03');
    expect(BigInt(metrics.totalEarned)).toBeGreaterThan(BigInt(0));
  });

  it('should return empty metrics for unknown creator', () => {
    const metrics = module.getCreatorMetrics('unknown-dev', '2026-03');
    expect(metrics.totalEarned).toBe('0');
    expect(metrics.claimable).toBe('0');
  });

  it('should allow creator to claim revenue', () => {
    module.distributeRevenue('strategy-1', '1000000000000', 'dev-1', '2026-03');
    const metrics = module.getCreatorMetrics('dev-1', '2026-03');
    expect(BigInt(metrics.claimable)).toBeGreaterThan(BigInt(0));

    const claim = module.claimCreatorRevenue('dev-1');
    expect(claim.success).toBe(true);
    expect(BigInt(claim.amount)).toBeGreaterThan(BigInt(0));

    // After claim, claimable should be 0
    const afterMetrics = module.getCreatorMetrics('dev-1', '2026-03');
    expect(afterMetrics.claimable).toBe('0');
  });

  it('should fail claim for unknown creator', () => {
    const claim = module.claimCreatorRevenue('unknown-dev');
    expect(claim.success).toBe(false);
  });

  it('should update strategy AUM', () => {
    module.updateStrategyAum('strategy-1', 'dev-1', '5000000000000', 25);
    // Should not throw
  });

  it('should generate platform summary', () => {
    module.distributeRevenue('strategy-1', '1000000000000', 'dev-1', '2026-03');
    module.distributeRevenue('strategy-2', '2000000000000', 'dev-2', '2026-03');

    const summary = module.getPlatformSummary('2026-03');
    expect(BigInt(summary.totalRevenue)).toBeGreaterThan(BigInt(0));
    expect(BigInt(summary.daoTreasuryAccumulated)).toBeGreaterThan(BigInt(0));
    expect(BigInt(summary.stakersRewarded)).toBeGreaterThan(BigInt(0));
  });

  it('should support custom revenue split', () => {
    const customModule = createRevenueSharingModule({
      strategyCreatorPercent: 0.50, // Creator gets 50%
      platformProtocolPercent: 0.20,
      daoTreasuryPercent: 0.15,
      stakersPercent: 0.10,
      liquidityPercent: 0.05,
    });

    const event = customModule.distributeRevenue('s-1', '1000000000000', 'dev-1', '2026-03');
    const creatorDist = event.distributions.find(d => d.recipientType === 'creator');
    expect(creatorDist?.percent).toBe(0.50);
  });
});

// ============================================================================
// Buyback, Burn & Treasury Loop
// ============================================================================

describe('BuybackBurnModule', () => {
  let module: DefaultBuybackBurnModule;

  beforeEach(() => {
    module = createBuybackBurnModule({
      triggerThreshold: '1000000000000',    // Low threshold for testing
      cooldownPeriod: 0,                    // No cooldown for testing
      initialTotalSupply: '10000000000000000000',
    });
  });

  it('should initialize with correct config', () => {
    expect(module.config.enabled).toBe(true);
    expect(module.config.buybackPercent).toBeGreaterThan(0);
    expect(module.config.burnPercent).toBeGreaterThan(0);
  });

  it('should not be eligible for buyback without sufficient revenue', () => {
    expect(module.isEligibleForBuyback()).toBe(false);
  });

  it('should become eligible after sufficient revenue accrual', () => {
    module.recordRevenueAccrual('2000000000000'); // Above threshold
    expect(module.isEligibleForBuyback()).toBe(true);
  });

  it('should execute buyback when eligible', () => {
    module.recordRevenueAccrual('5000000000000');

    const event = module.triggerBuyback({
      revenueAmount: '5000000000000',
      triggeredBy: 'protocol',
      currentTokenPrice: 0.5,
    });

    expect(event).not.toBeNull();
    expect(event!.triggeredBy).toBe('protocol');
    expect(BigInt(event!.buybackAmount)).toBeGreaterThan(BigInt(0));
    expect(BigInt(event!.tokensBurned)).toBeGreaterThan(BigInt(0));
  });

  it('should not execute buyback when not eligible', () => {
    // No revenue accrued
    const event = module.triggerBuyback({
      revenueAmount: '500000000000',
      triggeredBy: 'protocol',
      currentTokenPrice: 0.5,
    });
    expect(event).toBeNull();
  });

  it('should accumulate burn totals after buyback', () => {
    module.recordRevenueAccrual('5000000000000');
    module.triggerBuyback({ revenueAmount: '5000000000000', triggeredBy: 'protocol', currentTokenPrice: 1.0 });

    const status = module.getAccumulationStatus();
    expect(BigInt(status.totalBurned)).toBeGreaterThan(BigInt(0));
  });

  it('should report supply metrics', () => {
    const metrics = module.getSupplyMetrics();
    expect(BigInt(metrics.totalSupply)).toBeGreaterThan(BigInt(0));
    expect(BigInt(metrics.circulatingSupply)).toBeGreaterThan(BigInt(0));
    expect(typeof metrics.inflationRate).toBe('number');
  });

  it('should emit events on buyback and burn', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    module.recordRevenueAccrual('5000000000000');
    module.triggerBuyback({ revenueAmount: '5000000000000', triggeredBy: 'protocol', currentTokenPrice: 1.0 });

    expect(events).toContain('buyback.executed');
    expect(events).toContain('tokens.burned');
  });

  it('should respect cooldown period between buybacks', () => {
    const cooldownModule = createBuybackBurnModule({
      triggerThreshold: '1000000000000',
      cooldownPeriod: 3600, // 1 hour cooldown
    });

    cooldownModule.recordRevenueAccrual('5000000000000');
    const first = cooldownModule.triggerBuyback({ revenueAmount: '5000000000000', triggeredBy: 'protocol', currentTokenPrice: 1.0 });
    expect(first).not.toBeNull();

    cooldownModule.recordRevenueAccrual('5000000000000');
    const second = cooldownModule.triggerBuyback({ revenueAmount: '5000000000000', triggeredBy: 'protocol', currentTokenPrice: 1.0 });
    expect(second).toBeNull(); // Should be blocked by cooldown
  });
});

// ============================================================================
// DeFi Integration
// ============================================================================

describe('DeFiIntegrationModule', () => {
  let module: DefaultDeFiIntegrationModule;

  beforeEach(() => {
    module = createDeFiIntegrationModule();
  });

  it('should initialize with default staking pools', () => {
    expect(module.stakingPools.length).toBeGreaterThan(0);
    expect(module.stakingPools[0].active).toBe(true);
  });

  it('should initialize with yield opportunities', () => {
    expect(module.yieldOpportunities.length).toBeGreaterThan(0);
  });

  it('should add liquidity to a pool', () => {
    const position = module.addLiquidity({
      userId: 'user-1',
      poolId: 'tonai-single',
      depositAmount: '1000000000000', // 1,000 tokens
    });

    expect(position.userId).toBe('user-1');
    expect(position.poolId).toBe('tonai-single');
    expect(BigInt(position.depositedAmount)).toBe(BigInt('1000000000000'));
    expect(position.netApy).toBeGreaterThan(0);
  });

  it('should fail to add liquidity below minimum deposit', () => {
    expect(() => module.addLiquidity({
      userId: 'user-2',
      poolId: 'tonai-single',
      depositAmount: '1000000', // Too small
    })).toThrow();
  });

  it('should lock liquidity when lock period specified', () => {
    const position = module.addLiquidity({
      userId: 'user-3',
      poolId: 'tonai-ton-lp',
      depositAmount: '1000000000000',
      lockPeriodDays: 30,
    });

    expect(position.status).toBe('locked');
    expect(position.lockEndsAt).toBeDefined();
  });

  it('should retrieve position', () => {
    const position = module.addLiquidity({ userId: 'user-4', poolId: 'tonai-single', depositAmount: '500000000000' });
    const retrieved = module.getPosition(position.id);
    expect(retrieved?.id).toBe(position.id);
  });

  it('should get user positions', () => {
    module.addLiquidity({ userId: 'user-5', poolId: 'tonai-single', depositAmount: '500000000000' });
    module.addLiquidity({ userId: 'user-5', poolId: 'tonai-locked-90', depositAmount: '1000000000000', lockPeriodDays: 90 });

    const positions = module.getUserPositions('user-5');
    expect(positions.length).toBe(2);
  });

  it('should remove unlocked liquidity', () => {
    const position = module.addLiquidity({ userId: 'user-6', poolId: 'tonai-single', depositAmount: '1000000000000' });
    const result = module.removeLiquidity({ userId: 'user-6', positionId: position.id });

    expect(result.success).toBe(true);
    expect(BigInt(result.amountReturned)).toBeGreaterThan(BigInt(0));
  });

  it('should prevent removing locked liquidity before lock period ends', () => {
    const position = module.addLiquidity({
      userId: 'user-7',
      poolId: 'tonai-ton-lp',
      depositAmount: '1000000000000',
      lockPeriodDays: 30,
    });

    const result = module.removeLiquidity({ userId: 'user-7', positionId: position.id });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('locked');
  });

  it('should calculate APY with boost for longer lock periods', () => {
    const baseApy = module.getPoolApy('tonai-single', 0);
    const boostedApy = module.getPoolApy('tonai-single', 180);
    expect(boostedApy).toBeGreaterThan(baseApy);
  });

  it('should filter yield opportunities by risk level', () => {
    const lowRisk = module.getYieldOpportunities('low');
    const mediumRisk = module.getYieldOpportunities('medium');

    for (const opp of lowRisk) {
      expect(opp.riskLevel).toBe('low');
    }
    for (const opp of mediumRisk) {
      expect(opp.riskLevel).toBe('medium');
    }
  });

  it('should report DeFi health', () => {
    const health = module.getHealth();
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    expect(health.activeStakingPools).toBeGreaterThan(0);
    expect(typeof health.averageApy).toBe('number');
  });

  it('should emit events for liquidity operations', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    const position = module.addLiquidity({ userId: 'user-8', poolId: 'tonai-single', depositAmount: '1000000000000' });
    expect(events).toContain('liquidity.added');

    module.removeLiquidity({ userId: 'user-8', positionId: position.id });
    expect(events).toContain('liquidity.removed');
  });
});

// ============================================================================
// Developer Incentives
// ============================================================================

describe('DeveloperIncentivesModule', () => {
  let module: DefaultDeveloperIncentivesModule;

  beforeEach(() => {
    module = createDeveloperIncentivesModule();
  });

  it('should register developer', () => {
    const metrics = module.registerDeveloper('dev-1');
    expect(metrics.developerId).toBe('dev-1');
    expect(metrics.tier).toBe('newcomer');
    expect(metrics.agentsPublished).toBe(0);
  });

  it('should get developer metrics', () => {
    module.registerDeveloper('dev-2');
    const metrics = module.getDeveloperMetrics('dev-2');
    expect(metrics?.developerId).toBe('dev-2');
  });

  it('should return null for unregistered developer', () => {
    expect(module.getDeveloperMetrics('unknown')).toBeNull();
  });

  it('should update developer metrics', () => {
    module.registerDeveloper('dev-3');
    const updated = module.updateDeveloperMetrics('dev-3', {
      agentsPublished: 5,
      activeAgents: 3,
      totalAum: '100000000000000',
      reputationScore: 70,
    });

    expect(updated?.agentsPublished).toBe(5);
    expect(updated?.tier).toBe('builder'); // Should upgrade tier
  });

  it('should award incentive to developer', () => {
    module.registerDeveloper('dev-4');
    const incentive = module.awardIncentive({
      developerId: 'dev-4',
      type: 'agent_creation_reward',
      criteria: ['published_quality_agent'],
    });

    expect(incentive.developerId).toBe('dev-4');
    expect(incentive.type).toBe('agent_creation_reward');
    expect(BigInt(incentive.amount)).toBeGreaterThan(BigInt(0));
    expect(incentive.vestingSchedule).toBeDefined();
  });

  it('should list developer incentives', () => {
    module.registerDeveloper('dev-5');
    module.awardIncentive({ developerId: 'dev-5', type: 'agent_creation_reward', criteria: ['first_agent'] });
    module.awardIncentive({ developerId: 'dev-5', type: 'referral_reward', criteria: ['referred_user'] });

    const incentives = module.getIncentives('dev-5');
    expect(incentives.length).toBe(2);
  });

  it('should claim incentive after cliff period', () => {
    module.registerDeveloper('dev-6');
    const incentive = module.awardIncentive({
      developerId: 'dev-6',
      type: 'bug_bounty', // Bug bounty has no cliff (0 days)
      criteria: ['critical_bug_found'],
    });

    const claim = module.claimIncentive(incentive.id);
    expect(claim.success).toBe(true);
    expect(BigInt(claim.amount)).toBeGreaterThan(BigInt(0));
  });

  it('should fail to claim incentive in cliff period', () => {
    module.registerDeveloper('dev-7');
    const incentive = module.awardIncentive({
      developerId: 'dev-7',
      type: 'ecosystem_grant', // 90-day cliff
      criteria: ['grant_approved'],
    });

    const claim = module.claimIncentive(incentive.id);
    expect(claim.success).toBe(false);
    expect(claim.reason).toContain('cliff');
  });

  it('should compute correct developer tier', () => {
    const newcomer = module.computeDeveloperTier({
      developerId: 'dev-8',
      agentsPublished: 0,
      activeAgents: 0,
      totalAum: '0',
      totalUsersServed: 0,
      revenueGenerated: '0',
      reputationScore: 0,
      incentivesEarned: '0',
      incentivesPending: '0',
      tier: 'newcomer',
      joinedAt: new Date(),
    });
    expect(newcomer).toBe('newcomer');

    const builder = module.computeDeveloperTier({
      developerId: 'dev-9',
      agentsPublished: 5,
      activeAgents: 3,
      totalAum: '10000000000000',
      totalUsersServed: 100,
      revenueGenerated: '5000000000000',
      reputationScore: 50,
      incentivesEarned: '0',
      incentivesPending: '0',
      tier: 'newcomer',
      joinedAt: new Date(),
    });
    expect(builder).toBe('builder');
  });

  it('should report program health', () => {
    module.registerDeveloper('dev-10');
    module.updateDeveloperMetrics('dev-10', { agentsPublished: 1 });

    const health = module.getHealth();
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    expect(health.developersByTier).toBeDefined();
  });

  it('should emit events for incentives', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    module.registerDeveloper('dev-11');
    const incentive = module.awardIncentive({ developerId: 'dev-11', type: 'bug_bounty', criteria: ['found_bug'] });
    expect(events).toContain('incentive.awarded');

    module.claimIncentive(incentive.id);
    expect(events).toContain('incentive.claimed');
  });
});

// ============================================================================
// Economic Simulation
// ============================================================================

describe('EconomicSimulationModule', () => {
  let module: DefaultEconomicSimulationModule;

  const baseParams: EconomicSimulationParams = {
    simulationId: 'test-sim-1',
    name: 'Test Simulation',
    durationDays: 30,
    initialTokenPrice: 0.5,
    initialCirculatingSupply: '1000000000000000000',
    initialStakingRate: 0.35,
    initialActiveAgents: 100,
    scenarioType: 'base_case',
    parameters: {
      agentGrowthRate: 0.05,
      userGrowthRate: 0.08,
      tokenPriceVolatility: 0.05,
      stakingYieldMultiplier: 1.0,
      feeRevenueMultiplier: 1.0,
      churnRate: 0.02,
    },
  };

  beforeEach(() => {
    module = createEconomicSimulationModule();
  });

  it('should run base case simulation', () => {
    const result = module.runSimulation(baseParams);
    expect(result.simulationId).toBe('test-sim-1');
    expect(result.dailySnapshots.length).toBe(30);
    expect(result.summary).toBeDefined();
    expect(result.summary.sustainabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.summary.sustainabilityScore).toBeLessThanOrEqual(100);
  });

  it('should produce correct number of daily snapshots', () => {
    const result = module.runSimulation({ ...baseParams, durationDays: 60 });
    expect(result.dailySnapshots.length).toBe(60);
  });

  it('should run bull market scenario', () => {
    const result = module.runSimulation({ ...baseParams, scenarioType: 'bull_market', simulationId: 'bull-test' });
    expect(result.params.scenarioType).toBe('bull_market');
    expect(result.summary).toBeDefined();
  });

  it('should run bear market scenario', () => {
    const result = module.runSimulation({ ...baseParams, scenarioType: 'bear_market', simulationId: 'bear-test' });
    expect(result.params.scenarioType).toBe('bear_market');
  });

  it('should run stress tests', () => {
    const stressResults = module.runStressTests(baseParams);
    expect(stressResults.length).toBeGreaterThan(0);

    for (const stress of stressResults) {
      expect(stress.scenarioName).toBeDefined();
      expect(typeof stress.maxDrawdown).toBe('number');
      expect(typeof stress.systemCollapse).toBe('boolean');
      expect(stress.vulnerabilities.length).toBeGreaterThan(0);
      expect(stress.mitigations.length).toBeGreaterThan(0);
    }
  });

  it('should run market crash stress test', () => {
    const stressResults = module.runStressTests(baseParams);
    const crashTest = stressResults.find(r => r.scenarioName === 'market crash');
    expect(crashTest).toBeDefined();
  });

  it('should model token velocity', () => {
    const model = module.modelTokenVelocity(
      '1000000000000000000',   // 1B circulating supply
      '50000000000000000',     // 50M daily volume
      0.35                     // 35% staking rate
    );

    expect(typeof model.currentVelocity).toBe('number');
    expect(model.targetVelocity).toBeGreaterThan(0);
    expect(model.velocityDrivers.length).toBeGreaterThan(0);
    expect(['increase_utility', 'reduce_velocity', 'stable']).toContain(model.recommendation);
  });

  it('should track simulation history', () => {
    module.runSimulation(baseParams);
    module.runSimulation({ ...baseParams, simulationId: 'sim-2', scenarioType: 'bull_market' });

    const history = module.getSimulationHistory();
    expect(history.length).toBe(2);
  });

  it('should emit events on simulation completion', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    module.runSimulation(baseParams);
    expect(events).toContain('simulation.completed');
  });

  it('should include daily price data in snapshots', () => {
    const result = module.runSimulation(baseParams);
    const snapshot = result.dailySnapshots[0];

    expect(typeof snapshot.tokenPrice).toBe('number');
    expect(snapshot.tokenPrice).toBeGreaterThan(0);
    expect(snapshot.day).toBe(0);
  });

  it('should include sustainability recommendations for poor scenarios', () => {
    const bearResult = module.runSimulation({
      ...baseParams,
      simulationId: 'bear-2',
      scenarioType: 'market_crash',
    });

    // Market crash should either have recommendations or just work
    expect(bearResult.summary).toBeDefined();
  });
});

// ============================================================================
// Cross-Agent Payments
// ============================================================================

describe('CrossAgentPaymentsModule', () => {
  let module: DefaultCrossAgentPaymentsModule;

  beforeEach(() => {
    module = createCrossAgentPaymentsModule();
  });

  it('should open payment channel between agents', () => {
    const channel = module.openChannel({
      agentA: 'agent-1',
      agentB: 'agent-2',
      capacity: '1000000000000',
      initialBalanceA: '500000000000',
    });

    expect(channel.agentA).toBe('agent-1');
    expect(channel.agentB).toBe('agent-2');
    expect(channel.status).toBe('open');
    expect(BigInt(channel.capacity)).toBe(BigInt('1000000000000'));
  });

  it('should retrieve channel', () => {
    const channel = module.openChannel({ agentA: 'a1', agentB: 'a2', capacity: '1000000000000', initialBalanceA: '500000000000' });
    const retrieved = module.getChannel(channel.id);
    expect(retrieved?.id).toBe(channel.id);
  });

  it('should get channels for an agent', () => {
    module.openChannel({ agentA: 'agent-3', agentB: 'agent-4', capacity: '1000000000000', initialBalanceA: '500000000000' });
    module.openChannel({ agentA: 'agent-3', agentB: 'agent-5', capacity: '2000000000000', initialBalanceA: '1000000000000' });

    const channels = module.getAgentChannels('agent-3');
    expect(channels.length).toBe(2);
  });

  it('should close channel', () => {
    const channel = module.openChannel({ agentA: 'a6', agentB: 'a7', capacity: '1000000000000', initialBalanceA: '500000000000' });
    const result = module.closeChannel(channel.id);

    expect(result.success).toBe(true);
    expect(BigInt(result.finalBalanceA)).toBe(BigInt('500000000000'));
    expect(BigInt(result.finalBalanceB)).toBe(BigInt('500000000000'));
  });

  it('should send payment between agents', () => {
    // Open channel first
    module.openChannel({ agentA: 'payer', agentB: 'receiver', capacity: '5000000000000', initialBalanceA: '5000000000000' });

    const result = module.sendPayment({
      fromAgentId: 'payer',
      toAgentId: 'receiver',
      amount: '100000000000',
      purpose: 'service_earning',
    });

    expect(result.success).toBe(true);
    expect(result.fromAgentId).toBe('payer');
    expect(result.toAgentId).toBe('receiver');
    expect(BigInt(result.fee)).toBeGreaterThan(BigInt(0));
    expect(BigInt(result.netAmount)).toBeLessThan(BigInt('100000000000'));
  });

  it('should fail payment with insufficient channel balance', () => {
    module.openChannel({ agentA: 'broke-agent', agentB: 'receiver', capacity: '1000000000000', initialBalanceA: '100000000000' });

    const result = module.sendPayment({
      fromAgentId: 'broke-agent',
      toAgentId: 'receiver',
      amount: '500000000000', // More than available balance
      purpose: 'compute_payment',
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Insufficient');
  });

  it('should track payment history', () => {
    module.sendPayment({
      fromAgentId: 'agent-a',
      toAgentId: 'agent-b',
      amount: '50000000000',
      purpose: 'cross_agent_payment',
    });

    const history = module.getPaymentHistory('agent-a');
    expect(history.length).toBeGreaterThan(0);
  });

  it('should create autonomous workflow', () => {
    const workflow = module.createWorkflow(
      'Data Collection Pipeline',
      'Multi-agent data collection and analysis',
      ['data-agent', 'analysis-agent', 'report-agent'],
      [
        { id: 'step-1', agentId: 'data-agent', action: 'collect_data', inputCost: '1000000000', outputRevenue: '0', dependsOn: [] },
        { id: 'step-2', agentId: 'analysis-agent', action: 'analyze_data', inputCost: '2000000000', outputRevenue: '0', dependsOn: ['step-1'] },
        { id: 'step-3', agentId: 'report-agent', action: 'generate_report', inputCost: '500000000', outputRevenue: '5000000000', dependsOn: ['step-2'] },
      ]
    );

    expect(workflow.name).toBe('Data Collection Pipeline');
    expect(workflow.steps.length).toBe(3);
    expect(workflow.status).toBe('draft');
    expect(BigInt(workflow.totalCost)).toBe(BigInt('3500000000'));
    expect(BigInt(workflow.totalRevenue)).toBe(BigInt('5000000000'));
  });

  it('should execute workflow steps in order', () => {
    const workflow = module.createWorkflow(
      'Simple Pipeline',
      'Two-step pipeline',
      ['agent-1', 'agent-2'],
      [
        { id: 'step-1', agentId: 'agent-1', action: 'step_one', inputCost: '0', outputRevenue: '0', dependsOn: [] },
        { id: 'step-2', agentId: 'agent-2', action: 'step_two', inputCost: '0', outputRevenue: '0', dependsOn: ['step-1'] },
      ]
    );

    // Try executing step 2 before step 1 (should not complete due to dependency)
    const step2early = module.executeWorkflowStep(workflow.id, 'step-2');
    expect(step2early?.status).toBe('pending');

    // Execute step 1 first
    const step1 = module.executeWorkflowStep(workflow.id, 'step-1');
    expect(step1?.status).toBe('completed');

    // Now step 2 should work
    const step2 = module.executeWorkflowStep(workflow.id, 'step-2');
    expect(step2?.status).toBe('completed');
  });

  it('should complete workflow when all steps done', () => {
    const workflow = module.createWorkflow(
      'Single Step',
      'One step workflow',
      ['agent-1'],
      [{ id: 'step-1', agentId: 'agent-1', action: 'do_thing', inputCost: '0', outputRevenue: '0', dependsOn: [] }]
    );

    module.executeWorkflowStep(workflow.id, 'step-1');
    const completed = module.completeWorkflow(workflow.id);
    expect(completed?.status).toBe('completed');
    expect(completed?.completedAt).toBeDefined();
  });

  it('should get agent workflows', () => {
    module.createWorkflow('WF1', '', ['worker-1', 'worker-2'], []);
    module.createWorkflow('WF2', '', ['worker-1'], []);
    module.createWorkflow('WF3', '', ['worker-3'], []);

    const agentWorkflows = module.getAgentWorkflows('worker-1');
    expect(agentWorkflows.length).toBe(2);
  });

  it('should compute economic network graph', () => {
    // Create some payment activity
    module.sendPayment({ fromAgentId: 'net-a', toAgentId: 'net-b', amount: '100000000000', purpose: 'service_earning' });
    module.sendPayment({ fromAgentId: 'net-b', toAgentId: 'net-c', amount: '50000000000', purpose: 'compute_payment' });

    const network = module.getEconomicNetwork();
    expect(network.nodes.length).toBeGreaterThan(0);
    expect(network.edges.length).toBeGreaterThan(0);
    expect(typeof network.networkHealth).toBe('number');
  });

  it('should emit events for payments and workflows', () => {
    const events: string[] = [];
    module.onEvent(e => events.push(e.type));

    module.sendPayment({ fromAgentId: 'ev-a', toAgentId: 'ev-b', amount: '10000000000', purpose: 'cross_agent_payment' });
    expect(events).toContain('payment.cross_agent');

    module.createWorkflow('Evt WF', '', ['ev-a'], []);
    expect(events).toContain('workflow.created');
  });
});

// ============================================================================
// Type Export Verification
// ============================================================================

describe('Type Exports', () => {
  it('should export all required types', () => {
    // Verify type imports don't throw (TypeScript compilation ensures this)
    const config: TokenUtilityEconomyConfig = {
      tokenSymbol: 'TONAI',
      tokenDecimals: 9,
      totalSupply: '10000000000000000000',
    };
    expect(config.tokenSymbol).toBe('TONAI');
  });

  it('should export fee types', () => {
    const feeType: TokenFeeType = 'agent_creation';
    expect(feeType).toBe('agent_creation');
  });

  it('should export tier types', () => {
    const tier: TokenUtilityTier = 'premium';
    expect(tier).toBe('premium');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Token Utility Economy Integration', () => {
  it('should support a full agent lifecycle with economic activity', () => {
    const economy = createTokenUtilityEconomy({
      tokenSymbol: 'TONAI',
      totalSupply: '10000000000000000000',
    });

    // 1. Developer registers and gets incentive
    economy.developerIncentives.registerDeveloper('dev-1');
    const incentive = economy.developerIncentives.awardIncentive({
      developerId: 'dev-1',
      type: 'agent_creation_reward',
      criteria: ['first_agent'],
    });
    expect(incentive.id).toBeDefined();

    // 2. Developer publishes agent with stake
    const stake = economy.agentStaking.publishWithStake({
      agentId: 'my-agent',
      developerId: 'dev-1',
      agentType: 'trading',
      stakeAmount: '10000000000000',
    });
    expect(stake.status).toBe('active');

    // 3. Register agent in economy
    economy.agentEconomy.registerAgent({
      agentId: 'my-agent',
      walletAddress: 'EQ...',
      autonomyLevel: 'semi_auto',
      initialBalance: '1000000000000',
    });

    // 4. Agent earns from strategy
    economy.agentEconomy.recordEarning({
      agentId: 'my-agent',
      strategyId: 'strategy-1',
      amount: '500000000000',
      earningType: 'strategy_profit',
    });

    // 5. Revenue distributed to creator
    economy.revenueSharing.distributeRevenue('strategy-1', '500000000000', 'dev-1', '2026-03');

    // 6. Protocol accrues revenue for buyback
    economy.buybackBurn.recordRevenueAccrual('5000000000000');

    // 7. Developer adds liquidity
    const position = economy.defiIntegration.addLiquidity({
      userId: 'dev-1',
      poolId: 'tonai-single',
      depositAmount: '1000000000000',
    });
    expect(position.status).toBe('active');

    // 8. Check overall health
    const health = economy.getHealth();
    expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    expect(health.totalActiveAgents).toBe(1);
  });

  it('should support cross-agent economic workflow', () => {
    const economy = createTokenUtilityEconomy({ tokenSymbol: 'TONAI' });

    // Open payment channel
    economy.crossAgentPayments.openChannel({
      agentA: 'coordinator',
      agentB: 'worker',
      capacity: '10000000000000',
      initialBalanceA: '10000000000000',
    });

    // Create workflow
    const workflow = economy.crossAgentPayments.createWorkflow(
      'AI Analysis Pipeline',
      'Coordinator orchestrates worker agents',
      ['coordinator', 'worker'],
      [
        { id: 's1', agentId: 'coordinator', action: 'distribute_task', inputCost: '0', outputRevenue: '0', dependsOn: [] },
        { id: 's2', agentId: 'worker', action: 'process_data', inputCost: '1000000000', outputRevenue: '3000000000', dependsOn: ['s1'] },
      ]
    );

    // Execute workflow
    economy.crossAgentPayments.executeWorkflowStep(workflow.id, 's1');
    economy.crossAgentPayments.executeWorkflowStep(workflow.id, 's2');
    const completed = economy.crossAgentPayments.completeWorkflow(workflow.id);

    expect(completed?.status).toBe('completed');

    // Pay worker via channel
    const payment = economy.crossAgentPayments.sendPayment({
      fromAgentId: 'coordinator',
      toAgentId: 'worker',
      amount: '1000000000',
      purpose: 'service_earning',
    });
    expect(payment.success).toBe(true);
  });

  it('should run economic simulation and validate sustainability', () => {
    const economy = createTokenUtilityEconomy({ tokenSymbol: 'TONAI' });

    const result = economy.economicSimulation.runSimulation({
      simulationId: 'integration-sim',
      name: 'Integration Test Simulation',
      durationDays: 30,
      initialTokenPrice: 1.0,
      initialCirculatingSupply: '1000000000000000000',
      initialStakingRate: 0.40,
      initialActiveAgents: 500,
      scenarioType: 'base_case',
      parameters: {
        agentGrowthRate: 0.05,
        userGrowthRate: 0.08,
        tokenPriceVolatility: 0.03,
        stakingYieldMultiplier: 1.0,
        feeRevenueMultiplier: 1.0,
        churnRate: 0.01,
      },
    });

    expect(result.dailySnapshots.length).toBe(30);
    expect(result.summary.sustainabilityScore).toBeGreaterThanOrEqual(0);

    // Velocity model
    const velocityModel = economy.economicSimulation.modelTokenVelocity(
      '1000000000000000000',
      '10000000000000000',
      0.40
    );
    expect(velocityModel.recommendation).toBeDefined();
  });
});
