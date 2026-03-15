/**
 * TONAIAgent - AGFN Multi-Reserve Treasury Network
 *
 * Manages regional reserve pools, multi-asset treasury vaults, and cross-chain
 * reserve management across the Autonomous Global Financial Network.
 * Provides distributed treasury infrastructure with automatic rebalancing
 * and multi-signature security for institutional-grade asset management.
 *
 * This is Component 5 of the Autonomous Global Financial Network (AGFN).
 */

import {
  RegionalReservePool,
  ReservePoolAsset,
  MultiAssetTreasuryVault,
  TreasuryVaultAsset,
  CrossChainReserveTransfer,
  ReservePoolId,
  TreasuryVaultId,
  NodeId,
  JurisdictionCode,
  ChainId,
  TreasuryAssetClass,
  MultiReserveTreasuryConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MULTI_RESERVE_TREASURY_CONFIG: MultiReserveTreasuryConfig = {
  enableCrossChainReserveManagement: true,
  enableAutoRebalancing: true,
  rebalanceThresholdPercent: 5, // Rebalance if drift > 5%
  minimumReserveRatio: 0.1, // 10% minimum reserves
  maxSingleAssetPercent: 0.4, // Max 40% in single asset
  crossChainRebalanceCooldownMs: 3_600_000, // 1 hour cooldown
};

// ============================================================================
// Multi-Reserve Treasury Network Interface
// ============================================================================

export interface MultiReserveTreasuryNetwork {
  readonly config: MultiReserveTreasuryConfig;

  // Reserve Pool Management
  createReservePool(params: CreateReservePoolParams): RegionalReservePool;
  getReservePool(id: ReservePoolId): RegionalReservePool | undefined;
  listReservePools(filters?: ReservePoolFilters): RegionalReservePool[];
  updateReservePool(id: ReservePoolId, updates: Partial<RegionalReservePool>): RegionalReservePool;
  addAssetToPool(poolId: ReservePoolId, asset: ReservePoolAsset): RegionalReservePool;
  rebalancePool(poolId: ReservePoolId): ReservePoolRebalanceResult;
  suspendReservePool(poolId: ReservePoolId, reason: string): void;

  // Treasury Vault Management
  createTreasuryVault(params: CreateTreasuryVaultParams): MultiAssetTreasuryVault;
  getTreasuryVault(id: TreasuryVaultId): MultiAssetTreasuryVault | undefined;
  listTreasuryVaults(filters?: TreasuryVaultFilters): MultiAssetTreasuryVault[];
  addAssetToVault(vaultId: TreasuryVaultId, asset: TreasuryVaultAsset): MultiAssetTreasuryVault;
  rebalanceVault(vaultId: TreasuryVaultId): VaultRebalanceResult;
  lockVault(vaultId: TreasuryVaultId, reason: string): void;
  unlockVault(vaultId: TreasuryVaultId): void;

  // Cross-Chain Reserve Transfers
  initiateReserveTransfer(params: InitiateReserveTransferParams): CrossChainReserveTransfer;
  getReserveTransfer(id: string): CrossChainReserveTransfer | undefined;
  listReserveTransfers(filters?: ReserveTransferFilters): CrossChainReserveTransfer[];
  completeReserveTransfer(id: string): CrossChainReserveTransfer;
  failReserveTransfer(id: string, reason: string): CrossChainReserveTransfer;

  // Network Summary
  getNetworkReserveSummary(): NetworkReserveSummary;
  getAssetAllocationMap(): AssetAllocationMap;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateReservePoolParams {
  name: string;
  region: string;
  jurisdictions: JurisdictionCode[];
  participatingNodes: NodeId[];
  targetAllocationUSD: number;
  minimumReserveRatio?: number;
  metadata?: Record<string, unknown>;
}

export interface ReservePoolFilters {
  region?: string;
  status?: RegionalReservePool['status'];
  jurisdiction?: JurisdictionCode;
  nodeId?: NodeId;
  minValueUSD?: number;
}

export interface ReservePoolRebalanceResult {
  poolId: ReservePoolId;
  rebalancedAt: Date;
  assetAdjustments: PoolAssetAdjustment[];
  totalRebalancedUSD: number;
  newReserveRatio: number;
}

export interface PoolAssetAdjustment {
  assetId: string;
  assetName: string;
  previousPercent: number;
  newPercent: number;
  capitalMovedUSD: number;
  direction: 'increased' | 'decreased' | 'unchanged';
}

export interface CreateTreasuryVaultParams {
  name: string;
  vaultType: MultiAssetTreasuryVault['vaultType'];
  managingNodeIds: NodeId[];
  multisigThreshold: number;
  multisigParticipants: number;
  crossChainEnabled?: boolean;
  supportedChains?: ChainId[];
  rebalanceThresholdPercent?: number;
}

export interface TreasuryVaultFilters {
  vaultType?: MultiAssetTreasuryVault['vaultType'];
  status?: MultiAssetTreasuryVault['status'];
  nodeId?: NodeId;
  crossChainEnabled?: boolean;
}

export interface VaultRebalanceResult {
  vaultId: TreasuryVaultId;
  rebalancedAt: Date;
  assetAdjustments: VaultAssetAdjustment[];
  totalRebalancedUSD: number;
  crossChainTransfersRequired: number;
}

export interface VaultAssetAdjustment {
  assetId: string;
  previousPercent: number;
  targetPercent: number;
  amountMovedUSD: number;
  crossChainRequired: boolean;
}

export interface InitiateReserveTransferParams {
  sourcePoolId: ReservePoolId;
  destinationPoolId: ReservePoolId;
  assetId: string;
  amountUSD: number;
  sourceChain: ChainId;
  destinationChain: ChainId;
  bridgeProtocol: string;
}

export interface ReserveTransferFilters {
  sourcePoolId?: ReservePoolId;
  destinationPoolId?: ReservePoolId;
  status?: CrossChainReserveTransfer['status'];
  sourceChain?: ChainId;
  destinationChain?: ChainId;
}

export interface NetworkReserveSummary {
  totalPools: number;
  activePools: number;
  totalReserveValueUSD: number;
  availableReserveValueUSD: number;
  reservedValueUSD: number;
  totalVaults: number;
  totalVaultValueUSD: number;
  overallReserveRatio: number;
  byRegion: Array<{ region: string; totalValueUSD: number; pools: number }>;
  generatedAt: Date;
}

export interface AssetAllocationMap {
  byAssetClass: Array<{ assetClass: TreasuryAssetClass; totalUSD: number; percentOfTotal: number }>;
  byChain: Array<{ chain: ChainId; totalUSD: number; percentOfTotal: number }>;
  topAssets: Array<{ assetId: string; assetName: string; totalUSD: number; percentOfTotal: number }>;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMultiReserveTreasuryNetwork implements MultiReserveTreasuryNetwork {
  readonly config: MultiReserveTreasuryConfig;

  private readonly reservePools = new Map<ReservePoolId, RegionalReservePool>();
  private readonly treasuryVaults = new Map<TreasuryVaultId, MultiAssetTreasuryVault>();
  private readonly reserveTransfers = new Map<string, CrossChainReserveTransfer>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<MultiReserveTreasuryConfig>) {
    this.config = { ...DEFAULT_MULTI_RESERVE_TREASURY_CONFIG, ...config };
  }

  // ============================================================================
  // Reserve Pool Management
  // ============================================================================

  createReservePool(params: CreateReservePoolParams): RegionalReservePool {
    const pool: RegionalReservePool = {
      id: this.generateId('pool'),
      name: params.name,
      region: params.region,
      jurisdictions: params.jurisdictions,
      participatingNodes: params.participatingNodes,
      totalValueUSD: 0,
      availableValueUSD: 0,
      reservedValueUSD: 0,
      assets: [],
      targetAllocationUSD: params.targetAllocationUSD,
      minimumReserveRatio: params.minimumReserveRatio ?? this.config.minimumReserveRatio,
      currentReserveRatio: 0,
      nextReviewAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      status: 'active',
      createdAt: new Date(),
    };

    this.reservePools.set(pool.id, pool);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'reserve_pool_created',
      severity: 'info',
      source: 'MultiReserveTreasuryNetwork',
      message: `Reserve pool created: ${pool.name} in ${pool.region}`,
      data: { poolId: pool.id, name: pool.name, region: pool.region },
      timestamp: new Date(),
    });

    return pool;
  }

  getReservePool(id: ReservePoolId): RegionalReservePool | undefined {
    return this.reservePools.get(id);
  }

  listReservePools(filters?: ReservePoolFilters): RegionalReservePool[] {
    let results = Array.from(this.reservePools.values());

    if (filters?.region) results = results.filter(p => p.region === filters.region);
    if (filters?.status) results = results.filter(p => p.status === filters.status);
    if (filters?.jurisdiction) results = results.filter(p => p.jurisdictions.includes(filters.jurisdiction!));
    if (filters?.nodeId) results = results.filter(p => p.participatingNodes.includes(filters.nodeId!));
    if (filters?.minValueUSD !== undefined) results = results.filter(p => p.totalValueUSD >= filters.minValueUSD!);

    return results;
  }

  updateReservePool(id: ReservePoolId, updates: Partial<RegionalReservePool>): RegionalReservePool {
    const existing = this.reservePools.get(id);
    if (!existing) throw new Error(`Reserve pool not found: ${id}`);

    const updated = { ...existing, ...updates, id };
    this.reservePools.set(id, updated);
    return updated;
  }

  addAssetToPool(poolId: ReservePoolId, asset: ReservePoolAsset): RegionalReservePool {
    const pool = this.reservePools.get(poolId);
    if (!pool) throw new Error(`Reserve pool not found: ${poolId}`);

    const existingIndex = pool.assets.findIndex(a => a.assetId === asset.assetId);
    if (existingIndex >= 0) {
      pool.assets[existingIndex] = asset;
    } else {
      pool.assets.push(asset);
    }

    // Recalculate pool totals
    pool.totalValueUSD = pool.assets.reduce((sum, a) => sum + a.usdValue, 0);
    pool.availableValueUSD = pool.totalValueUSD;
    pool.currentReserveRatio = pool.totalValueUSD > 0
      ? pool.totalValueUSD / pool.targetAllocationUSD
      : 0;

    // Update asset percentages
    for (const a of pool.assets) {
      a.currentPercent = pool.totalValueUSD > 0 ? (a.usdValue / pool.totalValueUSD) * 100 : 0;
    }

    return pool;
  }

  rebalancePool(poolId: ReservePoolId): ReservePoolRebalanceResult {
    const pool = this.reservePools.get(poolId);
    if (!pool) throw new Error(`Reserve pool not found: ${poolId}`);
    if (pool.status !== 'active') throw new Error(`Cannot rebalance pool with status: ${pool.status}`);

    pool.status = 'rebalancing';

    const adjustments: PoolAssetAdjustment[] = pool.assets.map(asset => {
      const drift = Math.abs(asset.currentPercent - asset.targetPercent);
      const capitalMoved = (drift / 100) * pool.totalValueUSD;
      const direction: PoolAssetAdjustment['direction'] =
        asset.currentPercent < asset.targetPercent ? 'increased' :
        asset.currentPercent > asset.targetPercent ? 'decreased' : 'unchanged';

      // Update to target
      const previousPercent = asset.currentPercent;
      asset.currentPercent = asset.targetPercent;
      asset.usdValue = (asset.targetPercent / 100) * pool.totalValueUSD;

      return {
        assetId: asset.assetId,
        assetName: asset.assetName,
        previousPercent,
        newPercent: asset.targetPercent,
        capitalMovedUSD: capitalMoved,
        direction,
      };
    });

    pool.lastRebalancedAt = new Date();
    pool.status = 'active';
    pool.currentReserveRatio = pool.totalValueUSD / pool.targetAllocationUSD;

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'reserve_rebalanced',
      severity: 'info',
      source: 'MultiReserveTreasuryNetwork',
      message: `Reserve pool rebalanced: ${pool.name}`,
      data: { poolId, name: pool.name, adjustmentsCount: adjustments.length },
      timestamp: new Date(),
    });

    return {
      poolId,
      rebalancedAt: new Date(),
      assetAdjustments: adjustments,
      totalRebalancedUSD: adjustments.reduce((sum, a) => sum + a.capitalMovedUSD, 0),
      newReserveRatio: pool.currentReserveRatio,
    };
  }

  suspendReservePool(poolId: ReservePoolId, reason: string): void {
    const pool = this.reservePools.get(poolId);
    if (!pool) throw new Error(`Reserve pool not found: ${poolId}`);

    pool.status = 'suspended';
  }

  // ============================================================================
  // Treasury Vault Management
  // ============================================================================

  createTreasuryVault(params: CreateTreasuryVaultParams): MultiAssetTreasuryVault {
    const vault: MultiAssetTreasuryVault = {
      id: this.generateId('vault'),
      name: params.name,
      vaultType: params.vaultType,
      managingNodeIds: params.managingNodeIds,
      totalValueUSD: 0,
      assets: [],
      multisigThreshold: params.multisigThreshold,
      multisigParticipants: params.multisigParticipants,
      crossChainEnabled: params.crossChainEnabled ?? false,
      supportedChains: params.supportedChains ?? ['ton'],
      rebalanceThresholdPercent: params.rebalanceThresholdPercent ?? this.config.rebalanceThresholdPercent,
      yieldEarned: 0,
      createdAt: new Date(),
      status: 'active',
    };

    this.treasuryVaults.set(vault.id, vault);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'treasury_vault_created',
      severity: 'info',
      source: 'MultiReserveTreasuryNetwork',
      message: `Treasury vault created: ${vault.name} (${vault.vaultType})`,
      data: { vaultId: vault.id, name: vault.name, type: vault.vaultType },
      timestamp: new Date(),
    });

    return vault;
  }

  getTreasuryVault(id: TreasuryVaultId): MultiAssetTreasuryVault | undefined {
    return this.treasuryVaults.get(id);
  }

  listTreasuryVaults(filters?: TreasuryVaultFilters): MultiAssetTreasuryVault[] {
    let results = Array.from(this.treasuryVaults.values());

    if (filters?.vaultType) results = results.filter(v => v.vaultType === filters.vaultType);
    if (filters?.status) results = results.filter(v => v.status === filters.status);
    if (filters?.nodeId) results = results.filter(v => v.managingNodeIds.includes(filters.nodeId!));
    if (filters?.crossChainEnabled !== undefined) {
      results = results.filter(v => v.crossChainEnabled === filters.crossChainEnabled);
    }

    return results;
  }

  addAssetToVault(vaultId: TreasuryVaultId, asset: TreasuryVaultAsset): MultiAssetTreasuryVault {
    const vault = this.treasuryVaults.get(vaultId);
    if (!vault) throw new Error(`Treasury vault not found: ${vaultId}`);
    if (vault.status === 'locked' || vault.status === 'emergency_locked') {
      throw new Error(`Cannot add assets to vault with status: ${vault.status}`);
    }

    const existingIndex = vault.assets.findIndex(a => a.assetId === asset.assetId);
    if (existingIndex >= 0) {
      vault.assets[existingIndex] = asset;
    } else {
      vault.assets.push(asset);
    }

    // Recalculate vault totals
    vault.totalValueUSD = vault.assets.reduce((sum, a) => sum + a.usdValue, 0);

    // Update asset percentages
    for (const a of vault.assets) {
      a.currentPercent = vault.totalValueUSD > 0 ? (a.usdValue / vault.totalValueUSD) * 100 : 0;
    }

    return vault;
  }

  rebalanceVault(vaultId: TreasuryVaultId): VaultRebalanceResult {
    const vault = this.treasuryVaults.get(vaultId);
    if (!vault) throw new Error(`Treasury vault not found: ${vaultId}`);
    if (vault.status !== 'active') throw new Error(`Cannot rebalance vault with status: ${vault.status}`);

    vault.status = 'rebalancing';

    const adjustments: VaultAssetAdjustment[] = vault.assets.map(asset => {
      const drift = Math.abs(asset.currentPercent - asset.targetPercent);
      const amountMovedUSD = (drift / 100) * vault.totalValueUSD;
      const crossChainRequired = vault.crossChainEnabled && vault.supportedChains.length > 1;

      return {
        assetId: asset.assetId,
        previousPercent: asset.currentPercent,
        targetPercent: asset.targetPercent,
        amountMovedUSD,
        crossChainRequired,
      };
    });

    // Apply rebalance
    for (const asset of vault.assets) {
      asset.currentPercent = asset.targetPercent;
      asset.usdValue = (asset.targetPercent / 100) * vault.totalValueUSD;
    }

    vault.lastRebalancedAt = new Date();
    vault.status = 'active';

    const crossChainTransfersRequired = adjustments.filter(a => a.crossChainRequired).length;

    return {
      vaultId,
      rebalancedAt: new Date(),
      assetAdjustments: adjustments,
      totalRebalancedUSD: adjustments.reduce((sum, a) => sum + a.amountMovedUSD, 0),
      crossChainTransfersRequired,
    };
  }

  lockVault(vaultId: TreasuryVaultId, reason: string): void {
    const vault = this.treasuryVaults.get(vaultId);
    if (!vault) throw new Error(`Treasury vault not found: ${vaultId}`);

    vault.status = 'locked';
  }

  unlockVault(vaultId: TreasuryVaultId): void {
    const vault = this.treasuryVaults.get(vaultId);
    if (!vault) throw new Error(`Treasury vault not found: ${vaultId}`);
    if (vault.status !== 'locked') {
      throw new Error(`Cannot unlock vault with status: ${vault.status}`);
    }

    vault.status = 'active';
  }

  // ============================================================================
  // Cross-Chain Reserve Transfers
  // ============================================================================

  initiateReserveTransfer(params: InitiateReserveTransferParams): CrossChainReserveTransfer {
    const sourcePool = this.reservePools.get(params.sourcePoolId);
    if (!sourcePool) throw new Error(`Source reserve pool not found: ${params.sourcePoolId}`);

    const destinationPool = this.reservePools.get(params.destinationPoolId);
    if (!destinationPool) throw new Error(`Destination reserve pool not found: ${params.destinationPoolId}`);

    const transfer: CrossChainReserveTransfer = {
      id: this.generateId('transfer'),
      sourcePoolId: params.sourcePoolId,
      destinationPoolId: params.destinationPoolId,
      assetId: params.assetId,
      amountUSD: params.amountUSD,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      bridgeProtocol: params.bridgeProtocol,
      transferFeeUSD: params.amountUSD * 0.001, // 0.1% fee
      estimatedTimeMs: params.sourceChain === params.destinationChain ? 60_000 : 600_000,
      initiatedAt: new Date(),
      status: 'pending',
    };

    this.reserveTransfers.set(transfer.id, transfer);

    // Reduce source pool available capacity
    sourcePool.reservedValueUSD += params.amountUSD;
    sourcePool.availableValueUSD -= params.amountUSD;

    return transfer;
  }

  getReserveTransfer(id: string): CrossChainReserveTransfer | undefined {
    return this.reserveTransfers.get(id);
  }

  listReserveTransfers(filters?: ReserveTransferFilters): CrossChainReserveTransfer[] {
    let results = Array.from(this.reserveTransfers.values());

    if (filters?.sourcePoolId) results = results.filter(t => t.sourcePoolId === filters.sourcePoolId);
    if (filters?.destinationPoolId) results = results.filter(t => t.destinationPoolId === filters.destinationPoolId);
    if (filters?.status) results = results.filter(t => t.status === filters.status);
    if (filters?.sourceChain) results = results.filter(t => t.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) results = results.filter(t => t.destinationChain === filters.destinationChain);

    return results;
  }

  completeReserveTransfer(id: string): CrossChainReserveTransfer {
    const transfer = this.reserveTransfers.get(id);
    if (!transfer) throw new Error(`Reserve transfer not found: ${id}`);
    if (transfer.status === 'completed') throw new Error('Transfer already completed');
    if (transfer.status === 'failed') throw new Error('Cannot complete a failed transfer');

    transfer.status = 'completed';
    transfer.completedAt = new Date();

    // Update destination pool
    const destinationPool = this.reservePools.get(transfer.destinationPoolId);
    if (destinationPool) {
      destinationPool.totalValueUSD += transfer.amountUSD;
      destinationPool.availableValueUSD += transfer.amountUSD;
    }

    // Release source pool reservation
    const sourcePool = this.reservePools.get(transfer.sourcePoolId);
    if (sourcePool) {
      sourcePool.reservedValueUSD -= transfer.amountUSD;
      sourcePool.totalValueUSD -= transfer.amountUSD;
    }

    return transfer;
  }

  failReserveTransfer(id: string, reason: string): CrossChainReserveTransfer {
    const transfer = this.reserveTransfers.get(id);
    if (!transfer) throw new Error(`Reserve transfer not found: ${id}`);
    if (transfer.status === 'completed') throw new Error('Cannot fail a completed transfer');

    transfer.status = 'failed';

    // Release source pool reservation on failure
    const sourcePool = this.reservePools.get(transfer.sourcePoolId);
    if (sourcePool) {
      sourcePool.reservedValueUSD -= transfer.amountUSD;
      sourcePool.availableValueUSD += transfer.amountUSD;
    }

    return transfer;
  }

  // ============================================================================
  // Network Summary
  // ============================================================================

  getNetworkReserveSummary(): NetworkReserveSummary {
    const allPools = Array.from(this.reservePools.values());
    const activePools = allPools.filter(p => p.status === 'active');
    const allVaults = Array.from(this.treasuryVaults.values());

    const totalReserveValueUSD = allPools.reduce((sum, p) => sum + p.totalValueUSD, 0);
    const availableReserveValueUSD = allPools.reduce((sum, p) => sum + p.availableValueUSD, 0);
    const reservedValueUSD = allPools.reduce((sum, p) => sum + p.reservedValueUSD, 0);
    const totalVaultValueUSD = allVaults.reduce((sum, v) => sum + v.totalValueUSD, 0);

    const targetTotal = allPools.reduce((sum, p) => sum + p.targetAllocationUSD, 0);
    const overallReserveRatio = targetTotal > 0 ? totalReserveValueUSD / targetTotal : 0;

    const regionMap = new Map<string, { totalValueUSD: number; pools: number }>();
    for (const pool of allPools) {
      const existing = regionMap.get(pool.region) ?? { totalValueUSD: 0, pools: 0 };
      regionMap.set(pool.region, {
        totalValueUSD: existing.totalValueUSD + pool.totalValueUSD,
        pools: existing.pools + 1,
      });
    }

    const byRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      totalValueUSD: data.totalValueUSD,
      pools: data.pools,
    }));

    return {
      totalPools: allPools.length,
      activePools: activePools.length,
      totalReserveValueUSD,
      availableReserveValueUSD,
      reservedValueUSD,
      totalVaults: allVaults.length,
      totalVaultValueUSD,
      overallReserveRatio,
      byRegion,
      generatedAt: new Date(),
    };
  }

  getAssetAllocationMap(): AssetAllocationMap {
    const allPools = Array.from(this.reservePools.values());
    const allAssets = allPools.flatMap(p => p.assets);

    const totalUSD = allAssets.reduce((sum, a) => sum + a.usdValue, 0);

    const assetClassMap = new Map<TreasuryAssetClass, number>();
    const chainMap = new Map<ChainId, number>();
    const assetMap = new Map<string, { name: string; totalUSD: number }>();

    for (const asset of allAssets) {
      const assetClass = asset.assetClass;
      assetClassMap.set(assetClass, (assetClassMap.get(assetClass) ?? 0) + asset.usdValue);
      chainMap.set(asset.chain, (chainMap.get(asset.chain) ?? 0) + asset.usdValue);

      const existing = assetMap.get(asset.assetId) ?? { name: asset.assetName, totalUSD: 0 };
      assetMap.set(asset.assetId, { ...existing, totalUSD: existing.totalUSD + asset.usdValue });
    }

    const byAssetClass = Array.from(assetClassMap.entries()).map(([assetClass, value]) => ({
      assetClass,
      totalUSD: value,
      percentOfTotal: totalUSD > 0 ? (value / totalUSD) * 100 : 0,
    }));

    const byChain = Array.from(chainMap.entries()).map(([chain, value]) => ({
      chain,
      totalUSD: value,
      percentOfTotal: totalUSD > 0 ? (value / totalUSD) * 100 : 0,
    }));

    const topAssets = Array.from(assetMap.entries())
      .map(([assetId, data]) => ({
        assetId,
        assetName: data.name,
        totalUSD: data.totalUSD,
        percentOfTotal: totalUSD > 0 ? (data.totalUSD / totalUSD) * 100 : 0,
      }))
      .sort((a, b) => b.totalUSD - a.totalUSD)
      .slice(0, 10);

    return { byAssetClass, byChain, topAssets };
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

export function createMultiReserveTreasuryNetwork(
  config?: Partial<MultiReserveTreasuryConfig>
): DefaultMultiReserveTreasuryNetwork {
  return new DefaultMultiReserveTreasuryNetwork(config);
}

export default DefaultMultiReserveTreasuryNetwork;
