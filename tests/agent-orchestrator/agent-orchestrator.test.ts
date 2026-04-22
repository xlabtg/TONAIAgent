/**
 * Tests for the One-Click Agent Creation Orchestrator (Issue #91)
 *
 * Covers:
 * - Core createAgent() one-click creation
 * - Idempotency (duplicate calls with same key)
 * - Rollback on failure
 * - Rate limiting
 * - Capacity limits (per-user and total)
 * - Input validation
 * - Agent management (get, list, terminate, update status)
 * - Strategy registry
 * - Health and metrics
 * - Event system
 * - REST API handler
 * - All strategy types and environments
 * - Demo mode (telegram=false, tonWallet=false)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  AgentOrchestrator,
  AgentOrchestratorApi,
  AgentOrchestratorError,
  createAgentOrchestrator,
  createAgentOrchestratorApi,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from '../../core/agents/orchestrator';

import type {
  CreateAgentInput,
  OrchestratorEvent,
  AgentStrategy,
  AgentEnvironment,
} from '../../core/agents/orchestrator';

// ============================================================================
// Test Helpers
// ============================================================================

function makeInput(overrides: Partial<CreateAgentInput> = {}): CreateAgentInput {
  return {
    userId: 'user_123',
    strategy: 'demo',
    telegram: false,
    tonWallet: false,
    environment: 'demo',
    ...overrides,
  };
}

function makeOrchestrator(config: Parameters<typeof createAgentOrchestrator>[0] = {}) {
  return createAgentOrchestrator({
    security: {
      maxCreationsPerUserPerHour: 0, // unlimited in tests
      encryptStoredKeys: false,
      enableAuditLog: true,
    },
    // Issue #330: defaults flipped to ON; opt out here so the orchestrator
    // tests stay focused on orchestration behaviour rather than KYC fixtures.
    // The compliance defaults themselves are covered in tests/regulatory/.
    kycEnforcement: { enabled: false, mode: 'testnet' },
    ...config,
  });
}

// ============================================================================
// DEFAULT_ORCHESTRATOR_CONFIG
// ============================================================================

describe('DEFAULT_ORCHESTRATOR_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_ORCHESTRATOR_CONFIG.enabled).toBe(true);
  });

  it('should default to demo environment', () => {
    expect(DEFAULT_ORCHESTRATOR_CONFIG.defaultEnvironment).toBe('demo');
  });

  it('should have auto-start enabled', () => {
    expect(DEFAULT_ORCHESTRATOR_CONFIG.autoStart).toBe(true);
  });

  it('should have reasonable per-user limits', () => {
    expect(DEFAULT_ORCHESTRATOR_CONFIG.maxAgentsPerUser).toBeGreaterThan(0);
    expect(DEFAULT_ORCHESTRATOR_CONFIG.maxTotalAgents).toBeGreaterThan(0);
  });
});

// ============================================================================
// createAgent — core one-click creation
// ============================================================================

describe('AgentOrchestrator.createAgent', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should return the correct shape for the product vision', async () => {
    const result = await orchestrator.createAgent({
      userId: 'user_123',
      strategy: 'trading',
      telegram: true,
      tonWallet: true,
      environment: 'demo',
    });

    // Product vision check: { agentId, telegramBot, walletAddress, status }
    expect(result.agentId).toBeDefined();
    expect(typeof result.agentId).toBe('string');
    expect(result.telegramBot).toBeDefined();
    expect(result.telegramBot).toMatch(/@.+_bot$/);
    expect(result.walletAddress).toBeDefined();
    expect(result.walletAddress).toMatch(/^EQ/);
    expect(result.status).toBe('active');
  });

  it('should create an agent with all fields populated', async () => {
    const result = await orchestrator.createAgent(makeInput({
      userId: 'user_456',
      strategy: 'yield',
      telegram: true,
      tonWallet: true,
      environment: 'demo',
      name: 'My Yield Bot',
    }));

    expect(result.agentId).toBeDefined();
    expect(result.agentName).toBe('My Yield Bot');
    expect(result.userId).toBe('user_456');
    expect(result.strategy).toBe('yield');
    expect(result.environment).toBe('demo');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.telegramBot).not.toBeNull();
    expect(result.walletAddress).not.toBeNull();
    expect(result.status).toBe('active');
  });

  it('should auto-generate agent name when not provided', async () => {
    const result = await orchestrator.createAgent(makeInput({ userId: 'user_abc' }));
    expect(result.agentName).toBeDefined();
    expect(result.agentName.length).toBeGreaterThan(0);
  });

  it('should create agent without telegram when telegram=false', async () => {
    const result = await orchestrator.createAgent(makeInput({ telegram: false, tonWallet: true }));
    expect(result.telegramBot).toBeNull();
    expect(result.walletAddress).not.toBeNull();
  });

  it('should create agent without wallet when tonWallet=false', async () => {
    const result = await orchestrator.createAgent(makeInput({ telegram: true, tonWallet: false }));
    expect(result.walletAddress).toBeNull();
    expect(result.telegramBot).not.toBeNull();
  });

  it('should create minimal agent with telegram=false and tonWallet=false', async () => {
    const result = await orchestrator.createAgent(makeInput({ telegram: false, tonWallet: false }));
    expect(result.telegramBot).toBeNull();
    expect(result.walletAddress).toBeNull();
    expect(result.status).toBe('active');
  });

  it('should create agents for all valid strategies', async () => {
    const strategies: AgentStrategy[] = ['trading', 'yield', 'arbitrage', 'demo', 'custom'];
    for (const strategy of strategies) {
      const result = await orchestrator.createAgent(
        makeInput({ userId: `user_strat_${strategy}`, strategy }),
      );
      expect(result.strategy).toBe(strategy);
    }
  });

  it('should create agents for all valid environments', async () => {
    const environments: AgentEnvironment[] = ['demo', 'testnet', 'mainnet'];
    for (const environment of environments) {
      const result = await orchestrator.createAgent(
        makeInput({ userId: `user_env_${environment}`, environment }),
      );
      expect(result.environment).toBe(environment);
    }
  });

  it('should include provisioning summary in result', async () => {
    const result = await orchestrator.createAgent(makeInput({ telegram: true, tonWallet: true }));
    const { provisioningSummary } = result;

    expect(provisioningSummary).toBeDefined();
    expect(provisioningSummary.runtime.success).toBe(true);
    expect(provisioningSummary.strategy.success).toBe(true);
    expect(provisioningSummary.persistence.success).toBe(true);
    expect(provisioningSummary.security.success).toBe(true);
    expect(provisioningSummary.wallet).not.toBeNull();
    expect(provisioningSummary.wallet!.success).toBe(true);
    expect(provisioningSummary.telegram).not.toBeNull();
    expect(provisioningSummary.telegram!.success).toBe(true);
    expect(provisioningSummary.totalDurationMs).toBeGreaterThan(0);
  });

  it('should persist agent and allow retrieval', async () => {
    const result = await orchestrator.createAgent(makeInput({ userId: 'user_persist' }));
    const fetched = orchestrator.getAgent(result.agentId);

    expect(fetched.agentId).toBe(result.agentId);
    expect(fetched.userId).toBe('user_persist');
  });

  it('should create unique agent IDs for different users', async () => {
    const r1 = await orchestrator.createAgent(makeInput({ userId: 'user_A' }));
    const r2 = await orchestrator.createAgent(makeInput({ userId: 'user_B' }));
    expect(r1.agentId).not.toBe(r2.agentId);
  });

  it('should accept custom budgetTon', async () => {
    const result = await orchestrator.createAgent(makeInput({ budgetTon: 25 }));
    expect(result.agentId).toBeDefined();
  });

  it('should accept strategyConfig for custom strategy', async () => {
    const result = await orchestrator.createAgent(makeInput({
      strategy: 'custom',
      strategyConfig: { interval: 'hourly', amount: 100 },
    }));
    expect(result.strategy).toBe('custom');
  });

  it('should throw for disabled orchestrator', async () => {
    const disabled = createAgentOrchestrator({ enabled: false });
    await expect(disabled.createAgent(makeInput())).rejects.toThrow(AgentOrchestratorError);
  });
});

// ============================================================================
// Input Validation
// ============================================================================

describe('AgentOrchestrator — input validation', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should throw RUNTIME_INITIALIZATION_FAILED for empty userId', async () => {
    await expect(orchestrator.createAgent(makeInput({ userId: '' }))).rejects.toMatchObject({
      code: 'RUNTIME_INITIALIZATION_FAILED',
    });
  });

  it('should throw INVALID_STRATEGY for unknown strategy', async () => {
    await expect(
      orchestrator.createAgent(makeInput({ strategy: 'unknown_strategy' as AgentStrategy })),
    ).rejects.toMatchObject({ code: 'INVALID_STRATEGY' });
  });

  it('should throw INVALID_ENVIRONMENT for unknown environment', async () => {
    await expect(
      orchestrator.createAgent(makeInput({ environment: 'production' as AgentEnvironment })),
    ).rejects.toMatchObject({ code: 'INVALID_ENVIRONMENT' });
  });
});

// ============================================================================
// Idempotency
// ============================================================================

describe('AgentOrchestrator — idempotency', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should return same agent for duplicate idempotency key', async () => {
    const key = 'idem_key_abc';
    const r1 = await orchestrator.createAgent(makeInput({ idempotencyKey: key, userId: 'user_idem' }));
    const r2 = await orchestrator.createAgent(makeInput({ idempotencyKey: key, userId: 'user_idem' }));

    expect(r1.agentId).toBe(r2.agentId);
  });

  it('should create distinct agents without idempotency key', async () => {
    const r1 = await orchestrator.createAgent(makeInput({ userId: 'user_no_idem' }));
    const r2 = await orchestrator.createAgent(makeInput({ userId: 'user_no_idem' }));

    expect(r1.agentId).not.toBe(r2.agentId);
  });
});

// ============================================================================
// Rate Limiting
// ============================================================================

describe('AgentOrchestrator — rate limiting', () => {
  it('should enforce per-user rate limit', async () => {
    const orchestrator = makeOrchestrator({
      security: {
        maxCreationsPerUserPerHour: 2,
        encryptStoredKeys: false,
        enableAuditLog: false,
      },
    });

    await orchestrator.createAgent(makeInput({ userId: 'rate_user' }));
    await orchestrator.createAgent(makeInput({ userId: 'rate_user' }));

    await expect(
      orchestrator.createAgent(makeInput({ userId: 'rate_user' })),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED' });
  });

  it('should not affect other users when one is rate-limited', async () => {
    const orchestrator = makeOrchestrator({
      security: {
        maxCreationsPerUserPerHour: 1,
        encryptStoredKeys: false,
        enableAuditLog: false,
      },
    });

    await orchestrator.createAgent(makeInput({ userId: 'limited_user' }));
    await expect(
      orchestrator.createAgent(makeInput({ userId: 'limited_user' })),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED' });

    // Different user — should succeed
    const result = await orchestrator.createAgent(makeInput({ userId: 'other_user' }));
    expect(result.agentId).toBeDefined();
  });
});

// ============================================================================
// Capacity Limits
// ============================================================================

describe('AgentOrchestrator — capacity limits', () => {
  it('should enforce per-user agent limit', async () => {
    const orchestrator = makeOrchestrator({ maxAgentsPerUser: 2 });
    const userId = 'cap_user';

    await orchestrator.createAgent(makeInput({ userId }));
    await orchestrator.createAgent(makeInput({ userId }));

    await expect(
      orchestrator.createAgent(makeInput({ userId })),
    ).rejects.toMatchObject({ code: 'USER_AGENT_LIMIT_REACHED' });
  });

  it('should enforce total agent limit', async () => {
    const orchestrator = makeOrchestrator({ maxTotalAgents: 2 });

    await orchestrator.createAgent(makeInput({ userId: 'user_1' }));
    await orchestrator.createAgent(makeInput({ userId: 'user_2' }));

    await expect(
      orchestrator.createAgent(makeInput({ userId: 'user_3' })),
    ).rejects.toMatchObject({ code: 'TOTAL_AGENT_LIMIT_REACHED' });
  });

  it('should not count terminated agents toward per-user limit', async () => {
    const orchestrator = makeOrchestrator({ maxAgentsPerUser: 1 });
    const userId = 'term_user';

    const r1 = await orchestrator.createAgent(makeInput({ userId }));
    await orchestrator.terminateAgent(r1.agentId);

    // After termination, should be able to create another
    const r2 = await orchestrator.createAgent(makeInput({ userId }));
    expect(r2.agentId).toBeDefined();
  });
});

// ============================================================================
// Agent Management
// ============================================================================

describe('AgentOrchestrator — agent management', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should get agent by ID', async () => {
    const result = await orchestrator.createAgent(makeInput({ userId: 'user_get' }));
    const agent = orchestrator.getAgent(result.agentId);
    expect(agent.agentId).toBe(result.agentId);
    expect(agent.userId).toBe('user_get');
  });

  it('should throw AGENT_NOT_FOUND for unknown ID', () => {
    expect(() => orchestrator.getAgent('nonexistent_agent')).toThrow(AgentOrchestratorError);
    expect(() => orchestrator.getAgent('nonexistent_agent')).toThrowError(
      expect.objectContaining({ code: 'AGENT_NOT_FOUND' }),
    );
  });

  it('should list agents by user', async () => {
    const userId = 'user_list';
    await orchestrator.createAgent(makeInput({ userId }));
    await orchestrator.createAgent(makeInput({ userId }));
    await orchestrator.createAgent(makeInput({ userId: 'other_user' }));

    const agents = orchestrator.listAgentsByUser(userId);
    expect(agents).toHaveLength(2);
    expect(agents.every((a) => a.userId === userId)).toBe(true);
  });

  it('should list all agents', async () => {
    await orchestrator.createAgent(makeInput({ userId: 'user_A' }));
    await orchestrator.createAgent(makeInput({ userId: 'user_B' }));

    const agents = orchestrator.listAllAgents();
    expect(agents.length).toBeGreaterThanOrEqual(2);
  });

  it('should terminate an agent', async () => {
    const result = await orchestrator.createAgent(makeInput({ userId: 'user_term' }));
    await orchestrator.terminateAgent(result.agentId);

    const agent = orchestrator.getAgent(result.agentId);
    expect(agent.status).toBe('terminated');
  });

  it('should throw AGENT_NOT_FOUND when terminating unknown agent', async () => {
    await expect(orchestrator.terminateAgent('nonexistent')).rejects.toMatchObject({
      code: 'AGENT_NOT_FOUND',
    });
  });

  it('should update agent status', async () => {
    const result = await orchestrator.createAgent(makeInput({ userId: 'user_status' }));
    const updated = orchestrator.updateAgentStatus(result.agentId, 'paused');
    expect(updated.status).toBe('paused');

    const fetched = orchestrator.getAgent(result.agentId);
    expect(fetched.status).toBe('paused');
  });
});

// ============================================================================
// Strategy Registry
// ============================================================================

describe('AgentOrchestrator — strategy registry', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should list all 5 strategies', () => {
    const strategies = orchestrator.listStrategies();
    expect(strategies).toHaveLength(5);
    const ids = strategies.map((s) => s.id);
    expect(ids).toContain('trading');
    expect(ids).toContain('yield');
    expect(ids).toContain('arbitrage');
    expect(ids).toContain('demo');
    expect(ids).toContain('custom');
  });

  it('should get a specific strategy by ID', () => {
    const strategy = orchestrator.getStrategy('trading');
    expect(strategy).toBeDefined();
    expect(strategy!.id).toBe('trading');
    expect(strategy!.displayName).toBeDefined();
    expect(strategy!.riskLevel).toBeDefined();
  });

  it('should return undefined for unknown strategy', () => {
    const strategy = orchestrator.getStrategy('unknown' as AgentStrategy);
    expect(strategy).toBeUndefined();
  });
});

// ============================================================================
// Health & Metrics
// ============================================================================

describe('AgentOrchestrator — health and metrics', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should report healthy when enabled', () => {
    const health = orchestrator.getHealth();
    expect(health.overall).toBe('healthy');
    expect(health.running).toBe(true);
    expect(health.lastCheck).toBeInstanceOf(Date);
  });

  it('should report unhealthy when disabled', () => {
    const disabled = createAgentOrchestrator({ enabled: false });
    const health = disabled.getHealth();
    expect(health.overall).toBe('unhealthy');
    expect(health.running).toBe(false);
  });

  it('should track metrics after agent creation', async () => {
    await orchestrator.createAgent(makeInput({ userId: 'metric_user' }));
    await orchestrator.createAgent(makeInput({ userId: 'metric_user_2' }));

    const metrics = orchestrator.getMetrics();
    expect(metrics.totalAgentsCreated).toBe(2);
    expect(metrics.activeAgents).toBe(2);
    expect(metrics.successfulCreations).toBe(2);
    expect(metrics.failedCreations).toBe(0);
    expect(metrics.avgCreationTimeMs).toBeGreaterThan(0);
  });

  it('should count unique users in metrics', async () => {
    await orchestrator.createAgent(makeInput({ userId: 'u1' }));
    await orchestrator.createAgent(makeInput({ userId: 'u1' }));
    await orchestrator.createAgent(makeInput({ userId: 'u2' }));

    const metrics = orchestrator.getMetrics();
    expect(metrics.totalUsers).toBe(2);
  });

  it('should not count terminated agents as active', async () => {
    const r = await orchestrator.createAgent(makeInput({ userId: 'term_active' }));
    await orchestrator.createAgent(makeInput({ userId: 'still_active' }));

    await orchestrator.terminateAgent(r.agentId);

    const metrics = orchestrator.getMetrics();
    expect(metrics.activeAgents).toBe(1);
  });
});

// ============================================================================
// Audit Log
// ============================================================================

describe('AgentOrchestrator — audit log', () => {
  it('should record audit entries when enabled', async () => {
    const orchestrator = makeOrchestrator({
      security: { maxCreationsPerUserPerHour: 0, encryptStoredKeys: false, enableAuditLog: true },
    });

    const result = await orchestrator.createAgent(makeInput({ userId: 'audit_user' }));
    await orchestrator.terminateAgent(result.agentId);

    const log = orchestrator.getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log.some((e) => e.action === 'agent_created')).toBe(true);
    expect(log.some((e) => e.action === 'agent_terminated')).toBe(true);
  });

  it('should respect limit parameter in getAuditLog', async () => {
    const orchestrator = makeOrchestrator({
      security: { maxCreationsPerUserPerHour: 0, encryptStoredKeys: false, enableAuditLog: true },
    });

    for (let i = 0; i < 5; i++) {
      await orchestrator.createAgent(makeInput({ userId: `audit_limit_user_${i}` }));
    }

    const log = orchestrator.getAuditLog(3);
    expect(log.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// Event System
// ============================================================================

describe('AgentOrchestrator — events', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = makeOrchestrator();
  });

  it('should emit agent.creation_started event', async () => {
    const events: OrchestratorEvent[] = [];
    orchestrator.subscribe((e) => events.push(e));

    await orchestrator.createAgent(makeInput({ userId: 'event_user' }));

    expect(events.some((e) => e.type === 'agent.creation_started')).toBe(true);
  });

  it('should emit agent.creation_completed event', async () => {
    const events: OrchestratorEvent[] = [];
    orchestrator.subscribe((e) => events.push(e));

    await orchestrator.createAgent(makeInput({ userId: 'event_user_2' }));

    const completed = events.find((e) => e.type === 'agent.creation_completed');
    expect(completed).toBeDefined();
    expect(completed!.agentId).toBeDefined();
    expect(completed!.userId).toBe('event_user_2');
  });

  it('should emit agent.terminated event on termination', async () => {
    const events: OrchestratorEvent[] = [];
    orchestrator.subscribe((e) => events.push(e));

    const result = await orchestrator.createAgent(makeInput({ userId: 'event_user_3' }));
    await orchestrator.terminateAgent(result.agentId);

    expect(events.some((e) => e.type === 'agent.terminated')).toBe(true);
  });

  it('should emit agent.status_changed event on status update', async () => {
    const events: OrchestratorEvent[] = [];
    orchestrator.subscribe((e) => events.push(e));

    const result = await orchestrator.createAgent(makeInput({ userId: 'event_user_4' }));
    orchestrator.updateAgentStatus(result.agentId, 'paused');

    const statusEvent = events.find((e) => e.type === 'agent.status_changed');
    expect(statusEvent).toBeDefined();
    expect(statusEvent!.data).toMatchObject({ newStatus: 'paused' });
  });

  it('should allow unsubscribing from events', async () => {
    const events: OrchestratorEvent[] = [];
    const unsubscribe = orchestrator.subscribe((e) => events.push(e));

    unsubscribe();
    await orchestrator.createAgent(makeInput({ userId: 'event_unsub' }));

    expect(events).toHaveLength(0);
  });

  it('should support multiple subscribers', async () => {
    const events1: OrchestratorEvent[] = [];
    const events2: OrchestratorEvent[] = [];
    orchestrator.subscribe((e) => events1.push(e));
    orchestrator.subscribe((e) => events2.push(e));

    await orchestrator.createAgent(makeInput({ userId: 'multi_sub' }));

    expect(events1.length).toBeGreaterThan(0);
    expect(events2.length).toBe(events1.length);
  });
});

// ============================================================================
// AgentOrchestratorError
// ============================================================================

describe('AgentOrchestratorError', () => {
  it('should be an instance of Error', () => {
    const err = new AgentOrchestratorError('test message', 'AGENT_NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AgentOrchestratorError);
  });

  it('should preserve code and metadata', () => {
    const err = new AgentOrchestratorError('bad', 'RATE_LIMIT_EXCEEDED', { limit: 5 });
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.metadata).toEqual({ limit: 5 });
    expect(err.name).toBe('AgentOrchestratorError');
  });
});

// ============================================================================
// AgentOrchestratorApi — REST Endpoints
// ============================================================================

describe('AgentOrchestratorApi', () => {
  let api: AgentOrchestratorApi;

  beforeEach(() => {
    api = createAgentOrchestratorApi({
      security: { maxCreationsPerUserPerHour: 0, encryptStoredKeys: false, enableAuditLog: false },
      // Issue #330: opt out of the now-default-on KYC gate so the API tests
      // remain focused on routing rather than KYC fixtures.
      kycEnforcement: { enabled: false, mode: 'testnet' },
    });
  });

  // POST /agents
  describe('POST /agents — create agent', () => {
    it('should return 201 on successful creation', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: {
          userId: 'api_user_123',
          strategy: 'trading',
          telegram: true,
          tonWallet: true,
          environment: 'demo',
        },
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const data = response.body.data as Record<string, unknown>;
      expect(data.agentId).toBeDefined();
      expect(data.telegramBot).toBeDefined();
      expect(data.walletAddress).toBeDefined();
      expect(data.status).toBe('active');
    });

    it('should return 400 if userId missing', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { strategy: 'demo', environment: 'demo' },
      });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if strategy missing', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'u1', environment: 'demo' },
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 if environment missing', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'u1', strategy: 'demo' },
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 with no body', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid strategy', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'u1', strategy: 'invalid', environment: 'demo' },
      });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should include timestamp in response body', async () => {
      const response = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'ts_user', strategy: 'demo', environment: 'demo' },
      });
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  // GET /agents
  describe('GET /agents — list all agents', () => {
    it('should return 200 with agents array', async () => {
      await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'list_user', strategy: 'demo', environment: 'demo' },
      });

      const response = await api.handle({ method: 'GET', path: '/agents' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data as { agents: unknown[]; total: number };
      expect(Array.isArray(data.agents)).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /agents/:agentId
  describe('GET /agents/:agentId — get agent', () => {
    it('should return 200 with agent data', async () => {
      const created = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'get_user', strategy: 'demo', environment: 'demo' },
      });
      const agentId = (created.body.data as Record<string, unknown>).agentId as string;

      const response = await api.handle({ method: 'GET', path: `/agents/${agentId}` });
      expect(response.status).toBe(200);
      expect((response.body.data as Record<string, unknown>).agentId).toBe(agentId);
    });

    it('should return 404 for unknown agent', async () => {
      const response = await api.handle({ method: 'GET', path: '/agents/unknown_xyz' });
      expect(response.status).toBe(404);
    });
  });

  // GET /agents/user/:userId
  describe('GET /agents/user/:userId — list agents by user', () => {
    it('should return agents for the user', async () => {
      const userId = 'user_by_filter';
      await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId, strategy: 'demo', environment: 'demo' },
      });

      const response = await api.handle({ method: 'GET', path: `/agents/user/${userId}` });
      expect(response.status).toBe(200);

      const data = response.body.data as { agents: unknown[]; userId: string };
      expect(data.userId).toBe(userId);
      expect(data.agents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // GET /agents/strategies
  describe('GET /agents/strategies — list strategies', () => {
    it('should return all strategy templates', async () => {
      const response = await api.handle({ method: 'GET', path: '/agents/strategies' });
      expect(response.status).toBe(200);

      const data = response.body.data as { strategies: unknown[]; total: number };
      expect(data.strategies.length).toBe(5);
      expect(data.total).toBe(5);
    });
  });

  // GET /agents/health
  describe('GET /agents/health — health check', () => {
    it('should return 200 when healthy', async () => {
      const response = await api.handle({ method: 'GET', path: '/agents/health' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const health = response.body.data as { overall: string };
      expect(health.overall).toBe('healthy');
    });
  });

  // DELETE /agents/:agentId
  describe('DELETE /agents/:agentId — terminate agent', () => {
    it('should terminate the agent and return 200', async () => {
      const created = await api.handle({
        method: 'POST',
        path: '/agents',
        body: { userId: 'del_user', strategy: 'demo', environment: 'demo' },
      });
      const agentId = (created.body.data as Record<string, unknown>).agentId as string;

      const response = await api.handle({ method: 'DELETE', path: `/agents/${agentId}` });
      expect(response.status).toBe(200);
      expect((response.body.data as Record<string, unknown>).terminated).toBe(true);

      // Verify it's terminated
      const getResponse = await api.handle({ method: 'GET', path: `/agents/${agentId}` });
      const agent = getResponse.body.data as { status: string };
      expect(agent.status).toBe('terminated');
    });

    it('should return 404 when terminating unknown agent', async () => {
      const response = await api.handle({ method: 'DELETE', path: '/agents/unknown_xyz' });
      expect(response.status).toBe(404);
    });
  });

  // Unknown routes
  describe('Unknown routes', () => {
    it('should return 404 for unknown route', async () => {
      const response = await api.handle({ method: 'GET', path: '/unknown/route' });
      expect(response.status).toBe(404);
    });

    it('should return 404 for unsupported method', async () => {
      const response = await api.handle({ method: 'PUT', path: '/agents' });
      expect(response.status).toBe(404);
    });
  });

  // getOrchestrator
  describe('getOrchestrator', () => {
    it('should expose the underlying orchestrator', () => {
      const orchestrator = api.getOrchestrator();
      expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    });
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('createAgentOrchestrator', () => {
  it('should create with default config', () => {
    const orchestrator = createAgentOrchestrator();
    expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    expect(orchestrator.getHealth().overall).toBe('healthy');
  });

  it('should accept config overrides', () => {
    const orchestrator = createAgentOrchestrator({ maxAgentsPerUser: 3 });
    expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
  });
});

describe('createAgentOrchestratorApi', () => {
  it('should create from default config', () => {
    const api = createAgentOrchestratorApi();
    expect(api).toBeInstanceOf(AgentOrchestratorApi);
  });

  it('should create from existing orchestrator', () => {
    const orchestrator = makeOrchestrator();
    const api = createAgentOrchestratorApi(orchestrator);
    expect(api.getOrchestrator()).toBe(orchestrator);
  });

  it('should create from config object', () => {
    const api = createAgentOrchestratorApi({ maxAgentsPerUser: 5 });
    expect(api).toBeInstanceOf(AgentOrchestratorApi);
  });
});
