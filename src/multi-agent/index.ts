/**
 * TONAIAgent - Multi-Agent Coordination Framework
 *
 * Scalable multi-agent coordination framework enabling autonomous agents to
 * collaborate, delegate tasks, share context, and execute complex distributed
 * strategies on The Open Network.
 *
 * Features:
 * - Agent communication protocol (event-driven messaging)
 * - Role-based agent architecture (Strategist, Executor, Risk, Data, Portfolio, Coordinator)
 * - Shared memory layer with distributed state and conflict detection
 * - Delegation and task routing with priority queues
 * - Capital and risk distribution management
 * - Conflict resolution mechanisms
 * - Observability and governance controls
 *
 * @example
 * ```typescript
 * import {
 *   createSwarmCoordinator,
 *   createMessageBus,
 *   StrategistAgent,
 *   ExecutorAgent,
 *   RiskAgent,
 * } from './multi-agent';
 *
 * // Create message bus for inter-agent communication
 * const messageBus = createMessageBus();
 *
 * // Create swarm coordinator
 * const coordinator = createSwarmCoordinator({
 *   messageBus,
 *   capitalPool: 10000,
 * });
 *
 * // Add specialized agents
 * await coordinator.addAgent({
 *   role: 'strategist',
 *   capabilities: ['market_analysis', 'yield_optimization'],
 * });
 *
 * await coordinator.addAgent({
 *   role: 'executor',
 *   capabilities: ['trade_execution', 'arbitrage_execution'],
 * });
 *
 * // Start the swarm
 * await coordinator.start();
 * ```
 */

// Export types
export * from './types';

// Export communication
export { InMemoryMessageBus, createMessageBus, createMessage } from './communication';
export type {
  MessageBus,
  MessageSubscriber,
  MessageFilter,
  MessageBusStats,
  MessageBusOptions,
  CreateMessageParams,
} from './communication';

// Export agents
export {
  BaseAgent,
  StrategistAgent,
  ExecutorAgent,
  RiskAgent,
  DataAgent,
  PortfolioAgent,
  CoordinatorAgent,
} from './agents';
export type { BaseAgentInterface } from './agents';

// Export memory
export {
  InMemorySharedMemoryStore,
  createSharedMemoryStore,
  createSharedMemoryEntry,
  type SharedMemoryStats,
  type CreateSharedMemoryEntryParams,
} from './memory';

// Export delegation
export {
  PriorityTaskQueue,
  DelegationEngine,
  createTaskQueue,
  createDelegationEngine,
  createTask,
  type TaskQueueStats,
  type DelegationStats,
  type DelegationEngineOptions,
  type CreateTaskParams,
} from './delegation';

// Export resources
export {
  DefaultCapitalManager,
  createCapitalManager,
  createCapitalRequest,
  DefaultConflictResolver,
  createConflictResolver,
  type CapitalManagerOptions,
  type CreatePoolParams,
  type CapitalManagerStats,
  type CreateCapitalRequestParams,
  type ConflictResolverOptions,
  type ConflictResolverStats,
} from './resources';

// Export governance
export {
  DefaultGovernanceController,
  createGovernanceController,
  MetricsCollector,
  createMetricsCollector,
  type GovernanceControllerOptions,
  type EmergencyStopInfo,
  type GovernanceStats,
  type MetricsCollectorOptions,
  type EventHistoryFilter,
} from './governance';

// ============================================================================
// Swarm Coordinator - High-level orchestration
// ============================================================================

import {
  MultiAgentConfig,
  SwarmState,
  AgentRole,
  AgentState,
  MultiAgentEvent,
  MultiAgentMetrics,
} from './types';

import type { MessageBus } from './communication';
import { createMessageBus, InMemoryMessageBus } from './communication';
import {
  BaseAgent,
  StrategistAgent,
  ExecutorAgent,
  RiskAgent,
  DataAgent,
  PortfolioAgent,
  CoordinatorAgent,
} from './agents';
import { InMemorySharedMemoryStore, createSharedMemoryStore } from './memory';
import {
  PriorityTaskQueue,
  DelegationEngine,
  createTaskQueue,
  createDelegationEngine,
} from './delegation';
import {
  DefaultCapitalManager,
  DefaultConflictResolver,
  createCapitalManager,
  createConflictResolver,
} from './resources';
import {
  DefaultGovernanceController,
  MetricsCollector,
  createGovernanceController,
  createMetricsCollector,
} from './governance';

export interface SwarmCoordinatorConfig {
  id?: string;
  name?: string;
  userId: string;
  capitalPool?: number;
  maxAgents?: number;
  messageBus?: MessageBus;
  eventCallback?: (event: MultiAgentEvent) => void;
}

export class SwarmCoordinator {
  readonly id: string;
  readonly name: string;
  readonly userId: string;

