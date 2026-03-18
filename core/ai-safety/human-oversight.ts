/**
 * TONAIAgent - Human Oversight & Control Module
 *
 * Supports human-in-the-loop operations:
 * - Manual overrides
 * - Emergency stop functionality
 * - Multi-layer approval workflows
 * - Supervisory dashboards
 */

import {
  HumanOversightConfig,
  OverrideAction,
  HumanOverride,
  EmergencyState,
  ApprovalRequest,
  SafetyLevel,
  AISafetyEvent,
  AISafetyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface HumanOversightManager {
  // Configuration
  configure(config: Partial<HumanOversightConfig>): HumanOversightConfig;
  getConfig(): HumanOversightConfig;

  // Override Operations
  executeOverride(override: OverrideInput): Promise<HumanOverride>;
  getOverrideHistory(agentId: string, limit?: number): HumanOverride[];
  revertOverride(overrideId: string): Promise<void>;
  getActiveOverrides(agentId?: string): HumanOverride[];

  // Emergency Controls
  activateEmergencyStop(input: EmergencyStopInput): Promise<void>;
  deactivateEmergencyStop(deactivatedBy: string): Promise<void>;
  pauseAgent(agentId: string, reason: string, pausedBy: string): Promise<void>;
  resumeAgent(agentId: string, resumedBy: string): Promise<void>;
  getEmergencyState(): EmergencyState;
  getAgentStates(): Map<string, AgentState>;

  // Approval Workflow
  requestApproval(request: ApprovalRequestInput): Promise<ApprovalRequest>;
  submitApproval(requestId: string, approval: ApprovalInput): Promise<void>;
  getApprovalRequest(requestId: string): ApprovalRequest | null;
  getPendingApprovals(approverId?: string): ApprovalRequest[];
  cancelApprovalRequest(requestId: string, cancelledBy: string): Promise<void>;
  checkApprovalStatus(requestId: string): ApprovalStatus;

  // Dashboard
  getDashboardData(): DashboardData;
  getAgentMetrics(agentId: string): AgentMetrics;
  getSystemHealth(): SystemHealth;

  // Events
  onEvent(callback: AISafetyEventCallback): void;
}

export interface OverrideInput {
  action: OverrideAction;
  agentId: string;
  operatorId: string;
  reason: string;
  parameters?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface EmergencyStopInput {
  activatedBy: string;
  reason: string;
  affectedAgents?: string[];
  expectedResolution?: Date;
}

export interface AgentState {
  agentId: string;
  status: 'active' | 'paused' | 'stopped';
  pausedAt?: Date;
  pausedBy?: string;
  reason?: string;
}

export interface ApprovalRequestInput {
  agentId: string;
  action: string;
  parameters: Record<string, unknown>;
  requestedBy: string;
  requiredLevel: number;
  expiresIn?: number; // minutes
}

export interface ApprovalInput {
  approverId: string;
  decision: 'approved' | 'denied';
  reason?: string;
}

export interface ApprovalStatus {
  requestId: string;
  status: ApprovalRequest['status'];
  currentLevel: number;
  approvalCount: number;
  requiredApprovals: number;
  remainingApprovers: string[];
}

export interface DashboardData {
  systemStatus: 'operational' | 'degraded' | 'emergency';
  activeAgents: number;
  pausedAgents: number;
  pendingApprovals: number;
  recentOverrides: HumanOverride[];
  alerts: DashboardAlert[];
  metrics: DashboardMetrics;
}

export interface DashboardAlert {
  id: string;
  severity: SafetyLevel;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface DashboardMetrics {
  totalTransactions24h: number;
  blockedTransactions24h: number;
  overridesUsed24h: number;
  avgApprovalTime: number;
  agentUptime: number;
}

export interface AgentMetrics {
  agentId: string;
  status: AgentState['status'];
  uptime: number;
  transactionCount: number;
  blockedCount: number;
  overrideCount: number;
  lastActivity: Date;
  riskScore: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  components: ComponentHealth[];
  lastCheck: Date;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  latencyMs: number;
  errorRate: number;
  message?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_HUMAN_OVERSIGHT_CONFIG: HumanOversightConfig = {
  enabled: true,
  overrides: {
    enabled: true,
    allowedActions: ['pause_agent', 'resume_agent', 'cancel_transaction', 'modify_parameters', 'emergency_stop'],
    requireReason: true,
    auditLog: true,
  },
  emergencyControls: {
    enabled: true,
    killSwitchEnabled: true,
    pauseAllEnabled: true,
    triggers: [
      { type: 'manual', action: 'stop', cooldown: 0 },
      {
        type: 'automatic',
        condition: { field: 'anomalyCount', operator: 'gt', value: 10 },
        action: 'pause',
        cooldown: 300,
      },
    ],
    notifications: {
      channels: ['email', 'webhook'],
      recipients: [],
      template: 'emergency_alert',
      urgency: 'critical',
    },
  },
  approvalWorkflow: {
    enabled: true,
    levels: [
      { level: 1, name: 'Standard', requiredApprovers: 1, approverRoles: ['trader'], threshold: { type: 'value', min: 0, max: 1000 } },
      { level: 2, name: 'Elevated', requiredApprovers: 2, approverRoles: ['trader', 'risk_manager'], threshold: { type: 'value', min: 1000, max: 10000 } },
      { level: 3, name: 'Critical', requiredApprovers: 3, approverRoles: ['risk_manager', 'admin'], threshold: { type: 'value', min: 10000 } },
    ],
    timeouts: [
      { level: 1, timeout: 60, action: 'auto_approve' },
      { level: 2, timeout: 120, action: 'escalate' },
      { level: 3, timeout: 240, action: 'deny' },
    ],
    escalation: true,
  },
  dashboard: {
    enabled: true,
    refreshInterval: 30,
    widgets: [
      { id: 'system_status', type: 'status', title: 'System Status', dataSource: 'system', config: {} },
      { id: 'agent_overview', type: 'table', title: 'Agent Overview', dataSource: 'agents', config: {} },
      { id: 'pending_approvals', type: 'table', title: 'Pending Approvals', dataSource: 'approvals', config: {} },
      { id: 'recent_alerts', type: 'alert', title: 'Recent Alerts', dataSource: 'alerts', config: {} },
    ],
  },
};

// ============================================================================
// Human Oversight Manager Implementation
// ============================================================================

export class DefaultHumanOversightManager implements HumanOversightManager {
  private config: HumanOversightConfig;
  private readonly overrides = new Map<string, HumanOverride>();
  private readonly overridesByAgent = new Map<string, string[]>();
  private readonly agentStates = new Map<string, AgentState>();
  private readonly approvalRequests = new Map<string, ApprovalRequest>();
  private emergencyState: EmergencyState;
  private readonly dashboardAlerts: DashboardAlert[] = [];
  private readonly eventCallbacks: AISafetyEventCallback[] = [];
  private overrideCounter = 0;
  private requestCounter = 0;
  private alertCounter = 0;

  constructor(config?: Partial<HumanOversightConfig>) {
    this.config = { ...DEFAULT_HUMAN_OVERSIGHT_CONFIG, ...config };
    this.emergencyState = {
      active: false,
      type: 'none',
      triggeredBy: '',
      reason: '',
      affectedAgents: [],
    };
  }

  // ========== Configuration ==========

  configure(config: Partial<HumanOversightConfig>): HumanOversightConfig {
    this.config = {
      ...this.config,
      ...config,
      overrides: { ...this.config.overrides, ...config.overrides },
      emergencyControls: { ...this.config.emergencyControls, ...config.emergencyControls },
      approvalWorkflow: { ...this.config.approvalWorkflow, ...config.approvalWorkflow },
      dashboard: { ...this.config.dashboard, ...config.dashboard },
    };
    return this.config;
  }

  getConfig(): HumanOversightConfig {
    return { ...this.config };
  }

  // ========== Override Operations ==========

  async executeOverride(input: OverrideInput): Promise<HumanOverride> {
    if (!this.config.overrides.allowedActions.includes(input.action)) {
      throw new Error(`Override action not allowed: ${input.action}`);
    }

    if (this.config.overrides.requireReason && !input.reason) {
      throw new Error('Reason is required for override');
    }

    // Get current state
    const agentState = this.agentStates.get(input.agentId) || { agentId: input.agentId, status: 'active' };
    const previousState: Record<string, unknown> = { ...agentState };

    // Execute override action
    const newState: Record<string, unknown> = { ...previousState };

    switch (input.action) {
      case 'pause_agent':
        await this.pauseAgent(input.agentId, input.reason, input.operatorId);
        newState.status = 'paused';
        break;
      case 'resume_agent':
        await this.resumeAgent(input.agentId, input.operatorId);
        newState.status = 'active';
        break;
      case 'emergency_stop':
        await this.activateEmergencyStop({
          activatedBy: input.operatorId,
          reason: input.reason,
          affectedAgents: [input.agentId],
        });
        newState.status = 'stopped';
        break;
      case 'modify_parameters':
        newState.parameters = input.parameters;
        break;
    }

    const override: HumanOverride = {
      id: this.generateOverrideId(),
      action: input.action,
      agentId: input.agentId,
      operatorId: input.operatorId,
      reason: input.reason,
      previousState,
      newState,
      timestamp: new Date(),
      expiresAt: input.expiresAt,
    };

    this.overrides.set(override.id, override);

    if (!this.overridesByAgent.has(input.agentId)) {
      this.overridesByAgent.set(input.agentId, []);
    }
    this.overridesByAgent.get(input.agentId)!.push(override.id);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'human_override',
      agentId: input.agentId,
      severity: input.action === 'emergency_stop' ? 'critical' : 'high',
      description: `Override executed: ${input.action}`,
      details: { ...override } as Record<string, unknown>,
      metadata: {},
    });

    return override;
  }

  getOverrideHistory(agentId: string, limit: number = 50): HumanOverride[] {
    const ids = this.overridesByAgent.get(agentId) || [];
    return ids
      .slice(-limit)
      .map((id) => this.overrides.get(id))
      .filter((o): o is HumanOverride => o !== undefined)
      .reverse();
  }

  async revertOverride(overrideId: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new Error(`Override not found: ${overrideId}`);
    }

    // Restore previous state
    const agentState = this.agentStates.get(override.agentId);
    if (agentState && override.previousState.status) {
      agentState.status = override.previousState.status as AgentState['status'];
    }
  }

  getActiveOverrides(agentId?: string): HumanOverride[] {
    const now = new Date();
    let overrides = Array.from(this.overrides.values());

    if (agentId) {
      overrides = overrides.filter((o) => o.agentId === agentId);
    }

    return overrides.filter((o) => !o.expiresAt || o.expiresAt > now);
  }

  // ========== Emergency Controls ==========

  async activateEmergencyStop(input: EmergencyStopInput): Promise<void> {
    this.emergencyState = {
      active: true,
      type: 'stop',
      triggeredBy: input.activatedBy,
      triggeredAt: new Date(),
      reason: input.reason,
      affectedAgents: input.affectedAgents || [],
      expectedResolution: input.expectedResolution,
    };

    // Stop all affected agents
    const agentsToStop = input.affectedAgents || Array.from(this.agentStates.keys());
    for (const agentId of agentsToStop) {
      this.agentStates.set(agentId, {
        agentId,
        status: 'stopped',
        pausedAt: new Date(),
        pausedBy: input.activatedBy,
        reason: input.reason,
      });
    }

    // Add dashboard alert
    this.addDashboardAlert({
      severity: 'critical',
      title: 'Emergency Stop Activated',
      message: input.reason,
    });

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_action',
      severity: 'critical',
      description: `Emergency stop activated by ${input.activatedBy}`,
      details: { ...input } as Record<string, unknown>,
      metadata: {},
    });
  }

  async deactivateEmergencyStop(deactivatedBy: string): Promise<void> {
    if (!this.emergencyState.active) {
      return;
    }

    const previousState = { ...this.emergencyState };

    this.emergencyState = {
      active: false,
      type: 'none',
      triggeredBy: '',
      reason: '',
      affectedAgents: [],
    };

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_action',
      severity: 'high',
      description: `Emergency stop deactivated by ${deactivatedBy}`,
      details: { previousState, deactivatedBy },
      metadata: {},
    });
  }

  async pauseAgent(agentId: string, reason: string, pausedBy: string): Promise<void> {
    this.agentStates.set(agentId, {
      agentId,
      status: 'paused',
      pausedAt: new Date(),
      pausedBy,
      reason,
    });
  }

  async resumeAgent(agentId: string, _resumedBy: string): Promise<void> {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.status = 'active';
      state.pausedAt = undefined;
      state.pausedBy = undefined;
      state.reason = undefined;
    }
  }

  getEmergencyState(): EmergencyState {
    return { ...this.emergencyState };
  }

  getAgentStates(): Map<string, AgentState> {
    return new Map(this.agentStates);
  }

  // ========== Approval Workflow ==========

  async requestApproval(input: ApprovalRequestInput): Promise<ApprovalRequest> {
    const level = this.config.approvalWorkflow.levels.find((l) => l.level === input.requiredLevel);
    if (!level) {
      throw new Error(`Approval level not found: ${input.requiredLevel}`);
    }

    const timeout = this.config.approvalWorkflow.timeouts.find((t) => t.level === input.requiredLevel);
    const expiresAt = new Date(Date.now() + (input.expiresIn || timeout?.timeout || 120) * 60 * 1000);

    const request: ApprovalRequest = {
      id: this.generateRequestId(),
      agentId: input.agentId,
      action: input.action,
      parameters: input.parameters,
      requestedAt: new Date(),
      level: input.requiredLevel,
      status: 'pending',
      approvals: [],
      expiresAt,
    };

    this.approvalRequests.set(request.id, request);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'human_override',
      agentId: input.agentId,
      severity: 'medium',
      description: `Approval requested for ${input.action}`,
      details: { ...request } as Record<string, unknown>,
      metadata: {},
    });

    return request;
  }

  async submitApproval(requestId: string, approval: ApprovalInput): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is no longer pending: ${request.status}`);
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      throw new Error('Approval request has expired');
    }

    // Add approval
    request.approvals.push({
      approverId: approval.approverId,
      decision: approval.decision,
      reason: approval.reason,
      timestamp: new Date(),
    });

    // Check if request should be approved or denied
    const level = this.config.approvalWorkflow.levels.find((l) => l.level === request.level);
    const requiredApprovals = level?.requiredApprovers || 1;

    const approveCount = request.approvals.filter((a) => a.decision === 'approved').length;
    const denyCount = request.approvals.filter((a) => a.decision === 'denied').length;

    if (approveCount >= requiredApprovals) {
      request.status = 'approved';
    } else if (denyCount > 0) {
      request.status = 'denied';
    }
  }

  getApprovalRequest(requestId: string): ApprovalRequest | null {
    return this.approvalRequests.get(requestId) || null;
  }

  getPendingApprovals(_approverId?: string): ApprovalRequest[] {
    const pending = Array.from(this.approvalRequests.values()).filter(
      (r) => r.status === 'pending' && new Date() < r.expiresAt
    );

    // In production, would filter by approver's role
    return pending;
  }

  async cancelApprovalRequest(requestId: string, _cancelledBy: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (request && request.status === 'pending') {
      request.status = 'cancelled' as ApprovalRequest['status'];
    }
  }

  checkApprovalStatus(requestId: string): ApprovalStatus {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    const level = this.config.approvalWorkflow.levels.find((l) => l.level === request.level);
    const requiredApprovals = level?.requiredApprovers || 1;
    const approvalCount = request.approvals.filter((a) => a.decision === 'approved').length;

    return {
      requestId,
      status: request.status,
      currentLevel: request.level,
      approvalCount,
      requiredApprovals,
      remainingApprovers: [], // Would calculate based on roles
    };
  }

  // ========== Dashboard ==========

  getDashboardData(): DashboardData {
    const agents = Array.from(this.agentStates.values());

    return {
      systemStatus: this.emergencyState.active ? 'emergency' : 'operational',
      activeAgents: agents.filter((a) => a.status === 'active').length,
      pausedAgents: agents.filter((a) => a.status === 'paused').length,
      pendingApprovals: this.getPendingApprovals().length,
      recentOverrides: Array.from(this.overrides.values())
        .slice(-10)
        .reverse(),
      alerts: this.dashboardAlerts.slice(-10).reverse(),
      metrics: {
        totalTransactions24h: 0, // Would be calculated from activity
        blockedTransactions24h: 0,
        overridesUsed24h: this.getRecentOverrideCount(),
        avgApprovalTime: this.calculateAvgApprovalTime(),
        agentUptime: 99.9,
      },
    };
  }

  getAgentMetrics(agentId: string): AgentMetrics {
    const state = this.agentStates.get(agentId);
    const overrideCount = (this.overridesByAgent.get(agentId) || []).length;

    return {
      agentId,
      status: state?.status || 'active',
      uptime: 99.5,
      transactionCount: 0, // Would be calculated from activity
      blockedCount: 0,
      overrideCount,
      lastActivity: new Date(),
      riskScore: 25,
    };
  }

  getSystemHealth(): SystemHealth {
    const components: ComponentHealth[] = [
      { name: 'AI Layer', status: 'healthy', latencyMs: 150, errorRate: 0.01 },
      { name: 'Safety System', status: 'healthy', latencyMs: 50, errorRate: 0 },
      { name: 'Monitoring', status: 'healthy', latencyMs: 100, errorRate: 0.005 },
      { name: 'Approval Engine', status: 'healthy', latencyMs: 75, errorRate: 0 },
    ];

    const hasWarning = components.some((c) => c.status === 'warning');
    const hasCritical = components.some((c) => c.status === 'critical');

    return {
      overall: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
      components,
      lastCheck: new Date(),
    };
  }

  // ========== Events ==========

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ========== Private Helpers ==========

  private generateOverrideId(): string {
    this.overrideCounter++;
    return `override_${Date.now()}_${this.overrideCounter.toString(36)}`;
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `request_${Date.now()}_${this.requestCounter.toString(36)}`;
  }

  private generateAlertId(): string {
    this.alertCounter++;
    return `alert_${Date.now()}_${this.alertCounter.toString(36)}`;
  }

  private addDashboardAlert(input: { severity: SafetyLevel; title: string; message: string }): void {
    this.dashboardAlerts.push({
      id: this.generateAlertId(),
      severity: input.severity,
      title: input.title,
      message: input.message,
      timestamp: new Date(),
      acknowledged: false,
    });
  }

  private getRecentOverrideCount(): number {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return Array.from(this.overrides.values()).filter((o) => o.timestamp > cutoff).length;
  }

  private calculateAvgApprovalTime(): number {
    const approved = Array.from(this.approvalRequests.values()).filter(
      (r) => r.status === 'approved' && r.approvals.length > 0
    );

    if (approved.length === 0) return 0;

    const totalTime = approved.reduce((sum, r) => {
      const lastApproval = r.approvals[r.approvals.length - 1];
      return sum + (lastApproval.timestamp.getTime() - r.requestedAt.getTime());
    }, 0);

    return totalTime / approved.length / 1000 / 60; // minutes
  }

  private emitEvent(event: AISafetyEvent): void {
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
// Factory Function
// ============================================================================

export function createHumanOversightManager(config?: Partial<HumanOversightConfig>): DefaultHumanOversightManager {
  return new DefaultHumanOversightManager(config);
}
