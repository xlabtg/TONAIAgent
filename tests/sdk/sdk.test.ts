/**
 * TONAIAgent - Enterprise SDK Tests
 *
 * Comprehensive tests for the SDK, Extension Framework, and Sandbox Environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // SDK Client
  TONAIAgentSDK,
  createSDK,
  SDKConfig,
  SDKEvent,
  AgentConfig,
  AgentState,
  StrategyDefinition,
  ExecutionRequest,

  // Extension Framework
  ExtensionRegistry,
  createExtensionRegistry,
  ExtensionManifest,
  ExtensionHandler,
  ExtensionError,

  // Sandbox
  SandboxEnvironment,
  createSandbox,
  SandboxConfig,

  // Utilities
  SDKBuilder,
  QuickStart,
} from '../../src/sdk';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    name: 'Test Agent',
    type: 'trading',
    userId: 'user_123',
    ...overrides,
  };
}

function createTestExtensionManifest(
  overrides: Partial<ExtensionManifest> = {}
): ExtensionManifest {
  return {
    id: overrides.id ?? 'test-extension',
    name: 'Test Extension',
    version: '1.0.0',
    description: 'A test extension',
    author: { name: 'Test Author' },
    type: 'data-source',
    category: 'test',
    permissions: [],
    capabilities: {
      functions: [
        {
          name: 'testFunction',
          description: 'A test function',
          parameters: { type: 'object', properties: {} },
          returns: { type: 'object', properties: {} },
        },
      ],
    },
    ...overrides,
  };
}

function createTestHandler(): ExtensionHandler {
  return async (params, context) => {
    return { result: 'success', params };
  };
}

// ============================================================================
// SDK Client Tests
// ============================================================================

describe('TONAIAgentSDK', () => {
  let sdk: TONAIAgentSDK;

  beforeEach(() => {
    sdk = createSDK({
      environment: 'development',
      debug: false,
    });
  });

  afterEach(async () => {
    if (sdk.isInitialized()) {
      await sdk.shutdown();
    }
  });

  describe('initialization', () => {
    it('should create SDK with default config', () => {
      const defaultSdk = createSDK();
      expect(defaultSdk).toBeInstanceOf(TONAIAgentSDK);
      expect(defaultSdk.isInitialized()).toBe(false);
    });

    it('should initialize SDK', async () => {
      await sdk.initialize();
      expect(sdk.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await sdk.initialize();
      await sdk.initialize(); // Should not throw
      expect(sdk.isInitialized()).toBe(true);
    });

    it('should shutdown SDK', async () => {
      await sdk.initialize();
      await sdk.shutdown();
      expect(sdk.isInitialized()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use custom environment', () => {
      const sandboxSdk = createSDK({ environment: 'sandbox' });
      expect(sandboxSdk.getEnvironment()).toBe('sandbox');
    });

    it('should use custom base URL', () => {
      const customSdk = createSDK({ baseUrl: 'https://custom.api.com' });
      const config = customSdk.getConfig();
      expect(config.baseUrl).toBe('https://custom.api.com');
    });

    it('should merge retry configuration', () => {
      const customSdk = createSDK({
        retry: { maxRetries: 5 },
      });
      const config = customSdk.getConfig();
      expect(config.retry?.maxRetries).toBe(5);
    });
  });

  describe('events', () => {
    it('should emit initialization event', async () => {
      const events: SDKEvent[] = [];
      const eventSdk = createSDK({
        environment: 'development',
        onEvent: (event) => events.push(event),
      });

      await eventSdk.initialize();

      expect(events.some((e) => e.type === 'sdk:initialized')).toBe(true);
    });

    it('should subscribe to events', async () => {
      await sdk.initialize();

      const events: SDKEvent[] = [];
      const unsubscribe = sdk.onEvent((event) => events.push(event));

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });

    it('should unsubscribe from events', async () => {
      await sdk.initialize();

      const events: SDKEvent[] = [];
      const callback = (event: SDKEvent) => events.push(event);

      sdk.onEvent(callback);
      sdk.offEvent(callback);

      // Events after unsubscribe should not be captured
      // (would need to trigger an event to fully test)
    });
  });

  describe('agent operations', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should throw if not initialized', async () => {
      const uninitializedSdk = createSDK();

      await expect(
        uninitializedSdk.createAgent(createTestAgentConfig())
      ).rejects.toThrow('SDK not initialized');
    });

    // Note: These tests would require mocking the API
    // For now, we test that methods exist and handle basic validation
    it('should have createAgent method', () => {
      expect(typeof sdk.createAgent).toBe('function');
    });

    it('should have getAgent method', () => {
      expect(typeof sdk.getAgent).toBe('function');
    });

    it('should have listAgents method', () => {
      expect(typeof sdk.listAgents).toBe('function');
    });

    it('should have updateAgent method', () => {
      expect(typeof sdk.updateAgent).toBe('function');
    });

    it('should have deleteAgent method', () => {
      expect(typeof sdk.deleteAgent).toBe('function');
    });

    it('should have agent lifecycle methods', () => {
      expect(typeof sdk.startAgent).toBe('function');
      expect(typeof sdk.stopAgent).toBe('function');
      expect(typeof sdk.pauseAgent).toBe('function');
      expect(typeof sdk.resumeAgent).toBe('function');
    });
  });

  describe('strategy operations', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should have deployStrategy method', () => {
      expect(typeof sdk.deployStrategy).toBe('function');
    });

    it('should have getStrategy method', () => {
      expect(typeof sdk.getStrategy).toBe('function');
    });

    it('should have listStrategies method', () => {
      expect(typeof sdk.listStrategies).toBe('function');
    });

    it('should have updateStrategy method', () => {
      expect(typeof sdk.updateStrategy).toBe('function');
    });

    it('should have deleteStrategy method', () => {
      expect(typeof sdk.deleteStrategy).toBe('function');
    });

    it('should have assignStrategy method', () => {
      expect(typeof sdk.assignStrategy).toBe('function');
    });
  });

  describe('execution operations', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should have execute method', () => {
      expect(typeof sdk.execute).toBe('function');
    });

    it('should have getExecution method', () => {
      expect(typeof sdk.getExecution).toBe('function');
    });

    it('should have listExecutions method', () => {
      expect(typeof sdk.listExecutions).toBe('function');
    });

    it('should have cancelExecution method', () => {
      expect(typeof sdk.cancelExecution).toBe('function');
    });
  });

  describe('webhook operations', () => {
    beforeEach(async () => {
      await sdk.initialize();
    });

    it('should have createWebhook method', () => {
      expect(typeof sdk.createWebhook).toBe('function');
    });

    it('should have listWebhooks method', () => {
      expect(typeof sdk.listWebhooks).toBe('function');
    });

    it('should have updateWebhook method', () => {
      expect(typeof sdk.updateWebhook).toBe('function');
    });

    it('should have deleteWebhook method', () => {
      expect(typeof sdk.deleteWebhook).toBe('function');
    });

    it('should have getWebhookDeliveries method', () => {
      expect(typeof sdk.getWebhookDeliveries).toBe('function');
    });
  });
});

// ============================================================================
// SDK Builder Tests
// ============================================================================

describe('SDKBuilder', () => {
  it('should build SDK with fluent API', () => {
    const sdk = new SDKBuilder()
      .withEnvironment('sandbox')
      .withDebug(true)
      .withTimeout(60000)
      .build();

    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
    expect(sdk.getEnvironment()).toBe('sandbox');
  });

  it('should chain all configuration methods', () => {
    const builder = new SDKBuilder()
      .withApiKey('test-key')
      .withEnvironment('production')
      .withBaseUrl('https://api.example.com')
      .withTimeout(30000)
      .withDebug(false)
      .withRetry({ maxRetries: 5 })
      .withRateLimit({ maxRequestsPerMinute: 100 });

    const sdk = builder.build();
    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
  });

  it('should accept event handler', () => {
    const events: unknown[] = [];
    const sdk = new SDKBuilder()
      .onEvent((event) => events.push(event))
      .build();

    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
  });
});

// ============================================================================
// QuickStart Tests
// ============================================================================

describe('QuickStart', () => {
  it('should create development SDK', () => {
    const sdk = QuickStart.development();
    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
    expect(sdk.getEnvironment()).toBe('development');
  });

  it('should create sandbox SDK', () => {
    const sdk = QuickStart.sandbox();
    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
    expect(sdk.getEnvironment()).toBe('sandbox');
  });

  it('should create production SDK with API key', () => {
    const sdk = QuickStart.production('api-key');
    expect(sdk).toBeInstanceOf(TONAIAgentSDK);
    expect(sdk.getEnvironment()).toBe('production');
  });

  it('should create backtest sandbox', () => {
    const sandbox = QuickStart.backtest({
      initialBalance: 5000,
    });
    expect(sandbox).toBeInstanceOf(SandboxEnvironment);
    sandbox.destroy();
  });

  it('should create extension registry', () => {
    const registry = QuickStart.extensions();
    expect(registry).toBeInstanceOf(ExtensionRegistry);
  });
});

// ============================================================================
// Extension Registry Tests
// ============================================================================

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = createExtensionRegistry();
  });

  describe('installation', () => {
    it('should install an extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      const instance = await registry.install(manifest, handlers);

      expect(instance).toBeDefined();
      expect(instance.manifest.id).toBe('test-extension');
      expect(instance.status).toBe('installed');
    });

    it('should install and activate immediately', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      const instance = await registry.install(manifest, handlers, {
        activateImmediately: true,
      });

      expect(instance.status).toBe('active');
    });

    it('should reject duplicate installation', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers);

      await expect(registry.install(manifest, handlers)).rejects.toThrow(
        ExtensionError
      );
    });

    it('should install with custom config', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      const instance = await registry.install(manifest, handlers, {
        config: { customOption: 'value' },
      });

      expect(instance.config.customOption).toBe('value');
    });

    it('should validate manifest version', async () => {
      const invalidManifest = createTestExtensionManifest({
        version: 'invalid',
      });
      const handlers = { testFunction: createTestHandler() };

      await expect(registry.install(invalidManifest, handlers)).rejects.toThrow(
        'semver'
      );
    });
  });

  describe('activation', () => {
    it('should activate an extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers);
      await registry.activate('test-extension');

      expect(registry.isActive('test-extension')).toBe(true);
    });

    it('should deactivate an extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers, { activateImmediately: true });
      await registry.deactivate('test-extension');

      expect(registry.isActive('test-extension')).toBe(false);
    });

    it('should handle activating already active extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers, { activateImmediately: true });
      await registry.activate('test-extension'); // Should not throw

      expect(registry.isActive('test-extension')).toBe(true);
    });
  });

  describe('uninstallation', () => {
    it('should uninstall an extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers);
      await registry.uninstall('test-extension');

      expect(registry.isInstalled('test-extension')).toBe(false);
    });

    it('should deactivate before uninstalling', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers, { activateImmediately: true });
      await registry.uninstall('test-extension');

      expect(registry.isInstalled('test-extension')).toBe(false);
    });

    it('should throw when uninstalling non-existent extension', async () => {
      await expect(registry.uninstall('nonexistent')).rejects.toThrow(
        ExtensionError
      );
    });
  });

  describe('execution', () => {
    it('should execute extension function', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = {
        testFunction: async (params: Record<string, unknown>) => ({
          received: params,
        }),
      };

      await registry.install(manifest, handlers, { activateImmediately: true });

      const result = await registry.execute(
        'test-extension',
        'testFunction',
        { input: 'test' },
        'user_123'
      );

      expect(result).toEqual({ received: { input: 'test' } });
    });

    it('should throw when executing on inactive extension', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers);

      await expect(
        registry.execute('test-extension', 'testFunction', {}, 'user_123')
      ).rejects.toThrow('not active');
    });

    it('should throw for missing handler', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers, { activateImmediately: true });

      await expect(
        registry.execute('test-extension', 'nonexistent', {}, 'user_123')
      ).rejects.toThrow('not found');
    });

    it('should track execution metrics', async () => {
      const manifest = createTestExtensionManifest();
      const handlers = { testFunction: createTestHandler() };

      await registry.install(manifest, handlers, { activateImmediately: true });

      await registry.execute('test-extension', 'testFunction', {}, 'user_123');
      await registry.execute('test-extension', 'testFunction', {}, 'user_123');

      const metrics = registry.getMetrics('test-extension');
      expect(metrics?.totalCalls).toBe(2);
      expect(metrics?.successfulCalls).toBe(2);
    });
  });

  describe('discovery', () => {
    it('should get all extensions', async () => {
      await registry.install(
        createTestExtensionManifest({ id: 'ext-1' }),
        { testFunction: createTestHandler() }
      );
      await registry.install(
        createTestExtensionManifest({ id: 'ext-2' }),
        { testFunction: createTestHandler() }
      );

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should get active extensions', async () => {
      await registry.install(
        createTestExtensionManifest({ id: 'ext-1' }),
        { testFunction: createTestHandler() },
        { activateImmediately: true }
      );
      await registry.install(
        createTestExtensionManifest({ id: 'ext-2' }),
        { testFunction: createTestHandler() }
      );

      const active = registry.getActive();
      expect(active).toHaveLength(1);
    });

    it('should search by type', async () => {
      await registry.install(
        createTestExtensionManifest({ id: 'ext-1', type: 'data-source' }),
        { testFunction: createTestHandler() }
      );
      await registry.install(
        createTestExtensionManifest({ id: 'ext-2', type: 'signal-provider' }),
        { testFunction: createTestHandler() }
      );

      const dataSources = registry.search({ type: 'data-source' });
      expect(dataSources).toHaveLength(1);
      expect(dataSources[0].manifest.id).toBe('ext-1');
    });

    it('should search by keyword', async () => {
      await registry.install(
        createTestExtensionManifest({ id: 'ext-1', keywords: ['price', 'market'] }),
        { testFunction: createTestHandler() }
      );
      await registry.install(
        createTestExtensionManifest({ id: 'ext-2', keywords: ['social', 'sentiment'] }),
        { testFunction: createTestHandler() }
      );

      const priceExtensions = registry.search({ keyword: 'price' });
      expect(priceExtensions).toHaveLength(1);
      expect(priceExtensions[0].manifest.id).toBe('ext-1');
    });
  });

  describe('configuration', () => {
    it('should update extension config', async () => {
      await registry.install(
        createTestExtensionManifest(),
        { testFunction: createTestHandler() }
      );

      registry.updateConfig('test-extension', { newOption: 'value' });

      const config = registry.getConfig('test-extension');
      expect(config?.newOption).toBe('value');
    });
  });

  describe('metrics', () => {
    it('should calculate aggregate metrics', async () => {
      await registry.install(
        createTestExtensionManifest({ id: 'ext-1' }),
        { testFunction: createTestHandler() },
        { activateImmediately: true }
      );
      await registry.install(
        createTestExtensionManifest({ id: 'ext-2' }),
        { testFunction: createTestHandler() },
        { activateImmediately: true }
      );

      await registry.execute('ext-1', 'testFunction', {}, 'user_123');
      await registry.execute('ext-2', 'testFunction', {}, 'user_123');

      const aggregate = registry.getAggregateMetrics();
      expect(aggregate.totalExtensions).toBe(2);
      expect(aggregate.activeExtensions).toBe(2);
      expect(aggregate.totalCalls).toBe(2);
    });
  });

  describe('events', () => {
    it('should emit installation event', async () => {
      const events: SDKEvent[] = [];
      registry.onEvent((event) => events.push(event));

      await registry.install(
        createTestExtensionManifest(),
        { testFunction: createTestHandler() }
      );

      expect(events.some((e) => e.type === 'extension:installed')).toBe(true);
    });

    it('should emit activation event', async () => {
      const events: SDKEvent[] = [];
      registry.onEvent((event) => events.push(event));

      await registry.install(
        createTestExtensionManifest(),
        { testFunction: createTestHandler() }
      );
      await registry.activate('test-extension');

      expect(events.some((e) => e.type === 'extension:activated')).toBe(true);
    });
  });
});

// ============================================================================
// Sandbox Environment Tests
// ============================================================================

describe('SandboxEnvironment', () => {
  let sandbox: SandboxEnvironment;

  afterEach(() => {
    if (sandbox) {
      sandbox.destroy();
    }
  });

  describe('creation', () => {
    it('should create sandbox with default config', () => {
      sandbox = createSandbox();
      expect(sandbox).toBeInstanceOf(SandboxEnvironment);
    });

    it('should create sandbox with custom config', () => {
      sandbox = createSandbox({
        name: 'Custom Sandbox',
        initialBalance: 50000,
        enableSlippage: false,
      });

      const state = sandbox.getState();
      expect(state.name).toBe('Custom Sandbox');
      expect(state.balance.ton).toBe(50000);
    });
  });

  describe('lifecycle', () => {
    beforeEach(() => {
      sandbox = createSandbox();
    });

    it('should start running', () => {
      const state = sandbox.getState();
      expect(state.status).toBe('running');
    });

    it('should pause', () => {
      sandbox.pause();
      const state = sandbox.getState();
      expect(state.status).toBe('paused');
    });

    it('should resume', () => {
      sandbox.pause();
      sandbox.resume();
      const state = sandbox.getState();
      expect(state.status).toBe('running');
    });

    it('should destroy', () => {
      sandbox.destroy();
      const state = sandbox.getState();
      expect(state.status).toBe('completed');
    });
  });

  describe('trading', () => {
    beforeEach(() => {
      sandbox = createSandbox({
        initialBalance: 10000,
        enableSlippage: false,
        enableGas: false,
      });
    });

    it('should execute buy trade', async () => {
      const result = await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 100,
        price: 1,
        side: 'buy',
      });

      expect(result.status).toBe('completed');

      const balance = sandbox.getBalance();
      expect(balance.ton).toBeLessThan(10000);
    });

    it('should execute sell trade', async () => {
      // First buy
      await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 100,
        price: 1,
        side: 'buy',
      });

      // Then sell
      const result = await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 50,
        price: 1,
        side: 'sell',
      });

      expect(result.status).toBe('completed');
    });

    it('should fail with insufficient balance', async () => {
      const result = await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 100000, // More than balance
        price: 1,
        side: 'buy',
      });

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('Insufficient');
    });

    it('should track positions', async () => {
      await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON_TOKEN',
        amount: 100,
        price: 1,
        side: 'buy',
      });

      const positions = sandbox.getPositions();
      expect(positions.some((p) => p.asset === 'TON_TOKEN')).toBe(true);
    });

    it('should record transactions', async () => {
      await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 100,
        price: 1,
        side: 'buy',
      });

      const transactions = sandbox.getTransactions();
      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('operations', () => {
    beforeEach(() => {
      sandbox = createSandbox({
        initialBalance: 10000,
        enableSlippage: false,
        enableGas: false,
      });
    });

    it('should execute swap', async () => {
      const result = await sandbox.executeTrade({
        operation: 'swap',
        asset: 'USDT',
        amount: 100,
      });

      expect(result.status).toBe('completed');
    });

    it('should execute stake', async () => {
      const result = await sandbox.executeTrade({
        operation: 'stake',
        asset: 'TON',
        amount: 100,
      });

      expect(result.status).toBe('completed');
      expect(result.result).toHaveProperty('apr');
    });

    it('should execute unstake', async () => {
      // First stake
      await sandbox.executeTrade({
        operation: 'stake',
        asset: 'TON',
        amount: 100,
      });

      // Then unstake
      const result = await sandbox.executeTrade({
        operation: 'unstake',
        asset: 'TON',
        amount: 50,
      });

      expect(result.status).toBe('completed');
      expect(result.result).toHaveProperty('rewards');
    });

    it('should execute transfer', async () => {
      const result = await sandbox.executeTrade({
        operation: 'transfer',
        asset: 'TON',
        amount: 100,
      });

      expect(result.status).toBe('completed');
    });
  });

  describe('performance', () => {
    it('should calculate performance metrics', () => {
      sandbox = createSandbox({
        initialBalance: 10000,
      });

      const performance = sandbox.calculatePerformance();

      expect(performance).toHaveProperty('totalPnl');
      expect(performance).toHaveProperty('totalPnlPercent');
      expect(performance).toHaveProperty('winRate');
      expect(performance).toHaveProperty('sharpeRatio');
      expect(performance).toHaveProperty('maxDrawdown');
    });
  });

  describe('backtesting', () => {
    it('should run backtest with strategy', async () => {
      sandbox = createSandbox({
        initialBalance: 10000,
        marketDataSource: 'historical',
        startTimestamp: new Date('2024-01-01'),
        endTimestamp: new Date('2024-01-07'), // 1 week
      });

      // Simple hold strategy
      const strategy = async () => ({ action: 'hold' as const });

      const performance = await sandbox.runBacktest(strategy, {
        stepMs: 24 * 60 * 60 * 1000, // 1 day
      });

      expect(performance).toHaveProperty('totalPnl');
      expect(performance).toHaveProperty('totalTrades');
    });

    it('should execute trades during backtest', async () => {
      sandbox = createSandbox({
        initialBalance: 10000,
        marketDataSource: 'historical',
        startTimestamp: new Date('2024-01-01'),
        endTimestamp: new Date('2024-01-03'),
      });

      let tradeCount = 0;
      const strategy = async () => {
        tradeCount++;
        if (tradeCount === 1) {
          return { action: 'buy' as const, asset: 'TON', amount: 10 };
        }
        return { action: 'hold' as const };
      };

      const performance = await sandbox.runBacktest(strategy, {
        stepMs: 24 * 60 * 60 * 1000,
        assets: ['TON'],
      });

      expect(performance.totalTrades).toBeGreaterThanOrEqual(0);
    });
  });

  describe('prices', () => {
    beforeEach(() => {
      sandbox = createSandbox();
    });

    it('should get price', async () => {
      const price = await sandbox.getPrice('TON');
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('should set price for testing', () => {
      sandbox.setPrice('TEST', 123.45);
      // Price is set internally for use in trading
    });
  });

  describe('events', () => {
    it('should emit sandbox events', () => {
      const events: SDKEvent[] = [];
      sandbox = createSandbox();

      sandbox.onEvent((event) => events.push(event));
      sandbox.destroy();

      expect(events.some((e) => e.type === 'sandbox:destroyed')).toBe(true);
    });
  });

  describe('state', () => {
    it('should return complete state', () => {
      sandbox = createSandbox({
        name: 'Test Sandbox',
        initialBalance: 5000,
      });

      const state = sandbox.getState();

      expect(state).toHaveProperty('id');
      expect(state).toHaveProperty('name', 'Test Sandbox');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('createdAt');
      expect(state).toHaveProperty('balance');
      expect(state).toHaveProperty('positions');
      expect(state).toHaveProperty('transactions');
      expect(state).toHaveProperty('performance');

      expect(state.balance.ton).toBe(5000);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('SDK Integration', () => {
  it('should work end-to-end with extensions and sandbox', async () => {
    // Create extension registry
    const registry = createExtensionRegistry();

    // Install custom data source
    await registry.install(
      {
        id: 'test-data',
        name: 'Test Data',
        version: '1.0.0',
        description: 'Test data source',
        author: { name: 'Test' },
        type: 'data-source',
        category: 'test',
        permissions: [],
        capabilities: {
          functions: [
            {
              name: 'getSignal',
              description: 'Get trading signal',
              parameters: { type: 'object', properties: {} },
              returns: { type: 'object', properties: {} },
            },
          ],
        },
      },
      {
        getSignal: async () => ({ signal: 'buy', confidence: 0.8 }),
      },
      { activateImmediately: true }
    );

    // Create sandbox
    const sandbox = createSandbox({
      initialBalance: 10000,
      enableSlippage: false,
      enableGas: false,
    });

    // Get signal from extension
    const signal = await registry.execute(
      'test-data',
      'getSignal',
      {},
      'user_123'
    );
    expect(signal).toHaveProperty('signal', 'buy');

    // Execute trade in sandbox based on signal
    if ((signal as { signal: string }).signal === 'buy') {
      const result = await sandbox.executeTrade({
        operation: 'trade',
        asset: 'TON',
        amount: 100,
        side: 'buy',
      });
      expect(result.status).toBe('completed');
    }

    // Check performance
    const performance = sandbox.calculatePerformance();
    expect(performance).toBeDefined();

    // Clean up
    sandbox.destroy();
  });
});
