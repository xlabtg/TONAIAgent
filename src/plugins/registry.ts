/**
 * TONAIAgent - Plugin Registry
 *
 * Central registry for managing plugin lifecycle, discovery, and access control.
 * Provides plugin installation, activation, and version management.
 */

import {
  PluginId,
  PluginManifest,
  PluginInstance,
  PluginStatus,
  PluginConfig,
  PluginError,
  PluginErrorCode,
  PluginMetrics,
  PluginHealth,
  HealthCheck,
  PluginEvent,
  PluginEventType,
  PluginEventCallback,
  ToolDefinition,
  PermissionScope,
  PluginTrustLevel,
  PluginCategory,
} from './types';

// ============================================================================
// Plugin Registry Types
// ============================================================================

/**
 * Plugin registry configuration
 */
export interface PluginRegistryConfig {
  /** Maximum number of plugins */
  maxPlugins: number;

  /** Allow community plugins */
  allowCommunityPlugins: boolean;

  /** Allow experimental plugins */
  allowExperimentalPlugins: boolean;

  /** Auto-update enabled plugins */
  autoUpdate: boolean;

  /** Plugin health check interval (ms) */
  healthCheckIntervalMs: number;

  /** Plugin load timeout (ms) */
  loadTimeoutMs: number;

  /** Enable plugin metrics */
  enableMetrics: boolean;

  /** Event callback */
  onEvent?: PluginEventCallback;
}

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  category?: PluginCategory;
  trustLevel?: PluginTrustLevel;
  status?: PluginStatus;
  keyword?: string;
  hasPermission?: PermissionScope;
  hasTool?: string;
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  /** Skip permission review */
  skipPermissionReview?: boolean;

  /** Initial configuration */
  config?: Partial<PluginConfig>;

  /** Activate immediately after install */
  activateImmediately?: boolean;

  /** Force reinstall if exists */
  forceReinstall?: boolean;
}

/**
 * Plugin update options
 */
export interface PluginUpdateOptions {
  /** Target version (defaults to latest) */
  version?: string;

  /** Preserve configuration */
  preserveConfig?: boolean;

  /** Backup before update */
  backup?: boolean;

  /** Auto-rollback on failure */
  autoRollback?: boolean;
}

// ============================================================================
// Plugin Registry Implementation
// ============================================================================

/**
 * Default registry configuration
 */
const DEFAULT_CONFIG: PluginRegistryConfig = {
  maxPlugins: 100,
  allowCommunityPlugins: true,
  allowExperimentalPlugins: false,
  autoUpdate: false,
  healthCheckIntervalMs: 60000,
  loadTimeoutMs: 30000,
  enableMetrics: true,
};

/**
 * Plugin Registry
 *
 * Manages the complete lifecycle of plugins including:
 * - Installation and uninstallation
 * - Activation and deactivation
 * - Version management and updates
 * - Health monitoring
 * - Permission management
 */
export class PluginRegistry {
  private readonly plugins = new Map<PluginId, PluginInstance>();
  private readonly toolIndex = new Map<string, PluginId>();
  private readonly eventCallbacks: PluginEventCallback[] = [];
  private readonly config: PluginRegistryConfig;
  private healthCheckInterval?: ReturnType<typeof setInterval>;

