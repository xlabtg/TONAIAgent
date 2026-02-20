/**
 * TONAIAgent - Treasury Agent Framework
 *
 * Core framework for deploying and managing autonomous treasury agents
 * that handle asset allocation, yield optimization, and portfolio management.
 */

import {
  TreasuryAgent,
  TreasuryAgentType,
  TreasuryAgentConfig,
  TreasuryStrategy,
  TreasuryAgentPerformance,
  AgentRiskControls,
  AgentGovernance,
  PerformanceDataPoint,
  AuditEntry,
  LaunchpadEvent,
  LaunchpadEventCallback,
  AllocationRule,
  Holding,
} from './types';

// ============================================================================
// Treasury Agent Manager Interface
// ============================================================================

export interface TreasuryAgentManager {
  // Agent CRUD
  createAgent(input: CreateAgentInput): Promise<TreasuryAgent>;
  getAgent(agentId: string): TreasuryAgent | undefined;
  updateAgent(agentId: string, updates: UpdateAgentInput): Promise<TreasuryAgent>;
  deleteAgent(agentId: string): Promise<boolean>;
  listAgents(organizationId: string): TreasuryAgent[];

  // Lifecycle management
  deployAgent(agentId: string): Promise<DeploymentResult>;
  startAgent(agentId: string): Promise<void>;
  pauseAgent(agentId: string, reason: string): Promise<void>;
  stopAgent(agentId: string, reason: string): Promise<void>;
  restartAgent(agentId: string): Promise<void>;

  // Strategy management
  updateStrategy(agentId: string, strategy: Partial<TreasuryStrategy>): Promise<TreasuryAgent>;
  executeRebalance(agentId: string): Promise<RebalanceResult>;
  simulateStrategy(agentId: string, params: SimulationParams): Promise<SimulationResult>;

  // Risk controls
  updateRiskControls(agentId: string, controls: Partial<AgentRiskControls>): Promise<TreasuryAgent>;
  checkRiskLimits(agentId: string): Promise<RiskCheckResult>;
  triggerEmergencyStop(agentId: string, reason: string): Promise<void>;

  // Performance tracking
  getPerformance(agentId: string): TreasuryAgentPerformance | undefined;
  getPerformanceHistory(agentId: string, days: number): PerformanceDataPoint[];
  calculateMetrics(agentId: string): PerformanceMetrics;

  // Audit
  getAuditTrail(agentId: string, limit?: number): AuditEntry[];

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateAgentInput {
  organizationId: string;
  name: string;
  description: string;
  type: TreasuryAgentType;
  config: Partial<TreasuryAgentConfig>;
  strategy: Partial<TreasuryStrategy>;
  riskControls?: Partial<AgentRiskControls>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  config?: Partial<TreasuryAgentConfig>;
  metadata?: Record<string, unknown>;
}

export interface DeploymentResult {
  success: boolean;
  agentId: string;
  walletAddress?: string;
  transactionHash?: string;
  error?: string;
  deployedAt?: Date;
}

export interface RebalanceResult {
  success: boolean;
  agentId: string;
  actions: RebalanceAction[];
  totalGasUsed?: number;
  newAllocation: Holding[];
  error?: string;
  executedAt: Date;
}

export interface RebalanceAction {
  type: 'swap' | 'stake' | 'unstake' | 'provide_liquidity' | 'remove_liquidity';
  fromToken?: string;
  toToken?: string;
  amount: number;
  status: 'pending' | 'executed' | 'failed';
  txHash?: string;
}

export interface SimulationParams {
  days: number;
  initialCapital: number;
  marketScenario?: 'bullish' | 'bearish' | 'sideways' | 'volatile';
  includeGas?: boolean;
  includeFees?: boolean;
}

export interface SimulationResult {
  success: boolean;
  agentId: string;
  finalValue: number;
  totalReturn: number;
  returnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  actions: SimulatedAction[];
  warnings: string[];
}

export interface SimulatedAction {
  day: number;
  action: string;
  amount: number;
  impact: number;
}

export interface RiskCheckResult {
  passed: boolean;
  agentId: string;
  violations: RiskViolation[];
  warnings: RiskWarning[];
  metrics: RiskMetricsSnapshot;
  checkedAt: Date;
}

export interface RiskViolation {
  type: string;
  limit: number;
  actual: number;
  severity: 'warning' | 'critical';
  recommendation: string;
}

export interface RiskWarning {
  type: string;
  message: string;
  level: 'low' | 'medium' | 'high';
}

export interface RiskMetricsSnapshot {
  currentDrawdown: number;
  concentrationRisk: number;
  liquidityRatio: number;
  varDaily: number;
}

export interface PerformanceMetrics {
  roi: number;
  roiPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  calmarRatio: number;
}

// ============================================================================
// Default Treasury Agent Manager Implementation
// ============================================================================

export interface TreasuryAgentManagerConfig {
  defaultGasLimit?: number;
  maxAgentsPerOrganization?: number;
  enableSimulation?: boolean;
}

export class DefaultTreasuryAgentManager implements TreasuryAgentManager {
  private agents: Map<string, TreasuryAgent> = new Map();
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private config: TreasuryAgentManagerConfig;

