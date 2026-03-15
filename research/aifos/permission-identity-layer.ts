/**
 * TONAIAgent - AIFOS Permission & Identity Layer
 *
 * Manages identities, roles, and permissions across the OS.
 * Supports:
 * - Institutional role management
 * - Node permissions
 * - Governance delegation
 * - Compliance gating
 *
 * This is Pillar 5 of AIFOS.
 */

import {
  IdentityId,
  IdentityRole,
  PermissionScope,
  AIFOSIdentity,
  GovernanceDelegation,
  NodeAccessGrant,
  ComplianceGate,
  PermissionIdentityConfig,
  AIFOSEvent,
  AIFOSEventCallback,
  AIFOSEventType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_PERMISSION_CONFIG: PermissionIdentityConfig = {
  enableRoleBasedAccess: true,
  enableNodePermissions: true,
  enableGovernanceDelegation: true,
  enableComplianceGating: true,
  identityExpiryDays: 365,
  requireMFAForKernelWrite: true,
};

// ============================================================================
// Permission & Identity Layer Interface
// ============================================================================

export interface PermissionIdentityLayer {
  readonly config: PermissionIdentityConfig;

  // Identity management
  createIdentity(params: CreateIdentityParams): AIFOSIdentity;
  getIdentity(id: IdentityId): AIFOSIdentity | undefined;
  listIdentities(filters?: IdentityFilters): AIFOSIdentity[];
  updateIdentity(id: IdentityId, updates: Partial<AIFOSIdentity>): AIFOSIdentity;
  revokeIdentity(id: IdentityId, reason: string): void;

  // Role management
  grantRole(identityId: IdentityId, role: IdentityRole): void;
  revokeRole(identityId: IdentityId, role: IdentityRole): void;
  hasRole(identityId: IdentityId, role: IdentityRole): boolean;

  // Permission management
  grantPermission(identityId: IdentityId, permission: PermissionScope): void;
  revokePermission(identityId: IdentityId, permission: PermissionScope): void;
  hasPermission(identityId: IdentityId, permission: PermissionScope): boolean;
  checkAccess(identityId: IdentityId, permission: PermissionScope): AccessCheckResult;

  // Governance delegation
  createDelegation(params: CreateDelegationParams): GovernanceDelegation;
  getDelegation(id: string): GovernanceDelegation | undefined;
  listDelegations(filters?: DelegationFilters): GovernanceDelegation[];
  revokeDelegation(id: string, reason: string): void;
  getEffectiveVotingPower(identityId: IdentityId): number;

  // Node access
  grantNodeAccess(identityId: IdentityId, grant: Omit<NodeAccessGrant, 'grantedAt'>): void;
  revokeNodeAccess(identityId: IdentityId, nodeId: string): void;

  // Compliance gates
  registerComplianceGate(gate: Omit<ComplianceGate, 'gateId'>): ComplianceGate;
  getComplianceGate(gateId: string): ComplianceGate | undefined;
  listComplianceGates(): ComplianceGate[];
  passesComplianceGate(identityId: IdentityId, gateId: string): ComplianceCheckResult;

  // Events
  onEvent(callback: AIFOSEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateIdentityParams {
  name: string;
  identityType: AIFOSIdentity['identityType'];
  roles?: IdentityRole[];
  permissions?: PermissionScope[];
  jurisdiction?: string;
  kycLevel?: AIFOSIdentity['kycLevel'];
  metadata?: Record<string, unknown>;
}

export interface IdentityFilters {
  identityType?: AIFOSIdentity['identityType'];
  role?: IdentityRole;
  complianceStatus?: AIFOSIdentity['complianceStatus'];
  kycLevel?: AIFOSIdentity['kycLevel'];
}

export interface AccessCheckResult {
  granted: boolean;
  reason?: string;
  grantedVia?: 'direct' | 'role' | 'delegation';
  requiresMFA?: boolean;
}

export interface CreateDelegationParams {
  delegatorId: IdentityId;
  delegateeId: IdentityId;
  scope: PermissionScope[];
  votingPowerPercent: number;
  validUntil?: Date;
  revocable?: boolean;
}

export interface DelegationFilters {
  delegatorId?: IdentityId;
  delegateeId?: IdentityId;
  isActive?: boolean;
}

export interface ComplianceCheckResult {
  passed: boolean;
  gate: ComplianceGate;
  failureReasons: string[];
  checkedAt: Date;
}

// ============================================================================
// Default Permission & Identity Layer Implementation
// ============================================================================

export class DefaultPermissionIdentityLayer implements PermissionIdentityLayer {
  readonly config: PermissionIdentityConfig;

  private readonly identities = new Map<IdentityId, AIFOSIdentity>();
  private readonly delegations = new Map<string, GovernanceDelegation>();
  private readonly complianceGates = new Map<string, ComplianceGate>();
  private readonly eventCallbacks: AIFOSEventCallback[] = [];

  private identityCounter = 0;
  private delegationCounter = 0;
  private gateCounter = 0;

  constructor(config?: Partial<PermissionIdentityConfig>) {
    this.config = { ...DEFAULT_PERMISSION_CONFIG, ...config };
    this.initializeBuiltinComplianceGates();
  }

  createIdentity(params: CreateIdentityParams): AIFOSIdentity {
    const id: IdentityId = `identity-${params.identityType}-${++this.identityCounter}-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.identityExpiryDays);

    const identity: AIFOSIdentity = {
      id,
      name: params.name,
      identityType: params.identityType,
      roles: params.roles ?? [],
      permissions: params.permissions ?? [],
      jurisdiction: params.jurisdiction,
      complianceStatus: 'unverified',
      kycLevel: params.kycLevel ?? 'none',
      delegations: [],
      issuedAt: new Date(),
      expiresAt,
      metadata: params.metadata ?? {},
    };

    this.identities.set(id, identity);

    this.emitEvent('identity_granted', 'info', 'Identity', `Identity created: ${params.name} (${params.identityType})`, {
      identityId: id,
      identityType: params.identityType,
      roles: params.roles ?? [],
    });

    return { ...identity };
  }

  getIdentity(id: IdentityId): AIFOSIdentity | undefined {
    const i = this.identities.get(id);
    return i ? { ...i } : undefined;
  }

  listIdentities(filters?: IdentityFilters): AIFOSIdentity[] {
    let list = Array.from(this.identities.values());

    if (filters?.identityType) list = list.filter(i => i.identityType === filters.identityType);
    if (filters?.role) list = list.filter(i => i.roles.includes(filters.role!));
    if (filters?.complianceStatus) list = list.filter(i => i.complianceStatus === filters.complianceStatus);
    if (filters?.kycLevel) list = list.filter(i => i.kycLevel === filters.kycLevel);

    return list.map(i => ({ ...i }));
  }

  updateIdentity(id: IdentityId, updates: Partial<AIFOSIdentity>): AIFOSIdentity {
    const i = this.identities.get(id);
    if (!i) throw new Error(`Identity not found: ${id}`);

    const updated = { ...i, ...updates };
    this.identities.set(id, updated);
    return { ...updated };
  }

  revokeIdentity(id: IdentityId, reason: string): void {
    const i = this.identities.get(id);
    if (!i) throw new Error(`Identity not found: ${id}`);

    this.identities.set(id, { ...i, complianceStatus: 'suspended' });
    this.emitEvent('identity_revoked', 'warning', 'Identity', `Identity revoked: ${i.name} (${reason})`, {
      identityId: id,
      reason,
    });
  }

  grantRole(identityId: IdentityId, role: IdentityRole): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    if (!i.roles.includes(role)) {
      this.identities.set(identityId, { ...i, roles: [...i.roles, role] });
      this.emitEvent('identity_granted', 'info', 'Identity', `Role granted: ${role} to ${i.name}`, {
        identityId,
        role,
      });
    }
  }

  revokeRole(identityId: IdentityId, role: IdentityRole): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    this.identities.set(identityId, { ...i, roles: i.roles.filter(r => r !== role) });
    this.emitEvent('identity_revoked', 'info', 'Identity', `Role revoked: ${role} from ${i.name}`, {
      identityId,
      role,
    });
  }

  hasRole(identityId: IdentityId, role: IdentityRole): boolean {
    return this.identities.get(identityId)?.roles.includes(role) ?? false;
  }

  grantPermission(identityId: IdentityId, permission: PermissionScope): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    if (!i.permissions.includes(permission)) {
      this.identities.set(identityId, { ...i, permissions: [...i.permissions, permission] });
      this.emitEvent('identity_granted', 'info', 'Identity', `Permission granted: ${permission}`, {
        identityId,
        permission,
      });
    }
  }

  revokePermission(identityId: IdentityId, permission: PermissionScope): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    this.identities.set(identityId, { ...i, permissions: i.permissions.filter(p => p !== permission) });
  }

  hasPermission(identityId: IdentityId, permission: PermissionScope): boolean {
    const i = this.identities.get(identityId);
    if (!i) return false;
    if (i.complianceStatus === 'suspended') return false;
    if (i.expiresAt && i.expiresAt < new Date()) return false;
    return i.permissions.includes(permission);
  }

  checkAccess(identityId: IdentityId, permission: PermissionScope): AccessCheckResult {
    const i = this.identities.get(identityId);
    if (!i) return { granted: false, reason: `Identity not found: ${identityId}` };
    if (i.complianceStatus === 'suspended') return { granted: false, reason: 'Identity suspended' };
    if (i.expiresAt && i.expiresAt < new Date()) return { granted: false, reason: 'Identity expired' };

    // Direct permission check
    if (i.permissions.includes(permission)) {
      const requiresMFA = this.config.requireMFAForKernelWrite && permission === 'kernel_write';
      return { granted: true, grantedVia: 'direct', requiresMFA };
    }

    // Role-based check (kernel_admin has all permissions)
    if (i.roles.includes('kernel_admin')) {
      return { granted: true, grantedVia: 'role' };
    }

    // Delegation check
    const delegations = this.listDelegations({ delegateeId: identityId, isActive: true });
    const delegationWithPermission = delegations.find(d => d.scope.includes(permission));
    if (delegationWithPermission) {
      return { granted: true, grantedVia: 'delegation' };
    }

    return { granted: false, reason: `Permission not granted: ${permission}` };
  }

  createDelegation(params: CreateDelegationParams): GovernanceDelegation {
    const id = `delegation-${++this.delegationCounter}-${Date.now()}`;

    const delegation: GovernanceDelegation = {
      id,
      delegatorId: params.delegatorId,
      delegateeId: params.delegateeId,
      scope: params.scope,
      votingPowerPercent: params.votingPowerPercent,
      validFrom: new Date(),
      validUntil: params.validUntil,
      revocable: params.revocable ?? true,
      isActive: true,
    };

    this.delegations.set(id, delegation);

    // Add to delegatee's identity
    const delegatee = this.identities.get(params.delegateeId);
    if (delegatee) {
      this.identities.set(params.delegateeId, {
        ...delegatee,
        delegations: [...delegatee.delegations, delegation],
      });
    }

    this.emitEvent('identity_granted', 'info', 'Identity',
      `Delegation created: ${params.delegatorId} → ${params.delegateeId}`, {
        delegationId: id,
        votingPowerPercent: params.votingPowerPercent,
      });

    return { ...delegation };
  }

  getDelegation(id: string): GovernanceDelegation | undefined {
    const d = this.delegations.get(id);
    return d ? { ...d } : undefined;
  }

  listDelegations(filters?: DelegationFilters): GovernanceDelegation[] {
    let list = Array.from(this.delegations.values());

    if (filters?.delegatorId) list = list.filter(d => d.delegatorId === filters.delegatorId);
    if (filters?.delegateeId) list = list.filter(d => d.delegateeId === filters.delegateeId);
    if (filters?.isActive !== undefined) list = list.filter(d => d.isActive === filters.isActive);

    // Filter expired
    const now = new Date();
    list = list.filter(d => !d.validUntil || d.validUntil > now);

    return list.map(d => ({ ...d }));
  }

  revokeDelegation(id: string, reason: string): void {
    const d = this.delegations.get(id);
    if (!d) throw new Error(`Delegation not found: ${id}`);
    if (!d.revocable) throw new Error(`Delegation is not revocable`);

    this.delegations.set(id, { ...d, isActive: false });
    this.emitEvent('identity_revoked', 'info', 'Identity', `Delegation revoked: ${reason}`, {
      delegationId: id,
      reason,
    });
  }

  getEffectiveVotingPower(identityId: IdentityId): number {
    const delegations = this.listDelegations({ delegateeId: identityId, isActive: true });
    const delegatedPower = delegations.reduce((sum, d) => sum + d.votingPowerPercent, 0);
    return Math.min(100, delegatedPower);
  }

  grantNodeAccess(identityId: IdentityId, grant: Omit<NodeAccessGrant, 'grantedAt'>): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    this.identities.set(identityId, {
      ...i,
      nodeAccess: { ...grant, grantedAt: new Date() },
    });

    this.emitEvent('identity_granted', 'info', 'Identity',
      `Node access granted: ${grant.nodeId} (${grant.nodeType})`, {
        identityId,
        nodeId: grant.nodeId,
        accessLevel: grant.accessLevel,
      });
  }

  revokeNodeAccess(identityId: IdentityId, _nodeId: string): void {
    const i = this.identities.get(identityId);
    if (!i) throw new Error(`Identity not found: ${identityId}`);

    const { nodeAccess: _, ...withoutNode } = i;
    this.identities.set(identityId, withoutNode as AIFOSIdentity);

    this.emitEvent('identity_revoked', 'info', 'Identity', `Node access revoked`, { identityId });
  }

  registerComplianceGate(gate: Omit<ComplianceGate, 'gateId'>): ComplianceGate {
    const gateId = `gate-${++this.gateCounter}-${Date.now()}`;
    const newGate: ComplianceGate = { ...gate, gateId };
    this.complianceGates.set(gateId, newGate);
    return { ...newGate };
  }

  getComplianceGate(gateId: string): ComplianceGate | undefined {
    const g = this.complianceGates.get(gateId);
    return g ? { ...g } : undefined;
  }

  listComplianceGates(): ComplianceGate[] {
    return Array.from(this.complianceGates.values()).map(g => ({ ...g }));
  }

  passesComplianceGate(identityId: IdentityId, gateId: string): ComplianceCheckResult {
    const gate = this.complianceGates.get(gateId);
    if (!gate) throw new Error(`Compliance gate not found: ${gateId}`);

    const identity = this.identities.get(identityId);
    const failureReasons: string[] = [];

    if (!identity) {
      failureReasons.push('Identity not found');
      return { passed: false, gate, failureReasons, checkedAt: new Date() };
    }

    // KYC level check
    const kycOrder: AIFOSIdentity['kycLevel'][] = ['none', 'basic', 'institutional', 'sovereign'];
    const identityKycIdx = kycOrder.indexOf(identity.kycLevel);
    const requiredKycIdx = kycOrder.indexOf(gate.requiredKycLevel);
    if (identityKycIdx < requiredKycIdx) {
      failureReasons.push(`Insufficient KYC level: ${identity.kycLevel} < ${gate.requiredKycLevel}`);
    }

    // Jurisdiction checks
    if (identity.jurisdiction && gate.blockedJurisdictions.includes(identity.jurisdiction)) {
      failureReasons.push(`Jurisdiction blocked: ${identity.jurisdiction}`);
    }

    // Role checks
    if (gate.requiredRoles.length > 0) {
      const hasRequiredRole = gate.requiredRoles.some(r => identity.roles.includes(r));
      if (!hasRequiredRole) {
        failureReasons.push(`Missing required role: ${gate.requiredRoles.join(' or ')}`);
      }
    }

    return {
      passed: failureReasons.length === 0,
      gate,
      failureReasons,
      checkedAt: new Date(),
    };
  }

  onEvent(callback: AIFOSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private initializeBuiltinComplianceGates(): void {
    if (!this.config.enableComplianceGating) return;

    this.registerComplianceGate({
      name: 'Institutional Capital Access',
      requiredKycLevel: 'institutional',
      requiredJurisdictions: [],
      blockedJurisdictions: [],
      requiredRoles: ['institutional_node', 'sovereign_node', 'kernel_admin'],
      enforcedOn: ['capital_allocate', 'module_deploy'],
      isActive: true,
    });

    this.registerComplianceGate({
      name: 'Sovereign Operations Gate',
      requiredKycLevel: 'sovereign',
      requiredJurisdictions: [],
      blockedJurisdictions: [],
      requiredRoles: ['sovereign_node', 'kernel_admin'],
      enforcedOn: ['governance_propose', 'emergency_action'],
      isActive: true,
    });
  }

  private emitEvent(
    type: AIFOSEventType,
    severity: AIFOSEvent['severity'],
    source: string,
    message: string,
    data: Record<string, unknown>,
  ): void {
    const event: AIFOSEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPermissionIdentityLayer(config?: Partial<PermissionIdentityConfig>): DefaultPermissionIdentityLayer {
  return new DefaultPermissionIdentityLayer(config);
}

export default DefaultPermissionIdentityLayer;
