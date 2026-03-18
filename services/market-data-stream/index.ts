/**
 * TONAIAgent - Market Data Stream Service (Issue #251)
 *
 * Orchestrates real-time market data streaming across the platform.
 * Acts as the single hub that:
 *  - Wires the market data polling layer to the streaming layer
 *  - Exposes symbol-based subscriptions (`subscribe("TON/USDT")`)
 *  - Broadcasts price ticks to all registered consumers (strategies, UI)
 *  - Maintains a price cache for instant reads
 *  - Supports simulation mode (baseline prices with jitter)
 *
 * Architecture:
 * ```
 *   DEX / CoinGecko / Binance
 *         |
 *   DefaultMarketDataService (polling/caching)
 *         |
 *   MarketDataStreamService (this module)
 *         |
 *   ┌─────┼──────────────────┐
 *   │     │                  │
 * Strategies  Telegram Mini App  Execution Engine
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createMarketDataStreamService } from '@tonaiagent/core/market-data-stream';
 *
 * const service = createMarketDataStreamService();
 * service.start();
 *
 * // Subscribe to a pair (WebSocket-style)
 * const unsub = service.subscribe('TON/USDT', (tick) => {
 *   console.log(`TON/USDT: $${tick.price}`);
 * });
 *
 * // Get the current price synchronously
 * const tonPrice = service.getPrice('TON');
 *
 * // Unsubscribe when done
 * unsub();
 * service.stop();
 * ```
 *
 * @see Issue #251 — Real-Time Market Data + Streaming
 */

import {
  createMarketDataService,
  BASELINE_PRICES,
  MVP_ASSETS,
} from '../../core/market-data/base';
import type { MarketDataSnapshot } from '../../core/market-data/base';
import {
  MarketDataStream,
  DEFAULT_STREAM_CONFIG,
} from '../../core/market-data/base/streaming';
import type {
  PriceTick,
  PriceTickHandler,
  StreamUnsubscribe,
  MarketDataStreamConfig,
  MarketDataStreamEvent,
  MarketDataStreamEventHandler,
} from '../../core/market-data/base/streaming';

// Re-export stream types for consumers
export type {
  PriceTick,
  PriceTickHandler,
  StreamUnsubscribe,
  MarketDataStreamConfig,
  MarketDataStreamEvent,
  MarketDataStreamEventHandler,
};

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * Configuration for the MarketDataStreamService.
 */
export interface MarketDataStreamServiceConfig {
  /**
   * Stream configuration (polling interval, etc.).
   */
  stream: Partial<MarketDataStreamConfig>;
  /**
   * Whether to use simulation mode (baseline prices with synthetic jitter).
   * Useful for development and testing without live API calls.
   * Default: false
   */
  simulation: boolean;
  /**
   * Price jitter amplitude in simulation mode (as fraction of price).
   * E.g., 0.005 = ±0.5% random price movement per tick.
   * Default: 0.005
   */
  simulationJitter: number;
  /**
   * Whether to enable verbose event logging.
   * Default: false
   */
  verbose: boolean;
}

export const DEFAULT_SERVICE_CONFIG: MarketDataStreamServiceConfig = {
  stream: {
    pollingIntervalMs: 1000,
    quoteCurrency: 'USDT',
    emitOnUnchanged: false,
    maxTickHistory: 100,
    minChangeThreshold: 0,
  },
  simulation: false,
  simulationJitter: 0.005,
  verbose: false,
};

// ============================================================================
// MarketDataStreamService
// ============================================================================

/**
 * MarketDataStreamService — the central hub for real-time market data.
 *
 * This service wraps the low-level MarketDataStream and adds:
 * - Symbol-based pair subscriptions ("TON/USDT")
 * - Simulation mode with synthetic price ticks
 * - Service lifecycle management (start/stop/status)
 * - Metrics (subscription counts, tick counts)
 *
 * @example
 * ```typescript
 * const service = createMarketDataStreamService({ simulation: true });
 * service.start();
 *
 * service.subscribe('TON/USDT', (tick) => {
 *   console.log(`[${tick.timestamp.toISOString()}] TON/USDT: $${tick.price.toFixed(4)}`);
 * });
 *
 * service.subscribe('BTC/USDT', (tick) => {
 *   console.log(`BTC: $${tick.price.toLocaleString()}`);
 * });
 *
 * // Get current snapshot
 * const prices = service.getAllPrices();
 * ```
 */
export class MarketDataStreamService {
  private readonly config: MarketDataStreamServiceConfig;
  private readonly stream: MarketDataStream;
  private running = false;

  // Simulation state
  private simulatedPrices: Record<string, number> = { ...BASELINE_PRICES };

  // Metrics
  private tickCount = 0;
  private startedAt: Date | null = null;

  constructor(config: Partial<MarketDataStreamServiceConfig> = {}) {
    this.config = {
      ...DEFAULT_SERVICE_CONFIG,
      ...config,
      stream: { ...DEFAULT_SERVICE_CONFIG.stream, ...(config.stream ?? {}) },
    };

    // Build the snapshot fetcher: simulation or live
    const snapshotFetcher = this.config.simulation
      ? () => this.buildSimulatedSnapshot()
      : this.buildLiveSnapshotFetcher();

    this.stream = new MarketDataStream(snapshotFetcher, this.config.stream);

    // Track tick counts for metrics
    this.stream.onEvent((event) => {
      if (event.type === 'price.tick') {
        this.tickCount++;
      }
    });
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the stream service. Begins emitting real-time price ticks.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = new Date();
    this.stream.start();
  }

