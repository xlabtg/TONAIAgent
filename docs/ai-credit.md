# AI-Native Credit, Lending & Underwriting Layer

## Overview

The AI Credit Layer is a comprehensive AI-native credit and lending infrastructure integrated with CoinRabbit as the initial CeFi lending provider. The system enables AI agents to autonomously borrow, lend, refinance, and manage collateral with real-time credit/risk scoring, adaptive loan optimization, automated liquidation/hedging, and capital efficiency optimization.

This module positions the platform as:

- **The autonomous credit layer** for AI-driven finance
- **A bridge between CeFi lending and DeFi** through AI orchestration
- **A risk-optimized lending infrastructure** for both AI agents and users

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI Credit Manager                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  CoinRabbit │ │   Lending   │ │   Credit    │ │  Collateral │           │
│  │   Adapter   │ │   Manager   │ │   Scorer    │ │   Manager   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐                                            │
│  │Underwriting │ │  Strategy   │                                            │
│  │   Engine    │ │   Engine    │                                            │
│  └─────────────┘ └─────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CoinRabbit API                                       │
│              (Crypto-backed loans, 200+ assets)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```typescript
import {
  createAICreditManager,
  AICreditConfig,
} from '@tonaiagent/core/ai-credit';
```

### Basic Setup

```typescript
// Create the AI credit manager
const credit = createAICreditManager({
  lending: { enabled: true, maxLTV: 0.75 },
  creditScoring: { enabled: true, scoringModel: 'ai_powered' },
  collateralManagement: { autoMonitoring: true, hedgingEnabled: true },
  underwriting: { riskModel: 'moderate' },
});

// Get credit score
const score = await credit.creditScorer.calculateScore('user-1');

// Get loan quote
const quote = await credit.lending.getBestQuote({
  collateralAsset: 'TON',
  collateralAmount: '1000',
  borrowAsset: 'USDT',
});

// Create loan
const loan = await credit.lending.createLoan({
  collateralAssets: [{ symbol: 'TON', amount: '1000' }],
  borrowAsset: 'USDT',
  borrowAmount: '500',
});

// Create leveraged strategy
const strategy = await credit.strategies.createStrategy('user-1', {
  name: 'TON Yield Farm',
  type: 'leveraged_yield_farming',
  config: { maxLeverage: 2, targetAPY: 0.20 },
});
```

## Components

### 1. CoinRabbit Adapter

Direct integration with CoinRabbit's crypto-backed lending API.

#### Features

- Connection management with rate limiting
- Quote generation for crypto-backed loans
- Loan creation and lifecycle management
- Repayment processing
- Collateral management
- Simulation mode for testing

#### Usage

```typescript
const coinrabbit = credit.coinrabbit;

// Connect to CoinRabbit API
await coinrabbit.connect();

// Get available assets
const assets = await coinrabbit.getAvailableAssets();

// Get loan quote
const quote = await coinrabbit.getQuote({
  collateralAsset: 'TON',
  collateralAmount: '1000',
  borrowAsset: 'USDT',
  ltvOption: 50,
});

// Create loan
const loan = await coinrabbit.createLoan({
  quoteId: quote.id,
  walletAddress: '0x...',
  acceptedTerms: true,
});

// Repay loan
await coinrabbit.repayLoan(loan.id, '500', 'partial');

// Manage collateral
await coinrabbit.addCollateral(loan.id, '100');
await coinrabbit.removeCollateral(loan.id, '50');
```

#### Simulation Mode

```typescript
// For testing without real API calls
const testAdapter = createCoinRabbitAdapter({
  apiKey: 'test-key',
  environment: 'sandbox',
});

// Simulate price changes
await testAdapter.simulatePriceChange('TON', 4.0); // Price drop

// Simulate interest accrual
await testAdapter.simulateInterestAccrual(loanId, 30); // 30 days
```

### 2. Lending Manager

Core lending orchestration layer that abstracts multiple providers.

#### Features

