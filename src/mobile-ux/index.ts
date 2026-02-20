/**
 * TONAIAgent - Telegram-Native Mobile-First UX Module
 *
 * A comprehensive mobile-first user experience that makes autonomous finance
 * accessible to mainstream users on Telegram.
 *
 * Features:
 * - Ultra-simple onboarding (under 2 minutes)
 * - Conversational AI interface powered by Groq
 * - Telegram Mini App with dashboards and analytics
 * - Visual no-code strategy builder for mobile
 * - Real-time notifications and alerts
 * - Mobile-optimized performance
 * - Personalization for beginner to institutional users
 * - Multi-language support and accessibility
 * - Security UX with biometrics and anti-phishing
 *
 * @example
 * ```typescript
 * import {
 *   createMobileUXManager,
 *   MobileUXManagerConfig,
 * } from '@tonaiagent/core/mobile-ux';
 *
 * // Create the Mobile UX manager
 * const mobileUX = createMobileUXManager({
 *   onboarding: { aiAssisted: true },
 *   conversation: { provider: 'groq' },
 *   localization: { defaultLanguage: 'en' },
 * });
 *
 * // Initialize with Telegram data
 * await mobileUX.initialize(telegramInitData);
 *
 * // Start onboarding for new user
 * const progress = await mobileUX.onboarding.startOnboarding(
 *   telegramUserId,
 *   telegramInitData
 * );
 *
 * // Send a chat message
 * const response = await mobileUX.conversation.sendMessage(
 *   conversationId,
 *   'Create a yield strategy with low risk'
 * );
 *
 * // Navigate in Mini App
 * mobileUX.miniApp.navigate('portfolio');
 *
 * // Get personalized UI
 * const ui = mobileUX.personalization.getPersonalizedUI(userId);
 * ```
 */

// Export all types
export * from './types';

// Export onboarding
export {
  OnboardingManager,
  createOnboardingManager,
  getDefaultFlows,
  type OnboardingManagerConfig,
  type OnboardingStepHandler,
  type OnboardingStepResult,
  type OnboardingProgress,
  type WalletCreationResult,
  type OnboardingCompletionResult,
  type TelegramInitData,
  type AIGuidance,
  type OnboardingAnalytics,
} from './onboarding';

// Export conversation
export {
  ConversationManager,
  createConversationManager,
  getDefaultConversationConfig,
  type ConversationConfig,
  type AIResponse,
  type CommandRequest,
  type CommandResult,
  type CommandHandler,
} from './conversation';

// Export mini app
export {
  MiniAppManager,
  createMiniAppManager,
  getDefaultPages,
  getDefaultTheme,
  type MiniAppManagerConfig,
  type ThemeConfig,
  type NavigationState,
  type ModalContent,
  type PageRenderResult,
  type RenderedComponent,
  type PageMetadata,
  type HeaderAction,
  type NavigationItem,
  type ActionSheetOptions,
  type ActionSheetOption,
  type PopupParams,
  type PopupButton,
  type EventHandler,
  type TelegramWebAppInitData,
  type TelegramThemeParams,
  type InitializationResult,
} from './mini-app';

// Export visual control
export {
  VisualControlManager,
  createVisualControlManager,
  getAllTemplates,
  type VisualControlConfig,
  type TriggerTemplate,
  type TriggerConfig,
  type ConditionTemplate,
  type ConditionConfig,
  type ActionTemplate,
  type ActionConfig,
  type ParamDefinition,
  type ParamValidation,
  type WorkflowValidation,
  type ValidationError,
  type ValidationWarning,
  type RiskLevelDescription,
} from './visual-control';

// Export notifications
export {
  NotificationManager,
  ToastManager,
  createNotificationManager,
  createToastManager,
  type NotificationConfig,
  type PriceAlert,
  type PortfolioAlert,
  type RealTimeUpdate,
  type NotificationHandlers,
  type ToastConfig,
  type Toast,
} from './notifications';

// Export performance
export {
  PerformanceManager,
  createPerformanceManager,
  getDefaultPerformanceConfig,
  type PerformanceManagerConfig,
  type ImageOptimizationConfig,
  type NetworkOptimizationConfig,
  type AnimationSettings,
  type MemoryManagementConfig,
  type OfflineSettings,
  type PerformanceSnapshot,
  type NetworkStatus,
  type MemoryStatus,
  type ResourcePriority,
  type RequestOptions,
  type ImageOptions,
  type AnimationConfig,
  type OfflineStatus,
  type SyncResult,
  type PerformanceWarning,
} from './performance';

