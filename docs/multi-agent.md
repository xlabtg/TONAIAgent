# TONAIAgent - Multi-Agent Coordination Framework

## Overview

The Multi-Agent Coordination Framework enables autonomous agents to collaborate, delegate tasks, share context, and execute complex distributed strategies on The Open Network (TON). This framework provides a scalable foundation for swarm intelligence and coordinated autonomous operations.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [Agent Communication Protocol](#agent-communication-protocol)
4. [Agent Roles](#agent-roles)
5. [Shared Memory Layer](#shared-memory-layer)
6. [Delegation and Task Routing](#delegation-and-task-routing)
7. [Capital and Risk Distribution](#capital-and-risk-distribution)
8. [Conflict Resolution](#conflict-resolution)
9. [Observability and Governance](#observability-and-governance)
10. [Getting Started](#getting-started)
11. [API Reference](#api-reference)

---

## Architecture

The Multi-Agent Coordination Framework follows a hierarchical architecture with specialized agents coordinated by a SwarmCoordinator:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Swarm Coordinator                          │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────────────┐ │
│  │ Message Bus │ │ Task Queue  │ │ Governance Controller      │ │
│  └─────────────┘ └─────────────┘ └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Strategist  │    │   Executor    │    │     Risk      │
│     Agent     │    │     Agent     │    │     Agent     │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Planning    │    │ • Execution   │    │ • Assessment  │
│ • Analysis    │    │ • Positions   │    │ • Limits      │
│ • Delegation  │    │ • Arbitrage   │    │ • Alerts      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│     Data      │    │   Portfolio   │    │  Coordinator  │
│     Agent     │    │     Agent     │    │     Agent     │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Collection  │    │ • Allocation  │    │ • Lifecycle   │
│ • Scanning    │    │ • Rebalancing │    │ • Health      │
│ • Signals     │    │ • Performance │    │ • Commands    │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Core Components

### SwarmCoordinator

The central orchestration component that manages the entire multi-agent system:

```typescript
import { createSwarmCoordinator } from '@tonaiagent/core';

const swarm = createSwarmCoordinator({
  userId: 'user_123',
  capitalPool: 10000,
  eventCallback: (event) => console.log(event),
});

// Add specialized agents
await swarm.addAgent({ role: 'strategist' });
await swarm.addAgent({ role: 'executor' });
await swarm.addAgent({ role: 'risk' });

// Start the swarm
await swarm.start();
```

### Message Bus

Event-driven messaging system for inter-agent communication:

```typescript
import { createMessageBus, createMessage } from '@tonaiagent/core';

const messageBus = createMessageBus();

// Subscribe to messages
messageBus.subscribe(
  async (message) => {
    console.log('Received:', message);
  },
  { type: 'task_request' }
);

// Publish a message
await messageBus.publish(createMessage({
  type: 'task_request',
  senderId: 'agent_1',
  senderRole: 'strategist',
  targetRole: 'executor',
  payload: {
    type: 'task_request',
    taskType: 'trade_execution',
    taskId: 'task_123',
    priority: 1,
    parameters: { token: 'TON', amount: 100 },
  },
  priority: 'high',
}));
```

### Shared Memory Store

Distributed state management with versioning and locking:

```typescript
import { createSharedMemoryStore, createSharedMemoryEntry } from '@tonaiagent/core';

const sharedMemory = createSharedMemoryStore();

// Store data
await sharedMemory.set('market:TON', createSharedMemoryEntry({
  ownerId: 'data_agent_1',
  scope: 'shared',
  data: { price: 5.2, volume: 1000000 },
  ttlMs: 60000,
}));

// Read data
const entry = await sharedMemory.get('market:TON');

// Acquire lock for updates
const lock = await sharedMemory.acquireLock('market:TON', 'agent_1', 'write', 5000);
if (lock) {
  // Perform update with compare-and-set
  const success = await sharedMemory.compareAndSet('market:TON', entry.version, newEntry);
  await sharedMemory.releaseLock('market:TON', 'agent_1');
}
```

---

## Agent Communication Protocol

### Message Types

| Type | Description | Typical Sender | Typical Target |
|------|-------------|----------------|----------------|
| `task_request` | Request task execution | Strategist | Executor |
| `task_response` | Task completion result | Executor | Strategist |
| `risk_alert` | Risk threshold breach | Risk | All |
| `state_sync` | State synchronization | Any | Coordinator |
| `control_command` | Agent control (pause/resume) | Coordinator | Any |
| `execution_report` | Operation completion | Executor | Strategist |
| `performance_update` | Metrics update | Any | Coordinator |
| `delegation_request` | Task delegation | Strategist | Any |
| `delegation_response` | Delegation acceptance | Any | Strategist |
| `heartbeat` | Liveness check | All | Coordinator |

### Message Priority

Messages can be sent with priority levels:
- `critical` - Emergency operations, immediate processing
- `high` - Important tasks, quick processing
- `normal` - Standard operations
- `low` - Background tasks, can be delayed

---

## Agent Roles

### Strategist Agent

Generates high-level plans and coordinates strategy execution.

**Capabilities:**
- Market analysis
- Yield optimization
- Rebalancing strategies
- Report generation

```typescript
const strategist = await swarm.addAgent({
  role: 'strategist',
  capabilities: ['market_analysis', 'yield_optimization'],
});
```

### Executor Agent

Executes transactions and manages positions.

**Capabilities:**
- Trade execution
- Position management
- Arbitrage execution
- Transaction monitoring

```typescript
const executor = await swarm.addAgent({
  role: 'executor',
  capabilities: ['trade_execution', 'arbitrage_execution'],
  maxCapital: 5000,
  maxTransaction: 1000,
});
```

### Risk Agent

Monitors exposure and enforces limits.

**Capabilities:**
- Risk assessment
- Limit enforcement
- Alert generation
- Exposure monitoring

```typescript
const risk = await swarm.addAgent({
  role: 'risk',
  capabilities: ['risk_assessment'],
});
```

### Data Agent

Collects and processes market signals.

**Capabilities:**
- Data collection
- Opportunity scanning
- Signal generation
- Market monitoring

```typescript
const data = await swarm.addAgent({
  role: 'data',
  capabilities: ['data_collection', 'opportunity_scan'],
});
```

### Portfolio Agent

Coordinates capital allocation across agents.

**Capabilities:**
- Capital allocation
- Portfolio rebalancing
- Performance tracking

```typescript
const portfolio = await swarm.addAgent({
  role: 'portfolio',
  maxCapital: 10000,
});
```

### Coordinator Agent

Orchestrates swarm behavior and agent lifecycle.

**Capabilities:**
- Agent spawning/termination
- Health monitoring
- Command broadcasting
- Swarm coordination

The Coordinator Agent is automatically created by the SwarmCoordinator.

---

## Shared Memory Layer

### Memory Scopes

| Scope | Description |
|-------|-------------|
| `private` | Only accessible by the owner agent |
| `shared` | Accessible by all agents in the swarm |
| `restricted` | Accessible by specified agents only |

### Conflict Detection

The shared memory layer uses optimistic locking with versioning:

1. **Version Tracking**: Each entry has a monotonically increasing version
2. **Compare-and-Set**: Updates must specify expected version
3. **Lock Acquisition**: Explicit read/write locks with TTL
4. **Subscription**: Real-time notifications on changes

---

## Delegation and Task Routing

### Task Queue

Priority-based task queue with dynamic assignment:

```typescript
import { createTaskQueue, createTask } from '@tonaiagent/core';

const taskQueue = createTaskQueue();

// Add a task
const task = createTask({
  type: 'trade_execution',
  priority: 1,
  creatorId: 'strategist_1',
  description: 'Execute TON trade',
  parameters: { token: 'TON', amount: 100 },
});

await taskQueue.add(task);

// Get next task for an agent
const nextTask = await taskQueue.getNextFor('executor_1');
```

### Delegation Engine

Manages task delegation between agents:

```typescript
import { createDelegationEngine } from '@tonaiagent/core';

const delegation = createDelegationEngine(taskQueue);

// Create delegation request
const delegationId = await delegation.createDelegation({
  fromAgent: 'strategist_1',
  taskId: 'task_123',
  constraints: {
    requiredCapabilities: ['trade_execution'],
    maxDuration: 60000,
  },
});

// Accept delegation
await delegation.acceptDelegation(delegationId, 'executor_1');
```

---

## Capital and Risk Distribution

### Capital Manager

Manages capital pools and allocations:

```typescript
import { createCapitalManager, createCapitalRequest } from '@tonaiagent/core';

const capitalManager = createCapitalManager();

// Create pool
await capitalManager.createPool({
  id: 'main_pool',
  totalCapital: 100000,
  limits: {
    maxPerAgent: 10000,
    maxPerOperation: 5000,
    reserveRatio: 0.2,
  },
});

// Request capital
const request = createCapitalRequest({
  agentId: 'executor_1',
  amount: 5000,
  purpose: 'Arbitrage execution',
  priority: 2,
});

const allocation = await capitalManager.requestCapital(request);

// Release capital
await capitalManager.releaseCapital('executor_1', 2500);
```

### Risk Limits

| Limit Type | Description |
|------------|-------------|
| `maxPerAgent` | Maximum capital per agent |
| `maxPerOperation` | Maximum per single operation |
| `dailyLimit` | Daily transaction limit |
| `reserveRatio` | Capital reserve percentage |
| `rebalanceThreshold` | Trigger for rebalancing |

---

## Conflict Resolution

The framework includes automatic conflict detection and resolution:

### Conflict Types

| Type | Description |
|------|-------------|
| `resource_contention` | Multiple agents accessing same resource |
| `contradictory_signals` | Conflicting trading signals |
| `priority_conflict` | Task priority disputes |
| `capital_shortage` | Insufficient capital for requests |
| `execution_race` | Simultaneous execution attempts |

### Resolution Strategies

```typescript
import { createConflictResolver } from '@tonaiagent/core';

const resolver = createConflictResolver();

// Detect conflicts
const conflicts = await resolver.detectConflicts({
  agents: swarm.getAllAgents().map(a => a.getState()),
  tasks: taskQueue.getPending(),
  allocations: capitalManager.getAllPools()[0].allocations,
});

// Resolve conflicts
for (const conflict of conflicts) {
  const resolution = await resolver.resolve(conflict.id);
  console.log(`Resolved: ${resolution.strategy}`);
}
```

---

## Observability and Governance

### Governance Controller

Manages governance actions and emergency controls:

```typescript
import { createGovernanceController } from '@tonaiagent/core';

const governance = createGovernanceController({
  messageBus: swarm.getMessageBus(),
});

// Request action approval
const actionId = await governance.requestAction({
  type: 'spawn_agent',
  targetType: 'agent',
  targetId: 'new_executor',
  initiator: 'admin',
  reason: 'Scale up execution capacity',
});

// Emergency stop
await governance.emergencyStop('admin', 'Market anomaly detected');
```

### Metrics Collector

Collects and exposes swarm metrics:

```typescript
import { createMetricsCollector } from '@tonaiagent/core';

const metrics = createMetricsCollector();

// Get current metrics
const currentMetrics = metrics.getMetrics();
console.log(`Active agents: ${currentMetrics.activeAgents}`);
console.log(`Completed tasks: ${currentMetrics.completedTasks}`);

// Filter event history
const errors = metrics.getEventHistory({
  severity: 'error',
  since: new Date(Date.now() - 3600000),
});
```

---

## Getting Started

### Installation

```bash
npm install @tonaiagent/core
```

### Basic Usage

```typescript
import {
  createSwarmCoordinator,
  createMessageBus,
} from '@tonaiagent/core';

async function main() {
  // Create swarm coordinator
  const swarm = createSwarmCoordinator({
    userId: 'user_123',
    capitalPool: 10000,
  });

  // Add agents
  await swarm.addAgent({ role: 'strategist' });
  await swarm.addAgent({ role: 'executor' });
  await swarm.addAgent({ role: 'risk' });
  await swarm.addAgent({ role: 'data' });
  await swarm.addAgent({ role: 'portfolio' });

  // Start the swarm
  await swarm.start();

  // Get swarm state
  const state = swarm.getState();
  console.log(`Swarm status: ${state.status}`);
  console.log(`Active agents: ${state.agents.length}`);

  // Pause/Resume
  await swarm.pause();
  await swarm.resume();

  // Stop the swarm
  await swarm.stop();
}

main();
```

---

## API Reference

### SwarmCoordinator

| Method | Description |
|--------|-------------|
| `start()` | Start the swarm |
| `stop()` | Stop the swarm |
| `pause()` | Pause all agents |
| `resume()` | Resume all agents |
| `addAgent(params)` | Add a new agent |
| `removeAgent(agentId)` | Remove an agent |
| `getAgent(agentId)` | Get agent by ID |
| `getAllAgents()` | Get all agents |
| `getState()` | Get swarm state |
| `getMetrics()` | Get swarm metrics |
| `getMessageBus()` | Get message bus instance |
| `getSharedMemory()` | Get shared memory store |
| `getTaskQueue()` | Get task queue |
| `getDelegationEngine()` | Get delegation engine |
| `getCapitalManager()` | Get capital manager |
| `getConflictResolver()` | Get conflict resolver |
| `getGovernanceController()` | Get governance controller |

### MessageBus

| Method | Description |
|--------|-------------|
| `publish(message)` | Publish message to bus |
| `subscribe(callback, filter?)` | Subscribe to messages |
| `send(message)` | Send direct message |
| `request(message, timeout?)` | Request-response pattern |
| `getPendingMessages(agentId)` | Get pending messages |
| `getStats()` | Get bus statistics |

### SharedMemoryStore

| Method | Description |
|--------|-------------|
| `get(key)` | Get entry by key |
| `set(key, entry)` | Set entry |
| `delete(key)` | Delete entry |
| `exists(key)` | Check if key exists |
| `list(pattern?)` | List entries matching pattern |
| `acquireLock(key, holderId, type, ttlMs)` | Acquire lock |
| `releaseLock(key, holderId)` | Release lock |
| `subscribe(pattern, callback)` | Subscribe to changes |
| `getVersion(key)` | Get current version |
| `compareAndSet(key, expectedVersion, entry)` | Atomic update |

### CapitalManager

| Method | Description |
|--------|-------------|
| `createPool(params)` | Create capital pool |
| `getPool(poolId)` | Get pool by ID |
| `getAllPools()` | Get all pools |
| `requestCapital(request)` | Request capital allocation |
| `releaseCapital(agentId, amount)` | Release capital |
| `getAgentAllocation(agentId)` | Get agent's allocation |
| `getUtilization()` | Get overall utilization |
| `updatePerformance(agentId, pnl)` | Update performance |
| `getStats()` | Get manager statistics |

### GovernanceController

| Method | Description |
|--------|-------------|
| `requestAction(action)` | Request governance action |
| `approveAction(actionId, approver)` | Approve action |
| `rejectAction(actionId, approver, reason)` | Reject action |
| `emergencyStop(initiator, reason)` | Activate emergency stop |
| `releaseEmergencyStop(initiator)` | Release emergency stop |
| `isEmergencyStopActive()` | Check emergency status |
| `getAction(actionId)` | Get action by ID |
| `getStats()` | Get governance statistics |

---

## Best Practices

1. **Agent Specialization**: Design agents with clear, focused responsibilities
2. **Loose Coupling**: Use message bus for communication, avoid direct dependencies
3. **Graceful Degradation**: Handle agent failures without system-wide impact
4. **Resource Limits**: Set appropriate limits for capital and operations
5. **Monitoring**: Use metrics collector to track system health
6. **Testing**: Test agents individually before deploying to swarm
7. **Emergency Planning**: Configure governance for emergency scenarios

---

## Further Reading

- [Architecture Overview](./architecture.md)
- [Security Layer](./security.md)
- [AI Layer](./ai-layer.md)
