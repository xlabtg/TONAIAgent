/**
 * Risk Engine — Portfolio Protection System
 * Issue #203: Risk Management Engine
 *
 * Centralized portfolio protection that coordinates all risk controls:
 *   - Real-time risk monitoring
 *   - Automatic drawdown protection
 *   - Daily loss limit enforcement
 *   - Stop-loss coordination
 *   - Agent pause/resume controls
 *
 * This is the main orchestrator that protects both individual agents
 * and the overall portfolio.
 */

import type {
  RiskEngineEvent,
  RiskEngineEventCallback,
  RiskScore,
  RiskCategory,
} from './types';

// ============================================================================
// Portfolio Protection Types
// ============================================================================

export type AgentStatus = 'active' | 'paused' | 'suspended' | 'terminated';

export interface ProtectedAgent {
  /** Agent ID */
  agentId: string;
  /** Current status */
  status: AgentStatus;
  /** Portfolio value in USD */
  portfolioValueUsd: number;
  /** Peak portfolio value (for drawdown calculation) */
  peakValueUsd: number;
  /** Current drawdown percentage */
  currentDrawdownPercent: number;
  /** Today's realized PnL */
  dailyPnlUsd: number;
  /** Today's loss amount */
  dailyLossUsd: number;
  /** Whether trading is disabled due to daily loss limit */
  tradingDisabledToday: boolean;
  /** Risk score (0-100) */
  riskScore: number;
  /** Risk category */
  riskCategory: RiskCategory;
  /** Reason for current status (if paused/suspended) */
  statusReason?: string;
  /** When agent was last updated */
  lastUpdatedAt: Date;
  /** Associated strategies */
  strategyIds: string[];
}

export interface ProtectionMetrics {
  /** Total protected agents */
  totalAgents: number;
  /** Active agents */
  activeAgents: number;
  /** Paused agents */
  pausedAgents: number;
  /** Suspended agents */
  suspendedAgents: number;
  /** Total portfolio value across all agents */
  totalPortfolioValueUsd: number;
  /** Total daily loss across all agents */
  totalDailyLossUsd: number;
  /** Agents with trading disabled today */
  agentsWithTradingDisabled: number;
  /** Average risk score across all agents */
  averageRiskScore: number;
  /** System-wide risk category */
  systemRiskCategory: RiskCategory;
  /** Metrics timestamp */
  timestamp: Date;
}

export interface ProtectionAlert {
  /** Alert ID */
  alertId: string;
  /** Alert type */
  type: 'drawdown_warning' | 'drawdown_breach' | 'daily_loss_warning' | 'daily_loss_breach' | 'agent_paused' | 'agent_suspended';
  /** Affected agent ID */
  agentId: string;
  /** Alert severity */
  severity: 'warning' | 'critical' | 'emergency';
  /** Alert message */
  message: string;
  /** Current value that triggered alert */
  currentValue: number;
  /** Threshold that was breached/approached */
  threshold: number;
  /** Recommended action */
  recommendedAction: string;
  /** Alert timestamp */
  timestamp: Date;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}

export interface PortfolioProtectionConfig {
  /** Maximum drawdown before pausing agent (default: 15%) */
  maxDrawdownPercent: number;
  /** Warning threshold for drawdown (default: 10%) */
  drawdownWarningPercent: number;
  /** Daily loss limit (default: 3%) */
  dailyLossLimitPercent: number;
  /** Warning threshold for daily loss (default: 2%) */
  dailyLossWarningPercent: number;
  /** Enable automatic agent pausing */
  enableAutoPause: boolean;
  /** Enable automatic agent suspension on critical risk */
  enableAutoSuspend: boolean;
  /** Risk score threshold for suspension (default: 85) */
  suspensionRiskThreshold: number;
  /** Risk score threshold for warning (default: 60) */
  warningRiskThreshold: number;
}

export const DEFAULT_PORTFOLIO_PROTECTION_CONFIG: PortfolioProtectionConfig = {
  maxDrawdownPercent: 15,
  drawdownWarningPercent: 10,
  dailyLossLimitPercent: 3,
  dailyLossWarningPercent: 2,
  enableAutoPause: true,
  enableAutoSuspend: true,
  suspensionRiskThreshold: 85,
  warningRiskThreshold: 60,
};

// ============================================================================
// Portfolio Protection Interface
// ============================================================================