// Export personalization
export {
  PersonalizationManager,
  createPersonalizationManager,
  getLevelConfig,
  type PersonalizationConfig,
  type UserBehavior,
  type Recommendation,
  type PersonalizedUI,
  type QuickAction,
  type LevelProgress,
  type LevelRequirement,
} from './personalization';

// Export accessibility
export {
  AccessibilityManager,
  createAccessibilityManager,
  getAllSupportedLanguages,
  getAllSupportedCurrencies,
  type AccessibilityManagerConfig,
  type LowTechOptimizations,
  type MarketSettings,
} from './accessibility';

// Export security UX
export {
  SecurityUXManager,
  createSecurityUXManager,
  getDefaultSecurityConfig,
  type SecurityUXConfig,
  type TransactionContext,
  type RiskAssessment,
  type TriggeredRiskFactor,
  type ConfirmationResult,
  type AuthenticationResult,
  type SecuritySession,
  type PhishingCheckResult,
  type SecurityTip,
} from './security-ux';

// ============================================================================
// Unified Mobile UX Manager
// ============================================================================

import { OnboardingManager, OnboardingManagerConfig } from './onboarding';
import { ConversationManager, ConversationConfig } from './conversation';
import { MiniAppManager, MiniAppManagerConfig, TelegramWebAppInitData } from './mini-app';
import { VisualControlManager, VisualControlConfig } from './visual-control';
import { NotificationManager, NotificationConfig, ToastManager } from './notifications';
import { PerformanceManager, PerformanceManagerConfig } from './performance';
import { PersonalizationManager, PersonalizationConfig } from './personalization';
import { AccessibilityManager, AccessibilityManagerConfig } from './accessibility';
import { SecurityUXManager, SecurityUXConfig } from './security-ux';
import { UserProfile, DeviceInfo } from './types';

/**
 * Unified Mobile UX Manager Configuration
 */
export interface MobileUXManagerConfig {
  /** Onboarding configuration */
  onboarding?: Partial<OnboardingManagerConfig>;
  /** Conversation AI configuration */
  conversation?: Partial<ConversationConfig>;
  /** Mini App configuration */
  miniApp?: Partial<MiniAppManagerConfig>;
  /** Visual control configuration */
  visualControl?: Partial<VisualControlConfig>;
  /** Notification configuration */
  notifications?: Partial<NotificationConfig>;
  /** Performance configuration */
  performance?: Partial<PerformanceManagerConfig>;
  /** Personalization configuration */
  personalization?: Partial<PersonalizationConfig>;
  /** Accessibility configuration */
  accessibility?: Partial<AccessibilityManagerConfig>;
  /** Security UX configuration */
  security?: Partial<SecurityUXConfig>;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Initialization result
 */
export interface MobileUXInitResult {
  /** Success status */
  success: boolean;
  /** Device info */
  device?: DeviceInfo;
  /** Detected language */
  language: string;
  /** User needs onboarding */
  needsOnboarding: boolean;
  /** Error message */
  error?: string;
  /** Initialization time (ms) */
  initTime: number;
}

/**
 * Unified Mobile UX Manager
 *
 * Provides a single entry point for all mobile UX features.
 */
export class MobileUXManager {
  /** Onboarding manager */
  readonly onboarding: OnboardingManager;
  /** Conversation manager */
  readonly conversation: ConversationManager;
  /** Mini App manager */
  readonly miniApp: MiniAppManager;
  /** Visual control manager */
  readonly visualControl: VisualControlManager;
  /** Notification manager */
  readonly notifications: NotificationManager;
  /** Toast manager */
  readonly toast: ToastManager;
  /** Performance manager */
  readonly performance: PerformanceManager;
  /** Personalization manager */
  readonly personalization: PersonalizationManager;
  /** Accessibility manager */
  readonly accessibility: AccessibilityManager;
  /** Security UX manager */
  readonly security: SecurityUXManager;

  private currentUser?: UserProfile;
  private device?: DeviceInfo;
  private initialized: boolean = false;

