/**
 * TONAIAgent - Ecosystem Flywheel
 *
 * Capital → Innovation → Users → Data → Better Agents → More Capital
 * Metrics tracking and flywheel health monitoring.
 */

import {
  FlywheelConfig,
  FlywheelMetrics,
  CapitalMetrics,
  InnovationMetrics,
  UserMetrics,
  DataMetrics,
  AgentMetrics,
  NetworkMetrics,
  FlywheelScore,
  FlywheelReport,
  FlywheelTrends,
  TrendData,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Flywheel Manager Interface
// ============================================================================

export interface FlywheelManager {
  readonly config: FlywheelConfig;

  // Metrics collection
  collectMetrics(): Promise<FlywheelMetrics>;
  getLatestMetrics(): Promise<FlywheelMetrics | null>;
  getHistoricalMetrics(
    fromDate: Date,
    toDate: Date,
    granularity?: 'hourly' | 'daily' | 'weekly'
  ): Promise<FlywheelMetrics[]>;

  // Individual component metrics
  getCapitalMetrics(): Promise<CapitalMetrics>;
  getInnovationMetrics(): Promise<InnovationMetrics>;
  getUserMetrics(): Promise<UserMetrics>;
  getDataMetrics(): Promise<DataMetrics>;
  getAgentMetrics(): Promise<AgentMetrics>;
  getNetworkMetrics(): Promise<NetworkMetrics>;

  // Flywheel health
  calculateFlywheelScore(): Promise<FlywheelScore>;
  identifyBottleneck(): Promise<string | null>;
  checkAlerts(): Promise<FlywheelAlert[]>;

  // Reporting
  generateReport(period: string): Promise<FlywheelReport>;
  getTrends(period: '7d' | '30d' | '90d'): Promise<FlywheelTrends>;

  // Data input (for testing/simulation)
  updateCapitalMetrics(metrics: Partial<CapitalMetrics>): Promise<void>;
  updateInnovationMetrics(metrics: Partial<InnovationMetrics>): Promise<void>;
  updateUserMetrics(metrics: Partial<UserMetrics>): Promise<void>;
  updateDataMetrics(metrics: Partial<DataMetrics>): Promise<void>;
  updateAgentMetrics(metrics: Partial<AgentMetrics>): Promise<void>;
  updateNetworkMetrics(metrics: Partial<NetworkMetrics>): Promise<void>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface FlywheelAlert {
  id: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultFlywheelManager implements FlywheelManager {
  readonly config: FlywheelConfig;

  private metricsHistory: FlywheelMetrics[] = [];
  private currentCapital: CapitalMetrics;
  private currentInnovation: InnovationMetrics;
  private currentUsers: UserMetrics;
  private currentData: DataMetrics;
  private currentAgents: AgentMetrics;
  private currentNetwork: NetworkMetrics;
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<FlywheelConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      metricsUpdateFrequency: config.metricsUpdateFrequency ?? 'daily',
      dashboardEnabled: config.dashboardEnabled ?? true,
      alertsEnabled: config.alertsEnabled ?? true,
      alertThresholds: config.alertThresholds ?? {
        capitalDeploymentRate: 0.1,
        innovationIndex: 50,
        userGrowthRate: 0.05,
        dataQuality: 0.7,
        agentPerformance: 0.6,
      },
    };

    // Initialize with default metrics
    this.currentCapital = this.getDefaultCapitalMetrics();
    this.currentInnovation = this.getDefaultInnovationMetrics();
    this.currentUsers = this.getDefaultUserMetrics();
    this.currentData = this.getDefaultDataMetrics();
    this.currentAgents = this.getDefaultAgentMetrics();
    this.currentNetwork = this.getDefaultNetworkMetrics();
  }

  private getDefaultCapitalMetrics(): CapitalMetrics {
    return {
      totalFundSize: '10000000',
      deployedCapital: '3000000',
      availableCapital: '7000000',
      capitalInflow30d: '500000',
      capitalOutflow30d: '200000',
      deploymentRate: 0.3,
      returnOnCapital: 0.15,
      capitalEfficiency: 0.85,
    };
  }

  private getDefaultInnovationMetrics(): InnovationMetrics {
    return {
      activeGrants: 25,
      activeInvestments: 10,
      incubationParticipants: 15,
      projectsLaunched: 8,
      patentsOrResearch: 3,
      openSourceContributions: 150,
      technologiesIntegrated: 20,
      innovationIndex: 72,
    };
  }

  private getDefaultUserMetrics(): UserMetrics {
    return {
      totalUsers: 50000,
      activeUsers30d: 15000,
      newUsers30d: 3000,
      userRetention: 0.65,
      userGrowthRate: 0.12,
      developerCount: 500,
      partnerCount: 25,
    };
  }

  private getDefaultDataMetrics(): DataMetrics {
    return {
      dataProviders: 15,
      signalProviders: 30,
      dataQuality: 0.85,
      dataVolume: '500000000',
      uniqueDataSources: 45,
      dataFreshness: 0.95,
    };
  }

  private getDefaultAgentMetrics(): AgentMetrics {
    return {
      totalAgents: 200,
      activeAgents: 150,
      averagePerformance: 0.72,
      tvlManaged: '25000000',
      transactionsExecuted: 100000,
      successRate: 0.85,
    };
  }

  private getDefaultNetworkMetrics(): NetworkMetrics {
    return {
      protocolIntegrations: 20,
      walletIntegrations: 10,
      pluginsAvailable: 50,
      ecosystemProjects: 75,
      networkEffect: 0.78,
    };
  }

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  async collectMetrics(): Promise<FlywheelMetrics> {
    const flywheelScore = await this.calculateFlywheelScore();

    const metrics: FlywheelMetrics = {
      timestamp: new Date(),
      capital: { ...this.currentCapital },
      innovation: { ...this.currentInnovation },
      users: { ...this.currentUsers },
      data: { ...this.currentData },
      agents: { ...this.currentAgents },
      network: { ...this.currentNetwork },
      flywheel: flywheelScore,
    };

    this.metricsHistory.push(metrics);

    // Keep only last 365 days of history
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    this.metricsHistory = this.metricsHistory.filter(
      (m) => m.timestamp >= cutoff
    );

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'metrics_updated',
      category: 'metrics',
      data: { flywheelScore: flywheelScore.overall },
    });

    // Check for alerts
    if (this.config.alertsEnabled) {
      const alerts = await this.checkAlerts();
      for (const alert of alerts) {
        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'flywheel_alert',
          category: 'metrics',
          data: { ...alert } as Record<string, unknown>,
        });
      }
    }

    return metrics;
  }

  async getLatestMetrics(): Promise<FlywheelMetrics | null> {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    return { ...this.metricsHistory[this.metricsHistory.length - 1] };
  }

  async getHistoricalMetrics(
    fromDate: Date,
    toDate: Date,
    _granularity?: 'hourly' | 'daily' | 'weekly'
  ): Promise<FlywheelMetrics[]> {
    return this.metricsHistory.filter(
      (m) => m.timestamp >= fromDate && m.timestamp <= toDate
    );
  }

  // ============================================================================
  // Individual Component Metrics
  // ============================================================================

  async getCapitalMetrics(): Promise<CapitalMetrics> {
    return { ...this.currentCapital };
  }

  async getInnovationMetrics(): Promise<InnovationMetrics> {
    return { ...this.currentInnovation };
  }

  async getUserMetrics(): Promise<UserMetrics> {
    return { ...this.currentUsers };
  }

  async getDataMetrics(): Promise<DataMetrics> {
    return { ...this.currentData };
  }

  async getAgentMetrics(): Promise<AgentMetrics> {
    return { ...this.currentAgents };
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    return { ...this.currentNetwork };
  }

  // ============================================================================
  // Flywheel Health
  // ============================================================================

  async calculateFlywheelScore(): Promise<FlywheelScore> {
    // Calculate individual transition scores (0-100)

    // Capital → Innovation
    const capitalToInnovation =
      (this.currentCapital.deploymentRate * 50) +
      (this.currentInnovation.activeGrants / 50 * 25) +
      (this.currentInnovation.activeInvestments / 20 * 25);

    // Innovation → Users
    const innovationToUsers =
      (this.currentInnovation.projectsLaunched / 20 * 40) +
      (this.currentUsers.userGrowthRate * 300) +
      (this.currentInnovation.technologiesIntegrated / 30 * 20);

    // Users → Data
    const usersToData =
      (this.currentUsers.activeUsers30d / this.currentUsers.totalUsers * 40) +
      (this.currentData.dataProviders / 30 * 30) +
      (this.currentData.dataQuality * 30);

    // Data → Agents
    const dataToAgents =
      (this.currentData.dataQuality * 40) +
      (this.currentAgents.averagePerformance * 30) +
      (this.currentData.dataFreshness * 30);

    // Agents → Capital
    const agentsToCapital =
      (this.currentAgents.successRate * 40) +
      (this.currentCapital.returnOnCapital * 200) +
      (Number(this.currentAgents.tvlManaged) / Number(this.currentCapital.totalFundSize) * 100);

    // Overall score (weighted average)
    const overall =
      (capitalToInnovation * 0.2) +
      (innovationToUsers * 0.2) +
      (usersToData * 0.2) +
      (dataToAgents * 0.2) +
      (agentsToCapital * 0.2);

    // Determine momentum
    let momentum: 'accelerating' | 'stable' | 'decelerating' = 'stable';
    if (this.metricsHistory.length >= 2) {
      const previous = this.metricsHistory[this.metricsHistory.length - 2];
      const previousOverall = previous.flywheel.overall;
      const change = overall - previousOverall;
      if (change > 2) momentum = 'accelerating';
      else if (change < -2) momentum = 'decelerating';
    }

    // Identify bottleneck
    const scores = [
      { name: 'capital_to_innovation', score: capitalToInnovation },
      { name: 'innovation_to_users', score: innovationToUsers },
      { name: 'users_to_data', score: usersToData },
      { name: 'data_to_agents', score: dataToAgents },
      { name: 'agents_to_capital', score: agentsToCapital },
    ];
    scores.sort((a, b) => a.score - b.score);
    const bottleneck = scores[0].score < 50 ? scores[0].name : undefined;

    return {
      overall: Math.min(100, Math.max(0, overall)),
      capitalToInnovation: Math.min(100, Math.max(0, capitalToInnovation)),
      innovationToUsers: Math.min(100, Math.max(0, innovationToUsers)),
      usersToData: Math.min(100, Math.max(0, usersToData)),
      dataToAgents: Math.min(100, Math.max(0, dataToAgents)),
      agentsToCapital: Math.min(100, Math.max(0, agentsToCapital)),
      momentum,
      bottleneck,
    };
  }

  async identifyBottleneck(): Promise<string | null> {
    const score = await this.calculateFlywheelScore();
    return score.bottleneck ?? null;
  }

  async checkAlerts(): Promise<FlywheelAlert[]> {
    const alerts: FlywheelAlert[] = [];
    const thresholds = this.config.alertThresholds;

    if (this.currentCapital.deploymentRate < thresholds.capitalDeploymentRate) {
      alerts.push({
        id: this.generateId('alert'),
        metric: 'capitalDeploymentRate',
        currentValue: this.currentCapital.deploymentRate,
        threshold: thresholds.capitalDeploymentRate,
        severity: this.currentCapital.deploymentRate < thresholds.capitalDeploymentRate / 2
          ? 'critical'
          : 'warning',
        message: 'Capital deployment rate below threshold',
        timestamp: new Date(),
      });
    }

    if (this.currentInnovation.innovationIndex < thresholds.innovationIndex) {
      alerts.push({
        id: this.generateId('alert'),
        metric: 'innovationIndex',
        currentValue: this.currentInnovation.innovationIndex,
        threshold: thresholds.innovationIndex,
        severity: this.currentInnovation.innovationIndex < thresholds.innovationIndex / 2
          ? 'critical'
          : 'warning',
        message: 'Innovation index below threshold',
        timestamp: new Date(),
      });
    }

    if (this.currentUsers.userGrowthRate < thresholds.userGrowthRate) {
      alerts.push({
        id: this.generateId('alert'),
        metric: 'userGrowthRate',
        currentValue: this.currentUsers.userGrowthRate,
        threshold: thresholds.userGrowthRate,
        severity: 'warning',
        message: 'User growth rate below threshold',
        timestamp: new Date(),
      });
    }

    if (this.currentData.dataQuality < thresholds.dataQuality) {
      alerts.push({
        id: this.generateId('alert'),
        metric: 'dataQuality',
        currentValue: this.currentData.dataQuality,
        threshold: thresholds.dataQuality,
        severity: this.currentData.dataQuality < thresholds.dataQuality * 0.8
          ? 'critical'
          : 'warning',
        message: 'Data quality below threshold',
        timestamp: new Date(),
      });
    }

    if (this.currentAgents.averagePerformance < thresholds.agentPerformance) {
      alerts.push({
        id: this.generateId('alert'),
        metric: 'agentPerformance',
        currentValue: this.currentAgents.averagePerformance,
        threshold: thresholds.agentPerformance,
        severity: 'warning',
        message: 'Agent performance below threshold',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  async generateReport(period: string): Promise<FlywheelReport> {
    const metrics = await this.collectMetrics();
    const trends = await this.getTrends('30d');

    const highlights: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Analyze metrics and generate insights
    if (metrics.flywheel.overall > 70) {
      highlights.push('Strong overall flywheel momentum');
    }
    if (metrics.capital.returnOnCapital > 0.15) {
      highlights.push(`Excellent ROC at ${(metrics.capital.returnOnCapital * 100).toFixed(1)}%`);
    }
    if (metrics.users.userGrowthRate > 0.1) {
      highlights.push(`Strong user growth at ${(metrics.users.userGrowthRate * 100).toFixed(1)}%`);
    }

    if (metrics.flywheel.bottleneck) {
      concerns.push(`Bottleneck identified: ${metrics.flywheel.bottleneck}`);
    }
    if (metrics.capital.deploymentRate < 0.2) {
      concerns.push('Low capital deployment rate');
      recommendations.push('Increase grant and investment activity');
    }
    if (metrics.agents.successRate < 0.8) {
      concerns.push('Agent success rate below target');
      recommendations.push('Review underperforming agents and improve AI models');
    }

    if (metrics.flywheel.momentum === 'decelerating') {
      concerns.push('Flywheel momentum is decelerating');
      recommendations.push('Focus on the bottleneck area to restore momentum');
    }

    return {
      id: this.generateId('report'),
      period,
      metrics,
      trends,
      highlights,
      concerns,
      recommendations,
      generatedAt: new Date(),
    };
  }

  async getTrends(period: '7d' | '30d' | '90d'): Promise<FlywheelTrends> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const history = await this.getHistoricalMetrics(fromDate, new Date());

    const calculateTrend = (
      getValue: (m: FlywheelMetrics) => number
    ): TrendData => {
      if (history.length < 2) {
        return {
          direction: 'stable',
          changePercent: 0,
          period,
          dataPoints: [],
        };
      }

      const first = getValue(history[0]);
      const last = getValue(history[history.length - 1]);
      const change = first > 0 ? ((last - first) / first) * 100 : 0;

      return {
        direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
        changePercent: change,
        period,
        dataPoints: history.map((m) => ({
          date: m.timestamp,
          value: getValue(m),
        })),
      };
    };

    return {
      capitalTrend: calculateTrend((m) => m.capital.deploymentRate * 100),
      innovationTrend: calculateTrend((m) => m.innovation.innovationIndex),
      usersTrend: calculateTrend((m) => m.users.userGrowthRate * 100),
      dataTrend: calculateTrend((m) => m.data.dataQuality * 100),
      agentsTrend: calculateTrend((m) => m.agents.averagePerformance * 100),
    };
  }

  // ============================================================================
  // Data Input
  // ============================================================================

  async updateCapitalMetrics(metrics: Partial<CapitalMetrics>): Promise<void> {
    this.currentCapital = { ...this.currentCapital, ...metrics };
  }

  async updateInnovationMetrics(metrics: Partial<InnovationMetrics>): Promise<void> {
    this.currentInnovation = { ...this.currentInnovation, ...metrics };
  }

  async updateUserMetrics(metrics: Partial<UserMetrics>): Promise<void> {
    this.currentUsers = { ...this.currentUsers, ...metrics };
  }

  async updateDataMetrics(metrics: Partial<DataMetrics>): Promise<void> {
    this.currentData = { ...this.currentData, ...metrics };
  }

  async updateAgentMetrics(metrics: Partial<AgentMetrics>): Promise<void> {
    this.currentAgents = { ...this.currentAgents, ...metrics };
  }

  async updateNetworkMetrics(metrics: Partial<NetworkMetrics>): Promise<void> {
    this.currentNetwork = { ...this.currentNetwork, ...metrics };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: EcosystemFundEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFlywheelManager(
  config?: Partial<FlywheelConfig>
): DefaultFlywheelManager {
  return new DefaultFlywheelManager(config);
}
