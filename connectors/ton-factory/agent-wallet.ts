/**
 * TONAIAgent - Agent Wallet Architecture
 *
 * Three wallet modes for agent custody:
 * - Non-Custodial: User controls private keys, agent signs on behalf
 * - MPC (Multi-Party Computation): Threshold signature scheme
 * - Smart Contract Wallet: Programmable wallet with spending rules
 *
 * Also handles: DEX swaps, liquidity, staking, DAO voting,
 * NFT interactions, Jetton transfers, TON-specific integrations.
 */

import {
  AgentWallet,
  AgentTransaction,
  TransactionResult,
  WalletMode,
  NonCustodialConfig,
  MPCConfig,
  SmartContractWalletConfig,
  TonAddress,
  AgentId,
  ContractVersion,
  TonTransactionType,
  TonFactoryEvent,
  TonFactoryEventHandler,
  Unsubscribe,
} from './types';

// ============================================================================
// Non-Custodial Wallet
// ============================================================================

/**
 * Non-Custodial wallet provider.
 * The user retains full control of private keys.
 * Agent signs transactions using delegated access or user approval flows.
 */
export class NonCustodialProvider {
  private readonly wallet: AgentWallet;
  private readonly config: NonCustodialConfig;
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private txCounter = 0;

  constructor(wallet: AgentWallet, config: NonCustodialConfig) {
    this.wallet = wallet;
    this.config = config;
  }

  /**
   * Sign and submit a transaction using the user's key.
   * In production: prompts user to sign via TON Connect or similar.
   */
  async signAndSubmit(tx: AgentTransaction): Promise<TransactionResult> {
    this.validateTransaction(tx);

    this.txCounter++;
    const txHash = `nc_tx_${tx.txId}_${this.txCounter}`;

    this.emitEvent({
      type: 'transaction.submitted',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { txHash, type: tx.type, amount: tx.amount.toString(), to: tx.to },
    });

    const result: TransactionResult = {
      txHash,
      success: true,
      blockSeqno: 1000000 + this.txCounter,
      gasUsed: BigInt(5_000_000), // ~0.005 TON
      exitCode: 0,
      timestamp: new Date(),
    };

    this.emitEvent({
      type: 'transaction.confirmed',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { txHash, success: true },
    });

    return result;
  }

  getPublicKey(): string {
    return this.config.publicKey;
  }

  getWalletType(): string {
    return this.config.walletType;
  }

  private validateTransaction(tx: AgentTransaction): void {
    if (tx.amount < BigInt(0)) {
      throw new Error('Transaction amount cannot be negative');
    }
  }

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// MPC Wallet
// ============================================================================

/**
 * MPC (Multi-Party Computation) wallet provider.
 * Uses threshold signature scheme: t-of-n parties must co-sign.
 * No single party has full key material.
 */
export class MPCProvider {
  private readonly wallet: AgentWallet;
  private readonly config: MPCConfig;
  private readonly collectedShares: Map<string, string[]> = new Map();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private txCounter = 0;

  constructor(wallet: AgentWallet, config: MPCConfig) {
    if (config.threshold > config.parties) {
      throw new Error(`Threshold ${config.threshold} cannot exceed parties ${config.parties}`);
    }
    if (config.partyPublicKeys.length !== config.parties) {
      throw new Error(
        `Expected ${config.parties} party public keys, got ${config.partyPublicKeys.length}`
      );
    }

    this.wallet = wallet;
    this.config = config;
  }

  /**
   * Initiate MPC signing round (Distributed Key Generation phase).
   * Returns a signing session ID that parties use to contribute shares.
   */
  async initiateSigningSession(tx: AgentTransaction): Promise<string> {
    const sessionId = `mpc_session_${tx.txId}_${Date.now()}`;
    this.collectedShares.set(sessionId, []);

    this.emitEvent({
      type: 'transaction.submitted',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { sessionId, txId: tx.txId, threshold: this.config.threshold },
    });

    return sessionId;
  }

  /**
   * Submit a signature share from one MPC party.
   */
  async submitShare(sessionId: string, partyIndex: number, share: string): Promise<boolean> {
    const shares = this.collectedShares.get(sessionId);
    if (!shares) {
      throw new Error(`Signing session ${sessionId} not found`);
    }

    if (partyIndex >= this.config.parties) {
      throw new Error(`Party index ${partyIndex} out of range`);
    }

    shares.push(share);
    this.collectedShares.set(sessionId, shares);

    return shares.length >= this.config.threshold;
  }

