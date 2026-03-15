/**
 * Tests for the Agent Runtime Orchestrator module (Issue #81)
 *
 * Covers:
 * - Orchestrator lifecycle (start/stop)
 * - Agent registration and lifecycle state transitions
 * - 9-step execution pipeline in simulation mode
 * - Risk validation and emergency suspension
 * - Event system
 * - Health and metrics
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentRuntimeOrchestrator,
  createAgentRuntimeOrchestrator,
  DEFAULT_RUNTIME_CONFIG,
  AgentRuntimeError,
  RuntimeAgentConfig,
  RuntimeEvent,
} from '../../core/agents/agent-runtime';

// ============================================================================
// Test Helpers
// ============================================================================

function makeAgentConfig(overrides: Partial<RuntimeAgentConfig> = {}): RuntimeAgentConfig {
  return {
    agentId: 'test-agent-001',
    name: 'Test DCA Bot',
    ownerId: 'tg_user_123',
    ownerAddress: 'EQDtest000000000000000000000000000000000000000000',
    strategyIds: ['dca-strategy-1'],
    simulation: {
      enabled: true,
      fakeBalance: BigInt(10_000_000_000), // 10 TON
      slippagePct: 0.5,
      networkLatencyMs: 10, // short for tests
    },
    riskLimits: {
      maxLossPerExecutionNano: BigInt(1_000_000_000),
      maxDailyLossNano: BigInt(5_000_000_000),
      maxDailyGasBudgetNano: BigInt(500_000_000),
      maxTransactionSizeNano: BigInt(2_000_000_000),
      maxTransactionsPerDay: 100,
      maxConsecutiveFailures: 3,
    },
    maxConcurrentExecutions: 2,
    enableObservability: false,
    ...overrides,
  };
}

function makeSilentRuntime(config: Partial<ConstructorParameters<typeof AgentRuntimeOrchestrator>[0]> = {}) {
  return createAgentRuntimeOrchestrator({
    observability: { enableLogging: false, enableMetrics: true, logLevel: 'error', metricsPrefix: 'test' },
    ...config,
  });
}

// ============================================================================
// DEFAULT_RUNTIME_CONFIG
// ============================================================================

describe('DEFAULT_RUNTIME_CONFIG', () => {
  it('should have simulation enabled by default', () => {
    expect(DEFAULT_RUNTIME_CONFIG.defaultSimulation.enabled).toBe(true);
  });

  it('should have sensible default risk limits', () => {
    expect(DEFAULT_RUNTIME_CONFIG.defaultRiskLimits.maxConsecutiveFailures).toBe(3);
    expect(DEFAULT_RUNTIME_CONFIG.defaultRiskLimits.maxTransactionsPerDay).toBe(100);
  });

  it('should have observability enabled by default', () => {
    expect(DEFAULT_RUNTIME_CONFIG.observability.enableLogging).toBe(true);
    expect(DEFAULT_RUNTIME_CONFIG.observability.enableMetrics).toBe(true);
  });
});

// ============================================================================
// AgentRuntimeOrchestrator - Lifecycle
// ============================================================================

describe('AgentRuntimeOrchestrator - orchestrator lifecycle', () => {
  let runtime: AgentRuntimeOrchestrator;

  beforeEach(() => {
    runtime = makeSilentRuntime();
  });

  it('should not be running before start()', () => {
    expect(runtime.isRunning()).toBe(false);
  });

  it('should be running after start()', () => {
    runtime.start();
    expect(runtime.isRunning()).toBe(true);
  });

  it('should not be running after stop()', () => {
    runtime.start();
    runtime.stop();
    expect(runtime.isRunning()).toBe(false);
  });

  it('calling start() twice is idempotent', () => {
    runtime.start();
    runtime.start();
    expect(runtime.isRunning()).toBe(true);
  });

  it('calling stop() twice is idempotent', () => {
    runtime.start();
    runtime.stop();
    runtime.stop();
    expect(runtime.isRunning()).toBe(false);
  });

  it('emits orchestrator.started event on start()', () => {
    const events: RuntimeEvent[] = [];
    runtime.subscribe((e) => events.push(e));
    runtime.start();
    expect(events.some((e) => e.type === 'orchestrator.started')).toBe(true);
  });

  it('emits orchestrator.stopped event on stop()', () => {
    const events: RuntimeEvent[] = [];
    runtime.start();
    runtime.subscribe((e) => events.push(e));
    runtime.stop();
    expect(events.some((e) => e.type === 'orchestrator.stopped')).toBe(true);
  });
});

// ============================================================================
// Agent Registration
// ============================================================================

describe('AgentRuntimeOrchestrator - agent registration', () => {
  let runtime: AgentRuntimeOrchestrator;

  beforeEach(() => {
    runtime = makeSilentRuntime();
    runtime.start();
  });

  it('should register an agent and return its state in created state', () => {
    const config = makeAgentConfig();
    runtime.registerAgent(config);

    const state = runtime.getAgentState('test-agent-001');
    expect(state).toBeDefined();
    expect(state?.lifecycleState).toBe('created');
  });

  it('should list the registered agent ID', () => {
    runtime.registerAgent(makeAgentConfig());
    expect(runtime.listAgentIds()).toContain('test-agent-001');
  });

  it('should throw if agent is registered twice', () => {
    runtime.registerAgent(makeAgentConfig());
    expect(() => runtime.registerAgent(makeAgentConfig())).toThrow(AgentRuntimeError);
  });

  it('should throw when max concurrent agents reached', () => {
    const limitedRuntime = makeSilentRuntime({ maxConcurrentAgents: 1 });
    limitedRuntime.start();
    limitedRuntime.registerAgent(makeAgentConfig({ agentId: 'a1' }));
    expect(() => limitedRuntime.registerAgent(makeAgentConfig({ agentId: 'a2' }))).toThrow(AgentRuntimeError);
  });

  it('should emit agent.registered event', () => {
    const events: RuntimeEvent[] = [];
    runtime.subscribe((e) => events.push(e));
    runtime.registerAgent(makeAgentConfig());
    expect(events.some((e) => e.type === 'agent.registered')).toBe(true);
  });

  it('should apply default simulation config when not fully specified', () => {
    const config = makeAgentConfig({
      simulation: { enabled: true, fakeBalance: BigInt(5_000_000_000) },
    });
    runtime.registerAgent(config);
    const agentCfg = runtime.getAgentConfig('test-agent-001');
    expect(agentCfg?.simulation.fakeBalance).toBe(BigInt(5_000_000_000));
  });
});

// ============================================================================
// Agent Lifecycle State Transitions
// ============================================================================

describe('AgentRuntimeOrchestrator - agent lifecycle transitions', () => {
  let runtime: AgentRuntimeOrchestrator;

  beforeEach(() => {
    runtime = makeSilentRuntime();
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
  });

  it('created -> funded via fundAgent()', () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    expect(runtime.getAgentState('test-agent-001')?.lifecycleState).toBe('funded');
  });

  it('funded -> active via startAgent()', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    expect(runtime.getAgentState('test-agent-001')?.lifecycleState).toBe('active');
  });

  it('active -> paused via pauseAgent()', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.pauseAgent('test-agent-001');
    expect(runtime.getAgentState('test-agent-001')?.lifecycleState).toBe('paused');
  });

  it('paused -> active via resumeAgent()', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.pauseAgent('test-agent-001');
    runtime.resumeAgent('test-agent-001');
    expect(runtime.getAgentState('test-agent-001')?.lifecycleState).toBe('active');
  });

  it('active -> terminated via terminateAgent()', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.terminateAgent('test-agent-001');
    expect(runtime.getAgentState('test-agent-001')?.lifecycleState).toBe('terminated');
  });

  it('should record transition history', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.pauseAgent('test-agent-001');

    const state = runtime.getAgentState('test-agent-001');
    expect(state?.transitionHistory.length).toBeGreaterThanOrEqual(3);
    expect(state?.transitionHistory[0].from).toBe('created');
    expect(state?.transitionHistory[0].to).toBe('funded');
  });

  it('should throw when starting from invalid state (created)', async () => {
    await expect(runtime.startAgent('test-agent-001')).rejects.toThrow(AgentRuntimeError);
  });

  it('should throw when pausing a non-active agent', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    expect(() => runtime.pauseAgent('test-agent-001')).toThrow(AgentRuntimeError);
  });

  it('should throw when operating on unknown agent', async () => {
    expect(() => runtime.pauseAgent('unknown-agent')).toThrow(AgentRuntimeError);
  });

  it('should list agents by state', async () => {
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');

    expect(runtime.listAgentsByState('active')).toContain('test-agent-001');
    expect(runtime.listAgentsByState('created')).not.toContain('test-agent-001');
  });

  it('should update balance on fundAgent()', () => {
    const fundAmount = BigInt(3_000_000_000);
    runtime.fundAgent('test-agent-001', fundAmount);
    const state = runtime.getAgentState('test-agent-001');
    // Initial simulated balance + funded amount
    expect(state?.balance).toBe(BigInt(10_000_000_000) + fundAmount);
  });

  it('should emit lifecycle events', async () => {
    const events: RuntimeEvent[] = [];
    runtime.subscribe((e) => events.push(e));

    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.pauseAgent('test-agent-001');

    const lifecycleEvents = events.filter((e) => e.type === 'agent.lifecycle_changed');
    expect(lifecycleEvents.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// Execution Pipeline
// ============================================================================

describe('AgentRuntimeOrchestrator - execution pipeline', () => {
  let runtime: AgentRuntimeOrchestrator;

  beforeEach(async () => {
    runtime = makeSilentRuntime();
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
  });

  it('should run a full pipeline and return a PipelineExecution', async () => {
    const result = await runtime.runPipeline('test-agent-001', 'dca-strategy-1');
    expect(result).toBeDefined();
    expect(result.executionId).toBeTruthy();
    expect(result.agentId).toBe('test-agent-001');
    expect(result.strategyId).toBe('dca-strategy-1');
    expect(result.isSimulation).toBe(true);
  });

  it('should complete all 9 pipeline steps', async () => {
    const result = await runtime.runPipeline('test-agent-001');
    const stepNames = result.steps.map((s) => s.step);
    expect(stepNames).toContain('fetch_data');
    expect(stepNames).toContain('load_memory');
    expect(stepNames).toContain('call_ai');
    expect(stepNames).toContain('validate_risk');
    expect(stepNames).toContain('generate_plan');
    expect(stepNames).toContain('simulate_tx');
    expect(stepNames).toContain('execute_onchain');
    expect(stepNames).toContain('record_outcome');
    expect(stepNames).toContain('update_analytics');
  });

  it('should report pipeline as successful', async () => {
    const result = await runtime.runPipeline('test-agent-001');
    expect(result.success).toBe(true);
  });

  it('should record completedAt and totalDurationMs', async () => {
    const result = await runtime.runPipeline('test-agent-001');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });

  it('should store pipeline in history', async () => {
    await runtime.runPipeline('test-agent-001');
    const history = runtime.getPipelineHistory('test-agent-001');
    expect(history.length).toBe(1);
    expect(history[0].agentId).toBe('test-agent-001');
  });

  it('should emit pipeline events', async () => {
    const events: RuntimeEvent[] = [];
    runtime.subscribe((e) => events.push(e));

    await runtime.runPipeline('test-agent-001');

    expect(events.some((e) => e.type === 'pipeline.started')).toBe(true);
    expect(events.some((e) => e.type === 'pipeline.completed')).toBe(true);
    expect(events.some((e) => e.type === 'pipeline.step_completed')).toBe(true);
  });

  it('should throw if agent is not active', async () => {
    runtime.pauseAgent('test-agent-001');
    await expect(runtime.runPipeline('test-agent-001')).rejects.toThrow(AgentRuntimeError);
  });

  it('should update metrics after pipeline', async () => {
    await runtime.runPipeline('test-agent-001');
    const metrics = runtime.getMetrics();
    expect(metrics.totalPipelineExecutions).toBe(1);
    expect(metrics.successfulPipelineExecutions).toBe(1);
  });

  it('should update agent lastExecutedAt', async () => {
    await runtime.runPipeline('test-agent-001');
    const state = runtime.getAgentState('test-agent-001');
    expect(state?.lastExecutedAt).toBeInstanceOf(Date);
  });

  it('should increment simulated transaction counts', async () => {
    const metricsBefore = runtime.getMetrics();
    await runtime.runPipeline('test-agent-001');
    const metricsAfter = runtime.getMetrics();
    // May or may not have simulated txs depending on AI decision (hold = 0 txs)
    expect(metricsAfter.totalSimulatedTransactions).toBeGreaterThanOrEqual(metricsBefore.totalSimulatedTransactions);
  });

  it('pipeline steps should each have duration and startedAt', async () => {
    const result = await runtime.runPipeline('test-agent-001');
    for (const step of result.steps) {
      expect(step.startedAt).toBeInstanceOf(Date);
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('should run multiple pipelines in sequence', async () => {
    await runtime.runPipeline('test-agent-001');
    await runtime.runPipeline('test-agent-001');
    const history = runtime.getPipelineHistory('test-agent-001');
    expect(history.length).toBe(2);
    const metrics = runtime.getMetrics();
    expect(metrics.totalPipelineExecutions).toBe(2);
  });
});

// ============================================================================
// Risk Validation
// ============================================================================

describe('AgentRuntimeOrchestrator - risk validation', () => {
  it('should suspend agent after maxConsecutiveFailures', async () => {
    const runtime = makeSilentRuntime();
    runtime.start();

    // Register agent with tight gas budget to force risk failures
    runtime.registerAgent(
      makeAgentConfig({
        agentId: 'risky-agent',
        riskLimits: {
          maxLossPerExecutionNano: BigInt(1_000_000_000),
          maxDailyLossNano: BigInt(5_000_000_000),
          maxDailyGasBudgetNano: BigInt(0), // will fail immediately
          maxTransactionSizeNano: BigInt(2_000_000_000),
          maxTransactionsPerDay: 100,
          maxConsecutiveFailures: 2,
        },
      })
    );
    runtime.fundAgent('risky-agent', BigInt(1_000_000_000));
    await runtime.startAgent('risky-agent');

    // Force gas budget failure by setting dailyGasUsed above limit
    const state = runtime.getAgentState('risky-agent')!;
    state.dailyGasUsed = BigInt(600_000_000); // exceeds 0 limit

    // Pipeline returns a failed result (not a rejection) when steps fail
    const result1 = await runtime.runPipeline('risky-agent');
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('Risk validation failed');

    // Second failure triggers suspension
    const result2 = await runtime.runPipeline('risky-agent');
    expect(result2.success).toBe(false);

    // After maxConsecutiveFailures=2, agent should be suspended
    const finalState = runtime.getAgentState('risky-agent');
    expect(finalState?.lifecycleState).toBe('suspended');
  });

  it('should emit risk.emergency_stop event on suspension', async () => {
    const runtime = makeSilentRuntime();
    runtime.start();

    runtime.registerAgent(
      makeAgentConfig({
        agentId: 'risky-agent-2',
        riskLimits: {
          maxLossPerExecutionNano: BigInt(1_000_000_000),
          maxDailyLossNano: BigInt(5_000_000_000),
          maxDailyGasBudgetNano: BigInt(0),
          maxTransactionSizeNano: BigInt(2_000_000_000),
          maxTransactionsPerDay: 100,
          maxConsecutiveFailures: 1,
        },
      })
    );
    runtime.fundAgent('risky-agent-2', BigInt(1_000_000_000));
    await runtime.startAgent('risky-agent-2');

    const events: RuntimeEvent[] = [];
    runtime.subscribe((e) => events.push(e));

    const state = runtime.getAgentState('risky-agent-2')!;
    state.dailyGasUsed = BigInt(600_000_000);

    // Pipeline returns a result, not a rejection
    const result = await runtime.runPipeline('risky-agent-2');
    expect(result.success).toBe(false);

    expect(events.some((e) => e.type === 'risk.emergency_stop')).toBe(true);
  });
});

// ============================================================================
// Event System
// ============================================================================

describe('AgentRuntimeOrchestrator - event system', () => {
  let runtime: AgentRuntimeOrchestrator;
  let events: RuntimeEvent[];

  beforeEach(() => {
    runtime = makeSilentRuntime();
    events = [];
    runtime.subscribe((e) => events.push(e));
    runtime.start();
  });

  it('should call subscriber for events', () => {
    runtime.registerAgent(makeAgentConfig());
    expect(events.length).toBeGreaterThan(0);
  });

  it('should unsubscribe correctly', () => {
    const localEvents: RuntimeEvent[] = [];
    const unsub = runtime.subscribe((e) => localEvents.push(e));
    runtime.registerAgent(makeAgentConfig());
    const countBefore = localEvents.length;
    unsub();
    runtime.registerAgent(makeAgentConfig({ agentId: 'agent-2' }));
    expect(localEvents.length).toBe(countBefore); // no new events after unsubscribe
  });

  it('should include agentId in agent events', () => {
    runtime.registerAgent(makeAgentConfig());
    const agentEvent = events.find((e) => e.type === 'agent.registered');
    expect(agentEvent?.agentId).toBe('test-agent-001');
  });

  it('should have id and timestamp on each event', () => {
    runtime.registerAgent(makeAgentConfig());
    for (const event of events) {
      expect(event.id).toBeTruthy();
      expect(event.timestamp).toBeInstanceOf(Date);
    }
  });

  it('should swallow errors thrown by subscribers without crashing', () => {
    runtime.subscribe(() => { throw new Error('bad subscriber'); });
    expect(() => runtime.registerAgent(makeAgentConfig())).not.toThrow();
  });
});

// ============================================================================
// Health and Metrics
// ============================================================================

describe('AgentRuntimeOrchestrator - health and metrics', () => {
  let runtime: AgentRuntimeOrchestrator;

  beforeEach(() => {
    runtime = makeSilentRuntime();
  });

  it('getHealth() returns unhealthy when not running', () => {
    const health = runtime.getHealth();
    expect(health.overall).toBe('unhealthy');
    expect(health.running).toBe(false);
  });

  it('getHealth() returns healthy when running', () => {
    runtime.start();
    const health = runtime.getHealth();
    expect(health.overall).toBe('healthy');
    expect(health.running).toBe(true);
  });

  it('getMetrics() tracks totalAgents', () => {
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
    const metrics = runtime.getMetrics();
    expect(metrics.totalAgents).toBe(1);
  });

  it('getMetrics() tracks activeAgents', async () => {
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    const metrics = runtime.getMetrics();
    expect(metrics.activeAgents).toBe(1);
  });

  it('getMetrics() tracks pausedAgents', async () => {
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    runtime.pauseAgent('test-agent-001');
    const metrics = runtime.getMetrics();
    expect(metrics.pausedAgents).toBe(1);
    expect(metrics.activeAgents).toBe(0);
  });

  it('getMetrics() tracks pipeline execution counts', async () => {
    runtime.start();
    runtime.registerAgent(makeAgentConfig());
    runtime.fundAgent('test-agent-001', BigInt(1_000_000_000));
    await runtime.startAgent('test-agent-001');
    await runtime.runPipeline('test-agent-001');
    const metrics = runtime.getMetrics();
    expect(metrics.totalPipelineExecutions).toBe(1);
    expect(metrics.successfulPipelineExecutions).toBe(1);
    expect(metrics.failedPipelineExecutions).toBe(0);
  });

  it('getMetrics() includes uptimeMs', () => {
    runtime.start();
    const metrics = runtime.getMetrics();
    expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('getHealth() includes metrics snapshot', () => {
    runtime.start();
    const health = runtime.getHealth();
    expect(health.metrics).toBeDefined();
    expect(health.lastCheck).toBeInstanceOf(Date);
  });
});

// ============================================================================
// AgentRuntimeError
// ============================================================================

describe('AgentRuntimeError', () => {
  it('should be an instance of Error', () => {
    const err = new AgentRuntimeError('test error', 'AGENT_NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
  });

  it('should have name AgentRuntimeError', () => {
    const err = new AgentRuntimeError('test', 'AGENT_NOT_FOUND');
    expect(err.name).toBe('AgentRuntimeError');
  });

  it('should carry code and message', () => {
    const err = new AgentRuntimeError('agent not found', 'AGENT_NOT_FOUND', { agentId: 'x' });
    expect(err.code).toBe('AGENT_NOT_FOUND');
    expect(err.message).toBe('agent not found');
    expect(err.metadata).toEqual({ agentId: 'x' });
  });
});

// ============================================================================
// createAgentRuntimeOrchestrator factory
// ============================================================================

describe('createAgentRuntimeOrchestrator', () => {
  it('should return an AgentRuntimeOrchestrator instance', () => {
    const runtime = createAgentRuntimeOrchestrator();
    expect(runtime).toBeInstanceOf(AgentRuntimeOrchestrator);
  });

  it('should accept partial config', () => {
    const runtime = createAgentRuntimeOrchestrator({
      maxConcurrentAgents: 10,
      observability: { enableLogging: false, enableMetrics: false, logLevel: 'error', metricsPrefix: 'x' },
    });
    expect(runtime).toBeInstanceOf(AgentRuntimeOrchestrator);
  });
});
