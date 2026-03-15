/**
 * TONAIAgent - Market Data Provider Interface
 *
 * Common interface that all market data providers must implement.
 * Allows switching providers without changing strategy or service logic.
 *
 * @example
 * ```typescript
 * class MyProvider implements MarketDataProvider {
 *   getName(): ProviderName { return 'coingecko'; }
 *
 *   async getPrice(asset: string): Promise<NormalizedPrice> {
 *     // fetch from API, normalize, and return
 *   }
 *
 *   async getTicker(asset: string): Promise<Ticker> {
 *     // fetch full ticker data
 *   }
 *
 *   getSupportedAssets(): string[] {
 *     return ['BTC', 'ETH', 'TON', 'SOL', 'USDT'];
 *   }
 * }
 * ```
 */

import type { NormalizedPrice, ProviderConfig, ProviderName, Ticker } from './types';
import { MarketDataError } from './types';

/**
 * MarketDataProvider — the contract every provider class must fulfill.
 *
 * All data returned must be normalized to the common NormalizedPrice / Ticker format
 * regardless of the underlying API response format.
 */
export interface MarketDataProvider {
  /**
   * Returns the provider's unique identifier.
   */
  getName(): ProviderName;

  /**
   * Fetches the current price for a single asset.
   * Must normalize the response to NormalizedPrice format.
   *
   * @param asset - Asset symbol (e.g. "BTC", "TON")
   * @returns Normalized price data
   * @throws MarketDataError if the asset is unsupported or the request fails
   */
  getPrice(asset: string): Promise<NormalizedPrice>;

  /**
   * Fetches full ticker data for a single asset, including volume and price change.
   * Must normalize the response to Ticker format.
   *
   * @param asset - Asset symbol (e.g. "BTC", "TON")
   * @returns Ticker data
   * @throws MarketDataError if the asset is unsupported or the request fails
   */
  getTicker(asset: string): Promise<Ticker>;

  /**
   * Returns the list of asset symbols this provider supports.
   */
  getSupportedAssets(): string[];
}

/**
 * Abstract base class for market data providers.
 * Provides common utilities: asset validation, normalized timestamp generation,
 * and retry logic scaffolding.
 *
 * Providers should extend this class to gain shared infrastructure.
 */
export abstract class BaseMarketDataProvider implements MarketDataProvider {
  protected readonly config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeoutMs: 10_000,
      maxRetries: 2,
      ...config,
    };
  }

  abstract getName(): ProviderName;
  abstract getPrice(asset: string): Promise<NormalizedPrice>;
  abstract getTicker(asset: string): Promise<Ticker>;
  abstract getSupportedAssets(): string[];

  /**
   * Validates that the requested asset is in the supported list.
   * Throws MarketDataError with ASSET_NOT_SUPPORTED if not.
   */
  protected validateAsset(asset: string): void {
    const supported = this.getSupportedAssets();
    if (!supported.includes(asset.toUpperCase())) {
      throw new MarketDataError(
        `Asset '${asset}' is not supported by provider '${this.getName()}'`,
        'ASSET_NOT_SUPPORTED',
        this.getName(),
        { asset, supportedAssets: supported }
      );
    }
  }

  /**
   * Returns the current UNIX timestamp in seconds.
   */
  protected nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Retries an async operation up to maxRetries times on transient errors.
   * Non-transient errors (e.g. ASSET_NOT_SUPPORTED) are rethrown immediately.
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 2;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;

        // Don't retry non-transient errors
        if (
          err instanceof MarketDataError &&
          (err.code === 'ASSET_NOT_SUPPORTED' || err.code === 'PROVIDER_RATE_LIMITED')
        ) {
          throw err;
        }

        // Wait before retrying (exponential backoff: 200ms, 400ms)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }
}
