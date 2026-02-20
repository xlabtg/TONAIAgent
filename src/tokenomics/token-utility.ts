/**
 * TONAIAgent - Token Utility Service
 *
 * Manages token utility functions including fee discounts, premium access,
 * voting power calculations, and tier management.
 */

import {
  TokenConfig,
  TokenTier,
  TierConfig,
  FeeDiscountResult,
  PremiumAccessResult,
  VotingPowerResult,
  TokenBalance,
  TokenomicsEventCallback,
} from './types';

// ============================================================================
// Tier Configuration
// ============================================================================

const DEFAULT_TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'bronze',
    minStake: '100',
    feeDiscount: 0.05,
    features: ['basic_analytics'],
  },
  {
    tier: 'silver',
    minStake: '1000',
    feeDiscount: 0.10,
    features: ['basic_analytics', 'advanced_analytics'],
  },
  {
    tier: 'gold',
    minStake: '10000',
    feeDiscount: 0.25,
    features: ['basic_analytics', 'advanced_analytics', 'priority_execution'],
  },
  {
    tier: 'platinum',
    minStake: '100000',
    feeDiscount: 0.50,
    features: ['basic_analytics', 'advanced_analytics', 'priority_execution', 'institutional_features'],
  },
  {
    tier: 'diamond',
    minStake: '1000000',
    feeDiscount: 0.75,
    features: ['basic_analytics', 'advanced_analytics', 'priority_execution', 'institutional_features', 'custom_strategies'],
  },
];

// ============================================================================
// Interfaces
// ============================================================================

export interface TokenUtilityConfig {
  symbol?: string;
  name?: string;
  decimals?: number;
  tiers?: TierConfig[];
}

export interface FeeDiscountParams {
  stakedAmount: string;
  stakeDuration?: number; // days
  tier?: TokenTier;
}

export interface VotingPowerParams {
  stakedAmount: string;
  stakeDuration: number; // days
  delegatedAmount?: string;
  reputationScore?: number;
}

export interface TokenUtility {
  readonly config: TokenConfig;
  readonly tiers: TierConfig[];

  // Tier functions
  getTier(stakedAmount: string): TokenTier;
  getTierConfig(tier: TokenTier): TierConfig;
  getNextTier(currentTier: TokenTier): TokenTier | null;

  // Fee discount functions
  calculateFeeDiscount(params: FeeDiscountParams): FeeDiscountResult;
  getBaseFeeRate(): number;
  getEffectiveFeeRate(stakedAmount: string): number;

  // Premium access functions
  checkPremiumAccess(userId: string, stakedAmount?: string): PremiumAccessResult;
  getFeatureRequirements(feature: string): { minTier: TokenTier; minStake: string };

  // Voting power functions
  calculateVotingPower(params: VotingPowerParams): VotingPowerResult;
  getLockMultiplier(daysLocked: number): number;
  getReputationMultiplier(score: number): number;

  // Balance functions
  getBalance(userId: string): Promise<TokenBalance>;
  formatAmount(amount: string, includeSymbol?: boolean): string;
  parseAmount(formatted: string): string;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenUtility implements TokenUtility {
  readonly config: TokenConfig;
  readonly tiers: TierConfig[];
  private readonly eventCallbacks: TokenomicsEventCallback[] = [];
  private readonly userBalances: Map<string, TokenBalance> = new Map();

  constructor(config: TokenUtilityConfig = {}) {
    this.config = {
      symbol: config.symbol ?? 'TONAI',
      name: config.name ?? 'TON AI Agent Token',
      decimals: config.decimals ?? 9,
      totalSupply: '1000000000000000000', // 1 billion with 9 decimals
    };
    this.tiers = config.tiers ?? DEFAULT_TIER_CONFIGS;
  }

  // --------------------------------------------------------------------------
  // Tier Functions
  // --------------------------------------------------------------------------

  getTier(stakedAmount: string): TokenTier {
    const amount = BigInt(stakedAmount);

    // Find the highest tier the user qualifies for
    let qualifiedTier: TokenTier = 'bronze';

    for (const tierConfig of this.tiers) {
      if (amount >= BigInt(tierConfig.minStake)) {
        qualifiedTier = tierConfig.tier;
      }
    }

    // If user doesn't meet minimum, return lowest tier with no benefits
    if (amount < BigInt(this.tiers[0].minStake)) {
      return 'bronze'; // Default tier even without minimum stake
    }

    return qualifiedTier;
  }

  getTierConfig(tier: TokenTier): TierConfig {
    const config = this.tiers.find(t => t.tier === tier);
    if (!config) {
      throw new Error(`Unknown tier: ${tier}`);
    }
    return config;
  }

  getNextTier(currentTier: TokenTier): TokenTier | null {
    const tierOrder: TokenTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
      return null;
    }

    return tierOrder[currentIndex + 1];
  }

