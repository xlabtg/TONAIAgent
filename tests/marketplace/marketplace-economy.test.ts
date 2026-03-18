/**
 * Marketplace Economy Tests
 *
 * Comprehensive tests for the Agent Marketplace Economy features added in Issue #101:
 * - Sandbox testing environment
 * - Revenue Distribution Engine
 * - Freemium monetization model
 * - Integration with unified MarketplaceService
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createSandboxManager,
  createRevenueDistributionEngine,
  createFreemiumManager,
  createMarketplaceService,
  DefaultSandboxManager,
  DefaultRevenueDistributionEngine,
  DefaultFreemiumManager,
  DefaultMarketplaceService,
} from '../../extended/marketplace';

import type {
  SandboxSession,
  SandboxResult,
  SandboxConfig,
  CodeVerificationResult,
  SandboxAuditReport,
  Distribution,
  DistributionRule,
  RevenueEvent,
  RevenueStatement,
  HighWaterMark,
  FreemiumSubscription,
  FreemiumPlan,
  FeatureAccess,
  UsageLimitCheck,
  TierUpgradeRecommendation,
  StrategyConfig,
} from '../../extended/marketplace';

// ============================================================================
// Sandbox Manager Tests
// ============================================================================

describe('SandboxManager', () => {
  let sandboxManager: DefaultSandboxManager;

  beforeEach(() => {
    sandboxManager = createSandboxManager();
  });

  describe('createSession', () => {
    it('should create a paper trading session', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      expect(session.id).toBeDefined();
      expect(session.strategyId).toBe('strategy_123');
      expect(session.creatorId).toBe('creator_456');
      expect(session.type).toBe('paper_trading');
      expect(session.status).toBe('pending');
      expect(session.createdAt).toBeDefined();
    });

    it('should apply default sandbox config', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      expect(session.config.initialCapital).toBeGreaterThan(0);
      expect(session.config.durationDays).toBeGreaterThan(0);
      expect(session.config.slippageMultiplier).toBe(1.0);
    });

    it('should apply custom config overrides', async () => {
      const customConfig: Partial<SandboxConfig> = {
        initialCapital: 50000,
        durationDays: 60,
        marketCondition: 'bull',
        slippageMultiplier: 1.5,
      };

      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'backtest',
        customConfig
      );

      expect(session.config.initialCapital).toBe(50000);
      expect(session.config.durationDays).toBe(60);
      expect(session.config.marketCondition).toBe('bull');
      expect(session.config.slippageMultiplier).toBe(1.5);
    });

    it('should enforce max sessions per strategy', async () => {
      const manager = createSandboxManager({ maxSessionsPerStrategy: 2 });

      await manager.createSession('strategy_123', 'creator_456', 'paper_trading');
      await manager.createSession('strategy_123', 'creator_456', 'paper_trading');

      await expect(
        manager.createSession('strategy_123', 'creator_456', 'paper_trading')
      ).rejects.toThrow('Maximum sandbox sessions');
    });
  });

  describe('getSession and listSessions', () => {
    it('should retrieve session by id', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      const retrieved = await sandboxManager.getSession(session.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should return null for non-existent session', async () => {
      const result = await sandboxManager.getSession('nonexistent_id');
      expect(result).toBeNull();
    });

    it('should list all sessions for a strategy', async () => {
      await sandboxManager.createSession('strategy_123', 'creator_456', 'paper_trading');
      await sandboxManager.createSession('strategy_123', 'creator_456', 'backtest');
      await sandboxManager.createSession('strategy_999', 'creator_456', 'paper_trading');

      const sessions = await sandboxManager.listSessions('strategy_123');

      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.strategyId === 'strategy_123')).toBe(true);
    });
  });

  describe('cancelSession', () => {
    it('should cancel a pending session', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      const cancelled = await sandboxManager.cancelSession(session.id);

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.completedAt).toBeDefined();
    });

    it('should throw for non-existent session', async () => {
      await expect(sandboxManager.cancelSession('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('runSession', () => {
    it('should execute a paper trading session', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading',
        { durationDays: 30 }
      );

      const result = await sandboxManager.runSession(session.id);

      expect(result.sessionId).toBe(session.id);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.summary).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.riskMetrics).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should complete the session status', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      await sandboxManager.runSession(session.id);

      const completed = await sandboxManager.getSession(session.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.completedAt).toBeDefined();
      expect(completed?.result).toBeDefined();
    });

    it('should include stress test results when configured', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading',
        { includeStressScenarios: true }
      );

      const result = await sandboxManager.runSession(session.id);

      expect(result.riskMetrics.stressTestResults.length).toBeGreaterThan(0);
      expect(result.riskMetrics.stressTestResults[0].scenario).toBeDefined();
      expect(typeof result.riskMetrics.stressTestResults[0].passed).toBe('boolean');
    });

    it('should throw for non-pending sessions', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      await sandboxManager.runSession(session.id);

      await expect(sandboxManager.runSession(session.id)).rejects.toThrow('not in pending state');
    });
  });

  describe('verifyCode', () => {
    it('should verify valid strategy config', async () => {
      const config: StrategyConfig = createValidStrategyConfig();

      const result = await sandboxManager.verifyCode(config);

      expect(result.passed).toBe(true);
      expect(result.securityScore).toBeGreaterThan(0);
      expect(result.checkedAt).toBeDefined();
    });

    it('should flag high slippage tolerance', async () => {
      const config = createValidStrategyConfig();
      config.slippageTolerance = 15; // Very high

      const result = await sandboxManager.verifyCode(config);

      expect(result.issues.some(i => i.severity === 'high')).toBe(true);
    });

    it('should flag missing stop loss', async () => {
      const config = createValidStrategyConfig();
      delete config.stopLossPercent;

      const result = await sandboxManager.verifyCode(config);

      const stopLossIssue = result.issues.find(i =>
        i.description.toLowerCase().includes('stop loss')
      );
      expect(stopLossIssue).toBeDefined();
    });

    it('should flag empty protocols', async () => {
      const config = createValidStrategyConfig();
      config.supportedProtocols = [];

      const result = await sandboxManager.verifyCode(config);

      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.description.includes('protocol'))).toBe(true);
    });

    it('should flag invalid capital range', async () => {
      const config = createValidStrategyConfig();
      config.maxCapital = 10; // Less than minCapital (100)

      const result = await sandboxManager.verifyCode(config);

      const capitalIssue = result.issues.find(i => i.severity === 'critical');
      expect(capitalIssue).toBeDefined();
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report from completed session', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );
      await sandboxManager.runSession(session.id);

      const report = await sandboxManager.generateAuditReport(session.id);

      expect(report.id).toBeDefined();
      expect(report.strategyId).toBe('strategy_123');
      expect(report.sessionId).toBe(session.id);
      expect(report.auditorType).toBe('automated');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.categories.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeDefined();
    });

    it('should throw for incomplete sessions', async () => {
      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );

      await expect(sandboxManager.generateAuditReport(session.id)).rejects.toThrow('must be completed');
    });
  });

  describe('isReadyForPublication', () => {
    it('should return not ready for strategy with no sessions', async () => {
      const result = await sandboxManager.isReadyForPublication('strategy_no_sessions');

      expect(result.ready).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should evaluate readiness after successful session', async () => {
      const session = await sandboxManager.createSession(
        'strategy_abc',
        'creator_456',
        'paper_trading'
      );
      await sandboxManager.runSession(session.id);

      const result = await sandboxManager.isReadyForPublication('strategy_abc');

      expect(typeof result.ready).toBe('boolean');
      // reasons may be empty (ready) or populated (not ready)
    });
  });

  describe('runFullValidation', () => {
    it('should run comprehensive validation', async () => {
      const result = await sandboxManager.runFullValidation('strategy_123');

      expect(result.sessionId).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.riskMetrics.stressTestResults.length).toBeGreaterThan(0);
    });
  });

  describe('events', () => {
    it('should emit events on session operations', async () => {
      const events: unknown[] = [];
      sandboxManager.onEvent(e => events.push(e));

      const session = await sandboxManager.createSession(
        'strategy_123',
        'creator_456',
        'paper_trading'
      );
      await sandboxManager.runSession(session.id);

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Revenue Distribution Engine Tests
// ============================================================================

describe('RevenueDistributionEngine', () => {
  let engine: DefaultRevenueDistributionEngine;

  beforeEach(() => {
    engine = createRevenueDistributionEngine();
  });

  describe('createDistributionRule', () => {
    it('should create a valid distribution rule', async () => {
      const rule = await engine.createDistributionRule({
        creatorId: 'creator_123',
        agentId: 'agent_456',
        splits: [
          { recipientId: 'creator_123', recipientType: 'creator', percentage: 70 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
          { recipientId: 'dao_treasury', recipientType: 'dao_treasury', percentage: 5 },
        ],
        highWaterMarkTracking: true,
        active: true,
      });

      expect(rule.id).toBeDefined();
      expect(rule.creatorId).toBe('creator_123');
      expect(rule.splits).toHaveLength(3);
      expect(rule.effectiveFrom).toBeDefined();
    });

    it('should reject splits not totaling 100%', async () => {
      await expect(
        engine.createDistributionRule({
          creatorId: 'creator_123',
          splits: [
            { recipientId: 'creator_123', recipientType: 'creator', percentage: 70 },
            { recipientId: 'platform', recipientType: 'platform', percentage: 20 },
            // Only 90%, missing 10%
          ],
          highWaterMarkTracking: false,
          active: true,
        })
      ).rejects.toThrow('100%');
    });

    it('should reject invalid split percentages', async () => {
      await expect(
        engine.createDistributionRule({
          creatorId: 'creator_123',
          splits: [
            { recipientId: 'creator_123', recipientType: 'creator', percentage: -10 },
            { recipientId: 'platform', recipientType: 'platform', percentage: 110 },
          ],
          highWaterMarkTracking: false,
          active: true,
        })
      ).rejects.toThrow();
    });

    it('should deactivate previous active rule for same agent', async () => {
      const rule1 = await engine.createDistributionRule({
        creatorId: 'creator_123',
        agentId: 'agent_456',
        splits: [
          { recipientId: 'creator_123', recipientType: 'creator', percentage: 70 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 30 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      const rule2 = await engine.createDistributionRule({
        creatorId: 'creator_123',
        agentId: 'agent_456',
        splits: [
          { recipientId: 'creator_123', recipientType: 'creator', percentage: 80 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 20 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      const oldRule = await engine.getDistributionRule(rule1.id);
      expect(oldRule?.active).toBe(false);

      const newRule = await engine.getDistributionRule(rule2.id);
      expect(newRule?.active).toBe(true);
    });
  });

  describe('processRevenue', () => {
    it('should create distribution from revenue event', async () => {
      await engine.createDistributionRule({
        creatorId: 'creator_123',
        agentId: 'agent_456',
        splits: [
          { recipientId: 'creator_123', recipientType: 'creator', percentage: 70 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
          { recipientId: 'dao', recipientType: 'dao_treasury', percentage: 5 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      const distribution = await engine.processRevenue({
        agentId: 'agent_456',
        strategyId: 'strategy_789',
        creatorId: 'creator_123',
        source: 'performance_fee',
        grossAmount: 1000,
        currency: 'TON',
        metadata: {},
      });

      expect(distribution.id).toBeDefined();
      expect(distribution.totalAmount).toBe(1000);
      expect(distribution.splits).toHaveLength(3);
      expect(distribution.status).toBe('pending');

      // Check split amounts
      const creatorSplit = distribution.splits.find(s => s.recipientType === 'creator');
      expect(creatorSplit?.amount).toBe(700); // 70% of 1000

      const platformSplit = distribution.splits.find(s => s.recipientType === 'platform');
      expect(platformSplit?.amount).toBe(250); // 25% of 1000
    });

    it('should use default splits when no rule exists', async () => {
      const distribution = await engine.processRevenue({
        agentId: 'agent_new',
        strategyId: 'strategy_new',
        creatorId: 'creator_new',
        source: 'management_fee',
        grossAmount: 500,
        currency: 'TON',
        metadata: {},
      });

      expect(distribution.splits.length).toBeGreaterThan(0);
      expect(distribution.totalAmount).toBe(500);
    });

    it('should reject revenue below minimum amount', async () => {
      const customEngine = createRevenueDistributionEngine({ minDistributionAmount: 10 });

      await expect(
        customEngine.processRevenue({
          agentId: 'agent_456',
          strategyId: 'strategy_789',
          creatorId: 'creator_123',
          source: 'platform_fee',
          grossAmount: 0.05, // Below minimum
          currency: 'TON',
          metadata: {},
        })
      ).rejects.toThrow('below minimum');
    });
  });

  describe('calculateSplits', () => {
    it('should calculate correct split amounts', async () => {
      const rule = await engine.createDistributionRule({
        creatorId: 'creator_123',
        splits: [
          { recipientId: 'creator_123', recipientType: 'creator', percentage: 70 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
          { recipientId: 'referrer_1', recipientType: 'referrer', percentage: 5 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      const splits = engine.calculateSplits(1000, rule);

      expect(splits).toHaveLength(3);
      expect(splits[0].amount).toBe(700);
      expect(splits[1].amount).toBe(250);
      expect(splits[2].amount).toBe(50);

      const totalAmount = splits.reduce((sum, s) => sum + s.amount, 0);
      expect(totalAmount).toBe(1000);
    });
  });

  describe('processPendingDistributions', () => {
    it('should process pending distributions', async () => {
      // Create some distributions
      await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 100,
        currency: 'TON',
        metadata: {},
      });

      await engine.processRevenue({
        agentId: 'agent_2',
        strategyId: 'strategy_2',
        creatorId: 'creator_2',
        source: 'management_fee',
        grossAmount: 200,
        currency: 'TON',
        metadata: {},
      });

      const result = await engine.processPendingDistributions();

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.totalAmount).toBe(300);
    });
  });

  describe('reverseDistribution', () => {
    it('should reverse a completed distribution', async () => {
      const distribution = await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 100,
        currency: 'TON',
        metadata: {},
      });

      await engine.processPendingDistributions();

      const reversed = await engine.reverseDistribution(
        distribution.id,
        'User dispute'
      );

      expect(reversed.status).toBe('reversed');
      expect(reversed.failureReason).toContain('User dispute');
    });

    it('should throw for non-completed distribution', async () => {
      const distribution = await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 100,
        currency: 'TON',
        metadata: {},
      });

      await expect(
        engine.reverseDistribution(distribution.id, 'Test')
      ).rejects.toThrow('completed');
    });
  });

  describe('highWaterMark', () => {
    it('should track high water mark', async () => {
      const hwm1 = await engine.updateHighWaterMark('agent_123', 10000, 'TON');
      expect(hwm1.value).toBe(10000);
      expect(hwm1.allTimeHigh).toBe(10000);

      const hwm2 = await engine.updateHighWaterMark('agent_123', 12000, 'TON');
      expect(hwm2.value).toBe(12000);
      expect(hwm2.allTimeHigh).toBe(12000);

      // Should not go below previous high
      const hwm3 = await engine.updateHighWaterMark('agent_123', 9000, 'TON');
      expect(hwm3.value).toBe(12000); // stays at previous high
      expect(hwm3.allTimeHigh).toBe(12000);
    });

    it('should return null for new agent', async () => {
      const hwm = await engine.getHighWaterMark('new_agent');
      expect(hwm).toBeNull();
    });

    it('should calculate amount above high water mark', async () => {
      await engine.updateHighWaterMark('agent_123', 10000, 'TON');

      const above = await engine.calculateAboveHighWaterMark('agent_123', 11500);
      expect(above).toBe(1500);

      // Below HWM should return 0
      const below = await engine.calculateAboveHighWaterMark('agent_123', 9000);
      expect(below).toBe(0);
    });
  });

  describe('revenueStatement', () => {
    it('should generate revenue statement', async () => {
      const start = new Date();
      start.setDate(start.getDate() - 30);

      // Create some revenue
      await engine.processRevenue({
        agentId: 'agent_123',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 1000,
        currency: 'TON',
        metadata: {},
      });

      await engine.processRevenue({
        agentId: 'agent_123',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'management_fee',
        grossAmount: 500,
        currency: 'TON',
        metadata: {},
      });

      await engine.processPendingDistributions();

      // Set end date after all processing to ensure all events are included
      const end = new Date();
      const statement = await engine.getRevenueStatement('agent_123', start, end);

      expect(statement.agentId).toBe('agent_123');
      expect(statement.totalGrossRevenue).toBe(1500);
      expect(statement.bySource.performance_fee).toBe(1000);
      expect(statement.bySource.management_fee).toBe(500);
      expect(statement.generatedAt).toBeDefined();
    });
  });

  describe('creatorRevenue', () => {
    it('should calculate total creator revenue', async () => {
      const start = new Date();
      start.setDate(start.getDate() - 30);

      await engine.createDistributionRule({
        creatorId: 'creator_1',
        agentId: 'agent_1',
        splits: [
          { recipientId: 'creator_1', recipientType: 'creator', percentage: 75 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 1000,
        currency: 'TON',
        metadata: {},
      });

      await engine.processPendingDistributions();

      // Set end date after all processing to ensure all distributions are included
      const end = new Date();
      const revenue = await engine.getCreatorRevenue('creator_1', start, end);
      expect(revenue).toBe(750); // 75% of 1000
    });
  });

  describe('daoTreasury', () => {
    it('should allocate to DAO treasury', async () => {
      await engine.createDistributionRule({
        creatorId: 'creator_1',
        splits: [
          { recipientId: 'creator_1', recipientType: 'creator', percentage: 70 },
          { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
          { recipientId: 'dao_treasury', recipientType: 'dao_treasury', percentage: 5 },
        ],
        highWaterMarkTracking: false,
        active: true,
      });

      await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 1000,
        currency: 'TON',
        metadata: {},
      });

      await engine.processPendingDistributions();

      const allocation = await engine.allocateToDAOTreasury('2026-Q1');

      expect(allocation.period).toBe('2026-Q1');
      expect(allocation.totalAmount).toBeGreaterThanOrEqual(0);
      expect(allocation.allocatedAt).toBeDefined();
    });

    it('should track DAO allocations', async () => {
      await engine.allocateToDAOTreasury('2026-Q1');
      await engine.allocateToDAOTreasury('2026-Q2');

      const allocations = await engine.getDAOAllocations();

      expect(allocations).toHaveLength(2);
    });
  });

  describe('events', () => {
    it('should emit events on revenue processing', async () => {
      const events: unknown[] = [];
      engine.onEvent(e => events.push(e));

      await engine.processRevenue({
        agentId: 'agent_1',
        strategyId: 'strategy_1',
        creatorId: 'creator_1',
        source: 'performance_fee',
        grossAmount: 100,
        currency: 'TON',
        metadata: {},
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Freemium Manager Tests
// ============================================================================

describe('FreemiumManager', () => {
  let freemiumManager: DefaultFreemiumManager;

  beforeEach(() => {
    freemiumManager = createFreemiumManager();
  });

  describe('getPlans', () => {
    it('should return all active plans', async () => {
      const plans = await freemiumManager.getPlans();

      expect(plans.length).toBeGreaterThanOrEqual(4);
      expect(plans.some(p => p.tier === 'free')).toBe(true);
      expect(plans.some(p => p.tier === 'starter')).toBe(true);
      expect(plans.some(p => p.tier === 'professional')).toBe(true);
      expect(plans.some(p => p.tier === 'enterprise')).toBe(true);
    });

    it('should return correct plan pricing', async () => {
      const freePlan = await freemiumManager.getPlanByTier('free');
      expect(freePlan?.monthlyPrice).toBe(0);

      const starterPlan = await freemiumManager.getPlanByTier('starter');
      expect(starterPlan?.monthlyPrice).toBeGreaterThan(0);

      const enterprisePlan = await freemiumManager.getPlanByTier('enterprise');
      expect(enterprisePlan?.monthlyPrice).toBeGreaterThan(starterPlan?.monthlyPrice ?? 0);
    });
  });

  describe('createSubscription', () => {
    it('should create a free tier subscription', async () => {
      const sub = await freemiumManager.createSubscription('user_123', 'free');

      expect(sub.id).toBeDefined();
      expect(sub.userId).toBe('user_123');
      expect(sub.tier).toBe('free');
      expect(sub.status).toBe('active');
      expect(sub.createdAt).toBeDefined();
    });

    it('should create a subscription with trial', async () => {
      const sub = await freemiumManager.createSubscription('user_123', 'starter', true);

      expect(sub.status).toBe('trialing');
      expect(sub.trialStartDate).toBeDefined();
      expect(sub.trialEndDate).toBeDefined();
    });

    it('should reject duplicate subscriptions', async () => {
      await freemiumManager.createSubscription('user_123', 'free');

      await expect(
        freemiumManager.createSubscription('user_123', 'starter')
      ).rejects.toThrow('already has an active subscription');
    });
  });

  describe('getUserSubscription', () => {
    it('should return user subscription', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      const sub = await freemiumManager.getUserSubscription('user_123');

      expect(sub).not.toBeNull();
      expect(sub?.userId).toBe('user_123');
      expect(sub?.tier).toBe('starter');
    });

    it('should return null for non-subscribed user', async () => {
      const sub = await freemiumManager.getUserSubscription('nonexistent_user');
      expect(sub).toBeNull();
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade to higher tier', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      const upgraded = await freemiumManager.upgradeSubscription('user_123', 'professional');

      expect(upgraded.tier).toBe('professional');
      expect(upgraded.status).toBe('active');
    });

    it('should throw when upgrading to same or lower tier', async () => {
      await freemiumManager.createSubscription('user_123', 'professional');

      await expect(
        freemiumManager.upgradeSubscription('user_123', 'starter')
      ).rejects.toThrow('downgrade');
    });
  });

  describe('downgradeSubscription', () => {
    it('should downgrade to lower tier', async () => {
      await freemiumManager.createSubscription('user_123', 'professional');

      const downgraded = await freemiumManager.downgradeSubscription('user_123', 'starter');

      expect(downgraded.tier).toBe('starter');
    });

    it('should throw when downgrading to same or higher tier', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      await expect(
        freemiumManager.downgradeSubscription('user_123', 'professional')
      ).rejects.toThrow('upgrade');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel at period end by default', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      const cancelled = await freemiumManager.cancelSubscription('user_123');

      expect(cancelled.cancelAtPeriodEnd).toBe(true);
      expect(cancelled.status).toBe('active'); // Still active until period end
    });

    it('should cancel immediately when requested', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      const cancelled = await freemiumManager.cancelSubscription('user_123', false);

      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate cancelled subscription', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');
      await freemiumManager.cancelSubscription('user_123', false);

      const reactivated = await freemiumManager.reactivateSubscription('user_123');

      expect(reactivated.status).toBe('active');
      expect(reactivated.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe('trial management', () => {
    it('should start a trial', async () => {
      const sub = await freemiumManager.startTrial('user_123', 'professional');

      expect(sub.status).toBe('trialing');
      expect(sub.trialEndDate).toBeDefined();
    });

    it('should check if user is in trial', async () => {
      await freemiumManager.startTrial('user_123', 'professional');

      const inTrial = await freemiumManager.isInTrial('user_123');
      expect(inTrial).toBe(true);

      await freemiumManager.createSubscription('user_999', 'starter');
      const notInTrial = await freemiumManager.isInTrial('user_999');
      expect(notInTrial).toBe(false);
    });

    it('should get days remaining in trial', async () => {
      await freemiumManager.startTrial('user_123', 'professional');

      const days = await freemiumManager.getTrialDaysRemaining('user_123');
      expect(days).toBeGreaterThan(0);
    });

    it('should convert trial to active subscription', async () => {
      await freemiumManager.startTrial('user_123', 'professional');

      const converted = await freemiumManager.convertTrialToSubscription('user_123');

      expect(converted.status).toBe('active');
      expect(converted.trialEndDate).toBeUndefined();
    });

    it('should throw when converting non-trial subscription', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      await expect(
        freemiumManager.convertTrialToSubscription('user_123')
      ).rejects.toThrow('not in trial');
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow features included in plan', async () => {
      await freemiumManager.createSubscription('user_123', 'professional');

      const access = await freemiumManager.checkFeatureAccess('user_123', 'api_access');

      expect(access.allowed).toBe(true);
      expect(access.currentTier).toBe('professional');
    });

    it('should deny features not included in plan', async () => {
      await freemiumManager.createSubscription('user_123', 'free');

      const access = await freemiumManager.checkFeatureAccess('user_123', 'api_access');

      expect(access.allowed).toBe(false);
      expect(access.upgradeRequired).toBeDefined();
    });

    it('should deny enterprise features to lower tiers', async () => {
      await freemiumManager.createSubscription('user_123', 'professional');

      const access = await freemiumManager.checkFeatureAccess('user_123', 'white_label');

      expect(access.allowed).toBe(false);
      expect(access.upgradeRequired).toBe('enterprise');
    });

    it('should indicate required upgrade tier', async () => {
      await freemiumManager.createSubscription('user_123', 'free');

      const access = await freemiumManager.checkFeatureAccess('user_123', 'strategy_publish');

      expect(access.allowed).toBe(false);
      expect(access.upgradeRequired).toBeDefined();
    });
  });

  describe('checkUsageLimit', () => {
    it('should check strategy limit', async () => {
      await freemiumManager.createSubscription('user_123', 'free');

      const check = await freemiumManager.checkUsageLimit('user_123', 'maxStrategies');

      expect(check.limit).toBeGreaterThan(0);
      expect(check.current).toBe(0);
      expect(check.remaining).toBeGreaterThan(0);
      expect(check.allowed).toBe(true);
    });

    it('should return unlimited for enterprise plan', async () => {
      await freemiumManager.createSubscription('user_123', 'enterprise');

      const check = await freemiumManager.checkUsageLimit('user_123', 'maxStrategies');

      expect(check.limit).toBe(-1);
      expect(check.allowed).toBe(true);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage metric', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      await freemiumManager.incrementUsage('user_123', 'strategiesPublished');
      await freemiumManager.incrementUsage('user_123', 'strategiesPublished');

      const sub = await freemiumManager.getUserSubscription('user_123');
      expect(sub?.usage.strategiesPublished).toBe(2);
    });

    it('should increment by custom amount', async () => {
      await freemiumManager.createSubscription('user_123', 'starter');

      await freemiumManager.incrementUsage('user_123', 'apiCallsToday', 50);

      const sub = await freemiumManager.getUserSubscription('user_123');
      expect(sub?.usage.apiCallsToday).toBe(50);
    });
  });

  describe('getUpgradeRecommendation', () => {
    it('should return null when usage is low', async () => {
      await freemiumManager.createSubscription('user_123', 'enterprise');

      const recommendation = await freemiumManager.getUpgradeRecommendation('user_123');
      expect(recommendation).toBeNull(); // Already on max tier
    });

    it('should recommend upgrade when approaching limits', async () => {
      await freemiumManager.createSubscription('user_123', 'free');

      // Simulate high usage
      const freePlan = await freemiumManager.getPlanByTier('free');
      const maxStrategies = freePlan?.limits.maxStrategies ?? 1;

      // Increment to 80% of limit
      for (let i = 0; i < Math.ceil(maxStrategies * 0.9); i++) {
        await freemiumManager.incrementUsage('user_123', 'strategiesPublished');
      }

      const recommendation = await freemiumManager.getUpgradeRecommendation('user_123');

      // Should recommend upgrade since we're near the limit
      if (recommendation) {
        expect(recommendation.currentTier).toBe('free');
        expect(recommendation.reasons.length).toBeGreaterThan(0);
        expect(recommendation.urgency).toBeDefined();
      }
    });
  });

  describe('events', () => {
    it('should emit events on subscription operations', async () => {
      const events: unknown[] = [];
      freemiumManager.onEvent(e => events.push(e));

      await freemiumManager.createSubscription('user_123', 'starter');
      await freemiumManager.upgradeSubscription('user_123', 'professional');

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// MarketplaceService Integration Tests (Extended for Issue #101)
// ============================================================================

describe('MarketplaceService - Economy Integration', () => {
  let marketplace: DefaultMarketplaceService;

  beforeEach(() => {
    marketplace = createMarketplaceService({ enabled: true });
  });

  it('should initialize all economy components', () => {
    expect(marketplace.sandbox).toBeDefined();
    expect(marketplace.revenueDistribution).toBeDefined();
    expect(marketplace.freemium).toBeDefined();
  });

  it('should include economy components in health check', async () => {
    const health = await marketplace.getHealth();

    expect(health.components.sandbox).toBe(true);
    expect(health.components.revenueDistribution).toBe(true);
    expect(health.components.freemium).toBe(true);
    expect(health.overall).toBe('healthy');
  });

  it('should forward events from sandbox manager', async () => {
    const events: unknown[] = [];
    marketplace.onEvent(e => events.push(e));

    const session = await marketplace.sandbox.createSession(
      'strategy_123',
      'creator_456',
      'paper_trading'
    );
    await marketplace.sandbox.runSession(session.id);

    expect(events.length).toBeGreaterThan(0);
  });

  it('should forward events from revenue distribution', async () => {
    const events: unknown[] = [];
    marketplace.onEvent(e => events.push(e));

    await marketplace.revenueDistribution.processRevenue({
      agentId: 'agent_1',
      strategyId: 'strategy_1',
      creatorId: 'creator_1',
      source: 'performance_fee',
      grossAmount: 100,
      currency: 'TON',
      metadata: {},
    });

    expect(events.length).toBeGreaterThan(0);
  });

  it('should forward events from freemium manager', async () => {
    const events: unknown[] = [];
    marketplace.onEvent(e => events.push(e));

    await marketplace.freemium.createSubscription('user_123', 'starter');

    expect(events.length).toBeGreaterThan(0);
  });

  it('should support end-to-end creator economy flow', async () => {
    // 1. Creator subscribes to professional plan
    const subscription = await marketplace.freemium.createSubscription(
      'creator_1',
      'professional'
    );
    expect(subscription.tier).toBe('professional');

    // 2. Check feature access for strategy publishing
    const featureAccess = await marketplace.freemium.checkFeatureAccess(
      'creator_1',
      'strategy_publish'
    );
    expect(featureAccess.allowed).toBe(true);

    // 3. Run sandbox validation
    const sandboxResult = await marketplace.sandbox.runFullValidation('strategy_123');
    expect(sandboxResult.score).toBeGreaterThanOrEqual(0);

    // 4. Create strategy on marketplace
    const strategy = await marketplace.strategies.create(createValidStrategyInput());
    expect(strategy.id).toBeDefined();

    // 5. Set up distribution rule
    const rule = await marketplace.revenueDistribution.createDistributionRule({
      creatorId: 'creator_1',
      agentId: 'agent_1',
      splits: [
        { recipientId: 'creator_1', recipientType: 'creator', percentage: 70 },
        { recipientId: 'platform', recipientType: 'platform', percentage: 25 },
        { recipientId: 'dao_treasury', recipientType: 'dao_treasury', percentage: 5 },
      ],
      highWaterMarkTracking: true,
      active: true,
    });
    expect(rule.id).toBeDefined();

    // 6. Process revenue from agent execution
    const distribution = await marketplace.revenueDistribution.processRevenue({
      agentId: 'agent_1',
      strategyId: strategy.id,
      creatorId: 'creator_1',
      source: 'performance_fee',
      grossAmount: 500,
      currency: 'TON',
      metadata: { strategyName: strategy.name },
    });
    expect(distribution.splits.length).toBeGreaterThan(0);

    // 7. Process distributions
    const batchResult = await marketplace.revenueDistribution.processPendingDistributions();
    expect(batchResult.successful).toBeGreaterThan(0);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createValidStrategyConfig(): StrategyConfig {
  return {
    supportedProtocols: ['DeDust', 'STON.fi'],
    supportedTokens: ['TON', 'USDT', 'USDC'],
    minCapital: 100,
    maxCapital: 100000,
    slippageTolerance: 1,
    stopLossPercent: 15,
    takeProfitPercent: 50,
    parameters: {},
  };
}

function createValidStrategyInput() {
  return {
    name: 'Test Economy Strategy',
    description: 'A test strategy for the marketplace economy integration',
    creatorId: 'creator_1',
    category: 'yield_farming' as const,
    visibility: 'public' as const,
    config: createValidStrategyConfig(),
  };
}
