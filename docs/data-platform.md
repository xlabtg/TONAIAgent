# Global Data and Signal Platform

A scalable, real-time data and signal platform powering autonomous AI agents across the TON ecosystem.

## Overview

The Data Platform aggregates, processes, and analyzes global financial and on-chain data to generate actionable intelligence for AI-driven strategies operating on The Open Network. It serves as the foundation for:

- Strategy generation
- Portfolio optimization
- Risk management
- Anomaly detection
- Institutional analytics

## Features

### Data Infrastructure

- **Scalable Pipelines** - Stream and batch processing with configurable parallelism
- **Real-time Analytics** - Sub-second latency for market data
- **Historical Storage** - Efficient storage with time-series optimization
- **Modular Architecture** - Plug-and-play data sources and sinks

### On-Chain Data Layer

- **Transaction Indexing** - Full transaction history and real-time updates
- **Wallet Analytics** - Balance tracking, activity patterns
- **Jetton Tracking** - Token balances, transfers, holder analysis
- **NFT Analytics** - Collection metrics, floor prices, trading activity
- **DeFi Monitoring** - Protocol TVL, pool metrics, governance activity

### Cross-Chain Intelligence

- **Multi-Chain Support** - TON, Ethereum, Solana, L2 ecosystems
- **Bridge Monitoring** - Track cross-chain transfers and fees
- **Arbitrage Detection** - Find pricing inefficiencies across chains
- **TVL Comparison** - Compare ecosystem health and growth

### Market Data

- **Price Feeds** - Real-time pricing from multiple sources
- **Order Books** - Depth analysis and liquidity metrics
- **Volatility Metrics** - Historical and implied volatility
- **Derivatives Data** - Funding rates, open interest, liquidations

### Signal Generation Engine

- **Predictive Signals** - AI-powered price predictions
- **Anomaly Detection** - Unusual activity alerts
- **Arbitrage Finder** - Cross-exchange opportunities
- **Risk Alerts** - Portfolio risk monitoring

### Strategy Intelligence

- **Portfolio Recommendations** - AI-driven allocation suggestions
- **Risk Assessment** - Comprehensive portfolio risk analysis
- **Strategy Analysis** - Performance and risk metrics
- **Optimization** - Mean-variance and risk-parity optimization

### Signal Marketplace

- **Signal Publishing** - Share signals with subscribers
- **Monetization** - Subscription and performance-based pricing
- **Reputation System** - Track record and accuracy metrics
- **Discovery** - Search and filter signal providers

### Continuous Learning

- **Feedback Loops** - Learn from prediction outcomes
- **Model Retraining** - Automatic model improvement
- **Performance Tracking** - Monitor model accuracy over time

### Security & Governance

- **Data Validation** - Schema-based validation
- **Manipulation Detection** - Identify market manipulation
- **Access Control** - Role-based permissions
- **Audit Logging** - Complete activity trail

## Installation

```typescript
import { createDataPlatformManager } from '@tonaiagent/core/data-platform';
```

## Quick Start

```typescript
import { createDataPlatformManager } from '@tonaiagent/core/data-platform';

// Create the platform manager
const platform = createDataPlatformManager({
  signalEngine: {
    enabled: true,
    aiInferenceProvider: 'groq',
    anomalyDetectionEnabled: true,
    arbitrageDetectionEnabled: true,
    riskMonitoringEnabled: true,
  },
  marketData: {
    updateInterval: 1000,
    alertsEnabled: true,
  },
  onChainData: {
    realtimeEnabled: true,
    cacheConfig: {
      enabled: true,
      ttlSeconds: 60,
      maxSize: 10000,
      evictionPolicy: 'lru',
    },
  },
});

// Get real-time market data
const price = await platform.marketData.getPrice('TON/USDT');
console.log(`TON Price: $${price?.price}`);

// Generate trading signals
const signals = await platform.signals.generateSignals('TON', ['price', 'momentum', 'volume']);
console.log(`Generated ${signals.length} signals`);

// Detect anomalies
const anomalies = await platform.signals.detectAnomalies('TON');
if (anomalies.length > 0) {
  console.log('Anomalies detected:', anomalies.map(a => a.anomalyType));
}

// Get AI predictions
const prediction = await platform.signals.predictSignal('TON', '24h');
console.log(`Prediction: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);
```

## Core Services

### Market Data Service

```typescript
// Get prices
const tonPrice = await platform.marketData.getPrice('TON/USDT');
const prices = await platform.marketData.getPrices(['TON/USDT', 'ETH/USDT', 'BTC/USDT']);

