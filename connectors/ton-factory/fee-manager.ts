/**
 * TONAIAgent - Fee & Revenue Manager
 *
 * Handles all fee types:
 * - Performance fee (% of profits)
 * - Protocol fee (% of volume)
 * - Marketplace commission
 * - Referral rewards
 * - Gas fee tracking
 *
 * Revenue routing: treasury, creators, referrers.
 */

import {
  FeeConfig,
  FeeRecord,
  FeeType,
  RevenueDistribution,
  TonAddress,
  AgentId,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  performanceFeeBps: 1000,    // 10% of profits
  protocolFeeBps: 50,         // 0.5% of volume
  marketplaceCommissionBps: 200, // 2% marketplace commission
  referralCommissionBps: 100, // 1% referral commission
  treasury: '0:0000000000000000000000000000000000000000000000000000000000000000',
  minFeeNano: BigInt(1_000_000), // Minimum 0.001 TON fee
};

// ============================================================================
// Creator Balance Tracking
// ============================================================================

export interface CreatorBalance {
  /** Creator's TON address */
  address: TonAddress;
  /** Total earned (pending + paid) */
  totalEarned: bigint;
  /** Pending payout amount */
  pendingPayout: bigint;
  /** Total paid out */
  totalPaidOut: bigint;
  /** Last payout timestamp */
  lastPayoutAt?: Date;
}

// ============================================================================
// Fee Manager
// ============================================================================

/**
 * Manages fee collection, revenue distribution, and creator payouts.
 */
export class FeeManager {
  private readonly config: FeeConfig;
  private readonly feeRecords: Map<string, FeeRecord> = new Map();
  private readonly agentFees: Map<AgentId, string[]> = new Map();
  private readonly creatorBalances: Map<TonAddress, CreatorBalance> = new Map();
  private readonly referralMap: Map<AgentId, TonAddress> = new Map();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private feeCounter = 0;
  private totalProtocolRevenue = BigInt(0);

  constructor(config: Partial<FeeConfig> = {}) {
    this.config = { ...DEFAULT_FEE_CONFIG, ...config };
  }

  // ============================================================================
  // Fee Calculation
  // ============================================================================

  /**
   * Calculate performance fee on profit.
   * @param profit Profit in nanoTON
   * @returns Fee amount in nanoTON
   */
  calculatePerformanceFee(profit: bigint): bigint {
    if (profit <= BigInt(0)) return BigInt(0);
    const fee = (profit * BigInt(this.config.performanceFeeBps)) / BigInt(10000);
    return fee < this.config.minFeeNano ? BigInt(0) : fee;
  }

  /**
   * Calculate protocol fee on transaction volume.
   * @param volume Volume in nanoTON
   * @returns Fee amount in nanoTON
   */
  calculateProtocolFee(volume: bigint): bigint {
    if (volume <= BigInt(0)) return BigInt(0);
    const fee = (volume * BigInt(this.config.protocolFeeBps)) / BigInt(10000);
    return fee < this.config.minFeeNano ? this.config.minFeeNano : fee;
  }

  /**
   * Calculate marketplace commission on strategy sale/subscription.
   * @param amount Sale/subscription amount in nanoTON
   * @returns Commission in nanoTON
   */
  calculateMarketplaceCommission(amount: bigint): bigint {
    if (amount <= BigInt(0)) return BigInt(0);
    return (amount * BigInt(this.config.marketplaceCommissionBps)) / BigInt(10000);
  }

  /**
   * Calculate referral commission.
   * @param feeAmount The base fee amount
   * @returns Referral commission in nanoTON
   */
  calculateReferralCommission(feeAmount: bigint): bigint {
    if (feeAmount <= BigInt(0)) return BigInt(0);
    return (feeAmount * BigInt(this.config.referralCommissionBps)) / BigInt(10000);
  }

  // ============================================================================
  // Fee Recording
  // ============================================================================

  /**
   * Record a fee collection event.
   */
  recordFee(
    type: FeeType,
    agentId: AgentId,
    amount: bigint,
    recipient: TonAddress,
    txHash?: string
  ): FeeRecord {
    if (amount <= BigInt(0)) {
      throw new Error('Fee amount must be positive');
    }

    this.feeCounter++;
    const feeId = `fee_${Date.now()}_${this.feeCounter}`;

    const record: FeeRecord = {
      feeId,
      type,
      agentId,
      amount,
      recipient,
      txHash,
      collected: false,
      timestamp: new Date(),
    };

    this.feeRecords.set(feeId, record);

    // Track per-agent fees
    const agentFeeIds = this.agentFees.get(agentId) ?? [];
    agentFeeIds.push(feeId);
    this.agentFees.set(agentId, agentFeeIds);

    this.emitEvent({
      type: 'fee.collected',
      timestamp: new Date(),
      agentId,
      data: { feeId, feeType: type, amount: amount.toString(), recipient },
    });

    return record;
  }

  /**
   * Mark a fee as collected (payment confirmed on-chain).
   */
  markFeeCollected(feeId: string, txHash: string): void {
    const record = this.feeRecords.get(feeId);
    if (!record) {
      throw new Error(`Fee record ${feeId} not found`);
    }

    record.collected = true;
    record.txHash = txHash;
    this.feeRecords.set(feeId, record);

    if (record.recipient === this.config.treasury) {
      this.totalProtocolRevenue += record.amount;
    }
  }

  // ============================================================================
  // Revenue Distribution
  // ============================================================================