  constructor(config: Partial<TreasuryAgentManagerConfig> = {}) {
    this.config = {
      defaultGasLimit: config.defaultGasLimit ?? 1000000,
      maxAgentsPerOrganization: config.maxAgentsPerOrganization ?? 100,
      enableSimulation: config.enableSimulation ?? true,
    };
  }

  // ============================================================================
  // Agent CRUD
  // ============================================================================

  async createAgent(input: CreateAgentInput): Promise<TreasuryAgent> {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Check organization limit
    const existingAgents = this.listAgents(input.organizationId);
    if (existingAgents.length >= (this.config.maxAgentsPerOrganization ?? 100)) {
      throw new Error(`Maximum agents limit reached for organization ${input.organizationId}`);
    }

    const now = new Date();

    const agent: TreasuryAgent = {
      id: agentId,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'draft',
      config: this.buildAgentConfig(input.config),
      strategy: this.buildStrategy(input.strategy),
      performance: this.initializePerformance(),
      riskControls: this.buildRiskControls(input.riskControls),
      governance: this.initializeGovernance(),
      auditTrail: [],
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    this.agents.set(agentId, agent);
    this.addAuditEntry(agent, 'create', 'system', { input });

    this.emitEvent('agent_deployed', agent.organizationId, agentId, {
      name: agent.name,
      type: agent.type,
    });

    return agent;
  }

  getAgent(agentId: string): TreasuryAgent | undefined {
    return this.agents.get(agentId);
  }

  async updateAgent(agentId: string, updates: UpdateAgentInput): Promise<TreasuryAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (updates.name !== undefined) {
      agent.name = updates.name;
    }
    if (updates.description !== undefined) {
      agent.description = updates.description;
    }
    if (updates.config) {
      agent.config = { ...agent.config, ...updates.config };
    }
    if (updates.metadata) {
      agent.metadata = { ...agent.metadata, ...updates.metadata };
    }

    agent.updatedAt = new Date();
    this.addAuditEntry(agent, 'update', 'system', { updates });

    return agent;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (agent.status === 'active' || agent.status === 'deploying') {
      throw new Error('Cannot delete active or deploying agent. Stop it first.');
    }

    this.addAuditEntry(agent, 'delete', 'system', {});
    this.agents.delete(agentId);

    return true;
  }

