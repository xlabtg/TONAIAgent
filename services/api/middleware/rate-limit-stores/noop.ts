import type { RateLimiterStore } from './types.js';

/**
 * No-op store — every call returns count=0 so limits are never triggered.
 * Intended for explicit bypass in trusted internal traffic only.
 * NEVER select this store as a default.
 */
export class NoOpStore implements RateLimiterStore {
  async incr(_key: string, _windowMs: number): Promise<{ count: number; ttlMs: number }> {
    return { count: 0, ttlMs: 0 };
  }
}
