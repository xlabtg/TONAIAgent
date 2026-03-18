/**
 * TONAIAgent - Custody Models
 *
 * Implements three custody models:
 * 1. Non-Custodial - User controls all keys, platform has no access
 * 2. Smart Contract Wallet - On-chain permissions with agent limited access
 * 3. MPC Custody - Distributed key management with threshold signing
 *
 * Each model provides different trade-offs between security and automation.
 */

import {
  CustodyMode,
  CustodyConfig,
  AgentPermissions,
  TransactionRequest,
  SecurityEvent,
  SecurityEventCallback,
} from './types';
import { SecureKeyManager, createKeyManager } from './key-management';

// ============================================================================
// Interfaces
// ============================================================================

export interface CustodyProvider {
  readonly mode: CustodyMode;
  readonly config: CustodyConfig;

  // Wallet operations
  createWallet(userId: string, agentId: string): Promise<CustodyWallet>;
  getWallet(walletId: string): Promise<CustodyWallet | null>;
  listWallets(userId: string): Promise<CustodyWallet[]>;

  // Transaction operations
  prepareTransaction(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): Promise<PreparedTransaction>;
  signTransaction(
    prepared: PreparedTransaction,
    approval?: TransactionApproval
  ): Promise<SignedTransaction>;

  // Permission operations
  updatePermissions(
    wallet: CustodyWallet,
    permissions: Partial<AgentPermissions>
  ): Promise<void>;
  revokeAgentAccess(wallet: CustodyWallet, agentId: string): Promise<void>;

  // Recovery operations
  initiateRecovery(wallet: CustodyWallet): Promise<RecoverySession>;
  completeRecovery(session: RecoverySession): Promise<CustodyWallet>;

  // Health check
  getHealth(): Promise<CustodyHealth>;
}

export interface CustodyWallet {
  id: string;
  userId: string;
  agentId?: string;
  address: string;
  custodyMode: CustodyMode;
  keyId: string;
  permissions: WalletPermissions;
  status: WalletStatus;
  createdAt: Date;
  lastActivity?: Date;
}

export type WalletStatus = 'active' | 'pending' | 'locked' | 'recovering' | 'archived';

export interface WalletPermissions {
  agentCanSign: boolean;
  requireUserApproval: boolean;
  requireMultiSig: boolean;
  maxTransactionAmount: number;
  dailyLimit: number;
  allowedOperations: string[];
  allowedTokens: string[];
  allowedProtocols: string[];
  whitelistedAddresses: string[];
}

export interface PreparedTransaction {
  id: string;
  walletId: string;
  request: TransactionRequest;
  serializedMessage: string;
  messageHash: string;
  estimatedFee: number;
  simulation?: TransactionSimulation;
  requiresApproval: boolean;
  approvalType?: 'user_confirmation' | 'multi_sig' | 'timeout';
  expiresAt: Date;
  status: 'prepared' | 'approved' | 'rejected' | 'expired';
}

export interface TransactionSimulation {
  success: boolean;
  gasEstimate: number;
  balanceChanges: Array<{
    token: string;
    amount: string;
    direction: 'in' | 'out';
  }>;
  warnings: string[];
  errors: string[];
}

export interface TransactionApproval {
  type: 'user_signature' | 'timeout' | 'multi_sig';
  signature?: string;
  signatures?: string[];
  approvedAt: Date;
  approvedBy: string;
}

export interface SignedTransaction {
  id: string;
  preparedId: string;
  walletId: string;
  signedMessage: string;
  signature: string;
  publicKey: string;
  readyToBroadcast: boolean;
  broadcastedAt?: Date;
  confirmedAt?: Date;
  txHash?: string;
}

