/**
 * TONAIAgent - AI-native Global Financial Infrastructure (AGFI) Tests
 *
 * Comprehensive test suite for all 6 pillars of AGFI:
 * 1. Global Capital Layer
 * 2. Global Liquidity Fabric
 * 3. AI Systemic Coordination Layer
 * 4. Autonomous Monetary Infrastructure
 * 5. Governance & Institutional Alignment
 * 6. Interoperability & Global Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAGFIManager,
  createGlobalCapitalLayer,
  createGlobalLiquidityFabric,
  createAISystemicCoordinationLayer,
  createAutonomousMonetaryInfrastructure,
  createGovernanceInstitutionalAlignment,
  createInteroperabilityGlobalIntegration,
} from '../../research/agfi/index';

// ============================================================================
// Global Capital Layer Tests
// ============================================================================

describe('GlobalCapitalLayer', () => {
  let layer: ReturnType<typeof createGlobalCapitalLayer>;

  beforeEach(() => {
    layer = createGlobalCapitalLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(layer.config).toBeDefined();
      expect(layer.config.enableRegulatoryAwareDeployment).toBe(true);
      expect(layer.config.crossBorderSettlementTimeoutMinutes).toBe(60);
    });

    it('should accept custom configuration', () => {
      const custom = createGlobalCapitalLayer({
        crossBorderSettlementTimeoutMinutes: 30,
        enableRegulatoryAwareDeployment: false,
      });
      expect(custom.config.crossBorderSettlementTimeoutMinutes).toBe(30);
      expect(custom.config.enableRegulatoryAwareDeployment).toBe(false);
    });
  });

  describe('institution management', () => {
    it('should onboard a sovereign wealth fund', () => {
      const institution = layer.onboardInstitution({
        name: 'Norway Oil Fund',
        type: 'sovereign_fund',
        jurisdiction: 'NO',
        aum: 1_400_000_000_000,
        complianceTier: 'sovereign',
      });

      expect(institution.id).toBeDefined();
      expect(institution.name).toBe('Norway Oil Fund');
      expect(institution.type).toBe('sovereign_fund');
      expect(institution.jurisdiction).toBe('NO');
      expect(institution.aum).toBe(1_400_000_000_000);
      expect(institution.complianceTier).toBe('sovereign');
      expect(institution.regulatoryStatus).toBe('pending');
      expect(institution.onboardedAt).toBeInstanceOf(Date);
    });

    it('should onboard multiple institution types', () => {
      const types = [
        'sovereign_fund',
        'institutional_allocator',
        'dao_treasury',
        'family_office',
        'autonomous_ai_fund',
      ] as const;

      for (const type of types) {
        const inst = layer.onboardInstitution({
          name: `Test ${type}`,
          type,
          jurisdiction: 'US',
          aum: 1_000_000,
        });
        expect(inst.type).toBe(type);
      }
    });

    it('should retrieve an institution by id', () => {
      const onboarded = layer.onboardInstitution({
        name: 'Test Fund',
        type: 'hedge_fund',
        jurisdiction: 'GB',
        aum: 500_000_000,
      });

      const retrieved = layer.getInstitution(onboarded.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(onboarded.id);
    });

    it('should return undefined for non-existent institution', () => {
      const result = layer.getInstitution('nonexistent_id');
      expect(result).toBeUndefined();
    });

    it('should list institutions with filters', () => {
      layer.onboardInstitution({ name: 'US Fund 1', type: 'sovereign_fund', jurisdiction: 'US', aum: 1e9 });
      layer.onboardInstitution({ name: 'EU Fund', type: 'pension_fund', jurisdiction: 'DE', aum: 500e6 });
      layer.onboardInstitution({ name: 'US Fund 2', type: 'hedge_fund', jurisdiction: 'US', aum: 100e6 });

      const usFunds = layer.listInstitutions({ jurisdiction: 'US' });
      expect(usFunds).toHaveLength(2);

      const sovereigns = layer.listInstitutions({ type: 'sovereign_fund' });
      expect(sovereigns).toHaveLength(1);
      expect(sovereigns[0].name).toBe('US Fund 1');
    });

    it('should update an institution', () => {
      const inst = layer.onboardInstitution({
        name: 'Test',
        type: 'institutional_allocator',
        jurisdiction: 'SG',
        aum: 1e9,
      });

      const updated = layer.updateInstitution(inst.id, {
        aum: 2e9,
        regulatoryStatus: 'approved',
        kycStatus: 'verified',
      });

      expect(updated.aum).toBe(2e9);
      expect(updated.regulatoryStatus).toBe('approved');
      expect(updated.kycStatus).toBe('verified');
    });

    it('should suspend an institution', () => {
      const inst = layer.onboardInstitution({
        name: 'Suspicious Fund',
        type: 'hedge_fund',
        jurisdiction: 'KY',
        aum: 100e6,
      });

      layer.suspendInstitution(inst.id, 'Compliance violation detected');

      const retrieved = layer.getInstitution(inst.id);
      expect(retrieved!.regulatoryStatus).toBe('suspended');
    });

    it('should throw when suspending non-existent institution', () => {
      expect(() => layer.suspendInstitution('nonexistent', 'reason')).toThrow();
    });
  });

  describe('capital flows', () => {
    it('should initiate a cross-border capital flow', () => {
      const source = layer.onboardInstitution({ name: 'Source', type: 'sovereign_fund', jurisdiction: 'US', aum: 1e10 });
      const dest = layer.onboardInstitution({ name: 'Dest', type: 'institutional_allocator', jurisdiction: 'GB', aum: 5e9 });

      const flow = layer.initiateCapitalFlow({
        sourceInstitutionId: source.id,
        destinationInstitutionId: dest.id,
        flowType: 'cross_border_allocation',
        assetClass: 'fixed_income',
        amount: 10_000_000,
        currency: 'USD',
      });

      expect(flow.id).toBeDefined();
      expect(flow.sourceJurisdiction).toBe('US');
      expect(flow.destinationJurisdiction).toBe('GB');
      expect(flow.amount).toBe(10_000_000);
      expect(flow.status).toBe('pending');
      expect(flow.initiatedAt).toBeInstanceOf(Date);
    });

    it('should settle a capital flow', () => {
      const source = layer.onboardInstitution({ name: 'Src', type: 'sovereign_fund', jurisdiction: 'JP', aum: 5e9 });
      const dest = layer.onboardInstitution({ name: 'Dst', type: 'pension_fund', jurisdiction: 'AU', aum: 2e9 });

      const flow = layer.initiateCapitalFlow({
        sourceInstitutionId: source.id,
        destinationInstitutionId: dest.id,
        flowType: 'liquidity_injection',
        assetClass: 'cash',
        amount: 1_000_000,
        currency: 'USD',
      });

      const settled = layer.settleCapitalFlow(flow.id);
      expect(settled.status).toBe('settled');
      expect(settled.settledAt).toBeInstanceOf(Date);
    });

    it('should run compliance checks on a capital flow', () => {
      const source = layer.onboardInstitution({ name: 'Compliant', type: 'institutional_allocator', jurisdiction: 'CH', aum: 1e9 });
      const dest = layer.onboardInstitution({ name: 'Recipient', type: 'hedge_fund', jurisdiction: 'US', aum: 500e6 });

      const flow = layer.initiateCapitalFlow({
        sourceInstitutionId: source.id,
        destinationInstitutionId: dest.id,
        flowType: 'cross_border_allocation',
        assetClass: 'equities',
        amount: 5_000_000,
        currency: 'USD',
      });

      const checks = layer.runComplianceChecks(flow.id);
      expect(checks.length).toBeGreaterThan(0);
      expect(checks[0].checkedAt).toBeInstanceOf(Date);
    });

    it('should get jurisdiction exposure summary', () => {
      layer.onboardInstitution({ name: 'US Fund', type: 'sovereign_fund', jurisdiction: 'US', aum: 1e10 });
      layer.onboardInstitution({ name: 'US Bank', type: 'commercial_bank', jurisdiction: 'US', aum: 5e9 });

      const summary = layer.getJurisdictionExposure('US');
      expect(summary.jurisdiction).toBe('US');
      expect(summary.institutionCount).toBe(2);
    });
  });

  describe('allocation strategy', () => {
    it('should set and retrieve an allocation strategy', () => {
      const inst = layer.onboardInstitution({ name: 'Allocator', type: 'family_office', jurisdiction: 'LU', aum: 2e9 });

      const strategy = {
        institutionId: inst.id,
        targetAllocations: [
          { category: 'defi_yield', targetPercent: 40, minPercent: 20, maxPercent: 60, currentPercent: 35 },
          { category: 'rwa_bonds', targetPercent: 40, minPercent: 20, maxPercent: 60, currentPercent: 45 },
          { category: 'cash', targetPercent: 20, minPercent: 10, maxPercent: 40, currentPercent: 20 },
        ],
        rebalanceFrequency: 'monthly' as const,
        riskBudget: 5,
        liquidityRequirement: 20,
        jurisdictionalLimits: [],
        nextRebalanceAt: new Date(Date.now() + 30 * 86400000),
      };

      layer.setAllocationStrategy(inst.id, strategy);

      const retrieved = layer.getAllocationStrategy(inst.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.institutionId).toBe(inst.id);
      expect(retrieved!.targetAllocations).toHaveLength(3);
    });

    it('should rebalance allocation strategy', () => {
      const inst = layer.onboardInstitution({ name: 'Rebalancer', type: 'institutional_allocator', jurisdiction: 'HK', aum: 1e9 });
      inst.allocatedToAGFI = 500e6;

      const strategy = {
        institutionId: inst.id,
        targetAllocations: [
          { category: 'defi', targetPercent: 50, minPercent: 30, maxPercent: 70, currentPercent: 30 },
          { category: 'rwa', targetPercent: 50, minPercent: 30, maxPercent: 70, currentPercent: 70 },
        ],
        rebalanceFrequency: 'weekly' as const,
        riskBudget: 10,
        liquidityRequirement: 15,
        jurisdictionalLimits: [],
        nextRebalanceAt: new Date(),
      };

      layer.setAllocationStrategy(inst.id, strategy);
      const result = layer.rebalanceAllocation(inst.id);

      expect(result.institutionId).toBe(inst.id);
      expect(result.rebalancedAt).toBeInstanceOf(Date);
      expect(result.adjustments).toHaveLength(2);
      expect(result.improvementScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('events', () => {
    it('should emit events on institution onboarding', () => {
      const events: string[] = [];
      layer.onEvent(e => events.push(e.type));

      layer.onboardInstitution({ name: 'Event Test', type: 'dao_treasury', jurisdiction: 'US', aum: 1e6 });

      expect(events).toContain('institution_onboarded');
    });

    it('should emit events on capital flow initiation', () => {
      const events: string[] = [];
      layer.onEvent(e => events.push(e.type));

      const s = layer.onboardInstitution({ name: 'Src', type: 'sovereign_fund', jurisdiction: 'US', aum: 1e10 });
      const d = layer.onboardInstitution({ name: 'Dst', type: 'institutional_allocator', jurisdiction: 'EU', aum: 5e9 });
      layer.initiateCapitalFlow({ sourceInstitutionId: s.id, destinationInstitutionId: d.id, flowType: 'cross_border_allocation', assetClass: 'cash', amount: 1e6, currency: 'USD' });

      expect(events).toContain('institution_onboarded');
      expect(events).toContain('capital_flow_initiated');
    });
  });
});

// ============================================================================
// Global Liquidity Fabric Tests
// ============================================================================

describe('GlobalLiquidityFabric', () => {
  let fabric: ReturnType<typeof createGlobalLiquidityFabric>;

  beforeEach(() => {
    fabric = createGlobalLiquidityFabric();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(fabric.config.enableCrossChainLiquidity).toBe(true);
      expect(fabric.config.enableInstitutionalCorridors).toBe(true);
      expect(fabric.config.enableRWABridges).toBe(true);
    });
  });

  describe('liquidity corridors', () => {
    it('should open a liquidity corridor', () => {
      const corridor = fabric.openCorridor({
        name: 'TON-ETH Institutional',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        sourceProtocol: 'TON DEX',
        destinationProtocol: 'Uniswap V3',
        corridorType: 'institutional_corridor',
        initialLiquidity: 50_000_000,
      });

      expect(corridor.id).toBeDefined();
      expect(corridor.name).toBe('TON-ETH Institutional');
      expect(corridor.sourceChain).toBe('ton');
      expect(corridor.destinationChain).toBe('ethereum');
      expect(corridor.totalLiquidity).toBe(50_000_000);
      expect(corridor.availableLiquidity).toBe(50_000_000);
      expect(corridor.status).toBe('active');
    });

    it('should list corridors with filters', () => {
      fabric.openCorridor({ name: 'TON-ETH', sourceChain: 'ton', destinationChain: 'ethereum', sourceProtocol: 'A', destinationProtocol: 'B', corridorType: 'direct_bridge', initialLiquidity: 10e6 });
      fabric.openCorridor({ name: 'ETH-SOL', sourceChain: 'ethereum', destinationChain: 'solana', sourceProtocol: 'C', destinationProtocol: 'D', corridorType: 'atomic_swap', initialLiquidity: 5e6 });
      fabric.openCorridor({ name: 'TON-SOL', sourceChain: 'ton', destinationChain: 'solana', sourceProtocol: 'E', destinationProtocol: 'F', corridorType: 'direct_bridge', initialLiquidity: 3e6 });

      const tonCorridors = fabric.listCorridors({ sourceChain: 'ton' });
      expect(tonCorridors).toHaveLength(2);

      const bridges = fabric.listCorridors({ corridorType: 'direct_bridge' });
      expect(bridges).toHaveLength(2);
    });

    it('should update corridor liquidity', () => {
      const corridor = fabric.openCorridor({
        name: 'Test Corridor',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        sourceProtocol: 'A',
        destinationProtocol: 'B',
        corridorType: 'direct_bridge',
        initialLiquidity: 10_000_000,
      });

      const updated = fabric.updateCorridorLiquidity(corridor.id, 5_000_000);
      expect(updated.totalLiquidity).toBe(15_000_000);
    });

    it('should suspend a corridor', () => {
      const corridor = fabric.openCorridor({
        name: 'Suspendable',
        sourceChain: 'ton',
        destinationChain: 'polygon',
        sourceProtocol: 'A',
        destinationProtocol: 'B',
        corridorType: 'direct_bridge',
        initialLiquidity: 1_000_000,
      });

      fabric.suspendCorridor(corridor.id, 'Maintenance');

      const retrieved = fabric.getCorridor(corridor.id);
      expect(retrieved!.status).toBe('suspended');
    });
  });

  describe('route computation', () => {
    it('should compute optimal route for cross-chain transfer', () => {
      fabric.openCorridor({
        name: 'Fast Corridor',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        sourceProtocol: 'A',
        destinationProtocol: 'B',
        corridorType: 'atomic_swap',
        initialLiquidity: 100_000_000,
        feePercent: 0.05,
      });

      const route = fabric.computeOptimalRoute({
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        asset: 'USDT',
        amount: 1_000_000,
        optimizeFor: 'cost',
      });

      expect(route.id).toBeDefined();
      expect(route.sourceChain).toBe('ton');
      expect(route.destinationChain).toBe('ethereum');
      expect(route.amount).toBe(1_000_000);
      expect(route.optimizedFor).toBe('cost');
      expect(route.status).toBe('computed');
    });

    it('should execute a computed route', () => {
      fabric.openCorridor({
        name: 'Executable',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        sourceProtocol: 'A',
        destinationProtocol: 'B',
        corridorType: 'direct_bridge',
        initialLiquidity: 50_000_000,
      });

      const route = fabric.computeOptimalRoute({
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        asset: 'TON',
        amount: 100_000,
        optimizeFor: 'speed',
      });

      const executed = fabric.executeRoute(route.id);
      expect(executed.status).toBe('completed');
    });
  });

  describe('institutional pools', () => {
    it('should create an institutional liquidity pool', () => {
      const pool = fabric.createInstitutionalPool({
        name: 'Alpha Liquidity Pool',
        initialInstitutions: ['inst_1', 'inst_2'],
        initialContributions: { inst_1: 10_000_000, inst_2: 5_000_000 },
      });

      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('Alpha Liquidity Pool');
      expect(pool.totalLiquidity).toBe(15_000_000);
      expect(pool.participatingInstitutions).toHaveLength(2);
    });

    it('should add participant to pool', () => {
      const pool = fabric.createInstitutionalPool({
        name: 'Growing Pool',
        initialInstitutions: ['inst_1'],
        initialContributions: { inst_1: 10e6 },
      });

      fabric.addPoolParticipant(pool.id, 'inst_2', 5e6);

      const updated = fabric.getInstitutionalPool(pool.id);
      expect(updated!.participatingInstitutions).toContain('inst_2');
      expect(updated!.totalLiquidity).toBe(15e6);
    });
  });

  describe('RWA bridges', () => {
    it('should register an RWA bridge', () => {
      const bridge = fabric.registerRWABridge({
        rwaAssetId: 'us_treasury_10y',
        rwaAssetName: 'US Treasury 10Y Bond',
        custodian: 'BNY Mellon',
        onChainToken: 'tUS10Y',
        onChainChain: 'ton',
        totalTokenized: 100_000_000,
        redemptionTime: 48,
      });

      expect(bridge.id).toBeDefined();
      expect(bridge.rwaAssetName).toBe('US Treasury 10Y Bond');
      expect(bridge.custodian).toBe('BNY Mellon');
      expect(bridge.status).toBe('active');
    });
  });

  describe('analytics', () => {
    it('should return fabric metrics', () => {
      fabric.openCorridor({ name: 'C1', sourceChain: 'ton', destinationChain: 'ethereum', sourceProtocol: 'A', destinationProtocol: 'B', corridorType: 'direct_bridge', initialLiquidity: 10e6 });
      fabric.openCorridor({ name: 'C2', sourceChain: 'ethereum', destinationChain: 'polygon', sourceProtocol: 'C', destinationProtocol: 'D', corridorType: 'atomic_swap', initialLiquidity: 5e6 });

      const metrics = fabric.getFabricMetrics();
      expect(metrics.totalCorridors).toBe(2);
      expect(metrics.totalLiquidity).toBe(15e6);
      expect(metrics.generatedAt).toBeInstanceOf(Date);
    });

    it('should return chain liquidity profile', () => {
      fabric.openCorridor({ name: 'In', sourceChain: 'ethereum', destinationChain: 'ton', sourceProtocol: 'A', destinationProtocol: 'B', corridorType: 'direct_bridge', initialLiquidity: 20e6 });
      fabric.openCorridor({ name: 'Out', sourceChain: 'ton', destinationChain: 'solana', sourceProtocol: 'C', destinationProtocol: 'D', corridorType: 'direct_bridge', initialLiquidity: 10e6 });

      const profile = fabric.getChainLiquidityProfile('ton');
      expect(profile.chain).toBe('ton');
      expect(profile.inboundCorridors).toBe(1);
      expect(profile.outboundCorridors).toBe(1);
    });
  });
});

// ============================================================================
// AI Systemic Coordination Layer Tests
// ============================================================================

describe('AISystemicCoordinationLayer', () => {
  let layer: ReturnType<typeof createAISystemicCoordinationLayer>;

  beforeEach(() => {
    layer = createAISystemicCoordinationLayer({ systemicRiskAlertThreshold: 70 });
  });

  describe('exposure mapping', () => {
    it('should compute global exposure map', () => {
      const positions = [
        { institutionId: 'inst_1', institutionName: 'Norges', assetClass: 'equities', chain: 'ton' as const, jurisdiction: 'NO', exposure: 500e6, liquidityScore: 90, volatilityScore: 20 },
        { institutionId: 'inst_2', institutionName: 'GIC', assetClass: 'bonds', chain: 'ethereum' as const, jurisdiction: 'SG', exposure: 300e6, liquidityScore: 85, volatilityScore: 15 },
        { institutionId: 'inst_3', institutionName: 'ADIA', assetClass: 'equities', chain: 'ton' as const, jurisdiction: 'AE', exposure: 200e6, liquidityScore: 80, volatilityScore: 25 },
      ];

      const map = layer.computeExposureMap(positions);

      expect(map.id).toBeDefined();
      expect(map.totalSystemExposure).toBe(1000e6);
      expect(map.byAssetClass).toHaveLength(2); // equities and bonds
      expect(map.byChain.length).toBeGreaterThan(0);
      expect(map.byJurisdiction).toHaveLength(3);
      expect(map.byInstitution).toHaveLength(3);
      expect(map.riskLevel).toBeDefined();
      expect(map.overallSystemicRiskScore).toBeGreaterThanOrEqual(0);
      expect(map.overallSystemicRiskScore).toBeLessThanOrEqual(100);
    });

    it('should retrieve latest exposure map', () => {
      layer.computeExposureMap([{ institutionId: 'i1', institutionName: 'T', assetClass: 'cash', chain: 'ton', jurisdiction: 'US', exposure: 100, liquidityScore: 100, volatilityScore: 0 }]);

      const latest = layer.getLatestExposureMap();
      expect(latest).toBeDefined();
    });

    it('should return exposure history', () => {
      for (let i = 0; i < 5; i++) {
        layer.computeExposureMap([{ institutionId: `i${i}`, institutionName: 'T', assetClass: 'cash', chain: 'ton', jurisdiction: 'US', exposure: 1000, liquidityScore: 100, volatilityScore: 0 }]);
      }

      const history = layer.getExposureHistory(3);
      expect(history).toHaveLength(3);
    });
  });

  describe('capital adequacy modeling', () => {
    it('should model capital adequacy for an institution', () => {
      const model = layer.modelCapitalAdequacy('inst_1', {
        totalCapital: 1_000_000_000,
        tier1Capital: 800_000_000,
        riskWeightedAssets: 8_000_000_000,
        liquidAssets: 2_000_000_000,
        netCashOutflows30d: 1_500_000_000,
        availableStableFunding: 6_000_000_000,
        requiredStableFunding: 5_000_000_000,
        leverage: 10,
      });

      expect(model.id).toBeDefined();
      expect(model.institutionId).toBe('inst_1');
      expect(model.capitalAdequacyRatio).toBeCloseTo(0.125); // 1B / 8B
      expect(model.tier1Ratio).toBeCloseTo(0.1); // 800M / 8B
      expect(model.liquidityCoverageRatio).toBeCloseTo(1.333, 2); // 2B / 1.5B
      expect(model.breachCritical).toBe(false); // CAR > 8%
    });

    it('should detect capital adequacy breach', () => {
      const model = layer.modelCapitalAdequacy('inst_breach', {
        totalCapital: 50_000_000, // Only 50M capital
        tier1Capital: 30_000_000,
        riskWeightedAssets: 1_000_000_000, // 1B RWA
        liquidAssets: 50_000_000,
        netCashOutflows30d: 100_000_000,
        availableStableFunding: 400_000_000,
        requiredStableFunding: 500_000_000,
        leverage: 20,
      });

      expect(model.breachCritical).toBe(true);
      expect(model.capitalAdequacyRatio).toBeCloseTo(0.05); // 5% < 8% minimum
    });

    it('should list capital adequacy breaches', () => {
      // Add a healthy institution
      layer.modelCapitalAdequacy('healthy', {
        totalCapital: 1e9, tier1Capital: 800e6, riskWeightedAssets: 5e9,
        liquidAssets: 2e9, netCashOutflows30d: 1e9,
        availableStableFunding: 4e9, requiredStableFunding: 3e9, leverage: 5,
      });

      // Add a breaching institution
      layer.modelCapitalAdequacy('breaching', {
        totalCapital: 50e6, tier1Capital: 30e6, riskWeightedAssets: 1e9,
        liquidAssets: 50e6, netCashOutflows30d: 100e6,
        availableStableFunding: 400e6, requiredStableFunding: 500e6, leverage: 20,
      });

      const breaches = layer.listCapitalAdequacyBreaches();
      expect(breaches.some(m => m.institutionId === 'breaching')).toBe(true);
    });
  });

  describe('liquidity stress simulation', () => {
    it('should run a market crash stress simulation', () => {
      const simulation = layer.runStressSimulation({
        scenarioName: '2024 Crypto Winter',
        scenarioType: 'market_crash',
        shockMagnitude: 40,
        affectedChains: ['ton', 'ethereum'],
      });

      expect(simulation.id).toBeDefined();
      expect(simulation.scenarioName).toBe('2024 Crypto Winter');
      expect(simulation.systemLiquidityImpact).toBeGreaterThan(0);
      expect(simulation.systemLiquidityImpact).toBeLessThanOrEqual(100);
      expect(simulation.contagionProbability).toBeGreaterThan(0);
      expect(simulation.contagionProbability).toBeLessThanOrEqual(1);
      expect(simulation.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should run all scenario types', () => {
      const types = ['bank_run', 'market_crash', 'protocol_failure', 'regulatory_shock', 'geopolitical'] as const;

      for (const scenarioType of types) {
        const sim = layer.runStressSimulation({
          scenarioName: `Test ${scenarioType}`,
          scenarioType,
          shockMagnitude: 25,
        });
        expect(sim.scenarioType).toBe(scenarioType);
        expect(sim.estimatedRecoveryTime).toBeGreaterThan(0);
      }
    });

    it('should find worst case scenario', () => {
      layer.runStressSimulation({ scenarioName: 'Minor', scenarioType: 'protocol_failure', shockMagnitude: 10 });
      layer.runStressSimulation({ scenarioName: 'Major', scenarioType: 'market_crash', shockMagnitude: 80 });
      layer.runStressSimulation({ scenarioName: 'Medium', scenarioType: 'bank_run', shockMagnitude: 40 });

      const worst = layer.getWorstCaseScenario();
      expect(worst).toBeDefined();
      expect(worst!.scenarioName).toBe('Major');
    });
  });

  describe('macro stabilization', () => {
    it('should propose a stabilization action', () => {
      const action = layer.proposeStabilizationAction({
        trigger: 'system_liquidity_below_threshold',
        triggerThreshold: 30,
        actionType: 'reserve_injection',
        targetMetric: 'system_liquidity_ratio',
        targetValue: 50,
        currentValue: 28,
        priority: 'high',
        autoExecute: false,
      });

      expect(action.id).toBeDefined();
      expect(action.actionType).toBe('reserve_injection');
      expect(action.priority).toBe('high');
      expect(action.proposedAt).toBeInstanceOf(Date);
      expect(action.executedAt).toBeUndefined();
    });

    it('should execute a stabilization action', () => {
      const action = layer.proposeStabilizationAction({
        trigger: 'price_below_peg',
        triggerThreshold: 0.95,
        actionType: 'stability_buffer_deployment',
        targetMetric: 'token_price',
        targetValue: 1.0,
        currentValue: 0.94,
        priority: 'high',
      });

      const executed = layer.executeStabilizationAction(action.id);
      expect(executed.executedAt).toBeDefined();
      expect(executed.outcome).toContain('executed');
    });
  });

  describe('risk analytics', () => {
    it('should get systemic risk dashboard', () => {
      const dashboard = layer.getSystemicRiskDashboard();

      expect(dashboard.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.overallRiskScore).toBeLessThanOrEqual(100);
      expect(dashboard.riskLevel).toBeDefined();
      expect(dashboard.riskTrend).toMatch(/^(improving|stable|deteriorating)$/);
      expect(dashboard.generatedAt).toBeInstanceOf(Date);
    });

    it('should compute contagion risk', () => {
      layer.computeExposureMap([
        { institutionId: 'big', institutionName: 'Big Institution', assetClass: 'all', chain: 'ton', jurisdiction: 'US', exposure: 800e6, liquidityScore: 80, volatilityScore: 20 },
        { institutionId: 'small', institutionName: 'Small Fund', assetClass: 'all', chain: 'ethereum', jurisdiction: 'EU', exposure: 200e6, liquidityScore: 90, volatilityScore: 15 },
      ]);

      const risk = layer.computeContagionRisk('big');
      expect(risk.institutionId).toBe('big');
      expect(risk.contagionProbability).toBeGreaterThanOrEqual(0);
      expect(risk.systemicImportance).toBeDefined();
    });
  });
});

// ============================================================================
// Autonomous Monetary Infrastructure Tests
// ============================================================================

describe('AutonomousMonetaryInfrastructure', () => {
  let infra: ReturnType<typeof createAutonomousMonetaryInfrastructure>;

  beforeEach(() => {
    infra = createAutonomousMonetaryInfrastructure();
  });

  describe('multi-asset reserve management', () => {
    it('should create a multi-asset reserve', () => {
      const reserve = infra.createReserve({
        name: 'Primary Reserve',
        initialAssets: [
          { assetId: 'usdt', assetName: 'USDT', chain: 'ton', amount: 1e7, usdValue: 1e7, targetPercent: 40, yieldRate: 0.05 },
          { assetId: 'ton', assetName: 'TON', chain: 'ton', amount: 2e6, usdValue: 8e6, targetPercent: 32, yieldRate: 0.08 },
          { assetId: 'usdc', assetName: 'USDC', chain: 'ethereum', amount: 7e6, usdValue: 7e6, targetPercent: 28, yieldRate: 0.04 },
        ],
      });

      expect(reserve.id).toBeDefined();
      expect(reserve.name).toBe('Primary Reserve');
      expect(reserve.assets).toHaveLength(3);
      expect(reserve.totalValueUSD).toBe(25e6);
      expect(reserve.diversificationScore).toBeGreaterThan(0);
    });

    it('should add an asset to a reserve', () => {
      const reserve = infra.createReserve({ name: 'Growing Reserve' });

      const updated = infra.addReserveAsset(reserve.id, {
        assetId: 'btc', assetName: 'BTC', chain: 'ethereum',
        amount: 1, usdValue: 50_000, targetPercent: 100,
      });

      expect(updated.assets).toHaveLength(1);
      expect(updated.totalValueUSD).toBe(50_000);
    });

    it('should rebalance a reserve', () => {
      const reserve = infra.createReserve({
        name: 'Imbalanced Reserve',
        initialAssets: [
          { assetId: 'a', assetName: 'A', chain: 'ton', amount: 100, usdValue: 80_000, targetPercent: 50 },
          { assetId: 'b', assetName: 'B', chain: 'ton', amount: 100, usdValue: 20_000, targetPercent: 50 },
        ],
      });

      const result = infra.rebalanceReserve(reserve.id);
      expect(result.rebalancedAt).toBeInstanceOf(Date);
      expect(result.reserveId).toBe(reserve.id);
    });

    it('should get reserve summary', () => {
      infra.createReserve({ name: 'R1', initialAssets: [{ assetId: 'a', assetName: 'A', chain: 'ton', amount: 1e6, usdValue: 1e6, targetPercent: 100 }] });
      infra.createReserve({ name: 'R2', initialAssets: [{ assetId: 'b', assetName: 'B', chain: 'ethereum', amount: 5e5, usdValue: 5e5, targetPercent: 100 }] });

      const summary = infra.getReserveSummary();
      expect(summary.reserveCount).toBe(2);
      expect(summary.totalValueUSD).toBe(1.5e6);
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('cross-chain reserve positions', () => {
    it('should create a cross-chain reserve position', () => {
      const position = infra.createChainPosition({
        chain: 'ethereum',
        protocol: 'Aave V3',
        assetId: 'usdc',
        amount: 1_000_000,
        usdValue: 1_000_000,
        yieldRate: 0.04,
        purpose: 'yield_generation',
      });

      expect(position.id).toBeDefined();
      expect(position.chain).toBe('ethereum');
      expect(position.protocol).toBe('Aave V3');
      expect(position.purpose).toBe('yield_generation');
      expect(position.riskScore).toBeDefined();
    });

    it('should list positions by chain', () => {
      infra.createChainPosition({ chain: 'ton', protocol: 'Tonstakers', assetId: 'ton', amount: 1e6, usdValue: 5e6, purpose: 'stability_buffer' });
      infra.createChainPosition({ chain: 'ethereum', protocol: 'Lido', assetId: 'eth', amount: 100, usdValue: 200e3, purpose: 'yield_generation' });

      const tonPositions = infra.listChainPositions({ chain: 'ton' });
      expect(tonPositions).toHaveLength(1);
    });
  });

  describe('yield-backed stabilization', () => {
    it('should create a stabilization pool', () => {
      const pool = infra.createStabilizationPool({
        initialYieldReserve: 1_000_000,
        targetStabilizationRatio: 0.05,
        yieldSources: [
          { protocolName: 'Tonstakers', chain: 'ton', assetId: 'ton', deployedCapital: 10e6, annualYieldRate: 0.07 },
        ],
      });

      expect(pool.id).toBeDefined();
      expect(pool.totalYieldReserve).toBe(1_000_000);
      expect(pool.availableForDeployment).toBe(1_000_000);
      expect(pool.yieldSources).toHaveLength(1);
    });

    it('should deploy stabilization capital', () => {
      const pool = infra.createStabilizationPool({ initialYieldReserve: 5_000_000 });

      const deployment = infra.deployStabilizationCapital(pool.id, 1_000_000, 'Price deviation detected');

      expect(deployment.amount).toBe(1_000_000);
      expect(deployment.reason).toBe('Price deviation detected');
      expect(deployment.deployedAt).toBeInstanceOf(Date);

      const updated = infra.getStabilizationPool(pool.id);
      expect(updated!.deployedForStabilization).toBe(1_000_000);
      expect(updated!.availableForDeployment).toBe(4_000_000);
    });

    it('should harvest yield from pool', () => {
      const pool = infra.createStabilizationPool({
        initialYieldReserve: 0,
        yieldSources: [
          { protocolName: 'Protocol A', chain: 'ton', assetId: 'ton', deployedCapital: 10e6, annualYieldRate: 0.10 },
        ],
      });

      const result = infra.harvestYield(pool.id);
      expect(result.totalHarvested).toBeGreaterThan(0);
      expect(result.yieldSources).toHaveLength(1);
    });
  });

  describe('emission control', () => {
    it('should create emission control', () => {
      const control = infra.createEmissionControl({
        tokenAddress: '0xTON_TOKEN',
        chain: 'ton',
        currentEmissionRate: 10000,
        maxEmissionRate: 50000,
        minEmissionRate: 1000,
        adjustmentFrequency: 'daily',
      });

      expect(control.id).toBeDefined();
      expect(control.currentEmissionRate).toBe(10000);
      expect(control.maxEmissionRate).toBe(50000);
    });

    it('should adjust emission rate', () => {
      const control = infra.createEmissionControl({
        tokenAddress: '0x_TOKEN',
        chain: 'ton',
        currentEmissionRate: 10000,
        maxEmissionRate: 50000,
        minEmissionRate: 1000,
      });

      const result = infra.adjustEmission(control.id, 8000, 'Price pressure detected');
      expect(result.previousRate).toBe(10000);
      expect(result.newRate).toBe(8000);
      expect(result.reason).toBe('Price pressure detected');
    });

    it('should reject emission outside bounds', () => {
      const control = infra.createEmissionControl({
        tokenAddress: '0x_TOKEN',
        chain: 'ton',
        currentEmissionRate: 10000,
        maxEmissionRate: 50000,
        minEmissionRate: 1000,
      });

      expect(() => infra.adjustEmission(control.id, 100, 'Too low')).toThrow();
      expect(() => infra.adjustEmission(control.id, 100000, 'Too high')).toThrow();
    });
  });

  describe('monetary health', () => {
    it('should compute monetary health score', () => {
      const health = infra.getMonetaryHealthScore();

      expect(health.overallScore).toBeGreaterThanOrEqual(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.reserveStability).toBeDefined();
      expect(health.emissionHealth).toBeDefined();
      expect(health.yieldCoverage).toBeDefined();
      expect(health.crossChainBalance).toBeDefined();
      expect(health.generatedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Governance & Institutional Alignment Tests
// ============================================================================

describe('GovernanceInstitutionalAlignment', () => {
  let governance: ReturnType<typeof createGovernanceInstitutionalAlignment>;

  beforeEach(() => {
    governance = createGovernanceInstitutionalAlignment();
  });

  describe('jurisdiction modules', () => {
    it('should register a jurisdiction module', () => {
      const module = governance.registerJurisdictionModule({
        jurisdiction: 'EU',
        name: 'EU MiCA Compliance Module',
        regulatoryFramework: 'MiCA',
        supportedInstitutionTypes: ['institutional_allocator', 'hedge_fund'],
        kycAmlStandard: 'FATF',
        sanctionsLists: ['EU', 'OFAC', 'UN'],
      });

      expect(module.id).toBeDefined();
      expect(module.jurisdiction).toBe('EU');
      expect(module.name).toBe('EU MiCA Compliance Module');
      expect(module.status).toBe('active');
    });

    it('should retrieve module by jurisdiction code', () => {
      governance.registerJurisdictionModule({
        jurisdiction: 'US',
        name: 'US FinCEN Module',
        regulatoryFramework: 'BSA/AML',
        supportedInstitutionTypes: ['commercial_bank'],
        kycAmlStandard: 'FinCEN',
      });

      const module = governance.getJurisdictionModuleByCode('US');
      expect(module).toBeDefined();
      expect(module!.jurisdiction).toBe('US');
    });

    it('should add a jurisdiction rule', () => {
      const module = governance.registerJurisdictionModule({
        jurisdiction: 'SG',
        name: 'MAS Module',
        regulatoryFramework: 'PSA',
        supportedInstitutionTypes: ['institutional_allocator'],
        kycAmlStandard: 'MAS',
      });

      const rule = governance.addJurisdictionRule(module.id, {
        ruleType: 'capital_limit',
        description: 'Max single transaction S$10M',
        threshold: 10_000_000,
        currency: 'SGD',
        enforcement: 'hard_block',
        lastUpdated: new Date(),
      });

      expect(rule.id).toBeDefined();
      expect(rule.ruleType).toBe('capital_limit');

      const updated = governance.getJurisdictionModule(module.id);
      expect(updated!.complianceRules).toHaveLength(1);
    });
  });

  describe('sovereign onboarding', () => {
    it('should initiate sovereign onboarding', () => {
      const profile = governance.initiateSovereignOnboarding({
        institutionId: 'inst_nbim',
        sovereignType: 'sovereign_wealth_fund',
        countryCode: 'NO',
        regulatoryClassification: 'Government Pension Fund Global',
        dueDiligenceLevel: 'ultra_high',
      });

      expect(profile.id).toBeDefined();
      expect(profile.sovereignType).toBe('sovereign_wealth_fund');
      expect(profile.countryCode).toBe('NO');
      expect(profile.onboardingStage).toBe('initial_contact');
      expect(profile.completedAt).toBeUndefined();
    });

    it('should advance onboarding stages', () => {
      const profile = governance.initiateSovereignOnboarding({
        institutionId: 'inst_gic',
        sovereignType: 'sovereign_wealth_fund',
        countryCode: 'SG',
        regulatoryClassification: 'Government Investment Corporation',
      });

      governance.advanceOnboardingStage(profile.id, 'NDA_signed');
      governance.advanceOnboardingStage(profile.id, 'AML_complete');

      const updated = governance.getSovereignProfile(profile.id);
      expect(updated!.onboardingStage).toBe('legal_review');
      expect(updated!.signedAgreements).toContain('NDA_signed');
    });

    it('should complete sovereign onboarding', () => {
      const profile = governance.initiateSovereignOnboarding({
        institutionId: 'inst_complete',
        sovereignType: 'central_bank',
        countryCode: 'JP',
        regulatoryClassification: 'Bank of Japan',
      });

      governance.completeSovereignOnboarding(profile.id);

      const completed = governance.getSovereignProfile(profile.id);
      expect(completed!.completedAt).toBeInstanceOf(Date);
      expect(completed!.onboardingStage).toBe('full_access');
    });
  });

  describe('compliance bridges', () => {
    it('should register a compliance bridge', () => {
      const bridge = governance.registerComplianceBridge({
        bridgeName: 'SWIFT Compliance Bridge',
        targetSystem: 'swift',
        supportedJurisdictions: ['US', 'EU', 'GB'],
        complianceStandards: ['ISO20022', 'FATF', 'AML6'],
      });

      expect(bridge.id).toBeDefined();
      expect(bridge.bridgeName).toBe('SWIFT Compliance Bridge');
      expect(bridge.status).toBe('testing');
    });

    it('should sync a compliance bridge', () => {
      const bridge = governance.registerComplianceBridge({
        bridgeName: 'Test Bridge',
        targetSystem: 'sepa',
        supportedJurisdictions: ['DE'],
        complianceStandards: ['PSD2'],
      });

      const result = governance.syncComplianceBridge(bridge.id);
      expect(result.status).toBe('success');
      expect(result.syncedAt).toBeInstanceOf(Date);

      const updated = governance.getComplianceBridge(bridge.id);
      expect(updated!.status).toBe('active');
    });
  });

  describe('governance proposals', () => {
    it('should create a governance proposal', () => {
      const proposal = governance.proposeGovernanceAction({
        proposalType: 'parameter_update',
        title: 'Increase Capital Adequacy Buffer',
        description: 'Propose increasing minimum capital adequacy buffer from 8% to 10%',
        proposedBy: 'risk_committee',
        targetModule: 'GlobalCapitalLayer',
        proposedChanges: { minCapitalAdequacyRatio: 0.10 },
        jurisdictionalImpact: ['US', 'EU'],
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.title).toBe('Increase Capital Adequacy Buffer');
      expect(proposal.status).toBe('voting');
      expect(proposal.quorumRequired).toBe(66.7);
    });

    it('should cast vote on proposal', () => {
      const proposal = governance.proposeGovernanceAction({
        proposalType: 'jurisdiction_rule_add',
        title: 'Add SG Jurisdiction Module',
        description: 'Register Singapore MAS compliance module',
        proposedBy: 'compliance_team',
        targetModule: 'GovernanceModule',
        proposedChanges: {},
      });

      const vote1 = governance.castVote(proposal.id, 60, true); // 60% in favor (100% of votes cast so far)
      expect(vote1.quorumReached).toBe(true); // 60/60 = 100% of votes in favor → quorum reached

      const vote2 = governance.castVote(proposal.id, 10, false); // 10% against
      expect(vote2.newApprovalPercent).toBeCloseTo(85.71, 1); // 60/(60+10) * 100 ≈ 85.7%
    });

    it('should execute a passed proposal', () => {
      const proposal = governance.proposeGovernanceAction({
        proposalType: 'parameter_update',
        title: 'Update Protocol Params',
        description: 'Minor parameter update',
        proposedBy: 'admin',
        targetModule: 'Core',
        proposedChanges: {},
      });

      governance.castVote(proposal.id, 100, true); // 100% approval

      const executed = governance.executeProposal(proposal.id);
      expect(executed.status).toBe('executed');
      expect(executed.executedAt).toBeInstanceOf(Date);
    });

    it('should cancel a proposal', () => {
      const proposal = governance.proposeGovernanceAction({
        proposalType: 'emergency_action',
        title: 'Test Cancel',
        description: 'Test',
        proposedBy: 'admin',
        targetModule: 'Core',
        proposedChanges: {},
      });

      const cancelled = governance.cancelProposal(proposal.id, 'No longer needed');
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('compliance checking', () => {
    it('should check jurisdiction compliance', () => {
      governance.registerJurisdictionModule({
        jurisdiction: 'US',
        name: 'US Module',
        regulatoryFramework: 'FinCEN',
        supportedInstitutionTypes: ['institutional_allocator'],
        kycAmlStandard: 'FATF',
      });

      const assessment = governance.checkJurisdictionCompliance('inst_1', 'US', 'capital_flow');

      expect(assessment.institutionId).toBe('inst_1');
      expect(assessment.jurisdiction).toBe('US');
      expect(assessment.isCompliant).toBe(true);
      expect(assessment.assessedAt).toBeInstanceOf(Date);
    });

    it('should detect missing jurisdiction module', () => {
      const assessment = governance.checkJurisdictionCompliance('inst_1', 'UNKNOWN', 'capital_flow');

      expect(assessment.isCompliant).toBe(false);
      expect(assessment.violations.length).toBeGreaterThan(0);
      expect(assessment.requiredActions.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Interoperability & Global Integration Tests
// ============================================================================

describe('InteroperabilityGlobalIntegration', () => {
  let integration: ReturnType<typeof createInteroperabilityGlobalIntegration>;

  beforeEach(() => {
    integration = createInteroperabilityGlobalIntegration();
  });

  describe('cross-chain messaging', () => {
    it('should send a cross-chain message', () => {
      const message = integration.sendCrossChainMessage({
        protocol: 'cross_chain_message',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        messageType: 'capital_intent',
        payload: { amount: 1_000_000, asset: 'USDT' },
        priority: 'high',
      });

      expect(message.id).toBeDefined();
      expect(message.sourceChain).toBe('ton');
      expect(message.destinationChain).toBe('ethereum');
      expect(message.messageType).toBe('capital_intent');
      expect(message.priority).toBe('high');
      expect(['queued', 'sending']).toContain(message.status);
    });

    it('should acknowledge a message', () => {
      const message = integration.sendCrossChainMessage({
        protocol: 'cross_chain_message',
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        messageType: 'settlement_confirmation',
        payload: {},
      });

      const acknowledged = integration.acknowledgeMessage(message.id);
      expect(acknowledged.status).toBe('acknowledged');
      expect(acknowledged.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('should get message queue status', () => {
      integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ton', destinationChain: 'ethereum', messageType: 'capital_intent', payload: {} });
      integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ethereum', destinationChain: 'solana', messageType: 'risk_alert', payload: {}, priority: 'urgent' });

      const status = integration.getMessageQueueStatus();
      expect(status.generatedAt).toBeInstanceOf(Date);
      expect(status.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should list messages with filters', () => {
      integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ton', destinationChain: 'ethereum', messageType: 'capital_intent', payload: {} });
      integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ton', destinationChain: 'solana', messageType: 'risk_alert', payload: {} });

      const tonMessages = integration.listMessages({ sourceChain: 'ton' });
      expect(tonMessages).toHaveLength(2);

      const capitalIntents = integration.listMessages({ messageType: 'capital_intent' });
      expect(capitalIntents).toHaveLength(1);
    });
  });

  describe('institutional API endpoints', () => {
    it('should register an API endpoint', () => {
      const endpoint = integration.registerAPIEndpoint({
        institutionId: 'inst_1',
        endpointType: 'rest',
        url: 'https://api.example-institution.com/v1',
        version: 'v1',
        capabilities: ['read_positions', 'submit_orders'],
        authMethod: 'mtls',
      });

      expect(endpoint.id).toBeDefined();
      expect(endpoint.institutionId).toBe('inst_1');
      expect(endpoint.endpointType).toBe('rest');
      expect(endpoint.capabilities).toContain('read_positions');
    });

    it('should check API health', () => {
      const endpoint = integration.registerAPIEndpoint({
        institutionId: 'inst_healthy',
        endpointType: 'rest',
        url: 'https://healthy.api.com',
      });

      const health = integration.checkAPIHealth(endpoint.id);
      expect(health.isHealthy).toBe(true);
      expect(health.checkedAt).toBeInstanceOf(Date);
    });

    it('should list endpoints with filters', () => {
      integration.registerAPIEndpoint({ institutionId: 'i1', endpointType: 'rest', url: 'https://a.com' });
      integration.registerAPIEndpoint({ institutionId: 'i1', endpointType: 'websocket', url: 'wss://a.com' });
      integration.registerAPIEndpoint({ institutionId: 'i2', endpointType: 'rest', url: 'https://b.com' });

      const i1Endpoints = integration.listAPIEndpoints({ institutionId: 'i1' });
      expect(i1Endpoints).toHaveLength(2);

      const restEndpoints = integration.listAPIEndpoints({ endpointType: 'rest' });
      expect(restEndpoints).toHaveLength(2);
    });
  });

  describe('bank connectors', () => {
    it('should add a bank connector', () => {
      const connector = integration.addBankConnector({
        bankName: 'Deutsche Bank',
        bankCountry: 'DE',
        connectorType: 'sepa',
        supportedCurrencies: ['EUR', 'USD'],
        settlementTime: 1,
        maxTransactionAmount: 50_000_000,
      });

      expect(connector.id).toBeDefined();
      expect(connector.bankName).toBe('Deutsche Bank');
      expect(connector.connectorType).toBe('sepa');
      expect(connector.status).toBe('connected');
    });

    it('should test bank connection', () => {
      const connector = integration.addBankConnector({
        bankName: 'Test Bank',
        bankCountry: 'US',
        connectorType: 'fedwire',
        supportedCurrencies: ['USD'],
      });

      const result = integration.testBankConnection(connector.id);
      expect(result.connectionSuccessful).toBe(true);
      expect(result.testedAt).toBeInstanceOf(Date);
    });

    it('should list connectors by country', () => {
      integration.addBankConnector({ bankName: 'Bank 1', bankCountry: 'US', connectorType: 'fedwire', supportedCurrencies: ['USD'] });
      integration.addBankConnector({ bankName: 'Bank 2', bankCountry: 'US', connectorType: 'swift', supportedCurrencies: ['USD'] });
      integration.addBankConnector({ bankName: 'Bank 3', bankCountry: 'EU', connectorType: 'sepa', supportedCurrencies: ['EUR'] });

      const usConnectors = integration.listBankConnectors({ bankCountry: 'US' });
      expect(usConnectors).toHaveLength(2);
    });
  });

  describe('custodians', () => {
    it('should register a custodian', () => {
      const custodian = integration.registerCustodian({
        custodianName: 'Fireblocks',
        custodianType: 'crypto_native',
        jurisdictions: ['US', 'EU'],
        supportedAssets: ['BTC', 'ETH', 'TON', 'USDT'],
        supportedChains: ['ton', 'ethereum', 'polygon'],
        segregationModel: 'full_segregation',
        insuranceCoverage: 100_000_000,
        apiIntegrated: true,
      });

      expect(custodian.id).toBeDefined();
      expect(custodian.custodianName).toBe('Fireblocks');
      expect(custodian.custodianType).toBe('crypto_native');
      expect(custodian.apiIntegrated).toBe(true);
    });
  });

  describe('RWA custodial mapping', () => {
    it('should register an RWA custodial mapping', () => {
      const mapping = integration.registerRWACustodialMap({
        rwaAssetId: 'us_treasury_2yr',
        rwaType: 'treasury_bond',
        custodian: 'State Street',
        legalEntity: 'AGFI Treasury SPV Ltd',
        tokenContract: 'EQD...',
        tokenChain: 'ton',
        underlyingCustodyJurisdiction: 'US',
        totalTokenized: 50_000_000,
        proofOfReserveUrl: 'https://proof.tonaiagent.com/us_treasury_2yr',
      });

      expect(mapping.id).toBeDefined();
      expect(mapping.rwaType).toBe('treasury_bond');
      expect(mapping.custodian).toBe('State Street');
      expect(mapping.status).toBe('active');
    });

    it('should verify RWA custody', () => {
      const mapping = integration.registerRWACustodialMap({
        rwaAssetId: 'real_estate_fund_1',
        rwaType: 'real_estate',
        custodian: 'CBRE',
        legalEntity: 'RE Fund SPV',
        tokenContract: 'EQA...',
        tokenChain: 'ton',
        underlyingCustodyJurisdiction: 'GB',
        totalTokenized: 10_000_000,
        proofOfReserveUrl: 'https://proof.example.com/re1',
      });

      const verification = integration.verifyRWACustody(mapping.id);
      expect(verification.verifiedAt).toBeInstanceOf(Date);
      expect(verification.proofOfReserveValid).toBe(true);
      expect(verification.isVerified).toBe(true);
    });
  });

  describe('analytics', () => {
    it('should return integration summary', () => {
      integration.addBankConnector({ bankName: 'B1', bankCountry: 'US', connectorType: 'fedwire', supportedCurrencies: ['USD'] });
      integration.registerCustodian({ custodianName: 'C1', custodianType: 'crypto_native', jurisdictions: ['US'], supportedAssets: ['BTC'], supportedChains: ['ton', 'ethereum'], segregationModel: 'full_segregation' });

      const summary = integration.getIntegrationSummary();
      expect(summary.bankConnectors.total).toBe(1);
      expect(summary.custodians.total).toBe(1);
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });

    it('should return global connectivity map', () => {
      integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ton', destinationChain: 'ethereum', messageType: 'capital_intent', payload: {} });
      integration.addBankConnector({ bankName: 'US Bank', bankCountry: 'US', connectorType: 'fedwire', supportedCurrencies: ['USD'] });

      const map = integration.getGlobalConnectivityMap();
      expect(map.chains.length).toBeGreaterThan(0);
      expect(map.generatedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Unified AGFI Manager Tests
// ============================================================================

describe('AGFIManager', () => {
  let agfi: ReturnType<typeof createAGFIManager>;

  beforeEach(() => {
    agfi = createAGFIManager();
  });

  it('should initialize all 6 pillars', () => {
    expect(agfi.globalCapital).toBeDefined();
    expect(agfi.globalLiquidity).toBeDefined();
    expect(agfi.systemicCoordination).toBeDefined();
    expect(agfi.autonomousMonetary).toBeDefined();
    expect(agfi.governance).toBeDefined();
    expect(agfi.integration).toBeDefined();
  });

  it('should return system status', () => {
    const status = agfi.getSystemStatus();

    expect(status.onboardedInstitutions).toBe(0);
    expect(status.totalAUMManaged).toBe(0);
    expect(status.activeLiquidityCorridors).toBe(0);
    expect(status.systemicRiskLevel).toBeDefined();
    expect(status.generatedAt).toBeInstanceOf(Date);
  });

  it('should accept custom configuration', () => {
    const customAgfi = createAGFIManager({
      globalCapitalLayer: { crossBorderSettlementTimeoutMinutes: 30 },
      globalLiquidityFabric: { maxCorridorFeePercent: 0.3 },
    });

    expect(customAgfi.globalCapital.config.crossBorderSettlementTimeoutMinutes).toBe(30);
    expect(customAgfi.globalLiquidity.config.maxCorridorFeePercent).toBe(0.3);
  });

  it('should forward events from all pillars', () => {
    const events: string[] = [];
    agfi.onEvent(e => events.push(e.type));

    // Trigger events from different pillars
    agfi.globalCapital.onboardInstitution({ name: 'Test', type: 'sovereign_fund', jurisdiction: 'US', aum: 1e10 });
    agfi.globalLiquidity.openCorridor({ name: 'Test Corridor', sourceChain: 'ton', destinationChain: 'ethereum', sourceProtocol: 'A', destinationProtocol: 'B', corridorType: 'direct_bridge', initialLiquidity: 10e6 });
    agfi.integration.sendCrossChainMessage({ protocol: 'cross_chain_message', sourceChain: 'ton', destinationChain: 'ethereum', messageType: 'capital_intent', payload: {} });

    expect(events).toContain('institution_onboarded');
    expect(events).toContain('liquidity_corridor_opened');
    expect(events).toContain('interop_message_sent');
  });

  it('should simulate cross-border capital allocation (demo)', () => {
    // Step 1: Onboard institutions
    const sovereignFund = agfi.globalCapital.onboardInstitution({
      name: 'Norges Bank Investment Management',
      type: 'sovereign_fund',
      jurisdiction: 'NO',
      aum: 1_400_000_000_000,
      complianceTier: 'sovereign',
    });

    const daoTreasury = agfi.globalCapital.onboardInstitution({
      name: 'Uniswap DAO Treasury',
      type: 'dao_treasury',
      jurisdiction: 'US',
      aum: 5_000_000_000,
      complianceTier: 'institutional',
    });

    // Step 2: Set up liquidity corridors
    const corridor = agfi.globalLiquidity.openCorridor({
      name: 'NO-US Institutional',
      sourceChain: 'ton',
      destinationChain: 'ethereum',
      sourceProtocol: 'TON Institutional DEX',
      destinationProtocol: 'Uniswap V3',
      corridorType: 'institutional_corridor',
      initialLiquidity: 500_000_000,
    });

    // Step 3: Initiate cross-border allocation
    const flow = agfi.globalCapital.initiateCapitalFlow({
      sourceInstitutionId: sovereignFund.id,
      destinationInstitutionId: daoTreasury.id,
      flowType: 'cross_border_allocation',
      assetClass: 'digital_assets',
      amount: 100_000_000,
      currency: 'USD',
    });

    // Step 4: Run compliance checks
    const checks = agfi.globalCapital.runComplianceChecks(flow.id);

    // Step 5: Compute optimal route
    const route = agfi.globalLiquidity.computeOptimalRoute({
      sourceChain: 'ton',
      destinationChain: 'ethereum',
      asset: 'USDT',
      amount: 100_000_000,
      optimizeFor: 'cost',
    });

    // Assertions
    expect(sovereignFund.type).toBe('sovereign_fund');
    expect(daoTreasury.type).toBe('dao_treasury');
    expect(corridor.status).toBe('active');
    expect(flow.amount).toBe(100_000_000);
    expect(checks.length).toBeGreaterThan(0);
    expect(route.status).toBe('computed');
  });

  it('should demonstrate systemic risk dashboard (demo)', () => {
    // Set up some positions
    agfi.systemicCoordination.computeExposureMap([
      { institutionId: 'i1', institutionName: 'Inst A', assetClass: 'equities', chain: 'ton', jurisdiction: 'US', exposure: 5e9, liquidityScore: 85, volatilityScore: 25 },
      { institutionId: 'i2', institutionName: 'Inst B', assetClass: 'bonds', chain: 'ethereum', jurisdiction: 'EU', exposure: 3e9, liquidityScore: 90, volatilityScore: 15 },
    ]);

    // Run stress simulation
    const stress = agfi.systemicCoordination.runStressSimulation({
      scenarioName: 'Market Correction',
      scenarioType: 'market_crash',
      shockMagnitude: 20,
    });

    // Get dashboard
    const dashboard = agfi.systemicCoordination.getSystemicRiskDashboard();

    expect(stress.simulatedAt).toBeInstanceOf(Date);
    expect(dashboard.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(dashboard.activeStressTests).toBeGreaterThan(0);
  });

  it('should demonstrate governance parameter update (demo)', () => {
    // Register jurisdiction
    const usModule = agfi.governance.registerJurisdictionModule({
      jurisdiction: 'US',
      name: 'US FinCEN/SEC Module',
      regulatoryFramework: 'BSA/AML + SEC',
      supportedInstitutionTypes: ['sovereign_fund', 'hedge_fund', 'institutional_allocator'],
      kycAmlStandard: 'FATF',
    });

    // Propose governance action
    const proposal = agfi.governance.proposeGovernanceAction({
      proposalType: 'parameter_update',
      title: 'Update US Capital Adequacy Requirements',
      description: 'Align capital adequacy with Basel IV requirements',
      proposedBy: 'risk_committee',
      targetModule: 'GlobalCapitalLayer',
      proposedChanges: { minCapitalAdequacyRatio: 0.12 },
      jurisdictionalImpact: ['US'],
    });

    // Vote and execute
    agfi.governance.castVote(proposal.id, 100, true);
    const executed = agfi.governance.executeProposal(proposal.id);

    expect(usModule.jurisdiction).toBe('US');
    expect(executed.status).toBe('executed');
    expect(executed.executedAt).toBeInstanceOf(Date);
  });
});
