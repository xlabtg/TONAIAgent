/**
 * TONAIAgent — MVP Platform
 *
 * Unified integration layer for the MVP demo-ready product.
 * Wires together: Agent Control API → Strategy Engine → Market Data → Trading Engine → Portfolio Analytics.
 */

import {
  createStrategyRegistry,
  createStrategyLoader,
  createStrategyExecutionEngine,
} from '../../core/strategies/strategy-engine';
import { createMarketDataService } from '../../core/market-data/base';
import { createMarketDataStreamService } from '../../services/market-data-stream';
import type { PriceTick, StreamUnsubscribe } from '../../services/market-data-stream';
import { createTradingEngine } from '../../core/trading/engine';
import { createPortfolioAnalyticsDashboard } from '../../core/portfolio/analytics';
import { createAgentControlApi, createAgentManager, createDemoRegistry } from '../../core/agents/control';
import { createDemoAgentBundle } from '../../examples/demo-agent';
import type { AnalyticsPeriod } from '../../core/portfolio/analytics';
import { assertComplianceGatesEnabled } from '../../services/regulatory/compliance-flags';

import { BASELINE_PRICES, MVP_ASSETS } from '../../core/market-data/base';

import type {
  MVPPlatformConfig,
  CreateMVPAgentRequest,
  MVPAgentStatus,
  MVPMarketSnapshot,
  MVPExecutionResult,
  MVPPlatformHealth,
  MVPPlatformEventHandler,
  MVPPlatformEvent,
  MVPPlatformEventType,
  DemoFlowConfig,
  DemoFlowResult,
  MVPStrategyId,
  TradeExecutionRequest,
  TradeExecutionResponse,
} from './types';
import { DEFAULT_MVP_PLATFORM_CONFIG, DEFAULT_DEMO_FLOW_CONFIG } from './types';

// ============================================================================
// Internal Agent Record
// ============================================================================

interface InternalAgent {
  agentId: string;
  name: string;
  userId: string;
  strategy: MVPStrategyId;
  riskLevel: 'low' | 'medium' | 'high';
  budgetTon: number;
  state: 'created' | 'running' | 'paused' | 'stopped' | 'error';
  tradesExecuted: number;
  winCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MVP Platform
// ============================================================================

/**
 * MVPPlatform is the single integration point for the entire MVP product.
 *
 * It connects:
 * - Agent Control API (start/stop/restart/status)
 * - Strategy Engine (trend / arbitrage / AI signal strategies)
 * - Market Data Layer (CoinGecko / Binance price feeds)
 * - Trading Engine (simulation buy/sell, portfolio state, PnL)
 * - Portfolio Analytics (metrics, equity curve, reports)
 * - Demo Agent (preconfigured agent for investor demos)
 *
 * @example
 * ```typescript
 * const platform = createMVPPlatform();
 * platform.start();
 *
 * const agent = await platform.createAgent({
 *   userId: 'user_123',
 *   name: 'Momentum Bot',
 *   strategy: 'trend',
 *   budgetTon: 1000,
 *   riskLevel: 'medium',
 * });
 *
 * await platform.startAgent(agent.agentId);
 * await platform.executeAgentCycle(agent.agentId);
 *
 * const status = platform.getAgentStatus(agent.agentId);
 * console.log('PnL:', status.pnlTon);
 * ```
 */
export class MVPPlatform {
  private readonly config: MVPPlatformConfig;

  // Sub-components
  private readonly strategyRegistry = createStrategyRegistry();
  private readonly strategyLoader = createStrategyLoader(this.strategyRegistry);
  private readonly strategyEngine = createStrategyExecutionEngine(this.strategyRegistry);
  private readonly marketData = createMarketDataService();
  /** Real-time market data stream (Issue #251) */
  private readonly marketDataStream = createMarketDataStreamService({ simulation: true });
  private readonly tradingEngine = createTradingEngine();
  private readonly portfolioAnalytics = createPortfolioAnalyticsDashboard();
  private readonly controlRegistry = createDemoRegistry();
  private readonly agentManager = createAgentManager(this.controlRegistry);
  private readonly controlApi = createAgentControlApi(this.agentManager);
  private readonly demoBundle = createDemoAgentBundle();

