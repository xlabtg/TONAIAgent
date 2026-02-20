# TONAIAgent Marketplace Documentation

Comprehensive guide to the Strategy Marketplace, Copy Trading, and Agent Reputation System for autonomous agents on The Open Network (TON).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Strategy Marketplace](#strategy-marketplace)
4. [Copy Trading](#copy-trading)
5. [Reputation System](#reputation-system)
6. [Performance Analytics](#performance-analytics)
7. [Monetization](#monetization)
8. [Risk Transparency](#risk-transparency)
9. [API Reference](#api-reference)
10. [Configuration](#configuration)
11. [Security Considerations](#security-considerations)

---

## Overview

The TONAIAgent Marketplace enables users to:

- **Discover** trading strategies and autonomous agents
- **Deploy** agents with one-click configuration
- **Copy** successful traders with capital mirroring
- **Track** transparent performance metrics
- **Earn** through creator monetization
- **Trust** reputation-based rankings

### Key Features

| Feature | Description |
|---------|-------------|
| Strategy Templates | Pre-configured trading strategies with backtesting |
| Copy Trading | Proportional capital allocation with risk controls |
| Reputation System | Multi-factor scoring with fraud detection |
| Performance Analytics | Sharpe ratio, drawdowns, VaR calculations |
| Monetization | Performance fees, subscriptions, referrals |
| Risk Transparency | Warnings, capital caps, safeguards |

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   MarketplaceService                         │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  Strategy   │    Copy     │ Reputation  │   Analytics      │
│  Manager    │   Trading   │   Manager   │    Engine        │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│Monetization │    Risk     │             │                  │
│  Manager    │Transparency │             │                  │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

### Integration with TONAIAgent

The marketplace integrates seamlessly with existing modules:

```typescript
import { createAIService, createSecurityManager } from '@tonaiagent/core';
import { createMarketplaceService } from '@tonaiagent/core/marketplace';

const ai = createAIService(aiConfig);
const security = createSecurityManager(securityConfig);
const marketplace = createMarketplaceService(marketplaceConfig);
```

---

## Strategy Marketplace

### Creating a Strategy

```typescript
import { createStrategyManager } from '@tonaiagent/core/marketplace';

const strategies = createStrategyManager();

const strategy = await strategies.create({
  name: 'DeFi Yield Optimizer',
  description: 'Automated yield farming across TON DeFi protocols',
  creatorId: 'creator_123',
  category: 'yield_farming',
  visibility: 'public',
  config: {
    supportedProtocols: ['DeDust', 'STON.fi'],
    supportedTokens: ['TON', 'USDT', 'USDC'],
    minCapital: 100,
    maxCapital: 100000,
    slippageTolerance: 1,
    stopLossPercent: 15,
    takeProfitPercent: 50,
    rebalanceInterval: 60, // minutes
    parameters: {
      targetApy: {
        name: 'Target APY',
        description: 'Minimum APY threshold',
        type: 'number',
        defaultValue: 10,
        minValue: 1,
        maxValue: 100,
        required: true,
      },
    },
  },
});
```

### Strategy Categories

| Category | Description |
|----------|-------------|
| `yield_farming` | Automated yield optimization |
| `arbitrage` | Price arbitrage across DEXs |
| `liquidity_provision` | LP position management |
| `nft_trading` | NFT trading strategies |
| `dao_governance` | DAO voting and delegation |
| `delta_neutral` | Market-neutral strategies |
| `hedging` | Risk hedging strategies |
| `grid_trading` | Grid-based trading |
| `momentum` | Momentum-based trading |
| `mean_reversion` | Mean reversion strategies |

### Publishing Lifecycle

```
Draft → Pending Review → Active → Paused → Deprecated → Archived
```

```typescript
// Publish strategy to marketplace
await strategies.publish(strategy.id);

// Deprecate with migration path
await strategies.deprecate(strategy.id, 'Replaced by v2');

// Archive inactive strategy
await strategies.archive(strategy.id);
```

### Versioning

```typescript
// Create new version
const newVersion = await strategies.createVersion(strategy.id, {
  changelog: 'Improved risk parameters',
  config: updatedConfig,
  breakingChanges: false, // true for major version
});

// Rollback to previous version
await strategies.rollbackToVersion(strategy.id, '1.0.0');
```

---

## Copy Trading

### Starting Copy Trading

```typescript
import { createCopyTradingEngine } from '@tonaiagent/core/marketplace';

const copyTrading = createCopyTradingEngine({
  minCopyAmount: 10,
  maxCopyAmount: 100000,
  defaultSlippageProtection: 1,
});

const position = await copyTrading.startCopying({
  userId: 'user_456',
  agentId: 'agent_789',
  capitalAllocated: 1000,
  copyRatio: 1.0, // 1:1 copy ratio
  proportionalAllocation: true,
  autoRebalance: true,
  riskControls: {
    maxDailyLoss: 100,
    maxDailyLossPercent: 10,
    maxDrawdown: 25,
    pauseOnHighVolatility: true,
  },
  excludeTokens: ['RISKY_TOKEN'],
});
```

### Managing Copy Positions

```typescript
// Pause copying
await copyTrading.pauseCopying(position.id);

// Resume copying
await copyTrading.resumeCopying(position.id);

// Update configuration
await copyTrading.updateConfig(position.id, {
  copyRatio: 0.5,
  maxPositionSize: 500,
});

// Stop copying (immediate exit)
await copyTrading.stopCopying(position.id, true);
```

### Risk Controls

| Control | Description | Default |
|---------|-------------|---------|
| `maxDailyLoss` | Maximum daily loss (absolute) | 10% of capital |
| `maxDailyLossPercent` | Maximum daily loss (%) | 10% |
| `maxDrawdown` | Maximum total drawdown | 25% |
| `pauseOnAgentPause` | Pause when agent pauses | true |
| `pauseOnHighVolatility` | Pause during high volatility | true |
| `volatilityThreshold` | Volatility pause threshold | 50 |

---

## Reputation System

### Reputation Scoring

```typescript
import { createReputationManager } from '@tonaiagent/core/marketplace';

const reputation = createReputationManager({
  updateFrequencyMinutes: 60,
  anomalyDetectionEnabled: true,
  groqApiEnabled: true, // Use Groq for scoring
});

// Initialize reputation
await reputation.initializeReputation('agent_123');

// Update based on performance
const updated = await reputation.updateReputation('agent_123', performance);

console.log(`Score: ${updated.overallScore}`);
console.log(`Tier: ${updated.tier}`);
```

### Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Performance | 25% | Returns and profitability |
| Consistency | 15% | Return stability |
| Risk-Adjusted Returns | 20% | Sharpe ratio, etc. |
| Capital Managed | 10% | AUM size |
| User Retention | 10% | Follower retention |
| Execution Reliability | 10% | Trade success rate |
| Transparency | 5% | Information disclosure |
| Community Feedback | 5% | Reviews and ratings |

### Reputation Tiers

| Tier | Score Range | Requirements |
|------|-------------|--------------|
| Bronze | 0-49 | Basic registration |
| Silver | 50-69 | 50+ trades, 30 days active, 10+ followers |
| Gold | 70-84 | 200+ trades, 90 days, identity verified |
| Platinum | 85-94 | 500+ trades, 180 days, full verification |
| Diamond | 95-100 | 1000+ trades, 1 year, platform certified |

### Fraud Detection

```typescript
// Automatic fraud detection
const flags = await reputation.detectFraud('agent_123', performance);

// Manual fraud report
const flag = await reputation.reportFraud('agent_123', {
  type: 'wash_trading',
  severity: 'high',
  description: 'Suspicious trading patterns',
  evidence: ['Screenshot URL', 'Transaction hashes'],
  status: 'investigating',
});

// Resolve fraud flag
await reputation.resolveFraudFlag(flag.id, 'False alarm', true);
```

### Fraud Types Detected

- `wash_trading` - Self-trading to inflate volume
- `fake_performance` - Manipulated performance metrics
- `strategy_cloning` - Copying without attribution
- `front_running` - Trading ahead of followers
- `manipulation` - Market manipulation
- `pump_and_dump` - Coordinated price manipulation
- `fake_volume` - Artificial volume generation
- `sybil_attack` - Multiple fake accounts

---

## Performance Analytics

### Calculating Analytics

```typescript
import { createAnalyticsEngine } from '@tonaiagent/core/marketplace';

const analytics = createAnalyticsEngine({
  riskFreeRate: 0.05, // 5% annual
  benchmarks: ['TON', 'BTC', 'ETH'],
});

const report = await analytics.calculateAnalytics('agent_123', '30d');

console.log(`Total Return: ${report.returns.totalReturn}%`);
console.log(`Sharpe Ratio: ${report.risk.sharpeRatio}`);
console.log(`Max Drawdown: ${report.risk.maxDrawdown}%`);
console.log(`Win Rate: ${report.trading.winRate}%`);
```

### Return Metrics

| Metric | Description |
|--------|-------------|
| `totalReturn` | Cumulative return |
| `annualizedReturn` | Annualized return rate |
| `timeWeightedReturn` | TWR accounting for flows |
| `moneyWeightedReturn` | IRR-based return |
| `dailyReturns` | Daily return series |
| `bestDay` / `worstDay` | Best/worst single day |
| `positiveMonths` | Count of positive months |

### Risk Metrics

| Metric | Description |
|--------|-------------|
| `volatility` | Daily volatility |
| `annualizedVolatility` | Annualized volatility |
| `sharpeRatio` | Risk-adjusted return |
| `sortinoRatio` | Downside risk-adjusted |
| `calmarRatio` | Return / Max Drawdown |
| `maxDrawdown` | Maximum peak-to-trough |
| `var95` | Value at Risk (95%) |
| `cvar95` | Conditional VaR |

### Trading Metrics

| Metric | Description |
|--------|-------------|
| `winRate` | Winning trade percentage |
| `profitFactor` | Gross profit / Gross loss |
| `avgWin` / `avgLoss` | Average win/loss size |
| `expectancy` | Expected value per trade |
| `avgHoldingPeriod` | Average position duration |
| `consecutiveWins` | Max consecutive wins |

### Leaderboards

```typescript
// Generate leaderboard
const leaderboard = await analytics.generateLeaderboard('top_performers', '30d');

// Leaderboard types
const types = [
  'top_performers',      // By returns
  'top_risk_adjusted',   // By Sharpe ratio
  'most_followed',       // By follower count
  'highest_aum',         // By capital managed
  'most_consistent',     // By consistency score
  'rising_stars',        // Fastest growing
  'top_creators',        // By creator earnings
];
```

---

## Monetization

### Fee Structures

```typescript
import { createMonetizationManager } from '@tonaiagent/core/marketplace';

const monetization = createMonetizationManager({
  platformFeePercent: 2.5,
  maxPerformanceFee: 30,
  maxManagementFee: 2,
  payoutFrequency: 'weekly',
  minPayoutAmount: 10,
});

// Create fee structure
const feeStructure = await monetization.createFeeStructure({
  creatorId: 'creator_123',
  fees: [
    { type: 'performance', rate: 20 },  // 20% of profits
    { type: 'management', rate: 1 },    // 1% annual
  ],
  revenueShare: {
    creatorShare: 70,
    platformShare: 25,
    referrerShare: 5,
  },
});
```

### Fee Types

| Type | Description | Typical Range |
|------|-------------|---------------|
| `performance` | Percentage of profits | 10-30% |
| `management` | Annual management fee | 0.5-2% |
| `subscription` | Monthly fixed fee | $10-$100 |
| `referral` | Referrer bonus | 5-20% |
| `platform` | Platform fee | 2.5% |

### Calculating Fees

```typescript
const fees = await monetization.calculateFees({
  creatorId: 'creator_123',
  pnl: 1000,            // 1000 TON profit
  capitalManaged: 10000, // 10000 TON AUM
  periodDays: 30,
});

console.log(`Performance Fee: ${fees.performanceFee} TON`);
console.log(`Management Fee: ${fees.managementFee} TON`);
console.log(`Total Fees: ${fees.totalFees} TON`);
console.log(`Creator Earnings: ${fees.creatorEarnings} TON`);
```

### Payouts

```typescript
// Schedule payout
const payout = await monetization.schedulePayout({
  recipientId: 'creator_123',
  recipientType: 'creator',
  amount: 100,
});

// Process pending payouts (batch)
const result = await monetization.processPendingPayouts();
console.log(`Processed: ${result.processed}`);
console.log(`Successful: ${result.successful}`);
console.log(`Total Amount: ${result.totalAmount} TON`);
```

### Referral Program

```typescript
// Register referral
await monetization.registerReferral('referrer_123', 'user_456');

// Get referral stats
const stats = await monetization.getReferralStats('referrer_123');
console.log(`Total Referrals: ${stats.totalReferrals}`);
console.log(`Total Earnings: ${stats.totalEarnings} TON`);
```

---

## Risk Transparency

### Risk Assessment

```typescript
import { createRiskTransparencyManager } from '@tonaiagent/core/marketplace';

const riskManager = createRiskTransparencyManager({
  requireWarningsAcknowledgment: true,
  maxRiskLevelAllowed: 'high',
  capitalCaps: [
    { riskLevel: 'low', maxCapitalPercent: 50, maxAbsoluteCapital: 100000 },
    { riskLevel: 'moderate', maxCapitalPercent: 30, maxAbsoluteCapital: 50000 },
    { riskLevel: 'high', maxCapitalPercent: 15, maxAbsoluteCapital: 25000 },
  ],
});

// Assess strategy risk
const assessment = await riskManager.assessStrategyRisk(strategy);
console.log(`Overall Risk: ${assessment.overallRisk}`);
console.log(`Risk Score: ${assessment.score}/100`);
```

### Risk Categories

| Category | Description |
|----------|-------------|
| `market` | Price volatility risk |
| `liquidity` | Exit slippage risk |
| `smart_contract` | Protocol exploit risk |
| `protocol` | Protocol-specific risks |
| `operational` | Execution risks |
| `counterparty` | Third-party risks |
| `regulatory` | Legal/compliance risks |

### Risk Disclosures

```typescript
// Generate disclosure document
const disclosure = await riskManager.generateRiskDisclosure('strategy_123');

console.log('General Warnings:', disclosure.generalWarnings);
console.log('Specific Risks:', disclosure.specificRisks);
console.log('Required Acknowledgments:', disclosure.requiredAcknowledgments);

// Generate worst-case scenario
const worstCase = await riskManager.generateWorstCaseScenario('strategy_123', 1000);
console.log(`Max Potential Loss: ${worstCase.potentialLoss} TON`);
```

### Capital Caps

```typescript
// Check capital limits
const cap = await riskManager.calculateCapitalCap('user_123', 'high');
console.log(`Max Capital: ${cap.maxAbsoluteCapital} TON`);
console.log(`Remaining: ${cap.remainingCapacity} TON`);

// Enforce limits
const result = riskManager.enforceCapitalCap('user_123', 50000, 'high');
if (!result.allowed) {
  console.log(`Rejected: ${result.reason}`);
  console.log(`Max Allowed: ${result.maxAllowed} TON`);
}
```

### User Acknowledgments

```typescript
// Record acknowledgment
await riskManager.recordAcknowledgment('user_123', 'risk_1', 'risk_disclosure');

// Check if acknowledged
const hasAcked = await riskManager.hasAcknowledged('user_123', 'risk_1');
```

---

## API Reference

### MarketplaceService

```typescript
interface MarketplaceService {
  strategies: StrategyManager;
  copyTrading: CopyTradingEngine;
  reputation: ReputationManager;
  analytics: AnalyticsEngine;
  monetization: MonetizationManager;
  riskTransparency: RiskTransparencyManager;

  getHealth(): Promise<MarketplaceHealth>;
  onEvent(callback: MarketplaceEventCallback): void;
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `strategy_published` | Strategy published to marketplace |
| `strategy_updated` | Strategy configuration updated |
| `strategy_deprecated` | Strategy marked as deprecated |
| `agent_deployed` | Agent deployed from strategy |
| `copy_started` | User started copy trading |
| `copy_stopped` | User stopped copy trading |
| `trade_copied` | Trade successfully copied |
| `score_updated` | Reputation score changed |
| `fraud_detected` | Fraud pattern detected |
| `payout_processed` | Payout completed |

---

## Configuration

### Full Configuration Example

```typescript
import { createMarketplaceService, MarketplaceConfig } from '@tonaiagent/core/marketplace';

const config: MarketplaceConfig = {
  enabled: true,

  discovery: {
    maxResultsPerPage: 50,
    cacheTimeSeconds: 300,
    featuredSlots: 10,
    trendingWindowHours: 24,
    minScoreForListing: 30,
  },

  copyTrading: {
    enabled: true,
    minCopyAmount: 10,
    maxCopyAmount: 100000,
    defaultSlippageProtection: 1,
    maxFollowersPerAgent: 1000,
    cooldownPeriodMinutes: 5,
  },

  scoring: {
    updateFrequencyMinutes: 60,
    anomalyDetectionEnabled: true,
    groqApiEnabled: true,
  },

  monetization: {
    platformFeePercent: 2.5,
    maxPerformanceFee: 30,
    maxManagementFee: 2,
    payoutFrequency: 'weekly',
    minPayoutAmount: 10,
  },

  riskTransparency: {
    requireWarnings: true,
    maxRiskLevel: 'high',
    requireBacktest: false,
    requireAudit: false,
    capitalCaps: [
      { riskLevel: 'low', maxCapitalPercent: 50, maxAbsoluteCapital: 100000 },
      { riskLevel: 'moderate', maxCapitalPercent: 30, maxAbsoluteCapital: 50000 },
      { riskLevel: 'high', maxCapitalPercent: 15, maxAbsoluteCapital: 25000 },
      { riskLevel: 'extreme', maxCapitalPercent: 5, maxAbsoluteCapital: 10000 },
    ],
  },

  social: {
    enabled: false, // Phase 2
    leaderboardsEnabled: true,
    commentsEnabled: false,
    reviewsEnabled: false,
    activityFeedEnabled: false,
  },
};

const marketplace = createMarketplaceService(config);
```

---

## Security Considerations

### Access Control

- All operations require authenticated user context
- Strategy creators must be verified for public listing
- Copy trading requires risk acknowledgment
- Admin operations require elevated permissions

### Data Protection

- Sensitive strategy parameters are encrypted
- Performance data is integrity-checked
- Audit logs are tamper-proof
- PII is redacted in public views

### Risk Management

- Capital caps prevent over-concentration
- Automatic stop-loss on copy positions
- Kill switch for emergency pause
- Rate limiting on all operations

### Fraud Prevention

- Real-time anomaly detection
- Wash trading pattern recognition
- Performance verification checks
- Multi-factor verification for withdrawals

---

## Best Practices

### For Strategy Creators

1. Start with conservative parameters
2. Backtest thoroughly before publishing
3. Document risk factors clearly
4. Monitor follower feedback
5. Respond to fraud flags promptly

### For Copy Traders

1. Start with small capital allocation
2. Diversify across multiple agents
3. Set appropriate risk controls
4. Monitor performance regularly
5. Acknowledge all risk warnings

### For Platform Operators

1. Enable fraud detection
2. Configure appropriate capital caps
3. Monitor leaderboard integrity
4. Process payouts regularly
5. Maintain audit logs

---

## Support

For technical issues, visit:
- GitHub Issues: https://github.com/xlabtg/TONAIAgent/issues
- Documentation: https://github.com/xlabtg/TONAIAgent#readme

---

*This documentation was generated for TONAIAgent Marketplace v0.3.0*
