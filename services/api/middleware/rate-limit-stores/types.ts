/**
 * RateLimiterStore — pluggable backend for the rate limiter.
 *
 * `incr` atomically increments the counter for `key` inside a `windowMs`
 * sliding window and returns the new count plus the remaining TTL in ms.
 */
export interface RateLimiterStore {
  incr(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }>;
}