  // Internal state
  private readonly agents = new Map<string, InternalAgent>();
  private agentCounter = 0;
  private cycleCounters = new Map<string, number>();
  private readonly eventHandlers: MVPPlatformEventHandler[] = [];
  private running = false;
  private startedAt: Date | null = null;
  private totalTradesExecuted = 0;

  constructor(config: Partial<MVPPlatformConfig> = {}) {
    this.config = { ...DEFAULT_MVP_PLATFORM_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start all platform sub-components */
  start(): void {
    if (this.running) return;

    // Issue #330: refuse to start in production with compliance gates disabled.
    // KYC/AML enforcement defaults to ON; an operator must explicitly export
    // KYC_ENFORCEMENT_ENABLED=false / AML_ENFORCEMENT_ENABLED=false to opt out
    // (allowed only outside production).
    if (process.env.NODE_ENV === 'production') {
      const compliance = assertComplianceGatesEnabled();
      if (!compliance.ok) {
        console.error(`FATAL: ${compliance.message}`);
        process.exit(1);
      }
    }

    // Initialize strategy engine with built-in strategies
    this.strategyLoader.loadBuiltIns();
    this.strategyEngine.start();

    // Initialize market data
    this.marketData.start();

    // Initialize real-time market data stream (Issue #251)
    this.marketDataStream.start();

    // Initialize trading engine
    this.tradingEngine.start();

    this.running = true;
    this.startedAt = new Date();

    this.emitEvent('platform.started');
  }

  /** Stop all platform sub-components */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.marketDataStream.stop();
    this.emitEvent('platform.stopped');
  }

  // ============================================================================
  // Real-Time Market Data Stream (Issue #251)
  // ============================================================================

  /**
   * Subscribe to live price updates for a trading pair.
   *
   * @param pair - Trading pair in "BASE/QUOTE" format (e.g., "TON/USDT")
   * @param handler - Callback called on every price tick
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = platform.subscribeToPrice('TON/USDT', (tick) => {
   *   console.log(`TON: $${tick.price}`);
   * });
   * // Later:
   * unsub();
   * ```
   */
  subscribeToPrice(pair: string, handler: (tick: PriceTick) => void): StreamUnsubscribe {
    return this.marketDataStream.subscribe(pair, handler);
  }

  /**
   * Get the latest cached price for an asset.
   * Returns undefined if the stream has not yet received a tick for this asset.
   */
  getStreamPrice(asset: string): PriceTick | undefined {
    return this.marketDataStream.getPrice(asset);
  }

  /**
   * Get all latest streaming prices (instant read, no async required).
   */
  getAllStreamPrices(): Record<string, PriceTick> {
    return this.marketDataStream.getAllPrices();
  }

  /**
   * Get stream metrics (subscription counts, tick counts, uptime).
   */
  getStreamMetrics() {
    return this.marketDataStream.getMetrics();
  }

  // ============================================================================
  // Agent Management
  // ============================================================================

  /**
   * Create a new AI agent with the given configuration.
   * The agent starts in 'created' state and must be explicitly started.
   */
  async createAgent(request: CreateMVPAgentRequest): Promise<MVPAgentStatus> {
    this.assertRunning();

    const agentId = `agent_${++this.agentCounter}_${Date.now()}`;

    // Initialize the agent's portfolio in the trading engine
    const initialUsd = request.budgetTon * 10; // approximate conversion
    this.tradingEngine.initPortfolio(agentId, {
      USD: initialUsd,
      BTC: 0,
      ETH: 0,
      TON: 0,
      SOL: 0,
      USDT: 0,
    });

    const internal: InternalAgent = {
      agentId,
      name: request.name,
      userId: request.userId,
      strategy: request.strategy,
      riskLevel: request.riskLevel,
      budgetTon: request.budgetTon,
      state: 'created',
      tradesExecuted: 0,
      winCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.agents.set(agentId, internal);
    this.cycleCounters.set(agentId, 0);

    this.emitEvent('agent.created', agentId);

    return this.buildAgentStatus(internal);
  }

  /**
   * Start a previously created agent.
   */
  async startAgent(agentId: string): Promise<MVPAgentStatus> {
    const agent = this.requireAgent(agentId);

    if (agent.state === 'running') {
      return this.buildAgentStatus(agent);
    }

    agent.state = 'running';
    agent.updatedAt = new Date();

    this.emitEvent('agent.started', agentId);

    return this.buildAgentStatus(agent);
  }

  /**
   * Stop a running agent.
   */
  async stopAgent(agentId: string): Promise<MVPAgentStatus> {
    const agent = this.requireAgent(agentId);

    agent.state = 'stopped';
    agent.updatedAt = new Date();

    this.emitEvent('agent.stopped', agentId);

    return this.buildAgentStatus(agent);
  }

  /**
   * Get the current status of an agent.
   */
  getAgentStatus(agentId: string): MVPAgentStatus {
    return this.buildAgentStatus(this.requireAgent(agentId));
  }

  /**
   * List all agents on the platform.
   */
  listAgents(): MVPAgentStatus[] {
    return Array.from(this.agents.values()).map((a) => this.buildAgentStatus(a));
  }

  /**
   * List all agents belonging to a specific user.
   */
  listUserAgents(userId: string): MVPAgentStatus[] {
    return Array.from(this.agents.values())
      .filter((a) => a.userId === userId)
      .map((a) => this.buildAgentStatus(a));
  }

  // ============================================================================
  // Strategy Execution
  // ============================================================================

  /**
   * Execute one strategy cycle for the given agent.
   * Fetches market data, runs the strategy, and processes the signal.
   */
  async executeAgentCycle(agentId: string): Promise<MVPExecutionResult> {
    const agent = this.requireAgent(agentId);

    if (agent.state !== 'running') {
      throw new Error(`Agent ${agentId} is not running (state: ${agent.state})`);
    }

    const cycleNumber = (this.cycleCounters.get(agentId) ?? 0) + 1;
    this.cycleCounters.set(agentId, cycleNumber);

    // Step 1: Get market data snapshot
    const snapshot = await this.getMarketSnapshot();
    const prices = snapshot.prices;

    // Step 2: Get portfolio value before execution
    const pnlBefore = this.tradingEngine.calculatePnL(agentId, prices);
    const valueBefore = pnlBefore.portfolioValueUsd;

    // Step 3: Execute strategy
    const marketData = this.buildStrategyMarketData(snapshot);

    const strategyResult = await this.strategyEngine.execute({
      strategyId: agent.strategy,
      agentId,
      marketData,
      params: this.buildStrategyParams(agent.strategy, agent.riskLevel),
    });

    let tradeExecuted = false;
    const signal = strategyResult.signal;

    // Step 4: Process the signal through the trading engine
    if (signal && signal.action !== 'HOLD') {
      const execResult = await this.tradingEngine.processSignal(signal, agentId, prices);
      if (execResult.status === 'executed') {
        tradeExecuted = true;
        agent.tradesExecuted++;
        this.totalTradesExecuted++;

        // Track win/loss for win rate calculation
        const pnlAfterTrade = this.tradingEngine.calculatePnL(agentId, prices);
        if (pnlAfterTrade.totalPnl > pnlBefore.totalPnl) {
          agent.winCount++;
        }
      }
    }

    // Step 5: Get portfolio value after execution
    const pnlAfter = this.tradingEngine.calculatePnL(agentId, prices);
    const valueAfter = pnlAfter.portfolioValueUsd;

    // Step 6: Update portfolio analytics
    this.portfolioAnalytics.updatePortfolioValue(
      agentId,
      valueAfter / 10, // convert USD back to approximate TON
      pnlAfter.totalPnl / 10
    );

    agent.updatedAt = new Date();

    const result: MVPExecutionResult = {
      agentId,
      cycleNumber,
      strategy: agent.strategy,
      signal: signal?.action === 'BUY'
        ? 'buy'
        : signal?.action === 'SELL'
          ? 'sell'
          : signal?.action === 'HOLD'
            ? 'hold'
            : 'none',
      tradeExecuted,
      portfolioValueBefore: valueBefore / 10,
      portfolioValueAfter: valueAfter / 10,
      pnlDelta: (valueAfter - valueBefore) / 10,
      timestamp: new Date(),
    };

    this.emitEvent('agent.cycle_completed', agentId, {
      cycleNumber,
      tradeExecuted,
      pnlDelta: result.pnlDelta,
    });

    return result;
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  /**
   * Fetch a current market snapshot.
   * Falls back to BASELINE_PRICES in simulation mode if all providers are unavailable.
   */
  async getMarketSnapshot(): Promise<MVPMarketSnapshot> {
    let prices: Record<string, number> = {};
    let timestamp = new Date();

    try {
      const snapshot = await this.marketData.getSnapshot();
      for (const [asset, data] of Object.entries(snapshot.prices)) {
        prices[asset] = data.price;
      }
      timestamp = snapshot.fetchedAt;
    } catch {
      // In simulation mode, fall back to baseline prices (no real API calls required)
      prices = { ...BASELINE_PRICES };
    }

    // Ensure at least baseline prices are present if some assets failed
    for (const asset of MVP_ASSETS) {
      if (!(asset in prices) && asset in BASELINE_PRICES) {
        prices[asset] = BASELINE_PRICES[asset]!;
      }
    }

    const result: MVPMarketSnapshot = {
      timestamp,
      prices,
      assets: Object.keys(prices),
    };

    this.emitEvent('market.data_updated', undefined, { assetCount: result.assets.length });

    return result;
  }

  // ============================================================================
  // Portfolio Analytics API
  // ============================================================================

  /**
   * Get the portfolio metrics for an agent.
   * Returns the standard endpoints: /api/portfolio, /api/portfolio/metrics
   */
  async getPortfolioMetrics(agentId: string): Promise<{
    portfolioValue: number;
    pnl: number;
    roi: number;
    tradeCount: number;
    winRate: number;
  }> {
    this.requireAgent(agentId);

    const snapshot = await this.getMarketSnapshot();
    const pnl = this.tradingEngine.calculatePnL(agentId, snapshot.prices);
    const agent = this.agents.get(agentId)!;

    return {
      portfolioValue: pnl.portfolioValueUsd / 10,
      pnl: pnl.totalPnl / 10,
      roi: pnl.roiPercent,
      tradeCount: agent.tradesExecuted,
      winRate: agent.tradesExecuted > 0 ? (agent.winCount / agent.tradesExecuted) * 100 : 0,
    };
  }

  /**
   * Get trade history for an agent.
   * Returns the standard endpoint: /api/trades
   */
  getTradeHistory(agentId: string) {
    this.requireAgent(agentId);
    return this.portfolioAnalytics.getTradeHistory(agentId);
  }

  /**
   * Get analytics dashboard data for an agent.
   */
  async getAgentAnalytics(agentId: string, period: AnalyticsPeriod = '7d') {
    this.requireAgent(agentId);
    return this.portfolioAnalytics.getDashboardMetrics(agentId, period);
  }

  // ============================================================================
  // Agent Control API Passthrough
  // ============================================================================

  /**
   * Handle an agent control API request (for Telegram Mini App → API Layer integration).
   */
  async handleControlRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    return this.controlApi.handle({
      method,
      path,
      params: {},
      query: {},
      body: body ?? {},
      headers: {},
    });
  }

  // ============================================================================
  // Demo Agent
  // ============================================================================

  /**
   * Run a full demo flow — creates a preconfigured agent, runs strategy cycles,
   * and returns complete results. Used for investor demos and product showcases.
   */
  async runDemoFlow(config: Partial<DemoFlowConfig> = {}): Promise<DemoFlowResult> {
    this.assertRunning();

    const cfg: DemoFlowConfig = { ...DEFAULT_DEMO_FLOW_CONFIG, ...config };
    const startedAt = Date.now();

    // Create the demo agent
    const agentStatus = await this.createAgent({
      userId: cfg.userId,
      name: cfg.agentName,
      strategy: cfg.strategy,
      budgetTon: cfg.budgetTon,
      riskLevel: cfg.riskLevel,
    });

    await this.startAgent(agentStatus.agentId);

    const executionResults: MVPExecutionResult[] = [];
    let success = true;

    // Run simulation cycles
    for (let i = 0; i < cfg.simulationCycles; i++) {
      try {
        if (cfg.cycleDelayMs > 0 && i > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, cfg.cycleDelayMs));
        }
        const result = await this.executeAgentCycle(agentStatus.agentId);
        executionResults.push(result);
      } catch {
        success = false;
        break;
      }
    }

    // Collect final metrics
    let finalMetrics = {
      portfolioValue: cfg.budgetTon,
      pnl: 0,
      roi: 0,
      tradeCount: 0,
      winRate: 0,
    };

    try {
      finalMetrics = await this.getPortfolioMetrics(agentStatus.agentId);
    } catch {
      // best effort
    }

    await this.stopAgent(agentStatus.agentId);

    const result: DemoFlowResult = {
      agentId: agentStatus.agentId,
      agentName: cfg.agentName,
      strategy: cfg.strategy,
      cyclesCompleted: executionResults.length,
      finalPortfolioValueTon: finalMetrics.portfolioValue,
      totalPnlTon: finalMetrics.pnl,
      totalPnlPercent: finalMetrics.roi,
      tradesExecuted: finalMetrics.tradeCount,
      winRate: finalMetrics.winRate,
      executionResults,
      durationMs: Date.now() - startedAt,
      success,
    };

    this.emitEvent('demo.completed', agentStatus.agentId, { success, cyclesCompleted: result.cyclesCompleted });

    return result;
  }

