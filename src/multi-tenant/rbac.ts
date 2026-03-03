/**
 * TONAIAgent - Role-Based Access Control (RBAC)
 *
 * Granular permission framework with role inheritance, policy evaluation,
 * and tenant-scoped access control for agents, wallets, and strategies.
 *
 * Roles: admin, user, developer, enterprise, dao_operator, auditor, readonly
 *
 * Issue #99: Secure Multi-Tenant Agent Infrastructure & Isolation Layer
 */

import {
  Role,
  RoleName,
  Permission,
  ResourceType,
  ActionType,
  RbacPolicy,
  AccessCheckRequest,
  AccessCheckResult,
  TenantContext,
  MultiTenantEvent,
  MultiTenantEventCallback,
} from './types';

// ============================================================================
// Built-in Role Definitions
// ============================================================================

const SYSTEM_ROLES: Record<RoleName, Role> = {
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full access to all tenant resources',
    isSystemRole: true,
    permissions: [
      // Full access — wildcard via role check
      { resource: 'agent', action: 'create' },
      { resource: 'agent', action: 'read' },
      { resource: 'agent', action: 'update' },
      { resource: 'agent', action: 'delete' },
      { resource: 'agent', action: 'execute' },
      { resource: 'agent', action: 'suspend' },
      { resource: 'wallet', action: 'create' },
      { resource: 'wallet', action: 'read' },
      { resource: 'wallet', action: 'update' },
      { resource: 'wallet', action: 'delete' },
      { resource: 'wallet', action: 'approve' },
      { resource: 'secret', action: 'create' },
      { resource: 'secret', action: 'read' },
      { resource: 'secret', action: 'update' },
      { resource: 'secret', action: 'delete' },
      { resource: 'strategy', action: 'create' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'update' },
      { resource: 'strategy', action: 'delete' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'transaction', action: 'read' },
      { resource: 'transaction', action: 'approve' },
      { resource: 'user', action: 'read' },
      { resource: 'user', action: 'update' },
      { resource: 'user', action: 'manage_permissions' },
      { resource: 'tenant', action: 'read' },
      { resource: 'tenant', action: 'update' },
      { resource: 'api_key', action: 'create' },
      { resource: 'api_key', action: 'read' },
      { resource: 'api_key', action: 'delete' },
      { resource: 'audit_log', action: 'read' },
      { resource: 'audit_log', action: 'export' },
      { resource: 'marketplace', action: 'read' },
      { resource: 'marketplace', action: 'create' },
      { resource: 'dashboard', action: 'read' },
    ],
  },

  user: {
    name: 'user',
    displayName: 'User',
    description: 'Standard user — can create and manage own agents',
    isSystemRole: true,
    permissions: [
      { resource: 'agent', action: 'create' },
      { resource: 'agent', action: 'read' },
      { resource: 'agent', action: 'update' },
      { resource: 'agent', action: 'execute' },
      { resource: 'wallet', action: 'read' },
      { resource: 'wallet', action: 'update' },
      { resource: 'strategy', action: 'create' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'update' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'transaction', action: 'read' },
      { resource: 'transaction', action: 'approve' },
      { resource: 'secret', action: 'create' },
      { resource: 'secret', action: 'update' },
      { resource: 'marketplace', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ],
  },

  developer: {
    name: 'developer',
    displayName: 'Developer',
    description: 'Developer access — can manage APIs, deploy strategies, and view logs',
    isSystemRole: true,
    inherits: ['user'],
    permissions: [
      { resource: 'api_key', action: 'create' },
      { resource: 'api_key', action: 'read' },
      { resource: 'api_key', action: 'delete' },
      { resource: 'audit_log', action: 'read' },
      { resource: 'agent', action: 'create' },
      { resource: 'agent', action: 'read' },
      { resource: 'agent', action: 'update' },
      { resource: 'agent', action: 'execute' },
      { resource: 'agent', action: 'delete' },
      { resource: 'strategy', action: 'create' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'update' },
      { resource: 'strategy', action: 'delete' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'wallet', action: 'read' },
      { resource: 'secret', action: 'create' },
      { resource: 'secret', action: 'read' },
      { resource: 'secret', action: 'update' },
      { resource: 'dashboard', action: 'read' },
    ],
  },

  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise Manager',
    description: 'Enterprise access — includes compliance, custody, and institutional features',
    isSystemRole: true,
    inherits: ['developer'],
    permissions: [
      { resource: 'wallet', action: 'create' },
      { resource: 'wallet', action: 'approve' },
      { resource: 'transaction', action: 'approve' },
      { resource: 'audit_log', action: 'export' },
      { resource: 'user', action: 'read' },
      { resource: 'user', action: 'update' },
      { resource: 'tenant', action: 'read' },
      { resource: 'marketplace', action: 'create' },
    ],
  },

  dao_operator: {
    name: 'dao_operator',
    displayName: 'DAO Operator',
    description: 'DAO governance — can manage collective strategies and governance operations',
    isSystemRole: true,
    permissions: [
      { resource: 'agent', action: 'read' },
      { resource: 'agent', action: 'execute' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'strategy', action: 'create' },
      { resource: 'transaction', action: 'read' },
      { resource: 'transaction', action: 'approve' },
      { resource: 'wallet', action: 'read' },
      { resource: 'wallet', action: 'approve' },
      { resource: 'audit_log', action: 'read' },
      { resource: 'dashboard', action: 'read' },
      { resource: 'marketplace', action: 'read' },
      { resource: 'marketplace', action: 'create' },
    ],
  },

  auditor: {
    name: 'auditor',
    displayName: 'Auditor',
    description: 'Read-only access to audit logs and compliance reports',
    isSystemRole: true,
    permissions: [
      { resource: 'audit_log', action: 'read' },
      { resource: 'audit_log', action: 'export' },
      { resource: 'transaction', action: 'read' },
      { resource: 'agent', action: 'read' },
      { resource: 'wallet', action: 'read' },
      { resource: 'dashboard', action: 'read' },
    ],
  },

  readonly: {
    name: 'readonly',
    displayName: 'Read Only',
    description: 'Read access to non-sensitive resources only',
    isSystemRole: true,
    permissions: [
      { resource: 'agent', action: 'read' },
      { resource: 'strategy', action: 'read' },
      { resource: 'transaction', action: 'read' },
      { resource: 'dashboard', action: 'read' },
      { resource: 'marketplace', action: 'read' },
    ],
  },
};

