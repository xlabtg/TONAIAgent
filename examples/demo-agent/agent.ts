/**
 * TONAIAgent - Demo Agent Runtime
 *
 * Main DemoAgent class implementing the 9-step autonomous execution cycle
 * specified in Issue #83:
 *
 *   1. Load config
 *   2. Fetch market data
 *   3. Call AI (Groq)
 *   4. Generate decision
 *   5. Validate risk
 *   6. Simulate / execute
 *   7. Log trade
 *   8. Update metrics
 *   9. Notify
 *
 * Supports simulation mode (no real funds) and live mode (future).
 * Integrates with: Agent Runtime (Issue #81), Smart Contract Factory (Issue #41).
 */

import type {
  AgentConfig,
  AgentMetrics,
  AgentStatusResponse,
  AgentMetricsResponse,
  AgentHistoryResponse,
  CreateAgentRequest,
  DemoAgent,
  DemoAgentEvent,
  DemoAgentEventCallback,
  DemoAgentService,
  ExecutionLog,
  ExecutionStep,
  SimulationBalance,
} from './types';

import { defaultAgentConfig } from './types';
import { getStrategy } from './strategies';
import {
  SimulationBalanceManager,
  MarketSimulator,
  createMarketSimulator,
  createSimulationBalanceManager,
} from './simulation';
import { RiskManager, createRiskManager } from './risk';

// ============================================================================
// Internal Agent State
// ============================================================================

/** Internal tracking state for a running agent */
interface AgentState {
  agent: DemoAgent;
  metrics: AgentMetrics;
  simulationBalance: SimulationBalance;
  marketSimulator: MarketSimulator;
  executionLogs: ExecutionLog[];
  executionCount: number;
  intervalHandle?: ReturnType<typeof setInterval>;
}

// ============================================================================
// Demo Agent Manager (implements DemoAgentService)
// ============================================================================

/**
 * DemoAgentManager — the central service for creating and running demo agents.
 *
 * Manages agent lifecycle, the 9-step execution cycle, simulation balances,
 * risk controls, and event emission.
 */
export class DemoAgentManager implements DemoAgentService {
  private readonly agents: Map<string, AgentState> = new Map();
  private readonly balanceManager: SimulationBalanceManager;
  private readonly riskManager: RiskManager;
  private readonly eventCallbacks: DemoAgentEventCallback[] = [];

  constructor() {
    this.balanceManager = createSimulationBalanceManager();
    this.riskManager = createRiskManager();
  }

  // ============================================================================
  // Agent Lifecycle
  // ============================================================================

  /**
   * POST /agent/create — create a new demo agent
   */
  async createAgent(request: CreateAgentRequest): Promise<DemoAgent> {
    const { userId, config } = request;
    const agentId = `demo_agent_${userId}_${Date.now()}`;

    const mergedConfig: AgentConfig = { ...defaultAgentConfig, ...config };

    const now = new Date();
    const agent: DemoAgent = {
      id: agentId,
      userId,
      config: mergedConfig,
      status: 'created',
      createdAt: now,
      updatedAt: now,
    };

    const marketSimulator = createMarketSimulator('TON');
    const initialPrice = marketSimulator.getCurrentPrice();
    const simulationBalance = this.balanceManager.initBalance(agentId, mergedConfig, initialPrice);

    const metrics = createInitialMetrics(agentId);

    this.agents.set(agentId, {
      agent,
      metrics,
      simulationBalance,
      marketSimulator,
      executionLogs: [],
      executionCount: 0,
    });

    this.emitEvent({
      type: 'agent_created',
      agentId,
      userId,
      timestamp: now,
      data: { config: mergedConfig },
    });

    return { ...agent };
  }

  /**
   * POST /agent/start — activate an agent
   */
  async startAgent(agentId: string): Promise<DemoAgent> {
    const state = this.getState(agentId);

    if (state.agent.status !== 'created' && state.agent.status !== 'paused') {
      throw new Error(`Cannot start agent in '${state.agent.status}' status.`);
    }

    state.agent.status = 'active';
    state.agent.updatedAt = new Date();

    // Schedule recurring execution
    if (!state.intervalHandle) {
      state.intervalHandle = setInterval(
        () => this.runExecutionCycle(agentId).catch(() => { /* logged internally */ }),
        state.agent.config.executionIntervalMs,
      );
    }

    this.emitEvent({
      type: 'agent_started',
      agentId,
      userId: state.agent.userId,
      timestamp: new Date(),
      data: { strategy: state.agent.config.strategy },
    });

    return { ...state.agent };
  }

