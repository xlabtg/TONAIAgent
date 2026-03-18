/**
 * TONAIAgent - Governance Controller
 *
 * Manages governance actions, emergency controls, and system-wide policies
 * for the multi-agent coordination framework.
 */

import {
  GovernanceConfig,
  GovernanceAction,
  GovernanceActionType,
  GovernanceController,
  MultiAgentEvent,
  MultiAgentMetrics,
  MultiAgentObservabilityConfig,
} from '../types';
import { MessageBus, createMessage } from '../communication';

// ============================================================================
// Default Governance Controller Implementation
// ============================================================================

export class DefaultGovernanceController implements GovernanceController {
  private config: GovernanceConfig;
  private actions: Map<string, GovernanceAction> = new Map();
  private actionHistory: GovernanceAction[] = [];
  private emergencyStopActive: boolean = false;
  private emergencyStopReason?: string;
  private emergencyStopInitiator?: string;
  private eventCallback?: (event: MultiAgentEvent) => void;
  private messageBus?: MessageBus;
  private maxHistorySize: number;

  constructor(options?: GovernanceControllerOptions) {
    this.config = options?.config ?? {
      enabled: true,
      emergencyStopEnabled: true,
      requireApprovalForSpawn: true,
      maxAgentsPerUser: 10,
      maxSwarmsPerUser: 3,
      auditLogging: true,
    };
    this.eventCallback = options?.eventCallback;
    this.messageBus = options?.messageBus;
    this.maxHistorySize = options?.maxHistorySize ?? 1000;
  }

