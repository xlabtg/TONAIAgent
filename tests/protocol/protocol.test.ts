/**
 * TONAIAgent - Open Agent Protocol Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OpenAgentProtocol,
  createAgent,
} from '../../src/protocol';

describe('OpenAgentProtocol', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({
      network: 'ton',
      enableOnChain: false,
      enableReputation: true,
      enableGovernance: true,
    });
  });

  describe('initialization', () => {
    it('should create protocol instance', () => {
      expect(protocol).toBeDefined();
      expect(protocol.getVersion()).toBe('1.0.0');
      expect(protocol.getNetwork()).toBe('ton');
    });

    it('should have all components initialized', () => {
      expect(protocol.identity).toBeDefined();
      expect(protocol.capabilities).toBeDefined();
      expect(protocol.messaging).toBeDefined();
      expect(protocol.permissions).toBeDefined();
      expect(protocol.reputation).toBeDefined();
      expect(protocol.plugins).toBeDefined();
      expect(protocol.tools).toBeDefined();
      expect(protocol.chains).toBeDefined();
      expect(protocol.bridges).toBeDefined();
      expect(protocol.assets).toBeDefined();
      expect(protocol.governance).toBeDefined();
    });
  });

  describe('event subscription', () => {
    it('should subscribe to protocol events', () => {
      const events: any[] = [];
      const unsubscribe = protocol.subscribe((event) => events.push(event));

      expect(typeof unsubscribe).toBe('function');
    });
  });
});

describe('createAgent', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({
      network: 'ton',
    });
  });

  it('should create an agent', async () => {
    const agent = await createAgent(protocol, {
      name: 'TestAgent',
      owner: {
        type: 'user',
        ownerId: 'user_123',
      },
    });

    expect(agent).toBeDefined();
    expect(agent.identity.name).toBe('TestAgent');
    expect(agent.getId()).toBeDefined();
  });

  it('should create agent with permissions', async () => {
    const agent = await createAgent(protocol, {
      name: 'TradingAgent',
      owner: {
        type: 'user',
        ownerId: 'user_123',
      },
      permissions: {
        trading: {
          enabled: true,
          maxTransactionValue: 5000,
        },
      },
    });

    const permissions = await protocol.permissions.getPermissions(agent.getId());

    expect(permissions).toBeDefined();
    expect(permissions!.trading.enabled).toBe(true);
    expect(permissions!.trading.maxTransactionValue).toBe(5000);
  });

  it('should start and stop agent', async () => {
    const agent = await createAgent(protocol, {
      name: 'LifecycleAgent',
      owner: {
        type: 'user',
        ownerId: 'user_123',
      },
    });

    await expect(agent.start()).resolves.not.toThrow();
    await expect(agent.stop()).resolves.not.toThrow();
  });

  it('should track agent reputation', async () => {
    const agent = await createAgent(protocol, {
      name: 'ReputationAgent',
      owner: {
        type: 'user',
        ownerId: 'user_123',
      },
    });

    await agent.start();

    const reputation = await protocol.reputation.getReputation(agent.getId());

    expect(reputation).toBeDefined();
    expect(reputation!.overallScore).toBeGreaterThan(0);
  });
});

describe('Messaging', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({ network: 'ton' });
  });

  it('should publish and subscribe to messages', async () => {
    const received: any[] = [];

    protocol.messaging.subscribe({
      id: 'test_subscriber',
      filters: [{ type: 'capability.request' }],
      handler: async (msg) => received.push(msg),
    });

    const { createProtocolMessage } = await import('../../src/protocol/messaging');

    const message = createProtocolMessage({
      type: 'capability.request',
      sender: 'agent_1',
      target: { type: 'broadcast', scope: 'swarm' },
      payload: { test: true },
    });

    await protocol.messaging.publish(message);

    expect(received).toHaveLength(1);
    expect(received[0].payload).toEqual({ test: true });
  });
});

describe('Permissions', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({ network: 'ton' });
  });

  it('should authorize valid operations', async () => {
    const { createDefaultPermissions } = await import('../../src/protocol/security');

    const agentId = 'agent_123';
    const permissions = createDefaultPermissions(agentId);
    await protocol.permissions.setPermissions(agentId, permissions);

    const result = await protocol.permissions.authorize({
      agentId,
      operationType: 'trading',
      params: { amount: 100 },
    });

    expect(result.authorized).toBe(true);
  });

  it('should deny unauthorized operations', async () => {
    const { createDefaultPermissions } = await import('../../src/protocol/security');

    const agentId = 'agent_123';
    const permissions = createDefaultPermissions(agentId);
    permissions.trading.enabled = false;
    await protocol.permissions.setPermissions(agentId, permissions);

    const result = await protocol.permissions.authorize({
      agentId,
      operationType: 'trading',
      params: { amount: 100 },
    });

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('not enabled');
  });

  it('should enforce transaction limits', async () => {
    const { createDefaultPermissions } = await import('../../src/protocol/security');

    const agentId = 'agent_123';
    const permissions = createDefaultPermissions(agentId);
    permissions.trading.maxTransactionValue = 100;
    await protocol.permissions.setPermissions(agentId, permissions);

    const result = await protocol.permissions.authorize({
      agentId,
      operationType: 'trading',
      params: { amount: 500 },
    });

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('exceeds max');
  });
});

describe('Governance', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({
      network: 'ton',
      enableGovernance: true,
    });

    // Set up voting power
    (protocol.governance as any).setVotingPower('user_123', 10000);
    (protocol.governance as any).setVotingPower('user_456', 5000);

    // Set voting delay to 0 for testing
    (protocol.governance as any).config.votingDelay = 0;
  });

  it('should create proposals', async () => {
    const proposal = await protocol.governance.createProposal(
      {
        type: 'parameter_change',
        title: 'Test Proposal',
        description: 'A test proposal',
        actions: [],
      },
      'user_123'
    );

    expect(proposal).toBeDefined();
    expect(proposal.title).toBe('Test Proposal');
    expect(proposal.status).toBe('active');
  });

  it('should allow voting on proposals', async () => {
    const proposal = await protocol.governance.createProposal(
      {
        type: 'parameter_change',
        title: 'Vote Test',
        description: 'Testing votes',
        actions: [],
      },
      'user_123'
    );

    const voteResult = await protocol.governance.vote(
      proposal.id,
      'user_456',
      'for',
      'I support this'
    );

    expect(voteResult.success).toBe(true);

    const votes = await protocol.governance.getVotes(proposal.id);
    expect(votes).toHaveLength(1);
    expect(votes[0].vote).toBe('for');
    expect(votes[0].votingPower).toBe(5000);
  });

  it('should delegate voting power', async () => {
    await protocol.governance.delegate('user_456', 'user_123', 3000);

    const power = await protocol.governance.getVotingPower('user_123');
    expect(power).toBe(13000); // 10000 + 3000 delegated
  });
});

describe('Reputation', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({
      network: 'ton',
      enableReputation: true,
    });
  });

  it('should initialize reputation for new agents', async () => {
    const reputation = await protocol.reputation.getReputation('new_agent');

    expect(reputation).toBeDefined();
    expect(reputation!.overallScore).toBe(500);
  });

  it('should update reputation on performance', async () => {
    const agentId = 'trading_agent';
    await protocol.reputation.getReputation(agentId);

    await protocol.reputation.updatePerformance({
      agentId,
      tradeResult: { profit: 100, duration: 60000, success: true },
    });

    await protocol.reputation.updatePerformance({
      agentId,
      tradeResult: { profit: -50, duration: 30000, success: false },
    });

    const reputation = await protocol.reputation.getReputation(agentId);
    expect(reputation!.history.length).toBeGreaterThan(0);
  });

  it('should add endorsements', async () => {
    const agentId = 'endorsed_agent';
    await protocol.reputation.getReputation(agentId);

    const endorsement = await protocol.reputation.addEndorsement({
      agentId,
      endorser: 'user_123',
      type: 'performance',
      rating: 5,
      comment: 'Great agent!',
    });

    expect(endorsement).toBeDefined();
    expect(endorsement.rating).toBe(5);

    const endorsements = await protocol.reputation.getEndorsements(agentId);
    expect(endorsements).toHaveLength(1);
  });
});

describe('Cross-Chain', () => {
  let protocol: OpenAgentProtocol;

  beforeEach(() => {
    protocol = new OpenAgentProtocol({
      network: 'ton',
      enableCrossChain: true,
    });
  });

  it('should list supported chains', () => {
    // Initially no adapters registered
    const chains = protocol.chains.getSupportedChains();
    expect(Array.isArray(chains)).toBe(true);
  });

  it('should list supported bridges', () => {
    const bridges = protocol.bridges.getSupportedBridges();
    expect(Array.isArray(bridges)).toBe(true);
  });

  it('should register and lookup assets', async () => {
    const crossChain = await import('../../src/protocol/cross-chain/index');
    const { COMMON_ASSETS } = crossChain;

    for (const asset of COMMON_ASSETS) {
      protocol.assets.registerAsset(asset);
    }

    const ton = protocol.assets.getAssetBySymbol('TON');
    expect(ton).toBeDefined();
    expect(ton!.symbol).toBe('TON');
  });
});
