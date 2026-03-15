/**
 * TONAIAgent - Multi-User Portfolio Permissions
 *
 * Role-based permission system for multi-user portfolio management.
 * Defines roles (Owner, Manager, Analyst, Viewer) and their capabilities.
 */

import {
  PortfolioRoleName,
  PortfolioRole,
  PortfolioPermission,
  PortfolioResourceType,
  PortfolioActionType,
  PortfolioAccessCheckRequest,
  PortfolioAccessCheckResult,
  PortfolioMember,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';

// ============================================================================
// System Roles Definition
// ============================================================================

export const PORTFOLIO_ROLES: Record<PortfolioRoleName, PortfolioRole> = {
  owner: {
    name: 'owner',
    displayName: 'Portfolio Owner',
    description: 'Full control over the portfolio, including managing members, executing trades, and configuring settings.',
    permissions: [
      { resource: 'portfolio', action: 'create' },
      { resource: 'portfolio', action: 'read' },
      { resource: 'portfolio', action: 'update' },
      { resource: 'portfolio', action: 'delete' },
      { resource: 'fund', action: 'create' },
      { resource: 'fund', action: 'read' },
      { resource: 'fund', action: 'update' },
      { resource: 'fund', action: 'delete' },
      { resource: 'strategy', action: 'create' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'update' },
      { resource: 'strategy', action: 'delete' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'strategy', action: 'approve' },
      { resource: 'allocation', action: 'create' },
      { resource: 'allocation', action: 'read' },
      { resource: 'allocation', action: 'update' },
      { resource: 'allocation', action: 'delete' },
      { resource: 'trade', action: 'create' },
      { resource: 'trade', action: 'read' },
      { resource: 'trade', action: 'execute' },
      { resource: 'trade', action: 'approve' },
      { resource: 'analytics', action: 'read' },
      { resource: 'analytics', action: 'export' },
      { resource: 'activity_log', action: 'read' },
      { resource: 'activity_log', action: 'export' },
      { resource: 'member', action: 'create' },
      { resource: 'member', action: 'read' },
      { resource: 'member', action: 'update' },
      { resource: 'member', action: 'delete' },
      { resource: 'member', action: 'invite' },
      { resource: 'report', action: 'create' },
      { resource: 'report', action: 'read' },
      { resource: 'report', action: 'export' },
    ],
  },

  manager: {
    name: 'manager',
    displayName: 'Portfolio Manager',
    description: 'Can create and modify allocations, execute trades, and review strategy proposals. Cannot delete portfolios or manage owner-level settings.',
    inherits: ['analyst'],
    permissions: [
      { resource: 'portfolio', action: 'read' },
      { resource: 'portfolio', action: 'update' },
      { resource: 'fund', action: 'read' },
      { resource: 'fund', action: 'update' },
      { resource: 'strategy', action: 'create' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'update' },
      { resource: 'strategy', action: 'execute' },
      { resource: 'strategy', action: 'approve' },
      { resource: 'allocation', action: 'create' },
      { resource: 'allocation', action: 'read' },
      { resource: 'allocation', action: 'update' },
      { resource: 'trade', action: 'create' },
      { resource: 'trade', action: 'read' },
      { resource: 'trade', action: 'execute' },
      { resource: 'trade', action: 'approve' },
      { resource: 'analytics', action: 'read' },
      { resource: 'analytics', action: 'export' },
      { resource: 'activity_log', action: 'read' },
      { resource: 'member', action: 'read' },
      { resource: 'report', action: 'create' },
      { resource: 'report', action: 'read' },
      { resource: 'report', action: 'export' },
    ],
  },

  analyst: {
    name: 'analyst',
    displayName: 'Portfolio Analyst',
    description: 'Can view portfolio data and propose strategy changes, but cannot execute trades or approve changes.',
    inherits: ['viewer'],
    permissions: [
      { resource: 'portfolio', action: 'read' },
      { resource: 'fund', action: 'read' },
      { resource: 'strategy', action: 'read' },
      { resource: 'strategy', action: 'propose' },
      { resource: 'allocation', action: 'read' },
      { resource: 'trade', action: 'read' },
      { resource: 'analytics', action: 'read' },
      { resource: 'analytics', action: 'export' },
      { resource: 'activity_log', action: 'read' },
      { resource: 'member', action: 'read' },
      { resource: 'report', action: 'read' },
    ],
  },

  viewer: {
    name: 'viewer',
    displayName: 'Portfolio Viewer',
    description: 'Read-only access to portfolio performance, strategy allocations, and trade activity.',
    permissions: [
      { resource: 'portfolio', action: 'read' },
      { resource: 'fund', action: 'read' },
      { resource: 'strategy', action: 'read' },
      { resource: 'allocation', action: 'read' },
      { resource: 'trade', action: 'read' },
      { resource: 'analytics', action: 'read' },
      { resource: 'activity_log', action: 'read' },
      { resource: 'member', action: 'read' },
      { resource: 'report', action: 'read' },
    ],
  },
};

// ============================================================================
// Portfolio Permissions Manager
// ============================================================================

export interface PortfolioPermissionsManager {
  getRole(role: PortfolioRoleName): PortfolioRole;
  resolvePermissions(role: PortfolioRoleName): PortfolioPermission[];
  hasPermission(role: PortfolioRoleName, resource: PortfolioResourceType, action: PortfolioActionType): boolean;
  checkAccess(request: PortfolioAccessCheckRequest, members: PortfolioMember[]): PortfolioAccessCheckResult;
  listRoles(): PortfolioRole[];
  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

export class DefaultPortfolioPermissionsManager implements PortfolioPermissionsManager {
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];

  getRole(role: PortfolioRoleName): PortfolioRole {
    const r = PORTFOLIO_ROLES[role];
    if (!r) {
      throw new Error(`Unknown portfolio role: ${role}`);
    }
    return r;
  }

  resolvePermissions(role: PortfolioRoleName): PortfolioPermission[] {
    const resolved = new Map<string, PortfolioPermission>();
    const roleObj = this.getRole(role);

    // Add inherited permissions first
    if (roleObj.inherits) {
      for (const inheritedRole of roleObj.inherits) {
        const inheritedPerms = this.resolvePermissions(inheritedRole);
        for (const perm of inheritedPerms) {
          resolved.set(`${perm.resource}:${perm.action}`, perm);
        }
      }
    }

    // Add own permissions (override inherited)
    for (const perm of roleObj.permissions) {
      resolved.set(`${perm.resource}:${perm.action}`, perm);
    }

    return Array.from(resolved.values());
  }

  hasPermission(
    role: PortfolioRoleName,
    resource: PortfolioResourceType,
    action: PortfolioActionType,
  ): boolean {
    const permissions = this.resolvePermissions(role);
    return permissions.some(p => p.resource === resource && p.action === action);
  }

  checkAccess(
    request: PortfolioAccessCheckRequest,
    members: PortfolioMember[],
  ): PortfolioAccessCheckResult {
    const member = members.find(
      m => m.portfolioId === request.portfolioId && m.userId === request.userId,
    );

    if (!member) {
      this.emitEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        type: 'access_denied',
        portfolioId: request.portfolioId,
        actorId: request.userId,
        severity: 'warning',
        source: 'PortfolioPermissionsManager',
        message: `Access denied: user ${request.userId} is not a member of portfolio ${request.portfolioId}`,
        data: { resource: request.resource, action: request.action },
      });

      return {
        allowed: false,
        reason: 'User is not a member of this portfolio',
      };
    }

    if (member.status !== 'active') {
      return {
        allowed: false,
        reason: `Member status is '${member.status}' — only active members can perform actions`,
        userRole: member.role,
      };
    }

    const allowed = this.hasPermission(member.role, request.resource, request.action);

    if (!allowed) {
      this.emitEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        type: 'access_denied',
        portfolioId: request.portfolioId,
        actorId: request.userId,
        severity: 'warning',
        source: 'PortfolioPermissionsManager',
        message: `Access denied: role '${member.role}' cannot perform '${request.action}' on '${request.resource}'`,
        data: { resource: request.resource, action: request.action, role: member.role },
      });

      const requiredRoles = this.findRolesWithPermission(request.resource, request.action);
      return {
        allowed: false,
        reason: `Role '${member.role}' does not have permission to ${request.action} ${request.resource}`,
        requiredRoles,
        userRole: member.role,
      };
    }

    return {
      allowed: true,
      reason: `Role '${member.role}' has permission to ${request.action} ${request.resource}`,
      userRole: member.role,
    };
  }

  listRoles(): PortfolioRole[] {
    return Object.values(PORTFOLIO_ROLES);
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private findRolesWithPermission(
    resource: PortfolioResourceType,
    action: PortfolioActionType,
  ): PortfolioRoleName[] {
    return (Object.keys(PORTFOLIO_ROLES) as PortfolioRoleName[]).filter(role =>
      this.hasPermission(role, resource, action),
    );
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createPortfolioPermissionsManager(): DefaultPortfolioPermissionsManager {
  return new DefaultPortfolioPermissionsManager();
}
