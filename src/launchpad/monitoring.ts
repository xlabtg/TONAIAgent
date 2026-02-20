/**
 * TONAIAgent - Monitoring & Analytics Dashboard
 *
 * Real-time monitoring, metrics collection, and analytics
 * for treasury operations, agent performance, and capital flows.
 */

import {
  LaunchpadDashboard,
  DashboardOverview,
  TreasuryMetrics,
  AgentMetrics,
  CapitalMetrics,
  GovernanceMetrics,
  RiskMetrics,
  RiskItem,
  DashboardAlert,
  AlertType,
  AlertAction,
  TreasuryAgent,
  CapitalPool,
  GovernanceProposal,
  Holding,
  LaunchpadEvent,
  LaunchpadEventCallback,
} from './types';

// ============================================================================
// Monitoring Manager Interface
// ============================================================================

export interface MonitoringManager {
  // Dashboard
  getDashboard(organizationId: string): Promise<LaunchpadDashboard>;
  refreshDashboard(organizationId: string): Promise<LaunchpadDashboard>;

  // Metrics
  getTreasuryMetrics(organizationId: string): TreasuryMetrics;
  getAgentMetrics(organizationId: string): AgentMetrics;
  getCapitalMetrics(organizationId: string): CapitalMetrics;
  getGovernanceMetrics(organizationId: string): GovernanceMetrics;
  getRiskMetrics(organizationId: string): RiskMetrics;

  // Alerts
  getAlerts(organizationId: string, filters?: AlertFilters): DashboardAlert[];
  createAlert(input: CreateAlertInput): DashboardAlert;
  acknowledgeAlert(alertId: string): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;

  // Data ingestion
  recordAgentData(agentId: string, data: AgentDataPoint): void;
  recordPoolData(poolId: string, data: PoolDataPoint): void;
  recordTreasuryTransaction(orgId: string, transaction: TransactionRecord): void;

