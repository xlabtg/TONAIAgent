/**
 * TONAIAgent - Multi-Agent Message Bus
 *
 * Event-driven messaging system for inter-agent communication.
 * Supports publish/subscribe patterns, direct messaging, and message routing.
 */

import {
  AgentMessage,
  MessageType,
  MessagePriority,
  MessagePayload,
  AgentRole,
  MultiAgentEvent,
} from '../types';

// ============================================================================
// Message Bus Interface
// ============================================================================

export interface MessageBus {
  /**
   * Publish a message to the bus
   */
  publish(message: AgentMessage): Promise<void>;

  /**
   * Subscribe to messages by type or target
   */
  subscribe(
    subscriber: MessageSubscriber,
    filter?: MessageFilter
  ): () => void;

  /**
   * Send a direct message to a specific agent
   */
  send(message: AgentMessage): Promise<void>;

  /**
   * Request-response pattern with correlation
   */
  request(
    message: AgentMessage,
    timeoutMs?: number
  ): Promise<AgentMessage | null>;

  /**
   * Get pending messages for an agent
   */
  getPending(agentId: string): AgentMessage[];

  /**
   * Acknowledge message processing
   */
  acknowledge(messageId: string, agentId: string): Promise<void>;

  /**
   * Get message bus statistics
   */
  getStats(): MessageBusStats;

  /**
   * Clear all messages (for testing/reset)
   */
  clear(): void;

  /**
   * Graceful shutdown
   */
  shutdown(): Promise<void>;
}

export interface MessageSubscriber {
  agentId: string;
  role: AgentRole;
  handler: (message: AgentMessage) => Promise<void>;
}

export interface MessageFilter {
  types?: MessageType[];
  senderIds?: string[];
  senderRoles?: AgentRole[];
  priorities?: MessagePriority[];
  customFilter?: (message: AgentMessage) => boolean;
}

export interface MessageBusStats {
  totalPublished: number;
  totalDelivered: number;
  totalFailed: number;
  pendingMessages: number;
  subscriberCount: number;
  averageDeliveryTimeMs: number;
  messagesPerMinute: number;
  lastActivity: Date;
}

// ============================================================================
// In-Memory Message Bus Implementation
// ============================================================================

export class InMemoryMessageBus implements MessageBus {
  private subscribers: Map<string, SubscriberEntry> = new Map();
  private pendingMessages: Map<string, AgentMessage[]> = new Map();
  private pendingRequests: Map<string, RequestEntry> = new Map();
  private messageHistory: AgentMessage[] = [];
  private stats: MessageBusStatsInternal;
  private readonly maxHistorySize: number;
  private readonly defaultTimeoutMs: number;
  private eventCallback?: (event: MultiAgentEvent) => void;
  private isShutdown = false;

  constructor(options: MessageBusOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 10000;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    this.eventCallback = options.eventCallback;
    this.stats = {
      totalPublished: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryTimes: [],
      lastActivity: new Date(),
    };
  }

  async publish(message: AgentMessage): Promise<void> {
    if (this.isShutdown) {
      throw new Error('Message bus is shut down');
    }

    this.stats.totalPublished++;
    this.stats.lastActivity = new Date();

    // Add to history
    this.addToHistory(message);

    // Route message to subscribers
    const deliveryPromises: Promise<void>[] = [];
    const startTime = Date.now();

    for (const [, entry] of this.subscribers) {
      if (this.matchesFilter(message, entry.filter, entry.subscriber)) {
        deliveryPromises.push(this.deliverMessage(message, entry.subscriber, startTime));
      }
    }

    // Also check if there's a direct target
    if (message.targetId) {
      const pending = this.pendingMessages.get(message.targetId) ?? [];
      pending.push(message);
      this.pendingMessages.set(message.targetId, pending);
    }

    await Promise.allSettled(deliveryPromises);

    // Check for correlation (request-response)
    if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
      const request = this.pendingRequests.get(message.correlationId)!;
      request.resolve(message);
      this.pendingRequests.delete(message.correlationId);
    }

