# TONAIAgent - Mobile-First UX Documentation

A comprehensive Telegram-native, mobile-first user experience framework for autonomous finance on The Open Network (TON).

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Components](#components)
   - [Onboarding](#onboarding)
   - [Conversational AI](#conversational-ai)
   - [Mini App Framework](#mini-app-framework)
   - [Visual Control](#visual-control)
   - [Notifications](#notifications)
   - [Performance](#performance)
   - [Personalization](#personalization)
   - [Accessibility](#accessibility)
   - [Security UX](#security-ux)
5. [Integration Guide](#integration-guide)
6. [Best Practices](#best-practices)
7. [API Reference](#api-reference)

---

## Overview

The Mobile UX module provides everything needed to build a Telegram-native experience for autonomous finance:

- **Ultra-Simple Onboarding**: Complete setup in under 2 minutes
- **Conversational AI Interface**: Natural language interaction powered by Groq
- **Telegram Mini App**: Rich UI with dashboards, analytics, and marketplace
- **Visual No-Code Builder**: Mobile-optimized strategy creation
- **Real-Time Feedback**: Notifications, alerts, and portfolio updates
- **Mobile Performance**: Optimized for low bandwidth and offline use
- **Personalization**: Adaptive UI for beginners to institutional users
- **Global Accessibility**: 16+ languages, RTL support, accessibility features
- **Security UX**: Biometric auth, risk warnings, anti-phishing

### Design Principles

1. **Mobile-First**: Every component designed for touch interfaces
2. **Telegram-Native**: Deep integration with Telegram's capabilities
3. **Accessibility**: Support for low-tech devices and emerging markets
4. **Security**: Clear confirmations and transparent risk warnings
5. **Personalization**: Adaptive experience based on user level

---

## Quick Start

### Installation

```typescript
import {
  createMobileUXManager,
  MobileUXManager,
} from '@tonaiagent/core/mobile-ux';
```

### Basic Usage

```typescript
// Create the Mobile UX Manager
const mobileUX = createMobileUXManager({
  onboarding: {
    aiAssisted: true,
  },
  conversation: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
  },
  accessibility: {
    defaultLanguage: 'en',
    autoDetect: true,
  },
});

// Initialize with Telegram Web App data
const initResult = await mobileUX.initialize(window.Telegram.WebApp.initData);

if (initResult.success) {
  if (initResult.needsOnboarding) {
    // Start onboarding flow
    const progress = await mobileUX.onboarding.startOnboarding(
      userId,
      telegramInitData
    );
  } else {
    // User is already onboarded
    mobileUX.navigate('dashboard');
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MobileUXManager                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Onboarding  │  │Conversation │  │  Mini App   │         │
│  │   Manager   │  │   Manager   │  │   Manager   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Visual    │  │Notification │  │ Performance │         │
│  │   Control   │  │   Manager   │  │   Manager   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │Personalize  │  │ Accessibility│  │ Security UX │         │
│  │   Manager   │  │   Manager   │  │   Manager   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Onboarding

Telegram-native onboarding with instant wallet creation and progressive setup.

#### Features

- **Social Login**: One-tap setup with Telegram
- **Instant Wallet**: Create wallet in seconds
- **Recovery Options**: Telegram Cloud, seed phrase, social recovery
- **AI Guidance**: Contextual help at every step
- **Progressive**: Required steps first, optional later

#### Usage

```typescript
const { createOnboardingManager } = require('@tonaiagent/core/mobile-ux');

const onboarding = createOnboardingManager({
  aiAssisted: true,
});

// Start onboarding
const progress = await onboarding.startOnboarding(userId, telegramData);

// Complete current step
await onboarding.completeStep(userId, { walletMethod: 'social' });

// Skip optional step
await onboarding.skipStep(userId);

// Get AI guidance
const guidance = await onboarding.getAIGuidance(userId);
```

#### Onboarding Flows

| Flow | Target | Max Time | Steps |
|------|--------|----------|-------|
| Beginner | New users | 2 min | Welcome → Wallet → Recovery → Profile → Tutorial → Complete |
| Advanced | Experienced | 1 min | Wallet Import → Recovery → Complete |
| Institutional | Organizations | 5 min | Welcome → Org Details → Treasury → Risk → Complete |

---

### Conversational AI

Natural language interface for agent interaction.

#### Features

- **Intent Detection**: Understands user goals automatically
- **Entity Extraction**: Parses tokens, amounts, percentages
- **Rich Responses**: Cards, charts, tables, quick replies
- **Command Execution**: Execute actions with confirmation
- **Context Awareness**: Maintains conversation state

#### Usage

```typescript
const { createConversationManager } = require('@tonaiagent/core/mobile-ux');

const conversation = createConversationManager({
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  intentDetection: true,
});

// Start conversation
const conversationId = conversation.startConversation(userId, userProfile);

// Send message
const response = await conversation.sendMessage(
  conversationId,
  'Create a DCA strategy for 100 TON weekly'
);

// Response includes:
// - text: AI response
// - richContent: Cards, charts, etc.
// - quickReplies: Suggested next actions
// - intent: Detected intent with confidence
// - actions: Buttons for confirmation
```

#### Supported Intents

| Intent | Example Phrases |
|--------|-----------------|
| `create_strategy` | "Create a yield strategy", "Set up DCA" |
| `view_portfolio` | "Show my portfolio", "What's my balance" |
| `swap_tokens` | "Swap 100 TON to USDT", "Buy NOT" |
| `stake_tokens` | "Stake 50 TON", "Start staking" |
| `set_alert` | "Alert me when TON hits $10" |
| `adjust_risk` | "Reduce my risk", "Make it more conservative" |

---

### Mini App Framework

Telegram Mini App with dashboards, navigation, and rich UI.

#### Features

- **Page Navigation**: Smooth routing with history
- **Dashboard Widgets**: Customizable layout
- **Modal System**: Full-screen, sheets, popups
- **Theme Integration**: Follows Telegram theme
- **Offline Support**: Works without connection

#### Usage

```typescript
const { createMiniAppManager } = require('@tonaiagent/core/mobile-ux');

const miniApp = createMiniAppManager({
  version: '1.0.0',
  offlineMode: true,
});

// Initialize
await miniApp.initialize(telegramInitData);

// Navigate
miniApp.navigate('portfolio');

// Open modal
miniApp.openModal({
  id: 'swap',
  title: 'Swap Tokens',
  type: 'sheet',
  component: 'swap_form',
});

// Show popup
const result = await miniApp.showConfirm('Are you sure?');

// Get navigation items
const navItems = miniApp.getNavigationItems();
```

#### Default Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Portfolio overview, quick actions |
| Portfolio | `/portfolio` | Holdings, performance charts |
| Strategies | `/strategies` | Active and available strategies |
| Marketplace | `/marketplace` | Strategy marketplace |
| Analytics | `/analytics` | Advanced analytics (intermediate+) |
| Settings | `/settings` | User preferences |

---

### Visual Control

Mobile-optimized visual strategy builder.

#### Features

- **Simplified Workflow**: Touch-friendly node editor
- **Pre-built Templates**: DCA, alerts, yield farming
- **Risk Controls**: Visual risk slider and limits
- **Validation**: Real-time feedback on workflow validity
- **Quick Builders**: One-tap strategy creation

#### Usage

```typescript
const { createVisualControlManager } = require('@tonaiagent/core/mobile-ux');

const visualControl = createVisualControlManager({
  enableGestures: true,
  maxNodes: 20,
});

// Get available templates
const triggers = visualControl.getTriggerTemplates();
const actions = visualControl.getActionTemplates();

// Create workflow
const workflow = visualControl.createWorkflow('My DCA Strategy');

// Add nodes
visualControl.addNode(workflowId, 'trigger', 'time_interval', {
  interval: 'daily',
});
visualControl.addNode(workflowId, 'action', 'swap', {
  fromToken: 'USDT',
  toToken: 'TON',
  amount: 100,
});

// Validate
const validation = visualControl.validateWorkflow(workflowId);

// Quick builders
const dcaWorkflow = visualControl.createDCAWorkflow({
  name: 'Daily TON DCA',
  fromToken: 'USDT',
  toToken: 'TON',
  amount: 50,
  interval: 'daily',
});
```

---

### Notifications

Real-time alerts and portfolio updates.

#### Features

- **Push Notifications**: Transaction, price, strategy alerts
- **Price Alerts**: Custom price thresholds
- **Portfolio Alerts**: Value change notifications
- **Toast Messages**: In-app feedback
- **Batching**: Group similar notifications

#### Usage

```typescript
const { createNotificationManager, createToastManager } = require('@tonaiagent/core/mobile-ux');

const notifications = createNotificationManager();
const toast = createToastManager();

// Initialize with user
notifications.initialize(userProfile);

// Create price alert
notifications.createPriceAlert('TON', 'above', 10);

// Create portfolio alert
notifications.createPortfolioAlert('loss', 5); // Alert on 5% loss

// Manual notification
notifications.notify('transaction_complete', {
  type: 'swap',
  amount: 100,
  token: 'TON',
});

// Toast messages
toast.success('Transaction confirmed!');
toast.error('Insufficient funds');
```

---

### Performance

Mobile optimization for speed and low bandwidth.

#### Features

- **Request Batching**: Combine API calls
- **Response Caching**: Reduce network usage
- **Image Optimization**: WebP, lazy loading
- **Memory Management**: Auto cleanup
- **Offline Mode**: IndexedDB caching

#### Usage

```typescript
const { createPerformanceManager } = require('@tonaiagent/core/mobile-ux');

const performance = createPerformanceManager({
  networkOptimization: {
    batchRequests: true,
    cacheResponses: true,
  },
  offlineSettings: {
    enabled: true,
    autoSync: true,
  },
});

// Initialize with device
performance.initialize(deviceInfo);

// Optimized request
const data = await performance.request('/api/portfolio', {
  priority: 'high',
  cacheKey: 'portfolio',
});

// Image optimization
const imageUrl = performance.getOptimizedImageUrl(originalUrl, {
  width: 400,
  quality: 80,
});

// Get metrics
const metrics = performance.getMetrics();
```

---

### Personalization

Adaptive UI based on user experience level.

#### Features

- **Level-Based UI**: Beginner → Advanced → Institutional
- **Behavior Learning**: Adapts to usage patterns
- **Recommendations**: Contextual suggestions
- **Dashboard Customization**: Per-user widgets
- **Level Progression**: Gamified advancement

#### Usage

```typescript
const { createPersonalizationManager } = require('@tonaiagent/core/mobile-ux');

const personalization = createPersonalizationManager({
  adaptiveUI: true,
  enableRecommendations: true,
  enableLearning: true,
});

// Set user profile
personalization.setUserProfile(userProfile);

// Get personalized UI
const ui = personalization.getPersonalizedUI(userId);
// Returns: widgets, quickActions, visibleFeatures, helpLevel

// Get recommendations
const recommendations = personalization.getRecommendations(userId);

// Track behavior
personalization.trackFeatureUsage(userId, 'swap');
personalization.trackTransaction(userId, true);

// Check level progress
const progress = personalization.getLevelProgress(userId);
```

---

### Accessibility

Multi-language support and accessibility features.

#### Features

- **16+ Languages**: Including RTL support
- **Currency Formatting**: Local formats
- **Accessibility**: High contrast, reduced motion, screen reader
- **Emerging Markets**: Low-bandwidth optimizations

#### Usage

```typescript
const { createAccessibilityManager } = require('@tonaiagent/core/mobile-ux');

const accessibility = createAccessibilityManager({
  defaultLanguage: 'en',
  autoDetect: true,
});

// Set language
accessibility.setLanguage('ru');

// Translate
const text = accessibility.t('nav.portfolio'); // "Портфель"

// Format numbers/currency
const formatted = accessibility.formatCurrency(1234.56, 'USD');
// "$1,234.56"

// Format date
const date = accessibility.formatDate(new Date(), 'medium');

// Accessibility settings
accessibility.updateAccessibilitySettings({
  highContrast: true,
  reducedMotion: true,
  largeText: true,
});

// Check RTL
if (accessibility.isRTL()) {
  // Apply RTL styles
}
```

#### Supported Languages

| Code | Language | Completeness |
|------|----------|--------------|
| en | English | 100% |
| ru | Russian | 100% |
| zh | Chinese | 95% |
| ko | Korean | 90% |
| es | Spanish | 90% |
| ja | Japanese | 85% |
| pt | Portuguese | 85% |
| de | German | 80% |
| fr | French | 80% |
| uk | Ukrainian | 75% |
| ar | Arabic (RTL) | 75% |
| hi | Hindi | 70% |
| id | Indonesian | 70% |
| vi | Vietnamese | 65% |
| th | Thai | 60% |
| tr | Turkish | 60% |

---

### Security UX

Clear confirmations, risk warnings, and anti-phishing.

#### Features

- **Risk Assessment**: Automatic transaction scoring
- **Biometric Auth**: Fingerprint, Face ID
- **Session Management**: Secure sessions with timeout
- **Anti-Phishing**: Code verification, URL checking
- **Clear Confirmations**: Explicit approval for risky actions

#### Usage

```typescript
const { createSecurityUXManager } = require('@tonaiagent/core/mobile-ux');

const security = createSecurityUXManager({
  biometric: {
    preferredType: 'fingerprint',
    fallbackToPin: true,
  },
  confirmationThreshold: 10, // TON
});

// Initialize
security.initialize(userProfile);

// Assess transaction risk
const risk = security.assessRisk({
  type: 'swap',
  amount: 500,
  token: 'TON',
  recipientAddress: '...',
  isContract: true,
  contractVerified: false,
  ...security.getUserSecurityContext(userId),
});

// risk.level: 'low' | 'medium' | 'high' | 'critical'
// risk.warnings: Security warnings to display
// risk.requiresBiometric: true/false

// Get confirmation config
const confirmConfig = security.getConfirmationConfig(context, risk);

// Authenticate
const authResult = await security.authenticateBiometric();

// Check for phishing
const phishingCheck = security.checkForPhishing(url);

// Set anti-phishing code
security.setAntiPhishingCode(userId, 'MYCODE123');
```

---

## Integration Guide

### With Telegram Bot

```typescript
import { createMobileUXManager } from '@tonaiagent/core/mobile-ux';
import { Bot } from 'grammy';

const bot = new Bot(process.env.BOT_TOKEN);
const mobileUX = createMobileUXManager();

// Handle /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from.id.toString();

  // Check if user needs onboarding
  const progress = mobileUX.onboarding.getProgress(userId);

  if (!progress) {
    // Start onboarding
    await mobileUX.onboarding.startOnboarding(userId, {
      user: {
        id: userId,
        first_name: ctx.from.first_name,
        language_code: ctx.from.language_code,
      },
      auth_date: Date.now(),
      hash: '',
    });

    await ctx.reply(
      mobileUX.t('onboarding.welcome'),
      {
        reply_markup: {
          inline_keyboard: [[
            { text: mobileUX.t('common.next'), callback_data: 'onboarding_next' }
          ]]
        }
      }
    );
  }
});

// Handle messages as conversation
bot.on('message:text', async (ctx) => {
  const conversationId = mobileUX.conversation.getOrCreateConversation(
    ctx.from.id.toString(),
    userProfile
  );

  const response = await mobileUX.conversation.sendMessage(
    conversationId,
    ctx.message.text
  );

  await ctx.reply(response.text);
});
```

### With Telegram Mini App (React)

```tsx
import React, { useEffect, useState } from 'react';
import { createMobileUXManager } from '@tonaiagent/core/mobile-ux';

const mobileUX = createMobileUXManager();

function App() {
  const [initialized, setInitialized] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function init() {
      const result = await mobileUX.initialize(
        // @ts-ignore
        window.Telegram.WebApp.initDataUnsafe
      );

      if (result.success) {
        setInitialized(true);
        setNeedsOnboarding(result.needsOnboarding);
      }
    }

    init();

    return () => mobileUX.cleanup();
  }, []);

  if (!initialized) {
    return <Loading />;
  }

  if (needsOnboarding) {
    return <OnboardingFlow mobileUX={mobileUX} />;
  }

  return <MainApp mobileUX={mobileUX} />;
}
```

---

## Best Practices

### 1. Always Initialize First

```typescript
const result = await mobileUX.initialize(telegramData);
if (!result.success) {
  // Handle error
}
```

### 2. Set User After Onboarding

```typescript
const completion = await mobileUX.onboarding.completeStep(userId);
if (completion.success) {
  mobileUX.setUser(completion.user);
}
```

### 3. Use Risk Assessment for Transactions

```typescript
const risk = mobileUX.security.assessRisk(transactionContext);
if (risk.requiresConfirmation) {
  const confirmed = await showConfirmationDialog(risk);
  if (!confirmed) return;
}
```

### 4. Handle Offline Gracefully

```typescript
const offlineStatus = mobileUX.performance.getOfflineStatus();
if (!offlineStatus.online) {
  mobileUX.toast.warning('You are offline. Changes will sync when connected.');
}
```

### 5. Track User Behavior for Personalization

```typescript
// Track feature usage
mobileUX.personalization.trackFeatureUsage(userId, 'swap');

// Track transactions
mobileUX.personalization.trackTransaction(userId, success);
```

### 6. Localize All User-Facing Text

```typescript
// Use translation keys
const message = mobileUX.t('error.insufficient_funds');

// Format currency
const formatted = mobileUX.formatCurrency(amount, 'USD');
```

---

## API Reference

### MobileUXManager

Main entry point for all mobile UX features.

```typescript
interface MobileUXManager {
  // Sub-managers
  onboarding: OnboardingManager;
  conversation: ConversationManager;
  miniApp: MiniAppManager;
  visualControl: VisualControlManager;
  notifications: NotificationManager;
  toast: ToastManager;
  performance: PerformanceManager;
  personalization: PersonalizationManager;
  accessibility: AccessibilityManager;
  security: SecurityUXManager;

  // Methods
  initialize(initData: TelegramWebAppInitData): Promise<MobileUXInitResult>;
  setUser(user: UserProfile): void;
  getUser(): UserProfile | undefined;
  isInitialized(): boolean;

  // Quick actions
  chat(message: string): Promise<{ text: string; quickReplies?: QuickReply[] }>;
  navigate(pageId: string): boolean;
  notify(type: 'success' | 'error' | 'warning' | 'info', message: string): void;
  t(key: string, params?: Record<string, unknown>): string;
  formatCurrency(value: number, currency?: string): string;
  getQuickActions(): QuickAction[];

  cleanup(): void;
}
```

For detailed API documentation of individual managers, see the TypeScript type definitions in `src/mobile-ux/types.ts`.

---

## Acceptance Criteria Checklist

- [x] Onboarding under 2 minutes
- [x] Conversational interface operational
- [x] Mobile performance optimized
- [x] Mini App fully functional
- [x] Localization ready (16+ languages)

---

## License

MIT License - see LICENSE file for details.
