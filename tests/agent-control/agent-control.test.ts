/**
 * Tests for the Agent Control API (Issue #185)
 *
 * Covers:
 * - AgentRegistry: register, find, update, list, projections
 * - AgentManager: listAgents, getAgentStatus, startAgent, stopAgent, restartAgent
 * - AgentControlApi: all 5 REST endpoints, error paths, routing
 * - Event system: start/stop/restart events, unsubscribe
 * - AgentControlError: instanceof, code, metadata
 * - Factory functions: createAgentManager, createAgentControlApi
 * - Test cases from Issue #185: start agent, stop agent, restart agent,
 *   invalid agent id, agent already running, agent already stopped,
 *   agent in error state, unknown route
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  AgentRegistry,
  AgentManager,
  AgentControlApi,
  AgentControlError,
  createAgentManager,
  createAgentControlApi,
  createDemoRegistry,
  DEFAULT_AGENT_CONTROL_CONFIG,
} from '../../src/agent-control';

import type {
  AgentControlEvent,
  AgentControlRequest,
  AgentRecord,
} from '../../src/agent-control';

// ============================================================================
// Test Helpers
// ============================================================================

function makeFreshRegistry(): AgentRegistry {
  return new AgentRegistry();
}

function makeRecord(overrides: Partial<AgentRecord> = {}): AgentRecord {
  const now = new Date();
  return {
    id: 'agent_test',
    name: 'Test Agent',
    status: 'stopped',
    strategy: 'trading',
    ownerId: 'user_001',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    lastExecutedAt: null,
    tradesExecuted: 0,
    errorMessage: null,
    ...overrides,
  };
}

function makeManager(records: AgentRecord[] = []): AgentManager {
  const registry = makeFreshRegistry();
  for (const r of records) registry.register(r);
  return new AgentManager(registry);
}

function makeRequest(
  method: AgentControlRequest['method'],
  path: string
): AgentControlRequest {
  return { method, path };
}

// ============================================================================
// DEFAULT_AGENT_CONTROL_CONFIG
// ============================================================================

describe('DEFAULT_AGENT_CONTROL_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_AGENT_CONTROL_CONFIG.enabled).toBe(true);
  });

  it('should have a positive maxAgents limit', () => {
    expect(DEFAULT_AGENT_CONTROL_CONFIG.maxAgents).toBeGreaterThan(0);
  });

  it('should have events enabled', () => {
    expect(DEFAULT_AGENT_CONTROL_CONFIG.enableEvents).toBe(true);
  });
});

// ============================================================================
// AgentRegistry
// ============================================================================

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = makeFreshRegistry();
  });

  it('should start empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.listAll()).toHaveLength(0);
  });

  it('should register a new agent', () => {
    const record = makeRecord();
    registry.register(record);
    expect(registry.size).toBe(1);
  });

  it('should throw when registering a duplicate ID', () => {
    registry.register(makeRecord({ id: 'dup' }));
    expect(() => registry.register(makeRecord({ id: 'dup' }))).toThrow(AgentControlError);
  });

  it('should find an agent by ID', () => {
    registry.register(makeRecord({ id: 'abc' }));
    const found = registry.find('abc');
    expect(found).not.toBeNull();
    expect(found?.id).toBe('abc');
  });

  it('should return null for unknown ID', () => {
    expect(registry.find('no_such_id')).toBeNull();
  });

  it('should throw AGENT_NOT_FOUND in require()', () => {
    expect(() => registry.require('missing')).toThrow(AgentControlError);
    try {
      registry.require('missing');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentControlError);
      expect((e as AgentControlError).code).toBe('AGENT_NOT_FOUND');
    }
  });

  it('should update an existing agent', () => {
    registry.register(makeRecord({ id: 'upd', status: 'stopped' }));
    const updated = registry.update('upd', { status: 'running' });
    expect(updated.status).toBe('running');
    expect(registry.find('upd')?.status).toBe('running');
  });

  it('should return a copy from find() so mutations do not affect registry', () => {
    registry.register(makeRecord({ id: 'copy_test', status: 'stopped' }));
    const found = registry.find('copy_test')!;
    found.status = 'running';  // mutate the copy
    expect(registry.find('copy_test')?.status).toBe('stopped');
  });

  it('toSummary should project the correct fields', () => {
    const record = makeRecord({ id: 'sum' });
    const summary = AgentRegistry.toSummary(record);
    expect(summary).toHaveProperty('id', 'sum');
    expect(summary).toHaveProperty('status');
    expect(summary).toHaveProperty('strategy');
    expect(summary).not.toHaveProperty('startedAt');
    expect(summary).not.toHaveProperty('tradesExecuted');
  });

  it('toStatus should include uptimeSeconds for running agents', () => {
    const startedAt = new Date(Date.now() - 5000);
    const record = makeRecord({ id: 'up', status: 'running', startedAt });
    const status = AgentRegistry.toStatus(record);
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(4);
  });

  it('toStatus should have null uptimeSeconds for stopped agents', () => {
    const record = makeRecord({ id: 'stopped', status: 'stopped' });
    const status = AgentRegistry.toStatus(record);
    expect(status.uptimeSeconds).toBeNull();
  });
});

// ============================================================================
// AgentManager — Queries
// ============================================================================

describe('AgentManager — listAgents', () => {
  it('should return all agents', () => {
    const manager = makeManager([
      makeRecord({ id: 'a1' }),
      makeRecord({ id: 'a2' }),
    ]);
    const { agents, total } = manager.listAgents();
    expect(total).toBe(2);
    expect(agents).toHaveLength(2);
  });

  it('should return zero agents when registry is empty', () => {
    const manager = makeManager([]);
    const { agents, total } = manager.listAgents();
    expect(total).toBe(0);
    expect(agents).toHaveLength(0);
  });
});

describe('AgentManager — getAgentStatus', () => {
  it('should return full status for a known agent', () => {
    const manager = makeManager([makeRecord({ id: 'known', strategy: 'yield' })]);
    const status = manager.getAgentStatus('known');
    expect(status.id).toBe('known');
    expect(status.strategy).toBe('yield');
    expect(status).toHaveProperty('uptimeSeconds');
    expect(status).toHaveProperty('tradesExecuted');
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', () => {
    const manager = makeManager([]);
    expect(() => manager.getAgentStatus('nope')).toThrow(AgentControlError);
    try {
      manager.getAgentStatus('nope');
    } catch (e) {
      expect((e as AgentControlError).code).toBe('AGENT_NOT_FOUND');
    }
  });
});

// ============================================================================
// AgentManager — startAgent
// ============================================================================

describe('AgentManager — startAgent', () => {
  it('should start a stopped agent', () => {
    const manager = makeManager([makeRecord({ id: 'start_me', status: 'stopped' })]);
    const result = manager.startAgent('start_me');
    expect(result.status).toBe('running');
    expect(result.agentId).toBe('start_me');
  });

  it('should start a paused agent', () => {
    const manager = makeManager([makeRecord({ id: 'paused', status: 'paused' })]);
    const result = manager.startAgent('paused');
    expect(result.status).toBe('running');
  });

  it('should start an agent in error state', () => {
    const manager = makeManager([makeRecord({ id: 'err', status: 'error' })]);
    const result = manager.startAgent('err');
    expect(result.status).toBe('running');
  });

  it('should throw AGENT_ALREADY_RUNNING when agent is running', () => {
    const manager = makeManager([makeRecord({ id: 'already', status: 'running' })]);
    expect(() => manager.startAgent('already')).toThrow(AgentControlError);
    try {
      manager.startAgent('already');
    } catch (e) {
      expect((e as AgentControlError).code).toBe('AGENT_ALREADY_RUNNING');
    }
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', () => {
    const manager = makeManager([]);
    expect(() => manager.startAgent('ghost')).toThrow(AgentControlError);
  });

  it('should throw INVALID_AGENT_ID for empty string', () => {
    const manager = makeManager([]);
    expect(() => manager.startAgent('')).toThrow(AgentControlError);
    try {
      manager.startAgent('');
    } catch (e) {
      expect((e as AgentControlError).code).toBe('INVALID_AGENT_ID');
    }
  });
});

// ============================================================================
// AgentManager — stopAgent
// ============================================================================

describe('AgentManager — stopAgent', () => {
  it('should stop a running agent', () => {
    const manager = makeManager([makeRecord({ id: 'stop_me', status: 'running' })]);
    const result = manager.stopAgent('stop_me');
    expect(result.status).toBe('stopped');
  });

  it('should stop a paused agent', () => {
    const manager = makeManager([makeRecord({ id: 'stop_paused', status: 'paused' })]);
    const result = manager.stopAgent('stop_paused');
    expect(result.status).toBe('stopped');
  });

  it('should stop an agent in error state', () => {
    const manager = makeManager([makeRecord({ id: 'stop_err', status: 'error' })]);
    const result = manager.stopAgent('stop_err');
    expect(result.status).toBe('stopped');
  });

  it('should throw AGENT_ALREADY_STOPPED when agent is stopped', () => {
    const manager = makeManager([makeRecord({ id: 'already_stopped', status: 'stopped' })]);
    expect(() => manager.stopAgent('already_stopped')).toThrow(AgentControlError);
    try {
      manager.stopAgent('already_stopped');
    } catch (e) {
      expect((e as AgentControlError).code).toBe('AGENT_ALREADY_STOPPED');
    }
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', () => {
    const manager = makeManager([]);
    expect(() => manager.stopAgent('ghost')).toThrow(AgentControlError);
  });
});

// ============================================================================
// AgentManager — restartAgent
// ============================================================================

describe('AgentManager — restartAgent', () => {
  it('should restart a running agent', () => {
    const manager = makeManager([makeRecord({ id: 'restart_running', status: 'running' })]);
    const result = manager.restartAgent('restart_running');
    expect(result.status).toBe('running');
  });

  it('should restart a stopped agent', () => {
    const manager = makeManager([makeRecord({ id: 'restart_stopped', status: 'stopped' })]);
    const result = manager.restartAgent('restart_stopped');
    expect(result.status).toBe('running');
  });

  it('should restart an agent in error state', () => {
    const manager = makeManager([makeRecord({ id: 'restart_err', status: 'error' })]);
    const result = manager.restartAgent('restart_err');
    expect(result.status).toBe('running');
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', () => {
    const manager = makeManager([]);
    expect(() => manager.restartAgent('ghost')).toThrow(AgentControlError);
  });
});

// ============================================================================
// AgentManager — Event System
// ============================================================================

describe('AgentManager — events', () => {
  it('should emit agent.started event when agent is started', () => {
    const events: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_start', status: 'stopped' })]);
    manager.subscribe(e => events.push(e));
    manager.startAgent('ev_start');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('agent.started');
    expect(events[0].newStatus).toBe('running');
  });

  it('should emit agent.stopped event when agent is stopped', () => {
    const events: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_stop', status: 'running' })]);
    manager.subscribe(e => events.push(e));
    manager.stopAgent('ev_stop');
    expect(events[0].type).toBe('agent.stopped');
    expect(events[0].newStatus).toBe('stopped');
  });

  it('should emit agent.restarted event when agent is restarted', () => {
    const events: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_restart', status: 'running' })]);
    manager.subscribe(e => events.push(e));
    manager.restartAgent('ev_restart');
    expect(events[0].type).toBe('agent.restarted');
  });

  it('should stop emitting after unsubscribe', () => {
    const events: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_unsub', status: 'stopped' })]);
    const unsub = manager.subscribe(e => events.push(e));
    unsub();
    manager.startAgent('ev_unsub');
    expect(events).toHaveLength(0);
  });

  it('should support multiple subscribers', () => {
    const events1: AgentControlEvent[] = [];
    const events2: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_multi', status: 'stopped' })]);
    manager.subscribe(e => events1.push(e));
    manager.subscribe(e => events2.push(e));
    manager.startAgent('ev_multi');
    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('should include previousStatus in the event', () => {
    const events: AgentControlEvent[] = [];
    const manager = makeManager([makeRecord({ id: 'ev_prev', status: 'paused' })]);
    manager.subscribe(e => events.push(e));
    manager.startAgent('ev_prev');
    expect(events[0].previousStatus).toBe('paused');
  });
});

// ============================================================================
// AgentControlError
// ============================================================================

describe('AgentControlError', () => {
  it('should be instanceof AgentControlError and Error', () => {
    const err = new AgentControlError('test', 'AGENT_NOT_FOUND');
    expect(err).toBeInstanceOf(AgentControlError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should expose code and message', () => {
    const err = new AgentControlError('oops', 'INVALID_AGENT_ID', { id: '123' });
    expect(err.code).toBe('INVALID_AGENT_ID');
    expect(err.message).toBe('oops');
    expect(err.metadata).toEqual({ id: '123' });
  });

  it('should have name AgentControlError', () => {
    const err = new AgentControlError('x', 'OPERATION_FAILED');
    expect(err.name).toBe('AgentControlError');
  });
});

// ============================================================================
// AgentControlApi — REST Endpoints
// ============================================================================

describe('AgentControlApi — GET /api/agents', () => {
  it('should return 200 and an agents array', async () => {
    const manager = makeManager([makeRecord({ id: 'lst' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('GET', '/api/agents'));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('agents');
    expect(res.body.data).toHaveProperty('total');
  });

  it('should return total count equal to number of agents', async () => {
    const manager = makeManager([
      makeRecord({ id: 'r1' }),
      makeRecord({ id: 'r2' }),
      makeRecord({ id: 'r3' }),
    ]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('GET', '/api/agents'));
    expect((res.body.data as { total: number }).total).toBe(3);
  });
});

describe('AgentControlApi — GET /api/agents/:id', () => {
  it('should return 200 and the agent status', async () => {
    const manager = makeManager([makeRecord({ id: 'get_me', status: 'running' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('GET', '/api/agents/get_me'));
    expect(res.statusCode).toBe(200);
    expect((res.body.data as { id: string }).id).toBe('get_me');
  });

  it('should return 404 for unknown agent', async () => {
    const api = new AgentControlApi(makeManager([]));
    const res = await api.handle(makeRequest('GET', '/api/agents/no_such'));
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('AgentControlApi — POST /api/agents/:id/start', () => {
  it('should return 200 and running status when agent is stopped', async () => {
    const manager = makeManager([makeRecord({ id: 'start_api', status: 'stopped' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('POST', '/api/agents/start_api/start'));
    expect(res.statusCode).toBe(200);
    expect((res.body.data as { status: string }).status).toBe('running');
  });

  it('should return 409 when agent is already running', async () => {
    const manager = makeManager([makeRecord({ id: 'running_api', status: 'running' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('POST', '/api/agents/running_api/start'));
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('AGENT_ALREADY_RUNNING');
  });

  it('should return 404 for unknown agent', async () => {
    const api = new AgentControlApi(makeManager([]));
    const res = await api.handle(makeRequest('POST', '/api/agents/ghost/start'));
    expect(res.statusCode).toBe(404);
  });
});

describe('AgentControlApi — POST /api/agents/:id/stop', () => {
  it('should return 200 and stopped status when agent is running', async () => {
    const manager = makeManager([makeRecord({ id: 'stop_api', status: 'running' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('POST', '/api/agents/stop_api/stop'));
    expect(res.statusCode).toBe(200);
    expect((res.body.data as { status: string }).status).toBe('stopped');
  });

  it('should return 409 when agent is already stopped', async () => {
    const manager = makeManager([makeRecord({ id: 'already_stopped_api', status: 'stopped' })]);
    const api = new AgentControlApi(manager);
    const res = await api.handle(makeRequest('POST', '/api/agents/already_stopped_api/stop'));
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AGENT_ALREADY_STOPPED');
  });

  it('should return 404 for unknown agent', async () => {
    const api = new AgentControlApi(makeManager([]));
    const res = await api.handle(makeRequest('POST', '/api/agents/ghost/stop'));
    expect(res.statusCode).toBe(404);
  });
});

describe('AgentControlApi — POST /api/agents/:id/restart', () => {
  it('should return 200 and running status from any state', async () => {
    for (const status of ['running', 'stopped', 'paused', 'error'] as const) {
      const manager = makeManager([makeRecord({ id: `restart_${status}`, status })]);
      const api = new AgentControlApi(manager);
      const res = await api.handle(
        makeRequest('POST', `/api/agents/restart_${status}/restart`)
      );
      expect(res.statusCode).toBe(200);
      expect((res.body.data as { status: string }).status).toBe('running');
    }
  });

  it('should return 404 for unknown agent', async () => {
    const api = new AgentControlApi(makeManager([]));
    const res = await api.handle(makeRequest('POST', '/api/agents/ghost/restart'));
    expect(res.statusCode).toBe(404);
  });
});

describe('AgentControlApi — unknown routes', () => {
  it('should return 404 for GET to unknown path', async () => {
    const api = createAgentControlApi();
    const res = await api.handle(makeRequest('GET', '/api/unknown'));
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for DELETE method', async () => {
    const api = createAgentControlApi();
    const res = await api.handle(makeRequest('DELETE', '/api/agents/demo'));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('createAgentManager', () => {
  it('should create a manager with demo data by default', () => {
    const manager = createAgentManager();
    const { total } = manager.listAgents();
    expect(total).toBeGreaterThan(0);
  });

  it('should create a manager with a custom registry', () => {
    const registry = makeFreshRegistry();
    registry.register(makeRecord({ id: 'custom_reg' }));
    const manager = createAgentManager(registry);
    expect(manager.listAgents().total).toBe(1);
  });
});

describe('createAgentControlApi', () => {
  it('should create an API with demo data by default', async () => {
    const api = createAgentControlApi();
    const res = await api.handle(makeRequest('GET', '/api/agents'));
    expect(res.statusCode).toBe(200);
    expect((res.body.data as { total: number }).total).toBeGreaterThan(0);
  });

  it('should expose its manager via getManager()', () => {
    const api = createAgentControlApi();
    expect(api.getManager()).toBeInstanceOf(AgentManager);
  });
});

describe('createDemoRegistry', () => {
  it('should return a registry with pre-populated demo agents', () => {
    const registry = createDemoRegistry();
    expect(registry.size).toBeGreaterThan(0);
  });

  it('should include agents with different statuses', () => {
    const registry = createDemoRegistry();
    const statuses = new Set(registry.listAll().map(r => r.status));
    // Demo data should have at least two distinct statuses
    expect(statuses.size).toBeGreaterThanOrEqual(2);
  });
});
