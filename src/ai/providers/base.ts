/**
 * TONAIAgent - Base AI Provider
 *
 * Abstract base class for all AI providers.
 * Implements common functionality for provider management.
 */

import {
  AIError,
  AIErrorCode,
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  ProviderConfig,
  ProviderStatus,
  ProviderType,
  StreamCallback,
  CircuitState,
} from '../types';

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private halfOpenAttempts = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  get currentState(): CircuitState {
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - (this.lastFailureTime?.getTime() ?? 0);
      if (timeSinceFailure >= this.config.recoveryTimeMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  canExecute(): boolean {
    const state = this.currentState;
    if (state === 'closed') return true;
    if (state === 'half-open') {
      return this.halfOpenAttempts < this.config.halfOpenRequests;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenRequests) {
        this.reset();
      }
    }
    if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open') {
      this.trip();
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'open';
    this.halfOpenAttempts = 0;
  }

  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = undefined;
  }
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

interface RateLimiterConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay?: number;
}

export class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenCounts: Array<{ timestamp: number; tokens: number }> = [];
  private dailyRequestCount = 0;
  private lastDayReset: number = Date.now();

  constructor(private readonly config: RateLimiterConfig) {}

  canMakeRequest(estimatedTokens: number = 0): boolean {
    this.cleanup();

    // Check daily limit
    if (this.config.requestsPerDay) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      if (now - this.lastDayReset > dayMs) {
        this.dailyRequestCount = 0;
        this.lastDayReset = now;
      }
      if (this.dailyRequestCount >= this.config.requestsPerDay) {
        return false;
      }
    }

    // Check requests per minute
    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      return false;
    }

    // Check tokens per minute
    const currentTokens = this.tokenCounts.reduce((sum, t) => sum + t.tokens, 0);
    if (currentTokens + estimatedTokens > this.config.tokensPerMinute) {
      return false;
    }

    return true;
  }

  recordRequest(tokens: number): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.tokenCounts.push({ timestamp: now, tokens });
    this.dailyRequestCount++;
  }

  private cleanup(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);
    this.tokenCounts = this.tokenCounts.filter((t) => t.timestamp > oneMinuteAgo);
  }

  getWaitTimeMs(): number {
    this.cleanup();

    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimestamps);
      return 60000 - (Date.now() - oldestRequest);
    }

    return 0;
  }
}

// ============================================================================
// Retry Handler
// ============================================================================

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: AIErrorCode[];
}

export class RetryHandler {
  private readonly defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'PROVIDER_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'TIMEOUT',
    ],
  };

  constructor(private readonly config: Partial<RetryConfig> = {}) {}

  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: AIError) => void
  ): Promise<T> {
    const cfg = { ...this.defaultConfig, ...this.config };
    let lastError: AIError | undefined;

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof AIError) {
          lastError = error;

          if (!error.retryable || !cfg.retryableErrors.includes(error.code)) {
            throw error;
          }

          if (attempt < cfg.maxRetries) {
            const delay = Math.min(
              cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
              cfg.maxDelayMs
            );

            if (onRetry) {
              onRetry(attempt + 1, error);
            }

            await this.sleep(delay);
          }
        } else {
          throw error;
        }
      }
    }

    throw lastError ?? new AIError('Unknown error', 'UNKNOWN_ERROR');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Base Provider Abstract Class
// ============================================================================

export abstract class BaseProvider {
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly rateLimiter?: RateLimiter;
  protected readonly retryHandler: RetryHandler;
  protected lastError?: string;
  protected lastLatencyMs?: number;

