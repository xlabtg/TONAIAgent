/**
 * Tests for the Agent Lifecycle Cloud Orchestrator (Issue #92)
 *
 * Covers:
 * - Agent registration and lifecycle state machine
 * - State transitions (valid and invalid)
 * - Termination with final report
 * - Scheduler: cron, event, market, on-chain, manual jobs
 * - Job execution and metrics updates
 * - Runtime allocation (tiers, costs)
 * - Health monitoring and anomaly detection
 * - Auto-pause and auto-suspend on risk score thresholds
 * - Scaling engine
 * - Alerting engine (create, acknowledge)
 * - Governance layer (permissions, audit log)
 * - Migration support
 * - Query methods (list, filter by state/user)
 * - Event system
 * - REST API handler (all routes)
 * - Configuration: LIFECYCLE_TRANSITIONS, DEFAULT_LIFECYCLE_CONFIG
 * - Error handling: LifecycleOrchestratorError
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  LifecycleOrchestrator,
  LifecycleOrchestratorApi,
  LifecycleOrchestratorError,
  createLifecycleOrchestrator,
  createLifecycleOrchestratorApi,
  DEFAULT_LIFECYCLE_CONFIG,
  LIFECYCLE_TRANSITIONS,
} from '../../core/agents/lifecycle';

import type {
  RegisterAgentInput,
  LifecycleEvent,
  LifecycleState,
} from '../../core/agents/lifecycle';

// ============================================================================
// Test Helpers
// ============================================================================

let agentCounter = 0;

function makeInput(overrides: Partial<RegisterAgentInput> = {}): RegisterAgentInput {
  agentCounter += 1;
  return {
    agentId: `agent_test_${agentCounter}`,
    agentName: `Test Agent ${agentCounter}`,
    userId: 'user_test_123',
    environment: 'demo',
    ...overrides,
  };
}

function makeOrchestrator(config: Parameters<typeof createLifecycleOrchestrator>[0] = {}) {
  return createLifecycleOrchestrator({
    autoHealthChecks: false, // Disable background timer in tests
    ...config,
  });
}

// ============================================================================
// DEFAULT_LIFECYCLE_CONFIG
// ============================================================================

describe('DEFAULT_LIFECYCLE_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.enabled).toBe(true);
  });

  it('should default to ton-cloud provider', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.defaultCloudProvider).toBe('ton-cloud');
  });

  it('should default to serverless compute environment', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.defaultComputeEnvironment).toBe('serverless');
  });

  it('should default to standard resource tier', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.defaultResourceTier).toBe('standard');
  });

  it('should have auto-pause risk threshold at 75', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.autoPauseRiskThreshold).toBe(75);
  });

  it('should have auto-suspend risk threshold at 90', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.autoSuspendRiskThreshold).toBe(90);
  });

  it('should support 10,000 agents', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.maxAgents).toBe(10_000);
  });

  it('should have audit log enabled', () => {
    expect(DEFAULT_LIFECYCLE_CONFIG.governance.enableAuditLog).toBe(true);
  });
});

// ============================================================================
// LIFECYCLE_TRANSITIONS
// ============================================================================

describe('LIFECYCLE_TRANSITIONS', () => {
  it('created can transition to active or terminated', () => {
    expect(LIFECYCLE_TRANSITIONS.created).toContain('active');
    expect(LIFECYCLE_TRANSITIONS.created).toContain('terminated');
  });

  it('active can transition to running, paused, or terminated', () => {
    expect(LIFECYCLE_TRANSITIONS.active).toContain('running');
    expect(LIFECYCLE_TRANSITIONS.active).toContain('paused');
    expect(LIFECYCLE_TRANSITIONS.active).toContain('terminated');
  });

  it('running can transition to paused, suspended, or terminated', () => {
    expect(LIFECYCLE_TRANSITIONS.running).toContain('paused');
    expect(LIFECYCLE_TRANSITIONS.running).toContain('suspended');
    expect(LIFECYCLE_TRANSITIONS.running).toContain('terminated');
  });

  it('paused can transition to running, suspended, or terminated', () => {
    expect(LIFECYCLE_TRANSITIONS.paused).toContain('running');
    expect(LIFECYCLE_TRANSITIONS.paused).toContain('suspended');
    expect(LIFECYCLE_TRANSITIONS.paused).toContain('terminated');
  });

  it('suspended can transition to running, paused, or terminated', () => {
    expect(LIFECYCLE_TRANSITIONS.suspended).toContain('running');
    expect(LIFECYCLE_TRANSITIONS.suspended).toContain('paused');
    expect(LIFECYCLE_TRANSITIONS.suspended).toContain('terminated');
  });

  it('terminated has no valid transitions', () => {
    expect(LIFECYCLE_TRANSITIONS.terminated).toHaveLength(0);
  });
});

// ============================================================================
// LifecycleOrchestratorError
// ============================================================================

describe('LifecycleOrchestratorError', () => {
  it('should set name, message, and code', () => {
    const err = new LifecycleOrchestratorError('not found', 'AGENT_NOT_FOUND', { id: 'abc' });
    expect(err.name).toBe('LifecycleOrchestratorError');
    expect(err.message).toBe('not found');
    expect(err.code).toBe('AGENT_NOT_FOUND');
    expect(err.metadata?.id).toBe('abc');
  });

  it('should be an instance of Error', () => {
    const err = new LifecycleOrchestratorError('test', 'ORCHESTRATOR_DISABLED');
    expect(err).toBeInstanceOf(Error);
  });
});

// ============================================================================
// Agent Registration
// ============================================================================

describe('LifecycleOrchestrator.registerAgent', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should register an agent and return a lifecycle record', async () => {
    const input = makeInput();
    const result = await orchestrator.registerAgent(input);

    expect(result.record.agentId).toBe(input.agentId);
    expect(result.record.agentName).toBe(input.agentName);
    expect(result.record.userId).toBe(input.userId);
    expect(result.record.environment).toBe('demo');
  });

  it('should allocate runtime with default tier', async () => {
    const result = await orchestrator.registerAgent(makeInput());
    expect(result.allocation.tier).toBe('standard');
    expect(result.allocation.cpuMillicores).toBeGreaterThan(0);
    expect(result.allocation.memoryMb).toBeGreaterThan(0);
  });

  it('should set initial state to created when autoActivate is false', async () => {
    const result = await orchestrator.registerAgent(makeInput({ autoActivate: false }));
    expect(result.record.state).toBe('created');
  });

  it('should set initial state to active when autoActivate is true', async () => {
    const result = await orchestrator.registerAgent(makeInput({ autoActivate: true }));
    expect(result.record.state).toBe('active');
  });

  it('should schedule initial jobs when provided', async () => {
    const input = makeInput({
      initialJobs: [
        {
          agentId: 'placeholder',
          schedule: { type: 'cron', expression: '*/5 * * * *' },
          enabled: true,
        },
      ],
    });
    const result = await orchestrator.registerAgent(input);
    expect(result.scheduledJobs).toHaveLength(1);
    expect(result.scheduledJobs[0].schedule.type).toBe('cron');
  });

  it('should throw AGENT_ALREADY_REGISTERED for duplicate registration', async () => {
    const input = makeInput();
    await orchestrator.registerAgent(input);
    await expect(orchestrator.registerAgent(input)).rejects.toThrow(LifecycleOrchestratorError);
    await expect(orchestrator.registerAgent(input)).rejects.toMatchObject({ code: 'AGENT_ALREADY_REGISTERED' });
  });

  it('should throw ORCHESTRATOR_DISABLED when disabled', async () => {
    const disabled = makeOrchestrator({ enabled: false });
    await expect(disabled.registerAgent(makeInput())).rejects.toMatchObject({ code: 'ORCHESTRATOR_DISABLED' });
  });

  it('should throw MAX_AGENTS_REACHED when at capacity', async () => {
    const small = makeOrchestrator({ maxAgents: 1 });
    await small.registerAgent(makeInput());
    await expect(small.registerAgent(makeInput())).rejects.toMatchObject({ code: 'MAX_AGENTS_REACHED' });
  });

  it('should use custom resource tier when provided', async () => {
    const result = await orchestrator.registerAgent(makeInput({ resourceTier: 'performance' }));
    expect(result.allocation.tier).toBe('performance');
    expect(result.allocation.cpuMillicores).toBe(2_000);
  });

  it('should use custom cloud provider when provided', async () => {
    const result = await orchestrator.registerAgent(makeInput({ cloudProvider: 'aws' }));
    expect(result.allocation.provider).toBe('aws');
  });

  it('should initialize empty metrics', async () => {
    const result = await orchestrator.registerAgent(makeInput());
    expect(result.record.cumulativeMetrics.totalTransactions).toBe(0);
    expect(result.record.cumulativeMetrics.uptimePercent).toBe(0);
  });

  it('should create an audit entry', async () => {
    const input = makeInput();
    await orchestrator.registerAgent(input);
    const log = orchestrator.getAuditLog(10);
    expect(log.some((e) => e.action === 'agent.registered' && e.agentId === input.agentId)).toBe(true);
  });
});

