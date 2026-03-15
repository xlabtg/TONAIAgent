/**
 * TONAIAgent - Portfolio Storage
 *
 * In-memory storage layer for portfolio data including:
 * - Portfolios
 * - Positions
 * - Trades
 * - Balances
 *
 * Provides fast lookups and CRUD operations with optional demo data seeding.
 *
 * Implements Issue #214: Portfolio Storage & Trade History
 */

import type {
  Portfolio,
  Position,
  Trade,
  BalanceRecord,
  TradeFilter,
  PortfolioEngineConfig,
} from './types';

import {
  PortfolioError,
  DEFAULT_PORTFOLIO_ENGINE_CONFIG,
} from './types';

// ============================================================================
// Portfolio Storage
// ============================================================================

/**
 * In-memory storage for portfolio data.
 * Acts as the data layer for the Portfolio Engine.
 */
export class PortfolioStorage {
  private readonly portfolios = new Map<string, Portfolio>();
  private readonly positions = new Map<string, Position>();
  private readonly trades = new Map<string, Trade>();
  private readonly balances = new Map<string, BalanceRecord>();

  private readonly config: PortfolioEngineConfig;

  constructor(config: Partial<PortfolioEngineConfig> = {}) {
    this.config = { ...DEFAULT_PORTFOLIO_ENGINE_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Portfolio Operations
  // --------------------------------------------------------------------------

  /** Create a new portfolio for an agent */
  createPortfolio(agentId: string): Portfolio {
    const portfolioId = this.generateId('portfolio');

    if (this.getPortfolioByAgent(agentId)) {
      throw new PortfolioError(
        `Portfolio already exists for agent '${agentId}'`,
        'OPERATION_FAILED',
        { agentId }
      );
    }

    const now = new Date();
    const portfolio: Portfolio = {
      portfolioId,
      agentId,
      baseCurrency: this.config.baseCurrency,
      totalValue: this.config.initialBalance,
      createdAt: now,
      updatedAt: now,
    };

    this.portfolios.set(portfolioId, portfolio);

    // Initialize base currency balance
    this.saveBalance({
      agentId,
      asset: this.config.baseCurrency,
      balance: this.config.initialBalance,
      available: this.config.initialBalance,
      reserved: 0,
      updatedAt: now,
    });

    return { ...portfolio };
  }

  /** Get portfolio by ID */
  getPortfolio(portfolioId: string): Portfolio | null {
    const portfolio = this.portfolios.get(portfolioId);
    return portfolio ? { ...portfolio } : null;
  }

  /** Get portfolio by agent ID */
  getPortfolioByAgent(agentId: string): Portfolio | null {
    for (const portfolio of this.portfolios.values()) {
      if (portfolio.agentId === agentId) {
        return { ...portfolio };
      }
    }
    return null;
  }

  /** Get portfolio by agent ID (throws if not found) */
  requirePortfolioByAgent(agentId: string): Portfolio {
    const portfolio = this.getPortfolioByAgent(agentId);
    if (!portfolio) {
      throw new PortfolioError(
        `Portfolio not found for agent '${agentId}'`,
        'PORTFOLIO_NOT_FOUND',
        { agentId }
      );
    }
    return portfolio;
  }

  /** Update portfolio */
  updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Portfolio {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) {
      throw new PortfolioError(
        `Portfolio '${portfolioId}' not found`,
        'PORTFOLIO_NOT_FOUND',
        { portfolioId }
      );
    }

    const updated: Portfolio = {
      ...portfolio,
      ...updates,
      portfolioId, // ID cannot change
      agentId: portfolio.agentId, // Agent cannot change
      updatedAt: new Date(),
    };

    this.portfolios.set(portfolioId, updated);
    return { ...updated };
  }

  /** List all portfolios */
  listPortfolios(): Portfolio[] {
    return Array.from(this.portfolios.values()).map(p => ({ ...p }));
  }

  // --------------------------------------------------------------------------
  // Position Operations
  // --------------------------------------------------------------------------

  /** Save a position (create or update) */
  savePosition(position: Position): Position {
    const saved = { ...position, updatedAt: new Date() };
    this.positions.set(position.positionId, saved);
    return { ...saved };
  }

  /** Get position by ID */
  getPosition(positionId: string): Position | null {
    const position = this.positions.get(positionId);
    return position ? { ...position } : null;
  }

  /** Get position by agent and asset */
  getPositionByAgentAndAsset(agentId: string, asset: string): Position | null {
    for (const position of this.positions.values()) {
      if (position.agentId === agentId && position.asset === asset && position.status === 'open') {
        return { ...position };
      }
    }
    return null;
  }

  /** Get all positions for an agent */
  getPositionsByAgent(agentId: string, includeClosedPositions = false): Position[] {
    const positions: Position[] = [];
    for (const position of this.positions.values()) {
      if (position.agentId === agentId) {
        if (includeClosedPositions || position.status === 'open') {
          positions.push({ ...position });
        }
      }
    }
    return positions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /** Close a position */
  closePosition(positionId: string): Position {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new PortfolioError(
        `Position '${positionId}' not found`,
        'POSITION_NOT_FOUND',
        { positionId }
      );
    }

    const now = new Date();
    const closed: Position = {
      ...position,
      status: 'closed',
      size: 0,
      closedAt: now,
      updatedAt: now,
    };

    this.positions.set(positionId, closed);
    return { ...closed };
  }

  // --------------------------------------------------------------------------
  // Trade Operations
  // --------------------------------------------------------------------------

  /** Save a trade */
  saveTrade(trade: Trade): Trade {
    // Enforce max trade history limit per agent
    const agentTrades = this.getTradesByAgent(trade.agentId);
    if (agentTrades.length >= this.config.maxTradeHistoryPerAgent) {
      // Remove oldest trade
      const oldest = agentTrades[agentTrades.length - 1];
      this.trades.delete(oldest.tradeId);
    }

    const saved = { ...trade };
    this.trades.set(trade.tradeId, saved);
    return { ...saved };
  }

  /** Get trade by ID */
  getTrade(tradeId: string): Trade | null {
    const trade = this.trades.get(tradeId);
    return trade ? { ...trade } : null;
  }

  /** Get trades by agent (sorted by timestamp descending) */
  getTradesByAgent(agentId: string, limit?: number): Trade[] {
    const trades: Trade[] = [];
    for (const trade of this.trades.values()) {
      if (trade.agentId === agentId) {
        trades.push({ ...trade });
      }
    }

    trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit !== undefined && limit > 0) {
      return trades.slice(0, limit);
    }
    return trades;
  }

