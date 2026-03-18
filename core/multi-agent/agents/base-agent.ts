/**
 * TONAIAgent - Base Multi-Agent Class
 *
 * Abstract base class for all specialized agents in the multi-agent framework.
 * Provides core functionality for communication, state management, and lifecycle.
 */

import {
  MultiAgentConfig,
  AgentState,
  AgentStatus,
  AgentRole,
  AgentMessage,
  Task,
  TaskResult,
  TaskPriority,
  OperationState,
  ResourceUsage,
  AgentPerformance,
  AgentError,
  MultiAgentEvent,
  DelegationRequest,
  DelegationResponse,
  TaskRequestPayload,
  ExecutionReportPayload,
  ControlCommandPayload,
} from '../types';
import { MessageBus, MessageSubscriber, createMessage } from '../communication';

// ============================================================================
// Base Agent Interface
// ============================================================================

export interface BaseAgentInterface {
  readonly id: string;
  readonly role: AgentRole;
  readonly config: MultiAgentConfig;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;

  // State
  getState(): AgentState;
  getStatus(): AgentStatus;

  // Task handling
  canHandle(task: Task): boolean;
  assignTask(task: Task): Promise<boolean>;
  executeTask(task: Task): Promise<TaskResult>;
  cancelTask(taskId: string): Promise<boolean>;

  // Delegation
  delegateTask(task: Task, toAgentId?: string, toRole?: AgentRole): Promise<DelegationResponse | null>;
  acceptDelegation(delegation: DelegationRequest): Promise<boolean>;
  rejectDelegation(delegation: DelegationRequest, reason: string): Promise<void>;

  // Communication
  sendMessage(message: AgentMessage): Promise<void>;
  handleMessage(message: AgentMessage): Promise<void>;
}

// ============================================================================
// Base Agent Implementation
// ============================================================================

export abstract class BaseAgent implements BaseAgentInterface {
  readonly id: string;
  readonly role: AgentRole;
  readonly config: MultiAgentConfig;