  // Historical data
  getHistoricalMetrics(orgId: string, metric: string, days: number): HistoricalDataPoint[];

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface AlertFilters {
  type?: AlertType[];
  severity?: DashboardAlert['severity'][];
  acknowledged?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateAlertInput {
  organizationId: string;
  type: AlertType;
  severity: DashboardAlert['severity'];
  title: string;
  message: string;
  source: string;
  actionRequired?: boolean;
  action?: AlertAction;
}

export interface AgentDataPoint {
  timestamp: Date;
  totalValue: number;
  pnl: number;
  transactionCount: number;
  errorCount: number;
  status: string;
}

export interface PoolDataPoint {
  timestamp: Date;
  totalCapital: number;
  availableCapital: number;
  allocatedCapital: number;
  contributorCount: number;
  returns: number;
}

export interface TransactionRecord {
  id: string;
  type: 'deposit' | 'withdrawal' | 'swap' | 'stake' | 'unstake' | 'claim' | 'fee';
  amount: number;
  token: string;
  timestamp: Date;
  agentId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Default Monitoring Manager Implementation
// ============================================================================

export interface MonitoringManagerConfig {
  alertRetentionDays?: number;
  metricsRetentionDays?: number;
  maxAlertsPerOrganization?: number;
}

export class DefaultMonitoringManager implements MonitoringManager {
  private alerts: Map<string, DashboardAlert[]> = new Map();
  private agentHistory: Map<string, AgentDataPoint[]> = new Map();
  private poolHistory: Map<string, PoolDataPoint[]> = new Map();
  private transactions: Map<string, TransactionRecord[]> = new Map();
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private config: MonitoringManagerConfig;

  // References to other managers for real-time data
  private agents: Map<string, TreasuryAgent> = new Map();
  private pools: Map<string, CapitalPool> = new Map();
  private proposals: Map<string, GovernanceProposal[]> = new Map();

  constructor(config: Partial<MonitoringManagerConfig> = {}) {
    this.config = {
      alertRetentionDays: config.alertRetentionDays ?? 30,
      metricsRetentionDays: config.metricsRetentionDays ?? 90,
      maxAlertsPerOrganization: config.maxAlertsPerOrganization ?? 1000,
    };
  }

  // Register data sources
  registerAgent(agent: TreasuryAgent): void {
    this.agents.set(agent.id, agent);
  }

  registerPool(pool: CapitalPool): void {
    this.pools.set(pool.id, pool);
  }

  registerProposals(orgId: string, proposals: GovernanceProposal[]): void {
    this.proposals.set(orgId, proposals);
  }

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboard(organizationId: string): Promise<LaunchpadDashboard> {
    return {
      organizationId,
      overview: this.calculateOverview(organizationId),
      treasuryMetrics: this.getTreasuryMetrics(organizationId),
      agentMetrics: this.getAgentMetrics(organizationId),
      capitalMetrics: this.getCapitalMetrics(organizationId),
      governanceMetrics: this.getGovernanceMetrics(organizationId),
      riskMetrics: this.getRiskMetrics(organizationId),
      alerts: this.getAlerts(organizationId, { acknowledged: false }).slice(0, 10),
      lastUpdated: new Date(),
    };
  }

  async refreshDashboard(organizationId: string): Promise<LaunchpadDashboard> {
    // Clean up old data
    this.cleanupOldData();
    return this.getDashboard(organizationId);
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  getTreasuryMetrics(organizationId: string): TreasuryMetrics {
    const orgAgents = this.getOrganizationAgents(organizationId);
    const orgPools = this.getOrganizationPools(organizationId);
    const orgTransactions = this.transactions.get(organizationId) ?? [];

    const totalValue = orgAgents.reduce((sum, a) => sum + a.performance.totalValue, 0) +
                       orgPools.reduce((sum, p) => sum + p.totalCapital, 0);

    const liquidAssets = orgPools.reduce((sum, p) => sum + p.availableCapital, 0);
    const allocatedAssets = orgPools.reduce((sum, p) => sum + p.allocatedCapital, 0);
    const yieldGenerated = orgAgents.reduce((sum, a) => sum + a.performance.yieldGenerated, 0);
    const avgApy = orgAgents.length > 0
      ? orgAgents.reduce((sum, a) => sum + a.performance.currentApy, 0) / orgAgents.length
      : 0;

    // Aggregate holdings
    const holdingsMap = new Map<string, Holding>();
    for (const agent of orgAgents) {
      for (const holding of agent.performance.holdings) {
        const existing = holdingsMap.get(holding.symbol);
        if (existing) {
          existing.amount += holding.amount;
          existing.valueInTon += holding.valueInTon;
        } else {
          holdingsMap.set(holding.symbol, { ...holding });
        }
      }
    }
    const topHoldings = Array.from(holdingsMap.values())
      .sort((a, b) => b.valueInTon - a.valueInTon)
      .slice(0, 10);

    // Recalculate percentages
    for (const holding of topHoldings) {
      holding.percentOfTotal = totalValue > 0 ? (holding.valueInTon / totalValue) * 100 : 0;
    }

    const recentTransactions = orgTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalValue,
      liquidAssets,
      allocatedAssets,
      yieldGenerated,
      currentApy: avgApy,
      topHoldings,
      allocationBreakdown: this.calculateAllocationBreakdown(orgAgents, totalValue),
      recentTransactions,
    };
  }

  getAgentMetrics(organizationId: string): AgentMetrics {
    const orgAgents = this.getOrganizationAgents(organizationId);

    const totalAgents = orgAgents.length;
    const activeAgents = orgAgents.filter((a) => a.status === 'active').length;
    const pausedAgents = orgAgents.filter((a) => a.status === 'paused').length;
    const errorAgents = orgAgents.filter((a) => a.status === 'error').length;
    const totalCapitalManaged = orgAgents.reduce((sum, a) => sum + a.config.capitalAllocated, 0);
    const avgPerformance = totalAgents > 0
      ? orgAgents.reduce((sum, a) => sum + a.performance.totalPnlPercent, 0) / totalAgents
      : 0;

    const topPerformers = orgAgents
      .sort((a, b) => b.performance.totalPnlPercent - a.performance.totalPnlPercent)
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        status: a.status,
        capitalManaged: a.config.capitalAllocated,
        pnl: a.performance.totalPnl,
        pnlPercent: a.performance.totalPnlPercent,
      }));

    const recentActivity = orgAgents
      .filter((a) => a.lastExecutionAt)
      .sort((a, b) => (b.lastExecutionAt?.getTime() ?? 0) - (a.lastExecutionAt?.getTime() ?? 0))
      .slice(0, 10)
      .map((a) => ({
        agentId: a.id,
        agentName: a.name,
        type: 'execution',
        description: `${a.type} strategy execution`,
        timestamp: a.lastExecutionAt ?? new Date(),
      }));

    return {
      totalAgents,
      activeAgents,
      pausedAgents,
      errorAgents,
      totalCapitalManaged,
      avgPerformance,
      topPerformers,
      recentActivity,
    };
  }