- Multi-provider loan aggregation
- Best quote selection across providers
- Loan lifecycle management
- Refinancing optimization
- Health monitoring and alerts
- Statistics and reporting

#### Usage

```typescript
const lending = credit.lending;

// Get best quote across all providers
const bestQuote = await lending.getBestQuote({
  collateralAsset: 'TON',
  collateralAmount: '1000',
  borrowAsset: 'USDT',
  targetLTV: 50,
});

// Create loan with optimal provider
const loan = await lending.createLoan({
  collateralAssets: [
    { symbol: 'TON', amount: '1000' },
  ],
  borrowAsset: 'USDT',
  borrowAmount: '500',
  provider: bestQuote.provider,
  quoteId: bestQuote.id,
});

// Get loan status
const status = await lending.getLoanStatus(loan.id);

// Health check
const health = await lending.checkLoanHealth(loan.id);
if (health.isAtRisk) {
  console.log('Warning:', health.recommendations);
}

// Repay loan
await lending.repayLoan(loan.id, '250', false);

// Check refinancing options
const refinanceOptions = await lending.getRefinancingOptions(loan.id);
if (refinanceOptions.recommendation === 'refinance') {
  await lending.refinanceLoan(loan.id, refinanceOptions.bestOption);
}

// Get statistics
const stats = await lending.getStats();
```

### 3. Credit Scorer

AI-powered credit scoring system for risk assessment.

#### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Wallet Activity | 15% | Transaction history, account age |
| DeFi History | 20% | Protocol usage, positions, yields |
| Repayment History | 25% | Past loan performance |
| Collateral Quality | 15% | Asset volatility, liquidity |
| Portfolio Stability | 15% | Diversification, consistency |
| Behavioral Patterns | 10% | Trading behavior, risk-taking |

#### Credit Grades

| Grade | Score Range | Risk Level |
|-------|-------------|------------|
| AAA | 850-900 | Excellent |
| AA | 800-849 | Very Good |
| A | 750-799 | Good |
| BBB | 700-749 | Fair |
| BB | 650-699 | Below Average |
| B | 600-649 | Poor |
| CCC | 550-599 | Very Poor |
| CC | 500-549 | High Risk |
| C | 450-499 | Very High Risk |
| D | <450 | Default Risk |

#### Usage

```typescript
const creditScorer = credit.creditScorer;

// Calculate credit score
const score = await creditScorer.calculateScore('user-1');

console.log(`Score: ${score.score} (${score.grade})`);
console.log(`Risk Level: ${score.riskLevel}`);
console.log('Factors:', score.factors);

// Check loan eligibility
const eligibility = await creditScorer.checkEligibility('user-1', {
  amount: 10000,
  collateralAmount: 20000,
  duration: 90,
  collateralAsset: 'TON',
  borrowAsset: 'USDT',
});

if (eligibility.eligible) {
  console.log('Approved terms:', eligibility.approvedTerms);
} else {
  console.log('Denial reasons:', eligibility.denialReasons);
}

// Get recommendations
const recommendations = await creditScorer.getScoreRecommendations('user-1');
console.log('How to improve:', recommendations.recommendations);
```

### 4. Collateral Manager

Dynamic collateral monitoring and management with automation.

#### Features

- Real-time position monitoring
- Auto top-up configuration
- Auto rebalancing
- Hedging strategies (delta neutral, protective puts, covered calls)
- Liquidation prevention
- Multi-asset collateral support

#### Usage

