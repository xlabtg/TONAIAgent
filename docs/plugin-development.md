# Plugin Development Guide

This guide explains how to create custom plugins for the TON AI Agent platform. Plugins extend the platform with new data sources, tools, integrations, and functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Plugin Manifest](#plugin-manifest)
5. [Tool Implementation](#tool-implementation)
6. [Plugin Context](#plugin-context)
7. [Permission System](#permission-system)
8. [Testing Plugins](#testing-plugins)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Overview

The TON AI Agent plugin system enables developers to:

- **Add Data Sources** — Fetch market data, on-chain data, or external APIs
- **Create Tools** — Build AI-callable functions for agents
- **Integrate Services** — Connect to exchanges, notification systems, etc.
- **Extend Analytics** — Add custom metrics and reporting

### Plugin Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `data-source` | Provides market or external data | Price feeds, on-chain data, social sentiment |
| `signal-provider` | Generates trading signals | Technical indicators, AI predictions |
| `strategy` | Implements trading logic | Custom strategies, algorithms |
| `integration` | External service integration | Exchange APIs, notifications |
| `analytics` | Analysis and reporting | Performance tracking, risk analysis |
| `notification` | Alert delivery | Telegram, email, Slack |
| `utility` | General functionality | Data processing, helpers |

---

## Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Plugin Manager                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Plugin         │  │  Plugin         │  │  AI Tool        │ │
│  │  Registry       │  │  Runtime        │  │  Executor       │ │
│  │                 │  │                 │  │                 │ │
│  │  - Install      │  │  - Sandboxing   │  │  - AI Format    │ │
│  │  - Activate     │  │  - Permissions  │  │  - Execution    │ │
│  │  - Lifecycle    │  │  - Rate Limit   │  │  - Confirmation │ │
│  │  - Discovery    │  │  - Audit        │  │  - Results      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         Your Plugin                             │
├─────────────────────┬─────────────────┬─────────────────────────┤
│   Manifest          │   Handlers      │       Tools             │
│   (metadata)        │   (logic)       │       (AI functions)    │
└─────────────────────┴─────────────────┴─────────────────────────┘
```

---

## Creating Your First Plugin

### Step 1: Define the Manifest

```typescript
import { PluginManifest } from '@tonaiagent/core/plugins';

const myPluginManifest: PluginManifest = {
  id: 'my-price-alert',
  name: 'Price Alert Plugin',
  version: '1.0.0',
  description: 'Monitors prices and sends alerts when thresholds are reached',
  author: {
    name: 'Your Name',
    email: 'your@email.com',
  },
  category: 'notification',
  trustLevel: 'community',
  keywords: ['price', 'alert', 'notification'],
  license: 'MIT',

  permissions: [
    {
      scope: 'network:outbound',
      reason: 'Send alert notifications',
      required: true,
    },
  ],

  capabilities: {
    tools: [
      {
        name: 'set_price_alert',
        description: 'Set a price alert for an asset',
        category: 'notification',
        parameters: {
          type: 'object',
          properties: {
            asset: {
              type: 'string',
              description: 'Asset symbol (e.g., "TON")',
            },
            targetPrice: {
              type: 'number',
              description: 'Price threshold to trigger alert',
            },
            direction: {
              type: 'string',
              enum: ['above', 'below'],
              description: 'Trigger when price goes above or below target',
            },
          },
          required: ['asset', 'targetPrice', 'direction'],
        },
        returns: {
          type: 'object',
          properties: {
            alertId: { type: 'string', description: 'Unique alert ID' },
            status: { type: 'string', description: 'Alert status' },
          },
        },
        requiredPermissions: [],
        requiresConfirmation: false,
        estimatedDurationMs: 100,
      },
    ],
  },
};
```

### Step 2: Implement Tool Handlers

```typescript
import { ToolHandler } from '@tonaiagent/core/plugins';

// Store for active alerts (in production, use persistent storage)
const activeAlerts = new Map<string, {
  asset: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: Date;
}>();

const setPriceAlertHandler: ToolHandler = async (params, context) => {
  const { asset, targetPrice, direction } = params as {
    asset: string;
    targetPrice: number;
    direction: 'above' | 'below';
  };

  // Generate unique alert ID
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Store the alert
  activeAlerts.set(alertId, {
    asset,
    targetPrice,
    direction,
    createdAt: new Date(),
  });

  // Log the operation
  context.logger.info('Price alert created', {
    alertId,
    asset,
    targetPrice,
    direction,
  });

  // Optionally store in persistent storage
  await context.storage.set(`alert:${alertId}`, {
    asset,
    targetPrice,
    direction,
    createdAt: new Date().toISOString(),
  });

  return {
    alertId,
    status: 'active',
    message: `Alert set: notify when ${asset} goes ${direction} $${targetPrice}`,
  };
};

// Export handlers map
const handlers: Record<string, ToolHandler> = {
  set_price_alert: setPriceAlertHandler,
};
```

### Step 3: Install and Use

```typescript
import { createPluginManager } from '@tonaiagent/core/plugins';

// Create plugin manager
const manager = createPluginManager();
await manager.initialize();

// Install your plugin
await manager.installPlugin(myPluginManifest, handlers, {
  activateImmediately: true,
});

// Execute a tool
const context = {
  userId: 'user_123',
  agentId: 'agent_456',
  sessionId: 'session_789',
  requestId: 'req_001',
};

const result = await manager.executeTool(
  'set_price_alert',
  { asset: 'TON', targetPrice: 6.0, direction: 'above' },
  context
);

console.log('Alert created:', result);
```

---

## Plugin Manifest

The manifest describes your plugin's metadata, permissions, and capabilities.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier (lowercase, hyphens allowed) |
| `name` | string | Human-readable name |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `description` | string | What the plugin does |
| `author` | object | Author info: `{ name, email?, url? }` |
| `category` | string | Plugin type (see Plugin Types above) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `trustLevel` | string | `'core'` \| `'verified'` \| `'community'` |
| `keywords` | string[] | Search keywords |
| `license` | string | License identifier |
| `repository` | string | Source code URL |
| `homepage` | string | Documentation URL |
| `dependencies` | string[] | Required plugin IDs |
| `permissions` | Permission[] | Required permissions |
| `capabilities` | object | Tools, data sources, events |
| `config` | object | Configuration schema |

### Capabilities

```typescript
capabilities: {
  // AI-callable tools
  tools: [
    {
      name: 'tool_name',
      description: 'What this tool does',
      category: 'category',
      parameters: { /* JSON Schema */ },
      returns: { /* JSON Schema */ },
      requiredPermissions: ['permission:scope'],
      requiresConfirmation: false,
      estimatedDurationMs: 1000,
      examples: [
        {
          description: 'Example usage',
          input: { param: 'value' },
          output: { result: 'value' },
        },
      ],
    },
  ],

  // Data sources
  dataSources: [
    {
      name: 'source_name',
      description: 'What data this provides',
      dataType: 'price' | 'volume' | 'indicator' | 'custom',
      refreshInterval: 1000, // ms
    },
  ],

  // Events the plugin can emit
  events: [
    {
      name: 'event_name',
      description: 'When this event fires',
      payload: { /* JSON Schema */ },
    },
  ],
}
```

---

## Tool Implementation

### Tool Handler Signature

```typescript
type ToolHandler = (
  params: Record<string, unknown>,
  context: PluginContext
) => Promise<unknown>;
```

### Handler Implementation

```typescript
const myToolHandler: ToolHandler = async (params, context) => {
  // 1. Extract and validate parameters
  const { inputValue } = params as { inputValue: string };

  if (!inputValue) {
    throw new Error('inputValue is required');
  }

  // 2. Log the operation
  context.logger.info('Processing input', { inputValue });

  // 3. Perform the operation
  const result = await processData(inputValue);

  // 4. Optionally store state
  await context.storage.set('lastResult', result);

  // 5. Return the result
  return {
    success: true,
    result,
    timestamp: new Date().toISOString(),
  };
};
```

### Error Handling

```typescript
const robustHandler: ToolHandler = async (params, context) => {
  try {
    // Validate input
    const { asset } = params as { asset: string };
    if (!asset || typeof asset !== 'string') {
      return {
        success: false,
        error: 'Invalid asset parameter',
        code: 'INVALID_INPUT',
      };
    }

    // Perform operation
    const data = await fetchData(asset);

    return {
      success: true,
      data,
    };

  } catch (error) {
    // Log error
    context.logger.error('Tool execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return structured error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_ERROR',
    };
  }
};
```

---

## Plugin Context

Every tool handler receives a context object with sandboxed utilities.

### Context Interface

```typescript
interface PluginContext {
  // Plugin and user identification
  extensionId: string;
  userId: string;
  config: Record<string, unknown>;

  // Logging (sandboxed, prefixed with plugin ID)
  logger: {
    debug(message: string, meta?: object): void;
    info(message: string, meta?: object): void;
    warn(message: string, meta?: object): void;
    error(message: string, meta?: object): void;
  };

  // Persistent storage (isolated per plugin)
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
  };

  // HTTP client (sandboxed, respects allowedDomains)
  http: {
    get(url: string, options?: HttpOptions): Promise<HttpResponse>;
    post(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
    put(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
    delete(url: string, options?: HttpOptions): Promise<HttpResponse>;
  };
}
```

### Using the Logger

```typescript
context.logger.info('Operation started', { asset: 'TON' });
context.logger.warn('Rate limit approaching', { remaining: 5 });
context.logger.error('API request failed', { status: 500 });
```

### Using Storage

```typescript
// Store data
await context.storage.set('lastPrice', { TON: 5.50, timestamp: Date.now() });

// Retrieve data
const lastPrice = await context.storage.get('lastPrice');

// List all keys
const keys = await context.storage.list();

// Delete data
await context.storage.delete('lastPrice');
```

### Using HTTP

```typescript
// GET request
const response = await context.http.get('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer token' },
});

// POST request
const result = await context.http.post(
  'https://api.example.com/create',
  { name: 'My Resource' },
  { headers: { 'Content-Type': 'application/json' } }
);
```

---

## Permission System

Plugins must declare required permissions in their manifest.

### Available Permission Scopes

| Scope | Description |
|-------|-------------|
| `ton:read` | Read TON blockchain data |
| `ton:write` | Write to TON blockchain |
| `ton:sign` | Sign transactions |
| `wallet:read` | Read wallet balances |
| `wallet:transfer` | Transfer funds |
| `jettons:read` | Read token data |
| `jettons:transfer` | Transfer tokens |
| `jettons:swap` | Swap tokens |
| `nft:read` | Read NFT data |
| `nft:transfer` | Transfer NFTs |
| `defi:stake` | Staking operations |
| `defi:liquidity` | Liquidity provision |
| `network:outbound` | External HTTP requests |
| `storage:read` | Read plugin storage |
| `storage:write` | Write plugin storage |

### Declaring Permissions

```typescript
permissions: [
  {
    scope: 'network:outbound',
    reason: 'Fetch price data from external API',
    required: true,
    constraints: {
      allowedDomains: ['api.coingecko.com', 'api.binance.com'],
    },
  },
  {
    scope: 'wallet:transfer',
    reason: 'Execute trades',
    required: false,
    constraints: {
      maxTransactionValue: 100, // Max 100 TON per transaction
      dailyLimit: 1000, // Max 1000 TON per day
    },
  },
],
```

### Permission Constraints

| Constraint | Applies To | Description |
|------------|------------|-------------|
| `allowedDomains` | `network:outbound` | Whitelist of allowed domains |
| `maxTransactionValue` | `wallet:transfer` | Max single transaction amount |
| `dailyLimit` | `wallet:transfer` | Max daily transaction total |
| `allowedAssets` | `jettons:transfer` | Whitelist of allowed tokens |

---

## Testing Plugins

### Unit Testing

```typescript
import { describe, it, expect } from 'vitest';
import { myPluginManifest, handlers } from './my-plugin';

describe('MyPlugin', () => {
  describe('manifest', () => {
    it('should have required fields', () => {
      expect(myPluginManifest.id).toBeDefined();
      expect(myPluginManifest.name).toBeDefined();
      expect(myPluginManifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('set_price_alert handler', () => {
    it('should create an alert successfully', async () => {
      const mockContext = {
        extensionId: 'my-price-alert',
        userId: 'test_user',
        config: {},
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
        storage: {
          get: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
        },
        http: {
          get: vi.fn(),
          post: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        },
      };

      const result = await handlers.set_price_alert(
        { asset: 'TON', targetPrice: 6.0, direction: 'above' },
        mockContext
      );

      expect(result).toHaveProperty('alertId');
      expect(result.status).toBe('active');
      expect(mockContext.logger.info).toHaveBeenCalled();
    });
  });
});
```

### Integration Testing

```typescript
import { createPluginManager } from '@tonaiagent/core/plugins';

describe('MyPlugin Integration', () => {
  let manager;

  beforeEach(async () => {
    manager = createPluginManager();
    await manager.initialize();
    await manager.installPlugin(myPluginManifest, handlers, {
      activateImmediately: true,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  it('should execute tool successfully', async () => {
    const result = await manager.executeTool(
      'set_price_alert',
      { asset: 'TON', targetPrice: 6.0, direction: 'above' },
      { userId: 'test_user', agentId: 'test_agent' }
    );

    expect(result.success).toBe(true);
  });
});
```

---

## Best Practices

### 1. Validate All Input

```typescript
const handler: ToolHandler = async (params, context) => {
  const { asset, amount } = params as { asset: string; amount: number };

  // Validate types
  if (typeof asset !== 'string' || asset.length === 0) {
    throw new Error('Invalid asset: must be a non-empty string');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }

  // Proceed with validated input
};
```

### 2. Use Structured Errors

```typescript
class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

// Usage
throw new PluginError(
  'Asset not found',
  'ASSET_NOT_FOUND',
  { asset: 'INVALID' }
);
```

### 3. Log Important Operations

```typescript
context.logger.info('Starting price fetch', { assets: ['TON', 'BTC'] });

try {
  const prices = await fetchPrices();
  context.logger.info('Prices fetched successfully', { count: prices.length });
} catch (error) {
  context.logger.error('Failed to fetch prices', {
    error: error.message,
    assets: ['TON', 'BTC'],
  });
  throw error;
}
```

### 4. Handle Rate Limits

```typescript
const fetchWithRetry = async (url: string, context: PluginContext) => {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await context.http.get(url);
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.pow(2, i) * 1000;
        context.logger.warn('Rate limited, retrying', { waitTime, attempt: i + 1 });
        await new Promise(resolve => setTimeout(resolve, waitTime));
        lastError = error;
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};
```

### 5. Clean Up Resources

```typescript
// If your plugin maintains state, provide cleanup
const cleanup = async (context: PluginContext) => {
  // Clear cached data
  const keys = await context.storage.list();
  for (const key of keys) {
    if (key.startsWith('cache:')) {
      await context.storage.delete(key);
    }
  }

  context.logger.info('Plugin cleanup completed');
};
```

---

## Examples

### Price Feed Plugin

A complete example of a data source plugin:

```typescript
import { PluginManifest, ToolHandler } from '@tonaiagent/core/plugins';

export const priceFeedManifest: PluginManifest = {
  id: 'custom-price-feed',
  name: 'Custom Price Feed',
  version: '1.0.0',
  description: 'Fetches real-time prices from custom API',
  author: { name: 'Developer' },
  category: 'data-source',
  trustLevel: 'community',

  permissions: [
    {
      scope: 'network:outbound',
      reason: 'Fetch price data',
      required: true,
      constraints: {
        allowedDomains: ['api.mypriceservice.com'],
      },
    },
  ],

  capabilities: {
    tools: [
      {
        name: 'get_price',
        description: 'Get the current price of an asset',
        category: 'market-data',
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
        requiredPermissions: ['network:outbound'],
        requiresConfirmation: false,
        estimatedDurationMs: 500,
      },
    ],
    dataSources: [
      {
        name: 'live_prices',
        description: 'Real-time price updates',
        dataType: 'price',
        refreshInterval: 5000,
      },
    ],
  },
};

const getPriceHandler: ToolHandler = async (params, context) => {
  const { asset } = params as { asset: string };

  // Check cache first
  const cached = await context.storage.get(`price:${asset}`);
  if (cached && Date.now() - (cached as any).timestamp < 5000) {
    return cached;
  }

  // Fetch fresh data
  const response = await context.http.get(
    `https://api.mypriceservice.com/price/${asset}`
  );

  const result = {
    asset,
    price: response.data.price,
    timestamp: new Date().toISOString(),
  };

  // Cache the result
  await context.storage.set(`price:${asset}`, {
    ...result,
    timestamp: Date.now(),
  });

  return result;
};

export const handlers: Record<string, ToolHandler> = {
  get_price: getPriceHandler,
};
```

---

## Next Steps

- Review the [Plugin System Documentation](plugins.md)
- Check out the [Core Plugins](../src/plugins/tools/) for more examples
- Read the [Strategy Development Guide](strategy-development.md)
- See the [Contributing Guide](../CONTRIBUTING.md)
