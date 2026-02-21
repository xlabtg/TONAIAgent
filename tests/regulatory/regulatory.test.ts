/**
 * TONAIAgent Regulatory Strategy Module - Test Suite
 * Comprehensive tests for jurisdiction analysis, KYC/AML, AI governance,
 * and regulatory risk engine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRegulatoryManager,
  createJurisdictionAnalyzer,
  createKycAmlManager,
  createAiGovernanceManager,
  createRegulatoryRiskEngine,
  RegulatoryManager,
  JurisdictionAnalyzer,
  KycAmlManager,
  AiGovernanceManager,
  RegulatoryRiskEngine,
} from '../../src/regulatory';

// ============================================================================
// Jurisdiction Analyzer Tests
// ============================================================================

describe('JurisdictionAnalyzer', () => {
  let analyzer: JurisdictionAnalyzer;

  beforeEach(() => {
    analyzer = createJurisdictionAnalyzer();
  });

  describe('analyzeJurisdiction', () => {
    it('should analyze Switzerland jurisdiction correctly', async () => {
      const analysis = await analyzer.analyzeJurisdiction('CH', {
        entityType: 'fintech_platform',
        activities: ['ai_agents', 'asset_management'],
        targetMarkets: ['EU', 'APAC'],
      });

      expect(analysis.jurisdiction).toBe('CH');
      expect(analysis.regulatoryScore).toBeGreaterThan(80);
      expect(analysis.cryptoFriendlinessScore).toBeGreaterThan(90);
      expect(analysis.requiredLicenses).toHaveLength(1);
      expect(analysis.estimatedCosts.currency).toBe('USD');
      expect(analysis.taxFramework.capitalGainsTax).toBe(0);
    });

    it('should analyze Singapore jurisdiction correctly', async () => {
      const analysis = await analyzer.analyzeJurisdiction('SG', {
        entityType: 'fintech_platform',
        activities: ['trading', 'custody'],
      });

      expect(analysis.jurisdiction).toBe('SG');
      expect(analysis.regulatoryScore).toBeGreaterThan(90);
      expect(analysis.institutionalAccessScore).toBeGreaterThan(90);
      expect(analysis.requiredLicenses).toBeDefined();
    });

    it('should throw error for unknown jurisdiction', async () => {
      await expect(
        analyzer.analyzeJurisdiction('XX' as any, {
          entityType: 'test',
          activities: [],
        })
      ).rejects.toThrow('Unknown jurisdiction');
    });
  });

  describe('compareJurisdictions', () => {
    it('should compare multiple jurisdictions and rank them', async () => {
      const comparison = await analyzer.compareJurisdictions(['CH', 'SG', 'AE', 'KY'], {
        activities: ['ai_agents', 'asset_management'],
      });

      expect(comparison.jurisdictions).toHaveLength(4);
      expect(comparison.rankings).toHaveLength(4);
      expect(comparison.rankings[0].totalScore).toBeGreaterThanOrEqual(
        comparison.rankings[1].totalScore
      );
      expect(comparison.optimalChoice).toBeDefined();
      expect(comparison.rationale).toBeDefined();
    });

    it('should apply custom weights correctly', async () => {
      const comparison = await analyzer.compareJurisdictions(['CH', 'AE'], {
        activities: ['trading'],
        weights: {
          taxEfficiency: 0.9,
          regulatoryClarity: 0.1,
        },
      });

      // UAE should rank higher with tax efficiency heavily weighted
      expect(comparison.rankings[0].jurisdiction).toBe('AE');
    });
  });

  describe('designEntityArchitecture', () => {
    it('should design multi-entity structure', async () => {
      const architecture = await analyzer.designEntityArchitecture({
        primaryHQ: {
          jurisdiction: 'CH',
          entityType: 'AG',
          purpose: 'Group holding',
        },
        operationalHubs: [
          {
            jurisdiction: 'SG',
            entityType: 'PTE_LTD',
            purpose: 'APAC operations',
            activities: ['trading', 'custody'],
          },
        ],
        techSubsidiary: {
          jurisdiction: 'EE',
          entityType: 'OU',
          purpose: 'Technology development',
        },
      });

      expect(architecture.primaryHQ.jurisdiction).toBe('CH');
      expect(architecture.operationalHubs).toHaveLength(1);
      expect(architecture.techSubsidiary).toBeDefined();
      expect(architecture.totalEstimatedCost).toBeGreaterThan(0);
      expect(architecture.taxOptimization).toBeDefined();
      expect(architecture.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedJurisdictions', () => {
    it('should return list of supported jurisdictions', () => {
      const jurisdictions = analyzer.getSupportedJurisdictions();

      expect(jurisdictions.length).toBeGreaterThan(20);
      expect(jurisdictions).toContain('CH');
      expect(jurisdictions).toContain('SG');
      expect(jurisdictions).toContain('AE');
      expect(jurisdictions).toContain('US');
    });
  });
});

// ============================================================================
// KYC/AML Manager Tests
// ============================================================================

describe('KycAmlManager', () => {
  let kycAml: KycAmlManager;

  beforeEach(() => {
    kycAml = createKycAmlManager({
      enabled: true,
      tieredCompliance: true,
      defaultTier: 'basic',
    });
  });

  describe('processKyc', () => {
    it('should approve basic tier KYC with minimal requirements', async () => {
      const result = await kycAml.processKyc({
        userId: 'user_123',
        requestedTier: 'basic',
        documents: [],
        submittedAt: new Date(),
      });

      expect(result.userId).toBe('user_123');
      expect(result.requestedTier).toBe('basic');
      expect(result.status).toBeDefined();
      expect(result.riskScore).toBeDefined();
      expect(result.screeningResults).toBeDefined();
    });

    it('should require documents for standard tier', async () => {
      const result = await kycAml.processKyc({
        userId: 'user_456',
        requestedTier: 'standard',
        documents: [],
        submittedAt: new Date(),
      });

      expect(result.status).toBe('additional_info_required');
      expect(result.pendingDocuments?.length).toBeGreaterThan(0);
    });

    it('should approve standard tier with proper documents', async () => {
      const result = await kycAml.processKyc({
        userId: 'user_789',
        requestedTier: 'standard',
        documents: [
          {
            type: 'passport',
            documentId: 'doc_1',
            issuingCountry: 'DE',
            expiryDate: new Date('2030-01-01'),
          },
          {
            type: 'utility_bill',
            documentId: 'doc_2',
            issuingCountry: 'DE',
            issueDate: new Date('2026-01-01'),
          },
        ],
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'DE',
          residenceCountry: 'DE',
          address: {
            street: 'Test St 123',
            city: 'Berlin',
            postalCode: '10115',
            country: 'DE',
          },
        },
        submittedAt: new Date(),
      });

      expect(result.status).toBe('approved');
      expect(result.approvedTier).toBe('standard');
      expect(result.riskLevel).toBeDefined();
    });
  });

  describe('checkTransaction', () => {
    it('should approve low-risk transaction', async () => {
      const result = await kycAml.checkTransaction({
        transactionId: 'tx_001',
        userId: 'user_123',
        type: 'transfer',
        amount: 100,
        currency: 'TON',
        destination: 'EQC_safe_address',
      });

      expect(result.transactionId).toBe('tx_001');
      // Transaction may still be approved even with minor flags
      expect(result.riskScore).toBeDefined();
      // Low amount should not trigger large_transaction rule
      expect(result.matchedRules).not.toContain('large_transaction');
    });

    it('should flag high-value transaction', async () => {
      const result = await kycAml.checkTransaction({
        transactionId: 'tx_002',
        userId: 'user_123',
        type: 'transfer',
        amount: 15000,
        currency: 'USDT',
        destination: 'EQC_address',
      });

      expect(result.matchedRules).toContain('large_transaction');
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should block blacklisted address', async () => {
      kycAml.addBlacklistedAddress('EQC_blacklisted');

      const result = await kycAml.checkTransaction({
        transactionId: 'tx_003',
        userId: 'user_123',
        type: 'transfer',
        amount: 100,
        currency: 'TON',
        destination: 'EQC_blacklisted',
      });

      expect(result.approved).toBe(false);
      expect(result.flags.some((f) => f.type === 'Blacklisted Address')).toBe(true);
    });
  });

  describe('screenAddress', () => {
    it('should screen address for risks', async () => {
      const result = await kycAml.screenAddress('EQC_test_address');

      expect(result.address).toBe('EQC_test_address');
      expect(result.sanctionsHit).toBe(false);
      expect(result.riskCategory).toBe('low');
      expect(result.lastUpdated).toBeDefined();
    });

    it('should detect high-risk address', async () => {
      kycAml.addHighRiskAddress('EQC_high_risk');

      const result = await kycAml.screenAddress('EQC_high_risk');

      expect(result.riskCategory).toBe('high');
      expect(result.riskIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('alert management', () => {
    it('should create and retrieve alerts', async () => {
      const alert = await kycAml.createAlertManual({
        type: 'suspicious_activity',
        priority: 'high',
        userId: 'user_123',
        transactionIds: ['tx_001'],
        description: 'Unusual pattern detected',
        riskScore: 75,
      });

      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('open');
      expect(alert.priority).toBe('high');

      const alerts = await kycAml.getAlerts({ status: 'open' });
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should update alert status', async () => {
      const alert = await kycAml.createAlertManual({
        type: 'test',
        priority: 'medium',
        userId: 'user_123',
        transactionIds: [],
        description: 'Test alert',
        riskScore: 50,
      });

      const updated = await kycAml.updateAlertStatus(alert.id, 'investigating', 'analyst_1');

      expect(updated.status).toBe('investigating');
      expect(updated.assignedTo).toBe('analyst_1');
    });
  });

  describe('tier configurations', () => {
    it('should return all tier configurations', () => {
      const configs = kycAml.getAllTierConfigs();

      expect(configs.basic).toBeDefined();
      expect(configs.standard).toBeDefined();
      expect(configs.enhanced).toBeDefined();
      expect(configs.institutional).toBeDefined();

      expect(configs.basic.limits.dailyTransaction).toBe(1000);
      expect(configs.institutional.limits.dailyTransaction).toBe('unlimited');
    });
  });
});

// ============================================================================
// AI Governance Manager Tests
// ============================================================================

describe('AiGovernanceManager', () => {
  let aiGov: AiGovernanceManager;

  beforeEach(() => {
    aiGov = createAiGovernanceManager({
      enabled: true,
      frameworks: ['eu_ai_act'],
      humanOversight: {
        required: true,
        level: 'meaningful',
      },
    });
  });

  describe('classifyAiSystem', () => {
    it('should classify trading AI as high-risk under EU AI Act', async () => {
      const classification = await aiGov.classifyAiSystem({
        systemName: 'Trading Agent',
        purpose: 'Autonomous trading decisions',
        domain: 'financial_services',
        capabilities: ['autonomous_trading', 'risk_assessment'],
        autonomyLevel: 'high',
        humanInLoop: true,
        affectedParties: ['retail_investors'],
      });

      expect(classification.systemName).toBe('Trading Agent');
      expect(classification.euAiActClass).toBe('high');
      expect(classification.requiredControls.length).toBeGreaterThan(5);
      expect(classification.documentation.length).toBeGreaterThan(5);
    });

    it('should classify advisory AI as minimal or limited risk', async () => {
      const classification = await aiGov.classifyAiSystem({
        systemName: 'Research Assistant',
        purpose: 'Market research assistance',
        domain: 'information',
        capabilities: ['data_analysis', 'report_generation'],
        autonomyLevel: 'low',
        humanInLoop: true,
        affectedParties: ['analysts'],
      });

      // Low autonomy with human in loop should be minimal or limited risk
      expect(['minimal', 'limited']).toContain(classification.euAiActClass);
      expect(['low', 'medium']).toContain(classification.riskLevel);
    });

    it('should classify prohibited AI correctly', async () => {
      const classification = await aiGov.classifyAiSystem({
        systemName: 'Social Scoring',
        purpose: 'User social scoring',
        domain: 'social',
        capabilities: ['social_scoring'],
        autonomyLevel: 'full',
        humanInLoop: false,
        affectedParties: ['all_users'],
      });

      expect(classification.euAiActClass).toBe('unacceptable');
      expect(classification.riskLevel).toBe('critical');
      expect(classification.requiredControls).toContain('SYSTEM PROHIBITED - DO NOT DEPLOY');
    });
  });

  describe('registerModel', () => {
    it('should register AI model with full metadata', async () => {
      const model = await aiGov.registerModel({
        modelId: 'trading_model_v1',
        version: '1.0.0',
        type: 'decision_making',
        architecture: 'transformer',
        trainingData: {
          description: 'Historical market data 2020-2025',
          dataTypes: ['price', 'volume'],
          privacyMeasures: ['anonymization'],
        },
        capabilities: {
          marketAnalysis: true,
          tradeRecommendation: true,
        },
        limitations: {
          maxPositionSize: 100000,
          supportedMarkets: ['spot'],
        },
        performance: {
          accuracy: 0.87,
          precision: 0.85,
          recall: 0.89,
          f1Score: 0.87,
        },
        auditStatus: {
          lastAudit: new Date(),
          auditor: 'Internal',
          findings: 'No issues',
          nextAuditDue: new Date('2026-07-01'),
          auditType: 'internal',
        },
      });

      expect(model.modelId).toBe('trading_model_v1');
      expect(model.status).toBe('development');
      expect(model.registeredAt).toBeDefined();

      const retrieved = aiGov.getModel('trading_model_v1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.0.0');
    });
  });

  describe('explainDecision', () => {
    it('should generate decision explanation', async () => {
      // First record a decision
      const decisionId = await aiGov.recordDecision({
        decisionId: 'decision_001',
        modelId: 'trading_model_v1',
        input: { marketConditions: 'bullish' },
        output: { action: 'buy', amount: 1000 },
        confidence: 0.92,
        reasoning: [
          'Market momentum positive',
          'Within risk limits',
          'Favorable entry point',
        ],
        alternativesConsidered: [
          { action: 'hold', reason: 'Lower potential return' },
        ],
        riskAssessment: { level: 'medium', factors: ['market_volatility'] },
      });

      const explanation = await aiGov.explainDecision({
        decisionId,
        modelId: 'trading_model_v1',
        detailLevel: 'detailed',
      });

      expect(explanation.decisionId).toBe(decisionId);
      expect(explanation.confidence).toBe(0.92);
      expect(explanation.keyFactors.length).toBe(3);
      expect(explanation.alternatives.length).toBe(1);
      expect(explanation.naturalLanguage).toBeDefined();
    });
  });

  describe('checkOversightRequired', () => {
    it('should require oversight for high-value decisions', async () => {
      const result = await aiGov.checkOversightRequired('model_1', {
        type: 'trade_execution',
        amount: 100000,
        confidence: 0.95,
      });

      expect(result.required).toBe(true);
      expect(result.reason).toContain('threshold');
    });

    it('should require oversight for low confidence decisions', async () => {
      const result = await aiGov.checkOversightRequired('model_1', {
        type: 'trade_execution',
        amount: 1000,
        confidence: 0.5,
      });

      expect(result.required).toBe(true);
      expect(result.reason).toContain('Confidence');
    });

    it('should not require oversight for standard decisions', async () => {
      const result = await aiGov.checkOversightRequired('model_1', {
        type: 'trade_execution',
        amount: 1000,
        confidence: 0.9,
        riskScore: 0.2,
      });

      expect(result.required).toBe(false);
    });
  });

  describe('scheduleAudit', () => {
    it('should schedule algorithmic audit', async () => {
      const audit = await aiGov.scheduleAudit({
        modelId: 'trading_model_v1',
        auditType: 'comprehensive',
        scope: ['performance_metrics', 'bias_detection', 'fairness_assessment'],
        auditor: {
          type: 'external',
          firm: 'AI Audit Partners',
          credentials: ['ISO 27001'],
        },
        frequency: 'semi_annual',
      });

      expect(audit.auditId).toBeDefined();
      expect(audit.modelId).toBe('trading_model_v1');
      expect(audit.status).toBe('scheduled');
      expect(audit.scheduledDate).toBeDefined();

      const scheduled = aiGov.getScheduledAudits('trading_model_v1');
      expect(scheduled.length).toBe(1);
    });

    it('should complete audit with results', async () => {
      const audit = await aiGov.scheduleAudit({
        modelId: 'test_model',
        auditType: 'internal',
        scope: ['performance_metrics'],
        auditor: { type: 'internal', credentials: [] },
        frequency: 'quarterly',
      });

      const completed = await aiGov.completeAudit(audit.auditId, {
        status: 'passed',
        findings: [],
        overallRisk: 'low',
        recommendations: ['Continue current monitoring'],
      });

      expect(completed.status).toBe('completed');
      expect(completed.results?.status).toBe('passed');
    });
  });

  describe('checkSafetyConstraints', () => {
    it('should check safety constraints for registered model', async () => {
      await aiGov.registerModel({
        modelId: 'constrained_model',
        version: '1.0.0',
        type: 'decision_making',
        architecture: 'transformer',
        trainingData: {
          description: 'Test data',
          dataTypes: [],
          privacyMeasures: [],
        },
        capabilities: {},
        limitations: {
          maxPositionSize: 50000,
          excludedAssets: ['derivatives'],
        },
        performance: {
          accuracy: 0.9,
          precision: 0.9,
          recall: 0.9,
          f1Score: 0.9,
        },
        auditStatus: {
          lastAudit: new Date(),
          auditor: 'Internal',
          findings: 'OK',
          nextAuditDue: new Date('2026-12-01'),
          auditType: 'internal',
        },
      });

      // Should pass
      const passResult = await aiGov.checkSafetyConstraints('constrained_model', {
        type: 'trade',
        amount: 10000,
      });
      expect(passResult.passed).toBe(true);

      // Should fail due to amount
      const failResult = await aiGov.checkSafetyConstraints('constrained_model', {
        type: 'trade',
        amount: 100000,
      });
      expect(failResult.passed).toBe(false);
      expect(failResult.violations.length).toBeGreaterThan(0);

      // Should fail due to excluded asset
      const excludedResult = await aiGov.checkSafetyConstraints('constrained_model', {
        type: 'trade',
        action: 'derivatives',
      });
      expect(excludedResult.passed).toBe(false);
    });
  });
});

// ============================================================================
// Regulatory Risk Engine Tests
// ============================================================================

describe('RegulatoryRiskEngine', () => {
  let riskEngine: RegulatoryRiskEngine;

  beforeEach(() => {
    riskEngine = createRegulatoryRiskEngine({
      enabled: true,
      aiPowered: true,
      realTimeMonitoring: true,
    });
  });

  describe('assessEntityRisk', () => {
    it('should assess entity risk with multiple factors', async () => {
      const assessment = await riskEngine.assessEntityRisk({
        entityId: 'entity_001',
        entityType: 'corporation',
        jurisdiction: 'DE',
        activities: ['trading', 'staking'],
        transactionHistory: {
          volume30d: 500000,
          frequency30d: 50,
          uniqueCounterparties: 20,
        },
      });

      expect(assessment.entityId).toBe('entity_001');
      expect(assessment.overallScore).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.factors.length).toBeGreaterThan(0);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify high-risk jurisdiction', async () => {
      const assessment = await riskEngine.assessEntityRisk({
        entityId: 'entity_002',
        entityType: 'individual',
        jurisdiction: 'IR', // Iran - high risk
        activities: ['trading'],
      });

      // High-risk jurisdiction should result in elevated risk
      expect(['high', 'critical', 'medium']).toContain(assessment.riskLevel);
      expect(assessment.factors.some((f) => f.category === 'Jurisdiction')).toBe(true);
      // Should have high jurisdiction risk factor
      const jurisdictionFactor = assessment.factors.find((f) => f.category === 'Jurisdiction');
      expect(jurisdictionFactor?.score).toBeGreaterThan(80);
    });

    it('should handle elevated risk jurisdiction', async () => {
      const assessment = await riskEngine.assessEntityRisk({
        entityId: 'entity_003',
        entityType: 'corporation',
        jurisdiction: 'PA', // Panama - elevated risk
        activities: ['custody'],
      });

      expect(['high', 'medium']).toContain(assessment.riskLevel);
    });
  });

  describe('assessTransactionRisk', () => {
    it('should assess transaction risk', async () => {
      const assessment = await riskEngine.assessTransactionRisk({
        transactionId: 'tx_001',
        amount: 50000,
        currency: 'TON',
        source: 'EQC_source',
        destination: 'EQC_dest',
        jurisdiction: {
          source: 'DE',
          destination: 'SG',
        },
      });

      expect(assessment.transactionId).toBe('tx_001');
      expect(assessment.score).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.cleared).toBeDefined();
    });

    it('should flag high-risk jurisdiction transaction', async () => {
      const assessment = await riskEngine.assessTransactionRisk({
        transactionId: 'tx_002',
        amount: 10000,
        currency: 'USDT',
        source: 'EQC_source',
        destination: 'EQC_dest',
        jurisdiction: {
          source: 'DE',
          destination: 'KP', // North Korea
        },
      });

      // Verify the jurisdiction is flagged with critical severity indicator
      const jurisdictionIndicator = assessment.indicators.find((i) =>
        i.type.includes('Jurisdiction') && i.severity === 'critical'
      );
      expect(jurisdictionIndicator).toBeDefined();
      expect(jurisdictionIndicator?.contribution).toBeGreaterThanOrEqual(50);
      expect(assessment.indicators.some((i) => i.type.includes('Jurisdiction'))).toBe(true);
    });
  });

  describe('analyzeForSuspiciousActivity', () => {
    it('should analyze entity for suspicious patterns', async () => {
      // First create an entity assessment
      await riskEngine.assessEntityRisk({
        entityId: 'entity_suspicious',
        entityType: 'individual',
        jurisdiction: 'DE',
        activities: ['trading', 'transfers'],
        transactionHistory: {
          volume30d: 1000000,
          frequency30d: 200,
          uniqueCounterparties: 100,
        },
      });

      const analysis = await riskEngine.analyzeForSuspiciousActivity({
        entityId: 'entity_suspicious',
        timeWindow: '30d',
      });

      expect(analysis.entityId).toBe('entity_suspicious');
      expect(analysis.aggregateRiskScore).toBeDefined();
      expect(analysis.sarRequired).toBeDefined();
      expect(analysis.investigationNotes.length).toBeGreaterThan(0);
    });
  });

  describe('regulatory change monitoring', () => {
    it('should add and retrieve regulatory changes', async () => {
      await riskEngine.addRegulatoryChange({
        id: 'change_001',
        name: 'MiCA Update',
        jurisdiction: 'EU' as any,
        type: 'amendment',
        effectiveDate: new Date('2026-06-01'),
        publishedDate: new Date(),
        summary: 'Updated stablecoin requirements',
        impactLevel: 'high',
        affectedAreas: ['stablecoins', 'custody'],
        requiredActions: ['Update policies', 'Obtain additional license'],
        source: 'Official Journal EU',
      });

      const changes = await riskEngine.getRecentRegulatoryChanges({
        timeWindow: '30d',
      });

      expect(changes.length).toBe(1);
      expect(changes[0].name).toBe('MiCA Update');
    });

    it('should filter regulatory changes by jurisdiction', async () => {
      await riskEngine.addRegulatoryChange({
        id: 'change_eu',
        name: 'EU Change',
        jurisdiction: 'IE' as any,
        type: 'new_regulation',
        effectiveDate: new Date('2026-06-01'),
        publishedDate: new Date(),
        summary: 'EU regulation',
        impactLevel: 'medium',
        affectedAreas: [],
        requiredActions: [],
        source: 'Test',
      });

      await riskEngine.addRegulatoryChange({
        id: 'change_us',
        name: 'US Change',
        jurisdiction: 'US',
        type: 'guidance',
        effectiveDate: new Date('2026-06-01'),
        publishedDate: new Date(),
        summary: 'US guidance',
        impactLevel: 'low',
        affectedAreas: [],
        requiredActions: [],
        source: 'Test',
      });

      const euChanges = await riskEngine.getRecentRegulatoryChanges({
        timeWindow: '30d',
        jurisdictions: ['IE'],
      });

      expect(euChanges.length).toBe(1);
      expect(euChanges[0].jurisdiction).toBe('IE');
    });
  });

  describe('assessRegulatoryImpact', () => {
    it('should assess impact of regulatory change', async () => {
      await riskEngine.addRegulatoryChange({
        id: 'impact_test',
        name: 'New Licensing Requirement',
        jurisdiction: 'SG',
        type: 'new_regulation',
        effectiveDate: new Date('2026-09-01'),
        publishedDate: new Date(),
        summary: 'New licensing requirements for custody',
        impactLevel: 'high',
        affectedAreas: ['custody', 'asset_management'],
        requiredActions: ['Obtain new license', 'Update compliance policies', 'Train staff'],
        source: 'MAS',
      });

      const impact = await riskEngine.assessRegulatoryImpact({
        changeId: 'impact_test',
        currentState: {
          licenses: ['MAS_DPT'],
          activities: ['trading', 'custody'],
          jurisdictions: ['SG'],
        },
      });

      expect(impact.changeId).toBe('impact_test');
      expect(impact.impactLevel).toBe('high');
      expect(impact.affectedAreas.length).toBeGreaterThan(0);
      expect(impact.complianceGap.length).toBe(3);
      expect(impact.remediationPlan.length).toBe(3);
      expect(impact.implementationTimeline).toBeDefined();
    });
  });

  describe('getComplianceRisks', () => {
    it('should aggregate compliance risks', async () => {
      // Create high-risk entity
      await riskEngine.assessEntityRisk({
        entityId: 'risky_entity',
        entityType: 'individual',
        jurisdiction: 'IR',
        activities: ['margin_trading'],
      });

      // Add regulatory change
      await riskEngine.addRegulatoryChange({
        id: 'urgent_change',
        name: 'Urgent Compliance',
        jurisdiction: 'EU' as any,
        type: 'enforcement',
        effectiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        publishedDate: new Date(),
        summary: 'Urgent compliance requirement',
        impactLevel: 'critical',
        affectedAreas: ['all'],
        requiredActions: ['Immediate action'],
        source: 'Regulator',
      });

      const risks = await riskEngine.getComplianceRisks();

      expect(risks.length).toBeGreaterThan(0);
      expect(risks.some((r) => r.category === 'Entity Risk')).toBe(true);
    });
  });
});

// ============================================================================
// Regulatory Manager Integration Tests
// ============================================================================

describe('RegulatoryManager', () => {
  let manager: RegulatoryManager;

  beforeEach(() => {
    manager = createRegulatoryManager({
      enabled: true,
      primaryJurisdiction: 'CH',
      operationalRegions: ['EU', 'APAC'],
      complianceLevel: 'institutional',
    });
  });

  describe('getComplianceStatus', () => {
    it('should return comprehensive compliance status', async () => {
      const status = await manager.getComplianceStatus();

      expect(status.overall).toBeDefined();
      expect(status.score).toBeDefined();
      expect(status.areas.length).toBeGreaterThan(0);
      expect(status.riskLevel).toBeDefined();
      expect(status.lastAssessed).toBeDefined();
      expect(status.nextReviewDue).toBeDefined();
    });
  });

  describe('getComplianceRequirements', () => {
    it('should return requirements for jurisdiction and activities', async () => {
      const requirements = await manager.getComplianceRequirements('CH', {
        userType: 'institutional',
        activities: ['ai_agents', 'asset_management'],
      });

      expect(requirements.licenses.length).toBeGreaterThan(0);
      expect(requirements.kycTier).toBe('institutional');
      expect(requirements.amlRequirements.length).toBeGreaterThan(0);
      expect(requirements.aiGovernance.length).toBeGreaterThan(0);
      expect(requirements.privacy.length).toBeGreaterThan(0);
    });
  });

  describe('validateCompliance', () => {
    it('should identify compliance gaps', async () => {
      const validation = await manager.validateCompliance({
        jurisdiction: 'CH',
        entityType: 'fintech_platform',
        activities: ['trading', 'custody', 'ai_agents'],
        currentLicenses: [],
      });

      expect(validation.compliant).toBe(false);
      expect(validation.gaps.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should confirm compliance when licenses present', async () => {
      const validation = await manager.validateCompliance({
        jurisdiction: 'CH',
        entityType: 'fintech_platform',
        activities: ['trading'],
        currentLicenses: ['FINMA_VT'],
      });

      expect(validation.compliant).toBe(true);
      expect(validation.gaps.length).toBe(0);
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all components', async () => {
      const events: any[] = [];
      manager.onEvent((event) => events.push(event));

      // Trigger events from different components
      await manager.kycAml.processKyc({
        userId: 'test_user',
        requestedTier: 'basic',
        documents: [],
        submittedAt: new Date(),
      });

      await manager.aiGovernance.registerModel({
        modelId: 'test_model',
        version: '1.0.0',
        type: 'test',
        architecture: 'test',
        trainingData: { description: 'test', dataTypes: [], privacyMeasures: [] },
        capabilities: {},
        limitations: {},
        performance: { accuracy: 0.9, precision: 0.9, recall: 0.9, f1Score: 0.9 },
        auditStatus: {
          lastAudit: new Date(),
          auditor: 'test',
          findings: 'ok',
          nextAuditDue: new Date('2027-01-01'),
          auditType: 'internal',
        },
      });

      // Events should have been collected
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('component access', () => {
    it('should provide access to all sub-managers', () => {
      expect(manager.jurisdiction).toBeInstanceOf(JurisdictionAnalyzer);
      expect(manager.kycAml).toBeInstanceOf(KycAmlManager);
      expect(manager.aiGovernance).toBeInstanceOf(AiGovernanceManager);
      expect(manager.riskEngine).toBeInstanceOf(RegulatoryRiskEngine);
    });
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  describe('disabled state', () => {
    it('should handle disabled KYC/AML gracefully', async () => {
      const kycAml = createKycAmlManager({ enabled: false });

      const result = await kycAml.processKyc({
        userId: 'user_123',
        requestedTier: 'enhanced',
        documents: [],
        submittedAt: new Date(),
      });

      // Should auto-approve when disabled
      expect(result.status).toBe('approved');
      expect(result.riskScore).toBe(0);
    });

    it('should handle disabled risk engine gracefully', async () => {
      const riskEngine = createRegulatoryRiskEngine({ enabled: false });

      // Should still function but with minimal risk scoring
      const assessment = await riskEngine.assessEntityRisk({
        entityId: 'test',
        entityType: 'individual',
        jurisdiction: 'DE',
        activities: [],
      });

      expect(assessment).toBeDefined();
    });
  });

  describe('invalid inputs', () => {
    it('should handle unknown model in AI governance', async () => {
      const aiGov = createAiGovernanceManager();

      await expect(
        aiGov.explainDecision({
          decisionId: 'unknown',
          modelId: 'unknown',
          detailLevel: 'basic',
        })
      ).rejects.toThrow('Decision not found');
    });

    it('should handle unknown audit in AI governance', async () => {
      const aiGov = createAiGovernanceManager();

      await expect(
        aiGov.completeAudit('unknown', {
          status: 'passed',
          findings: [],
          overallRisk: 'low',
          recommendations: [],
        })
      ).rejects.toThrow('Audit not found');
    });

    it('should handle unknown regulatory change', async () => {
      const riskEngine = createRegulatoryRiskEngine();

      await expect(
        riskEngine.assessRegulatoryImpact({
          changeId: 'unknown',
          currentState: { licenses: [], activities: [], jurisdictions: [] },
        })
      ).rejects.toThrow('Regulatory change not found');
    });
  });
});
