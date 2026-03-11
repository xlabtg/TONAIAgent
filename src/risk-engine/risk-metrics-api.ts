/**
 * Risk Engine — Risk Metrics API
 * Issue #203: Risk Management Engine
 *
 * Real-time risk metrics API for monitoring and dashboard integration.
 * Provides unified access to all risk metrics including:
 *   - Portfolio exposure
 *   - Strategy risk ratings
 *   - Drawdown status
 *   - Daily loss tracking
 *   - Active risk controls
 *
 * This API is designed for integration with:
 *   - Portfolio Analytics Dashboard
 *   - Telegram Mini App Risk Dashboard
 *   - Strategy Marketplace (risk score display)
 */

import type {
  RiskScore,
  RiskCategory,
  StrategyRiskProfile,
  PortfolioExposureSnapshot,
  RiskDashboardMetrics,
} from './types';

// ============================================================================
// API Response Types
// ============================================================================

export interface RiskMetricsSnapshot {
  /** Snapshot timestamp */
  timestamp: Date;
  /** Overall portfolio metrics */
  portfolio: PortfolioRiskMetrics;
  /** Individual agent metrics */
  agents: AgentRiskMetrics[];
  /** Strategy risk ratings */
  strategies: StrategyRiskMetrics[];
  /** Active alerts and warnings */
  alerts: RiskAlertSummary;
  /** Active risk controls */
  activeControls: ActiveRiskControls;
}

export interface PortfolioRiskMetrics {
  /** Total portfolio value in USD */
  totalValueUsd: number;
  /** Current drawdown from peak */
  currentDrawdownPercent: number;
  /** Today's PnL in USD */
  dailyPnlUsd: number;
  /** Today's loss in USD */
  dailyLossUsd: number;
  /** Overall risk score (0-100) */
  riskScore: number;
  /** Risk level category */
  riskLevel: RiskCategory;
  /** Number of open positions */
  openPositions: number;
  /** Total exposure across all assets */
  totalExposurePercent: number;
  /** Highest single asset exposure */
  maxAssetExposurePercent: number;
  /** Asset with highest exposure */
  maxExposureAsset?: string;
}

export interface AgentRiskMetrics {
  /** Agent ID */
  agentId: string;
  /** Agent name (if available) */
  name?: string;
  /** Current status */
  status: 'active' | 'paused' | 'suspended' | 'terminated';
  /** Portfolio value */
  valueUsd: number;
  /** Current drawdown */
  drawdownPercent: number;
  /** Daily PnL */
  dailyPnlUsd: number;
  /** Risk score */
  riskScore: number;
  /** Risk level */
  riskLevel: RiskCategory;
  /** Whether trading is disabled today */
  tradingDisabled: boolean;
  /** Active strategies */
  strategies: string[];
  /** Last update time */
  lastUpdated: Date;
}

export interface StrategyRiskMetrics {
  /** Strategy ID */
  strategyId: string;
  /** Strategy name */
  name: string;
  /** Risk score (0-100) */
  riskScore: number;
  /** Risk level */
  riskLevel: RiskCategory;
  /** Maximum drawdown from history */
  maxDrawdown: number;
  /** Volatility metric */
  volatility: number;
  /** Number of active users */
  activeUsers: number;
  /** Marketplace risk label */
  marketplaceLabel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Experimental';
}

export interface RiskAlertSummary {
  /** Total active alerts */
  totalActive: number;
  /** Critical alerts */
  critical: number;
  /** Warning alerts */
  warnings: number;
  /** Most recent alerts */
  recentAlerts: RecentAlert[];
}

export interface RecentAlert {
  /** Alert ID */
  alertId: string;
  /** Alert type */
  type: string;
  /** Severity */
  severity: 'warning' | 'critical' | 'emergency';
  /** Affected entity */
  entityId: string;
  /** Alert message */
  message: string;
  /** When alert was created */
  timestamp: Date;
}

export interface ActiveRiskControls {
  /** Stop-loss enabled */
  stopLossEnabled: boolean;
  /** Default stop-loss percentage */
  stopLossPercent: number;
  /** Max position size percentage */
  maxPositionSizePercent: number;
  /** Max asset exposure percentage */
  maxAssetExposurePercent: number;
  /** Max drawdown percentage */
  maxDrawdownPercent: number;
  /** Daily loss limit percentage */
  dailyLossLimitPercent: number;
  /** Auto-pause enabled */
  autoPauseEnabled: boolean;
  /** Auto-suspend enabled */
  autoSuspendEnabled: boolean;
}

