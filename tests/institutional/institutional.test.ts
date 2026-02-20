/**
 * TONAIAgent - Institutional Module Tests
 *
 * Comprehensive tests for institutional-grade compliance, risk, and reporting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Account Management
  createAccountManager,
  DefaultAccountManager,
  InstitutionalAccountType,
  InstitutionalRole,

  // KYC/AML
  createKycAmlManager,
  DefaultKycAmlManager,
  KycLevel,
  DocumentType,

  // Approval Workflows
  createApprovalWorkflowManager,
  DefaultApprovalWorkflowManager,

  // Reporting
  createReportingManager,
  DefaultReportingManager,

  // Risk Controls
  createRiskControlManager,
  DefaultRiskControlManager,

  // AI Governance
  createAIGovernanceManager,
  DefaultAIGovernanceManager,

  // Unified Manager
  createInstitutionalManager,
  DefaultInstitutionalManager,
} from '../../src/institutional';

// ============================================================================
// Account Management Tests
// ============================================================================

describe('Institutional Account Management', () => {
  let accountManager: DefaultAccountManager;

  beforeEach(() => {
    accountManager = createAccountManager();
  });

  describe('Account Creation', () => {
    it('should create a new institutional account', async () => {
      const account = await accountManager.createAccount(
        'Test Fund',
        'hedge_fund',
        'user_123'
      );

      expect(account).toBeDefined();
      expect(account.id).toContain('inst_');
      expect(account.name).toBe('Test Fund');
      expect(account.type).toBe('hedge_fund');
      expect(account.status).toBe('pending_verification');
    });

    it('should create account with correct default limits', async () => {
      const account = await accountManager.createAccount(
        'Family Office',
        'family_office',
        'user_123'
      );

      expect(account.limits.dailyTransactionLimit).toBe(5000000);
      expect(account.limits.singleTransactionLimit).toBe(2000000);
    });

    it('should add creator as admin member', async () => {
      const account = await accountManager.createAccount(
        'Test Fund',
        'hedge_fund',
        'user_123'
      );

      const members = await accountManager.listMembers(account.id);
      expect(members.length).toBe(1);
      expect(members[0].userId).toBe('user_123');
      expect(members[0].role).toBe('admin');
    });

    it('should allow custom limits on creation', async () => {
      const account = await accountManager.createAccount(
        'Custom Fund',
        'hedge_fund',
        'user_123',
        {
          customLimits: {
            dailyTransactionLimit: 20000000,
            singleTransactionLimit: 10000000,
          },
        }
      );

      expect(account.limits.dailyTransactionLimit).toBe(20000000);
      expect(account.limits.singleTransactionLimit).toBe(10000000);
    });
  });

  describe('Member Management', () => {
    let accountId: string;

    beforeEach(async () => {
      const account = await accountManager.createAccount(
        'Test Fund',
        'hedge_fund',
        'admin_user'
      );
      accountId = account.id;
    });

    it('should add new members', async () => {
      const member = await accountManager.addMember(
        accountId,
        'trader_user',
        'trader@test.com',
        'Test Trader',
        'trader',
        'admin_user'
      );

      expect(member.userId).toBe('trader_user');
      expect(member.role).toBe('trader');
      expect(member.permissions.canTrade).toBe(true);
      expect(member.permissions.canManageMembers).toBe(false);
    });

    it('should update member role', async () => {
      await accountManager.addMember(
        accountId,
        'user_to_promote',
        'user@test.com',
        'Test User',
        'viewer',
        'admin_user'
      );

      const updated = await accountManager.updateMemberRole(
        accountId,
        'user_to_promote',
        'trader',
        'admin_user'
      );

      expect(updated.role).toBe('trader');
      expect(updated.permissions.canTrade).toBe(true);
    });

    it('should not allow removing last admin', async () => {
      await expect(
        accountManager.removeMember(accountId, 'admin_user', 'admin_user')
      ).rejects.toThrow('Cannot remove the last admin');
    });

    it('should filter members by role', async () => {
      await accountManager.addMember(
        accountId,
        'trader1',
        't1@test.com',
        'Trader 1',
        'trader',
        'admin_user'
      );
      await accountManager.addMember(
        accountId,
        'trader2',
        't2@test.com',
        'Trader 2',
        'trader',
        'admin_user'
      );
      await accountManager.addMember(
        accountId,
        'auditor1',
        'a1@test.com',
        'Auditor 1',
        'auditor',
        'admin_user'
      );

      const traders = await accountManager.listMembers(accountId, { role: 'trader' });
      expect(traders.length).toBe(2);

      const auditors = await accountManager.listMembers(accountId, { role: 'auditor' });
      expect(auditors.length).toBe(1);
    });
  });

  describe('Access Control', () => {
    let accountId: string;

    beforeEach(async () => {
      const account = await accountManager.createAccount(
        'Test Fund',
        'hedge_fund',
        'admin_user'
      );
      accountId = account.id;
      await accountManager.addMember(
        accountId,
        'trader_user',
        'trader@test.com',
        'Trader',
        'trader',
        'admin_user'
      );
    });

    it('should allow admin access to all permissions', async () => {
      const result = await accountManager.checkAccess(
        accountId,
        'admin_user',
        'canManageMembers'
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny trader access to member management', async () => {
      const result = await accountManager.checkAccess(
        accountId,
        'trader_user',
        'canManageMembers'
      );

      expect(result.allowed).toBe(false);
    });

    it('should allow trader access to trading', async () => {
      const result = await accountManager.checkAccess(
        accountId,
        'trader_user',
        'canTrade'
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Account Lifecycle', () => {
    it('should suspend and reactivate account', async () => {
      const account = await accountManager.createAccount(
        'Test Fund',
        'hedge_fund',
        'user_123'
      );

      // Update to active first
      await accountManager.updateAccount(account.id, {});
      const updated = await accountManager.getAccount(account.id);

      await accountManager.suspendAccount(account.id, 'Investigation', 'admin');
      const suspended = await accountManager.getAccount(account.id);
      expect(suspended?.status).toBe('suspended');

      await accountManager.reactivateAccount(account.id, 'admin');
      const reactivated = await accountManager.getAccount(account.id);
      expect(reactivated?.status).toBe('active');
    });
  });
});

// ============================================================================
// KYC/AML Tests
// ============================================================================

describe('KYC/AML Management', () => {
  let kycManager: DefaultKycAmlManager;

  beforeEach(() => {
    kycManager = createKycAmlManager();
  });

  describe('KYC Profile', () => {
    it('should create KYC profile', async () => {
      const profile = await kycManager.createProfile('account_123', 'institutional');

      expect(profile).toBeDefined();
      expect(profile.accountId).toBe('account_123');
      expect(profile.level).toBe('institutional');
      expect(profile.status).toBe('not_started');
    });

    it('should upload and verify documents', async () => {
      await kycManager.createProfile('account_123', 'basic');

      const doc = await kycManager.uploadDocument(
        'account_123',
        'government_id',
        'hash_abc123'
      );

      expect(doc.type).toBe('government_id');
      expect(doc.status).toBe('pending');

      await kycManager.verifyDocument('account_123', doc.id, 'compliance_officer');
      const docs = await kycManager.getDocuments('account_123');
      expect(docs[0].status).toBe('verified');
    });

    it('should update profile status on document upload', async () => {
      await kycManager.createProfile('account_123');

      await kycManager.uploadDocument('account_123', 'government_id', 'hash_123');

      const profile = await kycManager.getProfile('account_123');
      expect(profile?.status).toBe('in_progress');
    });
  });

  describe('Screening', () => {
    it('should run sanctions screening', async () => {
      await kycManager.createProfile('account_123');

      const result = await kycManager.runSanctionsScreening('account_123');

      expect(result.screened).toBe(true);
      expect(result.matched).toBe(false);
    });

    it('should run PEP screening', async () => {
      await kycManager.createProfile('account_123');

      const result = await kycManager.runPepScreening('account_123');

      expect(result.screened).toBe(true);
      expect(result.isPep).toBe(false);
    });

    it('should calculate risk score', async () => {
      await kycManager.createProfile('account_123');
      await kycManager.runSanctionsScreening('account_123');

      const score = await kycManager.calculateRiskScore('account_123');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Transaction Monitoring', () => {
    it('should create monitor with default rules', async () => {
      await kycManager.createProfile('account_123');
      const monitor = await kycManager.createMonitor('account_123');

      expect(monitor.enabled).toBe(true);
      expect(monitor.rules.length).toBeGreaterThan(0);
    });

    it('should check transaction against rules', async () => {
      await kycManager.createProfile('account_123');
      await kycManager.createMonitor('account_123');

      const result = await kycManager.checkTransaction('account_123', {
        id: 'tx_123',
        type: 'transfer',
        amount: 50000,
        currency: 'TON',
        source: 'wallet_a',
        destination: 'wallet_b',
        timestamp: new Date(),
        metadata: {},
      });

      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
    });

    it('should flag large transactions', async () => {
      await kycManager.createProfile('account_123');
      await kycManager.createMonitor('account_123');

      const result = await kycManager.checkTransaction('account_123', {
        id: 'tx_large',
        type: 'transfer',
        amount: 200000, // Above threshold
        currency: 'TON',
        source: 'wallet_a',
        destination: 'wallet_b',
        timestamp: new Date(),
        metadata: {},
      });

      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Approval Workflow Tests
// ============================================================================

describe('Approval Workflows', () => {
  let workflowManager: DefaultApprovalWorkflowManager;

  beforeEach(() => {
    workflowManager = createApprovalWorkflowManager();
  });

  describe('Workflow Management', () => {
    it('should create workflow', async () => {
      const workflow = await workflowManager.createWorkflow(
        'account_123',
        'Test Workflow',
        'Test description',
        [
          {
            type: 'transaction_amount',
            conditions: [{ field: 'amount', operator: 'greater_than', value: 50000 }],
          },
        ],
        [
          {
            stepNumber: 1,
            name: 'Manager Approval',
            approverRoles: ['risk_manager'],
            requiredApprovals: 1,
            timeoutHours: 4,
            escalateOnTimeout: true,
            escalateTo: 'admin',
          },
        ],
        'admin_user'
      );

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.status).toBe('draft');
    });

    it('should activate workflow', async () => {
      const workflow = await workflowManager.createWorkflow(
        'account_123',
        'Test Workflow',
        'Description',
        [{ type: 'transaction_amount', conditions: [] }],
        [
          {
            stepNumber: 1,
            name: 'Step 1',
            approverRoles: ['admin'],
            requiredApprovals: 1,
            timeoutHours: 1,
            escalateOnTimeout: false,
          },
        ],
        'admin'
      );

      await workflowManager.activateWorkflow(workflow.id, 'admin');

      const updated = await workflowManager.getWorkflow(workflow.id);
      expect(updated?.status).toBe('active');
    });
  });

  describe('Approval Requests', () => {
    let workflowId: string;

    beforeEach(async () => {
      const workflow = await workflowManager.createWorkflow(
        'account_123',
        'Large Transfer Approval',
        'Requires approval for large transfers',
        [
          {
            type: 'transaction_amount',
            conditions: [{ field: 'amount', operator: 'greater_than', value: 10000 }],
          },
        ],
        [
          {
            stepNumber: 1,
            name: 'Risk Manager Review',
            approverRoles: ['risk_manager'],
            requiredApprovals: 1,
            timeoutHours: 4,
            escalateOnTimeout: true,
            escalateTo: 'admin',
          },
          {
            stepNumber: 2,
            name: 'Final Approval',
            approverRoles: ['admin'],
            requiredApprovals: 1,
            timeoutHours: 8,
            escalateOnTimeout: false,
          },
        ],
        'admin'
      );

      await workflowManager.activateWorkflow(workflow.id, 'admin');
      workflowId = workflow.id;
    });

    it('should create approval request', async () => {
      const request = await workflowManager.createRequest(
        workflowId,
        'tx_123',
        'trader_user'
      );

      expect(request).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.currentStep).toBe(1);
    });

    it('should process approval through steps', async () => {
      const request = await workflowManager.createRequest(
        workflowId,
        'tx_123',
        'trader_user'
      );

      // First approval
      const result1 = await workflowManager.approve(
        request.id,
        'risk_manager_1',
        'risk_manager'
      );

      expect(result1.success).toBe(true);
      expect(result1.isComplete).toBe(false);
      expect(result1.request.currentStep).toBe(2);

      // Second approval
      const result2 = await workflowManager.approve(
        request.id,
        'admin_user',
        'admin'
      );

      expect(result2.success).toBe(true);
      expect(result2.isComplete).toBe(true);
      expect(result2.request.status).toBe('approved');
    });

    it('should reject request', async () => {
      const request = await workflowManager.createRequest(
        workflowId,
        'tx_123',
        'trader_user'
      );

      const result = await workflowManager.reject(
        request.id,
        'risk_manager_1',
        'risk_manager',
        'Too risky'
      );

      expect(result.success).toBe(true);
      expect(result.request.status).toBe('rejected');
    });
  });

  describe('Transaction Evaluation', () => {
    beforeEach(async () => {
      await workflowManager.initializeDefaultWorkflows('account_123', 'admin');
    });

    it('should find matching workflow for transaction', async () => {
      const workflow = await workflowManager.findMatchingWorkflow('account_123', {
        id: 'tx_123',
        type: 'transfer',
        amount: 200000,
        currency: 'TON',
        source: 'wallet_a',
        destination: 'wallet_b',
        metadata: {},
      });

      expect(workflow).toBeDefined();
    });

    it('should evaluate if approval is needed', async () => {
      const evaluation = await workflowManager.shouldTriggerApproval('account_123', {
        id: 'tx_small',
        type: 'transfer',
        amount: 1000, // Below thresholds
        currency: 'TON',
        source: 'wallet_a',
        destination: 'wallet_b',
        metadata: {},
      });

      // Small transaction shouldn't need approval
      expect(evaluation.requiresApproval).toBe(false);
    });
  });
});

// ============================================================================
// Reporting Tests
// ============================================================================

describe('Regulatory Reporting', () => {
  let reportingManager: DefaultReportingManager;

  beforeEach(() => {
    reportingManager = createReportingManager();
  });

  describe('Configuration', () => {
    it('should configure reporting', async () => {
      const config = await reportingManager.configureReporting('account_123', {
        enabled: true,
        retentionDays: 730,
      });

      expect(config.enabled).toBe(true);
      expect(config.retentionDays).toBe(730);
      expect(config.templates.length).toBeGreaterThan(0);
    });

    it('should add report schedules', async () => {
      await reportingManager.configureReporting('account_123', { enabled: true });

      const schedule = await reportingManager.addSchedule('account_123', {
        reportType: 'performance',
        frequency: 'daily',
        hour: 8,
        timezone: 'UTC',
        enabled: true,
        recipients: ['compliance@test.com'],
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.reportType).toBe('performance');
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      await reportingManager.configureReporting('account_123', { enabled: true });
    });

    it('should generate performance report', async () => {
      const report = await reportingManager.generateReport(
        'account_123',
        'performance',
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
          timezone: 'UTC',
        }
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('performance');
      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.summary).toBeDefined();
    });

    it('should generate risk metrics report', async () => {
      const report = await reportingManager.generateReport(
        'account_123',
        'risk_metrics',
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
          timezone: 'UTC',
        }
      );

      expect(report.type).toBe('risk_metrics');
    });

    it('should export report to JSON', async () => {
      const report = await reportingManager.generateReport(
        'account_123',
        'compliance_summary',
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
          timezone: 'UTC',
        }
      );

      const exported = await reportingManager.exportReport(report.id, 'json');

      expect(exported.success).toBe(true);
      expect(exported.format).toBe('json');
      expect(exported.data).toBeDefined();
    });
  });

  describe('Dashboard Metrics', () => {
    it('should return dashboard metrics', async () => {
      await reportingManager.configureReporting('account_123', { enabled: true });

      const metrics = await reportingManager.getDashboardMetrics('account_123');

      expect(metrics.portfolio).toBeDefined();
      expect(metrics.activity).toBeDefined();
      expect(metrics.risk).toBeDefined();
      expect(metrics.compliance).toBeDefined();
    });

    it('should return compliance status', async () => {
      await reportingManager.configureReporting('account_123', { enabled: true });

      const status = await reportingManager.getComplianceStatus('account_123');

      expect(status.status).toBeDefined();
      expect(status.kyc).toBeDefined();
      expect(status.aml).toBeDefined();
      expect(status.monitoring).toBeDefined();
    });
  });
});

// ============================================================================
// Risk Control Tests
// ============================================================================

describe('Risk Controls', () => {
  let riskManager: DefaultRiskControlManager;

  beforeEach(() => {
    riskManager = createRiskControlManager();
  });

  describe('Configuration', () => {
    it('should configure risk controls', async () => {
      const config = await riskManager.configureRisk('account_123', {
        enabled: true,
        portfolioLimits: {
          maxDrawdown: 15,
          maxConcentration: 30,
        },
      });

      expect(config.enabled).toBe(true);
      expect(config.portfolioLimits.maxDrawdown).toBe(15);
      expect(config.portfolioLimits.maxConcentration).toBe(30);
    });

    it('should include default stress scenarios', async () => {
      const config = await riskManager.configureRisk('account_123', { enabled: true });

      expect(config.stressTestConfig.scenarios.length).toBeGreaterThan(0);
    });
  });

  describe('VaR Calculations', () => {
    beforeEach(async () => {
      await riskManager.configureRisk('account_123', { enabled: true });

      // Set up portfolio with historical returns
      await riskManager.updatePortfolio('account_123', {
        timestamp: new Date(),
        totalValue: 1000000,
        positions: [
          {
            asset: 'TON',
            symbol: 'TON',
            quantity: 100000,
            currentPrice: 5,
            value: 500000,
            weight: 50,
            costBasis: 400000,
            unrealizedPnL: 100000,
            category: 'L1',
          },
          {
            asset: 'USDT',
            symbol: 'USDT',
            quantity: 500000,
            currentPrice: 1,
            value: 500000,
            weight: 50,
            costBasis: 500000,
            unrealizedPnL: 0,
            category: 'Stablecoin',
          },
        ],
        historicalReturns: Array.from({ length: 252 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          return: (Math.random() - 0.5) * 0.04, // +/- 2% daily returns
          portfolioValue: 1000000 * (1 + (Math.random() - 0.5) * 0.1),
        })),
        marketData: {
          timestamp: new Date(),
          prices: { TON: 5, USDT: 1 },
          volatilities: { TON: 0.6, USDT: 0.01 },
        },
      });
    });

    it('should calculate historical VaR', async () => {
      const var95 = await riskManager.calculateVaR('account_123', 'historical', 95);

      expect(var95.value).toBeGreaterThan(0);
      expect(var95.confidenceLevel).toBe(95);
      expect(var95.methodology).toBe('historical');
    });

    it('should calculate parametric VaR', async () => {
      const var95 = await riskManager.calculateVaR('account_123', 'parametric', 95);

      expect(var95.value).toBeGreaterThan(0);
      expect(var95.methodology).toBe('parametric');
    });

    it('should calculate expected shortfall', async () => {
      const es = await riskManager.calculateExpectedShortfall('account_123', 95);

      expect(es).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    beforeEach(async () => {
      await riskManager.configureRisk('account_123', { enabled: true });
      await riskManager.updatePortfolio('account_123', {
        timestamp: new Date(),
        totalValue: 1000000,
        positions: [
          {
            asset: 'TON',
            symbol: 'TON',
            quantity: 100000,
            currentPrice: 5,
            value: 500000,
            weight: 50,
            costBasis: 400000,
            unrealizedPnL: 100000,
            category: 'L1',
          },
        ],
        historicalReturns: [],
        marketData: {
          timestamp: new Date(),
          prices: { TON: 5 },
          volatilities: { TON: 0.6 },
        },
      });
    });

    it('should run stress test', async () => {
      const config = await riskManager.getConfig('account_123');
      const scenarioId = config!.stressTestConfig.scenarios[0].id;

      const result = await riskManager.runStressTest('account_123', scenarioId);

      expect(result.scenarioId).toBe(scenarioId);
      expect(result.portfolioImpact).toBeDefined();
      expect(result.assetImpacts.length).toBeGreaterThan(0);
    });

    it('should run all stress tests', async () => {
      const results = await riskManager.runAllStressTests('account_123');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Limit Monitoring', () => {
    beforeEach(async () => {
      await riskManager.configureRisk('account_123', {
        enabled: true,
        portfolioLimits: {
          maxPositionSize: 400000,
          maxConcentration: 40,
          maxDrawdown: 10,
          maxDailyLoss: 5,
          maxWeeklyLoss: 10,
          maxMonthlyLoss: 20,
          maxLeverage: 1,
        },
      });

      await riskManager.updatePortfolio('account_123', {
        timestamp: new Date(),
        totalValue: 1000000,
        positions: [
          {
            asset: 'TON',
            symbol: 'TON',
            quantity: 100000,
            currentPrice: 5,
            value: 500000, // Exceeds maxPositionSize
            weight: 50, // Exceeds maxConcentration
            costBasis: 400000,
            unrealizedPnL: 100000,
            category: 'L1',
          },
        ],
        historicalReturns: [],
        marketData: {
          timestamp: new Date(),
          prices: { TON: 5 },
          volatilities: { TON: 0.6 },
        },
      });
    });

    it('should detect limit breaches', async () => {
      const results = await riskManager.checkLimits('account_123');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.status === 'breach')).toBe(true);
    });

    it('should check transaction impact', async () => {
      const result = await riskManager.checkTransactionImpact('account_123', {
        type: 'buy',
        asset: 'TON',
        amount: 50000,
        value: 250000,
      });

      expect(result.impacts.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// AI Governance Tests
// ============================================================================

describe('AI Governance', () => {
  let aiGovernance: DefaultAIGovernanceManager;

  beforeEach(() => {
    aiGovernance = createAIGovernanceManager();
  });

  describe('Configuration', () => {
    it('should configure AI governance', async () => {
      const config = await aiGovernance.configureGovernance('account_123', {
        enabled: true,
        explainabilityLevel: 'detailed',
      });

      expect(config.enabled).toBe(true);
      expect(config.explainabilityLevel).toBe('detailed');
    });

    it('should update oversight config', async () => {
      await aiGovernance.configureGovernance('account_123', { enabled: true });

      const oversight = await aiGovernance.updateOversight('account_123', {
        requiredAboveAmount: 50000,
      });

      expect(oversight.requiredAboveAmount).toBe(50000);
    });

    it('should update safety guardrails', async () => {
      await aiGovernance.configureGovernance('account_123', { enabled: true });

      const guardrails = await aiGovernance.updateSafetyGuardrails('account_123', {
        maxLossPerDecision: 5000,
      });

      expect(guardrails.maxLossPerDecision).toBe(5000);
    });
  });

  describe('Decision Recording', () => {
    beforeEach(async () => {
      await aiGovernance.configureGovernance('account_123', {
        enabled: true,
        decisionLogging: true,
      });
    });

    it('should record AI decision', async () => {
      const decision = await aiGovernance.recordDecision('account_123', 'agent_1', {
        decisionType: 'trade',
        input: {
          marketData: { TON: 5.0 },
          portfolioState: { value: 100000 },
          signals: [{ source: 'momentum', type: 'indicator', value: 0.8, confidence: 0.9, timestamp: new Date() }],
          constraints: {},
        },
        output: {
          action: 'buy',
          parameters: { asset: 'TON', amount: 1000 },
          expectedOutcome: {
            expectedReturn: 2.5,
            expectedRisk: 1.0,
            probability: 0.75,
            timeHorizon: '1d',
          },
          alternatives: [],
        },
        confidence: 0.85,
      });

      expect(decision).toBeDefined();
      expect(decision.decisionType).toBe('trade');
      expect(decision.explanation).toBeDefined();
      expect(decision.riskAssessment).toBeDefined();
    });

    it('should generate explanation', async () => {
      const decision = await aiGovernance.recordDecision('account_123', 'agent_1', {
        decisionType: 'trade',
        input: {
          marketData: {},
          portfolioState: {},
          signals: [],
          constraints: {},
        },
        output: {
          action: 'hold',
          parameters: {},
          expectedOutcome: {
            expectedReturn: 0,
            expectedRisk: 0,
            probability: 1,
            timeHorizon: '1d',
          },
          alternatives: [],
        },
        confidence: 0.95,
      });

      const explanation = await aiGovernance.getExplanation(decision.id);

      expect(explanation).toBeDefined();
      expect(explanation?.summary).toBeDefined();
      expect(explanation?.reasoning).toBeDefined();
    });
  });

  describe('Human Review', () => {
    beforeEach(async () => {
      await aiGovernance.configureGovernance('account_123', {
        enabled: true,
        humanOversight: {
          requiredForHighRisk: true,
          requiredAboveAmount: 10000,
          requiredForNewStrategies: true,
          reviewerRoles: ['risk_manager'],
        },
      });
    });

    it('should determine if review is required', async () => {
      const decision = await aiGovernance.recordDecision('account_123', 'agent_1', {
        decisionType: 'trade',
        input: { marketData: {}, portfolioState: {}, signals: [], constraints: {} },
        output: {
          action: 'buy',
          parameters: { amount: 50000 }, // Above threshold
          expectedOutcome: {
            expectedReturn: 5,
            expectedRisk: 3,
            probability: 0.7,
            timeHorizon: '1d',
          },
          alternatives: [],
        },
        confidence: 0.75,
      });

      const requirement = await aiGovernance.requiresHumanReview(decision);

      expect(requirement.required).toBe(true);
      expect(requirement.reasons.length).toBeGreaterThan(0);
    });

    it('should process human review', async () => {
      const decision = await aiGovernance.recordDecision('account_123', 'agent_1', {
        decisionType: 'trade',
        input: { marketData: {}, portfolioState: {}, signals: [], constraints: {} },
        output: {
          action: 'buy',
          parameters: { amount: 50000 },
          expectedOutcome: {
            expectedReturn: 5,
            expectedRisk: 3,
            probability: 0.7,
            timeHorizon: '1d',
          },
          alternatives: [],
        },
        confidence: 0.8,
      });

      const reviewed = await aiGovernance.reviewDecision(decision.id, {
        reviewerId: 'risk_manager_1',
        reviewerRole: 'risk_manager',
        decision: 'approved',
        comments: 'Looks good',
      });

      expect(reviewed.humanReview).toBeDefined();
      expect(reviewed.humanReview?.decision).toBe('approved');
    });
  });

  describe('Safety Checks', () => {
    beforeEach(async () => {
      await aiGovernance.configureGovernance('account_123', {
        enabled: true,
        safetyGuardrails: {
          enabled: true,
          maxLossPerDecision: 5000,
          maxConsecutiveLosses: 3,
          emergencyStopThreshold: 20000,
          requiresHumanApproval: false,
        },
        modelConstraints: {
          allowedModels: ['*'],
          maxConfidenceThreshold: 0.99,
          minConfidenceThreshold: 0.6,
          maxDecisionsPerHour: 100,
          maxPortfolioChangePercent: 5,
        },
      });
    });

    it('should pass safety checks for valid decision', async () => {
      const result = await aiGovernance.checkSafetyConstraints('account_123', {
        type: 'trade',
        action: 'buy',
        parameters: { amount: 1000 },
        expectedImpact: {
          portfolioChange: 2,
          riskChange: 1000,
        },
        confidence: 0.85,
      });

      expect(result.passed).toBe(true);
    });

    it('should fail safety checks for unsafe decision', async () => {
      const result = await aiGovernance.checkSafetyConstraints('account_123', {
        type: 'trade',
        action: 'buy',
        parameters: { amount: 100000 },
        expectedImpact: {
          portfolioChange: 10, // Exceeds limit
          riskChange: 10000, // Exceeds max loss
        },
        confidence: 0.5, // Below minimum
      });

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Unified Manager Tests
// ============================================================================

describe('Unified Institutional Manager', () => {
  let manager: DefaultInstitutionalManager;

  beforeEach(() => {
    manager = createInstitutionalManager();
  });

  it('should create manager with all components', () => {
    expect(manager.accounts).toBeDefined();
    expect(manager.kyc).toBeDefined();
    expect(manager.workflows).toBeDefined();
    expect(manager.reporting).toBeDefined();
    expect(manager.risk).toBeDefined();
    expect(manager.aiGovernance).toBeDefined();
  });

  it('should initialize account with all components', async () => {
    const result = await manager.initializeAccount(
      'Test Fund',
      'hedge_fund',
      'admin_user'
    );

    expect(result.accountId).toBeDefined();
    expect(result.kycProfileId).toBeDefined();
    expect(result.monitorId).toBeDefined();
    expect(result.riskConfigured).toBe(true);
    expect(result.reportingConfigured).toBe(true);
    expect(result.workflowsInitialized).toBe(true);
    expect(result.aiGovernanceConfigured).toBe(true);
  });

  it('should forward events from all components', async () => {
    const events: any[] = [];
    manager.onEvent((event) => events.push(event));

    await manager.initializeAccount('Test Fund', 'hedge_fund', 'admin_user');

    expect(events.length).toBeGreaterThan(0);
  });
});
