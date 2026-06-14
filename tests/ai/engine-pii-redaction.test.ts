/**
 * TONAIAgent - Engine PII Redaction Tests (Issue #435 / LOGIC-25)
 *
 * End-to-end regression tests asserting that PII detected in model output is
 * actually redacted (or blocked) by the OrchestrationEngine — not just by
 * redactOutput() in isolation.
 *
 * Previously detectPii() emitted action 'warn' when redactSensitive was on,
 * while the engine only redacted on action 'block'. The two booleans were
 * inverted, so the redaction path was dead code and PII passed through verbatim
 * in the very configuration meant to protect it.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CompletionResponse, SafetyConfig } from '../../core/ai/types';

// ============================================================================
// Module mocks — must be at top level so vitest hoists them before imports
// ============================================================================

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

// Mutable safety config so each test can flip redactSensitive while still
// exercising the REAL SafetyManager logic (detectPii -> action -> engine).
const safetyConfigOverride: { value: Partial<SafetyConfig> } = { value: {} };

vi.mock('../../core/ai/safety', async () => {
  const actual = await vi.importActual<typeof import('../../core/ai/safety')>(
    '../../core/ai/safety'
  );
  return {
    ...actual,
    createSafetyManager: vi.fn(() =>
      actual.createSafetyManager(safetyConfigOverride.value)
    ),
  };
});

// ============================================================================
// Actual imports (after mocks are set up)
// ============================================================================

import { OrchestrationEngine } from '../../core/ai/orchestration/engine';
import { ProviderRegistry } from '../../core/ai/providers/base';
import { AgentConfig, ExecutionContext } from '../../core/ai/types';

// ============================================================================
// Helpers
// ============================================================================

function makeAgent(): AgentConfig {
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
    tools: [],
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

function makeResponseWithContent(content: string): CompletionResponse {
  return {
    id: 'resp-final',
    provider: 'groq',
    model: 'llama3-70b-8192',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finishReason: 'stop',
      },
    ],
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    latencyMs: 50,
    finishReason: 'stop',
  };
}

function setupResponses(responses: CompletionResponse[]): void {
  routerResponseQueue.length = 0;
  routerResponseQueue.push(...responses);
  routerCallIndex = 0;
  routerExecuteMock.mockClear();
}

function createEngine(): OrchestrationEngine {
  return new OrchestrationEngine(new ProviderRegistry(), {
    enableMemory: false,
    enableSafety: true,
    enableObservability: false,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('OrchestrationEngine — PII redaction (LOGIC-25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safetyConfigOverride.value = {};
  });

  it('redacts PII from output when redactSensitive is enabled (default)', async () => {
    safetyConfigOverride.value = {}; // defaults: detectPii + redactSensitive on
    const email = 'john.doe@example.com';
    setupResponses([makeResponseWithContent(`Sure, contact me at ${email}.`)]);

    const engine = createEngine();
    const result = await engine.execute(
      makeAgent(),
      [{ role: 'user', content: 'What is your email?' }],
      makeContext()
    );

    expect(result.success).toBe(true);
    const content = result.response?.choices[0]?.message.content ?? '';
    expect(content).not.toContain(email);
    expect(content).toContain('[REDACTED_EMAIL]');
  });

  it('fails closed (does not return PII verbatim) when redactSensitive is disabled', async () => {
    safetyConfigOverride.value = {
      outputValidation: {
        maxLength: 100000,
        detectHallucination: false,
        detectPii: true,
        redactSensitive: false,
      },
    };
    const email = 'john.doe@example.com';
    setupResponses([makeResponseWithContent(`Sure, contact me at ${email}.`)]);

    const engine = createEngine();
    const result = await engine.execute(
      makeAgent(),
      [{ role: 'user', content: 'What is your email?' }],
      makeContext()
    );

    // The engine must not silently return the unredacted PII.
    expect(result.success).toBe(false);
    expect(result.response?.choices[0]?.message.content ?? '').not.toContain(email);
  });

  it('returns clean output unchanged when there is no PII', async () => {
    safetyConfigOverride.value = {};
    setupResponses([makeResponseWithContent('All good, nothing sensitive here.')]);

    const engine = createEngine();
    const result = await engine.execute(
      makeAgent(),
      [{ role: 'user', content: 'Hello' }],
      makeContext()
    );

    expect(result.success).toBe(true);
    expect(result.response?.choices[0]?.message.content).toBe(
      'All good, nothing sensitive here.'
    );
  });
});
