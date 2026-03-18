/**
 * TONAIAgent - MVP Module
 *
 * MVP (Minimum Viable Product) module that integrates all components
 * required for launching TON AI Agent as a Telegram Mini App:
 *
 * - Telegram Mini App (Primary Interface)
 * - Strategy Marketplace
 * - Agent Ranking System
 * - Admin Dashboard
 * - Revenue & Monetization
 * - Growth Engine
 *
 * @example
 * ```typescript
 * import { createMVPService, MVPConfig } from '@tonaiagent/core/mvp';
 *
 * const config: Partial<MVPConfig> = {
 *   enabled: true,
 *   telegramApp: {
 *     fastOnboarding: true,
 *     aiAssisted: true,
 *   },
 *   marketplace: {
 *     copyTradingEnabled: true,
 *   },
 *   ranking: {
 *     useTelegramSignals: false, // Requires consent
 *   },
 * };
 *
 * const mvp = createMVPService(config);
 *
 * // Quick deploy: Create wallet and agent in one step
 * const { user, wallet, agent } = await mvp.telegramApp.quickDeploy(
 *   'telegram_user_123',
 *   'passive_income',
 *   1000
 * );
 *
 * // Browse strategy marketplace
 * const strategies = mvp.marketplace.listStrategies({
 *   category: 'yield_farming',
 *   minRating: 4.0,
 * });
 *
 * // Get agent rankings
 * const topAgents = mvp.ranking.getTopRankings(10);
 *
 * // Admin metrics
 * const metrics = mvp.admin.getSystemMetrics();
 * ```
 */

// Export all types
export * from './types';

// Export Telegram Mini App
export {
  TelegramMiniAppManager,
  createTelegramMiniAppManager,
  defaultTelegramAppConfig,
  type TelegramInitData,
  type WalletProof,
} from './telegram-app';

// Export Strategy Marketplace
export {
  StrategyMarketplaceManager,
  createStrategyMarketplaceManager,
  defaultMarketplaceConfig,
  type PublishStrategyInput,
  type StartCopyInput,
} from './strategy-marketplace';

// Export Agent Ranking
export {
  AgentRankingManager,
  createAgentRankingManager,
  defaultRankingConfig,
  type AgentDataForRanking,
  type RankingFilter,
  type RankingStats,
} from './agent-ranking';

// Export Admin Dashboard
export {
  AdminDashboardManager,
  createAdminDashboardManager,
  defaultAdminConfig,
  rolePermissions,
  type Admin,
  type CreateAdminInput,
  type CreateAlertInput,
  type BlockedEntity,
  type AuditEntry,
  type AuditLogFilter,
} from './admin-dashboard';

// Export Revenue
export {
  RevenueManager,
  createRevenueManager,
  defaultRevenueConfig,
  premiumTiers,
  type PremiumTierConfig,
  type FeeRecord,
  type RecordFeeInput,
  type CreatorBalance,
  type Payout,
  type SubscriptionLimits,
  type RevenueAccumulator,
} from './revenue';

// ============================================================================
// MVP Service - Unified Entry Point
// ============================================================================

import type {
  MVPConfig,
  MVPEvent,
  MVPEventCallback,
  MVPHealth,
  UserConsent,
  ReferralInfo,
} from './types';

import { TelegramMiniAppManager, defaultTelegramAppConfig } from './telegram-app';
import { StrategyMarketplaceManager, defaultMarketplaceConfig } from './strategy-marketplace';
import { AgentRankingManager, defaultRankingConfig } from './agent-ranking';
import { AdminDashboardManager, defaultAdminConfig } from './admin-dashboard';
import { RevenueManager, defaultRevenueConfig } from './revenue';

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default MVP configuration
 */
export const defaultMVPConfig: MVPConfig = {
  enabled: true,
  telegramApp: defaultTelegramAppConfig,
  marketplace: defaultMarketplaceConfig,
  ranking: defaultRankingConfig,
  admin: defaultAdminConfig,
  revenue: defaultRevenueConfig,
  growth: {
    enabled: true,
    referralsEnabled: true,
    referralCommission: 10,
    maxReferralLevels: 3,
    strategySharing: true,
    socialTrading: true,
    gamification: true,
  },
  privacy: {
    requireConsent: true,
    requirePerformanceConsent: true,
    dataRetentionDays: 365,
    allowAnonymous: false,
  },
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ru', 'zh'],
    autoDetect: true,
    fallbackLanguage: 'en',
  },
};

