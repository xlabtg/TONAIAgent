/**
 * TONAIAgent - AGFN Global Stability Dashboard
 *
 * Provides public-facing stability metrics for the Autonomous Global Financial Network,
 * including global exposure, regional capital allocation, liquidity depth, leverage,
 * and an overall stability index. Tracks historical metrics and generates alerts.
 *
 * This is Component 6 of the Autonomous Global Financial Network (AGFN).
 */

import {
  GlobalStabilitySnapshot,
  RegionalCapitalAllocation,
  JurisdictionLiquidityMetric,
  StabilityRiskFactor,
  DashboardMetricHistory,
  MetricDataPoint,
  StabilityIndicator,
  JurisdictionCode,
  GlobalStabilityDashboardConfig,
  AGFNEvent,
  AGFNEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_STABILITY_DASHBOARD_CONFIG: GlobalStabilityDashboardConfig = {
  enablePublicMetrics: true,
  snapshotIntervalMs: 300_000, // 5 minutes
  historyRetentionDays: 90, // 90-day history
  alertOnStabilityBelow: 50, // Alert if stability index drops below 50
  alertOnConcentrationAbove: 75, // Alert if concentration risk > 75
  enableRealTimeUpdates: true,
};

// ============================================================================
// Global Stability Dashboard Interface
// ============================================================================

export interface GlobalStabilityDashboard {
  readonly config: GlobalStabilityDashboardConfig;

  // Snapshot Management
  recordSnapshot(params: RecordSnapshotParams): GlobalStabilitySnapshot;
  getSnapshot(id: string): GlobalStabilitySnapshot | undefined;
  listSnapshots(filters?: SnapshotFilters): GlobalStabilitySnapshot[];
  getLatestSnapshot(): GlobalStabilitySnapshot | undefined;

  // Metric History
  recordMetricDataPoint(metricName: string, value: number): void;
  getMetricHistory(metricName: string): DashboardMetricHistory | undefined;
  listTrackedMetrics(): string[];
  clearOldMetricHistory(olderThanDays: number): number; // Returns count deleted

  // Alerts
  getActiveAlerts(): StabilityAlert[];
  acknowledgeAlert(alertId: string): StabilityAlert;
  dismissAlert(alertId: string): void;

  // Public Metrics
  getPublicMetricsSummary(): PublicMetricsSummary;
  getRegionalAllocationBreakdown(): RegionalAllocationBreakdown;
  getLiquidityDepthReport(): LiquidityDepthReport;
  getStabilityTrend(days: number): StabilityTrend;

  // Events
  onEvent(callback: AGFNEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RecordSnapshotParams {
  totalNetworkNodes: number;
  activeNodes: number;
  networkUptimePercent: number;
  totalGlobalExposureUSD: number;
  crossBorderExposureUSD: number;
  concentrationRiskScore: number;
  regionalCapitalAllocation: RegionalCapitalAllocation[];
  totalLiquidityUSD: number;
  liquidityDepthScore: number;
  liquidityByJurisdiction?: JurisdictionLiquidityMetric[];
  averageNetworkLeverage: number;
  maxNodeLeverage: number;
  leverageRiskScore: number;
  riskFactors?: StabilityRiskFactor[];
}

export interface SnapshotFilters {
  from?: Date;
  to?: Date;
  stabilityIndicator?: StabilityIndicator;
  minStabilityIndex?: number;
  maxStabilityIndex?: number;
}

export interface StabilityAlert {
  id: string;
  alertType: 'stability_low' | 'concentration_high' | 'liquidity_critical' | 'leverage_high' | 'node_offline';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  jurisdiction?: JurisdictionCode;
  createdAt: Date;
  acknowledgedAt?: Date;
  status: 'active' | 'acknowledged' | 'dismissed';
}

export interface PublicMetricsSummary {
  stabilityIndex: number;
  stabilityIndicator: StabilityIndicator;
  totalLiquidityUSD: number;
  totalExposureUSD: number;
  activeNodes: number;
  networkUptimePercent: number;
  concentrationRiskScore: number;
  leverageRiskScore: number;
  activeAlerts: number;
  snapshotAge: number; // Seconds since last snapshot
  generatedAt: Date;
}

export interface RegionalAllocationBreakdown {
  regions: RegionalCapitalAllocation[];
  totalCapitalAllocatedUSD: number;
  mostConcentratedRegion: string;
  mostDiversifiedRegion: string;
  herfindahlIndex: number; // Market concentration index 0-1
  generatedAt: Date;
}

export interface LiquidityDepthReport {
  totalLiquidityUSD: number;
  liquidityDepthScore: number;
  byJurisdiction: JurisdictionLiquidityMetric[];
  deepLiquidityJurisdictions: number;
  criticalLiquidityJurisdictions: number;
  averageUtilizationPercent: number;
  generatedAt: Date;
}

export interface StabilityTrend {
  period: number; // Days
  dataPoints: Array<{ timestamp: Date; stabilityIndex: number; indicator: StabilityIndicator }>;
  averageStabilityIndex: number;
  minStabilityIndex: number;
  maxStabilityIndex: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  volatility: number; // Standard deviation of stability index
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGlobalStabilityDashboard implements GlobalStabilityDashboard {
  readonly config: GlobalStabilityDashboardConfig;

  private readonly snapshots = new Map<string, GlobalStabilitySnapshot>();
  private readonly metricHistories = new Map<string, DashboardMetricHistory>();
  private readonly alerts = new Map<string, StabilityAlert>();
  private readonly eventCallbacks: AGFNEventCallback[] = [];
  private idCounter = 0;
  private latestSnapshotId: string | undefined;

  constructor(config?: Partial<GlobalStabilityDashboardConfig>) {
    this.config = { ...DEFAULT_STABILITY_DASHBOARD_CONFIG, ...config };
  }

  // ============================================================================
  // Snapshot Management
  // ============================================================================

  recordSnapshot(params: RecordSnapshotParams): GlobalStabilitySnapshot {
    // Calculate stability index (0-100) based on multiple factors
    const networkHealthScore = params.totalNetworkNodes > 0
      ? (params.activeNodes / params.totalNetworkNodes) * 100
      : 0;
    const uptimeScore = params.networkUptimePercent;
    const concentrationScore = 100 - params.concentrationRiskScore;
    const liquidityScore = params.liquidityDepthScore;
    const leverageScore = 100 - params.leverageRiskScore;

    const stabilityIndex = Math.round(
      networkHealthScore * 0.2 +
      uptimeScore * 0.2 +
      concentrationScore * 0.2 +
      liquidityScore * 0.2 +
      leverageScore * 0.2
    );

    const stabilityIndicator: StabilityIndicator =
      stabilityIndex >= 80 ? 'stable' :
      stabilityIndex >= 65 ? 'watch' :
      stabilityIndex >= 50 ? 'stressed' :
      stabilityIndex >= 30 ? 'critical' : 'crisis';

    const snapshot: GlobalStabilitySnapshot = {
      id: this.generateId('snapshot'),
      timestamp: new Date(),
      totalNetworkNodes: params.totalNetworkNodes,
      activeNodes: params.activeNodes,
      networkUptimePercent: params.networkUptimePercent,
      totalGlobalExposureUSD: params.totalGlobalExposureUSD,
      crossBorderExposureUSD: params.crossBorderExposureUSD,
      concentrationRiskScore: params.concentrationRiskScore,
      regionalCapitalAllocation: params.regionalCapitalAllocation,
      totalLiquidityUSD: params.totalLiquidityUSD,
      liquidityDepthScore: params.liquidityDepthScore,
      liquidityByJurisdiction: params.liquidityByJurisdiction ?? [],
      averageNetworkLeverage: params.averageNetworkLeverage,
      maxNodeLeverage: params.maxNodeLeverage,
      leverageRiskScore: params.leverageRiskScore,
      stabilityIndex,
      stabilityIndicator,
      riskFactors: params.riskFactors ?? [],
      generatedAt: new Date(),
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.latestSnapshotId = snapshot.id;

    // Record metric data points
    this.recordMetricDataPoint('stabilityIndex', stabilityIndex);
    this.recordMetricDataPoint('totalLiquidityUSD', params.totalLiquidityUSD);
    this.recordMetricDataPoint('concentrationRisk', params.concentrationRiskScore);
    this.recordMetricDataPoint('leverageRisk', params.leverageRiskScore);

    // Check for alerts
    this.checkAndCreateAlerts(snapshot);

    return snapshot;
  }

  getSnapshot(id: string): GlobalStabilitySnapshot | undefined {
    return this.snapshots.get(id);
  }

  listSnapshots(filters?: SnapshotFilters): GlobalStabilitySnapshot[] {
    let results = Array.from(this.snapshots.values());

    if (filters?.from) results = results.filter(s => s.timestamp >= filters.from!);
    if (filters?.to) results = results.filter(s => s.timestamp <= filters.to!);
    if (filters?.stabilityIndicator) results = results.filter(s => s.stabilityIndicator === filters.stabilityIndicator);
    if (filters?.minStabilityIndex !== undefined) results = results.filter(s => s.stabilityIndex >= filters.minStabilityIndex!);
    if (filters?.maxStabilityIndex !== undefined) results = results.filter(s => s.stabilityIndex <= filters.maxStabilityIndex!);

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLatestSnapshot(): GlobalStabilitySnapshot | undefined {
    if (!this.latestSnapshotId) return undefined;
    return this.snapshots.get(this.latestSnapshotId);
  }

  // ============================================================================
  // Metric History
  // ============================================================================

  recordMetricDataPoint(metricName: string, value: number): void {
    const existing = this.metricHistories.get(metricName);
    const dataPoint: MetricDataPoint = { timestamp: new Date(), value };

    if (existing) {
      existing.dataPoints.push(dataPoint);

      // Update trend
      const recentPoints = existing.dataPoints.slice(-10);
      if (recentPoints.length >= 2) {
        const firstAvg = recentPoints.slice(0, 5).reduce((sum, p) => sum + p.value, 0) / Math.min(5, recentPoints.length);
        const lastAvg = recentPoints.slice(-5).reduce((sum, p) => sum + p.value, 0) / Math.min(5, recentPoints.length);
        existing.trend = lastAvg > firstAvg + 2 ? 'improving' :
                         lastAvg < firstAvg - 2 ? 'deteriorating' : 'stable';
      }
    } else {
      this.metricHistories.set(metricName, {
        metricName,
        dataPoints: [dataPoint],
        trend: 'stable',
      });
    }
  }

  getMetricHistory(metricName: string): DashboardMetricHistory | undefined {
    return this.metricHistories.get(metricName);
  }

  listTrackedMetrics(): string[] {
    return Array.from(this.metricHistories.keys());
  }

  clearOldMetricHistory(olderThanDays: number): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [metricName, history] of this.metricHistories.entries()) {
      const before = history.dataPoints.length;
      history.dataPoints = history.dataPoints.filter(p => p.timestamp >= cutoffDate);
      deletedCount += before - history.dataPoints.length;

      if (history.dataPoints.length === 0) {
        this.metricHistories.delete(metricName);
      }
    }

    return deletedCount;
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  private checkAndCreateAlerts(snapshot: GlobalStabilitySnapshot): void {
    // Check stability
    if (snapshot.stabilityIndex < this.config.alertOnStabilityBelow) {
      const alertId = this.generateId('alert');
      const alert: StabilityAlert = {
        id: alertId,
        alertType: 'stability_low',
        severity: snapshot.stabilityIndex < 30 ? 'critical' : 'warning',
        message: `Global stability index dropped to ${snapshot.stabilityIndex} (threshold: ${this.config.alertOnStabilityBelow})`,
        metric: 'stabilityIndex',
        currentValue: snapshot.stabilityIndex,
        thresholdValue: this.config.alertOnStabilityBelow,
        createdAt: new Date(),
        status: 'active',
      };
      this.alerts.set(alertId, alert);

      this.emitEvent({
        id: this.generateId('evt'),
        type: 'stability_alert',
        severity: alert.severity,
        source: 'GlobalStabilityDashboard',
        message: alert.message,
        data: { alertId, stabilityIndex: snapshot.stabilityIndex },
        timestamp: new Date(),
      });
    }

    // Check concentration
    if (snapshot.concentrationRiskScore > this.config.alertOnConcentrationAbove) {
      const alertId = this.generateId('alert');
      const alert: StabilityAlert = {
        id: alertId,
        alertType: 'concentration_high',
        severity: 'warning',
        message: `Concentration risk score elevated: ${snapshot.concentrationRiskScore} (threshold: ${this.config.alertOnConcentrationAbove})`,
        metric: 'concentrationRisk',
        currentValue: snapshot.concentrationRiskScore,
        thresholdValue: this.config.alertOnConcentrationAbove,
        createdAt: new Date(),
        status: 'active',
      };
      this.alerts.set(alertId, alert);
    }
  }

  getActiveAlerts(): StabilityAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active');
  }

  acknowledgeAlert(alertId: string): StabilityAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert not found: ${alertId}`);

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    return alert;
  }

  dismissAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error(`Alert not found: ${alertId}`);

    alert.status = 'dismissed';
    this.alerts.delete(alertId);
  }

  // ============================================================================
  // Public Metrics
  // ============================================================================

  getPublicMetricsSummary(): PublicMetricsSummary {
    const latest = this.getLatestSnapshot();
    const snapshotAge = latest
      ? Math.round((Date.now() - latest.generatedAt.getTime()) / 1000)
      : -1;

    return {
      stabilityIndex: latest?.stabilityIndex ?? 100,
      stabilityIndicator: latest?.stabilityIndicator ?? 'stable',
      totalLiquidityUSD: latest?.totalLiquidityUSD ?? 0,
      totalExposureUSD: latest?.totalGlobalExposureUSD ?? 0,
      activeNodes: latest?.activeNodes ?? 0,
      networkUptimePercent: latest?.networkUptimePercent ?? 100,
      concentrationRiskScore: latest?.concentrationRiskScore ?? 0,
      leverageRiskScore: latest?.leverageRiskScore ?? 0,
      activeAlerts: this.getActiveAlerts().length,
      snapshotAge,
      generatedAt: new Date(),
    };
  }

  getRegionalAllocationBreakdown(): RegionalAllocationBreakdown {
    const latest = this.getLatestSnapshot();
    const regions = latest?.regionalCapitalAllocation ?? [];

    const totalCapitalAllocatedUSD = regions.reduce((sum, r) => sum + r.capitalAllocatedUSD, 0);

    // Herfindahl-Hirschman Index for concentration
    const herfindahlIndex = totalCapitalAllocatedUSD > 0
      ? regions.reduce((sum, r) => {
          const share = r.capitalAllocatedUSD / totalCapitalAllocatedUSD;
          return sum + share * share;
        }, 0)
      : 0;

    const sortedBySize = [...regions].sort((a, b) => b.capitalAllocatedUSD - a.capitalAllocatedUSD);
    const sortedByStability = [...regions].sort((a, b) => b.stabilityScore - a.stabilityScore);

    return {
      regions,
      totalCapitalAllocatedUSD,
      mostConcentratedRegion: sortedBySize[0]?.region ?? 'N/A',
      mostDiversifiedRegion: sortedByStability[sortedByStability.length - 1]?.region ?? 'N/A',
      herfindahlIndex,
      generatedAt: new Date(),
    };
  }

  getLiquidityDepthReport(): LiquidityDepthReport {
    const latest = this.getLatestSnapshot();
    const byJurisdiction = latest?.liquidityByJurisdiction ?? [];

    const deepLiquidityJurisdictions = byJurisdiction.filter(j => j.liquidityDepth === 'deep').length;
    const criticalLiquidityJurisdictions = byJurisdiction.filter(j => j.liquidityDepth === 'critical').length;

    const averageUtilizationPercent = byJurisdiction.length > 0
      ? byJurisdiction.reduce((sum, j) => sum + j.utilizationPercent, 0) / byJurisdiction.length
      : 0;

    return {
      totalLiquidityUSD: latest?.totalLiquidityUSD ?? 0,
      liquidityDepthScore: latest?.liquidityDepthScore ?? 100,
      byJurisdiction,
      deepLiquidityJurisdictions,
      criticalLiquidityJurisdictions,
      averageUtilizationPercent,
      generatedAt: new Date(),
    };
  }

  getStabilityTrend(days: number): StabilityTrend {
    const history = this.getMetricHistory('stabilityIndex');
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const dataPoints = (history?.dataPoints ?? [])
      .filter(p => p.timestamp >= cutoffDate)
      .map(p => ({
        timestamp: p.timestamp,
        stabilityIndex: p.value,
        indicator: this.valueToIndicator(p.value),
      }));

    const values = dataPoints.map(p => p.stabilityIndex);
    const averageStabilityIndex = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 100;
    const minStabilityIndex = values.length > 0 ? Math.min(...values) : 100;
    const maxStabilityIndex = values.length > 0 ? Math.max(...values) : 100;

    const variance = values.length > 0
      ? values.reduce((sum, v) => sum + Math.pow(v - averageStabilityIndex, 2), 0) / values.length
      : 0;
    const volatility = Math.sqrt(variance);

    const trend: StabilityTrend['trend'] = history?.trend ?? 'stable';

    return {
      period: days,
      dataPoints,
      averageStabilityIndex,
      minStabilityIndex,
      maxStabilityIndex,
      trend,
      volatility,
    };
  }

  private valueToIndicator(value: number): StabilityIndicator {
    if (value >= 80) return 'stable';
    if (value >= 65) return 'watch';
    if (value >= 50) return 'stressed';
    if (value >= 30) return 'critical';
    return 'crisis';
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFNEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFNEvent): void {
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

export function createGlobalStabilityDashboard(
  config?: Partial<GlobalStabilityDashboardConfig>
): DefaultGlobalStabilityDashboard {
  return new DefaultGlobalStabilityDashboard(config);
}

export default DefaultGlobalStabilityDashboard;
