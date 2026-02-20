/**
 * TONAIAgent - Integration Incentives
 *
 * Wallet integrations, plugins, agent extensions, and signal provider incentives.
 */

import {
  IntegrationIncentivesConfig,
  IncentiveCategory,
  IncentiveType,
  IncentiveApplication,
  IncentiveApplicationStatus,
  Verification,
  IncentiveAward,
  AwardStatus,
  DisbursementSchedule,
  IncentivePerformance,
  ApplicantProfile,
  ApplyForIncentiveRequest,
  AIEvaluationResult,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Integration Incentives Manager Interface
// ============================================================================

export interface IntegrationIncentivesManager {
  readonly config: IntegrationIncentivesConfig;

  // Category operations
  createCategory(
    category: Omit<IncentiveCategory, 'id' | 'allocatedBudget'>
  ): Promise<IncentiveCategory>;
  getCategory(categoryId: string): Promise<IncentiveCategory>;
  getCategories(): Promise<IncentiveCategory[]>;
  updateCategory(categoryId: string, updates: Partial<IncentiveCategory>): Promise<IncentiveCategory>;

  // Application operations
  submitApplication(
    request: ApplyForIncentiveRequest,
    applicant: ApplicantProfile
  ): Promise<IncentiveApplication>;
  getApplication(applicationId: string): Promise<IncentiveApplication>;
  getApplications(filter?: IncentiveApplicationFilter): Promise<IncentiveApplication[]>;
  updateApplicationStatus(
    applicationId: string,
    status: IncentiveApplicationStatus
  ): Promise<IncentiveApplication>;
  setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<IncentiveApplication>;

  // Verification operations
  submitVerification(
    applicationId: string,
    requirementId: string,
    evidence: string
  ): Promise<Verification>;
  reviewVerification(
    applicationId: string,
    verificationId: string,
    verified: boolean,
    notes?: string
  ): Promise<Verification>;

  // Award operations
  createAward(applicationId: string): Promise<IncentiveAward>;
  getAward(awardId: string): Promise<IncentiveAward>;
  getAwards(filter?: AwardFilter): Promise<IncentiveAward[]>;
  updateAwardStatus(awardId: string, status: AwardStatus): Promise<IncentiveAward>;
  processDisbursement(awardId: string, scheduleIndex: number): Promise<IncentiveAward>;
  updatePerformance(
    awardId: string,
    performance: Partial<IncentivePerformance>
  ): Promise<IncentiveAward>;

  // Statistics
  getStats(): Promise<IncentiveStats>;
  getCategoryStats(categoryId: string): Promise<CategoryIncentiveStats>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface IncentiveApplicationFilter {
  categoryId?: string;
  status?: IncentiveApplicationStatus;
  applicantId?: string;
  type?: IncentiveType;
  limit?: number;
  offset?: number;
}

export interface AwardFilter {
  categoryId?: string;
  status?: AwardStatus;
  recipientId?: string;
  limit?: number;
  offset?: number;
}

export interface IncentiveStats {
  totalCategories: number;
  activeCategories: number;
  totalBudget: string;
  allocatedBudget: string;
  disbursedAmount: string;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  activeAwards: number;
  completedAwards: number;
  integrationsEnabled: number;
  averageQualityScore: number;
}

export interface CategoryIncentiveStats {
  categoryId: string;
  name: string;
  budget: string;
  allocated: string;
  disbursed: string;
  applicationCount: number;
  awardCount: number;
  activeIntegrations: number;
  averagePerformance: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultIntegrationIncentivesManager implements IntegrationIncentivesManager {
  readonly config: IntegrationIncentivesConfig;

  private categories: Map<string, IncentiveCategory> = new Map();
  private applications: Map<string, IncentiveApplication> = new Map();
  private awards: Map<string, IncentiveAward> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<IntegrationIncentivesConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      categories: config.categories ?? [],
      maxIncentivePerProject: config.maxIncentivePerProject ?? '50000',
      verificationRequired: config.verificationRequired ?? true,
      paymentSchedule: config.paymentSchedule ?? 'milestone',
    };

    // Initialize default categories
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories(): void {
    const defaultCategories: Omit<IncentiveCategory, 'id' | 'allocatedBudget'>[] = [
      {
        name: 'Wallet Integration',
        description: 'Integrate TONAIAgent with popular TON wallets',
        budget: '200000',
        incentiveType: 'wallet_integration',
        requirements: [
          { id: 'req-1', description: 'Full API integration', verification: 'manual', mandatory: true },
          { id: 'req-2', description: 'Documentation', verification: 'manual', mandatory: true },
          { id: 'req-3', description: 'Mainnet deployment', verification: 'automated', mandatory: true },
        ],
        rewards: [
          { tier: 'basic', amount: '5000', conditions: 'Basic read-only integration' },
          { tier: 'standard', amount: '15000', conditions: 'Full read/write integration' },
          { tier: 'premium', amount: '30000', conditions: 'Deep integration with advanced features' },
        ],
        active: true,
      },
      {
        name: 'Plugin Development',
        description: 'Build plugins for the TONAIAgent ecosystem',
        budget: '300000',
        incentiveType: 'plugin_development',
        requirements: [
          { id: 'req-1', description: 'Plugin specification compliance', verification: 'automated', mandatory: true },
          { id: 'req-2', description: 'Security audit', verification: 'manual', mandatory: true },
          { id: 'req-3', description: 'User documentation', verification: 'manual', mandatory: true },
        ],
        rewards: [
          { tier: 'utility', amount: '3000', conditions: 'Utility plugin' },
          { tier: 'trading', amount: '10000', conditions: 'Trading or DeFi plugin' },
          { tier: 'enterprise', amount: '25000', conditions: 'Enterprise-grade plugin' },
        ],
        active: true,
      },
      {
        name: 'Signal Provider',
        description: 'Provide trading signals and market data',
        budget: '150000',
        incentiveType: 'signal_provider',
        requirements: [
          { id: 'req-1', description: 'API endpoint availability', verification: 'automated', mandatory: true },
          { id: 'req-2', description: 'Historical accuracy > 60%', verification: 'oracle', mandatory: true },
          { id: 'req-3', description: 'Minimum 3 months track record', verification: 'manual', mandatory: false },
        ],
        rewards: [
          { tier: 'basic', amount: '1000', conditions: 'Per month with >50 active users', recurring: true, recurrencePeriod: 'monthly' },
          { tier: 'premium', amount: '3000', conditions: 'Per month with >200 active users', recurring: true, recurrencePeriod: 'monthly' },
        ],
        active: true,
      },
      {
        name: 'Data Provider',
        description: 'Provide on-chain and off-chain data feeds',
        budget: '200000',
        incentiveType: 'data_provider',
        requirements: [
          { id: 'req-1', description: 'Data API availability', verification: 'automated', mandatory: true },
          { id: 'req-2', description: 'Data freshness < 5 minutes', verification: 'oracle', mandatory: true },
          { id: 'req-3', description: 'SLA agreement', verification: 'manual', mandatory: true },
        ],
        rewards: [
          { tier: 'standard', amount: '5000', conditions: 'Initial integration bonus' },
          { tier: 'premium', amount: '2000', conditions: 'Per month active usage', recurring: true, recurrencePeriod: 'monthly' },
        ],
        active: true,
      },
    ];

    for (const cat of defaultCategories) {
      const category: IncentiveCategory = {
        ...cat,
        id: this.generateId('inc-category'),
        allocatedBudget: '0',
      };
      this.categories.set(category.id, category);
    }
  }

  // ============================================================================
  // Category Operations
  // ============================================================================

  async createCategory(
    category: Omit<IncentiveCategory, 'id' | 'allocatedBudget'>
  ): Promise<IncentiveCategory> {
    const newCategory: IncentiveCategory = {
      ...category,
      id: this.generateId('inc-category'),
      allocatedBudget: '0',
    };

    this.categories.set(newCategory.id, newCategory);

    return newCategory;
  }

  async getCategory(categoryId: string): Promise<IncentiveCategory> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    return { ...category };
  }

  async getCategories(): Promise<IncentiveCategory[]> {
    return Array.from(this.categories.values());
  }

  async updateCategory(
    categoryId: string,
    updates: Partial<IncentiveCategory>
  ): Promise<IncentiveCategory> {
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
    request: ApplyForIncentiveRequest,
    applicant: ApplicantProfile
  ): Promise<IncentiveApplication> {
    const category = this.categories.get(request.categoryId);
    if (!category) {
      throw new Error(`Category not found: ${request.categoryId}`);
    }

    if (!category.active) {
      throw new Error('Category is not accepting applications');
    }

    // Initialize verifications from category requirements
    const verifications: Verification[] = category.requirements.map((req) => ({
      id: this.generateId('verification'),
      requirementId: req.id,
      status: 'pending' as const,
    }));

    const application: IncentiveApplication = {
      id: this.generateId('inc-application'),
      categoryId: request.categoryId,
      applicantId: applicant.id,
      applicant,
      projectName: request.projectName,
      description: request.description,
      integrationDetails: request.integrationDetails,
      expectedImpact: request.expectedImpact,
      requestedAmount: request.requestedAmount,
      timeline: request.timeline,
      status: 'submitted',
      verifications,
      submittedAt: new Date(),
    };

    this.applications.set(application.id, application);

    return application;
  }

  async getApplication(applicationId: string): Promise<IncentiveApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }
    return { ...application };
  }

  async getApplications(filter?: IncentiveApplicationFilter): Promise<IncentiveApplication[]> {
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
      if (filter.type) {
        applications = applications.filter(
          (a) => a.integrationDetails.type === filter.type
        );
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
    status: IncentiveApplicationStatus
  ): Promise<IncentiveApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.status = status;

    if (status === 'approved') {
      application.approvedAt = new Date();

      // Update category allocated budget
      const category = this.categories.get(application.categoryId);
      if (category) {
        category.allocatedBudget = (
          BigInt(category.allocatedBudget) + BigInt(application.requestedAmount)
        ).toString();
        this.categories.set(application.categoryId, category);
      }
    }

    this.applications.set(applicationId, application);

    return application;
  }

  async setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<IncentiveApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.aiEvaluation = evaluation;
    this.applications.set(applicationId, application);

    return application;
  }

  // ============================================================================
  // Verification Operations
  // ============================================================================

  async submitVerification(
    applicationId: string,
    requirementId: string,
    evidence: string
  ): Promise<Verification> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const verification = application.verifications.find(
      (v) => v.requirementId === requirementId
    );
    if (!verification) {
      throw new Error(`Verification not found for requirement: ${requirementId}`);
    }

    verification.evidence = evidence;
    verification.status = 'pending';

    // Check if all verifications are done
    const allVerified = application.verifications.every(
      (v) => v.status === 'verified'
    );
    if (allVerified) {
      application.status = 'approved';
    } else {
      application.status = 'verification_pending';
    }

    this.applications.set(applicationId, application);

    return verification;
  }

  async reviewVerification(
    applicationId: string,
    verificationId: string,
    verified: boolean,
    notes?: string
  ): Promise<Verification> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const verification = application.verifications.find((v) => v.id === verificationId);
    if (!verification) {
      throw new Error(`Verification not found: ${verificationId}`);
    }

    verification.status = verified ? 'verified' : 'failed';
    verification.verifiedAt = new Date();
    verification.notes = notes;

    // Check if all mandatory verifications passed
    const category = this.categories.get(application.categoryId);
    if (category) {
      const mandatoryReqs = category.requirements
        .filter((r) => r.mandatory)
        .map((r) => r.id);

      const allMandatoryVerified = mandatoryReqs.every((reqId) => {
        const v = application.verifications.find((ver) => ver.requirementId === reqId);
        return v && v.status === 'verified';
      });

      if (allMandatoryVerified) {
        application.status = 'approved';
        application.approvedAt = new Date();

        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'incentive_verified',
          category: 'incentives',
          data: {
            applicationId,
            verificationId,
            verified,
          },
          relatedId: applicationId,
        });
      }
    }

    this.applications.set(applicationId, application);

    return verification;
  }

  // ============================================================================
  // Award Operations
  // ============================================================================

  async createAward(applicationId: string): Promise<IncentiveAward> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    if (application.status !== 'approved') {
      throw new Error('Application must be approved to create award');
    }

    // Create disbursement schedule based on payment schedule
    const schedule: DisbursementSchedule[] = [];
    const amount = BigInt(application.requestedAmount);

    switch (this.config.paymentSchedule) {
      case 'immediate':
        schedule.push({
          date: new Date(),
          amount: amount.toString(),
          status: 'pending',
        });
        break;
      case 'milestone':
        // 50% upfront, 50% on completion
        schedule.push({
          date: new Date(),
          amount: (amount / BigInt(2)).toString(),
          status: 'pending',
        });
        schedule.push({
          date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          amount: (amount / BigInt(2)).toString(),
          status: 'scheduled',
        });
        break;
      case 'monthly':
        // 12 monthly payments
        const monthlyAmount = amount / BigInt(12);
        for (let i = 0; i < 12; i++) {
          schedule.push({
            date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000),
            amount: monthlyAmount.toString(),
            status: i === 0 ? 'pending' : 'scheduled',
          });
        }
        break;
    }

    const award: IncentiveAward = {
      id: this.generateId('award'),
      applicationId,
      recipientId: application.applicantId,
      categoryId: application.categoryId,
      amount: application.requestedAmount,
      disbursedAmount: '0',
      schedule,
      status: 'active',
      performance: {
        integrationsEnabled: 0,
        qualityScore: 0,
      },
      createdAt: new Date(),
    };

    // Update application status
    application.status = 'active';
    this.applications.set(applicationId, application);

    this.awards.set(award.id, award);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'incentive_awarded',
      category: 'incentives',
      data: {
        awardId: award.id,
        applicationId,
        amount: application.requestedAmount,
      },
      actorId: application.applicantId,
      relatedId: award.id,
    });

    return award;
  }

  async getAward(awardId: string): Promise<IncentiveAward> {
    const award = this.awards.get(awardId);
    if (!award) {
      throw new Error(`Award not found: ${awardId}`);
    }
    return { ...award };
  }

  async getAwards(filter?: AwardFilter): Promise<IncentiveAward[]> {
    let awards = Array.from(this.awards.values());

    if (filter) {
      if (filter.categoryId) {
        awards = awards.filter((a) => a.categoryId === filter.categoryId);
      }
      if (filter.status) {
        awards = awards.filter((a) => a.status === filter.status);
      }
      if (filter.recipientId) {
        awards = awards.filter((a) => a.recipientId === filter.recipientId);
      }
      if (filter.offset) {
        awards = awards.slice(filter.offset);
      }
      if (filter.limit) {
        awards = awards.slice(0, filter.limit);
      }
    }

    return awards;
  }

  async updateAwardStatus(awardId: string, status: AwardStatus): Promise<IncentiveAward> {
    const award = this.awards.get(awardId);
    if (!award) {
      throw new Error(`Award not found: ${awardId}`);
    }

    award.status = status;
    this.awards.set(awardId, award);

    return award;
  }

  async processDisbursement(awardId: string, scheduleIndex: number): Promise<IncentiveAward> {
    const award = this.awards.get(awardId);
    if (!award) {
      throw new Error(`Award not found: ${awardId}`);
    }

    if (scheduleIndex < 0 || scheduleIndex >= award.schedule.length) {
      throw new Error(`Invalid schedule index: ${scheduleIndex}`);
    }

    const disbursement = award.schedule[scheduleIndex];
    if (disbursement.status !== 'pending' && disbursement.status !== 'scheduled') {
      throw new Error(`Disbursement cannot be processed: ${disbursement.status}`);
    }

    disbursement.status = 'completed';
    disbursement.txHash = this.generateId('tx');

    award.disbursedAmount = (
      BigInt(award.disbursedAmount) + BigInt(disbursement.amount)
    ).toString();

    // Check if all disbursements complete
    const allCompleted = award.schedule.every((d) => d.status === 'completed');
    if (allCompleted) {
      award.status = 'completed';
    }

    this.awards.set(awardId, award);

    return award;
  }

  async updatePerformance(
    awardId: string,
    performance: Partial<IncentivePerformance>
  ): Promise<IncentiveAward> {
    const award = this.awards.get(awardId);
    if (!award) {
      throw new Error(`Award not found: ${awardId}`);
    }

    award.performance = { ...award.performance, ...performance };
    this.awards.set(awardId, award);

    return award;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<IncentiveStats> {
    const categories = Array.from(this.categories.values());
    const applications = Array.from(this.applications.values());
    const awards = Array.from(this.awards.values());

    const totalBudget = categories.reduce(
      (sum, c) => sum + BigInt(c.budget),
      BigInt(0)
    );
    const allocatedBudget = categories.reduce(
      (sum, c) => sum + BigInt(c.allocatedBudget),
      BigInt(0)
    );
    const disbursedAmount = awards.reduce(
      (sum, a) => sum + BigInt(a.disbursedAmount),
      BigInt(0)
    );

    const pendingApplications = applications.filter(
      (a) => a.status === 'submitted' || a.status === 'technical_review'
    ).length;
    const approvedApplications = applications.filter(
      (a) => a.status === 'approved' || a.status === 'active' || a.status === 'completed'
    ).length;

    const activeAwards = awards.filter((a) => a.status === 'active').length;
    const completedAwards = awards.filter((a) => a.status === 'completed').length;

    const integrationsEnabled = awards.reduce(
      (sum, a) => sum + a.performance.integrationsEnabled,
      0
    );

    const avgQuality =
      awards.length > 0
        ? awards.reduce((sum, a) => sum + a.performance.qualityScore, 0) / awards.length
        : 0;

    return {
      totalCategories: categories.length,
      activeCategories: categories.filter((c) => c.active).length,
      totalBudget: totalBudget.toString(),
      allocatedBudget: allocatedBudget.toString(),
      disbursedAmount: disbursedAmount.toString(),
      totalApplications: applications.length,
      pendingApplications,
      approvedApplications,
      activeAwards,
      completedAwards,
      integrationsEnabled,
      averageQualityScore: avgQuality,
    };
  }

  async getCategoryStats(categoryId: string): Promise<CategoryIncentiveStats> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const applications = Array.from(this.applications.values()).filter(
      (a) => a.categoryId === categoryId
    );
    const awards = Array.from(this.awards.values()).filter(
      (a) => a.categoryId === categoryId
    );

    const disbursed = awards.reduce(
      (sum, a) => sum + BigInt(a.disbursedAmount),
      BigInt(0)
    );

    const activeIntegrations = awards
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + a.performance.integrationsEnabled, 0);

    const avgPerformance =
      awards.length > 0
        ? awards.reduce((sum, a) => sum + a.performance.qualityScore, 0) / awards.length
        : 0;

    return {
      categoryId,
      name: category.name,
      budget: category.budget,
      allocated: category.allocatedBudget,
      disbursed: disbursed.toString(),
      applicationCount: applications.length,
      awardCount: awards.length,
      activeIntegrations,
      averagePerformance: avgPerformance,
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

export function createIntegrationIncentivesManager(
  config?: Partial<IntegrationIncentivesConfig>
): DefaultIntegrationIncentivesManager {
  return new DefaultIntegrationIncentivesManager(config);
}
