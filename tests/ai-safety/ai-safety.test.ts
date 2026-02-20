/**
 * TONAIAgent - AI Safety, Alignment & Governance Tests
 *
 * Comprehensive unit tests for the AI Safety Framework.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAISafetyManager,
  createAlignmentManager,
  createGuardrailsManager,
  createModelGovernanceManager,
  createMonitoringManager,
  createHumanOversightManager,
  DefaultAlignmentManager,
  DefaultGuardrailsManager,
  DefaultModelGovernanceManager,
  DefaultMonitoringManager,
  DefaultHumanOversightManager,
} from '../../src/ai-safety';

// ============================================================================
// Alignment Manager Tests
// ============================================================================

describe('AlignmentManager', () => {
  let alignment: DefaultAlignmentManager;

  beforeEach(() => {
    alignment = createAlignmentManager();
  });

  describe('Goal Management', () => {
    it('should register a goal', async () => {
      const goal = await alignment.registerGoal('agent-1', {
        type: 'yield_optimization',
        description: 'Optimize yield across DeFi protocols',
        priority: 1,
        constraints: [{ type: 'max_loss', value: 5, strict: true, description: 'Max 5% loss' }],
        metrics: [{ name: 'apy', target: 10, weight: 1, direction: 'maximize' }],
      });

      expect(goal).toBeDefined();
      expect(goal.id).toBeDefined();
      expect(goal.type).toBe('yield_optimization');
      expect(goal.status).toBe('active');
    });

    it('should validate goals', async () => {
      const goal = await alignment.registerGoal('agent-1', {
        type: 'profit_maximization',
        description: 'Maximize profits',
        priority: 1,
        constraints: [],
        metrics: [{ name: 'profit', target: 1000, weight: 1, direction: 'maximize' }],
      });

      const validation = await alignment.validateGoal(goal);

      expect(validation).toBeDefined();
      expect(validation.alignmentScore).toBeGreaterThan(0);
    });

    it('should detect conflicting goals', async () => {
      await alignment.registerGoal('agent-1', {
        type: 'profit_maximization',
        description: 'Maximize profits',
        priority: 1,
        constraints: [],
        metrics: [],
      });

      await alignment.registerGoal('agent-1', {
        type: 'risk_minimization',
        description: 'Minimize risk',
        priority: 1,
        constraints: [],
        metrics: [],
      });

      const goals = await alignment.getGoals('agent-1');
      const validation = await alignment.validateGoals(goals);

      expect(validation.conflictingGoals.length).toBeGreaterThan(0);
    });

    it('should reject invalid goal types', async () => {
      await expect(
        alignment.registerGoal('agent-1', {
          type: 'invalid_type' as any,
          description: 'Invalid goal',
          priority: 1,
          constraints: [],
          metrics: [],
        })
      ).rejects.toThrow();
    });

    it('should get goals for agent', async () => {
      await alignment.registerGoal('agent-1', {
        type: 'staking',
        description: 'Stake tokens',
        priority: 1,
        constraints: [],
        metrics: [],
      });

      const goals = await alignment.getGoals('agent-1');

      expect(goals.length).toBe(1);
      expect(goals[0].type).toBe('staking');
    });
  });

  describe('Strategy Consistency', () => {
    it('should check strategy consistency', async () => {
      const result = await alignment.checkConsistency('agent-1', {
        id: 'strategy-1',
        name: 'Test Strategy',
        parameters: { leverage: 2 },
        expectedBehavior: 'Standard trading',
      });

      expect(result).toBeDefined();
      expect(result.consistencyScore).toBeDefined();
    });

    it('should record strategy execution', async () => {
      await alignment.recordStrategyExecution('agent-1', {
        strategyId: 'strategy-1',
        action: 'trade',
        parameters: { amount: 100 },
        result: { success: true },
        timestamp: new Date(),
      });

      // Record multiple executions to build history
      for (let i = 0; i < 25; i++) {
        await alignment.recordStrategyExecution('agent-1', {
          strategyId: 'strategy-1',
          action: 'trade',
          parameters: { amount: 100 + i },
          result: { success: true },
          timestamp: new Date(),
        });
      }

      const drift = await alignment.detectDrift('agent-1');

      expect(drift).toBeDefined();
      expect(drift.recommendation).toBeDefined();
    });
  });

  describe('Boundary Enforcement', () => {
    it('should check boundaries for small transactions', async () => {
      const result = await alignment.checkBoundaries('agent-1', {
        type: 'transfer',
        parameters: {},
        estimatedValue: 100,
      });

      expect(result.allowed).toBe(true);
      expect(result.hardLimitViolations.length).toBe(0);
    });

    it('should block transactions exceeding hard limits', async () => {
      const result = await alignment.checkBoundaries('agent-1', {
        type: 'transfer',
        parameters: {},
        estimatedValue: 15000, // Exceeds default 10000 limit
      });

      expect(result.allowed).toBe(false);
      expect(result.hardLimitViolations.length).toBeGreaterThan(0);
    });

    it('should warn for transactions near soft limits', async () => {
      const result = await alignment.checkBoundaries('agent-1', {
        type: 'transfer',
        parameters: {},
        estimatedValue: 1500, // Above warning threshold
      });

      expect(result.softLimitWarnings.length).toBeGreaterThan(0);
    });

    it('should register custom hard limits', () => {
      alignment.registerHardLimit({
        id: 'custom_limit',
        name: 'Custom Limit',
        type: 'transaction_value',
        value: 500,
        scope: 'agent',
      });

      const limits = alignment.getLimits();

      expect(limits.hard.some((l) => l.id === 'custom_limit')).toBe(true);
    });
  });

  describe('Intent Verification', () => {
    it('should register and verify intent', async () => {
      const intent = await alignment.registerIntent('agent-1', {
        action: 'trade',
        parameters: { pair: 'TON/USDT' },
        reasoning: 'Price analysis indicates upward momentum',
        expectedReturn: 5,
        expectedRisk: 2,
        timeHorizon: '1h',
        assumptions: ['Market remains stable'],
      });

      expect(intent).toBeDefined();
      expect(intent.status).toBeDefined();
    });

    it('should get intent history', async () => {
      await alignment.registerIntent('agent-1', {
        action: 'trade',
        parameters: {},
        reasoning: 'Test intent',
        expectedReturn: 3,
        expectedRisk: 1,
        timeHorizon: '1h',
        assumptions: [],
      });

      const history = await alignment.getIntentHistory('agent-1');

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Alignment Scoring', () => {
    it('should calculate alignment score', async () => {
      await alignment.registerGoal('agent-1', {
        type: 'staking',
        description: 'Stake tokens',
        priority: 1,
        constraints: [{ type: 'max_loss', value: 5, strict: true, description: 'Limit loss' }],
        metrics: [{ name: 'apy', target: 10, weight: 1, direction: 'maximize' }],
      });

      const score = await alignment.calculateAlignmentScore('agent-1');

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================================================
// Guardrails Manager Tests
// ============================================================================

describe('GuardrailsManager', () => {
  let guardrails: DefaultGuardrailsManager;

  beforeEach(() => {
    guardrails = createGuardrailsManager();
  });

  describe('Strategy Validation', () => {
    it('should validate a valid strategy', async () => {
      const result = await guardrails.validateStrategy({
        id: 'strategy-1',
        name: 'DCA Strategy',
        type: 'dca',
        parameters: { leverage: 1, interval: 'daily' },
        backtestResults: {
          period: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
          totalReturn: 25,
          maxDrawdown: 10,
          sharpeRatio: 1.5,
          winRate: 0.6,
          tradesCount: 100,
        },
      });

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should warn for strategies without backtest', async () => {
      const result = await guardrails.validateStrategy({
        id: 'strategy-1',
        name: 'New Strategy',
        type: 'trading',
        parameters: { leverage: 1 },
      });

      expect(result.requiresBacktest).toBe(true);
      expect(result.warnings.some((w) => w.ruleId === 'backtest_required')).toBe(true);
    });

    it('should block strategies with high leverage', async () => {
      const result = await guardrails.validateStrategy({
        id: 'strategy-1',
        name: 'High Leverage Strategy',
        type: 'trading',
        parameters: { leverage: 10 },
      });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((v) => v.ruleId === 'max_leverage')).toBe(true);
    });

    it('should block blocked strategies', async () => {
      guardrails.blockStrategy('strategy-blocked', 'Security concern');

      const result = await guardrails.validateStrategy({
        id: 'strategy-blocked',
        name: 'Blocked Strategy',
        type: 'trading',
        parameters: {},
      });

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.ruleId === 'blocked_strategy')).toBe(true);
    });

    it('should unblock strategies', async () => {
      guardrails.blockStrategy('strategy-temp', 'Temporary');
      guardrails.unblockStrategy('strategy-temp');

      const result = await guardrails.validateStrategy({
        id: 'strategy-temp',
        name: 'Previously Blocked',
        type: 'trading',
        parameters: {},
      });

      expect(result.violations.some((v) => v.ruleId === 'blocked_strategy')).toBe(false);
    });
  });

  describe('Transaction Policy', () => {
    it('should evaluate small transactions', async () => {
      const result = await guardrails.evaluateTransaction({
        type: 'transfer',
        amount: 50,
        currency: 'TON',
        timestamp: new Date(),
        agentId: 'agent-1',
      });

      expect(result).toBeDefined();
      expect(result.riskScore).toBeDefined();
    });

    it('should require approval for large transactions', async () => {
      const result = await guardrails.evaluateTransaction({
        type: 'transfer',
        amount: 15000,
        currency: 'TON',
        timestamp: new Date(),
        agentId: 'agent-1',
      });

      expect(result.action).toBe('require_approval');
      expect(result.requiredApprovals.length).toBeGreaterThan(0);
    });

    it('should block transactions in emergency mode', async () => {
      guardrails.setEmergencyMode(true);

      const result = await guardrails.evaluateTransaction({
        type: 'transfer',
        amount: 10,
        currency: 'TON',
        timestamp: new Date(),
        agentId: 'agent-1',
      });

      expect(result.allowed).toBe(false);
      expect(result.matchedPolicies.some((p) => p.policyId === 'emergency_mode')).toBe(true);

      guardrails.setEmergencyMode(false);
    });

    it('should add and remove policies', () => {
      guardrails.addPolicy({
        id: 'custom_policy',
        name: 'Custom Policy',
        description: 'Custom test policy',
        conditions: [{ type: 'amount', operator: 'gt', value: 500 }],
        action: { type: 'require_approval' },
        priority: 200,
        enabled: true,
        createdBy: 'test',
        createdAt: new Date(),
      });

      let policies = guardrails.getPolicies();
      expect(policies.some((p) => p.id === 'custom_policy')).toBe(true);

      guardrails.removePolicy('custom_policy');
      policies = guardrails.getPolicies();
      expect(policies.some((p) => p.id === 'custom_policy')).toBe(false);
    });
  });

  describe('Risk Thresholds', () => {
    it('should check risk thresholds', () => {
      const result = guardrails.checkRiskThresholds({
        transactionValue: 500,
        portfolioValue: 10000,
        currentDrawdown: 5,
        dailyLoss: 2,
        concentration: 15,
        leverage: 2,
      });

      expect(result.withinLimits).toBe(true);
      expect(result.utilizationPercentages).toBeDefined();
    });

    it('should detect threshold violations', () => {
      const result = guardrails.checkRiskThresholds({
        transactionValue: 5000,
        portfolioValue: 10000,
        currentDrawdown: 20, // Exceeds 15% default
        dailyLoss: 8, // Exceeds 5% default
        concentration: 30, // Exceeds 25% default
        leverage: 5, // Exceeds 3x default
      });

      expect(result.withinLimits).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should update risk thresholds', () => {
      guardrails.updateRiskThresholds({
        maxDrawdown: 20,
        maxLeverage: 5,
      });

      const thresholds = guardrails.getRiskThresholds();

      expect(thresholds.maxDrawdown).toBe(20);
      expect(thresholds.maxLeverage).toBe(5);
    });
  });

  describe('Asset Whitelist', () => {
    it('should check if asset is allowed', () => {
      guardrails.addAsset({
        address: 'EQTest123',
        symbol: 'TEST',
        name: 'Test Token',
        type: 'jetton',
        riskRating: 'low',
      });

      expect(guardrails.isAssetAllowed('EQTest123')).toBe(true);
      expect(guardrails.isAssetAllowed('unknown')).toBe(false);
    });

    it('should get asset info', () => {
      guardrails.addAsset({
        address: 'EQAsset',
        symbol: 'AST',
        name: 'Asset Token',
        type: 'jetton',
        riskRating: 'medium',
      });

      const info = guardrails.getAssetInfo('EQAsset');

      expect(info).toBeDefined();
      expect(info?.symbol).toBe('AST');
    });
  });

  describe('Protocol Whitelist', () => {
    it('should check if protocol is allowed', () => {
      expect(guardrails.isProtocolAllowed('ston_fi')).toBe(true);
      expect(guardrails.isProtocolAllowed('unknown_protocol')).toBe(false);
    });

    it('should add and remove protocols', () => {
      guardrails.addProtocol({
        id: 'new_dex',
        name: 'New DEX',
        address: 'EQNewDex',
        type: 'dex',
        riskRating: 'medium',
        audited: true,
      });

      expect(guardrails.isProtocolAllowed('new_dex')).toBe(true);

      guardrails.removeProtocol('new_dex');
      expect(guardrails.isProtocolAllowed('new_dex')).toBe(false);
    });
  });
});

// ============================================================================
// Model Governance Manager Tests
// ============================================================================

describe('ModelGovernanceManager', () => {
  let governance: DefaultModelGovernanceManager;

  beforeEach(() => {
    governance = createModelGovernanceManager();
  });

  describe('Version Management', () => {
    it('should register a model version', async () => {
      const version = await governance.registerVersion({
        modelId: 'model-1',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'Initial version',
        config: {},
      });

      expect(version).toBeDefined();
      expect(version.id).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.status).toBe('active');
    });

    it('should get active version', async () => {
      await governance.registerVersion({
        modelId: 'model-2',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'Initial',
        config: {},
      });

      const active = governance.getActiveVersion('model-2');

      expect(active).toBeDefined();
      expect(active?.version).toBe('1.0.0');
    });

    it('should list versions', async () => {
      await governance.registerVersion({
        modelId: 'model-3',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'v1',
        config: {},
      });

      await governance.registerVersion({
        modelId: 'model-3',
        version: '1.1.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'v1.1',
        config: {},
      });

      const versions = governance.listVersions('model-3');

      expect(versions.length).toBe(2);
    });

    it('should rollback to previous version', async () => {
      const v1 = await governance.registerVersion({
        modelId: 'model-4',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'v1',
        config: {},
      });

      await governance.registerVersion({
        modelId: 'model-4',
        version: '2.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'v2',
        config: {},
      });

      const result = await governance.rollbackToVersion('model-4', v1.id);

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('1.0.0');

      const active = governance.getActiveVersion('model-4');
      expect(active?.version).toBe('1.0.0');
    });
  });

  describe('Evaluation', () => {
    it('should evaluate model', async () => {
      await governance.registerVersion({
        modelId: 'model-eval',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'Test',
        config: {},
      });

      const result = await governance.evaluateModel('model-eval');

      expect(result).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.benchmarkResults.length).toBeGreaterThan(0);
    });

    it('should run benchmark', async () => {
      await governance.registerVersion({
        modelId: 'model-bench',
        version: '1.0.0',
        provider: 'groq',
        deployedBy: 'admin',
        changeNotes: 'Test',
        config: {},
      });

      const result = await governance.runBenchmark('accuracy', 'model-bench');

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should record performance metrics', () => {
      governance.recordPerformance('model-perf', {
        accuracy: 0.95,
        latencyMs: 150,
        errorRate: 0.01,
        costUsd: 0.001,
      });

      const history = governance.getPerformanceHistory('model-perf');

      expect(history.length).toBe(1);
    });

    it('should get performance summary', () => {
      for (let i = 0; i < 10; i++) {
        governance.recordPerformance('model-summary', {
          accuracy: 0.9 + Math.random() * 0.1,
          latencyMs: 100 + Math.random() * 100,
          errorRate: Math.random() * 0.05,
        });
      }

      const summary = governance.getPerformanceSummary('model-summary');

      expect(summary.totalRequests).toBe(10);
      expect(summary.avgLatencyMs).toBeGreaterThan(0);
    });

    it('should check performance thresholds', () => {
      // Record poor performance
      for (let i = 0; i < 5; i++) {
        governance.recordPerformance('model-alerts', {
          latencyMs: 3000, // Above 2000ms threshold
          errorRate: 0.1, // Above 0.05 threshold
        });
      }

      const alerts = governance.checkPerformanceThresholds('model-alerts');

      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Management', () => {
    it('should register provider', () => {
      governance.registerProvider({
        id: 'custom-provider',
        name: 'Custom Provider',
        type: 'local',
        priority: 50,
        enabled: true,
        rateLimits: [],
      });

      const provider = governance.getProvider('custom-provider');

      expect(provider).toBeDefined();
      expect(provider?.name).toBe('Custom Provider');
    });

    it('should get providers sorted by priority', () => {
      const providers = governance.getProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0].priority).toBeGreaterThanOrEqual(providers[1]?.priority || 0);
    });

    it('should select best provider', () => {
      const provider = governance.selectProvider();

      expect(provider).toBeDefined();
      expect(provider?.enabled).toBe(true);
    });

    it('should get provider health', () => {
      const health = governance.getProviderHealth('groq');

      expect(health).toBeDefined();
      expect(health.available).toBeDefined();
      expect(health.rateLimit).toBeDefined();
    });
  });

  describe('Rollback Triggers', () => {
    it('should check rollback triggers', () => {
      const result = governance.checkRollbackTriggers('model-triggers');

      expect(result).toBeDefined();
      expect(result.shouldRollback).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
  });
});

// ============================================================================
// Monitoring Manager Tests
// ============================================================================

describe('MonitoringManager', () => {
  let monitoring: DefaultMonitoringManager;

  beforeEach(() => {
    monitoring = createMonitoringManager();
  });

  describe('Anomaly Detection', () => {
    it('should record activity without anomalies', async () => {
      const result = await monitoring.recordActivity('agent-1', {
        type: 'trade',
        amount: 100,
        currency: 'TON',
        timestamp: new Date(),
      });

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });

    it('should detect anomalies for large transactions', async () => {
      // Build baseline
      for (let i = 0; i < 30; i++) {
        await monitoring.recordActivity('agent-anomaly', {
          type: 'trade',
          amount: 100 + Math.random() * 50,
          currency: 'TON',
          timestamp: new Date(),
        });
      }

      // Record anomalous activity
      const result = await monitoring.recordActivity('agent-anomaly', {
        type: 'trade',
        amount: 100000, // Much larger than baseline
        currency: 'TON',
        timestamp: new Date(),
      });

      expect(result.anomalyDetected).toBe(true);
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should resolve anomalies', async () => {
      await monitoring.recordActivity('agent-resolve', {
        type: 'trade',
        amount: 500000,
        currency: 'TON',
        timestamp: new Date(),
      });

      const anomalies = await monitoring.detectAnomalies('agent-resolve');

      if (anomalies.length > 0) {
        await monitoring.resolveAnomaly(anomalies[0].id, {
          resolvedBy: 'admin',
          resolution: 'expected_behavior',
          action: 'Verified as legitimate transaction',
          notes: 'Large but expected trade',
        });

        const updated = await monitoring.getAnomalies('agent-resolve', { status: ['resolved'] });
        expect(updated.some((a) => a.status === 'resolved')).toBe(true);
      }
    });

    it('should get anomaly statistics', () => {
      const stats = monitoring.getAnomalyStatistics();

      expect(stats).toBeDefined();
      expect(stats.total).toBeDefined();
      expect(stats.byType).toBeDefined();
    });
  });

  describe('Behavior Analysis', () => {
    it('should build behavior profile', async () => {
      for (let i = 0; i < 15; i++) {
        await monitoring.recordActivity('agent-profile', {
          type: 'trade',
          amount: 100 + i * 10,
          currency: 'TON',
          timestamp: new Date(Date.now() - i * 3600000),
        });
      }

      const profile = await monitoring.buildBehaviorProfile('agent-profile');

      expect(profile).toBeDefined();
      expect(profile.agentId).toBe('agent-profile');
      expect(profile.tradingPatterns).toBeDefined();
      expect(profile.trustScore).toBeDefined();
    });

    it('should compare behavior', async () => {
      await monitoring.buildBehaviorProfile('agent-compare');

      const comparison = monitoring.compareBehavior('agent-compare', {
        type: 'trade',
        amount: 1000,
        currency: 'TON',
        timestamp: new Date(),
      });

      expect(comparison).toBeDefined();
      expect(comparison.withinNormal).toBeDefined();
      expect(comparison.deviationScore).toBeDefined();
    });

    it('should get trust score', () => {
      const score = monitoring.getTrustScore('new-agent');

      expect(score).toBeDefined();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns', () => {
      const patterns = monitoring.detectPatterns('agent-patterns');

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should check fraud patterns', () => {
      const result = monitoring.checkFraudPatterns('agent-fraud', {
        type: 'withdrawal',
        amount: 5000,
        currency: 'TON',
        timestamp: new Date(),
      });

      expect(result).toBeDefined();
      expect(result.fraudDetected).toBeDefined();
      expect(result.riskScore).toBeDefined();
    });
  });

  describe('Alerting', () => {
    it('should send alerts', async () => {
      await monitoring.sendAlert({
        agentId: 'agent-alert',
        type: 'test_alert',
        severity: 'medium',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      const history = monitoring.getAlertHistory('agent-alert');

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].title).toBe('Test Alert');
    });

    it('should configure alert channels', () => {
      monitoring.configureAlertChannel({
        type: 'webhook',
        config: { url: 'https://example.com/webhook' },
        severityFilter: ['high', 'critical'],
        enabled: true,
      });

      // Channel should be configured (no errors thrown)
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// Human Oversight Manager Tests
// ============================================================================

describe('HumanOversightManager', () => {
  let oversight: DefaultHumanOversightManager;

  beforeEach(() => {
    oversight = createHumanOversightManager();
  });

  describe('Override Operations', () => {
    it('should execute override', async () => {
      const override = await oversight.executeOverride({
        action: 'pause_agent',
        agentId: 'agent-1',
        operatorId: 'admin',
        reason: 'Routine maintenance',
      });

      expect(override).toBeDefined();
      expect(override.action).toBe('pause_agent');
      expect(override.agentId).toBe('agent-1');
    });

    it('should get override history', async () => {
      await oversight.executeOverride({
        action: 'pause_agent',
        agentId: 'agent-history',
        operatorId: 'admin',
        reason: 'Test',
      });

      const history = oversight.getOverrideHistory('agent-history');

      expect(history.length).toBeGreaterThan(0);
    });

    it('should reject invalid override actions', async () => {
      await expect(
        oversight.executeOverride({
          action: 'invalid_action' as any,
          agentId: 'agent-1',
          operatorId: 'admin',
          reason: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should get active overrides', async () => {
      await oversight.executeOverride({
        action: 'pause_agent',
        agentId: 'agent-active',
        operatorId: 'admin',
        reason: 'Test',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      });

      const active = oversight.getActiveOverrides('agent-active');

      expect(active.length).toBeGreaterThan(0);
    });
  });

  describe('Emergency Controls', () => {
    it('should activate emergency stop', async () => {
      await oversight.activateEmergencyStop({
        activatedBy: 'admin',
        reason: 'Security incident',
        affectedAgents: ['agent-1', 'agent-2'],
      });

      const state = oversight.getEmergencyState();

      expect(state.active).toBe(true);
      expect(state.type).toBe('stop');
      expect(state.reason).toBe('Security incident');

      // Cleanup
      await oversight.deactivateEmergencyStop('admin');
    });

    it('should deactivate emergency stop', async () => {
      await oversight.activateEmergencyStop({
        activatedBy: 'admin',
        reason: 'Test',
      });

      await oversight.deactivateEmergencyStop('admin');

      const state = oversight.getEmergencyState();

      expect(state.active).toBe(false);
    });

    it('should pause and resume agents', async () => {
      await oversight.pauseAgent('agent-pause', 'Testing', 'admin');

      let states = oversight.getAgentStates();
      expect(states.get('agent-pause')?.status).toBe('paused');

      await oversight.resumeAgent('agent-pause', 'admin');

      states = oversight.getAgentStates();
      expect(states.get('agent-pause')?.status).toBe('active');
    });
  });

  describe('Approval Workflow', () => {
    it('should request approval', async () => {
      const request = await oversight.requestApproval({
        agentId: 'agent-1',
        action: 'large_transfer',
        parameters: { amount: 10000 },
        requestedBy: 'agent-1',
        requiredLevel: 1,
      });

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.status).toBe('pending');
    });

    it('should submit approval', async () => {
      const request = await oversight.requestApproval({
        agentId: 'agent-1',
        action: 'transfer',
        parameters: {},
        requestedBy: 'agent-1',
        requiredLevel: 1,
      });

      await oversight.submitApproval(request.id, {
        approverId: 'admin',
        decision: 'approved',
        reason: 'Looks good',
      });

      const updated = oversight.getApprovalRequest(request.id);

      expect(updated?.status).toBe('approved');
    });

    it('should get pending approvals', async () => {
      await oversight.requestApproval({
        agentId: 'agent-pending',
        action: 'test',
        parameters: {},
        requestedBy: 'agent',
        requiredLevel: 1,
      });

      const pending = oversight.getPendingApprovals();

      expect(pending.length).toBeGreaterThan(0);
    });

    it('should check approval status', async () => {
      const request = await oversight.requestApproval({
        agentId: 'agent-status',
        action: 'test',
        parameters: {},
        requestedBy: 'agent',
        requiredLevel: 1,
      });

      const status = oversight.checkApprovalStatus(request.id);

      expect(status.status).toBe('pending');
      expect(status.requiredApprovals).toBeGreaterThan(0);
    });
  });

  describe('Dashboard', () => {
    it('should get dashboard data', () => {
      const data = oversight.getDashboardData();

      expect(data).toBeDefined();
      expect(data.systemStatus).toBeDefined();
      expect(data.activeAgents).toBeDefined();
      expect(data.metrics).toBeDefined();
    });

    it('should get agent metrics', () => {
      const metrics = oversight.getAgentMetrics('agent-1');

      expect(metrics).toBeDefined();
      expect(metrics.agentId).toBe('agent-1');
    });

    it('should get system health', () => {
      const health = oversight.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.components.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Unified AI Safety Manager Tests
// ============================================================================

describe('AISafetyManager', () => {
  let safety: ReturnType<typeof createAISafetyManager>;

  beforeEach(() => {
    safety = createAISafetyManager({
      enabled: true,
    });
  });

  describe('Initialization', () => {
    it('should create safety manager with all components', () => {
      expect(safety.alignment).toBeDefined();
      expect(safety.guardrails).toBeDefined();
      expect(safety.modelGovernance).toBeDefined();
      expect(safety.monitoring).toBeDefined();
      expect(safety.humanOversight).toBeDefined();
    });

    it('should report enabled status', () => {
      expect(safety.isEnabled()).toBe(true);
    });

    it('should get system status', () => {
      const status = safety.getSystemStatus();

      expect(status.enabled).toBe(true);
      expect(status.emergencyMode).toBe(false);
      expect(status.componentsHealthy).toBe(true);
    });
  });

  describe('Agent Action Validation', () => {
    it('should validate allowed actions', async () => {
      const result = await safety.validateAgentAction('agent-1', {
        type: 'trade',
        parameters: { pair: 'TON/USDT' },
        amount: 100,
      });

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('should block actions during emergency mode', async () => {
      await safety.humanOversight.activateEmergencyStop({
        activatedBy: 'admin',
        reason: 'Test emergency',
      });

      const result = await safety.validateAgentAction('agent-1', {
        type: 'trade',
        parameters: {},
        amount: 100,
      });

      expect(result.allowed).toBe(false);
      expect(result.risks.some((r) => r.includes('Emergency'))).toBe(true);

      // Cleanup
      await safety.humanOversight.deactivateEmergencyStop('admin');
    });

    it('should block actions for paused agents', async () => {
      await safety.humanOversight.pauseAgent('agent-paused', 'Test', 'admin');

      const result = await safety.validateAgentAction('agent-paused', {
        type: 'trade',
        parameters: {},
      });

      expect(result.allowed).toBe(false);
    });
  });

  describe('Agent Safety Score', () => {
    it('should calculate safety score', async () => {
      const score = await safety.getAgentSafetyScore('agent-score');

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThan(0);
      expect(score.alignment).toBeDefined();
      expect(score.trust).toBeDefined();
      expect(score.components).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    it('should emit events from components', async () => {
      const events: any[] = [];
      safety.onEvent((event) => events.push(event));

      await safety.alignment.registerGoal('agent-events', {
        type: 'staking',
        description: 'Test goal',
        priority: 1,
        constraints: [],
        metrics: [],
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