```typescript
const collateral = credit.collateral;

// Create collateral position
const position = await collateral.createPosition({
  userId: 'user-1',
  loanId: 'loan-1',
  assets: [
    { symbol: 'TON', amount: '1000', valueUSD: '5500' },
  ],
  borrowedAmount: '2500',
  borrowedAsset: 'USDT',
});

// Configure automation
await collateral.configureAutoTopUp(position.id, {
  enabled: true,
  triggerHealthFactor: 1.3,
  targetHealthFactor: 1.8,
  maxTopUpAmount: '500',
  sourceWallet: '0x...',
});

await collateral.configureAutoRebalance(position.id, {
  enabled: true,
  targetAllocations: [
    { asset: 'TON', percentage: 60 },
    { asset: 'ETH', percentage: 40 },
  ],
  rebalanceThreshold: 10,
});

// Enable hedging
await collateral.enableHedging(position.id, {
  strategy: 'delta_neutral',
  targetDelta: 0,
  maxCost: '100',
  hedgeRatio: 50,
  rehedgeThreshold: 10,
});

// Manual operations
await collateral.addCollateral(position.id, { symbol: 'TON', amount: '100' });
await collateral.removeCollateral(position.id, { symbol: 'TON', amount: '50' });

// Check health
const health = await collateral.checkHealth(position.id);
console.log(`Health Factor: ${health.healthFactor}`);
console.log(`Liquidation Distance: ${health.liquidationDistance}%`);
console.log(`Risk Level: ${health.riskLevel}`);

// Get recommendations
const recommendations = await collateral.getRecommendations(position.id);

// Get statistics
const stats = await collateral.getStats();
```

### 5. Underwriting Engine

AI-driven underwriting with stress testing and risk models.

#### Risk Models

| Model | Description | Use Case |
|-------|-------------|----------|
| `conservative` | Low risk tolerance | Capital preservation |
| `moderate` | Balanced approach | General lending |
| `aggressive` | Higher risk tolerance | Yield optimization |
| `adaptive` | Dynamic based on market | Market-responsive |

#### Features

- Comprehensive risk assessment
- Stress testing (market crash, volatility spike, liquidity crisis)
- Volatility forecasting
- Liquidation probability calculation
- AI-powered decision recommendations
- Comparable loan analysis

#### Usage

```typescript
const underwriting = credit.underwriting;

// Assess loan request
const assessment = await underwriting.assessLoanRequest({
  userId: 'user-1',
  collateralAssets: [
    { symbol: 'TON', amount: '1000', currentPrice: 5.5 },
  ],
  borrowAmount: '2500',
  borrowAsset: 'USDT',
  duration: 90,
  purpose: 'yield_farming',
});

console.log(`Decision: ${assessment.decision}`);
console.log(`Risk Score: ${assessment.riskAssessment.overallRiskScore}`);

if (assessment.decision === 'approved') {
  console.log('Approved Terms:', assessment.approvedTerms);
} else if (assessment.decision === 'conditional') {
  console.log('Conditions:', assessment.conditions);
} else {
  console.log('Rejection Reasons:', assessment.rejectionReasons);
}

// Run stress test
const stressTest = await underwriting.runStressTest(assessment.id);
console.log('Scenarios:', stressTest.scenarios);
console.log('Pass Rate:', stressTest.passRate);

// Get volatility forecast
const forecast = await underwriting.getVolatilityForecast('TON', 30);
console.log('Expected Volatility:', forecast.expectedVolatility);
console.log('Confidence:', forecast.confidence);

// Calculate liquidation probability
const liquidationProb = await underwriting.calculateLiquidationProbability(
  assessment.id,
  30 // days
);
console.log('Probability:', liquidationProb.probability);
console.log('Risk Level:', liquidationProb.riskLevel);

// Get AI analysis
const aiAnalysis = await underwriting.getAIAnalysis(assessment.id);
console.log('Reasoning:', aiAnalysis.reasoning);
console.log('Comparable Loans:', aiAnalysis.comparableLoans);
console.log('Recommendation:', aiAnalysis.recommendation);
```

### 6. Strategy Engine

Lending strategies for yield optimization and risk management.

#### Strategy Types

| Type | Description | Risk Level |
|------|-------------|------------|
| `leveraged_yield_farming` | Borrow to farm yields | High |
| `delta_neutral` | Market-neutral positions | Medium |
| `stablecoin_yield` | Stable yield generation | Low |
| `funding_rate_arbitrage` | Capture funding rates | Medium-High |

