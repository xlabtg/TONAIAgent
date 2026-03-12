/**
 * TONAIAgent - Base TON DEX Provider
 *
 * Abstract base class for TON DEX providers (DeDust, STON.fi, TONCO).
 * Provides common infrastructure: retry logic, timeout handling, and logging.
 *
 * @see Issue #211 — Live Market Data Connectors (TON DEX)
 */

import type {
  TonDexProvider,
  TonDexProviderConfig,
  TonDexProviderName,
  DexPriceQuote,
  LiquidityPool,
  SwapEvent,
  OHLCVCandle,
  CandleInterval,
} from './types';
import { TonDexError } from './types';

// ============================================================================
// Base TON DEX Provider
// ============================================================================

/**
 * Abstract base class for TON DEX providers.
 * Provides common utilities: token validation, retry logic, and HTTP helpers.
 */
export abstract class BaseTonDexProvider implements TonDexProvider {
  protected readonly config: TonDexProviderConfig;
  protected readonly debug: boolean;

  constructor(config: TonDexProviderConfig) {
    this.config = {
      timeoutMs: 15_000,
      maxRetries: 2,
      debug: false,
      ...config,
    };
    this.debug = this.config.debug ?? false;
  }

  // ============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================================

  abstract getName(): TonDexProviderName;
  abstract getSupportedTokens(): Promise<string[]>;
  abstract getPrice(token: string): Promise<DexPriceQuote>;
  abstract getPools(): Promise<LiquidityPool[]>;
  abstract getPool(poolId: string): Promise<LiquidityPool | null>;
  abstract getPoolsForToken(token: string): Promise<LiquidityPool[]>;
  abstract getRecentSwaps(limit?: number): Promise<SwapEvent[]>;
  abstract getSwapsForPool(poolId: string, limit?: number): Promise<SwapEvent[]>;
  abstract getCandles(
    token: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number
  ): Promise<OHLCVCandle[]>;
  abstract healthCheck(): Promise<boolean>;

  // ============================================================================
  // Protected Helpers
  // ============================================================================

  /**
   * Validates that the requested token is supported.
   * Throws TonDexError with TOKEN_NOT_SUPPORTED if not.
   */
  protected async validateToken(token: string): Promise<void> {
    const supported = await this.getSupportedTokens();
    const upperToken = token.toUpperCase();
    if (!supported.some(t => t.toUpperCase() === upperToken)) {
      throw new TonDexError(
        `Token '${token}' is not supported by provider '${this.getName()}'`,
        'TOKEN_NOT_SUPPORTED',
        this.getName(),
        { token, supportedTokens: supported.slice(0, 10) }
      );
    }
  }

  /**
   * Returns the current UNIX timestamp in seconds.
   */
  protected nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Retries an async operation up to maxRetries times on transient errors.
   * Non-transient errors (TOKEN_NOT_SUPPORTED, POOL_NOT_FOUND) are rethrown immediately.
   */
  protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 2;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;

        // Don't retry non-transient errors
        if (
          err instanceof TonDexError &&
          (err.code === 'TOKEN_NOT_SUPPORTED' ||
            err.code === 'POOL_NOT_FOUND' ||
            err.code === 'PROVIDER_RATE_LIMITED')
        ) {
          throw err;
        }

        // Wait before retrying (exponential backoff: 300ms, 600ms, 1200ms)
        if (attempt < maxRetries) {
          const delay = 300 * Math.pow(2, attempt);
          this.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Fetches a URL and parses the JSON response.
   * Throws TonDexError on HTTP errors or parse failures.
   */
  protected async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    let response: Response;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs ?? 15_000
      );

      try {
        response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      throw new TonDexError(
        isTimeout
          ? `${this.getName()} request timed out after ${this.config.timeoutMs}ms`
          : `${this.getName()} fetch failed: ${String(err)}`,
        isTimeout ? 'FETCH_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
        this.getName(),
        { url }
      );
    }

    if (response.status === 429) {
      throw new TonDexError(
        `${this.getName()} rate limit exceeded`,
        'PROVIDER_RATE_LIMITED',
        this.getName(),
        { status: response.status }
      );
    }

    if (!response.ok) {
      throw new TonDexError(
        `${this.getName()} API returned HTTP ${response.status}`,
        'PROVIDER_UNAVAILABLE',
        this.getName(),
        { status: response.status, url }
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new TonDexError(
        `${this.getName()} returned invalid JSON`,
        'INVALID_RESPONSE',
        this.getName(),
        { url }
      );
    }
  }

  /**
   * Debug logging helper.
   */
  protected log(message: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      console.log(`[${this.getName()}] ${message}`, data ?? '');
    }
  }

  /**
   * Calculates confidence score based on liquidity and volume.
   * Higher liquidity and volume = higher confidence.
   */
  protected calculateConfidence(liquidityUsd: number, volume24hUsd: number): number {
    // Confidence factors:
    // - Liquidity: >$1M = 1.0, >$100K = 0.8, >$10K = 0.5, else 0.3
    // - Volume: >$100K = 1.0, >$10K = 0.8, >$1K = 0.5, else 0.3
    // Final score is average of both

    let liquidityScore: number;
    if (liquidityUsd >= 1_000_000) {
      liquidityScore = 1.0;
    } else if (liquidityUsd >= 100_000) {
      liquidityScore = 0.8;
    } else if (liquidityUsd >= 10_000) {
      liquidityScore = 0.5;
    } else {
      liquidityScore = 0.3;
    }

    let volumeScore: number;
    if (volume24hUsd >= 100_000) {
      volumeScore = 1.0;
    } else if (volume24hUsd >= 10_000) {
      volumeScore = 0.8;
    } else if (volume24hUsd >= 1_000) {
      volumeScore = 0.5;
    } else {
      volumeScore = 0.3;
    }

    return (liquidityScore + volumeScore) / 2;
  }

  /**
   * Normalizes token symbol to uppercase.
   */
  protected normalizeSymbol(symbol: string): string {
    return symbol.toUpperCase().trim();
  }

  /**
   * Formats a pair string from two token symbols.
   */
  protected formatPair(token0: string, token1: string): string {
    return `${this.normalizeSymbol(token0)}/${this.normalizeSymbol(token1)}`;
  }
}
