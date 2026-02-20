/**
 * TONAIAgent - Viral Consumer Growth Engine
 *
 * Comprehensive growth infrastructure for accelerating user acquisition,
 * retention, and network effects across the TON AI ecosystem.
 *
 * Features:
 * - Multi-level referral system with smart incentives
 * - Social trading infrastructure (follows, portfolios, signals)
 * - Gamification layer (XP, levels, achievements, challenges)
 * - Viral loops and shareable content
 * - Growth analytics and cohort analysis
 * - AI-powered incentive optimization (Groq)
 * - Anti-abuse and sybil detection mechanisms
 * - Telegram-native growth features
 *
 * @example
 * ```typescript
 * import {
 *   createGrowthEngine,
 *   GrowthConfig,
 * } from '@tonaiagent/core/growth';
 *
 * const config: Partial<GrowthConfig> = {
 *   enabled: true,
 *   referral: { maxLevels: 3, commissionPercent: 10 },
 *   gamification: { xpMultiplier: 1.5, dailyXpCap: 10000 },
 * };
 *
 * const growth = createGrowthEngine(config);
 *
 * // Create referral code
 * const code = await growth.referral.createCode('user_123');
 *
 * // Track and activate referral
 * const referral = await growth.referral.createReferral('new_user', code.code);
 * await growth.referral.activateReferral(referral.id);
 *
 * // Award XP for activity
 * await growth.gamification.addXp('user_123', 100, 'trade_completed');
 *
 * // Check achievements
 * const unlocked = await growth.gamification.checkAchievements('user_123');
 * ```
 */

// Export all types
export * from './types';

// Export referral system
export {
  DefaultReferralSystem,
  createReferralSystem,
  type ReferralSystem,
  type ReferralSystemConfig,
  type CreateCodeOptions,
  type ProcessPayoutsResult,
  type PayoutError,
  type NetworkStats,
  type TierBenefits,
} from './referral';

// Export social trading engine
export {
  DefaultSocialTradingEngine,
  createSocialTradingEngine,
  type SocialTradingEngine,
  type SocialTradingEngineConfig,
  type CreatePortfolioInput,
  type UpdatePortfolioInput,
  type PortfolioFilter,
  type CreateSignalInput,
  type SignalFilter,
  type ReactionType,
  type FeedItem,
  type FeedItemType,
  type SocialStats,
} from './social-trading';

// Export gamification engine
export {
  DefaultGamificationEngine,
  createGamificationEngine,
  type GamificationEngine,
  type GamificationEngineConfig,
  type XpResult,
  type AchievementDefinition,
  type CreateChallengeInput,
  type ChallengeFilter,
} from './gamification';

// Export viral loops engine
export {
  DefaultViralLoopsEngine,
  createViralLoopsEngine,
  type ViralLoopsEngine,
  type ViralLoopsEngineConfig,
  type CreateViralContentInput,
  type CreateDashboardInput,
  type UpdateDashboardInput,
} from './viral-loops';

// Export growth analytics engine
export {
  DefaultGrowthAnalyticsEngine,
  createGrowthAnalyticsEngine,
  type GrowthAnalyticsEngine,
  type GrowthAnalyticsEngineConfig,
  type CreateExperimentInput,
  type Experiment,
  type ExperimentVariant,
  type ExperimentResults,
  type VariantResult,
  type UserEvent,
} from './analytics';

// Export anti-abuse system
export {
  DefaultAntiAbuseSystem,
  createAntiAbuseSystem,
  type AntiAbuseSystem,
  type AntiAbuseSystemConfig,
  type ActivityData,
  type RateLimitResult,
  type RateLimitStatus,
  type RiskScore,
  type RiskFactor,
  type PenaltyInput,
  type AppliedPenalty,
} from './anti-abuse';

// ============================================================================
// Import Components for Manager
// ============================================================================

import {
  GrowthConfig,
  GrowthEvent,
  GrowthEventCallback,
} from './types';

import { DefaultReferralSystem, createReferralSystem } from './referral';
import { DefaultSocialTradingEngine, createSocialTradingEngine } from './social-trading';
import { DefaultGamificationEngine, createGamificationEngine } from './gamification';
import { DefaultViralLoopsEngine, createViralLoopsEngine } from './viral-loops';
import { DefaultGrowthAnalyticsEngine, createGrowthAnalyticsEngine } from './analytics';
import { DefaultAntiAbuseSystem, createAntiAbuseSystem } from './anti-abuse';

