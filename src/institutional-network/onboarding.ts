/**
 * TONAIAgent - Institutional Onboarding Management
 *
 * Manages the complete onboarding workflow for institutional partners including
 * due diligence processes, compliance checks, document verification, and
 * integration setup tracking.
 */

import {
  OnboardingWorkflow,
  OnboardingStatus,
  OnboardingPhase,
  OnboardingPhaseDetail,
  OnboardingTask,
  DueDiligenceProcess,
  DueDiligenceCategory,
  DueDiligenceFinding,
  OnboardingComplianceCheck,
  RequiredDocument,
  OnboardingIntegration,
  IntegrationTask,
  TestResults,
  OnboardingTimeline,
  OnboardingMilestone,
  OnboardingDelay,
  InstitutionalPartnerType,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
  OnboardingConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface OnboardingManager {
  // Workflow management
  createOnboardingWorkflow(
    partnerId: string,
    partnerType: InstitutionalPartnerType
  ): Promise<OnboardingWorkflow>;
  getWorkflow(workflowId: string): Promise<OnboardingWorkflow | null>;
  updateWorkflowPhase(
    workflowId: string,
    phase: OnboardingPhase,
    status: OnboardingPhaseDetail['status']
  ): Promise<OnboardingWorkflow>;
  getActiveWorkflows(): Promise<OnboardingWorkflow[]>;
  getBlockedWorkflows(): Promise<OnboardingWorkflow[]>;

  // Task management
  completeTask(workflowId: string, taskId: string, completedBy: string): Promise<OnboardingWorkflow>;
  addTask(workflowId: string, phase: OnboardingPhase, task: Omit<OnboardingTask, 'id'>): Promise<OnboardingTask>;
  updateTask(workflowId: string, taskId: string, updates: Partial<OnboardingTask>): Promise<OnboardingTask>;
  getTasksByPhase(workflowId: string, phase: OnboardingPhase): Promise<OnboardingTask[]>;

  // Due diligence
  startDueDiligence(
    workflowId: string,
    level: DueDiligenceProcess['level']
  ): Promise<OnboardingWorkflow>;
  addDueDiligenceFinding(
    workflowId: string,
    finding: Omit<DueDiligenceFinding, 'id' | 'createdAt'>
  ): Promise<DueDiligenceFinding>;
  updateDueDiligenceCategory(
    workflowId: string,
    categoryName: string,
    updates: Partial<DueDiligenceCategory>
  ): Promise<DueDiligenceCategory>;
  completeDueDiligence(
    workflowId: string,
    recommendation: DueDiligenceProcess['recommendation'],
    completedBy: string
  ): Promise<OnboardingWorkflow>;

  // Compliance checks
  updateComplianceCheck(
    workflowId: string,
    checkType: keyof Pick<
      OnboardingComplianceCheck,
      'kycStatus' | 'amlStatus' | 'sanctionsStatus' | 'pepStatus' | 'adverseMediaStatus'
    >,
    status: string
  ): Promise<OnboardingWorkflow>;
  getComplianceStatus(workflowId: string): Promise<OnboardingComplianceCheck>;

  // Document management
  submitDocument(
    workflowId: string,
    document: Omit<RequiredDocument, 'status' | 'uploadedAt'>
  ): Promise<RequiredDocument>;
  verifyDocument(
    workflowId: string,
    documentType: string,
    verifiedBy: string
  ): Promise<RequiredDocument>;
  rejectDocument(
    workflowId: string,
    documentType: string,
    reason: string
  ): Promise<RequiredDocument>;
  getPendingDocuments(workflowId: string): Promise<RequiredDocument[]>;

  // Integration management
  startIntegration(workflowId: string): Promise<OnboardingWorkflow>;
  addIntegrationTask(
    workflowId: string,
    task: Omit<IntegrationTask, 'id'>
  ): Promise<IntegrationTask>;
  completeIntegrationTask(
    workflowId: string,
    taskId: string
  ): Promise<IntegrationTask>;
  completeIntegration(
    workflowId: string,
    testResults: TestResults
  ): Promise<OnboardingWorkflow>;

  // Timeline and milestone tracking
  addMilestone(
    workflowId: string,
    milestone: Omit<OnboardingMilestone, 'status'>
  ): Promise<OnboardingMilestone>;
  updateMilestone(
    workflowId: string,
    milestoneName: string,
    updates: Partial<OnboardingMilestone>
  ): Promise<OnboardingMilestone>;
  recordDelay(
    workflowId: string,
    delay: Omit<OnboardingDelay, 'recordedAt'>
  ): Promise<OnboardingDelay>;

  // Metrics and analytics
  getOnboardingMetrics(): Promise<OnboardingMetrics>;
  getWorkflowProgress(workflowId: string): Promise<WorkflowProgress>;
  getAverageOnboardingTime(partnerType?: InstitutionalPartnerType): Promise<number>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): OnboardingHealth;
}

export interface OnboardingMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  rejectedWorkflows: number;
  blockedWorkflows: number;
  workflowsByStatus: Record<OnboardingStatus, number>;
  workflowsByPhase: Record<OnboardingPhase, number>;
  averageOnboardingDays: number;
  averageDueDiligenceDays: number;
  averageComplianceDays: number;
  averageIntegrationDays: number;
  documentVerificationRate: number;
  complianceApprovalRate: number;
  dueDiligenceApprovalRate: number;
  topDelayReasons: DelayReason[];
  recentCompletions: WorkflowSummary[];
  upcomingMilestones: MilestoneSummary[];
}

export interface DelayReason {
  reason: string;
  count: number;
  averageDuration: number;
  category: OnboardingDelay['category'];
}

export interface WorkflowSummary {
  workflowId: string;
  partnerId: string;
  partnerType: InstitutionalPartnerType;
  status: OnboardingStatus;
  currentPhase: OnboardingPhase;
  startedAt: Date;
  completedAt?: Date;
  durationDays?: number;
}

