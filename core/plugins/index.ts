/**
 * TONAIAgent - Plugin System
 *
 * Production-grade plugin and tooling system for AI agents.
 *
 * Features:
 * - Modular plugin architecture with sandboxed execution
 * - Permission system with fine-grained access control
 * - TON-native core tools (wallet, jettons, NFTs)
 * - AI integration with function calling support
 * - Plugin lifecycle management
 * - Observability and metrics
 *
 * @example
 * ```typescript
 * import {
 *   createPluginManager,
 *   TON_WALLET_MANIFEST,
 *   TON_JETTONS_MANIFEST,
 * } from './plugins';
 *
 * // Create plugin manager
 * const manager = createPluginManager();
 *
 * // Install core plugins
 * await manager.installCorePlugins();
 *
 * // Get AI tools
 * const tools = manager.getAIToolDefinitions();
 *
 * // Execute a tool
 * const result = await manager.executeTool('ton_get_balance', {
 *   address: 'EQ...',
 * }, context);
 * ```
 */

// Export all types
export * from './types';

// Export registry
export {
  PluginRegistry,
  createPluginRegistry,
  type PluginRegistryConfig,
  type PluginSearchOptions,
  type PluginInstallOptions,
  type PluginUpdateOptions,
} from './registry';

// Export runtime
export {
  PluginRuntime,
  createPluginRuntime,
  type PluginRuntimeConfig,
  type ToolHandler,
  type ToolExecutionContext,
} from './runtime';

// Export AI integration
export {
  PluginToolExecutor,
  createPluginToolExecutor,
  type AIToolContext,
  type AIToolExecutionOptions,
  type AIToolCallResult,
} from './ai-integration';

// Export core tools
export {
  // Manifests
  TON_WALLET_MANIFEST,
  TON_JETTONS_MANIFEST,
  TON_NFT_MANIFEST,
  CORE_PLUGIN_MANIFESTS,
  CORE_PLUGIN_HANDLERS,
  // Utilities
  getCoreTools,
  getHandler,
  // Handlers (for direct use)
  TON_WALLET_HANDLERS,
  TON_JETTONS_HANDLERS,
  TON_NFT_HANDLERS,
} from './tools';

// ============================================================================
// Imports for Plugin Manager
// ============================================================================

import { PluginRegistry, createPluginRegistry, PluginRegistryConfig } from './registry';
import { PluginRuntime, createPluginRuntime, PluginRuntimeConfig, ToolHandler } from './runtime';
import { PluginToolExecutor, createPluginToolExecutor, AIToolContext, AIToolExecutionOptions, AIToolCallResult } from './ai-integration';
import { CORE_PLUGIN_MANIFESTS, CORE_PLUGIN_HANDLERS } from './tools';
import { PluginId, PluginManifest, PluginInstance, PluginEventCallback } from './types';
import { ToolDefinition } from '../ai/types';

// ============================================================================
// Plugin Manager
// ============================================================================

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  /** Registry configuration */
  registry?: Partial<PluginRegistryConfig>;

  /** Runtime configuration */
  runtime?: Partial<PluginRuntimeConfig>;

  /** Auto-install core plugins */
  autoInstallCore?: boolean;

  /** Event callback */
  onEvent?: PluginEventCallback;
}

/**
 * Plugin Manager
 *
 * Unified interface for the plugin system, coordinating:
 * - Plugin registry
 * - Plugin runtime
 * - AI integration
 * - Core plugin management
 */
export class PluginManager {
  private readonly registry: PluginRegistry;
  private readonly runtime: PluginRuntime;
  private readonly executor: PluginToolExecutor;
  private readonly config: PluginManagerConfig;
  private initialized = false;

  constructor(config: PluginManagerConfig = {}) {
    this.config = config;

    // Create registry
    this.registry = createPluginRegistry({
      ...config.registry,
      onEvent: config.onEvent,
    });

    // Create runtime
    this.runtime = createPluginRuntime(this.registry, config.runtime);

    // Create AI tool executor
    this.executor = createPluginToolExecutor(this.registry, this.runtime);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Install core plugins if configured
    if (this.config.autoInstallCore !== false) {
      await this.installCorePlugins();
    }

    // Start health monitoring
    this.registry.startHealthMonitoring();

    this.initialized = true;
  }

  /**
   * Shutdown the plugin manager
   */
  async shutdown(): Promise<void> {
    this.registry.stopHealthMonitoring();

    // Deactivate all plugins
    for (const plugin of this.registry.getActive()) {
      await this.registry.deactivate(plugin.manifest.id);
    }

    this.initialized = false;
  }

  // ==========================================================================
  // Core Plugin Management
  // ==========================================================================

