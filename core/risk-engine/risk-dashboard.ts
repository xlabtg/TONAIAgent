/**
 * Risk Engine v1 — Risk Dashboard Integration
 * Issue #154: Risk Engine v1
 *
 * Exposes risk metrics through analytics dashboards showing:
 *   - Portfolio risk exposure
 *   - Strategy risk ratings
 *   - Drawdown alerts
 *   - Leverage monitoring
 *
 * Provides transparency for users and institutions.
 */

import type {
  StrategyId,
  AgentId,
  FundId,
  RiskScore,
  StrategyRiskProfile,
  PortfolioExposureSnapshot,
  DrawdownAlert,
  LeverageAlert,
  RiskDashboardMetrics,
  RiskEngineEvent,
  RiskEngineEventCallback,
} from './types';

// ============================================================================
// Dashboard State
// ============================================================================

interface DashboardState {
  portfolioSnapshots: Map<AgentId, PortfolioExposureSnapshot>;
  strategyProfiles: Map<StrategyId, StrategyRiskProfile>;
  drawdownAlerts: DrawdownAlert[];
  leverageAlerts: LeverageAlert[];
  systemRiskScore: RiskScore | undefined;
}

// ============================================================================
// Risk Dashboard Interface
// ============================================================================

export interface RiskDashboard {
  updatePortfolioSnapshot(snapshot: PortfolioExposureSnapshot): void;
  updateStrategyProfile(profile: StrategyRiskProfile): void;
  addDrawdownAlert(alert: DrawdownAlert): void;
  addLeverageAlert(alert: LeverageAlert): void;
  updateSystemRiskScore(score: RiskScore): void;
  getMetrics(): RiskDashboardMetrics;
  getStrategyRating(strategyId: StrategyId): StrategyRiskProfile | undefined;
  getPortfolioExposure(agentId: AgentId): PortfolioExposureSnapshot | undefined;
  getActiveDrawdownAlerts(entityId?: string): DrawdownAlert[];
  getActiveLeverageAlerts(entityId?: string): LeverageAlert[];
  clearAlerts(entityId?: string): void;
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Risk Dashboard Implementation
// ============================================================================

export class DefaultRiskDashboard implements RiskDashboard {
  private readonly state: DashboardState = {
    portfolioSnapshots: new Map(),
    strategyProfiles: new Map(),
    drawdownAlerts: [],
    leverageAlerts: [],
    systemRiskScore: undefined,
  };

  private readonly eventCallbacks: RiskEngineEventCallback[] = [];

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

  updatePortfolioSnapshot(snapshot: PortfolioExposureSnapshot): void {
    this.state.portfolioSnapshots.set(snapshot.agentId, snapshot);
  }

  updateStrategyProfile(profile: StrategyRiskProfile): void {
    this.state.strategyProfiles.set(profile.strategyId, profile);
  }

  addDrawdownAlert(alert: DrawdownAlert): void {
    // Remove any existing alert for the same entity before adding the new one
    this.state.drawdownAlerts = this.state.drawdownAlerts.filter(
      a => a.entityId !== alert.entityId || a.entityType !== alert.entityType,
    );
    this.state.drawdownAlerts.push(alert);

    this.emitEvent({
      type: 'drawdown_alert',
      payload: alert,
    });
  }

  addLeverageAlert(alert: LeverageAlert): void {
    // Remove any existing alert for the same entity before adding the new one
    this.state.leverageAlerts = this.state.leverageAlerts.filter(
      a => a.entityId !== alert.entityId || a.entityType !== alert.entityType,
    );
    this.state.leverageAlerts.push(alert);

    this.emitEvent({
      type: 'leverage_alert',
      payload: alert,
    });
  }

  updateSystemRiskScore(score: RiskScore): void {
    this.state.systemRiskScore = score;

    this.emitEvent({
      type: 'risk_score_updated',
      payload: {
        entityId: 'system',
        entityType: 'system',
        value: score.value,
        category: score.category,
      },
    });
  }

  getMetrics(): RiskDashboardMetrics {
    const systemRiskScore: RiskScore = this.state.systemRiskScore ?? {
      value: 0,
      category: 'low',
      timestamp: new Date(),
      explanation: 'No system risk score computed yet.',
    };

    return {
      portfolioRiskExposure: Array.from(this.state.portfolioSnapshots.values()),
      strategyRiskRatings: Array.from(this.state.strategyProfiles.values()),
      drawdownAlerts: [...this.state.drawdownAlerts],
      leverageAlerts: [...this.state.leverageAlerts],
      overallSystemRiskScore: systemRiskScore,
      timestamp: new Date(),
    };
  }

  getStrategyRating(strategyId: StrategyId): StrategyRiskProfile | undefined {
    return this.state.strategyProfiles.get(strategyId);
  }

  getPortfolioExposure(agentId: AgentId): PortfolioExposureSnapshot | undefined {
    return this.state.portfolioSnapshots.get(agentId);
  }

  getActiveDrawdownAlerts(entityId?: string): DrawdownAlert[] {
    if (!entityId) return [...this.state.drawdownAlerts];
    return this.state.drawdownAlerts.filter(a => a.entityId === entityId);
  }

  getActiveLeverageAlerts(entityId?: string): LeverageAlert[] {
    if (!entityId) return [...this.state.leverageAlerts];
    return this.state.leverageAlerts.filter(a => a.entityId === entityId);
  }

  clearAlerts(entityId?: string): void {
    if (!entityId) {
      this.state.drawdownAlerts = [];
      this.state.leverageAlerts = [];
    } else {
      this.state.drawdownAlerts = this.state.drawdownAlerts.filter(
        a => a.entityId !== entityId,
      );
      this.state.leverageAlerts = this.state.leverageAlerts.filter(
        a => a.entityId !== entityId,
      );
    }
  }
}

// ============================================================================
// Dashboard Builder — convenience to create alerts
// ============================================================================

export function buildDrawdownAlert(
  entityId: string,
  entityType: 'agent' | 'strategy' | 'fund',
  currentDrawdown: number,
  threshold: number,
): DrawdownAlert {
  return {
    entityId,
    entityType,
    currentDrawdown,
    threshold,
    severity: currentDrawdown >= threshold * 1.5 ? 'critical' : 'warning',
    timestamp: new Date(),
  };
}

export function buildLeverageAlert(
  entityId: string,
  entityType: 'agent' | 'strategy' | 'fund',
  currentLeverage: number,
  maxLeverage: number,
): LeverageAlert {
  return {
    entityId,
    entityType,
    currentLeverage,
    maxLeverage,
    severity: currentLeverage >= maxLeverage ? 'critical' : 'warning',
    timestamp: new Date(),
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskDashboard(): DefaultRiskDashboard {
  return new DefaultRiskDashboard();
}
