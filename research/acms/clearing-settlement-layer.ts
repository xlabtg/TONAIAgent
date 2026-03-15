/**
 * ACMS Layer 5 — Clearing & Settlement Layer
 *
 * AI-native clearing house providing multilateral netting, collateral management,
 * and default resolution for all trades executed through the ACMS.
 * Eliminates counterparty risk through novation and automated settlement.
 */

import {
  ParticipantId,
  AssetId,
  ClearingEntry,
  ClearingStatus,
  SettlementMethod,
  NettingResult,
  CollateralPool,
  DefaultResolutionPlan,
  DefaultResolutionStep,
  ClearingLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Clearing & Settlement Layer Interfaces
// ============================================================================

export interface ClearingSettlementLayerManager {
  submitTrade(params: SubmitTradeParams): ClearingEntry;
  processNetting(participantId: ParticipantId): NettingResult;
  settleEntry(entryId: string): void;
  getClearingEntry(entryId: string): ClearingEntry | undefined;
  listClearingEntries(filters?: ClearingEntryFilters): ClearingEntry[];

  createCollateralPool(participantId: ParticipantId, assetId: AssetId, valueUsd: number): CollateralPool;
  lockCollateral(poolId: string, amountUsd: number, purpose: string): void;
  releaseCollateral(poolId: string, amountUsd: number): void;
  getCollateralPool(poolId: string): CollateralPool | undefined;
  listCollateralPools(participantId?: ParticipantId): CollateralPool[];

  resolveDefault(participantId: ParticipantId, exposureUsd: number): DefaultResolutionPlan;
  getInsuranceFundBalance(): number;
  addToInsuranceFund(amountUsd: number): void;

  getLayerStatus(): ClearingLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface SubmitTradeParams {
  tradeId: string;
  buyerId: ParticipantId;
  sellerId: ParticipantId;
  assetId: AssetId;
  quantity: number;
  priceUsd: number;
  settlementMethod?: SettlementMethod;
}

export interface ClearingEntryFilters {
  status?: ClearingStatus;
  participantId?: ParticipantId;
  assetId?: AssetId;
  fromDate?: Date;
  toDate?: Date;
}

// ============================================================================
// Default Clearing & Settlement Layer Manager
// ============================================================================

export class DefaultClearingSettlementLayerManager implements ClearingSettlementLayerManager {
  private readonly entries: Map<string, ClearingEntry> = new Map();
  private readonly collateralPools: Map<string, CollateralPool> = new Map();
  private readonly defaultPlans: Map<string, DefaultResolutionPlan> = new Map();
  private readonly settledToday: ClearingEntry[] = [];
  private insuranceFundBalance = 1_000_000; // Initial insurance fund
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  submitTrade(params: SubmitTradeParams): ClearingEntry {
    const grossValueUsd = params.quantity * params.priceUsd;
    const entry: ClearingEntry = {
      id: this.generateId('clr'),
      tradeId: params.tradeId,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      assetId: params.assetId,
      quantity: params.quantity,
      priceUsd: params.priceUsd,
      grossValueUsd,
      netValueUsd: grossValueUsd,   // Will be reduced after netting
      settlementMethod: params.settlementMethod ?? 'dvp',
      status: 'pending',
      scheduledSettlementDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // T+2
      createdAt: new Date(),
    };
    this.entries.set(entry.id, entry);
    this.emitEvent('trade_cleared', 5, { entryId: entry.id, tradeId: params.tradeId });
    return entry;
  }

  processNetting(participantId: ParticipantId): NettingResult {
    const participantEntries = Array.from(this.entries.values()).filter(
      e => (e.buyerId === participantId || e.sellerId === participantId) && e.status === 'pending'
    );

    let grossBuy = 0;
    let grossSell = 0;

    for (const entry of participantEntries) {
      if (entry.buyerId === participantId) {
        grossBuy += entry.grossValueUsd;
      } else {
        grossSell += entry.grossValueUsd;
      }
    }

    const netPosition = grossBuy - grossSell;
    const grossTotal = grossBuy + grossSell;
    const nettingEfficiency = grossTotal > 0
      ? (1 - Math.abs(netPosition) / grossTotal) * 100
      : 100;

    // Mark entries as netting
    const settledIds: string[] = [];
    for (const entry of participantEntries) {
      this.entries.set(entry.id, { ...entry, status: 'netting' });
      settledIds.push(entry.id);
    }

    return {
      participantId,
      grossBuyValueUsd: grossBuy,
      grossSellValueUsd: grossSell,
      netPositionUsd: netPosition,
      nettingEfficiencyPercent: Math.round(nettingEfficiency * 100) / 100,
      settledEntries: settledIds,
    };
  }

  settleEntry(entryId: string): void {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error(`Clearing entry ${entryId} not found`);
    const settled: ClearingEntry = {
      ...entry,
      status: 'settled',
      actualSettlementDate: new Date(),
    };
    this.entries.set(entryId, settled);
    this.settledToday.push(settled);
    this.emitEvent('position_settled', 5, { entryId, tradeId: entry.tradeId });
  }

  getClearingEntry(entryId: string): ClearingEntry | undefined {
    return this.entries.get(entryId);
  }

  listClearingEntries(filters?: ClearingEntryFilters): ClearingEntry[] {
    let result = Array.from(this.entries.values());
    if (filters?.status) result = result.filter(e => e.status === filters.status);
    if (filters?.participantId) {
      result = result.filter(
        e => e.buyerId === filters.participantId || e.sellerId === filters.participantId
      );
    }
    if (filters?.assetId) result = result.filter(e => e.assetId === filters.assetId);
    if (filters?.fromDate) result = result.filter(e => e.createdAt >= filters.fromDate!);
    if (filters?.toDate) result = result.filter(e => e.createdAt <= filters.toDate!);
    return result;
  }

  createCollateralPool(participantId: ParticipantId, assetId: AssetId, valueUsd: number): CollateralPool {
    const haircut = 0.05; // 5% haircut
    const pool: CollateralPool = {
      id: this.generateId('collateral'),
      ownerId: participantId,
      totalValueUsd: valueUsd,
      availableValueUsd: valueUsd,
      lockedValueUsd: 0,
      haircut,
      adjustedValueUsd: valueUsd * (1 - haircut),
    };
    this.collateralPools.set(pool.id, pool);
    return pool;
  }

  lockCollateral(poolId: string, amountUsd: number, _purpose: string): void {
    const pool = this.collateralPools.get(poolId);
    if (!pool) throw new Error(`Collateral pool ${poolId} not found`);
    if (amountUsd > pool.availableValueUsd) throw new Error('Insufficient available collateral');
    this.collateralPools.set(poolId, {
      ...pool,
      availableValueUsd: pool.availableValueUsd - amountUsd,
      lockedValueUsd: pool.lockedValueUsd + amountUsd,
    });
  }

  releaseCollateral(poolId: string, amountUsd: number): void {
    const pool = this.collateralPools.get(poolId);
    if (!pool) throw new Error(`Collateral pool ${poolId} not found`);
    const releaseAmount = Math.min(amountUsd, pool.lockedValueUsd);
    this.collateralPools.set(poolId, {
      ...pool,
      availableValueUsd: pool.availableValueUsd + releaseAmount,
      lockedValueUsd: pool.lockedValueUsd - releaseAmount,
    });
  }

  getCollateralPool(poolId: string): CollateralPool | undefined {
    return this.collateralPools.get(poolId);
  }

  listCollateralPools(participantId?: ParticipantId): CollateralPool[] {
    const pools = Array.from(this.collateralPools.values());
    if (participantId) return pools.filter(p => p.ownerId === participantId);
    return pools;
  }

  resolveDefault(participantId: ParticipantId, exposureUsd: number): DefaultResolutionPlan {
    const steps: DefaultResolutionStep[] = [];
    let remainingExposure = exposureUsd;

    // Step 1: Use collateral
    const participantCollateral = Array.from(this.collateralPools.values())
      .filter(p => p.ownerId === participantId)
      .reduce((sum, p) => sum + p.adjustedValueUsd, 0);

    const collateralUsed = Math.min(participantCollateral, remainingExposure);
    if (collateralUsed > 0) {
      steps.push({
        step: 1,
        description: 'Liquidate defaulter collateral',
        amountUsd: collateralUsed,
        source: 'collateral',
      });
      remainingExposure -= collateralUsed;
    }

    // Step 2: Use insurance fund
    const insuranceUsed = Math.min(this.insuranceFundBalance, remainingExposure);
    if (insuranceUsed > 0 && remainingExposure > 0) {
      steps.push({
        step: 2,
        description: 'Draw from insurance fund',
        amountUsd: insuranceUsed,
        source: 'insurance_fund',
      });
      this.insuranceFundBalance -= insuranceUsed;
      remainingExposure -= insuranceUsed;
    }

    const resolution = remainingExposure <= 0 ? 'fully_covered'
      : exposureUsd > 0 ? 'partially_covered'
      : 'not_covered';

    const plan: DefaultResolutionPlan = {
      id: this.generateId('default_plan'),
      defaultedParticipantId: participantId,
      exposureUsd,
      insuranceFundUsage: insuranceUsed,
      collateralLiquidation: collateralUsed,
      remainingLoss: Math.max(0, remainingExposure),
      resolution,
      steps,
      createdAt: new Date(),
    };
    this.defaultPlans.set(plan.id, plan);
    return plan;
  }

  getInsuranceFundBalance(): number {
    return this.insuranceFundBalance;
  }

  addToInsuranceFund(amountUsd: number): void {
    this.insuranceFundBalance += amountUsd;
  }

  getLayerStatus(): ClearingLayerStatus {
    const entries = Array.from(this.entries.values());
    const pending = entries.filter(e => e.status === 'pending');
    const settled = this.settledToday;
    const collateralPools = Array.from(this.collateralPools.values());
    const grossTotal = entries.reduce((s, e) => s + e.grossValueUsd, 0);
    const netTotal = entries.reduce((s, e) => s + e.netValueUsd, 0);
    const nettingEfficiency = grossTotal > 0 ? (1 - netTotal / grossTotal) * 100 : 100;

    return {
      pendingEntries: pending.length,
      settledTodayCount: settled.length,
      settledTodayValueUsd: settled.reduce((s, e) => s + e.netValueUsd, 0),
      nettingEfficiencyPercent: Math.round(nettingEfficiency * 100) / 100,
      collateralPoolsCount: collateralPools.length,
      totalCollateralUsd: collateralPools.reduce((s, p) => s + p.totalValueUsd, 0),
      insuranceFundUsd: this.insuranceFundBalance,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createClearingSettlementLayerManager(): DefaultClearingSettlementLayerManager {
  return new DefaultClearingSettlementLayerManager();
}
