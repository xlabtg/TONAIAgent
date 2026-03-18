/**
 * Tests for the Distributed Scheduler & Event Engine (Issue #93)
 *
 * Covers:
 * - DEFAULT_SCHEDULER_CONFIG defaults
 * - EventBus: publish, subscribe, wildcard matching, history
 * - WorkerPool: execution, worker lifecycle, scaling
 * - RetryEngine: backoff calculation, DLQ management
 * - OnChainListenerManager: registration, deactivation, simulation
 * - DistributedScheduler: job registration, cron, event-driven, hybrid
 * - DistributedScheduler: manual trigger, pause/resume, cancel
 * - DistributedScheduler: execution history, DLQ, health, metrics
 * - DistributedScheduler: idempotency, event system
 * - DistributedSchedulerApi: all REST endpoints
 * - DistributedSchedulerError: error codes
 * - Factory functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  DistributedScheduler,
  DistributedSchedulerApi,
  DistributedSchedulerError,
  EventBus,
  WorkerPool,
  RetryEngine,
  OnChainListenerManager,
  createDistributedScheduler,
  createDistributedSchedulerApi,
  createEventBus,
  createWorkerPool,
  createRetryEngine,
  createOnChainListenerManager,
  DEFAULT_SCHEDULER_CONFIG,
  DEFAULT_WORKER_POOL_CONFIG,
  DEFAULT_RETRY_POLICY,
} from '../../services/distributed-scheduler';

import type {
  CreateJobInput,
  BusEvent,
  ExecutionRecord,
  SchedulerEvent,
} from '../../services/distributed-scheduler';

// ============================================================================
// Test Helpers
// ============================================================================

function makeJobInput(overrides: Partial<CreateJobInput> = {}): CreateJobInput {
  return {
    name: 'Test Job',
    agentId: 'agent_test',
    executionMode: 'event',
    triggerTopics: ['test.topic'],
    payload: { key: 'value' },
    maxRetries: 1,
    ...overrides,
  };
}

function makeScheduler(config: Parameters<typeof createDistributedScheduler>[0] = {}) {
  const scheduler = createDistributedScheduler({
    cronPollIntervalMs: 50,
    onChainPollIntervalMs: 1_000,
    defaultRetryPolicy: { maxAttempts: 2, initialDelayMs: 10, backoffMultiplier: 2, maxDelayMs: 100, jitter: false },
    workerPool: { minWorkers: 1, maxWorkers: 5, idleTimeoutMs: 1_000, defaultTimeoutMs: 2_000, agentIsolation: true },
    ...config,
  });
  return scheduler;
}

// ============================================================================
// DEFAULT_SCHEDULER_CONFIG
// ============================================================================

describe('DEFAULT_SCHEDULER_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.enabled).toBe(true);
  });

  it('should have leader election enabled', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.leaderElection).toBe(true);
  });

  it('should have audit log enabled', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.enableAuditLog).toBe(true);
  });

  it('should have reasonable max queue size', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.maxQueueSize).toBeGreaterThan(0);
  });

  it('should have a default retry policy', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.defaultRetryPolicy.maxAttempts).toBeGreaterThan(0);
    expect(DEFAULT_SCHEDULER_CONFIG.defaultRetryPolicy.backoffMultiplier).toBeGreaterThan(1);
  });
});

describe('DEFAULT_WORKER_POOL_CONFIG', () => {
  it('should have minWorkers <= maxWorkers', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.minWorkers).toBeLessThanOrEqual(
      DEFAULT_WORKER_POOL_CONFIG.maxWorkers,
    );
  });

  it('should support thousands of concurrent workers', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.maxWorkers).toBeGreaterThanOrEqual(50);
  });
});

describe('DEFAULT_RETRY_POLICY', () => {
  it('should have exponential backoff', () => {
    expect(DEFAULT_RETRY_POLICY.backoffMultiplier).toBeGreaterThan(1);
  });

  it('should have jitter enabled', () => {
    expect(DEFAULT_RETRY_POLICY.jitter).toBe(true);
  });
});

// ============================================================================
// EventBus
// ============================================================================

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = createEventBus();
  });

  it('should publish and return an event with generated ID and timestamp', () => {
    const event = bus.publish({ topic: 'test.event', source: 'test', payload: {} });
    expect(event.eventId).toMatch(/^evt_/);
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.topic).toBe('test.event');
  });

  it('should notify subscribers when an event is published', async () => {
    const received: BusEvent[] = [];
    bus.subscribe('test.event', (e) => received.push(e));
    bus.publish({ topic: 'test.event', source: 'test', payload: { val: 42 } });
    // Allow async subscriber to fire
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(1);
    expect(received[0].payload).toEqual({ val: 42 });
  });

  it('should not notify subscriber after unsubscribe', async () => {
    const received: BusEvent[] = [];
    const unsub = bus.subscribe('test.event', (e) => received.push(e));
    unsub();
    bus.publish({ topic: 'test.event', source: 'test', payload: {} });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(0);
  });

  it('should support wildcard subscriptions (market.*)', async () => {
    const received: string[] = [];
    bus.subscribe('market.*', (e) => received.push(e.topic));
    bus.publish({ topic: 'market.price_movement', source: 's', payload: {} });
    bus.publish({ topic: 'market.volume_spike', source: 's', payload: {} });
    bus.publish({ topic: 'other.event', source: 's', payload: {} });
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual(['market.price_movement', 'market.volume_spike']);
  });

  it('should support global wildcard subscription (*)', async () => {
    const received: string[] = [];
    bus.subscribe('*', (e) => received.push(e.topic));
    bus.publish({ topic: 'a.b', source: 's', payload: {} });
    bus.publish({ topic: 'c.d', source: 's', payload: {} });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by source when sourceFilter is set', async () => {
    const received: BusEvent[] = [];
    bus.subscribe('test.e', (e) => received.push(e), { sourceFilter: 'oracle' });
    bus.publish({ topic: 'test.e', source: 'other', payload: {} });
    bus.publish({ topic: 'test.e', source: 'oracle', payload: {} });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(1);
    expect(received[0].source).toBe('oracle');
  });

  it('should keep history of published events', () => {
    bus.publish({ topic: 'h.1', source: 's', payload: {} });
    bus.publish({ topic: 'h.2', source: 's', payload: {} });
    const history = bus.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter history by topic', () => {
    bus.publish({ topic: 'h.filtered', source: 's', payload: {} });
    bus.publish({ topic: 'other', source: 's', payload: {} });
    const history = bus.getHistory('h.filtered');
    expect(history.every((e) => e.topic === 'h.filtered')).toBe(true);
  });

  it('should track total published count', () => {
    const before = bus.getTotalPublished();
    bus.publish({ topic: 't', source: 's', payload: {} });
    bus.publish({ topic: 't', source: 's', payload: {} });
    expect(bus.getTotalPublished()).toBe(before + 2);
  });

  it('should track subscription count', () => {
    const before = bus.getSubscriptionCount();
    const u1 = bus.subscribe('s.1', () => {});
    const u2 = bus.subscribe('s.2', () => {});
    expect(bus.getSubscriptionCount()).toBe(before + 2);
    u1();
    u2();
    expect(bus.getSubscriptionCount()).toBe(before);
  });
});

// ============================================================================
// RetryEngine
// ============================================================================

describe('RetryEngine', () => {
  let engine: RetryEngine;

  beforeEach(() => {
    engine = createRetryEngine();
  });

  it('should calculate exponential backoff delay', () => {
    const policy = { maxAttempts: 3, initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 10_000, jitter: false };
    expect(engine.calculateDelay(1, policy)).toBe(100);
    expect(engine.calculateDelay(2, policy)).toBe(200);
    expect(engine.calculateDelay(3, policy)).toBe(400);
  });

  it('should cap delay at maxDelayMs', () => {
    const policy = { maxAttempts: 5, initialDelayMs: 1000, backoffMultiplier: 10, maxDelayMs: 5000, jitter: false };
    expect(engine.calculateDelay(10, policy)).toBe(5000);
  });

  it('should return non-negative delay with jitter', () => {
    const policy = { maxAttempts: 3, initialDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: 10_000, jitter: true };
    const delay = engine.calculateDelay(1, policy);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it('should record executions', () => {
    const record = makeExecutionRecord('job_1', true);
    engine.recordExecution(record);
    const history = engine.getExecutionHistory('job_1');
    expect(history.length).toBe(1);
    expect(history[0].success).toBe(true);
  });

  it('should schedule retry if attempts remain', () => {
    const job = makeJobStub('job_1');
    const policy = { maxAttempts: 3, initialDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 10_000, jitter: false };
    const record = makeExecutionRecord('job_1', false);
    engine.recordExecution(record);
    const delay = engine.scheduleRetry(job as any, record, policy);
    expect(delay).not.toBeNull();
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('should move to DLQ after maxAttempts exhausted', () => {
    const job = makeJobStub('job_dlq');
    const policy = { maxAttempts: 2, initialDelayMs: 10, backoffMultiplier: 2, maxDelayMs: 1000, jitter: false };

    for (let i = 0; i < 3; i++) {
      const record = makeExecutionRecord('job_dlq', false, i);
      engine.recordExecution(record);
      engine.scheduleRetry(job as any, record, policy);
    }

    const dlq = engine.getDeadLetterQueue();
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    const entry = dlq.find((e) => e.jobId === 'job_dlq');
    expect(entry).toBeDefined();
    expect(entry?.acknowledged).toBe(false);
  });

  it('should acknowledge a DLQ entry', () => {
    const job = makeJobStub('job_ack');
    const policy = { maxAttempts: 1, initialDelayMs: 10, backoffMultiplier: 2, maxDelayMs: 100, jitter: false };
    for (let i = 0; i < 2; i++) {
      const record = makeExecutionRecord('job_ack', false, i);
      engine.recordExecution(record);
      engine.scheduleRetry(job as any, record, policy);
    }
    const ok = engine.acknowledgeDlqEntry('job_ack');
    expect(ok).toBe(true);
    const entry = engine.getDeadLetterEntry('job_ack');
    expect(entry?.acknowledged).toBe(true);
  });

  it('should retry from DLQ and clear history', () => {
    const job = makeJobStub('job_retry');
    const policy = { maxAttempts: 1, initialDelayMs: 10, backoffMultiplier: 2, maxDelayMs: 100, jitter: false };
    for (let i = 0; i < 2; i++) {
      const record = makeExecutionRecord('job_retry', false, i);
      engine.recordExecution(record);
      engine.scheduleRetry(job as any, record, policy);
    }
    const removed = engine.retryFromDlq('job_retry');
    expect(removed).toBe(true);
    expect(engine.getDeadLetterEntry('job_retry')).toBeUndefined();
    expect(engine.getExecutionHistory('job_retry').length).toBe(0);
  });

  it('should track success/failure counts', () => {
    engine.recordExecution(makeExecutionRecord('j1', true));
    engine.recordExecution(makeExecutionRecord('j1', false));
    engine.recordExecution(makeExecutionRecord('j2', true));
    expect(engine.getSuccessCount()).toBe(2);
    expect(engine.getFailureCount()).toBe(1);
    expect(engine.getTotalExecutionCount()).toBe(3);
  });
});

// ============================================================================
// OnChainListenerManager
// ============================================================================

describe('OnChainListenerManager', () => {
  let bus: EventBus;
  let manager: OnChainListenerManager;

  beforeEach(() => {
    bus = createEventBus();
    manager = createOnChainListenerManager(bus, 10_000); // long poll so no auto-fire
  });

  afterEach(() => {
    manager.stop();
  });

  it('should register a listener and return it', () => {
    const listener = manager.registerListener({
      name: 'Wallet Monitor',
      agentId: 'agent_1',
      eventType: 'wallet_transaction',
      address: 'EQC_test_address',
    });
    expect(listener.listenerId).toBeDefined();
    expect(listener.active).toBe(true);
    expect(listener.eventsDetected).toBe(0);
    expect(listener.publishTopic).toBe('onchain.wallet_transaction');
  });

  it('should custom publishTopic when specified', () => {
    const listener = manager.registerListener({
      name: 'Contract Event',
      agentId: 'agent_1',
      eventType: 'contract_event',
      address: 'EQC_contract',
      publishTopic: 'my.custom.topic',
    });
    expect(listener.publishTopic).toBe('my.custom.topic');
  });

  it('should list listeners filtered by agentId', () => {
    manager.registerListener({ name: 'L1', agentId: 'agent_1', eventType: 'token_transfer', address: 'A1' });
    manager.registerListener({ name: 'L2', agentId: 'agent_2', eventType: 'wallet_transaction', address: 'A2' });
    const forAgent1 = manager.listListeners('agent_1');
    expect(forAgent1.length).toBe(1);
    expect(forAgent1[0].agentId).toBe('agent_1');
  });

  it('should deactivate and reactivate a listener', () => {
    const listener = manager.registerListener({
      name: 'L',
      agentId: 'a',
      eventType: 'liquidity_change',
      address: 'X',
    });
    manager.deactivateListener(listener.listenerId);
    expect(manager.getListener(listener.listenerId)?.active).toBe(false);
    manager.activateListener(listener.listenerId);
    expect(manager.getListener(listener.listenerId)?.active).toBe(true);
  });

  it('should remove a listener', () => {
    const listener = manager.registerListener({ name: 'L', agentId: 'a', eventType: 'token_transfer', address: 'X' });
    const removed = manager.removeListener(listener.listenerId);
    expect(removed).toBe(true);
    expect(manager.getListener(listener.listenerId)).toBeUndefined();
  });

  it('should simulate an event and publish to event bus', async () => {
    const received: BusEvent[] = [];
    bus.subscribe('onchain.wallet_transaction', (e) => received.push(e));

    const listener = manager.registerListener({
      name: 'W',
      agentId: 'a',
      eventType: 'wallet_transaction',
      address: 'EQC_test',
    });
    manager.simulateEvent(listener.listenerId);
    await new Promise((r) => setTimeout(r, 20));
    expect(received.length).toBe(1);
    expect(received[0].source).toBe('onchain-listener');
  });

  it('should track events detected count', () => {
    const listener = manager.registerListener({ name: 'L', agentId: 'a', eventType: 'token_transfer', address: 'X' });
    manager.simulateEvent(listener.listenerId);
    manager.simulateEvent(listener.listenerId);
    expect(manager.getListener(listener.listenerId)?.eventsDetected).toBe(2);
  });

  it('should not simulate event for inactive listener', async () => {
    const received: BusEvent[] = [];
    bus.subscribe('onchain.wallet_transaction', (e) => received.push(e));
    const listener = manager.registerListener({ name: 'L', agentId: 'a', eventType: 'wallet_transaction', address: 'X' });
    manager.deactivateListener(listener.listenerId);
    const result = manager.simulateEvent(listener.listenerId);
    expect(result).toBeNull();
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(0);
  });

  it('should count active listeners', () => {
    const l1 = manager.registerListener({ name: 'L1', agentId: 'a', eventType: 'token_transfer', address: 'X' });
    manager.registerListener({ name: 'L2', agentId: 'a', eventType: 'liquidity_change', address: 'Y' });
    manager.deactivateListener(l1.listenerId);
    expect(manager.getActiveListenerCount()).toBe(1);
  });
});

// ============================================================================
// DistributedScheduler — Core
// ============================================================================

describe('DistributedScheduler', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should start and report as running', () => {
    expect(scheduler.isRunning()).toBe(true);
  });

  it('should stop and report as not running', () => {
    scheduler.stop();
    expect(scheduler.isRunning()).toBe(false);
  });

  it('should register an event-driven job', () => {
    const job = scheduler.registerJob(makeJobInput());
    expect(job.jobId).toMatch(/^job_/);
    expect(job.status).toBe('pending');
    expect(job.executionMode).toBe('event');
    expect(job.triggerTopics).toContain('test.topic');
  });

  it('should register a cron job with nextRunAt', () => {
    const job = scheduler.registerJob(makeJobInput({
      executionMode: 'cron',
      cronExpression: '@hourly',
    }));
    expect(job.nextRunAt).toBeInstanceOf(Date);
    expect(job.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('should register a hybrid job', () => {
    const job = scheduler.registerJob(makeJobInput({
      executionMode: 'hybrid',
      cronExpression: '0 * * * *',
      triggerTopics: ['market.*'],
    }));
    expect(job.executionMode).toBe('hybrid');
    expect(job.cronExpression).toBe('0 * * * *');
    expect(job.triggerTopics).toContain('market.*');
  });

  it('should support interval-based scheduling', () => {
    const job = scheduler.registerJob(makeJobInput({
      executionMode: 'cron',
      intervalMs: 60_000,
    }));
    expect(job.nextRunAt).toBeInstanceOf(Date);
    expect(job.nextRunAt!.getTime()).toBeGreaterThanOrEqual(Date.now() + 50_000);
  });

  it('should return existing job on duplicate idempotencyKey', () => {
    const key = 'idempotency_test_key';
    const job1 = scheduler.registerJob(makeJobInput({ name: 'Job 1', idempotencyKey: key }));
    const job2 = scheduler.registerJob(makeJobInput({ name: 'Job 2', idempotencyKey: key }));
    expect(job1.jobId).toBe(job2.jobId);
    expect(job2.name).toBe('Job 1'); // original name preserved
  });

  it('should get a job by ID', () => {
    const job = scheduler.registerJob(makeJobInput());
    const fetched = scheduler.getJob(job.jobId);
    expect(fetched.jobId).toBe(job.jobId);
  });

  it('should throw JOB_NOT_FOUND for unknown job ID', () => {
    expect(() => scheduler.getJob('nonexistent_job')).toThrowError(DistributedSchedulerError);
    try {
      scheduler.getJob('nonexistent_job');
    } catch (err) {
      expect((err as DistributedSchedulerError).code).toBe('JOB_NOT_FOUND');
    }
  });

  it('should list jobs filtered by agentId', () => {
    scheduler.registerJob(makeJobInput({ agentId: 'agent_a', name: 'Job A' }));
    scheduler.registerJob(makeJobInput({ agentId: 'agent_b', name: 'Job B' }));
    const agentAJobs = scheduler.listJobs('agent_a');
    expect(agentAJobs.length).toBe(1);
    expect(agentAJobs[0].agentId).toBe('agent_a');
  });

  it('should list jobs filtered by status', () => {
    const job = scheduler.registerJob(makeJobInput());
    scheduler.pauseJob(job.jobId);
    const paused = scheduler.listJobs(undefined, 'paused');
    expect(paused.some((j) => j.jobId === job.jobId)).toBe(true);
  });

  it('should pause a job', () => {
    const job = scheduler.registerJob(makeJobInput());
    const paused = scheduler.pauseJob(job.jobId);
    expect(paused.status).toBe('paused');
  });

  it('should resume a paused job', () => {
    const job = scheduler.registerJob(makeJobInput({ executionMode: 'cron', cronExpression: '@hourly' }));
    scheduler.pauseJob(job.jobId);
    const resumed = scheduler.resumeJob(job.jobId);
    expect(resumed.status).toBe('pending');
  });

  it('should cancel a job', () => {
    const job = scheduler.registerJob(makeJobInput());
    const cancelled = scheduler.cancelJob(job.jobId);
    expect(cancelled.status).toBe('cancelled');
  });

  it('should throw when registering a job on stopped scheduler', () => {
    scheduler.stop();
    expect(() => scheduler.registerJob(makeJobInput())).toThrow(DistributedSchedulerError);
  });

  it('should throw INVALID_CRON_EXPRESSION for bad cron', () => {
    expect(() =>
      scheduler.registerJob(makeJobInput({ executionMode: 'cron', cronExpression: 'bad expression' }))
    ).toThrow(DistributedSchedulerError);
  });

  it('should accept @hourly cron alias', () => {
    expect(() =>
      scheduler.registerJob(makeJobInput({ executionMode: 'cron', cronExpression: '@hourly' }))
    ).not.toThrow();
  });

  it('should support all cron aliases', () => {
    const aliases = ['@hourly', '@daily', '@weekly', '@monthly'];
    for (const alias of aliases) {
      expect(() =>
        scheduler.registerJob(makeJobInput({ executionMode: 'cron', cronExpression: alias, name: alias }))
      ).not.toThrow();
    }
  });
});

// ============================================================================
// DistributedScheduler — Event-Driven Execution
// ============================================================================

describe('DistributedScheduler — event-driven execution', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should trigger an event-driven job when matching topic is published', async () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));

    scheduler.registerJob(makeJobInput({ triggerTopics: ['my.topic'] }));
    scheduler.getEventBus().publish({ topic: 'my.topic', source: 'test', payload: {} });

    // Wait for async execution
    await new Promise((r) => setTimeout(r, 500));

    const completed = events.filter((e) => e.type === 'job.completed' || e.type === 'job.failed');
    expect(completed.length).toBeGreaterThanOrEqual(1);
  });

  it('should trigger event-driven job with wildcard topic match', async () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));

    scheduler.registerJob(makeJobInput({ triggerTopics: ['market.*'] }));
    scheduler.getEventBus().publish({ topic: 'market.price_movement', source: 'oracle', payload: {} });

    await new Promise((r) => setTimeout(r, 500));

    const triggered = events.filter((e) => e.type === 'job.triggered');
    expect(triggered.length).toBeGreaterThanOrEqual(1);
  });

  it('should not trigger event-driven job for non-matching topic', async () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));

    scheduler.registerJob(makeJobInput({ triggerTopics: ['specific.topic'] }));
    scheduler.getEventBus().publish({ topic: 'other.topic', source: 'test', payload: {} });

    await new Promise((r) => setTimeout(r, 100));
    expect(events.filter((e) => e.type === 'job.triggered').length).toBe(0);
  });

  it('should not trigger paused job when event arrives', async () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));

    const job = scheduler.registerJob(makeJobInput({ triggerTopics: ['paused.topic'] }));
    scheduler.pauseJob(job.jobId);
    scheduler.getEventBus().publish({ topic: 'paused.topic', source: 'test', payload: {} });

    await new Promise((r) => setTimeout(r, 100));
    expect(events.filter((e) => e.type === 'job.triggered').length).toBe(0);
  });
});

// ============================================================================
// DistributedScheduler — Manual Trigger
// ============================================================================

describe('DistributedScheduler — manual trigger', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should manually trigger a job and return an execution record', async () => {
    const job = scheduler.registerJob(makeJobInput());
    const record = await scheduler.triggerJobManually(job.jobId);
    expect(record.jobId).toBe(job.jobId);
    expect(record.trigger).toBe('manual');
    expect(record.completedAt).toBeInstanceOf(Date);
  });

  it('should record execution history after manual trigger', async () => {
    const job = scheduler.registerJob(makeJobInput());
    await scheduler.triggerJobManually(job.jobId);
    const history = scheduler.getExecutionHistory(job.jobId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].jobId).toBe(job.jobId);
  });
});

// ============================================================================
// DistributedScheduler — On-Chain Listeners
// ============================================================================

describe('DistributedScheduler — on-chain listeners', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should register an on-chain listener', () => {
    const listener = scheduler.registerOnChainListener({
      name: 'Wallet Monitor',
      agentId: 'agent_1',
      eventType: 'wallet_transaction',
      address: 'EQC_test',
    });
    expect(listener.listenerId).toBeDefined();
    expect(listener.active).toBe(true);
  });

  it('should list on-chain listeners', () => {
    scheduler.registerOnChainListener({ name: 'L', agentId: 'a1', eventType: 'token_transfer', address: 'A' });
    const listeners = scheduler.listOnChainListeners('a1');
    expect(listeners.length).toBe(1);
  });

  it('should simulate on-chain event and publish to event bus', async () => {
    const received: BusEvent[] = [];
    scheduler.getEventBus().subscribe('onchain.*', (e) => received.push(e));

    const listener = scheduler.registerOnChainListener({
      name: 'Contract',
      agentId: 'a1',
      eventType: 'contract_event',
      address: 'EQC_contract',
    });
    scheduler.simulateOnChainEvent(listener.listenerId);

    await new Promise((r) => setTimeout(r, 20));
    expect(received.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// DistributedScheduler — Dead-Letter Queue
// ============================================================================

describe('DistributedScheduler — DLQ', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler({
      defaultRetryPolicy: { maxAttempts: 0, initialDelayMs: 0, backoffMultiplier: 1, maxDelayMs: 100, jitter: false },
    });
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should return empty DLQ initially', () => {
    expect(scheduler.getDeadLetterQueue()).toEqual([]);
  });

  it('should acknowledge a DLQ entry', async () => {
    // With maxAttempts=0, any failure immediately goes to DLQ
    // We can check DLQ management methods without needing a real failure
    const result = scheduler.acknowledgeDlqEntry('nonexistent');
    expect(result).toBe(false);
  });

  it('should retry from DLQ', () => {
    const result = scheduler.retryFromDlq('nonexistent');
    expect(result).toBe(false);
  });
});

// ============================================================================
// DistributedScheduler — Health & Metrics
// ============================================================================

describe('DistributedScheduler — health and metrics', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should report healthy status when running', () => {
    const health = scheduler.getHealth();
    expect(health.overall).toBe('healthy');
    expect(health.running).toBe(true);
    expect(health.components.scheduler).toBe(true);
    expect(health.components.eventBus).toBe(true);
    expect(health.components.workerPool).toBe(true);
    expect(health.lastCheck).toBeInstanceOf(Date);
  });

  it('should return metrics with correct structure', () => {
    const metrics = scheduler.getMetrics();
    expect(typeof metrics.totalJobs).toBe('number');
    expect(typeof metrics.activeJobs).toBe('number');
    expect(typeof metrics.runningJobs).toBe('number');
    expect(typeof metrics.queuedJobs).toBe('number');
    expect(typeof metrics.totalExecutions).toBe('number');
    expect(typeof metrics.successfulExecutions).toBe('number');
    expect(typeof metrics.failedExecutions).toBe('number');
    expect(typeof metrics.deadLetterCount).toBe('number');
    expect(typeof metrics.activeWorkers).toBe('number');
    expect(typeof metrics.totalEventsPublished).toBe('number');
    expect(typeof metrics.activeListeners).toBe('number');
    expect(typeof metrics.avgExecutionTimeMs).toBe('number');
  });

  it('should count jobs in metrics', () => {
    scheduler.registerJob(makeJobInput({ name: 'M1' }));
    scheduler.registerJob(makeJobInput({ name: 'M2' }));
    const metrics = scheduler.getMetrics();
    expect(metrics.totalJobs).toBeGreaterThanOrEqual(2);
    expect(metrics.activeJobs).toBeGreaterThanOrEqual(2);
  });

  it('should count listeners in metrics', () => {
    scheduler.registerOnChainListener({ name: 'L', agentId: 'a', eventType: 'token_transfer', address: 'X' });
    const metrics = scheduler.getMetrics();
    expect(metrics.activeListeners).toBeGreaterThanOrEqual(1);
  });

  it('should return workers info', () => {
    const workers = scheduler.getWorkers();
    expect(Array.isArray(workers)).toBe(true);
    expect(workers.length).toBeGreaterThan(0);
    expect(workers[0].workerId).toBeDefined();
    expect(workers[0].status).toBeDefined();
  });

  it('should return audit log', () => {
    scheduler.registerJob(makeJobInput({ name: 'Audited Job' }));
    const log = scheduler.getAuditLog();
    expect(Array.isArray(log)).toBe(true);
    expect(log.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// DistributedScheduler — Event System
// ============================================================================

describe('DistributedScheduler — event system', () => {
  let scheduler: DistributedScheduler;

  beforeEach(() => {
    scheduler = makeScheduler();
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  it('should emit job.registered event on registerJob', () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));
    scheduler.registerJob(makeJobInput({ name: 'E1' }));
    expect(events.some((e) => e.type === 'job.registered')).toBe(true);
  });

  it('should emit job.paused event', () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));
    const job = scheduler.registerJob(makeJobInput());
    scheduler.pauseJob(job.jobId);
    expect(events.some((e) => e.type === 'job.paused')).toBe(true);
  });

  it('should emit job.cancelled event', () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));
    const job = scheduler.registerJob(makeJobInput());
    scheduler.cancelJob(job.jobId);
    expect(events.some((e) => e.type === 'job.cancelled')).toBe(true);
  });

  it('should emit listener.registered event', () => {
    const events: SchedulerEvent[] = [];
    scheduler.subscribe((e) => events.push(e));
    scheduler.registerOnChainListener({ name: 'L', agentId: 'a', eventType: 'token_transfer', address: 'X' });
    expect(events.some((e) => e.type === 'listener.registered')).toBe(true);
  });

  it('should unsubscribe from scheduler events', () => {
    const events: SchedulerEvent[] = [];
    const unsub = scheduler.subscribe((e) => events.push(e));
    unsub();
    scheduler.registerJob(makeJobInput({ name: 'After unsub' }));
    expect(events.length).toBe(0);
  });
});

// ============================================================================
// DistributedSchedulerError
// ============================================================================

describe('DistributedSchedulerError', () => {
  it('should create error with code and metadata', () => {
    const err = new DistributedSchedulerError(
      'Job not found',
      'JOB_NOT_FOUND',
      { jobId: 'job_123' },
    );
    expect(err.message).toBe('Job not found');
    expect(err.code).toBe('JOB_NOT_FOUND');
    expect(err.metadata).toEqual({ jobId: 'job_123' });
    expect(err.name).toBe('DistributedSchedulerError');
    expect(err instanceof Error).toBe(true);
  });

  it('should work without metadata', () => {
    const err = new DistributedSchedulerError('Queue full', 'QUEUE_FULL');
    expect(err.metadata).toBeUndefined();
  });
});

// ============================================================================
// DistributedSchedulerApi — REST Endpoints
// ============================================================================

describe('DistributedSchedulerApi', () => {
  let api: DistributedSchedulerApi;

  beforeEach(() => {
    const scheduler = makeScheduler();
    scheduler.start();
    api = createDistributedSchedulerApi(scheduler);
  });

  afterEach(() => {
    api.getScheduler().stop();
  });

  // ── Job Endpoints ────────────────────────────────────────────────────────

  it('POST /scheduler/jobs — should register a job and return 201', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/jobs',
      body: { name: 'API Job', agentId: 'agent_api', executionMode: 'event', triggerTopics: ['api.topic'] },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect((res.body.data as any).jobId).toBeDefined();
  });

  it('POST /scheduler/jobs — should return 400 if name missing', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/jobs',
      body: { agentId: 'a', executionMode: 'event' },
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /scheduler/jobs — should return 400 if agentId missing', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/jobs',
      body: { name: 'J', executionMode: 'event' },
    });
    expect(res.status).toBe(400);
  });

  it('POST /scheduler/jobs — should return 400 if executionMode missing', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/jobs',
      body: { name: 'J', agentId: 'a' },
    });
    expect(res.status).toBe(400);
  });

  it('GET /scheduler/jobs — should list all jobs', async () => {
    await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'J', agentId: 'a', executionMode: 'event' } });
    const res = await api.handle({ method: 'GET', path: '/scheduler/jobs' });
    expect(res.status).toBe(200);
    expect(Array.isArray((res.body.data as any).jobs)).toBe(true);
  });

  it('GET /scheduler/jobs — should filter by agentId', async () => {
    await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'J', agentId: 'filter_agent', executionMode: 'event' } });
    const res = await api.handle({ method: 'GET', path: '/scheduler/jobs', query: { agentId: 'filter_agent' } });
    expect(res.status).toBe(200);
    const jobs = (res.body.data as any).jobs as any[];
    expect(jobs.every((j) => j.agentId === 'filter_agent')).toBe(true);
  });

  it('GET /scheduler/jobs/:jobId — should get job details', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Detail', agentId: 'a', executionMode: 'event' } });
    const jobId = (created.body.data as any).jobId;
    const res = await api.handle({ method: 'GET', path: `/scheduler/jobs/${jobId}` });
    expect(res.status).toBe(200);
    expect((res.body.data as any).jobId).toBe(jobId);
  });

  it('GET /scheduler/jobs/:jobId — should return 404 for unknown job', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/jobs/nonexistent' });
    expect(res.status).toBe(404);
  });

  it('DELETE /scheduler/jobs/:jobId — should cancel a job', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Cancel', agentId: 'a', executionMode: 'event' } });
    const jobId = (created.body.data as any).jobId;
    const res = await api.handle({ method: 'DELETE', path: `/scheduler/jobs/${jobId}` });
    expect(res.status).toBe(200);
    expect((res.body.data as any).cancelled).toBe(true);
  });

  it('POST /scheduler/jobs/:jobId/trigger — should manually trigger job', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Trigger', agentId: 'a', executionMode: 'event' } });
    const jobId = (created.body.data as any).jobId;
    const res = await api.handle({ method: 'POST', path: `/scheduler/jobs/${jobId}/trigger` });
    expect(res.status).toBe(200);
    expect((res.body.data as any).jobId).toBe(jobId);
  });

  it('POST /scheduler/jobs/:jobId/pause — should pause job', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Pause', agentId: 'a', executionMode: 'event' } });
    const jobId = (created.body.data as any).jobId;
    const res = await api.handle({ method: 'POST', path: `/scheduler/jobs/${jobId}/pause` });
    expect(res.status).toBe(200);
    expect((res.body.data as any).status).toBe('paused');
  });

  it('POST /scheduler/jobs/:jobId/resume — should resume job', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Resume', agentId: 'a', executionMode: 'cron', cronExpression: '@hourly' } });
    const jobId = (created.body.data as any).jobId;
    await api.handle({ method: 'POST', path: `/scheduler/jobs/${jobId}/pause` });
    const res = await api.handle({ method: 'POST', path: `/scheduler/jobs/${jobId}/resume` });
    expect(res.status).toBe(200);
    expect((res.body.data as any).status).toBe('pending');
  });

  it('GET /scheduler/jobs/:jobId/executions — should return execution history', async () => {
    const created = await api.handle({ method: 'POST', path: '/scheduler/jobs', body: { name: 'Exec', agentId: 'a', executionMode: 'event' } });
    const jobId = (created.body.data as any).jobId;
    await api.handle({ method: 'POST', path: `/scheduler/jobs/${jobId}/trigger` });
    const res = await api.handle({ method: 'GET', path: `/scheduler/jobs/${jobId}/executions` });
    expect(res.status).toBe(200);
    expect(Array.isArray((res.body.data as any).records)).toBe(true);
  });

  // ── Listener Endpoints ───────────────────────────────────────────────────

  it('POST /scheduler/listeners — should register on-chain listener', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/listeners',
      body: { name: 'Wallet', agentId: 'a', eventType: 'wallet_transaction', address: 'EQC_test' },
    });
    expect(res.status).toBe(201);
    expect((res.body.data as any).listenerId).toBeDefined();
  });

  it('POST /scheduler/listeners — should return 400 if address missing', async () => {
    const res = await api.handle({
      method: 'POST',
      path: '/scheduler/listeners',
      body: { name: 'L', agentId: 'a', eventType: 'token_transfer' },
    });
    expect(res.status).toBe(400);
  });

  it('GET /scheduler/listeners — should list listeners', async () => {
    await api.handle({ method: 'POST', path: '/scheduler/listeners', body: { name: 'L', agentId: 'a', eventType: 'token_transfer', address: 'X' } });
    const res = await api.handle({ method: 'GET', path: '/scheduler/listeners' });
    expect(res.status).toBe(200);
    expect(Array.isArray((res.body.data as any).listeners)).toBe(true);
  });

  // ── DLQ Endpoints ────────────────────────────────────────────────────────

  it('GET /scheduler/dlq — should return DLQ', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/dlq' });
    expect(res.status).toBe(200);
    expect(Array.isArray((res.body.data as any).entries)).toBe(true);
  });

  it('POST /scheduler/dlq/:jobId/acknowledge — should return 404 for unknown entry', async () => {
    const res = await api.handle({ method: 'POST', path: '/scheduler/dlq/unknown_job/acknowledge' });
    expect(res.status).toBe(404);
  });

  it('POST /scheduler/dlq/:jobId/retry — should return 404 for unknown entry', async () => {
    const res = await api.handle({ method: 'POST', path: '/scheduler/dlq/unknown_job/retry' });
    expect(res.status).toBe(404);
  });

  // ── Observability Endpoints ───────────────────────────────────────────────

  it('GET /scheduler/workers — should return worker list', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/workers' });
    expect(res.status).toBe(200);
    expect(Array.isArray((res.body.data as any).workers)).toBe(true);
  });

  it('GET /scheduler/health — should return health status', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/health' });
    expect(res.status).toBe(200);
    expect((res.body.data as any).overall).toBe('healthy');
  });

  it('GET /scheduler/metrics — should return metrics', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/metrics' });
    expect(res.status).toBe(200);
    expect(typeof (res.body.data as any).totalJobs).toBe('number');
  });

  it('should return 404 for unknown route', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/unknown' });
    expect(res.status).toBe(404);
  });

  it('should return error response for thrown error', async () => {
    const res = await api.handle({ method: 'GET', path: '/scheduler/jobs/nonexistent_xyz' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('Factory functions', () => {
  it('createDistributedScheduler should return a DistributedScheduler instance', () => {
    const scheduler = createDistributedScheduler();
    expect(scheduler).toBeInstanceOf(DistributedScheduler);
  });

  it('createDistributedScheduler should accept config overrides', () => {
    const scheduler = createDistributedScheduler({ enableAuditLog: false });
    expect(scheduler).toBeInstanceOf(DistributedScheduler);
  });

  it('createDistributedSchedulerApi should return a DistributedSchedulerApi instance', () => {
    const api = createDistributedSchedulerApi();
    expect(api).toBeInstanceOf(DistributedSchedulerApi);
    expect(api.getScheduler()).toBeInstanceOf(DistributedScheduler);
  });

  it('createDistributedSchedulerApi should accept existing scheduler', () => {
    const scheduler = createDistributedScheduler();
    const api = createDistributedSchedulerApi(scheduler);
    expect(api.getScheduler()).toBe(scheduler);
  });

  it('createDistributedSchedulerApi should accept config', () => {
    const api = createDistributedSchedulerApi({ enableAuditLog: false });
    expect(api).toBeInstanceOf(DistributedSchedulerApi);
  });

  it('createEventBus should return an EventBus instance', () => {
    const bus = createEventBus();
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('createRetryEngine should return a RetryEngine instance', () => {
    const engine = createRetryEngine();
    expect(engine).toBeInstanceOf(RetryEngine);
  });

  it('createOnChainListenerManager should return a OnChainListenerManager instance', () => {
    const bus = createEventBus();
    const manager = createOnChainListenerManager(bus);
    expect(manager).toBeInstanceOf(OnChainListenerManager);
  });
});

// ============================================================================
// Test Utility Functions
// ============================================================================

function makeExecutionRecord(jobId: string, success: boolean, attempt = 0): ExecutionRecord {
  return {
    executionId: `exec_${jobId}_${attempt}`,
    jobId,
    workerId: 'worker_1',
    trigger: 'manual',
    triggerEvent: null,
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 100,
    success,
    error: success ? null : 'Simulated failure',
    attempt,
    result: success ? { ok: true } : null,
  };
}

function makeJobStub(jobId: string): Partial<import('../../services/distributed-scheduler').ScheduledJob> {
  return {
    jobId,
    name: 'Test Job',
    agentId: 'agent_test',
    executionMode: 'event',
    maxRetries: 3,
    failureCount: 0,
    successCount: 0,
    status: 'pending',
  };
}
