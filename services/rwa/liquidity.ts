/**
 * TONAIAgent - Liquidity & Redemption Module
 *
 * Secondary markets, redemption frameworks, liquidity routing,
 * and liquidity pool management for RWA positions.
 */

import {
  LiquidityPool,
  LiquiditySource,
  LiquidityTier,
  RedemptionRequest,
  LiquidityRoutingResult,
  LiquidityRoute,
  LiquidityConfig,
  RWAEvent,
  RWAEventCallback,
} from './types';

// ============================================================================
// Liquidity Manager Interface
// ============================================================================

export interface LiquidityManager {
  readonly config: LiquidityConfig;

  // Pool management
  createPool(assetId: string, assetName: string, initialLiquidity: number): Promise<LiquidityPool>;
  getPool(poolId: string): LiquidityPool | undefined;
  getPoolByAsset(assetId: string): LiquidityPool | undefined;
  listPools(filters?: PoolFilters): LiquidityPool[];
  updatePoolLiquidity(poolId: string, delta: number): Promise<void>;

  // Liquidity sources
  addLiquiditySource(poolId: string, source: Omit<LiquiditySource, 'id'>): Promise<LiquiditySource>;
  updateLiquiditySource(poolId: string, sourceId: string, updates: Partial<LiquiditySource>): Promise<LiquiditySource>;
  removeLiquiditySource(poolId: string, sourceId: string): Promise<void>;

  // Redemption management
  submitRedemption(
    investorId: string,
    assetId: string,
    tokenAmount: number,
    currency: string,
    type?: RedemptionRequest['redemptionType']
  ): Promise<RedemptionRequest>;
  getRedemption(redemptionId: string): RedemptionRequest | undefined;
  listRedemptions(filters?: RedemptionFilters): RedemptionRequest[];
  cancelRedemption(redemptionId: string, reason: string): Promise<void>;
  processRedemptions(assetId: string): Promise<RedemptionProcessingResult>;

  // Liquidity routing
  routeLiquidity(
    assetId: string,
    amount: number,
    urgency?: 'low' | 'medium' | 'high'
  ): Promise<LiquidityRoutingResult>;
  estimateLiquidity(assetId: string, amount: number): LiquidityEstimate;

  // Secondary market
  createSecondaryListing(
    assetId: string,
    sellerId: string,
    amount: number,
    pricePerToken: number
  ): Promise<SecondaryListing>;
  getSecondaryListings(assetId: string): SecondaryListing[];
  executeSecondaryTrade(
    listingId: string,
    buyerId: string,
    amount: number
  ): Promise<SecondaryTrade>;

  // Events
  onEvent(callback: RWAEventCallback): void;
}

export interface PoolFilters {
  assetId?: string;
  tier?: LiquidityTier[];
  minLiquidity?: number;
  maxUtilization?: number;
}

export interface RedemptionFilters {
  investorId?: string;
  assetId?: string;
  status?: RedemptionRequest['status'][];
  type?: RedemptionRequest['redemptionType'][];
  fromDate?: Date;
  toDate?: Date;
}

export interface RedemptionProcessingResult {
  assetId: string;
  processedAt: Date;
  totalRequests: number;
  successful: number;
  failed: number;
  totalRedeemed: number;
  totalPaid: number;
  errors: string[];
}

export interface LiquidityEstimate {
  assetId: string;
  amount: number;
  estimatedCost: number;
  estimatedTime: number; // Hours
  availableLiquidity: number;
  priceImpact: number;
  canFulfill: boolean;
  breakdown: LiquidityRoute[];
}

export interface SecondaryListing {
  id: string;
  assetId: string;
  sellerId: string;
  amount: number;
  pricePerToken: number;
  totalValue: number;
  remainingAmount: number;
  status: 'active' | 'partially_filled' | 'filled' | 'cancelled';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecondaryTrade {
  id: string;
  listingId: string;
  assetId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  pricePerToken: number;
  totalValue: number;
  fee: number;
  executedAt: Date;
}

// ============================================================================
// Default Liquidity Manager
// ============================================================================

export class DefaultLiquidityManager implements LiquidityManager {
  private _config: LiquidityConfig;
  private readonly pools: Map<string, LiquidityPool> = new Map();
  private readonly assetPoolIndex: Map<string, string> = new Map(); // assetId -> poolId
  private readonly redemptions: Map<string, RedemptionRequest> = new Map();
  private readonly secondaryListings: Map<string, SecondaryListing> = new Map();
  private readonly secondaryTrades: Map<string, SecondaryTrade> = new Map();
  private readonly eventCallbacks: RWAEventCallback[] = [];

