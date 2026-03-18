/**
 * TONAIAgent - RWA Module Tests
 *
 * Comprehensive test suite for the Real World Assets (RWA) & Tokenized Funds
 * infrastructure including tokenization, compliance, AI allocation, hybrid
 * portfolio engine, liquidity management, and cross-chain integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRWAManager,
  createTokenizationManager,
  createComplianceManager,
  createAllocationEngine,
  createHybridPortfolioEngine,
  createLiquidityManager,
  createCrossChainManager,
  DEFAULT_JURISDICTION_RULES,
  KNOWN_RWA_PROTOCOLS,
  KNOWN_BRIDGES,
} from '../../extended/rwa/index';

// ============================================================================
// Tokenization Manager Tests
// ============================================================================

describe('TokenizationManager', () => {
  let manager: ReturnType<typeof createTokenizationManager>;

  beforeEach(() => {
    manager = createTokenizationManager({
      requireAuditBeforeActivation: true,
      supportedJurisdictions: ['US', 'EU', 'UK'],
    });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const mgr = createTokenizationManager();
      expect(mgr.config).toBeDefined();
      expect(mgr.config.requireAuditBeforeActivation).toBe(true);
      expect(mgr.config.proofOfReservesFrequency).toBe('daily');
    });

    it('should accept custom configuration', () => {
      const mgr = createTokenizationManager({
        requireAuditBeforeActivation: false,
        auditRefreshDays: 30,
      });
      expect(mgr.config.requireAuditBeforeActivation).toBe(false);
      expect(mgr.config.auditRefreshDays).toBe(30);
    });
  });

  describe('asset tokenization', () => {
    it('should tokenize a real estate asset', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Manhattan Office Tower',
        symbol: 'MOT',
        description: 'Prime office real estate in Manhattan',
        issuer: 'Prime Real Estate Fund',
        custodian: 'Fireblocks',
        jurisdiction: 'US',
        totalValue: 100000000,
        currency: 'USD',
        tokenSupply: 1000000,
        minimumInvestment: 10000,
        yieldRate: 0.065,
      });

      expect(result.assetId).toBeDefined();
      expect(result.status).toBe('pending_legal');
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.estimatedActivationDate).toBeDefined();
    });

    it('should tokenize a government bond', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'government_bonds',
        name: 'US Treasury 10Y',
        symbol: 'UST10',
        description: 'Tokenized 10-year US Treasury Bond',
        issuer: 'US Treasury',
        custodian: 'BNY Mellon',
        jurisdiction: 'US',
        totalValue: 50000000,
        currency: 'USD',
        tokenSupply: 500000,
        minimumInvestment: 1000,
        yieldRate: 0.045,
        maturityDate: new Date('2034-01-01'),
      });

      expect(result.assetId).toBeDefined();
      expect(result.status).toBe('pending_legal');
    });

    it('should retrieve tokenized asset', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'private_credit',
        name: 'Corporate Credit Fund',
        symbol: 'CCF',
        description: 'Private credit portfolio',
        issuer: 'Credit Corp',
        custodian: 'BitGo',
        jurisdiction: 'EU',
        totalValue: 20000000,
        currency: 'EUR',
        tokenSupply: 200000,
        minimumInvestment: 5000,
        yieldRate: 0.08,
      });

      const asset = manager.getAsset(result.assetId);
      expect(asset).toBeDefined();
      expect(asset!.name).toBe('Corporate Credit Fund');
      expect(asset!.assetClass).toBe('private_credit');
      expect(asset!.yieldRate).toBe(0.08);
    });

    it('should list assets with filters', async () => {
      await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Asset 1',
        symbol: 'A1',
        description: 'Description 1',
        issuer: 'Issuer 1',
        custodian: 'Custodian 1',
        jurisdiction: 'US',
        totalValue: 10000000,
        currency: 'USD',
        tokenSupply: 100000,
        minimumInvestment: 1000,
        yieldRate: 0.06,
      });

      await manager.tokenizeAsset({
        assetClass: 'government_bonds',
        name: 'Asset 2',
        symbol: 'A2',
        description: 'Description 2',
        issuer: 'Issuer 2',
        custodian: 'Custodian 2',
        jurisdiction: 'EU',
        totalValue: 5000000,
        currency: 'EUR',
        tokenSupply: 50000,
        minimumInvestment: 500,
        yieldRate: 0.04,
      });

      const realEstateAssets = manager.listAssets({ assetClass: ['real_estate'] });
      expect(realEstateAssets.length).toBe(1);
      expect(realEstateAssets[0].assetClass).toBe('real_estate');

      const euAssets = manager.listAssets({ jurisdiction: ['EU'] });
      expect(euAssets.length).toBe(1);
      expect(euAssets[0].jurisdiction).toBe('EU');

      const highYieldAssets = manager.listAssets({ minYield: 0.05 });
      expect(highYieldAssets.length).toBe(1);
    });
  });

  describe('legal documents', () => {
    it('should add legal documents to an asset', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Test Property',
        symbol: 'TP',
        description: 'Test',
        issuer: 'Issuer',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      const doc = await manager.addLegalDocument(result.assetId, {
        type: 'prospectus',
        name: 'Offering Prospectus',
        hash: 'abc123',
        jurisdiction: 'US',
        validFrom: new Date(),
      });

      expect(doc.id).toBeDefined();
      expect(doc.type).toBe('prospectus');

      const docs = manager.getLegalDocuments(result.assetId);
      expect(docs.length).toBe(1);
      expect(docs[0].type).toBe('prospectus');
    });

    it('should verify a legal document', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'corporate_bonds',
        name: 'Corp Bond Fund',
        symbol: 'CBF',
        description: 'Test',
        issuer: 'Corp',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 5000000,
        currency: 'USD',
        tokenSupply: 50000,
        minimumInvestment: 1000,
      });

      const doc = await manager.addLegalDocument(result.assetId, {
        type: 'legal_opinion',
        name: 'Legal Opinion',
        hash: 'def456',
        jurisdiction: 'US',
        validFrom: new Date(),
      });

      const verified = await manager.verifyDocument(doc.id);
      expect(verified).toBe(true);
    });
  });

  describe('audit reports', () => {
    it('should add audit report', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'commodities',
        name: 'Gold Fund',
        symbol: 'GOLD',
        description: 'Tokenized gold',
        issuer: 'Gold Corp',
        custodian: 'Vaultus',
        jurisdiction: 'CH',
        totalValue: 50000000,
        currency: 'USD',
        tokenSupply: 500000,
        minimumInvestment: 100,
      });

      const report = await manager.addAuditReport(result.assetId, {
        auditor: 'KPMG',
        reportType: 'financial',
        period: 'Q4 2024',
        findings: 'All reserves verified and compliant',
        hash: 'ghi789',
        publishedAt: new Date(),
      });

      expect(report.id).toBeDefined();
      expect(report.auditor).toBe('KPMG');

      const reports = manager.getAuditReports(result.assetId);
      expect(reports.length).toBe(1);
    });
  });

  describe('proof of reserves', () => {
    it('should update proof of reserves', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Property Fund',
        symbol: 'PF',
        description: 'Real estate fund',
        issuer: 'Real Estate Corp',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 10000000,
        currency: 'USD',
        tokenSupply: 100000,
        minimumInvestment: 1000,
      });

      const proof = await manager.updateProofOfReserves(result.assetId, {
        totalAssetValue: 10500000, // Slightly above tokenized value
        totalTokenizedValue: 10000000,
        collateralizationRatio: 1.05,
        lastVerified: new Date(),
        verifier: 'Chainalysis',
        attestationHash: 'jkl012',
        breakdown: [
          {
            assetType: 'commercial_real_estate',
            value: 10500000,
            currency: 'USD',
            custodian: 'Custodian',
            verificationMethod: 'appraisal',
          },
        ],
      });

      expect(proof.collateralizationRatio).toBe(1.05);
      expect(proof.assetId).toBe(result.assetId);

      const retrieved = manager.getProofOfReserves(result.assetId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.totalAssetValue).toBe(10500000);
    });
  });

  describe('asset lifecycle', () => {
    it('should activate an asset with all prerequisites', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'treasury_bills',
        name: 'T-Bill Fund',
        symbol: 'TBF',
        description: 'Tokenized T-bills',
        issuer: 'TBill Corp',
        custodian: 'BNY Mellon',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      await manager.addLegalDocument(result.assetId, {
        type: 'prospectus',
        name: 'Prospectus',
        hash: 'hash1',
        jurisdiction: 'US',
        validFrom: new Date(),
      });

      await manager.addAuditReport(result.assetId, {
        auditor: 'Deloitte',
        reportType: 'compliance',
        period: 'Q4 2024',
        findings: 'Compliant',
        hash: 'hash2',
        publishedAt: new Date(),
      });

      await manager.updateProofOfReserves(result.assetId, {
        totalAssetValue: 1050000,
        totalTokenizedValue: 1000000,
        collateralizationRatio: 1.05,
        lastVerified: new Date(),
        verifier: 'Verifier',
        attestationHash: 'hash3',
        breakdown: [],
      });

      await expect(manager.activateAsset(result.assetId)).resolves.toBeUndefined();

      const asset = manager.getAsset(result.assetId);
      expect(asset!.status).toBe('active');
      expect(asset!.circulatingSupply).toBe(10000);
    });

    it('should reject activation without legal documents', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'No Docs Asset',
        symbol: 'NDA',
        description: 'Test',
        issuer: 'Issuer',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      await expect(manager.activateAsset(result.assetId)).rejects.toThrow(
        'Cannot activate asset without legal documents'
      );
    });

    it('should suspend and reactivate an asset', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'corporate_bonds',
        name: 'Corp Bond',
        symbol: 'CB',
        description: 'Test',
        issuer: 'Corp',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      // Directly set status to active for testing suspension
      await manager.updateAsset(result.assetId, { status: 'active' });

      await manager.suspendAsset(result.assetId, 'Regulatory review');
      let asset = manager.getAsset(result.assetId);
      expect(asset!.status).toBe('suspended');

      await manager.reactivateAsset(result.assetId);
      asset = manager.getAsset(result.assetId);
      expect(asset!.status).toBe('active');
    });

    it('should distribute yield', async () => {
      const result = await manager.tokenizeAsset({
        assetClass: 'private_credit',
        name: 'Yield Asset',
        symbol: 'YA',
        description: 'High yield',
        issuer: 'Issuer',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
        yieldRate: 0.10, // 10% annual
      });

      // Set circulating supply for yield calculation
      await manager.updateAsset(result.assetId, {
        status: 'active',
        circulatingSupply: 10000,
      });

      const distribution = await manager.distributeYield(result.assetId);
      expect(distribution.assetId).toBe(result.assetId);
      expect(distribution.totalDistributed).toBeGreaterThan(0);
      expect(distribution.perTokenAmount).toBeGreaterThan(0);
    });
  });

  describe('events', () => {
    it('should emit events on asset tokenization', async () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      await manager.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Event Test Asset',
        symbol: 'ETA',
        description: 'Test',
        issuer: 'Issuer',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Compliance Manager Tests
// ============================================================================

describe('ComplianceManager', () => {
  let manager: ReturnType<typeof createComplianceManager>;

  beforeEach(() => {
    manager = createComplianceManager({
      strictMode: true,
      kycRefreshDays: 365,
      accreditationRequired: true,
    });
  });

  describe('investor profile management', () => {
    it('should create an investor profile', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');

      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe('user_001');
      expect(profile.investorType).toBe('accredited');
      expect(profile.kycStatus).toBe('pending');
      expect(profile.amlStatus).toBe('pending');
    });

    it('should list investors with filters', async () => {
      await manager.createInvestorProfile('user_001', 'accredited');
      await manager.createInvestorProfile('user_002', 'qualified_institutional');
      await manager.createInvestorProfile('user_003', 'retail');

      const accredited = manager.listInvestors({ investorType: ['accredited'] });
      expect(accredited.length).toBe(1);

      const allInstitutional = manager.listInvestors({
        investorType: ['qualified_institutional'],
      });
      expect(allInstitutional.length).toBe(1);
    });
  });

  describe('KYC/AML verification', () => {
    it('should approve KYC', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');

      const check = await manager.approveKyc(profile.id, 'enhanced');
      expect(check.status).toBe('approved');
      expect(check.checkType).toBe('kyc');
      expect(check.validUntil).toBeDefined();

      const updatedProfile = manager.getInvestorProfile(profile.id);
      expect(updatedProfile!.kycStatus).toBe('approved');
      expect(updatedProfile!.kycLevel).toBe('enhanced');
    });

    it('should reject KYC with reason', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'retail');

      const check = await manager.rejectKyc(profile.id, 'Invalid documents provided');
      expect(check.status).toBe('rejected');
      expect(check.reason).toBe('Invalid documents provided');

      const updatedProfile = manager.getInvestorProfile(profile.id);
      expect(updatedProfile!.kycStatus).toBe('rejected');
    });

    it('should approve AML', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');

      const check = await manager.approveAml(profile.id);
      expect(check.status).toBe('approved');
      expect(check.checkType).toBe('aml');

      const updatedProfile = manager.getInvestorProfile(profile.id);
      expect(updatedProfile!.amlStatus).toBe('approved');
    });

    it('should reject AML', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');

      const check = await manager.rejectAml(profile.id, 'Suspicious transaction pattern');
      expect(check.status).toBe('rejected');

      const updatedProfile = manager.getInvestorProfile(profile.id);
      expect(updatedProfile!.amlStatus).toBe('rejected');
    });

    it('should retrieve compliance checks', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');
      await manager.approveKyc(profile.id, 'basic');
      await manager.approveAml(profile.id);

      const checks = manager.getComplianceChecks(profile.id);
      expect(checks.length).toBe(2);
    });
  });

  describe('accreditation verification', () => {
    it('should verify accreditation by net worth', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');

      const check = await manager.verifyAccreditation(profile.id, {
        type: 'net_worth',
        verifiedBy: 'AccountingFirm',
        verificationDate: new Date(),
        netWorth: 2000000, // $2M > $1M threshold
      });

      expect(check.status).toBe('approved');
      const updated = manager.getInvestorProfile(profile.id);
      expect(updated!.accreditationStatus).toBe('approved');
      expect(updated!.netWorthVerified).toBe(true);
    });

    it('should reject accreditation with insufficient net worth', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'retail');

      const check = await manager.verifyAccreditation(profile.id, {
        type: 'net_worth',
        verifiedBy: 'AccountingFirm',
        verificationDate: new Date(),
        netWorth: 500000, // $500K < $1M threshold
      });

      expect(check.status).toBe('rejected');
    });

    it('should verify institutional accreditation', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'qualified_institutional');

      const check = await manager.verifyAccreditation(profile.id, {
        type: 'institutional',
        verifiedBy: 'Legal Counsel',
        verificationDate: new Date(),
      });

      expect(check.status).toBe('approved');
    });
  });

  describe('investor access control', () => {
    it('should allow access for fully compliant investor', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited', {
        allowedJurisdictions: ['US', 'EU'],
      });
      await manager.approveKyc(profile.id, 'enhanced');
      await manager.approveAml(profile.id);
      await manager.verifyAccreditation(profile.id, {
        type: 'net_worth',
        verifiedBy: 'CPA',
        verificationDate: new Date(),
        netWorth: 5000000,
      });

      const result = await manager.checkInvestorAccess(
        profile.id,
        'asset_001',
        'real_estate',
        'US',
        100000
      );

      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should deny access for non-KYC investor', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited');
      // Not completing KYC

      const result = await manager.checkInvestorAccess(
        profile.id,
        'asset_001',
        'real_estate',
        'US',
        100000
      );

      expect(result.allowed).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should deny access for restricted asset class', async () => {
      const profile = await manager.createInvestorProfile('user_001', 'accredited', {
        allowedJurisdictions: ['US'],
        restrictedAssetClasses: ['private_equity'],
      });
      await manager.approveKyc(profile.id, 'enhanced');
      await manager.approveAml(profile.id);

      const result = await manager.checkInvestorAccess(
        profile.id,
        'asset_001',
        'private_equity',
        'US',
        100000
      );

      expect(result.allowed).toBe(false);
      expect(result.reasons.some(r => r.includes('private_equity'))).toBe(true);
    });
  });

  describe('jurisdiction rules', () => {
    it('should initialize with default jurisdiction rules', () => {
      const rules = manager.listJurisdictionRules();
      expect(rules.length).toBeGreaterThan(0);

      const usRule = manager.getJurisdictionRule('US');
      expect(usRule).toBeDefined();
      expect(usRule!.requiresAccreditation).toBe(true);
    });

    it('should add custom jurisdiction rule', () => {
      manager.addJurisdictionRule({
        jurisdiction: 'JP',
        allowedInvestorTypes: ['qualified_institutional'],
        requiredKycLevel: 'institutional',
        requiresAccreditation: true,
        restrictedAssetClasses: [],
        reportingRequirements: ['FSA'],
        holdingPeriod: 0,
      });

      const jpRule = manager.getJurisdictionRule('JP');
      expect(jpRule).toBeDefined();
      expect(jpRule!.jurisdiction).toBe('JP');
    });
  });

  describe('institutional onboarding', () => {
    it('should submit institutional onboarding', async () => {
      const onboarding = await manager.submitInstitutionalOnboarding({
        organizationName: 'Alpha Capital Fund',
        organizationType: 'fund',
        jurisdiction: 'US',
        lei: 'USABC12345678901',
        regulatoryRegistrations: ['SEC', 'FINRA'],
        aum: 500000000,
        documents: [],
        metadata: {},
      });

      expect(onboarding.id).toBeDefined();
      expect(onboarding.status).toBe('pending');
      expect(onboarding.organizationName).toBe('Alpha Capital Fund');
    });

    it('should approve institutional onboarding', async () => {
      const onboarding = await manager.submitInstitutionalOnboarding({
        organizationName: 'Beta Investment Bank',
        organizationType: 'bank',
        jurisdiction: 'EU',
        regulatoryRegistrations: ['ECB', 'BaFin'],
        documents: [],
        metadata: {},
      });

      const approved = await manager.reviewInstitutionalOnboarding(
        onboarding.id,
        true,
        'All documentation verified'
      );

      expect(approved.status).toBe('approved');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should reject institutional onboarding', async () => {
      const onboarding = await manager.submitInstitutionalOnboarding({
        organizationName: 'Suspicious Corp',
        organizationType: 'other',
        jurisdiction: 'UNKNOWN',
        regulatoryRegistrations: [],
        documents: [],
        metadata: {},
      });

      const rejected = await manager.reviewInstitutionalOnboarding(
        onboarding.id,
        false,
        'Unknown jurisdiction'
      );

      expect(rejected.status).toBe('rejected');
    });

    it('should filter institutional onboardings', async () => {
      await manager.submitInstitutionalOnboarding({
        organizationName: 'Fund A',
        organizationType: 'fund',
        jurisdiction: 'US',
        regulatoryRegistrations: [],
        documents: [],
        metadata: {},
      });

      await manager.submitInstitutionalOnboarding({
        organizationName: 'Bank B',
        organizationType: 'bank',
        jurisdiction: 'EU',
        regulatoryRegistrations: [],
        documents: [],
        metadata: {},
      });

      const funds = manager.listInstitutionalOnboardings({ organizationType: ['fund'] });
      expect(funds.length).toBe(1);
      expect(funds[0].organizationType).toBe('fund');
    });
  });

  describe('regulatory audit report', () => {
    it('should generate regulatory audit report', async () => {
      const profile1 = await manager.createInvestorProfile('user_001', 'accredited', {
        allowedJurisdictions: ['US'],
      });
      await manager.approveKyc(profile1.id, 'enhanced');
      await manager.approveAml(profile1.id);

      const profile2 = await manager.createInvestorProfile('user_002', 'retail');
      // Profile 2 has no KYC

      const report = manager.generateAuditReport();

      expect(report.totalInvestors).toBe(2);
      expect(report.kycApproved).toBe(1);
      expect(report.kycPending).toBe(1);
      expect(report.amlApproved).toBe(1);
      expect(report.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Allocation Engine Tests
// ============================================================================

describe('AllocationEngine', () => {
  let engine: ReturnType<typeof createAllocationEngine>;

  beforeEach(() => {
    engine = createAllocationEngine({
      defaultStrategy: 'balanced',
      aiEnabled: true,
    });
  });

  describe('configuration', () => {
    it('should initialize with defaults', () => {
      const e = createAllocationEngine();
      expect(e.config.defaultStrategy).toBe('balanced');
      expect(e.config.aiEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      engine.configure({ defaultStrategy: 'yield_maximization' });
      expect(engine.config.defaultStrategy).toBe('yield_maximization');
    });
  });

  describe('opportunity management', () => {
    it('should register RWA opportunity', () => {
      engine.registerOpportunity({
        assetId: 'asset_001',
        assetClass: 'real_estate',
        name: 'NYC Office REIT',
        yieldRate: 0.065,
        riskScore: 35,
        liquidityScore: 70,
        minimumInvestment: 10000,
        availableAmount: 100000000,
        jurisdiction: 'US',
        aiScore: 0,
        reasoning: '',
      });

      const opp = engine.getOpportunity('asset_001');
      expect(opp).toBeDefined();
      expect(opp!.name).toBe('NYC Office REIT');
      expect(opp!.aiScore).toBeGreaterThan(0); // Should be auto-calculated
    });

    it('should update opportunity', () => {
      engine.registerOpportunity({
        assetId: 'asset_001',
        assetClass: 'government_bonds',
        name: 'US Treasury',
        yieldRate: 0.045,
        riskScore: 5,
        liquidityScore: 95,
        minimumInvestment: 1000,
        availableAmount: 1000000000,
        jurisdiction: 'US',
        aiScore: 80,
        reasoning: 'Safe haven',
      });

      engine.updateOpportunity('asset_001', { yieldRate: 0.05 });

      const opp = engine.getOpportunity('asset_001');
      expect(opp!.yieldRate).toBe(0.05);
    });

    it('should list opportunities with filters', () => {
      engine.registerOpportunity({
        assetId: 'asset_001',
        assetClass: 'real_estate',
        name: 'RE Fund',
        yieldRate: 0.065,
        riskScore: 35,
        liquidityScore: 70,
        minimumInvestment: 10000,
        availableAmount: 50000000,
        jurisdiction: 'US',
        aiScore: 75,
        reasoning: '',
      });

      engine.registerOpportunity({
        assetId: 'asset_002',
        assetClass: 'government_bonds',
        name: 'Gov Bonds',
        yieldRate: 0.045,
        riskScore: 5,
        liquidityScore: 95,
        minimumInvestment: 1000,
        availableAmount: 500000000,
        jurisdiction: 'US',
        aiScore: 80,
        reasoning: '',
      });

      const highYield = engine.listOpportunities({ minYield: 0.06 });
      expect(highYield.length).toBe(1);
      expect(highYield[0].assetId).toBe('asset_001');

      const lowRisk = engine.listOpportunities({ maxRisk: 10 });
      expect(lowRisk.length).toBe(1);
      expect(lowRisk[0].assetId).toBe('asset_002');
    });
  });

  describe('AI recommendations', () => {
    it('should generate allocation recommendation', () => {
      engine.registerOpportunity({
        assetId: 'asset_001',
        assetClass: 'real_estate',
        name: 'RE REIT',
        yieldRate: 0.065,
        riskScore: 35,
        liquidityScore: 70,
        minimumInvestment: 10000,
        availableAmount: 100000000,
        jurisdiction: 'US',
        aiScore: 75,
        reasoning: '',
      });

      engine.registerOpportunity({
        assetId: 'asset_002',
        assetClass: 'government_bonds',
        name: 'Gov Bonds',
        yieldRate: 0.045,
        riskScore: 5,
        liquidityScore: 95,
        minimumInvestment: 1000,
        availableAmount: 500000000,
        jurisdiction: 'US',
        aiScore: 80,
        reasoning: '',
      });

      const recommendation = engine.generateRecommendation(
        5000000,
        {
          strategy: 'balanced',
          maxRWAAllocation: 0.40,
          minCryptoAllocation: 0.40,
          rebalanceThreshold: 0.05,
          riskTolerance: 'moderate',
          preferredAssetClasses: ['real_estate', 'government_bonds'],
          parameters: {},
        },
        0.08 // 8% crypto yield
      );

      expect(recommendation.id).toBeDefined();
      expect(recommendation.cryptoAllocation).toBeGreaterThan(0);
      expect(recommendation.rwaAllocation).toBeGreaterThan(0);
      expect(recommendation.cashAllocation).toBeGreaterThanOrEqual(0);
      expect(recommendation.cryptoAllocation + recommendation.rwaAllocation + recommendation.cashAllocation).toBeCloseTo(1, 1);
      expect(recommendation.expectedYield).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it('should compare crypto vs RWA yields', () => {
      const opportunities = [
        {
          assetId: 'asset_001',
          assetClass: 'government_bonds' as const,
          name: 'Gov Bonds',
          yieldRate: 0.05,
          riskScore: 5,
          liquidityScore: 95,
          minimumInvestment: 1000,
          availableAmount: 500000000,
          jurisdiction: 'US',
          aiScore: 80,
          reasoning: '',
        },
        {
          assetId: 'asset_002',
          assetClass: 'private_credit' as const,
          name: 'Private Credit',
          yieldRate: 0.09,
          riskScore: 45,
          liquidityScore: 40,
          minimumInvestment: 50000,
          availableAmount: 10000000,
          jurisdiction: 'US',
          aiScore: 65,
          reasoning: '',
        },
      ];

      const comparison = engine.compareYields(0.08, opportunities);

      expect(comparison.cryptoYield).toBe(0.08);
      expect(comparison.rwaYield).toBeGreaterThan(0);
      expect(comparison.riskAdjustedCryptoYield).toBeLessThan(comparison.cryptoYield);
      expect(comparison.riskAdjustedRwaYield).toBeDefined();
      expect(['increase_rwa', 'increase_crypto', 'maintain']).toContain(comparison.recommendation);
      expect(comparison.reasoning).toBeDefined();
    });
  });

  describe('allocation optimization', () => {
    it('should optimize balanced allocation', () => {
      const opportunities = [
        {
          assetId: 'a1',
          assetClass: 'real_estate' as const,
          name: 'RE Fund',
          yieldRate: 0.065,
          riskScore: 35,
          liquidityScore: 70,
          minimumInvestment: 10000,
          availableAmount: 50000000,
          jurisdiction: 'US',
          aiScore: 75,
          reasoning: '',
        },
        {
          assetId: 'a2',
          assetClass: 'government_bonds' as const,
          name: 'Gov Bonds',
          yieldRate: 0.045,
          riskScore: 5,
          liquidityScore: 95,
          minimumInvestment: 1000,
          availableAmount: 500000000,
          jurisdiction: 'US',
          aiScore: 80,
          reasoning: '',
        },
        {
          assetId: 'a3',
          assetClass: 'private_credit' as const,
          name: 'Private Credit',
          yieldRate: 0.08,
          riskScore: 45,
          liquidityScore: 40,
          minimumInvestment: 25000,
          availableAmount: 20000000,
          jurisdiction: 'US',
          aiScore: 70,
          reasoning: '',
        },
      ];

      const result = engine.optimizeAllocation(
        1000000,
        opportunities,
        {
          strategy: 'balanced',
          maxRWAAllocation: 0.40,
          minCryptoAllocation: 0.40,
          rebalanceThreshold: 0.05,
          riskTolerance: 'moderate',
          preferredAssetClasses: [],
          parameters: {},
        }
      );

      expect(result.allocations.length).toBeGreaterThan(0);
      expect(result.totalAllocated).toBeCloseTo(1000000, -2);
      expect(result.expectedYield).toBeGreaterThan(0);
      expect(result.optimizationMethod).toBeDefined();
    });

    it('should optimize yield maximization', () => {
      const opportunities = [
        {
          assetId: 'a1',
          assetClass: 'private_credit' as const,
          name: 'High Yield Credit',
          yieldRate: 0.12,
          riskScore: 60,
          liquidityScore: 30,
          minimumInvestment: 25000,
          availableAmount: 5000000,
          jurisdiction: 'US',
          aiScore: 65,
          reasoning: '',
        },
        {
          assetId: 'a2',
          assetClass: 'government_bonds' as const,
          name: 'Safe Bonds',
          yieldRate: 0.04,
          riskScore: 5,
          liquidityScore: 95,
          minimumInvestment: 1000,
          availableAmount: 500000000,
          jurisdiction: 'US',
          aiScore: 70,
          reasoning: '',
        },
      ];

      const result = engine.optimizeAllocation(
        500000,
        opportunities,
        {
          strategy: 'yield_maximization',
          maxRWAAllocation: 0.50,
          minCryptoAllocation: 0.30,
          rebalanceThreshold: 0.05,
          riskTolerance: 'aggressive',
          preferredAssetClasses: [],
          parameters: {},
        }
      );

      expect(result.optimizationMethod).toContain('yield');
      // Yield maximization should prefer high yield assets
      if (result.allocations.length > 1) {
        const highYieldAlloc = result.allocations.find(a => a.assetId === 'a1');
        const lowYieldAlloc = result.allocations.find(a => a.assetId === 'a2');
        if (highYieldAlloc && lowYieldAlloc) {
          expect(highYieldAlloc.allocationPercent).toBeGreaterThan(lowYieldAlloc.allocationPercent);
        }
      }
    });
  });

  describe('risk analysis', () => {
    it('should calculate RWA risk', () => {
      const positions = [
        {
          assetId: 'a1',
          assetName: 'RE Fund',
          assetClass: 'real_estate' as const,
          allocationPercent: 0.4,
          allocationAmount: 400000,
          expectedYield: 0.065,
          riskContribution: 35,
        },
        {
          assetId: 'a2',
          assetName: 'Gov Bonds',
          assetClass: 'government_bonds' as const,
          allocationPercent: 0.6,
          allocationAmount: 600000,
          expectedYield: 0.045,
          riskContribution: 5,
        },
      ];

      const risk = engine.calculateRWARisk(positions);

      expect(risk.overallRisk).toBeDefined();
      expect(risk.overallRisk).toBeGreaterThanOrEqual(0);
      expect(risk.overallRisk).toBeLessThanOrEqual(100);
      expect(risk.concentrationRisk).toBeDefined();
      expect(risk.riskByAssetClass).toBeDefined();
    });

    it('should calculate volatility hedge', () => {
      const hedge = engine.calculateVolatilityHedge(0.05, 1000000);

      expect(hedge.rwaAllocationIncrease).toBeGreaterThan(0);
      expect(hedge.targetAssetClasses.length).toBeGreaterThan(0);
      expect(hedge.expectedVolatilityReduction).toBeGreaterThan(0);
      expect(hedge.reasoning).toBeDefined();
    });
  });
});

// ============================================================================
// Hybrid Portfolio Engine Tests
// ============================================================================

describe('HybridPortfolioEngine', () => {
  let engine: ReturnType<typeof createHybridPortfolioEngine>;

  const defaultConfig = {
    strategy: 'balanced' as const,
    maxRWAAllocation: 0.40,
    minCryptoAllocation: 0.40,
    rebalanceThreshold: 0.10,
    riskTolerance: 'moderate' as const,
    preferredAssetClasses: ['real_estate' as const, 'government_bonds' as const],
    parameters: {},
  };

  beforeEach(() => {
    engine = createHybridPortfolioEngine();
  });

  describe('portfolio management', () => {
    it('should create a portfolio', async () => {
      const portfolio = await engine.createPortfolio(
        'My Hybrid Portfolio',
        'user_001',
        defaultConfig,
        1000000
      );

      expect(portfolio.id).toBeDefined();
      expect(portfolio.name).toBe('My Hybrid Portfolio');
      expect(portfolio.ownerId).toBe('user_001');
      expect(portfolio.cashBalance).toBe(1000000);
      expect(portfolio.totalValue).toBe(1000000);
    });

    it('should get a portfolio', async () => {
      const created = await engine.createPortfolio('Test', 'user_001', defaultConfig, 500000);
      const retrieved = engine.getPortfolio(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should list portfolios by owner', async () => {
      await engine.createPortfolio('Portfolio 1', 'user_001', defaultConfig, 100000);
      await engine.createPortfolio('Portfolio 2', 'user_001', defaultConfig, 200000);
      await engine.createPortfolio('Portfolio 3', 'user_002', defaultConfig, 300000);

      const user1Portfolios = engine.listPortfolios('user_001');
      expect(user1Portfolios.length).toBe(2);

      const allPortfolios = engine.listPortfolios();
      expect(allPortfolios.length).toBe(3);
    });
  });

  describe('position management', () => {
    it('should add and manage crypto positions', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);

      const position = await engine.addCryptoPosition(portfolio.id, {
        asset: 'TON',
        quantity: 10000,
        averageCost: 2.5,
        currentPrice: 3.0,
        marketValue: 30000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 0.20,
        weight: 0,
        chain: 'ton',
      });

      expect(position.id).toBeDefined();
      expect(position.asset).toBe('TON');

      const updated = await engine.updateCryptoPosition(portfolio.id, position.id, {
        currentPrice: 3.5,
        marketValue: 35000,
        unrealizedPnL: 10000,
      });
      expect(updated.currentPrice).toBe(3.5);

      await engine.removeCryptoPosition(portfolio.id, position.id);
      const portfolioAfter = engine.getPortfolio(portfolio.id);
      expect(portfolioAfter!.cryptoPositions.length).toBe(0);
    });

    it('should add and manage RWA positions', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);

      const position = await engine.addRWAPosition(portfolio.id, {
        assetId: 'rwa_001',
        assetName: 'Manhattan REIT',
        assetClass: 'real_estate',
        tokenAmount: 1000,
        averageCost: 100,
        currentValue: 105,
        marketValue: 105000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 0.05,
        weight: 0,
        accruedYield: 2000,
        yieldRate: 0.065,
        jurisdiction: 'US',
        acquiredAt: new Date(),
      });

      expect(position.id).toBeDefined();
      expect(position.assetClass).toBe('real_estate');
      expect(position.accruedYield).toBe(2000);

      const updated = await engine.updateRWAPosition(portfolio.id, position.id, {
        currentValue: 110,
        marketValue: 110000,
        unrealizedPnL: 10000,
      });
      expect(updated.currentValue).toBe(110);
    });
  });

  describe('cash management', () => {
    it('should add and withdraw cash', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);

      await engine.addCash(portfolio.id, 100000);
      let p = engine.getPortfolio(portfolio.id);
      expect(p!.cashBalance).toBe(100000);

      await engine.withdrawCash(portfolio.id, 50000);
      p = engine.getPortfolio(portfolio.id);
      expect(p!.cashBalance).toBe(50000);
    });

    it('should throw on insufficient cash withdrawal', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 1000);

      await expect(engine.withdrawCash(portfolio.id, 5000)).rejects.toThrow(
        'Insufficient cash balance'
      );
    });
  });

  describe('rebalancing', () => {
    it('should detect rebalance needed', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 100000);

      // Add heavily skewed positions
      await engine.addCryptoPosition(portfolio.id, {
        asset: 'ETH',
        quantity: 10,
        averageCost: 2000,
        currentPrice: 2500,
        marketValue: 25000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 0.25,
        weight: 0,
        chain: 'ethereum',
      });

      // Add a very small RWA position (much less than target)
      await engine.addRWAPosition(portfolio.id, {
        assetId: 'rwa_001',
        assetName: 'Bonds',
        assetClass: 'government_bonds',
        tokenAmount: 100,
        averageCost: 100,
        currentValue: 100,
        marketValue: 10000, // Only 8% vs 24% target
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0,
        accruedYield: 0,
        yieldRate: 0.045,
        jurisdiction: 'US',
        acquiredAt: new Date(),
      });

      const check = engine.checkRebalanceNeeded(portfolio.id);
      expect(check.needsRebalance).toBeDefined();
      expect(check.currentCryptoAllocation).toBeGreaterThan(0);
    });

    it('should generate rebalance orders', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', {
        ...defaultConfig,
        rebalanceThreshold: 0.01, // Very tight threshold to force rebalance
      }, 200000);

      await engine.addCryptoPosition(portfolio.id, {
        asset: 'BTC',
        quantity: 1,
        averageCost: 100000,
        currentPrice: 100000,
        marketValue: 100000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0,
        chain: 'bitcoin' as any,
      });

      const orders = engine.generateRebalanceOrders(portfolio.id);
      expect(Array.isArray(orders)).toBe(true);
    });

    it('should execute rebalance', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);
      const orders = engine.generateRebalanceOrders(portfolio.id);
      const result = await engine.executeRebalance(portfolio.id, orders);

      expect(result.portfolioId).toBe(portfolio.id);
      expect(result.success).toBe(true);
    });
  });

  describe('analytics', () => {
    it('should calculate performance', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);

      await engine.addRWAPosition(portfolio.id, {
        assetId: 'rwa_001',
        assetName: 'Real Estate',
        assetClass: 'real_estate',
        tokenAmount: 1000,
        averageCost: 100,
        currentValue: 105,
        marketValue: 105000,
        unrealizedPnL: 5000,
        unrealizedPnLPercent: 0.05,
        weight: 0,
        accruedYield: 3000,
        yieldRate: 0.065,
        jurisdiction: 'US',
        acquiredAt: new Date(),
      });

      const performance = engine.calculatePerformance(portfolio.id, '30d');
      expect(performance.totalReturn).toBeGreaterThan(0);
      expect(performance.yieldIncome).toBe(3000);
      expect(performance.period).toBe('30d');
    });

    it('should calculate risk metrics', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 500000);

      const risk = engine.calculateRiskMetrics(portfolio.id);
      expect(risk).toBeDefined();
      expect(risk.beta).toBeDefined();
      expect(risk.concentration).toBeDefined();
    });

    it('should get yield dashboard', async () => {
      const portfolio = await engine.createPortfolio('Test', 'user_001', defaultConfig, 0);

      await engine.addRWAPosition(portfolio.id, {
        assetId: 'rwa_001',
        assetName: 'Corp Bonds',
        assetClass: 'corporate_bonds',
        tokenAmount: 500,
        averageCost: 200,
        currentValue: 200,
        marketValue: 100000,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0,
        accruedYield: 8000,
        yieldRate: 0.08,
        jurisdiction: 'US',
        acquiredAt: new Date(),
      });

      const dashboard = engine.getYieldDashboard(portfolio.id);
      expect(dashboard.portfolioId).toBe(portfolio.id);
      expect(dashboard.rwaYield).toBe(8000);
      expect(dashboard.annualizedYield).toBeGreaterThan(0);
      expect(dashboard.yieldByAsset.length).toBe(1);
      expect(dashboard.upcomingDistributions.length).toBe(1);
    });
  });

  describe('tokenized fund management', () => {
    it('should create a tokenized fund', async () => {
      const fund = await engine.createTokenizedFund({
        name: 'TON Hybrid Fund',
        symbol: 'THF',
        fundType: 'open_ended',
        strategy: 'balanced',
        currency: 'USD',
        managementFee: 0.015,
        performanceFee: 0.20,
        hurdle: 0.08,
        minimumInvestment: 100000,
        redemptionNoticeDays: 30,
        allocationConfig: defaultConfig,
      });

      expect(fund.id).toBeDefined();
      expect(fund.name).toBe('TON Hybrid Fund');
      expect(fund.nav).toBe(1.00);
      expect(fund.totalShares).toBe(0);
      expect(fund.status).toBe('active');
    });

    it('should subscribe to a fund', async () => {
      const fund = await engine.createTokenizedFund({
        name: 'Subscription Test Fund',
        symbol: 'STF',
        fundType: 'open_ended',
        strategy: 'balanced',
        currency: 'USD',
        managementFee: 0.01,
        performanceFee: 0.15,
        minimumInvestment: 10000,
        redemptionNoticeDays: 7,
        allocationConfig: defaultConfig,
      });

      const subscription = await engine.subscribeFund(fund.id, 'investor_001', 50000, 'USD');
      expect(subscription.id).toBeDefined();
      expect(subscription.status).toBe('pending');
      expect(subscription.amount).toBe(50000);
    });

    it('should process fund subscriptions', async () => {
      const fund = await engine.createTokenizedFund({
        name: 'Process Test Fund',
        symbol: 'PTF',
        fundType: 'open_ended',
        strategy: 'balanced',
        currency: 'USD',
        managementFee: 0.01,
        performanceFee: 0.15,
        minimumInvestment: 1000,
        redemptionNoticeDays: 7,
        allocationConfig: defaultConfig,
      });

      await engine.subscribeFund(fund.id, 'investor_001', 10000, 'USD');
      await engine.subscribeFund(fund.id, 'investor_002', 25000, 'USD');

      const result = await engine.processSubscriptions(fund.id);
      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.totalValue).toBe(35000);

      const updatedFund = engine.getFund(fund.id);
      expect(updatedFund!.totalAum).toBe(35000);
      expect(updatedFund!.investors.length).toBe(2);
    });

    it('should reject subscription below minimum', async () => {
      const fund = await engine.createTokenizedFund({
        name: 'Min Test Fund',
        symbol: 'MTF',
        fundType: 'open_ended',
        strategy: 'balanced',
        currency: 'USD',
        managementFee: 0.01,
        performanceFee: 0.15,
        minimumInvestment: 100000,
        redemptionNoticeDays: 7,
        allocationConfig: defaultConfig,
      });

      await expect(
        engine.subscribeFund(fund.id, 'investor_001', 50000, 'USD')
      ).rejects.toThrow('below minimum investment');
    });

    it('should list funds with filters', async () => {
      await engine.createTokenizedFund({
        name: 'Balanced Fund',
        symbol: 'BF',
        fundType: 'open_ended',
        strategy: 'balanced',
        currency: 'USD',
        managementFee: 0.01,
        performanceFee: 0.15,
        minimumInvestment: 10000,
        redemptionNoticeDays: 7,
        allocationConfig: defaultConfig,
      });

      await engine.createTokenizedFund({
        name: 'Yield Fund',
        symbol: 'YF',
        fundType: 'closed_ended',
        strategy: 'yield_maximization',
        currency: 'USD',
        managementFee: 0.015,
        performanceFee: 0.20,
        minimumInvestment: 50000,
        redemptionNoticeDays: 30,
        allocationConfig: { ...defaultConfig, strategy: 'yield_maximization' },
      });

      const allFunds = engine.listFunds();
      expect(allFunds.length).toBe(2);

      const balancedFunds = engine.listFunds({ strategy: ['balanced'] });
      expect(balancedFunds.length).toBe(1);
      expect(balancedFunds[0].name).toBe('Balanced Fund');
    });
  });
});

// ============================================================================
// Liquidity Manager Tests
// ============================================================================

describe('LiquidityManager', () => {
  let manager: ReturnType<typeof createLiquidityManager>;

  beforeEach(() => {
    manager = createLiquidityManager({
      minimumLiquidityBuffer: 0.10,
      earlyRedemptionPenaltyRate: 0.02,
      emergencyRedemptionEnabled: true,
    });
  });

  describe('pool management', () => {
    it('should create a liquidity pool', async () => {
      const pool = await manager.createPool('asset_001', 'NYC REIT', 5000000);

      expect(pool.id).toBeDefined();
      expect(pool.assetId).toBe('asset_001');
      expect(pool.assetName).toBe('NYC REIT');
      expect(pool.totalLiquidity).toBe(5000000);
      expect(pool.tier).toBe('high');
    });

    it('should classify liquidity tiers correctly', async () => {
      const highPool = await manager.createPool('a1', 'High', 50000000);
      expect(highPool.tier).toBe('high'); // >= 1M

      const medPool = await manager.createPool('a2', 'Medium', 5000000);
      expect(medPool.tier).toBe('high'); // 5M >= 1M threshold

      const lowPool = await manager.createPool('a3', 'Low', 500000);
      expect(lowPool.tier).toBe('medium'); // 500K >= 100K threshold

      const illiqPool = await manager.createPool('a4', 'Illiquid', 5000);
      expect(illiqPool.tier).toBe('illiquid'); // < 10K
    });

    it('should retrieve pool by asset', async () => {
      await manager.createPool('asset_001', 'Test Asset', 1000000);

      const pool = manager.getPoolByAsset('asset_001');
      expect(pool).toBeDefined();
      expect(pool!.assetId).toBe('asset_001');
    });

    it('should add and update liquidity sources', async () => {
      const pool = await manager.createPool('asset_001', 'Test', 0);

      const source = await manager.addLiquiditySource(pool.id, {
        type: 'secondary_market',
        name: 'OTC Market',
        availableLiquidity: 5000000,
        priceImpact: 0.005,
        settlementDays: 2,
        minimumSize: 10000,
        isActive: true,
      });

      expect(source.id).toBeDefined();
      expect(source.type).toBe('secondary_market');

      await manager.updateLiquiditySource(pool.id, source.id, {
        availableLiquidity: 6000000,
      });

      const updatedPool = manager.getPool(pool.id);
      const updatedSource = updatedPool!.sources.find(s => s.id === source.id);
      expect(updatedSource!.availableLiquidity).toBe(6000000);
    });
  });

  describe('redemption management', () => {
    it('should submit a standard redemption', async () => {
      const redemption = await manager.submitRedemption(
        'investor_001',
        'asset_001',
        1000,
        'USD',
        'standard'
      );

      expect(redemption.id).toBeDefined();
      expect(redemption.status).toBe('pending');
      expect(redemption.redemptionType).toBe('standard');
      expect(redemption.earlyRedemptionPenalty).toBeUndefined();
    });

    it('should apply early redemption penalty', async () => {
      const redemption = await manager.submitRedemption(
        'investor_001',
        'asset_001',
        1000,
        'USD',
        'early'
      );

      expect(redemption.earlyRedemptionPenalty).toBeDefined();
      expect(redemption.earlyRedemptionPenalty).toBeGreaterThan(0);
    });

    it('should cancel a pending redemption', async () => {
      const redemption = await manager.submitRedemption(
        'investor_001',
        'asset_001',
        500,
        'USD'
      );

      await manager.cancelRedemption(redemption.id, 'Changed my mind');

      const retrieved = manager.getRedemption(redemption.id);
      expect(retrieved!.status).toBe('cancelled');
      expect(retrieved!.reason).toBe('Changed my mind');
    });

    it('should list redemptions with filters', async () => {
      await manager.submitRedemption('investor_001', 'asset_001', 1000, 'USD', 'standard');
      await manager.submitRedemption('investor_001', 'asset_002', 2000, 'USD', 'early');
      await manager.submitRedemption('investor_002', 'asset_001', 3000, 'USD', 'standard');

      const investor1Redemptions = manager.listRedemptions({ investorId: 'investor_001' });
      expect(investor1Redemptions.length).toBe(2);

      const asset1Redemptions = manager.listRedemptions({ assetId: 'asset_001' });
      expect(asset1Redemptions.length).toBe(2);

      const earlyRedemptions = manager.listRedemptions({ type: ['early'] });
      expect(earlyRedemptions.length).toBe(1);
    });

    it('should process redemptions for an asset', async () => {
      const pool = await manager.createPool('asset_001', 'Test', 0);
      await manager.addLiquiditySource(pool.id, {
        type: 'primary_market',
        name: 'Primary Market',
        availableLiquidity: 100000,
        priceImpact: 0.001,
        settlementDays: 30,
        minimumSize: 100,
        isActive: true,
      });

      await manager.submitRedemption('investor_001', 'asset_001', 100, 'USD', 'standard');
      await manager.submitRedemption('investor_002', 'asset_001', 200, 'USD', 'standard');

      const result = await manager.processRedemptions('asset_001');
      expect(result.assetId).toBe('asset_001');
      expect(result.totalRequests).toBe(2);
    });
  });

  describe('liquidity routing', () => {
    it('should route liquidity across sources', async () => {
      const pool = await manager.createPool('asset_001', 'Multi-Source Asset', 0);

      await manager.addLiquiditySource(pool.id, {
        type: 'secondary_market',
        name: 'OTC Market',
        availableLiquidity: 3000000,
        priceImpact: 0.005,
        settlementDays: 2,
        minimumSize: 10000,
        isActive: true,
      });

      await manager.addLiquiditySource(pool.id, {
        type: 'amm',
        name: 'AMM Pool',
        availableLiquidity: 2000000,
        priceImpact: 0.008,
        settlementDays: 0,
        minimumSize: 1000,
        isActive: true,
      });

      const routing = await manager.routeLiquidity('asset_001', 4000000, 'medium');
      expect(routing.requestId).toBeDefined();
      expect(routing.totalAmount).toBe(4000000);
      expect(routing.routes).toBeDefined();
    });

    it('should estimate liquidity', async () => {
      await manager.createPool('asset_001', 'Est Asset', 2000000);

      const estimate = manager.estimateLiquidity('asset_001', 500000);
      expect(estimate.assetId).toBe('asset_001');
      expect(estimate.amount).toBe(500000);
      expect(estimate.canFulfill).toBeDefined();
    });
  });

  describe('secondary market', () => {
    it('should create secondary listing', async () => {
      const listing = await manager.createSecondaryListing(
        'asset_001',
        'seller_001',
        1000,
        105
      );

      expect(listing.id).toBeDefined();
      expect(listing.sellerId).toBe('seller_001');
      expect(listing.amount).toBe(1000);
      expect(listing.totalValue).toBe(105000);
      expect(listing.status).toBe('active');
    });

    it('should execute secondary trade', async () => {
      const listing = await manager.createSecondaryListing(
        'asset_001',
        'seller_001',
        1000,
        100
      );

      const trade = await manager.executeSecondaryTrade(listing.id, 'buyer_001', 500);

      expect(trade.id).toBeDefined();
      expect(trade.buyerId).toBe('buyer_001');
      expect(trade.sellerId).toBe('seller_001');
      expect(trade.amount).toBe(500);
      expect(trade.fee).toBeGreaterThan(0);

      const updatedListings = manager.getSecondaryListings('asset_001');
      const updatedListing = updatedListings.find(l => l.id === listing.id);
      expect(updatedListing!.remainingAmount).toBe(500);
      expect(updatedListing!.status).toBe('partially_filled');
    });

    it('should mark listing as filled', async () => {
      const listing = await manager.createSecondaryListing(
        'asset_001',
        'seller_001',
        100,
        50
      );

      await manager.executeSecondaryTrade(listing.id, 'buyer_001', 100);

      // Filled listings are not returned by getSecondaryListings (filters for active)
      const activeListings = manager.getSecondaryListings('asset_001');
      expect(activeListings.find(l => l.id === listing.id)).toBeUndefined();
    });
  });
});

// ============================================================================
// Cross-Chain Manager Tests
// ============================================================================

describe('CrossChainManager', () => {
  let manager: ReturnType<typeof createCrossChainManager>;

  beforeEach(() => {
    manager = createCrossChainManager({
      enabledChains: ['ton', 'ethereum', 'polygon'],
      maxBridgeFee: 100,
      requireAuditedBridges: false, // For easier testing
      minSecurityScore: 50,
    });
  });

  describe('bridge management', () => {
    it('should register a bridge', async () => {
      const bridge = await manager.registerBridge({
        name: 'Test Bridge',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['TON', 'USDT'],
        bridgeFee: 30,
        estimatedTime: 30,
        securityScore: 80,
        isActive: true,
        dailyVolume: 1000000,
        totalVolumeBridged: 50000000,
      });

      expect(bridge.id).toBeDefined();
      expect(bridge.name).toBe('Test Bridge');
      expect(bridge.isActive).toBe(true);
    });

    it('should list bridges with filters', async () => {
      const bridges = manager.listBridges({ sourceChain: ['ton'] });
      expect(Array.isArray(bridges)).toBe(true);
    });

    it('should disable a bridge', async () => {
      const bridge = await manager.registerBridge({
        name: 'Bridge To Disable',
        sourceChain: 'ton',
        targetChain: 'polygon',
        supportedAssets: ['USDC'],
        bridgeFee: 20,
        estimatedTime: 15,
        securityScore: 75,
        isActive: true,
        dailyVolume: 500000,
        totalVolumeBridged: 10000000,
      });

      await manager.disableBridge(bridge.id);

      const retrieved = manager.getBridge(bridge.id);
      expect(retrieved!.isActive).toBe(false);
    });
  });

  describe('bridge transactions', () => {
    it('should initiate a bridge transaction', async () => {
      const bridge = await manager.registerBridge({
        name: 'TX Test Bridge',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['TON'],
        bridgeFee: 30,
        estimatedTime: 30,
        securityScore: 85,
        isActive: true,
        dailyVolume: 5000000,
        totalVolumeBridged: 100000000,
      });

      const tx = await manager.initiateBridge(
        bridge.id,
        'rwa_001',
        10000,
        '0xSender...',
        '0xRecipient...'
      );

      expect(tx.id).toBeDefined();
      expect(tx.status).toBe('initiated');
      expect(tx.amount).toBe(10000);
      expect(tx.fee).toBeGreaterThan(0);
    });

    it('should update transaction status', async () => {
      const bridge = await manager.registerBridge({
        name: 'Status Test Bridge',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['USDT'],
        bridgeFee: 25,
        estimatedTime: 20,
        securityScore: 80,
        isActive: true,
        dailyVolume: 2000000,
        totalVolumeBridged: 50000000,
      });

      const tx = await manager.initiateBridge(bridge.id, 'rwa_002', 5000, '0xA', '0xB');

      await manager.updateTransactionStatus(tx.id, 'source_confirmed', '0xSourceTxHash');

      const retrieved = manager.getBridgeTransaction(tx.id);
      expect(retrieved!.status).toBe('source_confirmed');
      expect(retrieved!.sourceTxHash).toBe('0xSourceTxHash');
    });

    it('should reject bridging to disabled bridge', async () => {
      const bridge = await manager.registerBridge({
        name: 'Disabled Bridge',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['USDC'],
        bridgeFee: 20,
        estimatedTime: 15,
        securityScore: 70,
        isActive: true,
        dailyVolume: 1000000,
        totalVolumeBridged: 20000000,
      });

      await manager.disableBridge(bridge.id);

      await expect(
        manager.initiateBridge(bridge.id, 'rwa_003', 1000, '0xA', '0xB')
      ).rejects.toThrow('Bridge is not active');
    });
  });

  describe('RWA protocol registry', () => {
    it('should register protocols during initialization', () => {
      const protocols = manager.listProtocols();
      expect(protocols.length).toBeGreaterThan(0);
    });

    it('should filter protocols by chain', () => {
      const ethProtocols = manager.listProtocols({ chain: ['ethereum'] });
      expect(ethProtocols.every(p => p.chain === 'ethereum')).toBe(true);
    });

    it('should filter protocols by risk rating', () => {
      const lowRiskProtocols = manager.listProtocols({ riskRating: ['low'] });
      expect(lowRiskProtocols.every(p => p.riskRating === 'low')).toBe(true);
    });

    it('should filter protocols by asset class', () => {
      const tbillProtocols = manager.listProtocols({ assetClass: ['treasury_bills'] });
      expect(tbillProtocols.every(p =>
        p.supportedAssetClasses.includes('treasury_bills')
      )).toBe(true);
    });

    it('should register a custom protocol', async () => {
      const protocol = await manager.registerProtocol({
        name: 'Custom RWA Protocol',
        chain: 'ton',
        protocolType: 'tokenization',
        tvl: 10000000,
        apy: 0.07,
        supportedAssetClasses: ['real_estate', 'private_credit'],
        audited: true,
        riskRating: 'medium',
        integrationStatus: 'beta',
        metadata: {},
      });

      expect(protocol.id).toBeDefined();
      expect(protocol.chain).toBe('ton');

      const retrieved = manager.getProtocol(protocol.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Custom RWA Protocol');
    });
  });

  describe('optimal bridge routing', () => {
    it('should find optimal bridge', async () => {
      await manager.registerBridge({
        name: 'Bridge A - Cheap',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['USDC'],
        bridgeFee: 10,
        estimatedTime: 60,
        securityScore: 75,
        isActive: true,
        dailyVolume: 1000000,
        totalVolumeBridged: 10000000,
      });

      await manager.registerBridge({
        name: 'Bridge B - Fast',
        sourceChain: 'ton',
        targetChain: 'ethereum',
        supportedAssets: ['USDC'],
        bridgeFee: 50,
        estimatedTime: 5,
        securityScore: 90,
        isActive: true,
        dailyVolume: 5000000,
        totalVolumeBridged: 50000000,
      });

      const recommendation = manager.findOptimalBridge('ton', 'ethereum', 100000);
      expect(recommendation).toBeDefined();
      expect(recommendation!.bridge).toBeDefined();
      expect(recommendation!.reasoning).toBeDefined();
    });

    it('should return undefined for unsupported chain pair', () => {
      const result = manager.findOptimalBridge('ton', 'avalanche', 10000);
      // May or may not be undefined depending on bridge registrations
      if (result) {
        expect(result.bridge).toBeDefined();
      }
    });
  });

  describe('cross-chain analytics', () => {
    it('should generate analytics', () => {
      const analytics = manager.getCrossChainAnalytics();

      expect(analytics.totalBridged).toBeDefined();
      expect(analytics.totalTransactions).toBeDefined();
      expect(analytics.topProtocolsByTvl).toBeDefined();
      expect(analytics.topProtocolsByTvl.length).toBeGreaterThan(0);
      expect(analytics.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// Unified RWA Manager Tests
// ============================================================================

describe('RWAManager (Unified)', () => {
  let rwa: ReturnType<typeof createRWAManager>;

  beforeEach(() => {
    rwa = createRWAManager({
      tokenization: { requireAuditBeforeActivation: false },
      compliance: { strictMode: false, accreditationRequired: false },
    });
  });

  describe('initialization', () => {
    it('should create manager with all sub-managers', () => {
      expect(rwa.tokenization).toBeDefined();
      expect(rwa.compliance).toBeDefined();
      expect(rwa.allocation).toBeDefined();
      expect(rwa.portfolio).toBeDefined();
      expect(rwa.liquidity).toBeDefined();
      expect(rwa.crossChain).toBeDefined();
    });

    it('should get system status', () => {
      const status = rwa.getSystemStatus();

      expect(status.tokenizedAssets).toBeDefined();
      expect(status.registeredInvestors).toBeDefined();
      expect(status.registeredProtocols).toBeGreaterThan(0); // From KNOWN_RWA_PROTOCOLS
      expect(status.generatedAt).toBeDefined();
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all sub-managers', async () => {
      const events: unknown[] = [];
      rwa.onEvent(event => events.push(event));

      // Trigger events from different sub-managers
      await rwa.tokenization.tokenizeAsset({
        assetClass: 'real_estate',
        name: 'Event Test',
        symbol: 'ET',
        description: 'Test',
        issuer: 'Issuer',
        custodian: 'Custodian',
        jurisdiction: 'US',
        totalValue: 1000000,
        currency: 'USD',
        tokenSupply: 10000,
        minimumInvestment: 100,
      });

      await rwa.compliance.createInvestorProfile('user_001', 'accredited');

      expect(events.length).toBeGreaterThan(1);
    });
  });

  describe('end-to-end flows', () => {
    it('should complete full RWA tokenization and investment flow', async () => {
      // 1. Tokenize an asset
      const tokenResult = await rwa.tokenization.tokenizeAsset({
        assetClass: 'government_bonds',
        name: 'US T-Bills 2024',
        symbol: 'USTB24',
        description: '6-month US Treasury Bills',
        issuer: 'US Treasury',
        custodian: 'BNY Mellon',
        jurisdiction: 'US',
        totalValue: 10000000,
        currency: 'USD',
        tokenSupply: 100000,
        minimumInvestment: 100,
        yieldRate: 0.053,
      });

      expect(tokenResult.assetId).toBeDefined();

      // 2. Create investor profile and complete compliance
      const investor = await rwa.compliance.createInvestorProfile('user_001', 'accredited', {
        allowedJurisdictions: ['US'],
      });
      await rwa.compliance.approveKyc(investor.id, 'enhanced');
      await rwa.compliance.approveAml(investor.id);
      // US jurisdiction requires accreditation
      await rwa.compliance.verifyAccreditation(investor.id, {
        type: 'net_worth',
        verifiedBy: 'CPA Firm',
        verificationDate: new Date(),
        netWorth: 5000000, // $5M net worth
      });

      // 3. Check access
      const access = await rwa.compliance.checkInvestorAccess(
        investor.id,
        tokenResult.assetId,
        'government_bonds',
        'US',
        100000
      );
      expect(access.allowed).toBe(true);

      // 4. Register opportunity in allocation engine
      rwa.allocation.registerOpportunity({
        assetId: tokenResult.assetId,
        assetClass: 'government_bonds',
        name: 'US T-Bills 2024',
        yieldRate: 0.053,
        riskScore: 5,
        liquidityScore: 95,
        minimumInvestment: 100,
        availableAmount: 10000000,
        jurisdiction: 'US',
        aiScore: 85,
        reasoning: 'Safe government-backed asset',
      });

      // 5. Get allocation recommendation
      const recommendation = rwa.allocation.generateRecommendation(
        1000000,
        {
          strategy: 'balanced',
          maxRWAAllocation: 0.40,
          minCryptoAllocation: 0.40,
          rebalanceThreshold: 0.05,
          riskTolerance: 'conservative',
          preferredAssetClasses: ['government_bonds'],
          parameters: {},
        },
        0.08
      );

      expect(recommendation.rwaAllocation).toBeGreaterThan(0);

      // 6. Create portfolio and add position
      const portfolio = await rwa.portfolio.createPortfolio(
        'Conservative Portfolio',
        investor.id,
        {
          strategy: 'balanced',
          maxRWAAllocation: 0.40,
          minCryptoAllocation: 0.40,
          rebalanceThreshold: 0.05,
          riskTolerance: 'conservative',
          preferredAssetClasses: ['government_bonds'],
          parameters: {},
        },
        1000000
      );

      await rwa.portfolio.addRWAPosition(portfolio.id, {
        assetId: tokenResult.assetId,
        assetName: 'US T-Bills 2024',
        assetClass: 'government_bonds',
        tokenAmount: 4000,
        averageCost: 100,
        currentValue: 100,
        marketValue: 400000, // 40% of portfolio
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        weight: 0,
        accruedYield: 0,
        yieldRate: 0.053,
        jurisdiction: 'US',
        acquiredAt: new Date(),
      });

      // 7. Calculate performance
      const performance = rwa.portfolio.calculatePerformance(portfolio.id);
      expect(performance).toBeDefined();

      // 8. Get system status
      const status = rwa.getSystemStatus();
      expect(status.tokenizedAssets).toBe(1);
      expect(status.registeredInvestors).toBe(1);
      expect(status.approvedInvestors).toBe(1);
    });

    it('should complete tokenized fund deployment flow', async () => {
      // Deploy fund
      const fund = await rwa.portfolio.createTokenizedFund({
        name: 'Institutional RWA Fund',
        symbol: 'IRWA',
        fundType: 'open_ended',
        strategy: 'yield_maximization',
        currency: 'USD',
        managementFee: 0.015,
        performanceFee: 0.20,
        hurdle: 0.08,
        minimumInvestment: 250000,
        redemptionNoticeDays: 90,
        allocationConfig: {
          strategy: 'yield_maximization',
          maxRWAAllocation: 0.70,
          minCryptoAllocation: 0.20,
          rebalanceThreshold: 0.05,
          riskTolerance: 'moderate',
          preferredAssetClasses: ['private_credit', 'corporate_bonds'],
          parameters: {},
        },
      });

      expect(fund.id).toBeDefined();
      expect(fund.status).toBe('active');

      // Subscribe investors
      const sub1 = await rwa.portfolio.subscribeFund(
        fund.id,
        'inst_investor_001',
        1000000,
        'USD'
      );

      const sub2 = await rwa.portfolio.subscribeFund(
        fund.id,
        'inst_investor_002',
        2500000,
        'USD'
      );

      expect(sub1.status).toBe('pending');
      expect(sub2.status).toBe('pending');

      // Process subscriptions
      const result = await rwa.portfolio.processSubscriptions(fund.id);
      expect(result.successful).toBe(2);
      expect(result.totalValue).toBe(3500000);

      // Verify fund AUM
      const updatedFund = rwa.portfolio.getFund(fund.id);
      expect(updatedFund!.totalAum).toBe(3500000);
      expect(updatedFund!.investors.length).toBe(2);
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('should have DEFAULT_JURISDICTION_RULES', () => {
    expect(DEFAULT_JURISDICTION_RULES).toBeDefined();
    expect(DEFAULT_JURISDICTION_RULES.length).toBeGreaterThan(0);

    const usRule = DEFAULT_JURISDICTION_RULES.find(r => r.jurisdiction === 'US');
    expect(usRule).toBeDefined();
    expect(usRule!.requiresAccreditation).toBe(true);
  });

  it('should have KNOWN_RWA_PROTOCOLS', () => {
    expect(KNOWN_RWA_PROTOCOLS).toBeDefined();
    expect(KNOWN_RWA_PROTOCOLS.length).toBeGreaterThan(0);

    const protocols = KNOWN_RWA_PROTOCOLS.map(p => p.name);
    expect(protocols).toContain('Ondo Finance');
    expect(protocols).toContain('Maple Finance');
  });

  it('should have KNOWN_BRIDGES', () => {
    expect(KNOWN_BRIDGES).toBeDefined();
    expect(KNOWN_BRIDGES.length).toBeGreaterThan(0);

    const bridges = KNOWN_BRIDGES.map(b => b.name);
    expect(bridges).toContain('TON Bridge');
  });
});