// ============================================================================
// State Machine Transitions
// ============================================================================

describe('LifecycleOrchestrator.transitionState', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should transition from created to active', async () => {
    const input = makeInput({ autoActivate: false });
    await orchestrator.registerAgent(input);
    const record = await orchestrator.transitionState({
      agentId: input.agentId,
      targetState: 'active',
      requestedBy: 'user',
      reason: 'test',
    });
    expect(record.state).toBe('active');
    expect(record.previousState).toBe('created');
  });

  it('should record state history', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    const record = orchestrator.getAgent(input.agentId);
    expect(record.stateHistory.length).toBeGreaterThan(0);
    expect(record.stateHistory[0].from).toBe('active');
    expect(record.stateHistory[0].to).toBe('running');
  });

  it('should reject invalid transitions', async () => {
    const input = makeInput({ autoActivate: false }); // starts as 'created'
    await orchestrator.registerAgent(input);
    // Cannot go from 'created' directly to 'running'
    await expect(
      orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  it('should terminate agent and set terminatedAt', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const record = await orchestrator.transitionState({
      agentId: input.agentId,
      targetState: 'terminated',
      requestedBy: 'user',
      reason: 'cleanup',
    });
    expect(record.state).toBe('terminated');
    expect(record.terminatedAt).not.toBeNull();
    expect(record.finalReport).not.toBeNull();
    expect(record.finalReport?.terminationReason).toBe('cleanup');
  });

  it('should disable all scheduled jobs on termination', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' }, enabled: true });
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'terminated', requestedBy: 'user', reason: 'test' });
    const record = orchestrator.getAgent(input.agentId);
    expect(record.scheduledJobs.every((j) => !j.enabled)).toBe(true);
  });

  it('should throw AGENT_NOT_FOUND for unknown agentId', async () => {
    await expect(
      orchestrator.transitionState({ agentId: 'nope', targetState: 'active', requestedBy: 'user', reason: 'test' }),
    ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
  });

  it('should mark automated transitions correctly', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({
      agentId: input.agentId,
      targetState: 'running',
      requestedBy: 'system',
      reason: 'auto',
      automated: true,
    });
    const record = orchestrator.getAgent(input.agentId);
    const lastTransition = record.stateHistory[record.stateHistory.length - 1];
    expect(lastTransition.automated).toBe(true);
  });
});