// Order book
const orderBook = await platform.marketData.getOrderBook('TON/USDT', 20);
console.log(`Spread: ${orderBook.spreadBps} bps`);

// Subscribe to real-time updates
const subscription = platform.marketData.subscribeToPrice('TON/USDT', (price) => {
  console.log(`Price update: $${price.price}`);
});

// Volatility analysis
const volatility = await platform.marketData.getVolatility('TON/USDT', '24h');
console.log(`Volatility regime: ${volatility.regime}`);

// Liquidity metrics
const liquidity = await platform.marketData.getLiquidity('TON/USDT');
console.log(`Liquidity score: ${liquidity.score}`);

// Slippage estimation
const slippage = await platform.marketData.getSlippage('TON/USDT', 10000, 'buy');
console.log(`Estimated slippage: ${slippage.slippageBps} bps`);
```

### On-Chain Data Service

```typescript
// Network statistics
const stats = await platform.onChainData.getNetworkStats();
console.log(`TPS: ${stats.tps}, Active wallets: ${stats.activeWallets24h}`);

// Wallet information
const wallet = await platform.onChainData.getWallet('EQ...');
console.log(`Balance: ${wallet?.balance} nanoTON`);

// Jetton analytics
const jettons = await platform.onChainData.getTopJettons(10);
const holders = await platform.onChainData.getJettonHolders('EQ...', 100);

// DeFi protocols
const protocols = await platform.onChainData.getDeFiProtocols();
const pools = await platform.onChainData.getLiquidityPools('ston-fi');

// Whale tracking
const whales = await platform.onChainData.getWhaleMovements('1000000');
```

### Signal Engine

```typescript
// Generate signals
const signals = await platform.signals.generateSignals('TON', [
  'price',
  'volume',
  'momentum',
  'trend',
]);

// Configure and create custom signal
const signal = await platform.signals.createSignal({
  type: 'price',
  asset: 'TON',
  parameters: {
    lookbackPeriod: 24,
    aggregationMethod: 'mean',
  },
  thresholds: {
    weak: 20,
    moderate: 40,
    strong: 60,
    veryStrong: 80,
  },
  notifications: {
    enabled: true,
    channels: ['webhook', 'telegram'],
    minStrength: 'moderate',
    cooldownMinutes: 60,
  },
});

// Anomaly detection
const anomalies = await platform.signals.detectAnomalies('TON');

// Arbitrage detection
const opportunities = await platform.signals.findArbitrageOpportunities();

// Risk assessment
const risks = await platform.signals.assessRisk('TON');

// AI prediction
const prediction = await platform.signals.predictSignal('TON', '24h');

// Signal explanation
const explanation = await platform.signals.explainSignal(signal.id);
console.log(explanation.summary);

// Backtesting
const backtest = await platform.signals.backtestSignal(signal.id, {
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
  initialCapital: 10000,
  positionSize: 0.1,
  stopLoss: 0.05,
  takeProfit: 0.1,
  includeFees: true,
  feePercent: 0.001,
});
console.log(`Win rate: ${(backtest.winRate * 100).toFixed(1)}%`);
console.log(`Sharpe ratio: ${backtest.sharpeRatio.toFixed(2)}`);
```

### Strategy Intelligence

```typescript
// Generate recommendations
const recommendation = await platform.intelligence.generateRecommendation({
  portfolioId: 'my-portfolio',
  asset: 'TON',
  signalIds: signals.map(s => s.id),
});

// Capital allocation
const allocation = await platform.intelligence.suggestAllocation({
  totalCapital: 100000,
  riskTolerance: 'moderate',
  assets: ['TON', 'ETH', 'BTC', 'USDT'],
});