// ============================================================================
// User-Facing Risk Overview (for Telegram Mini App)
// ============================================================================

export interface UserRiskOverview {
  /** User-friendly risk level (Low, Medium, High) */
  portfolioRiskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  /** Colored indicator for UI (green, yellow, orange, red) */
  riskColor: 'green' | 'yellow' | 'orange' | 'red';
  /** Current drawdown as formatted string */
  drawdownDisplay: string;
  /** Open exposure as formatted string */
  exposureDisplay: string;
  /** Active risk controls summary */
  activeControlsSummary: string;
  /** Quick actions available */
  quickActions: QuickRiskAction[];
  /** Risk tips/warnings */
  tips: string[];
}

export interface QuickRiskAction {
  /** Action ID */
  id: string;
  /** Action label */
  label: string;
  /** Action type */
  type: 'configure' | 'pause' | 'reduce' | 'view';
  /** Whether action is recommended */
  recommended: boolean;
}

// ============================================================================
// Strategy Marketplace Risk Score Integration
// ============================================================================

export interface MarketplaceRiskRating {
  /** Strategy ID */
  strategyId: string;
  /** Risk score (0-100) */
  score: number;
  /** Risk label for display */
  label: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Experimental';
  /** Detailed risk factors */
  factors: RiskFactor[];
  /** Risk score color */
  color: 'green' | 'yellow' | 'orange' | 'red';
  /** Should be displayed prominently in marketplace */
  displayInMarketplace: boolean;
  /** Last calculated */
  calculatedAt: Date;
}

export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Factor value (0-100) */
  value: number;
  /** Impact on overall score */
  impact: 'low' | 'medium' | 'high';
  /** Description */
  description: string;
}

// ============================================================================
// Risk Metrics API Interface
// ============================================================================

export interface RiskMetricsAPI {
  /** Get full risk metrics snapshot */
  getSnapshot(): RiskMetricsSnapshot;
  /** Get portfolio-level metrics */
  getPortfolioMetrics(): PortfolioRiskMetrics;
  /** Get metrics for a specific agent */
  getAgentMetrics(agentId: string): AgentRiskMetrics | undefined;
  /** Get all agent metrics */
  getAllAgentMetrics(): AgentRiskMetrics[];
  /** Get strategy risk rating */
  getStrategyRiskRating(strategyId: string): StrategyRiskMetrics | undefined;
  /** Get all strategy ratings */
  getAllStrategyRatings(): StrategyRiskMetrics[];
  /** Get active alerts summary */
  getAlertsSummary(): RiskAlertSummary;
  /** Get active risk controls */
  getActiveControls(): ActiveRiskControls;
  /** Get user-friendly risk overview (for Mini App) */
  getUserRiskOverview(): UserRiskOverview;
  /** Get marketplace risk rating for a strategy */
  getMarketplaceRating(strategyId: string): MarketplaceRiskRating | undefined;
  /** Calculate marketplace rating for a strategy */
  calculateMarketplaceRating(
    strategyId: string,
    profile: StrategyRiskProfile,
  ): MarketplaceRiskRating;
}

// ============================================================================
// Default Risk Metrics API Implementation
// ============================================================================

export class DefaultRiskMetricsAPI implements RiskMetricsAPI {
  private portfolioMetrics: PortfolioRiskMetrics;
  private readonly agentMetrics = new Map<string, AgentRiskMetrics>();
  private readonly strategyRatings = new Map<string, StrategyRiskMetrics>();
  private readonly marketplaceRatings = new Map<string, MarketplaceRiskRating>();
  private readonly recentAlerts: RecentAlert[] = [];
  private activeControls: ActiveRiskControls;

  constructor() {
    this.portfolioMetrics = this.createDefaultPortfolioMetrics();
    this.activeControls = this.createDefaultActiveControls();
  }

  getSnapshot(): RiskMetricsSnapshot {
    return {
      timestamp: new Date(),
      portfolio: this.portfolioMetrics,
      agents: Array.from(this.agentMetrics.values()),
      strategies: Array.from(this.strategyRatings.values()),
      alerts: this.getAlertsSummary(),
      activeControls: this.activeControls,
    };
  }

  getPortfolioMetrics(): PortfolioRiskMetrics {
    return { ...this.portfolioMetrics };
  }

  updatePortfolioMetrics(metrics: Partial<PortfolioRiskMetrics>): void {
    this.portfolioMetrics = { ...this.portfolioMetrics, ...metrics };
  }