// ============================================================================
// Scheduler
// ============================================================================

describe('LifecycleOrchestrator.scheduleJob', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should schedule a cron job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({
      agentId: input.agentId,
      schedule: { type: 'cron', expression: '*/5 * * * *' },
    });
    expect(job.jobId).toBeDefined();
    expect(job.schedule.type).toBe('cron');
    expect(job.nextExecutionAt).not.toBeNull();
    expect(job.executionCount).toBe(0);
  });

  it('should schedule an event-based job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({
      agentId: input.agentId,
      schedule: { type: 'event', source: 'ton-blockchain', eventName: 'transfer' },
    });
    expect(job.schedule.type).toBe('event');
    expect(job.nextExecutionAt).toBeNull(); // event-based has no fixed next execution
  });

  it('should schedule a market trigger job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({
      agentId: input.agentId,
      schedule: { type: 'market', asset: 'TON/USDT', condition: 'price_above', threshold: 5.0 },
    });
    expect(job.schedule.type).toBe('market');
  });

  it('should schedule an on-chain trigger job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({
      agentId: input.agentId,
      schedule: { type: 'on-chain', network: 'mainnet', contractAddress: null, onChainEvent: 'new_block' },
    });
    expect(job.schedule.type).toBe('on-chain');
  });

  it('should schedule a manual trigger job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });
    expect(job.schedule.type).toBe('manual');
    expect(job.nextExecutionAt).toBeNull();
  });

  it('should default enabled to true', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });
    expect(job.enabled).toBe(true);
  });

  it('should reject scheduling for terminated agent', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'terminated', requestedBy: 'user', reason: 'test' });
    expect(() => orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } }))
      .toThrow(LifecycleOrchestratorError);
  });
});

// ============================================================================
// Job Execution
// ============================================================================

describe('LifecycleOrchestrator.executeJob', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should execute a job and update metrics', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });

    await orchestrator.executeJob(input.agentId, job.jobId);

    const record = orchestrator.getAgent(input.agentId);
    expect(record.cumulativeMetrics.totalTransactions).toBe(1);
    expect(record.cumulativeMetrics.executionsLastHour).toBe(1);
    expect(record.cumulativeMetrics.lastExecutionAt).not.toBeNull();
  });

  it('should increment job execution count', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });

    await orchestrator.executeJob(input.agentId, job.jobId);
    await orchestrator.executeJob(input.agentId, job.jobId);

    const record = orchestrator.getAgent(input.agentId);
    const updatedJob = record.scheduledJobs.find((j) => j.jobId === job.jobId);
    expect(updatedJob?.executionCount).toBe(2);
  });

  it('should throw JOB_NOT_FOUND for unknown jobId', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    await expect(orchestrator.executeJob(input.agentId, 'job_nonexistent')).rejects.toMatchObject({ code: 'JOB_NOT_FOUND' });
  });

  it('should throw INVALID_STATE for non-running/active agent', async () => {
    const input = makeInput({ autoActivate: false }); // starts as 'created'
    await orchestrator.registerAgent(input);
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });
    await expect(orchestrator.executeJob(input.agentId, job.jobId)).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});

