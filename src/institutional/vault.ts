/**
 * TONAIAgent - Segregated Vault Architecture
 *
 * Implements institutional-grade vault management:
 * - Segregated institutional vaults
 * - Strategy-restricted vaults
 * - Permissioned access control
 * - Exposure limit enforcement
 * - Compliance-locked vaults
 * - Performance tracking
 * - Audit trails
 */

import {
  InstitutionalVault,
  VaultType,
  VaultStatus,
  VaultAsset,
  VaultAccessControl,
  ExposureLimits,
  StrategyRestriction,
  VaultComplianceConfig,
  VaultPerformanceTracking,
  VaultAuditEntry,
  VaultPerformanceMetric,
  InstitutionalRole,
  InstitutionalEventCallback,
  InstitutionalEvent,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface VaultManager {
  // Vault CRUD
  createVault(
    accountId: string,
    name: string,
    type: VaultType,
    description: string,
    createdBy: string,
    options?: CreateVaultOptions
  ): Promise<InstitutionalVault>;
  getVault(vaultId: string): Promise<InstitutionalVault | null>;
  listVaults(accountId: string, filters?: VaultFilters): Promise<InstitutionalVault[]>;
  updateVault(vaultId: string, updates: Partial<VaultUpdates>, updatedBy: string): Promise<InstitutionalVault>;
  lockVault(vaultId: string, reason: string, lockedBy: string): Promise<InstitutionalVault>;
  unlockVault(vaultId: string, unlockedBy: string): Promise<InstitutionalVault>;
  freezeVault(vaultId: string, reason: string, frozenBy: string): Promise<InstitutionalVault>;
  closeVault(vaultId: string, reason: string, closedBy: string): Promise<InstitutionalVault>;

  // Asset management
  depositAsset(
    vaultId: string,
    asset: string,
    network: string,
    amount: number,
    depositor: string
  ): Promise<VaultAsset>;
  withdrawAsset(
    vaultId: string,
    asset: string,
    amount: number,
    withdrawer: string
  ): Promise<VaultAsset>;
  allocateAsset(
    vaultId: string,
    asset: string,
    amount: number,
    purpose: string,
    allocatedBy: string
  ): Promise<VaultAsset>;
  getAssetBalance(vaultId: string, asset: string): Promise<VaultAsset | null>;
  listAssets(vaultId: string): Promise<VaultAsset[]>;

  // Access control
  updateAccessControl(
    vaultId: string,
    accessControl: Partial<VaultAccessControl>,
    updatedBy: string
  ): Promise<InstitutionalVault>;
  checkVaultAccess(vaultId: string, userId: string, role: InstitutionalRole): Promise<VaultAccessCheckResult>;
  grantAccess(vaultId: string, userId: string, grantedBy: string): Promise<InstitutionalVault>;
  revokeAccess(vaultId: string, userId: string, revokedBy: string): Promise<InstitutionalVault>;

  // Exposure limits
  updateExposureLimits(
    vaultId: string,
    limits: Partial<ExposureLimits>,
    updatedBy: string
  ): Promise<InstitutionalVault>;
  checkExposureLimit(
    vaultId: string,
    asset: string,
    amount: number
  ): Promise<ExposureCheckResult>;

  // Strategy restrictions
  addStrategyRestriction(
    vaultId: string,
    restriction: Omit<StrategyRestriction, 'approvedAt'>,
    addedBy: string
  ): Promise<InstitutionalVault>;
  updateStrategyRestriction(
    vaultId: string,
    strategyId: string,
    updates: Partial<StrategyRestriction>,
    updatedBy: string
  ): Promise<InstitutionalVault>;
  isStrategyAllowed(vaultId: string, strategyId: string): Promise<StrategyAllowanceResult>;

  // Compliance
  updateComplianceConfig(
    vaultId: string,
    config: Partial<VaultComplianceConfig>,
    updatedBy: string
  ): Promise<InstitutionalVault>;

  // Performance
  recordPerformanceMetric(
    vaultId: string,
    metric: Omit<VaultPerformanceMetric, 'calculatedAt'>
  ): Promise<InstitutionalVault>;
  getPerformanceMetrics(
    vaultId: string,
    period?: string
  ): Promise<VaultPerformanceMetric[]>;

  // Audit
  getAuditLog(vaultId: string, filters?: AuditFilters): Promise<VaultAuditEntry[]>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface CreateVaultOptions {
  accessControl?: Partial<VaultAccessControl>;
  exposureLimits?: Partial<ExposureLimits>;
  strategyRestrictions?: StrategyRestriction[];
  complianceConfig?: Partial<VaultComplianceConfig>;
  performanceTracking?: Partial<VaultPerformanceTracking>;
  metadata?: Record<string, unknown>;
}

export interface VaultFilters {
  type?: VaultType;
  status?: VaultStatus;
}

export interface VaultUpdates {
  name: string;
  description: string;
  accessControl: Partial<VaultAccessControl>;
  exposureLimits: Partial<ExposureLimits>;
  complianceConfig: Partial<VaultComplianceConfig>;
  metadata: Record<string, unknown>;
}

export interface VaultAccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: InstitutionalRole;
}

export interface ExposureCheckResult {
  withinLimits: boolean;
  currentExposure: number;
  requestedAmount: number;
  limit: number;
  utilizationPercent: number;
  reason?: string;
}

export interface StrategyAllowanceResult {
  allowed: boolean;
  permission: 'allowed' | 'restricted' | 'prohibited' | 'not_configured';
  maxAllocation?: number;
  reason?: string;
}

export interface AuditFilters {
  fromDate?: Date;
  toDate?: Date;
  actorId?: string;
  action?: string;
}

// ============================================================================
// Default Vault Manager Implementation
// ============================================================================

export class DefaultVaultManager implements VaultManager {
  private readonly vaults = new Map<string, InstitutionalVault>();
  private readonly vaultsByAccount = new Map<string, Set<string>>();
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

  private addAuditEntry(
    vault: InstitutionalVault,
    action: string,
    actorId: string,
    actorRole: InstitutionalRole,
    details: Record<string, unknown>
  ): void {
    const entry: VaultAuditEntry = {
      id: this.generateId('audit'),
      action,
      actorId,
      actorRole,
      details,
      timestamp: new Date(),
    };
    vault.auditLog.push(entry);
  }

  async createVault(
    accountId: string,
    name: string,
    type: VaultType,
    description: string,
    createdBy: string,
    options?: CreateVaultOptions
  ): Promise<InstitutionalVault> {
    const vaultId = this.generateId('vault');

    const defaultAccessControl: VaultAccessControl = {
      authorizedRoles: ['admin'],
      authorizedUsers: [createdBy],
      requireMultiSig: false,
      multiSigThreshold: 1,
      ipWhitelist: [],
    };

    const defaultExposureLimits: ExposureLimits = {
      maxTotalExposure: 10000000,
      maxSingleAssetExposure: 5000000,
      maxSingleCounterpartyExposure: 2000000,
      maxLeverage: 3,
      maxDrawdown: 20,
      assetClassLimits: {},
      protocolLimits: {},
    };

    const defaultComplianceConfig: VaultComplianceConfig = {
      jurisdictions: [],
      regulatoryClassification: 'standard',
      reportingRequired: true,
      auditFrequency: 'monthly',
      requiresSegregation: true,
      counterpartyKycRequired: true,
    };

    const vault: InstitutionalVault = {
      id: vaultId,
      accountId,
      name,
      type,
      status: 'active',
      description,
      assets: [],
      accessControl: {
        ...defaultAccessControl,
        ...options?.accessControl,
        authorizedRoles: options?.accessControl?.authorizedRoles ?? defaultAccessControl.authorizedRoles,
        authorizedUsers: options?.accessControl?.authorizedUsers ?? defaultAccessControl.authorizedUsers,
      },
      exposureLimits: {
        ...defaultExposureLimits,
        ...options?.exposureLimits,
      },
      strategyRestrictions: options?.strategyRestrictions ?? [],
      complianceConfig: {
        ...defaultComplianceConfig,
        ...options?.complianceConfig,
      },
      performanceTracking: {
        enabled: true,
        reportingCurrency: 'USD',
        performanceMetrics: [],
        ...options?.performanceTracking,
      },
      auditLog: [],
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata ?? {},
    };

    this.vaults.set(vaultId, vault);

    if (!this.vaultsByAccount.has(accountId)) {
      this.vaultsByAccount.set(accountId, new Set());
    }
    this.vaultsByAccount.get(accountId)!.add(vaultId);

    this.addAuditEntry(vault, 'create_vault', createdBy, 'admin', { name, type });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId,
      actorId: createdBy,
      actorRole: 'admin',
      action: 'create_vault',
      resource: 'vault',
      resourceId: vaultId,
      details: { name, type },
      metadata: {},
    });

    return vault;
  }

  async getVault(vaultId: string): Promise<InstitutionalVault | null> {
    return this.vaults.get(vaultId) ?? null;
  }

  async listVaults(accountId: string, filters?: VaultFilters): Promise<InstitutionalVault[]> {
    const vaultIds = this.vaultsByAccount.get(accountId) ?? new Set();
    let vaults = Array.from(vaultIds)
      .map(id => this.vaults.get(id))
      .filter((v): v is InstitutionalVault => v !== undefined);

    if (filters?.type !== undefined) {
      vaults = vaults.filter(v => v.type === filters.type);
    }
    if (filters?.status !== undefined) {
      vaults = vaults.filter(v => v.status === filters.status);
    }

    return vaults;
  }

  async updateVault(
    vaultId: string,
    updates: Partial<VaultUpdates>,
    updatedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (updates.name !== undefined) vault.name = updates.name;
    if (updates.description !== undefined) vault.description = updates.description;
    if (updates.accessControl !== undefined) {
      vault.accessControl = { ...vault.accessControl, ...updates.accessControl };
    }
    if (updates.exposureLimits !== undefined) {
      vault.exposureLimits = { ...vault.exposureLimits, ...updates.exposureLimits };
    }
    if (updates.complianceConfig !== undefined) {
      vault.complianceConfig = { ...vault.complianceConfig, ...updates.complianceConfig };
    }
    if (updates.metadata !== undefined) {
      vault.metadata = { ...vault.metadata, ...updates.metadata };
    }

    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'update_vault', updatedBy, 'admin', { updates });

    return vault;
  }

  async lockVault(vaultId: string, reason: string, lockedBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.status = 'locked';
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'lock_vault', lockedBy, 'admin', { reason });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId: vault.accountId,
      actorId: lockedBy,
      actorRole: 'admin',
      action: 'lock_vault',
      resource: 'vault',
      resourceId: vaultId,
      details: { reason },
      metadata: {},
    });

    return vault;
  }

  async unlockVault(vaultId: string, unlockedBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (vault.status !== 'locked') {
      throw new Error(`Vault is not locked: ${vaultId}`);
    }

    vault.status = 'active';
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'unlock_vault', unlockedBy, 'admin', {});

    return vault;
  }

  async freezeVault(vaultId: string, reason: string, frozenBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.status = 'frozen';
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'freeze_vault', frozenBy, 'admin', { reason });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'settings_updated',
      accountId: vault.accountId,
      actorId: frozenBy,
      actorRole: 'admin',
      action: 'freeze_vault',
      resource: 'vault',
      resourceId: vaultId,
      details: { reason },
      metadata: {},
    });

    return vault;
  }

  async closeVault(vaultId: string, reason: string, closedBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (vault.assets.some(a => a.balance > 0)) {
      throw new Error(`Cannot close vault with non-zero asset balances: ${vaultId}`);
    }

    vault.status = 'closed';
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'close_vault', closedBy, 'admin', { reason });

    return vault;
  }

  async depositAsset(
    vaultId: string,
    asset: string,
    network: string,
    amount: number,
    depositor: string
  ): Promise<VaultAsset> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (vault.status === 'frozen' || vault.status === 'closed') {
      throw new Error(`Cannot deposit to ${vault.status} vault: ${vaultId}`);
    }

    let vaultAsset = vault.assets.find(a => a.asset === asset && a.network === network);
    if (!vaultAsset) {
      vaultAsset = {
        asset,
        network,
        balance: 0,
        allocatedAmount: 0,
        availableAmount: 0,
        lockedAmount: 0,
        valueUSD: 0,
        lastUpdated: new Date(),
      };
      vault.assets.push(vaultAsset);
    }

    vaultAsset.balance += amount;
    vaultAsset.availableAmount += amount;
    vaultAsset.lastUpdated = new Date();
    vault.updatedAt = new Date();

    this.addAuditEntry(vault, 'deposit_asset', depositor, 'trader', { asset, network, amount });

    return vaultAsset;
  }

  async withdrawAsset(
    vaultId: string,
    asset: string,
    amount: number,
    withdrawer: string
  ): Promise<VaultAsset> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (vault.status !== 'active') {
      throw new Error(`Cannot withdraw from ${vault.status} vault: ${vaultId}`);
    }

    const vaultAsset = vault.assets.find(a => a.asset === asset);
    if (!vaultAsset) {
      throw new Error(`Asset not found in vault: ${asset}`);
    }

    if (vaultAsset.availableAmount < amount) {
      throw new Error(`Insufficient available balance: ${vaultAsset.availableAmount} < ${amount}`);
    }

    vaultAsset.balance -= amount;
    vaultAsset.availableAmount -= amount;
    vaultAsset.lastUpdated = new Date();
    vault.updatedAt = new Date();

    this.addAuditEntry(vault, 'withdraw_asset', withdrawer, 'trader', { asset, amount });

    return vaultAsset;
  }

  async allocateAsset(
    vaultId: string,
    asset: string,
    amount: number,
    purpose: string,
    allocatedBy: string
  ): Promise<VaultAsset> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (vault.status !== 'active') {
      throw new Error(`Cannot allocate from ${vault.status} vault: ${vaultId}`);
    }

    const vaultAsset = vault.assets.find(a => a.asset === asset);
    if (!vaultAsset) {
      throw new Error(`Asset not found in vault: ${asset}`);
    }

    if (vaultAsset.availableAmount < amount) {
      throw new Error(`Insufficient available balance for allocation: ${vaultAsset.availableAmount} < ${amount}`);
    }

    vaultAsset.availableAmount -= amount;
    vaultAsset.allocatedAmount += amount;
    vaultAsset.lastUpdated = new Date();
    vault.updatedAt = new Date();

    this.addAuditEntry(vault, 'allocate_asset', allocatedBy, 'trader', { asset, amount, purpose });

    return vaultAsset;
  }

  async getAssetBalance(vaultId: string, asset: string): Promise<VaultAsset | null> {
    const vault = this.vaults.get(vaultId);
    if (!vault) return null;
    return vault.assets.find(a => a.asset === asset) ?? null;
  }

  async listAssets(vaultId: string): Promise<VaultAsset[]> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }
    return vault.assets;
  }

  async updateAccessControl(
    vaultId: string,
    accessControl: Partial<VaultAccessControl>,
    updatedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.accessControl = { ...vault.accessControl, ...accessControl };
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'update_access_control', updatedBy, 'admin', { accessControl });

    return vault;
  }

  async checkVaultAccess(
    vaultId: string,
    userId: string,
    role: InstitutionalRole
  ): Promise<VaultAccessCheckResult> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      return { allowed: false, reason: 'Vault not found' };
    }

    if (vault.status === 'closed') {
      return { allowed: false, reason: 'Vault is closed' };
    }

    const { accessControl } = vault;

    // Check if user is directly authorized
    if (accessControl.authorizedUsers.includes(userId)) {
      return { allowed: true };
    }

    // Check if role is authorized
    if (accessControl.authorizedRoles.includes(role)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'User does not have vault access',
      requiredRole: accessControl.authorizedRoles[0],
    };
  }

  async grantAccess(vaultId: string, userId: string, grantedBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    if (!vault.accessControl.authorizedUsers.includes(userId)) {
      vault.accessControl.authorizedUsers.push(userId);
    }

    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'grant_access', grantedBy, 'admin', { userId });

    return vault;
  }

  async revokeAccess(vaultId: string, userId: string, revokedBy: string): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.accessControl.authorizedUsers = vault.accessControl.authorizedUsers.filter(
      id => id !== userId
    );

    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'revoke_access', revokedBy, 'admin', { userId });

    return vault;
  }

  async updateExposureLimits(
    vaultId: string,
    limits: Partial<ExposureLimits>,
    updatedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.exposureLimits = { ...vault.exposureLimits, ...limits };
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'update_exposure_limits', updatedBy, 'risk_manager', { limits });

    return vault;
  }

  async checkExposureLimit(
    vaultId: string,
    asset: string,
    amount: number
  ): Promise<ExposureCheckResult> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const vaultAsset = vault.assets.find(a => a.asset === asset);
    const currentExposure = vaultAsset?.balance ?? 0;
    const limit = vault.exposureLimits.maxSingleAssetExposure;
    const projectedExposure = currentExposure + amount;
    const withinLimits = projectedExposure <= limit;

    return {
      withinLimits,
      currentExposure,
      requestedAmount: amount,
      limit,
      utilizationPercent: limit > 0 ? (projectedExposure / limit) * 100 : 0,
      reason: withinLimits ? undefined : `Exposure limit of ${limit} would be exceeded`,
    };
  }

  async addStrategyRestriction(
    vaultId: string,
    restriction: Omit<StrategyRestriction, 'approvedAt'>,
    addedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const existing = vault.strategyRestrictions.findIndex(
      r => r.strategyId === restriction.strategyId
    );
    if (existing >= 0) {
      vault.strategyRestrictions[existing] = { ...restriction };
    } else {
      vault.strategyRestrictions.push({ ...restriction });
    }

    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'add_strategy_restriction', addedBy, 'compliance_officer', { restriction });

    return vault;
  }

  async updateStrategyRestriction(
    vaultId: string,
    strategyId: string,
    updates: Partial<StrategyRestriction>,
    updatedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const index = vault.strategyRestrictions.findIndex(r => r.strategyId === strategyId);
    if (index < 0) {
      throw new Error(`Strategy restriction not found: ${strategyId}`);
    }

    vault.strategyRestrictions[index] = { ...vault.strategyRestrictions[index], ...updates };
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'update_strategy_restriction', updatedBy, 'compliance_officer', { strategyId, updates });

    return vault;
  }

  async isStrategyAllowed(vaultId: string, strategyId: string): Promise<StrategyAllowanceResult> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const restriction = vault.strategyRestrictions.find(r => r.strategyId === strategyId);
    if (!restriction) {
      // Default: allowed if no restriction is set
      return {
        allowed: true,
        permission: 'not_configured',
      };
    }

    return {
      allowed: restriction.permission === 'allowed',
      permission: restriction.permission,
      maxAllocation: restriction.maxAllocation,
      reason: restriction.reason,
    };
  }

  async updateComplianceConfig(
    vaultId: string,
    config: Partial<VaultComplianceConfig>,
    updatedBy: string
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    vault.complianceConfig = { ...vault.complianceConfig, ...config };
    vault.updatedAt = new Date();
    this.addAuditEntry(vault, 'update_compliance_config', updatedBy, 'compliance_officer', { config });

    return vault;
  }

  async recordPerformanceMetric(
    vaultId: string,
    metric: Omit<VaultPerformanceMetric, 'calculatedAt'>
  ): Promise<InstitutionalVault> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const fullMetric: VaultPerformanceMetric = {
      ...metric,
      calculatedAt: new Date(),
    };

    vault.performanceTracking.performanceMetrics.push(fullMetric);
    vault.performanceTracking.lastCalculatedAt = new Date();
    vault.updatedAt = new Date();

    return vault;
  }

  async getPerformanceMetrics(
    vaultId: string,
    period?: string
  ): Promise<VaultPerformanceMetric[]> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    let metrics = vault.performanceTracking.performanceMetrics;
    if (period !== undefined) {
      metrics = metrics.filter(m => m.period === period);
    }

    return metrics;
  }

  async getAuditLog(vaultId: string, filters?: AuditFilters): Promise<VaultAuditEntry[]> {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    let log = vault.auditLog;

    if (filters?.fromDate !== undefined) {
      log = log.filter(e => e.timestamp >= filters.fromDate!);
    }
    if (filters?.toDate !== undefined) {
      log = log.filter(e => e.timestamp <= filters.toDate!);
    }
    if (filters?.actorId !== undefined) {
      log = log.filter(e => e.actorId === filters.actorId);
    }
    if (filters?.action !== undefined) {
      log = log.filter(e => e.action === filters.action);
    }

    return log;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createVaultManager(): DefaultVaultManager {
  return new DefaultVaultManager();
}
