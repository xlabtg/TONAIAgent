/**
 * TONAIAgent - ChangeNOW API Client
 *
 * Integration layer for ChangeNOW's swap and exchange API.
 * Supports 200+ blockchains and 1200+ assets for cross-chain operations.
 *
 * Features:
 * - Currency listing and discovery
 * - Exchange rate estimation
 * - Transaction creation and tracking
 * - Rate limiting and retry logic
 * - Error handling and recovery
 */

import {
  ChangeNowConfig,
  ChangeNowCurrency,
  ChangeNowEstimate,
  ChangeNowMinAmount,
  ChangeNowTransaction,
  ChangeNowTransactionStatus,
  CreateExchangeRequest,
  CreateExchangeResponse,
  OmnichainError,
  OmnichainErrorCode,
  ActionResult,
  OmnichainEvent,
  OmnichainEventCallback,
} from './types';

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    // Wait for next token
    const waitTime = Math.ceil(1000 / this.refillRate);
    await this.sleep(waitTime);
    this.refill();
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// ChangeNOW Client Interface
// ============================================================================

export interface ChangeNowClient {
  // Currency operations
  getCurrencies(active?: boolean): Promise<ActionResult<ChangeNowCurrency[]>>;
  getCurrency(ticker: string): Promise<ActionResult<ChangeNowCurrency | null>>;
  getCurrenciesForPair(fromTicker: string, toTicker: string): Promise<ActionResult<boolean>>;

  // Rate operations
  getMinAmount(fromTicker: string, toTicker: string): Promise<ActionResult<ChangeNowMinAmount>>;
  getEstimate(
    fromTicker: string,
    toTicker: string,
    amount: string,
    type?: 'direct' | 'reverse'
  ): Promise<ActionResult<ChangeNowEstimate>>;

  // Exchange operations
  createExchange(request: CreateExchangeRequest): Promise<ActionResult<CreateExchangeResponse>>;
  getTransaction(transactionId: string): Promise<ActionResult<ChangeNowTransaction>>;
  getTransactionStatus(transactionId: string): Promise<ActionResult<ChangeNowTransactionStatus>>;

  // Health check
  checkHealth(): Promise<ActionResult<boolean>>;

  // Events
  onEvent(callback: OmnichainEventCallback): void;
}

export interface ChangeNowClientConfig extends Partial<ChangeNowConfig> {}

// ============================================================================
// Default ChangeNOW Client Implementation
// ============================================================================

export class DefaultChangeNowClient implements ChangeNowClient {
  private readonly config: ChangeNowConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly eventCallbacks: OmnichainEventCallback[] = [];
  private currencyCache: Map<string, ChangeNowCurrency> = new Map();
  private currencyCacheExpiry: number = 0;
  private readonly cacheDurationMs = 5 * 60 * 1000; // 5 minutes

