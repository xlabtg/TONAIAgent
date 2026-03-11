# Strategy Development Guide

This guide explains how to create custom trading strategies for the TON AI Agent platform. Strategies are the decision-making layer that analyze market data and generate trading signals.

---

## Table of Contents

1. [Overview](#overview)
2. [Strategy Architecture](#strategy-architecture)
3. [Creating Your First Strategy](#creating-your-first-strategy)
4. [Strategy Interface](#strategy-interface)
5. [Market Data](#market-data)
6. [Trade Signals](#trade-signals)
7. [Strategy Parameters](#strategy-parameters)
8. [Registering Strategies](#registering-strategies)
9. [Testing Strategies](#testing-strategies)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

---

## Overview

Strategies in TON AI Agent are responsible for:

- Analyzing market data (prices, volumes, indicators)
- Making trading decisions based on configurable logic
- Generating signals (BUY, SELL, or HOLD)
- Providing confidence scores and reasoning

### Built-in Strategies

| Strategy | Type | Description |
|----------|------|-------------|
| `trend` | Trend Following | Buys above SMA, sells below |
| `arbitrage` | Spread Detection | Detects cross-exchange price differences |
| `ai-signal` | Technical Analysis | RSI/MACD-based signals |

---

## Strategy Architecture

```
Agent Runtime
      │
      ▼
┌─────────────────────────────────────────┐
│          Strategy Engine                 │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  Registry   │  │  Execution      │  │
│  │             │  │  Engine         │  │
│  │  - Register │  │                 │  │
│  │  - Discover │  │  - Load         │  │
│  │  - Metadata │  │  - Execute      │  │
│  │             │  │  - Forward      │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Your Strategy            │   │
│  │                                  │   │
│  │  getMetadata()                   │   │
│  │  execute(marketData, params)     │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
      │
      ▼
Trading Engine
```

---

## Creating Your First Strategy

### Step 1: Create the Strategy File

Create a new file in `src/strategy-engine/strategies/`:

```typescript
// src/strategy-engine/strategies/my-strategy.ts

import { BaseStrategy } from '../interface';
import type {
  MarketData,
  StrategyMetadata,
  StrategyParams,
  TradeSignal,
} from '../types';

export class MyStrategy extends BaseStrategy {
  constructor(private readonly instanceParams: StrategyParams = {}) {
    super();
  }

  getMetadata(): StrategyMetadata {
    return {
      id: 'my-strategy',
      name: 'My Custom Strategy',
      description: 'A brief description of what this strategy does',
      version: '1.0.0',
      params: [
        {
          name: 'threshold',
          type: 'number',
          defaultValue: 0.05,
          description: 'Signal threshold percentage',
          min: 0.01,
          max: 0.5,
        },
        {
          name: 'asset',
          type: 'string',
          defaultValue: 'TON',
          description: 'Target asset to trade',
        },
      ],
      supportedAssets: ['TON', 'BTC', 'ETH'],
    };
  }

  async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    // Merge instance params with execution params
    const resolved = this.mergeParams({ ...this.instanceParams, ...params });

    const asset = String(resolved['asset']);
    const threshold = Number(resolved['threshold']);

    // Get the current price
    const currentPrice = this.getPrice(marketData, asset);

    if (currentPrice === undefined) {
      return this.createHoldSignal(asset, 'No market data available');
    }

    // Implement your strategy logic here
    const signal = this.analyzeAndDecide(currentPrice, threshold, asset);

    return signal;
  }

  private analyzeAndDecide(
    price: number,
    threshold: number,
    asset: string
  ): TradeSignal {
    // Example: Simple threshold-based logic
    // Replace with your actual strategy logic

    const basePrice = 5.0; // Example reference price
    const priceChange = (price - basePrice) / basePrice;

    let action: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    let reason: string;

    if (priceChange < -threshold) {
      action = 'BUY';
      confidence = Math.min(0.9, 0.5 + Math.abs(priceChange));
      reason = `${asset} is ${(priceChange * 100).toFixed(2)}% below reference — buying opportunity`;
    } else if (priceChange > threshold) {
      action = 'SELL';
      confidence = Math.min(0.9, 0.5 + Math.abs(priceChange));
      reason = `${asset} is ${(priceChange * 100).toFixed(2)}% above reference — taking profit`;
    } else {
      action = 'HOLD';
      confidence = 0.5;
      reason = `${asset} within threshold range — holding position`;
    }

    return {
      action,
      asset,
      amount: action === 'HOLD' ? '0' : '100000000', // 0.1 TON in nano
      confidence,
      reason,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
      metadata: {
        currentPrice: price,
        priceChange,
        threshold,
      },
    };
  }

  private createHoldSignal(asset: string, reason: string): TradeSignal {
    return {
      action: 'HOLD',
      asset,
      amount: '0',
      confidence: 0,
      reason,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
    };
  }
}
```

### Step 2: Export the Strategy

Add your strategy to the module exports:

```typescript
// src/strategy-engine/strategies/index.ts

export { TrendStrategy } from './trend-strategy';
export { ArbitrageStrategy } from './arbitrage-strategy';
export { AISignalStrategy } from './ai-signal-strategy';
export { MyStrategy } from './my-strategy'; // Add your strategy
```

### Step 3: Register the Strategy

Register your strategy with the Strategy Registry:

```typescript
import { createStrategyRegistry } from '@tonaiagent/core/strategy-engine';
import { MyStrategy } from './strategies/my-strategy';

const registry = createStrategyRegistry();

// Register your strategy
registry.register({
  metadata: new MyStrategy().getMetadata(),
  factory: (params) => new MyStrategy(params),
});

// Verify registration
console.log('Available strategies:', registry.list());
```

---

## Strategy Interface

All strategies must implement the `StrategyInterface`:

```typescript
interface StrategyInterface {
  /**
   * Returns the strategy's metadata including ID, name, description,
   * version, parameter definitions, and supported assets.
   */
  getMetadata(): StrategyMetadata;

  /**
   * Executes the strategy logic against the provided market data
   * and returns a trade signal.
   *
   * @param marketData - Current market data snapshot
   * @param params - Strategy parameters (merged with defaults)
   * @returns A trade signal indicating BUY, SELL, or HOLD
   */
  execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal>;
}
```

### Using BaseStrategy

The `BaseStrategy` abstract class provides helpful utilities:

```typescript
import { BaseStrategy } from '../interface';

class MyStrategy extends BaseStrategy {
  // mergeParams() - Merges provided params with defaults
  const resolved = this.mergeParams(params);

  // getPrice() - Safely gets price for an asset
  const price = this.getPrice(marketData, 'TON');

  // generateSignalId() - Creates unique signal identifiers
  const signalId = this.generateSignalId();
}
```

---

## Market Data

Strategies receive market data in a standardized format:

```typescript
interface MarketData {
  /** Map of asset symbol to price data */
  prices: Record<string, AssetPrice>;
  /** Data source identifier */
  source: string;
  /** When this market data was fetched */
  fetchedAt: Date;
}

interface AssetPrice {
  /** Asset symbol */
  asset: string;
  /** Current price in USD */
  price: number;
  /** 24-hour volume in USD */
  volume24h: number;
  /** Price change in percent over 24 hours */
  priceChange24h?: number;
  /** Timestamp of the price */
  timestamp: Date;
}
```

### Accessing Market Data

```typescript
async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
  // Get specific asset price
  const tonPrice = marketData.prices['TON'];

  if (tonPrice) {
    console.log('TON price:', tonPrice.price);
    console.log('24h change:', tonPrice.priceChange24h);
    console.log('Volume:', tonPrice.volume24h);
  }

  // Check available assets
  const availableAssets = Object.keys(marketData.prices);

  // Get data source
  console.log('Source:', marketData.source); // e.g., "coingecko", "binance"

  // Check data freshness
  const dataAge = Date.now() - marketData.fetchedAt.getTime();
  console.log('Data age (ms):', dataAge);
}
```

---

## Trade Signals

Strategies return trade signals with the following structure:

```typescript
interface TradeSignal {
  /** Signal action: BUY, SELL, or HOLD */
  action: 'BUY' | 'SELL' | 'HOLD';

  /** Target asset (e.g. "TON", "BTC") */
  asset: string;

  /** Amount in nanoTON or base units (as string for precision) */
  amount: string;

  /** Confidence score 0–1 */
  confidence: number;

  /** Human-readable reasoning for the signal */
  reason: string;

  /** Strategy that produced this signal */
  strategyId: string;

  /** Timestamp when the signal was generated */
  generatedAt: Date;

  /** Optional metadata (indicators, prices, etc.) */
  metadata?: Record<string, unknown>;
}
```

### Creating Signals

```typescript
// BUY signal
return {
  action: 'BUY',
  asset: 'TON',
  amount: '100000000', // 0.1 TON in nanoTON
  confidence: 0.85,
  reason: 'Strong bullish momentum detected',
  strategyId: this.getMetadata().id,
  generatedAt: new Date(),
  metadata: {
    indicator: 'RSI',
    value: 28,
  },
};

// SELL signal
return {
  action: 'SELL',
  asset: 'TON',
  amount: '500000000', // 0.5 TON
  confidence: 0.72,
  reason: 'Price reached take-profit target',
  strategyId: this.getMetadata().id,
  generatedAt: new Date(),
};

// HOLD signal
return {
  action: 'HOLD',
  asset: 'TON',
  amount: '0',
  confidence: 0.5,
  reason: 'No clear signal - maintaining position',
  strategyId: this.getMetadata().id,
  generatedAt: new Date(),
};
```

---

## Strategy Parameters

Parameters allow users to customize strategy behavior:

```typescript
interface StrategyParam {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean';
  /** Default value */
  defaultValue: string | number | boolean;
  /** Human-readable description */
  description: string;
  /** Optional minimum value for numbers */
  min?: number;
  /** Optional maximum value for numbers */
  max?: number;
}
```

### Defining Parameters

```typescript
getMetadata(): StrategyMetadata {
  return {
    id: 'momentum-crossover',
    name: 'Momentum Crossover',
    description: 'Trades based on fast/slow moving average crossover',
    version: '1.0.0',
    params: [
      {
        name: 'fastPeriod',
        type: 'number',
        defaultValue: 9,
        description: 'Fast moving average period',
        min: 2,
        max: 50,
      },
      {
        name: 'slowPeriod',
        type: 'number',
        defaultValue: 21,
        description: 'Slow moving average period',
        min: 10,
        max: 200,
      },
      {
        name: 'asset',
        type: 'string',
        defaultValue: 'TON',
        description: 'Asset to trade',
      },
      {
        name: 'confirmationRequired',
        type: 'boolean',
        defaultValue: true,
        description: 'Require confirmation candle before signal',
      },
    ],
    supportedAssets: ['TON', 'BTC', 'ETH'],
  };
}
```

### Using Parameters

```typescript
async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
  // Merge with defaults
  const resolved = this.mergeParams(params);

  // Extract typed parameters
  const fastPeriod = Number(resolved['fastPeriod']);
  const slowPeriod = Number(resolved['slowPeriod']);
  const asset = String(resolved['asset']);
  const confirmationRequired = Boolean(resolved['confirmationRequired']);

  // Use in strategy logic
  const fastMA = this.calculateMA(prices, fastPeriod);
  const slowMA = this.calculateMA(prices, slowPeriod);

  // ...
}
```

---

## Registering Strategies

### Manual Registration

```typescript
import { createStrategyRegistry } from '@tonaiagent/core/strategy-engine';
import { MyStrategy } from './my-strategy';

const registry = createStrategyRegistry();

registry.register({
  metadata: new MyStrategy().getMetadata(),
  factory: (params) => new MyStrategy(params),
});
```

### Auto-Registration via Loader

Add your strategy to the loader for automatic registration:

```typescript
// src/strategy-engine/loader.ts

import { MyStrategy } from './strategies/my-strategy';

// Add to built-in strategies array
const builtInStrategies = [
  TrendStrategy,
  ArbitrageStrategy,
  AISignalStrategy,
  MyStrategy, // Add here
];
```

### Checking Registration

```typescript
// List all registered strategies
const strategies = registry.list();
console.log('Registered strategies:', strategies);
// ['trend', 'arbitrage', 'ai-signal', 'my-strategy']

// Get strategy metadata
const metadata = registry.getMetadata('my-strategy');
console.log('Strategy name:', metadata.name);
console.log('Parameters:', metadata.params);

// Check if strategy exists
const exists = registry.has('my-strategy');
```

---

## Testing Strategies

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyStrategy } from './my-strategy';
import type { MarketData } from '../types';

describe('MyStrategy', () => {
  let strategy: MyStrategy;

  beforeEach(() => {
    strategy = new MyStrategy();
  });

  describe('getMetadata', () => {
    it('should return valid metadata', () => {
      const metadata = strategy.getMetadata();

      expect(metadata.id).toBe('my-strategy');
      expect(metadata.name).toBeDefined();
      expect(metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(metadata.params.length).toBeGreaterThan(0);
    });
  });

  describe('execute', () => {
    const createMarketData = (tonPrice: number): MarketData => ({
      prices: {
        TON: {
          asset: 'TON',
          price: tonPrice,
          volume24h: 1000000,
          priceChange24h: 5,
          timestamp: new Date(),
        },
      },
      source: 'test',
      fetchedAt: new Date(),
    });

    it('should return BUY signal when price is below threshold', async () => {
      const marketData = createMarketData(4.5); // Below reference

      const signal = await strategy.execute(marketData, {});

      expect(signal.action).toBe('BUY');
      expect(signal.confidence).toBeGreaterThan(0.5);
      expect(signal.asset).toBe('TON');
    });

    it('should return SELL signal when price is above threshold', async () => {
      const marketData = createMarketData(5.5); // Above reference

      const signal = await strategy.execute(marketData, {});

      expect(signal.action).toBe('SELL');
      expect(signal.confidence).toBeGreaterThan(0.5);
    });

    it('should return HOLD signal when price is within threshold', async () => {
      const marketData = createMarketData(5.0); // At reference

      const signal = await strategy.execute(marketData, {});

      expect(signal.action).toBe('HOLD');
    });

    it('should handle missing market data', async () => {
      const marketData: MarketData = {
        prices: {},
        source: 'test',
        fetchedAt: new Date(),
      };

      const signal = await strategy.execute(marketData, {});

      expect(signal.action).toBe('HOLD');
      expect(signal.confidence).toBe(0);
      expect(signal.reason).toContain('No market data');
    });

    it('should respect custom parameters', async () => {
      const marketData = createMarketData(5.2);

      // With tight threshold, should trigger SELL
      const signal = await strategy.execute(marketData, {
        threshold: 0.02, // 2% threshold
      });

      expect(signal.action).toBe('SELL');
    });
  });
});
```

### Integration Testing

```typescript
import { createStrategyExecutionEngine } from '@tonaiagent/core/strategy-engine';

describe('Strategy Integration', () => {
  let engine;

  beforeEach(async () => {
    engine = createStrategyExecutionEngine();
    await engine.start();
  });

  afterEach(async () => {
    await engine.stop();
  });

  it('should execute strategy through the engine', async () => {
    const result = await engine.executeStrategy({
      strategyId: 'my-strategy',
      agentId: 'test-agent',
      params: { threshold: 0.05 },
    });

    expect(result.success).toBe(true);
    expect(result.signal).toBeDefined();
    expect(result.signal.strategyId).toBe('my-strategy');
  });
});
```

### Backtesting

```typescript
import { createSandbox } from '@tonaiagent/core/sdk';
import { MyStrategy } from './my-strategy';

const sandbox = createSandbox({
  name: 'Strategy Backtest',
  initialBalance: 10000,
  marketDataSource: 'historical',
  startTimestamp: new Date('2024-01-01'),
  endTimestamp: new Date('2024-12-31'),
});

const strategy = new MyStrategy();

// Run backtest
const performance = await sandbox.runBacktest(
  async (state, prices) => {
    const marketData = {
      prices: Object.fromEntries(
        Array.from(prices.entries()).map(([asset, price]) => [
          asset,
          { asset, price, volume24h: 0, timestamp: new Date() },
        ])
      ),
      source: 'backtest',
      fetchedAt: new Date(),
    };

    const signal = await strategy.execute(marketData, {});

    return {
      action: signal.action.toLowerCase(),
      asset: signal.asset,
      amount: parseInt(signal.amount) / 1e9, // Convert from nano
    };
  },
  { stepMs: 24 * 60 * 60 * 1000 } // Daily steps
);

console.log('Backtest Results:');
console.log('  Total PnL:', performance.totalPnl);
console.log('  Win Rate:', performance.winRate);
console.log('  Sharpe Ratio:', performance.sharpeRatio);
console.log('  Max Drawdown:', performance.maxDrawdown);
```

---

## Best Practices

### 1. Always Handle Missing Data

```typescript
async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
  const price = this.getPrice(marketData, asset);

  if (price === undefined) {
    return {
      action: 'HOLD',
      asset,
      amount: '0',
      confidence: 0,
      reason: `No market data for ${asset}`,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
    };
  }

  // Proceed with strategy logic
}
```

### 2. Provide Meaningful Reasons

```typescript
// Good
reason: `TON price $5.50 is 10% above 14-period SMA $5.00 — strong bullish trend`;

// Bad
reason: `BUY signal generated`;
```

### 3. Include Relevant Metadata

```typescript
return {
  // ... signal fields
  metadata: {
    currentPrice: price,
    sma: movingAverage,
    rsi: rsiValue,
    volume: volume24h,
    signalStrength: Math.abs(deviation),
  },
};
```

### 4. Keep Strategies Stateless (When Possible)

If state is needed, encapsulate it properly:

```typescript
export class StatefulStrategy extends BaseStrategy {
  // State is instance-scoped
  private readonly priceHistory: number[] = [];

  async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    // Update state
    this.priceHistory.push(currentPrice);

    // Trim to window size
    if (this.priceHistory.length > maxPeriods) {
      this.priceHistory.shift();
    }

    // Use state in calculations
    const average = this.calculateAverage(this.priceHistory);
  }
}
```

### 5. Validate Parameters

```typescript
async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
  const resolved = this.mergeParams(params);
  const period = Number(resolved['period']);

  // Validate
  if (period < 2 || period > 200) {
    throw new Error(`Invalid period: ${period}. Must be between 2 and 200.`);
  }

  // Proceed
}
```

---

## Examples

### RSI Strategy

```typescript
export class RSIStrategy extends BaseStrategy {
  private priceHistory: number[] = [];

  getMetadata(): StrategyMetadata {
    return {
      id: 'rsi',
      name: 'RSI Strategy',
      description: 'Relative Strength Index based trading',
      version: '1.0.0',
      params: [
        { name: 'period', type: 'number', defaultValue: 14, description: 'RSI period', min: 7, max: 50 },
        { name: 'oversold', type: 'number', defaultValue: 30, description: 'Oversold threshold', min: 10, max: 40 },
        { name: 'overbought', type: 'number', defaultValue: 70, description: 'Overbought threshold', min: 60, max: 90 },
        { name: 'asset', type: 'string', defaultValue: 'TON', description: 'Asset to trade' },
      ],
      supportedAssets: ['TON', 'BTC', 'ETH'],
    };
  }

  async execute(marketData: MarketData, params: StrategyParams): Promise<TradeSignal> {
    const resolved = this.mergeParams(params);
    const period = Number(resolved['period']);
    const oversold = Number(resolved['oversold']);
    const overbought = Number(resolved['overbought']);
    const asset = String(resolved['asset']);

    const price = this.getPrice(marketData, asset);
    if (!price) {
      return this.holdSignal(asset, 'No market data');
    }

    this.priceHistory.push(price);
    if (this.priceHistory.length > period + 1) {
      this.priceHistory.shift();
    }

    if (this.priceHistory.length < period + 1) {
      return this.holdSignal(asset, `Collecting data: ${this.priceHistory.length}/${period + 1}`);
    }

    const rsi = this.calculateRSI(this.priceHistory);

    if (rsi < oversold) {
      return {
        action: 'BUY',
        asset,
        amount: '100000000',
        confidence: Math.min(0.9, 0.5 + (oversold - rsi) / 100),
        reason: `RSI ${rsi.toFixed(1)} is oversold (< ${oversold})`,
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata: { rsi, period },
      };
    }

    if (rsi > overbought) {
      return {
        action: 'SELL',
        asset,
        amount: '100000000',
        confidence: Math.min(0.9, 0.5 + (rsi - overbought) / 100),
        reason: `RSI ${rsi.toFixed(1)} is overbought (> ${overbought})`,
        strategyId: this.getMetadata().id,
        generatedAt: new Date(),
        metadata: { rsi, period },
      };
    }

    return this.holdSignal(asset, `RSI ${rsi.toFixed(1)} is neutral`);
  }

  private calculateRSI(prices: number[]): number {
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private holdSignal(asset: string, reason: string): TradeSignal {
    return {
      action: 'HOLD',
      asset,
      amount: '0',
      confidence: 0.5,
      reason,
      strategyId: this.getMetadata().id,
      generatedAt: new Date(),
    };
  }
}
```

---

## Next Steps

- Review the [Strategy Engine Source](../src/strategy-engine/)
- Check built-in strategies in [`src/strategy-engine/strategies/`](../src/strategy-engine/strategies/)
- Learn about [Plugin Development](plugin-development.md)
- Read the [Contributing Guide](../CONTRIBUTING.md)