  /**
   * Install all core plugins
   */
  async installCorePlugins(): Promise<void> {
    for (const manifest of CORE_PLUGIN_MANIFESTS) {
      // Install plugin
      await this.registry.install(manifest, { activateImmediately: true });

      // Register handlers
      const handlers = CORE_PLUGIN_HANDLERS[manifest.id];
      if (handlers) {
        for (const [toolName, handler] of Object.entries(handlers)) {
          this.runtime.registerHandler(manifest.id, toolName, handler);
        }
      }
    }
  }

  /**
   * Install a single plugin with its handlers
   */
  async installPlugin(
    manifest: PluginManifest,
    handlers: Record<string, ToolHandler>,
    options?: { activateImmediately?: boolean }
  ): Promise<PluginInstance> {
    const instance = await this.registry.install(manifest, options);

    // Register handlers
    for (const [toolName, handler] of Object.entries(handlers)) {
      this.runtime.registerHandler(manifest.id, toolName, handler);
    }

    return instance;
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: PluginId): Promise<void> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      return;
    }

    // Unregister handlers
    for (const tool of plugin.manifest.capabilities.tools) {
      this.runtime.unregisterHandler(pluginId, tool.name);
    }

    // Uninstall from registry
    await this.registry.uninstall(pluginId);
  }

  // ==========================================================================
  // Plugin Discovery
  // ==========================================================================

  /**
   * Get all installed plugins
   */
  getPlugins(): PluginInstance[] {
    return this.registry.getAll();
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): PluginInstance[] {
    return this.registry.getActive();
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: PluginId): PluginInstance | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Check if plugin is installed
   */
  isPluginInstalled(pluginId: PluginId): boolean {
    return this.registry.isInstalled(pluginId);
  }

  /**
   * Check if plugin is active
   */
  isPluginActive(pluginId: PluginId): boolean {
    return this.registry.isActive(pluginId);
  }

  // ==========================================================================
  // Tool Management
  // ==========================================================================

  /**
   * Get all AI tool definitions
   */
  getAIToolDefinitions(): ToolDefinition[] {
    return this.executor.getAIToolDefinitions();
  }

  /**
   * Get tools for a specific plugin
   */
  getPluginTools(pluginId: PluginId): ToolDefinition[] {
    return this.executor.getPluginAITools(pluginId);
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolName: string): boolean {
    return this.executor.isToolAvailable(toolName);
  }

  /**
   * Build system message with available tools
   */
  buildToolsSystemMessage(): string {
    return this.executor.buildToolsSystemMessage();
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a single tool
   */
  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: AIToolContext,
    options?: AIToolExecutionOptions
  ): Promise<AIToolCallResult> {
    return this.executor.executeToolCall(
      `call_${Date.now()}`,
      toolName,
      params,
      context,
      options
    );
  }

  /**
   * Execute multiple tool calls (from AI)
   */
  async executeToolCalls(
    calls: Array<{
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }>,
    context: AIToolContext,
    options?: AIToolExecutionOptions
  ): Promise<AIToolCallResult[]> {
    return this.executor.executeToolCalls(calls, context, options);
  }

  /**
   * Execute tool calls in parallel
   */
  async executeToolCallsParallel(
    calls: Array<{
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }>,
    context: AIToolContext,
    options?: AIToolExecutionOptions
  ): Promise<AIToolCallResult[]> {
    return this.executor.executeToolCallsParallel(calls, context, options);
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to plugin events
   */
  onEvent(callback: PluginEventCallback): void {
    this.registry.onEvent(callback);
  }

  /**
   * Unsubscribe from plugin events
   */
  offEvent(callback: PluginEventCallback): void {
    this.registry.offEvent(callback);
  }

  // ==========================================================================
  // Health & Metrics
  // ==========================================================================

  /**
   * Get health summary
   */
  getHealthSummary() {
    return this.registry.getHealthSummary();
  }

  /**
   * Get aggregate metrics
   */
  getMetrics() {
    return this.registry.getAggregateMetrics();
  }

  /**
   * Get runtime statistics
   */
  getRuntimeStats() {
    return this.runtime.getStats();
  }

  // ==========================================================================
  // Internal Access
  // ==========================================================================

  /**
   * Get the plugin registry (for advanced use)
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get the plugin runtime (for advanced use)
   */
  getRuntime(): PluginRuntime {
    return this.runtime;
  }

  /**
   * Get the tool executor (for advanced use)
   */
  getExecutor(): PluginToolExecutor {
    return this.executor;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a plugin manager
 */
export function createPluginManager(
  config?: PluginManagerConfig
): PluginManager {
  return new PluginManager(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default PluginManager;
