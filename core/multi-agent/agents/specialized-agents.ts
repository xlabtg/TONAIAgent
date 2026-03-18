/**
 * TONAIAgent - Specialized Multi-Agent Implementations
 *
 * Role-based agent implementations for different responsibilities:
 * - Strategist: Generates high-level plans and coordinates strategy
 * - Executor: Executes transactions and operations
 * - Risk: Monitors exposure and enforces limits
 * - Data: Collects and processes market signals
 * - Portfolio: Coordinates capital allocation across agents
 * - Coordinator: Orchestrates swarm behavior
 */

import {
  MultiAgentConfig,
  Task,
  TaskResult,
  AgentTaskType,
  AgentRole,
  RiskAlertPayload,
  ResourceUsage,
  AgentMessage,
  CapitalRequest,
  TaskPriority,
} from '../types';
import { BaseAgent } from './base-agent';
import { MessageBus, createMessage } from '../communication';
import { MultiAgentEvent } from '../types';

// ============================================================================
// Strategist Agent
// ============================================================================

/**
 * Strategist Agent - Generates high-level plans and coordinates strategy execution
 */
export class StrategistAgent extends BaseAgent {

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void
  ) {
    super({ ...config, role: 'strategist' }, messageBus, eventCallback);
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = [
      'market_analysis',
      'yield_optimization',
      'rebalance',
      'reporting',
    ];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'market_analysis':
        return this.analyzeMarket(task);
      case 'yield_optimization':
        return this.optimizeYield(task);
      case 'rebalance':
        return this.planRebalance(task);
      case 'reporting':
        return this.generateReport(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async analyzeMarket(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      tokens?: string[];
      timeframe?: string;
      indicators?: string[];
    };

    // Simulate market analysis
    const analysis = {
      tokens: params.tokens ?? ['TON', 'USDT'],
      timeframe: params.timeframe ?? '24h',
      signals: this.generateSignals(params.tokens ?? ['TON']),
      recommendations: [] as string[],
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
    };

    // Delegate data collection to data agents
    if (this.config.capabilities.canDelegateTask) {
      await this.delegateDataCollection(params.tokens ?? ['TON']);
    }

    return {
      success: true,
      data: analysis,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
      metrics: {
        tokensAnalyzed: analysis.tokens.length,
        signalsGenerated: analysis.signals.length,
      },
    };
  }

  private async optimizeYield(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      capital?: number;
      riskTolerance?: 'low' | 'medium' | 'high';
      protocols?: string[];
    };

    const optimization = {
      allocations: [
        { protocol: 'dedust', allocation: 0.4, expectedApy: 0.12 },
        { protocol: 'stonfi', allocation: 0.35, expectedApy: 0.10 },
        { protocol: 'evaa', allocation: 0.25, expectedApy: 0.08 },
      ],
      expectedReturn: 0.105,
      riskScore: params.riskTolerance === 'high' ? 0.7 : params.riskTolerance === 'medium' ? 0.5 : 0.3,
      rebalanceRequired: Math.random() > 0.5,
    };

    return {
      success: true,
      data: optimization,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private async planRebalance(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    const plan = {
      trades: [
        { from: 'TON', to: 'USDT', amount: 100, reason: 'Risk reduction' },
      ],
      expectedSlippage: 0.002,
      estimatedGas: 0.5,
      priority: 'normal',
    };

    // Delegate execution to executor agents
    if (this.config.capabilities.canDelegateTask) {
      const delegationTask: Task = {
        ...task,
        type: 'trade_execution',
        parameters: plan,
      };
      await this.delegateTask(delegationTask, undefined, 'executor');
    }

    return {
      success: true,
      data: plan,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private async generateReport(_task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    const report = {
      period: '24h',
      performance: {
        totalReturn: Math.random() * 0.1 - 0.02,
        trades: Math.floor(Math.random() * 50),
        successRate: Math.random() * 0.3 + 0.7,
      },
      riskMetrics: {
        maxDrawdown: Math.random() * 0.05,
        sharpeRatio: Math.random() * 2 + 0.5,
      },
      generatedAt: new Date(),
    };

    return {
      success: true,
      data: report,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private generateSignals(tokens: string[]): Array<{ token: string; signal: string; strength: number }> {
    return tokens.map((token) => ({
      token,
      signal: Math.random() > 0.5 ? 'buy' : 'sell',
      strength: Math.random(),
    }));
  }

  private async delegateDataCollection(tokens: string[]): Promise<void> {
    const task: Task = {
      id: `task_data_${Date.now()}`,
      type: 'data_collection',
      priority: 3 as TaskPriority,
      status: 'pending',
      creatorId: this.id,
      description: 'Collect market data for analysis',
      parameters: { tokens },
      constraints: {},
      dependencies: [],
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    await this.delegateTask(task, undefined, 'data');
  }
}

// ============================================================================
// Executor Agent
// ============================================================================

/**
 * Executor Agent - Executes transactions and operations on-chain
 */
export class ExecutorAgent extends BaseAgent {
  private pendingTransactions: Map<string, TransactionState> = new Map();

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void
  ) {
    super({ ...config, role: 'executor' }, messageBus, eventCallback);
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = [
      'trade_execution',
      'position_management',
      'arbitrage_execution',
    ];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'trade_execution':
        return this.executeTrade(task);
      case 'position_management':
        return this.managePosition(task);
      case 'arbitrage_execution':
        return this.executeArbitrage(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async executeTrade(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      from: string;
      to: string;
      amount: number;
      maxSlippage?: number;
      protocol?: string;
    };

    // Simulate trade execution
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.pendingTransactions.set(txId, {
      id: txId,
      status: 'pending',
      params,
      startedAt: new Date(),
    });

    // Simulate execution delay
    await this.simulateDelay(100, 500);

    const success = Math.random() > 0.1; // 90% success rate

    this.pendingTransactions.set(txId, {
      ...this.pendingTransactions.get(txId)!,
      status: success ? 'confirmed' : 'failed',
      completedAt: new Date(),
    });

    if (success) {
      this.emitEvent('task_completed', {
        taskId: task.id,
        transactionId: txId,
        from: params.from,
        to: params.to,
        amount: params.amount,
      });
    }

    return {
      success,
      data: {
        transactionId: txId,
        executedAmount: success ? params.amount : 0,
        actualSlippage: success ? Math.random() * (params.maxSlippage ?? 0.01) : 0,
        gasUsed: success ? Math.random() * 0.5 + 0.1 : 0,
      },
      error: success ? undefined : 'Transaction failed',
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private async managePosition(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      positionId: string;
      action: 'open' | 'close' | 'modify';
      amount?: number;
    };

    // Simulate position management
    await this.simulateDelay(50, 200);

    return {
      success: true,
      data: {
        positionId: params.positionId,
        action: params.action,
        newSize: params.amount ?? 0,
        executedAt: new Date(),
      },
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private async executeArbitrage(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      opportunity: {
        buyDex: string;
        sellDex: string;
        token: string;
        spread: number;
        amount: number;
      };
    };

    // Check if opportunity still exists
    const opportunityValid = params.opportunity.spread > 0.001;

    if (!opportunityValid) {
      return {
        success: false,
        error: 'Arbitrage opportunity expired',
        executionTime: Date.now() - startTime,
        resourcesUsed: this.getResourceUsage(),
      };
    }

    // Execute both legs
    await this.simulateDelay(100, 300);

    const profit = params.opportunity.amount * params.opportunity.spread * 0.9;

    this.performanceMetrics.profitLossTon += profit;

    return {
      success: true,
      data: {
        profit,
        buyPrice: 1.0,
        sellPrice: 1.0 + params.opportunity.spread,
        executedAt: new Date(),
      },
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
      metrics: {
        profitTon: profit,
      },
    };
  }

  protected getResourceUsage(): ResourceUsage {
    return {
      ...super.getResourceUsage(),
      pendingTransactions: this.pendingTransactions.size,
    };
  }

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

// ============================================================================
// Risk Agent
// ============================================================================

/**
 * Risk Agent - Monitors exposure, enforces limits, and triggers alerts
 */
export class RiskAgent extends BaseAgent {
  private riskLimits: RiskLimits;
  private currentExposure: Map<string, number> = new Map();

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void,
    limits?: Partial<RiskLimits>
  ) {
    super({ ...config, role: 'risk' }, messageBus, eventCallback);
    this.riskLimits = {
      maxExposure: limits?.maxExposure ?? 10000,
      maxDrawdown: limits?.maxDrawdown ?? 0.1,
      maxPositionSize: limits?.maxPositionSize ?? 1000,
      dailyLossLimit: limits?.dailyLossLimit ?? 500,
      velocityLimit: limits?.velocityLimit ?? 20,
    };
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = ['risk_assessment'];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'risk_assessment':
        return this.assessRisk(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async assessRisk(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      operation?: {
        type: string;
        amount: number;
        token: string;
      };
      portfolio?: {
        positions: Array<{ token: string; amount: number; value: number }>;
      };
    };

    const assessment = {
      riskScore: this.calculateRiskScore(params),
      violations: this.checkViolations(params),
      recommendations: [] as string[],
      approved: true,
    };

    if (assessment.violations.length > 0) {
      assessment.approved = false;
      assessment.recommendations.push('Reduce position sizes');

      // Send risk alert
      await this.sendRiskAlert(assessment.violations);
    }

    return {
      success: true,
      data: assessment,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  private calculateRiskScore(params: {
    operation?: { type: string; amount: number; token: string };
    portfolio?: { positions: Array<{ token: string; amount: number; value: number }> };
  }): number {
    let score = 0;

    if (params.operation) {
      const exposureRatio = params.operation.amount / this.riskLimits.maxPositionSize;
      score += Math.min(exposureRatio, 1) * 0.5;
    }

    if (params.portfolio) {
      const totalValue = params.portfolio.positions.reduce((sum, p) => sum + p.value, 0);
      const concentrationRisk = Math.max(
        ...params.portfolio.positions.map((p) => p.value / totalValue)
      );
      score += concentrationRisk * 0.3;
    }

    return Math.min(score, 1);
  }

  private checkViolations(params: {
    operation?: { type: string; amount: number; token: string };
    portfolio?: { positions: Array<{ token: string; amount: number; value: number }> };
  }): string[] {
    const violations: string[] = [];

    if (params.operation) {
      if (params.operation.amount > this.riskLimits.maxPositionSize) {
        violations.push('Position size exceeds limit');
      }
    }

    if (params.portfolio) {
      const totalValue = params.portfolio.positions.reduce((sum, p) => sum + p.value, 0);
      if (totalValue > this.riskLimits.maxExposure) {
        violations.push('Total exposure exceeds limit');
      }
    }

    return violations;
  }

  private async sendRiskAlert(violations: string[]): Promise<void> {
    const payload: RiskAlertPayload = {
      type: 'risk_alert',
      alertId: `alert_${Date.now()}`,
      severity: 'high',
      category: 'exposure_limit',
      description: violations.join('; '),
      affectedAgents: [],
      suggestedAction: 'Reduce positions',
      requiresHalt: violations.length > 2,
    };

    const message = createMessage({
      type: 'risk_alert',
      senderId: this.id,
      senderRole: this.role,
      targetRole: 'coordinator',
      payload,
      priority: 'critical',
    });

    await this.messageBus.publish(message);

    this.emitEvent('risk_alert', {
      violations,
      severity: payload.severity,
    }, 'warning');
  }

  async checkOperation(operation: {
    type: string;
    amount: number;
    token: string;
    agentId: string;
  }): Promise<{ approved: boolean; reason?: string }> {
    if (operation.amount > this.riskLimits.maxPositionSize) {
      return { approved: false, reason: 'Exceeds position size limit' };
    }

    const currentExposure = this.currentExposure.get(operation.agentId) ?? 0;
    if (currentExposure + operation.amount > this.riskLimits.maxExposure) {
      return { approved: false, reason: 'Exceeds total exposure limit' };
    }

    return { approved: true };
  }

  updateLimits(limits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...limits };
  }

  protected async handleRiskAlert(message: AgentMessage): Promise<void> {
    const payload = message.payload as RiskAlertPayload;

    if (payload.requiresHalt) {
      // Broadcast emergency stop
      const stopMessage = createMessage({
        type: 'control_command',
        senderId: this.id,
        senderRole: this.role,
        payload: {
          type: 'control_command',
          command: 'pause' as const,
          reason: payload.description,
          initiator: this.id,
        },
        priority: 'critical',
      });

      await this.messageBus.publish(stopMessage);
    }
  }
}

// ============================================================================
// Data Agent
// ============================================================================

/**
 * Data Agent - Collects and processes market signals and data
 */
export class DataAgent extends BaseAgent {
  private dataCache: Map<string, CachedData> = new Map();

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void
  ) {
    super({ ...config, role: 'data' }, messageBus, eventCallback);
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = ['data_collection', 'opportunity_scan'];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'data_collection':
        return this.collectData(task);
      case 'opportunity_scan':
        return this.scanOpportunities(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async collectData(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      tokens?: string[];
      dataTypes?: string[];
    };

    const tokens = params.tokens ?? ['TON', 'USDT'];
    const data: Record<string, TokenData> = {};

    for (const token of tokens) {
      data[token] = await this.fetchTokenData(token);
      this.cacheData(token, data[token]);
    }

    return {
      success: true,
      data,
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
      metrics: {
        tokensCollected: tokens.length,
      },
    };
  }

  private async scanOpportunities(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      type?: 'arbitrage' | 'yield' | 'all';
      minProfit?: number;
    };

    const opportunities: Opportunity[] = [];

    // Scan for arbitrage opportunities
    if (params.type === 'arbitrage' || params.type === 'all') {
      const arbOpps = await this.scanArbitrageOpportunities(params.minProfit ?? 0.001);
      opportunities.push(...arbOpps);
    }

    // Scan for yield opportunities
    if (params.type === 'yield' || params.type === 'all') {
      const yieldOpps = await this.scanYieldOpportunities();
      opportunities.push(...yieldOpps);
    }

    // Notify strategist agents of opportunities
    for (const opp of opportunities) {
      if (opp.profit > (params.minProfit ?? 0.001)) {
        await this.notifyOpportunity(opp);
      }
    }

    return {
      success: true,
      data: { opportunities },
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
      metrics: {
        opportunitiesFound: opportunities.length,
      },
    };
  }

  private async fetchTokenData(token: string): Promise<TokenData> {
    // Simulate data fetching
    return {
      token,
      price: Math.random() * 10 + 1,
      volume24h: Math.random() * 1000000,
      change24h: (Math.random() - 0.5) * 0.2,
      liquidity: Math.random() * 10000000,
      timestamp: new Date(),
    };
  }

  private cacheData(key: string, data: unknown): void {
    this.dataCache.set(key, {
      data,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000), // 1 minute TTL
    });
  }

  private async scanArbitrageOpportunities(minProfit: number): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Simulate finding opportunities
    if (Math.random() > 0.7) {
      opportunities.push({
        id: `arb_${Date.now()}`,
        type: 'arbitrage',
        token: 'TON',
        profit: Math.random() * 0.02 + minProfit,
        confidence: Math.random() * 0.3 + 0.7,
        expiresAt: new Date(Date.now() + 30000),
        details: {
          buyDex: 'dedust',
          sellDex: 'stonfi',
          spread: Math.random() * 0.01,
        },
      });
    }

    return opportunities;
  }

  private async scanYieldOpportunities(): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Simulate finding yield opportunities
    opportunities.push({
      id: `yield_${Date.now()}`,
      type: 'yield',
      token: 'TON',
      profit: Math.random() * 0.15 + 0.05, // 5-20% APY
      confidence: 0.9,
      expiresAt: new Date(Date.now() + 3600000),
      details: {
        protocol: 'evaa',
        apy: Math.random() * 0.15 + 0.05,
      },
    });

    return opportunities;
  }

  private async notifyOpportunity(opportunity: Opportunity): Promise<void> {
    const message = createMessage({
      type: 'performance_update',
      senderId: this.id,
      senderRole: this.role,
      targetRole: 'strategist',
      payload: {
        type: 'state_sync',
        scope: 'partial',
        stateType: 'signal',
        data: { opportunity },
        version: Date.now(),
      },
      priority: opportunity.profit > 0.01 ? 'high' : 'normal',
    });

    await this.messageBus.publish(message);
  }
}

// ============================================================================
// Portfolio Agent
// ============================================================================

/**
 * Portfolio Agent - Coordinates capital allocation across agents
 */
export class PortfolioAgent extends BaseAgent {
  private allocations: Map<string, number> = new Map();
  private totalCapital: number;
  private reserveRatio: number;

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void,
    options?: { totalCapital?: number; reserveRatio?: number }
  ) {
    super({ ...config, role: 'portfolio' }, messageBus, eventCallback);
    this.totalCapital = options?.totalCapital ?? 10000;
    this.reserveRatio = options?.reserveRatio ?? 0.2;
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = ['rebalance'];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'rebalance':
        return this.rebalancePortfolio(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async rebalancePortfolio(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const params = task.parameters as {
      targetAllocations?: Record<string, number>;
      reason?: string;
    };

    const availableCapital = this.totalCapital * (1 - this.reserveRatio);
    const changes: Array<{ agentId: string; from: number; to: number }> = [];

    if (params.targetAllocations) {
      for (const [agentId, targetRatio] of Object.entries(params.targetAllocations)) {
        const currentAllocation = this.allocations.get(agentId) ?? 0;
        const targetAllocation = availableCapital * targetRatio;

        if (Math.abs(currentAllocation - targetAllocation) > 10) {
          changes.push({
            agentId,
            from: currentAllocation,
            to: targetAllocation,
          });
          this.allocations.set(agentId, targetAllocation);
        }
      }
    }

    // Notify affected agents
    for (const change of changes) {
      await this.notifyAllocationChange(change);
    }

    return {
      success: true,
      data: {
        changes,
        newAllocations: Object.fromEntries(this.allocations),
        totalAllocated: Array.from(this.allocations.values()).reduce((a, b) => a + b, 0),
        availableCapital,
      },
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  async requestCapital(request: CapitalRequest): Promise<{ approved: boolean; amount: number; reason?: string }> {
    const availableCapital = this.getAvailableCapital();
    const currentAllocation = this.allocations.get(request.agentId) ?? 0;
    const maxAllocation = this.totalCapital * 0.3; // Max 30% per agent

    if (currentAllocation + request.amount > maxAllocation) {
      return {
        approved: false,
        amount: 0,
        reason: 'Would exceed maximum allocation per agent',
      };
    }

    if (request.amount > availableCapital) {
      const partialAmount = Math.min(request.amount, availableCapital);
      if (partialAmount > 0) {
        this.allocations.set(request.agentId, currentAllocation + partialAmount);
        return {
          approved: true,
          amount: partialAmount,
          reason: 'Partial allocation due to limited availability',
        };
      }
      return {
        approved: false,
        amount: 0,
        reason: 'Insufficient available capital',
      };
    }

    this.allocations.set(request.agentId, currentAllocation + request.amount);
    return { approved: true, amount: request.amount };
  }

  releaseCapital(agentId: string, amount: number): boolean {
    const currentAllocation = this.allocations.get(agentId) ?? 0;
    if (amount > currentAllocation) {
      return false;
    }

    this.allocations.set(agentId, currentAllocation - amount);
    return true;
  }

  getAvailableCapital(): number {
    const allocated = Array.from(this.allocations.values()).reduce((a, b) => a + b, 0);
    return this.totalCapital * (1 - this.reserveRatio) - allocated;
  }

  getAllocations(): Map<string, number> {
    return new Map(this.allocations);
  }

  private async notifyAllocationChange(change: {
    agentId: string;
    from: number;
    to: number;
  }): Promise<void> {
    const message = createMessage({
      type: 'resource_grant',
      senderId: this.id,
      senderRole: this.role,
      targetId: change.agentId,
      payload: {
        type: 'resource_request',
        resourceType: 'capital' as const,
        amount: change.to - change.from,
        justification: 'Portfolio rebalance',
      },
      priority: 'high',
    });

    await this.messageBus.publish(message);
  }

  protected getResourceUsage(): ResourceUsage {
    return {
      capitalAllocated: Array.from(this.allocations.values()).reduce((a, b) => a + b, 0),
      activePositions: this.allocations.size,
      pendingTransactions: 0,
      memoryUsageBytes: 0,
      lastUpdated: new Date(),
    };
  }
}

// ============================================================================
// Coordinator Agent
// ============================================================================

/**
 * Coordinator Agent - Orchestrates swarm behavior and manages agent lifecycle
 */
export class CoordinatorAgent extends BaseAgent {
  private managedAgents: Map<string, AgentInfo> = new Map();
  private swarmState: 'active' | 'paused' | 'terminating' = 'active';

  constructor(
    config: MultiAgentConfig,
    messageBus: MessageBus,
    eventCallback?: (event: MultiAgentEvent) => void
  ) {
    super({ ...config, role: 'coordinator' }, messageBus, eventCallback);
  }

  canHandle(task: Task): boolean {
    const supportedTypes: AgentTaskType[] = ['maintenance'];
    return supportedTypes.includes(task.type);
  }

  protected async doExecuteTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    switch (task.type) {
      case 'maintenance':
        return this.performMaintenance(task);
      default:
        return {
          success: false,
          error: `Unsupported task type: ${task.type}`,
          executionTime: Date.now() - startTime,
          resourcesUsed: this.getResourceUsage(),
        };
    }
  }

  private async performMaintenance(_task: Task): Promise<TaskResult> {
    const startTime = Date.now();

    // Health check all managed agents
    const healthChecks: Array<{ agentId: string; healthy: boolean }> = [];

    for (const [agentId, info] of this.managedAgents) {
      const timeSinceHeartbeat = Date.now() - info.lastHeartbeat.getTime();
      const healthy = timeSinceHeartbeat < 30000; // 30 seconds threshold

      healthChecks.push({ agentId, healthy });

      if (!healthy) {
        await this.handleUnhealthyAgent(agentId);
      }
    }

    return {
      success: true,
      data: {
        agentsChecked: healthChecks.length,
        healthyAgents: healthChecks.filter((h) => h.healthy).length,
        unhealthyAgents: healthChecks.filter((h) => !h.healthy).length,
      },
      executionTime: Date.now() - startTime,
      resourcesUsed: this.getResourceUsage(),
    };
  }

  registerAgent(agentId: string, role: AgentRole): void {
    this.managedAgents.set(agentId, {
      agentId,
      role,
      status: 'active',
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
    });
  }

  unregisterAgent(agentId: string): void {
    this.managedAgents.delete(agentId);
  }

  async broadcastCommand(command: 'pause' | 'resume' | 'emergency_stop', reason: string): Promise<void> {
    const message = createMessage({
      type: 'control_command',
      senderId: this.id,
      senderRole: this.role,
      payload: {
        type: 'control_command',
        command,
        reason,
        initiator: this.id,
      },
      priority: 'critical',
    });

    await this.messageBus.publish(message);

    if (command === 'pause' || command === 'emergency_stop') {
      this.swarmState = 'paused';
    } else if (command === 'resume') {
      this.swarmState = 'active';
    }
  }

  getSwarmState(): 'active' | 'paused' | 'terminating' {
    return this.swarmState;
  }

  getManagedAgents(): AgentInfo[] {
    return Array.from(this.managedAgents.values());
  }

  private async handleUnhealthyAgent(agentId: string): Promise<void> {
    this.emitEvent('agent_error', {
      agentId,
      type: 'heartbeat_timeout',
    }, 'warning');

    // Try to restart the agent
    const restartMessage = createMessage({
      type: 'control_command',
      senderId: this.id,
      senderRole: this.role,
      targetId: agentId,
      payload: {
        type: 'control_command',
        command: 'restart' as const,
        reason: 'Heartbeat timeout',
        initiator: this.id,
      },
      priority: 'high',
    });

    await this.messageBus.publish(restartMessage);
  }

  protected async handleStateSync(message: AgentMessage): Promise<void> {
    // Update heartbeat for the sender
    const info = this.managedAgents.get(message.senderId);
    if (info) {
      info.lastHeartbeat = new Date();
      this.managedAgents.set(message.senderId, info);
    }
  }
}

// ============================================================================
// Helper Types
// ============================================================================

// StrategyState is reserved for future strategy tracking features

interface TransactionState {
  id: string;
  status: 'pending' | 'confirmed' | 'failed';
  params: unknown;
  startedAt: Date;
  completedAt?: Date;
}

interface RiskLimits {
  maxExposure: number;
  maxDrawdown: number;
  maxPositionSize: number;
  dailyLossLimit: number;
  velocityLimit: number;
}

interface CachedData {
  data: unknown;
  cachedAt: Date;
  expiresAt: Date;
}

// DataSubscription is reserved for future subscription features

interface TokenData {
  token: string;
  price: number;
  volume24h: number;
  change24h: number;
  liquidity: number;
  timestamp: Date;
}

interface Opportunity {
  id: string;
  type: 'arbitrage' | 'yield';
  token: string;
  profit: number;
  confidence: number;
  expiresAt: Date;
  details: Record<string, unknown>;
}

interface AgentInfo {
  agentId: string;
  role: AgentRole;
  status: 'active' | 'paused' | 'error';
  registeredAt: Date;
  lastHeartbeat: Date;
}
