/**
 * TONAIAgent - GAEI Global Economic Stability Dashboard
 *
 * Public and institutional views of:
 * - Global capital distribution
 * - Cross-border liquidity
 * - Risk exposure
 * - Leverage concentration
 * - Treasury reserve ratios
 *
 * Promotes:
 * - Transparency
 * - Predictability
 * - Institutional confidence
 */

import {
  EconomicNodeId,
  JurisdictionCode,
  EconomicNodeType,
  EconomicStabilityLevel,
  GlobalEconomicStabilityDashboard,
  GlobalCapitalDistribution,
  RegionalDistribution,
  SectorDistribution,
  NodeTypeDistribution,
  CrossBorderLiquidityMetrics,
  LiquidityCorridor,
  GlobalRiskExposure,
  RiskFactor,
  LeverageConcentrationMetrics,
  LeverageBucket,
  TreasuryReserveRatioMetrics,
  StabilityAlert,
  StabilityTrend,
  StabilityDashboardConfig,
  AlertThreshold,
  GAEIEvent,
  GAEIEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface DashboardDataSources {
  capitalDistribution?: GlobalCapitalDistribution;
  liquidityMetrics?: CrossBorderLiquidityMetrics;
  riskExposure?: GlobalRiskExposure;
  leverageMetrics?: LeverageConcentrationMetrics;
  treasuryMetrics?: TreasuryReserveRatioMetrics;
}

export interface AlertFilters {
  alertType?: StabilityAlert['alertType'];
  category?: string;
  resolved?: boolean;
}

export interface TrendFilters {
  metric?: string;
  direction?: StabilityTrend['direction'];
}

export interface StabilityDashboardLayer {
  // Dashboard Generation
  generateDashboard(dataSources?: DashboardDataSources): GlobalEconomicStabilityDashboard;
  getLatestDashboard(): GlobalEconomicStabilityDashboard | undefined;
  listDashboardSnapshots(limit?: number): GlobalEconomicStabilityDashboard[];

  // Capital Distribution
  computeCapitalDistribution(): GlobalCapitalDistribution;
  getRegionalDistribution(): RegionalDistribution[];
  getSectorDistribution(): SectorDistribution[];
  getNodeTypeDistribution(): NodeTypeDistribution[];

  // Cross-Border Liquidity
  computeLiquidityMetrics(): CrossBorderLiquidityMetrics;
  getTopLiquidityCorridors(limit?: number): LiquidityCorridor[];

  // Risk Exposure
  computeRiskExposure(): GlobalRiskExposure;
  getTopRiskFactors(limit?: number): RiskFactor[];

  // Leverage Monitoring
  computeLeverageMetrics(): LeverageConcentrationMetrics;
  getLeverageDistribution(): LeverageBucket[];

  // Treasury Reserve Ratios
  computeTreasuryMetrics(): TreasuryReserveRatioMetrics;

  // Stability Scoring
  computeStabilityScore(): { score: number; level: EconomicStabilityLevel };
  getStabilityLevel(score: number): EconomicStabilityLevel;

  // Alerts
  createAlert(params: Omit<StabilityAlert, 'id'>): StabilityAlert;
  resolveAlert(alertId: string): StabilityAlert;
  listAlerts(filters?: AlertFilters): StabilityAlert[];

  // Trends
  recordTrend(params: Omit<StabilityTrend, 'direction'>): StabilityTrend;
  listTrends(filters?: TrendFilters): StabilityTrend[];

  // Configuration
  setAlertThreshold(metric: string, thresholds: Omit<AlertThreshold, 'metric'>): void;
  getAlertThresholds(): AlertThreshold[];

  // Layer Status & Events
  getLayerConfig(): StabilityDashboardConfig;
  onEvent(callback: GAEIEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultStabilityDashboardLayer implements StabilityDashboardLayer {
  private readonly dashboardSnapshots: GlobalEconomicStabilityDashboard[] = [];
  private readonly alerts: Map<string, StabilityAlert> = new Map();
  private readonly trends: Map<string, StabilityTrend> = new Map();
  private readonly alertThresholds: Map<string, AlertThreshold> = new Map();
  private readonly eventCallbacks: GAEIEventCallback[] = [];
  private readonly config: StabilityDashboardConfig;

  // Simulated data sources (in production, these would come from other layers)
  private currentCapitalDistribution: GlobalCapitalDistribution | undefined;
  private currentLiquidityMetrics: CrossBorderLiquidityMetrics | undefined;
  private currentRiskExposure: GlobalRiskExposure | undefined;
  private currentLeverageMetrics: LeverageConcentrationMetrics | undefined;
  private currentTreasuryMetrics: TreasuryReserveRatioMetrics | undefined;

  constructor(config?: Partial<StabilityDashboardConfig>) {
    this.config = {
      refreshInterval: 60, // 60 seconds
      alertThresholds: [
        { metric: 'stabilityScore', warningThreshold: 60, criticalThreshold: 40, emergencyThreshold: 20 },
        { metric: 'systemLeverage', warningThreshold: 5, criticalThreshold: 8, emergencyThreshold: 10 },
        { metric: 'reserveRatio', warningThreshold: 0.15, criticalThreshold: 0.10, emergencyThreshold: 0.05 },
      ],
      publicViewEnabled: true,
      institutionalViewEnabled: true,
      granularity: 'hourly',
      ...config,
    };

    // Initialize default alert thresholds
    for (const threshold of this.config.alertThresholds) {
      this.alertThresholds.set(threshold.metric, threshold);
    }
  }

  // ============================================================================
  // Dashboard Generation
  // ============================================================================

  generateDashboard(dataSources?: DashboardDataSources): GlobalEconomicStabilityDashboard {
    // Use provided data sources or compute from current state
    const capitalDistribution = dataSources?.capitalDistribution ?? this.computeCapitalDistribution();
    const liquidityMetrics = dataSources?.liquidityMetrics ?? this.computeLiquidityMetrics();
    const riskExposure = dataSources?.riskExposure ?? this.computeRiskExposure();
    const leverageMetrics = dataSources?.leverageMetrics ?? this.computeLeverageMetrics();
    const treasuryMetrics = dataSources?.treasuryMetrics ?? this.computeTreasuryMetrics();

    // Compute overall stability
    const { score, level } = this.computeStabilityScore();

    const dashboard: GlobalEconomicStabilityDashboard = {
      generatedAt: new Date(),
      overallStabilityScore: score,
      stabilityLevel: level,
      capitalDistribution,
      crossBorderLiquidity: liquidityMetrics,
      riskExposure,
      leverageConcentration: leverageMetrics,
      treasuryReserveRatios: treasuryMetrics,
      alerts: this.listAlerts({ resolved: false }),
      trends: Array.from(this.trends.values()),
    };

    // Store snapshot
    this.dashboardSnapshots.push(dashboard);
    if (this.dashboardSnapshots.length > 100) {
      this.dashboardSnapshots.shift(); // Keep last 100 snapshots
    }

    // Check for alerts
    this.checkAndCreateAlerts(dashboard);

    return dashboard;
  }

  getLatestDashboard(): GlobalEconomicStabilityDashboard | undefined {
    return this.dashboardSnapshots[this.dashboardSnapshots.length - 1];
  }

  listDashboardSnapshots(limit?: number): GlobalEconomicStabilityDashboard[] {
    const snapshots = [...this.dashboardSnapshots].reverse();
    return limit ? snapshots.slice(0, limit) : snapshots;
  }

  // ============================================================================
  // Capital Distribution
  // ============================================================================

  computeCapitalDistribution(): GlobalCapitalDistribution {
    const byRegion = this.getRegionalDistribution();
    const bySector = this.getSectorDistribution();
    const byNodeType = this.getNodeTypeDistribution();

    const totalCapital = byRegion.reduce((sum, r) => sum + r.amount, 0) || 1000000000000; // Default $1T

    // Compute Herfindahl-Hirschman Index for concentration
    const hhi = byRegion.reduce((sum, r) => sum + Math.pow(r.percentage, 2), 0);
    const diversificationScore = Math.max(0, 100 - hhi / 100);

    this.currentCapitalDistribution = {
      totalCapital,
      byRegion,
      bySector,
      byNodeType,
      concentrationIndex: hhi,
      diversificationScore,
    };

    return this.currentCapitalDistribution;
  }

  getRegionalDistribution(): RegionalDistribution[] {
    // Simulated regional distribution
    return [
      { region: 'North America', amount: 400000000000, percentage: 35, changePercent24h: 1.2 },
      { region: 'Europe', amount: 300000000000, percentage: 26, changePercent24h: -0.5 },
      { region: 'Asia Pacific', amount: 280000000000, percentage: 24, changePercent24h: 2.1 },
      { region: 'Middle East', amount: 100000000000, percentage: 9, changePercent24h: 0.8 },
      { region: 'Latin America', amount: 50000000000, percentage: 4, changePercent24h: -0.3 },
      { region: 'Africa', amount: 20000000000, percentage: 2, changePercent24h: 1.5 },
    ];
  }

  getSectorDistribution(): SectorDistribution[] {
    return [
      { sector: 'Financial Services', amount: 350000000000, percentage: 30, changePercent24h: 0.8 },
      { sector: 'Technology', amount: 230000000000, percentage: 20, changePercent24h: 1.5 },
      { sector: 'Energy', amount: 175000000000, percentage: 15, changePercent24h: -0.2 },
      { sector: 'Infrastructure', amount: 175000000000, percentage: 15, changePercent24h: 0.5 },
      { sector: 'Trade Finance', amount: 140000000000, percentage: 12, changePercent24h: 0.3 },
      { sector: 'Commodities', amount: 80000000000, percentage: 8, changePercent24h: -0.7 },
    ];
  }

  getNodeTypeDistribution(): NodeTypeDistribution[] {
    const nodeTypes: EconomicNodeType[] = [
      'sovereign_node',
      'institutional_capital_node',
      'trade_finance_node',
      'commodity_backed_node',
      'ai_treasury_node',
    ];

    return nodeTypes.map((nodeType, index) => ({
      nodeType,
      count: 10 + index * 5,
      totalCapital: (200 - index * 30) * 1000000000,
      percentage: 30 - index * 5,
    }));
  }

  // ============================================================================
  // Cross-Border Liquidity
  // ============================================================================

  computeLiquidityMetrics(): CrossBorderLiquidityMetrics {
    const topCorridors = this.getTopLiquidityCorridors(5);

    this.currentLiquidityMetrics = {
      totalCrossBorderFlow24h: 50000000000, // $50B
      totalCrossBorderFlow7d: 280000000000, // $280B
      topCorridors,
      settlementEfficiency: 0.97, // 97%
      averageSettlementTime: 45, // 45 minutes
      failedSettlements24h: 12,
    };

    return this.currentLiquidityMetrics;
  }

  getTopLiquidityCorridors(limit?: number): LiquidityCorridor[] {
    const corridors: LiquidityCorridor[] = [
      { sourceJurisdiction: 'US', destinationJurisdiction: 'GB', volume24h: 15000000000, averageLatency: 30, utilizationRate: 0.85 },
      { sourceJurisdiction: 'US', destinationJurisdiction: 'SG', volume24h: 12000000000, averageLatency: 45, utilizationRate: 0.78 },
      { sourceJurisdiction: 'GB', destinationJurisdiction: 'DE', volume24h: 8000000000, averageLatency: 20, utilizationRate: 0.92 },
      { sourceJurisdiction: 'HK', destinationJurisdiction: 'US', volume24h: 7000000000, averageLatency: 50, utilizationRate: 0.70 },
      { sourceJurisdiction: 'SG', destinationJurisdiction: 'JP', volume24h: 5000000000, averageLatency: 25, utilizationRate: 0.82 },
      { sourceJurisdiction: 'AE', destinationJurisdiction: 'IN', volume24h: 3000000000, averageLatency: 40, utilizationRate: 0.65 },
    ];

    return limit ? corridors.slice(0, limit) : corridors;
  }

  // ============================================================================
  // Risk Exposure
  // ============================================================================

  computeRiskExposure(): GlobalRiskExposure {
    const topRiskFactors = this.getTopRiskFactors(5);

    this.currentRiskExposure = {
      totalExposure: 500000000000, // $500B
      creditExposure: 150000000000,
      marketExposure: 120000000000,
      operationalExposure: 80000000000,
      liquidityExposure: 100000000000,
      counterpartyExposure: 50000000000,
      concentrationRisk: 35,
      systemicRiskScore: 42,
      topRiskFactors,
    };

    return this.currentRiskExposure;
  }

  getTopRiskFactors(limit?: number): RiskFactor[] {
    const factors: RiskFactor[] = [
      { factor: 'Cross-border regulatory uncertainty', severity: 'high', exposure: 80000000000, mitigationStatus: 'partial' },
      { factor: 'Liquidity concentration in top 3 corridors', severity: 'medium', exposure: 60000000000, mitigationStatus: 'mitigated' },
      { factor: 'Counterparty credit exposure', severity: 'medium', exposure: 50000000000, mitigationStatus: 'partial' },
      { factor: 'Smart contract operational risk', severity: 'low', exposure: 30000000000, mitigationStatus: 'mitigated' },
      { factor: 'Currency volatility exposure', severity: 'medium', exposure: 40000000000, mitigationStatus: 'unmitigated' },
    ];

    return limit ? factors.slice(0, limit) : factors;
  }

  // ============================================================================
  // Leverage Monitoring
  // ============================================================================

  computeLeverageMetrics(): LeverageConcentrationMetrics {
    const leverageDistribution = this.getLeverageDistribution();

    this.currentLeverageMetrics = {
      systemWideLeverage: 3.2,
      maxNodeLeverage: 8.5,
      averageLeverage: 2.8,
      leverageDistribution,
      overleveragedNodes: 5,
      deleveragingPressure: 15, // 15% pressure
    };

    return this.currentLeverageMetrics;
  }

  getLeverageDistribution(): LeverageBucket[] {
    return [
      { range: '1x-2x', nodeCount: 45, capitalAmount: 300000000000 },
      { range: '2x-3x', nodeCount: 25, capitalAmount: 200000000000 },
      { range: '3x-5x', nodeCount: 15, capitalAmount: 100000000000 },
      { range: '5x-8x', nodeCount: 10, capitalAmount: 50000000000 },
      { range: '8x+', nodeCount: 5, capitalAmount: 20000000000 },
    ];
  }

  // ============================================================================
  // Treasury Reserve Ratios
  // ============================================================================

  computeTreasuryMetrics(): TreasuryReserveRatioMetrics {
    this.currentTreasuryMetrics = {
      globalReserveRatio: 0.18, // 18%
      minReserveRatio: 0.08,
      maxReserveRatio: 0.35,
      averageReserveRatio: 0.20,
      underReservedNodes: 8,
      totalReserves: 180000000000, // $180B
      reserveCoverage: 0.92, // 92% coverage
    };

    return this.currentTreasuryMetrics;
  }

  // ============================================================================
  // Stability Scoring
  // ============================================================================

  computeStabilityScore(): { score: number; level: EconomicStabilityLevel } {
    // Weighted components of stability score
    const weights = {
      capitalDiversification: 0.2,
      liquidityEfficiency: 0.2,
      riskContainment: 0.25,
      leverageHealth: 0.15,
      reserveAdequacy: 0.2,
    };

    // Component scores (0-100)
    const capitalDiversification = this.currentCapitalDistribution?.diversificationScore ?? 70;
    const liquidityEfficiency = (this.currentLiquidityMetrics?.settlementEfficiency ?? 0.9) * 100;
    const riskContainment = 100 - (this.currentRiskExposure?.systemicRiskScore ?? 40);
    const leverageHealth = Math.max(0, 100 - ((this.currentLeverageMetrics?.systemWideLeverage ?? 3) - 1) * 20);
    const reserveAdequacy = Math.min(100, (this.currentTreasuryMetrics?.globalReserveRatio ?? 0.15) * 500);

    const score = Math.round(
      capitalDiversification * weights.capitalDiversification +
      liquidityEfficiency * weights.liquidityEfficiency +
      riskContainment * weights.riskContainment +
      leverageHealth * weights.leverageHealth +
      reserveAdequacy * weights.reserveAdequacy
    );

    return {
      score,
      level: this.getStabilityLevel(score),
    };
  }

  getStabilityLevel(score: number): EconomicStabilityLevel {
    if (score >= 80) return 'stable';
    if (score >= 70) return 'resilient';
    if (score >= 55) return 'moderate';
    if (score >= 40) return 'stressed';
    if (score >= 25) return 'critical';
    return 'systemic_crisis';
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  createAlert(params: Omit<StabilityAlert, 'id'>): StabilityAlert {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const alert: StabilityAlert = {
      id: alertId,
      ...params,
    };

    this.alerts.set(alertId, alert);
    this.emitEvent('stability_alert', params.alertType === 'emergency' ? 'critical' : 'warning', params.message, {
      alert,
    });

    return alert;
  }

  resolveAlert(alertId: string): StabilityAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const resolvedAlert: StabilityAlert = {
      ...alert,
      resolvedAt: new Date(),
    };

    this.alerts.set(alertId, resolvedAlert);
    this.emitEvent('stability_resolved', 'info', `Alert ${alertId} resolved`, { alert: resolvedAlert });

    return resolvedAlert;
  }

  listAlerts(filters?: AlertFilters): StabilityAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.alertType) {
        alerts = alerts.filter((a) => a.alertType === filters.alertType);
      }
      if (filters.category) {
        alerts = alerts.filter((a) => a.category === filters.category);
      }
      if (filters.resolved !== undefined) {
        alerts = alerts.filter((a) => (filters.resolved ? a.resolvedAt !== undefined : a.resolvedAt === undefined));
      }
    }

    return alerts;
  }

  // ============================================================================
  // Trends
  // ============================================================================

  recordTrend(params: Omit<StabilityTrend, 'direction'>): StabilityTrend {
    const direction: StabilityTrend['direction'] =
      params.changePercent > 0.5 ? 'improving' : params.changePercent < -0.5 ? 'deteriorating' : 'stable';

    const trend: StabilityTrend = {
      ...params,
      direction,
    };

    this.trends.set(params.metric, trend);
    return trend;
  }

  listTrends(filters?: TrendFilters): StabilityTrend[] {
    let trends = Array.from(this.trends.values());

    if (filters) {
      if (filters.metric) {
        trends = trends.filter((t) => t.metric === filters.metric);
      }
      if (filters.direction) {
        trends = trends.filter((t) => t.direction === filters.direction);
      }
    }

    return trends;
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  setAlertThreshold(metric: string, thresholds: Omit<AlertThreshold, 'metric'>): void {
    this.alertThresholds.set(metric, { metric, ...thresholds });
  }

  getAlertThresholds(): AlertThreshold[] {
    return Array.from(this.alertThresholds.values());
  }

  getLayerConfig(): StabilityDashboardConfig {
    return { ...this.config };
  }

  onEvent(callback: GAEIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private checkAndCreateAlerts(dashboard: GlobalEconomicStabilityDashboard): void {
    // Check stability score
    const stabilityThreshold = this.alertThresholds.get('stabilityScore');
    if (stabilityThreshold) {
      if (dashboard.overallStabilityScore < stabilityThreshold.emergencyThreshold) {
        this.createAlert({
          alertType: 'emergency',
          category: 'stability',
          message: `Global stability score critically low: ${dashboard.overallStabilityScore}`,
          affectedNodes: [],
          affectedJurisdictions: [],
          recommendedActions: ['Activate emergency stabilization protocols', 'Convene stability council'],
          triggeredAt: new Date(),
        });
      } else if (dashboard.overallStabilityScore < stabilityThreshold.criticalThreshold) {
        this.createAlert({
          alertType: 'critical',
          category: 'stability',
          message: `Global stability score below critical threshold: ${dashboard.overallStabilityScore}`,
          affectedNodes: [],
          affectedJurisdictions: [],
          recommendedActions: ['Review capital buffers', 'Monitor liquidity corridors'],
          triggeredAt: new Date(),
        });
      }
    }

    // Check leverage
    const leverageThreshold = this.alertThresholds.get('systemLeverage');
    if (leverageThreshold && dashboard.leverageConcentration.systemWideLeverage > leverageThreshold.warningThreshold) {
      this.createAlert({
        alertType: dashboard.leverageConcentration.systemWideLeverage > leverageThreshold.criticalThreshold ? 'critical' : 'warning',
        category: 'leverage',
        message: `System-wide leverage elevated: ${dashboard.leverageConcentration.systemWideLeverage}x`,
        affectedNodes: [],
        affectedJurisdictions: [],
        recommendedActions: ['Review overleveraged nodes', 'Consider deleveraging protocols'],
        triggeredAt: new Date(),
      });
    }
  }

  private emitEvent(
    type: GAEIEvent['type'],
    severity: GAEIEvent['severity'],
    message: string,
    data: Record<string, unknown>
  ): void {
    const event: GAEIEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      severity,
      source: 'stability_dashboard',
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

export function createStabilityDashboardLayer(
  config?: Partial<StabilityDashboardConfig>
): DefaultStabilityDashboardLayer {
  return new DefaultStabilityDashboardLayer(config);
}
