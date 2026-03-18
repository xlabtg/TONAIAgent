/**
 * TONAIAgent - Plugin Runtime
 *
 * Sandboxed execution environment for plugins with:
 * - Resource isolation and limits
 * - Permission enforcement
 * - Rate limiting
 * - Audit logging
 */

import {
  PluginId,
  PluginInstance,
  PluginConfig,
  PluginLogger,
  PluginStorage,
  SecretsManager,
  SandboxedHttpClient,
  TonClientInterface,
  ToolExecutionRequest,
  ToolExecutionResult,
  ToolExecutionError,
  ToolDefinition,
  ResourceUsage,
  ResourceLimits,
  AuditEntry,
  PermissionScope,
  PermissionConstraints,
  HttpResponse,
  HttpRequestOptions,
  AccountInfo,
  TonTransaction,
  TransactionParams,
  PreparedTransaction,
  SimulationResult,
  JettonInfo,
  NftInfo,
  ContractState,
} from './types';
import { PluginRegistry } from './registry';

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * Plugin runtime configuration
 */
export interface PluginRuntimeConfig {
  /** Default resource limits */
  defaultResourceLimits: ResourceLimits;

  /** Enable audit logging */
  enableAuditLogging: boolean;

  /** Maximum concurrent executions */
  maxConcurrentExecutions: number;

  /** Default timeout (ms) */
  defaultTimeoutMs: number;

  /** Enable rate limiting */
  enableRateLimiting: boolean;

  /** Global rate limit (requests per minute) */
  globalRateLimitPerMinute: number;

  /** TON RPC endpoint */
  tonRpcEndpoint?: string;

