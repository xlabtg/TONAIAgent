/**
 * TONAIAgent - Admin Dashboard MVP Service
 *
 * Professional admin system for monitoring agents, risk control,
 * emergency controls, fraud detection, and strategy moderation.
 */

import type {
  AdminConfig,
  AdminRole,
  AdminPermissions,
  SystemMetrics,
  RiskAlert,
  ModerationAction,
  MVPEvent,
  MVPEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default admin configuration
 */
export const defaultAdminConfig: AdminConfig = {
  enabled: true,
  riskControl: true,
  emergencyControls: true,
  fraudDetection: true,
  kycFlags: true,
  strategyModeration: true,
  blockingEnabled: true,
  reportingEnabled: true,
};

/**
 * Role-based permissions
 */
export const rolePermissions: Record<AdminRole, AdminPermissions> = {
  viewer: {
    viewUsers: true,
    viewAgents: true,
    viewMetrics: true,
    pauseAgents: false,
    viewLogs: false,
    manageUsers: false,
    manageAgents: false,
    manageAdmins: false,
    emergencyActions: false,
  },
  operator: {
    viewUsers: true,
    viewAgents: true,
    viewMetrics: true,
    pauseAgents: true,
    viewLogs: true,
    manageUsers: false,
    manageAgents: false,
    manageAdmins: false,
    emergencyActions: false,
  },
  admin: {
    viewUsers: true,
    viewAgents: true,
    viewMetrics: true,
    pauseAgents: true,
    viewLogs: true,
    manageUsers: true,
    manageAgents: true,
    manageAdmins: false,
    emergencyActions: false,
  },
  superadmin: {
    viewUsers: true,
    viewAgents: true,
    viewMetrics: true,
    pauseAgents: true,
    viewLogs: true,
    manageUsers: true,
    manageAgents: true,
    manageAdmins: true,
    emergencyActions: true,
  },
};

// ============================================================================
// Admin Dashboard Manager
// ============================================================================

/**
 * Admin Dashboard Manager for MVP
 *
 * Provides comprehensive admin functionality for platform management.
 */
export class AdminDashboardManager {
  readonly config: AdminConfig;

  private readonly admins: Map<string, Admin> = new Map();
  private readonly alerts: Map<string, RiskAlert> = new Map();
  private readonly moderationActions: Map<string, ModerationAction> = new Map();
  private readonly blockedEntities: Map<string, BlockedEntity> = new Map();
  private readonly auditLog: AuditEntry[] = [];
  private readonly eventCallbacks: MVPEventCallback[] = [];

  // Simulated metrics (in production, would be from real data)
  private metrics: SystemMetrics;

  constructor(config: Partial<AdminConfig> = {}) {
    this.config = {
      ...defaultAdminConfig,
      ...config,
    };

    this.metrics = this.createDefaultMetrics();
  }

  // ============================================================================
  // Admin Management
  // ============================================================================

  /**
   * Create admin account
   */
  async createAdmin(
    creatorId: string,
    input: CreateAdminInput
  ): Promise<Admin> {
    const creator = this.admins.get(creatorId);
    if (!creator || !creator.permissions.manageAdmins) {
      throw new Error('Insufficient permissions to create admin');
    }

    const admin: Admin = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: input.userId,
      username: input.username,
      email: input.email,
      role: input.role,
      permissions: rolePermissions[input.role],
      isActive: true,
      createdAt: new Date(),
      createdBy: creatorId,
      lastActiveAt: new Date(),
    };

    this.admins.set(admin.id, admin);
    this.logAuditEntry('admin_created', creatorId, admin.id, { role: input.role });

    return admin;
  }

  /**
   * Get admin by ID
   */
  getAdmin(adminId: string): Admin | undefined {
    return this.admins.get(adminId);
  }

  /**
   * List all admins
   */
  listAdmins(): Admin[] {
    return Array.from(this.admins.values());
  }

  /**
   * Update admin role
   */
  async updateAdminRole(
    updaterId: string,
    adminId: string,
    newRole: AdminRole
  ): Promise<Admin> {
    const updater = this.admins.get(updaterId);
    if (!updater || !updater.permissions.manageAdmins) {
      throw new Error('Insufficient permissions');
    }

    const admin = this.admins.get(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    admin.role = newRole;
    admin.permissions = rolePermissions[newRole];
    this.admins.set(adminId, admin);

    this.logAuditEntry('admin_role_updated', updaterId, adminId, {
      newRole,
    });

    return admin;
  }

  /**
   * Deactivate admin
   */
  async deactivateAdmin(updaterId: string, adminId: string): Promise<void> {
    const updater = this.admins.get(updaterId);
    if (!updater || !updater.permissions.manageAdmins) {
      throw new Error('Insufficient permissions');
    }

    const admin = this.admins.get(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    admin.isActive = false;
    this.admins.set(adminId, admin);

    this.logAuditEntry('admin_deactivated', updaterId, adminId, {});
  }

  /**
   * Initialize with root admin
   */
  initializeRootAdmin(userId: string, username: string): Admin {
    const rootAdmin: Admin = {
      id: 'admin_root',
      userId,
      username,
      email: 'admin@tonaiagent.io',
      role: 'superadmin',
      permissions: rolePermissions.superadmin,
      isActive: true,
      createdAt: new Date(),
      createdBy: 'system',
      lastActiveAt: new Date(),
    };

    this.admins.set(rootAdmin.id, rootAdmin);
    return rootAdmin;
  }

  // ============================================================================
  // System Metrics
  // ============================================================================

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Update system metrics (called periodically)
   */
  updateMetrics(updates: Partial<SystemMetrics>): void {
    this.metrics = {
      ...this.metrics,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Get metric history (simplified for MVP)
   */
  getMetricHistory(
    metric: keyof SystemMetrics,
    _period: '24h' | '7d' | '30d'
  ): Array<{ timestamp: Date; value: number }> {
    // In production, would return historical data
    // For MVP, return simulated trend
    const points: Array<{ timestamp: Date; value: number }> = [];
    const currentValue = this.metrics[metric] as number;
    const now = new Date();

    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const variance = 1 + (Math.random() - 0.5) * 0.1;
      points.push({
        timestamp,
        value: currentValue * variance,
      });
    }

    return points;
  }

  // ============================================================================
  // Risk Alerts
  // ============================================================================

  /**
   * Create risk alert
   */
  createAlert(input: CreateAlertInput): RiskAlert {
    const alert: RiskAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description,
      entityId: input.entityId,
      entityType: input.entityType,
      recommendedAction: input.recommendedAction,
      isResolved: false,
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent({
      type: 'risk_alert',
      timestamp: new Date(),
      data: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        entityId: alert.entityId,
      },
    });

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.alerts.values())
      .filter((a) => !a.isResolved)
      .sort((a, b) => {
        // Sort by severity then date
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): RiskAlert[] {
    return Array.from(this.alerts.values()).filter(
      (a) => a.severity === severity && !a.isResolved
    );
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    adminId: string,
    alertId: string,
    notes?: string
  ): Promise<RiskAlert> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.viewLogs) {
      throw new Error('Insufficient permissions');
    }

    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.isResolved = true;
    alert.resolvedBy = adminId;
    alert.resolutionNotes = notes;
    alert.resolvedAt = new Date();

    this.alerts.set(alertId, alert);
    this.logAuditEntry('alert_resolved', adminId, alertId, { notes });

    return alert;
  }

  // ============================================================================
  // Moderation Actions
  // ============================================================================

  /**
   * Warn user
   */
  async warnUser(
    adminId: string,
    userId: string,
    reason: string
  ): Promise<ModerationAction> {
    return this.createModerationAction(adminId, 'warn', userId, 'user', reason);
  }

  /**
   * Pause agent
   */
  async pauseAgent(
    adminId: string,
    agentId: string,
    reason: string
  ): Promise<ModerationAction> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.pauseAgents) {
      throw new Error('Insufficient permissions to pause agents');
    }

    return this.createModerationAction(adminId, 'pause', agentId, 'agent', reason);
  }

  /**
   * Block entity
   */
  async blockEntity(
    adminId: string,
    entityId: string,
    entityType: 'user' | 'agent' | 'strategy',
    reason: string,
    expiresAt?: Date
  ): Promise<ModerationAction> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.manageUsers) {
      throw new Error('Insufficient permissions');
    }

    const action = await this.createModerationAction(
      adminId,
      'block',
      entityId,
      entityType,
      reason,
      expiresAt
    );

    // Track blocked entity
    this.blockedEntities.set(entityId, {
      entityId,
      entityType,
      reason,
      blockedAt: new Date(),
      blockedBy: adminId,
      expiresAt,
    });

    return action;
  }

  /**
   * Unblock entity
   */
  async unblockEntity(
    adminId: string,
    entityId: string,
    entityType: 'user' | 'agent' | 'strategy'
  ): Promise<ModerationAction> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.manageUsers) {
      throw new Error('Insufficient permissions');
    }

    this.blockedEntities.delete(entityId);

    return this.createModerationAction(
      adminId,
      'unblock',
      entityId,
      entityType,
      'Unblocked by admin'
    );
  }

  /**
   * Check if entity is blocked
   */
  isBlocked(entityId: string): boolean {
    const blocked = this.blockedEntities.get(entityId);
    if (!blocked) return false;

    // Check if block has expired
    if (blocked.expiresAt && blocked.expiresAt < new Date()) {
      this.blockedEntities.delete(entityId);
      return false;
    }

    return true;
  }

  /**
   * Verify strategy (mark as verified)
   */
  async verifyStrategy(
    adminId: string,
    strategyId: string
  ): Promise<ModerationAction> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.manageAgents) {
      throw new Error('Insufficient permissions');
    }

    return this.createModerationAction(
      adminId,
      'verify',
      strategyId,
      'strategy',
      'Verified by admin review'
    );
  }

  /**
   * Flag entity for review
   */
  async flagForReview(
    adminId: string,
    entityId: string,
    entityType: 'user' | 'agent' | 'strategy',
    reason: string
  ): Promise<ModerationAction> {
    return this.createModerationAction(adminId, 'flag', entityId, entityType, reason);
  }

  /**
   * Get moderation history for entity
   */
  getModerationHistory(entityId: string): ModerationAction[] {
    return Array.from(this.moderationActions.values())
      .filter((a) => a.targetId === entityId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  // ============================================================================
  // Emergency Controls
  // ============================================================================

  /**
   * Emergency pause all agents
   */
  async emergencyPauseAll(adminId: string, reason: string): Promise<void> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.emergencyActions) {
      throw new Error('Insufficient permissions for emergency actions');
    }

    this.logAuditEntry('emergency_pause_all', adminId, 'system', { reason });

    this.emitEvent({
      type: 'admin_action',
      timestamp: new Date(),
      data: {
        action: 'emergency_pause_all',
        adminId,
        reason,
      },
    });
  }

  /**
   * Emergency halt withdrawals
   */
  async emergencyHaltWithdrawals(adminId: string, reason: string): Promise<void> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.emergencyActions) {
      throw new Error('Insufficient permissions for emergency actions');
    }

    this.logAuditEntry('emergency_halt_withdrawals', adminId, 'system', { reason });

    this.emitEvent({
      type: 'admin_action',
      timestamp: new Date(),
      data: {
        action: 'emergency_halt_withdrawals',
        adminId,
        reason,
      },
    });
  }

  /**
   * Resume normal operations
   */
  async resumeOperations(adminId: string): Promise<void> {
    const admin = this.admins.get(adminId);
    if (!admin || !admin.permissions.emergencyActions) {
      throw new Error('Insufficient permissions');
    }

    this.logAuditEntry('resume_operations', adminId, 'system', {});

    this.emitEvent({
      type: 'admin_action',
      timestamp: new Date(),
      data: {
        action: 'resume_operations',
        adminId,
      },
    });
  }

  // ============================================================================
  // Audit Log
  // ============================================================================

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: AuditLogFilter): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filter?.adminId) {
      entries = entries.filter((e) => e.adminId === filter.adminId);
    }
    if (filter?.action) {
      entries = entries.filter((e) => e.action === filter.action);
    }
    if (filter?.targetId) {
      entries = entries.filter((e) => e.targetId === filter.targetId);
    }
    if (filter?.startDate) {
      entries = entries.filter((e) => e.timestamp >= filter.startDate!);
    }
    if (filter?.endDate) {
      entries = entries.filter((e) => e.timestamp <= filter.endDate!);
    }

    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, filter?.limit ?? 100);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to events
   */
  onEvent(callback: MVPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(event: MVPEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create moderation action
   */
  private async createModerationAction(
    adminId: string,
    type: ModerationAction['type'],
    targetId: string,
    targetType: 'user' | 'agent' | 'strategy',
    reason: string,
    expiresAt?: Date
  ): Promise<ModerationAction> {
    const action: ModerationAction = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      targetId,
      targetType,
      reason,
      performedBy: adminId,
      performedAt: new Date(),
      expiresAt,
    };

    this.moderationActions.set(action.id, action);
    this.logAuditEntry(`moderation_${type}`, adminId, targetId, {
      targetType,
      reason,
    });

    this.emitEvent({
      type: 'admin_action',
      timestamp: new Date(),
      userId: targetType === 'user' ? targetId : undefined,
      agentId: targetType === 'agent' ? targetId : undefined,
      strategyId: targetType === 'strategy' ? targetId : undefined,
      data: {
        actionType: type,
        adminId,
        reason,
      },
    });

    return action;
  }

  /**
   * Log audit entry
   */
  private logAuditEntry(
    action: string,
    adminId: string,
    targetId: string,
    metadata: Record<string, unknown>
  ): void {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      adminId,
      targetId,
      metadata,
      timestamp: new Date(),
      ipAddress: 'system', // Would be actual IP in production
    };

    this.auditLog.push(entry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }
  }

  /**
   * Create default metrics
   */
  private createDefaultMetrics(): SystemMetrics {
    return {
      totalUsers: 0,
      dau: 0,
      mau: 0,
      totalAgents: 0,
      activeAgents: 0,
      tvlUsd: 0,
      volume24h: 0,
      totalStrategies: 0,
      activeStrategies: 0,
      revenue24h: 0,
      revenue30d: 0,
      newUsers24h: 0,
      newAgents24h: 0,
      systemHealth: 'healthy',
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Admin user
 */
export interface Admin {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  lastActiveAt: Date;
}

/**
 * Create admin input
 */
export interface CreateAdminInput {
  userId: string;
  username: string;
  email: string;
  role: AdminRole;
}

/**
 * Create alert input
 */
export interface CreateAlertInput {
  type: RiskAlert['type'];
  severity: RiskAlert['severity'];
  title: string;
  description: string;
  entityId: string;
  entityType: RiskAlert['entityType'];
  recommendedAction?: string;
}

/**
 * Blocked entity record
 */
export interface BlockedEntity {
  entityId: string;
  entityType: 'user' | 'agent' | 'strategy';
  reason: string;
  blockedAt: Date;
  blockedBy: string;
  expiresAt?: Date;
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  action: string;
  adminId: string;
  targetId: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  ipAddress: string;
}

/**
 * Audit log filter
 */
export interface AuditLogFilter {
  adminId?: string;
  action?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create Admin Dashboard Manager
 */
export function createAdminDashboardManager(
  config?: Partial<AdminConfig>
): AdminDashboardManager {
  return new AdminDashboardManager(config);
}
