/**
 * SDACL Component 5 — Sovereign Transparency Dashboard
 *
 * Configurable visibility for exposure metrics, liquidity depth,
 * treasury allocation, risk index, and compliance reporting.
 *
 * Supports observer mode, allocator mode, and strategic partner mode.
 */

import {
  TransparencyMode,
  ExposureMetric,
  ComplianceReport,
  DashboardSnapshot,
  DashboardAlert,
  SovereignTransparencyStatus,
  RiskLevel,
  SovereignAssetId,
  JurisdictionCode,
  ReportId,
  SDACLEvent,
  SDACLEventCallback,
} from './types';

// ============================================================================
// Sovereign Transparency Dashboard Interface
// ============================================================================

export interface SovereignTransparencyManager {
  // Dashboard configuration
  setTransparencyMode(mode: TransparencyMode): void;
  getTransparencyMode(): TransparencyMode;

  // Exposure metrics
  recordExposureMetric(params: RecordExposureParams): ExposureMetric;
  getExposureMetric(jurisdictionCode: JurisdictionCode, assetId: SovereignAssetId): ExposureMetric | undefined;
  listExposureMetrics(filters?: ExposureFilters): ExposureMetric[];
  calculateTotalExposure(): number;
  calculateConcentrationRisk(jurisdictionCode: JurisdictionCode): RiskLevel;

  // Compliance reporting
  generateComplianceReport(params: GenerateReportParams): ComplianceReport;
  getComplianceReport(reportId: ReportId): ComplianceReport | undefined;
  listComplianceReports(filters?: ComplianceReportFilters): ComplianceReport[];

  // Dashboard snapshots
  generateDashboardSnapshot(): DashboardSnapshot;
  getLatestSnapshot(): DashboardSnapshot | undefined;

  // Alerts
  raiseAlert(params: RaiseAlertParams): DashboardAlert;
  acknowledgeAlert(alertId: string): void;
  resolveAlert(alertId: string): void;
  listAlerts(filters?: AlertFilters): DashboardAlert[];
  getUnresolvedAlerts(): DashboardAlert[];
  getCriticalAlerts(): DashboardAlert[];

  // Stability monitoring
  computeStabilityScore(): number;
  computeOverallRiskIndex(): number;

  getComponentStatus(): SovereignTransparencyStatus;
  onEvent(callback: SDACLEventCallback): void;
}

export interface RecordExposureParams {
  jurisdictionCode: JurisdictionCode;
  assetId: SovereignAssetId;
  exposureUsd: number;
  liquidityDepthUsd: number;
  riskIndex?: number;
}

export interface ExposureFilters {
  jurisdictionCode?: JurisdictionCode;
  assetId?: SovereignAssetId;
  minExposureUsd?: number;
  concentrationRisk?: RiskLevel;
}

export interface GenerateReportParams {
  jurisdictionCode: JurisdictionCode;
  periodFrom: Date;
  periodTo: Date;
  totalTransactions: number;
  compliantTransactions: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  enforcementActions: number;
}

export interface ComplianceReportFilters {
  jurisdictionCode?: JurisdictionCode;
  fromDate?: Date;
  toDate?: Date;
}

export interface RaiseAlertParams {
  severity: DashboardAlert['severity'];
  category: DashboardAlert['category'];
  message: string;
  jurisdictionCode?: JurisdictionCode;
  assetId?: SovereignAssetId;
}

export interface AlertFilters {
  severity?: DashboardAlert['severity'];
  category?: DashboardAlert['category'];
  jurisdictionCode?: JurisdictionCode;
  acknowledged?: boolean;
}

// ============================================================================
// Default Sovereign Transparency Manager
// ============================================================================

export class DefaultSovereignTransparencyManager implements SovereignTransparencyManager {
  private transparencyMode: TransparencyMode = 'observer';
  private readonly exposureMetrics: Map<string, ExposureMetric> = new Map();
  private readonly complianceReports: Map<ReportId, ComplianceReport> = new Map();
  private readonly alerts: Map<string, DashboardAlert> = new Map();
  private readonly snapshots: DashboardSnapshot[] = [];
  private readonly eventCallbacks: SDACLEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  private makeExposureKey(jurisdictionCode: JurisdictionCode, assetId: SovereignAssetId): string {
    return `${jurisdictionCode}:${assetId}`;
  }

  setTransparencyMode(mode: TransparencyMode): void {
    this.transparencyMode = mode;
  }

  getTransparencyMode(): TransparencyMode {
    return this.transparencyMode;
  }

