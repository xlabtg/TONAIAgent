# Open Agent Protocol SDK Documentation

## Overview

The Open Agent Protocol (OAP) SDK provides a comprehensive toolkit for building autonomous financial agents on The Open Network (TON) and beyond. This documentation covers the SDK's API, usage patterns, and best practices.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Installation

```bash
npm install @tonaiagent/core
```

Or with yarn:

```bash
yarn add @tonaiagent/core
```

## Quick Start

### Initialize the Protocol

```typescript
import { OpenAgentProtocol, createAgent } from '@tonaiagent/core';

// Create protocol instance
const protocol = new OpenAgentProtocol({
  network: 'ton',
  rpcUrl: 'https://ton-mainnet.example.com',
  enableReputation: true,
  enableGovernance: true,
});

// Create an agent
const agent = await createAgent(protocol, {
  name: 'MyTradingAgent',
  owner: {
    type: 'user',
    ownerId: 'user_123',
    ownerAddress: 'EQA...',
  },
  capabilities: ['trading.swap', 'data.analyze'],
  permissions: {
    trading: {
      enabled: true,
      maxTransactionValue: 1000,
    },
  },
});

// Start the agent
await agent.start();

// Execute a capability
const result = await agent.execute('trading.swap', {
  tokenIn: 'TON',
  tokenOut: 'USDT',
  amount: 100,
});
```

---

## Core Concepts

### Agent Identity

Every agent has a unique identity following the OAP format:

```
oap://<network>/<owner-type>/<owner-id>/<agent-id>
```

Example: `oap://ton/user/EQA.../agent_abc123`

### Capabilities

Capabilities define what operations an agent can perform. They are categorized into:

- **Trading**: `trading.swap`, `trading.limit_order`
- **Yield**: `yield.stake`, `yield.unstake`, `yield.harvest`
- **Data**: `data.collect`, `data.analyze`
- **Governance**: `governance.vote`, `governance.delegate`
- **Treasury**: `treasury.transfer`, `treasury.rebalance`

### Permissions

Permissions control what capabilities an agent can use and with what limits:

```typescript
const permissions = {
  trading: {
    enabled: true,
    allowedOperations: ['swap', 'limit'],
    maxTransactionValue: 1000,
    dailyLimit: 5000,
    maxSlippage: 1,
  },
  transfers: {
    enabled: true,
    whitelistOnly: true,
    allowedDestinations: ['EQA...'],
  },
};
```

---

## API Reference

### OpenAgentProtocol

Main protocol class providing access to all components.

```typescript
class OpenAgentProtocol {
  // Configuration
  readonly config: OpenAgentProtocolConfig;

  // Components
  readonly identity: IdentityManager;
  readonly capabilities: CapabilityRegistry;
  readonly messaging: ProtocolMessageBus;
  readonly permissions: PermissionManager;
  readonly reputation: ReputationManager;
  readonly plugins: PluginRegistry;
  readonly tools: ToolRegistry;
  readonly chains: ChainManager;
  readonly bridges: BridgeManager;
  readonly assets: AssetRegistry;
  readonly governance: GovernanceManager;

  // Methods
  subscribe(handler: ProtocolEventHandler): Unsubscribe;
  getVersion(): string;
  getNetwork(): NetworkId;
}
```

### Identity Manager

Manages agent identities.

```typescript
interface IdentityManager {
  // Create identity
  createIdentity(input: CreateIdentityInput): Promise<AgentIdentity>;

  // Get identity
  getIdentity(agentId: AgentId): Promise<AgentIdentity | undefined>;

  // Update identity
  updateIdentity(input: UpdateIdentityInput): Promise<AgentIdentity>;

  // Transfer ownership
  transferOwnership(input: TransferOwnershipInput): Promise<AgentIdentity>;

  // Delegate control
  delegateControl(input: DelegateControlInput): Promise<DelegationRecord>;

  // Verify identity
  verifyIdentity(input: VerifyIdentityInput): Promise<VerifyIdentityResult>;

  // Search identities
  searchIdentities(criteria: IdentitySearchCriteria): Promise<IdentitySearchResult>;
}
```

### Capability Registry

Manages capability registration and execution.

```typescript
interface CapabilityRegistry {
  // Register capability
  register(input: RegisterCapabilityInput): Promise<void>;

  // Execute capability
  execute(params: ExecuteParams): Promise<ExecuteResult>;

  // Estimate cost
  estimate(params: ExecuteParams): Promise<CostEstimate>;

  // Validate parameters
  validate(params: ExecuteParams): Promise<ValidationResult>;

  // Search capabilities
  search(criteria: CapabilitySearchCriteria): Promise<CapabilitySearchResult>;

  // Get manifest
  getManifest(agentId: AgentId): Promise<CapabilityManifest>;
}
```

### Protocol Message Bus