// ============================================================================
// Growth Engine Manager - Unified Entry Point
// ============================================================================

export interface GrowthEngine {
  readonly enabled: boolean;
  readonly referral: DefaultReferralSystem;
  readonly socialTrading: DefaultSocialTradingEngine;
  readonly gamification: DefaultGamificationEngine;
  readonly viralLoops: DefaultViralLoopsEngine;
  readonly analytics: DefaultGrowthAnalyticsEngine;
  readonly antiAbuse: DefaultAntiAbuseSystem;

  // Health check
  getHealth(): Promise<GrowthHealth>;

  // Statistics
  getStats(): Promise<GrowthStats>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

export interface GrowthHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    referral: boolean;
    socialTrading: boolean;
    gamification: boolean;
    viralLoops: boolean;
    analytics: boolean;
    antiAbuse: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface GrowthStats {
  totalReferrals: number;
  activeReferrals: number;
  totalRewardsDistributed: number;
  totalXpAwarded: number;
  activeChallenges: number;
  viralCoefficient: number;
  dailyActiveUsers: number;
  retentionD7: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGrowthEngine implements GrowthEngine {
  readonly enabled: boolean;
  readonly referral: DefaultReferralSystem;
  readonly socialTrading: DefaultSocialTradingEngine;
  readonly gamification: DefaultGamificationEngine;
  readonly viralLoops: DefaultViralLoopsEngine;
  readonly analytics: DefaultGrowthAnalyticsEngine;
  readonly antiAbuse: DefaultAntiAbuseSystem;

  private readonly eventCallbacks: GrowthEventCallback[] = [];

  constructor(config: Partial<GrowthConfig> = {}) {
    this.enabled = config.enabled ?? true;

    // Initialize referral system
    this.referral = createReferralSystem(config.referral);

    // Initialize social trading engine
    this.socialTrading = createSocialTradingEngine(config.socialTrading);

    // Initialize gamification engine
    this.gamification = createGamificationEngine(config.gamification);

    // Initialize viral loops engine
    this.viralLoops = createViralLoopsEngine(config.viralLoops);

    // Initialize growth analytics engine
    this.analytics = createGrowthAnalyticsEngine(config.analytics);

    // Initialize anti-abuse system
    this.antiAbuse = createAntiAbuseSystem(config.antiAbuse);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<GrowthHealth> {
    // Check each component's health
    const components = {
      referral: true, // Always available if initialized
      socialTrading: true,
      gamification: true,
      viralLoops: true,
      analytics: this.analytics.config.trackingEnabled,
      antiAbuse: this.antiAbuse.config.sybilDetectionEnabled,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: GrowthHealth['overall'];
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
        referralMaxLevels: this.referral.config.maxLevels,
        gamificationXpMultiplier: this.gamification.config.xpMultiplier,
        abTestingEnabled: this.analytics.config.abTestingEnabled,
      },
    };
  }

  async getStats(): Promise<GrowthStats> {
    const retentionMetrics = await this.analytics.getRetentionMetrics('30d');
    const viralCoefficient = await this.viralLoops.getViralCoefficient();

    return {
      totalReferrals: 0, // Would aggregate from referral system
      activeReferrals: 0,
      totalRewardsDistributed: 0,
      totalXpAwarded: 0,
      activeChallenges: (await this.gamification.listChallenges({ status: 'active' })).length,
      viralCoefficient,
      dailyActiveUsers: retentionMetrics.dau,
      retentionD7: retentionMetrics.retentionD7,
    };
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: GrowthEvent) => {
      // Forward to all subscribers
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.referral.onEvent(forwardEvent);
    this.socialTrading.onEvent(forwardEvent);
    this.gamification.onEvent(forwardEvent);
    this.viralLoops.onEvent(forwardEvent);
    this.analytics.onEvent(forwardEvent);
    this.antiAbuse.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGrowthEngine(
  config?: Partial<GrowthConfig>
): DefaultGrowthEngine {
  return new DefaultGrowthEngine(config);
}

// Default export
export default DefaultGrowthEngine;