// ============================================================================
// MVP Service Interface
// ============================================================================

/**
 * MVP Service Interface
 */
export interface MVPService {
  /** Whether MVP features are enabled */
  readonly enabled: boolean;
  /** Telegram Mini App manager */
  readonly telegramApp: TelegramMiniAppManager;
  /** Strategy Marketplace manager */
  readonly marketplace: StrategyMarketplaceManager;
  /** Agent Ranking manager */
  readonly ranking: AgentRankingManager;
  /** Admin Dashboard manager */
  readonly admin: AdminDashboardManager;
  /** Revenue manager */
  readonly revenue: RevenueManager;

  /** Get service health */
  getHealth(): Promise<MVPHealth>;

  /** Subscribe to events */
  onEvent(callback: MVPEventCallback): void;

  // Growth features
  createReferralCode(userId: string): Promise<string>;
  getReferralInfo(userId: string): ReferralInfo;
  activateReferral(referrerId: string, newUserId: string): Promise<void>;

  // Privacy features
  recordConsent(userId: string, consent: Partial<UserConsent>): void;
  getConsent(userId: string): UserConsent | undefined;
  hasConsent(userId: string, type: keyof UserConsent): boolean;

  // Localization
  setUserLanguage(userId: string, language: string): void;
  getUserLanguage(userId: string): string;
}

// ============================================================================
// MVP Service Implementation
// ============================================================================

/**
 * Default MVP Service Implementation
 */
export class DefaultMVPService implements MVPService {
  readonly enabled: boolean;
  readonly telegramApp: TelegramMiniAppManager;
  readonly marketplace: StrategyMarketplaceManager;
  readonly ranking: AgentRankingManager;
  readonly admin: AdminDashboardManager;
  readonly revenue: RevenueManager;

  private readonly config: MVPConfig;
  private readonly eventCallbacks: MVPEventCallback[] = [];
  private readonly referralCodes: Map<string, string> = new Map();
  private readonly referrals: Map<string, ReferralInfo> = new Map();
  private readonly consents: Map<string, UserConsent> = new Map();
  private readonly userLanguages: Map<string, string> = new Map();

  constructor(config: Partial<MVPConfig> = {}) {
    this.config = {
      ...defaultMVPConfig,
      ...config,
      telegramApp: { ...defaultTelegramAppConfig, ...config.telegramApp },
      marketplace: { ...defaultMarketplaceConfig, ...config.marketplace },
      ranking: { ...defaultRankingConfig, ...config.ranking },
      admin: { ...defaultAdminConfig, ...config.admin },
      revenue: { ...defaultRevenueConfig, ...config.revenue },
      growth: { ...defaultMVPConfig.growth, ...config.growth },
      privacy: { ...defaultMVPConfig.privacy, ...config.privacy },
      localization: { ...defaultMVPConfig.localization, ...config.localization },
    };

    this.enabled = this.config.enabled;

    // Initialize all managers
    this.telegramApp = new TelegramMiniAppManager(this.config.telegramApp);
    this.marketplace = new StrategyMarketplaceManager(this.config.marketplace);
    this.ranking = new AgentRankingManager(this.config.ranking);
    this.admin = new AdminDashboardManager(this.config.admin);
    this.revenue = new RevenueManager(this.config.revenue);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async getHealth(): Promise<MVPHealth> {
    const components = {
      telegramApp: this.enabled,
      marketplace: this.config.marketplace.enabled,
      ranking: this.config.ranking.enabled,
      admin: this.config.admin.enabled,
      revenue: this.config.revenue.enabled,
      growth: this.config.growth.enabled,
      ai: true, // AI is always available
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: MVPHealth['overall'];
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
        totalUsers: this.telegramApp['users'].size,
        totalStrategies: this.marketplace['strategies'].size,
      },
    };
  }

  // ============================================================================
  // Growth Features
  // ============================================================================

