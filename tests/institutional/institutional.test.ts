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

  // Custody
  createCustodyManager,
  DefaultCustodyManager,

  // Vaults
  createVaultManager,
  DefaultVaultManager,

  // Jurisdiction
  createJurisdictionManager,
  DefaultJurisdictionManager,

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
    expect(manager.custody).toBeDefined();
    expect(manager.vaults).toBeDefined();
    expect(manager.jurisdiction).toBeDefined();
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

// ============================================================================
// Custody Integration Tests
// ============================================================================

describe('Institutional Custody Integration', () => {
  let custodyManager: DefaultCustodyManager;

  beforeEach(() => {
    custodyManager = createCustodyManager();
  });

  describe('Custody Configuration', () => {
    it('should configure MPC custody for an account', async () => {
      const config = await custodyManager.configureCustomer(
        'account_123',
        'fireblocks',
        'mpc'
      );

      expect(config).toBeDefined();
      expect(config.accountId).toBe('account_123');
      expect(config.provider).toBe('fireblocks');
      expect(config.custodyType).toBe('mpc');
      expect(config.enabled).toBe(true);
      expect(config.mpcConfig).toBeDefined();
      expect(config.mpcConfig?.threshold).toBe(2);
    });

    it('should configure multi-sig custody', async () => {
      const config = await custodyManager.configureCustomer(
        'account_123',
        'bitgo',
        'multi_sig',
        {
          multiSigConfig: {
            requiredSignatures: 3,
            totalSigners: 5,
            signers: [],
            scriptType: 'p2wsh',
          },
        }
      );

      expect(config.custodyType).toBe('multi_sig');
      expect(config.multiSigConfig).toBeDefined();
      expect(config.multiSigConfig?.requiredSignatures).toBe(3);
      expect(config.multiSigConfig?.totalSigners).toBe(5);
    });

    it('should configure HSM custody', async () => {
      const config = await custodyManager.configureCustomer(
        'account_123',
        'internal',
        'hsm',
        {
          hsmConfig: {
            provider: 'thales',
            deviceId: 'hsm_001',
            slot: 1,
            requiresPhysicalPresence: true,
          },
        }
      );

      expect(config.custodyType).toBe('hsm');
      expect(config.hsmConfig).toBeDefined();
      expect(config.hsmConfig?.provider).toBe('thales');
    });

    it('should retrieve custody config by account', async () => {
      await custodyManager.configureCustomer('account_123', 'copper', 'mpc');
      const config = await custodyManager.getCustodyConfig('account_123');

      expect(config).toBeDefined();
      expect(config?.provider).toBe('copper');
    });

    it('should enforce whitelist-only withdrawal policy by default', async () => {
      await custodyManager.configureCustomer('account_123', 'fireblocks', 'mpc');

      const config = await custodyManager.getCustodyConfig('account_123');
      expect(config?.withdrawalPolicy.whitelistOnly).toBe(true);
      expect(config?.withdrawalPolicy.requiresApproval).toBe(true);
    });
  });

  describe('Wallet Management', () => {
    beforeEach(async () => {
      await custodyManager.configureCustomer('account_123', 'fireblocks', 'mpc');
    });

    it('should create a custody wallet', async () => {
      const wallet = await custodyManager.createWallet(
        'account_123',
        'Main TON Wallet',
        'mpc',
        'TON',
        'ton_mainnet'
      );

      expect(wallet).toBeDefined();
      expect(wallet.id).toContain('wallet_');
      expect(wallet.name).toBe('Main TON Wallet');
      expect(wallet.asset).toBe('TON');
      expect(wallet.network).toBe('ton_mainnet');
      expect(wallet.status).toBe('active');
      expect(wallet.balance).toBe(0);
    });

    it('should list wallets for account', async () => {
      await custodyManager.createWallet('account_123', 'Wallet 1', 'mpc', 'TON', 'ton_mainnet');
      await custodyManager.createWallet('account_123', 'Wallet 2', 'mpc', 'USDT', 'ton_mainnet');

      const wallets = await custodyManager.listWallets('account_123');
      expect(wallets.length).toBe(2);
    });

    it('should filter wallets by asset', async () => {
      await custodyManager.createWallet('account_123', 'TON Wallet', 'mpc', 'TON', 'ton_mainnet');
      await custodyManager.createWallet('account_123', 'USDT Wallet', 'mpc', 'USDT', 'ton_mainnet');

      const tonWallets = await custodyManager.listWallets('account_123', { asset: 'TON' });
      expect(tonWallets.length).toBe(1);
      expect(tonWallets[0].asset).toBe('TON');
    });

    it('should freeze and unfreeze wallet', async () => {
      const wallet = await custodyManager.createWallet(
        'account_123', 'Main Wallet', 'mpc', 'TON', 'ton_mainnet'
      );

      await custodyManager.freezeWallet(wallet.id, 'Suspicious activity', 'admin');
      const frozen = await custodyManager.getWallet(wallet.id);
      expect(frozen?.status).toBe('frozen');

      await custodyManager.unfreezeWallet(wallet.id, 'admin');
      const unfrozen = await custodyManager.getWallet(wallet.id);
      expect(unfrozen?.status).toBe('active');
    });
  });

  describe('Withdrawal & Approval Workflow', () => {
    let walletId: string;

    beforeEach(async () => {
      await custodyManager.configureCustomer('account_123', 'fireblocks', 'mpc', {
        withdrawalPolicy: {
          requiresApproval: true,
          approvalThreshold: 0,
          approverRoles: ['admin', 'risk_manager'],
          coolingPeriodHours: 0,
          dailyLimit: 1000000,
          whitelistOnly: false,
          travelRuleRequired: false,
        },
      });
      const wallet = await custodyManager.createWallet(
        'account_123', 'Trading Wallet', 'mpc', 'TON', 'ton_mainnet'
      );
      walletId = wallet.id;
      await custodyManager.updateWalletBalance(walletId, 500000);
    });

    it('should initiate withdrawal pending approval', async () => {
      const tx = await custodyManager.initiateWithdrawal(
        'account_123',
        walletId,
        'EQDest123',
        'TON',
        10000,
        'trader_user'
      );

      expect(tx).toBeDefined();
      expect(tx.status).toBe('pending_approval');
      expect(tx.type).toBe('withdrawal');
      expect(tx.amount).toBe(10000);
    });

    it('should approve withdrawal and change status when threshold met', async () => {
      const tx = await custodyManager.initiateWithdrawal(
        'account_123', walletId, 'EQDest123', 'TON', 10000, 'trader_user'
      );

      // First approval (need 2 for admin + risk_manager)
      await custodyManager.approveTransaction(tx.id, 'admin_user', 'admin');
      const afterFirst = await custodyManager.getTransaction(tx.id);
      expect(afterFirst?.status).toBe('pending_approval'); // Still pending

      // Second approval
      await custodyManager.approveTransaction(tx.id, 'risk_mgr', 'risk_manager');
      const afterSecond = await custodyManager.getTransaction(tx.id);
      expect(afterSecond?.status).toBe('approved');
    });

    it('should reject withdrawal', async () => {
      const tx = await custodyManager.initiateWithdrawal(
        'account_123', walletId, 'EQDest123', 'TON', 10000, 'trader_user'
      );

      const rejected = await custodyManager.rejectTransaction(
        tx.id, 'admin_user', 'admin', 'Suspicious destination'
      );

      expect(rejected.status).toBe('cancelled');
      expect(rejected.failureReason).toBe('Suspicious destination');
    });

    it('should fail withdrawal with insufficient balance', async () => {
      await expect(
        custodyManager.initiateWithdrawal(
          'account_123', walletId, 'EQDest123', 'TON', 999999999, 'trader_user'
        )
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Address Whitelisting', () => {
    beforeEach(async () => {
      await custodyManager.configureCustomer('account_123', 'fireblocks', 'mpc');
    });

    it('should add and approve whitelisted address', async () => {
      const addr = await custodyManager.addWhitelistedAddress(
        'account_123',
        'EQAddress123',
        'ton_mainnet',
        'Partner Exchange',
        'admin_user'
      );

      expect(addr.status).toBe('pending');

      await custodyManager.approveWhitelistedAddress(addr.id, 'compliance_officer');
      const approved = await custodyManager.listWhitelistedAddresses('account_123');
      expect(approved[0].status).toBe('approved');
    });

    it('should verify address is whitelisted after approval', async () => {
      const addr = await custodyManager.addWhitelistedAddress(
        'account_123', 'EQAddress123', 'ton_mainnet', 'Partner', 'admin'
      );
      await custodyManager.approveWhitelistedAddress(addr.id, 'admin');

      const isWhitelisted = await custodyManager.isAddressWhitelisted(
        'account_123', 'EQAddress123', 'ton_mainnet'
      );
      expect(isWhitelisted).toBe(true);
    });

    it('should not return removed addresses', async () => {
      const addr = await custodyManager.addWhitelistedAddress(
        'account_123', 'EQAddress123', 'ton_mainnet', 'Partner', 'admin'
      );
      await custodyManager.approveWhitelistedAddress(addr.id, 'admin');
      await custodyManager.removeWhitelistedAddress(addr.id, 'admin');

      const addresses = await custodyManager.listWhitelistedAddresses('account_123');
      expect(addresses.length).toBe(0);
    });
  });

  describe('MPC and Multi-Sig Config', () => {
    it('should return MPC config for MPC custody', async () => {
      await custodyManager.configureCustomer('account_123', 'fireblocks', 'mpc', {
        mpcConfig: { threshold: 3, keyShares: 5, parties: [], refreshInterval: 60, enabled: true },
      });

      const mpcConfig = await custodyManager.getMpcConfig('account_123');
      expect(mpcConfig).toBeDefined();
      expect(mpcConfig?.threshold).toBe(3);
      expect(mpcConfig?.keyShares).toBe(5);
    });

    it('should return multi-sig config for multi-sig custody', async () => {
      await custodyManager.configureCustomer('account_123', 'bitgo', 'multi_sig', {
        multiSigConfig: {
          requiredSignatures: 2,
          totalSigners: 3,
          signers: [],
          scriptType: 'p2wsh',
        },
      });

      const multiSigConfig = await custodyManager.getMultiSigConfig('account_123');
      expect(multiSigConfig).toBeDefined();
      expect(multiSigConfig?.requiredSignatures).toBe(2);
    });
  });
});

// ============================================================================
// Segregated Vault Tests
// ============================================================================

describe('Segregated Vault Architecture', () => {
  let vaultManager: DefaultVaultManager;

  beforeEach(() => {
    vaultManager = createVaultManager();
  });

  describe('Vault Creation & Management', () => {
    it('should create an institutional vault', async () => {
      const vault = await vaultManager.createVault(
        'account_123',
        'Main Trading Vault',
        'institutional',
        'Primary vault for institutional trading',
        'admin_user'
      );

      expect(vault).toBeDefined();
      expect(vault.id).toContain('vault_');
      expect(vault.name).toBe('Main Trading Vault');
      expect(vault.type).toBe('institutional');
      expect(vault.status).toBe('active');
      expect(vault.accountId).toBe('account_123');
    });

    it('should create strategy-restricted vault', async () => {
      const vault = await vaultManager.createVault(
        'account_123',
        'DeFi Vault',
        'strategy_restricted',
        'Restricted to approved DeFi strategies',
        'admin_user',
        {
          strategyRestrictions: [
            {
              strategyId: 'defi_lending',
              strategyName: 'DeFi Lending',
              permission: 'allowed',
              maxAllocation: 500000,
              approvedBy: 'admin_user',
            },
            {
              strategyId: 'high_risk_derivatives',
              strategyName: 'High Risk Derivatives',
              permission: 'prohibited',
              reason: 'Exceeds risk tolerance',
              approvedBy: 'admin_user',
            },
          ],
        }
      );

      expect(vault.type).toBe('strategy_restricted');
      expect(vault.strategyRestrictions.length).toBe(2);
    });

    it('should list vaults for account', async () => {
      await vaultManager.createVault('account_123', 'Vault 1', 'institutional', 'Desc', 'admin');
      await vaultManager.createVault('account_123', 'Vault 2', 'reserve', 'Desc', 'admin');
      await vaultManager.createVault('account_123', 'Vault 3', 'collateral', 'Desc', 'admin');

      const vaults = await vaultManager.listVaults('account_123');
      expect(vaults.length).toBe(3);
    });

    it('should filter vaults by type', async () => {
      await vaultManager.createVault('account_123', 'Trading', 'institutional', 'Desc', 'admin');
      await vaultManager.createVault('account_123', 'Reserve', 'reserve', 'Desc', 'admin');

      const institutionalVaults = await vaultManager.listVaults('account_123', { type: 'institutional' });
      expect(institutionalVaults.length).toBe(1);
      expect(institutionalVaults[0].name).toBe('Trading');
    });

    it('should lock and unlock vault', async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Vault', 'institutional', 'Desc', 'admin'
      );

      await vaultManager.lockVault(vault.id, 'Regulatory hold', 'compliance_officer');
      const locked = await vaultManager.getVault(vault.id);
      expect(locked?.status).toBe('locked');

      await vaultManager.unlockVault(vault.id, 'admin');
      const unlocked = await vaultManager.getVault(vault.id);
      expect(unlocked?.status).toBe('active');
    });

    it('should freeze vault', async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Vault', 'institutional', 'Desc', 'admin'
      );

      await vaultManager.freezeVault(vault.id, 'Court order', 'admin');
      const frozen = await vaultManager.getVault(vault.id);
      expect(frozen?.status).toBe('frozen');
    });
  });

  describe('Asset Management', () => {
    let vaultId: string;

    beforeEach(async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Test Vault', 'institutional', 'Desc', 'admin'
      );
      vaultId = vault.id;
    });

    it('should deposit assets into vault', async () => {
      const asset = await vaultManager.depositAsset(
        vaultId, 'TON', 'ton_mainnet', 100000, 'depositor_user'
      );

      expect(asset).toBeDefined();
      expect(asset.asset).toBe('TON');
      expect(asset.balance).toBe(100000);
      expect(asset.availableAmount).toBe(100000);
    });

    it('should withdraw assets from vault', async () => {
      await vaultManager.depositAsset(vaultId, 'TON', 'ton_mainnet', 100000, 'depositor');
      const asset = await vaultManager.withdrawAsset(vaultId, 'TON', 30000, 'trader');

      expect(asset.balance).toBe(70000);
      expect(asset.availableAmount).toBe(70000);
    });

    it('should allocate assets for strategy', async () => {
      await vaultManager.depositAsset(vaultId, 'USDT', 'ton_mainnet', 500000, 'depositor');
      const asset = await vaultManager.allocateAsset(
        vaultId, 'USDT', 200000, 'DeFi Strategy Alpha', 'risk_manager'
      );

      expect(asset.availableAmount).toBe(300000);
      expect(asset.allocatedAmount).toBe(200000);
      expect(asset.balance).toBe(500000);
    });

    it('should fail withdrawal exceeding available balance', async () => {
      await vaultManager.depositAsset(vaultId, 'TON', 'ton_mainnet', 50000, 'depositor');

      await expect(
        vaultManager.withdrawAsset(vaultId, 'TON', 100000, 'trader')
      ).rejects.toThrow('Insufficient available balance');
    });

    it('should not allow deposits to frozen vault', async () => {
      await vaultManager.freezeVault(vaultId, 'Regulatory hold', 'admin');

      await expect(
        vaultManager.depositAsset(vaultId, 'TON', 'ton_mainnet', 10000, 'depositor')
      ).rejects.toThrow('Cannot deposit to frozen vault');
    });
  });

  describe('Access Control', () => {
    let vaultId: string;

    beforeEach(async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Test Vault', 'institutional', 'Desc', 'admin_user',
        { accessControl: { authorizedRoles: ['admin', 'trader'], authorizedUsers: ['admin_user'] } }
      );
      vaultId = vault.id;
    });

    it('should allow access to authorized user', async () => {
      const result = await vaultManager.checkVaultAccess(vaultId, 'admin_user', 'admin');
      expect(result.allowed).toBe(true);
    });

    it('should allow access to authorized role', async () => {
      const result = await vaultManager.checkVaultAccess(vaultId, 'new_trader', 'trader');
      expect(result.allowed).toBe(true);
    });

    it('should deny access to unauthorized role', async () => {
      const result = await vaultManager.checkVaultAccess(vaultId, 'viewer_user', 'viewer');
      expect(result.allowed).toBe(false);
    });

    it('should grant and revoke user access', async () => {
      await vaultManager.grantAccess(vaultId, 'new_user', 'admin_user');
      const afterGrant = await vaultManager.checkVaultAccess(vaultId, 'new_user', 'viewer');
      expect(afterGrant.allowed).toBe(true);

      await vaultManager.revokeAccess(vaultId, 'new_user', 'admin_user');
      const afterRevoke = await vaultManager.checkVaultAccess(vaultId, 'new_user', 'viewer');
      expect(afterRevoke.allowed).toBe(false);
    });
  });

  describe('Exposure Limits', () => {
    let vaultId: string;

    beforeEach(async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Test Vault', 'institutional', 'Desc', 'admin',
        { exposureLimits: { maxSingleAssetExposure: 1000000, maxTotalExposure: 5000000, maxSingleCounterpartyExposure: 500000, maxLeverage: 2, maxDrawdown: 15, assetClassLimits: {}, protocolLimits: {} } }
      );
      vaultId = vault.id;
    });

    it('should approve deposit within exposure limits', async () => {
      const result = await vaultManager.checkExposureLimit(vaultId, 'TON', 500000);
      expect(result.withinLimits).toBe(true);
      expect(result.limit).toBe(1000000);
    });

    it('should reject deposit exceeding exposure limit', async () => {
      await vaultManager.depositAsset(vaultId, 'TON', 'ton_mainnet', 800000, 'depositor');
      const result = await vaultManager.checkExposureLimit(vaultId, 'TON', 300000);

      expect(result.withinLimits).toBe(false);
      expect(result.reason).toContain('Exposure limit');
    });
  });

  describe('Strategy Restrictions', () => {
    let vaultId: string;

    beforeEach(async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Strategy Vault', 'strategy_restricted', 'Desc', 'admin'
      );
      vaultId = vault.id;
    });

    it('should allow strategies with no restriction configured', async () => {
      const result = await vaultManager.isStrategyAllowed(vaultId, 'any_strategy');
      expect(result.allowed).toBe(true);
      expect(result.permission).toBe('not_configured');
    });

    it('should enforce allowed strategy restriction', async () => {
      await vaultManager.addStrategyRestriction(vaultId, {
        strategyId: 'defi_lending',
        strategyName: 'DeFi Lending',
        permission: 'allowed',
        maxAllocation: 500000,
        approvedBy: 'admin',
      }, 'admin');

      const result = await vaultManager.isStrategyAllowed(vaultId, 'defi_lending');
      expect(result.allowed).toBe(true);
      expect(result.maxAllocation).toBe(500000);
    });

    it('should enforce prohibited strategy restriction', async () => {
      await vaultManager.addStrategyRestriction(vaultId, {
        strategyId: 'high_risk_options',
        strategyName: 'High Risk Options',
        permission: 'prohibited',
        reason: 'Exceeds risk limits',
        approvedBy: 'admin',
      }, 'admin');

      const result = await vaultManager.isStrategyAllowed(vaultId, 'high_risk_options');
      expect(result.allowed).toBe(false);
      expect(result.permission).toBe('prohibited');
    });
  });

  describe('Audit Trail', () => {
    it('should record audit entries for all vault operations', async () => {
      const vault = await vaultManager.createVault(
        'account_123', 'Audit Vault', 'institutional', 'Desc', 'admin'
      );

      await vaultManager.depositAsset(vault.id, 'TON', 'ton_mainnet', 10000, 'trader');
      await vaultManager.lockVault(vault.id, 'Test lock', 'admin');
      await vaultManager.unlockVault(vault.id, 'admin');

      const log = await vaultManager.getAuditLog(vault.id);
      expect(log.length).toBeGreaterThanOrEqual(4); // create, deposit, lock, unlock

      const actions = log.map(e => e.action);
      expect(actions).toContain('create_vault');
      expect(actions).toContain('deposit_asset');
      expect(actions).toContain('lock_vault');
      expect(actions).toContain('unlock_vault');
    });
  });
});