    this.emitEvent('message_sent', message.senderId, message.senderRole, {
      messageId: message.id,
      type: message.type,
      target: message.targetId,
    });
  }

  subscribe(
    subscriber: MessageSubscriber,
    filter?: MessageFilter
  ): () => void {
    const entry: SubscriberEntry = {
      subscriber,
      filter: filter ?? {},
      subscribedAt: new Date(),
    };

    this.subscribers.set(subscriber.agentId, entry);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber.agentId);
    };
  }

  async send(message: AgentMessage): Promise<void> {
    if (!message.targetId) {
      throw new Error('Direct message requires targetId');
    }

    const entry = this.subscribers.get(message.targetId);
    if (entry) {
      await this.deliverMessage(message, entry.subscriber, Date.now());
    } else {
      // Queue for later delivery
      const pending = this.pendingMessages.get(message.targetId) ?? [];
      pending.push(message);
      this.pendingMessages.set(message.targetId, pending);
    }

    this.addToHistory(message);
    this.stats.totalPublished++;
  }

  async request(
    message: AgentMessage,
    timeoutMs?: number
  ): Promise<AgentMessage | null> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    // Ensure correlation ID is set
    const correlationId = message.correlationId ?? this.generateId();
    message.correlationId = correlationId;

    return new Promise<AgentMessage | null>((resolve) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        resolve(null);
      }, timeout);

      // Store request for correlation
      this.pendingRequests.set(correlationId, {
        resolve: (response: AgentMessage) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        createdAt: new Date(),
      });

      // Publish the request
      this.publish(message).catch(() => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(correlationId);
        resolve(null);
      });
    });
  }

  getPending(agentId: string): AgentMessage[] {
    return this.pendingMessages.get(agentId) ?? [];
  }

  async acknowledge(messageId: string, agentId: string): Promise<void> {
    const pending = this.pendingMessages.get(agentId);
    if (pending) {
      const index = pending.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        pending.splice(index, 1);
        if (pending.length === 0) {
          this.pendingMessages.delete(agentId);
        }
      }
    }
  }

  getStats(): MessageBusStats {
    const deliveryTimes = this.stats.deliveryTimes.slice(-1000);
    const avgDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0;

    // Calculate messages per minute from recent history
    const oneMinuteAgo = Date.now() - 60000;
    const recentMessages = this.messageHistory.filter(
      (m) => m.timestamp.getTime() > oneMinuteAgo
    ).length;

    let pendingCount = 0;
    for (const [, messages] of this.pendingMessages) {
      pendingCount += messages.length;
    }

    return {
      totalPublished: this.stats.totalPublished,
      totalDelivered: this.stats.totalDelivered,
      totalFailed: this.stats.totalFailed,
      pendingMessages: pendingCount,
      subscriberCount: this.subscribers.size,
      averageDeliveryTimeMs: avgDeliveryTime,
      messagesPerMinute: recentMessages,
      lastActivity: this.stats.lastActivity,
    };
  }

  clear(): void {
    this.pendingMessages.clear();
    this.messageHistory = [];
    this.stats = {
      totalPublished: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryTimes: [],
      lastActivity: new Date(),
    };
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;

    // Clear pending requests
    for (const [, request] of this.pendingRequests) {
      request.resolve(null as unknown as AgentMessage);
    }
    this.pendingRequests.clear();
  }

  private async deliverMessage(
    message: AgentMessage,
    subscriber: MessageSubscriber,
    startTime: number
  ): Promise<void> {
    try {
      await subscriber.handler(message);
      this.stats.totalDelivered++;
      this.stats.deliveryTimes.push(Date.now() - startTime);

      // Keep delivery times bounded
      if (this.stats.deliveryTimes.length > 1000) {
        this.stats.deliveryTimes = this.stats.deliveryTimes.slice(-1000);
      }

      this.emitEvent('message_received', subscriber.agentId, subscriber.role, {
        messageId: message.id,
        type: message.type,
        sender: message.senderId,
        deliveryTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      this.stats.totalFailed++;

      this.emitEvent('agent_error', subscriber.agentId, subscriber.role, {
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'error');
    }
  }

  private matchesFilter(
    message: AgentMessage,
    filter: MessageFilter,
    subscriber: MessageSubscriber
  ): boolean {
    // Don't deliver to self
    if (message.senderId === subscriber.agentId) {
      return false;
    }

    // Check target
    if (message.targetId && message.targetId !== subscriber.agentId) {
      return false;
    }

    // Check target role
    if (message.targetRole && message.targetRole !== subscriber.role) {
      return false;
    }

    // Check type filter
    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(message.type)) {
        return false;
      }
    }

    // Check sender filter
    if (filter.senderIds && filter.senderIds.length > 0) {
      if (!filter.senderIds.includes(message.senderId)) {
        return false;
      }
    }

    // Check sender role filter
    if (filter.senderRoles && filter.senderRoles.length > 0) {
      if (!filter.senderRoles.includes(message.senderRole)) {
        return false;
      }
    }

    // Check priority filter
    if (filter.priorities && filter.priorities.length > 0) {
      if (!filter.priorities.includes(message.priority)) {
        return false;
      }
    }

    // Check custom filter
    if (filter.customFilter && !filter.customFilter(message)) {
      return false;
    }

    return true;
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);

    // Trim history if needed
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private emitEvent(
    type: MultiAgentEvent['type'],
    source: string,
    sourceRole: AgentRole,
    data: Record<string, unknown>,
    severity: MultiAgentEvent['severity'] = 'info'
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: this.generateId(),
      timestamp: new Date(),
      type,
      source,
      sourceRole,
      data,
      severity,
    });
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface SubscriberEntry {
  subscriber: MessageSubscriber;
  filter: MessageFilter;
  subscribedAt: Date;
}

interface RequestEntry {
  resolve: (message: AgentMessage) => void;
  createdAt: Date;
}

interface MessageBusStatsInternal {
  totalPublished: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryTimes: number[];
  lastActivity: Date;
}

export interface MessageBusOptions {
  maxHistorySize?: number;
  defaultTimeoutMs?: number;
  eventCallback?: (event: MultiAgentEvent) => void;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMessageBus(options?: MessageBusOptions): MessageBus {
  return new InMemoryMessageBus(options);
}

// ============================================================================
// Message Factory Helpers
// ============================================================================

export function createMessage(
  params: CreateMessageParams
): AgentMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    type: params.type,
    senderId: params.senderId,
    senderRole: params.senderRole,
    targetId: params.targetId,
    targetRole: params.targetRole,
    payload: params.payload,
    priority: params.priority ?? 'normal',
    timestamp: new Date(),
    expiresAt: params.expiresAt,
    correlationId: params.correlationId,
    replyTo: params.replyTo,
    metadata: params.metadata,
  };
}

export interface CreateMessageParams {
  type: MessageType;
  senderId: string;
  senderRole: AgentRole;
  targetId?: string;
  targetRole?: AgentRole;
  payload: MessagePayload;
  priority?: MessagePriority;
  expiresAt?: Date;
  correlationId?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}
