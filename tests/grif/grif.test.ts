/**
 * TONAIAgent - Global Regulatory Integration Framework (GRIF) Tests
 *
 * Comprehensive test suite for all 6 GRIF components:
 * 1. Jurisdiction-Aware Deployment Layer
 * 2. Regulatory Mapping Matrix
 * 3. Compliance Module Interface
 * 4. Regulatory Transparency Portal
 * 5. Audit & Attestation Layer
 * 6. Regulatory Dialogue Framework
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGRIFManager,
  createJurisdictionDeploymentLayer,
  createRegulatoryMappingMatrix,
  createComplianceModuleInterface,
  createTransparencyPortal,
  createAuditAttestationLayer,
  createRegulatoryDialogueFramework,
  GRIFManager,
  JurisdictionDeploymentLayer,
  RegulatoryMappingMatrix,
  ComplianceModuleInterface,
  TransparencyPortal,
  AuditAttestationLayer,
  RegulatoryDialogueFramework,
} from '../../research/grif/index';

// ============================================================================
// GRIFManager Tests
// ============================================================================

describe('GRIFManager', () => {
  let grif: GRIFManager;

  beforeEach(() => {
    grif = createGRIFManager({
      primaryJurisdiction: 'CH',
      operationalRegions: ['EU', 'APAC'],
      complianceLevel: 'institutional',
    });
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultGrif = createGRIFManager();
      expect(defaultGrif.config.primaryJurisdiction).toBe('CH');
      expect(defaultGrif.config.operationalRegions).toEqual(['EU', 'APAC']);
      expect(defaultGrif.config.complianceLevel).toBe('standard');
    });

    it('should initialize with custom configuration', () => {
      expect(grif.config.primaryJurisdiction).toBe('CH');
      expect(grif.config.complianceLevel).toBe('institutional');
    });

    it('should expose all six GRIF components', () => {
      expect(grif.jurisdictionDeployment).toBeDefined();
      expect(grif.regulatoryMapping).toBeDefined();
      expect(grif.complianceModules).toBeDefined();
      expect(grif.transparencyPortal).toBeDefined();
      expect(grif.auditAttestation).toBeDefined();
      expect(grif.dialogueFramework).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return a GRIF status report', () => {
      const status = grif.getStatus();

      expect(status.overall).toBeDefined();
      expect(status.score).toBeGreaterThan(0);
      expect(status.lastAssessed).toBeInstanceOf(Date);
      expect(status.nextReviewDue).toBeInstanceOf(Date);
      expect(status.activeModules).toBeGreaterThan(0);
      expect(status.riskLevel).toBeDefined();
    });

    it('should reflect enabled jurisdictions in status', () => {
      grif.activateJurisdiction('CH');
      grif.activateJurisdiction('SG');
      const status = grif.getStatus();
      expect(status.enabledJurisdictions).toContain('CH');
      expect(status.enabledJurisdictions).toContain('SG');
    });
  });

  describe('activateJurisdiction', () => {
    it('should activate a jurisdiction from the regulatory mapping', () => {
      grif.activateJurisdiction('AE');
      const config = grif.jurisdictionDeployment.getDeploymentConfig('AE');
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true);
    });
  });

  describe('getJurisdictionSummary', () => {
    it('should return combined summary for a jurisdiction', () => {
      const summary = grif.getJurisdictionSummary('CH');
      expect(summary.regulatoryMapping).toBeDefined();
      expect(summary.regulatoryMapping.jurisdiction).toBe('CH');
      expect(summary.activeModules).toBeDefined();
      expect(Array.isArray(summary.activeModules)).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit events from sub-components', async () => {
      const events: string[] = [];
      grif.onEvent((e) => events.push(e.type));

      await grif.complianceModules.verifyParticipant({
        participantId: 'p1',
        participantType: 'retail',
        jurisdiction: 'CH',
      });

      expect(events).toContain('participant_verified');
    });
  });
});

// ============================================================================
// Jurisdiction-Aware Deployment Layer Tests
// ============================================================================

describe('JurisdictionDeploymentLayer', () => {
  let layer: JurisdictionDeploymentLayer;

  beforeEach(() => {
    layer = createJurisdictionDeploymentLayer();
  });

  describe('configuration', () => {
    it('should initialize with default config', () => {
      expect(layer.config.enabled).toBe(true);
      expect(layer.config.enableAutoEnforcement).toBe(true);
    });
  });

  describe('jurisdiction management', () => {
    it('should enable a jurisdiction', () => {
      const config = layer.enableJurisdiction('CH', 'EU');
      expect(config.jurisdiction).toBe('CH');
      expect(config.region).toBe('EU');
      expect(config.enabled).toBe(true);
    });

    it('should enable a jurisdiction with compliance rules', () => {
      const config = layer.enableJurisdiction('SG', 'APAC', [
        {
          ruleType: 'kyc_aml',
          description: 'MAS KYC requirements',
        },
      ]);
      expect(config.complianceRules).toHaveLength(1);
      expect(config.complianceRules[0].ruleType).toBe('kyc_aml');
    });

    it('should disable a jurisdiction', () => {
      layer.enableJurisdiction('DE', 'EU');
      layer.disableJurisdiction('DE');
      const config = layer.getDeploymentConfig('DE');
      expect(config?.enabled).toBe(false);
    });

    it('should list only enabled jurisdictions', () => {
      layer.enableJurisdiction('CH', 'EU');
      layer.enableJurisdiction('SG', 'APAC');
      const enabled = layer.listDeploymentConfigs({ enabled: true });
      expect(enabled.length).toBeGreaterThanOrEqual(2);
      expect(enabled.every((c) => c.enabled)).toBe(true);
    });

    it('should add compliance rules to existing jurisdiction', () => {
      layer.enableJurisdiction('US', 'US');
      const rule = layer.addComplianceRule('US', {
        ruleType: 'reporting_obligation',
        description: 'FinCEN CTR reporting',
      });
      expect(rule.jurisdiction).toBe('US');
      expect(rule.ruleType).toBe('reporting_obligation');
    });

    it('should set restricted activities', () => {
      layer.enableJurisdiction('JP', 'APAC');
      layer.setRestrictedActivities('JP', ['anonymous_crypto_transfer']);
      const config = layer.getDeploymentConfig('JP');
      expect(config?.restrictedActivities).toContain('anonymous_crypto_transfer');
    });

    it('should set reporting frequency', () => {
      layer.enableJurisdiction('AU', 'APAC');
      layer.setReportingFrequency('AU', 'quarterly');
      const config = layer.getDeploymentConfig('AU');
      expect(config?.reportingFrequency).toBe('quarterly');
    });
  });

  describe('fund classes', () => {
    it('should register a public fund class', () => {
      const fc = layer.registerFundClass({
        name: 'Public Fund',
        type: 'public',
        eligibleJurisdictions: ['CH', 'SG'],
      });
      expect(fc.id).toBeDefined();
      expect(fc.name).toBe('Public Fund');
      expect(fc.type).toBe('public');
      expect(fc.active).toBe(true);
    });

    it('should register an institutional fund class', () => {
      const fc = layer.registerFundClass({
        name: 'Institutional Vault',
        type: 'institutional',
        eligibleJurisdictions: ['CH', 'SG', 'GB'],
        minimumInvestment: 1_000_000,
        currency: 'USD',
      });
      expect(fc.minimumInvestment).toBe(1_000_000);
      expect(fc.participantRequirements[0].type).toBe('institutional');
      expect(fc.participantRequirements[0].kycTier).toBe('institutional');
    });

    it('should register a sovereign fund class', () => {
      const fc = layer.registerFundClass({
        name: 'Sovereign Fund',
        type: 'sovereign',
        eligibleJurisdictions: ['CH'],
      });
      expect(fc.participantRequirements[0].type).toBe('sovereign');
      expect(fc.participantRequirements[0].additionalChecks).toContain('sovereign_verification');
    });

    it('should register an RWA-only fund class', () => {
      const fc = layer.registerFundClass({
        name: 'RWA Fund',
        type: 'rwa_only',
        eligibleJurisdictions: ['CH', 'AE'],
        assetRestrictions: ['unregistered_tokens'],
      });
      expect(fc.assetRestrictions).toContain('unregistered_tokens');
    });

    it('should list fund classes with filters', () => {
      layer.registerFundClass({
        name: 'Public A',
        type: 'public',
        eligibleJurisdictions: ['CH'],
      });
      layer.registerFundClass({
        name: 'Institutional B',
        type: 'institutional',
        eligibleJurisdictions: ['SG'],
      });

      const institutional = layer.listFundClasses({ type: 'institutional' });
      expect(institutional.every((fc) => fc.type === 'institutional')).toBe(true);
    });

    it('should deactivate a fund class', () => {
      const fc = layer.registerFundClass({
        name: 'Old Fund',
        type: 'public',
        eligibleJurisdictions: ['CH'],
      });
      const deactivated = layer.deactivateFundClass(fc.id);
      expect(deactivated.active).toBe(false);
    });
  });

  describe('permissioned pools', () => {
    let fundClassId: string;

    beforeEach(() => {
      const fc = layer.registerFundClass({
        name: 'Institutional Pool Fund',
        type: 'institutional',
        eligibleJurisdictions: ['CH', 'SG', 'AE'],
      });
      fundClassId = fc.id;
    });

    it('should create an institutional-only pool', () => {
      const pool = layer.createPermissionedPool({
        name: 'CH Institutional Pool',
        fundClassId,
        jurisdiction: 'CH',
        allowedParticipantTypes: ['institutional', 'sovereign'],
        initialTvl: 50_000_000,
        currency: 'USD',
      });
      expect(pool.id).toBeDefined();
      expect(pool.name).toBe('CH Institutional Pool');
      expect(pool.tvl).toBe(50_000_000);
      expect(pool.status).toBe('open');
    });

    it('should reject pool creation for non-eligible jurisdiction', () => {
      expect(() =>
        layer.createPermissionedPool({
          name: 'Invalid Pool',
          fundClassId,
          jurisdiction: 'US',
          allowedParticipantTypes: ['institutional'],
        })
      ).toThrow('not eligible');
    });

    it('should check participation eligibility', () => {
      const pool = layer.createPermissionedPool({
        name: 'Accredited Pool',
        fundClassId,
        jurisdiction: 'SG',
        allowedParticipantTypes: ['accredited_investor', 'institutional'],
      });

      expect(layer.canParticipate(pool.id, 'accredited_investor')).toBe(true);
      expect(layer.canParticipate(pool.id, 'retail')).toBe(false);
    });

    it('should update pool status', () => {
      const pool = layer.createPermissionedPool({
        name: 'Test Pool',
        fundClassId,
        jurisdiction: 'AE',
        allowedParticipantTypes: ['institutional'],
      });
      const closed = layer.updatePoolStatus(pool.id, 'closed');
      expect(closed.status).toBe('closed');
      expect(layer.canParticipate(pool.id, 'institutional')).toBe(false);
    });

    it('should list pools by jurisdiction', () => {
      layer.createPermissionedPool({
        name: 'CH Pool',
        fundClassId,
        jurisdiction: 'CH',
        allowedParticipantTypes: ['institutional'],
      });
      layer.createPermissionedPool({
        name: 'SG Pool',
        fundClassId,
        jurisdiction: 'SG',
        allowedParticipantTypes: ['institutional'],
      });

      const chPools = layer.listPools({ jurisdiction: 'CH' });
      expect(chPools.every((p) => p.jurisdiction === 'CH')).toBe(true);
    });
  });
});

// ============================================================================
// Regulatory Mapping Matrix Tests
// ============================================================================

describe('RegulatoryMappingMatrix', () => {
  let matrix: RegulatoryMappingMatrix;

  beforeEach(() => {
    matrix = createRegulatoryMappingMatrix();
  });

  describe('getMapping', () => {
    it('should return Switzerland mapping', () => {
      const mapping = matrix.getMapping('CH');
      expect(mapping.jurisdiction).toBe('CH');
      expect(mapping.region).toBe('EU');
      expect(mapping.securitiesClassification.digitalAssetsAs).toBe('securities');
      expect(mapping.custodyRequirements.requiresLicensedCustodian).toBe(true);
      expect(mapping.kycAmlObligations.sarFilingRequired).toBe(true);
    });

    it('should return US mapping with strict requirements', () => {
      const mapping = matrix.getMapping('US');
      expect(mapping.jurisdiction).toBe('US');
      expect(mapping.region).toBe('US');
      expect(mapping.kycAmlObligations.kycTierRequired).toBe('institutional');
      expect(mapping.custodyRequirements.requiresLicensedCustodian).toBe(true);
      expect(mapping.custodyRequirements.insuranceRequired).toBe(true);
    });

    it('should return Singapore mapping', () => {
      const mapping = matrix.getMapping('SG');
      expect(mapping.jurisdiction).toBe('SG');
      expect(mapping.region).toBe('APAC');
      expect(mapping.reportingObligations.length).toBeGreaterThan(0);
    });

    it('should return UAE mapping', () => {
      const mapping = matrix.getMapping('AE');
      expect(mapping.jurisdiction).toBe('AE');
      expect(mapping.region).toBe('MENA');
      expect(mapping.securitiesClassification.digitalAssetsAs).toBe('utility');
    });

    it('should throw for unknown jurisdiction', () => {
      expect(() => matrix.getMapping('XX' as any)).toThrow();
    });
  });

  describe('listMappings', () => {
    it('should list all mappings', () => {
      const all = matrix.listMappings();
      expect(all.length).toBeGreaterThan(10);
    });

    it('should filter by region', () => {
      const eu = matrix.listMappings('EU');
      expect(eu.every((m) => m.region === 'EU')).toBe(true);
      expect(eu.length).toBeGreaterThan(0);

      const apac = matrix.listMappings('APAC');
      expect(apac.every((m) => m.region === 'APAC')).toBe(true);
    });
  });

  describe('compareKycAml', () => {
    it('should compare KYC/AML across jurisdictions', () => {
      const comparison = matrix.compareKycAml(['CH', 'US', 'SG']);
      expect(comparison['CH']).toBeDefined();
      expect(comparison['US']).toBeDefined();
      expect(comparison['SG']).toBeDefined();
      expect(comparison['US'].kycTierRequired).toBe('institutional');
    });
  });

  describe('findPermissiveJurisdictions', () => {
    it('should find jurisdictions allowing self-custody', () => {
      const permissive = matrix.findPermissiveJurisdictions({ selfCustodyAllowed: true });
      const mappings = permissive.map((j) => matrix.getMapping(j));
      expect(mappings.every((m) => m.custodyRequirements.selfCustodyAllowed)).toBe(true);
    });

    it('should find jurisdictions with basic KYC tier', () => {
      const basic = matrix.findPermissiveJurisdictions({ maxKycTier: 'basic' });
      expect(basic.length).toBeGreaterThan(0);
      const mappings = basic.map((j) => matrix.getMapping(j));
      expect(mappings.every((m) => m.kycAmlObligations.kycTierRequired === 'basic')).toBe(true);
    });

    it('should filter by region', () => {
      const mena = matrix.findPermissiveJurisdictions({ region: 'MENA' });
      const mappings = mena.map((j) => matrix.getMapping(j));
      expect(mappings.every((m) => m.region === 'MENA')).toBe(true);
    });
  });

  describe('getSupportedJurisdictions', () => {
    it('should return all supported jurisdictions', () => {
      const jurisdictions = matrix.getSupportedJurisdictions();
      expect(jurisdictions).toContain('CH');
      expect(jurisdictions).toContain('US');
      expect(jurisdictions).toContain('SG');
      expect(jurisdictions).toContain('AE');
      expect(jurisdictions).toContain('GB');
      expect(jurisdictions.length).toBeGreaterThan(10);
    });
  });
});

// ============================================================================
// Compliance Module Interface Tests
// ============================================================================

describe('ComplianceModuleInterface', () => {
  let cmi: ComplianceModuleInterface;

  beforeEach(() => {
    cmi = createComplianceModuleInterface();
  });

  describe('module management', () => {
    it('should register a custom compliance module', () => {
      const module = cmi.registerModule({
        name: 'Custom RWA Module',
        version: '2.0.0',
        supportedJurisdictions: ['CH', 'SG'],
        capabilities: ['rwa_compliance', 'asset_restriction'],
      });
      expect(module.id).toBeDefined();
      expect(module.name).toBe('Custom RWA Module');
      expect(module.status).toBe('active');
    });

    it('should include built-in modules by default', () => {
      const modules = cmi.listModules({ status: 'active' });
      expect(modules.length).toBeGreaterThan(0);
      const names = modules.map((m) => m.name);
      expect(names.some((n) => n.includes('KYC'))).toBe(true);
    });

    it('should deactivate a module', () => {
      const module = cmi.registerModule({
        name: 'Test Module',
        supportedJurisdictions: ['CH'],
        capabilities: ['kyc_verification'],
      });
      const deactivated = cmi.deactivateModule(module.id);
      expect(deactivated.status).toBe('inactive');
    });

    it('should list modules by capability', () => {
      const rwaMods = cmi.listModules({ capability: 'rwa_compliance' });
      expect(rwaMods.every((m) => m.capabilities.includes('rwa_compliance'))).toBe(true);
    });

    it('should list modules by jurisdiction', () => {
      const chMods = cmi.listModules({ jurisdiction: 'CH' });
      expect(chMods.every((m) => m.supportedJurisdictions.includes('CH'))).toBe(true);
    });
  });

  describe('verifyParticipant', () => {
    it('should verify a retail participant', async () => {
      const result = await cmi.verifyParticipant({
        participantId: 'retail-001',
        participantType: 'retail',
        jurisdiction: 'CH',
      });
      expect(result.participantId).toBe('retail-001');
      expect(result.verified).toBe(true);
      expect(result.tier).toBe('retail');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should verify an institutional participant with enhanced checks', async () => {
      const result = await cmi.verifyParticipant({
        participantId: 'inst-001',
        participantType: 'institutional',
        jurisdiction: 'SG',
      });
      expect(result.verified).toBe(true);
      expect(result.tier).toBe('institutional');
      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('legal_entity_verification');
      expect(checkNames).toContain('aml_due_diligence');
    });

    it('should verify a sovereign participant with all checks', async () => {
      const result = await cmi.verifyParticipant({
        participantId: 'sovereign-001',
        participantType: 'sovereign',
        jurisdiction: 'AE',
      });
      expect(result.tier).toBe('sovereign');
      const checkNames = result.checks.map((c) => c.name);
      expect(checkNames).toContain('sanctions_screening');
    });

    it('should cache verification results', async () => {
      const first = await cmi.verifyParticipant({
        participantId: 'cache-test',
        participantType: 'retail',
        jurisdiction: 'CH',
      });
      const second = await cmi.verifyParticipant({
        participantId: 'cache-test',
        participantType: 'retail',
        jurisdiction: 'CH',
      });
      expect(first.verifiedAt.getTime()).toBe(second.verifiedAt.getTime());
    });
  });

  describe('validateAsset', () => {
    it('should validate a standard crypto asset across jurisdictions', async () => {
      const result = await cmi.validateAsset({
        assetId: 'TON',
        assetType: 'cryptocurrency',
        targetJurisdictions: ['CH', 'SG', 'AE'],
      });
      expect(result.valid).toBe(true);
      expect(result.jurisdictions).toContain('CH');
    });

    it('should flag RWA assets as restricted in some jurisdictions', async () => {
      const result = await cmi.validateAsset({
        assetId: 'rwa-us-bond',
        assetType: 'rwa',
        targetJurisdictions: ['US', 'CH'],
      });
      expect(result.restrictions.some((r) => r.includes('US'))).toBe(true);
      // CH should still be valid for RWA
      expect(result.jurisdictions).not.toContain('US');
    });
  });

  describe('enforceRestrictions', () => {
    it('should allow a standard transaction', async () => {
      const result = await cmi.enforceRestrictions({
        participantId: 'p1',
        action: 'swap',
        jurisdiction: 'CH',
        amount: 5_000,
        currency: 'USD',
      });
      expect(result.allowed).toBe(true);
    });

    it('should block a restricted action in a jurisdiction', async () => {
      const result = await cmi.enforceRestrictions({
        participantId: 'p1',
        action: 'unregistered_securities_offering',
        jurisdiction: 'US',
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should add reporting rules for large US transactions', async () => {
      const result = await cmi.enforceRestrictions({
        participantId: 'p1',
        action: 'transfer',
        jurisdiction: 'US',
        amount: 15_000_000,
        currency: 'USD',
      });
      expect(result.appliedRules).toContain('US_BSA_REPORTING');
    });
  });

  describe('generateReport', () => {
    it('should generate a compliance report', async () => {
      const modules = cmi.listModules({ status: 'active' });
      expect(modules.length).toBeGreaterThan(0);

      const report = await cmi.generateReport({
        moduleId: modules[0].id,
        reportType: 'AML_QUARTERLY',
        jurisdiction: 'CH',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-03-31'),
      });

      expect(report.id).toBeDefined();
      expect(report.reportType).toBe('AML_QUARTERLY');
      expect(report.jurisdiction).toBe('CH');
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should fail for inactive module', async () => {
      const module = cmi.registerModule({
        name: 'Inactive Module',
        supportedJurisdictions: ['CH'],
        capabilities: ['kyc_verification'],
      });
      cmi.deactivateModule(module.id);

      await expect(
        cmi.generateReport({
          moduleId: module.id,
          reportType: 'TEST',
          jurisdiction: 'CH',
          periodStart: new Date(),
          periodEnd: new Date(),
        })
      ).rejects.toThrow('not active');
    });
  });
});

// ============================================================================
// Transparency Portal Tests
// ============================================================================

describe('TransparencyPortal', () => {
  let portal: TransparencyPortal;

  beforeEach(() => {
    portal = createTransparencyPortal({ enabled: true, publicAccess: true });
  });

  describe('portal data access', () => {
    it('should return stability index', () => {
      const si = portal.getStabilityIndex();
      expect(si.overallScore).toBeGreaterThan(0);
      expect(si.components).toBeDefined();
      expect(si.trend).toBeDefined();
    });

    it('should return capital adequacy metrics', () => {
      const ca = portal.getCapitalAdequacy();
      expect(ca.tier1Ratio).toBeGreaterThan(0);
      expect(ca.totalCapitalRatio).toBeGreaterThan(0);
      expect(ca.status).toBeDefined();
    });

    it('should return treasury reserves', () => {
      const tr = portal.getTreasuryReserves();
      expect(tr.totalReserves).toBeGreaterThan(0);
      expect(tr.composition).toBeDefined();
      expect(Array.isArray(tr.composition)).toBe(true);
    });

    it('should return clearing statistics', () => {
      const cs = portal.getClearingStatistics();
      expect(cs.totalTransactions).toBeGreaterThan(0);
      expect(cs.successRate).toBeGreaterThan(0);
      expect(cs.jurisdictionBreakdown).toBeDefined();
    });
  });

  describe('data updates', () => {
    it('should update stability index', () => {
      const updated = portal.updateStabilityIndex({
        overallScore: 87,
        components: { liquidity: 90, solvency: 88 },
        trend: 'improving',
      });
      expect(updated.overallScore).toBe(87);
      expect(portal.getStabilityIndex().overallScore).toBe(87);
    });

    it('should update capital adequacy', () => {
      const updated = portal.updateCapitalAdequacy({
        tier1Ratio: 14.5,
        tier2Ratio: 2.8,
        totalCapitalRatio: 17.3,
        leverageRatio: 7.9,
        liquidityCoverageRatio: 138,
        netStableFundingRatio: 118,
      });
      expect(updated.tier1Ratio).toBe(14.5);
      expect(updated.status).toBe('adequate');
    });

    it('should update treasury reserves', () => {
      const updated = portal.updateTreasuryReserves({
        totalReserves: 200_000_000,
        currency: 'USD',
        composition: [{ assetType: 'TON', amount: 120_000_000, percentage: 60, chain: 'ton' }],
      });
      expect(updated.totalReserves).toBe(200_000_000);
    });

    it('should update clearing statistics', () => {
      const updated = portal.updateClearingStatistics({
        totalTransactions: 200_000,
        totalVolume: 8_000_000_000,
        currency: 'USD',
        averageSettlementTimeMinutes: 2.8,
        successRate: 99.9,
        jurisdictionBreakdown: { EU: 80_000, APAC: 100_000, MENA: 20_000 },
      });
      expect(updated.successRate).toBe(99.9);
    });
  });

  describe('historical data', () => {
    it('should track stability history', () => {
      portal.updateStabilityIndex({ overallScore: 90, components: {}, trend: 'stable' });
      portal.updateStabilityIndex({ overallScore: 92, components: {}, trend: 'improving' });
      const history = portal.getStabilityHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply limit filter', () => {
      for (let i = 0; i < 5; i++) {
        portal.updateStabilityIndex({ overallScore: 90 + i, components: {}, trend: 'stable' });
      }
      const limited = portal.getStabilityHistory({ limit: 3 });
      expect(limited.length).toBe(3);
    });
  });

  describe('dashboard', () => {
    it('should return healthy dashboard status', () => {
      const dashboard = portal.getDashboard();
      expect(['healthy', 'warning', 'critical']).toContain(dashboard.status);
      expect(dashboard.metrics.stabilityScore).toBeGreaterThan(0);
      expect(dashboard.metrics.clearingSuccessRate).toBeGreaterThan(0);
      expect(dashboard.lastRefreshed).toBeInstanceOf(Date);
    });

    it('should return warning status for low stability', () => {
      portal.updateStabilityIndex({ overallScore: 72, components: {}, trend: 'declining' });
      const dashboard = portal.getDashboard();
      expect(dashboard.status).toBe('warning');
    });

    it('should return critical status for critical stability', () => {
      portal.updateStabilityIndex({ overallScore: 55, components: {}, trend: 'declining' });
      const dashboard = portal.getDashboard();
      expect(dashboard.status).toBe('critical');
    });
  });
});

// ============================================================================
// Audit & Attestation Layer Tests
// ============================================================================

describe('AuditAttestationLayer', () => {
  let layer: AuditAttestationLayer;

  beforeEach(() => {
    layer = createAuditAttestationLayer({ attestationTtlDays: 90 });
  });

  describe('audit management', () => {
    it('should schedule an audit', () => {
      const audit = layer.scheduleAudit({
        auditType: 'financial_statement',
        auditor: 'Big4 Auditor',
        scope: ['treasury', 'capital_adequacy'],
        jurisdiction: 'CH',
        startDate: new Date('2025-06-01'),
      });
      expect(audit.id).toBeDefined();
      expect(audit.status).toBe('scheduled');
      expect(audit.auditor).toBe('Big4 Auditor');
    });

    it('should advance audit through lifecycle', () => {
      const scheduled = layer.scheduleAudit({
        auditType: 'aml_compliance',
        auditor: 'External Compliance Firm',
        scope: ['kyc_aml', 'transaction_monitoring'],
        startDate: new Date(),
      });

      const inProgress = layer.startAudit(scheduled.id);
      expect(inProgress.status).toBe('in_progress');

      const completed = layer.completeAudit({
        auditId: scheduled.id,
        findings: [
          { severity: 'low', category: 'documentation', description: 'Missing AML policy update' },
        ],
        reportUrl: 'https://reports.auditor.com/audit-001',
      });
      expect(completed.status).toBe('completed');
      expect(completed.findings).toHaveLength(1);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('should resolve audit findings', () => {
      const scheduled = layer.scheduleAudit({
        auditType: 'risk',
        auditor: 'Risk Auditor',
        scope: ['market_risk'],
        startDate: new Date(),
      });
      layer.startAudit(scheduled.id);
      const completed = layer.completeAudit({
        auditId: scheduled.id,
        findings: [
          { severity: 'medium', category: 'risk_controls', description: 'Update stress test parameters' },
        ],
      });

      const resolved = layer.resolveAuditFinding(completed.id, 0);
      expect(resolved.findings[0].resolved).toBe(true);
    });

    it('should list audits by status', () => {
      layer.scheduleAudit({ auditType: 'a', auditor: 'X', scope: [], startDate: new Date() });
      layer.scheduleAudit({ auditType: 'b', auditor: 'Y', scope: [], startDate: new Date() });

      const scheduled = layer.listAudits({ status: 'scheduled' });
      expect(scheduled.every((a) => a.status === 'scheduled')).toBe(true);
    });

    it('should throw when completing a non-in-progress audit', () => {
      const audit = layer.scheduleAudit({
        auditType: 'test',
        auditor: 'Test Auditor',
        scope: [],
        startDate: new Date(),
      });
      expect(() =>
        layer.completeAudit({ auditId: audit.id, findings: [] })
      ).toThrow('not in progress');
    });
  });

  describe('proof of reserve attestations', () => {
    it('should issue a proof of reserve', () => {
      const att = layer.issueProofOfReserve({
        issuer: 'TONAIAgent',
        reserveAmount: 100_000_000,
        currency: 'USD',
        chain: 'ton',
        jurisdiction: 'CH',
      });
      expect(att.id).toBeDefined();
      expect(att.type).toBe('proof_of_reserve');
      expect(att.reserveAmount).toBe(100_000_000);
      expect(att.merkleRoot).toBeDefined();
      expect(att.proofHash).toBeDefined();
      expect(att.verified).toBe(true);
      expect(att.expiresAt).toBeInstanceOf(Date);
    });

    it('should issue a ZK proof of reserve', () => {
      const att = layer.issueProofOfReserve({
        issuer: 'TONAIAgent',
        reserveAmount: 50_000_000,
        currency: 'USD',
        zkProof: true,
      });
      expect(att.zkProof).toBeDefined();
      expect(att.zkProof).toMatch(/^zk_proof_/);
    });
  });

  describe('risk attestations', () => {
    it('should issue a risk attestation', () => {
      const att = layer.issueRiskAttestation({
        issuer: 'RiskEngine',
        subject: 'protocol_portfolio',
        riskScore: 25,
        riskFactors: ['market_volatility', 'liquidity_risk'],
        assessmentMethodology: 'VaR + Stress Testing',
        jurisdiction: 'SG',
      });
      expect(att.type).toBe('risk_attestation');
      expect(att.riskScore).toBe(25);
      expect(att.riskLevel).toBe('low');
      expect(att.riskFactors).toContain('market_volatility');
    });

    it('should map risk score to correct risk level', () => {
      const low = layer.issueRiskAttestation({
        issuer: 'X', subject: 'y', riskScore: 20, riskFactors: [], assessmentMethodology: 'test',
      });
      expect(low.riskLevel).toBe('low');

      const medium = layer.issueRiskAttestation({
        issuer: 'X', subject: 'y', riskScore: 40, riskFactors: [], assessmentMethodology: 'test',
      });
      expect(medium.riskLevel).toBe('medium');

      const high = layer.issueRiskAttestation({
        issuer: 'X', subject: 'y', riskScore: 70, riskFactors: [], assessmentMethodology: 'test',
      });
      expect(high.riskLevel).toBe('high');

      const critical = layer.issueRiskAttestation({
        issuer: 'X', subject: 'y', riskScore: 90, riskFactors: [], assessmentMethodology: 'test',
      });
      expect(critical.riskLevel).toBe('critical');
    });
  });

  describe('compliance attestations', () => {
    it('should issue a compliance attestation', () => {
      const att = layer.issueComplianceAttestation({
        issuer: 'ComplianceTeam',
        subject: 'platform_v2',
        complianceFramework: 'MiCA',
        regulatoryStatus: 'compliant',
        coveredJurisdictions: ['CH', 'DE', 'FR'],
        complianceScore: 92,
      });
      expect(att.type).toBe('compliance_attestation');
      expect(att.regulatoryStatus).toBe('compliant');
      expect(att.coveredJurisdictions).toContain('CH');
      expect(att.complianceScore).toBe(92);
    });
  });

  describe('attestation verification', () => {
    it('should verify a valid attestation', () => {
      const att = layer.issueProofOfReserve({
        issuer: 'TONAIAgent',
        reserveAmount: 50_000_000,
        currency: 'USD',
      });
      expect(layer.verifyAttestation(att.id)).toBe(true);
    });

    it('should return false for non-existent attestation', () => {
      expect(layer.verifyAttestation('nonexistent-id')).toBe(false);
    });

    it('should list attestations by type', () => {
      layer.issueProofOfReserve({ issuer: 'A', reserveAmount: 1, currency: 'USD' });
      layer.issueProofOfReserve({ issuer: 'B', reserveAmount: 2, currency: 'USD' });
      layer.issueRiskAttestation({ issuer: 'C', subject: 's', riskScore: 10, riskFactors: [], assessmentMethodology: 'm' });

      const por = layer.listAttestations({ type: 'proof_of_reserve' });
      expect(por.every((a) => a.type === 'proof_of_reserve')).toBe(true);
      expect(por.length).toBe(2);
    });
  });
});

// ============================================================================
// Regulatory Dialogue Framework Tests
// ============================================================================

describe('RegulatoryDialogueFramework', () => {
  let framework: RegulatoryDialogueFramework;

  beforeEach(() => {
    framework = createRegulatoryDialogueFramework();
  });

  describe('document management', () => {
    it('should initialize with default whitepaper document', () => {
      const docs = framework.listDocuments({ type: 'whitepaper_disclosure' });
      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0].status).toBe('published');
    });

    it('should create a risk report document', () => {
      const doc = framework.createDocument({
        type: 'risk_report',
        title: 'Q1 2025 Risk Report',
        content: 'This report covers systemic risk metrics for Q1 2025.',
        jurisdiction: 'CH',
        targetAudience: ['regulators', 'institutions'],
      });
      expect(doc.type).toBe('risk_report');
      expect(doc.status).toBe('draft');
      expect(doc.jurisdiction).toBe('CH');
    });

    it('should create a governance transparency document', () => {
      const doc = framework.createDocument({
        type: 'governance_transparency',
        title: 'Protocol Governance Charter Summary',
        content: 'Summary of governance structure and processes.',
        targetAudience: ['regulators', 'institutions', 'public'],
      });
      expect(doc.type).toBe('governance_transparency');
    });

    it('should auto-publish when configured', () => {
      const autoPublishFramework = createRegulatoryDialogueFramework({ autoPublish: true });
      const doc = autoPublishFramework.createDocument({
        type: 'whitepaper_disclosure',
        title: 'Auto-Published Document',
        content: 'Content',
      });
      expect(doc.status).toBe('published');
      expect(doc.publishedAt).toBeDefined();
    });

    it('should update a document', () => {
      const doc = framework.createDocument({
        type: 'risk_report',
        title: 'Old Title',
        content: 'Old content',
      });
      const updated = framework.updateDocument({
        documentId: doc.id,
        title: 'Updated Title',
        content: 'Updated content',
        version: '1.1.0',
      });
      expect(updated.title).toBe('Updated Title');
      expect(updated.version).toBe('1.1.0');
      expect(updated.status).toBe('review');
    });

    it('should publish a document', () => {
      const doc = framework.createDocument({
        type: 'institutional_presentation',
        title: 'Investor Deck',
        content: 'Our institutional pitch deck.',
      });
      const published = framework.publishDocument(doc.id);
      expect(published.status).toBe('published');
      expect(published.publishedAt).toBeInstanceOf(Date);
    });

    it('should archive a document', () => {
      const doc = framework.createDocument({
        type: 'whitepaper_disclosure',
        title: 'Old Whitepaper',
        content: 'Outdated content.',
      });
      const archived = framework.archiveDocument(doc.id);
      expect(archived.status).toBe('archived');
    });

    it('should throw when updating archived document', () => {
      const doc = framework.createDocument({ type: 'risk_report', title: 'T', content: 'C' });
      framework.archiveDocument(doc.id);
      expect(() => framework.updateDocument({ documentId: doc.id, title: 'New Title' })).toThrow('archived');
    });

    it('should list documents by type', () => {
      framework.createDocument({ type: 'risk_report', title: 'R1', content: 'C' });
      framework.createDocument({ type: 'risk_report', title: 'R2', content: 'C' });
      framework.createDocument({ type: 'governance_transparency', title: 'G1', content: 'C' });

      const riskReports = framework.listDocuments({ type: 'risk_report' });
      expect(riskReports.every((d) => d.type === 'risk_report')).toBe(true);
    });
  });

  describe('regulator engagement', () => {
    it('should record a regulator engagement', () => {
      const engagement = framework.recordEngagement({
        regulatorName: 'FINMA',
        jurisdiction: 'CH',
        engagementType: 'consultation',
        description: 'Initial consultation on VASP registration requirements',
      });
      expect(engagement.id).toBeDefined();
      expect(engagement.regulatorName).toBe('FINMA');
      expect(engagement.status).toBe('pending');
      expect(engagement.startedAt).toBeInstanceOf(Date);
    });

    it('should update engagement status', () => {
      const eng = framework.recordEngagement({
        regulatorName: 'MAS',
        jurisdiction: 'SG',
        engagementType: 'registration',
        description: 'Digital payment token registration',
      });
      const updated = framework.updateEngagement({
        engagementId: eng.id,
        status: 'active',
        notes: 'Application submitted successfully',
      });
      expect(updated.status).toBe('active');
      expect(updated.notes).toBe('Application submitted successfully');
    });

    it('should attach documents to engagement', () => {
      const eng = framework.recordEngagement({
        regulatorName: 'VARA',
        jurisdiction: 'AE',
        engagementType: 'registration',
        description: 'VARA virtual asset license application',
        documents: ['doc-001'],
      });
      const updated = framework.updateEngagement({
        engagementId: eng.id,
        documents: ['doc-002', 'doc-003'],
      });
      expect(updated.documents).toContain('doc-001');
      expect(updated.documents).toContain('doc-002');
    });

    it('should resolve an engagement', () => {
      const eng = framework.recordEngagement({
        regulatorName: 'FCA',
        jurisdiction: 'GB',
        engagementType: 'inquiry',
        description: 'FCA cryptoasset inquiry response',
      });
      const resolved = framework.updateEngagement({
        engagementId: eng.id,
        status: 'resolved',
        notes: 'Successfully responded to all inquiries',
      });
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeInstanceOf(Date);
    });

    it('should list engagements by jurisdiction', () => {
      framework.recordEngagement({ regulatorName: 'FINMA', jurisdiction: 'CH', engagementType: 'dialogue', description: 'CH dialogue' });
      framework.recordEngagement({ regulatorName: 'MAS', jurisdiction: 'SG', engagementType: 'consultation', description: 'SG consultation' });
      framework.recordEngagement({ regulatorName: 'FINMA II', jurisdiction: 'CH', engagementType: 'consultation', description: 'CH consultation 2' });

      const chEngagements = framework.listEngagements({ jurisdiction: 'CH' });
      expect(chEngagements.every((e) => e.jurisdiction === 'CH')).toBe(true);
      expect(chEngagements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('regulatory readiness report', () => {
    it('should generate a regulatory readiness report', () => {
      framework.createDocument({ type: 'risk_report', title: 'Risk', content: 'C' });
      framework.createDocument({ type: 'governance_transparency', title: 'Gov', content: 'C' });
      framework.recordEngagement({ regulatorName: 'FINMA', jurisdiction: 'CH', engagementType: 'consultation', description: 'D' });

      const report = framework.getRegulatoryReadinessReport();
      expect(report.publishedDocuments).toBeGreaterThan(0);
      expect(report.jurisdictionsCovered.length).toBeGreaterThan(0);
      expect(typeof report.openEngagements).toBe('number');
      expect(typeof report.resolvedEngagements).toBe('number');
    });
  });
});
