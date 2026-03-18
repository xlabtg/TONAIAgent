/**
 * TONAIAgent - Rewards Distribution System
 *
 * Manages reward distribution across the ecosystem including creator earnings,
 * staker rewards, treasury allocation, and vesting schedules.
 */

import {
  RewardsConfig,
  EmissionSchedule,
  CreatorEarningsRequest,
  CreatorEarnings,
  StrategyEarnings,
  DistributionSummary,
  CategoryDistribution,
  PerformanceFeeCalculation,
  VestingStatus,
  TokenomicsEvent,
  TokenomicsEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  distributionSchedule: 'daily',
  feeDistribution: {
    creators: 0.40,
    stakers: 0.30,
    treasury: 0.20,
    liquidity: 0.10,
  },
  emissionSchedule: {
    year1: '100000000000000000000', // 100M tokens with 9 decimals
    year2: '75000000000000000000',
    year3: '50000000000000000000',
    year4: '25000000000000000000',
  },
  vestingEnabled: true,
  vestingCliff: 30, // days
  vestingDuration: 365, // days
  immediateReleasePercent: 0.25,
};

// ============================================================================
// Interfaces
// ============================================================================

export interface RewardsDistributor {
  readonly config: RewardsConfig;

  // Creator earnings
  calculateCreatorEarnings(request: CreatorEarningsRequest): Promise<CreatorEarnings>;
  getCreatorStrategies(creatorId: string): Promise<StrategyEarnings[]>;

  // Distribution
  getDistributionSummary(period: string): Promise<DistributionSummary>;
  distributeRewards(period: string): Promise<DistributionResult>;

  // Performance fees
  calculatePerformanceFees(params: PerformanceFeeParams): PerformanceFeeCalculation;
  getHighWaterMark(strategyId: string): Promise<string>;
  updateHighWaterMark(strategyId: string, value: string): Promise<void>;

  // Vesting
  getVestedAmount(userId: string): Promise<VestingStatus>;
  claimVestedTokens(userId: string): Promise<ClaimVestedResult>;
  createVestingSchedule(params: VestingScheduleParams): Promise<VestingSchedule>;