  // --------------------------------------------------------------------------
  // Fee Discount Functions
  // --------------------------------------------------------------------------

  calculateFeeDiscount(params: FeeDiscountParams): FeeDiscountResult {
    const tier = params.tier ?? this.getTier(params.stakedAmount);
    const tierConfig = this.getTierConfig(tier);

    // Base discount from tier
    let discountPercent = tierConfig.feeDiscount * 100;

    // Additional discount for long-term staking
    if (params.stakeDuration) {
      const durationBonus = this.calculateDurationBonus(params.stakeDuration);
      discountPercent = Math.min(discountPercent + durationBonus, 90); // Cap at 90%
    }

    // Calculate next tier info
    const nextTier = this.getNextTier(tier);
    let amountToNextTier: string | undefined;

    if (nextTier) {
      const nextTierConfig = this.getTierConfig(nextTier);
      const currentAmount = BigInt(params.stakedAmount);
      const nextMin = BigInt(nextTierConfig.minStake);

      if (nextMin > currentAmount) {
        amountToNextTier = (nextMin - currentAmount).toString();
      }
    }

    return {
      discountPercent,
      tier,
      nextTier: nextTier ?? undefined,
      amountToNextTier,
    };
  }

  private calculateDurationBonus(days: number): number {
    // Up to 10% additional discount for long-term staking
    if (days >= 365) return 10;
    if (days >= 180) return 7;
    if (days >= 90) return 5;
    if (days >= 30) return 2;
    return 0;
  }

  getBaseFeeRate(): number {
    return 0.001; // 0.1% base fee
  }

  getEffectiveFeeRate(stakedAmount: string): number {
    const discount = this.calculateFeeDiscount({ stakedAmount });
    const baseFee = this.getBaseFeeRate();
    return baseFee * (1 - discount.discountPercent / 100);
  }

  // --------------------------------------------------------------------------
  // Premium Access Functions
  // --------------------------------------------------------------------------

  checkPremiumAccess(_userId: string, stakedAmount?: string): PremiumAccessResult {
    // In production, this would fetch from blockchain/database
    const amount = stakedAmount ?? '0';
    const tier = this.getTier(amount);
    const tierConfig = this.getTierConfig(tier);

    return {
      hasAccess: BigInt(amount) >= BigInt(this.tiers[0].minStake),
      features: tierConfig.features,
      tier,
      expiresAt: undefined, // Subscription-based expiry not implemented yet
    };
  }

  getFeatureRequirements(feature: string): { minTier: TokenTier; minStake: string } {
    for (const tierConfig of this.tiers) {
      if (tierConfig.features.includes(feature)) {
        return {
          minTier: tierConfig.tier,
          minStake: tierConfig.minStake,
        };
      }
    }

    // Feature not found, return highest requirements
    const highestTier = this.tiers[this.tiers.length - 1];
    return {
      minTier: highestTier.tier,
      minStake: highestTier.minStake,
    };
  }

  // --------------------------------------------------------------------------
  // Voting Power Functions
  // --------------------------------------------------------------------------