// ============================================================================
// Health Monitor
// ============================================================================

describe('LifecycleOrchestrator.runHealthCheck', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should return healthy status for a normal running agent', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });

    const result = await orchestrator.runHealthCheck(input.agentId);
    expect(result.agentId).toBe(input.agentId);
    expect(result.status).toBe('healthy');
    expect(result.riskScore).toBe(0);
    expect(result.anomalies).toHaveLength(0);
  });

  it('should detect high latency anomaly', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });

    // Manually inject high latency
    const record = orchestrator.getAgent(input.agentId);
    record.cumulativeMetrics.avgExecutionLatencyMs = 6_000;

    const result = await orchestrator.runHealthCheck(input.agentId);
    expect(result.anomalies.some((a) => a.type === 'high_latency')).toBe(true);
  });

  it('should detect execution failure spike', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });

    const record = orchestrator.getAgent(input.agentId);
    record.cumulativeMetrics.failedExecutionsLastHour = 10;

    const result = await orchestrator.runHealthCheck(input.agentId);
    expect(result.anomalies.some((a) => a.type === 'execution_failure_spike')).toBe(true);
    expect(result.status).toBe('degraded');
  });

  it('should auto-pause agent when risk score >= autoPauseRiskThreshold', async () => {
    const orch = makeOrchestrator({
      autoPauseRiskThreshold: 40, // low threshold for test
      autoSuspendRiskThreshold: 0, // disable suspend
      alerting: { defaultChannels: ['dashboard'], minSeverity: 'info', autoPauseOnCritical: true, autoSuspendOnEmergency: false },
    });
    const input = makeInput({ autoActivate: true });
    await orch.registerAgent(input);
    await orch.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });

    const record = orch.getAgent(input.agentId);
    record.cumulativeMetrics.avgExecutionLatencyMs = 6_000; // triggers medium anomaly (+25)
    record.cumulativeMetrics.failedExecutionsLastHour = 10;  // triggers high anomaly (+40)

    await orch.runHealthCheck(input.agentId);
    const updated = orch.getAgent(input.agentId);
    expect(updated.state).toBe('paused');
  });

  it('should auto-suspend agent when risk score >= autoSuspendRiskThreshold', async () => {
    const orch = makeOrchestrator({
      autoPauseRiskThreshold: 0,   // disable pause
      autoSuspendRiskThreshold: 10, // low threshold for test
    });
    const input = makeInput({ autoActivate: true });
    await orch.registerAgent(input);
    await orch.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });

    const record = orch.getAgent(input.agentId);
    record.cumulativeMetrics.avgExecutionLatencyMs = 6_000; // +25

    await orch.runHealthCheck(input.agentId);
    const updated = orch.getAgent(input.agentId);
    expect(updated.state).toBe('suspended');
  });

  it('should update latestHealthCheck on agent record', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    expect(orchestrator.getAgent(input.agentId).latestHealthCheck).toBeNull();
    await orchestrator.runHealthCheck(input.agentId);
    expect(orchestrator.getAgent(input.agentId).latestHealthCheck).not.toBeNull();
  });
});

// ============================================================================
// Scaling Engine
// ============================================================================

describe('LifecycleOrchestrator.scaleAgent', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should scale agent to a higher resource tier', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    const allocation = await orchestrator.scaleAgent({
      agentId: input.agentId,
      tier: 'performance',
      reason: 'high load',
    });

    expect(allocation.tier).toBe('performance');
    expect(allocation.cpuMillicores).toBe(2_000);
    expect(allocation.memoryMb).toBe(2_048);
  });

  it('should scale agent to a lower resource tier', async () => {
    const input = makeInput({ resourceTier: 'dedicated', autoActivate: true });
    await orchestrator.registerAgent(input);

    const allocation = await orchestrator.scaleAgent({
      agentId: input.agentId,
      tier: 'minimal',
      reason: 'cost optimization',
    });

    expect(allocation.tier).toBe('minimal');
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', async () => {
    await expect(
      orchestrator.scaleAgent({ agentId: 'nope', tier: 'standard', reason: 'test' }),
    ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
  });
});

