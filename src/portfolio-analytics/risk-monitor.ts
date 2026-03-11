/**
 * TONAIAgent - Risk Monitoring Panel
 *
 * Integrates with the Risk Engine v1 to provide real-time risk monitoring
 * for the Portfolio Analytics Dashboard. Tracks volatility, max drawdown,
 * leverage, concentration risk, and triggers alerts when thresholds are exceeded.
 */

import {
  RiskAlert,
  RiskMetrics,
  ExposureMetrics,
  RiskMonitoringPanel,
  AlertType,
  AlertSeverity,
  PortfolioAnalyticsConfig,
  PortfolioAnalyticsEvent,
  PortfolioAnalyticsEventCallback,
} from './types';
import { DefaultAnalyticsEngine } from './analytics-engine';
import { DefaultPortfolioDataModel } from './data-model';

// ============================================================================
// Risk Monitor Interface
// ============================================================================

export interface RiskMonitor {
  // Panel data
  getRiskPanel(agentId: string): RiskMonitoringPanel;
  updateExposureMetrics(agentId: string, exposure: Partial<ExposureMetrics>): void;

  // Alerts
  evaluateRiskAlerts(agentId: string): RiskAlert[];
  triggerAlert(agentId: string, type: AlertType, currentValue: number, thresholdValue: number, message: string): RiskAlert;
  resolveAlert(agentId: string, alertId: string): void;
  getActiveAlerts(agentId: string): RiskAlert[];
  getAlertHistory(agentId: string): RiskAlert[];

  // Events
  onEvent(callback: PortfolioAnalyticsEventCallback): void;
}

// ============================================================================
// Risk Monitor Configuration
// ============================================================================

export interface RiskMonitorConfig {
  /** How many resolved alerts to retain in history */
  maxAlertHistory: number;
}

const DEFAULT_RISK_MONITOR_CONFIG: RiskMonitorConfig = {
  maxAlertHistory: 200,
};

// ============================================================================
// Default Risk Monitor Implementation
// ============================================================================

export class DefaultRiskMonitor implements RiskMonitor {
  private readonly config: PortfolioAnalyticsConfig;
  private readonly monitorConfig: RiskMonitorConfig;
  private readonly analyticsEngine: DefaultAnalyticsEngine;
  private readonly dataModel: DefaultPortfolioDataModel;
  private readonly eventCallbacks: PortfolioAnalyticsEventCallback[] = [];

  // Per-agent state
  private readonly activeAlerts = new Map<string, Map<string, RiskAlert>>();
  private readonly alertHistory = new Map<string, RiskAlert[]>();
  private readonly exposureMetrics = new Map<string, ExposureMetrics>();

  private alertCounter = 0;

  constructor(
    config: PortfolioAnalyticsConfig,
    analyticsEngine: DefaultAnalyticsEngine,
    dataModel: DefaultPortfolioDataModel,
    monitorConfig: Partial<RiskMonitorConfig> = {}
  ) {
    this.config = config;
    this.analyticsEngine = analyticsEngine;
    this.dataModel = dataModel;
    this.monitorConfig = { ...DEFAULT_RISK_MONITOR_CONFIG, ...monitorConfig };
  }

