/**
 * TONAIAgent - Clearing Audit & Transparency Module
 *
 * Provides immutable audit logs, institutional reporting, exposure dashboards,
 * compliance-ready reports, and systemic risk monitoring for the AI-native
 * clearing house infrastructure.
 */

import {
  AuditEntryId,
  ClearingParticipantId,
  ClearingAuditEntry,
  ExposureDashboard,
  ClearingReport,
  ClearingReportSummary,
  SystemicRiskSnapshot,
  AuditConfig,
  AuditEventCategory,
  ClearingHouseEventType,
  ParticipantRiskSummary,
  ParticipantType,
  DefaultStatus,
  ClearingHouseEvent,
  ClearingHouseEventCallback,
} from './types';

// ============================================================================
// Audit Module Interface
// ============================================================================

export interface CreateAuditEntryParams {
  category: AuditEventCategory;
  eventType: ClearingHouseEventType;
  actor: string;
  actorType: 'ai_agent' | 'system' | 'operator' | 'smart_contract';
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  details?: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending';
  txHash?: string;
  blockNumber?: number;
}

export interface AuditFilters {
  category?: AuditEventCategory;
  eventType?: ClearingHouseEventType;
  actor?: string;
  actorType?: ClearingAuditEntry['actorType'];
  outcome?: ClearingAuditEntry['outcome'];
  resourceType?: string;
  resourceId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface ReportPeriod {
  from: Date;
  to: Date;
}

export interface RiskSnapshotParams {
  totalNotionalValue: number;
  pendingSettlementValue: number;
  collateralPosted: number;
  totalMarginRequired: number;
  participantRiskSummaries: ParticipantRiskSummary[];
  defaultEventsCount: number;
}

export interface ClearingAuditModule {
  readonly config: AuditConfig;

  // Audit Logging
  createAuditEntry(params: CreateAuditEntryParams): ClearingAuditEntry;
  getAuditEntry(entryId: AuditEntryId): ClearingAuditEntry | undefined;
  listAuditEntries(filters?: AuditFilters): ClearingAuditEntry[];
  verifyAuditIntegrity(entryId: AuditEntryId): boolean;

  // Exposure Dashboard
  generateExposureDashboard(params: ExposureDashboardParams): ExposureDashboard;

  // Systemic Risk
  computeSystemicRisk(params: RiskSnapshotParams): SystemicRiskSnapshot;
  listSystemicRiskSnapshots(): SystemicRiskSnapshot[];

  // Reports
  generateReport(reportType: ClearingReport['reportType'], period: ReportPeriod): ClearingReport;
  getReport(reportId: string): ClearingReport | undefined;
  listReports(reportType?: ClearingReport['reportType']): ClearingReport[];

  // Events
  onEvent(callback: ClearingHouseEventCallback): void;
}

export interface ExposureDashboardParams {
  totalParticipants: number;
  activeParticipants: number;
  totalTradesRegistered: number;
  openTradesCount: number;
  totalNotionalValue: number;
  netExposure: number;
  grossExposure: number;
  pendingSettlements: number;
  settlementValue: number;
  collateralPosted: number;
  marginUtilization: number;
  defaultFundSize: number;
  insurancePoolSize: number;
  participantRiskSummaries: ParticipantRiskSummary[];
}

// ============================================================================
// Default Audit Config
// ============================================================================

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  immutableLogging: true,
  signatureEnabled: false, // Disabled by default (requires crypto infrastructure)
  onChainAnchoringEnabled: false, // Disabled by default
  retentionDays: 2555, // 7 years for regulatory compliance
  complianceFrameworks: ['ISO20022', 'MiFID_II', 'EMIR', 'CFTC'],
  reportingFrequency: 'realtime',
};

// ============================================================================
// Default Clearing Audit Module Implementation
// ============================================================================

export class DefaultClearingAuditModule implements ClearingAuditModule {
  readonly config: AuditConfig;

  private readonly auditEntries: Map<AuditEntryId, ClearingAuditEntry> = new Map();
  private readonly riskSnapshots: SystemicRiskSnapshot[] = [];
  private readonly reports: Map<string, ClearingReport> = new Map();
  private readonly eventCallbacks: ClearingHouseEventCallback[] = [];
  private entryCounter = 0;

