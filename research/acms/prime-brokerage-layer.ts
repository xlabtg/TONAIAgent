/**
 * ACMS Layer 4 — Prime Brokerage Layer
 *
 * Institutional prime brokerage services for the ACMS:
 * margin management, leverage control, capital efficiency,
 * internal netting, and cross-chain prime brokerage.
 * This layer wraps and orchestrates the prime-brokerage module (Issue #108)
 * within the ACMS stack context.
 */

import {
  AgentId,
  FundId,
  AssetId,
  PrimeBrokerageCapitalPool,
  FundAllocation,
  MarginAccount,
  PrimeBrokerageLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Prime Brokerage Layer Interfaces
// ============================================================================

export interface PrimeBrokerageLayerManager {
  createCapitalPool(name: string, totalCapital: number): PrimeBrokerageCapitalPool;
  allocateFundToPool(poolId: string, fundId: FundId, fundName: string, allocation: number, leverage: number): void;
  getCapitalPool(poolId: string): PrimeBrokerageCapitalPool | undefined;
  listCapitalPools(): PrimeBrokerageCapitalPool[];
  getPoolUtilization(poolId: string): number;

  createMarginAccount(ownerId: AgentId, ownerType: MarginAccount['ownerType']): MarginAccount;
  updateMarginAccount(accountId: string, params: UpdateMarginParams): MarginAccount;
  issueMarginCall(accountId: string): MarginCallResult;
  liquidateAccount(accountId: string): LiquidationResult;
  getMarginAccount(accountId: string): MarginAccount | undefined;
  listMarginAccounts(filters?: MarginAccountFilters): MarginAccount[];

  depositCollateral(agentId: AgentId, assetId: AssetId, amount: number, valueUsd: number): CollateralReceipt;
  withdrawCollateral(receiptId: string, amount: number): void;
  getNetExposure(agentId: AgentId): NetExposureResult;

  getLayerStatus(): PrimeBrokerageLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface UpdateMarginParams {
  totalEquity?: number;
  usedMargin?: number;
  leverage?: number;
}

export interface MarginCallResult {
  accountId: string;
  previousStatus: MarginAccount['status'];
  newStatus: MarginAccount['status'];
  requiredDepositUsd: number;
  deadline: Date;
}

export interface LiquidationResult {
  accountId: string;
  ownerId: AgentId;
  liquidatedEquity: number;
  remainingDebt: number;
  liquidatedAt: Date;
}

export interface MarginAccountFilters {
  ownerType?: MarginAccount['ownerType'];
  status?: MarginAccount['status'];
  fundId?: FundId;
}

export interface CollateralReceipt {
  id: string;
  agentId: AgentId;
  assetId: AssetId;
  amount: number;
  valueUsd: number;
  remainingAmount: number;
  depositedAt: Date;
}

export interface NetExposureResult {
  agentId: AgentId;
  longExposureUsd: number;
  shortExposureUsd: number;
  netExposureUsd: number;
  grossExposureUsd: number;
  marginUtilization: number;
}

// ============================================================================
// Default Prime Brokerage Layer Manager
// ============================================================================

export class DefaultPrimeBrokerageLayerManager implements PrimeBrokerageLayerManager {
  private readonly capitalPools: Map<string, PrimeBrokerageCapitalPool> = new Map();
  private readonly marginAccounts: Map<string, MarginAccount> = new Map();
  private readonly collateralReceipts: Map<string, CollateralReceipt> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  createCapitalPool(name: string, totalCapital: number): PrimeBrokerageCapitalPool {
    const pool: PrimeBrokerageCapitalPool = {
      id: this.generateId('pb_pool'),
      name,
      totalCapital,
      allocatedCapital: 0,
      availableCapital: totalCapital,
      fundAllocations: [],
      utilizationRate: 0,
    };
    this.capitalPools.set(pool.id, pool);
    return pool;
  }

  allocateFundToPool(
    poolId: string,
    fundId: FundId,
    fundName: string,
    allocation: number,
    leverage: number
  ): void {
    const pool = this.capitalPools.get(poolId);
    if (!pool) throw new Error(`Capital pool ${poolId} not found`);
    if (allocation > pool.availableCapital) throw new Error('Insufficient capital in pool');

    const fundAlloc: FundAllocation = { fundId, fundName, allocation, leverage };
    const existingIdx = pool.fundAllocations.findIndex(f => f.fundId === fundId);
    const newAllocations = existingIdx >= 0
      ? [...pool.fundAllocations.slice(0, existingIdx), fundAlloc, ...pool.fundAllocations.slice(existingIdx + 1)]
      : [...pool.fundAllocations, fundAlloc];

    const allocatedCapital = newAllocations.reduce((s, f) => s + f.allocation, 0);
    this.capitalPools.set(poolId, {
      ...pool,
      fundAllocations: newAllocations,
      allocatedCapital,
      availableCapital: pool.totalCapital - allocatedCapital,
      utilizationRate: allocatedCapital / pool.totalCapital,
    });
  }

  getCapitalPool(poolId: string): PrimeBrokerageCapitalPool | undefined {
    return this.capitalPools.get(poolId);
  }

  listCapitalPools(): PrimeBrokerageCapitalPool[] {
    return Array.from(this.capitalPools.values());
  }

  getPoolUtilization(poolId: string): number {
    const pool = this.capitalPools.get(poolId);
    if (!pool) throw new Error(`Capital pool ${poolId} not found`);
    return pool.utilizationRate;
  }

  createMarginAccount(ownerId: AgentId, ownerType: MarginAccount['ownerType']): MarginAccount {
    const account: MarginAccount = {
      id: this.generateId('margin_acct'),
      ownerId,
      ownerType,
      totalEquity: 0,
      usedMargin: 0,
      availableMargin: 0,
      leverage: 0,
      marginCallLevel: 0.8,   // Margin call at 80% utilization
      liquidationLevel: 0.95, // Liquidation at 95% utilization
      status: 'healthy',
    };
    this.marginAccounts.set(account.id, account);
    return account;
  }

  updateMarginAccount(accountId: string, params: UpdateMarginParams): MarginAccount {
    const account = this.marginAccounts.get(accountId);
    if (!account) throw new Error(`Margin account ${accountId} not found`);
    const totalEquity = params.totalEquity ?? account.totalEquity;
    const usedMargin = params.usedMargin ?? account.usedMargin;
    const leverage = params.leverage ?? account.leverage;
    const availableMargin = totalEquity - usedMargin;
    const utilizationRate = totalEquity > 0 ? usedMargin / totalEquity : 0;
    const status: MarginAccount['status'] =
      utilizationRate >= account.liquidationLevel ? 'liquidating'
      : utilizationRate >= account.marginCallLevel ? 'margin_call'
      : utilizationRate >= 0.6 ? 'warning'
      : 'healthy';

    const updated: MarginAccount = {
      ...account,
      totalEquity,
      usedMargin,
      availableMargin,
      leverage,
      status,
    };
    this.marginAccounts.set(accountId, updated);
    return updated;
  }

  issueMarginCall(accountId: string): MarginCallResult {
    const account = this.marginAccounts.get(accountId);
    if (!account) throw new Error(`Margin account ${accountId} not found`);
    const prevStatus = account.status;
    const updatedAccount = { ...account, status: 'margin_call' as const };
    this.marginAccounts.set(accountId, updatedAccount);
    const requiredDeposit = account.usedMargin * 0.25; // 25% of used margin required
    this.emitEvent('risk_alert', 4, { accountId, type: 'margin_call', requiredDeposit });
    return {
      accountId,
      previousStatus: prevStatus,
      newStatus: 'margin_call',
      requiredDepositUsd: requiredDeposit,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  liquidateAccount(accountId: string): LiquidationResult {
    const account = this.marginAccounts.get(accountId);
    if (!account) throw new Error(`Margin account ${accountId} not found`);
    this.marginAccounts.set(accountId, { ...account, status: 'liquidating', usedMargin: 0, availableMargin: 0 });
    const remainingDebt = Math.max(0, account.usedMargin - account.totalEquity);
    return {
      accountId,
      ownerId: account.ownerId,
      liquidatedEquity: account.totalEquity,
      remainingDebt,
      liquidatedAt: new Date(),
    };
  }

  getMarginAccount(accountId: string): MarginAccount | undefined {
    return this.marginAccounts.get(accountId);
  }

  listMarginAccounts(filters?: MarginAccountFilters): MarginAccount[] {
    let result = Array.from(this.marginAccounts.values());
    if (filters?.ownerType) result = result.filter(a => a.ownerType === filters.ownerType);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    return result;
  }

  depositCollateral(agentId: AgentId, assetId: AssetId, amount: number, valueUsd: number): CollateralReceipt {
    const receipt: CollateralReceipt = {
      id: this.generateId('collat_rcpt'),
      agentId,
      assetId,
      amount,
      valueUsd,
      remainingAmount: amount,
      depositedAt: new Date(),
    };
    this.collateralReceipts.set(receipt.id, receipt);
    return receipt;
  }

  withdrawCollateral(receiptId: string, amount: number): void {
    const receipt = this.collateralReceipts.get(receiptId);
    if (!receipt) throw new Error(`Collateral receipt ${receiptId} not found`);
    if (amount > receipt.remainingAmount) throw new Error('Insufficient collateral remaining');
    this.collateralReceipts.set(receiptId, {
      ...receipt,
      remainingAmount: receipt.remainingAmount - amount,
    });
  }

  getNetExposure(agentId: AgentId): NetExposureResult {
    const agentReceipts = Array.from(this.collateralReceipts.values())
      .filter(r => r.agentId === agentId);
    const totalCollateral = agentReceipts.reduce((s, r) => s + r.valueUsd, 0);
    const agentAccounts = Array.from(this.marginAccounts.values())
      .filter(a => a.ownerId === agentId);
    const usedMargin = agentAccounts.reduce((s, a) => s + a.usedMargin, 0);
    return {
      agentId,
      longExposureUsd: usedMargin * 0.6,
      shortExposureUsd: usedMargin * 0.4,
      netExposureUsd: usedMargin * 0.2,
      grossExposureUsd: usedMargin,
      marginUtilization: totalCollateral > 0 ? usedMargin / totalCollateral : 0,
    };
  }

  getLayerStatus(): PrimeBrokerageLayerStatus {
    const pools = Array.from(this.capitalPools.values());
    const accounts = Array.from(this.marginAccounts.values());
    const atRisk = accounts.filter(a => a.status === 'margin_call' || a.status === 'warning' || a.status === 'liquidating');
    const totalEquity = accounts.reduce((s, a) => s + a.totalEquity, 0);
    const totalUsed = accounts.reduce((s, a) => s + a.usedMargin, 0);
    const avgLeverage = accounts.filter(a => a.leverage > 0).length > 0
      ? accounts.reduce((s, a) => s + a.leverage, 0) / accounts.filter(a => a.leverage > 0).length
      : 1;
    return {
      capitalPools: pools.length,
      totalPooledCapitalUsd: pools.reduce((s, p) => s + p.totalCapital, 0),
      marginAccounts: accounts.length,
      accountsAtRisk: atRisk.length,
      averageLeverage: avgLeverage,
      totalMarginUtilization: totalEquity > 0 ? totalUsed / totalEquity : 0,
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

export function createPrimeBrokerageLayerManager(): DefaultPrimeBrokerageLayerManager {
  return new DefaultPrimeBrokerageLayerManager();
}
