/**
 * ACMS Layer 2 — Agent & Fund Layer
 *
 * Manages autonomous AI agents and funds in the ACMS:
 * AI hedge funds, strategy agents, treasury agents, and DAO funds.
 * Provides agent lifecycle management, fund creation, performance tracking,
 * and capital allocation within the autonomous capital markets ecosystem.
 */

import {
  Agent,
  AgentId,
  AgentType,
  AgentStatus,
  AIManagedFund,
  FundId,
  AgentFundLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Agent & Fund Layer Interfaces
// ============================================================================

export interface AgentFundLayerManager {
  deployAgent(params: DeployAgentParams): Agent;
  suspendAgent(agentId: AgentId, reason: string): void;
  resumeAgent(agentId: AgentId): void;
  terminateAgent(agentId: AgentId): void;
  getAgent(agentId: AgentId): Agent | undefined;
  listAgents(filters?: AgentFilters): Agent[];
  updateAgentAllocation(agentId: AgentId, allocationUsd: number): void;
  updateAgentPerformance(agentId: AgentId, performanceScore: number, riskScore: number): void;

  createFund(params: CreateFundParams): AIManagedFund;
  closeFund(fundId: FundId): void;
  getFund(fundId: FundId): AIManagedFund | undefined;
  listFunds(filters?: FundFilters): AIManagedFund[];
  addAgentToFund(fundId: FundId, agentId: AgentId): void;
  removeAgentFromFund(fundId: FundId, agentId: AgentId): void;
  updateFundNAV(fundId: FundId, navPerShare: number, actualReturn: number): void;

  getLayerStatus(): AgentFundLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface DeployAgentParams {
  name: string;
  type: AgentType;
  fundId?: FundId;
  allocationUsd: number;
  maxLeverage: number;
  strategies: string[];
}

export interface AgentFilters {
  type?: AgentType;
  status?: AgentStatus;
  fundId?: FundId;
  minPerformanceScore?: number;
  maxRiskScore?: number;
}

export interface CreateFundParams {
  name: string;
  fundType: AIManagedFund['fundType'];
  managerAgentId: AgentId;
  initialAum: number;
  initialNavPerShare: number;
  targetReturn: number;
}

export interface FundFilters {
  fundType?: AIManagedFund['fundType'];
  status?: AIManagedFund['status'];
  minAum?: number;
}

// ============================================================================
// Default Agent & Fund Layer Manager
// ============================================================================

export class DefaultAgentFundLayerManager implements AgentFundLayerManager {
  private readonly agents: Map<AgentId, Agent> = new Map();
  private readonly funds: Map<FundId, AIManagedFund> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private readonly suspensionReasons: Map<AgentId, string> = new Map();
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  deployAgent(params: DeployAgentParams): Agent {
    const agent: Agent = {
      id: this.generateId('agent'),
      name: params.name,
      type: params.type,
      fundId: params.fundId,
      aum: params.allocationUsd,
      allocationUsd: params.allocationUsd,
      currentLeverage: 1.0,
      maxLeverage: params.maxLeverage,
      riskScore: 50,
      performanceScore: 50,
      status: 'active',
      strategies: params.strategies,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.agents.set(agent.id, agent);
    this.emitEvent('agent_deployed', 2, { agentId: agent.id, type: agent.type });
    return agent;
  }

  suspendAgent(agentId: AgentId, reason: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    this.agents.set(agentId, { ...agent, status: 'suspended', updatedAt: new Date() });
    this.suspensionReasons.set(agentId, reason);
  }

  resumeAgent(agentId: AgentId): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    if (agent.status !== 'suspended') throw new Error(`Agent ${agentId} is not suspended`);
    this.agents.set(agentId, { ...agent, status: 'active', updatedAt: new Date() });
    this.suspensionReasons.delete(agentId);
  }

  terminateAgent(agentId: AgentId): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    this.agents.set(agentId, { ...agent, status: 'terminated', updatedAt: new Date() });
  }

  getAgent(agentId: AgentId): Agent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(filters?: AgentFilters): Agent[] {
    let result = Array.from(this.agents.values());
    if (filters?.type) result = result.filter(a => a.type === filters.type);
    if (filters?.status) result = result.filter(a => a.status === filters.status);
    if (filters?.fundId) result = result.filter(a => a.fundId === filters.fundId);
    if (filters?.minPerformanceScore !== undefined) {
      result = result.filter(a => a.performanceScore >= filters.minPerformanceScore!);
    }
    if (filters?.maxRiskScore !== undefined) {
      result = result.filter(a => a.riskScore <= filters.maxRiskScore!);
    }
    return result;
  }

  updateAgentAllocation(agentId: AgentId, allocationUsd: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    this.agents.set(agentId, { ...agent, allocationUsd, aum: allocationUsd, updatedAt: new Date() });
  }

  updateAgentPerformance(agentId: AgentId, performanceScore: number, riskScore: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    this.agents.set(agentId, { ...agent, performanceScore, riskScore, updatedAt: new Date() });
  }

  createFund(params: CreateFundParams): AIManagedFund {
    const initialShares = params.initialAum / params.initialNavPerShare;
    const fund: AIManagedFund = {
      id: this.generateId('fund'),
      name: params.name,
      fundType: params.fundType,
      managerAgentId: params.managerAgentId,
      agentIds: [],
      totalAum: params.initialAum,
      navPerShare: params.initialNavPerShare,
      totalShares: initialShares,
      targetReturn: params.targetReturn,
      actualReturn: 0,
      drawdown: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.funds.set(fund.id, fund);
    this.emitEvent('fund_created', 2, { fundId: fund.id, name: fund.name });
    return fund;
  }

  closeFund(fundId: FundId): void {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund ${fundId} not found`);
    this.funds.set(fundId, { ...fund, status: 'liquidating', updatedAt: new Date() });
  }

  getFund(fundId: FundId): AIManagedFund | undefined {
    return this.funds.get(fundId);
  }

  listFunds(filters?: FundFilters): AIManagedFund[] {
    let result = Array.from(this.funds.values());
    if (filters?.fundType) result = result.filter(f => f.fundType === filters.fundType);
    if (filters?.status) result = result.filter(f => f.status === filters.status);
    if (filters?.minAum !== undefined) {
      result = result.filter(f => f.totalAum >= filters.minAum!);
    }
    return result;
  }

  addAgentToFund(fundId: FundId, agentId: AgentId): void {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund ${fundId} not found`);
    if (!fund.agentIds.includes(agentId)) {
      this.funds.set(fundId, {
        ...fund,
        agentIds: [...fund.agentIds, agentId],
        updatedAt: new Date(),
      });
    }
  }

  removeAgentFromFund(fundId: FundId, agentId: AgentId): void {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund ${fundId} not found`);
    this.funds.set(fundId, {
      ...fund,
      agentIds: fund.agentIds.filter(id => id !== agentId),
      updatedAt: new Date(),
    });
  }

  updateFundNAV(fundId: FundId, navPerShare: number, actualReturn: number): void {
    const fund = this.funds.get(fundId);
    if (!fund) throw new Error(`Fund ${fundId} not found`);
    const totalAum = navPerShare * fund.totalShares;
    const newDrawdown = actualReturn < 0 ? Math.abs(actualReturn) : 0;
    const maxDrawdown = Math.max(fund.maxDrawdown, newDrawdown);
    this.funds.set(fundId, {
      ...fund,
      navPerShare,
      actualReturn,
      totalAum,
      drawdown: newDrawdown,
      maxDrawdown,
      updatedAt: new Date(),
    });
  }

  getLayerStatus(): AgentFundLayerStatus {
    const agents = Array.from(this.agents.values());
    const funds = Array.from(this.funds.values());
    const activeAgents = agents.filter(a => a.status === 'active');
    const activeFunds = funds.filter(f => f.status === 'open');
    const avgLeverage = activeAgents.length > 0
      ? activeAgents.reduce((s, a) => s + a.currentLeverage, 0) / activeAgents.length
      : 0;
    const agentsByType = {} as Record<AgentType, number>;
    for (const agent of agents) {
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1;
    }
    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalFunds: funds.length,
      activeFunds: activeFunds.length,
      totalAumUsd: activeFunds.reduce((s, f) => s + f.totalAum, 0),
      averageLeverage: avgLeverage,
      agentsByType,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createAgentFundLayerManager(): DefaultAgentFundLayerManager {
  return new DefaultAgentFundLayerManager();
}