  // Emission
  getCurrentEmissionRate(): string;
  getTotalEmitted(): string;
  getEmissionSchedule(): EmissionSchedule;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

export interface PerformanceFeeParams {
  strategyId: string;
  profitAmount: string;
  previousHighWaterMark: string;
  currentValue: string;
  performanceFeeRate?: number;
  platformFeeRate?: number;
}

export interface DistributionResult {
  success: boolean;
  period: string;
  totalDistributed: string;
  byCategory: CategoryDistribution;
  recipientCount: number;
  timestamp: Date;
}

export interface ClaimVestedResult {
  success: boolean;
  amount: string;
  remaining: string;
  nextVestingDate?: Date;
  nextVestingAmount?: string;
}

export interface VestingScheduleParams {
  userId: string;
  totalAmount: string;
  startDate?: Date;
  cliff?: number;
  duration?: number;
  immediateRelease?: number;
}

export interface VestingSchedule {
  id: string;
  userId: string;
  totalAmount: string;
  vestedAmount: string;
  claimedAmount: string;
  startDate: Date;
  cliffEndDate: Date;
  endDate: Date;
  immediateRelease: number;
  status: 'pending' | 'active' | 'completed';
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRewardsDistributor implements RewardsDistributor {
  readonly config: RewardsConfig;

  // Storage (in production, this would be database/blockchain)
  private readonly strategyEarnings: Map<string, StrategyEarnings[]> = new Map();
  private readonly highWaterMarks: Map<string, string> = new Map();
  private readonly vestingSchedules: Map<string, VestingSchedule[]> = new Map();
  private readonly distributionHistory: Map<string, DistributionSummary> = new Map();
  private totalEmitted: bigint = BigInt(0);

  private readonly eventCallbacks: TokenomicsEventCallback[] = [];

  constructor(config: Partial<RewardsConfig> = {}) {
    this.config = { ...DEFAULT_REWARDS_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Creator Earnings
  // --------------------------------------------------------------------------

  async calculateCreatorEarnings(request: CreatorEarningsRequest): Promise<CreatorEarnings> {
    const { creatorId, strategyId, period } = request;

    // Get strategy earnings
    const strategies = await this.getCreatorStrategies(creatorId);
    const filteredStrategies = strategyId
      ? strategies.filter(s => s.strategyId === strategyId)
      : strategies;

    // Calculate totals
    let performanceFees = BigInt(0);
    let platformRewards = BigInt(0);

    for (const strategy of filteredStrategies) {
      performanceFees += BigInt(strategy.performanceFees);
    }

    // Platform rewards based on period (simplified calculation)
    const periodMultiplier = this.getPeriodMultiplier(period);
    platformRewards = (performanceFees * BigInt(Math.floor(periodMultiplier * 100))) / BigInt(100);

    // Calculate vesting
    const vestingStatus = await this.getVestedAmount(creatorId);
    const vestedAmount = vestingStatus.vestedAmount;
    const claimableAmount = vestingStatus.claimableAmount;

    const total = performanceFees + platformRewards;

    return {
      creatorId,
      period,
      performanceFees: performanceFees.toString(),
      platformRewards: platformRewards.toString(),
      referralRewards: '0',
      bonuses: '0',
      total: total.toString(),
      vestedAmount,
      claimableAmount,
      strategies: filteredStrategies,
    };
  }

  private getPeriodMultiplier(period: string): number {
    switch (period) {
      case 'day': return 0.01;
      case 'week': return 0.07;
      case 'month': return 0.30;
      case 'year': return 1.0;
      case 'all': return 1.0;
      default: return 0.30;
    }
  }

  async getCreatorStrategies(creatorId: string): Promise<StrategyEarnings[]> {
    // In production, fetch from database
    const cached = this.strategyEarnings.get(creatorId);
    if (cached) {
      return cached;
    }

    // Return empty array for unknown creators
    return [];
  }

  // --------------------------------------------------------------------------
  // Distribution
  // --------------------------------------------------------------------------

  async getDistributionSummary(period: string): Promise<DistributionSummary> {
    // Check cache
    const cached = this.distributionHistory.get(period);
    if (cached) {
      return cached;
    }

    // Generate empty summary
    return {
      period,
      totalDistributed: '0',
      byCategory: {
        creators: '0',
        stakers: '0',
        treasury: '0',
        liquidity: '0',
      },
      uniqueRecipients: 0,
      averageReward: '0',
      topRecipients: [],
    };
  }

  async distributeRewards(period: string): Promise<DistributionResult> {
    const now = new Date();

    // Calculate emission for this period
    const emission = this.calculatePeriodEmission(period);

    // Distribute according to fee distribution config
    const byCategory: CategoryDistribution = {
      creators: ((BigInt(emission) * BigInt(Math.floor(this.config.feeDistribution.creators * 1000))) / BigInt(1000)).toString(),
      stakers: ((BigInt(emission) * BigInt(Math.floor(this.config.feeDistribution.stakers * 1000))) / BigInt(1000)).toString(),
      treasury: ((BigInt(emission) * BigInt(Math.floor(this.config.feeDistribution.treasury * 1000))) / BigInt(1000)).toString(),
      liquidity: ((BigInt(emission) * BigInt(Math.floor(this.config.feeDistribution.liquidity * 1000))) / BigInt(1000)).toString(),
    };

    // Update total emitted
    this.totalEmitted += BigInt(emission);

    // Create summary
    const summary: DistributionSummary = {
      period,
      totalDistributed: emission,
      byCategory,
      uniqueRecipients: 0, // Would count actual recipients
      averageReward: emission,
      topRecipients: [],
    };

    // Store in history
    this.distributionHistory.set(period, summary);

    // Emit event
    this.emitEvent({
      type: 'rewards_distributed',
      category: 'rewards',
      data: {
        period,
        totalDistributed: emission,
        byCategory,
      },
    });

    return {
      success: true,
      period,
      totalDistributed: emission,
      byCategory,
      recipientCount: 0,
      timestamp: now,
    };
  }

  private calculatePeriodEmission(period: string): string {
    // Get current year emission
    const currentYear = new Date().getFullYear();
    const startYear = 2026;
    const yearNum = currentYear - startYear + 1;
    const yearKey = `year${Math.min(yearNum, 4)}`;

    const yearlyEmission = BigInt(this.config.emissionSchedule[yearKey] ?? '0');

    // Calculate period portion
    switch (period) {
      case 'hourly': return (yearlyEmission / BigInt(365 * 24)).toString();
      case 'daily': return (yearlyEmission / BigInt(365)).toString();
      case 'weekly': return (yearlyEmission / BigInt(52)).toString();
      case 'monthly': return (yearlyEmission / BigInt(12)).toString();
      default: return (yearlyEmission / BigInt(365)).toString();
    }
  }

  // --------------------------------------------------------------------------
  // Performance Fees
  // --------------------------------------------------------------------------

  calculatePerformanceFees(params: PerformanceFeeParams): PerformanceFeeCalculation {
    const {
      strategyId,
      profitAmount,
      previousHighWaterMark,
      currentValue,
      performanceFeeRate = 0.20,
      platformFeeRate = 0.01,
    } = params;

    const hwm = BigInt(previousHighWaterMark);
    const current = BigInt(currentValue);

    // Only charge fees on profit above high water mark
    const eligibleProfit = current > hwm ? current - hwm : BigInt(0);

    // Calculate fees
    const creatorFee = (eligibleProfit * BigInt(Math.floor(performanceFeeRate * 1000))) / BigInt(1000);
    const platformFee = (eligibleProfit * BigInt(Math.floor(platformFeeRate * 1000))) / BigInt(1000);
    const totalFees = creatorFee + platformFee;
    const userReceives = eligibleProfit - totalFees;

    // New high water mark
    const newHighWaterMark = current > hwm ? current.toString() : hwm.toString();

    return {
      strategyId,
      profitAmount,
      eligibleProfit: eligibleProfit.toString(),
      creatorFee: creatorFee.toString(),
      platformFee: platformFee.toString(),
      userReceives: userReceives.toString(),
      highWaterMark: hwm.toString(),
      newHighWaterMark,
    };
  }

  async getHighWaterMark(strategyId: string): Promise<string> {
    return this.highWaterMarks.get(strategyId) ?? '0';
  }

  async updateHighWaterMark(strategyId: string, value: string): Promise<void> {
    const current = BigInt(this.highWaterMarks.get(strategyId) ?? '0');
    const newValue = BigInt(value);

    if (newValue > current) {
      this.highWaterMarks.set(strategyId, value);
    }
  }

  // --------------------------------------------------------------------------
  // Vesting
  // --------------------------------------------------------------------------

  async getVestedAmount(userId: string): Promise<VestingStatus> {
    const schedules = this.vestingSchedules.get(userId) ?? [];
    const now = new Date();

    let totalAllocated = BigInt(0);
    let vestedAmount = BigInt(0);
    let claimedAmount = BigInt(0);
    let lockedAmount = BigInt(0);

    let earliestStart = now;
    let latestEnd = now;
    let earliestCliff = now;

    for (const schedule of schedules) {
      totalAllocated += BigInt(schedule.totalAmount);
      vestedAmount += BigInt(schedule.vestedAmount);
      claimedAmount += BigInt(schedule.claimedAmount);

      if (schedule.startDate < earliestStart) earliestStart = schedule.startDate;
      if (schedule.endDate > latestEnd) latestEnd = schedule.endDate;
      if (schedule.cliffEndDate > earliestCliff) earliestCliff = schedule.cliffEndDate;
    }

    lockedAmount = totalAllocated - vestedAmount;
    const claimableAmount = vestedAmount - claimedAmount;

    // Calculate next vesting
    let nextVestingDate: Date | undefined;
    let nextVestingAmount: string | undefined;

    if (lockedAmount > BigInt(0)) {
      // Simplified: vest daily
      nextVestingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const remainingDays = Math.ceil((latestEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (remainingDays > 0) {
        nextVestingAmount = (lockedAmount / BigInt(remainingDays)).toString();
      }
    }

    return {
      userId,
      totalAllocated: totalAllocated.toString(),
      vestedAmount: vestedAmount.toString(),
      claimableAmount: claimableAmount.toString(),
      claimedAmount: claimedAmount.toString(),
      lockedAmount: lockedAmount.toString(),
      vestingStartDate: earliestStart,
      cliffEndDate: earliestCliff,
      vestingEndDate: latestEnd,
      nextVestingDate,
      nextVestingAmount,
    };
  }

  async claimVestedTokens(userId: string): Promise<ClaimVestedResult> {
    const status = await this.getVestedAmount(userId);
    const claimable = BigInt(status.claimableAmount);

    if (claimable === BigInt(0)) {
      return {
        success: false,
        amount: '0',
        remaining: status.lockedAmount,
      };
    }

    // Update schedules
    const schedules = this.vestingSchedules.get(userId) ?? [];
    let remainingToClaim = claimable;

    for (const schedule of schedules) {
      const scheduleClaimed = BigInt(schedule.claimedAmount);
      const scheduleVested = BigInt(schedule.vestedAmount);
      const scheduleClaimable = scheduleVested - scheduleClaimed;

      if (scheduleClaimable > BigInt(0) && remainingToClaim > BigInt(0)) {
        const toClaimFromSchedule = remainingToClaim < scheduleClaimable ? remainingToClaim : scheduleClaimable;
        schedule.claimedAmount = (scheduleClaimed + toClaimFromSchedule).toString();
        remainingToClaim -= toClaimFromSchedule;
      }
    }

    return {
      success: true,
      amount: claimable.toString(),
      remaining: status.lockedAmount,
      nextVestingDate: status.nextVestingDate,
      nextVestingAmount: status.nextVestingAmount,
    };
  }

  async createVestingSchedule(params: VestingScheduleParams): Promise<VestingSchedule> {
    const now = new Date();
    const startDate = params.startDate ?? now;
    const cliff = params.cliff ?? this.config.vestingCliff;
    const duration = params.duration ?? this.config.vestingDuration;
    const immediateRelease = params.immediateRelease ?? this.config.immediateReleasePercent;

    const cliffEndDate = new Date(startDate.getTime() + cliff * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

    // Calculate immediate vested amount
    const totalAmount = BigInt(params.totalAmount);
    const immediateAmount = (totalAmount * BigInt(Math.floor(immediateRelease * 1000))) / BigInt(1000);

    const schedule: VestingSchedule = {
      id: `vest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      totalAmount: params.totalAmount,
      vestedAmount: immediateAmount.toString(),
      claimedAmount: '0',
      startDate,
      cliffEndDate,
      endDate,
      immediateRelease,
      status: 'active',
    };

    // Store schedule
    if (!this.vestingSchedules.has(params.userId)) {
      this.vestingSchedules.set(params.userId, []);
    }
    this.vestingSchedules.get(params.userId)!.push(schedule);

    return schedule;
  }

  // --------------------------------------------------------------------------
  // Emission
  // --------------------------------------------------------------------------

  getCurrentEmissionRate(): string {
    const currentYear = new Date().getFullYear();
    const startYear = 2026;
    const yearNum = currentYear - startYear + 1;
    const yearKey = `year${Math.min(yearNum, 4)}`;

    return this.config.emissionSchedule[yearKey] ?? '0';
  }

  getTotalEmitted(): string {
    return this.totalEmitted.toString();
  }

  getEmissionSchedule(): EmissionSchedule {
    return this.config.emissionSchedule;
  }

  // --------------------------------------------------------------------------
  // Event Functions
  // --------------------------------------------------------------------------

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<TokenomicsEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TokenomicsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // --------------------------------------------------------------------------
  // Internal: For testing/development
  // --------------------------------------------------------------------------

  /**
   * Record strategy earnings (for testing)
   */
  recordStrategyEarnings(creatorId: string, earnings: StrategyEarnings): void {
    if (!this.strategyEarnings.has(creatorId)) {
      this.strategyEarnings.set(creatorId, []);
    }
    this.strategyEarnings.get(creatorId)!.push(earnings);
  }

  /**
   * Update vesting (simulate time passing)
   */
  updateVesting(): void {
    const now = new Date();

    for (const schedules of this.vestingSchedules.values()) {
      for (const schedule of schedules) {
        if (schedule.status !== 'active') continue;
        if (now < schedule.cliffEndDate) continue;

        // Calculate vested amount
        const totalDuration = schedule.endDate.getTime() - schedule.cliffEndDate.getTime();
        const elapsed = Math.min(now.getTime() - schedule.cliffEndDate.getTime(), totalDuration);
        const vestedRatio = elapsed / totalDuration;

        const totalAmount = BigInt(schedule.totalAmount);
        const immediateAmount = (totalAmount * BigInt(Math.floor(schedule.immediateRelease * 1000))) / BigInt(1000);
        const vestingAmount = totalAmount - immediateAmount;
        const vestedFromLinear = (vestingAmount * BigInt(Math.floor(vestedRatio * 1000))) / BigInt(1000);

        schedule.vestedAmount = (immediateAmount + vestedFromLinear).toString();

        if (now >= schedule.endDate) {
          schedule.vestedAmount = schedule.totalAmount;
          schedule.status = 'completed';
        }
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRewardsDistributor(config?: Partial<RewardsConfig>): DefaultRewardsDistributor {
  return new DefaultRewardsDistributor(config);
}

export default DefaultRewardsDistributor;