// ============================================================================
// Alerting Engine
// ============================================================================

describe('Alerting Engine', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should create an alert for an agent', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    const alert = await orchestrator.createAlert(input.agentId, input.userId, {
      severity: 'warning',
      title: 'Test Alert',
      message: 'This is a test',
    });

    expect(alert.alertId).toBeDefined();
    expect(alert.severity).toBe('warning');
    expect(alert.acknowledged).toBe(false);
  });

  it('should add alert to agent record', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    await orchestrator.createAlert(input.agentId, input.userId, {
      severity: 'info',
      title: 'Info',
      message: 'Something happened',
    });

    const record = orchestrator.getAgent(input.agentId);
    expect(record.activeAlerts).toHaveLength(1);
  });

  it('should acknowledge an alert', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const alert = await orchestrator.createAlert(input.agentId, input.userId, {
      severity: 'warning',
      title: 'Test',
      message: 'Test',
    });

    const acked = orchestrator.acknowledgeAlert(input.agentId, alert.alertId);
    expect(acked.acknowledged).toBe(true);
  });

  it('should throw ALERT_NOT_FOUND for unknown alertId', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    expect(() => orchestrator.acknowledgeAlert(input.agentId, 'alert_nonexistent'))
      .toThrow(LifecycleOrchestratorError);
  });
});

// ============================================================================
// Governance Layer
// ============================================================================

describe('Governance Layer', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator({ governance: { enableAuditLog: true, requireTransitionReason: false, enforcePermissions: true } });
  });

  it('should grant permissions to a user', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    const perm = orchestrator.grantPermission(
      input.agentId,
      'admin_user',
      'user',
      ['agent.pause', 'agent.resume'],
      'owner_user',
    );

    expect(perm.principal).toBe('admin_user');
    expect(perm.scopes).toContain('agent.pause');
  });

  it('should return true for a user with the required permission', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    orchestrator.grantPermission(input.agentId, 'admin_user', 'user', ['agent.read'], 'owner');
    expect(orchestrator.hasPermission(input.agentId, 'admin_user', 'agent.read')).toBe(true);
  });

  it('should return false for a user without the required permission', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    expect(orchestrator.hasPermission(input.agentId, 'unknown_user', 'agent.terminate')).toBe(false);
  });

  it('should return true for any user when permissions are not enforced', async () => {
    const orch = makeOrchestrator({ governance: { enableAuditLog: false, requireTransitionReason: false, enforcePermissions: false } });
    const input = makeInput({ autoActivate: true });
    await orch.registerAgent(input);
    expect(orch.hasPermission(input.agentId, 'anyone', 'governance.admin')).toBe(true);
  });
});

// ============================================================================
// Migration Support
// ============================================================================

describe('Migration Support', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should start a cloud provider migration', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    const migration = await orchestrator.startMigration(
      input.agentId,
      'cloud_provider',
      { provider: 'vercel' },
      { provider: 'aws', region: 'us-east-1' },
    );

    expect(migration.type).toBe('cloud_provider');
    expect(migration.status).toBe('in_progress');
    expect(migration.startedAt).not.toBeNull();
  });

  it('should complete a migration successfully', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const migration = await orchestrator.startMigration(input.agentId, 'runtime_upgrade', {}, {});

    const completed = orchestrator.completeMigration(input.agentId, migration.migrationId, true);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();
  });

  it('should record a failed migration', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const migration = await orchestrator.startMigration(input.agentId, 'wallet_strategy', {}, {});

    const failed = orchestrator.completeMigration(input.agentId, migration.migrationId, false, 'Network timeout');
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Network timeout');
  });

  it('should throw MIGRATION_NOT_FOUND for unknown migration', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    expect(() => orchestrator.completeMigration(input.agentId, 'mig_nonexistent', true))
      .toThrow(LifecycleOrchestratorError);
  });
});

// ============================================================================
// Query Methods
// ============================================================================

