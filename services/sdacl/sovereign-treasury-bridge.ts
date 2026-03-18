/**
 * SDACL Component 2 — Sovereign Treasury Bridge
 *
 * Enables national treasury allocations, sovereign fund participation,
 * bond issuance integration, and configurable reserve visibility.
 *
 * Integrates with Treasury module, Liquidity layer, and Clearing layer.
 */

import {
  TreasuryAllocation,
  TreasuryAllocationStatus,
  SovereignBond,
  BondStatus,
  ReserveSnapshot,
  SovereignAssetId,
  IssuerId,
  JurisdictionCode,
  BridgeId,
  SovereignTreasuryBridgeStatus,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

// ============================================================================
// Sovereign Treasury Bridge Interface
// ============================================================================

export interface SovereignTreasuryBridgeManager {
  // Treasury allocations
  createAllocation(params: CreateAllocationParams): TreasuryAllocation;
  getAllocation(bridgeId: BridgeId): TreasuryAllocation | undefined;
  listAllocations(filters?: AllocationFilters): TreasuryAllocation[];
  activateAllocation(bridgeId: BridgeId): TreasuryAllocation;
  redeemAllocation(bridgeId: BridgeId): TreasuryAllocation;
  cancelAllocation(bridgeId: BridgeId, reason: string): void;

  // Sovereign bond issuance
  issueBond(params: IssueBondParams): SovereignBond;
  getBond(bondId: string): SovereignBond | undefined;
  listBonds(filters?: BondFilters): SovereignBond[];
  updateBondStatus(bondId: string, status: BondStatus): void;
  assignLiquidityPool(bondId: string, liquidityPoolId: string): void;

  // Reserve visibility
  recordReserveSnapshot(params: RecordReserveParams): ReserveSnapshot;
  getLatestReserveSnapshot(assetId: SovereignAssetId): ReserveSnapshot | undefined;
  listReserveSnapshots(jurisdictionCode?: JurisdictionCode): ReserveSnapshot[];

  getComponentStatus(): SovereignTreasuryBridgeStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export interface CreateAllocationParams {
  sovereignFundId: IssuerId;
  sovereignFundName: string;
  jurisdictionCode: JurisdictionCode;
  allocationAmountUsd: number;
  allocationCurrency: string;
  targetAssetId: SovereignAssetId;
  privacyLevel?: TreasuryAllocation['privacyLevel'];
  reserveVisible?: boolean;
  maturityDate?: Date;
}

export interface AllocationFilters {
  jurisdictionCode?: JurisdictionCode;
  sovereignFundId?: IssuerId;
  status?: TreasuryAllocationStatus;
  targetAssetId?: SovereignAssetId;
}

export interface IssueBondParams {
  issuerId: IssuerId;
  issuerJurisdiction: JurisdictionCode;
  name: string;
  symbol: string;
  faceValueUsd: number;
  couponRatePercent: number;
  maturityDate: Date;
  totalIssuance: number;
  creditRating: string;
  chainId: string;
  clearingLayerRef?: string;
}

export interface BondFilters {
  issuerId?: IssuerId;
  issuerJurisdiction?: JurisdictionCode;
  status?: BondStatus;
  minFaceValueUsd?: number;
}

export interface RecordReserveParams {
  assetId: SovereignAssetId;
  jurisdictionCode: JurisdictionCode;
  totalReserveUsd: number;
  goldReserveUsd: number;
  foreignCurrencyReserveUsd: number;
  digitalAssetReserveUsd: number;
  reserveRatio: number;
  visibility?: ReserveSnapshot['visibility'];
}

// ============================================================================
// Default Sovereign Treasury Bridge Manager
// ============================================================================

export class DefaultSovereignTreasuryBridgeManager implements SovereignTreasuryBridgeManager {
  private readonly allocations: Map<BridgeId, TreasuryAllocation> = new Map();
  private readonly cancelledReasons: Map<BridgeId, string> = new Map();
  private readonly bonds: Map<string, SovereignBond> = new Map();
  private readonly reserveSnapshots: Map<SovereignAssetId, ReserveSnapshot[]> = new Map();
  private readonly eventCallbacks: SDACLEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  createAllocation(params: CreateAllocationParams): TreasuryAllocation {
    const allocation: TreasuryAllocation = {
      id: this.generateId('treasury_alloc'),
      sovereignFundId: params.sovereignFundId,
      sovereignFundName: params.sovereignFundName,
      jurisdictionCode: params.jurisdictionCode,
      allocationAmountUsd: params.allocationAmountUsd,
      allocationCurrency: params.allocationCurrency,
      targetAssetId: params.targetAssetId,
      status: 'pending',
      privacyLevel: params.privacyLevel ?? 'private',
      reserveVisible: params.reserveVisible ?? false,
      createdAt: new Date(),
      maturityDate: params.maturityDate,
    };

    this.allocations.set(allocation.id, allocation);

    this.emitEvent('treasury_allocation_created', 2, {
      bridgeId: allocation.id,
      sovereignFundId: allocation.sovereignFundId,
      jurisdictionCode: allocation.jurisdictionCode,
      allocationAmountUsd: allocation.allocationAmountUsd,
    });

    return allocation;
  }

  getAllocation(bridgeId: BridgeId): TreasuryAllocation | undefined {
    return this.allocations.get(bridgeId);
  }

  listAllocations(filters?: AllocationFilters): TreasuryAllocation[] {
    let result = Array.from(this.allocations.values());
    if (filters?.jurisdictionCode) result = result.filter(a => a.jurisdictionCode === filters.jurisdictionCode);
    if (filters?.sovereignFundId) result = result.filter(a => a.sovereignFundId === filters.sovereignFundId);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.targetAssetId) result = result.filter(a => a.targetAssetId === filters.targetAssetId);
    return result;
  }

  activateAllocation(bridgeId: BridgeId): TreasuryAllocation {
    const allocation = this.allocations.get(bridgeId);
    if (!allocation) throw new Error(`Treasury allocation ${bridgeId} not found`);
    if (allocation.status !== 'pending') {
      throw new Error(`Allocation ${bridgeId} is not in pending state`);
    }

    const activated: TreasuryAllocation = {
      ...allocation,
      status: 'active',
      activatedAt: new Date(),
    };
    this.allocations.set(bridgeId, activated);
    return activated;
  }

  redeemAllocation(bridgeId: BridgeId): TreasuryAllocation {
    const allocation = this.allocations.get(bridgeId);
    if (!allocation) throw new Error(`Treasury allocation ${bridgeId} not found`);
    if (allocation.status !== 'active') {
      throw new Error(`Allocation ${bridgeId} is not active`);
    }

    const redeemed: TreasuryAllocation = { ...allocation, status: 'redeemed' };
    this.allocations.set(bridgeId, redeemed);
    return redeemed;
  }

  cancelAllocation(bridgeId: BridgeId, reason: string): void {
    const allocation = this.allocations.get(bridgeId);
    if (!allocation) throw new Error(`Treasury allocation ${bridgeId} not found`);
    if (allocation.status === 'redeemed') {
      throw new Error(`Cannot cancel redeemed allocation ${bridgeId}`);
    }

    this.allocations.set(bridgeId, { ...allocation, status: 'cancelled' });
    this.cancelledReasons.set(bridgeId, reason);
  }

  issueBond(params: IssueBondParams): SovereignBond {
    const bond: SovereignBond = {
      id: this.generateId('sovereign_bond'),
      issuerId: params.issuerId,
      issuerJurisdiction: params.issuerJurisdiction,
      name: params.name,
      symbol: params.symbol,
      faceValueUsd: params.faceValueUsd,
      couponRatePercent: params.couponRatePercent,
      maturityDate: params.maturityDate,
      issueDate: new Date(),
      totalIssuance: params.totalIssuance,
      outstandingAmount: params.totalIssuance,
      creditRating: params.creditRating,
      status: 'issued',
      chainId: params.chainId,
      clearingLayerRef: params.clearingLayerRef,
    };

    this.bonds.set(bond.id, bond);

    this.emitEvent('bond_issued', 2, {
      bondId: bond.id,
      issuerId: bond.issuerId,
      issuerJurisdiction: bond.issuerJurisdiction,
      faceValueUsd: bond.faceValueUsd,
      totalIssuance: bond.totalIssuance,
    });

    return bond;
  }

  getBond(bondId: string): SovereignBond | undefined {
    return this.bonds.get(bondId);
  }

  listBonds(filters?: BondFilters): SovereignBond[] {
    let result = Array.from(this.bonds.values());
    if (filters?.issuerId) result = result.filter(b => b.issuerId === filters.issuerId);
    if (filters?.issuerJurisdiction) result = result.filter(b => b.issuerJurisdiction === filters.issuerJurisdiction);
    if (filters?.status) result = result.filter(b => b.status === filters.status);
    if (filters?.minFaceValueUsd !== undefined) {
      result = result.filter(b => b.faceValueUsd >= filters.minFaceValueUsd!);
    }
    return result;
  }

  updateBondStatus(bondId: string, status: BondStatus): void {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Sovereign bond ${bondId} not found`);
    this.bonds.set(bondId, { ...bond, status });
  }

  assignLiquidityPool(bondId: string, liquidityPoolId: string): void {
    const bond = this.bonds.get(bondId);
    if (!bond) throw new Error(`Sovereign bond ${bondId} not found`);
    this.bonds.set(bondId, { ...bond, liquidityPoolId });
  }

  recordReserveSnapshot(params: RecordReserveParams): ReserveSnapshot {
    const snapshot: ReserveSnapshot = {
      assetId: params.assetId,
      jurisdictionCode: params.jurisdictionCode,
      totalReserveUsd: params.totalReserveUsd,
      goldReserveUsd: params.goldReserveUsd,
      foreignCurrencyReserveUsd: params.foreignCurrencyReserveUsd,
      digitalAssetReserveUsd: params.digitalAssetReserveUsd,
      reserveRatio: params.reserveRatio,
      visibility: params.visibility ?? 'restricted',
      snapshotAt: new Date(),
    };

    const existing = this.reserveSnapshots.get(params.assetId) ?? [];
    existing.push(snapshot);
    this.reserveSnapshots.set(params.assetId, existing);

    return snapshot;
  }

  getLatestReserveSnapshot(assetId: SovereignAssetId): ReserveSnapshot | undefined {
    const snapshots = this.reserveSnapshots.get(assetId);
    if (!snapshots || snapshots.length === 0) return undefined;
    return snapshots[snapshots.length - 1];
  }

  listReserveSnapshots(jurisdictionCode?: JurisdictionCode): ReserveSnapshot[] {
    const all = Array.from(this.reserveSnapshots.values()).flat();
    if (jurisdictionCode) return all.filter(s => s.jurisdictionCode === jurisdictionCode);
    return all;
  }

  getComponentStatus(): SovereignTreasuryBridgeStatus {
    const allocations = Array.from(this.allocations.values());
    const bonds = Array.from(this.bonds.values());
    const activeAllocations = allocations.filter(a => a.status === 'active');
    const issuedBonds = bonds.filter(b => b.status === 'issued' || b.status === 'trading');

    const totalAllocatedUsd = activeAllocations.reduce((sum, a) => sum + a.allocationAmountUsd, 0);
    const totalBondValueUsd = issuedBonds.reduce((sum, b) => sum + b.faceValueUsd * b.totalIssuance, 0);
    const reserveSnapshotsAvailable = Array.from(this.reserveSnapshots.values())
      .reduce((sum, snaps) => sum + snaps.length, 0);

    return {
      totalAllocations: allocations.length,
      activeAllocations: activeAllocations.length,
      totalAllocatedUsd,
      issuedBonds: issuedBonds.length,
      totalBondValueUsd,
      reserveSnapshotsAvailable,
    };
  }

  onEvent(callback: SDACLEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: SDACLEvent['type'], component: SDACLEvent['component'], data: Record<string, unknown>): void {
    const event: SDACLEvent = { type, component, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createSovereignTreasuryBridgeManager(): DefaultSovereignTreasuryBridgeManager {
  return new DefaultSovereignTreasuryBridgeManager();
}
