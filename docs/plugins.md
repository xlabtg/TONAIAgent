# TONAIAgent - Plugin & Tooling System

Production-grade plugin and tooling system for AI agents on TON blockchain.

## Overview

The plugin system enables AI agents to interact with TON, DeFi protocols, external APIs, and custom workflows in a secure, modular, and extensible way.

### Key Features

- **Modular Architecture**: Sandboxed plugin execution with capability boundaries
- **TON-Native Tools**: Built-in support for wallet, jettons, NFT operations
- **AI Integration**: JSON Schema function calling for all major AI providers
- **Security First**: Permission system, rate limiting, and audit logging
- **Developer Friendly**: TypeScript SDK, templates, and documentation

## Quick Start

```typescript
import {
  createPluginManager,
  AIToolContext,
} from '@tonaiagent/core/plugins';

// Create and initialize plugin manager
const manager = createPluginManager();
await manager.initialize();

// Get AI-compatible tool definitions
const tools = manager.getAIToolDefinitions();

// Execute a tool
const context: AIToolContext = {
  userId: 'user_123',
  agentId: 'agent_456',
  sessionId: 'session_789',
  requestId: 'req_001',
};

const result = await manager.executeTool(
  'ton_get_balance',
  { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
  context
);

console.log(result);
// { success: true, result: { address: '...', balance: '100.5', balanceNano: '100500000000' } }
```

## Architecture

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
│                        Core Plugins                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   TON Wallet    │   TON Jettons   │       TON NFT               │
│                 │                 │                             │
│  - Balance      │  - Balance      │  - Info                     │
│  - Transfer     │  - Transfer     │  - Transfer                 │
│  - Batch TX     │  - Swap         │  - List/Buy                 │
│  - History      │  - Stake        │  - Search                   │
│  - Simulate     │  - Portfolio    │  - Collection               │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Core Plugins

### TON Wallet Plugin

| Tool | Description |
|------|-------------|
| `ton_get_balance` | Get TON balance of an address |
| `ton_transfer` | Transfer TON to another address |
| `ton_batch_transfer` | Transfer TON to multiple recipients |
| `ton_get_account_info` | Get detailed account information |
| `ton_get_transactions` | Get transaction history |
| `ton_simulate_transaction` | Simulate a transaction |
| `ton_validate_address` | Validate and normalize an address |

### TON Jettons Plugin

| Tool | Description |
|------|-------------|
| `jetton_get_info` | Get jetton token information |
| `jetton_get_balance` | Get jetton balance for a wallet |
| `jetton_transfer` | Transfer jettons to another address |
| `jetton_swap` | Swap tokens using DEX aggregation |
| `jetton_get_swap_quote` | Get swap quote without executing |
| `jetton_stake` | Stake tokens in a pool |
| `jetton_unstake` | Unstake tokens from a pool |
| `jetton_get_staking_info` | Get staking information |
| `jetton_get_portfolio` | Get all token balances |

### TON NFT Plugin

| Tool | Description |
|------|-------------|
| `nft_get_info` | Get NFT metadata and owner |
| `nft_get_collection` | Get collection information |
| `nft_get_owned` | Get all NFTs owned by a wallet |
| `nft_transfer` | Transfer an NFT |
| `nft_list_for_sale` | List an NFT on marketplace |
| `nft_cancel_listing` | Cancel an NFT listing |
| `nft_buy` | Buy a listed NFT |
| `nft_search_listings` | Search marketplace listings |

## Permission System

Plugins declare required permissions in their manifest:

```typescript
const manifest: PluginManifest = {
  // ...
  permissions: [
    {
      scope: 'wallet:transfer',
      reason: 'Transfer TON between addresses',
      required: true,
      constraints: {
        maxTransactionValue: 100, // Max 100 TON per transaction
        dailyLimit: 1000, // Max 1000 TON per day
      },
    },
  ],
};
```

### Available Permission Scopes

| Scope | Description |
|-------|-------------|
| `ton:read` | Read blockchain data |
| `ton:write` | Write to blockchain |
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
| `storage:read/write` | Plugin storage |

## Creating Custom Plugins

### 1. Define the Manifest

```typescript
import { PluginManifest } from '@tonaiagent/core/plugins';

const myPluginManifest: PluginManifest = {
  id: 'my-custom-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',
  description: 'A custom plugin for specific functionality',
  author: {
    name: 'Your Name',
    email: 'your@email.com',
  },
  category: 'utility',
  trustLevel: 'community',
  keywords: ['custom', 'utility'],
  license: 'MIT',
  permissions: [
    {
      scope: 'network:outbound',
      reason: 'Fetch external data',
      required: true,
      constraints: {
        allowedDomains: ['api.example.com'],
      },
    },
  ],
  capabilities: {
    tools: [
      {
        name: 'my_custom_tool',
        description: 'Performs a custom operation',
        category: 'utility',
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input data to process',
            },
            options: {
              type: 'object',
              description: 'Optional configuration',
              properties: {
                format: {
                  type: 'string',
                  enum: ['json', 'text'],
                  description: 'Output format',
                },
              },
            },
          },
          required: ['input'],
        },
        returns: {
          type: 'object',
          description: 'Processing result',
          properties: {
            result: { type: 'string', description: 'Processed output' },
            metadata: { type: 'object', description: 'Additional info' },
          },
        },
        requiredPermissions: ['network:outbound'],
        requiresConfirmation: false,
        estimatedDurationMs: 1000,
        examples: [
          {
            description: 'Process text input',
            input: { input: 'Hello, World!' },
            output: { result: 'Processed: Hello, World!', metadata: {} },
          },
        ],
      },
    ],
  },
};
```