  /**
   * Calculate revenue distribution for a given profit amount.
   * Returns how much goes to protocol, treasury, referrer, and creator.
   */
  distributeRevenue(
    agentId: AgentId,
    profit: bigint,
    creatorAddress: TonAddress
  ): RevenueDistribution {
    const performanceFee = this.calculatePerformanceFee(profit);
    const referrer = this.referralMap.get(agentId);
    const referralAmount = referrer
      ? this.calculateReferralCommission(performanceFee)
      : BigInt(0);

    const protocolShare = (performanceFee * BigInt(30)) / BigInt(100); // 30% to protocol
    const treasuryShare = (performanceFee * BigInt(40)) / BigInt(100); // 40% to treasury
    const creatorShare = performanceFee - protocolShare - treasuryShare - referralAmount;

    // Update creator balance
    this.creditCreator(creatorAddress, creatorShare > BigInt(0) ? creatorShare : BigInt(0));

    // Record fee
    if (performanceFee > BigInt(0)) {
      this.recordFee('performance', agentId, performanceFee, this.config.treasury);
    }

    return {
      total: performanceFee,
      protocol: protocolShare,
      treasury: treasuryShare,
      referral: referralAmount,
      creator: creatorShare > BigInt(0) ? creatorShare : BigInt(0),
    };
  }

  /**
   * Process marketplace commission on a strategy sale.
   */
  processMarketplaceCommission(
    agentId: AgentId,
    saleAmount: bigint,
    sellerAddress: TonAddress
  ): RevenueDistribution {
    const commission = this.calculateMarketplaceCommission(saleAmount);

    // 70% of commission to seller/creator, 30% to protocol
    const protocolShare = (commission * BigInt(30)) / BigInt(100);
    const creatorShare = commission - protocolShare;

    this.creditCreator(sellerAddress, creatorShare);

    if (commission > BigInt(0)) {
      this.recordFee('marketplace', agentId, commission, this.config.treasury);
    }

    return {
      total: commission,
      protocol: protocolShare,
      treasury: protocolShare, // treasury gets protocol share
      referral: BigInt(0),
      creator: creatorShare,
    };
  }

  // ============================================================================
  // Creator Payouts
  // ============================================================================

  /**
   * Credit earnings to a creator's balance.
   */
  creditCreator(address: TonAddress, amount: bigint): void {
    if (amount <= BigInt(0)) return;

    const existing = this.creatorBalances.get(address) ?? {
      address,
      totalEarned: BigInt(0),
      pendingPayout: BigInt(0),
      totalPaidOut: BigInt(0),
    };

    existing.totalEarned += amount;
    existing.pendingPayout += amount;
    this.creatorBalances.set(address, existing);
  }

  /**
   * Process payout to a creator.
   * Returns the amount paid out.
   */
  processPayout(address: TonAddress, _txHash?: string): bigint {
    const balance = this.creatorBalances.get(address);
    if (!balance || balance.pendingPayout <= BigInt(0)) {
      return BigInt(0);
    }

    const paidAmount = balance.pendingPayout;
    balance.totalPaidOut += paidAmount;
    balance.pendingPayout = BigInt(0);
    balance.lastPayoutAt = new Date();
    this.creatorBalances.set(address, balance);

    return paidAmount;
  }

  getCreatorBalance(address: TonAddress): CreatorBalance {
    return (
      this.creatorBalances.get(address) ?? {
        address,
        totalEarned: BigInt(0),
        pendingPayout: BigInt(0),
        totalPaidOut: BigInt(0),
      }
    );
  }

  getAllCreatorBalances(): CreatorBalance[] {
    return Array.from(this.creatorBalances.values());
  }

  // ============================================================================
  // Referral Management
  // ============================================================================

  /**
   * Register a referral: when agentId was deployed via referrer.
   */
  registerReferral(agentId: AgentId, referrer: TonAddress): void {
    this.referralMap.set(agentId, referrer);
  }

  getReferrer(agentId: AgentId): TonAddress | undefined {
    return this.referralMap.get(agentId);
  }

  // ============================================================================
  // Fee Queries
  // ============================================================================

  getFeeRecord(feeId: string): FeeRecord | undefined {
    return this.feeRecords.get(feeId);
  }

  getFeesByAgent(agentId: AgentId): FeeRecord[] {
    const ids = this.agentFees.get(agentId) ?? [];
    return ids.map((id) => this.feeRecords.get(id)).filter(Boolean) as FeeRecord[];
  }

  getAllFees(): FeeRecord[] {
    return Array.from(this.feeRecords.values());
  }

  getPendingFees(): FeeRecord[] {
    return Array.from(this.feeRecords.values()).filter((r) => !r.collected);
  }

  getFeesByType(type: FeeType): FeeRecord[] {
    return Array.from(this.feeRecords.values()).filter((r) => r.type === type);
  }

  // ============================================================================
  // Revenue Statistics
  // ============================================================================

  getTotalFeesCollected(): bigint {
    return Array.from(this.feeRecords.values())
      .filter((r) => r.collected)
      .reduce((sum, r) => sum + r.amount, BigInt(0));
  }

  getTotalPendingFees(): bigint {
    return Array.from(this.feeRecords.values())
      .filter((r) => !r.collected)
      .reduce((sum, r) => sum + r.amount, BigInt(0));
  }

  getTotalProtocolRevenue(): bigint {
    return this.totalProtocolRevenue;
  }

  getRevenueByType(): Record<FeeType, bigint> {
    const result: Record<FeeType, bigint> = {
      performance: BigInt(0),
      protocol: BigInt(0),
      marketplace: BigInt(0),
      referral: BigInt(0),
      gas: BigInt(0),
    };

    for (const record of this.feeRecords.values()) {
      if (record.collected) {
        result[record.type] += record.amount;
      }
    }

    return result;
  }

  getConfig(): FeeConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Omit<FeeConfig, 'treasury'>>): void {
    Object.assign(this.config, updates);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFeeManager(config?: Partial<FeeConfig>): FeeManager {
  return new FeeManager(config);
}

export default FeeManager;
