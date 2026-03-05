/**
 * TONAIAgent - GRIF Regulatory Transparency Portal
 *
 * Provides regulators and institutions with on-chain visibility into:
 * - Stability index (linked to #122 Systemic Risk Framework)
 * - Capital adequacy metrics
 * - Treasury reserve transparency (linked to #123 Treasury Layer)
 * - Clearing & settlement statistics (linked to #120 Clearing House)
 *
 * Goal: Make oversight technically possible without central control.
 *
 * This is Component 4 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  TransparencyPortalData,
  StabilityIndexSnapshot,
  CapitalAdequacyMetric,
  TreasuryReserveSnapshot,
  ClearingStatistics,
  ReserveComposition,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_PORTAL_CONFIG: TransparencyPortalConfig = {
  enabled: true,
  refreshIntervalMinutes: 60,
  publicAccess: true,
  enableHistoricalData: true,
  retentionDays: 365,
};

// ============================================================================
// Interface
// ============================================================================

export interface TransparencyPortalConfig {
  enabled?: boolean;
  refreshIntervalMinutes?: number;
  publicAccess?: boolean;
  enableHistoricalData?: boolean;
  retentionDays?: number;
}

export interface PortalMetricFilters {
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

export interface CapitalAdequacySnapshot {
  timestamp: Date;
  tier1: number;
  tier2: number;
}

// ============================================================================
// Transparency Portal Implementation
// ============================================================================

export class TransparencyPortal {
  private readonly _config: TransparencyPortalConfig;
  private currentData: TransparencyPortalData | null = null;
  private historicalStability: StabilityIndexSnapshot[] = [];
  private historicalCapital: CapitalAdequacyMetric[] = [];
  private historicalReserves: TreasuryReserveSnapshot[] = [];
  private historicalClearing: ClearingStatistics[] = [];
  private eventListeners: GRIFEventCallback[] = [];

  get config(): TransparencyPortalConfig {
    return this._config;
  }

  constructor(config: TransparencyPortalConfig = {}) {
    this._config = { ...DEFAULT_PORTAL_CONFIG, ...config };
    this.initializeSampleData();
  }

  // ============================================================================
  // Current Data Access
  // ============================================================================

  getPortalData(): TransparencyPortalData {
    if (!this.currentData) {
      this.currentData = this.buildCurrentData();
    }
    return this.currentData;
  }

  getStabilityIndex(): StabilityIndexSnapshot {
    return this.getPortalData().stabilityIndex;
  }

  getCapitalAdequacy(): CapitalAdequacyMetric {
    return this.getPortalData().capitalAdequacy;
  }

  getTreasuryReserves(): TreasuryReserveSnapshot {
    return this.getPortalData().treasuryReserves;
  }

  getClearingStatistics(): ClearingStatistics {
    return this.getPortalData().clearingStatistics;
  }

  // ============================================================================
  // Historical Data Access
  // ============================================================================

  getStabilityHistory(filters?: PortalMetricFilters): StabilityIndexSnapshot[] {
    return this.applyFilters(this.historicalStability, filters);
  }

  getCapitalHistory(filters?: PortalMetricFilters): CapitalAdequacyMetric[] {
    return this.applyFilters(this.historicalCapital, filters);
  }

  getReserveHistory(filters?: PortalMetricFilters): TreasuryReserveSnapshot[] {
    return this.applyFilters(this.historicalReserves, filters);
  }

  getClearingHistory(filters?: PortalMetricFilters): ClearingStatistics[] {
    return this.applyFilters(this.historicalClearing, filters);
  }

  // ============================================================================
  // Data Ingestion (integration hooks for #122, #123, #120)
  // ============================================================================

  /**
   * Update stability index from the Systemic Risk & Stability Framework (Issue #122).
   */
  updateStabilityIndex(snapshot: Omit<StabilityIndexSnapshot, 'timestamp'>): StabilityIndexSnapshot {
    const s: StabilityIndexSnapshot = { ...snapshot, timestamp: new Date() };
    if (this.currentData) {
      this.currentData = { ...this.currentData, stabilityIndex: s, lastRefreshed: new Date() };
    }
    if (this._config.enableHistoricalData) {
      this.historicalStability.push(s);
      this.trimHistory(this.historicalStability);
    }
    this.emitEvent({
      type: 'report_generated',
      timestamp: new Date(),
      data: { metricType: 'stability_index', score: s.overallScore },
    });
    return s;
  }

  /**
   * Update capital adequacy metrics from the Treasury Layer (Issue #123).
   */
  updateCapitalAdequacy(
    metric: Omit<CapitalAdequacyMetric, 'timestamp' | 'status'>
  ): CapitalAdequacyMetric {
    const status = this.determineCapitalStatus(metric.tier1Ratio, metric.totalCapitalRatio);
    const m: CapitalAdequacyMetric = { ...metric, status, timestamp: new Date() };
    if (this.currentData) {
      this.currentData = { ...this.currentData, capitalAdequacy: m, lastRefreshed: new Date() };
    }
    if (this._config.enableHistoricalData) {
      this.historicalCapital.push(m);
      this.trimHistory(this.historicalCapital);
    }
    return m;
  }

  /**
   * Update treasury reserve snapshot from Monetary Policy / Treasury Layer (Issue #123).
   */
  updateTreasuryReserves(
    snapshot: Omit<TreasuryReserveSnapshot, 'timestamp'>
  ): TreasuryReserveSnapshot {
    const s: TreasuryReserveSnapshot = { ...snapshot, timestamp: new Date() };
    if (this.currentData) {
      this.currentData = { ...this.currentData, treasuryReserves: s, lastRefreshed: new Date() };
    }
    if (this._config.enableHistoricalData) {
      this.historicalReserves.push(s);
      this.trimHistory(this.historicalReserves);
    }
    return s;
  }

  /**
   * Update clearing statistics from the Clearing House (Issue #120).
   */
  updateClearingStatistics(
    stats: Omit<ClearingStatistics, 'timestamp'>
  ): ClearingStatistics {
    const s: ClearingStatistics = { ...stats, timestamp: new Date() };
    if (this.currentData) {
      this.currentData = { ...this.currentData, clearingStatistics: s, lastRefreshed: new Date() };
    }
    if (this._config.enableHistoricalData) {
      this.historicalClearing.push(s);
      this.trimHistory(this.historicalClearing);
    }
    return s;
  }

  // ============================================================================
  // Summary Dashboard
  // ============================================================================

  getDashboard(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      stabilityScore: number;
      capitalAdequacyStatus: CapitalAdequacyMetric['status'];
      reserveRatio: number;
      clearingSuccessRate: number;
    };
    lastRefreshed: Date;
  } {
    const data = this.getPortalData();
    const reserveRatio = data.capitalAdequacy.tier1Ratio;
    const status = this.computeDashboardStatus(data);

    return {
      status,
      metrics: {
        stabilityScore: data.stabilityIndex.overallScore,
        capitalAdequacyStatus: data.capitalAdequacy.status,
        reserveRatio,
        clearingSuccessRate: data.clearingStatistics.successRate,
      },
      lastRefreshed: data.lastRefreshed,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GRIFEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: GRIFEvent): void {
    this.eventListeners.forEach((cb) => cb(event));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildCurrentData(): TransparencyPortalData {
    return {
      stabilityIndex: this.buildDefaultStabilityIndex(),
      capitalAdequacy: this.buildDefaultCapitalAdequacy(),
      treasuryReserves: this.buildDefaultTreasuryReserves(),
      clearingStatistics: this.buildDefaultClearingStats(),
      lastRefreshed: new Date(),
    };
  }

  private buildDefaultStabilityIndex(): StabilityIndexSnapshot {
    return {
      timestamp: new Date(),
      overallScore: 92,
      components: {
        liquidity: 94,
        solvency: 95,
        counterparty: 88,
        market: 91,
      },
      trend: 'stable',
    };
  }

  private buildDefaultCapitalAdequacy(): CapitalAdequacyMetric {
    return {
      timestamp: new Date(),
      tier1Ratio: 15.2,
      tier2Ratio: 3.1,
      totalCapitalRatio: 18.3,
      leverageRatio: 8.4,
      liquidityCoverageRatio: 142,
      netStableFundingRatio: 121,
      status: 'adequate',
    };
  }

  private buildDefaultTreasuryReserves(): TreasuryReserveSnapshot {
    const composition: ReserveComposition[] = [
      { assetType: 'TON', amount: 50_000_000, percentage: 50, chain: 'ton' },
      { assetType: 'USDT', amount: 30_000_000, percentage: 30, chain: 'ton' },
      { assetType: 'ETH', amount: 20_000_000, percentage: 20, chain: 'ethereum' },
    ];
    return {
      timestamp: new Date(),
      totalReserves: 100_000_000,
      currency: 'USD',
      composition,
    };
  }

  private buildDefaultClearingStats(): ClearingStatistics {
    return {
      timestamp: new Date(),
      totalTransactions: 125_430,
      totalVolume: 4_250_000_000,
      currency: 'USD',
      averageSettlementTimeMinutes: 3.2,
      successRate: 99.7,
      jurisdictionBreakdown: {
        EU: 35_000,
        APAC: 48_000,
        MENA: 12_000,
        US: 20_000,
        Other: 10_430,
      },
    };
  }

  private determineCapitalStatus(
    tier1Ratio: number,
    totalRatio: number
  ): CapitalAdequacyMetric['status'] {
    if (tier1Ratio >= 12 && totalRatio >= 15) return 'adequate';
    if (tier1Ratio >= 8 && totalRatio >= 10) return 'borderline';
    return 'inadequate';
  }

  private computeDashboardStatus(
    data: TransparencyPortalData
  ): 'healthy' | 'warning' | 'critical' {
    if (
      data.stabilityIndex.overallScore < 60 ||
      data.capitalAdequacy.status === 'inadequate' ||
      data.clearingStatistics.successRate < 95
    ) {
      return 'critical';
    }
    if (
      data.stabilityIndex.overallScore < 80 ||
      data.capitalAdequacy.status === 'borderline' ||
      data.clearingStatistics.successRate < 98
    ) {
      return 'warning';
    }
    return 'healthy';
  }

  private applyFilters<T extends { timestamp: Date }>(
    items: T[],
    filters?: PortalMetricFilters
  ): T[] {
    let result = [...items];
    if (filters?.fromDate) {
      result = result.filter((i) => i.timestamp >= filters.fromDate!);
    }
    if (filters?.toDate) {
      result = result.filter((i) => i.timestamp <= filters.toDate!);
    }
    if (filters?.limit) {
      result = result.slice(-filters.limit);
    }
    return result;
  }

  private trimHistory<T>(history: T[]): void {
    const maxEntries = Math.ceil(
      ((this._config.retentionDays ?? 365) * 24 * 60) /
        (this._config.refreshIntervalMinutes ?? 60)
    );
    while (history.length > maxEntries) {
      history.shift();
    }
  }

  private initializeSampleData(): void {
    this.currentData = this.buildCurrentData();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTransparencyPortal(
  config?: TransparencyPortalConfig
): TransparencyPortal {
  return new TransparencyPortal(config);
}
