/**
 * TONAIAgent - Portfolio Engine
 *
 * Core engine for portfolio management including:
 * - Portfolio lifecycle (create, update, query)
 * - Trade execution and recording
 * - Position tracking and averaging
 * - Balance management
 * - Metrics calculation
 *
 * Implements Issue #214: Portfolio Storage & Trade History
 */

import type {
  Portfolio,
  Position,
  Trade,
  BalanceRecord,
  PortfolioSummary,
  PortfolioMetrics,
  TradeSide,
  TradeFilter,
  PortfolioEngineConfig,
  PortfolioEvent,
  PortfolioEventHandler,
  PortfolioUnsubscribe,
} from './types';

import {
  PortfolioError,
  DEFAULT_PORTFOLIO_ENGINE_CONFIG,
} from './types';

import {
  PortfolioStorage,
  createPortfolioStorage,
  createDemoPortfolioStorage,
} from './storage';

// ============================================================================
// Trade Execution Request
// ============================================================================

/** Request to execute a trade */
export interface ExecuteTradeRequest {
  /** Agent ID */
  agentId: string;
  /** Trading pair (e.g., TON/USDT) */
  pair: string;
  /** Trade side */
  side: TradeSide;
  /** Trade quantity */
  quantity: number;
  /** Execution price */
  price: number;
  /** Strategy ID (optional) */
  strategyId?: string;
}

/** Result of trade execution */
export interface ExecuteTradeResult {
  /** Whether the trade was successful */
  success: boolean;
  /** The executed trade (if successful) */
  trade?: Trade;
  /** Updated position (if applicable) */
  position?: Position;
  /** Error message (if failed) */
  error?: string;
}

// ============================================================================
// Portfolio Engine
// ============================================================================

/**
 * Portfolio Engine manages all portfolio operations.
 *
 * @example
 * ```typescript
 * const engine = createPortfolioEngine();
 *
 * // Create portfolio for an agent
 * const portfolio = engine.getOrCreatePortfolio('agent_001');
 *
 * // Execute a trade
 * const result = engine.executeTrade({
 *   agentId: 'agent_001',
 *   pair: 'TON/USDT',
 *   side: 'BUY',
 *   quantity: 100,
 *   price: 5.21,
 * });
 *
 * // Get portfolio summary
 * const summary = engine.getPortfolioSummary('agent_001');
 * ```
 */
export class PortfolioEngine {
  private readonly storage: PortfolioStorage;
  private readonly config: PortfolioEngineConfig;
  private readonly subscribers = new Set<PortfolioEventHandler>();

  constructor(storage?: PortfolioStorage, config?: Partial<PortfolioEngineConfig>) {
    this.config = { ...DEFAULT_PORTFOLIO_ENGINE_CONFIG, ...config };
    this.storage = storage ?? createPortfolioStorage(this.config);
  }

  // --------------------------------------------------------------------------
  // Portfolio Operations
  // --------------------------------------------------------------------------

  /**
   * Get or create a portfolio for an agent.
   * If the agent doesn't have a portfolio, one is created with default settings.
   */
  getOrCreatePortfolio(agentId: string): Portfolio {
    this.validateAgentId(agentId);

    let portfolio = this.storage.getPortfolioByAgent(agentId);
    if (!portfolio) {
      portfolio = this.storage.createPortfolio(agentId);
      this.emit({
        id: this.generateId('evt'),
        type: 'portfolio.created',
        agentId,
        timestamp: new Date(),
        data: { portfolioId: portfolio.portfolioId },
      });
    }
    return portfolio;
  }

  /**
   * Get portfolio by agent ID.
   * Throws PORTFOLIO_NOT_FOUND if not found.
   */
  getPortfolio(agentId: string): Portfolio {
    this.validateAgentId(agentId);
    return this.storage.requirePortfolioByAgent(agentId);
  }

  /**
   * Get portfolio summary including positions, balances, and metrics.
   */
  getPortfolioSummary(agentId: string): PortfolioSummary {
    const portfolio = this.getPortfolio(agentId);
    const positions = this.storage.getPositionsByAgent(agentId);
    const balances = this.storage.getBalancesByAgent(agentId);
    const metrics = this.calculateMetrics(agentId);

    return {
      portfolio,
      positions,
      balances,
      metrics,
    };
  }