Handles inter-agent communication.

```typescript
interface ProtocolMessageBus {
  // Publish message
  publish(message: ProtocolMessage): Promise<void>;

  // Subscribe to messages
  subscribe(subscriber: MessageSubscriber): Unsubscribe;

  // Request-response
  request(message: ProtocolMessage, timeout: number): Promise<ProtocolMessage | null>;

  // Acknowledge
  acknowledge(messageId: MessageId, agentId: AgentId): Promise<void>;
}
```

### Permission Manager

Manages permissions and authorization.

```typescript
interface PermissionManager {
  // Get permissions
  getPermissions(agentId: AgentId): Promise<PermissionSet | undefined>;

  // Set permissions
  setPermissions(agentId: AgentId, permissions: PermissionSet): Promise<void>;

  // Authorize operation
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult>;

  // Add policy
  addPolicy(policy: TransactionPolicy): Promise<void>;

  // Check guardrails
  checkGuardrails(request: AuthorizationRequest): Promise<GuardrailCheck[]>;
}
```

### Reputation Manager

Tracks agent reputation and performance.

```typescript
interface ReputationManager {
  // Get reputation
  getReputation(agentId: AgentId): Promise<AgentReputation | undefined>;

  // Update with performance
  updatePerformance(update: PerformanceUpdate): Promise<void>;

  // Add endorsement
  addEndorsement(endorsement: EndorsementInput): Promise<Endorsement>;

  // Award badge
  awardBadge(agentId: AgentId, badge: VerificationBadge): Promise<void>;

  // Get performance metrics
  getPerformanceMetrics(agentId: AgentId, period: string): Promise<PerformanceMetrics>;

  // Get top agents
  getTopAgents(limit?: number): Promise<AgentReputation[]>;
}
```

### Governance Manager

Handles protocol governance.

```typescript
interface GovernanceManager {
  // Create proposal
  createProposal(input: ProposalInput, proposer: string): Promise<Proposal>;

  // Vote
  vote(proposalId: string, voter: string, voteType: VoteType, reason?: string): Promise<VoteResult>;

  // Execute proposal
  execute(proposalId: string): Promise<ProtocolExecutionResult>;

  // Delegate voting power
  delegate(delegator: string, delegatee: string, power: number): Promise<void>;

  // Get voting power
  getVotingPower(address: string): Promise<number>;
}
```

---

## Examples

### Creating a Trading Agent

```typescript
import { OpenAgentProtocol, createAgent, createCapability } from '@tonaiagent/core';

const protocol = new OpenAgentProtocol({ network: 'ton' });

// Create agent
const agent = await createAgent(protocol, {
  name: 'ArbitrageBot',
  owner: { type: 'user', ownerId: 'user_123' },
  permissions: {
    trading: { enabled: true, maxTransactionValue: 5000 },
  },
});

// Register custom capability
const arbitrageCapability = createCapability({
  id: 'custom.arbitrage',
  name: 'Arbitrage Execution',
  category: 'trading',
  description: 'Execute arbitrage between DEXes',
  riskLevel: 'medium',
  inputSchema: {
    type: 'object',
    properties: {
      tokenA: { type: 'string' },
      tokenB: { type: 'string' },
      amount: { type: 'number' },
    },
    required: ['tokenA', 'tokenB', 'amount'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      profit: { type: 'number' },
      transactionHashes: { type: 'array' },
    },
  },
  execute: async (params) => {
    // Arbitrage logic here
    return {
      success: true,
      data: { profit: 10, transactionHashes: [] },
      executionTime: 1500,
    };
  },
});

protocol.capabilities.register({
  capability: arbitrageCapability.capability,
  executor: arbitrageCapability.executor,
  providerId: agent.getId(),
});

// Execute
const result = await agent.execute('custom.arbitrage', {
  tokenA: 'TON',
  tokenB: 'USDT',
  amount: 1000,
});
```

### Multi-Agent Orchestration

```typescript
import {
  OpenAgentProtocol,
  createAgent,
  createOrchestration,
} from '@tonaiagent/core';

const protocol = new OpenAgentProtocol({ network: 'ton' });

// Create multiple agents
const dataAgent = await createAgent(protocol, {
  name: 'DataCollector',
  owner: { type: 'user', ownerId: 'user_123' },
});

const strategyAgent = await createAgent(protocol, {
  name: 'Strategist',
  owner: { type: 'user', ownerId: 'user_123' },
});

const executorAgent = await createAgent(protocol, {
  name: 'Executor',
  owner: { type: 'user', ownerId: 'user_123' },
  permissions: { trading: { enabled: true } },
});

// Create orchestration
const orchestration = createOrchestration(
  {
    name: 'yield_optimization',
    steps: [
      {
        id: 'collect_data',
        agent: dataAgent.getId(),
        capability: 'data.collect',
        params: { assets: ['TON', 'USDT'] },
      },
      {
        id: 'analyze',
        agent: strategyAgent.getId(),
        capability: 'data.analyze',
        params: { depth: 'detailed' },
        dependsOn: ['collect_data'],
      },
      {
        id: 'execute',
        agent: executorAgent.getId(),
        capability: 'trading.swap',
        params: {},
        dependsOn: ['analyze'],
      },
    ],
  },
  protocol.messaging
);

// Execute orchestration
const result = await orchestration.execute();
console.log('Orchestration result:', result);
```