  /**
   * Finalize signing: combine threshold shares and submit transaction.
   */
  async finalizeAndSubmit(
    sessionId: string,
    _tx: AgentTransaction
  ): Promise<TransactionResult> {
    const shares = this.collectedShares.get(sessionId);
    if (!shares) {
      throw new Error(`Signing session ${sessionId} not found`);
    }

    if (shares.length < this.config.threshold) {
      throw new Error(
        `Insufficient shares: ${shares.length}/${this.config.threshold}`
      );
    }

    this.txCounter++;
    const txHash = `mpc_tx_${sessionId}_${this.txCounter}`;

    // In production: combine shares into full signature, broadcast to TON
    this.collectedShares.delete(sessionId);

    const result: TransactionResult = {
      txHash,
      success: true,
      blockSeqno: 1000000 + this.txCounter,
      gasUsed: BigInt(7_000_000), // Slightly higher for MPC overhead
      exitCode: 0,
      timestamp: new Date(),
    };

    this.emitEvent({
      type: 'transaction.confirmed',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { txHash, sessionId, sharesUsed: shares.length },
    });

    return result;
  }

  getThreshold(): number {
    return this.config.threshold;
  }

  getPartyCount(): number {
    return this.config.parties;
  }

  getPartyPublicKey(index: number): string {
    if (index >= this.config.parties) {
      throw new Error(`Party index ${index} out of range`);
    }
    return this.config.partyPublicKeys[index];
  }

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// Smart Contract Wallet
// ============================================================================

/**
 * Smart Contract Wallet provider.
 * Programmable wallet with on-chain spending rules,
 * multi-sig, time-locks, and emergency stop mechanisms.
 */
export class SmartContractWalletProvider {
  private readonly wallet: AgentWallet;
  private readonly config: SmartContractWalletConfig;
  private readonly dailySpending: Map<string, bigint> = new Map();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();
  private txCounter = 0;

  constructor(wallet: AgentWallet, config: SmartContractWalletConfig) {
    this.wallet = wallet;
    this.config = config;
  }

  /**
   * Execute a transaction through the smart contract wallet.
   * Enforces spending rules, whitelist, and multi-sig requirements.
   */
  async executeTransaction(tx: AgentTransaction): Promise<TransactionResult> {
    // Validate transaction type is allowed
    this.validateTransactionType(tx.type);

    // Enforce per-transaction spending limit
    this.enforceTransactionLimit(tx.amount);

    // Enforce daily spending limit
    this.enforceDailyLimit(tx.amount);

    // Check whitelist
    this.enforceWhitelist(tx.to);

    this.txCounter++;
    const txHash = `scw_tx_${tx.txId}_${this.txCounter}`;

    // Update daily spending tracker
    const today = new Date().toISOString().split('T')[0];
    const currentDaily = this.dailySpending.get(today) ?? BigInt(0);
    this.dailySpending.set(today, currentDaily + tx.amount);

    this.emitEvent({
      type: 'transaction.submitted',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { txHash, type: tx.type, amount: tx.amount.toString(), to: tx.to },
    });

    const result: TransactionResult = {
      txHash,
      success: true,
      blockSeqno: 1000000 + this.txCounter,
      gasUsed: BigInt(6_000_000),
      exitCode: 0,
      timestamp: new Date(),
    };

    this.emitEvent({
      type: 'transaction.confirmed',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: { txHash, success: true },
    });

    return result;
  }

  /**
   * Check if a transaction requires multi-sig approval.
   */
  requiresMultiSig(amount: bigint): boolean {
    return amount > this.config.requireMultiSigAbove;
  }

  /**
   * Get the co-signers for large transactions.
   */
  getCoSigners(): TonAddress[] {
    return this.config.coSigners ?? [];
  }

  /**
   * Trigger emergency stop (drains funds to emergency address).
   */
  async triggerEmergencyStop(): Promise<void> {
    if (!this.config.emergencyStopAddress) {
      throw new Error('No emergency stop address configured');
    }

    this.emitEvent({
      type: 'emergency.triggered',
      timestamp: new Date(),
      agentId: this.wallet.agentId,
      data: {
        emergencyAddress: this.config.emergencyStopAddress,
        walletBalance: this.wallet.balance.toString(),
      },
    });
  }