  async requestAction(
    action: Omit<GovernanceAction, 'id' | 'status' | 'createdAt'>
  ): Promise<GovernanceAction> {
    const governanceAction: GovernanceAction = {
      id: `gov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...action,
      status: 'pending',
      createdAt: new Date(),
    };

    this.actions.set(governanceAction.id, governanceAction);

    this.emitEvent('governance_action_requested', {
      actionId: governanceAction.id,
      type: governanceAction.type,
      targetType: governanceAction.targetType,
      targetId: governanceAction.targetId,
      initiator: governanceAction.initiator,
    });

    // Auto-approve certain low-risk actions
    if (this.canAutoApprove(governanceAction)) {
      await this.approveAction(governanceAction.id, 'system');
    }

    return governanceAction;
  }

  async approveAction(actionId: string, approver: string): Promise<boolean> {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }

    if (action.status !== 'pending') {
      return false;
    }

    action.status = 'approved';

    this.emitEvent('governance_action_approved', {
      actionId,
      approver,
      type: action.type,
    });

    // Auto-execute if configured
    return this.executeAction(actionId);
  }

  async rejectAction(actionId: string, reason: string): Promise<boolean> {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }

    if (action.status !== 'pending') {
      return false;
    }

    action.status = 'rejected';

    this.emitEvent('governance_action_rejected', {
      actionId,
      reason,
      type: action.type,
    });

    // Move to history
    this.addToHistory(action);
    this.actions.delete(actionId);

    return true;
  }

  async executeAction(actionId: string): Promise<boolean> {
    const action = this.actions.get(actionId);
    if (!action) {
      return false;
    }

    if (action.status !== 'approved') {
      return false;
    }

    try {
      switch (action.type) {
        case 'spawn_agent':
          await this.executeSpawnAgent(action);
          break;
        case 'terminate_agent':
          await this.executeTerminateAgent(action);
          break;
        case 'pause_agent':
          await this.executePauseAgent(action);
          break;
        case 'resume_agent':
          await this.executeResumeAgent(action);
          break;
        case 'emergency_stop':
          await this.emergencyStop(action.reason, action.initiator);
          break;
        case 'create_swarm':
          await this.executeCreateSwarm(action);
          break;
        case 'dissolve_swarm':
          await this.executeDissolveSwarm(action);
          break;
        default:
          // Generic execution
          break;
      }

      action.status = 'executed';
      action.executedAt = new Date();
      action.executedBy = 'system';

      this.emitEvent('governance_action_executed', {
        actionId,
        type: action.type,
        targetId: action.targetId,
      });

      // Move to history
      this.addToHistory(action);
      this.actions.delete(actionId);

      return true;
    } catch (error) {
      this.emitEvent('governance_action_failed', {
        actionId,
        type: action.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'error');

      return false;
    }
  }

  getPendingActions(): GovernanceAction[] {
    return Array.from(this.actions.values()).filter(
      (a) => a.status === 'pending'
    );
  }

  getActionHistory(limit?: number): GovernanceAction[] {
    return limit ? this.actionHistory.slice(-limit) : this.actionHistory;
  }

  async emergencyStop(reason: string, initiator: string): Promise<void> {
    if (!this.config.emergencyStopEnabled) {
      throw new Error('Emergency stop is disabled');
    }

    this.emergencyStopActive = true;
    this.emergencyStopReason = reason;
    this.emergencyStopInitiator = initiator;

    // Broadcast emergency stop to all agents
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        payload: {
          type: 'control_command',
          command: 'emergency_stop' as const,
          reason,
          initiator,
        },
        priority: 'critical',
      });

      await this.messageBus.publish(message);
    }

    this.emitEvent('emergency_stop_activated', {
      reason,
      initiator,
    }, 'critical');
  }

  async resume(initiator: string): Promise<void> {
    if (!this.emergencyStopActive) {
      return;
    }

    this.emergencyStopActive = false;
    this.emergencyStopReason = undefined;
    this.emergencyStopInitiator = undefined;

    // Broadcast resume to all agents
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        payload: {
          type: 'control_command',
          command: 'resume' as const,
          reason: 'Emergency stop lifted',
          initiator,
        },
        priority: 'critical',
      });

      await this.messageBus.publish(message);
    }

    this.emitEvent('emergency_stop_deactivated', {
      initiator,
    });
  }

  isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  getEmergencyStopInfo(): EmergencyStopInfo | null {
    if (!this.emergencyStopActive) {
      return null;
    }

    return {
      active: true,
      reason: this.emergencyStopReason,
      initiator: this.emergencyStopInitiator,
    };
  }

  // ============================================================================
  // Additional Methods
  // ============================================================================

  getConfig(): GovernanceConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<GovernanceConfig>): void {
    this.config = { ...this.config, ...updates };

    this.emitEvent('governance_config_updated', {
      updates,
    });
  }

  getStats(): GovernanceStats {
    const history = this.actionHistory;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const action of history) {
      byType[action.type] = (byType[action.type] ?? 0) + 1;
      byStatus[action.status] = (byStatus[action.status] ?? 0) + 1;
    }

    return {
      totalActions: history.length,
      pendingActions: this.getPendingActions().length,
      byType,
      byStatus,
      emergencyStopCount: history.filter((a) => a.type === 'emergency_stop').length,
      emergencyStopActive: this.emergencyStopActive,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private canAutoApprove(action: GovernanceAction): boolean {
    // Auto-approve low-risk actions
    const autoApprovable: GovernanceActionType[] = [
      'update_config',
    ];

    return autoApprovable.includes(action.type);
  }

  private async executeSpawnAgent(_action: GovernanceAction): Promise<void> {
    // Agent spawning is handled by the SwarmCoordinator
    // This is just for governance tracking
  }

  private async executeTerminateAgent(action: GovernanceAction): Promise<void> {
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        targetId: action.targetId,
        payload: {
          type: 'control_command',
          command: 'terminate' as const,
          reason: action.reason,
          initiator: action.initiator,
        },
        priority: 'high',
      });

      await this.messageBus.publish(message);
    }
  }

  private async executePauseAgent(action: GovernanceAction): Promise<void> {
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        targetId: action.targetId,
        payload: {
          type: 'control_command',
          command: 'pause' as const,
          reason: action.reason,
          initiator: action.initiator,
        },
        priority: 'high',
      });

      await this.messageBus.publish(message);
    }
  }

  private async executeResumeAgent(action: GovernanceAction): Promise<void> {
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        targetId: action.targetId,
        payload: {
          type: 'control_command',
          command: 'resume' as const,
          reason: action.reason,
          initiator: action.initiator,
        },
        priority: 'high',
      });

      await this.messageBus.publish(message);
    }
  }

  private async executeCreateSwarm(_action: GovernanceAction): Promise<void> {
    // Swarm creation is handled by the SwarmCoordinator
    // This is just for governance tracking
  }

  private async executeDissolveSwarm(action: GovernanceAction): Promise<void> {
    if (this.messageBus) {
      const message = createMessage({
        type: 'control_command',
        senderId: 'governance',
        senderRole: 'coordinator',
        targetRole: 'coordinator',
        payload: {
          type: 'control_command',
          command: 'terminate' as const,
          reason: action.reason,
          initiator: action.initiator,
          parameters: { swarmId: action.targetId },
        },
        priority: 'high',
      });

      await this.messageBus.publish(message);
    }
  }

  private addToHistory(action: GovernanceAction): void {
    this.actionHistory.push(action);

    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }
  }

  private emitEvent(
    type: string,
    data: Record<string, unknown>,
    severity: MultiAgentEvent['severity'] = 'info'
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `gov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: type as never,
      source: 'governance',
      sourceRole: 'coordinator',
      data,
      severity,
    });
  }
}

// ============================================================================
// Multi-Agent Metrics Collector
// ============================================================================