  onEvent(callback: PortfolioAnalyticsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getRiskPanel(agentId: string): RiskMonitoringPanel {
    const riskMetrics = this.analyticsEngine.computeRiskMetrics(agentId, '30d');
    const exposureMetrics = this.getExposureMetrics(agentId);
    const activeAlerts = this.getActiveAlerts(agentId);
    const alertHistory = this.getAlertHistory(agentId);

    const riskScore = this.computeRiskScore(riskMetrics, exposureMetrics);
    const riskGrade = this.computeRiskGrade(riskScore);

    return {
      agentId,
      riskMetrics,
      exposureMetrics,
      activeAlerts,
      alertHistory,
      riskScore,
      riskGrade,
      lastAssessed: new Date(),
    };
  }

  updateExposureMetrics(agentId: string, exposure: Partial<ExposureMetrics>): void {
    const existing = this.getExposureMetrics(agentId);
    const updated: ExposureMetrics = { ...existing, ...exposure };
    this.exposureMetrics.set(agentId, updated);
  }

  evaluateRiskAlerts(agentId: string): RiskAlert[] {
    const triggeredAlerts: RiskAlert[] = [];
    const riskMetrics = this.analyticsEngine.computeRiskMetrics(agentId, '30d');
    const exposureMetrics = this.getExposureMetrics(agentId);

    // Drawdown threshold check
    if (riskMetrics.maxDrawdown >= this.config.drawdownAlertThreshold) {
      const alert = this.triggerAlert(
        agentId,
        'drawdown_threshold',
        riskMetrics.maxDrawdown,
        this.config.drawdownAlertThreshold,
        `Max drawdown ${riskMetrics.maxDrawdown.toFixed(2)}% exceeds threshold of ${this.config.drawdownAlertThreshold}%`
      );
      triggeredAlerts.push(alert);
    }

    // Current drawdown check
    if (riskMetrics.currentDrawdown >= this.config.drawdownAlertThreshold * 0.75) {
      const alert = this.triggerAlert(
        agentId,
        'drawdown_threshold',
        riskMetrics.currentDrawdown,
        this.config.drawdownAlertThreshold * 0.75,
        `Current drawdown ${riskMetrics.currentDrawdown.toFixed(2)}% approaching threshold`
      );
      triggeredAlerts.push(alert);
    }

    // Volatility spike check
    if (riskMetrics.volatility >= this.config.volatilityAlertThreshold) {
      const alert = this.triggerAlert(
        agentId,
        'volatility_spike',
        riskMetrics.volatility,
        this.config.volatilityAlertThreshold,
        `Daily volatility ${riskMetrics.volatility.toFixed(2)}% exceeds threshold of ${this.config.volatilityAlertThreshold}%`
      );
      triggeredAlerts.push(alert);
    }

    // Leverage limit check
    if (exposureMetrics.grossLeverage > this.config.maxLeverageLimit) {
      const alert = this.triggerAlert(
        agentId,
        'leverage_limit',
        exposureMetrics.grossLeverage,
        this.config.maxLeverageLimit,
        `Gross leverage ${exposureMetrics.grossLeverage.toFixed(2)}x exceeds limit of ${this.config.maxLeverageLimit}x`
      );
      triggeredAlerts.push(alert);
    }

    // Concentration risk check
    const highConcentrations = exposureMetrics.topConcentrations.filter(
      c => c.exposurePercent >= this.config.concentrationAlertThreshold
    );
    for (const concentration of highConcentrations) {
      const alert = this.triggerAlert(
        agentId,
        'concentration_risk',
        concentration.exposurePercent,
        this.config.concentrationAlertThreshold,
        `Asset ${concentration.asset} concentration ${concentration.exposurePercent.toFixed(2)}% exceeds threshold of ${this.config.concentrationAlertThreshold}%`
      );
      triggeredAlerts.push(alert);
    }

    return triggeredAlerts;
  }

  triggerAlert(
    agentId: string,
    type: AlertType,
    currentValue: number,
    thresholdValue: number,
    message: string
  ): RiskAlert {
    const severity = this.determineSeverity(type, currentValue, thresholdValue);
    const alert: RiskAlert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      agentId,
      type,
      severity,
      message,
      currentValue,
      thresholdValue,
      triggered: true,
      triggeredAt: new Date(),
      createdAt: new Date(),
    };

    let agentAlerts = this.activeAlerts.get(agentId);
    if (!agentAlerts) {
      agentAlerts = new Map<string, RiskAlert>();
      this.activeAlerts.set(agentId, agentAlerts);
    }
    agentAlerts.set(alert.id, alert);

    this.emitEvent({
      type: 'alert_triggered',
      agentId,
      severity,
      message: `Risk alert triggered: ${message}`,
      data: { alertId: alert.id, alertType: type, currentValue, thresholdValue },
    });

    if (severity === 'critical' || severity === 'error') {
      this.emitEvent({
        type: 'risk_threshold_breached',
        agentId,
        severity,
        message: `Risk threshold breached: ${type}`,
        data: { alertId: alert.id, alertType: type },
      });
    }

    return alert;
  }