export interface RecoverySession {
  id: string;
  walletId: string;
  userId: string;
  status: 'initiated' | 'verifying' | 'executing' | 'completed' | 'failed';
  verificationSteps: RecoveryVerificationStep[];
  newKeyId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface RecoveryVerificationStep {
  type: 'email' | 'sms' | 'guardian' | 'recovery_phrase' | 'biometric';
  required: boolean;
  completed: boolean;
  completedAt?: Date;
}

export interface CustodyHealth {
  mode: CustodyMode;
  available: boolean;
  walletsCount: number;
  activeWalletsCount: number;
  pendingTransactions: number;
  lastHealthCheck: Date;
}

// ============================================================================
// Non-Custodial Custody Provider
// ============================================================================

/**
 * Non-Custodial mode: User controls all keys.
 * Platform NEVER has access to private keys.
 * Every transaction requires explicit user approval.
 */
export class NonCustodialProvider implements CustodyProvider {
  readonly mode: CustodyMode = 'non_custodial';
  readonly config: CustodyConfig = {
    mode: 'non_custodial',
    userOwned: true,
    platformManaged: false,
    recoveryEnabled: false, // User is responsible for backup
  };

  private readonly wallets = new Map<string, CustodyWallet>();
  private readonly preparedTxs = new Map<string, PreparedTransaction>();
  private readonly signedTxs = new Map<string, SignedTransaction>();
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  async createWallet(userId: string, agentId: string): Promise<CustodyWallet> {
    const walletId = `wallet_nc_${userId}_${Date.now()}`;

    // In non-custodial mode, we DON'T generate keys
    // The user generates keys in their own wallet app
    const wallet: CustodyWallet = {
      id: walletId,
      userId,
      agentId,
      address: '', // Will be set when user connects their wallet
      custodyMode: 'non_custodial',
      keyId: '', // User controls their own keys
      permissions: this.getDefaultPermissions(),
      status: 'pending', // Pending until user connects wallet
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'custody',
      message: `Non-custodial wallet created for user ${userId}`,
      data: { walletId, userId, mode: 'non_custodial' },
    });

    return wallet;
  }

