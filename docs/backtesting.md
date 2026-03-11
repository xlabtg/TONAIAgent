# TONAIAgent - Strategy Backtesting Framework

## Overview

The Strategy Backtesting Framework provides a comprehensive, standalone system for validating strategies through historical simulation before deploying with live capital. It covers historical data replay, simulated trading, performance analysis, risk evaluation, and structured reporting.

### Key Features

- **Historical Market Data Layer**: OHLCV candles, trade history, order book snapshots, and volatility indicators
- **Market Replay Engine**: Sequential, event-driven replay of historical data with realistic timing
- **Simulation Environment**: Sandboxed capital allocation with slippage, fees, and fill modeling
- **Performance Analysis**: Sharpe ratio, Sortino ratio, max drawdown, VaR, CVaR, win rate, and more
- **Risk Evaluation**: Integration with Risk Engine v1 — drawdown scenarios, asset concentration, exposure volatility
- **Structured Reports**: Human-readable and JSON reports with equity curve, trade history, and marketplace metrics

---

## Architecture

```
Historical Market Data (OHLCV, Trades, Order Books, Volatility)
                    |
          Historical Data Manager
         (load, cache, validate data)
                    |
         Market Replay Engine
       (sequential event-driven replay)
                    |
    Strategy Logic via onCandle() callback
                    |
       Simulation Environment
  (order execution, slippage, fees, P&L)
                    |
         Performance Calculator
   (Sharpe, Sortino, drawdown, VaR, etc.)
                    |
        Risk Evaluator (Risk Engine v1)
  (drawdown scenarios, concentration, grade)
                    |
       Backtest Report Generator
  (structured summary, equity curve, hints)
```

---

## Quick Start

```typescript
import { createBacktestingFramework, DEFAULT_SLIPPAGE_MODEL, DEFAULT_FEE_MODEL, DEFAULT_FILL_MODEL } from '@tonaiagent/core/backtesting';

const framework = createBacktestingFramework();

const result = await framework.run({
  strategyId: 'strategy_001',
  strategyName: 'DCA TON',
  strategySpec: {
    assets: ['TON'],
    onCandle: async (candle, portfolio, placeOrder) => {
      // Buy $100 of TON every day if we have enough cash
      if (portfolio.cash >= 100) {
        await placeOrder({
          asset: 'TON',
          side: 'buy',
          type: 'market',
          amount: 100,
          amountType: 'usd',
        });
      }
    },
  },
  dataConfig: {
    type: 'synthetic',
    assets: ['TON'],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    granularity: '1d',
  },
  simulationConfig: {
    initialCapital: 10000,
    currency: 'USD',
    slippageModel: DEFAULT_SLIPPAGE_MODEL,
    feeModel: DEFAULT_FEE_MODEL,
    fillModel: DEFAULT_FILL_MODEL,
  },
  riskEvaluation: true,
  generateReport: true,
});

// Print summary in the issue-required format:
// Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85
console.log(framework.reports.formatSummaryString(result.report!));
```

---

## Core Components

### 1. Historical Market Data Layer

The data layer provides OHLCV candles, trade history, order book snapshots, and volatility indicators.

