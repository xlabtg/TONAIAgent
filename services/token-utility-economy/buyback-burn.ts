/**
 * TONAIAgent - Buyback, Burn & Treasury Loop
 *
 * Manages the deflationary mechanisms: protocol revenue triggers token buybacks,
 * bought tokens are burned or allocated to treasury, creating sustained
 * deflationary pressure and aligning incentives long-term.
 */

import {
  BuybackConfig,
  BuybackBurnEvent,
  TreasuryAccumulationStatus,
  TokenSupplyMetrics,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_BUYBACK_CONFIG: BuybackConfig = {
  enabled: true,
  triggerThreshold: '10000000000000',   // 10,000 tokens worth of revenue
  buybackPercent: 0.40,                 // 40% of revenue used for buyback
  burnPercent: 0.50,                    // 50% of bought tokens burned
  treasuryPercent: 0.30,               // 30% to treasury
  redistributePercent: 0.20,           // 20% redistributed to stakers
  cooldownPeriod: 86400,               // 24-hour cooldown between buybacks
};

// ============================================================================
// Interfaces
// ============================================================================

export interface BuybackBurnModuleConfig extends Partial<BuybackConfig> {
  initialCirculatingSupply?: string;
  initialTotalSupply?: string;
  initialTokenPrice?: number;
}

export interface TriggerBuybackRequest {
  revenueAmount: string;
  triggeredBy: string;
  currentTokenPrice: number;
}

export interface BuybackBurnModule {
  readonly config: BuybackConfig;

  triggerBuyback(request: TriggerBuybackRequest): BuybackBurnEvent | null;
  getAccumulationStatus(): TreasuryAccumulationStatus;
  getSupplyMetrics(): TokenSupplyMetrics;
  recordRevenueAccrual(amount: string): void;
  getNextBuybackEta(): Date | null;
  isEligibleForBuyback(): boolean;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultBuybackBurnModule implements BuybackBurnModule {
  readonly config: BuybackConfig;

  private totalBurned: bigint = BigInt(0);
  private totalBoughtBack: bigint = BigInt(0);
  private totalRedistributed: bigint = BigInt(0);
  private treasuryBalance: bigint = BigInt(0);
  private accruedRevenue: bigint = BigInt(0);
  private lastBuybackAt: Date | null = null;
  private readonly buybackHistory: BuybackBurnEvent[] = [];
  private circulatingSupply: bigint;
  private readonly totalSupply: bigint;
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: BuybackBurnModuleConfig = {}) {
    this.config = {
      enabled: config.enabled ?? DEFAULT_BUYBACK_CONFIG.enabled,
      triggerThreshold: config.triggerThreshold ?? DEFAULT_BUYBACK_CONFIG.triggerThreshold,
      buybackPercent: config.buybackPercent ?? DEFAULT_BUYBACK_CONFIG.buybackPercent,
      burnPercent: config.burnPercent ?? DEFAULT_BUYBACK_CONFIG.burnPercent,
      treasuryPercent: config.treasuryPercent ?? DEFAULT_BUYBACK_CONFIG.treasuryPercent,
      redistributePercent: config.redistributePercent ?? DEFAULT_BUYBACK_CONFIG.redistributePercent,
      cooldownPeriod: config.cooldownPeriod ?? DEFAULT_BUYBACK_CONFIG.cooldownPeriod,
    };
    this.circulatingSupply = BigInt(config.initialCirculatingSupply ?? '1000000000000000000'); // 1B tokens
    this.totalSupply = BigInt(config.initialTotalSupply ?? '10000000000000000000'); // 10B tokens
  }

  triggerBuyback(request: TriggerBuybackRequest): BuybackBurnEvent | null {
    if (!this.config.enabled) return null;
    if (!this.isEligibleForBuyback()) return null;

    const revenue = BigInt(request.revenueAmount);
    const buybackAmount = (revenue * BigInt(Math.floor(this.config.buybackPercent * 10000))) / BigInt(10000);

    // Convert revenue to tokens using price (simplified: revenue / price = tokens)
    // Using integer arithmetic: multiply by 1e9 for decimals
    const tokensPerUnitRevenue = request.currentTokenPrice > 0
      ? BigInt(Math.floor(1e9 / request.currentTokenPrice))
      : BigInt(1);
    const tokensBought = buybackAmount * tokensPerUnitRevenue / BigInt(1e9);

    const tokensBurned = (tokensBought * BigInt(Math.floor(this.config.burnPercent * 10000))) / BigInt(10000);
    const tokensToTreasury = (tokensBought * BigInt(Math.floor(this.config.treasuryPercent * 10000))) / BigInt(10000);
    const tokensRedistributed = tokensBought - tokensBurned - tokensToTreasury;

    // Apply burns to circulating supply
    this.totalBurned += tokensBurned;
    this.totalBoughtBack += tokensBought;
    this.totalRedistributed += tokensRedistributed;
    this.treasuryBalance += tokensToTreasury;
    this.circulatingSupply = this.circulatingSupply > tokensBurned
      ? this.circulatingSupply - tokensBurned
      : BigInt(0);

    this.lastBuybackAt = new Date();
    this.accruedRevenue = BigInt(0); // Reset accrued revenue

    const event: BuybackBurnEvent = {
      id: `buyback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      triggeredBy: request.triggeredBy,
      revenueAmount: request.revenueAmount,
      buybackAmount: buybackAmount.toString(),
      tokensBought: tokensBought.toString(),
      tokensBurned: tokensBurned.toString(),
      tokensToTreasury: tokensToTreasury.toString(),
      tokensRedistributed: tokensRedistributed.toString(),
      priceAtBuyback: request.currentTokenPrice.toString(),
      timestamp: new Date(),
    };

    this.buybackHistory.push(event);

    this.emitEvent({
      id: event.id,
      type: 'buyback.executed',
      data: {
        tokensBurned: tokensBurned.toString(),
        tokensToTreasury: tokensToTreasury.toString(),
        tokensRedistributed: tokensRedistributed.toString(),
        priceAtBuyback: request.currentTokenPrice,
      },
      timestamp: new Date(),
    });

    this.emitEvent({
      id: `burn-${Date.now()}`,
      type: 'tokens.burned',
      data: { amount: tokensBurned.toString(), totalBurned: this.totalBurned.toString() },
      timestamp: new Date(),
    });

    return event;
  }

  getAccumulationStatus(): TreasuryAccumulationStatus {
    const totalAccumulated = this.treasuryBalance + this.totalBurned + this.totalRedistributed;

    // Calculate burn rate from recent history
    const recentHistory = this.buybackHistory.filter(e => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return e.timestamp >= cutoff;
    });
    const recentBurned = recentHistory.reduce(
      (acc, e) => acc + BigInt(e.tokensBurned),
      BigInt(0)
    );
    const burnRate = Number(recentBurned) / 30; // tokens per day

    const nextEta = this.getNextBuybackEta();

    return {
      totalAccumulated: totalAccumulated.toString(),
      currentBalance: this.treasuryBalance.toString(),
      totalBurned: this.totalBurned.toString(),
      totalRedistributed: this.totalRedistributed.toString(),
      burnRate,
      buybackHistory: this.buybackHistory.slice(-20), // Last 20 events
      deflationaryPressure: this.totalBurned > BigInt(0)
        ? Math.min(1, Number(this.totalBurned * BigInt(10000) / this.totalSupply) / 10000)
        : 0,
      nextBuybackEta: nextEta ?? undefined,
    };
  }

  getSupplyMetrics(): TokenSupplyMetrics {
    const stakedSupply = BigInt(0); // Would come from staking module
    const lockedSupply = BigInt(0); // Would come from vesting module
    const totalEmitted = BigInt(0); // Would come from emission schedule

    const inflationRate = 0.05; // 5% annual inflation (example)
    const deflationRate = this.totalSupply > BigInt(0)
      ? Number((this.totalBurned * BigInt(10000)) / this.totalSupply) / 10000 / 1 // Annualized approx
      : 0;

    return {
      totalSupply: this.totalSupply.toString(),
      circulatingSupply: this.circulatingSupply.toString(),
      stakedSupply: stakedSupply.toString(),
      lockedSupply: lockedSupply.toString(),
      burnedSupply: this.totalBurned.toString(),
      treasurySupply: this.treasuryBalance.toString(),
      inflationRate,
      deflationRate,
      netSupplyChange: inflationRate - deflationRate,
    };
  }

  recordRevenueAccrual(amount: string): void {
    this.accruedRevenue += BigInt(amount);
  }

  getNextBuybackEta(): Date | null {
    if (!this.config.enabled) return null;

    if (this.accruedRevenue >= BigInt(this.config.triggerThreshold)) {
      // Eligible now, check cooldown
      if (!this.lastBuybackAt) return new Date();

      const cooldownEnds = new Date(this.lastBuybackAt.getTime() + this.config.cooldownPeriod * 1000);
      return cooldownEnds <= new Date() ? new Date() : cooldownEnds;
    }

    return null;
  }

  isEligibleForBuyback(): boolean {
    if (!this.config.enabled) return false;

    const revenueThresholdMet = this.accruedRevenue >= BigInt(this.config.triggerThreshold);
    if (!revenueThresholdMet) return false;

    if (!this.lastBuybackAt) return true;

    const cooldownEnds = new Date(this.lastBuybackAt.getTime() + this.config.cooldownPeriod * 1000);
    return new Date() >= cooldownEnds;
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

export function createBuybackBurnModule(
  config?: BuybackBurnModuleConfig
): DefaultBuybackBurnModule {
  return new DefaultBuybackBurnModule(config);
}
