#!/usr/bin/env npx ts-node
/**
 * TONAIAgent - Strategy Backtest CLI
 *
 * Run historical backtests on marketplace strategies from the command line.
 *
 * Usage:
 *   npm run backtest <strategy> <asset> <start-date> <end-date> [options]
 *
 * Examples:
 *   npm run backtest momentum TON 2024-01-01 2024-06-30
 *   npm run backtest "mean reversion" BTCUSDT 2023-01-01 2024-01-01 --capital 50000
 *   npm run backtest grid-trading ETH 2024-01-01 2024-03-01 --timeframe 4h
 *
 * Options:
 *   --capital <amount>    Initial capital in USD (default: 10000)
 *   --timeframe <tf>      Candle timeframe: 1m, 5m, 15m, 1h, 4h, 1d (default: 1h)
 *   --verbose            Show detailed output
 *   --help               Show this help message
 *
 * Issue #202: Strategy Backtesting Engine
 */

import {
  createMarketplaceBacktester,
  createStrategyMarketplace,
  parseCLIBacktestArgs,
  formatCLIBacktestResult,
  type BacktestTimeframe,
  type MarketplaceBacktestConfig,
} from '../src/strategy-marketplace';

// ============================================================================
// CLI Constants
// ============================================================================

const HELP_TEXT = `
TONAIAgent Strategy Backtest CLI
================================

Usage:
  npm run backtest <strategy> <asset> <start-date> <end-date> [options]

Arguments:
  strategy     Strategy name or ID (e.g., "momentum", "mean-reversion-pro")
  asset        Trading asset (e.g., TON, BTC, ETH, SOL)
  start-date   Backtest start date (YYYY-MM-DD format)
  end-date     Backtest end date (YYYY-MM-DD format)

Options:
  --capital <amount>    Initial capital in USD (default: 10000)
  --timeframe <tf>      Candle timeframe: 1m, 5m, 15m, 1h, 4h, 1d (default: 1h)
  --verbose             Show detailed output including equity curve
  --json                Output results as JSON
  --help, -h            Show this help message

Examples:
  npm run backtest momentum TON 2024-01-01 2024-06-30
  npm run backtest "mean reversion" BTC 2023-01-01 2024-01-01 --capital 50000
  npm run backtest grid-trading ETH 2024-01-01 2024-03-01 --timeframe 4h
  npm run backtest yield-optimizer TON 2024-01-01 2024-06-30 --json

Available Strategies:
  - momentum-trader       Momentum strategy using MA crossovers
  - mean-reversion-pro    Mean reversion with Bollinger Bands
  - dex-arbitrage-hunter  DEX arbitrage opportunities
  - grid-trading-bot      Grid trading for ranging markets
  - yield-optimizer       DeFi yield optimization
  - trend-following-alpha Multi-timeframe trend following
`;

// ============================================================================
// CLI Argument Parser
// ============================================================================

interface CLIOptions {
  strategy: string;
  asset: string;
  startDate: string;
  endDate: string;
  capital: number;
  timeframe: BacktestTimeframe;
  verbose: boolean;
  json: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions | null {
  // Check for help flag first
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    return { help: true } as CLIOptions;
  }

  // Need at least 4 positional arguments
  if (args.length < 4) {
    console.error('Error: Missing required arguments');
    console.error('Usage: npm run backtest <strategy> <asset> <start-date> <end-date>');
    console.error('Run "npm run backtest --help" for more information.');
    return null;
  }

  const [strategy, asset, startDate, endDate, ...rest] = args;

  // Parse options
  let capital = 10000;
  let timeframe: BacktestTimeframe = '1h';
  let verbose = false;
  let json = false;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];

    if (arg === '--capital' && rest[i + 1]) {
      capital = parseFloat(rest[i + 1]);
      i++;
    } else if (arg === '--timeframe' && rest[i + 1]) {
      timeframe = rest[i + 1] as BacktestTimeframe;
      i++;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--json') {
      json = true;
    }
  }

  return {
    strategy,
    asset: asset.toUpperCase(),
    startDate,
    endDate,
    capital,
    timeframe,
    verbose,
    json,
    help: false,
  };
}