// ============================================================================
// RBAC Manager
// ============================================================================

export class RbacManager {
  private readonly customPolicies = new Map<string, RbacPolicy[]>(); // tenantId → policies
  private readonly eventCallbacks: MultiTenantEventCallback[] = [];

  /**
   * Get a built-in system role definition.
   */
  getRole(role: RoleName): Role {
    return SYSTEM_ROLES[role];
  }

  /**
   * Get all permissions for a set of roles, including inherited roles.
   */
  resolvePermissions(roles: RoleName[]): Permission[] {
    const permSet = new Set<string>();
    const resolved: Permission[] = [];

    const processRole = (roleName: RoleName, visited = new Set<RoleName>()): void => {
      if (visited.has(roleName)) return; // prevent circular inheritance
      visited.add(roleName);

      const role = SYSTEM_ROLES[roleName];
      if (!role) return;

      // Process inherited roles first
      for (const inherited of role.inherits ?? []) {
        processRole(inherited, visited);
      }

      // Add this role's permissions
      for (const perm of role.permissions) {
        const key = `${perm.resource}:${perm.action}`;
        if (!permSet.has(key)) {
          permSet.add(key);
          resolved.push(perm);
        }
      }
    };

    for (const role of roles) {
      processRole(role);
    }

    return resolved;
  }

  /**
   * Check if a given set of roles has permission to perform an action on a resource.
   */
  hasPermission(
    roles: RoleName[],
    resource: ResourceType,
    action: ActionType
  ): boolean {
    // Admin always has full access
    if (roles.includes('admin')) return true;

    const permissions = this.resolvePermissions(roles);
    return permissions.some((p) => p.resource === resource && p.action === action);
  }

