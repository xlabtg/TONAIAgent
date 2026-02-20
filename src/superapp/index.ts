/**
 * TONAIAgent - Super App Module
 *
 * The "WeChat of autonomous finance" - a comprehensive TON-native Super App
 * combining wallet, AI agents, marketplace, social layer, and financial infrastructure.
 *
 * Features:
 * - Smart Wallet with MPC recovery and agent integration
 * - Agent Dashboard for monitoring and automation
 * - Social Layer with profiles, leaderboards, and discussions
 * - Financial Dashboard with portfolio, risk, and analytics
 * - Notifications and real-time alerts
 * - Telegram Mini App integration
 * - Gamification and growth mechanisms
 * - Embedded AI Assistant powered by Groq
 * - Premium subscriptions and monetization
 *
 * @example
 * ```typescript
 * import { createSuperAppService } from '@tonaiagent/core/superapp';
 *
 * const superApp = createSuperAppService({
 *   telegram: { miniAppUrl: 'https://t.me/TONAIAgentBot/app' },
 *   gamification: { enabled: true },
 * });
 *
 * // Create a wallet
 * const wallet = await superApp.wallet.create({
 *   userId: 'user_123',
 *   type: 'smart_contract',
 *   name: 'My TON Wallet',
 * });
 *
 * // Deploy an agent
 * const agent = await superApp.agentDashboard.createAgent({
 *   userId: 'user_123',
 *   name: 'My Yield Agent',
 *   description: 'Automated yield farming',
 *   strategyId: 'strategy_456',
 *   strategyName: 'DeFi Yield Optimizer',
 *   capitalAllocated: 1000,
 * });
 *
 * // Start AI assistant session
 * const session = await superApp.aiAssistant.createSession({
 *   userId: 'user_123',
 * });
 *
 * // Send message to AI
 * const response = await superApp.aiAssistant.sendMessage({
 *   sessionId: session.sessionId,
 *   content: 'Analyze my portfolio',
 * });
 * ```
 */

// Export all types
export * from './types';

// Export Wallet Manager
export {
  DefaultWalletManager,
  createWalletManager,
  type WalletManager,
  type WalletManagerConfig,
  type CreateWalletInput,
  type TransferInput,
  type ConnectAgentInput,
  type AddGuardianInput,
  type CreateDelegationRuleInput,
  type CreateAutomatedTransferInput,
} from './wallet';

// Export Agent Dashboard Manager
export {
  DefaultAgentDashboardManager,
  createAgentDashboardManager,
  type AgentDashboardManager,
  type AgentDashboardConfig,
  type CreateAgentInput,
  type UpdateAgentInput,
  type CreateAutomationInput,
  type CreateAlertInput,
} from './agent-dashboard';

// Export Social Manager
export {
  DefaultSocialManager,
  createSocialManager,
  type SocialManager,
  type SocialConfig,
  type CreateProfileInput,
  type UpdateProfileInput,
  type CreateFeedItemInput,
  type CreateDiscussionInput,
  type CreateCommentInput,
  type DiscussionFilter,
} from './social';

// Export Financial Dashboard Manager
export {
  DefaultFinancialDashboardManager,
  createFinancialDashboardManager,
  type FinancialDashboardManager,
  type FinancialDashboardConfig,
} from './financial-dashboard';

// Export Notification Manager
export {
  DefaultNotificationManager,
  createNotificationManager,
  type NotificationManager,
  type NotificationsConfig,
  type CreateNotificationInput,
  type UpdateSettingsInput,
  type GetNotificationsOptions,
  type TradeNotificationData,
  type RiskAlertData,
  type PerformanceNotificationData,
  type AgentStatusData,
} from './notifications';

// Export Telegram Manager
export {
  DefaultTelegramManager,
  createTelegramManager,
  type TelegramManager,
  type TelegramConfig,
  type LinkTelegramInput,
  type InitMiniAppInput,
  type SendMessageInput,
  type InlineKeyboard,
  type InlineKeyboardButton,
  type ReplyKeyboard,
  type KeyboardButton,
  type CommandContext,
  type CommandHandler,
} from './telegram';