#### Usage

```typescript
const strategies = credit.strategies;

// Create strategy
const strategy = await strategies.createStrategy('user-1', {
  name: 'TON Leveraged Farming',
  type: 'leveraged_yield_farming',
  assets: ['TON', 'USDT'],
  config: {
    maxLeverage: 2.5,
    targetAPY: 0.25,
    riskLimit: 0.15,
    rebalanceThreshold: 0.10,
    stopLossLevel: 0.20,
    takeProfitLevel: 0.50,
  },
  riskLimits: {
    maxDrawdown: 0.20,
    maxLeverage: 3.0,
    minHealthFactor: 1.5,
    maxConcentration: 0.40,
    stopLossEnabled: true,
    stopLossThreshold: 0.15,
  },
});

// Get user strategies
const userStrategies = await strategies.getUserStrategies('user-1');

// Open position
const position = await strategies.openPosition(strategy.id, {
  amount: '5000',
  leverage: 2.0,
  stopLoss: 0.15,
  takeProfit: 0.40,
});

// Get current allocation
const allocation = await strategies.getCurrentAllocation(strategy.id);

// Check rebalance needs
const rebalanceAnalysis = await strategies.analyzeRebalanceNeeds(strategy.id);
if (rebalanceAnalysis.needsRebalancing) {
  await strategies.rebalanceStrategy(strategy.id);
}

// Optimize strategy
const optimization = await strategies.optimizeStrategy(strategy.id, {
  targetMetric: 'sharpe_ratio',
  constraints: {
    maxLeverage: 2.5,
    minAPY: 0.15,
    maxDrawdown: 0.20,
  },
});

// Get AI recommendations
const recommendations = await strategies.getRecommendations('user-1', {
  riskTolerance: 'moderate',
  investmentHorizon: 'medium_term',
  preferredAssets: ['TON', 'ETH'],
  capitalAvailable: 10000,
});

// Close position
await strategies.closePosition(position.id);

// Pause/resume strategy
await strategies.pauseStrategy(strategy.id);
await strategies.resumeStrategy(strategy.id);

// Get statistics
const stats = await strategies.getStats();
```

## Configuration

### Full Configuration Example

```typescript
const credit = createAICreditManager({
  // Lending configuration
  lending: {
    enabled: true,
    maxLTV: 0.75,
    minLoanAmount: 100,
    maxLoanAmount: 1000000,
    allowedCollateralAssets: ['TON', 'ETH', 'BTC', 'USDT', 'USDC'],
    allowedBorrowAssets: ['USDT', 'USDC', 'DAI'],
    defaultDuration: 30,
    autoRenewal: true,
  },

  // Borrowing configuration
  borrowing: {
    enabled: true,
    maxBorrowAmount: 500000,
    minHealthFactor: 1.2,
    liquidationThreshold: 1.1,
    autoRepayEnabled: true,
    autoTopUpEnabled: true,
  },

  // Credit scoring configuration
  creditScoring: {
    enabled: true,
    minScore: 500,
    scoringModel: 'ai_powered',
    updateFrequency: 86400, // 24 hours
    factorWeights: {
      walletActivity: 0.15,
      defiHistory: 0.20,
      repaymentHistory: 0.25,
      collateralQuality: 0.15,
      portfolioStability: 0.15,
      behavioralPatterns: 0.10,
    },
  },

  // Collateral management configuration
  collateralManagement: {
    enabled: true,
    autoMonitoring: true,
    monitoringInterval: 60, // seconds
    healthWarningThreshold: 1.5,
    healthCriticalThreshold: 1.2,
    autoTopUpEnabled: true,
    hedgingEnabled: true,
    defaultHedgingStrategy: 'delta_neutral',
  },

  // Underwriting configuration
  underwriting: {
    enabled: true,
    riskModel: 'moderate',
    maxRiskScore: 0.7,
    minCreditScore: 600,
    stressTestEnabled: true,
    aiAssisted: true,
  },

  // Strategy engine configuration
  strategyEngine: {
    enabled: true,
    allowedStrategies: [
      'leveraged_yield_farming',
      'delta_neutral',
      'stablecoin_yield',
      'funding_rate_arbitrage',
    ],
    maxStrategiesPerUser: 10,
    defaultRiskLimits: {
      maxDrawdown: 0.20,
      maxLeverage: 3.0,
      minHealthFactor: 1.5,
      maxConcentration: 0.40,
      stopLossEnabled: true,
      stopLossThreshold: 0.15,
    },
  },

  // CoinRabbit provider configuration
  providers: {
    coinrabbit: {
      apiKey: process.env.COINRABBIT_API_KEY,
      environment: 'production',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: { requestsPerSecond: 10 },
    },
  },
});
```

