/**
 * TONAIAgent - Open Agent Protocol Messaging Module
 *
 * Messaging and Coordination framework for the Open Agent Protocol.
 * Provides pub/sub, request/response, and multi-agent orchestration.
 */

import {
  AgentId,
  MessageId,
  MessagePriority,
  ProtocolMessageType,
  ProtocolMessage,
  MessageHeader,
  MessageTarget,
  MessageSubscriber,
  MessageFilter,
  Unsubscribe,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Message bus configuration
 */
export interface MessageBusConfig {
  /** Maximum message queue size */
  maxQueueSize: number;

  /** Message retention time in milliseconds */
  retentionTime: number;

  /** Enable message persistence */
  enablePersistence: boolean;

  /** Enable message encryption */
  enableEncryption: boolean;
}

/**
 * Request options
 */
export interface RequestOptions {
  /** Timeout in milliseconds */
  timeout: number;

  /** Priority */
  priority?: MessagePriority;

  /** Retry count */
  retries?: number;
}

/**
 * Orchestration step
 */
export interface OrchestrationStep {
  /** Step ID */
  id: string;

  /** Target agent */
  agent: AgentId;

  /** Capability to execute */
  capability: string;

  /** Parameters */
  params: Record<string, unknown>;

  /** Dependencies (step IDs that must complete first) */
  dependsOn?: string[];

  /** Timeout */
  timeout?: number;
}

/**
 * Orchestration definition
 */
export interface OrchestrationDefinition {
  /** Orchestration name */
  name: string;

  /** Description */
  description?: string;

  /** Steps to execute */
  steps: OrchestrationStep[];
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  /** Success status */
  success: boolean;

  /** Results from each step */
  stepResults: Map<string, unknown>;

  /** Execution time */
  executionTime: number;

  /** Errors */
  errors?: string[];
}

// ============================================================================
// Message Bus Interface
// ============================================================================

/**
 * Message bus interface
 */
export interface ProtocolMessageBus {
  /** Publish a message */
  publish(message: ProtocolMessage): Promise<void>;

  /** Subscribe to messages */
  subscribe(subscriber: MessageSubscriber): Unsubscribe;

  /** Request-response pattern */
  request(message: ProtocolMessage, timeout: number): Promise<ProtocolMessage | null>;

  /** Acknowledge message */
  acknowledge(messageId: MessageId, agentId: AgentId): Promise<void>;

  /** Get pending messages for agent */
  getPending(agentId: AgentId): Promise<ProtocolMessage[]>;

  /** Get message by ID */
  getMessage(messageId: MessageId): Promise<ProtocolMessage | undefined>;

  /** Get message count */
  getMessageCount(): number;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default message bus implementation
 */
export class DefaultProtocolMessageBus implements ProtocolMessageBus {
  private config: MessageBusConfig;
  private messages: Map<MessageId, ProtocolMessage> = new Map();
  private subscribers: Map<string, MessageSubscriber> = new Map();
  private pendingRequests: Map<string, {
    resolve: (msg: ProtocolMessage | null) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private topicSubscribers: Map<string, Set<string>> = new Map();

  constructor(config: Partial<MessageBusConfig> = {}) {
    this.config = {
      maxQueueSize: config.maxQueueSize ?? 10000,
      retentionTime: config.retentionTime ?? 3600000, // 1 hour
      enablePersistence: config.enablePersistence ?? false,
      enableEncryption: config.enableEncryption ?? false,
    };
  }

  /**
   * Publish a message
   */
  async publish(message: ProtocolMessage): Promise<void> {
    // Store message
    this.messages.set(message.header.id, message);

    // Clean old messages if needed
    if (this.messages.size > this.config.maxQueueSize) {
      this.cleanOldMessages();
    }

    // Check for pending request response
    if (message.header.correlationId) {
      const pending = this.pendingRequests.get(message.header.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.header.correlationId);
        pending.resolve(message);
        return;
      }
    }

    // Route to subscribers
    await this.routeMessage(message);
  }

  /**
   * Subscribe to messages
   */
  subscribe(subscriber: MessageSubscriber): Unsubscribe {
    this.subscribers.set(subscriber.id, subscriber);

    // Index by topics
    for (const filter of subscriber.filters) {
      if (filter.topic) {
        const subs = this.topicSubscribers.get(filter.topic) ?? new Set();
        subs.add(subscriber.id);
        this.topicSubscribers.set(filter.topic, subs);
      }
    }

    return () => {
      this.subscribers.delete(subscriber.id);
      for (const filter of subscriber.filters) {
        if (filter.topic) {
          const subs = this.topicSubscribers.get(filter.topic);
          if (subs) {
            subs.delete(subscriber.id);
          }
        }
      }
    };
  }

  /**
   * Request-response pattern
   */
  async request(message: ProtocolMessage, timeout: number): Promise<ProtocolMessage | null> {
    return new Promise((resolve) => {
      const correlationId = message.header.id;

      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        resolve(null);
      }, timeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        timeout: timeoutHandle,
      });

      this.publish(message);
    });
  }

  /**
   * Acknowledge message
   */
  async acknowledge(_messageId: MessageId, _agentId: AgentId): Promise<void> {
    // In a full implementation, this would track delivery status
  }

  /**
   * Get pending messages for agent
   */
  async getPending(agentId: AgentId): Promise<ProtocolMessage[]> {
    const pending: ProtocolMessage[] = [];

    for (const message of this.messages.values()) {
      const target = message.header.target;
      if (target.type === 'agent' && target.agentId === agentId) {
        pending.push(message);
      }
    }

    return pending;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: MessageId): Promise<ProtocolMessage | undefined> {
    return this.messages.get(messageId);
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.size;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async routeMessage(message: ProtocolMessage): Promise<void> {
    const matchingSubscribers = this.findMatchingSubscribers(message);

    for (const subscriber of matchingSubscribers) {
      try {
        await subscriber.handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    }
  }

  private findMatchingSubscribers(message: ProtocolMessage): MessageSubscriber[] {
    const matching: MessageSubscriber[] = [];

    for (const subscriber of this.subscribers.values()) {
      if (this.matchesFilters(message, subscriber.filters)) {
        matching.push(subscriber);
      }
    }

    return matching;
  }

  private matchesFilters(message: ProtocolMessage, filters: MessageFilter[]): boolean {
    if (filters.length === 0) return true;

    return filters.some(filter => {
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(message.header.type)) {
          return false;
        }
      }

      if (filter.sender) {
        const senders = Array.isArray(filter.sender) ? filter.sender : [filter.sender];
        if (!senders.includes(message.header.sender)) {
          return false;
        }
      }

      if (filter.topic) {
        const target = message.header.target;
        if (target.type !== 'topic' || target.topic !== filter.topic) {
          return false;
        }
      }

      return true;
    });
  }

  private cleanOldMessages(): void {
    const now = Date.now();
    const cutoff = now - this.config.retentionTime;

    for (const [id, message] of this.messages.entries()) {
      if (message.header.timestamp.getTime() < cutoff) {
        this.messages.delete(id);
      }
    }
  }
}

