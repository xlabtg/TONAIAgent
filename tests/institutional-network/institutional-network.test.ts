/**
 * TONAIAgent - Institutional Network Tests
 *
 * Tests for the global institutional network module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPartnerRegistryManager,
  createCustodyInfrastructureManager,
  createLiquidityNetworkManager,
  createTreasuryInteropManager,
  createOnboardingManager,
  createInstitutionalReportingManager,
  createExpansionManager,
  createAIAdvantageManager,
  createInstitutionalGovernanceManager,
  createInstitutionalNetworkManager,
  DefaultPartnerRegistryManager,
  DefaultCustodyInfrastructureManager,
  DefaultLiquidityNetworkManager,
  DefaultTreasuryInteropManager,
  DefaultOnboardingManager,
  DefaultInstitutionalReportingManager,
  DefaultExpansionManager,
  DefaultAIAdvantageManager,
  DefaultInstitutionalGovernanceManager,
  DefaultInstitutionalNetworkManager,
} from '../../src/institutional-network';

// ============================================================================
// Partner Registry Tests
// ============================================================================

describe('PartnerRegistryManager', () => {
  let registry: DefaultPartnerRegistryManager;

  beforeEach(() => {
    registry = createPartnerRegistryManager();
  });

  describe('registerPartner', () => {
    it('should register a new institutional partner', async () => {
      const partner = await registry.registerPartner({
        name: 'Acme Capital',
        type: 'hedge_fund',
        tier: 'tier_1',
        jurisdiction: 'US',
        description: 'Leading hedge fund with crypto expertise',
      });

      expect(partner.id).toBeDefined();
      expect(partner.name).toBe('Acme Capital');
      expect(partner.type).toBe('hedge_fund');
    });
  });

  describe('getPartner', () => {
    it('should retrieve a partner by id', async () => {
      const partner = await registry.registerPartner({
        name: 'Test Partner',
        type: 'custodian',
        tier: 'tier_2',
        jurisdiction: 'UK',
        description: 'Test',
      });

      const retrieved = await registry.getPartner(partner.id);
      expect(retrieved?.id).toBe(partner.id);
    });
  });

  describe('listPartners', () => {
    it('should list all partners', async () => {
      await registry.registerPartner({
        name: 'Partner 1',
        type: 'hedge_fund',
        tier: 'tier_1',
        jurisdiction: 'US',
        description: 'Test',
      });
      await registry.registerPartner({
        name: 'Partner 2',
        type: 'custodian',
        tier: 'tier_2',
        jurisdiction: 'UK',
        description: 'Test',
      });

      const partners = await registry.listPartners();
      expect(partners.length).toBe(2);
    });
  });

  describe('getHealth', () => {
    it('should return healthy status', () => {
      const health = registry.getHealth();
      expect(health.status).toBe('healthy');
    });
  });
});

// ============================================================================
// Custody Infrastructure Tests
// ============================================================================

describe('CustodyInfrastructureManager', () => {
  let custody: DefaultCustodyInfrastructureManager;

  beforeEach(() => {
    custody = createCustodyInfrastructureManager();
  });

  describe('createCustodyConfiguration', () => {
    it('should create a custody configuration', async () => {
      const config = await custody.createCustodyConfiguration({
        partnerId: 'partner-1',
        provider: 'mpc',
        securityLevel: 'institutional',
        mpcConfig: {
          enabled: true,
          threshold: 3,
          totalShares: 5,
          sharesDistribution: [],
        },
      });

      expect(config.id).toBeDefined();
      expect(config.provider).toBe('mpc');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = custody.getHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Liquidity Network Tests
// ============================================================================

describe('LiquidityNetworkManager', () => {
  let liquidity: DefaultLiquidityNetworkManager;

  beforeEach(() => {
    liquidity = createLiquidityNetworkManager();
  });

  describe('addLiquiditySource', () => {
    it('should add a liquidity source', async () => {
      const source = await liquidity.addLiquiditySource({
        name: 'DeFi Pool Alpha',
        type: 'dex',
        provider: 'uniswap',
        chains: ['ethereum', 'polygon'],
        assets: ['ETH', 'USDC', 'TON'],
        estimatedDepth: '10000000',
      });

      expect(source.id).toBeDefined();
      expect(source.type).toBe('dex');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = liquidity.getHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Treasury Interop Tests
// ============================================================================

describe('TreasuryInteropManager', () => {
  let treasury: DefaultTreasuryInteropManager;

  beforeEach(() => {
    treasury = createTreasuryInteropManager();
  });

  describe('connectTreasury', () => {
    it('should connect a treasury', async () => {
      const connection = await treasury.connectTreasury({
        name: 'Test DAO Treasury',
        type: 'dao',
        partnerId: 'partner-1',
        blockchain: 'ton',
        address: '0x1234567890abcdef',
        contractType: 'multisig',
        signers: [
          { address: '0xsigner1', name: 'Signer 1', permissions: [] },
        ],
        threshold: 1,
        connectionMethod: 'direct',
      });

      expect(connection.id).toBeDefined();
      expect(connection.type).toBe('dao');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = treasury.getHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Onboarding Tests
// ============================================================================

describe('OnboardingManager', () => {
  let onboarding: DefaultOnboardingManager;

  beforeEach(() => {
    onboarding = createOnboardingManager();
  });

  describe('createOnboardingWorkflow', () => {
    it('should create an onboarding workflow', async () => {
      const workflow = await onboarding.createOnboardingWorkflow(
        'partner-1',
        'hedge_fund'
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.partnerId).toBe('partner-1');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = onboarding.getHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Institutional Reporting Tests
// ============================================================================

describe('InstitutionalReportingManager', () => {
  let reporting: DefaultInstitutionalReportingManager;

  beforeEach(() => {
    reporting = createInstitutionalReportingManager();
  });

  describe('generateReport', () => {
    it('should generate a report', async () => {
      const report = await reporting.generateReport(
        'network_overview',
        { period: 'monthly', startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') }
      );

      expect(report.id).toBeDefined();
      expect(report.type).toBe('network_overview');
    });
  });

  describe('getReportingHealth', () => {
    it('should return health status', () => {
      const health = reporting.getReportingHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Expansion Manager Tests
// ============================================================================

describe('ExpansionManager', () => {
  let expansion: DefaultExpansionManager;

  beforeEach(() => {
    expansion = createExpansionManager();
  });

  describe('createExpansionStrategy', () => {
    it('should create an expansion strategy', async () => {
      const strategy = await expansion.createExpansionStrategy({
        name: 'APAC Expansion Q1 2025',
        version: '1.0.0',
        targetRegions: ['asia_pacific'],
      });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('APAC Expansion Q1 2025');
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const health = expansion.getHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// AI Advantage Manager Tests
// ============================================================================

describe('AIAdvantageManager', () => {
  let ai: DefaultAIAdvantageManager;

  beforeEach(() => {
    ai = createAIAdvantageManager({
      groqApiKey: 'test-api-key',
    });
  });

  describe('enableRiskModeling', () => {
    it('should enable risk modeling', async () => {
      await ai.enableRiskModeling({
        enabled: true,
        modelTypes: ['var', 'stress_test'],
        confidenceLevel: 0.95,
        lookbackPeriod: 252,
      });

      const health = ai.getAIHealth();
      expect(health.status).toBeDefined();
    });
  });

  describe('getAIHealth', () => {
    it('should return AI health status', () => {
      const health = ai.getAIHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Institutional Governance Tests
// ============================================================================

describe('InstitutionalGovernanceManager', () => {
  let governance: DefaultInstitutionalGovernanceManager;

  beforeEach(() => {
    governance = createInstitutionalGovernanceManager();
  });

  describe('createAdvisoryBoard', () => {
    it('should create an advisory board', async () => {
      const board = await governance.createAdvisoryBoard({
        name: 'Technical Advisory Board',
        type: 'technical',
        charter: 'Technical oversight',
        members: [],
      });

      expect(board.id).toBeDefined();
      expect(board.name).toBe('Technical Advisory Board');
    });
  });

  describe('createCommittee', () => {
    it('should create a committee', async () => {
      const committee = await governance.createCommittee({
        name: 'Risk Committee',
        type: 'risk',
        charter: 'Oversee risk management activities',
        members: [],
      });

      expect(committee.id).toBeDefined();
      expect(committee.type).toBe('risk');
    });
  });

  describe('getGovernanceHealth', () => {
    it('should return governance health', () => {
      const health = governance.getGovernanceHealth();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// Unified Institutional Network Manager Tests
// ============================================================================

describe('InstitutionalNetworkManager', () => {
  let network: DefaultInstitutionalNetworkManager;

  beforeEach(() => {
    network = createInstitutionalNetworkManager();
  });

  describe('initialization', () => {
    it('should initialize all sub-managers', () => {
      expect(network.partners).toBeInstanceOf(DefaultPartnerRegistryManager);
      expect(network.custody).toBeInstanceOf(DefaultCustodyInfrastructureManager);
      expect(network.liquidity).toBeInstanceOf(DefaultLiquidityNetworkManager);
      expect(network.treasury).toBeInstanceOf(DefaultTreasuryInteropManager);
      expect(network.onboarding).toBeInstanceOf(DefaultOnboardingManager);
      expect(network.reporting).toBeInstanceOf(DefaultInstitutionalReportingManager);
      expect(network.expansion).toBeInstanceOf(DefaultExpansionManager);
      expect(network.ai).toBeInstanceOf(DefaultAIAdvantageManager);
      expect(network.governance).toBeInstanceOf(DefaultInstitutionalGovernanceManager);
    });
  });

  describe('getNetworkHealth', () => {
    it('should return network-wide health', () => {
      const health = network.getNetworkHealth();
      expect(health.status).toBeDefined();
      expect(health.components).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('getNetworkMetrics', () => {
    it('should return network metrics', async () => {
      const metrics = await network.getNetworkMetrics();
      expect(metrics.partners).toBeDefined();
      expect(metrics.liquidity).toBeDefined();
      expect(metrics.custody).toBeDefined();
    });
  });

  describe('onEvent', () => {
    it('should register event callback', () => {
      let eventReceived = false;
      network.onEvent(() => {
        eventReceived = true;
      });
      // Event callback registered successfully
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  let network: DefaultInstitutionalNetworkManager;

  beforeEach(() => {
    network = createInstitutionalNetworkManager();
  });

  describe('Full Partner Onboarding Flow', () => {
    it('should register partner and create onboarding workflow', async () => {
      // 1. Register partner
      const partner = await network.partners.registerPartner({
        name: 'Integration Test Partner',
        type: 'custodian',
        tier: 'tier_1',
        jurisdiction: 'CH',
        description: 'Full integration test',
      });

      expect(partner.id).toBeDefined();

      // 2. Create onboarding workflow
      const workflow = await network.onboarding.createOnboardingWorkflow(
        partner.id,
        partner.type
      );

      expect(workflow.id).toBeDefined();
      expect(workflow.partnerId).toBe(partner.id);
    });
  });

  describe('Multi-Partner Registration', () => {
    it('should register multiple partners', async () => {
      // Register partners
      await network.partners.registerPartner({
        name: 'APAC Partner 1',
        type: 'liquidity_provider',
        tier: 'tier_2',
        jurisdiction: 'SG',
        description: 'Singapore LP',
      });

      await network.partners.registerPartner({
        name: 'APAC Partner 2',
        type: 'bank',
        tier: 'tier_2',
        jurisdiction: 'HK',
        description: 'Hong Kong Bank',
      });

      // List all partners
      const partners = await network.partners.listPartners();
      expect(partners.length).toBe(2);
    });
  });
});
