/**
 * Tests for the Agent Manager API (Issue #213)
 *
 * Covers:
 * - InMemoryAgentStorage: create, find, update, delete, list operations
 * - AgentManagerService: lifecycle operations (create, configure, start, pause, resume, stop, delete)
 * - AgentManagerApi: all REST endpoints, error paths, routing
 * - Event system: lifecycle events, unsubscribe
 * - AgentError: instanceof, code, metadata
 * - Factory functions: createAgentManagerService, createAgentManagerApi
 * - Multi-agent scaling scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  InMemoryAgentStorage,
  AgentManagerService,
  AgentManagerApi,
  AgentError,
  createAgentStorage,
  createDemoAgentStorage,
  createAgentManagerService,
  createAgentManagerApi,
  createAgentManagerApiWithConfig,
  DEFAULT_AGENT_MANAGER_CONFIG,
  toAgentSummary,
} from '../../core/agents/runtime';

import type {
  AgentRecord,
  AgentEvent,
  AgentApiRequest,
  CreateAgentRequest,
  ConfigureAgentRequest,
  AgentStorage,
} from '../../core/agents/runtime';

// ============================================================================
// Test Helpers
// ============================================================================

function makeFreshStorage(): AgentStorage {
  return createAgentStorage();
}

function makeRecord(overrides: Partial<AgentRecord> = {}): AgentRecord {
  const now = new Date();
  return {
    agent_id: 'agent_test',
    name: 'Test Agent',
    strategy: 'momentum',
    status: 'CREATED',
    initial_balance: 10000,
    base_asset: 'USDT',
    pairs: ['TON/USDT'],
    config: undefined,
    execution_interval: '10s',
    owner_id: 'test_user',
    portfolio_value: 10000,
    trades_executed: 0,
    created_at: now,
    updated_at: now,
    started_at: null,
    stopped_at: null,
    error_message: null,
    ...overrides,
  };
}

function makeService(records: AgentRecord[] = []): AgentManagerService {
  const storage = makeFreshStorage();
  for (const r of records) storage.create(r);
  return new AgentManagerService(storage, { enable_events: true });
}

function makeRequest(
  method: AgentApiRequest['method'],
  path: string,
  body?: unknown
): AgentApiRequest {
  return { method, path, body };
}

function makeCreateRequest(overrides: Partial<CreateAgentRequest> = {}): CreateAgentRequest {
  return {
    name: 'Test Agent',
    strategy: 'momentum',
    initial_balance: 10000,
    base_asset: 'USDT',
    pairs: ['TON/USDT'],
    ...overrides,
  };
}

// ============================================================================
// DEFAULT_AGENT_MANAGER_CONFIG
// ============================================================================

describe('DEFAULT_AGENT_MANAGER_CONFIG', () => {
  it('should be enabled by default', () => {
    expect(DEFAULT_AGENT_MANAGER_CONFIG.enabled).toBe(true);
  });

  it('should have a positive max_agents limit', () => {
    expect(DEFAULT_AGENT_MANAGER_CONFIG.max_agents).toBeGreaterThan(0);
  });

  it('should have events enabled', () => {
    expect(DEFAULT_AGENT_MANAGER_CONFIG.enable_events).toBe(true);
  });

  it('should have a default execution interval', () => {
    expect(DEFAULT_AGENT_MANAGER_CONFIG.default_execution_interval).toBe('10s');
  });
});

// ============================================================================
// InMemoryAgentStorage
// ============================================================================

describe('InMemoryAgentStorage', () => {
  let storage: InMemoryAgentStorage;

  beforeEach(() => {
    storage = new InMemoryAgentStorage();
  });

  it('should start empty', () => {
    expect(storage.count()).toBe(0);
    expect(storage.listAll()).toHaveLength(0);
  });

  it('should create a new agent', () => {
    const record = makeRecord();
    storage.create(record);
    expect(storage.count()).toBe(1);
    expect(storage.exists(record.agent_id)).toBe(true);
  });

  it('should throw when creating a duplicate ID', () => {
    storage.create(makeRecord({ agent_id: 'dup' }));
    expect(() => storage.create(makeRecord({ agent_id: 'dup' }))).toThrow(AgentError);
  });

  it('should find an agent by ID', () => {
    storage.create(makeRecord({ agent_id: 'abc' }));
    const found = storage.find('abc');
    expect(found).not.toBeNull();
    expect(found?.agent_id).toBe('abc');
  });

  it('should return null for unknown ID', () => {
    expect(storage.find('no_such_id')).toBeNull();
  });

  it('should throw AGENT_NOT_FOUND in require()', () => {
    expect(() => storage.require('missing')).toThrow(AgentError);
    try {
      storage.require('missing');
    } catch (e) {
      expect(e).toBeInstanceOf(AgentError);
      expect((e as AgentError).code).toBe('AGENT_NOT_FOUND');
    }
  });

  it('should update an existing agent', () => {
    storage.create(makeRecord({ agent_id: 'upd', status: 'CREATED' }));
    const updated = storage.update('upd', { status: 'CONFIGURED' });
    expect(updated.status).toBe('CONFIGURED');
    expect(storage.find('upd')?.status).toBe('CONFIGURED');
  });

  it('should not allow updating agent_id', () => {
    storage.create(makeRecord({ agent_id: 'original' }));
    const updated = storage.update('original', { agent_id: 'changed' } as Partial<AgentRecord>);
    expect(updated.agent_id).toBe('original');
  });

  it('should delete an agent', () => {
    storage.create(makeRecord({ agent_id: 'del' }));
    storage.delete('del');
    expect(storage.exists('del')).toBe(false);
  });

  it('should throw when deleting non-existent agent', () => {
    expect(() => storage.delete('missing')).toThrow(AgentError);
  });

  it('should return a copy from find() so mutations do not affect storage', () => {
    storage.create(makeRecord({ agent_id: 'copy_test', status: 'CREATED' }));
    const found = storage.find('copy_test')!;
    found.status = 'RUNNING';
    expect(storage.find('copy_test')?.status).toBe('CREATED');
  });

  it('should list agents by status', () => {
    storage.create(makeRecord({ agent_id: 'a1', status: 'RUNNING' }));
    storage.create(makeRecord({ agent_id: 'a2', status: 'STOPPED' }));
    storage.create(makeRecord({ agent_id: 'a3', status: 'RUNNING' }));

    const running = storage.listByStatus('RUNNING');
    expect(running).toHaveLength(2);
    expect(running.every(r => r.status === 'RUNNING')).toBe(true);
  });

  it('should list agents by owner', () => {
    storage.create(makeRecord({ agent_id: 'a1', owner_id: 'user1' }));
    storage.create(makeRecord({ agent_id: 'a2', owner_id: 'user2' }));
    storage.create(makeRecord({ agent_id: 'a3', owner_id: 'user1' }));

    const user1Agents = storage.listByOwner('user1');
    expect(user1Agents).toHaveLength(2);
    expect(user1Agents.every(r => r.owner_id === 'user1')).toBe(true);
  });

  it('should clear all agents', () => {
    storage.create(makeRecord({ agent_id: 'a1' }));
    storage.create(makeRecord({ agent_id: 'a2' }));
    storage.clear();
    expect(storage.count()).toBe(0);
  });
});

// ============================================================================
// toAgentSummary
// ============================================================================

describe('toAgentSummary', () => {
  it('should project the correct fields', () => {
    const record = makeRecord({ agent_id: 'sum', portfolio_value: 12000 });
    const summary = toAgentSummary(record);
    expect(summary.agent_id).toBe('sum');
    expect(summary.portfolio_value).toBe(12000);
    expect(summary).toHaveProperty('status');
    expect(summary).toHaveProperty('strategy');
    expect(summary).not.toHaveProperty('config');
    expect(summary).not.toHaveProperty('trades_executed');
  });
});

// ============================================================================
// AgentManagerService - createAgent
// ============================================================================

describe('AgentManagerService - createAgent', () => {
  it('should create a new agent with CREATED status', () => {
    const service = makeService([]);
    const result = service.createAgent(makeCreateRequest());
    expect(result.status).toBe('CREATED');
    expect(result.agent_id).toBeTruthy();
  });

  it('should validate required fields', () => {
    const service = makeService([]);

    expect(() => service.createAgent({ ...makeCreateRequest(), name: '' })).toThrow(AgentError);
    expect(() => service.createAgent({ ...makeCreateRequest(), strategy: '' })).toThrow(AgentError);
    expect(() => service.createAgent({ ...makeCreateRequest(), initial_balance: 0 })).toThrow(AgentError);
    expect(() => service.createAgent({ ...makeCreateRequest(), pairs: [] })).toThrow(AgentError);
  });

  it('should throw when max agents reached', () => {
    const storage = makeFreshStorage();
    const service = new AgentManagerService(storage, { max_agents: 1 });
    service.createAgent(makeCreateRequest());
    expect(() => service.createAgent(makeCreateRequest())).toThrow(AgentError);
    try {
      service.createAgent(makeCreateRequest());
    } catch (e) {
      expect((e as AgentError).code).toBe('MAX_AGENTS_REACHED');
    }
  });
});

// ============================================================================
// AgentManagerService - configureAgent
// ============================================================================

describe('AgentManagerService - configureAgent', () => {
  it('should configure a CREATED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'conf', status: 'CREATED' })]);
    const result = service.configureAgent('conf', {
      strategy_params: { lookback_period: 20 },
      risk_params: { max_position_size: 0.1 },
    });
    expect(result.status).toBe('CONFIGURED');
    expect(result.config.strategy_params?.lookback_period).toBe(20);
  });

  it('should allow reconfiguring a CONFIGURED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'reconf', status: 'CONFIGURED' })]);
    const result = service.configureAgent('reconf', {
      strategy_params: { lookback_period: 30 },
    });
    expect(result.status).toBe('CONFIGURED');
  });

  it('should not allow configuring a RUNNING agent', () => {
    const service = makeService([makeRecord({ agent_id: 'run', status: 'RUNNING' })]);
    expect(() => service.configureAgent('run', {})).toThrow(AgentError);
  });
});

// ============================================================================
// AgentManagerService - startAgent
// ============================================================================

describe('AgentManagerService - startAgent', () => {
  it('should start a CONFIGURED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'start', status: 'CONFIGURED' })]);
    const result = service.startAgent('start');
    expect(result.status).toBe('RUNNING');
  });

  it('should start a STOPPED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'restart', status: 'STOPPED' })]);
    const result = service.startAgent('restart');
    expect(result.status).toBe('RUNNING');
  });

  it('should throw when starting a CREATED agent (not configured)', () => {
    const service = makeService([makeRecord({ agent_id: 'unconfigured', status: 'CREATED' })]);
    expect(() => service.startAgent('unconfigured')).toThrow(AgentError);
    try {
      service.startAgent('unconfigured');
    } catch (e) {
      expect((e as AgentError).code).toBe('AGENT_NOT_CONFIGURED');
    }
  });

  it('should throw AGENT_ALREADY_RUNNING when agent is running', () => {
    const service = makeService([makeRecord({ agent_id: 'already', status: 'RUNNING' })]);
    expect(() => service.startAgent('already')).toThrow(AgentError);
    try {
      service.startAgent('already');
    } catch (e) {
      expect((e as AgentError).code).toBe('AGENT_ALREADY_RUNNING');
    }
  });

  it('should throw AGENT_NOT_FOUND for unknown agent', () => {
    const service = makeService([]);
    expect(() => service.startAgent('ghost')).toThrow(AgentError);
  });

  it('should throw INVALID_AGENT_ID for empty string', () => {
    const service = makeService([]);
    expect(() => service.startAgent('')).toThrow(AgentError);
    try {
      service.startAgent('');
    } catch (e) {
      expect((e as AgentError).code).toBe('INVALID_AGENT_ID');
    }
  });
});

// ============================================================================
// AgentManagerService - pauseAgent
// ============================================================================

describe('AgentManagerService - pauseAgent', () => {
  it('should pause a RUNNING agent', () => {
    const service = makeService([makeRecord({ agent_id: 'pause', status: 'RUNNING' })]);
    const result = service.pauseAgent('pause');
    expect(result.status).toBe('PAUSED');
  });

  it('should throw AGENT_ALREADY_PAUSED when agent is paused', () => {
    const service = makeService([makeRecord({ agent_id: 'paused', status: 'PAUSED' })]);
    expect(() => service.pauseAgent('paused')).toThrow(AgentError);
    try {
      service.pauseAgent('paused');
    } catch (e) {
      expect((e as AgentError).code).toBe('AGENT_ALREADY_PAUSED');
    }
  });

  it('should not allow pausing a STOPPED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'stopped', status: 'STOPPED' })]);
    expect(() => service.pauseAgent('stopped')).toThrow(AgentError);
  });
});

// ============================================================================
// AgentManagerService - resumeAgent
// ============================================================================

describe('AgentManagerService - resumeAgent', () => {
  it('should resume a PAUSED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'resume', status: 'PAUSED' })]);
    const result = service.resumeAgent('resume');
    expect(result.status).toBe('RUNNING');
  });

  it('should not allow resuming a RUNNING agent', () => {
    const service = makeService([makeRecord({ agent_id: 'running', status: 'RUNNING' })]);
    expect(() => service.resumeAgent('running')).toThrow(AgentError);
  });

  it('should not allow resuming a STOPPED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'stopped', status: 'STOPPED' })]);
    expect(() => service.resumeAgent('stopped')).toThrow(AgentError);
  });
});

// ============================================================================
// AgentManagerService - stopAgent
// ============================================================================

describe('AgentManagerService - stopAgent', () => {
  it('should stop a RUNNING agent', () => {
    const service = makeService([makeRecord({ agent_id: 'stop', status: 'RUNNING' })]);
    const result = service.stopAgent('stop');
    expect(result.status).toBe('STOPPED');
  });

  it('should stop a PAUSED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'stop_paused', status: 'PAUSED' })]);
    const result = service.stopAgent('stop_paused');
    expect(result.status).toBe('STOPPED');
  });

  it('should stop an ERROR agent', () => {
    const service = makeService([makeRecord({ agent_id: 'stop_err', status: 'ERROR' })]);
    const result = service.stopAgent('stop_err');
    expect(result.status).toBe('STOPPED');
  });

  it('should throw AGENT_ALREADY_STOPPED when agent is stopped', () => {
    const service = makeService([makeRecord({ agent_id: 'already_stopped', status: 'STOPPED' })]);
    expect(() => service.stopAgent('already_stopped')).toThrow(AgentError);
    try {
      service.stopAgent('already_stopped');
    } catch (e) {
      expect((e as AgentError).code).toBe('AGENT_ALREADY_STOPPED');
    }
  });
});

// ============================================================================
// AgentManagerService - deleteAgent
// ============================================================================

describe('AgentManagerService - deleteAgent', () => {
  it('should delete a STOPPED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'del', status: 'STOPPED' })]);
    const result = service.deleteAgent('del');
    expect(result.message).toContain('deleted');
  });

  it('should delete a CREATED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'del_created', status: 'CREATED' })]);
    const result = service.deleteAgent('del_created');
    expect(result.message).toContain('deleted');
  });

  it('should delete an ERROR agent', () => {
    const service = makeService([makeRecord({ agent_id: 'del_error', status: 'ERROR' })]);
    const result = service.deleteAgent('del_error');
    expect(result.message).toContain('deleted');
  });

  it('should not delete a RUNNING agent', () => {
    const service = makeService([makeRecord({ agent_id: 'del_running', status: 'RUNNING' })]);
    expect(() => service.deleteAgent('del_running')).toThrow(AgentError);
  });

  it('should not delete a PAUSED agent', () => {
    const service = makeService([makeRecord({ agent_id: 'del_paused', status: 'PAUSED' })]);
    expect(() => service.deleteAgent('del_paused')).toThrow(AgentError);
  });
});

// ============================================================================
// AgentManagerService - listAgents / getAgentDetails
// ============================================================================

describe('AgentManagerService - queries', () => {
  it('should list all agents', () => {
    const service = makeService([
      makeRecord({ agent_id: 'a1' }),
      makeRecord({ agent_id: 'a2' }),
    ]);
    const result = service.listAgents();
    expect(result.total).toBe(2);
    expect(result.agents).toHaveLength(2);
  });

  it('should filter by owner_id', () => {
    const service = makeService([
      makeRecord({ agent_id: 'a1', owner_id: 'user1' }),
      makeRecord({ agent_id: 'a2', owner_id: 'user2' }),
    ]);
    const result = service.listAgents('user1');
    expect(result.total).toBe(1);
    expect(result.agents[0].owner_id).toBe('user1');
  });

  it('should get agent details', () => {
    const service = makeService([makeRecord({ agent_id: 'details', strategy: 'arbitrage' })]);
    const details = service.getAgentDetails('details');
    expect(details.agent_id).toBe('details');
    expect(details.strategy).toBe('arbitrage');
    expect(details.performance).toBeDefined();
  });

  it('should throw for deleted agent details', () => {
    const service = makeService([makeRecord({ agent_id: 'deleted', status: 'DELETED' })]);
    expect(() => service.getAgentDetails('deleted')).toThrow(AgentError);
    try {
      service.getAgentDetails('deleted');
    } catch (e) {
      expect((e as AgentError).code).toBe('AGENT_DELETED');
    }
  });
});

// ============================================================================
// AgentManagerService - Event System
// ============================================================================

describe('AgentManagerService - events', () => {
  it('should emit agent_created event when agent is created', () => {
    const events: AgentEvent[] = [];
    const service = makeService([]);
    service.subscribe(e => events.push(e));
    service.createAgent(makeCreateRequest());
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('agent_created');
    expect(events[0].new_status).toBe('CREATED');
  });

  it('should emit agent_configured event when agent is configured', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_conf', status: 'CREATED' })]);
    service.subscribe(e => events.push(e));
    service.configureAgent('ev_conf', {});
    expect(events[0].type).toBe('agent_configured');
    expect(events[0].new_status).toBe('CONFIGURED');
  });

  it('should emit agent_started event when agent is started', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_start', status: 'CONFIGURED' })]);
    service.subscribe(e => events.push(e));
    service.startAgent('ev_start');
    expect(events[0].type).toBe('agent_started');
    expect(events[0].new_status).toBe('RUNNING');
  });

  it('should emit agent_paused event when agent is paused', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_pause', status: 'RUNNING' })]);
    service.subscribe(e => events.push(e));
    service.pauseAgent('ev_pause');
    expect(events[0].type).toBe('agent_paused');
  });

  it('should emit agent_resumed event when agent is resumed', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_resume', status: 'PAUSED' })]);
    service.subscribe(e => events.push(e));
    service.resumeAgent('ev_resume');
    expect(events[0].type).toBe('agent_resumed');
  });

  it('should emit agent_stopped event when agent is stopped', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_stop', status: 'RUNNING' })]);
    service.subscribe(e => events.push(e));
    service.stopAgent('ev_stop');
    expect(events[0].type).toBe('agent_stopped');
  });

  it('should emit agent_deleted event when agent is deleted', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_del', status: 'STOPPED' })]);
    service.subscribe(e => events.push(e));
    service.deleteAgent('ev_del');
    expect(events[0].type).toBe('agent_deleted');
  });

  it('should stop emitting after unsubscribe', () => {
    const events: AgentEvent[] = [];
    const service = makeService([]);
    const unsub = service.subscribe(e => events.push(e));
    unsub();
    service.createAgent(makeCreateRequest());
    expect(events).toHaveLength(0);
  });

  it('should include previous_status in transition events', () => {
    const events: AgentEvent[] = [];
    const service = makeService([makeRecord({ agent_id: 'ev_prev', status: 'CONFIGURED' })]);
    service.subscribe(e => events.push(e));
    service.startAgent('ev_prev');
    expect(events[0].previous_status).toBe('CONFIGURED');
    expect(events[0].new_status).toBe('RUNNING');
  });
});

// ============================================================================
// AgentError
// ============================================================================

describe('AgentError', () => {
  it('should be instanceof AgentError and Error', () => {
    const err = new AgentError('test', 'AGENT_NOT_FOUND');
    expect(err).toBeInstanceOf(AgentError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should expose code and message', () => {
    const err = new AgentError('oops', 'INVALID_AGENT_ID', { id: '123' });
    expect(err.code).toBe('INVALID_AGENT_ID');
    expect(err.message).toBe('oops');
    expect(err.metadata).toEqual({ id: '123' });
  });

  it('should have name AgentError', () => {
    const err = new AgentError('x', 'OPERATION_FAILED');
    expect(err.name).toBe('AgentError');
  });
});

// ============================================================================
// AgentManagerApi - POST /agents
// ============================================================================

describe('AgentManagerApi - POST /agents', () => {
  it('should return 201 and create an agent', async () => {
    const api = createAgentManagerApiWithConfig(makeFreshStorage());
    const res = await api.handle(makeRequest('POST', '/agents', makeCreateRequest()));
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('agent_id');
    expect(res.body.data).toHaveProperty('status', 'CREATED');
  });

  it('should return 400 for invalid request', async () => {
    const api = createAgentManagerApiWithConfig(makeFreshStorage());
    const res = await api.handle(makeRequest('POST', '/agents', { name: '' }));
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================================
// AgentManagerApi - POST /agents/:id/config
// ============================================================================

describe('AgentManagerApi - POST /agents/:id/config', () => {
  it('should return 200 and configure an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'conf_api', status: 'CREATED' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/conf_api/config', {
      strategy_params: { lookback_period: 20 },
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'CONFIGURED');
  });

  it('should return 404 for unknown agent', async () => {
    const api = createAgentManagerApiWithConfig(makeFreshStorage());
    const res = await api.handle(makeRequest('POST', '/agents/ghost/config', {}));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// AgentManagerApi - POST /agents/:id/start
// ============================================================================

describe('AgentManagerApi - POST /agents/:id/start', () => {
  it('should return 200 and start an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'start_api', status: 'CONFIGURED' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/start_api/start'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'RUNNING');
  });

  it('should return 409 when agent is already running', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'running_api', status: 'RUNNING' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/running_api/start'));
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AGENT_ALREADY_RUNNING');
  });
});

// ============================================================================
// AgentManagerApi - POST /agents/:id/pause
// ============================================================================

describe('AgentManagerApi - POST /agents/:id/pause', () => {
  it('should return 200 and pause an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'pause_api', status: 'RUNNING' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/pause_api/pause'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'PAUSED');
  });
});

// ============================================================================
// AgentManagerApi - POST /agents/:id/resume
// ============================================================================

describe('AgentManagerApi - POST /agents/:id/resume', () => {
  it('should return 200 and resume an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'resume_api', status: 'PAUSED' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/resume_api/resume'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'RUNNING');
  });
});

// ============================================================================
// AgentManagerApi - POST /agents/:id/stop
// ============================================================================

describe('AgentManagerApi - POST /agents/:id/stop', () => {
  it('should return 200 and stop an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'stop_api', status: 'RUNNING' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/stop_api/stop'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('status', 'STOPPED');
  });

  it('should return 409 when agent is already stopped', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'stopped_api', status: 'STOPPED' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('POST', '/agents/stopped_api/stop'));
    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('AGENT_ALREADY_STOPPED');
  });
});

// ============================================================================
// AgentManagerApi - DELETE /agents/:id
// ============================================================================

describe('AgentManagerApi - DELETE /agents/:id', () => {
  it('should return 200 and delete an agent', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'del_api', status: 'STOPPED' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('DELETE', '/agents/del_api'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('message');
  });

  it('should return 404 for unknown agent', async () => {
    const api = createAgentManagerApiWithConfig(makeFreshStorage());
    const res = await api.handle(makeRequest('DELETE', '/agents/ghost'));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// AgentManagerApi - GET /agents
// ============================================================================

describe('AgentManagerApi - GET /agents', () => {
  it('should return 200 and list agents', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'lst1' }));
    storage.create(makeRecord({ agent_id: 'lst2' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('GET', '/agents'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('agents');
    expect(res.body.data).toHaveProperty('total', 2);
  });
});

// ============================================================================
// AgentManagerApi - GET /agents/:id
// ============================================================================

describe('AgentManagerApi - GET /agents/:id', () => {
  it('should return 200 and agent details', async () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'get_api', strategy: 'arbitrage' }));
    const api = createAgentManagerApiWithConfig(storage);

    const res = await api.handle(makeRequest('GET', '/agents/get_api'));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('agent_id', 'get_api');
    expect(res.body.data).toHaveProperty('strategy', 'arbitrage');
  });

  it('should return 404 for unknown agent', async () => {
    const api = createAgentManagerApiWithConfig(makeFreshStorage());
    const res = await api.handle(makeRequest('GET', '/agents/ghost'));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// AgentManagerApi - Unknown Routes
// ============================================================================

describe('AgentManagerApi - unknown routes', () => {
  it('should return 404 for GET to unknown path', async () => {
    const api = createAgentManagerApi();
    const res = await api.handle(makeRequest('GET', '/api/unknown'));
    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });

  it('should return 404 for PUT method (not supported)', async () => {
    const api = createAgentManagerApi();
    const res = await api.handle(makeRequest('PUT', '/agents/test'));
    expect(res.statusCode).toBe(404);
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('createAgentManagerService', () => {
  it('should create a service with demo data by default', () => {
    const service = createAgentManagerService();
    const { total } = service.listAgents();
    expect(total).toBeGreaterThan(0);
  });

  it('should create a service with a custom storage', () => {
    const storage = makeFreshStorage();
    storage.create(makeRecord({ agent_id: 'custom' }));
    const service = createAgentManagerService(storage);
    expect(service.listAgents().total).toBe(1);
  });
});

describe('createAgentManagerApi', () => {
  it('should create an API with demo data by default', async () => {
    const api = createAgentManagerApi();
    const res = await api.handle(makeRequest('GET', '/agents'));
    expect(res.statusCode).toBe(200);
    expect((res.body.data as { total: number }).total).toBeGreaterThan(0);
  });

  it('should expose its service via getService()', () => {
    const api = createAgentManagerApi();
    expect(api.getService()).toBeInstanceOf(AgentManagerService);
  });
});

describe('createDemoAgentStorage', () => {
  it('should return storage with pre-populated demo agents', () => {
    const storage = createDemoAgentStorage();
    expect(storage.count()).toBeGreaterThan(0);
  });

  it('should include agents with different statuses', () => {
    const storage = createDemoAgentStorage();
    const statuses = new Set(storage.listAll().map(r => r.status));
    expect(statuses.size).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Multi-Agent Scaling
// ============================================================================

describe('Multi-Agent Scaling', () => {
  it('should handle creating 100 agents', () => {
    const storage = makeFreshStorage();
    const service = new AgentManagerService(storage, { max_agents: 200 });

    for (let i = 0; i < 100; i++) {
      service.createAgent({
        name: `Agent ${i}`,
        strategy: 'momentum',
        initial_balance: 1000,
        base_asset: 'USDT',
        pairs: ['TON/USDT'],
      });
    }

    expect(service.listAgents().total).toBe(100);
  });

  it('should handle concurrent operations on multiple agents', () => {
    const storage = makeFreshStorage();
    const service = new AgentManagerService(storage);

    // Create and configure 10 agents
    const agentIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = service.createAgent({
        name: `Agent ${i}`,
        strategy: 'momentum',
        initial_balance: 1000,
        base_asset: 'USDT',
        pairs: ['TON/USDT'],
      });
      agentIds.push(result.agent_id);
      service.configureAgent(result.agent_id, {
        strategy_params: { lookback_period: 20 },
      });
    }

    // Start all agents
    for (const id of agentIds) {
      service.startAgent(id);
    }

    const running = storage.listByStatus('RUNNING');
    expect(running.length).toBe(10);

    // Pause half
    for (let i = 0; i < 5; i++) {
      service.pauseAgent(agentIds[i]);
    }

    expect(storage.listByStatus('RUNNING').length).toBe(5);
    expect(storage.listByStatus('PAUSED').length).toBe(5);
  });
});

// ============================================================================
// Full Lifecycle Flow
// ============================================================================

describe('Full Agent Lifecycle Flow', () => {
  it('should complete full lifecycle: create -> configure -> start -> pause -> resume -> stop -> delete', async () => {
    const storage = makeFreshStorage();
    const api = createAgentManagerApiWithConfig(storage);

    // 1. Create
    const createRes = await api.handle(makeRequest('POST', '/agents', makeCreateRequest()));
    expect(createRes.statusCode).toBe(201);
    const agentId = (createRes.body.data as { agent_id: string }).agent_id;

    // 2. Configure
    const configRes = await api.handle(makeRequest('POST', `/agents/${agentId}/config`, {
      strategy_params: { lookback_period: 20 },
      risk_params: { max_position_size: 0.1 },
    }));
    expect(configRes.statusCode).toBe(200);
    expect((configRes.body.data as { status: string }).status).toBe('CONFIGURED');

    // 3. Start
    const startRes = await api.handle(makeRequest('POST', `/agents/${agentId}/start`));
    expect(startRes.statusCode).toBe(200);
    expect((startRes.body.data as { status: string }).status).toBe('RUNNING');

    // 4. Pause
    const pauseRes = await api.handle(makeRequest('POST', `/agents/${agentId}/pause`));
    expect(pauseRes.statusCode).toBe(200);
    expect((pauseRes.body.data as { status: string }).status).toBe('PAUSED');

    // 5. Resume
    const resumeRes = await api.handle(makeRequest('POST', `/agents/${agentId}/resume`));
    expect(resumeRes.statusCode).toBe(200);
    expect((resumeRes.body.data as { status: string }).status).toBe('RUNNING');

    // 6. Stop
    const stopRes = await api.handle(makeRequest('POST', `/agents/${agentId}/stop`));
    expect(stopRes.statusCode).toBe(200);
    expect((stopRes.body.data as { status: string }).status).toBe('STOPPED');

    // 7. Delete
    const deleteRes = await api.handle(makeRequest('DELETE', `/agents/${agentId}`));
    expect(deleteRes.statusCode).toBe(200);

    // Verify deleted
    const getRes = await api.handle(makeRequest('GET', `/agents/${agentId}`));
    expect(getRes.statusCode).toBe(404);
  });
});
