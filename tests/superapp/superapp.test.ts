/**
 * Super App Module Tests
 *
 * Comprehensive tests for the TON Super App including wallet, agent dashboard,
 * social layer, financial dashboard, notifications, telegram, gamification,
 * AI assistant, and monetization modules.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createSuperAppService,
  createWalletManager,
  createAgentDashboardManager,
  createSocialManager,
  createFinancialDashboardManager,
  createNotificationManager,
  createTelegramManager,
  createGamificationManager,
  createAIAssistantManager,
  createSuperAppMonetizationManager,
  DefaultSuperAppService,
  DefaultWalletManager,
  DefaultAgentDashboardManager,
  DefaultSocialManager,
  DefaultFinancialDashboardManager,
  DefaultNotificationManager,
  DefaultTelegramManager,
  DefaultGamificationManager,
  DefaultAIAssistantManager,
  DefaultSuperAppMonetizationManager,
} from '../../src/superapp';

// ============================================================================
// Super App Service Tests
// ============================================================================

describe('SuperAppService', () => {
  let superApp: DefaultSuperAppService;

  beforeEach(() => {
    superApp = createSuperAppService();
  });

  describe('initialization', () => {
    it('should create super app service with default config', () => {
      expect(superApp).toBeInstanceOf(DefaultSuperAppService);
      expect(superApp.enabled).toBe(true);
    });

    it('should initialize all components', () => {
      expect(superApp.wallet).toBeInstanceOf(DefaultWalletManager);
      expect(superApp.agentDashboard).toBeInstanceOf(DefaultAgentDashboardManager);
      expect(superApp.social).toBeInstanceOf(DefaultSocialManager);
      expect(superApp.financial).toBeInstanceOf(DefaultFinancialDashboardManager);
      expect(superApp.notifications).toBeInstanceOf(DefaultNotificationManager);
      expect(superApp.telegram).toBeInstanceOf(DefaultTelegramManager);
      expect(superApp.gamification).toBeInstanceOf(DefaultGamificationManager);
      expect(superApp.aiAssistant).toBeInstanceOf(DefaultAIAssistantManager);
      expect(superApp.monetization).toBeInstanceOf(DefaultSuperAppMonetizationManager);
    });

    it('should report healthy status', async () => {
      const health = await superApp.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.wallet).toBe(true);
      expect(health.components.agentDashboard).toBe(true);
      expect(health.components.social).toBe(true);
    });
  });

  describe('events', () => {
    it('should forward events from components', async () => {
      const events: unknown[] = [];
      superApp.onEvent((event) => events.push(event));

      await superApp.wallet.create({
        userId: 'user_123',
        type: 'standard',
        name: 'Test Wallet',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('type', 'wallet_created');
    });
  });
});

// ============================================================================
// Wallet Manager Tests
// ============================================================================

describe('WalletManager', () => {
  let walletManager: DefaultWalletManager;

  beforeEach(() => {
    walletManager = createWalletManager();
  });

  describe('create', () => {
    it('should create a new wallet', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      expect(wallet.id).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.name).toBe('My Wallet');
      expect(wallet.userId).toBe('user_123');
      expect(wallet.type).toBe('standard');
    });

    it('should create wallet with custom security level', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'smart_contract',
        name: 'Secure Wallet',
        securityLevel: 'enhanced',
      });

      expect(wallet.securityConfig.level).toBe('enhanced');
    });
  });

  describe('balances', () => {
    it('should refresh balances', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      const balances = await walletManager.refreshBalances(wallet.id);

      expect(balances).toBeInstanceOf(Array);
      expect(balances.length).toBeGreaterThan(0);
      expect(balances[0]).toHaveProperty('asset');
      expect(balances[0]).toHaveProperty('amount');
    });
  });

  describe('transfer', () => {
    it('should create transfer transaction', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      const tx = await walletManager.transfer({
        walletId: wallet.id,
        to: 'EQD__recipient_address',
        amount: 10,
        currency: 'TON',
      });

      expect(tx.id).toBeDefined();
      expect(tx.status).toBe('pending');
      expect(tx.amount).toBe(10);
      expect(tx.currency).toBe('TON');
    });

    it('should reject transfer above single transaction limit', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      await expect(
        walletManager.transfer({
          walletId: wallet.id,
          to: 'EQD__recipient_address',
          amount: 10000, // Above default limit
          currency: 'TON',
        })
      ).rejects.toThrow('exceeds single transaction limit');
    });

    it('should reject transfer when wallet is locked', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      await walletManager.lockWallet(wallet.id);

      await expect(
        walletManager.transfer({
          walletId: wallet.id,
          to: 'EQD__recipient_address',
          amount: 10,
          currency: 'TON',
        })
      ).rejects.toThrow('locked');
    });
  });

  describe('agent integration', () => {
    it('should connect agent to wallet', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      const connectedAgent = await walletManager.connectAgent({
        walletId: wallet.id,
        agentId: 'agent_456',
        agentName: 'Test Agent',
        permissions: [{ type: 'read_balance', requiresApproval: false }],
        capitalAllocated: 100,
      });

      expect(connectedAgent.agentId).toBe('agent_456');
      expect(connectedAgent.status).toBe('active');
    });

    it('should reject duplicate agent connection', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      await walletManager.connectAgent({
        walletId: wallet.id,
        agentId: 'agent_456',
        agentName: 'Test Agent',
        permissions: [],
        capitalAllocated: 100,
      });

      await expect(
        walletManager.connectAgent({
          walletId: wallet.id,
          agentId: 'agent_456',
          agentName: 'Test Agent',
          permissions: [],
          capitalAllocated: 100,
        })
      ).rejects.toThrow('already connected');
    });
  });

  describe('guardians', () => {
    it('should add guardian', async () => {
      const wallet = await walletManager.create({
        userId: 'user_123',
        type: 'standard',
        name: 'My Wallet',
      });

      const guardian = await walletManager.addGuardian({
        walletId: wallet.id,
        name: 'Friend 1',
        telegramId: '@friend1',
      });

      expect(guardian.id).toBeDefined();
      expect(guardian.name).toBe('Friend 1');
      expect(guardian.status).toBe('pending');
    });
  });
});

// ============================================================================
// Agent Dashboard Manager Tests
// ============================================================================

describe('AgentDashboardManager', () => {
  let agentDashboard: DefaultAgentDashboardManager;

  beforeEach(() => {
    agentDashboard = createAgentDashboardManager();
  });

  describe('createAgent', () => {
    it('should create a new agent', async () => {
      const agent = await agentDashboard.createAgent({
        userId: 'user_123',
        name: 'Test Agent',
        description: 'A test agent',
        strategyId: 'strategy_456',
        strategyName: 'Test Strategy',
        capitalAllocated: 1000,
      });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.status).toBe('initializing');
      expect(agent.capitalAllocated).toBe(1000);
    });

    it('should enforce agent limit per user', async () => {
      const manager = createAgentDashboardManager({ maxAgentsPerUser: 2 });

      await manager.createAgent({
        userId: 'user_123',
        name: 'Agent 1',
        description: 'First',
        strategyId: 'strategy_1',
        strategyName: 'Strategy 1',
        capitalAllocated: 100,
      });

      await manager.createAgent({
        userId: 'user_123',
        name: 'Agent 2',
        description: 'Second',
        strategyId: 'strategy_2',
        strategyName: 'Strategy 2',
        capitalAllocated: 100,
      });

      await expect(
        manager.createAgent({
          userId: 'user_123',
          name: 'Agent 3',
          description: 'Third',
          strategyId: 'strategy_3',
          strategyName: 'Strategy 3',
          capitalAllocated: 100,
        })
      ).rejects.toThrow('Maximum');
    });
  });

  describe('agent control', () => {
    it('should pause and resume agent', async () => {
      const agent = await agentDashboard.createAgent({
        userId: 'user_123',
        name: 'Test Agent',
        description: 'A test agent',
        strategyId: 'strategy_456',
        strategyName: 'Test Strategy',
        capitalAllocated: 1000,
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 2100));

      await agentDashboard.pauseAgent(agent.id);
      let updated = await agentDashboard.getAgent(agent.id);
      expect(updated?.status).toBe('paused');

      await agentDashboard.resumeAgent(agent.id);
      updated = await agentDashboard.getAgent(agent.id);
      expect(updated?.status).toBe('active');
    });

    it('should stop agent', async () => {
      const agent = await agentDashboard.createAgent({
        userId: 'user_123',
        name: 'Test Agent',
        description: 'A test agent',
        strategyId: 'strategy_456',
        strategyName: 'Test Strategy',
        capitalAllocated: 1000,
      });

      await agentDashboard.stopAgent(agent.id);
      const updated = await agentDashboard.getAgent(agent.id);
      expect(updated?.status).toBe('stopped');
    });
  });

  describe('dashboard', () => {
    it('should return dashboard with summary', async () => {
      await agentDashboard.createAgent({
        userId: 'user_123',
        name: 'Agent 1',
        description: 'First',
        strategyId: 'strategy_1',
        strategyName: 'Strategy 1',
        capitalAllocated: 500,
      });

      await agentDashboard.createAgent({
        userId: 'user_123',
        name: 'Agent 2',
        description: 'Second',
        strategyId: 'strategy_2',
        strategyName: 'Strategy 2',
        capitalAllocated: 500,
      });

      const dashboard = await agentDashboard.getDashboard('user_123');

      expect(dashboard.userId).toBe('user_123');
      expect(dashboard.agents).toHaveLength(2);
      expect(dashboard.summary.totalAgents).toBe(2);
      expect(dashboard.summary.totalCapitalAllocated).toBe(1000);
    });
  });

  describe('automations', () => {
    it('should create automation', async () => {
      const automation = await agentDashboard.createAutomation({
        userId: 'user_123',
        name: 'Stop on drawdown',
        description: 'Pause agent on high drawdown',
        trigger: { type: 'condition', config: { drawdown: 10 } },
        actions: [{ type: 'pause_agent', config: { agentId: 'agent_1' } }],
      });

      expect(automation.id).toBeDefined();
      expect(automation.enabled).toBe(true);
    });
  });
});

// ============================================================================
// Social Manager Tests
// ============================================================================

describe('SocialManager', () => {
  let socialManager: DefaultSocialManager;

  beforeEach(() => {
    socialManager = createSocialManager();
  });

  describe('profiles', () => {
    it('should create profile', async () => {
      const profile = await socialManager.createProfile({
        userId: 'user_123',
        telegramId: '123456789',
        username: 'testuser',
        displayName: 'Test User',
      });

      expect(profile.id).toBe('user_123');
      expect(profile.username).toBe('testuser');
      expect(profile.verified).toBe(false);
    });

    it('should reject duplicate username', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'taken',
        displayName: 'User 1',
      });

      await expect(
        socialManager.createProfile({
          userId: 'user_2',
          telegramId: '222',
          username: 'taken',
          displayName: 'User 2',
        })
      ).rejects.toThrow('already taken');
    });
  });

  describe('following', () => {
    it('should follow user', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      await socialManager.createProfile({
        userId: 'user_2',
        telegramId: '222',
        username: 'user2',
        displayName: 'User 2',
      });

      await socialManager.follow('user_1', 'user_2');

      const isFollowing = await socialManager.isFollowing('user_1', 'user_2');
      expect(isFollowing).toBe(true);

      const followers = await socialManager.getFollowers('user_2');
      expect(followers).toHaveLength(1);
      expect(followers[0].id).toBe('user_1');
    });

    it('should not allow self-follow', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      await expect(socialManager.follow('user_1', 'user_1')).rejects.toThrow('yourself');
    });
  });

  describe('feed', () => {
    it('should create feed item', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      const item = await socialManager.createFeedItem({
        userId: 'user_1',
        type: 'trade',
        content: {
          title: 'Made a trade',
          description: 'Bought TON',
        },
      });

      expect(item.id).toBeDefined();
      expect(item.type).toBe('trade');
      expect(item.likes).toBe(0);
    });

    it('should get user feed with followed users posts', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      await socialManager.createProfile({
        userId: 'user_2',
        telegramId: '222',
        username: 'user2',
        displayName: 'User 2',
      });

      await socialManager.follow('user_1', 'user_2');

      await socialManager.createFeedItem({
        userId: 'user_2',
        type: 'milestone',
        content: {
          title: 'Milestone',
          description: 'Reached $10k',
        },
      });

      const feed = await socialManager.getFeed('user_1');
      expect(feed.items.length).toBeGreaterThan(0);
    });
  });

  describe('discussions', () => {
    it('should create discussion', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      const discussion = await socialManager.createDiscussion({
        userId: 'user_1',
        title: 'Strategy Discussion',
        content: 'What do you think about yield farming?',
        tags: ['yield', 'defi'],
      });

      expect(discussion.id).toBeDefined();
      expect(discussion.title).toBe('Strategy Discussion');
      expect(discussion.commentCount).toBe(0);
    });

    it('should add and upvote comment', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      const discussion = await socialManager.createDiscussion({
        userId: 'user_1',
        title: 'Test Discussion',
        content: 'Content',
      });

      const comment = await socialManager.createComment({
        discussionId: discussion.id,
        userId: 'user_1',
        content: 'Great discussion!',
      });

      expect(comment.id).toBeDefined();

      await socialManager.upvoteComment('user_1', comment.id);
      const updated = await socialManager.getComments(discussion.id);
      expect(updated[0].upvotes).toBe(1);
    });
  });

  describe('leaderboards', () => {
    it('should get leaderboard', async () => {
      await socialManager.createProfile({
        userId: 'user_1',
        telegramId: '111',
        username: 'user1',
        displayName: 'User 1',
      });

      const leaderboard = await socialManager.getLeaderboard('top_performers', 'weekly');

      expect(leaderboard.id).toBeDefined();
      expect(leaderboard.type).toBe('top_performers');
      expect(leaderboard.entries).toBeInstanceOf(Array);
    });
  });
});

// ============================================================================
// Financial Dashboard Manager Tests
// ============================================================================

describe('FinancialDashboardManager', () => {
  let financialManager: DefaultFinancialDashboardManager;

  beforeEach(() => {
    financialManager = createFinancialDashboardManager();
  });

  describe('portfolio', () => {
    it('should get portfolio overview', async () => {
      const portfolio = await financialManager.getPortfolio('user_123');

      expect(portfolio.totalValueUsd).toBeGreaterThan(0);
      expect(portfolio.assets).toBeInstanceOf(Array);
      expect(portfolio.assets.length).toBeGreaterThan(0);
    });

    it('should add asset', async () => {
      await financialManager.addAsset('user_123', {
        symbol: 'NEW',
        name: 'New Token',
        type: 'jetton',
        amount: 100,
        valueUsd: 500,
        percentage: 5,
      });

      const portfolio = await financialManager.getPortfolio('user_123');
      const newAsset = portfolio.assets.find((a) => a.symbol === 'NEW');

      expect(newAsset).toBeDefined();
      expect(newAsset?.amount).toBe(100);
    });
  });

  describe('performance', () => {
    it('should get performance overview', async () => {
      const performance = await financialManager.getPerformance('user_123');

      expect(performance.totalPnl).toBeDefined();
      expect(performance.sharpeRatio).toBeDefined();
      expect(performance.performanceHistory).toBeInstanceOf(Array);
    });

    it('should get performance history', async () => {
      const history = await financialManager.getPerformanceHistory('user_123', 30);

      expect(history.length).toBe(30); // last 30 days
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('value');
    });
  });

  describe('risk', () => {
    it('should get risk overview', async () => {
      const risk = await financialManager.getRiskOverview('user_123');

      expect(risk.overallRiskLevel).toBeDefined();
      expect(risk.riskScore).toBeGreaterThanOrEqual(0);
      expect(risk.riskScore).toBeLessThanOrEqual(100);
    });

    it('should calculate VaR', async () => {
      const var95 = await financialManager.calculateVaR('user_123', 0.95);
      const var99 = await financialManager.calculateVaR('user_123', 0.99);

      expect(var95).toBeGreaterThan(0);
      expect(var99).toBeGreaterThan(var95); // Higher confidence = higher VaR
    });
  });

  describe('allocations', () => {
    it('should get allocation overview', async () => {
      const allocations = await financialManager.getAllocations('user_123');

      expect(allocations.byAsset).toBeInstanceOf(Array);
      expect(allocations.byProtocol).toBeInstanceOf(Array);
      expect(allocations.byRiskLevel).toBeInstanceOf(Array);
    });

    it('should get recommendations', async () => {
      const recommendations = await financialManager.getRecommendations('user_123');

      expect(recommendations).toBeInstanceOf(Array);
    });
  });

  describe('dashboard', () => {
    it('should get full dashboard', async () => {
      const dashboard = await financialManager.getDashboard('user_123');

      expect(dashboard.userId).toBe('user_123');
      expect(dashboard.portfolio).toBeDefined();
      expect(dashboard.performance).toBeDefined();
      expect(dashboard.risk).toBeDefined();
      expect(dashboard.allocations).toBeDefined();
      expect(dashboard.transactions).toBeDefined();
    });
  });
});

// ============================================================================
// Notification Manager Tests
// ============================================================================

describe('NotificationManager', () => {
  let notificationManager: DefaultNotificationManager;

  beforeEach(() => {
    notificationManager = createNotificationManager();
  });

  describe('send', () => {
    it('should send notification', async () => {
      const notification = await notificationManager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Trade Executed',
        message: 'Your trade was successful',
      });

      expect(notification.id).toBeDefined();
      expect(notification.read).toBe(false);
    });

    it('should respect rate limits', async () => {
      const manager = createNotificationManager({ rateLimitPerMinute: 2 });

      await manager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Notification 1',
        message: 'Message 1',
      });

      await manager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Notification 2',
        message: 'Message 2',
      });

      await expect(
        manager.send({
          userId: 'user_123',
          type: 'trade_executed',
          severity: 'info',
          title: 'Notification 3',
          message: 'Message 3',
        })
      ).rejects.toThrow('Rate limit');
    });
  });

  describe('templates', () => {
    it('should send trade notification', async () => {
      const notification = await notificationManager.sendTradeNotification('user_123', {
        agentId: 'agent_1',
        agentName: 'Test Agent',
        tradeType: 'buy',
        asset: 'TON',
        amount: 100,
        price: 5.0,
        pnl: 10,
        success: true,
      });

      expect(notification.type).toBe('trade_executed');
      expect(notification.title).toContain('BUY');
    });

    it('should send risk alert', async () => {
      const notification = await notificationManager.sendRiskAlert('user_123', {
        alertType: 'drawdown',
        currentValue: 12,
        threshold: 10,
        recommendation: 'Review positions',
      });

      expect(notification.type).toBe('risk_alert');
      expect(notification.severity).toBe('warning');
    });
  });

  describe('read state', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationManager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Test',
        message: 'Test message',
      });

      await notificationManager.markAsRead(notification.id);

      const updated = await notificationManager.get(notification.id);
      expect(updated?.read).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it('should get unread count', async () => {
      await notificationManager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Test 1',
        message: 'Message 1',
      });

      await notificationManager.send({
        userId: 'user_123',
        type: 'trade_executed',
        severity: 'info',
        title: 'Test 2',
        message: 'Message 2',
      });

      const count = await notificationManager.getUnreadCount('user_123');
      expect(count).toBe(2);
    });
  });
});

// ============================================================================
// Telegram Manager Tests
// ============================================================================

describe('TelegramManager', () => {
  let telegramManager: DefaultTelegramManager;

  beforeEach(() => {
    telegramManager = createTelegramManager();
  });

  describe('user linking', () => {
    it('should link telegram user', async () => {
      const integration = await telegramManager.linkUser({
        userId: 'user_123',
        telegramUserId: 123456789,
        chatId: 123456789,
        username: 'testuser',
        firstName: 'Test',
      });

      expect(integration.userId).toBe('user_123');
      expect(integration.telegramUserId).toBe(123456789);
      expect(integration.verified).toBe(true);
    });

    it('should check if user is linked', async () => {
      await telegramManager.linkUser({
        userId: 'user_123',
        telegramUserId: 123456789,
        chatId: 123456789,
      });

      const isLinked = await telegramManager.isLinked('user_123');
      expect(isLinked).toBe(true);

      const notLinked = await telegramManager.isLinked('user_456');
      expect(notLinked).toBe(false);
    });
  });

  describe('mini app', () => {
    it('should initialize mini app', async () => {
      const context = await telegramManager.initMiniApp({
        userId: 'user_123',
        initData: {
          queryId: 'query_1',
          user: {
            id: 123456789,
            firstName: 'Test',
          },
          authDate: Math.floor(Date.now() / 1000),
          hash: 'abc123',
        },
        themeParams: {
          bgColor: '#ffffff',
          textColor: '#000000',
          hintColor: '#999999',
          linkColor: '#0000ff',
          buttonColor: '#3390ec',
          buttonTextColor: '#ffffff',
          secondaryBgColor: '#f0f0f0',
        },
        colorScheme: 'light',
        platform: 'android',
        version: '6.0',
      });

      expect(context.userId).toBe('user_123');
      expect(context.platform).toBe('android');
    });
  });

  describe('commands', () => {
    it('should handle commands', async () => {
      const response = await telegramManager.handleCommand({
        userId: 'user_123',
        chatId: 123456789,
        command: 'help',
        args: [],
        messageId: 1,
        isPrivate: true,
      });

      expect(response).toContain('Available commands');
    });

    it('should return error for unknown command', async () => {
      const response = await telegramManager.handleCommand({
        userId: 'user_123',
        chatId: 123456789,
        command: 'unknown_command',
        args: [],
        messageId: 1,
        isPrivate: true,
      });

      expect(response).toContain('Unknown command');
    });
  });

  describe('deep linking', () => {
    it('should generate deep link', () => {
      const link = telegramManager.generateDeepLink('/wallet', { id: '123' });

      expect(link).toContain('startapp=');
    });

    it('should parse deep link', () => {
      const encoded = Buffer.from('/wallet?id=123').toString('base64');
      const { path, params } = telegramManager.parseDeepLink(encoded);

      expect(path).toBe('/wallet');
      expect(params.id).toBe('123');
    });
  });
});

// ============================================================================
// Gamification Manager Tests
// ============================================================================

describe('GamificationManager', () => {
  let gamificationManager: DefaultGamificationManager;

  beforeEach(() => {
    gamificationManager = createGamificationManager();
  });

  describe('profile', () => {
    it('should create gamification profile', async () => {
      const profile = await gamificationManager.createProfile('user_123');

      expect(profile.userId).toBe('user_123');
      expect(profile.level).toBe(1);
      expect(profile.experience).toBe(0);
      expect(profile.tier).toBe('bronze');
    });
  });

  describe('experience', () => {
    it('should add experience', async () => {
      await gamificationManager.createProfile('user_123');

      const { profile } = await gamificationManager.addExperience({
        userId: 'user_123',
        amount: 50,
        source: 'trade',
      });

      expect(profile.experience).toBe(50);
      expect(profile.stats.totalExperience).toBe(50);
    });

    it('should level up on enough experience', async () => {
      await gamificationManager.createProfile('user_123');

      const { profile, leveledUp } = await gamificationManager.addExperience({
        userId: 'user_123',
        amount: 200,
        source: 'trade',
      });

      expect(leveledUp).toBe(true);
      expect(profile.level).toBeGreaterThan(1);
    });
  });

  describe('achievements', () => {
    it('should get available achievements', () => {
      const achievements = gamificationManager.getAvailableAchievements();

      expect(achievements).toBeInstanceOf(Array);
      expect(achievements.length).toBeGreaterThan(0);
    });

    it('should complete achievement', async () => {
      await gamificationManager.createProfile('user_123');

      const achievement = await gamificationManager.completeAchievement('user_123', 'first_agent');

      expect(achievement.completed).toBe(true);
      expect(achievement.completedAt).toBeDefined();
    });
  });

  describe('challenges', () => {
    it('should generate daily challenges', async () => {
      const challenges = await gamificationManager.generateDailyChallenges('user_123');

      expect(challenges.length).toBeGreaterThan(0);
      expect(challenges[0].type).toBe('daily');
    });

    it('should complete challenge', async () => {
      const challenges = await gamificationManager.generateDailyChallenges('user_123');

      const completed = await gamificationManager.completeChallenge('user_123', challenges[0].id);

      expect(completed.completed).toBe(true);
    });
  });

  describe('streaks', () => {
    it('should update streak', async () => {
      await gamificationManager.createProfile('user_123');

      const streak = await gamificationManager.updateStreak('user_123', 'daily_login');

      expect(streak.currentCount).toBe(1);
    });
  });

  describe('referrals', () => {
    it('should get referral program', async () => {
      const program = await gamificationManager.getReferralProgram('user_123');

      expect(program.userId).toBe('user_123');
      expect(program.referralCode).toBeDefined();
      expect(program.referralLink).toContain('TONAIAgentBot');
    });

    it('should create referral', async () => {
      const referral = await gamificationManager.createReferral({
        referrerId: 'user_123',
        referredUserId: 'user_456',
        referredUserName: 'New User',
      });

      expect(referral.id).toBeDefined();
      expect(referral.status).toBe('pending');
    });
  });
});

// ============================================================================
// AI Assistant Manager Tests
// ============================================================================

describe('AIAssistantManager', () => {
  let aiAssistant: DefaultAIAssistantManager;

  beforeEach(() => {
    aiAssistant = createAIAssistantManager();
  });

  describe('sessions', () => {
    it('should create session', async () => {
      const session = await aiAssistant.createSession({
        userId: 'user_123',
      });

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe('user_123');
      expect(session.conversationHistory.length).toBeGreaterThan(0);
    });

    it('should return existing session for same user', async () => {
      const session1 = await aiAssistant.createSession({ userId: 'user_123' });
      const session2 = await aiAssistant.createSession({ userId: 'user_123' });

      expect(session1.sessionId).toBe(session2.sessionId);
    });
  });

  describe('messaging', () => {
    it('should send message and get response', async () => {
      const session = await aiAssistant.createSession({ userId: 'user_123' });

      const response = await aiAssistant.sendMessage({
        sessionId: session.sessionId,
        content: 'Hello',
      });

      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
    });

    it('should respond to portfolio analysis request', async () => {
      const session = await aiAssistant.createSession({ userId: 'user_123' });

      const response = await aiAssistant.sendMessage({
        sessionId: session.sessionId,
        content: 'Analyze my portfolio',
      });

      expect(response.content).toContain('portfolio');
      expect(response.metadata?.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('capabilities', () => {
    it('should analyze portfolio', async () => {
      const session = await aiAssistant.createSession({ userId: 'user_123' });

      const response = await aiAssistant.analyzePortfolio({
        userId: 'user_123',
        sessionId: session.sessionId,
        portfolioData: {
          totalValue: 10000,
          assets: [
            { symbol: 'TON', value: 5000, percentage: 50 },
            { symbol: 'USDT', value: 3000, percentage: 30 },
            { symbol: 'STON', value: 2000, percentage: 20 },
          ],
          performance: { daily: 2.5, weekly: 5.0, monthly: 12.0 },
          risk: { volatility: 15, drawdown: 5, var95: 3 },
        },
      });

      expect(response.content).toContain('Portfolio Analysis');
      expect(response.metadata?.intent).toBe('portfolio_analysis');
    });

    it('should suggest strategies', async () => {
      const session = await aiAssistant.createSession({ userId: 'user_123' });

      const response = await aiAssistant.suggestStrategies({
        userId: 'user_123',
        sessionId: session.sessionId,
        riskTolerance: 'moderate',
        capital: 1000,
      });

      expect(response.content).toContain('Strategy');
      expect(response.metadata?.intent).toBe('strategy_suggestion');
    });
  });

  describe('preferences', () => {
    it('should update preferences', async () => {
      const session = await aiAssistant.createSession({ userId: 'user_123' });

      await aiAssistant.updatePreferences(session.sessionId, {
        personalityStyle: 'friendly',
        detailLevel: 'advanced',
      });

      const prefs = await aiAssistant.getPreferences(session.sessionId);
      expect(prefs.personalityStyle).toBe('friendly');
      expect(prefs.detailLevel).toBe('advanced');
    });
  });
});

// ============================================================================
// Monetization Manager Tests
// ============================================================================

describe('SuperAppMonetizationManager', () => {
  let monetizationManager: DefaultSuperAppMonetizationManager;

  beforeEach(() => {
    monetizationManager = createSuperAppMonetizationManager();
  });

  describe('tiers', () => {
    it('should get all tiers', () => {
      const tiers = monetizationManager.getTiers();

      expect(tiers.length).toBe(4);
      expect(tiers.map((t) => t.tier)).toEqual(['free', 'basic', 'pro', 'enterprise']);
    });

    it('should get specific tier', () => {
      const tier = monetizationManager.getTier('pro');

      expect(tier).toBeDefined();
      expect(tier?.name).toBe('Pro');
      expect(tier?.monthlyPrice).toBeGreaterThan(0);
    });

    it('should compare tiers', () => {
      const comparison1 = monetizationManager.compareTiers('free', 'pro');
      const comparison2 = monetizationManager.compareTiers('enterprise', 'basic');

      expect(comparison1).toBeLessThan(0);
      expect(comparison2).toBeGreaterThan(0);
    });
  });

  describe('subscriptions', () => {
    it('should create subscription', async () => {
      const subscription = await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'basic',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      expect(subscription.userId).toBe('user_123');
      expect(subscription.tier).toBe('basic');
      expect(subscription.status).toBe('active');
      expect(subscription.features.length).toBeGreaterThan(0);
    });

    it('should start trial', async () => {
      const subscription = await monetizationManager.startTrial('user_123');

      expect(subscription.status).toBe('trial');
      expect(subscription.tier).toBe('pro');
      expect(subscription.billing.amount).toBe(0);
    });

    it('should cancel subscription', async () => {
      await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'basic',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      await monetizationManager.cancelSubscription('user_123');

      const subscription = await monetizationManager.getSubscription('user_123');
      expect(subscription?.status).toBe('cancelled');
    });
  });

  describe('features', () => {
    it('should get available features', async () => {
      const features = await monetizationManager.getAvailableFeatures();

      expect(features).toBeInstanceOf(Array);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should check feature access', async () => {
      await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'pro',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      const hasUnlimitedAgents = await monetizationManager.hasFeature(
        'user_123',
        'unlimited_agents'
      );
      expect(hasUnlimitedAgents).toBe(true);
    });

    it('should track usage', async () => {
      await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'basic',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      await monetizationManager.trackUsage('user_123', 'limit_ai_queries', 5);

      const usage = await monetizationManager.getUsage('user_123', 'limit_ai_queries');
      expect(usage.used).toBe(5);
    });
  });

  describe('billing', () => {
    it('should get billing history', async () => {
      await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'basic',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      const history = await monetizationManager.getBillingHistory('user_123');

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe('subscription');
      expect(history[0].status).toBe('completed');
    });

    it('should process refund', async () => {
      await monetizationManager.createSubscription({
        userId: 'user_123',
        tier: 'basic',
        billingFrequency: 'monthly',
        paymentMethod: 'ton',
      });

      const history = await monetizationManager.getBillingHistory('user_123');
      const result = await monetizationManager.refund(history[0].id);

      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
    });
  });
});
