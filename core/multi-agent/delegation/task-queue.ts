/**
 * TONAIAgent - Task Queue and Delegation Engine
 *
 * Priority-based task queue with dynamic assignment, reassignment,
 * and failure recovery for multi-agent coordination.
 */

import {
  Task,
  TaskQueue,
  TaskStatus,
  TaskPriority,
  AgentTaskType,
  TaskResult,
  DelegationRequest,
  DelegationResponse,
  DelegationConstraints,
  AgentRole,
  MultiAgentEvent,
} from '../types';

// ============================================================================
// Priority Task Queue Implementation
// ============================================================================

export class PriorityTaskQueue implements TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private taskOrder: string[] = [];
  private eventCallback?: (event: MultiAgentEvent) => void;

  constructor(eventCallback?: (event: MultiAgentEvent) => void) {
    this.eventCallback = eventCallback;
  }

  async add(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    this.insertByPriority(task.id, task.priority);

    this.emitEvent('task_created', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
    });
  }

  async remove(taskId: string): Promise<boolean> {
    if (!this.tasks.has(taskId)) {
      return false;
    }

    this.tasks.delete(taskId);
    const index = this.taskOrder.indexOf(taskId);
    if (index !== -1) {
      this.taskOrder.splice(index, 1);
    }

    return true;
  }

  async get(taskId: string): Promise<Task | undefined> {
    return this.tasks.get(taskId);
  }

  async peek(): Promise<Task | undefined> {
    if (this.taskOrder.length === 0) {
      return undefined;
    }

    // Find the highest priority pending task
    for (const taskId of this.taskOrder) {
      const task = this.tasks.get(taskId);
      if (task && (task.status === 'pending' || task.status === 'queued')) {
        return task;
      }
    }

    return undefined;
  }

  async pop(): Promise<Task | undefined> {
    const task = await this.peek();
    if (task) {
      task.status = 'assigned';
      task.assignedAt = new Date();
    }
    return task;
  }

  size(): number {
    return this.tasks.size;
  }

  clear(): void {
    this.tasks.clear();
    this.taskOrder = [];
  }

  async prioritize(taskId: string, newPriority: TaskPriority): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Remove from current position
    const index = this.taskOrder.indexOf(taskId);
    if (index !== -1) {
      this.taskOrder.splice(index, 1);
    }

    // Update priority and reinsert
    task.priority = newPriority;
    this.insertByPriority(taskId, newPriority);

    this.emitEvent('task_prioritized', {
      taskId,
      newPriority,
    });

    return true;
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const [, task] of this.tasks) {
      if (task.status === status) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  async getByAssignee(agentId: string): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const [, task] of this.tasks) {
      if (task.assigneeId === agentId) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  // ============================================================================
  // Additional Methods
  // ============================================================================

  async updateStatus(taskId: string, status: TaskStatus, result?: TaskResult): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = status;

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }

    if ((status === 'completed' || status === 'failed') && !task.completedAt) {
      task.completedAt = new Date();
      if (result) {
        task.result = result;
      }
    }

    return true;
  }

  async assignTo(taskId: string, agentId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.assigneeId = agentId;
    task.status = 'assigned';
    task.assignedAt = new Date();

    this.emitEvent('task_assigned', {
      taskId,
      agentId,
    });

    return true;
  }

  async reassign(taskId: string, newAgentId: string, reason: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    const oldAgentId = task.assigneeId;
    task.assigneeId = newAgentId;
    task.status = 'assigned';
    task.assignedAt = new Date();
    task.retryCount++;

    this.emitEvent('task_reassigned', {
      taskId,
      oldAgentId,
      newAgentId,
      reason,
    });

    return true;
  }

  getOverdueTasks(gracePeriodMs: number = 0): Task[] {
    const now = Date.now();
    const overdue: Task[] = [];

    for (const [, task] of this.tasks) {
      if (task.deadline && task.status !== 'completed' && task.status !== 'failed') {
        if (task.deadline.getTime() + gracePeriodMs < now) {
          overdue.push(task);
        }
      }
    }

    return overdue;
  }

  getStats(): TaskQueueStats {
    const stats: TaskQueueStats = {
      total: this.tasks.size,
      byStatus: {},
      byPriority: {},
      averageWaitTime: 0,
      overdue: 0,
    };

    let totalWaitTime = 0;
    let waitTimeCount = 0;
    const now = Date.now();

    for (const [, task] of this.tasks) {
      // By status
      stats.byStatus[task.status] = (stats.byStatus[task.status] ?? 0) + 1;

      // By priority
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] ?? 0) + 1;

      // Wait time
      if (task.assignedAt && task.createdAt) {
        totalWaitTime += task.assignedAt.getTime() - task.createdAt.getTime();
        waitTimeCount++;
      }

      // Overdue
      if (task.deadline && task.deadline.getTime() < now &&
          task.status !== 'completed' && task.status !== 'failed') {
        stats.overdue++;
      }
    }

    stats.averageWaitTime = waitTimeCount > 0 ? totalWaitTime / waitTimeCount : 0;

    return stats;
  }

  private insertByPriority(taskId: string, priority: TaskPriority): void {
    // Find the correct position based on priority (lower number = higher priority)
    let insertIndex = this.taskOrder.length;

    for (let i = 0; i < this.taskOrder.length; i++) {
      const existingTask = this.tasks.get(this.taskOrder[i]);
      if (existingTask && existingTask.priority > priority) {
        insertIndex = i;
        break;
      }
    }

    this.taskOrder.splice(insertIndex, 0, taskId);
  }

  private emitEvent(
    type: string,
    data: Record<string, unknown>
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: type as never,
      source: 'task_queue',
      sourceRole: 'coordinator',
      data,
      severity: 'info',
    });
  }
}