// ============================================================================
// Main CLI Function
// ============================================================================

async function main(): Promise<void> {
  // Get command line arguments (skip node and script path)
  const args = process.argv.slice(2);

  // Parse arguments
  const options = parseArgs(args);

  if (!options) {
    process.exit(1);
  }

  if (options.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  console.log('');
  console.log('TONAIAgent Strategy Backtest');
  console.log('============================');
  console.log('');

  try {
    // Initialize marketplace and backtester
    const marketplace = createStrategyMarketplace();
    const backtester = createMarketplaceBacktester(undefined, marketplace);

    // Find strategy by name or ID
    console.log(`Searching for strategy: "${options.strategy}"...`);

    const strategies = await marketplace.listStrategies({
      search: options.strategy,
      limit: 5,
    });

    if (strategies.length === 0) {
      console.error(`Error: Strategy not found: "${options.strategy}"`);
      console.error('');
      console.error('Available strategies:');
      const allStrategies = await marketplace.listStrategies();
      allStrategies.forEach((s) => {
        console.error(`  - ${s.id} (${s.name})`);
      });
      process.exit(1);
    }

    const strategy = strategies[0];
    console.log(`Found strategy: ${strategy.name} (${strategy.id})`);
    console.log('');

    // Validate dates
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    if (isNaN(startDate.getTime())) {
      console.error(`Error: Invalid start date: "${options.startDate}"`);
      console.error('Use YYYY-MM-DD format (e.g., 2024-01-01)');
      process.exit(1);
    }

    if (isNaN(endDate.getTime())) {
      console.error(`Error: Invalid end date: "${options.endDate}"`);
      console.error('Use YYYY-MM-DD format (e.g., 2024-06-30)');
      process.exit(1);
    }

    if (startDate >= endDate) {
      console.error('Error: Start date must be before end date');
      process.exit(1);
    }

    // Build backtest configuration
    const config: MarketplaceBacktestConfig = {
      strategyId: strategy.id,
      asset: options.asset,
      timeframe: options.timeframe,
      startDate,
      endDate,
      initialCapital: options.capital,
      enableRiskEvaluation: true,
    };

    // Validate configuration
    const validation = backtester.validateConfig(config);
    if (!validation.valid) {
      console.error('Error: Invalid configuration:');
      validation.errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }

    // Show configuration
    console.log('Configuration:');
    console.log(`  Strategy:  ${strategy.name}`);
    console.log(`  Asset:     ${options.asset}`);
    console.log(`  Timeframe: ${options.timeframe}`);
    console.log(`  Period:    ${options.startDate} to ${options.endDate}`);
    console.log(`  Capital:   $${options.capital.toLocaleString()}`);
    console.log('');
    console.log('Running backtest...');
    console.log('');

    // Run backtest
    const startTime = Date.now();
    const result = await backtester.runBacktest(config);
    const duration = Date.now() - startTime;

    // Output results
    if (options.json) {
      console.log(JSON.stringify(result.summary, null, 2));
    } else {
      console.log(formatCLIBacktestResult(result.summary));

      if (options.verbose && result.fullResult.equityCurve.length > 0) {
        console.log('Equity Curve (sampled):');
        console.log('─────────────────────────────────────────────────────────');

        const curve = result.fullResult.equityCurve;
        const sampleSize = Math.min(10, curve.length);
        const step = Math.floor(curve.length / sampleSize);

        for (let i = 0; i < curve.length; i += step) {
          const point = curve[i];
          const date = point.timestamp.toISOString().split('T')[0];
          const value = point.equity.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const bar = '█'.repeat(Math.round((point.equity / config.initialCapital) * 20));
          console.log(`  ${date}  $${value.padStart(12)}  ${bar}`);
        }

        console.log('');
      }

      if (result.warnings.length > 0) {
        console.log('Warnings:');
        result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
        console.log('');
      }
    }

    // Exit with appropriate code
    process.exit(result.summary.totalReturn >= 0 ? 0 : 0);

  } catch (error) {
    console.error('');
    console.error('Backtest failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run CLI
main();
