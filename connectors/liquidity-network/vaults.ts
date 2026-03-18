/**
 * TONAIAgent - Deep Liquidity Vaults
 *
 * Provides institutional-grade vault infrastructure for:
 * - Stablecoin vaults for stable liquidity reserves
 * - RWA liquidity pools backed by real-world assets
 * - Hedging pools for risk management
 * - Yield-bearing vault strategies
 */

import {
  LiquidityVault,
  VaultKind,
  VaultDepositRecord,
  VaultWithdrawalRecord,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface CreateVaultParams {
  name: string;
  kind: VaultKind;
  assetId: string;
  initialApy?: number;
}

export interface DepositToVaultParams {
  vaultId: string;
  depositorId: string;
  amount: string;
}

export interface WithdrawFromVaultParams {
  vaultId: string;
  withdrawerId: string;
  shares: string;
}

export interface VaultFilters {
  kind?: VaultKind;
  assetId?: string;
  status?: LiquidityVault['status'];
  minApy?: number;
}

export interface VaultPortfolioSummary {
  vaultId: string;
  vaultName: string;
  kind: VaultKind;
  participantId: string;
  sharesHeld: string;
  estimatedValue: string;
  unrealizedYield: string;
}

export interface DeepLiquidityVaultManager {
  createVault(params: CreateVaultParams): LiquidityVault;
  getVault(vaultId: string): LiquidityVault | undefined;
  listVaults(filters?: VaultFilters): LiquidityVault[];
  pauseVault(vaultId: string): void;
  deprecateVault(vaultId: string): void;
  updateVaultApy(vaultId: string, apy: number): void;

  deposit(params: DepositToVaultParams): VaultDepositRecord;
  withdraw(params: WithdrawFromVaultParams): VaultWithdrawalRecord;

  getDeposits(vaultId: string, depositorId?: string): VaultDepositRecord[];
  getWithdrawals(vaultId: string, withdrawerId?: string): VaultWithdrawalRecord[];
  getPortfolioSummary(participantId: string): VaultPortfolioSummary[];

  getTotalValueLocked(): string;

  onEvent(callback: LiquidityNetworkEventCallback): void;
}

export class DefaultDeepLiquidityVaultManager implements DeepLiquidityVaultManager {
  private vaults: Map<string, LiquidityVault> = new Map();
  private eventCallbacks: LiquidityNetworkEventCallback[] = [];

  createVault(params: CreateVaultParams): LiquidityVault {
    const vaultId = this.generateId('vault');
    const now = new Date();
    const vault: LiquidityVault = {
      id: vaultId,
      name: params.name,
      kind: params.kind,
      assetId: params.assetId,
      totalAssets: '0',
      totalShares: '0',
      sharePrice: '1',
      apy: params.initialApy ?? 0.05,
      utilizationRate: 0,
      status: 'active',
      deposits: [],
      withdrawals: [],
      createdAt: now,
      updatedAt: now,
    };
    this.vaults.set(vaultId, vault);
    this.emitEvent('vault_created', 'vault', vaultId, { name: vault.name, kind: vault.kind });
    return vault;
  }

  getVault(vaultId: string): LiquidityVault | undefined {
    return this.vaults.get(vaultId);
  }

  listVaults(filters?: VaultFilters): LiquidityVault[] {
    let vaults = Array.from(this.vaults.values());
    if (!filters) return vaults;

    if (filters.kind) vaults = vaults.filter(v => v.kind === filters.kind);
    if (filters.assetId) vaults = vaults.filter(v => v.assetId === filters.assetId);
    if (filters.status) vaults = vaults.filter(v => v.status === filters.status);
    if (filters.minApy !== undefined) vaults = vaults.filter(v => v.apy >= filters.minApy!);
    return vaults;
  }

  pauseVault(vaultId: string): void {
    const vault = this.requireVault(vaultId);
    vault.status = 'paused';
    vault.updatedAt = new Date();
    this.vaults.set(vaultId, vault);
  }

  deprecateVault(vaultId: string): void {
    const vault = this.requireVault(vaultId);
    vault.status = 'deprecated';
    vault.updatedAt = new Date();
    this.vaults.set(vaultId, vault);
  }

  updateVaultApy(vaultId: string, apy: number): void {
    const vault = this.requireVault(vaultId);
    vault.apy = apy;
    vault.updatedAt = new Date();
    this.vaults.set(vaultId, vault);
  }

  deposit(params: DepositToVaultParams): VaultDepositRecord {
    const vault = this.requireVault(params.vaultId);
    if (vault.status !== 'active') {
      throw new Error(`Vault is not accepting deposits: ${params.vaultId}`);
    }

    const depositAmount = parseFloat(params.amount);
    if (depositAmount <= 0) throw new Error('Deposit amount must be positive');

    const sharePrice = parseFloat(vault.sharePrice);
    const sharesMinted = (depositAmount / sharePrice).toFixed(8);

    vault.totalAssets = (parseFloat(vault.totalAssets) + depositAmount).toString();
    vault.totalShares = (parseFloat(vault.totalShares) + parseFloat(sharesMinted)).toString();
    this.updateSharePrice(vault);

    const record: VaultDepositRecord = {
      id: this.generateId('dep'),
      vaultId: params.vaultId,
      depositorId: params.depositorId,
      amount: params.amount,
      sharesMinted,
      depositedAt: new Date(),
    };

    vault.deposits.push(record);
    vault.updatedAt = new Date();
    this.vaults.set(params.vaultId, vault);
    this.emitEvent('vault_deposit', 'vault', params.vaultId, {
      depositorId: params.depositorId,
      amount: params.amount,
      sharesMinted,
    });

    return record;
  }

  withdraw(params: WithdrawFromVaultParams): VaultWithdrawalRecord {
    const vault = this.requireVault(params.vaultId);
    if (vault.status === 'deprecated') {
      throw new Error(`Vault is deprecated: ${params.vaultId}`);
    }

    const sharesToBurn = parseFloat(params.shares);
    if (sharesToBurn <= 0) throw new Error('Shares must be positive');

    const totalShares = parseFloat(vault.totalShares);
    if (sharesToBurn > totalShares) {
      throw new Error(`Insufficient shares. Available: ${vault.totalShares}`);
    }

    // Validate depositor has enough shares
    const depositorShares = this.getDepositorShares(vault, params.withdrawerId);
    if (sharesToBurn > depositorShares) {
      throw new Error(`Withdrawer has insufficient shares: ${depositorShares.toFixed(8)}`);
    }

    const sharePrice = parseFloat(vault.sharePrice);
    const amountReceived = (sharesToBurn * sharePrice).toFixed(8);

    vault.totalAssets = (parseFloat(vault.totalAssets) - parseFloat(amountReceived)).toString();
    vault.totalShares = (totalShares - sharesToBurn).toString();
    this.updateSharePrice(vault);

    const record: VaultWithdrawalRecord = {
      id: this.generateId('wdraw'),
      vaultId: params.vaultId,
      withdrawerId: params.withdrawerId,
      sharesBurned: params.shares,
      amountReceived,
      withdrawnAt: new Date(),
    };

    vault.withdrawals.push(record);
    vault.updatedAt = new Date();
    this.vaults.set(params.vaultId, vault);
    this.emitEvent('vault_withdrawal', 'vault', params.vaultId, {
      withdrawerId: params.withdrawerId,
      sharesBurned: params.shares,
      amountReceived,
    });

    return record;
  }

  getDeposits(vaultId: string, depositorId?: string): VaultDepositRecord[] {
    const vault = this.requireVault(vaultId);
    if (depositorId) {
      return vault.deposits.filter(d => d.depositorId === depositorId);
    }
    return vault.deposits;
  }

  getWithdrawals(vaultId: string, withdrawerId?: string): VaultWithdrawalRecord[] {
    const vault = this.requireVault(vaultId);
    if (withdrawerId) {
      return vault.withdrawals.filter(w => w.withdrawerId === withdrawerId);
    }
    return vault.withdrawals;
  }

  getPortfolioSummary(participantId: string): VaultPortfolioSummary[] {
    const summaries: VaultPortfolioSummary[] = [];

    for (const vault of this.vaults.values()) {
      const depositorShares = this.getDepositorShares(vault, participantId);
      if (depositorShares <= 0) continue;

      const sharePrice = parseFloat(vault.sharePrice);
      const estimatedValue = (depositorShares * sharePrice).toFixed(8);

      // Calculate total deposited value
      const totalDeposited = vault.deposits
        .filter(d => d.depositorId === participantId)
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);

      const unrealizedYield = (parseFloat(estimatedValue) - totalDeposited).toFixed(8);

      summaries.push({
        vaultId: vault.id,
        vaultName: vault.name,
        kind: vault.kind,
        participantId,
        sharesHeld: depositorShares.toFixed(8),
        estimatedValue,
        unrealizedYield,
      });
    }

    return summaries;
  }

  getTotalValueLocked(): string {
    let total = 0;
    for (const vault of this.vaults.values()) {
      if (vault.status !== 'deprecated') {
        total += parseFloat(vault.totalAssets);
      }
    }
    return total.toString();
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private requireVault(vaultId: string): LiquidityVault {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error(`Vault not found: ${vaultId}`);
    return vault;
  }

  private getDepositorShares(vault: LiquidityVault, depositorId: string): number {
    const deposited = vault.deposits
      .filter(d => d.depositorId === depositorId)
      .reduce((sum, d) => sum + parseFloat(d.sharesMinted), 0);
    const withdrawn = vault.withdrawals
      .filter(w => w.withdrawerId === depositorId)
      .reduce((sum, w) => sum + parseFloat(w.sharesBurned), 0);
    return Math.max(0, deposited - withdrawn);
  }

  private updateSharePrice(vault: LiquidityVault): void {
    const totalShares = parseFloat(vault.totalShares);
    const totalAssets = parseFloat(vault.totalAssets);
    vault.sharePrice = totalShares > 0 ? (totalAssets / totalShares).toFixed(8) : '1';
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(
    type: LiquidityNetworkEvent['type'],
    entityKind: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const event: LiquidityNetworkEvent = {
      id: this.generateId('evt'),
      type,
      entityId,
      entityKind,
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

export function createDeepLiquidityVaultManager(): DefaultDeepLiquidityVaultManager {
  return new DefaultDeepLiquidityVaultManager();
}
