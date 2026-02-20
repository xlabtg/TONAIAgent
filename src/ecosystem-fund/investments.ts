/**
 * TONAIAgent - Strategic Investments
 *
 * Investment framework for DeFi protocols, AI tooling, data providers, and infrastructure.
 */

import {
  InvestmentConfig,
  InvestmentOpportunity,
  InvestmentType,
  InvestmentStage,
  OpportunityStatus,
  InvestmentTerms,
  DueDiligenceReport,
  DueDiligenceSection,
  RiskFactor,
  Investment,
  InvestmentStatus,
  ExitDetails,
  InvestmentReport,
  PortfolioSummary,
  AIEvaluationResult,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Investment Manager Interface
// ============================================================================

export interface InvestmentManager {
  readonly config: InvestmentConfig;

  // Opportunity operations
  createOpportunity(
    opportunity: Omit<InvestmentOpportunity, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestmentOpportunity>;
  getOpportunity(opportunityId: string): Promise<InvestmentOpportunity>;
  getOpportunities(filter?: OpportunityFilter): Promise<InvestmentOpportunity[]>;
  updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus
  ): Promise<InvestmentOpportunity>;

  // Due diligence
  startDueDiligence(opportunityId: string): Promise<DueDiligenceReport>;
  updateDueDiligence(
    reportId: string,
    section: DueDiligenceSection
  ): Promise<DueDiligenceReport>;
  completeDueDiligence(
    reportId: string,
    recommendations: string[]
  ): Promise<DueDiligenceReport>;
  addRiskFactor(reportId: string, riskFactor: RiskFactor): Promise<DueDiligenceReport>;

  // Investment operations
  makeInvestment(
    opportunityId: string,
    amount: string,
    terms: InvestmentTerms
  ): Promise<Investment>;
  getInvestment(investmentId: string): Promise<Investment>;
  getInvestments(filter?: InvestmentFilter): Promise<Investment[]>;
  updateInvestmentValue(investmentId: string, newValue: string): Promise<Investment>;
  recordExit(investmentId: string, exitDetails: ExitDetails): Promise<Investment>;

  // Reporting
  submitInvestmentReport(
    investmentId: string,
    report: Omit<InvestmentReport, 'id' | 'submittedAt'>
  ): Promise<InvestmentReport>;
  getInvestmentReports(investmentId: string): Promise<InvestmentReport[]>;

  // Portfolio
  getPortfolioSummary(): Promise<PortfolioSummary>;

  // AI evaluation
  setAIEvaluation(
    opportunityId: string,
    evaluation: AIEvaluationResult
  ): Promise<InvestmentOpportunity>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface OpportunityFilter {
  type?: InvestmentType;
  stage?: InvestmentStage;
  sector?: string;
  status?: OpportunityStatus;
  minAmount?: string;
  maxAmount?: string;
  limit?: number;
  offset?: number;
}

export interface InvestmentFilter {
  type?: InvestmentType;
  status?: InvestmentStatus;
  sector?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultInvestmentManager implements InvestmentManager {
  readonly config: InvestmentConfig;

  private opportunities: Map<string, InvestmentOpportunity> = new Map();
  private dueDiligenceReports: Map<string, DueDiligenceReport> = new Map();
  private investments: Map<string, Investment> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<InvestmentConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxInvestmentSize: config.maxInvestmentSize ?? '500000',
      minInvestmentSize: config.minInvestmentSize ?? '10000',
      maxPortfolioConcentration: config.maxPortfolioConcentration ?? 20,
      investmentHorizon: config.investmentHorizon ?? ['medium', 'long'],
      targetSectors: config.targetSectors ?? ['DeFi', 'AI', 'Infrastructure', 'Data'],
      riskTolerance: config.riskTolerance ?? 'moderate',
      diligenceRequired: config.diligenceRequired ?? true,
    };
  }

  // ============================================================================
  // Opportunity Operations
  // ============================================================================

  async createOpportunity(
    opportunity: Omit<InvestmentOpportunity, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<InvestmentOpportunity> {
    const now = new Date();
    const newOpportunity: InvestmentOpportunity = {
      ...opportunity,
      id: this.generateId('opportunity'),
      status: 'sourced',
      createdAt: now,
      updatedAt: now,
    };

    this.opportunities.set(newOpportunity.id, newOpportunity);

    return newOpportunity;
  }

  async getOpportunity(opportunityId: string): Promise<InvestmentOpportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }
    return { ...opportunity };
  }

  async getOpportunities(filter?: OpportunityFilter): Promise<InvestmentOpportunity[]> {
    let opportunities = Array.from(this.opportunities.values());

    if (filter) {
      if (filter.type) {
        opportunities = opportunities.filter((o) => o.type === filter.type);
      }
      if (filter.stage) {
        opportunities = opportunities.filter((o) => o.stage === filter.stage);
      }
      if (filter.sector) {
        opportunities = opportunities.filter((o) => o.sector === filter.sector);
      }
      if (filter.status) {
        opportunities = opportunities.filter((o) => o.status === filter.status);
      }
      if (filter.minAmount) {
        opportunities = opportunities.filter(
          (o) => BigInt(o.targetRaise) >= BigInt(filter.minAmount!)
        );
      }
      if (filter.maxAmount) {
        opportunities = opportunities.filter(
          (o) => BigInt(o.targetRaise) <= BigInt(filter.maxAmount!)
        );
      }
      if (filter.offset) {
        opportunities = opportunities.slice(filter.offset);
      }
      if (filter.limit) {
        opportunities = opportunities.slice(0, filter.limit);
      }
    }

    return opportunities;
  }

  async updateOpportunityStatus(
    opportunityId: string,
    status: OpportunityStatus
  ): Promise<InvestmentOpportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    opportunity.status = status;
    opportunity.updatedAt = new Date();
    this.opportunities.set(opportunityId, opportunity);

    return opportunity;
  }

  // ============================================================================
  // Due Diligence
  // ============================================================================

  async startDueDiligence(opportunityId: string): Promise<DueDiligenceReport> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    const report: DueDiligenceReport = {
      id: this.generateId('dd-report'),
      opportunityId,
      status: 'in_progress',
      sections: [
        {
          name: 'Team Assessment',
          score: 0,
          weight: 0.25,
          findings: [],
          redFlags: [],
          notes: '',
        },
        {
          name: 'Technology Review',
          score: 0,
          weight: 0.25,
          findings: [],
          redFlags: [],
          notes: '',
        },
        {
          name: 'Market Analysis',
          score: 0,
          weight: 0.2,
          findings: [],
          redFlags: [],
          notes: '',
        },
        {
          name: 'Financial Analysis',
          score: 0,
          weight: 0.15,
          findings: [],
          redFlags: [],
          notes: '',
        },
        {
          name: 'Legal & Compliance',
          score: 0,
          weight: 0.15,
          findings: [],
          redFlags: [],
          notes: '',
        },
      ],
      overallScore: 0,
      riskFactors: [],
      recommendations: [],
    };

    opportunity.status = 'due_diligence';
    opportunity.updatedAt = new Date();
    opportunity.dueDiligence = report;

    this.dueDiligenceReports.set(report.id, report);
    this.opportunities.set(opportunityId, opportunity);

    return report;
  }

  async updateDueDiligence(
    reportId: string,
    section: DueDiligenceSection
  ): Promise<DueDiligenceReport> {
    const report = this.dueDiligenceReports.get(reportId);
    if (!report) {
      throw new Error(`Due diligence report not found: ${reportId}`);
    }

    const sectionIndex = report.sections.findIndex((s) => s.name === section.name);
    if (sectionIndex === -1) {
      report.sections.push(section);
    } else {
      report.sections[sectionIndex] = section;
    }

    // Recalculate overall score
    const totalWeight = report.sections.reduce((sum, s) => sum + s.weight, 0);
    report.overallScore =
      report.sections.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

    this.dueDiligenceReports.set(reportId, report);

    return report;
  }

  async completeDueDiligence(
    reportId: string,
    recommendations: string[]
  ): Promise<DueDiligenceReport> {
    const report = this.dueDiligenceReports.get(reportId);
    if (!report) {
      throw new Error(`Due diligence report not found: ${reportId}`);
    }

    report.status = 'completed';
    report.recommendations = recommendations;
    report.completedAt = new Date();

    // Update opportunity status
    const opportunity = this.opportunities.get(report.opportunityId);
    if (opportunity) {
      opportunity.status = 'committee_review';
      opportunity.updatedAt = new Date();
      this.opportunities.set(report.opportunityId, opportunity);
    }

    this.dueDiligenceReports.set(reportId, report);

    return report;
  }

  async addRiskFactor(
    reportId: string,
    riskFactor: RiskFactor
  ): Promise<DueDiligenceReport> {
    const report = this.dueDiligenceReports.get(reportId);
    if (!report) {
      throw new Error(`Due diligence report not found: ${reportId}`);
    }

    report.riskFactors.push(riskFactor);

    // Flag report if critical risk
    if (riskFactor.severity === 'critical') {
      report.status = 'flagged';
    }

    this.dueDiligenceReports.set(reportId, report);

    return report;
  }

  // ============================================================================
  // Investment Operations
  // ============================================================================

  async makeInvestment(
    opportunityId: string,
    amount: string,
    terms: InvestmentTerms
  ): Promise<Investment> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    // Validate investment size
    if (BigInt(amount) < BigInt(this.config.minInvestmentSize)) {
      throw new Error(`Investment below minimum: ${this.config.minInvestmentSize}`);
    }
    if (BigInt(amount) > BigInt(this.config.maxInvestmentSize)) {
      throw new Error(`Investment above maximum: ${this.config.maxInvestmentSize}`);
    }

    // Check portfolio concentration (only if there's an existing portfolio)
    const portfolio = await this.getPortfolioSummary();
    if (BigInt(portfolio.currentValue) > BigInt(0)) {
      const totalValue = BigInt(portfolio.currentValue) + BigInt(amount);
      const concentration = Number((BigInt(amount) * BigInt(100)) / totalValue);
      if (concentration > this.config.maxPortfolioConcentration) {
        throw new Error(
          `Investment would exceed portfolio concentration limit: ${this.config.maxPortfolioConcentration}%`
        );
      }
    }

    const investment: Investment = {
      id: this.generateId('investment'),
      opportunityId,
      name: opportunity.name,
      type: opportunity.type,
      sector: opportunity.sector,
      investedAmount: amount,
      currentValue: amount,
      ownership: terms.ownership,
      tokenAmount: terms.tokenAllocation,
      terms,
      performance: {
        unrealizedGain: '0',
        unrealizedGainPercent: 0,
        realizedGain: '0',
        irr: 0,
        tvpi: 1,
        moic: 1,
        lastValuationDate: new Date(),
      },
      status: terms.vestingSchedule ? 'vesting' : 'active',
      investedAt: new Date(),
      maturityDate: terms.lockup
        ? new Date(Date.now() + terms.lockup * 30 * 24 * 60 * 60 * 1000)
        : undefined,
      reports: [],
      metadata: {},
    };

    // Update opportunity status
    opportunity.status = 'invested';
    opportunity.updatedAt = new Date();
    this.opportunities.set(opportunityId, opportunity);

    this.investments.set(investment.id, investment);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'investment_made',
      category: 'investments',
      data: {
        investmentId: investment.id,
        opportunityId,
        amount,
        type: investment.type,
      },
      relatedId: investment.id,
    });

    return investment;
  }

  async getInvestment(investmentId: string): Promise<Investment> {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }
    return { ...investment };
  }

  async getInvestments(filter?: InvestmentFilter): Promise<Investment[]> {
    let investments = Array.from(this.investments.values());

    if (filter) {
      if (filter.type) {
        investments = investments.filter((i) => i.type === filter.type);
      }
      if (filter.status) {
        investments = investments.filter((i) => i.status === filter.status);
      }
      if (filter.sector) {
        investments = investments.filter((i) => i.sector === filter.sector);
      }
      if (filter.fromDate) {
        investments = investments.filter((i) => i.investedAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        investments = investments.filter((i) => i.investedAt <= filter.toDate!);
      }
      if (filter.offset) {
        investments = investments.slice(filter.offset);
      }
      if (filter.limit) {
        investments = investments.slice(0, filter.limit);
      }
    }

    return investments;
  }

  async updateInvestmentValue(investmentId: string, newValue: string): Promise<Investment> {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }

    const invested = BigInt(investment.investedAmount);
    const current = BigInt(newValue);

    investment.currentValue = newValue;
    investment.performance.unrealizedGain = (current - invested).toString();
    investment.performance.unrealizedGainPercent =
      Number(((current - invested) * BigInt(10000)) / invested) / 100;
    investment.performance.moic = Number(current) / Number(invested);
    investment.performance.tvpi = investment.performance.moic;
    investment.performance.lastValuationDate = new Date();

    this.investments.set(investmentId, investment);

    return investment;
  }

  async recordExit(investmentId: string, exitDetails: ExitDetails): Promise<Investment> {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }

    investment.status =
      BigInt(exitDetails.amount) >= BigInt(investment.currentValue)
        ? 'fully_exited'
        : 'partially_exited';
    investment.exitedAt = exitDetails.date;
    investment.exitDetails = exitDetails;

    investment.performance.realizedGain = (
      BigInt(exitDetails.amount) - BigInt(investment.investedAmount)
    ).toString();

    this.investments.set(investmentId, investment);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'investment_exited',
      category: 'investments',
      data: {
        investmentId,
        exitType: exitDetails.type,
        amount: exitDetails.amount,
        multiplier: exitDetails.multiplier,
      },
      relatedId: investmentId,
    });

    return investment;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  async submitInvestmentReport(
    investmentId: string,
    report: Omit<InvestmentReport, 'id' | 'submittedAt'>
  ): Promise<InvestmentReport> {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }

    const fullReport: InvestmentReport = {
      ...report,
      id: this.generateId('inv-report'),
      submittedAt: new Date(),
    };

    investment.reports.push(fullReport);
    this.investments.set(investmentId, investment);

    return fullReport;
  }

  async getInvestmentReports(investmentId: string): Promise<InvestmentReport[]> {
    const investment = this.investments.get(investmentId);
    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }
    return [...investment.reports];
  }

  // ============================================================================
  // Portfolio
  // ============================================================================

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const investments = Array.from(this.investments.values());

    const totalInvested = investments.reduce(
      (sum, i) => sum + BigInt(i.investedAmount),
      BigInt(0)
    );
    const currentValue = investments.reduce(
      (sum, i) => sum + BigInt(i.currentValue),
      BigInt(0)
    );
    const unrealizedGain = currentValue - totalInvested;
    const realizedGain = investments.reduce(
      (sum, i) => sum + BigInt(i.performance.realizedGain),
      BigInt(0)
    );

    // Calculate sector allocation
    const sectorMap = new Map<string, bigint>();
    for (const inv of investments) {
      const current = sectorMap.get(inv.sector) ?? BigInt(0);
      sectorMap.set(inv.sector, current + BigInt(inv.currentValue));
    }

    const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, amount]) => ({
      sector,
      amount: amount.toString(),
      percentage:
        currentValue > BigInt(0)
          ? Number((amount * BigInt(100)) / currentValue)
          : 0,
    }));

    // Calculate stage allocation
    const stageMap = new Map<InvestmentStage, bigint>();
    for (const inv of investments) {
      const opp = this.opportunities.get(inv.opportunityId);
      if (opp) {
        const current = stageMap.get(opp.stage) ?? BigInt(0);
        stageMap.set(opp.stage, current + BigInt(inv.currentValue));
      }
    }

    const stageAllocation = Array.from(stageMap.entries()).map(([stage, amount]) => ({
      stage,
      amount: amount.toString(),
      percentage:
        currentValue > BigInt(0)
          ? Number((amount * BigInt(100)) / currentValue)
          : 0,
    }));

    // Sort for top/under performers
    const sortedByReturn = [...investments].sort(
      (a, b) => b.performance.unrealizedGainPercent - a.performance.unrealizedGainPercent
    );

    // Calculate portfolio IRR (simplified)
    const portfolioIRR =
      investments.length > 0
        ? investments.reduce((sum, i) => sum + i.performance.irr, 0) /
          investments.length
        : 0;

    return {
      totalInvested: totalInvested.toString(),
      currentValue: currentValue.toString(),
      unrealizedGain: unrealizedGain.toString(),
      realizedGain: realizedGain.toString(),
      portfolioIRR,
      investmentCount: investments.length,
      activeInvestments: investments.filter(
        (i) => i.status === 'active' || i.status === 'vesting'
      ).length,
      exitedInvestments: investments.filter(
        (i) => i.status === 'fully_exited' || i.status === 'partially_exited'
      ).length,
      sectorAllocation,
      stageAllocation,
      topPerformers: sortedByReturn.slice(0, 5),
      underperformers: sortedByReturn.slice(-5).reverse(),
    };
  }

  // ============================================================================
  // AI Evaluation
  // ============================================================================

  async setAIEvaluation(
    opportunityId: string,
    evaluation: AIEvaluationResult
  ): Promise<InvestmentOpportunity> {
    const opportunity = this.opportunities.get(opportunityId);
    if (!opportunity) {
      throw new Error(`Opportunity not found: ${opportunityId}`);
    }

    opportunity.aiEvaluation = evaluation;
    opportunity.updatedAt = new Date();
    this.opportunities.set(opportunityId, opportunity);

    return opportunity;
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

export function createInvestmentManager(
  config?: Partial<InvestmentConfig>
): DefaultInvestmentManager {
  return new DefaultInvestmentManager(config);
}
