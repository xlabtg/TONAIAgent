/**
 * Telegram SuperApp Integration Tests
 *
 * Comprehensive tests for the Telegram SuperApp module including:
 * - User onboarding
 * - Wallet & identity integration
 * - Fund management (create, start, pause, close, adjust)
 * - Strategy marketplace
 * - Portfolio analytics
 * - Risk monitoring
 * - Bot commands (/start, /portfolio, /strategies, /create_fund, /analytics)
 * - Agent interaction commands
 * - Rebalance events
 * - Real-time notifications via events
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createTelegramSuperAppManager,
  DefaultTelegramSuperAppManager,
} from '../../extended/superapp/telegram-superapp';

import {
  type TelegramSuperAppUser,
  type SuperAppFund,
  type SuperAppStrategy,
  type SuperAppPortfolioAnalytics,
  type SuperAppRiskMonitor,
  type WalletIdentityInfo,
  type SuperAppEvent,
} from '../../extended/superapp/types';

// ============================================================================
// Setup
// ============================================================================

const TELEGRAM_ID = 123456789;
const USERNAME = 'test_trader';
const FIRST_NAME = 'Alice';

describe('DefaultTelegramSuperAppManager', () => {
  let manager: DefaultTelegramSuperAppManager;

  beforeEach(() => {
    manager = createTelegramSuperAppManager({
      miniAppUrl: 'https://t.me/TONAIAgentBot/app',
      maxFundsPerUser: 5,
      minFundCapital: 10,
    });
  });

  // ============================================================================
  // User Onboarding
  // ============================================================================

  describe('User Onboarding', () => {
    it('should onboard a new user with full details', async () => {
      const user = await manager.onboardUser({
        telegramId: TELEGRAM_ID,
        username: USERNAME,
        firstName: FIRST_NAME,
        lastName: 'Smith',
        isPremium: true,
        languageCode: 'en',
      });

      expect(user).toBeDefined();
      expect(user.telegramId).toBe(TELEGRAM_ID);
      expect(user.username).toBe(USERNAME);
      expect(user.firstName).toBe(FIRST_NAME);
      expect(user.isPremium).toBe(true);
      expect(user.languageCode).toBe('en');
      expect(user.userId).toMatch(/^user_\d+_\d+$/);
      expect(user.onboardedAt).toBeInstanceOf(Date);
      expect(user.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should return existing user when re-onboarding same telegram ID', async () => {
      const firstOnboard = await manager.onboardUser({
        telegramId: TELEGRAM_ID,
        firstName: FIRST_NAME,
      });

      const secondOnboard = await manager.onboardUser({
        telegramId: TELEGRAM_ID,
        firstName: FIRST_NAME,
        username: 'new_username',
      });

      expect(secondOnboard.userId).toBe(firstOnboard.userId);
      expect(secondOnboard.username).toBe('new_username');
    });

    it('should get user by userId', async () => {
      const created = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const retrieved = await manager.getUser(created.userId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.userId).toBe(created.userId);
    });

    it('should get user by telegram ID', async () => {
      const created = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const retrieved = await manager.getUserByTelegramId(TELEGRAM_ID);

      expect(retrieved).toBeDefined();
      expect(retrieved!.telegramId).toBe(TELEGRAM_ID);
      expect(retrieved!.userId).toBe(created.userId);
    });

    it('should return null for non-existent user', async () => {
      const result = await manager.getUser('nonexistent_user');
      expect(result).toBeNull();
    });

    it('should return null for non-existent telegram ID', async () => {
      const result = await manager.getUserByTelegramId(999999);
      expect(result).toBeNull();
    });

    it('should update user activity', async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const originalTime = user.lastActiveAt;

      await new Promise((resolve) => setTimeout(resolve, 5));
      await manager.updateUserActivity(user.userId);

      const updated = await manager.getUser(user.userId);
      expect(updated!.lastActiveAt.getTime()).toBeGreaterThanOrEqual(originalTime.getTime());
    });

    it('should emit event when user is onboarded', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });

      const onboardEvent = events.find((e) => e.type === 'superapp_user_onboarded');
      expect(onboardEvent).toBeDefined();
      expect(onboardEvent!.userId).toBeDefined();
    });
  });

  // ============================================================================
  // Wallet & Identity
  // ============================================================================

  describe('Wallet & Identity', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;
    });

    it('should link a TON Connect wallet', async () => {
      const walletInfo = await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'ton_connect',
        tonBalance: 100,
        usdtBalance: 500,
      });

      expect(walletInfo).toBeDefined();
      expect(walletInfo.userId).toBe(userId);
      expect(walletInfo.walletType).toBe('ton_connect');
      expect(walletInfo.tonBalance).toBe(100);
      expect(walletInfo.usdtBalance).toBe(500);
      expect(walletInfo.verified).toBe(true);
      expect(walletInfo.linkedAt).toBeInstanceOf(Date);
    });

    it('should link an MPC wallet', async () => {
      const walletInfo = await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'mpc',
      });

      expect(walletInfo.walletType).toBe('mpc');
    });

    it('should get wallet info for user', async () => {
      await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'ton_connect',
        tonBalance: 50,
      });

      const walletInfo = await manager.getWalletInfo(userId);
      expect(walletInfo).toBeDefined();
      expect(walletInfo!.tonBalance).toBe(50);
    });

    it('should return null wallet info for user without wallet', async () => {
      const walletInfo = await manager.getWalletInfo(userId);
      expect(walletInfo).toBeNull();
    });

    it('should unlink wallet', async () => {
      await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'ton_connect',
      });

      await manager.unlinkWallet(userId);
      const walletInfo = await manager.getWalletInfo(userId);
      expect(walletInfo).toBeNull();
    });

    it('should update user wallet info when wallet is linked', async () => {
      await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'ton_connect',
      });

      const user = await manager.getUser(userId);
      expect(user!.walletAddress).toBe('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2');
      expect(user!.walletType).toBe('ton_connect');
    });

    it('should throw error when linking wallet for non-existent user', async () => {
      await expect(
        manager.linkWallet({
          userId: 'nonexistent',
          telegramId: TELEGRAM_ID,
          walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
          walletType: 'ton_connect',
        })
      ).rejects.toThrow('User not found');
    });

    it('should emit wallet_connected event when wallet is linked', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      await manager.linkWallet({
        userId,
        telegramId: TELEGRAM_ID,
        walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
        walletType: 'ton_connect',
      });

      const walletEvent = events.find((e) => e.type === 'wallet_connected');
      expect(walletEvent).toBeDefined();
      expect(walletEvent!.userId).toBe(userId);
    });
  });

  // ============================================================================
  // Fund Management
  // ============================================================================

  describe('Fund Management', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;
    });

    it('should create a fund with valid strategy and capital', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'My DCA Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
        currency: 'USDT',
      });

      expect(fund).toBeDefined();
      expect(fund.name).toBe('My DCA Fund');
      expect(fund.strategyId).toBe('strategy_ton_dca');
      expect(fund.capitalAllocated).toBe(100);
      expect(fund.currency).toBe('USDT');
      expect(fund.status).toBe('active');
      expect(fund.id).toMatch(/^fund_/);
      expect(fund.createdAt).toBeInstanceOf(Date);
    });

    it('should create a fund with description', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Yield Farm',
        description: 'Conservative yield farming',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 200,
      });

      expect(fund.description).toBe('Conservative yield farming');
      expect(fund.strategyName).toBe('DeFi Yield Optimizer');
    });

    it('should inherit risk level from strategy', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Conservative Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      expect(fund.riskLevel).toBe('conservative');
    });

    it('should throw when capital is below minimum', async () => {
      await expect(
        manager.createFund({
          userId,
          name: 'Underfunded',
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 5, // Below minFundCapital of 10
        })
      ).rejects.toThrow('Minimum capital required');
    });

    it('should throw when strategy does not exist', async () => {
      await expect(
        manager.createFund({
          userId,
          name: 'Invalid Strategy Fund',
          strategyId: 'nonexistent_strategy',
          capitalAllocated: 100,
        })
      ).rejects.toThrow('Strategy not found');
    });

    it('should throw when max funds per user is reached', async () => {
      // Create max funds (5)
      for (let i = 0; i < 5; i++) {
        await manager.createFund({
          userId,
          name: `Fund ${i}`,
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 50,
        });
      }

      await expect(
        manager.createFund({
          userId,
          name: 'One Too Many',
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 50,
        })
      ).rejects.toThrow('Maximum number of funds');
    });

    it('should get user funds', async () => {
      await manager.createFund({
        userId,
        name: 'Fund 1',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });
      await manager.createFund({
        userId,
        name: 'Fund 2',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 200,
      });

      const funds = await manager.getUserFunds(userId);
      expect(funds).toHaveLength(2);
      expect(funds.map((f) => f.name)).toContain('Fund 1');
      expect(funds.map((f) => f.name)).toContain('Fund 2');
    });

    it('should return empty array for user with no funds', async () => {
      const funds = await manager.getUserFunds(userId);
      expect(funds).toHaveLength(0);
    });

    it('should pause an active fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Active Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      const paused = await manager.pauseFund({
        userId,
        fundId: fund.id,
        reason: 'Manual pause',
      });

      expect(paused.status).toBe('paused');
    });

    it('should start a paused fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund to Start',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await manager.pauseFund({ userId, fundId: fund.id });
      const started = await manager.startFund({ userId, fundId: fund.id });

      expect(started.status).toBe('active');
    });

    it('should throw when starting an already active fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Active Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await expect(manager.startFund({ userId, fundId: fund.id })).rejects.toThrow(
        'Fund is already active'
      );
    });

    it('should throw when pausing a non-active fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });
      await manager.pauseFund({ userId, fundId: fund.id });

      await expect(manager.pauseFund({ userId, fundId: fund.id })).rejects.toThrow(
        'Fund must be active to pause'
      );
    });

    it('should close an active fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund to Close',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      const closed = await manager.closeFund(userId, fund.id);
      expect(closed.status).toBe('closed');
    });

    it('should throw when closing an already closed fund', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });
      await manager.closeFund(userId, fund.id);

      await expect(manager.closeFund(userId, fund.id)).rejects.toThrow('Fund is already closed');
    });

    it('should adjust fund allocation', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Adjustable Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      const adjusted = await manager.adjustAllocation({
        userId,
        fundId: fund.id,
        newCapital: 250,
      });

      expect(adjusted.capitalAllocated).toBe(250);
    });

    it('should throw when adjusting allocation below minimum', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await expect(
        manager.adjustAllocation({ userId, fundId: fund.id, newCapital: 5 })
      ).rejects.toThrow('Minimum capital required');
    });

    it('should enforce fund ownership when pausing', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await expect(
        manager.pauseFund({ userId: 'other_user', fundId: fund.id })
      ).rejects.toThrow('Unauthorized');
    });

    it('should emit superapp_fund_created event', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      await manager.createFund({
        userId,
        name: 'Event Test Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      const fundEvent = events.find((e) => e.type === 'superapp_fund_created');
      expect(fundEvent).toBeDefined();
      expect(fundEvent!.userId).toBe(userId);
    });
  });

  // ============================================================================
  // Strategy Marketplace
  // ============================================================================

  describe('Strategy Marketplace', () => {
    it('should get all strategies', async () => {
      const strategies = await manager.getStrategies();
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0]).toHaveProperty('id');
      expect(strategies[0]).toHaveProperty('name');
      expect(strategies[0]).toHaveProperty('riskLevel');
    });

    it('should filter strategies by category', async () => {
      const strategies = await manager.getStrategies({ category: 'dca' });
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.category === 'dca')).toBe(true);
    });

    it('should filter strategies by risk level', async () => {
      const strategies = await manager.getStrategies({ riskLevel: 'conservative' });
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every((s) => s.riskLevel === 'conservative')).toBe(true);
    });

    it('should paginate strategies', async () => {
      const first = await manager.getStrategies({ limit: 2, offset: 0 });
      const second = await manager.getStrategies({ limit: 2, offset: 2 });

      expect(first).toHaveLength(2);
      expect(first[0].id).not.toBe(second[0]?.id);
    });

    it('should get a specific strategy by ID', async () => {
      const strategy = await manager.getStrategy('strategy_ton_dca');
      expect(strategy).toBeDefined();
      expect(strategy!.id).toBe('strategy_ton_dca');
      expect(strategy!.name).toBe('TON DCA Strategy');
    });

    it('should return null for non-existent strategy', async () => {
      const strategy = await manager.getStrategy('nonexistent');
      expect(strategy).toBeNull();
    });

    it('should get recommended strategies for user', async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const recommended = await manager.getRecommendedStrategies(user.userId);

      expect(recommended).toBeDefined();
      expect(recommended.length).toBeGreaterThan(0);
      expect(recommended.length).toBeLessThanOrEqual(5);
    });

    it('should not recommend strategies already in use', async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });

      // Create a fund with DCA strategy
      await manager.createFund({
        userId: user.userId,
        name: 'DCA Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 50,
      });

      const recommended = await manager.getRecommendedStrategies(user.userId);
      const strategyIds = recommended.map((s) => s.id);
      expect(strategyIds).not.toContain('strategy_ton_dca');
    });
  });

  // ============================================================================
  // Portfolio Analytics
  // ============================================================================

  describe('Portfolio Analytics', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;
    });

    it('should get empty portfolio analytics for user with no funds', async () => {
      const analytics = await manager.getPortfolioAnalytics(userId);

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(userId);
      expect(analytics.totalValue).toBe(0);
      expect(analytics.totalPnl).toBe(0);
      expect(analytics.funds).toHaveLength(0);
      expect(analytics.updatedAt).toBeInstanceOf(Date);
    });

    it('should calculate portfolio analytics with funds', async () => {
      await manager.createFund({
        userId,
        name: 'Fund A',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 500,
      });
      await manager.createFund({
        userId,
        name: 'Fund B',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 300,
      });

      const analytics = await manager.getPortfolioAnalytics(userId);

      expect(analytics.totalValue).toBe(800);
      expect(analytics.funds).toHaveLength(2);
      expect(analytics.riskScore).toBeGreaterThanOrEqual(0);
      expect(analytics.riskScore).toBeLessThanOrEqual(100);
    });

    it('should calculate diversification score', async () => {
      await manager.createFund({
        userId,
        name: 'Fund A',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });
      await manager.createFund({
        userId,
        name: 'Fund B',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 100,
      });

      const analytics = await manager.getPortfolioAnalytics(userId);
      expect(analytics.diversificationScore).toBeGreaterThan(0);
    });

    it('should generate performance summary', async () => {
      await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 1000,
      });

      const summary = await manager.getPerformanceSummary(userId, '30d');
      expect(summary).toContain('Performance Summary');
      expect(summary).toContain('Portfolio');
    });

    it('should generate 24h performance summary', async () => {
      await manager.createFund({
        userId,
        name: 'Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 1000,
      });

      const summary = await manager.getPerformanceSummary(userId, '24h');
      expect(summary).toContain('24 hours');
    });
  });

  // ============================================================================
  // Risk Monitoring
  // ============================================================================

  describe('Risk Monitoring', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;
    });

    it('should get risk monitor with low risk for no funds', async () => {
      const monitor = await manager.getRiskMonitor(userId);

      expect(monitor).toBeDefined();
      expect(monitor.userId).toBe(userId);
      expect(monitor.overallRiskLevel).toBe('low');
      expect(monitor.alerts).toHaveLength(0);
      expect(monitor.drawdownWarnings).toHaveLength(0);
      expect(monitor.updatedAt).toBeInstanceOf(Date);
    });

    it('should include drawdown warnings for active funds', async () => {
      await manager.createFund({
        userId,
        name: 'Active Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 1000,
      });

      const monitor = await manager.getRiskMonitor(userId);
      expect(monitor.drawdownWarnings).toHaveLength(1);
      expect(monitor.drawdownWarnings[0].fundName).toBe('Active Fund');
    });

    it('should not include drawdown warnings for paused funds', async () => {
      const fund = await manager.createFund({
        userId,
        name: 'Paused Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 1000,
      });
      await manager.pauseFund({ userId, fundId: fund.id });

      const monitor = await manager.getRiskMonitor(userId);
      expect(monitor.drawdownWarnings).toHaveLength(0);
    });

    it('should get risk alerts', async () => {
      const alerts = await manager.getRiskAlerts(userId);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  // ============================================================================
  // Bot Commands
  // ============================================================================

  describe('Bot Commands', () => {
    describe('/start command', () => {
      it('should return welcome message for new user', async () => {
        const result = await manager.handleStart(TELEGRAM_ID);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Welcome to TONAIAgent SuperApp');
        expect(result.keyboard).toBeDefined();
      });

      it('should return greeting message for returning user', async () => {
        // First, onboard the user
        await manager.onboardUser({
          telegramId: TELEGRAM_ID,
          firstName: FIRST_NAME,
        });

        const result = await manager.handleStart(TELEGRAM_ID);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Welcome back');
        expect(result.keyboard).toBeDefined();
      });

      it('should include Mini App link in welcome message', async () => {
        const result = await manager.handleStart(999000111);
        expect(result.message).toContain('t.me/TONAIAgentBot/app');
      });
    });

    describe('/portfolio command', () => {
      let userId: string;

      beforeEach(async () => {
        const user = await manager.onboardUser({
          telegramId: TELEGRAM_ID,
          firstName: FIRST_NAME,
        });
        userId = user.userId;
      });

      it('should return empty portfolio message when no funds', async () => {
        const result = await manager.handlePortfolio(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Portfolio');
        expect(result.message).toContain("don't have any funds");
      });

      it('should return portfolio with fund details', async () => {
        await manager.createFund({
          userId,
          name: 'My DCA Fund',
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 500,
        });

        const result = await manager.handlePortfolio(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Portfolio');
        expect(result.message).toContain('My DCA Fund');
        expect(result.keyboard).toBeDefined();
      });

      it('should fail for non-existent user', async () => {
        const result = await manager.handlePortfolio('nonexistent');
        expect(result.success).toBe(false);
      });
    });

    describe('/strategies command', () => {
      let userId: string;

      beforeEach(async () => {
        const user = await manager.onboardUser({
          telegramId: TELEGRAM_ID,
          firstName: FIRST_NAME,
        });
        userId = user.userId;
      });

      it('should return strategy marketplace', async () => {
        const result = await manager.handleStrategies(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Strategy Marketplace');
        expect(result.keyboard).toBeDefined();
      });

      it('should filter strategies by category', async () => {
        const result = await manager.handleStrategies(userId, 'dca');

        expect(result.success).toBe(true);
        expect(result.message).toContain('TON DCA Strategy');
      });

      it('should show keyboard with risk level filters', async () => {
        const result = await manager.handleStrategies(userId);

        expect(result.keyboard).toBeDefined();
        const buttons = result.keyboard!.buttons.flat();
        expect(buttons.some((b) => b.text.includes('Conservative'))).toBe(true);
      });
    });

    describe('/create_fund command', () => {
      let userId: string;

      beforeEach(async () => {
        const user = await manager.onboardUser({
          telegramId: TELEGRAM_ID,
          firstName: FIRST_NAME,
        });
        userId = user.userId;
      });

      it('should prompt to connect wallet when no wallet', async () => {
        const result = await manager.handleCreateFund(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('connect');
        expect(result.keyboard).toBeDefined();
      });

      it('should show create fund options when wallet is connected', async () => {
        await manager.linkWallet({
          userId,
          telegramId: TELEGRAM_ID,
          walletAddress: 'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2',
          walletType: 'ton_connect',
          tonBalance: 100,
          usdtBalance: 500,
        });

        const result = await manager.handleCreateFund(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Create New Fund');
        expect(result.message).toContain('100');
      });

      it('should fail for non-existent user', async () => {
        const result = await manager.handleCreateFund('nonexistent');
        expect(result.success).toBe(false);
      });
    });

    describe('/analytics command', () => {
      let userId: string;

      beforeEach(async () => {
        const user = await manager.onboardUser({
          telegramId: TELEGRAM_ID,
          firstName: FIRST_NAME,
        });
        userId = user.userId;
      });

      it('should return no funds message when no funds', async () => {
        const result = await manager.handleAnalytics(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Analytics');
      });

      it('should return detailed analytics with funds', async () => {
        await manager.createFund({
          userId,
          name: 'Analytics Fund',
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 1000,
        });

        const result = await manager.handleAnalytics(userId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Portfolio Analytics');
        expect(result.message).toContain('Risk Level');
        expect(result.keyboard).toBeDefined();
      });

      it('should fail for non-existent user', async () => {
        const result = await manager.handleAnalytics('nonexistent');
        expect(result.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // Agent Interaction Commands
  // ============================================================================

  describe('Agent Interaction Commands', () => {
    let userId: string;
    let fundId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;

      const fund = await manager.createFund({
        userId,
        name: 'Test Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 500,
      });
      fundId = fund.id;
    });

    it('should pause strategy via command', async () => {
      const result = await manager.handlePauseStrategy(userId, fundId, 'Taking profits');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Paused');
      expect(result.message).toContain('Test Fund');
      expect(result.message).toContain('Taking profits');
    });

    it('should start strategy via command', async () => {
      await manager.pauseFund({ userId, fundId });
      const result = await manager.handleStartStrategy(userId, fundId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started');
      expect(result.message).toContain('Test Fund');
    });

    it('should fail to start already active strategy', async () => {
      const result = await manager.handleStartStrategy(userId, fundId);
      expect(result.success).toBe(false);
    });

    it('should adjust allocation via command', async () => {
      const result = await manager.handleAdjustAllocation(userId, fundId, 750);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Allocation Adjusted');
      expect(result.message).toContain('750');
    });

    it('should fail to adjust below minimum capital', async () => {
      const result = await manager.handleAdjustAllocation(userId, fundId, 1);
      expect(result.success).toBe(false);
    });

    it('should get performance summary for specific fund', async () => {
      const result = await manager.handlePerformanceSummary(userId, fundId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Fund');
      expect(result.message).toContain('Performance');
      expect(result.message).toContain('Current Value');
    });

    it('should get overall performance summary', async () => {
      const result = await manager.handlePerformanceSummary(userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Performance Summary');
    });

    it('should fail performance summary for non-existent fund', async () => {
      const result = await manager.handlePerformanceSummary(userId, 'nonexistent_fund');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Rebalance Events
  // ============================================================================

  describe('Rebalance Events', () => {
    let userId: string;
    let fundId: string;

    beforeEach(async () => {
      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      userId = user.userId;

      const fund = await manager.createFund({
        userId,
        name: 'Rebalance Test Fund',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 1000,
      });
      fundId = fund.id;
    });

    it('should trigger a manual rebalance', async () => {
      const event = await manager.triggerRebalance(userId, fundId, 'manual');

      expect(event).toBeDefined();
      expect(event.fundId).toBe(fundId);
      expect(event.triggeredBy).toBe('manual');
      expect(event.status).toBe('scheduled');
      expect(event.estimatedCost).toBeGreaterThan(0);
      expect(event.scheduledAt).toBeInstanceOf(Date);
    });

    it('should trigger drift-based rebalance', async () => {
      const event = await manager.triggerRebalance(userId, fundId, 'drift');
      expect(event.triggeredBy).toBe('drift');
    });

    it('should get rebalance history for user', async () => {
      await manager.triggerRebalance(userId, fundId, 'manual');
      await manager.triggerRebalance(userId, fundId, 'performance');

      const history = await manager.getRebalanceHistory(userId);
      expect(history).toHaveLength(2);
    });

    it('should filter rebalance history by fund', async () => {
      const fund2 = await manager.createFund({
        userId,
        name: 'Second Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await manager.triggerRebalance(userId, fundId, 'manual');
      await manager.triggerRebalance(userId, fund2.id, 'schedule');

      const history = await manager.getRebalanceHistory(userId, fundId);
      expect(history).toHaveLength(1);
      expect(history[0].fundId).toBe(fundId);
    });

    it('should throw when rebalancing non-existent fund', async () => {
      await expect(manager.triggerRebalance(userId, 'nonexistent', 'manual')).rejects.toThrow(
        'Fund not found'
      );
    });

    it('should throw when rebalancing another user fund', async () => {
      await expect(
        manager.triggerRebalance('other_user', fundId, 'manual')
      ).rejects.toThrow('Unauthorized');
    });

    it('should emit rebalance event', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      await manager.triggerRebalance(userId, fundId, 'manual');

      const rebalanceEvent = events.find((e) => e.type === 'superapp_rebalance_triggered');
      expect(rebalanceEvent).toBeDefined();
      expect(rebalanceEvent!.userId).toBe(userId);
    });
  });

  // ============================================================================
  // Events
  // ============================================================================

  describe('Events', () => {
    it('should register event callbacks', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });

      expect(events.length).toBeGreaterThan(0);
    });

    it('should support multiple event callbacks', async () => {
      const events1: SuperAppEvent[] = [];
      const events2: SuperAppEvent[] = [];

      manager.onEvent((event) => events1.push(event));
      manager.onEvent((event) => events2.push(event));

      await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });

      expect(events1.length).toBeGreaterThan(0);
      expect(events2.length).toBe(events1.length);
    });

    it('should emit agent_paused event when fund is paused', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const fund = await manager.createFund({
        userId: user.userId,
        name: 'Event Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await manager.pauseFund({ userId: user.userId, fundId: fund.id });

      const pauseEvent = events.find((e) => e.type === 'agent_paused');
      expect(pauseEvent).toBeDefined();
    });

    it('should emit agent_resumed event when fund is started', async () => {
      const events: SuperAppEvent[] = [];
      manager.onEvent((event) => events.push(event));

      const user = await manager.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });
      const fund = await manager.createFund({
        userId: user.userId,
        name: 'Event Fund',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 100,
      });

      await manager.pauseFund({ userId: user.userId, fundId: fund.id });
      await manager.startFund({ userId: user.userId, fundId: fund.id });

      const resumeEvent = events.find((e) => e.type === 'agent_resumed');
      expect(resumeEvent).toBeDefined();
    });
  });

  // ============================================================================
  // Factory & Configuration
  // ============================================================================

  describe('Factory & Configuration', () => {
    it('should create manager with default config', () => {
      const mgr = createTelegramSuperAppManager();
      expect(mgr).toBeInstanceOf(DefaultTelegramSuperAppManager);
    });

    it('should create manager with custom config', () => {
      const mgr = createTelegramSuperAppManager({
        miniAppUrl: 'https://t.me/MyBot/app',
        maxFundsPerUser: 3,
        minFundCapital: 25,
      });
      expect(mgr).toBeInstanceOf(DefaultTelegramSuperAppManager);
    });

    it('should respect custom maxFundsPerUser', async () => {
      const mgr = createTelegramSuperAppManager({ maxFundsPerUser: 2 });
      const user = await mgr.onboardUser({ telegramId: TELEGRAM_ID, firstName: FIRST_NAME });

      await mgr.createFund({
        userId: user.userId,
        name: 'Fund 1',
        strategyId: 'strategy_ton_dca',
        capitalAllocated: 50,
      });
      await mgr.createFund({
        userId: user.userId,
        name: 'Fund 2',
        strategyId: 'strategy_defi_yield',
        capitalAllocated: 100,
      });

      await expect(
        mgr.createFund({
          userId: user.userId,
          name: 'Fund 3',
          strategyId: 'strategy_ton_dca',
          capitalAllocated: 50,
        })
      ).rejects.toThrow('Maximum number of funds');
    });
  });
});
