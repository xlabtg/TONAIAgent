# TONAIAgent Super App Module

> The "WeChat of Autonomous Finance" - A comprehensive TON-native Super App combining wallet, AI agents, marketplace, social layer, and financial infrastructure.

## Overview

The Super App module provides a unified platform for autonomous finance on the TON blockchain, integrating:

- **Smart Wallet** - MPC recovery, social recovery, agent integration
- **Agent Dashboard** - Monitor, control, and automate AI agents
- **Social Layer** - Profiles, following, feed, discussions, leaderboards
- **Financial Dashboard** - Portfolio, performance, risk analysis
- **Notifications** - Multi-channel alerts (Telegram, push, email)
- **Telegram Integration** - Mini App and bot commands
- **Gamification** - XP, levels, achievements, challenges, referrals
- **AI Assistant** - Conversational interface powered by Groq
- **Monetization** - Subscription tiers and premium features

## Installation

```typescript
import { createSuperAppService } from '@tonaiagent/core/superapp';

const superApp = createSuperAppService({
  enabled: true,
  telegram: {
    botToken: 'YOUR_BOT_TOKEN',
    miniAppUrl: 'https://t.me/TONAIAgentBot/app',
  },
  gamification: {
    enabled: true,
    experienceMultiplier: 1.0,
  },
  aiAssistant: {
    enabled: true,
    defaultProvider: 'groq',
  },
});
```

## Modules

### Smart Wallet

The Smart Wallet module provides secure wallet management with advanced recovery options:

```typescript
// Create a wallet
const wallet = await superApp.wallet.create({
  userId: 'user_123',
  type: 'smart_contract',
  name: 'My TON Wallet',
});

// Get wallet balances
const balances = await superApp.wallet.getBalances(wallet.id);

// Transfer assets
const tx = await superApp.wallet.transfer({
  walletId: wallet.id,
  to: 'EQD...',
  amount: 100,
  asset: 'TON',
});

// Add guardian for social recovery
await superApp.wallet.addGuardian({
  walletId: wallet.id,
  guardianId: 'guardian_456',
  address: 'EQD...',
  name: 'Trusted Friend',
  type: 'social',
});

// Connect an AI agent
await superApp.wallet.connectAgent({
  walletId: wallet.id,
  agentId: 'agent_789',
  permissions: ['trade', 'stake'],
  dailyLimit: 1000,
});
```

### Agent Dashboard

Monitor and control your AI agents:

```typescript
// Create an agent
const agent = await superApp.agentDashboard.createAgent({
  userId: 'user_123',
  name: 'Yield Optimizer',
  description: 'Automated yield farming',
  strategyId: 'strategy_456',
  strategyName: 'DeFi Yield Optimizer',
  capitalAllocated: 1000,
});

// Get agent status
const status = await superApp.agentDashboard.getAgentStatus(agent.id);

// Create an automation rule
await superApp.agentDashboard.createAutomation({
  userId: 'user_123',
  name: 'Stop Loss',
  trigger: {
    type: 'price',
    asset: 'TON',
    condition: 'below',
    value: 5.0,
  },
  action: {
    type: 'pause_agent',
    agentId: agent.id,
  },
});

// Create an alert
await superApp.agentDashboard.createAlert({
  userId: 'user_123',
  agentId: agent.id,
  type: 'profit_target',
  threshold: 20,
  message: 'Agent reached 20% profit target',
});
```

### Social Layer

Build your trading community:

```typescript
// Create a profile
const profile = await superApp.social.createProfile({
  userId: 'user_123',
  displayName: 'CryptoTrader',
  bio: 'DeFi enthusiast and yield farmer',
  avatarUrl: 'https://example.com/avatar.png',
  preferences: {
    showPortfolio: true,
    showActivity: true,
    allowMessages: true,
    allowFollows: true,
  },
});

// Follow another user
await superApp.social.followUser('user_123', 'user_456');

// Create a feed item
await superApp.social.createFeedItem({
  userId: 'user_123',
  type: 'trade',
  content: 'Just executed a profitable trade!',
  metadata: {
    asset: 'TON',
    profit: 150,
  },
});

// Start a discussion
const discussion = await superApp.social.createDiscussion({
  userId: 'user_123',
  title: 'Best yield farming strategies?',
  content: 'What are your favorite yield strategies?',
  category: 'strategies',
  tags: ['yield', 'defi', 'farming'],
});

// Get leaderboard
const leaderboard = await superApp.social.getLeaderboard('profit_30d', {
  limit: 10,
});
```

### Financial Dashboard

Track your portfolio and risk:

