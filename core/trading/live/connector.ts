/**
 * TONAIAgent - Exchange Connector Layer
 *
 * Modular connector system for integrating AI agents with liquidity venues:
 * - DEX (Decentralized Exchanges on TON/other chains)
 * - CEX (Centralized Exchanges via REST/WebSocket APIs)
 * - DeFi protocols (liquidity pools, lending protocols)
 *
 * Each connector implements the ExchangeConnector interface:
 *   connect() → getBalances() → placeOrder() → cancelOrder() → getOrderStatus()
 */

import {
  ExchangeConnector,
  ExchangeConnectorConfig,
  ExchangeStatus,
  ExchangeBalance,
  PlaceOrderRequest,
  OrderResult,
  OrderStatusResult,
  OrderStatus,
  LiveTradingEvent,
  LiveTradingEventCallback,
} from './types';

// ============================================================================
// Base Connector Implementation
// ============================================================================

/**
 * Abstract base class providing common connector functionality.
 * Subclass for each specific exchange/DEX/DeFi protocol.
 */
export abstract class BaseExchangeConnector implements ExchangeConnector {
  readonly config: ExchangeConnectorConfig;
  protected _status: ExchangeStatus = 'disconnected';
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];

  constructor(config: ExchangeConnectorConfig) {
    this.config = config;
  }

  get status(): ExchangeStatus {
    return this._status;
  }

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  protected emitEvent(event: Omit<LiveTradingEvent, 'id' | 'timestamp'>): void {
    const fullEvent: LiveTradingEvent = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getBalances(): Promise<ExchangeBalance[]>;
  abstract placeOrder(request: PlaceOrderRequest): Promise<OrderResult>;
  abstract cancelOrder(orderId: string): Promise<boolean>;
  abstract getOrderStatus(orderId: string): Promise<OrderStatusResult>;
}

// ============================================================================
// Simulated Connector (for testing and simulation mode)
// ============================================================================

/**
 * SimulatedExchangeConnector provides a fully functional in-memory connector
 * for testing, development, and simulation mode. It simulates realistic order
 * fills, partial fills, and market conditions without connecting to any real venue.
 */
export class SimulatedExchangeConnector extends BaseExchangeConnector {
  private readonly orders = new Map<string, OrderResult>();
  private readonly balances = new Map<string, ExchangeBalance>();
  private orderCounter = 0;

  constructor(config: ExchangeConnectorConfig, initialBalances?: ExchangeBalance[]) {
    super(config);

    // Set up default simulated balances
    const defaultBalances: ExchangeBalance[] = initialBalances ?? [
      {
        token: 'TON',
        available: 1000,
        reserved: 0,
        total: 1000,
        updatedAt: new Date(),
      },
      {
        token: 'USDT',
        available: 5000,
        reserved: 0,
        total: 5000,
        updatedAt: new Date(),
      },
    ];

    for (const balance of defaultBalances) {
      this.balances.set(balance.token, balance);
    }
  }

  async connect(): Promise<void> {
    this._status = 'connected';
    this.emitEvent({
      type: 'connector.connected',
      exchangeId: this.config.exchangeId,
      data: { name: this.config.name, type: this.config.type },
      severity: 'info',
    });
  }

  async disconnect(): Promise<void> {
    this._status = 'disconnected';
    this.emitEvent({
      type: 'connector.disconnected',
      exchangeId: this.config.exchangeId,
      data: { name: this.config.name },
      severity: 'info',
    });
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    return Array.from(this.balances.values());
  }

  async placeOrder(request: PlaceOrderRequest): Promise<OrderResult> {
    if (this._status !== 'connected') {
      throw new ConnectorError('Connector is not connected', 'NOT_CONNECTED', this.config.exchangeId);
    }

    const orderId = `sim_order_${++this.orderCounter}_${Date.now()}`;
    const exchangeOrderId = `exch_${orderId}`;

    // Simulate slippage for market orders
    const slippage = request.type === 'market' ? (Math.random() * 0.005) : 0;
    const simulatedPrice = request.price
      ? request.price * (request.side === 'buy' ? (1 + slippage) : (1 - slippage))
      : 1.0; // Fallback simulated price

    // Simulate partial fills (10% chance of partial fill)
    const fillRatio = Math.random() > 0.1 ? 1.0 : 0.5 + Math.random() * 0.4;
    const filledQuantity = request.quantity * fillRatio;
    const fees = filledQuantity * simulatedPrice * 0.001; // 0.1% fee

    const result: OrderResult = {
      orderId,
      clientOrderId: request.clientOrderId,
      exchangeOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      status: filledQuantity >= request.quantity ? 'filled' : 'partially_filled',
      requestedQuantity: request.quantity,
      filledQuantity,
      remainingQuantity: request.quantity - filledQuantity,
      price: request.price,
      averageFilledPrice: simulatedPrice,
      fees,
      feeToken: 'USDT',
      transactionIds: [`sim_tx_${Date.now()}`],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(orderId, result);

    // Update simulated balances
    this.updateSimulatedBalances(result);

    this.emitEvent({
      type: 'order.placed',
      exchangeId: this.config.exchangeId,
      data: { orderId, symbol: request.symbol, side: request.side, status: result.status },
      severity: 'info',
    });

    if (result.status === 'filled') {
      this.emitEvent({
        type: 'order.filled',
        exchangeId: this.config.exchangeId,
        data: { orderId, filledQuantity, averagePrice: simulatedPrice },
        severity: 'info',
      });
    }

    return result;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      return false;
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();

    this.emitEvent({
      type: 'order.cancelled',
      exchangeId: this.config.exchangeId,
      data: { orderId },
      severity: 'info',
    });

    return true;
  }

  async getOrderStatus(orderId: string): Promise<OrderStatusResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new ConnectorError(`Order ${orderId} not found`, 'ORDER_NOT_FOUND', this.config.exchangeId);
    }