  /**
   * Stop the stream service.
   */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.stream.stop();
  }

  /**
   * Returns whether the service is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  /**
   * Subscribe to live price updates for a trading pair.
   *
   * The handler is called every time the price changes for the given pair.
   * If a price is already available, the handler is called immediately.
   *
   * @param pair - Trading pair in "BASE/QUOTE" format (e.g., "TON/USDT")
   * @param handler - Callback receiving PriceTick updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = service.subscribe('TON/USDT', (tick) => {
   *   updateUI(tick.price);
   * });
   * // Later:
   * unsub();
   * ```
   */
  subscribe(pair: string, handler: PriceTickHandler): StreamUnsubscribe {
    return this.stream.subscribeToPair(pair, handler);
  }

  /**
   * Subscribe to live price updates for a specific asset symbol.
   *
   * @param asset - Asset symbol (e.g., "TON", "BTC")
   * @param handler - Callback receiving PriceTick updates
   * @returns Unsubscribe function
   */
  subscribeToAsset(asset: string, handler: PriceTickHandler): StreamUnsubscribe {
    return this.stream.subscribeToAsset(asset, handler);
  }

  /**
   * Subscribe to all price ticks (all assets).
   *
   * @returns Unsubscribe function
   */
  subscribeToAll(handler: PriceTickHandler): StreamUnsubscribe {
    return this.stream.subscribe(handler);
  }

  /**
   * Subscribe to stream lifecycle events (start, stop, errors).
   *
   * @returns Unsubscribe function
   */
  onEvent(handler: MarketDataStreamEventHandler): StreamUnsubscribe {
    return this.stream.onEvent(handler);
  }

  // ============================================================================
  // Price Access
  // ============================================================================

  /**
   * Get the latest price for an asset. Returns undefined if not yet available.
   */
  getPrice(asset: string): PriceTick | undefined {
    return this.stream.getLatestPrice(asset);
  }

  /**
   * Get all latest prices as a map of asset → PriceTick.
   */
  getAllPrices(): Record<string, PriceTick> {
    return this.stream.getAllLatestPrices();
  }

  /**
   * Get the tick history for an asset (for charting).
   */
  getTickHistory(asset: string): PriceTick[] {
    return this.stream.getTickHistory(asset);
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Get service metrics.
   */
  getMetrics(): {
    running: boolean;
    uptimeSeconds: number;
    tickCount: number;
    subscriptions: { global: number; pairs: number; assets: number };
    assetCount: number;
  } {
    const uptimeMs = this.startedAt ? Date.now() - this.startedAt.getTime() : 0;
    return {
      running: this.running,
      uptimeSeconds: Math.floor(uptimeMs / 1000),
      tickCount: this.tickCount,
      subscriptions: this.stream.getSubscriptionCount(),
      assetCount: Object.keys(this.stream.getAllLatestPrices()).length,
    };
  }

  // ============================================================================
  // Internal — Snapshot Builders
  // ============================================================================

  /**
   * Build a simulated snapshot with jitter applied to baseline prices.
   * Used in development/testing mode.
   */
  private buildSimulatedSnapshot(): Promise<MarketDataSnapshot> {
    const now = new Date();

    // Apply random walk jitter to each simulated price
    for (const asset of MVP_ASSETS) {
      const basePrice = this.simulatedPrices[asset] ?? BASELINE_PRICES[asset] ?? 1;
      const jitter = (Math.random() * 2 - 1) * this.config.simulationJitter * basePrice;
      this.simulatedPrices[asset] = Math.max(0.0001, basePrice + jitter);
    }

    const prices: MarketDataSnapshot['prices'] = {};
    for (const asset of MVP_ASSETS) {
      const price = this.simulatedPrices[asset] ?? BASELINE_PRICES[asset] ?? 1;
      prices[asset] = {
        asset,
        price,
        volume24h: 1_000_000 + Math.random() * 500_000,
        priceChange24h: (Math.random() * 10 - 5),
        timestamp: Math.floor(now.getTime() / 1000),
        source: 'simulation',
      };
    }

    return Promise.resolve({
      prices,
      source: 'simulation',
      fetchedAt: now,
    });
  }

  /**
   * Build a live snapshot fetcher backed by the DefaultMarketDataService.
   */
  private buildLiveSnapshotFetcher(): () => Promise<MarketDataSnapshot> {
    const marketDataService = createMarketDataService();
    marketDataService.start();

    return async () => {
      try {
        return await marketDataService.getSnapshot();
      } catch {
        // Fallback to baseline prices if live data fails
        const now = new Date();
        const prices: MarketDataSnapshot['prices'] = {};
        for (const asset of MVP_ASSETS) {
          const price = BASELINE_PRICES[asset] ?? 1;
          prices[asset] = {
            asset,
            price,
            volume24h: 1_000_000,
            priceChange24h: 0,
            timestamp: Math.floor(now.getTime() / 1000),
            source: 'baseline',
          };
        }
        return { prices, source: 'baseline', fetchedAt: now };
      }
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new MarketDataStreamService.
 *
 * @example
 * ```typescript
 * // Live mode (fetches real prices from CoinGecko/Binance)
 * const service = createMarketDataStreamService();
 * service.start();
 *
 * // Simulation mode (synthetic prices, no API calls)
 * const simService = createMarketDataStreamService({ simulation: true });
 * simService.start();
 * ```
 */
export function createMarketDataStreamService(
  config?: Partial<MarketDataStreamServiceConfig>
): MarketDataStreamService {
  return new MarketDataStreamService(config);
}
