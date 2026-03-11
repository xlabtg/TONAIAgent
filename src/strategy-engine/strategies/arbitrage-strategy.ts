/**
 * TONAIAgent - Arbitrage Strategy
 *
 * Detects price differences between simulated exchanges and generates
 * a BUY signal when a profitable spread is found.
 *
 * For the MVP, exchange prices are simulated by adding small random noise
 * to the market data price. In production, this would call real exchange APIs.
 */

import { BaseStrategy } from '../interface';
import type { MarketData, StrategyMetadata, StrategyParams, TradeSignal } from '../types';

// ============================================================================
// Arbitrage Strategy
// ============================================================================

/** Simulated exchange entry */
interface SimulatedExchange {
  name: string;
  /** Price offset multiplier (e.g. 1.002 = 0.2% above market) */
  offsetMultiplier: number;
}

// Fixed simulated exchanges used in the MVP
const SIMULATED_EXCHANGES: SimulatedExchange[] = [
  { name: 'ExchangeA', offsetMultiplier: 1.0 },
  { name: 'ExchangeB', offsetMultiplier: 1.0015 }, // 0.15% premium
  { name: 'ExchangeC', offsetMultiplier: 0.999 }, // 0.1% discount
];

/**
 * ArbitrageStrategy — Basic Arbitrage (Simulated)
 *
 * Logic:
 *   - Simulates prices on multiple exchanges by applying small offset multipliers
 *   - Computes the spread between the highest and lowest exchange price
 *   - If spread > minSpreadPct → BUY on cheapest, sell on most expensive
 *   - Confidence is proportional to the spread
 *
 * Parameters:
 *   - asset: target asset symbol (default: "TON")
 *   - minSpreadPct: minimum spread percentage to trigger a signal (default: 0.1)
 *   - tradeAmount: amount to trade in nanoTON (default: "100000000" = 0.1 TON)
 */
export class ArbitrageStrategy extends BaseStrategy {
  constructor(private readonly instanceParams: StrategyParams = {}) {
    super();
  }

  getMetadata(): StrategyMetadata {
    return {
      id: 'arbitrage',
      name: 'Basic Arbitrage Strategy',
      description:
        'Detects price differences between simulated exchanges and generates a BUY signal ' +
        'when a profitable spread exceeds the minimum threshold. Simulated for MVP; ' +
        'production would connect to real exchange APIs.',
      version: '1.0.0',
      params: [
        {
          name: 'asset',
          type: 'string',
          defaultValue: 'TON',
          description: 'The asset to scan for arbitrage (e.g. "TON", "BTC")',
        },
        {
          name: 'minSpreadPct',
          type: 'number',
          defaultValue: 0.1,
          min: 0.01,
          max: 10,
          description: 'Minimum price spread percentage between exchanges to trigger a BUY signal',
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
    const minSpreadPct = Number(resolved['minSpreadPct']);
    const tradeAmount = String(resolved['tradeAmount']);

    const basePrice = this.getPrice(marketData, asset);
    if (basePrice === undefined) {
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

    // Simulate exchange prices
    const exchangePrices = SIMULATED_EXCHANGES.map((ex) => ({
      exchange: ex.name,
      price: basePrice * ex.offsetMultiplier * (1 + (Math.random() - 0.5) * 0.002), // ±0.1% noise
    }));

    const prices = exchangePrices.map((e) => e.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spreadPct = ((maxPrice - minPrice) / minPrice) * 100;

    const cheapest = exchangePrices.find((e) => e.price === minPrice)!;
    const mostExpensive = exchangePrices.find((e) => e.price === maxPrice)!;

    if (spreadPct >= minSpreadPct) {
      // Profitable spread found
      const confidence = Math.min(0.4 + (spreadPct / minSpreadPct) * 0.15, 0.9);
      return {
        action: 'BUY',
        asset,
        amount: tradeAmount,
        confidence,
        reason:
          `Arbitrage opportunity: buy ${asset} on ${cheapest.exchange} at $${cheapest.price.toFixed(4)}, ` +
          `sell on ${mostExpensive.exchange} at $${mostExpensive.price.toFixed(4)} ` +
          `(spread: ${spreadPct.toFixed(3)}% > threshold ${minSpreadPct}%)`,
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata: {
          basePrice,
          exchangePrices,
          spreadPct,
          minSpreadPct,
          cheapestExchange: cheapest.exchange,
          mostExpensiveExchange: mostExpensive.exchange,
        },
      };
    }

    return {
      action: 'HOLD',
      asset,
      amount: '0',
      confidence: 0.3,
      reason:
        `No arbitrage opportunity: spread ${spreadPct.toFixed(3)}% is below threshold ${minSpreadPct}%`,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
      metadata: {
        basePrice,
        exchangePrices,
        spreadPct,
        minSpreadPct,
      },
    };
  }
}
