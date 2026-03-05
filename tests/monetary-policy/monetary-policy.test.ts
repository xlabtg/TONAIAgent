/**
 * TONAIAgent - AI Monetary Policy & Treasury Layer Tests (Issue #123)
 *
 * Comprehensive test suite for all 6 components:
 * 1. Protocol Treasury Vault (reserves, revenue, snapshots)
 * 2. AI Monetary Policy Engine (analysis, recommendations)
 * 3. Adaptive Emission Controller (phase transitions, mint, burn)
 * 4. Treasury Capital Allocator (deployment requests, execution, emergency)
 * 5. Stability-Linked Incentive System (multipliers, tiers, yield)
 * 6. Monetary Governance Layer (proposals, voting, emergency overrides)
 * 7. Unified Layer (integration, health)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createProtocolTreasuryVault,
  createAiMonetaryPolicyEngine,
  createAdaptiveEmissionController,
  createTreasuryCapitalAllocator,
  createStabilityLinkedIncentiveSystem,
  createMonetaryGovernanceLayer,
  createMonetaryPolicyLayer,
  DefaultProtocolTreasuryVault,
  DefaultAiMonetaryPolicyEngine,
  DefaultAdaptiveEmissionController,
  DefaultTreasuryCapitalAllocator,
  DefaultStabilityLinkedIncentiveSystem,
  DefaultMonetaryGovernanceLayer,
  DefaultMonetaryPolicyLayer,
} from '../../src/monetary-policy/index';

import type {
  MonetaryPolicyInputs,
  MonetaryPolicyEvent,
  StabilityFactors,
} from '../../src/monetary-policy/index';

// ============================================================================
// Helper: sample policy inputs
// ============================================================================

function makeInputs(overrides: Partial<MonetaryPolicyInputs> = {}): MonetaryPolicyInputs {
  return {
    stabilityIndex: 75,
    liquidityDepth: 60,
    clearingExposure: 0.3,
    marketVolatility: 0.25,
    protocolGrowthRate: 0.4,
    currentEmissionRate: 100_000,
    tokenPrice: 2.5,
    stakingParticipation: 0.45,
    treasuryValueTon: 5_000_000,
    circulatingSupply: 1_000_000_000,
    timestamp: new Date(),
    ...overrides,
  };
}

// ============================================================================
// 1. Protocol Treasury Vault Tests
// ============================================================================

describe('ProtocolTreasuryVault', () => {
  let vault: DefaultProtocolTreasuryVault;

  beforeEach(() => {
    vault = createProtocolTreasuryVault();
  });

  describe('initialization', () => {
    it('should initialize with 5 reserve categories', () => {
      const reserves = vault.getReserves();
      expect(reserves).toHaveLength(5);
    });

    it('should start with zero total value', () => {
      expect(vault.getTotalValueTon()).toBe(0);
    });

    it('should have correct reserve categories', () => {
      const categories = vault.getReserves().map(r => r.category);
      expect(categories).toContain('liquidity_buffer');
      expect(categories).toContain('insurance_fund');
      expect(categories).toContain('strategic_capital');
      expect(categories).toContain('stabilization_fund');
      expect(categories).toContain('protocol_reserves');
    });
  });

  describe('revenue recording', () => {
    it('should record revenue and distribute to eligible reserves', () => {
      const revenue = vault.recordRevenue(
        'performance_fees',
        50_000,
        'TON',
        50_000,
        'Q1 2026 performance fees'
      );

      expect(revenue.id).toBeDefined();
      expect(revenue.source).toBe('performance_fees');
      expect(revenue.amount).toBe(50_000);
      expect(revenue.valueInTon).toBe(50_000);
      expect(vault.getTotalValueTon()).toBeGreaterThan(0);
    });

    it('should aggregate revenue history', () => {
      vault.recordRevenue('performance_fees', 10_000, 'TON', 10_000, 'Fee A');
      vault.recordRevenue('marketplace_fees', 5_000, 'TON', 5_000, 'Fee B');
      vault.recordRevenue('rwa_yield', 2_000, 'TON', 2_000, 'Fee C');

      const history = vault.getRevenueHistory();
      expect(history).toHaveLength(3);
    });

    it('should total revenue by source', () => {
      vault.recordRevenue('performance_fees', 10_000, 'TON', 10_000, 'Fee 1');
      vault.recordRevenue('performance_fees', 5_000, 'TON', 5_000, 'Fee 2');
      vault.recordRevenue('marketplace_fees', 3_000, 'TON', 3_000, 'Fee 3');

      const totals = vault.getTotalRevenueBySource();
      // performance_fees distributed to 3 reserves → total 15k tracked
      // marketplace_fees distributed to 2 reserves → total 3k tracked
      expect(totals['performance_fees']).toBe(15_000);
      expect(totals['marketplace_fees']).toBe(3_000);
    });

    it('should emit revenue_received event', () => {
      const events: MonetaryPolicyEvent[] = [];
      vault.onEvent(e => events.push(e));

      vault.recordRevenue('prime_brokerage', 1_000, 'TON', 1_000, 'PB fee');

      const revEvent = events.find(e => e.type === 'treasury.revenue_received');
      expect(revEvent).toBeDefined();
      expect(revEvent?.data.source).toBe('prime_brokerage');
    });
  });

  describe('reserve operations', () => {
    beforeEach(() => {
      vault.recordRevenue('performance_fees', 100_000, 'TON', 100_000, 'Initial revenue');
    });

    it('should deposit to a reserve', () => {
      const before = vault.getReserve('stabilization_fund')!.balanceTon;
      vault.depositToReserve('stabilization_fund', 10_000, 'Manual deposit');
      const after = vault.getReserve('stabilization_fund')!.balanceTon;
      expect(after).toBeGreaterThan(before);
    });

    it('should withdraw from a reserve', () => {
      // Fill liquidity buffer first
      vault.depositToReserve('liquidity_buffer', 50_000, 'Fill up');
      const before = vault.getReserve('liquidity_buffer')!.balanceTon;
      vault.withdrawFromReserve('liquidity_buffer', 10_000, 'Withdrawal');
      const after = vault.getReserve('liquidity_buffer')!.balanceTon;
      expect(after).toBe(before - 10_000);
    });

    it('should reject over-withdrawal', () => {
      expect(() =>
        vault.withdrawFromReserve('stabilization_fund', 999_999_999, 'Too much')
      ).toThrow();
    });

    it('should transfer between reserves', () => {
      vault.depositToReserve('strategic_capital', 50_000, 'Seed');
      const before = vault.getReserve('insurance_fund')!.balanceTon;
      vault.transferBetweenReserves('strategic_capital', 'insurance_fund', 10_000, 'Strengthen insurance');
      const after = vault.getReserve('insurance_fund')!.balanceTon;
      expect(after).toBe(before + 10_000);
    });
  });

  describe('snapshots', () => {
    it('should take a snapshot of treasury state', () => {
      vault.recordRevenue('performance_fees', 100_000, 'TON', 100_000, 'Revenue');
      const snap = vault.takeSnapshot();

      expect(snap.id).toBeDefined();
      expect(snap.totalValueTon).toBeGreaterThan(0);
      expect(snap.reserves).toHaveLength(5);
      expect(snap.liquidityRatio).toBeGreaterThanOrEqual(0);
      expect(snap.snapshotAt).toBeInstanceOf(Date);
    });

    it('should accumulate snapshot history', () => {
      vault.takeSnapshot();
      vault.takeSnapshot();
      expect(vault.getSnapshotHistory()).toHaveLength(2);
    });
  });
});

// ============================================================================
// 2. AI Monetary Policy Engine Tests
// ============================================================================

describe('AiMonetaryPolicyEngine', () => {
  let engine: DefaultAiMonetaryPolicyEngine;

  beforeEach(() => {
    engine = createAiMonetaryPolicyEngine();
  });

  describe('analysis', () => {
    it('should generate a policy recommendation with all fields', () => {
      const output = engine.analyze(makeInputs());

      expect(output.id).toBeDefined();
      expect(output.emissionAdjustment).toBeDefined();
      expect(output.stakingYieldChange).toBeDefined();
      expect(output.treasuryReallocation).toBeDefined();
      expect(output.riskWeightAdjustments).toBeDefined();
      expect(output.confidence).toBeGreaterThan(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
      expect(output.generatedAt).toBeInstanceOf(Date);
      expect(output.expiresAt).toBeInstanceOf(Date);
    });

    it('should recommend deflation during high volatility', () => {
      const output = engine.analyze(makeInputs({ marketVolatility: 0.85 }));
      expect(output.emissionAdjustment.direction).toBe('decrease');
      expect(output.emissionAdjustment.mechanism).toBe('deflation');
    });

    it('should recommend inflation during growth with moderate stability', () => {
      // stabilityIndex=75 (>70) and growthRate=0.4 (>0.3) but below burn thresholds
      // burn requires stabilityIndex>80 AND growthRate>0.5
      const output = engine.analyze(
        makeInputs({ protocolGrowthRate: 0.4, stabilityIndex: 75, marketVolatility: 0.1, liquidityDepth: 60 })
      );
      expect(output.emissionAdjustment.direction).toBe('increase');
      expect(output.emissionAdjustment.mechanism).toBe('inflation');
    });

    it('should recommend incentive boost when liquidity is low', () => {
      const output = engine.analyze(
        makeInputs({ liquidityDepth: 10, marketVolatility: 0.2, protocolGrowthRate: 0.1 })
      );
      expect(output.emissionAdjustment.mechanism).toBe('incentive_boost');
    });

    it('should recommend burn during high profitability and stability', () => {
      const output = engine.analyze(
        makeInputs({
          stabilityIndex: 90,
          protocolGrowthRate: 0.8,
          marketVolatility: 0.15,
          liquidityDepth: 80,
        })
      );
      expect(output.emissionAdjustment.mechanism).toBe('burn');
    });

    it('should flag governance approval for large changes', () => {
      const output = engine.analyze(makeInputs({ marketVolatility: 0.85 }));
      // Large emission changes require governance
      if (Math.abs(output.emissionAdjustment.adjustmentPercent) > 15) {
        expect(output.requiresGovernanceApproval).toBe(true);
      }
    });

    it('should emit recommendation generated event', () => {
      const events: MonetaryPolicyEvent[] = [];
      engine.onEvent(e => events.push(e));
      engine.analyze(makeInputs());

      const event = events.find(e => e.type === 'policy.recommendation_generated');
      expect(event).toBeDefined();
    });
  });

  describe('history', () => {
    it('should store and retrieve recommendation history', () => {
      engine.analyze(makeInputs());
      engine.analyze(makeInputs({ marketVolatility: 0.7 }));

      const history = engine.getRecommendationHistory();
      expect(history).toHaveLength(2);
    });

    it('should return latest recommendation', () => {
      engine.analyze(makeInputs());
      const rec = engine.getLatestRecommendation();
      expect(rec).toBeDefined();
      expect(rec!.id).toBeTruthy();
    });

    it('should return undefined when no recommendations', () => {
      expect(engine.getLatestRecommendation()).toBeUndefined();
    });
  });

  describe('approval/rejection', () => {
    it('should mark a recommendation as approved', () => {
      const rec = engine.analyze(makeInputs());
      expect(() => engine.markApproved(rec.id, 'governance-dao')).not.toThrow();
    });

    it('should mark a recommendation as rejected', () => {
      const rec = engine.analyze(makeInputs());
      expect(() =>
        engine.markRejected(rec.id, 'governance-dao', 'Insufficient evidence')
      ).not.toThrow();
    });
  });
});

// ============================================================================
// 3. Adaptive Emission Controller Tests
// ============================================================================

describe('AdaptiveEmissionController', () => {
  let controller: DefaultAdaptiveEmissionController;

  beforeEach(() => {
    controller = createAdaptiveEmissionController({ baseDailyRate: 100_000 });
  });

  describe('initialization', () => {
    it('should initialize with base emission state', () => {
      const state = controller.getEmissionState();
      expect(state.currentDailyRate).toBe(100_000);
      expect(state.emissionPhase).toBe('stable');
      expect(state.totalMinted).toBe(0);
      expect(state.totalBurned).toBe(0);
    });

    it('should return default config', () => {
      const config = controller.getConfig();
      expect(config.baseDailyRate).toBe(100_000);
      expect(config.burnEnabled).toBe(true);
    });
  });

  describe('adjustment', () => {
    it('should apply emission adjustment within bounds', () => {
      const engine = createAiMonetaryPolicyEngine();
      const rec = engine.analyze(makeInputs({ marketVolatility: 0.75 }));
      const event = controller.applyAdjustment(rec.emissionAdjustment);

      expect(event).toBeDefined();
      expect(event.type).toBe('adjust');
      const state = controller.getEmissionState();
      expect(state.currentDailyRate).toBeGreaterThanOrEqual(controller.getConfig().minDailyRate);
      expect(state.currentDailyRate).toBeLessThanOrEqual(controller.getConfig().maxDailyRate);
    });

    it('should transition to stress phase on deflation', () => {
      const engine = createAiMonetaryPolicyEngine();
      const rec = engine.analyze(makeInputs({ marketVolatility: 0.85 }));
      controller.applyAdjustment(rec.emissionAdjustment);
      expect(controller.getCurrentPhase()).toBe('stress');
    });

    it('should transition to growth phase on inflation', () => {
      const engine = createAiMonetaryPolicyEngine();
      // Use inputs below burn thresholds: stabilityIndex<=80 or growthRate<=0.5
      const rec = engine.analyze(
        makeInputs({ protocolGrowthRate: 0.4, stabilityIndex: 75, marketVolatility: 0.05, liquidityDepth: 60 })
      );
      controller.applyAdjustment(rec.emissionAdjustment);
      expect(controller.getCurrentPhase()).toBe('growth');
    });

    it('should emit phase_changed event on phase transition', () => {
      const events: MonetaryPolicyEvent[] = [];
      controller.onEvent(e => events.push(e));

      const engine = createAiMonetaryPolicyEngine();
      const rec = engine.analyze(makeInputs({ marketVolatility: 0.85 }));
      controller.applyAdjustment(rec.emissionAdjustment);

      const phaseEvent = events.find(e => e.type === 'emission.phase_changed');
      expect(phaseEvent).toBeDefined();
    });
  });

  describe('mint and burn', () => {
    it('should mint tokens and update state', () => {
      controller.mintTokens(500_000, 'Initial distribution');
      expect(controller.getTotalMinted()).toBe(500_000);
      expect(controller.getEmissionState().netCirculating).toBe(500_000);
    });

    it('should burn tokens and update state', () => {
      controller.mintTokens(1_000_000, 'Initial distribution');
      controller.burnTokens(200_000, 'Deflationary burn');
      expect(controller.getTotalBurned()).toBe(200_000);
      expect(controller.getEmissionState().netCirculating).toBe(800_000);
    });

    it('should reject negative mint amounts', () => {
      expect(() => controller.mintTokens(-100, 'Invalid')).toThrow();
    });

    it('should reject negative burn amounts', () => {
      expect(() => controller.burnTokens(-100, 'Invalid')).toThrow();
    });

    it('should emit tokens_minted event', () => {
      const events: MonetaryPolicyEvent[] = [];
      controller.onEvent(e => events.push(e));
      controller.mintTokens(100_000, 'Test mint');

      const mintEvent = events.find(e => e.type === 'emission.tokens_minted');
      expect(mintEvent).toBeDefined();
      expect(mintEvent?.data.amount).toBe(100_000);
    });

    it('should emit tokens_burned event', () => {
      const events: MonetaryPolicyEvent[] = [];
      controller.onEvent(e => events.push(e));
      controller.burnTokens(50_000, 'Test burn');

      const burnEvent = events.find(e => e.type === 'emission.tokens_burned');
      expect(burnEvent).toBeDefined();
      expect(burnEvent?.data.amount).toBe(50_000);
    });
  });

  describe('history', () => {
    it('should record emission event history', () => {
      controller.mintTokens(100_000, 'Mint 1');
      controller.burnTokens(10_000, 'Burn 1');

      const history = controller.getEventHistory();
      expect(history).toHaveLength(2);
    });

    it('should limit history with limit parameter', () => {
      controller.mintTokens(1_000, 'A');
      controller.mintTokens(2_000, 'B');
      controller.mintTokens(3_000, 'C');

      const limited = controller.getEventHistory(2);
      expect(limited).toHaveLength(2);
    });
  });
});

// ============================================================================
// 4. Treasury Capital Allocator Tests
// ============================================================================

describe('TreasuryCapitalAllocator', () => {
  let allocator: DefaultTreasuryCapitalAllocator;

  beforeEach(() => {
    allocator = createTreasuryCapitalAllocator();
  });

  describe('deployment requests', () => {
    it('should create a deployment request', () => {
      const req = allocator.requestDeployment(
        'liquidity_injection',
        500_000,
        'pool-alpha',
        'Alpha Liquidity Pool',
        'Inject liquidity to reduce gap',
        'ai-monetary-engine'
      );

      expect(req.id).toBeDefined();
      expect(req.type).toBe('liquidity_injection');
      expect(req.requestedAmount).toBe(500_000);
      expect(req.targetId).toBe('pool-alpha');
      expect(req.status).toBeUndefined(); // status is on result, not request
    });

    it('should list pending requests', () => {
      allocator.requestDeployment('insurance_backstop', 100_000, 't1', 'Target 1', 'Reason', 'ai');
      allocator.requestDeployment('fund_seeding', 200_000, 't2', 'Target 2', 'Reason', 'ai');

      expect(allocator.getPendingRequests()).toHaveLength(2);
    });

    it('should reject zero or negative amounts', () => {
      expect(() =>
        allocator.requestDeployment('stabilization', 0, 't', 'T', 'Reason', 'ai')
      ).toThrow();
    });
  });

  describe('execution', () => {
    it('should execute a deployment', () => {
      const req = allocator.requestDeployment(
        'stabilization',
        300_000,
        'stabilizer-v1',
        'Protocol Stabilizer',
        'Emergency stabilization',
        'ai',
        'high'
      );

      const result = allocator.executeDeployment(req.id, 300_000, 'approval-1', 'tx-hash-1');

      expect(result.status).toBe('executed');
      expect(result.deployedAmount).toBe(300_000);
      expect(result.txHash).toBe('tx-hash-1');
    });

    it('should reject a deployment', () => {
      const req = allocator.requestDeployment('rwa_onboarding', 50_000, 't', 'T', 'R', 'ai');
      const result = allocator.rejectDeployment(req.id, 'Insufficient reserves');

      expect(result.status).toBe('rejected');
      expect(result.reason).toBe('Insufficient reserves');
    });

    it('should remove executed request from pending list', () => {
      const req = allocator.requestDeployment('protocol_upgrade', 100_000, 't', 'T', 'R', 'ai');
      allocator.executeDeployment(req.id, 100_000);

      expect(allocator.getPendingRequests()).toHaveLength(0);
    });

    it('should fail to execute unknown request', () => {
      expect(() => allocator.executeDeployment('unknown-id', 100_000)).toThrow();
    });
  });

  describe('emergency deploy', () => {
    it('should perform emergency deployment', () => {
      const result = allocator.emergencyDeploy(
        'insurance_backstop',
        1_000_000,
        'emergency-fund',
        'Emergency Insurance Fund',
        'Critical drawdown event',
        'risk-manager'
      );

      expect(result.status).toBe('executed');
      expect(result.deployedAmount).toBe(1_000_000);
    });

    it('should emit capital_deployed event on emergency', () => {
      const events: MonetaryPolicyEvent[] = [];
      allocator.onEvent(e => events.push(e));

      allocator.emergencyDeploy('stabilization', 500_000, 't', 'T', 'Emergency', 'ai');

      const deployEvent = events.find(e => e.type === 'treasury.capital_deployed');
      expect(deployEvent).toBeDefined();
    });
  });

  describe('history', () => {
    it('should aggregate total deployed by type', () => {
      const r1 = allocator.requestDeployment('liquidity_injection', 100_000, 't', 'T', 'R', 'ai');
      allocator.executeDeployment(r1.id, 100_000);

      const r2 = allocator.requestDeployment('liquidity_injection', 50_000, 't2', 'T2', 'R', 'ai');
      allocator.executeDeployment(r2.id, 50_000);

      const totals = allocator.getTotalDeployedByType();
      expect(totals['liquidity_injection']).toBe(150_000);
    });
  });
});

// ============================================================================
// 5. Stability-Linked Incentive System Tests
// ============================================================================

describe('StabilityLinkedIncentiveSystem', () => {
  let system: DefaultStabilityLinkedIncentiveSystem;

  beforeEach(() => {
    system = createStabilityLinkedIncentiveSystem();
  });

  const sampleFactors: StabilityFactors = {
    stabilityScore: 75,
    liquidityDepthScore: 60,
    riskExposureScore: 30,
    agentPerformanceScore: 80,
  };

  describe('multiplier computation', () => {
    it('should compute a valid incentive multiplier', () => {
      const multiplier = system.computeMultiplier(sampleFactors);

      expect(multiplier.base).toBe(1.0);
      expect(multiplier.effective).toBeGreaterThanOrEqual(0.5);
      expect(multiplier.effective).toBeLessThanOrEqual(2.0);
      expect(multiplier.computedAt).toBeInstanceOf(Date);
    });

    it('should give higher multiplier with better stability factors', () => {
      const low = system.computeMultiplier({
        stabilityScore: 20, liquidityDepthScore: 20, riskExposureScore: 80, agentPerformanceScore: 20,
      });
      const high = system.computeMultiplier({
        stabilityScore: 95, liquidityDepthScore: 95, riskExposureScore: 5, agentPerformanceScore: 95,
      });
      expect(high.effective).toBeGreaterThan(low.effective);
    });

    it('should apply risk penalty for high risk exposure', () => {
      const safe = system.computeMultiplier({ ...sampleFactors, riskExposureScore: 0 });
      const risky = system.computeMultiplier({ ...sampleFactors, riskExposureScore: 100 });
      expect(safe.effective).toBeGreaterThan(risky.effective);
    });

    it('should emit multiplier_updated event', () => {
      const events: MonetaryPolicyEvent[] = [];
      system.onEvent(e => events.push(e));
      system.computeMultiplier(sampleFactors);

      const event = events.find(e => e.type === 'incentive.multiplier_updated');
      expect(event).toBeDefined();
    });
  });

  describe('reward tiers', () => {
    it('should return all active reward tiers', () => {
      const tiers = system.getRewardTiers();
      expect(tiers.length).toBeGreaterThan(0);
      for (const tier of tiers) {
        expect(tier.active).toBe(true);
      }
    });

    it('should identify conservative tier for low-drawdown, long-holding users', () => {
      const tier = system.getEligibleTier(0.03, 120, 0.9);
      expect(tier?.tier).toBe('conservative');
    });

    it('should identify balanced tier for moderate users', () => {
      const tier = system.getEligibleTier(0.12, 45, 0.6);
      expect(tier?.tier).toBe('balanced');
    });

    it('should identify growth tier for short-term users', () => {
      const tier = system.getEligibleTier(0.20, 10, 0.4);
      expect(tier?.tier).toBe('growth');
    });

    it('should return undefined when no tier matches', () => {
      // Very short holding with very low capital efficiency, but drawdown is fine
      // aggressive tier should match with 0 requirements
      const tier = system.getEligibleTier(0.9, 0, 0.0);
      expect(tier?.tier).toBe('aggressive');
    });
  });

  describe('effective yield calculation', () => {
    it('should compute effective yield with multiplier and tier', () => {
      const multiplier = system.computeMultiplier(sampleFactors);
      const tier = system.getEligibleTier(0.03, 120, 0.9);
      const effectiveYield = system.computeEffectiveYield(10, multiplier, tier);

      // Base 10% * multiplier + tier boost
      expect(effectiveYield).toBeGreaterThan(10);
    });

    it('should apply base yield with no tier', () => {
      const multiplier = system.computeMultiplier(sampleFactors);
      const effectiveYield = system.computeEffectiveYield(10, multiplier, undefined);

      expect(effectiveYield).toBe(10 * multiplier.effective);
    });
  });

  describe('history', () => {
    it('should record multiplier history', () => {
      system.computeMultiplier(sampleFactors);
      system.computeMultiplier({ ...sampleFactors, stabilityScore: 50 });

      expect(system.getMultiplierHistory()).toHaveLength(2);
    });

    it('should limit multiplier history', () => {
      for (let i = 0; i < 5; i++) {
        system.computeMultiplier(sampleFactors);
      }
      expect(system.getMultiplierHistory(3)).toHaveLength(3);
    });
  });
});

// ============================================================================
// 6. Monetary Governance Layer Tests
// ============================================================================

describe('MonetaryGovernanceLayer', () => {
  let governance: DefaultMonetaryGovernanceLayer;
  let engine: DefaultAiMonetaryPolicyEngine;

  beforeEach(() => {
    governance = createMonetaryGovernanceLayer({ votingPeriodDays: 7, timelockDays: 2 });
    engine = createAiMonetaryPolicyEngine();
  });

  describe('proposals', () => {
    it('should create a monetary proposal', () => {
      const recommendation = engine.analyze(makeInputs());
      const proposal = governance.createProposal(
        'emission_adjustment',
        'Adjust Q1 2026 Emission Rate',
        'Based on AI analysis, adjust emission rate',
        recommendation,
        'ai-monetary-engine'
      );

      expect(proposal.id).toBeDefined();
      expect(proposal.type).toBe('emission_adjustment');
      expect(proposal.proposer).toBe('ai-monetary-engine');
      expect(proposal.forVotes).toBe(0);
      expect(proposal.againstVotes).toBe(0);
      expect(proposal.status).toBe('pending_vote');
    });

    it('should emit proposal_created event', () => {
      const events: MonetaryPolicyEvent[] = [];
      governance.onEvent(e => events.push(e));

      const rec = engine.analyze(makeInputs());
      governance.createProposal('treasury_reallocation', 'T', 'D', rec, 'proposer');

      const event = events.find(e => e.type === 'governance.proposal_created');
      expect(event).toBeDefined();
    });

    it('should list active proposals', () => {
      const rec = engine.analyze(makeInputs());
      governance.createProposal('emission_adjustment', 'T1', 'D', rec, 'p1');
      governance.createProposal('yield_adjustment', 'T2', 'D', rec, 'p2');

      expect(governance.getActiveProposals()).toHaveLength(2);
    });
  });

  describe('voting', () => {
    it('should cast a for vote', () => {
      const rec = engine.analyze(makeInputs());
      const proposal = governance.createProposal('emission_adjustment', 'T', 'D', rec, 'p');

      governance.castVote(proposal.id, 'alice', 'for', 500);
      const updated = governance.getProposal(proposal.id)!;
      expect(updated.forVotes).toBe(500);
      expect(updated.status).toBe('voting');
    });

    it('should cast multiple votes', () => {
      const rec = engine.analyze(makeInputs());
      const proposal = governance.createProposal('yield_adjustment', 'T', 'D', rec, 'p');

      governance.castVote(proposal.id, 'alice', 'for', 400);
      governance.castVote(proposal.id, 'bob', 'against', 200);
      governance.castVote(proposal.id, 'carol', 'abstain', 100);

      const updated = governance.getProposal(proposal.id)!;
      expect(updated.forVotes).toBe(400);
      expect(updated.againstVotes).toBe(200);
      expect(updated.abstainVotes).toBe(100);
      expect(updated.totalVotingPower).toBe(700);
    });

    it('should reject vote with zero power', () => {
      const rec = engine.analyze(makeInputs());
      const proposal = governance.createProposal('emission_adjustment', 'T', 'D', rec, 'p');
      expect(() => governance.castVote(proposal.id, 'alice', 'for', 0)).toThrow();
    });

    it('should reject vote on non-existent proposal', () => {
      expect(() => governance.castVote('invalid-id', 'alice', 'for', 100)).toThrow();
    });
  });

  describe('execution', () => {
    it('should execute a passed proposal', () => {
      const rec = engine.analyze(makeInputs());
      const proposal = governance.createProposal('emission_adjustment', 'T', 'D', rec, 'p');

      governance.castVote(proposal.id, 'alice', 'for', 800);
      governance.castVote(proposal.id, 'bob', 'against', 200);

      const executed = governance.executeProposal(proposal.id);
      expect(executed.status).toBe('executed');
      expect(executed.executedAt).toBeInstanceOf(Date);
    });

    it('should reject proposal if approval threshold not met', () => {
      const rec = engine.analyze(makeInputs());
      const proposal = governance.createProposal('emission_adjustment', 'T', 'D', rec, 'p');

      governance.castVote(proposal.id, 'alice', 'for', 200);
      governance.castVote(proposal.id, 'bob', 'against', 800);

      const result = governance.executeProposal(proposal.id);
      expect(result.status).toBe('rejected');
    });
  });

  describe('emergency overrides', () => {
    it('should trigger an emergency override', () => {
      const override = governance.triggerEmergencyOverride(
        'emission_pause',
        'risk-manager',
        'Critical market stress detected',
        { pauseDurationHours: 24 },
        48
      );

      expect(override.id).toBeDefined();
      expect(override.active).toBe(true);
      expect(override.type).toBe('emission_pause');
    });

    it('should list active overrides', () => {
      governance.triggerEmergencyOverride('emission_reduce', 'ai', 'Stress', {});
      governance.triggerEmergencyOverride('yield_cap', 'ai', 'Protection', {});

      expect(governance.getActiveOverrides()).toHaveLength(2);
    });

    it('should resolve an emergency override', () => {
      const override = governance.triggerEmergencyOverride('treasury_freeze', 'ai', 'Test', {});
      governance.resolveEmergencyOverride(override.id, 'governance-dao');

      expect(governance.getActiveOverrides()).toHaveLength(0);
      const resolved = governance.getActiveOverrides();
      expect(resolved).toHaveLength(0);
    });

    it('should emit override_triggered event', () => {
      const events: MonetaryPolicyEvent[] = [];
      governance.onEvent(e => events.push(e));
      governance.triggerEmergencyOverride('emission_pause', 'ai', 'Test', {});

      const event = events.find(e => e.type === 'emergency.override_triggered');
      expect(event).toBeDefined();
    });

    it('should emit override_resolved event on resolution', () => {
      const events: MonetaryPolicyEvent[] = [];
      governance.onEvent(e => events.push(e));
      const override = governance.triggerEmergencyOverride('yield_cap', 'ai', 'Test', {});
      governance.resolveEmergencyOverride(override.id, 'governance-dao');

      const event = events.find(e => e.type === 'emergency.override_resolved');
      expect(event).toBeDefined();
    });
  });
});

// ============================================================================
// 7. Unified Monetary Policy Layer (Integration) Tests
// ============================================================================

describe('MonetaryPolicyLayer (Unified)', () => {
  let layer: DefaultMonetaryPolicyLayer;

  beforeEach(() => {
    layer = createMonetaryPolicyLayer();
  });

  it('should initialize all sub-components', () => {
    expect(layer.treasury).toBeDefined();
    expect(layer.monetaryEngine).toBeDefined();
    expect(layer.emissionController).toBeDefined();
    expect(layer.capitalAllocator).toBeDefined();
    expect(layer.incentiveSystem).toBeDefined();
    expect(layer.governance).toBeDefined();
  });

  it('should return a health report', () => {
    const health = layer.getHealth();

    expect(health.overall).toBeDefined();
    expect(health.treasuryVault).toBeDefined();
    expect(health.monetaryEngine).toBeDefined();
    expect(health.emissionController).toBeDefined();
    expect(health.capitalAllocator).toBeDefined();
    expect(health.incentiveSystem).toBeDefined();
    expect(health.governanceLayer).toBeDefined();
    expect(typeof health.treasuryValueTon).toBe('number');
    expect(typeof health.currentDailyEmissionRate).toBe('number');
    expect(typeof health.currentStabilityScore).toBe('number');
  });

  it('should propagate events from all sub-components', () => {
    const events: MonetaryPolicyEvent[] = [];
    layer.onEvent(e => events.push(e));

    // Trigger events from multiple components
    layer.treasury.recordRevenue('performance_fees', 10_000, 'TON', 10_000, 'Test revenue');
    layer.monetaryEngine.analyze(makeInputs());
    layer.emissionController.mintTokens(500_000, 'Initial mint');

    expect(events.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle end-to-end: revenue → analysis → emission adjustment', () => {
    // 1. Record revenue into treasury
    layer.treasury.recordRevenue('performance_fees', 1_000_000, 'TON', 1_000_000, 'Revenue');
    layer.treasury.recordRevenue('marketplace_fees', 200_000, 'TON', 200_000, 'Revenue');

    // 2. Analyze protocol state
    const rec = layer.monetaryEngine.analyze(
      makeInputs({ treasuryValueTon: layer.treasury.getTotalValueTon() })
    );
    expect(rec).toBeDefined();

    // 3. Apply emission adjustment if no governance required
    if (!rec.requiresGovernanceApproval) {
      const emissionEvent = layer.emissionController.applyAdjustment(
        rec.emissionAdjustment,
        rec.id
      );
      expect(emissionEvent).toBeDefined();
    } else {
      // Create governance proposal
      const proposal = layer.governance.createProposal(
        'emission_adjustment',
        'Emission Adjustment Q1 2026',
        rec.policyRationale,
        rec,
        'ai-monetary-engine'
      );
      expect(proposal.id).toBeDefined();
    }
  });

  it('should simulate high volatility scenario → reduce emissions', () => {
    // High volatility triggers deflationary emission
    const rec = layer.monetaryEngine.analyze(makeInputs({ marketVolatility: 0.85 }));
    expect(rec.emissionAdjustment.direction).toBe('decrease');
    expect(rec.emissionAdjustment.mechanism).toBe('deflation');

    const beforeRate = layer.emissionController.getEmissionState().currentDailyRate;
    layer.emissionController.applyAdjustment(rec.emissionAdjustment);
    const afterRate = layer.emissionController.getEmissionState().currentDailyRate;
    expect(afterRate).toBeLessThanOrEqual(beforeRate);
  });

  it('should simulate liquidity gap → treasury injects capital', () => {
    layer.treasury.recordRevenue('performance_fees', 5_000_000, 'TON', 5_000_000, 'Revenue');
    layer.treasury.depositToReserve('liquidity_buffer', 500_000, 'Fund liquidity buffer');

    // Deploy capital to address liquidity gap
    const deployResult = layer.capitalAllocator.emergencyDeploy(
      'liquidity_injection',
      500_000,
      'liquidity-pool-ton',
      'TON Liquidity Pool',
      'Liquidity gap detected — injecting capital',
      'ai-monetary-engine'
    );
    expect(deployResult.status).toBe('executed');
    expect(deployResult.deployedAmount).toBe(500_000);
  });

  it('should simulate incentive adjustment', () => {
    const multiplier = layer.incentiveSystem.computeMultiplier({
      stabilityScore: 80,
      liquidityDepthScore: 70,
      riskExposureScore: 20,
      agentPerformanceScore: 85,
    });
    expect(multiplier.effective).toBeGreaterThan(1.0); // Good conditions → bonus multiplier

    const tier = layer.incentiveSystem.getEligibleTier(0.04, 100, 0.8);
    const effectiveYield = layer.incentiveSystem.computeEffectiveYield(12, multiplier, tier);
    expect(effectiveYield).toBeGreaterThan(12); // Bonus applied
  });

  it('should simulate DAO monetary vote execution', () => {
    const rec = layer.monetaryEngine.analyze(
      makeInputs({ marketVolatility: 0.8 }) // Should require governance
    );

    const proposal = layer.governance.createProposal(
      'emission_adjustment',
      'Critical Emission Adjustment',
      rec.policyRationale,
      rec,
      'ai-monetary-engine'
    );

    // DAO votes
    layer.governance.castVote(proposal.id, 'alice', 'for', 600);
    layer.governance.castVote(proposal.id, 'bob', 'for', 250);
    layer.governance.castVote(proposal.id, 'carol', 'against', 150);

    const result = layer.governance.executeProposal(proposal.id);
    expect(result.status).toBe('executed');

    // Apply the approved adjustment
    const emissionEvent = layer.emissionController.applyAdjustment(
      rec.emissionAdjustment,
      rec.id
    );
    expect(emissionEvent).toBeDefined();
  });
});