  /**
   * POST /agent/pause — pause a running agent
   */
  async pauseAgent(agentId: string, reason?: string): Promise<DemoAgent> {
    const state = this.getState(agentId);

    if (state.agent.status !== 'active') {
      throw new Error(`Cannot pause agent in '${state.agent.status}' status.`);
    }

    this.clearInterval(state);
    state.agent.status = 'paused';
    state.agent.updatedAt = new Date();

    this.emitEvent({
      type: 'agent_paused',
      agentId,
      userId: state.agent.userId,
      timestamp: new Date(),
      data: { reason: reason ?? 'manual_pause' },
    });

    return { ...state.agent };
  }

  /**
   * Stop an agent permanently
   */
  async stopAgent(agentId: string): Promise<DemoAgent> {
    const state = this.getState(agentId);

    this.clearInterval(state);
    state.agent.status = 'stopped';
    state.agent.updatedAt = new Date();

    this.emitEvent({
      type: 'agent_stopped',
      agentId,
      userId: state.agent.userId,
      timestamp: new Date(),
      data: { finalRoi: state.simulationBalance.roi },
    });

    return { ...state.agent };
  }

  /**
   * Activate kill switch — immediate emergency stop
   */
  async activateKillSwitch(agentId: string, reason: string): Promise<DemoAgent> {
    const state = this.getState(agentId);

    this.riskManager.activateKillSwitch(agentId, reason);
    this.clearInterval(state);
    state.agent.status = 'stopped';
    state.agent.updatedAt = new Date();

    this.log(state, 'validate_risk', `Kill switch activated: ${reason}`, 'warn', {
      killSwitchReason: reason,
    });

    this.emitEvent({
      type: 'kill_switch_activated',
      agentId,
      userId: state.agent.userId,
      timestamp: new Date(),
      data: { reason },
    });

    return { ...state.agent };
  }

  // ============================================================================
  // GET Endpoints
  // ============================================================================

  /**
   * GET /agent/status
   */
  getAgentStatus(agentId: string): AgentStatusResponse {
    const state = this.getState(agentId);
    return {
      agent: { ...state.agent },
      balance: this.balanceManager.getBalance(agentId),
      metrics: { ...state.metrics },
    };
  }

  /**
   * GET /agent/metrics
   */
  getAgentMetrics(agentId: string): AgentMetricsResponse {
    const state = this.getState(agentId);
    const recentLogs = state.executionLogs.slice(-20);
    return {
      metrics: { ...state.metrics },
      recentLogs,
    };
  }