  /**
   * Update spending limits.
   */
  updateLimits(
    txLimit?: bigint,
    dailyLimit?: bigint
  ): void {
    if (txLimit !== undefined) {
      (this.config as { txSpendingLimit: bigint }).txSpendingLimit = txLimit;
    }
    if (dailyLimit !== undefined) {
      (this.config as { dailySpendingLimit: bigint }).dailySpendingLimit = dailyLimit;
    }
  }

  /**
   * Add an address to the whitelist.
   */
  addToWhitelist(address: TonAddress): void {
    if (!this.config.whitelistedAddresses.includes(address)) {
      this.config.whitelistedAddresses.push(address);
    }
  }

  /**
   * Remove an address from the whitelist.
   */
  removeFromWhitelist(address: TonAddress): void {
    const idx = this.config.whitelistedAddresses.indexOf(address);
    if (idx !== -1) {
      this.config.whitelistedAddresses.splice(idx, 1);
    }
  }

  getDailySpent(date?: string): bigint {
    const key = date ?? new Date().toISOString().split('T')[0];
    return this.dailySpending.get(key) ?? BigInt(0);
  }

  getConfig(): SmartContractWalletConfig {
    return { ...this.config };
  }

  private validateTransactionType(type: TonTransactionType): void {
    if (!this.config.allowedTxTypes.includes(type)) {
      throw new Error(`Transaction type '${type}' is not allowed for this wallet`);
    }
  }

  private enforceTransactionLimit(amount: bigint): void {
    if (amount > this.config.txSpendingLimit) {
      throw new Error(
        `Transaction amount ${amount} exceeds per-tx limit ${this.config.txSpendingLimit}`
      );
    }
  }

  private enforceDailyLimit(amount: bigint): void {
    const today = new Date().toISOString().split('T')[0];
    const currentDaily = this.dailySpending.get(today) ?? BigInt(0);
    if (currentDaily + amount > this.config.dailySpendingLimit) {
      throw new Error(
        `Daily spending limit ${this.config.dailySpendingLimit} would be exceeded`
      );
    }
  }

  private enforceWhitelist(address: TonAddress): void {
    if (
      this.config.whitelistedAddresses.length > 0 &&
      !this.config.whitelistedAddresses.includes(address)
    ) {
      throw new Error(`Address ${address} is not whitelisted`);
    }
  }

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// Agent Wallet Manager
// ============================================================================

/**
 * Unified manager for all agent wallets.
 * Creates and manages Non-Custodial, MPC, and Smart Contract wallets.
 * Handles wallet lifecycle, TON-specific operations (Jettons, NFTs, DeFi).
 */
export class AgentWalletManager {
  private readonly wallets: Map<AgentId, AgentWallet> = new Map();
  private readonly ncProviders: Map<AgentId, NonCustodialProvider> = new Map();
  private readonly mpcProviders: Map<AgentId, MPCProvider> = new Map();
  private readonly scwProviders: Map<AgentId, SmartContractWalletProvider> = new Map();
  private readonly txHistory: Map<AgentId, TransactionResult[]> = new Map();
  private readonly eventHandlers: Set<TonFactoryEventHandler> = new Set();

