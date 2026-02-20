/**
 * TONAIAgent - Data Platform Tests
 *
 * Comprehensive tests for the Global Data and Signal Platform.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createDataPlatformManager,
  createDataSourceManager,
  createDataPipelineManager,
  createOnChainDataService,
  createCrossChainDataService,
  createMarketDataService,
  createSignalEngineService,
  createStrategyIntelligenceService,
  createSignalMarketplaceService,
  createContinuousLearningService,
  createSecurityGovernanceService,
  DefaultDataPlatformManager,
  DefaultDataSourceManager,
  DefaultDataPipelineManager,
  DefaultOnChainDataService,
  DefaultCrossChainDataService,
  DefaultMarketDataService,
  DefaultSignalEngineService,
  DefaultStrategyIntelligenceService,
  DefaultSignalMarketplaceService,
  DefaultContinuousLearningService,
  DefaultSecurityGovernanceService,
} from '../../src/data-platform';

// ============================================================================
// Data Platform Manager Tests
// ============================================================================

describe('DataPlatformManager', () => {
  let platform: DefaultDataPlatformManager;

  beforeEach(() => {
    platform = createDataPlatformManager({
      signalEngine: { enabled: true, aiInferenceProvider: 'groq' },
    });
  });

  it('should create a platform manager', () => {
    expect(platform).toBeDefined();
    expect(platform.enabled).toBe(true);
  });

  it('should have all services initialized', () => {
    expect(platform.dataSources).toBeDefined();
    expect(platform.pipelines).toBeDefined();
    expect(platform.onChainData).toBeDefined();
    expect(platform.crossChainData).toBeDefined();
    expect(platform.marketData).toBeDefined();
    expect(platform.signals).toBeDefined();
    expect(platform.intelligence).toBeDefined();
    expect(platform.marketplace).toBeDefined();
    expect(platform.learning).toBeDefined();
    expect(platform.security).toBeDefined();
  });

  it('should return health status', async () => {
    const health = await platform.getHealth();

    expect(health.overall).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
    expect(health.components).toBeDefined();
    expect(health.lastCheck).toBeInstanceOf(Date);
  });

  it('should return platform stats', async () => {
    const stats = await platform.getStats();

    expect(stats.activePipelines).toBeDefined();
    expect(stats.dataSources).toBeDefined();
    expect(stats.signalsGenerated).toBeDefined();
    expect(stats.timestamp).toBeInstanceOf(Date);
  });

  it('should support event callbacks', () => {
    const events: unknown[] = [];
    platform.onEvent((event) => events.push(event));

    expect(events).toBeDefined();
  });
});

// ============================================================================
// Data Source Manager Tests
// ============================================================================

describe('DataSourceManager', () => {
  let manager: DefaultDataSourceManager;

  beforeEach(() => {
    manager = createDataSourceManager();
  });

  it('should register a data source', async () => {
    const source = await manager.registerSource({
      id: 'test-source',
      type: 'market',
      provider: 'test-provider',
      endpoint: 'https://api.test.com',
      refreshInterval: 1000,
      batchSize: 100,
      retryPolicy: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      },
    });

    expect(source.id).toBe('test-source');
    expect(source.type).toBe('market');
    expect(source.provider).toBe('test-provider');
  });

  it('should list data sources', async () => {
    await manager.registerSource({
      id: 'source-1',
      type: 'on_chain',
      provider: 'provider-1',
      refreshInterval: 1000,
      batchSize: 100,
      retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
    });

    const sources = manager.listSources();
    expect(sources.length).toBeGreaterThan(0);
  });

  it('should check health of a source', async () => {
    await manager.registerSource({
      id: 'health-test',
      type: 'market',
      provider: 'provider',
      refreshInterval: 1000,
      batchSize: 100,
      retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
    });

    const health = await manager.checkHealth('health-test');
    expect(health.sourceId).toBe('health-test');
    expect(typeof health.healthy).toBe('boolean');
    expect(typeof health.latencyMs).toBe('number');
  });

  it('should remove a data source', async () => {
    await manager.registerSource({
      id: 'to-remove',
      type: 'market',
      provider: 'provider',
      refreshInterval: 1000,
      batchSize: 100,
      retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
    });

    const removed = await manager.removeSource('to-remove');
    expect(removed).toBe(true);

    const source = manager.getSource('to-remove');
    expect(source).toBeUndefined();
  });
});

// ============================================================================
// Data Pipeline Manager Tests
// ============================================================================

describe('DataPipelineManager', () => {
  let pipelineManager: DefaultDataPipelineManager;

  beforeEach(() => {
    const sourceManager = createDataSourceManager();
    pipelineManager = createDataPipelineManager(sourceManager);
  });

  it('should create a pipeline', async () => {
    const pipeline = await pipelineManager.createPipeline({
      name: 'test-pipeline',
      mode: 'streaming',
      sources: [
        {
          id: 'source-1',
          type: 'market',
          provider: 'test',
          refreshInterval: 1000,
          batchSize: 100,
          retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
        },
      ],
      processors: [],
      sinks: [
        {
          type: 'cache',
          batchSize: 100,
          flushInterval: 1000,
          retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
        },
      ],
      parallelism: 4,
      checkpointInterval: 60000,
      errorHandling: { onError: 'skip', maxRetries: 3, alertThreshold: 10 },
    });

    expect(pipeline.id).toBeDefined();
    expect(pipeline.name).toBe('test-pipeline');
    expect(pipeline.mode).toBe('streaming');
    expect(pipeline.status).toBe('stopped');
  });

  it('should start and stop a pipeline', async () => {
    const pipeline = await pipelineManager.createPipeline({
      name: 'start-stop-test',
      mode: 'streaming',
      sources: [],
      processors: [],
      sinks: [{ type: 'cache', batchSize: 100, flushInterval: 1000, retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 } }],
      parallelism: 1,
      checkpointInterval: 60000,
      errorHandling: { onError: 'skip', maxRetries: 3, alertThreshold: 10 },
    });

    await pipelineManager.startPipeline(pipeline.id);
    let updated = pipelineManager.getPipeline(pipeline.id);
    expect(updated?.status).toBe('running');

    await pipelineManager.stopPipeline(pipeline.id);
    updated = pipelineManager.getPipeline(pipeline.id);
    expect(updated?.status).toBe('stopped');
  });

  it('should return pipeline metrics', async () => {
    const pipeline = await pipelineManager.createPipeline({
      name: 'metrics-test',
      mode: 'batch',
      sources: [],
      processors: [],
      sinks: [{ type: 'database', batchSize: 100, flushInterval: 1000, retryPolicy: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 } }],
      parallelism: 1,
      checkpointInterval: 60000,
      errorHandling: { onError: 'skip', maxRetries: 3, alertThreshold: 10 },
    });

    const metrics = pipelineManager.getMetrics(pipeline.id);
    expect(metrics).toBeDefined();
    expect(typeof metrics?.recordsProcessed).toBe('number');
  });
});

// ============================================================================
// On-Chain Data Service Tests
// ============================================================================

describe('OnChainDataService', () => {
  let service: DefaultOnChainDataService;

  beforeEach(() => {
    service = createOnChainDataService();
  });

  it('should get network stats', async () => {
    const stats = await service.getNetworkStats();

    expect(stats.totalTransactions).toBeGreaterThan(0);
    expect(stats.activeWallets24h).toBeGreaterThan(0);
    expect(stats.tps).toBeGreaterThan(0);
  });

  it('should get wallet information', async () => {
    const wallet = await service.getWallet('EQTest1234567890');

    expect(wallet).toBeDefined();
    expect(wallet?.address).toBeDefined();
    expect(wallet?.balance).toBeDefined();
  });

  it('should get DeFi protocols', async () => {
    const protocols = await service.getDeFiProtocols();

    expect(protocols.length).toBeGreaterThan(0);
    expect(protocols[0].name).toBeDefined();
    expect(protocols[0].tvl).toBeDefined();
  });

  it('should get liquidity pools', async () => {
    const pools = await service.getLiquidityPools();

    expect(pools.length).toBeGreaterThan(0);
    expect(pools[0].tokenA).toBeDefined();
    expect(pools[0].tokenB).toBeDefined();
    expect(pools[0].tvl).toBeDefined();
  });

  it('should get top jettons', async () => {
    const jettons = await service.getTopJettons(10);

    expect(jettons.length).toBeGreaterThan(0);
    expect(jettons[0].symbol).toBeDefined();
  });

  it('should get whale movements', async () => {
    const movements = await service.getWhaleMovements('100000');

    expect(movements.length).toBeGreaterThan(0);
    expect(movements[0].value).toBeDefined();
    expect(movements[0].type).toBeDefined();
  });
});

// ============================================================================
// Cross-Chain Data Service Tests
// ============================================================================

describe('CrossChainDataService', () => {
  let service: DefaultCrossChainDataService;

  beforeEach(() => {
    service = createCrossChainDataService();
  });

  it('should list supported chains', () => {
    const chains = service.listChains();

    expect(chains.length).toBeGreaterThan(0);
    expect(chains.some((c) => c.id === 'ton-mainnet')).toBe(true);
    expect(chains.some((c) => c.id === 'ethereum')).toBe(true);
  });

  it('should get chain status', async () => {
    const status = await service.getChainStatus('ton-mainnet');

    expect(status.chainId).toBe('ton-mainnet');
    expect(typeof status.healthy).toBe('boolean');
    expect(status.blockHeight).toBeGreaterThan(0);
  });

  it('should list bridges', () => {
    const bridges = service.listBridges();

    expect(bridges.length).toBeGreaterThan(0);
    expect(bridges[0].sourceChain).toBeDefined();
    expect(bridges[0].targetChain).toBeDefined();
  });

  it('should find arbitrage opportunities', async () => {
    const opportunities = await service.getArbitrageOpportunities();

    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should compare TVL across chains', async () => {
    const comparison = await service.compareTVL();

    expect(comparison.length).toBeGreaterThan(0);
    expect(comparison[0].chainId).toBeDefined();
    expect(comparison[0].tvl).toBeDefined();
  });

  it('should get cross-chain flow', async () => {
    const flow = await service.getCrossChainFlow('ton-mainnet', 'ethereum', '24h');

    expect(flow.sourceChain).toBe('ton-mainnet');
    expect(flow.targetChain).toBe('ethereum');
    expect(flow.totalVolume).toBeDefined();
  });
});

// ============================================================================
// Market Data Service Tests
// ============================================================================

describe('MarketDataService', () => {
  let service: DefaultMarketDataService;

  beforeEach(() => {
    service = createMarketDataService();
  });

  it('should get price for a pair', async () => {
    const price = await service.getPrice('TON/USDT');

    expect(price).toBeDefined();
    expect(price?.pair).toBe('TON/USDT');
    expect(price?.price).toBeGreaterThan(0);
  });

  it('should get order book', async () => {
    const orderBook = await service.getOrderBook('ETH/USDT', 10);

    expect(orderBook.pair).toBe('ETH/USDT');
    expect(orderBook.bids.length).toBe(10);
    expect(orderBook.asks.length).toBe(10);
    expect(orderBook.spread).toBeGreaterThan(0);
  });

  it('should get recent trades', async () => {
    const trades = await service.getRecentTrades('BTC/USDT', 50);

    expect(trades.length).toBe(50);
    expect(trades[0].pair).toBe('BTC/USDT');
    expect(trades[0].price).toBeGreaterThan(0);
  });

  it('should get volatility metrics', async () => {
    const volatility = await service.getVolatility('TON/USDT', '24h');

    expect(volatility.pair).toBe('TON/USDT');
    expect(volatility.period).toBe('24h');
    expect(typeof volatility.volatility).toBe('number');
    expect(['low', 'normal', 'high', 'extreme']).toContain(volatility.regime);
  });

  it('should get liquidity metrics', async () => {
    const liquidity = await service.getLiquidity('TON/USDT');

    expect(liquidity.pair).toBe('TON/USDT');
    expect(typeof liquidity.spreadBps).toBe('number');
    expect(liquidity.score).toBeGreaterThanOrEqual(0);
    expect(liquidity.score).toBeLessThanOrEqual(100);
  });

  it('should get market summary', async () => {
    const summary = await service.getMarketSummary();

    expect(summary.totalMarketCap).toBeGreaterThan(0);
    expect(summary.totalVolume24h).toBeGreaterThan(0);
    expect(['bullish', 'bearish', 'neutral']).toContain(summary.marketTrend);
  });

  it('should subscribe to price updates', () => {
    const subscription = service.subscribeToPrice('TON/USDT', (price) => {
      expect(price.pair).toBe('TON/USDT');
    });

    expect(subscription.id).toBeDefined();
    expect(typeof subscription.unsubscribe).toBe('function');

    subscription.unsubscribe();
  });
});

// ============================================================================
// Signal Engine Tests
// ============================================================================

describe('SignalEngineService', () => {
  let service: DefaultSignalEngineService;

  beforeEach(() => {
    service = createSignalEngineService({
      enabled: true,
      aiInferenceProvider: 'groq',
    });
  });

  it('should generate signals', async () => {
    const signals = await service.generateSignals('TON', ['price', 'momentum']);

    expect(signals.length).toBe(2);
    expect(signals[0].asset).toBe('TON');
    expect(['bullish', 'bearish', 'neutral']).toContain(signals[0].direction);
  });

  it('should detect anomalies', async () => {
    const anomalies = await service.detectAnomalies('TON');

    expect(Array.isArray(anomalies)).toBe(true);
    anomalies.forEach((a) => {
      expect(a.type).toBe('anomaly');
      expect(a.anomalyType).toBeDefined();
    });
  });

  it('should find arbitrage opportunities', async () => {
    const opportunities = await service.findArbitrageOpportunities();

    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should assess risk', async () => {
    const risks = await service.assessRisk('TON');

    expect(Array.isArray(risks)).toBe(true);
    risks.forEach((r) => {
      expect(r.type).toBe('risk');
      expect(r.severity).toBeDefined();
    });
  });

  it('should predict signals', async () => {
    const prediction = await service.predictSignal('TON', '24h');

    expect(prediction.asset).toBe('TON');
    expect(prediction.horizon).toBe('24h');
    expect(['bullish', 'bearish', 'neutral']).toContain(prediction.direction);
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.features.length).toBeGreaterThan(0);
  });

  it('should backtest a signal', async () => {
    const signal = await service.createSignal({
      type: 'price',
      asset: 'TON',
      parameters: { lookbackPeriod: 24, aggregationMethod: 'mean' },
      thresholds: { weak: 20, moderate: 40, strong: 60, veryStrong: 80 },
      notifications: { enabled: false, channels: [], minStrength: 'moderate', cooldownMinutes: 60 },
    });

    const result = await service.backtestSignal(signal.id, {
      startDate: new Date(Date.now() - 30 * 86400000),
      endDate: new Date(),
      initialCapital: 10000,
      positionSize: 0.1,
      stopLoss: 0.05,
      takeProfit: 0.1,
      includeFees: true,
      feePercent: 0.001,
    });

    expect(result.signalId).toBe(signal.id);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(typeof result.winRate).toBe('number');
    expect(typeof result.sharpeRatio).toBe('number');
  });

  it('should explain a signal', async () => {
    const signals = await service.generateSignals('TON', ['price']);
    const explanation = await service.explainSignal(signals[0].id);

    expect(explanation.signalId).toBe(signals[0].id);
    expect(explanation.summary).toBeDefined();
    expect(explanation.factors.length).toBeGreaterThan(0);
    expect(explanation.recommendations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Strategy Intelligence Tests
// ============================================================================

describe('StrategyIntelligenceService', () => {
  let service: DefaultStrategyIntelligenceService;

  beforeEach(() => {
    service = createStrategyIntelligenceService();
  });

  it('should generate recommendations', async () => {
    const recommendation = await service.generateRecommendation({
      portfolioId: 'portfolio-1',
      asset: 'TON',
    });

    expect(recommendation.id).toBeDefined();
    expect(recommendation.asset).toBe('TON');
    expect(['buy', 'sell', 'hold', 'rebalance']).toContain(recommendation.action);
  });

  it('should suggest capital allocation', async () => {
    const suggestions = await service.suggestAllocation({
      totalCapital: 100000,
      riskTolerance: 'moderate',
      assets: ['TON', 'ETH', 'BTC', 'USDT'],
    });

    expect(suggestions.length).toBeGreaterThan(0);
    const totalAllocation = suggestions.reduce((sum, s) => sum + s.suggestedAllocation, 0);
    expect(totalAllocation).toBeCloseTo(1, 2);
  });

  it('should optimize portfolio', async () => {
    const result = await service.optimizePortfolio('portfolio-1');

    expect(result.portfolioId).toBe('portfolio-1');
    expect(result.currentAllocation).toBeDefined();
    expect(result.optimizedAllocation).toBeDefined();
    expect(typeof result.sharpeRatio).toBe('number');
  });

  it('should assess portfolio risk', async () => {
    const assessment = await service.assessPortfolioRisk('portfolio-1');

    expect(assessment.portfolioId).toBe('portfolio-1');
    expect(typeof assessment.overallRisk).toBe('number');
    expect(assessment.riskBreakdown).toBeDefined();
  });

  it('should analyze strategy', async () => {
    const analysis = await service.analyzeStrategy('strategy-1');

    expect(analysis.strategyId).toBe('strategy-1');
    expect(analysis.performance).toBeDefined();
    expect(analysis.riskMetrics).toBeDefined();
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(typeof analysis.overallScore).toBe('number');
  });

  it('should suggest improvements', async () => {
    const improvements = await service.suggestImprovements('strategy-1');

    expect(improvements.length).toBeGreaterThan(0);
    expect(improvements[0].area).toBeDefined();
    expect(improvements[0].suggestion).toBeDefined();
    expect(['low', 'medium', 'high']).toContain(improvements[0].priority);
  });
});

// ============================================================================
// Signal Marketplace Tests
// ============================================================================

describe('SignalMarketplaceService', () => {
  let service: DefaultSignalMarketplaceService;

  beforeEach(() => {
    service = createSignalMarketplaceService();
  });

  it('should register a provider', async () => {
    const provider = await service.registerProvider({
      name: 'Test Provider',
      description: 'Test signal provider',
      creator: 'creator-1',
      pricing: { model: 'subscription', monthlyPrice: '100' },
      categories: ['price', 'momentum'],
    });

    expect(provider.id).toBeDefined();
    expect(provider.name).toBe('Test Provider');
    expect(provider.status).toBe('active');
  });

  it('should list providers', () => {
    const providers = service.listProviders();

    expect(providers.length).toBeGreaterThan(0);
  });

  it('should subscribe to a provider', async () => {
    const providers = service.listProviders();
    const subscription = await service.subscribe({
      providerId: providers[0].id,
      subscriberId: 'user-1',
    });

    expect(subscription.id).toBeDefined();
    expect(subscription.providerId).toBe(providers[0].id);
    expect(subscription.status).toBe('active');
  });

  it('should get marketplace stats', async () => {
    const stats = await service.getMarketplaceStats();

    expect(stats.totalProviders).toBeGreaterThan(0);
    expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(0);
    expect(typeof stats.averageProviderRating).toBe('number');
  });

  it('should search providers', () => {
    const results = service.searchProviders('Alpha');

    expect(results.some((p) => p.name.includes('Alpha'))).toBe(true);
  });
});

// ============================================================================
// Continuous Learning Tests
// ============================================================================

describe('ContinuousLearningService', () => {
  let service: DefaultContinuousLearningService;

  beforeEach(() => {
    service = createContinuousLearningService();
  });

  it('should list models', () => {
    const models = service.listModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models[0].modelId).toBeDefined();
    expect(models[0].type).toBeDefined();
  });

  it('should register a new model', async () => {
    const model = await service.registerModel({
      name: 'Test Model',
      type: 'signal_generator',
      version: '1.0.0',
    });

    expect(model.modelId).toBeDefined();
    expect(model.name).toBe('Test Model');
    expect(model.type).toBe('signal_generator');
  });

  it('should schedule training', async () => {
    const models = service.listModels();
    const run = await service.scheduleTraining(models[0].modelId);

    expect(run.id).toBeDefined();
    expect(run.modelId).toBe(models[0].modelId);
    expect(['pending', 'running', 'completed', 'failed']).toContain(run.status);
  });

  it('should record feedback', async () => {
    const feedback = await service.recordFeedback({
      signalId: 'signal-1',
      type: 'outcome',
      outcome: 'correct',
      profit: 100,
    });

    expect(feedback.id).toBeDefined();
    expect(feedback.signalId).toBe('signal-1');
    expect(feedback.outcome).toBe('correct');
  });

  it('should evaluate a model', async () => {
    const models = service.listModels();
    const evaluation = await service.evaluateModel(models[0].modelId);

    expect(evaluation.modelId).toBe(models[0].modelId);
    expect(evaluation.currentMetrics).toBeDefined();
    expect(typeof evaluation.overallScore).toBe('number');
    expect(evaluation.recommendations.length).toBeGreaterThan(0);
  });

  it('should suggest retraining', async () => {
    const models = service.listModels();
    const suggestion = await service.suggestRetraining(models[0].modelId);

    expect(suggestion.modelId).toBe(models[0].modelId);
    expect(typeof suggestion.shouldRetrain).toBe('boolean');
    expect(suggestion.reason).toBeDefined();
    expect(['low', 'medium', 'high', 'critical']).toContain(suggestion.priority);
  });
});

// ============================================================================
// Security and Governance Tests
// ============================================================================

describe('SecurityGovernanceService', () => {
  let service: DefaultSecurityGovernanceService;

  beforeEach(() => {
    service = createSecurityGovernanceService();
  });

  it('should validate data', () => {
    const result = service.validateData({ name: 'test', value: 100 });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate data with schema', () => {
    const result = service.validateData(
      { name: 'test', value: 100 },
      {
        name: 'TestSchema',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'value', type: 'number', required: true, min: 0 },
        ],
      }
    );

    expect(result.valid).toBe(true);
  });

  it('should detect validation errors', () => {
    const result = service.validateData(
      { name: 'test' },
      {
        name: 'TestSchema',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'value', type: 'number', required: true },
        ],
      }
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate price data', () => {
    const result = service.validatePrice({
      asset: 'TON',
      price: 5.5,
      timestamp: new Date(),
      source: 'exchange',
    });

    expect(result.valid).toBe(true);
  });

  it('should detect price anomalies', () => {
    const historical = [
      { asset: 'TON', price: 5.0, timestamp: new Date(), source: 'exchange' },
      { asset: 'TON', price: 5.1, timestamp: new Date(), source: 'exchange' },
      { asset: 'TON', price: 5.2, timestamp: new Date(), source: 'exchange' },
    ];

    const result = service.validatePrice(
      { asset: 'TON', price: 50, timestamp: new Date(), source: 'exchange' },
      historical
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'ANOMALOUS_PRICE')).toBe(true);
  });

  it('should detect manipulation', async () => {
    const alerts = await service.detectManipulation({
      asset: 'TON',
      dataType: 'price',
      sensitivity: 'high',
    });

    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should check access control', () => {
    const result = service.checkAccess({
      principal: 'admin',
      resource: 'signals',
      action: 'admin',
    });

    expect(result.allowed).toBe(true);
  });

  it('should log audit entries', () => {
    const entry = service.logAction({
      action: 'read',
      resource: 'signals',
      principal: 'user-1',
      outcome: 'success',
      details: { signalId: 'sig-1' },
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('should query audit logs', () => {
    service.logAction({
      action: 'read',
      resource: 'signals',
      principal: 'user-1',
      outcome: 'success',
      details: {},
    });

    const logs = service.getAuditLogs({ principal: 'user-1' });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should export audit logs', () => {
    service.logAction({
      action: 'test',
      resource: 'test',
      principal: 'test',
      outcome: 'success',
      details: {},
    });

    const json = service.exportAuditLogs({}, 'json');
    expect(json.length).toBeGreaterThan(0);

    const csv = service.exportAuditLogs({}, 'csv');
    expect(csv).toContain('id,timestamp,action');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  let platform: DefaultDataPlatformManager;

  beforeEach(() => {
    platform = createDataPlatformManager();
  });

  it('should generate signals from market data', async () => {
    const price = await platform.marketData.getPrice('TON/USDT');
    expect(price).toBeDefined();

    const signals = await platform.signals.generateSignals('TON', ['price']);
    expect(signals.length).toBeGreaterThan(0);
  });

  it('should feed signals to strategy intelligence', async () => {
    const signals = await platform.signals.generateSignals('TON', ['momentum']);
    const signalIds = signals.map((s) => s.id);

    const recommendation = await platform.intelligence.generateRecommendation({
      portfolioId: 'test-portfolio',
      asset: 'TON',
      signalIds,
    });

    expect(recommendation.signals).toEqual(signalIds);
  });

  it('should record feedback for continuous learning', async () => {
    const signals = await platform.signals.generateSignals('ETH', ['price']);

    const feedback = await platform.learning.recordFeedback({
      signalId: signals[0].id,
      type: 'outcome',
      outcome: 'correct',
      profit: 50,
    });

    expect(feedback.signalId).toBe(signals[0].id);
  });

  it('should validate signals through security service', async () => {
    const signals = await platform.signals.generateSignals('BTC', ['price']);

    const result = platform.security.validateData(signals[0], {
      name: 'SignalSchema',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'type', type: 'string', required: true },
        { name: 'asset', type: 'string', required: true },
        { name: 'direction', type: 'string', required: true },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it('should flow events through the platform', (done) => {
    const events: unknown[] = [];
    platform.onEvent((event) => {
      events.push(event);
      if (events.length >= 1) {
        expect(events[0]).toBeDefined();
        done();
      }
    });

    // Trigger an event
    platform.signals.generateSignals('TON', ['price']);
  });
});
