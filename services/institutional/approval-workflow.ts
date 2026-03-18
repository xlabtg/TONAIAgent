/**
 * TONAIAgent - Approval Workflow Engine
 *
 * Implements transaction policy and approval workflows:
 * - Configurable approval chains
 * - Multi-step approval processes
 * - Time-based escalation
 * - Emergency halts
 * - Anomaly detection integration
 */

import {
  ApprovalWorkflow,
  WorkflowTrigger,
  ApprovalStep,
  WorkflowStatus,
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalDecision,
  InstitutionalRole,
  ConditionOperator,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ApprovalWorkflowManager {
  // Workflow Management
  createWorkflow(
    accountId: string,
    name: string,
    description: string,
    triggers: WorkflowTrigger[],
    steps: ApprovalStep[],
    createdBy: string
  ): Promise<ApprovalWorkflow>;
  getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null>;
  listWorkflows(accountId: string, status?: WorkflowStatus): Promise<ApprovalWorkflow[]>;
  updateWorkflow(
    workflowId: string,
    updates: Partial<WorkflowUpdates>,
    updatedBy: string
  ): Promise<ApprovalWorkflow>;
  activateWorkflow(workflowId: string, activatedBy: string): Promise<void>;
  pauseWorkflow(workflowId: string, pausedBy: string, reason?: string): Promise<void>;
  archiveWorkflow(workflowId: string, archivedBy: string): Promise<void>;

  // Approval Request Management
  createRequest(
    workflowId: string,
    transactionId: string,
    requestedBy: string,
    metadata?: Record<string, unknown>
  ): Promise<ApprovalRequest>;
  getRequest(requestId: string): Promise<ApprovalRequest | null>;
  listRequests(accountId: string, filters?: RequestFilters): Promise<ApprovalRequest[]>;
  getPendingRequests(approverId: string, role: InstitutionalRole): Promise<ApprovalRequest[]>;

  // Approval Actions
  approve(
    requestId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    comments?: string,
    signature?: string
  ): Promise<ApprovalResult>;
  reject(
    requestId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    reason: string
  ): Promise<ApprovalResult>;
  cancel(requestId: string, cancelledBy: string, reason?: string): Promise<void>;

  // Transaction Evaluation
  shouldTriggerApproval(
    accountId: string,
    transaction: TransactionContext
  ): Promise<ApprovalEvaluation>;
  findMatchingWorkflow(
    accountId: string,
    transaction: TransactionContext
  ): Promise<ApprovalWorkflow | null>;

  // Escalation
  processEscalations(): Promise<EscalationResult[]>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface WorkflowUpdates {
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  steps: ApprovalStep[];
}

export interface RequestFilters {
  status?: ApprovalRequestStatus;
  workflowId?: string;
  requestedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface TransactionContext {
  id: string;
  type: string;
  amount: number;
  currency: string;
  source: string;
  destination: string;
  destinationType?: 'internal' | 'external' | 'new';
  riskScore?: number;
  metadata: Record<string, unknown>;
}

export interface ApprovalEvaluation {
  requiresApproval: boolean;
  matchedWorkflow?: ApprovalWorkflow;
  matchedTriggers: WorkflowTrigger[];
  estimatedSteps: number;
  estimatedTime: number; // in minutes
}

export interface ApprovalResult {
  success: boolean;
  request: ApprovalRequest;
  isComplete: boolean;
  nextStep?: ApprovalStep;
  error?: string;
}

export interface EscalationResult {
  requestId: string;
  escalatedFrom: number;
  escalatedTo: number;
  notifiedRoles: InstitutionalRole[];
  success: boolean;
}

// ============================================================================
// Default Workflows
// ============================================================================

const DEFAULT_WORKFLOW_TEMPLATES: Omit<ApprovalWorkflow, 'id' | 'accountId' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Large Transaction Approval',
    description: 'Requires approval for transactions above threshold',
    triggerConditions: [
      {
        type: 'transaction_amount',
        conditions: [{ field: 'amount', operator: 'greater_than', value: 100000 }],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        name: 'Risk Manager Review',
        approverRoles: ['risk_manager'],
        requiredApprovals: 1,
        timeoutHours: 4,
        escalateOnTimeout: true,
        escalateTo: 'admin',
      },
      {
        stepNumber: 2,
        name: 'Compliance Officer Approval',
        approverRoles: ['compliance_officer', 'admin'],
        requiredApprovals: 1,
        timeoutHours: 8,
        escalateOnTimeout: true,
        escalateTo: 'admin',
      },
    ],
    status: 'active',
  },
  {
    name: 'External Transfer Approval',
    description: 'Requires approval for transfers to external addresses',
    triggerConditions: [
      {
        type: 'destination_type',
        conditions: [{ field: 'destinationType', operator: 'equals', value: 'external' }],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        name: 'Compliance Review',
        approverRoles: ['compliance_officer'],
        requiredApprovals: 1,
        timeoutHours: 2,
        escalateOnTimeout: true,
        escalateTo: 'admin',
      },
    ],
    status: 'active',
  },
  {
    name: 'High Risk Transaction',
    description: 'Multi-level approval for high-risk transactions',
    triggerConditions: [
      {
        type: 'risk_score',
        conditions: [{ field: 'riskScore', operator: 'greater_than', value: 70 }],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        name: 'Risk Manager Assessment',
        approverRoles: ['risk_manager'],
        requiredApprovals: 1,
        timeoutHours: 2,
        escalateOnTimeout: true,
        escalateTo: 'compliance_officer',
      },
      {
        stepNumber: 2,
        name: 'Compliance Review',
        approverRoles: ['compliance_officer'],
        requiredApprovals: 1,
        timeoutHours: 4,
        escalateOnTimeout: true,
        escalateTo: 'admin',
      },
      {
        stepNumber: 3,
        name: 'Admin Final Approval',
        approverRoles: ['admin'],
        requiredApprovals: 1,
        timeoutHours: 8,
        escalateOnTimeout: false,
      },
    ],
    status: 'active',
  },
  {
    name: 'New Destination Approval',
    description: 'Approval required for transfers to new destinations',
    triggerConditions: [
      {
        type: 'destination_type',
        conditions: [{ field: 'destinationType', operator: 'equals', value: 'new' }],
      },
    ],
    steps: [
      {
        stepNumber: 1,
        name: 'Destination Verification',
        approverRoles: ['compliance_officer', 'risk_manager'],
        requiredApprovals: 1,
        timeoutHours: 4,
        escalateOnTimeout: true,
        escalateTo: 'admin',
      },
    ],
    status: 'active',
  },
];

// ============================================================================
// Approval Workflow Manager Implementation
// ============================================================================

export class DefaultApprovalWorkflowManager implements ApprovalWorkflowManager {
  private readonly workflows = new Map<string, ApprovalWorkflow>();
  private readonly workflowsByAccount = new Map<string, Set<string>>();
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly requestsByAccount = new Map<string, Set<string>>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private workflowCounter = 0;
  private requestCounter = 0;

  async createWorkflow(
    accountId: string,
    name: string,
    description: string,
    triggers: WorkflowTrigger[],
    steps: ApprovalStep[],
    createdBy: string
  ): Promise<ApprovalWorkflow> {
    const workflowId = this.generateWorkflowId();

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      accountId,
      name,
      description,
      triggerConditions: triggers,
      steps: steps.sort((a, b) => a.stepNumber - b.stepNumber),
      status: 'draft',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflowId, workflow);

    if (!this.workflowsByAccount.has(accountId)) {
      this.workflowsByAccount.set(accountId, new Set());
    }
    this.workflowsByAccount.get(accountId)!.add(workflowId);

    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<ApprovalWorkflow | null> {
    return this.workflows.get(workflowId) ?? null;
  }

  async listWorkflows(accountId: string, status?: WorkflowStatus): Promise<ApprovalWorkflow[]> {
    const workflowIds = this.workflowsByAccount.get(accountId);
    if (!workflowIds) {
      return [];
    }

    let workflows = Array.from(workflowIds)
      .map((id) => this.workflows.get(id))
      .filter((w): w is ApprovalWorkflow => w !== undefined);

    if (status) {
      workflows = workflows.filter((w) => w.status === status);
    }

    return workflows;
  }

  async updateWorkflow(
    workflowId: string,
    updates: Partial<WorkflowUpdates>,
    _updatedBy: string
  ): Promise<ApprovalWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status === 'archived') {
      throw new Error('Cannot update an archived workflow');
    }

    if (updates.name !== undefined) {
      workflow.name = updates.name;
    }
    if (updates.description !== undefined) {
      workflow.description = updates.description;
    }
    if (updates.triggers !== undefined) {
      workflow.triggerConditions = updates.triggers;
    }
    if (updates.steps !== undefined) {
      workflow.steps = updates.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    }

    workflow.updatedAt = new Date();

    return workflow;
  }

  async activateWorkflow(workflowId: string, activatedBy: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.steps.length === 0) {
      throw new Error('Cannot activate a workflow without steps');
    }

    if (workflow.triggerConditions.length === 0) {
      throw new Error('Cannot activate a workflow without triggers');
    }

    workflow.status = 'active';
    workflow.updatedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId: workflow.accountId,
      actorId: activatedBy,
      actorRole: 'admin',
      action: 'activate_workflow',
      resource: 'workflow',
      resourceId: workflowId,
      details: { name: workflow.name },
      metadata: {},
    });
  }

  async pauseWorkflow(workflowId: string, pausedBy: string, reason?: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.status = 'paused';
    workflow.updatedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'account_updated',
      accountId: workflow.accountId,
      actorId: pausedBy,
      actorRole: 'admin',
      action: 'pause_workflow',
      resource: 'workflow',
      resourceId: workflowId,
      details: { reason },
      metadata: {},
    });
  }

  async archiveWorkflow(workflowId: string, _archivedBy: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Check for pending requests
    const pendingRequests = Array.from(this.requests.values()).filter(
      (r) => r.workflowId === workflowId && r.status === 'pending'
    );

    if (pendingRequests.length > 0) {
      throw new Error(`Cannot archive workflow with ${pendingRequests.length} pending requests`);
    }

    workflow.status = 'archived';
    workflow.updatedAt = new Date();
  }

  async createRequest(
    workflowId: string,
    transactionId: string,
    requestedBy: string,
    metadata?: Record<string, unknown>
  ): Promise<ApprovalRequest> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow is not active: ${workflow.status}`);
    }

    const requestId = this.generateRequestId();
    const firstStep = workflow.steps[0];
    const expiresAt = new Date(
      Date.now() + firstStep.timeoutHours * 60 * 60 * 1000
    );

    const request: ApprovalRequest = {
      id: requestId,
      workflowId,
      accountId: workflow.accountId,
      transactionId,
      currentStep: 1,
      status: 'pending',
      requestedBy,
      requestedAt: new Date(),
      approvals: [],
      expiresAt,
      metadata: metadata ?? {},
    };

    this.requests.set(requestId, request);

    if (!this.requestsByAccount.has(workflow.accountId)) {
      this.requestsByAccount.set(workflow.accountId, new Set());
    }
    this.requestsByAccount.get(workflow.accountId)!.add(requestId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'approval_requested',
      accountId: workflow.accountId,
      actorId: requestedBy,
      actorRole: 'trader',
      action: 'create_request',
      resource: 'approval_request',
      resourceId: requestId,
      details: { workflowName: workflow.name, transactionId },
      metadata: {},
    });

    return request;
  }

  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.requests.get(requestId) ?? null;
  }

  async listRequests(accountId: string, filters?: RequestFilters): Promise<ApprovalRequest[]> {
    const requestIds = this.requestsByAccount.get(accountId);
    if (!requestIds) {
      return [];
    }

    let requests = Array.from(requestIds)
      .map((id) => this.requests.get(id))
      .filter((r): r is ApprovalRequest => r !== undefined);

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }
    if (filters?.workflowId) {
      requests = requests.filter((r) => r.workflowId === filters.workflowId);
    }
    if (filters?.requestedBy) {
      requests = requests.filter((r) => r.requestedBy === filters.requestedBy);
    }
    if (filters?.startDate) {
      requests = requests.filter((r) => r.requestedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      requests = requests.filter((r) => r.requestedAt <= filters.endDate!);
    }
    if (filters?.limit) {
      requests = requests.slice(0, filters.limit);
    }

    return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async getPendingRequests(
    approverId: string,
    role: InstitutionalRole
  ): Promise<ApprovalRequest[]> {
    const pendingRequests: ApprovalRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.status !== 'pending') continue;

      const workflow = this.workflows.get(request.workflowId);
      if (!workflow) continue;

      const currentStep = workflow.steps.find((s) => s.stepNumber === request.currentStep);
      if (!currentStep) continue;

      // Check if this user/role can approve this step
      if (
        currentStep.approverRoles.includes(role) ||
        currentStep.approverUsers?.includes(approverId)
      ) {
        // Check if user hasn't already approved this step
        const alreadyApproved = request.approvals.some(
          (a) => a.stepNumber === request.currentStep && a.approverId === approverId
        );

        if (!alreadyApproved) {
          pendingRequests.push(request);
        }
      }
    }

    return pendingRequests;
  }

  async approve(
    requestId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    comments?: string,
    signature?: string
  ): Promise<ApprovalResult> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, request: request!, isComplete: false, error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, request, isComplete: false, error: `Request is ${request.status}` };
    }

    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      return { success: false, request, isComplete: false, error: 'Request has expired' };
    }

    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      return { success: false, request, isComplete: false, error: 'Workflow not found' };
    }

    const currentStep = workflow.steps.find((s) => s.stepNumber === request.currentStep);
    if (!currentStep) {
      return { success: false, request, isComplete: false, error: 'Current step not found' };
    }

    // Verify approver is authorized
    if (
      !currentStep.approverRoles.includes(approverRole) &&
      !currentStep.approverUsers?.includes(approverId)
    ) {
      return { success: false, request, isComplete: false, error: 'Not authorized to approve' };
    }

    // Check for duplicate approval
    const alreadyApproved = request.approvals.some(
      (a) => a.stepNumber === request.currentStep && a.approverId === approverId
    );
    if (alreadyApproved) {
      return { success: false, request, isComplete: false, error: 'Already approved this step' };
    }

    // Record approval
    const decision: ApprovalDecision = {
      stepNumber: request.currentStep,
      approverId,
      approverRole,
      decision: 'approved',
      timestamp: new Date(),
      comments,
      signature,
    };
    request.approvals.push(decision);

    // Check if step is complete
    const stepApprovals = request.approvals.filter(
      (a) => a.stepNumber === request.currentStep && a.decision === 'approved'
    );

    if (stepApprovals.length >= currentStep.requiredApprovals) {
      // Move to next step or complete
      const nextStep = workflow.steps.find((s) => s.stepNumber === request.currentStep + 1);

      if (nextStep) {
        request.currentStep = nextStep.stepNumber;
        request.expiresAt = new Date(
          Date.now() + nextStep.timeoutHours * 60 * 60 * 1000
        );

        this.emitEvent({
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          type: 'approval_decision',
          accountId: request.accountId,
          actorId: approverId,
          actorRole: approverRole,
          action: 'step_completed',
          resource: 'approval_request',
          resourceId: requestId,
          details: { stepNumber: currentStep.stepNumber, nextStep: nextStep.stepNumber },
          metadata: {},
        });

        return { success: true, request, isComplete: false, nextStep };
      } else {
        // All steps complete
        request.status = 'approved';
        request.completedAt = new Date();

        this.emitEvent({
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          type: 'approval_decision',
          accountId: request.accountId,
          actorId: approverId,
          actorRole: approverRole,
          action: 'request_approved',
          resource: 'approval_request',
          resourceId: requestId,
          details: { totalSteps: workflow.steps.length },
          metadata: {},
        });

        return { success: true, request, isComplete: true };
      }
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'approval_decision',
      accountId: request.accountId,
      actorId: approverId,
      actorRole: approverRole,
      action: 'approve',
      resource: 'approval_request',
      resourceId: requestId,
      details: { stepNumber: request.currentStep, comments },
      metadata: {},
    });

    return { success: true, request, isComplete: false };
  }

  async reject(
    requestId: string,
    approverId: string,
    approverRole: InstitutionalRole,
    reason: string
  ): Promise<ApprovalResult> {
    const request = this.requests.get(requestId);
    if (!request) {
      return { success: false, request: request!, isComplete: false, error: 'Request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, request, isComplete: false, error: `Request is ${request.status}` };
    }

    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      return { success: false, request, isComplete: false, error: 'Workflow not found' };
    }

    const currentStep = workflow.steps.find((s) => s.stepNumber === request.currentStep);
    if (!currentStep) {
      return { success: false, request, isComplete: false, error: 'Current step not found' };
    }

    // Verify approver is authorized
    if (
      !currentStep.approverRoles.includes(approverRole) &&
      !currentStep.approverUsers?.includes(approverId)
    ) {
      return { success: false, request, isComplete: false, error: 'Not authorized to reject' };
    }

    // Record rejection
    const decision: ApprovalDecision = {
      stepNumber: request.currentStep,
      approverId,
      approverRole,
      decision: 'rejected',
      timestamp: new Date(),
      comments: reason,
    };
    request.approvals.push(decision);

    request.status = 'rejected';
    request.completedAt = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'approval_decision',
      accountId: request.accountId,
      actorId: approverId,
      actorRole: approverRole,
      action: 'reject',
      resource: 'approval_request',
      resourceId: requestId,
      details: { stepNumber: request.currentStep, reason },
      metadata: {},
    });

    return { success: true, request, isComplete: true };
  }

  async cancel(requestId: string, cancelledBy: string, reason?: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot cancel request with status: ${request.status}`);
    }

    request.status = 'cancelled';
    request.completedAt = new Date();
    request.metadata = { ...request.metadata, cancelledBy, cancellationReason: reason };

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'approval_decision',
      accountId: request.accountId,
      actorId: cancelledBy,
      actorRole: 'admin',
      action: 'cancel',
      resource: 'approval_request',
      resourceId: requestId,
      details: { reason },
      metadata: {},
    });
  }

  async shouldTriggerApproval(
    accountId: string,
    transaction: TransactionContext
  ): Promise<ApprovalEvaluation> {
    const matchingWorkflow = await this.findMatchingWorkflow(accountId, transaction);

    if (!matchingWorkflow) {
      return {
        requiresApproval: false,
        matchedTriggers: [],
        estimatedSteps: 0,
        estimatedTime: 0,
      };
    }

    const matchedTriggers = matchingWorkflow.triggerConditions.filter((trigger) =>
      this.evaluateTrigger(trigger, transaction)
    );

    const totalTimeoutHours = matchingWorkflow.steps.reduce(
      (sum, step) => sum + step.timeoutHours,
      0
    );

    return {
      requiresApproval: true,
      matchedWorkflow: matchingWorkflow,
      matchedTriggers,
      estimatedSteps: matchingWorkflow.steps.length,
      estimatedTime: totalTimeoutHours * 60,
    };
  }

  async findMatchingWorkflow(
    accountId: string,
    transaction: TransactionContext
  ): Promise<ApprovalWorkflow | null> {
    const workflows = await this.listWorkflows(accountId, 'active');

    // Sort by specificity (more conditions = more specific)
    workflows.sort((a, b) => {
      const aConditions = a.triggerConditions.reduce(
        (sum, t) => sum + t.conditions.length,
        0
      );
      const bConditions = b.triggerConditions.reduce(
        (sum, t) => sum + t.conditions.length,
        0
      );
      return bConditions - aConditions;
    });

    for (const workflow of workflows) {
      for (const trigger of workflow.triggerConditions) {
        if (this.evaluateTrigger(trigger, transaction)) {
          return workflow;
        }
      }
    }

    return null;
  }

  async processEscalations(): Promise<EscalationResult[]> {
    const results: EscalationResult[] = [];
    const now = new Date();

    for (const request of this.requests.values()) {
      if (request.status !== 'pending') continue;
      if (now <= request.expiresAt) continue;

      const workflow = this.workflows.get(request.workflowId);
      if (!workflow) continue;

      const currentStep = workflow.steps.find((s) => s.stepNumber === request.currentStep);
      if (!currentStep || !currentStep.escalateOnTimeout) {
        // Expire the request
        request.status = 'expired';
        continue;
      }

      // Find next step or escalation target
      const nextStep = workflow.steps.find((s) => s.stepNumber === request.currentStep + 1);

      if (nextStep) {
        const previousStep = request.currentStep;
        request.currentStep = nextStep.stepNumber;
        request.expiresAt = new Date(
          Date.now() + nextStep.timeoutHours * 60 * 60 * 1000
        );

        results.push({
          requestId: request.id,
          escalatedFrom: previousStep,
          escalatedTo: nextStep.stepNumber,
          notifiedRoles: nextStep.approverRoles,
          success: true,
        });

        this.emitEvent({
          id: `event_${Date.now()}`,
          timestamp: new Date(),
          type: 'approval_decision',
          accountId: request.accountId,
          actorId: 'system',
          actorRole: 'admin',
          action: 'escalate',
          resource: 'approval_request',
          resourceId: request.id,
          details: { from: previousStep, to: nextStep.stepNumber, reason: 'timeout' },
          metadata: {},
        });
      } else if (currentStep.escalateTo) {
        // Notify escalation target without changing step
        results.push({
          requestId: request.id,
          escalatedFrom: request.currentStep,
          escalatedTo: request.currentStep,
          notifiedRoles: [currentStep.escalateTo],
          success: true,
        });

        // Extend timeout
        request.expiresAt = new Date(
          Date.now() + currentStep.timeoutHours * 60 * 60 * 1000
        );
      } else {
        request.status = 'expired';
      }
    }

    return results;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // Initialize default workflows for an account
  async initializeDefaultWorkflows(accountId: string, createdBy: string): Promise<void> {
    for (const template of DEFAULT_WORKFLOW_TEMPLATES) {
      const workflow = await this.createWorkflow(
        accountId,
        template.name,
        template.description,
        template.triggerConditions,
        template.steps,
        createdBy
      );
      await this.activateWorkflow(workflow.id, createdBy);
    }
  }

  private generateWorkflowId(): string {
    this.workflowCounter++;
    return `workflow_${Date.now()}_${this.workflowCounter.toString(36)}`;
  }

  private generateRequestId(): string {
    this.requestCounter++;
    return `request_${Date.now()}_${this.requestCounter.toString(36)}`;
  }

  private evaluateTrigger(trigger: WorkflowTrigger, transaction: TransactionContext): boolean {
    for (const condition of trigger.conditions) {
      const value = this.getTransactionFieldValue(transaction, condition.field);
      if (!this.evaluateCondition(value, condition.operator, condition.value)) {
        return false;
      }
    }
    return true;
  }

  private getTransactionFieldValue(transaction: TransactionContext, field: string): unknown {
    switch (field) {
      case 'amount':
        return transaction.amount;
      case 'type':
        return transaction.type;
      case 'currency':
        return transaction.currency;
      case 'source':
        return transaction.source;
      case 'destination':
        return transaction.destination;
      case 'destinationType':
        return transaction.destinationType;
      case 'riskScore':
        return transaction.riskScore;
      default:
        return transaction.metadata[field];
    }
  }

  private evaluateCondition(
    value: unknown,
    operator: ConditionOperator,
    conditionValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === conditionValue;
      case 'not_equals':
        return value !== conditionValue;
      case 'greater_than':
        return (value as number) > (conditionValue as number);
      case 'less_than':
        return (value as number) < (conditionValue as number);
      case 'greater_than_or_equals':
        return (value as number) >= (conditionValue as number);
      case 'less_than_or_equals':
        return (value as number) <= (conditionValue as number);
      case 'contains':
        return String(value).includes(String(conditionValue));
      case 'in':
        return (conditionValue as unknown[]).includes(value);
      default:
        return false;
    }
  }

  private emitEvent(event: Parameters<InstitutionalEventCallback>[0]): void {
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

export function createApprovalWorkflowManager(): DefaultApprovalWorkflowManager {
  return new DefaultApprovalWorkflowManager();
}

export { DEFAULT_WORKFLOW_TEMPLATES };
