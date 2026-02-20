# TONAIAgent - Viral Consumer Growth Engine

## Overview

The TONAIAgent Viral Consumer Growth Engine is a comprehensive infrastructure for accelerating user acquisition, retention, and network effects across the TON AI ecosystem. This system leverages referrals, social trading, gamification, and viral loops to drive exponential user growth.

### Key Features

- **Multi-level Referral System**: Tiered commissions, smart incentives, and automated payouts
- **Social Trading**: Follow traders, copy strategies, community portfolios, trading signals
- **Gamification Layer**: XP/leveling, achievements, badges, streaks, challenges, leaderboards
- **Viral Loops**: Shareable content, public dashboards, social proof mechanics
- **Growth Analytics**: Funnel tracking, cohort analysis, A/B testing, churn prediction
- **AI-Powered Optimization**: Incentive optimization via Groq
- **Anti-Abuse System**: Sybil detection, rate limiting, fraud prevention
- **Telegram-native Growth**: Bot interactions, social sharing, group features

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Referral System](#referral-system)
4. [Social Trading](#social-trading)
5. [Gamification](#gamification)
6. [Viral Loops](#viral-loops)
7. [Growth Analytics](#growth-analytics)
8. [Anti-Abuse](#anti-abuse)
9. [Configuration](#configuration)
10. [API Reference](#api-reference)
11. [Best Practices](#best-practices)

---

## Quick Start

### Basic Usage

```typescript
import { createGrowthEngine, GrowthConfig } from '@tonaiagent/core/growth';

// Create growth engine with custom config
const config: Partial<GrowthConfig> = {
  enabled: true,
  referral: { maxLevels: 3, commissionPercent: 10 },
  gamification: { xpMultiplier: 1.5, dailyXpCap: 10000 },
};

const growth = createGrowthEngine(config);

// Create referral code
const code = await growth.referral.createCode('user_123');
console.log('Referral code:', code.code);

// Track and activate referral
const referral = await growth.referral.createReferral('new_user', code.code);
await growth.referral.activateReferral(referral.id);

// Award XP for activity
const xpResult = await growth.gamification.addXp('user_123', 100, 'trade_completed');
console.log('Level:', xpResult.newLevel, 'XP:', xpResult.newXp);

// Check achievements
const unlocked = await growth.gamification.checkAchievements('user_123');
console.log('Unlocked:', unlocked.map(a => a.name));
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Growth Engine Manager                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │  Referral   │  │   Social    │  │       Gamification          │  │
│  │   System    │  │  Trading    │  │         Engine              │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────────┘  │
│         │                │                      │                    │
│  ┌──────▼────────────────▼──────────────────────▼─────────────────┐  │
│  │                      Event Bus                                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   Viral     │  │   Growth    │  │       Anti-Abuse            │  │
│  │   Loops     │  │  Analytics  │  │        System               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Network Effects** | Each new user increases value for all users |
| **Viral Growth** | Built-in sharing and social proof mechanics |
| **Sustainable Incentives** | Rewards aligned with long-term engagement |
| **Anti-Gaming** | Robust fraud detection prevents abuse |
| **Data-Driven** | A/B testing and analytics guide optimization |

### Component Overview

| Component | Purpose |
|-----------|---------|
| **Referral System** | Multi-level referral tracking and rewards |
| **Social Trading** | Follow traders, copy strategies, signals |
| **Gamification** | XP, levels, achievements, challenges |
| **Viral Loops** | Shareable content and public dashboards |
| **Growth Analytics** | Funnels, cohorts, A/B tests, predictions |
| **Anti-Abuse** | Sybil detection, rate limits, fraud prevention |

---

## Referral System

### Overview

The referral system implements multi-level tracking, smart incentives, and automated reward distribution.

### Referral Tiers

| Tier | Commission | Max Levels | Bonus Multiplier | Key Benefits |
|------|------------|------------|------------------|--------------|
| **Standard** | 10% | 2 | 1x | Basic tracking, standard rewards |
| **Premium** | 15% | 3 | 1.25x | Custom codes, advanced analytics |
| **Elite** | 20% | 4 | 1.5x | Priority support, featured placement |
| **Ambassador** | 25% | 5 | 2x | API access, co-marketing, early access |

### Basic Operations

```typescript
import { createReferralSystem } from '@tonaiagent/core/growth';

const referral = createReferralSystem({
  maxLevels: 3,
  defaultReferrerBonus: 10,
  defaultRefereeBonus: 5,
  commissionPercent: 10,
});

// Create a referral code
const code = await referral.createCode('user_123', {
  type: 'personal',
  tier: 'premium',
  customRewards: {
    referrerBonus: 15,
    refereeBonus: 10,
  },
});

// Track a new referral
const ref = await referral.createReferral('new_user', code.code, {
  source: 'twitter',
  campaign: 'summer_promo',
});

// Activate when user completes onboarding
await referral.activateReferral(ref.id);

// Get user's referral network
const tree = await referral.getReferralTree('user_123', 3);
console.log('Network size:', tree.totalNetworkSize);

// Process pending payouts
const payouts = await referral.processPayouts();
console.log('Processed:', payouts.successful, 'Total:', payouts.totalAmount);
```

### Multi-Level Commissions

```typescript
// Commission rates by level
// Level 1: 10% - Direct referral
// Level 2: 5%  - Friend of friend
// Level 3: 3%  - Third level
// Level 4: 2%  - Fourth level
// Level 5: 1%  - Fifth level

// Get network statistics
const stats = await referral.getNetworkStats('user_123');
console.log('Direct referrals:', stats.directReferrals);
console.log('Indirect referrals:', stats.indirectReferrals);
console.log('Total commissions:', stats.totalCommissions);
console.log('Conversion rate:', stats.conversionRate + '%');
```

### Tier Management

```typescript
// Upgrade user tier based on performance
await referral.upgradeTier('user_123', 'elite');

// Get tier benefits
const benefits = referral.getTierBenefits('elite');
console.log('Commission rate:', benefits.commissionRate + '%');
console.log('Max levels:', benefits.maxLevels);
console.log('Perks:', benefits.perks);
```

---

## Social Trading

### Overview

Enable users to follow traders, copy strategies, join community portfolios, and share trading signals.

### Following Traders

```typescript
import { createSocialTradingEngine } from '@tonaiagent/core/growth';

const social = createSocialTradingEngine({
  maxFollowsPerUser: 100,
  signalsPremiumOnly: false,
});

// Follow a trader
const follow = await social.follow('follower_id', 'trader_id', {
  notifications: {
    onTrade: true,
    onPerformanceMilestone: true,
    frequency: 'realtime',
  },
});

// Get following list
const following = await social.getFollowing('user_id');

// Get followers
const followers = await social.getFollowers('trader_id');
```

### Community Portfolios

```typescript
// Create a community portfolio
const portfolio = await social.createPortfolio({
  name: 'Alpha DeFi Strategies',
  description: 'Curated high-yield strategies',
  visibility: 'public',
  type: 'collaborative',
  rules: {
    minInvestment: 100,
    lockPeriodDays: 7,
    performanceFee: 10,
    votingEnabled: true,
  },
});

// Join a portfolio
await social.joinPortfolio(portfolio.id, 'user_id', 500);

// Add allocation
await social.addAllocation(portfolio.id, {
  strategyId: 'strategy_1',
  weight: 30,
  minWeight: 20,
  maxWeight: 40,
});

// Get portfolio performance
const performance = await social.getPortfolioPerformance(portfolio.id);
console.log('ROI 30d:', performance.roi30d + '%');
console.log('Sharpe:', performance.sharpeRatio);
```

### Trading Signals

```typescript
// Create a trading signal
const signal = await social.createSignal({
  asset: 'TON/USDT',
  type: 'buy',
  confidence: 85,
  reasoning: 'Strong support level with bullish divergence',
  targetPrice: 5.50,
  stopLoss: 4.80,
  timeframe: '4h',
  visibility: 'public',
});

// React to a signal
await social.reactToSignal(signal.id, 'user_id', 'like');

// Get signal performance after expiry
const perf = await social.getSignalPerformance(signal.id);
console.log('Actual P&L:', perf.actualPnlPercent + '%');
console.log('Hit target:', perf.hitTarget);
```

### Social Feed

```typescript
// Get personalized feed
const feed = await social.getFeed('user_id', {
  limit: 20,
  types: ['trade', 'signal', 'achievement', 'milestone'],
});

// Get social stats
const stats = await social.getSocialStats('user_id');
console.log('Followers:', stats.followerCount);
console.log('Signal accuracy:', stats.signalAccuracy + '%');
```

---

## Gamification

### Overview

Comprehensive gamification system with XP/leveling, achievements, badges, streaks, challenges, leaderboards, and season passes.

### XP and Leveling

```typescript
import { createGamificationEngine } from '@tonaiagent/core/growth';

const gamification = createGamificationEngine({
  xpMultiplier: 1.0,
  dailyXpCap: 10000,
  streakBonusMultiplier: 0.1,
  seasonPassEnabled: true,
});

// Award XP
const result = await gamification.addXp('user_id', 100, 'trade_completed');
console.log('XP gained:', result.xpGained);
console.log('New level:', result.newLevel);
console.log('Leveled up:', result.leveledUp);
console.log('Multiplier:', result.multiplier);

// Get user progress
const progress = await gamification.getUserProgress('user_id');
console.log('Level:', progress.level);
console.log('XP:', progress.xp, '/', progress.nextLevelXp);
```

### Achievements

```typescript
// Check for newly unlocked achievements
const unlocked = await gamification.checkAchievements('user_id');
for (const achievement of unlocked) {
  console.log('Unlocked:', achievement.name);
  console.log('XP reward:', achievement.xpReward);
}

// Get all achievements with progress
const achievements = await gamification.getAchievements('user_id');
for (const a of achievements) {
  console.log(`${a.name}: ${a.progress}% (${a.tier})`);
}
```

### Built-in Achievement Categories

| Category | Examples |
|----------|----------|
| **Trading** | First trade, 100 trades, 1000 trades, volume milestones |
| **Referral** | First referral, 10 referrals, 50 referrals, ambassador |
| **Milestone** | 7-day streak, 30-day streak, challenges completed |
| **Special** | Diamond hands, early adopter (secret achievements) |

### Streaks

```typescript
// Update daily login streak
const streak = await gamification.updateStreak('user_id', 'daily_login');
console.log('Current streak:', streak.currentStreak);
console.log('Longest streak:', streak.longestStreak);
console.log('XP multiplier:', streak.multiplier);

// Streak rewards
// Day 3: 50 XP
// Day 7: 100 XP + badge
// Day 14: 200 XP
// Day 30: 500 XP + 5 tokens + badge
// Day 100: 2000 XP + 50 tokens + badge
```

### Challenges

```typescript
// Create a trading challenge
const challenge = await gamification.createChallenge({
  name: 'Volume Master',
  description: 'Trade 10,000 TON in volume this week',
  type: 'individual',
  difficulty: 'medium',
  requirements: [
    { metric: 'volume', operator: 'gte', value: 10000, description: 'Trade 10k TON' },
  ],
  rewards: {
    xp: 1000,
    tokens: 50,
    badge: 'volume_master',
  },
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

// Join a challenge
await gamification.joinChallenge(challenge.id, 'user_id');

// Update progress
await gamification.updateChallengeProgress(challenge.id, 'user_id', 5000);

// List active challenges
const challenges = await gamification.listChallenges({ status: 'active' });
```

### Leaderboards

```typescript
// Get global weekly leaderboard
const leaderboard = await gamification.getLeaderboard('global', 'weekly', 100);
console.log('Top user:', leaderboard.entries[0].displayName);
console.log('Top score:', leaderboard.entries[0].score);

// Get user's rank
const userRank = await gamification.getUserRank('user_id', 'global', 'weekly');
console.log('Your rank:', userRank?.rank);
console.log('Your score:', userRank?.score);
```

### Season Pass

```typescript
// Get current season
const season = await gamification.getCurrentSeason();
console.log('Season:', season?.name);
console.log('Ends:', season?.endDate);

// Get user's season progress
const seasonProgress = await gamification.getSeasonProgress('user_id');
console.log('Current tier:', seasonProgress?.currentTier);
console.log('Premium:', seasonProgress?.isPremium);

// Claim tier reward
const reward = await gamification.claimSeasonReward('user_id', 10);
console.log('Reward:', reward.description);

// Upgrade to premium
await gamification.upgradeToPremium('user_id');
```

---

## Viral Loops

### Overview

Create shareable content, public dashboards, and social proof mechanics to drive organic growth.

### Shareable Content

```typescript
import { createViralLoopsEngine } from '@tonaiagent/core/growth';

const viral = createViralLoopsEngine({
  publicDashboardsEnabled: true,
  shareableCardsEnabled: true,
  embedsEnabled: true,
});

// Create shareable performance card
const content = await viral.createContent({
  type: 'performance_card',
  creatorId: 'user_id',
  entityId: 'strategy_1',
  title: 'My DeFi Strategy',
  description: '+45% ROI in 30 days',
});

// Get share links
console.log('Direct:', content.shareLinks.directLink);
console.log('Telegram:', content.shareLinks.telegramLink);
console.log('Twitter:', content.shareLinks.twitterLink);
console.log('Embed:', content.shareLinks.embedCode);
```

### Public Dashboards

```typescript
// Create a public dashboard
const dashboard = await viral.createDashboard({
  title: 'My Trading Journey',
  description: 'Follow my strategy performance',
  slug: 'trader_alice',
  visibility: 'public',
  theme: {
    colorScheme: 'dark',
    primaryColor: '#3498db',
  },
});

// Add widgets
await viral.addWidget(dashboard.id, {
  type: 'performance_chart',
  title: '30-Day Performance',
  position: { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
  dataSource: 'strategy_1',
});

await viral.addWidget(dashboard.id, {
  type: 'leaderboard_position',
  title: 'My Rank',
  position: { row: 0, col: 2, rowSpan: 1, colSpan: 1 },
  dataSource: 'global_weekly',
});

// Get dashboard stats
const stats = await viral.getDashboardStats(dashboard.id);
console.log('Views:', stats.totalViews);
console.log('Conversion rate:', stats.conversionRate + '%');
```

### Viral Coefficient

```typescript
// Get viral metrics
const viralCoeff = await viral.getViralCoefficient();
console.log('Viral coefficient:', viralCoeff);
// > 1.0 means exponential growth

// Track content performance
const metrics = await viral.getContentMetrics('content_id');
console.log('Views:', metrics.views);
console.log('Shares:', metrics.shares);
console.log('Conversions:', metrics.conversions);
```

---

## Growth Analytics

### Overview

Track user acquisition, activation, retention, and revenue metrics with A/B testing and AI-powered optimization.

### Core Metrics

```typescript
import { createGrowthAnalyticsEngine } from '@tonaiagent/core/growth';

const analytics = createGrowthAnalyticsEngine({
  trackingEnabled: true,
  cohortAnalysisEnabled: true,
  abTestingEnabled: true,
  groqIncentiveOptimization: true,
});

// Get comprehensive growth metrics
const metrics = await analytics.getGrowthMetrics('30d');

// Acquisition
console.log('New users:', metrics.acquisition.newUsers);
console.log('Growth:', metrics.acquisition.newUsersGrowth + '%');
console.log('CAC:', metrics.acquisition.costPerAcquisition);

// Retention
console.log('DAU:', metrics.retention.dau);
console.log('DAU/MAU:', metrics.retention.dauMauRatio);
console.log('D7 retention:', metrics.retention.retentionD7 + '%');

// Engagement
console.log('Avg session:', metrics.engagement.avgSessionDuration + 's');
console.log('Sessions/user:', metrics.engagement.avgSessionsPerUser);
```

### Funnel Analysis

```typescript
// Define a funnel
await analytics.defineFunnel('onboarding', [
  'signup',
  'kyc_started',
  'kyc_completed',
  'first_deposit',
  'first_trade',
]);

// Get funnel analysis
const funnel = await analytics.getFunnelAnalysis('onboarding');
for (const step of funnel) {
  console.log(`${step.name}: ${step.users} (${step.conversionRate}% conversion)`);
}

// Get dropoff points
const dropoffs = await analytics.getDropoffPoints('onboarding');
console.log('Highest dropoff:', dropoffs[0].step);
console.log('Common reasons:', dropoffs[0].commonReasons);
```

### Cohort Analysis

```typescript
// Get weekly cohort retention
const cohorts = await analytics.getCohortRetention('weekly');
for (const cohort of cohorts) {
  console.log(`Cohort ${cohort.cohort}: ${cohort.size} users`);
  console.log('Week 1:', cohort.retention['week_1'] + '%');
  console.log('Week 4:', cohort.retention['week_4'] + '%');
}
```

### A/B Testing

```typescript
// Create an experiment
const experiment = await analytics.createExperiment({
  name: 'Referral Bonus Test',
  description: 'Test different referral bonus amounts',
  variants: [
    { id: 'control', name: 'Control ($5)', weight: 50, config: { bonus: 5 } },
    { id: 'treatment', name: 'Treatment ($10)', weight: 50, config: { bonus: 10 } },
  ],
  targetMetric: 'referral_conversion',
  minimumSampleSize: 1000,
});

// Assign user to variant
const variant = await analytics.assignVariant(experiment.id, 'user_id');
console.log('Assigned variant:', variant);

// Track conversion event
await analytics.trackExperimentEvent(experiment.id, 'user_id', 'referral_completed', 1);

// Get results
const results = await analytics.getExperimentResults(experiment.id);
console.log('Status:', results.status);
console.log('Winner:', results.winner);
console.log('Confidence:', results.confidence + '%');
```

### Churn Prediction

```typescript
// Get users at risk of churning
const atRisk = await analytics.getChurnPredictions(0.7);
for (const prediction of atRisk) {
  console.log('User:', prediction.userId);
  console.log('Churn probability:', prediction.churnProbability);
  console.log('Risk factors:', prediction.riskFactors);
  console.log('Recommended actions:', prediction.recommendedActions);
}

// Get specific user's churn risk
const userRisk = await analytics.getUserChurnRisk('user_id');
if (userRisk && userRisk.churnProbability > 0.5) {
  // Trigger retention campaign
}
```

### AI-Powered Optimization (Groq)

```typescript
// Get personalized incentive recommendations
const optimization = await analytics.getIncentiveOptimization('user_id');

for (const rec of optimization.recommendations) {
  console.log('Type:', rec.type);
  console.log('Amount:', rec.amount);
  console.log('Expected impact:', rec.expectedImpact);
  console.log('Confidence:', rec.confidence);
  console.log('Reasoning:', rec.reasoning);
}

// Generate personalized offers
const offers = await analytics.generatePersonalizedOffers('user_id');
for (const offer of offers) {
  console.log('Offer:', offer.title);
  console.log('Value:', offer.value);
  console.log('Expires:', offer.expiresAt);
}
```

---

## Anti-Abuse

### Overview

Protect the platform from sybil attacks, referral fraud, reward farming, and other abuse patterns.

### Sybil Detection

```typescript
import { createAntiAbuseSystem } from '@tonaiagent/core/growth';

const antiAbuse = createAntiAbuseSystem({
  sybilDetectionEnabled: true,
  fraudScoreThreshold: 70,
  autoBlockThreshold: 90,
});

// Check user for sybil risk
const sybilCheck = await antiAbuse.checkSybilRisk('user_id');
console.log('Risk score:', sybilCheck.riskScore);
console.log('Recommendation:', sybilCheck.recommendation);

for (const signal of sybilCheck.signals) {
  console.log('Signal:', signal.type, '-', signal.description);
  console.log('Weight:', signal.weight);
}

// Get linked accounts
const linked = await antiAbuse.getLinkedAccounts('user_id');
for (const account of linked) {
  console.log('Linked user:', account.userId);
  console.log('Link type:', account.linkType);
  console.log('Confidence:', account.confidence);
}
```

### Rate Limiting

```typescript
// Check rate limit before action
const rateCheck = await antiAbuse.checkRateLimit('user_id', 'referral');
if (rateCheck.allowed) {
  // Proceed with action
  await antiAbuse.incrementRateLimit('user_id', 'referral');
} else {
  console.log('Rate limited. Wait:', rateCheck.waitTime, 'seconds');
  console.log('Remaining:', rateCheck.remaining);
  console.log('Resets at:', rateCheck.resetAt);
}

// Get overall rate limit status
const status = await antiAbuse.getRateLimitStatus('user_id');
for (const [action, limit] of Object.entries(status.limits)) {
  console.log(`${action}: ${limit.used}/${limit.limit}`);
}
```

### Risk Scoring

```typescript
// Calculate user's overall risk score
const risk = await antiAbuse.calculateRiskScore('user_id');
console.log('Overall score:', risk.overallScore);
console.log('Recommendation:', risk.recommendation);

for (const factor of risk.factors) {
  if (factor.detected) {
    console.log('Risk factor:', factor.name);
    console.log('Description:', factor.description);
    console.log('Weight:', factor.weight);
  }
}
```

### Abuse Detection

```typescript
// Detect potential abuse from activity
const detection = await antiAbuse.detectAbuse('user_id', {
  type: 'referral_signup',
  timestamp: new Date(),
  metadata: { code: 'ABC123' },
  ipAddress: '192.168.1.1',
  deviceFingerprint: 'fp_123',
});

if (detection) {
  console.log('Abuse detected:', detection.type);
  console.log('Severity:', detection.severity);
  console.log('Confidence:', detection.confidence);
}

// Report abuse manually
const report = await antiAbuse.reportAbuse('user_id', 'self_referral', [
  {
    type: 'ip_match',
    description: 'Same IP as referrer',
    value: '192.168.1.1',
    weight: 50,
    timestamp: new Date(),
  },
]);
```

### Penalties

```typescript
// Apply penalty for confirmed abuse
const penalty = await antiAbuse.applyPenalty('user_id', {
  type: 'reward_hold',
  reason: 'Suspected referral abuse - pending investigation',
  duration: 7 * 24 * 60 * 60, // 7 days
});

// Get user's penalties
const penalties = await antiAbuse.getUserPenalties('user_id');

// Revoke penalty if cleared
await antiAbuse.revokePenalty(penalty.id, 'Investigation cleared the user');
```

---

## Configuration

### Full Configuration Example

```typescript
import { createGrowthEngine, GrowthConfig } from '@tonaiagent/core/growth';

const config: Partial<GrowthConfig> = {
  enabled: true,

  // Referral configuration
  referral: {
    enabled: true,
    maxLevels: 3,
    defaultReferrerBonus: 10,
    defaultRefereeBonus: 5,
    commissionPercent: 10,
    codeExpirationDays: 90,
    minCapitalForReward: 10,
    cooldownHours: 24,
  },

  // Social trading configuration
  socialTrading: {
    enabled: true,
    maxFollowsPerUser: 100,
    signalsPremiumOnly: false,
    portfolioMinMembers: 2,
    portfolioMaxMembers: 1000,
  },

  // Gamification configuration
  gamification: {
    enabled: true,
    xpMultiplier: 1.0,
    dailyXpCap: 10000,
    streakBonusMultiplier: 0.1,
    seasonPassEnabled: true,
  },

  // Viral loops configuration
  viralLoops: {
    enabled: true,
    publicDashboardsEnabled: true,
    shareableCardsEnabled: true,
    embedsEnabled: true,
    attributionWindow: 30, // days
  },

  // Analytics configuration
  analytics: {
    enabled: true,
    trackingEnabled: true,
    cohortAnalysisEnabled: true,
    abTestingEnabled: true,
    groqIncentiveOptimization: true,
  },

  // Anti-abuse configuration
  antiAbuse: {
    enabled: true,
    sybilDetectionEnabled: true,
    fraudScoreThreshold: 70,
    autoBlockThreshold: 90,
    rateLimits: {
      referralsPerDay: 10,
      rewardsClaimPerDay: 5,
      sharesPerHour: 20,
      signalsPerDay: 10,
    },
    cooldownPeriods: {
      referral: 3600,
      reward_claim: 300,
      trade: 60,
    },
  },

  // Telegram configuration
  telegram: {
    enabled: true,
    notificationsEnabled: true,
  },
};

const growth = createGrowthEngine(config);
```

---

## API Reference

### GrowthEngine

| Method | Description |
|--------|-------------|
| `getHealth()` | Get overall growth system health status |
| `getStats()` | Get aggregate growth statistics |
| `onEvent(callback)` | Subscribe to growth events |

### ReferralSystem

| Method | Description |
|--------|-------------|
| `createCode(ownerId, options)` | Create a new referral code |
| `getCode(code)` | Get referral code details |
| `createReferral(refereeId, code, metadata)` | Create referral tracking |
| `activateReferral(referralId)` | Activate a referral |
| `calculateRewards(referralId, milestone)` | Calculate referral rewards |
| `getReferralTree(userId, maxDepth)` | Get user's referral network |
| `getNetworkStats(userId)` | Get referral network statistics |
| `processPayouts()` | Process pending reward payouts |

### GamificationEngine

| Method | Description |
|--------|-------------|
| `getUserProgress(userId)` | Get user's gamification progress |
| `addXp(userId, amount, source)` | Award XP to user |
| `checkAchievements(userId)` | Check and unlock achievements |
| `updateStreak(userId, type)` | Update user's streak |
| `createChallenge(input)` | Create a new challenge |
| `joinChallenge(challengeId, userId)` | Join a challenge |
| `getLeaderboard(type, period, limit)` | Get leaderboard entries |

### SocialTradingEngine

| Method | Description |
|--------|-------------|
| `follow(followerId, followedId, options)` | Follow a trader/strategy |
| `createPortfolio(input)` | Create community portfolio |
| `createSignal(input)` | Create trading signal |
| `getFeed(userId, options)` | Get personalized social feed |

### ViralLoopsEngine

| Method | Description |
|--------|-------------|
| `createContent(input)` | Create shareable content |
| `createDashboard(input)` | Create public dashboard |
| `getViralCoefficient()` | Get viral coefficient metric |

### GrowthAnalyticsEngine

| Method | Description |
|--------|-------------|
| `getGrowthMetrics(period)` | Get comprehensive metrics |
| `getFunnelAnalysis(funnelName)` | Get funnel conversion data |
| `getCohortRetention(type)` | Get cohort retention data |
| `createExperiment(input)` | Create A/B test experiment |
| `getChurnPredictions(minProb)` | Get churn risk predictions |
| `getIncentiveOptimization(userId)` | Get AI-powered recommendations |

### AntiAbuseSystem

| Method | Description |
|--------|-------------|
| `checkSybilRisk(userId)` | Check for sybil attack risk |
| `checkRateLimit(userId, action)` | Check rate limit status |
| `calculateRiskScore(userId)` | Calculate overall risk score |
| `detectAbuse(userId, activity)` | Detect potential abuse |
| `applyPenalty(userId, penalty)` | Apply penalty to user |

---

## Best Practices

### 1. Optimize Referral Programs

```typescript
// Use tiered commissions to reward top performers
// Implement cooldowns to prevent spam
// Track conversion quality, not just quantity
```

### 2. Balance Gamification

```typescript
// Set reasonable daily XP caps
// Use streaks to encourage consistent engagement
// Make achievements feel meaningful and attainable
```

### 3. Protect Against Abuse

```typescript
// Enable sybil detection early
// Set conservative rate limits initially
// Monitor risk scores regularly
// Investigate before auto-blocking
```

### 4. Measure Everything

```typescript
// Define clear funnels for key user journeys
// Run A/B tests for major changes
// Track retention cohorts weekly
// Act on churn predictions proactively
```

### 5. Personalize Incentives

```typescript
// Use AI optimization recommendations
// Segment users by behavior patterns
// Test different reward amounts and timing
// Personalize offers based on user journey stage
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.10.0 | 2026-02-20 | Initial release with viral consumer growth engine |

---

## License

MIT License - Copyright (c) 2026 TONAIAgent Team