// ============================================================================
// Delegation Engine
// ============================================================================

export class DelegationEngine {
  private delegations: Map<string, DelegationRequest> = new Map();
  private delegationHistory: DelegationRequest[] = [];
  private taskQueue: PriorityTaskQueue;
  private eventCallback?: (event: MultiAgentEvent) => void;
  private maxHistorySize: number;

  constructor(
    taskQueue: PriorityTaskQueue,
    options?: DelegationEngineOptions
  ) {
    this.taskQueue = taskQueue;
    this.eventCallback = options?.eventCallback;
    this.maxHistorySize = options?.maxHistorySize ?? 1000;
  }

  async createDelegation(
    fromAgentId: string,
    task: Task,
    toAgentId?: string,
    toRole?: AgentRole,
    constraints?: Partial<DelegationConstraints>
  ): Promise<DelegationRequest> {
    const delegation: DelegationRequest = {
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      taskId: task.id,
      fromAgentId,
      toAgentId,
      toRole,
      task,
      constraints: {
        allowSubDelegation: constraints?.allowSubDelegation ?? true,
        maxDepth: constraints?.maxDepth ?? 3,
        timeout: constraints?.timeout ?? 60000,
        mustAccept: constraints?.mustAccept ?? false,
        escalationAgentId: constraints?.escalationAgentId,
        capitalLimit: constraints?.capitalLimit,
      },
      status: 'pending',
      createdAt: new Date(),
    };

    this.delegations.set(delegation.id, delegation);

    // Add task to queue if not already there
    if (!(await this.taskQueue.get(task.id))) {
      await this.taskQueue.add(task);
    }

    this.emitEvent('delegation_requested', {
      delegationId: delegation.id,
      taskId: task.id,
      fromAgentId,
      toAgentId,
      toRole,
    });

    return delegation;
  }

  async acceptDelegation(
    delegationId: string,
    agentId: string,
    estimatedCompletion?: Date
  ): Promise<DelegationResponse> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    delegation.status = 'accepted';
    delegation.respondedAt = new Date();

    // Assign task to accepting agent
    await this.taskQueue.assignTo(delegation.taskId, agentId);

    this.emitEvent('delegation_accepted', {
      delegationId,
      agentId,
      taskId: delegation.taskId,
    });