### Subscribing to Events

```typescript
import { OpenAgentProtocol } from '@tonaiagent/core';

const protocol = new OpenAgentProtocol({ network: 'ton' });

// Subscribe to protocol events
const unsubscribe = protocol.subscribe((event) => {
  console.log(`[${event.type}] ${event.source}:`, event.data);
});

// Subscribe to specific component events
protocol.identity.subscribe((event) => {
  if (event.type === 'identity.created') {
    console.log('New agent created:', event.agentId);
  }
});

protocol.reputation.subscribe((event) => {
  if (event.type === 'reputation.updated') {
    console.log('Reputation updated:', event.data);
  }
});

// Later: unsubscribe
unsubscribe();
```

### Creating Governance Proposals

```typescript
import { OpenAgentProtocol } from '@tonaiagent/core';

const protocol = new OpenAgentProtocol({
  network: 'ton',
  enableGovernance: true,
});

// Set voting power (in production, this comes from token holdings)
(protocol.governance as any).setVotingPower('user_123', 10000);

// Create proposal
const proposal = await protocol.governance.createProposal(
  {
    type: 'parameter_change',
    title: 'Increase daily transaction limit',
    description: 'Proposal to increase the default daily transaction limit from 5000 to 10000 TON',
    actions: [
      {
        target: 'protocol.permissions',
        method: 'updateDefaultLimit',
        params: ['dailyLimit', 10000],
      },
    ],
  },
  'user_123'
);

console.log('Proposal created:', proposal.id);

// Vote on proposal
const voteResult = await protocol.governance.vote(
  proposal.id,
  'user_456',
  'for',
  'Increased limits will improve trading efficiency'
);

// Check proposal status
const updatedProposal = await protocol.governance.getProposal(proposal.id);
console.log('Proposal status:', updatedProposal?.status);
```

---

## Best Practices

### 1. Always Validate Capabilities

Before executing capabilities, validate the parameters:

```typescript
const validation = await protocol.capabilities.validate({
  capabilityId: 'trading.swap',
  params: { tokenIn: 'TON', tokenOut: 'USDT', amount: 100 },
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Proceed with execution
```

### 2. Use Permission Checks

Always check permissions before sensitive operations:

```typescript
const authResult = await protocol.permissions.authorize({
  agentId: agent.getId(),
  operationType: 'trading',
  params: { amount: 1000 },
});

if (!authResult.authorized) {
  console.error('Not authorized:', authResult.reason);
  return;
}

if (authResult.requiredActions) {
  // Handle required actions (approval, delay, etc.)
}
```

### 3. Monitor Reputation

Track and respond to reputation changes:

```typescript
protocol.reputation.subscribe((event) => {
  if (event.type === 'reputation.updated') {
    const delta = event.data.delta as number;
    if (delta < -50) {
      console.warn('Significant reputation drop detected');
      // Take corrective action
    }
  }
});
```

### 4. Handle Errors Gracefully

Always handle execution errors:

```typescript
try {
  const result = await agent.execute('trading.swap', params);
  if (!result.success) {
    console.error('Execution failed:', result.error);
    // Handle failure
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle unexpected error
}
```

---

## Troubleshooting

### Common Issues

**Q: Capability not found**

Ensure the capability is registered and the agent has permission to use it:

```typescript
const manifest = await protocol.capabilities.getManifest(agent.getId());
console.log('Available capabilities:', manifest.capabilities.map(c => c.id));
```

**Q: Authorization denied**

Check the agent's permissions:

```typescript
const permissions = await protocol.permissions.getPermissions(agent.getId());
console.log('Current permissions:', permissions);
```

**Q: Identity verification fails**

Ensure you're using the correct public key and signing correctly:

```typescript
const result = await protocol.identity.verifyIdentity({
  agentId: agent.getId(),
  challenge: 'random_challenge_string',
  signature: 'signature_of_challenge',
  publicKey: 'your_public_key',
});

if (!result.valid) {
  console.error('Verification error:', result.error);
}
```

---

## Support

For issues and feature requests, please visit:
- GitHub: https://github.com/xlabtg/TONAIAgent/issues
- Documentation: https://github.com/xlabtg/TONAIAgent/tree/main/docs

## License

MIT License - see LICENSE file for details.