describe('Query Methods', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should list all agents', async () => {
    await orchestrator.registerAgent(makeInput({ userId: 'user_a' }));
    await orchestrator.registerAgent(makeInput({ userId: 'user_b' }));
    expect(orchestrator.listAgents()).toHaveLength(2);
  });

  it('should list agents by user', async () => {
    await orchestrator.registerAgent(makeInput({ userId: 'user_target' }));
    await orchestrator.registerAgent(makeInput({ userId: 'user_target' }));
    await orchestrator.registerAgent(makeInput({ userId: 'user_other' }));
    const agents = orchestrator.listAgentsByUser('user_target');
    expect(agents).toHaveLength(2);
    expect(agents.every((a) => a.userId === 'user_target')).toBe(true);
  });

  it('should list agents by state', async () => {
    const i1 = makeInput({ autoActivate: true });
    const i2 = makeInput({ autoActivate: false });
    await orchestrator.registerAgent(i1);
    await orchestrator.registerAgent(i2);

    const active = orchestrator.listAgentsByState('active');
    const created = orchestrator.listAgentsByState('created');
    expect(active).toHaveLength(1);
    expect(created).toHaveLength(1);
  });

  it('should get metrics', async () => {
    await orchestrator.registerAgent(makeInput({ autoActivate: true }));
    const metrics = orchestrator.getMetrics();
    expect(metrics.totalAgents).toBe(1);
    expect(metrics.agentsByState.active).toBe(1);
  });

  it('should get audit log', async () => {
    await orchestrator.registerAgent(makeInput());
    const log = orchestrator.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].action).toBe('agent.registered');
  });

  it('should get orchestrator health', async () => {
    const health = orchestrator.getHealth();
    expect(health.running).toBe(true);
    expect(health.overall).toBe('healthy');
    expect(health.components.lifecycleManager).toBe(true);
    expect(health.components.scheduler).toBe(true);
  });
});

// ============================================================================
// Event System
// ============================================================================

describe('Event System', () => {
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should emit agent.registered event', async () => {
    const events: LifecycleEvent[] = [];
    orchestrator.on((e) => events.push(e));
    const input = makeInput();
    await orchestrator.registerAgent(input);
    expect(events.some((e) => e.type === 'agent.registered' && e.agentId === input.agentId)).toBe(true);
  });

  it('should emit agent.state_changed event on transition', async () => {
    const events: LifecycleEvent[] = [];
    orchestrator.on((e) => events.push(e));
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    events.length = 0; // clear setup events

    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    expect(events.some((e) => e.type === 'agent.state_changed')).toBe(true);
  });

  it('should emit agent.terminated event on termination', async () => {
    const events: LifecycleEvent[] = [];
    orchestrator.on((e) => events.push(e));
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'terminated', requestedBy: 'user', reason: 'test' });
    expect(events.some((e) => e.type === 'agent.terminated')).toBe(true);
  });

  it('should emit job.scheduled event', async () => {
    const events: LifecycleEvent[] = [];
    orchestrator.on((e) => events.push(e));
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    events.length = 0;

    orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });
    expect(events.some((e) => e.type === 'job.scheduled')).toBe(true);
  });

  it('should allow unsubscribing from events', async () => {
    const events: LifecycleEvent[] = [];
    const unsub = orchestrator.on((e) => events.push(e));
    unsub();

    await orchestrator.registerAgent(makeInput());
    expect(events).toHaveLength(0);
  });

  it('should not throw when event handler throws', async () => {
    orchestrator.on(() => { throw new Error('handler error'); });
    await expect(orchestrator.registerAgent(makeInput())).resolves.not.toThrow();
  });
});

// ============================================================================
// REST API Handler
// ============================================================================

