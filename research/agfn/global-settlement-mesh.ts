/**
 * TONAIAgent - AGFN Global Settlement Mesh
 *
 * Manages multi-region settlement, cross-chain finality, and atomic
 * cross-jurisdiction transfers in the Autonomous Global Financial Network.
 * Supports gross, net, atomic, and deferred net settlement modes with
 * on-chain finality tracking and netting engine.
 *
 * This is Component 3 of the Autonomous Global Financial Network (AGFN).
 */

import {
  SettlementTransaction,
  SettlementNettingCycle,
  CrossChainFinalityRecord,
  SettlementId,
  RouteId,
  NodeId,
  SettlementStatus,
  SettlementType,
  ChainId,
  GlobalSettlementMeshConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SETTLEMENT_MESH_CONFIG: GlobalSettlementMeshConfig = {
  enableAtomicCrossJurisdictionTransfers: true,
  enableNettingEngine: true,
  nettingCycleIntervalMs: 3_600_000, // 1 hour
  requiredFinalityConfirmations: 6,
  maxSettlementRetries: 3,
  settlementTimeoutMs: 300_000, // 5 minutes
};

// ============================================================================
// Global Settlement Mesh Interface
// ============================================================================

export interface GlobalSettlementMesh {
  readonly config: GlobalSettlementMeshConfig;

  // Settlement Transactions
  initiateSettlement(params: InitiateSettlementParams): SettlementTransaction;
  getSettlement(id: SettlementId): SettlementTransaction | undefined;
  listSettlements(filters?: SettlementFilters): SettlementTransaction[];
  finalizeSettlement(id: SettlementId, txHash: string, blockNumber: number): SettlementTransaction;
  failSettlement(id: SettlementId, reason: string): SettlementTransaction;
  retrySettlement(id: SettlementId): SettlementTransaction;

  // Netting Engine
  openNettingCycle(participatingNodes: NodeId[]): SettlementNettingCycle;
  getNettingCycle(id: string): SettlementNettingCycle | undefined;
  listNettingCycles(filters?: NettingCycleFilters): SettlementNettingCycle[];
  addTransactionToNettingCycle(cycleId: string, settlementId: SettlementId): void;
  executeNettingCycle(cycleId: string): NettingResult;

  // Cross-Chain Finality
  recordFinalityTracking(params: RecordFinalityParams): CrossChainFinalityRecord;
  getFinalityRecord(id: string): CrossChainFinalityRecord | undefined;
  listFinalityRecords(filters?: FinalityFilters): CrossChainFinalityRecord[];
  updateFinalityConfirmations(
    recordId: string,
    sourceConfirmations: number,
    destinationConfirmations?: number,
    destinationTxHash?: string
  ): CrossChainFinalityRecord;

  // Analytics
  getSettlementMetrics(): SettlementMetrics;
  getMeshStatus(): MeshStatus;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface InitiateSettlementParams {
  routeId: RouteId;
  settlementType: SettlementType;
  sourceNodeId: NodeId;
  destinationNodeId: NodeId;
  amount: number;
  currency: string;
  chain: ChainId;
  metadata?: Record<string, unknown>;
}

export interface SettlementFilters {
  routeId?: RouteId;
  sourceNodeId?: NodeId;
  destinationNodeId?: NodeId;
  status?: SettlementStatus;
  settlementType?: SettlementType;
  chain?: ChainId;
  minAmount?: number;
  maxAmount?: number;
}

export interface NettingCycleFilters {
  status?: SettlementNettingCycle['status'];
}

export interface NettingResult {
  cycleId: string;
  grossTransactions: number;
  grossVolumeUSD: number;
  netTransactions: number;
  netVolumeUSD: number;
  nettingEfficiency: number; // % reduction
  settlementsNetted: SettlementId[];
  remainingObligations: Array<{ fromNode: NodeId; toNode: NodeId; amountUSD: number }>;
}

export interface RecordFinalityParams {
  transactionId: SettlementId;
  sourceChain: ChainId;
  destinationChain: ChainId;
  bridgeProtocol: string;
  sourceTxHash: string;
  atomicSwapUsed?: boolean;
}

export interface FinalityFilters {
  transactionId?: SettlementId;
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  finalityStatus?: CrossChainFinalityRecord['finalityStatus'];
}

export interface SettlementMetrics {
  totalSettlements: number;
  pendingSettlements: number;
  processingSettlements: number;
  finalizedSettlements: number;
  failedSettlements: number;
  successRate: number; // 0-1
  totalVolumeSettledUSD: number;
  averageSettlementTimeMs: number;
  nettingEfficiency: number; // Average % reduction
  atomicTransfersCompleted: number;
}

export interface MeshStatus {
  totalNodes: number;
  activeSettlements: number;
  openNettingCycles: number;
  pendingFinalityRecords: number;
  meshHealth: 'healthy' | 'degraded' | 'critical';
  generatedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGlobalSettlementMesh implements GlobalSettlementMesh {
  readonly config: GlobalSettlementMeshConfig;

  private readonly settlements = new Map<SettlementId, SettlementTransaction>();
  private readonly nettingCycles = new Map<string, SettlementNettingCycle>();
  private readonly nettingCycleTransactions = new Map<string, Set<SettlementId>>();
  private readonly finalityRecords = new Map<string, CrossChainFinalityRecord>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GlobalSettlementMeshConfig>) {
    this.config = { ...DEFAULT_SETTLEMENT_MESH_CONFIG, ...config };
  }

  // ============================================================================
  // Settlement Transactions
  // ============================================================================

  initiateSettlement(params: InitiateSettlementParams): SettlementTransaction {
    const settlement: SettlementTransaction = {
      id: this.generateId('settle'),
      routeId: params.routeId,
      settlementType: params.settlementType,
      sourceNodeId: params.sourceNodeId,
      destinationNodeId: params.destinationNodeId,
      amount: params.amount,
      currency: params.currency,
      chain: params.chain,
      grossAmount: params.amount,
      feesPaid: params.amount * 0.0005, // 0.05% fee
      finalityConfirmations: 0,
      requiredConfirmations: this.config.requiredFinalityConfirmations,
      status: 'pending',
      initiatedAt: new Date(),
      metadata: params.metadata ?? {},
    };

    this.settlements.set(settlement.id, settlement);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'settlement_initiated',
      severity: 'info',
      source: 'GlobalSettlementMesh',
      message: `Settlement initiated: ${params.amount} ${params.currency} (${params.settlementType})`,
      data: { settlementId: settlement.id, amount: params.amount, type: params.settlementType },
      timestamp: new Date(),
    });

    return settlement;
  }

  getSettlement(id: SettlementId): SettlementTransaction | undefined {
    return this.settlements.get(id);
  }

  listSettlements(filters?: SettlementFilters): SettlementTransaction[] {
    let results = Array.from(this.settlements.values());

    if (filters?.routeId) results = results.filter(s => s.routeId === filters.routeId);
    if (filters?.sourceNodeId) results = results.filter(s => s.sourceNodeId === filters.sourceNodeId);
    if (filters?.destinationNodeId) results = results.filter(s => s.destinationNodeId === filters.destinationNodeId);
    if (filters?.status) results = results.filter(s => s.status === filters.status);
    if (filters?.settlementType) results = results.filter(s => s.settlementType === filters.settlementType);
    if (filters?.chain) results = results.filter(s => s.chain === filters.chain);
    if (filters?.minAmount !== undefined) results = results.filter(s => s.amount >= filters.minAmount!);
    if (filters?.maxAmount !== undefined) results = results.filter(s => s.amount <= filters.maxAmount!);

    return results;
  }

  finalizeSettlement(id: SettlementId, txHash: string, blockNumber: number): SettlementTransaction {
    const settlement = this.settlements.get(id);
    if (!settlement) throw new Error(`Settlement not found: ${id}`);
    if (settlement.status === 'finalized') throw new Error('Settlement already finalized');
    if (settlement.status === 'failed') throw new Error('Cannot finalize a failed settlement');

    settlement.status = 'finalized';
    settlement.onChainTxHash = txHash;
    settlement.finalityBlockNumber = blockNumber;
    settlement.finalityConfirmations = this.config.requiredFinalityConfirmations;
    settlement.finalizedAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'settlement_finalized',
      severity: 'info',
      source: 'GlobalSettlementMesh',
      message: `Settlement finalized: ${settlement.amount} ${settlement.currency}`,
      data: { settlementId: id, txHash, blockNumber },
      timestamp: new Date(),
    });

    return settlement;
  }

  failSettlement(id: SettlementId, reason: string): SettlementTransaction {
    const settlement = this.settlements.get(id);
    if (!settlement) throw new Error(`Settlement not found: ${id}`);
    if (settlement.status === 'finalized') throw new Error('Cannot fail a finalized settlement');

    settlement.status = 'failed';
    settlement.failureReason = reason;

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'settlement_failed',
      severity: 'error',
      source: 'GlobalSettlementMesh',
      message: `Settlement failed: ${reason}`,
      data: { settlementId: id, reason },
      timestamp: new Date(),
    });

    return settlement;
  }

  retrySettlement(id: SettlementId): SettlementTransaction {
    const settlement = this.settlements.get(id);
    if (!settlement) throw new Error(`Settlement not found: ${id}`);
    if (settlement.status !== 'failed') {
      throw new Error(`Cannot retry settlement with status: ${settlement.status}`);
    }

    settlement.status = 'processing';
    settlement.failureReason = undefined;
    settlement.finalityConfirmations = 0;

    return settlement;
  }

  // ============================================================================
  // Netting Engine
  // ============================================================================

  openNettingCycle(participatingNodes: NodeId[]): SettlementNettingCycle {
    const cycle: SettlementNettingCycle = {
      id: this.generateId('cycle'),
      participatingNodes,
      grossTransactionCount: 0,
      grossVolumeUSD: 0,
      netTransactionCount: 0,
      netVolumeUSD: 0,
      nettingEfficiency: 0,
      cycleStartAt: new Date(),
      cycleEndAt: new Date(Date.now() + this.config.nettingCycleIntervalMs),
      status: 'open',
    };

    this.nettingCycles.set(cycle.id, cycle);
    this.nettingCycleTransactions.set(cycle.id, new Set());

    return cycle;
  }

  getNettingCycle(id: string): SettlementNettingCycle | undefined {
    return this.nettingCycles.get(id);
  }

  listNettingCycles(filters?: NettingCycleFilters): SettlementNettingCycle[] {
    let results = Array.from(this.nettingCycles.values());

    if (filters?.status) results = results.filter(c => c.status === filters.status);

    return results;
  }

  addTransactionToNettingCycle(cycleId: string, settlementId: SettlementId): void {
    const cycle = this.nettingCycles.get(cycleId);
    if (!cycle) throw new Error(`Netting cycle not found: ${cycleId}`);
    if (cycle.status !== 'open') throw new Error(`Cannot add to netting cycle with status: ${cycle.status}`);

    const settlement = this.settlements.get(settlementId);
    if (!settlement) throw new Error(`Settlement not found: ${settlementId}`);

    const transactions = this.nettingCycleTransactions.get(cycleId);
    if (transactions) {
      transactions.add(settlementId);
      cycle.grossTransactionCount = transactions.size;
      cycle.grossVolumeUSD += settlement.amount;
    }
  }

  executeNettingCycle(cycleId: string): NettingResult {
    const cycle = this.nettingCycles.get(cycleId);
    if (!cycle) throw new Error(`Netting cycle not found: ${cycleId}`);
    if (cycle.status !== 'open') throw new Error(`Cannot execute netting cycle with status: ${cycle.status}`);

    cycle.status = 'netting';

    const transactionIds = Array.from(this.nettingCycleTransactions.get(cycleId) ?? []);
    const transactions = transactionIds
      .map(id => this.settlements.get(id))
      .filter((s): s is SettlementTransaction => s !== undefined);

    // Build net obligations per node pair
    const obligations = new Map<string, number>(); // "fromNode->toNode" -> net amount
    for (const tx of transactions) {
      const key = `${tx.sourceNodeId}->${tx.destinationNodeId}`;
      const reverseKey = `${tx.destinationNodeId}->${tx.sourceNodeId}`;

      if (obligations.has(reverseKey)) {
        const reverseAmount = obligations.get(reverseKey)!;
        if (tx.amount >= reverseAmount) {
          obligations.delete(reverseKey);
          if (tx.amount > reverseAmount) {
            obligations.set(key, tx.amount - reverseAmount);
          }
        } else {
          obligations.set(reverseKey, reverseAmount - tx.amount);
        }
      } else {
        obligations.set(key, (obligations.get(key) ?? 0) + tx.amount);
      }
    }

    const remainingObligations = Array.from(obligations.entries()).map(([key, amountUSD]) => {
      const [fromNode, toNode] = key.split('->');
      return { fromNode, toNode, amountUSD };
    });

    const netVolumeUSD = remainingObligations.reduce((sum, o) => sum + o.amountUSD, 0);
    const nettingEfficiency = cycle.grossVolumeUSD > 0
      ? (1 - netVolumeUSD / cycle.grossVolumeUSD) * 100
      : 0;

    cycle.netTransactionCount = remainingObligations.length;
    cycle.netVolumeUSD = netVolumeUSD;
    cycle.nettingEfficiency = nettingEfficiency;
    cycle.status = 'settled';

    return {
      cycleId,
      grossTransactions: transactions.length,
      grossVolumeUSD: cycle.grossVolumeUSD,
      netTransactions: remainingObligations.length,
      netVolumeUSD,
      nettingEfficiency,
      settlementsNetted: transactionIds,
      remainingObligations,
    };
  }

  // ============================================================================
  // Cross-Chain Finality
  // ============================================================================

  recordFinalityTracking(params: RecordFinalityParams): CrossChainFinalityRecord {
    const record: CrossChainFinalityRecord = {
      id: this.generateId('finality'),
      transactionId: params.transactionId,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      bridgeProtocol: params.bridgeProtocol,
      sourceTxHash: params.sourceTxHash,
      sourceConfirmations: 0,
      destinationConfirmations: 0,
      atomicSwapUsed: params.atomicSwapUsed ?? false,
      finalityStatus: 'pending_source',
      recordedAt: new Date(),
    };

    this.finalityRecords.set(record.id, record);
    return record;
  }

  getFinalityRecord(id: string): CrossChainFinalityRecord | undefined {
    return this.finalityRecords.get(id);
  }

  listFinalityRecords(filters?: FinalityFilters): CrossChainFinalityRecord[] {
    let results = Array.from(this.finalityRecords.values());

    if (filters?.transactionId) results = results.filter(r => r.transactionId === filters.transactionId);
    if (filters?.sourceChain) results = results.filter(r => r.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) results = results.filter(r => r.destinationChain === filters.destinationChain);
    if (filters?.finalityStatus) results = results.filter(r => r.finalityStatus === filters.finalityStatus);

    return results;
  }

  updateFinalityConfirmations(
    recordId: string,
    sourceConfirmations: number,
    destinationConfirmations?: number,
    destinationTxHash?: string
  ): CrossChainFinalityRecord {
    const record = this.finalityRecords.get(recordId);
    if (!record) throw new Error(`Finality record not found: ${recordId}`);

    record.sourceConfirmations = sourceConfirmations;

    if (destinationConfirmations !== undefined) {
      record.destinationConfirmations = destinationConfirmations;
    }

    if (destinationTxHash) {
      record.destinationTxHash = destinationTxHash;
    }

    const requiredConfirmations = this.config.requiredFinalityConfirmations;

    if (record.sourceConfirmations < requiredConfirmations) {
      record.finalityStatus = 'pending_source';
    } else if (record.destinationTxHash && record.destinationConfirmations < requiredConfirmations) {
      record.finalityStatus = 'pending_destination';
    } else if (record.sourceConfirmations >= requiredConfirmations &&
               (!record.destinationTxHash || record.destinationConfirmations >= requiredConfirmations)) {
      record.finalityStatus = 'finalized';
      record.finalizedAt = new Date();
      if (record.recordedAt) {
        record.crossChainLatencyMs = record.finalizedAt.getTime() - record.recordedAt.getTime();
      }
    }

    return record;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getSettlementMetrics(): SettlementMetrics {
    const allSettlements = Array.from(this.settlements.values());
    const pending = allSettlements.filter(s => s.status === 'pending');
    const processing = allSettlements.filter(s => s.status === 'processing');
    const finalized = allSettlements.filter(s => s.status === 'finalized');
    const failed = allSettlements.filter(s => s.status === 'failed');

    const totalVolumeSettledUSD = finalized.reduce((sum, s) => sum + s.amount, 0);

    const settledWithTime = finalized.filter(s => s.finalizedAt);
    const averageSettlementTimeMs = settledWithTime.length > 0
      ? settledWithTime.reduce((sum, s) => {
          const time = s.finalizedAt!.getTime() - s.initiatedAt.getTime();
          return sum + time;
        }, 0) / settledWithTime.length
      : 0;

    const completedCycles = Array.from(this.nettingCycles.values()).filter(c => c.status === 'settled');
    const averageNettingEfficiency = completedCycles.length > 0
      ? completedCycles.reduce((sum, c) => sum + c.nettingEfficiency, 0) / completedCycles.length
      : 0;

    const atomicSettlements = finalized.filter(s => s.settlementType === 'atomic');

    const executedCount = (finalized.length + failed.length);
    return {
      totalSettlements: allSettlements.length,
      pendingSettlements: pending.length,
      processingSettlements: processing.length,
      finalizedSettlements: finalized.length,
      failedSettlements: failed.length,
      successRate: executedCount > 0 ? finalized.length / executedCount : 0,
      totalVolumeSettledUSD,
      averageSettlementTimeMs,
      nettingEfficiency: averageNettingEfficiency,
      atomicTransfersCompleted: atomicSettlements.length,
    };
  }

  getMeshStatus(): MeshStatus {
    const activeSettlements = Array.from(this.settlements.values())
      .filter(s => s.status === 'pending' || s.status === 'processing').length;
    const openNettingCycles = Array.from(this.nettingCycles.values())
      .filter(c => c.status === 'open').length;
    const pendingFinalityRecords = Array.from(this.finalityRecords.values())
      .filter(r => r.finalityStatus !== 'finalized').length;

    let meshHealth: MeshStatus['meshHealth'] = 'healthy';
    if (activeSettlements > 100 || pendingFinalityRecords > 50) {
      meshHealth = 'degraded';
    }
    if (activeSettlements > 500 || pendingFinalityRecords > 200) {
      meshHealth = 'critical';
    }

    return {
      totalNodes: 0, // Would be populated from node architecture
      activeSettlements,
      openNettingCycles,
      pendingFinalityRecords,
      meshHealth,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFNEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGlobalSettlementMesh(
  config?: Partial<GlobalSettlementMeshConfig>
): DefaultGlobalSettlementMesh {
  return new DefaultGlobalSettlementMesh(config);
}

export default DefaultGlobalSettlementMesh;