```typescript
// Get portfolio overview
const portfolio = await superApp.financial.getPortfolio('user_123');
console.log(`Total Value: $${portfolio.totalValue}`);
console.log(`24h Change: ${portfolio.change24h}%`);

// Get performance metrics
const performance = await superApp.financial.getPerformance('user_123', {
  period: '30d',
});

// Get risk analysis
const risk = await superApp.financial.getRiskOverview('user_123');
console.log(`VaR (95%): $${risk.valueAtRisk95}`);
console.log(`Risk Level: ${risk.riskLevel}`);

// Get asset allocation
const allocation = await superApp.financial.getAllocation('user_123');
```

### Notifications

Stay informed with multi-channel notifications:

```typescript
// Create a notification
await superApp.notifications.create({
  userId: 'user_123',
  type: 'trade_executed',
  title: 'Trade Executed',
  message: 'Your TON trade was executed successfully',
  priority: 'normal',
  data: {
    asset: 'TON',
    amount: 100,
    price: 5.50,
  },
});

// Update notification settings
await superApp.notifications.updateSettings({
  userId: 'user_123',
  channels: {
    telegram: { enabled: true },
    push: { enabled: true },
    email: { enabled: false },
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
});

// Get unread notifications
const notifications = await superApp.notifications.getNotifications('user_123', {
  unreadOnly: true,
});
```

### Telegram Integration

Seamless Telegram Mini App experience:

```typescript
// Link Telegram account
await superApp.telegram.linkTelegram({
  userId: 'user_123',
  telegramId: 123456789,
  username: 'cryptotrader',
  firstName: 'John',
});

// Initialize Mini App
const context = await superApp.telegram.initMiniApp({
  userId: 'user_123',
  initData: 'query_id=...',
  platform: 'ios',
  version: '7.0',
});

// Send a message
await superApp.telegram.sendMessage({
  chatId: 123456789,
  text: 'Your trade was executed!',
  keyboard: {
    inline: true,
    buttons: [
      [{ text: 'View Details', callbackData: 'view_trade' }],
    ],
  },
});

// Generate deep link
const deepLink = superApp.telegram.generateDeepLink('wallet', { action: 'deposit' });
```

### Gamification

Engage users with rewards:

```typescript
// Get user progress
const progress = await superApp.gamification.getUserProgress('user_123');
console.log(`Level: ${progress.level}`);
console.log(`XP: ${progress.experience}/${progress.experienceToNextLevel}`);
console.log(`Tier: ${progress.tier}`);

// Add experience
await superApp.gamification.addExperience({
  userId: 'user_123',
  amount: 100,
  reason: 'Completed first trade',
  category: 'trading',
});

// Check achievements
const achievements = await superApp.gamification.checkAchievements('user_123');

// Get active challenges
const challenges = await superApp.gamification.getActiveChallenges('user_123');

// Update streak
const streak = await superApp.gamification.updateStreak('user_123', 'daily_login');

// Create referral
const referral = await superApp.gamification.createReferral({
  referrerId: 'user_123',
  referredId: 'user_456',
  code: 'CRYPTO123',
});
```

### AI Assistant

Conversational AI for portfolio management:

```typescript
// Create a session
const session = await superApp.aiAssistant.createSession({
  userId: 'user_123',
  context: {
    portfolioAccess: true,
    agentAccess: true,
  },
});

// Send a message
const response = await superApp.aiAssistant.sendMessage({
  sessionId: session.sessionId,
  content: 'Analyze my portfolio and suggest improvements',
});
console.log(response.content);

// Execute suggested actions
if (response.actions) {
  for (const action of response.actions) {
    await superApp.aiAssistant.executeAction(session.sessionId, action.id);
  }
}

// Get portfolio analysis
const analysis = await superApp.aiAssistant.analyzePortfolio({
  userId: 'user_123',
  portfolioData: {
    totalValue: 10000,
    assets: [
      { symbol: 'TON', amount: 1000, value: 5500 },
      { symbol: 'USDT', amount: 4500, value: 4500 },
    ],
  },
});

// Get strategy suggestions
const suggestions = await superApp.aiAssistant.suggestStrategy({
  userId: 'user_123',
  riskTolerance: 'medium',
  investmentHorizon: 'long_term',
  goals: ['growth', 'passive_income'],
});
```

### Monetization

Premium features and subscriptions:

```typescript
// Get subscription tiers
const tiers = await superApp.monetization.getTiers();

// Create a subscription
const subscription = await superApp.monetization.createSubscription({
  userId: 'user_123',
  tier: 'pro',
  paymentMethod: 'ton',
});

// Check feature access
const hasAccess = await superApp.monetization.hasAccess('user_123', 'advanced_analytics');

// Get usage stats
const usage = await superApp.monetization.getUsage('user_123');

// Upgrade subscription
await superApp.monetization.upgradeSubscription({
  userId: 'user_123',
  newTier: 'enterprise',
  prorated: true,
});
```

## Configuration

### Full Configuration Example

