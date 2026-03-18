/**
 * TONAIAgent - Tenant Manager
 *
 * Core tenant lifecycle management. Handles provisioning, suspension,
 * and termination of tenants with full audit trail.
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

import {
  Tenant,
  TenantStatus,
  TenantTier,
  TenantLimits,
  TenantSettings,
  TenantContext,
  CreateTenantInput,
  TenantUser,
  RoleName,
  MultiTenantEvent,
  MultiTenantEventCallback,
} from './types';

// ============================================================================
// Default Limits by Tier
// ============================================================================

const TIER_LIMITS: Record<TenantTier, TenantLimits> = {
  free: {
    maxAgents: 1,
    maxUsers: 2,
    maxWallets: 1,
    maxSecretsPerAgent: 5,
    maxDailyTransactions: 10,
    maxMonthlyVolumeTon: 100,
    storageQuotaMb: 100,
    apiRateLimitPerMinute: 30,
  },
  starter: {
    maxAgents: 5,
    maxUsers: 10,
    maxWallets: 10,
    maxSecretsPerAgent: 20,
    maxDailyTransactions: 100,
    maxMonthlyVolumeTon: 10000,
    storageQuotaMb: 1024,
    apiRateLimitPerMinute: 120,
  },
  professional: {
    maxAgents: 25,
    maxUsers: 50,
    maxWallets: 50,
    maxSecretsPerAgent: 50,
    maxDailyTransactions: 1000,
    maxMonthlyVolumeTon: 100000,
    storageQuotaMb: 10240,
    apiRateLimitPerMinute: 600,
  },
  enterprise: {
    maxAgents: 1000,
    maxUsers: 10000,
    maxWallets: 5000,
    maxSecretsPerAgent: 200,
    maxDailyTransactions: 100000,
    maxMonthlyVolumeTon: 10000000,
    storageQuotaMb: 1048576,
    apiRateLimitPerMinute: 10000,
  },
  dao: {
    maxAgents: 500,
    maxUsers: 100000,
    maxWallets: 2000,
    maxSecretsPerAgent: 100,
    maxDailyTransactions: 50000,
    maxMonthlyVolumeTon: 5000000,
    storageQuotaMb: 524288,
    apiRateLimitPerMinute: 5000,
  },
};

const DEFAULT_SETTINGS: TenantSettings = {
  enforceMfa: false,
  allowedCustodyModes: ['non_custodial', 'smart_contract_wallet', 'mpc'],
  auditLogRetentionDays: 90,
  complianceMode: 'standard',
};

// ============================================================================
// Tenant Manager
// ============================================================================

export class TenantManager {
  private readonly tenants = new Map<string, Tenant>();
  private readonly tenantUsers = new Map<string, TenantUser[]>(); // tenantId → users
  private readonly eventCallbacks: MultiTenantEventCallback[] = [];

  /**
   * Provision a new tenant with isolated configuration.
   */
  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const tier = input.tier ?? 'free';

    const tenant: Tenant = {
      id: tenantId,
      name: input.name,
      status: 'active',
      tier,
      ownerId: input.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        description: input.metadata?.description,
        contactEmail: input.metadata?.contactEmail,
        industry: input.metadata?.industry,
        country: input.metadata?.country,
        tags: input.metadata?.tags ?? [],
      },
      limits: { ...TIER_LIMITS[tier] },
      settings: { ...DEFAULT_SETTINGS, ...input.settings },
    };

    this.tenants.set(tenantId, tenant);
    this.tenantUsers.set(tenantId, []);

    // Assign owner as admin
    await this.assignUserRole(tenantId, input.ownerId, 'admin', 'system');

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'tenant_created',
      tenantId,
      severity: 'low',
      source: 'tenant_manager',
      message: `Tenant "${input.name}" created with tier "${tier}"`,
      data: { tenantId, tier, ownerId: input.ownerId },
    });

    return tenant;
  }

  /**
   * Retrieve a tenant by ID.
   */
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * List all tenants (admin operation).
   */
  listTenants(status?: TenantStatus): Tenant[] {
    const all = Array.from(this.tenants.values());
    return status ? all.filter((t) => t.status === status) : all;
  }

  /**
   * Update tenant settings or metadata.
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<Pick<Tenant, 'name' | 'metadata' | 'settings'>>
  ): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const updated: Tenant = {
      ...tenant,
      name: updates.name ?? tenant.name,
      metadata: updates.metadata ? { ...tenant.metadata, ...updates.metadata } : tenant.metadata,
      settings: updates.settings ? { ...tenant.settings, ...updates.settings } : tenant.settings,
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updated);
    return updated;
  }

  /**
   * Upgrade/downgrade tenant tier, updating limits accordingly.
   */
  async changeTier(tenantId: string, newTier: TenantTier): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const updated: Tenant = {
      ...tenant,
      tier: newTier,
      limits: { ...TIER_LIMITS[newTier] },
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updated);
    return updated;
  }

  /**
   * Suspend a tenant, halting all agent operations.
   */
  async suspendTenant(tenantId: string, reason: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    if (tenant.status === 'terminated') {
      throw new Error(`Cannot suspend terminated tenant: ${tenantId}`);
    }

    const updated: Tenant = { ...tenant, status: 'suspended', updatedAt: new Date() };
    this.tenants.set(tenantId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'tenant_suspended',
      tenantId,
      severity: 'high',
      source: 'tenant_manager',
      message: `Tenant "${tenant.name}" suspended: ${reason}`,
      data: { tenantId, reason },
    });

    return updated;
  }

  /**
   * Restore a suspended tenant.
   */
  async resumeTenant(tenantId: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    if (tenant.status !== 'suspended') {
      throw new Error(`Tenant is not suspended: ${tenantId}`);
    }

    const updated: Tenant = { ...tenant, status: 'active', updatedAt: new Date() };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  /**
   * Permanently terminate a tenant (irreversible).
   */
  async terminateTenant(tenantId: string, reason: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const updated: Tenant = { ...tenant, status: 'terminated', updatedAt: new Date() };
    this.tenants.set(tenantId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'tenant_terminated',
      tenantId,
      severity: 'critical',
      source: 'tenant_manager',
      message: `Tenant "${tenant.name}" terminated: ${reason}`,
      data: { tenantId, reason },
    });

    return updated;
  }

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Assign a role to a user within a tenant.
   */
  async assignUserRole(
    tenantId: string,
    userId: string,
    role: RoleName,
    assignedBy: string
  ): Promise<TenantUser> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const users = this.tenantUsers.get(tenantId) ?? [];
    const existingIndex = users.findIndex((u) => u.userId === userId);

    if (existingIndex >= 0) {
      // Add role if not already present
      const existing = users[existingIndex];
      if (!existing.roles.includes(role)) {
        users[existingIndex] = {
          ...existing,
          roles: [...existing.roles, role],
          assignedAt: new Date(),
          assignedBy,
        };
      }
      this.tenantUsers.set(tenantId, users);
      return users[existingIndex];
    }

    const tenantUser: TenantUser = {
      id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      userId,
      roles: [role],
      assignedAt: new Date(),
      assignedBy,
      status: 'active',
      mfaEnabled: tenant.settings.enforceMfa,
    };

    users.push(tenantUser);
    this.tenantUsers.set(tenantId, users);

    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'user_role_assigned',
      tenantId,
      severity: 'low',
      source: 'tenant_manager',
      message: `Role "${role}" assigned to user "${userId}" in tenant "${tenantId}"`,
      data: { tenantId, userId, role, assignedBy },
    });

    return tenantUser;
  }

  /**
   * Remove a role from a user within a tenant.
   */
  async removeUserRole(tenantId: string, userId: string, role: RoleName): Promise<void> {
    const users = this.tenantUsers.get(tenantId) ?? [];
    const userIndex = users.findIndex((u) => u.userId === userId);

    if (userIndex < 0) {
      throw new Error(`User ${userId} not found in tenant ${tenantId}`);
    }

    users[userIndex] = {
      ...users[userIndex],
      roles: users[userIndex].roles.filter((r) => r !== role),
    };

    this.tenantUsers.set(tenantId, users);
  }

  /**
   * Get all users and their roles for a tenant.
   */
  getTenantUsers(tenantId: string): TenantUser[] {
    return this.tenantUsers.get(tenantId) ?? [];
  }

  /**
   * Get a user's roles within a specific tenant.
   */
  getUserRoles(tenantId: string, userId: string): RoleName[] {
    const users = this.tenantUsers.get(tenantId) ?? [];
    const user = users.find((u) => u.userId === userId);
    return user?.roles ?? [];
  }

  /**
   * Build a TenantContext for a given user and session.
   */
  buildContext(
    tenantId: string,
    userId: string,
    sessionId: string,
    agentId?: string
  ): TenantContext {
    const roles = this.getUserRoles(tenantId, userId);
    return {
      tenantId,
      userId,
      agentId,
      sessionId,
      roles,
      permissions: [], // Resolved by RbacManager
      timestamp: new Date(),
    };
  }

  /**
   * Verify tenant is active and within allowed limits.
   */
  verifyTenantAccess(tenantId: string): { allowed: boolean; reason?: string } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { allowed: false, reason: 'Tenant not found' };
    }
    if (tenant.status === 'suspended') {
      return { allowed: false, reason: 'Tenant is suspended' };
    }
    if (tenant.status === 'terminated') {
      return { allowed: false, reason: 'Tenant is terminated' };
    }
    return { allowed: true };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: MultiTenantEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: MultiTenantEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createTenantManager(): TenantManager {
  return new TenantManager();
}

export { TIER_LIMITS, DEFAULT_SETTINGS };
