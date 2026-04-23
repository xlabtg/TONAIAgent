import type { RateLimiterStore } from './types.js';

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * In-process sliding-window store.  Suitable for development and unit tests.
 * State is lost on process restart — do not use in multi-replica production.
 */
export class MemoryStore implements RateLimiterStore {
  private readonly windows = new Map<string, WindowEntry>();

  async incr(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }> {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { count: 1, ttlMs: windowMs };
    }

    entry.count++;
    return { count: entry.count, ttlMs: entry.resetAt - now };
  }

  /** Reset the counter for a specific key (or all keys). Useful in tests. */
  reset(key?: string): void {
    if (key !== undefined) {
      this.windows.delete(key);
    } else {
      this.windows.clear();
    }
  }
}
