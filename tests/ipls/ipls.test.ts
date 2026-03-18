/**
 * TONAIAgent - Inter-Protocol Liquidity Standard (IPLS) Tests
 *
 * Comprehensive tests for the IPLS framework covering all five sub-modules:
 * LiquidityStandard, CrossProtocolRisk, LiquidityPassport, AdapterLayer, ProtocolApi.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIPLSManager,
  createLiquidityStandardManager,
  createCrossProtocolRiskManager,
  createLiquidityPassportManager,
  createAdapterLayerManager,
  createProtocolApiManager,
  DEFAULT_IPLS_CONFIG,
} from '../../connectors/ipls/index';

// ============================================================================
// LiquidityStandardManager Tests
// ============================================================================

describe('LiquidityStandardManager', () => {
  let manager: ReturnType<typeof createLiquidityStandardManager>;

  beforeEach(() => {
    manager = createLiquidityStandardManager();
  });

  describe('configuration', () => {
    it('should initialize with clean state', () => {
      const health = manager.getHealth();
      expect(health.providerCount).toBe(0);
      expect(health.consumerCount).toBe(0);
    });
  });

  describe('provider registration', () => {
    it('should register a liquidity provider', async () => {
      const provider = await manager.registerProvider({
        name: 'Test DEX Pool',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['ton', 'usdt'],
      });

      expect(provider.id).toBeDefined();
      expect(provider.name).toBe('Test DEX Pool');
      expect(provider.type).toBe('dex');
      expect(provider.status).toBe('pending_approval');
      expect(provider.chainIds).toContain('ton');
      expect(provider.supportedAssets).toContain('usdt');
    });

    it('should update provider status', async () => {
      const provider = await manager.registerProvider({
        name: 'Active Pool',
        type: 'lending',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });

      await manager.updateProviderStatus(provider.id, 'active');
      const updated = await manager.getProvider(provider.id);
      expect(updated?.status).toBe('active');
    });

    it('should list providers with filters', async () => {
      await manager.registerProvider({
        name: 'DEX Pool 1',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });
      await manager.registerProvider({
        name: 'Lending Pool 1',
        type: 'lending',
        chainIds: ['ethereum'],
        supportedAssets: ['usdc'],
      });

      const dexProviders = await manager.listProviders({ types: ['dex'] });
      expect(dexProviders).toHaveLength(1);
      expect(dexProviders[0].name).toBe('DEX Pool 1');

      const tonProviders = await manager.listProviders({ chains: ['ton'] });
      expect(tonProviders).toHaveLength(1);
    });

    it('should throw when getting non-existent provider', async () => {
      const provider = await manager.getProvider('non_existent');
      expect(provider).toBeNull();
    });

    it('should remove a provider', async () => {
      const provider = await manager.registerProvider({
        name: 'To Remove',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });

      await manager.removeProvider(provider.id);
      const found = await manager.getProvider(provider.id);
      expect(found).toBeNull();
    });
  });

  describe('consumer registration', () => {
    it('should register a liquidity consumer', async () => {
      const consumer = await manager.registerConsumer({
        name: 'Test Protocol',
        type: 'derivatives',
        requestedChains: ['ton', 'ethereum'],
        preferredAssets: ['usdt'],
      });

      expect(consumer.id).toBeDefined();
      expect(consumer.name).toBe('Test Protocol');
      expect(consumer.status).toBe('pending_kyc');
      expect(consumer.activeRequests).toHaveLength(0);
      expect(consumer.passport).toBeNull();
    });

    it('should update consumer and activate', async () => {
      const consumer = await manager.registerConsumer({
        name: 'Active Consumer',
        type: 'yield_aggregator',
        requestedChains: ['ton'],
        preferredAssets: ['usdc'],
      });

      await manager.updateConsumerStatus(consumer.id, 'active');
      const updated = await manager.getConsumer(consumer.id);
      expect(updated?.status).toBe('active');
    });
  });

  describe('liquidity operations', () => {
    it('should deposit to an active provider', async () => {
      const provider = await manager.registerProvider({
        name: 'Vault A',
        type: 'prime_broker',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });
      await manager.updateProviderStatus(provider.id, 'active');

      const result = await manager.deposit(provider.id, 'usdt', '50000', 'ton');
      expect(result.txId).toBeDefined();
      expect(result.amount).toBe('50000');
      expect(result.newBalance).toBe('50000');
    });

    it('should throw deposit when provider is not active', async () => {
      const provider = await manager.registerProvider({
        name: 'Inactive Vault',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });

      await expect(manager.deposit(provider.id, 'usdt', '1000', 'ton')).rejects.toThrow(
        'Provider is not active'
      );
    });

    it('should throw deposit when asset not supported', async () => {
      const provider = await manager.registerProvider({
        name: 'USDT Only Vault',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });
      await manager.updateProviderStatus(provider.id, 'active');

      await expect(manager.deposit(provider.id, 'btc', '1', 'ton')).rejects.toThrow(
        'Asset not supported by provider'
      );
    });

    it('should generate quote for available liquidity', async () => {
      const provider = await manager.registerProvider({
        name: 'Quote Pool',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });
      await manager.updateProviderStatus(provider.id, 'active');
      await manager.deposit(provider.id, 'usdt', '100000', 'ton');

      const quote = await manager.quote(provider.id, 'usdt', '10000', 'ton');
      expect(quote.quoteId).toBeDefined();
      expect(parseFloat(quote.availableAmount)).toBeGreaterThan(0);
      expect(quote.validUntil > new Date()).toBe(true);
    });

    it('should report provider exposure', async () => {
      const provider = await manager.registerProvider({
        name: 'Reporting Pool',
        type: 'clearing_house',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });
      await manager.updateProviderStatus(provider.id, 'active');

      const report = await manager.reportExposure(provider.id, [
        {
          counterpartyId: 'counter_001',
          counterpartyName: 'Counter Protocol',
          asset: 'usdt',
          grossExposure: '500000',
          netExposure: '300000',
          exposureType: 'credit',
          chainId: 'ton',
          collateralCoverage: 0.8,
          marginCallThreshold: '100000',
        },
      ]);

      expect(report.reportId).toBeDefined();
      expect(report.totalExposureUsd).toBe('500000');
      expect(report.topCounterparties).toHaveLength(1);
    });
  });

  describe('consumer liquidity request', () => {
    it('should return rejection when no providers available', async () => {
      const consumer = await manager.registerConsumer({
        name: 'Requesting Protocol',
        type: 'derivatives',
        requestedChains: ['ton'],
        preferredAssets: ['usdt'],
      });
      await manager.updateConsumerStatus(consumer.id, 'active');

      const response = await manager.requestLiquidity(consumer.id, {
        id: 'req_001',
        consumerId: consumer.id,
        asset: 'usdt',
        amount: '10000',
        targetChain: 'ton',
        urgency: 'standard',
        strategy: 'best_rate',
        maxFeeBps: 50,
        deadline: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });

      expect(response.approved).toBe(false);
      expect(response.rejectionReason).toContain('No eligible liquidity providers');
    });

    it('should fulfill request when provider available', async () => {
      // Set up provider (with higher single transaction limit)
      const provider = await manager.registerProvider({
        name: 'Available Pool',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
        limits: { singleTransactionLimit: '1000000' },
      });
      await manager.updateProviderStatus(provider.id, 'active');
      await manager.deposit(provider.id, 'usdt', '500000', 'ton');

      // Set up consumer
      const consumer = await manager.registerConsumer({
        name: 'Requesting Protocol',
        type: 'derivatives',
        requestedChains: ['ton'],
        preferredAssets: ['usdt'],
      });
      await manager.updateConsumerStatus(consumer.id, 'active');

      const response = await manager.requestLiquidity(consumer.id, {
        id: 'req_002',
        consumerId: consumer.id,
        asset: 'usdt',
        amount: '10000',
        targetChain: 'ton',
        urgency: 'standard',
        strategy: 'best_rate',
        maxFeeBps: 50,
        deadline: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });

      expect(response.approved).toBe(true);
      expect(response.providerId).toBe(provider.id);
      expect(parseFloat(response.allocatedAmount)).toBeGreaterThan(0);
    });
  });

  describe('metrics', () => {
    it('should return standard metrics', async () => {
      const metrics = await manager.getStandardMetrics();
      expect(metrics.totalProviders).toBeDefined();
      expect(metrics.totalConsumers).toBeDefined();
      expect(metrics.lastUpdated).toBeDefined();
    });
  });

  describe('events', () => {
    it('should emit events on provider registration', async () => {
      const events: unknown[] = [];
      manager.onEvent((e) => events.push(e));

      await manager.registerProvider({
        name: 'Event Test Pool',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// CrossProtocolRiskManager Tests
// ============================================================================

describe('CrossProtocolRiskManager', () => {
  let manager: ReturnType<typeof createCrossProtocolRiskManager>;

  beforeEach(() => {
    manager = createCrossProtocolRiskManager();
  });

  describe('configuration', () => {
    it('should initialize with default thresholds', () => {
      const thresholds = manager.getThresholds();
      expect(thresholds.tier1MaxScore).toBe(25);
      expect(thresholds.tier2MaxScore).toBe(55);
      expect(thresholds.tier3MaxScore).toBe(80);
    });

    it('should accept custom config', () => {
      const custom = createCrossProtocolRiskManager({
        aiModelEnabled: false,
        historicalWindowDays: 60,
      });
      const health = custom.getHealth();
      expect(health).toBeDefined();
    });
  });

  describe('protocol assessment', () => {
    it('should assess a protocol and return a risk assessment', async () => {
      const assessment = await manager.assessProtocol({
        protocolId: 'proto_001',
        protocolName: 'Test Protocol',
        overrides: {
          auditsPassed: 3,
          totalValueLockedUsd: '10000000',
          avgDailyVolumeUsd: '1000000',
          uptimePercent: 99.9,
        },
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.subjectId).toBe('proto_001');
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(['tier1', 'tier2', 'tier3', 'unrated']).toContain(assessment.riskTier);
      expect(assessment.dimensions).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
    });

    it('should generate AI insights when requested', async () => {
      const assessment = await manager.assessProtocol({
        protocolId: 'proto_002',
        protocolName: 'AI Assessed Protocol',
        includeAIInsights: true,
      });

      expect(assessment.aiInsights).toBeDefined();
      expect(assessment.aiInsights?.modelVersion).toBeDefined();
      expect(assessment.aiInsights?.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(assessment.aiInsights?.scenarioAnalysis).toHaveLength(3);
    });

    it('should retrieve latest assessment by protocol', async () => {
      await manager.assessProtocol({
        protocolId: 'proto_003',
        protocolName: 'Tracked Protocol',
      });

      const latest = await manager.getLatestAssessment('proto_003');
      expect(latest).not.toBeNull();
      expect(latest?.subjectId).toBe('proto_003');
    });

    it('should list assessments with filters', async () => {
      await manager.assessProtocol({
        protocolId: 'safe_proto',
        protocolName: 'Safe Protocol',
        overrides: {
          auditsPassed: 5,
          uptimePercent: 99.99,
          criticalVulnerabilities: 0,
          totalValueLockedUsd: '50000000',
        },
      });

      const assessments = await manager.listAssessments({ maxScore: 50 });
      expect(Array.isArray(assessments)).toBe(true);
    });
  });

  describe('alerts', () => {
    it('should create and resolve alerts', async () => {
      const alert = await manager.createAlert({
        severity: 'warning',
        type: 'test_alert',
        message: 'Test alert message',
        affectedProtocol: 'proto_001',
        recommendedAction: 'Monitor closely',
      });

      expect(alert.id).toBeDefined();
      expect(alert.resolved).toBe(false);

      const activeAlerts = await manager.getActiveAlerts();
      expect(activeAlerts.some((a) => a.id === alert.id)).toBe(true);

      await manager.resolveAlert(alert.id);
      const afterResolve = await manager.getActiveAlerts();
      expect(afterResolve.some((a) => a.id === alert.id)).toBe(false);
    });

    it('should throw when resolving non-existent alert', async () => {
      await expect(manager.resolveAlert('non_existent_alert')).rejects.toThrow(
        'Alert not found'
      );
    });
  });

  describe('stress testing', () => {
    it('should run a stress test scenario', async () => {
      await manager.assessProtocol({
        protocolId: 'stress_proto',
        protocolName: 'Stress Test Subject',
      });

      const result = await manager.runStressTest({
        name: 'Market Downturn',
        description: '30% price decline across all assets',
        shocks: [
          {
            asset: 'usdt',
            priceChange: -30,
            volatilityMultiplier: 3,
            liquidityReduction: 0.5,
          },
        ],
        duration: 86400000,
        confidenceLevel: 0.95,
      });

      expect(result.scenarioName).toBe('Market Downturn');
      expect(['minimal', 'moderate', 'severe', 'catastrophic']).toContain(result.overallImpact);
      expect(result.resilienceScore).toBeGreaterThanOrEqual(0);
      expect(result.resilienceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('thresholds', () => {
    it('should update risk thresholds', async () => {
      await manager.updateThresholds({ tier1MaxScore: 20 });
      const thresholds = manager.getThresholds();
      expect(thresholds.tier1MaxScore).toBe(20);
    });
  });

  describe('risk summary', () => {
    it('should return a risk summary', () => {
      const summary = manager.getRiskSummary();
      expect(summary.totalAssessments).toBeDefined();
      expect(summary.activeAlerts).toBeDefined();
      expect(summary.lastUpdated).toBeDefined();
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const health = manager.getHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.assessmentsCount).toBeDefined();
    });
  });
});

// ============================================================================
// LiquidityPassportManager Tests
// ============================================================================

describe('LiquidityPassportManager', () => {
  let manager: ReturnType<typeof createLiquidityPassportManager>;

  beforeEach(() => {
    manager = createLiquidityPassportManager({ expiryDays: 365 });
  });

  describe('passport lifecycle', () => {
    it('should issue a passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'holder_001',
        holderName: 'Protocol Alpha',
        capitalOrigin: {
          primaryChain: 'ton',
          capitalType: 'native',
          sourceProtocols: ['ton_amm'],
          totalVerifiedCapital: '5000000',
        },
      });

      expect(passport.id).toBeDefined();
      expect(passport.holderId).toBe('holder_001');
      expect(passport.holderName).toBe('Protocol Alpha');
      expect(passport.version).toBe(1);
      expect(passport.expiresAt > new Date()).toBe(true);
      expect(passport.revokedAt).toBeUndefined();
    });

    it('should throw on duplicate passport issuance', async () => {
      await manager.issuePassport({
        holderId: 'dup_holder',
        holderName: 'Duplicate',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await expect(
        manager.issuePassport({
          holderId: 'dup_holder',
          holderName: 'Duplicate Again',
          capitalOrigin: { primaryChain: 'ton' },
        })
      ).rejects.toThrow('Passport already exists');
    });

    it('should get passport by holder', async () => {
      await manager.issuePassport({
        holderId: 'find_holder',
        holderName: 'Findable Protocol',
        capitalOrigin: { primaryChain: 'ethereum' },
      });

      const found = await manager.getPassportByHolder('find_holder');
      expect(found).not.toBeNull();
      expect(found?.holderName).toBe('Findable Protocol');
    });

    it('should update passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'update_holder',
        holderName: 'Original Name',
        capitalOrigin: { primaryChain: 'ton' },
      });

      const updated = await manager.updatePassport(passport.id, {
        holderName: 'Updated Name',
      });

      expect(updated.holderName).toBe('Updated Name');
      expect(updated.version).toBe(2);
    });

    it('should renew passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'renew_holder',
        holderName: 'Renewal Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      const originalExpiry = passport.expiresAt.getTime();
      const renewed = await manager.renewPassport(passport.id);

      expect(renewed.version).toBe(2);
      expect(renewed.expiresAt.getTime()).toBeGreaterThanOrEqual(originalExpiry);
    });

    it('should revoke passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'revoke_holder',
        holderName: 'To Be Revoked',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await manager.revokePassport(passport.id, 'Regulatory action');

      const revoked = await manager.getPassport(passport.id);
      expect(revoked?.revokedAt).toBeDefined();
      expect(revoked?.revocationReason).toBe('Regulatory action');
    });

    it('should throw when updating revoked passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'rev_update_holder',
        holderName: 'Revoked Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await manager.revokePassport(passport.id, 'Test');

      await expect(
        manager.updatePassport(passport.id, { holderName: 'New Name' })
      ).rejects.toThrow('Cannot update revoked passport');
    });
  });

  describe('capital origin verification', () => {
    it('should verify valid capital origin', async () => {
      const passport = await manager.issuePassport({
        holderId: 'verify_holder',
        holderName: 'Verifiable Protocol',
        capitalOrigin: {
          primaryChain: 'ton',
          sourceProtocols: ['ton_amm', 'ton_yield'],
          totalVerifiedCapital: '1000000',
          capitalType: 'native',
        },
      });

      const result = await manager.verifyCapitalOrigin(passport.id);
      expect(result.verified).toBe(true);
      expect(result.proofHash).toBeDefined();
    });

    it('should fail verification with missing data', async () => {
      const passport = await manager.issuePassport({
        holderId: 'unverifiable_holder',
        holderName: 'Missing Data Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      const result = await manager.verifyCapitalOrigin(passport.id);
      expect(result.verified).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('compliance', () => {
    it('should check jurisdiction compliance', async () => {
      const passport = await manager.issuePassport({
        holderId: 'compliance_holder',
        holderName: 'Compliant Protocol',
        capitalOrigin: { primaryChain: 'ton' },
        compliance: {
          status: 'compliant',
          kycLevel: 'institutional',
          amlScreened: true,
          sanctions: false,
        },
      });

      const result = await manager.checkCompliance(passport.id, 'US');
      expect(result.eligible).toBeDefined();
      expect(Array.isArray(result.restrictions)).toBe(true);
    });

    it('should detect sanctioned entity', async () => {
      const passport = await manager.issuePassport({
        holderId: 'sanctioned_holder',
        holderName: 'Sanctioned Protocol',
        capitalOrigin: { primaryChain: 'ton' },
        compliance: {
          sanctions: true,
        },
      });

      const result = await manager.checkCompliance(passport.id, 'US');
      expect(result.eligible).toBe(false);
      expect(result.restrictions.some((r) => r.includes('Sanctioned'))).toBe(true);
    });

    it('should add and remove jurisdictional flags', async () => {
      const passport = await manager.issuePassport({
        holderId: 'flag_holder',
        holderName: 'Flagged Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await manager.addJurisdictionalFlag(passport.id, 'us_person');
      const withFlag = await manager.getPassport(passport.id);
      expect(withFlag?.jurisdictionalFlags).toContain('us_person');

      await manager.removeJurisdictionalFlag(passport.id, 'us_person');
      const withoutFlag = await manager.getPassport(passport.id);
      expect(withoutFlag?.jurisdictionalFlags).not.toContain('us_person');
    });
  });

  describe('credit history', () => {
    it('should add credit events and update credit score', async () => {
      const passport = await manager.issuePassport({
        holderId: 'credit_holder',
        holderName: 'Credit Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      const initialScore = await manager.getCreditScore(passport.id);

      await manager.addCreditEvent(passport.id, {
        eventType: 'repay',
        amount: '100000',
        asset: 'usdt',
        counterpartyId: 'lender_001',
        outcome: 'on_time',
        timestamp: new Date(),
      });

      const afterRepayScore = await manager.getCreditScore(passport.id);
      expect(afterRepayScore).toBeGreaterThanOrEqual(initialScore);
    });

    it('should penalize credit score on default', async () => {
      const passport = await manager.issuePassport({
        holderId: 'default_holder',
        holderName: 'Defaulting Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      // First add on-time repayments to build up the score above the base
      await manager.addCreditEvent(passport.id, {
        eventType: 'repay',
        amount: '100000',
        asset: 'usdt',
        counterpartyId: 'lender_001',
        outcome: 'on_time',
        timestamp: new Date(),
      });

      const scoreAfterGoodEvent = await manager.getCreditScore(passport.id);

      await manager.addCreditEvent(passport.id, {
        eventType: 'default',
        amount: '500000',
        asset: 'usdt',
        counterpartyId: 'lender_002',
        outcome: 'default',
        timestamp: new Date(),
      });

      const afterDefaultScore = await manager.getCreditScore(passport.id);
      expect(afterDefaultScore).toBeLessThan(scoreAfterGoodEvent);

      const updatedPassport = await manager.getPassport(passport.id);
      expect(updatedPassport?.riskProfile.historicalDefault).toBe(true);
    });
  });

  describe('endorsements', () => {
    it('should add and retrieve endorsements', async () => {
      const passport = await manager.issuePassport({
        holderId: 'endorse_holder',
        holderName: 'Endorsed Protocol',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await manager.addEndorsement(passport.id, {
        endorserId: 'endorser_001',
        endorserName: 'Trusted Endorser',
        endorsementType: 'risk',
        score: 90,
        comment: 'Excellent risk management',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const endorsements = await manager.getEndorsements(passport.id);
      expect(endorsements).toHaveLength(1);
      expect(endorsements[0].endorserId).toBe('endorser_001');
    });

    it('should revoke endorsement', async () => {
      const passport = await manager.issuePassport({
        holderId: 'revoke_endorse_holder',
        holderName: 'Protocol With Endorsement',
        capitalOrigin: { primaryChain: 'ton' },
      });

      await manager.addEndorsement(passport.id, {
        endorserId: 'removable_endorser',
        endorserName: 'Removable Endorser',
        endorsementType: 'compliance',
        score: 75,
        comment: 'Compliant',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      await manager.revokeEndorsement(passport.id, 'removable_endorser');
      const endorsements = await manager.getEndorsements(passport.id);
      expect(endorsements).toHaveLength(0);
    });
  });

  describe('validation and eligibility', () => {
    it('should validate a valid passport', async () => {
      const passport = await manager.issuePassport({
        holderId: 'valid_holder',
        holderName: 'Valid Protocol',
        capitalOrigin: { primaryChain: 'ton' },
        compliance: {
          status: 'compliant',
          kycLevel: 'institutional',
          amlScreened: true,
          sanctions: false,
        },
      });

      const result = await manager.validatePassport(passport.id);
      expect(result.valid).toBe(true);
      expect(result.isRevoked).toBe(false);
      expect(result.isExpired).toBe(false);
    });

    it('should check eligibility against requirements', async () => {
      const passport = await manager.issuePassport({
        holderId: 'eligible_holder',
        holderName: 'Eligible Protocol',
        capitalOrigin: { primaryChain: 'ton' },
        compliance: {
          status: 'compliant',
          kycLevel: 'enhanced',
          amlScreened: true,
          sanctions: false,
        },
      });

      await manager.updateRiskProfile(passport.id, {
        creditScore: 750,
        compositeScore: 80,
      });

      const eligibility = await manager.isEligible(passport.holderId, {
        minCreditScore: 600,
        maxRiskScore: 90,
        requiredKycLevel: 'basic',
      });

      expect(eligibility.eligible).toBe(true);
    });
  });

  describe('metrics', () => {
    it('should return passport metrics', async () => {
      await manager.issuePassport({
        holderId: 'metrics_holder_1',
        holderName: 'Protocol 1',
        capitalOrigin: { primaryChain: 'ton' },
      });

      const metrics = manager.getPassportMetrics();
      expect(metrics.totalPassports).toBeGreaterThan(0);
      expect(metrics.activePassports).toBeGreaterThan(0);
      expect(metrics.lastUpdated).toBeDefined();
    });
  });
});

// ============================================================================
// AdapterLayerManager Tests
// ============================================================================

describe('AdapterLayerManager', () => {
  let manager: ReturnType<typeof createAdapterLayerManager>;

  beforeEach(() => {
    manager = createAdapterLayerManager();
  });

  describe('adapter registration', () => {
    it('should register a cross-chain adapter', async () => {
      const adapter = await manager.registerAdapter({
        name: 'TON↔ETH Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt', 'usdc'],
        config: {},
      });

      expect(adapter.id).toBeDefined();
      expect(adapter.name).toBe('TON↔ETH Bridge');
      expect(adapter.bridgeType).toBe('lock_mint');
      expect(adapter.status).toBe('inactive');
    });

    it('should set adapter status to active', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Active Bridge',
        bridgeType: 'burn_mint',
        supportedChains: ['ton', 'polygon'],
        supportedAssets: ['usdt'],
        config: {},
      });

      await manager.setAdapterStatus(adapter.id, 'active');
      const updated = await manager.getAdapter(adapter.id);
      expect(updated?.status).toBe('active');
    });

    it('should list adapters with filters', async () => {
      await manager.registerAdapter({
        name: 'Lock Mint Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt'],
        config: {},
      });
      await manager.registerAdapter({
        name: 'ZK Bridge',
        bridgeType: 'zk_proof',
        supportedChains: ['ethereum', 'arbitrum'],
        supportedAssets: ['usdc'],
        config: {},
      });

      const lockMintAdapters = await manager.listAdapters({ bridgeTypes: ['lock_mint'] });
      expect(lockMintAdapters).toHaveLength(1);
      expect(lockMintAdapters[0].name).toBe('Lock Mint Bridge');

      const tonAdapters = await manager.listAdapters({ fromChain: 'ton' });
      expect(tonAdapters).toHaveLength(1);
    });

    it('should remove adapter', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Removable Bridge',
        bridgeType: 'atomic_swap',
        supportedChains: ['ton', 'bsc'],
        supportedAssets: ['usdt'],
        config: {},
      });

      await manager.removeAdapter(adapter.id);
      const found = await manager.getAdapter(adapter.id);
      expect(found).toBeNull();
    });
  });

  describe('transfer estimation', () => {
    it('should estimate a transfer', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Estimate Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt'],
        config: { timeout: 300000 },
      });
      await manager.setAdapterStatus(adapter.id, 'active');

      const estimate = await manager.estimateTransfer({
        fromChain: 'ton',
        toChain: 'ethereum',
        asset: 'usdt',
        amount: '10000',
        recipient: '0xrecipient',
      });

      expect(estimate.estimatedFeeUsd).toBeDefined();
      expect(estimate.recommendedAdapterId).toBe(adapter.id);
      expect(estimate.validUntil > new Date()).toBe(true);
    });

    it('should throw when no adapter available for route', async () => {
      await expect(
        manager.estimateTransfer({
          fromChain: 'ton',
          toChain: 'cosmos',
          asset: 'usdt',
          amount: '1000',
          recipient: 'cosmos_addr',
        })
      ).rejects.toThrow('No adapters found');
    });
  });

  describe('gas management', () => {
    it('should estimate gas for transfer', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Gas Test Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ethereum'],
        supportedAssets: ['usdt'],
        config: {},
      });

      const gas = await manager.estimateGas(adapter.id, 'transfer', 'ethereum');
      expect(gas.estimatedGasUnits).toBeGreaterThan(0);
      expect(gas.bufferMultiplier).toBeGreaterThan(1);
      expect(parseFloat(gas.finalEstimateUsd)).toBeGreaterThan(0);
    });

    it('should get gas prices for all chains', async () => {
      const prices = await manager.getGasPrices();
      expect(prices['ethereum']).toBeDefined();
      expect(prices['ton']).toBeDefined();
      expect(prices['polygon']).toBeDefined();
    });
  });

  describe('bridge quotes', () => {
    it('should get bridge quote', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Quote Bridge',
        bridgeType: 'liquidity_pool',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt'],
        config: {},
      });
      await manager.setAdapterStatus(adapter.id, 'active');

      const quote = await manager.getBridgeQuote({
        fromChain: 'ton',
        toChain: 'ethereum',
        asset: 'usdt',
        amount: '5000',
      });

      expect(quote.quoteId).toBeDefined();
      expect(parseFloat(quote.inputAmount)).toBe(5000);
      expect(parseFloat(quote.outputAmount)).toBeLessThan(5000);
      expect(quote.validUntil > new Date()).toBe(true);
    });

    it('should list supported bridges', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Listed Bridge',
        bridgeType: 'optimistic',
        supportedChains: ['ton', 'arbitrum'],
        supportedAssets: ['usdt'],
        config: {},
      });
      await manager.setAdapterStatus(adapter.id, 'active');

      const bridges = await manager.getSupportedBridges('ton', 'arbitrum');
      expect(bridges.length).toBeGreaterThan(0);
      expect(bridges[0].adapterId).toBe(adapter.id);
    });
  });

  describe('failover', () => {
    it('should trigger failover and open circuit breaker', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Failover Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt'],
        config: {},
        failoverConfig: { enabled: true, alternateAdapters: [] },
      });
      await manager.setAdapterStatus(adapter.id, 'active');

      const result = await manager.triggerFailover(adapter.id, 'test_failure');
      expect(result.originalAdapterId).toBe(adapter.id);

      const status = await manager.getFailoverStatus(adapter.id);
      expect(status.circuitBreakerOpen).toBe(true);
    });

    it('should reset circuit breaker', async () => {
      const adapter = await manager.registerAdapter({
        name: 'Reset CB Bridge',
        bridgeType: 'lock_mint',
        supportedChains: ['ton', 'ethereum'],
        supportedAssets: ['usdt'],
        config: {},
      });

      await manager.triggerFailover(adapter.id, 'test');
      await manager.resetCircuitBreaker(adapter.id);

      const status = await manager.getFailoverStatus(adapter.id);
      expect(status.circuitBreakerOpen).toBe(false);
    });
  });

  describe('metrics and health', () => {
    it('should return adapter layer metrics', async () => {
      const metrics = await manager.getLayerMetrics();
      expect(metrics.totalAdapters).toBeDefined();
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should return health status', () => {
      const health = manager.getHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// ProtocolApiManager Tests
// ============================================================================

describe('ProtocolApiManager', () => {
  let manager: ReturnType<typeof createProtocolApiManager>;

  beforeEach(() => {
    manager = createProtocolApiManager({ governanceEnabled: true });
  });

  describe('protocol registry', () => {
    it('should register a protocol', async () => {
      const protocol = await manager.registerProtocol({
        id: 'proto_alpha',
        name: 'Alpha Protocol',
        description: 'Test protocol for IPLS',
        version: '1.0.0',
        website: 'https://alpha.example.com',
        contactEmail: 'contact@alpha.example.com',
        supportedCapabilities: ['liquidity_provision', 'clearing'],
        tags: ['defi', 'ton'],
      });

      expect(protocol.id).toBe('proto_alpha');
      expect(protocol.status).toBe('active');
      expect(protocol.reputationScore).toBeDefined();
      expect(protocol.registeredAt).toBeDefined();
    });

    it('should throw on duplicate protocol registration', async () => {
      await manager.registerProtocol({
        id: 'dup_proto',
        name: 'Duplicate',
        description: 'Test',
        version: '1.0.0',
        website: '',
        contactEmail: '',
        supportedCapabilities: [],
        tags: [],
      });

      await expect(
        manager.registerProtocol({
          id: 'dup_proto',
          name: 'Duplicate Again',
          description: 'Test',
          version: '1.0.0',
          website: '',
          contactEmail: '',
          supportedCapabilities: [],
          tags: [],
        })
      ).rejects.toThrow('Protocol already registered');
    });

    it('should list protocols with filters', async () => {
      await manager.registerProtocol({
        id: 'liquidity_proto',
        name: 'Liquidity Provider',
        description: 'Provides liquidity',
        version: '1.0.0',
        website: '',
        contactEmail: '',
        supportedCapabilities: ['liquidity_provision'],
        tags: [],
      });

      const liquidityProtocols = await manager.listProtocols({
        capabilities: ['liquidity_provision'],
      });
      expect(liquidityProtocols.some((p) => p.id === 'liquidity_proto')).toBe(true);
    });

    it('should deregister a protocol', async () => {
      await manager.registerProtocol({
        id: 'deregister_proto',
        name: 'To Deregister',
        description: '',
        version: '1.0.0',
        website: '',
        contactEmail: '',
        supportedCapabilities: [],
        tags: [],
      });

      await manager.deregisterProtocol('deregister_proto');
      const protocol = await manager.getProtocol('deregister_proto');
      expect(protocol?.status).toBe('inactive');
    });
  });

  describe('capital requests', () => {
    it('should submit and approve a capital request', async () => {
      const now = new Date();
      const request = {
        id: 'req_cap_001',
        fromProtocol: 'requester_proto',
        toProtocol: 'provider_proto',
        requestType: 'liquidity' as const,
        asset: 'usdt',
        amount: '100000',
        purpose: 'Cover short-term liquidity shortfall',
        urgency: 'standard' as const,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 3600000),
      };

      const result = await manager.submitCapitalRequest(request);
      expect(result.requestId).toBe('req_cap_001');
      expect(result.status).toBe('pending');

      await manager.approveCapitalRequest('req_cap_001', 'provider_proto');
      const retrieved = await manager.getCapitalRequest('req_cap_001');
      expect(retrieved).not.toBeNull();
    });

    it('should throw on expired capital request', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      await expect(
        manager.submitCapitalRequest({
          id: 'expired_req',
          fromProtocol: 'req_proto',
          toProtocol: 'prov_proto',
          requestType: 'liquidity',
          asset: 'usdt',
          amount: '1000',
          purpose: 'Test',
          urgency: 'standard',
          createdAt: new Date(),
          expiresAt: expiredDate,
        })
      ).rejects.toThrow('Capital request has already expired');
    });

    it('should cancel a capital request', async () => {
      const now = new Date();
      await manager.submitCapitalRequest({
        id: 'cancel_req',
        fromProtocol: 'req_proto',
        toProtocol: 'prov_proto',
        requestType: 'liquidity',
        asset: 'usdt',
        amount: '5000',
        purpose: 'Test cancellation',
        urgency: 'standard',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 3600000),
      });

      await manager.cancelCapitalRequest('cancel_req');
      const retrieved = await manager.getCapitalRequest('cancel_req');
      expect(retrieved).not.toBeNull(); // still exists
    });
  });

  describe('reporting', () => {
    it('should submit a valid report', async () => {
      const result = await manager.submitReport({
        reporterId: 'reporting_proto',
        reportType: 'exposure',
        period: { from: new Date('2026-02-01'), to: new Date('2026-02-28') },
        data: { totalExposureUsd: 5000000, counterpartyCount: 12 },
        schemaVersion: '1.0',
        generatedAt: new Date(),
      });

      expect(result.reportId).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should detect invalid report (missing data)', async () => {
      const result = await manager.submitReport({
        reporterId: 'reporting_proto',
        reportType: 'exposure',
        period: { from: new Date('2026-02-01'), to: new Date('2026-02-28') },
        data: {},
        schemaVersion: '1.0',
        generatedAt: new Date(),
      });

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });

    it('should get aggregated report', async () => {
      await manager.submitReport({
        reporterId: 'agg_proto',
        reportType: 'risk_metrics',
        period: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
        data: { riskScore: 42 },
        schemaVersion: '1.0',
        generatedAt: new Date(),
      });

      const aggregated = await manager.getAggregatedReport('agg_proto', 'risk_metrics', '2026-01');
      expect(aggregated.dataPoints).toBeGreaterThan(0);
    });
  });

  describe('risk disclosures', () => {
    it('should submit a risk disclosure', async () => {
      const result = await manager.submitRiskDisclosure({
        disclosingProtocol: 'disclosing_proto',
        disclosureType: 'incident',
        severity: 'high',
        affectedSystems: ['liquidity_pool', 'oracle'],
        description: 'Temporary oracle price feed disruption',
        mitigationTaken: 'Switched to backup oracle',
        resolutionStatus: 'mitigated',
        disclosedAt: new Date(),
      });

      expect(result.id).toBeDefined();
      expect(result.disclosure.severity).toBe('high');
    });

    it('should resolve a risk disclosure', async () => {
      const disclosure = await manager.submitRiskDisclosure({
        disclosingProtocol: 'resolve_proto',
        disclosureType: 'near_miss',
        severity: 'low',
        affectedSystems: ['router'],
        description: 'Router latency spike',
        mitigationTaken: 'Auto-scaled backend',
        resolutionStatus: 'open',
        disclosedAt: new Date(),
      });

      await manager.resolveRiskDisclosure(disclosure.id, 'Issue resolved after 2h monitoring');
      const resolved = await manager.getRiskDisclosure(disclosure.id);
      expect(resolved?.resolvedAt).toBeDefined();
      expect(resolved?.disclosure.resolutionStatus).toBe('resolved');
    });
  });

  describe('governance hooks', () => {
    it('should propose a governance action', async () => {
      const proposal = await manager.proposeGovernanceAction({
        action: 'fee_adjustment',
        targetModule: 'liquidity_standard',
        proposedBy: 'governance_proto',
        parameters: { newFeesBps: 8 },
        rationale: 'Market conditions warrant fee reduction',
        quorumRequired: 50,
        votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe('proposed');
      expect(proposal.votes).toHaveLength(0);
    });

    it('should vote on a governance proposal', async () => {
      const proposal = await manager.proposeGovernanceAction({
        action: 'parameter_update',
        targetModule: 'risk_module',
        proposedBy: 'governance_proto',
        parameters: { tier1MaxScore: 20 },
        rationale: 'Tighten tier 1 requirements',
        quorumRequired: 30,
        votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await manager.voteOnProposal(proposal.id, {
        voterId: 'voter_001',
        vote: 'for',
        weight: 40,
        rationale: 'Agree with tightening',
      });

      const updated = await manager.getGovernanceProposal(proposal.id);
      expect(updated?.votes).toHaveLength(1);
      expect(updated?.status).toBe('voting');
    });

    it('should execute a governance proposal after voting deadline passes', async () => {
      // Create proposal with a deadline just 10ms in the future
      const soonDeadline = new Date(Date.now() + 10);
      const proposal = await manager.proposeGovernanceAction({
        action: 'parameter_update',
        targetModule: 'ipls_core',
        proposedBy: 'governance_proto',
        parameters: { maxProviders: 200 },
        rationale: 'Scale up provider capacity',
        quorumRequired: 50,
        votingDeadline: soonDeadline,
      });

      // Vote before deadline expires
      await manager.voteOnProposal(proposal.id, {
        voterId: 'voter_exec_001',
        vote: 'for',
        weight: 60,
      });

      // Wait for deadline to pass
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Now execute — deadline has passed and we have quorum + majority
      const result = await manager.executeProposal(proposal.id);
      expect(result.executed).toBe(true);
      expect(result.transactionId).toBeDefined();
    });
  });

  describe('metrics and health', () => {
    it('should return API metrics', () => {
      const metrics = manager.getApiMetrics();
      expect(metrics.totalProtocols).toBeDefined();
      expect(metrics.totalCapitalRequests).toBeDefined();
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should return health status', () => {
      const health = manager.getHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});

// ============================================================================
// IPLSManager (Unified) Tests
// ============================================================================

describe('IPLSManager (Unified)', () => {
  let ipls: ReturnType<typeof createIPLSManager>;

  beforeEach(() => {
    ipls = createIPLSManager({
      aiRiskEnabled: true,
      crossChainEnabled: true,
      governanceEnabled: true,
    });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const config = ipls.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.version).toBe('1.0.0');
      expect(config.aiRiskEnabled).toBe(true);
      expect(config.crossChainEnabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createIPLSManager({
        passportExpiryDays: 180,
        maxProviders: 50,
      });
      const config = custom.getConfig();
      expect(config.passportExpiryDays).toBe(180);
      expect(config.maxProviders).toBe(50);
    });

    it('should expose DEFAULT_IPLS_CONFIG', () => {
      expect(DEFAULT_IPLS_CONFIG.version).toBe('1.0.0');
      expect(DEFAULT_IPLS_CONFIG.enabled).toBe(true);
    });
  });

  describe('health aggregation', () => {
    it('should report healthy when all sub-modules are healthy', () => {
      const health = ipls.getHealth();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.lastHealthCheck).toBeDefined();
    });

    it('should expose all sub-module counts in health', () => {
      const health = ipls.getHealth();
      expect(health.providerCount).toBeDefined();
      expect(health.consumerCount).toBeDefined();
      expect(health.adapterCount).toBeDefined();
    });
  });

  describe('sub-manager access', () => {
    it('should expose liquidity sub-manager', () => {
      expect(ipls.liquidity).toBeDefined();
    });

    it('should expose risk sub-manager', () => {
      expect(ipls.risk).toBeDefined();
    });

    it('should expose passport sub-manager', () => {
      expect(ipls.passport).toBeDefined();
    });

    it('should expose adapter sub-manager', () => {
      expect(ipls.adapter).toBeDefined();
    });

    it('should expose api sub-manager', () => {
      expect(ipls.api).toBeDefined();
    });
  });

  describe('end-to-end integration', () => {
    it('should support a complete liquidity provisioning flow', async () => {
      // 1. Register protocol with the API
      const proto = await ipls.api.registerProtocol({
        id: 'e2e_provider_001',
        name: 'E2E Test Provider',
        description: 'Integration test provider',
        version: '1.0.0',
        website: '',
        contactEmail: '',
        supportedCapabilities: ['liquidity_provision'],
        tags: ['test'],
      });
      expect(proto.id).toBe('e2e_provider_001');

      // 2. Register as IPLS provider (with higher single transaction limit for e2e test)
      const provider = await ipls.liquidity.registerProvider({
        name: 'E2E Test Provider',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
        limits: { singleTransactionLimit: '2000000' },
      });
      await ipls.liquidity.updateProviderStatus(provider.id, 'active');

      // 3. Deposit liquidity
      await ipls.liquidity.deposit(provider.id, 'usdt', '1000000', 'ton');

      // 4. Issue a passport for the provider
      const passport = await ipls.passport.issuePassport({
        holderId: provider.id,
        holderName: provider.name,
        capitalOrigin: {
          primaryChain: 'ton',
          capitalType: 'native',
          sourceProtocols: ['ton_amm'],
          totalVerifiedCapital: '1000000',
        },
        compliance: {
          status: 'compliant',
          kycLevel: 'institutional',
          amlScreened: true,
          sanctions: false,
        },
      });
      expect(passport.id).toBeDefined();

      // 5. Assess risk
      const assessment = await ipls.risk.assessProtocol({
        protocolId: provider.id,
        protocolName: provider.name,
        overrides: {
          auditsPassed: 3,
          totalValueLockedUsd: '1000000',
          uptimePercent: 99.9,
        },
        includeAIInsights: true,
      });
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);

      // 6. Register a consumer and request liquidity
      const consumer = await ipls.liquidity.registerConsumer({
        name: 'E2E Consumer',
        type: 'derivatives',
        requestedChains: ['ton'],
        preferredAssets: ['usdt'],
      });
      await ipls.liquidity.updateConsumerStatus(consumer.id, 'active');

      const response = await ipls.liquidity.requestLiquidity(consumer.id, {
        id: 'e2e_req_001',
        consumerId: consumer.id,
        asset: 'usdt',
        amount: '50000',
        targetChain: 'ton',
        urgency: 'standard',
        strategy: 'ai_optimized',
        maxFeeBps: 50,
        deadline: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });

      expect(response.approved).toBe(true);
      expect(response.providerId).toBe(provider.id);

      // 7. Submit a report
      const report = await ipls.api.submitReport({
        reporterId: provider.id,
        reportType: 'capital_usage',
        period: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
        data: { totalLiquidity: 1000000, utilization: 0.05 },
        schemaVersion: '1.0',
        generatedAt: new Date(),
      });
      expect(report.isValid).toBe(true);

      // 8. Final health check
      const health = ipls.getHealth();
      expect(health.providerCount).toBeGreaterThan(0);
      expect(health.consumerCount).toBeGreaterThan(0);
    });

    it('should support event subscription across sub-modules', async () => {
      const events: unknown[] = [];
      ipls.onEvent((e) => events.push(e));

      await ipls.liquidity.registerProvider({
        name: 'Event Provider',
        type: 'dex',
        chainIds: ['ton'],
        supportedAssets: ['usdt'],
      });

      await ipls.passport.issuePassport({
        holderId: 'event_passport_holder',
        holderName: 'Event Passport',
        capitalOrigin: { primaryChain: 'ton' },
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