  constructor(config?: Partial<LiquidityConfig>) {
    this._config = {
      minimumLiquidityBuffer: 0.10, // 10% minimum
      redemptionQueueProcessingFrequency: 'daily',
      earlyRedemptionPenaltyRate: 0.02, // 2% penalty
      emergencyRedemptionEnabled: true,
      ...config,
    };
  }

  get config(): LiquidityConfig {
    return { ...this._config };
  }

  async createPool(
    assetId: string,
    assetName: string,
    initialLiquidity: number
  ): Promise<LiquidityPool> {
    const poolId = this.generateId('pool');

    const tier = this.determineLiquidityTier(initialLiquidity);

    const pool: LiquidityPool = {
      id: poolId,
      assetId,
      assetName,
      totalLiquidity: initialLiquidity,
      availableLiquidity: initialLiquidity,
      utilizationRate: 0,
      tier,
      sources: [],
      redemptionQueue: [],
      lastUpdated: new Date(),
    };

    this.pools.set(poolId, pool);
    this.assetPoolIndex.set(assetId, poolId);

    this.emitEvent('info', 'liquidity', `Liquidity pool created for ${assetName}`, {
      poolId,
      assetId,
      initialLiquidity,
    });

    return { ...pool };
  }

  getPool(poolId: string): LiquidityPool | undefined {
    const pool = this.pools.get(poolId);
    if (!pool) return undefined;
    return this.clonePool(pool);
  }

  getPoolByAsset(assetId: string): LiquidityPool | undefined {
    const poolId = this.assetPoolIndex.get(assetId);
    if (!poolId) return undefined;
    return this.getPool(poolId);
  }

  listPools(filters?: PoolFilters): LiquidityPool[] {
    let pools = Array.from(this.pools.values());

    if (filters) {
      if (filters.assetId) {
        pools = pools.filter(p => p.assetId === filters.assetId);
      }
      if (filters.tier?.length) {
        pools = pools.filter(p => filters.tier!.includes(p.tier));
      }
      if (filters.minLiquidity !== undefined) {
        pools = pools.filter(p => p.availableLiquidity >= filters.minLiquidity!);
      }
      if (filters.maxUtilization !== undefined) {
        pools = pools.filter(p => p.utilizationRate <= filters.maxUtilization!);
      }
    }

    return pools.map(p => this.clonePool(p));
  }

  async updatePoolLiquidity(poolId: string, delta: number): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    pool.totalLiquidity += delta;
    pool.availableLiquidity = Math.max(0, pool.availableLiquidity + delta);
    pool.utilizationRate = pool.totalLiquidity > 0
      ? (pool.totalLiquidity - pool.availableLiquidity) / pool.totalLiquidity
      : 0;
    pool.tier = this.determineLiquidityTier(pool.totalLiquidity);
    pool.lastUpdated = new Date();
  }

  async addLiquiditySource(
    poolId: string,
    source: Omit<LiquiditySource, 'id'>
  ): Promise<LiquiditySource> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    const newSource: LiquiditySource = {
      ...source,
      id: this.generateId('source'),
    };

    pool.sources.push(newSource);
    pool.lastUpdated = new Date();

    // Update pool totals from active sources
    this.recalculatePoolLiquidity(pool);

    this.emitEvent('info', 'liquidity', `Liquidity source added to pool ${poolId}`, {
      poolId,
      sourceId: newSource.id,
      sourceName: source.name,
      liquidity: source.availableLiquidity,
    });

