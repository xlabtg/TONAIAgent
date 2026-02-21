/**
 * TONAIAgent - Enterprise SDK & Developer Platform
 *
 * Comprehensive developer platform and enterprise-grade SDK enabling developers,
 * institutions, and partners to build, extend, and integrate autonomous agents
 * across the TON AI ecosystem.
 *
 * Features:
 * - SDK Client: Unified interface for agent management, strategy deployment, execution
 * - Extension Framework: Build and integrate custom data sources, signals, and strategies
 * - Sandbox Environment: Backtesting, simulation, and safe testing
 * - Developer APIs: REST-style interfaces with webhooks and event-driven architecture
 * - Enterprise Integration: Support for custody providers, compliance tools
 *
 * @example
 * ```typescript
 * import {
 *   createSDK,
 *   createExtensionRegistry,
 *   createSandbox,
 * } from '@tonaiagent/core/sdk';
 *
 * // Initialize SDK
 * const sdk = createSDK({
 *   apiKey: process.env.TONAIAGENT_API_KEY,
 *   environment: 'sandbox',
 * });
 * await sdk.initialize();
 *
 * // Create and deploy an agent
 * const agent = await sdk.createAgent({
 *   name: 'My Trading Agent',
 *   type: 'trading',
 *   userId: 'user_123',
 *   aiConfig: {
 *     provider: 'groq',
 *     model: 'llama-3.1-70b-versatile',
 *   },
 * });
 *
 * // Start the agent
 * await sdk.startAgent(agent.id);
 *
 * // Execute an operation
 * const result = await sdk.execute({
 *   agentId: agent.id,
 *   operation: 'trade',
 *   parameters: {
 *     asset: 'TON',
 *     amount: 10,
 *     side: 'buy',
 *   },
 * });
 * ```
 *
 * @example Extension Development
 * ```typescript
 * import { createExtensionRegistry, ExtensionManifest } from '@tonaiagent/core/sdk';
 *
 * // Create extension registry
 * const registry = createExtensionRegistry();
 *
 * // Define custom extension
 * const myExtension: ExtensionManifest = {
 *   id: 'my-data-source',
 *   name: 'Custom Data Source',
 *   version: '1.0.0',
 *   description: 'Provides custom market data',
 *   author: { name: 'Developer' },
 *   type: 'data-source',
 *   category: 'market-data',
 *   permissions: [],
 *   capabilities: {
 *     dataSources: [
 *       {
 *         name: 'custom_price',
 *         description: 'Custom price feed',
 *         dataType: 'price',
 *         refreshInterval: 1000,
 *       },
 *     ],
 *   },
 * };
 *
 * // Install and activate
 * await registry.install(myExtension, {
 *   custom_price: async (params, context) => {
 *     const data = await context.http.get('https://api.example.com/price');
 *     return data.data;
 *   },
 * }, { activateImmediately: true });
 * ```
 *
 * @example Backtesting
 * ```typescript
 * import { createSandbox } from '@tonaiagent/core/sdk';
 *
 * // Create sandbox for backtesting
 * const sandbox = createSandbox({
 *   initialBalance: 10000,
 *   marketDataSource: 'historical',
 *   startTimestamp: new Date('2024-01-01'),
 *   endTimestamp: new Date('2024-12-31'),
 * });
 *
 * // Define strategy
 * const myStrategy = async (state, prices) => {
 *   const tonPrice = prices.get('TON') || 1;
 *
 *   // Simple moving average crossover
 *   if (tonPrice > 1.1) {
 *     return { action: 'sell', asset: 'TON', amount: 10 };
 *   } else if (tonPrice < 0.9) {
 *     return { action: 'buy', asset: 'TON', amount: 10 };
 *   }
 *
 *   return { action: 'hold' };
 * };
 *
 * // Run backtest
 * const performance = await sandbox.runBacktest(myStrategy, {
 *   stepMs: 24 * 60 * 60 * 1000, // 1 day steps
 *   assets: ['TON'],
 * });
 *
 * console.log('Backtest Results:', performance);
 * // {
 * //   totalPnl: 1250,
 * //   totalPnlPercent: 12.5,
 * //   winRate: 0.65,
 * //   sharpeRatio: 1.8,
 * //   maxDrawdown: 0.08,
 * //   ...
 * // }
 * ```
 */

// ==========================================================================
// Core Types
// ==========================================================================

export * from './types';

// ==========================================================================
// SDK Client
// ==========================================================================