  recordExposureMetric(params: RecordExposureParams): ExposureMetric {
    const { jurisdictionCode, assetId, exposureUsd, liquidityDepthUsd, riskIndex } = params;

    const totalExposure = this.calculateTotalExposure();
    const exposurePercent = totalExposure > 0 ? (exposureUsd / (totalExposure + exposureUsd)) * 100 : 100;
    const concentrationRisk = this.determineConcentrationRisk(exposurePercent);

    const metric: ExposureMetric = {
      jurisdictionCode,
      assetId,
      exposureUsd,
      exposurePercent,
      concentrationRisk,
      liquidityDepthUsd,
      riskIndex: riskIndex ?? this.computeRiskIndex(exposurePercent, liquidityDepthUsd),
      lastUpdated: new Date(),
    };

    const key = this.makeExposureKey(jurisdictionCode, assetId);
    this.exposureMetrics.set(key, metric);

    return metric;
  }

  getExposureMetric(jurisdictionCode: JurisdictionCode, assetId: SovereignAssetId): ExposureMetric | undefined {
    const key = this.makeExposureKey(jurisdictionCode, assetId);
    return this.exposureMetrics.get(key);
  }

  listExposureMetrics(filters?: ExposureFilters): ExposureMetric[] {
    let result = Array.from(this.exposureMetrics.values());

    if (filters?.jurisdictionCode) {
      result = result.filter(m => m.jurisdictionCode === filters.jurisdictionCode);
    }
    if (filters?.assetId) {
      result = result.filter(m => m.assetId === filters.assetId);
    }
    if (filters?.minExposureUsd !== undefined) {
      result = result.filter(m => m.exposureUsd >= filters.minExposureUsd!);
    }
    if (filters?.concentrationRisk) {
      result = result.filter(m => m.concentrationRisk === filters.concentrationRisk);
    }

    return result;
  }

  calculateTotalExposure(): number {
    let total = 0;
    for (const metric of this.exposureMetrics.values()) {
      total += metric.exposureUsd;
    }
    return total;
  }

  calculateConcentrationRisk(jurisdictionCode: JurisdictionCode): RiskLevel {
    const metrics = Array.from(this.exposureMetrics.values()).filter(
      m => m.jurisdictionCode === jurisdictionCode
    );

    if (metrics.length === 0) return 'low';

    const totalExposure = this.calculateTotalExposure();
    const jurisdictionExposure = metrics.reduce((sum, m) => sum + m.exposureUsd, 0);
    const exposurePercent = totalExposure > 0 ? (jurisdictionExposure / totalExposure) * 100 : 0;

    return this.determineConcentrationRisk(exposurePercent);
  }

  generateComplianceReport(params: GenerateReportParams): ComplianceReport {
    const {
      jurisdictionCode,
      periodFrom,
      periodTo,
      totalTransactions,
      compliantTransactions,
      flaggedTransactions,
      blockedTransactions,
      enforcementActions,
    } = params;

    const complianceRate = totalTransactions > 0
      ? (compliantTransactions / totalTransactions) * 100
      : 100;

    const report: ComplianceReport = {
      id: this.generateId('compliance_report'),
      reportingPeriod: { from: periodFrom, to: periodTo },
      jurisdictionCode,
      totalTransactions,
      compliantTransactions,
      flaggedTransactions,
      blockedTransactions,
      complianceRate,
      enforcementActions,
      generatedAt: new Date(),
    };

    this.complianceReports.set(report.id, report);

    this.emitEvent('compliance_report_generated', 5, {
      reportId: report.id,
      jurisdictionCode,
      complianceRate,
      totalTransactions,
    });

    return report;
  }

  getComplianceReport(reportId: ReportId): ComplianceReport | undefined {
    return this.complianceReports.get(reportId);
  }

