/**
 * TONAIAgent - Marketplace Layer
 *
 * Decentralized strategy marketplace and copy trading system for autonomous agents
 * operating on The Open Network (TON).
 *
 * Features:
 * - Strategy discovery and marketplace
 * - One-click agent deployment
 * - Capital allocation and copy trading
 * - Transparent performance tracking
 * - Reputation-based ranking
 * - Creator monetization
 * - Risk transparency and user protection
 *
 * @example
 * ```typescript
 * import {
 *   createMarketplaceService,
 *   MarketplaceConfig,
 * } from './marketplace';
 *
 * const config: MarketplaceConfig = {
 *   enabled: true,
 *   discovery: { maxResultsPerPage: 50 },
 *   copyTrading: { enabled: true, minCopyAmount: 10 },
 *   monetization: { platformFeePercent: 2.5 },
 * };
 *
 * const marketplace = createMarketplaceService(config);
 *
 * // Create a strategy
 * const strategy = await marketplace.strategies.create({
 *   name: 'DeFi Yield Optimizer',
 *   description: 'Automated yield farming across TON DeFi protocols',
 *   creatorId: 'creator_123',
 *   category: 'yield_farming',
 *   visibility: 'public',
 *   config: { ... },
 * });
 *
 * // Start copy trading
 * const position = await marketplace.copyTrading.startCopying({
 *   userId: 'user_456',
 *   agentId: 'agent_789',
 *   capitalAllocated: 1000,
 * });
 * ```
 */

// Export all types
export * from './types';

