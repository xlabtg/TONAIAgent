/**
 * TONAIAgent — Signal Connectors (Issue #265)
 *
 * Provides external market signal connectors for news, sentiment,
 * price momentum, and on-chain metrics.
 *
 * Architecture:
 *   External APIs → Signal Connectors → Signal Aggregator → Agent Context
 *
 * Each connector implements the SignalConnector interface and returns
 * normalized ExternalSignal objects with scores in the [-1, +1] range.
 */

// ============================================================================
// Core Signal Type
// ============================================================================

/**
 * Normalized external market signal.
 *
 * Scores are in the range [-1, +1]:
 *   -1 = maximally negative / bearish
 *    0 = neutral
 *   +1 = maximally positive / bullish
 */
export interface ExternalSignal {
  /** Signal category. */
  type: 'sentiment' | 'news' | 'onchain' | 'momentum';
  /** Asset ticker or identifier (e.g. "TON", "BTC"). */
  asset: string;
  /**
   * Normalized signal score [-1, +1].
   * Positive → bullish; negative → bearish.
   */
  score: number;
  /**
   * Confidence in the signal [0, 1].
   * Higher confidence means the signal source is more reliable or
   * the underlying data is more statistically significant.
   */
  confidence: number;
  /** Unix timestamp (ms) when the signal was generated. */
  timestamp: number;
  /** Human-readable source identifier (e.g. "CryptoPanic", "CoinMetrics"). */
  source?: string;
}

// ============================================================================
// Connector Interface
// ============================================================================

/**
 * Common interface for all external signal connectors.
 *
 * Each connector fetches data from a specific external source and
 * normalizes it into one or more ExternalSignal objects.
 */
export interface SignalConnector {
  /** Unique connector name. */
  readonly name: string;

  /**
   * Fetch the latest signals for the given assets.
   *
   * @param assets - list of asset identifiers to query (e.g. ["TON", "BTC"])
   * @returns array of ExternalSignal (may be empty if no data available)
   */
  fetchSignals(assets: string[]): Promise<ExternalSignal[]>;
}

// ============================================================================
// News Signal Connector
// ============================================================================

/**
 * Configuration for the news signal connector.
 */
export interface NewsSignalConfig {
  /**
   * Base URL for the news API (e.g. CryptoPanic or a custom aggregator).
   * Defaults to a simulated provider.
   */
  apiBaseUrl?: string;
  /**
   * Optional API authentication token.
   */
  apiToken?: string;
  /**
   * Number of recent articles to analyse.
   * Default: 20
   */
  articleLimit?: number;
}

/**
 * News signal connector.
 *
 * Fetches recent crypto news headlines and converts aggregate sentiment
 * (bullish/bearish article ratio) into an ExternalSignal.
 *
 * In the absence of a live API (no apiToken or apiBaseUrl), the connector
 * returns a neutral signal with low confidence so that the system degrades
 * gracefully.
 */
export class NewsSignalConnector implements SignalConnector {
  readonly name = 'news';
  private readonly config: Required<NewsSignalConfig>;

