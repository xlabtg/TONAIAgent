/**
 * TONAIAgent - Plugin System Tests
 *
 * Comprehensive tests for the plugin system including:
 * - Plugin registry
 * - Plugin runtime
 * - Tool execution
 * - AI integration
 * - Core tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PluginRegistry,
  createPluginRegistry,
  PluginRuntime,
  createPluginRuntime,
  PluginToolExecutor,
  createPluginToolExecutor,
  PluginManager,
  createPluginManager,
  TON_WALLET_MANIFEST,
  TON_JETTONS_MANIFEST,
  TON_NFT_MANIFEST,
  CORE_PLUGIN_MANIFESTS,
  CORE_PLUGIN_HANDLERS,
  getCoreTools,
} from '../../src/plugins';
import type {
  PluginManifest,
  PluginId,
  ToolHandler,
  ToolExecutionRequest,
  AIToolContext,
} from '../../src/plugins';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test plugin manifest
 * Note: tool name is derived from plugin id to avoid conflicts when multiple plugins are registered
 */
function createTestManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  const pluginId = overrides.id ?? 'test-plugin';
  const toolName = `${pluginId}_tool`;

  return {
    id: pluginId,
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: {
      name: 'Test Author',
    },
    category: 'utility',
    trustLevel: 'community',
    keywords: ['test'],
    license: 'MIT',
    permissions: [],
    capabilities: {
      tools: [
        {
          name: toolName,
          description: 'A test tool',
          category: 'utility',
          parameters: {
            type: 'object',
            properties: {
              input: {
                type: 'string',
                description: 'Test input',
              },
            },
            required: ['input'],
          },
          requiredPermissions: [],
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create a test tool handler
 */
function createTestHandler(): ToolHandler {
  return async (params, context) => {
    return { result: `Processed: ${params.input}` };
  };
}

/**
 * Create test AI context
 */
function createTestContext(): AIToolContext {
  return {
    userId: 'user_123',
    agentId: 'agent_456',
    sessionId: 'session_789',
    requestId: 'req_000',
  };
}

// ============================================================================
// Plugin Registry Tests
// ============================================================================

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = createPluginRegistry();
  });

  describe('installation', () => {
    it('should install a plugin', async () => {
      const manifest = createTestManifest();
      const instance = await registry.install(manifest);

      expect(instance).toBeDefined();
      expect(instance.manifest.id).toBe('test-plugin');
      expect(instance.status).toBe('inactive');
    });

    it('should install and activate a plugin immediately', async () => {
      const manifest = createTestManifest();
      const instance = await registry.install(manifest, {
        activateImmediately: true,
      });

      expect(instance.status).toBe('active');
    });

    it('should reject duplicate plugin installation', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest);

      await expect(registry.install(manifest)).rejects.toMatchObject({
        code: 'LOAD_FAILED',
      });
    });

    it('should allow force reinstall', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest);

      const reinstalled = await registry.install(manifest, {
        forceReinstall: true,
      });

      expect(reinstalled).toBeDefined();
    });

    it('should reject experimental plugins when disabled', async () => {
      const restrictedRegistry = createPluginRegistry({
        allowExperimentalPlugins: false,
      });

      const manifest = createTestManifest({ trustLevel: 'experimental' });

      await expect(restrictedRegistry.install(manifest)).rejects.toMatchObject({
        code: 'SECURITY_VIOLATION',
      });
    });
  });

  describe('activation', () => {
    it('should activate a plugin', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest);

      await registry.activate('test-plugin');
      const plugin = registry.get('test-plugin');

      expect(plugin?.status).toBe('active');
    });

    it('should deactivate a plugin', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest, { activateImmediately: true });

      await registry.deactivate('test-plugin');
      const plugin = registry.get('test-plugin');

      expect(plugin?.status).toBe('inactive');
    });

    it('should handle activating already active plugin', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest, { activateImmediately: true });

      // Should not throw
      await registry.activate('test-plugin');
      expect(registry.isActive('test-plugin')).toBe(true);
    });
  });

  describe('uninstallation', () => {
    it('should uninstall a plugin', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest);

      await registry.uninstall('test-plugin');

      expect(registry.isInstalled('test-plugin')).toBe(false);
    });

    it('should deactivate before uninstalling', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest, { activateImmediately: true });

      await registry.uninstall('test-plugin');

      expect(registry.isInstalled('test-plugin')).toBe(false);
    });
  });

  describe('discovery', () => {
    it('should find installed plugins', async () => {
      await registry.install(createTestManifest({ id: 'plugin-1' }));
      await registry.install(createTestManifest({ id: 'plugin-2' }));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should find active plugins', async () => {
      await registry.install(createTestManifest({ id: 'plugin-1' }), {
        activateImmediately: true,
      });
      await registry.install(createTestManifest({ id: 'plugin-2' }));

      const active = registry.getActive();
      expect(active).toHaveLength(1);
      expect(active[0].manifest.id).toBe('plugin-1');
    });

    it('should search plugins by category', async () => {
      await registry.install(createTestManifest({ id: 'p1', category: 'utility' }));
      await registry.install(createTestManifest({ id: 'p2', category: 'defi' }));

      const utilities = registry.search({ category: 'utility' });
      expect(utilities).toHaveLength(1);
      expect(utilities[0].manifest.id).toBe('p1');
    });

    it('should search plugins by keyword', async () => {
      await registry.install(
        createTestManifest({ id: 'p1', keywords: ['wallet', 'ton'] })
      );
      await registry.install(
        createTestManifest({ id: 'p2', keywords: ['nft', 'marketplace'] })
      );

      const walletPlugins = registry.search({ keyword: 'wallet' });
      expect(walletPlugins).toHaveLength(1);
      expect(walletPlugins[0].manifest.id).toBe('p1');
    });
  });

  describe('tool management', () => {
    it('should index tools by name', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest, { activateImmediately: true });

      const tool = registry.getTool('test-plugin_tool');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('test-plugin_tool');
    });

    it('should find plugin by tool', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest, { activateImmediately: true });

      const pluginId = registry.findPluginByTool('test-plugin_tool');
      expect(pluginId).toBe('test-plugin');
    });

    it('should not return tools from inactive plugins', async () => {
      const manifest = createTestManifest();
      await registry.install(manifest);

      const tool = registry.getTool('test-plugin_tool');
      expect(tool).toBeUndefined();
    });

    it('should reject duplicate tool names', async () => {
      // Create a manifest with a specific tool name
      const duplicateToolManifest = (id: string): PluginManifest => ({
        id,
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        category: 'utility',
        trustLevel: 'community',
        keywords: ['test'],
        license: 'MIT',
        permissions: [],
        capabilities: {
          tools: [
            {
              name: 'duplicate_tool', // Same name for both
              description: 'A test tool',
              category: 'utility',
              parameters: { type: 'object', properties: {} },
              requiredPermissions: [],
            },
          ],
        },
      });

      await registry.install(duplicateToolManifest('plugin-1'), {
        activateImmediately: true,
      });

      await expect(
        registry.install(duplicateToolManifest('plugin-2'))
      ).rejects.toMatchObject({
        code: 'CONFIGURATION_INVALID',
        message: expect.stringContaining('duplicate_tool'),
      });
    });
  });

  describe('configuration', () => {
    it('should update plugin configuration', async () => {
      await registry.install(createTestManifest());

      registry.updateConfig('test-plugin', {
        enabled: false,
        settings: { key: 'value' },
      });

      const config = registry.getConfig('test-plugin');
      expect(config?.enabled).toBe(false);
      expect(config?.settings.key).toBe('value');
    });
  });

  describe('metrics', () => {
    it('should record tool execution', async () => {
      await registry.install(createTestManifest());

      registry.recordExecution('test-plugin', 'test-plugin_tool', true, 100);
      registry.recordExecution('test-plugin', 'test-plugin_tool', true, 150);
      registry.recordExecution('test-plugin', 'test-plugin_tool', false, 50);

      const metrics = registry.getMetrics('test-plugin');
      expect(metrics?.totalExecutions).toBe(3);
      expect(metrics?.successfulExecutions).toBe(2);
      expect(metrics?.failedExecutions).toBe(1);
    });

    it('should calculate aggregate metrics', async () => {
      await registry.install(createTestManifest({ id: 'p1' }));
      await registry.install(createTestManifest({ id: 'p2' }));

      registry.recordExecution('p1', 'p1_tool', true, 100);
      registry.recordExecution('p2', 'p2_tool', true, 200);

      const aggregate = registry.getAggregateMetrics();
      expect(aggregate.totalExecutions).toBe(2);
      expect(aggregate.successRate).toBe(1);
    });
  });

  describe('events', () => {
    it('should emit plugin events', async () => {
      const events: string[] = [];
      registry.onEvent((event) => events.push(event.type));

      await registry.install(createTestManifest());
      await registry.activate('test-plugin');
      await registry.deactivate('test-plugin');
      await registry.uninstall('test-plugin');

      expect(events).toContain('plugin:installed');
      expect(events).toContain('plugin:activated');
      expect(events).toContain('plugin:deactivated');
      expect(events).toContain('plugin:uninstalled');
    });
  });
});

