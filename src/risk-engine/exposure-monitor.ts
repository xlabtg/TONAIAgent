/**
 * Risk Engine v1 — Real-Time Exposure Monitor
 * Issue #154: Risk Engine v1
 *
 * Continuously tracks portfolio exposure per asset, strategy allocations within
 * funds, capital concentration risks, and unrealized losses. Emits alerts when
 * exposure thresholds are exceeded.
 */

import type {
  AgentId,
  FundId,
  PortfolioExposureSnapshot,
  AssetExposure,
  StrategyAllocation,
  ExposureMonitorConfig,
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_EXPOSURE_CONFIG: ExposureMonitorConfig = {
  concentrationWarnThreshold: 0.30,
  concentrationCriticalThreshold: 0.50,
  unrealizedLossWarnPercent: 0.10,
  unrealizedLossCriticalPercent: 0.20,
};

// ============================================================================
// Exposure Update Input
// ============================================================================

export interface ExposureUpdateInput {
  agentId: AgentId;
  fundId?: FundId;
  totalValue: number;
  assetExposures: Array<{ assetId: string; value: number }>;
  strategyAllocations?: Array<{
    strategyId: string;
    fundId: string;
    allocatedCapital: number;
  }>;
  unrealizedLosses?: number;
}

// ============================================================================
// Exposure Monitor Interface
// ============================================================================

export interface RealTimeExposureMonitor {
  update(input: ExposureUpdateInput): PortfolioExposureSnapshot;
  getSnapshot(agentId: AgentId): PortfolioExposureSnapshot | undefined;
  getAllSnapshots(): PortfolioExposureSnapshot[];
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Exposure Monitor Implementation
// ============================================================================

export class DefaultRealTimeExposureMonitor implements RealTimeExposureMonitor {
  private readonly config: ExposureMonitorConfig;
  private readonly snapshots = new Map<AgentId, PortfolioExposureSnapshot>();
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

  constructor(config?: Partial<ExposureMonitorConfig>) {
    this.config = {
      ...DEFAULT_EXPOSURE_CONFIG,
      ...config,
    };
  }

  onEvent(callback: RiskEngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<RiskEngineEvent, 'timestamp'>): void {
    const fullEvent: RiskEngineEvent = {
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  update(input: ExposureUpdateInput): PortfolioExposureSnapshot {
    const { totalValue } = input;

    // Compute asset exposures with percentage
    const assetExposures: AssetExposure[] = input.assetExposures.map(ae => ({
      assetId: ae.assetId,
      value: ae.value,
      percentage: totalValue > 0 ? ae.value / totalValue : 0,
    }));

    // Compute strategy allocations with percentage
    const strategyAllocations: StrategyAllocation[] = (input.strategyAllocations ?? []).map(sa => ({
      strategyId: sa.strategyId,
      fundId: sa.fundId,
      allocatedCapital: sa.allocatedCapital,
      percentage: totalValue > 0 ? sa.allocatedCapital / totalValue : 0,
    }));

    const unrealizedLosses = input.unrealizedLosses ?? 0;

    // Capital concentration: max single-asset percentage
    const capitalConcentrationScore =
      assetExposures.length > 0
        ? Math.max(...assetExposures.map(ae => ae.percentage))
        : 0;

    const snapshot: PortfolioExposureSnapshot = {
      agentId: input.agentId,
      fundId: input.fundId,
      totalValue,
      assetExposures,
      strategyAllocations,
      unrealizedLosses,
      capitalConcentrationScore,
      timestamp: new Date(),
    };

    this.snapshots.set(input.agentId, snapshot);

    // Emit exposure_updated event
    this.emitEvent({
      type: 'exposure_updated',
      payload: {
        agentId: input.agentId,
        totalValue,
        capitalConcentrationScore,
        unrealizedLosses,
      },
    });

    // Check concentration thresholds and emit alerts
    this.checkConcentrationAlerts(snapshot);

    // Check unrealized loss thresholds
    this.checkDrawdownAlerts(snapshot);

    return snapshot;
  }

  getSnapshot(agentId: AgentId): PortfolioExposureSnapshot | undefined {
    return this.snapshots.get(agentId);
  }

  getAllSnapshots(): PortfolioExposureSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private checkConcentrationAlerts(snapshot: PortfolioExposureSnapshot): void {
    const { concentrationWarnThreshold, concentrationCriticalThreshold } = this.config;

    for (const ae of snapshot.assetExposures) {
      if (ae.percentage >= concentrationCriticalThreshold) {
        this.emitEvent({
          type: 'drawdown_alert',
          payload: {
            entityId: snapshot.agentId,
            entityType: 'agent',
            alertType: 'concentration',
            assetId: ae.assetId,
            currentConcentration: ae.percentage,
            threshold: concentrationCriticalThreshold,
            severity: 'critical',
          },
        });
      } else if (ae.percentage >= concentrationWarnThreshold) {
        this.emitEvent({
          type: 'drawdown_alert',
          payload: {
            entityId: snapshot.agentId,
            entityType: 'agent',
            alertType: 'concentration',
            assetId: ae.assetId,
            currentConcentration: ae.percentage,
            threshold: concentrationWarnThreshold,
            severity: 'warning',
          },
        });
      }
    }
  }

  private checkDrawdownAlerts(snapshot: PortfolioExposureSnapshot): void {
    const { unrealizedLossWarnPercent, unrealizedLossCriticalPercent } = this.config;

    if (snapshot.totalValue <= 0) return;

    const unrealizedLossPercent = snapshot.unrealizedLosses / snapshot.totalValue;

    if (unrealizedLossPercent >= unrealizedLossCriticalPercent) {
      this.emitEvent({
        type: 'drawdown_alert',
        payload: {
          entityId: snapshot.agentId,
          entityType: 'agent',
          alertType: 'unrealized_loss',
          currentLossPercent: unrealizedLossPercent,
          threshold: unrealizedLossCriticalPercent,
          severity: 'critical',
        },
      });
    } else if (unrealizedLossPercent >= unrealizedLossWarnPercent) {
      this.emitEvent({
        type: 'drawdown_alert',
        payload: {
          entityId: snapshot.agentId,
          entityType: 'agent',
          alertType: 'unrealized_loss',
          currentLossPercent: unrealizedLossPercent,
          threshold: unrealizedLossWarnPercent,
          severity: 'warning',
        },
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRealTimeExposureMonitor(
  config?: Partial<ExposureMonitorConfig>,
): DefaultRealTimeExposureMonitor {
  return new DefaultRealTimeExposureMonitor(config);
}