describe('LifecycleOrchestratorApi', () => {
  let api: LifecycleOrchestratorApi;
  let orchestrator: LifecycleOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
    api = new LifecycleOrchestratorApi(orchestrator);
  });

  // ── Registration ──────────────────────────────────────────────────────────

  it('POST /lifecycle/agents — should register agent', async () => {
    const input = makeInput();
    const res = await api.handle({
      method: 'POST',
      path: '/lifecycle/agents',
      body: input,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect((res.body.data as { record: { agentId: string } }).record.agentId).toBe(input.agentId);
  });

  it('POST /lifecycle/agents — should return 400 for missing fields', async () => {
    const res = await api.handle({ method: 'POST', path: '/lifecycle/agents', body: { userId: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── List agents ───────────────────────────────────────────────────────────

  it('GET /lifecycle/agents — should list all agents', async () => {
    await orchestrator.registerAgent(makeInput());
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents' });
    expect(res.status).toBe(200);
    expect((res.body.data as { total: number }).total).toBeGreaterThan(0);
  });

  // ── Get single agent ──────────────────────────────────────────────────────

  it('GET /lifecycle/agents/:agentId — should return the agent', async () => {
    const input = makeInput();
    await orchestrator.registerAgent(input);
    const res = await api.handle({ method: 'GET', path: `/lifecycle/agents/${input.agentId}` });
    expect(res.status).toBe(200);
    expect((res.body.data as { agentId: string }).agentId).toBe(input.agentId);
  });

  it('GET /lifecycle/agents/:agentId — should return 404 for unknown agent', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents/nope' });
    expect(res.status).toBe(404);
  });

  // ── List by user ──────────────────────────────────────────────────────────

  it('GET /lifecycle/agents/user/:userId — should list agents for user', async () => {
    const input = makeInput({ userId: 'target_user' });
    await orchestrator.registerAgent(input);
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents/user/target_user' });
    expect(res.status).toBe(200);
    expect((res.body.data as { total: number }).total).toBe(1);
  });

  // ── List by state ─────────────────────────────────────────────────────────

  it('GET /lifecycle/agents/state/:state — should list agents by state', async () => {
    await orchestrator.registerAgent(makeInput({ autoActivate: true }));
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents/state/active' });
    expect(res.status).toBe(200);
    expect((res.body.data as { total: number }).total).toBe(1);
  });

  it('GET /lifecycle/agents/state/:state — should return 400 for invalid state', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents/state/invalid_state' });
    expect(res.status).toBe(400);
  });

  // ── State transition ──────────────────────────────────────────────────────

  it('PATCH /lifecycle/agents/:agentId/state — should transition state', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);

    const res = await api.handle({
      method: 'PATCH',
      path: `/lifecycle/agents/${input.agentId}/state`,
      body: { targetState: 'running', requestedBy: 'user', reason: 'test' },
    });
    expect(res.status).toBe(200);
    expect((res.body.data as { state: string }).state).toBe('running');
  });

  it('PATCH /lifecycle/agents/:agentId/state — should return 400 for missing fields', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'PATCH',
      path: `/lifecycle/agents/${input.agentId}/state`,
      body: { requestedBy: 'user' }, // missing targetState
    });
    expect(res.status).toBe(400);
  });

  // ── Terminate ─────────────────────────────────────────────────────────────

  it('DELETE /lifecycle/agents/:agentId — should terminate agent', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({ method: 'DELETE', path: `/lifecycle/agents/${input.agentId}` });
    expect(res.status).toBe(200);
    expect((res.body.data as { terminated: boolean }).terminated).toBe(true);
  });

  // ── Schedule job ──────────────────────────────────────────────────────────

  it('POST /lifecycle/agents/:agentId/jobs — should schedule a job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/jobs`,
      body: { schedule: { type: 'manual' } },
    });
    expect(res.status).toBe(201);
    expect((res.body.data as { jobId: string }).jobId).toBeDefined();
  });

  it('POST /lifecycle/agents/:agentId/jobs — should return 400 for missing schedule', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/jobs`,
      body: {},
    });
    expect(res.status).toBe(400);
  });

  // ── Execute job ───────────────────────────────────────────────────────────

  it('POST /lifecycle/agents/:agentId/jobs/:jobId/execute — should execute a job', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'test' });
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'manual' } });

    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/jobs/${job.jobId}/execute`,
    });
    expect(res.status).toBe(200);
    expect((res.body.data as { executed: boolean }).executed).toBe(true);
  });

  // ── Scale agent ───────────────────────────────────────────────────────────

  it('POST /lifecycle/agents/:agentId/scale — should scale agent', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/scale`,
      body: { tier: 'performance', reason: 'load increase' },
    });
    expect(res.status).toBe(200);
    expect((res.body.data as { tier: string }).tier).toBe('performance');
  });

  // ── Health check ──────────────────────────────────────────────────────────

  it('GET /lifecycle/agents/:agentId/health — should run health check', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({ method: 'GET', path: `/lifecycle/agents/${input.agentId}/health` });
    expect(res.status).toBe(200);
    expect((res.body.data as { riskScore: number }).riskScore).toBe(0);
  });

  // ── Orchestrator health ───────────────────────────────────────────────────

  it('GET /lifecycle/agents/health — should return orchestrator health', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/agents/health' });
    expect(res.status).toBe(200);
    expect((res.body.data as { running: boolean }).running).toBe(true);
  });

  it('GET /lifecycle/health — should return orchestrator health (alt path)', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/health' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Metrics ───────────────────────────────────────────────────────────────

  it('GET /lifecycle/metrics — should return metrics', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/metrics' });
    expect(res.status).toBe(200);
    expect((res.body.data as { totalAgents: number }).totalAgents).toBeDefined();
  });

  // ── Audit log ─────────────────────────────────────────────────────────────

  it('GET /lifecycle/audit — should return audit log', async () => {
    await orchestrator.registerAgent(makeInput());
    const res = await api.handle({ method: 'GET', path: '/lifecycle/audit' });
    expect(res.status).toBe(200);
    expect((res.body.data as { total: number }).total).toBeGreaterThan(0);
  });

  // ── Alerts ────────────────────────────────────────────────────────────────

  it('POST /lifecycle/agents/:agentId/alerts — should create alert', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/alerts`,
      body: { severity: 'warning', title: 'Test', message: 'Test message' },
    });
    expect(res.status).toBe(201);
    expect((res.body.data as { acknowledged: boolean }).acknowledged).toBe(false);
  });

  it('PATCH /lifecycle/agents/:agentId/alerts/:alertId/ack — should acknowledge alert', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const alert = await orchestrator.createAlert(input.agentId, input.userId, {
      severity: 'info',
      title: 'Test',
      message: 'Test',
    });
    const res = await api.handle({
      method: 'PATCH',
      path: `/lifecycle/agents/${input.agentId}/alerts/${alert.alertId}/ack`,
    });
    expect(res.status).toBe(200);
    expect((res.body.data as { acknowledged: boolean }).acknowledged).toBe(true);
  });

  // ── Migrations ────────────────────────────────────────────────────────────

  it('POST /lifecycle/agents/:agentId/migrations — should start migration', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const res = await api.handle({
      method: 'POST',
      path: `/lifecycle/agents/${input.agentId}/migrations`,
      body: { type: 'cloud_provider', sourceConfig: { provider: 'vercel' }, targetConfig: { provider: 'aws' } },
    });
    expect(res.status).toBe(201);
    expect((res.body.data as { status: string }).status).toBe('in_progress');
  });

  it('PATCH /lifecycle/agents/:agentId/migrations/:migrationId — should complete migration', async () => {
    const input = makeInput({ autoActivate: true });
    await orchestrator.registerAgent(input);
    const migration = await orchestrator.startMigration(input.agentId, 'runtime_upgrade', {}, {});

    const res = await api.handle({
      method: 'PATCH',
      path: `/lifecycle/agents/${input.agentId}/migrations/${migration.migrationId}`,
      body: { success: true },
    });
    expect(res.status).toBe(200);
    expect((res.body.data as { status: string }).status).toBe('completed');
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('should return 404 for unknown route', async () => {
    const res = await api.handle({ method: 'GET', path: '/lifecycle/unknown_route_xyz' });
    expect(res.status).toBe(404);
  });

  // ── Factory function ──────────────────────────────────────────────────────

  it('createLifecycleOrchestratorApi should work without arguments', async () => {
    const freshApi = createLifecycleOrchestratorApi();
    const res = await freshApi.handle({ method: 'GET', path: '/lifecycle/health' });
    expect(res.status).toBe(200);
  });
});

