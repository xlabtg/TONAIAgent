/**
 * TONAIAgent - Trading Engine (Simulation Layer)
 *
 * The Trading Engine is the execution layer that sits between the Strategy Engine
 * and the Portfolio Manager. It receives TradeSignal objects from the Strategy Engine,
 * simulates their execution at the current market price, updates the agent's portfolio,
 * records the trade in history, and provides PnL calculation.
 *
 * Signal Processing Pipeline:
 *   TradeSignal → Validate → Lookup Price → Check Balance →
 *   Execute Trade → Update Portfolio → Record History → Return Result
 */

import type {
  TradeSignal,
  TradeRecord,
  TradeExecutionResult,
  PnLSummary,
  TradingEngineConfig,
  TradingEngineMetrics,
  TradingEngineEventType,
  TradingEngineEvent,
  TradingEngineEventHandler,
  TradingEngineUnsubscribe,
  PortfolioBalance,
} from './types';
import { TradingEngineError } from './types';
import { DefaultPortfolioManager, createPortfolioManager } from './portfolio-manager';
import { DefaultTradeHistoryRepository, createTradeHistoryRepository } from './trade-history-repository';
import { SimulationTradeExecutor } from './trade-executor';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_TRADING_ENGINE_CONFIG: TradingEngineConfig = {
  enabled: true,
  quoteCurrency: 'USD',
  feeRate: 0,            // no fees in simulation MVP
  minTradeValueUsd: 1,   // minimum $1 trade
  maxHistoryPerAgent: 1000,
  verbose: false,
};

/**
 * Baseline prices used when no market data is available.
 * These match the MVP asset list defined in Market Data Layer.
 */
export const BASELINE_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3500,
  TON: 5.25,
  SOL: 175,
  USDT: 1.0,
};

// ============================================================================
// Trading Engine
// ============================================================================

/**
 * TradingEngine — the core simulation execution engine.
 *
 * Orchestrates signal processing, trade execution, portfolio management,
 * trade history, and PnL calculation for all agents.
 *
 * @example
 * ```typescript
 * const engine = createTradingEngine();
 * engine.start();
 *
 * // Initialize an agent with a starting portfolio
 * engine.initPortfolio('agent-001', { USD: 10000, BTC: 0, ETH: 0 });
 *
 * // Process a BUY signal from the Strategy Engine
 * const result = await engine.processSignal(
 *   {
 *     action: 'BUY',
 *     asset: 'BTC',
 *     amount: '0.01',
 *     confidence: 0.8,
 *     reason: 'Trend strategy: upward momentum detected',
 *     strategyId: 'trend',
 *     generatedAt: new Date(),
 *   },
 *   'agent-001',
 *   { BTC: 65000 }   // current prices
 * );
 *
 * console.log(result.status); // 'executed'
 * console.log(result.trade);  // { action: 'BUY', asset: 'BTC', amount: 0.01, price: 65000, ... }
 *
 * // Get PnL
 * const pnl = engine.calculatePnL('agent-001', { BTC: 66000 });
 * console.log(pnl.totalPnl); // unrealized gain from BTC price increase
 * ```
 */
export class TradingEngine {
  private readonly config: TradingEngineConfig;
  private readonly metrics: TradingEngineMetrics;
  private readonly eventHandlers = new Set<TradingEngineEventHandler>();
  private readonly portfolioManager: DefaultPortfolioManager;
  private readonly historyRepository: DefaultTradeHistoryRepository;
  private readonly tradeExecutor: SimulationTradeExecutor;
  /** Initial portfolio value per agent (USD) for ROI calculation */
  private readonly initialValues = new Map<string, number>();
  private running = false;

  constructor(config: Partial<TradingEngineConfig> = {}) {
    this.config = { ...DEFAULT_TRADING_ENGINE_CONFIG, ...config };
    this.metrics = this.initMetrics();
    this.portfolioManager = createPortfolioManager();
    this.historyRepository = createTradeHistoryRepository(this.config.maxHistoryPerAgent);
    this.tradeExecutor = new SimulationTradeExecutor(
      this.portfolioManager,
      this.historyRepository,
      this.config
    );
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the trading engine */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.emitEvent('engine.started', undefined, undefined, {});
  }