    return { ...newSource };
  }

  async updateLiquiditySource(
    poolId: string,
    sourceId: string,
    updates: Partial<LiquiditySource>
  ): Promise<LiquiditySource> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    const sourceIdx = pool.sources.findIndex(s => s.id === sourceId);
    if (sourceIdx === -1) throw new Error(`Source not found: ${sourceId}`);

    pool.sources[sourceIdx] = { ...pool.sources[sourceIdx], ...updates };
    pool.lastUpdated = new Date();
    this.recalculatePoolLiquidity(pool);

    return { ...pool.sources[sourceIdx] };
  }

  async removeLiquiditySource(poolId: string, sourceId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    const sourceIdx = pool.sources.findIndex(s => s.id === sourceId);
    if (sourceIdx === -1) throw new Error(`Source not found: ${sourceId}`);

    pool.sources.splice(sourceIdx, 1);
    pool.lastUpdated = new Date();
    this.recalculatePoolLiquidity(pool);
  }

  async submitRedemption(
    investorId: string,
    assetId: string,
    tokenAmount: number,
    currency: string,
    type: RedemptionRequest['redemptionType'] = 'standard'
  ): Promise<RedemptionRequest> {
    const pool = this.getPoolByAsset(assetId);
    const estimatedValue = tokenAmount * 1.0; // Simplified price oracle

    // Calculate estimated settlement
    const settlementDate = new Date();
    if (type === 'emergency') {
      settlementDate.setDate(settlementDate.getDate() + 1);
    } else if (type === 'early') {
      settlementDate.setDate(settlementDate.getDate() + 5);
    } else {
      settlementDate.setDate(settlementDate.getDate() + 30); // Standard T+30
    }

    // Early redemption penalty
    const earlyRedemptionPenalty = type === 'early' || type === 'emergency'
      ? estimatedValue * this._config.earlyRedemptionPenaltyRate
      : undefined;

    const redemption: RedemptionRequest = {
      id: this.generateId('redemption'),
      investorId,
      assetId,
      tokenAmount,
      estimatedValue,
      currency,
      status: 'pending',
      redemptionType: type,
      earlyRedemptionPenalty,
      estimatedSettlementDate: settlementDate,
      createdAt: new Date(),
    };

    this.redemptions.set(redemption.id, redemption);

    // Add to pool queue if pool exists
    if (pool) {
      const internalPool = this.pools.get(this.assetPoolIndex.get(assetId)!);
      if (internalPool) {
        internalPool.redemptionQueue.push(redemption);
      }
    }

    this.emitEvent('info', 'liquidity', `Redemption submitted: ${assetId}`, {
      redemptionId: redemption.id,
      investorId,
      tokenAmount,
      type,
    });

    return { ...redemption };
  }

  getRedemption(redemptionId: string): RedemptionRequest | undefined {
    const redemption = this.redemptions.get(redemptionId);
    if (!redemption) return undefined;
    return { ...redemption };
  }

  listRedemptions(filters?: RedemptionFilters): RedemptionRequest[] {
    let redemptions = Array.from(this.redemptions.values());

    if (filters) {
      if (filters.investorId) {
        redemptions = redemptions.filter(r => r.investorId === filters.investorId);
      }
      if (filters.assetId) {
        redemptions = redemptions.filter(r => r.assetId === filters.assetId);
      }
      if (filters.status?.length) {
        redemptions = redemptions.filter(r => filters.status!.includes(r.status));
      }
      if (filters.type?.length) {
        redemptions = redemptions.filter(r => filters.type!.includes(r.redemptionType));
      }
      if (filters.fromDate) {
        redemptions = redemptions.filter(r => r.createdAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        redemptions = redemptions.filter(r => r.createdAt <= filters.toDate!);
      }
    }

    return redemptions.map(r => ({ ...r }));
  }

  async cancelRedemption(redemptionId: string, reason: string): Promise<void> {
    const redemption = this.redemptions.get(redemptionId);
    if (!redemption) throw new Error(`Redemption not found: ${redemptionId}`);

    if (redemption.status !== 'pending') {
      throw new Error(`Cannot cancel redemption in status: ${redemption.status}`);
    }

    redemption.status = 'cancelled';
    redemption.reason = reason;

    this.emitEvent('info', 'liquidity', `Redemption cancelled: ${redemptionId}`, {
      redemptionId,
      reason,
    });
  }

  async processRedemptions(assetId: string): Promise<RedemptionProcessingResult> {
    const pool = this.getPoolByAsset(assetId);
    if (!pool) {
      return {
        assetId,
        processedAt: new Date(),
        totalRequests: 0,
        successful: 0,
        failed: 0,
        totalRedeemed: 0,
        totalPaid: 0,
        errors: [],
      };
    }

    const pendingRedemptions = Array.from(this.redemptions.values()).filter(
      r => r.assetId === assetId && r.status === 'pending'
    );

    let successful = 0;
    let failed = 0;
    let totalRedeemed = 0;
    let totalPaid = 0;
    const errors: string[] = [];

    let availableLiquidity = pool.availableLiquidity;

    for (const redemption of pendingRedemptions) {
      try {
        const paymentAmount = redemption.estimatedValue -
          (redemption.earlyRedemptionPenalty ?? 0);

        if (paymentAmount > availableLiquidity) {
          throw new Error(`Insufficient liquidity: ${availableLiquidity} < ${paymentAmount}`);
        }

        redemption.status = 'completed';
        redemption.actualSettlementDate = new Date();

        availableLiquidity -= paymentAmount;
        totalRedeemed += redemption.tokenAmount;
        totalPaid += paymentAmount;
        successful++;
      } catch (e) {
        errors.push(`Redemption ${redemption.id}: ${e}`);
        failed++;
      }
    }

    // Update pool liquidity
    const poolId = this.assetPoolIndex.get(assetId);
    if (poolId) {
      await this.updatePoolLiquidity(poolId, -(pool.availableLiquidity - availableLiquidity));
    }

    this.emitEvent('info', 'liquidity', `Redemptions processed: ${assetId}`, {
      assetId,
      successful,
      failed,
      totalPaid,
    });

    return {
      assetId,
      processedAt: new Date(),
      totalRequests: pendingRedemptions.length,
      successful,
      failed,
      totalRedeemed,
      totalPaid,
      errors,
    };
  }

  async routeLiquidity(
    assetId: string,
    amount: number,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<LiquidityRoutingResult> {
    const requestId = this.generateId('route');
    const pool = this.getPoolByAsset(assetId);

    if (!pool) {
      return {
        requestId,
        totalAmount: amount,
        routes: [],
        estimatedCost: 0,
        estimatedSettlement: new Date(),
        priceImpact: 0,
        recommended: false,
      };
    }

    const sources = pool.sources.filter(s => s.isActive);

    // Sort sources by priority (based on urgency)
    const sortedSources = [...sources].sort((a, b) => {
      if (urgency === 'high') {
        return a.settlementDays - b.settlementDays; // Fastest first
      } else {
        return a.priceImpact - b.priceImpact; // Cheapest first
      }
    });

    const routes: LiquidityRoute[] = [];
    let remaining = amount;
    let totalCost = 0;
    let maxSettlementDays = 0;

    for (let i = 0; i < sortedSources.length && remaining > 0; i++) {
      const source = sortedSources[i];

      if (source.minimumSize > remaining) continue;
      if (source.availableLiquidity <= 0) continue;

      const sourceAmount = Math.min(
        remaining,
        source.availableLiquidity,
        source.maximumSize ?? Infinity
      );

      const sourceCost = sourceAmount * source.priceImpact;
      routes.push({
        sourceId: source.id,
        sourceName: source.name,
        amount: sourceAmount,
        estimatedCost: sourceCost,
        settlementDays: source.settlementDays,
        sequence: i + 1,
      });

      totalCost += sourceCost;
      maxSettlementDays = Math.max(maxSettlementDays, source.settlementDays);
      remaining -= sourceAmount;
    }

    const estimatedSettlement = new Date();
    estimatedSettlement.setDate(estimatedSettlement.getDate() + maxSettlementDays);

    const priceImpact = amount > 0 ? totalCost / amount : 0;

    this.emitEvent('info', 'liquidity', `Liquidity routing calculated: ${assetId}`, {
      requestId,
      amount,
      routes: routes.length,
      canFulfill: remaining <= 0,
    });

    return {
      requestId,
      totalAmount: amount,
      routes,
      estimatedCost: totalCost,
      estimatedSettlement,
      priceImpact,
      recommended: remaining <= 0 && priceImpact < 0.02, // Recommend if can fulfill with < 2% impact
    };
  }

  estimateLiquidity(assetId: string, amount: number): LiquidityEstimate {
    const pool = this.getPoolByAsset(assetId);

    if (!pool) {
      return {
        assetId,
        amount,
        estimatedCost: 0,
        estimatedTime: 0,
        availableLiquidity: 0,
        priceImpact: 0,
        canFulfill: false,
        breakdown: [],
      };
    }

    const canFulfill = pool.availableLiquidity >= amount;
    const priceImpact = canFulfill ? amount / pool.totalLiquidity * 0.5 : 1.0;

    return {
      assetId,
      amount,
      estimatedCost: amount * priceImpact,
      estimatedTime: canFulfill ? 24 : 72, // Hours
      availableLiquidity: pool.availableLiquidity,
      priceImpact,
      canFulfill,
      breakdown: [],
    };
  }

  async createSecondaryListing(
    assetId: string,
    sellerId: string,
    amount: number,
    pricePerToken: number
  ): Promise<SecondaryListing> {
    const listingId = this.generateId('listing');

    const listing: SecondaryListing = {
      id: listingId,
      assetId,
      sellerId,
      amount,
      pricePerToken,
      totalValue: amount * pricePerToken,
      remainingAmount: amount,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.secondaryListings.set(listingId, listing);

    this.emitEvent('info', 'liquidity', `Secondary listing created: ${assetId}`, {
      listingId,
      sellerId,
      amount,
      pricePerToken,
    });

    return { ...listing };
  }

  getSecondaryListings(assetId: string): SecondaryListing[] {
    return Array.from(this.secondaryListings.values())
      .filter(l => l.assetId === assetId && (l.status === 'active' || l.status === 'partially_filled'))
      .map(l => ({ ...l }));
  }

  async executeSecondaryTrade(
    listingId: string,
    buyerId: string,
    amount: number
  ): Promise<SecondaryTrade> {
    const listing = this.secondaryListings.get(listingId);
    if (!listing) throw new Error(`Listing not found: ${listingId}`);

    if (listing.status !== 'active') {
      throw new Error(`Listing is not active: ${listingId}`);
    }

    if (amount > listing.remainingAmount) {
      throw new Error(`Amount ${amount} exceeds remaining ${listing.remainingAmount}`);
    }

    const tradeId = this.generateId('trade');
    const fee = amount * listing.pricePerToken * 0.001; // 0.1% fee

    const trade: SecondaryTrade = {
      id: tradeId,
      listingId,
      assetId: listing.assetId,
      buyerId,
      sellerId: listing.sellerId,
      amount,
      pricePerToken: listing.pricePerToken,
      totalValue: amount * listing.pricePerToken,
      fee,
      executedAt: new Date(),
    };

    // Update listing
    listing.remainingAmount -= amount;
    listing.updatedAt = new Date();
    if (listing.remainingAmount === 0) {
      listing.status = 'filled';
    } else {
      listing.status = 'partially_filled';
    }

    this.secondaryTrades.set(tradeId, trade);

    this.emitEvent('info', 'liquidity', `Secondary trade executed: ${listing.assetId}`, {
      tradeId,
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      amount,
      totalValue: trade.totalValue,
    });

    return { ...trade };
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private determineLiquidityTier(liquidity: number): LiquidityTier {
    if (liquidity >= 1000000) return 'high';
    if (liquidity >= 100000) return 'medium';
    if (liquidity >= 10000) return 'low';
    return 'illiquid';
  }

  private recalculatePoolLiquidity(pool: LiquidityPool): void {
    const activeSources = pool.sources.filter(s => s.isActive);
    pool.totalLiquidity = activeSources.reduce((sum, s) => sum + s.availableLiquidity, 0);
    pool.availableLiquidity = pool.totalLiquidity *
      (1 - this._config.minimumLiquidityBuffer);
    pool.utilizationRate = pool.totalLiquidity > 0
      ? (pool.totalLiquidity - pool.availableLiquidity) / pool.totalLiquidity
      : 0;
    pool.tier = this.determineLiquidityTier(pool.totalLiquidity);
  }

  private clonePool(pool: LiquidityPool): LiquidityPool {
    return {
      ...pool,
      sources: pool.sources.map(s => ({ ...s })),
      redemptionQueue: pool.redemptionQueue.map(r => ({ ...r })),
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: RWAEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'redemption_initiated',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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
// Factory Function
// ============================================================================

export function createLiquidityManager(
  config?: Partial<LiquidityConfig>
): DefaultLiquidityManager {
  return new DefaultLiquidityManager(config);
}
