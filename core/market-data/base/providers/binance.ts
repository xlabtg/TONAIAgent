/**
 * TONAIAgent - Binance Market Data Provider
 *
 * Fetches price and ticker data from the Binance public API (no auth required).
 *
 * Documentation: https://binance-docs.github.io/apidocs/spot/en/
 * Example endpoint: GET /api/v3/ticker/price
 */

import { BaseMarketDataProvider } from '../interface';
import { MarketDataError } from '../types';
import type { NormalizedPrice, ProviderConfig, Ticker } from '../types';
import { MVP_ASSETS, BINANCE_SYMBOLS } from '../config/assets';

// ============================================================================
// Binance Provider
// ============================================================================

/**
 * BinanceProvider — fetches normalized price data from the Binance public API.
 *
 * Supported assets: BTC, ETH, TON, SOL, USDT
 *
 * @example
 * ```typescript
 * const provider = createBinanceProvider();
 * const price = await provider.getPrice('BTC');
 * // { asset: 'BTC', price: 65000, volume24h: 25000000000, ..., source: 'binance' }
 * ```
 */
export class BinanceProvider extends BaseMarketDataProvider {
  private readonly baseUrl: string;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({
      name: 'binance',
      baseUrl: 'https://api.binance.com/api/v3',
      timeoutMs: 10_000,
      maxRetries: 2,
      ...config,
    });
    this.baseUrl = this.config.baseUrl ?? 'https://api.binance.com/api/v3';
  }

  getName() {
    return 'binance' as const;
  }

  getSupportedAssets(): string[] {
    return [...MVP_ASSETS];
  }

  /**
   * Fetches the current price for a single asset from Binance.
   *
   * Uses: GET /ticker/24hr?symbol={BTCUSDT}
   * This endpoint returns price + volume in one call.
   */
  async getPrice(asset: string): Promise<NormalizedPrice> {
    this.validateAsset(asset);

    return this.withRetry(async () => {
      const symbol = this.getSymbol(asset);
      const data = await this.fetchTicker24hr(symbol);

      return {
        asset: asset.toUpperCase(),
        price: parseFloat(data.lastPrice),
        volume24h: parseFloat(data.quoteVolume),
        priceChange24h: parseFloat(data.priceChangePercent),
        timestamp: this.nowSeconds(),
        source: 'binance',
      };
    });
  }

  /**
   * Fetches full ticker data for a single asset from Binance.
   *
   * Uses: GET /ticker/24hr?symbol={BTCUSDT}
   */
  async getTicker(asset: string): Promise<Ticker> {
    this.validateAsset(asset);

    return this.withRetry(async () => {
      const symbol = this.getSymbol(asset);
      const data = await this.fetchTicker24hr(symbol);

      return {
        asset: asset.toUpperCase(),
        price: parseFloat(data.lastPrice),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.quoteVolume),
        priceChange24h: parseFloat(data.priceChangePercent),
        timestamp: this.nowSeconds(),
        source: 'binance',
      };
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Maps an asset symbol to its Binance ticker symbol.
   */
  private getSymbol(asset: string): string {
    const symbol = BINANCE_SYMBOLS[asset.toUpperCase()];
    if (!symbol) {
      throw new MarketDataError(
        `No Binance symbol mapping for asset '${asset}'`,
        'ASSET_NOT_SUPPORTED',
        'binance',
        { asset }
      );
    }
    return symbol;
  }

  /**
   * Fetches the 24hr ticker for a Binance symbol.
   */
  private async fetchTicker24hr(symbol: string): Promise<Binance24hrTicker> {
    const url = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
    const data = await this.fetchJson<Binance24hrTicker>(url);

    if (!data.lastPrice || isNaN(parseFloat(data.lastPrice))) {
      throw new MarketDataError(
        `Binance returned invalid ticker data for symbol '${symbol}'`,
        'INVALID_RESPONSE',
        'binance',
        { symbol, response: data }
      );
    }

    return data;
  }

  /**
   * Fetches a URL and parses the JSON response.
   * Throws MarketDataError on HTTP errors or parse failures.
   */
  private async fetchJson<T>(url: string): Promise<T> {
    let response: Response;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10_000);

      try {
        response = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      throw new MarketDataError(
        isTimeout ? `Binance request timed out after ${this.config.timeoutMs}ms` : `Binance fetch failed: ${String(err)}`,
        isTimeout ? 'FETCH_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        'binance',
        { url }
      );
    }

    if (response.status === 429 || response.status === 418) {
      throw new MarketDataError(
        `Binance rate limit exceeded (HTTP ${response.status})`,
        'PROVIDER_RATE_LIMITED',
        'binance',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new MarketDataError(
        `Binance API returned HTTP ${response.status}`,
        'PROVIDER_UNAVAILABLE',
        'binance',
        { status: response.status, url }
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new MarketDataError(
        'Binance returned invalid JSON',
        'INVALID_RESPONSE',
        'binance',
        { url }
      );
    }
  }
}

// ============================================================================
// Binance API Response Types (internal)
// ============================================================================

/** Response from /ticker/24hr */
interface Binance24hrTicker {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;         // base asset volume
  quoteVolume: string;    // quote asset volume (USD equivalent for XXUSDT pairs)
  priceChangePercent: string;
  openPrice: string;
  prevClosePrice: string;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Binance provider instance with optional configuration overrides.
 *
 * @example
 * ```typescript
 * const provider = createBinanceProvider();
 * const price = await provider.getPrice('ETH');
 * ```
 */
export function createBinanceProvider(config?: Partial<ProviderConfig>): BinanceProvider {
  return new BinanceProvider(config);
}