export interface PortfolioProtection {
  /** Register an agent for protection */
  registerAgent(agentId: string, initialValueUsd: number, strategyIds?: string[]): ProtectedAgent;
  /** Update agent portfolio value and check protections */
  updateAgent(agentId: string, currentValueUsd: number, dailyPnlUsd?: number): ProtectedAgent;
  /** Get a protected agent */
  getAgent(agentId: string): ProtectedAgent | undefined;
  /** Get all protected agents */
  getAllAgents(): ProtectedAgent[];
  /** Pause an agent */
  pauseAgent(agentId: string, reason: string): void;
  /** Resume a paused agent */
  resumeAgent(agentId: string): void;
  /** Suspend an agent (requires manual review to resume) */
  suspendAgent(agentId: string, reason: string): void;
  /** Check all protections and return alerts */
  checkProtections(): ProtectionAlert[];
  /** Get active alerts */
  getActiveAlerts(): ProtectionAlert[];
  /** Acknowledge an alert */
  acknowledgeAlert(alertId: string): void;
  /** Get protection metrics */
  getMetrics(): ProtectionMetrics;
  /** Reset daily counters (call at day boundary) */
  resetDailyCounters(): void;
  /** Get configuration */
  getConfig(): PortfolioProtectionConfig;
  /** Update configuration */
  updateConfig(config: Partial<PortfolioProtectionConfig>): void;
  /** Subscribe to protection events */
  onEvent(callback: RiskEngineEventCallback): void;
}

// ============================================================================
// Default Portfolio Protection Implementation
// ============================================================================

export class DefaultPortfolioProtection implements PortfolioProtection {
  private config: PortfolioProtectionConfig;
  private readonly agents = new Map<string, ProtectedAgent>();
  private readonly alerts: ProtectionAlert[] = [];
  private readonly eventCallbacks: RiskEngineEventCallback[] = [];
  private alertCounter = 0;

  constructor(config?: Partial<PortfolioProtectionConfig>) {
    this.config = { ...DEFAULT_PORTFOLIO_PROTECTION_CONFIG, ...config };
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

  registerAgent(
    agentId: string,
    initialValueUsd: number,
    strategyIds: string[] = [],
  ): ProtectedAgent {
    const agent: ProtectedAgent = {
      agentId,
      status: 'active',
      portfolioValueUsd: initialValueUsd,
      peakValueUsd: initialValueUsd,
      currentDrawdownPercent: 0,
      dailyPnlUsd: 0,
      dailyLossUsd: 0,
      tradingDisabledToday: false,
      riskScore: 0,
      riskCategory: 'low',
      lastUpdatedAt: new Date(),
      strategyIds,
    };

    this.agents.set(agentId, agent);

    this.emitEvent({
      type: 'exposure_updated',
      payload: {
        event: 'agent_registered',
        agentId,
        initialValueUsd,
        strategyIds,
      },
    });

    return agent;
  }

  updateAgent(
    agentId: string,
    currentValueUsd: number,
    dailyPnlUsd?: number,
  ): ProtectedAgent {
    let agent = this.agents.get(agentId);
    if (!agent) {
      agent = this.registerAgent(agentId, currentValueUsd);
    }

    // Update portfolio value
    const previousValue = agent.portfolioValueUsd;
    agent.portfolioValueUsd = currentValueUsd;

    // Update peak value
    if (currentValueUsd > agent.peakValueUsd) {
      agent.peakValueUsd = currentValueUsd;
    }

    // Calculate drawdown
    agent.currentDrawdownPercent =
      agent.peakValueUsd > 0
        ? ((agent.peakValueUsd - currentValueUsd) / agent.peakValueUsd) * 100
        : 0;

    // Update daily PnL
    if (dailyPnlUsd !== undefined) {
      agent.dailyPnlUsd = dailyPnlUsd;
      if (dailyPnlUsd < 0) {
        agent.dailyLossUsd = Math.abs(dailyPnlUsd);
      }
    } else {
      // Infer from value change
      const valueDelta = currentValueUsd - previousValue;
      agent.dailyPnlUsd += valueDelta;
      if (valueDelta < 0) {
        agent.dailyLossUsd += Math.abs(valueDelta);
      }
    }

    // Calculate risk score
    agent.riskScore = this.calculateRiskScore(agent);
    agent.riskCategory = this.scoreToCategory(agent.riskScore);

    agent.lastUpdatedAt = new Date();

    // Check protections
    this.checkAgentProtections(agent);

    return agent;
  }

  getAgent(agentId: string): ProtectedAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): ProtectedAgent[] {
    return Array.from(this.agents.values());
  }

