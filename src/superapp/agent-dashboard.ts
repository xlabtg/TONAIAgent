/**
 * TONAIAgent - Agent Dashboard Module
 *
 * Unified dashboard for managing autonomous AI agents, monitoring strategies,
 * customizing risk parameters, and deploying automation.
 *
 * Features:
 * - Agent creation and management
 * - Real-time performance monitoring
 * - Risk customization and controls
 * - Automation rules and triggers
 * - Alert management
 */

import type {
  AgentDashboard,
  DashboardAgent,
  AgentDashboardPerformance,
  AgentRiskMetrics,
  AgentRuntimeStats,
  AgentSummary,
  AgentAlert,
  AlertType,
  AlertSeverity,
  AgentAutomation,
  AutomationTrigger,
  AutomationAction,
  TokenExposure,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface AgentDashboardConfig {
  maxAgentsPerUser: number;
  maxAutomationsPerUser: number;
  maxAlertsPerAgent: number;
  alertRetentionDays: number;
  performanceUpdateIntervalMs: number;
  defaultRiskLevel: 'low' | 'medium' | 'high';
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateAgentInput {
  userId: string;
  name: string;
  description: string;
  strategyId: string;
  strategyName: string;
  capitalAllocated: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'extreme';
  customRiskParams?: Partial<AgentRiskMetrics>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  capitalAllocated?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'extreme';
  customRiskParams?: Partial<AgentRiskMetrics>;
}

export interface CreateAutomationInput {
  userId: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
}

export interface CreateAlertInput {
  agentId: string;
  agentName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionRequired?: boolean;
  expiresAt?: Date;
}

// ============================================================================
// Agent Dashboard Manager Interface
// ============================================================================

export interface AgentDashboardManager {
  // Dashboard
  getDashboard(userId: string): Promise<AgentDashboard>;
  refreshDashboard(userId: string): Promise<AgentDashboard>;

  // Agent CRUD
  createAgent(input: CreateAgentInput): Promise<DashboardAgent>;
  getAgent(agentId: string): Promise<DashboardAgent | null>;
  getAgents(userId: string): Promise<DashboardAgent[]>;
  updateAgent(agentId: string, updates: UpdateAgentInput): Promise<DashboardAgent>;
  deleteAgent(agentId: string): Promise<void>;

  // Agent Control
  startAgent(agentId: string): Promise<void>;
  pauseAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string): Promise<void>;
  stopAgent(agentId: string): Promise<void>;

  // Performance
  getAgentPerformance(agentId: string): Promise<AgentDashboardPerformance>;
  getAgentRiskMetrics(agentId: string): Promise<AgentRiskMetrics>;
  getAgentRuntimeStats(agentId: string): Promise<AgentRuntimeStats>;

  // Alerts
  createAlert(input: CreateAlertInput): Promise<AgentAlert>;
  getAlerts(userId: string, unreadOnly?: boolean): Promise<AgentAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;

  // Automations
  createAutomation(input: CreateAutomationInput): Promise<AgentAutomation>;
  getAutomations(userId: string): Promise<AgentAutomation[]>;
  updateAutomation(automationId: string, updates: Partial<AgentAutomation>): Promise<AgentAutomation>;
  deleteAutomation(automationId: string): Promise<void>;
  enableAutomation(automationId: string): Promise<void>;
  disableAutomation(automationId: string): Promise<void>;
  executeAutomation(automationId: string): Promise<void>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAgentDashboardManager implements AgentDashboardManager {
  private readonly config: AgentDashboardConfig;
  private readonly agents = new Map<string, DashboardAgent>();
  private readonly alerts = new Map<string, AgentAlert>();
  private readonly automations = new Map<string, AgentAutomation>();
  private readonly userAgents = new Map<string, Set<string>>();
  private readonly userAutomations = new Map<string, Set<string>>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];

  constructor(config: Partial<AgentDashboardConfig> = {}) {
    this.config = {
      maxAgentsPerUser: config.maxAgentsPerUser ?? 20,
      maxAutomationsPerUser: config.maxAutomationsPerUser ?? 50,
      maxAlertsPerAgent: config.maxAlertsPerAgent ?? 100,
      alertRetentionDays: config.alertRetentionDays ?? 30,
      performanceUpdateIntervalMs: config.performanceUpdateIntervalMs ?? 60000,
      defaultRiskLevel: config.defaultRiskLevel ?? 'medium',
    };
  }

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboard(userId: string): Promise<AgentDashboard> {
    const agents = await this.getAgents(userId);
    const alerts = await this.getAlerts(userId);
    const automations = await this.getAutomations(userId);
    const summary = this.calculateSummary(agents);

    return {
      userId,
      agents,
      summary,
      alerts,
      automations,
      lastUpdatedAt: new Date(),
    };
  }

  async refreshDashboard(userId: string): Promise<AgentDashboard> {
    // Refresh performance data for all agents
    const agentIds = this.userAgents.get(userId);
    if (agentIds) {
      for (const agentId of agentIds) {
        const agent = this.agents.get(agentId);
        if (agent) {
          agent.performance = this.generatePerformance();
          agent.risk = this.generateRiskMetrics(agent.risk.riskLevel);
          agent.runtimeStats = this.updateRuntimeStats(agent.runtimeStats);
          this.agents.set(agentId, agent);
        }
      }
    }

    return this.getDashboard(userId);
  }

  // ============================================================================
  // Agent CRUD
  // ============================================================================

  async createAgent(input: CreateAgentInput): Promise<DashboardAgent> {
    const userAgentIds = this.userAgents.get(input.userId) ?? new Set();
    if (userAgentIds.size >= this.config.maxAgentsPerUser) {
      throw new Error(`Maximum ${this.config.maxAgentsPerUser} agents per user`);
    }

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const riskLevel = input.riskLevel ?? this.config.defaultRiskLevel;

    const agent: DashboardAgent = {
      id: agentId,
      name: input.name,
      description: input.description,
      strategyId: input.strategyId,
      strategyName: input.strategyName,
      status: 'initializing',
      performance: this.generatePerformance(),
      risk: this.generateRiskMetrics(riskLevel, input.customRiskParams),
      capitalAllocated: input.capitalAllocated,
      runtimeStats: {
        uptime: 0,
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        averageExecutionTime: 0,
      },
      lastActivityAt: new Date(),
      createdAt: new Date(),
    };

    this.agents.set(agentId, agent);
    userAgentIds.add(agentId);
    this.userAgents.set(input.userId, userAgentIds);

    // Simulate initialization
    setTimeout(() => {
      const a = this.agents.get(agentId);
      if (a && a.status === 'initializing') {
        a.status = 'active';
        this.agents.set(agentId, a);
      }
    }, 2000);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'agent_deployed',
      severity: 'info',
      source: 'agent-dashboard',
      userId: input.userId,
      message: `Agent ${input.name} deployed successfully`,
      data: { agentId, strategyId: input.strategyId, capitalAllocated: input.capitalAllocated },
    });

    return agent;
  }

  async getAgent(agentId: string): Promise<DashboardAgent | null> {
    return this.agents.get(agentId) ?? null;
  }

  async getAgents(userId: string): Promise<DashboardAgent[]> {
    const agentIds = this.userAgents.get(userId) ?? new Set();
    const agents: DashboardAgent[] = [];
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agents.push(agent);
      }
    }
    return agents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAgent(agentId: string, updates: UpdateAgentInput): Promise<DashboardAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (updates.name !== undefined) agent.name = updates.name;
    if (updates.description !== undefined) agent.description = updates.description;
    if (updates.capitalAllocated !== undefined) agent.capitalAllocated = updates.capitalAllocated;
    if (updates.riskLevel !== undefined) {
      agent.risk = this.generateRiskMetrics(updates.riskLevel, updates.customRiskParams);
    }

    agent.lastActivityAt = new Date();
    this.agents.set(agentId, agent);

    return agent;
  }

  async deleteAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === 'active') {
      throw new Error('Cannot delete an active agent. Stop it first.');
    }

    this.agents.delete(agentId);

    // Remove from user's agent list
    for (const [userId, agentIds] of this.userAgents.entries()) {
      if (agentIds.has(agentId)) {
        agentIds.delete(agentId);
        this.userAgents.set(userId, agentIds);
        break;
      }
    }

    // Remove related alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.agentId === agentId) {
        this.alerts.delete(alertId);
      }
    }
  }

  // ============================================================================
  // Agent Control
  // ============================================================================

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === 'active') {
      throw new Error('Agent is already active');
    }

    agent.status = 'active';
    agent.lastActivityAt = new Date();
    this.agents.set(agentId, agent);

    this.emitAgentStatusEvent(agent, 'agent_resumed', 'Agent resumed');
  }

  async pauseAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'active') {
      throw new Error('Agent is not active');
    }

    agent.status = 'paused';
    agent.lastActivityAt = new Date();
    this.agents.set(agentId, agent);

    this.emitAgentStatusEvent(agent, 'agent_paused', 'Agent paused');
  }

  async resumeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'paused') {
      throw new Error('Agent is not paused');
    }

    agent.status = 'active';
    agent.lastActivityAt = new Date();
    this.agents.set(agentId, agent);

    this.emitAgentStatusEvent(agent, 'agent_resumed', 'Agent resumed');
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'stopped';
    agent.lastActivityAt = new Date();
    this.agents.set(agentId, agent);

    this.emitAgentStatusEvent(agent, 'agent_stopped', 'Agent stopped');
  }

  // ============================================================================
  // Performance
  // ============================================================================

  async getAgentPerformance(agentId: string): Promise<AgentDashboardPerformance> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.performance;
  }

  async getAgentRiskMetrics(agentId: string): Promise<AgentRiskMetrics> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.risk;
  }

  async getAgentRuntimeStats(agentId: string): Promise<AgentRuntimeStats> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.runtimeStats;
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  async createAlert(input: CreateAlertInput): Promise<AgentAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const alert: AgentAlert = {
      id: alertId,
      agentId: input.agentId,
      agentName: input.agentName,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      data: input.data,
      actionRequired: input.actionRequired ?? false,
      createdAt: new Date(),
      expiresAt: input.expiresAt,
    };

    this.alerts.set(alertId, alert);

    return alert;
  }

  async getAlerts(userId: string, unreadOnly = false): Promise<AgentAlert[]> {
    const agentIds = this.userAgents.get(userId) ?? new Set();
    const alerts: AgentAlert[] = [];

    for (const alert of this.alerts.values()) {
      if (agentIds.has(alert.agentId)) {
        if (!unreadOnly || !alert.acknowledgedAt) {
          alerts.push(alert);
        }
      }
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledgedAt = new Date();
    this.alerts.set(alertId, alert);
  }

  async dismissAlert(alertId: string): Promise<void> {
    this.alerts.delete(alertId);
  }

  // ============================================================================
  // Automations
  // ============================================================================

  async createAutomation(input: CreateAutomationInput): Promise<AgentAutomation> {
    const userAutomationIds = this.userAutomations.get(input.userId) ?? new Set();
    if (userAutomationIds.size >= this.config.maxAutomationsPerUser) {
      throw new Error(`Maximum ${this.config.maxAutomationsPerUser} automations per user`);
    }

    const automationId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const automation: AgentAutomation = {
      id: automationId,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      actions: input.actions,
      enabled: true,
      executionCount: 0,
      createdAt: new Date(),
    };

    this.automations.set(automationId, automation);
    userAutomationIds.add(automationId);
    this.userAutomations.set(input.userId, userAutomationIds);

    return automation;
  }

  async getAutomations(userId: string): Promise<AgentAutomation[]> {
    const automationIds = this.userAutomations.get(userId) ?? new Set();
    const automations: AgentAutomation[] = [];

    for (const automationId of automationIds) {
      const automation = this.automations.get(automationId);
      if (automation) {
        automations.push(automation);
      }
    }

    return automations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAutomation(
    automationId: string,
    updates: Partial<AgentAutomation>
  ): Promise<AgentAutomation> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    const updated: AgentAutomation = {
      ...automation,
      ...updates,
      id: automation.id, // Prevent ID change
      createdAt: automation.createdAt, // Prevent creation date change
    };

    this.automations.set(automationId, updated);
    return updated;
  }

  async deleteAutomation(automationId: string): Promise<void> {
    this.automations.delete(automationId);

    // Remove from user's automation list
    for (const [userId, automationIds] of this.userAutomations.entries()) {
      if (automationIds.has(automationId)) {
        automationIds.delete(automationId);
        this.userAutomations.set(userId, automationIds);
        break;
      }
    }
  }

  async enableAutomation(automationId: string): Promise<void> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    automation.enabled = true;
    this.automations.set(automationId, automation);
  }

  async disableAutomation(automationId: string): Promise<void> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    automation.enabled = false;
    this.automations.set(automationId, automation);
  }

  async executeAutomation(automationId: string): Promise<void> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    if (!automation.enabled) {
      throw new Error('Automation is disabled');
    }

    // Execute each action
    for (const action of automation.actions) {
      await this.executeAction(action);
    }

    automation.lastTriggeredAt = new Date();
    automation.executionCount++;
    this.automations.set(automationId, automation);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private calculateSummary(agents: DashboardAgent[]): AgentSummary {
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const totalCapital = agents.reduce((sum, a) => sum + a.capitalAllocated, 0);
    const totalPnl = agents.reduce((sum, a) => sum + a.performance.totalPnl, 0);
    const totalPnlPercent = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0;

    let bestPerformingAgent: AgentSummary['bestPerformingAgent'];
    let worstPerformingAgent: AgentSummary['worstPerformingAgent'];

    if (agents.length > 0) {
      const sorted = [...agents].sort(
        (a, b) => b.performance.totalPnlPercent - a.performance.totalPnlPercent
      );
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];

      bestPerformingAgent = {
        id: best.id,
        name: best.name,
        pnlPercent: best.performance.totalPnlPercent,
      };
      worstPerformingAgent = {
        id: worst.id,
        name: worst.name,
        pnlPercent: worst.performance.totalPnlPercent,
      };
    }

    return {
      totalAgents: agents.length,
      activeAgents,
      totalCapitalAllocated: totalCapital,
      totalPnl,
      totalPnlPercent,
      bestPerformingAgent,
      worstPerformingAgent,
    };
  }

  private generatePerformance(): AgentDashboardPerformance {
    const baseReturn = (Math.random() - 0.3) * 20; // -6% to +14%

    return {
      totalPnl: baseReturn * 100,
      totalPnlPercent: baseReturn,
      todayPnl: (Math.random() - 0.4) * 3 * 100,
      todayPnlPercent: (Math.random() - 0.4) * 3,
      weeklyPnl: (Math.random() - 0.35) * 5 * 100,
      monthlyPnl: baseReturn * 100,
      roi: baseReturn,
      sharpeRatio: 0.5 + Math.random() * 2,
      winRate: 0.4 + Math.random() * 0.3,
      lastTradeAt: new Date(Date.now() - Math.random() * 3600000),
    };
  }

  private generateRiskMetrics(
    riskLevel: 'low' | 'medium' | 'high' | 'extreme',
    customParams?: Partial<AgentRiskMetrics>
  ): AgentRiskMetrics {
    const riskMultipliers = {
      low: 0.5,
      medium: 1,
      high: 1.5,
      extreme: 2,
    };

    const multiplier = riskMultipliers[riskLevel];

    const baseMetrics: AgentRiskMetrics = {
      riskLevel,
      currentDrawdown: Math.random() * 5 * multiplier,
      maxDrawdown: 5 + Math.random() * 10 * multiplier,
      volatility: 10 + Math.random() * 15 * multiplier,
      exposureByToken: this.generateTokenExposures(),
      warnings: [],
    };

    if (baseMetrics.currentDrawdown > 5) {
      baseMetrics.warnings.push('Current drawdown exceeds 5%');
    }
    if (baseMetrics.volatility > 20) {
      baseMetrics.warnings.push('High volatility detected');
    }

    return {
      ...baseMetrics,
      ...customParams,
    };
  }

  private generateTokenExposures(): TokenExposure[] {
    const tokens = ['TON', 'USDT', 'STON', 'SCALE'];
    const exposures: TokenExposure[] = [];
    let remaining = 100;

    for (let i = 0; i < tokens.length && remaining > 0; i++) {
      const percentage = i === tokens.length - 1 ? remaining : Math.random() * remaining * 0.6;
      remaining -= percentage;

      exposures.push({
        token: tokens[i],
        amount: percentage * 10,
        percentage,
        riskLevel: percentage > 40 ? 'high' : percentage > 25 ? 'medium' : 'low',
      });
    }

    return exposures.sort((a, b) => b.percentage - a.percentage);
  }

  private updateRuntimeStats(current: AgentRuntimeStats): AgentRuntimeStats {
    return {
      ...current,
      uptime: current.uptime + this.config.performanceUpdateIntervalMs / 1000,
      totalTrades: current.totalTrades + Math.floor(Math.random() * 3),
      successfulTrades: current.successfulTrades + Math.floor(Math.random() * 3),
      averageExecutionTime: 50 + Math.random() * 100,
    };
  }

  private async executeAction(action: AutomationAction): Promise<void> {
    switch (action.type) {
      case 'pause_agent':
        if (action.config.agentId) {
          await this.pauseAgent(action.config.agentId as string);
        }
        break;
      case 'resume_agent':
        if (action.config.agentId) {
          await this.resumeAgent(action.config.agentId as string);
        }
        break;
      case 'send_notification':
        // Notification would be sent via NotificationManager
        break;
      case 'adjust_capital':
        if (action.config.agentId && action.config.amount !== undefined) {
          await this.updateAgent(action.config.agentId as string, {
            capitalAllocated: action.config.amount as number,
          });
        }
        break;
      case 'execute_trade':
        // Trade execution would go through the trading system
        break;
    }
  }

  private emitAgentStatusEvent(
    agent: DashboardAgent,
    type: 'agent_paused' | 'agent_resumed' | 'agent_stopped' | 'agent_error',
    message: string
  ): void {
    // Find user ID
    let userId: string | undefined;
    for (const [uid, agentIds] of this.userAgents.entries()) {
      if (agentIds.has(agent.id)) {
        userId = uid;
        break;
      }
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type,
      severity: type === 'agent_error' ? 'error' : 'info',
      source: 'agent-dashboard',
      userId,
      message: `${message}: ${agent.name}`,
      data: { agentId: agent.id, status: agent.status },
    });
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createAgentDashboardManager(
  config?: Partial<AgentDashboardConfig>
): DefaultAgentDashboardManager {
  return new DefaultAgentDashboardManager(config);
}

export default DefaultAgentDashboardManager;