// Portfolio optimization
const optimized = await platform.intelligence.optimizePortfolio('my-portfolio');

// Risk assessment
const riskAssessment = await platform.intelligence.assessPortfolioRisk('my-portfolio');

// Strategy analysis
const analysis = await platform.intelligence.analyzeStrategy('strategy-id');

// Get improvement suggestions
const improvements = await platform.intelligence.suggestImprovements('strategy-id');
```

### Signal Marketplace

```typescript
// Register as a signal provider
const provider = await platform.marketplace.registerProvider({
  name: 'Alpha Signals',
  description: 'High-quality TON trading signals',
  creator: 'user-123',
  pricing: {
    model: 'subscription',
    monthlyPrice: '50',
    trialPeriodDays: 7,
  },
  categories: ['price', 'momentum', 'anomaly'],
});

// Publish signals
const publishedSignal = await platform.marketplace.publishSignal(provider.id, signal);

// Subscribe to a provider
const subscription = await platform.marketplace.subscribe({
  providerId: provider.id,
  subscriberId: 'user-456',
  duration: 3, // months
});

// Search providers
const providers = platform.marketplace.searchProviders('alpha');

// Get marketplace stats
const stats = await platform.marketplace.getMarketplaceStats();
```

### Continuous Learning

```typescript
// Record signal feedback
await platform.learning.recordFeedback({
  signalId: signal.id,
  type: 'outcome',
  outcome: 'correct',
  profit: 150,
});

// Evaluate model performance
const evaluation = await platform.learning.evaluateModel('model-id');

// Get retraining suggestions
const suggestion = await platform.learning.suggestRetraining('model-id');

// Schedule training
if (suggestion.shouldRetrain) {
  const trainingRun = await platform.learning.scheduleTraining('model-id', {
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
  });
}
```

### Security & Governance

```typescript
// Validate data
const validation = platform.security.validateData(data, schema);

// Price validation with anomaly detection
const priceValidation = platform.security.validatePrice(price, historicalPrices);

// Detect manipulation
const alerts = await platform.security.detectManipulation({
  asset: 'TON',
  dataType: 'price',
  sensitivity: 'high',
});

// Access control
const accessResult = platform.security.checkAccess({
  principal: 'user-123',
  resource: 'signals',
  action: 'read',
});

// Audit logging
platform.security.logAction({
  action: 'signal_generated',
  resource: 'signals',
  principal: 'system',
  outcome: 'success',
  details: { signalId: signal.id },
});

// Query audit logs
const logs = platform.security.getAuditLogs({
  startTime: new Date(Date.now() - 86400000),
  principal: 'user-123',
});
```

## Data Pipeline Configuration

```typescript
// Create a data pipeline
const pipeline = await platform.pipelines.createPipeline({
  name: 'ton-market-data',
  mode: 'streaming',
  sources: [
    {
      id: 'ton-prices',
      type: 'market',
      provider: 'aggregator',
      endpoint: 'wss://api.example.com/prices',
      refreshInterval: 1000,
      batchSize: 100,
      retryPolicy: {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      },
    },
  ],
  processors: [
    {
      id: 'normalize',
      name: 'Price Normalizer',
      type: 'transform',
      config: { outputFormat: 'standard' },
    },
    {
      id: 'dedupe',
      name: 'Deduplicator',
      type: 'deduplicate',
      config: { keyField: 'timestamp' },
    },
  ],
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
  errorHandling: {
    onError: 'retry',
    deadLetterQueue: 'failed-records',
    maxRetries: 3,
    alertThreshold: 10,
  },
});

// Start the pipeline
await platform.pipelines.startPipeline(pipeline.id);

// Get pipeline metrics
const metrics = platform.pipelines.getMetrics(pipeline.id);
console.log(`Records processed: ${metrics?.recordsProcessed}`);
console.log(`Throughput: ${metrics?.throughputPerSecond}/s`);
```

## Cross-Chain Data

```typescript
// List supported chains
const chains = platform.crossChainData.listChains();

// Get chain status
const tonStatus = await platform.crossChainData.getChainStatus('ton-mainnet');

// List bridges
const bridges = platform.crossChainData.listBridges('ton-mainnet', 'ethereum');