  constructor(config: MobileUXManagerConfig = {}) {

    // Initialize all managers
    this.onboarding = new OnboardingManager(config.onboarding);
    this.conversation = new ConversationManager(config.conversation);
    this.miniApp = new MiniAppManager(config.miniApp);
    this.visualControl = new VisualControlManager(config.visualControl);
    this.notifications = new NotificationManager(config.notifications);
    this.toast = new ToastManager();
    this.performance = new PerformanceManager(config.performance);
    this.personalization = new PersonalizationManager(config.personalization);
    this.accessibility = new AccessibilityManager(config.accessibility);
    this.security = new SecurityUXManager(config.security);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the Mobile UX Manager
   */
  async initialize(initData: TelegramWebAppInitData): Promise<MobileUXInitResult> {
    const startTime = Date.now();

    try {
      // Initialize Mini App first (gets device info)
      const miniAppResult = await this.miniApp.initialize(initData);

      if (!miniAppResult.success) {
        return {
          success: false,
          language: 'en',
          needsOnboarding: true,
          error: miniAppResult.error,
          initTime: Date.now() - startTime,
        };
      }

      this.device = miniAppResult.device;

      // Detect and set language
      const detectedLanguage = this.accessibility.detectLanguage(
        initData.user?.language_code
      );
      this.accessibility.setLanguage(detectedLanguage);

      // Initialize performance manager with device info
      this.performance.initialize(this.device);

      // Check if user needs onboarding
      const userId = initData.user?.id ?? '';
      const needsOnboarding = !this.onboarding.getProgress(userId);

      this.initialized = true;

      return {
        success: true,
        device: this.device,
        language: detectedLanguage,
        needsOnboarding,
        initTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        language: 'en',
        needsOnboarding: true,
        error: (error as Error).message,
        initTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Set current user after onboarding/authentication
   */
  setUser(user: UserProfile): void {
    this.currentUser = user;

    // Update all managers with user
    this.miniApp.setUser(user);
    this.personalization.setUserProfile(user);
    this.notifications.initialize(user);
    this.security.initialize(user);

    // Start conversation
    this.conversation.getOrCreateConversation(user.telegramId, user);
  }

  /**
   * Get current user
   */
  getUser(): UserProfile | undefined {
    return this.currentUser;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ============================================================================
  // Quick Actions
  // ============================================================================

  /**
   * Send a chat message and get AI response
   */
  async chat(message: string): Promise<{
    text: string;
    quickReplies?: Array<{ text: string; payload: string }>;
  }> {
    if (!this.currentUser) {
      throw new Error('User not set');
    }

    const conversationId = this.conversation.getOrCreateConversation(
      this.currentUser.telegramId,
      this.currentUser
    );

    const response = await this.conversation.sendMessage(conversationId, message);

    return {
      text: response.text,
      quickReplies: response.quickReplies?.map((qr) => ({
        text: qr.text,
        payload: qr.payload,
      })),
    };
  }

  /**
   * Navigate to a page
   */
  navigate(pageId: string): boolean {
    return this.miniApp.navigate(pageId);
  }

  /**
   * Show a notification
   */
  notify(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ): void {
    switch (type) {
      case 'success':
        this.toast.success(message);
        break;
      case 'error':
        this.toast.error(message);
        break;
      case 'warning':
        this.toast.warning(message);
        break;
      case 'info':
        this.toast.info(message);
        break;
    }
  }

  /**
   * Translate a key
   */
  t(key: string, params?: Record<string, string | number>): string {
    return this.accessibility.t(key, params);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, currency?: string): string {
    return this.accessibility.formatCurrency(value, currency);
  }

  /**
   * Get personalized quick actions
   */
  getQuickActions(): Array<{ id: string; label: string; icon: string }> {
    if (!this.currentUser) {
      return [];
    }

    const ui = this.personalization.getPersonalizedUI(this.currentUser.telegramId);
    return ui.quickActions.map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
    }));
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.notifications.stop();
    this.performance.stop();

    if (this.currentUser) {
      this.security.endAllSessions(this.currentUser.telegramId);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Mobile UX Manager with default configuration
 */
export function createMobileUXManager(
  config?: MobileUXManagerConfig
): MobileUXManager {
  return new MobileUXManager(config);
}

// Default export
export default MobileUXManager;
