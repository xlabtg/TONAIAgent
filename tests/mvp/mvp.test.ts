/**
 * MVP Module Tests
 *
 * Comprehensive tests for the MVP module including:
 * - Telegram Mini App
 * - Strategy Marketplace
 * - Agent Ranking
 * - Admin Dashboard
 * - Revenue/Monetization
 * - Growth & Privacy features
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createMVPService,
  createTelegramMiniAppManager,
  createStrategyMarketplaceManager,
  createAgentRankingManager,
  createAdminDashboardManager,
  createRevenueManager,
  DefaultMVPService,
  TelegramMiniAppManager,
  StrategyMarketplaceManager,
  AgentRankingManager,
  AdminDashboardManager,
  RevenueManager,
  premiumTiers,
} from '../../extended/mvp';

import type {
  MVPEvent,
  TelegramUser,
  UserWallet,
  UserAgent,
  StrategyListing,
  AgentRanking,
  RiskAlert,
  PremiumSubscription,
  AgentDataForRanking,
} from '../../extended/mvp';

// ============================================================================
// Telegram Mini App Tests
// ============================================================================

describe('TelegramMiniAppManager', () => {
  let telegramApp: TelegramMiniAppManager;

  beforeEach(() => {
    telegramApp = createTelegramMiniAppManager();
  });

  describe('User Management', () => {
    it('should register a new user from Telegram init data', async () => {
      const initData = createTelegramInitData();
      const user = await telegramApp.registerUser(initData);

      expect(user.telegramId).toBe(initData.user.id);
      expect(user.username).toBe(initData.user.username);
      expect(user.firstName).toBe(initData.user.first_name);
      expect(user.languageCode).toBe(initData.user.language_code);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should return existing user on re-registration', async () => {
      const initData = createTelegramInitData();
      const user1 = await telegramApp.registerUser(initData);
      const user2 = await telegramApp.registerUser(initData);

      expect(user1.telegramId).toBe(user2.telegramId);
      expect(user2.lastActiveAt.getTime()).toBeGreaterThanOrEqual(user1.lastActiveAt.getTime());
    });

    it('should get user by Telegram ID', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const user = telegramApp.getUser(initData.user.id);
      expect(user).toBeDefined();
      expect(user?.telegramId).toBe(initData.user.id);
    });
  });

  describe('Wallet Management', () => {
    it('should create a new wallet for user', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const wallet = await telegramApp.createWallet(initData.user.id, 'mpc');

      expect(wallet.id).toBeDefined();
      expect(wallet.userId).toBe(initData.user.id);
      expect(wallet.type).toBe('mpc');
      expect(wallet.address).toMatch(/^EQ/);
      expect(wallet.balanceTon).toBe(0);
    });

    it('should connect an external wallet', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const wallet = await telegramApp.connectWallet(
        initData.user.id,
        'EQTestAddress123456789'
      );

      expect(wallet.type).toBe('ton_connect');
      expect(wallet.address).toBe('EQTestAddress123456789');
    });

    it('should get all user wallets', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      await telegramApp.createWallet(initData.user.id, 'mpc');
      // Small delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await telegramApp.createWallet(initData.user.id, 'smart_contract');

      const wallets = telegramApp.getUserWallets(initData.user.id);
      expect(wallets.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Agent Management', () => {
    it('should create a new agent', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const agent = await telegramApp.createAgent({
        userId: initData.user.id,
        name: 'My First Agent',
        goal: 'passive_income',
        strategyId: 'yield_farming',
        capital: 1000,
        riskTolerance: 'medium',
        autoCompound: true,
      });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('My First Agent');
      expect(agent.goal).toBe('passive_income');
      expect(agent.status).toBe('pending');
      expect(agent.capitalAllocated).toBe(1000);
    });

    it('should activate a pending agent', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const agent = await telegramApp.createAgent({
        userId: initData.user.id,
        name: 'Test Agent',
        goal: 'dca',
        strategyId: 'dca_ton',
        capital: 500,
        riskTolerance: 'low',
        autoCompound: false,
      });

      const activatedAgent = await telegramApp.activateAgent(agent.id);
      expect(activatedAgent.status).toBe('active');
    });

    it('should pause an active agent', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const agent = await telegramApp.createAgent({
        userId: initData.user.id,
        name: 'Test Agent',
        goal: 'trading',
        strategyId: 'arbitrage',
        capital: 2000,
        riskTolerance: 'high',
        autoCompound: true,
      });

      await telegramApp.activateAgent(agent.id);
      const pausedAgent = await telegramApp.pauseAgent(agent.id, 'User requested');

      expect(pausedAgent.status).toBe('paused');
    });

    it('should get agent performance metrics', async () => {
      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      const agent = await telegramApp.createAgent({
        userId: initData.user.id,
        name: 'Performance Test',
        goal: 'yield_farming',
        strategyId: 'yield_farming',
        capital: 5000,
        riskTolerance: 'medium',
        autoCompound: true,
      });

      const performance = telegramApp.getAgentPerformance(agent.id, '7d');
      expect(performance.agentId).toBe(agent.id);
      expect(performance.period).toBe('7d');
      expect(performance.totalReturn).toBeDefined();
      expect(performance.winRate).toBeDefined();
    });
  });

  describe('Quick Deploy', () => {
    it('should quick deploy wallet and agent in one step', async () => {
      const result = await telegramApp.quickDeploy('user_123', 'passive_income', 1000);

      expect(result.user.telegramId).toBe('user_123');
      expect(result.wallet.userId).toBe('user_123');
      expect(result.wallet.balanceTon).toBe(1000);
      expect(result.agent.status).toBe('active'); // Auto-activated
      expect(result.agent.goal).toBe('passive_income');
    });
  });

  describe('Events', () => {
    it('should emit events on user registration', async () => {
      const events: MVPEvent[] = [];
      telegramApp.onEvent((event) => events.push(event));

      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'user_registered')).toBe(true);
    });

    it('should emit events on agent creation', async () => {
      const events: MVPEvent[] = [];
      telegramApp.onEvent((event) => events.push(event));

      const initData = createTelegramInitData();
      await telegramApp.registerUser(initData);

      await telegramApp.createAgent({
        userId: initData.user.id,
        name: 'Event Test',
        goal: 'dca',
        strategyId: 'dca_ton',
        capital: 100,
        riskTolerance: 'low',
        autoCompound: false,
      });

      expect(events.some((e) => e.type === 'agent_created')).toBe(true);
    });
  });
});

// ============================================================================
// Strategy Marketplace Tests
// ============================================================================

describe('StrategyMarketplaceManager', () => {
  let marketplace: StrategyMarketplaceManager;

  beforeEach(() => {
    marketplace = createStrategyMarketplaceManager();
  });

  describe('Strategy Discovery', () => {
    it('should list default strategies', () => {
      const result = marketplace.listStrategies();

      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter strategies by category', () => {
      const result = marketplace.listStrategies({ category: 'dca' });

      expect(result.strategies.every((s) => s.category === 'dca')).toBe(true);
    });

    it('should filter strategies by risk level', () => {
      const result = marketplace.listStrategies({ riskLevel: 'low' });

      expect(result.strategies.every((s) => s.riskLevel === 'low')).toBe(true);
    });

    it('should filter strategies by minimum APY', () => {
      const result = marketplace.listStrategies({ minApy: 20 });

      expect(result.strategies.every((s) => s.apy >= 20)).toBe(true);
    });

    it('should sort strategies by copiers descending', () => {
      const result = marketplace.listStrategies({ sortBy: 'copiers', sortOrder: 'desc' });

      for (let i = 1; i < result.strategies.length; i++) {
        expect(result.strategies[i].copiers).toBeLessThanOrEqual(
          result.strategies[i - 1].copiers
        );
      }
    });

    it('should get featured strategies', () => {
      const featured = marketplace.getFeaturedStrategies();

      expect(featured.every((s) => s.isFeatured)).toBe(true);
    });

    it('should search strategies by text', () => {
      const results = marketplace.searchStrategies('yield');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Strategy Publishing', () => {
    it('should publish a new strategy', async () => {
      const strategy = await marketplace.publishStrategy({
        creatorId: 'creator_123',
        creatorUsername: 'TestCreator',
        name: 'My Custom Strategy',
        description: 'A test strategy for unit tests',
        category: 'trading',
        riskLevel: 'medium',
        performanceFee: 15,
      });

      expect(strategy.id).toBeDefined();
      expect(strategy.name).toBe('My Custom Strategy');
      expect(strategy.category).toBe('trading');
      expect(strategy.creatorId).toBe('creator_123');
      expect(strategy.performanceFee).toBe(15);
    });

    it('should cap performance fee at maximum', async () => {
      const strategy = await marketplace.publishStrategy({
        creatorId: 'creator_123',
        creatorUsername: 'TestCreator',
        name: 'High Fee Strategy',
        description: 'Strategy with high fee',
        category: 'arbitrage',
        riskLevel: 'high',
        performanceFee: 50, // Above max
      });

      expect(strategy.performanceFee).toBe(20); // Capped at max
    });
  });

  describe('Copy Trading', () => {
    it('should start copying a strategy', async () => {
      // Create a new strategy with 0 copiers
      const newStrategy = await marketplace.publishStrategy({
        creatorId: 'test_creator',
        creatorUsername: 'TestCreator',
        name: 'Copy Test Strategy',
        description: 'Strategy for copy trading tests',
        category: 'dca',
        riskLevel: 'low',
      });

      const position = await marketplace.startCopying({
        userId: 'user_123',
        strategyId: newStrategy.id,
        capital: 500,
      });

      expect(position.id).toBeDefined();
      expect(position.userId).toBe('user_123');
      expect(position.strategyId).toBe(newStrategy.id);
      expect(position.capitalAllocated).toBe(500);
      expect(position.status).toBe('active');
    });

    it('should reject copying below minimum investment', async () => {
      const newStrategy = await marketplace.publishStrategy({
        creatorId: 'test_creator',
        creatorUsername: 'TestCreator',
        name: 'Min Investment Test Strategy',
        description: 'Strategy for min investment test',
        category: 'dca',
        riskLevel: 'low',
      });

      await expect(
        marketplace.startCopying({
          userId: 'user_123',
          strategyId: newStrategy.id,
          capital: 1, // Below minimum
        })
      ).rejects.toThrow('Minimum investment');
    });

    it('should stop copying a strategy', async () => {
      const newStrategy = await marketplace.publishStrategy({
        creatorId: 'test_creator',
        creatorUsername: 'TestCreator',
        name: 'Stop Copy Test Strategy',
        description: 'Strategy for stop copy test',
        category: 'dca',
        riskLevel: 'low',
      });

      const position = await marketplace.startCopying({
        userId: 'user_123',
        strategyId: newStrategy.id,
        capital: 500,
      });

      const stoppedPosition = await marketplace.stopCopying(position.id);
      expect(stoppedPosition.status).toBe('stopped');
    });

    it('should update strategy copiers count', async () => {
      const newStrategy = await marketplace.publishStrategy({
        creatorId: 'test_creator',
        creatorUsername: 'TestCreator',
        name: 'Copiers Count Test Strategy',
        description: 'Strategy for copiers count test',
        category: 'dca',
        riskLevel: 'low',
      });
      const initialCopiers = newStrategy.copiers;

      await marketplace.startCopying({
        userId: 'user_123',
        strategyId: newStrategy.id,
        capital: 500,
      });

      const updatedStrategy = marketplace.getStrategy(newStrategy.id);
      expect(updatedStrategy?.copiers).toBe(initialCopiers + 1);
    });
  });

  describe('Creator Profile', () => {
    it('should create creator profile on strategy publish', async () => {
      await marketplace.publishStrategy({
        creatorId: 'new_creator',
        creatorUsername: 'NewCreator',
        name: 'First Strategy',
        description: 'First published strategy',
        category: 'dca',
        riskLevel: 'low',
      });

      const profile = marketplace.getCreatorProfile('new_creator');
      expect(profile).toBeDefined();
      expect(profile?.username).toBe('NewCreator');
      expect(profile?.totalStrategies).toBe(1);
    });

    it('should get top creators', () => {
      const topCreators = marketplace.getTopCreators(10);

      expect(topCreators.length).toBeGreaterThan(0);
    });
  });

  describe('Ratings', () => {
    it('should rate a strategy', async () => {
      const strategies = marketplace.listStrategies();
      const strategy = strategies.strategies[0];
      const initialRating = strategy.rating;
      const initialCount = strategy.ratingCount;

      await marketplace.rateStrategy(strategy.id, 'user_123', 5);

      const updatedStrategy = marketplace.getStrategy(strategy.id);
      expect(updatedStrategy?.ratingCount).toBe(initialCount + 1);
    });

    it('should reject invalid rating', async () => {
      const strategies = marketplace.listStrategies();
      const strategy = strategies.strategies[0];

      await expect(
        marketplace.rateStrategy(strategy.id, 'user_123', 10) // Invalid rating
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });
});

// ============================================================================
// Agent Ranking Tests
// ============================================================================

describe('AgentRankingManager', () => {
  let ranking: AgentRankingManager;

  beforeEach(() => {
    ranking = createAgentRankingManager();
  });

  describe('Ranking Calculation', () => {
    it('should calculate and update rankings', async () => {
      const agentData = createAgentDataForRanking(5);
      const result = await ranking.updateAllRankings(agentData);

      expect(result.updated).toBe(5);
      expect(result.errors.length).toBe(0);
    });

    it('should sort rankings by score', async () => {
      const agentData = createAgentDataForRanking(10);
      await ranking.updateAllRankings(agentData);

      const topRankings = ranking.getTopRankings(10);
      for (let i = 1; i < topRankings.length; i++) {
        expect(topRankings[i].score).toBeLessThanOrEqual(topRankings[i - 1].score);
      }
    });

    it('should assign sequential ranks', async () => {
      const agentData = createAgentDataForRanking(5);
      await ranking.updateAllRankings(agentData);

      const topRankings = ranking.getTopRankings(5);
      topRankings.forEach((r, i) => {
        expect(r.rank).toBe(i + 1);
      });
    });

    it('should calculate rank changes on update', async () => {
      // Create fixed agent data
      const agentData1: AgentDataForRanking[] = [
        createSingleAgentData('agent_a', 30),
        createSingleAgentData('agent_b', 40),
        createSingleAgentData('agent_c', 50),
      ];
      await ranking.updateAllRankings(agentData1);

      // Update with significantly different APY to force rank change
      const agentData2: AgentDataForRanking[] = [
        createSingleAgentData('agent_a', 80), // Was lowest, now highest
        createSingleAgentData('agent_b', 40),
        createSingleAgentData('agent_c', 50),
      ];
      await ranking.updateAllRankings(agentData2);

      const topRankings = ranking.getTopRankings(3);
      // At least one agent should have changed rank
      const hasRankChange = topRankings.some((r) => r.rankChange !== 0);
      expect(hasRankChange).toBe(true);
    });
  });

  describe('Ranking Retrieval', () => {
    it('should get ranking for specific agent', async () => {
      const agentData = createAgentDataForRanking(3);
      await ranking.updateAllRankings(agentData);

      const agentRanking = ranking.getAgentRanking(agentData[0].agentId);
      expect(agentRanking).toBeDefined();
      expect(agentRanking?.agentId).toBe(agentData[0].agentId);
    });

    it('should filter rankings by APY', async () => {
      const agentData = createAgentDataForRanking(10);
      await ranking.updateAllRankings(agentData);

      const filtered = ranking.getRankingsByFilter({ minApy: 30 });
      expect(filtered.every((r) => r.apy >= 30)).toBe(true);
    });

    it('should get ranking statistics', async () => {
      const agentData = createAgentDataForRanking(10);
      await ranking.updateAllRankings(agentData);

      const stats = ranking.getRankingStats();
      expect(stats.totalRanked).toBe(10);
      expect(stats.avgScore).toBeGreaterThan(0);
      expect(stats.lastUpdate).toBeInstanceOf(Date);
    });

    it('should get top movers', async () => {
      const agentData = createAgentDataForRanking(10);
      await ranking.updateAllRankings(agentData);

      // Update again with changes
      agentData[5].apy = 200;
      await ranking.updateAllRankings(agentData);

      const movers = ranking.getTopMovers(5);
      expect(movers.gainers.length).toBeGreaterThanOrEqual(0);
      expect(movers.losers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Telegram Signals Consent', () => {
    it('should record user consent', () => {
      ranking.recordConsent('user_123', true);
      expect(ranking.hasConsent('user_123')).toBe(true);
    });

    it('should remove consent on opt-out', () => {
      ranking.recordConsent('user_123', true);
      ranking.recordConsent('user_123', false);
      expect(ranking.hasConsent('user_123')).toBe(false);
    });

    it('should update telegram signals for consented user', () => {
      ranking.recordConsent('user_123', true);

      ranking.updateTelegramSignals('user_123', {
        engagement: 80,
        activity: 70,
        socialTrust: 75,
        communityParticipation: 60,
      });

      const signals = ranking.getTelegramSignals('user_123');
      expect(signals?.engagement).toBe(80);
    });

    it('should reject signals update for non-consented user', () => {
      expect(() => {
        ranking.updateTelegramSignals('user_123', {
          engagement: 80,
          activity: 70,
          socialTrust: 75,
          communityParticipation: 60,
        });
      }).toThrow('User has not consented');
    });
  });
});

// ============================================================================
// Admin Dashboard Tests
// ============================================================================

describe('AdminDashboardManager', () => {
  let admin: AdminDashboardManager;

  beforeEach(() => {
    admin = createAdminDashboardManager();
    // Initialize root admin for tests
    admin.initializeRootAdmin('root_user', 'root_admin');
  });

  describe('Admin Management', () => {
    it('should create admin with correct role', async () => {
      const newAdmin = await admin.createAdmin('admin_root', {
        userId: 'user_456',
        username: 'test_admin',
        email: 'admin@test.com',
        role: 'operator',
      });

      expect(newAdmin.id).toBeDefined();
      expect(newAdmin.role).toBe('operator');
      expect(newAdmin.permissions.pauseAgents).toBe(true);
      expect(newAdmin.permissions.manageUsers).toBe(false);
    });

    it('should reject admin creation without permission', async () => {
      // Create operator first
      const operator = await admin.createAdmin('admin_root', {
        userId: 'user_456',
        username: 'operator',
        email: 'operator@test.com',
        role: 'operator',
      });

      // Operator tries to create admin
      await expect(
        admin.createAdmin(operator.id, {
          userId: 'user_789',
          username: 'new_admin',
          email: 'new@test.com',
          role: 'viewer',
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should update admin role', async () => {
      const newAdmin = await admin.createAdmin('admin_root', {
        userId: 'user_456',
        username: 'test_admin',
        email: 'admin@test.com',
        role: 'operator',
      });

      const updated = await admin.updateAdminRole('admin_root', newAdmin.id, 'admin');
      expect(updated.role).toBe('admin');
      expect(updated.permissions.manageUsers).toBe(true);
    });
  });

  describe('System Metrics', () => {
    it('should return system metrics', () => {
      const metrics = admin.getSystemMetrics();

      expect(metrics.totalUsers).toBeDefined();
      expect(metrics.totalAgents).toBeDefined();
      expect(metrics.tvlUsd).toBeDefined();
      expect(metrics.systemHealth).toBeDefined();
    });

    it('should update metrics', () => {
      admin.updateMetrics({
        totalUsers: 1000,
        dau: 500,
        tvlUsd: 1000000,
      });

      const metrics = admin.getSystemMetrics();
      expect(metrics.totalUsers).toBe(1000);
      expect(metrics.dau).toBe(500);
      expect(metrics.tvlUsd).toBe(1000000);
    });
  });

  describe('Risk Alerts', () => {
    it('should create risk alert', () => {
      const alert = admin.createAlert({
        type: 'agent_risk',
        severity: 'high',
        title: 'High Drawdown Detected',
        description: 'Agent has exceeded maximum drawdown threshold',
        entityId: 'agent_123',
        entityType: 'agent',
        recommendedAction: 'Consider pausing agent',
      });

      expect(alert.id).toBeDefined();
      expect(alert.severity).toBe('high');
      expect(alert.isResolved).toBe(false);
    });

    it('should get active alerts sorted by severity', () => {
      admin.createAlert({
        type: 'agent_risk',
        severity: 'low',
        title: 'Minor Issue',
        description: 'Low severity alert',
        entityId: 'agent_1',
        entityType: 'agent',
      });

      admin.createAlert({
        type: 'agent_risk',
        severity: 'critical',
        title: 'Critical Issue',
        description: 'Critical severity alert',
        entityId: 'agent_2',
        entityType: 'agent',
      });

      const activeAlerts = admin.getActiveAlerts();
      expect(activeAlerts[0].severity).toBe('critical');
    });

    it('should resolve alert', async () => {
      const alert = admin.createAlert({
        type: 'fraud',
        severity: 'high',
        title: 'Suspicious Activity',
        description: 'Unusual trading pattern detected',
        entityId: 'user_123',
        entityType: 'user',
      });

      const resolved = await admin.resolveAlert(
        'admin_root',
        alert.id,
        'Investigated and cleared'
      );

      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolvedBy).toBe('admin_root');
      expect(resolved.resolutionNotes).toBe('Investigated and cleared');
    });
  });

  describe('Moderation Actions', () => {
    it('should pause agent', async () => {
      const action = await admin.pauseAgent(
        'admin_root',
        'agent_123',
        'Risk threshold exceeded'
      );

      expect(action.type).toBe('pause');
      expect(action.targetId).toBe('agent_123');
      expect(action.reason).toBe('Risk threshold exceeded');
    });

    it('should block and unblock entity', async () => {
      await admin.blockEntity('admin_root', 'user_123', 'user', 'TOS violation');
      expect(admin.isBlocked('user_123')).toBe(true);

      await admin.unblockEntity('admin_root', 'user_123', 'user');
      expect(admin.isBlocked('user_123')).toBe(false);
    });

    it('should get moderation history', async () => {
      await admin.pauseAgent('admin_root', 'agent_123', 'First pause');
      await admin.pauseAgent('admin_root', 'agent_123', 'Second pause');

      const history = admin.getModerationHistory('agent_123');
      expect(history.length).toBe(2);
    });
  });

  describe('Emergency Controls', () => {
    it('should allow superadmin emergency pause', async () => {
      await expect(
        admin.emergencyPauseAll('admin_root', 'Market crash detected')
      ).resolves.not.toThrow();
    });

    it('should reject emergency actions from non-superadmin', async () => {
      const operator = await admin.createAdmin('admin_root', {
        userId: 'user_456',
        username: 'operator',
        email: 'operator@test.com',
        role: 'operator',
      });

      await expect(
        admin.emergencyPauseAll(operator.id, 'Test')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Audit Log', () => {
    it('should log admin actions', async () => {
      await admin.createAdmin('admin_root', {
        userId: 'user_456',
        username: 'test_admin',
        email: 'admin@test.com',
        role: 'operator',
      });

      const auditLog = admin.getAuditLog({ adminId: 'admin_root' });
      expect(auditLog.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Revenue Manager Tests
// ============================================================================

describe('RevenueManager', () => {
  let revenue: RevenueManager;

  beforeEach(() => {
    revenue = createRevenueManager();
  });

  describe('Fee Collection', () => {
    it('should record performance fee', async () => {
      const feeRecord = await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      expect(feeRecord.id).toBeDefined();
      expect(feeRecord.type).toBe('performance');
      expect(feeRecord.feeAmount).toBe(100);
      expect(feeRecord.platformShare).toBeGreaterThan(0);
      expect(feeRecord.creatorShare).toBeGreaterThan(0);
    });

    it('should split fees between platform and creator', async () => {
      const feeRecord = await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      // Use toBeCloseTo for floating point comparison
      expect(feeRecord.creatorShare).toBeCloseTo(70, 2); // 70% of 100
      expect(feeRecord.platformShare).toBeCloseTo(30, 2); // 30% of 100
    });

    it('should update creator balance', async () => {
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      const balance = revenue.getCreatorBalance('creator_789');
      expect(balance.available).toBe(70); // Creator share
      expect(balance.lifetime).toBe(70);
    });

    it('should get user fee history', async () => {
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      const history = revenue.getUserFeeHistory('user_111');
      expect(history.length).toBe(1);
    });
  });

  describe('Premium Subscriptions', () => {
    it('should create subscription', async () => {
      const subscription = await revenue.createSubscription('user_123', 'pro');

      expect(subscription.id).toBeDefined();
      expect(subscription.tier).toBe('pro');
      expect(subscription.status).toBe('active');
      expect(subscription.pricePaid).toBe(29);
    });

    it('should check feature access', async () => {
      await revenue.createSubscription('user_123', 'pro');

      expect(revenue.hasFeatureAccess('user_123', 'Advanced AI analytics')).toBe(true);
      expect(revenue.hasFeatureAccess('user_123', 'White-label options')).toBe(false); // Institutional only
    });

    it('should upgrade subscription', async () => {
      await revenue.createSubscription('user_123', 'pro');
      const upgraded = await revenue.upgradeSubscription('user_123', 'institutional');

      expect(upgraded.tier).toBe('institutional');
    });

    it('should cancel subscription', async () => {
      await revenue.createSubscription('user_123', 'pro');
      const canceled = await revenue.cancelSubscription('user_123');

      expect(canceled.status).toBe('canceled');
      expect(canceled.autoRenew).toBe(false);
    });

    it('should get subscription limits', () => {
      const limits = revenue.getSubscriptionLimits('non_subscriber');

      expect(limits.maxAgents).toBe(3); // Basic tier default
      expect(limits.maxStrategies).toBe(5);
    });
  });

  describe('Payouts', () => {
    it('should request payout', async () => {
      // First add some earnings
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      const payout = await revenue.requestPayout(
        'creator_789',
        50,
        'EQPayoutAddress123'
      );

      expect(payout.id).toBeDefined();
      expect(payout.amount).toBe(50);
      expect(payout.status).toBe('pending');
    });

    it('should reject payout below threshold', async () => {
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      await expect(
        revenue.requestPayout('creator_789', 5, 'EQPayoutAddress123')
      ).rejects.toThrow('Minimum payout');
    });

    it('should reject payout exceeding balance', async () => {
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 100,
        feePercentage: 10,
        feeAmount: 10,
      });

      await expect(
        revenue.requestPayout('creator_789', 100, 'EQPayoutAddress123')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Revenue Metrics', () => {
    it('should get revenue metrics', async () => {
      // Add some revenue
      await revenue.recordPerformanceFee({
        agentId: 'agent_123',
        strategyId: 'strategy_456',
        creatorId: 'creator_789',
        userId: 'user_111',
        profitAmount: 1000,
        feePercentage: 10,
        feeAmount: 100,
      });

      await revenue.createSubscription('user_123', 'pro');

      const metrics = revenue.getRevenueMetrics('30d');

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.period).toBe('30d');
    });
  });
});

// ============================================================================
// Integrated MVP Service Tests
// ============================================================================

describe('DefaultMVPService', () => {
  let mvp: DefaultMVPService;

  beforeEach(() => {
    mvp = createMVPService();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await mvp.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.telegramApp).toBe(true);
      expect(health.components.marketplace).toBe(true);
      expect(health.components.ranking).toBe(true);
    });
  });

  describe('Referral System', () => {
    it('should create referral code', async () => {
      const code = await mvp.createReferralCode('user_123');

      expect(code).toMatch(/^REF_/);
    });

    it('should return same code for same user', async () => {
      const code1 = await mvp.createReferralCode('user_123');
      const code2 = await mvp.createReferralCode('user_123');

      expect(code1).toBe(code2);
    });

    it('should activate referral', async () => {
      await mvp.createReferralCode('referrer_123');
      await mvp.activateReferral('referrer_123', 'new_user_456');

      const info = mvp.getReferralInfo('referrer_123');
      expect(info.totalReferrals).toBe(1);
      expect(info.activeReferrals).toBe(1);
    });

    it('should upgrade referral tier', async () => {
      await mvp.createReferralCode('referrer_123');

      // Activate many referrals
      for (let i = 0; i < 15; i++) {
        await mvp.activateReferral('referrer_123', `new_user_${i}`);
      }

      const info = mvp.getReferralInfo('referrer_123');
      expect(info.tier).toBe('silver'); // >= 10 referrals
    });
  });

  describe('Privacy/Consent', () => {
    it('should record consent', () => {
      mvp.recordConsent('user_123', {
        dataTracking: true,
        performanceSharing: true,
        telegramSignals: false,
      });

      const consent = mvp.getConsent('user_123');
      expect(consent?.dataTracking).toBe(true);
      expect(consent?.telegramSignals).toBe(false);
    });

    it('should check specific consent', () => {
      mvp.recordConsent('user_123', {
        dataTracking: true,
        performanceSharing: false,
      });

      expect(mvp.hasConsent('user_123', 'dataTracking')).toBe(true);
      expect(mvp.hasConsent('user_123', 'performanceSharing')).toBe(false);
    });

    it('should sync telegram signals consent with ranking', () => {
      mvp.recordConsent('user_123', { telegramSignals: true });

      expect(mvp.ranking.hasConsent('user_123')).toBe(true);
    });
  });

  describe('Localization', () => {
    it('should set user language', () => {
      mvp.setUserLanguage('user_123', 'ru');
      expect(mvp.getUserLanguage('user_123')).toBe('ru');
    });

    it('should fallback for unsupported language', () => {
      mvp.setUserLanguage('user_123', 'jp'); // Not supported
      expect(mvp.getUserLanguage('user_123')).toBe('en'); // Fallback
    });

    it('should return default for unknown user', () => {
      expect(mvp.getUserLanguage('unknown_user')).toBe('en');
    });
  });

  describe('Event System', () => {
    it('should emit events from sub-managers', async () => {
      const events: MVPEvent[] = [];
      mvp.onEvent((event) => events.push(event));

      // Trigger event from telegram app
      const initData = createTelegramInitData();
      await mvp.telegramApp.registerUser(initData);

      expect(events.some((e) => e.type === 'user_registered')).toBe(true);
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should complete full user journey', async () => {
      // 1. User registers via Telegram
      const initData = createTelegramInitData();
      const user = await mvp.telegramApp.registerUser(initData);

      // 2. User creates wallet
      const wallet = await mvp.telegramApp.createWallet(user.telegramId, 'mpc');

      // 3. User browses strategies
      const strategies = mvp.marketplace.listStrategies({
        category: 'yield_farming',
        minRating: 4.0,
      });
      expect(strategies.strategies.length).toBeGreaterThan(0);

      // 4. User copies a strategy
      const strategy = strategies.strategies[0];
      const copyPosition = await mvp.marketplace.startCopying({
        userId: user.telegramId,
        strategyId: strategy.id,
        capital: 1000,
      });

      // 5. User creates agent
      const agent = await mvp.telegramApp.createAgent({
        userId: user.telegramId,
        name: 'My Yield Agent',
        goal: 'yield_farming',
        strategyId: strategy.id,
        capital: 1000,
        riskTolerance: 'medium',
        autoCompound: true,
      });

      // 6. Activate agent
      await mvp.telegramApp.activateAgent(agent.id);

      // 7. Check portfolio
      const portfolio = await mvp.telegramApp.recalculatePortfolio(user.telegramId);
      expect(portfolio.activeAgents).toBe(1);

      // Verify all steps succeeded
      expect(user.telegramId).toBeDefined();
      expect(wallet.id).toBeDefined();
      expect(copyPosition.status).toBe('active');
      expect(agent.status).toBe('active');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

function createTelegramInitData() {
  return {
    user: {
      id: `user_${Date.now()}`,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
      language_code: 'en',
      is_premium: false,
    },
  };
}

function createAgentDataForRanking(count: number): AgentDataForRanking[] {
  return Array.from({ length: count }, (_, i) => ({
    agentId: `agent_${i}`,
    agentName: `Agent ${i}`,
    strategyName: `Strategy ${i}`,
    ownerUsername: `user_${i}`,
    apy: 10 + Math.random() * 50,
    tvl: 10000 + Math.random() * 100000,
    maxDrawdown: Math.random() * 20,
    uptime: 90 + Math.random() * 10,
    sharpeRatio: 1 + Math.random() * 2,
    winRate: 50 + Math.random() * 30,
    volatility: Math.random() * 30,
    consistencyScore: 60 + Math.random() * 30,
    exposurePercent: 50 + Math.random() * 40,
    leverageUsed: Math.random() * 3,
    concentrationRisk: Math.random() * 50,
    communityRating: 3 + Math.random() * 2,
    totalCopiers: Math.floor(Math.random() * 500),
    historyDays: 30 + Math.floor(Math.random() * 300),
    executionQuality: 70 + Math.random() * 30,
    gasEfficiency: 60 + Math.random() * 40,
    securityScore: 70 + Math.random() * 30,
  }));
}

function createSingleAgentData(agentId: string, apy: number): AgentDataForRanking {
  return {
    agentId,
    agentName: `Agent ${agentId}`,
    strategyName: `Strategy ${agentId}`,
    ownerUsername: `user_${agentId}`,
    apy,
    tvl: 50000,
    maxDrawdown: 10,
    uptime: 95,
    sharpeRatio: 1.5,
    winRate: 60,
    volatility: 15,
    consistencyScore: 70,
    exposurePercent: 60,
    leverageUsed: 1,
    concentrationRisk: 30,
    communityRating: 4,
    totalCopiers: 100,
    historyDays: 90,
    executionQuality: 80,
    gasEfficiency: 75,
    securityScore: 85,
  };
}