  protected messageBus: MessageBus;
  protected status: AgentStatus = 'initializing';
  protected currentTask?: Task;
  protected activeOperations: Map<string, OperationState> = new Map();
  protected performanceMetrics: AgentPerformanceInternal;
  protected lastHeartbeat: Date = new Date();
  protected errorCount: number = 0;
  protected lastError?: AgentError;
  protected unsubscribe?: () => void;
  protected eventCallback?: (event: MultiAgentEvent) => void;
  protected heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void
  ) {
    this.id = config.id;
    this.role = config.role;
    this.config = config;
    this.messageBus = messageBus;
    this.eventCallback = eventCallback;

    this.performanceMetrics = {
      tasksCompleted: 0,
      tasksSuccessful: 0,
      taskDurations: [],
      profitLossTon: 0,
      riskScore: 0,
      startTime: new Date(),
    };
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async start(): Promise<void> {
    if (this.status !== 'initializing' && this.status !== 'paused') {
      throw new Error(`Cannot start agent in ${this.status} state`);
    }

    // Subscribe to messages
    const subscriber: MessageSubscriber = {
      agentId: this.id,
      role: this.role,
      handler: this.handleMessage.bind(this),
    };

    this.unsubscribe = this.messageBus.subscribe(subscriber);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 10000);

    this.status = 'active';
    this.lastHeartbeat = new Date();

    await this.onStart();

    this.emitEvent('agent_started', { agentId: this.id, role: this.role });
  }

  async stop(): Promise<void> {
    if (this.status === 'terminated') {
      return;
    }

    // Clean up
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Cancel current task if any
    if (this.currentTask) {
      await this.cancelTask(this.currentTask.id);
    }

    this.status = 'terminated';

    await this.onStop();

    this.emitEvent('agent_stopped', { agentId: this.id, role: this.role });
  }

  async pause(): Promise<void> {
    if (this.status !== 'active' && this.status !== 'executing') {
      throw new Error(`Cannot pause agent in ${this.status} state`);
    }

    this.status = 'paused';
    await this.onPause();
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume agent in ${this.status} state`);
    }

    this.status = 'active';
    await this.onResume();
  }

  // ============================================================================
  // State Methods
  // ============================================================================

  getState(): AgentState {
    return {
      agentId: this.id,
      status: this.status,
      currentTask: this.currentTask
        ? {
            taskId: this.currentTask.id,
            type: this.currentTask.type,
            priority: this.currentTask.priority,
            startedAt: this.currentTask.startedAt ?? new Date(),
            progress: 0,
          }
        : undefined,
      activeOperations: Array.from(this.activeOperations.values()),
      resourceUsage: this.getResourceUsage(),
      performance: this.getPerformance(),
      lastHeartbeat: this.lastHeartbeat,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  protected getResourceUsage(): ResourceUsage {
    return {
      capitalAllocated: 0,
      activePositions: 0,
      pendingTransactions: this.activeOperations.size,
      memoryUsageBytes: 0,
      lastUpdated: new Date(),
    };
  }

  protected getPerformance(): AgentPerformance {
    const avgDuration =
      this.performanceMetrics.taskDurations.length > 0
        ? this.performanceMetrics.taskDurations.reduce((a, b) => a + b, 0) /
          this.performanceMetrics.taskDurations.length
        : 0;

    const uptime =
      (Date.now() - this.performanceMetrics.startTime.getTime()) / 1000;

    return {
      tasksCompleted: this.performanceMetrics.tasksCompleted,
      tasksSuccessful: this.performanceMetrics.tasksSuccessful,
      averageTaskDurationMs: avgDuration,
      profitLossTon: this.performanceMetrics.profitLossTon,
      riskScore: this.performanceMetrics.riskScore,
      uptime,
      period: 'daily',
    };
  }

  // ============================================================================
  // Task Methods
  // ============================================================================

  abstract canHandle(task: Task): boolean;

  async assignTask(task: Task): Promise<boolean> {
    if (!this.canHandle(task)) {
      return false;
    }

    if (this.status !== 'active') {
      return false;
    }

    if (this.currentTask && task.constraints.exclusive) {
      return false;
    }

    this.currentTask = task;
    return true;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    if (this.status !== 'active') {
      throw new Error(`Cannot execute task in ${this.status} state`);
    }

    const startTime = Date.now();
    this.status = 'executing';
    this.currentTask = task;
    task.startedAt = new Date();

    try {
      const result = await this.doExecuteTask(task);

      const duration = Date.now() - startTime;
      this.recordTaskCompletion(result.success, duration);

      this.currentTask = undefined;
      this.status = 'active';

      // Send completion report
      await this.sendExecutionReport(task, result);

      this.emitEvent('task_completed', {
        taskId: task.id,
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordTaskCompletion(false, duration);
      this.recordError(error);

      this.currentTask = undefined;
      this.status = 'active';

      const result: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: duration,
        resourcesUsed: this.getResourceUsage(),
      };

      await this.sendExecutionReport(task, result);

      this.emitEvent('task_failed', {
        taskId: task.id,
        error: result.error,
        duration,
      }, 'error');

      return result;
    }
  }

  protected abstract doExecuteTask(task: Task): Promise<TaskResult>;

  async cancelTask(taskId: string): Promise<boolean> {
    if (this.currentTask?.id !== taskId) {
      return false;
    }

    // Clean up
    this.currentTask = undefined;
    this.status = 'active';

    return true;
  }

  // ============================================================================
  // Delegation Methods
  // ============================================================================

  async delegateTask(
    task: Task,
    toAgentId?: string,
    toRole?: AgentRole
  ): Promise<DelegationResponse | null> {
    if (!this.config.capabilities.canDelegateTask) {
      return null;
    }

    const payload: TaskRequestPayload = {
      type: 'task_request',
      taskId: task.id,
      taskType: task.type,
      description: task.description,
      parameters: task.parameters,
      constraints: task.constraints,
      deadline: task.deadline,
    };

    const message = createMessage({
      type: 'task_request',
      senderId: this.id,
      senderRole: this.role,
      targetId: toAgentId,
      targetRole: toRole,
      payload,
      priority: this.taskPriorityToMessagePriority(task.priority),
    });

    const response = await this.messageBus.request(message, 30000);

    if (!response) {
      return null;
    }

    const responsePayload = response.payload as { type: 'task_response'; accepted: boolean; reason?: string; estimatedCompletion?: Date };

    return {
      delegationId: task.id,
      accepted: responsePayload.accepted,
      agentId: response.senderId,
      reason: responsePayload.reason,
      estimatedCompletion: responsePayload.estimatedCompletion,
    };
  }

  async acceptDelegation(delegation: DelegationRequest): Promise<boolean> {
    const canAccept = this.canHandle(delegation.task);

    if (canAccept) {
      await this.assignTask(delegation.task);
    }

    // Send response
    const message = createMessage({
      type: 'task_response',
      senderId: this.id,
      senderRole: this.role,
      targetId: delegation.fromAgentId,
      payload: {
        type: 'task_response',
        taskId: delegation.taskId,
        accepted: canAccept,
        reason: canAccept ? undefined : 'Cannot handle this task type',
      },
      priority: 'high',
      correlationId: delegation.id,
    });

    await this.messageBus.publish(message);

    return canAccept;
  }

  async rejectDelegation(delegation: DelegationRequest, reason: string): Promise<void> {
    const message = createMessage({
      type: 'task_response',
      senderId: this.id,
      senderRole: this.role,
      targetId: delegation.fromAgentId,
      payload: {
        type: 'task_response',
        taskId: delegation.taskId,
        accepted: false,
        reason,
      },
      priority: 'high',
      correlationId: delegation.id,
    });

    await this.messageBus.publish(message);
  }

  // ============================================================================
  // Communication Methods
  // ============================================================================

  async sendMessage(message: AgentMessage): Promise<void> {
    await this.messageBus.publish(message);
  }

  async handleMessage(message: AgentMessage): Promise<void> {
    this.lastHeartbeat = new Date();

    switch (message.type) {
      case 'task_request':
        await this.handleTaskRequest(message);
        break;
      case 'task_assignment':
        await this.handleTaskAssignment(message);
        break;
      case 'control_command':
        await this.handleControlCommand(message);
        break;
      case 'risk_alert':
        await this.handleRiskAlert(message);
        break;
      case 'state_sync':
        await this.handleStateSync(message);
        break;
      default:
        await this.handleCustomMessage(message);
    }

    // Acknowledge message
    await this.messageBus.acknowledge(message.id, this.id);
  }

  protected async handleTaskRequest(message: AgentMessage): Promise<void> {
    const payload = message.payload as TaskRequestPayload;

    const task: Task = {
      id: payload.taskId,
      type: payload.taskType,
      priority: 3 as TaskPriority,
      status: 'pending',
      creatorId: message.senderId,
      description: payload.description,
      parameters: payload.parameters,
      constraints: payload.constraints ?? {},
      dependencies: [],
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      deadline: payload.deadline,
    };

    const canHandle = this.canHandle(task);

    // Send response
    const response = createMessage({
      type: 'task_response',
      senderId: this.id,
      senderRole: this.role,
      targetId: message.senderId,
      payload: {
        type: 'task_response',
        taskId: task.id,
        accepted: canHandle,
        reason: canHandle ? undefined : 'Cannot handle this task type',
      },
      priority: 'high',
      correlationId: message.correlationId ?? message.id,
    });

    await this.messageBus.publish(response);

    if (canHandle) {
      // Execute the task
      await this.assignTask(task);
      await this.executeTask(task);
    }
  }

  protected async handleTaskAssignment(message: AgentMessage): Promise<void> {
    const payload = message.payload as TaskRequestPayload;

    const task: Task = {
      id: payload.taskId,
      type: payload.taskType,
      priority: 3 as TaskPriority,
      status: 'assigned',
      creatorId: message.senderId,
      description: payload.description,
      parameters: payload.parameters,
      constraints: payload.constraints ?? {},
      dependencies: [],
      createdAt: new Date(),
      assignedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      deadline: payload.deadline,
    };

    if (await this.assignTask(task)) {
      await this.executeTask(task);
    }
  }

  protected async handleControlCommand(message: AgentMessage): Promise<void> {
    const payload = message.payload as ControlCommandPayload;

    switch (payload.command) {
      case 'pause':
        await this.pause();
        break;
      case 'resume':
        await this.resume();
        break;
      case 'terminate':
        await this.stop();
        break;
      case 'emergency_stop':
        await this.emergencyStop(payload.reason ?? 'Emergency stop commanded');
        break;
      case 'force_sync':
        await this.forceSync();
        break;
    }
  }

  protected async handleRiskAlert(_message: AgentMessage): Promise<void> {
    // Override in specialized agents
  }

  protected async handleStateSync(_message: AgentMessage): Promise<void> {
    // Override in specialized agents
  }

  protected async handleCustomMessage(_message: AgentMessage): Promise<void> {
    // Override in specialized agents for custom message handling
  }

  protected async sendExecutionReport(task: Task, result: TaskResult): Promise<void> {
    const payload: ExecutionReportPayload = {
      type: 'execution_report',
      operationId: task.id,
      operationType: task.type,
      status: result.success ? 'completed' : 'failed',
      result: result.data,
      error: result.error,
    };

    const message = createMessage({
      type: 'execution_report',
      senderId: this.id,
      senderRole: this.role,
      targetId: task.creatorId,
      payload,
      priority: 'normal',
    });

    await this.messageBus.publish(message);
  }

  protected async sendHeartbeat(): Promise<void> {
    this.lastHeartbeat = new Date();

    const message = createMessage({
      type: 'heartbeat',
      senderId: this.id,
      senderRole: this.role,
      payload: {
        type: 'state_sync',
        scope: 'partial',
        stateType: 'all',
        data: {
          status: this.status,
          resourceUsage: this.getResourceUsage(),
          currentTaskId: this.currentTask?.id,
        },
        version: Date.now(),
      },
      priority: 'low',
    });

    await this.messageBus.publish(message);
  }

  protected async emergencyStop(reason: string): Promise<void> {
    this.status = 'paused';

    // Cancel all operations
    for (const [, op] of this.activeOperations) {
      op.status = 'failed';
      op.error = reason;
    }

    if (this.currentTask) {
      await this.cancelTask(this.currentTask.id);
    }

    this.emitEvent('risk_alert', {
      agentId: this.id,
      type: 'emergency_stop',
      reason,
    }, 'critical');
  }

  protected async forceSync(): Promise<void> {
    // Send full state to coordinator
    const message = createMessage({
      type: 'state_sync',
      senderId: this.id,
      senderRole: this.role,
      targetRole: 'coordinator',
      payload: {
        type: 'state_sync',
        scope: 'full',
        stateType: 'all',
        data: this.getState() as unknown as Record<string, unknown>,
        version: Date.now(),
      },
      priority: 'high',
    });

    await this.messageBus.publish(message);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  protected recordTaskCompletion(success: boolean, durationMs: number): void {
    this.performanceMetrics.tasksCompleted++;
    if (success) {
      this.performanceMetrics.tasksSuccessful++;
    }
    this.performanceMetrics.taskDurations.push(durationMs);

    // Keep bounded
    if (this.performanceMetrics.taskDurations.length > 1000) {
      this.performanceMetrics.taskDurations =
        this.performanceMetrics.taskDurations.slice(-1000);
    }
  }

  protected recordError(error: unknown): void {
    this.errorCount++;
    this.lastError = {
      code: 'EXECUTION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
      recoverable: true,
    };
  }

  protected taskPriorityToMessagePriority(priority: TaskPriority): 'low' | 'normal' | 'high' | 'critical' {
    switch (priority) {
      case 1:
        return 'critical';
      case 2:
        return 'high';
      case 3:
        return 'normal';
      case 4:
      case 5:
        return 'low';
    }
  }

  protected emitEvent(
    type: MultiAgentEvent['type'],
    data: Record<string, unknown>,
    severity: MultiAgentEvent['severity'] = 'info'
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      type,
      source: this.id,
      sourceRole: this.role,
      data,
      severity,
    });
  }

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  protected async onStart(): Promise<void> {
    // Override in subclasses
  }

  protected async onStop(): Promise<void> {
    // Override in subclasses
  }

  protected async onPause(): Promise<void> {
    // Override in subclasses
  }

  protected async onResume(): Promise<void> {
    // Override in subclasses
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface AgentPerformanceInternal {
  tasksCompleted: number;
  tasksSuccessful: number;
  taskDurations: number[];
  profitLossTon: number;
  riskScore: number;
  startTime: Date;
}