  constructor(protected readonly config: ProviderConfig) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeMs: 30000,
      halfOpenRequests: 3,
    });

    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }

    this.retryHandler = new RetryHandler({
      maxRetries: config.maxRetries ?? 3,
    });
  }

  /**
   * Provider type identifier
   */
  abstract get type(): ProviderType;

  /**
   * Display name for the provider
   */
  abstract get name(): string;

  /**
   * List of available models for this provider
   */
  abstract getModels(): Promise<ModelInfo[]>;

  /**
   * Check if the provider is properly configured and available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Execute a completion request (internal implementation)
   */
  protected abstract executeCompletion(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Execute a streaming completion request (internal implementation)
   */
  protected abstract executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse>;

  /**
   * Public method to execute a completion with circuit breaker, rate limiting, and retries
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new AIError(
        `Circuit breaker is open for provider ${this.type}`,
        'CIRCUIT_OPEN',
        this.type,
        true
      );
    }

    // Check rate limiter
    if (this.rateLimiter && !this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTimeMs();
      throw new AIError(
        `Rate limit exceeded for provider ${this.type}. Wait ${waitTime}ms`,
        'RATE_LIMIT_EXCEEDED',
        this.type,
        true,
        { waitTimeMs: waitTime }
      );
    }

    const startTime = Date.now();

    try {
      const response = await this.retryHandler.execute(
        async () => {
          if (request.stream) {
            throw new AIError(
              'Use stream() method for streaming requests',
              'INVALID_REQUEST',
              this.type
            );
          }
          return await this.executeCompletion(request);
        },
        (attempt, error) => {
          console.warn(
            `[${this.type}] Retry attempt ${attempt} after error: ${error.message}`
          );
        }
      );

      this.lastLatencyMs = Date.now() - startTime;
      this.circuitBreaker.recordSuccess();

      if (this.rateLimiter) {
        this.rateLimiter.recordRequest(response.usage.totalTokens);
      }

      return response;
    } catch (error) {
      this.lastLatencyMs = Date.now() - startTime;

      if (error instanceof AIError) {
        this.lastError = error.message;
        this.circuitBreaker.recordFailure();
        throw error;
      }

      const aiError = new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'PROVIDER_ERROR',
        this.type,
        true
      );
      this.lastError = aiError.message;
      this.circuitBreaker.recordFailure();
      throw aiError;
    }
  }

  /**
   * Public method to execute a streaming completion
   */
  async stream(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new AIError(
        `Circuit breaker is open for provider ${this.type}`,
        'CIRCUIT_OPEN',
        this.type,
        true
      );
    }

    // Check rate limiter
    if (this.rateLimiter && !this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTimeMs();
      throw new AIError(
        `Rate limit exceeded for provider ${this.type}. Wait ${waitTime}ms`,
        'RATE_LIMIT_EXCEEDED',
        this.type,
        true,
        { waitTimeMs: waitTime }
      );
    }

    const startTime = Date.now();

    try {
      const response = await this.executeStreamingCompletion(
        { ...request, stream: true },
        callback
      );

      this.lastLatencyMs = Date.now() - startTime;
      this.circuitBreaker.recordSuccess();

      if (this.rateLimiter) {
        this.rateLimiter.recordRequest(response.usage.totalTokens);
      }

      return response;
    } catch (error) {
      this.lastLatencyMs = Date.now() - startTime;

      if (error instanceof AIError) {
        this.lastError = error.message;
        this.circuitBreaker.recordFailure();
        throw error;
      }

      const aiError = new AIError(
        error instanceof Error ? error.message : 'Unknown error',
        'PROVIDER_ERROR',
        this.type,
        true
      );
      this.lastError = aiError.message;
      this.circuitBreaker.recordFailure();
      throw aiError;
    }
  }

  /**
   * Get the current status of this provider
   */
  getStatus(): ProviderStatus {
    return {
      type: this.type,
      available: this.config.enabled !== false,
      latencyMs: this.lastLatencyMs,
      lastError: this.lastError,
      lastChecked: new Date(),
      circuitState: this.circuitBreaker.currentState,
    };
  }

  /**
   * Validate and get the model to use
   */
  protected getModelId(request: CompletionRequest): string {
    return request.model ?? this.config.defaultModel ?? this.getDefaultModel();
  }

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * Calculate estimated cost for a request
   */
  async estimateCost(
    promptTokens: number,
    completionTokens: number,
    model?: string
  ): Promise<number> {
    const models = await this.getModels();
    const modelInfo = models.find((m) => m.id === (model ?? this.getDefaultModel()));

    if (!modelInfo) {
      return 0;
    }

    const inputCost = (promptTokens / 1000) * modelInfo.inputCostPer1kTokens;
    const outputCost = (completionTokens / 1000) * modelInfo.outputCostPer1kTokens;

    return inputCost + outputCost;
  }

  /**
   * Create standard headers for API requests
   */
  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.customHeaders,
    };
  }

  /**
   * Generate a unique request ID
   */
  protected generateRequestId(): string {
    return `${this.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Provider Registry
// ============================================================================

export class ProviderRegistry {
  private readonly providers = new Map<ProviderType, BaseProvider>();

  register(provider: BaseProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: ProviderType): BaseProvider | undefined {
    return this.providers.get(type);
  }

  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailable(): BaseProvider[] {
    return this.getAll().filter((p) => {
      const status = p.getStatus();
      return status.available && status.circuitState !== 'open';
    });
  }

  async getHealthy(): Promise<BaseProvider[]> {
    const available = this.getAvailable();
    const healthChecks = await Promise.all(
      available.map(async (p) => ({
        provider: p,
        healthy: await p.isAvailable(),
      }))
    );
    return healthChecks.filter((h) => h.healthy).map((h) => h.provider);
  }
}
