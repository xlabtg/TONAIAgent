/**
 * TONAIAgent - Extension Framework
 *
 * Framework for building, installing, and managing extensions
 * that add data sources, signals, integrations, and custom functionality.
 */

import {
  ExtensionManifest,
  ExtensionInstance,
  ExtensionType,
  ExtensionPermission,
  ExtensionMetrics,
  SDKEvent,
  SDKEventCallback,
} from './types';

// ============================================================================
// Extension Handler
// ============================================================================

export type ExtensionHandler = (
  params: Record<string, unknown>,
  context: ExtensionContext
) => Promise<unknown>;

export interface ExtensionContext {
  extensionId: string;
  userId: string;
  config: Record<string, unknown>;
  logger: ExtensionLogger;
  storage: ExtensionStorage;
  http: ExtensionHttp;
}

export interface ExtensionLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ExtensionStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface ExtensionHttp {
  get(url: string, options?: HttpOptions): Promise<HttpResponse>;
  post(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
  put(url: string, body: unknown, options?: HttpOptions): Promise<HttpResponse>;
  delete(url: string, options?: HttpOptions): Promise<HttpResponse>;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: unknown;
}

// ============================================================================
// Extension Registry Configuration
// ============================================================================

export interface ExtensionRegistryConfig {
  maxExtensions?: number;
  allowExperimental?: boolean;
  permissionChecker?: PermissionChecker;
  onEvent?: SDKEventCallback;
}

export type PermissionChecker = (
  extensionId: string,
  permissions: ExtensionPermission[]
) => Promise<boolean>;

// ============================================================================
// Extension Registry
// ============================================================================

export class ExtensionRegistry {
  private readonly config: Required<ExtensionRegistryConfig>;
  private readonly extensions: Map<string, ExtensionInstance> = new Map();
  private readonly handlers: Map<string, Map<string, ExtensionHandler>> = new Map();
  private readonly eventCallbacks: Set<SDKEventCallback> = new Set();

  constructor(config: ExtensionRegistryConfig = {}) {
    this.config = {
      maxExtensions: config.maxExtensions ?? 100,
      allowExperimental: config.allowExperimental ?? false,
      permissionChecker: config.permissionChecker ?? (async () => true),
      onEvent: config.onEvent ?? (() => {}),
    };

    if (config.onEvent) {
      this.eventCallbacks.add(config.onEvent);
    }
  }

  // ==========================================================================
  // Extension Installation
  // ==========================================================================

  /**
   * Install an extension
   */
  async install(
    manifest: ExtensionManifest,
    handlers: Record<string, ExtensionHandler>,
    options?: { activateImmediately?: boolean; config?: Record<string, unknown> }
  ): Promise<ExtensionInstance> {
    // Validate manifest
    this.validateManifest(manifest);

    // Check if already installed
    if (this.extensions.has(manifest.id)) {
      throw new ExtensionError(
        'ALREADY_INSTALLED',
        `Extension ${manifest.id} is already installed`
      );
    }

    // Check extension limit
    if (this.extensions.size >= this.config.maxExtensions) {
      throw new ExtensionError(
        'LIMIT_EXCEEDED',
        `Maximum extension limit (${this.config.maxExtensions}) reached`
      );
    }

    // Check permissions
    const permissionsGranted = await this.config.permissionChecker(
      manifest.id,
      manifest.permissions
    );

    if (!permissionsGranted) {
      throw new ExtensionError(
        'PERMISSION_DENIED',
        `Required permissions not granted for extension ${manifest.id}`
      );
    }

    // Create instance
    const instance: ExtensionInstance = {
      manifest,
      status: 'installed',
      config: options?.config || {},
      installedAt: new Date(),
      metrics: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgLatencyMs: 0,
      },
    };

    // Store extension and handlers
    this.extensions.set(manifest.id, instance);
    this.handlers.set(manifest.id, new Map(Object.entries(handlers)));

    this.emitEvent('extension:installed', {
      extensionId: manifest.id,
      name: manifest.name,
      version: manifest.version,
    });

    // Activate if requested
    if (options?.activateImmediately) {
      await this.activate(manifest.id);
    }

    return instance;
  }

  /**
   * Uninstall an extension
   */
  async uninstall(extensionId: string): Promise<void> {
    const instance = this.extensions.get(extensionId);
    if (!instance) {
      throw new ExtensionError('NOT_FOUND', `Extension ${extensionId} not found`);
    }

    // Deactivate if active
    if (instance.status === 'active') {
      await this.deactivate(extensionId);
    }

    // Remove handlers and instance
    this.handlers.delete(extensionId);
    this.extensions.delete(extensionId);

    this.emitEvent('extension:uninstalled', { extensionId });
  }

