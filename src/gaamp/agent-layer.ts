/**
 * TONAIAgent - GAAMP Agent Layer
 *
 * Implements the Agent Layer of the Global Autonomous Asset Management Protocol.
 * Provides the standardized agent interface (v1) and registry for AI-managed
 * trading agents, strategy agents, risk agents, and treasury agents.
 *
 * Agent Interface v1:
 * - allocate()    — capital allocation across assets
 * - rebalance()   — portfolio rebalancing to target weights
 * - hedge()       — exposure hedging
 * - report()      — standardized reporting
 * - shutdown()    — graceful termination
 */

import {
  AgentId,
  FundId,
  AssetId,
  ProtocolAgent,
  AgentType,
  AgentStatus,
  AgentCapability,
  AgentConfig,
  AgentMetrics,
  AgentReport,
  AgentReportType,
  AllocateParams,
  AllocateResult,
  RebalanceParams,
  RebalanceResult,
  HedgeParams,
  HedgeResult,
  ReportParams,
  AgentLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_AGENT_LAYER_CONFIG: AgentLayerConfig = {
  maxAgentsPerFund: 20,
  agentRegistrationEnabled: true,
  autoShutdownOnRiskBreach: true,
  reportingFrequency: 'hourly',
};

// ============================================================================
// Agent Layer Interface
// ============================================================================

export interface AgentLayer {
  readonly config: AgentLayerConfig;

  // Registration
  registerAgent(params: RegisterAgentParams): ProtocolAgent;
  deregisterAgent(agentId: AgentId, reason?: string): void;
  getAgent(agentId: AgentId): ProtocolAgent | undefined;
  listAgents(filters?: AgentFilters): ProtocolAgent[];

  // Status management
  activateAgent(agentId: AgentId): ProtocolAgent;
  pauseAgent(agentId: AgentId, reason?: string): ProtocolAgent;
  shutdownAgent(agentId: AgentId, reason?: string): ProtocolAgent;

  // Standard interface execution
  executeAllocate(agentId: AgentId, params: AllocateParams): AllocateResult;
  executeRebalance(agentId: AgentId, params: RebalanceParams): RebalanceResult;
  executeHedge(agentId: AgentId, params: HedgeParams): HedgeResult;
  generateReport(agentId: AgentId, params: ReportParams): AgentReport;

  // Metrics
  updateAgentMetrics(agentId: AgentId, metrics: Partial<AgentMetrics>): void;
  getAgentMetrics(agentId: AgentId): AgentMetrics | undefined;

  // Events
  onEvent(callback: GAMPEventCallback): void;
}

export interface RegisterAgentParams {
  name: string;
  type: AgentType;
  version?: string;
  capabilities?: AgentCapability[];
  fundId?: FundId;
  config?: AgentConfig;
}

export interface AgentFilters {
  type?: AgentType;
  status?: AgentStatus;
  fundId?: FundId;
  hasCapability?: AgentCapability;
}

// ============================================================================
// Default Agent Layer Implementation
// ============================================================================

export class DefaultAgentLayer implements AgentLayer {
  readonly config: AgentLayerConfig;
  private readonly agents: Map<AgentId, ProtocolAgent> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private agentCounter = 0;

  constructor(config?: Partial<AgentLayerConfig>) {
    this.config = { ...DEFAULT_AGENT_LAYER_CONFIG, ...config };
  }

  // ============================================================================
  // Registration
  // ============================================================================

  registerAgent(params: RegisterAgentParams): ProtocolAgent {
    if (!this.config.agentRegistrationEnabled) {
      throw new Error('Agent registration is currently disabled');
    }

    // Enforce per-fund agent limit
    if (params.fundId) {
      const fundAgents = this.listAgents({ fundId: params.fundId });
      if (fundAgents.length >= this.config.maxAgentsPerFund) {
        throw new Error(
          `Fund ${params.fundId} has reached the maximum agent limit (${this.config.maxAgentsPerFund})`
        );
      }
    }

    const id = this.generateAgentId();
    const now = new Date();

    const agent: ProtocolAgent = {
      id,
      name: params.name,
      type: params.type,
      version: params.version ?? '1.0.0',
      status: 'registered',
      capabilities: params.capabilities ?? this.defaultCapabilitiesForType(params.type),
      fundId: params.fundId,
      registeredAt: now,
      updatedAt: now,
      metrics: this.emptyMetrics(),
      config: params.config ?? {},
    };

    this.agents.set(id, agent);
    this.emitEvent('agent_registered', { agentId: id, name: params.name, type: params.type });

    return agent;
  }

  deregisterAgent(agentId: AgentId, reason?: string): void {
    const agent = this.requireAgent(agentId);

    if (agent.status === 'active') {
      this.shutdownAgent(agentId, reason);
    }

    this.agents.delete(agentId);
  }

  getAgent(agentId: AgentId): ProtocolAgent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(filters?: AgentFilters): ProtocolAgent[] {
    let result = Array.from(this.agents.values());

    if (filters) {
      if (filters.type !== undefined) {
        result = result.filter(a => a.type === filters.type);
      }
      if (filters.status !== undefined) {
        result = result.filter(a => a.status === filters.status);
      }
      if (filters.fundId !== undefined) {
        result = result.filter(a => a.fundId === filters.fundId);
      }
      if (filters.hasCapability !== undefined) {
        result = result.filter(a => a.capabilities.includes(filters.hasCapability!));
      }
    }

    return result;
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  activateAgent(agentId: AgentId): ProtocolAgent {
    const agent = this.requireAgent(agentId);

    if (agent.status === 'shutdown') {
      throw new Error(`Agent ${agentId} is shut down and cannot be activated`);
    }

    const updated = this.updateAgent(agentId, { status: 'active' });
    this.emitEvent('agent_registered', { agentId, status: 'active' });
    return updated;
  }

  pauseAgent(agentId: AgentId, reason?: string): ProtocolAgent {
    this.requireAgent(agentId);
    return this.updateAgent(agentId, { status: 'paused' });
  }

  shutdownAgent(agentId: AgentId, reason?: string): ProtocolAgent {
    this.requireAgent(agentId);
    const updated = this.updateAgent(agentId, { status: 'shutdown' });
    this.emitEvent('agent_shutdown', { agentId, reason });
    return updated;
  }

  // ============================================================================
  // Standard Interface Execution
  // ============================================================================

  executeAllocate(agentId: AgentId, params: AllocateParams): AllocateResult {
    const agent = this.requireActiveAgent(agentId);
    this.requireCapability(agent, 'allocate');

    const { targetAllocations, totalCapital, constraints } = params;

    // Validate allocations sum to ~1 (within 0.001 tolerance)
    const sum = Object.values(targetAllocations).reduce((s, w) => s + w, 0);
    if (Math.abs(sum - 1) > 0.001) {
      throw new Error(`Target allocations must sum to 1.0, got ${sum}`);
    }

    // Apply constraints
    const filtered = this.applyAllocationConstraints(targetAllocations, constraints);

    const result: AllocateResult = {
      success: true,
      allocations: Object.fromEntries(
        Object.entries(filtered).map(([asset, weight]) => [asset, weight * totalCapital])
      ),
      executedAt: new Date(),
    };

    this.updateAgentMetrics(agentId, {
      totalAllocated: (agent.metrics.totalAllocated ?? 0) + totalCapital,
    });

    return result;
  }

  executeRebalance(agentId: AgentId, params: RebalanceParams): RebalanceResult {
    const agent = this.requireActiveAgent(agentId);
    this.requireCapability(agent, 'rebalance');

    const { currentAllocations, targetAllocations, threshold = 0.05 } = params;

    const trades: RebalanceResult['trades'] = [];

    for (const [asset, targetWeight] of Object.entries(targetAllocations)) {
      const currentWeight = currentAllocations[asset] ?? 0;
      const drift = Math.abs(targetWeight - currentWeight);

      if (drift >= threshold) {
        trades.push({
          asset: asset as AssetId,
          side: targetWeight > currentWeight ? 'buy' : 'sell',
          amount: Math.abs(targetWeight - currentWeight),
        });
      }
    }

    this.updateAgentMetrics(agentId, {
      totalTrades: (agent.metrics.totalTrades ?? 0) + trades.length,
      successfulTrades: (agent.metrics.successfulTrades ?? 0) + trades.length,
    });

    return {
      success: true,
      trades,
      executedAt: new Date(),
    };
  }

  executeHedge(agentId: AgentId, params: HedgeParams): HedgeResult {
    const agent = this.requireActiveAgent(agentId);
    this.requireCapability(agent, 'hedge');

    const { exposures, targetNetExposure = 0, hedgingInstruments = [] } = params;

    const hedges: HedgeResult['hedges'] = [];
    let totalExposure = Object.values(exposures).reduce((s, v) => s + Math.abs(v), 0);

    for (const [asset, exposure] of Object.entries(exposures)) {
      if (Math.abs(exposure) > 0) {
        const instrument = hedgingInstruments[0] ?? `${asset}_inverse`;
        hedges.push({
          asset: asset as AssetId,
          size: Math.abs(exposure),
          instrument,
        });
      }
    }

    // Approximate net exposure after hedging
    const netExposureAfter = targetNetExposure;

    return {
      success: true,
      hedges,
      netExposureAfter,
    };
  }

  generateReport(agentId: AgentId, params: ReportParams): AgentReport {
    const agent = this.requireAgent(agentId);
    this.requireCapability(agent, 'report');

    const { reportType } = params;

    const data = this.buildReportData(agent, reportType);

    return {
      agentId,
      reportType,
      generatedAt: new Date(),
      data,
      summary: this.buildReportSummary(agent, reportType),
    };
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  updateAgentMetrics(agentId: AgentId, metrics: Partial<AgentMetrics>): void {
    const agent = this.requireAgent(agentId);
    const updated: ProtocolAgent = {
      ...agent,
      metrics: { ...agent.metrics, ...metrics, lastActiveAt: new Date() },
      updatedAt: new Date(),
    };
    this.agents.set(agentId, updated);
  }

  getAgentMetrics(agentId: AgentId): AgentMetrics | undefined {
    return this.agents.get(agentId)?.metrics;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateAgentId(): AgentId {
    return `agent_${Date.now()}_${++this.agentCounter}`;
  }

  private emptyMetrics(): AgentMetrics {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      totalAllocated: 0,
      totalReturns: 0,
    };
  }

  private defaultCapabilitiesForType(type: AgentType): AgentCapability[] {
    const caps: Record<AgentType, AgentCapability[]> = {
      trading: ['allocate', 'trade', 'report'],
      strategy: ['allocate', 'rebalance', 'report'],
      risk: ['hedge', 'report', 'monitor'],
      treasury: ['allocate', 'report', 'govern'],
      compliance: ['report', 'monitor'],
      data: ['report', 'monitor'],
      rebalancing: ['rebalance', 'report'],
    };
    return caps[type] ?? ['report'];
  }

  private requireAgent(agentId: AgentId): ProtocolAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return agent;
  }

  private requireActiveAgent(agentId: AgentId): ProtocolAgent {
    const agent = this.requireAgent(agentId);
    if (agent.status !== 'active') {
      throw new Error(`Agent ${agentId} is not active (status: ${agent.status})`);
    }
    return agent;
  }

  private requireCapability(agent: ProtocolAgent, capability: AgentCapability): void {
    if (!agent.capabilities.includes(capability)) {
      throw new Error(
        `Agent ${agent.id} does not have capability: ${capability}`
      );
    }
  }

  private updateAgent(agentId: AgentId, updates: Partial<ProtocolAgent>): ProtocolAgent {
    const agent = this.requireAgent(agentId);
    const updated: ProtocolAgent = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
    };
    this.agents.set(agentId, updated);
    return updated;
  }

  private applyAllocationConstraints(
    allocations: Record<AssetId, number>,
    constraints?: AllocateParams['constraints']
  ): Record<AssetId, number> {
    if (!constraints) return allocations;

    let result = { ...allocations };

    if (constraints.allowedAssets) {
      result = Object.fromEntries(
        Object.entries(result).filter(([asset]) =>
          constraints.allowedAssets!.includes(asset)
        )
      );
    }

    if (constraints.blockedAssets) {
      result = Object.fromEntries(
        Object.entries(result).filter(([asset]) =>
          !constraints.blockedAssets!.includes(asset)
        )
      );
    }

    // Re-normalize after filtering
    const sum = Object.values(result).reduce((s, w) => s + w, 0);
    if (sum > 0) {
      result = Object.fromEntries(
        Object.entries(result).map(([asset, w]) => [asset, w / sum])
      );
    }

    return result;
  }

  private buildReportData(
    agent: ProtocolAgent,
    reportType: AgentReportType
  ): Record<string, unknown> {
    switch (reportType) {
      case 'performance':
        return {
          totalReturns: agent.metrics.totalReturns,
          sharpeRatio: agent.metrics.sharpeRatio,
          maxDrawdown: agent.metrics.maxDrawdown,
          successRate:
            agent.metrics.totalTrades > 0
              ? agent.metrics.successfulTrades / agent.metrics.totalTrades
              : 0,
        };
      case 'risk':
        return {
          maxDrawdown: agent.metrics.maxDrawdown,
          sharpeRatio: agent.metrics.sharpeRatio,
          status: agent.status,
        };
      case 'allocation':
        return {
          totalAllocated: agent.metrics.totalAllocated,
          config: agent.config,
        };
      case 'trades':
        return {
          totalTrades: agent.metrics.totalTrades,
          successfulTrades: agent.metrics.successfulTrades,
          lastActiveAt: agent.metrics.lastActiveAt,
        };
      case 'audit':
        return {
          agentId: agent.id,
          registeredAt: agent.registeredAt,
          updatedAt: agent.updatedAt,
          status: agent.status,
          capabilities: agent.capabilities,
        };
      default:
        return {};
    }
  }

  private buildReportSummary(agent: ProtocolAgent, reportType: AgentReportType): string {
    return `Agent ${agent.name} (${agent.id}) — ${reportType} report as of ${new Date().toISOString()}`;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
      payload,
      timestamp: new Date(),
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAgentLayer(config?: Partial<AgentLayerConfig>): DefaultAgentLayer {
  return new DefaultAgentLayer(config);
}

export default DefaultAgentLayer;
