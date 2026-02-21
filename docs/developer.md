# TONAIAgent - Enterprise SDK & Developer Platform

Production-grade SDK and developer platform for building, extending, and integrating autonomous AI agents on the TON blockchain.

## Overview

The TONAIAgent SDK provides a comprehensive toolkit for developers to:

- **Build Agents**: Create autonomous trading, portfolio, and strategy agents
- **Deploy Strategies**: Deploy and manage automated trading strategies
- **Extend Functionality**: Build plugins and extensions with data sources, signals, and integrations
- **Test Safely**: Use sandbox environments for backtesting and simulation
- **Monitor & Optimize**: Real-time monitoring, metrics, and observability

## Quick Start

### Installation

```bash
npm install @tonaiagent/core
```

### Basic Usage

```typescript
import { createSDK } from '@tonaiagent/core/sdk';

// Initialize SDK
const sdk = createSDK({
  apiKey: process.env.TONAIAGENT_API_KEY,
  environment: 'sandbox', // Use 'production' for live trading
});

await sdk.initialize();

// Create an agent
const agent = await sdk.createAgent({
  name: 'My Trading Agent',
  type: 'trading',
  userId: 'user_123',
  aiConfig: {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    systemPrompt: 'You are a helpful trading assistant...',
  },
});

// Start the agent
await sdk.startAgent(agent.id);

console.log('Agent started:', agent);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TONAIAgent SDK                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   SDK Client     │  │   Extension      │  │    Sandbox           │  │
│  │                  │  │   Registry       │  │    Environment       │  │
│  │  - Agents        │  │                  │  │                      │  │
│  │  - Strategies    │  │  - Data Sources  │  │  - Backtesting       │  │
│  │  - Executions    │  │  - Signals       │  │  - Paper Trading     │  │
│  │  - Webhooks      │  │  - Integrations  │  │  - Simulation        │  │
│  │  - Monitoring    │  │  - Custom Funcs  │  │  - Performance       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           Developer APIs                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │   REST   │  │ Webhooks │  │  Events  │  │  Rate Limiting       │   │
│  │   API    │  │          │  │          │  │  & Authentication    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## SDK Client

The SDK Client provides a unified interface for all platform operations.

### Configuration

```typescript
import { createSDK, SDKConfig } from '@tonaiagent/core/sdk';

const config: SDKConfig = {
  // Authentication
  apiKey: 'your-api-key',

  // Environment: 'production' | 'sandbox' | 'development'
  environment: 'sandbox',

  // Custom base URL (optional)
  baseUrl: 'https://api.tonaiagent.com',

  // Request timeout (default: 30000ms)
  timeoutMs: 30000,

  // Enable debug logging
  debug: true,

  // Retry configuration
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },

  // Rate limiting
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerSecond: 10,
  },

  // Event handler
  onEvent: (event) => {
    console.log(`[${event.type}]`, event.data);
  },
};

const sdk = createSDK(config);
await sdk.initialize();
```

### Agent Management

```typescript
// Create agent
const agent = await sdk.createAgent({
  name: 'Portfolio Manager',
  type: 'portfolio',
  userId: 'user_123',
  description: 'Manages diversified portfolio allocation',

  aiConfig: {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: `You are an expert portfolio manager...`,
  },

  strategyConfig: {
    intervalMs: 60000, // Check every minute
    triggers: [
      { type: 'price', condition: 'change_percent > 5', value: 5 },
      { type: 'time', condition: 'daily', value: '09:00' },
    ],
  },

  riskConfig: {
    maxPositionSize: 1000,
    maxDailyLoss: 100,
    stopLossPercent: 5,
    takeProfitPercent: 10,
    circuitBreakerEnabled: true,
  },

  executionConfig: {
    maxConcurrentOps: 5,
    timeoutMs: 30000,
    requireConfirmation: true,
    confirmationThreshold: 100,
  },

  monitoringConfig: {
    metricsEnabled: true,
    alertsEnabled: true,
    alertChannels: [
      { type: 'telegram', config: { chatId: '123456' } },
    ],
  },

  tags: ['portfolio', 'conservative'],
});

// List agents
const agents = await sdk.listAgents({
  page: 1,
  pageSize: 20,
  status: 'running',
  type: 'trading',
});

// Get agent details
const agentDetails = await sdk.getAgent(agent.id);

// Update agent
const updated = await sdk.updateAgent(agent.id, {
  riskConfig: { maxDailyLoss: 200 },
});

// Control agent lifecycle
await sdk.startAgent(agent.id);
await sdk.pauseAgent(agent.id);
await sdk.resumeAgent(agent.id);
await sdk.stopAgent(agent.id);

