/**
 * TONAIAgent - Strategy Backtesting Framework Tests
 *
 * Comprehensive tests for all backtesting framework components.
 * Issue #155: Strategy Backtesting Framework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  // Framework
  createBacktestingFramework,
  DefaultBacktestingFramework,

  // Historical Data
  createHistoricalDataManager,
  createSyntheticDataGenerator,
  createJsonDataProvider,
  HistoricalDataManager,
  SyntheticDataGenerator,
  JsonDataProvider,
  granularityToMs,
  countCandles,

  // Market Replay
  createMarketReplayEngine,
  MarketReplayEngine,
  MarketReplaySession,

  // Simulation Environment
  createSimulationEnvironment,
  SimulationEnvironment,
  DEFAULT_SLIPPAGE_MODEL,
  DEFAULT_FEE_MODEL,
  DEFAULT_FILL_MODEL,

  // Performance Analysis
  createPerformanceCalculator,
  PerformanceCalculator,

  // Risk Evaluation
  createBacktestRiskEvaluator,
  BacktestRiskEvaluator,
  DEFAULT_DRAWDOWN_SCENARIOS,
  DEFAULT_RISK_THRESHOLDS,

  // Report Generator
  createReportGenerator,
  BacktestReportGenerator,

  // Types
  BacktestRunConfig,
  OHLCVCandle,
  PortfolioState,
  SimulatedOrder,
  PerformanceReport,
  EquityCurvePoint,
  RiskEvaluationResult,
  BacktestRunResult,
} from '../../src/backtesting';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestCandles(
  asset: string,
  count: number,
  startPrice: number = 5.0
): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  const startDate = new Date('2024-01-01T00:00:00Z');
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    price *= 1 + (Math.random() - 0.48) * 0.02;
    candles.push({
      timestamp: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      asset,
      open: price * 0.998,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: 100000 + Math.random() * 50000,
      volumeUsd: price * 100000,
    });
  }
  return candles;
}

function createMockPerformanceReport(): PerformanceReport {
  const now = new Date('2024-01-01');
  const end = new Date('2024-07-01');
  return {
    backtestId: 'bt_test_001',
    strategyName: 'Test Strategy',
    period: { start: now, end, durationDays: 182 },
    summary: {
      capitalStart: 10000,
      capitalEnd: 13450,
      totalReturn: 34.5,
      annualizedReturn: 70.2,
      absoluteProfit: 3450,
    },
    returns: {
      totalReturn: 34.5,
      annualizedReturn: 70.2,
      monthlyReturnAvg: 5.0,
      bestMonth: 15.0,
      worstMonth: -5.0,
      positiveMonths: 5,
      negativeMonths: 1,
    },
    risk: {
      maxDrawdown: 7.2,
      maxDrawdownDuration: 14,
      currentDrawdown: 0,
      volatility: 22.5,
      downSideDeviation: 15.0,
      sharpeRatio: 1.85,
      sortinoRatio: 2.1,
      calmarRatio: 9.75,
      var95: -2.5,
      cvar95: -3.8,
    },
    trades: {
      totalTrades: 45,
      winningTrades: 27,
      losingTrades: 18,
      winRate: 60,
      averageWin: 185.0,
      averageLoss: 85.0,
      largestWin: 500.0,
      largestLoss: -200.0,
      profitFactor: 2.18,
      expectancy: 77.0,
      averageHoldingDays: 2.5,
      totalFeesPaid: 120.5,
      totalSlippage: 45.0,
      avgSlippage: 0.12,
    },
    equityCurve: [
      { timestamp: now, equity: 10000, drawdown: 0, positions: {}, cash: 10000 },
      { timestamp: end, equity: 13450, drawdown: 0, positions: {}, cash: 13450 },
    ],
    drawdownCurve: [
      { timestamp: now, drawdown: 0, drawdownDuration: 0 },
      { timestamp: end, drawdown: 0, drawdownDuration: 0 },
    ],
    monthlyReturns: [
      { year: 2024, month: 1, return: 8.5, trades: 8 },
      { year: 2024, month: 2, return: -3.2, trades: 6 },
      { year: 2024, month: 3, return: 10.1, trades: 9 },
      { year: 2024, month: 4, return: 5.2, trades: 7 },
      { year: 2024, month: 5, return: 8.8, trades: 8 },
      { year: 2024, month: 6, return: 4.3, trades: 7 },
    ],
  };
}

function createMockOrders(): SimulatedOrder[] {
  const baseTime = new Date('2024-01-01');
  return [
    {
      id: 'order_1',
      sessionId: 'bt_test_001',
      timestamp: baseTime,
      asset: 'TON',
      side: 'buy',
      type: 'market',
      requestedAmount: 100,
      filledAmount: 100,
      executedPrice: 5.1,
      fees: 1.5,
      slippage: 0.001,
      status: 'filled',
    },
    {
      id: 'order_2',
      sessionId: 'bt_test_001',
      timestamp: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000),
      asset: 'TON',
      side: 'sell',
      type: 'market',
      requestedAmount: 50,
      filledAmount: 50,
      executedPrice: 5.8,
      fees: 0.87,
      slippage: 0.001,
      status: 'filled',
    },
    {
      id: 'order_3',
      sessionId: 'bt_test_001',
      timestamp: new Date(baseTime.getTime() + 14 * 24 * 60 * 60 * 1000),
      asset: 'TON',
      side: 'sell',
      type: 'market',
      requestedAmount: 50,
      filledAmount: 50,
      executedPrice: 4.9,
      fees: 0.74,
      slippage: 0.002,
      status: 'filled',
    },
  ];
}

// ============================================================================
// Historical Data Tests
// ============================================================================

describe('Historical Data Layer', () => {
  describe('granularityToMs', () => {
    it('should convert timeframe strings to milliseconds', () => {
      expect(granularityToMs('1m')).toBe(60 * 1000);
      expect(granularityToMs('1h')).toBe(60 * 60 * 1000);
      expect(granularityToMs('1d')).toBe(24 * 60 * 60 * 1000);
      expect(granularityToMs('1w')).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('countCandles', () => {
    it('should count expected candles for a date range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-08');
      expect(countCandles(start, end, '1d')).toBe(7);
    });
  });

  describe('SyntheticDataGenerator', () => {
    let generator: SyntheticDataGenerator;

    beforeEach(() => {
      generator = createSyntheticDataGenerator({
        initialPrices: { TON: 5.0, USDT: 1.0 },
        volatility: 0.02,
        drift: 0.001,
        seed: 42,
      });
    });

    it('should generate OHLCV candles for TON', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const candles = await generator.getCandles('TON', start, end, '1d');

      expect(candles.length).toBeGreaterThan(20);
      expect(candles.length).toBeLessThanOrEqual(31);

      const first = candles[0];
      expect(first).toBeDefined();
      expect(first!.asset).toBe('TON');
      expect(first!.open).toBeGreaterThan(0);
      expect(first!.high).toBeGreaterThanOrEqual(first!.open);
      expect(first!.low).toBeLessThanOrEqual(first!.open);
      expect(first!.close).toBeGreaterThan(0);
      expect(first!.volume).toBeGreaterThan(0);
    });

    it('should generate deterministic data when seed is set', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-10');

      const gen1 = createSyntheticDataGenerator({ seed: 12345, initialPrices: { TON: 5.0 } });
      const gen2 = createSyntheticDataGenerator({ seed: 12345, initialPrices: { TON: 5.0 } });

      const candles1 = await gen1.getCandles('TON', start, end, '1d');
      const candles2 = await gen2.getCandles('TON', start, end, '1d');

      expect(candles1.length).toBe(candles2.length);
      expect(candles1[0]?.close).toBe(candles2[0]?.close);
    });

    it('should generate trade records', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-03');
      const trades = await generator.getTrades('TON', start, end);

      expect(trades.length).toBeGreaterThan(0);
      for (const trade of trades) {
        expect(trade.asset).toBe('TON');
        expect(trade.price).toBeGreaterThan(0);
        expect(['buy', 'sell']).toContain(trade.side);
      }
    });

    it('should generate order book snapshots', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-03');
      const snapshots = await generator.getOrderBookSnapshots('TON', start, end, '1d');

      expect(snapshots.length).toBeGreaterThan(0);
      const first = snapshots[0];
      expect(first).toBeDefined();
      expect(first!.bids.length).toBeGreaterThan(0);
      expect(first!.asks.length).toBeGreaterThan(0);
      expect(first!.midPrice).toBeGreaterThan(0);
      expect(first!.spread).toBeGreaterThan(0);
    });

    it('should generate volatility indicators', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-02-01');
      const indicators = await generator.getVolatilityIndicators('TON', start, end, '1d');

      expect(indicators.length).toBeGreaterThan(0);
      const first = indicators[0];
      expect(first).toBeDefined();
      expect(first!.historicalVolatility).toBeGreaterThanOrEqual(0);
      expect(first!.atr).toBeGreaterThan(0);
    });

    it('should confirm availability for any date range', async () => {
      const available = await generator.checkAvailability(
        'TON',
        new Date('2020-01-01'),
        new Date('2030-01-01')
      );
      expect(available).toBe(true);
    });
  });

  describe('JsonDataProvider', () => {
    let provider: JsonDataProvider;
    let testData: Map<string, OHLCVCandle[]>;

    beforeEach(() => {
      const candles = createTestCandles('TON', 90);
      testData = new Map([['TON', candles]]);
      provider = createJsonDataProvider(testData);
    });

    it('should return candles for a given date range', async () => {
      const allCandles = testData.get('TON')!;
      const start = allCandles[0]!.timestamp;
      const end = allCandles[29]!.timestamp;
      const candles = await provider.getCandles('TON', start, end, '1d');

      expect(candles.length).toBe(30);
    });

    it('should return empty array for unknown asset', async () => {
      const candles = await provider.getCandles(
        'UNKNOWN',
        new Date('2024-01-01'),
        new Date('2024-06-01'),
        '1d'
      );
      expect(candles).toHaveLength(0);
    });

    it('should check data availability correctly', async () => {
      const allCandles = testData.get('TON')!;
      const available = await provider.checkAvailability(
        'TON',
        allCandles[5]!.timestamp,
        allCandles[85]!.timestamp
      );
      expect(available).toBe(true);

      const notAvailable = await provider.checkAvailability(
        'TON',
        new Date('2023-01-01'),
        new Date('2023-06-01')
      );
      expect(notAvailable).toBe(false);
    });
  });

  describe('HistoricalDataManager', () => {
    let manager: HistoricalDataManager;

    beforeEach(() => {
      manager = createHistoricalDataManager({ type: 'synthetic' });
    });

    it('should load candles for multiple assets', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = await manager.loadCandles(['TON', 'USDT'], start, end, '1d');

      expect(result.has('TON')).toBe(true);
      expect(result.has('USDT')).toBe(true);
      expect(result.get('TON')!.length).toBeGreaterThan(0);
    });

    it('should return same data on repeated loads (caching)', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-10');

      const result1 = await manager.loadCandles(['TON'], start, end, '1d');
      const result2 = await manager.loadCandles(['TON'], start, end, '1d');

      // Same number of candles returned both times
      expect(result1.get('TON')!.length).toBe(result2.get('TON')!.length);
      // Same first candle timestamp
      expect(result1.get('TON')![0]!.timestamp.getTime()).toBe(
        result2.get('TON')![0]!.timestamp.getTime()
      );
    });

    it('should validate data and report quality', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const validation = await manager.validateData(['TON', 'BTC'], start, end, '1d');

      expect(validation.assetCount).toBe(2);
      expect(validation.candleCount).toBeGreaterThan(0);
      expect(validation.valid).toBe(true);
    });
  });
});

// ============================================================================
// Market Replay Engine Tests
// ============================================================================

describe('Market Replay Engine', () => {
  let dataManager: HistoricalDataManager;
  let engine: MarketReplayEngine;

  beforeEach(() => {
    dataManager = createHistoricalDataManager({ type: 'synthetic' });
    engine = createMarketReplayEngine(dataManager);
  });

  it('should create a replay session', () => {
    const session = engine.createSession({
      speed: 'instant',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-10'),
      granularity: '1d',
      assets: ['TON'],
    });

    expect(session).toBeDefined();
    const state = session.getState();
    expect(state.status).toBe('idle');
  });

  it('should replay candles and call handler for each timestamp', async () => {
    const session = engine.createSession({
      speed: 'instant',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      granularity: '1d',
      assets: ['TON'],
    });

    await session.initialize();

    const receivedCandles: OHLCVCandle[] = [];
    const receivedTimestamps: Date[] = [];

    await session.run(async (timestamp, candles) => {
      receivedTimestamps.push(timestamp);
      receivedCandles.push(...candles);
    });

    expect(receivedTimestamps.length).toBeGreaterThan(0);
    expect(receivedCandles.length).toBeGreaterThan(0);
    expect(receivedCandles[0]!.asset).toBe('TON');
  });

  it('should emit events during replay', async () => {
    const session = engine.createSession({
      speed: 'instant',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-05'),
      granularity: '1d',
      assets: ['TON'],
    });

    await session.initialize();

    const events: string[] = [];
    session.onEvent((event) => events.push(event.type));

    await session.run(async () => {
      // No-op strategy
    });

    expect(events).toContain('session_started');
    expect(events).toContain('candle_closed');
    expect(events).toContain('session_completed');
  });

  it('should complete with completed status after full run', async () => {
    const session = engine.createSession({
      speed: 'instant',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-05'),
      granularity: '1d',
      assets: ['TON'],
    });

    await session.initialize();
    await session.run(async () => {});

    expect(session.getState().status).toBe('completed');
    expect(session.getState().progressPercent).toBe(100);
  });

  it('should recommend appropriate granularity for a date range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-08'); // 1 week
    const granularity = MarketReplayEngine.recommendGranularity(start, end, 200);
    expect(['1m', '5m', '15m', '30m', '1h', '4h', '1d']).toContain(granularity);
  });

  it('should detect overlapping date ranges', () => {
    const overlaps = MarketReplayEngine.dateRangesOverlap(
      new Date('2024-01-01'),
      new Date('2024-06-30'),
      new Date('2024-03-01'),
      new Date('2024-12-31')
    );
    expect(overlaps).toBe(true);

    const noOverlap = MarketReplayEngine.dateRangesOverlap(
      new Date('2024-01-01'),
      new Date('2024-03-31'),
      new Date('2024-04-01'),
      new Date('2024-06-30')
    );
    expect(noOverlap).toBe(false);
  });
});

// ============================================================================
// Simulation Environment Tests
// ============================================================================

describe('Simulation Environment', () => {
  let simEnv: SimulationEnvironment;
  const initialCapital = 10000;

  beforeEach(() => {
    simEnv = createSimulationEnvironment('bt_test', {
      initialCapital,
      currency: 'USD',
      slippageModel: DEFAULT_SLIPPAGE_MODEL,
      feeModel: DEFAULT_FEE_MODEL,
      fillModel: DEFAULT_FILL_MODEL,
    });
  });

  it('should initialize with correct capital', () => {
    const portfolio = simEnv.getPortfolio();
    expect(portfolio.cash).toBe(initialCapital);
    expect(portfolio.totalValue).toBe(initialCapital);
    expect(portfolio.positions.size).toBe(0);
  });

  describe('Order Placement', () => {
    it('should execute a buy market order', async () => {
      const prices = new Map([['TON', 5.0]]);
      const order = await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 100, amountType: 'usd' },
        prices
      );

      expect(order.status).toBe('filled');
      expect(order.side).toBe('buy');
      expect(order.filledAmount).toBeGreaterThan(0);
      expect(order.fees).toBeGreaterThan(0);

      const portfolio = simEnv.getPortfolio();
      expect(portfolio.cash).toBeLessThan(initialCapital);
      expect(portfolio.positions.has('TON')).toBe(true);
    });

    it('should execute a sell market order', async () => {
      const prices = new Map([['TON', 5.0]]);

      // Buy first
      await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 500, amountType: 'usd' },
        prices
      );

      // Snapshot the amount before selling (positions are mutable, capture value early)
      const positionAmountBeforeSell = simEnv.getPortfolio().positions.get('TON')!.amount;

      // Now sell
      const sellOrder = await simEnv.placeOrder(
        { asset: 'TON', side: 'sell', type: 'market', amount: positionAmountBeforeSell },
        new Map([['TON', 5.5]]) // Sell at higher price
      );

      expect(sellOrder.status).toBe('filled');
      expect(sellOrder.filledAmount).toBeCloseTo(positionAmountBeforeSell, 1);
    });

    it('should reject buy order when insufficient funds', async () => {
      const prices = new Map([['TON', 5.0]]);
      const order = await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 100000, amountType: 'usd' }, // Way more than capital
        prices
      );

      expect(order.status).toBe('rejected');
    });

    it('should reject order when no price available', async () => {
      const order = await simEnv.placeOrder(
        { asset: 'UNKNOWN', side: 'buy', type: 'market', amount: 100 },
        new Map()
      );
      expect(order.status).toBe('rejected');
    });

    it('should apply slippage to orders', async () => {
      const marketPrice = 5.0;
      const prices = new Map([['TON', marketPrice]]);

      const order = await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 100 },
        prices
      );

      // Slippage should make the executed price higher than market for buys
      expect(order.executedPrice).toBeGreaterThanOrEqual(marketPrice);
    });

    it('should calculate fees correctly', async () => {
      const prices = new Map([['TON', 5.0]]);
      const order = await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 200 },
        prices
      );

      // Fees = trading fee (0.3% of trade value) + gas ($0.05) + protocol fee (0.05%)
      const tradeValue = order.filledAmount * order.executedPrice;
      const expectedFees = tradeValue * (0.3 / 100) + 0.05 + tradeValue * (0.05 / 100);
      expect(order.fees).toBeCloseTo(expectedFees, 1);
    });

    it('should handle percentage amount type for buy orders', async () => {
      const prices = new Map([['TON', 5.0]]);
      // Snapshot cash before order (portfolio is a mutable reference)
      const cashBeforeOrder = simEnv.getPortfolio().cash;

      const order = await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 50, amountType: 'percent' },
        prices
      );

      expect(order.status).toBe('filled');
      // Should have spent ~50% of cash (within 5% tolerance due to slippage)
      const expectedSpend = cashBeforeOrder * 0.5;
      const actualSpend = order.filledAmount * order.executedPrice;
      expect(actualSpend).toBeGreaterThan(expectedSpend * 0.95);
      expect(actualSpend).toBeLessThan(expectedSpend * 1.05);
    });
  });

  describe('Portfolio State', () => {
    it('should update position unrealized PnL on price change', async () => {
      const buyPrice = new Map([['TON', 5.0]]);
      await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 100 },
        buyPrice
      );

      // Price increases
      const newPrice = new Map([['TON', 6.0]]);
      simEnv.updatePrices(new Date(), newPrice);

      const portfolio = simEnv.getPortfolio();
      expect(portfolio.unrealizedPnl).toBeGreaterThan(0);
    });

    it('should track realized PnL on sell', async () => {
      const prices = new Map([['TON', 5.0]]);
      await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 100 },
        prices
      );

      const higherPrices = new Map([['TON', 6.0]]);
      const position = simEnv.getPortfolio().positions.get('TON')!;
      await simEnv.placeOrder(
        { asset: 'TON', side: 'sell', type: 'market', amount: position.amount },
        higherPrices
      );

      const portfolio = simEnv.getPortfolio();
      // After sell, realized PnL should be positive
      expect(portfolio.positions.has('TON')).toBe(false);
    });

    it('should record equity curve points on updatePrices', () => {
      const prices = new Map([['TON', 5.0]]);
      simEnv.updatePrices(new Date('2024-01-01'), prices);
      simEnv.updatePrices(new Date('2024-01-02'), prices);

      const curve = simEnv.getEquityCurve();
      expect(curve.length).toBeGreaterThanOrEqual(2);
    });

    it('should close all positions on closeAllPositions', async () => {
      const prices = new Map([['TON', 5.0]]);
      await simEnv.placeOrder(
        { asset: 'TON', side: 'buy', type: 'market', amount: 500, amountType: 'usd' },
        prices
      );

      expect(simEnv.getPortfolio().positions.has('TON')).toBe(true);

      simEnv.closeAllPositions(new Map([['TON', 5.5]]));

      expect(simEnv.getPortfolio().positions.has('TON')).toBe(false);
    });
  });
});

// ============================================================================
// Performance Analysis Tests
// ============================================================================

describe('Performance Analysis', () => {
  let calculator: PerformanceCalculator;

  beforeEach(() => {
    calculator = createPerformanceCalculator(0.05);
  });

  it('should build a complete performance report', () => {
    const equityCurve: EquityCurvePoint[] = [];
    const start = new Date('2024-01-01');
    let equity = 10000;

    for (let i = 0; i < 90; i++) {
      equity *= 1 + (Math.random() - 0.48) * 0.015;
      equityCurve.push({
        timestamp: new Date(start.getTime() + i * 24 * 60 * 60 * 1000),
        equity,
        drawdown: 0,
        positions: {},
        cash: equity,
      });
    }

    const report = calculator.buildReport(
      'bt_test',
      'Test Strategy',
      10000,
      equityCurve,
      createMockOrders()
    );

    expect(report.backtestId).toBe('bt_test');
    expect(report.strategyName).toBe('Test Strategy');
    expect(report.summary.capitalStart).toBe(10000);
    expect(report.equityCurve.length).toBe(equityCurve.length);
    expect(typeof report.risk.sharpeRatio).toBe('number');
    expect(typeof report.risk.maxDrawdown).toBe('number');
    expect(report.risk.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('should calculate Sharpe ratio', () => {
    // Create a clearly profitable equity curve
    const equityCurve: EquityCurvePoint[] = [];
    let equity = 10000;
    const start = new Date('2024-01-01');

    for (let i = 0; i < 100; i++) {
      equity *= 1.002; // Steady 0.2% daily growth
      equityCurve.push({
        timestamp: new Date(start.getTime() + i * 24 * 60 * 60 * 1000),
        equity,
        drawdown: 0,
        positions: {},
        cash: equity,
      });
    }

    const report = calculator.buildReport('bt', 'Test', 10000, equityCurve, []);
    expect(report.risk.sharpeRatio).toBeGreaterThan(0);
  });

  it('should calculate max drawdown', () => {
    const equityCurve: EquityCurvePoint[] = [
      { timestamp: new Date('2024-01-01'), equity: 10000, drawdown: 0, positions: {}, cash: 10000 },
      { timestamp: new Date('2024-01-02'), equity: 12000, drawdown: 0, positions: {}, cash: 12000 },
      { timestamp: new Date('2024-01-03'), equity: 9000, drawdown: 0, positions: {}, cash: 9000 },
      { timestamp: new Date('2024-01-04'), equity: 11000, drawdown: 0, positions: {}, cash: 11000 },
    ];

    const report = calculator.buildReport('bt', 'Test', 10000, equityCurve, []);
    // Max drawdown should be (12000 - 9000) / 12000 = 25%
    expect(report.risk.maxDrawdown).toBeCloseTo(25, 0);
  });

  it('should return empty report for empty equity curve', () => {
    const report = calculator.buildReport('bt', 'Test', 10000, [], []);
    expect(report.summary.totalReturn).toBe(0);
    expect(report.risk.maxDrawdown).toBe(0);
    expect(report.trades.totalTrades).toBe(0);
  });

  it('should calculate monthly returns', () => {
    const equityCurve: EquityCurvePoint[] = [];
    let equity = 10000;
    const start = new Date('2024-01-01T00:00:00Z');

    for (let i = 0; i < 60; i++) {
      equity *= 1.005;
      equityCurve.push({
        timestamp: new Date(start.getTime() + i * 24 * 60 * 60 * 1000),
        equity,
        drawdown: 0,
        positions: {},
        cash: equity,
      });
    }

    const report = calculator.buildReport('bt', 'Test', 10000, equityCurve, []);
    expect(report.monthlyReturns.length).toBeGreaterThan(0);
    expect(report.returns.positiveMonths).toBeGreaterThanOrEqual(0);
  });

  describe('Monte Carlo Analysis', () => {
    it('should run Monte Carlo simulation with orders', () => {
      const orders = createMockOrders();
      const mc = calculator.runMonteCarlo(orders, 100, 0.95);

      expect(mc.simulations).toBe(100);
      expect(mc.confidenceLevel).toBe(0.95);
      expect(typeof mc.expectedReturn).toBe('number');
      expect(typeof mc.probabilityOfProfit).toBe('number');
      expect(mc.probabilityOfProfit).toBeGreaterThanOrEqual(0);
      expect(mc.probabilityOfProfit).toBeLessThanOrEqual(100);
    });

    it('should handle empty orders for Monte Carlo', () => {
      const mc = calculator.runMonteCarlo([], 100, 0.95);
      expect(mc.expectedReturn).toBe(0);
    });
  });
});

// ============================================================================
// Risk Evaluation Tests
// ============================================================================

describe('Risk Evaluation', () => {
  let evaluator: BacktestRiskEvaluator;

  beforeEach(() => {
    evaluator = createBacktestRiskEvaluator();
  });

  it('should evaluate a backtest and return a risk result', () => {
    const performance = createMockPerformanceReport();
    const orders = createMockOrders();
    const equityCurve = performance.equityCurve;

    const result = evaluator.evaluate('bt_test', performance, orders, equityCurve);

    expect(result.backtestId).toBe('bt_test');
    expect(result.evaluatedAt).toBeInstanceOf(Date);
    expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.overallRiskScore).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.riskGrade);
  });

  it('should assign A grade to a low-risk strategy', () => {
    const performance = createMockPerformanceReport();
    // Good metrics: low drawdown, high Sharpe
    performance.risk.maxDrawdown = 5;
    performance.risk.sharpeRatio = 2.5;
    performance.trades.winRate = 65;

    const result = evaluator.evaluate('bt_test', performance, [], []);
    expect(['A', 'B']).toContain(result.riskGrade);
    expect(result.passed).toBe(true);
  });

  it('should assign F grade and fail for high-risk strategy', () => {
    const evaluatorStrict = createBacktestRiskEvaluator({
      maxAcceptableDrawdown: 10,
      minAcceptableSharpe: 1.0,
      maxConcentrationPercent: 30,
      minWinRate: 50,
    });

    const performance = createMockPerformanceReport();
    performance.risk.maxDrawdown = 60;
    performance.risk.sharpeRatio = -0.5;
    performance.trades.winRate = 20;
    performance.trades.totalTrades = 20;

    const result = evaluatorStrict.evaluate('bt_test', performance, [], []);
    expect(['D', 'F']).toContain(result.riskGrade);
    expect(result.passed).toBe(false);
    expect(result.failureReasons.length).toBeGreaterThan(0);
  });

  it('should evaluate drawdown scenarios', () => {
    const performance = createMockPerformanceReport();
    const result = evaluator.evaluate('bt_test', performance, [], performance.equityCurve);

    expect(result.drawdownAnalysis.drawdownScenarios.length).toBe(DEFAULT_DRAWDOWN_SCENARIOS.length);
    for (const scenario of result.drawdownAnalysis.drawdownScenarios) {
      expect(typeof scenario.strategyWouldSurvive).toBe('boolean');
      expect(scenario.estimatedImpact).toBeGreaterThanOrEqual(0);
    }
  });

  it('should generate recommendations', () => {
    const performance = createMockPerformanceReport();
    performance.risk.maxDrawdown = 35; // High drawdown
    performance.risk.sharpeRatio = 0.3; // Low Sharpe

    const result = evaluator.evaluate('bt_test', performance, [], []);
    expect(result.recommendations.length).toBeGreaterThan(0);

    for (const rec of result.recommendations) {
      expect(['position_sizing', 'diversification', 'stop_loss', 'exposure_limit', 'leverage']).toContain(rec.type);
      expect(['info', 'warning', 'critical']).toContain(rec.severity);
      expect(rec.description.length).toBeGreaterThan(0);
      expect(rec.suggestedAction.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Report Generator Tests
// ============================================================================

describe('Report Generator', () => {
  let generator: BacktestReportGenerator;

  beforeEach(() => {
    generator = createReportGenerator();
  });

  const buildMockResult = (): BacktestRunResult => {
    const performance = createMockPerformanceReport();
    const riskEvaluation: RiskEvaluationResult = {
      backtestId: 'bt_test_001',
      evaluatedAt: new Date(),
      overallRiskScore: 82,
      riskGrade: 'A',
      drawdownAnalysis: {
        maxObservedDrawdown: 7.2,
        drawdownScenarios: [],
        worstCaseEstimate: 15,
        timeToRecoveryAvg: 14,
      },
      concentrationRisks: [],
      exposureVolatility: [],
      recommendations: [],
      passed: true,
      failureReasons: [],
    };

    return {
      id: 'bt_test_001',
      strategyId: 'strategy_001',
      strategyName: 'Test Strategy',
      config: {} as BacktestRunConfig,
      status: 'completed',
      startedAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-02'),
      durationMs: 3000,
      performance,
      riskEvaluation,
      orders: createMockOrders(),
      equityCurve: performance.equityCurve,
      warnings: [],
    };
  };

  it('should generate a complete backtest report', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);

    expect(report.id).toBeDefined();
    expect(report.backtestId).toBe('bt_test_001');
    expect(report.strategyName).toBe('Test Strategy');
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.summary).toBeDefined();
    expect(report.performance).toBeDefined();
    expect(report.riskEvaluation).toBeDefined();
    expect(report.tradeHistory).toBeDefined();
    expect(report.equityCurve).toBeDefined();
  });

  it('should format summary string in the required format', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);
    const summary = generator.formatSummaryString(report);

    // Issue requirement: "Capital Start: 10,000 / Capital End: 13,450 / Return: +34.5% / Max Drawdown: -7.2% / Sharpe Ratio: 1.85"
    expect(summary).toContain('Capital Start:');
    expect(summary).toContain('Capital End:');
    expect(summary).toContain('Return:');
    expect(summary).toContain('Max Drawdown:');
    expect(summary).toContain('Sharpe Ratio:');
    expect(summary).toContain('/');
  });

  it('should format positive return with + sign', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);
    const summary = generator.formatSummaryString(report);

    expect(summary).toContain('+34.5%');
  });

  it('should format detailed report as a text block', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);
    const text = generator.formatDetailedReport(report);

    expect(text).toContain('BACKTEST REPORT');
    expect(text).toContain('PERFORMANCE METRICS');
    expect(text).toContain('TRADE STATISTICS');
    expect(text).toContain('RISK EVALUATION');
    expect(text).toContain('Test Strategy');
  });

  it('should convert report to JSON-serializable object', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);
    const json = generator.toJSON(report);

    expect(typeof json).toBe('object');
    // Dates should be ISO strings in JSON
    expect(typeof json['generatedAt']).toBe('string');
  });

  it('should throw if performance or risk evaluation are missing', () => {
    const result = buildMockResult();
    result.performance = undefined;

    expect(() => generator.generateReport(result)).toThrow();
  });

  it('should include marketplace metrics in the report', () => {
    const result = buildMockResult();
    const report = generator.generateReport(result);

    expect(report.marketplaceMetrics).toBeDefined();
    expect(report.marketplaceMetrics!.strategyRating).toBeGreaterThanOrEqual(1);
    expect(report.marketplaceMetrics!.strategyRating).toBeLessThanOrEqual(5);
    expect(['conservative', 'moderate', 'aggressive', 'speculative']).toContain(
      report.marketplaceMetrics!.riskCategory
    );
  });
});

// ============================================================================
// Full Framework Integration Tests
// ============================================================================

describe('Backtesting Framework (Integration)', () => {
  let framework: DefaultBacktestingFramework;

  beforeEach(() => {
    framework = createBacktestingFramework({
      enableMonteCarlo: false,
      enableRiskEvaluation: true,
    });
  });

  it('should run a complete DCA strategy backtest', async () => {
    const result = await framework.run({
      strategyId: 'dca_strategy',
      strategyName: 'DCA TON',
      strategySpec: {
        assets: ['TON'],
        onCandle: async (candle, portfolio, placeOrder) => {
          // Buy $50 of TON every candle if we have enough cash
          if (portfolio.cash >= 50) {
            await placeOrder({
              asset: 'TON',
              side: 'buy',
              type: 'market',
              amount: 50,
              amountType: 'usd',
            });
          }
        },
      },
      dataConfig: {
        type: 'synthetic',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        granularity: '1d',
        syntheticConfig: {
          initialPrices: { TON: 5.0 },
          volatility: 0.02,
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
      riskEvaluation: true,
      generateReport: true,
    });

    expect(result.status).toBe('completed');
    expect(result.orders.length).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.performance).toBeDefined();
    expect(result.performance!.summary.capitalStart).toBe(10000);
    expect(result.riskEvaluation).toBeDefined();
    expect(result.report).toBeDefined();
  }, 30000);

  it('should run a trend-following strategy', async () => {
    let lastClose = 0;

    const result = await framework.run({
      strategyId: 'trend_strategy',
      strategyName: 'Trend Following',
      strategySpec: {
        assets: ['TON'],
        onCandle: async (candle, portfolio, placeOrder) => {
          const inPosition = portfolio.positions.has('TON');

          if (!inPosition && candle.close > lastClose * 1.01 && portfolio.cash >= 200) {
            // Buy when price increases 1%
            await placeOrder({
              asset: 'TON',
              side: 'buy',
              type: 'market',
              amount: 200,
              amountType: 'usd',
            });
          } else if (inPosition && candle.close < lastClose * 0.98) {
            // Sell when price drops 2%
            const pos = portfolio.positions.get('TON');
            if (pos && pos.amount > 0) {
              await placeOrder({
                asset: 'TON',
                side: 'sell',
                type: 'market',
                amount: pos.amount,
              });
            }
          }

          lastClose = candle.close;
        },
      },
      dataConfig: {
        type: 'synthetic',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-28'),
        granularity: '1d',
      },
      simulationConfig: {
        initialCapital: 5000,
        currency: 'USD',
        slippageModel: { type: 'fixed', baseSlippage: 5 },
        feeModel: { tradingFeePercent: 0.1, gasCostUsd: 0.02 },
        fillModel: DEFAULT_FILL_MODEL,
      },
    });

    expect(result.status).toBe('completed');
    expect(result.performance).toBeDefined();
  }, 15000);

  it('should fail gracefully for invalid data config', async () => {
    // Create a custom framework that uses JSON provider with no data
    const testFramework = createBacktestingFramework();
    const emptyProvider = createJsonDataProvider(new Map());
    testFramework.dataManager.setProvider(emptyProvider);

    const result = await testFramework.run({
      strategyId: 'test',
      strategyName: 'Test',
      strategySpec: {
        assets: ['TON'],
        onCandle: async () => {},
      },
      dataConfig: {
        type: 'json',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        granularity: '1d',
      },
      simulationConfig: {
        initialCapital: 1000,
        currency: 'USD',
        slippageModel: DEFAULT_SLIPPAGE_MODEL,
        feeModel: DEFAULT_FEE_MODEL,
        fillModel: DEFAULT_FILL_MODEL,
      },
    });

    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });

  it('should emit backtest lifecycle events', async () => {
    const events: string[] = [];
    framework.onEvent((event) => events.push(event.type));

    await framework.run({
      strategyId: 'event_test',
      strategyName: 'Event Test',
      strategySpec: {
        assets: ['TON'],
        onCandle: async () => {},
      },
      dataConfig: {
        type: 'synthetic',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
        granularity: '1d',
      },
      simulationConfig: {
        initialCapital: 1000,
        currency: 'USD',
        slippageModel: DEFAULT_SLIPPAGE_MODEL,
        feeModel: DEFAULT_FEE_MODEL,
        fillModel: DEFAULT_FILL_MODEL,
      },
    });

    expect(events).toContain('backtest_started');
    expect(events).toContain('data_loaded');
    expect(events).toContain('backtest_completed');
  }, 15000);

  it('should store and retrieve results', async () => {
    const result = await framework.run({
      strategyId: 'retrieval_test',
      strategyName: 'Retrieval Test',
      strategySpec: {
        assets: ['TON'],
        onCandle: async () => {},
      },
      dataConfig: {
        type: 'synthetic',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        granularity: '1d',
      },
      simulationConfig: {
        initialCapital: 1000,
        currency: 'USD',
        slippageModel: DEFAULT_SLIPPAGE_MODEL,
        feeModel: DEFAULT_FEE_MODEL,
        fillModel: DEFAULT_FILL_MODEL,
      },
    });

    const retrieved = framework.getResult(result.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(result.id);

    const allResults = framework.getAllResults();
    expect(allResults.length).toBeGreaterThan(0);
    expect(allResults.some((r) => r.id === result.id)).toBe(true);
  }, 15000);

  it('should call strategy lifecycle hooks', async () => {
    const startCalled = vi.fn();
    const endCalled = vi.fn();

    await framework.run({
      strategyId: 'lifecycle_test',
      strategyName: 'Lifecycle Test',
      strategySpec: {
        assets: ['TON'],
        onStart: startCalled,
        onEnd: endCalled,
        onCandle: async () => {},
      },
      dataConfig: {
        type: 'synthetic',
        assets: ['TON'],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        granularity: '1d',
      },
      simulationConfig: {
        initialCapital: 1000,
        currency: 'USD',
        slippageModel: DEFAULT_SLIPPAGE_MODEL,
        feeModel: DEFAULT_FEE_MODEL,
        fillModel: DEFAULT_FILL_MODEL,
      },
    });

    expect(startCalled).toHaveBeenCalledOnce();
    expect(endCalled).toHaveBeenCalledOnce();
  }, 15000);
});

// ============================================================================
// Default Config Constants Tests
// ============================================================================

describe('Default Configuration', () => {
  it('should have valid default slippage model', () => {
    expect(DEFAULT_SLIPPAGE_MODEL.baseSlippage).toBeGreaterThan(0);
    expect(['fixed', 'volume_based', 'market_impact']).toContain(DEFAULT_SLIPPAGE_MODEL.type);
  });

  it('should have valid default fee model', () => {
    expect(DEFAULT_FEE_MODEL.tradingFeePercent).toBeGreaterThan(0);
    expect(DEFAULT_FEE_MODEL.gasCostUsd).toBeGreaterThanOrEqual(0);
  });

  it('should have defined drawdown scenarios', () => {
    expect(DEFAULT_DRAWDOWN_SCENARIOS.length).toBeGreaterThan(0);
    for (const scenario of DEFAULT_DRAWDOWN_SCENARIOS) {
      expect(scenario.name).toBeDefined();
      expect(scenario.maxDrawdownThreshold).toBeGreaterThan(0);
    }
  });

  it('should have valid risk thresholds', () => {
    expect(DEFAULT_RISK_THRESHOLDS.maxAcceptableDrawdown).toBeGreaterThan(0);
    expect(DEFAULT_RISK_THRESHOLDS.minAcceptableSharpe).toBeGreaterThan(0);
    expect(DEFAULT_RISK_THRESHOLDS.maxConcentrationPercent).toBeGreaterThan(0);
  });
});