  async getWallet(walletId: string): Promise<CustodyWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async listWallets(userId: string): Promise<CustodyWallet[]> {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  async prepareTransaction(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): Promise<PreparedTransaction> {
    const preparedId = `prep_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Serialize the transaction for signing
    const serializedMessage = this.serializeTransaction(request);
    const messageHash = Buffer.from(serializedMessage).toString('base64');

    // Non-custodial ALWAYS requires user approval
    const prepared: PreparedTransaction = {
      id: preparedId,
      walletId: wallet.id,
      request,
      serializedMessage,
      messageHash,
      estimatedFee: 0.05, // Estimate in TON
      requiresApproval: true,
      approvalType: 'user_confirmation',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      status: 'prepared',
    };

    this.preparedTxs.set(preparedId, prepared);
    return prepared;
  }

  async signTransaction(
    prepared: PreparedTransaction,
    approval?: TransactionApproval
  ): Promise<SignedTransaction> {
    if (!approval || approval.type !== 'user_signature') {
      throw new Error('Non-custodial transactions require user signature');
    }

    if (!approval.signature) {
      throw new Error('User signature is required');
    }

    const signedId = `signed_${Date.now()}`;

    const signed: SignedTransaction = {
      id: signedId,
      preparedId: prepared.id,
      walletId: prepared.walletId,
      signedMessage: prepared.serializedMessage,
      signature: approval.signature,
      publicKey: '', // User's public key from their wallet
      readyToBroadcast: true,
    };

    prepared.status = 'approved';
    this.preparedTxs.set(prepared.id, prepared);
    this.signedTxs.set(signedId, signed);

    return signed;
  }

  async updatePermissions(
    wallet: CustodyWallet,
    _permissions: Partial<AgentPermissions>
  ): Promise<void> {
    // In non-custodial mode, permissions are advisory only
    // The user's wallet enforces actual limits
    const existingWallet = this.wallets.get(wallet.id);
    if (existingWallet) {
      // Update advisory permissions
      this.wallets.set(wallet.id, existingWallet);
    }
  }

  async revokeAgentAccess(wallet: CustodyWallet, agentId: string): Promise<void> {
    // In non-custodial mode, revocation is instant since agent never had keys
    const existingWallet = this.wallets.get(wallet.id);
    if (existingWallet && existingWallet.agentId === agentId) {
      existingWallet.agentId = undefined;
      existingWallet.status = 'locked';
      this.wallets.set(wallet.id, existingWallet);
    }
  }

  async initiateRecovery(_wallet: CustodyWallet): Promise<RecoverySession> {
    throw new Error(
      'Recovery not supported in non-custodial mode. User must use their own wallet recovery.'
    );
  }

  async completeRecovery(_session: RecoverySession): Promise<CustodyWallet> {
    throw new Error('Recovery not supported in non-custodial mode.');
  }

  async getHealth(): Promise<CustodyHealth> {
    const allWallets = Array.from(this.wallets.values());
    const activeWallets = allWallets.filter((w) => w.status === 'active');
    const pendingTxs = Array.from(this.preparedTxs.values()).filter(
      (t) => t.status === 'prepared'
    );

    return {
      mode: 'non_custodial',
      available: true,
      walletsCount: allWallets.length,
      activeWalletsCount: activeWallets.length,
      pendingTransactions: pendingTxs.length,
      lastHealthCheck: new Date(),
    };
  }

  private getDefaultPermissions(): WalletPermissions {
    return {
      agentCanSign: false, // Agent NEVER signs in non-custodial
      requireUserApproval: true,
      requireMultiSig: false,
      maxTransactionAmount: 0, // Unlimited (user decides)
      dailyLimit: 0,
      allowedOperations: ['swap', 'transfer', 'stake'],
      allowedTokens: ['*'], // All tokens allowed
      allowedProtocols: ['*'], // All protocols allowed
      whitelistedAddresses: [],
    };
  }

  private serializeTransaction(request: TransactionRequest): string {
    // Serialize transaction for signing
    return JSON.stringify({
      type: request.type,
      destination: request.destination?.address,
      amount: request.amount?.amount,
      token: request.amount?.token,
      timestamp: Date.now(),
    });
  }

  private emitEvent(event: SecurityEvent): void {
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
// Smart Contract Wallet Custody Provider
// ============================================================================

/**
 * Smart Contract Wallet mode: On-chain enforced permissions.
 * User is primary owner, agent has limited permissions defined on-chain.
 * Limits cannot be bypassed since they're enforced by the contract.
 */
export class SmartContractWalletProvider implements CustodyProvider {
  readonly mode: CustodyMode = 'smart_contract_wallet';
  readonly config: CustodyConfig = {
    mode: 'smart_contract_wallet',
    userOwned: true,
    platformManaged: false,
    recoveryEnabled: true, // Social recovery supported
  };

  private readonly wallets = new Map<string, CustodyWallet>();
  private readonly preparedTxs = new Map<string, PreparedTransaction>();
  private readonly signedTxs = new Map<string, SignedTransaction>();
  private readonly agentKeys = new Map<string, string>(); // walletId -> agentKeyId
  private readonly keyManager: SecureKeyManager;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor() {
    this.keyManager = createKeyManager();
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  async createWallet(userId: string, agentId: string): Promise<CustodyWallet> {
    const walletId = `wallet_scw_${userId}_${Date.now()}`;

    // Generate a limited agent key for this wallet
    const agentKey = await this.keyManager.generateKey(agentId, 'signing', {
      algorithm: 'ed25519',
      storageType: 'software',
    });

    this.agentKeys.set(walletId, agentKey.id);

    const agentAddress = await this.keyManager.getAddress(agentKey.id);

    const wallet: CustodyWallet = {
      id: walletId,
      userId,
      agentId,
      address: agentAddress ?? '',
      custodyMode: 'smart_contract_wallet',
      keyId: agentKey.id,
      permissions: this.getDefaultPermissions(),
      status: 'pending', // Pending until smart contract is deployed
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'custody',
      message: `Smart contract wallet created for user ${userId}`,
      data: { walletId, userId, agentId, mode: 'smart_contract_wallet' },
    });

    return wallet;
  }

  async getWallet(walletId: string): Promise<CustodyWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async listWallets(userId: string): Promise<CustodyWallet[]> {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  async prepareTransaction(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): Promise<PreparedTransaction> {
    const preparedId = `prep_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Check if transaction is within on-chain limits
    const withinLimits = this.checkOnChainLimits(wallet, request);

    // Simulate transaction
    const simulation = this.simulateTransaction(request);

    const serializedMessage = this.serializeSmartContractCall(wallet, request);
    const messageHash = Buffer.from(serializedMessage).toString('base64');

    const prepared: PreparedTransaction = {
      id: preparedId,
      walletId: wallet.id,
      request,
      serializedMessage,
      messageHash,
      estimatedFee: simulation.gasEstimate * 0.001, // Estimate in TON
      simulation,
      requiresApproval: !withinLimits,
      approvalType: withinLimits ? undefined : 'user_confirmation',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'prepared',
    };

    this.preparedTxs.set(preparedId, prepared);
    return prepared;
  }

  async signTransaction(
    prepared: PreparedTransaction,
    approval?: TransactionApproval
  ): Promise<SignedTransaction> {
    if (prepared.requiresApproval && !approval) {
      throw new Error('User approval required for this transaction');
    }

    const wallet = this.wallets.get(prepared.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const agentKeyId = this.agentKeys.get(wallet.id);
    if (!agentKeyId) {
      throw new Error('Agent key not found');
    }

    // Create signing request
    const signingRequest = await this.keyManager.createSigningRequest(
      agentKeyId,
      prepared.serializedMessage,
      { transactionId: prepared.request.id }
    );

    const signedId = `signed_${Date.now()}`;
    const publicKey = await this.keyManager.getPublicKey(agentKeyId);

    const signed: SignedTransaction = {
      id: signedId,
      preparedId: prepared.id,
      walletId: prepared.walletId,
      signedMessage: prepared.serializedMessage,
      signature: signingRequest.id, // In production, this would be actual signature
      publicKey: publicKey ?? '',
      readyToBroadcast: true,
    };

    prepared.status = 'approved';
    this.preparedTxs.set(prepared.id, prepared);
    this.signedTxs.set(signedId, signed);

    return signed;
  }

  async updatePermissions(
    wallet: CustodyWallet,
    permissions: Partial<AgentPermissions>
  ): Promise<void> {
    const existingWallet = this.wallets.get(wallet.id);
    if (!existingWallet) {
      throw new Error('Wallet not found');
    }

    // In SCW mode, this would update the on-chain contract
    // For now, update local state
    if (permissions.capabilities?.trading) {
      existingWallet.permissions.allowedOperations = permissions.capabilities.trading.allowedOperations || [];
    }

    if (permissions.accessControl?.allowedTokens) {
      existingWallet.permissions.allowedTokens = permissions.accessControl.allowedTokens.map(
        (t) => t.symbol
      );
    }

    this.wallets.set(wallet.id, existingWallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'medium',
      source: 'custody',
      message: `Permissions updated for wallet ${wallet.id}`,
      data: { walletId: wallet.id, permissions },
    });
  }

  async revokeAgentAccess(wallet: CustodyWallet, agentId: string): Promise<void> {
    const existingWallet = this.wallets.get(wallet.id);
    if (!existingWallet) {
      throw new Error('Wallet not found');
    }

    // Revoke agent key
    const agentKeyId = this.agentKeys.get(wallet.id);
    if (agentKeyId) {
      await this.keyManager.revokeKey(agentKeyId, 'Agent access revoked');
      this.agentKeys.delete(wallet.id);
    }

    existingWallet.agentId = undefined;
    existingWallet.permissions.agentCanSign = false;
    this.wallets.set(wallet.id, existingWallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'high',
      source: 'custody',
      message: `Agent access revoked for wallet ${wallet.id}`,
      data: { walletId: wallet.id, agentId },
    });
  }

