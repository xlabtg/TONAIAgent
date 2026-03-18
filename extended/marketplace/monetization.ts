/**
 * TONAIAgent - Monetization Module
 *
 * Implements performance fees, subscription models, revenue sharing,
 * creator rewards, referral incentives, and payout processing.
 */

import {
  FeeStructure,
  Fee,
  FeeType,
  RevenueShare,
  MonetizationStats,
  Payout,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Monetization Manager Interface
// ============================================================================

export interface MonetizationManager {
  // Fee structure management
  createFeeStructure(input: CreateFeeStructureInput): Promise<FeeStructure>;
  getFeeStructure(structureId: string): Promise<FeeStructure | null>;
  updateFeeStructure(structureId: string, updates: UpdateFeeStructureInput): Promise<FeeStructure>;
  deactivateFeeStructure(structureId: string): Promise<void>;
  getActiveFeeStructure(creatorId: string, strategyId?: string, agentId?: string): Promise<FeeStructure | null>;

  // Fee calculations
  calculateFees(input: FeeCalculationInput): Promise<FeeCalculationResult>;
  calculatePerformanceFee(pnl: number, feeRate: number, highWaterMark?: number): number;
  calculateManagementFee(capitalManaged: number, feeRate: number, periodDays: number): number;

  // Revenue tracking
  recordRevenue(input: RecordRevenueInput): Promise<void>;
  getMonetizationStats(creatorId: string, period: StatsPeriod): Promise<MonetizationStats>;
  getCreatorEarnings(creatorId: string): Promise<CreatorEarnings>;

  // Payouts
  schedulePayout(input: SchedulePayoutInput): Promise<Payout>;
  getPayout(payoutId: string): Promise<Payout | null>;
  getPayoutHistory(recipientId: string, limit?: number): Promise<Payout[]>;
  processPendingPayouts(): Promise<ProcessPayoutsResult>;

  // Referrals
  registerReferral(referrerId: string, referredId: string): Promise<void>;
  getReferralStats(referrerId: string): Promise<ReferralStats>;
  calculateReferralBonus(referralId: string, transactionAmount: number): number;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateFeeStructureInput {
  creatorId: string;
  strategyId?: string;
  agentId?: string;
  fees: Fee[];
  revenueShare: RevenueShare;
}

export interface UpdateFeeStructureInput {
  fees?: Fee[];
  revenueShare?: Partial<RevenueShare>;
  effectiveUntil?: Date;
}

export interface FeeCalculationInput {
  creatorId: string;
  strategyId?: string;
  agentId?: string;
  pnl?: number;
  capitalManaged?: number;
  periodDays?: number;
  transactionAmount?: number;
  tradeCount?: number;
  highWaterMark?: number;
}

export interface FeeCalculationResult {
  performanceFee: number;
  managementFee: number;
  subscriptionFee: number;
  platformFee: number;
  totalFees: number;
  breakdown: FeeBreakdown[];
  creatorEarnings: number;
  platformEarnings: number;
  referrerEarnings: number;
}

export interface FeeBreakdown {
  type: FeeType;
  rate: number;
  amount: number;
  basis: string;
}

export interface RecordRevenueInput {
  creatorId: string;
  agentId?: string;
  type: FeeType;
  amount: number;
  sourceUserId: string;
  transactionId?: string;
}

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'all_time';

export interface CreatorEarnings {
  creatorId: string;
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  earningSources: EarningSource[];
  periodEarnings: Record<StatsPeriod, number>;
  followerCount: number;
  totalCapitalManaged: number;
}

export interface EarningSource {
  type: FeeType;
  amount: number;
  percentage: number;
}

export interface SchedulePayoutInput {
  recipientId: string;
  recipientType: 'creator' | 'referrer' | 'platform' | 'staker';
  amount: number;
  currency?: string;
}

export interface ProcessPayoutsResult {
  processed: number;
  successful: number;
  failed: number;
  totalAmount: number;
  failedPayouts: string[];
}

export interface ReferralStats {
  referrerId: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  referralsByPeriod: Record<StatsPeriod, number>;
}

// ============================================================================
// Default Monetization Manager Implementation
// ============================================================================

export class DefaultMonetizationManager implements MonetizationManager {
  private readonly feeStructures: Map<string, FeeStructure> = new Map();
  private readonly payouts: Map<string, Payout> = new Map();
  private readonly revenueRecords: Map<string, RevenueRecord[]> = new Map();
  private readonly referrals: Map<string, Referral[]> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: MonetizationConfig;

  constructor(config?: Partial<MonetizationConfig>) {
    this.config = {
      platformFeePercent: config?.platformFeePercent ?? 2.5,
      maxPerformanceFee: config?.maxPerformanceFee ?? 30,
      maxManagementFee: config?.maxManagementFee ?? 2,
      payoutFrequency: config?.payoutFrequency ?? 'weekly',
      minPayoutAmount: config?.minPayoutAmount ?? 10,
      referralBonusPercent: config?.referralBonusPercent ?? 10,
      referralDurationDays: config?.referralDurationDays ?? 365,
      highWaterMarkEnabled: config?.highWaterMarkEnabled ?? true,
    };
  }

  async createFeeStructure(input: CreateFeeStructureInput): Promise<FeeStructure> {
    // Validate fees
    this.validateFees(input.fees);
    this.validateRevenueShare(input.revenueShare);

    const structureId = this.generateId('fee_structure');
    const now = new Date();

    const feeStructure: FeeStructure = {
      id: structureId,
      strategyId: input.strategyId,
      agentId: input.agentId,
      creatorId: input.creatorId,
      fees: input.fees,
      revenueShare: input.revenueShare,
      effectiveFrom: now,
    };

    this.feeStructures.set(structureId, feeStructure);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'payout_processed', // Using available event type
      severity: 'info',
      source: 'monetization_manager',
      message: `Fee structure created for creator ${input.creatorId}`,
      data: { structureId, creatorId: input.creatorId },
    });

    return feeStructure;
  }

  async getFeeStructure(structureId: string): Promise<FeeStructure | null> {
    return this.feeStructures.get(structureId) ?? null;
  }

  async updateFeeStructure(structureId: string, updates: UpdateFeeStructureInput): Promise<FeeStructure> {
    const structure = await this.getFeeStructure(structureId);
    if (!structure) {
      throw new Error(`Fee structure not found: ${structureId}`);
    }

    if (updates.fees) {
      this.validateFees(updates.fees);
    }

    const updatedStructure: FeeStructure = {
      ...structure,
      fees: updates.fees ?? structure.fees,
      revenueShare: updates.revenueShare
        ? { ...structure.revenueShare, ...updates.revenueShare }
        : structure.revenueShare,
      effectiveUntil: updates.effectiveUntil,
    };

    this.feeStructures.set(structureId, updatedStructure);
    return updatedStructure;
  }

  async deactivateFeeStructure(structureId: string): Promise<void> {
    const structure = await this.getFeeStructure(structureId);
    if (!structure) {
      throw new Error(`Fee structure not found: ${structureId}`);
    }

    const updatedStructure: FeeStructure = {
      ...structure,
      effectiveUntil: new Date(),
    };

    this.feeStructures.set(structureId, updatedStructure);
  }

  async getActiveFeeStructure(
    creatorId: string,
    strategyId?: string,
    agentId?: string
  ): Promise<FeeStructure | null> {
    const now = new Date();

    for (const structure of this.feeStructures.values()) {
      if (structure.creatorId !== creatorId) continue;
      if (structure.effectiveUntil && structure.effectiveUntil < now) continue;

      // Match by most specific (agent > strategy > creator)
      if (agentId && structure.agentId === agentId) return structure;
      if (strategyId && structure.strategyId === strategyId && !structure.agentId) return structure;
      if (!structure.strategyId && !structure.agentId) return structure;
    }

    return null;
  }

  async calculateFees(input: FeeCalculationInput): Promise<FeeCalculationResult> {
    const structure = await this.getActiveFeeStructure(
      input.creatorId,
      input.strategyId,
      input.agentId
    );

    const breakdown: FeeBreakdown[] = [];
    let performanceFee = 0;
    let managementFee = 0;
    let subscriptionFee = 0;
    let platformFee = 0;

    if (structure) {
      for (const fee of structure.fees) {
        switch (fee.type) {
          case 'performance':
            if (input.pnl && input.pnl > 0) {
              const effectivePnl = this.config.highWaterMarkEnabled && input.highWaterMark
                ? Math.max(0, input.pnl - input.highWaterMark)
                : input.pnl;
              performanceFee = this.calculatePerformanceFee(effectivePnl, fee.rate);
              breakdown.push({
                type: 'performance',
                rate: fee.rate,
                amount: performanceFee,
                basis: `${effectivePnl.toFixed(2)} TON profit`,
              });
            }
            break;

          case 'management':
            if (input.capitalManaged) {
              managementFee = this.calculateManagementFee(
                input.capitalManaged,
                fee.rate,
                input.periodDays ?? 30
              );
              breakdown.push({
                type: 'management',
                rate: fee.rate,
                amount: managementFee,
                basis: `${input.capitalManaged.toFixed(2)} TON managed`,
              });
            }
            break;

          case 'subscription':
            subscriptionFee = fee.minAmount ?? 0;
            breakdown.push({
              type: 'subscription',
              rate: fee.rate,
              amount: subscriptionFee,
              basis: 'Monthly subscription',
            });
            break;
        }
      }
    }

    // Platform fee is always calculated
    const totalBeforePlatform = performanceFee + managementFee + subscriptionFee;
    platformFee = totalBeforePlatform * (this.config.platformFeePercent / 100);
    breakdown.push({
      type: 'platform',
      rate: this.config.platformFeePercent,
      amount: platformFee,
      basis: 'Platform fee',
    });

    const totalFees = totalBeforePlatform + platformFee;

    // Calculate earnings split
    const revenueShare = structure?.revenueShare ?? {
      creatorShare: 70,
      platformShare: 25,
      referrerShare: 5,
    };

    const creatorEarnings = (totalBeforePlatform * revenueShare.creatorShare) / 100;
    const platformEarnings = platformFee + ((totalBeforePlatform * revenueShare.platformShare) / 100);
    const referrerEarnings = (totalBeforePlatform * revenueShare.referrerShare) / 100;

    return {
      performanceFee,
      managementFee,
      subscriptionFee,
      platformFee,
      totalFees,
      breakdown,
      creatorEarnings,
      platformEarnings,
      referrerEarnings,
    };
  }

  calculatePerformanceFee(pnl: number, feeRate: number, _highWaterMark?: number): number {
    if (pnl <= 0) return 0;

    const cappedRate = Math.min(feeRate, this.config.maxPerformanceFee);
    return (pnl * cappedRate) / 100;
  }

  calculateManagementFee(capitalManaged: number, feeRate: number, periodDays: number): number {
    if (capitalManaged <= 0) return 0;

    const cappedRate = Math.min(feeRate, this.config.maxManagementFee);
    // Prorate annual fee
    const annualFee = (capitalManaged * cappedRate) / 100;
    return (annualFee * periodDays) / 365;
  }

  async recordRevenue(input: RecordRevenueInput): Promise<void> {
    const record: RevenueRecord = {
      id: this.generateId('revenue'),
      creatorId: input.creatorId,
      agentId: input.agentId,
      type: input.type,
      amount: input.amount,
      sourceUserId: input.sourceUserId,
      transactionId: input.transactionId,
      timestamp: new Date(),
    };

    const creatorRecords = this.revenueRecords.get(input.creatorId) ?? [];
    creatorRecords.push(record);
    this.revenueRecords.set(input.creatorId, creatorRecords);
  }

  async getMonetizationStats(creatorId: string, period: StatsPeriod): Promise<MonetizationStats> {
    const records = this.revenueRecords.get(creatorId) ?? [];
    const filteredRecords = this.filterRecordsByPeriod(records, period);

    const stats: MonetizationStats = {
      creatorId,
      period,
      totalRevenue: 0,
      performanceFees: 0,
      managementFees: 0,
      subscriptionFees: 0,
      referralFees: 0,
      platformFees: 0,
      netEarnings: 0,
      followerCount: 0,
      capitalUnderManagement: 0,
      periodStart: this.getPeriodStart(period),
      periodEnd: new Date(),
    };

    for (const record of filteredRecords) {
      stats.totalRevenue += record.amount;
      switch (record.type) {
        case 'performance':
          stats.performanceFees += record.amount;
          break;
        case 'management':
          stats.managementFees += record.amount;
          break;
        case 'subscription':
          stats.subscriptionFees += record.amount;
          break;
        case 'referral':
          stats.referralFees += record.amount;
          break;
        case 'platform':
          stats.platformFees += record.amount;
          break;
      }
    }

    stats.netEarnings = stats.totalRevenue - stats.platformFees;

    return stats;
  }

  async getCreatorEarnings(creatorId: string): Promise<CreatorEarnings> {
    const records = this.revenueRecords.get(creatorId) ?? [];
    const payouts = Array.from(this.payouts.values()).filter(p => p.recipientId === creatorId);

    const pendingPayouts = payouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const completedPayouts = payouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalEarnings = records.reduce((sum, r) => sum + r.amount, 0);

    // Calculate earnings by source type
    const sourceMap = new Map<FeeType, number>();
    for (const record of records) {
      const current = sourceMap.get(record.type) ?? 0;
      sourceMap.set(record.type, current + record.amount);
    }

    const earningSources: EarningSource[] = [];
    for (const [type, amount] of sourceMap.entries()) {
      earningSources.push({
        type,
        amount,
        percentage: totalEarnings > 0 ? (amount / totalEarnings) * 100 : 0,
      });
    }

    // Calculate period earnings
    const periodEarnings: Record<StatsPeriod, number> = {
      day: this.calculatePeriodEarnings(records, 'day'),
      week: this.calculatePeriodEarnings(records, 'week'),
      month: this.calculatePeriodEarnings(records, 'month'),
      year: this.calculatePeriodEarnings(records, 'year'),
      all_time: totalEarnings,
    };

    return {
      creatorId,
      totalEarnings,
      pendingPayouts,
      completedPayouts,
      earningSources,
      periodEarnings,
      followerCount: 0, // Would be fetched from copy trading engine
      totalCapitalManaged: 0, // Would be fetched from copy trading engine
    };
  }

  async schedulePayout(input: SchedulePayoutInput): Promise<Payout> {
    if (input.amount < this.config.minPayoutAmount) {
      throw new Error(`Minimum payout amount is ${this.config.minPayoutAmount} TON`);
    }

    const payoutId = this.generateId('payout');
    const now = new Date();

    const payout: Payout = {
      id: payoutId,
      recipientId: input.recipientId,
      recipientType: input.recipientType,
      amount: input.amount,
      currency: input.currency ?? 'TON',
      status: 'pending',
      fees: input.amount * 0.001, // 0.1% transaction fee
      netAmount: input.amount * 0.999,
      createdAt: now,
    };

    this.payouts.set(payoutId, payout);

    return payout;
  }

  async getPayout(payoutId: string): Promise<Payout | null> {
    return this.payouts.get(payoutId) ?? null;
  }

  async getPayoutHistory(recipientId: string, limit?: number): Promise<Payout[]> {
    const payouts = Array.from(this.payouts.values())
      .filter(p => p.recipientId === recipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return limit ? payouts.slice(0, limit) : payouts;
  }

  async processPendingPayouts(): Promise<ProcessPayoutsResult> {
    const pendingPayouts = Array.from(this.payouts.values()).filter(p => p.status === 'pending');
    const result: ProcessPayoutsResult = {
      processed: pendingPayouts.length,
      successful: 0,
      failed: 0,
      totalAmount: 0,
      failedPayouts: [],
    };

    const now = new Date();

    for (const payout of pendingPayouts) {
      try {
        // Simulate payout processing
        const updatedPayout: Payout = {
          ...payout,
          status: 'completed',
          txHash: `tx_${this.generateId('hash')}`,
          processedAt: now,
        };

        this.payouts.set(payout.id, updatedPayout);
        result.successful++;
        result.totalAmount += payout.netAmount;

        this.emitEvent({
          id: this.generateId('event'),
          timestamp: now,
          type: 'payout_processed',
          severity: 'info',
          source: 'monetization_manager',
          message: `Payout processed: ${payout.netAmount} TON to ${payout.recipientId}`,
          data: { payoutId: payout.id, amount: payout.netAmount, txHash: updatedPayout.txHash },
        });
      } catch (error) {
        const updatedPayout: Payout = {
          ...payout,
          status: 'failed',
          processedAt: now,
        };
        this.payouts.set(payout.id, updatedPayout);
        result.failed++;
        result.failedPayouts.push(payout.id);
      }
    }

    return result;
  }

  async registerReferral(referrerId: string, referredId: string): Promise<void> {
    const referral: Referral = {
      id: this.generateId('referral'),
      referrerId,
      referredId,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.referralDurationDays * 24 * 60 * 60 * 1000),
      totalEarnings: 0,
    };

    const referrerReferrals = this.referrals.get(referrerId) ?? [];
    referrerReferrals.push(referral);
    this.referrals.set(referrerId, referrerReferrals);
  }

  async getReferralStats(referrerId: string): Promise<ReferralStats> {
    const referrals = this.referrals.get(referrerId) ?? [];
    const now = new Date();

    const activeReferrals = referrals.filter(
      r => r.status === 'active' && (!r.expiresAt || r.expiresAt > now)
    );

    const totalEarnings = referrals.reduce((sum, r) => sum + r.totalEarnings, 0);

    return {
      referrerId,
      totalReferrals: referrals.length,
      activeReferrals: activeReferrals.length,
      totalEarnings,
      pendingEarnings: 0, // Would calculate from pending payouts
      referralsByPeriod: {
        day: this.countReferralsByPeriod(referrals, 'day'),
        week: this.countReferralsByPeriod(referrals, 'week'),
        month: this.countReferralsByPeriod(referrals, 'month'),
        year: this.countReferralsByPeriod(referrals, 'year'),
        all_time: referrals.length,
      },
    };
  }

  calculateReferralBonus(_referralId: string, transactionAmount: number): number {
    return (transactionAmount * this.config.referralBonusPercent) / 100;
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateFees(fees: Fee[]): void {
    for (const fee of fees) {
      if (fee.rate < 0) {
        throw new Error('Fee rate cannot be negative');
      }

      if (fee.type === 'performance' && fee.rate > this.config.maxPerformanceFee) {
        throw new Error(`Performance fee cannot exceed ${this.config.maxPerformanceFee}%`);
      }

      if (fee.type === 'management' && fee.rate > this.config.maxManagementFee) {
        throw new Error(`Management fee cannot exceed ${this.config.maxManagementFee}%`);
      }
    }
  }

  private validateRevenueShare(share: RevenueShare): void {
    const total = share.creatorShare + share.platformShare + share.referrerShare + (share.stakersShare ?? 0);
    if (Math.abs(total - 100) > 0.01) {
      throw new Error('Revenue share must total 100%');
    }
  }

  private filterRecordsByPeriod(records: RevenueRecord[], period: StatsPeriod): RevenueRecord[] {
    const start = this.getPeriodStart(period);
    return records.filter(r => r.timestamp >= start);
  }

  private getPeriodStart(period: StatsPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all_time':
        return new Date(0);
      default:
        return new Date(0);
    }
  }

  private calculatePeriodEarnings(records: RevenueRecord[], period: StatsPeriod): number {
    const start = this.getPeriodStart(period);
    return records
      .filter(r => r.timestamp >= start)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  private countReferralsByPeriod(referrals: Referral[], period: StatsPeriod): number {
    const start = this.getPeriodStart(period);
    return referrals.filter(r => r.createdAt >= start).length;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface RevenueRecord {
  id: string;
  creatorId: string;
  agentId?: string;
  type: FeeType;
  amount: number;
  sourceUserId: string;
  transactionId?: string;
  timestamp: Date;
}

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt?: Date;
  totalEarnings: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MonetizationConfig {
  platformFeePercent: number;
  maxPerformanceFee: number;
  maxManagementFee: number;
  payoutFrequency: 'daily' | 'weekly' | 'monthly';
  minPayoutAmount: number;
  referralBonusPercent: number;
  referralDurationDays: number;
  highWaterMarkEnabled: boolean;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMonetizationManager(
  config?: Partial<MonetizationConfig>
): DefaultMonetizationManager {
  return new DefaultMonetizationManager(config);
}
