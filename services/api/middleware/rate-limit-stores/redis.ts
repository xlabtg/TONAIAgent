import type { RateLimiterStore } from './types.js';

/**
 * Minimal Redis client interface — satisfied by ioredis `Redis` / `Cluster`,
 * or any compatible client.  We only need `eval` and `quit`.
 */
export interface RedisClient {
  eval(script: string, numkeys: number, ...args: Array<string | number>): Promise<unknown>;
  quit(): Promise<unknown>;
}

/**
 * Atomic sliding-window counter backed by Redis.
 *
 * Uses a single Lua script that runs `INCR` + `PEXPIRE` atomically so the
 * window is correct under concurrent requests from multiple instances.
 *
 * Key format: `rl:<key>` — e.g. `rl:ip:1.2.3.4` or `rl:user:abc123`.
 */
export class RedisStore implements RateLimiterStore {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;

  // Lua: atomically increment and set expiry only on first increment
  private static readonly LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`.trim();

  constructor(client: RedisClient, keyPrefix = 'rl') {
    this.client = client;
    this.keyPrefix = keyPrefix;
  }

  async incr(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }> {
    const redisKey = `${this.keyPrefix}:${key}`;
    const result = await this.client.eval(
      RedisStore.LUA_SCRIPT,
      1,
      redisKey,
      windowMs,
    ) as [number, number];

    const count = result[0];
    // PTTL returns -1 (no expire) or -2 (key missing) on edge cases; treat as full window
    const ttlMs = result[1] > 0 ? result[1] : windowMs;

    return { count, ttlMs };
  }

  async quit(): Promise<void> {
    await this.client.quit();
  }
}
