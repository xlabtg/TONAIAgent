/**
 * Integration tests for RedisStore with a real Redis instance.
 *
 * These tests require a Redis server reachable at REDIS_URL (or the default
 * redis://localhost:6379).  In CI the service is started via `services:` in
 * the workflow.  Locally run `docker run -p 6379:6379 redis:7-alpine` first.
 *
 * The suite is skipped automatically when REDIS_INTEGRATION_TEST is not set
 * to "true" so the regular `npm test` run stays fast and dependency-free.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { RedisStore } from '../../services/api/middleware/rate-limit-stores/redis.js';
import { RateLimiter } from '../../services/api/middleware/rate-limit.js';

const RUN = process.env['REDIS_INTEGRATION_TEST'] === 'true';

describe.skipIf(!RUN)('RedisStore integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Redis: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let client: any;
  let store: RedisStore;

  const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  const testPrefix = `rl-test-${Date.now()}`;

  beforeAll(async () => {
    const mod = await import('ioredis');
    Redis = mod.default;
    client = new Redis(redisUrl);
    store = new RedisStore(client, testPrefix);
  });

  afterAll(async () => {
    // Clean up all keys created by this test run
    const keys: string[] = await client.keys(`${testPrefix}:*`);
    if (keys.length > 0) await client.del(...keys);
    await client.quit();
  });

  beforeEach(async () => {
    // Wipe keys before each test for isolation
    const keys: string[] = await client.keys(`${testPrefix}:*`);
    if (keys.length > 0) await client.del(...keys);
  });

  it('returns count=1 on first increment', async () => {
    const { count } = await store.incr('ip:10.0.0.1', 60_000);
    expect(count).toBe(1);
  });

  it('increments atomically on successive calls', async () => {
    await store.incr('ip:10.0.0.2', 60_000);
    const { count } = await store.incr('ip:10.0.0.2', 60_000);
    expect(count).toBe(2);
  });

  it('keys expire after the window', async () => {
    const windowMs = 200; // very short for testing
    await store.incr('ip:10.0.0.3', windowMs);
    await new Promise(r => setTimeout(r, windowMs + 100));
    // After expiry a new incr should reset to 1
    const { count } = await store.incr('ip:10.0.0.3', windowMs);
    expect(count).toBe(1);
  });

  it('tracks separate keys independently', async () => {
    await store.incr('ip:a.a.a.a', 60_000);
    await store.incr('ip:a.a.a.a', 60_000);
    const { count } = await store.incr('ip:b.b.b.b', 60_000);
    expect(count).toBe(1);
  });

  it('returns a positive ttlMs within the window', async () => {
    const windowMs = 5_000;
    const { ttlMs } = await store.incr('ip:10.0.0.4', windowMs);
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(windowMs);
  });

  // ============================================================================
  // Chaos: Redis dropped mid-window
  // ============================================================================

  describe('Chaos: store unavailable', () => {
    it('fails closed by default when Redis is unreachable', async () => {
      // Create a store pointing at a non-existent Redis
      const deadClient = new Redis('redis://localhost:19999', {
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      try {
        await deadClient.connect().catch(() => {});
      } catch {
        // expected
      }

      const deadStore = new RedisStore(deadClient, testPrefix);
      const limiter = new RateLimiter({
        windowMs: 60_000,
        max: 100,
        store: deadStore,
        failOpen: false,
      });

      const req = { method: 'GET', path: '/', headers: { 'x-forwarded-for': '1.1.1.1' } };
      const res = await limiter.check(req);
      expect(res?.statusCode).toBe(429);

      await deadClient.quit().catch(() => {});
    });

    it('allows requests when failOpen=true and Redis is unreachable', async () => {
      const deadClient = new Redis('redis://localhost:19999', {
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null,
      });

      try {
        await deadClient.connect().catch(() => {});
      } catch {
        // expected
      }

      const deadStore = new RedisStore(deadClient, testPrefix);
      const limiter = new RateLimiter({
        windowMs: 60_000,
        max: 100,
        store: deadStore,
        failOpen: true,
      });

      const req = { method: 'GET', path: '/', headers: { 'x-forwarded-for': '1.1.1.1' } };
      const res = await limiter.check(req);
      expect(res).toBeNull();

      await deadClient.quit().catch(() => {});
    });
  });
});