  async createReferralCode(userId: string): Promise<string> {
    const existingCode = this.referralCodes.get(userId);
    if (existingCode) {
      return existingCode;
    }

    const code = `REF_${userId.substring(0, 6)}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.referralCodes.set(userId, code);

    // Initialize referral info
    this.referrals.set(userId, {
      userId,
      referralCode: code,
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      tier: 'bronze',
    });

    return code;
  }

  getReferralInfo(userId: string): ReferralInfo {
    const info = this.referrals.get(userId);
    if (!info) {
      // Create default info
      return {
        userId,
        referralCode: '',
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        tier: 'bronze',
      };
    }
    return info;
  }

  async activateReferral(referrerId: string, newUserId: string): Promise<void> {
    const referrerInfo = this.referrals.get(referrerId);
    if (!referrerInfo) {
      throw new Error('Referrer not found');
    }

    referrerInfo.totalReferrals++;
    referrerInfo.activeReferrals++;

    // Update tier based on referrals
    if (referrerInfo.activeReferrals >= 100) {
      referrerInfo.tier = 'platinum';
    } else if (referrerInfo.activeReferrals >= 50) {
      referrerInfo.tier = 'gold';
    } else if (referrerInfo.activeReferrals >= 10) {
      referrerInfo.tier = 'silver';
    }

    this.referrals.set(referrerId, referrerInfo);

    this.emitEvent({
      type: 'referral_activated',
      timestamp: new Date(),
      userId: newUserId,
      data: {
        referrerId,
        referrerTier: referrerInfo.tier,
        totalReferrals: referrerInfo.totalReferrals,
      },
    });
  }

  // ============================================================================
  // Privacy Features
  // ============================================================================

  recordConsent(userId: string, consent: Partial<UserConsent>): void {
    const existing = this.consents.get(userId);

    const updatedConsent: UserConsent = {
      userId,
      dataTracking: consent.dataTracking ?? existing?.dataTracking ?? false,
      performanceSharing: consent.performanceSharing ?? existing?.performanceSharing ?? false,
      telegramSignals: consent.telegramSignals ?? existing?.telegramSignals ?? false,
      marketing: consent.marketing ?? existing?.marketing ?? false,
      analytics: consent.analytics ?? existing?.analytics ?? false,
      consentedAt: new Date(),
      consentVersion: '1.0.0',
    };

    this.consents.set(userId, updatedConsent);

    // Update ranking consent if telegram signals changed
    if (consent.telegramSignals !== undefined) {
      this.ranking.recordConsent(userId, consent.telegramSignals);
    }

    this.emitEvent({
      type: 'consent_updated',
      timestamp: new Date(),
      userId,
      data: {
        dataTracking: updatedConsent.dataTracking,
        performanceSharing: updatedConsent.performanceSharing,
        telegramSignals: updatedConsent.telegramSignals,
      },
    });
  }

  getConsent(userId: string): UserConsent | undefined {
    return this.consents.get(userId);
  }

  hasConsent(userId: string, type: keyof UserConsent): boolean {
    const consent = this.consents.get(userId);
    if (!consent) return false;
    return consent[type] === true;
  }

  // ============================================================================
  // Localization
  // ============================================================================

  setUserLanguage(userId: string, language: string): void {
    const supported = this.config.localization.supportedLanguages;
    if (supported.includes(language)) {
      this.userLanguages.set(userId, language);
    } else {
      this.userLanguages.set(userId, this.config.localization.fallbackLanguage);
    }
  }

  getUserLanguage(userId: string): string {
    return (
      this.userLanguages.get(userId) ??
      this.config.localization.defaultLanguage
    );
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: MVPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MVPEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: MVPEvent) => {
      this.emitEvent(event);
    };

    // Subscribe to all component events
    this.telegramApp.onEvent(forwardEvent);
    this.marketplace.onEvent(forwardEvent);
    this.ranking.onEvent(forwardEvent);
    this.admin.onEvent(forwardEvent);
    this.revenue.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create MVP Service
 *
 * @example
 * ```typescript
 * const mvp = createMVPService({
 *   telegramApp: { fastOnboarding: true },
 *   marketplace: { copyTradingEnabled: true },
 * });
 * ```
 */
export function createMVPService(config?: Partial<MVPConfig>): DefaultMVPService {
  return new DefaultMVPService(config);
}

// Default export
export default DefaultMVPService;
