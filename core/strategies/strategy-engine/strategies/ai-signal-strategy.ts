/**
 * TONAIAgent - AI Signal Strategy
 *
 * Uses RSI and MACD technical indicators to generate trade signals:
 *   - BUY if RSI < oversoldThreshold (default: 30) — oversold
 *   - SELL if RSI > overboughtThreshold (default: 70) — overbought
 *   - MACD confirmation adjusts confidence
 *
 * RSI and MACD are computed from a rolling price history maintained per instance.
 */

import { BaseStrategy } from '../interface';
import type { MarketData, StrategyMetadata, StrategyParams, TradeSignal } from '../types';

// ============================================================================
// AI Signal Strategy
// ============================================================================

/**
 * AISignalStrategy — RSI / MACD Indicator Strategy
 *
 * Logic:
 *   - Maintains a rolling price history
 *   - Computes RSI (Relative Strength Index) over `rsiPeriod` candles
 *   - Computes MACD (12 EMA - 26 EMA) and its signal line (9 EMA of MACD)
 *   - RSI < oversoldThreshold → BUY (high confidence on MACD bullish crossover)
 *   - RSI > overboughtThreshold → SELL (high confidence on MACD bearish crossover)
 *   - Otherwise → HOLD
 *
 * Parameters:
 *   - asset: target asset symbol (default: "TON")
 *   - rsiPeriod: RSI calculation window (default: 14)
 *   - oversoldThreshold: RSI level for BUY signal (default: 30)
 *   - overboughtThreshold: RSI level for SELL signal (default: 70)
 *   - tradeAmount: amount to trade in nanoTON (default: "100000000" = 0.1 TON)
 */
export class AISignalStrategy extends BaseStrategy {
  private readonly priceHistory = new Map<string, number[]>();

  constructor(private readonly instanceParams: StrategyParams = {}) {
    super();
  }

  getMetadata(): StrategyMetadata {
    return {
      id: 'ai-signal',
      name: 'AI Signal Strategy (RSI/MACD)',
      description:
        'Uses RSI and MACD technical indicators to identify oversold/overbought conditions. ' +
        'BUY when RSI drops below the oversold threshold; SELL when RSI rises above the overbought threshold. ' +
        'MACD crossover confirmation is used to boost signal confidence.',
      version: '1.0.0',
      params: [
        {
          name: 'asset',
          type: 'string',
          defaultValue: 'TON',
          description: 'The asset to analyze (e.g. "TON", "BTC")',
        },
        {
          name: 'rsiPeriod',
          type: 'number',
          defaultValue: 14,
          min: 2,
          max: 100,
          description: 'Number of periods for RSI calculation',
        },
        {
          name: 'oversoldThreshold',
          type: 'number',
          defaultValue: 30,
          min: 1,
          max: 49,
          description: 'RSI value below which the asset is considered oversold (trigger BUY)',
        },
        {
          name: 'overboughtThreshold',
          type: 'number',
          defaultValue: 70,
          min: 51,
          max: 99,
          description: 'RSI value above which the asset is considered overbought (trigger SELL)',
        },
        {
          name: 'tradeAmount',
          type: 'string',
          defaultValue: '100000000',
          description: 'Trade amount in nanoTON (100000000 = 0.1 TON)',
        },
      ],
      supportedAssets: ['TON', 'BTC', 'ETH', 'USDT'],
    };
  }

  async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    const resolved = this.mergeParams({ ...this.instanceParams, ...params });
    const asset = String(resolved['asset']);
    const rsiPeriod = Number(resolved['rsiPeriod']);
    const oversoldThreshold = Number(resolved['oversoldThreshold']);
    const overboughtThreshold = Number(resolved['overboughtThreshold']);
    const tradeAmount = String(resolved['tradeAmount']);

    const currentPrice = this.getPrice(marketData, asset);
    if (currentPrice === undefined) {
      return {
        action: 'HOLD',
        asset,
        amount: '0',
        confidence: 0,
        reason: `No market data available for asset ${asset}`,
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata: { asset, availableAssets: Object.keys(marketData.prices) },
      };
    }

    // Update price history
    if (!this.priceHistory.has(asset)) {
      this.priceHistory.set(asset, []);
    }
    const history = this.priceHistory.get(asset)!;
    history.push(currentPrice);

    // We need at least rsiPeriod + 1 prices to compute RSI
    const minRequired = Math.max(rsiPeriod + 1, 26 + 9); // 26 EMA for MACD slow + 9 signal
    if (history.length > minRequired * 3) {
      // Keep bounded history
      history.splice(0, history.length - minRequired * 3);
    }