  /** Allowed external domains */
  allowedExternalDomains?: string[];

  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Tool handler function type
 */
export type ToolHandler = (
  params: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<unknown>;

/**
 * Tool execution context provided to handlers
 */
export interface ToolExecutionContext {
  pluginId: PluginId;
  toolName: string;
  userId: string;
  agentId: string;
  sessionId: string;
  logger: PluginLogger;
  storage: PluginStorage;
  http: SandboxedHttpClient;
  ton: TonClientInterface;
  abortSignal: AbortSignal;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requests: number;
  windowStart: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_RUNTIME_CONFIG: PluginRuntimeConfig = {
  defaultResourceLimits: {
    maxMemoryMb: 128,
    maxCpuTimeMs: 5000,
    maxExecutionTimeMs: 30000,
    maxNetworkRequests: 10,
    maxStorageOperations: 100,
  },
  enableAuditLogging: true,
  maxConcurrentExecutions: 10,
  defaultTimeoutMs: 30000,
  enableRateLimiting: true,
  globalRateLimitPerMinute: 100,
  logLevel: 'info',
};

// ============================================================================
// Plugin Runtime Implementation
// ============================================================================

/**
 * Plugin Runtime
 *
 * Provides sandboxed execution environment for plugins with:
 * - Resource isolation
 * - Permission enforcement
 * - Rate limiting
 * - Audit logging
 * - Health monitoring
 */
export class PluginRuntime {
  private readonly config: PluginRuntimeConfig;
  private readonly registry: PluginRegistry;
  private readonly toolHandlers = new Map<string, ToolHandler>();
  private readonly rateLimiters = new Map<string, RateLimiterState>();
  private readonly storage = new Map<string, Map<string, unknown>>();
  private readonly secrets = new Map<string, string>();
  private activeExecutions = 0;

  constructor(registry: PluginRegistry, config: Partial<PluginRuntimeConfig> = {}) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config };
    this.registry = registry;
  }

  // ==========================================================================
  // Tool Registration
  // ==========================================================================

  /**
   * Register a tool handler
   */
  registerHandler(
    pluginId: PluginId,
    toolName: string,
    handler: ToolHandler
  ): void {
    const key = this.getHandlerKey(pluginId, toolName);
    this.toolHandlers.set(key, handler);
  }

  /**
   * Unregister a tool handler
   */
  unregisterHandler(pluginId: PluginId, toolName: string): void {
    const key = this.getHandlerKey(pluginId, toolName);
    this.toolHandlers.delete(key);
  }

  /**
   * Check if a handler is registered
   */
  hasHandler(pluginId: PluginId, toolName: string): boolean {
    const key = this.getHandlerKey(pluginId, toolName);
    return this.toolHandlers.has(key);
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool
   */
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const auditTrail: AuditEntry[] = [];
    const resourceUsage: ResourceUsage = {
      cpuTimeMs: 0,
      memoryPeakBytes: 0,
      networkRequests: 0,
      storageReads: 0,
      storageWrites: 0,
    };

    // Add initial audit entry
    auditTrail.push({
      timestamp: new Date(),
      action: 'execution_started',
      details: {
        pluginId: request.pluginId,
        toolName: request.toolName,
        userId: request.context.userId,
        agentId: request.context.agentId,
      },
    });

    try {
      // Validate plugin is active
      const plugin = this.registry.get(request.pluginId);
      if (!plugin) {
        throw this.createError('PLUGIN_NOT_FOUND', `Plugin ${request.pluginId} not found`);
      }

      if (plugin.status !== 'active') {
        throw this.createError('PLUGIN_NOT_ACTIVE', `Plugin ${request.pluginId} is not active`);
      }

      // Validate tool exists
      const tool = plugin.manifest.capabilities.tools.find(
        (t) => t.name === request.toolName
      );
      if (!tool) {
        throw this.createError('TOOL_NOT_FOUND', `Tool ${request.toolName} not found`);
      }

      // Check handler is registered
      const handlerKey = this.getHandlerKey(request.pluginId, request.toolName);
      const handler = this.toolHandlers.get(handlerKey);
      if (!handler) {
        throw this.createError('HANDLER_NOT_FOUND', `Handler for ${request.toolName} not found`);
      }

      // Check permissions
      await this.checkPermissions(request, tool, plugin.config);

      // Check rate limits
      this.checkRateLimit(request.pluginId, plugin.config);

      // Check concurrent execution limits
      if (this.activeExecutions >= this.config.maxConcurrentExecutions) {
        throw this.createError('RESOURCE_EXHAUSTED', 'Maximum concurrent executions reached');
      }

      // Validate parameters
      this.validateParameters(request.parameters, tool);

      // Create execution context
      const abortController = new AbortController();
      const timeoutMs = request.options?.timeoutMs ?? this.config.defaultTimeoutMs;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      this.activeExecutions++;

      try {
        // Create sandboxed context
        const context = this.createExecutionContext(
          request,
          plugin,
          resourceUsage,
          abortController.signal
        );

        // Execute handler
        let result: unknown;
        if (request.options?.dryRun) {
          result = { dryRun: true, message: 'Execution simulated' };
          auditTrail.push({
            timestamp: new Date(),
            action: 'dry_run',
            details: { toolName: request.toolName },
          });
        } else {
          result = await handler(request.parameters, context);
        }

        clearTimeout(timeoutId);

        const durationMs = Date.now() - startTime;
        resourceUsage.cpuTimeMs = durationMs;

        // Record metrics
        this.registry.recordExecution(request.pluginId, request.toolName, true, durationMs);

        auditTrail.push({
          timestamp: new Date(),
          action: 'execution_completed',
          details: {
            durationMs,
            success: true,
          },
        });

        return {
          requestId: request.requestId,
          success: true,
          data: result,
          durationMs,
          resourcesUsed: resourceUsage,
          auditTrail,
        };
      } finally {
        clearTimeout(timeoutId);
        this.activeExecutions--;
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Record failed execution
      this.registry.recordExecution(
        request.pluginId,
        request.toolName,
        false,
        durationMs
      );

      const executionError = this.normalizeError(error);

      auditTrail.push({
        timestamp: new Date(),
        action: 'execution_failed',
        details: {
          error: executionError.message,
          code: executionError.code,
          durationMs,
        },
      });

      return {
        requestId: request.requestId,
        success: false,
        error: executionError,
        durationMs,
        resourcesUsed: resourceUsage,
        auditTrail,
      };
    }
  }

  /**
   * Execute a tool with confirmation
   */
  async executeWithConfirmation(
    request: ToolExecutionRequest,
    confirmationCallback: (toolName: string, params: Record<string, unknown>) => Promise<boolean>
  ): Promise<ToolExecutionResult> {
    const plugin = this.registry.get(request.pluginId);
    const tool = plugin?.manifest.capabilities.tools.find(
      (t) => t.name === request.toolName
    );

    if (tool?.requiresConfirmation && !request.options?.skipConfirmation) {
      const confirmed = await confirmationCallback(request.toolName, request.parameters);
      if (!confirmed) {
        return {
          requestId: request.requestId,
          success: false,
          error: {
            code: 'USER_CANCELLED',
            message: 'User cancelled the operation',
            retryable: false,
          },
          durationMs: 0,
          resourcesUsed: {
            cpuTimeMs: 0,
            memoryPeakBytes: 0,
            networkRequests: 0,
            storageReads: 0,
            storageWrites: 0,
          },
          auditTrail: [
            {
              timestamp: new Date(),
              action: 'user_cancelled',
              details: { toolName: request.toolName },
            },
          ],
        };
      }
    }

    return this.execute(request);
  }

  // ==========================================================================
  // Permission Checking
  // ==========================================================================

  /**
   * Check if execution has required permissions
   */
  private async checkPermissions(
    request: ToolExecutionRequest,
    tool: ToolDefinition,
    config: PluginConfig
  ): Promise<void> {
    for (const requiredScope of tool.requiredPermissions) {
      // Check if permission is overridden to deny
      const override = config.permissionOverrides?.find(
        (o) => o.scope === requiredScope
      );
      if (override?.action === 'deny') {
        throw this.createError(
          'PERMISSION_DENIED',
          `Permission ${requiredScope} is denied`
        );
      }

      // Check constraints
      if (override?.constraints || tool.safetyConstraints) {
        await this.checkConstraints(
          request,
          requiredScope,
          override?.constraints,
          tool.safetyConstraints
        );
      }
    }
  }

  /**
   * Check permission constraints
   */
  private async checkConstraints(
    request: ToolExecutionRequest,
    scope: PermissionScope,
    permissionConstraints?: PermissionConstraints,
    toolConstraints?: ToolDefinition['safetyConstraints']
  ): Promise<void> {
    const params = request.parameters;

    // Check transaction value limits
    if (scope.includes('transfer') || scope.includes('swap')) {
      const value = params.value ?? params.amount;
      if (typeof value === 'number' || typeof value === 'string') {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (
          permissionConstraints?.maxTransactionValue &&
          numValue > permissionConstraints.maxTransactionValue
        ) {
          throw this.createError(
            'PERMISSION_DENIED',
            `Transaction value ${numValue} exceeds maximum ${permissionConstraints.maxTransactionValue}`
          );
        }

        if (
          toolConstraints?.maxValuePerExecution &&
          numValue > toolConstraints.maxValuePerExecution
        ) {
          throw this.createError(
            'PERMISSION_DENIED',
            `Transaction value ${numValue} exceeds tool limit ${toolConstraints.maxValuePerExecution}`
          );
        }
      }
    }

    // Check allowed tokens
    const tokenAddress = params.tokenAddress ?? params.token;
    if (tokenAddress && typeof tokenAddress === 'string') {
      if (
        permissionConstraints?.allowedTokens?.length &&
        !permissionConstraints.allowedTokens.includes(tokenAddress)
      ) {
        throw this.createError(
          'PERMISSION_DENIED',
          `Token ${tokenAddress} is not in allowed list`
        );
      }
    }

    // Check allowed contracts
    const contractAddress = params.contractAddress ?? params.contract ?? params.to;
    if (contractAddress && typeof contractAddress === 'string') {
      if (
        permissionConstraints?.allowedContracts?.length &&
        !permissionConstraints.allowedContracts.includes(contractAddress)
      ) {
        throw this.createError(
          'PERMISSION_DENIED',
          `Contract ${contractAddress} is not in allowed list`
        );
      }

      if (toolConstraints?.blockedAddresses?.includes(contractAddress)) {
        throw this.createError(
          'PERMISSION_DENIED',
          `Address ${contractAddress} is blocked`
        );
      }

      if (
        toolConstraints?.allowedAddressesOnly?.length &&
        !toolConstraints.allowedAddressesOnly.includes(contractAddress)
      ) {
        throw this.createError(
          'PERMISSION_DENIED',
          `Address ${contractAddress} is not in allowed list`
        );
      }
    }
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  /**
   * Check rate limit for a plugin
   */
  private checkRateLimit(pluginId: PluginId, config: PluginConfig): void {
    if (!this.config.enableRateLimiting) {
      return;
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const limit = config.rateLimitOverrides?.requestsPerMinute ??
      this.config.globalRateLimitPerMinute;

    let state = this.rateLimiters.get(pluginId);

    if (!state || now - state.windowStart > windowMs) {
      state = { requests: 0, windowStart: now };
      this.rateLimiters.set(pluginId, state);
    }

    state.requests++;

    if (state.requests > limit) {
      throw this.createError(
        'RATE_LIMITED',
        `Rate limit exceeded: ${state.requests}/${limit} requests per minute`
      );
    }
  }

  // ==========================================================================
  // Parameter Validation
  // ==========================================================================

  /**
   * Validate tool parameters against schema
   */
  private validateParameters(
    params: Record<string, unknown>,
    tool: ToolDefinition
  ): void {
    const schema = tool.parameters;

    // Check required parameters
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in params)) {
          throw this.createError(
            'INVALID_PARAMETERS',
            `Missing required parameter: ${required}`
          );
        }
      }
    }

    // Validate parameter types
    for (const [key, value] of Object.entries(params)) {
      const propSchema = schema.properties[key];
      if (!propSchema) {
        if (schema.additionalProperties === false) {
          throw this.createError(
            'INVALID_PARAMETERS',
            `Unknown parameter: ${key}`
          );
        }
        continue;
      }

      this.validateValue(key, value, propSchema);
    }
  }

