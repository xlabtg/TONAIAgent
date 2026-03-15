/**
 * TONAIAgent - GAAMP Clearing & Settlement Layer
 *
 * Implements the Clearing & Settlement Layer of the Global Autonomous Asset
 * Management Protocol. Provides AI-powered netting, margin management,
 * default resolution, and settlement finality.
 *
 * Capabilities:
 * - AI netting engine (gross → net obligation reduction)
 * - Margin engine (initial, variation, maintenance margin)
 * - Default resolution (insurance pool, haircut, auction)
 * - Settlement finality (probabilistic / deterministic / instant)
 * - On-chain clearing records
 */

import {
  FundId,
  TradeId,
  SettlementId,
  AssetId,
  ChainId,
  ClearingRecord,
  ClearingStatus,
  SettlementRecord,
  SettlementFinality,
  DefaultResolutionResult,
  MarginCall,
  MarginType,
  NettingEngineResult,
  InsurancePool,
  InsuranceCoverage,
  ClearingLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CLEARING_LAYER_CONFIG: ClearingLayerConfig = {
  enableAINetting: true,
  settlementFinality: 'deterministic',
  marginCallWindow: 4, // hours
  defaultResolutionEnabled: true,
  insurancePoolEnabled: true,
};

// ============================================================================
// Interfaces
// ============================================================================

export interface ClearingSettlementLayer {
  readonly config: ClearingLayerConfig;

  // Clearing
  submitTrade(params: SubmitTradeParams): ClearingRecord;
  updateClearingStatus(clearingId: string, status: ClearingStatus): ClearingRecord;
  getClearingRecord(clearingId: string): ClearingRecord | undefined;
  listClearingRecords(filters?: ClearingFilters): ClearingRecord[];

  // Netting
  runNettingEngine(fundIds: FundId[]): NettingEngineResult;

  // Margin management
  issueMarginCall(params: IssueMarginCallParams): MarginCall;
  meetMarginCall(callId: string, amount: number): MarginCall;
  listMarginCalls(filters?: MarginCallFilters): MarginCall[];

  // Settlement
  initiateSettlement(clearingId: string): SettlementRecord;
  confirmSettlement(settlementId: SettlementId, txHash?: string): SettlementRecord;
  getSettlementRecord(settlementId: SettlementId): SettlementRecord | undefined;
  listSettlements(filters?: SettlementFilters): SettlementRecord[];

  // Default resolution
  resolveDefault(params: ResolveDefaultParams): DefaultResolutionResult;

  // Insurance pool
  getInsurancePool(): InsurancePool;
  fundInsurancePool(amount: number, contributor: FundId): void;
  claimInsurance(amount: number, reason: string): number;

  // Stats
  getClearingStats(): ClearingStats;

  onEvent(callback: GAMPEventCallback): void;
}

export interface SubmitTradeParams {
  tradeId: TradeId;
  buyerFundId: FundId;
  sellerFundId: FundId;
  asset: AssetId;
  quantity: number;
  price: number;
  chain: ChainId;
}

export interface ClearingFilters {
  status?: ClearingStatus;
  fundId?: FundId;
  asset?: AssetId;
  chain?: ChainId;
  from?: Date;
  to?: Date;
}

export interface IssueMarginCallParams {
  fundId: FundId;
  marginType: MarginType;
  requiredMargin: number;
  postedMargin: number;
  deadlineHours?: number;
}

export interface MarginCallFilters {
  fundId?: FundId;
  status?: MarginCall['status'];
  marginType?: MarginType;
}

export interface SettlementFilters {
  status?: SettlementRecord['status'];
  fundId?: FundId;
  chain?: ChainId;
  from?: Date;
  to?: Date;
}

export interface ResolveDefaultParams {
  defaultingFundId: FundId;
  exposureAmount: number;
}

export interface ClearingStats {
  totalClearing: number;
  pendingClearing: number;
  settledToday: number;
  totalSettledAmount: number;
  averageSettlementTimeMs: number;
  nettingEfficiencyRate: number;
  activeMarginCalls: number;
  insurancePoolBalance: number;
  generatedAt: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultClearingSettlementLayer implements ClearingSettlementLayer {
  readonly config: ClearingLayerConfig;
  private readonly clearingRecords: Map<string, ClearingRecord> = new Map();
  private readonly settlementRecords: Map<SettlementId, SettlementRecord> = new Map();
  private readonly marginCalls: Map<string, MarginCall> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private insurancePool: InsurancePool;
  private counter = 0;

  constructor(config?: Partial<ClearingLayerConfig>) {
    this.config = { ...DEFAULT_CLEARING_LAYER_CONFIG, ...config };
    this.insurancePool = this.initInsurancePool();
  }

  // ============================================================================
  // Clearing
  // ============================================================================

  submitTrade(params: SubmitTradeParams): ClearingRecord {
    const id = this.generateId('clr');
    const notionalValue = params.quantity * params.price;
    const marginRequired = notionalValue * 0.1; // 10% initial margin

    const record: ClearingRecord = {
      id,
      tradeId: params.tradeId,
      buyerFundId: params.buyerFundId,
      sellerFundId: params.sellerFundId,
      asset: params.asset,
      quantity: params.quantity,
      price: params.price,
      notionalValue,
      chain: params.chain,
      status: 'pending',
      marginRequired,
      marginPosted: 0,
      submittedAt: new Date(),
    };

    this.clearingRecords.set(id, record);
    this.emitEvent('trade_cleared', {
      clearingId: id,
      tradeId: params.tradeId,
      notionalValue,
    });

    return record;
  }

  updateClearingStatus(clearingId: string, status: ClearingStatus): ClearingRecord {
    const record = this.requireClearing(clearingId);
    const updated: ClearingRecord = { ...record, status };

    if (status === 'settled') {
      updated.settledAt = new Date();
    } else if (status === 'matched') {
      updated.matchedAt = new Date();
    }

    this.clearingRecords.set(clearingId, updated);
    return updated;
  }

  getClearingRecord(clearingId: string): ClearingRecord | undefined {
    return this.clearingRecords.get(clearingId);
  }

  listClearingRecords(filters?: ClearingFilters): ClearingRecord[] {
    let result = Array.from(this.clearingRecords.values());

    if (filters) {
      if (filters.status) result = result.filter(r => r.status === filters.status);
      if (filters.fundId) {
        result = result.filter(r =>
          r.buyerFundId === filters.fundId || r.sellerFundId === filters.fundId
        );
      }
      if (filters.asset) result = result.filter(r => r.asset === filters.asset);
      if (filters.chain) result = result.filter(r => r.chain === filters.chain);
      if (filters.from) result = result.filter(r => r.submittedAt >= filters.from!);
      if (filters.to) result = result.filter(r => r.submittedAt <= filters.to!);
    }

    return result;
  }

  // ============================================================================
  // Netting
  // ============================================================================

  runNettingEngine(fundIds: FundId[]): NettingEngineResult {
    const pending = this.listClearingRecords({ status: 'pending' }).filter(
      r => fundIds.includes(r.buyerFundId) || fundIds.includes(r.sellerFundId)
    );

    if (!this.config.enableAINetting || pending.length === 0) {
      return {
        grossObligations: pending.length,
        netObligations: pending.length,
        efficiencyRate: 0,
        participantNetPositions: {},
        eliminatedTrades: 0,
        nettedAt: new Date(),
      };
    }

    // Build net position per fund
    const netPositions: Record<FundId, number> = {};
    for (const fundId of fundIds) {
      netPositions[fundId] = 0;
    }

    for (const record of pending) {
      netPositions[record.buyerFundId] = (netPositions[record.buyerFundId] ?? 0) + record.notionalValue;
      netPositions[record.sellerFundId] = (netPositions[record.sellerFundId] ?? 0) - record.notionalValue;
    }

    // Count how many trades cancel out
    const gross = pending.length;
    let eliminatedTrades = 0;

    for (const fundId of fundIds) {
      if (Math.abs(netPositions[fundId] ?? 0) < 1) {
        // Net position near zero — all obligations cancelled
        eliminatedTrades += pending.filter(
          r => r.buyerFundId === fundId || r.sellerFundId === fundId
        ).length;
      }
    }

    eliminatedTrades = Math.min(eliminatedTrades, Math.floor(gross / 2));
    const net = gross - eliminatedTrades;
    const efficiencyRate = gross > 0 ? eliminatedTrades / gross : 0;

    return {
      grossObligations: gross,
      netObligations: net,
      efficiencyRate,
      participantNetPositions: netPositions,
      eliminatedTrades,
      nettedAt: new Date(),
    };
  }

  // ============================================================================
  // Margin Management
  // ============================================================================

  issueMarginCall(params: IssueMarginCallParams): MarginCall {
    const id = this.generateId('mc');
    const deficit = params.requiredMargin - params.postedMargin;

    if (deficit <= 0) {
      throw new Error('Margin call cannot be issued when posted margin >= required margin');
    }

    const deadlineHours = params.deadlineHours ?? this.config.marginCallWindow;
    const deadline = new Date(Date.now() + deadlineHours * 3_600_000);

    const call: MarginCall = {
      id,
      fundId: params.fundId,
      marginType: params.marginType,
      requiredMargin: params.requiredMargin,
      postedMargin: params.postedMargin,
      deficit,
      deadline,
      status: 'issued',
      issuedAt: new Date(),
    };

    this.marginCalls.set(id, call);
    this.emitEvent('margin_call_issued', {
      callId: id,
      fundId: params.fundId,
      deficit,
      deadline,
    });

    return call;
  }

  meetMarginCall(callId: string, amount: number): MarginCall {
    const call = this.requireMarginCall(callId);

    if (call.status !== 'issued') {
      throw new Error(`Margin call ${callId} is not pending (status: ${call.status})`);
    }

    const newPosted = call.postedMargin + amount;
    const newStatus: MarginCall['status'] = newPosted >= call.requiredMargin ? 'met' : 'issued';

    const updated: MarginCall = {
      ...call,
      postedMargin: newPosted,
      deficit: Math.max(0, call.requiredMargin - newPosted),
      status: newStatus,
    };

    this.marginCalls.set(callId, updated);
    return updated;
  }

  listMarginCalls(filters?: MarginCallFilters): MarginCall[] {
    let result = Array.from(this.marginCalls.values());

    if (filters) {
      if (filters.fundId) result = result.filter(c => c.fundId === filters.fundId);
      if (filters.status) result = result.filter(c => c.status === filters.status);
      if (filters.marginType) result = result.filter(c => c.marginType === filters.marginType);
    }

    return result;
  }

  // ============================================================================
  // Settlement
  // ============================================================================

  initiateSettlement(clearingId: string): SettlementRecord {
    const clearing = this.requireClearing(clearingId);

    if (clearing.status !== 'approved' && clearing.status !== 'matched') {
      throw new Error(
        `Clearing ${clearingId} must be approved/matched before settlement (status: ${clearing.status})`
      );
    }

    const id = this.generateId('stl');

    const record: SettlementRecord = {
      id,
      clearingId,
      buyerFundId: clearing.buyerFundId,
      sellerFundId: clearing.sellerFundId,
      asset: clearing.asset,
      quantity: clearing.quantity,
      settlementAmount: clearing.notionalValue,
      chain: clearing.chain,
      finality: this.config.settlementFinality,
      status: 'pending',
      initiatedAt: new Date(),
    };

    this.settlementRecords.set(id, record);
    this.updateClearingStatus(clearingId, 'settling');

    return record;
  }

  confirmSettlement(settlementId: SettlementId, txHash?: string): SettlementRecord {
    const record = this.requireSettlement(settlementId);

    if (record.status === 'finalized') {
      throw new Error(`Settlement ${settlementId} is already finalized`);
    }

    const now = new Date();
    const finality = this.config.settlementFinality;

    const updated: SettlementRecord = {
      ...record,
      transactionHash: txHash,
      status: finality === 'instant' ? 'finalized' : 'confirmed',
      confirmedAt: now,
      finalizedAt: finality !== 'probabilistic' ? now : undefined,
    };

    this.settlementRecords.set(settlementId, updated);
    this.updateClearingStatus(record.clearingId, 'settled');

    this.emitEvent('trade_settled', {
      settlementId,
      clearingId: record.clearingId,
      amount: record.settlementAmount,
      txHash,
    });

    return updated;
  }

  getSettlementRecord(settlementId: SettlementId): SettlementRecord | undefined {
    return this.settlementRecords.get(settlementId);
  }

  listSettlements(filters?: SettlementFilters): SettlementRecord[] {
    let result = Array.from(this.settlementRecords.values());

    if (filters) {
      if (filters.status) result = result.filter(r => r.status === filters.status);
      if (filters.fundId) {
        result = result.filter(r =>
          r.buyerFundId === filters.fundId || r.sellerFundId === filters.fundId
        );
      }
      if (filters.chain) result = result.filter(r => r.chain === filters.chain);
      if (filters.from) result = result.filter(r => r.initiatedAt >= filters.from!);
      if (filters.to) result = result.filter(r => r.initiatedAt <= filters.to!);
    }

    return result;
  }

  // ============================================================================
  // Default Resolution
  // ============================================================================

  resolveDefault(params: ResolveDefaultParams): DefaultResolutionResult {
    if (!this.config.defaultResolutionEnabled) {
      throw new Error('Default resolution is disabled');
    }

    const { defaultingFundId, exposureAmount } = params;

    let insuranceCoverage = 0;
    let resolutionMethod: DefaultResolutionResult['resolutionMethod'] = 'haircut';

    if (this.config.insurancePoolEnabled && this.insurancePool.availableReserves > 0) {
      insuranceCoverage = Math.min(exposureAmount, this.insurancePool.availableReserves * 0.5);

      // Reduce insurance pool
      this.insurancePool = {
        ...this.insurancePool,
        availableReserves: this.insurancePool.availableReserves - insuranceCoverage,
        claimedAmount: this.insurancePool.claimedAmount + insuranceCoverage,
        updatedAt: new Date(),
      };

      resolutionMethod = insuranceCoverage >= exposureAmount ? 'insurance_pool' : 'haircut';
    }

    const netLoss = exposureAmount - insuranceCoverage;

    return {
      defaultingParty: defaultingFundId,
      exposureAmount,
      insuranceCoverage,
      netLoss,
      resolutionMethod,
      resolvedAt: new Date(),
    };
  }

  // ============================================================================
  // Insurance Pool
  // ============================================================================

  getInsurancePool(): InsurancePool {
    return { ...this.insurancePool };
  }

  fundInsurancePool(amount: number, contributor: FundId): void {
    this.insurancePool = {
      ...this.insurancePool,
      totalReserves: this.insurancePool.totalReserves + amount,
      availableReserves: this.insurancePool.availableReserves + amount,
      fundedBy: [...new Set([...this.insurancePool.fundedBy, contributor])],
      updatedAt: new Date(),
    };
  }

  claimInsurance(amount: number, reason: string): number {
    const covered = Math.min(amount, this.insurancePool.availableReserves);

    this.insurancePool = {
      ...this.insurancePool,
      availableReserves: this.insurancePool.availableReserves - covered,
      claimedAmount: this.insurancePool.claimedAmount + covered,
      updatedAt: new Date(),
    };

    return covered;
  }

  // ============================================================================
  // Stats
  // ============================================================================

  getClearingStats(): ClearingStats {
    const allClearing = Array.from(this.clearingRecords.values());
    const allSettlements = Array.from(this.settlementRecords.values());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const settledToday = allSettlements.filter(
      s => s.status === 'finalized' && s.finalizedAt && s.finalizedAt >= today
    ).length;

    const totalSettledAmount = allSettlements
      .filter(s => s.status === 'finalized' || s.status === 'confirmed')
      .reduce((sum, s) => sum + s.settlementAmount, 0);

    const settledWithTime = allSettlements.filter(
      s => s.confirmedAt && s.initiatedAt
    );
    const avgSettlementTimeMs =
      settledWithTime.length > 0
        ? settledWithTime.reduce(
            (sum, s) => sum + (s.confirmedAt!.getTime() - s.initiatedAt.getTime()),
            0
          ) / settledWithTime.length
        : 0;

    const activeMarginCalls = Array.from(this.marginCalls.values()).filter(
      c => c.status === 'issued'
    ).length;

    return {
      totalClearing: allClearing.length,
      pendingClearing: allClearing.filter(r => r.status === 'pending').length,
      settledToday,
      totalSettledAmount,
      averageSettlementTimeMs: avgSettlementTimeMs,
      nettingEfficiencyRate: 0, // Filled after netting runs
      activeMarginCalls,
      insurancePoolBalance: this.insurancePool.availableReserves,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private initInsurancePool(): InsurancePool {
    const defaultCoverage: InsuranceCoverage[] = [
      {
        eventType: 'default',
        maxCoverage: 10_000_000,
        deductible: 50_000,
        premiumRate: 0.002,
      },
      {
        eventType: 'smart_contract_exploit',
        maxCoverage: 5_000_000,
        deductible: 100_000,
        premiumRate: 0.003,
      },
    ];

    return {
      id: 'insurance_pool_gaamp',
      name: 'GAAMP Protocol Insurance Pool',
      totalReserves: 0,
      availableReserves: 0,
      claimedAmount: 0,
      coverage: defaultCoverage,
      fundedBy: [],
      updatedAt: new Date(),
    };
  }

  private requireClearing(clearingId: string): ClearingRecord {
    const record = this.clearingRecords.get(clearingId);
    if (!record) {
      throw new Error(`Clearing record not found: ${clearingId}`);
    }
    return record;
  }

  private requireSettlement(settlementId: SettlementId): SettlementRecord {
    const record = this.settlementRecords.get(settlementId);
    if (!record) {
      throw new Error(`Settlement record not found: ${settlementId}`);
    }
    return record;
  }

  private requireMarginCall(callId: string): MarginCall {
    const call = this.marginCalls.get(callId);
    if (!call) {
      throw new Error(`Margin call not found: ${callId}`);
    }
    return call;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
      payload,
      timestamp: new Date(),
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createClearingSettlementLayer(
  config?: Partial<ClearingLayerConfig>
): DefaultClearingSettlementLayer {
  return new DefaultClearingSettlementLayer(config);
}

export default DefaultClearingSettlementLayer;
