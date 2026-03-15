/**
 * TONAIAgent - SGIA Transparency & Audit Framework
 *
 * Manages on-chain audit dashboards, real-time reporting, and immutable audit
 * records for all sovereign-grade institutional operations, providing complete
 * transparency and accountability for all participants.
 *
 * This is Domain 4 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  AuditRecord,
  AuditDashboard,
  RealTimeReport,
  ReportMetric,
  ReportAlert,
  AuditRecordId,
  AuditEventType,
  JurisdictionCode,
  TransparencyAuditConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_TRANSPARENCY_AUDIT_CONFIG: TransparencyAuditConfig = {
  enableOnChainAudit: true,
  enableRealTimeReporting: true,
  enableIpfsAuditLog: false,
  auditRetentionDays: 2555, // ~7 years
  enablePublicDashboard: false,
  complianceScoreThreshold: 80,
  enableAutomatedAlerts: true,
};

// ============================================================================
// Interface
// ============================================================================

export interface TransparencyAuditFramework {
  readonly config: TransparencyAuditConfig;

  // Audit Records
  createAuditRecord(params: CreateAuditRecordParams): AuditRecord;
  getAuditRecord(id: AuditRecordId): AuditRecord | undefined;
  listAuditRecords(filters?: AuditRecordFilters): AuditRecord[];
  addComplianceFlag(recordId: AuditRecordId, flag: string): AuditRecord;

  // Audit Dashboards
  createAuditDashboard(params: CreateDashboardParams): AuditDashboard;
  getAuditDashboard(id: string): AuditDashboard | undefined;
  listAuditDashboards(filters?: DashboardFilters): AuditDashboard[];
  refreshDashboard(id: string): AuditDashboard;

  // Real-Time Reports
  generateRealTimeReport(params: GenerateReportParams): RealTimeReport;
  getReport(id: string): RealTimeReport | undefined;
  listReports(filters?: ReportFilters): RealTimeReport[];

  // Compliance Monitoring
  getComplianceScore(entityId: string): ComplianceScoreResult;
  getAuditSummary(entityId: string): AuditSummary;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateAuditRecordParams {
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  actorId: string;
  actorType: string;
  action: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  jurisdiction: JurisdictionCode;
  onChainTxHash?: string;
}

export interface AuditRecordFilters {
  entityId?: string;
  entityType?: string;
  eventType?: AuditEventType;
  jurisdiction?: JurisdictionCode;
  actorId?: string;
  hasComplianceFlags?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export interface CreateDashboardParams {
  name: string;
  entityId: string;
  reportingPeriodStart: Date;
  reportingPeriodEnd: Date;
}

export interface DashboardFilters {
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface GenerateReportParams {
  reportType: RealTimeReport['reportType'];
  entityId: string;
  includeAlerts?: boolean;
}

export interface ReportFilters {
  reportType?: RealTimeReport['reportType'];
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface ComplianceScoreResult {
  entityId: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalRecords: number;
  flaggedRecords: number;
  resolvedFlags: number;
  openFlags: number;
  calculatedAt: Date;
}

export interface AuditSummary {
  entityId: string;
  totalEvents: number;
  eventBreakdown: Partial<Record<AuditEventType, number>>;
  jurisdictions: JurisdictionCode[];
  complianceScore: number;
  lastAuditAt?: Date;
  openAlerts: number;
  generatedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTransparencyAuditFramework implements TransparencyAuditFramework {
  readonly config: TransparencyAuditConfig;

  private readonly auditRecords = new Map<AuditRecordId, AuditRecord>();
  private readonly auditDashboards = new Map<string, AuditDashboard>();
  private readonly realTimeReports = new Map<string, RealTimeReport>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<TransparencyAuditConfig>) {
    this.config = { ...DEFAULT_TRANSPARENCY_AUDIT_CONFIG, ...config };
  }

  // ============================================================================
  // Audit Records
  // ============================================================================

  createAuditRecord(params: CreateAuditRecordParams): AuditRecord {
    const record: AuditRecord = {
      id: this.generateId('audit'),
      eventType: params.eventType,
      entityId: params.entityId,
      entityType: params.entityType,
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      previousState: params.previousState,
      newState: params.newState,
      metadata: params.metadata ?? {},
      onChainTxHash: params.onChainTxHash,
      timestamp: new Date(),
      jurisdiction: params.jurisdiction,
      complianceFlags: [],
    };

    this.auditRecords.set(record.id, record);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'audit_record_created',
      severity: 'info',
      source: 'TransparencyAuditFramework',
      message: `Audit record created: ${params.eventType} for entity ${params.entityId}`,
      data: { recordId: record.id, eventType: params.eventType, entityId: params.entityId },
      timestamp: new Date(),
    });

    return record;
  }

  getAuditRecord(id: AuditRecordId): AuditRecord | undefined {
    return this.auditRecords.get(id);
  }

  listAuditRecords(filters?: AuditRecordFilters): AuditRecord[] {
    let results = Array.from(this.auditRecords.values());

    if (filters?.entityId) results = results.filter(r => r.entityId === filters.entityId);
    if (filters?.entityType) results = results.filter(r => r.entityType === filters.entityType);
    if (filters?.eventType) results = results.filter(r => r.eventType === filters.eventType);
    if (filters?.jurisdiction) results = results.filter(r => r.jurisdiction === filters.jurisdiction);
    if (filters?.actorId) results = results.filter(r => r.actorId === filters.actorId);
    if (filters?.hasComplianceFlags !== undefined) {
      results = results.filter(r =>
        filters.hasComplianceFlags ? r.complianceFlags.length > 0 : r.complianceFlags.length === 0
      );
    }
    if (filters?.fromDate) results = results.filter(r => r.timestamp >= filters.fromDate!);
    if (filters?.toDate) results = results.filter(r => r.timestamp <= filters.toDate!);

    return results;
  }

  addComplianceFlag(recordId: AuditRecordId, flag: string): AuditRecord {
    const record = this.auditRecords.get(recordId);
    if (!record) throw new Error(`Audit record not found: ${recordId}`);

    if (!record.complianceFlags.includes(flag)) {
      record.complianceFlags.push(flag);
    }

    return record;
  }

  // ============================================================================
  // Audit Dashboards
  // ============================================================================

  createAuditDashboard(params: CreateDashboardParams): AuditDashboard {
    const entityRecords = Array.from(this.auditRecords.values()).filter(
      r => r.entityId === params.entityId &&
        r.timestamp >= params.reportingPeriodStart &&
        r.timestamp <= params.reportingPeriodEnd
    );

    const eventsByType = {} as Record<AuditEventType, number>;
    let flaggedEvents = 0;

    for (const record of entityRecords) {
      eventsByType[record.eventType] = (eventsByType[record.eventType] ?? 0) + 1;
      if (record.complianceFlags.length > 0) flaggedEvents++;
    }

    const complianceScore = entityRecords.length > 0
      ? Math.max(0, 100 - (flaggedEvents / entityRecords.length) * 100)
      : 100;

    const dashboard: AuditDashboard = {
      id: this.generateId('dash'),
      name: params.name,
      entityId: params.entityId,
      reportingPeriodStart: params.reportingPeriodStart,
      reportingPeriodEnd: params.reportingPeriodEnd,
      totalEvents: entityRecords.length,
      eventsByType,
      complianceScore,
      totalVaultValueUSD: 0, // Populated externally
      totalTransactionVolumeUSD: 0, // Populated externally
      flaggedEvents,
      resolvedFlags: 0,
      pendingFlags: flaggedEvents,
      generatedAt: new Date(),
    };

    this.auditDashboards.set(dashboard.id, dashboard);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'audit_report_generated',
      severity: 'info',
      source: 'TransparencyAuditFramework',
      message: `Audit dashboard created for entity ${params.entityId}`,
      data: { dashboardId: dashboard.id, entityId: params.entityId, totalEvents: entityRecords.length },
      timestamp: new Date(),
    });

    return dashboard;
  }

  getAuditDashboard(id: string): AuditDashboard | undefined {
    return this.auditDashboards.get(id);
  }

  listAuditDashboards(filters?: DashboardFilters): AuditDashboard[] {
    let results = Array.from(this.auditDashboards.values());

    if (filters?.entityId) results = results.filter(d => d.entityId === filters.entityId);
    if (filters?.fromDate) results = results.filter(d => d.reportingPeriodStart >= filters.fromDate!);
    if (filters?.toDate) results = results.filter(d => d.reportingPeriodEnd <= filters.toDate!);

    return results;
  }

  refreshDashboard(id: string): AuditDashboard {
    const dashboard = this.auditDashboards.get(id);
    if (!dashboard) throw new Error(`Dashboard not found: ${id}`);

    // Re-compute from records
    const updatedDashboard = this.createAuditDashboard({
      name: dashboard.name,
      entityId: dashboard.entityId,
      reportingPeriodStart: dashboard.reportingPeriodStart,
      reportingPeriodEnd: new Date(),
    });

    // Update the original dashboard
    Object.assign(dashboard, updatedDashboard, { id });
    this.auditDashboards.delete(updatedDashboard.id); // Remove the temporary one
    this.auditDashboards.set(id, dashboard); // Re-set with original id

    return dashboard;
  }

  // ============================================================================
  // Real-Time Reports
  // ============================================================================

  generateRealTimeReport(params: GenerateReportParams): RealTimeReport {
    const entityRecords = Array.from(this.auditRecords.values())
      .filter(r => r.entityId === params.entityId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100); // Last 100 records

    const metrics: ReportMetric[] = [
      {
        name: 'total_audit_events',
        value: entityRecords.length,
        unit: 'count',
        trend: 'up',
        changePercent: 0,
        breached: false,
      },
      {
        name: 'compliance_flags',
        value: entityRecords.filter(r => r.complianceFlags.length > 0).length,
        unit: 'count',
        trend: 'stable',
        changePercent: 0,
        breached: false,
      },
    ];

    const alerts: ReportAlert[] = [];
    if (params.includeAlerts) {
      const flaggedCount = entityRecords.filter(r => r.complianceFlags.length > 0).length;
      if (flaggedCount > 0) {
        alerts.push({
          severity: 'warning',
          message: `${flaggedCount} compliance flags detected in recent audit records`,
          entityId: params.entityId,
          actionRequired: true,
        });
      }
    }

    const report: RealTimeReport = {
      id: this.generateId('rpt'),
      reportType: params.reportType,
      entityId: params.entityId,
      data: {
        totalRecords: entityRecords.length,
        recentEvents: entityRecords.slice(0, 10).map(r => ({
          id: r.id,
          eventType: r.eventType,
          timestamp: r.timestamp,
          flags: r.complianceFlags.length,
        })),
      },
      metrics,
      alerts,
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 3600000), // Valid for 1 hour
    };

    this.realTimeReports.set(report.id, report);
    return report;
  }

  getReport(id: string): RealTimeReport | undefined {
    return this.realTimeReports.get(id);
  }

  listReports(filters?: ReportFilters): RealTimeReport[] {
    let results = Array.from(this.realTimeReports.values());

    if (filters?.reportType) results = results.filter(r => r.reportType === filters.reportType);
    if (filters?.entityId) results = results.filter(r => r.entityId === filters.entityId);
    if (filters?.fromDate) results = results.filter(r => r.generatedAt >= filters.fromDate!);
    if (filters?.toDate) results = results.filter(r => r.generatedAt <= filters.toDate!);

    return results;
  }

  // ============================================================================
  // Compliance Monitoring
  // ============================================================================

  getComplianceScore(entityId: string): ComplianceScoreResult {
    const records = Array.from(this.auditRecords.values()).filter(r => r.entityId === entityId);
    const flaggedRecords = records.filter(r => r.complianceFlags.length > 0).length;
    const openFlags = records.reduce((acc, r) => acc + r.complianceFlags.length, 0);

    const score = records.length > 0
      ? Math.max(0, 100 - (flaggedRecords / records.length) * 100)
      : 100;

    let grade: ComplianceScoreResult['grade'];
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return {
      entityId,
      score,
      grade,
      totalRecords: records.length,
      flaggedRecords,
      resolvedFlags: 0, // Future: track resolved flags
      openFlags,
      calculatedAt: new Date(),
    };
  }

  getAuditSummary(entityId: string): AuditSummary {
    const records = Array.from(this.auditRecords.values()).filter(r => r.entityId === entityId);
    const jurisdictions = [...new Set(records.map(r => r.jurisdiction))];
    const eventBreakdown: Partial<Record<AuditEventType, number>> = {};

    for (const record of records) {
      eventBreakdown[record.eventType] = (eventBreakdown[record.eventType] ?? 0) + 1;
    }

    const complianceScore = this.getComplianceScore(entityId);
    const openAlerts = records.filter(r => r.complianceFlags.length > 0).length;
    const lastRecord = records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return {
      entityId,
      totalEvents: records.length,
      eventBreakdown,
      jurisdictions,
      complianceScore: complianceScore.score,
      lastAuditAt: lastRecord?.timestamp,
      openAlerts,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SGIAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: SGIAEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTransparencyAuditFramework(
  config?: Partial<TransparencyAuditConfig>
): DefaultTransparencyAuditFramework {
  return new DefaultTransparencyAuditFramework(config);
}

export default DefaultTransparencyAuditFramework;
