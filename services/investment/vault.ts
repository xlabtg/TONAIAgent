/**
 * Capital Vault Architecture
 *
 * Manages investment vaults for users, strategies, institutions, and DAOs.
 * Supports TON deposits, strategy binding, withdrawal logic, risk parameters,
 * and allocation limits. Enforced by the risk engine and lifecycle orchestrator.
 */

import type {
  Vault,
  VaultType,
  VaultStatus,
  VaultRiskParameters,
  VaultAllocationLimits,
  CreateVaultInput,
  DepositResult,
  WithdrawalRequest,
  WithdrawalStatus,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface VaultManager {
  // Vault lifecycle
  createVault(input: CreateVaultInput): Promise<Vault>;
  getVault(vaultId: string): Promise<Vault | null>;
  listVaults(ownerId: string): Promise<Vault[]>;
  updateVaultStatus(vaultId: string, status: VaultStatus): Promise<Vault>;

  // Capital operations
  deposit(vaultId: string, amount: number): Promise<DepositResult>;
  requestWithdrawal(vaultId: string, amount: number, reason?: string): Promise<WithdrawalRequest>;
  processWithdrawal(requestId: string): Promise<WithdrawalRequest>;
  getWithdrawalRequest(requestId: string): Promise<WithdrawalRequest | null>;
  listWithdrawalRequests(vaultId: string): Promise<WithdrawalRequest[]>;

  // Strategy binding
  bindStrategy(vaultId: string, strategyId: string): Promise<Vault>;
  unbindStrategy(vaultId: string, strategyId: string): Promise<Vault>;

  // Risk parameters
  updateRiskParameters(vaultId: string, params: Partial<VaultRiskParameters>): Promise<Vault>;
  updateAllocationLimits(vaultId: string, limits: Partial<VaultAllocationLimits>): Promise<Vault>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface VaultManagerConfig {
  maxVaultsPerOwner: number;
  minDepositAmount: number;
  minWithdrawalAmount: number;
  defaultRiskParameters: VaultRiskParameters;
  defaultAllocationLimits: VaultAllocationLimits;
}

const DEFAULT_RISK_PARAMETERS: VaultRiskParameters = {
  maxDrawdown: 20, // 20%
  maxExposurePerStrategy: 40, // 40%
  dailyRiskThreshold: 100, // 100 TON
  circuitBreakerEnabled: true,
  emergencyStopEnabled: true,
};

const DEFAULT_ALLOCATION_LIMITS: VaultAllocationLimits = {
  minAllocationPercent: 5,
  maxAllocationPercent: 60,
  maxStrategies: 10,
  minBalance: 10, // Keep at least 10 TON unallocated
};

const DEFAULT_CONFIG: VaultManagerConfig = {
  maxVaultsPerOwner: 10,
  minDepositAmount: 1,
  minWithdrawalAmount: 0.1,
  defaultRiskParameters: DEFAULT_RISK_PARAMETERS,
  defaultAllocationLimits: DEFAULT_ALLOCATION_LIMITS,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultVaultManager implements VaultManager {
  private readonly config: VaultManagerConfig;
  private readonly vaults: Map<string, Vault> = new Map();
  private readonly withdrawalRequests: Map<string, WithdrawalRequest> = new Map();
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<VaultManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createVault(input: CreateVaultInput): Promise<Vault> {
    // Enforce per-owner limit
    const ownerVaults = Array.from(this.vaults.values()).filter(v => v.ownerId === input.ownerId);
    if (ownerVaults.length >= this.config.maxVaultsPerOwner) {
      throw new Error(
        `Owner ${input.ownerId} has reached the maximum vault limit of ${this.config.maxVaultsPerOwner}`
      );
    }

    const now = new Date();
    const vaultId = this.generateId('vault');
    const riskParameters: VaultRiskParameters = {
      ...this.config.defaultRiskParameters,
      ...input.riskParameters,
    };
    const allocationLimits: VaultAllocationLimits = {
      ...this.config.defaultAllocationLimits,
      ...input.allocationLimits,
    };
    const initialBalance = input.initialDeposit ?? 0;

    const vault: Vault = {
      id: vaultId,
      ownerId: input.ownerId,
      name: input.name,
      type: input.type,
      status: 'active',
      balance: initialBalance,
      allocatedBalance: 0,
      availableBalance: initialBalance,
      boundStrategyIds: [],
      riskParameters,
      allocationLimits,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };

    this.vaults.set(vaultId, vault);

    this.emitEvent({
      type: 'vault_created',
      timestamp: now,
      data: { vaultId, ownerId: input.ownerId, type: input.type, initialBalance },
    });

    return vault;
  }

  async getVault(vaultId: string): Promise<Vault | null> {
    return this.vaults.get(vaultId) ?? null;
  }

  async listVaults(ownerId: string): Promise<Vault[]> {
    return Array.from(this.vaults.values()).filter(v => v.ownerId === ownerId);
  }

  async updateVaultStatus(vaultId: string, status: VaultStatus): Promise<Vault> {
    const vault = this.getVaultOrThrow(vaultId);
    const updatedVault: Vault = { ...vault, status, updatedAt: new Date() };
    this.vaults.set(vaultId, updatedVault);

    this.emitEvent({
      type: 'vault_status_changed',
      timestamp: updatedVault.updatedAt,
      data: { vaultId, previousStatus: vault.status, newStatus: status },
    });

    return updatedVault;
  }

  async deposit(vaultId: string, amount: number): Promise<DepositResult> {
    if (amount < this.config.minDepositAmount) {
      throw new Error(
        `Deposit amount ${amount} TON is below minimum ${this.config.minDepositAmount} TON`
      );
    }

    const vault = this.getVaultOrThrow(vaultId);

    if (vault.status !== 'active') {
      throw new Error(`Vault ${vaultId} is not active (status: ${vault.status})`);
    }

    const previousBalance = vault.balance;
    const newBalance = previousBalance + amount;
    const txHash = this.generateTxHash();
    const now = new Date();

    const updatedVault: Vault = {
      ...vault,
      balance: newBalance,
      availableBalance: vault.availableBalance + amount,
      updatedAt: now,
    };
    this.vaults.set(vaultId, updatedVault);

    const result: DepositResult = {
      vaultId,
      amount,
      previousBalance,
      newBalance,
      txHash,
      timestamp: now,
    };

    this.emitEvent({
      type: 'vault_deposit',
      timestamp: now,
      data: { vaultId, amount, previousBalance, newBalance, txHash },
    });

    return result;
  }

  async requestWithdrawal(vaultId: string, amount: number, reason?: string): Promise<WithdrawalRequest> {
    if (amount < this.config.minWithdrawalAmount) {
      throw new Error(
        `Withdrawal amount ${amount} TON is below minimum ${this.config.minWithdrawalAmount} TON`
      );
    }

    const vault = this.getVaultOrThrow(vaultId);

    if (vault.status !== 'active') {
      throw new Error(`Vault ${vaultId} is not active (status: ${vault.status})`);
    }

    if (amount > vault.availableBalance) {
      throw new Error(
        `Insufficient available balance: requested ${amount} TON, available ${vault.availableBalance} TON`
      );
    }

    const requestId = this.generateId('withdrawal');
    const now = new Date();

    const request: WithdrawalRequest = {
      id: requestId,
      vaultId,
      amount,
      status: 'pending',
      requestedAt: now,
      reason,
    };

    this.withdrawalRequests.set(requestId, request);

    // Reserve the amount
    const updatedVault: Vault = {
      ...vault,
      availableBalance: vault.availableBalance - amount,
      updatedAt: now,
    };
    this.vaults.set(vaultId, updatedVault);

    this.emitEvent({
      type: 'vault_withdrawal',
      timestamp: now,
      data: { vaultId, requestId, amount, status: 'pending' },
    });

    return request;
  }

  async processWithdrawal(requestId: string): Promise<WithdrawalRequest> {
    const request = this.withdrawalRequests.get(requestId);
    if (!request) {
      throw new Error(`Withdrawal request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Withdrawal request ${requestId} is not pending (status: ${request.status})`);
    }

    const vault = this.getVaultOrThrow(request.vaultId);
    const now = new Date();
    const txHash = this.generateTxHash();

    const completedRequest: WithdrawalRequest = {
      ...request,
      status: 'completed',
      processedAt: now,
      txHash,
    };
    this.withdrawalRequests.set(requestId, completedRequest);

    // Deduct from vault balance
    const updatedVault: Vault = {
      ...vault,
      balance: vault.balance - request.amount,
      updatedAt: now,
    };
    this.vaults.set(request.vaultId, updatedVault);

    this.emitEvent({
      type: 'vault_withdrawal',
      timestamp: now,
      data: { vaultId: request.vaultId, requestId, amount: request.amount, status: 'completed', txHash },
    });

    return completedRequest;
  }

  async getWithdrawalRequest(requestId: string): Promise<WithdrawalRequest | null> {
    return this.withdrawalRequests.get(requestId) ?? null;
  }

  async listWithdrawalRequests(vaultId: string): Promise<WithdrawalRequest[]> {
    return Array.from(this.withdrawalRequests.values()).filter(r => r.vaultId === vaultId);
  }

  async bindStrategy(vaultId: string, strategyId: string): Promise<Vault> {
    const vault = this.getVaultOrThrow(vaultId);

    if (vault.boundStrategyIds.includes(strategyId)) {
      throw new Error(`Strategy ${strategyId} is already bound to vault ${vaultId}`);
    }

    if (vault.boundStrategyIds.length >= vault.allocationLimits.maxStrategies) {
      throw new Error(
        `Vault ${vaultId} has reached the maximum strategy limit of ${vault.allocationLimits.maxStrategies}`
      );
    }

    const updatedVault: Vault = {
      ...vault,
      boundStrategyIds: [...vault.boundStrategyIds, strategyId],
      updatedAt: new Date(),
    };
    this.vaults.set(vaultId, updatedVault);
    return updatedVault;
  }

  async unbindStrategy(vaultId: string, strategyId: string): Promise<Vault> {
    const vault = this.getVaultOrThrow(vaultId);

    if (!vault.boundStrategyIds.includes(strategyId)) {
      throw new Error(`Strategy ${strategyId} is not bound to vault ${vaultId}`);
    }

    const updatedVault: Vault = {
      ...vault,
      boundStrategyIds: vault.boundStrategyIds.filter(id => id !== strategyId),
      updatedAt: new Date(),
    };
    this.vaults.set(vaultId, updatedVault);
    return updatedVault;
  }

  async updateRiskParameters(vaultId: string, params: Partial<VaultRiskParameters>): Promise<Vault> {
    const vault = this.getVaultOrThrow(vaultId);
    const updatedVault: Vault = {
      ...vault,
      riskParameters: { ...vault.riskParameters, ...params },
      updatedAt: new Date(),
    };
    this.vaults.set(vaultId, updatedVault);
    return updatedVault;
  }

  async updateAllocationLimits(vaultId: string, limits: Partial<VaultAllocationLimits>): Promise<Vault> {
    const vault = this.getVaultOrThrow(vaultId);
    const updatedVault: Vault = {
      ...vault,
      allocationLimits: { ...vault.allocationLimits, ...limits },
      updatedAt: new Date(),
    };
    this.vaults.set(vaultId, updatedVault);
    return updatedVault;
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private getVaultOrThrow(vaultId: string): Vault {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error(`Vault ${vaultId} not found`);
    return vault;
  }

  private emitEvent(event: InvestmentEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Swallow callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private generateTxHash(): string {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  // Expose internal state for health checks (used by InvestmentLayer)
  getStats(): { totalVaults: number; totalAllocatedTon: number } {
    let totalAllocatedTon = 0;
    for (const v of this.vaults.values()) {
      totalAllocatedTon += v.allocatedBalance;
    }
    return { totalVaults: this.vaults.size, totalAllocatedTon };
  }
}

export function createVaultManager(config?: Partial<VaultManagerConfig>): DefaultVaultManager {
  return new DefaultVaultManager(config);
}
