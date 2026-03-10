/**
 * TONAIAgent - Market Data Integration Layer
 *
 * Provides real-time market data feeds for AI agents:
 *   - Price feeds from multiple exchanges
 *   - Order book snapshots
 *   - Trade history
 *   - Volatility metrics
 *
 * Data sources:
 *   - DEX price oracles (on-chain)
 *   - CEX REST/WebSocket APIs
 *   - On-chain liquidity analytics
 */

import {
  PriceFeed,
  OrderBookSnapshot,
  OrderBookLevel,
  TradeHistory,
  VolatilityMetrics,
  MarketDataSubscription,
  MarketDataFeedType,
  LiveTradingEvent,
  LiveTradingEventCallback,
} from './types';

// ============================================================================
// Market Data Service Interface
// ============================================================================

export interface MarketDataService {
  getPrice(symbol: string, exchangeId?: string): Promise<PriceFeed>;
  getOrderBook(symbol: string, depth?: number, exchangeId?: string): Promise<OrderBookSnapshot>;
  getTradeHistory(symbol: string, limit?: number, exchangeId?: string): Promise<TradeHistory[]>;
  getVolatility(symbol: string, period: VolatilityMetrics['period']): Promise<VolatilityMetrics>;
  subscribe(
    feedType: MarketDataFeedType,
    symbol: string,
    callback: MarketDataSubscription['callback'],
    exchangeId?: string
  ): MarketDataSubscription;
  unsubscribe(subscriptionId: string): void;
  getActiveSubscriptions(): MarketDataSubscription[];
  onEvent(callback: LiveTradingEventCallback): void;
}

// ============================================================================
// Market Data Service Configuration
// ============================================================================

export interface MarketDataServiceConfig {
  /** Price polling interval in milliseconds */
  pricePollingIntervalMs: number;
  /** Order book depth */
  orderBookDepth: number;
  /** Trade history window in minutes */
  tradeHistoryWindowMinutes: number;
  /** Whether to enable caching */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTtlSeconds: number;
}

const DEFAULT_CONFIG: MarketDataServiceConfig = {
  pricePollingIntervalMs: 5000,
  orderBookDepth: 20,
  tradeHistoryWindowMinutes: 60,
  enableCache: true,
  cacheTtlSeconds: 5,
};

// ============================================================================
// Default Market Data Service (Simulated)
// ============================================================================

/**
 * DefaultMarketDataService provides simulated market data for testing and
 * development. In production, this would be backed by real exchange APIs
 * or price oracles.
 */
export class DefaultMarketDataService implements MarketDataService {
  private readonly config: MarketDataServiceConfig;
  private readonly subscriptions = new Map<string, MarketDataSubscription>();
  private readonly priceCache = new Map<string, { data: PriceFeed; expiresAt: number }>();
  private readonly eventCallbacks: LiveTradingEventCallback[] = [];
  private subscriptionCounter = 0;
  private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  // Simulated base prices for known tokens
  private readonly basePrices: Record<string, number> = {
    'TON/USDT': 5.25,
    'BTC/USDT': 67000,
    'ETH/USDT': 3500,
    'USDT/TON': 0.19,
    'NOT/USDT': 0.008,
    'DOGS/USDT': 0.0012,
  };