  getCapitalMetrics(organizationId: string): CapitalMetrics {
    const orgPools = this.getOrganizationPools(organizationId);

    const totalPooled = orgPools.reduce((sum, p) => sum + p.totalCapital, 0);
    const totalContributors = orgPools.reduce((sum, p) => sum + p.contributors.length, 0);
    const avgContribution = totalContributors > 0 ? totalPooled / totalContributors : 0;
    const totalAllocated = orgPools.reduce((sum, p) => sum + p.allocatedCapital, 0);
    const allocationEfficiency = totalPooled > 0 ? (totalAllocated / totalPooled) * 100 : 0;

    // Calculate flows (simplified - in production would track actual flows)
    const inflowsLast30d = 0;
    const outflowsLast30d = 0;
    const netFlow = inflowsLast30d - outflowsLast30d;

    return {
      totalPooled,
      totalContributors,
      avgContribution,
      totalAllocated,
      allocationEfficiency,
      inflowsLast30d,
      outflowsLast30d,
      netFlow,
    };
  }

  getGovernanceMetrics(organizationId: string): GovernanceMetrics {
    const proposals = this.proposals.get(organizationId) ?? [];

    const totalProposals = proposals.length;
    const activeProposals = proposals.filter((p) => p.status === 'active').length;
    const passedProposals = proposals.filter((p) => p.status === 'passed' || p.status === 'executed').length;
    const failedProposals = proposals.filter((p) => p.status === 'failed').length;

    // Calculate participation
    const completedProposals = proposals.filter((p) =>
      p.status === 'passed' || p.status === 'failed' || p.status === 'executed'
    );
    const avgParticipation = completedProposals.length > 0
      ? completedProposals.reduce((sum, p) => {
          const totalVotes = p.votes.length;
          // Simplified participation calculation
          return sum + (totalVotes > 0 ? 50 : 0);
        }, 0) / completedProposals.length
      : 0;

    const avgApprovalRate = completedProposals.length > 0
      ? (passedProposals / completedProposals.length) * 100
      : 0;

    const recentProposals = proposals
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        status: p.status,
        votesFor: p.votes.filter((v) => v.support === 'for').length,
        votesAgainst: p.votes.filter((v) => v.support === 'against').length,
        participation: 0, // Simplified
        endsAt: p.votingEnd,
      }));

    return {
      totalProposals,
      activeProposals,
      passedProposals,
      failedProposals,
      avgParticipation,
      avgApprovalRate,
      recentProposals,
    };
  }

  getRiskMetrics(organizationId: string): RiskMetrics {
    const orgAgents = this.getOrganizationAgents(organizationId);

    // Calculate overall risk score (0-100)
    const drawdowns = orgAgents.map((a) => a.performance.maxDrawdown);
    const avgDrawdown = drawdowns.length > 0
      ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length
      : 0;

    const volatilities = orgAgents.map((a) => a.performance.volatility);
    const avgVolatility = volatilities.length > 0
      ? volatilities.reduce((a, b) => a + b, 0) / volatilities.length
      : 0;

    const overallRiskScore = Math.min(100, avgDrawdown * 2 + avgVolatility * 3);

    // Calculate VaR (simplified)
    const portfolioVar = avgVolatility * 2.33 * 0.01; // 99% daily VaR approximation

    // Concentration risk
    const treasuryMetrics = this.getTreasuryMetrics(organizationId);
    const maxHoldingPercent = treasuryMetrics.topHoldings[0]?.percentOfTotal ?? 0;
    const concentrationRisk = maxHoldingPercent;

    // Liquidity risk
    const liquidityRisk = treasuryMetrics.allocatedAssets > 0
      ? (1 - treasuryMetrics.liquidAssets / (treasuryMetrics.liquidAssets + treasuryMetrics.allocatedAssets)) * 100
      : 0;

    // Protocol exposure
    const protocolExposure = this.calculateProtocolExposure(orgAgents);

    // Risk trend (simplified)
    const riskTrend: 'improving' | 'stable' | 'worsening' = 'stable';

    // Top risks
    const topRisks: RiskItem[] = [];
    if (concentrationRisk > 30) {
      topRisks.push({
        id: 'concentration',
        type: 'concentration',
        severity: concentrationRisk > 50 ? 'high' : 'medium',
        description: `Single asset represents ${concentrationRisk.toFixed(1)}% of portfolio`,
        recommendation: 'Consider diversifying holdings',
      });
    }
    if (avgDrawdown > 15) {
      topRisks.push({
        id: 'drawdown',
        type: 'drawdown',
        severity: avgDrawdown > 25 ? 'critical' : 'high',
        description: `Average max drawdown is ${avgDrawdown.toFixed(1)}%`,
        recommendation: 'Review risk management settings',
      });
    }

    return {
      overallRiskScore,
      portfolioVar,
      maxDrawdownCurrent: Math.max(...drawdowns, 0),
      concentrationRisk,
      liquidityRisk,
      protocolExposure,
      riskTrend,
      topRisks,
    };
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  getAlerts(organizationId: string, filters?: AlertFilters): DashboardAlert[] {
    let alerts = this.alerts.get(organizationId) ?? [];

    if (filters) {
      if (filters.type && filters.type.length > 0) {
        alerts = alerts.filter((a) => filters.type!.includes(a.type));
      }
      if (filters.severity && filters.severity.length > 0) {
        alerts = alerts.filter((a) => filters.severity!.includes(a.severity));
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
      }
      if (filters.startDate) {
        alerts = alerts.filter((a) => a.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        alerts = alerts.filter((a) => a.timestamp <= filters.endDate!);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  createAlert(input: CreateAlertInput): DashboardAlert {
    const alert: DashboardAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      source: input.source,
      timestamp: new Date(),
      acknowledged: false,
      actionRequired: input.actionRequired ?? false,
      action: input.action,
    };

    const orgAlerts = this.alerts.get(input.organizationId) ?? [];
    orgAlerts.push(alert);

    // Limit alerts
    if (orgAlerts.length > (this.config.maxAlertsPerOrganization ?? 1000)) {
      orgAlerts.shift();
    }

    this.alerts.set(input.organizationId, orgAlerts);

    this.emitEvent('risk_alert', input.organizationId, undefined, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
    });

    return alert;
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        return;
      }
    }
  }

  async dismissAlert(alertId: string): Promise<void> {
    for (const [_orgId, alerts] of this.alerts) {
      const index = alerts.findIndex((a) => a.id === alertId);
      if (index !== -1) {
        alerts.splice(index, 1);
        return;
      }
    }
  }

  // ============================================================================
  // Data Ingestion
  // ============================================================================

  recordAgentData(agentId: string, data: AgentDataPoint): void {
    const history = this.agentHistory.get(agentId) ?? [];
    history.push(data);
    this.agentHistory.set(agentId, history);
  }

  recordPoolData(poolId: string, data: PoolDataPoint): void {
    const history = this.poolHistory.get(poolId) ?? [];
    history.push(data);
    this.poolHistory.set(poolId, history);
  }

  recordTreasuryTransaction(orgId: string, transaction: TransactionRecord): void {
    const transactions = this.transactions.get(orgId) ?? [];
    transactions.push(transaction);
    this.transactions.set(orgId, transactions);
  }

  // ============================================================================
  // Historical Data
  // ============================================================================

  getHistoricalMetrics(orgId: string, metric: string, days: number): HistoricalDataPoint[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const orgAgents = this.getOrganizationAgents(orgId);
    const result: HistoricalDataPoint[] = [];

    for (const agent of orgAgents) {
      const history = this.agentHistory.get(agent.id) ?? [];
      for (const point of history) {
        if (point.timestamp >= cutoff) {
          result.push({
            timestamp: point.timestamp,
            value: metric === 'pnl' ? point.pnl : point.totalValue,
          });
        }
      }
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getOrganizationAgents(organizationId: string): TreasuryAgent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.organizationId === organizationId
    );
  }

  private getOrganizationPools(organizationId: string): CapitalPool[] {
    return Array.from(this.pools.values()).filter(
      (p) => p.organizationId === organizationId
    );
  }

  private calculateOverview(organizationId: string): DashboardOverview {
    const treasury = this.getTreasuryMetrics(organizationId);
    const agents = this.getAgentMetrics(organizationId);
    const governance = this.getGovernanceMetrics(organizationId);
    const risk = this.getRiskMetrics(organizationId);
    const alerts = this.getAlerts(organizationId, { acknowledged: false, severity: ['error', 'critical'] });

    return {
      totalAum: treasury.totalValue,
      totalPnl: treasury.yieldGenerated,
      totalPnlPercent: treasury.totalValue > 0 ? (treasury.yieldGenerated / treasury.totalValue) * 100 : 0,
      activeAgents: agents.activeAgents,
      activeProposals: governance.activeProposals,
      pendingActions: alerts.filter((a) => a.actionRequired).length,
      healthScore: Math.max(0, 100 - risk.overallRiskScore - (agents.errorAgents * 10)),
    };
  }

  private calculateAllocationBreakdown(agents: TreasuryAgent[], totalValue: number): { category: string; value: number; percent: number; change24h: number }[] {
    const categories = new Map<string, number>();

    for (const agent of agents) {
      for (const holding of agent.performance.holdings) {
        const category = holding.isYieldBearing ? 'Yield Bearing' :
                        holding.protocol ? 'Protocol' : 'Liquid';
        categories.set(category, (categories.get(category) ?? 0) + holding.valueInTon);
      }
    }

    return Array.from(categories.entries()).map(([category, value]) => ({
      category,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
      change24h: 0, // Would calculate from historical data
    }));
  }

  private calculateProtocolExposure(agents: TreasuryAgent[]): { protocol: string; exposure: number; exposurePercent: number; riskLevel: 'low' | 'medium' | 'high' }[] {
    const protocols = new Map<string, number>();
    let totalValue = 0;

    for (const agent of agents) {
      for (const holding of agent.performance.holdings) {
        if (holding.protocol) {
          protocols.set(holding.protocol, (protocols.get(holding.protocol) ?? 0) + holding.valueInTon);
        }
        totalValue += holding.valueInTon;
      }
    }

    return Array.from(protocols.entries())
      .map(([protocol, exposure]) => ({
        protocol,
        exposure,
        exposurePercent: totalValue > 0 ? (exposure / totalValue) * 100 : 0,
        riskLevel: ((exposure / totalValue) > 0.3 ? 'high' : (exposure / totalValue) > 0.15 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      }))
      .sort((a, b) => b.exposure - a.exposure);
  }

  private cleanupOldData(): void {
    const retentionMs = (this.config.metricsRetentionDays ?? 90) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);

    for (const [agentId, history] of this.agentHistory) {
      this.agentHistory.set(agentId, history.filter((h) => h.timestamp >= cutoff));
    }

    for (const [poolId, history] of this.poolHistory) {
      this.poolHistory.set(poolId, history.filter((h) => h.timestamp >= cutoff));
    }

    const alertRetentionMs = (this.config.alertRetentionDays ?? 30) * 24 * 60 * 60 * 1000;
    const alertCutoff = new Date(Date.now() - alertRetentionMs);

    for (const [orgId, alerts] of this.alerts) {
      this.alerts.set(orgId, alerts.filter((a) => a.timestamp >= alertCutoff));
    }
  }

  private emitEvent(
    type: LaunchpadEvent['type'],
    organizationId: string,
    agentId?: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: LaunchpadEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      organizationId,
      agentId,
      timestamp: new Date(),
      data,
      severity: 'info',
      metadata: {},
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

export function createMonitoringManager(
  config?: Partial<MonitoringManagerConfig>
): DefaultMonitoringManager {
  return new DefaultMonitoringManager(config);
}