// Get bridge fees
const fees = await platform.crossChainData.getBridgeFees('ton-eth-bridge', '1000');

// Cross-chain flow analysis
const flow = await platform.crossChainData.getCrossChainFlow('ton-mainnet', 'ethereum', '24h');

// Arbitrage opportunities
const arb = await platform.crossChainData.getArbitrageOpportunities();

// Compare TVL across chains
const tvlComparison = await platform.crossChainData.compareTVL();
```

## Platform Health & Monitoring

```typescript
// Get platform health
const health = await platform.getHealth();
console.log(`Platform status: ${health.overall}`);

// Get platform stats
const stats = await platform.getStats();
console.log(`Active pipelines: ${stats.activePipelines}`);
console.log(`Signals generated: ${stats.signalsGenerated}`);

// Subscribe to events
platform.onEvent((event) => {
  console.log(`Event: ${event.type} from ${event.source}`);
});
```

## Event Types

The platform emits the following event types:

| Event Type | Category | Description |
|------------|----------|-------------|
| `data_ingested` | ingestion | Data successfully ingested |
| `data_processed` | processing | Data processing completed |
| `signal_generated` | signals | New signal created |
| `signal_triggered` | signals | Signal conditions met |
| `anomaly_detected` | signals | Anomaly identified |
| `arbitrage_found` | signals | Arbitrage opportunity found |
| `risk_alert` | signals | Risk threshold exceeded |
| `model_updated` | learning | Model metrics updated |
| `pipeline_error` | processing | Pipeline encountered error |
| `validation_failed` | security | Data validation failed |
| `manipulation_detected` | security | Market manipulation detected |
| `subscription_created` | marketplace | New subscription created |
| `signal_published` | marketplace | Signal published to marketplace |

## Configuration Reference

### DataPlatformConfig

```typescript
interface DataPlatformConfig {
  dataIngestion: {
    enabled: boolean;
    defaultBatchSize: number;
    monitoringEnabled: boolean;
  };
  onChainData: {
    networks: NetworkConfig[];
    realtimeEnabled: boolean;
    cacheConfig: CacheConfig;
  };
  crossChain: {
    enabled: boolean;
    chains: ChainConfig[];
    bridges: BridgeConfig[];
  };
  marketData: {
    providers: MarketDataProvider[];
    updateInterval: number;
    alertsEnabled: boolean;
  };
  signalEngine: {
    enabled: boolean;
    aiInferenceProvider: 'groq' | 'openai' | 'anthropic';
    anomalyDetectionEnabled: boolean;
    arbitrageDetectionEnabled: boolean;
    riskMonitoringEnabled: boolean;
  };
  strategyIntelligence: {
    enabled: boolean;
    rebalanceThreshold: number;
    riskBudget: number;
    optimizationFrequency: number;
  };
  signalMarketplace: {
    enabled: boolean;
    platformFeePercent: number;
    verificationRequired: boolean;
  };
  continuousLearning: {
    enabled: boolean;
    feedbackLoopEnabled: boolean;
    retrainingFrequency: number;
    performanceThreshold: number;
  };
  security: {
    validationEnabled: boolean;
    manipulationDetectionEnabled: boolean;
    accessControlEnabled: boolean;
    auditLoggingEnabled: boolean;
  };
}
```

## Best Practices

1. **Start with streaming pipelines** for real-time data needs
2. **Enable caching** to reduce API calls and improve performance
3. **Use anomaly detection** to catch unusual market activity early
4. **Configure risk alerts** with appropriate thresholds
5. **Record feedback** for continuous model improvement
6. **Validate all external data** before using in strategies
7. **Monitor pipeline metrics** to catch processing issues
8. **Use audit logging** for compliance and debugging

## Performance Considerations

- Market data updates can be throttled via `updateInterval`
- Pipeline parallelism should match available resources
- Cache TTL should balance freshness vs. load
- Batch sizes affect memory usage and latency
- Consider regional data sources for lower latency

## Security Notes

- All data is validated before processing
- Manipulation detection runs automatically
- Access control policies are enforced
- Full audit trail for all operations
- Sensitive data is handled according to privacy settings