// Delete agent
await sdk.deleteAgent(agent.id);
```

### Strategy Deployment

```typescript
// Deploy a strategy
const strategy = await sdk.deployStrategy({
  name: 'DCA TON Strategy',
  description: 'Dollar-cost averaging into TON',
  version: '1.0.0',
  author: { id: 'user_123', name: 'Developer' },
  type: 'dca',
  category: 'trading',

  parameters: [
    {
      name: 'amount',
      type: 'number',
      description: 'Amount to invest per interval',
      required: true,
      min: 1,
      max: 10000,
    },
    {
      name: 'interval',
      type: 'string',
      description: 'Investment interval',
      required: true,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily',
    },
  ],

  entryConditions: [
    { id: 'time', type: 'time', operator: 'eq', value: 'scheduled' },
  ],

  riskRules: [
    { id: 'maxInvestment', type: 'position-limit', parameters: { max: 10000 } },
  ],

  isPublic: false,
  minCapital: 100,
  riskLevel: 'low',
  tags: ['dca', 'beginner-friendly'],
});

// Assign strategy to agent
await sdk.assignStrategy(agent.id, strategy.id);

// List strategies
const strategies = await sdk.listStrategies({
  category: 'trading',
  type: 'dca',
});
```

### Execution

```typescript
// Execute an operation
const result = await sdk.execute({
  agentId: agent.id,
  operation: 'trade',
  parameters: {
    asset: 'TON',
    amount: 10,
    side: 'buy',
    price: 5.5, // Optional limit price
  },
  priority: 'normal',
  requireConfirmation: false,
  idempotencyKey: 'unique-key-123',
});

console.log('Execution result:', result);
// {
//   id: 'exec_123',
//   status: 'completed',
//   txHash: '0x...',
//   gasUsed: 21000,
//   metrics: {
//     executionTimeMs: 150,
//     totalTimeMs: 200,
//   },
// }

// Get execution status
const status = await sdk.getExecution(result.id);

// List executions
const executions = await sdk.listExecutions(agent.id, {
  status: 'completed',
  dateFrom: new Date('2024-01-01'),
});

// Cancel pending execution
await sdk.cancelExecution('exec_456');
```

### Webhooks

```typescript
// Create webhook
const webhook = await sdk.createWebhook({
  url: 'https://your-server.com/webhook',
  events: [
    'agent:started',
    'agent:stopped',
    'strategy:executed',
    'strategy:error',
  ],
  secret: 'your-webhook-secret',
  active: true,
  headers: {
    'X-Custom-Header': 'value',
  },
});

// List webhooks
const webhooks = await sdk.listWebhooks();

// Update webhook
await sdk.updateWebhook(webhook.id, {
  events: ['agent:error', 'strategy:error'],
});

// Get delivery history
const deliveries = await sdk.getWebhookDeliveries(webhook.id);

// Delete webhook
await sdk.deleteWebhook(webhook.id);
```

## Extension Framework

Build custom extensions to add data sources, signals, integrations, and functionality.

### Creating an Extension

```typescript
import {
  createExtensionRegistry,
  ExtensionManifest,
  ExtensionHandler,
} from '@tonaiagent/core/sdk';