  constructor(config: Partial<PluginRegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.onEvent) {
      this.eventCallbacks.push(this.config.onEvent);
    }
  }

  // ==========================================================================
  // Plugin Lifecycle Management
  // ==========================================================================

  /**
   * Install a plugin
   */
  async install(
    manifest: PluginManifest,
    options: PluginInstallOptions = {}
  ): Promise<PluginInstance> {
    // Validate manifest
    this.validateManifest(manifest);

    // Check if already installed
    if (this.plugins.has(manifest.id) && !options.forceReinstall) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${manifest.id} is already installed`
      );
    }

    // Check plugin limits
    if (this.plugins.size >= this.config.maxPlugins) {
      throw this.createError(
        'RESOURCE_EXHAUSTED',
        `Maximum plugin limit (${this.config.maxPlugins}) reached`
      );
    }

    // Validate trust level
    if (
      manifest.trustLevel === 'experimental' &&
      !this.config.allowExperimentalPlugins
    ) {
      throw this.createError(
        'SECURITY_VIOLATION',
        'Experimental plugins are not allowed'
      );
    }

    if (
      manifest.trustLevel === 'community' &&
      !this.config.allowCommunityPlugins
    ) {
      throw this.createError(
        'SECURITY_VIOLATION',
        'Community plugins are not allowed'
      );
    }

    // Check dependencies
    await this.validateDependencies(manifest);

    // Create plugin instance
    const instance: PluginInstance = {
      manifest,
      status: 'inactive',
      config: this.createDefaultConfig(manifest, options.config),
      installedAt: new Date(),
      metrics: this.createInitialMetrics(),
      health: { status: 'healthy', lastCheck: new Date(), checks: [] },
    };

    // Register tools
    this.registerTools(manifest);

    // Store plugin
    this.plugins.set(manifest.id, instance);

    // Emit event
    this.emitEvent('plugin:installed', manifest.id, {
      version: manifest.version,
      category: manifest.category,
      toolCount: manifest.capabilities.tools.length,
    });

    // Activate if requested
    if (options.activateImmediately) {
      await this.activate(manifest.id);
    }

    return instance;
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: PluginId): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    // Deactivate if active
    if (instance.status === 'active') {
      await this.deactivate(pluginId);
    }

    // Unregister tools
    this.unregisterTools(instance.manifest);

    // Remove plugin
    this.plugins.delete(pluginId);

    // Emit event
    this.emitEvent('plugin:uninstalled', pluginId, {
      version: instance.manifest.version,
    });
  }

  /**
   * Activate a plugin
   */
  async activate(pluginId: PluginId): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    if (instance.status === 'active') {
      return; // Already active
    }

    if (instance.status === 'error') {
      throw this.createError(
        'LOAD_FAILED',
        `Cannot activate plugin in error state: ${instance.error?.message}`
      );
    }

    // Update status
    instance.status = 'active';
    instance.activatedAt = new Date();

    // Emit event
    this.emitEvent('plugin:activated', pluginId, {
      version: instance.manifest.version,
    });
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(pluginId: PluginId): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    if (instance.status !== 'active') {
      return; // Not active
    }

    // Update status
    instance.status = 'inactive';

    // Emit event
    this.emitEvent('plugin:deactivated', pluginId, {
      version: instance.manifest.version,
    });
  }

  /**
   * Update a plugin
   */
  async update(
    pluginId: PluginId,
    newManifest: PluginManifest,
    options: PluginUpdateOptions = {}
  ): Promise<PluginInstance> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    // Validate version upgrade
    if (newManifest.version <= instance.manifest.version) {
      throw this.createError(
        'VERSION_MISMATCH',
        `New version must be greater than current version`
      );
    }

    // Validate manifest
    this.validateManifest(newManifest);

    // Store old state for rollback
    const oldManifest = instance.manifest;
    const oldConfig = instance.config;
    const wasActive = instance.status === 'active';

    try {
      // Deactivate if active
      if (wasActive) {
        await this.deactivate(pluginId);
      }

      // Update tools
      this.unregisterTools(oldManifest);
      this.registerTools(newManifest);

      // Update instance
      instance.manifest = newManifest;
      instance.updatedAt = new Date();

      if (!options.preserveConfig) {
        instance.config = this.createDefaultConfig(newManifest);
      }

      // Reactivate if was active
      if (wasActive) {
        await this.activate(pluginId);
      }

      // Emit event
      this.emitEvent('plugin:updated', pluginId, {
        oldVersion: oldManifest.version,
        newVersion: newManifest.version,
      });

      return instance;
    } catch (error) {
      // Rollback on failure
      if (options.autoRollback) {
        this.unregisterTools(newManifest);
        this.registerTools(oldManifest);
        instance.manifest = oldManifest;
        instance.config = oldConfig;

        if (wasActive) {
          await this.activate(pluginId);
        }
      }

      throw error;
    }
  }

  /**
   * Disable a plugin (admin action)
   */
  async disable(pluginId: PluginId, reason?: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    // Deactivate if active
    if (instance.status === 'active') {
      await this.deactivate(pluginId);
    }

    instance.status = 'disabled';

    this.emitEvent('plugin:deactivated', pluginId, {
      reason: reason ?? 'Administratively disabled',
      admin: true,
    });
  }

  /**
   * Enable a disabled plugin
   */
  async enable(pluginId: PluginId): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    if (instance.status !== 'disabled') {
      return;
    }

    instance.status = 'inactive';

    this.emitEvent('plugin:activated', pluginId, {
      admin: true,
    });
  }

  // ==========================================================================
  // Plugin Discovery
  // ==========================================================================

  /**
   * Get a plugin by ID
   */
  get(pluginId: PluginId): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins
   */
  getActive(): PluginInstance[] {
    return this.getAll().filter((p) => p.status === 'active');
  }

  /**
   * Search plugins
   */
  search(options: PluginSearchOptions): PluginInstance[] {
    return this.getAll().filter((plugin) => {
      if (options.category && plugin.manifest.category !== options.category) {
        return false;
      }

      if (
        options.trustLevel &&
        plugin.manifest.trustLevel !== options.trustLevel
      ) {
        return false;
      }

      if (options.status && plugin.status !== options.status) {
        return false;
      }

      if (options.keyword) {
        const keyword = options.keyword.toLowerCase();
        const matchesName = plugin.manifest.name.toLowerCase().includes(keyword);
        const matchesDesc = plugin.manifest.description
          .toLowerCase()
          .includes(keyword);
        const matchesKeywords = plugin.manifest.keywords.some((k) =>
          k.toLowerCase().includes(keyword)
        );
        if (!matchesName && !matchesDesc && !matchesKeywords) {
          return false;
        }
      }

      if (options.hasPermission) {
        const hasPermission = plugin.manifest.permissions.some(
          (p) => p.scope === options.hasPermission
        );
        if (!hasPermission) {
          return false;
        }
      }

      if (options.hasTool) {
        const hasTool = plugin.manifest.capabilities.tools.some(
          (t) => t.name === options.hasTool
        );
        if (!hasTool) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get plugins by category
   */
  getByCategory(category: PluginCategory): PluginInstance[] {
    return this.search({ category });
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(pluginId: PluginId): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is active
   */
  isActive(pluginId: PluginId): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.status === 'active';
  }

  // ==========================================================================
  // Tool Management
  // ==========================================================================

  /**
   * Get a tool definition by name
   */
  getTool(toolName: string): ToolDefinition | undefined {
    const pluginId = this.toolIndex.get(toolName);
    if (!pluginId) {
      return undefined;
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      return undefined;
    }

    return plugin.manifest.capabilities.tools.find((t) => t.name === toolName);
  }

  /**
   * Get all available tools
   */
  getAllTools(): Array<{ pluginId: PluginId; tool: ToolDefinition }> {
    const tools: Array<{ pluginId: PluginId; tool: ToolDefinition }> = [];

    for (const plugin of this.getActive()) {
      for (const tool of plugin.manifest.capabilities.tools) {
        tools.push({ pluginId: plugin.manifest.id, tool });
      }
    }

    return tools;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(
    category: string
  ): Array<{ pluginId: PluginId; tool: ToolDefinition }> {
    return this.getAllTools().filter((t) => t.tool.category === category);
  }

  /**
   * Find plugin that owns a tool
   */
  findPluginByTool(toolName: string): PluginId | undefined {
    return this.toolIndex.get(toolName);
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  /**
   * Update plugin configuration
   */
  updateConfig(pluginId: PluginId, config: Partial<PluginConfig>): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw this.createError(
        'LOAD_FAILED',
        `Plugin ${pluginId} is not installed`
      );
    }

    instance.config = { ...instance.config, ...config };

    this.emitEvent('plugin:config_changed', pluginId, {
      config: instance.config,
    });
  }

  /**
   * Get plugin configuration
   */
  getConfig(pluginId: PluginId): PluginConfig | undefined {
    return this.plugins.get(pluginId)?.config;
  }

  // ==========================================================================
  // Health Monitoring
  // ==========================================================================

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckIntervalMs
    );
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Run health checks for all active plugins
   */
  async runHealthChecks(): Promise<void> {
    for (const plugin of this.getActive()) {
      try {
        const health = await this.checkPluginHealth(plugin);
        plugin.health = health;

        if (health.status === 'unhealthy') {
          this.emitEvent(
            'plugin:error',
            plugin.manifest.id,
            {
              health,
              reason: 'Health check failed',
            },
            'warning'
          );
        }
      } catch (error) {
        plugin.health = {
          status: 'unhealthy',
          lastCheck: new Date(),
          checks: [
            {
              name: 'health_check',
              status: 'fail',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          ],
        };
      }
    }
  }

  /**
   * Check individual plugin health
   */
  private async checkPluginHealth(plugin: PluginInstance): Promise<PluginHealth> {
    const checks: HealthCheck[] = [];

    // Check metrics
    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Metrics collection active';

    if (plugin.metrics.failedExecutions > plugin.metrics.successfulExecutions) {
      status = 'warn';
      message = 'High failure rate detected';
    }

    checks.push({ name: 'metrics', status, message });

    // Determine overall status
    const hasFailure = checks.some((c) => c.status === 'fail');
    const hasWarning = checks.some((c) => c.status === 'warn');

    return {
      status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
      lastCheck: new Date(),
      checks,
    };
  }

  /**
   * Get registry health summary
   */
  getHealthSummary(): {
    total: number;
    active: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    disabled: number;
    error: number;
  } {
    const plugins = this.getAll();

    return {
      total: plugins.length,
      active: plugins.filter((p) => p.status === 'active').length,
      healthy: plugins.filter((p) => p.health.status === 'healthy').length,
      degraded: plugins.filter((p) => p.health.status === 'degraded').length,
      unhealthy: plugins.filter((p) => p.health.status === 'unhealthy').length,
      disabled: plugins.filter((p) => p.status === 'disabled').length,
      error: plugins.filter((p) => p.status === 'error').length,
    };
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  /**
   * Record tool execution
   */
  recordExecution(
    pluginId: PluginId,
    toolName: string,
    success: boolean,
    durationMs: number
  ): void {
    const instance = this.plugins.get(pluginId);
    if (!instance || !this.config.enableMetrics) {
      return;
    }

    // Update plugin metrics
    instance.metrics.totalExecutions++;
    if (success) {
      instance.metrics.successfulExecutions++;
    } else {
      instance.metrics.failedExecutions++;
    }
    instance.metrics.totalExecutionTimeMs += durationMs;
    instance.metrics.avgExecutionTimeMs =
      instance.metrics.totalExecutionTimeMs / instance.metrics.totalExecutions;
    instance.metrics.lastExecutionAt = new Date();

    // Update tool metrics
    if (!instance.metrics.toolMetrics[toolName]) {
      instance.metrics.toolMetrics[toolName] = {
        executions: 0,
        successes: 0,
        failures: 0,
        avgDurationMs: 0,
      };
    }

    const toolMetrics = instance.metrics.toolMetrics[toolName];
    toolMetrics.executions++;
    if (success) {
      toolMetrics.successes++;
    } else {
      toolMetrics.failures++;
    }
    toolMetrics.avgDurationMs =
      (toolMetrics.avgDurationMs * (toolMetrics.executions - 1) + durationMs) /
      toolMetrics.executions;
    toolMetrics.lastExecutedAt = new Date();
  }

  /**
   * Get plugin metrics
   */
  getMetrics(pluginId: PluginId): PluginMetrics | undefined {
    return this.plugins.get(pluginId)?.metrics;
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): {
    totalExecutions: number;
    successRate: number;
    avgExecutionTimeMs: number;
    topPlugins: Array<{ pluginId: PluginId; executions: number }>;
    topTools: Array<{ toolName: string; executions: number }>;
  } {
    const plugins = this.getAll();

    let totalExecutions = 0;
    let totalSuccessful = 0;
    let totalExecutionTime = 0;
    const pluginExecutions: Array<{ pluginId: PluginId; executions: number }> = [];
    const toolExecutions = new Map<string, number>();

    for (const plugin of plugins) {
      totalExecutions += plugin.metrics.totalExecutions;
      totalSuccessful += plugin.metrics.successfulExecutions;
      totalExecutionTime += plugin.metrics.totalExecutionTimeMs;

      pluginExecutions.push({
        pluginId: plugin.manifest.id,
        executions: plugin.metrics.totalExecutions,
      });

      for (const [toolName, metrics] of Object.entries(
        plugin.metrics.toolMetrics
      )) {
        toolExecutions.set(
          toolName,
          (toolExecutions.get(toolName) ?? 0) + metrics.executions
        );
      }
    }

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 1,
      avgExecutionTimeMs:
        totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      topPlugins: pluginExecutions
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 10),
      topTools: Array.from(toolExecutions.entries())
        .map(([toolName, executions]) => ({ toolName, executions }))
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 10),
    };
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to plugin events
   */
  onEvent(callback: PluginEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Unsubscribe from plugin events
   */
  offEvent(callback: PluginEventCallback): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index !== -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id || typeof manifest.id !== 'string') {
      throw this.createError('CONFIGURATION_INVALID', 'Invalid plugin ID');
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
      throw this.createError('CONFIGURATION_INVALID', 'Invalid plugin name');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      throw this.createError('CONFIGURATION_INVALID', 'Invalid plugin version');
    }

    if (!manifest.capabilities?.tools) {
      throw this.createError(
        'CONFIGURATION_INVALID',
        'Plugin must define capabilities.tools'
      );
    }

    // Validate tool names are unique
    const toolNames = new Set<string>();
    for (const tool of manifest.capabilities.tools) {
      if (toolNames.has(tool.name)) {
        throw this.createError(
          'CONFIGURATION_INVALID',
          `Duplicate tool name: ${tool.name}`
        );
      }
      toolNames.add(tool.name);
    }
  }

  private async validateDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies?.length) {
      return;
    }

    for (const dep of manifest.dependencies) {
      const installed = this.plugins.get(dep.pluginId);

      if (!installed && !dep.optional) {
        throw this.createError(
          'DEPENDENCY_MISSING',
          `Required dependency not installed: ${dep.pluginId}`
        );
      }

      if (installed && installed.status !== 'active' && !dep.optional) {
        throw this.createError(
          'DEPENDENCY_MISSING',
          `Required dependency not active: ${dep.pluginId}`
        );
      }
    }
  }

  private registerTools(manifest: PluginManifest): void {
    for (const tool of manifest.capabilities.tools) {
      // Check for conflicts
      const existingPlugin = this.toolIndex.get(tool.name);
      if (existingPlugin && existingPlugin !== manifest.id) {
        throw this.createError(
          'CONFIGURATION_INVALID',
          `Tool name conflict: ${tool.name} is already registered by ${existingPlugin}`
        );
      }

      this.toolIndex.set(tool.name, manifest.id);
    }
  }

  private unregisterTools(manifest: PluginManifest): void {
    for (const tool of manifest.capabilities.tools) {
      if (this.toolIndex.get(tool.name) === manifest.id) {
        this.toolIndex.delete(tool.name);
      }
    }
  }

  private createDefaultConfig(
    manifest: PluginManifest,
    overrides?: Partial<PluginConfig>
  ): PluginConfig {
    const settings: Record<string, unknown> = {};

    // Apply defaults from schema
    if (manifest.configSchema?.properties) {
      for (const [key, prop] of Object.entries(manifest.configSchema.properties)) {
        if (prop.default !== undefined) {
          settings[key] = prop.default;
        }
      }
    }

    return {
      enabled: true,
      settings: { ...settings, ...overrides?.settings },
      permissionOverrides: overrides?.permissionOverrides,
      rateLimitOverrides: overrides?.rateLimitOverrides,
      resourceLimits: overrides?.resourceLimits ?? {
        maxMemoryMb: 128,
        maxCpuTimeMs: 5000,
        maxExecutionTimeMs: 30000,
        maxNetworkRequests: 10,
        maxStorageOperations: 100,
      },
    };
  }

  private createInitialMetrics(): PluginMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTimeMs: 0,
      avgExecutionTimeMs: 0,
      memoryUsageBytes: 0,
      toolMetrics: {},
    };
  }

  private createError(code: PluginErrorCode, message: string): PluginError {
    return {
      code,
      message,
      timestamp: new Date(),
    };
  }

  private emitEvent(
    type: PluginEventType,
    pluginId: PluginId,
    data: Record<string, unknown>,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): void {
    const event: PluginEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      pluginId,
      timestamp: new Date(),
      actor: { type: 'system', id: 'plugin_registry' },
      data,
      severity,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new plugin registry
 */
export function createPluginRegistry(
  config?: Partial<PluginRegistryConfig>
): PluginRegistry {
  return new PluginRegistry(config);
}
