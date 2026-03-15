/**
 * TONAIAgent - Historical Market Data Layer
 *
 * Provides OHLCV candles, trade history, order book snapshots, and
 * volatility indicators for strategy backtesting.
 *
 * Supports multiple data sources:
 *   - Synthetic data generation (random walk with configurable parameters)
 *   - JSON/CSV file import
 *   - External API integration (pluggable)
 */

import {
  AssetSymbol,
  DataGranularity,
  DataSourceConfig,
  DataSourceType,
  DataValidationResult,
  OHLCVCandle,
  OrderBookSnapshot,
  SyntheticDataConfig,
  TradeRecord,
  VolatilityIndicator,
} from './types';

// ============================================================================
// Historical Data Provider Interface
// ============================================================================

export interface HistoricalDataProvider {
  /** Load OHLCV candles for the given asset and time range */
  getCandles(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<OHLCVCandle[]>;

  /** Load trade history records */
  getTrades(
    asset: AssetSymbol,
    start: Date,
    end: Date
  ): Promise<TradeRecord[]>;

  /** Load order book snapshots (may not be available for all sources) */
  getOrderBookSnapshots(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<OrderBookSnapshot[]>;

  /** Load volatility indicators */
  getVolatilityIndicators(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<VolatilityIndicator[]>;

  /** Check data availability */
  checkAvailability(
    asset: AssetSymbol,
    start: Date,
    end: Date
  ): Promise<boolean>;
}

// ============================================================================
// Granularity Utilities
// ============================================================================

export function granularityToMs(granularity: DataGranularity): number {
  const map: Record<DataGranularity, number> = {
    '1m':  60 * 1000,
    '5m':  5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h':  60 * 60 * 1000,
    '4h':  4 * 60 * 60 * 1000,
    '1d':  24 * 60 * 60 * 1000,
    '1w':  7 * 24 * 60 * 60 * 1000,
  };
  return map[granularity];
}

export function countCandles(start: Date, end: Date, granularity: DataGranularity): number {
  return Math.ceil((end.getTime() - start.getTime()) / granularityToMs(granularity));
}

// ============================================================================
// Synthetic Data Generator
// ============================================================================

/**
 * Generates realistic synthetic OHLCV data using a geometric Brownian motion
 * model. Produces deterministic output when a seed is provided.
 */
export class SyntheticDataGenerator implements HistoricalDataProvider {
  private readonly defaultConfig: SyntheticDataConfig = {
    initialPrices: { TON: 5.0, USDT: 1.0, BTC: 40000, ETH: 2200 },
    volatility: 0.03,
    drift: 0.0005,
    seed: undefined,
    includeGaps: false,
    gapProbability: 0.01,
  };

  constructor(private readonly config: Partial<SyntheticDataConfig> = {}) {}

  async getCandles(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<OHLCVCandle[]> {
    return this.generateCandles(asset, start, end, granularity);
  }

  async getTrades(
    asset: AssetSymbol,
    start: Date,
    end: Date
  ): Promise<TradeRecord[]> {
    // Generate synthetic trade records from hourly candles
    const candles = await this.getCandles(asset, start, end, '1h');
    const trades: TradeRecord[] = [];

    for (const candle of candles) {
      // Generate 5-20 trades per hour candle
      const tradeCount = 5 + Math.floor(Math.random() * 15);
      for (let i = 0; i < tradeCount; i++) {
        const offsetMs = Math.random() * granularityToMs('1h');
        trades.push({
          timestamp: new Date(candle.timestamp.getTime() + offsetMs),
          asset,
          price: candle.low + Math.random() * (candle.high - candle.low),
          size: Math.random() * 1000,
          side: Math.random() > 0.5 ? 'buy' : 'sell',
          tradeId: `synth_${candle.timestamp.getTime()}_${i}`,
        });
      }
    }

    return trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getOrderBookSnapshots(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<OrderBookSnapshot[]> {
    const candles = await this.getCandles(asset, start, end, granularity);
    return candles.map((candle) => {
      const spread = candle.close * 0.002; // 0.2% spread
      return {
        timestamp: candle.timestamp,
        asset,
        bids: [
          { price: candle.close - spread / 2, size: Math.random() * 5000 + 1000 },
          { price: candle.close - spread, size: Math.random() * 3000 + 500 },
          { price: candle.close - spread * 1.5, size: Math.random() * 8000 + 2000 },
        ],
        asks: [
          { price: candle.close + spread / 2, size: Math.random() * 5000 + 1000 },
          { price: candle.close + spread, size: Math.random() * 3000 + 500 },
          { price: candle.close + spread * 1.5, size: Math.random() * 8000 + 2000 },
        ],
        midPrice: candle.close,
        spread,
      };
    });
  }

  async getVolatilityIndicators(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<VolatilityIndicator[]> {
    const candles = await this.getCandles(asset, start, end, granularity);
    const indicators: VolatilityIndicator[] = [];
    const windowSize = 14; // Standard ATR period

    for (let i = windowSize; i < candles.length; i++) {
      const window = candles.slice(i - windowSize, i + 1);
      const atr = this.calculateATR(window);
      const hv = this.calculateHistoricalVolatility(window);

      indicators.push({
        timestamp: candles[i].timestamp,
        asset,
        historicalVolatility: hv,
        atr,
        bollingerBandWidth: hv * 2,
      });
    }

    return indicators;
  }

  async checkAvailability(_asset: AssetSymbol, _start: Date, _end: Date): Promise<boolean> {
    return true; // Synthetic data is always available
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateCandles(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): OHLCVCandle[] {
    const cfg = { ...this.defaultConfig, ...this.config };
    const intervalMs = granularityToMs(granularity);
    const candles: OHLCVCandle[] = [];

    // Scale volatility and drift to granularity
    const periodsPerDay = (24 * 60 * 60 * 1000) / intervalMs;
    const periodVolatility = cfg.volatility / Math.sqrt(periodsPerDay);
    const periodDrift = cfg.drift / periodsPerDay;

    let price = cfg.initialPrices[asset] ?? 1.0;
    let currentTime = start.getTime();
    let rng = this.createRng(cfg.seed);

    while (currentTime <= end.getTime()) {
      // Skip if gap simulation is enabled
      if (cfg.includeGaps && rng() < (cfg.gapProbability ?? 0.01)) {
        currentTime += intervalMs;
        continue;
      }

      // Geometric Brownian Motion: dS = S * (mu*dt + sigma*sqrt(dt)*Z)
      const z = this.boxMullerNormal(rng);
      const returnVal = periodDrift + periodVolatility * z;
      price = price * Math.exp(returnVal);
      price = Math.max(price, 0.0001);

      // Generate OHLCV from close price
      const intraRange = periodVolatility * price * 0.5;
      const open = price * (1 + (rng() - 0.5) * periodVolatility * 0.3);
      const high = Math.max(open, price) + rng() * intraRange;
      const low = Math.min(open, price) - rng() * intraRange;
      const volume = (rng() * 900000 + 100000) * (price > 0 ? 1 / price : 1);

      candles.push({
        timestamp: new Date(currentTime),
        asset,
        open: Math.max(open, 0.0001),
        high: Math.max(high, open, price, 0.0001),
        low: Math.max(Math.min(low, open, price), 0.0001),
        close: price,
        volume,
        volumeUsd: volume * price,
      });

      currentTime += intervalMs;
      // Re-seed rng to maintain determinism across asset generations
      if (cfg.seed !== undefined) {
        rng = this.createRng(cfg.seed + currentTime);
      }
    }

    return candles;
  }

  private createRng(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }
    // Simple mulberry32 PRNG for determinism
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private boxMullerNormal(rng: () => number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private calculateATR(candles: OHLCVCandle[]): number {
    if (candles.length < 2) return 0;
    let atrSum = 0;
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const tr = Math.max(
        curr.high - curr.low,
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close)
      );
      atrSum += tr;
    }
    return atrSum / (candles.length - 1);
  }

  private calculateHistoricalVolatility(candles: OHLCVCandle[]): number {
    if (candles.length < 2) return 0;
    const logReturns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      logReturns.push(Math.log(candles[i].close / candles[i - 1].close));
    }
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
    const variance =
      logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      (logReturns.length - 1);
    // Annualize: multiply daily std dev by sqrt(252)
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  }
}

// ============================================================================
// JSON Data Provider
// ============================================================================

/**
 * Loads historical data from a pre-loaded JSON structure.
 * Useful for tests and offline backtesting with known datasets.
 */
export class JsonDataProvider implements HistoricalDataProvider {
  constructor(
    private readonly data: Map<AssetSymbol, OHLCVCandle[]>
  ) {}

  async getCandles(
    asset: AssetSymbol,
    start: Date,
    end: Date,
    _granularity: DataGranularity
  ): Promise<OHLCVCandle[]> {
    const candles = this.data.get(asset) ?? [];
    return candles.filter(
      (c) =>
        c.timestamp.getTime() >= start.getTime() &&
        c.timestamp.getTime() <= end.getTime()
    );
  }

  async getTrades(
    _asset: AssetSymbol,
    _start: Date,
    _end: Date
  ): Promise<TradeRecord[]> {
    return [];
  }

  async getOrderBookSnapshots(
    _asset: AssetSymbol,
    _start: Date,
    _end: Date,
    _granularity: DataGranularity
  ): Promise<OrderBookSnapshot[]> {
    return [];
  }

  async getVolatilityIndicators(
    _asset: AssetSymbol,
    _start: Date,
    _end: Date,
    _granularity: DataGranularity
  ): Promise<VolatilityIndicator[]> {
    return [];
  }

  async checkAvailability(asset: AssetSymbol, start: Date, end: Date): Promise<boolean> {
    const candles = this.data.get(asset) ?? [];
    if (candles.length === 0) return false;
    const first = candles[0].timestamp;
    const last = candles[candles.length - 1].timestamp;
    return first.getTime() <= start.getTime() && last.getTime() >= end.getTime();
  }
}

// ============================================================================
// Historical Data Manager
// ============================================================================

/**
 * Manages data loading, caching, and validation for the backtesting framework.
 */
export class HistoricalDataManager {
  private readonly cache = new Map<string, OHLCVCandle[]>();
  private provider: HistoricalDataProvider;

  constructor(config: Partial<DataSourceConfig> = {}) {
    this.provider = this.createProvider(config);
  }

  /**
   * Set a custom data provider (e.g., for API integration)
   */
  setProvider(provider: HistoricalDataProvider): void {
    this.provider = provider;
    this.cache.clear();
  }

  /**
   * Load candles for one or more assets, with caching
   */
  async loadCandles(
    assets: AssetSymbol[],
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<Map<AssetSymbol, OHLCVCandle[]>> {
    const result = new Map<AssetSymbol, OHLCVCandle[]>();

    await Promise.all(
      assets.map(async (asset) => {
        const cacheKey = `${asset}_${start.getTime()}_${end.getTime()}_${granularity}`;

        if (this.cache.has(cacheKey)) {
          result.set(asset, this.cache.get(cacheKey)!);
          return;
        }

        const candles = await this.provider.getCandles(asset, start, end, granularity);
        this.cache.set(cacheKey, candles);
        result.set(asset, candles);
      })
    );

    return result;
  }

  /**
   * Validate loaded data and report on quality
   */
  async validateData(
    assets: AssetSymbol[],
    start: Date,
    end: Date,
    granularity: DataGranularity
  ): Promise<DataValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const gaps: Array<{ asset: AssetSymbol; from: Date; to: Date }> = [];
    let totalCandles = 0;
    let missingDataPoints = 0;

    const allCandles = await this.loadCandles(assets, start, end, granularity);
    const intervalMs = granularityToMs(granularity);
    const expectedCount = Math.ceil((end.getTime() - start.getTime()) / intervalMs);

    for (const asset of assets) {
      const candles = allCandles.get(asset) ?? [];
      totalCandles += candles.length;

      if (candles.length === 0) {
        errors.push(`No data available for asset: ${asset}`);
        continue;
      }

      // Check for gaps
      for (let i = 1; i < candles.length; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const expectedNext = prev.timestamp.getTime() + intervalMs;
        const actualNext = curr.timestamp.getTime();

        if (actualNext > expectedNext + intervalMs * 0.5) {
          const gapCount = Math.round((actualNext - expectedNext) / intervalMs);
          missingDataPoints += gapCount;
          gaps.push({ asset, from: new Date(expectedNext), to: new Date(actualNext) });
        }
      }

      if (candles.length < expectedCount * 0.8) {
        warnings.push(
          `Asset ${asset} has only ${candles.length} of expected ${expectedCount} candles (${Math.round((candles.length / expectedCount) * 100)}%)`
        );
      }
    }

    return {
      valid: errors.length === 0,
      assetCount: assets.length,
      candleCount: totalCandles,
      dateRange: { start, end },
      missingDataPoints,
      gaps,
      warnings,
      errors,
    };
  }

  /**
   * Clear the data cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createProvider(config: Partial<DataSourceConfig>): HistoricalDataProvider {
    const type: DataSourceType = config.type ?? 'synthetic';

    switch (type) {
      case 'synthetic':
        return new SyntheticDataGenerator(config.syntheticConfig);
      case 'json':
        // For JSON provider, data must be pre-loaded
        return new SyntheticDataGenerator(config.syntheticConfig);
      default:
        return new SyntheticDataGenerator(config.syntheticConfig);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createHistoricalDataManager(
  config?: Partial<DataSourceConfig>
): HistoricalDataManager {
  return new HistoricalDataManager(config);
}

export function createSyntheticDataGenerator(
  config?: Partial<SyntheticDataConfig>
): SyntheticDataGenerator {
  return new SyntheticDataGenerator(config);
}

export function createJsonDataProvider(
  data: Map<AssetSymbol, OHLCVCandle[]>
): JsonDataProvider {
  return new JsonDataProvider(data);
}
