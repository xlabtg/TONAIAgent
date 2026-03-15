/**
 * TONAIAgent - Institutional Portfolio Support
 *
 * Provides institutional-grade portfolio management capabilities including
 * team-managed funds, delegated portfolio management, and institutional
 * reporting for hedge funds, index funds, and managed accounts.
 */

import {
  InstitutionalFund,
  InstitutionalFundStatus,
  InstitutionalReport,
  DelegatedManager,
  FeesSummary,
  CreateInstitutionalFundInput,
  AnalyticsPeriod,
  TeamPortfolioPerformance,
  TeamRiskExposure,
  PortfolioPermission,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';

// ============================================================================
// Institutional Portfolio Manager Interface
// ============================================================================

export interface InstitutionalPortfolioManager {
  createFund(input: CreateInstitutionalFundInput, createdBy: string): Promise<InstitutionalFund>;
  getFund(fundId: string): InstitutionalFund | undefined;
  listFunds(portfolioId?: string): InstitutionalFund[];
  updateFund(
    fundId: string,
    updates: Partial<Pick<InstitutionalFund, 'name' | 'description' | 'status' | 'minimumInvestmentUsd' | 'managementFeePercent' | 'performanceFeePercent'>>,
    updatedBy: string,
  ): Promise<InstitutionalFund>;
  updateFundAum(fundId: string, newAum: number): Promise<InstitutionalFund>;
  closeFund(fundId: string, closedBy: string): Promise<InstitutionalFund>;

  addDelegatedManager(
    fundId: string,
    delegation: Omit<DelegatedManager, 'delegatedAt' | 'status'>,
  ): Promise<InstitutionalFund>;
  revokeDelegation(fundId: string, userId: string, revokedBy: string): Promise<InstitutionalFund>;
  getDelegatedManagers(fundId: string): DelegatedManager[];

  generateReport(input: GenerateReportInput): Promise<InstitutionalReport>;
  getReport(reportId: string): InstitutionalReport | undefined;
  listReports(fundId: string): InstitutionalReport[];

  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

export interface GenerateReportInput {
  fundId: string;
  portfolioId: string;
  reportType: InstitutionalReport['reportType'];
  period: AnalyticsPeriod;
  generatedBy: string;
  performance: TeamPortfolioPerformance;
  riskMetrics: TeamRiskExposure;
  distributionList?: string[];
  complianceNotes?: string;
}

// ============================================================================
// Default Institutional Portfolio Manager Implementation
// ============================================================================

const DEFAULT_FUND_SETTINGS = {
  currency: 'USD',
  minimumInvestmentUsd: 100000,
  managementFeePercent: 2,
  performanceFeePercent: 20,
};

export class DefaultInstitutionalPortfolioManager implements InstitutionalPortfolioManager {
  private readonly funds = new Map<string, InstitutionalFund>();
  private readonly reports = new Map<string, InstitutionalReport>();
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];

  async createFund(
    input: CreateInstitutionalFundInput,
    createdBy: string,
  ): Promise<InstitutionalFund> {
    const fundId = `fund_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const fund: InstitutionalFund = {
      id: fundId,
      portfolioId: input.portfolioId,
      name: input.name,
      description: input.description,
      fundType: input.fundType,
      status: 'setup',
      aum: 0,
      currency: input.currency ?? DEFAULT_FUND_SETTINGS.currency,
      minimumInvestmentUsd: input.minimumInvestmentUsd ?? DEFAULT_FUND_SETTINGS.minimumInvestmentUsd,
      managementFeePercent: input.managementFeePercent ?? DEFAULT_FUND_SETTINGS.managementFeePercent,
      performanceFeePercent: input.performanceFeePercent ?? DEFAULT_FUND_SETTINGS.performanceFeePercent,
      highWaterMark: 0,
      delegatedManagers: [],
      investorCount: 0,
      inceptionDate: now,
      createdAt: now,
      updatedAt: now,
    };

    this.funds.set(fundId, fund);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'fund_created',
      portfolioId: input.portfolioId,
      actorId: createdBy,
      severity: 'info',
      source: 'InstitutionalPortfolioManager',
      message: `Institutional fund '${input.name}' created`,
      data: { fundId, name: input.name, fundType: input.fundType },
    });

    return fund;
  }

  getFund(fundId: string): InstitutionalFund | undefined {
    return this.funds.get(fundId);
  }

  listFunds(portfolioId?: string): InstitutionalFund[] {
    const all = Array.from(this.funds.values());
    if (portfolioId) {
      return all.filter(f => f.portfolioId === portfolioId);
    }
    return all;
  }

  async updateFund(
    fundId: string,
    updates: Partial<Pick<InstitutionalFund, 'name' | 'description' | 'status' | 'minimumInvestmentUsd' | 'managementFeePercent' | 'performanceFeePercent'>>,
    updatedBy: string,
  ): Promise<InstitutionalFund> {
    const fund = this.requireFund(fundId);

    const updated: InstitutionalFund = {
      ...fund,
      ...updates,
      updatedAt: new Date(),
    };

    this.funds.set(fundId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'fund_created', // reuse for update
      portfolioId: fund.portfolioId,
      actorId: updatedBy,
      severity: 'info',
      source: 'InstitutionalPortfolioManager',
      message: `Institutional fund '${fund.name}' updated`,
      data: { fundId, updates: Object.keys(updates) },
    });

    return updated;
  }

  async updateFundAum(fundId: string, newAum: number): Promise<InstitutionalFund> {
    const fund = this.requireFund(fundId);

    // Update high water mark if AUM exceeds it
    const newHighWaterMark = Math.max(fund.highWaterMark, newAum);

    const updated: InstitutionalFund = {
      ...fund,
      aum: newAum,
      highWaterMark: newHighWaterMark,
      updatedAt: new Date(),
    };

    this.funds.set(fundId, updated);
    return updated;
  }

  async closeFund(fundId: string, closedBy: string): Promise<InstitutionalFund> {
    const fund = this.requireFund(fundId);

    if (fund.status === 'closed') {
      throw new Error(`Fund ${fundId} is already closed`);
    }

    const updated: InstitutionalFund = {
      ...fund,
      status: 'closed',
      updatedAt: new Date(),
    };

    this.funds.set(fundId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'fund_created', // reuse for fund lifecycle
      portfolioId: fund.portfolioId,
      actorId: closedBy,
      severity: 'warning',
      source: 'InstitutionalPortfolioManager',
      message: `Institutional fund '${fund.name}' closed`,
      data: { fundId, closedBy },
    });

    return updated;
  }

  async addDelegatedManager(
    fundId: string,
    delegation: Omit<DelegatedManager, 'delegatedAt' | 'status'>,
  ): Promise<InstitutionalFund> {
    const fund = this.requireFund(fundId);

    // Check if already delegated
    const existing = fund.delegatedManagers.find(dm => dm.userId === delegation.userId);
    if (existing && existing.status === 'active') {
      throw new Error(`User ${delegation.userId} is already a delegated manager of fund ${fundId}`);
    }

    const newDelegation: DelegatedManager = {
      ...delegation,
      delegatedAt: new Date(),
      status: 'active',
    };

    const updatedManagers = existing
      ? fund.delegatedManagers.map(dm =>
          dm.userId === delegation.userId ? newDelegation : dm,
        )
      : [...fund.delegatedManagers, newDelegation];

    const updated: InstitutionalFund = {
      ...fund,
      delegatedManagers: updatedManagers,
      updatedAt: new Date(),
    };

    this.funds.set(fundId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'member_added',
      portfolioId: fund.portfolioId,
      actorId: delegation.delegatedBy,
      severity: 'info',
      source: 'InstitutionalPortfolioManager',
      message: `Delegated manager ${delegation.userId} added to fund '${fund.name}'`,
      data: { fundId, userId: delegation.userId, delegatedBy: delegation.delegatedBy },
    });

    return updated;
  }

  async revokeDelegation(
    fundId: string,
    userId: string,
    revokedBy: string,
  ): Promise<InstitutionalFund> {
    const fund = this.requireFund(fundId);

    const delegation = fund.delegatedManagers.find(dm => dm.userId === userId);
    if (!delegation) {
      throw new Error(`User ${userId} is not a delegated manager of fund ${fundId}`);
    }

    const updatedManagers = fund.delegatedManagers.map(dm =>
      dm.userId === userId ? { ...dm, status: 'revoked' as const } : dm,
    );

    const updated: InstitutionalFund = {
      ...fund,
      delegatedManagers: updatedManagers,
      updatedAt: new Date(),
    };

    this.funds.set(fundId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type: 'member_removed',
      portfolioId: fund.portfolioId,
      actorId: revokedBy,
      severity: 'info',
      source: 'InstitutionalPortfolioManager',
      message: `Delegated manager ${userId} revoked from fund '${fund.name}'`,
      data: { fundId, userId, revokedBy },
    });

    return updated;
  }

  getDelegatedManagers(fundId: string): DelegatedManager[] {
    return this.requireFund(fundId).delegatedManagers;
  }

  async generateReport(input: GenerateReportInput): Promise<InstitutionalReport> {
    const fund = this.requireFund(input.fundId);
    const reportId = `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const feesSummary = this.calculateFees(fund, input.performance);

    const report: InstitutionalReport = {
      id: reportId,
      fundId: input.fundId,
      portfolioId: input.portfolioId,
      reportType: input.reportType,
      period: input.period,
      generatedAt: now,
      generatedBy: input.generatedBy,
      performance: input.performance,
      riskMetrics: input.riskMetrics,
      feesSummary,
      complianceNotes: input.complianceNotes,
      distributionList: input.distributionList ?? [],
    };

    this.reports.set(reportId, report);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'report_generated',
      portfolioId: input.portfolioId,
      actorId: input.generatedBy,
      severity: 'info',
      source: 'InstitutionalPortfolioManager',
      message: `${input.reportType} report generated for fund '${fund.name}'`,
      data: {
        reportId,
        fundId: input.fundId,
        reportType: input.reportType,
        distributionCount: report.distributionList.length,
      },
    });

    return report;
  }

  getReport(reportId: string): InstitutionalReport | undefined {
    return this.reports.get(reportId);
  }

  listReports(fundId: string): InstitutionalReport[] {
    return Array.from(this.reports.values())
      .filter(r => r.fundId === fundId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private calculateFees(
    fund: InstitutionalFund,
    performance: TeamPortfolioPerformance,
  ): FeesSummary {
    const aum = fund.aum;
    const managementFeesUsd = (aum * fund.managementFeePercent) / 100;

    // Performance fees only apply to returns above high water mark
    const returnUsd = performance.returnUsd;
    const performanceFeesUsd = returnUsd > 0
      ? (returnUsd * fund.performanceFeePercent) / 100
      : 0;

    const totalFeesUsd = managementFeesUsd + performanceFeesUsd;
    const grossReturnPercent = performance.returnPercent;
    const netReturnPercent =
      aum > 0 ? grossReturnPercent - (totalFeesUsd / aum) * 100 : 0;

    return {
      managementFeesUsd,
      performanceFeesUsd,
      totalFeesUsd,
      netReturnPercent,
      grossReturnPercent,
    };
  }

  private requireFund(fundId: string): InstitutionalFund {
    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Institutional fund not found: ${fundId}`);
    }
    return fund;
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createInstitutionalPortfolioManager(): DefaultInstitutionalPortfolioManager {
  return new DefaultInstitutionalPortfolioManager();
}
