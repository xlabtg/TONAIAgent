/**
 * TONAIAgent - Redis-backed Circuit Breaker State Store
 *
 * Implements `BreakerStateStore` using Redis for persistence and pub/sub so
 * all replicas share a single source of truth.
 *
 * Data layout:
 *   cb:state          — JSON-encoded BreakerState (string, no TTL)
 *   cb:history        — Redis list of JSON-encoded BreakerTransition (capped)
 *   cb:events channel — Redis pub/sub channel for cross-replica notifications
 *
 * Implements Issue #359: Persist Circuit Breaker State Across Restarts
 */

import type {
  BreakerState,
  BreakerStateHandler,
  BreakerStateStore,
  BreakerStateUnsubscribe,
  BreakerTransition,
} from './breaker-state-store.js';

// ============================================================================
// Minimal Redis client interface
// ============================================================================

/**
 * Minimal interface satisfied by ioredis `Redis` / `Cluster` or any
 * compatible client.  We only use the commands needed by this store.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): this;
  quit(): Promise<unknown>;
  duplicate(): RedisClient;
}

// ============================================================================
// RedisStateStore
// ============================================================================

const STATE_KEY = 'cb:state';
const HISTORY_KEY = 'cb:history';
const PUBSUB_CHANNEL = 'cb:events';

export class RedisStateStore implements BreakerStateStore {
  private readonly publisher: RedisClient;
  private subscriber: RedisClient | null = null;
  private readonly handlers = new Set<BreakerStateHandler>();
  private readonly maxHistory: number;
  private closed = false;

  constructor(client: RedisClient, maxHistory = 100) {
    this.publisher = client;
    this.maxHistory = maxHistory;
  }

  async load(): Promise<BreakerState | null> {
    const raw = await this.publisher.get(STATE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BreakerState;
    } catch {
      return null;
    }
  }

  async save(state: BreakerState): Promise<void> {
    const payload = JSON.stringify(state);
    await this.publisher.set(STATE_KEY, payload);
    await this.publisher.publish(PUBSUB_CHANNEL, payload);
  }

  subscribe(handler: BreakerStateHandler): BreakerStateUnsubscribe {
    this.handlers.add(handler);
    this._ensureSubscriber();
    return () => this.handlers.delete(handler);
  }

  async history(limit = 100): Promise<BreakerTransition[]> {
    const raw = await this.publisher.lrange(HISTORY_KEY, 0, limit - 1);
    return raw
      .map((entry) => {
        try {
          return JSON.parse(entry) as BreakerTransition;
        } catch {
          return null;
        }
      })
      .filter((e): e is BreakerTransition => e !== null);
  }

  async appendHistory(transition: BreakerTransition): Promise<void> {
    await this.publisher.lpush(HISTORY_KEY, JSON.stringify(transition));
    // Keep only the most recent maxHistory entries
    await this.publisher.ltrim(HISTORY_KEY, 0, this.maxHistory - 1);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.handlers.clear();
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    await this.publisher.quit();
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private _ensureSubscriber(): void {
    if (this.subscriber || this.closed) return;

    // Use a dedicated connection for blocking subscribe commands
    this.subscriber = this.publisher.duplicate();
    this.subscriber.subscribe(PUBSUB_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      let state: BreakerState;
      try {
        state = JSON.parse(message) as BreakerState;
      } catch {
        return;
      }
      for (const handler of this.handlers) {
        try {
          handler(state);
        } catch {
          // Never let a subscriber break the dispatch loop.
        }
      }
    });
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a `RedisStateStore` from a REDIS_URL environment variable.
 *
 * Throws if REDIS_URL is not set so misconfiguration surfaces at startup.
 */
export async function createRedisStateStore(
  maxHistory = 100,
): Promise<RedisStateStore> {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    throw new Error(
      'BREAKER_STATE_STORE=redis requires REDIS_URL to be set',
    );
  }

  // Lazy-require keeps ioredis optional — only needed when using Redis store.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const IoRedis = require('ioredis') as {
    default: new (url: string) => RedisClient;
  };
  const RedisConstructor =
    IoRedis.default ??
    (IoRedis as unknown as new (url: string) => RedisClient);

  return new RedisStateStore(new RedisConstructor(redisUrl), maxHistory);
}
