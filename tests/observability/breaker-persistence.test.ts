/**
 * Tests for Circuit Breaker State Persistence (Issue #359)
 *
 * Covers:
 * - MemoryStateStore: load/save/subscribe/history/appendHistory
 * - TradingCircuitBreaker: initialize() loads persisted state
 * - Trip → restart → still tripped (memory simulation)
 * - Cross-replica propagation via pub/sub
 * - Fail-closed: initialize() throws when store.load() rejects
 * - checkAndTrip() throws if initialize() not called (store configured)
 * - Rolling history capped to maxHistory
 * - State persisted on critical and warning trips
 * - getIsTripped() reflects persisted state after restart
 * - getHistory() delegates to store
 * - close() releases store resources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  MemoryStateStore,
} from '../../services/observability/breaker-state-store';
import type {
  BreakerState,
  BreakerStateStore,
} from '../../services/observability/breaker-state-store';
import {
  TradingCircuitBreaker,
  createCircuitBreaker,
} from '../../services/observability/circuit-breaker';
import type { CircuitBreakerMetrics } from '../../services/observability/circuit-breaker';

// ============================================================================
// Helpers
// ============================================================================

function safeMetrics(overrides: Partial<CircuitBreakerMetrics> = {}): CircuitBreakerMetrics {
  return {
    agentErrorRate: 0.01,
    affectedAgentIds: [],
    portfolioDrawdownPct: -1,
    tradeVolumeRatio: 1.5,
    keyManagementErrors: 0,
    apiLatencyP99Ms: 500,
    ...overrides,
  };
}

// ============================================================================
// MemoryStateStore
// ============================================================================

describe('MemoryStateStore', () => {
  let store: MemoryStateStore;

  beforeEach(() => {
    store = new MemoryStateStore();
  });

  it('load() returns null before any save', async () => {
    expect(await store.load()).toBeNull();
  });

  it('save() persists state that load() can retrieve', async () => {
    const state: BreakerState = {
      isTripped: true,
      tripCount: 3,
      lastTrippedAt: '2024-01-01T00:00:00.000Z',
      lastTripReason: 'key_management_error',
      updatedAt: '2024-01-01T00:00:01.000Z',
    };
    await store.save(state);
    const loaded = await store.load();
    expect(loaded).toEqual(state);
  });

  it('save() returns a copy — mutations to original do not affect stored value', async () => {
    const state: BreakerState = {
      isTripped: false,
      tripCount: 1,
      lastTrippedAt: null,
      lastTripReason: null,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    await store.save(state);
    state.isTripped = true; // mutate original
    const loaded = await store.load();
    expect(loaded?.isTripped).toBe(false);
  });

  it('subscribe() receives notifications when save() is called', async () => {
    const received: BreakerState[] = [];
    store.subscribe((s) => received.push(s));

    const state: BreakerState = {
      isTripped: true,
      tripCount: 1,
      lastTrippedAt: '2024-01-01T00:00:00.000Z',
      lastTripReason: 'portfolio_drawdown_critical',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    await store.save(state);
    expect(received).toHaveLength(1);
    expect(received[0]?.isTripped).toBe(true);
  });

  it('unsubscribe() stops future notifications', async () => {
    const received: BreakerState[] = [];
    const unsub = store.subscribe((s) => received.push(s));
    unsub();

    await store.save({
      isTripped: true,
      tripCount: 1,
      lastTrippedAt: null,
      lastTripReason: null,
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    expect(received).toHaveLength(0);
  });

  it('appendHistory() stores transitions; history() retrieves them in order', async () => {
    const t1 = { timestamp: '2024-01-01T00:00:01.000Z', event: { tripId: 'a' } as never };
    const t2 = { timestamp: '2024-01-01T00:00:02.000Z', event: { tripId: 'b' } as never };
    await store.appendHistory(t1);
    await store.appendHistory(t2);

    const h = await store.history(10);
    expect(h).toHaveLength(2);
    expect(h[0]?.event.tripId).toBe('a');
    expect(h[1]?.event.tripId).toBe('b');
  });

  it('history() is capped at maxHistory entries', async () => {
    const smallStore = new MemoryStateStore(3);
    for (let i = 0; i < 5; i++) {
      await smallStore.appendHistory({
        timestamp: new Date().toISOString(),
        event: { tripId: `t${i}` } as never,
      });
    }
    const h = await smallStore.history(10);
    expect(h).toHaveLength(3);
    // Oldest entries were evicted; last three remain
    expect(h[0]?.event.tripId).toBe('t2');
    expect(h[2]?.event.tripId).toBe('t4');
  });

  it('history() respects the limit argument', async () => {
    for (let i = 0; i < 5; i++) {
      await store.appendHistory({ timestamp: new Date().toISOString(), event: { tripId: `t${i}` } as never });
    }
    const h = await store.history(2);
    expect(h).toHaveLength(2);
  });

  it('close() removes all subscribers', async () => {
    const received: BreakerState[] = [];
    store.subscribe((s) => received.push(s));
    await store.close();

    await store.save({
      isTripped: false,
      tripCount: 0,
      lastTrippedAt: null,
      lastTripReason: null,
      updatedAt: new Date().toISOString(),
    });
    expect(received).toHaveLength(0);
  });
});

// ============================================================================
// initialize() — load persisted state
// ============================================================================

describe('TradingCircuitBreaker.initialize()', () => {
  it('loads isTripped=true from store on startup', async () => {
    const store = new MemoryStateStore();
    await store.save({
      isTripped: true,
      tripCount: 5,
      lastTrippedAt: '2024-01-01T00:00:00.000Z',
      lastTripReason: 'key_management_error',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });

    const cb = createCircuitBreaker(null, {}, store);
    await cb.initialize();

    expect(cb.getIsTripped()).toBe(true);
    expect(cb.getTripCount()).toBe(5);
  });

  it('starts clean (isTripped=false, tripCount=0) when store is empty', async () => {
    const store = new MemoryStateStore();
    const cb = createCircuitBreaker(null, {}, store);
    await cb.initialize();

    expect(cb.getIsTripped()).toBe(false);
    expect(cb.getTripCount()).toBe(0);
  });

  it('is idempotent — double initialize does not throw', async () => {
    const store = new MemoryStateStore();
    const cb = createCircuitBreaker(null, {}, store);
    await expect(cb.initialize()).resolves.not.toThrow();
    await expect(cb.initialize()).resolves.not.toThrow();
  });

  it('when no store is provided, initialize() is a no-op and checkAndTrip works immediately', async () => {
    const cb = createCircuitBreaker(null);
    await expect(cb.initialize()).resolves.not.toThrow();
    await expect(cb.checkAndTrip(safeMetrics())).resolves.not.toThrow();
  });

  it('throws (fail-closed) when store.load() rejects', async () => {
    const brokenStore: BreakerStateStore = {
      load: vi.fn().mockRejectedValue(new Error('Redis unreachable')),
      save: vi.fn(),
      subscribe: vi.fn(() => () => {}),
      history: vi.fn().mockResolvedValue([]),
      appendHistory: vi.fn(),
      close: vi.fn(),
    };

    const cb = createCircuitBreaker(null, {}, brokenStore);
    await expect(cb.initialize()).rejects.toThrow('Redis unreachable');
  });
});

// ============================================================================
// Fail-closed: checkAndTrip requires initialization
// ============================================================================

describe('fail-closed before initialize()', () => {
  it('checkAndTrip() throws when store is configured but initialize() not called', async () => {
    const store = new MemoryStateStore();
    const cb = new TradingCircuitBreaker(null, {}, undefined, store);
    await expect(cb.checkAndTrip(safeMetrics())).rejects.toThrow(/initialize\(\)/);
  });

  it('checkAndTrip() works when no store is configured (backward-compatible)', async () => {
    const cb = createCircuitBreaker(null);
    await expect(cb.checkAndTrip(safeMetrics())).resolves.not.toThrow();
  });
});

// ============================================================================
// Trip → restart → still tripped
// ============================================================================

describe('trip → restart → still tripped', () => {
  it('a critical trip persists to store so a new breaker instance sees it', async () => {
    const store = new MemoryStateStore();

    // Instance A trips
    const cbA = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    await cbA.initialize();
    await cbA.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(cbA.getIsTripped()).toBe(true);

    // "Restart" — create a new breaker backed by the same store
    const cbB = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    await cbB.initialize();

    expect(cbB.getIsTripped()).toBe(true);
    expect(cbB.getTripCount()).toBeGreaterThanOrEqual(1);
  });

  it('trip count is preserved across restart', async () => {
    const store = new MemoryStateStore();

    const cbA = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    await cbA.initialize();
    await cbA.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    await cbA.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    const countBefore = cbA.getTripCount();

    const cbB = createCircuitBreaker(null, {}, store);
    await cbB.initialize();
    expect(cbB.getTripCount()).toBe(countBefore);
  });

  it('warning trips also update the store', async () => {
    const store = new MemoryStateStore();
    const cb = createCircuitBreaker(null, {
      agentErrorRateWarning: 0.05,
      agentErrorRateCritical: 0.99,
    }, store);
    await cb.initialize();
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.10 }));

    const state = await store.load();
    expect(state).not.toBeNull();
    expect(state?.tripCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Cross-replica propagation via pub/sub
// ============================================================================

describe('cross-replica propagation', () => {
  it('a trip on replica A propagates to replica B via subscribe', async () => {
    const store = new MemoryStateStore();

    const cbA = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    await cbA.initialize();

    // Replica B subscribes to the same store
    const cbB = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    await cbB.initialize();

    expect(cbB.getIsTripped()).toBe(false);

    // Replica A trips — MemoryStateStore.save() calls handlers synchronously
    await cbA.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));

    // Replica B's in-memory state should have been updated via the subscriber
    expect(cbB.getIsTripped()).toBe(true);
  });

  it('trip count is synchronised to replica B', async () => {
    const store = new MemoryStateStore();
    const cbA = createCircuitBreaker(null, { agentErrorRateCritical: 0.10 }, store);
    const cbB = createCircuitBreaker(null, {}, store);
    await cbA.initialize();
    await cbB.initialize();

    await cbA.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));

    expect(cbB.getTripCount()).toBe(cbA.getTripCount());
  });
});

// ============================================================================
// Rolling history
// ============================================================================

describe('rolling history', () => {
  it('getHistory() returns trip events recorded by the store', async () => {
    const store = new MemoryStateStore();
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 }, store);
    await cb.initialize();

    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));

    const h = await cb.getHistory();
    expect(h.length).toBeGreaterThanOrEqual(1);
    expect(h[0]?.event.reason).toBe('agent_error_rate_critical');
  });

  it('getHistory() returns empty array when no store is configured', async () => {
    const cb = createCircuitBreaker(null);
    const h = await cb.getHistory();
    expect(h).toEqual([]);
  });

  it('history respects the cap configured on the store', async () => {
    const store = new MemoryStateStore(3);
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 }, store);
    await cb.initialize();

    for (let i = 0; i < 5; i++) {
      await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    }

    const h = await cb.getHistory(10);
    expect(h.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// Persistence store errors are non-fatal
// ============================================================================

describe('store errors during trip are non-fatal', () => {
  it('save() throwing does not propagate from checkAndTrip()', async () => {
    const noisyStore: BreakerStateStore = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockRejectedValue(new Error('disk full')),
      subscribe: vi.fn(() => () => {}),
      history: vi.fn().mockResolvedValue([]),
      appendHistory: vi.fn().mockRejectedValue(new Error('disk full')),
      close: vi.fn(),
    };

    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 }, noisyStore);
    await cb.initialize();
    await expect(cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }))).resolves.not.toThrow();
  });
});

// ============================================================================
// close()
// ============================================================================

describe('close()', () => {
  it('delegates to store.close()', async () => {
    const store = new MemoryStateStore();
    const closeSpy = vi.spyOn(store, 'close');
    const cb = createCircuitBreaker(null, {}, store);
    await cb.close();
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it('is a no-op when no store is configured', async () => {
    const cb = createCircuitBreaker(null);
    await expect(cb.close()).resolves.not.toThrow();
  });
});

// ============================================================================
// reset() clears in-memory AND local state
// ============================================================================

describe('reset()', () => {
  it('clears isTripped, tripCount after a trip', async () => {
    const store = new MemoryStateStore();
    const cb = createCircuitBreaker(null, { agentErrorRateCritical: 0.01 }, store);
    await cb.initialize();
    await cb.checkAndTrip(safeMetrics({ agentErrorRate: 0.50 }));
    expect(cb.getIsTripped()).toBe(true);

    cb.reset();
    expect(cb.getIsTripped()).toBe(false);
    expect(cb.getTripCount()).toBe(0);
  });
});
