/**
 * TONAIAgent - Distributed Scheduler & Event Engine
 *
 * Barrel export for the Distributed Scheduler module.
 *
 * Components:
 * - DistributedScheduler: core cron/event/hybrid job engine
 * - EventBus: topic-based pub/sub event bus
 * - WorkerPool: auto-scaling parallel execution pool
 * - RetryEngine: exponential backoff retry + dead-letter queue
 * - OnChainListenerManager: TON blockchain event listeners
 * - DistributedSchedulerApi: framework-agnostic REST API handler
 *
 * Issue #93: Distributed Scheduler & Event Engine
 *
 * @example
 * ```typescript
 * import {
 *   createDistributedScheduler,
 *   createDistributedSchedulerApi,
 * } from '@tonaiagent/core/distributed-scheduler';
 *
 * const scheduler = createDistributedScheduler();
 * scheduler.start();
 *
 * const job = scheduler.registerJob({
 *   name: "DCA Strategy",
 *   agentId: "agent_abc",
 *   executionMode: "cron",
 *   cronExpression: "@hourly",
 * });
 * ```
 */

// Types
export type {
  ExecutionMode,
  JobPriority,
  JobStatus,
  CreateJobInput,
  ScheduledJob,
  ExecutionRecord,
  BusEvent,
  EventSubscriberCallback,
  EventUnsubscribe,
  SubscribeOptions,
  WorkerStatus,
  WorkerInfo,
  WorkerPoolConfig,
  OnChainEventType,
  CreateListenerInput,
  OnChainListener,
  OnChainEvent,
  RetryPolicy,
  DeadLetterEntry,
  DistributedSchedulerConfig,
  SchedulerHealth,
  SchedulerMetrics,
  SchedulerEventType,
  SchedulerEvent,
  SchedulerEventHandler,
  SchedulerUnsubscribe,
  DistributedSchedulerErrorCode,
  SchedulerApiRequest,
  SchedulerApiResponse,
  SystemEventTopic,
} from './types';

// Error class
export { DistributedSchedulerError } from './types';

// Event Bus
export { EventBus, createEventBus } from './event-bus';

// Worker Pool
export {
  WorkerPool,
  createWorkerPool,
  DEFAULT_WORKER_POOL_CONFIG,
} from './worker-pool';

export type { JobExecutor } from './worker-pool';

// Retry Engine
export {
  RetryEngine,
  createRetryEngine,
  DEFAULT_RETRY_POLICY,
} from './retry-engine';

// On-Chain Listener
export {
  OnChainListenerManager,
  createOnChainListenerManager,
} from './onchain-listener';

// Scheduler
export {
  DistributedScheduler,
  createDistributedScheduler,
  DEFAULT_SCHEDULER_CONFIG,
} from './scheduler';

// API
export {
  DistributedSchedulerApi,
  createDistributedSchedulerApi,
} from './api';