  /**
   * GET /agent/history
   */
  getAgentHistory(agentId: string, page = 1, pageSize = 20): AgentHistoryResponse {
    const state = this.getState(agentId);
    const balance = this.balanceManager.getBalance(agentId);

    const totalTrades = balance.trades.length;
    const totalLogs = state.executionLogs.length;
    const totalPages = Math.max(1, Math.ceil(Math.max(totalTrades, totalLogs) / pageSize));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      agentId,
      trades: balance.trades.slice(start, end),
      logs: state.executionLogs.slice(start, end),
      totalPages,
      page,
    };
  }

  /**
   * Manually trigger one execution cycle (for testing/demo)
   */
  async executeOnce(agentId: string): Promise<ExecutionLog[]> {
    const state = this.getState(agentId);
    const before = state.executionLogs.length;
    await this.runExecutionCycle(agentId);
    return state.executionLogs.slice(before);
  }

  /**
   * Reset simulation state (replay/reset feature)
   */
  async resetSimulation(agentId: string): Promise<SimulationBalance> {
    const state = this.getState(agentId);

    // Clear interval and stop agent
    this.clearInterval(state);
    state.agent.status = 'paused';

    // Reset simulator and balance
    state.marketSimulator.reset();
    const newBalance = this.balanceManager.resetBalance(
      agentId,
      state.agent.config,
      state.marketSimulator.getCurrentPrice(),
    );

    state.simulationBalance = newBalance;
    state.metrics = createInitialMetrics(agentId);
    state.executionLogs = [];
    state.executionCount = 0;
    state.agent.updatedAt = new Date();

    return this.balanceManager.getBalance(agentId);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to demo agent events
   */
  onEvent(callback: DemoAgentEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // 9-Step Execution Cycle
  // ============================================================================

  /**
   * Run one complete execution cycle for an agent.
   *
   * Steps:
   *   1. load_config
   *   2. fetch_market_data
   *   3. call_ai
   *   4. generate_decision
   *   5. validate_risk
   *   6. simulate_execute
   *   7. log_trade
   *   8. update_metrics
   *   9. notify
   */
  private async runExecutionCycle(agentId: string): Promise<void> {
    const state = this.getState(agentId);

    if (state.agent.status !== 'active') return;

    state.metrics.totalExecutions++;

    try {
      // Step 1: Load config
      this.log(state, 'load_config', 'Loading agent configuration.', 'info', {
        strategy: state.agent.config.strategy,
        executionMode: state.agent.config.executionMode,
      });

      // Step 2: Fetch market data
      const marketData = state.marketSimulator.nextTick();
      this.log(state, 'fetch_market_data', `Market data fetched: ${marketData.symbol} @ $${marketData.price.toFixed(4)}.`, 'info', {
        price: marketData.price,
        change24h: marketData.change24h,
        liquidity: marketData.liquidity,
      });

      // Step 3: Call AI (simulated Groq call)
      this.log(state, 'call_ai', 'Requesting strategy decision from AI (simulated).', 'info');

      // Step 4: Generate decision from strategy
      const strategyFn = getStrategy(state.agent.config.strategy);
      const currentBalance = this.balanceManager.getBalance(agentId);
      const decision = strategyFn({
        config: state.agent.config,
        market: marketData,
        balance: currentBalance,
        executionCount: state.executionCount,
      });

      this.log(state, 'generate_decision', `Decision: ${decision.action.toUpperCase()} ${decision.amount ? `${decision.amount.toFixed(4)} TON` : ''}. ${decision.reasoning}`, 'info', {
        action: decision.action,
        amount: decision.amount,
        confidence: decision.confidence,
      });

      // Step 5: Validate risk
      const riskResult = this.riskManager.validateDecision(
        state.agent,
        decision,
        currentBalance,
        state.metrics,
      );

      if (!riskResult.allowed) {
        this.log(state, 'validate_risk', `Risk check BLOCKED: ${riskResult.reason}`, 'warn', {
          flags: riskResult.flags,
        });

        // Check if we should auto-pause
        const autoPause = this.riskManager.shouldAutoPause(state.metrics);
        if (autoPause.pause) {
          await this.pauseAgent(agentId, autoPause.reason);
        }

        this.emitEvent({
          type: 'risk_triggered',
          agentId,
          userId: state.agent.userId,
          timestamp: new Date(),
          data: { reason: riskResult.reason, flags: riskResult.flags },
        });

        state.metrics.failedExecutions++;
        return;
      }

      this.log(state, 'validate_risk', 'Risk check PASSED.', 'info', { flags: riskResult.flags });

      // Step 6: Simulate / execute
      const trade = this.balanceManager.applyTrade(
        agentId,
        decision,
        marketData,
        state.agent.config.strategy,
      );

      if (trade) {
        this.log(state, 'simulate_execute', `Trade executed [SIM]: ${trade.type.toUpperCase()} ${trade.amount.toFixed(4)} ${trade.symbol} @ $${trade.price.toFixed(4)} (fee: $${trade.fee.toFixed(4)}).`, 'info', {
          tradeId: trade.id,
          type: trade.type,
          amount: trade.amount,
          price: trade.price,
        });

        // Step 7: Log trade
        this.log(state, 'log_trade', `Trade logged: ${trade.id}. PnL: $${trade.pnl.toFixed(4)}.`, 'info', {
          tradeId: trade.id,
          pnl: trade.pnl,
        });
      } else {
        this.log(state, 'simulate_execute', `No trade executed (${decision.action} — held position or insufficient balance).`, 'info');
        this.log(state, 'log_trade', 'No trade to log.', 'info');
      }

      // Step 8: Update metrics
      const updatedBalance = this.balanceManager.getBalance(agentId);
      this.balanceManager.updatePnl(agentId, marketData.price);
      this.riskManager.trackDrawdown(state.metrics, updatedBalance);
      this.updateMetrics(state, updatedBalance);

      this.log(state, 'update_metrics', `Metrics updated: ROI ${updatedBalance.roi.toFixed(2)}%, PnL $${updatedBalance.totalPnl.toFixed(4)}, win rate ${state.metrics.winRate.toFixed(1)}%.`, 'info', {
        roi: updatedBalance.roi,
        totalPnl: updatedBalance.totalPnl,
        winRate: state.metrics.winRate,
      });

      // Step 9: Notify
      this.log(state, 'notify', 'Execution cycle complete. Dashboard updated.', 'info');

      if (trade) {
        this.emitEvent({
          type: 'trade_executed',
          agentId,
          userId: state.agent.userId,
          timestamp: new Date(),
          data: {
            tradeId: trade.id,
            type: trade.type,
            amount: trade.amount,
            price: trade.price,
            pnl: trade.pnl,
          },
        });
      }

      this.emitEvent({
        type: 'metrics_updated',
        agentId,
        userId: state.agent.userId,
        timestamp: new Date(),
        data: {
          roi: updatedBalance.roi,
          totalPnl: updatedBalance.totalPnl,
          totalTrades: state.metrics.totalTrades,
        },
      });

      state.metrics.successfulExecutions++;
      state.agent.lastExecutionAt = new Date();
      state.executionCount++;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state.metrics.failedExecutions++;

      this.log(state, 'log_trade', `Execution cycle error: ${message}`, 'error', { error: message });

      state.agent.status = 'error';
      state.agent.errorMessage = message;

      this.emitEvent({
        type: 'agent_error',
        agentId,
        userId: state.agent.userId,
        timestamp: new Date(),
        data: { error: message },
      });

      // Auto-pause on persistent failures
      const autoPause = this.riskManager.shouldAutoPause(state.metrics);
      if (autoPause.pause) {
        this.clearInterval(state);
        state.agent.status = 'paused';
        this.log(state, 'validate_risk', `Auto-paused: ${autoPause.reason}`, 'warn');
      }
    }
  }

  // ============================================================================
  // Metrics Update
  // ============================================================================

  private updateMetrics(state: AgentState, balance: SimulationBalance): void {
    const metrics = state.metrics;
    const trades = balance.trades;

    metrics.totalTrades = trades.length;
    metrics.totalPnl = balance.totalPnl;
    metrics.roi = balance.roi;

    // Win rate: trades with positive PnL
    const profitableTrades = trades.filter((t) => t.pnl > 0).length;
    metrics.winRate = trades.length > 0 ? (profitableTrades / trades.length) * 100 : 0;

    // Average trade profit
    const totalProfit = trades.reduce((sum, t) => sum + t.pnl, 0);
    metrics.avgTradeProfit = trades.length > 0 ? totalProfit / trades.length : 0;

    // Uptime: successful executions / total
    metrics.uptime = metrics.totalExecutions > 0
      ? (metrics.successfulExecutions / metrics.totalExecutions) * 100
      : 100;

    metrics.updatedAt = new Date();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getState(agentId: string): AgentState {
    const state = this.agents.get(agentId);
    if (!state) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return state;
  }

  private clearInterval(state: AgentState): void {
    if (state.intervalHandle !== undefined) {
      clearInterval(state.intervalHandle);
      state.intervalHandle = undefined;
    }
  }

  private log(
    state: AgentState,
    step: ExecutionStep,
    message: string,
    level: 'info' | 'warn' | 'error',
    data?: Record<string, unknown>,
  ): void {
    const entry: ExecutionLog = {
      id: `log_${state.agent.id}_${Date.now()}_${state.executionLogs.length}`,
      agentId: state.agent.id,
      step,
      message,
      level,
      data,
      timestamp: new Date(),
    };
    state.executionLogs.push(entry);

    // Keep log size bounded (last 1000 entries)
    if (state.executionLogs.length > 1000) {
      state.executionLogs.splice(0, state.executionLogs.length - 1000);
    }
  }

  private emitEvent(event: DemoAgentEvent): void {
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
// Helpers
// ============================================================================

function createInitialMetrics(agentId: string): AgentMetrics {
  return {
    agentId,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalTrades: 0,
    winRate: 0,
    roi: 0,
    totalPnl: 0,
    maxDrawdownExperienced: 0,
    avgTradeProfit: 0,
    uptime: 100,
    updatedAt: new Date(),
  };
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new DemoAgentManager instance
 */
export function createDemoAgentManager(): DemoAgentManager {
  return new DemoAgentManager();
}
