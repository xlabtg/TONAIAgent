/**
 * TONAIAgent - CoinGecko Market Data Provider
 *
 * Fetches price and ticker data from the CoinGecko public API.
 * Uses the free-tier endpoint (no API key required).
 *
 * Documentation: https://www.coingecko.com/en/api/documentation
 * Example endpoint: https://api.coingecko.com/api/v3/simple/price
 */

import { BaseMarketDataProvider } from '../interface';
import { MarketDataError } from '../types';
import type { NormalizedPrice, ProviderConfig, Ticker } from '../types';
import { MVP_ASSETS, COINGECKO_ASSET_IDS } from '../config/assets';

// ============================================================================
// CoinGecko Provider
// ============================================================================

/**
 * CoinGeckoProvider — fetches normalized price data from the CoinGecko API.
 *
 * Supported assets: BTC, ETH, TON, SOL, USDT
 *
 * @example
 * ```typescript
 * const provider = createCoinGeckoProvider();
 * const price = await provider.getPrice('BTC');
 * // { asset: 'BTC', price: 65000, volume24h: 25000000000, ..., source: 'coingecko' }
 * ```
 */
export class CoinGeckoProvider extends BaseMarketDataProvider {
  private readonly baseUrl: string;

  constructor(config: Partial<ProviderConfig> = {}) {
    super({
      name: 'coingecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      timeoutMs: 10_000,
      maxRetries: 2,
      ...config,
    });
    this.baseUrl = this.config.baseUrl ?? 'https://api.coingecko.com/api/v3';
  }

  getName() {
    return 'coingecko' as const;
  }

  getSupportedAssets(): string[] {
    return [...MVP_ASSETS];
  }

  /**
   * Fetches the current price for a single asset from CoinGecko.
   *
   * Uses: GET /simple/price?ids={id}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true
   */
  async getPrice(asset: string): Promise<NormalizedPrice> {
    this.validateAsset(asset);

    return this.withRetry(async () => {
      const coinId = this.getCoinId(asset);
      const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`;

      const data = await this.fetchJson<Record<string, CoinGeckoSimplePrice>>(url);

      const coinData = data[coinId];
      if (!coinData || coinData.usd === undefined) {
        throw new MarketDataError(
          `CoinGecko returned no price data for asset '${asset}' (id: ${coinId})`,
          'INVALID_RESPONSE',
          'coingecko',
          { asset, coinId, response: data }
        );
      }

      return {
        asset: asset.toUpperCase(),
        price: coinData.usd,
        volume24h: coinData.usd_24h_vol ?? 0,
        priceChange24h: coinData.usd_24h_change,
        marketCap: coinData.usd_market_cap,
        timestamp: this.nowSeconds(),
        source: 'coingecko',
      };
    });
  }

  /**
   * Fetches full ticker data for a single asset from CoinGecko.
   *
   * Uses: GET /coins/{id}?localization=false&tickers=false&community_data=false&developer_data=false
   */
  async getTicker(asset: string): Promise<Ticker> {
    this.validateAsset(asset);

    return this.withRetry(async () => {
      const coinId = this.getCoinId(asset);
      const url = `${this.baseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;

      const data = await this.fetchJson<CoinGeckoCoinDetails>(url);

      const marketData = data.market_data;
      if (!marketData || marketData.current_price?.usd === undefined) {
        throw new MarketDataError(
          `CoinGecko returned no market data for asset '${asset}' (id: ${coinId})`,
          'INVALID_RESPONSE',
          'coingecko',
          { asset, coinId }
        );
      }

      return {
        asset: asset.toUpperCase(),
        price: marketData.current_price.usd,
        high24h: marketData.high_24h?.usd,
        low24h: marketData.low_24h?.usd,
        volume24h: marketData.total_volume?.usd ?? 0,
        priceChange24h: marketData.price_change_percentage_24h,
        marketCap: marketData.market_cap?.usd,
        timestamp: this.nowSeconds(),
        source: 'coingecko',
      };
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Maps an asset symbol to its CoinGecko coin ID.
   */
  private getCoinId(asset: string): string {
    const id = COINGECKO_ASSET_IDS[asset.toUpperCase()];
    if (!id) {
      throw new MarketDataError(
        `No CoinGecko ID mapping for asset '${asset}'`,
        'ASSET_NOT_SUPPORTED',
        'coingecko',
        { asset }
      );
    }
    return id;
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
        isTimeout ? `CoinGecko request timed out after ${this.config.timeoutMs}ms` : `CoinGecko fetch failed: ${String(err)}`,
        isTimeout ? 'FETCH_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        'coingecko',
        { url }
      );
    }

    if (response.status === 429) {
      throw new MarketDataError(
        'CoinGecko rate limit exceeded',
        'PROVIDER_RATE_LIMITED',
        'coingecko',
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new MarketDataError(
        `CoinGecko API returned HTTP ${response.status}`,
        'PROVIDER_UNAVAILABLE',
        'coingecko',
        { status: response.status, url }
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new MarketDataError(
        'CoinGecko returned invalid JSON',
        'INVALID_RESPONSE',
        'coingecko',
        { url }
      );
    }
  }
}

// ============================================================================
// CoinGecko API Response Types (internal)
// ============================================================================

/** Response from /simple/price */
interface CoinGeckoSimplePrice {
  usd: number;
  usd_24h_vol?: number;
  usd_24h_change?: number;
  usd_market_cap?: number;
}

/** Response from /coins/{id} */
interface CoinGeckoCoinDetails {
  market_data?: {
    current_price?: { usd?: number };
    high_24h?: { usd?: number };
    low_24h?: { usd?: number };
    total_volume?: { usd?: number };
    market_cap?: { usd?: number };
    price_change_percentage_24h?: number;
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a CoinGecko provider instance with optional configuration overrides.
 *
 * @example
 * ```typescript
 * const provider = createCoinGeckoProvider();
 * const price = await provider.getPrice('BTC');
 * ```
 */
export function createCoinGeckoProvider(config?: Partial<ProviderConfig>): CoinGeckoProvider {
  return new CoinGeckoProvider(config);
}
