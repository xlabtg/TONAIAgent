/**
 * TONAIAgent - Market Data Module
 *
 * Collects and provides real-time market data including price feeds,
 * volatility metrics, order books, liquidity, and derivatives data.
 */

import {
  MarketDataConfig,
  MarketDataProvider,
  PriceFeed,
  OHLCV,
  OrderBook,
  OrderBookLevel,
  TradeData,
  VolatilityMetrics,
  LiquidityMetrics,
  DerivativesData,
  DataPlatformEvent,
  DataPlatformEventCallback,
} from './types';

// Re-export types for API consumers
export type { OrderBookDepth, CacheConfig } from './types';

// ============================================================================
// Market Data Service
// ============================================================================

export interface MarketDataService {
  // Price feeds
  getPrice(pair: string): Promise<PriceFeed | undefined>;
  getPrices(pairs: string[]): Promise<Map<string, PriceFeed>>;
  subscribeToPrice(pair: string, callback: PriceCallback): Subscription;
  getHistoricalPrices(pair: string, params: HistoricalPriceParams): Promise<OHLCV[]>;

  // Order book
  getOrderBook(pair: string, depth?: number): Promise<OrderBook>;
  subscribeToOrderBook(pair: string, callback: OrderBookCallback): Subscription;

  // Trades
  getRecentTrades(pair: string, limit?: number): Promise<TradeData[]>;
  subscribeToTrades(pair: string, callback: TradeCallback): Subscription;

  // Volatility
  getVolatility(pair: string, period?: VolatilityPeriod): Promise<VolatilityMetrics>;
  getVolatilityHistory(pair: string, params: VolatilityHistoryParams): Promise<VolatilityMetrics[]>;

  // Liquidity
  getLiquidity(pair: string): Promise<LiquidityMetrics>;
  getSlippage(pair: string, size: number, side: 'buy' | 'sell'): Promise<SlippageEstimate>;

  // Derivatives
  getDerivatives(pair: string): Promise<DerivativesData | undefined>;
  getFundingRates(pairs?: string[]): Promise<FundingRate[]>;
  getLiquidations(pair: string, period?: '1h' | '24h'): Promise<LiquidationData>;

  // Analytics
  getMarketSummary(): Promise<MarketSummary>;
  getTopGainers(limit?: number): Promise<PriceFeed[]>;
  getTopLosers(limit?: number): Promise<PriceFeed[]>;
  getTopVolume(limit?: number): Promise<PriceFeed[]>;

  // Provider management
  addProvider(provider: MarketDataProvider): void;
  removeProvider(providerId: string): void;
  getProviderStatus(providerId: string): ProviderStatus;

  // Configuration
  configure(config: Partial<MarketDataConfig>): void;

  // Events
  onEvent(callback: DataPlatformEventCallback): void;
}

// ============================================================================
// Additional Types
// ============================================================================

export type VolatilityPeriod = '1h' | '4h' | '24h' | '7d' | '30d';

export interface HistoricalPriceParams {
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  startTime: Date;
  endTime: Date;
  limit?: number;
}

export interface VolatilityHistoryParams {
  period: VolatilityPeriod;
  startTime: Date;
  endTime: Date;
  granularity: 'hourly' | 'daily';
}

export interface SlippageEstimate {
  pair: string;
  side: 'buy' | 'sell';
  size: number;
  estimatedPrice: number;
  midPrice: number;
  slippageBps: number;
  slippagePercent: number;
  impactCost: number;
  executionProbability: number;
}

export interface FundingRate {
  pair: string;
  rate: number;
  predictedRate: number;
  nextFundingTime: Date;
  annualizedRate: number;
}

export interface LiquidationData {
  pair: string;
  period: string;
  totalLiquidations: number;
  longLiquidations: number;
  shortLiquidations: number;
  totalVolume: number;
  longVolume: number;
  shortVolume: number;
  largestLiquidation: number;
  averageLiquidation: number;
}