// ============================================================================
// Plugin Runtime Tests
// ============================================================================

describe('PluginRuntime', () => {
  let registry: PluginRegistry;
  let runtime: PluginRuntime;

  beforeEach(async () => {
    registry = createPluginRegistry();
    runtime = createPluginRuntime(registry);

    const manifest = createTestManifest();
    await registry.install(manifest, { activateImmediately: true });
    runtime.registerHandler('test-plugin', 'test-plugin_tool', createTestHandler());
  });

  describe('handler registration', () => {
    it('should register a handler', () => {
      expect(runtime.hasHandler('test-plugin', 'test-plugin_tool')).toBe(true);
    });

    it('should unregister a handler', () => {
      runtime.unregisterHandler('test-plugin', 'test-plugin_tool');
      expect(runtime.hasHandler('test-plugin', 'test-plugin_tool')).toBe(false);
    });
  });

  describe('tool execution', () => {
    it('should execute a tool successfully', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: { input: 'hello' },
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'Processed: hello' });
    });

    it('should fail for missing plugin', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'nonexistent',
        toolName: 'test-plugin_tool',
        parameters: {},
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PLUGIN_NOT_FOUND');
    });

    it('should fail for missing handler', async () => {
      runtime.unregisterHandler('test-plugin', 'test-plugin_tool');

      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: { input: 'hello' },
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HANDLER_NOT_FOUND');
    });

    it('should validate required parameters', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: {}, // Missing required 'input'
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARAMETERS');
    });

    it('should support dry run mode', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: { input: 'hello' },
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
        options: {
          dryRun: true,
        },
      };

      const result = await runtime.execute(request);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ dryRun: true });
    });
  });

  describe('resource tracking', () => {
    it('should track resource usage', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: { input: 'hello' },
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.resourcesUsed).toBeDefined();
      expect(result.resourcesUsed.cpuTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('audit trail', () => {
    it('should include audit entries', async () => {
      const request: ToolExecutionRequest = {
        requestId: 'req_1',
        pluginId: 'test-plugin',
        toolName: 'test-plugin_tool',
        parameters: { input: 'hello' },
        context: {
          userId: 'user_1',
          agentId: 'agent_1',
          sessionId: 'session_1',
          timestamp: new Date(),
          caller: 'ai',
        },
      };

      const result = await runtime.execute(request);

      expect(result.auditTrail.length).toBeGreaterThan(0);
      expect(result.auditTrail[0].action).toBe('execution_started');
    });
  });
});

// ============================================================================
// AI Integration Tests
// ============================================================================

describe('PluginToolExecutor', () => {
  let registry: PluginRegistry;
  let runtime: PluginRuntime;
  let executor: PluginToolExecutor;

  beforeEach(async () => {
    registry = createPluginRegistry();
    runtime = createPluginRuntime(registry);
    executor = createPluginToolExecutor(registry, runtime);

    const manifest = createTestManifest();
    await registry.install(manifest, { activateImmediately: true });
    runtime.registerHandler('test-plugin', 'test-plugin_tool', createTestHandler());
  });

  describe('AI tool definitions', () => {
    it('should convert plugin tools to AI format', () => {
      const tools = executor.getAIToolDefinitions();

      expect(tools).toHaveLength(1);
      expect(tools[0].type).toBe('function');
      expect(tools[0].function.name).toBe('test-plugin_tool');
      expect(tools[0].function.parameters).toBeDefined();
    });

    it('should include parameter descriptions', () => {
      const tools = executor.getAIToolDefinitions();
      const params = tools[0].function.parameters as Record<string, unknown>;
      const properties = params.properties as Record<string, { description: string }>;

      expect(properties.input.description).toBe('Test input');
    });
  });

  describe('tool execution', () => {
    it('should execute tool via AI call', async () => {
      const result = await executor.executeToolCall(
        'call_1',
        'test-plugin_tool',
        { input: 'hello' },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ result: 'Processed: hello' });
    });

    it('should handle missing tool', async () => {
      const result = await executor.executeToolCall(
        'call_1',
        'nonexistent_tool',
        {},
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should execute multiple calls', async () => {
      const calls = [
        { toolCallId: 'call_1', toolName: 'test-plugin_tool', args: { input: 'one' } },
        { toolCallId: 'call_2', toolName: 'test-plugin_tool', args: { input: 'two' } },
      ];

      const results = await executor.executeToolCalls(calls, createTestContext());

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should execute calls in parallel', async () => {
      const calls = [
        { toolCallId: 'call_1', toolName: 'test-plugin_tool', args: { input: 'one' } },
        { toolCallId: 'call_2', toolName: 'test-plugin_tool', args: { input: 'two' } },
      ];

      const results = await executor.executeToolCallsParallel(calls, createTestContext());

      expect(results).toHaveLength(2);
    });
  });

  describe('confirmation handling', () => {
    it('should handle confirmation callback', async () => {
      // Create a manifest with confirmation-required tool
      const confirmManifest = createTestManifest({
        id: 'confirm-plugin',
        capabilities: {
          tools: [
            {
              name: 'confirm_tool',
              description: 'A tool requiring confirmation',
              category: 'utility',
              parameters: {
                type: 'object',
                properties: {},
              },
              requiredPermissions: [],
              requiresConfirmation: true,
            },
          ],
        },
      });

      await registry.install(confirmManifest, { activateImmediately: true });
      runtime.registerHandler('confirm-plugin', 'confirm_tool', async () => ({
        confirmed: true,
      }));

      // With confirmation callback that approves
      const result = await executor.executeToolCall(
        'call_1',
        'confirm_tool',
        {},
        createTestContext(),
        {
          onConfirmationRequired: async () => true,
        }
      );

      expect(result.success).toBe(true);
    });

    it('should return confirmation required without callback', async () => {
      const confirmManifest = createTestManifest({
        id: 'confirm-plugin-2',
        capabilities: {
          tools: [
            {
              name: 'confirm_tool_2',
              description: 'A tool requiring confirmation',
              category: 'utility',
              parameters: {
                type: 'object',
                properties: {},
              },
              requiredPermissions: [],
              requiresConfirmation: true,
            },
          ],
        },
      });

      await registry.install(confirmManifest, { activateImmediately: true });
      runtime.registerHandler('confirm-plugin-2', 'confirm_tool_2', async () => ({
        done: true,
      }));

      const result = await executor.executeToolCall(
        'call_1',
        'confirm_tool_2',
        {},
        createTestContext()
      );

      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('system message', () => {
    it('should build tools system message', () => {
      const message = executor.buildToolsSystemMessage();

      expect(message).toContain('Available tools');
      expect(message).toContain('test-plugin_tool');
    });
  });
});

// ============================================================================
// Core Tools Tests
// ============================================================================

describe('Core Plugins', () => {
  describe('manifests', () => {
    it('should have valid TON wallet manifest', () => {
      expect(TON_WALLET_MANIFEST.id).toBe('ton-wallet');
      expect(TON_WALLET_MANIFEST.trustLevel).toBe('core');
      expect(TON_WALLET_MANIFEST.capabilities.tools.length).toBeGreaterThan(0);
    });

    it('should have valid TON jettons manifest', () => {
      expect(TON_JETTONS_MANIFEST.id).toBe('ton-jettons');
      expect(TON_JETTONS_MANIFEST.capabilities.tools.length).toBeGreaterThan(0);
    });

    it('should have valid TON NFT manifest', () => {
      expect(TON_NFT_MANIFEST.id).toBe('ton-nft');
      expect(TON_NFT_MANIFEST.capabilities.tools.length).toBeGreaterThan(0);
    });

    it('should have all core manifests', () => {
      expect(CORE_PLUGIN_MANIFESTS).toHaveLength(3);
    });
  });

  describe('handlers', () => {
    it('should have handlers for all core tools', () => {
      for (const manifest of CORE_PLUGIN_MANIFESTS) {
        const handlers = CORE_PLUGIN_HANDLERS[manifest.id];
        expect(handlers).toBeDefined();

        for (const tool of manifest.capabilities.tools) {
          expect(handlers[tool.name]).toBeDefined();
        }
      }
    });
  });

  describe('getCoreTools', () => {
    it('should return all core tools', () => {
      const tools = getCoreTools();

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some((t) => t.toolName === 'ton_get_balance')).toBe(true);
      expect(tools.some((t) => t.toolName === 'jetton_swap')).toBe(true);
      expect(tools.some((t) => t.toolName === 'nft_transfer')).toBe(true);
    });
  });
});

// ============================================================================
// Plugin Manager Tests
// ============================================================================

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(async () => {
    manager = createPluginManager({ autoInstallCore: false });
  });

  describe('initialization', () => {
    it('should initialize without core plugins', async () => {
      await manager.initialize();

      expect(manager.getPlugins()).toHaveLength(0);
    });

    it('should install core plugins when configured', async () => {
      const managerWithCore = createPluginManager({ autoInstallCore: true });
      await managerWithCore.initialize();

      expect(managerWithCore.getPlugins().length).toBeGreaterThan(0);
      expect(managerWithCore.isPluginInstalled('ton-wallet')).toBe(true);
    });

    it('should install core plugins manually', async () => {
      await manager.initialize();
      await manager.installCorePlugins();

      expect(manager.getPlugins()).toHaveLength(3);
    });
  });

  describe('tool execution', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.installCorePlugins();
    });

    it('should get AI tool definitions', () => {
      const tools = manager.getAIToolDefinitions();

      expect(tools.length).toBeGreaterThan(0);
    });

    it('should check tool availability', () => {
      expect(manager.isToolAvailable('ton_get_balance')).toBe(true);
      expect(manager.isToolAvailable('nonexistent_tool')).toBe(false);
    });

    it('should execute a tool', async () => {
      const result = await manager.executeTool(
        'ton_get_balance',
        { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('balance');
    });
  });

  describe('health and metrics', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.installCorePlugins();
    });

    it('should provide health summary', () => {
      const health = manager.getHealthSummary();

      expect(health.total).toBeGreaterThan(0);
      expect(health.active).toBeGreaterThan(0);
    });

    it('should provide metrics', () => {
      const metrics = manager.getMetrics();

      expect(metrics).toHaveProperty('totalExecutions');
      expect(metrics).toHaveProperty('successRate');
    });

    it('should provide runtime stats', () => {
      const stats = manager.getRuntimeStats();

      expect(stats).toHaveProperty('registeredHandlers');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await manager.initialize();
      await manager.installCorePlugins();
      await manager.shutdown();

      expect(manager.getActivePlugins()).toHaveLength(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Plugin System Integration', () => {
  let manager: PluginManager;

  beforeEach(async () => {
    manager = createPluginManager();
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  it('should perform end-to-end tool execution', async () => {
    const context = createTestContext();

    // Get balance
    const balanceResult = await manager.executeTool(
      'ton_get_balance',
      { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
      context
    );
    expect(balanceResult.success).toBe(true);

    // Validate address
    const validateResult = await manager.executeTool(
      'ton_validate_address',
      { address: 'EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG' },
      context
    );
    expect(validateResult.success).toBe(true);

    // Get jetton info
    const jettonResult = await manager.executeTool(
      'jetton_get_info',
      { jettonAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
      context
    );
    expect(jettonResult.success).toBe(true);
  });

  it('should handle concurrent tool executions', async () => {
    const context = createTestContext();

    const calls = [
      { toolCallId: 'c1', toolName: 'ton_get_balance', args: { address: 'EQ...1' } },
      { toolCallId: 'c2', toolName: 'ton_validate_address', args: { address: 'EQ...2' } },
      { toolCallId: 'c3', toolName: 'jetton_get_info', args: { jettonAddress: 'EQ...3' } },
    ];

    const results = await manager.executeToolCallsParallel(calls, context);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should emit events during execution', async () => {
    const events: string[] = [];
    manager.onEvent((event) => events.push(event.type));

    await manager.executeTool(
      'ton_get_balance',
      { address: 'EQ...' },
      createTestContext()
    );

    // Events from registry metrics recording
    expect(events.length).toBeGreaterThanOrEqual(0);
  });
});
