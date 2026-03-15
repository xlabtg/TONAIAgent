/**
 * TONAIAgent - Sovereign-Grade Institutional Alignment (SGIA) Tests
 *
 * Comprehensive test suite for all 6 domains of SGIA:
 * 1. Sovereign Integration Framework
 * 2. Regulatory Compatibility Layer
 * 3. Institutional Custody Alignment
 * 4. Transparency & Audit Framework
 * 5. Capital Adequacy & Reserve Model
 * 6. Sovereign Participation Modes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSGIAManager,
  createSovereignIntegrationFramework,
  createRegulatoryCompatibilityLayer,
  createInstitutionalCustodyAlignment,
  createTransparencyAuditFramework,
  createCapitalAdequacyAndReserveModel,
  createSovereignParticipationManager,
} from '../../research/sgia/index';

// ============================================================================
// Sovereign Integration Framework Tests
// ============================================================================

describe('SovereignIntegrationFramework', () => {
  let framework: ReturnType<typeof createSovereignIntegrationFramework>;

  beforeEach(() => {
    framework = createSovereignIntegrationFramework();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(framework.config).toBeDefined();
      expect(framework.config.enableTokenizedVaults).toBe(true);
      expect(framework.config.enablePermissionedFundClasses).toBe(true);
      expect(framework.config.minimumMultiSigSignatures).toBe(2);
    });

    it('should accept custom configuration', () => {
      const custom = createSovereignIntegrationFramework({
        minimumMultiSigSignatures: 3,
        enableCrossJurisdictionVaults: false,
      });
      expect(custom.config.minimumMultiSigSignatures).toBe(3);
      expect(custom.config.enableCrossJurisdictionVaults).toBe(false);
    });
  });

  describe('institutional vaults', () => {
    it('should create an institutional vault', () => {
      const vault = framework.createVault({
        name: 'ECB Digital Reserve Vault',
        vaultType: 'sovereign_vault',
        fundClass: 'sovereign_reserved',
        ownerEntityId: 'ecb-001',
        jurisdictions: ['EU', 'DE'],
      });

      expect(vault.id).toBeDefined();
      expect(vault.name).toBe('ECB Digital Reserve Vault');
      expect(vault.vaultType).toBe('sovereign_vault');
      expect(vault.fundClass).toBe('sovereign_reserved');
      expect(vault.ownerEntityId).toBe('ecb-001');
      expect(vault.status).toBe('active');
      expect(vault.jurisdictions).toContain('EU');
      expect(vault.createdAt).toBeInstanceOf(Date);
    });

    it('should create multiple vault types', () => {
      const types = ['institutional_vault', 'sovereign_vault', 'custodial_vault', 'reserve_vault', 'escrow_vault'] as const;
      for (const vaultType of types) {
        const vault = framework.createVault({
          name: `Test ${vaultType}`,
          vaultType,
          fundClass: 'permissioned_institutional',
          ownerEntityId: 'owner-001',
          jurisdictions: ['US'],
        });
        expect(vault.vaultType).toBe(vaultType);
      }
    });

    it('should retrieve vault by id', () => {
      const created = framework.createVault({
        name: 'Test Vault',
        vaultType: 'institutional_vault',
        fundClass: 'permissioned_institutional',
        ownerEntityId: 'owner-001',
        jurisdictions: ['US'],
      });

      const retrieved = framework.getVault(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return undefined for non-existent vault', () => {
      expect(framework.getVault('nonexistent')).toBeUndefined();
    });

    it('should list vaults with filters', () => {
      framework.createVault({ name: 'EU Vault 1', vaultType: 'sovereign_vault', fundClass: 'sovereign_reserved', ownerEntityId: 'ecb-001', jurisdictions: ['EU'] });
      framework.createVault({ name: 'US Vault', vaultType: 'institutional_vault', fundClass: 'permissioned_institutional', ownerEntityId: 'jpm-001', jurisdictions: ['US'] });
      framework.createVault({ name: 'EU Vault 2', vaultType: 'reserve_vault', fundClass: 'sovereign_reserved', ownerEntityId: 'ecb-001', jurisdictions: ['EU'] });

      const euVaults = framework.listVaults({ jurisdiction: 'EU' });
      expect(euVaults).toHaveLength(2);

      const sovereignVaults = framework.listVaults({ vaultType: 'sovereign_vault' });
      expect(sovereignVaults).toHaveLength(1);
      expect(sovereignVaults[0].name).toBe('EU Vault 1');

      const ecbVaults = framework.listVaults({ ownerEntityId: 'ecb-001' });
      expect(ecbVaults).toHaveLength(2);
    });

    it('should add assets to vault', () => {
      const vault = framework.createVault({
        name: 'Test Vault',
        vaultType: 'reserve_vault',
        fundClass: 'sovereign_reserved',
        ownerEntityId: 'entity-001',
        jurisdictions: ['US'],
      });

      const asset = framework.addVaultAsset(vault.id, {
        assetId: 'btc-001',
        assetName: 'Bitcoin',
        assetClass: 'institutional_crypto',
        chain: 'bitcoin',
        amount: 100,
        usdValue: 5_000_000,
      });

      expect(asset.assetId).toBe('btc-001');
      expect(asset.verifiedAt).toBeInstanceOf(Date);

      const updatedVault = framework.getVault(vault.id)!;
      expect(updatedVault.totalValueUSD).toBe(5_000_000);
      expect(updatedVault.assets).toHaveLength(1);
    });

    it('should add signatories to vault', () => {
      const vault = framework.createVault({
        name: 'Multi-Sig Vault',
        vaultType: 'sovereign_vault',
        fundClass: 'sovereign_reserved',
        ownerEntityId: 'entity-001',
        jurisdictions: ['US'],
      });

      const signatory = framework.addVaultSignatory(vault.id, {
        role: 'primary',
        institutionId: 'inst-001',
        publicKey: 'pubkey-123',
        weight: 1,
      });

      expect(signatory.id).toBeDefined();
      expect(signatory.role).toBe('primary');
      expect(signatory.addedAt).toBeInstanceOf(Date);

      const updatedVault = framework.getVault(vault.id)!;
      expect(updatedVault.signatories).toHaveLength(1);
    });

    it('should freeze a vault', () => {
      const vault = framework.createVault({
        name: 'Vault to Freeze',
        vaultType: 'institutional_vault',
        fundClass: 'permissioned_institutional',
        ownerEntityId: 'entity-001',
        jurisdictions: ['US'],
      });

      const frozen = framework.freezeVault(vault.id, 'Compliance review');
      expect(frozen.status).toBe('frozen');
    });
  });

  describe('permissioned fund classes', () => {
    it('should create a permissioned fund class', () => {
      const fundClass = framework.createFundClass({
        name: 'Sovereign Institutional Class A',
        fundClass: 'sovereign_reserved',
        description: 'Reserved for sovereign wealth funds',
        minimumInvestmentUSD: 100_000_000,
        lockupPeriodDays: 90,
        redemptionNoticeDays: 30,
        allowedJurisdictions: ['US', 'EU', 'GB'],
        eligibilityCriteria: {
          requiredEntityTypes: ['sovereign_wealth_fund', 'central_bank'],
          requiredKycTier: 'sovereign_grade',
          requiresSovereignClassification: true,
          minimumAUMUSD: 1_000_000_000,
        },
      });

      expect(fundClass.id).toBeDefined();
      expect(fundClass.name).toBe('Sovereign Institutional Class A');
      expect(fundClass.minimumInvestmentUSD).toBe(100_000_000);
      expect(fundClass.status).toBe('active');
      expect(fundClass.eligibilityCriteria.requiredKycTier).toBe('sovereign_grade');
    });

    it('should list and filter fund classes', () => {
      framework.createFundClass({
        name: 'Class A', fundClass: 'sovereign_reserved', description: 'A',
        minimumInvestmentUSD: 100e6, lockupPeriodDays: 90, redemptionNoticeDays: 30,
        allowedJurisdictions: ['US'], eligibilityCriteria: {},
      });
      framework.createFundClass({
        name: 'Class B', fundClass: 'permissioned_institutional', description: 'B',
        minimumInvestmentUSD: 10e6, lockupPeriodDays: 30, redemptionNoticeDays: 5,
        allowedJurisdictions: ['EU'], eligibilityCriteria: {},
      });

      const all = framework.listFundClasses();
      expect(all).toHaveLength(2);

      const sovereign = framework.listFundClasses({ fundClass: 'sovereign_reserved' });
      expect(sovereign).toHaveLength(1);
      expect(sovereign[0].name).toBe('Class A');
    });

    it('should check eligibility', () => {
      const fc = framework.createFundClass({
        name: 'Test Class', fundClass: 'sovereign_reserved', description: 'Test',
        minimumInvestmentUSD: 100e6, lockupPeriodDays: 90, redemptionNoticeDays: 30,
        allowedJurisdictions: ['US'], eligibilityCriteria: {},
      });

      const result = framework.checkEligibility('entity-001', fc.id);
      expect(result).toBeDefined();
      expect(result.entityId).toBe('entity-001');
      expect(result.fundClassId).toBe(fc.id);
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('should return ineligible for non-existent fund class', () => {
      const result = framework.checkEligibility('entity-001', 'nonexistent-id');
      expect(result.isEligible).toBe(false);
      expect(result.failedCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('events', () => {
    it('should emit event on vault creation', () => {
      const events: unknown[] = [];
      framework.onEvent(e => events.push(e));

      framework.createVault({
        name: 'Event Test Vault',
        vaultType: 'institutional_vault',
        fundClass: 'permissioned_institutional',
        ownerEntityId: 'entity-001',
        jurisdictions: ['US'],
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Regulatory Compatibility Layer Tests
// ============================================================================

describe('RegulatoryCompatibilityLayer', () => {
  let layer: ReturnType<typeof createRegulatoryCompatibilityLayer>;

  beforeEach(() => {
    layer = createRegulatoryCompatibilityLayer();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(layer.config).toBeDefined();
      expect(layer.config.enableKycAmlModules).toBe(true);
      expect(layer.config.enableSanctionsScreening).toBe(true);
      expect(layer.config.defaultKycTier).toBe('enhanced');
    });
  });

  describe('KYC/AML modules', () => {
    it('should register a KYC module', () => {
      const module = layer.registerKycModule({
        name: 'EU Sovereign KYC Module',
        jurisdiction: 'EU',
        kycTier: 'sovereign_grade',
        supportedEntityTypes: ['central_bank', 'sovereign_wealth_fund'],
      });

      expect(module.id).toBeDefined();
      expect(module.name).toBe('EU Sovereign KYC Module');
      expect(module.jurisdiction).toBe('EU');
      expect(module.kycTier).toBe('sovereign_grade');
      expect(module.status).toBe('active');
      expect(module.verificationSteps.length).toBeGreaterThan(0);
      expect(module.sanctionsLists).toContain('OFAC');
    });

    it('should retrieve module by jurisdiction', () => {
      layer.registerKycModule({
        name: 'US KYC Module',
        jurisdiction: 'US',
        kycTier: 'enhanced',
        supportedEntityTypes: ['tier1_bank'],
      });

      const found = layer.getKycModuleByJurisdiction('US');
      expect(found).toBeDefined();
      expect(found!.jurisdiction).toBe('US');
    });

    it('should add AML rules to module', () => {
      const module = layer.registerKycModule({
        name: 'Test Module',
        jurisdiction: 'GB',
        kycTier: 'enhanced',
        supportedEntityTypes: ['tier1_bank'],
      });

      const rule = layer.addAmlRule(module.id, {
        ruleType: 'transaction_monitoring',
        threshold: 10_000,
        currency: 'USD',
        enforcement: 'report',
        description: 'Report transactions over $10,000',
        lastUpdated: new Date(),
      });

      expect(rule.id).toBeDefined();
      expect(rule.ruleType).toBe('transaction_monitoring');

      const updatedModule = layer.getKycModule(module.id)!;
      expect(updatedModule.amlRules).toHaveLength(1);
    });

    it('should list modules with filters', () => {
      layer.registerKycModule({ name: 'EU Module', jurisdiction: 'EU', kycTier: 'sovereign_grade', supportedEntityTypes: ['central_bank'] });
      layer.registerKycModule({ name: 'US Module', jurisdiction: 'US', kycTier: 'enhanced', supportedEntityTypes: ['tier1_bank'] });

      const allModules = layer.listKycModules();
      expect(allModules).toHaveLength(2);

      const sovereignModules = layer.listKycModules({ kycTier: 'sovereign_grade' });
      expect(sovereignModules).toHaveLength(1);
    });
  });

  describe('jurisdiction profiles', () => {
    it('should register a jurisdiction profile', () => {
      const profile = layer.registerJurisdictionProfile({
        jurisdiction: 'EU',
        regulatoryFramework: 'MiFID II / AIFMD',
        complianceStatus: 'compliant',
        requiredKycTier: 'sovereign_grade',
        supportedFundClasses: ['sovereign_reserved', 'permissioned_institutional'],
      });

      expect(profile.id).toBeDefined();
      expect(profile.jurisdiction).toBe('EU');
      expect(profile.complianceStatus).toBe('compliant');
      expect(profile.supportedFundClasses).toContain('sovereign_reserved');
    });

    it('should retrieve profile by jurisdiction code', () => {
      layer.registerJurisdictionProfile({
        jurisdiction: 'SG',
        regulatoryFramework: 'MAS',
        complianceStatus: 'compliant',
        requiredKycTier: 'enhanced',
        supportedFundClasses: ['permissioned_institutional'],
      });

      const found = layer.getJurisdictionProfileByCode('SG');
      expect(found).toBeDefined();
      expect(found!.jurisdiction).toBe('SG');
    });
  });

  describe('KYC verification', () => {
    it('should initiate KYC verification', () => {
      const record = layer.initiateKycVerification({
        entityId: 'entity-001',
        entityType: 'sovereign_wealth_fund',
        jurisdiction: 'US',
        requestedTier: 'sovereign_grade',
      });

      expect(record.id).toBeDefined();
      expect(record.entityId).toBe('entity-001');
      expect(record.status).toBe('in_progress');
      expect(record.initiatedAt).toBeInstanceOf(Date);
    });

    it('should advance KYC steps', () => {
      const record = layer.initiateKycVerification({
        entityId: 'entity-001',
        entityType: 'central_bank',
        jurisdiction: 'EU',
        requestedTier: 'sovereign_grade',
      });

      const updated = layer.advanceKycStep(record.id, 'identity_verification', true, 'Documents verified');
      expect(updated.stepResults).toHaveLength(1);
      expect(updated.stepResults[0].passed).toBe(true);
    });

    it('should complete KYC verification', () => {
      const record = layer.initiateKycVerification({
        entityId: 'entity-002',
        entityType: 'tier1_bank',
        jurisdiction: 'GB',
        requestedTier: 'enhanced',
      });

      const completed = layer.completeKycVerification(record.id, 'enhanced');
      expect(completed.status).toBe('completed');
      expect(completed.achievedTier).toBe('enhanced');
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('regulatory compliance checking', () => {
    it('should return non-compliant when no KYC is done', () => {
      layer.registerJurisdictionProfile({
        jurisdiction: 'US',
        regulatoryFramework: 'US SEC',
        complianceStatus: 'compliant',
        requiredKycTier: 'enhanced',
        supportedFundClasses: ['permissioned_institutional'],
      });

      const result = layer.checkRegulatoryCompliance('entity-001', 'US');
      expect(result.isCompliant).toBe(false);
      expect(result.kycStatus).toBe('not_started');
    });

    it('should return compliant after KYC completion', () => {
      layer.registerJurisdictionProfile({
        jurisdiction: 'US',
        regulatoryFramework: 'US SEC',
        complianceStatus: 'compliant',
        requiredKycTier: 'enhanced',
        supportedFundClasses: ['permissioned_institutional'],
      });

      const record = layer.initiateKycVerification({
        entityId: 'entity-compliant',
        entityType: 'tier1_bank',
        jurisdiction: 'US',
        requestedTier: 'enhanced',
      });
      layer.completeKycVerification(record.id, 'enhanced');

      const result = layer.checkRegulatoryCompliance('entity-compliant', 'US');
      expect(result.kycStatus).toBe('verified');
      expect(result.kycTier).toBe('enhanced');
    });
  });
});

// ============================================================================
// Institutional Custody Alignment Tests
// ============================================================================

describe('InstitutionalCustodyAlignment', () => {
  let alignment: ReturnType<typeof createInstitutionalCustodyAlignment>;

  beforeEach(() => {
    alignment = createInstitutionalCustodyAlignment();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(alignment.config).toBeDefined();
      expect(alignment.config.enableMultiSigVaults).toBe(true);
      expect(alignment.config.enableProofOfReserve).toBe(true);
      expect(alignment.config.minimumInsuranceCoverageUSD).toBe(100_000_000);
    });
  });

  describe('custodian management', () => {
    it('should register a custodian', () => {
      const custodian = alignment.registerCustodian({
        name: 'BNY Mellon Digital',
        custodianType: 'traditional',
        jurisdiction: 'US',
        regulatoryLicenses: ['OCC_TRUST_CHARTER', 'NYDFS_BITLICENSE'],
        supportedAssets: ['BTC', 'ETH', 'USDC'],
        supportedChains: ['bitcoin', 'ethereum', 'ton'],
        segregationModel: 'full_segregation',
        insuranceCoverageUSD: 500_000_000,
      });

      expect(custodian.id).toBeDefined();
      expect(custodian.name).toBe('BNY Mellon Digital');
      expect(custodian.custodianType).toBe('traditional');
      expect(custodian.status).toBe('onboarding');
    });

    it('should reject custodian without licenses when required', () => {
      expect(() => alignment.registerCustodian({
        name: 'Unlicensed Custodian',
        custodianType: 'crypto_native',
        jurisdiction: 'US',
        regulatoryLicenses: [], // No licenses
        supportedAssets: ['BTC'],
        supportedChains: ['bitcoin'],
        segregationModel: 'omnibus',
        insuranceCoverageUSD: 100_000_000,
      })).toThrow(/license/i);
    });

    it('should reject custodian with insufficient insurance', () => {
      expect(() => alignment.registerCustodian({
        name: 'Low Insurance Custodian',
        custodianType: 'traditional',
        jurisdiction: 'US',
        regulatoryLicenses: ['SOME_LICENSE'],
        supportedAssets: ['BTC'],
        supportedChains: ['bitcoin'],
        segregationModel: 'omnibus',
        insuranceCoverageUSD: 1_000, // Way below minimum
      })).toThrow(/insurance/i);
    });

    it('should list custodians with filters', () => {
      const c1 = alignment.registerCustodian({
        name: 'US Custodian', custodianType: 'traditional', jurisdiction: 'US',
        regulatoryLicenses: ['OCC'], supportedAssets: ['BTC'], supportedChains: ['bitcoin'],
        segregationModel: 'full_segregation', insuranceCoverageUSD: 200e6,
      });
      alignment.updateCustodian(c1.id, { status: 'active' });

      const c2 = alignment.registerCustodian({
        name: 'EU Custodian', custodianType: 'hybrid', jurisdiction: 'DE',
        regulatoryLicenses: ['BAFIN'], supportedAssets: ['ETH'], supportedChains: ['ethereum'],
        segregationModel: 'full_segregation', insuranceCoverageUSD: 150e6,
      });
      alignment.updateCustodian(c2.id, { status: 'active' });

      const active = alignment.listCustodians({ status: 'active' });
      expect(active).toHaveLength(2);

      const usCustodians = alignment.listCustodians({ jurisdiction: 'US' });
      expect(usCustodians).toHaveLength(1);
    });
  });

  describe('multi-sig vault configuration', () => {
    it('should configure a multi-sig vault', () => {
      const config = alignment.configureMultiSigVault({
        vaultId: 'vault-001',
        signatoryThreshold: 3,
        totalSignatories: 5,
        hardwareSecurityModule: true,
        geographicDistribution: ['US', 'EU', 'GB'],
      });

      expect(config.id).toBeDefined();
      expect(config.signatoryThreshold).toBe(3);
      expect(config.totalSignatories).toBe(5);
      expect(config.hardwareSecurityModule).toBe(true);
    });

    it('should reject invalid multi-sig configuration', () => {
      expect(() => alignment.configureMultiSigVault({
        vaultId: 'vault-001',
        signatoryThreshold: 6,
        totalSignatories: 5, // threshold > total
      })).toThrow();
    });
  });

  describe('custodian transfers', () => {
    let c1Id: string;
    let c2Id: string;

    beforeEach(() => {
      const c1 = alignment.registerCustodian({
        name: 'Source Custodian', custodianType: 'traditional', jurisdiction: 'US',
        regulatoryLicenses: ['OCC'], supportedAssets: ['BTC'], supportedChains: ['bitcoin'],
        segregationModel: 'full_segregation', insuranceCoverageUSD: 200e6,
      });
      alignment.updateCustodian(c1.id, { status: 'active' });
      c1Id = c1.id;

      const c2 = alignment.registerCustodian({
        name: 'Dest Custodian', custodianType: 'traditional', jurisdiction: 'EU',
        regulatoryLicenses: ['BAFIN'], supportedAssets: ['BTC'], supportedChains: ['bitcoin'],
        segregationModel: 'full_segregation', insuranceCoverageUSD: 150e6,
      });
      alignment.updateCustodian(c2.id, { status: 'active' });
      c2Id = c2.id;
    });

    it('should initiate a custodian transfer', () => {
      const transfer = alignment.initiateCustodianTransfer({
        fromCustodianId: c1Id,
        toCustodianId: c2Id,
        vaultId: 'vault-001',
        assetId: 'btc-001',
        amount: 10,
        usdValue: 500_000,
        initiatedBy: 'user-001',
        requiredApprovals: 2,
      });

      expect(transfer.id).toBeDefined();
      expect(transfer.status).toBe('pending');
      expect(transfer.requiredApprovals).toBe(2);
    });

    it('should approve and execute transfer', () => {
      const transfer = alignment.initiateCustodianTransfer({
        fromCustodianId: c1Id,
        toCustodianId: c2Id,
        vaultId: 'vault-001',
        assetId: 'btc-001',
        amount: 10,
        usdValue: 500_000,
        initiatedBy: 'user-001',
        requiredApprovals: 2,
      });

      alignment.approveTransfer(transfer.id, 'approver-1');
      const afterFirst = alignment.getTransfer(transfer.id)!;
      expect(afterFirst.status).toBe('pending'); // Need 2 approvals

      alignment.approveTransfer(transfer.id, 'approver-2');
      const afterSecond = alignment.getTransfer(transfer.id)!;
      expect(afterSecond.status).toBe('approved');

      const executed = alignment.executeTransfer(transfer.id);
      expect(executed.status).toBe('completed');
      expect(executed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('proof of reserve', () => {
    it('should verify proof of reserve', () => {
      const custodian = alignment.registerCustodian({
        name: 'Reserve Custodian', custodianType: 'traditional', jurisdiction: 'US',
        regulatoryLicenses: ['OCC'], supportedAssets: ['BTC'], supportedChains: ['bitcoin'],
        segregationModel: 'full_segregation', insuranceCoverageUSD: 500e6,
        proofOfReserveEnabled: true,
      });

      const result = alignment.verifyProofOfReserve(custodian.id);
      expect(result.custodianId).toBe(custodian.id);
      expect(result.reserveRatio).toBeGreaterThan(0);
      expect(result.verifiedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Transparency & Audit Framework Tests
// ============================================================================

describe('TransparencyAuditFramework', () => {
  let framework: ReturnType<typeof createTransparencyAuditFramework>;

  beforeEach(() => {
    framework = createTransparencyAuditFramework();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(framework.config).toBeDefined();
      expect(framework.config.enableOnChainAudit).toBe(true);
      expect(framework.config.enableRealTimeReporting).toBe(true);
      expect(framework.config.complianceScoreThreshold).toBe(80);
    });
  });

  describe('audit records', () => {
    it('should create an audit record', () => {
      const record = framework.createAuditRecord({
        eventType: 'vault_deposit',
        entityId: 'entity-001',
        entityType: 'sovereign_wealth_fund',
        actorId: 'actor-001',
        actorType: 'system',
        action: 'deposit_to_vault',
        newState: { amount: 1_000_000 },
        jurisdiction: 'US',
      });

      expect(record.id).toBeDefined();
      expect(record.eventType).toBe('vault_deposit');
      expect(record.entityId).toBe('entity-001');
      expect(record.jurisdiction).toBe('US');
      expect(record.complianceFlags).toHaveLength(0);
      expect(record.timestamp).toBeInstanceOf(Date);
    });

    it('should list records with filters', () => {
      framework.createAuditRecord({ eventType: 'vault_deposit', entityId: 'e1', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'deposit', jurisdiction: 'US' });
      framework.createAuditRecord({ eventType: 'kyc_verification', entityId: 'e2', entityType: 'bank', actorId: 'a2', actorType: 'kyc_system', action: 'verify', jurisdiction: 'EU' });
      framework.createAuditRecord({ eventType: 'vault_withdrawal', entityId: 'e1', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'withdraw', jurisdiction: 'US' });

      const e1Records = framework.listAuditRecords({ entityId: 'e1' });
      expect(e1Records).toHaveLength(2);

      const depositRecords = framework.listAuditRecords({ eventType: 'vault_deposit' });
      expect(depositRecords).toHaveLength(1);
    });

    it('should add compliance flags', () => {
      const record = framework.createAuditRecord({
        eventType: 'compliance_check',
        entityId: 'entity-001',
        entityType: 'hedge_fund',
        actorId: 'compliance-system',
        actorType: 'automated',
        action: 'check_compliance',
        jurisdiction: 'KY',
      });

      const flagged = framework.addComplianceFlag(record.id, 'SUSPICIOUS_ACTIVITY');
      expect(flagged.complianceFlags).toContain('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('audit dashboards', () => {
    it('should create an audit dashboard', () => {
      // Create some records first
      framework.createAuditRecord({ eventType: 'vault_deposit', entityId: 'e1', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'deposit', jurisdiction: 'US' });
      framework.createAuditRecord({ eventType: 'vault_withdrawal', entityId: 'e1', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'withdraw', jurisdiction: 'US' });

      const dashboard = framework.createAuditDashboard({
        name: 'Q1 2026 Dashboard',
        entityId: 'e1',
        reportingPeriodStart: new Date('2026-01-01'),
        reportingPeriodEnd: new Date('2026-03-31'),
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.entityId).toBe('e1');
      expect(dashboard.totalEvents).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.generatedAt).toBeInstanceOf(Date);
    });

    it('should refresh a dashboard', () => {
      const dashboard = framework.createAuditDashboard({
        name: 'Test Dashboard',
        entityId: 'entity-refresh',
        reportingPeriodStart: new Date('2026-01-01'),
        reportingPeriodEnd: new Date('2026-12-31'),
      });

      // Add a record after dashboard creation
      framework.createAuditRecord({ eventType: 'vault_deposit', entityId: 'entity-refresh', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'deposit', jurisdiction: 'US' });

      const refreshed = framework.refreshDashboard(dashboard.id);
      expect(refreshed.id).toBe(dashboard.id);
    });
  });

  describe('real-time reports', () => {
    it('should generate a real-time report', () => {
      const report = framework.generateRealTimeReport({
        reportType: 'compliance_summary',
        entityId: 'entity-001',
        includeAlerts: true,
      });

      expect(report.id).toBeDefined();
      expect(report.reportType).toBe('compliance_summary');
      expect(report.entityId).toBe('entity-001');
      expect(report.metrics).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.validUntil).toBeInstanceOf(Date);
    });
  });

  describe('compliance monitoring', () => {
    it('should get compliance score', () => {
      framework.createAuditRecord({ eventType: 'vault_deposit', entityId: 'entity-score', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'deposit', jurisdiction: 'US' });

      const score = framework.getComplianceScore('entity-score');
      expect(score.entityId).toBe('entity-score');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
    });

    it('should get audit summary', () => {
      framework.createAuditRecord({ eventType: 'vault_deposit', entityId: 'entity-summary', entityType: 'swf', actorId: 'a1', actorType: 'system', action: 'deposit', jurisdiction: 'US' });

      const summary = framework.getAuditSummary('entity-summary');
      expect(summary.entityId).toBe('entity-summary');
      expect(summary.totalEvents).toBe(1);
      expect(summary.generatedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Capital Adequacy & Reserve Model Tests
// ============================================================================

describe('CapitalAdequacyAndReserveModel', () => {
  let model: ReturnType<typeof createCapitalAdequacyAndReserveModel>;

  beforeEach(() => {
    model = createCapitalAdequacyAndReserveModel();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(model.config).toBeDefined();
      expect(model.config.minimumCARPercent).toBe(8.0);
      expect(model.config.enableCapitalAdequacyModeling).toBe(true);
      expect(model.config.enableStressTests).toBe(true);
    });
  });

  describe('capital adequacy models', () => {
    it('should create a capital adequacy model', () => {
      const capitalModel = model.createCapitalModel({
        entityId: 'bank-001',
        entityName: 'JPMorgan Chase',
        modelType: 'basel3',
        totalCapitalUSD: 200_000_000_000,
        tier1CapitalUSD: 160_000_000_000,
        tier2CapitalUSD: 40_000_000_000,
        riskWeightedAssetsUSD: 1_500_000_000_000,
        liquidityCoverageRatio: 130,
        netStableFundingRatio: 120,
      });

      expect(capitalModel.id).toBeDefined();
      expect(capitalModel.entityName).toBe('JPMorgan Chase');
      expect(capitalModel.capitalAdequacyRatio).toBeCloseTo(200 / 1500 * 100, 1);
      expect(capitalModel.status).toBe('compliant');
      expect(capitalModel.calculatedAt).toBeInstanceOf(Date);
    });

    it('should detect capital adequacy breach', () => {
      const capitalModel = model.createCapitalModel({
        entityId: 'bank-weak',
        entityName: 'Weak Bank',
        modelType: 'basel3',
        totalCapitalUSD: 5_000_000_000, // Very low
        tier1CapitalUSD: 4_000_000_000,
        tier2CapitalUSD: 1_000_000_000,
        riskWeightedAssetsUSD: 100_000_000_000, // CAR = 5% < 8% minimum
        liquidityCoverageRatio: 80,
        netStableFundingRatio: 90,
      });

      expect(capitalModel.status).toBe('breach');
      expect(capitalModel.capitalAdequacyRatio).toBeLessThan(8);
    });

    it('should retrieve model by entity', () => {
      model.createCapitalModel({
        entityId: 'entity-cap', entityName: 'Test Entity', modelType: 'sovereign_grade',
        totalCapitalUSD: 100e9, tier1CapitalUSD: 80e9, tier2CapitalUSD: 20e9,
        riskWeightedAssetsUSD: 500e9, liquidityCoverageRatio: 150, netStableFundingRatio: 130,
      });

      const found = model.getCapitalModelByEntity('entity-cap');
      expect(found).toBeDefined();
      expect(found!.entityId).toBe('entity-cap');
    });

    it('should list models with filters', () => {
      model.createCapitalModel({ entityId: 'e1', entityName: 'Bank A', modelType: 'basel3', totalCapitalUSD: 100e9, tier1CapitalUSD: 80e9, tier2CapitalUSD: 20e9, riskWeightedAssetsUSD: 500e9, liquidityCoverageRatio: 150, netStableFundingRatio: 130 });
      model.createCapitalModel({ entityId: 'e2', entityName: 'SWF A', modelType: 'sovereign_grade', totalCapitalUSD: 200e9, tier1CapitalUSD: 160e9, tier2CapitalUSD: 40e9, riskWeightedAssetsUSD: 1000e9, liquidityCoverageRatio: 200, netStableFundingRatio: 150 });

      const all = model.listCapitalModels();
      expect(all).toHaveLength(2);

      const compliant = model.listCapitalModels({ status: 'compliant' });
      expect(compliant.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('reserve requirements', () => {
    it('should set a reserve requirement', () => {
      const req = model.setReserveRequirement({
        entityId: 'entity-001',
        requirementType: 'liquidity_buffer',
        minimumRatioPercent: 10,
        minimumAmountUSD: 1_000_000_000,
        assetClasses: ['sovereign_bond', 'cash_equivalent'],
      });

      expect(req.id).toBeDefined();
      expect(req.minimumAmountUSD).toBe(1_000_000_000);
      expect(req.isBreached).toBe(false);
    });

    it('should detect reserve breach', () => {
      const req = model.setReserveRequirement({
        entityId: 'entity-002',
        requirementType: 'capital_buffer',
        minimumRatioPercent: 15,
        minimumAmountUSD: 500_000_000,
        assetClasses: ['sovereign_bond'],
      });

      const checked = model.checkReserveRequirement(req.id, 100_000_000); // Below minimum
      expect(checked.isBreached).toBe(true);
      expect(checked.breachSeverity).toBeDefined();
      expect(checked.currentAmountUSD).toBe(100_000_000);
    });

    it('should not breach when above minimum', () => {
      const req = model.setReserveRequirement({
        entityId: 'entity-003',
        requirementType: 'reserve_ratio',
        minimumRatioPercent: 10,
        minimumAmountUSD: 200_000_000,
        assetClasses: ['stablecoin'],
      });

      const checked = model.checkReserveRequirement(req.id, 300_000_000); // Above minimum
      expect(checked.isBreached).toBe(false);
    });
  });

  describe('liquidity buffers', () => {
    it('should create a liquidity buffer', () => {
      const buffer = model.createLiquidityBuffer({
        entityId: 'entity-001',
        bufferSizeUSD: 500_000_000,
      });

      expect(buffer.id).toBeDefined();
      expect(buffer.bufferSizeUSD).toBe(500_000_000);
      expect(buffer.utilizationRate).toBe(0);
    });

    it('should add assets to buffer', () => {
      const buffer = model.createLiquidityBuffer({
        entityId: 'entity-buf',
        bufferSizeUSD: 0,
      });

      model.addBufferAsset(buffer.id, {
        assetId: 'tbill-001',
        assetName: 'US Treasury Bill',
        assetClass: 'sovereign_bond',
        amount: 1000,
        usdValue: 1_000_000,
        haircut: 0.02,
        liquidityScore: 95,
      });

      const updated = model.getLiquidityBuffer(buffer.id)!;
      expect(updated.highQualityLiquidAssets).toHaveLength(1);
      expect(updated.bufferSizeUSD).toBe(1_000_000);
    });

    it('should run stress test', () => {
      const buffer = model.createLiquidityBuffer({
        entityId: 'entity-stress',
        bufferSizeUSD: 100_000_000,
      });

      model.addBufferAsset(buffer.id, {
        assetId: 'bond-001', assetName: 'Sovereign Bond', assetClass: 'sovereign_bond',
        amount: 1000, usdValue: 100_000_000, haircut: 0.05, liquidityScore: 90,
      });

      const result = model.runStressTest(buffer.id, 'Market Crash', 20);
      expect(result.scenario).toBe('Market Crash');
      expect(result.stressedValueUSD).toBeGreaterThan(0);
      expect(result.survivalDays).toBeGreaterThanOrEqual(0);
      expect(result.simulatedAt).toBeInstanceOf(Date);
    });

    it('should retrieve buffer by entity', () => {
      model.createLiquidityBuffer({ entityId: 'entity-find', bufferSizeUSD: 100e6 });

      const found = model.getLiquidityBufferByEntity('entity-find');
      expect(found).toBeDefined();
      expect(found!.entityId).toBe('entity-find');
    });
  });

  describe('breach monitoring', () => {
    it('should track and return breaches', () => {
      // Create a model with a breach
      model.createCapitalModel({
        entityId: 'breach-entity',
        entityName: 'Breaching Bank',
        modelType: 'basel3',
        totalCapitalUSD: 3e9,
        tier1CapitalUSD: 2.5e9,
        tier2CapitalUSD: 0.5e9,
        riskWeightedAssetsUSD: 100e9, // CAR = 3% < 8%
        liquidityCoverageRatio: 50,
        netStableFundingRatio: 70,
      });

      const breaches = model.getBreaches();
      const entityBreaches = breaches.filter(b => b.entityId === 'breach-entity');
      expect(entityBreaches.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Sovereign Participation Manager Tests
// ============================================================================

describe('SovereignParticipationManager', () => {
  let manager: ReturnType<typeof createSovereignParticipationManager>;

  beforeEach(() => {
    manager = createSovereignParticipationManager();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(manager.config).toBeDefined();
      expect(manager.config.enableObserverMode).toBe(true);
      expect(manager.config.enableAllocatorMode).toBe(true);
      expect(manager.config.enableStrategicPartnerMode).toBe(true);
    });
  });

  describe('participant registration', () => {
    it('should register an observer participant', () => {
      const profile = manager.registerParticipant({
        entityId: 'regulator-001',
        entityName: 'SEC',
        entityType: 'national_regulator',
        participationMode: 'observer',
      });

      expect(profile.id).toBeDefined();
      expect(profile.entityName).toBe('SEC');
      expect(profile.participationMode).toBe('observer');
      expect(profile.status).toBe('active');
      expect(profile.privileges.length).toBeGreaterThan(0);
      expect(profile.governanceRights.canVote).toBe(false);
    });

    it('should register an allocator participant', () => {
      const profile = manager.registerParticipant({
        entityId: 'swf-001',
        entityName: 'Norway Oil Fund',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'allocator',
      });

      expect(profile.participationMode).toBe('allocator');
      expect(profile.governanceRights.canVote).toBe(true);
      expect(profile.governanceRights.votingWeight).toBe(5);
    });

    it('should register a strategic partner', () => {
      const profile = manager.registerParticipant({
        entityId: 'sovereign-001',
        entityName: 'NBIM',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'strategic_partner',
      });

      expect(profile.participationMode).toBe('strategic_partner');
      expect(profile.governanceRights.canVote).toBe(true);
      expect(profile.governanceRights.votingWeight).toBe(20);
      expect(profile.governanceRights.canPropose).toBe(true);
    });

    it('should register a regulatory node', () => {
      const profile = manager.registerParticipant({
        entityId: 'fca-001',
        entityName: 'FCA',
        entityType: 'national_regulator',
        participationMode: 'regulatory_node',
      });

      expect(profile.participationMode).toBe('regulatory_node');
      expect(profile.governanceRights.canVeto).toBe(true);
    });

    it('should register a custodian partner', () => {
      const profile = manager.registerParticipant({
        entityId: 'custodian-001',
        entityName: 'State Street',
        entityType: 'institutional_custodian',
        participationMode: 'custodian_partner',
      });

      expect(profile.participationMode).toBe('custodian_partner');
    });

    it('should fail when mode is disabled', () => {
      const restrictedManager = createSovereignParticipationManager({
        enableObserverMode: false,
      });

      expect(() => restrictedManager.registerParticipant({
        entityId: 'e1',
        entityName: 'Test',
        entityType: 'national_regulator',
        participationMode: 'observer',
      })).toThrow(/observer/i);
    });
  });

  describe('participant management', () => {
    it('should list participants with filters', () => {
      manager.registerParticipant({ entityId: 'e1', entityName: 'SWF A', entityType: 'sovereign_wealth_fund', participationMode: 'strategic_partner' });
      manager.registerParticipant({ entityId: 'e2', entityName: 'Regulator B', entityType: 'national_regulator', participationMode: 'observer' });
      manager.registerParticipant({ entityId: 'e3', entityName: 'SWF C', entityType: 'sovereign_wealth_fund', participationMode: 'allocator' });

      const all = manager.listParticipants();
      expect(all).toHaveLength(3);

      const swfs = manager.listParticipants({ entityType: 'sovereign_wealth_fund' });
      expect(swfs).toHaveLength(2);

      const observers = manager.listParticipants({ participationMode: 'observer' });
      expect(observers).toHaveLength(1);
    });

    it('should upgrade participation mode', () => {
      const profile = manager.registerParticipant({
        entityId: 'upgrade-entity',
        entityName: 'Upgrading Fund',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'observer',
      });

      const upgraded = manager.upgradeParticipationMode(profile.id, 'allocator', 'Passed due diligence');
      expect(upgraded.participationMode).toBe('allocator');
      expect(upgraded.governanceRights.canVote).toBe(true);
    });

    it('should suspend and terminate participants', () => {
      const profile = manager.registerParticipant({
        entityId: 'to-suspend',
        entityName: 'Problem Fund',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'observer',
      });

      const suspended = manager.suspendParticipant(profile.id, 'Compliance issue');
      expect(suspended.status).toBe('suspended');

      const terminated = manager.terminateParticipant(profile.id, 'Final decision');
      expect(terminated.status).toBe('terminated');
    });
  });

  describe('privileges and restrictions', () => {
    it('should add and revoke privileges', () => {
      const profile = manager.registerParticipant({
        entityId: 'priv-entity',
        entityName: 'Test Entity',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'observer',
      });

      manager.addPrivilege(profile.id, {
        privilegeType: 'audit',
        scope: ['extended_reports'],
      });

      const updated = manager.getParticipant(profile.id)!;
      const auditPrivileges = updated.privileges.filter(p => p.privilegeType === 'audit');
      expect(auditPrivileges.length).toBeGreaterThan(0);

      manager.revokePrivilege(profile.id, 'audit');
      const afterRevoke = manager.getParticipant(profile.id)!;
      expect(afterRevoke.privileges.filter(p => p.privilegeType === 'audit')).toHaveLength(0);
    });

    it('should add and remove restrictions', () => {
      const profile = manager.registerParticipant({
        entityId: 'restrict-entity',
        entityName: 'Restricted Fund',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'allocator',
      });

      manager.addRestriction(profile.id, {
        restrictionType: 'position_limit',
        description: 'Max position $100M',
        value: 100_000_000,
        currency: 'USD',
        enforced: true,
      });

      const withRestriction = manager.getParticipant(profile.id)!;
      expect(withRestriction.restrictions).toHaveLength(1);

      manager.removeRestriction(profile.id, 'position_limit');
      const afterRemoval = manager.getParticipant(profile.id)!;
      expect(afterRemoval.restrictions).toHaveLength(0);
    });
  });

  describe('allocations', () => {
    it('should set and update allocations', () => {
      const profile = manager.registerParticipant({
        entityId: 'alloc-entity',
        entityName: 'Allocating Fund',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'allocator',
      });

      manager.setAllocation(profile.id, {
        assetClass: 'fixed_income',
        targetPercent: 40,
        currentPercent: 35,
        minimumPercent: 30,
        maximumPercent: 60,
        currentValueUSD: 100_000_000,
      });

      const updated = manager.getParticipant(profile.id)!;
      expect(updated.allocations).toHaveLength(1);
      expect(updated.allocations[0].assetClass).toBe('fixed_income');

      manager.updateAllocation(profile.id, 'fixed_income', { currentPercent: 42 });
      const afterUpdate = manager.getParticipant(profile.id)!;
      expect(afterUpdate.allocations[0].currentPercent).toBe(42);
    });
  });

  describe('participation summary', () => {
    it('should generate participation summary', () => {
      manager.registerParticipant({ entityId: 'e1', entityName: 'Observer', entityType: 'national_regulator', participationMode: 'observer' });
      manager.registerParticipant({ entityId: 'e2', entityName: 'Allocator', entityType: 'sovereign_wealth_fund', participationMode: 'allocator' });
      manager.registerParticipant({ entityId: 'e3', entityName: 'Partner', entityType: 'sovereign_wealth_fund', participationMode: 'strategic_partner' });

      const summary = manager.getParticipationSummary();
      expect(summary.totalParticipants).toBe(3);
      expect(summary.byMode.observer).toBe(1);
      expect(summary.byMode.allocator).toBe(1);
      expect(summary.byMode.strategic_partner).toBe(1);
      expect(summary.activeParticipants).toBe(3);
      expect(summary.totalVotingWeight).toBe(25); // 0 + 5 + 20
    });
  });
});

// ============================================================================
// Unified SGIA Manager Tests
// ============================================================================

describe('SGIAManager', () => {
  let sgia: ReturnType<typeof createSGIAManager>;

  beforeEach(() => {
    sgia = createSGIAManager();
  });

  describe('initialization', () => {
    it('should initialize with all sub-managers', () => {
      expect(sgia.sovereignIntegration).toBeDefined();
      expect(sgia.regulatoryCompatibility).toBeDefined();
      expect(sgia.custodyAlignment).toBeDefined();
      expect(sgia.transparencyAudit).toBeDefined();
      expect(sgia.capitalAdequacy).toBeDefined();
      expect(sgia.sovereignParticipation).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const custom = createSGIAManager({
        sovereignIntegration: { minimumMultiSigSignatures: 4 },
        capitalAdequacy: { minimumCARPercent: 10 },
      });

      expect(custom.sovereignIntegration.config.minimumMultiSigSignatures).toBe(4);
      expect(custom.capitalAdequacy.config.minimumCARPercent).toBe(10);
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all sub-managers', () => {
      const events: unknown[] = [];
      sgia.onEvent(e => events.push(e));

      // Trigger events from different sub-managers
      sgia.sovereignIntegration.createVault({
        name: 'Event Vault', vaultType: 'institutional_vault', fundClass: 'permissioned_institutional',
        ownerEntityId: 'e1', jurisdictions: ['US'],
      });

      sgia.regulatoryCompatibility.registerKycModule({
        name: 'US KYC', jurisdiction: 'US', kycTier: 'enhanced', supportedEntityTypes: ['tier1_bank'],
      });

      sgia.sovereignParticipation.registerParticipant({
        entityId: 'event-entity', entityName: 'Event Entity', entityType: 'sovereign_wealth_fund',
        participationMode: 'observer',
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('system status', () => {
    it('should return empty system status initially', () => {
      const status = sgia.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.activeVaults).toBe(0);
      expect(status.activeKycModules).toBe(0);
      expect(status.totalCapitalModels).toBe(0);
      expect(status.activeParticipants).toBe(0);
      expect(status.generatedAt).toBeInstanceOf(Date);
    });

    it('should reflect real data in system status', () => {
      // Add vaults
      sgia.sovereignIntegration.createVault({
        name: 'Vault 1', vaultType: 'sovereign_vault', fundClass: 'sovereign_reserved',
        ownerEntityId: 'e1', jurisdictions: ['EU'],
      });
      sgia.sovereignIntegration.createVault({
        name: 'Vault 2', vaultType: 'institutional_vault', fundClass: 'permissioned_institutional',
        ownerEntityId: 'e2', jurisdictions: ['US'],
      });

      // Add KYC module
      sgia.regulatoryCompatibility.registerKycModule({
        name: 'EU KYC', jurisdiction: 'EU', kycTier: 'sovereign_grade', supportedEntityTypes: ['central_bank'],
      });

      // Add participants
      sgia.sovereignParticipation.registerParticipant({
        entityId: 'obs-1', entityName: 'Observer 1', entityType: 'national_regulator', participationMode: 'observer',
      });
      sgia.sovereignParticipation.registerParticipant({
        entityId: 'part-1', entityName: 'Partner 1', entityType: 'sovereign_wealth_fund', participationMode: 'strategic_partner',
      });

      const status = sgia.getSystemStatus();
      expect(status.activeVaults).toBe(2);
      expect(status.activeKycModules).toBe(1);
      expect(status.activeParticipants).toBe(2);
      expect(status.observerCount).toBe(1);
      expect(status.strategicPartnerCount).toBe(1);
    });
  });

  describe('full sovereign onboarding workflow', () => {
    it('should complete a full sovereign onboarding workflow', () => {
      // Step 1: Register KYC module for the entity's jurisdiction
      const kycModule = sgia.regulatoryCompatibility.registerKycModule({
        name: 'Norway KYC Module',
        jurisdiction: 'NO',
        kycTier: 'sovereign_grade',
        supportedEntityTypes: ['sovereign_wealth_fund'],
      });
      expect(kycModule.status).toBe('active');

      // Step 2: Register jurisdiction profile
      const jurisdictionProfile = sgia.regulatoryCompatibility.registerJurisdictionProfile({
        jurisdiction: 'NO',
        regulatoryFramework: 'Norwegian Financial Supervisory Authority (FSA)',
        complianceStatus: 'compliant',
        requiredKycTier: 'sovereign_grade',
        supportedFundClasses: ['sovereign_reserved', 'permissioned_institutional'],
      });
      expect(jurisdictionProfile.complianceStatus).toBe('compliant');

      // Step 3: Initiate KYC verification
      const kycRecord = sgia.regulatoryCompatibility.initiateKycVerification({
        entityId: 'nbim-001',
        entityType: 'sovereign_wealth_fund',
        jurisdiction: 'NO',
        requestedTier: 'sovereign_grade',
      });
      expect(kycRecord.status).toBe('in_progress');

      // Step 4: Advance and complete KYC
      sgia.regulatoryCompatibility.advanceKycStep(kycRecord.id, 'identity_verification', true);
      sgia.regulatoryCompatibility.advanceKycStep(kycRecord.id, 'sanctions_screening', true);
      const completedKyc = sgia.regulatoryCompatibility.completeKycVerification(kycRecord.id, 'sovereign_grade');
      expect(completedKyc.status).toBe('completed');
      expect(completedKyc.achievedTier).toBe('sovereign_grade');

      // Step 5: Register as Strategic Partner
      const participant = sgia.sovereignParticipation.registerParticipant({
        entityId: 'nbim-001',
        entityName: 'Norges Bank Investment Management',
        entityType: 'sovereign_wealth_fund',
        participationMode: 'strategic_partner',
      });
      expect(participant.status).toBe('active');
      expect(participant.governanceRights.canPropose).toBe(true);

      // Step 6: Create institutional vault
      const vault = sgia.sovereignIntegration.createVault({
        name: 'NBIM Digital Reserve Vault',
        vaultType: 'sovereign_vault',
        fundClass: 'sovereign_reserved',
        ownerEntityId: 'nbim-001',
        jurisdictions: ['NO'],
        minimumSignatures: 3,
      });
      expect(vault.status).toBe('active');
      expect(vault.minimumSignatures).toBe(3);

      // Step 7: Create capital adequacy model
      const capitalModel = sgia.capitalAdequacy.createCapitalModel({
        entityId: 'nbim-001',
        entityName: 'NBIM',
        modelType: 'sovereign_grade',
        totalCapitalUSD: 1_400_000_000_000,
        tier1CapitalUSD: 1_200_000_000_000,
        tier2CapitalUSD: 200_000_000_000,
        riskWeightedAssetsUSD: 5_000_000_000_000,
        liquidityCoverageRatio: 250,
        netStableFundingRatio: 200,
      });
      expect(capitalModel.status).toBe('compliant');
      expect(capitalModel.capitalAdequacyRatio).toBeGreaterThan(8);

      // Step 8: Create audit record for the onboarding
      const auditRecord = sgia.transparencyAudit.createAuditRecord({
        eventType: 'access_granted',
        entityId: 'nbim-001',
        entityType: 'sovereign_wealth_fund',
        actorId: 'system',
        actorType: 'protocol',
        action: 'sovereign_onboarding_complete',
        jurisdiction: 'NO',
        newState: { participantId: participant.id, vaultId: vault.id },
      });
      expect(auditRecord.id).toBeDefined();

      // Verify final status
      const status = sgia.getSystemStatus();
      expect(status.activeVaults).toBeGreaterThanOrEqual(1);
      expect(status.activeKycModules).toBeGreaterThanOrEqual(1);
      expect(status.activeParticipants).toBeGreaterThanOrEqual(1);
      expect(status.strategicPartnerCount).toBeGreaterThanOrEqual(1);
      expect(status.totalAuditRecords).toBeGreaterThanOrEqual(1);
    });
  });
});
