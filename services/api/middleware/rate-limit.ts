/**
 * TONAIAgent - Rate Limiting Middleware
 *
 * Pluggable sliding-window rate limiter.  The in-process MemoryStore is the
 * default; swap in RedisStore for distributed / multi-replica deployments.
 *
 * Backend selection via RATE_LIMIT_STORE env var (redis | memory).
 * Fail-closed behaviour when Redis is unreachable unless RATE_LIMIT_FAIL_OPEN=true.
 *
 * Implements Issue #309 (API input validation) and Issue #355 (distributed store).
 */

import type { AgentControlRequest, AgentControlResponse } from '../../../core/agents/control/index.js';
import { MemoryStore } from './rate-limit-stores/memory.js';
import { NoOpStore } from './rate-limit-stores/noop.js';
import type { RateLimiterStore } from './rate-limit-stores/types.js';

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type { RateLimiterStore };
export { MemoryStore } from './rate-limit-stores/memory.js';
export { NoOpStore } from './rate-limit-stores/noop.js';
export { RedisStore } from './rate-limit-stores/redis.js';
export type { RedisClient } from './rate-limit-stores/redis.js';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Length of the window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Bucket label used in metrics (e.g. "standard", "trade") */
  bucket?: string;
  /** Key extractor — defaults to IP from headers */
  keyExtractor?: (req: AgentControlRequest) => string;
  /**
   * Store backend.  Defaults to MemoryStore.
   * Pass a RedisStore for production multi-instance deployments.
   */
  store?: RateLimiterStore;
  /**
   * When the store throws (e.g. Redis unreachable), allow the request through
   * instead of blocking it.  Defaults to false (fail-closed).
   * Set to true only if you prefer availability over strict rate enforcement.
   */
  failOpen?: boolean;
}

// ============================================================================
// Metrics
// ============================================================================

/** In-process counter for `tonaiagent_rate_limit_hit_total{bucket,result}`. */
const metrics: Record<string, Record<string, number>> = {};

function recordMetric(bucket: string, result: 'allowed' | 'blocked' | 'error'): void {
  if (!metrics[bucket]) metrics[bucket] = {};
  metrics[bucket][result] = (metrics[bucket][result] ?? 0) + 1;
}

/**
 * Return a Prometheus-compatible text snapshot of the rate-limit hit counter.
 * Merge this into your `/metrics` endpoint.
 */
export function getRateLimitMetrics(): string {
  const lines: string[] = [
    '# HELP tonaiagent_rate_limit_hit_total Total rate-limit decisions',
    '# TYPE tonaiagent_rate_limit_hit_total counter',
  ];
  for (const [bucket, results] of Object.entries(metrics)) {
    for (const [result, count] of Object.entries(results)) {
      lines.push(
        `tonaiagent_rate_limit_hit_total{bucket="${bucket}",result="${result}"} ${count}`,
      );
    }
  }
  return lines.join('\n');
}

/** Reset all metrics counters (useful in tests). */
export function resetRateLimitMetrics(): void {
  for (const key of Object.keys(metrics)) {
    delete metrics[key];
  }
}

// ============================================================================
// RateLimiter
// ============================================================================

/**
 * Sliding-window rate limiter backed by a pluggable RateLimiterStore.
 *
 * Call `check(req)` on every incoming request.  If the limit has not been
 * exceeded the method returns `null` (pass-through).  If the limit IS
 * exceeded it returns a 429 `AgentControlResponse` that should be sent
 * immediately without further processing.
 */
