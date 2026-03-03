/**
 * TONAIAgent - Token Utility Framework
 *
 * Manages fee schedules, tier-based discounts, and token utility features.
 * Handles agent creation fees, strategy deployment, automation workflows,
 * premium features, execution fees, and marketplace transactions.
 */

import {
  TokenFeeType,
  FeeScheduleEntry,
  FeeCalculationResult,
  TokenUtilityTier,
  TokenUtilityTierConfig,
  TokenUtilityFrameworkHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_FEE_SCHEDULE: Record<TokenFeeType, FeeScheduleEntry> = {
  agent_creation: {
    feeType: 'agent_creation',
    baseAmount: '500000000000',     // 500 tokens
    discountable: true,
    burnPercent: 0.20,
    treasuryPercent: 0.50,
    creatorPercent: 0.30,
    description: 'Fee to create and deploy a new agent',
  },
  strategy_deployment: {
    feeType: 'strategy_deployment',
    baseAmount: '1000000000000',    // 1000 tokens
    discountable: true,
    burnPercent: 0.25,
    treasuryPercent: 0.45,
    creatorPercent: 0.30,
    description: 'Fee to publish and deploy a strategy',
  },
  automation_workflow: {
    feeType: 'automation_workflow',
    baseAmount: '100000000000',     // 100 tokens
    discountable: true,
    burnPercent: 0.30,
    treasuryPercent: 0.40,
    creatorPercent: 0.30,
    description: 'Fee for automation workflow execution',
  },
  premium_feature: {
    feeType: 'premium_feature',
    baseAmount: '200000000000',     // 200 tokens/month
    discountable: true,
    burnPercent: 0.10,
    treasuryPercent: 0.60,
    creatorPercent: 0.30,
    description: 'Fee to access premium platform features',
  },
  execution_fee: {
    feeType: 'execution_fee',
    baseAmount: '5000000000',       // 5 tokens per transaction
    discountable: true,
    burnPercent: 0.50,
    treasuryPercent: 0.30,
    creatorPercent: 0.20,
    description: 'Per-transaction execution fee',
  },
  marketplace_listing: {
    feeType: 'marketplace_listing',
    baseAmount: '300000000000',     // 300 tokens
    discountable: true,
    burnPercent: 0.20,
    treasuryPercent: 0.50,
    creatorPercent: 0.30,
    description: 'Fee to list in the marketplace',
  },
  marketplace_transaction: {
    feeType: 'marketplace_transaction',
    baseAmount: '10000000000',      // 10 tokens
    discountable: true,
    burnPercent: 0.30,
    treasuryPercent: 0.35,
    creatorPercent: 0.35,
    description: 'Fee on marketplace transactions',
  },
};

const DEFAULT_TIER_CONFIGS: Record<TokenUtilityTier, TokenUtilityTierConfig> = {
  basic: {
    tier: 'basic',
    minStakedTokens: '0',
    feeDiscount: 0,
    features: ['basic_agents', 'public_strategies'],
    agentCreationLimit: 3,
    strategyDeploymentLimit: 1,
    priorityAccess: false,
  },
  standard: {
    tier: 'standard',
    minStakedTokens: '1000000000000',    // 1,000 tokens
    feeDiscount: 0.15,
    features: ['basic_agents', 'public_strategies', 'analytics_basic', 'priority_support'],
    agentCreationLimit: 10,
    strategyDeploymentLimit: 5,
    priorityAccess: false,
  },
  premium: {
    tier: 'premium',
    minStakedTokens: '10000000000000',   // 10,000 tokens
    feeDiscount: 0.30,
    features: ['basic_agents', 'public_strategies', 'analytics_advanced', 'priority_support', 'advanced_automation', 'custom_strategies'],
    agentCreationLimit: 50,
    strategyDeploymentLimit: 20,
    priorityAccess: true,
  },
  elite: {
    tier: 'elite',
    minStakedTokens: '100000000000000',  // 100,000 tokens
    feeDiscount: 0.50,
    features: ['all_features', 'institutional_tools', 'dedicated_support', 'governance_priority'],
    agentCreationLimit: -1,
    strategyDeploymentLimit: -1,
    priorityAccess: true,
  },
  institutional: {
    tier: 'institutional',
    minStakedTokens: '1000000000000000', // 1,000,000 tokens
    feeDiscount: 0.75,
    features: ['all_features', 'institutional_tools', 'dedicated_support', 'governance_priority', 'custom_arrangements', 'treasury_co_investment'],
    agentCreationLimit: -1,
    strategyDeploymentLimit: -1,
    priorityAccess: true,
  },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface TokenUtilityFrameworkConfig {
  tokenSymbol?: string;
  feeSchedule?: Partial<Record<TokenFeeType, Partial<FeeScheduleEntry>>>;
  tiers?: Partial<Record<TokenUtilityTier, Partial<TokenUtilityTierConfig>>>;
}

export interface TokenUtilityFramework {
  readonly feeSchedule: Record<TokenFeeType, FeeScheduleEntry>;
  readonly tierConfigs: Record<TokenUtilityTier, TokenUtilityTierConfig>;

  calculateFee(feeType: TokenFeeType, userStakedAmount: string): FeeCalculationResult;
  getTierForStake(stakedAmount: string): TokenUtilityTier;
  getTierConfig(tier: TokenUtilityTier): TokenUtilityTierConfig;
  hasFeatureAccess(tier: TokenUtilityTier, feature: string): boolean;
  getNextTier(currentTier: TokenUtilityTier): TokenUtilityTier | null;
  getAmountToNextTier(currentStake: string): string | null;
  recordFeeCollection(feeType: TokenFeeType, amount: string, userId?: string): void;
  getHealth(): TokenUtilityFrameworkHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenUtilityFramework implements TokenUtilityFramework {
  readonly feeSchedule: Record<TokenFeeType, FeeScheduleEntry>;
  readonly tierConfigs: Record<TokenUtilityTier, TokenUtilityTierConfig>;

  private totalFeesCollected: bigint = BigInt(0);
  private totalFeesBurned: bigint = BigInt(0);
  private tierUserCounts: Record<TokenUtilityTier, number> = {
    basic: 0,
    standard: 0,
    premium: 0,
    elite: 0,
    institutional: 0,
  };
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: TokenUtilityFrameworkConfig = {}) {
    // Merge fee schedule with defaults
    const customFees = config.feeSchedule ?? {};
    this.feeSchedule = { ...DEFAULT_FEE_SCHEDULE };
    for (const [key, value] of Object.entries(customFees)) {
      const feeType = key as TokenFeeType;
      this.feeSchedule[feeType] = {
        ...DEFAULT_FEE_SCHEDULE[feeType],
        ...value,
      } as FeeScheduleEntry;
    }

    // Merge tier configs with defaults
    const customTiers = config.tiers ?? {};
    this.tierConfigs = { ...DEFAULT_TIER_CONFIGS };
    for (const [key, value] of Object.entries(customTiers)) {
      const tier = key as TokenUtilityTier;
      this.tierConfigs[tier] = {
        ...DEFAULT_TIER_CONFIGS[tier],
        ...value,
      } as TokenUtilityTierConfig;
    }
  }

  calculateFee(feeType: TokenFeeType, userStakedAmount: string): FeeCalculationResult {
    const schedule = this.feeSchedule[feeType];
    const tier = this.getTierForStake(userStakedAmount);
    const tierConfig = this.tierConfigs[tier];

    const gross = BigInt(schedule.baseAmount);
    const discountAmount = schedule.discountable
      ? (gross * BigInt(Math.floor(tierConfig.feeDiscount * 1000))) / BigInt(1000)
      : BigInt(0);
    const net = gross - discountAmount;

    const burnAmount = (net * BigInt(Math.floor(schedule.burnPercent * 1000))) / BigInt(1000);
    const treasuryAmount = (net * BigInt(Math.floor(schedule.treasuryPercent * 1000))) / BigInt(1000);
    const creatorAmount = net - burnAmount - treasuryAmount;

    return {
      feeType,
      grossAmount: gross.toString(),
      discountAmount: discountAmount.toString(),
      netAmount: net.toString(),
      burnAmount: burnAmount.toString(),
      treasuryAmount: treasuryAmount.toString(),
      creatorAmount: creatorAmount.toString(),
      discountPercent: tierConfig.feeDiscount,
      appliedTier: tier,
    };
  }

  getTierForStake(stakedAmount: string): TokenUtilityTier {
    const staked = BigInt(stakedAmount);
    const tiers: TokenUtilityTier[] = ['institutional', 'elite', 'premium', 'standard', 'basic'];
    for (const tier of tiers) {
      if (staked >= BigInt(this.tierConfigs[tier].minStakedTokens)) {
        return tier;
      }
    }
    return 'basic';
  }

  getTierConfig(tier: TokenUtilityTier): TokenUtilityTierConfig {
    return this.tierConfigs[tier];
  }

  hasFeatureAccess(tier: TokenUtilityTier, feature: string): boolean {
    const config = this.tierConfigs[tier];
    return config.features.includes(feature) || config.features.includes('all_features');
  }

  getNextTier(currentTier: TokenUtilityTier): TokenUtilityTier | null {
    const progression: TokenUtilityTier[] = ['basic', 'standard', 'premium', 'elite', 'institutional'];
    const idx = progression.indexOf(currentTier);
    if (idx === -1 || idx === progression.length - 1) return null;
    return progression[idx + 1];
  }

  getAmountToNextTier(currentStake: string): string | null {
    const currentTier = this.getTierForStake(currentStake);
    const nextTier = this.getNextTier(currentTier);
    if (!nextTier) return null;
    const required = BigInt(this.tierConfigs[nextTier].minStakedTokens);
    const current = BigInt(currentStake);
    const remaining = required > current ? required - current : BigInt(0);
    return remaining.toString();
  }

  recordFeeCollection(feeType: TokenFeeType, amount: string, userId?: string): void {
    const amountBig = BigInt(amount);
    this.totalFeesCollected += amountBig;

    const schedule = this.feeSchedule[feeType];
    const burned = (amountBig * BigInt(Math.floor(schedule.burnPercent * 1000))) / BigInt(1000);
    this.totalFeesBurned += burned;

    this.emitEvent({
      id: `fee-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'fee.collected',
      data: { feeType, amount, burned: burned.toString(), userId },
      userId,
      timestamp: new Date(),
    });
  }

  getHealth(): TokenUtilityFrameworkHealth {
    return {
      overall: 'healthy',
      feeScheduleActive: true,
      tierSystemActive: true,
      totalFeesCollected: this.totalFeesCollected.toString(),
      totalFeesBurned: this.totalFeesBurned.toString(),
      activeTierUsers: { ...this.tierUserCounts },
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createTokenUtilityFramework(
  config?: TokenUtilityFrameworkConfig
): DefaultTokenUtilityFramework {
  return new DefaultTokenUtilityFramework(config);
}
