/**
 * Permissioned & Institutional Mode
 *
 * Managed vaults, delegated capital management, whitelisted strategies,
 * compliance constraints, and audit trails. Integrates with multi-tenant
 * security infrastructure (Issue #99).
 */

import type {
  ManagedVault,
  InstitutionalTier,
  ComplianceStatus,
  ComplianceConstraint,
  AuditEntry,
  DelegationPermission,
  CreateManagedVaultInput,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface InstitutionalModeManager {
  // Managed vault lifecycle
  createManagedVault(input: CreateManagedVaultInput): Promise<ManagedVault>;
  getManagedVault(managedVaultId: string): Promise<ManagedVault | null>;
  getManagedVaultByVaultId(vaultId: string): Promise<ManagedVault | null>;
  listManagedVaults(institutionId: string): Promise<ManagedVault[]>;
  updateComplianceStatus(managedVaultId: string, status: ComplianceStatus, notes?: string): Promise<ManagedVault>;

  // Strategy whitelisting
  addWhitelistedStrategy(managedVaultId: string, strategyId: string): Promise<ManagedVault>;
  removeWhitelistedStrategy(managedVaultId: string, strategyId: string): Promise<ManagedVault>;
  isStrategyWhitelisted(managedVaultId: string, strategyId: string): Promise<boolean>;

  // Compliance constraints
  addComplianceConstraint(managedVaultId: string, constraint: Omit<ComplianceConstraint, 'id'>): Promise<ManagedVault>;
  removeComplianceConstraint(managedVaultId: string, constraintId: string): Promise<ManagedVault>;
  checkComplianceConstraints(managedVaultId: string, action: ComplianceCheckInput): Promise<ComplianceCheckResult>;

  // Delegation
  grantDelegation(permission: Omit<DelegationPermission, 'grantedAt'>): Promise<DelegationPermission>;
  revokeDelegation(managerId: string, vaultId: string): Promise<void>;
  getDelegation(managerId: string, vaultId: string): Promise<DelegationPermission | null>;
  listDelegations(vaultId: string): Promise<DelegationPermission[]>;
  checkDelegationPermission(managerId: string, vaultId: string, permission: DelegationPermission['permissions'][0]): Promise<boolean>;

  // Audit trail
  recordAuditEntry(entry: Omit<AuditEntry, 'id'>): Promise<AuditEntry>;
  getAuditTrail(vaultId: string, limit?: number): Promise<AuditEntry[]>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

export interface ComplianceCheckInput {
  type: 'strategy_use' | 'allocation' | 'withdrawal' | 'delegation';
  strategyId?: string;
  allocationPercent?: number;
  amount?: number;
  targetJurisdiction?: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
}

export interface ComplianceViolation {
  constraintId: string;
  type: ComplianceConstraint['type'];
  message: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface InstitutionalModeConfig {
  maxManagedVaultsPerInstitution: number;
  maxDelegationsPerVault: number;
  auditRetentionDays: number;
  defaultComplianceStatus: ComplianceStatus;
}

const DEFAULT_CONFIG: InstitutionalModeConfig = {
  maxManagedVaultsPerInstitution: 50,
  maxDelegationsPerVault: 10,
  auditRetentionDays: 2555, // ~7 years
  defaultComplianceStatus: 'pending',
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultInstitutionalModeManager implements InstitutionalModeManager {
  private readonly config: InstitutionalModeConfig;
  private readonly managedVaults: Map<string, ManagedVault> = new Map();
  private readonly delegations: Map<string, DelegationPermission> = new Map(); // key: `${managerId}:${vaultId}`
  private readonly auditTrails: Map<string, AuditEntry[]> = new Map(); // key: vaultId
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<InstitutionalModeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createManagedVault(input: CreateManagedVaultInput): Promise<ManagedVault> {
    // Check institution limit
    const institutionVaults = Array.from(this.managedVaults.values())
      .filter(v => v.institutionId === input.institutionId);
    if (institutionVaults.length >= this.config.maxManagedVaultsPerInstitution) {
      throw new Error(
        `Institution ${input.institutionId} has reached the managed vault limit of ${this.config.maxManagedVaultsPerInstitution}`
      );
    }

    const now = new Date();
    const id = this.generateId('mv');

    const constraints: ComplianceConstraint[] = (input.complianceConstraints ?? []).map(c => ({
      ...c,
      id: this.generateId('constraint'),
    }));

    const managedVault: ManagedVault = {
      id,
      vaultId: input.vaultId,
      institutionId: input.institutionId,
      tier: input.tier,
      delegatedManagers: input.delegatedManagers ?? [],
      whitelistedStrategies: input.whitelistedStrategies ?? [],
      complianceStatus: this.config.defaultComplianceStatus,
      complianceConstraints: constraints,
      auditTrail: [],
      createdAt: now,
      updatedAt: now,
    };

    this.managedVaults.set(id, managedVault);

    // Initialize audit trail storage
    if (!this.auditTrails.has(input.vaultId)) {
      this.auditTrails.set(input.vaultId, []);
    }

    this.emitEvent({
      type: 'managed_vault_created',
      timestamp: now,
      data: { managedVaultId: id, vaultId: input.vaultId, institutionId: input.institutionId, tier: input.tier },
    });

    return managedVault;
  }

  async getManagedVault(managedVaultId: string): Promise<ManagedVault | null> {
    return this.managedVaults.get(managedVaultId) ?? null;
  }

  async getManagedVaultByVaultId(vaultId: string): Promise<ManagedVault | null> {
    return Array.from(this.managedVaults.values()).find(v => v.vaultId === vaultId) ?? null;
  }

  async listManagedVaults(institutionId: string): Promise<ManagedVault[]> {
    return Array.from(this.managedVaults.values()).filter(v => v.institutionId === institutionId);
  }

  async updateComplianceStatus(managedVaultId: string, status: ComplianceStatus, notes?: string): Promise<ManagedVault> {
    const vault = this.getManagedVaultOrThrow(managedVaultId);
    const now = new Date();
    const updatedVault: ManagedVault = { ...vault, complianceStatus: status, updatedAt: now };
    this.managedVaults.set(managedVaultId, updatedVault);

    // Record audit entry
    await this.recordAuditEntry({
      vaultId: vault.vaultId,
      action: 'compliance_status_updated',
      actorId: 'system',
      actorType: 'system',
      details: { previousStatus: vault.complianceStatus, newStatus: status, notes },
      timestamp: now,
    });

    this.emitEvent({
      type: 'compliance_status_changed',
      timestamp: now,
      data: { managedVaultId, vaultId: vault.vaultId, previousStatus: vault.complianceStatus, newStatus: status },
    });

    return updatedVault;
  }

  async addWhitelistedStrategy(managedVaultId: string, strategyId: string): Promise<ManagedVault> {
    const vault = this.getManagedVaultOrThrow(managedVaultId);
    if (vault.whitelistedStrategies.includes(strategyId)) {
      return vault; // Already whitelisted
    }
    const updatedVault: ManagedVault = {
      ...vault,
      whitelistedStrategies: [...vault.whitelistedStrategies, strategyId],
      updatedAt: new Date(),
    };
    this.managedVaults.set(managedVaultId, updatedVault);
    return updatedVault;
  }

  async removeWhitelistedStrategy(managedVaultId: string, strategyId: string): Promise<ManagedVault> {
    const vault = this.getManagedVaultOrThrow(managedVaultId);
    const updatedVault: ManagedVault = {
      ...vault,
      whitelistedStrategies: vault.whitelistedStrategies.filter(id => id !== strategyId),
      updatedAt: new Date(),
    };
    this.managedVaults.set(managedVaultId, updatedVault);
    return updatedVault;
  }

  async isStrategyWhitelisted(managedVaultId: string, strategyId: string): Promise<boolean> {
    const vault = this.managedVaults.get(managedVaultId);
    if (!vault) return false;
    // If no whitelist is defined, all strategies are allowed
    if (vault.whitelistedStrategies.length === 0) return true;
    return vault.whitelistedStrategies.includes(strategyId);
  }

  async addComplianceConstraint(
    managedVaultId: string,
    constraint: Omit<ComplianceConstraint, 'id'>
  ): Promise<ManagedVault> {
    const vault = this.getManagedVaultOrThrow(managedVaultId);
    const newConstraint: ComplianceConstraint = { ...constraint, id: this.generateId('constraint') };
    const updatedVault: ManagedVault = {
      ...vault,
      complianceConstraints: [...vault.complianceConstraints, newConstraint],
      updatedAt: new Date(),
    };
    this.managedVaults.set(managedVaultId, updatedVault);
    return updatedVault;
  }

  async removeComplianceConstraint(managedVaultId: string, constraintId: string): Promise<ManagedVault> {
    const vault = this.getManagedVaultOrThrow(managedVaultId);
    const updatedVault: ManagedVault = {
      ...vault,
      complianceConstraints: vault.complianceConstraints.filter(c => c.id !== constraintId),
      updatedAt: new Date(),
    };
    this.managedVaults.set(managedVaultId, updatedVault);
    return updatedVault;
  }

  async checkComplianceConstraints(
    managedVaultId: string,
    action: ComplianceCheckInput
  ): Promise<ComplianceCheckResult> {
    const vault = this.managedVaults.get(managedVaultId);
    if (!vault) {
      return { passed: true, violations: [], warnings: [] };
    }

    const violations: ComplianceViolation[] = [];
    const warnings: string[] = [];

    for (const constraint of vault.complianceConstraints) {
      if (!constraint.enforced) continue;

      if (constraint.type === 'strategy_whitelist' && action.strategyId) {
        if (vault.whitelistedStrategies.length > 0 && !vault.whitelistedStrategies.includes(action.strategyId)) {
          violations.push({
            constraintId: constraint.id,
            type: 'strategy_whitelist',
            message: `Strategy ${action.strategyId} is not in the whitelist`,
          });
        }
      }

      if (constraint.type === 'exposure_limit' && action.allocationPercent !== undefined) {
        const limit = (constraint.parameters['maxPercent'] as number) ?? 100;
        if (action.allocationPercent > limit) {
          violations.push({
            constraintId: constraint.id,
            type: 'exposure_limit',
            message: `Allocation ${action.allocationPercent}% exceeds limit ${limit}%`,
          });
        }
      }

      if (constraint.type === 'jurisdiction' && action.targetJurisdiction) {
        const blockedJurisdictions = (constraint.parameters['blocked'] as string[]) ?? [];
        if (blockedJurisdictions.includes(action.targetJurisdiction)) {
          violations.push({
            constraintId: constraint.id,
            type: 'jurisdiction',
            message: `Jurisdiction ${action.targetJurisdiction} is blocked`,
          });
        }
      }
    }

    if (vault.complianceStatus !== 'approved') {
      warnings.push(`Vault compliance status is ${vault.complianceStatus} — ensure approval before proceeding`);
    }

    return { passed: violations.length === 0, violations, warnings };
  }

  async grantDelegation(permission: Omit<DelegationPermission, 'grantedAt'>): Promise<DelegationPermission> {
    const key = `${permission.managerId}:${permission.vaultId}`;

    // Check delegation limit
    const vaultDelegations = Array.from(this.delegations.values())
      .filter(d => d.vaultId === permission.vaultId);
    if (vaultDelegations.length >= this.config.maxDelegationsPerVault) {
      throw new Error(
        `Vault ${permission.vaultId} has reached the delegation limit of ${this.config.maxDelegationsPerVault}`
      );
    }

    const delegation: DelegationPermission = { ...permission, grantedAt: new Date() };
    this.delegations.set(key, delegation);
    return delegation;
  }

  async revokeDelegation(managerId: string, vaultId: string): Promise<void> {
    const key = `${managerId}:${vaultId}`;
    if (!this.delegations.has(key)) {
      throw new Error(`Delegation for manager ${managerId} on vault ${vaultId} not found`);
    }
    this.delegations.delete(key);
  }

  async getDelegation(managerId: string, vaultId: string): Promise<DelegationPermission | null> {
    return this.delegations.get(`${managerId}:${vaultId}`) ?? null;
  }

  async listDelegations(vaultId: string): Promise<DelegationPermission[]> {
    return Array.from(this.delegations.values()).filter(d => d.vaultId === vaultId);
  }

  async checkDelegationPermission(
    managerId: string,
    vaultId: string,
    permission: DelegationPermission['permissions'][0]
  ): Promise<boolean> {
    const delegation = this.delegations.get(`${managerId}:${vaultId}`);
    if (!delegation) return false;

    // Check expiration
    if (delegation.expiresAt && delegation.expiresAt < new Date()) return false;

    return delegation.permissions.includes(permission);
  }

  async recordAuditEntry(entry: Omit<AuditEntry, 'id'>): Promise<AuditEntry> {
    const auditEntry: AuditEntry = { ...entry, id: this.generateId('audit') };
    const trail = this.auditTrails.get(entry.vaultId) ?? [];
    trail.push(auditEntry);
    this.auditTrails.set(entry.vaultId, trail);

    this.emitEvent({
      type: 'audit_entry_created',
      timestamp: auditEntry.timestamp,
      data: { vaultId: entry.vaultId, action: entry.action, actorId: entry.actorId },
    });

    return auditEntry;
  }

  async getAuditTrail(vaultId: string, limit?: number): Promise<AuditEntry[]> {
    const trail = this.auditTrails.get(vaultId) ?? [];
    if (limit !== undefined) {
      return trail.slice(-limit);
    }
    return trail;
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

  private getManagedVaultOrThrow(managedVaultId: string): ManagedVault {
    const vault = this.managedVaults.get(managedVaultId);
    if (!vault) throw new Error(`Managed vault ${managedVaultId} not found`);
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

  // For health checks
  getStats(): { managedVaults: number } {
    return { managedVaults: this.managedVaults.size };
  }
}

export function createInstitutionalModeManager(
  config?: Partial<InstitutionalModeConfig>
): DefaultInstitutionalModeManager {
  return new DefaultInstitutionalModeManager(config);
}
