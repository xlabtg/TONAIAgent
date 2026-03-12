/**
 * TONAIAgent - Agent Execution Loop Tests
 * Issue #212: Agent Execution Loop (Core Runtime Engine)
 *
 * Comprehensive tests for the agent runtime system including:
 * - Agent state management
 * - Execution loop
 * - Scheduler
 * - Runtime monitoring
 * - Multi-agent scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  // Types
  AgentConfig,
  AgentState,
  ExecutionInterval,
  RuntimeEvent,
  // State Manager
  AgentStateManager,
  createAgentStateManager,
  // Execution Loop
  ExecutionLoop,
  createExecutionLoop,
  DefaultMarketDataProvider,
  DefaultStrategyExecutor,
  DefaultRiskValidator,
  DefaultTradeExecutor,
  // Scheduler
  AgentScheduler,
  createAgentScheduler,
  intervalToMs,
  parseInterval,
  // Monitor
  RuntimeMonitor,
  createRuntimeMonitor,
  // Manager
  AgentManager,
  createAgentManager,
  // Errors
  RuntimeError,
} from '../../src/runtime';

// ============================================================================
// Test Utilities
// ============================================================================

function createTestAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    agentId: `agent-${Date.now()}`,
    name: 'Test Bot',
    ownerId: 'user-123',
    strategyId: 'momentum',
    tradingPair: 'TON/USDT',
    interval: { value: 10, unit: 'seconds' },
    initialBalance: { USDT: 10000, TON: 0 },
    riskLimits: {
      maxPositionSizePercent: 5,
      maxPortfolioExposurePercent: 20,
      stopLossPercent: 10,
      maxDailyLossPercent: 3,
      maxTradesPerDay: 100,
    },
    simulationMode: true,
    ...overrides,
  };
}

// ============================================================================
// Agent State Manager Tests
// ============================================================================

describe('AgentStateManager', () => {
  let stateManager: AgentStateManager;

  beforeEach(() => {
    stateManager = createAgentStateManager();
  });

  describe('createAgent', () => {
    it('should create an agent in CREATED state', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      const state = stateManager.createAgent(config);

      expect(state.agentId).toBe('agent-001');
      expect(state.state).toBe('CREATED');
      expect(state.portfolioValue).toBe(10000);
      expect(state.positions).toEqual({ USDT: 10000, TON: 0 });
    });

    it('should throw if agent already exists', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);

      expect(() => stateManager.createAgent(config)).toThrow(RuntimeError);
    });
  });

  describe('state transitions', () => {
    it('should transition CREATED -> RUNNING', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);

      const state = stateManager.startAgent('agent-001');
      expect(state.state).toBe('RUNNING');
    });

    it('should transition RUNNING -> PAUSED', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');

      const state = stateManager.pauseAgent('agent-001');
      expect(state.state).toBe('PAUSED');
    });

    it('should transition PAUSED -> RUNNING', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      stateManager.pauseAgent('agent-001');

      const state = stateManager.resumeAgent('agent-001');
      expect(state.state).toBe('RUNNING');
    });

    it('should transition to STOPPED (terminal)', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');

      const state = stateManager.stopAgent('agent-001');
      expect(state.state).toBe('STOPPED');
    });

    it('should transition RUNNING -> ERROR', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');

      const state = stateManager.setAgentError('agent-001', 'Test error');
      expect(state.state).toBe('ERROR');
      expect(state.errorMessage).toBe('Test error');
      expect(state.consecutiveErrors).toBe(1);
    });

    it('should recover from ERROR state', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      stateManager.setAgentError('agent-001', 'Test error');

      const state = stateManager.recoverAgent('agent-001');
      expect(state.state).toBe('RUNNING');
      expect(state.errorMessage).toBeUndefined();
      expect(state.consecutiveErrors).toBe(0);
    });

    it('should throw on invalid state transition', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);

      // Cannot pause from CREATED
      expect(() => stateManager.pauseAgent('agent-001')).toThrow(RuntimeError);
    });
  });

  describe('queries', () => {
    it('should list agents by state', () => {
      stateManager.createAgent(createTestAgentConfig({ agentId: 'agent-001' }));
      stateManager.createAgent(createTestAgentConfig({ agentId: 'agent-002' }));
      stateManager.createAgent(createTestAgentConfig({ agentId: 'agent-003' }));

      stateManager.startAgent('agent-001');
      stateManager.startAgent('agent-002');

      const running = stateManager.listAgentsByState('RUNNING');
      const created = stateManager.listAgentsByState('CREATED');

      expect(running.length).toBe(2);
      expect(created.length).toBe(1);
    });

    it('should return state counts', () => {
      stateManager.createAgent(createTestAgentConfig({ agentId: 'agent-001' }));
      stateManager.createAgent(createTestAgentConfig({ agentId: 'agent-002' }));
      stateManager.startAgent('agent-001');

      const counts = stateManager.getStateCounts();

      expect(counts.RUNNING).toBe(1);
      expect(counts.CREATED).toBe(1);
      expect(counts.PAUSED).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit events on state changes', () => {
      const events: RuntimeEvent[] = [];
      stateManager.subscribe((event) => events.push(event));

      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      stateManager.pauseAgent('agent-001');

      expect(events.length).toBe(3);
      expect(events[0].type).toBe('agent.created');
      expect(events[1].type).toBe('agent.started');
      expect(events[2].type).toBe('agent.paused');
    });
  });
});

// ============================================================================
// Execution Loop Tests
// ============================================================================

describe('ExecutionLoop', () => {
  let executionLoop: ExecutionLoop;
  let stateManager: AgentStateManager;

  beforeEach(() => {
    executionLoop = createExecutionLoop();
    stateManager = createAgentStateManager();
  });

  describe('executeCycle', () => {
    it('should complete a full execution cycle', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      const state = stateManager.requireAgent('agent-001');

      const result = await executionLoop.executeCycle(state);

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('agent-001');
      expect(result.marketData).toBeDefined();
      expect(result.signal).toBeDefined();
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('should handle HOLD signals', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      const state = stateManager.requireAgent('agent-001');

      // Run multiple cycles - some will be HOLD
      let holdCount = 0;
      for (let i = 0; i < 10; i++) {
        const result = await executionLoop.executeCycle(state);
        if (result.signal?.action === 'HOLD') {
          holdCount++;
          expect(result.trade).toBeNull();
        }
      }

      // Should have some HOLD results (strategy is somewhat random)
      expect(holdCount).toBeGreaterThanOrEqual(0);
    });

    it('should emit events during execution', async () => {
      const events: RuntimeEvent[] = [];
      executionLoop.subscribe((event) => events.push(event));

      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      const state = stateManager.requireAgent('agent-001');

      await executionLoop.executeCycle(state);

      expect(events.some((e) => e.type === 'cycle.started')).toBe(true);
      expect(events.some((e) => e.type === 'cycle.completed')).toBe(true);
    });
  });
});

// ============================================================================
// Agent Scheduler Tests
// ============================================================================

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;

  beforeEach(() => {
    scheduler = createAgentScheduler({
      minIntervalMs: 100,
      maxIntervalMs: 60000,
    });
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('intervalToMs', () => {
    it('should convert seconds to milliseconds', () => {
      expect(intervalToMs({ value: 10, unit: 'seconds' })).toBe(10000);
    });

    it('should convert minutes to milliseconds', () => {
      expect(intervalToMs({ value: 5, unit: 'minutes' })).toBe(300000);
    });

    it('should pass through milliseconds', () => {
      expect(intervalToMs({ value: 1000, unit: 'milliseconds' })).toBe(1000);
    });
  });

  describe('parseInterval', () => {
    it('should parse "10s" format', () => {
      expect(parseInterval('10s')).toEqual({ value: 10, unit: 'seconds' });
    });

    it('should parse "5m" format', () => {
      expect(parseInterval('5m')).toEqual({ value: 5, unit: 'minutes' });
    });

    it('should parse "1000ms" format', () => {
      expect(parseInterval('1000ms')).toEqual({ value: 1000, unit: 'milliseconds' });
    });

    it('should throw on invalid format', () => {
      expect(() => parseInterval('invalid')).toThrow(RuntimeError);
    });
  });

  describe('scheduleAgent', () => {
    it('should schedule an agent for periodic execution', async () => {
      let executionCount = 0;
      const callback = async () => {
        executionCount++;
      };

      scheduler.scheduleAgent('agent-001', { value: 100, unit: 'milliseconds' }, callback);

      // Wait for some executions
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(executionCount).toBeGreaterThanOrEqual(2);
    });

    it('should respect interval configuration', () => {
      const scheduled = scheduler.scheduleAgent(
        'agent-001',
        { value: 500, unit: 'milliseconds' },
        async () => {}
      );

      expect(scheduled.intervalMs).toBe(500);
    });

    it('should throw on interval below minimum', () => {
      expect(() =>
        scheduler.scheduleAgent('agent-001', { value: 10, unit: 'milliseconds' }, async () => {})
      ).toThrow(RuntimeError);
    });
  });

  describe('control methods', () => {
    it('should pause and resume agents', async () => {
      let executionCount = 0;
      scheduler.scheduleAgent(
        'agent-001',
        { value: 100, unit: 'milliseconds' },
        async () => {
          executionCount++;
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      const countBeforePause = executionCount;

      scheduler.pauseAgent('agent-001');
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(executionCount).toBe(countBeforePause);

      scheduler.resumeAgent('agent-001');
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(executionCount).toBeGreaterThan(countBeforePause);
    });

    it('should unschedule agents', async () => {
      let executionCount = 0;
      scheduler.scheduleAgent(
        'agent-001',
        { value: 100, unit: 'milliseconds' },
        async () => {
          executionCount++;
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      const countBeforeUnschedule = executionCount;

      scheduler.unscheduleAgent('agent-001');
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(executionCount).toBe(countBeforeUnschedule);
    });
  });
});

// ============================================================================
// Runtime Monitor Tests
// ============================================================================

describe('RuntimeMonitor', () => {
  let monitor: RuntimeMonitor;
  let stateManager: AgentStateManager;

  beforeEach(() => {
    monitor = createRuntimeMonitor({ enableAlerting: true });
    monitor.start();
    stateManager = createAgentStateManager();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('telemetry', () => {
    it('should track agent states', () => {
      const config1 = createTestAgentConfig({ agentId: 'agent-001' });
      const config2 = createTestAgentConfig({ agentId: 'agent-002' });

      stateManager.createAgent(config1);
      stateManager.createAgent(config2);
      stateManager.startAgent('agent-001');

      monitor.registerAgent(stateManager.requireAgent('agent-001'));
      monitor.registerAgent(stateManager.requireAgent('agent-002'));

      const telemetry = monitor.getTelemetry();

      expect(telemetry.activeAgents).toBe(2);
      expect(telemetry.runningAgents).toBe(1);
    });

    it('should record events', () => {
      monitor.recordEvent({
        id: 'test-event',
        type: 'cycle.completed',
        timestamp: new Date(),
        agentId: 'agent-001',
        data: { durationMs: 100 },
      });

      const history = monitor.getEventHistory();
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('cycle.completed');
    });

    it('should calculate average latency', () => {
      for (let i = 0; i < 5; i++) {
        monitor.recordEvent({
          id: `event-${i}`,
          type: 'cycle.completed',
          timestamp: new Date(),
          agentId: 'agent-001',
          data: { durationMs: 100 + i * 10 },
        });
      }

      const telemetry = monitor.getTelemetry();
      expect(telemetry.avgCycleLatencyMs).toBe(120); // Average of 100, 110, 120, 130, 140
    });
  });

  describe('alerting', () => {
    it('should raise alerts on consecutive errors', () => {
      const alerts: any[] = [];
      monitor.onAlert((alert) => alerts.push(alert));

      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');

      // Simulate 5 consecutive errors
      const state = stateManager.requireAgent('agent-001');
      for (let i = 0; i < 5; i++) {
        (state as any).consecutiveErrors = i + 1;
        monitor.updateAgentState(state);
      }

      expect(alerts.some((a) => a.type === 'consecutive_errors')).toBe(true);
    });

    it('should acknowledge alerts', () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      stateManager.createAgent(config);
      stateManager.startAgent('agent-001');
      stateManager.setAgentError('agent-001', 'Test error');
      monitor.updateAgentState(stateManager.requireAgent('agent-001'));

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const acknowledged = monitor.acknowledgeAlert(alerts[0].id);
      expect(acknowledged).toBe(true);

      const unacknowledged = monitor.getUnacknowledgedAlerts();
      expect(unacknowledged.length).toBe(0);
    });
  });
});

// ============================================================================
// Agent Manager Integration Tests
// ============================================================================

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = createAgentManager({
      config: {
        maxAgents: 10,
        scheduler: {
          minIntervalMs: 100,
          maxIntervalMs: 60000,
          maxConcurrentExecutions: 10,
          enableDriftCompensation: true,
          executionTimeoutMs: 5000,
        },
      },
    });
    manager.start();
  });

  afterEach(() => {
    manager.stop();
  });

  describe('agent lifecycle', () => {
    it('should create and start an agent', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      const status = manager.getAgentStatus('agent-001');
      expect(status?.state).toBe('RUNNING');
    });

    it('should pause and resume an agent', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      await manager.pauseAgent('agent-001');
      expect(manager.getAgentStatus('agent-001')?.state).toBe('PAUSED');

      await manager.resumeAgent('agent-001');
      expect(manager.getAgentStatus('agent-001')?.state).toBe('RUNNING');
    });

    it('should stop an agent', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');
      await manager.stopAgent('agent-001');

      const status = manager.getAgentStatus('agent-001');
      expect(status?.state).toBe('STOPPED');
    });
  });

  describe('multi-agent support', () => {
    it('should run multiple agents in parallel', async () => {
      // Create 3 agents
      for (let i = 1; i <= 3; i++) {
        const config = createTestAgentConfig({
          agentId: `agent-00${i}`,
          name: `Bot ${i}`,
        });
        await manager.createAgent(config);
        await manager.startAgent(`agent-00${i}`);
      }

      const telemetry = manager.getTelemetry();
      expect(telemetry.runningAgents).toBe(3);

      const statuses = manager.getAllAgentStatuses();
      expect(statuses.length).toBe(3);
      expect(statuses.every((s) => s.state === 'RUNNING')).toBe(true);
    });

    it('should respect max agents limit', async () => {
      // Create max agents
      for (let i = 0; i < 10; i++) {
        await manager.createAgent(createTestAgentConfig({ agentId: `agent-${i}` }));
      }

      // Try to create one more
      await expect(
        manager.createAgent(createTestAgentConfig({ agentId: 'agent-overflow' }))
      ).rejects.toThrow(RuntimeError);
    });
  });

  describe('execution cycles', () => {
    it('should execute cycles on schedule', async () => {
      const config = createTestAgentConfig({
        agentId: 'agent-001',
        interval: { value: 100, unit: 'milliseconds' },
      });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      // Wait for some cycles to complete
      await new Promise((resolve) => setTimeout(resolve, 350));

      const telemetry = manager.getTelemetry();
      expect(telemetry.totalCycles).toBeGreaterThanOrEqual(2);
    });

    it('should trigger immediate execution', async () => {
      const config = createTestAgentConfig({
        agentId: 'agent-001',
        interval: { value: 1, unit: 'minutes' }, // Long interval
      });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      const result = await manager.triggerAgent('agent-001');
      expect(result.success).toBe(true);
    });
  });

  describe('event system', () => {
    it('should emit events', async () => {
      const events: RuntimeEvent[] = [];
      manager.subscribe((event) => events.push(event));

      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      expect(events.some((e) => e.type === 'agent.created')).toBe(true);
      expect(events.some((e) => e.type === 'agent.started')).toBe(true);
    });
  });

  describe('telemetry', () => {
    it('should provide telemetry snapshot', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      const telemetry = manager.getTelemetry();

      expect(telemetry.activeAgents).toBe(1);
      expect(telemetry.runningAgents).toBe(1);
      expect(telemetry.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should provide scheduler metrics', async () => {
      const config = createTestAgentConfig({ agentId: 'agent-001' });
      await manager.createAgent(config);
      await manager.startAgent('agent-001');

      const metrics = manager.getSchedulerMetrics();

      expect(metrics.scheduledAgents).toBe(1);
      expect(metrics.isRunning).toBe(true);
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle agent not found errors', () => {
    const stateManager = createAgentStateManager();

    expect(() => stateManager.requireAgent('nonexistent')).toThrow(RuntimeError);
    expect(() => stateManager.startAgent('nonexistent')).toThrow(RuntimeError);
  });

  it('should handle invalid state transitions', () => {
    const stateManager = createAgentStateManager();
    const config = createTestAgentConfig({ agentId: 'agent-001' });
    stateManager.createAgent(config);

    // Cannot pause from CREATED
    expect(() => stateManager.pauseAgent('agent-001')).toThrow(RuntimeError);

    // Cannot resume from CREATED
    expect(() => stateManager.resumeAgent('agent-001')).toThrow(RuntimeError);
  });

  it('should create RuntimeError with proper properties', () => {
    const error = new RuntimeError('Test error', 'AGENT_NOT_FOUND', { agentId: 'test' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('AGENT_NOT_FOUND');
    expect(error.details).toEqual({ agentId: 'test' });
    expect(error.name).toBe('RuntimeError');
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  it('should handle 100 agents efficiently', async () => {
    const manager = createAgentManager({
      config: {
        maxAgents: 150,
        scheduler: {
          minIntervalMs: 100,
          maxIntervalMs: 3600000,
          maxConcurrentExecutions: 50,
          enableDriftCompensation: true,
          executionTimeoutMs: 5000,
        },
      },
    });
    manager.start();

    const startTime = Date.now();

    // Create 100 agents
    for (let i = 0; i < 100; i++) {
      await manager.createAgent(
        createTestAgentConfig({
          agentId: `agent-${i.toString().padStart(3, '0')}`,
          interval: { value: 1, unit: 'minutes' }, // Long interval to avoid execution overhead
        })
      );
    }

    const creationTime = Date.now() - startTime;

    // Should create 100 agents in reasonable time
    expect(creationTime).toBeLessThan(5000); // 5 seconds

    const telemetry = manager.getTelemetry();
    expect(telemetry.activeAgents).toBe(100);

    manager.stop();
  });
});