export class MetricsCollector {
  private metrics: MultiAgentMetrics;
  private eventHistory: MultiAgentEvent[] = [];
  private config: MultiAgentObservabilityConfig;
  private maxHistorySize: number;

  constructor(options?: MetricsCollectorOptions) {
    this.config = options?.config ?? {
      enabled: true,
      logLevel: 'info',
      metricsEnabled: true,
      tracingEnabled: false,
      samplingRate: 1.0,
      retentionDays: 30,
    };
    this.maxHistorySize = options?.maxHistorySize ?? 10000;
    this.metrics = this.initMetrics();
  }

  recordEvent(event: MultiAgentEvent): void {
    if (!this.config.enabled || !this.config.metricsEnabled) {
      return;
    }

    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    this.eventHistory.push(event);

    // Trim history
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Update metrics based on event type
    this.updateMetrics(event);
  }

  getMetrics(): MultiAgentMetrics {
    return { ...this.metrics, timestamp: new Date() };
  }

  getEventHistory(filter?: EventHistoryFilter): MultiAgentEvent[] {
    let events = this.eventHistory;

    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type);
    }

    if (filter?.source) {
      events = events.filter((e) => e.source === filter.source);
    }

    if (filter?.severity) {
      events = events.filter((e) => e.severity === filter.severity);
    }

    if (filter?.since) {
      events = events.filter((e) => e.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  resetMetrics(): void {
    this.metrics = this.initMetrics();
  }

  private initMetrics(): MultiAgentMetrics {
    return {
      activeAgents: 0,
      activeSwarms: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskDuration: 0,
      messagesPerMinute: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      totalCapitalAllocated: 0,
      totalProfitLoss: 0,
      systemLatency: 0,
      timestamp: new Date(),
    };
  }

  private updateMetrics(event: MultiAgentEvent): void {
    switch (event.type) {
      case 'agent_started':
        this.metrics.activeAgents++;
        break;
      case 'agent_stopped':
        this.metrics.activeAgents = Math.max(0, this.metrics.activeAgents - 1);
        break;
      case 'swarm_created':
        this.metrics.activeSwarms++;
        break;
      case 'swarm_terminated':
        this.metrics.activeSwarms = Math.max(0, this.metrics.activeSwarms - 1);
        break;
      case 'task_created':
        this.metrics.totalTasks++;
        break;
      case 'task_completed':
        this.metrics.completedTasks++;
        if (event.data.duration) {
          this.updateAverageTaskDuration(event.data.duration as number);
        }
        break;
      case 'task_failed':
        this.metrics.failedTasks++;
        break;
      case 'conflict_detected':
        this.metrics.conflictsDetected++;
        break;
      case 'conflict_resolved':
        this.metrics.conflictsResolved++;
        break;
      case 'capital_allocated':
        if (event.data.amount) {
          this.metrics.totalCapitalAllocated += event.data.amount as number;
        }
        break;
      case 'performance_update':
        if (event.data.pnl) {
          this.metrics.totalProfitLoss += event.data.pnl as number;
        }
        break;
    }

    // Update messages per minute
    this.updateMessagesPerMinute();
  }

  private updateAverageTaskDuration(duration: number): void {
    const completed = this.metrics.completedTasks;
    const currentAvg = this.metrics.averageTaskDuration;

    // Running average
    this.metrics.averageTaskDuration =
      (currentAvg * (completed - 1) + duration) / completed;
  }

  private updateMessagesPerMinute(): void {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMessages = this.eventHistory.filter(
      (e) => e.timestamp >= oneMinuteAgo
    ).length;
    this.metrics.messagesPerMinute = recentMessages;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface GovernanceControllerOptions {
  config?: GovernanceConfig;
  eventCallback?: (event: MultiAgentEvent) => void;
  messageBus?: MessageBus;
  maxHistorySize?: number;
}

export interface EmergencyStopInfo {
  active: boolean;
  reason?: string;
  initiator?: string;
}

export interface GovernanceStats {
  totalActions: number;
  pendingActions: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  emergencyStopCount: number;
  emergencyStopActive: boolean;
}

export interface MetricsCollectorOptions {
  config?: MultiAgentObservabilityConfig;
  maxHistorySize?: number;
}

export interface EventHistoryFilter {
  type?: MultiAgentEvent['type'];
  source?: string;
  severity?: MultiAgentEvent['severity'];
  since?: Date;
  limit?: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createGovernanceController(
  options?: GovernanceControllerOptions
): DefaultGovernanceController {
  return new DefaultGovernanceController(options);
}

export function createMetricsCollector(
  options?: MetricsCollectorOptions
): MetricsCollector {
  return new MetricsCollector(options);
}