  // ==========================================================================
  // Activation/Deactivation
  // ==========================================================================

  /**
   * Activate an extension
   */
  async activate(extensionId: string): Promise<void> {
    const instance = this.extensions.get(extensionId);
    if (!instance) {
      throw new ExtensionError('NOT_FOUND', `Extension ${extensionId} not found`);
    }

    if (instance.status === 'active') {
      return;
    }

    instance.status = 'active';
    instance.activatedAt = new Date();

    this.emitEvent('extension:activated', { extensionId });
  }

  /**
   * Deactivate an extension
   */
  async deactivate(extensionId: string): Promise<void> {
    const instance = this.extensions.get(extensionId);
    if (!instance) {
      throw new ExtensionError('NOT_FOUND', `Extension ${extensionId} not found`);
    }

    if (instance.status !== 'active') {
      return;
    }

    instance.status = 'inactive';

    this.emitEvent('extension:deactivated', { extensionId });
  }

  // ==========================================================================
  // Extension Execution
  // ==========================================================================

  /**
   * Execute an extension function
   */
  async execute(
    extensionId: string,
    functionName: string,
    params: Record<string, unknown>,
    userId: string
  ): Promise<unknown> {
    const instance = this.extensions.get(extensionId);
    if (!instance) {
      throw new ExtensionError('NOT_FOUND', `Extension ${extensionId} not found`);
    }

    if (instance.status !== 'active') {
      throw new ExtensionError(
        'NOT_ACTIVE',
        `Extension ${extensionId} is not active`
      );
    }

    const handlers = this.handlers.get(extensionId);
    const handler = handlers?.get(functionName);
    if (!handler) {
      throw new ExtensionError(
        'HANDLER_NOT_FOUND',
        `Handler ${functionName} not found in extension ${extensionId}`
      );
    }

    const startTime = Date.now();
    const context = this.createContext(extensionId, userId, instance.config);

    try {
      const result = await handler(params, context);
      this.recordExecution(extensionId, true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordExecution(extensionId, false, Date.now() - startTime);

      this.emitEvent('extension:error', {
        extensionId,
        functionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // ==========================================================================
  // Discovery
  // ==========================================================================

  /**
   * Get all installed extensions
   */
  getAll(): ExtensionInstance[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get active extensions
   */
  getActive(): ExtensionInstance[] {
    return this.getAll().filter((e) => e.status === 'active');
  }

  /**
   * Get extension by ID
   */
  get(extensionId: string): ExtensionInstance | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Check if extension is installed
   */
  isInstalled(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }

  /**
   * Check if extension is active
   */
  isActive(extensionId: string): boolean {
    const instance = this.extensions.get(extensionId);
    return instance?.status === 'active';
  }

  /**
   * Search extensions
   */
  search(options: {
    type?: ExtensionType;
    category?: string;
    keyword?: string;
    activeOnly?: boolean;
  }): ExtensionInstance[] {
    let results = this.getAll();

    if (options.type) {
      results = results.filter((e) => e.manifest.type === options.type);
    }

    if (options.category) {
      results = results.filter((e) => e.manifest.category === options.category);
    }

    if (options.keyword) {
      const keyword = options.keyword.toLowerCase();
      results = results.filter(
        (e) =>
          e.manifest.name.toLowerCase().includes(keyword) ||
          e.manifest.description.toLowerCase().includes(keyword) ||
          e.manifest.keywords?.some((k) => k.toLowerCase().includes(keyword))
      );
    }

    if (options.activeOnly) {
      results = results.filter((e) => e.status === 'active');
    }

    return results;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Update extension configuration
   */
  updateConfig(extensionId: string, config: Record<string, unknown>): void {
    const instance = this.extensions.get(extensionId);
    if (!instance) {
      throw new ExtensionError('NOT_FOUND', `Extension ${extensionId} not found`);
    }

    instance.config = { ...instance.config, ...config };
  }

  /**
   * Get extension configuration
   */
  getConfig(extensionId: string): Record<string, unknown> | undefined {
    return this.extensions.get(extensionId)?.config;
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  /**
   * Get extension metrics
   */
  getMetrics(extensionId: string): ExtensionMetrics | undefined {
    return this.extensions.get(extensionId)?.metrics;
  }

  /**
   * Get aggregate metrics
   */
  getAggregateMetrics(): {
    totalExtensions: number;
    activeExtensions: number;
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
  } {
    const all = this.getAll();
    const totalCalls = all.reduce((sum, e) => sum + e.metrics.totalCalls, 0);
    const successfulCalls = all.reduce((sum, e) => sum + e.metrics.successfulCalls, 0);
    const totalLatency = all.reduce(
      (sum, e) => sum + e.metrics.avgLatencyMs * e.metrics.totalCalls,
      0
    );

    return {
      totalExtensions: all.length,
      activeExtensions: all.filter((e) => e.status === 'active').length,
      totalCalls,
      successRate: totalCalls > 0 ? successfulCalls / totalCalls : 1,
      avgLatencyMs: totalCalls > 0 ? totalLatency / totalCalls : 0,
    };
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to events
   */
  onEvent(callback: SDKEventCallback): void {
    this.eventCallbacks.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  offEvent(callback: SDKEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private validateManifest(manifest: ExtensionManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new ExtensionError(
        'INVALID_MANIFEST',
        'Extension manifest must have id, name, and version'
      );
    }

    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new ExtensionError(
        'INVALID_VERSION',
        'Extension version must be semver format'
      );
    }
  }

  private createContext(
    extensionId: string,
    userId: string,
    config: Record<string, unknown>
  ): ExtensionContext {
    return {
      extensionId,
      userId,
      config,
      logger: this.createLogger(extensionId),
      storage: this.createStorage(extensionId),
      http: this.createHttp(extensionId),
    };
  }

  private createLogger(extensionId: string): ExtensionLogger {
    const prefix = `[Extension:${extensionId}]`;
    return {
      debug: (message, meta) => console.debug(`${prefix} ${message}`, meta || ''),
      info: (message, meta) => console.info(`${prefix} ${message}`, meta || ''),
      warn: (message, meta) => console.warn(`${prefix} ${message}`, meta || ''),
      error: (message, meta) => console.error(`${prefix} ${message}`, meta || ''),
    };
  }

  private createStorage(extensionId: string): ExtensionStorage {
    // In-memory storage implementation
    const store = new Map<string, unknown>();

    return {
      get: async (key) => store.get(`${extensionId}:${key}`),
      set: async (key, value) => {
        store.set(`${extensionId}:${key}`, value);
      },
      delete: async (key) => {
        store.delete(`${extensionId}:${key}`);
      },
      list: async () => {
        const prefix = `${extensionId}:`;
        return Array.from(store.keys())
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length));
      },
    };
  }

  private createHttp(extensionId: string): ExtensionHttp {
    const makeRequest = async (
      method: string,
      url: string,
      body?: unknown,
      options?: HttpOptions
    ): Promise<HttpResponse> => {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-ID': extensionId,
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.timeout
          ? AbortSignal.timeout(options.timeout)
          : undefined,
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        status: response.status,
        headers,
        data: await response.json().catch(() => null),
      };
    };

    return {
      get: (url, options) => makeRequest('GET', url, undefined, options),
      post: (url, body, options) => makeRequest('POST', url, body, options),
      put: (url, body, options) => makeRequest('PUT', url, body, options),
      delete: (url, options) => makeRequest('DELETE', url, undefined, options),
    };
  }

  private recordExecution(
    extensionId: string,
    success: boolean,
    latencyMs: number
  ): void {
    const instance = this.extensions.get(extensionId);
    if (!instance) return;

    const metrics = instance.metrics;
    const totalCalls = metrics.totalCalls + 1;
    const avgLatency =
      (metrics.avgLatencyMs * metrics.totalCalls + latencyMs) / totalCalls;

    instance.metrics = {
      totalCalls,
      successfulCalls: metrics.successfulCalls + (success ? 1 : 0),
      failedCalls: metrics.failedCalls + (success ? 0 : 1),
      avgLatencyMs: avgLatency,
      lastCalledAt: new Date(),
    };
  }

  private emitEvent(
    type: SDKEvent['type'],
    data: Record<string, unknown>,
    severity: SDKEvent['severity'] = 'info'
  ): void {
    const event: SDKEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      source: 'extension-registry',
      data,
      severity,
    };

    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    });
  }
}

// ============================================================================
// Extension Error
// ============================================================================

export class ExtensionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an extension registry
 */
export function createExtensionRegistry(
  config?: ExtensionRegistryConfig
): ExtensionRegistry {
  return new ExtensionRegistry(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default ExtensionRegistry;
