/**
 * TONAIAgent - Market Data Streaming Layer (Issue #251)
 *
 * Real-time market data streaming with subscription model.
 * Enables strategies, UI components, and execution engines to subscribe to
 * live price updates without polling.
 *
 * Architecture:
 * ```
 *   DEX / Data Source
 *         |
 *   Market Data Service (polling)
 *         |
 *   MarketDataStream (this module)
 *         |
 *   ┌─────┼────────────────┐
 *   │     │                │
 * Strategies   UI (Telegram)   Execution Engine
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createMarketDataStream } from '@tonaiagent/core/market-data';
 *
 * const stream = createMarketDataStream();
 * stream.start();
 *
 * // Subscribe to all price updates
 * const unsub = stream.subscribe((event) => {
 *   console.log(`${event.asset}: $${event.price}`);
 * });
 *
 * // Subscribe to specific pair
 * const unsub2 = stream.subscribeToPair('TON/USDT', (event) => {
 *   console.log(`TON/USDT: $${event.price}`);
 * });
 *
 * // Get latest cached price
 * const price = stream.getLatestPrice('TON');
 *
 * // Unsubscribe when done
 * unsub();
 * unsub2();
 * stream.stop();
 * ```
 *
 * @see Issue #251 — Real-Time Market Data + Streaming
 */

import type { NormalizedPrice, MarketDataSnapshot } from './types';

// ============================================================================
// Streaming Types
// ============================================================================

/**
 * A real-time price tick event emitted by the stream.
 * Contains the latest price for a single asset.
 */
export interface PriceTick {
  /** Asset symbol (e.g., "TON", "BTC") */
  asset: string;
  /** Current price in USD */
  price: number;
  /** 24-hour trading volume in USD */
  volume24h: number;
  /** Price change percentage over 24 hours */
  priceChange24h: number;
  /** Derived pair identifier (e.g., "TON/USDT") */
  pair: string;
  /** Data source that produced this tick */
  source: string;
  /** Timestamp of this tick */
  timestamp: Date;
  /** Whether this is a simulated/baseline tick or live data */
  isSimulated: boolean;
}

/**
 * Events emitted by the MarketDataStream.
 */
export type MarketDataStreamEventType =
  | 'stream.started'
  | 'stream.stopped'
  | 'price.tick'
  | 'snapshot.updated'
  | 'subscription.added'
  | 'subscription.removed'
  | 'error';

/**
 * Event emitted by the MarketDataStream.
 */
export interface MarketDataStreamEvent {
  /** Event type */
  type: MarketDataStreamEventType;
  /** Timestamp */
  timestamp: Date;
  /** Affected asset (if applicable) */
  asset?: string;
  /** Event-specific payload */
  data: Record<string, unknown>;
}

/**
 * Handler for stream events.
 */
export type MarketDataStreamEventHandler = (event: MarketDataStreamEvent) => void;

/**
 * Handler for price tick events.
 */
export type PriceTickHandler = (tick: PriceTick) => void;

/**
 * Unsubscribe function returned by subscribe calls.
 */
export type StreamUnsubscribe = () => void;

/**
 * Configuration for the MarketDataStream.
 */
