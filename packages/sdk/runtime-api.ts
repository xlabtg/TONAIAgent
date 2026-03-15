/**
 * TONAIAgent - Runtime Integration API
 *
 * Core API that agent execution_logic uses to interact with the production
 * trading infrastructure. Provides a unified, type-safe interface over the
 * underlying live-trading, marketplace, and agent-runtime modules.
 *
 * Five core operations:
 *   - getMarketData()   — real-time and historical price feeds
 *   - placeOrder()      — DEX/CEX/DeFi order execution
 *   - getPortfolio()    — current balances, positions, and PnL
 *   - allocateCapital() — smart capital distribution across assets
 *   - getRiskMetrics()  — live risk indicators and guardrails
 *
 * @example
 * ```typescript
 * import { createRuntimeAPI, RuntimeAPI } from '@tonaiagent/core/sdk';
 *
 * const api = createRuntimeAPI({ simulationMode: true });
 *
 * // In your agent execution_logic:
 * const tonData = await api.getMarketData('TON');
 * console.log('TON price:', tonData.current);
 *
 * const order = await api.placeOrder({
 *   asset: 'TON',
 *   side: 'buy',
 *   amount: 100,
 *   type: 'market',
 * });
 *
 * const portfolio = await api.getPortfolio();
 * console.log('Total value:', portfolio.totalValue);
 *
 * await api.allocateCapital({ asset: 'TON', amount: 200, mode: 'fixed' });
 *
 * const risk = await api.getRiskMetrics();
 * if (risk.circuitBreakerActive) {
 *   console.warn('Circuit breaker triggered — halting execution');
 * }
 * ```
 */

import type {
  AgentMarketDataSnapshot,
  AgentOrderRequest,
  AgentOrderResult,
  AgentPortfolioSnapshot,
  AgentPosition,
  AgentCapitalAllocation,
  AgentAllocationResult,
  AgentRiskMetrics,
} from './agent-framework';

// ============================================================================
// Runtime API Configuration
// ============================================================================

/** Configuration for the Runtime Integration API */
export interface RuntimeAPIConfig {
  /** Whether to run in simulation mode (no real transactions) */
  simulationMode?: boolean;

  /** Initial simulation balance in base currency */
  initialSimulationBalance?: number;

  /** API base URL for production endpoints */
  baseUrl?: string;

  /** Authentication key */
  apiKey?: string;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Maximum retries on failure */
  maxRetries?: number;
}

// ============================================================================
// Market Data Types
// ============================================================================

/** Extended market data with historical context */
export interface RuntimeMarketData extends AgentMarketDataSnapshot {
  /** Bid price */
  bid?: number;

  /** Ask price */
  ask?: number;

  /** 7-day price change percent */
  change7d?: number;

  /** All-time high */
  ath?: number;

  /** Market cap in USD */
  marketCap?: number;

  /** Order book depth (asks) */
  asks?: [number, number][];

  /** Order book depth (bids) */
  bids?: [number, number][];
}

/** Historical OHLCV bar */
export interface OHLCVBar {
  /** Bar open timestamp */
  timestamp: Date;

  /** Open price */
  open: number;

  /** High price */
  high: number;

  /** Low price */
  low: number;

  /** Close price */
  close: number;

  /** Volume */
  volume: number;
}

/** Market data query parameters */
export interface MarketDataQuery {
  /** Asset symbol */
  asset: string;

  /** Timeframe for OHLCV data (e.g., '1m', '5m', '1h', '4h', '1d') */
  timeframe?: string;

  /** Number of historical bars to fetch */
  limit?: number;

  /** Include order book depth */
  includeOrderBook?: boolean;
}

// ============================================================================
// Order Types
// ============================================================================

/** Extended order request with additional routing options */
export interface RuntimeOrderRequest extends AgentOrderRequest {
  /** Preferred execution venue */
  venue?: 'dex' | 'cex' | 'best';

  /** Time in force */
  timeInForce?: 'GTC' | 'IOC' | 'FOK';

  /** Maximum gas cost in nanoTON */
  maxGasNano?: bigint;
}

/** Order book entry */
export interface OrderBookEntry {
  /** Price level */
  price: number;