  async initiateRecovery(wallet: CustodyWallet): Promise<RecoverySession> {
    const sessionId = `recovery_${Date.now()}`;

    const session: RecoverySession = {
      id: sessionId,
      walletId: wallet.id,
      userId: wallet.userId,
      status: 'initiated',
      verificationSteps: [
        { type: 'email', required: true, completed: false },
        { type: 'guardian', required: true, completed: false },
      ],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Update wallet status
    const existingWallet = this.wallets.get(wallet.id);
    if (existingWallet) {
      existingWallet.status = 'recovering';
      this.wallets.set(wallet.id, existingWallet);
    }

    return session;
  }

  async completeRecovery(session: RecoverySession): Promise<CustodyWallet> {
    const wallet = this.wallets.get(session.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify all required steps are completed
    const allVerified = session.verificationSteps
      .filter((s) => s.required)
      .every((s) => s.completed);

    if (!allVerified) {
      throw new Error('Not all verification steps are completed');
    }

    // Generate new key
    const newKey = await this.keyManager.generateKey(wallet.userId, 'signing');
    wallet.keyId = newKey.id;
    wallet.status = 'active';
    wallet.address = (await this.keyManager.getAddress(newKey.id)) ?? wallet.address;

    this.wallets.set(wallet.id, wallet);

    return wallet;
  }

  async getHealth(): Promise<CustodyHealth> {
    const allWallets = Array.from(this.wallets.values());
    const activeWallets = allWallets.filter((w) => w.status === 'active');
    const pendingTxs = Array.from(this.preparedTxs.values()).filter(
      (t) => t.status === 'prepared'
    );

    return {
      mode: 'smart_contract_wallet',
      available: true,
      walletsCount: allWallets.length,
      activeWalletsCount: activeWallets.length,
      pendingTransactions: pendingTxs.length,
      lastHealthCheck: new Date(),
    };
  }

  private getDefaultPermissions(): WalletPermissions {
    return {
      agentCanSign: true, // Agent can sign within limits
      requireUserApproval: false, // Not required within limits
      requireMultiSig: false,
      maxTransactionAmount: 100, // 100 TON per transaction
      dailyLimit: 500, // 500 TON daily limit
      allowedOperations: ['swap', 'transfer'],
      allowedTokens: ['TON', 'USDT'],
      allowedProtocols: ['dedust', 'stonfi'],
      whitelistedAddresses: [],
    };
  }

  private checkOnChainLimits(wallet: CustodyWallet, request: TransactionRequest): boolean {
    const valueTon = request.amount?.valueTon ?? 0;

    // Check single transaction limit
    if (valueTon > wallet.permissions.maxTransactionAmount) {
      return false;
    }

    // Check operation is allowed
    if (!wallet.permissions.allowedOperations.includes(request.type)) {
      return false;
    }

    // Check token is allowed
    const tokenSymbol = request.amount?.symbol ?? 'TON';
    if (
      !wallet.permissions.allowedTokens.includes('*') &&
      !wallet.permissions.allowedTokens.includes(tokenSymbol)
    ) {
      return false;
    }

    return true;
  }

  private simulateTransaction(request: TransactionRequest): TransactionSimulation {
    return {
      success: true,
      gasEstimate: 50000,
      balanceChanges: request.amount
        ? [
            {
              token: request.amount.symbol,
              amount: request.amount.amount,
              direction: 'out',
            },
          ]
        : [],
      warnings: [],
      errors: [],
    };
  }

  private serializeSmartContractCall(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): string {
    return JSON.stringify({
      wallet: wallet.address,
      type: request.type,
      destination: request.destination?.address,
      amount: request.amount?.amount,
      token: request.amount?.token,
      timestamp: Date.now(),
    });
  }

  private emitEvent(event: SecurityEvent): void {
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
// MPC Custody Provider
// ============================================================================

/**
 * MPC Custody mode: Distributed key management.
 * Keys are split across user, platform, and recovery service.
 * Signing requires threshold (2-of-3) cooperation.
 * Full automation with maximum security.
 */
export class MPCCustodyProvider implements CustodyProvider {
  readonly mode: CustodyMode = 'mpc';
  readonly config: CustodyConfig = {
    mode: 'mpc',
    userOwned: true,
    platformManaged: true, // Platform holds one share
    recoveryEnabled: true,
  };

  private readonly wallets = new Map<string, CustodyWallet>();
  private readonly preparedTxs = new Map<string, PreparedTransaction>();
  private readonly signedTxs = new Map<string, SignedTransaction>();
  private readonly keyManager: SecureKeyManager;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor() {
    this.keyManager = createKeyManager({
      mpc: {
        threshold: 2,
        totalShares: 3,
        recoveryEnabled: true,
      },
    });
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  async createWallet(userId: string, agentId: string): Promise<CustodyWallet> {
    const walletId = `wallet_mpc_${userId}_${Date.now()}`;

    // Generate MPC key with distributed shares
    const masterKey = await this.keyManager.generateKey(userId, 'master', {
      algorithm: 'ed25519',
      mpcEnabled: true,
      mpcConfig: {
        threshold: 2,
        totalShares: 3,
        recoveryEnabled: true,
        recoveryThreshold: 2,
        keyDerivationEnabled: true,
      },
    });

    const walletAddress = await this.keyManager.getAddress(masterKey.id);

    const wallet: CustodyWallet = {
      id: walletId,
      userId,
      agentId,
      address: walletAddress ?? '',
      custodyMode: 'mpc',
      keyId: masterKey.id,
      permissions: this.getDefaultPermissions(),
      status: 'active', // Active immediately in MPC mode
      createdAt: new Date(),
    };

    this.wallets.set(walletId, wallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'key_generated',
      severity: 'low',
      source: 'custody',
      message: `MPC wallet created for user ${userId}`,
      data: { walletId, userId, agentId, mode: 'mpc' },
    });

    return wallet;
  }

  async getWallet(walletId: string): Promise<CustodyWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async listWallets(userId: string): Promise<CustodyWallet[]> {
    return Array.from(this.wallets.values()).filter((w) => w.userId === userId);
  }

  async prepareTransaction(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): Promise<PreparedTransaction> {
    const preparedId = `prep_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const valueTon = request.amount?.valueTon ?? 0;
    const requiresUserApproval = valueTon > wallet.permissions.maxTransactionAmount;
    const requiresMultiSig =
      valueTon > wallet.permissions.maxTransactionAmount * 10;

    const simulation = this.simulateTransaction(request);
    const serializedMessage = this.serializeMPCMessage(wallet, request);
    const messageHash = Buffer.from(serializedMessage).toString('base64');

    const prepared: PreparedTransaction = {
      id: preparedId,
      walletId: wallet.id,
      request,
      serializedMessage,
      messageHash,
      estimatedFee: simulation.gasEstimate * 0.001,
      simulation,
      requiresApproval: requiresUserApproval,
      approvalType: requiresMultiSig
        ? 'multi_sig'
        : requiresUserApproval
        ? 'user_confirmation'
        : undefined,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'prepared',
    };

    this.preparedTxs.set(preparedId, prepared);
    return prepared;
  }

  async signTransaction(
    prepared: PreparedTransaction,
    approval?: TransactionApproval
  ): Promise<SignedTransaction> {
    if (prepared.requiresApproval && !approval) {
      throw new Error('Approval required for this transaction');
    }

    const wallet = this.wallets.get(prepared.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Create MPC signing request
    const signingRequest = await this.keyManager.createSigningRequest(
      wallet.keyId,
      prepared.serializedMessage,
      {
        transactionId: prepared.request.id,
        requiresThreshold: true,
      }
    );

    // In production, this would coordinate with MPC parties
    // For now, simulate MPC signing
    const mpcStatus = await this.keyManager.getMPCSharesStatus(wallet.keyId);

    if (!mpcStatus.canSign) {
      throw new Error('Insufficient MPC shares available for signing');
    }

    const signedId = `signed_${Date.now()}`;
    const publicKey = await this.keyManager.getPublicKey(wallet.keyId);

    const signed: SignedTransaction = {
      id: signedId,
      preparedId: prepared.id,
      walletId: prepared.walletId,
      signedMessage: prepared.serializedMessage,
      signature: `mpc_${signingRequest.id}`,
      publicKey: publicKey ?? '',
      readyToBroadcast: true,
    };

    prepared.status = 'approved';
    this.preparedTxs.set(prepared.id, prepared);
    this.signedTxs.set(signedId, signed);

    return signed;
  }

  async updatePermissions(
    wallet: CustodyWallet,
    permissions: Partial<AgentPermissions>
  ): Promise<void> {
    const existingWallet = this.wallets.get(wallet.id);
    if (!existingWallet) {
      throw new Error('Wallet not found');
    }

    // Update permissions
    if (permissions.accessControl?.allowedTokens) {
      existingWallet.permissions.allowedTokens = permissions.accessControl.allowedTokens.map(
        (t) => t.symbol
      );
    }

    if (permissions.capabilities?.transfers) {
      existingWallet.permissions.maxTransactionAmount =
        permissions.capabilities.transfers.maxSingleTransfer;
    }

    this.wallets.set(wallet.id, existingWallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'medium',
      source: 'custody',
      message: `Permissions updated for MPC wallet ${wallet.id}`,
      data: { walletId: wallet.id, permissions },
    });
  }

  async revokeAgentAccess(wallet: CustodyWallet, agentId: string): Promise<void> {
    const existingWallet = this.wallets.get(wallet.id);
    if (!existingWallet) {
      throw new Error('Wallet not found');
    }

    // In MPC mode, revocation requires key rotation
    // The platform share is rotated to prevent the agent from signing
    const newKey = await this.keyManager.rotateKey(wallet.keyId);
    existingWallet.keyId = newKey.id;
    existingWallet.agentId = undefined;

    this.wallets.set(wallet.id, existingWallet);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'permission_changed',
      severity: 'high',
      source: 'custody',
      message: `Agent access revoked for MPC wallet ${wallet.id}`,
      data: { walletId: wallet.id, agentId, newKeyId: newKey.id },
    });
  }

  async initiateRecovery(wallet: CustodyWallet): Promise<RecoverySession> {
    const sessionId = `recovery_${Date.now()}`;

    const session: RecoverySession = {
      id: sessionId,
      walletId: wallet.id,
      userId: wallet.userId,
      status: 'initiated',
      verificationSteps: [
        { type: 'email', required: true, completed: false },
        { type: 'recovery_phrase', required: false, completed: false },
      ],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const existingWallet = this.wallets.get(wallet.id);
    if (existingWallet) {
      existingWallet.status = 'recovering';
      this.wallets.set(wallet.id, existingWallet);
    }

    return session;
  }

  async completeRecovery(session: RecoverySession): Promise<CustodyWallet> {
    const wallet = this.wallets.get(session.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Use user + recovery service shares to recover
    // Generate new platform share
    const newKey = await this.keyManager.rotateKey(wallet.keyId);
    wallet.keyId = newKey.id;
    wallet.status = 'active';

    this.wallets.set(wallet.id, wallet);

    return wallet;
  }

  async getHealth(): Promise<CustodyHealth> {
    const allWallets = Array.from(this.wallets.values());
    const activeWallets = allWallets.filter((w) => w.status === 'active');
    const pendingTxs = Array.from(this.preparedTxs.values()).filter(
      (t) => t.status === 'prepared'
    );

    const keyManagerHealth = await this.keyManager.getHealth();

    return {
      mode: 'mpc',
      available: keyManagerHealth.available,
      walletsCount: allWallets.length,
      activeWalletsCount: activeWallets.length,
      pendingTransactions: pendingTxs.length,
      lastHealthCheck: new Date(),
    };
  }

  private getDefaultPermissions(): WalletPermissions {
    return {
      agentCanSign: true,
      requireUserApproval: false, // Within limits
      requireMultiSig: false,
      maxTransactionAmount: 1000, // Higher limits in MPC
      dailyLimit: 5000,
      allowedOperations: ['swap', 'transfer', 'stake', 'unstake'],
      allowedTokens: ['*'],
      allowedProtocols: ['*'],
      whitelistedAddresses: [],
    };
  }

  private simulateTransaction(request: TransactionRequest): TransactionSimulation {
    return {
      success: true,
      gasEstimate: 50000,
      balanceChanges: request.amount
        ? [
            {
              token: request.amount.symbol,
              amount: request.amount.amount,
              direction: 'out',
            },
          ]
        : [],
      warnings: [],
      errors: [],
    };
  }

  private serializeMPCMessage(
    wallet: CustodyWallet,
    request: TransactionRequest
  ): string {
    return JSON.stringify({
      wallet: wallet.address,
      type: request.type,
      destination: request.destination?.address,
      amount: request.amount?.amount,
      token: request.amount?.token,
      nonce: Date.now(),
      mpcKeyId: wallet.keyId,
    });
  }

  private emitEvent(event: SecurityEvent): void {
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
// Factory Functions
// ============================================================================

export function createCustodyProvider(mode: CustodyMode): CustodyProvider {
  switch (mode) {
    case 'non_custodial':
      return new NonCustodialProvider();
    case 'smart_contract_wallet':
      return new SmartContractWalletProvider();
    case 'mpc':
      return new MPCCustodyProvider();
    default:
      throw new Error(`Unknown custody mode: ${mode}`);
  }
}
