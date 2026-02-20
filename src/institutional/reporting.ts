/**
 * TONAIAgent - Regulatory Reporting System
 *
 * Implements compliance reporting infrastructure:
 * - Performance reports
 * - Exposure tracking
 * - Risk metrics
 * - Compliance dashboards
 * - Exportable data
 */

import {
  ReportingConfig,
  ReportSchedule,
  InstitutionalReportType,
  ReportFrequency,
  ReportDestination,
  ReportTemplate,
  ReportFormat,
  ReportSectionConfig,
  InstitutionalReport,
  ReportPeriod,
  InstitutionalReportSection,
  ChartConfig,
  ReportExecutiveSummary,
  KeyMetric,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface ReportingManager {
  // Configuration
  configureReporting(
    accountId: string,
    config: Partial<ReportingConfig>
  ): Promise<ReportingConfig>;
  getConfig(accountId: string): Promise<ReportingConfig | null>;

  // Report Schedules
  addSchedule(accountId: string, schedule: Omit<ReportSchedule, 'id'>): Promise<ReportSchedule>;
  updateSchedule(
    accountId: string,
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<ReportSchedule>;
  removeSchedule(accountId: string, scheduleId: string): Promise<void>;
  listSchedules(accountId: string): Promise<ReportSchedule[]>;

  // Report Generation
  generateReport(
    accountId: string,
    type: InstitutionalReportType,
    period: ReportPeriod,
    options?: ReportOptions
  ): Promise<InstitutionalReport>;
  getReport(reportId: string): Promise<InstitutionalReport | null>;
  listReports(accountId: string, filters?: ReportFilters): Promise<InstitutionalReport[]>;
  exportReport(
    reportId: string,
    format: ReportFormat
  ): Promise<ExportedReport>;

  // Templates
  createTemplate(
    accountId: string,
    template: Omit<ReportTemplate, 'id'>
  ): Promise<ReportTemplate>;
  getTemplate(templateId: string): Promise<ReportTemplate | null>;
  listTemplates(accountId: string): Promise<ReportTemplate[]>;

  // Dashboard Data
  getDashboardMetrics(accountId: string): Promise<DashboardMetrics>;
  getComplianceStatus(accountId: string): Promise<ComplianceDashboard>;

  // Processing
  processScheduledReports(): Promise<ProcessingResult[]>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface ReportOptions {
  templateId?: string;
  includeDetails?: boolean;
  groupBy?: string;
  filters?: Record<string, unknown>;
}

export interface ReportFilters {
  type?: InstitutionalReportType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ExportedReport {
  success: boolean;
  format: ReportFormat;
  data?: string | Buffer;
  fileName?: string;
  mimeType?: string;
  error?: string;
}

export interface DashboardMetrics {
  accountId: string;
  timestamp: Date;
  portfolio: PortfolioMetrics;
  activity: ActivityMetrics;
  risk: RiskDashboardMetrics;
  compliance: ComplianceMetrics;
}

export interface PortfolioMetrics {
  totalValue: number;
  change24h: number;
  change7d: number;
  change30d: number;
  assetDistribution: AssetDistribution[];
  topHoldings: Holding[];
}

export interface AssetDistribution {
  category: string;
  value: number;
  percentage: number;
}

export interface Holding {
  asset: string;
  symbol: string;
  value: number;
  quantity: number;
  change24h: number;
}

export interface ActivityMetrics {
  transactions24h: number;
  transactions7d: number;
  transactions30d: number;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  activeAgents: number;
  pendingApprovals: number;
}

export interface RiskDashboardMetrics {
  overallRiskScore: number;
  riskLevel: string;
  varValue: number;
  varPercentage: number;
  currentDrawdown: number;
  maxDrawdown: number;
  alerts: RiskAlert[];
}

export interface RiskAlert {
  type: string;
  severity: string;
  message: string;
  timestamp: Date;
}

export interface ComplianceMetrics {
  overallScore: number;
  kycStatus: string;
  amlStatus: string;
  openAlerts: number;
  pendingReviews: number;
  lastAudit: Date;
  nextReview: Date;
}

export interface ComplianceDashboard {
  accountId: string;
  timestamp: Date;
  status: ComplianceOverallStatus;
  kyc: KycComplianceStatus;
  aml: AmlComplianceStatus;
  monitoring: MonitoringStatus;
  reporting: ReportingStatus;
  issues: ComplianceIssue[];
}

export interface ComplianceOverallStatus {
  score: number;
  status: 'compliant' | 'needs_attention' | 'non_compliant';
  lastUpdate: Date;
}

export interface KycComplianceStatus {
  status: string;
  level: string;
  expiresAt?: Date;
  documentsValid: number;
  documentsPending: number;
  documentsExpired: number;
}

export interface AmlComplianceStatus {
  status: string;
  lastScreening: Date;
  nextScreening: Date;
  openCases: number;
  resolvedCases: number;
}

export interface MonitoringStatus {
  enabled: boolean;
  rulesActive: number;
  alertsOpen: number;
  alertsResolved30d: number;
  sarsFiled30d: number;
}

export interface ReportingStatus {
  reportsGenerated30d: number;
  scheduledReports: number;
  failedReports30d: number;
  nextScheduledReport?: Date;
}

export interface ComplianceIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface ProcessingResult {
  scheduleId: string;
  reportId?: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Default Report Templates
// ============================================================================

const DEFAULT_TEMPLATES: Omit<ReportTemplate, 'id'>[] = [
  {
    name: 'Daily Performance Summary',
    type: 'performance',
    sections: [
      { name: 'Portfolio Overview', type: 'summary', dataSource: 'portfolio' },
      { name: 'Daily Returns', type: 'chart', dataSource: 'returns', chartType: 'line' },
      { name: 'Top Movers', type: 'table', dataSource: 'holdings', columns: ['asset', 'change', 'value'] },
      { name: 'Transaction Activity', type: 'table', dataSource: 'transactions' },
    ],
    format: 'pdf',
    branding: {},
  },
  {
    name: 'Risk Assessment Report',
    type: 'risk_metrics',
    sections: [
      { name: 'Risk Summary', type: 'summary', dataSource: 'risk_metrics' },
      { name: 'VaR Analysis', type: 'chart', dataSource: 'var', chartType: 'bar' },
      { name: 'Stress Test Results', type: 'table', dataSource: 'stress_tests' },
      { name: 'Risk Alerts', type: 'table', dataSource: 'alerts' },
    ],
    format: 'pdf',
    branding: {},
  },
  {
    name: 'Compliance Summary',
    type: 'compliance_summary',
    sections: [
      { name: 'Compliance Status', type: 'summary', dataSource: 'compliance' },
      { name: 'KYC/AML Status', type: 'table', dataSource: 'kyc_aml' },
      { name: 'Alert Summary', type: 'chart', dataSource: 'alerts', chartType: 'pie' },
      { name: 'Open Issues', type: 'table', dataSource: 'issues' },
    ],
    format: 'pdf',
    branding: {},
  },
  {
    name: 'Transaction Audit Report',
    type: 'transaction_audit',
    sections: [
      { name: 'Audit Summary', type: 'summary', dataSource: 'audit_summary' },
      { name: 'Transaction List', type: 'table', dataSource: 'transactions' },
      { name: 'Approval History', type: 'table', dataSource: 'approvals' },
      { name: 'Flagged Transactions', type: 'table', dataSource: 'flagged' },
    ],
    format: 'excel',
    branding: {},
  },
];

// ============================================================================
// Reporting Manager Implementation
// ============================================================================

export class DefaultReportingManager implements ReportingManager {
  private readonly configs = new Map<string, ReportingConfig>();
  private readonly reports = new Map<string, InstitutionalReport>();
  private readonly reportsByAccount = new Map<string, Set<string>>();
  private readonly templates = new Map<string, ReportTemplate>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private scheduleCounter = 0;
  private reportCounter = 0;
  private templateCounter = 0;

  async configureReporting(
    accountId: string,
    config: Partial<ReportingConfig>
  ): Promise<ReportingConfig> {
    const existing = this.configs.get(accountId);

    const newConfig: ReportingConfig = {
      accountId,
      enabled: config.enabled ?? existing?.enabled ?? true,
      schedules: config.schedules ?? existing?.schedules ?? [],
      destinations: config.destinations ?? existing?.destinations ?? [],
      templates: config.templates ?? existing?.templates ?? [],
      retentionDays: config.retentionDays ?? existing?.retentionDays ?? 365,
    };

    this.configs.set(accountId, newConfig);

    // Initialize default templates if needed
    if (newConfig.templates.length === 0) {
      for (const template of DEFAULT_TEMPLATES) {
        const created = await this.createTemplate(accountId, template);
        newConfig.templates.push(created);
      }
    }

    return newConfig;
  }

  async getConfig(accountId: string): Promise<ReportingConfig | null> {
    return this.configs.get(accountId) ?? null;
  }

  async addSchedule(
    accountId: string,
    schedule: Omit<ReportSchedule, 'id'>
  ): Promise<ReportSchedule> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Reporting not configured for account: ${accountId}`);
    }

    const scheduleId = this.generateScheduleId();
    const newSchedule: ReportSchedule = {
      ...schedule,
      id: scheduleId,
      nextRunAt: this.calculateNextRun(schedule),
    };

    config.schedules.push(newSchedule);

    return newSchedule;
  }

  async updateSchedule(
    accountId: string,
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Reporting not configured for account: ${accountId}`);
    }

    const schedule = config.schedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    Object.assign(schedule, updates);

    if (updates.frequency || updates.dayOfWeek || updates.dayOfMonth || updates.hour) {
      schedule.nextRunAt = this.calculateNextRun(schedule);
    }

    return schedule;
  }

  async removeSchedule(accountId: string, scheduleId: string): Promise<void> {
    const config = this.configs.get(accountId);
    if (!config) {
      throw new Error(`Reporting not configured for account: ${accountId}`);
    }

    config.schedules = config.schedules.filter((s) => s.id !== scheduleId);
  }

  async listSchedules(accountId: string): Promise<ReportSchedule[]> {
    const config = this.configs.get(accountId);
    return config?.schedules ?? [];
  }

  async generateReport(
    accountId: string,
    type: InstitutionalReportType,
    period: ReportPeriod,
    options?: ReportOptions
  ): Promise<InstitutionalReport> {
    const reportId = this.generateReportId();

    // Get template if specified
    let template: ReportTemplate | undefined;
    if (options?.templateId) {
      template = this.templates.get(options.templateId) ?? undefined;
    }

    // Generate report sections based on type
    const sections = this.generateSections(type, period, template, options);
    const summary = this.generateSummary(type, sections);

    const report: InstitutionalReport = {
      id: reportId,
      accountId,
      type,
      title: this.getReportTitle(type, period),
      generatedAt: new Date(),
      period,
      sections,
      summary,
      metadata: {
        templateId: options?.templateId,
        options,
      },
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    this.reports.set(reportId, report);

    if (!this.reportsByAccount.has(accountId)) {
      this.reportsByAccount.set(accountId, new Set());
    }
    this.reportsByAccount.get(accountId)!.add(reportId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'report_generated',
      accountId,
      actorId: 'system',
      actorRole: 'admin',
      action: 'generate_report',
      resource: 'report',
      resourceId: reportId,
      details: { type, period },
      metadata: {},
    });

    return report;
  }

  async getReport(reportId: string): Promise<InstitutionalReport | null> {
    return this.reports.get(reportId) ?? null;
  }

  async listReports(accountId: string, filters?: ReportFilters): Promise<InstitutionalReport[]> {
    const reportIds = this.reportsByAccount.get(accountId);
    if (!reportIds) {
      return [];
    }

    let reports = Array.from(reportIds)
      .map((id) => this.reports.get(id))
      .filter((r): r is InstitutionalReport => r !== undefined);

    if (filters?.type) {
      reports = reports.filter((r) => r.type === filters.type);
    }
    if (filters?.startDate) {
      reports = reports.filter((r) => r.generatedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      reports = reports.filter((r) => r.generatedAt <= filters.endDate!);
    }
    if (filters?.limit) {
      reports = reports.slice(0, filters.limit);
    }

    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async exportReport(reportId: string, format: ReportFormat): Promise<ExportedReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, format, error: 'Report not found' };
    }

    try {
      let data: string;
      let mimeType: string;
      let fileName: string;

      switch (format) {
        case 'json':
          data = JSON.stringify(report, null, 2);
          mimeType = 'application/json';
          fileName = `${report.id}.json`;
          break;
        case 'csv':
          data = this.reportToCSV(report);
          mimeType = 'text/csv';
          fileName = `${report.id}.csv`;
          break;
        case 'excel':
          data = this.reportToCSV(report); // Simplified - would use xlsx library in production
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileName = `${report.id}.xlsx`;
          break;
        case 'pdf':
          data = JSON.stringify(report); // Simplified - would use pdf library in production
          mimeType = 'application/pdf';
          fileName = `${report.id}.pdf`;
          break;
        default:
          return { success: false, format, error: `Unsupported format: ${format}` };
      }

      return { success: true, format, data, fileName, mimeType };
    } catch (error) {
      return {
        success: false,
        format,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  async createTemplate(
    accountId: string,
    template: Omit<ReportTemplate, 'id'>
  ): Promise<ReportTemplate> {
    const templateId = this.generateTemplateId();
    const newTemplate: ReportTemplate = {
      ...template,
      id: templateId,
    };

    this.templates.set(templateId, newTemplate);

    const config = this.configs.get(accountId);
    if (config) {
      config.templates.push(newTemplate);
    }

    return newTemplate;
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.templates.get(templateId) ?? null;
  }

  async listTemplates(accountId: string): Promise<ReportTemplate[]> {
    const config = this.configs.get(accountId);
    return config?.templates ?? [];
  }

  async getDashboardMetrics(accountId: string): Promise<DashboardMetrics> {
    // Generate sample dashboard metrics
    return {
      accountId,
      timestamp: new Date(),
      portfolio: {
        totalValue: 1000000,
        change24h: 2.5,
        change7d: 5.2,
        change30d: 12.3,
        assetDistribution: [
          { category: 'TON', value: 500000, percentage: 50 },
          { category: 'Stablecoins', value: 300000, percentage: 30 },
          { category: 'DeFi Tokens', value: 200000, percentage: 20 },
        ],
        topHoldings: [
          { asset: 'TON', symbol: 'TON', value: 500000, quantity: 200000, change24h: 3.1 },
          { asset: 'USDT', symbol: 'USDT', value: 200000, quantity: 200000, change24h: 0.01 },
          { asset: 'NOT', symbol: 'NOT', value: 100000, quantity: 1000000, change24h: -1.5 },
        ],
      },
      activity: {
        transactions24h: 45,
        transactions7d: 312,
        transactions30d: 1250,
        volume24h: 125000,
        volume7d: 875000,
        volume30d: 3500000,
        activeAgents: 5,
        pendingApprovals: 3,
      },
      risk: {
        overallRiskScore: 35,
        riskLevel: 'medium',
        varValue: 25000,
        varPercentage: 2.5,
        currentDrawdown: 1.2,
        maxDrawdown: 8.5,
        alerts: [
          {
            type: 'concentration',
            severity: 'low',
            message: 'TON concentration approaching limit',
            timestamp: new Date(),
          },
        ],
      },
      compliance: {
        overallScore: 92,
        kycStatus: 'approved',
        amlStatus: 'compliant',
        openAlerts: 2,
        pendingReviews: 1,
        lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextReview: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    };
  }

  async getComplianceStatus(accountId: string): Promise<ComplianceDashboard> {
    return {
      accountId,
      timestamp: new Date(),
      status: {
        score: 92,
        status: 'compliant',
        lastUpdate: new Date(),
      },
      kyc: {
        status: 'approved',
        level: 'institutional',
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        documentsValid: 8,
        documentsPending: 0,
        documentsExpired: 0,
      },
      aml: {
        status: 'compliant',
        lastScreening: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextScreening: new Date(Date.now() + 24 * 60 * 60 * 1000),
        openCases: 2,
        resolvedCases: 45,
      },
      monitoring: {
        enabled: true,
        rulesActive: 12,
        alertsOpen: 3,
        alertsResolved30d: 28,
        sarsFiled30d: 0,
      },
      reporting: {
        reportsGenerated30d: 15,
        scheduledReports: 4,
        failedReports30d: 0,
        nextScheduledReport: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      issues: [
        {
          id: 'issue_1',
          type: 'document_expiry',
          severity: 'low',
          description: 'Annual financial statements due for renewal',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'open',
        },
      ],
    };
  }

  async processScheduledReports(): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const now = new Date();

    for (const config of this.configs.values()) {
      if (!config.enabled) continue;

      for (const schedule of config.schedules) {
        if (!schedule.enabled) continue;
        if (!schedule.nextRunAt || now < schedule.nextRunAt) continue;

        try {
          const period = this.getReportPeriod(schedule.frequency);
          const report = await this.generateReport(
            config.accountId,
            schedule.reportType,
            period
          );

          schedule.lastRunAt = now;
          schedule.nextRunAt = this.calculateNextRun(schedule);

          results.push({
            scheduleId: schedule.id,
            reportId: report.id,
            success: true,
          });

          // Distribute to destinations
          for (const destination of config.destinations) {
            if (destination.enabled) {
              await this.distributeReport(report, destination);
            }
          }
        } catch (error) {
          results.push({
            scheduleId: schedule.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private generateScheduleId(): string {
    this.scheduleCounter++;
    return `schedule_${Date.now()}_${this.scheduleCounter.toString(36)}`;
  }

  private generateReportId(): string {
    this.reportCounter++;
    return `report_${Date.now()}_${this.reportCounter.toString(36)}`;
  }

  private generateTemplateId(): string {
    this.templateCounter++;
    return `template_${Date.now()}_${this.templateCounter.toString(36)}`;
  }

  private calculateNextRun(schedule: Omit<ReportSchedule, 'id' | 'nextRunAt'>): Date {
    const now = new Date();
    const next = new Date(now);

    // Set time
    next.setHours(schedule.hour, 0, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;
      case 'weekly':
        const currentDay = next.getDay();
        const targetDay = schedule.dayOfWeek ?? 1; // Default Monday
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0 || (daysToAdd === 0 && next <= now)) {
          daysToAdd += 7;
        }
        next.setDate(next.getDate() + daysToAdd);
        break;
      case 'monthly':
        const targetDate = schedule.dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      case 'quarterly':
        const currentMonth = next.getMonth();
        const quarterStart = Math.floor(currentMonth / 3) * 3;
        next.setMonth(quarterStart + 3);
        next.setDate(1);
        break;
    }

    return next;
  }

  private getReportPeriod(frequency: ReportFrequency): ReportPeriod {
    const end = new Date();
    const start = new Date(end);

    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setDate(start.getDate() - 1);
    }

    return { start, end, timezone: 'UTC' };
  }

  private getReportTitle(type: InstitutionalReportType, period: ReportPeriod): string {
    const typeNames: Record<InstitutionalReportType, string> = {
      performance: 'Performance Report',
      exposure: 'Exposure Report',
      risk_metrics: 'Risk Metrics Report',
      compliance_summary: 'Compliance Summary',
      transaction_audit: 'Transaction Audit',
      portfolio_summary: 'Portfolio Summary',
      sar_report: 'Suspicious Activity Report',
      custom: 'Custom Report',
    };

    const startStr = period.start.toISOString().split('T')[0];
    const endStr = period.end.toISOString().split('T')[0];

    return `${typeNames[type]} (${startStr} to ${endStr})`;
  }

  private generateSections(
    type: InstitutionalReportType,
    period: ReportPeriod,
    template?: ReportTemplate,
    _options?: ReportOptions
  ): InstitutionalReportSection[] {
    const sections: InstitutionalReportSection[] = [];

    if (template) {
      for (const sectionConfig of template.sections) {
        sections.push(this.generateSection(sectionConfig, type, period));
      }
    } else {
      // Generate default sections based on type
      switch (type) {
        case 'performance':
          sections.push(
            { title: 'Portfolio Summary', type: 'summary', data: this.generatePortfolioData(), summary: 'Portfolio performance summary' },
            { title: 'Returns', type: 'chart', data: [], charts: [this.generateReturnsChart()] },
            { title: 'Top Holdings', type: 'table', data: this.generateHoldingsData() }
          );
          break;
        case 'risk_metrics':
          sections.push(
            { title: 'Risk Overview', type: 'summary', data: this.generateRiskData() },
            { title: 'VaR Analysis', type: 'chart', data: [], charts: [this.generateVaRChart()] },
            { title: 'Stress Tests', type: 'table', data: this.generateStressTestData() }
          );
          break;
        case 'compliance_summary':
          sections.push(
            { title: 'Compliance Status', type: 'summary', data: this.generateComplianceData() },
            { title: 'Alert Summary', type: 'table', data: this.generateAlertData() }
          );
          break;
        case 'transaction_audit':
          sections.push(
            { title: 'Transaction Summary', type: 'summary', data: [] },
            { title: 'Transactions', type: 'table', data: this.generateTransactionData() }
          );
          break;
        default:
          sections.push({ title: 'Report Data', type: 'summary', data: [] });
      }
    }

    return sections;
  }

  private generateSection(
    config: ReportSectionConfig,
    _type: InstitutionalReportType,
    _period: ReportPeriod
  ): InstitutionalReportSection {
    const section: InstitutionalReportSection = {
      title: config.name,
      type: config.type,
      data: [],
    };

    // Generate appropriate data based on data source
    switch (config.dataSource) {
      case 'portfolio':
        section.data = this.generatePortfolioData();
        break;
      case 'returns':
        section.charts = [this.generateReturnsChart()];
        break;
      case 'holdings':
        section.data = this.generateHoldingsData();
        break;
      case 'risk_metrics':
        section.data = this.generateRiskData();
        break;
      case 'transactions':
        section.data = this.generateTransactionData();
        break;
      default:
        section.data = [];
    }

    return section;
  }

  private generateSummary(
    type: InstitutionalReportType,
    _sections: InstitutionalReportSection[]
  ): ReportExecutiveSummary {
    const highlights: string[] = [];
    const keyMetrics: KeyMetric[] = [];
    const alerts: string[] = [];
    const recommendations: string[] = [];

    switch (type) {
      case 'performance':
        highlights.push('Portfolio performance within expected parameters');
        keyMetrics.push(
          { name: 'Total Return', value: '12.5%', change: 2.1, changeType: 'increase', trend: 'up' },
          { name: 'Sharpe Ratio', value: '1.8', trend: 'stable' }
        );
        break;
      case 'risk_metrics':
        highlights.push('Risk levels remain within tolerance');
        keyMetrics.push(
          { name: 'VaR (95%)', value: '$25,000', trend: 'stable' },
          { name: 'Max Drawdown', value: '8.5%', trend: 'stable' }
        );
        recommendations.push('Consider rebalancing to reduce concentration risk');
        break;
      case 'compliance_summary':
        highlights.push('All compliance requirements met');
        keyMetrics.push(
          { name: 'Compliance Score', value: '92%', trend: 'stable' },
          { name: 'Open Alerts', value: '3', change: -2, changeType: 'decrease', trend: 'down' }
        );
        break;
    }

    return { highlights, keyMetrics, alerts, recommendations };
  }

  private generatePortfolioData(): Record<string, unknown>[] {
    return [
      { metric: 'Total Value', value: 1000000, currency: 'USD' },
      { metric: '24h Change', value: 2.5, type: 'percentage' },
      { metric: '7d Change', value: 5.2, type: 'percentage' },
      { metric: '30d Change', value: 12.3, type: 'percentage' },
    ];
  }

  private generateHoldingsData(): Record<string, unknown>[] {
    return [
      { asset: 'TON', value: 500000, quantity: 200000, weight: 50 },
      { asset: 'USDT', value: 200000, quantity: 200000, weight: 20 },
      { asset: 'NOT', value: 100000, quantity: 1000000, weight: 10 },
      { asset: 'Other', value: 200000, quantity: 0, weight: 20 },
    ];
  }

  private generateRiskData(): Record<string, unknown>[] {
    return [
      { metric: 'VaR (95%)', value: 25000, percentage: 2.5 },
      { metric: 'Expected Shortfall', value: 35000, percentage: 3.5 },
      { metric: 'Current Drawdown', value: 1.2, type: 'percentage' },
      { metric: 'Max Drawdown', value: 8.5, type: 'percentage' },
    ];
  }

  private generateStressTestData(): Record<string, unknown>[] {
    return [
      { scenario: 'Market Crash (-30%)', impact: -150000, impactPercent: 15 },
      { scenario: 'Flash Crash (-50%)', impact: -250000, impactPercent: 25 },
      { scenario: 'Liquidity Crisis', impact: -80000, impactPercent: 8 },
    ];
  }

  private generateComplianceData(): Record<string, unknown>[] {
    return [
      { area: 'KYC', status: 'Approved', score: 100 },
      { area: 'AML', status: 'Compliant', score: 95 },
      { area: 'Monitoring', status: 'Active', score: 90 },
      { area: 'Reporting', status: 'Current', score: 85 },
    ];
  }

  private generateAlertData(): Record<string, unknown>[] {
    return [
      { type: 'Large Transaction', count: 5, resolved: 5, pending: 0 },
      { type: 'New Destination', count: 3, resolved: 2, pending: 1 },
      { type: 'Velocity Alert', count: 2, resolved: 1, pending: 1 },
    ];
  }

  private generateTransactionData(): Record<string, unknown>[] {
    return [
      { date: new Date().toISOString(), type: 'swap', amount: 50000, status: 'completed' },
      { date: new Date().toISOString(), type: 'transfer', amount: 25000, status: 'completed' },
      { date: new Date().toISOString(), type: 'stake', amount: 100000, status: 'completed' },
    ];
  }

  private generateReturnsChart(): ChartConfig {
    return {
      type: 'line',
      title: 'Daily Returns',
      xAxis: 'date',
      yAxis: ['return'],
      data: [
        { date: '2026-02-13', return: 1.2 },
        { date: '2026-02-14', return: -0.5 },
        { date: '2026-02-15', return: 2.1 },
        { date: '2026-02-16', return: 0.8 },
        { date: '2026-02-17', return: 1.5 },
        { date: '2026-02-18', return: -0.3 },
        { date: '2026-02-19', return: 1.9 },
      ],
    };
  }

  private generateVaRChart(): ChartConfig {
    return {
      type: 'bar',
      title: 'VaR by Asset Class',
      xAxis: 'asset',
      yAxis: ['var'],
      data: [
        { asset: 'TON', var: 15000 },
        { asset: 'DeFi Tokens', var: 8000 },
        { asset: 'Stablecoins', var: 2000 },
      ],
    };
  }

  private reportToCSV(report: InstitutionalReport): string {
    const rows: string[] = [];
    rows.push('Report ID,Type,Generated At');
    rows.push(`${report.id},${report.type},${report.generatedAt.toISOString()}`);
    rows.push('');

    for (const section of report.sections) {
      rows.push(`Section: ${section.title}`);
      if (section.data.length > 0) {
        const headers = Object.keys(section.data[0]);
        rows.push(headers.join(','));
        for (const row of section.data) {
          rows.push(headers.map((h) => String((row as Record<string, unknown>)[h])).join(','));
        }
      }
      rows.push('');
    }

    return rows.join('\n');
  }

  private async distributeReport(
    _report: InstitutionalReport,
    destination: ReportDestination
  ): Promise<void> {
    // In production, this would send to actual destinations
    switch (destination.type) {
      case 'email':
        // Send email
        break;
      case 'sftp':
        // Upload to SFTP
        break;
      case 'api':
        // POST to API endpoint
        break;
      case 's3':
        // Upload to S3
        break;
      case 'webhook':
        // POST to webhook
        break;
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

export function createReportingManager(): DefaultReportingManager {
  return new DefaultReportingManager();
}

export { DEFAULT_TEMPLATES };
