/**
 * TONAIAgent - Telegram SuperApp Integration Module
 *
 * Complete Telegram SuperApp integration combining bot commands, Mini App interface,
 * real-time notifications, agent interaction, wallet & identity management,
 * and mobile-first UX optimization.
 *
 * Features:
 * - Bot commands: /start, /portfolio, /strategies, /create_fund, /analytics
 * - Telegram Mini App interface (strategy marketplace, fund creation, portfolio analytics, risk monitoring)
 * - Real-time notification system (trade alerts, portfolio updates, risk warnings, rebalancing events)
 * - Agent interaction command interface (start/pause strategy, adjust allocation, performance summary)
 * - Wallet & identity integration (TON-compatible wallets)
 * - Mobile-first UX optimization
 *
 * Architecture:
 * Telegram Bot → Telegram Mini App → Platform API → Agent Runtime → Trading Infrastructure
 */

import type {
  SuperAppEvent,
  SuperAppEventCallback,
  TelegramSuperAppUser,
  SuperAppFund,
  SuperAppStrategy,
  SuperAppPortfolioAnalytics,
  SuperAppRiskMonitor,
  WalletIdentityInfo,
  SuperAppCommandResult,
  SuperAppKeyboard,
  SuperAppKeyboardButton,
  FundStatus,
  StrategyRiskLevel,
  FundPerformance,
  SuperAppFundSummary,
  PortfolioRecommendation,
  SuperAppRiskAlert,
  DrawdownWarning,
  ConcentrationWarning,
  RebalanceEvent,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface TelegramSuperAppConfig {
  botToken?: string;
  miniAppUrl: string;
  webhookUrl?: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  maxFundsPerUser: number;
  minFundCapital: number;
  riskAlertThresholds: {
    drawdown: number;
    volatility: number;
    concentration: number;
  };
}

// ============================================================================
// Input Types
// ============================================================================

export interface OnboardUserInput {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isPremium?: boolean;
  languageCode?: string;
}

export interface CreateFundInput {
  userId: string;
  name: string;
  description?: string;
  strategyId: string;
  capitalAllocated: number;
  currency?: string;
}

export interface UpdateFundInput {
  name?: string;
  description?: string;
  capitalAllocated?: number;
}

export interface LinkWalletInput {
  userId: string;
  telegramId: number;
  walletAddress: string;
  walletType: 'ton_connect' | 'mpc' | 'smart_contract';
  tonBalance?: number;
  usdtBalance?: number;
}

export interface StartFundInput {
  userId: string;
  fundId: string;
}

export interface PauseFundInput {
  userId: string;
  fundId: string;
  reason?: string;
}

export interface AdjustAllocationInput {
  userId: string;
  fundId: string;
  newCapital: number;
}

export interface GetStrategiesInput {
  category?: string;
  riskLevel?: StrategyRiskLevel;
  minCapital?: number;
  maxCapital?: number;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Telegram SuperApp Manager Interface
// ============================================================================

export interface TelegramSuperAppManager {
  // User onboarding
  onboardUser(input: OnboardUserInput): Promise<TelegramSuperAppUser>;
  getUser(userId: string): Promise<TelegramSuperAppUser | null>;
  getUserByTelegramId(telegramId: number): Promise<TelegramSuperAppUser | null>;
  updateUserActivity(userId: string): Promise<void>;

  // Wallet & Identity
  linkWallet(input: LinkWalletInput): Promise<WalletIdentityInfo>;
  getWalletInfo(userId: string): Promise<WalletIdentityInfo | null>;
  unlinkWallet(userId: string): Promise<void>;

  // Fund Management
  createFund(input: CreateFundInput): Promise<SuperAppFund>;
  getFund(fundId: string): Promise<SuperAppFund | null>;
  getUserFunds(userId: string): Promise<SuperAppFund[]>;
  startFund(input: StartFundInput): Promise<SuperAppFund>;
  pauseFund(input: PauseFundInput): Promise<SuperAppFund>;
  closeFund(userId: string, fundId: string): Promise<SuperAppFund>;
  adjustAllocation(input: AdjustAllocationInput): Promise<SuperAppFund>;

  // Strategy Marketplace
  getStrategies(input?: GetStrategiesInput): Promise<SuperAppStrategy[]>;
  getStrategy(strategyId: string): Promise<SuperAppStrategy | null>;
  getRecommendedStrategies(userId: string): Promise<SuperAppStrategy[]>;

  // Portfolio Analytics
  getPortfolioAnalytics(userId: string): Promise<SuperAppPortfolioAnalytics>;
  getPerformanceSummary(userId: string, period: '24h' | '7d' | '30d' | 'all'): Promise<string>;

  // Risk Monitoring
  getRiskMonitor(userId: string): Promise<SuperAppRiskMonitor>;
  getRiskAlerts(userId: string): Promise<SuperAppRiskAlert[]>;

  // Bot Commands
  handleStart(telegramId: number, startParam?: string): Promise<SuperAppCommandResult>;
  handlePortfolio(userId: string): Promise<SuperAppCommandResult>;
  handleStrategies(userId: string, category?: string): Promise<SuperAppCommandResult>;
  handleCreateFund(userId: string): Promise<SuperAppCommandResult>;
  handleAnalytics(userId: string): Promise<SuperAppCommandResult>;

  // Agent Interaction Commands
  handleStartStrategy(userId: string, fundId: string): Promise<SuperAppCommandResult>;
  handlePauseStrategy(userId: string, fundId: string, reason?: string): Promise<SuperAppCommandResult>;
  handleAdjustAllocation(userId: string, fundId: string, amount: number): Promise<SuperAppCommandResult>;
  handlePerformanceSummary(userId: string, fundId?: string): Promise<SuperAppCommandResult>;

  // Rebalance Events
  triggerRebalance(userId: string, fundId: string, reason: RebalanceEvent['triggeredBy']): Promise<RebalanceEvent>;
  getRebalanceHistory(userId: string, fundId?: string): Promise<RebalanceEvent[]>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultTelegramSuperAppManager implements TelegramSuperAppManager {
  private readonly config: TelegramSuperAppConfig;
  private readonly users = new Map<string, TelegramSuperAppUser>();
  private readonly telegramIdToUserId = new Map<number, string>();
  private readonly wallets = new Map<string, WalletIdentityInfo>();
  private readonly funds = new Map<string, SuperAppFund>();
  private readonly userFunds = new Map<string, string[]>();
  private readonly strategies = new Map<string, SuperAppStrategy>();
  private readonly rebalanceHistory = new Map<string, RebalanceEvent[]>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<TelegramSuperAppConfig> = {}) {
    this.config = {
      botToken: config.botToken,
      miniAppUrl: config.miniAppUrl ?? 'https://t.me/TONAIAgentBot/app',
      webhookUrl: config.webhookUrl,
      defaultLanguage: config.defaultLanguage ?? 'en',
      supportedLanguages: config.supportedLanguages ?? ['en', 'ru', 'zh'],
      maxFundsPerUser: config.maxFundsPerUser ?? 10,
      minFundCapital: config.minFundCapital ?? 10,
      riskAlertThresholds: config.riskAlertThresholds ?? {
        drawdown: 15,
        volatility: 30,
        concentration: 50,
      },
    };

    // Initialize built-in strategies
    this.initializeStrategies();
  }

  // ============================================================================
  // User Onboarding
  // ============================================================================

  async onboardUser(input: OnboardUserInput): Promise<TelegramSuperAppUser> {
    // Check if user already exists by telegram ID
    const existingUserId = this.telegramIdToUserId.get(input.telegramId);
    if (existingUserId) {
      const existingUser = this.users.get(existingUserId);
      if (existingUser) {
        // Update activity and return existing user
        existingUser.lastActiveAt = new Date();
        if (input.username) existingUser.username = input.username;
        this.users.set(existingUserId, existingUser);
        return existingUser;
      }
    }

    const userId = `user_${input.telegramId}_${Date.now()}`;

    const user: TelegramSuperAppUser = {
      userId,
      telegramId: input.telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      isPremium: input.isPremium ?? false,
      languageCode: input.languageCode ?? this.config.defaultLanguage,
      onboardedAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.users.set(userId, user);
    this.telegramIdToUserId.set(input.telegramId, userId);
    this.userFunds.set(userId, []);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'superapp_user_onboarded',
      severity: 'info',
      source: 'telegram-superapp',
      userId,
      message: `New user onboarded: ${input.firstName ?? input.username ?? input.telegramId}`,
      data: { telegramId: input.telegramId, username: input.username },
    });

    return user;
  }

  async getUser(userId: string): Promise<TelegramSuperAppUser | null> {
    return this.users.get(userId) ?? null;
  }

  async getUserByTelegramId(telegramId: number): Promise<TelegramSuperAppUser | null> {
    const userId = this.telegramIdToUserId.get(telegramId);
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async updateUserActivity(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
      this.users.set(userId, user);
    }
  }

  // ============================================================================
  // Wallet & Identity
  // ============================================================================

  async linkWallet(input: LinkWalletInput): Promise<WalletIdentityInfo> {
    const user = this.users.get(input.userId);
    if (!user) {
      throw new Error(`User not found: ${input.userId}`);
    }

    const walletInfo: WalletIdentityInfo = {
      userId: input.userId,
      telegramId: input.telegramId,
      walletAddress: input.walletAddress,
      walletType: input.walletType,
      tonBalance: input.tonBalance ?? 0,
      usdtBalance: input.usdtBalance ?? 0,
      verified: true,
      linkedAt: new Date(),
    };

    this.wallets.set(input.userId, walletInfo);

    // Update user with wallet info
    user.walletAddress = input.walletAddress;
    user.walletType = input.walletType;
    this.users.set(input.userId, user);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'wallet_connected',
      severity: 'info',
      source: 'telegram-superapp',
      userId: input.userId,
      message: `Wallet linked: ${input.walletAddress.slice(0, 8)}...`,
      data: { walletType: input.walletType, walletAddress: input.walletAddress },
    });

    return walletInfo;
  }

  async getWalletInfo(userId: string): Promise<WalletIdentityInfo | null> {
    return this.wallets.get(userId) ?? null;
  }

  async unlinkWallet(userId: string): Promise<void> {
    this.wallets.delete(userId);

    const user = this.users.get(userId);
    if (user) {
      user.walletAddress = undefined;
      user.walletType = undefined;
      this.users.set(userId, user);
    }
  }

  // ============================================================================
  // Fund Management
  // ============================================================================

  async createFund(input: CreateFundInput): Promise<SuperAppFund> {
    const user = this.users.get(input.userId);
    if (!user) {
      throw new Error(`User not found: ${input.userId}`);
    }

    const userFundIds = this.userFunds.get(input.userId) ?? [];
    if (userFundIds.length >= this.config.maxFundsPerUser) {
      throw new Error(`Maximum number of funds (${this.config.maxFundsPerUser}) reached`);
    }

    if (input.capitalAllocated < this.config.minFundCapital) {
      throw new Error(`Minimum capital required: ${this.config.minFundCapital} ${input.currency ?? 'USDT'}`);
    }

    const strategy = this.strategies.get(input.strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${input.strategyId}`);
    }

    if (input.capitalAllocated < strategy.minCapital) {
      throw new Error(`Strategy requires minimum capital of ${strategy.minCapital} ${input.currency ?? 'USDT'}`);
    }

    const fundId = `fund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const performance: FundPerformance = {
      totalValue: input.capitalAllocated,
      totalPnl: 0,
      totalPnlPercent: 0,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      weeklyPnl: 0,
      monthlyPnl: 0,
    };

    const fund: SuperAppFund = {
      id: fundId,
      userId: input.userId,
      name: input.name,
      description: input.description,
      strategyId: input.strategyId,
      strategyName: strategy.name,
      riskLevel: strategy.riskLevel,
      capitalAllocated: input.capitalAllocated,
      currency: input.currency ?? 'USDT',
      status: 'active',
      performance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.funds.set(fundId, fund);
    userFundIds.push(fundId);
    this.userFunds.set(input.userId, userFundIds);

    // Update strategy user count
    strategy.totalAllocated += input.capitalAllocated;
    strategy.usersCount += 1;
    this.strategies.set(input.strategyId, strategy);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'superapp_fund_created',
      severity: 'info',
      source: 'telegram-superapp',
      userId: input.userId,
      message: `Fund created: ${input.name} with ${input.capitalAllocated} ${input.currency ?? 'USDT'}`,
      data: { fundId, strategyId: input.strategyId, capital: input.capitalAllocated },
    });

    return fund;
  }

  async getFund(fundId: string): Promise<SuperAppFund | null> {
    return this.funds.get(fundId) ?? null;
  }

  async getUserFunds(userId: string): Promise<SuperAppFund[]> {
    const fundIds = this.userFunds.get(userId) ?? [];
    const funds: SuperAppFund[] = [];
    for (const id of fundIds) {
      const fund = this.funds.get(id);
      if (fund) funds.push(fund);
    }
    return funds;
  }

  async startFund(input: StartFundInput): Promise<SuperAppFund> {
    const fund = this.funds.get(input.fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${input.fundId}`);
    }
    if (fund.userId !== input.userId) {
      throw new Error('Unauthorized: fund does not belong to user');
    }
    if (fund.status === 'active') {
      throw new Error('Fund is already active');
    }
    if (fund.status === 'closed') {
      throw new Error('Cannot restart a closed fund');
    }

    fund.status = 'active';
    fund.updatedAt = new Date();
    this.funds.set(input.fundId, fund);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'agent_resumed',
      severity: 'info',
      source: 'telegram-superapp',
      userId: input.userId,
      message: `Fund started: ${fund.name}`,
      data: { fundId: input.fundId },
    });

    return fund;
  }

  async pauseFund(input: PauseFundInput): Promise<SuperAppFund> {
    const fund = this.funds.get(input.fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${input.fundId}`);
    }
    if (fund.userId !== input.userId) {
      throw new Error('Unauthorized: fund does not belong to user');
    }
    if (fund.status !== 'active') {
      throw new Error('Fund must be active to pause');
    }

    fund.status = 'paused';
    fund.updatedAt = new Date();
    this.funds.set(input.fundId, fund);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'agent_paused',
      severity: 'info',
      source: 'telegram-superapp',
      userId: input.userId,
      message: `Fund paused: ${fund.name}${input.reason ? ` - ${input.reason}` : ''}`,
      data: { fundId: input.fundId, reason: input.reason },
    });

    return fund;
  }

  async closeFund(userId: string, fundId: string): Promise<SuperAppFund> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }
    if (fund.userId !== userId) {
      throw new Error('Unauthorized: fund does not belong to user');
    }
    if (fund.status === 'closed') {
      throw new Error('Fund is already closed');
    }

    fund.status = 'closed';
    fund.updatedAt = new Date();
    this.funds.set(fundId, fund);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'agent_stopped',
      severity: 'info',
      source: 'telegram-superapp',
      userId,
      message: `Fund closed: ${fund.name}`,
      data: { fundId },
    });

    return fund;
  }

  async adjustAllocation(input: AdjustAllocationInput): Promise<SuperAppFund> {
    const fund = this.funds.get(input.fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${input.fundId}`);
    }
    if (fund.userId !== input.userId) {
      throw new Error('Unauthorized: fund does not belong to user');
    }
    if (input.newCapital < this.config.minFundCapital) {
      throw new Error(`Minimum capital required: ${this.config.minFundCapital}`);
    }

    const strategy = this.strategies.get(fund.strategyId);
    if (strategy && input.newCapital < strategy.minCapital) {
      throw new Error(`Strategy requires minimum capital of ${strategy.minCapital}`);
    }

    const oldCapital = fund.capitalAllocated;
    fund.capitalAllocated = input.newCapital;
    fund.performance.totalValue = input.newCapital + fund.performance.totalPnl;
    fund.updatedAt = new Date();
    this.funds.set(input.fundId, fund);

    // Update strategy total allocation
    if (strategy) {
      strategy.totalAllocated = strategy.totalAllocated - oldCapital + input.newCapital;
      this.strategies.set(fund.strategyId, strategy);
    }

    return fund;
  }

  // ============================================================================
  // Strategy Marketplace
  // ============================================================================

  async getStrategies(input: GetStrategiesInput = {}): Promise<SuperAppStrategy[]> {
    let strategies = Array.from(this.strategies.values());

    if (input.category) {
      strategies = strategies.filter((s) => s.category === input.category);
    }
    if (input.riskLevel) {
      strategies = strategies.filter((s) => s.riskLevel === input.riskLevel);
    }
    if (input.minCapital !== undefined) {
      strategies = strategies.filter((s) => s.minCapital >= input.minCapital!);
    }
    if (input.maxCapital !== undefined) {
      strategies = strategies.filter((s) => s.minCapital <= input.maxCapital!);
    }

    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;
    return strategies.slice(offset, offset + limit);
  }

  async getStrategy(strategyId: string): Promise<SuperAppStrategy | null> {
    return this.strategies.get(strategyId) ?? null;
  }

  async getRecommendedStrategies(userId: string): Promise<SuperAppStrategy[]> {
    const user = this.users.get(userId);
    const userFunds = await this.getUserFunds(userId);

    // Get existing strategy IDs
    const usedStrategyIds = new Set(userFunds.map((f) => f.strategyId));

    // Recommend strategies not yet used, sorted by performance
    let recommended = Array.from(this.strategies.values())
      .filter((s) => s.verified && !usedStrategyIds.has(s.id))
      .sort((a, b) => (b.performance30d ?? 0) - (a.performance30d ?? 0));

    // Filter by language preference (simple heuristic)
    if (user?.languageCode === 'ru') {
      // Prioritize strategies with conservative risk for certain locales
      recommended = [
        ...recommended.filter((s) => s.riskLevel === 'conservative' || s.riskLevel === 'moderate'),
        ...recommended.filter((s) => s.riskLevel === 'aggressive' || s.riskLevel === 'speculative'),
      ];
    }

    return recommended.slice(0, 5);
  }

  // ============================================================================
  // Portfolio Analytics
  // ============================================================================

  async getPortfolioAnalytics(userId: string): Promise<SuperAppPortfolioAnalytics> {
    const funds = await this.getUserFunds(userId);

    let totalValue = 0;
    let totalPnl = 0;
    let bestFund: SuperAppFundSummary | undefined;
    let worstFund: SuperAppFundSummary | undefined;

    const fundSummaries: SuperAppFundSummary[] = funds.map((fund) => {
      const summary: SuperAppFundSummary = {
        id: fund.id,
        name: fund.name,
        strategyName: fund.strategyName,
        capitalAllocated: fund.capitalAllocated,
        currentValue: fund.performance.totalValue,
        pnl: fund.performance.totalPnl,
        pnlPercent: fund.performance.totalPnlPercent,
        status: fund.status,
        riskLevel: fund.riskLevel,
      };

      totalValue += fund.performance.totalValue;
      totalPnl += fund.performance.totalPnl;

      if (!bestFund || summary.pnlPercent > bestFund.pnlPercent) {
        bestFund = summary;
      }
      if (!worstFund || summary.pnlPercent < worstFund.pnlPercent) {
        worstFund = summary;
      }

      return summary;
    });

    const totalCapital = funds.reduce((sum, f) => sum + f.capitalAllocated, 0);
    const totalPnlPercent = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;

    // Calculate risk score (0-100)
    const activeFunds = funds.filter((f) => f.status === 'active');
    const highRiskFunds = activeFunds.filter(
      (f) => f.riskLevel === 'aggressive' || f.riskLevel === 'speculative'
    );
    const riskScore = activeFunds.length > 0 ? (highRiskFunds.length / activeFunds.length) * 100 : 0;

    // Calculate diversification score (0-100, higher = more diversified)
    const uniqueStrategies = new Set(funds.map((f) => f.strategyId)).size;
    const diversificationScore = Math.min(100, (uniqueStrategies / Math.max(funds.length, 1)) * 100);

    const recommendations = this.generatePortfolioRecommendations(funds, riskScore, diversificationScore);

    return {
      userId,
      totalValue,
      totalPnl,
      totalPnlPercent,
      funds: fundSummaries,
      riskScore,
      diversificationScore,
      topPerformingFund: bestFund && bestFund.pnlPercent > 0
        ? { id: bestFund.id, name: bestFund.name, pnlPercent: bestFund.pnlPercent }
        : undefined,
      worstPerformingFund: worstFund && worstFund.pnlPercent < 0
        ? { id: worstFund.id, name: worstFund.name, pnlPercent: worstFund.pnlPercent }
        : undefined,
      recommendations,
      updatedAt: new Date(),
    };
  }

  async getPerformanceSummary(
    userId: string,
    period: '24h' | '7d' | '30d' | 'all'
  ): Promise<string> {
    const analytics = await this.getPortfolioAnalytics(userId);
    const funds = await this.getUserFunds(userId);

    const activeFunds = funds.filter((f) => f.status === 'active');

    const periodLabel = { '24h': '24 hours', '7d': '7 days', '30d': '30 days', all: 'all time' }[period];

    let pnl: number;
    switch (period) {
      case '24h':
        pnl = funds.reduce((sum, f) => sum + f.performance.dailyPnl, 0);
        break;
      case '7d':
        pnl = funds.reduce((sum, f) => sum + f.performance.weeklyPnl, 0);
        break;
      case '30d':
        pnl = funds.reduce((sum, f) => sum + f.performance.monthlyPnl, 0);
        break;
      default:
        pnl = analytics.totalPnl;
    }

    const pnlSign = pnl >= 0 ? '+' : '';
    const lines = [
      `📊 Performance Summary (${periodLabel})`,
      ``,
      `💼 Portfolio: $${analytics.totalValue.toFixed(2)}`,
      `📈 P&L: ${pnlSign}$${pnl.toFixed(2)}`,
      `🎯 Active Funds: ${activeFunds.length}/${funds.length}`,
    ];

    if (analytics.topPerformingFund) {
      lines.push(
        `⭐ Best: ${analytics.topPerformingFund.name} (+${analytics.topPerformingFund.pnlPercent.toFixed(2)}%)`
      );
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Risk Monitoring
  // ============================================================================

  async getRiskMonitor(userId: string): Promise<SuperAppRiskMonitor> {
    const funds = await this.getUserFunds(userId);
    const alerts: SuperAppRiskAlert[] = [];
    const drawdownWarnings: DrawdownWarning[] = [];
    const concentrationWarnings: ConcentrationWarning[] = [];

    const thresholds = this.config.riskAlertThresholds;

    for (const fund of funds) {
      if (fund.status !== 'active') continue;

      const drawdown = fund.performance.maxDrawdown ?? 0;
      const drawdownWarning: DrawdownWarning = {
        fundId: fund.id,
        fundName: fund.name,
        currentDrawdown: drawdown,
        maxDrawdown: drawdown,
        threshold: thresholds.drawdown,
        isBreached: drawdown > thresholds.drawdown,
      };
      drawdownWarnings.push(drawdownWarning);

      if (drawdownWarning.isBreached) {
        alerts.push({
          id: `alert_drawdown_${fund.id}_${Date.now()}`,
          fundId: fund.id,
          fundName: fund.name,
          type: 'drawdown',
          severity: drawdown > thresholds.drawdown * 1.5 ? 'critical' : 'warning',
          title: `Drawdown Alert: ${fund.name}`,
          message: `Current drawdown of ${drawdown.toFixed(1)}% exceeds threshold of ${thresholds.drawdown}%`,
          currentValue: drawdown,
          threshold: thresholds.drawdown,
          recommendation: 'Consider pausing the fund or reducing allocation',
          createdAt: new Date(),
        });
      }
    }

    // Calculate overall risk level
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
    const warningAlerts = alerts.filter((a) => a.severity === 'warning').length;

    let overallRiskLevel: SuperAppRiskMonitor['overallRiskLevel'];
    if (criticalAlerts > 0) {
      overallRiskLevel = 'extreme';
    } else if (warningAlerts > 1) {
      overallRiskLevel = 'high';
    } else if (warningAlerts > 0) {
      overallRiskLevel = 'medium';
    } else {
      overallRiskLevel = 'low';
    }

    const activeFunds = funds.filter((f) => f.status === 'active');
    const highRiskFunds = activeFunds.filter(
      (f) => f.riskLevel === 'aggressive' || f.riskLevel === 'speculative'
    );
    const riskScore = activeFunds.length > 0
      ? Math.min(100, (highRiskFunds.length / activeFunds.length) * 80 + criticalAlerts * 20)
      : 0;

    return {
      userId,
      overallRiskLevel,
      riskScore,
      alerts,
      drawdownWarnings,
      concentrationWarnings,
      updatedAt: new Date(),
    };
  }

  async getRiskAlerts(userId: string): Promise<SuperAppRiskAlert[]> {
    const monitor = await this.getRiskMonitor(userId);
    return monitor.alerts;
  }

  // ============================================================================
  // Bot Commands
  // ============================================================================

  async handleStart(telegramId: number, startParam?: string): Promise<SuperAppCommandResult> {
    const existingUser = await this.getUserByTelegramId(telegramId);

    if (existingUser) {
      await this.updateUserActivity(existingUser.userId);
      const funds = await this.getUserFunds(existingUser.userId);
      const walletInfo = await this.getWalletInfo(existingUser.userId);

      return {
        success: true,
        message: [
          `Welcome back, ${existingUser.firstName ?? existingUser.username ?? 'Trader'}! 👋`,
          ``,
          `📊 Your Status:`,
          `• Funds: ${funds.length} active`,
          `• Wallet: ${walletInfo ? `${walletInfo.walletAddress.slice(0, 8)}...` : 'Not connected'}`,
          ``,
          `Use /portfolio to view your investments`,
          `Use /strategies to browse strategies`,
          `Use /analytics to see performance`,
        ].join('\n'),
        keyboard: this.getMainMenuKeyboard(existingUser.userId),
      };
    }

    // New user — onboard them
    const newUser = await this.onboardUser({
      telegramId,
      startParam,
    } as OnboardUserInput & { startParam?: string });

    return {
      success: true,
      message: [
        `🚀 Welcome to TONAIAgent SuperApp!`,
        ``,
        `Your AI-powered investment platform on TON blockchain.`,
        ``,
        `To get started:`,
        `1. Connect your TON wallet`,
        `2. Browse investment strategies`,
        `3. Create your first fund`,
        ``,
        `Open the Mini App for the full experience:`,
        this.config.miniAppUrl,
      ].join('\n'),
      keyboard: this.getOnboardingKeyboard(),
    };
  }

  async handlePortfolio(userId: string): Promise<SuperAppCommandResult> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found. Please use /start to register.' };
    }

    await this.updateUserActivity(userId);
    const funds = await this.getUserFunds(userId);
    const analytics = await this.getPortfolioAnalytics(userId);

    if (funds.length === 0) {
      return {
        success: true,
        message: [
          `💼 Your Portfolio`,
          ``,
          `You don't have any funds yet.`,
          ``,
          `Use /strategies to browse available strategies`,
          `Use /create_fund to create your first fund`,
        ].join('\n'),
        keyboard: this.getPortfolioEmptyKeyboard(),
      };
    }

    const activeFunds = funds.filter((f) => f.status === 'active');
    const pnlSign = analytics.totalPnl >= 0 ? '+' : '';

    return {
      success: true,
      message: [
        `💼 Your Portfolio`,
        ``,
        `Total Value: $${analytics.totalValue.toFixed(2)}`,
        `Total P&L: ${pnlSign}$${analytics.totalPnl.toFixed(2)} (${pnlSign}${analytics.totalPnlPercent.toFixed(2)}%)`,
        `Active Funds: ${activeFunds.length}/${funds.length}`,
        ``,
        `Funds:`,
        ...funds.slice(0, 5).map((f) => {
          const pnl = f.performance.totalPnl;
          const sign = pnl >= 0 ? '+' : '';
          const statusEmoji = f.status === 'active' ? '🟢' : f.status === 'paused' ? '🟡' : '🔴';
          return `${statusEmoji} ${f.name}: $${f.performance.totalValue.toFixed(2)} (${sign}${f.performance.totalPnlPercent.toFixed(2)}%)`;
        }),
        funds.length > 5 ? `... and ${funds.length - 5} more` : '',
        ``,
        `Open Mini App for detailed analytics:`,
        `${this.config.miniAppUrl}`,
      ].filter(Boolean).join('\n'),
      keyboard: this.getPortfolioKeyboard(userId),
    };
  }

  async handleStrategies(userId: string, category?: string): Promise<SuperAppCommandResult> {
    await this.updateUserActivity(userId);
    const strategies = await this.getStrategies({ category, limit: 5 });

    if (strategies.length === 0) {
      return {
        success: true,
        message: `No strategies found${category ? ` in category: ${category}` : ''}. Try /strategies without filter.`,
      };
    }

    const lines = [`🏪 Strategy Marketplace`, ``];

    for (const strategy of strategies) {
      const riskEmoji = {
        conservative: '🟢',
        moderate: '🟡',
        aggressive: '🟠',
        speculative: '🔴',
      }[strategy.riskLevel];

      lines.push(
        `${riskEmoji} **${strategy.name}**`,
        `   ${strategy.description}`,
        `   Min: $${strategy.minCapital} | APR: ${strategy.expectedApr ? `~${strategy.expectedApr}%` : 'Variable'}`,
        `   Users: ${strategy.usersCount} | 30d: ${strategy.performance30d ? `${strategy.performance30d > 0 ? '+' : ''}${strategy.performance30d.toFixed(1)}%` : 'N/A'}`,
        ``
      );
    }

    lines.push(`Browse all strategies in the Mini App:`, this.config.miniAppUrl);

    return {
      success: true,
      message: lines.join('\n'),
      keyboard: this.getStrategiesKeyboard(),
    };
  }

  async handleCreateFund(userId: string): Promise<SuperAppCommandResult> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found. Please use /start to register.' };
    }

    await this.updateUserActivity(userId);
    const wallet = await this.getWalletInfo(userId);

    if (!wallet) {
      return {
        success: true,
        message: [
          `💼 Create Fund`,
          ``,
          `You need to connect a wallet first before creating a fund.`,
          ``,
          `Open the Mini App to connect your TON wallet:`,
          this.config.miniAppUrl,
        ].join('\n'),
        keyboard: this.getConnectWalletKeyboard(),
      };
    }

    const userFunds = await this.getUserFunds(userId);
    if (userFunds.length >= this.config.maxFundsPerUser) {
      return {
        success: false,
        message: `You've reached the maximum of ${this.config.maxFundsPerUser} funds. Please close an existing fund first.`,
      };
    }

    return {
      success: true,
      message: [
        `💼 Create New Fund`,
        ``,
        `Available balance: ${wallet.tonBalance.toFixed(2)} TON | ${wallet.usdtBalance.toFixed(2)} USDT`,
        `Minimum investment: $${this.config.minFundCapital}`,
        ``,
        `To create a fund, open the Mini App:`,
        `1. Select a strategy`,
        `2. Set your investment amount`,
        `3. Confirm and deploy`,
        ``,
        this.config.miniAppUrl,
        ``,
        `Or use /strategies to browse available strategies first.`,
      ].join('\n'),
      keyboard: this.getCreateFundKeyboard(),
    };
  }

  async handleAnalytics(userId: string): Promise<SuperAppCommandResult> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found. Please use /start to register.' };
    }

    await this.updateUserActivity(userId);
    const analytics = await this.getPortfolioAnalytics(userId);
    const riskMonitor = await this.getRiskMonitor(userId);

    if (analytics.funds.length === 0) {
      return {
        success: true,
        message: `📊 Analytics\n\nNo funds to analyze yet. Create your first fund with /create_fund`,
      };
    }

    const pnlSign = analytics.totalPnl >= 0 ? '+' : '';
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      extreme: '🔴',
    }[riskMonitor.overallRiskLevel];

    return {
      success: true,
      message: [
        `📊 Portfolio Analytics`,
        ``,
        `💰 Total Value: $${analytics.totalValue.toFixed(2)}`,
        `📈 Total P&L: ${pnlSign}$${analytics.totalPnl.toFixed(2)} (${pnlSign}${analytics.totalPnlPercent.toFixed(2)}%)`,
        ``,
        `${riskEmoji} Risk Level: ${riskMonitor.overallRiskLevel.toUpperCase()}`,
        `🎯 Risk Score: ${riskMonitor.riskScore.toFixed(0)}/100`,
        `🔀 Diversification: ${analytics.diversificationScore.toFixed(0)}/100`,
        ``,
        analytics.topPerformingFund
          ? `⭐ Best Performer: ${analytics.topPerformingFund.name} (+${analytics.topPerformingFund.pnlPercent.toFixed(2)}%)`
          : '',
        riskMonitor.alerts.length > 0
          ? `⚠️ Active Alerts: ${riskMonitor.alerts.length}`
          : '✅ No active alerts',
        ``,
        analytics.recommendations.length > 0
          ? `💡 Recommendations:\n${analytics.recommendations.slice(0, 2).map((r) => `• ${r.title}`).join('\n')}`
          : '',
        ``,
        `Full analytics in Mini App:`,
        this.config.miniAppUrl,
      ].filter(Boolean).join('\n'),
      keyboard: this.getAnalyticsKeyboard(userId),
    };
  }

  // ============================================================================
  // Agent Interaction Commands
  // ============================================================================

  async handleStartStrategy(userId: string, fundId: string): Promise<SuperAppCommandResult> {
    try {
      const fund = await this.startFund({ userId, fundId });
      return {
        success: true,
        message: [
          `✅ Strategy Started`,
          ``,
          `Fund: ${fund.name}`,
          `Strategy: ${fund.strategyName}`,
          `Capital: $${fund.capitalAllocated.toFixed(2)}`,
          `Status: Active`,
          ``,
          `Your fund is now running. Use /portfolio to monitor performance.`,
        ].join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handlePauseStrategy(
    userId: string,
    fundId: string,
    reason?: string
  ): Promise<SuperAppCommandResult> {
    try {
      const fund = await this.pauseFund({ userId, fundId, reason });
      return {
        success: true,
        message: [
          `⏸️ Strategy Paused`,
          ``,
          `Fund: ${fund.name}`,
          `Strategy: ${fund.strategyName}`,
          reason ? `Reason: ${reason}` : '',
          ``,
          `Use /start_strategy to resume trading.`,
        ].filter(Boolean).join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to pause strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handleAdjustAllocation(
    userId: string,
    fundId: string,
    amount: number
  ): Promise<SuperAppCommandResult> {
    try {
      const fund = await this.adjustAllocation({ userId, fundId, newCapital: amount });
      return {
        success: true,
        message: [
          `✅ Allocation Adjusted`,
          ``,
          `Fund: ${fund.name}`,
          `New Capital: $${fund.capitalAllocated.toFixed(2)}`,
          `Current Value: $${fund.performance.totalValue.toFixed(2)}`,
        ].join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to adjust allocation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handlePerformanceSummary(userId: string, fundId?: string): Promise<SuperAppCommandResult> {
    await this.updateUserActivity(userId);

    if (fundId) {
      const fund = this.funds.get(fundId);
      if (!fund || fund.userId !== userId) {
        return { success: false, message: 'Fund not found.' };
      }

      const pnlSign = fund.performance.totalPnl >= 0 ? '+' : '';
      return {
        success: true,
        message: [
          `📊 ${fund.name} Performance`,
          ``,
          `Strategy: ${fund.strategyName}`,
          `Risk: ${fund.riskLevel}`,
          `Status: ${fund.status}`,
          ``,
          `💰 Current Value: $${fund.performance.totalValue.toFixed(2)}`,
          `📈 Total P&L: ${pnlSign}$${fund.performance.totalPnl.toFixed(2)} (${pnlSign}${fund.performance.totalPnlPercent.toFixed(2)}%)`,
          `📅 Today: ${fund.performance.dailyPnl >= 0 ? '+' : ''}$${fund.performance.dailyPnl.toFixed(2)}`,
          `📅 This Week: ${fund.performance.weeklyPnl >= 0 ? '+' : ''}$${fund.performance.weeklyPnl.toFixed(2)}`,
          `📅 This Month: ${fund.performance.monthlyPnl >= 0 ? '+' : ''}$${fund.performance.monthlyPnl.toFixed(2)}`,
          fund.performance.sharpeRatio !== undefined
            ? `📊 Sharpe Ratio: ${fund.performance.sharpeRatio.toFixed(2)}`
            : '',
          fund.performance.winRate !== undefined
            ? `🎯 Win Rate: ${(fund.performance.winRate * 100).toFixed(1)}%`
            : '',
        ].filter(Boolean).join('\n'),
      };
    }

    const summary = await this.getPerformanceSummary(userId, '30d');
    return { success: true, message: summary };
  }

  // ============================================================================
  // Rebalance Events
  // ============================================================================

  async triggerRebalance(
    userId: string,
    fundId: string,
    reason: RebalanceEvent['triggeredBy']
  ): Promise<RebalanceEvent> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund not found: ${fundId}`);
    }
    if (fund.userId !== userId) {
      throw new Error('Unauthorized: fund does not belong to user');
    }

    const rebalanceEvent: RebalanceEvent = {
      fundId,
      fundName: fund.name,
      triggeredBy: reason,
      fromAllocation: {},
      toAllocation: {},
      estimatedCost: fund.capitalAllocated * 0.001, // 0.1% estimated cost
      scheduledAt: new Date(),
      status: 'scheduled',
    };

    const userHistory = this.rebalanceHistory.get(userId) ?? [];
    userHistory.push(rebalanceEvent);
    this.rebalanceHistory.set(userId, userHistory);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'superapp_rebalance_triggered',
      severity: 'info',
      source: 'telegram-superapp',
      userId,
      message: `Rebalance triggered for ${fund.name}: ${reason}`,
      data: { fundId, reason, estimatedCost: rebalanceEvent.estimatedCost },
    });

    return rebalanceEvent;
  }

  async getRebalanceHistory(userId: string, fundId?: string): Promise<RebalanceEvent[]> {
    const history = this.rebalanceHistory.get(userId) ?? [];
    if (fundId) {
      return history.filter((e) => e.fundId === fundId);
    }
    return history;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generatePortfolioRecommendations(
    funds: SuperAppFund[],
    riskScore: number,
    diversificationScore: number
  ): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    if (riskScore > 70) {
      recommendations.push({
        type: 'reduce_risk',
        priority: 'high',
        title: 'High Risk Portfolio',
        description: 'Your portfolio has high risk concentration. Consider adding conservative strategies.',
        suggestedAction: 'Browse conservative strategies in the marketplace',
      });
    }

    if (diversificationScore < 50 && funds.length > 1) {
      recommendations.push({
        type: 'diversify',
        priority: 'medium',
        title: 'Improve Diversification',
        description: 'Your funds use similar strategies. Diversify to reduce correlation risk.',
        suggestedAction: 'Explore different strategy categories',
      });
    }

    const underperformingFunds = funds.filter((f) => f.performance.totalPnlPercent < -10);
    for (const fund of underperformingFunds) {
      recommendations.push({
        type: 'stop_loss',
        priority: 'high',
        title: `Review ${fund.name}`,
        description: `This fund is down ${Math.abs(fund.performance.totalPnlPercent).toFixed(1)}%. Consider pausing or stopping it.`,
        fundId: fund.id,
        suggestedAction: 'Pause or close the underperforming fund',
      });
    }

    return recommendations;
  }

  private getMainMenuKeyboard(userId: string): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [
          { text: '💼 Portfolio', callbackData: `portfolio_${userId}` },
          { text: '📊 Analytics', callbackData: `analytics_${userId}` },
        ],
        [
          { text: '🏪 Strategies', callbackData: `strategies_${userId}` },
          { text: '➕ Create Fund', callbackData: `create_fund_${userId}` },
        ],
        [
          { text: '🚀 Open Mini App', webApp: { url: this.config.miniAppUrl } },
        ],
      ],
    };
  }

  private getOnboardingKeyboard(): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [{ text: '🚀 Open TONAIAgent App', webApp: { url: this.config.miniAppUrl } }],
        [
          { text: '📖 Browse Strategies', callbackData: 'strategies' },
          { text: '❓ Help', callbackData: 'help' },
        ],
      ],
    };
  }

  private getPortfolioEmptyKeyboard(): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [{ text: '🏪 Browse Strategies', callbackData: 'strategies' }],
        [{ text: '🚀 Open Mini App', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private getPortfolioKeyboard(_userId: string): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [
          { text: '📊 Analytics', callbackData: 'analytics' },
          { text: '⚠️ Risk Monitor', callbackData: 'risk' },
        ],
        [{ text: '🚀 Open Mini App', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private getStrategiesKeyboard(): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [
          { text: '🟢 Conservative', callbackData: 'strategies_conservative' },
          { text: '🟡 Moderate', callbackData: 'strategies_moderate' },
        ],
        [
          { text: '🟠 Aggressive', callbackData: 'strategies_aggressive' },
          { text: '🔴 Speculative', callbackData: 'strategies_speculative' },
        ],
        [{ text: '🚀 Open Marketplace', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private getConnectWalletKeyboard(): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [{ text: '👛 Connect Wallet', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private getCreateFundKeyboard(): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [{ text: '🏪 Browse Strategies', callbackData: 'strategies' }],
        [{ text: '➕ Create Fund', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private getAnalyticsKeyboard(_userId: string): SuperAppKeyboard {
    return {
      type: 'inline',
      buttons: [
        [
          { text: '24h', callbackData: 'perf_24h' },
          { text: '7d', callbackData: 'perf_7d' },
          { text: '30d', callbackData: 'perf_30d' },
        ],
        [{ text: '🚀 Full Analytics', webApp: { url: this.config.miniAppUrl } }],
      ],
    };
  }

  private initializeStrategies(): void {
    const defaultStrategies: SuperAppStrategy[] = [
      {
        id: 'strategy_ton_dca',
        name: 'TON DCA Strategy',
        description: 'Dollar-cost averaging into TON with weekly purchases',
        category: 'dca',
        riskLevel: 'conservative',
        minCapital: 50,
        expectedApr: 8,
        verified: true,
        totalAllocated: 125000,
        usersCount: 342,
        performance30d: 3.2,
        tags: ['ton', 'dca', 'low-risk'],
      },
      {
        id: 'strategy_defi_yield',
        name: 'DeFi Yield Optimizer',
        description: 'Automated yield farming across TON DeFi protocols',
        category: 'yield',
        riskLevel: 'moderate',
        minCapital: 100,
        expectedApr: 18,
        verified: true,
        totalAllocated: 890000,
        usersCount: 1247,
        performance30d: 5.8,
        tags: ['defi', 'yield', 'staking'],
      },
      {
        id: 'strategy_momentum',
        name: 'Momentum Trader',
        description: 'AI-powered momentum trading on TON ecosystem tokens',
        category: 'trading',
        riskLevel: 'aggressive',
        minCapital: 200,
        expectedApr: 35,
        verified: true,
        totalAllocated: 2100000,
        usersCount: 891,
        performance30d: 12.4,
        tags: ['trading', 'momentum', 'ai'],
      },
      {
        id: 'strategy_arb',
        name: 'TON Arbitrage',
        description: 'Cross-exchange arbitrage on TON and Ethereum bridges',
        category: 'arbitrage',
        riskLevel: 'moderate',
        minCapital: 500,
        expectedApr: 22,
        verified: true,
        totalAllocated: 4500000,
        usersCount: 156,
        performance30d: 7.1,
        tags: ['arbitrage', 'bridge', 'automated'],
      },
      {
        id: 'strategy_ton_index',
        name: 'TON Ecosystem Index',
        description: 'Diversified exposure to top TON ecosystem tokens',
        category: 'index',
        riskLevel: 'moderate',
        minCapital: 100,
        expectedApr: 15,
        verified: true,
        totalAllocated: 3200000,
        usersCount: 2134,
        performance30d: 4.9,
        tags: ['index', 'diversified', 'ecosystem'],
      },
    ];

    for (const strategy of defaultStrategies) {
      this.strategies.set(strategy.id, strategy);
    }
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

export function createTelegramSuperAppManager(
  config?: Partial<TelegramSuperAppConfig>
): DefaultTelegramSuperAppManager {
  return new DefaultTelegramSuperAppManager(config);
}

export default DefaultTelegramSuperAppManager;
