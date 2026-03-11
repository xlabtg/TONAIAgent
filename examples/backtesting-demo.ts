/**
 * TONAIAgent - Strategy Backtesting Framework Demo
 *
 * Demonstrates the complete backtesting pipeline:
 *   1. Run a DCA strategy on historical TON data
 *   2. Generate a performance report
 *   3. Calculate risk metrics
 *   4. Display the equity curve summary
 *
 * Issue #155: Strategy Backtesting Framework
 *
 * Usage:
 *   npx tsx examples/backtesting-demo.ts
 */

import {
  createBacktestingFramework,
  DEFAULT_SLIPPAGE_MODEL,
  DEFAULT_FEE_MODEL,
  DEFAULT_FILL_MODEL,
} from '../src/backtesting';

async function runBacktestingDemo() {
  console.log('========================================================');
  console.log('TONAIAgent — Strategy Backtesting Framework Demo');
  console.log('========================================================\n');

  // 1. Create the backtesting framework
  const framework = createBacktestingFramework({
    enableMonteCarlo: true,
    defaultMonteCarloSimulations: 500,
    enableRiskEvaluation: true,
  });

  // Subscribe to progress events
  framework.onEvent((event) => {
    if (event.type === 'backtest_progress') {
      const progress = event.data['progress'] as number;
      if (progress % 25 === 0) {
        console.log(`  [${progress}%] Replaying market data...`);
      }
    } else if (event.type === 'data_loaded') {
      const candles = event.data['candleCount'] as number;
      console.log(`  Data loaded: ${candles} candles for ${event.data['assetCount']} asset(s)`);
    } else if (event.type === 'risk_evaluated') {
      console.log(`  Risk evaluation complete: Grade ${event.data['riskGrade']} (${event.data['riskScore']}/100)`);
    }
  });

  // ============================================================
  // Demo 1: DCA (Dollar-Cost Averaging) Strategy
  // ============================================================
  console.log('Demo 1: Dollar-Cost Averaging (DCA) Strategy');
  console.log('  Buy $100 of TON every day for 6 months\n');

  const dcaResult = await framework.run({
    strategyId: 'dca_ton_demo',
    strategyName: 'DCA TON (Demo)',
    strategySpec: {
      assets: ['TON'],
      onStart: async (portfolio) => {
        console.log(`  Starting capital: $${portfolio.cash.toFixed(2)}`);
      },
      onCandle: async (candle, portfolio, placeOrder) => {
        // Buy $100 of TON each day if we have enough cash
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
      onEnd: async (portfolio) => {
        console.log(`  Final capital: $${portfolio.totalValue.toFixed(2)}`);
      },
    },
    dataConfig: {
      type: 'synthetic',
      assets: ['TON'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
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
    monteCarlo: { enabled: true, simulations: 500, confidenceLevel: 0.95 },
    riskEvaluation: true,
    generateReport: true,
  });

  if (dcaResult.status !== 'completed' || !dcaResult.report) {
    console.error('Backtest failed:', dcaResult.error);
    return;
  }

  // Display the report
  console.log('\n--- DCA Strategy Results ---');
  console.log(framework.reports.formatSummaryString(dcaResult.report));
  console.log('');

  // Display equity curve (first, midpoint, last)
  const curve = dcaResult.equityCurve;
  const mid = Math.floor(curve.length / 2);
  console.log('Equity Curve (start → mid → end):');
  console.log(`  ${curve[0]?.timestamp.toDateString()}: $${curve[0]?.equity.toFixed(2)}`);
  if (curve[mid]) {
    console.log(`  ${curve[mid]?.timestamp.toDateString()}: $${curve[mid]?.equity.toFixed(2)}`);
  }
  console.log(`  ${curve[curve.length - 1]?.timestamp.toDateString()}: $${curve[curve.length - 1]?.equity.toFixed(2)}`);
  console.log('');

  // Risk evaluation
  if (dcaResult.riskEvaluation) {
    const risk = dcaResult.riskEvaluation;
    console.log('Risk Evaluation:');
    console.log(`  Overall Grade: ${risk.riskGrade} (Score: ${risk.overallRiskScore.toFixed(0)}/100)`);
    console.log(`  Status: ${risk.passed ? '✓ PASSED' : '✗ FAILED'}`);
    if (risk.recommendations.length > 0) {
      console.log('  Recommendations:');
      for (const rec of risk.recommendations.slice(0, 3)) {
        console.log(`    [${rec.severity.toUpperCase()}] ${rec.description}`);
      }
    }
  }
  console.log('');

  // ============================================================
  // Demo 2: Trend-Following Strategy
  // ============================================================
  console.log('========================================================');
  console.log('Demo 2: Trend-Following Strategy');
  console.log('  Buy on 2% rise, sell on 5% drop from entry\n');

  let entryPrice = 0;

  const trendResult = await framework.run({
    strategyId: 'trend_following_demo',
    strategyName: 'Trend Following (Demo)',
    strategySpec: {
      assets: ['TON'],
      onCandle: async (candle, portfolio, placeOrder) => {
        const inPosition = portfolio.positions.has('TON');
        const lastClose = candle.close;

        if (!inPosition && entryPrice > 0 && lastClose > entryPrice * 1.02 && portfolio.cash >= 500) {
          // Buy 50% of available cash when price is trending up
          await placeOrder({
            asset: 'TON',
            side: 'buy',
            type: 'market',
            amount: 50,
            amountType: 'percent',
          });
          entryPrice = lastClose;
        } else if (inPosition) {
          const position = portfolio.positions.get('TON');
          if (position) {
            const drawdown = (position.entryPrice - lastClose) / position.entryPrice;
            const gain = (lastClose - position.entryPrice) / position.entryPrice;
            // Stop loss at 5% or take profit at 15%
            if (drawdown > 0.05 || gain > 0.15) {
              await placeOrder({
                asset: 'TON',
                side: 'sell',
                type: 'market',
                amount: position.amount,
              });
              entryPrice = lastClose;
            }
          }
        } else {
          entryPrice = lastClose;
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
        volatility: 0.03,
        drift: 0.0008,
        seed: 99,
      },
    },
    simulationConfig: {
      initialCapital: 10000,
      currency: 'USD',
      slippageModel: { type: 'fixed', baseSlippage: 5 },
      feeModel: { tradingFeePercent: 0.1, gasCostUsd: 0.02 },
      fillModel: DEFAULT_FILL_MODEL,
    },
    riskEvaluation: true,
    generateReport: true,
  });

  if (trendResult.report) {
    console.log('\n--- Trend Following Results ---');
    console.log(framework.reports.formatSummaryString(trendResult.report));
    console.log('');

    console.log('Trade Statistics:');
    const trades = trendResult.performance!.trades;
    console.log(`  Total Trades: ${trades.totalTrades}`);
    console.log(`  Win Rate: ${trades.winRate.toFixed(1)}%`);
    console.log(`  Profit Factor: ${trades.profitFactor.toFixed(2)}`);
    console.log(`  Total Fees Paid: $${trades.totalFeesPaid.toFixed(2)}`);
  }

  console.log('');

  // ============================================================
  // Summary comparison
  // ============================================================
  console.log('========================================================');
  console.log('Strategy Comparison');
  console.log('========================================================');
  console.log('');

  const dcaPerf = dcaResult.performance!;
  const trendPerf = trendResult.performance!;

  const fmt = (n: number, decimals = 2) => n.toFixed(decimals);

  console.log(`${'Metric'.padEnd(25)} ${'DCA TON'.padStart(12)} ${'Trend Following'.padStart(18)}`);
  console.log('-'.repeat(57));
  console.log(`${'Total Return (%)'.padEnd(25)} ${fmt(dcaPerf.summary.totalReturn).padStart(12)} ${fmt(trendPerf.summary.totalReturn).padStart(18)}`);
  console.log(`${'Sharpe Ratio'.padEnd(25)} ${fmt(dcaPerf.risk.sharpeRatio, 3).padStart(12)} ${fmt(trendPerf.risk.sharpeRatio, 3).padStart(18)}`);
  console.log(`${'Max Drawdown (%)'.padEnd(25)} ${fmt(dcaPerf.risk.maxDrawdown).padStart(12)} ${fmt(trendPerf.risk.maxDrawdown).padStart(18)}`);
  console.log(`${'Win Rate (%)'.padEnd(25)} ${fmt(dcaPerf.trades.winRate).padStart(12)} ${fmt(trendPerf.trades.winRate).padStart(18)}`);
  console.log(`${'Risk Grade'.padEnd(25)} ${(dcaResult.riskEvaluation?.riskGrade ?? 'N/A').padStart(12)} ${(trendResult.riskEvaluation?.riskGrade ?? 'N/A').padStart(18)}`);
  console.log('');

  console.log('Demo complete! See docs/backtesting.md for full documentation.');
  console.log('========================================================');
}

runBacktestingDemo().catch(console.error);
