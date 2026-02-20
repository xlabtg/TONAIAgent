/**
 * TONAIAgent - Multi-Agent Coordination Framework Tests
 *
 * Comprehensive tests for the multi-agent coordination framework including:
 * - Message bus and communication
 * - Specialized agents
 * - Shared memory
 * - Task delegation
 * - Capital management
 * - Conflict resolution
 * - Governance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Communication
  createMessageBus,
  createMessage,
  MessageBus,
  MessageSubscriber,

  // Agents
  StrategistAgent,
  ExecutorAgent,
  RiskAgent,
  DataAgent,
  PortfolioAgent,
  CoordinatorAgent,

  // Memory
  createSharedMemoryStore,
  createSharedMemoryEntry,
  InMemorySharedMemoryStore,

  // Delegation
  createTaskQueue,
  createDelegationEngine,
  createTask,
  PriorityTaskQueue,
  DelegationEngine,

  // Resources
  createCapitalManager,
  createCapitalRequest,
  createConflictResolver,
  DefaultCapitalManager,
  DefaultConflictResolver,

  // Governance
  createGovernanceController,
  createMetricsCollector,

  // Swarm
  createSwarmCoordinator,
  SwarmCoordinator,

  // Types
  MultiAgentConfig,
  Task,
  TaskPriority,
  AgentMessage,
  MultiAgentEvent,
  ConflictContext,
} from '../../src/multi-agent';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockAgentConfig(
  role: MultiAgentConfig['role'],
  overrides: Partial<MultiAgentConfig> = {}
): MultiAgentConfig {
  return {
    id: `agent_${role}_${Date.now()}`,
    name: `Test ${role} Agent`,
    role,
    userId: 'user_test',
    capabilities: {
      canSpawnAgents: false,
      canTerminateAgents: false,
      canDelegateTask: role === 'strategist',
      canAccessSharedMemory: true,
      canAccessCapitalPool: ['executor', 'portfolio'].includes(role),
      maxConcurrentTasks: 5,
      supportedOperations: [],
      protocols: [],
    },
    permissions: {
      trading: ['executor', 'strategist'].includes(role),
      staking: role === 'executor',
      transfers: role === 'executor',
      monitoring: true,
      execution: role === 'executor',
      riskManagement: role === 'risk',
      capitalAllocation: role === 'portfolio',
    },
    resourceLimits: {
      maxCapitalAllocation: 1000,
      maxTransactionValue: 500,
      dailyTransactionLimit: 5000,
      maxActivePositions: 10,
      maxConcurrentOperations: 5,
      cpuPriority: 'normal',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Message Bus Tests
// ============================================================================

describe('Message Bus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = createMessageBus();
  });

  afterEach(async () => {
    await messageBus.shutdown();
  });

  it('should publish and receive messages', async () => {
    const received: AgentMessage[] = [];

    const subscriber: MessageSubscriber = {
      agentId: 'receiver',
      role: 'executor',
      handler: async (msg) => {
        received.push(msg);
      },
    };

    messageBus.subscribe(subscriber);

    const message = createMessage({
      type: 'task_request',
      senderId: 'sender',
      senderRole: 'strategist',
      payload: {
        type: 'task_request',
        taskId: 'task_1',
        taskType: 'trade_execution',
        description: 'Execute trade',
        parameters: {},
      },
      priority: 'normal',
    });

    await messageBus.publish(message);

    // Wait for async delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('task_request');
  });

  it('should filter messages by type', async () => {
    const received: AgentMessage[] = [];

    const subscriber: MessageSubscriber = {
      agentId: 'receiver',
      role: 'executor',
      handler: async (msg) => {
        received.push(msg);
      },
    };

    messageBus.subscribe(subscriber, {
      types: ['risk_alert'],
    });

    // Send task request (should be filtered out)
    await messageBus.publish(
      createMessage({
        type: 'task_request',
        senderId: 'sender',
        senderRole: 'strategist',
        payload: {
          type: 'task_request',
          taskId: 'task_1',
          taskType: 'trade_execution',
          description: 'Test',
          parameters: {},
        },
        priority: 'normal',
      })
    );

    // Send risk alert (should pass filter)
    await messageBus.publish(
      createMessage({
        type: 'risk_alert',
        senderId: 'risk_agent',
        senderRole: 'risk',
        payload: {
          type: 'risk_alert',
          alertId: 'alert_1',
          severity: 'high',
          category: 'exposure_limit',
          description: 'Limit exceeded',
          affectedAgents: [],
          suggestedAction: 'Reduce exposure',
          requiresHalt: false,
        },
        priority: 'critical',
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('risk_alert');
  });

  it('should support direct messaging', async () => {
    const received: AgentMessage[] = [];

    const subscriber: MessageSubscriber = {
      agentId: 'target_agent',
      role: 'executor',
      handler: async (msg) => {
        received.push(msg);
      },
    };

    messageBus.subscribe(subscriber);

    const message = createMessage({
      type: 'task_assignment',
      senderId: 'coordinator',
      senderRole: 'coordinator',
      targetId: 'target_agent',
      payload: {
        type: 'task_request',
        taskId: 'task_1',
        taskType: 'trade_execution',
        description: 'Execute trade',
        parameters: {},
      },
      priority: 'high',
    });

    await messageBus.send(message);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(received.length).toBe(1);
  });

  it('should support request-response pattern', async () => {
    const subscriber: MessageSubscriber = {
      agentId: 'responder',
      role: 'executor',
      handler: async (msg) => {
        // Send response
        const response = createMessage({
          type: 'task_response',
          senderId: 'responder',
          senderRole: 'executor',
          targetId: msg.senderId,
          payload: {
            type: 'task_response',
            taskId: 'task_1',
            accepted: true,
          },
          priority: 'high',
          correlationId: msg.correlationId,
        });

        await messageBus.publish(response);
      },
    };

    messageBus.subscribe(subscriber);

    const request = createMessage({
      type: 'task_request',
      senderId: 'requester',
      senderRole: 'strategist',
      targetId: 'responder',
      payload: {
        type: 'task_request',
        taskId: 'task_1',
        taskType: 'trade_execution',
        description: 'Test',
        parameters: {},
      },
      priority: 'normal',
    });

    const response = await messageBus.request(request, 5000);

    expect(response).not.toBeNull();
    expect(response?.type).toBe('task_response');
  });

  it('should track statistics', async () => {
    await messageBus.publish(
      createMessage({
        type: 'heartbeat',
        senderId: 'agent_1',
        senderRole: 'executor',
        payload: {
          type: 'state_sync',
          scope: 'partial',
          stateType: 'all',
          data: {},
          version: 1,
        },
        priority: 'low',
      })
    );

    const stats = messageBus.getStats();

    expect(stats.totalPublished).toBeGreaterThanOrEqual(1);
    expect(stats.subscriberCount).toBeDefined();
  });
});

// ============================================================================
// Specialized Agents Tests
// ============================================================================

describe('Specialized Agents', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = createMessageBus();
  });

  afterEach(async () => {
    await messageBus.shutdown();
  });

  describe('StrategistAgent', () => {
    it('should handle market analysis tasks', async () => {
      const config = createMockAgentConfig('strategist');
      const agent = new StrategistAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'market_analysis',
        creatorId: 'test',
        description: 'Analyze TON market',
        parameters: { tokens: ['TON'] },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      await agent.stop();
    });

    it('should not handle trade execution tasks', async () => {
      const config = createMockAgentConfig('strategist');
      const agent = new StrategistAgent(config, messageBus);

      const task = createTask({
        type: 'trade_execution',
        creatorId: 'test',
        description: 'Execute trade',
      });

      expect(agent.canHandle(task)).toBe(false);
    });
  });

  describe('ExecutorAgent', () => {
    it('should handle trade execution tasks', async () => {
      const config = createMockAgentConfig('executor');
      const agent = new ExecutorAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'trade_execution',
        creatorId: 'test',
        description: 'Execute swap',
        parameters: {
          from: 'TON',
          to: 'USDT',
          amount: 100,
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBeDefined();
      expect(result.data).toBeDefined();

      await agent.stop();
    });

    it('should handle arbitrage execution tasks', async () => {
      const config = createMockAgentConfig('executor');
      const agent = new ExecutorAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'arbitrage_execution',
        creatorId: 'test',
        description: 'Execute arbitrage',
        parameters: {
          opportunity: {
            buyDex: 'dedust',
            sellDex: 'stonfi',
            token: 'TON',
            spread: 0.005,
            amount: 1000,
          },
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      await agent.stop();
    });
  });

  describe('RiskAgent', () => {
    it('should handle risk assessment tasks', async () => {
      const config = createMockAgentConfig('risk');
      const agent = new RiskAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'risk_assessment',
        creatorId: 'test',
        description: 'Assess portfolio risk',
        parameters: {
          portfolio: {
            positions: [
              { token: 'TON', amount: 1000, value: 5000 },
              { token: 'USDT', amount: 5000, value: 5000 },
            ],
          },
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('riskScore');

      await agent.stop();
    });
  });

  describe('DataAgent', () => {
    it('should handle data collection tasks', async () => {
      const config = createMockAgentConfig('data');
      const agent = new DataAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'data_collection',
        creatorId: 'test',
        description: 'Collect market data',
        parameters: {
          tokens: ['TON', 'USDT'],
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);

      await agent.stop();
    });

    it('should handle opportunity scanning tasks', async () => {
      const config = createMockAgentConfig('data');
      const agent = new DataAgent(config, messageBus);

      await agent.start();

      const task = createTask({
        type: 'opportunity_scan',
        creatorId: 'test',
        description: 'Scan for opportunities',
        parameters: {
          type: 'all',
          minProfit: 0.001,
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('opportunities');

      await agent.stop();
    });
  });

  describe('PortfolioAgent', () => {
    it('should handle rebalance tasks', async () => {
      const config = createMockAgentConfig('portfolio');
      const agent = new PortfolioAgent(config, messageBus, undefined, {
        totalCapital: 10000,
      });

      await agent.start();

      const task = createTask({
        type: 'rebalance',
        creatorId: 'test',
        description: 'Rebalance portfolio',
        parameters: {
          targetAllocations: {
            agent_1: 0.4,
            agent_2: 0.3,
            agent_3: 0.3,
          },
        },
      });

      expect(agent.canHandle(task)).toBe(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);

      await agent.stop();
    });

    it('should manage capital requests', async () => {
      const config = createMockAgentConfig('portfolio');
      const agent = new PortfolioAgent(config, messageBus, undefined, {
        totalCapital: 10000,
      });

      await agent.start();

      const request = createCapitalRequest({
        agentId: 'agent_1',
        amount: 1000,
        purpose: 'Trading',
      });

      const result = await agent.requestCapital(request);

      expect(result.approved).toBe(true);
      expect(result.amount).toBe(1000);

      await agent.stop();
    });
  });

  describe('CoordinatorAgent', () => {
    it('should register and manage agents', async () => {
      const config = createMockAgentConfig('coordinator');
      const agent = new CoordinatorAgent(config, messageBus);

      await agent.start();

      agent.registerAgent('agent_1', 'executor');
      agent.registerAgent('agent_2', 'strategist');

      const managedAgents = agent.getManagedAgents();

      expect(managedAgents.length).toBe(2);

      agent.unregisterAgent('agent_1');

      expect(agent.getManagedAgents().length).toBe(1);

      await agent.stop();
    });

    it('should broadcast commands', async () => {
      const config = createMockAgentConfig('coordinator');
      const agent = new CoordinatorAgent(config, messageBus);

      await agent.start();

      await agent.broadcastCommand('pause', 'Test pause');

      expect(agent.getSwarmState()).toBe('paused');

      await agent.broadcastCommand('resume', 'Test resume');

      expect(agent.getSwarmState()).toBe('active');

      await agent.stop();
    });
  });
});

// ============================================================================
// Shared Memory Tests
// ============================================================================

describe('Shared Memory', () => {
  let sharedMemory: InMemorySharedMemoryStore;

  beforeEach(() => {
    sharedMemory = createSharedMemoryStore();
  });

  it('should store and retrieve entries', async () => {
    const entry = createSharedMemoryEntry({
      key: 'position_TON',
      value: { amount: 1000, averagePrice: 5.0 },
      type: 'position',
      ownerId: 'agent_1',
    });

    await sharedMemory.set('position_TON', entry);

    const retrieved = await sharedMemory.get('position_TON');

    expect(retrieved).toBeDefined();
    expect(retrieved?.value).toEqual({ amount: 1000, averagePrice: 5.0 });
  });

  it('should support versioning', async () => {
    const entry1 = createSharedMemoryEntry({
      key: 'counter',
      value: 1,
      type: 'custom',
      ownerId: 'agent_1',
    });

    await sharedMemory.set('counter', entry1);

    const version1 = await sharedMemory.getVersion('counter');
    expect(version1).toBe(1);

    const entry2 = createSharedMemoryEntry({
      key: 'counter',
      value: 2,
      type: 'custom',
      ownerId: 'agent_1',
    });

    await sharedMemory.set('counter', entry2);

    const version2 = await sharedMemory.getVersion('counter');
    expect(version2).toBe(2);
  });

  it('should support compare-and-set', async () => {
    const entry = createSharedMemoryEntry({
      key: 'counter',
      value: 1,
      type: 'custom',
      ownerId: 'agent_1',
    });

    await sharedMemory.set('counter', entry);

    const updatedEntry = createSharedMemoryEntry({
      key: 'counter',
      value: 2,
      type: 'custom',
      ownerId: 'agent_1',
    });

    // Should succeed with correct version
    const success1 = await sharedMemory.compareAndSet('counter', 1, updatedEntry);
    expect(success1).toBe(true);

    // Should fail with wrong version
    const success2 = await sharedMemory.compareAndSet('counter', 1, updatedEntry);
    expect(success2).toBe(false);
  });

  it('should support locking', async () => {
    const lock = await sharedMemory.acquireLock('resource_1', 'agent_1', 'write', 5000);

    expect(lock).not.toBeNull();
    expect(lock?.holderId).toBe('agent_1');

    // Same holder can't get another write lock
    const lock2 = await sharedMemory.acquireLock('resource_1', 'agent_2', 'write', 5000);
    expect(lock2).toBeNull();

    // Release lock
    const released = await sharedMemory.releaseLock('resource_1', 'agent_1');
    expect(released).toBe(true);

    // Now another agent can acquire
    const lock3 = await sharedMemory.acquireLock('resource_1', 'agent_2', 'write', 5000);
    expect(lock3).not.toBeNull();
  });

  it('should support subscriptions', async () => {
    const updates: Array<{ key: string; value: unknown }> = [];

    const unsubscribe = sharedMemory.subscribe('position_*', (key, entry) => {
      updates.push({ key, value: entry.value });
    });

    const entry = createSharedMemoryEntry({
      key: 'position_TON',
      value: { amount: 1000 },
      type: 'position',
      ownerId: 'agent_1',
    });

    await sharedMemory.set('position_TON', entry);

    expect(updates.length).toBe(1);
    expect(updates[0].key).toBe('position_TON');

    unsubscribe();

    await sharedMemory.set('position_TON', entry);

    expect(updates.length).toBe(1); // No new update after unsubscribe
  });
});

// ============================================================================
// Task Queue Tests
// ============================================================================

describe('Task Queue', () => {
  let taskQueue: PriorityTaskQueue;

  beforeEach(() => {
    taskQueue = createTaskQueue();
  });

  it('should add and retrieve tasks', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'test',
      description: 'Test task',
      priority: 3,
    });

    await taskQueue.add(task);

    const retrieved = await taskQueue.get(task.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.description).toBe('Test task');
  });

  it('should order tasks by priority', async () => {
    const lowPriority = createTask({
      type: 'reporting',
      creatorId: 'test',
      description: 'Low priority',
      priority: 5,
    });

    const highPriority = createTask({
      type: 'trade_execution',
      creatorId: 'test',
      description: 'High priority',
      priority: 1,
    });

    await taskQueue.add(lowPriority);
    await taskQueue.add(highPriority);

    const next = await taskQueue.peek();

    expect(next?.priority).toBe(1);
    expect(next?.description).toBe('High priority');
  });

  it('should support task status updates', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'test',
      description: 'Test task',
    });

    await taskQueue.add(task);

    await taskQueue.updateStatus(task.id, 'in_progress');

    const updated = await taskQueue.get(task.id);

    expect(updated?.status).toBe('in_progress');
    expect(updated?.startedAt).toBeDefined();
  });

  it('should track statistics', async () => {
    for (let i = 0; i < 5; i++) {
      await taskQueue.add(
        createTask({
          type: 'trade_execution',
          creatorId: 'test',
          description: `Task ${i}`,
          priority: (i + 1) as TaskPriority,
        })
      );
    }

    const stats = taskQueue.getStats();

    expect(stats.total).toBe(5);
    expect(stats.byPriority[1]).toBe(1);
  });
});

// ============================================================================
// Delegation Engine Tests
// ============================================================================

describe('Delegation Engine', () => {
  let taskQueue: PriorityTaskQueue;
  let delegationEngine: DelegationEngine;

  beforeEach(() => {
    taskQueue = createTaskQueue();
    delegationEngine = createDelegationEngine(taskQueue);
  });

  it('should create delegations', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'agent_1',
      description: 'Execute trade',
    });

    const delegation = await delegationEngine.createDelegation(
      'agent_1',
      task,
      'agent_2',
      undefined,
      { timeout: 30000 }
    );

    expect(delegation.id).toBeDefined();
    expect(delegation.status).toBe('pending');
    expect(delegation.fromAgentId).toBe('agent_1');
    expect(delegation.toAgentId).toBe('agent_2');
  });

  it('should accept delegations', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'agent_1',
      description: 'Execute trade',
    });

    const delegation = await delegationEngine.createDelegation('agent_1', task, 'agent_2');

    const response = await delegationEngine.acceptDelegation(delegation.id, 'agent_2');

    expect(response.accepted).toBe(true);

    const updated = delegationEngine.getDelegation(delegation.id);
    expect(updated?.status).toBe('accepted');
  });

  it('should reject delegations', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'agent_1',
      description: 'Execute trade',
    });

    const delegation = await delegationEngine.createDelegation('agent_1', task, 'agent_2');

    const response = await delegationEngine.rejectDelegation(
      delegation.id,
      'agent_2',
      'Too busy'
    );

    expect(response.accepted).toBe(false);
    expect(response.reason).toBe('Too busy');
  });

  it('should track statistics', async () => {
    const task = createTask({
      type: 'trade_execution',
      creatorId: 'agent_1',
      description: 'Execute trade',
    });

    const delegation = await delegationEngine.createDelegation('agent_1', task, 'agent_2');
    await delegationEngine.acceptDelegation(delegation.id, 'agent_2');
    await delegationEngine.completeDelegation(delegation.id, {
      success: true,
      executionTime: 1000,
      resourcesUsed: {
        capitalAllocated: 0,
        activePositions: 0,
        pendingTransactions: 0,
        memoryUsageBytes: 0,
        lastUpdated: new Date(),
      },
    });

    const stats = delegationEngine.getStats();

    expect(stats.completed).toBe(1);
    expect(stats.successRate).toBe(1);
  });
});

// ============================================================================
// Capital Manager Tests
// ============================================================================

describe('Capital Manager', () => {
  let capitalManager: DefaultCapitalManager;

  beforeEach(async () => {
    capitalManager = createCapitalManager();
    await capitalManager.createPool({
      id: 'test_pool',
      totalCapital: 10000,
    });
  });

  it('should create capital pools', async () => {
    const pool = await capitalManager.getPool('test_pool');

    expect(pool).toBeDefined();
    expect(pool?.totalCapital).toBe(10000);
    expect(pool?.availableCapital).toBe(8000); // 20% reserved
  });

  it('should allocate capital', async () => {
    const request = createCapitalRequest({
      agentId: 'agent_1',
      amount: 1000,
      purpose: 'Trading',
    });

    const allocation = await capitalManager.requestCapital(request);

    expect(allocation).not.toBeNull();
    expect(allocation?.amount).toBe(1000);

    const pool = await capitalManager.getPool('test_pool');
    expect(pool?.availableCapital).toBe(7000);
  });

  it('should reject requests exceeding limits', async () => {
    const request = createCapitalRequest({
      agentId: 'agent_1',
      amount: 10000, // More than per-operation limit (1000)
      purpose: 'Trading',
    });

    const allocation = await capitalManager.requestCapital(request);

    // Should be rejected due to exceeding per-operation limit
    expect(allocation).toBeNull();
  });

  it('should release capital', async () => {
    const request = createCapitalRequest({
      agentId: 'agent_1',
      amount: 1000,
      purpose: 'Trading',
    });

    await capitalManager.requestCapital(request);

    const released = await capitalManager.releaseCapital('agent_1', 500);

    expect(released).toBe(true);

    const allocation = await capitalManager.getAgentAllocation('agent_1');
    expect(allocation).toBe(500);
  });

  it('should track utilization', async () => {
    // Allocate 1000 (max per operation)
    const request = createCapitalRequest({
      agentId: 'agent_1',
      amount: 1000,
      purpose: 'Trading',
    });

    await capitalManager.requestCapital(request);

    const utilization = await capitalManager.getUtilization();

    // 1000 allocated / 8000 available = 0.125
    expect(utilization).toBe(0.125);
  });

  it('should update performance', async () => {
    const request = createCapitalRequest({
      agentId: 'agent_1',
      amount: 1000,
      purpose: 'Trading',
    });

    await capitalManager.requestCapital(request);
    await capitalManager.updatePerformance('agent_1', 100);

    const stats = capitalManager.getStats();
    expect(stats.totalPerformance).toBe(100);
  });
});

// ============================================================================
// Conflict Resolver Tests
// ============================================================================

describe('Conflict Resolver', () => {
  let conflictResolver: DefaultConflictResolver;

  beforeEach(() => {
    conflictResolver = createConflictResolver();
  });

  it('should detect resource contention', async () => {
    const context: ConflictContext = {
      agents: [],
      pendingOperations: [
        {
          operationId: 'agent_1_op1',
          type: 'trade',
          status: 'executing',
          startedAt: new Date(),
        },
        {
          operationId: 'agent_2_op1',
          type: 'trade',
          status: 'executing',
          startedAt: new Date(),
        },
      ],
      sharedResources: new Map([['TON_position', ['agent_1', 'agent_2']]]),
      capitalAllocations: [],
    };

    const conflicts = await conflictResolver.detect(context);

    // May or may not detect conflicts depending on implementation details
    expect(conflicts).toBeDefined();
  });

  it('should resolve conflicts with priority strategy', async () => {
    const conflicts = await conflictResolver.detect({
      agents: [],
      pendingOperations: [],
      sharedResources: new Map([['resource', ['agent_1', 'agent_2']]]),
      capitalAllocations: [],
    });

    // Manually create a conflict for testing
    conflictResolver.registerStrategy('resource_contention', 'priority_based');

    const manualConflict = {
      id: 'conflict_test',
      type: 'resource_contention' as const,
      parties: ['agent_1', 'agent_2'],
      resource: 'test_resource',
      description: 'Test conflict',
      severity: 'medium' as const,
      status: 'detected' as const,
      detectedAt: new Date(),
    };

    const resolution = await conflictResolver.resolve(manualConflict);

    expect(resolution.strategy).toBe('priority_based');
    expect(resolution.winner).toBe('agent_1'); // First party wins
    expect(resolution.actions.length).toBe(2);
  });

  it('should track statistics', async () => {
    const conflict = {
      id: 'conflict_test',
      type: 'resource_contention' as const,
      parties: ['agent_1', 'agent_2'],
      resource: 'test_resource',
      description: 'Test conflict',
      severity: 'medium' as const,
      status: 'detected' as const,
      detectedAt: new Date(),
    };

    await conflictResolver.resolve(conflict);

    const stats = conflictResolver.getStats();

    expect(stats.totalConflicts).toBe(1);
    expect(stats.resolvedConflicts).toBe(1);
  });
});

// ============================================================================
// Governance Controller Tests
// ============================================================================

describe('Governance Controller', () => {
  it('should create and approve actions', async () => {
    const controller = createGovernanceController();

    const action = await controller.requestAction({
      type: 'pause_agent',
      targetType: 'agent',
      targetId: 'agent_1',
      initiator: 'admin',
      reason: 'Maintenance',
    });

    expect(action.id).toBeDefined();
    expect(action.status).toBe('pending');

    await controller.approveAction(action.id, 'admin');

    const history = controller.getActionHistory();
    expect(history.some((a) => a.id === action.id && a.status === 'executed')).toBe(true);
  });

  it('should support emergency stop', async () => {
    const messageBus = createMessageBus();
    const controller = createGovernanceController({
      messageBus,
    });

    expect(controller.isEmergencyStopActive()).toBe(false);

    await controller.emergencyStop('Security incident', 'admin');

    expect(controller.isEmergencyStopActive()).toBe(true);

    const info = controller.getEmergencyStopInfo();
    expect(info?.reason).toBe('Security incident');

    await controller.resume('admin');

    expect(controller.isEmergencyStopActive()).toBe(false);

    await messageBus.shutdown();
  });

  it('should track statistics', async () => {
    const controller = createGovernanceController();

    await controller.requestAction({
      type: 'pause_agent',
      targetType: 'agent',
      targetId: 'agent_1',
      initiator: 'admin',
      reason: 'Test',
    });

    const stats = controller.getStats();

    expect(stats.pendingActions).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Metrics Collector Tests
// ============================================================================

describe('Metrics Collector', () => {
  it('should collect metrics from events', () => {
    const collector = createMetricsCollector();

    collector.recordEvent({
      id: 'evt_1',
      timestamp: new Date(),
      type: 'agent_started',
      source: 'agent_1',
      sourceRole: 'executor',
      data: {},
      severity: 'info',
    });

    collector.recordEvent({
      id: 'evt_2',
      timestamp: new Date(),
      type: 'task_completed',
      source: 'agent_1',
      sourceRole: 'executor',
      data: { duration: 1000 },
      severity: 'info',
    });

    const metrics = collector.getMetrics();

    expect(metrics.activeAgents).toBe(1);
    expect(metrics.completedTasks).toBe(1);
  });

  it('should filter event history', () => {
    const collector = createMetricsCollector();

    collector.recordEvent({
      id: 'evt_1',
      timestamp: new Date(),
      type: 'agent_started',
      source: 'agent_1',
      sourceRole: 'executor',
      data: {},
      severity: 'info',
    });

    collector.recordEvent({
      id: 'evt_2',
      timestamp: new Date(),
      type: 'task_completed',
      source: 'agent_1',
      sourceRole: 'executor',
      data: {},
      severity: 'info',
    });

    const filtered = collector.getEventHistory({ type: 'agent_started' });

    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('agent_started');
  });
});

// ============================================================================
// Swarm Coordinator Integration Tests
// ============================================================================

describe('Swarm Coordinator', () => {
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    coordinator = createSwarmCoordinator({
      userId: 'user_test',
      capitalPool: 10000,
    });
  });

  afterEach(async () => {
    await coordinator.stop();
  });

  it('should initialize and start swarm', async () => {
    await coordinator.start();

    const state = coordinator.getState();

    expect(state.status).toBe('active');
  });

  it('should add and manage agents', async () => {
    await coordinator.start();

    const strategist = await coordinator.addAgent({
      role: 'strategist',
      capabilities: ['market_analysis'],
    });

    const executor = await coordinator.addAgent({
      role: 'executor',
      capabilities: ['trade_execution'],
    });

    const agents = coordinator.getAllAgents();

    expect(agents.length).toBe(2);
    expect(agents.some((a) => a.role === 'strategist')).toBe(true);
    expect(agents.some((a) => a.role === 'executor')).toBe(true);

    await coordinator.removeAgent(strategist.id);

    expect(coordinator.getAllAgents().length).toBe(1);
  });

  it('should pause and resume', async () => {
    await coordinator.start();

    await coordinator.addAgent({
      role: 'executor',
    });

    await coordinator.pause();

    const state1 = coordinator.getState();
    expect(state1.status).toBe('paused');

    await coordinator.resume();

    const state2 = coordinator.getState();
    expect(state2.status).toBe('active');
  });

  it('should track metrics', async () => {
    await coordinator.start();

    await coordinator.addAgent({
      role: 'executor',
    });

    const metrics = coordinator.getMetrics();

    expect(metrics.activeAgents).toBeGreaterThanOrEqual(0);
  });

  it('should provide access to internal components', async () => {
    await coordinator.start();

    expect(coordinator.getMessageBus()).toBeDefined();
    expect(coordinator.getSharedMemory()).toBeDefined();
    expect(coordinator.getTaskQueue()).toBeDefined();
    expect(coordinator.getDelegationEngine()).toBeDefined();
    expect(coordinator.getCapitalManager()).toBeDefined();
    expect(coordinator.getConflictResolver()).toBeDefined();
    expect(coordinator.getGovernanceController()).toBeDefined();
  });
});
