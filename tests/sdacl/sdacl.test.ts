/**
 * TONAIAgent - Sovereign Digital Asset Coordination Layer (SDACL) Tests
 *
 * Comprehensive test suite for all 5 SDACL components:
 * 1. CBDC Integration Interface
 * 2. Sovereign Treasury Bridge
 * 3. Cross-Sovereign Coordination Engine
 * 4. Jurisdiction Enforcement Layer
 * 5. Sovereign Transparency Dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSDACLService,
  createCBDCIntegrationManager,
  createSovereignTreasuryBridgeManager,
  createCrossSovereignCoordinationManager,
  createJurisdictionEnforcementManager,
  createSovereignTransparencyManager,
  DefaultSDACLService,
  DefaultCBDCIntegrationManager,
  DefaultSovereignTreasuryBridgeManager,
  DefaultCrossSovereignCoordinationManager,
  DefaultJurisdictionEnforcementManager,
  DefaultSovereignTransparencyManager,
  SDACLEvent,
} from '../../services/sdacl';

// ============================================================================
// SDACLService Tests
// ============================================================================

describe('SDACLService', () => {
  let sdacl: DefaultSDACLService;

  beforeEach(() => {
    sdacl = createSDACLService({
      networkId: 'ton-testnet',
      environment: 'sandbox',
      sanctionCheckEnabled: true,
      crossBorderRoutingEnabled: true,
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultSdacl = createSDACLService();
      expect(defaultSdacl.config.networkId).toBe('ton-mainnet');
      expect(defaultSdacl.config.environment).toBe('sandbox');
      expect(defaultSdacl.config.sanctionCheckEnabled).toBe(true);
    });

    it('should initialize with custom configuration', () => {
      expect(sdacl.config.networkId).toBe('ton-testnet');
      expect(sdacl.config.environment).toBe('sandbox');
    });

    it('should expose all five SDACL components', () => {
      expect(sdacl.cbdcIntegration).toBeDefined();
      expect(sdacl.treasuryBridge).toBeDefined();
      expect(sdacl.crossSovereignCoordination).toBeDefined();
      expect(sdacl.jurisdictionEnforcement).toBeDefined();
      expect(sdacl.sovereignTransparency).toBeDefined();
    });
  });

  describe('getSystemStatus', () => {
    it('should return a system status report', () => {
      const status = sdacl.getSystemStatus();

      expect(status.component1CbdcIntegration).toBeDefined();
      expect(status.component2TreasuryBridge).toBeDefined();
      expect(status.component3CrossSovereignCoordination).toBeDefined();
      expect(status.component4JurisdictionEnforcement).toBeDefined();
      expect(status.component5SovereignTransparency).toBeDefined();
      expect(status.systemStabilityIndex).toBeGreaterThanOrEqual(0);
      expect(status.systemStabilityIndex).toBeLessThanOrEqual(100);
      expect(status.generatedAt).toBeInstanceOf(Date);
    });

    it('should reflect registered assets in status', () => {
      sdacl.cbdcIntegration.registerSovereignAsset({
        issuerId: 'ECB',
        issuerName: 'European Central Bank',
        assetType: 'cbdc',
        symbol: 'EURC',
        name: 'Digital Euro',
        jurisdictionCode: 'EU',
        totalSupply: 1_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      const status = sdacl.getSystemStatus();
      expect(status.component1CbdcIntegration.totalSovereignAssets).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit events from sub-components', () => {
      const events: SDACLEvent[] = [];
      sdacl.onEvent((e) => events.push(e));

      sdacl.cbdcIntegration.registerSovereignAsset({
        issuerId: 'FED',
        issuerName: 'Federal Reserve',
        assetType: 'cbdc',
        symbol: 'USDC',
        name: 'Digital Dollar',
        jurisdictionCode: 'US',
        totalSupply: 500_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'sovereign_asset_registered')).toBe(true);
    });
  });
});

// ============================================================================
// Component 1: CBDC Integration Interface Tests
// ============================================================================

describe('CBDCIntegrationManager', () => {
  let manager: DefaultCBDCIntegrationManager;

  beforeEach(() => {
    manager = createCBDCIntegrationManager();
  });

  describe('issuer verification', () => {
    it('should verify known sovereign issuers', () => {
      const result = manager.verifyIssuer('ECB', 'EU');
      expect(result.verified).toBe(true);
      expect(result.issuerType).toBe('central_bank');
      expect(result.creditRating).toBe('AAA');
    });

    it('should not verify unknown issuers', () => {
      const result = manager.verifyIssuer('UNKNOWN_BANK', 'XX');
      expect(result.verified).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('should include BIS scorecard for known issuers', () => {
      const result = manager.verifyIssuer('BIS', 'INT');
      expect(result.baisScorecard).toBeGreaterThan(90);
    });
  });

  describe('sovereign asset registration', () => {
    it('should register a sovereign asset', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'PBC',
        issuerName: 'Peoples Bank of China',
        assetType: 'cbdc',
        symbol: 'eCNY',
        name: 'Digital Yuan',
        jurisdictionCode: 'CN',
        totalSupply: 10_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      expect(asset.id).toBeDefined();
      expect(asset.symbol).toBe('eCNY');
      expect(asset.status).toBe('active');
    });

    it('should list sovereign assets with filters', () => {
      manager.registerSovereignAsset({
        issuerId: 'ECB',
        issuerName: 'European Central Bank',
        assetType: 'cbdc',
        symbol: 'EURC',
        name: 'Digital Euro',
        jurisdictionCode: 'EU',
        totalSupply: 1_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      manager.registerSovereignAsset({
        issuerId: 'UK_DMO',
        issuerName: 'UK Debt Management Office',
        assetType: 'sovereign_bond',
        symbol: 'UKGB',
        name: 'UK Gilts',
        jurisdictionCode: 'UK',
        totalSupply: 500_000_000,
        reserveRatio: 0.95,
        chainId: 'ton',
      });

      const cbdcs = manager.listSovereignAssets({ assetType: 'cbdc' });
      expect(cbdcs.length).toBe(1);
      expect(cbdcs[0].symbol).toBe('EURC');
    });
  });

  describe('supply validation', () => {
    it('should validate supply for registered asset', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'FED',
        issuerName: 'Federal Reserve',
        assetType: 'cbdc',
        symbol: 'USDC',
        name: 'Digital Dollar',
        jurisdictionCode: 'US',
        totalSupply: 1_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      const result = manager.validateSupply(asset.id);
      expect(result.valid).toBe(true);
      expect(result.reserveAdequate).toBe(true);
    });

    it('should fail validation for low reserve ratio', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'TEST_BANK',
        issuerName: 'Test Bank',
        assetType: 'cbdc',
        symbol: 'TEST',
        name: 'Test Currency',
        jurisdictionCode: 'XX',
        totalSupply: 1_000_000,
        reserveRatio: 0.5,
        chainId: 'ton',
      });

      const result = manager.validateSupply(asset.id);
      expect(result.valid).toBe(false);
      expect(result.reserveAdequate).toBe(false);
    });
  });

  describe('settlement routing', () => {
    it('should route settlement', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'ECB',
        issuerName: 'European Central Bank',
        assetType: 'cbdc',
        symbol: 'EURC',
        name: 'Digital Euro',
        jurisdictionCode: 'EU',
        totalSupply: 1_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      const route = manager.routeSettlement({
        assetId: asset.id,
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'US',
        amount: 1_000_000,
      });

      expect(route.status).toBe('routing');
      expect(route.routingPath).toContain('ton-bridge');
      expect(route.estimatedFeeBps).toBeGreaterThan(0);
    });

    it('should finalize settlement', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'FED',
        issuerName: 'Federal Reserve',
        assetType: 'cbdc',
        symbol: 'USDC',
        name: 'Digital Dollar',
        jurisdictionCode: 'US',
        totalSupply: 500_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      const route = manager.routeSettlement({
        assetId: asset.id,
        sourceJurisdiction: 'US',
        destinationJurisdiction: 'US',
        amount: 100_000,
      });

      const finalized = manager.finalizeSettlement(route.id);
      expect(finalized.status).toBe('settled');
      expect(finalized.settledAt).toBeInstanceOf(Date);
    });
  });

  describe('authority reporting', () => {
    it('should generate authority report', () => {
      const asset = manager.registerSovereignAsset({
        issuerId: 'ECB',
        issuerName: 'European Central Bank',
        assetType: 'cbdc',
        symbol: 'EURC',
        name: 'Digital Euro',
        jurisdictionCode: 'EU',
        totalSupply: 1_000_000_000,
        reserveRatio: 1.0,
        chainId: 'ton',
      });

      const report = manager.reportToAuthority({
        assetId: asset.id,
        reportingIssuerId: 'ECB',
        reportType: 'daily_position',
        periodFrom: new Date(Date.now() - 86400000),
        periodTo: new Date(),
      });

      expect(report.id).toBeDefined();
      expect(report.reportType).toBe('daily_position');
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('component status', () => {
    it('should return component status', () => {
      const status = manager.getComponentStatus();
      expect(status.totalSovereignAssets).toBe(0);
      expect(status.verifiedIssuers).toBe(0);
    });
  });
});

// ============================================================================
// Component 2: Sovereign Treasury Bridge Tests
// ============================================================================

describe('SovereignTreasuryBridgeManager', () => {
  let manager: DefaultSovereignTreasuryBridgeManager;

  beforeEach(() => {
    manager = createSovereignTreasuryBridgeManager();
  });

  describe('treasury allocation', () => {
    it('should create allocation', () => {
      const allocation = manager.createAllocation({
        sovereignFundId: 'GPFG',
        sovereignFundName: 'Government Pension Fund Global',
        jurisdictionCode: 'NO',
        allocationAmountUsd: 500_000_000,
        allocationCurrency: 'NOK',
        targetAssetId: 'sovereign_asset_1',
      });

      expect(allocation.id).toBeDefined();
      expect(allocation.status).toBe('pending');
      expect(allocation.allocationAmountUsd).toBe(500_000_000);
    });

    it('should activate allocation', () => {
      const allocation = manager.createAllocation({
        sovereignFundId: 'GIC',
        sovereignFundName: 'Government of Singapore Investment Corporation',
        jurisdictionCode: 'SG',
        allocationAmountUsd: 250_000_000,
        allocationCurrency: 'SGD',
        targetAssetId: 'sovereign_asset_2',
      });

      const activated = manager.activateAllocation(allocation.id);
      expect(activated.status).toBe('active');
      expect(activated.activatedAt).toBeInstanceOf(Date);
    });

    it('should redeem allocation', () => {
      const allocation = manager.createAllocation({
        sovereignFundId: 'ADIA',
        sovereignFundName: 'Abu Dhabi Investment Authority',
        jurisdictionCode: 'AE',
        allocationAmountUsd: 1_000_000_000,
        allocationCurrency: 'AED',
        targetAssetId: 'sovereign_asset_3',
      });

      manager.activateAllocation(allocation.id);
      const redeemed = manager.redeemAllocation(allocation.id);
      expect(redeemed.status).toBe('redeemed');
    });

    it('should list allocations with filters', () => {
      manager.createAllocation({
        sovereignFundId: 'GPFG',
        sovereignFundName: 'Government Pension Fund Global',
        jurisdictionCode: 'NO',
        allocationAmountUsd: 500_000_000,
        allocationCurrency: 'NOK',
        targetAssetId: 'sovereign_asset_1',
      });

      const allocations = manager.listAllocations({ jurisdictionCode: 'NO' });
      expect(allocations.length).toBe(1);
    });
  });

  describe('bond issuance', () => {
    it('should issue sovereign bond', () => {
      const bond = manager.issueBond({
        issuerId: 'US_TREASURY',
        issuerJurisdiction: 'US',
        name: 'US Treasury 10-Year Note',
        symbol: 'UST10Y',
        faceValueUsd: 1000,
        couponRatePercent: 4.5,
        maturityDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
        totalIssuance: 10_000_000,
        creditRating: 'AA+',
        chainId: 'ton',
      });

      expect(bond.id).toBeDefined();
      expect(bond.status).toBe('issued');
      expect(bond.outstandingAmount).toBe(10_000_000);
    });

    it('should update bond status', () => {
      const bond = manager.issueBond({
        issuerId: 'UK_DMO',
        issuerJurisdiction: 'UK',
        name: 'UK Gilt 5-Year',
        symbol: 'UKG5Y',
        faceValueUsd: 1000,
        couponRatePercent: 3.5,
        maturityDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        totalIssuance: 5_000_000,
        creditRating: 'AA',
        chainId: 'ton',
      });

      manager.updateBondStatus(bond.id, 'trading');
      const updated = manager.getBond(bond.id);
      expect(updated?.status).toBe('trading');
    });

    it('should assign liquidity pool', () => {
      const bond = manager.issueBond({
        issuerId: 'EU_COMMISSION',
        issuerJurisdiction: 'EU',
        name: 'EU Green Bond',
        symbol: 'EUGB',
        faceValueUsd: 1000,
        couponRatePercent: 2.5,
        maturityDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
        totalIssuance: 8_000_000,
        creditRating: 'AA+',
        chainId: 'ton',
      });

      manager.assignLiquidityPool(bond.id, 'pool_123');
      const updated = manager.getBond(bond.id);
      expect(updated?.liquidityPoolId).toBe('pool_123');
    });
  });

  describe('reserve snapshots', () => {
    it('should record reserve snapshot', () => {
      const snapshot = manager.recordReserveSnapshot({
        assetId: 'sovereign_asset_1',
        jurisdictionCode: 'US',
        totalReserveUsd: 500_000_000_000,
        goldReserveUsd: 50_000_000_000,
        foreignCurrencyReserveUsd: 300_000_000_000,
        digitalAssetReserveUsd: 150_000_000_000,
        reserveRatio: 0.95,
        visibility: 'public',
      });

      expect(snapshot.totalReserveUsd).toBe(500_000_000_000);
      expect(snapshot.visibility).toBe('public');
    });

    it('should get latest reserve snapshot', () => {
      manager.recordReserveSnapshot({
        assetId: 'sovereign_asset_2',
        jurisdictionCode: 'EU',
        totalReserveUsd: 300_000_000_000,
        goldReserveUsd: 30_000_000_000,
        foreignCurrencyReserveUsd: 200_000_000_000,
        digitalAssetReserveUsd: 70_000_000_000,
        reserveRatio: 0.92,
      });

      const latest = manager.getLatestReserveSnapshot('sovereign_asset_2');
      expect(latest).toBeDefined();
      expect(latest?.totalReserveUsd).toBe(300_000_000_000);
    });
  });

  describe('component status', () => {
    it('should return component status', () => {
      const status = manager.getComponentStatus();
      expect(status.totalAllocations).toBe(0);
      expect(status.issuedBonds).toBe(0);
      expect(status.reserveSnapshotsAvailable).toBe(0);
    });
  });
});

// ============================================================================
// Component 3: Cross-Sovereign Coordination Engine Tests
// ============================================================================

describe('CrossSovereignCoordinationManager', () => {
  let manager: DefaultCrossSovereignCoordinationManager;

  beforeEach(() => {
    manager = createCrossSovereignCoordinationManager();
  });

  describe('capital flow coordination', () => {
    it('should initiate cross-border flow', () => {
      const flow = manager.initiateFlow({
        flowType: 'capital_transfer',
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'US',
        assetId: 'sovereign_asset_1',
        amountUsd: 10_000_000,
        complianceVerified: true,
      });

      expect(flow.id).toBeDefined();
      expect(flow.status).toBe('pending');
      expect(flow.riskLevel).toBeDefined();
      expect(flow.aiRecommendation).toBeDefined();
    });

    it('should approve and execute flow', () => {
      const flow = manager.initiateFlow({
        flowType: 'settlement',
        sourceJurisdiction: 'SG',
        destinationJurisdiction: 'HK',
        assetId: 'sovereign_asset_2',
        amountUsd: 5_000_000,
      });

      const approved = manager.approveFlow(flow.id);
      expect(approved.status).toBe('approved');

      const executed = manager.executeFlow(flow.id);
      expect(executed.status).toBe('completed');
      expect(executed.completedAt).toBeInstanceOf(Date);
    });

    it('should block flow with reason', () => {
      const flow = manager.initiateFlow({
        flowType: 'liquidity_swap',
        sourceJurisdiction: 'RU',
        destinationJurisdiction: 'US',
        assetId: 'sovereign_asset_3',
        amountUsd: 100_000_000,
      });

      const blocked = manager.blockFlow(flow.id, 'Sanction compliance');
      expect(blocked.status).toBe('blocked');
    });

    it('should list flows with filters', () => {
      manager.initiateFlow({
        flowType: 'capital_transfer',
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'US',
        assetId: 'asset_1',
        amountUsd: 10_000_000,
      });

      manager.initiateFlow({
        flowType: 'settlement',
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'UK',
        assetId: 'asset_2',
        amountUsd: 5_000_000,
      });

      const euFlows = manager.listFlows({ sourceJurisdiction: 'EU' });
      expect(euFlows.length).toBe(2);
    });
  });

  describe('liquidity balancing', () => {
    it('should compute liquidity balance', () => {
      const balance = manager.computeLiquidityBalance('US', 1_000_000_000, 800_000_000);

      expect(balance.jurisdictionCode).toBe('US');
      expect(balance.liquidityRatio).toBeCloseTo(1.25, 2);
      expect(balance.rebalancingRecommended).toBe(false);
    });

    it('should recommend rebalancing for low liquidity', () => {
      const balance = manager.computeLiquidityBalance('XX', 500_000_000, 800_000_000);

      expect(balance.rebalancingRecommended).toBe(true);
      expect(balance.aiSuggestedAction).toBeDefined();
    });

    it('should suggest rebalancing between jurisdictions', () => {
      manager.computeLiquidityBalance('US', 2_000_000_000, 1_000_000_000);
      manager.computeLiquidityBalance('EU', 500_000_000, 800_000_000);

      const suggestions = manager.suggestRebalancing(['US', 'EU']);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].fromJurisdiction).toBe('US');
      expect(suggestions[0].toJurisdiction).toBe('EU');
    });
  });

  describe('coordination sessions', () => {
    it('should open coordination session', () => {
      const session = manager.openSession({
        participatingJurisdictions: ['EU', 'US', 'UK'],
        sessionType: 'multilateral',
        objective: 'Cross-border liquidity coordination',
        currentStabilityIndex: 85,
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
      expect(session.participatingJurisdictions).toHaveLength(3);
    });

    it('should conclude session', () => {
      const session = manager.openSession({
        participatingJurisdictions: ['EU', 'US'],
        sessionType: 'bilateral',
        objective: 'Settlement optimization',
        currentStabilityIndex: 90,
      });

      const concluded = manager.concludeSession(session.id, 92);
      expect(concluded.status).toBe('concluded');
      expect(concluded.stabilityIndexAfter).toBe(92);
    });

    it('should suspend session', () => {
      const session = manager.openSession({
        participatingJurisdictions: ['ALL'],
        sessionType: 'emergency',
        objective: 'Systemic risk mitigation',
        currentStabilityIndex: 60,
      });

      manager.suspendSession(session.id, 'Pending regulatory review');
      const suspended = manager.getSession(session.id);
      expect(suspended?.status).toBe('suspended');
    });
  });

  describe('risk assessment', () => {
    it('should assess flow risk', () => {
      const assessment = manager.assessFlowRisk({
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'US',
        amountUsd: 50_000_000,
      });

      expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.aiRecommendation).toBeDefined();
      expect(Array.isArray(assessment.mitigationSuggestions)).toBe(true);
    });

    it('should identify high risk for large transfers', () => {
      const assessment = manager.assessFlowRisk({
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'UNKNOWN',
        amountUsd: 2_000_000_000,
      });

      expect(assessment.riskScore).toBeGreaterThan(50);
    });

    it('should get systemic risk summary', () => {
      manager.initiateFlow({
        flowType: 'capital_transfer',
        sourceJurisdiction: 'EU',
        destinationJurisdiction: 'US',
        assetId: 'asset_1',
        amountUsd: 500_000_000,
      });

      const summary = manager.getSystemicRiskSummary();
      expect(summary.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('component status', () => {
    it('should return component status', () => {
      const status = manager.getComponentStatus();
      expect(status.activeFlows).toBe(0);
      expect(status.completedFlows).toBe(0);
      expect(status.jurisdictionsMonitored).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Component 4: Jurisdiction Enforcement Layer Tests
// ============================================================================

describe('JurisdictionEnforcementManager', () => {
  let manager: DefaultJurisdictionEnforcementManager;

  beforeEach(() => {
    manager = createJurisdictionEnforcementManager();
  });

  describe('rule management', () => {
    it('should create enforcement rule', () => {
      const rule = manager.createRule({
        jurisdictionCode: 'US',
        restrictionType: 'volume_limit',
        description: 'Daily volume limit for US participants',
        targetAssets: '*',
        enforcementAction: 'limit',
        volumeLimitUsd: 10_000_000,
        enabled: true,
      });

      expect(rule.id).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.volumeLimitUsd).toBe(10_000_000);
    });

    it('should update rule', () => {
      const rule = manager.createRule({
        jurisdictionCode: 'EU',
        restrictionType: 'kyc_threshold',
        description: 'Enhanced KYC for high-value transactions',
        targetAssets: '*',
        enforcementAction: 'require_approval',
        kycThreshold: 1_000_000,
      });

      const updated = manager.updateRule(rule.id, {
        kycThreshold: 500_000,
      });

      expect(updated.kycThreshold).toBe(500_000);
    });

    it('should enable and disable rule', () => {
      const rule = manager.createRule({
        jurisdictionCode: 'UK',
        restrictionType: 'geographic',
        description: 'UK geographic restriction',
        targetAssets: ['asset_1'],
        enforcementAction: 'flag',
        enabled: false,
      });

      manager.enableRule(rule.id);
      let current = manager.getRule(rule.id);
      expect(current?.enabled).toBe(true);

      manager.disableRule(rule.id);
      current = manager.getRule(rule.id);
      expect(current?.enabled).toBe(false);
    });

    it('should delete rule', () => {
      const rule = manager.createRule({
        jurisdictionCode: 'JP',
        restrictionType: 'participant_eligibility',
        description: 'Japanese participant eligibility',
        targetAssets: '*',
        enforcementAction: 'block',
      });

      manager.deleteRule(rule.id);
      expect(manager.getRule(rule.id)).toBeUndefined();
    });

    it('should list rules with filters', () => {
      manager.createRule({
        jurisdictionCode: 'US',
        restrictionType: 'volume_limit',
        description: 'US volume limit',
        targetAssets: '*',
        enforcementAction: 'limit',
      });

      manager.createRule({
        jurisdictionCode: 'EU',
        restrictionType: 'kyc_threshold',
        description: 'EU KYC threshold',
        targetAssets: '*',
        enforcementAction: 'require_approval',
      });

      const usRules = manager.listRules({ jurisdictionCode: 'US' });
      expect(usRules.length).toBe(1);
    });
  });

  describe('participant eligibility', () => {
    it('should check participant eligibility', () => {
      const eligibility = manager.checkParticipantEligibility({
        participantId: 'inst-001',
        jurisdictionCode: 'US',
        kycLevel: 'institutional',
      });

      expect(eligibility.participantId).toBe('inst-001');
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.sanctionChecked).toBe(true);
    });

    it('should flag participant on sanction list', () => {
      manager.loadSanctionList('OFAC', ['blocked-user-001']);

      const eligibility = manager.checkParticipantEligibility({
        participantId: 'blocked-user-001',
        jurisdictionCode: 'US',
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.sanctionClear).toBe(false);
    });

    it('should update KYC level', () => {
      manager.checkParticipantEligibility({
        participantId: 'user-001',
        jurisdictionCode: 'EU',
        kycLevel: 'basic',
      });

      manager.updateParticipantKycLevel('user-001', 'enhanced');
      const updated = manager.getParticipantEligibility('user-001');
      expect(updated?.kycLevel).toBe('enhanced');
    });
  });

  describe('transaction evaluation', () => {
    it('should evaluate transaction against rules', () => {
      manager.createRule({
        jurisdictionCode: 'US',
        restrictionType: 'volume_limit',
        description: 'Daily limit',
        targetAssets: '*',
        enforcementAction: 'limit',
        volumeLimitUsd: 1_000_000,
      });

      manager.checkParticipantEligibility({
        participantId: 'user-001',
        jurisdictionCode: 'US',
        kycLevel: 'basic',
      });

      const evaluation = manager.evaluateTransaction({
        participantId: 'user-001',
        assetId: 'asset-001',
        jurisdictionCode: 'US',
        transactionAmountUsd: 500_000,
      });

      expect(evaluation.allowed).toBe(true);
    });

    it('should block transaction exceeding volume limit', () => {
      manager.createRule({
        jurisdictionCode: 'EU',
        restrictionType: 'volume_limit',
        description: 'Max transaction limit',
        targetAssets: '*',
        enforcementAction: 'limit',
        volumeLimitUsd: 100_000,
      });

      manager.checkParticipantEligibility({
        participantId: 'user-002',
        jurisdictionCode: 'EU',
        kycLevel: 'basic',
      });

      const evaluation = manager.evaluateTransaction({
        participantId: 'user-002',
        assetId: 'asset-002',
        jurisdictionCode: 'EU',
        transactionAmountUsd: 500_000,
      });

      expect(evaluation.allowed).toBe(false);
      expect(evaluation.triggeredRules.length).toBeGreaterThan(0);
    });

    it('should require approval for high-value transactions', () => {
      manager.createRule({
        jurisdictionCode: 'SG',
        restrictionType: 'kyc_threshold',
        description: 'Approval required above threshold',
        targetAssets: '*',
        enforcementAction: 'require_approval',
        kycThreshold: 100_000,
      });

      manager.checkParticipantEligibility({
        participantId: 'user-003',
        jurisdictionCode: 'SG',
        kycLevel: 'basic',
      });

      const evaluation = manager.evaluateTransaction({
        participantId: 'user-003',
        assetId: 'asset-003',
        jurisdictionCode: 'SG',
        transactionAmountUsd: 200_000,
      });

      expect(evaluation.requiresApproval).toBe(true);
    });
  });

  describe('sanction list management', () => {
    it('should load sanction list', () => {
      manager.loadSanctionList('OFAC', ['entity-001', 'entity-002']);

      expect(manager.checkSanctionList('OFAC', 'entity-001')).toBe(true);
      expect(manager.checkSanctionList('OFAC', 'entity-003')).toBe(false);
    });

    it('should check against multiple sanction lists', () => {
      manager.loadSanctionList('OFAC', ['blocked-us-001']);
      manager.loadSanctionList('EU_SANCTIONS', ['blocked-eu-001']);

      const usEligibility = manager.checkParticipantEligibility({
        participantId: 'blocked-us-001',
        jurisdictionCode: 'US',
      });

      expect(usEligibility.sanctionClear).toBe(false);
    });
  });

  describe('enforcement events', () => {
    it('should record enforcement events', () => {
      manager.createRule({
        jurisdictionCode: 'US',
        restrictionType: 'volume_limit',
        description: 'Volume limit',
        targetAssets: '*',
        enforcementAction: 'block',
        volumeLimitUsd: 10_000,
      });

      manager.checkParticipantEligibility({
        participantId: 'user-004',
        jurisdictionCode: 'US',
        kycLevel: 'basic',
      });

      manager.evaluateTransaction({
        participantId: 'user-004',
        assetId: 'asset-004',
        jurisdictionCode: 'US',
        transactionAmountUsd: 50_000,
      });

      const events = manager.getEnforcementEvents({ jurisdictionCode: 'US' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('component status', () => {
    it('should return component status', () => {
      const status = manager.getComponentStatus();
      expect(status.totalRules).toBe(0);
      expect(status.activeRules).toBe(0);
      expect(status.participantsChecked).toBe(0);
    });
  });
});

// ============================================================================
// Component 5: Sovereign Transparency Dashboard Tests
// ============================================================================

describe('SovereignTransparencyManager', () => {
  let manager: DefaultSovereignTransparencyManager;

  beforeEach(() => {
    manager = createSovereignTransparencyManager();
  });

  describe('transparency mode', () => {
    it('should default to observer mode', () => {
      expect(manager.getTransparencyMode()).toBe('observer');
    });

    it('should change transparency mode', () => {
      manager.setTransparencyMode('allocator');
      expect(manager.getTransparencyMode()).toBe('allocator');

      manager.setTransparencyMode('strategic_partner');
      expect(manager.getTransparencyMode()).toBe('strategic_partner');
    });
  });

  describe('exposure metrics', () => {
    it('should record exposure metric', () => {
      const metric = manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 100_000_000,
        liquidityDepthUsd: 50_000_000,
      });

      expect(metric.jurisdictionCode).toBe('US');
      expect(metric.exposureUsd).toBe(100_000_000);
      expect(metric.concentrationRisk).toBeDefined();
    });

    it('should get exposure metric', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'EU',
        assetId: 'asset-002',
        exposureUsd: 200_000_000,
        liquidityDepthUsd: 100_000_000,
      });

      const metric = manager.getExposureMetric('EU', 'asset-002');
      expect(metric).toBeDefined();
      expect(metric?.exposureUsd).toBe(200_000_000);
    });

    it('should calculate total exposure', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 100_000_000,
        liquidityDepthUsd: 50_000_000,
      });

      manager.recordExposureMetric({
        jurisdictionCode: 'EU',
        assetId: 'asset-002',
        exposureUsd: 150_000_000,
        liquidityDepthUsd: 75_000_000,
      });

      const total = manager.calculateTotalExposure();
      expect(total).toBe(250_000_000);
    });

    it('should calculate concentration risk', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 800_000_000,
        liquidityDepthUsd: 400_000_000,
      });

      manager.recordExposureMetric({
        jurisdictionCode: 'EU',
        assetId: 'asset-002',
        exposureUsd: 200_000_000,
        liquidityDepthUsd: 100_000_000,
      });

      const usRisk = manager.calculateConcentrationRisk('US');
      expect(usRisk).toBe('critical');

      const euRisk = manager.calculateConcentrationRisk('EU');
      expect(euRisk).not.toBe('critical');
    });

    it('should list exposure metrics with filters', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 100_000_000,
        liquidityDepthUsd: 50_000_000,
      });

      manager.recordExposureMetric({
        jurisdictionCode: 'EU',
        assetId: 'asset-002',
        exposureUsd: 50_000_000,
        liquidityDepthUsd: 25_000_000,
      });

      const usMetrics = manager.listExposureMetrics({ jurisdictionCode: 'US' });
      expect(usMetrics.length).toBe(1);
    });
  });

  describe('compliance reporting', () => {
    it('should generate compliance report', () => {
      const report = manager.generateComplianceReport({
        jurisdictionCode: 'US',
        periodFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        periodTo: new Date(),
        totalTransactions: 1000,
        compliantTransactions: 980,
        flaggedTransactions: 15,
        blockedTransactions: 5,
        enforcementActions: 5,
      });

      expect(report.id).toBeDefined();
      expect(report.complianceRate).toBeCloseTo(98, 0);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should get compliance report', () => {
      const created = manager.generateComplianceReport({
        jurisdictionCode: 'EU',
        periodFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        periodTo: new Date(),
        totalTransactions: 5000,
        compliantTransactions: 4950,
        flaggedTransactions: 40,
        blockedTransactions: 10,
        enforcementActions: 10,
      });

      const report = manager.getComplianceReport(created.id);
      expect(report).toBeDefined();
      expect(report?.jurisdictionCode).toBe('EU');
    });

    it('should list compliance reports with filters', () => {
      manager.generateComplianceReport({
        jurisdictionCode: 'US',
        periodFrom: new Date(),
        periodTo: new Date(),
        totalTransactions: 100,
        compliantTransactions: 100,
        flaggedTransactions: 0,
        blockedTransactions: 0,
        enforcementActions: 0,
      });

      const usReports = manager.listComplianceReports({ jurisdictionCode: 'US' });
      expect(usReports.length).toBe(1);
    });
  });

  describe('dashboard snapshots', () => {
    it('should generate dashboard snapshot', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 100_000_000,
        liquidityDepthUsd: 50_000_000,
      });

      const snapshot = manager.generateDashboardSnapshot();

      expect(snapshot.mode).toBe('observer');
      expect(snapshot.totalExposureUsd).toBeGreaterThan(0);
      expect(snapshot.stabilityScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.generatedAt).toBeInstanceOf(Date);
    });

    it('should get latest snapshot', () => {
      manager.generateDashboardSnapshot();

      const latest = manager.getLatestSnapshot();
      expect(latest).toBeDefined();
    });
  });

  describe('alerts', () => {
    it('should raise alert', () => {
      const alert = manager.raiseAlert({
        severity: 'warning',
        category: 'risk',
        message: 'High concentration risk detected in US jurisdiction',
        jurisdictionCode: 'US',
      });

      expect(alert.id).toBeDefined();
      expect(alert.acknowledged).toBe(false);
    });

    it('should acknowledge alert', () => {
      const alert = manager.raiseAlert({
        severity: 'info',
        category: 'compliance',
        message: 'Monthly compliance report ready',
      });

      manager.acknowledgeAlert(alert.id);
      const alerts = manager.listAlerts({ acknowledged: true });
      expect(alerts.length).toBe(1);
    });

    it('should resolve alert', () => {
      const alert = manager.raiseAlert({
        severity: 'critical',
        category: 'systemic',
        message: 'Systemic risk threshold exceeded',
      });

      manager.resolveAlert(alert.id);
      const unresolved = manager.getUnresolvedAlerts();
      expect(unresolved.find(a => a.id === alert.id)).toBeUndefined();
    });

    it('should get critical alerts', () => {
      manager.raiseAlert({
        severity: 'info',
        category: 'compliance',
        message: 'Info alert',
      });

      manager.raiseAlert({
        severity: 'critical',
        category: 'systemic',
        message: 'Critical alert',
      });

      const critical = manager.getCriticalAlerts();
      expect(critical.length).toBe(1);
      expect(critical[0].severity).toBe('critical');
    });

    it('should list alerts with filters', () => {
      manager.raiseAlert({
        severity: 'warning',
        category: 'risk',
        message: 'Risk warning',
        jurisdictionCode: 'US',
      });

      manager.raiseAlert({
        severity: 'warning',
        category: 'liquidity',
        message: 'Liquidity warning',
        jurisdictionCode: 'EU',
      });

      const usAlerts = manager.listAlerts({ jurisdictionCode: 'US' });
      expect(usAlerts.length).toBe(1);
    });
  });

  describe('stability monitoring', () => {
    it('should compute stability score', () => {
      const score = manager.computeStabilityScore();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should reduce stability score for critical alerts', () => {
      const initialScore = manager.computeStabilityScore();

      manager.raiseAlert({
        severity: 'critical',
        category: 'systemic',
        message: 'Critical issue',
      });

      const newScore = manager.computeStabilityScore();
      expect(newScore).toBeLessThan(initialScore);
    });

    it('should compute overall risk index', () => {
      manager.recordExposureMetric({
        jurisdictionCode: 'US',
        assetId: 'asset-001',
        exposureUsd: 100_000_000,
        liquidityDepthUsd: 50_000_000,
        riskIndex: 30,
      });

      const riskIndex = manager.computeOverallRiskIndex();
      expect(riskIndex).toBe(30);
    });
  });

  describe('component status', () => {
    it('should return component status', () => {
      const status = manager.getComponentStatus();
      expect(status.totalExposureMetrics).toBe(0);
      expect(status.totalComplianceReports).toBe(0);
      expect(status.currentMode).toBe('observer');
    });
  });
});
