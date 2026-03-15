/**
 * TONAIAgent - Demo Agent Simulation Engine
 *
 * Manages virtual balances, PnL tracking, trade history, and replay/reset
 * capabilities for simulation mode agents.
 *
 * No real funds are ever moved in simulation mode.
 */

import type {
  AgentConfig,
  AgentDecision,
  DemoStrategyType,
  MarketData,
  SimulationBalance,
  Trade,
} from './types';

// ============================================================================
// Market Data Simulator
// ============================================================================

/** Simulated market state for generating realistic price movements */
interface MarketState {
  price: number;
  trend: number;   // -1 to 1
  volatility: number;
}

const INITIAL_MARKET_STATE: MarketState = {
  price: 5.50, // TON price in USD
  trend: 0,
  volatility: 0.02,
};

/**
 * Market data simulator that generates realistic price movements
 * using a random-walk model with trend and mean-reversion.
 */
export class MarketSimulator {
  private state: MarketState;
  private readonly symbol: string;

  constructor(symbol = 'TON', initialPrice?: number) {
    this.symbol = symbol;
    this.state = {
      ...INITIAL_MARKET_STATE,
      price: initialPrice ?? INITIAL_MARKET_STATE.price,
    };
  }

  /**
   * Generate the next market data tick.
   * Uses a simplified stochastic model: drift + random shock.
   */
  nextTick(): MarketData {
    const { price, trend, volatility } = this.state;

    // Random walk: price * (1 + drift + shock)
    const drift = trend * 0.001;
    const shock = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = Math.max(0.01, price * (1 + drift + shock));

    // Update trend with mean reversion
    const newTrend = trend * 0.95 + (Math.random() - 0.5) * 0.1;

    this.state = { price: newPrice, trend: newTrend, volatility };

    const spread = newPrice * 0.001; // 0.1% spread
    return {
      symbol: this.symbol,
      price: newPrice,
      change24h: (newPrice - price) / price * 100,
      volume24h: 1_000_000 + Math.random() * 5_000_000,
      bid: newPrice - spread / 2,
      ask: newPrice + spread / 2,
      spread,
      liquidity: 0.6 + Math.random() * 0.4,
      timestamp: new Date(),
    };
  }

  /** Get current price without advancing the simulation */
  getCurrentPrice(): number {
    return this.state.price;
  }

  /** Reset to initial state */
  reset(initialPrice?: number): void {
    this.state = {
      ...INITIAL_MARKET_STATE,
      price: initialPrice ?? INITIAL_MARKET_STATE.price,
    };
  }
}

// ============================================================================
// Simulation Balance Manager
// ============================================================================

/**
 * Manages the virtual balance sheet for a simulated agent.
 * Tracks TON holdings, USD balance, PnL, and trade history.
 */
export class SimulationBalanceManager {
  private readonly balances: Map<string, SimulationBalance> = new Map();

  /**
   * Initialize simulation balance for a new agent.
   * The initial budget is held as USD (representing TON equivalent).
   */
  initBalance(agentId: string, config: AgentConfig, initialPrice: number): SimulationBalance {
    const initialUsd = config.budget * initialPrice;

    const balance: SimulationBalance = {
      agentId,
      tonBalance: config.budget,  // Start with TON budget
      usdBalance: 0,              // No free USD initially
      initialBudget: config.budget,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalPnl: 0,
      roi: 0,
      trades: [],
      updatedAt: new Date(),
    };

    // Strategies that hold USD need USD balance
    // We start with TON for DCA, USD for grid/arb
    if (config.strategy === 'grid' || config.strategy === 'arbitrage') {
      balance.tonBalance = config.budget * 0.5;
      balance.usdBalance = initialUsd * 0.5;
    }

    this.balances.set(agentId, balance);
    return { ...balance };
  }

  /**
   * Get the current balance for an agent.
   */
  getBalance(agentId: string): SimulationBalance {
    const balance = this.balances.get(agentId);
    if (!balance) {
      throw new Error(`No simulation balance found for agent ${agentId}`);
    }
    return { ...balance, trades: [...balance.trades] };
  }