  /** Get trades with filter */
  getTrades(filter: TradeFilter): Trade[] {
    let trades: Trade[] = [];

    for (const trade of this.trades.values()) {
      let matches = true;

      if (filter.agentId && trade.agentId !== filter.agentId) {
        matches = false;
      }
      if (filter.pair && trade.pair !== filter.pair) {
        matches = false;
      }
      if (filter.side && trade.side !== filter.side) {
        matches = false;
      }
      if (filter.startDate && trade.timestamp < filter.startDate) {
        matches = false;
      }
      if (filter.endDate && trade.timestamp > filter.endDate) {
        matches = false;
      }

      if (matches) {
        trades.push({ ...trade });
      }
    }

    // Sort by timestamp descending (newest first)
    trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply offset and limit
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? trades.length;

    return trades.slice(offset, offset + limit);
  }

  /** Count trades for an agent */
  countTradesByAgent(agentId: string): number {
    let count = 0;
    for (const trade of this.trades.values()) {
      if (trade.agentId === agentId) {
        count++;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // Balance Operations
  // --------------------------------------------------------------------------

  /** Save a balance record */
  saveBalance(balance: BalanceRecord): BalanceRecord {
    const key = this.getBalanceKey(balance.agentId, balance.asset);
    const saved = { ...balance, updatedAt: new Date() };
    this.balances.set(key, saved);
    return { ...saved };
  }

  /** Get balance for an agent and asset */
  getBalance(agentId: string, asset: string): BalanceRecord | null {
    const key = this.getBalanceKey(agentId, asset);
    const balance = this.balances.get(key);
    return balance ? { ...balance } : null;
  }

  /** Get all balances for an agent */
  getBalancesByAgent(agentId: string): BalanceRecord[] {
    const balances: BalanceRecord[] = [];
    for (const balance of this.balances.values()) {
      if (balance.agentId === agentId) {
        balances.push({ ...balance });
      }
    }
    return balances;
  }

  /** Update balance by delta */
  updateBalance(agentId: string, asset: string, delta: number): BalanceRecord {
    let balance = this.getBalance(agentId, asset);

    if (!balance) {
      // Create new balance record
      balance = {
        agentId,
        asset,
        balance: 0,
        available: 0,
        reserved: 0,
        updatedAt: new Date(),
      };
    }

    const newBalance = Math.round((balance.balance + delta) * 1e8) / 1e8;
    const newAvailable = Math.round((balance.available + delta) * 1e8) / 1e8;

    if (newAvailable < 0) {
      throw new PortfolioError(
        `Insufficient balance for ${asset}. Available: ${balance.available}, Required: ${Math.abs(delta)}`,
        'INSUFFICIENT_BALANCE',
        { agentId, asset, available: balance.available, required: Math.abs(delta) }
      );
    }

    const updated: BalanceRecord = {
      ...balance,
      balance: newBalance,
      available: newAvailable,
      updatedAt: new Date(),
    };

    return this.saveBalance(updated);
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /** Generate a unique ID */
  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /** Get balance key */
  private getBalanceKey(agentId: string, asset: string): string {
    return `${agentId}:${asset}`;
  }

  /** Clear all data (for testing) */
  clear(): void {
    this.portfolios.clear();
    this.positions.clear();
    this.trades.clear();
    this.balances.clear();
  }

  /** Get storage statistics */
  getStats(): { portfolios: number; positions: number; trades: number; balances: number } {
    return {
      portfolios: this.portfolios.size,
      positions: this.positions.size,
      trades: this.trades.size,
      balances: this.balances.size,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new PortfolioStorage instance */
export function createPortfolioStorage(
  config?: Partial<PortfolioEngineConfig>
): PortfolioStorage {
  return new PortfolioStorage(config);
}

/** Create a PortfolioStorage with demo data */
export function createDemoPortfolioStorage(): PortfolioStorage {
  const storage = new PortfolioStorage();

  const now = new Date();
  const minus1h = new Date(now.getTime() - 3_600_000);
  const minus3h = new Date(now.getTime() - 10_800_000);
  const minus1d = new Date(now.getTime() - 86_400_000);

  // Create demo portfolio for agent_001
  const portfolio: Portfolio = {
    portfolioId: 'portfolio_001',
    agentId: 'agent_001',
    baseCurrency: 'USDT',
    totalValue: 10420,
    createdAt: minus1d,
    updatedAt: minus1h,
  };
  storage['portfolios'].set(portfolio.portfolioId, portfolio);

  // Create demo balances
  const balances: BalanceRecord[] = [
    {
      agentId: 'agent_001',
      asset: 'USDT',
      balance: 9458,
      available: 9458,
      reserved: 0,
      updatedAt: minus1h,
    },
    {
      agentId: 'agent_001',
      asset: 'TON',
      balance: 200,
      available: 200,
      reserved: 0,
      updatedAt: minus1h,
    },
  ];
  for (const balance of balances) {
    storage['balances'].set(`${balance.agentId}:${balance.asset}`, balance);
  }

  // Create demo position
  const position: Position = {
    positionId: 'pos_001',
    agentId: 'agent_001',
    asset: 'TON',
    size: 200,
    avgEntryPrice: 5.21,
    currentPrice: 5.34,
    unrealizedPnl: 26,
    costBasis: 1042,
    status: 'open',
    openedAt: minus3h,
    updatedAt: minus1h,
    closedAt: null,
  };
  storage['positions'].set(position.positionId, position);

  // Create demo trades
  const trades: Trade[] = [
    {
      tradeId: 'trade_001',
      agentId: 'agent_001',
      pair: 'TON/USDT',
      side: 'BUY',
      price: 5.21,
      quantity: 100,
      value: 521,
      fee: 0.521,
      realizedPnl: 0,
      strategyId: 'trend_strategy',
      timestamp: minus3h,
    },
    {
      tradeId: 'trade_002',
      agentId: 'agent_001',
      pair: 'TON/USDT',
      side: 'BUY',
      price: 5.21,
      quantity: 100,
      value: 521,
      fee: 0.521,
      realizedPnl: 0,
      strategyId: 'trend_strategy',
      timestamp: minus1h,
    },
  ];
  for (const trade of trades) {
    storage['trades'].set(trade.tradeId, trade);
  }

  return storage;
}