// Export Gamification Manager
export {
  DefaultGamificationManager,
  createGamificationManager,
  type GamificationManager,
  type GamificationConfig,
  type CreateAchievementInput,
  type AchievementCondition,
  type CreateChallengeInput,
  type AddExperienceInput,
  type CreateReferralInput,
} from './gamification';

// Export AI Assistant Manager
export {
  DefaultAIAssistantManager,
  createAIAssistantManager,
  type AIAssistantManager,
  type AIAssistantConfig,
  type CreateSessionInput,
  type SendMessageInput as AIMessageInput,
  type AnalyzePortfolioInput,
  type PortfolioData,
  type SuggestStrategyInput,
} from './ai-assistant';

// Export Monetization Manager
export {
  DefaultSuperAppMonetizationManager,
  createSuperAppMonetizationManager,
  type SuperAppMonetizationManager,
  type SuperAppMonetizationConfig,
  type TierConfig,
  type CreateSubscriptionInput,
  type UpgradeSubscriptionInput,
  type PurchaseFeatureInput,
  type BillingRecord,
  type PaymentResult,
  type RefundResult,
} from './monetization';

// ============================================================================
// Super App Service - Unified Entry Point
// ============================================================================

import type {
  SuperAppConfig,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

import { DefaultWalletManager, createWalletManager, WalletManagerConfig } from './wallet';
import { DefaultAgentDashboardManager, createAgentDashboardManager, AgentDashboardConfig } from './agent-dashboard';
import { DefaultSocialManager, createSocialManager, SocialConfig } from './social';
import { DefaultFinancialDashboardManager, createFinancialDashboardManager, FinancialDashboardConfig } from './financial-dashboard';
import { DefaultNotificationManager, createNotificationManager, NotificationsConfig } from './notifications';
import { DefaultTelegramManager, createTelegramManager, TelegramConfig } from './telegram';
import { DefaultGamificationManager, createGamificationManager, GamificationConfig } from './gamification';
import { DefaultAIAssistantManager, createAIAssistantManager, AIAssistantConfig } from './ai-assistant';
import { DefaultSuperAppMonetizationManager, createSuperAppMonetizationManager, SuperAppMonetizationConfig } from './monetization';

export interface SuperAppService {
  readonly enabled: boolean;
  readonly wallet: DefaultWalletManager;
  readonly agentDashboard: DefaultAgentDashboardManager;
  readonly social: DefaultSocialManager;
  readonly financial: DefaultFinancialDashboardManager;
  readonly notifications: DefaultNotificationManager;
  readonly telegram: DefaultTelegramManager;
  readonly gamification: DefaultGamificationManager;
  readonly aiAssistant: DefaultAIAssistantManager;
  readonly monetization: DefaultSuperAppMonetizationManager;

  // Health check
  getHealth(): Promise<SuperAppHealth>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

export interface SuperAppHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    wallet: boolean;
    agentDashboard: boolean;
    social: boolean;
    financial: boolean;
    notifications: boolean;
    telegram: boolean;
    gamification: boolean;
    aiAssistant: boolean;
    monetization: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export class DefaultSuperAppService implements SuperAppService {
  readonly enabled: boolean;
  readonly wallet: DefaultWalletManager;
  readonly agentDashboard: DefaultAgentDashboardManager;
  readonly social: DefaultSocialManager;
  readonly financial: DefaultFinancialDashboardManager;
  readonly notifications: DefaultNotificationManager;
  readonly telegram: DefaultTelegramManager;
  readonly gamification: DefaultGamificationManager;
  readonly aiAssistant: DefaultAIAssistantManager;
  readonly monetization: DefaultSuperAppMonetizationManager;

  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<SuperAppConfig> = {}) {
    this.enabled = config.enabled ?? true;

    // Initialize wallet manager
    const walletConfig: Partial<WalletManagerConfig> = {
      supportedAssets: config.wallet?.supportedAssets,
      supportedProtocols: config.wallet?.supportedProtocols,
      defaultSecurityLevel: config.wallet?.defaultSecurityLevel,
      defaultTransactionLimits: config.wallet?.transactionLimits,
    };
    this.wallet = createWalletManager(walletConfig);

    // Initialize agent dashboard manager
    const agentConfig: Partial<AgentDashboardConfig> = {
      maxAgentsPerUser: config.agentDashboard?.maxAgentsPerUser,
      maxAutomationsPerUser: config.agentDashboard?.maxAutomationsPerUser,
    };
    this.agentDashboard = createAgentDashboardManager(agentConfig);

    // Initialize social manager
    const socialConfig: Partial<SocialConfig> = {
      profilesEnabled: config.social?.profilesEnabled,
      feedEnabled: config.social?.feedEnabled,
      discussionsEnabled: config.social?.discussionsEnabled,
      leaderboardsEnabled: config.social?.leaderboardsEnabled,
      maxFollowersPerUser: config.social?.maxFollowersPerUser,
    };
    this.social = createSocialManager(socialConfig);

    // Initialize financial dashboard manager
    const financialConfig: Partial<FinancialDashboardConfig> = {
      baseCurrency: config.financial?.baseCurrency,
      supportedCurrencies: config.financial?.supportedCurrencies,
      priceUpdateIntervalMs: config.financial?.priceUpdateIntervalMs,
    };
    this.financial = createFinancialDashboardManager(financialConfig);

    // Initialize notification manager
    const notificationsConfig: Partial<NotificationsConfig> = {
      defaultChannels: config.notifications?.channels,
      defaultCategories: config.notifications?.defaultCategories,
      rateLimitPerMinute: config.notifications?.rateLimitPerMinute,
    };
    this.notifications = createNotificationManager(notificationsConfig);

    // Initialize telegram manager
    const telegramConfig: Partial<TelegramConfig> = {
      botToken: config.telegram?.botToken,
      miniAppUrl: config.telegram?.miniAppUrl,
      webhookUrl: config.telegram?.webhookUrl,
      commands: config.telegram?.commands,
    };
    this.telegram = createTelegramManager(telegramConfig);

    // Initialize gamification manager
    const gamificationConfig: Partial<GamificationConfig> = {
      enabled: config.gamification?.enabled,
      experienceMultiplier: config.gamification?.experienceMultiplier,
      referralBonusPercent: config.gamification?.referralBonusPercent,
      maxDailyChallenges: config.gamification?.maxDailyChallenges,
      streakBonusEnabled: config.gamification?.streakBonusEnabled,
    };
    this.gamification = createGamificationManager(gamificationConfig);

    // Initialize AI assistant manager
    const aiConfig: Partial<AIAssistantConfig> = {
      enabled: config.aiAssistant?.enabled,
      defaultProvider: config.aiAssistant?.defaultProvider,
      maxConversationHistory: config.aiAssistant?.maxConversationHistory,
      capabilities: config.aiAssistant?.capabilities,
      autoSuggestionsEnabled: config.aiAssistant?.autoSuggestionsEnabled,
    };
    this.aiAssistant = createAIAssistantManager(aiConfig);

    // Initialize monetization manager
    const monetizationConfig: Partial<SuperAppMonetizationConfig> = {
      subscriptionsEnabled: config.monetization?.subscriptionsEnabled,
      freeTrialDays: config.monetization?.freeTrialDays,
    };
    this.monetization = createSuperAppMonetizationManager(monetizationConfig);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<SuperAppHealth> {
    const components = {
      wallet: true,
      agentDashboard: true,
      social: true,
      financial: true,
      notifications: true,
      telegram: true,
      gamification: true,
      aiAssistant: true,
      monetization: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: SuperAppHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      lastCheck: new Date(),
      details: {
        enabled: this.enabled,
      },
    };
  }

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: SuperAppEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.wallet.onEvent(forwardEvent);
    this.agentDashboard.onEvent(forwardEvent);
    this.social.onEvent(forwardEvent);
    this.financial.onEvent(forwardEvent);
    this.notifications.onEvent(forwardEvent);
    this.telegram.onEvent(forwardEvent);
    this.gamification.onEvent(forwardEvent);
    this.aiAssistant.onEvent(forwardEvent);
    this.monetization.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSuperAppService(
  config?: Partial<SuperAppConfig>
): DefaultSuperAppService {
  return new DefaultSuperAppService(config);
}

// Default export
export default DefaultSuperAppService;