  listComplianceReports(filters?: ComplianceReportFilters): ComplianceReport[] {
    let result = Array.from(this.complianceReports.values());

    if (filters?.jurisdictionCode) {
      result = result.filter(r => r.jurisdictionCode === filters.jurisdictionCode);
    }
    if (filters?.fromDate) {
      result = result.filter(r => r.generatedAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      result = result.filter(r => r.generatedAt <= filters.toDate!);
    }

    return result;
  }

  generateDashboardSnapshot(): DashboardSnapshot {
    const exposureMetrics = Array.from(this.exposureMetrics.values());
    const totalExposureUsd = this.calculateTotalExposure();
    const totalLiquidityDepthUsd = exposureMetrics.reduce((sum, m) => sum + m.liquidityDepthUsd, 0);
    const overallRiskIndex = this.computeOverallRiskIndex();
    const stabilityScore = this.computeStabilityScore();
    const activeJurisdictions = new Set(exposureMetrics.map(m => m.jurisdictionCode)).size;

    // Calculate average compliance rate
    const reports = Array.from(this.complianceReports.values());
    const complianceRate = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.complianceRate, 0) / reports.length
      : 100;

    const recentAlerts = this.getUnresolvedAlerts().slice(0, 10);

    const snapshot: DashboardSnapshot = {
      mode: this.transparencyMode,
      generatedAt: new Date(),
      totalExposureUsd,
      totalLiquidityDepthUsd,
      overallRiskIndex,
      stabilityScore,
      activeJurisdictions,
      complianceRate,
      exposureMetrics,
      recentAlerts,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getLatestSnapshot(): DashboardSnapshot | undefined {
    if (this.snapshots.length === 0) return undefined;
    return this.snapshots[this.snapshots.length - 1];
  }

  raiseAlert(params: RaiseAlertParams): DashboardAlert {
    const alert: DashboardAlert = {
      id: this.generateId('alert'),
      severity: params.severity,
      category: params.category,
      message: params.message,
      jurisdictionCode: params.jurisdictionCode,
      assetId: params.assetId,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent('dashboard_alert_raised', 5, {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
      message: alert.message,
    });

    // Emit stability warning for critical alerts
    if (alert.severity === 'critical' && alert.category === 'systemic') {
      this.emitEvent('stability_warning', 5, {
        alertId: alert.id,
        message: alert.message,
      });
    }

    return alert;
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert ${alertId} not found`);
    this.alerts.set(alertId, { ...alert, acknowledged: true });
  }

  resolveAlert(alertId: string): void {
    if (!this.alerts.has(alertId)) throw new Error(`Alert ${alertId} not found`);
    this.alerts.delete(alertId);
  }

  listAlerts(filters?: AlertFilters): DashboardAlert[] {
    let result = Array.from(this.alerts.values());

    if (filters?.severity) {
      result = result.filter(a => a.severity === filters.severity);
    }
    if (filters?.category) {
      result = result.filter(a => a.category === filters.category);
    }
    if (filters?.jurisdictionCode) {
      result = result.filter(a => a.jurisdictionCode === filters.jurisdictionCode);
    }
    if (filters?.acknowledged !== undefined) {
      result = result.filter(a => a.acknowledged === filters.acknowledged);
    }

    return result;
  }

  getUnresolvedAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values());
  }

  getCriticalAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.severity === 'critical');
  }

  computeStabilityScore(): number {
    const exposureMetrics = Array.from(this.exposureMetrics.values());

    // Base score
    let score = 100;

    // Deduct for critical alerts (always consider alerts even without exposure metrics)
    const criticalAlerts = this.getCriticalAlerts();
    score -= criticalAlerts.length * 10;

    // If no exposure metrics, return score adjusted only for alerts
    if (exposureMetrics.length === 0) {
      return Math.max(0, Math.min(100, score));
    }

    // Deduct for high concentration risk
    const highConcentration = exposureMetrics.filter(m => m.concentrationRisk === 'high' || m.concentrationRisk === 'critical');
    score -= highConcentration.length * 5;

    // Deduct for low liquidity depth ratio
    const totalExposure = this.calculateTotalExposure();
    const totalLiquidity = exposureMetrics.reduce((sum, m) => sum + m.liquidityDepthUsd, 0);
    const liquidityRatio = totalExposure > 0 ? totalLiquidity / totalExposure : 1;
    if (liquidityRatio < 0.5) score -= 15;
    else if (liquidityRatio < 0.8) score -= 8;

    return Math.max(0, Math.min(100, score));
  }

  computeOverallRiskIndex(): number {
    const exposureMetrics = Array.from(this.exposureMetrics.values());
    if (exposureMetrics.length === 0) return 0;

    const totalRiskIndex = exposureMetrics.reduce((sum, m) => sum + m.riskIndex, 0);
    return Math.round(totalRiskIndex / exposureMetrics.length);
  }

  getComponentStatus(): SovereignTransparencyStatus {
    const unresolvedAlerts = this.getUnresolvedAlerts();
    const criticalAlerts = this.getCriticalAlerts();
    const latestSnapshot = this.getLatestSnapshot();

    return {
      totalExposureMetrics: this.exposureMetrics.size,
      totalComplianceReports: this.complianceReports.size,
      unresolvedAlerts: unresolvedAlerts.length,
      criticalAlerts: criticalAlerts.length,
      currentMode: this.transparencyMode,
      lastSnapshotAt: latestSnapshot?.generatedAt,
    };
  }

  onEvent(callback: SDACLEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private determineConcentrationRisk(exposurePercent: number): RiskLevel {
    if (exposurePercent >= 40) return 'critical';
    if (exposurePercent >= 25) return 'high';
    if (exposurePercent >= 15) return 'medium';
    return 'low';
  }

  private computeRiskIndex(exposurePercent: number, liquidityDepthUsd: number): number {
    // Higher exposure percent increases risk
    let riskIndex = exposurePercent * 0.5;

    // Lower liquidity increases risk
    if (liquidityDepthUsd < 1_000_000) riskIndex += 30;
    else if (liquidityDepthUsd < 10_000_000) riskIndex += 20;
    else if (liquidityDepthUsd < 100_000_000) riskIndex += 10;

    return Math.min(100, Math.round(riskIndex));
  }

  private emitEvent(type: SDACLEvent['type'], component: SDACLEvent['component'], data: Record<string, unknown>): void {
    const event: SDACLEvent = { type, component, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createSovereignTransparencyManager(): DefaultSovereignTransparencyManager {
  return new DefaultSovereignTransparencyManager();
}