  constructor(config?: Partial<AuditConfig>) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...config };
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  createAuditEntry(params: CreateAuditEntryParams): ClearingAuditEntry {
    this.entryCounter++;

    const entry: ClearingAuditEntry = {
      id: `audit_${Date.now()}_${this.entryCounter.toString().padStart(6, '0')}`,
      timestamp: new Date(),
      category: params.category,
      eventType: params.eventType,
      actor: params.actor,
      actorType: params.actorType,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      beforeState: params.beforeState,
      afterState: params.afterState,
      details: params.details ?? {},
      outcome: params.outcome,
      txHash: params.txHash,
      blockNumber: params.blockNumber,
    };

    // Compute integrity signature if enabled
    if (this.config.signatureEnabled) {
      entry.signature = this.computeSignature(entry);
    }

    this.auditEntries.set(entry.id, entry);

    this.emitEvent('info', 'audit_module', 'Audit entry created', {
      entryId: entry.id,
      category: params.category,
      eventType: params.eventType,
      actor: params.actor,
      outcome: params.outcome,
    });

    return entry;
  }

  getAuditEntry(entryId: AuditEntryId): ClearingAuditEntry | undefined {
    return this.auditEntries.get(entryId);
  }

  listAuditEntries(filters?: AuditFilters): ClearingAuditEntry[] {
    let list = Array.from(this.auditEntries.values());

    if (filters) {
      if (filters.category) {
        list = list.filter(e => e.category === filters.category);
      }
      if (filters.eventType) {
        list = list.filter(e => e.eventType === filters.eventType);
      }
      if (filters.actor) {
        list = list.filter(e => e.actor === filters.actor);
      }
      if (filters.actorType) {
        list = list.filter(e => e.actorType === filters.actorType);
      }
      if (filters.outcome) {
        list = list.filter(e => e.outcome === filters.outcome);
      }
      if (filters.resourceType) {
        list = list.filter(e => e.resourceType === filters.resourceType);
      }
      if (filters.resourceId) {
        list = list.filter(e => e.resourceId === filters.resourceId);
      }
      if (filters.fromDate) {
        list = list.filter(e => e.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        list = list.filter(e => e.timestamp <= filters.toDate!);
      }
    }

    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  verifyAuditIntegrity(entryId: AuditEntryId): boolean {
    const entry = this.auditEntries.get(entryId);
    if (!entry) return false;

    if (!this.config.signatureEnabled || !entry.signature) {
      return true; // No signature to verify
    }

    // Recompute signature and compare
    const expectedSignature = this.computeSignature(entry);
    return entry.signature === expectedSignature;
  }

  // ============================================================================
  // Exposure Dashboard
  // ============================================================================

  generateExposureDashboard(params: ExposureDashboardParams): ExposureDashboard {
    const compressionRatio =
      params.grossExposure > 0 ? params.netExposure / params.grossExposure : 0;

    const dashboard: ExposureDashboard = {
      generatedAt: new Date(),
      totalParticipants: params.totalParticipants,
      activeParticipants: params.activeParticipants,
      totalTradesRegistered: params.totalTradesRegistered,
      openTradesCount: params.openTradesCount,
      totalNotionalValue: params.totalNotionalValue,
      netExposure: params.netExposure,
      grossExposure: params.grossExposure,
      compressionRatio,
      pendingSettlements: params.pendingSettlements,
      settlementValue: params.settlementValue,
      collateralPosted: params.collateralPosted,
      marginUtilization: params.marginUtilization,
      defaultFundSize: params.defaultFundSize,
      insurancePoolSize: params.insurancePoolSize,
      participantRiskSummary: params.participantRiskSummaries,
    };

    // Log the dashboard generation
    this.createAuditEntry({
      category: 'compliance',
      eventType: 'audit_entry_created',
      actor: 'system',
      actorType: 'system',
      action: 'generate_exposure_dashboard',
      resourceType: 'dashboard',
      resourceId: 'exposure_dashboard',
      details: {
        totalNotionalValue: params.totalNotionalValue,
        compressionRatio,
        activeParticipants: params.activeParticipants,
      },
      outcome: 'success',
    });

    return dashboard;
  }

  // ============================================================================
  // Systemic Risk
  // ============================================================================

  computeSystemicRisk(params: RiskSnapshotParams): SystemicRiskSnapshot {
    // Concentration risk: based on participant distribution
    const topParticipantShare =
      params.participantRiskSummaries.length > 0
        ? params.participantRiskSummaries.sort((a, b) => b.notionalExposure - a.notionalExposure)[0]
            .notionalExposure / (params.totalNotionalValue || 1)
        : 0;

    const concentrationRisk = Math.min(topParticipantShare * 2, 1); // Scale to 0-1

    // Settlement risk: % of value in pending settlement
    const settlementRisk = Math.min(
      params.pendingSettlementValue / (params.totalNotionalValue || 1),
      1
    );

    // Liquidity risk: margin utilization
    const liquidityRisk = Math.min(
      params.totalMarginRequired > 0
        ? params.totalMarginRequired / (params.collateralPosted || params.totalMarginRequired)
        : 0,
      1
    );

    // Counterparty risk: based on participants with defaults
    const defaultedCount = params.participantRiskSummaries.filter(
      p => p.defaultStatus !== 'none'
    ).length;
    const counterpartyRisk = Math.min(
      defaultedCount / (params.participantRiskSummaries.length || 1),
      1
    );

    // Contagion risk: combination of factors
    const contagionRisk = Math.min(
      (concentrationRisk * 0.4 + counterpartyRisk * 0.4 + settlementRisk * 0.2),
      1
    );

    // Overall risk score (0-100)
    const overallRiskScore = Math.round(
      (concentrationRisk * 25 + settlementRisk * 20 + liquidityRisk * 20 + counterpartyRisk * 20 + contagionRisk * 15)
    );

    let marketRegime: 'normal' | 'stressed' | 'crisis';
    if (overallRiskScore < 33) {
      marketRegime = 'normal';
    } else if (overallRiskScore < 66) {
      marketRegime = 'stressed';
    } else {
      marketRegime = 'crisis';
    }

    const topRisks: string[] = [];
    if (concentrationRisk > 0.3) topRisks.push('High concentration risk in top participants');
    if (settlementRisk > 0.2) topRisks.push('Elevated settlement risk from pending obligations');
    if (liquidityRisk > 0.7) topRisks.push('Liquidity risk: insufficient collateral coverage');
    if (counterpartyRisk > 0.05) topRisks.push('Active participant defaults');
    if (contagionRisk > 0.25) topRisks.push('Contagion risk: potential cascade failures');

    const recommendedActions: string[] = [];
    if (overallRiskScore > 50) recommendedActions.push('Increase margin requirements for high-risk participants');
    if (settlementRisk > 0.15) recommendedActions.push('Accelerate pending settlements');
    if (defaultedCount > 0) recommendedActions.push('Activate default resolution protocol');
    if (concentrationRisk > 0.4) recommendedActions.push('Enforce concentration limits');

    const snapshot: SystemicRiskSnapshot = {
      timestamp: new Date(),
      overallRiskScore,
      marketRegime,
      concentrationRisk,
      settlementRisk,
      liquidityRisk,
      counterpartyRisk,
      contagionRisk,
      topRisks,
      recommendedActions,
    };

    this.riskSnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.riskSnapshots.length > 100) {
      this.riskSnapshots.shift();
    }

    if (overallRiskScore > 66) {
      this.emitEvent('critical', 'audit_module', 'Critical systemic risk detected', {
        overallRiskScore,
        marketRegime,
        topRisks,
      });
    } else if (overallRiskScore > 33) {
      this.emitEvent('warning', 'audit_module', 'Elevated systemic risk', {
        overallRiskScore,
        marketRegime,
      });
    }

    return snapshot;
  }

  listSystemicRiskSnapshots(): SystemicRiskSnapshot[] {
    return [...this.riskSnapshots];
  }

  // ============================================================================
  // Reports
  // ============================================================================

  generateReport(
    reportType: ClearingReport['reportType'],
    period: ReportPeriod
  ): ClearingReport {
    const entriesInPeriod = this.listAuditEntries({
      fromDate: period.from,
      toDate: period.to,
    });

    const tradeEntries = entriesInPeriod.filter(e => e.category === 'trade');
    const settlementEntries = entriesInPeriod.filter(e => e.category === 'settlement');
    const defaultEntries = entriesInPeriod.filter(e => e.category === 'default');

    const latestRiskSnapshot = this.riskSnapshots[this.riskSnapshots.length - 1];

    const summary: ClearingReportSummary = {
      totalTrades: tradeEntries.length,
      settledTrades: settlementEntries.filter(e => e.eventType === 'settlement_completed').length,
      failedTrades: settlementEntries.filter(e => e.eventType === 'settlement_failed').length,
      totalNotional: tradeEntries.reduce(
        (sum, e) => sum + ((e.details?.notionalValue as number) ?? 0),
        0
      ),
      netExposure: 0, // Would be populated from live data
      collateralMobilized: 0, // Would be populated from collateral manager
      defaultEvents: defaultEntries.length,
      insurancePaid: defaultEntries.reduce(
        (sum, e) => sum + ((e.details?.insurancePaid as number) ?? 0),
        0
      ),
      systemicRiskScore: latestRiskSnapshot?.overallRiskScore ?? 0,
    };

    const report: ClearingReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportType,
      period,
      generatedAt: new Date(),
      summary,
      details: {
        auditEntryCount: entriesInPeriod.length,
        reportingFrameworks: this.config.complianceFrameworks,
        retentionDays: this.config.retentionDays,
      },
    };

    this.reports.set(report.id, report);

    this.createAuditEntry({
      category: 'compliance',
      eventType: 'audit_entry_created',
      actor: 'system',
      actorType: 'system',
      action: 'generate_report',
      resourceType: 'report',
      resourceId: report.id,
      details: {
        reportType,
        period,
        summary,
      },
      outcome: 'success',
    });

    return report;
  }

  getReport(reportId: string): ClearingReport | undefined {
    return this.reports.get(reportId);
  }

  listReports(reportType?: ClearingReport['reportType']): ClearingReport[] {
    let list = Array.from(this.reports.values());

    if (reportType) {
      list = list.filter(r => r.reportType === reportType);
    }

    return list.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: ClearingHouseEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private computeSignature(entry: ClearingAuditEntry): string {
    // Simple deterministic hash for tamper detection
    // In production, this would use a proper cryptographic hash (e.g., SHA-256)
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      category: entry.category,
      eventType: entry.eventType,
      actor: entry.actor,
      action: entry.action,
      outcome: entry.outcome,
    });

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `sig_${Math.abs(hash).toString(16)}`;
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: ClearingHouseEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'audit_entry_created',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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

export function createClearingAuditModule(
  config?: Partial<AuditConfig>
): DefaultClearingAuditModule {
  return new DefaultClearingAuditModule(config);
}

// Re-export for convenience
export type { ParticipantRiskSummary, ParticipantType, DefaultStatus };