  listAgents(organizationId: string): TreasuryAgent[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.organizationId === organizationId
    );
  }

  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  async deployAgent(agentId: string): Promise<DeploymentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { success: false, agentId, error: 'Agent not found' };
    }

    if (agent.status !== 'draft' && agent.status !== 'pending_approval') {
      return { success: false, agentId, error: `Cannot deploy agent in ${agent.status} state` };
    }

    agent.status = 'deploying';
    agent.updatedAt = new Date();

    // Simulate deployment (in production, this would interact with TON blockchain)
    const walletAddress = `EQ${Math.random().toString(36).substring(2, 42).toUpperCase()}`;
    agent.config.walletAddress = walletAddress;
    agent.status = 'active';
    agent.deployedAt = new Date();

    this.addAuditEntry(agent, 'deploy', 'system', { walletAddress });

    this.emitEvent('agent_started', agent.organizationId, agentId, {
      walletAddress,
    });

    return {
      success: true,
      agentId,
      walletAddress,
      deployedAt: agent.deployedAt,
    };
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (agent.status !== 'paused' && agent.status !== 'stopped') {
      throw new Error(`Cannot start agent in ${agent.status} state`);
    }

    agent.status = 'active';
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'resume', 'system', {});

    this.emitEvent('agent_started', agent.organizationId, agentId, {});
  }

  async pauseAgent(agentId: string, reason: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (agent.status !== 'active') {
      throw new Error(`Cannot pause agent in ${agent.status} state`);
    }

    agent.status = 'paused';
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'pause', 'system', { reason });

    this.emitEvent('agent_paused', agent.organizationId, agentId, { reason });
  }

  async stopAgent(agentId: string, reason: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (agent.status === 'stopped' || agent.status === 'archived') {
      return;
    }

    agent.status = 'stopped';
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'stop', 'system', { reason });

    this.emitEvent('agent_stopped', agent.organizationId, agentId, { reason });
  }

  async restartAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (agent.status === 'error' || agent.status === 'stopped') {
      agent.status = 'active';
      agent.updatedAt = new Date();
      this.addAuditEntry(agent, 'resume', 'system', { action: 'restart' });
    }
  }

  // ============================================================================
  // Strategy Management
  // ============================================================================

  async updateStrategy(
    agentId: string,
    strategy: Partial<TreasuryStrategy>
  ): Promise<TreasuryAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.strategy = {
      ...agent.strategy,
      ...strategy,
    };
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'update', 'system', { strategy });

    return agent;
  }

  async executeRebalance(agentId: string): Promise<RebalanceResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        agentId,
        actions: [],
        newAllocation: [],
        error: 'Agent not found',
        executedAt: new Date(),
      };
    }

    if (agent.status !== 'active') {
      return {
        success: false,
        agentId,
        actions: [],
        newAllocation: [],
        error: `Cannot rebalance agent in ${agent.status} state`,
        executedAt: new Date(),
      };
    }

    // Calculate required rebalancing actions based on strategy
    const actions = this.calculateRebalanceActions(agent);

    // Update last execution time
    agent.lastExecutionAt = new Date();
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'execute', 'system', { type: 'rebalance', actions });

    this.emitEvent('rebalance_executed', agent.organizationId, agentId, {
      actions: actions.length,
    });

    return {
      success: true,
      agentId,
      actions,
      newAllocation: agent.performance.holdings,
      executedAt: new Date(),
    };
  }

  async simulateStrategy(agentId: string, params: SimulationParams): Promise<SimulationResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        agentId,
        finalValue: 0,
        totalReturn: 0,
        returnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        actions: [],
        warnings: ['Agent not found'],
      };
    }

    if (!this.config.enableSimulation) {
      return {
        success: false,
        agentId,
        finalValue: 0,
        totalReturn: 0,
        returnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        actions: [],
        warnings: ['Simulation is disabled'],
      };
    }

    // Run Monte Carlo simulation
    const result = this.runSimulation(agent, params);

    return result;
  }

  // ============================================================================
  // Risk Controls
  // ============================================================================

  async updateRiskControls(
    agentId: string,
    controls: Partial<AgentRiskControls>
  ): Promise<TreasuryAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.riskControls = {
      ...agent.riskControls,
      ...controls,
    };
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'update', 'system', { riskControls: controls });

    return agent;
  }

  async checkRiskLimits(agentId: string): Promise<RiskCheckResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        passed: false,
        agentId,
        violations: [
          {
            type: 'agent_not_found',
            limit: 0,
            actual: 0,
            severity: 'critical',
            recommendation: 'Agent does not exist',
          },
        ],
        warnings: [],
        metrics: {
          currentDrawdown: 0,
          concentrationRisk: 0,
          liquidityRatio: 0,
          varDaily: 0,
        },
        checkedAt: new Date(),
      };
    }

    const violations: RiskViolation[] = [];
    const warnings: RiskWarning[] = [];

    // Check drawdown
    if (agent.performance.maxDrawdown > agent.riskControls.maxDrawdown) {
      violations.push({
        type: 'max_drawdown',
        limit: agent.riskControls.maxDrawdown,
        actual: agent.performance.maxDrawdown,
        severity: 'critical',
        recommendation: 'Reduce position sizes or pause trading',
      });
    }

    // Check concentration
    const maxHoldingPercent = Math.max(...agent.performance.holdings.map((h) => h.percentOfTotal));
    if (maxHoldingPercent > agent.riskControls.concentrationLimit) {
      violations.push({
        type: 'concentration_limit',
        limit: agent.riskControls.concentrationLimit,
        actual: maxHoldingPercent,
        severity: 'warning',
        recommendation: 'Diversify holdings to reduce concentration risk',
      });
    }

    // Check liquidity
    const liquidRatio = this.calculateLiquidityRatio(agent);
    if (liquidRatio < agent.riskControls.liquidityRequirements.minLiquidPercent) {
      warnings.push({
        type: 'liquidity_warning',
        message: `Liquid ratio ${liquidRatio}% below minimum ${agent.riskControls.liquidityRequirements.minLiquidPercent}%`,
        level: 'high',
      });
    }

    const passed = violations.filter((v) => v.severity === 'critical').length === 0;

    return {
      passed,
      agentId,
      violations,
      warnings,
      metrics: {
        currentDrawdown: agent.performance.maxDrawdown,
        concentrationRisk: maxHoldingPercent,
        liquidityRatio: liquidRatio,
        varDaily: agent.performance.volatility * 2.33, // 99% VaR approximation
      },
      checkedAt: new Date(),
    };
  }

  async triggerEmergencyStop(agentId: string, reason: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.status = 'stopped';
    agent.updatedAt = new Date();

    this.addAuditEntry(agent, 'stop', 'system', { emergency: true, reason });

    this.emitEvent('emergency_stop', agent.organizationId, agentId, {
      reason,
      severity: 'critical',
    });
  }

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  getPerformance(agentId: string): TreasuryAgentPerformance | undefined {
    const agent = this.agents.get(agentId);
    return agent?.performance;
  }

  getPerformanceHistory(agentId: string, days: number): PerformanceDataPoint[] {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return agent.performance.performanceHistory.filter(
      (point) => point.timestamp >= cutoff
    );
  }

  calculateMetrics(agentId: string): PerformanceMetrics {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        roi: 0,
        roiPercent: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        volatility: 0,
        winRate: 0,
        profitFactor: 0,
        calmarRatio: 0,
      };
    }

    const perf = agent.performance;
    const calmarRatio =
      perf.maxDrawdown > 0 ? (perf.currentApy / 100) / (perf.maxDrawdown / 100) : 0;

    return {
      roi: perf.totalPnl,
      roiPercent: perf.totalPnlPercent,
      sharpeRatio: perf.sharpeRatio,
      sortinoRatio: perf.sharpeRatio * 1.1, // Approximation
      maxDrawdown: perf.maxDrawdown,
      volatility: perf.volatility,
      winRate:
        perf.totalTransactions > 0
          ? (perf.successfulTransactions / perf.totalTransactions) * 100
          : 0,
      profitFactor: perf.realizedPnl > 0 ? Math.abs(perf.realizedPnl) / 100 : 0,
      calmarRatio,
    };
  }

  // ============================================================================
  // Audit
  // ============================================================================

  getAuditTrail(agentId: string, limit?: number): AuditEntry[] {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return [];
    }

    const entries = [...agent.auditTrail].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return limit ? entries.slice(0, limit) : entries;
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

  private buildAgentConfig(input: Partial<TreasuryAgentConfig>): TreasuryAgentConfig {
    return {
      walletAddress: input.walletAddress ?? '',
      capitalAllocated: input.capitalAllocated ?? 0,
      maxCapital: input.maxCapital ?? 1000000,
      autoRebalance: input.autoRebalance ?? true,
      rebalanceInterval: input.rebalanceInterval ?? 60, // hourly
      allowedTokens: input.allowedTokens ?? ['TON', 'USDT', 'USDC'],
      allowedProtocols: input.allowedProtocols ?? [],
      executionMode: input.executionMode ?? 'automatic',
      gasSettings: input.gasSettings ?? {
        maxGasPrice: 1000000000,
        priorityFee: 100000000,
        autoAdjust: true,
      },
    };
  }

  private buildStrategy(input: Partial<TreasuryStrategy>): TreasuryStrategy {
    const defaultAllocation: AllocationRule[] = [
      {
        id: 'stable_allocation',
        name: 'Stablecoin Allocation',
        targetPercent: 30,
        minPercent: 20,
        maxPercent: 50,
        assetClass: 'stablecoin',
        rebalanceAction: 'auto',
      },
      {
        id: 'yield_allocation',
        name: 'Yield Bearing Assets',
        targetPercent: 40,
        minPercent: 30,
        maxPercent: 60,
        assetClass: 'yield_bearing',
        rebalanceAction: 'auto',
      },
      {
        id: 'native_allocation',
        name: 'Native Token',
        targetPercent: 20,
        minPercent: 10,
        maxPercent: 30,
        assetClass: 'native_token',
        rebalanceAction: 'auto',
      },
      {
        id: 'liquidity_allocation',
        name: 'Liquidity Positions',
        targetPercent: 10,
        minPercent: 0,
        maxPercent: 20,
        assetClass: 'liquidity_position',
        rebalanceAction: 'auto',
      },
    ];

    return {
      type: input.type ?? 'balanced',
      allocationRules: input.allocationRules ?? defaultAllocation,
      rebalancingThreshold: input.rebalancingThreshold ?? 5,
      yieldTargetApy: input.yieldTargetApy,
      diversificationRules: input.diversificationRules ?? [
        {
          maxSingleAssetPercent: 25,
          maxProtocolExposure: 30,
          minAssetCount: 4,
        },
      ],
      customParameters: input.customParameters ?? {},
    };
  }

  private buildRiskControls(input?: Partial<AgentRiskControls>): AgentRiskControls {
    return {
      enabled: input?.enabled ?? true,
      maxDrawdown: input?.maxDrawdown ?? 15,
      maxSingleTradePercent: input?.maxSingleTradePercent ?? 5,
      dailyLossLimit: input?.dailyLossLimit ?? 5,
      concentrationLimit: input?.concentrationLimit ?? 30,
      liquidityRequirements: input?.liquidityRequirements ?? {
        minLiquidPercent: 20,
        minLiquidAmount: 1000,
        liquidAssets: ['TON', 'USDT', 'USDC'],
      },
      emergencyStopConditions: input?.emergencyStopConditions ?? [
        {
          id: 'max_drawdown_stop',
          type: 'drawdown',
          threshold: 20,
          action: 'stop',
          cooldownMinutes: 1440, // 24 hours
        },
      ],
      approvalThresholds: input?.approvalThresholds ?? [
        {
          type: 'single_transaction',
          amount: 10000,
          requiredApprovals: 2,
          approverRoles: ['admin', 'treasury_manager'],
        },
      ],
    };
  }

  private initializePerformance(): TreasuryAgentPerformance {
    return {
      totalValue: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      yieldGenerated: 0,
      currentApy: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      holdings: [],
      performanceHistory: [],
      lastUpdated: new Date(),
    };
  }

  private initializeGovernance(): AgentGovernance {
    return {
      proposalRequired: false,
      autoExecute: true,
      strategyChangeRequiresVote: true,
      riskParameterChangeRequiresVote: true,
      recentProposals: [],
      executedProposals: [],
    };
  }

  private calculateRebalanceActions(agent: TreasuryAgent): RebalanceAction[] {
    // In production, this would calculate actual rebalancing needs
    // based on current holdings vs target allocation
    const actions: RebalanceAction[] = [];

    // Simulate a simple rebalance action
    if (agent.performance.holdings.length > 0) {
      actions.push({
        type: 'swap',
        fromToken: 'TON',
        toToken: 'USDT',
        amount: 100,
        status: 'executed',
      });
    }

    return actions;
  }

  private calculateLiquidityRatio(agent: TreasuryAgent): number {
    if (agent.performance.totalValue === 0) {
      return 100;
    }

    const liquidAssets = agent.riskControls.liquidityRequirements.liquidAssets;
    const liquidValue = agent.performance.holdings
      .filter((h) => liquidAssets.includes(h.symbol))
      .reduce((sum, h) => sum + h.valueInTon, 0);

    return (liquidValue / agent.performance.totalValue) * 100;
  }

  private runSimulation(agent: TreasuryAgent, params: SimulationParams): SimulationResult {
    // Simple Monte Carlo simulation
    const dailyReturns: number[] = [];
    const actions: SimulatedAction[] = [];
    let currentValue = params.initialCapital;
    let maxValue = currentValue;
    let maxDrawdown = 0;

    // Simulate daily returns based on market scenario
    const meanReturn =
      params.marketScenario === 'bullish'
        ? 0.002
        : params.marketScenario === 'bearish'
          ? -0.001
          : params.marketScenario === 'volatile'
            ? 0.0005
            : 0.001;

    const volatility =
      params.marketScenario === 'volatile' ? 0.05 : params.marketScenario === 'sideways' ? 0.01 : 0.025;

    for (let day = 0; day < params.days; day++) {
      // Generate random return using Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const dailyReturn = meanReturn + volatility * z;

      dailyReturns.push(dailyReturn);
      currentValue *= 1 + dailyReturn;

      // Track max drawdown
      maxValue = Math.max(maxValue, currentValue);
      const drawdown = ((maxValue - currentValue) / maxValue) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      // Record significant actions
      if (Math.abs(dailyReturn) > volatility * 2) {
        actions.push({
          day,
          action: dailyReturn > 0 ? 'buy' : 'sell',
          amount: Math.abs(dailyReturn * currentValue),
          impact: dailyReturn * 100,
        });
      }
    }

    // Calculate metrics
    const totalReturn = currentValue - params.initialCapital;
    const returnPercent = (totalReturn / params.initialCapital) * 100;
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0;

    return {
      success: true,
      agentId: agent.id,
      finalValue: currentValue,
      totalReturn,
      returnPercent,
      maxDrawdown,
      sharpeRatio,
      actions,
      warnings:
        maxDrawdown > agent.riskControls.maxDrawdown
          ? [`Simulated max drawdown ${maxDrawdown.toFixed(2)}% exceeds limit`]
          : [],
    };
  }

  private addAuditEntry(
    agent: TreasuryAgent,
    action: AuditEntry['action'],
    actor: string,
    details: Record<string, unknown>
  ): void {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      actor,
      actorType: actor === 'system' ? 'system' : 'user',
      action,
      target: agent.id,
      targetType: 'treasury_agent',
      details,
      outcome: 'success',
      metadata: {},
    };

    agent.auditTrail.push(entry);

    // Keep only last 1000 entries
    if (agent.auditTrail.length > 1000) {
      agent.auditTrail = agent.auditTrail.slice(-1000);
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

export function createTreasuryAgentManager(
  config?: Partial<TreasuryAgentManagerConfig>
): DefaultTreasuryAgentManager {
  return new DefaultTreasuryAgentManager(config);
}