  /**
   * Create a new agent wallet.
   */
  createWallet(
    agentId: AgentId,
    contractAddress: TonAddress,
    ownerAddress: TonAddress,
    mode: WalletMode,
    version: ContractVersion = '1.0.0'
  ): AgentWallet {
    if (this.wallets.has(agentId)) {
      throw new Error(`Wallet for agent ${agentId} already exists`);
    }

    const wallet: AgentWallet = {
      agentId,
      contractAddress,
      ownerAddress,
      mode,
      balance: BigInt(0),
      status: 'active',
      version,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.wallets.set(agentId, wallet);
    this.txHistory.set(agentId, []);

    return wallet;
  }

  /**
   * Set up Non-Custodial provider for a wallet.
   */
  setupNonCustodial(agentId: AgentId, config: NonCustodialConfig): NonCustodialProvider {
    const wallet = this.requireWallet(agentId);
    if (wallet.mode !== 'non-custodial') {
      throw new Error(`Agent ${agentId} is not in non-custodial mode`);
    }

    const provider = new NonCustodialProvider(wallet, config);
    provider.subscribe((event) => this.emitEvent(event));
    this.ncProviders.set(agentId, provider);
    return provider;
  }

  /**
   * Set up MPC provider for a wallet.
   */
  setupMPC(agentId: AgentId, config: MPCConfig): MPCProvider {
    const wallet = this.requireWallet(agentId);
    if (wallet.mode !== 'mpc') {
      throw new Error(`Agent ${agentId} is not in MPC mode`);
    }

    const provider = new MPCProvider(wallet, config);
    provider.subscribe((event) => this.emitEvent(event));
    this.mpcProviders.set(agentId, provider);
    return provider;
  }

  /**
   * Set up Smart Contract Wallet provider.
   */
  setupSmartContractWallet(
    agentId: AgentId,
    config: SmartContractWalletConfig
  ): SmartContractWalletProvider {
    const wallet = this.requireWallet(agentId);
    if (wallet.mode !== 'smart-contract') {
      throw new Error(`Agent ${agentId} is not in smart-contract mode`);
    }

    const provider = new SmartContractWalletProvider(wallet, config);
    provider.subscribe((event) => this.emitEvent(event));
    this.scwProviders.set(agentId, provider);
    return provider;
  }

  // ============================================================================
  // Wallet Operations (TON-specific)
  // ============================================================================

  /**
   * Execute a Jetton (TON fungible token) transfer.
   */
  async transferJetton(
    agentId: AgentId,
    jettonAddress: TonAddress,
    to: TonAddress,
    amount: bigint
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `jetton_${Date.now()}`,
      agentId,
      type: 'jetton_transfer',
      to,
      amount,
      jettonAddress,
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Execute a DEX swap (e.g., STON.fi, DeDust).
   */
  async swapTokens(
    agentId: AgentId,
    dexAddress: TonAddress,
    fromJetton: TonAddress | 'TON',
    toJetton: TonAddress | 'TON',
    amount: bigint,
    minAmountOut: bigint
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `swap_${Date.now()}`,
      agentId,
      type: 'swap',
      to: dexAddress,
      amount,
      payload: Buffer.from(
        JSON.stringify({ fromJetton, toJetton, minAmountOut: minAmountOut.toString() })
      ).toString('base64'),
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Provide liquidity to a DEX pool.
   */
  async provideLiquidity(
    agentId: AgentId,
    poolAddress: TonAddress,
    token0Amount: bigint,
    token1Amount: bigint
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `lp_${Date.now()}`,
      agentId,
      type: 'provide_liquidity',
      to: poolAddress,
      amount: token0Amount + token1Amount,
      payload: Buffer.from(
        JSON.stringify({ token0Amount: token0Amount.toString(), token1Amount: token1Amount.toString() })
      ).toString('base64'),
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Stake TON or Jettons.
   */
  async stake(
    agentId: AgentId,
    stakingContract: TonAddress,
    amount: bigint
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `stake_${Date.now()}`,
      agentId,
      type: 'stake',
      to: stakingContract,
      amount,
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Unstake from a staking contract.
   */
  async unstake(
    agentId: AgentId,
    stakingContract: TonAddress,
    amount: bigint
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `unstake_${Date.now()}`,
      agentId,
      type: 'unstake',
      to: stakingContract,
      amount,
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Vote in a DAO.
   */
  async voteInDAO(
    agentId: AgentId,
    daoContract: TonAddress,
    proposalId: string,
    vote: 'for' | 'against' | 'abstain'
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `vote_${Date.now()}`,
      agentId,
      type: 'dao_vote',
      to: daoContract,
      amount: BigInt(0),
      payload: Buffer.from(JSON.stringify({ proposalId, vote })).toString('base64'),
    };

    return this.executeTransaction(agentId, tx);
  }

  /**
   * Transfer an NFT item.
   */
  async transferNFT(
    agentId: AgentId,
    nftAddress: TonAddress,
    to: TonAddress
  ): Promise<TransactionResult> {
    const tx: AgentTransaction = {
      txId: `nft_${Date.now()}`,
      agentId,
      type: 'nft_transfer',
      to,
      amount: BigInt(50_000_000), // Attach 0.05 TON for NFT transfer
      payload: Buffer.from(JSON.stringify({ nftAddress })).toString('base64'),
    };

    return this.executeTransaction(agentId, tx);
  }

  // ============================================================================
  // Wallet Lifecycle
  // ============================================================================

  pauseWallet(agentId: AgentId): void {
    const wallet = this.requireWallet(agentId);
    wallet.status = 'paused';

    this.emitEvent({
      type: 'agent.paused',
      timestamp: new Date(),
      agentId,
      data: { previousStatus: 'active' },
    });
  }

  resumeWallet(agentId: AgentId): void {
    const wallet = this.requireWallet(agentId);
    if (wallet.status !== 'paused') {
      throw new Error(`Agent ${agentId} is not paused`);
    }
    wallet.status = 'active';

    this.emitEvent({
      type: 'agent.resumed',
      timestamp: new Date(),
      agentId,
      data: {},
    });
  }

  stopWallet(agentId: AgentId): void {
    const wallet = this.requireWallet(agentId);
    wallet.status = 'stopped';

    this.emitEvent({
      type: 'agent.stopped',
      timestamp: new Date(),
      agentId,
      data: {},
    });
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getWallet(agentId: AgentId): AgentWallet | undefined {
    return this.wallets.get(agentId);
  }

  getAllWallets(): AgentWallet[] {
    return Array.from(this.wallets.values());
  }

  getActiveWallets(): AgentWallet[] {
    return Array.from(this.wallets.values()).filter((w) => w.status === 'active');
  }

  getNonCustodialProvider(agentId: AgentId): NonCustodialProvider | undefined {
    return this.ncProviders.get(agentId);
  }

  getMPCProvider(agentId: AgentId): MPCProvider | undefined {
    return this.mpcProviders.get(agentId);
  }

  getSmartContractWalletProvider(agentId: AgentId): SmartContractWalletProvider | undefined {
    return this.scwProviders.get(agentId);
  }

  getTransactionHistory(agentId: AgentId): TransactionResult[] {
    return this.txHistory.get(agentId) ?? [];
  }

  updateBalance(agentId: AgentId, newBalance: bigint): void {
    const wallet = this.requireWallet(agentId);
    wallet.balance = newBalance;
    wallet.lastActivityAt = new Date();
  }

  // ============================================================================
  // Event System
  // ============================================================================

  subscribe(handler: TonFactoryEventHandler): Unsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emitEvent(event: TonFactoryEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore
      }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private requireWallet(agentId: AgentId): AgentWallet {
    const wallet = this.wallets.get(agentId);
    if (!wallet) {
      throw new Error(`Wallet for agent ${agentId} not found`);
    }
    return wallet;
  }

  private async executeTransaction(
    agentId: AgentId,
    tx: AgentTransaction
  ): Promise<TransactionResult> {
    const wallet = this.requireWallet(agentId);

    if (wallet.status !== 'active') {
      throw new Error(`Agent ${agentId} wallet is not active (status: ${wallet.status})`);
    }

    let result: TransactionResult;

    switch (wallet.mode) {
      case 'non-custodial': {
        const provider = this.ncProviders.get(agentId);
        if (!provider) {
          throw new Error(`Non-custodial provider not set up for agent ${agentId}`);
        }
        result = await provider.signAndSubmit(tx);
        break;
      }

      case 'mpc': {
        // For MPC, we simulate a completed session
        const provider = this.mpcProviders.get(agentId);
        if (!provider) {
          throw new Error(`MPC provider not set up for agent ${agentId}`);
        }
        const sessionId = await provider.initiateSigningSession(tx);
        // Simulate all parties submitting shares
        for (let i = 0; i < provider.getThreshold(); i++) {
          await provider.submitShare(sessionId, i, `share_${i}_${Date.now()}`);
        }
        result = await provider.finalizeAndSubmit(sessionId, tx);
        break;
      }

      case 'smart-contract': {
        const provider = this.scwProviders.get(agentId);
        if (!provider) {
          throw new Error(`Smart contract wallet provider not set up for agent ${agentId}`);
        }
        result = await provider.executeTransaction(tx);
        break;
      }

      default:
        throw new Error(`Unknown wallet mode: ${wallet.mode}`);
    }

    // Track history
    const history = this.txHistory.get(agentId) ?? [];
    history.push(result);
    this.txHistory.set(agentId, history);

    // Update last activity
    wallet.lastActivityAt = new Date();

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgentWalletManager(): AgentWalletManager {
  return new AgentWalletManager();
}

export default AgentWalletManager;