  calculateVotingPower(params: VotingPowerParams): VotingPowerResult {
    const stakedAmount = BigInt(params.stakedAmount);
    const delegatedAmount = BigInt(params.delegatedAmount ?? '0');

    // Base voting power = staked amount
    const baseVotingPower = stakedAmount;

    // Lock multiplier (up to 2x for 365 days)
    const lockMultiplier = this.getLockMultiplier(params.stakeDuration);
    const lockBonus = (stakedAmount * BigInt(Math.floor((lockMultiplier - 1) * 1000))) / BigInt(1000);

    // Reputation multiplier (up to 1.5x for score 100)
    const reputationMultiplier = this.getReputationMultiplier(params.reputationScore ?? 50);
    const reputationBonus = (stakedAmount * BigInt(Math.floor((reputationMultiplier - 1) * 1000))) / BigInt(1000);

    // Delegated power counts at 1x
    const delegatedPower = delegatedAmount;

    // Total voting power
    const totalVotingPower = baseVotingPower + lockBonus + reputationBonus + delegatedPower;

    // Calculate overall multiplier
    const multiplier = Number(totalVotingPower * BigInt(1000) / (stakedAmount || BigInt(1))) / 1000;

    return {
      votingPower: totalVotingPower.toString(),
      baseVotingPower: baseVotingPower.toString(),
      lockBonus: lockBonus.toString(),
      delegatedPower: delegatedPower.toString(),
      reputationBonus: reputationBonus.toString(),
      multiplier,
    };
  }

  getLockMultiplier(daysLocked: number): number {
    // Linear scaling from 1x (0 days) to 2x (365 days)
    if (daysLocked <= 0) return 1;
    if (daysLocked >= 365) return 2;
    return 1 + (daysLocked / 365);
  }

  getReputationMultiplier(score: number): number {
    // Linear scaling from 1x (0 score) to 1.5x (100 score)
    if (score <= 0) return 1;
    if (score >= 100) return 1.5;
    return 1 + (score / 200); // 100 score = 0.5 bonus
  }

  // --------------------------------------------------------------------------
  // Balance Functions
  // --------------------------------------------------------------------------

  async getBalance(userId: string): Promise<TokenBalance> {
    // In production, this would fetch from blockchain
    const cached = this.userBalances.get(userId);
    if (cached) {
      return cached;
    }

    // Return empty balance for unknown users
    const emptyBalance: TokenBalance = {
      available: '0',
      staked: '0',
      locked: '0',
      pending: '0',
      total: '0',
    };

    return emptyBalance;
  }

  formatAmount(amount: string, includeSymbol = true): string {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** this.config.decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    // Format with appropriate decimal places
    const fractionalStr = fractionalPart.toString().padStart(this.config.decimals, '0');
    const significantFractional = fractionalStr.replace(/0+$/, '') || '0';

    let formatted: string;
    if (fractionalPart === BigInt(0)) {
      formatted = integerPart.toString();
    } else {
      formatted = `${integerPart}.${significantFractional.substring(0, 4)}`;
    }

    return includeSymbol ? `${formatted} ${this.config.symbol}` : formatted;
  }

  parseAmount(formatted: string): string {
    // Remove symbol and whitespace
    const cleaned = formatted.replace(new RegExp(this.config.symbol ?? '', 'gi'), '').trim();

    // Parse decimal number
    const parts = cleaned.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Pad or truncate fractional part to match decimals
    fractionalPart = fractionalPart.padEnd(this.config.decimals, '0').substring(0, this.config.decimals);

    // Combine and return as string
    const combined = integerPart + fractionalPart;
    return BigInt(combined).toString();
  }

  // --------------------------------------------------------------------------
  // Event Functions
  // --------------------------------------------------------------------------

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // Event emission is available for future use when token operations need to emit events

  // --------------------------------------------------------------------------
  // Internal Helpers (for testing/development)
  // --------------------------------------------------------------------------

  /**
   * Set user balance (for testing purposes)
   */
  setBalance(userId: string, balance: TokenBalance): void {
    this.userBalances.set(userId, balance);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenUtility(config?: TokenUtilityConfig): DefaultTokenUtility {
  return new DefaultTokenUtility(config);
}

export default DefaultTokenUtility;