  /**
   * Apply a trade decision to the simulation balance.
   * Returns the resulting trade record.
   */
  applyTrade(
    agentId: string,
    decision: AgentDecision,
    market: MarketData,
    strategyType: DemoStrategyType,
  ): Trade | null {
    const balance = this.balances.get(agentId);
    if (!balance) {
      throw new Error(`No simulation balance for agent ${agentId}`);
    }

    if (decision.action === 'hold' || !decision.amount) {
      return null;
    }

    const amount = decision.amount;
    const price = market.price;
    const totalUsd = amount * price;
    const fee = totalUsd * 0.001; // 0.1% simulated fee

    if (decision.action === 'buy') {
      // Check sufficient balance
      const costUsd = totalUsd + fee;
      if (balance.usdBalance < costUsd && balance.tonBalance < amount) {
        // Buying with TON (DCA / yield strategy) — use TON balance as cost basis
        if (balance.tonBalance < amount) {
          return null; // Insufficient
        }
        // No-op: TON already held; just record yield accumulation
      }

      if (balance.usdBalance >= costUsd) {
        balance.usdBalance -= costUsd;
        balance.tonBalance += amount;
      } else {
        // Buying by converting existing TON to "position" — track as increase
        balance.tonBalance += amount;
      }
    } else if (decision.action === 'sell') {
      if (balance.tonBalance < amount) {
        return null; // Insufficient TON to sell
      }
      const proceeds = totalUsd - fee;
      balance.tonBalance -= amount;
      balance.usdBalance += proceeds;
    }

    // Record the trade
    const prevBalance = balance.trades.length > 0
      ? balance.trades[balance.trades.length - 1]
      : null;

    const tradeId = `trade_${agentId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pnl = prevBalance
      ? (balance.tonBalance + balance.usdBalance / price) - (balance.initialBudget)
      : 0;

    const trade: Trade = {
      id: tradeId,
      agentId,
      type: decision.action as 'buy' | 'sell',
      symbol: market.symbol,
      amount,
      price,
      totalUsd,
      pnl,
      fee,
      isSimulated: true,
      strategyType,
      executedAt: new Date(),
    };

    balance.trades.push(trade);

    // Update PnL
    this.recalculatePnl(balance, price);

    this.balances.set(agentId, balance);
    return { ...trade };
  }

  /**
   * Recalculate PnL based on current price
   */
  updatePnl(agentId: string, currentPrice: number): void {
    const balance = this.balances.get(agentId);
    if (!balance) return;
    this.recalculatePnl(balance, currentPrice);
    this.balances.set(agentId, balance);
  }

  /**
   * Reset simulation to initial state (replay/reset feature)
   */
  resetBalance(agentId: string, config: AgentConfig, initialPrice: number): SimulationBalance {
    return this.initBalance(agentId, config, initialPrice);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private recalculatePnl(balance: SimulationBalance, currentPrice: number): void {
    const initialValueUsd = balance.initialBudget * currentPrice;
    const currentValueUsd = balance.tonBalance * currentPrice + balance.usdBalance;

    // Realized PnL from completed sell trades
    balance.realizedPnl = balance.trades
      .filter((t) => t.type === 'sell')
      .reduce((sum, t) => sum + t.pnl, 0);

    // Unrealized PnL from open TON position
    balance.unrealizedPnl = currentValueUsd - initialValueUsd;
    balance.totalPnl = balance.realizedPnl + balance.unrealizedPnl;
    balance.roi = initialValueUsd > 0 ? (balance.totalPnl / initialValueUsd) * 100 : 0;
    balance.updatedAt = new Date();
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new simulation balance manager
 */
export function createSimulationBalanceManager(): SimulationBalanceManager {
  return new SimulationBalanceManager();
}

/**
 * Create a new market simulator
 */
export function createMarketSimulator(symbol?: string, initialPrice?: number): MarketSimulator {
  return new MarketSimulator(symbol, initialPrice);
}
