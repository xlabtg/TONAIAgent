/**
 * Onboarding Module Tests
 *
 * Tests for the Telegram User Onboarding & First Agent Experience
 * as specified in Issue #199.
 *
 * Test coverage:
 * - Onboarding state management
 * - Agent creation wizard flow
 * - Demo mode functionality
 * - Telegram notifications
 * - Strategy selection
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createOnboardingManager,
  DefaultOnboardingManager,
  ONBOARDING_STRATEGIES,
  type OnboardingState,
} from '../../src/superapp/onboarding';

// ============================================================================
// Onboarding Manager Tests
// ============================================================================

describe('OnboardingManager', () => {
  let onboarding: DefaultOnboardingManager;

  beforeEach(() => {
    onboarding = createOnboardingManager();
  });

  describe('initialization', () => {
    it('should create onboarding manager', () => {
      expect(onboarding).toBeInstanceOf(DefaultOnboardingManager);
    });

    it('should have predefined strategies', () => {
      const strategies = onboarding.getAvailableStrategies();
      expect(strategies).toHaveLength(3);
      expect(strategies.map(s => s.id)).toContain('momentum');
      expect(strategies.map(s => s.id)).toContain('mean_reversion');
      expect(strategies.map(s => s.id)).toContain('trend_following');
    });
  });

  describe('onboarding flow', () => {
    const userId = 'user_test_123';
    const telegramUserId = 12345678;

    it('should start onboarding for new user', async () => {
      const state = await onboarding.startOnboarding(userId, telegramUserId);

      expect(state.userId).toBe(userId);
      expect(state.telegramUserId).toBe(telegramUserId);
      expect(state.step).toBe('welcome');
      expect(state.isComplete).toBe(false);
      expect(state.demoModeEnabled).toBe(true);
    });

    it('should detect first-time user', async () => {
      expect(await onboarding.isFirstTimeUser(userId)).toBe(true);

      await onboarding.startOnboarding(userId, telegramUserId);
      expect(await onboarding.isFirstTimeUser(userId)).toBe(true);

      // Complete onboarding
      await onboarding.updateOnboardingStep(userId, 'name_agent', { agentName: 'Test Agent' });
      await onboarding.updateOnboardingStep(userId, 'select_strategy', { selectedStrategy: 'momentum' });
      await onboarding.completeOnboarding(userId);

      expect(await onboarding.isFirstTimeUser(userId)).toBe(false);
    });

    it('should update onboarding step', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);

      const state = await onboarding.updateOnboardingStep(userId, 'name_agent');
      expect(state.step).toBe('name_agent');
    });

    it('should set agent name', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);

      const state = await onboarding.setAgentName(userId, 'My Trading Bot');
      expect(state.agentName).toBe('My Trading Bot');
    });

    it('should select strategy', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);

      const state = await onboarding.selectStrategy(userId, 'momentum');
      expect(state.selectedStrategy).toBe('momentum');
    });

    it('should reject invalid strategy', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);

      await expect(onboarding.selectStrategy(userId, 'invalid_strategy')).rejects.toThrow('Strategy not found');
    });

    it('should complete full onboarding flow', async () => {
      // Step 1: Start
      await onboarding.startOnboarding(userId, telegramUserId);

      // Step 2: Name agent
      await onboarding.setAgentName(userId, 'Alpha Bot');

      // Step 3: Select strategy
      await onboarding.selectStrategy(userId, 'mean_reversion');

      // Step 4: Confirm and create agent
      const result = await onboarding.completeOnboarding(userId);

      expect(result.success).toBe(true);
      expect(result.agentName).toBe('Alpha Bot');
      expect(result.strategy).toBe('Mean Reversion');
      expect(result.agentId).toBeTruthy();
    });

    it('should fail completion without required fields', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);

      // Try to complete without setting agent name and strategy
      const result = await onboarding.completeOnboarding(userId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should reset onboarding', async () => {
      await onboarding.startOnboarding(userId, telegramUserId);
      await onboarding.setAgentName(userId, 'Test Agent');

      await onboarding.resetOnboarding(userId);

      const state = await onboarding.getOnboardingState(userId);
      expect(state).toBeNull();
    });
  });

  describe('agent creation', () => {
    it('should create agent with request', async () => {
      const result = await onboarding.createAgent({
        userId: 'user_123',
        name: 'Yield Hunter',
        strategyId: 'mean_reversion',
        demoMode: true,
      });

      expect(result.success).toBe(true);
      expect(result.agentId).toMatch(/^agent_user_123_\d+$/);
      expect(result.agentName).toBe('Yield Hunter');
      expect(result.strategy).toBe('Mean Reversion');
    });

    it('should fail with invalid strategy', async () => {
      const result = await onboarding.createAgent({
        userId: 'user_123',
        name: 'Test Agent',
        strategyId: 'nonexistent',
        demoMode: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Strategy not found');
    });
  });

  describe('demo mode', () => {
    const userId = 'demo_user_123';

    it('should enable demo mode', async () => {
      await onboarding.startOnboarding(userId, 12345);
      await onboarding.enableDemoMode(userId);

      const state = await onboarding.getOnboardingState(userId);
      expect(state?.demoModeEnabled).toBe(true);
    });

    it('should generate demo portfolio', async () => {
      const portfolio = await onboarding.getDemoPortfolio(userId);

      expect(portfolio.portfolioValue).toBeGreaterThan(0);
      expect(portfolio.tradesExecuted).toBeGreaterThan(0);
      expect(portfolio.activeStrategy).toBeTruthy();
      expect(portfolio.agentStatus).toBe('running');
      expect(portfolio.recentTrades).toHaveLength(5);
    });

    it('should generate demo trades', () => {
      const trades = onboarding.generateDemoTrades(10);

      expect(trades).toHaveLength(10);
      trades.forEach(trade => {
        expect(['BUY', 'SELL']).toContain(trade.action);
        expect(['BTC', 'ETH', 'TON', 'SOL']).toContain(trade.asset);
        expect(trade.amount).toBeGreaterThan(0);
        expect(trade.price).toBeGreaterThan(0);
        expect(trade.id).toBeTruthy();
        expect(trade.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('strategies', () => {
    it('should return all available strategies', () => {
      const strategies = onboarding.getAvailableStrategies();

      expect(strategies).toHaveLength(3);

      const momentum = strategies.find(s => s.id === 'momentum');
      expect(momentum).toBeDefined();
      expect(momentum?.name).toBe('Momentum');
      expect(momentum?.riskLevel).toBe('medium');

      const meanReversion = strategies.find(s => s.id === 'mean_reversion');
      expect(meanReversion).toBeDefined();
      expect(meanReversion?.name).toBe('Mean Reversion');
      expect(meanReversion?.riskLevel).toBe('low');

      const trendFollowing = strategies.find(s => s.id === 'trend_following');
      expect(trendFollowing).toBeDefined();
      expect(trendFollowing?.name).toBe('Trend Following');
      expect(trendFollowing?.riskLevel).toBe('high');
    });

    it('should get strategy by id', () => {
      const strategy = onboarding.getStrategy('momentum');

      expect(strategy).toBeDefined();
      expect(strategy?.id).toBe('momentum');
      expect(strategy?.name).toBe('Momentum');
    });

    it('should return undefined for unknown strategy', () => {
      const strategy = onboarding.getStrategy('unknown');
      expect(strategy).toBeUndefined();
    });
  });

  describe('bot messages', () => {
    it('should generate welcome message', () => {
      const message = onboarding.getWelcomeMessage();

      expect(message).toContain('Welcome');
      expect(message).toContain('TONAIAgent');
      expect(message).toContain('trading agent');
    });

    it('should generate agent started message', () => {
      const message = onboarding.getAgentStartedMessage('Alpha Bot', 'Momentum');

      expect(message).toContain('Agent Started');
      expect(message).toContain('Alpha Bot');
      expect(message).toContain('Momentum');
      expect(message).toContain('Active');
    });

    it('should generate trade executed message', () => {
      const trade = {
        id: 'trade_001',
        timestamp: new Date(),
        asset: 'TON',
        action: 'BUY' as const,
        amount: 100,
        price: 5.25,
        pnl: 12.50,
      };

      const message = onboarding.getTradeExecutedMessage(trade);

      expect(message).toContain('Trade Executed');
      expect(message).toContain('BUY');
      expect(message).toContain('100');
      expect(message).toContain('TON');
      expect(message).toContain('5.25');
      expect(message).toContain('+$12.50');
    });

    it('should format negative PnL correctly', () => {
      const trade = {
        id: 'trade_002',
        timestamp: new Date(),
        asset: 'ETH',
        action: 'SELL' as const,
        amount: 0.5,
        price: 3500,
        pnl: -25.00,
      };

      const message = onboarding.getTradeExecutedMessage(trade);

      expect(message).toContain('-$25.00');
    });
  });

  describe('notifications', () => {
    it('should send agent notification', async () => {
      const notification = {
        type: 'agent_started' as const,
        title: 'Agent Started',
        message: 'Your agent is now running',
        data: { agentId: 'agent_001' },
      };

      // Should not throw
      await expect(
        onboarding.sendAgentNotification(12345678, notification)
      ).resolves.toBeUndefined();
    });
  });

  describe('events', () => {
    it('should emit events during onboarding', async () => {
      const events: unknown[] = [];
      onboarding.onEvent((event) => events.push(event));

      await onboarding.startOnboarding('user_events_test', 12345);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('type', 'superapp_user_onboarded');
    });

    it('should emit agent deployed event', async () => {
      const events: unknown[] = [];
      onboarding.onEvent((event) => events.push(event));

      await onboarding.createAgent({
        userId: 'user_agent_test',
        name: 'Event Test Agent',
        strategyId: 'momentum',
        demoMode: true,
      });

      const deployedEvent = events.find((e: any) => e.type === 'agent_deployed');
      expect(deployedEvent).toBeDefined();
    });
  });
});

// ============================================================================
// Strategy Constants Tests
// ============================================================================

describe('ONBOARDING_STRATEGIES', () => {
  it('should have valid structure', () => {
    ONBOARDING_STRATEGIES.forEach(strategy => {
      expect(strategy.id).toBeTruthy();
      expect(strategy.name).toBeTruthy();
      expect(strategy.description).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(strategy.riskLevel);
      expect(strategy.expectedBehavior).toBeTruthy();
      expect(strategy.icon).toBeTruthy();
    });
  });

  it('should have unique ids', () => {
    const ids = ONBOARDING_STRATEGIES.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