  constructor(config: NewsSignalConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl ?? '',
      apiToken: config.apiToken ?? '',
      articleLimit: config.articleLimit ?? 20,
    };
  }

  async fetchSignals(assets: string[]): Promise<ExternalSignal[]> {
    const now = Date.now();

    // Without a live API endpoint, return neutral signals so downstream
    // aggregation is unaffected until a real integration is wired in.
    if (!this.config.apiBaseUrl && !this.config.apiToken) {
      return assets.map(asset => ({
        type: 'news' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }

    // --- Real API path (HTTP fetch) ---
    try {
      const signals: ExternalSignal[] = [];
      for (const asset of assets) {
        const signal = await this._fetchForAsset(asset, now);
        signals.push(signal);
      }
      return signals;
    } catch {
      // Fallback to neutral on error
      return assets.map(asset => ({
        type: 'news' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }
  }

  private async _fetchForAsset(asset: string, now: number): Promise<ExternalSignal> {
    const url = `${this.config.apiBaseUrl}/posts/?currencies=${asset}&limit=${this.config.articleLimit}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { type: 'news', asset, score: 0, confidence: 0.1, timestamp: now, source: this.name };
    }

    const data = (await response.json()) as { results?: Array<{ votes?: { positive?: number; negative?: number } }> };
    const articles = data.results ?? [];

    if (articles.length === 0) {
      return { type: 'news', asset, score: 0, confidence: 0.2, timestamp: now, source: this.name };
    }

    let totalPositive = 0;
    let totalNegative = 0;
    for (const article of articles) {
      totalPositive += article.votes?.positive ?? 0;
      totalNegative += article.votes?.negative ?? 0;
    }

    const total = totalPositive + totalNegative;
    const score = total === 0 ? 0 : (totalPositive - totalNegative) / total;
    const confidence = Math.min(1, articles.length / this.config.articleLimit);

    return { type: 'news', asset, score, confidence, timestamp: now, source: this.name };
  }
}

// ============================================================================
// Sentiment Signal Connector
// ============================================================================

/**
 * Configuration for the sentiment signal connector.
 */
export interface SentimentSignalConfig {
  /**
   * Base URL for a social sentiment API (e.g. LunarCrush, Santiment).
   * Defaults to an empty string (simulated mode).
   */
  apiBaseUrl?: string;
  /** Optional API key. */
  apiKey?: string;
}

/**
 * Social sentiment signal connector.
 *
 * Translates social media / community sentiment scores into normalised
 * ExternalSignal objects.  Without a live API the connector returns a
 * neutral signal with low confidence.
 */
export class SentimentSignalConnector implements SignalConnector {
  readonly name = 'sentiment';
  private readonly config: Required<SentimentSignalConfig>;

  constructor(config: SentimentSignalConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl ?? '',
      apiKey: config.apiKey ?? '',
    };
  }

  async fetchSignals(assets: string[]): Promise<ExternalSignal[]> {
    const now = Date.now();

    if (!this.config.apiBaseUrl && !this.config.apiKey) {
      return assets.map(asset => ({
        type: 'sentiment' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }

    try {
      const signals: ExternalSignal[] = [];
      for (const asset of assets) {
        const signal = await this._fetchForAsset(asset, now);
        signals.push(signal);
      }
      return signals;
    } catch {
      return assets.map(asset => ({
        type: 'sentiment' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }
  }

  private async _fetchForAsset(asset: string, now: number): Promise<ExternalSignal> {
    const url = `${this.config.apiBaseUrl}/v1/assets/${asset.toLowerCase()}/sentiment`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { type: 'sentiment', asset, score: 0, confidence: 0.1, timestamp: now, source: this.name };
    }

    const data = (await response.json()) as { sentiment_score?: number; confidence?: number };

    // API returns sentiment_score in [0, 100]; normalise to [-1, +1]
    const rawScore = data.sentiment_score ?? 50;
    const score = (rawScore - 50) / 50; // maps [0,100] → [-1,+1]
    const confidence = Math.min(1, Math.max(0, data.confidence ?? 0.5));

    return { type: 'sentiment', asset, score, confidence, timestamp: now, source: this.name };
  }
}

// ============================================================================
// Momentum Signal Connector
// ============================================================================

/**
 * Configuration for the momentum signal connector.
 */
export interface MomentumSignalConfig {
  /**
   * Lookback periods (number of price ticks) for short and long windows.
   * Defaults: shortPeriod = 7, longPeriod = 30.
   */
  shortPeriod?: number;
  longPeriod?: number;
}

/**
 * Price momentum signal connector.
 *
 * Computes a momentum score from the ratio of short-term to long-term
 * price change.  Designed to consume an external price history snapshot.
 *
 * Usage:
 * ```ts
 * const connector = new MomentumSignalConnector();
 * connector.ingestPriceHistory('TON', priceArray);
 * const signals = await connector.fetchSignals(['TON']);
 * ```
 */
export class MomentumSignalConnector implements SignalConnector {
  readonly name = 'momentum';
  private readonly shortPeriod: number;
  private readonly longPeriod: number;
  /** Per-asset price history (newest last). */
  private readonly priceHistory = new Map<string, number[]>();

  constructor(config: MomentumSignalConfig = {}) {
    this.shortPeriod = config.shortPeriod ?? 7;
    this.longPeriod = config.longPeriod ?? 30;
  }

  /**
   * Ingest a new price history array for an asset.
   * Prices should be ordered oldest → newest.
   */
  ingestPriceHistory(asset: string, prices: number[]): void {
    this.priceHistory.set(asset.toUpperCase(), [...prices]);
  }

  /**
   * Append a single new price tick for an asset.
   */
  appendPrice(asset: string, price: number): void {
    const key = asset.toUpperCase();
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    this.priceHistory.get(key)!.push(price);
  }

  async fetchSignals(assets: string[]): Promise<ExternalSignal[]> {
    const now = Date.now();
    return assets.map(asset => this._computeSignal(asset.toUpperCase(), now));
  }

  private _computeSignal(asset: string, now: number): ExternalSignal {
    const prices = this.priceHistory.get(asset) ?? [];

    if (prices.length < 2) {
      return { type: 'momentum', asset, score: 0, confidence: 0, timestamp: now, source: this.name };
    }

    const latest = prices[prices.length - 1];

    // Short-term change
    const shortStart = prices[Math.max(0, prices.length - this.shortPeriod - 1)];
    const shortChange = shortStart > 0 ? (latest - shortStart) / shortStart : 0;

    // Long-term change (used for confidence)
    const longStart = prices[Math.max(0, prices.length - this.longPeriod - 1)];
    const longChange = longStart > 0 ? (latest - longStart) / longStart : 0;

    // Score: clamp short-term change to [-1, +1]
    const score = Math.max(-1, Math.min(1, shortChange * 10));

    // Confidence based on how many data points we have (more = higher confidence)
    const confidence = Math.min(1, prices.length / this.longPeriod);

    // Weaken confidence if short and long momentum disagree strongly
    const agreement = longChange !== 0 && Math.sign(shortChange) === Math.sign(longChange) ? 1 : 0.7;

    return {
      type: 'momentum',
      asset,
      score,
      confidence: confidence * agreement,
      timestamp: now,
      source: this.name,
    };
  }
}

// ============================================================================
// On-Chain Signal Connector
// ============================================================================

/**
 * Configuration for the on-chain metrics signal connector.
 */
export interface OnChainSignalConfig {
  /**
   * Base URL for an on-chain data API (e.g. CoinMetrics, Nansen, TON indexer).
   * Defaults to empty string (simulated mode).
   */
  apiBaseUrl?: string;
  /** Optional API key. */
  apiKey?: string;
}

/**
 * On-chain metrics signal connector.
 *
 * Translates on-chain activity metrics (active addresses, transaction volume,
 * exchange inflows/outflows) into a normalised ExternalSignal.
 */
export class OnChainSignalConnector implements SignalConnector {
  readonly name = 'onchain';
  private readonly config: Required<OnChainSignalConfig>;

  constructor(config: OnChainSignalConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl ?? '',
      apiKey: config.apiKey ?? '',
    };
  }

  async fetchSignals(assets: string[]): Promise<ExternalSignal[]> {
    const now = Date.now();

    if (!this.config.apiBaseUrl && !this.config.apiKey) {
      return assets.map(asset => ({
        type: 'onchain' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }

    try {
      const signals: ExternalSignal[] = [];
      for (const asset of assets) {
        const signal = await this._fetchForAsset(asset, now);
        signals.push(signal);
      }
      return signals;
    } catch {
      return assets.map(asset => ({
        type: 'onchain' as const,
        asset,
        score: 0,
        confidence: 0.1,
        timestamp: now,
        source: this.name,
      }));
    }
  }

  private async _fetchForAsset(asset: string, now: number): Promise<ExternalSignal> {
    const url = `${this.config.apiBaseUrl}/v1/metrics/${asset.toLowerCase()}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { type: 'onchain', asset, score: 0, confidence: 0.1, timestamp: now, source: this.name };
    }

    const data = (await response.json()) as {
      active_addresses_change?: number; // % change vs 7d avg
      exchange_outflow_ratio?: number;  // outflow / (inflow + outflow) — higher = bullish
      nvt_signal?: number;              // NVT ratio; high = overvalued (negative), low = undervalued (positive)
    };

    // Derive a composite score from available on-chain metrics
    let score = 0;
    let totalWeight = 0;

    if (data.active_addresses_change !== undefined) {
      // +10% address growth → ~+0.5 score
      const s = Math.max(-1, Math.min(1, data.active_addresses_change / 20));
      score += s * 0.4;
      totalWeight += 0.4;
    }

    if (data.exchange_outflow_ratio !== undefined) {
      // High outflow ratio (>0.6) = coins leaving exchanges = bullish
      const s = Math.max(-1, Math.min(1, (data.exchange_outflow_ratio - 0.5) * 4));
      score += s * 0.35;
      totalWeight += 0.35;
    }

    if (data.nvt_signal !== undefined) {
      // NVT above 200 = overvalued (bearish), below 50 = undervalued (bullish)
      // Map [50, 200] → [-1, +1] (inverted)
      const s = Math.max(-1, Math.min(1, -((data.nvt_signal - 125) / 75)));
      score += s * 0.25;
      totalWeight += 0.25;
    }

    const finalScore = totalWeight > 0 ? score / totalWeight * totalWeight : 0;
    const confidence = totalWeight > 0 ? 0.6 : 0.1;

    return { type: 'onchain', asset, score: finalScore, confidence, timestamp: now, source: this.name };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a default set of signal connectors for all signal types.
 *
 * All connectors default to simulated/neutral mode unless configured
 * with live API credentials.
 */
export function createDefaultSignalConnectors(config?: {
  news?: NewsSignalConfig;
  sentiment?: SentimentSignalConfig;
  momentum?: MomentumSignalConfig;
  onchain?: OnChainSignalConfig;
}): SignalConnector[] {
  return [
    new NewsSignalConnector(config?.news),
    new SentimentSignalConnector(config?.sentiment),
    new MomentumSignalConnector(config?.momentum),
    new OnChainSignalConnector(config?.onchain),
  ];
}

export {
  NewsSignalConnector as NewsConnector,
  SentimentSignalConnector as SentimentConnector,
  MomentumSignalConnector as MomentumConnector,
  OnChainSignalConnector as OnChainConnector,
};