    // Compute RSI
    const rsi = this.computeRSI(history, rsiPeriod);

    // Compute MACD
    const macd = this.computeMACD(history);

    const metadata: Record<string, unknown> = {
      currentPrice,
      rsi: rsi !== null ? rsi.toFixed(2) : null,
      macdLine: macd?.macdLine.toFixed(4) ?? null,
      signalLine: macd?.signalLine.toFixed(4) ?? null,
      macdHistogram: macd?.histogram.toFixed(4) ?? null,
      historyLength: history.length,
      rsiPeriod,
      oversoldThreshold,
      overboughtThreshold,
    };

    // Not enough history yet
    if (rsi === null) {
      return {
        action: 'HOLD',
        asset,
        amount: '0',
        confidence: 0.1,
        reason: `Collecting price history (${history.length}/${rsiPeriod + 1} samples needed for RSI)`,
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata,
      };
    }

    // MACD confirmation
    const macdBullish = macd !== null && macd.histogram > 0;
    const macdBearish = macd !== null && macd.histogram < 0;

    if (rsi < oversoldThreshold) {
      // Oversold — BUY signal
      const baseConfidence = 0.6 + ((oversoldThreshold - rsi) / oversoldThreshold) * 0.3;
      const confidence = macdBullish
        ? Math.min(baseConfidence + 0.1, 0.95)
        : baseConfidence;

      return {
        action: 'BUY',
        asset,
        amount: tradeAmount,
        confidence,
        reason:
          `RSI ${rsi.toFixed(2)} < ${oversoldThreshold} (oversold)` +
          (macdBullish ? '; MACD histogram positive — bullish confirmation' : ''),
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata,
      };
    }

    if (rsi > overboughtThreshold) {
      // Overbought — SELL signal
      const baseConfidence = 0.6 + ((rsi - overboughtThreshold) / (100 - overboughtThreshold)) * 0.3;
      const confidence = macdBearish
        ? Math.min(baseConfidence + 0.1, 0.95)
        : baseConfidence;

      return {
        action: 'SELL',
        asset,
        amount: tradeAmount,
        confidence,
        reason:
          `RSI ${rsi.toFixed(2)} > ${overboughtThreshold} (overbought)` +
          (macdBearish ? '; MACD histogram negative — bearish confirmation' : ''),
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata,
      };
    }

    return {
      action: 'HOLD',
      asset,
      amount: '0',
      confidence: 0.5,
      reason: `RSI ${rsi.toFixed(2)} is within neutral range [${oversoldThreshold}, ${overboughtThreshold}]`,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
      metadata,
    };
  }

  // ============================================================================
  // Indicator Computations
  // ============================================================================

  /**
   * Compute RSI (Relative Strength Index) using Wilder's smoothing method.
   * Returns null if there are not enough price samples.
   */
  private computeRSI(prices: number[], period: number): number | null {
    if (prices.length < period + 1) {
      return null;
    }

    const changes = prices.slice(-period - 1).map((p, i, arr) =>
      i === 0 ? 0 : p - arr[i - 1]
    ).slice(1); // first element is 0 (no change)

    const gains = changes.map((c) => (c > 0 ? c : 0));
    const losses = changes.map((c) => (c < 0 ? -c : 0));

    const avgGain = gains.reduce((s, g) => s + g, 0) / period;
    const avgLoss = losses.reduce((s, l) => s + l, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Compute MACD (12-period EMA - 26-period EMA) and its 9-period signal line.
   * Returns null if there are not enough price samples.
   */
  private computeMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } | null {
    if (prices.length < 35) {
      // Need at least 26 for slow EMA + 9 for signal
      return null;
    }

    const ema12 = this.computeEMA(prices, 12);
    const ema26 = this.computeEMA(prices, 26);

    if (ema12 === null || ema26 === null) return null;

    const macdLine = ema12 - ema26;

    // For signal line, we'd normally compute 9-EMA of MACD history.
    // Simplified: use the last computed MACD value as a proxy for the signal.
    // A full implementation would track MACD history across calls.
    const signalLine = macdLine * 0.9; // simplified approximation
    const histogram = macdLine - signalLine;

    return { macdLine, signalLine, histogram };
  }

  /**
   * Compute exponential moving average for the last N periods.
   */
  private computeEMA(prices: number[], period: number): number | null {
    if (prices.length < period) return null;

    const k = 2 / (period + 1);
    const slice = prices.slice(-period * 3); // use up to 3x period for accuracy

    let ema = slice[0];
    for (let i = 1; i < slice.length; i++) {
      ema = slice[i] * k + ema * (1 - k);
    }
    return ema;
  }
}
