/**
 * TONAIAgent - Institutional Custody Integration
 *
 * Implements custody integration for institutional-grade asset management:
 * - External custodian integrations (Fireblocks, Copper, Anchorage, BitGo)
 * - MPC (Multi-Party Computation) key management
 * - Multi-signature wallet frameworks
 * - HSM (Hardware Security Module) support
 * - Withdrawal policy enforcement
 * - Address whitelisting
 */

import {
  CustodyConfig,
  CustodyProvider,
  CustodyType,
  CustodyWallet,
  CustodyTransaction,
  CustodyTransactionStatus,
  CustodyApproval,
  MpcConfig,
  MultiSigConfig,
  HsmConfig,
  WithdrawalPolicy,
  WhitelistedAddress,
  InstitutionalRole,
  InstitutionalEventCallback,
  InstitutionalEvent,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CustodyManager {
  // Config management
  configureCustomer(
    accountId: string,
    provider: CustodyProvider,
    custodyType: CustodyType,
    options?: CustodyConfigOptions
  ): Promise<CustodyConfig>;
  getCustodyConfig(accountId: string): Promise<CustodyConfig | null>;
  updateCustodyConfig(accountId: string, updates: Partial<CustodyConfigUpdates>): Promise<CustodyConfig>;

  // Wallet management
  createWallet(
    accountId: string,
    name: string,
    type: CustodyType,
    asset: string,
    network: string,
    options?: WalletOptions
  ): Promise<CustodyWallet>;
  getWallet(walletId: string): Promise<CustodyWallet | null>;
  listWallets(accountId: string, filters?: WalletFilters): Promise<CustodyWallet[]>;
  updateWalletBalance(walletId: string, newBalance: number): Promise<CustodyWallet>;
  freezeWallet(walletId: string, reason: string, frozenBy: string): Promise<void>;
  unfreezeWallet(walletId: string, unfrozenBy: string): Promise<void>;

  // Transaction management
  initiateWithdrawal(
    accountId: string,
    walletId: string,
    toAddress: string,
    asset: string,
    amount: number,
    initiatedBy: string
  ): Promise<CustodyTransaction>;
  approveTransaction(
    transactionId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    signature?: string
  ): Promise<CustodyTransaction>;
  rejectTransaction(
    transactionId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    reason: string
  ): Promise<CustodyTransaction>;
  getTransaction(transactionId: string): Promise<CustodyTransaction | null>;
  listTransactions(accountId: string, filters?: TransactionFilters): Promise<CustodyTransaction[]>;
  finalizeTransaction(transactionId: string, txHash: string): Promise<CustodyTransaction>;

  // Address whitelisting
  addWhitelistedAddress(
    accountId: string,
    address: string,
    network: string,
    label: string,
    addedBy: string
  ): Promise<WhitelistedAddress>;
  approveWhitelistedAddress(addressId: string, approvedBy: string): Promise<WhitelistedAddress>;
  removeWhitelistedAddress(addressId: string, removedBy: string): Promise<void>;
  listWhitelistedAddresses(accountId: string): Promise<WhitelistedAddress[]>;
  isAddressWhitelisted(accountId: string, address: string, network: string): Promise<boolean>;

  // Policy management
  updateWithdrawalPolicy(accountId: string, policy: Partial<WithdrawalPolicy>): Promise<CustodyConfig>;

  // MPC/Multi-sig helpers
  getMpcConfig(accountId: string): Promise<MpcConfig | null>;
  getMultiSigConfig(accountId: string): Promise<MultiSigConfig | null>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface CustodyConfigOptions {
  mpcConfig?: Partial<MpcConfig>;
  multiSigConfig?: Partial<MultiSigConfig>;
  hsmConfig?: Partial<HsmConfig>;
  withdrawalPolicy?: Partial<WithdrawalPolicy>;
}

export interface CustodyConfigUpdates {
  provider: CustodyProvider;
  custodyType: CustodyType;
  enabled: boolean;
  mpcConfig: Partial<MpcConfig>;
  multiSigConfig: Partial<MultiSigConfig>;
  hsmConfig: Partial<HsmConfig>;
  withdrawalPolicy: Partial<WithdrawalPolicy>;
}

export interface WalletOptions {
  custodyProvider?: CustodyProvider;
  metadata?: Record<string, unknown>;
}

export interface WalletFilters {
  type?: CustodyType;
  asset?: string;
  network?: string;
  status?: 'active' | 'inactive' | 'frozen';
}

export interface TransactionFilters {
  type?: 'deposit' | 'withdrawal' | 'internal_transfer';
  status?: CustodyTransactionStatus;
  asset?: string;
  fromDate?: Date;
  toDate?: Date;
}

// ============================================================================
// Default Custody Manager Implementation
// ============================================================================

export class DefaultCustodyManager implements CustodyManager {
  private readonly configs = new Map<string, CustodyConfig>();
  private readonly wallets = new Map<string, CustodyWallet>();
  private readonly walletsByAccount = new Map<string, Set<string>>();
  private readonly transactions = new Map<string, CustodyTransaction>();
  private readonly transactionsByAccount = new Map<string, Set<string>>();
  private readonly whitelistedAddresses = new Map<string, WhitelistedAddress>();
  private readonly addressesByAccount = new Map<string, Set<string>>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private counter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  private emitEvent(event: InstitutionalEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  async configureCustomer(
    accountId: string,
    provider: CustodyProvider,
    custodyType: CustodyType,
    options?: CustodyConfigOptions
  ): Promise<CustodyConfig> {
    const defaultWithdrawalPolicy: WithdrawalPolicy = {
      requiresApproval: true,
      approvalThreshold: 0,
      approverRoles: ['admin', 'risk_manager'],
      coolingPeriodHours: 24,
      dailyLimit: 1000000,
      whitelistOnly: true,
      travelRuleRequired: true,
    };

    const config: CustodyConfig = {
      accountId,
      provider,
      custodyType,
      enabled: true,
      wallets: [],
      mpcConfig: custodyType === 'mpc'
        ? {
            threshold: options?.mpcConfig?.threshold ?? 2,
            parties: options?.mpcConfig?.parties ?? [],
            keyShares: options?.mpcConfig?.keyShares ?? 3,
            refreshInterval: options?.mpcConfig?.refreshInterval ?? 30,
            enabled: true,
          }
        : undefined,
      multiSigConfig: custodyType === 'multi_sig'
        ? {
            requiredSignatures: options?.multiSigConfig?.requiredSignatures ?? 2,
            totalSigners: options?.multiSigConfig?.totalSigners ?? 3,
            signers: options?.multiSigConfig?.signers ?? [],
            scriptType: options?.multiSigConfig?.scriptType ?? 'p2wsh',
          }
        : undefined,
      hsmConfig: custodyType === 'hsm'
        ? {
            provider: options?.hsmConfig?.provider ?? 'generic',
            deviceId: options?.hsmConfig?.deviceId ?? `hsm_${accountId}`,
            slot: options?.hsmConfig?.slot ?? 0,
            requiresPhysicalPresence: options?.hsmConfig?.requiresPhysicalPresence ?? false,
          }
        : undefined,
      withdrawalPolicy: {
        ...defaultWithdrawalPolicy,
        ...options?.withdrawalPolicy,
      },
      whitelistedAddresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(accountId, config);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId,
      actorId: 'system',
      actorRole: 'admin',
      action: 'configure_custody',
      resource: 'custody_config',
      resourceId: accountId,
      details: { provider, custodyType },
      metadata: {},
    });

    return config;
  }

  async getCustodyConfig(accountId: string): Promise<CustodyConfig | null> {
    return this.configs.get(accountId) ?? null;
  }

  async updateCustodyConfig(
    accountId: string,
    updates: Partial<CustodyConfigUpdates>
  ): Promise<CustodyConfig> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Custody config not found for account: ${accountId}`);
    }

    if (updates.provider !== undefined) config.provider = updates.provider;
    if (updates.custodyType !== undefined) config.custodyType = updates.custodyType;
    if (updates.enabled !== undefined) config.enabled = updates.enabled;
    if (updates.mpcConfig !== undefined) {
      config.mpcConfig = { ...config.mpcConfig, ...updates.mpcConfig } as MpcConfig;
    }
    if (updates.multiSigConfig !== undefined) {
      config.multiSigConfig = { ...config.multiSigConfig, ...updates.multiSigConfig } as MultiSigConfig;
    }
    if (updates.hsmConfig !== undefined) {
      config.hsmConfig = { ...config.hsmConfig, ...updates.hsmConfig } as HsmConfig;
    }
    if (updates.withdrawalPolicy !== undefined) {
      config.withdrawalPolicy = { ...config.withdrawalPolicy, ...updates.withdrawalPolicy };
    }

    config.updatedAt = new Date();
    return config;
  }

  async createWallet(
    accountId: string,
    name: string,
    type: CustodyType,
    asset: string,
    network: string,
    options?: WalletOptions
  ): Promise<CustodyWallet> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Custody not configured for account: ${accountId}`);
    }

    const walletId = this.generateId('wallet');
    const wallet: CustodyWallet = {
      id: walletId,
      accountId,
      name,
      type,
      address: `addr_${walletId}`,
      network,
      asset,
      balance: 0,
      status: 'active',
      custodyProvider: options?.custodyProvider ?? config.provider,
      metadata: options?.metadata ?? {},
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    if (!this.walletsByAccount.has(accountId)) {
      this.walletsByAccount.set(accountId, new Set());
    }
    this.walletsByAccount.get(accountId)!.add(walletId);

    config.wallets.push(wallet);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId,
      actorId: 'system',
      actorRole: 'admin',
      action: 'create_wallet',
      resource: 'custody_wallet',
      resourceId: walletId,
      details: { name, type, asset, network },
      metadata: {},
    });

    return wallet;
  }

  async getWallet(walletId: string): Promise<CustodyWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async listWallets(accountId: string, filters?: WalletFilters): Promise<CustodyWallet[]> {
    const walletIds = this.walletsByAccount.get(accountId) ?? new Set();
    let wallets = Array.from(walletIds)
      .map(id => this.wallets.get(id))
      .filter((w): w is CustodyWallet => w !== undefined);

    if (filters?.type !== undefined) {
      wallets = wallets.filter(w => w.type === filters.type);
    }
    if (filters?.asset !== undefined) {
      wallets = wallets.filter(w => w.asset === filters.asset);
    }
    if (filters?.network !== undefined) {
      wallets = wallets.filter(w => w.network === filters.network);
    }
    if (filters?.status !== undefined) {
      wallets = wallets.filter(w => w.status === filters.status);
    }

    return wallets;
  }

  async updateWalletBalance(walletId: string, newBalance: number): Promise<CustodyWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    wallet.balance = newBalance;
    return wallet;
  }

  async freezeWallet(walletId: string, reason: string, frozenBy: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    wallet.status = 'frozen';

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId: wallet.accountId,
      actorId: frozenBy,
      actorRole: 'admin',
      action: 'freeze_wallet',
      resource: 'custody_wallet',
      resourceId: walletId,
      details: { reason },
      metadata: {},
    });
  }

  async unfreezeWallet(walletId: string, unfrozenBy: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    if (wallet.status !== 'frozen') {
      throw new Error(`Wallet is not frozen: ${walletId}`);
    }
    wallet.status = 'active';

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId: wallet.accountId,
      actorId: unfrozenBy,
      actorRole: 'admin',
      action: 'unfreeze_wallet',
      resource: 'custody_wallet',
      resourceId: walletId,
      details: {},
      metadata: {},
    });
  }

  async initiateWithdrawal(
    accountId: string,
    walletId: string,
    toAddress: string,
    asset: string,
    amount: number,
    initiatedBy: string
  ): Promise<CustodyTransaction> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Custody not configured for account: ${accountId}`);
    }

    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    // Check whitelist policy
    if (config.withdrawalPolicy.whitelistOnly) {
      const isWhitelisted = await this.isAddressWhitelisted(accountId, toAddress, wallet.network);
      if (!isWhitelisted) {
        throw new Error(`Address not whitelisted: ${toAddress}`);
      }
    }

    // Check balance
    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance: ${wallet.balance} < ${amount}`);
    }

    const transactionId = this.generateId('custody_tx');
    const transaction: CustodyTransaction = {
      id: transactionId,
      accountId,
      walletId,
      type: 'withdrawal',
      asset,
      amount,
      fromAddress: wallet.address,
      toAddress,
      network: wallet.network,
      status: config.withdrawalPolicy.requiresApproval ? 'pending_approval' : 'approved',
      txHash: undefined,
      approvals: [],
      requiredApprovals: config.withdrawalPolicy.requiresApproval
        ? config.withdrawalPolicy.approverRoles.length
        : 0,
      initiatedBy,
      initiatedAt: new Date(),
      metadata: {},
    };

    this.transactions.set(transactionId, transaction);

    if (!this.transactionsByAccount.has(accountId)) {
      this.transactionsByAccount.set(accountId, new Set());
    }
    this.transactionsByAccount.get(accountId)!.add(transactionId);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'approval_requested',
      accountId,
      actorId: initiatedBy,
      actorRole: 'trader',
      action: 'initiate_withdrawal',
      resource: 'custody_transaction',
      resourceId: transactionId,
      details: { asset, amount, toAddress },
      metadata: {},
    });

    return transaction;
  }

  async approveTransaction(
    transactionId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    signature?: string
  ): Promise<CustodyTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== 'pending_approval') {
      throw new Error(`Transaction is not pending approval: ${transactionId}`);
    }

    // Check if already approved by this person
    const alreadyApproved = transaction.approvals.some(a => a.approverId === approverId);
    if (alreadyApproved) {
      throw new Error(`Transaction already approved by: ${approverId}`);
    }

    const approval: CustodyApproval = {
      approverId,
      approverRole,
      decision: 'approved',
      timestamp: new Date(),
      signature,
    };

    transaction.approvals.push(approval);

    // Check if enough approvals collected
    if (transaction.approvals.filter(a => a.decision === 'approved').length >= transaction.requiredApprovals) {
      transaction.status = 'approved';
    }

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'approval_decision',
      accountId: transaction.accountId,
      actorId: approverId,
      actorRole: approverRole,
      action: 'approve_custody_transaction',
      resource: 'custody_transaction',
      resourceId: transactionId,
      details: { decision: 'approved' },
      metadata: {},
    });

    return transaction;
  }

  async rejectTransaction(
    transactionId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    reason: string
  ): Promise<CustodyTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== 'pending_approval') {
      throw new Error(`Transaction is not pending approval: ${transactionId}`);
    }

    const approval: CustodyApproval = {
      approverId,
      approverRole,
      decision: 'rejected',
      timestamp: new Date(),
      comments: reason,
    };

    transaction.approvals.push(approval);
    transaction.status = 'cancelled';
    transaction.failureReason = reason;

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'approval_decision',
      accountId: transaction.accountId,
      actorId: approverId,
      actorRole: approverRole,
      action: 'reject_custody_transaction',
      resource: 'custody_transaction',
      resourceId: transactionId,
      details: { decision: 'rejected', reason },
      metadata: {},
    });

    return transaction;
  }

  async getTransaction(transactionId: string): Promise<CustodyTransaction | null> {
    return this.transactions.get(transactionId) ?? null;
  }

  async listTransactions(accountId: string, filters?: TransactionFilters): Promise<CustodyTransaction[]> {
    const txIds = this.transactionsByAccount.get(accountId) ?? new Set();
    let transactions = Array.from(txIds)
      .map(id => this.transactions.get(id))
      .filter((tx): tx is CustodyTransaction => tx !== undefined);

    if (filters?.type !== undefined) {
      transactions = transactions.filter(tx => tx.type === filters.type);
    }
    if (filters?.status !== undefined) {
      transactions = transactions.filter(tx => tx.status === filters.status);
    }
    if (filters?.asset !== undefined) {
      transactions = transactions.filter(tx => tx.asset === filters.asset);
    }
    if (filters?.fromDate !== undefined) {
      transactions = transactions.filter(tx => tx.initiatedAt >= filters.fromDate!);
    }
    if (filters?.toDate !== undefined) {
      transactions = transactions.filter(tx => tx.initiatedAt <= filters.toDate!);
    }

    return transactions;
  }

  async finalizeTransaction(transactionId: string, txHash: string): Promise<CustodyTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    transaction.txHash = txHash;
    transaction.status = 'completed';
    transaction.completedAt = new Date();

    // Update wallet balance
    const wallet = this.wallets.get(transaction.walletId);
    if (wallet && transaction.type === 'withdrawal') {
      wallet.balance = Math.max(0, wallet.balance - transaction.amount);
    }

    return transaction;
  }

  async addWhitelistedAddress(
    accountId: string,
    address: string,
    network: string,
    label: string,
    addedBy: string
  ): Promise<WhitelistedAddress> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Custody not configured for account: ${accountId}`);
    }

    const addressId = this.generateId('wl_addr');
    const whitelistedAddress: WhitelistedAddress = {
      id: addressId,
      address,
      network,
      label,
      addedBy,
      addedAt: new Date(),
      status: 'pending',
    };

    this.whitelistedAddresses.set(addressId, whitelistedAddress);

    if (!this.addressesByAccount.has(accountId)) {
      this.addressesByAccount.set(accountId, new Set());
    }
    this.addressesByAccount.get(accountId)!.add(addressId);

    config.whitelistedAddresses.push(whitelistedAddress);

    return whitelistedAddress;
  }

  async approveWhitelistedAddress(addressId: string, approvedBy: string): Promise<WhitelistedAddress> {
    const address = this.whitelistedAddresses.get(addressId);
    if (!address) {
      throw new Error(`Whitelisted address not found: ${addressId}`);
    }

    address.status = 'approved';
    address.approvedBy = approvedBy;
    address.approvedAt = new Date();

    return address;
  }

  async removeWhitelistedAddress(addressId: string, removedBy: string): Promise<void> {
    const address = this.whitelistedAddresses.get(addressId);
    if (!address) {
      throw new Error(`Whitelisted address not found: ${addressId}`);
    }

    address.status = 'removed';

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId: '',
      actorId: removedBy,
      actorRole: 'admin',
      action: 'remove_whitelisted_address',
      resource: 'whitelisted_address',
      resourceId: addressId,
      details: { address: address.address },
      metadata: {},
    });
  }

  async listWhitelistedAddresses(accountId: string): Promise<WhitelistedAddress[]> {
    const addressIds = this.addressesByAccount.get(accountId) ?? new Set();
    return Array.from(addressIds)
      .map(id => this.whitelistedAddresses.get(id))
      .filter((a): a is WhitelistedAddress => a !== undefined && a.status !== 'removed');
  }

  async isAddressWhitelisted(accountId: string, address: string, network: string): Promise<boolean> {
    const addresses = await this.listWhitelistedAddresses(accountId);
    return addresses.some(
      a => a.address === address && a.network === network && a.status === 'approved'
    );
  }

  async updateWithdrawalPolicy(
    accountId: string,
    policy: Partial<WithdrawalPolicy>
  ): Promise<CustodyConfig> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Custody config not found for account: ${accountId}`);
    }

    config.withdrawalPolicy = { ...config.withdrawalPolicy, ...policy };
    config.updatedAt = new Date();

    return config;
  }

  async getMpcConfig(accountId: string): Promise<MpcConfig | null> {
    const config = this.configs.get(accountId);
    return config?.mpcConfig ?? null;
  }

  async getMultiSigConfig(accountId: string): Promise<MultiSigConfig | null> {
    const config = this.configs.get(accountId);
    return config?.multiSigConfig ?? null;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCustodyManager(): DefaultCustodyManager {
  return new DefaultCustodyManager();
}

export { DEFAULT_ROLE_PERMISSIONS } from './accounts';
