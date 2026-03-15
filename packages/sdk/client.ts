/**
 * TONAIAgent - Enterprise SDK Client
 *
 * Main SDK client for interacting with the TONAIAgent platform.
 * Provides a unified interface for agent management, strategy deployment,
 * execution, and monitoring.
 */

import {
  SDKConfig,
  SDKEvent,
  SDKEventCallback,
  SDKLogger,
  SDKEnvironment,
  AgentConfig,
  AgentState,
  StrategyDefinition,
  ExecutionRequest,
  ExecutionResult,
  APIRequest,
  APIResponse,
  WebhookConfig,
  WebhookDelivery,
  Paginated,
  PaginationParams,
  FilterParams,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<SDKConfig> = {
  apiKey: '',
  baseUrl: 'https://api.tonaiagent.com',
  environment: 'production',
  timeoutMs: 30000,
  debug: false,
  logger: createDefaultLogger(),
  onEvent: () => {},
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerSecond: 10,
  },
};

const ENVIRONMENT_URLS: Record<SDKEnvironment, string> = {
  production: 'https://api.tonaiagent.com',
  sandbox: 'https://sandbox.api.tonaiagent.com',
  development: 'http://localhost:3000',
};

// ============================================================================
// Default Logger
// ============================================================================

function createDefaultLogger(): SDKLogger {
  return {
    debug: (message, meta) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[SDK:DEBUG] ${message}`, meta || '');
      }
    },
    info: (message, meta) => {
      console.info(`[SDK:INFO] ${message}`, meta || '');
    },
    warn: (message, meta) => {
      console.warn(`[SDK:WARN] ${message}`, meta || '');
    },
    error: (message, meta) => {
      console.error(`[SDK:ERROR] ${message}`, meta || '');
    },
  };
}

// ============================================================================
// SDK Client
// ============================================================================

export class TONAIAgentSDK {
  private readonly config: Required<SDKConfig>;
  private readonly eventCallbacks: Set<SDKEventCallback> = new Set();
  private requestCount = 0;
  private lastRequestTime = 0;
  private initialized = false;

  constructor(config: SDKConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      baseUrl: config.baseUrl || ENVIRONMENT_URLS[config.environment || 'production'],
      logger: config.logger || DEFAULT_CONFIG.logger,
      retry: { ...DEFAULT_CONFIG.retry, ...config.retry },
      rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit },
    };

    if (config.onEvent) {
      this.eventCallbacks.add(config.onEvent);
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.log('info', 'Initializing TONAIAgent SDK', {
      environment: this.config.environment,
      baseUrl: this.config.baseUrl,
    });

    // Validate API key if provided
    if (this.config.apiKey) {
      await this.validateApiKey();
    }

    this.initialized = true;
    this.emitEvent('sdk:initialized', { environment: this.config.environment });
  }

  async shutdown(): Promise<void> {
    this.log('info', 'Shutting down TONAIAgent SDK');
    this.initialized = false;
    this.eventCallbacks.clear();
  }

  // ==========================================================================
  // Agent Management
  // ==========================================================================

  /**
   * Create a new agent
   */
  async createAgent(config: AgentConfig): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: '/agents',
      body: config,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create agent');
    }

    this.emitEvent('agent:created', { agentId: response.data.id });
    return response.data;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentState | null> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'GET',
      path: `/agents/${agentId}`,
    });

    return response.data || null;
  }

  /**
   * List agents with filtering and pagination
   */
  async listAgents(
    params?: PaginationParams & FilterParams
  ): Promise<Paginated<AgentState>> {
    this.ensureInitialized();

    const response = await this.request<Paginated<AgentState>>({
      method: 'GET',
      path: '/agents',
      query: this.buildQueryParams(params),
    });

    return response.data || { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'PATCH',
      path: `/agents/${agentId}`,
      body: config,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update agent');
    }

    return response.data;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    this.ensureInitialized();

    await this.request<void>({
      method: 'DELETE',
      path: `/agents/${agentId}`,
    });
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: `/agents/${agentId}/start`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to start agent');
    }

    this.emitEvent('agent:started', { agentId });
    return response.data;
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: `/agents/${agentId}/stop`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to stop agent');
    }

    this.emitEvent('agent:stopped', { agentId });
    return response.data;
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: `/agents/${agentId}/pause`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to pause agent');
    }

    return response.data;
  }

  /**
   * Resume a paused agent
   */
  async resumeAgent(agentId: string): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: `/agents/${agentId}/resume`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to resume agent');
    }

    return response.data;
  }

  // ==========================================================================
  // Strategy Management
  // ==========================================================================

  /**
   * Deploy a new strategy
   */
  async deployStrategy(strategy: StrategyDefinition): Promise<StrategyDefinition> {
    this.ensureInitialized();

    const response = await this.request<StrategyDefinition>({
      method: 'POST',
      path: '/strategies',
      body: strategy,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to deploy strategy');
    }

    this.emitEvent('strategy:deployed', { strategyId: response.data.id });
    return response.data;
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(strategyId: string): Promise<StrategyDefinition | null> {
    this.ensureInitialized();

    const response = await this.request<StrategyDefinition>({
      method: 'GET',
      path: `/strategies/${strategyId}`,
    });

    return response.data || null;
  }

  /**
   * List strategies
   */
  async listStrategies(
    params?: PaginationParams & FilterParams
  ): Promise<Paginated<StrategyDefinition>> {
    this.ensureInitialized();

    const response = await this.request<Paginated<StrategyDefinition>>({
      method: 'GET',
      path: '/strategies',
      query: this.buildQueryParams(params),
    });

    return response.data || { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }

  /**
   * Update a strategy
   */
  async updateStrategy(
    strategyId: string,
    update: Partial<StrategyDefinition>
  ): Promise<StrategyDefinition> {
    this.ensureInitialized();

    const response = await this.request<StrategyDefinition>({
      method: 'PATCH',
      path: `/strategies/${strategyId}`,
      body: update,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update strategy');
    }

    return response.data;
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(strategyId: string): Promise<void> {
    this.ensureInitialized();

    await this.request<void>({
      method: 'DELETE',
      path: `/strategies/${strategyId}`,
    });
  }

  /**
   * Assign a strategy to an agent
   */
  async assignStrategy(agentId: string, strategyId: string): Promise<AgentState> {
    this.ensureInitialized();

    const response = await this.request<AgentState>({
      method: 'POST',
      path: `/agents/${agentId}/strategies/${strategyId}`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to assign strategy');
    }

    return response.data;
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  /**
   * Execute an operation
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    this.ensureInitialized();

    const response = await this.request<ExecutionResult>({
      method: 'POST',
      path: '/executions',
      body: request,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to execute operation');
    }

    this.emitEvent('strategy:executed', {
      executionId: response.data.id,
      agentId: request.agentId,
    });

    return response.data;
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<ExecutionResult | null> {
    this.ensureInitialized();

    const response = await this.request<ExecutionResult>({
      method: 'GET',
      path: `/executions/${executionId}`,
    });

    return response.data || null;
  }

  /**
   * List executions
   */
  async listExecutions(
    agentId?: string,
    params?: PaginationParams & FilterParams
  ): Promise<Paginated<ExecutionResult>> {
    this.ensureInitialized();

    const query = this.buildQueryParams(params);
    if (agentId) {
      query.agentId = agentId;
    }

    const response = await this.request<Paginated<ExecutionResult>>({
      method: 'GET',
      path: '/executions',
      query,
    });

    return response.data || { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<ExecutionResult> {
    this.ensureInitialized();

    const response = await this.request<ExecutionResult>({
      method: 'POST',
      path: `/executions/${executionId}/cancel`,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to cancel execution');
    }

    return response.data;
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * Create a webhook
   */
  async createWebhook(config: WebhookConfig): Promise<WebhookConfig & { id: string }> {
    this.ensureInitialized();

    const response = await this.request<WebhookConfig & { id: string }>({
      method: 'POST',
      path: '/webhooks',
      body: config,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create webhook');
    }

    return response.data;
  }

  /**
   * List webhooks
   */
  async listWebhooks(): Promise<Array<WebhookConfig & { id: string }>> {
    this.ensureInitialized();

    const response = await this.request<Array<WebhookConfig & { id: string }>>({
      method: 'GET',
      path: '/webhooks',
    });

    return response.data || [];
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    webhookId: string,
    config: Partial<WebhookConfig>
  ): Promise<WebhookConfig & { id: string }> {
    this.ensureInitialized();

    const response = await this.request<WebhookConfig & { id: string }>({
      method: 'PATCH',
      path: `/webhooks/${webhookId}`,
      body: config,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update webhook');
    }

    return response.data;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    this.ensureInitialized();

    await this.request<void>({
      method: 'DELETE',
      path: `/webhooks/${webhookId}`,
    });
  }

  /**
   * Get webhook deliveries
   */
  async getWebhookDeliveries(webhookId: string): Promise<WebhookDelivery[]> {
    this.ensureInitialized();

    const response = await this.request<WebhookDelivery[]>({
      method: 'GET',
      path: `/webhooks/${webhookId}/deliveries`,
    });

    return response.data || [];
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to SDK events
   */
  onEvent(callback: SDKEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Unsubscribe from SDK events
   */
  offEvent(callback: SDKEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Get SDK configuration
   */
  getConfig(): Readonly<SDKConfig> {
    return { ...this.config };
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current environment
   */
  getEnvironment(): SDKEnvironment {
    return this.config.environment;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }
  }

  private async validateApiKey(): Promise<void> {
    try {
      await this.request({
        method: 'GET',
        path: '/auth/validate',
      });
    } catch {
      throw new Error('Invalid API key');
    }
  }

  private async request<T>(req: APIRequest): Promise<APIResponse<T>> {
    await this.checkRateLimit();

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    this.log('debug', `API Request: ${req.method} ${req.path}`, { requestId });
    this.emitEvent('api:request', { method: req.method, path: req.path, requestId });

    try {
      const url = this.buildUrl(req.path, req.query);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...req.headers,
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await this.executeWithRetry(async () => {
        return this.fetchWithTimeout(url, {
          method: req.method,
          headers,
          body: req.body ? JSON.stringify(req.body) : undefined,
        });
      });

      const latencyMs = Date.now() - startTime;
      const data = await response.json() as Record<string, unknown>;

      this.emitEvent('api:response', { requestId, statusCode: response.status, latencyMs });

      return {
        success: response.ok,
        data: response.ok ? (data as T) : undefined,
        error: !response.ok ? {
          code: (data.code as string) || 'UNKNOWN_ERROR',
          message: (data.message as string) || 'Unknown error',
          details: data.details as Record<string, unknown> | undefined,
          requestId,
        } : undefined,
        metadata: {
          requestId,
          timestamp: new Date(),
          latencyMs,
          rateLimit: this.parseRateLimitHeaders(response.headers),
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      this.emitEvent('api:error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      });

      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed',
          requestId,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          latencyMs,
        },
      };
    }
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const { maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier } = this.config.retry;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        const delay = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs
        );

        this.log('debug', `Retrying request in ${delay}ms (attempt ${attempt + 1})`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors
      if (error.name === 'AbortError') return false;
      if (error.message.includes('network')) return true;
      if (error.message.includes('timeout')) return true;
      if (error.message.includes('ECONNREFUSED')) return true;
      if (error.message.includes('ETIMEDOUT')) return true;
    }
    return false;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Simple rate limiting
    const minInterval = 1000 / this.config.rateLimit.maxRequestsPerSecond;
    if (timeSinceLastRequest < minInterval) {
      await this.sleep(minInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.config.baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }
    return url.toString();
  }

  private buildQueryParams(
    params?: PaginationParams & FilterParams
  ): Record<string, string> {
    const query: Record<string, string> = {};

    if (params) {
      if (params.page) query.page = String(params.page);
      if (params.pageSize) query.pageSize = String(params.pageSize);
      if (params.sortBy) query.sortBy = params.sortBy;
      if (params.sortOrder) query.sortOrder = params.sortOrder;
      if (params.search) query.search = params.search;
      if (params.status) query.status = params.status;
      if (params.type) query.type = params.type;
      if (params.category) query.category = params.category;
      if (params.tags?.length) query.tags = params.tags.join(',');
      if (params.dateFrom) query.dateFrom = params.dateFrom.toISOString();
      if (params.dateTo) query.dateTo = params.dateTo.toISOString();
    }

    return query;
  }

  private parseRateLimitHeaders(headers: Headers): {
    limit: number;
    remaining: number;
    reset: Date;
  } | undefined {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: new Date(parseInt(reset, 10) * 1000),
      };
    }

    return undefined;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
      source: 'sdk',
      data,
      severity,
    };

    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.log('error', 'Error in event callback', { error });
      }
    });
  }

  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (!this.config.debug && level === 'debug') {
      return;
    }
    this.config.logger[level](message, meta);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new TONAIAgent SDK client
 */
export function createSDK(config?: SDKConfig): TONAIAgentSDK {
  return new TONAIAgentSDK(config);
}

// ============================================================================
// Default Export
// ============================================================================

export default TONAIAgentSDK;