  private messageBus: MessageBus;
  private sharedMemory: InMemorySharedMemoryStore;
  private taskQueue: PriorityTaskQueue;
  private delegationEngine: DelegationEngine;
  private capitalManager: DefaultCapitalManager;
  private conflictResolver: DefaultConflictResolver;
  private governanceController: DefaultGovernanceController;
  private metricsCollector: MetricsCollector;
  private coordinatorAgent: CoordinatorAgent;
  private agents: Map<string, BaseAgent> = new Map();
  private status: 'initializing' | 'active' | 'paused' | 'terminated' = 'initializing';
  private eventCallback?: (event: MultiAgentEvent) => void;

  constructor(config: SwarmCoordinatorConfig) {
    this.id = config.id ?? `swarm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.name = config.name ?? 'Default Swarm';
    this.userId = config.userId;
    this.eventCallback = config.eventCallback;

    // Initialize metrics collector first (needed by handleEvent)
    this.metricsCollector = createMetricsCollector();

    // Initialize message bus
    this.messageBus = config.messageBus ?? createMessageBus({
      eventCallback: this.handleEvent.bind(this),
    });

    // Initialize shared memory
    this.sharedMemory = createSharedMemoryStore(this.handleEvent.bind(this));

    // Initialize task queue and delegation
    this.taskQueue = createTaskQueue(this.handleEvent.bind(this));
    this.delegationEngine = createDelegationEngine(this.taskQueue, {
      eventCallback: this.handleEvent.bind(this),
    });

    // Initialize capital manager
    this.capitalManager = createCapitalManager({
      eventCallback: this.handleEvent.bind(this),
    });

    // Create initial capital pool
    if (config.capitalPool) {
      this.capitalManager.createPool({
        id: 'main_pool',
        totalCapital: config.capitalPool,
      });
    }

    // Initialize conflict resolver
    this.conflictResolver = createConflictResolver({
      eventCallback: this.handleEvent.bind(this),
    });

    // Initialize governance controller
    this.governanceController = createGovernanceController({
      eventCallback: this.handleEvent.bind(this),
      messageBus: this.messageBus,
    });

    // Create coordinator agent
    const coordinatorConfig: MultiAgentConfig = {
      id: `${this.id}_coordinator`,
      name: 'Swarm Coordinator',
      role: 'coordinator',
      userId: this.userId,
      capabilities: {
        canSpawnAgents: true,
        canTerminateAgents: true,
        canDelegateTask: true,
        canAccessSharedMemory: true,
        canAccessCapitalPool: true,
        maxConcurrentTasks: 100,
        supportedOperations: ['maintenance'],
        protocols: [],
      },
      permissions: {
        trading: false,
        staking: false,
        transfers: false,
        monitoring: true,
        execution: true,
        riskManagement: true,
        capitalAllocation: true,
      },
      resourceLimits: {
        maxCapitalAllocation: 0,
        maxTransactionValue: 0,
        dailyTransactionLimit: 0,
        maxActivePositions: 0,
        maxConcurrentOperations: 100,
        cpuPriority: 'high',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.coordinatorAgent = new CoordinatorAgent(
      coordinatorConfig,
      this.messageBus,
      this.handleEvent.bind(this)
    );
  }

  async start(): Promise<void> {
    if (this.status !== 'initializing') {
      throw new Error(`Cannot start swarm in ${this.status} state`);
    }

    // Start coordinator agent
    await this.coordinatorAgent.start();

    // Start all agents
    for (const [, agent] of this.agents) {
      await agent.start();
      this.coordinatorAgent.registerAgent(agent.id, agent.role);
    }

    this.status = 'active';

    this.emitEvent('swarm_created', {
      swarmId: this.id,
      agentCount: this.agents.size,
    });
  }

  async stop(): Promise<void> {
    if (this.status === 'terminated') {
      return;
    }

    this.status = 'terminated';

    // Stop all agents
    for (const [, agent] of this.agents) {
      await agent.stop();
    }

    // Stop coordinator
    await this.coordinatorAgent.stop();

    // Shutdown message bus
    if (this.messageBus instanceof InMemoryMessageBus) {
      await this.messageBus.shutdown();
    }

    this.emitEvent('swarm_terminated', {
      swarmId: this.id,
    });
  }

  async pause(): Promise<void> {
    if (this.status !== 'active') {
      throw new Error(`Cannot pause swarm in ${this.status} state`);
    }

    this.status = 'paused';

    await this.coordinatorAgent.broadcastCommand('pause', 'Swarm paused');
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume swarm in ${this.status} state`);
    }

    this.status = 'active';

    await this.coordinatorAgent.broadcastCommand('resume', 'Swarm resumed');
  }

  async addAgent(params: AddAgentParams): Promise<BaseAgent> {
    const agentId = params.id ?? `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const config: MultiAgentConfig = {
      id: agentId,
      name: params.name ?? `${params.role} Agent`,
      role: params.role,
      userId: this.userId,
      parentId: this.coordinatorAgent.id,
      capabilities: {
        canSpawnAgents: false,
        canTerminateAgents: false,
        canDelegateTask: params.role === 'strategist',
        canAccessSharedMemory: true,
        canAccessCapitalPool: ['executor', 'portfolio'].includes(params.role),
        maxConcurrentTasks: params.maxConcurrentTasks ?? 5,
        supportedOperations: params.capabilities ?? [],
        protocols: params.protocols ?? [],
      },
      permissions: {
        trading: ['executor', 'strategist'].includes(params.role),
        staking: ['executor'].includes(params.role),
        transfers: ['executor'].includes(params.role),
        monitoring: true,
        execution: ['executor'].includes(params.role),
        riskManagement: ['risk'].includes(params.role),
        capitalAllocation: ['portfolio'].includes(params.role),
      },
      resourceLimits: {
        maxCapitalAllocation: params.maxCapital ?? 1000,
        maxTransactionValue: params.maxTransaction ?? 500,
        dailyTransactionLimit: params.dailyLimit ?? 5000,
        maxActivePositions: params.maxPositions ?? 10,
        maxConcurrentOperations: params.maxConcurrentTasks ?? 5,
        cpuPriority: 'normal',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let agent: BaseAgent;

    switch (params.role) {
      case 'strategist':
        agent = new StrategistAgent(config, this.messageBus, this.handleEvent.bind(this));
        break;
      case 'executor':
        agent = new ExecutorAgent(config, this.messageBus, this.handleEvent.bind(this));
        break;
      case 'risk':
        agent = new RiskAgent(config, this.messageBus, this.handleEvent.bind(this));
        break;
      case 'data':
        agent = new DataAgent(config, this.messageBus, this.handleEvent.bind(this));
        break;
      case 'portfolio':
        agent = new PortfolioAgent(config, this.messageBus, this.handleEvent.bind(this));
        break;
      default:
        throw new Error(`Unknown agent role: ${params.role}`);
    }

    this.agents.set(agentId, agent);

    if (this.status === 'active') {
      await agent.start();
      this.coordinatorAgent.registerAgent(agent.id, agent.role);
    }

    this.emitEvent('agent_created', {
      agentId,
      role: params.role,
      swarmId: this.id,
    });

    return agent;
  }

  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    await agent.stop();
    this.coordinatorAgent.unregisterAgent(agentId);
    this.agents.delete(agentId);

    return true;
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getState(): SwarmState {
    const agentStates: AgentState[] = [];
    for (const [, agent] of this.agents) {
      agentStates.push(agent.getState());
    }

    return {
      swarmId: this.id,
      status: this.status,
      agents: agentStates,
      capital: this.capitalManager.getAllPools()[0] ?? {
        id: 'default',
        totalCapital: 0,
        availableCapital: 0,
        reservedCapital: 0,
        allocations: [],
        limits: {
          maxPerAgent: 0,
          maxPerOperation: 0,
          dailyLimit: 0,
          reserveRatio: 0.2,
          rebalanceThreshold: 0.1,
        },
        lastUpdated: new Date(),
      },
      performance: {
        totalProfitLoss: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        tasksCompleted: this.metricsCollector.getMetrics().completedTasks,
        averageTaskDuration: this.metricsCollector.getMetrics().averageTaskDuration,
        period: 'daily',
      },
      activeGoals: [],
      lastUpdated: new Date(),
    };
  }

  getMetrics(): MultiAgentMetrics {
    return this.metricsCollector.getMetrics();
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  getSharedMemory(): InMemorySharedMemoryStore {
    return this.sharedMemory;
  }

  getTaskQueue(): PriorityTaskQueue {
    return this.taskQueue;
  }

  getDelegationEngine(): DelegationEngine {
    return this.delegationEngine;
  }

  getCapitalManager(): DefaultCapitalManager {
    return this.capitalManager;
  }

  getConflictResolver(): DefaultConflictResolver {
    return this.conflictResolver;
  }

  getGovernanceController(): DefaultGovernanceController {
    return this.governanceController;
  }

  private handleEvent(event: MultiAgentEvent): void {
    // Record in metrics collector
    this.metricsCollector.recordEvent(event);

    // Forward to external callback
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  private emitEvent(
    type: MultiAgentEvent['type'],
    data: Record<string, unknown>,
    severity: MultiAgentEvent['severity'] = 'info'
  ): void {
    const event: MultiAgentEvent = {
      id: `swarm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      source: this.id,
      sourceRole: 'coordinator',
      swarmId: this.id,
      data,
      severity,
    };

    this.handleEvent(event);
  }
}

export interface AddAgentParams {
  id?: string;
  name?: string;
  role: AgentRole;
  capabilities?: string[];
  protocols?: string[];
  maxConcurrentTasks?: number;
  maxCapital?: number;
  maxTransaction?: number;
  dailyLimit?: number;
  maxPositions?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSwarmCoordinator(
  config: SwarmCoordinatorConfig
): SwarmCoordinator {
  return new SwarmCoordinator(config);
}