export interface MarketSummary {
  timestamp: Date;
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  fearGreedIndex: number;
  activeMarkets: number;
  topGainer: PriceFeed;
  topLoser: PriceFeed;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
}

export interface ProviderStatus {
  providerId: string;
  name: string;
  connected: boolean;
  latencyMs: number;
  lastUpdate: Date;
  errors24h: number;
  uptime: number;
}

export interface Subscription {
  id: string;
  unsubscribe: () => void;
}

export type PriceCallback = (price: PriceFeed) => void;
export type OrderBookCallback = (orderBook: OrderBook) => void;
export type TradeCallback = (trade: TradeData) => void;

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMarketDataService implements MarketDataService {
  private config: MarketDataConfig;
  private readonly providers: Map<string, MarketDataProvider> = new Map();
  private readonly priceCache: Map<string, PriceFeed> = new Map();
  private readonly subscriptions: Map<string, SubscriptionInternal> = new Map();
  private readonly eventCallbacks: DataPlatformEventCallback[] = [];
  private updateInterval?: NodeJS.Timeout;

  constructor(config?: Partial<MarketDataConfig>) {
    this.config = {
      providers: config?.providers ?? [],
      updateInterval: config?.updateInterval ?? 1000,
      cacheConfig: config?.cacheConfig ?? {
        enabled: true,
        ttlSeconds: 5,
        maxSize: 1000,
        evictionPolicy: 'lru',
      },
      alertsEnabled: config?.alertsEnabled ?? true,
    };

    this.initializeDefaultProviders();
    this.initializeMockPrices();
    this.startPriceUpdates();
  }

  // Price Feeds
  async getPrice(pair: string): Promise<PriceFeed | undefined> {
    return this.priceCache.get(pair.toUpperCase());
  }

  async getPrices(pairs: string[]): Promise<Map<string, PriceFeed>> {
    const result = new Map<string, PriceFeed>();
    for (const pair of pairs) {
      const price = await this.getPrice(pair);
      if (price) {
        result.set(pair.toUpperCase(), price);
      }
    }
    return result;
  }

  subscribeToPrice(pair: string, callback: PriceCallback): Subscription {
    const id = `price_sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const normalizedPair = pair.toUpperCase();

    this.subscriptions.set(id, {
      id,
      type: 'price',
      pair: normalizedPair,
      callback,
    });

    return {
      id,
      unsubscribe: () => this.subscriptions.delete(id),
    };
  }

  async getHistoricalPrices(pair: string, params: HistoricalPriceParams): Promise<OHLCV[]> {
    const result: OHLCV[] = [];
    const intervalMs = this.getIntervalMs(params.interval);
    let timestamp = params.startTime.getTime();
    const endTimestamp = params.endTime.getTime();
    const limit = params.limit ?? 1000;

    let basePrice = this.getBasePriceForPair(pair);
    let count = 0;

    while (timestamp < endTimestamp && count < limit) {
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility * basePrice;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 10000000 + 100000;

      result.push({
        timestamp: new Date(timestamp),
        open,
        high,
        low,
        close,
        volume,
      });

      basePrice = close;
      timestamp += intervalMs;
      count++;
    }

    return result;
  }

  // Order Book
  async getOrderBook(pair: string, depth = 20): Promise<OrderBook> {
    const price = await this.getPrice(pair);
    const midPrice = price?.price ?? 100;
    const spread = midPrice * 0.001; // 0.1% spread

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < depth; i++) {
      const bidPrice = midPrice - spread / 2 - (i * midPrice * 0.0001);
      const bidQuantity = Math.random() * 10000 + 1000;
      bidTotal += bidQuantity * bidPrice;
      bids.push({ price: bidPrice, quantity: bidQuantity, total: bidTotal });

      const askPrice = midPrice + spread / 2 + (i * midPrice * 0.0001);
      const askQuantity = Math.random() * 10000 + 1000;
      askTotal += askQuantity * askPrice;
      asks.push({ price: askPrice, quantity: askQuantity, total: askTotal });
    }

    const bidLiquidity = bids.reduce((sum, b) => sum + b.quantity * b.price, 0);
    const askLiquidity = asks.reduce((sum, a) => sum + a.quantity * a.price, 0);
    const imbalance = (bidLiquidity - askLiquidity) / (bidLiquidity + askLiquidity);

    return {
      pair: pair.toUpperCase(),
      bids,
      asks,
      spread,
      midPrice,
      timestamp: new Date(),
      depth: {
        bidLiquidity,
        askLiquidity,
        imbalance,
      },
    };
  }

  subscribeToOrderBook(pair: string, callback: OrderBookCallback): Subscription {
    const id = `ob_sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const normalizedPair = pair.toUpperCase();

    this.subscriptions.set(id, {
      id,
      type: 'orderbook',
      pair: normalizedPair,
      callback,
    });

    return {
      id,
      unsubscribe: () => this.subscriptions.delete(id),
    };
  }

  // Trades
  async getRecentTrades(pair: string, limit = 100): Promise<TradeData[]> {
    const price = await this.getPrice(pair);
    const basePrice = price?.price ?? 100;
    const trades: TradeData[] = [];
    const now = Date.now();

    for (let i = 0; i < limit; i++) {
      const priceVariation = basePrice * (1 + (Math.random() - 0.5) * 0.002);
      const quantity = Math.random() * 1000 + 10;
      trades.push({
        id: `trade_${now}_${i}`,
        pair: pair.toUpperCase(),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        price: priceVariation,
        quantity,
        value: priceVariation * quantity,
        timestamp: new Date(now - i * 1000),
        maker: Math.random() > 0.5,
      });
    }

    return trades;
  }

  subscribeToTrades(pair: string, callback: TradeCallback): Subscription {
    const id = `trade_sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const normalizedPair = pair.toUpperCase();

    this.subscriptions.set(id, {
      id,
      type: 'trades',
      pair: normalizedPair,
      callback,
    });

    return {
      id,
      unsubscribe: () => this.subscriptions.delete(id),
    };
  }

  // Volatility
  async getVolatility(pair: string, period: VolatilityPeriod = '24h'): Promise<VolatilityMetrics> {
    const multipliers: Record<VolatilityPeriod, number> = {
      '1h': 0.3,
      '4h': 0.5,
      '24h': 1,
      '7d': 2.5,
      '30d': 5,
    };

    const baseVolatility = 0.05 + Math.random() * 0.15;
    const volatility = baseVolatility * multipliers[period];

    let regime: 'low' | 'normal' | 'high' | 'extreme';
    if (volatility < 0.05) regime = 'low';
    else if (volatility < 0.15) regime = 'normal';
    else if (volatility < 0.3) regime = 'high';
    else regime = 'extreme';

    return {
      pair: pair.toUpperCase(),
      period,
      volatility,
      atr: volatility * 0.7,
      standardDeviation: volatility * 0.8,
      percentile: Math.random() * 100,
      regime,
    };
  }

  async getVolatilityHistory(
    pair: string,
    params: VolatilityHistoryParams
  ): Promise<VolatilityMetrics[]> {
    const result: VolatilityMetrics[] = [];
    const intervalMs = params.granularity === 'hourly' ? 3600000 : 86400000;
    let timestamp = params.startTime.getTime();
    const endTimestamp = params.endTime.getTime();

    while (timestamp < endTimestamp) {
      const vol = await this.getVolatility(pair, params.period);
      result.push({
        ...vol,
        // Add timestamp reference (not in original type but useful)
      });
      timestamp += intervalMs;
    }

    return result;
  }

  // Liquidity
  async getLiquidity(pair: string): Promise<LiquidityMetrics> {
    const orderBook = await this.getOrderBook(pair, 50);
    const midPrice = orderBook.midPrice;

    // Calculate depth at different levels
    const depth1Percent = this.calculateDepthAtLevel(orderBook, midPrice, 0.01);
    const depth2Percent = this.calculateDepthAtLevel(orderBook, midPrice, 0.02);

    // Estimate slippage
    const slippage1k = await this.estimateSlippage(pair, 1000);
    const slippage10k = await this.estimateSlippage(pair, 10000);
    const slippage100k = await this.estimateSlippage(pair, 100000);

    // Calculate liquidity score
    const score = Math.min(
      100,
      (depth1Percent / 100000) * 30 +
        (depth2Percent / 500000) * 30 +
        (100 - slippage1k * 100) * 0.2 +
        (100 - slippage10k * 100) * 0.1 +
        (100 - slippage100k * 100) * 0.1
    );

    return {
      pair: pair.toUpperCase(),
      spreadBps: (orderBook.spread / midPrice) * 10000,
      depth1Percent,
      depth2Percent,
      slippage1k,
      slippage10k,
      slippage100k,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  async getSlippage(pair: string, size: number, side: 'buy' | 'sell'): Promise<SlippageEstimate> {
    const orderBook = await this.getOrderBook(pair, 100);
    const levels = side === 'buy' ? orderBook.asks : orderBook.bids;

    let remainingSize = size;
    let totalCost = 0;
    let executedQuantity = 0;

    for (const level of levels) {
      const fillSize = Math.min(remainingSize, level.quantity);
      totalCost += fillSize * level.price;
      executedQuantity += fillSize;
      remainingSize -= fillSize;

      if (remainingSize <= 0) break;
    }

    const avgPrice = executedQuantity > 0 ? totalCost / executedQuantity : orderBook.midPrice;
    const slippageBps = Math.abs(avgPrice - orderBook.midPrice) / orderBook.midPrice * 10000;

    return {
      pair: pair.toUpperCase(),
      side,
      size,
      estimatedPrice: avgPrice,
      midPrice: orderBook.midPrice,
      slippageBps,
      slippagePercent: slippageBps / 100,
      impactCost: Math.abs(avgPrice - orderBook.midPrice) * size,
      executionProbability: remainingSize <= 0 ? 1 : executedQuantity / size,
    };
  }

  // Derivatives
  async getDerivatives(pair: string): Promise<DerivativesData | undefined> {
    const price = await this.getPrice(pair);
    if (!price) return undefined;

    const indexPrice = price.price * (1 + (Math.random() - 0.5) * 0.001);
    const markPrice = price.price * (1 + (Math.random() - 0.5) * 0.0005);

    return {
      pair: pair.toUpperCase(),
      openInterest: Math.random() * 100000000 + 10000000,
      fundingRate: (Math.random() - 0.5) * 0.001,
      nextFundingTime: new Date(Date.now() + (8 - (Date.now() % 28800000) / 3600000) * 3600000),
      markPrice,
      indexPrice,
      longShortRatio: 0.5 + Math.random() * 0.5,
      liquidations24h: Math.floor(Math.random() * 1000) + 100,
      liquidationVolume24h: Math.random() * 10000000,
    };
  }

  async getFundingRates(pairs?: string[]): Promise<FundingRate[]> {
    const targetPairs = pairs ?? ['BTC/USDT', 'ETH/USDT', 'TON/USDT', 'SOL/USDT'];
    const rates: FundingRate[] = [];

    for (const pair of targetPairs) {
      const rate = (Math.random() - 0.5) * 0.001;
      rates.push({
        pair: pair.toUpperCase(),
        rate,
        predictedRate: rate * (1 + (Math.random() - 0.5) * 0.2),
        nextFundingTime: new Date(Date.now() + Math.random() * 28800000),
        annualizedRate: rate * 3 * 365 * 100,
      });
    }

    return rates;
  }

  async getLiquidations(pair: string, period: '1h' | '24h' = '24h'): Promise<LiquidationData> {
    const multiplier = period === '24h' ? 24 : 1;
    const totalLiquidations = Math.floor(Math.random() * 500 * multiplier) + 50 * multiplier;
    const longRatio = Math.random();

    return {
      pair: pair.toUpperCase(),
      period,
      totalLiquidations,
      longLiquidations: Math.floor(totalLiquidations * longRatio),
      shortLiquidations: Math.floor(totalLiquidations * (1 - longRatio)),
      totalVolume: Math.random() * 10000000 * multiplier,
      longVolume: Math.random() * 5000000 * multiplier,
      shortVolume: Math.random() * 5000000 * multiplier,
      largestLiquidation: Math.random() * 1000000,
      averageLiquidation: Math.random() * 50000 + 10000,
    };
  }

  // Analytics
  async getMarketSummary(): Promise<MarketSummary> {
    const prices = Array.from(this.priceCache.values());
    const sorted = prices.sort((a, b) => b.change24h - a.change24h);

    const totalVolume = prices.reduce((sum, p) => sum + p.volume24h, 0);
    const avgChange = prices.reduce((sum, p) => sum + p.change24h, 0) / prices.length;

    let trend: 'bullish' | 'bearish' | 'neutral';
    if (avgChange > 2) trend = 'bullish';
    else if (avgChange < -2) trend = 'bearish';
    else trend = 'neutral';

    return {
      timestamp: new Date(),
      totalMarketCap: 2500000000000 + Math.random() * 100000000000,
      totalVolume24h: totalVolume,
      btcDominance: 45 + Math.random() * 10,
      ethDominance: 15 + Math.random() * 5,
      fearGreedIndex: Math.floor(Math.random() * 100),
      activeMarkets: prices.length,
      topGainer: sorted[0],
      topLoser: sorted[sorted.length - 1],
      marketTrend: trend,
    };
  }

  async getTopGainers(limit = 10): Promise<PriceFeed[]> {
    return Array.from(this.priceCache.values())
      .sort((a, b) => b.change24h - a.change24h)
      .slice(0, limit);
  }

  async getTopLosers(limit = 10): Promise<PriceFeed[]> {
    return Array.from(this.priceCache.values())
      .sort((a, b) => a.change24h - b.change24h)
      .slice(0, limit);
  }

  async getTopVolume(limit = 10): Promise<PriceFeed[]> {
    return Array.from(this.priceCache.values())
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
  }

  // Provider management
  addProvider(provider: MarketDataProvider): void {
    this.providers.set(provider.id, provider);
    this.emitEvent('data_ingested', 'ingestion', {
      action: 'provider_added',
      providerId: provider.id,
      name: provider.name,
    });
  }

  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  getProviderStatus(providerId: string): ProviderStatus {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    return {
      providerId,
      name: provider.name,
      connected: Math.random() > 0.1,
      latencyMs: Math.floor(Math.random() * 50) + 10,
      lastUpdate: new Date(),
      errors24h: Math.floor(Math.random() * 5),
      uptime: 99 + Math.random(),
    };
  }

  configure(config: Partial<MarketDataConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.updateInterval && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.startPriceUpdates();
    }
  }

  onEvent(callback: DataPlatformEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeDefaultProviders(): void {
    const defaultProviders: MarketDataProvider[] = [
      {
        id: 'binance',
        name: 'Binance',
        type: 'exchange',
        endpoint: 'wss://stream.binance.com:9443',
        priority: 1,
        supportedPairs: ['BTC/USDT', 'ETH/USDT', 'TON/USDT'],
      },
      {
        id: 'coinbase',
        name: 'Coinbase',
        type: 'exchange',
        endpoint: 'wss://ws-feed.exchange.coinbase.com',
        priority: 2,
        supportedPairs: ['BTC/USD', 'ETH/USD'],
      },
      {
        id: 'coingecko',
        name: 'CoinGecko',
        type: 'aggregator',
        endpoint: 'https://api.coingecko.com/api/v3',
        priority: 3,
        supportedPairs: [],
      },
    ];

    for (const provider of defaultProviders) {
      this.providers.set(provider.id, provider);
    }
  }

  private initializeMockPrices(): void {
    const pairs: Array<{ pair: string; basePrice: number }> = [
      { pair: 'BTC/USDT', basePrice: 65000 },
      { pair: 'ETH/USDT', basePrice: 3500 },
      { pair: 'TON/USDT', basePrice: 5.5 },
      { pair: 'SOL/USDT', basePrice: 150 },
      { pair: 'STON/USDT', basePrice: 0.15 },
      { pair: 'BNB/USDT', basePrice: 550 },
      { pair: 'XRP/USDT', basePrice: 0.55 },
      { pair: 'DOGE/USDT', basePrice: 0.12 },
      { pair: 'ADA/USDT', basePrice: 0.45 },
      { pair: 'AVAX/USDT', basePrice: 35 },
    ];

    for (const { pair, basePrice } of pairs) {
      this.updatePrice(pair, basePrice);
    }
  }

  private startPriceUpdates(): void {
    this.updateInterval = setInterval(() => {
      for (const [pair, feed] of this.priceCache) {
        const change = (Math.random() - 0.5) * feed.price * 0.002;
        this.updatePrice(pair, feed.price + change);
      }
    }, this.config.updateInterval);
  }

  private updatePrice(pair: string, price: number): void {
    const normalizedPair = pair.toUpperCase();
    const existing = this.priceCache.get(normalizedPair);
    const spread = price * 0.0005;

    const newFeed: PriceFeed = {
      pair: normalizedPair,
      baseAsset: normalizedPair.split('/')[0],
      quoteAsset: normalizedPair.split('/')[1],
      price,
      bid: price - spread,
      ask: price + spread,
      spread: spread * 2,
      volume24h: existing?.volume24h ?? Math.random() * 100000000,
      change24h: existing
        ? ((price - (existing.price / (1 + existing.change24h / 100))) / (existing.price / (1 + existing.change24h / 100))) * 100
        : (Math.random() - 0.5) * 10,
      high24h: existing ? Math.max(existing.high24h, price) : price * 1.02,
      low24h: existing ? Math.min(existing.low24h, price) : price * 0.98,
      timestamp: new Date(),
      source: 'aggregator',
      confidence: 0.95 + Math.random() * 0.05,
    };

    this.priceCache.set(normalizedPair, newFeed);

    // Notify subscribers
    for (const sub of this.subscriptions.values()) {
      if (sub.type === 'price' && sub.pair === normalizedPair) {
        try {
          (sub.callback as PriceCallback)(newFeed);
        } catch {
          // Ignore callback errors
        }
      }
    }
  }

  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
    };
    return intervals[interval] ?? 3600000;
  }

  private getBasePriceForPair(pair: string): number {
    const prices: Record<string, number> = {
      'BTC/USDT': 65000,
      'ETH/USDT': 3500,
      'TON/USDT': 5.5,
      'SOL/USDT': 150,
    };
    return prices[pair.toUpperCase()] ?? 100;
  }

  private calculateDepthAtLevel(orderBook: OrderBook, midPrice: number, level: number): number {
    const bidThreshold = midPrice * (1 - level);
    const askThreshold = midPrice * (1 + level);

    const bidDepth = orderBook.bids
      .filter((b) => b.price >= bidThreshold)
      .reduce((sum, b) => sum + b.quantity * b.price, 0);

    const askDepth = orderBook.asks
      .filter((a) => a.price <= askThreshold)
      .reduce((sum, a) => sum + a.quantity * a.price, 0);

    return bidDepth + askDepth;
  }

  private async estimateSlippage(pair: string, size: number): Promise<number> {
    const estimate = await this.getSlippage(pair, size, 'buy');
    return estimate.slippagePercent;
  }

  private emitEvent(
    type: DataPlatformEvent['type'],
    category: DataPlatformEvent['category'],
    data: Record<string, unknown>
  ): void {
    const event: DataPlatformEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      type,
      category,
      data,
      source: 'market-data-service',
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

interface SubscriptionInternal {
  id: string;
  type: 'price' | 'orderbook' | 'trades';
  pair: string;
  callback: PriceCallback | OrderBookCallback | TradeCallback;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMarketDataService(
  config?: Partial<MarketDataConfig>
): DefaultMarketDataService {
  return new DefaultMarketDataService(config);
}
