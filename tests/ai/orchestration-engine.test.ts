/**
 * TONAIAgent - Orchestration Engine Protection Tests (Issue #285)
 *
 * Tests for per-iteration tool call limit, context message limit,
 * and total tool call budget guards in the OrchestrationEngine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CompletionResponse } from '../../core/ai/types';

// ============================================================================
// Module mocks — must be at top level so vitest hoists them before imports
// ============================================================================

// We keep a mutable reference so each test can configure the desired responses.
const routerResponseQueue: CompletionResponse[] = [];
let routerCallIndex = 0;

const routerExecuteMock = vi.fn(async () => {
  const resp =
    routerResponseQueue[routerCallIndex] ??
    routerResponseQueue[routerResponseQueue.length - 1];
  routerCallIndex++;
  return resp;
});

vi.mock('../../core/ai/routing', () => ({
  createAIRouter: vi.fn(() => ({
    execute: routerExecuteMock,
    stream: vi.fn(),
    getAnalytics: vi.fn(() => ({ requests: 0, errors: 0, latency: 0 })),
  })),
  AIRouter: class {},
}));

vi.mock('../../core/ai/memory', () => ({
  createMemoryManager: vi.fn(() => ({
    buildContext: vi.fn(async () => []),
    addToShortTerm: vi.fn(),
    extractAndStore: vi.fn(async () => {}),
  })),
}));

vi.mock('../../core/ai/safety', () => ({
  createSafetyManager: vi.fn(() => ({
    validateRequest: vi.fn(() => []),
    validateResponse: vi.fn(() => []),
    redactOutput: vi.fn((s: string) => s),
  })),
}));

// ============================================================================
// Actual imports (after mocks are set up)
// ============================================================================

import { OrchestrationEngine } from '../../core/ai/orchestration/engine';
import { ProviderRegistry } from '../../core/ai/providers/base';
import {
  AgentConfig,
  ExecutionContext,
  ToolDefinition,
  AIError,
} from '../../core/ai/types';

// ============================================================================
// Helpers
// ============================================================================

function makeRegistry(): ProviderRegistry {
  return new ProviderRegistry();
}

function makeAgent(toolNames: string[] = []): AgentConfig {
  const tools: ToolDefinition[] = toolNames.map((name) => ({
    type: 'function',
    function: {
      name,
      description: `Tool ${name}`,
      parameters: { type: 'object', properties: {}, required: [] },
    },
  }));

  return {
    id: 'test-agent',
    name: 'Test Agent',
    userId: 'user-1',
    systemPrompt: 'You are a test agent.',
    routingConfig: { mode: 'balanced', primaryProvider: 'groq', fallbackChain: [] },
    safetyConfig: {} as AgentConfig['safetyConfig'],
    memoryConfig: {
      enabled: false,
      shortTermCapacity: 10,
      longTermEnabled: false,
      vectorSearch: false,
      contextWindowRatio: 0.3,
    },
    tools,
    maxIterations: 10,
    timeoutMs: 120000,
  };
}

function makeContext(): ExecutionContext {
  return {
    agentId: 'test-agent',
    sessionId: 'session-1',
    userId: 'user-1',
    requestId: 'req-1',
    startTime: new Date(),
  };
}

function makeFinalResponse(): CompletionResponse {
  return {
    id: 'resp-final',
    provider: 'groq',
    model: 'llama3-70b-8192',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Done.' },
        finishReason: 'stop',
      },
    ],
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    latencyMs: 50,
    finishReason: 'stop',
  };
}

function makeToolCallResponse(toolNames: string[]): CompletionResponse {
  return {
    id: 'resp-tools',
    provider: 'groq',
    model: 'llama3-70b-8192',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: '',
          toolCalls: toolNames.map((name, i) => ({
            id: `call-${i}`,
            type: 'function' as const,
            function: { name, arguments: '{}' },
          })),
        },
        finishReason: 'tool_calls',
      },
    ],
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    latencyMs: 50,
    finishReason: 'tool_calls',
  };
}

/** Configure the mock router with a sequence of responses for the next test. */
function setupResponses(responses: CompletionResponse[]): void {
  routerResponseQueue.length = 0;
  routerResponseQueue.push(...responses);
  routerCallIndex = 0;
  routerExecuteMock.mockClear();
}

/** Create a fresh engine with given config overrides. */
function createEngine(
  config: Partial<import('../../core/ai/orchestration/engine').OrchestrationConfig> = {}
): OrchestrationEngine {
  return new OrchestrationEngine(makeRegistry(), {
    enableMemory: false,
    enableSafety: false,
    enableObservability: false,
    ...config,
  });
}

