/**
 * TONAIAgent - AI Credit Layer Tests
 *
 * Comprehensive tests for the AI-native credit, lending, and underwriting infrastructure.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAICreditManager,
  createCoinRabbitAdapter,
  createLendingManager,
  createCreditScorer,
  createCollateralManager,
  createUnderwritingEngine,
  createStrategyEngine,
  DefaultAICreditManager,
  DefaultCoinRabbitAdapter,
  DefaultLendingManager,
  DefaultCreditScorer,
  DefaultCollateralManager,
  DefaultUnderwritingEngine,
  DefaultStrategyEngine,
} from '../../src/ai-credit';

// ============================================================================
// CoinRabbit Adapter Tests
// ============================================================================

describe('CoinRabbitAdapter', () => {
  let adapter: DefaultCoinRabbitAdapter;

  beforeEach(() => {
    adapter = createCoinRabbitAdapter({ sandbox: true });
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      await adapter.connect();
      expect(adapter.connected).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.connected).toBe(false);
    });

    it('should pass health check when connected', async () => {
      await adapter.connect();
      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('getSupportedCoins', () => {
    it('should return supported coins', async () => {
      await adapter.connect();
      const coins = await adapter.getSupportedCoins();

      expect(coins.length).toBeGreaterThan(0);
      expect(coins.some((c) => c.symbol === 'BTC')).toBe(true);
      expect(coins.some((c) => c.symbol === 'ETH')).toBe(true);
      expect(coins.some((c) => c.symbol === 'TON')).toBe(true);
    });
  });

  describe('getRates', () => {
    it('should return rates for valid pair', async () => {
      await adapter.connect();
      const rate = await adapter.getRates('BTC', 'USDT');

      expect(rate.collateralCoin).toBe('BTC');
      expect(rate.loanCoin).toBe('USDT');
      expect(rate.ltv).toBeGreaterThan(0);
      expect(rate.ltv).toBeLessThanOrEqual(1);
      expect(rate.interestRate).toBeGreaterThan(0);
    });

    it('should throw for invalid pair', async () => {
      await adapter.connect();
      await expect(adapter.getRates('INVALID', 'USDT')).rejects.toThrow('Rate not found');
    });
  });

  describe('getQuote', () => {
    it('should return a valid quote', async () => {
      await adapter.connect();
      const quote = await adapter.getQuote('ETH', '10', 'USDT', 0.5);

      expect(quote.id).toBeDefined();
      expect(quote.collateralCoin).toBe('ETH');
      expect(quote.collateralAmount).toBe('10');
      expect(quote.loanCoin).toBe('USDT');
      expect(parseFloat(quote.loanAmount)).toBeGreaterThan(0);
      expect(quote.ltv).toBe(0.5);
      expect(quote.validUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('createLoan', () => {
    it('should create a loan', async () => {
      await adapter.connect();
      const loan = await adapter.createLoan({
        collateralCoin: 'TON',
        collateralAmount: '1000',
        loanCoin: 'USDT',
        loanAmount: '500',
        ltv: 0.5,
        walletAddress: 'test-wallet',
      });

      expect(loan.id).toBeDefined();
      expect(loan.collateral.coin).toBe('TON');
      expect(loan.collateral.amount).toBe('1000');
      expect(loan.loan.coin).toBe('USDT');
      expect(loan.loan.amount).toBe('500');
      expect(loan.status).toBe('pending');
    });

    it('should emit loan event', async () => {
      await adapter.connect();

      const events: any[] = [];
      adapter.onEvent((event) => events.push(event));

      await adapter.createLoan({
        collateralCoin: 'ETH',
        collateralAmount: '5',
        loanCoin: 'USDT',
        loanAmount: '1000',
        ltv: 0.5,
        walletAddress: 'test-wallet',
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'loan_requested')).toBe(true);
    });
  });

  describe('loan simulation', () => {
    it('should simulate repayment', async () => {
      await adapter.connect();
      const loan = await adapter.createLoan({
        collateralCoin: 'BTC',
        collateralAmount: '1',
        loanCoin: 'USDT',
        loanAmount: '10000',
        ltv: 0.5,
        walletAddress: 'test-wallet',
      });

      await adapter.simulateRepayment(loan.id, '5000');
      const updated = await adapter.getLoan(loan.id);

      expect(parseFloat(updated.loan.amount)).toBeLessThan(10000);
    });

    it('should simulate collateral top-up', async () => {
      await adapter.connect();
      const loan = await adapter.createLoan({
        collateralCoin: 'ETH',
        collateralAmount: '10',
        loanCoin: 'USDT',
        loanAmount: '5000',
        ltv: 0.5,
        walletAddress: 'test-wallet',
      });

      await adapter.simulateCollateralTopUp(loan.id, '5');
      const updated = await adapter.getLoan(loan.id);

      expect(parseFloat(updated.collateral.amount)).toBe(15);
      expect(updated.ltv).toBeLessThan(0.5);
    });
  });
});

// ============================================================================
// Lending Manager Tests
// ============================================================================

describe('LendingManager', () => {
  let lending: DefaultLendingManager;

  beforeEach(() => {
    lending = createLendingManager({
      minLoanAmount: '100',
      maxLoanAmount: '100000',
      maxLTV: 0.75,
    });
  });

  describe('providers', () => {
    it('should have CoinRabbit provider registered', () => {
      const providers = lending.getAvailableProviders();
      expect(providers).toContain('coinrabbit');
    });
  });

  describe('getQuote', () => {
    it('should get a quote from default provider', async () => {
      const quote = await lending.getQuote({
        collateralAsset: 'TON',
        collateralAmount: '1000',
        borrowAsset: 'USDT',
      });

      expect(quote.provider).toBe('coinrabbit');
      expect(quote.collateral.asset).toBe('TON');
      expect(parseFloat(quote.loan.amount)).toBeGreaterThan(0);
    });

    it('should get best quote across providers', async () => {
      const quote = await lending.getBestQuote({
        collateralAsset: 'ETH',
        collateralAmount: '10',
        borrowAsset: 'USDT',
      });

      expect(quote.provider).toBeDefined();
      expect(quote.interestRate).toBeGreaterThan(0);
    });
  });

  describe('createLoan', () => {
    it('should create a loan', async () => {
      const loan = await lending.createLoan({
        collateralAssets: [{ symbol: 'TON', amount: '1000' }],
        borrowAsset: 'USDT',
        borrowAmount: '500',
        ltv: 0.5,
      });

      expect(loan.id).toBeDefined();
      expect(loan.status).toBeDefined();
      expect(loan.collateral.assets.length).toBe(1);
      expect(loan.principal.asset).toBe('USDT');
    });

    it('should reject loans below minimum', async () => {
      await expect(
        lending.createLoan({
          collateralAssets: [{ symbol: 'TON', amount: '10' }],
          borrowAsset: 'USDT',
          borrowAmount: '50', // Below minimum of 100
        })
      ).rejects.toThrow('Amount below minimum');
    });

    it('should reject loans above maximum', async () => {
      await expect(
        lending.createLoan({
          collateralAssets: [{ symbol: 'BTC', amount: '100' }],
          borrowAsset: 'USDT',
          borrowAmount: '500000', // Above maximum of 100000
        })
      ).rejects.toThrow('Amount above maximum');
    });

    it('should reject loans with LTV above maximum', async () => {
      await expect(
        lending.createLoan({
          collateralAssets: [{ symbol: 'TON', amount: '1000' }],
          borrowAsset: 'USDT',
          borrowAmount: '500',
          ltv: 0.9, // Above max of 0.75
        })
      ).rejects.toThrow('LTV');
    });
  });

  describe('checkLoanHealth', () => {
    it('should check loan health', async () => {
      const loan = await lending.createLoan({
        collateralAssets: [{ symbol: 'ETH', amount: '10' }],
        borrowAsset: 'USDT',
        borrowAmount: '5000',
        ltv: 0.5,
      });

      const health = await lending.checkLoanHealth(loan.id);

      expect(health.loanId).toBe(loan.id);
      expect(health.health).toBeDefined();
      expect(health.ltv).toBeGreaterThan(0);
      expect(health.healthFactor).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return lending statistics', async () => {
      const stats = await lending.getStats();

      expect(stats.totalLoans).toBeDefined();
      expect(stats.activeLoans).toBeDefined();
      expect(stats.averageLTV).toBeDefined();
    });
  });
});

// ============================================================================
// Credit Scorer Tests
// ============================================================================

describe('CreditScorer', () => {
  let scorer: DefaultCreditScorer;

  beforeEach(() => {
    scorer = createCreditScorer({
      scoringModel: 'ai_powered',
      minScoreForBorrowing: 300,
    });
  });

  describe('calculateScore', () => {
    it('should calculate credit score', async () => {
      const score = await scorer.calculateScore('user-1');

      expect(score.userId).toBe('user-1');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1000);
      expect(score.grade).toBeDefined();
      expect(score.factors.length).toBeGreaterThan(0);
    });

    it('should assign appropriate grade', async () => {
      const score = await scorer.calculateScore('user-2');

      const validGrades = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'];
      expect(validGrades).toContain(score.grade);
    });

    it('should include factor breakdown', async () => {
      const score = await scorer.calculateScore('user-3');

      expect(score.breakdown).toBeDefined();
      expect(score.breakdown.walletActivity).toBeDefined();
      expect(score.breakdown.defiHistory).toBeDefined();
      expect(score.breakdown.repaymentHistory).toBeDefined();
      expect(score.breakdown.collateralQuality).toBeDefined();
      expect(score.breakdown.portfolioStability).toBeDefined();
      expect(score.breakdown.behavioralPatterns).toBeDefined();
    });
  });

  describe('checkEligibility', () => {
    it('should check borrowing eligibility', async () => {
      const eligibility = await scorer.checkEligibility('user-1');

      expect(eligibility.canBorrow).toBeDefined();
      expect(eligibility.maxBorrowAmount).toBeDefined();
      expect(eligibility.availableProviders).toBeDefined();
      expect(eligibility.bestRateAvailable).toBeDefined();
    });
  });

  describe('getRecommendations', () => {
    it('should provide recommendations', async () => {
      await scorer.calculateScore('user-1'); // Calculate first
      const recommendations = await scorer.getRecommendations('user-1');

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('factor analysis', () => {
    it('should analyze wallet activity', async () => {
      const analysis = await scorer.analyzeWalletActivity('user-1');

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.transactionCount).toBeDefined();
      expect(analysis.activityFrequency).toBeDefined();
    });

    it('should analyze DeFi history', async () => {
      const analysis = await scorer.analyzeDeFiHistory('user-1');

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.protocolsUsed).toBeDefined();
      expect(analysis.tvlHistory).toBeDefined();
    });

    it('should analyze behavioral patterns', async () => {
      const analysis = await scorer.analyzeBehavioralPatterns('user-1');

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.panicSellRisk).toBeDefined();
      expect(analysis.fomoBuyRisk).toBeDefined();
    });
  });
});

// ============================================================================
// Collateral Manager Tests
// ============================================================================

describe('CollateralManager', () => {
  let manager: DefaultCollateralManager;

  beforeEach(() => {
    manager = createCollateralManager({
      autoMonitoring: false, // Disable for tests
      autoTopUpEnabled: true,
      autoTopUpThreshold: 0.75,
    });
  });

  describe('createPosition', () => {
    it('should create collateral position', async () => {
      const position = await manager.createPosition('loan-1', 'user-1', [
        { symbol: 'TON', amount: '1000' },
        { symbol: 'ETH', amount: '5' },
      ]);

      expect(position.id).toBeDefined();
      expect(position.loanId).toBe('loan-1');
      expect(position.userId).toBe('user-1');
      expect(position.assets.length).toBe(2);
      expect(position.status).toBe('healthy');
    });

    it('should calculate position value', async () => {
      const position = await manager.createPosition('loan-2', 'user-1', [
        { symbol: 'TON', amount: '100' },
      ]);

      expect(parseFloat(position.totalValueUSD)).toBeGreaterThan(0);
    });
  });

  describe('addAsset', () => {
    it('should add asset to position', async () => {
      const position = await manager.createPosition('loan-3', 'user-1', [
        { symbol: 'ETH', amount: '5' },
      ]);

      const updated = await manager.addAsset(position.id, {
        symbol: 'TON',
        amount: '500',
      });

      expect(updated.assets.length).toBe(2);
      expect(updated.assets.some((a) => a.symbol === 'TON')).toBe(true);
    });

    it('should add to existing asset', async () => {
      const position = await manager.createPosition('loan-4', 'user-1', [
        { symbol: 'ETH', amount: '5' },
      ]);

      const updated = await manager.addAsset(position.id, {
        symbol: 'ETH',
        amount: '3',
      });

      expect(updated.assets.length).toBe(1);
      expect(parseFloat(updated.assets[0].amount)).toBe(8);
    });
  });

  describe('removeAsset', () => {
    it('should remove asset from position', async () => {
      const position = await manager.createPosition('loan-5', 'user-1', [
        { symbol: 'ETH', amount: '10' },
      ]);

      const updated = await manager.removeAsset(position.id, 'ETH', '3');

      expect(parseFloat(updated.assets[0].amount)).toBe(7);
    });

    it('should reject removal exceeding balance', async () => {
      const position = await manager.createPosition('loan-6', 'user-1', [
        { symbol: 'TON', amount: '100' },
      ]);

      await expect(
        manager.removeAsset(position.id, 'TON', '200')
      ).rejects.toThrow('Insufficient');
    });
  });

  describe('checkPosition', () => {
    it('should return position metrics', async () => {
      const position = await manager.createPosition('loan-7', 'user-1', [
        { symbol: 'ETH', amount: '10' },
      ]);

      const metrics = await manager.checkPosition(position.id);

      expect(metrics.healthFactor).toBeDefined();
      expect(metrics.volatilityIndex).toBeDefined();
      expect(metrics.diversificationScore).toBeDefined();
    });
  });

  describe('hedging', () => {
    it('should enable hedging', async () => {
      const position = await manager.createPosition('loan-8', 'user-1', [
        { symbol: 'ETH', amount: '10' },
      ]);

      await manager.enableHedging(position.id, 'delta_neutral');
      const status = await manager.getHedgingStatus(position.id);

      expect(status?.enabled).toBe(true);
      expect(status?.strategy).toBe('delta_neutral');
      expect(status?.positions.length).toBeGreaterThan(0);
    });

    it('should disable hedging', async () => {
      const position = await manager.createPosition('loan-9', 'user-1', [
        { symbol: 'TON', amount: '1000' },
      ]);

      await manager.enableHedging(position.id, 'protective_puts');
      await manager.disableHedging(position.id);

      const status = await manager.getHedgingStatus(position.id);
      expect(status?.enabled).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return collateral statistics', async () => {
      const stats = await manager.getStats();

      expect(stats.totalPositions).toBeDefined();
      expect(stats.totalValueUSD).toBeDefined();
      expect(stats.positionsAtRisk).toBeDefined();
    });
  });
});

// ============================================================================
// Underwriting Engine Tests
// ============================================================================

describe('UnderwritingEngine', () => {
  let engine: DefaultUnderwritingEngine;

  beforeEach(() => {
    engine = createUnderwritingEngine({
      riskModel: 'moderate',
      maxExposure: '1000000',
    });
  });

  describe('assessLoanRequest', () => {
    it('should assess a loan request', async () => {
      const assessment = await engine.assessLoanRequest('user-1', {
        requestedAmount: '5000',
        requestedAsset: 'USDT',
        collateral: [{ asset: 'ETH', amount: '5' }],
        purpose: 'Yield farming',
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.userId).toBe('user-1');
      expect(assessment.assessment).toBeDefined();
      expect(assessment.creditAnalysis).toBeDefined();
      expect(assessment.decision).toBeDefined();
    });

    it('should include risk assessment', async () => {
      const assessment = await engine.assessLoanRequest('user-2', {
        requestedAmount: '10000',
        requestedAsset: 'USDT',
        collateral: [{ asset: 'TON', amount: '5000' }],
      });

      expect(assessment.assessment.overallRisk).toBeDefined();
      expect(assessment.assessment.riskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.assessment.factors.length).toBeGreaterThan(0);
      expect(assessment.assessment.stressTestResults.length).toBeGreaterThan(0);
    });

    it('should include AI analysis', async () => {
      const assessment = await engine.assessLoanRequest('user-3', {
        requestedAmount: '3000',
        requestedAsset: 'USDT',
        collateral: [{ asset: 'ETH', amount: '3' }],
      });

      expect(assessment.aiAnalysis).toBeDefined();
      expect(assessment.aiAnalysis?.recommendation).toBeDefined();
      expect(assessment.aiAnalysis?.confidence).toBeGreaterThan(0);
      expect(assessment.aiAnalysis?.riskFactors.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeRisk', () => {
    it('should analyze risk factors', async () => {
      const risk = await engine.analyzeRisk({
        requestedAmount: '5000',
        requestedAsset: 'USDT',
        collateral: [{ asset: 'ETH', amount: '5' }],
      });

      expect(risk.overallRisk).toBeDefined();
      expect(risk.factors.length).toBeGreaterThan(0);
      expect(risk.volatilityForecast).toBeDefined();
      expect(risk.liquidationProbability).toBeDefined();
    });
  });

  describe('runStressTests', () => {
    it('should run stress test scenarios', async () => {
      const results = await engine.runStressTests(
        [{ symbol: 'ETH', name: 'Ethereum', amount: '10', valueUSD: '35000', weight: 1, volatility: 0.05, lockedAt: new Date() }],
        '10000'
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].scenario).toBeDefined();
      expect(results[0].priceMovement).toBeDefined();
      expect(results[0].resultingLTV).toBeDefined();
      expect(results[0].liquidationTriggered).toBeDefined();
    });
  });

  describe('forecastVolatility', () => {
    it('should forecast volatility', async () => {
      const forecast = await engine.forecastVolatility(['ETH', 'TON']);

      expect(forecast.expectedVolatility).toBeGreaterThan(0);
      expect(forecast.volatilityRegime).toBeDefined();
      expect(forecast.confidenceInterval.low).toBeLessThan(forecast.confidenceInterval.high);
    });
  });

  describe('calculateTerms', () => {
    it('should calculate loan terms based on risk', async () => {
      const terms = await engine.calculateTerms('moderate', '10000');

      expect(terms.maxLTV).toBeGreaterThan(0);
      expect(terms.maxLTV).toBeLessThanOrEqual(1);
      expect(terms.interestRate).toBeGreaterThan(0);
      expect(terms.collateralRequirements.length).toBeGreaterThan(0);
      expect(terms.covenants.length).toBeGreaterThan(0);
    });

    it('should provide stricter terms for higher risk', async () => {
      const lowRiskTerms = await engine.calculateTerms('low', '10000');
      const highRiskTerms = await engine.calculateTerms('high', '10000');

      expect(highRiskTerms.maxLTV).toBeLessThan(lowRiskTerms.maxLTV);
      expect(highRiskTerms.interestRate).toBeGreaterThan(lowRiskTerms.interestRate);
    });
  });
});

// ============================================================================
// Strategy Engine Tests
// ============================================================================

describe('StrategyEngine', () => {
  let engine: DefaultStrategyEngine;

  beforeEach(() => {
    engine = createStrategyEngine({
      maxLeverage: 3,
      targetAPY: 0.15,
      riskTolerance: 'medium',
    });
  });

  describe('createStrategy', () => {
    it('should create a strategy', async () => {
      const strategy = await engine.createStrategy('user-1', {
        name: 'Test Strategy',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.10,
          maxLeverage: 1,
          collateralAssets: ['USDT', 'USDC'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.05,
          stopLossThreshold: 0.10,
        },
      });

      expect(strategy.id).toBeDefined();
      expect(strategy.userId).toBe('user-1');
      expect(strategy.name).toBe('Test Strategy');
      expect(strategy.type).toBe('stablecoin_yield');
      expect(strategy.status).toBe('draft');
    });

    it('should respect max leverage config', async () => {
      const strategy = await engine.createStrategy('user-2', {
        name: 'Leveraged Strategy',
        type: 'leveraged_yield_farming',
        config: {
          targetAPY: 0.25,
          maxLeverage: 5, // Exceeds max
          collateralAssets: ['ETH'],
          borrowAssets: ['USDT'],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.03,
          stopLossThreshold: 0.15,
        },
      });

      expect(strategy.config.maxLeverage).toBe(3); // Should be capped at config max
    });
  });

  describe('lifecycle', () => {
    it('should start a strategy', async () => {
      const strategy = await engine.createStrategy('user-3', {
        name: 'Active Strategy',
        type: 'delta_neutral',
        config: {
          targetAPY: 0.15,
          maxLeverage: 2,
          collateralAssets: ['TON'],
          borrowAssets: ['USDT'],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.05,
          stopLossThreshold: 0.10,
        },
        initialDeposit: '1000',
      });

      const started = await engine.startStrategy(strategy.id);

      expect(started.status).toBe('active');
      expect(started.positions.length).toBeGreaterThan(0);
    });

    it('should pause a strategy', async () => {
      const strategy = await engine.createStrategy('user-4', {
        name: 'Pause Test',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.08,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.02,
          stopLossThreshold: 0.05,
        },
      });

      await engine.startStrategy(strategy.id);
      const paused = await engine.pauseStrategy(strategy.id);

      expect(paused.status).toBe('paused');
    });

    it('should stop a strategy', async () => {
      const strategy = await engine.createStrategy('user-5', {
        name: 'Stop Test',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.08,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.02,
          stopLossThreshold: 0.05,
        },
      });

      await engine.startStrategy(strategy.id);
      const stopped = await engine.stopStrategy(strategy.id);

      expect(stopped.status).toBe('stopped');
    });
  });

  describe('positions', () => {
    it('should open a position', async () => {
      const strategy = await engine.createStrategy('user-6', {
        name: 'Position Test',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.08,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.02,
          stopLossThreshold: 0.05,
        },
      });

      const position = await engine.openPosition(strategy.id, {
        type: 'yield',
        protocol: 'EVAA',
        asset: 'USDT',
        amount: '1000',
      });

      expect(position.id).toBeDefined();
      expect(position.type).toBe('yield');
      expect(position.asset).toBe('USDT');
    });

    it('should close a position', async () => {
      const strategy = await engine.createStrategy('user-7', {
        name: 'Close Test',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.08,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.02,
          stopLossThreshold: 0.05,
        },
      });

      const position = await engine.openPosition(strategy.id, {
        type: 'yield',
        protocol: 'EVAA',
        asset: 'USDT',
        amount: '500',
      });

      await engine.closePosition(strategy.id, position.id);
      const positions = await engine.getPositions(strategy.id);

      expect(positions.find((p) => p.id === position.id)).toBeUndefined();
    });
  });

  describe('rebalancing', () => {
    it('should check if rebalance is needed', async () => {
      const strategy = await engine.createStrategy('user-8', {
        name: 'Rebalance Test',
        type: 'stablecoin_yield',
        config: {
          targetAPY: 0.08,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: ['EVAA'],
          rebalanceThreshold: 0.05,
          stopLossThreshold: 0.05,
        },
        initialDeposit: '1000',
      });

      await engine.startStrategy(strategy.id);
      const analysis = await engine.checkRebalanceNeeded(strategy.id);

      expect(analysis.needed).toBeDefined();
      expect(analysis.drift).toBeDefined();
      expect(analysis.currentAllocation).toBeDefined();
    });
  });

  describe('recommendations', () => {
    it('should provide strategy recommendations', async () => {
      const recommendations = await engine.getRecommendations('user-1');

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBeDefined();
      expect(recommendations[0].estimatedAPY).toBeGreaterThan(0);
      expect(recommendations[0].riskLevel).toBeDefined();
    });

    it('should suggest strategy based on risk tolerance', async () => {
      const lowRisk = await engine.suggestStrategy('user-1', 'low');
      const highRisk = await engine.suggestStrategy('user-1', 'high');

      expect(lowRisk.config.maxLeverage).toBeLessThanOrEqual(highRisk.config.maxLeverage);
      expect(lowRisk.estimatedReturns.annualAPY).toBeLessThanOrEqual(highRisk.estimatedReturns.annualAPY);
    });
  });

  describe('getStats', () => {
    it('should return strategy statistics', async () => {
      const stats = await engine.getStats();

      expect(stats.totalStrategies).toBeDefined();
      expect(stats.activeStrategies).toBeDefined();
      expect(stats.totalTVL).toBeDefined();
      expect(stats.averageAPY).toBeDefined();
    });
  });
});

// ============================================================================
// AI Credit Manager Integration Tests
// ============================================================================

describe('AICreditManager', () => {
  let manager: DefaultAICreditManager;

  beforeEach(() => {
    manager = createAICreditManager({
      lending: { enabled: true, maxLTV: 0.75 },
      creditScoring: { enabled: true, scoringModel: 'ai_powered' },
      collateralManagement: { autoMonitoring: false },
      underwriting: { riskModel: 'moderate' },
    });
  });

  describe('initialization', () => {
    it('should create manager with all components', () => {
      expect(manager.enabled).toBe(true);
      expect(manager.coinrabbit).toBeDefined();
      expect(manager.lending).toBeDefined();
      expect(manager.creditScorer).toBeDefined();
      expect(manager.collateral).toBeDefined();
      expect(manager.underwriting).toBeDefined();
      expect(manager.strategies).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await manager.getHealth();

      expect(health.overall).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.components.lending).toBe(true);
      expect(health.components.creditScorer).toBe(true);
      expect(health.lastCheck).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      const stats = await manager.getStats();

      expect(stats.totalLoans).toBeDefined();
      expect(stats.activeLoans).toBeDefined();
      expect(stats.totalPositions).toBeDefined();
      expect(stats.activeStrategies).toBeDefined();
      expect(stats.totalAssessments).toBeDefined();
    });
  });

  describe('event forwarding', () => {
    it('should forward events from components', async () => {
      const events: any[] = [];
      manager.onEvent((event) => events.push(event));

      // Trigger an event by creating a loan
      await manager.lending.createLoan({
        collateralAssets: [{ symbol: 'TON', amount: '1000' }],
        borrowAsset: 'USDT',
        borrowAmount: '500',
      });

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('integrated workflow', () => {
    it('should support full lending workflow', async () => {
      // 1. Calculate credit score
      const score = await manager.creditScorer.calculateScore('user-1');
      expect(score.score).toBeGreaterThan(0);

      // 2. Get loan quote
      const quote = await manager.lending.getQuote({
        collateralAsset: 'TON',
        collateralAmount: '1000',
        borrowAsset: 'USDT',
      });
      expect(parseFloat(quote.loan.amount)).toBeGreaterThan(0);

      // 3. Get underwriting assessment
      const assessment = await manager.underwriting.assessLoanRequest('user-1', {
        requestedAmount: '500',
        requestedAsset: 'USDT',
        collateral: [{ asset: 'TON', amount: '1000' }],
      });
      expect(assessment.decision).toBeDefined();

      // 4. Create loan (if approved)
      if (assessment.decision.approved) {
        const loan = await manager.lending.createLoan({
          collateralAssets: [{ symbol: 'TON', amount: '1000' }],
          borrowAsset: 'USDT',
          borrowAmount: assessment.decision.approvedAmount ?? '500',
        });
        expect(loan.id).toBeDefined();

        // 5. Check loan health
        const health = await manager.lending.checkLoanHealth(loan.id);
        expect(health.health).toBeDefined();
      }
    });

    it('should support strategy creation workflow', async () => {
      // 1. Get strategy recommendation
      const suggestions = await manager.strategies.getRecommendations('user-1');
      expect(suggestions.length).toBeGreaterThan(0);

      // 2. Create strategy
      const strategy = await manager.strategies.createStrategy('user-1', {
        name: 'Test Strategy',
        type: suggestions[0].type,
        config: {
          targetAPY: suggestions[0].estimatedAPY,
          maxLeverage: 1,
          collateralAssets: ['USDT'],
          borrowAssets: [],
          protocols: suggestions[0].protocols,
          rebalanceThreshold: 0.05,
          stopLossThreshold: 0.10,
        },
        initialDeposit: '1000',
      });
      expect(strategy.id).toBeDefined();

      // 3. Start strategy
      const started = await manager.strategies.startStrategy(strategy.id);
      expect(started.status).toBe('active');

      // 4. Calculate performance
      const performance = await manager.strategies.calculatePerformance(strategy.id);
      expect(performance.apy).toBeDefined();

      // 5. Analyze risk
      const risk = await manager.strategies.analyzeRisk(strategy.id);
      expect(risk.currentLeverage).toBeDefined();
    });
  });
});