### 2. Implement Tool Handlers

```typescript
import { ToolHandler } from '@tonaiagent/core/plugins';

const myCustomToolHandler: ToolHandler = async (params, context) => {
  const { input, options } = params as {
    input: string;
    options?: { format?: string };
  };

  // Log operation
  context.logger.info('Processing input', { input });

  // Use sandboxed HTTP client
  const response = await context.http.get('https://api.example.com/process', {
    headers: { 'Content-Type': 'application/json' },
  });

  // Store result in plugin storage
  await context.storage.set('last_result', response.data);

  return {
    result: `Processed: ${input}`,
    metadata: {
      format: options?.format ?? 'text',
      timestamp: new Date().toISOString(),
    },
  };
};

const handlers: Record<string, ToolHandler> = {
  my_custom_tool: myCustomToolHandler,
};
```

### 3. Install and Use

```typescript
const manager = createPluginManager();
await manager.initialize();

// Install custom plugin
await manager.installPlugin(myPluginManifest, handlers, {
  activateImmediately: true,
});

// Execute tool
const result = await manager.executeTool(
  'my_custom_tool',
  { input: 'test data' },
  context
);
```

## AI Integration

The plugin system automatically generates AI-compatible tool definitions:

```typescript
// Get tools for OpenAI/Anthropic/Groq function calling
const tools = manager.getAIToolDefinitions();

// Example output:
// [
//   {
//     type: 'function',
//     function: {
//       name: 'ton_get_balance',
//       description: 'Get the TON balance of a wallet address...',
//       parameters: {
//         type: 'object',
//         properties: {
//           address: { type: 'string', description: '...' }
//         },
//         required: ['address']
//       }
//     }
//   },
//   ...
// ]

// Execute tool calls from AI response
const results = await manager.executeToolCalls(
  [
    { toolCallId: 'call_1', toolName: 'ton_get_balance', args: { address: '...' } },
    { toolCallId: 'call_2', toolName: 'jetton_get_portfolio', args: { walletAddress: '...' } },
  ],
  context
);
```

## Safety Features

### Transaction Confirmation

Tools that modify state can require user confirmation:

```typescript
const result = await manager.executeTool(
  'ton_transfer',
  { to: 'EQ...', amount: '10' },
  context,
  {
    onConfirmationRequired: async (toolName, description, params) => {
      // Show confirmation dialog to user
      return await userConfirmDialog(toolName, params);
    },
  }
);
```

### Rate Limiting

```typescript
const manager = createPluginManager({
  runtime: {
    enableRateLimiting: true,
    globalRateLimitPerMinute: 100,
  },
});
```

### Resource Limits

```typescript
const config: PluginConfig = {
  enabled: true,
  settings: {},
  resourceLimits: {
    maxMemoryMb: 128,
    maxCpuTimeMs: 5000,
    maxExecutionTimeMs: 30000,
    maxNetworkRequests: 10,
    maxStorageOperations: 100,
  },
};
```

## Observability

### Events

```typescript
manager.onEvent((event) => {
  console.log(`[${event.type}] ${event.pluginId}:`, event.data);
});

// Event types:
// - plugin:installed
// - plugin:activated
// - plugin:deactivated
// - plugin:updated
// - plugin:uninstalled
// - plugin:error
// - tool:executed
// - tool:failed
// - permission:denied
```

### Metrics

```typescript
// Plugin-specific metrics
const metrics = manager.getRegistry().getMetrics('ton-wallet');
// {
//   totalExecutions: 100,
//   successfulExecutions: 95,
//   failedExecutions: 5,
//   avgExecutionTimeMs: 150,
//   toolMetrics: { ... }
// }

// Aggregate metrics
const aggregate = manager.getMetrics();
// {
//   totalExecutions: 500,
//   successRate: 0.95,
//   avgExecutionTimeMs: 120,
//   topPlugins: [...],
//   topTools: [...]
// }
```

### Health Monitoring

```typescript
const health = manager.getHealthSummary();
// {
//   total: 3,
//   active: 3,
//   healthy: 3,
//   degraded: 0,
//   unhealthy: 0,
//   disabled: 0,
//   error: 0
// }
```

## Best Practices

### 1. Use Dry Run Mode for Testing

```typescript
const result = await manager.executeTool(
  'ton_transfer',
  { to: 'EQ...', amount: '1' },
  context,
  { dryRun: true }
);
```

### 2. Handle Errors Gracefully

```typescript
const result = await manager.executeTool(...);

if (!result.success) {
  if (result.requiresConfirmation) {
    // Handle confirmation flow
  } else {
    // Handle error
    console.error('Tool failed:', result.error);
  }
}
```

### 3. Use Parallel Execution for Independent Operations

```typescript
// Independent operations can run in parallel
const results = await manager.executeToolCallsParallel([
  { toolCallId: 'c1', toolName: 'ton_get_balance', args: { address: '...' } },
  { toolCallId: 'c2', toolName: 'jetton_get_portfolio', args: { walletAddress: '...' } },
], context);
```

### 4. Provide Wallet Context for Financial Operations

```typescript
const context: AIToolContext = {
  userId: 'user_123',
  agentId: 'agent_456',
  sessionId: 'session_789',
  requestId: 'req_001',
  walletAddress: 'EQ...', // For balance/permission checks
  availableBalance: '100', // For validation
};
```

## API Reference

See the TypeScript definitions in `src/plugins/types.ts` for complete API documentation.
