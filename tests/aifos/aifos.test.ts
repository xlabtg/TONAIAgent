/**
 * TONAIAgent - AI-native Financial Operating System (AIFOS) Tests
 *
 * Comprehensive test suite for all 6 layers of AIFOS:
 * 1. Financial Kernel
 * 2. Financial Modules
 * 3. AI Orchestration Layer
 * 4. Application Layer
 * 5. Permission & Identity Layer
 * 6. Interoperability Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAIFOSManager,
  createFinancialKernel,
  createFinancialModules,
  createAIOrchestrationLayer,
  createApplicationLayer,
  createPermissionIdentityLayer,
  createInteroperabilityLayer,
} from '../../src/aifos/index';

// ============================================================================
// Financial Kernel Tests
// ============================================================================

describe('FinancialKernel', () => {
  let kernel: ReturnType<typeof createFinancialKernel>;

  beforeEach(() => {
    kernel = createFinancialKernel();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(kernel.config).toBeDefined();
      expect(kernel.config.enableConstitutionalBounds).toBe(true);
      expect(kernel.config.enableRealTimeRiskMonitoring).toBe(true);
    });

    it('should accept custom configuration', () => {
      const custom = createFinancialKernel({
        enableConstitutionalBounds: false,
        riskAssessmentIntervalMs: 1000,
      });
      expect(custom.config.enableConstitutionalBounds).toBe(false);
      expect(custom.config.riskAssessmentIntervalMs).toBe(1000);
    });
  });

  describe('state management', () => {
    it('should start in running state', () => {
      expect(kernel.getState()).toBe('running');
    });

    it('should transition state', () => {
      kernel.transition('maintenance', 'scheduled maintenance');
      expect(kernel.getState()).toBe('maintenance');
    });

    it('should halt on emergency', () => {
      kernel.halt('critical system failure');
      expect(kernel.getState()).toBe('halted');
    });
  });

  describe('capital state', () => {
    it('should initialize capital state', () => {
      const state = kernel.getCapitalState();
      expect(state.totalManagedCapital).toBe(0);
      expect(state.allocatedCapital).toBe(0);
      expect(state.lastUpdatedAt).toBeInstanceOf(Date);
    });

    it('should update capital state', () => {
      const updated = kernel.updateCapitalState({ totalManagedCapital: 1_000_000_000 });
      expect(updated.totalManagedCapital).toBe(1_000_000_000);
    });

    it('should enforce capital cap', () => {
      const updated = kernel.updateCapitalState({ totalManagedCapital: 999_000_000_000_000 });
      // Should cap at maxSystemCapital ($10T)
      expect(updated.totalManagedCapital).toBeLessThanOrEqual(10_000_000_000_000);
    });

    it('should validate capital operation', () => {
      const result = kernel.validateCapitalOperation(1_000_000, 'allocation');
      expect(result.valid).toBe(true);
      expect(result.remainingCapacity).toBeGreaterThan(0);
    });

    it('should reject operations when halted', () => {
      kernel.halt('test halt');
      const result = kernel.validateCapitalOperation(1_000_000, 'allocation');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('halted');
    });
  });

  describe('risk management', () => {
    it('should initialize risk state', () => {
      const risk = kernel.getRiskState();
      expect(risk.stabilityIndex).toBe(100);
      expect(risk.currentRiskLevel).toBe('minimal');
      expect(risk.activeBreaches).toBe(0);
    });

    it('should assess risk from factors', () => {
      const risk = kernel.assessRisk([
        { name: 'Market Volatility', score: 60, weight: 0.5, source: 'external' },
        { name: 'Liquidity Risk', score: 40, weight: 0.5, source: 'module' },
      ]);
      expect(risk.stabilityIndex).toBeLessThan(100);
      expect(risk.lastAssessedAt).toBeInstanceOf(Date);
    });

    it('should enforce risk boundary', () => {
      const result = kernel.enforceRiskBoundary('critical');
      // Default cap is 'moderate', so 'critical' should be capped
      expect(result.enforced).toBe(true);
      expect(result.newLevel).toBe('moderate');
      expect(result.previousLevel).toBeDefined();
    });

    it('should not enforce boundary if within cap', () => {
      const result = kernel.enforceRiskBoundary('low');
      expect(result.enforced).toBe(false);
      expect(result.newLevel).toBe('low');
    });
  });

  describe('governance', () => {
    it('should initialize governance state', () => {
      const gov = kernel.getGovernanceState();
      expect(gov.constitutionVersion).toBe('1.0.0');
      expect(gov.pendingProposals).toBe(0);
    });

    it('should validate governance quorum', () => {
      expect(kernel.validateGovernanceQuorum(51)).toBe(true);
      expect(kernel.validateGovernanceQuorum(50)).toBe(false);
    });

    it('should apply governance override with sufficient quorum', () => {
      const result = kernel.applyGovernanceOverride({
        overrideType: 'parameter_update',
        proposedBy: 'governance-council',
        approvalPercent: 75,
        targetParameter: 'globalRiskCap',
        targetValue: 'elevated',
        reason: 'Market opportunity window',
      });
      expect(result.applied).toBe(true);
      expect(result.overrideType).toBe('parameter_update');
      expect(result.overrideId).toBeDefined();
    });

    it('should reject governance override with insufficient quorum', () => {
      const result = kernel.applyGovernanceOverride({
        overrideType: 'parameter_update',
        proposedBy: 'minority-group',
        approvalPercent: 30,
        reason: 'Insufficient quorum test',
      });
      expect(result.applied).toBe(false);
    });
  });

  describe('monetary state', () => {
    it('should initialize monetary state', () => {
      const monetary = kernel.getMonetaryState();
      expect(monetary.reserveStabilityScore).toBe(100);
      expect(monetary.totalReserveValueUSD).toBe(0);
    });

    it('should apply monetary adjustment', () => {
      const result = kernel.applyMonetaryAdjustment({
        adjustmentType: 'stability_buffer',
        value: -10,
        targetMetric: 'reserveStabilityScore',
        reason: 'Buffer deployment for stress',
      });
      expect(result.applied).toBe(true);
      expect(result.newValue).toBeLessThan(100);
    });
  });

  describe('events', () => {
    it('should emit events for state changes', () => {
      const events: unknown[] = [];
      kernel.onEvent(e => events.push(e));

      kernel.transition('maintenance', 'test');
      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Financial Modules Tests
// ============================================================================

describe('FinancialModules', () => {
  let modules: ReturnType<typeof createFinancialModules>;

  beforeEach(() => {
    modules = createFinancialModules();
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      expect(modules.config.enableHotReload).toBe(true);
      expect(modules.config.enforceConstitutionalLimits).toBe(true);
    });
  });

  describe('builtin modules', () => {
    it('should have 6 builtin modules pre-registered', () => {
      const all = modules.listModules();
      expect(all.length).toBe(6);
    });

    it('should have asset, liquidity, clearing, treasury, compliance, and sovereign modules', () => {
      const types = modules.listModules().map(m => m.moduleType);
      expect(types).toContain('asset');
      expect(types).toContain('liquidity');
      expect(types).toContain('clearing');
      expect(types).toContain('treasury');
      expect(types).toContain('compliance');
      expect(types).toContain('sovereign_gateway');
    });

    it('should start all builtin modules as active', () => {
      const all = modules.listModules();
      expect(all.every(m => m.status === 'active')).toBe(true);
    });
  });

  describe('module management', () => {
    it('should register a custom module', () => {
      const m = modules.registerModule({
        name: 'Custom Risk Module',
        version: '1.0.0',
        moduleType: 'risk',
        description: 'Custom risk assessment module',
        apiVersion: 'v1',
        author: 'test-developer',
      });

      expect(m.id).toBeDefined();
      expect(m.name).toBe('Custom Risk Module');
      expect(m.status).toBe('active');
    });

    it('should get a module by id', () => {
      const registered = modules.registerModule({
        name: 'Test Module',
        version: '1.0.0',
        moduleType: 'monetary',
        description: 'Test',
        apiVersion: 'v1',
        author: 'tester',
      });

      const fetched = modules.getModule(registered.id);
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Test Module');
    });

    it('should filter modules by type', () => {
      const liquidity = modules.listModules({ moduleType: 'liquidity' });
      expect(liquidity.every(m => m.moduleType === 'liquidity')).toBe(true);
    });

    it('should suspend and resume a module', () => {
      const all = modules.listModules();
      const moduleId = all[0].id;

      modules.suspendModule(moduleId, 'maintenance');
      expect(modules.getModule(moduleId)?.status).toBe('suspended');

      modules.resumeModule(moduleId);
      expect(modules.getModule(moduleId)?.status).toBe('active');
    });

    it('should upgrade a module version', () => {
      const all = modules.listModules({ moduleType: 'asset' });
      const moduleId = all[0].id;

      const upgraded = modules.upgradeModule(moduleId, '2.0.0', { newFeature: true });
      expect(upgraded.version).toBe('2.0.0');
      expect(upgraded.lastUpgradedAt).toBeInstanceOf(Date);
    });
  });

  describe('module execution', () => {
    it('should execute an operation on an active module', () => {
      const m = modules.listModules({ status: 'active' })[0];
      const result = modules.executeModuleOperation({
        moduleId: m.id,
        operation: 'get_balance',
        parameters: {},
        callerId: 'test-caller',
      });

      expect(result.success).toBe(true);
      expect(result.moduleId).toBe(m.id);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should fail execution on suspended module', () => {
      const all = modules.listModules();
      const moduleId = all[0].id;
      modules.suspendModule(moduleId, 'test');

      const result = modules.executeModuleOperation({
        moduleId,
        operation: 'test',
        parameters: {},
        callerId: 'test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('health monitoring', () => {
    it('should get module health', () => {
      const m = modules.listModules()[0];
      const health = modules.getModuleHealth(m.id);

      expect(health.moduleId).toBe(m.id);
      expect(health.checkedAt).toBeInstanceOf(Date);
    });

    it('should get overall modules health', () => {
      const health = modules.getModulesHealth();
      expect(health.totalModules).toBeGreaterThan(0);
      expect(health.activeModules).toBeGreaterThan(0);
      expect(health.overallHealth).toBe('healthy');
    });
  });
});

// ============================================================================
// AI Orchestration Layer Tests
// ============================================================================

describe('AIOrchestrationLayer', () => {
  let orchestration: ReturnType<typeof createAIOrchestrationLayer>;

  beforeEach(() => {
    orchestration = createAIOrchestrationLayer();
  });

  describe('configuration', () => {
    it('should initialize in supervised mode', () => {
      expect(orchestration.getMode()).toBe('supervised');
    });

    it('should accept autonomous mode', () => {
      const auto = createAIOrchestrationLayer({ mode: 'autonomous' });
      expect(auto.getMode()).toBe('autonomous');
    });
  });

  describe('agent decisions', () => {
    it('should propose a decision', () => {
      const decision = orchestration.proposeDecision({
        agentId: 'agent-001',
        decisionType: 'capital_reallocation',
        rationale: 'Optimize yield',
        targetModules: ['module-liquidity', 'module-treasury'],
        proposedActions: [],
        estimatedRiskImpact: -5,
        estimatedCapitalImpact: 500_000,
      });

      expect(decision.id).toBeDefined();
      expect(decision.agentId).toBe('agent-001');
      expect(decision.decisionType).toBe('capital_reallocation');
      // In supervised mode, decisions require approval
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.status).toBe('proposed');
      expect(decision.proposedAt).toBeInstanceOf(Date);
    });

    it('should auto-approve small decisions in autonomous mode', () => {
      const auto = createAIOrchestrationLayer({
        mode: 'autonomous',
        maxAutonomousCapitalUSD: 5_000_000,
      });

      const decision = auto.proposeDecision({
        agentId: 'agent-001',
        decisionType: 'risk_recalibration',
        rationale: 'Auto risk adjustment',
        targetModules: [],
        proposedActions: [],
        estimatedRiskImpact: -2,
        estimatedCapitalImpact: 1_000_000, // Below max autonomous
      });

      expect(decision.requiresHumanApproval).toBe(false);
      expect(decision.status).toBe('approved');
    });

    it('should approve and execute a decision', () => {
      const decision = orchestration.proposeDecision({
        agentId: 'agent-001',
        decisionType: 'capital_reallocation',
        rationale: 'Test',
        targetModules: [],
        proposedActions: [
          { actionType: 'transfer', targetModuleId: 'module-1', parameters: {}, expectedOutcome: 'success', rollbackAvailable: true },
        ],
        estimatedRiskImpact: 0,
        estimatedCapitalImpact: 100_000,
      });

      const approved = orchestration.approveDecision(decision.id, 'governance-council');
      expect(approved.status).toBe('approved');

      const result = orchestration.executeDecision(decision.id);
      expect(result.success).toBe(true);
      expect(result.actionsExecuted).toBe(1);
    });

    it('should reject a decision', () => {
      const decision = orchestration.proposeDecision({
        agentId: 'agent-001',
        decisionType: 'capital_reallocation',
        rationale: 'Test',
        targetModules: [],
        proposedActions: [],
        estimatedRiskImpact: 0,
        estimatedCapitalImpact: 0,
      });

      const rejected = orchestration.rejectDecision(decision.id, 'Too risky');
      expect(rejected.status).toBe('rejected');
    });

    it('should list decisions with filters', () => {
      orchestration.proposeDecision({
        agentId: 'agent-001',
        decisionType: 'capital_reallocation',
        rationale: 'Test 1',
        targetModules: [],
        proposedActions: [],
        estimatedRiskImpact: 0,
        estimatedCapitalImpact: 0,
      });

      orchestration.proposeDecision({
        agentId: 'agent-002',
        decisionType: 'risk_recalibration',
        rationale: 'Test 2',
        targetModules: [],
        proposedActions: [],
        estimatedRiskImpact: -5,
        estimatedCapitalImpact: 0,
      });

      const byAgent = orchestration.listDecisions({ agentId: 'agent-001' });
      expect(byAgent.every(d => d.agentId === 'agent-001')).toBe(true);
    });
  });

  describe('capital reallocation', () => {
    it('should propose capital reallocation', () => {
      const proposal = orchestration.proposeCapitalReallocation({
        requestedBy: 'agent-001',
        sourceModuleId: 'module-treasury',
        targetModuleId: 'module-liquidity',
        amount: 5_000_000,
        reason: 'Liquidity optimization',
        priority: 'medium',
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.amount).toBe(5_000_000);
      expect(proposal.status).toBe('pending');
    });

    it('should execute capital reallocation', () => {
      const proposal = orchestration.proposeCapitalReallocation({
        requestedBy: 'agent-001',
        sourceModuleId: 'module-treasury',
        targetModuleId: 'module-liquidity',
        amount: 1_000_000,
        reason: 'Test',
        priority: 'low',
      });

      const result = orchestration.executeCapitalReallocation(proposal.id);
      expect(result.success).toBe(true);
      expect(result.amountMoved).toBe(1_000_000);
    });
  });

  describe('crisis response', () => {
    it('should have a default liquidity crisis plan', () => {
      const plans = orchestration.listCrisisPlans({ scenarioType: 'liquidity_crisis' });
      expect(plans.length).toBeGreaterThan(0);
    });

    it('should register a custom crisis plan', () => {
      const plan = orchestration.registerCrisisResponsePlan({
        scenarioType: 'market_crash',
        severityThreshold: 'critical',
        automatedActions: [
          {
            actionType: 'emergency_liquidity_injection',
            targetModuleId: 'module-treasury',
            parameters: { amount: 500_000_000 },
            expectedOutcome: 'Stabilize markets',
            rollbackAvailable: false,
          },
        ],
        requiresGovernanceApproval: true,
        estimatedResponseTimeMs: 10_000,
      });

      expect(plan.id).toBeDefined();
      expect(plan.scenarioType).toBe('market_crash');
      expect(plan.isActive).toBe(true);
    });

    it('should activate a crisis plan', () => {
      const plans = orchestration.listCrisisPlans({ isActive: true });
      const result = orchestration.activateCrisisPlan(plans[0].id);
      expect(result.activated).toBe(true);
      expect(result.activatedAt).toBeInstanceOf(Date);
    });
  });

  describe('orchestration boundaries', () => {
    it('should check capital limit boundary', () => {
      const result = orchestration.checkBoundary('capital_limit', 1_000_000);
      expect(result.withinBounds).toBe(true);
    });

    it('should detect boundary violation', () => {
      const result = orchestration.checkBoundary('capital_limit', 100_000_000_000);
      expect(result.withinBounds).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should list all boundaries', () => {
      const boundaries = orchestration.listBoundaries();
      expect(boundaries.length).toBeGreaterThan(0);
      const types = boundaries.map(b => b.boundaryType);
      expect(types).toContain('risk_cap');
      expect(types).toContain('capital_limit');
    });
  });

  describe('metrics', () => {
    it('should return orchestration metrics', () => {
      const metrics = orchestration.getOrchestrationMetrics();
      expect(metrics.totalDecisions).toBeGreaterThanOrEqual(0);
      expect(metrics.currentMode).toBe('supervised');
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Application Layer Tests
// ============================================================================

describe('ApplicationLayer', () => {
  let apps: ReturnType<typeof createApplicationLayer>;

  beforeEach(() => {
    apps = createApplicationLayer();
  });

  describe('configuration', () => {
    it('should initialize with defaults', () => {
      expect(apps.config.enableAppMarketplace).toBe(true);
      expect(apps.config.sandboxModeEnabled).toBe(true);
    });
  });

  describe('app registration', () => {
    it('should register an AI hedge fund app', () => {
      const app = apps.registerApp({
        name: 'Alpha Hedge Fund',
        appType: 'ai_hedge_fund',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'Autonomous AI hedge fund',
        capitalBudget: 50_000_000,
      });

      expect(app.id).toBeDefined();
      expect(app.name).toBe('Alpha Hedge Fund');
      expect(app.appType).toBe('ai_hedge_fund');
      expect(app.capitalBudget).toBe(50_000_000);
      expect(app.registeredAt).toBeInstanceOf(Date);
    });

    it('should register multiple app types', () => {
      const types = ['ai_hedge_fund', 'institutional_vault', 'sovereign_allocation_node', 'strategy_marketplace', 'retail_finance_app'] as const;

      for (const appType of types) {
        const app = apps.registerApp({
          name: `Test ${appType}`,
          appType,
          developer: 'dev-001',
          version: '1.0.0',
          description: 'Test',
        });
        expect(app.appType).toBe(appType);
      }
    });

    it('should start apps in registered status (sandbox mode)', () => {
      const app = apps.registerApp({
        name: 'Sandbox App',
        appType: 'retail_finance_app',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'Sandbox test',
      });
      expect(app.status).toBe('registered');
    });

    it('should activate and suspend apps', () => {
      const app = apps.registerApp({
        name: 'Test App',
        appType: 'dao_treasury',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'Test',
      });

      apps.activateApp(app.id);
      expect(apps.getApp(app.id)?.status).toBe('active');

      apps.suspendApp(app.id, 'compliance review');
      expect(apps.getApp(app.id)?.status).toBe('suspended');
    });
  });

  describe('marketplace', () => {
    it('should publish app to marketplace', () => {
      const app = apps.registerApp({
        name: 'Marketplace App',
        appType: 'strategy_marketplace',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'Test marketplace app',
      });

      const entry = apps.publishToMarketplace(app.id, {
        displayName: 'Super Strategy Marketplace',
        tags: ['defi', 'strategies', 'ai'],
        pricing: 'revenue_share',
      });

      expect(entry.appId).toBe(app.id);
      expect(entry.tags).toContain('defi');
      expect(entry.featured).toBe(false);
    });

    it('should feature an app', () => {
      const app = apps.registerApp({
        name: 'Featured App',
        appType: 'ai_hedge_fund',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'Featured',
      });

      apps.publishToMarketplace(app.id, { displayName: 'Featured App', tags: [], pricing: 'free' });
      apps.featureApp(app.id);

      const featured = apps.listMarketplace({ featured: true });
      expect(featured.some(e => e.appId === app.id)).toBe(true);
    });
  });

  describe('SDK capabilities', () => {
    it('should have builtin SDK capabilities', () => {
      const caps = apps.getSDKCapabilities();
      expect(caps.length).toBeGreaterThan(0);
    });

    it('should filter capabilities by permission', () => {
      const caps = apps.listAvailableCapabilities(['kernel_read', 'app_execute']);
      expect(caps.every(c => ['kernel_read', 'app_execute'].includes(c.requiredPermission))).toBe(true);
    });
  });

  describe('ecosystem metrics', () => {
    it('should return ecosystem metrics', () => {
      apps.registerApp({
        name: 'Fund A',
        appType: 'ai_hedge_fund',
        developer: 'dev-001',
        version: '1.0.0',
        description: 'A',
      });

      const metrics = apps.getEcosystemMetrics();
      expect(metrics.totalApps).toBeGreaterThan(0);
      expect(metrics.totalDevelopers).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Permission & Identity Layer Tests
// ============================================================================

describe('PermissionIdentityLayer', () => {
  let identity: ReturnType<typeof createPermissionIdentityLayer>;

  beforeEach(() => {
    identity = createPermissionIdentityLayer();
  });

  describe('configuration', () => {
    it('should initialize with defaults', () => {
      expect(identity.config.enableRoleBasedAccess).toBe(true);
      expect(identity.config.enableGovernanceDelegation).toBe(true);
    });
  });

  describe('identity management', () => {
    it('should create a sovereign identity', () => {
      const id = identity.createIdentity({
        name: 'Norway Central Bank',
        identityType: 'sovereign',
        roles: ['sovereign_node'],
        permissions: ['governance_vote', 'governance_propose'],
        jurisdiction: 'NO',
        kycLevel: 'sovereign',
      });

      expect(id.id).toBeDefined();
      expect(id.name).toBe('Norway Central Bank');
      expect(id.identityType).toBe('sovereign');
      expect(id.kycLevel).toBe('sovereign');
      expect(id.issuedAt).toBeInstanceOf(Date);
      expect(id.expiresAt).toBeInstanceOf(Date);
    });

    it('should create institutional identity', () => {
      const id = identity.createIdentity({
        name: 'Blackrock',
        identityType: 'institution',
        roles: ['institutional_node'],
        kycLevel: 'institutional',
        jurisdiction: 'US',
      });

      expect(id.identityType).toBe('institution');
      expect(id.kycLevel).toBe('institutional');
    });

    it('should revoke an identity', () => {
      const id = identity.createIdentity({ name: 'Test', identityType: 'individual' });
      identity.revokeIdentity(id.id, 'compliance violation');

      const fetched = identity.getIdentity(id.id);
      expect(fetched?.complianceStatus).toBe('suspended');
    });
  });

  describe('roles and permissions', () => {
    it('should grant and revoke roles', () => {
      const id = identity.createIdentity({ name: 'User', identityType: 'individual' });

      identity.grantRole(id.id, 'auditor');
      expect(identity.hasRole(id.id, 'auditor')).toBe(true);

      identity.revokeRole(id.id, 'auditor');
      expect(identity.hasRole(id.id, 'auditor')).toBe(false);
    });

    it('should grant and revoke permissions', () => {
      const id = identity.createIdentity({ name: 'User', identityType: 'individual' });

      identity.grantPermission(id.id, 'kernel_read');
      expect(identity.hasPermission(id.id, 'kernel_read')).toBe(true);

      identity.revokePermission(id.id, 'kernel_read');
      expect(identity.hasPermission(id.id, 'kernel_read')).toBe(false);
    });

    it('should check access', () => {
      const id = identity.createIdentity({
        name: 'User',
        identityType: 'individual',
        permissions: ['capital_allocate'],
      });

      const result = identity.checkAccess(id.id, 'capital_allocate');
      expect(result.granted).toBe(true);
      expect(result.grantedVia).toBe('direct');

      const denied = identity.checkAccess(id.id, 'emergency_action');
      expect(denied.granted).toBe(false);
    });

    it('should grant access via kernel_admin role', () => {
      const id = identity.createIdentity({
        name: 'Admin',
        identityType: 'individual',
        roles: ['kernel_admin'],
      });

      const result = identity.checkAccess(id.id, 'emergency_action');
      expect(result.granted).toBe(true);
      expect(result.grantedVia).toBe('role');
    });
  });

  describe('governance delegation', () => {
    it('should create a delegation', () => {
      const delegator = identity.createIdentity({ name: 'Delegator', identityType: 'institution' });
      const delegatee = identity.createIdentity({ name: 'Delegatee', identityType: 'individual' });

      const delegation = identity.createDelegation({
        delegatorId: delegator.id,
        delegateeId: delegatee.id,
        scope: ['governance_vote'],
        votingPowerPercent: 30,
        revocable: true,
      });

      expect(delegation.id).toBeDefined();
      expect(delegation.votingPowerPercent).toBe(30);
      expect(delegation.isActive).toBe(true);
    });

    it('should compute effective voting power', () => {
      const delegator = identity.createIdentity({ name: 'Delegator', identityType: 'institution' });
      const delegatee = identity.createIdentity({ name: 'Delegatee', identityType: 'individual' });

      identity.createDelegation({
        delegatorId: delegator.id,
        delegateeId: delegatee.id,
        scope: ['governance_vote'],
        votingPowerPercent: 25,
      });

      const power = identity.getEffectiveVotingPower(delegatee.id);
      expect(power).toBe(25);
    });

    it('should revoke a delegation', () => {
      const delegator = identity.createIdentity({ name: 'D1', identityType: 'institution' });
      const delegatee = identity.createIdentity({ name: 'D2', identityType: 'individual' });

      const delegation = identity.createDelegation({
        delegatorId: delegator.id,
        delegateeId: delegatee.id,
        scope: ['governance_vote'],
        votingPowerPercent: 10,
      });

      identity.revokeDelegation(delegation.id, 'expired relationship');
      const active = identity.listDelegations({ isActive: true });
      expect(active.find(d => d.id === delegation.id)).toBeUndefined();
    });
  });

  describe('compliance gates', () => {
    it('should have builtin compliance gates', () => {
      const gates = identity.listComplianceGates();
      expect(gates.length).toBeGreaterThan(0);
    });

    it('should pass compliance gate for qualified identity', () => {
      const gates = identity.listComplianceGates();
      const institutionalGate = gates.find(g => g.name === 'Institutional Capital Access');
      expect(institutionalGate).toBeDefined();

      const id = identity.createIdentity({
        name: 'Institutional Actor',
        identityType: 'institution',
        roles: ['institutional_node'],
        kycLevel: 'institutional',
      });

      const result = identity.passesComplianceGate(id.id, institutionalGate!.gateId);
      expect(result.passed).toBe(true);
    });

    it('should fail compliance gate for unqualified identity', () => {
      const gates = identity.listComplianceGates();
      const sovereignGate = gates.find(g => g.name === 'Sovereign Operations Gate');
      expect(sovereignGate).toBeDefined();

      const id = identity.createIdentity({
        name: 'Basic User',
        identityType: 'individual',
        kycLevel: 'basic',
      });

      const result = identity.passesComplianceGate(id.id, sovereignGate!.gateId);
      expect(result.passed).toBe(false);
      expect(result.failureReasons.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Interoperability Layer Tests
// ============================================================================

describe('InteroperabilityLayer', () => {
  let interop: ReturnType<typeof createInteroperabilityLayer>;

  beforeEach(() => {
    interop = createInteroperabilityLayer();
  });

  describe('configuration', () => {
    it('should initialize with defaults', () => {
      expect(interop.config.enableCrossChainAbstraction).toBe(true);
      expect(interop.config.enableProtocolBridges).toBe(true);
    });
  });

  describe('builtin channels', () => {
    it('should have builtin channels pre-registered', () => {
      const channels = interop.listChannels();
      expect(channels.length).toBeGreaterThan(0);
    });

    it('should have a TON-ETH channel', () => {
      const tonEth = interop.listChannels({ sourceChain: 'ton' });
      expect(tonEth.length).toBeGreaterThan(0);
    });
  });

  describe('channel management', () => {
    it('should open a new channel', () => {
      const channel = interop.openChannel({
        name: 'TON-Polygon Bridge',
        protocol: 'cross_chain_message',
        sourceEndpoint: 'ton://mainnet',
        destinationEndpoint: 'polygon://mainnet',
        sourceChain: 'ton',
        destinationChain: 'polygon',
      });

      expect(channel.id).toBeDefined();
      expect(channel.status).toBe('active');
      expect(channel.encryptionEnabled).toBe(true);
    });

    it('should test channel health', () => {
      const channels = interop.listChannels({ status: 'active' });
      const health = interop.testChannelHealth(channels[0].id);

      expect(health.healthy).toBe(true);
      expect(health.latencyMs).toBeGreaterThan(0);
    });

    it('should close a channel', () => {
      const channel = interop.openChannel({
        name: 'Temp Channel',
        protocol: 'rest_api',
        sourceEndpoint: 'https://source.example.com',
        destinationEndpoint: 'https://dest.example.com',
      });

      interop.closeChannel(channel.id, 'testing closure');
      expect(interop.getChannel(channel.id)?.status).toBe('offline');
    });
  });

  describe('external API integrations', () => {
    it('should register an external API', () => {
      const api = interop.registerExternalAPI({
        name: 'CoinGecko',
        provider: 'CoinGecko',
        integrationCategory: 'market_data',
        baseUrl: 'https://api.coingecko.com/api/v3',
        version: 'v3',
        authMethod: 'api_key',
      });

      expect(api.id).toBeDefined();
      expect(api.healthStatus).toBe('healthy');
    });

    it('should update API health status', () => {
      const api = interop.registerExternalAPI({
        name: 'Test API',
        provider: 'Test',
        integrationCategory: 'oracle',
        baseUrl: 'https://test.example.com',
        version: 'v1',
        authMethod: 'api_key',
      });

      interop.updateAPIStatus(api.id, 'degraded');
      expect(interop.getExternalAPI(api.id)?.healthStatus).toBe('degraded');
    });
  });

  describe('protocol bridges', () => {
    it('should have builtin ISO 20022 bridge', () => {
      const bridges = interop.listProtocolBridges({ sourceProtocol: 'on_chain_tx' });
      expect(bridges.length).toBeGreaterThan(0);
      expect(bridges[0].bridgeName).toContain('ISO 20022');
    });

    it('should register a custom protocol bridge', () => {
      const bridge = interop.registerProtocolBridge({
        bridgeName: 'FIX Protocol Bridge',
        sourceProtocol: 'on_chain_tx',
        targetProtocol: 'fix_protocol',
        supportedAssets: ['USDT', 'BTC'],
        supportedChains: ['ton', 'ethereum'],
        translationCapabilities: ['on_chain_tx_to_fix_protocol'],
        securityModel: 'trustless',
      });

      expect(bridge.id).toBeDefined();
      expect(bridge.status).toBe('active');
    });

    it('should translate a message using a bridge', () => {
      const bridges = interop.listProtocolBridges({ status: 'active' });
      const result = interop.translateMessage({
        bridgeId: bridges[0].id,
        message: { amount: 1_000, asset: 'USDT', from: 'EQ...', to: 'EQ...' },
        sourceFormat: 'on_chain_tx',
        targetFormat: 'iso20022',
      });

      expect(result.success).toBe(true);
      expect(result.translatedMessage).toBeDefined();
    });
  });

  describe('cross-chain routing', () => {
    it('should compute a cross-chain route', () => {
      const result = interop.routeCrossChain({
        sourceChain: 'ton',
        destinationChain: 'ethereum',
        asset: 'USDT',
        amount: 1_000_000,
      });

      expect(result.routeId).toBeDefined();
      expect(result.computedAt).toBeInstanceOf(Date);
    });

    it('should return supported chains', () => {
      const chains = interop.getSupportedChains();
      expect(chains.length).toBeGreaterThan(0);
      expect(chains).toContain('ton');
    });

    it('should return chain connectivity report', () => {
      const report = interop.getChainConnectivity('ton');
      expect(report.chain).toBe('ton');
      expect(report.checkedAt).toBeInstanceOf(Date);
    });
  });

  describe('interop summary', () => {
    it('should return interop summary', () => {
      const summary = interop.getInteropSummary();
      expect(summary.totalChannels).toBeGreaterThan(0);
      expect(summary.activeChannels).toBeGreaterThan(0);
      expect(summary.protocolBridges).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Unified AIFOS Manager Tests
// ============================================================================

describe('AIFOSManager (Unified)', () => {
  let aifos: ReturnType<typeof createAIFOSManager>;

  beforeEach(() => {
    aifos = createAIFOSManager();
  });

  it('should initialize all layers', () => {
    expect(aifos.kernel).toBeDefined();
    expect(aifos.modules).toBeDefined();
    expect(aifos.orchestration).toBeDefined();
    expect(aifos.applications).toBeDefined();
    expect(aifos.identity).toBeDefined();
    expect(aifos.interoperability).toBeDefined();
  });

  it('should return system status', () => {
    const status = aifos.getSystemStatus();

    expect(status.kernelState).toBe('running');
    expect(status.kernelVersion).toBe('1.0.0');
    expect(status.totalManagedCapitalUSD).toBe(0);
    expect(status.currentRiskLevel).toBeDefined();
    expect(status.stabilityIndex).toBe(100);
    expect(status.totalModules).toBeGreaterThan(0);
    expect(status.activeModules).toBeGreaterThan(0);
    expect(status.orchestrationMode).toBe('supervised');
    expect(status.generatedAt).toBeInstanceOf(Date);
  });

  it('should demonstrate OS-level modularity end-to-end', () => {
    // 1. Kernel is running
    expect(aifos.kernel.getState()).toBe('running');

    // 2. Modules are loaded
    const liquidityModules = aifos.modules.listModules({ moduleType: 'liquidity' });
    expect(liquidityModules.length).toBeGreaterThan(0);
    const treasuryModules = aifos.modules.listModules({ moduleType: 'treasury' });
    expect(treasuryModules.length).toBeGreaterThan(0);

    // 3. AI orchestration proposes decision
    const decision = aifos.orchestration.proposeDecision({
      agentId: 'agent-demo',
      decisionType: 'capital_reallocation',
      rationale: 'Demo: Optimize yield allocation',
      targetModules: [liquidityModules[0].id, treasuryModules[0].id],
      proposedActions: [],
      estimatedRiskImpact: -3,
      estimatedCapitalImpact: 5_000_000,
    });
    expect(decision.id).toBeDefined();

    // 4. Governance parameter update
    const override = aifos.kernel.applyGovernanceOverride({
      overrideType: 'parameter_update',
      proposedBy: 'governance-council',
      approvalPercent: 67,
      reason: 'Demo governance action',
    });
    expect(override.applied).toBe(true);

    // 5. Launch a demo application
    const app = aifos.applications.registerApp({
      name: 'Demo AI Hedge Fund',
      appType: 'ai_hedge_fund',
      developer: 'demo-dev',
      version: '1.0.0',
      description: 'Demo application on AIFOS',
      capitalBudget: 100_000_000,
      requiredPermissions: ['capital_allocate', 'app_execute'],
    });
    expect(app.id).toBeDefined();

    // 6. Create identity for app developer
    const devIdentity = aifos.identity.createIdentity({
      name: 'Demo Developer',
      identityType: 'individual',
      roles: ['app_developer'],
      permissions: ['app_register', 'app_execute'],
    });
    expect(devIdentity.id).toBeDefined();

    // 7. Verify cross-chain connectivity
    const channels = aifos.interoperability.listChannels({ status: 'active' });
    expect(channels.length).toBeGreaterThan(0);

    // 8. Get full system status
    const status = aifos.getSystemStatus();
    expect(status.registeredApps).toBeGreaterThan(0);
    expect(status.totalIdentities).toBeGreaterThan(0);
    expect(status.activeInteropChannels).toBeGreaterThan(0);
  });

  it('should accept custom config', () => {
    const custom = createAIFOSManager({
      orchestration: { mode: 'autonomous', maxAutonomousCapitalUSD: 50_000_000 },
      kernel: { enableConstitutionalBounds: true },
    });

    expect(custom.orchestration.getMode()).toBe('autonomous');
    expect(custom.kernel.config.enableConstitutionalBounds).toBe(true);
  });

  it('should forward events from all layers', () => {
    const events: unknown[] = [];
    aifos.onEvent(e => events.push(e));

    // Trigger events from different layers
    aifos.kernel.transition('maintenance', 'test');
    aifos.applications.registerApp({
      name: 'Event Test App',
      appType: 'dao_treasury',
      developer: 'dev-test',
      version: '1.0.0',
      description: 'Testing events',
    });

    expect(events.length).toBeGreaterThan(0);
  });
});