  getAgentMetrics(agentId: string): AgentRiskMetrics | undefined {
    return this.agentMetrics.get(agentId);
  }

  getAllAgentMetrics(): AgentRiskMetrics[] {
    return Array.from(this.agentMetrics.values());
  }

  updateAgentMetrics(agentId: string, metrics: Partial<AgentRiskMetrics>): void {
    const existing = this.agentMetrics.get(agentId);
    if (existing) {
      this.agentMetrics.set(agentId, { ...existing, ...metrics, lastUpdated: new Date() });
    } else {
      this.agentMetrics.set(agentId, {
        agentId,
        status: 'active',
        valueUsd: 0,
        drawdownPercent: 0,
        dailyPnlUsd: 0,
        riskScore: 0,
        riskLevel: 'low',
        tradingDisabled: false,
        strategies: [],
        lastUpdated: new Date(),
        ...metrics,
      });
    }
  }

  getStrategyRiskRating(strategyId: string): StrategyRiskMetrics | undefined {
    return this.strategyRatings.get(strategyId);
  }

  getAllStrategyRatings(): StrategyRiskMetrics[] {
    return Array.from(this.strategyRatings.values());
  }

  updateStrategyRating(strategyId: string, rating: Partial<StrategyRiskMetrics>): void {
    const existing = this.strategyRatings.get(strategyId);
    if (existing) {
      this.strategyRatings.set(strategyId, { ...existing, ...rating });
    } else {
      this.strategyRatings.set(strategyId, {
        strategyId,
        name: strategyId,
        riskScore: 0,
        riskLevel: 'low',
        maxDrawdown: 0,
        volatility: 0,
        activeUsers: 0,
        marketplaceLabel: 'Low Risk',
        ...rating,
      });
    }
  }

  getAlertsSummary(): RiskAlertSummary {
    const criticalCount = this.recentAlerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
    const warningCount = this.recentAlerts.filter(a => a.severity === 'warning').length;

    return {
      totalActive: this.recentAlerts.length,
      critical: criticalCount,
      warnings: warningCount,
      recentAlerts: this.recentAlerts.slice(0, 10),
    };
  }

  addAlert(alert: Omit<RecentAlert, 'alertId'>): void {
    this.recentAlerts.unshift({
      alertId: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...alert,
    });

    // Keep only last 100 alerts
    while (this.recentAlerts.length > 100) {
      this.recentAlerts.pop();
    }
  }

  clearAlert(alertId: string): void {
    const index = this.recentAlerts.findIndex(a => a.alertId === alertId);
    if (index >= 0) {
      this.recentAlerts.splice(index, 1);
    }
  }

  getActiveControls(): ActiveRiskControls {
    return { ...this.activeControls };
  }

  updateActiveControls(controls: Partial<ActiveRiskControls>): void {
    this.activeControls = { ...this.activeControls, ...controls };
  }

  getUserRiskOverview(): UserRiskOverview {
    const metrics = this.portfolioMetrics;

    // Determine risk level and color
    let portfolioRiskLevel: UserRiskOverview['portfolioRiskLevel'];
    let riskColor: UserRiskOverview['riskColor'];

    if (metrics.riskScore <= 30) {
      portfolioRiskLevel = 'Low';
      riskColor = 'green';
    } else if (metrics.riskScore <= 60) {
      portfolioRiskLevel = 'Medium';
      riskColor = 'yellow';
    } else if (metrics.riskScore <= 80) {
      portfolioRiskLevel = 'High';
      riskColor = 'orange';
    } else {
      portfolioRiskLevel = 'Critical';
      riskColor = 'red';
    }

    // Format display strings
    const drawdownDisplay = `${metrics.currentDrawdownPercent.toFixed(1)}%`;
    const exposureDisplay = `${metrics.totalExposurePercent.toFixed(0)}%`;

    // Build controls summary
    const controlsList: string[] = [];
    if (this.activeControls.stopLossEnabled) {
      controlsList.push(`Stop-loss: ${this.activeControls.stopLossPercent}%`);
    }
    controlsList.push(`Max position: ${this.activeControls.maxPositionSizePercent}%`);
    controlsList.push(`Daily limit: ${this.activeControls.dailyLossLimitPercent}%`);
    const activeControlsSummary = controlsList.join(' | ');

    // Build quick actions
    const quickActions: QuickRiskAction[] = [
      {
        id: 'configure_limits',
        label: 'Configure Risk Limits',
        type: 'configure',
        recommended: false,
      },
      {
        id: 'view_positions',
        label: 'View Open Positions',
        type: 'view',
        recommended: true,
      },
    ];

    if (metrics.riskScore > 60) {
      quickActions.push({
        id: 'reduce_exposure',
        label: 'Reduce Exposure',
        type: 'reduce',
        recommended: true,
      });
    }

    // Build tips
    const tips: string[] = [];
    if (metrics.currentDrawdownPercent > 10) {
      tips.push('Consider reducing position sizes during drawdown');
    }
    if (metrics.currentDrawdownPercent > 5) {
      tips.push('Monitor drawdown levels closely');
    }
    if (metrics.maxAssetExposurePercent > 40) {
      tips.push('High concentration in single asset - consider diversifying');
    }
    if (metrics.totalExposurePercent > 50) {
      tips.push('Portfolio exposure is elevated - consider rebalancing');
    }
    if (metrics.dailyLossUsd > 0) {
      tips.push('Monitor daily losses to avoid hitting daily limit');
    }
    if (metrics.riskScore > 30) {
      tips.push('Risk level is elevated - review your position sizes');
    }

    return {
      portfolioRiskLevel,
      riskColor,
      drawdownDisplay,
      exposureDisplay,
      activeControlsSummary,
      quickActions,
      tips,
    };
  }