  /**
   * Validate a single value against its schema
   */
  private validateValue(
    key: string,
    value: unknown,
    schema: { type: string; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; enum?: unknown[] }
  ): void {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== schema.type) {
      throw this.createError(
        'INVALID_PARAMETERS',
        `Parameter ${key} must be of type ${schema.type}, got ${actualType}`
      );
    }

    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw this.createError(
          'INVALID_PARAMETERS',
          `Parameter ${key} must be >= ${schema.minimum}`
        );
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw this.createError(
          'INVALID_PARAMETERS',
          `Parameter ${key} must be <= ${schema.maximum}`
        );
      }
    }

    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        throw this.createError(
          'INVALID_PARAMETERS',
          `Parameter ${key} must have length >= ${schema.minLength}`
        );
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        throw this.createError(
          'INVALID_PARAMETERS',
          `Parameter ${key} must have length <= ${schema.maxLength}`
        );
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      throw this.createError(
        'INVALID_PARAMETERS',
        `Parameter ${key} must be one of: ${schema.enum.join(', ')}`
      );
    }
  }

  // ==========================================================================
  // Execution Context
  // ==========================================================================

  /**
   * Create sandboxed execution context
   */
  private createExecutionContext(
    request: ToolExecutionRequest,
    plugin: PluginInstance,
    resourceUsage: ResourceUsage,
    abortSignal: AbortSignal
  ): ToolExecutionContext {
    return {
      pluginId: request.pluginId,
      toolName: request.toolName,
      userId: request.context.userId,
      agentId: request.context.agentId,
      sessionId: request.context.sessionId,
      logger: this.createLogger(request.pluginId),
      storage: this.createStorage(request.pluginId, resourceUsage),
      http: this.createHttpClient(plugin.config, resourceUsage),
      ton: this.createTonClient(resourceUsage),
      abortSignal,
    };
  }

  /**
   * Create plugin logger
   */
  private createLogger(pluginId: PluginId): PluginLogger {
    const logLevel = this.config.logLevel;
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(logLevel);

    const shouldLog = (level: string) => levels.indexOf(level) >= currentLevelIndex;

    return {
      debug: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('debug')) {
          console.debug(`[${pluginId}] ${message}`, data ?? '');
        }
      },
      info: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('info')) {
          console.info(`[${pluginId}] ${message}`, data ?? '');
        }
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        if (shouldLog('warn')) {
          console.warn(`[${pluginId}] ${message}`, data ?? '');
        }
      },
      error: (message: string, error?: Error, data?: Record<string, unknown>) => {
        if (shouldLog('error')) {
          console.error(`[${pluginId}] ${message}`, error ?? '', data ?? '');
        }
      },
    };
  }

  /**
   * Create sandboxed storage
   */
  private createStorage(
    pluginId: PluginId,
    resourceUsage: ResourceUsage
  ): PluginStorage {
    if (!this.storage.has(pluginId)) {
      this.storage.set(pluginId, new Map());
    }

    const pluginStorage = this.storage.get(pluginId)!;

    return {
      get: async <T>(key: string): Promise<T | undefined> => {
        resourceUsage.storageReads++;
        return pluginStorage.get(key) as T | undefined;
      },
      set: async <T>(key: string, value: T): Promise<void> => {
        resourceUsage.storageWrites++;
        pluginStorage.set(key, value);
      },
      delete: async (key: string): Promise<boolean> => {
        resourceUsage.storageWrites++;
        return pluginStorage.delete(key);
      },
      list: async (prefix?: string): Promise<string[]> => {
        resourceUsage.storageReads++;
        const keys = Array.from(pluginStorage.keys());
        return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
      },
      clear: async (): Promise<void> => {
        resourceUsage.storageWrites++;
        pluginStorage.clear();
      },
    };
  }

  /**
   * Create sandboxed HTTP client
   */
  private createHttpClient(
    config: PluginConfig,
    resourceUsage: ResourceUsage
  ): SandboxedHttpClient {
    const limits = config.resourceLimits ?? this.config.defaultResourceLimits;
    const allowedDomains = this.config.allowedExternalDomains;

    const makeRequest = async (
      _method: string,
      url: string,
      _body?: unknown,
      _options?: unknown
    ): Promise<HttpResponse> => {
      if (resourceUsage.networkRequests >= limits.maxNetworkRequests) {
        throw this.createError('RESOURCE_EXHAUSTED', 'Network request limit exceeded');
      }

      // Check domain is allowed
      if (allowedDomains?.length) {
        const urlObj = new URL(url);
        if (!allowedDomains.some((d) => urlObj.hostname.endsWith(d))) {
          throw this.createError(
            'PERMISSION_DENIED',
            `Domain ${urlObj.hostname} is not allowed`
          );
        }
      }

      resourceUsage.networkRequests++;

      // Simulate HTTP request (in production, use actual fetch)
      const response: HttpResponse = {
        status: 200,
        headers: {},
        data: { message: 'Simulated response' },
      };

      return response;
    };

    return {
      get: (url: string, options?: HttpRequestOptions) =>
        makeRequest('GET', url, undefined, options),
      post: (url: string, body: unknown, options?: HttpRequestOptions) =>
        makeRequest('POST', url, body, options),
      put: (url: string, body: unknown, options?: HttpRequestOptions) =>
        makeRequest('PUT', url, body, options),
      delete: (url: string, options?: HttpRequestOptions) =>
        makeRequest('DELETE', url, undefined, options),
    };
  }

  /**
   * Create TON client interface
   */
  private createTonClient(resourceUsage: ResourceUsage): TonClientInterface {
    // Simulated TON client - in production, connect to actual TON RPC
    return {
      getBalance: async (_address: string): Promise<string> => {
        resourceUsage.networkRequests++;
        return '1000000000'; // 1 TON in nanotons
      },

      getAccountInfo: async (address: string): Promise<AccountInfo> => {
        resourceUsage.networkRequests++;
        return {
          address,
          balance: '1000000000',
          status: 'active',
          lastTransactionLt: '12345678',
        };
      },

      getTransactions: async (
        _address: string,
        _limit?: number
      ): Promise<TonTransaction[]> => {
        resourceUsage.networkRequests++;
        return [];
      },

      prepareTransaction: async (
        params: TransactionParams
      ): Promise<PreparedTransaction> => {
        resourceUsage.networkRequests++;
        return {
          id: `tx_${Date.now()}`,
          from: 'EQ...sender',
          to: params.to,
          value: params.value,
          payload: params.payload,
          estimatedFee: '5000000',
          validUntil: Math.floor(Date.now() / 1000) + 300,
        };
      },

      simulateTransaction: async (
        _tx: PreparedTransaction
      ): Promise<SimulationResult> => {
        resourceUsage.networkRequests++;
        return {
          success: true,
          exitCode: 0,
          gasUsed: '10000',
          resultMessage: 'Simulation successful',
        };
      },

      getJettonInfo: async (address: string): Promise<JettonInfo> => {
        resourceUsage.networkRequests++;
        return {
          address,
          name: 'Sample Token',
          symbol: 'SAMPLE',
          decimals: 9,
          totalSupply: '1000000000000000000',
          mintable: false,
        };
      },

      getJettonBalance: async (
        _walletAddress: string,
        _jettonAddress: string
      ): Promise<string> => {
        resourceUsage.networkRequests++;
        return '1000000000000';
      },

      getNftInfo: async (address: string): Promise<NftInfo> => {
        resourceUsage.networkRequests++;
        return {
          address,
          index: 0,
          ownerAddress: 'EQ...owner',
          metadata: {
            name: 'Sample NFT',
            description: 'A sample NFT',
          },
        };
      },

      getContractState: async (address: string): Promise<ContractState> => {
        resourceUsage.networkRequests++;
        return {
          address,
          balance: '1000000000',
          status: 'active',
        };
      },
    };
  }

  // ==========================================================================
  // Secrets Management
  // ==========================================================================

  /**
   * Set a secret for a plugin
   */
  setSecret(pluginId: PluginId, key: string, value: string): void {
    this.secrets.set(`${pluginId}:${key}`, value);
  }

  /**
   * Delete a secret
   */
  deleteSecret(pluginId: PluginId, key: string): void {
    this.secrets.delete(`${pluginId}:${key}`);
  }

  /**
   * Create secrets manager for a plugin
   */
  createSecretsManager(pluginId: PluginId): SecretsManager {
    return {
      get: async (key: string): Promise<string | undefined> => {
        return this.secrets.get(`${pluginId}:${key}`);
      },
      has: async (key: string): Promise<boolean> => {
        return this.secrets.has(`${pluginId}:${key}`);
      },
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getHandlerKey(pluginId: PluginId, toolName: string): string {
    return `${pluginId}:${toolName}`;
  }

  private createError(code: string, message: string): ToolExecutionError {
    return {
      code,
      message,
      retryable: ['RATE_LIMITED', 'RESOURCE_EXHAUSTED'].includes(code),
    };
  }

  private normalizeError(error: unknown): ToolExecutionError {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return error as ToolExecutionError;
    }

    return {
      code: 'EXECUTION_ERROR',
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
    };
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get runtime statistics
   */
  getStats(): {
    activeExecutions: number;
    registeredHandlers: number;
    rateLimiters: number;
    storagePlugins: number;
    secrets: number;
  } {
    return {
      activeExecutions: this.activeExecutions,
      registeredHandlers: this.toolHandlers.size,
      rateLimiters: this.rateLimiters.size,
      storagePlugins: this.storage.size,
      secrets: this.secrets.size,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new plugin runtime
 */
export function createPluginRuntime(
  registry: PluginRegistry,
  config?: Partial<PluginRuntimeConfig>
): PluginRuntime {
  return new PluginRuntime(registry, config);
}