  pauseAgent(agentId: string, reason: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.status === 'active') {
      agent.status = 'paused';
      agent.statusReason = reason;

      this.createAlert(
        'agent_paused',
        agentId,
        'warning',
        `Agent ${agentId} paused: ${reason}`,
        0,
        0,
        'Review agent configuration and resume when ready',
      );

      this.emitEvent({
        type: 'risk_response_triggered',
        payload: {
          event: 'agent_paused',
          agentId,
          reason,
        },
      });
    }
  }

  resumeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.status === 'paused') {
      // Check if it's safe to resume
      if (agent.tradingDisabledToday) {
        return; // Cannot resume while daily limit is in effect
      }
      if (agent.currentDrawdownPercent >= this.config.maxDrawdownPercent) {
        return; // Cannot resume while drawdown exceeds limit
      }

      agent.status = 'active';
      agent.statusReason = undefined;

      this.emitEvent({
        type: 'exposure_updated',
        payload: {
          event: 'agent_resumed',
          agentId,
        },
      });
    }
  }

  suspendAgent(agentId: string, reason: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    if (agent.status !== 'terminated') {
      agent.status = 'suspended';
      agent.statusReason = reason;

      this.createAlert(
        'agent_suspended',
        agentId,
        'emergency',
        `Agent ${agentId} suspended: ${reason}`,
        agent.riskScore,
        this.config.suspensionRiskThreshold,
        'Manual review required before resuming',
      );

      this.emitEvent({
        type: 'risk_response_triggered',
        payload: {
          event: 'agent_suspended',
          agentId,
          reason,
        },
      });
    }
  }

  checkProtections(): ProtectionAlert[] {
    const newAlerts: ProtectionAlert[] = [];

    for (const agent of this.agents.values()) {
      const alerts = this.checkAgentProtections(agent);
      newAlerts.push(...alerts);
    }

    return newAlerts;
  }

  private checkAgentProtections(agent: ProtectedAgent): ProtectionAlert[] {
    const alerts: ProtectionAlert[] = [];

    // Check drawdown
    if (agent.currentDrawdownPercent >= this.config.maxDrawdownPercent) {
      if (agent.status === 'active' && this.config.enableAutoPause) {
        this.pauseAgent(agent.agentId, `Drawdown ${agent.currentDrawdownPercent.toFixed(2)}% exceeded max ${this.config.maxDrawdownPercent}%`);
      }
      alerts.push(
        this.createAlert(
          'drawdown_breach',
          agent.agentId,
          'critical',
          `Drawdown ${agent.currentDrawdownPercent.toFixed(2)}% exceeded max ${this.config.maxDrawdownPercent}%`,
          agent.currentDrawdownPercent,
          this.config.maxDrawdownPercent,
          'Agent paused. Reduce exposure or wait for recovery.',
        ),
      );
    } else if (agent.currentDrawdownPercent >= this.config.drawdownWarningPercent) {
      alerts.push(
        this.createAlert(
          'drawdown_warning',
          agent.agentId,
          'warning',
          `Drawdown ${agent.currentDrawdownPercent.toFixed(2)}% approaching limit of ${this.config.maxDrawdownPercent}%`,
          agent.currentDrawdownPercent,
          this.config.maxDrawdownPercent,
          'Consider reducing position sizes or hedging.',
        ),
      );
    }

    // Check daily loss limit
    const dailyLossPercent = agent.peakValueUsd > 0
      ? (agent.dailyLossUsd / agent.peakValueUsd) * 100
      : 0;

    if (dailyLossPercent >= this.config.dailyLossLimitPercent) {
      if (!agent.tradingDisabledToday) {
        agent.tradingDisabledToday = true;
        alerts.push(
          this.createAlert(
            'daily_loss_breach',
            agent.agentId,
            'critical',
            `Daily loss ${dailyLossPercent.toFixed(2)}% exceeded limit of ${this.config.dailyLossLimitPercent}%`,
            dailyLossPercent,
            this.config.dailyLossLimitPercent,
            'Trading disabled until tomorrow.',
          ),
        );

        this.emitEvent({
          type: 'risk_response_triggered',
          payload: {
            event: 'daily_loss_limit_triggered',
            agentId: agent.agentId,
            dailyLossPercent,
            threshold: this.config.dailyLossLimitPercent,
          },
        });
      }
    } else if (dailyLossPercent >= this.config.dailyLossWarningPercent) {
      alerts.push(
        this.createAlert(
          'daily_loss_warning',
          agent.agentId,
          'warning',
          `Daily loss ${dailyLossPercent.toFixed(2)}% approaching limit of ${this.config.dailyLossLimitPercent}%`,
          dailyLossPercent,
          this.config.dailyLossLimitPercent,
          'Consider reducing trade sizes for remaining day.',
        ),
      );
    }

    // Check risk score for suspension (suspension takes priority over pause)
    if (agent.riskScore >= this.config.suspensionRiskThreshold) {
      if ((agent.status === 'active' || agent.status === 'paused') && this.config.enableAutoSuspend) {
        this.suspendAgent(
          agent.agentId,
          `Risk score ${agent.riskScore} exceeded suspension threshold ${this.config.suspensionRiskThreshold}`,
        );
      }
    }

    return alerts;
  }

  getActiveAlerts(): ProtectionAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  getMetrics(): ProtectionMetrics {
    const agents = Array.from(this.agents.values());

    const totalPortfolioValueUsd = agents.reduce((sum, a) => sum + a.portfolioValueUsd, 0);
    const totalDailyLossUsd = agents.reduce((sum, a) => sum + a.dailyLossUsd, 0);
    const averageRiskScore = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.riskScore, 0) / agents.length
      : 0;

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      pausedAgents: agents.filter(a => a.status === 'paused').length,
      suspendedAgents: agents.filter(a => a.status === 'suspended').length,
      totalPortfolioValueUsd,
      totalDailyLossUsd,
      agentsWithTradingDisabled: agents.filter(a => a.tradingDisabledToday).length,
      averageRiskScore: Math.round(averageRiskScore),
      systemRiskCategory: this.scoreToCategory(averageRiskScore),
      timestamp: new Date(),
    };
  }

  resetDailyCounters(): void {
    for (const agent of this.agents.values()) {
      agent.dailyPnlUsd = 0;
      agent.dailyLossUsd = 0;
      agent.tradingDisabledToday = false;
    }

    this.emitEvent({
      type: 'exposure_updated',
      payload: {
        event: 'daily_counters_reset',
        agentCount: this.agents.size,
      },
    });
  }

  getConfig(): PortfolioProtectionConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PortfolioProtectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateRiskScore(agent: ProtectedAgent): number {
    // Weighted components:
    // - Drawdown: 40%
    // - Daily loss: 30%
    // - Portfolio concentration (using drawdown as proxy): 30%

    const drawdownScore = Math.min(
      (agent.currentDrawdownPercent / this.config.maxDrawdownPercent) * 100,
      100,
    );

    const dailyLossPercent = agent.peakValueUsd > 0
      ? (agent.dailyLossUsd / agent.peakValueUsd) * 100
      : 0;
    const dailyLossScore = Math.min(
      (dailyLossPercent / this.config.dailyLossLimitPercent) * 100,
      100,
    );

    // Simple volatility proxy: larger drawdowns indicate higher volatility
    const volatilityScore = drawdownScore;

    const score =
      drawdownScore * 0.4 +
      dailyLossScore * 0.3 +
      volatilityScore * 0.3;

    return Math.min(Math.max(Math.round(score), 0), 100);
  }

  private scoreToCategory(score: number): RiskCategory {
    if (score <= 30) return 'low';
    if (score <= 60) return 'moderate';
    if (score <= 80) return 'high';
    return 'critical';
  }

  private createAlert(
    type: ProtectionAlert['type'],
    agentId: string,
    severity: ProtectionAlert['severity'],
    message: string,
    currentValue: number,
    threshold: number,
    recommendedAction: string,
  ): ProtectionAlert {
    const alert: ProtectionAlert = {
      alertId: `alert_${++this.alertCounter}_${Date.now()}`,
      type,
      agentId,
      severity,
      message,
      currentValue,
      threshold,
      recommendedAction,
      timestamp: new Date(),
      acknowledged: false,
    };

    // Avoid duplicate alerts
    const existingAlert = this.alerts.find(
      a => a.type === type && a.agentId === agentId && !a.acknowledged,
    );

    if (!existingAlert) {
      this.alerts.push(alert);

      this.emitEvent({
        type: 'drawdown_alert',
        payload: {
          alertId: alert.alertId,
          alertType: type,
          agentId,
          severity,
          message,
          currentValue,
          threshold,
        },
      });
    }

    return alert;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioProtection(
  config?: Partial<PortfolioProtectionConfig>,
): DefaultPortfolioProtection {
  return new DefaultPortfolioProtection(config);
}
