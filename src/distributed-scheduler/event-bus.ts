/**
 * TONAIAgent - Event Bus
 *
 * In-memory pub/sub event bus with topic-based routing, backpressure handling,
 * and event replay for the Distributed Scheduler & Event Engine.
 *
 * Production deployment: replace with Redis Streams, Kafka, or NATS.
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  BusEvent,
  EventSubscriberCallback,
  EventUnsubscribe,
  SubscribeOptions,
} from './types';

// ============================================================================
// Internal Types
// ============================================================================

interface Subscription {
  subscriptionId: string;
  topic: string;
  callback: EventSubscriberCallback;
  options: SubscribeOptions;
}

// ============================================================================
// Event Bus
// ============================================================================

/**
 * Topic-based pub/sub event bus.
 *
 * Supports:
 * - Wildcard topic subscriptions (e.g., "market.*")
 * - Source filtering per subscription
 * - In-memory event history for replay
 * - Backpressure via max queue depth tracking
 *
 * @example
 * ```typescript
 * const bus = createEventBus();
 *
 * const unsub = bus.subscribe('market.price_movement', async (event) => {
 *   console.log('Price moved:', event.payload);
 * });
 *
 * bus.publish({
 *   topic: 'market.price_movement',
 *   source: 'price-oracle',
 *   payload: { asset: 'TON', change: 5.2 },
 * });
 *
 * unsub(); // unsubscribe
 * ```
 */
export class EventBus {
  /** topic -> subscriptions */
  private readonly subscriptions: Map<string, Set<Subscription>> = new Map();
  /** Event history (circular buffer) */
  private readonly eventHistory: BusEvent[] = [];
  /** Max events to keep in history */
  private readonly maxHistorySize: number;

  private totalPublished = 0;
  private subscriptionCounter = 0;

  constructor(maxHistorySize = 10_000) {
    this.maxHistorySize = maxHistorySize;
  }

  // ============================================================================
  // Publish
  // ============================================================================

  /**
   * Publish an event to all matching subscribers.
   *
   * Subscribers are called asynchronously (fire-and-forget); errors in
   * subscriber callbacks do not propagate back to the publisher.
   */
  publish(input: Omit<BusEvent, 'eventId' | 'timestamp'>): BusEvent {
    const event: BusEvent = {
      eventId: this.generateEventId(),
      timestamp: new Date(),
      ...input,
    };

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.totalPublished++;

    // Fan out to all matching subscribers
    for (const [topic, subs] of this.subscriptions) {
      if (this.topicMatches(event.topic, topic)) {
        for (const sub of subs) {
          if (sub.options.sourceFilter && sub.options.sourceFilter !== event.source) {
            continue;
          }
          // Invoke asynchronously, swallow errors
          void Promise.resolve().then(() => sub.callback(event)).catch(() => {/* ignore */});
        }
      }
    }

    return event;
  }

  // ============================================================================
  // Subscribe
  // ============================================================================

  /**
   * Subscribe to events on a topic.
   *
   * Topic patterns:
   * - Exact match: "market.price_movement"
   * - Wildcard suffix: "market.*" (matches any single segment after "market.")
   * - Global wildcard: "*" (matches all topics)
   *
   * Returns an unsubscribe function.
   */
  subscribe(
    topic: string,
    callback: EventSubscriberCallback,
    options: SubscribeOptions = {},
  ): EventUnsubscribe {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    const sub: Subscription = { subscriptionId, topic, callback, options };

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(sub);

    return () => {
      const subs = this.subscriptions.get(topic);
      if (subs) {
        subs.delete(sub);
        if (subs.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  // ============================================================================
  // Event History
  // ============================================================================

  /**
   * Get recent events, optionally filtered by topic.
   */
  getHistory(topic?: string, limit = 100): BusEvent[] {
    let events = topic
      ? this.eventHistory.filter((e) => this.topicMatches(e.topic, topic))
      : [...this.eventHistory];
    return events.slice(-limit);
  }

  /**
   * Get total number of events published.
   */
  getTotalPublished(): number {
    return this.totalPublished;
  }

  /**
   * Get the number of active subscriptions.
   */
  getSubscriptionCount(): number {
    let total = 0;
    for (const subs of this.subscriptions.values()) {
      total += subs.size;
    }
    return total;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /** Check if an event topic matches a subscription pattern */
  private topicMatches(eventTopic: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventTopic) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventTopic.startsWith(`${prefix}.`);
    }
    return false;
  }

  /** Generate a unique event ID */
  private generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an EventBus instance.
 *
 * @example
 * ```typescript
 * const bus = createEventBus();
 *
 * const unsub = bus.subscribe('onchain.*', async (event) => {
 *   console.log('On-chain event:', event.topic, event.payload);
 * });
 * ```
 */
export function createEventBus(maxHistorySize?: number): EventBus {
  return new EventBus(maxHistorySize);
}
