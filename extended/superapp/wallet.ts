/**
 * TONAIAgent - Smart Wallet Module
 *
 * Multi-asset TON wallet with smart contract support, MPC recovery,
 * and deep integration with autonomous AI agents.
 *
 * Features:
 * - Multi-asset support (TON, Jettons, NFTs, staking positions)
 * - Multiple wallet types (standard, multisig, smart contract, MPC)
 * - Social recovery with guardians
 * - Agent delegation and permissions
 * - Automated transfers and rules
 * - Enhanced security controls
 */

import type {
  SmartWallet,
  WalletType,
  WalletBalance,
  WalletSecurityConfig,
  WalletRecoveryConfig,
  ConnectedAgent,
  AgentWalletPermission,
  DelegationRule,
  AutomatedTransfer,
  TransferSchedule,
  WalletTransaction,
  TransactionMetadata,
  TransactionLimits,
  Guardian,
  SecurityLevel,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface WalletManagerConfig {
  supportedAssets: string[];
  supportedProtocols: string[];
  defaultSecurityLevel: SecurityLevel;
  defaultTransactionLimits: TransactionLimits;
  maxAgentsPerWallet: number;
  maxGuardiansPerWallet: number;
  maxAutomatedTransfers: number;
  autoLockTimeoutMinutes: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateWalletInput {
  userId: string;
  type: WalletType;
  name: string;
  securityLevel?: SecurityLevel;
  recoveryMethods?: WalletRecoveryConfig['methods'];
}

export interface TransferInput {
  walletId: string;
  to: string;
  amount: number;
  currency: string;
  metadata?: Partial<TransactionMetadata>;
}

export interface ConnectAgentInput {
  walletId: string;
  agentId: string;
  agentName: string;
  permissions: AgentWalletPermission[];
  capitalAllocated: number;
}

export interface AddGuardianInput {
  walletId: string;
  name: string;
  telegramId?: string;
  address?: string;
}

export interface CreateDelegationRuleInput {
  walletId: string;
  agentId: string;
  action: string;
  conditions: DelegationRule['conditions'];
  maxAmount: number;
  expiresAt?: Date;
}

export interface CreateAutomatedTransferInput {
  walletId: string;
  name: string;
  to: string;
  amount: number;
  currency: string;
  schedule: TransferSchedule;
}

// ============================================================================
// Wallet Manager Interface
// ============================================================================

export interface WalletManager {
  // Wallet CRUD
  create(input: CreateWalletInput): Promise<SmartWallet>;
  get(walletId: string): Promise<SmartWallet | null>;
  getByUserId(userId: string): Promise<SmartWallet[]>;
  update(walletId: string, updates: Partial<SmartWallet>): Promise<SmartWallet>;
  delete(walletId: string): Promise<void>;

  // Balances
  getBalances(walletId: string): Promise<WalletBalance[]>;
  refreshBalances(walletId: string): Promise<WalletBalance[]>;

  // Transactions
  transfer(input: TransferInput): Promise<WalletTransaction>;
  getTransactions(walletId: string, limit?: number, offset?: number): Promise<WalletTransaction[]>;
  getTransaction(transactionId: string): Promise<WalletTransaction | null>;

  // Security
  updateSecurityConfig(walletId: string, config: Partial<WalletSecurityConfig>): Promise<WalletSecurityConfig>;
  verifyTransaction(walletId: string, transactionId: string, code: string): Promise<boolean>;
  lockWallet(walletId: string): Promise<void>;
  unlockWallet(walletId: string, code: string): Promise<void>;

  // Recovery
  addGuardian(input: AddGuardianInput): Promise<Guardian>;
  removeGuardian(walletId: string, guardianId: string): Promise<void>;
  getGuardians(walletId: string): Promise<Guardian[]>;
  initiateRecovery(walletId: string, method: WalletRecoveryConfig['methods'][number]): Promise<string>;
  completeRecovery(walletId: string, recoveryId: string, proofs: string[]): Promise<boolean>;

  // Agent Integration
  connectAgent(input: ConnectAgentInput): Promise<ConnectedAgent>;
  disconnectAgent(walletId: string, agentId: string): Promise<void>;
  getConnectedAgents(walletId: string): Promise<ConnectedAgent[]>;
  updateAgentPermissions(walletId: string, agentId: string, permissions: AgentWalletPermission[]): Promise<void>;

  // Delegation Rules
  createDelegationRule(input: CreateDelegationRuleInput): Promise<DelegationRule>;
  getDelegationRules(walletId: string): Promise<DelegationRule[]>;
  updateDelegationRule(ruleId: string, updates: Partial<DelegationRule>): Promise<DelegationRule>;
  deleteDelegationRule(ruleId: string): Promise<void>;

  // Automated Transfers
  createAutomatedTransfer(input: CreateAutomatedTransferInput): Promise<AutomatedTransfer>;
  getAutomatedTransfers(walletId: string): Promise<AutomatedTransfer[]>;
  updateAutomatedTransfer(transferId: string, updates: Partial<AutomatedTransfer>): Promise<AutomatedTransfer>;
  deleteAutomatedTransfer(transferId: string): Promise<void>;
  executeAutomatedTransfer(transferId: string): Promise<WalletTransaction>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultWalletManager implements WalletManager {
  private readonly config: WalletManagerConfig;
  private readonly wallets = new Map<string, SmartWallet>();
  private readonly transactions = new Map<string, WalletTransaction>();
  private readonly delegationRules = new Map<string, DelegationRule>();
  private readonly automatedTransfers = new Map<string, AutomatedTransfer>();
  private readonly lockedWallets = new Set<string>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<WalletManagerConfig> = {}) {
    this.config = {
      supportedAssets: config.supportedAssets ?? ['TON', 'USDT', 'USDC'],
      supportedProtocols: config.supportedProtocols ?? ['dedust', 'ston.fi', 'tonstakers'],
      defaultSecurityLevel: config.defaultSecurityLevel ?? 'standard',
      defaultTransactionLimits: config.defaultTransactionLimits ?? {
        dailyLimit: 10000,
        singleTransactionLimit: 1000,
        requireApprovalAbove: 500,
        currency: 'TON',
      },
      maxAgentsPerWallet: config.maxAgentsPerWallet ?? 10,
      maxGuardiansPerWallet: config.maxGuardiansPerWallet ?? 5,
      maxAutomatedTransfers: config.maxAutomatedTransfers ?? 20,
      autoLockTimeoutMinutes: config.autoLockTimeoutMinutes ?? 30,
    };
  }

  // ============================================================================
  // Wallet CRUD
  // ============================================================================

  async create(input: CreateWalletInput): Promise<SmartWallet> {
    const walletId = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const address = this.generateAddress(input.type);

    const wallet: SmartWallet = {
      id: walletId,
      address,
      type: input.type,
      name: input.name,
      userId: input.userId,
      balances: [],
      securityConfig: {
        level: input.securityLevel ?? this.config.defaultSecurityLevel,
        biometricEnabled: false,
        twoFactorEnabled: false,
        hardwareKeyRequired: false,
        transactionLimits: { ...this.config.defaultTransactionLimits },
        whitelist: { enabled: false, addresses: [], requireApprovalForNew: true },
        autoLockMinutes: this.config.autoLockTimeoutMinutes,
      },
      recoveryConfig: {
        methods: input.recoveryMethods ?? ['seed_phrase'],
      },
      agentIntegration: {
        connectedAgents: [],
        delegationRules: [],
        automatedTransfers: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'wallet_created',
      severity: 'info',
      source: 'wallet-manager',
      userId: input.userId,
      message: `Wallet ${input.name} created successfully`,
      data: { walletId, type: input.type, address },
    });

    return wallet;
  }

  async get(walletId: string): Promise<SmartWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async getByUserId(userId: string): Promise<SmartWallet[]> {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  async update(walletId: string, updates: Partial<SmartWallet>): Promise<SmartWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const updated: SmartWallet = {
      ...wallet,
      ...updates,
      id: wallet.id, // Prevent ID change
      address: wallet.address, // Prevent address change
      userId: wallet.userId, // Prevent user change
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, updated);
    return updated;
  }

  async delete(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // Check for connected agents
    if (wallet.agentIntegration.connectedAgents.length > 0) {
      throw new Error('Cannot delete wallet with connected agents');
    }

    // Check for pending transactions
    const pendingTx = Array.from(this.transactions.values()).filter(
      (tx) => tx.walletId === walletId && tx.status === 'pending'
    );
    if (pendingTx.length > 0) {
      throw new Error('Cannot delete wallet with pending transactions');
    }

    this.wallets.delete(walletId);
  }

  // ============================================================================
  // Balances
  // ============================================================================

  async getBalances(walletId: string): Promise<WalletBalance[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    return wallet.balances;
  }

  async refreshBalances(walletId: string): Promise<WalletBalance[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // In production, this would query the blockchain
    // For now, we simulate some balances
    const balances: WalletBalance[] = [
      {
        asset: 'TON',
        type: 'native',
        amount: 1000,
        amountUsd: 5000,
        decimals: 9,
        metadata: {
          name: 'Toncoin',
          symbol: 'TON',
          verified: true,
        },
      },
      {
        asset: 'USDT',
        type: 'jetton',
        amount: 2500,
        amountUsd: 2500,
        decimals: 6,
        contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        metadata: {
          name: 'Tether USD',
          symbol: 'USDT',
          verified: true,
        },
      },
    ];

    wallet.balances = balances;
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);

    return balances;
  }

  // ============================================================================
  // Transactions
  // ============================================================================

  async transfer(input: TransferInput): Promise<WalletTransaction> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${input.walletId} not found`);
    }

    // Check if wallet is locked
    if (this.lockedWallets.has(input.walletId)) {
      throw new Error('Wallet is locked');
    }

    // Check transaction limits
    const limits = wallet.securityConfig.transactionLimits;
    if (input.amount > limits.singleTransactionLimit) {
      throw new Error(
        `Transaction amount ${input.amount} exceeds single transaction limit ${limits.singleTransactionLimit}`
      );
    }

    // Check whitelist if enabled
    if (wallet.securityConfig.whitelist.enabled) {
      const isWhitelisted = wallet.securityConfig.whitelist.addresses.some(
        (addr) => addr.address === input.to
      );
      if (!isWhitelisted) {
        throw new Error('Recipient address is not whitelisted');
      }
    }

    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const transaction: WalletTransaction = {
      id: txId,
      walletId: input.walletId,
      type: 'transfer',
      status: 'pending',
      from: wallet.address,
      to: input.to,
      amount: input.amount,
      currency: input.currency,
      fee: this.calculateFee(input.amount, input.currency),
      feeCurrency: 'TON',
      metadata: input.metadata ?? {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.transactions.set(txId, transaction);

    // Simulate transaction confirmation
    setTimeout(() => {
      const tx = this.transactions.get(txId);
      if (tx) {
        tx.status = 'confirmed';
        tx.confirmedAt = new Date();
        tx.hash = `0x${Math.random().toString(16).slice(2, 66)}`;
        tx.updatedAt = new Date();
        this.transactions.set(txId, tx);

        this.emitEvent({
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          type: 'transaction_confirmed',
          severity: 'info',
          source: 'wallet-manager',
          userId: wallet.userId,
          message: `Transaction ${txId} confirmed`,
          data: { transactionId: txId, hash: tx.hash },
        });
      }
    }, 2000);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'transaction_sent',
      severity: 'info',
      source: 'wallet-manager',
      userId: wallet.userId,
      message: `Transaction ${txId} sent`,
      data: { transactionId: txId, amount: input.amount, currency: input.currency, to: input.to },
    });

    wallet.lastActivityAt = new Date();
    this.wallets.set(input.walletId, wallet);

    return transaction;
  }

  async getTransactions(walletId: string, limit = 50, offset = 0): Promise<WalletTransaction[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    return Array.from(this.transactions.values())
      .filter((tx) => tx.walletId === walletId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getTransaction(transactionId: string): Promise<WalletTransaction | null> {
    return this.transactions.get(transactionId) ?? null;
  }

  // ============================================================================
  // Security
  // ============================================================================

  async updateSecurityConfig(
    walletId: string,
    config: Partial<WalletSecurityConfig>
  ): Promise<WalletSecurityConfig> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    wallet.securityConfig = {
      ...wallet.securityConfig,
      ...config,
    };
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);

    return wallet.securityConfig;
  }

  async verifyTransaction(_walletId: string, transactionId: string, code: string): Promise<boolean> {
    const tx = this.transactions.get(transactionId);
    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // In production, verify the 2FA code
    if (code.length === 6 && /^\d+$/.test(code)) {
      return true;
    }
    return false;
  }

  async lockWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    this.lockedWallets.add(walletId);
  }

  async unlockWallet(walletId: string, _code: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    // In production, verify the unlock code
    this.lockedWallets.delete(walletId);
  }

  // ============================================================================
  // Recovery
  // ============================================================================

  async addGuardian(input: AddGuardianInput): Promise<Guardian> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${input.walletId} not found`);
    }

    const guardians = wallet.recoveryConfig.socialRecoveryGuardians ?? [];
    if (guardians.length >= this.config.maxGuardiansPerWallet) {
      throw new Error(`Maximum ${this.config.maxGuardiansPerWallet} guardians allowed`);
    }

    const guardian: Guardian = {
      id: `guardian_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: input.name,
      telegramId: input.telegramId,
      address: input.address,
      status: 'pending',
      addedAt: new Date(),
    };

    wallet.recoveryConfig.socialRecoveryGuardians = [...guardians, guardian];
    if (!wallet.recoveryConfig.methods.includes('social_recovery')) {
      wallet.recoveryConfig.methods.push('social_recovery');
    }
    wallet.updatedAt = new Date();
    this.wallets.set(input.walletId, wallet);

    return guardian;
  }

  async removeGuardian(walletId: string, guardianId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const guardians = wallet.recoveryConfig.socialRecoveryGuardians ?? [];
    wallet.recoveryConfig.socialRecoveryGuardians = guardians.filter((g) => g.id !== guardianId);
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);
  }

  async getGuardians(walletId: string): Promise<Guardian[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    return wallet.recoveryConfig.socialRecoveryGuardians ?? [];
  }

  async initiateRecovery(
    walletId: string,
    _method: WalletRecoveryConfig['methods'][number]
  ): Promise<string> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    // In production, initiate the recovery process based on method
    return recoveryId;
  }

  async completeRecovery(
    walletId: string,
    _recoveryId: string,
    proofs: string[]
  ): Promise<boolean> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // In production, verify proofs from guardians or other recovery mechanisms
    const requiredProofs = Math.ceil(
      (wallet.recoveryConfig.socialRecoveryGuardians?.length ?? 0) / 2
    );
    return proofs.length >= requiredProofs;
  }

  // ============================================================================
  // Agent Integration
  // ============================================================================

  async connectAgent(input: ConnectAgentInput): Promise<ConnectedAgent> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${input.walletId} not found`);
    }

    if (wallet.agentIntegration.connectedAgents.length >= this.config.maxAgentsPerWallet) {
      throw new Error(`Maximum ${this.config.maxAgentsPerWallet} agents per wallet`);
    }

    const existingAgent = wallet.agentIntegration.connectedAgents.find(
      (a) => a.agentId === input.agentId
    );
    if (existingAgent) {
      throw new Error(`Agent ${input.agentId} is already connected`);
    }

    const connectedAgent: ConnectedAgent = {
      agentId: input.agentId,
      agentName: input.agentName,
      permissions: input.permissions,
      capitalAllocated: input.capitalAllocated,
      status: 'active',
      connectedAt: new Date(),
    };

    wallet.agentIntegration.connectedAgents.push(connectedAgent);
    wallet.updatedAt = new Date();
    this.wallets.set(input.walletId, wallet);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'wallet_connected',
      severity: 'info',
      source: 'wallet-manager',
      userId: wallet.userId,
      message: `Agent ${input.agentName} connected to wallet`,
      data: { walletId: input.walletId, agentId: input.agentId, capitalAllocated: input.capitalAllocated },
    });

    return connectedAgent;
  }

  async disconnectAgent(walletId: string, agentId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    wallet.agentIntegration.connectedAgents = wallet.agentIntegration.connectedAgents.filter(
      (a) => a.agentId !== agentId
    );
    wallet.agentIntegration.delegationRules = wallet.agentIntegration.delegationRules.filter(
      (r) => r.agentId !== agentId
    );
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);
  }

  async getConnectedAgents(walletId: string): Promise<ConnectedAgent[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    return wallet.agentIntegration.connectedAgents;
  }

  async updateAgentPermissions(
    walletId: string,
    agentId: string,
    permissions: AgentWalletPermission[]
  ): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const agent = wallet.agentIntegration.connectedAgents.find((a) => a.agentId === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not connected to this wallet`);
    }

    agent.permissions = permissions;
    wallet.updatedAt = new Date();
    this.wallets.set(walletId, wallet);
  }

  // ============================================================================
  // Delegation Rules
  // ============================================================================

  async createDelegationRule(input: CreateDelegationRuleInput): Promise<DelegationRule> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${input.walletId} not found`);
    }

    const agent = wallet.agentIntegration.connectedAgents.find((a) => a.agentId === input.agentId);
    if (!agent) {
      throw new Error(`Agent ${input.agentId} is not connected to this wallet`);
    }

    const rule: DelegationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      agentId: input.agentId,
      action: input.action,
      conditions: input.conditions,
      maxAmount: input.maxAmount,
      enabled: true,
      expiresAt: input.expiresAt,
    };

    this.delegationRules.set(rule.id, rule);
    wallet.agentIntegration.delegationRules.push(rule);
    wallet.updatedAt = new Date();
    this.wallets.set(input.walletId, wallet);

    return rule;
  }

  async getDelegationRules(walletId: string): Promise<DelegationRule[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    return wallet.agentIntegration.delegationRules;
  }

  async updateDelegationRule(ruleId: string, updates: Partial<DelegationRule>): Promise<DelegationRule> {
    const rule = this.delegationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Delegation rule ${ruleId} not found`);
    }

    const updated: DelegationRule = {
      ...rule,
      ...updates,
      id: rule.id, // Prevent ID change
      agentId: rule.agentId, // Prevent agent change
    };

    this.delegationRules.set(ruleId, updated);
    return updated;
  }

  async deleteDelegationRule(ruleId: string): Promise<void> {
    this.delegationRules.delete(ruleId);

    // Remove from wallets
    for (const wallet of this.wallets.values()) {
      wallet.agentIntegration.delegationRules = wallet.agentIntegration.delegationRules.filter(
        (r) => r.id !== ruleId
      );
    }
  }

  // ============================================================================
  // Automated Transfers
  // ============================================================================

  async createAutomatedTransfer(input: CreateAutomatedTransferInput): Promise<AutomatedTransfer> {
    const wallet = this.wallets.get(input.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${input.walletId} not found`);
    }

    if (wallet.agentIntegration.automatedTransfers.length >= this.config.maxAutomatedTransfers) {
      throw new Error(`Maximum ${this.config.maxAutomatedTransfers} automated transfers per wallet`);
    }

    const transfer: AutomatedTransfer = {
      id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: input.name,
      from: wallet.address,
      to: input.to,
      amount: input.amount,
      currency: input.currency,
      schedule: input.schedule,
      enabled: true,
      nextExecutionAt: this.calculateNextExecution(input.schedule),
    };

    this.automatedTransfers.set(transfer.id, transfer);
    wallet.agentIntegration.automatedTransfers.push(transfer);
    wallet.updatedAt = new Date();
    this.wallets.set(input.walletId, wallet);

    return transfer;
  }

  async getAutomatedTransfers(walletId: string): Promise<AutomatedTransfer[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    return wallet.agentIntegration.automatedTransfers;
  }

  async updateAutomatedTransfer(
    transferId: string,
    updates: Partial<AutomatedTransfer>
  ): Promise<AutomatedTransfer> {
    const transfer = this.automatedTransfers.get(transferId);
    if (!transfer) {
      throw new Error(`Automated transfer ${transferId} not found`);
    }

    const updated: AutomatedTransfer = {
      ...transfer,
      ...updates,
      id: transfer.id, // Prevent ID change
    };

    if (updates.schedule) {
      updated.nextExecutionAt = this.calculateNextExecution(updates.schedule);
    }

    this.automatedTransfers.set(transferId, updated);
    return updated;
  }

  async deleteAutomatedTransfer(transferId: string): Promise<void> {
    this.automatedTransfers.delete(transferId);

    // Remove from wallets
    for (const wallet of this.wallets.values()) {
      wallet.agentIntegration.automatedTransfers = wallet.agentIntegration.automatedTransfers.filter(
        (t) => t.id !== transferId
      );
    }
  }

  async executeAutomatedTransfer(transferId: string): Promise<WalletTransaction> {
    const transfer = this.automatedTransfers.get(transferId);
    if (!transfer) {
      throw new Error(`Automated transfer ${transferId} not found`);
    }

    // Find the wallet
    let walletId: string | null = null;
    for (const [id, wallet] of this.wallets.entries()) {
      if (wallet.address === transfer.from) {
        walletId = id;
        break;
      }
    }

    if (!walletId) {
      throw new Error('Wallet not found for automated transfer');
    }

    const tx = await this.transfer({
      walletId,
      to: transfer.to,
      amount: transfer.amount,
      currency: transfer.currency,
      metadata: {
        description: `Automated transfer: ${transfer.name}`,
        category: 'automated',
      },
    });

    transfer.lastExecutedAt = new Date();
    transfer.nextExecutionAt = this.calculateNextExecution(transfer.schedule);
    this.automatedTransfers.set(transferId, transfer);

    return tx;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateAddress(type: WalletType): string {
    const prefix = type === 'multisig' ? 'EQC' : type === 'smart_contract' ? 'EQD' : 'EQB';
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = prefix;
    for (let i = 0; i < 45; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private calculateFee(amount: number, _currency: string): number {
    // Simple fee calculation (0.01 TON base + 0.001% of amount)
    return 0.01 + amount * 0.00001;
  }

  private calculateNextExecution(schedule: TransferSchedule): Date {
    const now = new Date();

    switch (schedule.frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        const nextDaily = new Date(now);
        nextDaily.setDate(nextDaily.getDate() + 1);
        if (schedule.hour !== undefined) {
          nextDaily.setHours(schedule.hour, 0, 0, 0);
        }
        return nextDaily;
      case 'weekly':
        const nextWeekly = new Date(now);
        const daysUntilNext = (7 - now.getDay() + (schedule.dayOfWeek ?? 1)) % 7 || 7;
        nextWeekly.setDate(nextWeekly.getDate() + daysUntilNext);
        if (schedule.hour !== undefined) {
          nextWeekly.setHours(schedule.hour, 0, 0, 0);
        }
        return nextWeekly;
      case 'monthly':
        const nextMonthly = new Date(now);
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        if (schedule.dayOfMonth !== undefined) {
          nextMonthly.setDate(schedule.dayOfMonth);
        }
        if (schedule.hour !== undefined) {
          nextMonthly.setHours(schedule.hour, 0, 0, 0);
        }
        return nextMonthly;
      case 'on_condition':
        // For condition-based transfers, next execution depends on condition evaluation
        return new Date(now.getTime() + 60 * 60 * 1000); // Check every hour
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createWalletManager(config?: Partial<WalletManagerConfig>): DefaultWalletManager {
  return new DefaultWalletManager(config);
}

export default DefaultWalletManager;