  constructor(config: ChangeNowClientConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.CHANGENOW_API_KEY || '',
      apiVersion: config.apiVersion || 'v1',
      baseUrl: config.baseUrl || 'https://api.changenow.io',
      timeoutMs: config.timeoutMs || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 1000,
      rateLimitPerSecond: config.rateLimitPerSecond || 30,
    };
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerSecond);
  }

  // ==========================================================================
  // Currency Operations
  // ==========================================================================

  async getCurrencies(active: boolean = true): Promise<ActionResult<ChangeNowCurrency[]>> {
    const startTime = Date.now();
    try {
      // Check cache first
      if (this.currencyCacheExpiry > Date.now() && this.currencyCache.size > 0) {
        const currencies = Array.from(this.currencyCache.values());
        return {
          success: true,
          data: active ? currencies.filter(c => !c.isFiat) : currencies,
          executionTime: Date.now() - startTime,
        };
      }

      const endpoint = `/${this.config.apiVersion}/currencies`;
      const params = new URLSearchParams({ active: String(active) });

      const result = await this.makeRequest<ChangeNowCurrency[]>('GET', `${endpoint}?${params}`);

      if (result.success && result.data) {
        // Update cache
        this.currencyCache.clear();
        for (const currency of result.data) {
          this.currencyCache.set(currency.ticker.toLowerCase(), currency);
        }
        this.currencyCacheExpiry = Date.now() + this.cacheDurationMs;

        this.emitEvent('info', 'currencies_fetched', {
          count: result.data.length,
        });
      }

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getCurrency(ticker: string): Promise<ActionResult<ChangeNowCurrency | null>> {
    const startTime = Date.now();
    try {
      // Check cache first
      const cached = this.currencyCache.get(ticker.toLowerCase());
      if (cached && this.currencyCacheExpiry > Date.now()) {
        return {
          success: true,
          data: cached,
          executionTime: Date.now() - startTime,
        };
      }

      // Fetch all currencies and cache
      const result = await this.getCurrencies();
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      const currency = this.currencyCache.get(ticker.toLowerCase()) || null;
      return {
        success: true,
        data: currency,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getCurrenciesForPair(
    fromTicker: string,
    toTicker: string
  ): Promise<ActionResult<boolean>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/currencies-to/${fromTicker.toLowerCase()}`;
      const result = await this.makeRequest<ChangeNowCurrency[]>('GET', endpoint);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      const isAvailable = result.data.some(
        c => c.ticker.toLowerCase() === toTicker.toLowerCase()
      );

      return {
        success: true,
        data: isAvailable,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Rate Operations
  // ==========================================================================

  async getMinAmount(
    fromTicker: string,
    toTicker: string
  ): Promise<ActionResult<ChangeNowMinAmount>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/min-amount/${fromTicker.toLowerCase()}_${toTicker.toLowerCase()}`;
      const result = await this.makeRequest<{ minAmount: number }>('GET', endpoint);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: {
          minAmount: String(result.data.minAmount),
          fromCurrency: fromTicker.toLowerCase(),
          toCurrency: toTicker.toLowerCase(),
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getEstimate(
    fromTicker: string,
    toTicker: string,
    amount: string,
    _type: 'direct' | 'reverse' = 'direct'
  ): Promise<ActionResult<ChangeNowEstimate>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/exchange-amount/${amount}/${fromTicker.toLowerCase()}_${toTicker.toLowerCase()}`;
      const params = new URLSearchParams();
      if (this.config.apiKey) {
        params.append('api_key', this.config.apiKey);
      }

      const url = params.toString() ? `${endpoint}?${params}` : endpoint;
      const result = await this.makeRequest<{
        estimatedAmount: number;
        transactionSpeedForecast: string;
        warningMessage?: string;
        rateId?: string;
        validUntil?: string;
        networkFee?: number;
      }>('GET', url);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      const estimate: ChangeNowEstimate = {
        estimatedAmount: String(result.data.estimatedAmount),
        transactionSpeedForecast: result.data.transactionSpeedForecast,
        warningMessage: result.data.warningMessage,
        rateId: result.data.rateId,
        validUntil: result.data.validUntil,
        fromAmount: amount,
        toAmount: String(result.data.estimatedAmount),
        fromCurrency: fromTicker.toLowerCase(),
        toCurrency: toTicker.toLowerCase(),
        networkFee: result.data.networkFee ? String(result.data.networkFee) : undefined,
      };

      this.emitEvent('info', 'rate_estimated', {
        fromCurrency: fromTicker,
        toCurrency: toTicker,
        amount,
        estimatedAmount: estimate.estimatedAmount,
      });

      return {
        success: true,
        data: estimate,
        warnings: estimate.warningMessage ? [estimate.warningMessage] : undefined,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Exchange Operations
  // ==========================================================================

  async createExchange(
    request: CreateExchangeRequest
  ): Promise<ActionResult<CreateExchangeResponse>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/transactions/${this.config.apiKey}`;

      const body = {
        from: request.fromCurrency.toLowerCase(),
        to: request.toCurrency.toLowerCase(),
        amount: request.fromAmount,
        address: request.address,
        extraId: request.extraId,
        refundAddress: request.refundAddress,
        refundExtraId: request.refundExtraId,
        userId: request.userId,
        contactEmail: request.contactEmail,
        rateId: request.rateId,
      };

      const result = await this.makeRequest<{
        id: string;
        payinAddress: string;
        payinExtraId?: string;
        payoutAddress: string;
        payoutExtraId?: string;
        fromCurrency: string;
        toCurrency: string;
        amount: number;
        validUntil?: string;
      }>('POST', endpoint, body);

      if (!result.success || !result.data) {
        this.emitEvent('error', 'exchange_creation_failed', {
          request,
          error: result.error,
        });
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      const response: CreateExchangeResponse = {
        id: result.data.id,
        payinAddress: result.data.payinAddress,
        payinExtraId: result.data.payinExtraId,
        payoutAddress: result.data.payoutAddress,
        payoutExtraId: result.data.payoutExtraId,
        fromCurrency: result.data.fromCurrency,
        toCurrency: result.data.toCurrency,
        amount: String(result.data.amount),
        validUntil: result.data.validUntil,
      };

      this.emitEvent('info', 'exchange_created', {
        exchangeId: response.id,
        fromCurrency: response.fromCurrency,
        toCurrency: response.toCurrency,
        amount: response.amount,
        payinAddress: response.payinAddress,
      });

      return {
        success: true,
        data: response,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getTransaction(
    transactionId: string
  ): Promise<ActionResult<ChangeNowTransaction>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/transactions/${transactionId}/${this.config.apiKey}`;
      const result = await this.makeRequest<{
        id: string;
        status: string;
        payinAddress: string;
        payoutAddress: string;
        payinExtraId?: string;
        payoutExtraId?: string;
        fromCurrency: string;
        toCurrency: string;
        expectedAmountFrom: number;
        expectedAmountTo: number;
        amountFrom?: number;
        amountTo?: number;
        createdAt: string;
        updatedAt: string;
        validUntil?: string;
        payinHash?: string;
        payoutHash?: string;
        networkFee?: number;
      }>('GET', endpoint);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      const transaction: ChangeNowTransaction = {
        id: result.data.id,
        status: result.data.status as ChangeNowTransactionStatus,
        payinAddress: result.data.payinAddress,
        payoutAddress: result.data.payoutAddress,
        payinExtraId: result.data.payinExtraId,
        payoutExtraId: result.data.payoutExtraId,
        fromCurrency: result.data.fromCurrency,
        toCurrency: result.data.toCurrency,
        expectedAmountFrom: String(result.data.expectedAmountFrom),
        expectedAmountTo: String(result.data.expectedAmountTo),
        amountFrom: result.data.amountFrom ? String(result.data.amountFrom) : undefined,
        amountTo: result.data.amountTo ? String(result.data.amountTo) : undefined,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        validUntil: result.data.validUntil,
        payinHash: result.data.payinHash,
        payoutHash: result.data.payoutHash,
        networkFee: result.data.networkFee ? String(result.data.networkFee) : undefined,
      };

      return {
        success: true,
        data: transaction,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  async getTransactionStatus(
    transactionId: string
  ): Promise<ActionResult<ChangeNowTransactionStatus>> {
    const startTime = Date.now();
    try {
      const endpoint = `/${this.config.apiVersion}/transactions/${transactionId}/${this.config.apiKey}`;
      const result = await this.makeRequest<{ status: string }>('GET', endpoint);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error,
          executionTime: Date.now() - startTime,
        };
      }

      return {
        success: true,
        data: result.data.status as ChangeNowTransactionStatus,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  async checkHealth(): Promise<ActionResult<boolean>> {
    const startTime = Date.now();
    try {
      const result = await this.getCurrencies(false);
      return {
        success: result.success,
        data: result.success,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        data: false,
        error: this.createError('API_ERROR', 'Health check failed'),
        executionTime: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onEvent(callback: OmnichainEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(
    severity: OmnichainEvent['severity'],
    type: string,
    data: Record<string, unknown>
  ): void {
    const event: OmnichainEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: type as OmnichainEvent['type'],
      source: 'changenow_client',
      severity,
      message: `ChangeNOW: ${type}`,
      data,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<ActionResult<T>> {
    let lastError: OmnichainError | undefined;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.acquire();

        const url = `${this.config.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        const options: RequestInit = {
          method,
          headers,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        };

        if (body && method === 'POST') {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorBody = await response.text();
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = errorBody || errorMessage;
          }

          if (response.status >= 500 && attempt < this.config.retryAttempts - 1) {
            lastError = this.createError('API_ERROR', errorMessage);
            await this.sleep(this.config.retryDelayMs * (attempt + 1));
            continue;
          }

          return {
            success: false,
            error: this.createError('API_ERROR', errorMessage),
            executionTime: 0,
          };
        }

        const data = await response.json();
        return {
          success: true,
          data: data as T,
          executionTime: 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (
          message.includes('timeout') ||
          message.includes('network') ||
          message.includes('ECONNREFUSED')
        ) {
          lastError = this.createError('TIMEOUT', message);
          if (attempt < this.config.retryAttempts - 1) {
            await this.sleep(this.config.retryDelayMs * (attempt + 1));
            continue;
          }
        }

        return {
          success: false,
          error: this.createError('API_ERROR', message),
          executionTime: 0,
        };
      }
    }

    return {
      success: false,
      error: lastError || this.createError('API_ERROR', 'Max retries exceeded'),
      executionTime: 0,
    };
  }

  private handleError(error: unknown, startTime: number): ActionResult<never> {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: this.createError('API_ERROR', message),
      executionTime: Date.now() - startTime,
    };
  }

  private createError(code: OmnichainErrorCode, message: string): OmnichainError {
    return {
      code,
      message,
      retryable: code === 'TIMEOUT' || code === 'API_ERROR',
    };
  }

  private generateId(): string {
    return `cn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createChangeNowClient(
  config?: ChangeNowClientConfig
): DefaultChangeNowClient {
  return new DefaultChangeNowClient(config);
}

export default DefaultChangeNowClient;
