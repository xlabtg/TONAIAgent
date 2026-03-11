/**
 * TONAIAgent - User Onboarding Module
 *
 * Implements a smooth Telegram-native onboarding experience that allows
 * new users to launch their first AI agent in under 2 minutes.
 *
 * Features:
 * - Telegram bot /start command handling
 * - Mini App first-time user detection
 * - Agent creation wizard (3 steps)
 * - Demo mode with preloaded data
 * - Telegram notifications for agent events
 *
 * @see Issue #199 - Telegram User Onboarding & First Agent Experience
 */

import type {
  DashboardAgent,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Onboarding Types
// ============================================================================

/**
 * Strategy definition for agent creation wizard
 */
export interface OnboardingStrategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedBehavior: string;
  icon: string;
}

/**
 * Available strategies for onboarding
 */
export const ONBOARDING_STRATEGIES: OnboardingStrategy[] = [
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Follows market trends and buys assets showing upward momentum',
    riskLevel: 'medium',
    expectedBehavior: 'Buys when price rises, sells when momentum weakens',
    icon: '📈',
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Buys when prices dip below average, sells when they rise above',
    riskLevel: 'low',
    expectedBehavior: 'Contrarian approach - buys dips, sells rallies',
    icon: '📊',
  },
  {
    id: 'trend_following',
    name: 'Trend Following',
    description: 'Identifies and follows long-term market trends',
    riskLevel: 'high',
    expectedBehavior: 'Holds positions longer, follows major trend directions',
    icon: '🎯',
  },
];

/**
 * User onboarding state
 */
export interface OnboardingState {
  userId: string;
  telegramUserId: number;
  step: OnboardingStep;
  agentName?: string;
  selectedStrategy?: string;
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
  demoModeEnabled: boolean;
}

export type OnboardingStep =
  | 'welcome'
  | 'name_agent'
  | 'select_strategy'
  | 'confirm_start'
  | 'agent_running'
  | 'completed';

/**
 * Agent creation request from onboarding
 */
export interface OnboardingAgentRequest {
  userId: string;
  name: string;
  strategyId: string;
  demoMode: boolean;
}

/**
 * Onboarding completion result
 */
export interface OnboardingResult {
  success: boolean;
  agentId?: string;
  agentName?: string;
  strategy?: string;
  message: string;
}

/**
 * Demo portfolio data for immediate display
 */
export interface DemoPortfolioData {
  portfolioValue: number;
  profitLoss: number;
  profitLossPercent: number;
  tradesExecuted: number;
  activeStrategy: string;
  agentStatus: 'running' | 'monitoring' | 'executing';
  recentTrades: DemoTrade[];
}

export interface DemoTrade {
  id: string;
  timestamp: Date;
  asset: string;
  action: 'BUY' | 'SELL';
  amount: number;
  price: number;
  pnl: number;
}

/**
 * Telegram notification for agent events
 */
export interface AgentNotification {
  type: 'agent_started' | 'trade_executed' | 'portfolio_updated' | 'strategy_signal';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Onboarding Manager Interface
// ============================================================================

export interface OnboardingManager {
  // State management
  getOnboardingState(userId: string): Promise<OnboardingState | null>;
  startOnboarding(userId: string, telegramUserId: number): Promise<OnboardingState>;
  updateOnboardingStep(userId: string, step: OnboardingStep, data?: Partial<OnboardingState>): Promise<OnboardingState>;
  completeOnboarding(userId: string): Promise<OnboardingResult>;
  resetOnboarding(userId: string): Promise<void>;

  // Agent creation
  setAgentName(userId: string, name: string): Promise<OnboardingState>;
  selectStrategy(userId: string, strategyId: string): Promise<OnboardingState>;
  createAgent(request: OnboardingAgentRequest): Promise<OnboardingResult>;

  // Demo mode
  enableDemoMode(userId: string): Promise<void>;
  getDemoPortfolio(userId: string): Promise<DemoPortfolioData>;
  generateDemoTrades(count: number): DemoTrade[];

  // Strategies
  getAvailableStrategies(): OnboardingStrategy[];
  getStrategy(strategyId: string): OnboardingStrategy | undefined;

  // Notifications
  sendAgentNotification(chatId: number, notification: AgentNotification): Promise<void>;