// ============================================================================
// Baseline execution
// ============================================================================

describe('OrchestrationEngine — baseline execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed with no tool calls', async () => {
    setupResponses([makeFinalResponse()]);
    const engine = createEngine();
    const result = await engine.execute(makeAgent(), [{ role: 'user', content: 'Hello' }], makeContext());

    expect(result.success).toBe(true);
    expect(result.metrics.iterationCount).toBe(1);
  });

  it('should succeed with 2 tool calls within all limits', async () => {
    setupResponses([makeToolCallResponse(['t1', 't2']), makeFinalResponse()]);
    const engine = createEngine({
      maxToolCallsPerIteration: 5,
      maxContextMessages: 50,
      maxTotalToolCalls: 25,
    });

    const result = await engine.execute(
      makeAgent(['t1', 't2']),
      [{ role: 'user', content: 'Search for me' }],
      makeContext()
    );

    expect(result.success).toBe(true);
    expect(result.metrics.iterationCount).toBe(2);
  });
});

// ============================================================================
// Per-iteration tool call limit (maxToolCallsPerIteration)
// ============================================================================

describe('OrchestrationEngine — per-iteration tool call limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail with TOOL_CALL_LIMIT_EXCEEDED when iteration has 6 calls and limit is 5', async () => {
    setupResponses([makeToolCallResponse(['t1', 't2', 't3', 't4', 't5', 't6'])]);
    const engine = createEngine({ maxToolCallsPerIteration: 5 });

    const result = await engine.execute(
      makeAgent(['t1', 't2', 't3', 't4', 't5', 't6']),
      [{ role: 'user', content: 'Do stuff' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(AIError);
    expect((result.error as AIError).code).toBe('TOOL_CALL_LIMIT_EXCEEDED');
  });

  it('should succeed when tool calls exactly equal the per-iteration limit', async () => {
    setupResponses([makeToolCallResponse(['t1', 't2', 't3']), makeFinalResponse()]);
    const engine = createEngine({
      maxToolCallsPerIteration: 3,
      maxTotalToolCalls: 25,
      maxContextMessages: 50,
    });

    const result = await engine.execute(
      makeAgent(['t1', 't2', 't3']),
      [{ role: 'user', content: 'Do 3 things' }],
      makeContext()
    );

    expect(result.success).toBe(true);
  });

  it('should respect a custom maxToolCallsPerIteration of 1', async () => {
    setupResponses([makeToolCallResponse(['a', 'b'])]);
    const engine = createEngine({ maxToolCallsPerIteration: 1 });

    const result = await engine.execute(
      makeAgent(['a', 'b']),
      [{ role: 'user', content: 'Do stuff' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    expect((result.error as AIError).code).toBe('TOOL_CALL_LIMIT_EXCEEDED');
  });

  it('error metadata should include actual count and configured limit', async () => {
    setupResponses([makeToolCallResponse(['t1', 't2', 't3'])]);
    const engine = createEngine({ maxToolCallsPerIteration: 2 });

    const result = await engine.execute(
      makeAgent(['t1', 't2', 't3']),
      [{ role: 'user', content: 'Go' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    const err = result.error as AIError;
    expect(err.code).toBe('TOOL_CALL_LIMIT_EXCEEDED');
    expect(err.metadata?.toolCallCount).toBe(3);
    expect(err.metadata?.limit).toBe(2);
  });
});

// ============================================================================
// Context message limit (maxContextMessages)
// ============================================================================

describe('OrchestrationEngine — context message limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail with CONTEXT_MESSAGE_LIMIT_EXCEEDED when context grows beyond limit', async () => {
    // Initial context (safety/memory off): system(1) + user(1) = 2 messages
    // Each iteration with 1 tool call adds: assistant(1) + tool result(1) = 2 messages
    // After iteration 1: 2 + 2 = 4 messages. Iteration 2 check: 4 > 3? Yes → error.
    setupResponses([
      makeToolCallResponse(['tool']),
      makeToolCallResponse(['tool']),
      makeFinalResponse(),
    ]);
    const engine = createEngine({
      maxContextMessages: 3,
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 25,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'Keep calling tools' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    expect((result.error as AIError).code).toBe('CONTEXT_MESSAGE_LIMIT_EXCEEDED');
  });

  it('should succeed when context stays within limit', async () => {
    // Start: 2 msgs. After 1 tool iteration: 4 msgs. Limit is 10.
    setupResponses([makeToolCallResponse(['tool']), makeFinalResponse()]);
    const engine = createEngine({
      maxContextMessages: 10,
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 25,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'One tool call' }],
      makeContext()
    );

    expect(result.success).toBe(true);
  });

  it('error metadata should include message count and configured limit', async () => {
    setupResponses([
      makeToolCallResponse(['tool']),
      makeToolCallResponse(['tool']),
      makeFinalResponse(),
    ]);
    const engine = createEngine({
      maxContextMessages: 3,
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 25,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'Go' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    const err = result.error as AIError;
    expect(err.code).toBe('CONTEXT_MESSAGE_LIMIT_EXCEEDED');
    expect(err.metadata?.limit).toBe(3);
    expect(typeof err.metadata?.messageCount).toBe('number');
    expect((err.metadata?.messageCount as number)).toBeGreaterThan(3);
  });
});

// ============================================================================
// Total tool call budget (maxTotalToolCalls)
// ============================================================================

describe('OrchestrationEngine — total tool call budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail with TOTAL_TOOL_BUDGET_EXCEEDED when cumulative calls exceed budget', async () => {
    // Budget: 2. First iteration: 2 calls (ok). Second iteration tries 1 more → total 3 > 2.
    setupResponses([
      makeToolCallResponse(['tool', 'tool']),
      makeToolCallResponse(['tool']),
      makeFinalResponse(),
    ]);
    const engine = createEngine({
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 2,
      maxContextMessages: 50,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'Keep calling' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    expect((result.error as AIError).code).toBe('TOTAL_TOOL_BUDGET_EXCEEDED');
  });

  it('should succeed when total tool calls exactly equal the budget', async () => {
    // Budget: 2. First iteration: 2 calls. Second response: final answer.
    setupResponses([makeToolCallResponse(['tool', 'tool']), makeFinalResponse()]);
    const engine = createEngine({
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 2,
      maxContextMessages: 50,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'Two tools' }],
      makeContext()
    );

    expect(result.success).toBe(true);
  });

  it('error metadata should include total count and configured limit', async () => {
    setupResponses([
      makeToolCallResponse(['tool', 'tool']),
      makeToolCallResponse(['tool']),
      makeFinalResponse(),
    ]);
    const engine = createEngine({
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 2,
      maxContextMessages: 50,
    });

    const result = await engine.execute(
      makeAgent(['tool']),
      [{ role: 'user', content: 'Go' }],
      makeContext()
    );

    expect(result.success).toBe(false);
    const err = result.error as AIError;
    expect(err.code).toBe('TOTAL_TOOL_BUDGET_EXCEEDED');
    expect(err.metadata?.limit).toBe(2);
    expect(err.metadata?.totalToolCallCount).toBe(3);
  });

  it('should track tool calls across multiple iterations', async () => {
    // Budget: 4. Two iterations of 2 calls each = total 4 (ok). Third response: final.
    setupResponses([
      makeToolCallResponse(['t1', 't2']),
      makeToolCallResponse(['t3', 't4']),
      makeFinalResponse(),
    ]);
    const engine = createEngine({
      maxToolCallsPerIteration: 5,
      maxTotalToolCalls: 4,
      maxContextMessages: 50,
    });

    const result = await engine.execute(
      makeAgent(['t1', 't2', 't3', 't4']),
      [{ role: 'user', content: 'Multi-iteration' }],
      makeContext()
    );

    expect(result.success).toBe(true);
    expect(result.metrics.iterationCount).toBe(3);
  });
});

// ============================================================================
// OrchestrationConfig defaults
// ============================================================================

describe('OrchestrationConfig — defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use default maxToolCallsPerIteration of 5', () => {
    const engine = createEngine();
    const config = (engine as unknown as { config: { maxToolCallsPerIteration: number } }).config;
    expect(config.maxToolCallsPerIteration).toBe(5);
  });

  it('should use default maxContextMessages of 50', () => {
    const engine = createEngine();
    const config = (engine as unknown as { config: { maxContextMessages: number } }).config;
    expect(config.maxContextMessages).toBe(50);
  });

  it('should use default maxTotalToolCalls of 25', () => {
    const engine = createEngine();
    const config = (engine as unknown as { config: { maxTotalToolCalls: number } }).config;
    expect(config.maxTotalToolCalls).toBe(25);
  });

  it('should allow overriding all three limits', () => {
    const engine = createEngine({
      maxToolCallsPerIteration: 1,
      maxContextMessages: 10,
      maxTotalToolCalls: 3,
    });
    const config = (engine as unknown as {
      config: { maxToolCallsPerIteration: number; maxContextMessages: number; maxTotalToolCalls: number };
    }).config;
    expect(config.maxToolCallsPerIteration).toBe(1);
    expect(config.maxContextMessages).toBe(10);
    expect(config.maxTotalToolCalls).toBe(3);
  });
});
