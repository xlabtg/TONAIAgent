/**
 * TONAIAgent - Fee Distribution System
 *
 * Manages collection and distribution of fund fees:
 * - Management fee: charged annually as a percentage of AUM (accrued daily)
 * - Performance fee: charged on profits above the high-water mark
 *
 * Fees are distributed to:
 * - Fund creator (primary beneficiary)
 * - Strategy developers (proportional to capital allocation)
 * - Platform treasury (protocol sustainability)
 */

import {
  FeeCollectionEvent,
  FeeEarnings,
  FundConfig,
  FundManagerError,
  FundManagerEventHandler,
  FundManagerEventType,
  FundManagerUnsubscribe,
  FundPortfolio,
} from './types';

// ============================================================================
// Fee Distribution Engine
// ============================================================================

/** Configuration for the FeeDistributionEngine */
export interface FeeDistributionConfig {
  /** Maximum management fee percent allowed */
  maxManagementFeePercent: number;
  /** Maximum performance fee percent allowed */
  maxPerformanceFeePercent: number;
  /** Minimum payout amount (skip payout if below this) */
  minPayoutAmount: bigint;
}

const DEFAULT_CONFIG: FeeDistributionConfig = {
  maxManagementFeePercent: 5.0,
  maxPerformanceFeePercent: 30.0,
  minPayoutAmount: BigInt(100_000_000), // 0.1 TON
};

export class FeeDistributionEngine {
  private readonly config: FeeDistributionConfig;
  /** fundId -> high-water mark (peak NAV per share) */
  private readonly highWaterMarks = new Map<string, bigint>();
  /** fundId -> last management fee collection timestamp */
  private readonly lastManagementFeeAt = new Map<string, Date>();
  /** recipientId -> FeeEarnings[] (one per fund) */
  private readonly earnings = new Map<string, FeeEarnings>();
  private readonly feeEvents: FeeCollectionEvent[] = [];
  private readonly eventHandlers = new Set<FundManagerEventHandler>();