export {
  TONAIAgentSDK,
  createSDK,
} from './client';

// ==========================================================================
// Extension Framework
// ==========================================================================

export {
  ExtensionRegistry,
  createExtensionRegistry,
  ExtensionError,
  type ExtensionHandler,
  type ExtensionContext,
  type ExtensionLogger,
  type ExtensionStorage,
  type ExtensionHttp,
  type HttpOptions,
  type HttpResponse,
  type ExtensionRegistryConfig,
  type PermissionChecker,
} from './extensions';

// ==========================================================================
// Sandbox Environment
// ==========================================================================

export {
  SandboxEnvironment,
  createSandbox,
  type MarketDataPoint,
  type MarketDataProvider,
} from './sandbox';

// ==========================================================================
// Re-exports from Client
// ==========================================================================

import { TONAIAgentSDK, createSDK } from './client';
import { ExtensionRegistry, createExtensionRegistry } from './extensions';
import { SandboxEnvironment, createSandbox } from './sandbox';
import { SDKEventCallback } from './types';

// ==========================================================================
// SDK Builder (Fluent API)
// ==========================================================================

/**
 * SDK Builder for fluent configuration
 *
 * @example
 * ```typescript
 * const sdk = new SDKBuilder()
 *   .withApiKey(process.env.API_KEY)
 *   .withEnvironment('sandbox')
 *   .withDebug(true)
 *   .build();
 * ```
 */
export class SDKBuilder {
  private apiKey?: string;
  private environment?: 'production' | 'sandbox' | 'development';
  private baseUrl?: string;
  private timeoutMs?: number;
  private debug?: boolean;
  private retryConfig?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  };
  private rateLimitConfig?: {
    maxRequestsPerMinute?: number;
    maxRequestsPerSecond?: number;
  };
  private eventCallback?: (event: unknown) => void;

  withApiKey(apiKey: string): this {
    this.apiKey = apiKey;
    return this;
  }

  withEnvironment(environment: 'production' | 'sandbox' | 'development'): this {
    this.environment = environment;
    return this;
  }

  withBaseUrl(baseUrl: string): this {
    this.baseUrl = baseUrl;
    return this;
  }

  withTimeout(timeoutMs: number): this {
    this.timeoutMs = timeoutMs;
    return this;
  }

  withDebug(debug: boolean): this {
    this.debug = debug;
    return this;
  }

  withRetry(config: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  }): this {
    this.retryConfig = { ...this.retryConfig, ...config };
    return this;
  }

  withRateLimit(config: {
    maxRequestsPerMinute?: number;
    maxRequestsPerSecond?: number;
  }): this {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    return this;
  }

  onEvent(callback: (event: unknown) => void): this {
    this.eventCallback = callback;
    return this;
  }

  build(): TONAIAgentSDK {
    return createSDK({
      apiKey: this.apiKey,
      environment: this.environment,
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs,
      debug: this.debug,
      onEvent: this.eventCallback as SDKEventCallback | undefined,
    });
  }
}

// ==========================================================================
// Quick Start Helper
// ==========================================================================

/**
 * Quick start helper for common use cases
 */
export const QuickStart = {
  /**
   * Create a development SDK with sensible defaults
   */
  development(): TONAIAgentSDK {
    return createSDK({
      environment: 'development',
      debug: true,
    });
  },

  /**
   * Create a sandbox SDK for testing
   */
  sandbox(apiKey?: string): TONAIAgentSDK {
    return createSDK({
      apiKey,
      environment: 'sandbox',
      debug: true,
    });
  },

  /**
   * Create a production SDK
   */
  production(apiKey: string): TONAIAgentSDK {
    return createSDK({
      apiKey,
      environment: 'production',
      debug: false,
    });
  },

  /**
   * Create a sandbox environment for backtesting
   */
  backtest(options?: {
    initialBalance?: number;
    startDate?: Date;
    endDate?: Date;
  }): SandboxEnvironment {
    return createSandbox({
      initialBalance: options?.initialBalance ?? 10000,
      marketDataSource: 'historical',
      startTimestamp: options?.startDate ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endTimestamp: options?.endDate ?? new Date(),
    });
  },

  /**
   * Create an extension registry for plugin development
   */
  extensions(): ExtensionRegistry {
    return createExtensionRegistry({
      allowExperimental: true,
    });
  },
};

// ==========================================================================
// Default Export
// ==========================================================================

export default {
  createSDK,
  createExtensionRegistry,
  createSandbox,
  SDKBuilder,
  QuickStart,
};