  constructor(config: Partial<MarketDataServiceConfig> = {}) {
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

  async getPrice(symbol: string, exchangeId?: string): Promise<PriceFeed> {
    const cacheKey = `price:${symbol}:${exchangeId ?? 'default'}`;

    if (this.config.enableCache) {
      const cached = this.priceCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    const feed = this.generateSimulatedPrice(symbol, exchangeId ?? 'simulated');

    if (this.config.enableCache) {
      this.priceCache.set(cacheKey, {
        data: feed,
        expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
      });
    }

    this.emitEvent({
      type: 'market_data.updated',
      exchangeId,
      data: { feedType: 'price', symbol, price: feed.price },
      severity: 'info',
    });

    return feed;
  }

  async getOrderBook(symbol: string, depth?: number, exchangeId?: string): Promise<OrderBookSnapshot> {
    const bookDepth = depth ?? this.config.orderBookDepth;
    const basePrice = this.getBasePrice(symbol);
    const spread = basePrice * 0.001; // 0.1% spread

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < bookDepth; i++) {
      const bidPrice = basePrice - spread * (i + 1);
      const askPrice = basePrice + spread * (i + 1);
      const quantity = Math.random() * 100 + 10;

      bidTotal += bidPrice * quantity;
      askTotal += askPrice * quantity;

      bids.push({ price: bidPrice, quantity, total: bidTotal });
      asks.push({ price: askPrice, quantity, total: askTotal });
    }

    return {
      symbol,
      exchangeId: exchangeId ?? 'simulated',
      bids,
      asks,
      timestamp: new Date(),
    };
  }

  async getTradeHistory(symbol: string, limit?: number, exchangeId?: string): Promise<TradeHistory[]> {
    const count = Math.min(limit ?? 50, 200);
    const basePrice = this.getBasePrice(symbol);
    const now = Date.now();
    const trades: TradeHistory[] = [];

    for (let i = 0; i < count; i++) {
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
      trades.push({
        symbol,
        exchangeId: exchangeId ?? 'simulated',
        tradeId: `trade_${i}_${now}`,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: basePrice * (1 + priceVariation),
        quantity: Math.random() * 50 + 1,
        timestamp: new Date(now - i * 60000), // 1 minute apart
      });
    }

    return trades;
  }

  async getVolatility(symbol: string, period: VolatilityMetrics['period']): Promise<VolatilityMetrics> {
    const basePrice = this.getBasePrice(symbol);

    // Simulated volatility metrics
    const volatilityMap: Record<VolatilityMetrics['period'], number> = {
      '1h': 0.015,
      '4h': 0.025,
      '24h': 0.04,
      '7d': 0.08,
      '30d': 0.15,
    };

    const volatility = volatilityMap[period] ?? 0.04;
    const priceRange = {
      high: basePrice * (1 + volatility),
      low: basePrice * (1 - volatility),
    };

    return {
      symbol,
      period,
      volatility,
      averageVolume: basePrice * 1000000, // Simulated daily volume
      priceRange,
      atr: basePrice * volatility * 0.5, // Average True Range
      updatedAt: new Date(),
    };
  }

  subscribe(
    feedType: MarketDataFeedType,
    symbol: string,
    callback: MarketDataSubscription['callback'],
    exchangeId?: string
  ): MarketDataSubscription {
    const id = `sub_${++this.subscriptionCounter}_${Date.now()}`;

    const subscription: MarketDataSubscription = {
      id,
      feedType,
      symbol,
      exchangeId,
      callback,
      active: true,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, subscription);

    // Set up polling for the subscription
    const interval = setInterval(async () => {
      if (!subscription.active) {
        clearInterval(interval);
        return;
      }

      try {
        let data: PriceFeed | OrderBookSnapshot | TradeHistory | VolatilityMetrics;

        switch (feedType) {
          case 'price':
            data = await this.getPrice(symbol, exchangeId);
            break;
          case 'orderbook':
            data = await this.getOrderBook(symbol, undefined, exchangeId);
            break;
          case 'trades': {
            const trades = await this.getTradeHistory(symbol, 1, exchangeId);
            data = trades[0]!;
            break;
          }
          case 'volatility':
            data = await this.getVolatility(symbol, '1h');
            break;
        }

        if (data) {
          callback(data);
        }
      } catch {
        // Ignore errors during subscription polling
      }
    }, this.config.pricePollingIntervalMs);

    this.pollingIntervals.set(id, interval);
    return subscription;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
    }

    const interval = this.pollingIntervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
  }

  getActiveSubscriptions(): MarketDataSubscription[] {
    return Array.from(this.subscriptions.values()).filter(s => s.active);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getBasePrice(symbol: string): number {
    return this.basePrices[symbol] ?? 1.0;
  }

  private generateSimulatedPrice(symbol: string, exchangeId: string): PriceFeed {
    const basePrice = this.getBasePrice(symbol);

    // Add small random variation to simulate live prices
    const variation = (Math.random() - 0.5) * 0.01; // ±0.5%
    const price = basePrice * (1 + variation);
    const spread = price * 0.001;

    return {
      symbol,
      exchangeId,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      spread,
      volume24h: basePrice * 1000000 * (0.8 + Math.random() * 0.4),
      change24h: basePrice * (Math.random() - 0.5) * 0.05,
      changePercent24h: (Math.random() - 0.5) * 5,
      timestamp: new Date(),
    };
  }

  /** Stop all polling intervals (cleanup) */
  destroy(): void {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
    for (const sub of this.subscriptions.values()) {
      sub.active = false;
    }
    this.subscriptions.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarketDataService(
  config?: Partial<MarketDataServiceConfig>
): DefaultMarketDataService {
  return new DefaultMarketDataService(config);
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