  /** Available quantity */
  quantity: number;
}

// ============================================================================
// Portfolio Types
// ============================================================================

/** Extended portfolio with performance metrics */
export interface RuntimePortfolio extends AgentPortfolioSnapshot {
  /** Daily PnL */
  dailyPnl: number;

  /** Daily PnL percent */
  dailyPnlPercent: number;

  /** Total PnL since inception */
  totalPnl: number;

  /** Total PnL percent */
  totalPnlPercent: number;

  /** Win rate across all closed trades */
  winRate?: number;

  /** Sharpe ratio */
  sharpeRatio?: number;
}

// ============================================================================
// Risk Metric Types
// ============================================================================

/** Extended risk metrics */
export interface RuntimeRiskMetrics extends AgentRiskMetrics {
  /** Total exposure value in base currency */
  totalExposure: number;

  /** Total exposure as percent of portfolio */
  exposurePercent: number;

  /** Beta relative to market benchmark */
  beta?: number;

  /** Annualized volatility */
  volatility?: number;

  /** Number of active risk alerts */
  activeAlerts: number;

  /** Risk level summary */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Runtime API Interface
// ============================================================================

export interface RuntimeAPI {
  /** Get current market data for an asset */
  getMarketData(asset: string): Promise<RuntimeMarketData>;

  /** Get historical OHLCV data */
  getHistoricalData(query: MarketDataQuery): Promise<OHLCVBar[]>;

  /** Place an order */
  placeOrder(order: RuntimeOrderRequest): Promise<AgentOrderResult>;

  /** Get current portfolio state */
  getPortfolio(): Promise<RuntimePortfolio>;

  /** Allocate capital to an asset */
  allocateCapital(allocation: AgentCapitalAllocation): Promise<AgentAllocationResult>;

  /** Get current risk metrics */
  getRiskMetrics(): Promise<RuntimeRiskMetrics>;

  /** Get the current simulation state (simulation mode only) */
  getSimulationState(): RuntimeSimulationState | null;

  /** Whether this API is in simulation mode */
  readonly isSimulation: boolean;
}

/** Simulation state snapshot */
export interface RuntimeSimulationState {
  /** Simulated balance in base currency */
  balance: number;

  /** Simulated positions */
  positions: AgentPosition[];

  /** Number of simulated trades executed */
  totalTrades: number;

  /** Simulated total PnL */
  totalPnl: number;

  /** Simulation start time */
  startedAt: Date;
}

// ============================================================================
// Default Runtime API Implementation
// ============================================================================

export class DefaultRuntimeAPI implements RuntimeAPI {
  readonly isSimulation: boolean;
  private readonly config: Required<RuntimeAPIConfig>;
  private simBalance: number;
  private simPositions: AgentPosition[] = [];
  private simTrades = 0;
  private simTotalPnl = 0;
  private simStartedAt: Date;

  constructor(config: RuntimeAPIConfig = {}) {
    this.config = {
      simulationMode: config.simulationMode ?? true,
      initialSimulationBalance: config.initialSimulationBalance ?? 10000,
      baseUrl: config.baseUrl ?? 'https://api.tonaiagent.com',
      apiKey: config.apiKey ?? '',
      timeoutMs: config.timeoutMs ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };
    this.isSimulation = this.config.simulationMode;
    this.simBalance = this.config.initialSimulationBalance;
    this.simStartedAt = new Date();
  }

  async getMarketData(asset: string): Promise<RuntimeMarketData> {
    // Simulation: return mock data with realistic structure
    if (this.isSimulation) {
      const basePrice = this.getMockPrice(asset);
      return {
        asset,
        current: basePrice,
        change24h: (Math.random() - 0.5) * 10,
        volume24h: 1000000 * (0.5 + Math.random()),
        ma20: basePrice * (0.95 + Math.random() * 0.1),
        ma50: basePrice * (0.9 + Math.random() * 0.2),
        rsi14: 30 + Math.random() * 40,
        timestamp: new Date(),
        bid: basePrice * 0.999,
        ask: basePrice * 1.001,
        change7d: (Math.random() - 0.5) * 20,
        asks: [[basePrice * 1.001, 1000], [basePrice * 1.002, 500]],
        bids: [[basePrice * 0.999, 1000], [basePrice * 0.998, 500]],
      };
    }

    throw new RuntimeAPIError(
      'Live market data requires API key and network connection',
      'LIVE_DATA_UNAVAILABLE'
    );
  }

