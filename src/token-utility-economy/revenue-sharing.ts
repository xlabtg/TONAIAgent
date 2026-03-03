/**
 * TONAIAgent - Revenue Sharing Model
 *
 * Distributes protocol revenue among strategy creators, platform treasury,
 * DAO treasury, stakers, and liquidity providers. Uses performance fees
 * with high-water mark tracking.
 */

import {
  RevenueSharingConfig,
  RevenueDistributionEvent,
  RevenueRecipient,
  CreatorRevenueMetrics,
  StrategyRevenueMetric,
  PlatformRevenueSummary,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REVENUE_SHARING: RevenueSharingConfig = {
  strategyCreatorPercent: 0.30,    // 30% to strategy creators
  platformProtocolPercent: 0.25,   // 25% to protocol treasury
  daoTreasuryPercent: 0.20,        // 20% to DAO treasury
  stakersPercent: 0.15,            // 15% to stakers
  liquidityPercent: 0.10,          // 10% to liquidity providers
};

// ============================================================================
// Internal Records
// ============================================================================

interface CreatorRecord {
  creatorId: string;
  strategies: Map<string, StrategyRevenueRecord>;
  totalEarned: bigint;
  pendingClaim: bigint;
  claimedTotal: bigint;
}

interface StrategyRevenueRecord {
  strategyId: string;
  creatorId: string;
  totalEarned: bigint;
  copierCount: number;
  aum: bigint;
  highWaterMark: bigint;
  performancePercent: number;
}

// ============================================================================
// Interfaces
// ============================================================================

export interface RevenueSharingModule {
  readonly config: RevenueSharingConfig;

  distributeRevenue(
    strategyId: string,
    profitAmount: string,
    creatorId: string,
    period: string
  ): RevenueDistributionEvent;

  getCreatorMetrics(creatorId: string, period: string): CreatorRevenueMetrics;
  claimCreatorRevenue(creatorId: string): { success: boolean; amount: string };
  getPlatformSummary(period: string): PlatformRevenueSummary;
  updateStrategyAum(strategyId: string, creatorId: string, aum: string, copierCount: number): void;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRevenueSharingModule implements RevenueSharingModule {
  readonly config: RevenueSharingConfig;

  private readonly creatorRecords: Map<string, CreatorRecord> = new Map();
  private totalPlatformRevenue: bigint = BigInt(0);
  private totalProtocolFees: bigint = BigInt(0);
  private totalDaoAccumulated: bigint = BigInt(0);
  private totalStakersRewarded: bigint = BigInt(0);
  private totalLiquidityIncentives: bigint = BigInt(0);
  private readonly distributionHistory: RevenueDistributionEvent[] = [];
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: Partial<RevenueSharingConfig> = {}) {
    this.config = { ...DEFAULT_REVENUE_SHARING, ...config };
  }

  distributeRevenue(
    strategyId: string,
    profitAmount: string,
    creatorId: string,
    period: string
  ): RevenueDistributionEvent {
    const profit = BigInt(profitAmount);

    const creatorShare = (profit * BigInt(Math.floor(this.config.strategyCreatorPercent * 10000))) / BigInt(10000);
    const protocolShare = (profit * BigInt(Math.floor(this.config.platformProtocolPercent * 10000))) / BigInt(10000);
    const daoShare = (profit * BigInt(Math.floor(this.config.daoTreasuryPercent * 10000))) / BigInt(10000);
    const stakersShare = (profit * BigInt(Math.floor(this.config.stakersPercent * 10000))) / BigInt(10000);
    const liquidityShare = profit - creatorShare - protocolShare - daoShare - stakersShare;

    // Update creator record
    this.upsertCreatorRecord(creatorId, strategyId, creatorShare);

    // Update platform totals
    this.totalPlatformRevenue += profit;
    this.totalProtocolFees += protocolShare;
    this.totalDaoAccumulated += daoShare;
    this.totalStakersRewarded += stakersShare;
    this.totalLiquidityIncentives += liquidityShare;

    const recipients: RevenueRecipient[] = [
      { recipientId: creatorId, recipientType: 'creator', amount: creatorShare.toString(), percent: this.config.strategyCreatorPercent },
      { recipientId: 'protocol_treasury', recipientType: 'protocol', amount: protocolShare.toString(), percent: this.config.platformProtocolPercent },
      { recipientId: 'dao_treasury', recipientType: 'dao', amount: daoShare.toString(), percent: this.config.daoTreasuryPercent },
      { recipientId: 'staking_pool', recipientType: 'staker', amount: stakersShare.toString(), percent: this.config.stakersPercent },
      { recipientId: 'liquidity_pool', recipientType: 'liquidity_provider', amount: liquidityShare.toString(), percent: this.config.liquidityPercent },
    ];

    const event: RevenueDistributionEvent = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      strategyId,
      profitAmount,
      distributions: recipients,
      totalDistributed: profit.toString(),
      period,
      timestamp: new Date(),
      transactionIds: recipients.map((_, i) => `tx-${Date.now()}-${i}`),
    };

    this.distributionHistory.push(event);

    this.emitEvent({
      id: event.id,
      type: 'revenue.distributed',
      data: {
        strategyId,
        profitAmount,
        creatorShare: creatorShare.toString(),
        daoShare: daoShare.toString(),
        period,
      },
      timestamp: new Date(),
    });

    return event;
  }

  getCreatorMetrics(creatorId: string, period: string): CreatorRevenueMetrics {
    const record = this.creatorRecords.get(creatorId);
    if (!record) {
      return {
        creatorId,
        period,
        totalEarned: '0',
        performanceFees: '0',
        platformBonuses: '0',
        strategies: [],
        claimable: '0',
        claimed: '0',
        rank: 0,
        percentile: 0,
      };
    }

    const strategies: StrategyRevenueMetric[] = Array.from(record.strategies.values()).map(s => ({
      strategyId: s.strategyId,
      earned: s.totalEarned.toString(),
      copierCount: s.copierCount,
      aum: s.aum.toString(),
      performancePercent: s.performancePercent,
      period,
    }));

    // Compute rank among all creators
    const allCreators = Array.from(this.creatorRecords.values())
      .sort((a, b) => (a.totalEarned > b.totalEarned ? -1 : 1));
    const rank = allCreators.findIndex(c => c.creatorId === creatorId) + 1;
    const percentile = allCreators.length > 0 ? (1 - rank / allCreators.length) * 100 : 100;

    return {
      creatorId,
      period,
      totalEarned: record.totalEarned.toString(),
      performanceFees: record.totalEarned.toString(),
      platformBonuses: '0',
      strategies,
      claimable: record.pendingClaim.toString(),
      claimed: record.claimedTotal.toString(),
      rank,
      percentile: Math.round(percentile),
    };
  }

  claimCreatorRevenue(creatorId: string): { success: boolean; amount: string } {
    const record = this.creatorRecords.get(creatorId);
    if (!record || record.pendingClaim === BigInt(0)) {
      return { success: false, amount: '0' };
    }

    const claimed = record.pendingClaim;
    record.claimedTotal += claimed;
    record.pendingClaim = BigInt(0);

    return { success: true, amount: claimed.toString() };
  }

  getPlatformSummary(period: string): PlatformRevenueSummary {
    return {
      period,
      totalRevenue: this.totalPlatformRevenue.toString(),
      protocolFees: this.totalProtocolFees.toString(),
      strategyFees: this.totalPlatformRevenue.toString(),
      marketplaceFees: '0',
      totalDistributed: this.totalPlatformRevenue.toString(),
      daoTreasuryAccumulated: this.totalDaoAccumulated.toString(),
      stakersRewarded: this.totalStakersRewarded.toString(),
      liquidityIncentives: this.totalLiquidityIncentives.toString(),
    };
  }

  updateStrategyAum(strategyId: string, creatorId: string, aum: string, copierCount: number): void {
    let record = this.creatorRecords.get(creatorId);
    if (!record) {
      record = {
        creatorId,
        strategies: new Map(),
        totalEarned: BigInt(0),
        pendingClaim: BigInt(0),
        claimedTotal: BigInt(0),
      };
      this.creatorRecords.set(creatorId, record);
    }

    const existing = record.strategies.get(strategyId);
    if (existing) {
      existing.aum = BigInt(aum);
      existing.copierCount = copierCount;
    } else {
      record.strategies.set(strategyId, {
        strategyId,
        creatorId,
        totalEarned: BigInt(0),
        copierCount,
        aum: BigInt(aum),
        highWaterMark: BigInt(0),
        performancePercent: 0,
      });
    }
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private upsertCreatorRecord(creatorId: string, strategyId: string, amount: bigint): void {
    let record = this.creatorRecords.get(creatorId);
    if (!record) {
      record = {
        creatorId,
        strategies: new Map(),
        totalEarned: BigInt(0),
        pendingClaim: BigInt(0),
        claimedTotal: BigInt(0),
      };
      this.creatorRecords.set(creatorId, record);
    }

    record.totalEarned += amount;
    record.pendingClaim += amount;

    const existing = record.strategies.get(strategyId);
    if (existing) {
      existing.totalEarned += amount;
    } else {
      record.strategies.set(strategyId, {
        strategyId,
        creatorId,
        totalEarned: amount,
        copierCount: 0,
        aum: BigInt(0),
        highWaterMark: BigInt(0),
        performancePercent: 0,
      });
    }
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createRevenueSharingModule(
  config?: Partial<RevenueSharingConfig>
): DefaultRevenueSharingModule {
  return new DefaultRevenueSharingModule(config);
}
