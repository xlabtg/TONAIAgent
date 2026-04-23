/**
 * Tests for Issue #355: Distributed Rate Limiter
 *
 * Compliance suite shared across all store backends:
 *   - MemoryStore
 *   - NoOpStore
 *   - RedisStore (via mock client)
 *
 * Additional tests:
 *   - RateLimiter.check() behaviour
 *   - Fail-closed / fail-open on store error
 *   - Metrics emission
 *   - createStandardRateLimit / createTradeRateLimit factories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  RateLimiter,
  MemoryStore,
  NoOpStore,
  RedisStore,
  getRateLimitMetrics,
  resetRateLimitMetrics,
  createStandardRateLimit,
  createTradeRateLimit,
} from '../../services/api/middleware/rate-limit.js';
import type { RateLimiterStore } from '../../services/api/middleware/rate-limit.js';
import type { AgentControlRequest } from '../../core/agents/control/index.js';

// ============================================================================
// Helpers
// ============================================================================

function makeReq(ip = '1.2.3.4'): AgentControlRequest {
  return {
    method: 'GET',
    path: '/api/agents',
    headers: { 'x-forwarded-for': ip },
  };
}

// ============================================================================
// Store compliance suite — every store must satisfy these contracts
// ============================================================================

function storeComplianceSuite(
  name: string,
  factory: () => RateLimiterStore,
  expectsAlwaysZero = false,
) {
  describe(`${name} — compliance suite`, () => {
    let store: RateLimiterStore;

    beforeEach(() => {
      store = factory();
    });

    it('returns count=1 on first call', async () => {
      const { count } = await store.incr('k1', 60_000);
      expect(count).toBe(expectsAlwaysZero ? 0 : 1);
    });

    it('increments count on successive calls within window', async () => {
      if (expectsAlwaysZero) return; // NoOpStore always 0
      await store.incr('k2', 60_000);
      const { count } = await store.incr('k2', 60_000);
      expect(count).toBe(2);
    });

    it('tracks keys independently', async () => {
      if (expectsAlwaysZero) return;
      await store.incr('a', 60_000);
      await store.incr('a', 60_000);
      const { count: bCount } = await store.incr('b', 60_000);
      expect(bCount).toBe(1);
    });

    it('returns a non-negative ttlMs', async () => {
      const { ttlMs } = await store.incr('k3', 60_000);
      expect(ttlMs).toBeGreaterThanOrEqual(0);
    });
  });
}

storeComplianceSuite('MemoryStore', () => new MemoryStore());
storeComplianceSuite('NoOpStore', () => new NoOpStore(), true);

// RedisStore compliance via a minimal mock client
storeComplianceSuite('RedisStore', () => {
  const state = new Map<string, { count: number; resetAt: number }>();

  const mockClient = {
    async eval(_script: string, _numkeys: number, key: string, windowMs: number) {
      const now = Date.now();
      const existing = state.get(key);
      if (!existing || now >= existing.resetAt) {
        state.set(key, { count: 1, resetAt: now + Number(windowMs) });
        return [1, Number(windowMs)];
      }
      existing.count++;
      return [existing.count, existing.resetAt - now];
    },
    async quit() {},
  };

  return new RedisStore(mockClient);
});

// ============================================================================
// MemoryStore — reset helper
// ============================================================================

describe('MemoryStore reset', () => {
  it('reset(key) clears a specific key', async () => {
    const store = new MemoryStore();
    await store.incr('x', 60_000);
    await store.incr('x', 60_000);
    store.reset('x');
    const { count } = await store.incr('x', 60_000);
    expect(count).toBe(1);
  });

  it('reset() clears all keys', async () => {
    const store = new MemoryStore();
    await store.incr('a', 60_000);
    await store.incr('b', 60_000);
    store.reset();
    const { count: a } = await store.incr('a', 60_000);
    const { count: b } = await store.incr('b', 60_000);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});

// ============================================================================
// MemoryStore — window expiry
// ============================================================================

describe('MemoryStore window expiry', () => {
  it('resets count after window expires', async () => {
    vi.useFakeTimers();
    const store = new MemoryStore();
    await store.incr('e', 100); // 100 ms window
    await store.incr('e', 100);
    vi.advanceTimersByTime(150); // past the window
    const { count } = await store.incr('e', 100);
    expect(count).toBe(1); // fresh window
    vi.useRealTimers();
  });
});

// ============================================================================
// RateLimiter.check()
// ============================================================================

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 60_000, max: 3 });
  });

  it('allows requests below the limit', async () => {
    expect(await limiter.check(makeReq())).toBeNull();
    expect(await limiter.check(makeReq())).toBeNull();
    expect(await limiter.check(makeReq())).toBeNull();
  });

  it('blocks the (max+1)-th request with 429', async () => {
    for (let i = 0; i < 3; i++) await limiter.check(makeReq());
    const res = await limiter.check(makeReq());
    expect(res?.statusCode).toBe(429);
    expect(res?.body.success).toBe(false);
    expect(res?.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('includes retryAfter in blocked response', async () => {
    for (let i = 0; i < 3; i++) await limiter.check(makeReq());
    const res = await limiter.check(makeReq());
    expect(res?.body.retryAfter).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', async () => {
    for (let i = 0; i < 3; i++) await limiter.check(makeReq('1.1.1.1'));
    expect(await limiter.check(makeReq('2.2.2.2'))).toBeNull();
  });

  it('resets the counter via reset(key)', async () => {
    for (let i = 0; i < 3; i++) await limiter.check(makeReq());
    limiter.reset('1.2.3.4');
    expect(await limiter.check(makeReq())).toBeNull();
  });

  it('resets all counters via reset()', async () => {
    for (let i = 0; i < 3; i++) await limiter.check(makeReq());
    limiter.reset();
    expect(await limiter.check(makeReq())).toBeNull();
  });

  it('uses x-real-ip as fallback key', async () => {
    const req: AgentControlRequest = { method: 'GET', path: '/', headers: { 'x-real-ip': '5.6.7.8' } };
    expect(await limiter.check(req)).toBeNull();
  });

  it('falls back to "unknown" when no IP header present', async () => {
    const req: AgentControlRequest = { method: 'GET', path: '/', headers: {} };
    expect(await limiter.check(req)).toBeNull();
  });
});

// ============================================================================
// Fail-closed and fail-open
// ============================================================================

describe('RateLimiter fail behaviour', () => {
  const brokenStore: RateLimiterStore = {
    async incr() {
      throw new Error('Redis connection refused');
    },
  };

  it('returns 429 when store throws and failOpen=false (default)', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 10, store: brokenStore });
    const res = await limiter.check(makeReq());
    expect(res?.statusCode).toBe(429);
  });

  it('returns null (allow) when store throws and failOpen=true', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 10, store: brokenStore, failOpen: true });
    const res = await limiter.check(makeReq());
    expect(res).toBeNull();
  });
});

// ============================================================================
// Metrics
// ============================================================================

describe('Rate limit metrics', () => {
  beforeEach(() => {
    resetRateLimitMetrics();
  });

  it('emits allowed metric for passing requests', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 10, bucket: 'test-allowed' });
    await limiter.check(makeReq());
    const text = getRateLimitMetrics();
    expect(text).toContain('bucket="test-allowed",result="allowed"');
  });

  it('emits blocked metric for blocked requests', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1, bucket: 'test-blocked' });
    await limiter.check(makeReq());
    await limiter.check(makeReq()); // this one is blocked
    const text = getRateLimitMetrics();
    expect(text).toContain('bucket="test-blocked",result="blocked"');
  });

  it('emits error metric when store throws', async () => {
    const brokenStore: RateLimiterStore = {
      async incr() { throw new Error('boom'); },
    };
    const limiter = new RateLimiter({ windowMs: 60_000, max: 10, bucket: 'test-error', store: brokenStore });
    await limiter.check(makeReq());
    const text = getRateLimitMetrics();
    expect(text).toContain('bucket="test-error",result="error"');
  });

  it('includes metric header lines', () => {
    const text = getRateLimitMetrics();
    expect(text).toContain('# HELP tonaiagent_rate_limit_hit_total');
    expect(text).toContain('# TYPE tonaiagent_rate_limit_hit_total counter');
  });
});

// ============================================================================
// Factory helpers
// ============================================================================

describe('createStandardRateLimit', () => {
  it('creates a limiter with max 100', async () => {
    const limiter = createStandardRateLimit();
    for (let i = 0; i < 100; i++) expect(await limiter.check(makeReq())).toBeNull();
    expect(await limiter.check(makeReq())).toMatchObject({ statusCode: 429 });
  });

  it('accepts a custom store', async () => {
    const store = new MemoryStore();
    const limiter = createStandardRateLimit(store);
    expect(await limiter.check(makeReq())).toBeNull();
  });
});

describe('createTradeRateLimit', () => {
  it('creates a limiter with max 10', async () => {
    const limiter = createTradeRateLimit();
    for (let i = 0; i < 10; i++) expect(await limiter.check(makeReq('10.0.0.2'))).toBeNull();
    expect(await limiter.check(makeReq('10.0.0.2'))).toMatchObject({ statusCode: 429 });
  });

  it('accepts a custom store', async () => {
    const store = new MemoryStore();
    const limiter = createTradeRateLimit(store);
    expect(await limiter.check(makeReq())).toBeNull();
  });
});

// ============================================================================
// NoOpStore — never blocks
// ============================================================================

describe('NoOpStore never blocks', () => {
  it('allows unlimited requests', async () => {
    const limiter = new RateLimiter({ windowMs: 60_000, max: 1, store: new NoOpStore() });
    for (let i = 0; i < 1000; i++) {
      expect(await limiter.check(makeReq())).toBeNull();
    }
  });
});
