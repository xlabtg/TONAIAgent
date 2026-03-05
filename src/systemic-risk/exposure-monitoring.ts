/**
 * Global Exposure Monitoring Engine
 * Real-time cross-fund/agent/asset tracking, heat maps,
 * concentration alerts, and risk clustering detection.
 */

import {
  type FundId,
  type AgentId,
  type AssetId,
  type AssetExposure,
  type FundSystemicExposure,
  type AgentSystemicExposure,
  type ExposureHeatMap,
  type ConcentrationAlert,
  type RiskCluster,
  type RiskHeatLevel,
  type ExposureMonitoringConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FundExposureInput {
  fundId: FundId;
  agentPositions: Array<{
    agentId: AgentId;
    assetId: AssetId;
    value: number;
    leverage: number;
  }>;
}

export interface GlobalExposureMonitor {
  updateFundExposure(input: FundExposureInput): void;
  removeFund(fundId: FundId): void;
  getHeatMap(): ExposureHeatMap;
  getAssetExposure(assetId: AssetId): AssetExposure | undefined;
  getFundExposure(fundId: FundId): FundSystemicExposure | undefined;
  getAgentExposure(agentId: AgentId): AgentSystemicExposure | undefined;
  getConcentrationAlerts(): ConcentrationAlert[];
  getRiskClusters(): RiskCluster[];
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_EXPOSURE_CONFIG: ExposureMonitoringConfig = {
  concentrationWarnThreshold: 0.20,
  concentrationCriticalThreshold: 0.30,
  correlationClusterThreshold: 0.70,
  updateIntervalMs: 5000,
};

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultGlobalExposureMonitor implements GlobalExposureMonitor {
  private readonly config: ExposureMonitoringConfig;
  private fundInputs: Map<FundId, FundExposureInput> = new Map();
  private eventCallbacks: SystemicRiskEventCallback[] = [];
  private alertIdCounter = 0;
  private clusterIdCounter = 0;

  constructor(config?: Partial<ExposureMonitoringConfig>) {
    this.config = { ...DEFAULT_EXPOSURE_CONFIG, ...config };
  }

  updateFundExposure(input: FundExposureInput): void {
    this.fundInputs.set(input.fundId, input);
    // Re-check concentration after update
    const alerts = this.computeConcentrationAlerts(this.buildAssetExposures());
    for (const alert of alerts) {
      this.emit({
        type: 'concentration_alert',
        timestamp: Date.now(),
        payload: alert,
      });
    }
  }

  removeFund(fundId: FundId): void {
    this.fundInputs.delete(fundId);
  }

  getHeatMap(): ExposureHeatMap {
    const assetExposures = this.buildAssetExposures();
    const fundExposures = this.buildFundExposures();
    const agentExposures = this.buildAgentExposures();
    const concentrationAlerts = this.computeConcentrationAlerts(assetExposures);
    const riskClusters = this.computeRiskClusters(assetExposures);

    const totalSystemExposure = assetExposures.reduce((s, a) => s + a.totalValue, 0);
    const overallHeatLevel = this.computeOverallHeatLevel(concentrationAlerts, riskClusters);

    return {
      timestamp: Date.now(),
      totalSystemExposure,
      topAssets: assetExposures.slice().sort((a, b) => b.totalValue - a.totalValue).slice(0, 10),
      fundExposures,
      agentExposures,
      concentrationAlerts,
      riskClusters,
      overallHeatLevel,
    };
  }

  getAssetExposure(assetId: AssetId): AssetExposure | undefined {
    return this.buildAssetExposures().find(a => a.assetId === assetId);
  }

  getFundExposure(fundId: FundId): FundSystemicExposure | undefined {
    return this.buildFundExposures().find(f => f.fundId === fundId);
  }

  getAgentExposure(agentId: AgentId): AgentSystemicExposure | undefined {
    return this.buildAgentExposures().find(a => a.agentId === agentId);
  }

  getConcentrationAlerts(): ConcentrationAlert[] {
    return this.computeConcentrationAlerts(this.buildAssetExposures());
  }

  getRiskClusters(): RiskCluster[] {
    return this.computeRiskClusters(this.buildAssetExposures());
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private buildAssetExposures(): AssetExposure[] {
    const assetMap = new Map<
      AssetId,
      { totalValue: number; fundBreakdown: Record<FundId, number>; agentBreakdown: Record<AgentId, number> }
    >();

    let grandTotal = 0;

    for (const input of this.fundInputs.values()) {
      for (const pos of input.agentPositions) {
        const notional = pos.value * pos.leverage;
        grandTotal += notional;

        if (!assetMap.has(pos.assetId)) {
          assetMap.set(pos.assetId, { totalValue: 0, fundBreakdown: {}, agentBreakdown: {} });
        }
        const entry = assetMap.get(pos.assetId)!;
        entry.totalValue += notional;
        entry.fundBreakdown[input.fundId] = (entry.fundBreakdown[input.fundId] ?? 0) + notional;
        entry.agentBreakdown[pos.agentId] = (entry.agentBreakdown[pos.agentId] ?? 0) + notional;
      }
    }

    return Array.from(assetMap.entries()).map(([assetId, data]) => {
      const concentrationPct = grandTotal > 0 ? data.totalValue / grandTotal : 0;
      return {
        assetId,
        totalValue: data.totalValue,
        fundBreakdown: data.fundBreakdown,
        agentBreakdown: data.agentBreakdown,
        concentrationPct,
        heatLevel: this.concentrationToHeatLevel(concentrationPct),
      };
    });
  }

  private buildFundExposures(): FundSystemicExposure[] {
    const allAssets = this.buildAssetExposures();
    const grandTotal = allAssets.reduce((s, a) => s + a.totalValue, 0);

    return Array.from(this.fundInputs.values()).map(input => {
      let totalExposure = 0;
      let totalLeveragedValue = 0;
      let totalBaseValue = 0;
      const assetTotals = new Map<AssetId, number>();

      for (const pos of input.agentPositions) {
        const notional = pos.value * pos.leverage;
        totalExposure += notional;
        totalLeveragedValue += notional;
        totalBaseValue += pos.value;
        assetTotals.set(pos.assetId, (assetTotals.get(pos.assetId) ?? 0) + notional);
      }

      const leverageRatio = totalBaseValue > 0 ? totalLeveragedValue / totalBaseValue : 1;
      const correlationWithSystem = grandTotal > 0 ? totalExposure / grandTotal : 0;

      const topAssets = Array.from(assetTotals.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([assetId, value]) => ({
          assetId,
          value,
          pct: totalExposure > 0 ? value / totalExposure : 0,
        }));

      const concentrationPct = grandTotal > 0 ? totalExposure / grandTotal : 0;

      return {
        fundId: input.fundId,
        totalExposure,
        leverageRatio,
        topAssets,
        heatLevel: this.concentrationToHeatLevel(concentrationPct),
        correlationWithSystem,
      };
    });
  }

  private buildAgentExposures(): AgentSystemicExposure[] {
    const allAssets = this.buildAssetExposures();
    const grandTotal = allAssets.reduce((s, a) => s + a.totalValue, 0);

    const agentMap = new Map<
      AgentId,
      { fundId: FundId; totalExposure: number; totalBase: number }
    >();

    for (const input of this.fundInputs.values()) {
      for (const pos of input.agentPositions) {
        const notional = pos.value * pos.leverage;
        if (!agentMap.has(pos.agentId)) {
          agentMap.set(pos.agentId, { fundId: input.fundId, totalExposure: 0, totalBase: 0 });
        }
        const entry = agentMap.get(pos.agentId)!;
        entry.totalExposure += notional;
        entry.totalBase += pos.value;
      }
    }

    return Array.from(agentMap.entries()).map(([agentId, data]) => {
      const riskContributionPct = grandTotal > 0 ? data.totalExposure / grandTotal : 0;
      const leverageRatio = data.totalBase > 0 ? data.totalExposure / data.totalBase : 1;
      return {
        agentId,
        fundId: data.fundId,
        totalExposure: data.totalExposure,
        leverageRatio,
        riskContributionPct,
        heatLevel: this.concentrationToHeatLevel(riskContributionPct),
      };
    });
  }

  private computeConcentrationAlerts(assetExposures: AssetExposure[]): ConcentrationAlert[] {
    const alerts: ConcentrationAlert[] = [];

    for (const asset of assetExposures) {
      if (asset.concentrationPct >= this.config.concentrationCriticalThreshold) {
        alerts.push({
          id: `alert-${++this.alertIdCounter}`,
          category: 'asset',
          entityId: asset.assetId,
          concentrationPct: asset.concentrationPct,
          threshold: this.config.concentrationCriticalThreshold,
          severity: 'critical',
          message: `Asset ${asset.assetId} concentration at ${(asset.concentrationPct * 100).toFixed(1)}% — exceeds critical threshold`,
          timestamp: Date.now(),
        });
      } else if (asset.concentrationPct >= this.config.concentrationWarnThreshold) {
        alerts.push({
          id: `alert-${++this.alertIdCounter}`,
          category: 'asset',
          entityId: asset.assetId,
          concentrationPct: asset.concentrationPct,
          threshold: this.config.concentrationWarnThreshold,
          severity: 'warning',
          message: `Asset ${asset.assetId} concentration at ${(asset.concentrationPct * 100).toFixed(1)}% — above warning threshold`,
          timestamp: Date.now(),
        });
      }
    }

    return alerts;
  }

  private computeRiskClusters(assetExposures: AssetExposure[]): RiskCluster[] {
    const clusters: RiskCluster[] = [];

    // Simple cluster detection: group assets with overlapping fund exposure
    const assetsByFund = new Map<FundId, AssetId[]>();
    for (const asset of assetExposures) {
      for (const fundId of Object.keys(asset.fundBreakdown)) {
        if (!assetsByFund.has(fundId)) assetsByFund.set(fundId, []);
        assetsByFund.get(fundId)!.push(asset.assetId);
      }
    }

    for (const [fundId, assets] of assetsByFund.entries()) {
      if (assets.length >= 2) {
        const combinedExposure = assets.reduce((s, assetId) => {
          const asset = assetExposures.find(a => a.assetId === assetId);
          return s + (asset?.fundBreakdown[fundId] ?? 0);
        }, 0);

        const totalSystem = assetExposures.reduce((s, a) => s + a.totalValue, 0);
        const systemicContrib = totalSystem > 0 ? combinedExposure / totalSystem : 0;

        if (systemicContrib >= this.config.correlationClusterThreshold * 0.1) {
          clusters.push({
            id: `cluster-${++this.clusterIdCounter}`,
            label: `Fund ${fundId} co-exposure cluster`,
            entities: assets,
            correlationScore: Math.min(1, systemicContrib * 3),
            combinedExposure,
            systemicRiskContribution: systemicContrib,
          });
        }
      }
    }

    return clusters;
  }

  private concentrationToHeatLevel(pct: number): RiskHeatLevel {
    if (pct >= 0.40) return 'critical';
    if (pct >= 0.30) return 'high';
    if (pct >= 0.20) return 'elevated';
    if (pct >= 0.10) return 'moderate';
    return 'low';
  }

  private computeOverallHeatLevel(
    alerts: ConcentrationAlert[],
    clusters: RiskCluster[],
  ): RiskHeatLevel {
    if (alerts.some(a => a.severity === 'critical')) return 'critical';
    if (clusters.some(c => c.correlationScore >= this.config.correlationClusterThreshold)) return 'high';
    if (alerts.some(a => a.severity === 'warning')) return 'elevated';
    if (clusters.length > 0) return 'moderate';
    return 'low';
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createGlobalExposureMonitor(
  config?: Partial<ExposureMonitoringConfig>,
): GlobalExposureMonitor {
  return new DefaultGlobalExposureMonitor(config);
}