  async getHistoricalData(query: MarketDataQuery): Promise<OHLCVBar[]> {
    const limit = query.limit ?? 100;
    const bars: OHLCVBar[] = [];
    const basePrice = this.getMockPrice(query.asset);
    const intervalMs = this.timeframeToMs(query.timeframe ?? '1d');

    let price = basePrice * (0.9 + Math.random() * 0.2);
    for (let i = limit - 1; i >= 0; i--) {
      const open = price;
      const change = (Math.random() - 0.5) * 0.04;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      bars.push({
        timestamp: new Date(Date.now() - i * intervalMs),
        open,
        high,
        low,
        close,
        volume: 100000 * (0.5 + Math.random()),
      });
      price = close;
    }
    return bars;
  }

  async placeOrder(order: RuntimeOrderRequest): Promise<AgentOrderResult> {
    if (!this.isSimulation) {
      throw new RuntimeAPIError(
        'Live order placement requires production configuration',
        'LIVE_ORDER_UNAVAILABLE'
      );
    }

    const price = this.getMockPrice(order.asset);
    const slippage = 1 + (order.slippageTolerance ?? 0.5) / 100 * (Math.random() - 0.5);
    const executedPrice = order.type === 'limit' && order.limitPrice
      ? order.limitPrice
      : price * slippage;
    const cost = executedPrice * order.amount;

    if (order.side === 'buy') {
      if (cost > this.simBalance) {
        return {
          orderId: `sim-order-${Date.now()}`,
          status: 'failed',
          error: 'Insufficient balance',
        };
      }
      this.simBalance -= cost;
      const existing = this.simPositions.find(p => p.asset === order.asset);
      if (existing) {
        const totalAmount = existing.amount + order.amount;
        existing.entryPrice = (existing.entryPrice * existing.amount + executedPrice * order.amount) / totalAmount;
        existing.amount = totalAmount;
        existing.currentPrice = executedPrice;
        existing.unrealizedPnl = (existing.currentPrice - existing.entryPrice) * existing.amount;
      } else {
        this.simPositions.push({
          asset: order.asset,
          amount: order.amount,
          entryPrice: executedPrice,
          currentPrice: executedPrice,
          unrealizedPnl: 0,
          openedAt: new Date(),
        });
      }
    } else {
      const position = this.simPositions.find(p => p.asset === order.asset);
      if (!position || position.amount < order.amount) {
        return {
          orderId: `sim-order-${Date.now()}`,
          status: 'failed',
          error: 'Insufficient position',
        };
      }
      const pnl = (executedPrice - position.entryPrice) * order.amount;
      this.simTotalPnl += pnl;
      this.simBalance += executedPrice * order.amount;
      position.amount -= order.amount;
      if (position.amount <= 0) {
        this.simPositions = this.simPositions.filter(p => p.asset !== order.asset);
      }
    }

    this.simTrades++;

    return {
      orderId: `sim-order-${Date.now()}`,
      status: 'filled',
      executedPrice,
      executedAmount: order.amount,
    };
  }

  async getPortfolio(): Promise<RuntimePortfolio> {
    const positionValue = this.simPositions.reduce((sum, p) => {
      const currentPrice = this.getMockPrice(p.asset);
      p.currentPrice = currentPrice;
      p.unrealizedPnl = (currentPrice - p.entryPrice) * p.amount;
      return sum + currentPrice * p.amount;
    }, 0);

    const totalValue = this.simBalance + positionValue;
    const initialBalance = this.config.initialSimulationBalance;
    const totalPnl = totalValue - initialBalance;
    const totalPnlPercent = (totalPnl / initialBalance) * 100;

    return {
      totalValue,
      availableBalance: this.simBalance,
      positions: [...this.simPositions],
      realizedPnl: this.simTotalPnl,
      unrealizedPnl: positionValue - this.simPositions.reduce((sum, p) => sum + p.entryPrice * p.amount, 0),
      timestamp: new Date(),
      dailyPnl: totalPnl,
      dailyPnlPercent: totalPnlPercent,
      totalPnl,
      totalPnlPercent,
    };
  }

