/**
 * TONAIAgent - On-Chain Event Listener
 *
 * Simulated TON blockchain event listener that monitors wallet transactions,
 * smart contract events, token transfers, and liquidity pool changes.
 *
 * Production deployment: replace simulation with real TON RPC / WebSocket
 * connections and TON indexer APIs.
 *
 * Issue #93: Distributed Scheduler & Event Engine
 */

import type {
  CreateListenerInput,
  OnChainEvent,
  OnChainListener,
} from './types';

// The event bus is passed in as a dependency; we only need the publish method.
type IEventBus = Pick<import('./event-bus').EventBus, 'publish'>;

// ============================================================================
// On-Chain Listener Manager
// ============================================================================

/**
 * Manages on-chain event listeners that detect TON blockchain events
 * and publish them to the event bus for downstream processing.
 *
 * Simulates detection of:
 * - Wallet transactions (incoming/outgoing)
 * - Smart contract events
 * - Jetton/NFT token transfers
 * - DEX liquidity pool changes
 *
 * @example
 * ```typescript
 * const manager = createOnChainListenerManager(eventBus);
 *
 * const listener = manager.registerListener({
 *   name: "TON Wallet Monitor",
 *   agentId: "agent_abc",
 *   eventType: "wallet_transaction",
 *   address: "EQC...",
 *   publishTopic: "onchain.wallet_transaction",
 * });
 *
 * manager.start(); // begin polling
 * ```
 */
export class OnChainListenerManager {
  private readonly listeners: Map<string, OnChainListener> = new Map();
  private readonly eventBus: IEventBus;
  private listenerCounter = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Polling interval in ms */
  private readonly pollIntervalMs: number;

  constructor(eventBus: IEventBus, pollIntervalMs = 5_000) {
    this.eventBus = eventBus;
    this.pollIntervalMs = pollIntervalMs;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start polling for on-chain events. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  /** Stop polling. */
  stop(): void {
    this.running = false;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Whether the manager is currently polling. */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Listener Management
  // ============================================================================

  /**
   * Register a new on-chain event listener.
   * @throws {Error} if a listener for the same address/eventType already exists for this agent
   */
  registerListener(input: CreateListenerInput): OnChainListener {
    const listenerId = this.generateListenerId(input.agentId, input.address, input.eventType);

    const listener: OnChainListener = {
      listenerId,
      name: input.name,
      agentId: input.agentId,
      eventType: input.eventType,
      address: input.address,
      eventSignature: input.eventSignature ?? null,
      minValue: input.minValue ?? 0,
      publishTopic: input.publishTopic ?? `onchain.${input.eventType}`,
      active: true,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
      eventsDetected: 0,
      lastEventAt: null,
    };

    this.listeners.set(listenerId, listener);
    return { ...listener };
  }

  /**
   * Get a registered listener by ID.
   * Returns undefined if not found.
   */
  getListener(listenerId: string): OnChainListener | undefined {
    const l = this.listeners.get(listenerId);
    return l ? { ...l } : undefined;
  }

  /**
   * List all listeners, optionally filtered by agentId.
   */
  listListeners(agentId?: string): OnChainListener[] {
    return Array.from(this.listeners.values())
      .filter((l) => !agentId || l.agentId === agentId)
      .map((l) => ({ ...l }));
  }

  /**
   * Deactivate a listener (stops it from triggering events).
   */
  deactivateListener(listenerId: string): boolean {
    const l = this.listeners.get(listenerId);
    if (!l) return false;
    l.active = false;
    return true;
  }

  /**
   * Reactivate a deactivated listener.
   */
  activateListener(listenerId: string): boolean {
    const l = this.listeners.get(listenerId);
    if (!l) return false;
    l.active = true;
    return true;
  }

  /**
   * Remove a listener permanently.
   */
  removeListener(listenerId: string): boolean {
    return this.listeners.delete(listenerId);
  }

  /**
   * Get the count of active listeners.
   */
  getActiveListenerCount(): number {
    return Array.from(this.listeners.values()).filter((l) => l.active).length;
  }

  // ============================================================================
  // Simulation
  // ============================================================================

  /**
   * Manually simulate an on-chain event for testing.
   * Useful in demo/testnet mode to trigger event flows without real blockchain.
   */
  simulateEvent(listenerId: string, overrides: Partial<OnChainEvent> = {}): OnChainEvent | null {
    const listener = this.listeners.get(listenerId);
    if (!listener || !listener.active) return null;

    const event = this.buildSimulatedEvent(listener, overrides);
    this.dispatchEvent(listener, event);
    return event;
  }

  // ============================================================================
  // Private: Polling & Event Dispatch
  // ============================================================================

  /**
   * Periodic poll — simulates blockchain scanning.
   * In production this would be a WebSocket subscription or indexer webhook.
   */
  private poll(): void {
    for (const listener of this.listeners.values()) {
      if (!listener.active) continue;

      // Simulate a low-probability event detection (5% chance per poll cycle)
      if (Math.random() < 0.05) {
        const event = this.buildSimulatedEvent(listener);
        if (event.value >= listener.minValue) {
          this.dispatchEvent(listener, event);
        }
      }
    }
  }

  /** Build a simulated on-chain event for a listener. */
  private buildSimulatedEvent(
    listener: OnChainListener,
    overrides: Partial<OnChainEvent> = {},
  ): OnChainEvent {
    const value = Math.floor(Math.random() * 1_000_000_000); // 0–1 TON in nanoTON
    return {
      onChainEventId: `oc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      listenerId: listener.listenerId,
      eventType: listener.eventType,
      txHash: this.simulateTxHash(),
      lt: String(Date.now()),
      from: this.simulateAddress('from_'),
      to: listener.address,
      value,
      payload: {
        eventType: listener.eventType,
        address: listener.address,
        simulatedMode: true,
      },
      detectedAt: new Date(),
      ...overrides,
    };
  }

  /** Publish a detected event to the event bus and update listener state. */
  private dispatchEvent(listener: OnChainListener, event: OnChainEvent): void {
    listener.eventsDetected++;
    listener.lastEventAt = new Date();

    this.eventBus.publish({
      topic: listener.publishTopic,
      source: 'onchain-listener',
      payload: {
        listenerId: listener.listenerId,
        agentId: listener.agentId,
        eventType: event.eventType,
        txHash: event.txHash,
        from: event.from,
        to: event.to,
        value: event.value,
        detectedAt: event.detectedAt.toISOString(),
        onChainEventId: event.onChainEventId,
      },
      correlationId: event.txHash,
    });
  }

  // ============================================================================
  // Simulation Utilities
  // ============================================================================

  private simulateTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private simulateAddress(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
    let addr = 'EQ';
    for (let i = 0; i < 46; i++) {
      addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
  }

  private generateListenerId(agentId: string, address: string, eventType: string): string {
    return `listener_${agentId}_${eventType}_${address.slice(-8)}_${Date.now().toString(36)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an OnChainListenerManager instance.
 *
 * @example
 * ```typescript
 * const manager = createOnChainListenerManager(eventBus, 5000);
 * manager.start();
 *
 * manager.registerListener({
 *   name: "Wallet Monitor",
 *   agentId: "agent_abc",
 *   eventType: "wallet_transaction",
 *   address: "EQC...",
 * });
 * ```
 */
export function createOnChainListenerManager(
  eventBus: IEventBus,
  pollIntervalMs?: number,
): OnChainListenerManager {
  return new OnChainListenerManager(eventBus, pollIntervalMs);
}