  getMarketplaceRating(strategyId: string): MarketplaceRiskRating | undefined {
    return this.marketplaceRatings.get(strategyId);
  }

  calculateMarketplaceRating(
    strategyId: string,
    profile: StrategyRiskProfile,
  ): MarketplaceRiskRating {
    const score = profile.riskScore.value;

    // Determine label and color
    let label: MarketplaceRiskRating['label'];
    let color: MarketplaceRiskRating['color'];

    if (score <= 30) {
      label = 'Low Risk';
      color = 'green';
    } else if (score <= 60) {
      label = 'Medium Risk';
      color = 'yellow';
    } else if (score <= 80) {
      label = 'High Risk';
      color = 'orange';
    } else {
      label = 'Experimental';
      color = 'red';
    }

    // Build risk factors
    const factors: RiskFactor[] = [
      {
        name: 'Volatility',
        value: Math.round(profile.volatility * 100),
        impact: profile.volatility > 0.5 ? 'high' : profile.volatility > 0.25 ? 'medium' : 'low',
        description: `${(profile.volatility * 100).toFixed(1)}% annualized volatility`,
      },
      {
        name: 'Max Drawdown',
        value: Math.round(profile.maxDrawdown * 100),
        impact: profile.maxDrawdown > 0.3 ? 'high' : profile.maxDrawdown > 0.15 ? 'medium' : 'low',
        description: `${(profile.maxDrawdown * 100).toFixed(1)}% historical max drawdown`,
      },
      {
        name: 'Leverage',
        value: Math.min(Math.round((profile.leverageRatio / 10) * 100), 100),
        impact: profile.leverageRatio > 5 ? 'high' : profile.leverageRatio > 2 ? 'medium' : 'low',
        description: `${profile.leverageRatio.toFixed(1)}x leverage used`,
      },
      {
        name: 'Concentration',
        value: Math.round(profile.assetConcentration * 100),
        impact: profile.assetConcentration > 0.6 ? 'high' : profile.assetConcentration > 0.3 ? 'medium' : 'low',
        description: `${(profile.assetConcentration * 100).toFixed(0)}% in top asset`,
      },
    ];

    const rating: MarketplaceRiskRating = {
      strategyId,
      score,
      label,
      factors,
      color,
      displayInMarketplace: true,
      calculatedAt: new Date(),
    };

    this.marketplaceRatings.set(strategyId, rating);

    return rating;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createDefaultPortfolioMetrics(): PortfolioRiskMetrics {
    return {
      totalValueUsd: 0,
      currentDrawdownPercent: 0,
      dailyPnlUsd: 0,
      dailyLossUsd: 0,
      riskScore: 0,
      riskLevel: 'low',
      openPositions: 0,
      totalExposurePercent: 0,
      maxAssetExposurePercent: 0,
    };
  }

  private createDefaultActiveControls(): ActiveRiskControls {
    return {
      stopLossEnabled: true,
      stopLossPercent: 5,
      maxPositionSizePercent: 5,
      maxAssetExposurePercent: 20,
      maxDrawdownPercent: 15,
      dailyLossLimitPercent: 3,
      autoPauseEnabled: true,
      autoSuspendEnabled: true,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRiskMetricsAPI(): DefaultRiskMetricsAPI {
  return new DefaultRiskMetricsAPI();
}