    return {
      delegationId,
      accepted: true,
      agentId,
      estimatedCompletion,
    };
  }

  async rejectDelegation(
    delegationId: string,
    agentId: string,
    reason: string
  ): Promise<DelegationResponse> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    delegation.status = 'rejected';
    delegation.respondedAt = new Date();

    // Check if should escalate
    if (delegation.constraints.escalationAgentId) {
      await this.escalate(delegationId, reason);
    }

    this.emitEvent('delegation_rejected', {
      delegationId,
      agentId,
      taskId: delegation.taskId,
      reason,
    });

    return {
      delegationId,
      accepted: false,
      agentId,
      reason,
    };
  }

  async completeDelegation(
    delegationId: string,
    result: TaskResult
  ): Promise<void> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    delegation.status = 'completed';
    delegation.completedAt = new Date();
    delegation.result = result;

    // Update task
    await this.taskQueue.updateStatus(
      delegation.taskId,
      result.success ? 'completed' : 'failed',
      result
    );

    // Move to history
    this.addToHistory(delegation);
    this.delegations.delete(delegationId);

    this.emitEvent('delegation_completed', {
      delegationId,
      taskId: delegation.taskId,
      success: result.success,
    });
  }

  async failDelegation(
    delegationId: string,
    error: string
  ): Promise<void> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    delegation.status = 'failed';
    delegation.completedAt = new Date();
    delegation.result = {
      success: false,
      error,
      executionTime: Date.now() - delegation.createdAt.getTime(),
      resourcesUsed: {
        capitalAllocated: 0,
        activePositions: 0,
        pendingTransactions: 0,
        memoryUsageBytes: 0,
        lastUpdated: new Date(),
      },
    };

    // Check if can retry
    const task = delegation.task;
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      task.status = 'pending';
      task.assigneeId = undefined;

      this.emitEvent('delegation_retry', {
        delegationId,
        taskId: task.id,
        retryCount: task.retryCount,
      });
    } else {
      await this.taskQueue.updateStatus(task.id, 'failed', delegation.result);
    }

    // Move to history
    this.addToHistory(delegation);
    this.delegations.delete(delegationId);

    this.emitEvent('delegation_failed', {
      delegationId,
      taskId: delegation.taskId,
      error,
    });
  }

  async escalate(delegationId: string, reason: string): Promise<void> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`Delegation ${delegationId} not found`);
    }

    if (!delegation.constraints.escalationAgentId) {
      throw new Error('No escalation agent configured');
    }

    delegation.status = 'escalated';

    // Create new delegation to escalation agent
    await this.createDelegation(
      delegation.fromAgentId,
      delegation.task,
      delegation.constraints.escalationAgentId,
      undefined,
      {
        ...delegation.constraints,
        mustAccept: true,
      }
    );

    this.emitEvent('delegation_escalated', {
      delegationId,
      taskId: delegation.taskId,
      escalationAgentId: delegation.constraints.escalationAgentId,
      reason,
    });
  }

  getDelegation(delegationId: string): DelegationRequest | undefined {
    return this.delegations.get(delegationId);
  }

  getActiveDelegations(): DelegationRequest[] {
    return Array.from(this.delegations.values()).filter(
      (d) => d.status === 'pending' || d.status === 'accepted' || d.status === 'in_progress'
    );
  }

  getDelegationsByAgent(agentId: string): DelegationRequest[] {
    return Array.from(this.delegations.values()).filter(
      (d) => d.fromAgentId === agentId || d.toAgentId === agentId
    );
  }

  getHistory(limit?: number): DelegationRequest[] {
    const history = this.delegationHistory.slice();
    return limit ? history.slice(-limit) : history;
  }

  getStats(): DelegationStats {
    const active = this.getActiveDelegations();
    const history = this.delegationHistory;

    const completed = history.filter((d) => d.status === 'completed');
    const failed = history.filter((d) => d.status === 'failed');
    const rejected = history.filter((d) => d.status === 'rejected');

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const d of history) {
      if (d.respondedAt && d.createdAt) {
        totalResponseTime += d.respondedAt.getTime() - d.createdAt.getTime();
        responseTimeCount++;
      }
    }

    return {
      active: active.length,
      pending: active.filter((d) => d.status === 'pending').length,
      completed: completed.length,
      failed: failed.length,
      rejected: rejected.length,
      successRate: completed.length / (completed.length + failed.length) || 0,
      averageResponseTimeMs: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
    };
  }

  private addToHistory(delegation: DelegationRequest): void {
    this.delegationHistory.push(delegation);

    // Trim history
    if (this.delegationHistory.length > this.maxHistorySize) {
      this.delegationHistory = this.delegationHistory.slice(-this.maxHistorySize);
    }
  }

  private emitEvent(
    type: string,
    data: Record<string, unknown>
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: type as never,
      source: 'delegation_engine',
      sourceRole: 'coordinator',
      data,
      severity: 'info',
    });
  }
}

// ============================================================================
// Types
// ============================================================================

export interface TaskQueueStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<number, number>;
  averageWaitTime: number;
  overdue: number;
}

export interface DelegationStats {
  active: number;
  pending: number;
  completed: number;
  failed: number;
  rejected: number;
  successRate: number;
  averageResponseTimeMs: number;
}

export interface DelegationEngineOptions {
  eventCallback?: (event: MultiAgentEvent) => void;
  maxHistorySize?: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createTaskQueue(
  eventCallback?: (event: MultiAgentEvent) => void
): PriorityTaskQueue {
  return new PriorityTaskQueue(eventCallback);
}

export function createDelegationEngine(
  taskQueue: PriorityTaskQueue,
  options?: DelegationEngineOptions
): DelegationEngine {
  return new DelegationEngine(taskQueue, options);
}

// ============================================================================
// Task Factory
// ============================================================================

export function createTask(params: CreateTaskParams): Task {
  return {
    id: params.id ?? `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: params.type,
    priority: params.priority ?? 3,
    status: 'pending',
    creatorId: params.creatorId,
    assigneeId: params.assigneeId,
    description: params.description,
    parameters: params.parameters ?? {},
    constraints: params.constraints ?? {},
    dependencies: params.dependencies ?? [],
    createdAt: new Date(),
    deadline: params.deadline,
    retryCount: 0,
    maxRetries: params.maxRetries ?? 3,
    metadata: params.metadata,
  };
}

export interface CreateTaskParams {
  id?: string;
  type: AgentTaskType;
  priority?: TaskPriority;
  creatorId: string;
  assigneeId?: string;
  description: string;
  parameters?: Record<string, unknown>;
  constraints?: Task['constraints'];
  dependencies?: string[];
  deadline?: Date;
  maxRetries?: number;
  metadata?: Record<string, unknown>;
}