// ============================================================================
// Full Lifecycle Integration Flow
// ============================================================================

describe('Full Lifecycle Integration Flow', () => {
  it('should run a complete agent lifecycle: register → activate → run → health check → pause → resume → terminate', async () => {
    const orchestrator = makeOrchestrator();
    const events: LifecycleEvent[] = [];
    orchestrator.on((e) => events.push(e));

    const input = makeInput({ autoActivate: false });

    // 1. Register
    const { record } = await orchestrator.registerAgent(input);
    expect(record.state).toBe('created');

    // 2. Activate
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'active', requestedBy: 'user', reason: 'activation' });
    expect(orchestrator.getAgent(input.agentId).state).toBe('active');

    // 3. Move to running
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'start' });
    expect(orchestrator.getAgent(input.agentId).state).toBe('running');

    // 4. Schedule and execute jobs
    const job = orchestrator.scheduleJob({ agentId: input.agentId, schedule: { type: 'cron', expression: '*/1 * * * *' } });
    await orchestrator.executeJob(input.agentId, job.jobId);
    expect(orchestrator.getAgent(input.agentId).cumulativeMetrics.totalTransactions).toBe(1);

    // 5. Health check
    const health = await orchestrator.runHealthCheck(input.agentId);
    expect(health.status).toBe('healthy');

    // 6. Pause
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'paused', requestedBy: 'user', reason: 'maintenance' });
    expect(orchestrator.getAgent(input.agentId).state).toBe('paused');

    // 7. Resume
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'running', requestedBy: 'user', reason: 'back online' });
    expect(orchestrator.getAgent(input.agentId).state).toBe('running');

    // 8. Terminate
    await orchestrator.transitionState({ agentId: input.agentId, targetState: 'terminated', requestedBy: 'user', reason: 'user shutdown' });
    const final = orchestrator.getAgent(input.agentId);
    expect(final.state).toBe('terminated');
    expect(final.terminatedAt).not.toBeNull();
    expect(final.finalReport).not.toBeNull();

    // Verify event sequence
    const types = events.map((e) => e.type);
    expect(types).toContain('agent.registered');
    expect(types).toContain('agent.state_changed');
    expect(types).toContain('job.scheduled');
    expect(types).toContain('job.executed');
    expect(types).toContain('health.check_completed');
    expect(types).toContain('agent.terminated');

    // Verify audit trail
    const auditLog = orchestrator.getAuditLog(50);
    expect(auditLog.length).toBeGreaterThan(0);
  });
});