// Export strategy manager
export {
  DefaultStrategyManager,
  createStrategyManager,
  type StrategyManager,
  type StrategyManagerConfig,
  type CreateStrategyInput,
  type UpdateStrategyInput,
  type CreateVersionInput,
  type StrategyFilter,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './strategy';

// Export copy trading engine
export {
  DefaultCopyTradingEngine,
  createCopyTradingEngine,
  type CopyTradingEngine,
  type CopyTradingEngineConfig,
  type StartCopyInput,
  type AgentTrade,
  type RiskCheckResult,
  type RiskViolation,
  type RiskWarning as CopyRiskWarning,
} from './copy-trading';

// Export reputation manager
export {
  DefaultReputationManager,
  createReputationManager,
  type ReputationManager,
  type ReputationManagerConfig,
  type TierRequirements,
  type FraudDetectionConfig,
} from './reputation';

// Export analytics engine
export {
  DefaultAnalyticsEngine,
  createAnalyticsEngine,
  type AnalyticsEngine,
  type AnalyticsEngineConfig,
} from './analytics';

// Export monetization manager
export {
  DefaultMonetizationManager,
  createMonetizationManager,
  type MonetizationManager,
  type MonetizationConfig,
  type CreateFeeStructureInput,
  type UpdateFeeStructureInput,
  type FeeCalculationInput,
  type FeeCalculationResult,
  type FeeBreakdown,
  type RecordRevenueInput,
  type StatsPeriod,
  type CreatorEarnings,
  type EarningSource,
  type SchedulePayoutInput,
  type ProcessPayoutsResult,
  type ReferralStats,
} from './monetization';

// Export risk transparency manager
export {
  DefaultRiskTransparencyManager,
  createRiskTransparencyManager,
  type RiskTransparencyManager,
  type RiskTransparencyConfig,
  type RiskAssessment,
  type RiskLevel,
  type RiskComponent,
  type RiskCategory,
  type CopyRiskAssessment,
  type RiskDisclosure,
  type SpecificRisk,
  type DrawdownEvent,
  type WorstCaseScenario,
  type AcknowledgmentRequirement,
  type AcknowledgmentType,
  type ExposureAnalysis,
  type TokenExposure,
  type ProtocolExposure,
  type LiquidityRiskAnalysis,
  type IlliquidPosition,
  type SmartContractRiskAssessment,
  type ProtocolRisk,
  type AuditRecord,
  type KnownIssue,
  type SecurityIncident,
  type CapitalCap,
  type CapitalCapFactor,
  type CapitalCapResult,
  type RiskWarning,
  type ProposedAction,
  type SafeguardCheckResult,
  type SafeguardResult,
} from './risk-transparency';

// ============================================================================
// Marketplace Service - Unified Entry Point
// ============================================================================

import {
  MarketplaceConfig,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

import { DefaultStrategyManager, createStrategyManager, StrategyManagerConfig } from './strategy';
import { DefaultCopyTradingEngine, createCopyTradingEngine, CopyTradingEngineConfig } from './copy-trading';
import { DefaultReputationManager, createReputationManager, ReputationManagerConfig } from './reputation';
import { DefaultAnalyticsEngine, createAnalyticsEngine, AnalyticsEngineConfig } from './analytics';
import { DefaultMonetizationManager, createMonetizationManager, MonetizationConfig } from './monetization';
import { DefaultRiskTransparencyManager, createRiskTransparencyManager, RiskTransparencyConfig, RiskLevel } from './risk-transparency';

export interface MarketplaceService {
  readonly enabled: boolean;
  readonly strategies: DefaultStrategyManager;
  readonly copyTrading: DefaultCopyTradingEngine;
  readonly reputation: DefaultReputationManager;
  readonly analytics: DefaultAnalyticsEngine;
  readonly monetization: DefaultMonetizationManager;
  readonly riskTransparency: DefaultRiskTransparencyManager;

  // Health check
  getHealth(): Promise<MarketplaceHealth>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

export interface MarketplaceHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    strategies: boolean;
    copyTrading: boolean;
    reputation: boolean;
    analytics: boolean;
    monetization: boolean;
    riskTransparency: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export class DefaultMarketplaceService implements MarketplaceService {
  readonly enabled: boolean;
  readonly strategies: DefaultStrategyManager;
  readonly copyTrading: DefaultCopyTradingEngine;
  readonly reputation: DefaultReputationManager;
  readonly analytics: DefaultAnalyticsEngine;
  readonly monetization: DefaultMonetizationManager;
  readonly riskTransparency: DefaultRiskTransparencyManager;

  private readonly eventCallbacks: MarketplaceEventCallback[] = [];

  constructor(config: Partial<MarketplaceConfig> = {}) {
    this.enabled = config.enabled ?? true;

    // Initialize strategy manager
    const strategyConfig: Partial<StrategyManagerConfig> = {
      requireBacktest: config.discovery?.minScoreForListing ? true : false,
    };
    this.strategies = createStrategyManager(strategyConfig);

    // Initialize copy trading engine
    const copyConfig: Partial<CopyTradingEngineConfig> = {
      minCopyAmount: config.copyTrading?.minCopyAmount,
      maxCopyAmount: config.copyTrading?.maxCopyAmount,
      defaultSlippageProtection: config.copyTrading?.defaultSlippageProtection,
      maxFollowersPerAgent: config.copyTrading?.maxFollowersPerAgent,
      cooldownPeriodMinutes: config.copyTrading?.cooldownPeriodMinutes,
    };
    this.copyTrading = createCopyTradingEngine(copyConfig);

    // Initialize reputation manager
    const reputationConfig: Partial<ReputationManagerConfig> = {
      updateFrequencyMinutes: config.scoring?.updateFrequencyMinutes,
      anomalyDetectionEnabled: config.scoring?.anomalyDetectionEnabled,
      groqApiEnabled: config.scoring?.groqApiEnabled,
    };
    this.reputation = createReputationManager(reputationConfig);

    // Initialize analytics engine
    const analyticsConfig: Partial<AnalyticsEngineConfig> = {};
    this.analytics = createAnalyticsEngine(analyticsConfig);

    // Initialize monetization manager
    const monetizationLocalConfig: Partial<MonetizationConfig> = {
      platformFeePercent: config.monetization?.platformFeePercent,
      maxPerformanceFee: config.monetization?.maxPerformanceFee,
      maxManagementFee: config.monetization?.maxManagementFee,
      payoutFrequency: config.monetization?.payoutFrequency,
      minPayoutAmount: config.monetization?.minPayoutAmount,
    };
    this.monetization = createMonetizationManager(monetizationLocalConfig);

    // Initialize risk transparency manager
    // Map 'medium' to 'moderate' for RiskLevel compatibility
    const mapRiskLevel = (level: string | undefined): RiskLevel | undefined => {
      if (!level) return undefined;
      if (level === 'medium') return 'moderate';
      return level as RiskLevel;
    };

    const riskConfig: Partial<RiskTransparencyConfig> = {
      requireWarningsAcknowledgment: config.riskTransparency?.requireWarnings,
      maxRiskLevelAllowed: mapRiskLevel(config.riskTransparency?.maxRiskLevel),
      capitalCaps: config.riskTransparency?.capitalCaps?.map(cap => ({
        riskLevel: cap.riskLevel === 'medium' ? 'moderate' : cap.riskLevel,
        maxCapitalPercent: cap.maxCapitalPercent,
        maxAbsoluteCapital: cap.maxAbsoluteCapital,
      })),
    };
    this.riskTransparency = createRiskTransparencyManager(riskConfig);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<MarketplaceHealth> {
    const components = {
      strategies: true, // Always available if initialized
      copyTrading: true,
      reputation: true,
      analytics: true,
      monetization: true,
      riskTransparency: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: MarketplaceHealth['overall'];
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

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: MarketplaceEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.strategies.onEvent(forwardEvent);
    this.copyTrading.onEvent(forwardEvent);
    this.reputation.onEvent(forwardEvent);
    this.analytics.onEvent(forwardEvent);
    this.monetization.onEvent(forwardEvent);
    this.riskTransparency.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarketplaceService(
  config?: Partial<MarketplaceConfig>
): DefaultMarketplaceService {
  return new DefaultMarketplaceService(config);
}

// Default export
export default DefaultMarketplaceService;