  // Bot messages
  getWelcomeMessage(): string;
  getAgentStartedMessage(agentName: string, strategy: string): string;
  getTradeExecutedMessage(trade: DemoTrade): string;

  // Events
  onEvent(callback: SuperAppEventCallback): void;

  // First-time user check
  isFirstTimeUser(userId: string): Promise<boolean>;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultOnboardingManager implements OnboardingManager {
  private readonly onboardingStates = new Map<string, OnboardingState>();
  private readonly demoPortfolios = new Map<string, DemoPortfolioData>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];
  private readonly completedUsers = new Set<string>();

  // ============================================================================
  // State Management
  // ============================================================================

  async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    return this.onboardingStates.get(userId) ?? null;
  }

  async startOnboarding(userId: string, telegramUserId: number): Promise<OnboardingState> {
    const state: OnboardingState = {
      userId,
      telegramUserId,
      step: 'welcome',
      isComplete: false,
      startedAt: new Date(),
      demoModeEnabled: true, // Demo mode enabled by default
    };

    this.onboardingStates.set(userId, state);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'superapp_user_onboarded',
      severity: 'info',
      source: 'onboarding',
      userId,
      message: 'User started onboarding',
      data: { telegramUserId, step: 'welcome' },
    });

    return state;
  }

  async updateOnboardingStep(
    userId: string,
    step: OnboardingStep,
    data?: Partial<OnboardingState>
  ): Promise<OnboardingState> {
    const state = this.onboardingStates.get(userId);
    if (!state) {
      throw new Error('Onboarding state not found');
    }

    const updatedState: OnboardingState = {
      ...state,
      ...data,
      step,
    };

    if (step === 'completed') {
      updatedState.isComplete = true;
      updatedState.completedAt = new Date();
      this.completedUsers.add(userId);
    }

    this.onboardingStates.set(userId, updatedState);
    return updatedState;
  }

  async completeOnboarding(userId: string): Promise<OnboardingResult> {
    const state = this.onboardingStates.get(userId);
    if (!state) {
      return { success: false, message: 'Onboarding state not found' };
    }

    if (!state.agentName || !state.selectedStrategy) {
      return { success: false, message: 'Agent name and strategy are required' };
    }

    // Create the agent
    const result = await this.createAgent({
      userId,
      name: state.agentName,
      strategyId: state.selectedStrategy,
      demoMode: state.demoModeEnabled,
    });

    if (result.success) {
      await this.updateOnboardingStep(userId, 'completed');
    }

    return result;
  }

  async resetOnboarding(userId: string): Promise<void> {
    this.onboardingStates.delete(userId);
    this.demoPortfolios.delete(userId);
    this.completedUsers.delete(userId);
  }

  // ============================================================================
  // Agent Creation
  // ============================================================================

  async setAgentName(userId: string, name: string): Promise<OnboardingState> {
    return this.updateOnboardingStep(userId, 'name_agent', { agentName: name });
  }

  async selectStrategy(userId: string, strategyId: string): Promise<OnboardingState> {
    const strategy = this.getStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return this.updateOnboardingStep(userId, 'select_strategy', { selectedStrategy: strategyId });
  }

  async createAgent(request: OnboardingAgentRequest): Promise<OnboardingResult> {
    const strategy = this.getStrategy(request.strategyId);
    if (!strategy) {
      return { success: false, message: `Strategy not found: ${request.strategyId}` };
    }

    const agentId = `agent_${request.userId}_${Date.now()}`;

    // Initialize demo portfolio for the user
    if (request.demoMode) {
      await this.initializeDemoPortfolio(request.userId, strategy.name);
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'agent_deployed',
      severity: 'info',
      source: 'onboarding',
      userId: request.userId,
      message: `Agent "${request.name}" created with ${strategy.name} strategy`,
      data: {
        agentId,
        agentName: request.name,
        strategy: strategy.name,
        demoMode: request.demoMode,
      },
    });

    return {
      success: true,
      agentId,
      agentName: request.name,
      strategy: strategy.name,
      message: 'Agent created successfully',
    };
  }

  // ============================================================================
  // Demo Mode
  // ============================================================================

  async enableDemoMode(userId: string): Promise<void> {
    const state = this.onboardingStates.get(userId);
    if (state) {
      state.demoModeEnabled = true;
      this.onboardingStates.set(userId, state);
    }
  }

  async getDemoPortfolio(userId: string): Promise<DemoPortfolioData> {
    let portfolio = this.demoPortfolios.get(userId);

    if (!portfolio) {
      portfolio = await this.initializeDemoPortfolio(userId, 'Momentum');
    }

    return portfolio;
  }

  private async initializeDemoPortfolio(userId: string, strategyName: string): Promise<DemoPortfolioData> {
    const recentTrades = this.generateDemoTrades(5);
    const totalPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);

    const portfolio: DemoPortfolioData = {
      portfolioValue: 10000 + totalPnl,
      profitLoss: totalPnl,
      profitLossPercent: (totalPnl / 10000) * 100,
      tradesExecuted: recentTrades.length,
      activeStrategy: strategyName,
      agentStatus: 'running',
      recentTrades,
    };

    this.demoPortfolios.set(userId, portfolio);
    return portfolio;
  }

  generateDemoTrades(count: number): DemoTrade[] {
    const assets = ['BTC', 'ETH', 'TON', 'SOL'];
    const trades: DemoTrade[] = [];

    for (let i = 0; i < count; i++) {
      const asset = assets[i % assets.length];
      const action = i % 2 === 0 ? 'BUY' : 'SELL';
      const basePrice = { BTC: 65000, ETH: 3500, TON: 5.25, SOL: 175 }[asset] ?? 100;
      const priceVariation = basePrice * (0.98 + Math.random() * 0.04);
      const amount = parseFloat((0.01 + Math.random() * 0.5).toFixed(4));
      const pnl = action === 'SELL' ? parseFloat(((Math.random() - 0.3) * amount * basePrice * 0.05).toFixed(2)) : 0;

      trades.push({
        id: `demo_trade_${Date.now()}_${i}`,
        timestamp: new Date(Date.now() - i * 3600000), // 1 hour apart
        asset,
        action,
        amount,
        price: parseFloat(priceVariation.toFixed(2)),
        pnl,
      });
    }

    return trades;
  }

  // ============================================================================
  // Strategies
  // ============================================================================

  getAvailableStrategies(): OnboardingStrategy[] {
    return [...ONBOARDING_STRATEGIES];
  }

  getStrategy(strategyId: string): OnboardingStrategy | undefined {
    return ONBOARDING_STRATEGIES.find((s) => s.id === strategyId);
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  async sendAgentNotification(chatId: number, notification: AgentNotification): Promise<void> {
    // In production, this would call the Telegram Bot API
    console.log(`[Onboarding] Sending notification to ${chatId}: ${notification.title}`);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'notification_sent',
      severity: 'info',
      source: 'onboarding',
      message: notification.message,
      data: { chatId, type: notification.type, ...notification.data },
    });
  }

  // ============================================================================
  // Bot Messages
  // ============================================================================

  getWelcomeMessage(): string {
    return `Welcome to TONAIAgent! 🤖

Launch your AI trading agent in seconds.

Your personal AI will monitor markets 24/7 and execute strategies automatically.

Tap the button below to get started!`;
  }

  getAgentStartedMessage(agentName: string, strategy: string): string {
    return `🚀 Agent Started!

Your AI agent "${agentName}" is now running.

📊 Strategy: ${strategy}
⚡ Status: Active
📈 Mode: Monitoring market

You'll receive notifications when trades are executed.`;
  }

  getTradeExecutedMessage(trade: DemoTrade): string {
    const pnlStr = trade.pnl >= 0 ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`;
    const pnlEmoji = trade.pnl >= 0 ? '📈' : '📉';

    return `💰 Trade Executed

${trade.action === 'BUY' ? '🟢' : '🔴'} ${trade.action} ${trade.amount} ${trade.asset}

📍 Price: $${trade.price.toFixed(2)}
${pnlEmoji} P&L: ${pnlStr}

Your AI agent is working for you!`;
  }

  // ============================================================================
  // First-Time User Check
  // ============================================================================

  async isFirstTimeUser(userId: string): Promise<boolean> {
    return !this.completedUsers.has(userId);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: SuperAppEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOnboardingManager(): DefaultOnboardingManager {
  return new DefaultOnboardingManager();
}

export default DefaultOnboardingManager;