export class RateLimiter {
  private readonly config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      bucket: config.bucket ?? 'default',
      keyExtractor: config.keyExtractor ?? defaultKeyExtractor,
      store: config.store ?? new MemoryStore(),
      failOpen: config.failOpen ?? false,
      windowMs: config.windowMs,
      max: config.max,
    };
  }

  /**
   * Check whether the request is within the rate limit.
   * Returns `null` if the request is allowed, or a 429 response if blocked.
   */
  async check(req: AgentControlRequest): Promise<AgentControlResponse | null> {
    const key = this.config.keyExtractor(req);
    const { bucket, windowMs, max, store, failOpen } = this.config;

    let count: number;
    let ttlMs: number;

    try {
      ({ count, ttlMs } = await store.incr(key, windowMs));
    } catch {
      recordMetric(bucket, 'error');
      if (failOpen) {
        return null;
      }
      // Fail-closed: treat as if limit is exceeded to protect the system
      return {
        statusCode: 429,
        body: {
          success: false,
          error: 'Rate limit store unavailable — please retry later',
          code: 'RATE_LIMIT_EXCEEDED' as const,
          retryAfter: Math.ceil(windowMs / 1000),
        },
      };
    }

    if (count > max) {
      recordMetric(bucket, 'blocked');
      const retryAfterSecs = Math.ceil(ttlMs / 1000);
      return {
        statusCode: 429,
        body: {
          success: false,
          error: 'Too many requests — please retry later',
          code: 'RATE_LIMIT_EXCEEDED' as const,
          retryAfter: retryAfterSecs,
        },
      };
    }

    recordMetric(bucket, 'allowed');
    return null;
  }

  /**
   * Reset the counter for a specific key (or all keys) when using a MemoryStore.
   * No-op for other store backends.
   */
  reset(key?: string): void {
    const { store } = this.config;
    if (store instanceof MemoryStore) {
      store.reset(key);
    }
  }
}

// ============================================================================
// Default Key Extractor
// ============================================================================

function defaultKeyExtractor(req: AgentControlRequest): string {
  // Respect standard proxy headers first, then fall back to a placeholder
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
    req.headers?.['x-real-ip'] ??
    'unknown'
  );
}

// ============================================================================
// Store factory — reads RATE_LIMIT_STORE env var
// ============================================================================

/**
 * Build the appropriate store from environment variables.
 *
 * RATE_LIMIT_STORE=memory  (default) — MemoryStore
 * RATE_LIMIT_STORE=redis             — RedisStore (requires REDIS_URL)
 * RATE_LIMIT_STORE=noop              — NoOpStore  (explicit bypass only)
 *
 * When redis is requested but REDIS_URL is absent, throws to prevent silent
 * misconfiguration.
 */
export async function createStoreFromEnv(): Promise<RateLimiterStore> {
  const backend = process.env['RATE_LIMIT_STORE'] ?? 'memory';

  switch (backend) {
    case 'redis': {
      const redisUrl = process.env['REDIS_URL'];
      if (!redisUrl) {
        throw new Error(
          'RATE_LIMIT_STORE=redis requires REDIS_URL to be set',
        );
      }
      // Lazy-require keeps ioredis optional — only needed when RATE_LIMIT_STORE=redis.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const IoRedis = require('ioredis') as { default: new (url: string) => import('./rate-limit-stores/redis.js').RedisClient };
      const RedisConstructor = IoRedis.default ?? (IoRedis as unknown as new (url: string) => import('./rate-limit-stores/redis.js').RedisClient);
      const { RedisStore } = await import('./rate-limit-stores/redis.js');
      return new RedisStore(new RedisConstructor(redisUrl));
    }
    case 'noop':
      return new NoOpStore();
    default:
      return new MemoryStore();
  }
}

// ============================================================================
// Pre-built Rate Limiters
// ============================================================================

/**
 * Standard rate limit: 100 requests per 15-minute window.
 * Suitable for general read endpoints.
 */
export function createStandardRateLimit(store?: RateLimiterStore): RateLimiter {
  const cfg: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    bucket: 'standard',
  };
  if (store !== undefined) cfg.store = store;
  return new RateLimiter(cfg);
}

/**
 * Trade/mutation rate limit: 10 requests per 1-minute window.
 * Suitable for state-mutating endpoints (start/stop/restart).
 */
export function createTradeRateLimit(store?: RateLimiterStore): RateLimiter {
  const cfg: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    bucket: 'trade',
  };
  if (store !== undefined) cfg.store = store;
  return new RateLimiter(cfg);
}
