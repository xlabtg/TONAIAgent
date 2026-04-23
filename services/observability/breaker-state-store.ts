/**
 * TONAIAgent - Circuit Breaker State Persistence
 *
 * Defines the pluggable `BreakerStateStore` interface and a simple
 * `MemoryStateStore` that satisfies it for unit tests.
 *
 * Implements Issue #359: Persist Circuit Breaker State Across Restarts
 */

import type { CircuitTripEvent } from './circuit-breaker.js';

// ============================================================================
// Types
// ============================================================================

/** Persisted snapshot of the circuit-breaker's current state. */
export interface BreakerState {
  /** Whether the breaker is currently tripped (critical trip fired). */
  isTripped: boolean;
  /** Total number of trips recorded in this lifecycle (resets only on explicit clear). */
  tripCount: number;
  /** ISO-8601 timestamp of the most recent trip, or null if never tripped. */
  lastTrippedAt: string | null;
  /** Reason of the most recent trip, or null if never tripped. */
  lastTripReason: string | null;
  /** ISO-8601 timestamp of the most recent state save. */
  updatedAt: string;
}

/** A single entry in the rolling transition history. */
export interface BreakerTransition {
  /** ISO-8601 timestamp of the transition. */
  timestamp: string;
  /** The circuit-trip event that caused the transition. */
  event: CircuitTripEvent;
}

/** Subscriber callback for cross-replica state synchronisation. */
export type BreakerStateHandler = (state: BreakerState) => void;

/** Returns an unsubscribe function. */
export type BreakerStateUnsubscribe = () => void;

/**
 * Pluggable persistence backend for `TradingCircuitBreaker`.
 *
 * Implementors must provide:
 *  - `load`       — return the last known state (or null on first start).
 *  - `save`       — atomically persist a new state snapshot.
 *  - `subscribe`  — push new states to this replica when another replica saves.
 *  - `history`    — retrieve the rolling transition log.
 *  - `appendHistory` — append one entry to the rolling log (capped to `maxHistory`).
 *  - `close`      — release resources (connections, timers).
 */
export interface BreakerStateStore {
  load(): Promise<BreakerState | null>;
  save(state: BreakerState): Promise<void>;
  subscribe(handler: BreakerStateHandler): BreakerStateUnsubscribe;
  history(limit?: number): Promise<BreakerTransition[]>;
  appendHistory(transition: BreakerTransition): Promise<void>;
  close(): Promise<void>;
}

// ============================================================================
// MemoryStateStore — for tests only
// ============================================================================

/**
 * In-process state store.  State is lost on process restart.
 *
 * Suitable for unit tests and environments that do not need multi-replica
 * coordination or crash-recovery guarantees.
 */
export class MemoryStateStore implements BreakerStateStore {
  private state: BreakerState | null = null;
  private readonly log: BreakerTransition[] = [];
  private readonly handlers = new Set<BreakerStateHandler>();
  private readonly maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  async load(): Promise<BreakerState | null> {
    return this.state ? { ...this.state } : null;
  }

  async save(state: BreakerState): Promise<void> {
    this.state = { ...state };
    for (const handler of this.handlers) {
      try {
        handler({ ...state });
      } catch {
        // Never let a subscriber break the save path.
      }
    }
  }

  subscribe(handler: BreakerStateHandler): BreakerStateUnsubscribe {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async history(limit = 100): Promise<BreakerTransition[]> {
    return this.log.slice(-limit);
  }

  async appendHistory(transition: BreakerTransition): Promise<void> {
    this.log.push(transition);
    if (this.log.length > this.maxHistory) {
      this.log.splice(0, this.log.length - this.maxHistory);
    }
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}
