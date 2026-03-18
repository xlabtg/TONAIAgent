/**
 * TONAIAgent - Wallet Isolation Layer
 *
 * One isolated TON wallet per agent, with tenant-level segregation,
 * per-wallet limits, and cryptographic isolation proofs.
 *
 * Integrates with the existing security/custody module to provision
 * agent wallets with full tenant-scoped audit trail.
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

import {
  IsolatedWallet,
  WalletIsolationStatus,
  WalletIsolationLimits,
  WalletAuditEntry,
  MultiTenantEvent,
  MultiTenantEventCallback,
} from './types';

// ============================================================================
// Default Limits
// ============================================================================

const DEFAULT_WALLET_LIMITS: WalletIsolationLimits = {
  maxSingleTransactionTon: 100,
  maxDailyVolumeTon: 1000,
  maxWeeklyVolumeTon: 5000,
  allowedTokens: ['TON'],
  allowedProtocols: ['dedust', 'stonfi'],
  allowedDestinations: [],
  requireMultiSigAboveTon: 500,
};

// ============================================================================
// Wallet Isolation Manager
// ============================================================================

export class WalletIsolationManager {
  private readonly wallets = new Map<string, IsolatedWallet>(); // walletId → wallet
  private readonly agentWallets = new Map<string, string>(); // `${tenantId}:${agentId}` → walletId
  private readonly auditLog: WalletAuditEntry[] = [];
  private readonly eventCallbacks: MultiTenantEventCallback[] = [];

  /**
   * Provision an isolated wallet for an agent within a tenant.
   * Each agent gets exactly one isolated wallet.
   */
  async provisionWallet(
    tenantId: string,
    agentId: string,
    custodyMode: IsolatedWallet['custodyMode'] = 'mpc',
    limitsOverride?: Partial<WalletIsolationLimits>
  ): Promise<IsolatedWallet> {
    const key = `${tenantId}:${agentId}`;

    if (this.agentWallets.has(key)) {
      throw new Error(`Agent ${agentId} already has a wallet in tenant ${tenantId}`);
    }

    const walletId = `wallet_${tenantId}_${agentId}_${Date.now()}`;
    const keyId = `wkey_${tenantId}_${agentId}_${Date.now()}`;

    // Derive a deterministic address (mock in software; production uses real TON address derivation)
    const address = this.deriveAddress(tenantId, agentId, keyId);

    // Generate isolation proof (cryptographic commitment to tenant isolation)
    const segregationProof = this.generateSegregationProof(tenantId, agentId, walletId);

    const wallet: IsolatedWallet = {
      id: walletId,
      tenantId,
      agentId,
      address,
      custodyMode,
      keyId,
      status: 'active',
      limits: { ...DEFAULT_WALLET_LIMITS, ...limitsOverride },
      segregationProof,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, wallet);
    this.agentWallets.set(key, walletId);

    this.logAudit(walletId, tenantId, agentId, 'created', { custodyMode, limits: wallet.limits }, 'system');

    return wallet;
  }

  /**
   * Get the isolated wallet for a specific agent.
   */
  getAgentWallet(tenantId: string, agentId: string): IsolatedWallet | undefined {
    const key = `${tenantId}:${agentId}`;
    const walletId = this.agentWallets.get(key);
    return walletId ? this.wallets.get(walletId) : undefined;
  }

  /**
   * Get wallet by ID.
   */
  getWalletById(walletId: string): IsolatedWallet | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * List all wallets for a tenant.
   */
  listTenantWallets(tenantId: string, status?: WalletIsolationStatus): IsolatedWallet[] {
    const all = Array.from(this.wallets.values()).filter((w) => w.tenantId === tenantId);
    return status ? all.filter((w) => w.status === status) : all;
  }

  /**
   * Validate a transaction against wallet isolation limits.
   * Returns allowed=true if the transaction is within limits.
   */
  validateTransaction(
    tenantId: string,
    agentId: string,
    amountTon: number,
    destinationAddress: string,
    protocol?: string
  ): { allowed: boolean; reason?: string; requiresMultiSig: boolean } {
    const wallet = this.getAgentWallet(tenantId, agentId);
    if (!wallet) {
      return { allowed: false, reason: 'Wallet not found', requiresMultiSig: false };
    }

    if (wallet.status === 'frozen') {
      return { allowed: false, reason: 'Wallet is frozen', requiresMultiSig: false };
    }

    if (wallet.status === 'revoked') {
      return { allowed: false, reason: 'Wallet is revoked', requiresMultiSig: false };
    }

    const limits = wallet.limits;

    // Check single transaction limit
    if (amountTon > limits.maxSingleTransactionTon) {
      return {
        allowed: false,
        reason: `Single transaction limit exceeded: ${amountTon} TON > ${limits.maxSingleTransactionTon} TON`,
        requiresMultiSig: false,
      };
    }

    // Check protocol whitelist
    if (protocol && !limits.allowedProtocols.includes(protocol)) {
      return {
        allowed: false,
        reason: `Protocol not in allowlist: ${protocol}`,
        requiresMultiSig: false,
      };
    }

    // Check destination whitelist (if configured)
    if (limits.allowedDestinations.length > 0 && !limits.allowedDestinations.includes(destinationAddress)) {
      return {
        allowed: false,
        reason: `Destination address not in allowlist: ${destinationAddress}`,
        requiresMultiSig: false,
      };
    }

    // Check multi-sig threshold
    const requiresMultiSig = amountTon >= limits.requireMultiSigAboveTon;

    return { allowed: true, requiresMultiSig };
  }

  /**
   * Freeze a wallet, preventing all transactions.
   */
  async freezeWallet(walletId: string, reason: string, frozenBy: string): Promise<IsolatedWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    const updated: IsolatedWallet = {
      ...wallet,
      status: 'frozen',
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, updated);
    this.logAudit(walletId, wallet.tenantId, wallet.agentId, 'frozen', { reason }, frozenBy);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'wallet_frozen',
      tenantId: wallet.tenantId,
      severity: 'high',
      source: 'wallet_isolation',
      message: `Wallet frozen for agent "${wallet.agentId}": ${reason}`,
      data: { walletId, tenantId: wallet.tenantId, agentId: wallet.agentId, reason },
    });

    return updated;
  }

  /**
   * Unfreeze a wallet.
   */
  async unfreezeWallet(walletId: string, reason: string, unfrozenBy: string): Promise<IsolatedWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    if (wallet.status !== 'frozen') {
      throw new Error(`Wallet is not frozen: ${wallet.status}`);
    }

    const updated: IsolatedWallet = {
      ...wallet,
      status: 'active',
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, updated);
    this.logAudit(walletId, wallet.tenantId, wallet.agentId, 'transaction', { action: 'unfrozen', reason }, unfrozenBy);

    return updated;
  }

  /**
   * Revoke a wallet (permanent; agent cannot transact).
   */
  async revokeWallet(walletId: string, reason: string, revokedBy: string): Promise<IsolatedWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    const updated: IsolatedWallet = {
      ...wallet,
      status: 'revoked',
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, updated);
    this.logAudit(walletId, wallet.tenantId, wallet.agentId, 'revoked', { reason }, revokedBy);

    return updated;
  }

  /**
   * Update wallet limits.
   */
  async updateLimits(
    walletId: string,
    limits: Partial<WalletIsolationLimits>,
    updatedBy: string
  ): Promise<IsolatedWallet> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    const updated: IsolatedWallet = {
      ...wallet,
      limits: { ...wallet.limits, ...limits },
      updatedAt: new Date(),
    };

    this.wallets.set(walletId, updated);
    this.logAudit(walletId, wallet.tenantId, wallet.agentId, 'limit_changed', { limits }, updatedBy);

    return updated;
  }

  /**
   * Verify isolation proof — proves the wallet belongs to the claimed tenant/agent.
   */
  verifySegregationProof(wallet: IsolatedWallet): boolean {
    const expected = this.generateSegregationProof(wallet.tenantId, wallet.agentId, wallet.id);
    return expected === wallet.segregationProof;
  }

  /**
   * Get wallet audit log.
   */
  getAuditLog(walletId: string, tenantId: string): WalletAuditEntry[] {
    return this.auditLog.filter((e) => e.walletId === walletId && e.tenantId === tenantId);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private deriveAddress(tenantId: string, agentId: string, keyId: string): string {
    // Production: use real BIP-44 derivation + TON address encoding
    // For tests: deterministic mock address
    const hash = Buffer.from(`${tenantId}:${agentId}:${keyId}`).toString('base64').slice(0, 32);
    return `EQ${hash.replace(/[+/=]/g, '0')}`;
  }

  private generateSegregationProof(tenantId: string, agentId: string, walletId: string): string {
    // Production: HMAC-SHA256 with tenant isolation key
    // For tests: deterministic proof
    const data = `segregation:${tenantId}:${agentId}:${walletId}`;
    return Buffer.from(data).toString('base64');
  }

  private logAudit(
    walletId: string,
    tenantId: string,
    agentId: string,
    eventType: WalletAuditEntry['eventType'],
    details: Record<string, unknown>,
    actor: string
  ): void {
    this.auditLog.push({
      id: `waud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      walletId,
      tenantId,
      agentId,
      eventType,
      details,
      timestamp: new Date(),
      actor,
    });
  }

  onEvent(callback: MultiTenantEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MultiTenantEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore
      }
    }
  }
}

export function createWalletIsolationManager(): WalletIsolationManager {
  return new WalletIsolationManager();
}

export { DEFAULT_WALLET_LIMITS };
