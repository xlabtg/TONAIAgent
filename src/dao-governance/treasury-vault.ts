/**
 * TONAIAgent - DAO Treasury Vault (Issue #103)
 *
 * On-chain treasury management for the DAO. Manages multi-asset holdings,
 * strategy allocations, deposits/withdrawals, and yield tracking.
 */

import type {
  TreasuryVault,
  TreasuryVaultStatus,
  TreasuryAsset,
  TreasuryAssetType,
  TreasuryAllocation,
  TreasuryAllocationRequest,
  TreasuryTransaction,
  TreasuryReport,
  TreasuryAllocationReport,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface TreasuryVaultManager {
  // Vault operations
  getVault(): TreasuryVault;
  setVaultStatus(status: TreasuryVaultStatus): void;

  // Asset management
  deposit(asset: string, amount: number, fromAddress: string, proposalId?: string): Promise<TreasuryTransaction>;
  withdraw(asset: string, amount: number, toAddress: string, proposalId?: string): Promise<TreasuryTransaction>;
  getAsset(symbol: string): TreasuryAsset | undefined;
  updateAssetPrice(symbol: string, valueInTon: number): void;

  // Allocation management
  allocateToStrategy(request: TreasuryAllocationRequest, approvedByProposalId?: string): Promise<TreasuryAllocation>;
  updateAllocation(allocationId: string, newAmount: number): Promise<TreasuryAllocation>;
  exitAllocation(allocationId: string, reason: string): Promise<boolean>;
  getAllocation(allocationId: string): TreasuryAllocation | undefined;
  getAllAllocations(): TreasuryAllocation[];

  // Reporting
  generateReport(periodStart: Date, periodEnd: Date): TreasuryReport;
  getTransactionHistory(limit?: number): TreasuryTransaction[];

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface TreasuryVaultConfig {
  name: string;
  initialAssets?: Array<{ symbol: string; type: TreasuryAssetType; name: string; balance: number; valueInTon: number }>;
  maxAllocations: number;
  minLiquidityReserve: number;  // Minimum % to keep liquid
}

const DEFAULT_CONFIG: TreasuryVaultConfig = {
  name: 'DAO Treasury',
  maxAllocations: 20,
  minLiquidityReserve: 20,  // Keep at least 20% liquid
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTreasuryVaultManager implements TreasuryVaultManager {
  private readonly config: TreasuryVaultConfig;
  private readonly vault: TreasuryVault;
  private readonly allocations = new Map<string, TreasuryAllocation>();
  private readonly transactions: TreasuryTransaction[] = [];
  private readonly eventCallbacks: DaoEventCallback[] = [];

  constructor(config: Partial<TreasuryVaultConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.vault = {
      id: this.generateId(),
      name: this.config.name,
      status: 'active',
      totalValueTon: 0,
      availableValueTon: 0,
      allocatedValueTon: 0,
      assets: [],
      allocations: [],
      yieldGenerated: 0,
      yieldPercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize with provided assets
    if (config.initialAssets) {
      for (const assetDef of config.initialAssets) {
        this.addAsset(assetDef);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Vault Operations
  // --------------------------------------------------------------------------

  getVault(): TreasuryVault {
    this.syncVaultStats();
    return this.vault;
  }

  setVaultStatus(status: TreasuryVaultStatus): void {
    this.vault.status = status;
    this.vault.updatedAt = new Date();
  }

  // --------------------------------------------------------------------------
  // Asset Management
  // --------------------------------------------------------------------------

  async deposit(
    assetSymbol: string,
    amount: number,
    fromAddress: string,
    proposalId?: string
  ): Promise<TreasuryTransaction> {
    if (amount <= 0) throw new Error('Deposit amount must be positive');

    let asset = this.vault.assets.find(a => a.symbol === assetSymbol);
    if (!asset) {
      // Auto-create asset entry for unknown token
      asset = this.addAsset({ symbol: assetSymbol, type: 'ton', name: assetSymbol, balance: 0, valueInTon: 1 });
    }

    asset.balance += amount;
    asset.lastUpdated = new Date();

    const tx: TreasuryTransaction = {
      id: this.generateId(),
      type: 'deposit',
      amount,
      asset: assetSymbol,
      fromAddress,
      description: `Deposit of ${amount} ${assetSymbol} from ${fromAddress}`,
      timestamp: new Date(),
      proposalId,
    };

    this.transactions.push(tx);
    this.syncVaultStats();

    this.emit({ type: 'treasury.deposited', data: { amount, asset: assetSymbol, fromAddress }, timestamp: new Date() });

    return tx;
  }

  async withdraw(
    assetSymbol: string,
    amount: number,
    toAddress: string,
    proposalId?: string
  ): Promise<TreasuryTransaction> {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');

    const asset = this.vault.assets.find(a => a.symbol === assetSymbol);
    if (!asset) throw new Error(`Asset ${assetSymbol} not found in treasury`);
    if (asset.balance < amount) throw new Error(`Insufficient ${assetSymbol} balance: ${asset.balance} < ${amount}`);

    // Check liquidity reserve
    const liquidityRatio = this.vault.availableValueTon / (this.vault.totalValueTon || 1);
    const withdrawValueTon = amount * asset.valueInTon;
    const afterLiquidityRatio = (this.vault.availableValueTon - withdrawValueTon) / (this.vault.totalValueTon || 1);

    if (afterLiquidityRatio < this.config.minLiquidityReserve / 100) {
      throw new Error(
        `Withdrawal would breach minimum liquidity reserve of ${this.config.minLiquidityReserve}%` +
        ` (current: ${(liquidityRatio * 100).toFixed(1)}%)`
      );
    }

    asset.balance -= amount;
    asset.lastUpdated = new Date();

    const tx: TreasuryTransaction = {
      id: this.generateId(),
      type: 'withdrawal',
      amount,
      asset: assetSymbol,
      toAddress,
      description: `Withdrawal of ${amount} ${assetSymbol} to ${toAddress}`,
      timestamp: new Date(),
      proposalId,
    };

    this.transactions.push(tx);
    this.syncVaultStats();

    this.emit({ type: 'treasury.withdrawn', data: { amount, asset: assetSymbol, toAddress }, timestamp: new Date() });

    return tx;
  }

  getAsset(symbol: string): TreasuryAsset | undefined {
    return this.vault.assets.find(a => a.symbol === symbol);
  }

  updateAssetPrice(symbol: string, valueInTon: number): void {
    const asset = this.vault.assets.find(a => a.symbol === symbol);
    if (asset) {
      asset.valueInTon = valueInTon;
      asset.lastUpdated = new Date();
      this.syncVaultStats();
    }
  }

  // --------------------------------------------------------------------------
  // Allocation Management
  // --------------------------------------------------------------------------

  async allocateToStrategy(
    request: TreasuryAllocationRequest,
    approvedByProposalId?: string
  ): Promise<TreasuryAllocation> {
    this.syncVaultStats();

    if (this.allocations.size >= this.config.maxAllocations) {
      throw new Error(`Maximum allocations (${this.config.maxAllocations}) reached`);
    }

    // Check available funds
    if (request.requestedAmount > this.vault.availableValueTon) {
      throw new Error(
        `Insufficient available funds: ${request.requestedAmount} requested, ` +
        `${this.vault.availableValueTon.toFixed(2)} available`
      );
    }

    // Check min liquidity after allocation
    const afterAvailable = this.vault.availableValueTon - request.requestedAmount;
    const afterLiquidityPercent = (afterAvailable / (this.vault.totalValueTon || 1)) * 100;

    if (afterLiquidityPercent < this.config.minLiquidityReserve) {
      throw new Error(
        `Allocation would breach minimum liquidity reserve of ${this.config.minLiquidityReserve}%`
      );
    }

    const allocation: TreasuryAllocation = {
      id: this.generateId(),
      strategyId: request.strategyId,
      strategyName: request.strategyName,
      allocatedAmount: request.requestedAmount,
      allocatedPercent: request.requestedPercent,
      currentValue: request.requestedAmount,
      pnl: 0,
      pnlPercent: 0,
      riskScore: request.riskAssessment?.riskScore ?? 50,
      status: 'active',
      allocatedAt: new Date(),
      approvedByProposalId,
    };

    this.allocations.set(allocation.id, allocation);

    // Deduct from available TON
    const tonAsset = this.vault.assets.find(a => a.symbol === 'TON');
    if (tonAsset) {
      tonAsset.balance -= request.requestedAmount;
      tonAsset.lastUpdated = new Date();
    }

    const tx: TreasuryTransaction = {
      id: this.generateId(),
      type: 'allocation',
      amount: request.requestedAmount,
      asset: 'TON',
      strategyId: request.strategyId,
      proposalId: approvedByProposalId,
      description: `Allocated ${request.requestedAmount} TON to strategy ${request.strategyName}`,
      timestamp: new Date(),
    };
    this.transactions.push(tx);

    this.syncVaultStats();

    this.emit({
      type: 'treasury.allocated',
      data: { allocationId: allocation.id, strategyId: request.strategyId, amount: request.requestedAmount },
      timestamp: new Date(),
    });

    return allocation;
  }

  async updateAllocation(allocationId: string, newAmount: number): Promise<TreasuryAllocation> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) throw new Error(`Allocation ${allocationId} not found`);
    if (allocation.status !== 'active') throw new Error(`Allocation ${allocationId} is not active`);

    const delta = newAmount - allocation.allocatedAmount;
    allocation.allocatedAmount = newAmount;
    allocation.currentValue = newAmount;
    allocation.pnl = newAmount - allocation.allocatedAmount;
    allocation.pnlPercent = allocation.allocatedAmount > 0 ? (allocation.pnl / allocation.allocatedAmount) * 100 : 0;
    allocation.lastRebalanced = new Date();

    const tx: TreasuryTransaction = {
      id: this.generateId(),
      type: 'reallocation',
      amount: Math.abs(delta),
      asset: 'TON',
      strategyId: allocation.strategyId,
      description: `Reallocation of strategy ${allocation.strategyName}: ${delta > 0 ? '+' : ''}${delta.toFixed(2)} TON`,
      timestamp: new Date(),
    };
    this.transactions.push(tx);

    this.syncVaultStats();
    this.emit({ type: 'treasury.reallocated', data: { allocationId, delta }, timestamp: new Date() });

    return allocation;
  }

  async exitAllocation(allocationId: string, reason: string): Promise<boolean> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) return false;
    if (allocation.status === 'exiting') return false;

    // Return funds to treasury
    const tonAsset = this.vault.assets.find(a => a.symbol === 'TON');
    if (tonAsset) {
      tonAsset.balance += allocation.currentValue;
      tonAsset.lastUpdated = new Date();
    }

    allocation.status = 'exiting';

    const tx: TreasuryTransaction = {
      id: this.generateId(),
      type: 'withdrawal',
      amount: allocation.currentValue,
      asset: 'TON',
      strategyId: allocation.strategyId,
      description: `Exit allocation from ${allocation.strategyName}: ${reason}`,
      timestamp: new Date(),
    };
    this.transactions.push(tx);

    this.allocations.delete(allocationId);
    this.syncVaultStats();

    return true;
  }

  getAllocation(allocationId: string): TreasuryAllocation | undefined {
    return this.allocations.get(allocationId);
  }

  getAllAllocations(): TreasuryAllocation[] {
    return Array.from(this.allocations.values());
  }

  // --------------------------------------------------------------------------
  // Reporting
  // --------------------------------------------------------------------------

  generateReport(periodStart: Date, periodEnd: Date): TreasuryReport {
    const txInPeriod = this.transactions.filter(
      t => t.timestamp >= periodStart && t.timestamp <= periodEnd
    );

    const deposits = txInPeriod.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawals = txInPeriod.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
    const yieldTxs = txInPeriod.filter(t => t.type === 'yield').reduce((s, t) => s + t.amount, 0);
    const fees = txInPeriod.filter(t => t.type === 'fee').reduce((s, t) => s + t.amount, 0);

    const totalValueStart = this.vault.totalValueTon - deposits + withdrawals;
    const totalValueEnd = this.vault.totalValueTon;
    const totalReturn = totalValueEnd - totalValueStart;
    const totalReturnPercent = totalValueStart > 0 ? (totalReturn / totalValueStart) * 100 : 0;

    const allocationReports: TreasuryAllocationReport[] = Array.from(this.allocations.values()).map(a => ({
      strategyId: a.strategyId,
      strategyName: a.strategyName,
      allocatedAmount: a.allocatedAmount,
      currentValue: a.currentValue,
      return: a.pnl,
      returnPercent: a.pnlPercent,
      contributionToPortfolio: totalValueEnd > 0 ? (a.currentValue / totalValueEnd) * 100 : 0,
    }));

    const sortedByReturn = [...allocationReports].sort((a, b) => b.returnPercent - a.returnPercent);
    const topPerformers = sortedByReturn.slice(0, 3).map(r => r.strategyId);
    const underperformers = sortedByReturn.slice(-2).map(r => r.strategyId).filter(id => {
      const r = allocationReports.find(a => a.strategyId === id);
      return r && r.returnPercent < 0;
    });

    // Risk summary
    const allocs = Array.from(this.allocations.values());
    const highRisk = allocs.filter(a => a.riskScore >= 70).reduce((s, a) => s + a.currentValue, 0);
    const medRisk = allocs.filter(a => a.riskScore >= 40 && a.riskScore < 70).reduce((s, a) => s + a.currentValue, 0);
    const lowRisk = allocs.filter(a => a.riskScore < 40).reduce((s, a) => s + a.currentValue, 0);
    const liquidityRatio = totalValueEnd > 0 ? this.vault.availableValueTon / totalValueEnd : 1;
    const maxAlloc = allocs.reduce((m, a) => Math.max(m, a.currentValue), 0);
    const concentrationIndex = totalValueEnd > 0 ? maxAlloc / totalValueEnd : 0;

    return {
      periodStart,
      periodEnd,
      totalValueStart,
      totalValueEnd,
      totalReturn,
      totalReturnPercent,
      yieldGenerated: yieldTxs,
      feesCollected: fees,
      allocationBreakdown: allocationReports,
      topPerformers,
      underperformers,
      riskExposureSummary: {
        totalRiskScore: allocs.reduce((s, a) => s + a.riskScore, 0) / (allocs.length || 1),
        highRiskExposure: totalValueEnd > 0 ? (highRisk / totalValueEnd) * 100 : 0,
        mediumRiskExposure: totalValueEnd > 0 ? (medRisk / totalValueEnd) * 100 : 0,
        lowRiskExposure: totalValueEnd > 0 ? (lowRisk / totalValueEnd) * 100 : 0,
        liquidityRatio,
        concentrationIndex,
      },
      governanceActivity: {
        proposalsCreated: 0,
        proposalsPassed: 0,
        proposalsDefeated: 0,
        proposalsExecuted: 0,
        totalVotesCast: 0,
        uniqueVoters: 0,
        averageParticipationRate: 0,
      },
      generatedAt: new Date(),
    };
  }

  getTransactionHistory(limit = 100): TreasuryTransaction[] {
    return this.transactions.slice(-limit).reverse();
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private addAsset(def: {
    symbol: string;
    type: TreasuryAssetType;
    name: string;
    balance: number;
    valueInTon: number;
  }): TreasuryAsset {
    const asset: TreasuryAsset = {
      id: this.generateId(),
      type: def.type,
      symbol: def.symbol,
      name: def.name,
      address: undefined,
      balance: def.balance,
      valueInTon: def.valueInTon,
      allocation: 0,
      lastUpdated: new Date(),
    };
    this.vault.assets.push(asset);
    this.syncVaultStats();
    return asset;
  }

  private syncVaultStats(): void {
    // Compute total value from assets
    let totalValue = 0;
    for (const asset of this.vault.assets) {
      totalValue += asset.balance * asset.valueInTon;
    }

    // Compute allocated value
    let allocatedValue = 0;
    const activeAllocations = Array.from(this.allocations.values()).filter(a => a.status === 'active');
    for (const alloc of activeAllocations) {
      allocatedValue += alloc.currentValue;
    }

    this.vault.totalValueTon = totalValue;
    this.vault.allocatedValueTon = allocatedValue;
    this.vault.availableValueTon = Math.max(0, totalValue - allocatedValue);
    this.vault.updatedAt = new Date();

    // Sync vault.allocations array
    this.vault.allocations = Array.from(this.allocations.values());

    // Update asset allocation percentages
    for (const asset of this.vault.assets) {
      asset.allocation = totalValue > 0 ? (asset.balance * asset.valueInTon / totalValue) * 100 : 0;
    }
  }

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createTreasuryVaultManager(config?: Partial<TreasuryVaultConfig>): TreasuryVaultManager {
  return new DefaultTreasuryVaultManager(config);
}
