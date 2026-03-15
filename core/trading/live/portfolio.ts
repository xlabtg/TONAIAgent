/**
 * TONAIAgent - Portfolio Synchronization Module
 *
 * Maintains accurate tracking of agent portfolio state, keeping it synchronized
 * with live execution results and marketplace performance metrics.
 *
 * Tracks:
 *   - Token balances per agent
 *   - Open positions with real-time PnL
 *   - Realized and unrealized PnL
 *   - Historical PnL records
 *   - Integration with marketplace performance metrics
 */

import {
  PortfolioState,
  PortfolioBalance,
  PortfolioPosition,
  PortfolioSyncResult,
  PnLRecord,
  ExecutionResult,
  OrderResult,
  LiveTradingEvent,
  LiveTradingEventCallback,
} from './types';

// ============================================================================
// Portfolio Service Interface
// ============================================================================

export interface PortfolioService {
  getPortfolio(agentId: string): PortfolioState;
  syncFromExecution(agentId: string, execution: ExecutionResult): void;
  updatePrices(agentId: string, prices: Record<string, number>): void;
  getPositions(agentId: string): PortfolioPosition[];
  closePosition(agentId: string, positionId: string, exitPrice: number): void;
  getPnLHistory(agentId: string, period: PnLRecord['period']): PnLRecord[];
  getAgentSummary(agentId: string): PortfolioSummary;
  onEvent(callback: LiveTradingEventCallback): void;
}

export interface PortfolioSummary {
  agentId: string;
  totalValue: number;
  totalCost: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  totalFeesPaid: number;
  openPositionCount: number;
  dayChange: number;
  dayChangePercent: number;
  topHoldings: PortfolioBalance[];
  lastSyncedAt: Date;
}

// ============================================================================
// Portfolio Service Configuration
// ============================================================================

export interface PortfolioServiceConfig {
  /** How many PnL records to retain per agent per period */
  maxPnLHistoryRecords: number;
  /** Whether to emit events on every balance update */
  emitOnBalanceUpdate: boolean;
}

const DEFAULT_CONFIG: PortfolioServiceConfig = {
  maxPnLHistoryRecords: 365,
  emitOnBalanceUpdate: true,
};

// ============================================================================
// Default Portfolio Service Implementation
// ============================================================================