export interface MarketDataStreamConfig {
  /**
   * Polling interval in milliseconds.
   * How often to fetch new prices from the underlying data source.
   * Default: 1000ms (1 second) for sub-second update experience.
   */
  pollingIntervalMs: number;
  /**
   * Quote currency for pairs (e.g., "USDT").
   * Used to derive pair names like "TON/USDT".
   * Default: "USDT"
   */
  quoteCurrency: string;
  /**
   * Whether to emit a price tick even if the price hasn't changed.
   * Default: false (only emit on changes or first tick).
   */
  emitOnUnchanged: boolean;
  /**
   * Maximum number of cached ticks per asset.
   * Used for recent history (e.g., mini-charts).
   * Default: 100
   */
  maxTickHistory: number;
  /**
   * Minimum price change threshold (as fraction) to emit a tick.
   * Ignored when emitOnUnchanged is true.
   * Default: 0 (emit any change)
   */
  minChangeThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_STREAM_CONFIG: MarketDataStreamConfig = {
  pollingIntervalMs: 1000,
  quoteCurrency: 'USDT',
  emitOnUnchanged: false,
  maxTickHistory: 100,
  minChangeThreshold: 0,
};

// ============================================================================
// MarketDataStream
// ============================================================================

/**
 * MarketDataStream — real-time price streaming with subscription model.
 *
 * This class sits on top of the market data polling layer and converts
 * periodic snapshots into a continuous stream of price ticks.
 * Strategies and UI components subscribe to get live price updates.
 *
 * Key capabilities:
 * - Subscribe to all asset prices or a specific pair
 * - Event-driven: no polling needed by consumers
 * - Maintains latest-price cache for instant reads
 * - Tick history for charting (configurable size)
 * - Automatic change detection (avoids redundant events)
 *
 * @example
 * ```typescript
 * const stream = createMarketDataStream(snapshotFetcher);
 * stream.start();
 *
 * // Get live TON price
 * stream.subscribeToPair('TON/USDT', (tick) => {
 *   console.log(`TON: $${tick.price} (${tick.priceChange24h > 0 ? '+' : ''}${tick.priceChange24h.toFixed(2)}%)`);
 * });
 * ```
 */
export class MarketDataStream {
  private readonly config: MarketDataStreamConfig;
  private readonly snapshotFetcher: () => Promise<MarketDataSnapshot>;

  // Subscription maps
  private readonly globalHandlers = new Set<PriceTickHandler>();
  private readonly pairHandlers = new Map<string, Set<PriceTickHandler>>();
  private readonly assetHandlers = new Map<string, Set<PriceTickHandler>>();
  private readonly eventHandlers = new Set<MarketDataStreamEventHandler>();

  // State
  private running = false;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly latestPrices = new Map<string, PriceTick>();
  private readonly tickHistory = new Map<string, PriceTick[]>();

  constructor(
    snapshotFetcher: () => Promise<MarketDataSnapshot>,
    config: Partial<MarketDataStreamConfig> = {}
  ) {
    this.snapshotFetcher = snapshotFetcher;
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the stream. Begins polling the data source and emitting price ticks.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.emitStreamEvent('stream.started', {});

    // Fetch immediately then start interval
    this.fetchAndEmit().catch(() => {
      // Errors are emitted as events; don't crash the stream
    });

    this.pollingTimer = setInterval(
      () => {
        this.fetchAndEmit().catch(() => {});
      },
      this.config.pollingIntervalMs
    );
  }

  /**
   * Stop the stream. Clears the polling interval and emits a stopped event.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.emitStreamEvent('stream.stopped', {});
  }

  /**
   * Returns whether the stream is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  /**
   * Subscribe to price ticks for all assets.
   * The handler is called for every price change on any asset.
   *
   * @returns Unsubscribe function
   */
  subscribe(handler: PriceTickHandler): StreamUnsubscribe {
    this.globalHandlers.add(handler);
    this.emitStreamEvent('subscription.added', { scope: 'global' });
    return () => {
      this.globalHandlers.delete(handler);
      this.emitStreamEvent('subscription.removed', { scope: 'global' });
    };
  }