```typescript
const superApp = createSuperAppService({
  enabled: true,

  wallet: {
    supportedAssets: ['TON', 'USDT', 'USDC', 'NOT'],
    supportedProtocols: ['stonfi', 'dedust', 'ston.fi'],
    defaultSecurityLevel: 'high',
    transactionLimits: {
      daily: 10000,
      perTransaction: 1000,
    },
  },

  agentDashboard: {
    maxAgentsPerUser: 10,
    maxAutomationsPerUser: 50,
  },

  social: {
    profilesEnabled: true,
    feedEnabled: true,
    discussionsEnabled: true,
    leaderboardsEnabled: true,
    maxFollowersPerUser: 10000,
  },

  financial: {
    baseCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'TON'],
    priceUpdateIntervalMs: 60000,
  },

  notifications: {
    channels: ['telegram', 'push', 'email'],
    defaultCategories: ['trades', 'alerts', 'social'],
    rateLimitPerMinute: 60,
  },

  telegram: {
    botToken: 'YOUR_BOT_TOKEN',
    miniAppUrl: 'https://t.me/TONAIAgentBot/app',
    webhookUrl: 'https://api.example.com/telegram/webhook',
    commands: [
      { command: 'start', description: 'Start the bot' },
      { command: 'wallet', description: 'View your wallet' },
      { command: 'agents', description: 'Manage your agents' },
      { command: 'help', description: 'Get help' },
    ],
  },

  gamification: {
    enabled: true,
    experienceMultiplier: 1.0,
    referralBonusPercent: 10,
    maxDailyChallenges: 5,
    streakBonusEnabled: true,
  },

  aiAssistant: {
    enabled: true,
    defaultProvider: 'groq',
    maxConversationHistory: 50,
    capabilities: ['portfolio_analysis', 'strategy_suggestions', 'risk_explanation'],
    autoSuggestionsEnabled: true,
  },

  monetization: {
    subscriptionsEnabled: true,
    freeTrialDays: 7,
  },
});
```

## Events

Subscribe to Super App events:

```typescript
superApp.onEvent((event) => {
  switch (event.type) {
    case 'wallet:created':
      console.log('New wallet created:', event.data.walletId);
      break;
    case 'agent:started':
      console.log('Agent started:', event.data.agentId);
      break;
    case 'trade:executed':
      console.log('Trade executed:', event.data.tradeId);
      break;
    case 'achievement:unlocked':
      console.log('Achievement unlocked:', event.data.achievementId);
      break;
    case 'subscription:created':
      console.log('New subscription:', event.data.tier);
      break;
  }
});
```

## Health Check

Monitor the Super App health:

```typescript
const health = await superApp.getHealth();
console.log(`Overall: ${health.overall}`);
console.log('Components:', health.components);
// {
//   overall: 'healthy',
//   components: {
//     wallet: true,
//     agentDashboard: true,
//     social: true,
//     financial: true,
//     notifications: true,
//     telegram: true,
//     gamification: true,
//     aiAssistant: true,
//     monetization: true,
//   },
//   lastCheck: Date,
//   details: { enabled: true }
// }
```

## Architecture

The Super App follows a modular architecture:

```
src/superapp/
├── index.ts              # Unified entry point
├── types.ts              # Type definitions
├── wallet.ts             # Smart Wallet module
├── agent-dashboard.ts    # Agent Dashboard module
├── social.ts             # Social Layer module
├── financial-dashboard.ts # Financial Dashboard module
├── notifications.ts      # Notifications module
├── telegram.ts           # Telegram integration
├── gamification.ts       # Gamification module
├── ai-assistant.ts       # AI Assistant module
└── monetization.ts       # Monetization module
```

Each module:
- Has a Manager interface defining the public API
- Has a Default implementation class
- Exports a factory function (e.g., `createWalletManager()`)
- Emits events through a unified event system
- Can be used standalone or through `SuperAppService`

## Subscription Tiers

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Wallets | 1 | 3 | 10 | Unlimited |
| Agents | 1 | 5 | 20 | Unlimited |
| Strategies | 3 | 10 | 50 | Unlimited |
| Copy Trading | ❌ | ✅ | ✅ | ✅ |
| Advanced Analytics | ❌ | ❌ | ✅ | ✅ |
| AI Assistant | Basic | Full | Full | Priority |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

## Gamification Tiers

| Tier | XP Required | Benefits |
|------|-------------|----------|
| Bronze | 0 | Basic features |
| Silver | 1,000 | 5% fee discount |
| Gold | 5,000 | 10% fee discount, exclusive strategies |
| Platinum | 20,000 | 15% fee discount, priority support |
| Diamond | 50,000 | 20% fee discount, VIP access |

## API Reference

For detailed API documentation, see the TypeScript types in `src/superapp/types.ts`.

## License

MIT