## Events

Subscribe to events across all components:

```typescript
credit.onEvent((event) => {
  console.log(`[${event.type}] ${event.action}:`, event.details);
});

// Event types:
// - loan_created, loan_updated, loan_repaid, loan_closed
// - collateral_added, collateral_removed, collateral_liquidated
// - quote_generated, quote_accepted
// - score_calculated, score_updated
// - assessment_completed, assessment_approved, assessment_rejected
// - strategy_created, strategy_executed, strategy_closed
// - position_opened, position_closed, position_liquidated
// - health_warning, health_critical, liquidation_risk
// - provider_connected, provider_disconnected
```

## Health Check

Monitor the overall health of the credit system:

```typescript
const health = await credit.getHealth();

console.log('Overall Status:', health.overall);
console.log('Components:', health.components);
console.log('Details:', health.details);

// health.overall: 'healthy' | 'degraded' | 'unhealthy'
// health.components: status of each component
// health.lastCheck: timestamp of last health check
```

## Statistics

Get comprehensive statistics:

```typescript
const stats = await credit.getStats();

// Lending stats
console.log('Total Loans:', stats.totalLoans);
console.log('Active Loans:', stats.activeLoans);
console.log('Total Borrowed:', stats.totalBorrowed);
console.log('Average LTV:', stats.averageLTV);

// Credit stats
console.log('Total Scored:', stats.totalScored);
console.log('Average Credit Score:', stats.averageCreditScore);

// Collateral stats
console.log('Total Positions:', stats.totalPositions);
console.log('Positions at Risk:', stats.positionsAtRisk);
console.log('Average Health Factor:', stats.averageHealthFactor);

// Strategy stats
console.log('Active Strategies:', stats.activeStrategies);
console.log('Total Strategy TVL:', stats.totalStrategyTVL);
console.log('Average Strategy APY:', stats.averageStrategyAPY);

// Underwriting stats
console.log('Total Assessments:', stats.totalAssessments);
console.log('Approval Rate:', stats.approvalRate);
```

## Security & Risk Management

### Collateral Protection

- Real-time health factor monitoring
- Automatic top-up triggers
- Liquidation prevention mechanisms
- Multi-asset collateral support

### Risk Controls

- Maximum LTV limits
- Stress testing before approval
- Volatility forecasting
- Position size limits

### AI Safety

- Explainable credit decisions
- Human oversight for high-value loans
- Comparable loan validation
- Confidence scoring on all decisions

## Best Practices

1. **Start Conservative**: Begin with lower leverage and higher collateral ratios
2. **Enable Monitoring**: Always enable auto-monitoring for collateral positions
3. **Use Hedging**: Consider hedging strategies for volatile collateral assets
4. **Diversify Collateral**: Use multiple assets to reduce concentration risk
5. **Check Credit First**: Always assess credit score before large loan requests
6. **Stress Test**: Run stress tests on positions to understand downside risks
7. **Set Stop Losses**: Enable stop-loss mechanisms on all strategies

## API Reference

For detailed API documentation, see the TypeScript definitions in:

- `src/ai-credit/types.ts` - All type definitions
- `src/ai-credit/index.ts` - Exports and factory functions
