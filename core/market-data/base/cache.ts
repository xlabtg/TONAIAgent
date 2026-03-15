/**
 * TONAIAgent - Market Data Cache Layer
 *
 * In-memory cache for market data to avoid excessive API calls.
 * Cache TTL defaults to 30 seconds (configurable up to 60 seconds per MVP spec).
 *
 * Cache flow:
 * ```
 * Strategy requests BTC price
 *         ↓
 * Cache check (has(key) && !isExpired())
 *         ↓
 * If cached → return cached value
 *         ↓
 * If not → fetch from API → save to cache → return
 * ```
 */

import type { CacheConfig, CacheEntry } from './types';

// ============================================================================
// Default Cache Configuration
// ============================================================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlSeconds: 30,
  maxEntries: 100,
};

// ============================================================================
// Market Data Cache
// ============================================================================

/**
 * MarketDataCache — thread-safe in-memory cache for market data responses.
 *
 * Keys are strings (e.g. "coingecko:BTC", "binance:ETH").
 * Each entry stores the cached value and its expiry timestamp.
 *
 * @example
 * ```typescript
 * const cache = new MarketDataCache({ ttlSeconds: 30, maxEntries: 100 });
 *
 * if (cache.has('coingecko:BTC')) {
 *   return cache.get('coingecko:BTC');
 * }
 *
 * const price = await provider.getPrice('BTC');
 * cache.set('coingecko:BTC', price);
 * return price;
 * ```
 */
export class MarketDataCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Returns true if the cache has a valid (non-expired) entry for the key.
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Returns the cached value for the key, or undefined if missing or expired.
   */
  get(key: string): T | undefined {
    if (!this.has(key)) return undefined;
    return this.entries.get(key)?.value;
  }

  /**
   * Stores a value in the cache with the configured TTL.
   * If the cache is at capacity, the oldest entry is evicted first.
   */
  set(key: string, value: T): void {
    // Evict oldest entry if at capacity
    if (this.entries.size >= this.config.maxEntries && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.config.ttlSeconds * 1000,
    });
  }

  /**
   * Removes a single entry from the cache.
   */
  delete(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Returns the number of entries currently in the cache (including expired ones not yet evicted).
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Removes all expired entries and returns the count of evicted entries.
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  /**
   * Returns the TTL remaining for a cache key in milliseconds.
   * Returns 0 if the key is missing or expired.
   */
  ttlMs(key: string): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }
}
