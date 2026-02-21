# TONAIAgent - Payments and Commerce Layer

## Overview

The TON AI Payments and Commerce Layer is a comprehensive AI-native payments infrastructure that enables autonomous financial operations for AI agents, merchants, and users in the TON ecosystem.

The platform supports:
- Autonomous payments (scheduled, conditional, escrow)
- Smart subscriptions with AI optimization
- Intelligent spending management
- Merchant infrastructure
- Agent-driven commerce
- Cross-border payments
- Financial analytics
- Compliance and security

### Key Features

- **Payment Gateway**: Multi-currency support with TON, stablecoins, and Jettons
- **Subscription Engine**: Recurring billing with usage metering and AI optimization
- **Smart Spending**: Budget management with AI-powered recommendations
- **Merchant Platform**: SDK, checkout APIs, webhooks, and payouts
- **Agent Commerce**: Autonomous purchasing, negotiation, and procurement
- **Cross-Border**: International payments with route optimization
- **Analytics**: Real-time insights, forecasting, and anomaly detection
- **Compliance**: KYC/AML, fraud detection, and transaction monitoring

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Payment Gateway](#payment-gateway)
4. [Subscription Engine](#subscription-engine)
5. [Smart Spending](#smart-spending)
6. [Merchant Infrastructure](#merchant-infrastructure)
7. [Agent Commerce](#agent-commerce)
8. [Cross-Border Payments](#cross-border-payments)
9. [Analytics Engine](#analytics-engine)
10. [Compliance & Security](#compliance--security)
11. [Configuration](#configuration)
12. [API Reference](#api-reference)

---

## Quick Start

### Basic Usage

```typescript
import { createPaymentsManager } from '@tonaiagent/core/payments';

// Create the payments manager
const payments = createPaymentsManager({
  gateway: {
    enabled: true,
    supportedCurrencies: ['TON', 'USDT', 'USDC'],
  },
  subscriptions: {
    enabled: true,
    trialEnabled: true,
  },
  merchants: {
    enabled: true,
    verificationRequired: true,
  },
  agents: {
    enabled: true,
    maxAgentsPerUser: 10,
  },
});

// Process a payment
const payment = await payments.gateway.processPayment({
  senderId: 'user-1',
  recipientId: 'merchant-1',
  amount: BigInt('1000000000'), // 1 TON
  currency: 'TON',
  type: 'one_time',
  description: 'Product purchase',
});

// Create a subscription
const subscription = await payments.subscriptions.createSubscription({
  userId: 'user-1',
  planId: 'premium-monthly',
  paymentMethod: { type: 'ton_wallet', walletAddress: 'EQ...' },
});

// Configure an agent for autonomous commerce
const agent = await payments.agentCommerce.configureAgent({
  agentId: 'shopping-agent',
  ownerId: 'user-1',
  name: 'Shopping Assistant',
  type: 'shopping',
  capabilities: ['purchase', 'negotiation'],
});

// Get health status
const health = await payments.getHealth();
console.log('Payments health:', health.overall);
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Payments Manager                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Payment Gateway │  │   Subscription   │  │    Smart Spending        │   │
│  │                  │  │     Engine       │  │      Optimizer           │   │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬──────────────┘   │
│           │                     │                         │                  │
│  ┌────────▼─────────────────────▼─────────────────────────▼───────────────┐  │
│  │                        Merchant Infrastructure                          │  │
│  │              (SDK, Checkout, Products, Webhooks, Payouts)               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Agent Commerce  │  │   Cross-Border   │  │    Payment Analytics     │   │
│  │    Framework     │  │     Payments     │  │        Engine            │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │               Compliance & Security (KYC/AML, Fraud Detection)          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Purpose |
|-----------|---------|
| **Payment Gateway** | Core payment processing with multi-currency support |
| **Subscription Engine** | Recurring billing, usage metering, trials |
| **Smart Spending** | Budget management and AI optimization |
| **Merchant Infrastructure** | Full merchant platform with SDK and APIs |
| **Agent Commerce** | Autonomous purchasing and negotiation |
| **Cross-Border** | International payments and settlements |
| **Analytics** | Insights, trends, forecasting, anomaly detection |
| **Compliance** | KYC/AML, fraud detection, transaction monitoring |

---

## Payment Gateway

### Overview

The Payment Gateway handles all payment processing with support for multiple payment types, currencies, and advanced features like conditional and escrow payments.

### Features

- One-time, scheduled, and recurring payments
- Conditional payments with oracle integration
- Split payments for revenue sharing
- Escrow payments with release conditions
- Multi-signature authorization
- Fee calculation and audit trails

### Usage

```typescript
import { createPaymentGateway } from '@tonaiagent/core/payments';

const gateway = createPaymentGateway({
  supportedCurrencies: ['TON', 'USDT', 'USDC'],
  defaultCurrency: 'TON',
  maxPaymentAmount: BigInt('1000000000000'),
  minPaymentAmount: BigInt('100000000'),
});

// One-time payment
const payment = await gateway.processPayment({
  senderId: 'user-1',
  recipientId: 'merchant-1',
  amount: BigInt('5000000000'),
  currency: 'TON',
  type: 'one_time',
  description: 'Purchase',
});

// Scheduled payment
const scheduled = await gateway.schedulePayment({
  senderId: 'user-1',
  recipientId: 'merchant-1',
  amount: BigInt('1000000000'),
  currency: 'TON',
  scheduledDate: new Date('2026-03-01'),
  description: 'Future payment',
});

// Conditional payment
const conditional = await gateway.createConditionalPayment({
  senderId: 'user-1',
  recipientId: 'merchant-1',
  amount: BigInt('10000000000'),
  currency: 'TON',
  conditions: [
    { type: 'oracle', oracleAddress: 'EQ...', expectedValue: 'true' },
  ],
  expiresAt: new Date('2026-04-01'),
  description: 'Conditional release',
});

// Split payment
const split = await gateway.createSplitPayment({
  senderId: 'user-1',
  totalAmount: BigInt('10000000000'),
  currency: 'TON',
  recipients: [
    { recipientId: 'merchant-1', amount: BigInt('8000000000'), description: 'Main' },
    { recipientId: 'affiliate-1', amount: BigInt('2000000000'), description: 'Commission' },
  ],
  description: 'Purchase with affiliate commission',
});

// Escrow payment
const escrow = await gateway.createEscrowPayment({
  senderId: 'buyer-1',
  recipientId: 'seller-1',
  amount: BigInt('50000000000'),
  currency: 'TON',
  escrowAgent: 'escrow-service',
  releaseConditions: ['Goods delivered', 'Buyer confirms'],
  expiresAt: new Date('2026-04-15'),
  description: 'Escrow for high-value purchase',
});
```

### Payment Types

| Type | Description |
|------|-------------|
| `one_time` | Single immediate payment |
| `scheduled` | Payment scheduled for future date |
| `recurring` | Repeating payment (typically via subscriptions) |
| `conditional` | Payment released when conditions are met |
| `split` | Payment divided among multiple recipients |
| `escrow` | Funds held by escrow agent until release |

---

## Subscription Engine

### Overview

The Subscription Engine manages recurring billing with support for usage-based pricing, trials, and AI-powered optimization.

### Features

- Multiple billing cycles (daily, weekly, monthly, annual)
- Usage-based metering
- Trial period management
- Grace periods for failed payments
- Plan upgrades/downgrades
- AI-driven optimization suggestions

### Usage

```typescript
import { createSubscriptionEngine } from '@tonaiagent/core/payments';

const subscriptions = createSubscriptionEngine({
  trialEnabled: true,
  defaultTrialDays: 14,
  gracePeriodDays: 3,
});

// Create a subscription plan
const plan = await subscriptions.createPlan({
  name: 'Premium',
  description: 'Full access to all features',
  merchantId: 'merchant-1',
  billingCycle: 'monthly',
  basePrice: BigInt('10000000000'),
  currency: 'TON',
  features: ['Feature 1', 'Feature 2', 'Priority support'],
  trialDays: 14,
});

// Create a usage-based plan
const usagePlan = await subscriptions.createPlan({
  name: 'API Access',
  description: 'Pay per API call',
  merchantId: 'merchant-1',
  billingCycle: 'monthly',
  basePrice: BigInt('1000000000'),
  currency: 'TON',
  features: ['API access'],
  usageMetered: true,
  usageUnit: 'API calls',
  usageUnitPrice: BigInt('10000'),
});

// Subscribe a user
const subscription = await subscriptions.createSubscription({
  userId: 'user-1',
  planId: plan.id,
  paymentMethod: { type: 'ton_wallet', walletAddress: 'EQ...' },
});

// Record usage
await subscriptions.recordUsage({
  subscriptionId: subscription.subscription.id,
  quantity: 1000,
  description: 'API calls for today',
});

// Cancel subscription
await subscriptions.cancelSubscription(subscription.subscription.id, {
  immediately: false,
  reason: 'User requested',
});
```

---

## Smart Spending

### Overview

Smart Spending provides budget management and AI-powered spending optimization to help users manage their finances effectively.

### Features

- Budget creation with category limits
- Spending rules and limits
- Real-time payment analysis
- AI-powered recommendations
- Spending forecasts and alerts

### Usage

```typescript
import { createSmartSpendingManager } from '@tonaiagent/core/payments';

const spending = createSmartSpendingManager({
  aiOptimizationEnabled: true,
  alertsEnabled: true,
});

// Create a budget
const budget = await spending.createBudget({
  userId: 'user-1',
  name: 'Monthly Budget',
  totalAmount: BigInt('100000000000'),
  currency: 'TON',
  period: 'monthly',
  categories: [
    { name: 'Shopping', limit: BigInt('30000000000'), priority: 1 },
    { name: 'Services', limit: BigInt('40000000000'), priority: 2 },
    { name: 'Other', limit: BigInt('30000000000'), priority: 3 },
  ],
});

// Create spending rules
const rule = await spending.createSpendingRule({
  userId: 'user-1',
  name: 'Daily limit',
  type: 'max_daily',
  conditions: { maxAmount: BigInt('10000000000') },
  action: 'warn',
  enabled: true,
});

// Analyze a payment before processing
const analysis = await spending.analyzePayment({
  userId: 'user-1',
  amount: BigInt('5000000000'),
  currency: 'TON',
  recipientId: 'merchant-1',
  category: 'Shopping',
});

if (analysis.allowed) {
  // Process the payment
} else {
  console.log('Payment blocked:', analysis.blockedBy);
}

// Get spending analytics
const analytics = await spending.getSpendingAnalytics('user-1', {
  start: new Date('2026-01-01'),
  end: new Date(),
});

// Get optimization suggestions
const optimizations = await spending.getOptimizations('user-1');
```

---

## Merchant Infrastructure

### Overview

The Merchant Infrastructure provides a complete platform for merchants to accept payments, manage products, and track revenue.

### Features

- Merchant registration and verification
- Checkout session creation
- Product catalog management
- Webhook integrations
- API key management
- Payout scheduling
- Revenue analytics

### Usage

```typescript
import { createMerchantInfrastructure } from '@tonaiagent/core/payments';

const merchants = createMerchantInfrastructure({
  verificationRequired: true,
  payoutSchedule: 'weekly',
});

// Register a merchant
const merchant = await merchants.registerMerchant({
  name: 'My Store',
  businessType: 'online_retail',
  contactEmail: 'contact@mystore.com',
  walletAddress: 'EQ...',
  description: 'Best products online',
});

// Verify merchant (admin)
await merchants.verifyMerchant(merchant.id, {
  verifiedBy: 'admin-1',
  documents: ['business_license', 'id_document'],
});

// Create products
const product = await merchants.createProduct({
  merchantId: merchant.id,
  name: 'Premium Course',
  description: 'Learn to build on TON',
  type: 'digital',
  price: BigInt('50000000000'),
  currency: 'TON',
});

// Create checkout session
const checkout = await merchants.createCheckout({
  merchantId: merchant.id,
  items: [
    { productId: product.id, quantity: 1 },
  ],
  currency: 'TON',
  successUrl: 'https://mystore.com/success',
  cancelUrl: 'https://mystore.com/cancel',
});

// Create webhook
const webhook = await merchants.createWebhook({
  merchantId: merchant.id,
  url: 'https://mystore.com/webhook',
  events: ['payment.completed', 'subscription.created', 'refund.processed'],
});

// Get API keys
const apiKey = await merchants.createApiKey({
  merchantId: merchant.id,
  name: 'Production API',
  permissions: ['read', 'write'],
});

// Get analytics
const analytics = await merchants.getMerchantAnalytics(merchant.id, {
  start: new Date('2026-01-01'),
  end: new Date(),
});

// Request payout
const payout = await merchants.requestPayout({
  merchantId: merchant.id,
  amount: BigInt('100000000000'),
  currency: 'TON',
});
```

---

## Agent Commerce

### Overview

Agent Commerce enables AI agents to make autonomous purchases, negotiate prices, and manage procurement workflows on behalf of users.

### Features

- Agent configuration and authorization
- Spending limits and category restrictions
- Autonomous purchasing
- Price negotiation
- Procurement workflows
- Vendor management
- Performance tracking

### Usage

```typescript
import { createAgentCommerceManager } from '@tonaiagent/core/payments';

const agentCommerce = createAgentCommerceManager({
  maxAgentsPerUser: 10,
  defaultSpendingLimit: BigInt('100000000000'),
});

// Configure an agent
const agent = await agentCommerce.configureAgent({
  agentId: 'shopping-agent-1',
  ownerId: 'user-1',
  name: 'Smart Shopper',
  type: 'shopping',
  capabilities: ['price_comparison', 'purchase', 'negotiation'],
});

// Grant authorization
const auth = await agentCommerce.grantAuthorization({
  agentId: agent.id,
  ownerId: 'user-1',
  spendingLimit: BigInt('50000000000'),
  allowedCategories: ['electronics', 'software', 'books'],
  allowedMerchants: ['merchant-1', 'merchant-2'],
  expiresAt: new Date('2026-12-31'),
});

// Authorize a payment
const paymentAuth = await agentCommerce.authorizePayment({
  agentId: agent.id,
  amount: BigInt('10000000000'),
  currency: 'TON',
  recipientId: 'merchant-1',
  category: 'electronics',
  description: 'Purchase wireless headphones',
});

if (paymentAuth.authorized) {
  // Process the payment using the gateway
}

// Initiate negotiation
const negotiation = await agentCommerce.initiateNegotiation({
  agentId: agent.id,
  vendorId: 'vendor-1',
  itemId: 'item-123',
  initialPrice: BigInt('100000000000'),
  targetPrice: BigInt('80000000000'),
  currency: 'TON',
  strategy: 'balanced',
  maxRounds: 5,
});

// Start procurement
const procurement = await agentCommerce.startProcurement({
  agentId: agent.id,
  requirements: {
    category: 'office_supplies',
    items: [
      { name: 'Laptop', quantity: 10, maxPricePerUnit: BigInt('50000000000') },
    ],
  },
  budget: BigInt('500000000000'),
  deadline: new Date('2026-03-15'),
});

// Register a vendor
const vendor = await agentCommerce.registerVendor({
  name: 'Tech Supplies Co',
  type: 'supplier',
  categories: ['electronics', 'software'],
  contactInfo: { email: 'sales@techsupplies.com' },
  apiEndpoint: 'https://api.techsupplies.com',
});

// Get agent performance
const performance = await agentCommerce.getAgentPerformance(agent.id);
console.log('Success rate:', performance.successRate);
console.log('Savings achieved:', performance.totalSavings);
```

---

## Cross-Border Payments

### Overview

Cross-Border Payments enables international transactions with optimal routing, currency conversion, and compliance handling.

### Features

- Payment corridors with fee structures
- Exchange rate providers
- Route optimization
- Settlement management
- Compliance checks per corridor
- Analytics per corridor

### Usage

```typescript
import { createCrossBorderPaymentsManager } from '@tonaiagent/core/payments';

const crossBorder = createCrossBorderPaymentsManager({
  supportedCorridors: ['US-EU', 'EU-ASIA', 'ASIA-LATAM'],
  defaultSettlementTime: 24,
});

// Create a payment corridor
const corridor = await crossBorder.createCorridor({
  name: 'US to Europe',
  sourceRegion: 'US',
  targetRegion: 'EU',
  sourceCurrencies: ['USD', 'USDC'],
  targetCurrencies: ['EUR', 'USDT'],
  feeStructure: {
    fixedFee: BigInt('1000000'),
    percentageFee: 0.5,
    minFee: BigInt('500000'),
    maxFee: BigInt('100000000'),
  },
  settlementTime: 24,
  complianceRequirements: ['kyc_basic', 'aml_check'],
});

// Register exchange rate provider
const provider = await crossBorder.registerRateProvider({
  name: 'Market Rates',
  type: 'market',
  endpoint: 'https://api.marketrates.com',
  supportedPairs: ['TON/USD', 'TON/EUR', 'USD/EUR'],
  updateFrequency: 60,
});

// Get exchange rate
const rate = await crossBorder.getExchangeRate({
  sourceCurrency: 'USD',
  targetCurrency: 'EUR',
  amount: BigInt('100000000000'),
});

// Optimize route
const route = await crossBorder.optimizeRoute({
  sourceAmount: BigInt('100000000000'),
  sourceCurrency: 'USD',
  targetCurrency: 'EUR',
  priority: 'cost', // or 'speed' or 'balanced'
});

// Initiate cross-border payment
const payment = await crossBorder.initiateCrossBorderPayment({
  senderId: 'user-us',
  recipientId: 'user-eu',
  sourceAmount: BigInt('100000000000'),
  sourceCurrency: 'USD',
  targetCurrency: 'EUR',
  corridorId: corridor.id,
  purpose: 'business_payment',
  metadata: {
    invoiceNumber: 'INV-2026-001',
  },
});

// Track settlement
const settlement = await crossBorder.getSettlementStatus(payment.payment.id);

// Get corridor analytics
const analytics = await crossBorder.getCorridorAnalytics(corridor.id, {
  start: new Date('2026-01-01'),
  end: new Date(),
});
```

---

## Analytics Engine

### Overview

The Analytics Engine provides comprehensive insights into payment data with trend analysis, pattern detection, anomaly detection, and forecasting.

### Features

- Core analytics (volume, counts, averages)
- Trend analysis
- Pattern detection (recurring, seasonal, behavioral)
- Anomaly detection
- Forecasting
- Insight generation
- Report generation
- Entity comparison

### Usage

```typescript
import { createPaymentAnalyticsEngine } from '@tonaiagent/core/payments';

const analytics = createPaymentAnalyticsEngine({
  retentionDays: 365,
  anomalyDetectionEnabled: true,
});

// Get core analytics
const coreAnalytics = await analytics.getCoreAnalytics({
  entityId: 'merchant-1',
  entityType: 'merchant',
  timeframe: {
    start: new Date('2026-01-01'),
    end: new Date(),
  },
  granularity: 'daily',
});

// Analyze trends
const trends = await analytics.analyzeTrends({
  entityId: 'merchant-1',
  entityType: 'merchant',
  metric: 'revenue',
  timeframe: {
    start: new Date('2025-01-01'),
    end: new Date(),
  },
});

// Detect patterns
const patterns = await analytics.detectPatterns({
  entityId: 'user-1',
  entityType: 'user',
  patternTypes: ['recurring', 'seasonal', 'behavioral'],
});

// Detect anomalies
const anomalies = await analytics.detectAnomalies({
  entityId: 'merchant-1',
  entityType: 'merchant',
  timeframe: {
    start: new Date('2026-02-01'),
    end: new Date(),
  },
  sensitivity: 'medium',
});

// Generate forecast
const forecast = await analytics.generateForecast({
  entityId: 'merchant-1',
  entityType: 'merchant',
  metric: 'revenue',
  horizonDays: 30,
});

// Get insights
const insights = await analytics.generateInsights({
  entityId: 'user-1',
  entityType: 'user',
  insightTypes: ['optimization', 'risk', 'opportunity'],
});

// Generate report
const report = await analytics.generateReport({
  entityId: 'merchant-1',
  entityType: 'merchant',
  reportType: 'monthly',
  timeframe: {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
  },
  format: 'json',
});

// Compare entities
const comparison = await analytics.compareEntities({
  entities: [
    { entityId: 'merchant-1', entityType: 'merchant' },
    { entityId: 'merchant-2', entityType: 'merchant' },
  ],
  metrics: ['revenue', 'transactions', 'average_order'],
  timeframe: {
    start: new Date('2026-01-01'),
    end: new Date(),
  },
});
```

---

## Compliance & Security

### Overview

The Compliance & Security module ensures all transactions meet regulatory requirements with KYC/AML, fraud detection, and transaction monitoring.

### Features

- KYC verification (basic, enhanced, full)
- AML screening
- Sanctions list checking
- Velocity checks
- Fraud detection with ML scoring
- Transaction monitoring
- Policy management
- Risk profiling
- Compliance reporting

### Usage

```typescript
import { createComplianceSecurityManager } from '@tonaiagent/core/payments';

const compliance = createComplianceSecurityManager({
  kycRequired: true,
  amlEnabled: true,
  fraudDetectionEnabled: true,
});

// Initiate KYC
const kycSession = await compliance.initiateKYC({
  userId: 'user-1',
  level: 'enhanced',
  documents: [
    { type: 'passport', documentId: 'doc-1' },
    { type: 'proof_of_address', documentId: 'doc-2' },
  ],
});

// Complete KYC
const kycResult = await compliance.completeKYC(kycSession.sessionId, {
  verified: true,
  verifiedBy: 'verification-service',
});

// Perform AML screening
const amlResult = await compliance.screenAML({
  userId: 'user-1',
  transactionId: 'tx-1',
  amount: BigInt('100000000000'),
  currency: 'TON',
  counterpartyId: 'merchant-1',
});

// Check sanctions
const sanctionsResult = await compliance.checkSanctions({
  entityId: 'user-1',
  entityType: 'individual',
  entityName: 'John Doe',
  country: 'US',
});

// Check velocity
const velocityResult = await compliance.checkVelocity({
  userId: 'user-1',
  transactionAmount: BigInt('50000000000'),
  currency: 'TON',
  timeWindowHours: 24,
});

// Check for fraud
const fraudResult = await compliance.checkFraud({
  transactionId: 'tx-1',
  userId: 'user-1',
  transactionType: 'payment',
  amount: BigInt('10000000000'),
  currency: 'TON',
  metadata: {
    ipAddress: '192.168.1.1',
    deviceId: 'device-1',
    userAgent: 'Mozilla/5.0...',
  },
});

if (fraudResult.decision === 'block') {
  // Block the transaction
}

// Start transaction monitoring
const monitoring = await compliance.startMonitoring({
  entityId: 'merchant-1',
  entityType: 'merchant',
  rules: ['large_transaction', 'unusual_pattern', 'velocity_spike'],
  alertThreshold: 'high',
});

// Create compliance policy
const policy = await compliance.createPolicy({
  name: 'High Value Review',
  type: 'transaction_limit',
  rules: [
    { condition: 'amount > 100000000000', action: 'manual_review' },
  ],
  enabled: true,
});

// Get risk profile
const riskProfile = await compliance.getRiskProfile({
  entityId: 'user-1',
  entityType: 'user',
});

// Generate compliance report
const report = await compliance.generateComplianceReport({
  reportType: 'monthly',
  timeframe: {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
  },
  includeDetails: true,
});
```

---

## Configuration

### Full Configuration Example

```typescript
import { createPaymentsManager, PaymentsConfig } from '@tonaiagent/core/payments';

const config: PaymentsConfig = {
  // Payment Gateway Configuration
  gateway: {
    enabled: true,
    supportedCurrencies: ['TON', 'USDT', 'USDC', 'NOT'],
    defaultCurrency: 'TON',
    maxPaymentAmount: BigInt('1000000000000'),
    minPaymentAmount: BigInt('100000000'),
    feeStructure: {
      fixedFee: BigInt('1000000'),
      percentageFee: 0.1,
    },
  },

  // Subscription Configuration
  subscriptions: {
    enabled: true,
    trialEnabled: true,
    defaultTrialDays: 14,
    gracePeriodDays: 3,
    maxSubscriptionsPerUser: 10,
  },

  // Smart Spending Configuration
  smartSpending: {
    enabled: true,
    aiOptimizationEnabled: true,
    alertsEnabled: true,
    defaultAlertThreshold: 0.8,
  },

  // Merchant Configuration
  merchants: {
    enabled: true,
    verificationRequired: true,
    payoutSchedule: 'weekly',
    minPayoutAmount: BigInt('10000000000'),
  },

  // Agent Commerce Configuration
  agents: {
    enabled: true,
    maxAgentsPerUser: 10,
    defaultSpendingLimit: BigInt('100000000000'),
    negotiationEnabled: true,
    procurementEnabled: true,
  },

  // Cross-Border Configuration
  crossBorder: {
    enabled: true,
    supportedCorridors: ['US-EU', 'EU-ASIA', 'ASIA-LATAM'],
    defaultSettlementTime: 24,
    complianceRequired: true,
  },

  // Analytics Configuration
  analytics: {
    enabled: true,
    retentionDays: 365,
    anomalyDetectionEnabled: true,
    forecastingEnabled: true,
  },

  // Security Configuration
  security: {
    enabled: true,
    kycRequired: true,
    amlEnabled: true,
    fraudDetectionEnabled: true,
    transactionMonitoringEnabled: true,
  },
};

const payments = createPaymentsManager(config);
```

---

## API Reference

### PaymentsManager

| Method | Description |
|--------|-------------|
| `getHealth()` | Get health status of all components |
| `getStats()` | Get aggregate statistics |
| `onEvent(callback)` | Subscribe to all payment events |

### PaymentGateway

| Method | Description |
|--------|-------------|
| `processPayment(params)` | Process a one-time payment |
| `schedulePayment(params)` | Schedule a future payment |
| `createConditionalPayment(params)` | Create a conditional payment |
| `createSplitPayment(params)` | Create a split payment |
| `createEscrowPayment(params)` | Create an escrow payment |
| `getPayment(id)` | Get payment by ID |
| `getUserPayments(userId)` | Get user's payments |
| `cancelPayment(id)` | Cancel a pending payment |
| `refundPayment(id, params)` | Refund a completed payment |

### SubscriptionEngine

| Method | Description |
|--------|-------------|
| `createPlan(params)` | Create a subscription plan |
| `updatePlan(id, params)` | Update a plan |
| `createSubscription(params)` | Create a subscription |
| `cancelSubscription(id, params)` | Cancel a subscription |
| `pauseSubscription(id)` | Pause a subscription |
| `resumeSubscription(id)` | Resume a subscription |
| `recordUsage(params)` | Record usage for metered subscriptions |
| `processBilling(subscriptionId)` | Process billing for a subscription |

### SmartSpendingManager

| Method | Description |
|--------|-------------|
| `createBudget(params)` | Create a budget |
| `updateBudget(id, params)` | Update a budget |
| `createSpendingRule(params)` | Create a spending rule |
| `analyzePayment(params)` | Analyze a payment request |
| `getSpendingAnalytics(userId, timeframe)` | Get spending analytics |
| `getOptimizations(userId)` | Get optimization suggestions |

### MerchantInfrastructure

| Method | Description |
|--------|-------------|
| `registerMerchant(params)` | Register a new merchant |
| `verifyMerchant(id, params)` | Verify a merchant |
| `createCheckout(params)` | Create a checkout session |
| `createProduct(params)` | Create a product |
| `createWebhook(params)` | Create a webhook |
| `createApiKey(params)` | Create an API key |
| `requestPayout(params)` | Request a payout |

### AgentCommerceManager

| Method | Description |
|--------|-------------|
| `configureAgent(params)` | Configure an agent |
| `grantAuthorization(params)` | Grant spending authorization |
| `authorizePayment(params)` | Authorize a payment |
| `initiateNegotiation(params)` | Start price negotiation |
| `startProcurement(params)` | Start procurement workflow |
| `registerVendor(params)` | Register a vendor |
| `getAgentPerformance(agentId)` | Get agent performance metrics |

### CrossBorderPaymentsManager

| Method | Description |
|--------|-------------|
| `createCorridor(params)` | Create a payment corridor |
| `registerRateProvider(params)` | Register an exchange rate provider |
| `getExchangeRate(params)` | Get exchange rate |
| `optimizeRoute(params)` | Find optimal payment route |
| `initiateCrossBorderPayment(params)` | Initiate a cross-border payment |
| `getSettlementStatus(paymentId)` | Get settlement status |

### PaymentAnalyticsEngine

| Method | Description |
|--------|-------------|
| `getCoreAnalytics(params)` | Get core analytics |
| `analyzeTrends(params)` | Analyze trends |
| `detectPatterns(params)` | Detect patterns |
| `detectAnomalies(params)` | Detect anomalies |
| `generateForecast(params)` | Generate forecast |
| `generateInsights(params)` | Generate insights |
| `generateReport(params)` | Generate report |
| `compareEntities(params)` | Compare entities |

### ComplianceSecurityManager

| Method | Description |
|--------|-------------|
| `initiateKYC(params)` | Initiate KYC verification |
| `completeKYC(sessionId, params)` | Complete KYC |
| `screenAML(params)` | Perform AML screening |
| `checkSanctions(params)` | Check sanctions list |
| `checkVelocity(params)` | Perform velocity check |
| `checkFraud(params)` | Perform fraud check |
| `startMonitoring(params)` | Start transaction monitoring |
| `createPolicy(params)` | Create compliance policy |
| `evaluatePolicy(params)` | Evaluate transaction against policies |
| `getRiskProfile(params)` | Get entity risk profile |
| `generateComplianceReport(params)` | Generate compliance report |

---

## Events

The Payments module emits events for all significant operations:

| Event | Description |
|-------|-------------|
| `payment_initiated` | Payment processing started |
| `payment_completed` | Payment successfully processed |
| `payment_failed` | Payment processing failed |
| `subscription_created` | New subscription created |
| `subscription_cancelled` | Subscription cancelled |
| `subscription_billing_due` | Billing is due for subscription |
| `merchant_registered` | New merchant registered |
| `merchant_verified` | Merchant verified |
| `agent_configured` | Agent configured |
| `agent_payment_authorized` | Agent payment authorized |
| `cross_border_initiated` | Cross-border payment initiated |
| `settlement_completed` | Settlement completed |
| `fraud_detected` | Potential fraud detected |
| `kyc_completed` | KYC verification completed |
| `analytics_recorded` | Analytics event recorded |

---

## Best Practices

1. **Always verify merchants** before allowing them to create checkout sessions
2. **Set appropriate spending limits** for agents to prevent unauthorized spending
3. **Enable fraud detection** for all production deployments
4. **Use webhooks** to receive real-time notifications of payment events
5. **Implement retry logic** for failed payments using the grace period
6. **Monitor analytics** to detect unusual patterns early
7. **Keep KYC information up to date** for compliance
8. **Use escrow payments** for high-value transactions between unknown parties
9. **Optimize cross-border routes** based on your priority (cost vs. speed)
10. **Review compliance reports** regularly for regulatory adherence