// Define extension manifest
const manifest: ExtensionManifest = {
  id: 'my-price-feed',
  name: 'Custom Price Feed',
  version: '1.0.0',
  description: 'Provides real-time price data from custom source',
  author: { name: 'Developer', email: 'dev@example.com' },
  type: 'data-source',
  category: 'market-data',

  permissions: [
    {
      scope: 'network:outbound',
      reason: 'Fetch price data from external API',
      required: true,
    },
  ],

  capabilities: {
    dataSources: [
      {
        name: 'custom_price',
        description: 'Real-time price feed',
        dataType: 'price',
        refreshInterval: 1000,
      },
    ],
    functions: [
      {
        name: 'getPrice',
        description: 'Get current price for an asset',
        parameters: {
          type: 'object',
          properties: {
            asset: { type: 'string', description: 'Asset symbol' },
          },
          required: ['asset'],
        },
        returns: {
          type: 'object',
          properties: {
            price: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    ],
  },

  keywords: ['price', 'market-data', 'real-time'],
  license: 'MIT',
};

// Implement handlers
const handlers: Record<string, ExtensionHandler> = {
  getPrice: async (params, context) => {
    const { asset } = params as { asset: string };

    context.logger.info(`Fetching price for ${asset}`);

    // Fetch from external API
    const response = await context.http.get(
      `https://api.example.com/price/${asset}`
    );

    // Cache result
    await context.storage.set(`price:${asset}`, response.data);

    return {
      price: response.data.price,
      timestamp: new Date().toISOString(),
    };
  },
};

// Create registry and install extension
const registry = createExtensionRegistry({
  onEvent: (event) => console.log('Extension event:', event),
});

await registry.install(manifest, handlers, {
  activateImmediately: true,
  config: {
    apiEndpoint: 'https://api.example.com',
  },
});

// Execute extension function
const price = await registry.execute(
  'my-price-feed',
  'getPrice',
  { asset: 'TON' },
  'user_123'
);

console.log('Price:', price);
```

### Extension Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `data-source` | Provides market data | Price feeds, on-chain data, social sentiment |
| `signal-provider` | Generates trading signals | Technical indicators, AI predictions |
| `strategy` | Implements trading logic | Custom strategies, algorithms |
| `integration` | External service integration | Exchange APIs, notification services |
| `analytics` | Analysis and reporting | Performance tracking, risk analysis |
| `notification` | Alert delivery | Telegram, email, Slack notifications |
| `custom` | Custom functionality | Any other use case |

### Extension Context

Extensions receive a context object with sandboxed utilities:

```typescript
interface ExtensionContext {
  extensionId: string;
  userId: string;
  config: Record<string, unknown>;

  // Logging
  logger: {
    debug(message: string, meta?: object): void;
    info(message: string, meta?: object): void;
    warn(message: string, meta?: object): void;
    error(message: string, meta?: object): void;
  };

  // Persistent storage
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
  };

  // HTTP client (sandboxed)
  http: {
    get(url: string, options?: HttpOptions): Promise<HttpResponse>;
    post(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
    put(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
    delete(url: string, options?: HttpOptions): Promise<HttpResponse>;
  };
}
```

## Sandbox Environment

The sandbox provides safe testing environments for strategies.

### Backtesting

```typescript
import { createSandbox } from '@tonaiagent/core/sdk';

// Create sandbox for backtesting
const sandbox = createSandbox({
  name: 'Strategy Backtest',
  initialBalance: 10000,
  marketDataSource: 'historical',
  startTimestamp: new Date('2024-01-01'),
  endTimestamp: new Date('2024-12-31'),
  enableSlippage: true,
  slippagePercent: 0.1,
  enableGas: true,
});

// Define your strategy
const myStrategy = async (state, prices) => {
  const tonPrice = prices.get('TON') || 1;
  const balance = state.balance.ton;

  // Simple momentum strategy
  if (tonPrice < 0.9 && balance > 100) {
    return { action: 'buy', asset: 'TON', amount: 100 };
  }

  if (tonPrice > 1.1) {
    const position = state.positions.find(p => p.asset === 'TON');
    if (position && position.amount > 0) {
      return { action: 'sell', asset: 'TON', amount: position.amount };
    }
  }

  return { action: 'hold' };
};

// Run backtest
const performance = await sandbox.runBacktest(myStrategy, {
  stepMs: 24 * 60 * 60 * 1000, // 1 day steps
  assets: ['TON'],
});

console.log('Backtest Results:');
console.log(`  Total P&L: ${performance.totalPnl.toFixed(2)} TON`);
console.log(`  Return: ${performance.totalPnlPercent.toFixed(2)}%`);
console.log(`  Win Rate: ${(performance.winRate * 100).toFixed(1)}%`);
console.log(`  Sharpe Ratio: ${performance.sharpeRatio.toFixed(2)}`);
console.log(`  Max Drawdown: ${(performance.maxDrawdown * 100).toFixed(1)}%`);

// Clean up
sandbox.destroy();
```

### Paper Trading

```typescript
// Create sandbox for paper trading (live prices, fake money)
const paperTrading = createSandbox({
  name: 'Paper Trading',
  initialBalance: 10000,
  marketDataSource: 'live', // Use live market data
  enableSlippage: true,
  enableGas: true,
});

// Execute trades
const buyResult = await paperTrading.executeTrade({
  operation: 'trade',
  asset: 'TON',
  amount: 100,
  side: 'buy',
});

console.log('Buy executed:', buyResult);

// Check portfolio
const state = paperTrading.getState();
console.log('Current balance:', state.balance);
console.log('Positions:', state.positions);
console.log('Performance:', state.performance);

// Monitor with events
paperTrading.onEvent((event) => {
  console.log('Sandbox event:', event);
});
```

## Best Practices

### Error Handling

```typescript
import { TONAIAgentSDK, SDKEvent } from '@tonaiagent/core/sdk';

const sdk = createSDK({
  apiKey: process.env.API_KEY,
  onEvent: (event: SDKEvent) => {
    if (event.severity === 'error') {
      // Log errors
      console.error(`SDK Error [${event.type}]:`, event.data);

      // Alert on critical errors
      if (event.type === 'agent:error') {
        sendAlert('Agent error', event.data);
      }
    }
  },
});

try {
  const agent = await sdk.createAgent({
    name: 'My Agent',
    type: 'trading',
    userId: 'user_123',
  });
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Handle rate limiting
    await delay(error.retryAfter);
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation errors
    console.error('Invalid config:', error.details);
  } else {
    // Handle other errors
    throw error;
  }
}
```

### Rate Limiting

```typescript
const sdk = createSDK({
  apiKey: process.env.API_KEY,
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerSecond: 10,
  },
});

// SDK automatically handles rate limiting
// Requests are queued and executed within limits
```

### Idempotency

```typescript
// Use idempotency keys for critical operations
const result = await sdk.execute({
  agentId: agent.id,
  operation: 'trade',
  parameters: { asset: 'TON', amount: 100 },
  idempotencyKey: `trade-${Date.now()}-${orderId}`,
});

// Safe to retry - same key returns same result
const retryResult = await sdk.execute({
  agentId: agent.id,
  operation: 'trade',
  parameters: { asset: 'TON', amount: 100 },
  idempotencyKey: `trade-${Date.now()}-${orderId}`,
});
```

### Monitoring

```typescript
// Subscribe to events
const unsubscribe = sdk.onEvent((event) => {
  switch (event.type) {
    case 'agent:started':
      metrics.increment('agent.started');
      break;
    case 'strategy:executed':
      metrics.timing('strategy.execution', event.data.durationMs);
      break;
    case 'api:error':
      metrics.increment('api.errors');
      break;
  }
});

// Clean up when done
unsubscribe();
```

## API Reference

### SDK Client Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the SDK |
| `shutdown()` | Shutdown the SDK |
| `createAgent(config)` | Create a new agent |
| `getAgent(id)` | Get agent by ID |
| `listAgents(params)` | List agents with pagination |
| `updateAgent(id, config)` | Update agent configuration |
| `deleteAgent(id)` | Delete an agent |
| `startAgent(id)` | Start an agent |
| `stopAgent(id)` | Stop an agent |
| `pauseAgent(id)` | Pause an agent |
| `resumeAgent(id)` | Resume a paused agent |
| `deployStrategy(strategy)` | Deploy a strategy |
| `getStrategy(id)` | Get strategy by ID |
| `listStrategies(params)` | List strategies |
| `updateStrategy(id, update)` | Update a strategy |
| `deleteStrategy(id)` | Delete a strategy |
| `assignStrategy(agentId, strategyId)` | Assign strategy to agent |
| `execute(request)` | Execute an operation |
| `getExecution(id)` | Get execution status |
| `listExecutions(agentId, params)` | List executions |
| `cancelExecution(id)` | Cancel an execution |
| `createWebhook(config)` | Create a webhook |
| `listWebhooks()` | List webhooks |
| `updateWebhook(id, config)` | Update a webhook |
| `deleteWebhook(id)` | Delete a webhook |
| `getWebhookDeliveries(id)` | Get webhook delivery history |
| `onEvent(callback)` | Subscribe to events |
| `offEvent(callback)` | Unsubscribe from events |

### Extension Registry Methods

| Method | Description |
|--------|-------------|
| `install(manifest, handlers, options)` | Install an extension |
| `uninstall(id)` | Uninstall an extension |
| `activate(id)` | Activate an extension |
| `deactivate(id)` | Deactivate an extension |
| `execute(id, function, params, userId)` | Execute extension function |
| `getAll()` | Get all installed extensions |
| `getActive()` | Get active extensions |
| `get(id)` | Get extension by ID |
| `isInstalled(id)` | Check if installed |
| `isActive(id)` | Check if active |
| `search(options)` | Search extensions |
| `updateConfig(id, config)` | Update extension config |
| `getMetrics(id)` | Get extension metrics |
| `onEvent(callback)` | Subscribe to events |

### Sandbox Methods

| Method | Description |
|--------|-------------|
| `start()` | Start the sandbox |
| `pause()` | Pause the sandbox |
| `resume()` | Resume the sandbox |
| `destroy()` | Destroy the sandbox |
| `executeTrade(params)` | Execute a trade |
| `getState()` | Get current state |
| `getBalance()` | Get current balance |
| `getPositions()` | Get all positions |
| `getTransactions()` | Get transaction history |
| `getPrice(asset)` | Get current price |
| `setPrice(asset, price)` | Set price (testing) |
| `calculatePerformance()` | Calculate performance |
| `runBacktest(strategy, options)` | Run backtest |
| `onEvent(callback)` | Subscribe to events |

## Support

- GitHub Issues: [github.com/xlabtg/TONAIAgent/issues](https://github.com/xlabtg/TONAIAgent/issues)
- Documentation: [docs.tonaiagent.com](https://docs.tonaiagent.com)
- Discord: [discord.gg/tonaiagent](https://discord.gg/tonaiagent)