  constructor(config: Partial<FeeDistributionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Management Fee
  // ============================================================================

  /**
   * Calculate and collect accrued management fee.
   *
   * Management fee is charged annually as a percent of AUM, accrued daily.
   * Returns the fee collection event, or null if nothing to collect.
   */
  collectManagementFee(
    fund: FundConfig,
    portfolio: FundPortfolio
  ): FeeCollectionEvent | null {
    if (fund.fees.managementFeePercent <= 0 || portfolio.totalAum === BigInt(0)) {
      return null;
    }

    const now = new Date();
    const lastCollection = this.lastManagementFeeAt.get(fund.fundId);

    // Calculate days elapsed since last collection
    const daysElapsed = lastCollection
      ? (now.getTime() - lastCollection.getTime()) / 86400000
      : 1;

    if (daysElapsed < 1) return null; // Too soon

    // Daily management fee = annual fee / 365
    const annualFeePercent = Math.min(fund.fees.managementFeePercent, this.config.maxManagementFeePercent);
    const dailyFeePercent = annualFeePercent / 365;
    const feeAmount = BigInt(Math.floor(
      Number(portfolio.totalAum) * (dailyFeePercent / 100) * daysElapsed
    ));

    if (feeAmount < this.config.minPayoutAmount) return null;

    this.lastManagementFeeAt.set(fund.fundId, now);

    return this.distributeFee(fund, portfolio, 'management', feeAmount, now);
  }

  // ============================================================================
  // Performance Fee
  // ============================================================================

  /**
   * Calculate and collect performance fee.
   *
   * Performance fee is charged on profits above the high-water mark.
   * High-water mark is the peak NAV per share since fund inception.
   * Returns the fee collection event, or null if nothing to collect.
   */
  collectPerformanceFee(
    fund: FundConfig,
    portfolio: FundPortfolio
  ): FeeCollectionEvent | null {
    if (fund.fees.performanceFeePercent <= 0 || portfolio.totalSharesOutstanding === BigInt(0)) {
      return null;
    }

    const currentNav = portfolio.navPerShare;
    const hwm = this.highWaterMarks.get(fund.fundId) ?? BigInt(0);

    // Only collect if current NAV exceeds high-water mark
    if (currentNav <= hwm) {
      // Update HWM if it's the first collection
      if (hwm === BigInt(0)) {
        this.highWaterMarks.set(fund.fundId, currentNav);
      }
      return null;
    }

    const navGain = currentNav - hwm;
    const perfFeePercent = Math.min(
      fund.fees.performanceFeePercent,
      this.config.maxPerformanceFeePercent
    );

    // Performance fee = (NAV gain * shares outstanding) * fee percent
    const profitAmount = (navGain * portfolio.totalSharesOutstanding) / BigInt(1_000_000_000);
    const feeAmount = BigInt(Math.floor(Number(profitAmount) * (perfFeePercent / 100)));

    if (feeAmount < this.config.minPayoutAmount) return null;

    // Update high-water mark
    this.highWaterMarks.set(fund.fundId, currentNav);

    const now = new Date();
    return this.distributeFee(fund, portfolio, 'performance', feeAmount, now, hwm);
  }

  // ============================================================================
  // Fee Distribution Logic
  // ============================================================================

  private distributeFee(
    fund: FundConfig,
    portfolio: FundPortfolio,
    feeType: 'management' | 'performance',
    totalAmount: bigint,
    now: Date,
    highWaterMark?: bigint
  ): FeeCollectionEvent {
    const distributions = fund.fees.feeRecipients.map((recipient) => ({
      recipientId: recipient.recipientId,
      recipientType: recipient.recipientType,
      amount: (totalAmount * BigInt(Math.round(recipient.sharePercent * 100))) / BigInt(10000),
      sharePercent: recipient.sharePercent,
    }));

    // Update earnings for each recipient
    for (const dist of distributions) {
      const earningsKey = `${dist.recipientId}:${fund.fundId}`;
      const existing = this.earnings.get(earningsKey) ?? {
        recipientId: dist.recipientId,
        fundId: fund.fundId,
        totalManagementFees: BigInt(0),
        totalPerformanceFees: BigInt(0),
        totalFees: BigInt(0),
        pendingPayout: BigInt(0),
      };

      const updated: FeeEarnings = {
        ...existing,
        totalManagementFees: feeType === 'management'
          ? existing.totalManagementFees + dist.amount
          : existing.totalManagementFees,
        totalPerformanceFees: feeType === 'performance'
          ? existing.totalPerformanceFees + dist.amount
          : existing.totalPerformanceFees,
        totalFees: existing.totalFees + dist.amount,
        pendingPayout: existing.pendingPayout + dist.amount,
      };
      this.earnings.set(earningsKey, updated);
    }

    const event: FeeCollectionEvent = {
      eventId: `fee-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fundId: fund.fundId,
      feeType,
      totalAmount,
      distributions,
      aumAtCollection: portfolio.totalAum,
      highWaterMark: highWaterMark,
      collectedAt: now,
    };

    this.feeEvents.push(event);

    const eventType: FundManagerEventType = feeType === 'management'
      ? 'fee.management_collected'
      : 'fee.performance_collected';

    this.emitEvent(eventType, fund.fundId, {
      fundId: fund.fundId,
      feeType,
      totalAmount: totalAmount.toString(),
      recipientCount: distributions.length,
    });

    return event;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  getHighWaterMark(fundId: string): bigint {
    return this.highWaterMarks.get(fundId) ?? BigInt(0);
  }

  setHighWaterMark(fundId: string, navPerShare: bigint): void {
    const current = this.highWaterMarks.get(fundId) ?? BigInt(0);
    if (navPerShare > current) {
      this.highWaterMarks.set(fundId, navPerShare);
    }
  }

  getEarnings(recipientId: string, fundId: string): FeeEarnings | undefined {
    return this.earnings.get(`${recipientId}:${fundId}`);
  }

  getAllEarningsForFund(fundId: string): FeeEarnings[] {
    return Array.from(this.earnings.values()).filter((e) => e.fundId === fundId);
  }

  getFeeHistory(fundId: string): FeeCollectionEvent[] {
    return this.feeEvents.filter((e) => e.fundId === fundId);
  }

  getTotalFeesCollected(fundId: string): bigint {
    return this.feeEvents
      .filter((e) => e.fundId === fundId)
      .reduce((sum, e) => sum + e.totalAmount, BigInt(0));
  }

  /**
   * Process a payout for a recipient — marks their pending earnings as paid.
   */
  processPayout(recipientId: string, fundId: string): bigint {
    const earningsKey = `${recipientId}:${fundId}`;
    const earnings = this.earnings.get(earningsKey);
    if (!earnings || earnings.pendingPayout < this.config.minPayoutAmount) {
      return BigInt(0);
    }

    const payoutAmount = earnings.pendingPayout;
    this.earnings.set(earningsKey, {
      ...earnings,
      pendingPayout: BigInt(0),
      lastPayoutAt: new Date(),
    });

    return payoutAmount;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(type: FundManagerEventType, fundId: string, data: Record<string, unknown>): void {
    const event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      fundId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFeeDistributionEngine(
  config?: Partial<FeeDistributionConfig>
): FeeDistributionEngine {
  return new FeeDistributionEngine(config);
}
