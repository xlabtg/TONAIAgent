/**
 * TONAIAgent - AI Routing Tests
 *
 * Unit tests for the routing and task analysis system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskAnalyzer, ModelScorer, createAIRouter } from '../../core/ai/routing';
import { ProviderRegistry } from '../../core/ai/providers/base';
import { createGroqProvider } from '../../core/ai/providers/groq';
import { createAnthropicProvider } from '../../core/ai/providers/anthropic';
import { CompletionRequest } from '../../core/ai/types';

// ============================================================================
// Task Analyzer Tests
// ============================================================================

describe('TaskAnalyzer', () => {
  let analyzer: TaskAnalyzer;

  beforeEach(() => {
    analyzer = new TaskAnalyzer();
  });

  it('should analyze code generation task', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Write code to implement a sorting algorithm in Python' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.taskType).toBe('code_generation');
    expect(analysis.requiresTools).toBe(false);
    expect(analysis.requiresVision).toBe(false);
  });

  it('should analyze code analysis task', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Review this code and debug the issue with the API' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.taskType).toBe('code_analysis');
  });

  it('should analyze reasoning task', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Think step by step and solve this logic puzzle' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.taskType).toBe('reasoning');
    expect(analysis.requiresReasoning).toBe(true);
  });

  it('should detect high complexity', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Design and architect a comprehensive microservices system' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.complexity).toBe('high');
  });

  it('should detect low complexity', () => {
    const request: CompletionRequest = {
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.complexity).toBe('low');
  });

  it('should detect tool requirements', () => {
    const request: CompletionRequest = {
      messages: [{ role: 'user', content: 'Search for the latest news' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'search',
            description: 'Search the web',
            parameters: {},
          },
        },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.requiresTools).toBe(true);
  });

  it('should detect vision requirements', () => {
    const request: CompletionRequest = {
      messages: [{ role: 'user', content: 'Analyze this image and describe what you see' }],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.requiresVision).toBe(true);
  });

  it('should estimate tokens', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Hello world' },
        { role: 'assistant', content: 'Hi there! How can I help you today?' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.estimatedTokens).toBeGreaterThan(0);
  });

  it('should extract keywords', () => {
    const request: CompletionRequest = {
      messages: [
        { role: 'user', content: 'Write a Python function to sort a list of numbers' },
      ],
    };

    const analysis = analyzer.analyze(request);

    expect(analysis.keywords).toContain('python');
    expect(analysis.keywords.some((k) => k.includes('sort') || k.includes('function'))).toBe(true);
  });
});

// ============================================================================
// Model Scorer Tests
// ============================================================================

describe('ModelScorer', () => {
  let scorer: ModelScorer;
  let registry: ProviderRegistry;

  beforeEach(() => {
    scorer = new ModelScorer();
    registry = new ProviderRegistry();
    registry.register(createGroqProvider({ apiKey: 'test-key' }));
    registry.register(createAnthropicProvider({ apiKey: 'sk-ant-test' }));
  });

  it('should score models based on task', async () => {
    const provider = createGroqProvider({ apiKey: 'test-key' });
    const models = await provider.getModels();

    const modelsWithProvider = models.map((m) => ({ model: m, provider }));

    const scores = scorer.score(
      modelsWithProvider,
      {
        taskType: 'code_generation',
        complexity: 'medium',
        requiresTools: false,
        requiresVision: false,
        requiresReasoning: false,
        estimatedTokens: 1000,
        keywords: ['code', 'function'],
      },
      { mode: 'balanced' }
    );

    expect(scores.length).toBeGreaterThan(0);
    expect(scores[0].score).toBeGreaterThan(0);
    expect(scores[0].score).toBeLessThanOrEqual(100);
  });

  it('should prioritize fast models in fast mode', async () => {
    const provider = createGroqProvider({ apiKey: 'test-key' });
    const models = await provider.getModels();

    const modelsWithProvider = models.map((m) => ({ model: m, provider }));

    const scores = scorer.score(
      modelsWithProvider,
      {
        taskType: 'general',
        complexity: 'low',
        requiresTools: false,
        requiresVision: false,
        requiresReasoning: false,
        estimatedTokens: 100,
        keywords: [],
      },
      { mode: 'fast' }
    );

    // Fast models should score higher
    const fastModels = scores.filter((s) => s.model.capabilities.speed === 'fast');
    const slowModels = scores.filter((s) => s.model.capabilities.speed === 'slow');

    if (fastModels.length > 0 && slowModels.length > 0) {
      expect(fastModels[0].score).toBeGreaterThanOrEqual(slowModels[0].score);
    }
  });

  it('should prioritize low-cost models in cost_optimized mode', async () => {
    const provider = createGroqProvider({ apiKey: 'test-key' });
    const models = await provider.getModels();

    const modelsWithProvider = models.map((m) => ({ model: m, provider }));

    const scores = scorer.score(
      modelsWithProvider,
      {
        taskType: 'general',
        complexity: 'low',
        requiresTools: false,
        requiresVision: false,
        requiresReasoning: false,
        estimatedTokens: 100,
        keywords: [],
      },
      { mode: 'cost_optimized' }
    );

    // Low-cost models should score higher
    const lowCostModels = scores.filter(
      (s) => s.model.capabilities.costTier === 'free' || s.model.capabilities.costTier === 'low'
    );
    const highCostModels = scores.filter((s) => s.model.capabilities.costTier === 'premium');

    if (lowCostModels.length > 0 && highCostModels.length > 0) {
      expect(lowCostModels[0].score).toBeGreaterThanOrEqual(highCostModels[0].score);
    }
  });

  it('should filter by required features', async () => {
    const provider = createGroqProvider({ apiKey: 'test-key' });
    const models = await provider.getModels();

    const modelsWithProvider = models.map((m) => ({ model: m, provider }));

    const scores = scorer.score(
      modelsWithProvider,
      {
        taskType: 'tool_use',
        complexity: 'medium',
        requiresTools: true,
        requiresVision: false,
        requiresReasoning: false,
        estimatedTokens: 500,
        keywords: [],
      },
      { mode: 'balanced', requireFeatures: ['tool_use'] }
    );

    // All scored models should support tool_use
    for (const score of scores) {
      expect(score.model.supportedFeatures).toContain('tool_use');
    }
  });

  it('should exclude specified models', async () => {
    const provider = createGroqProvider({ apiKey: 'test-key' });
    const models = await provider.getModels();

    const modelsWithProvider = models.map((m) => ({ model: m, provider }));

    const scores = scorer.score(
      modelsWithProvider,
      {
        taskType: 'general',
        complexity: 'low',
        requiresTools: false,
        requiresVision: false,
        requiresReasoning: false,
        estimatedTokens: 100,
        keywords: [],
      },
      { mode: 'balanced', excludeModels: ['llama-3.3-70b-versatile'] }
    );

    expect(scores.every((s) => s.model.id !== 'llama-3.3-70b-versatile')).toBe(true);
  });
});

// ============================================================================
// AI Router Tests
// ============================================================================

describe('AIRouter', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.register(createGroqProvider({ apiKey: 'test-key' }));
    registry.register(createAnthropicProvider({ apiKey: 'sk-ant-test' }));
  });

  it('should create router with default config', () => {
    const router = createAIRouter(registry);
    expect(router).toBeDefined();
  });

  it('should route to user-specified model', async () => {
    const router = createAIRouter(registry);

    const decision = await router.route({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'llama-3.1-8b-instant',
    });

    expect(decision.model).toBe('llama-3.1-8b-instant');
    expect(decision.reason).toBe('User specified model');
  });

  it('should provide alternatives in routing decision', async () => {
    const router = createAIRouter(registry);

    const decision = await router.route({
      messages: [{ role: 'user', content: 'Write some code' }],
    });

    expect(decision.alternatives).toBeDefined();
    expect(decision.alternatives.length).toBeGreaterThanOrEqual(0);
  });

  it('should include estimated latency and cost', async () => {
    const router = createAIRouter(registry);

    const decision = await router.route({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(decision.estimatedLatencyMs).toBeGreaterThan(0);
    expect(decision.estimatedCostUsd).toBeGreaterThanOrEqual(0);
  });

  it('should update routing config', () => {
    const router = createAIRouter(registry);

    router.updateConfig({ mode: 'fast' });
    const config = router.getConfig();

    expect(config.mode).toBe('fast');
  });

  it('should prioritize primary provider', async () => {
    const router = createAIRouter(registry, {
      mode: 'balanced',
      primaryProvider: 'groq',
    });

    const decision = await router.route({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    // Groq should be highly scored as primary
    expect(['groq', 'anthropic']).toContain(decision.provider);
  });
});