  /**
   * Subscribe to price ticks for a specific trading pair (e.g., "TON/USDT").
   *
   * @param pair - Trading pair in "BASE/QUOTE" format
   * @returns Unsubscribe function
   */
  subscribeToPair(pair: string, handler: PriceTickHandler): StreamUnsubscribe {
    const normalizedPair = pair.toUpperCase();
    if (!this.pairHandlers.has(normalizedPair)) {
      this.pairHandlers.set(normalizedPair, new Set());
    }
    this.pairHandlers.get(normalizedPair)!.add(handler);
    this.emitStreamEvent('subscription.added', { scope: 'pair', pair: normalizedPair });

    // Immediately emit the latest price if available
    const [base] = normalizedPair.split('/');
    if (base) {
      const latest = this.latestPrices.get(base);
      if (latest) {
        try {
          handler(latest);
        } catch {
          // Swallow handler errors
        }
      }
    }

    return () => {
      const handlers = this.pairHandlers.get(normalizedPair);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.pairHandlers.delete(normalizedPair);
        }
      }
      this.emitStreamEvent('subscription.removed', { scope: 'pair', pair: normalizedPair });
    };
  }

  /**
   * Subscribe to price ticks for a specific asset (e.g., "TON").
   *
   * @param asset - Asset symbol
   * @returns Unsubscribe function
   */
  subscribeToAsset(asset: string, handler: PriceTickHandler): StreamUnsubscribe {
    const normalizedAsset = asset.toUpperCase();
    if (!this.assetHandlers.has(normalizedAsset)) {
      this.assetHandlers.set(normalizedAsset, new Set());
    }
    this.assetHandlers.get(normalizedAsset)!.add(handler);
    this.emitStreamEvent('subscription.added', { scope: 'asset', asset: normalizedAsset });

    // Immediately emit the latest price if available
    const latest = this.latestPrices.get(normalizedAsset);
    if (latest) {
      try {
        handler(latest);
      } catch {
        // Swallow handler errors
      }
    }

    return () => {
      const handlers = this.assetHandlers.get(normalizedAsset);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.assetHandlers.delete(normalizedAsset);
        }
      }
      this.emitStreamEvent('subscription.removed', { scope: 'asset', asset: normalizedAsset });
    };
  }

  /**
   * Subscribe to stream lifecycle and error events.
   *
   * @returns Unsubscribe function
   */
  onEvent(handler: MarketDataStreamEventHandler): StreamUnsubscribe {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Price Access (Pull API)
  // ============================================================================

  /**
   * Get the latest cached price for an asset.
   * Returns undefined if no price has been received yet.
   */
  getLatestPrice(asset: string): PriceTick | undefined {
    return this.latestPrices.get(asset.toUpperCase());
  }

  /**
   * Get all latest cached prices (snapshot of current state).
   */
  getAllLatestPrices(): Record<string, PriceTick> {
    const result: Record<string, PriceTick> = {};
    for (const [asset, tick] of this.latestPrices) {
      result[asset] = tick;
    }
    return result;
  }

  /**
   * Get the recent tick history for an asset.
   * Useful for mini-charts and trend visualization.
   */
  getTickHistory(asset: string): PriceTick[] {
    return this.tickHistory.get(asset.toUpperCase()) ?? [];
  }

  /**
   * Returns the count of active subscriptions.
   */
  getSubscriptionCount(): { global: number; pairs: number; assets: number } {
    return {
      global: this.globalHandlers.size,
      pairs: Array.from(this.pairHandlers.values()).reduce((sum, s) => sum + s.size, 0),
      assets: Array.from(this.assetHandlers.values()).reduce((sum, s) => sum + s.size, 0),
    };
  }

  // ============================================================================
  // Internal — Fetch and Emit
  // ============================================================================

  private async fetchAndEmit(): Promise<void> {
    let snapshot: MarketDataSnapshot;

    try {
      snapshot = await this.snapshotFetcher();
    } catch (err) {
      this.emitStreamEvent('error', { error: String(err), operation: 'fetchSnapshot' });
      return;
    }

    // Convert each price in the snapshot to a PriceTick and emit
    for (const [asset, normalizedPrice] of Object.entries(snapshot.prices)) {
      const tick = this.buildTick(asset, normalizedPrice, snapshot);
      const prev = this.latestPrices.get(asset);

      // Determine if we should emit (based on change threshold)
      const shouldEmit =
        this.config.emitOnUnchanged ||
        prev === undefined ||
        this.priceChangeExceedsThreshold(prev.price, tick.price);

      if (shouldEmit) {
        this.latestPrices.set(asset, tick);
        this.appendTickHistory(asset, tick);
        this.dispatchTick(tick);
      }
    }

    this.emitStreamEvent('snapshot.updated', {
      assetCount: Object.keys(snapshot.prices).length,
      source: snapshot.source,
    });
  }

  /**
   * Build a PriceTick from a NormalizedPrice.
   */
  private buildTick(
    asset: string,
    normalizedPrice: NormalizedPrice,
    snapshot: MarketDataSnapshot
  ): PriceTick {
    return {
      asset,
      price: normalizedPrice.price,
      volume24h: normalizedPrice.volume24h,
      priceChange24h: normalizedPrice.priceChange24h ?? 0,
      pair: `${asset}/${this.config.quoteCurrency}`,
      source: snapshot.source,
      timestamp: snapshot.fetchedAt,
      isSimulated: snapshot.source === 'simulation' || snapshot.source === 'baseline',
    };
  }

  /**
   * Returns true if the price change exceeds the configured threshold.
   */
  private priceChangeExceedsThreshold(oldPrice: number, newPrice: number): boolean {
    if (oldPrice === 0) return true;
    const change = Math.abs(newPrice - oldPrice) / oldPrice;
    return change > this.config.minChangeThreshold;
  }

  /**
   * Append a tick to the history ring buffer for an asset.
   */
  private appendTickHistory(asset: string, tick: PriceTick): void {
    if (!this.tickHistory.has(asset)) {
      this.tickHistory.set(asset, []);
    }
    const history = this.tickHistory.get(asset)!;
    history.push(tick);
    if (history.length > this.config.maxTickHistory) {
      history.shift();
    }
  }

  /**
   * Dispatch a tick to all matching subscribers.
   */
  private dispatchTick(tick: PriceTick): void {
    // Global handlers
    for (const handler of this.globalHandlers) {
      try {
        handler(tick);
      } catch {
        // Swallow handler errors
      }
    }

    // Asset-specific handlers
    const assetHandlers = this.assetHandlers.get(tick.asset);
    if (assetHandlers) {
      for (const handler of assetHandlers) {
        try {
          handler(tick);
        } catch {
          // Swallow handler errors
        }
      }
    }

    // Pair-specific handlers
    const pairHandlers = this.pairHandlers.get(tick.pair);
    if (pairHandlers) {
      for (const handler of pairHandlers) {
        try {
          handler(tick);
        } catch {
          // Swallow handler errors
        }
      }
    }

    this.emitStreamEvent('price.tick', {
      asset: tick.asset,
      price: tick.price,
      pair: tick.pair,
      source: tick.source,
    });
  }

  /**
   * Emit a stream lifecycle or error event.
   */
  private emitStreamEvent(
    type: MarketDataStreamEventType,
    data: Record<string, unknown>
  ): void {
    const event: MarketDataStreamEvent = {
      type,
      timestamp: new Date(),
      asset: data['asset'] as string | undefined,
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
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new MarketDataStream backed by the provided snapshot fetcher.
 *
 * @param snapshotFetcher - Async function that returns a MarketDataSnapshot
 * @param config - Optional stream configuration
 *
 * @example
 * ```typescript
 * import { createMarketDataService, createMarketDataStream } from '@tonaiagent/core/market-data';
 *
 * const service = createMarketDataService();
 * service.start();
 *
 * const stream = createMarketDataStream(
 *   () => service.getSnapshot(),
 *   { pollingIntervalMs: 500 }
 * );
 * stream.start();
 *
 * stream.subscribeToPair('TON/USDT', (tick) => {
 *   console.log(`TON: $${tick.price}`);
 * });
 * ```
 */
export function createMarketDataStream(
  snapshotFetcher: () => Promise<MarketDataSnapshot>,
  config?: Partial<MarketDataStreamConfig>
): MarketDataStream {
  return new MarketDataStream(snapshotFetcher, config);
}
