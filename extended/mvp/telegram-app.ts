/**
 * TONAIAgent - Telegram Mini App MVP Service
 *
 * Primary interface for the MVP - a Telegram-native Mini App with
 * fast onboarding, wallet management, and agent deployment.
 */

import type {
  TelegramAppConfig,
  TelegramUser,
  UserWallet,
  UserPortfolio,
  CreateAgentInput,
  UserAgent,
  AgentPerformance,
  RiskLevel,
  JettonBalance,
  AssetAllocation,
  AgentGoal,
  MVPEvent,
  MVPEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default Telegram App configuration
 */
export const defaultTelegramAppConfig: TelegramAppConfig = {
  fastOnboarding: true,
  mobileFirst: true,
  nonCustodial: true,
  aiAssisted: true,
};

// ============================================================================
// Telegram Mini App Manager
// ============================================================================

/**
 * Telegram Mini App Manager for MVP
 *
 * Provides the primary interface for users interacting with TON AI Agent
 * through Telegram.
 */
export class TelegramMiniAppManager {
  readonly config: TelegramAppConfig;

  private readonly users: Map<string, TelegramUser> = new Map();
  private readonly wallets: Map<string, UserWallet> = new Map();
  private readonly portfolios: Map<string, UserPortfolio> = new Map();
  private readonly agents: Map<string, UserAgent> = new Map();
  private readonly eventCallbacks: MVPEventCallback[] = [];

  constructor(config: Partial<TelegramAppConfig> = {}) {
    this.config = {
      ...defaultTelegramAppConfig,
      ...config,
    };
  }

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Register or get existing user from Telegram init data
   */
  async registerUser(initData: TelegramInitData): Promise<TelegramUser> {
    const existingUser = this.users.get(initData.user.id);
    if (existingUser) {
      existingUser.lastActiveAt = new Date();
      return existingUser;
    }

    const user: TelegramUser = {
      telegramId: initData.user.id,
      username: initData.user.username,
      firstName: initData.user.first_name,
      lastName: initData.user.last_name,
      languageCode: initData.user.language_code ?? 'en',
      photoUrl: initData.user.photo_url,
      isPremium: initData.user.is_premium ?? false,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.users.set(user.telegramId, user);

    this.emitEvent({
      type: 'user_registered',
      timestamp: new Date(),
      userId: user.telegramId,
      data: {
        username: user.username,
        languageCode: user.languageCode,
        isPremium: user.isPremium,
      },
    });

    return user;
  }

  /**
   * Get user by Telegram ID
   */
  getUser(telegramId: string): TelegramUser | undefined {
    return this.users.get(telegramId);
  }

  /**
   * Update user activity timestamp
   */
  updateActivity(telegramId: string): void {
    const user = this.users.get(telegramId);
    if (user) {
      user.lastActiveAt = new Date();
    }
  }

  // ============================================================================
  // Wallet Management
  // ============================================================================

  /**
   * Create a new wallet for user
   */
  async createWallet(
    userId: string,
    type: 'ton_connect' | 'mpc' | 'smart_contract' = 'mpc'
  ): Promise<UserWallet> {
    const walletId = `wallet_${userId}_${Date.now()}`;

    // Generate wallet address (simulated for MVP)
    const address = this.generateWalletAddress();

    const wallet: UserWallet = {
      id: walletId,
      userId,
      address,
      type,
      balanceTon: 0,
      balanceUsd: 0,
      jettons: [],
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      type: 'wallet_created',
      timestamp: new Date(),
      userId,
      data: {
        walletId,
        address,
        type,
      },
    });

    return wallet;
  }

  /**
   * Connect existing TON wallet
   */
  async connectWallet(
    userId: string,
    address: string,
    proof?: WalletProof
  ): Promise<UserWallet> {
    // Validate wallet ownership via proof (simplified for MVP)
    if (proof && !this.validateWalletProof(proof)) {
      throw new Error('Invalid wallet proof');
    }

    const walletId = `wallet_${userId}_${Date.now()}`;

    const wallet: UserWallet = {
      id: walletId,
      userId,
      address,
      type: 'ton_connect',
      balanceTon: 0, // Will be fetched from blockchain
      balanceUsd: 0,
      jettons: [],
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      type: 'wallet_connected',
      timestamp: new Date(),
      userId,
      data: {
        walletId,
        address,
      },
    });

    return wallet;
  }

  /**
   * Get user wallets
   */
  getUserWallets(userId: string): UserWallet[] {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  /**
   * Get wallet by ID
   */
  getWallet(walletId: string): UserWallet | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * Refresh wallet balance
   */
  async refreshWalletBalance(walletId: string): Promise<UserWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // In production, this would fetch from TON blockchain
    // For MVP, we simulate balance updates
    const tonPrice = await this.getTonPrice();
    wallet.balanceUsd = wallet.balanceTon * tonPrice;

    return wallet;
  }

  /**
   * Add jetton balance (for demo/testing)
   */
  addJettonBalance(walletId: string, jetton: JettonBalance): void {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      const existingIndex = wallet.jettons.findIndex(
        (j) => j.symbol === jetton.symbol
      );
      if (existingIndex >= 0) {
        wallet.jettons[existingIndex] = jetton;
      } else {
        wallet.jettons.push(jetton);
      }
    }
  }

  // ============================================================================
  // Portfolio Management
  // ============================================================================

  /**
   * Get or create user portfolio
   */
  getPortfolio(userId: string): UserPortfolio {
    let portfolio = this.portfolios.get(userId);
    if (!portfolio) {
      portfolio = this.createEmptyPortfolio(userId);
      this.portfolios.set(userId, portfolio);
    }
    return portfolio;
  }

  /**
   * Recalculate portfolio metrics
   */
  async recalculatePortfolio(userId: string): Promise<UserPortfolio> {
    const wallets = this.getUserWallets(userId);
    const agents = this.getUserAgents(userId);

    let totalValueUsd = 0;
    let totalValueTon = 0;
    const allocation: AssetAllocation[] = [];

    // Sum wallet balances
    for (const wallet of wallets) {
      totalValueUsd += wallet.balanceUsd;
      totalValueTon += wallet.balanceTon;

      if (wallet.balanceTon > 0) {
        allocation.push({
          symbol: 'TON',
          name: 'Toncoin',
          percentage: 0, // Calculated after
          valueUsd: wallet.balanceUsd,
        });
      }

      for (const jetton of wallet.jettons) {
        totalValueUsd += jetton.valueUsd;
        allocation.push({
          symbol: jetton.symbol,
          name: jetton.name,
          percentage: 0,
          valueUsd: jetton.valueUsd,
        });
      }
    }

    // Add agent values
    for (const agent of agents) {
      if (agent.status === 'active') {
        totalValueUsd += agent.currentValue;
      }
    }

    // Calculate percentages
    for (const asset of allocation) {
      asset.percentage = totalValueUsd > 0 ? (asset.valueUsd / totalValueUsd) * 100 : 0;
    }

    // Calculate yield earned from agents
    const totalYieldEarned = agents.reduce(
      (sum, a) => sum + Math.max(0, a.pnl),
      0
    );

    // Calculate risk level
    const riskLevel = this.calculatePortfolioRisk(agents);

    const portfolio: UserPortfolio = {
      userId,
      totalValueUsd,
      totalValueTon,
      activeAgents: agents.filter((a) => a.status === 'active').length,
      totalYieldEarned,
      change24h: this.calculateChange(userId, '24h'),
      change7d: this.calculateChange(userId, '7d'),
      riskLevel,
      allocation,
      updatedAt: new Date(),
    };

    this.portfolios.set(userId, portfolio);
    return portfolio;
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Create a new agent
   */
  async createAgent(input: CreateAgentInput): Promise<UserAgent> {
    const agentId = `agent_${input.userId}_${Date.now()}`;

    const agent: UserAgent = {
      id: agentId,
      userId: input.userId,
      name: input.name,
      goal: input.goal,
      strategyId: input.strategyId,
      strategyName: this.getStrategyName(input.strategyId),
      status: 'pending',
      capitalAllocated: input.capital,
      currentValue: input.capital,
      pnl: 0,
      apy: 0,
      riskLevel: input.riskTolerance,
      createdAt: new Date(),
    };

    this.agents.set(agentId, agent);

    this.emitEvent({
      type: 'agent_created',
      timestamp: new Date(),
      userId: input.userId,
      agentId,
      strategyId: input.strategyId,
      data: {
        name: input.name,
        goal: input.goal,
        capital: input.capital,
        riskTolerance: input.riskTolerance,
      },
    });

    return agent;
  }

  /**
   * Activate an agent
   */
  async activateAgent(agentId: string): Promise<UserAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'pending' && agent.status !== 'paused') {
      throw new Error(`Cannot activate agent in ${agent.status} status`);
    }

    agent.status = 'active';
    agent.lastExecutionAt = new Date();

    this.emitEvent({
      type: 'agent_activated',
      timestamp: new Date(),
      userId: agent.userId,
      agentId,
      data: {
        name: agent.name,
        strategyId: agent.strategyId,
      },
    });

    return agent;
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string, reason?: string): Promise<UserAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'active') {
      throw new Error(`Cannot pause agent in ${agent.status} status`);
    }

    agent.status = 'paused';

    this.emitEvent({
      type: 'agent_paused',
      timestamp: new Date(),
      userId: agent.userId,
      agentId,
      data: {
        name: agent.name,
        reason,
      },
    });

    return agent;
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<UserAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    agent.status = 'stopped';

    this.emitEvent({
      type: 'agent_stopped',
      timestamp: new Date(),
      userId: agent.userId,
      agentId,
      data: {
        name: agent.name,
        finalPnl: agent.pnl,
      },
    });

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): UserAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents for user
   */
  getUserAgents(userId: string): UserAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.userId === userId);
  }

  /**
   * Get agent performance metrics
   */
  getAgentPerformance(agentId: string, period: '24h' | '7d' | '30d' | 'all'): AgentPerformance {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // In production, this would aggregate from actual trade history
    // For MVP, we return simulated metrics
    return {
      agentId,
      period,
      totalReturn: agent.pnl / agent.capitalAllocated * 100,
      winRate: 65, // Simulated
      totalTrades: Math.floor(Math.random() * 50) + 10,
      profitableTrades: Math.floor(Math.random() * 30) + 5,
      maxDrawdown: Math.random() * 10,
      sharpeRatio: 1.5 + Math.random(),
      avgTradeProfit: agent.pnl / 20,
    };
  }

  // ============================================================================
  // Quick Actions for Ultra-Simple Onboarding
  // ============================================================================

  /**
   * Quick deploy: Create wallet and agent in one step
   */
  async quickDeploy(
    telegramId: string,
    goal: AgentGoal,
    capital: number
  ): Promise<{ user: TelegramUser; wallet: UserWallet; agent: UserAgent }> {
    // Get or create user
    let user = this.users.get(telegramId);
    if (!user) {
      user = await this.registerUser({
        user: {
          id: telegramId,
          first_name: 'User',
        },
      } as TelegramInitData);
    }

    // Create wallet
    const wallet = await this.createWallet(telegramId, 'mpc');

    // Set initial balance for demo
    wallet.balanceTon = capital;
    wallet.balanceUsd = capital * (await this.getTonPrice());

    // Get recommended strategy for goal
    const strategyId = this.getRecommendedStrategy(goal);

    // Create agent
    const agent = await this.createAgent({
      userId: telegramId,
      name: `${goal} Agent`,
      goal,
      strategyId,
      capital,
      riskTolerance: 'medium',
      autoCompound: true,
    });

    // Auto-activate in quick deploy
    await this.activateAgent(agent.id);

    this.emitEvent({
      type: 'user_onboarded',
      timestamp: new Date(),
      userId: telegramId,
      agentId: agent.id,
      data: {
        method: 'quick_deploy',
        goal,
        capital,
      },
    });

    return { user, wallet, agent };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to events
   */
  onEvent(callback: MVPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: MVPEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Generate wallet address (simplified for MVP)
   */
  private generateWalletAddress(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let address = 'EQ';
    for (let i = 0; i < 46; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
  }

  /**
   * Validate wallet proof (simplified for MVP)
   */
  private validateWalletProof(_proof: WalletProof): boolean {
    // In production, validate cryptographic proof
    return true;
  }

  /**
   * Get current TON price (simplified for MVP)
   */
  private async getTonPrice(): Promise<number> {
    // In production, fetch from oracle/API
    return 5.5; // Simulated price
  }

  /**
   * Create empty portfolio
   */
  private createEmptyPortfolio(userId: string): UserPortfolio {
    return {
      userId,
      totalValueUsd: 0,
      totalValueTon: 0,
      activeAgents: 0,
      totalYieldEarned: 0,
      change24h: 0,
      change7d: 0,
      riskLevel: 'low',
      allocation: [],
      updatedAt: new Date(),
    };
  }

  /**
   * Calculate portfolio risk level
   */
  private calculatePortfolioRisk(agents: UserAgent[]): RiskLevel {
    if (agents.length === 0) return 'low';

    const riskScores: Record<RiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      very_high: 4,
    };

    const avgRisk = agents.reduce(
      (sum, a) => sum + riskScores[a.riskLevel],
      0
    ) / agents.length;

    if (avgRisk <= 1.5) return 'low';
    if (avgRisk <= 2.5) return 'medium';
    if (avgRisk <= 3.5) return 'high';
    return 'very_high';
  }

  /**
   * Calculate change percentage (simplified for MVP)
   */
  private calculateChange(_userId: string, _period: '24h' | '7d'): number {
    // In production, calculate from historical data
    return (Math.random() - 0.3) * 10; // Simulated change
  }

  /**
   * Get strategy name from ID (simplified for MVP)
   */
  private getStrategyName(strategyId: string): string {
    const strategies: Record<string, string> = {
      'dca_ton': 'Dollar Cost Averaging - TON',
      'yield_farming': 'DeFi Yield Optimizer',
      'liquidity': 'Liquidity Pool Manager',
      'rebalancing': 'Portfolio Rebalancer',
      'arbitrage': 'Cross-DEX Arbitrage',
    };
    return strategies[strategyId] ?? 'Custom Strategy';
  }

  /**
   * Get recommended strategy for goal
   */
  private getRecommendedStrategy(goal: AgentGoal): string {
    const strategies: Record<AgentGoal, string> = {
      passive_income: 'yield_farming',
      trading: 'arbitrage',
      dca: 'dca_ton',
      liquidity: 'liquidity',
      yield_farming: 'yield_farming',
      rebalancing: 'rebalancing',
      arbitrage: 'arbitrage',
    };
    return strategies[goal];
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Telegram Web App init data
 */
export interface TelegramInitData {
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  auth_date?: number;
  hash?: string;
  query_id?: string;
}

/**
 * Wallet ownership proof
 */
export interface WalletProof {
  /** Wallet address */
  address: string;
  /** Signature */
  signature: string;
  /** Signed message */
  message: string;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Telegram Mini App Manager
 */
export function createTelegramMiniAppManager(
  config?: Partial<TelegramAppConfig>
): TelegramMiniAppManager {
  return new TelegramMiniAppManager(config);
}