  resolveAlert(agentId: string, alertId: string): void {
    const agentAlerts = this.activeAlerts.get(agentId);
    if (!agentAlerts) return;

    const alert = agentAlerts.get(alertId);
    if (!alert) return;

    alert.resolvedAt = new Date();
    agentAlerts.delete(alertId);

    // Move to history
    let history = this.alertHistory.get(agentId);
    if (!history) {
      history = [];
      this.alertHistory.set(agentId, history);
    }
    history.push(alert);

    // Trim history
    if (history.length > this.monitorConfig.maxAlertHistory) {
      history.splice(0, history.length - this.monitorConfig.maxAlertHistory);
    }

    this.emitEvent({
      type: 'alert_resolved',
      agentId,
      severity: 'info',
      message: `Risk alert resolved: ${alert.message}`,
      data: { alertId, alertType: alert.type },
    });
  }

  getActiveAlerts(agentId: string): RiskAlert[] {
    const agentAlerts = this.activeAlerts.get(agentId);
    return agentAlerts ? Array.from(agentAlerts.values()) : [];
  }

  getAlertHistory(agentId: string): RiskAlert[] {
    return this.alertHistory.get(agentId) ?? [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getExposureMetrics(agentId: string): ExposureMetrics {
    let metrics = this.exposureMetrics.get(agentId);
    if (!metrics) {
      const overview = this.dataModel.getPortfolioOverview(agentId);
      const allocation = this.dataModel.getAllocationBreakdown(agentId);

      // Compute concentration from strategy allocations
      const topConcentrations = allocation.strategies
        .filter(s => s.allocatedPercent > 0)
        .sort((a, b) => b.allocatedPercent - a.allocatedPercent)
        .slice(0, 5)
        .map(s => ({
          asset: s.strategyName,
          exposurePercent: s.allocatedPercent,
          value: s.allocatedCapital,
        }));

      metrics = {
        totalExposure: overview.totalValue,
        netExposure: overview.totalValue,
        grossLeverage: 1,
        netLeverage: 1,
        topConcentrations,
      };
      this.exposureMetrics.set(agentId, metrics);
    }
    return metrics;
  }

  private computeRiskScore(
    riskMetrics: RiskMetrics,
    exposureMetrics: ExposureMetrics
  ): number {
    let score = 100;

    // Penalize for max drawdown (up to -40 points)
    score -= Math.min(40, riskMetrics.maxDrawdown * 2);

    // Penalize for high annualized volatility (up to -20 points)
    score -= Math.min(20, riskMetrics.annualizedVolatility * 0.3);

    // Penalize for leverage (up to -20 points)
    const leveragePenalty = Math.max(0, (exposureMetrics.grossLeverage - 1) * 10);
    score -= Math.min(20, leveragePenalty);

    // Reward for positive Sharpe ratio (up to +10 points)
    score += Math.min(10, Math.max(0, riskMetrics.sharpeRatio * 3));

    // Penalize for high concentration
    const maxConcentration = exposureMetrics.topConcentrations.length > 0
      ? Math.max(...exposureMetrics.topConcentrations.map(c => c.exposurePercent))
      : 0;
    if (maxConcentration > this.config.concentrationAlertThreshold) {
      score -= Math.min(20, (maxConcentration - this.config.concentrationAlertThreshold) * 0.5);
    }

    return Math.max(0, Math.min(100, score));
  }

  private computeRiskGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 35) return 'D';
    return 'F';
  }

  private determineSeverity(
    type: AlertType,
    currentValue: number,
    thresholdValue: number
  ): AlertSeverity {
    const ratio = thresholdValue > 0 ? currentValue / thresholdValue : 1;

    if (type === 'circuit_breaker' || type === 'emergency_stop') {
      return 'critical';
    }

    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'error';
    if (ratio >= 1.0) return 'warning';
    return 'info';
  }

  private emitEvent(
    event: Omit<PortfolioAnalyticsEvent, 'id' | 'timestamp'>
  ): void {
    const fullEvent: PortfolioAnalyticsEvent = {
      id: generateId('evt'),
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
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskMonitor(
  config: PortfolioAnalyticsConfig,
  analyticsEngine: DefaultAnalyticsEngine,
  dataModel: DefaultPortfolioDataModel,
  monitorConfig?: Partial<RiskMonitorConfig>
): DefaultRiskMonitor {
  return new DefaultRiskMonitor(config, analyticsEngine, dataModel, monitorConfig);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
