/**
 * TONAIAgent - Multi-Fund Custody & Clearing
 *
 * Centralized capital pool management with multi-agent capital allocation,
 * internal clearing between strategies, net exposure calculation,
 * cross-strategy netting, capital efficiency optimization, and
 * automated collateral management.
 */

import {
  CentralCapitalPool,
  FundAllocation,
  AgentCapitalAllocation,
  InternalClearingEntry,
  NetExposurePosition,
  CollateralPosition,
  AutomatedCollateralManagement,
  CustodyConfig,
  CollateralType,
  ClearingStatus,
  FundId,
  AgentId,
  AssetId,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

// ============================================================================
// Custody & Clearing Manager Interface
// ============================================================================

export interface CustodyAndClearingManager {
  readonly config: CustodyConfig;

  // Capital Pool Management
  createCapitalPool(name: string, initialCapital: number, currency?: string): CentralCapitalPool;
  getCapitalPool(poolId: string): CentralCapitalPool | undefined;
  listCapitalPools(): CentralCapitalPool[];
  allocateToFund(poolId: string, fundId: FundId, amount: number, fundName?: string): FundAllocation;
  deallocateFromFund(poolId: string, fundId: FundId, amount: number): void;
  allocateToAgent(
    fundId: FundId,
    agentId: AgentId,
    capital: number,
    strategy: string,
    leverage?: number
  ): AgentCapitalAllocation;
  getAgentAllocation(agentId: AgentId): AgentCapitalAllocation | undefined;
  listAgentAllocations(fundId?: FundId): AgentCapitalAllocation[];

  // Internal Clearing
  submitClearingEntry(entry: Omit<InternalClearingEntry, 'id' | 'status' | 'initiatedAt'>): InternalClearingEntry;
  settleClearingEntry(entryId: string): InternalClearingEntry;
  getClearingEntry(entryId: string): InternalClearingEntry | undefined;
  listClearingEntries(filters?: ClearingFilters): InternalClearingEntry[];
  runNetting(assetId: AssetId): NetExposurePosition;

  // Net Exposure
  getNetExposure(assetId?: AssetId): NetExposurePosition[];
  calculateCrossStrategyNetting(): NettingResult;

  // Collateral Management
  depositCollateral(params: DepositCollateralParams): CollateralPosition;
  releaseCollateral(collateralId: string): CollateralPosition;
  getCollateralPosition(collateralId: string): CollateralPosition | undefined;
  listCollateralPositions(ownerId?: string): CollateralPosition[];
  getCollateralManagementStatus(): AutomatedCollateralManagement;
  rebalanceCollateral(): CollateralRebalanceResult;

  // Events
  onEvent(callback: PrimeBrokerageEventCallback): void;
}

export interface ClearingFilters {
  fromFundId?: FundId;
  toFundId?: FundId;
  assetId?: AssetId;
  status?: ClearingStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface DepositCollateralParams {
  ownerId: string;
  assetId: AssetId;
  collateralType: CollateralType;
  amount: number;
  valueUsd: number;
  lockedFor?: string;
}

export interface NettingResult {
  assetsNetted: number;
  grossExposureBefore: number;
  netExposureAfter: number;
  capitalFreed: number;
  efficiencyGain: number; // % reduction in gross exposure
  timestamp: Date;
}

export interface CollateralRebalanceResult {
  rebalanced: boolean;
  collateralMoved: number;
  fromPositions: string[];
  toPositions: string[];
  newUtilizationRate: number;
  timestamp: Date;
}

// ============================================================================
// Default Custody & Clearing Manager Implementation
// ============================================================================

const DEFAULT_CUSTODY_CONFIG: CustodyConfig = {
  enableInternalNetting: true,
  settlementFrequency: 'hourly',
  collateralHaircutRules: [
    { collateralType: 'ton', haircut: 0.2, maxAllocation: 0.5 },
    { collateralType: 'usdt', haircut: 0.02, maxAllocation: 0.8 },
    { collateralType: 'usdc', haircut: 0.02, maxAllocation: 0.8 },
    { collateralType: 'btc', haircut: 0.15, maxAllocation: 0.4 },
    { collateralType: 'eth', haircut: 0.15, maxAllocation: 0.4 },
    { collateralType: 'rwa_token', haircut: 0.3, maxAllocation: 0.3 },
    { collateralType: 'lp_token', haircut: 0.4, maxAllocation: 0.2 },
    { collateralType: 'staking_token', haircut: 0.25, maxAllocation: 0.3 },
  ],
  netExposureThreshold: 0.1,
  autoRebalanceEnabled: true,
  autoRebalanceThreshold: 0.2,
};

export class DefaultCustodyAndClearingManager implements CustodyAndClearingManager {
  readonly config: CustodyConfig;

  private readonly capitalPools: Map<string, CentralCapitalPool> = new Map();
  private readonly agentAllocations: Map<AgentId, AgentCapitalAllocation> = new Map();
  private readonly clearingEntries: Map<string, InternalClearingEntry> = new Map();
  private readonly netExposures: Map<AssetId, NetExposurePosition> = new Map();
  private readonly collateralPositions: Map<string, CollateralPosition> = new Map();
  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: Partial<CustodyConfig>) {
    this.config = { ...DEFAULT_CUSTODY_CONFIG, ...config };
  }

  // ============================================================================
  // Capital Pool Management
  // ============================================================================

  createCapitalPool(name: string, initialCapital: number, currency = 'USD'): CentralCapitalPool {
    const pool: CentralCapitalPool = {
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      totalCapital: initialCapital,
      availableCapital: initialCapital,
      allocatedCapital: 0,
      currency,
      fundAllocations: [],
      lastUpdated: new Date(),
    };
    this.capitalPools.set(pool.id, pool);

    this.emitEvent('info', 'custody_clearing', `Capital pool created: ${name}`, {
      poolId: pool.id,
      initialCapital,
      currency,
    });

    return pool;
  }

  getCapitalPool(poolId: string): CentralCapitalPool | undefined {
    return this.capitalPools.get(poolId);
  }

  listCapitalPools(): CentralCapitalPool[] {
    return Array.from(this.capitalPools.values());
  }

  allocateToFund(poolId: string, fundId: FundId, amount: number, fundName?: string): FundAllocation {
    const pool = this.capitalPools.get(poolId);
    if (!pool) {
      throw new Error(`Capital pool not found: ${poolId}`);
    }
    if (amount > pool.availableCapital) {
      throw new Error(
        `Insufficient capital: requested ${amount}, available ${pool.availableCapital}`
      );
    }

    const existing = pool.fundAllocations.find(a => a.fundId === fundId);
    if (existing) {
      existing.allocatedAmount += amount;
      existing.utilizationRate = existing.allocatedAmount / pool.totalCapital;
      pool.availableCapital -= amount;
      pool.allocatedCapital += amount;
      pool.lastUpdated = new Date();
      this.capitalPools.set(poolId, pool);
      return existing;
    }

    const allocation: FundAllocation = {
      fundId,
      fundName: fundName || fundId,
      allocatedAmount: amount,
      utilizationRate: amount / pool.totalCapital,
      agentIds: [],
      strategyTypes: [],
      lastRebalanced: new Date(),
    };

    pool.fundAllocations.push(allocation);
    pool.availableCapital -= amount;
    pool.allocatedCapital += amount;
    pool.lastUpdated = new Date();
    this.capitalPools.set(poolId, pool);

    this.emitEvent('info', 'custody_clearing', `Capital allocated to fund: ${fundId}`, {
      poolId,
      fundId,
      amount,
    });

    return allocation;
  }

  deallocateFromFund(poolId: string, fundId: FundId, amount: number): void {
    const pool = this.capitalPools.get(poolId);
    if (!pool) {
      throw new Error(`Capital pool not found: ${poolId}`);
    }

    const allocation = pool.fundAllocations.find(a => a.fundId === fundId);
    if (!allocation) {
      throw new Error(`Fund allocation not found: ${fundId}`);
    }

    const deallocationAmount = Math.min(amount, allocation.allocatedAmount);
    allocation.allocatedAmount -= deallocationAmount;
    allocation.utilizationRate = allocation.allocatedAmount / pool.totalCapital;
    pool.availableCapital += deallocationAmount;
    pool.allocatedCapital -= deallocationAmount;
    pool.lastUpdated = new Date();
    this.capitalPools.set(poolId, pool);

    this.emitEvent('info', 'custody_clearing', `Capital deallocated from fund: ${fundId}`, {
      poolId,
      fundId,
      amount: deallocationAmount,
    });
  }

  allocateToAgent(
    fundId: FundId,
    agentId: AgentId,
    capital: number,
    strategy: string,
    leverage = 1.0
  ): AgentCapitalAllocation {
    const allocation: AgentCapitalAllocation = {
      agentId,
      fundId,
      allocatedCapital: capital,
      usedCapital: 0,
      availableCapital: capital,
      leverageMultiplier: leverage,
      effectiveCapital: capital * leverage,
      strategy,
      lastUpdated: new Date(),
    };

    this.agentAllocations.set(agentId, allocation);

    this.emitEvent('info', 'custody_clearing', `Capital allocated to agent: ${agentId}`, {
      fundId,
      agentId,
      capital,
      leverage,
      strategy,
    });

    return allocation;
  }

  getAgentAllocation(agentId: AgentId): AgentCapitalAllocation | undefined {
    return this.agentAllocations.get(agentId);
  }

  listAgentAllocations(fundId?: FundId): AgentCapitalAllocation[] {
    const all = Array.from(this.agentAllocations.values());
    if (fundId) {
      return all.filter(a => a.fundId === fundId);
    }
    return all;
  }

  // ============================================================================
  // Internal Clearing
  // ============================================================================

  submitClearingEntry(
    entry: Omit<InternalClearingEntry, 'id' | 'status' | 'initiatedAt'>
  ): InternalClearingEntry {
    const clearingEntry: InternalClearingEntry = {
      ...entry,
      id: `clear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      initiatedAt: new Date(),
    };

    this.clearingEntries.set(clearingEntry.id, clearingEntry);

    this.emitEvent('info', 'custody_clearing', 'Clearing entry submitted', {
      entryId: clearingEntry.id,
      fromFundId: entry.fromFundId,
      toFundId: entry.toFundId,
      notionalValue: entry.notionalValue,
    });

    // Auto-settle if settlement frequency is realtime
    if (this.config.settlementFrequency === 'realtime') {
      return this.settleClearingEntry(clearingEntry.id);
    }

    return clearingEntry;
  }

  settleClearingEntry(entryId: string): InternalClearingEntry {
    const entry = this.clearingEntries.get(entryId);
    if (!entry) {
      throw new Error(`Clearing entry not found: ${entryId}`);
    }

    entry.status = 'settled';
    entry.settledAt = new Date();
    this.clearingEntries.set(entryId, entry);

    this.emitEvent('info', 'custody_clearing', 'Clearing entry settled', {
      entryId,
      fromFundId: entry.fromFundId,
      toFundId: entry.toFundId,
    });

    return entry;
  }

  getClearingEntry(entryId: string): InternalClearingEntry | undefined {
    return this.clearingEntries.get(entryId);
  }

  listClearingEntries(filters?: ClearingFilters): InternalClearingEntry[] {
    let entries = Array.from(this.clearingEntries.values());

    if (filters) {
      if (filters.fromFundId) {
        entries = entries.filter(e => e.fromFundId === filters.fromFundId);
      }
      if (filters.toFundId) {
        entries = entries.filter(e => e.toFundId === filters.toFundId);
      }
      if (filters.assetId) {
        entries = entries.filter(e => e.assetId === filters.assetId);
      }
      if (filters.status) {
        entries = entries.filter(e => e.status === filters.status);
      }
      if (filters.fromDate) {
        entries = entries.filter(e => e.initiatedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        entries = entries.filter(e => e.initiatedAt <= filters.toDate!);
      }
    }

    return entries;
  }

  runNetting(assetId: AssetId): NetExposurePosition {
    const agentAllocations = Array.from(this.agentAllocations.values());

    // Group by asset and calculate gross exposures
    const longByFund = new Map<FundId, number>();
    const shortByFund = new Map<FundId, number>();

    // Simulate position data based on allocations
    for (const alloc of agentAllocations) {
      // In a real implementation, this would query actual positions
      const existing = longByFund.get(alloc.fundId) || 0;
      longByFund.set(alloc.fundId, existing + alloc.usedCapital * 0.6);

      const existingShort = shortByFund.get(alloc.fundId) || 0;
      shortByFund.set(alloc.fundId, existingShort + alloc.usedCapital * 0.2);
    }

    const fundBreakdowns = [];
    let totalLong = 0;
    let totalShort = 0;

    for (const [fundId, longPos] of longByFund.entries()) {
      const shortPos = shortByFund.get(fundId) || 0;
      fundBreakdowns.push({
        fundId,
        fundName: fundId,
        longPosition: longPos,
        shortPosition: shortPos,
        netPosition: longPos - shortPos,
      });
      totalLong += longPos;
      totalShort += shortPos;
    }

    const netExposure = totalLong - totalShort;
    const grossExposure = totalLong + totalShort;
    const capitalSaved = Math.min(totalLong, totalShort) * 2; // Capital freed by netting

    const position: NetExposurePosition = {
      assetId,
      assetName: assetId,
      longExposure: totalLong,
      shortExposure: totalShort,
      netExposure,
      netExposurePercent: grossExposure > 0 ? (netExposure / grossExposure) * 100 : 0,
      grossExposure,
      byFund: fundBreakdowns,
      capitalSaved,
      updatedAt: new Date(),
    };

    this.netExposures.set(assetId, position);

    return position;
  }

  getNetExposure(assetId?: AssetId): NetExposurePosition[] {
    if (assetId) {
      const pos = this.netExposures.get(assetId);
      return pos ? [pos] : [];
    }
    return Array.from(this.netExposures.values());
  }

  calculateCrossStrategyNetting(): NettingResult {
    const before = Array.from(this.netExposures.values()).reduce(
      (sum, p) => sum + p.grossExposure,
      0
    );

    // Run netting for all tracked assets
    for (const assetId of this.netExposures.keys()) {
      this.runNetting(assetId);
    }

    const after = Array.from(this.netExposures.values()).reduce(
      (sum, p) => sum + Math.abs(p.netExposure),
      0
    );

    const capitalFreed = Array.from(this.netExposures.values()).reduce(
      (sum, p) => sum + p.capitalSaved,
      0
    );

    const result: NettingResult = {
      assetsNetted: this.netExposures.size,
      grossExposureBefore: before,
      netExposureAfter: after,
      capitalFreed,
      efficiencyGain: before > 0 ? ((before - after) / before) * 100 : 0,
      timestamp: new Date(),
    };

    this.emitEvent('info', 'custody_clearing', 'Cross-strategy netting completed', {
      assetsNetted: result.assetsNetted,
      capitalFreed: result.capitalFreed,
      efficiencyGain: result.efficiencyGain,
    });

    return result;
  }

  // ============================================================================
  // Collateral Management
  // ============================================================================

  depositCollateral(params: DepositCollateralParams): CollateralPosition {
    const haircutRule = this.config.collateralHaircutRules.find(
      r => r.collateralType === params.collateralType
    );
    const haircut = haircutRule?.haircut ?? 0.2;
    const adjustedValue = params.valueUsd * (1 - haircut);

    const position: CollateralPosition = {
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId: params.ownerId,
      assetId: params.assetId,
      collateralType: params.collateralType,
      amount: params.amount,
      value: params.valueUsd,
      haircut,
      adjustedValue,
      isLocked: !!params.lockedFor,
      lockedFor: params.lockedFor,
      depositedAt: new Date(),
      updatedAt: new Date(),
    };

    this.collateralPositions.set(position.id, position);

    this.emitEvent('info', 'custody_clearing', 'Collateral deposited', {
      collateralId: position.id,
      ownerId: params.ownerId,
      collateralType: params.collateralType,
      valueUsd: params.valueUsd,
      adjustedValue,
    });

    return position;
  }

  releaseCollateral(collateralId: string): CollateralPosition {
    const position = this.collateralPositions.get(collateralId);
    if (!position) {
      throw new Error(`Collateral position not found: ${collateralId}`);
    }

    position.isLocked = false;
    position.lockedFor = undefined;
    position.updatedAt = new Date();
    this.collateralPositions.set(collateralId, position);

    this.emitEvent('info', 'custody_clearing', 'Collateral released', {
      collateralId,
      ownerId: position.ownerId,
      value: position.value,
    });

    return position;
  }

  getCollateralPosition(collateralId: string): CollateralPosition | undefined {
    return this.collateralPositions.get(collateralId);
  }

  listCollateralPositions(ownerId?: string): CollateralPosition[] {
    const all = Array.from(this.collateralPositions.values());
    if (ownerId) {
      return all.filter(p => p.ownerId === ownerId);
    }
    return all;
  }

  getCollateralManagementStatus(): AutomatedCollateralManagement {
    const positions = Array.from(this.collateralPositions.values());
    const totalCollateral = positions.reduce((sum, p) => sum + p.value, 0);
    const adjustedCollateral = positions.reduce((sum, p) => sum + p.adjustedValue, 0);
    const lockedCollateral = positions.filter(p => p.isLocked).reduce((sum, p) => sum + p.adjustedValue, 0);
    const utilizationRate = adjustedCollateral > 0 ? lockedCollateral / adjustedCollateral : 0;

    return {
      poolId: 'main',
      totalCollateral,
      adjustedCollateral,
      utilizationRate,
      marginCoverage: utilizationRate > 0 ? adjustedCollateral / lockedCollateral : 1,
      rebalanceThreshold: this.config.autoRebalanceThreshold,
      lastRebalance: new Date(),
      nextReview: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  rebalanceCollateral(): CollateralRebalanceResult {
    const positions = Array.from(this.collateralPositions.values());
    const status = this.getCollateralManagementStatus();

    if (status.utilizationRate < this.config.autoRebalanceThreshold) {
      return {
        rebalanced: false,
        collateralMoved: 0,
        fromPositions: [],
        toPositions: [],
        newUtilizationRate: status.utilizationRate,
        timestamp: new Date(),
      };
    }

    // Simplified rebalancing: move unlocked high-haircut collateral to optimize
    const unlockedPositions = positions.filter(p => !p.isLocked);
    const moved = unlockedPositions.slice(0, 3).map(p => p.id);

    this.emitEvent('info', 'custody_clearing', 'Collateral rebalanced', {
      positionsMoved: moved.length,
      utilizationRate: status.utilizationRate,
    });

    return {
      rebalanced: true,
      collateralMoved: unlockedPositions.slice(0, 3).reduce((sum, p) => sum + p.value, 0),
      fromPositions: moved,
      toPositions: [],
      newUtilizationRate: status.utilizationRate * 0.85, // Simulated improvement
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: PrimeBrokerageEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'capital_allocated',
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

export function createCustodyAndClearingManager(
  config?: Partial<CustodyConfig>
): DefaultCustodyAndClearingManager {
  return new DefaultCustodyAndClearingManager(config);
}