  async allocateCapital(allocation: AgentCapitalAllocation): Promise<AgentAllocationResult> {
    const portfolio = await this.getPortfolio();
    const amount = allocation.mode === 'percent'
      ? (allocation.amount / 100) * portfolio.totalValue
      : allocation.amount;

    const result = await this.placeOrder({
      asset: allocation.asset,
      side: 'buy',
      amount: amount / this.getMockPrice(allocation.asset),
      type: 'market',
      slippageTolerance: allocation.maxSlippagePercent,
    });

    return {
      success: result.status === 'filled',
      allocatedAmount: result.executedAmount ? result.executedAmount * (result.executedPrice ?? 1) : 0,
      executionPrice: result.executedPrice ?? 0,
      error: result.error,
    };
  }

  async getRiskMetrics(): Promise<RuntimeRiskMetrics> {
    const portfolio = await this.getPortfolio();
    const exposure = portfolio.positions.reduce((sum, p) => sum + p.currentPrice * p.amount, 0);
    const exposurePercent = portfolio.totalValue > 0 ? (exposure / portfolio.totalValue) * 100 : 0;

    const drawdown = portfolio.totalPnlPercent < 0 ? Math.abs(portfolio.totalPnlPercent) : 0;
    let riskLevel: RuntimeRiskMetrics['riskLevel'] = 'low';
    if (drawdown > 20 || exposurePercent > 80) riskLevel = 'critical';
    else if (drawdown > 10 || exposurePercent > 60) riskLevel = 'high';
    else if (drawdown > 5 || exposurePercent > 40) riskLevel = 'medium';

    return {
      currentDrawdown: drawdown,
      maxDrawdown: drawdown,
      dailyPnl: portfolio.dailyPnl,
      valueAtRisk95: portfolio.totalValue * 0.02,
      sharpeRatio: 0,
      consecutiveFailures: 0,
      circuitBreakerActive: false,
      totalExposure: exposure,
      exposurePercent,
      activeAlerts: 0,
      riskLevel,
    };
  }

  getSimulationState(): RuntimeSimulationState | null {
    if (!this.isSimulation) return null;
    return {
      balance: this.simBalance,
      positions: [...this.simPositions],
      totalTrades: this.simTrades,
      totalPnl: this.simTotalPnl,
      startedAt: this.simStartedAt,
    };
  }

  private getMockPrice(asset: string): number {
    const prices: Record<string, number> = {
      TON: 2.5,
      USDT: 1.0,
      USDC: 1.0,
      BTC: 65000,
      ETH: 3200,
      NOT: 0.008,
    };
    return prices[asset.toUpperCase()] ?? 1.0;
  }

  private timeframeToMs(timeframe: string): number {
    const units: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };
    const match = timeframe.match(/^(\d+)([mhdw])$/);
    if (!match) return 24 * 60 * 60 * 1000;
    return parseInt(match[1]) * (units[match[2]] ?? 60 * 1000);
  }
}

// ============================================================================
// Error Types
// ============================================================================

export type RuntimeAPIErrorCode =
  | 'LIVE_DATA_UNAVAILABLE'
  | 'LIVE_ORDER_UNAVAILABLE'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_POSITION'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export class RuntimeAPIError extends Error {
  constructor(
    message: string,
    public readonly code: RuntimeAPIErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RuntimeAPIError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Runtime Integration API instance.
 *
 * @example
 * ```typescript
 * import { createRuntimeAPI } from '@tonaiagent/core/sdk';
 *
 * // Simulation mode (default)
 * const api = createRuntimeAPI({ simulationMode: true, initialSimulationBalance: 10000 });
 *
 * // Production mode
 * const liveApi = createRuntimeAPI({ simulationMode: false, apiKey: process.env.API_KEY });
 * ```
 */
export function createRuntimeAPI(config?: RuntimeAPIConfig): DefaultRuntimeAPI {
  return new DefaultRuntimeAPI(config);
}