    return {
      orderId: order.orderId,
      exchangeOrderId: order.exchangeOrderId,
      status: order.status,
      filledQuantity: order.filledQuantity,
      remainingQuantity: order.remainingQuantity,
      averageFilledPrice: order.averageFilledPrice,
      fees: order.fees,
      updatedAt: order.updatedAt,
    };
  }

  private updateSimulatedBalances(order: OrderResult): void {
    if (!order.averageFilledPrice || order.filledQuantity === 0) {
      return;
    }

    const [baseToken, quoteToken] = order.symbol.includes('/')
      ? order.symbol.split('/')
      : [order.symbol.replace('USDT', ''), 'USDT'];

    if (order.side === 'buy') {
      // Deduct quote token, add base token
      const quoteCost = order.filledQuantity * order.averageFilledPrice + order.fees;
      const quoteBalance = this.balances.get(quoteToken);
      if (quoteBalance) {
        quoteBalance.available = Math.max(0, quoteBalance.available - quoteCost);
        quoteBalance.total = Math.max(0, quoteBalance.total - quoteCost);
        quoteBalance.updatedAt = new Date();
      }

      const baseBalance = this.balances.get(baseToken) ?? {
        token: baseToken,
        available: 0,
        reserved: 0,
        total: 0,
        updatedAt: new Date(),
      };
      baseBalance.available += order.filledQuantity;
      baseBalance.total += order.filledQuantity;
      baseBalance.updatedAt = new Date();
      this.balances.set(baseToken, baseBalance);
    } else {
      // Deduct base token, add quote token
      const baseBalance = this.balances.get(baseToken);
      if (baseBalance) {
        baseBalance.available = Math.max(0, baseBalance.available - order.filledQuantity);
        baseBalance.total = Math.max(0, baseBalance.total - order.filledQuantity);
        baseBalance.updatedAt = new Date();
      }

      const quoteReceived = order.filledQuantity * order.averageFilledPrice - order.fees;
      const quoteBalance = this.balances.get(quoteToken) ?? {
        token: quoteToken,
        available: 0,
        reserved: 0,
        total: 0,
        updatedAt: new Date(),
      };
      quoteBalance.available += quoteReceived;
      quoteBalance.total += quoteReceived;
      quoteBalance.updatedAt = new Date();
      this.balances.set(quoteToken, quoteBalance);
    }
  }
}

// ============================================================================
// Connector Registry
// ============================================================================

/**
 * ConnectorRegistry manages all exchange connectors, providing a unified interface
 * for connecting to multiple liquidity venues simultaneously.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, BaseExchangeConnector>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];

  onEvent(callback: LiveTradingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private forwardEvent(event: LiveTradingEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  register(connector: BaseExchangeConnector): void {
    this.connectors.set(connector.config.exchangeId, connector);
    connector.onEvent(this.forwardEvent.bind(this));
  }

  unregister(exchangeId: string): void {
    this.connectors.delete(exchangeId);
  }

  get(exchangeId: string): BaseExchangeConnector | undefined {
    return this.connectors.get(exchangeId);
  }

  getAll(): BaseExchangeConnector[] {
    return Array.from(this.connectors.values());
  }

  getConnected(): BaseExchangeConnector[] {
    return this.getAll().filter(c => c.status === 'connected');
  }

  async connectAll(): Promise<ConnectAllResult> {
    const results: ConnectAllResult = { connected: [], failed: [] };

    await Promise.allSettled(
      this.getAll().map(async (connector) => {
        try {
          await connector.connect();
          results.connected.push(connector.config.exchangeId);
        } catch (error) {
          results.failed.push({
            exchangeId: connector.config.exchangeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    return results;
  }

  async disconnectAll(): Promise<void> {
    await Promise.allSettled(
      this.getConnected().map(connector => connector.disconnect())
    );
  }

  getStatus(): ConnectorRegistryStatus {
    const all = this.getAll();
    const connected = this.getConnected();
    return {
      total: all.length,
      connected: connected.length,
      disconnected: all.filter(c => c.status === 'disconnected').length,
      errored: all.filter(c => c.status === 'error').length,
      connectors: all.map(c => ({
        exchangeId: c.config.exchangeId,
        name: c.config.name,
        type: c.config.type,
        status: c.status,
      })),
    };
  }
}

export interface ConnectAllResult {
  connected: string[];
  failed: Array<{ exchangeId: string; error: string }>;
}

export interface ConnectorRegistryStatus {
  total: number;
  connected: number;
  disconnected: number;
  errored: number;
  connectors: Array<{
    exchangeId: string;
    name: string;
    type: string;
    status: ExchangeStatus;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exchangeId: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createSimulatedConnector(
  config: ExchangeConnectorConfig,
  initialBalances?: ExchangeBalance[]
): SimulatedExchangeConnector {
  return new SimulatedExchangeConnector(config, initialBalances);
}

export function createConnectorRegistry(): ConnectorRegistry {
  return new ConnectorRegistry();
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Export order status helper
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === 'filled' || status === 'cancelled' || status === 'expired' || status === 'rejected';
}