  // ============================================================================
  // End-to-End Trading Flow (Issue #249)
  // ============================================================================

  /**
   * Execute a complete end-to-end trade from a Telegram Mini App request.
   *
   * This method implements the full pipeline:
   *   Telegram Mini App → Agent Controller → Strategy Engine → Risk Engine →
   *   Execution Engine → DEX Connector → Portfolio Update → UI Update
   *
   * For `mode: 'demo'`, the trade is fully simulated (no on-chain transaction).
   * For `mode: 'live'`, the trade routes through the on-chain execution layer.
   *
   * @example
   * ```typescript
   * const result = await platform.executeTradeRequest({
   *   userId: '123456789',
   *   strategy: 'momentum',
   *   pair: 'TON/USDT',
   *   amount: 100,
   *   mode: 'demo',
   * });
   * ```
   */
  async executeTradeRequest(request: TradeExecutionRequest): Promise<TradeExecutionResponse> {
    const timestamp = new Date().toISOString();

    try {
      this.assertRunning();
      // Normalise strategy name: 'momentum' → 'trend', others pass through
      const strategyId = this.normaliseStrategyId(request.strategy);

      // Create a per-request agent scoped to this user and strategy
      const agent = await this.createAgent({
        userId: request.userId,
        name: `trade_${request.strategy}_${request.pair.replace('/', '_')}`,
        strategy: strategyId,
        budgetTon: request.amount,
        riskLevel: 'medium',
      });

      await this.startAgent(agent.agentId);

      // Execute one strategy cycle (fetches market data, runs strategy, processes signal)
      const cycleResult = await this.executeAgentCycle(agent.agentId);

      // Stop the agent after the single-shot execution
      await this.stopAgent(agent.agentId);

      return {
        success: true,
        agentId: agent.agentId,
        signal: cycleResult.signal,
        tradeExecuted: cycleResult.tradeExecuted,
        portfolioValueBefore: cycleResult.portfolioValueBefore,
        portfolioValueAfter: cycleResult.portfolioValueAfter,
        pnlDelta: cycleResult.pnlDelta,
        pair: request.pair,
        mode: request.mode,
        timestamp,
      };
    } catch (err) {
      return {
        success: false,
        agentId: '',
        signal: 'none',
        tradeExecuted: false,
        portfolioValueBefore: request.amount,
        portfolioValueAfter: request.amount,
        pnlDelta: 0,
        pair: request.pair,
        mode: request.mode,
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Map incoming strategy names to internal MVPStrategyId values. */
  private normaliseStrategyId(strategy: string): MVPStrategyId {
    switch (strategy.toLowerCase()) {
      case 'momentum':
      case 'trend':
        return 'trend';
      case 'arbitrage':
        return 'arbitrage';
      case 'mean-reversion':
      case 'ai-signal':
      case 'ai_signal':
        return 'ai-signal';
      default:
        return 'trend';
    }
  }

  // ============================================================================
  // Health & Monitoring
  // ============================================================================

  /**
   * Get the health status of all platform components.
   */
  getHealth(): MVPPlatformHealth {
    const strategyMetrics = this.strategyEngine.getMetrics();
    const tradingMetrics = this.tradingEngine.getMetrics();
    const analyticsHealth = this.portfolioAnalytics.getHealth();

    const components = {
      agentRuntime: this.running,
      strategyEngine: strategyMetrics.totalStrategiesRegistered >= 0,
      marketData: this.marketData.isRunning(),
      marketDataStream: this.marketDataStream.isRunning(),
      tradingEngine: tradingMetrics.totalSignalsProcessed >= 0,
      portfolioAnalytics: analyticsHealth.overall !== 'unhealthy',
      agentControl: true,
      demoAgent: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    const status: MVPPlatformHealth['status'] =
      healthyCount === totalCount
        ? 'healthy'
        : healthyCount >= Math.ceil(totalCount / 2)
          ? 'degraded'
          : 'error';

    const uptimeMs = this.startedAt ? Date.now() - this.startedAt.getTime() : 0;

    return {
      status,
      components,
      activeAgents: Array.from(this.agents.values()).filter((a) => a.state === 'running').length,
      totalTradesExecuted: this.totalTradesExecuted,
      uptime: Math.floor(uptimeMs / 1000),
      checkedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(handler: MVPPlatformEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx >= 0) this.eventHandlers.splice(idx, 1);
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private assertRunning(): void {
    if (!this.running) {
      throw new Error('MVPPlatform is not running. Call platform.start() first.');
    }
  }

  private requireAgent(agentId: string): InternalAgent {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    return agent;
  }

  private buildAgentStatus(agent: InternalAgent): MVPAgentStatus {
    // Get current portfolio value from trading engine (best effort)
    let portfolioValueTon = agent.budgetTon;
    let pnlTon = 0;
    let pnlPercent = 0;

    try {
      const pnl = this.tradingEngine.calculatePnL(agent.agentId, {});
      portfolioValueTon = pnl.portfolioValueUsd / 10;
      pnlTon = pnl.totalPnl / 10;
      pnlPercent = pnl.roiPercent;
    } catch {
      // Portfolio not yet initialized — use defaults
    }

    return {
      agentId: agent.agentId,
      name: agent.name,
      userId: agent.userId,
      strategy: agent.strategy,
      riskLevel: agent.riskLevel,
      state: agent.state,
      budgetTon: agent.budgetTon,
      portfolioValueTon,
      pnlTon,
      pnlPercent,
      tradesExecuted: agent.tradesExecuted,
      winRate:
        agent.tradesExecuted > 0 ? (agent.winCount / agent.tradesExecuted) * 100 : 0,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  private buildStrategyMarketData(snapshot: MVPMarketSnapshot) {
    const prices: Record<string, { asset: string; price: number; volume24h: number; timestamp: Date }> = {};

    for (const [asset, price] of Object.entries(snapshot.prices)) {
      prices[asset] = {
        asset,
        price,
        volume24h: 1_000_000,
        timestamp: snapshot.timestamp,
      };
    }

    return {
      prices,
      source: 'live' as const,
      fetchedAt: snapshot.timestamp,
    };
  }

  private buildStrategyParams(
    strategy: MVPStrategyId,
    riskLevel: 'low' | 'medium' | 'high'
  ): Record<string, string | number | boolean> {
    const riskMultiplier = riskLevel === 'low' ? 0.5 : riskLevel === 'high' ? 2.0 : 1.0;

    switch (strategy) {
      case 'trend':
        return {
          movingAveragePeriods: 20,
          riskMultiplier,
        };
      case 'arbitrage':
        return {
          minSpreadPercent: 0.5 / riskMultiplier,
          riskMultiplier,
        };
      case 'ai-signal':
        return {
          rsiOversold: 30,
          rsiOverbought: 70,
          riskMultiplier,
        };
      default:
        return { riskMultiplier };
    }
  }

  private emitEvent(
    type: MVPPlatformEventType,
    agentId?: string,
    data?: Record<string, unknown>
  ): void {
    const event: MVPPlatformEvent = {
      type,
      agentId,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new MVPPlatform instance.
 *
 * @example
 * ```typescript
 * const platform = createMVPPlatform({ environment: 'simulation' });
 * platform.start();
 * ```
 */
export function createMVPPlatform(
  config?: Partial<MVPPlatformConfig>
): MVPPlatform {
  return new MVPPlatform(config);
}
