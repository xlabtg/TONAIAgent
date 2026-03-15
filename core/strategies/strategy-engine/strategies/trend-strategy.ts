/**
 * TONAIAgent - Trend Strategy
 *
 * A simple trend-following strategy: buy if price > moving average, sell if price < moving average.
 * The moving average is computed from the asset's simulated price history stored across calls.
 * For the MVP, we simulate the moving average with a lightweight sliding approach.
 */

import { BaseStrategy } from '../interface';
import type { MarketData, StrategyMetadata, StrategyParams, TradeSignal } from '../types';

// ============================================================================
// Trend Strategy
// ============================================================================

/**
 * TrendStrategy — Trend Following
 *
 * Logic:
 *   - Maintains a rolling price history per asset (up to `movingAveragePeriods` samples)
 *   - On each execution, adds the current price and computes the simple moving average
 *   - If current price > SMA → BUY signal
 *   - If current price < SMA → SELL signal
 *   - If price == SMA → HOLD signal
 *
 * Parameters:
 *   - asset: target asset symbol (default: "TON")
 *   - movingAveragePeriods: how many periods to use for the SMA (default: 14)
 *   - tradeAmount: amount to trade in nanoTON (default: "100000000" = 0.1 TON)
 */
export class TrendStrategy extends BaseStrategy {
  // Rolling price history per asset — preserved across executions in the same instance
  private readonly priceHistory = new Map<string, number[]>();

  constructor(private readonly instanceParams: StrategyParams = {}) {
    super();
  }

  getMetadata(): StrategyMetadata {
    return {
      id: 'trend',
      name: 'Trend Following Strategy',
      description:
        'Buy if the current price is above the simple moving average; sell if below. ' +
        'Classic momentum / trend-following approach suitable for medium-term crypto trading.',
      version: '1.0.0',
      params: [
        {
          name: 'asset',
          type: 'string',
          defaultValue: 'TON',
          description: 'The asset to trade (e.g. "TON", "BTC")',
        },
        {
          name: 'movingAveragePeriods',
          type: 'number',
          defaultValue: 14,
          min: 2,
          max: 200,
          description: 'Number of price samples to use for the simple moving average',
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
    const periods = Number(resolved['movingAveragePeriods']);
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

    // Keep history bounded to the window size
    if (history.length > periods) {
      history.splice(0, history.length - periods);
    }

    const sma = history.reduce((sum, p) => sum + p, 0) / history.length;
    const deviation = ((currentPrice - sma) / sma) * 100; // percentage deviation

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    if (currentPrice > sma) {
      action = 'BUY';
      // Confidence scales with how far above the SMA we are (capped at 0.95)
      confidence = Math.min(0.5 + Math.abs(deviation) * 0.05, 0.95);
      reason = `${asset} price $${currentPrice.toFixed(4)} is above ${periods}-period SMA $${sma.toFixed(4)} (+${deviation.toFixed(2)}%) — bullish trend`;
    } else if (currentPrice < sma) {
      action = 'SELL';
      confidence = Math.min(0.5 + Math.abs(deviation) * 0.05, 0.95);
      reason = `${asset} price $${currentPrice.toFixed(4)} is below ${periods}-period SMA $${sma.toFixed(4)} (${deviation.toFixed(2)}%) — bearish trend`;
    } else {
      action = 'HOLD';
      confidence = 0.5;
      reason = `${asset} price $${currentPrice.toFixed(4)} is at SMA $${sma.toFixed(4)} — no clear trend`;
    }

    return {
      action,
      asset,
      amount: action === 'HOLD' ? '0' : tradeAmount,
      confidence,
      reason,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
      metadata: {
        currentPrice,
        sma,
        deviationPct: deviation,
        historyLength: history.length,
        periods,
      },
    };
  }
}