  /** Stop the trading engine */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.emitEvent('engine.stopped', undefined, undefined, {});
  }

  /** Whether the engine is running */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Portfolio Initialization
  // ============================================================================

  /**
   * Initialize a portfolio for an agent.
   * Must be called before processing signals for a new agent.
   * Subsequent calls for the same agent are no-ops.
   *
   * @param agentId - Unique agent identifier
   * @param initialBalances - Starting asset balances (default: 10000 USD + zero crypto)
   */
  initPortfolio(agentId: string, initialBalances?: PortfolioBalance): void {
    this.portfolioManager.initPortfolio(agentId, initialBalances);

    // Record initial USD value for ROI calculation
    if (!this.initialValues.has(agentId)) {
      const balances = this.portfolioManager.getPortfolio(agentId).balances;
      const usdValue = balances[this.config.quoteCurrency] ?? 0;
      this.initialValues.set(agentId, usdValue);
    }

    this.metrics.activePortfolios = this.portfolioManager.listAgentIds().length;
  }

  // ============================================================================
  // Signal Processing
  // ============================================================================

  /**
   * Process a trade signal from the Strategy Engine.
   *
   * @param signal - The trade signal to execute
   * @param agentId - The agent executing the signal
   * @param prices - Current asset prices (asset → USD price)
   *   If not provided, baseline prices are used as a fallback.
   */
  async processSignal(
    signal: TradeSignal,
    agentId: string,
    prices: Record<string, number> = {}
  ): Promise<TradeExecutionResult> {
    if (!this.config.enabled) {
      throw new TradingEngineError('Trading Engine is disabled', 'ENGINE_DISABLED');
    }

    // Merge caller-provided prices with baseline fallback
    const effectivePrices = { ...BASELINE_PRICES, ...prices };

    this.metrics.totalSignalsProcessed++;

    const result = await this.tradeExecutor.execute(signal, agentId, effectivePrices);

    // Update metrics based on result
    if (result.status === 'executed' && result.trade) {
      this.metrics.totalTradesExecuted++;
      if (result.trade.action === 'BUY') this.metrics.totalBuyTrades++;
      else this.metrics.totalSellTrades++;
      this.metrics.totalVolumeUsd += result.trade.value;

      this.emitEvent('trade.executed', agentId, result.trade.asset, {
        tradeId: result.trade.tradeId,
        action: result.trade.action,
        asset: result.trade.asset,
        amount: result.trade.amount,
        price: result.trade.price,
        value: result.trade.value,
      });
    } else if (result.status === 'rejected' || result.status === 'error') {
      this.metrics.totalRejected++;
      this.emitEvent('trade.rejected', agentId, signal.asset, {
        reason: result.message,
        action: signal.action,
        asset: signal.asset,
      });
    } else if (result.status === 'skipped') {
      this.metrics.totalSkipped++;
      this.emitEvent('trade.skipped', agentId, signal.asset, {
        reason: result.message,
      });
    }

    this.metrics.updatedAt = new Date();
    return result;
  }

  // ============================================================================
  // Portfolio Queries
  // ============================================================================

  /**
   * Get the current portfolio for an agent.
   *
   * @param agentId - Unique agent identifier
   */
  getPortfolio(agentId: string) {
    return this.portfolioManager.getPortfolio(agentId);
  }

  // ============================================================================
  // Trade History
  // ============================================================================

  /**
   * Get trade history for a specific agent (newest first).
   *
   * @param agentId - Unique agent identifier
   * @param limit - Maximum records to return (default: all)
   */
  getTradeHistory(agentId: string, limit?: number): TradeRecord[] {
    return this.historyRepository.getByAgent(agentId, limit);
  }

  /**
   * Get all trades across all agents (oldest first).
   *
   * @param limit - Maximum records to return
   */
  getAllTrades(limit?: number): TradeRecord[] {
    return this.historyRepository.getAll(limit);
  }

  // ============================================================================
  // PnL Calculation
  // ============================================================================

  /**
   * Calculate PnL for an agent based on current prices.
   *
   * - Realized PnL: sum of USD received from SELL trades minus USD spent on BUY trades
   * - Unrealized PnL: current market value of held assets minus their cost basis
   * - Total PnL: realized + unrealized
   * - ROI: total PnL / initial portfolio value × 100
   *
   * @param agentId - Unique agent identifier
   * @param currentPrices - Current asset prices (asset → USD price)
   *   If not provided, baseline prices are used.
   */
  calculatePnL(
    agentId: string,
    currentPrices: Record<string, number> = {}
  ): PnLSummary {
    const effectivePrices = { ...BASELINE_PRICES, ...currentPrices };
    const portfolio = this.portfolioManager.getPortfolio(agentId);
    const trades = this.historyRepository.getByAgent(agentId);

    // Calculate realized PnL from trade history
    let realizedPnl = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    // Track cost basis per asset (weighted average)
    const costBasis: Record<string, number> = {};   // asset → total cost paid (USD)
    const holdings: Record<string, number> = {};    // asset → total units held

    for (const trade of [...trades].reverse()) {
      // Process oldest first
      const { action, asset, amount, value } = trade;

      if (action === 'BUY') {
        costBasis[asset] = (costBasis[asset] ?? 0) + value;
        holdings[asset] = (holdings[asset] ?? 0) + amount;
      } else {
        // SELL — compute realized PnL for the sold portion
        const avgCost = holdings[asset] > 0
          ? (costBasis[asset] ?? 0) / holdings[asset]
          : 0;
        const costForSold = avgCost * amount;
        const pnlForTrade = value - costForSold;
        realizedPnl += pnlForTrade;

        if (pnlForTrade > 0) winningTrades++;
        else if (pnlForTrade < 0) losingTrades++;

        // Update cost basis
        costBasis[asset] = Math.max(0, (costBasis[asset] ?? 0) - costForSold);
        holdings[asset] = Math.max(0, (holdings[asset] ?? 0) - amount);
      }
    }

    // Calculate current portfolio value and unrealized PnL
    let portfolioValueUsd = 0;
    let unrealizedPnl = 0;

    for (const [asset, quantity] of Object.entries(portfolio.balances)) {
      if (quantity <= 0) continue;

      if (asset === this.config.quoteCurrency) {
        // USD is already priced at 1
        portfolioValueUsd += quantity;
      } else {
        const price = effectivePrices[asset];
        if (price !== undefined) {
          const marketValue = quantity * price;
          const cost = costBasis[asset] ?? 0;
          portfolioValueUsd += marketValue;
          unrealizedPnl += marketValue - cost;
        }
      }
    }

    const totalPnl = realizedPnl + unrealizedPnl;
    const initialValueUsd = this.initialValues.get(agentId) ?? 0;
    const roiPercent = initialValueUsd > 0
      ? (totalPnl / initialValueUsd) * 100
      : 0;

    const totalTrades = trades.length;
    const winRatePercent = totalTrades > 0
      ? (winningTrades / totalTrades) * 100
      : 0;

    return {
      agentId,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      totalPnl: Math.round(totalPnl * 100) / 100,
      portfolioValueUsd: Math.round(portfolioValueUsd * 100) / 100,
      initialValueUsd: Math.round(initialValueUsd * 100) / 100,
      roiPercent: Math.round(roiPercent * 100) / 100,
      totalTrades,
      winningTrades,
      losingTrades,
      winRatePercent: Math.round(winRatePercent * 100) / 100,
      calculatedAt: new Date(),
    };
  }

  // ============================================================================
  // Metrics & Events
  // ============================================================================

  /** Get current engine metrics */
  getMetrics(): TradingEngineMetrics {
    return {
      ...this.metrics,
      activePortfolios: this.portfolioManager.listAgentIds().length,
      updatedAt: new Date(),
    };
  }

  /** Subscribe to engine events */
  subscribe(handler: TradingEngineEventHandler): TradingEngineUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private emitEvent(
    type: TradingEngineEventType,
    agentId: string | undefined,
    asset: string | undefined,
    data: Record<string, unknown>
  ): void {
    const event: TradingEngineEvent = {
      id: this.generateId('evt'),
      type,
      timestamp: new Date(),
      agentId,
      asset,
      data,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private initMetrics(): TradingEngineMetrics {
    return {
      totalSignalsProcessed: 0,
      totalTradesExecuted: 0,
      totalBuyTrades: 0,
      totalSellTrades: 0,
      totalRejected: 0,
      totalSkipped: 0,
      totalVolumeUsd: 0,
      activePortfolios: 0,
      updatedAt: new Date(),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Trading Engine instance.
 *
 * @example
 * ```typescript
 * const engine = createTradingEngine();
 * engine.start();
 * ```
 *
 * @example With custom config:
 * ```typescript
 * const engine = createTradingEngine({ feeRate: 0.001, minTradeValueUsd: 10 });
 * ```
 */
export function createTradingEngine(config?: Partial<TradingEngineConfig>): TradingEngine {
  return new TradingEngine(config);
}