// ============================================================================
// Jurisdiction-Aware Deployment Tests
// ============================================================================

describe('Jurisdiction-Aware Deployment', () => {
  let jurisdictionManager: DefaultJurisdictionManager;

  beforeEach(() => {
    jurisdictionManager = createJurisdictionManager();
  });

  describe('Profile Management', () => {
    it('should create EU jurisdiction profile with MiCA', async () => {
      const profile = await jurisdictionManager.createProfile(
        'account_123',
        'EU',
        ['MiCA', 'MiFID_II', 'GDPR']
      );

      expect(profile).toBeDefined();
      expect(profile.jurisdiction).toBe('EU');
      expect(profile.frameworks).toContain('MiCA');
      expect(profile.frameworks).toContain('MiFID_II');
      expect(profile.enabled).toBe(true);
    });

    it('should create US jurisdiction profile', async () => {
      const profile = await jurisdictionManager.createProfile(
        'account_123',
        'US',
        ['SEC_regulations', 'CFTC', 'FATF_TRAVEL_RULE']
      );

      expect(profile.jurisdiction).toBe('US');
      expect(profile.frameworks).toContain('SEC_regulations');
    });

    it('should retrieve profile by jurisdiction', async () => {
      await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);
      await jurisdictionManager.createProfile('account_123', 'UK', ['FCA']);

      const euProfile = await jurisdictionManager.getProfile('account_123', 'EU');
      expect(euProfile?.jurisdiction).toBe('EU');

      const ukProfile = await jurisdictionManager.getProfile('account_123', 'UK');
      expect(ukProfile?.jurisdiction).toBe('UK');
    });

    it('should list all profiles for account', async () => {
      await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);
      await jurisdictionManager.createProfile('account_123', 'US', ['SEC_regulations']);
      await jurisdictionManager.createProfile('account_123', 'Asia', ['MAS']);

      const profiles = await jurisdictionManager.listProfiles('account_123');
      expect(profiles.length).toBe(3);
    });

    it('should enable and disable profile', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);

      await jurisdictionManager.disableProfile(profile.id);
      const disabled = await jurisdictionManager.getProfile('account_123', 'EU');
      expect(disabled?.enabled).toBe(false);

      await jurisdictionManager.enableProfile(profile.id);
      const enabled = await jurisdictionManager.getProfile('account_123', 'EU');
      expect(enabled?.enabled).toBe(true);
    });
  });

  describe('Default KYC Requirements', () => {
    it('should return EU KYC requirements with enhanced level', async () => {
      const requirements = await jurisdictionManager.getKycRequirements('account_123', 'EU');

      expect(requirements.minimumKycLevel).toBe('enhanced');
      expect(requirements.pepScreeningRequired).toBe(true);
      expect(requirements.adverseMediaRequired).toBe(true);
      expect(requirements.additionalDocuments).toContain('beneficial_ownership');
    });

    it('should return US KYC requirements with tax identification', async () => {
      const requirements = await jurisdictionManager.getKycRequirements('account_123', 'US');

      expect(requirements.minimumKycLevel).toBe('enhanced');
      expect(requirements.additionalDocuments).toContain('tax_identification');
      expect(requirements.localIdRequired).toBe(true);
    });

    it('should return Global KYC requirements (strictest defaults)', async () => {
      const requirements = await jurisdictionManager.getKycRequirements('account_123', 'Global');

      expect(requirements.minimumKycLevel).toBe('institutional');
      expect(requirements.beneficialOwnershipThreshold).toBe(10);
    });
  });

  describe('KYC Compliance Check', () => {
    it('should pass KYC compliance for EU with correct level and documents', async () => {
      const result = await jurisdictionManager.isKycCompliant(
        'account_123',
        'EU',
        'enhanced',
        ['articles_of_incorporation', 'beneficial_ownership']
      );

      expect(result.compliant).toBe(true);
      expect(result.missingDocuments.length).toBe(0);
    });

    it('should fail KYC compliance with insufficient level', async () => {
      const result = await jurisdictionManager.isKycCompliant(
        'account_123',
        'EU',
        'basic', // Below enhanced
        ['articles_of_incorporation', 'beneficial_ownership']
      );

      expect(result.compliant).toBe(false);
      expect(result.requiredLevel).toBe('enhanced');
    });

    it('should fail KYC compliance with missing documents', async () => {
      const result = await jurisdictionManager.isKycCompliant(
        'account_123',
        'EU',
        'enhanced',
        ['articles_of_incorporation'] // Missing beneficial_ownership
      );

      expect(result.compliant).toBe(false);
      expect(result.missingDocuments).toContain('beneficial_ownership');
    });
  });

  describe('Data Residency', () => {
    it('should check EU data residency compliance', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['GDPR']);

      const compliant = await jurisdictionManager.isDataResidencyCompliant(
        profile.id, 'eu-central-1'
      );
      expect(compliant.compliant).toBe(true);
    });

    it('should reject data in prohibited region', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['GDPR']);
      await jurisdictionManager.updateDataResidency(profile.id, {
        prohibitedRegions: ['cn-north-1', 'cn-northwest-1'],
      });

      const result = await jurisdictionManager.isDataResidencyCompliant(
        profile.id, 'cn-north-1'
      );
      expect(result.compliant).toBe(false);
      expect(result.reason).toContain('prohibited');
    });
  });

  describe('Regulatory Reporting Requirements', () => {
    it('should add and retrieve reporting requirement', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);

      await jurisdictionManager.addReportingRequirement(profile.id, {
        framework: 'MiCA',
        reportType: 'periodic_report',
        frequency: 'quarterly',
        deadline: 'end_of_quarter',
        recipient: 'ESMA',
        format: 'xml',
        enabled: true,
      });

      const requirements = await jurisdictionManager.getReportingRequirements(profile.id);
      expect(requirements.length).toBe(1);
      expect(requirements[0].framework).toBe('MiCA');
      expect(requirements[0].frequency).toBe('quarterly');
    });

    it('should filter requirements by framework', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA', 'GDPR']);

      await jurisdictionManager.addReportingRequirement(profile.id, {
        framework: 'MiCA',
        reportType: 'periodic_report',
        frequency: 'quarterly',
        deadline: 'end_of_quarter',
        recipient: 'ESMA',
        format: 'xml',
        enabled: true,
      });
      await jurisdictionManager.addReportingRequirement(profile.id, {
        framework: 'GDPR',
        reportType: 'data_breach',
        frequency: 'on_demand',
        deadline: '72_hours',
        recipient: 'DPA',
        format: 'json',
        enabled: true,
      });

      const micaRequirements = await jurisdictionManager.getReportingRequirements(profile.id, 'MiCA');
      expect(micaRequirements.length).toBe(1);
      expect(micaRequirements[0].framework).toBe('MiCA');
    });
  });

  describe('Multi-Jurisdiction Compliance', () => {
    it('should get all applicable frameworks across jurisdictions', async () => {
      await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA', 'GDPR']);
      await jurisdictionManager.createProfile('account_123', 'US', ['SEC_regulations', 'CFTC']);

      const frameworks = await jurisdictionManager.getApplicableFrameworks('account_123');
      expect(frameworks).toContain('MiCA');
      expect(frameworks).toContain('GDPR');
      expect(frameworks).toContain('SEC_regulations');
      expect(frameworks).toContain('CFTC');
    });

    it('should compute strictest KYC requirements across jurisdictions', async () => {
      // EU: enhanced, US: enhanced, Global: institutional
      await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);
      await jurisdictionManager.createProfile('account_123', 'Global', ['FATF_TRAVEL_RULE']);

      const strictest = await jurisdictionManager.getStrictestKycRequirements('account_123');
      expect(strictest.minimumKycLevel).toBe('institutional'); // Global is stricter
      expect(strictest.beneficialOwnershipThreshold).toBe(10); // Global is stricter (10 < 25)
    });
  });

  describe('Jurisdiction Restrictions', () => {
    it('should check if asset is allowed in jurisdiction', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);
      await jurisdictionManager.addRestriction(profile.id, {
        type: 'asset',
        description: 'Privacy coins prohibited',
        prohibitedItems: ['XMR', 'ZEC'],
        requiresLicense: false,
        effectiveDate: new Date(),
      });

      const xmrResult = await jurisdictionManager.checkAssetAllowed(profile.id, 'XMR');
      expect(xmrResult.allowed).toBe(false);

      const tonResult = await jurisdictionManager.checkAssetAllowed(profile.id, 'TON');
      expect(tonResult.allowed).toBe(true);
    });

    it('should check if service requires license', async () => {
      const profile = await jurisdictionManager.createProfile('account_123', 'EU', ['MiCA']);
      await jurisdictionManager.addRestriction(profile.id, {
        type: 'service',
        description: 'Staking requires MiCA license',
        prohibitedItems: ['staking'],
        requiresLicense: true,
        licenseType: 'MiCA_CASP',
        effectiveDate: new Date(),
      });

      const result = await jurisdictionManager.checkServiceAllowed(profile.id, 'staking');
      expect(result.requiresLicense).toBe(true);
      expect(result.licenseTypes).toContain('MiCA_CASP');
    });
  });
});
