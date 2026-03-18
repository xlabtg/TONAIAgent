/**
 * TONAIAgent - Grant Programs
 *
 * Developer grants, research funding, open-source support, and hackathons
 * for the TON AI Ecosystem Fund.
 */

import {
  GrantProgramConfig,
  GrantCategory,
  GrantApplication,
  GrantApplicationStatus,
  ApplicantProfile,
  ReviewComment,
  Grant,
  GrantStatus,
  GrantMilestoneStatus,
  GrantReport,
  MilestoneStatus,
  SubmitGrantApplicationRequest,
  AIEvaluationResult,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Grant Program Manager Interface
// ============================================================================

export interface GrantProgramManager {
  readonly config: GrantProgramConfig;

  // Category operations
  createCategory(category: Omit<GrantCategory, 'id' | 'allocatedBudget'>): Promise<GrantCategory>;
  getCategory(categoryId: string): Promise<GrantCategory>;
  getCategories(): Promise<GrantCategory[]>;
  updateCategory(categoryId: string, updates: Partial<GrantCategory>): Promise<GrantCategory>;

  // Application operations
  submitApplication(
    request: SubmitGrantApplicationRequest,
    applicant: ApplicantProfile
  ): Promise<GrantApplication>;
  getApplication(applicationId: string): Promise<GrantApplication>;
  getApplications(filter?: ApplicationFilter): Promise<GrantApplication[]>;
  updateApplicationStatus(
    applicationId: string,
    status: GrantApplicationStatus,
    notes?: string
  ): Promise<GrantApplication>;
  addReview(
    applicationId: string,
    review: Omit<ReviewComment, 'timestamp'>
  ): Promise<GrantApplication>;
  setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<GrantApplication>;

  // Grant operations
  createGrant(applicationId: string): Promise<Grant>;
  getGrant(grantId: string): Promise<Grant>;
  getGrants(filter?: GrantFilter): Promise<Grant[]>;
  updateGrantStatus(grantId: string, status: GrantStatus): Promise<Grant>;

  // Milestone operations
  submitMilestone(
    grantId: string,
    milestoneId: string,
    proofUrl: string
  ): Promise<GrantMilestoneStatus>;
  reviewMilestone(
    grantId: string,
    milestoneId: string,
    approved: boolean,
    feedback?: string
  ): Promise<GrantMilestoneStatus>;
  disburseMilestone(grantId: string, milestoneId: string): Promise<GrantMilestoneStatus>;

  // Reporting operations
  submitReport(grantId: string, report: Omit<GrantReport, 'id' | 'submittedAt'>): Promise<GrantReport>;
  getReports(grantId: string): Promise<GrantReport[]>;
  reviewReport(
    grantId: string,
    reportId: string,
    status: 'approved' | 'revision_required',
    notes?: string
  ): Promise<GrantReport>;

  // Statistics
  getStats(): Promise<GrantProgramStats>;
  getCategoryStats(categoryId: string): Promise<CategoryStats>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ApplicationFilter {
  categoryId?: string;
  status?: GrantApplicationStatus;
  applicantId?: string;
  minAmount?: string;
  maxAmount?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GrantFilter {
  categoryId?: string;
  status?: GrantStatus;
  recipientId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GrantProgramStats {
  totalCategories: number;
  activeCategories: number;
  totalBudget: string;
  allocatedBudget: string;
  disbursedAmount: string;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  activeGrants: number;
  completedGrants: number;
  averageGrantSize: string;
  completionRate: number;
  averageTimeToApproval: number; // days
}

export interface CategoryStats {
  categoryId: string;
  name: string;
  budget: string;
  allocated: string;
  disbursed: string;
  remaining: string;
  applicationCount: number;
  approvalRate: number;
  grantCount: number;
  completedGrants: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultGrantProgramManager implements GrantProgramManager {
  readonly config: GrantProgramConfig;

  private categories: Map<string, GrantCategory> = new Map();
  private applications: Map<string, GrantApplication> = new Map();
  private grants: Map<string, Grant> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<GrantProgramConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      categories: config.categories ?? [],
      applicationFee: config.applicationFee,
      maxGrantAmount: config.maxGrantAmount ?? '100000',
      reviewPeriod: config.reviewPeriod ?? 14,
      disbursementSchedule: config.disbursementSchedule ?? 'milestone',
    };

    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories(): void {
    const defaultCategories: Omit<GrantCategory, 'id' | 'allocatedBudget'>[] = [
      {
        name: 'Developer Tools',
        description: 'SDKs, libraries, and developer experience improvements',
        budget: '500000',
        minAmount: '1000',
        maxAmount: '50000',
        priorities: ['SDK development', 'Documentation', 'Developer tutorials'],
        requirements: ['Open source', 'MIT or Apache license', 'Active maintenance'],
        active: true,
      },
      {
        name: 'Infrastructure',
        description: 'Core infrastructure and protocol improvements',
        budget: '1000000',
        minAmount: '10000',
        maxAmount: '100000',
        priorities: ['Scalability', 'Security', 'Decentralization'],
        requirements: ['Technical specification', 'Security audit plan'],
        active: true,
      },
      {
        name: 'Research',
        description: 'Academic and applied research initiatives',
        budget: '300000',
        minAmount: '5000',
        maxAmount: '50000',
        priorities: ['AI/ML research', 'Cryptography', 'Economic modeling'],
        requirements: ['Publication commitment', 'Open data'],
        active: true,
      },
      {
        name: 'Community',
        description: 'Community building and education',
        budget: '200000',
        minAmount: '500',
        maxAmount: '20000',
        priorities: ['Education', 'Events', 'Content creation'],
        requirements: ['Community impact metrics', 'Regular reporting'],
        active: true,
      },
    ];

    for (const cat of defaultCategories) {
      const category: GrantCategory = {
        ...cat,
        id: this.generateId('category'),
        allocatedBudget: '0',
      };
      this.categories.set(category.id, category);
    }
  }

  // ============================================================================
  // Category Operations
  // ============================================================================

  async createCategory(
    category: Omit<GrantCategory, 'id' | 'allocatedBudget'>
  ): Promise<GrantCategory> {
    const newCategory: GrantCategory = {
      ...category,
      id: this.generateId('category'),
      allocatedBudget: '0',
    };

    this.categories.set(newCategory.id, newCategory);

    return newCategory;
  }

  async getCategory(categoryId: string): Promise<GrantCategory> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    return { ...category };
  }

  async getCategories(): Promise<GrantCategory[]> {
    return Array.from(this.categories.values());
  }

  async updateCategory(
    categoryId: string,
    updates: Partial<GrantCategory>
  ): Promise<GrantCategory> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const updated = { ...category, ...updates, id: categoryId };
    this.categories.set(categoryId, updated);

    return updated;
  }

  // ============================================================================
  // Application Operations
  // ============================================================================

  async submitApplication(
    request: SubmitGrantApplicationRequest,
    applicant: ApplicantProfile
  ): Promise<GrantApplication> {
    // Validate category
    const category = this.categories.get(request.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${request.categoryId}`);
    }

    if (!category.active) {
      throw new Error('Category is not accepting applications');
    }

    // Validate amount
    if (BigInt(request.requestedAmount) < BigInt(category.minAmount)) {
      throw new Error(`Requested amount below minimum: ${category.minAmount}`);
    }
    if (BigInt(request.requestedAmount) > BigInt(category.maxAmount)) {
      throw new Error(`Requested amount above maximum: ${category.maxAmount}`);
    }

    const application: GrantApplication = {
      id: this.generateId('application'),
      applicantId: applicant.id,
      applicant,
      categoryId: request.categoryId,
      title: request.title,
      description: request.description,
      problemStatement: request.problemStatement,
      proposedSolution: request.proposedSolution,
      requestedAmount: request.requestedAmount,
      milestones: request.milestones.map((m, i) => ({
        ...m,
        id: this.generateId(`milestone-${i}`),
      })),
      team: request.team,
      budget: request.budget,
      timeline: request.timeline,
      expectedOutcomes: request.expectedOutcomes,
      metrics: request.metrics,
      previousWork: request.previousWork,
      references: request.references,
      status: 'submitted',
      submittedAt: new Date(),
      metadata: {},
    };

    this.applications.set(application.id, application);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'grant_submitted',
      category: 'grants',
      data: {
        applicationId: application.id,
        categoryId: request.categoryId,
        amount: request.requestedAmount,
      },
      actorId: applicant.id,
      relatedId: application.id,
    });

    return application;
  }

  async getApplication(applicationId: string): Promise<GrantApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }
    return { ...application };
  }

  async getApplications(filter?: ApplicationFilter): Promise<GrantApplication[]> {
    let applications = Array.from(this.applications.values());

    if (filter) {
      if (filter.categoryId) {
        applications = applications.filter((a) => a.categoryId === filter.categoryId);
      }
      if (filter.status) {
        applications = applications.filter((a) => a.status === filter.status);
      }
      if (filter.applicantId) {
        applications = applications.filter((a) => a.applicantId === filter.applicantId);
      }
      if (filter.minAmount) {
        applications = applications.filter(
          (a) => BigInt(a.requestedAmount) >= BigInt(filter.minAmount!)
        );
      }
      if (filter.maxAmount) {
        applications = applications.filter(
          (a) => BigInt(a.requestedAmount) <= BigInt(filter.maxAmount!)
        );
      }
      if (filter.fromDate) {
        applications = applications.filter((a) => a.submittedAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        applications = applications.filter((a) => a.submittedAt <= filter.toDate!);
      }
      if (filter.offset) {
        applications = applications.slice(filter.offset);
      }
      if (filter.limit) {
        applications = applications.slice(0, filter.limit);
      }
    }

    return applications;
  }

  async updateApplicationStatus(
    applicationId: string,
    status: GrantApplicationStatus,
    notes?: string
  ): Promise<GrantApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.status = status;

    if (status === 'approved') {
      application.decidedAt = new Date();

      // Update category allocated budget
      const category = this.categories.get(application.categoryId);
      if (category) {
        category.allocatedBudget = (
          BigInt(category.allocatedBudget) + BigInt(application.requestedAmount)
        ).toString();
        this.categories.set(application.categoryId, category);
      }

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'grant_approved',
        category: 'grants',
        data: {
          applicationId,
          amount: application.requestedAmount,
        },
        relatedId: applicationId,
      });
    } else if (status === 'rejected') {
      application.decidedAt = new Date();

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'grant_rejected',
        category: 'grants',
        data: { applicationId, reason: notes },
        relatedId: applicationId,
      });
    }

    if (notes) {
      application.metadata.statusNotes = notes;
    }

    this.applications.set(applicationId, application);

    return application;
  }

  async addReview(
    applicationId: string,
    review: Omit<ReviewComment, 'timestamp'>
  ): Promise<GrantApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const fullReview: ReviewComment = {
      ...review,
      timestamp: new Date(),
    };

    application.reviewComments = application.reviewComments ?? [];
    application.reviewComments.push(fullReview);

    // Calculate average score
    const scores = application.reviewComments
      .filter((r) => r.score !== undefined)
      .map((r) => r.score!);
    if (scores.length > 0) {
      application.reviewScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    if (application.status === 'submitted') {
      application.status = 'under_review';
      application.reviewedAt = new Date();
    }

    this.applications.set(applicationId, application);

    return application;
  }

  async setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<GrantApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.aiEvaluation = evaluation;
    this.applications.set(applicationId, application);

    return application;
  }

  // ============================================================================
  // Grant Operations
  // ============================================================================

  async createGrant(applicationId: string): Promise<Grant> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    if (application.status !== 'approved') {
      throw new Error('Application must be approved to create grant');
    }

    const now = new Date();
    const endDate = new Date(now);

    // Calculate end date from milestones
    const totalWeeks = application.milestones.reduce((sum, m) => sum + m.duration, 0);
    endDate.setDate(endDate.getDate() + totalWeeks * 7);

    const grant: Grant = {
      id: this.generateId('grant'),
      applicationId,
      recipientId: application.applicantId,
      recipient: {
        id: application.applicant.id,
        name: application.applicant.name,
        type: application.applicant.type === 'organization' ? 'project' : 'individual',
        walletAddress: application.applicant.walletAddress,
        description: application.applicant.description,
        kycVerified: false,
        reputation: application.applicant.reputation,
        pastAllocations: application.applicant.previousGrants,
      },
      categoryId: application.categoryId,
      title: application.title,
      description: application.description,
      totalAmount: application.requestedAmount,
      disbursedAmount: '0',
      remainingAmount: application.requestedAmount,
      milestones: application.milestones.map((m) => ({
        ...m,
        status: 'pending' as MilestoneStatus,
      })),
      reports: [],
      status: 'active',
      startDate: now,
      endDate,
      lastActivityDate: now,
      metadata: {},
    };

    // Update application status
    application.status = 'active';
    this.applications.set(applicationId, application);

    this.grants.set(grant.id, grant);

    return grant;
  }

  async getGrant(grantId: string): Promise<Grant> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }
    return { ...grant };
  }

  async getGrants(filter?: GrantFilter): Promise<Grant[]> {
    let grants = Array.from(this.grants.values());

    if (filter) {
      if (filter.categoryId) {
        grants = grants.filter((g) => g.categoryId === filter.categoryId);
      }
      if (filter.status) {
        grants = grants.filter((g) => g.status === filter.status);
      }
      if (filter.recipientId) {
        grants = grants.filter((g) => g.recipientId === filter.recipientId);
      }
      if (filter.fromDate) {
        grants = grants.filter((g) => g.startDate >= filter.fromDate!);
      }
      if (filter.toDate) {
        grants = grants.filter((g) => g.startDate <= filter.toDate!);
      }
      if (filter.offset) {
        grants = grants.slice(filter.offset);
      }
      if (filter.limit) {
        grants = grants.slice(0, filter.limit);
      }
    }

    return grants;
  }

  async updateGrantStatus(grantId: string, status: GrantStatus): Promise<Grant> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    grant.status = status;
    grant.lastActivityDate = new Date();
    this.grants.set(grantId, grant);

    return grant;
  }

  // ============================================================================
  // Milestone Operations
  // ============================================================================

  async submitMilestone(
    grantId: string,
    milestoneId: string,
    proofUrl: string
  ): Promise<GrantMilestoneStatus> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const milestone = grant.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }

    milestone.status = 'submitted';
    milestone.submittedAt = new Date();
    milestone.proofUrl = proofUrl;

    grant.status = 'milestone_pending';
    grant.lastActivityDate = new Date();
    this.grants.set(grantId, grant);

    return milestone;
  }

  async reviewMilestone(
    grantId: string,
    milestoneId: string,
    approved: boolean,
    feedback?: string
  ): Promise<GrantMilestoneStatus> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const milestone = grant.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }

    milestone.status = approved ? 'approved' : 'rejected';
    milestone.feedback = feedback;

    // Check if all milestones are done
    const allCompleted = grant.milestones.every(
      (m) => m.status === 'completed' || m.status === 'approved'
    );

    if (allCompleted) {
      grant.status = 'completed';
    } else if (approved) {
      grant.status = 'active';
    }

    grant.lastActivityDate = new Date();
    this.grants.set(grantId, grant);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'grant_milestone_completed',
      category: 'grants',
      data: {
        grantId,
        milestoneId,
        approved,
        amount: milestone.amount,
      },
      relatedId: grantId,
    });

    return milestone;
  }

  async disburseMilestone(
    grantId: string,
    milestoneId: string
  ): Promise<GrantMilestoneStatus> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const milestone = grant.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone not found: ${milestoneId}`);
    }

    if (milestone.status !== 'approved') {
      throw new Error('Milestone must be approved before disbursement');
    }

    milestone.status = 'completed';
    milestone.disbursedAt = new Date();

    // Update grant amounts
    grant.disbursedAmount = (
      BigInt(grant.disbursedAmount) + BigInt(milestone.amount)
    ).toString();
    grant.remainingAmount = (
      BigInt(grant.totalAmount) - BigInt(grant.disbursedAmount)
    ).toString();

    // Check if grant is complete
    const allDisbursed = grant.milestones.every((m) => m.status === 'completed');
    if (allDisbursed) {
      grant.status = 'completed';
    }

    grant.lastActivityDate = new Date();
    this.grants.set(grantId, grant);

    return milestone;
  }

  // ============================================================================
  // Reporting Operations
  // ============================================================================

  async submitReport(
    grantId: string,
    report: Omit<GrantReport, 'id' | 'submittedAt'>
  ): Promise<GrantReport> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const fullReport: GrantReport = {
      ...report,
      id: this.generateId('report'),
      submittedAt: new Date(),
    };

    grant.reports.push(fullReport);
    grant.lastActivityDate = new Date();
    this.grants.set(grantId, grant);

    return fullReport;
  }

  async getReports(grantId: string): Promise<GrantReport[]> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }
    return [...grant.reports];
  }

  async reviewReport(
    grantId: string,
    reportId: string,
    status: 'approved' | 'revision_required',
    _notes?: string
  ): Promise<GrantReport> {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`Grant not found: ${grantId}`);
    }

    const report = grant.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    report.status = status;
    report.reviewedAt = new Date();

    this.grants.set(grantId, grant);

    return report;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<GrantProgramStats> {
    const categories = Array.from(this.categories.values());
    const applications = Array.from(this.applications.values());
    const grants = Array.from(this.grants.values());

    const totalBudget = categories.reduce(
      (sum, c) => sum + BigInt(c.budget),
      BigInt(0)
    );
    const allocatedBudget = categories.reduce(
      (sum, c) => sum + BigInt(c.allocatedBudget),
      BigInt(0)
    );
    const disbursedAmount = grants.reduce(
      (sum, g) => sum + BigInt(g.disbursedAmount),
      BigInt(0)
    );

    const pendingApplications = applications.filter(
      (a) => a.status === 'submitted' || a.status === 'under_review'
    ).length;
    const approvedApplications = applications.filter(
      (a) => a.status === 'approved' || a.status === 'active' || a.status === 'completed'
    ).length;
    const rejectedApplications = applications.filter((a) => a.status === 'rejected').length;

    const activeGrants = grants.filter((g) => g.status === 'active' || g.status === 'milestone_pending').length;
    const completedGrants = grants.filter((g) => g.status === 'completed').length;

    const totalGrantAmount = grants.reduce(
      (sum, g) => sum + BigInt(g.totalAmount),
      BigInt(0)
    );
    const averageGrantSize =
      grants.length > 0 ? (totalGrantAmount / BigInt(grants.length)).toString() : '0';

    const completionRate = grants.length > 0 ? completedGrants / grants.length : 0;

    // Calculate average time to approval
    const approvedApps = applications.filter((a) => a.decidedAt && a.status === 'approved');
    const totalApprovalTime = approvedApps.reduce((sum, a) => {
      const days =
        (a.decidedAt!.getTime() - a.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const averageTimeToApproval =
      approvedApps.length > 0 ? totalApprovalTime / approvedApps.length : 0;

    return {
      totalCategories: categories.length,
      activeCategories: categories.filter((c) => c.active).length,
      totalBudget: totalBudget.toString(),
      allocatedBudget: allocatedBudget.toString(),
      disbursedAmount: disbursedAmount.toString(),
      totalApplications: applications.length,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      activeGrants,
      completedGrants,
      averageGrantSize,
      completionRate,
      averageTimeToApproval,
    };
  }

  async getCategoryStats(categoryId: string): Promise<CategoryStats> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const applications = Array.from(this.applications.values()).filter(
      (a) => a.categoryId === categoryId
    );
    const grants = Array.from(this.grants.values()).filter(
      (g) => g.categoryId === categoryId
    );

    const disbursed = grants.reduce(
      (sum, g) => sum + BigInt(g.disbursedAmount),
      BigInt(0)
    );
    const remaining =
      BigInt(category.budget) - BigInt(category.allocatedBudget);

    const approvedCount = applications.filter(
      (a) => a.status === 'approved' || a.status === 'active' || a.status === 'completed'
    ).length;
    const approvalRate =
      applications.length > 0 ? approvedCount / applications.length : 0;

    return {
      categoryId,
      name: category.name,
      budget: category.budget,
      allocated: category.allocatedBudget,
      disbursed: disbursed.toString(),
      remaining: remaining.toString(),
      applicationCount: applications.length,
      approvalRate,
      grantCount: grants.length,
      completedGrants: grants.filter((g) => g.status === 'completed').length,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: EcosystemFundEvent): void {
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

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGrantProgramManager(
  config?: Partial<GrantProgramConfig>
): DefaultGrantProgramManager {
  return new DefaultGrantProgramManager(config);
}