// ============================================================================
// Message Creation Helpers
// ============================================================================

/**
 * Create a protocol message
 */
export function createProtocolMessage(params: {
  type: ProtocolMessageType;
  sender: AgentId;
  target: MessageTarget;
  payload: unknown;
  priority?: MessagePriority;
  correlationId?: string;
  replyTo?: string;
  expiresIn?: number;
}): ProtocolMessage {
  const now = new Date();

  const header: MessageHeader = {
    id: generateMessageId(),
    version: '1.0.0',
    type: params.type,
    sender: params.sender,
    target: params.target,
    timestamp: now,
    expiresAt: params.expiresIn ? new Date(now.getTime() + params.expiresIn) : undefined,
    correlationId: params.correlationId,
    replyTo: params.replyTo,
    priority: params.priority ?? 'normal',
  };

  return {
    header,
    payload: params.payload,
  };
}

/**
 * Generate unique message ID
 */
function generateMessageId(): MessageId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `msg_${timestamp}_${random}`;
}

// ============================================================================
// Orchestration
// ============================================================================

/**
 * Create an orchestration
 */
export function createOrchestration(
  definition: OrchestrationDefinition,
  messageBus: ProtocolMessageBus
): { execute: () => Promise<OrchestrationResult> } {
  return {
    async execute(): Promise<OrchestrationResult> {
      const startTime = Date.now();
      const stepResults = new Map<string, unknown>();
      const errors: string[] = [];

      // Build dependency graph
      const completed = new Set<string>();
      const pending = new Set(definition.steps.map(s => s.id));

      while (pending.size > 0) {
        // Find steps ready to execute
        const ready = definition.steps.filter(step => {
          if (!pending.has(step.id)) return false;
          if (!step.dependsOn) return true;
          return step.dependsOn.every(dep => completed.has(dep));
        });

        if (ready.length === 0 && pending.size > 0) {
          errors.push('Circular dependency detected');
          break;
        }

        // Execute ready steps in parallel
        const results = await Promise.all(
          ready.map(async step => {
            const message = createProtocolMessage({
              type: 'capability.request',
              sender: 'orchestrator',
              target: { type: 'agent', agentId: step.agent },
              payload: {
                capabilityId: step.capability,
                params: step.params,
              },
              priority: 'high',
            });

            const response = await messageBus.request(message, step.timeout ?? 30000);
            return { step, response };
          })
        );

        // Process results
        for (const { step, response } of results) {
          pending.delete(step.id);
          completed.add(step.id);

          if (response) {
            stepResults.set(step.id, response.payload);
          } else {
            errors.push(`Step ${step.id} timed out`);
          }
        }
      }

      return {
        success: errors.length === 0,
        stepResults,
        executionTime: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  };
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create message bus
 */
export function createProtocolMessageBus(config?: Partial<MessageBusConfig>): ProtocolMessageBus {
  return new DefaultProtocolMessageBus(config);
}
