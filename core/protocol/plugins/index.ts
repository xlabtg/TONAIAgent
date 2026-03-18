/**
 * TONAIAgent - Open Agent Protocol Plugins Module
 *
 * Plugin and Tool Ecosystem for the Open Agent Protocol.
 * Provides plugin lifecycle management, tool registry, and extensibility.
 */

import {
  ProtocolPlugin,
  PluginMetadata,
  PluginContext,
  ProtocolTool,
  ToolCategory,
  ToolResult,
  CostEstimate,
  JSONSchemaType,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Plugin registry configuration
 */
export interface PluginRegistryConfig {
  /** Enable plugin sandboxing */
  enableSandbox: boolean;

  /** Maximum plugins */
  maxPlugins: number;

  /** Plugin load timeout */
  loadTimeout: number;
}

/**
 * Plugin state
 */
export interface PluginState {
  /** Plugin metadata */
  metadata: PluginMetadata;

  /** Current status */
  status: 'loading' | 'loaded' | 'enabled' | 'disabled' | 'error';

  /** Load time */
  loadedAt?: Date;

  /** Error message if any */
  error?: string;

  /** Configuration */
  config?: unknown;
}

/**
 * Plugin event types
 */
export type PluginEventType =
  | 'plugin.loaded'
  | 'plugin.enabled'
  | 'plugin.disabled'
  | 'plugin.unloaded'
  | 'plugin.error'
  | 'tool.registered'
  | 'tool.executed';

/**
 * Plugin event
 */
export interface PluginEvent {
  /** Event type */
  type: PluginEventType;

  /** Plugin ID */
  pluginId: string;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Plugin event handler
 */
export type PluginEventHandler = (event: PluginEvent) => void;

// ============================================================================
// Plugin Registry Interface
// ============================================================================

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /** Load a plugin */
  load(plugin: ProtocolPlugin): Promise<void>;

  /** Unload a plugin */
  unload(pluginId: string): Promise<boolean>;

  /** Enable a plugin */
  enable(pluginId: string, config?: unknown): Promise<void>;

  /** Disable a plugin */
  disable(pluginId: string): Promise<void>;

  /** Get plugin state */
  getPlugin(pluginId: string): PluginState | undefined;

  /** Get all plugins */
  getPlugins(): PluginState[];

  /** Check if plugin is loaded */
  isLoaded(pluginId: string): boolean;

  /** Check if plugin is enabled */
  isEnabled(pluginId: string): boolean;

  /** Subscribe to events */
  subscribe(handler: PluginEventHandler): () => void;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /** Register a tool */
  register(tool: ProtocolTool): void;

  /** Unregister a tool */
  unregister(toolId: string): boolean;

  /** Get tool */
  getTool(toolId: string): ProtocolTool | undefined;

  /** Get tools by category */
  getToolsByCategory(category: ToolCategory): ProtocolTool[];

  /** List all tools */
  listTools(): ProtocolTool[];

  /** Execute tool */
  execute(toolId: string, input: unknown): Promise<ToolResult>;

  /** Estimate tool cost */
  estimate(toolId: string, input: unknown): Promise<CostEstimate>;
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Default plugin registry implementation
 */
export class DefaultPluginRegistry implements PluginRegistry {
  private config: PluginRegistryConfig;
  private plugins: Map<string, { plugin: ProtocolPlugin; state: PluginState }> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  private eventHandlers: Set<PluginEventHandler> = new Set();

  constructor(config: Partial<PluginRegistryConfig> = {}) {
    this.config = {
      enableSandbox: config.enableSandbox ?? true,
      maxPlugins: config.maxPlugins ?? 50,
      loadTimeout: config.loadTimeout ?? 10000,
    };
  }

  /**
   * Load a plugin
   */
  async load(plugin: ProtocolPlugin): Promise<void> {
    const { metadata } = plugin;

    // Check max plugins
    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error('Maximum plugins reached');
    }

    // Check if already loaded
    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin already loaded: ${metadata.id}`);
    }

    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!dep.optional && !this.isLoaded(dep.pluginId)) {
        throw new Error(`Missing dependency: ${dep.pluginId}`);
      }
    }

    const state: PluginState = {
      metadata,
      status: 'loading',
    };

    this.plugins.set(metadata.id, { plugin, state });

    try {
      // Create plugin context
      const context = this.createPluginContext(metadata.id);
      this.contexts.set(metadata.id, context);

      // Call onLoad
      await Promise.race([
        plugin.lifecycle.onLoad(context),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Load timeout')), this.config.loadTimeout)
        ),
      ]);

      state.status = 'loaded';
      state.loadedAt = new Date();

      this.emitEvent({
        type: 'plugin.loaded',
        pluginId: metadata.id,
        data: { name: metadata.name, version: metadata.version },
        timestamp: new Date(),
      });
    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : 'Unknown error';

      this.emitEvent({
        type: 'plugin.error',
        pluginId: metadata.id,
        data: { error: state.error },
        timestamp: new Date(),
      });

      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginId: string): Promise<boolean> {
    const entry = this.plugins.get(pluginId);
    if (!entry) return false;

    try {
      // Disable first if enabled
      if (entry.state.status === 'enabled') {
        await this.disable(pluginId);
      }

      // Call onUnload
      await entry.plugin.lifecycle.onUnload();

      // Remove
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);

      this.emitEvent({
        type: 'plugin.unloaded',
        pluginId,
        data: {},
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      entry.state.status = 'error';
      entry.state.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string, config?: unknown): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state.status !== 'loaded' && entry.state.status !== 'disabled') {
      throw new Error(`Plugin cannot be enabled in state: ${entry.state.status}`);
    }

    try {
      await entry.plugin.lifecycle.onEnable(config);
      entry.state.status = 'enabled';
      entry.state.config = config;

      this.emitEvent({
        type: 'plugin.enabled',
        pluginId,
        data: { config },
        timestamp: new Date(),
      });
    } catch (error) {
      entry.state.status = 'error';
      entry.state.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.state.status !== 'enabled') {
      throw new Error(`Plugin is not enabled: ${pluginId}`);
    }

    try {
      await entry.plugin.lifecycle.onDisable();
      entry.state.status = 'disabled';

      this.emitEvent({
        type: 'plugin.disabled',
        pluginId,
        data: {},
        timestamp: new Date(),
      });
    } catch (error) {
      entry.state.status = 'error';
      entry.state.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get plugin state
   */
  getPlugin(pluginId: string): PluginState | undefined {
    return this.plugins.get(pluginId)?.state;
  }

  /**
   * Get all plugins
   */
  getPlugins(): PluginState[] {
    return Array.from(this.plugins.values()).map(e => e.state);
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    const state = this.plugins.get(pluginId)?.state;
    return state !== undefined && state.status !== 'error';
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.state.status === 'enabled';
  }

  /**
   * Subscribe to events
   */
  subscribe(handler: PluginEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createPluginContext(pluginId: string): PluginContext {
    const storage = new Map<string, unknown>();

    return {
      protocol: {},
      logger: {
        debug: (msg, ...args) => console.debug(`[${pluginId}]`, msg, ...args),
        info: (msg, ...args) => console.info(`[${pluginId}]`, msg, ...args),
        warn: (msg, ...args) => console.warn(`[${pluginId}]`, msg, ...args),
        error: (msg, ...args) => console.error(`[${pluginId}]`, msg, ...args),
      },
      storage: {
        get: async (key) => storage.get(key),
        set: async (key, value) => { storage.set(key, value); },
        delete: async (key) => storage.delete(key),
        list: async (prefix) => {
          const keys: string[] = [];
          for (const key of storage.keys()) {
            if (!prefix || key.startsWith(prefix)) {
              keys.push(key);
            }
          }
          return keys;
        },
      },
      events: {
        emit: (event, data) => {
          this.emitEvent({
            type: 'plugin.enabled',
            pluginId,
            data: { event, ...data as Record<string, unknown> },
            timestamp: new Date(),
          });
        },
        on: (_event, _handler) => {
          // Simplified event subscription (would be used in production)
          void _event;
          void _handler;
          return () => {};
        },
      },
    };
  }

  private emitEvent(event: PluginEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in plugin event handler:', error);
      }
    }
  }
}

/**
 * Default tool registry implementation
 */
export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, ProtocolTool> = new Map();
  private byCategory: Map<ToolCategory, Set<string>> = new Map();

  /**
   * Register a tool
   */
  register(tool: ProtocolTool): void {
    this.tools.set(tool.id, tool);

    const categoryTools = this.byCategory.get(tool.category) ?? new Set();
    categoryTools.add(tool.id);
    this.byCategory.set(tool.category, categoryTools);
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    this.tools.delete(toolId);

    const categoryTools = this.byCategory.get(tool.category);
    if (categoryTools) {
      categoryTools.delete(toolId);
    }

    return true;
  }

  /**
   * Get tool
   */
  getTool(toolId: string): ProtocolTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): ProtocolTool[] {
    const toolIds = this.byCategory.get(category) ?? new Set();
    return Array.from(toolIds)
      .map(id => this.tools.get(id))
      .filter((t): t is ProtocolTool => t !== undefined);
  }

  /**
   * List all tools
   */
  listTools(): ProtocolTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute tool
   */
  async execute(toolId: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      const result = await tool.execute(input);
      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Estimate tool cost
   */
  async estimate(toolId: string, input: unknown): Promise<CostEstimate> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    return tool.estimateCost(input);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create plugin registry
 */
export function createPluginRegistry(
  config?: Partial<PluginRegistryConfig>
): PluginRegistry {
  return new DefaultPluginRegistry(config);
}

/**
 * Create tool registry
 */
export function createToolRegistry(): ToolRegistry {
  return new DefaultToolRegistry();
}

/**
 * Create a simple tool
 */
export function createTool(params: {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: JSONSchemaType;
  outputSchema: JSONSchemaType;
  execute: (input: unknown) => Promise<ToolResult>;
  estimateCost?: (input: unknown) => Promise<CostEstimate>;
}): ProtocolTool {
  return {
    id: params.id,
    name: params.name,
    description: params.description,
    category: params.category,
    inputSchema: params.inputSchema,
    outputSchema: params.outputSchema,
    execute: params.execute,
    estimateCost: params.estimateCost ?? (async () => ({
      fees: 0,
      feeCurrency: 'TON',
      estimatedTime: 1000,
      confidence: 0.9,
    })),
  };
}