export class DefaultPortfolioService implements PortfolioService {
  private readonly config: PortfolioServiceConfig;
  private readonly portfolios = new Map<string, PortfolioState>();
  private readonly pnlHistory = new Map<string, PnLRecord[]>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];
  private pnlRecordCounter = 0;

  constructor(config: Partial<PortfolioServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<LiveTradingEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LiveTradingEvent = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore errors in callbacks
      }
    }
  }

  getPortfolio(agentId: string): PortfolioState {
    return this.ensurePortfolio(agentId);
  }

  syncFromExecution(agentId: string, execution: ExecutionResult): void {
    if (execution.filledQuantity === 0 || execution.orders.length === 0) {
      return;
    }

    const portfolio = this.ensurePortfolio(agentId);

    for (const order of execution.orders) {
      if (order.filledQuantity === 0) {
        continue;
      }
      this.processOrderForPortfolio(portfolio, order, execution.executionId);
    }

    portfolio.totalFeesPaid += execution.totalFees;
    portfolio.lastSyncedAt = new Date();

    // Record PnL
    this.recordDailyPnL(agentId, portfolio);

    if (this.config.emitOnBalanceUpdate) {
      this.emitEvent({
        type: 'portfolio.updated',
        agentId,
        data: {
          executionId: execution.executionId,
          totalValue: portfolio.totalValue,
          unrealizedPnl: portfolio.totalUnrealizedPnl,
          realizedPnl: portfolio.totalRealizedPnl,
        },
        severity: 'info',
      });
    }
  }

  updatePrices(agentId: string, prices: Record<string, number>): void {
    const portfolio = this.ensurePortfolio(agentId);
    let totalValue = 0;
    let totalUnrealizedPnl = 0;

    // Update balance values
    for (const balance of portfolio.balances) {
      const currentPrice = prices[balance.token] ?? prices[`${balance.token}/USDT`] ?? balance.currentPrice;
      balance.currentPrice = currentPrice;
      balance.value = balance.quantity * currentPrice;
      balance.unrealizedPnl = (currentPrice - balance.averageCost) * balance.quantity;
      balance.unrealizedPnlPercent = balance.averageCost > 0
        ? ((currentPrice - balance.averageCost) / balance.averageCost) * 100
        : 0;
      totalValue += balance.value;
    }

    // Update position values
    for (const position of portfolio.openPositions) {
      const currentPrice = prices[position.symbol] ?? position.currentPrice;
      position.currentPrice = currentPrice;
      position.unrealizedPnl = position.side === 'buy'
        ? (currentPrice - position.entryPrice) * position.quantity
        : (position.entryPrice - currentPrice) * position.quantity;
      position.unrealizedPnlPercent = position.entryPrice > 0
        ? (position.unrealizedPnl / (position.entryPrice * position.quantity)) * 100
        : 0;
      position.lastUpdated = new Date();
      totalUnrealizedPnl += position.unrealizedPnl;
    }

    // Recalculate weights
    if (totalValue > 0) {
      for (const balance of portfolio.balances) {
        balance.weight = balance.value / totalValue;
      }
    }

    portfolio.totalValue = totalValue;
    portfolio.totalUnrealizedPnl = totalUnrealizedPnl;
    portfolio.lastSyncedAt = new Date();
  }

  getPositions(agentId: string): PortfolioPosition[] {
    return this.ensurePortfolio(agentId).openPositions;
  }

  closePosition(agentId: string, positionId: string, exitPrice: number): void {
    const portfolio = this.ensurePortfolio(agentId);
    const positionIndex = portfolio.openPositions.findIndex(p => p.id === positionId);

    if (positionIndex === -1) {
      return;
    }

    const position = portfolio.openPositions[positionIndex]!;
    const realizedPnl = position.side === 'buy'
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;

    portfolio.totalRealizedPnl += realizedPnl;
    portfolio.totalUnrealizedPnl -= position.unrealizedPnl;
    portfolio.openPositions.splice(positionIndex, 1);
    portfolio.lastSyncedAt = new Date();
  }

  getPnLHistory(agentId: string, period: PnLRecord['period']): PnLRecord[] {
    const history = this.pnlHistory.get(agentId) ?? [];
    return history.filter(r => r.period === period);
  }

  getAgentSummary(agentId: string): PortfolioSummary {
    const portfolio = this.ensurePortfolio(agentId);
    const totalCost = portfolio.totalCost;
    const totalValue = portfolio.totalValue;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    // Calculate day change from PnL history
    const todayHistory = (this.pnlHistory.get(agentId) ?? []).filter(
      r => r.period === 'daily' && r.date >= dayStart
    );
    const dayChange = todayHistory.reduce((sum, r) => sum + r.realizedPnl, 0);
    const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    // Sort balances by value descending for top holdings
    const topHoldings = [...portfolio.balances]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      agentId,
      totalValue,
      totalCost,
      unrealizedPnl: portfolio.totalUnrealizedPnl,
      unrealizedPnlPercent: totalCost > 0
        ? (portfolio.totalUnrealizedPnl / totalCost) * 100
        : 0,
      realizedPnl: portfolio.totalRealizedPnl,
      totalFeesPaid: portfolio.totalFeesPaid,
      openPositionCount: portfolio.openPositions.length,
      dayChange,
      dayChangePercent,
      topHoldings,
      lastSyncedAt: portfolio.lastSyncedAt,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private ensurePortfolio(agentId: string): PortfolioState {
    let portfolio = this.portfolios.get(agentId);
    if (!portfolio) {
      portfolio = {
        agentId,
        totalValue: 0,
        totalCost: 0,
        totalUnrealizedPnl: 0,
        totalRealizedPnl: 0,
        totalFeesPaid: 0,
        balances: [],
        openPositions: [],
        lastSyncedAt: new Date(),
      };
      this.portfolios.set(agentId, portfolio);
    }
    return portfolio;
  }

  private processOrderForPortfolio(
    portfolio: PortfolioState,
    order: OrderResult,
    executionId: string
  ): void {
    if (!order.averageFilledPrice || order.filledQuantity === 0) {
      return;
    }

    const [baseToken, quoteToken] = this.parseSymbol(order.symbol);
    const tradeValue = order.filledQuantity * order.averageFilledPrice;

    if (order.side === 'buy') {
      // Add to base token balance
      this.adjustBalance(portfolio, baseToken, order.filledQuantity, order.averageFilledPrice);
      // Deduct from quote token balance
      this.adjustBalance(portfolio, quoteToken, -(tradeValue + order.fees), 1);

      // Open a new long position
      const position: PortfolioPosition = {
        id: `pos_${executionId}_${Date.now()}`,
        agentId: portfolio.agentId,
        symbol: order.symbol,
        exchangeId: order.exchangeOrderId.split('_')[0] ?? 'unknown',
        side: 'buy',
        quantity: order.filledQuantity,
        entryPrice: order.averageFilledPrice,
        currentPrice: order.averageFilledPrice,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        openedAt: new Date(),
        lastUpdated: new Date(),
      };
      portfolio.openPositions.push(position);
    } else {
      // Add to quote token balance
      this.adjustBalance(portfolio, quoteToken, tradeValue - order.fees, 1);
      // Deduct from base token balance
      this.adjustBalance(portfolio, baseToken, -order.filledQuantity, order.averageFilledPrice);

      // Close matching long positions (FIFO)
      let remainingToClose = order.filledQuantity;
      const longPositions = portfolio.openPositions.filter(
        p => p.symbol === order.symbol && p.side === 'buy'
      );

      for (const pos of longPositions) {
        if (remainingToClose <= 0) break;

        const closeQuantity = Math.min(pos.quantity, remainingToClose);
        const realizedPnl = (order.averageFilledPrice - pos.entryPrice) * closeQuantity;

        portfolio.totalRealizedPnl += realizedPnl;
        remainingToClose -= closeQuantity;

        if (closeQuantity >= pos.quantity) {
          portfolio.openPositions = portfolio.openPositions.filter(p => p.id !== pos.id);
        } else {
          pos.quantity -= closeQuantity;
        }
      }
    }

    portfolio.totalCost = portfolio.balances.reduce(
      (sum, b) => sum + b.quantity * b.averageCost,
      0
    );
  }

  private adjustBalance(
    portfolio: PortfolioState,
    token: string,
    quantityDelta: number,
    price: number
  ): void {
    let balance = portfolio.balances.find(b => b.token === token);

    if (!balance) {
      balance = {
        token,
        quantity: 0,
        averageCost: 0,
        currentPrice: price,
        value: 0,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        weight: 0,
        lastUpdated: new Date(),
      };
      portfolio.balances.push(balance);
    }

    const previousQuantity = balance.quantity;

    if (quantityDelta > 0 && price > 0) {
      // Buying: update average cost (weighted average)
      const totalCost = previousQuantity * balance.averageCost + quantityDelta * price;
      balance.quantity += quantityDelta;
      balance.averageCost = balance.quantity > 0 ? totalCost / balance.quantity : 0;
    } else if (quantityDelta < 0) {
      // Selling: keep same average cost, reduce quantity
      balance.quantity = Math.max(0, balance.quantity + quantityDelta);
    }

    balance.currentPrice = price > 0 ? price : balance.currentPrice;
    balance.value = balance.quantity * balance.currentPrice;
    balance.unrealizedPnl = (balance.currentPrice - balance.averageCost) * balance.quantity;
    balance.unrealizedPnlPercent = balance.averageCost > 0
      ? ((balance.currentPrice - balance.averageCost) / balance.averageCost) * 100
      : 0;
    balance.lastUpdated = new Date();

    // Remove zero balances
    if (balance.quantity === 0) {
      portfolio.balances = portfolio.balances.filter(b => b.token !== token);
    }
  }

  private parseSymbol(symbol: string): [string, string] {
    if (symbol.includes('/')) {
      const parts = symbol.split('/');
      return [parts[0] ?? symbol, parts[1] ?? 'USDT'];
    }
    // Handle concatenated symbols like TONUSDT
    if (symbol.endsWith('USDT')) {
      return [symbol.slice(0, -4), 'USDT'];
    }
    if (symbol.endsWith('TON')) {
      return [symbol.slice(0, -3), 'TON'];
    }
    return [symbol, 'USDT'];
  }

  private recordDailyPnL(agentId: string, portfolio: PortfolioState): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record: PnLRecord = {
      id: `pnl_${++this.pnlRecordCounter}`,
      agentId,
      period: 'daily',
      date: today,
      realizedPnl: portfolio.totalRealizedPnl,
      unrealizedPnl: portfolio.totalUnrealizedPnl,
      totalPnl: portfolio.totalRealizedPnl + portfolio.totalUnrealizedPnl,
      feesPaid: portfolio.totalFeesPaid,
      tradeCount: portfolio.openPositions.length,
    };

    const history = this.pnlHistory.get(agentId) ?? [];

    // Replace existing record for today if it exists
    const todayIndex = history.findIndex(
      r => r.period === 'daily' && r.date.getTime() === today.getTime()
    );

    if (todayIndex >= 0) {
      history[todayIndex] = record;
    } else {
      history.push(record);
    }

    // Trim history to max records
    const dailyHistory = history.filter(r => r.period === 'daily');
    if (dailyHistory.length > this.config.maxPnLHistoryRecords) {
      history.splice(
        history.findIndex(r => r.period === 'daily'),
        1
      );
    }

    this.pnlHistory.set(agentId, history);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPortfolioService(
  config?: Partial<PortfolioServiceConfig>
): DefaultPortfolioService {
  return new DefaultPortfolioService(config);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