  /**
   * Evaluate an access check request against RBAC rules and custom tenant policies.
   */
  checkAccess(request: AccessCheckRequest): AccessCheckResult {
    // Check tenant-level custom deny policies first (higher priority)
    const tenantPolicies = this.customPolicies.get(request.tenantId) ?? [];
    const sorted = [...tenantPolicies].sort((a, b) => b.priority - a.priority);

    for (const policy of sorted) {
      if (!policy.enabled) continue;
      if (
        policy.resources.includes(request.resource) &&
        policy.actions.includes(request.action) &&
        policy.roles.some((r) => request.roles.includes(r))
      ) {
        const conditionsPassed = this.evaluateConditions(
          policy.conditions ?? [],
          request
        );
        if (conditionsPassed) {
          if (policy.effect === 'deny') {
            this.emitEvent({
              id: `evt_${Date.now()}`,
              timestamp: new Date(),
              type: 'access_denied',
              tenantId: request.tenantId,
              severity: 'medium',
              source: 'rbac',
              message: `Access denied by policy "${policy.name}" for user "${request.userId}"`,
              data: { userId: request.userId, resource: request.resource, action: request.action, policy: policy.name },
            });
            return {
              allowed: false,
              reason: `Denied by policy: ${policy.name}`,
              matchedPolicy: policy.id,
            };
          }
          // Policy explicitly allows
          return {
            allowed: true,
            reason: `Allowed by policy: ${policy.name}`,
            matchedPolicy: policy.id,
          };
        }
      }
    }

    // Fall back to role-based check
    const allowed = this.hasPermission(request.roles, request.resource, request.action);

    if (!allowed) {
      this.emitEvent({
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type: 'access_denied',
        tenantId: request.tenantId,
        severity: 'low',
        source: 'rbac',
        message: `Access denied: user "${request.userId}" lacks permission for ${request.resource}:${request.action}`,
        data: {
          userId: request.userId,
          resource: request.resource,
          action: request.action,
          roles: request.roles,
        },
      });
    }

    return {
      allowed,
      reason: allowed
        ? `Role-based access granted`
        : `Insufficient permissions for ${request.resource}:${request.action}`,
      requiredRoles: allowed ? undefined : this.getRolesWithPermission(request.resource, request.action),
    };
  }

  /**
   * Add a custom RBAC policy for a tenant.
   */
  addPolicy(policy: RbacPolicy): void {
    const existing = this.customPolicies.get(policy.tenantId) ?? [];
    existing.push(policy);
    this.customPolicies.set(policy.tenantId, existing);
  }

  /**
   * Remove a custom policy by ID.
   */
  removePolicy(tenantId: string, policyId: string): boolean {
    const policies = this.customPolicies.get(tenantId) ?? [];
    const filtered = policies.filter((p) => p.id !== policyId);
    if (filtered.length === policies.length) return false;
    this.customPolicies.set(tenantId, filtered);
    return true;
  }

  /**
   * List all custom policies for a tenant.
   */
  listPolicies(tenantId: string): RbacPolicy[] {
    return this.customPolicies.get(tenantId) ?? [];
  }

  /**
   * Enrich a TenantContext with resolved permissions.
   */
  enrichContext(context: TenantContext): TenantContext {
    return {
      ...context,
      permissions: this.resolvePermissions(context.roles),
    };
  }

  /**
   * List all available system roles.
   */
  listRoles(): Role[] {
    return Object.values(SYSTEM_ROLES);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private evaluateConditions(
    conditions: RbacPolicy['conditions'],
    request: AccessCheckRequest
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      const contextValue = (request.context ?? {})[cond.field];
      switch (cond.operator) {
        case 'equals':
          return contextValue === cond.value;
        case 'not_equals':
          return contextValue !== cond.value;
        case 'in':
          return Array.isArray(cond.value) && cond.value.includes(contextValue as string);
        case 'not_in':
          return Array.isArray(cond.value) && !cond.value.includes(contextValue as string);
        case 'owned_by':
          return contextValue === request.userId;
        default:
          return true;
      }
    });
  }

  private getRolesWithPermission(resource: ResourceType, action: ActionType): RoleName[] {
    return (Object.keys(SYSTEM_ROLES) as RoleName[]).filter((roleName) =>
      this.hasPermission([roleName], resource, action)
    );
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

export function createRbacManager(): RbacManager {
  return new RbacManager();
}

export { SYSTEM_ROLES };
