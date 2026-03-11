/**
 * TONAIAgent - Strategy Marketplace Backtesting Integration Tests
 *
 * Tests for the backtesting integration layer that connects
 * the Strategy Marketplace with the Backtesting Engine.
 *
 * Issue #202: Strategy Backtesting Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMarketplaceBacktester,
  DefaultMarketplaceBacktester,
  createStrategyMarketplace,
  parseCLIBacktestArgs,
  formatCLIBacktestResult,
  type MarketplaceBacktestConfig,
  type BacktestTimeframe,
  type BacktestResultSummary,
} from '../../src/strategy-marketplace';

describe('Strategy Marketplace Backtesting Integration', () => {
  let backtester: DefaultMarketplaceBacktester;

  beforeEach(() => {
    backtester = createMarketplaceBacktester();
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createMarketplaceBacktester', () => {
    it('should create a backtester instance', () => {
      const instance = createMarketplaceBacktester();
      expect(instance).toBeInstanceOf(DefaultMarketplaceBacktester);
    });

    it('should create instance with custom marketplace', () => {
      const marketplace = createStrategyMarketplace();
      const instance = createMarketplaceBacktester(undefined, marketplace);
      expect(instance).toBeInstanceOf(DefaultMarketplaceBacktester);
    });
  });

  // ============================================================================
  // Configuration Validation Tests
  // ============================================================================

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 10000,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing strategy ID', () => {
      const config = {
        strategyId: '',
        asset: 'TON',
        timeframe: '1h' as BacktestTimeframe,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 10000,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Strategy ID is required');
    });

    it('should reject missing asset', () => {
      const config = {
        strategyId: 'momentum-trader',
        asset: '',
        timeframe: '1h' as BacktestTimeframe,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 10000,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Asset is required');
    });

    it('should reject invalid timeframe', () => {
      const config = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: 'invalid' as BacktestTimeframe,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 10000,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid timeframe'))).toBe(true);
    });

    it('should reject start date after end date', () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-06-30'),
        endDate: new Date('2024-01-01'),
        initialCapital: 10000,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('should reject capital below minimum', () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 50,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum initial capital is $100');
    });

    it('should reject zero or negative capital', () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        initialCapital: 0,
      };

      const result = backtester.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Initial capital must be positive');
    });
  });

  // ============================================================================
  // Available Options Tests
  // ============================================================================

  describe('getAvailableAssets', () => {
    it('should return list of available assets', () => {
      const assets = backtester.getAvailableAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
      expect(assets).toContain('TON');
      expect(assets).toContain('BTC');
      expect(assets).toContain('ETH');
    });
  });

  describe('getAvailableTimeframes', () => {
    it('should return list of available timeframes', () => {
      const timeframes = backtester.getAvailableTimeframes();
      expect(Array.isArray(timeframes)).toBe(true);
      expect(timeframes.length).toBeGreaterThan(0);
      expect(timeframes).toContain('1h');
      expect(timeframes).toContain('4h');
      expect(timeframes).toContain('1d');
    });

    it('should include all standard timeframes', () => {
      const timeframes = backtester.getAvailableTimeframes();
      const expected = ['1m', '5m', '15m', '1h', '4h', '1d'];
      expected.forEach((tf) => {
        expect(timeframes).toContain(tf);
      });
    });
  });

  // ============================================================================
  // Backtest Execution Tests
  // ============================================================================

  describe('runBacktest', () => {
    it('should run backtest for momentum strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.strategyId).toBe('momentum-trader');
      expect(result.summary.asset).toBe('TON');
      expect(result.summary.initialCapital).toBe(10000);
      expect(typeof result.summary.totalReturn).toBe('number');
      expect(typeof result.summary.maxDrawdown).toBe('number');
      expect(typeof result.summary.winRate).toBe('number');
      expect(typeof result.summary.sharpeRatio).toBe('number');
    });

    it('should run backtest for mean reversion strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'mean-reversion-pro',
        asset: 'ETH',
        timeframe: '4h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 5000,
      };

      const result = await backtester.runBacktest(config);

      expect(result).toBeDefined();
      expect(result.summary.strategyId).toBe('mean-reversion-pro');
      expect(result.summary.asset).toBe('ETH');
      expect(result.fullResult).toBeDefined();
      expect(result.fullResult.status).toBe('completed');
    });

    it('should throw error for non-existent strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'non-existent-strategy',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-01'),
        initialCapital: 10000,
      };

      await expect(backtester.runBacktest(config)).rejects.toThrow(
        'Strategy not found'
      );
    });

    it('should return equity curve in results', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1d',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);

      expect(result.summary.equityCurve).toBeDefined();
      expect(Array.isArray(result.summary.equityCurve)).toBe(true);
      expect(result.summary.equityCurve.length).toBeGreaterThan(0);

      const firstPoint = result.summary.equityCurve[0];
      expect(firstPoint.timestamp).toBeInstanceOf(Date);
      expect(typeof firstPoint.value).toBe('number');
    });

    it('should return trade markers in results', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);

      expect(result.summary.tradeMarkers).toBeDefined();
      expect(Array.isArray(result.summary.tradeMarkers)).toBe(true);

      if (result.summary.tradeMarkers.length > 0) {
        const marker = result.summary.tradeMarkers[0];
        expect(['buy', 'sell']).toContain(marker.type);
        expect(typeof marker.price).toBe('number');
      }
    });

    it('should include risk grade in results', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
        enableRiskEvaluation: true,
      };

      const result = await backtester.runBacktest(config);

      expect(result.summary.riskGrade).toBeDefined();
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.summary.riskGrade);
    });
  });

  // ============================================================================
  // Result Storage Tests
  // ============================================================================

  describe('getBacktestResult', () => {
    it('should retrieve stored backtest result', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);
      const retrieved = backtester.getBacktestResult(result.summary.backtestId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.summary.backtestId).toBe(result.summary.backtestId);
    });

    it('should return undefined for non-existent backtest', () => {
      const result = backtester.getBacktestResult('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getStrategyBacktests', () => {
    it('should return all backtests for a strategy', async () => {
      // Run two backtests for the same strategy
      const config1: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const config2: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'BTC',
        timeframe: '4h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 5000,
      };

      await backtester.runBacktest(config1);
      await backtester.runBacktest(config2);

      const results = backtester.getStrategyBacktests('momentum-trader');
      expect(results.length).toBe(2);
      results.forEach((r) => {
        expect(r.config.strategyId).toBe('momentum-trader');
      });
    });
  });

  describe('getAllBacktests', () => {
    it('should return all backtests sorted by date', async () => {
      const config1: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const config2: MarketplaceBacktestConfig = {
        strategyId: 'mean-reversion-pro',
        asset: 'ETH',
        timeframe: '4h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 5000,
      };

      await backtester.runBacktest(config1);
      await backtester.runBacktest(config2);

      const results = backtester.getAllBacktests();
      expect(results.length).toBe(2);

      // Should be sorted by date (newest first)
      if (results.length >= 2) {
        const time1 = results[0].fullResult.startedAt.getTime();
        const time2 = results[1].fullResult.startedAt.getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });
  });

  // ============================================================================
  // Strategy Comparison Tests
  // ============================================================================

  describe('compareStrategies', () => {
    it('should compare multiple strategies', async () => {
      const strategyIds = ['momentum-trader', 'mean-reversion-pro'];
      const baseConfig = {
        asset: 'TON',
        timeframe: '1h' as BacktestTimeframe,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const comparison = await backtester.compareStrategies(strategyIds, baseConfig);

      expect(comparison.strategies.length).toBe(2);
      expect(comparison.bestByRoi).toBeDefined();
      expect(comparison.bestByRiskAdjusted).toBeDefined();
      expect(comparison.lowestDrawdown).toBeDefined();
      expect(comparison.highestWinRate).toBeDefined();

      // Should be one of the compared strategies
      expect(strategyIds).toContain(comparison.bestByRoi);
      expect(strategyIds).toContain(comparison.bestByRiskAdjusted);
    });
  });

  // ============================================================================
  // CLI Utilities Tests
  // ============================================================================

  describe('parseCLIBacktestArgs', () => {
    it('should parse valid CLI arguments', () => {
      const args = ['momentum', 'TON', '2024-01-01', '2024-06-30'];
      const result = parseCLIBacktestArgs(args);

      expect(result).toBeDefined();
      expect(result?.strategyName).toBe('momentum');
      expect(result?.asset).toBe('TON');
      expect(result?.startDate).toBe('2024-01-01');
      expect(result?.endDate).toBe('2024-06-30');
    });

    it('should parse optional arguments', () => {
      const args = [
        'momentum',
        'btc',
        '2024-01-01',
        '2024-06-30',
        '--capital',
        '50000',
        '--timeframe',
        '4h',
      ];
      const result = parseCLIBacktestArgs(args);

      expect(result).toBeDefined();
      expect(result?.asset).toBe('BTC'); // Should be uppercased
      expect(result?.initialCapital).toBe(50000);
      expect(result?.timeframe).toBe('4h');
    });

    it('should return null for insufficient arguments', () => {
      const args = ['momentum', 'TON'];
      const result = parseCLIBacktestArgs(args);
      expect(result).toBeNull();
    });
  });

  describe('formatCLIBacktestResult', () => {
    it('should format backtest result for CLI output', () => {
      const summary: BacktestResultSummary = {
        backtestId: 'bt_123',
        strategyId: 'momentum-trader',
        strategyName: 'Momentum Trader',
        asset: 'TON',
        period: 'Jan 2024 - Jun 2024',
        initialCapital: 10000,
        finalValue: 12500,
        totalReturn: 25.0,
        maxDrawdown: -8.5,
        totalTrades: 42,
        winRate: 65.3,
        sharpeRatio: 1.85,
        profitFactor: 2.1,
        riskGrade: 'B',
        durationMs: 1500,
        equityCurve: [],
        tradeMarkers: [],
      };

      const output = formatCLIBacktestResult(summary);

      expect(output).toContain('Momentum Trader');
      expect(output).toContain('TON');
      expect(output).toContain('25.00%');
      expect(output).toContain('$12,500.00');
      expect(output).toContain('42');
      expect(output).toContain('65.3%');
      expect(output).toContain('1.85');
      expect(output).toContain('B');
    });

    it('should handle negative returns', () => {
      const summary: BacktestResultSummary = {
        backtestId: 'bt_456',
        strategyId: 'test-strategy',
        strategyName: 'Test Strategy',
        asset: 'ETH',
        period: 'Jan 2024 - Feb 2024',
        initialCapital: 10000,
        finalValue: 8500,
        totalReturn: -15.0,
        maxDrawdown: -20.0,
        totalTrades: 20,
        winRate: 40.0,
        sharpeRatio: -0.5,
        profitFactor: 0.8,
        riskGrade: 'D',
        durationMs: 1000,
        equityCurve: [],
        tradeMarkers: [],
      };

      const output = formatCLIBacktestResult(summary);

      expect(output).toContain('-15.00%');
      expect(output).toContain('D');
    });
  });

  // ============================================================================
  // Strategy Category Tests
  // ============================================================================

  describe('strategy categories', () => {
    it('should run backtest for arbitrage strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'dex-arbitrage-hunter',
        asset: 'TON',
        timeframe: '5m',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);
      expect(result.summary.strategyId).toBe('dex-arbitrage-hunter');
    });

    it('should run backtest for grid trading strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'grid-trading-bot',
        asset: 'BTC',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);
      expect(result.summary.strategyId).toBe('grid-trading-bot');
    });

    it('should run backtest for yield farming strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'yield-optimizer',
        asset: 'TON',
        timeframe: '1d',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);
      expect(result.summary.strategyId).toBe('yield-optimizer');
    });

    it('should run backtest for trend following strategy', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'trend-following-alpha',
        asset: 'ETH',
        timeframe: '4h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);
      expect(result.summary.strategyId).toBe('trend-following-alpha');
    });
  });

  // ============================================================================
  // Performance Metrics Tests
  // ============================================================================

  describe('performance metrics', () => {
    it('should calculate realistic metrics', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);

      // Check metrics are in realistic ranges
      expect(result.summary.totalReturn).toBeGreaterThanOrEqual(-50);
      expect(result.summary.totalReturn).toBeLessThanOrEqual(100);

      // maxDrawdown can be positive or negative depending on framework output
      // The important thing is it's within reasonable bounds
      expect(Math.abs(result.summary.maxDrawdown)).toBeLessThanOrEqual(50);

      expect(result.summary.winRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.winRate).toBeLessThanOrEqual(100);

      expect(result.summary.totalTrades).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent final value and ROI', async () => {
      const config: MarketplaceBacktestConfig = {
        strategyId: 'momentum-trader',
        asset: 'TON',
        timeframe: '1h',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        initialCapital: 10000,
      };

      const result = await backtester.runBacktest(config);

      // Final value should match calculated ROI
      const expectedFinal = config.initialCapital * (1 + result.summary.totalReturn / 100);
      expect(result.summary.finalValue).toBeCloseTo(expectedFinal, 0);
    });
  });
});