**Data Structure** (as specified in issue #155):
```typescript
interface OHLCVCandle {
  timestamp: Date;
  asset: AssetSymbol;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

**Supported Data Sources:**
- `'synthetic'` — Geometric Brownian Motion simulation (deterministic with seed)
- `'json'` — Pre-loaded candle data via `JsonDataProvider`
- Custom providers implementing `HistoricalDataProvider` interface

```typescript
import {
  createHistoricalDataManager,
  createSyntheticDataGenerator,
  createJsonDataProvider,
} from '@tonaiagent/core/backtesting';

// Synthetic data (default)
const manager = createHistoricalDataManager({
  type: 'synthetic',
  syntheticConfig: {
    initialPrices: { TON: 5.0, USDT: 1.0 },
    volatility: 0.03,
    drift: 0.0005,
    seed: 42, // For deterministic results
  },
});

// Load candles for multiple assets
const data = await manager.loadCandles(
  ['TON', 'USDT'],
  new Date('2024-01-01'),
  new Date('2024-06-30'),
  '1d'
);

// Validate data quality
const validation = await manager.validateData(['TON'], start, end, '1d');
console.log(`Valid: ${validation.valid}, Candles: ${validation.candleCount}`);
```

**Custom Data Provider:**
```typescript
import { HistoricalDataProvider, createHistoricalDataManager } from '@tonaiagent/core/backtesting';

class MyDataProvider implements HistoricalDataProvider {
  async getCandles(asset, start, end, granularity) {
    // Fetch from your database/API
    return fetchFromDatabase(asset, start, end, granularity);
  }
  // ... implement other methods
}

const manager = createHistoricalDataManager();
manager.setProvider(new MyDataProvider());
```

---

### 2. Market Replay Engine

The Market Replay Engine replays historical data sequentially, firing events for each candle.

```
Historical Data → Market Replay Engine → Strategy Agent → Simulated Trades
```

**Flow:**
1. Creates a `MarketReplaySession` with the desired config
2. Initializes by loading all data from the data manager
3. Iterates through sorted timestamps sequentially
4. Calls `onCandle` handler for each time step

```typescript
import { createHistoricalDataManager, createMarketReplayEngine } from '@tonaiagent/core/backtesting';

const dataManager = createHistoricalDataManager();
const replayEngine = createMarketReplayEngine(dataManager);

const session = replayEngine.createSession({
  speed: 'instant',        // 'instant' | 'fast' | 'realtime' | <ms>
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
  granularity: '1d',
  assets: ['TON'],
});

await session.initialize();

session.onEvent((event) => {
  console.log(event.type, event.data);
});

await session.run(async (timestamp, candles, currentPrices) => {
  // Your strategy logic here
  const tonPrice = currentPrices.get('TON');
  console.log(`${timestamp.toDateString()}: TON = $${tonPrice}`);
});
```

**Replay Speeds:**
| Speed | Description |
|-------|-------------|
| `'instant'` | No delay between candles (fastest) |
| `'fast'` | No delay (alias for instant) |
| `'realtime'` | Waits candle duration between events |
| `number (ms)` | Custom delay in milliseconds |

---

### 3. Simulation Environment

The simulation environment provides sandboxed capital allocation with realistic order execution.

```typescript
import { createSimulationEnvironment, DEFAULT_SLIPPAGE_MODEL, DEFAULT_FEE_MODEL, DEFAULT_FILL_MODEL } from '@tonaiagent/core/backtesting';

const simEnv = createSimulationEnvironment('backtest_001', {
  initialCapital: 10000,
  currency: 'USD',
  slippageModel: { type: 'volume_based', baseSlippage: 10, volumeImpactFactor: 0.001 },
  feeModel: { tradingFeePercent: 0.3, gasCostUsd: 0.05 },
  fillModel: { type: 'immediate' },
});

// Place orders (called from strategy's onCandle)
const order = await simEnv.placeOrder(
  { asset: 'TON', side: 'buy', type: 'market', amount: 100, amountType: 'usd' },
  currentPrices
);

// Update prices at each candle
simEnv.updatePrices(timestamp, currentPrices);

// Get current portfolio state
const portfolio = simEnv.getPortfolio();
console.log(`Cash: $${portfolio.cash}, Total Value: $${portfolio.totalValue}`);
```

**Amount Types:**
| Type | Description |
|------|-------------|
| `'units'` | Direct asset units (default) |
| `'usd'` | Dollar value (converted at current price) |
| `'percent'` | % of available cash (buy) or position (sell) |

**Slippage Models:**
| Model | Description |
|-------|-------------|
| `'fixed'` | Constant slippage in basis points |
| `'volume_based'` | Slippage increases with order size |
| `'market_impact'` | Power-law market impact model |

---

### 4. Performance Analysis

Calculates comprehensive performance metrics from the backtest results.

**Metrics calculated:**

| Category | Metrics |
|----------|---------|
| Returns | Total return, annualized return, absolute profit |
| Risk | Sharpe ratio, Sortino ratio, Calmar ratio, max drawdown, volatility, VaR 95%, CVaR 95% |
| Trades | Win rate, profit factor, expectancy, average win/loss |
| Monthly | Monthly return breakdown, best/worst month |

```typescript
import { createPerformanceCalculator } from '@tonaiagent/core/backtesting';

const calculator = createPerformanceCalculator(0.05); // 5% risk-free rate

const report = calculator.buildReport(
  'backtest_001',
  'DCA TON',
  10000,          // initial capital
  equityCurve,
  orders
);

console.log(`Return: ${report.summary.totalReturn.toFixed(1)}%`);
console.log(`Sharpe: ${report.risk.sharpeRatio.toFixed(2)}`);
console.log(`Max Drawdown: ${report.risk.maxDrawdown.toFixed(1)}%`);

// Monte Carlo analysis
const mc = calculator.runMonteCarlo(orders, 1000, 0.95);
console.log(`Probability of Profit: ${mc.probabilityOfProfit.toFixed(0)}%`);
```

---

### 5. Risk Evaluation (Risk Engine v1 Integration)

Evaluates the backtest against risk criteria from Risk Engine v1.

**Checks performed:**
1. **Drawdown Scenarios**: Evaluates strategy survival against predefined scenarios (Market Correction, Bear Market, Crypto Crash, Flash Crash)
2. **Asset Concentration Risk**: Flags assets that exceed the maximum allowed portfolio allocation
3. **Exposure Volatility**: Measures each asset's contribution to portfolio volatility
4. **Risk Grading**: A/B/C/D/F based on combined score

```typescript
import { createBacktestRiskEvaluator, DEFAULT_DRAWDOWN_SCENARIOS } from '@tonaiagent/core/backtesting';

const evaluator = createBacktestRiskEvaluator({
  maxAcceptableDrawdown: 30,    // Max drawdown % to pass
  minAcceptableSharpe: 0.5,     // Min Sharpe ratio to pass
  maxConcentrationPercent: 50,  // Max single-asset allocation %
  minWinRate: 30,               // Min win rate %
});

const riskResult = evaluator.evaluate(
  'backtest_001',
  performanceReport,
  orders,
  equityCurve
);

console.log(`Risk Grade: ${riskResult.riskGrade}`);
console.log(`Risk Score: ${riskResult.overallRiskScore}/100`);
console.log(`Passed: ${riskResult.passed}`);

for (const rec of riskResult.recommendations) {
  console.log(`[${rec.severity.toUpperCase()}] ${rec.description}`);
  console.log(`  → ${rec.suggestedAction}`);
}
```

**Risk Grades:**
| Grade | Score | Description |
|-------|-------|-------------|
| A | 85-100 | Excellent risk profile |
| B | 70-84 | Good risk management |
| C | 55-69 | Acceptable, improvements suggested |
| D | 40-54 | High risk, significant changes needed |
| F | 0-39 | Failed risk evaluation |

---

### 6. Structured Backtest Reports

Generates structured reports in both human-readable and JSON formats.

```typescript
import { createReportGenerator } from '@tonaiagent/core/backtesting';

const generator = createReportGenerator();
const report = generator.generateReport(backtestRunResult);

// Issue-required summary format:
// "Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85"
const summary = generator.formatSummaryString(report);
console.log(summary);

// Full detailed text report
const fullReport = generator.formatDetailedReport(report);
console.log(fullReport);

// JSON for API/storage
const json = generator.toJSON(report);
```

**Report Contents:**
| Section | Description |
|---------|-------------|
| `summary` | Capital start/end, return, drawdown, Sharpe, risk grade |
| `performance` | Full performance metrics and equity curve |
| `riskEvaluation` | Risk grade, scenarios, recommendations |
| `tradeHistory` | All simulated orders with timestamps and P&L |
| `equityCurve` | Equity value at each time step |
| `monteCarlo` | (optional) Monte Carlo distribution |
| `marketplaceMetrics` | Rating, risk category, min capital, scores |
| `optimizationHints` | Parameter improvement suggestions |

---

## Strategy Specification

Strategies are defined as a `BacktestStrategySpec` with an event-driven `onCandle` callback:

```typescript
interface BacktestStrategySpec {
  assets: AssetSymbol[];

  // Called for every candle during replay
  onCandle: (
    candle: OHLCVCandle,
    portfolio: Readonly<PortfolioState>,
    placeOrder: (order: PlaceOrderRequest) => Promise<SimulatedOrder>
  ) => void | Promise<void>;

  // Optional lifecycle hooks
  onStart?: (portfolio: Readonly<PortfolioState>) => void | Promise<void>;
  onEnd?: (portfolio: Readonly<PortfolioState>) => void | Promise<void>;

  parameters?: Record<string, number | string | boolean>;
}
```

**Example Strategies:**

**DCA (Dollar-Cost Averaging):**
```typescript
{
  assets: ['TON'],
  onCandle: async (candle, portfolio, placeOrder) => {
    if (portfolio.cash >= 100) {
      await placeOrder({ asset: 'TON', side: 'buy', type: 'market', amount: 100, amountType: 'usd' });
    }
  },
}
```

**Trend Following with Stop-Loss:**
```typescript
let prevClose = 0;
{
  assets: ['TON'],
  onCandle: async (candle, portfolio, placeOrder) => {
    const inPosition = portfolio.positions.has('TON');

    if (!inPosition && prevClose > 0 && candle.close > prevClose * 1.02) {
      await placeOrder({ asset: 'TON', side: 'buy', type: 'market', amount: 50, amountType: 'percent' });
    } else if (inPosition) {
      const position = portfolio.positions.get('TON')!;
      const loss = (position.entryPrice - candle.close) / position.entryPrice;
      if (loss > 0.10) { // 10% stop loss
        await placeOrder({ asset: 'TON', side: 'sell', type: 'market', amount: position.amount });
      }
    }
    prevClose = candle.close;
  },
}
```

---

## Performance Metrics Reference

| Metric | Formula | Description |
|--------|---------|-------------|
| Total Return | `(end - start) / start × 100` | Overall percentage return |
| Annualized Return | `(1 + total)^(365/days) - 1` | Return normalized to 1 year |
| Sharpe Ratio | `(R_p - R_f) / σ_p` | Risk-adjusted return vs risk-free rate |
| Sortino Ratio | `(R_p - R_f) / σ_down` | Return per unit of downside risk |
| Calmar Ratio | `Annualized Return / Max Drawdown` | Return vs worst drawdown |
| Max Drawdown | `max((peak - trough) / peak)` | Largest peak-to-trough decline |
| VaR 95% | 5th percentile of returns | Maximum loss at 95% confidence |
| CVaR 95% | Mean of worst 5% returns | Expected loss beyond VaR |
| Profit Factor | `Gross Profit / Gross Loss` | Profitability ratio |
| Win Rate | `Winners / Total Trades × 100` | % of profitable trades |

---

## Risk Evaluation Scenarios

| Scenario | Drawdown | Duration | Description |
|----------|---------|---------|-------------|
| Market Correction | 20% | 30 days | Standard correction |
| Bear Market | 40% | 180 days | Sustained decline |
| Crypto Crash | 60% | 90 days | Severe crypto-specific crash |
| Flash Crash | 30% | 1 day | Rapid intraday price drop |

---

## Demo Workflow

```typescript
import { createBacktestingFramework, DEFAULT_SLIPPAGE_MODEL, DEFAULT_FEE_MODEL, DEFAULT_FILL_MODEL } from '@tonaiagent/core/backtesting';

async function runDemo() {
  const framework = createBacktestingFramework({
    enableMonteCarlo: true,
    defaultMonteCarloSimulations: 1000,
    enableRiskEvaluation: true,
  });

  framework.onEvent((event) => {
    if (event.type === 'backtest_progress') {
      console.log(`Progress: ${event.data['progress']}%`);
    }
  });

  const result = await framework.run({
    strategyId: 'demo_dca',
    strategyName: 'DCA Strategy Demo',
    strategySpec: {
      assets: ['TON'],
      onCandle: async (candle, portfolio, placeOrder) => {
        if (portfolio.cash >= 100) {
          await placeOrder({ asset: 'TON', side: 'buy', type: 'market', amount: 100, amountType: 'usd' });
        }
      },
    },
    dataConfig: {
      type: 'synthetic',
      assets: ['TON'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      granularity: '1d',
      syntheticConfig: {
        initialPrices: { TON: 5.0 },
        volatility: 0.025,
        drift: 0.001,
        seed: 42,
      },
    },
    simulationConfig: {
      initialCapital: 10000,
      currency: 'USD',
      slippageModel: DEFAULT_SLIPPAGE_MODEL,
      feeModel: DEFAULT_FEE_MODEL,
      fillModel: DEFAULT_FILL_MODEL,
    },
    monteCarlo: { enabled: true, simulations: 1000, confidenceLevel: 0.95 },
    riskEvaluation: true,
    generateReport: true,
  });

  // Summary in issue-required format
  console.log('\n=== BACKTEST RESULTS ===');
  console.log(framework.reports.formatSummaryString(result.report!));

  // Full detailed report
  console.log('\n' + framework.reports.formatDetailedReport(result.report!));

  // Equity curve (first and last points)
  const curve = result.equityCurve;
  console.log(`\nEquity: $${curve[0]?.equity} → $${curve[curve.length - 1]?.equity}`);
}

runDemo().catch(console.error);
```

---

## API Reference

### `createBacktestingFramework(config?)`

Creates the unified backtesting framework.

**Parameters:**
- `config?: Partial<BacktestingFrameworkConfig>` — Optional configuration overrides

**Returns:** `DefaultBacktestingFramework`

### `framework.run(config: BacktestRunConfig)`

Runs a complete backtest.

**Returns:** `Promise<BacktestRunResult>`

### `BacktestRunConfig`

| Field | Type | Description |
|-------|------|-------------|
| `strategyId` | `string` | Strategy identifier |
| `strategyName` | `string` | Display name |
| `strategySpec` | `BacktestStrategySpec` | Strategy logic |
| `dataConfig` | `DataSourceConfig` | Data source configuration |
| `simulationConfig` | `SimulationConfig` | Simulation parameters |
| `monteCarlo?` | `{enabled, simulations, confidenceLevel}` | Monte Carlo options |
| `riskEvaluation?` | `boolean` | Enable risk evaluation (default: true) |
| `generateReport?` | `boolean` | Generate full report (default: true) |

### Individual Component Factories

| Factory | Description |
|---------|-------------|
| `createHistoricalDataManager(config?)` | Historical data layer |
| `createMarketReplayEngine(dataManager)` | Market replay engine |
| `createSimulationEnvironment(id, config)` | Simulation environment |
| `createPerformanceCalculator(riskFreeRate?)` | Performance metrics calculator |
| `createBacktestRiskEvaluator(thresholds?, scenarios?)` | Risk evaluator |
| `createReportGenerator()` | Report generator |