export interface MilestoneSummary {
  workflowId: string;
  partnerId: string;
  milestoneName: string;
  targetDate: Date;
  status: OnboardingMilestone['status'];
  daysUntilDue: number;
}

export interface WorkflowProgress {
  workflowId: string;
  overallProgress: number;
  phaseProgress: Record<OnboardingPhase, number>;
  tasksCompleted: number;
  totalTasks: number;
  documentsVerified: number;
  totalDocuments: number;
  complianceChecksCompleted: number;
  totalComplianceChecks: number;
  dueDiligenceProgress: number;
  integrationProgress: number;
  estimatedCompletionDate?: Date;
  blockers: string[];
}

export interface OnboardingHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeWorkflowCount: number;
  blockedWorkflowCount: number;
  overdueTaskCount: number;
  lastActivityAt: Date;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultOnboardingManager implements OnboardingManager {
  private workflows: Map<string, OnboardingWorkflow> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: OnboardingConfig;
  private lastActivityAt: Date = new Date();

  constructor(config?: Partial<OnboardingConfig>) {
    this.config = {
      enabled: true,
      defaultWorkflow: 'standard',
      dueDiligenceLevel: 'standard',
      autoApprovalEnabled: false,
      autoApprovalThreshold: 90,
      timeoutDays: 90,
      ...config,
    };
  }

  async createOnboardingWorkflow(
    partnerId: string,
    partnerType: InstitutionalPartnerType
  ): Promise<OnboardingWorkflow> {
    const workflowId = this.generateId('onboarding');
    const now = new Date();

    const workflow: OnboardingWorkflow = {
      id: workflowId,
      partnerId,
      partnerType,
      status: 'in_progress',
      currentPhase: 'initial_contact',
      phases: this.createDefaultPhases(partnerType),
      dueDiligence: this.createDefaultDueDiligence(partnerType),
      compliance: this.createDefaultComplianceCheck(partnerType),
      integration: this.createDefaultIntegration(),
      timeline: this.createDefaultTimeline(partnerType),
      assignedTo: '',
      startedAt: now,
      metadata: {},
    };

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;
    this.emitEvent('partner_onboarded', 'partner', partnerId, 'onboarding_started', {
      workflowId,
      partnerType,
    });

    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<OnboardingWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  async updateWorkflowPhase(
    workflowId: string,
    phase: OnboardingPhase,
    status: OnboardingPhaseDetail['status']
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const phaseDetail = workflow.phases.find((p) => p.phase === phase);
    if (!phaseDetail) {
      throw new Error(`Phase not found: ${phase}`);
    }

    const now = new Date();
    const previousStatus = phaseDetail.status;
    phaseDetail.status = status;

    if (status === 'in_progress' && !phaseDetail.startedAt) {
      phaseDetail.startedAt = now;
    } else if (status === 'completed' && !phaseDetail.completedAt) {
      phaseDetail.completedAt = now;
    }

    // Update current phase if moving forward
    if (status === 'in_progress') {
      workflow.currentPhase = phase;
    }

    // Check if all phases are completed
    const allCompleted = workflow.phases.every((p) => p.status === 'completed');
    if (allCompleted) {
      workflow.status = 'completed';
      workflow.completedAt = now;
      workflow.currentPhase = 'completed';
    }

    // Check for blocked status
    const hasBlocked = workflow.phases.some((p) => p.status === 'blocked');
    if (hasBlocked && workflow.status !== 'completed') {
      workflow.status = 'on_hold';
    }

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;
    this.emitEvent('partner_status_changed', 'partner', workflow.partnerId, 'phase_updated', {
      workflowId,
      phase,
      previousStatus,
      newStatus: status,
    });

    return workflow;
  }

  async getActiveWorkflows(): Promise<OnboardingWorkflow[]> {
    return Array.from(this.workflows.values()).filter(
      (w) => w.status === 'in_progress' || w.status === 'pending_review' || w.status === 'pending_approval'
    );
  }

  async getBlockedWorkflows(): Promise<OnboardingWorkflow[]> {
    return Array.from(this.workflows.values()).filter(
      (w) => w.status === 'on_hold' || w.phases.some((p) => p.status === 'blocked')
    );
  }

  async completeTask(
    workflowId: string,
    taskId: string,
    completedBy: string
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    let taskFound = false;
    const now = new Date();

    for (const phase of workflow.phases) {
      const task = phase.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = now;
        task.completedBy = completedBy;
        taskFound = true;
        break;
      }
    }

    if (!taskFound) {
      throw new Error(`Task not found: ${taskId}`);
    }

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;
    this.emitEvent('partner_status_changed', 'partner', workflow.partnerId, 'task_completed', {
      workflowId,
      taskId,
      completedBy,
    });

    return workflow;
  }

  async addTask(
    workflowId: string,
    phase: OnboardingPhase,
    task: Omit<OnboardingTask, 'id'>
  ): Promise<OnboardingTask> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const phaseDetail = workflow.phases.find((p) => p.phase === phase);
    if (!phaseDetail) {
      throw new Error(`Phase not found: ${phase}`);
    }

    const newTask: OnboardingTask = {
      id: this.generateId('task'),
      ...task,
    };

    phaseDetail.tasks.push(newTask);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return newTask;
  }

  async updateTask(
    workflowId: string,
    taskId: string,
    updates: Partial<OnboardingTask>
  ): Promise<OnboardingTask> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    for (const phase of workflow.phases) {
      const taskIndex = phase.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        phase.tasks[taskIndex] = { ...phase.tasks[taskIndex], ...updates };
        this.workflows.set(workflowId, workflow);
        this.lastActivityAt = new Date();
        return phase.tasks[taskIndex];
      }
    }

    throw new Error(`Task not found: ${taskId}`);
  }

  async getTasksByPhase(workflowId: string, phase: OnboardingPhase): Promise<OnboardingTask[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const phaseDetail = workflow.phases.find((p) => p.phase === phase);
    return phaseDetail?.tasks || [];
  }

  async startDueDiligence(
    workflowId: string,
    level: DueDiligenceProcess['level']
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.dueDiligence.level = level;
    workflow.dueDiligence.status = 'in_progress';

    // Set all categories to in_progress
    for (const category of workflow.dueDiligence.categories) {
      if (category.status === 'not_started') {
        category.status = 'in_progress';
      }
    }

    // Update workflow phase
    await this.updateWorkflowPhase(workflowId, 'due_diligence', 'in_progress');

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();
    this.emitEvent('partner_status_changed', 'partner', workflow.partnerId, 'due_diligence_started', {
      workflowId,
      level,
    });

    return workflow;
  }

  async addDueDiligenceFinding(
    workflowId: string,
    finding: Omit<DueDiligenceFinding, 'id' | 'createdAt'>
  ): Promise<DueDiligenceFinding> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const newFinding: DueDiligenceFinding = {
      id: this.generateId('finding'),
      createdAt: new Date(),
      ...finding,
    };

    // Add to appropriate category
    const category = workflow.dueDiligence.categories.find(
      (c) => c.type === finding.category || c.name.toLowerCase().includes(finding.category.toLowerCase())
    );
    if (category) {
      category.findings.push(newFinding);
    }

    // Recalculate overall risk score
    this.recalculateDueDiligenceRisk(workflow);

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    if (finding.severity === 'high' || finding.severity === 'critical') {
      this.emitEvent('risk_alert', 'compliance', workflow.partnerId, 'dd_finding_added', {
        workflowId,
        findingId: newFinding.id,
        severity: finding.severity,
      });
    }

    return newFinding;
  }

  async updateDueDiligenceCategory(
    workflowId: string,
    categoryName: string,
    updates: Partial<DueDiligenceCategory>
  ): Promise<DueDiligenceCategory> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const category = workflow.dueDiligence.categories.find(
      (c) => c.name === categoryName || c.type === categoryName
    );
    if (!category) {
      throw new Error(`Category not found: ${categoryName}`);
    }

    Object.assign(category, updates);
    this.recalculateDueDiligenceRisk(workflow);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return category;
  }

  async completeDueDiligence(
    workflowId: string,
    recommendation: DueDiligenceProcess['recommendation'],
    completedBy: string
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const now = new Date();
    workflow.dueDiligence.status = 'completed';
    workflow.dueDiligence.recommendation = recommendation;
    workflow.dueDiligence.completedAt = now;
    workflow.dueDiligence.completedBy = completedBy;

    // Complete all categories
    for (const category of workflow.dueDiligence.categories) {
      if (category.status !== 'completed') {
        category.status = 'completed';
      }
    }

    // Update workflow phase
    await this.updateWorkflowPhase(workflowId, 'due_diligence', 'completed');

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;
    this.emitEvent('partner_status_changed', 'partner', workflow.partnerId, 'due_diligence_completed', {
      workflowId,
      recommendation,
      completedBy,
    });

    return workflow;
  }

  async updateComplianceCheck(
    workflowId: string,
    checkType: keyof Pick<
      OnboardingComplianceCheck,
      'kycStatus' | 'amlStatus' | 'sanctionsStatus' | 'pepStatus' | 'adverseMediaStatus'
    >,
    status: string
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    (workflow.compliance[checkType] as string) = status;

    // Update overall compliance status
    this.updateOverallComplianceStatus(workflow);

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    // Check for compliance alerts
    if (status === 'flagged' || status === 'match_found' || status === 'identified' || status === 'rejected') {
      this.emitEvent('compliance_alert', 'compliance', workflow.partnerId, 'compliance_check_alert', {
        workflowId,
        checkType,
        status,
      });
    }

    return workflow;
  }

  async getComplianceStatus(workflowId: string): Promise<OnboardingComplianceCheck> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow.compliance;
  }

  async submitDocument(
    workflowId: string,
    document: Omit<RequiredDocument, 'status' | 'uploadedAt'>
  ): Promise<RequiredDocument> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const existingDoc = workflow.compliance.requiredDocuments.find((d) => d.type === document.type);
    const now = new Date();

    if (existingDoc) {
      existingDoc.status = 'received';
      existingDoc.uploadedAt = now;
      existingDoc.name = document.name;
      existingDoc.required = document.required;
      if (document.expiresAt) {
        existingDoc.expiresAt = document.expiresAt;
      }
      if (document.notes) {
        existingDoc.notes = document.notes;
      }

      this.workflows.set(workflowId, workflow);
      this.lastActivityAt = now;
      return existingDoc;
    }

    const newDoc: RequiredDocument = {
      ...document,
      status: 'received',
      uploadedAt: now,
    };

    workflow.compliance.requiredDocuments.push(newDoc);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;

    return newDoc;
  }

  async verifyDocument(
    workflowId: string,
    documentType: string,
    verifiedBy: string
  ): Promise<RequiredDocument> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const document = workflow.compliance.requiredDocuments.find((d) => d.type === documentType);
    if (!document) {
      throw new Error(`Document not found: ${documentType}`);
    }

    const now = new Date();
    document.status = 'verified';
    document.verifiedAt = now;
    document.verifiedBy = verifiedBy;

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = now;
    this.emitEvent('compliance_updated', 'compliance', workflow.partnerId, 'document_verified', {
      workflowId,
      documentType,
      verifiedBy,
    });

    return document;
  }

  async rejectDocument(
    workflowId: string,
    documentType: string,
    reason: string
  ): Promise<RequiredDocument> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const document = workflow.compliance.requiredDocuments.find((d) => d.type === documentType);
    if (!document) {
      throw new Error(`Document not found: ${documentType}`);
    }

    document.status = 'rejected';
    document.notes = reason;

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();
    this.emitEvent('compliance_alert', 'compliance', workflow.partnerId, 'document_rejected', {
      workflowId,
      documentType,
      reason,
    });

    return document;
  }

  async getPendingDocuments(workflowId: string): Promise<RequiredDocument[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow.compliance.requiredDocuments.filter(
      (d) => d.status === 'pending' || d.status === 'received'
    );
  }

  async startIntegration(workflowId: string): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.integration.status = 'in_progress';
    workflow.integration.sandboxAccess = true;

    // Update workflow phase
    await this.updateWorkflowPhase(workflowId, 'technical_integration', 'in_progress');

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();
    this.emitEvent('integration_connected', 'integration', workflow.partnerId, 'integration_started', {
      workflowId,
    });

    return workflow;
  }

  async addIntegrationTask(
    workflowId: string,
    task: Omit<IntegrationTask, 'id'>
  ): Promise<IntegrationTask> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const newTask: IntegrationTask = {
      id: this.generateId('inttask'),
      ...task,
    };

    workflow.integration.integrationTasks.push(newTask);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return newTask;
  }

  async completeIntegrationTask(workflowId: string, taskId: string): Promise<IntegrationTask> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const task = workflow.integration.integrationTasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Integration task not found: ${taskId}`);
    }

    task.status = 'completed';
    task.completedAt = new Date();

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return task;
  }

  async completeIntegration(
    workflowId: string,
    testResults: TestResults
  ): Promise<OnboardingWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.integration.testResults = testResults;
    workflow.integration.productionAccess = testResults.passed;

    if (testResults.passed) {
      workflow.integration.status = 'completed';
      await this.updateWorkflowPhase(workflowId, 'technical_integration', 'completed');
      await this.updateWorkflowPhase(workflowId, 'testing', 'completed');
    } else {
      workflow.integration.status = 'testing';
    }

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();
    this.emitEvent('integration_connected', 'integration', workflow.partnerId, 'integration_completed', {
      workflowId,
      testsPassed: testResults.passed,
      coverage: testResults.coveragePercent,
    });

    return workflow;
  }

  async addMilestone(
    workflowId: string,
    milestone: Omit<OnboardingMilestone, 'status'>
  ): Promise<OnboardingMilestone> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const newMilestone: OnboardingMilestone = {
      ...milestone,
      status: 'pending',
    };

    workflow.timeline.milestones.push(newMilestone);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return newMilestone;
  }

  async updateMilestone(
    workflowId: string,
    milestoneName: string,
    updates: Partial<OnboardingMilestone>
  ): Promise<OnboardingMilestone> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const milestone = workflow.timeline.milestones.find((m) => m.name === milestoneName);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneName}`);
    }

    Object.assign(milestone, updates);
    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    if (updates.status === 'completed') {
      this.emitEvent('expansion_milestone', 'partner', workflow.partnerId, 'milestone_completed', {
        workflowId,
        milestoneName,
      });
    }

    return milestone;
  }

  async recordDelay(
    workflowId: string,
    delay: Omit<OnboardingDelay, 'recordedAt'>
  ): Promise<OnboardingDelay> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const newDelay: OnboardingDelay = {
      ...delay,
      recordedAt: new Date(),
    };

    workflow.timeline.delays.push(newDelay);
    workflow.timeline.actualDuration =
      (workflow.timeline.actualDuration || workflow.timeline.estimatedDuration) + delay.duration;

    this.workflows.set(workflowId, workflow);
    this.lastActivityAt = new Date();

    return newDelay;
  }

  async getOnboardingMetrics(): Promise<OnboardingMetrics> {
    const workflows = Array.from(this.workflows.values());

    const workflowsByStatus: Record<OnboardingStatus, number> = {
      not_started: 0,
      in_progress: 0,
      pending_review: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      on_hold: 0,
      completed: 0,
    };

    const workflowsByPhase: Record<OnboardingPhase, number> = {
      initial_contact: 0,
      qualification: 0,
      due_diligence: 0,
      compliance_review: 0,
      legal_review: 0,
      agreement_negotiation: 0,
      technical_integration: 0,
      testing: 0,
      go_live: 0,
      completed: 0,
    };

    let totalOnboardingDays = 0;
    let completedCount = 0;
    let totalDueDiligenceDays = 0;
    let ddCompletedCount = 0;
    let totalComplianceDays = 0;
    let complianceCompletedCount = 0;
    let totalIntegrationDays = 0;
    let integrationCompletedCount = 0;
    let documentsVerified = 0;
    let totalDocuments = 0;
    let complianceApproved = 0;
    let complianceTotal = 0;
    let ddApproved = 0;
    let ddTotal = 0;
    const delayReasons: Map<string, { count: number; totalDays: number; category: OnboardingDelay['category'] }> =
      new Map();

    for (const workflow of workflows) {
      workflowsByStatus[workflow.status]++;
      workflowsByPhase[workflow.currentPhase]++;

      // Calculate onboarding days
      if (workflow.completedAt) {
        const days = Math.ceil(
          (workflow.completedAt.getTime() - workflow.startedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalOnboardingDays += days;
        completedCount++;
      }

      // Calculate due diligence days
      if (workflow.dueDiligence.completedAt) {
        const ddPhase = workflow.phases.find((p) => p.phase === 'due_diligence');
        if (ddPhase?.startedAt && ddPhase.completedAt) {
          const days = Math.ceil(
            (ddPhase.completedAt.getTime() - ddPhase.startedAt.getTime()) / (24 * 60 * 60 * 1000)
          );
          totalDueDiligenceDays += days;
          ddCompletedCount++;
        }
      }

      // Calculate compliance days
      const compPhase = workflow.phases.find((p) => p.phase === 'compliance_review');
      if (compPhase?.startedAt && compPhase.completedAt) {
        const days = Math.ceil(
          (compPhase.completedAt.getTime() - compPhase.startedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalComplianceDays += days;
        complianceCompletedCount++;
      }

      // Calculate integration days
      if (workflow.integration.status === 'completed') {
        const intPhase = workflow.phases.find((p) => p.phase === 'technical_integration');
        if (intPhase?.startedAt && intPhase.completedAt) {
          const days = Math.ceil(
            (intPhase.completedAt.getTime() - intPhase.startedAt.getTime()) / (24 * 60 * 60 * 1000)
          );
          totalIntegrationDays += days;
          integrationCompletedCount++;
        }
      }

      // Count document verification
      for (const doc of workflow.compliance.requiredDocuments) {
        totalDocuments++;
        if (doc.status === 'verified') {
          documentsVerified++;
        }
      }

      // Count compliance approvals
      if (workflow.compliance.overallStatus !== 'pending') {
        complianceTotal++;
        if (workflow.compliance.overallStatus === 'approved') {
          complianceApproved++;
        }
      }

      // Count DD approvals
      if (workflow.dueDiligence.status === 'completed') {
        ddTotal++;
        if (workflow.dueDiligence.recommendation === 'approve') {
          ddApproved++;
        }
      }

      // Aggregate delay reasons
      for (const delay of workflow.timeline.delays) {
        const existing = delayReasons.get(delay.reason) || {
          count: 0,
          totalDays: 0,
          category: delay.category,
        };
        existing.count++;
        existing.totalDays += delay.duration;
        delayReasons.set(delay.reason, existing);
      }
    }

    // Build top delay reasons
    const topDelayReasons: DelayReason[] = Array.from(delayReasons.entries())
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        averageDuration: data.totalDays / data.count,
        category: data.category,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent completions
    const recentCompletions: WorkflowSummary[] = workflows
      .filter((w) => w.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 5)
      .map((w) => ({
        workflowId: w.id,
        partnerId: w.partnerId,
        partnerType: w.partnerType,
        status: w.status,
        currentPhase: w.currentPhase,
        startedAt: w.startedAt,
        completedAt: w.completedAt,
        durationDays: w.completedAt
          ? Math.ceil((w.completedAt.getTime() - w.startedAt.getTime()) / (24 * 60 * 60 * 1000))
          : undefined,
      }));

    // Get upcoming milestones
    const now = new Date();
    const upcomingMilestones: MilestoneSummary[] = [];
    for (const workflow of workflows) {
      for (const milestone of workflow.timeline.milestones) {
        if (milestone.status === 'pending' || milestone.status === 'at_risk') {
          const daysUntilDue = Math.ceil(
            (milestone.targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );
          upcomingMilestones.push({
            workflowId: workflow.id,
            partnerId: workflow.partnerId,
            milestoneName: milestone.name,
            targetDate: milestone.targetDate,
            status: milestone.status,
            daysUntilDue,
          });
        }
      }
    }
    upcomingMilestones.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflowsByStatus['in_progress'] +
        workflowsByStatus['pending_review'] +
        workflowsByStatus['pending_approval'],
      completedWorkflows: workflowsByStatus['completed'],
      rejectedWorkflows: workflowsByStatus['rejected'],
      blockedWorkflows: workflowsByStatus['on_hold'],
      workflowsByStatus,
      workflowsByPhase,
      averageOnboardingDays: completedCount > 0 ? totalOnboardingDays / completedCount : 0,
      averageDueDiligenceDays: ddCompletedCount > 0 ? totalDueDiligenceDays / ddCompletedCount : 0,
      averageComplianceDays: complianceCompletedCount > 0 ? totalComplianceDays / complianceCompletedCount : 0,
      averageIntegrationDays: integrationCompletedCount > 0 ? totalIntegrationDays / integrationCompletedCount : 0,
      documentVerificationRate: totalDocuments > 0 ? (documentsVerified / totalDocuments) * 100 : 0,
      complianceApprovalRate: complianceTotal > 0 ? (complianceApproved / complianceTotal) * 100 : 0,
      dueDiligenceApprovalRate: ddTotal > 0 ? (ddApproved / ddTotal) * 100 : 0,
      topDelayReasons,
      recentCompletions,
      upcomingMilestones: upcomingMilestones.slice(0, 10),
    };
  }

  async getWorkflowProgress(workflowId: string): Promise<WorkflowProgress> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const phaseProgress: Record<OnboardingPhase, number> = {
      initial_contact: 0,
      qualification: 0,
      due_diligence: 0,
      compliance_review: 0,
      legal_review: 0,
      agreement_negotiation: 0,
      technical_integration: 0,
      testing: 0,
      go_live: 0,
      completed: 0,
    };

    let totalTasks = 0;
    let tasksCompleted = 0;
    const blockers: string[] = [];

    for (const phase of workflow.phases) {
      const phaseTotalTasks = phase.tasks.length;
      const phaseCompletedTasks = phase.tasks.filter((t) => t.status === 'completed').length;
      phaseProgress[phase.phase] = phaseTotalTasks > 0 ? (phaseCompletedTasks / phaseTotalTasks) * 100 : 0;
      totalTasks += phaseTotalTasks;
      tasksCompleted += phaseCompletedTasks;

      if (phase.blockers) {
        blockers.push(...phase.blockers);
      }
    }

    const totalDocuments = workflow.compliance.requiredDocuments.length;
    const documentsVerified = workflow.compliance.requiredDocuments.filter(
      (d) => d.status === 'verified'
    ).length;

    const complianceChecks = ['kycStatus', 'amlStatus', 'sanctionsStatus', 'pepStatus', 'adverseMediaStatus'] as const;
    const totalComplianceChecks = complianceChecks.length;
    const complianceChecksCompleted = complianceChecks.filter(
      (check) =>
        workflow.compliance[check] !== 'not_started' && workflow.compliance[check] !== 'in_progress'
    ).length;

    const ddCategories = workflow.dueDiligence.categories;
    const ddProgress =
      ddCategories.length > 0
        ? (ddCategories.filter((c) => c.status === 'completed').length / ddCategories.length) * 100
        : 0;

    const integrationTasks = workflow.integration.integrationTasks;
    const integrationProgress =
      integrationTasks.length > 0
        ? (integrationTasks.filter((t) => t.status === 'completed').length / integrationTasks.length) * 100
        : 0;

    const overallProgress = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

    return {
      workflowId,
      overallProgress,
      phaseProgress,
      tasksCompleted,
      totalTasks,
      documentsVerified,
      totalDocuments,
      complianceChecksCompleted,
      totalComplianceChecks,
      dueDiligenceProgress: ddProgress,
      integrationProgress,
      blockers,
    };
  }

  async getAverageOnboardingTime(partnerType?: InstitutionalPartnerType): Promise<number> {
    let workflows = Array.from(this.workflows.values()).filter(
      (w) => w.status === 'completed' && w.completedAt
    );

    if (partnerType) {
      workflows = workflows.filter((w) => w.partnerType === partnerType);
    }

    if (workflows.length === 0) {
      return 0;
    }

    const totalDays = workflows.reduce((sum, w) => {
      const days = Math.ceil((w.completedAt!.getTime() - w.startedAt.getTime()) / (24 * 60 * 60 * 1000));
      return sum + days;
    }, 0);

    return totalDays / workflows.length;
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): OnboardingHealth {
    const issues: string[] = [];
    const workflows = Array.from(this.workflows.values());
    const activeWorkflows = workflows.filter(
      (w) => w.status === 'in_progress' || w.status === 'pending_review' || w.status === 'pending_approval'
    );
    const blockedWorkflows = workflows.filter(
      (w) => w.status === 'on_hold' || w.phases.some((p) => p.status === 'blocked')
    );

    // Count overdue tasks
    let overdueTaskCount = 0;
    const now = new Date();
    for (const workflow of activeWorkflows) {
      for (const phase of workflow.phases) {
        for (const task of phase.tasks) {
          if (task.dueDate && task.status !== 'completed' && task.dueDate < now) {
            overdueTaskCount++;
          }
        }
      }
    }

    // Check for issues
    if (blockedWorkflows.length > 0) {
      issues.push(`${blockedWorkflows.length} workflows are blocked`);
    }
    if (overdueTaskCount > 0) {
      issues.push(`${overdueTaskCount} tasks are overdue`);
    }

    // Check for stale workflows
    const staleThreshold = this.config.timeoutDays * 24 * 60 * 60 * 1000;
    const staleWorkflows = activeWorkflows.filter(
      (w) => now.getTime() - w.startedAt.getTime() > staleThreshold
    );
    if (staleWorkflows.length > 0) {
      issues.push(`${staleWorkflows.length} workflows have exceeded timeout threshold`);
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 0) {
      status = 'degraded';
    }
    if (blockedWorkflows.length > 5 || overdueTaskCount > 10) {
      status = 'unhealthy';
    }

    return {
      status,
      activeWorkflowCount: activeWorkflows.length,
      blockedWorkflowCount: blockedWorkflows.length,
      overdueTaskCount,
      lastActivityAt: this.lastActivityAt,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'onboarding_manager',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'partner', id: sourceId, impact: 'direct' }],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private createDefaultPhases(partnerType: InstitutionalPartnerType): OnboardingPhaseDetail[] {
    const phases: OnboardingPhase[] = [
      'initial_contact',
      'qualification',
      'due_diligence',
      'compliance_review',
      'legal_review',
      'agreement_negotiation',
      'technical_integration',
      'testing',
      'go_live',
    ];

    return phases.map((phase, index) => ({
      phase,
      status: index === 0 ? 'in_progress' : 'not_started',
      startedAt: index === 0 ? new Date() : undefined,
      tasks: this.getDefaultTasksForPhase(phase, partnerType),
    }));
  }

  private getDefaultTasksForPhase(
    phase: OnboardingPhase,
    partnerType: InstitutionalPartnerType
  ): OnboardingTask[] {
    const baseTasks: Record<OnboardingPhase, Array<Omit<OnboardingTask, 'id'>>> = {
      initial_contact: [
        {
          name: 'Initial discovery call',
          description: 'Conduct initial discovery call with partner',
          type: 'meeting',
          status: 'pending',
          required: true,
        },
        {
          name: 'Collect initial information',
          description: 'Gather basic company information and requirements',
          type: 'document',
          status: 'pending',
          required: true,
        },
      ],
      qualification: [
        {
          name: 'Partner qualification review',
          description: 'Review partner against qualification criteria',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Stakeholder approval',
          description: 'Obtain internal stakeholder approval to proceed',
          type: 'approval',
          status: 'pending',
          required: true,
        },
      ],
      due_diligence: [
        {
          name: 'Corporate due diligence',
          description: 'Review corporate structure and ownership',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Financial due diligence',
          description: 'Review financial statements and stability',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Regulatory due diligence',
          description: 'Review regulatory status and licenses',
          type: 'review',
          status: 'pending',
          required: true,
        },
      ],
      compliance_review: [
        {
          name: 'KYC verification',
          description: 'Complete Know Your Customer verification',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'AML screening',
          description: 'Complete Anti-Money Laundering screening',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Sanctions screening',
          description: 'Complete sanctions list screening',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'PEP screening',
          description: 'Complete Politically Exposed Person screening',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Adverse media check',
          description: 'Complete adverse media screening',
          type: 'review',
          status: 'pending',
          required: true,
        },
      ],
      legal_review: [
        {
          name: 'Legal entity verification',
          description: 'Verify legal entity documentation',
          type: 'document',
          status: 'pending',
          required: true,
        },
        {
          name: 'Legal counsel review',
          description: 'Internal legal team review',
          type: 'review',
          status: 'pending',
          required: true,
        },
      ],
      agreement_negotiation: [
        {
          name: 'Draft agreement',
          description: 'Draft partnership agreement',
          type: 'document',
          status: 'pending',
          required: true,
        },
        {
          name: 'Agreement negotiation',
          description: 'Negotiate terms with partner',
          type: 'meeting',
          status: 'pending',
          required: true,
        },
        {
          name: 'Agreement execution',
          description: 'Execute final agreement',
          type: 'approval',
          status: 'pending',
          required: true,
        },
      ],
      technical_integration: [
        {
          name: 'API credentials setup',
          description: 'Issue API credentials to partner',
          type: 'technical',
          status: 'pending',
          required: true,
        },
        {
          name: 'Sandbox environment setup',
          description: 'Configure sandbox environment for testing',
          type: 'technical',
          status: 'pending',
          required: true,
        },
        {
          name: 'Integration development',
          description: 'Complete integration development',
          type: 'technical',
          status: 'pending',
          required: true,
        },
      ],
      testing: [
        {
          name: 'Integration testing',
          description: 'Complete integration testing in sandbox',
          type: 'technical',
          status: 'pending',
          required: true,
        },
        {
          name: 'UAT sign-off',
          description: 'Obtain partner UAT sign-off',
          type: 'approval',
          status: 'pending',
          required: true,
        },
      ],
      go_live: [
        {
          name: 'Production deployment',
          description: 'Deploy integration to production',
          type: 'technical',
          status: 'pending',
          required: true,
        },
        {
          name: 'Go-live verification',
          description: 'Verify production integration',
          type: 'review',
          status: 'pending',
          required: true,
        },
        {
          name: 'Partner training',
          description: 'Complete partner training session',
          type: 'meeting',
          status: 'pending',
          required: false,
        },
      ],
      completed: [],
    };

    // Add partner-type-specific tasks
    if (['hedge_fund', 'crypto_fund', 'asset_manager'].includes(partnerType)) {
      baseTasks.due_diligence.push({
        name: 'Investment mandate review',
        description: 'Review investment mandate and strategy',
        type: 'review',
        status: 'pending',
        required: true,
      });
    }

    if (['bank', 'investment_bank', 'commercial_bank'].includes(partnerType)) {
      baseTasks.compliance_review.push({
        name: 'Banking license verification',
        description: 'Verify banking license and regulatory status',
        type: 'document',
        status: 'pending',
        required: true,
      });
    }

    if (['custodian'].includes(partnerType)) {
      baseTasks.due_diligence.push({
        name: 'Custody infrastructure review',
        description: 'Review custody infrastructure and security',
        type: 'review',
        status: 'pending',
        required: true,
      });
      baseTasks.compliance_review.push({
        name: 'Insurance coverage verification',
        description: 'Verify insurance coverage for custodial assets',
        type: 'document',
        status: 'pending',
        required: true,
      });
    }

    return baseTasks[phase].map((task) => ({
      ...task,
      id: this.generateId('task'),
    }));
  }

  private createDefaultDueDiligence(partnerType: InstitutionalPartnerType): DueDiligenceProcess {
    const categories: DueDiligenceCategory[] = [
      {
        name: 'Corporate Structure',
        type: 'corporate',
        status: 'not_started',
        findings: [],
        documents: [],
      },
      {
        name: 'Financial Analysis',
        type: 'financial',
        status: 'not_started',
        findings: [],
        documents: [],
      },
      {
        name: 'Operational Review',
        type: 'operational',
        status: 'not_started',
        findings: [],
        documents: [],
      },
      {
        name: 'Regulatory Compliance',
        type: 'regulatory',
        status: 'not_started',
        findings: [],
        documents: [],
      },
      {
        name: 'Technical Assessment',
        type: 'technical',
        status: 'not_started',
        findings: [],
        documents: [],
      },
      {
        name: 'Reputation Analysis',
        type: 'reputational',
        status: 'not_started',
        findings: [],
        documents: [],
      },
    ];

    let level: DueDiligenceProcess['level'] = 'standard';
    if (['hedge_fund', 'crypto_fund', 'sovereign_wealth_fund', 'pension_fund'].includes(partnerType)) {
      level = 'enhanced';
    } else if (['bank', 'investment_bank', 'custodian', 'prime_broker'].includes(partnerType)) {
      level = 'institutional';
    }

    return {
      level,
      status: 'not_started',
      categories,
    };
  }

  private createDefaultComplianceCheck(partnerType: InstitutionalPartnerType): OnboardingComplianceCheck {
    const requiredDocuments = this.getRequiredDocumentsForType(partnerType);

    return {
      kycStatus: 'not_started',
      amlStatus: 'not_started',
      sanctionsStatus: 'not_started',
      pepStatus: 'not_started',
      adverseMediaStatus: 'not_started',
      requiredDocuments,
      overallStatus: 'pending',
    };
  }

  private getRequiredDocumentsForType(partnerType: InstitutionalPartnerType): RequiredDocument[] {
    const baseDocuments: RequiredDocument[] = [
      {
        type: 'certificate_of_incorporation',
        name: 'Certificate of Incorporation',
        required: true,
        status: 'pending',
      },
      {
        type: 'articles_of_association',
        name: 'Articles of Association',
        required: true,
        status: 'pending',
      },
      {
        type: 'proof_of_address',
        name: 'Proof of Address',
        required: true,
        status: 'pending',
      },
      {
        type: 'beneficial_ownership',
        name: 'Beneficial Ownership Declaration',
        required: true,
        status: 'pending',
      },
      {
        type: 'director_ids',
        name: 'Director Identification Documents',
        required: true,
        status: 'pending',
      },
      {
        type: 'tax_registration',
        name: 'Tax Registration Certificate',
        required: true,
        status: 'pending',
      },
    ];

    // Add partner-type-specific documents
    if (['hedge_fund', 'crypto_fund', 'asset_manager', 'pension_fund', 'endowment'].includes(partnerType)) {
      baseDocuments.push(
        {
          type: 'fund_registration',
          name: 'Fund Registration Documents',
          required: true,
          status: 'pending',
        },
        {
          type: 'audited_financials',
          name: 'Audited Financial Statements',
          required: true,
          status: 'pending',
        },
        {
          type: 'investment_mandate',
          name: 'Investment Mandate',
          required: true,
          status: 'pending',
        }
      );
    }

    if (['bank', 'investment_bank', 'commercial_bank', 'digital_bank'].includes(partnerType)) {
      baseDocuments.push(
        {
          type: 'banking_license',
          name: 'Banking License',
          required: true,
          status: 'pending',
        },
        {
          type: 'capital_adequacy',
          name: 'Capital Adequacy Report',
          required: true,
          status: 'pending',
        }
      );
    }

    if (['custodian'].includes(partnerType)) {
      baseDocuments.push(
        {
          type: 'custody_license',
          name: 'Custody License',
          required: true,
          status: 'pending',
        },
        {
          type: 'insurance_certificate',
          name: 'Insurance Certificate',
          required: true,
          status: 'pending',
        },
        {
          type: 'soc2_report',
          name: 'SOC 2 Type II Report',
          required: true,
          status: 'pending',
        }
      );
    }

    if (['exchange', 'otc_desk', 'market_maker', 'liquidity_provider'].includes(partnerType)) {
      baseDocuments.push(
        {
          type: 'trading_license',
          name: 'Trading License',
          required: true,
          status: 'pending',
        },
        {
          type: 'risk_management_policy',
          name: 'Risk Management Policy',
          required: true,
          status: 'pending',
        }
      );
    }

    return baseDocuments;
  }

  private createDefaultIntegration(): OnboardingIntegration {
    return {
      status: 'not_started',
      integrationType: 'api',
      apiCredentialsIssued: false,
      sandboxAccess: false,
      productionAccess: false,
      integrationTasks: [
        {
          id: this.generateId('inttask'),
          name: 'API documentation review',
          category: 'setup',
          status: 'pending',
        },
        {
          id: this.generateId('inttask'),
          name: 'API credential generation',
          category: 'setup',
          status: 'pending',
        },
        {
          id: this.generateId('inttask'),
          name: 'Sandbox environment configuration',
          category: 'configuration',
          status: 'pending',
        },
        {
          id: this.generateId('inttask'),
          name: 'Endpoint connectivity testing',
          category: 'testing',
          status: 'pending',
        },
        {
          id: this.generateId('inttask'),
          name: 'Data format validation',
          category: 'testing',
          status: 'pending',
        },
        {
          id: this.generateId('inttask'),
          name: 'Integration certification',
          category: 'certification',
          status: 'pending',
        },
      ],
    };
  }

  private createDefaultTimeline(partnerType: InstitutionalPartnerType): OnboardingTimeline {
    // Estimate duration based on partner type
    let estimatedDuration = 30; // Default 30 days

    if (['hedge_fund', 'crypto_fund', 'asset_manager'].includes(partnerType)) {
      estimatedDuration = 45;
    } else if (['bank', 'investment_bank', 'commercial_bank'].includes(partnerType)) {
      estimatedDuration = 60;
    } else if (['sovereign_wealth_fund', 'pension_fund'].includes(partnerType)) {
      estimatedDuration = 90;
    } else if (['custodian', 'prime_broker'].includes(partnerType)) {
      estimatedDuration = 75;
    }

    const now = new Date();
    const milestones: OnboardingMilestone[] = [
      {
        name: 'Qualification Complete',
        targetDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        name: 'Due Diligence Complete',
        targetDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        name: 'Compliance Approved',
        targetDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        name: 'Agreement Signed',
        targetDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        name: 'Integration Complete',
        targetDate: new Date(now.getTime() + (estimatedDuration - 7) * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
      {
        name: 'Go Live',
        targetDate: new Date(now.getTime() + estimatedDuration * 24 * 60 * 60 * 1000),
        status: 'pending',
      },
    ];

    return {
      estimatedDuration,
      milestones,
      delays: [],
    };
  }

  private recalculateDueDiligenceRisk(workflow: OnboardingWorkflow): void {
    let totalScore = 0;
    let categoryCount = 0;
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const category of workflow.dueDiligence.categories) {
      if (category.score !== undefined) {
        totalScore += category.score;
        categoryCount++;
      }

      for (const finding of category.findings) {
        if (finding.status === 'open' || finding.status === 'escalated') {
          if (finding.severity === 'critical') {
            maxSeverity = 'critical';
          } else if (finding.severity === 'high' && maxSeverity !== 'critical') {
            maxSeverity = 'high';
          } else if (finding.severity === 'medium' && maxSeverity === 'low') {
            maxSeverity = 'medium';
          }
        }
      }
    }

    workflow.dueDiligence.overallRiskScore = categoryCount > 0 ? totalScore / categoryCount : undefined;
    workflow.dueDiligence.overallRiskRating = maxSeverity;
  }

  private updateOverallComplianceStatus(workflow: OnboardingWorkflow): void {
    const { kycStatus, amlStatus, sanctionsStatus, pepStatus, adverseMediaStatus } = workflow.compliance;

    // Check for any rejections/flags
    if (
      kycStatus === 'rejected' ||
      amlStatus === 'flagged' ||
      sanctionsStatus === 'match_found' ||
      pepStatus === 'identified' ||
      adverseMediaStatus === 'flagged'
    ) {
      workflow.compliance.overallStatus = 'rejected';
      return;
    }

    // Check if all approved/cleared
    if (
      kycStatus === 'approved' &&
      amlStatus === 'cleared' &&
      sanctionsStatus === 'cleared' &&
      pepStatus === 'cleared' &&
      adverseMediaStatus === 'cleared'
    ) {
      workflow.compliance.overallStatus = 'approved';
      return;
    }

    // Check if any still in progress
    if (
      kycStatus === 'in_progress' ||
      amlStatus === 'in_progress' ||
      sanctionsStatus === 'in_progress' ||
      pepStatus === 'in_progress' ||
      adverseMediaStatus === 'in_progress'
    ) {
      workflow.compliance.overallStatus = 'pending';
      return;
    }

    // Mixed status - conditional approval may be needed
    workflow.compliance.overallStatus = 'conditional';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOnboardingManager(config?: Partial<OnboardingConfig>): DefaultOnboardingManager {
  return new DefaultOnboardingManager(config);
}

// Default export
export default DefaultOnboardingManager;