  /**
   * Update portfolio total value based on current positions and balances.
   */
  updatePortfolioValue(agentId: string, prices: Record<string, number>): Portfolio {
    const portfolio = this.storage.requirePortfolioByAgent(agentId);
    const positions = this.storage.getPositionsByAgent(agentId);
    const balances = this.storage.getBalancesByAgent(agentId);

    let totalValue = 0;

    // Sum all balances
    for (const balance of balances) {
      if (balance.asset === this.config.baseCurrency) {
        totalValue += balance.balance;
      } else {
        const price = prices[balance.asset] ?? 0;
        totalValue += balance.balance * price;
      }
    }

    // Update positions with new prices and calculate unrealized PnL
    for (const position of positions) {
      if (position.status === 'open' && prices[position.asset] !== undefined) {
        const currentPrice = prices[position.asset];
        const unrealizedPnl = (currentPrice - position.avgEntryPrice) * position.size;

        this.storage.savePosition({
          ...position,
          currentPrice,
          unrealizedPnl,
        });
      }
    }

    const updated = this.storage.updatePortfolio(portfolio.portfolioId, { totalValue });

    this.emit({
      id: this.generateId('evt'),
      type: 'portfolio.updated',
      agentId,
      timestamp: new Date(),
      data: { totalValue, previousValue: portfolio.totalValue },
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // Trade Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a trade for an agent.
   *
   * @param request - Trade execution request
   * @returns Trade execution result
   */
  executeTrade(request: ExecuteTradeRequest): ExecuteTradeResult {
    try {
      this.validateTradeRequest(request);

      const { agentId, pair, side, quantity, price, strategyId } = request;

      // Ensure portfolio exists
      this.getOrCreatePortfolio(agentId);

      // Parse pair (e.g., "TON/USDT" -> base: "TON", quote: "USDT")
      const [baseAsset, quoteAsset] = pair.split('/');
      if (!baseAsset || !quoteAsset) {
        throw new PortfolioError(
          `Invalid trading pair format: ${pair}. Expected format: BASE/QUOTE`,
          'OPERATION_FAILED',
          { pair }
        );
      }

      // Calculate trade value and fee
      const value = quantity * price;
      const fee = value * this.config.feeRate;
      const totalCost = value + fee;

      // Execute trade based on side
      let realizedPnl = 0;
      let position: Position | undefined;

      if (side === 'BUY') {
        // Check quote asset balance
        const quoteBalance = this.storage.getBalance(agentId, quoteAsset);
        if (!quoteBalance || quoteBalance.available < totalCost) {
          throw new PortfolioError(
            `Insufficient ${quoteAsset} balance. Required: ${totalCost}, Available: ${quoteBalance?.available ?? 0}`,
            'INSUFFICIENT_BALANCE',
            { asset: quoteAsset, required: totalCost, available: quoteBalance?.available ?? 0 }
          );
        }

        // Deduct quote asset
        this.storage.updateBalance(agentId, quoteAsset, -totalCost);

        // Credit base asset
        this.storage.updateBalance(agentId, baseAsset, quantity);

        // Update or create position
        position = this.updatePositionOnBuy(agentId, baseAsset, quantity, price);
      } else {
        // SELL
        // Check base asset balance
        const baseBalance = this.storage.getBalance(agentId, baseAsset);
        if (!baseBalance || baseBalance.available < quantity) {
          throw new PortfolioError(
            `Insufficient ${baseAsset} balance. Required: ${quantity}, Available: ${baseBalance?.available ?? 0}`,
            'INSUFFICIENT_BALANCE',
            { asset: baseAsset, required: quantity, available: baseBalance?.available ?? 0 }
          );
        }

        // Deduct base asset
        this.storage.updateBalance(agentId, baseAsset, -quantity);

        // Credit quote asset (minus fee)
        this.storage.updateBalance(agentId, quoteAsset, value - fee);

        // Update position and calculate realized PnL
        const result = this.updatePositionOnSell(agentId, baseAsset, quantity, price);
        position = result.position;
        realizedPnl = result.realizedPnl;
      }

      // Create trade record
      const trade: Trade = {
        tradeId: this.storage.generateId('trade'),
        agentId,
        pair,
        side,
        price,
        quantity,
        value,
        fee,
        realizedPnl,
        strategyId: strategyId ?? null,
        timestamp: new Date(),
      };

      this.storage.saveTrade(trade);

      this.emit({
        id: this.generateId('evt'),
        type: 'trade.executed',
        agentId,
        timestamp: new Date(),
        data: { trade, position },
      });

      return { success: true, trade, position };
    } catch (err) {
      if (err instanceof PortfolioError) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Trade execution failed' };
    }
  }

  // --------------------------------------------------------------------------
  // Position Management
  // --------------------------------------------------------------------------

  /**
   * Get all open positions for an agent.
   */
  getPositions(agentId: string): Position[] {
    this.validateAgentId(agentId);
    return this.storage.getPositionsByAgent(agentId);
  }

  /**
   * Get a specific position by ID.
   */
  getPosition(positionId: string): Position | null {
    return this.storage.getPosition(positionId);
  }

  /**
   * Update position on buy (position averaging).
   */
  private updatePositionOnBuy(
    agentId: string,
    asset: string,
    quantity: number,
    price: number
  ): Position {
    let position = this.storage.getPositionByAgentAndAsset(agentId, asset);
    const now = new Date();

    if (position) {
      // Average into existing position
      const totalSize = position.size + quantity;
      const totalCost = position.costBasis + (quantity * price);
      const avgEntryPrice = totalCost / totalSize;

      position = this.storage.savePosition({
        ...position,
        size: totalSize,
        avgEntryPrice,
        costBasis: totalCost,
        updatedAt: now,
      });

      this.emit({
        id: this.generateId('evt'),
        type: 'position.updated',
        agentId,
        timestamp: now,
        data: { positionId: position.positionId, action: 'averaged', quantity, price },
      });
    } else {
      // Create new position
      position = this.storage.savePosition({
        positionId: this.storage.generateId('pos'),
        agentId,
        asset,
        size: quantity,
        avgEntryPrice: price,
        currentPrice: price,
        unrealizedPnl: 0,
        costBasis: quantity * price,
        status: 'open',
        openedAt: now,
        updatedAt: now,
        closedAt: null,
      });

      this.emit({
        id: this.generateId('evt'),
        type: 'position.opened',
        agentId,
        timestamp: now,
        data: { positionId: position.positionId, asset, quantity, price },
      });
    }

    return position;
  }

  /**
   * Update position on sell and calculate realized PnL.
   */
  private updatePositionOnSell(
    agentId: string,
    asset: string,
    quantity: number,
    price: number
  ): { position?: Position; realizedPnl: number } {
    const position = this.storage.getPositionByAgentAndAsset(agentId, asset);
    const now = new Date();

    if (!position) {
      // No existing position, create a short position (or just track the sale)
      // For simplicity, we'll just track realized PnL as 0 for sells without position
      return { realizedPnl: 0 };
    }

    // Calculate realized PnL
    const realizedPnl = (price - position.avgEntryPrice) * quantity;
    const newSize = position.size - quantity;

    if (newSize <= 0) {
      // Close position
      const closedPosition = this.storage.closePosition(position.positionId);

      this.emit({
        id: this.generateId('evt'),
        type: 'position.closed',
        agentId,
        timestamp: now,
        data: { positionId: position.positionId, realizedPnl },
      });

      return { position: closedPosition, realizedPnl };
    } else {
      // Partial close
      const newCostBasis = position.avgEntryPrice * newSize;
      const updatedPosition = this.storage.savePosition({
        ...position,
        size: newSize,
        costBasis: newCostBasis,
        status: 'partially_closed',
        updatedAt: now,
      });

      this.emit({
        id: this.generateId('evt'),
        type: 'position.updated',
        agentId,
        timestamp: now,
        data: { positionId: position.positionId, action: 'partial_close', quantity, realizedPnl },
      });

      return { position: updatedPosition, realizedPnl };
    }
  }

  // --------------------------------------------------------------------------
  // Trade History
  // --------------------------------------------------------------------------

  /**
   * Get trade history for an agent.
   */
  getTradeHistory(agentId: string, limit?: number): Trade[] {
    this.validateAgentId(agentId);
    return this.storage.getTradesByAgent(agentId, limit);
  }

  /**
   * Get trades with filter.
   */
  getTrades(filter: TradeFilter): Trade[] {
    return this.storage.getTrades(filter);
  }

  /**
   * Get a specific trade by ID.
   */
  getTrade(tradeId: string): Trade | null {
    return this.storage.getTrade(tradeId);
  }

  // --------------------------------------------------------------------------
  // Balance Management
  // --------------------------------------------------------------------------

  /**
   * Get all balances for an agent.
   */
  getBalances(agentId: string): BalanceRecord[] {
    this.validateAgentId(agentId);
    return this.storage.getBalancesByAgent(agentId);
  }

  /**
   * Get balance for a specific asset.
   */
  getBalance(agentId: string, asset: string): BalanceRecord | null {
    this.validateAgentId(agentId);
    return this.storage.getBalance(agentId, asset);
  }

  /**
   * Get balances as a simple map.
   */
  getBalancesMap(agentId: string): Record<string, number> {
    const balances = this.getBalances(agentId);
    const map: Record<string, number> = {};
    for (const balance of balances) {
      map[balance.asset] = balance.balance;
    }
    return map;
  }

  // --------------------------------------------------------------------------
  // Metrics Calculation
  // --------------------------------------------------------------------------

  /**
   * Calculate portfolio metrics for an agent.
   */
  calculateMetrics(agentId: string): PortfolioMetrics {
    const portfolio = this.storage.requirePortfolioByAgent(agentId);
    const positions = this.storage.getPositionsByAgent(agentId);
    const trades = this.storage.getTradesByAgent(agentId);

    // Calculate unrealized PnL from open positions
    let unrealizedPnl = 0;
    for (const position of positions) {
      if (position.status === 'open') {
        unrealizedPnl += position.unrealizedPnl;
      }
    }

    // Calculate realized PnL and trade statistics
    let realizedPnl = 0;
    let totalFees = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    for (const trade of trades) {
      totalFees += trade.fee;
      if (trade.side === 'SELL') {
        realizedPnl += trade.realizedPnl;
        if (trade.realizedPnl > 0) {
          winningTrades++;
        } else if (trade.realizedPnl < 0) {
          losingTrades++;
        }
      }
    }

    const totalPnl = realizedPnl + unrealizedPnl;
    const initialValue = this.config.initialBalance;
    const portfolioValue = portfolio.totalValue;
    const roi = initialValue > 0 ? ((portfolioValue - initialValue) / initialValue) * 100 : 0;
    const totalTrades = trades.length;
    const closedTrades = winningTrades + losingTrades;
    const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

    // Simplified max drawdown calculation (would need historical data for accurate calculation)
    const maxDrawdown = Math.min(0, totalPnl / initialValue * 100);

    const metrics: PortfolioMetrics = {
      agentId,
      portfolioValue,
      initialValue,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      roi,
      maxDrawdown: Math.abs(maxDrawdown),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalFees,
      calculatedAt: new Date(),
    };

    this.emit({
      id: this.generateId('evt'),
      type: 'metrics.calculated',
      agentId,
      timestamp: new Date(),
      data: { metrics },
    });

    return metrics;
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /** Subscribe to portfolio events */
  subscribe(handler: PortfolioEventHandler): PortfolioUnsubscribe {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  // --------------------------------------------------------------------------
  // Storage Access
  // --------------------------------------------------------------------------

  /** Get the underlying storage (for testing/integration) */
  getStorage(): PortfolioStorage {
    return this.storage;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private validateAgentId(agentId: string): void {
    if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
      throw new PortfolioError(
        'Agent ID must be a non-empty string',
        'INVALID_AGENT_ID',
        { provided: agentId }
      );
    }
  }

  private validateTradeRequest(request: ExecuteTradeRequest): void {
    this.validateAgentId(request.agentId);

    if (request.quantity <= 0) {
      throw new PortfolioError(
        'Trade quantity must be positive',
        'INVALID_AMOUNT',
        { quantity: request.quantity }
      );
    }

    if (request.price <= 0) {
      throw new PortfolioError(
        'Trade price must be positive',
        'INVALID_PRICE',
        { price: request.price }
      );
    }
  }

  private emit(event: PortfolioEvent): void {
    if (!this.config.enableEvents) return;

    for (const handler of this.subscribers) {
      try {
        handler(event);
      } catch {
        // Subscribers must not crash the engine
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new PortfolioEngine instance */
export function createPortfolioEngine(
  storage?: PortfolioStorage,
  config?: Partial<PortfolioEngineConfig>
): PortfolioEngine {
  return new PortfolioEngine(storage, config);
}

/** Create a PortfolioEngine with demo data */
export function createDemoPortfolioEngine(): PortfolioEngine {
  const storage = createDemoPortfolioStorage();
  return new PortfolioEngine(storage);
}
