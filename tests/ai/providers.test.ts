/**
 * TONAIAgent - AI Provider Tests
 *
 * Unit tests for the provider abstraction layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProviderRegistry,
  CircuitBreaker,
  RateLimiter,
  RetryHandler,
} from '../../core/ai/providers/base';
import { createGroqProvider } from '../../core/ai/providers/groq';
import { createAnthropicProvider } from '../../core/ai/providers/anthropic';
import { createOpenAIProvider } from '../../core/ai/providers/openai';
import { createGoogleProvider } from '../../core/ai/providers/google';
import { createXAIProvider } from '../../core/ai/providers/xai';
import { createOpenRouterProvider } from '../../core/ai/providers/openrouter';
import { AIError } from '../../core/ai/types';

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      halfOpenRequests: 2,
    });
  });

  it('should start in closed state', () => {
    expect(circuitBreaker.currentState).toBe('closed');
    expect(circuitBreaker.canExecute()).toBe(true);
  });

  it('should open after reaching failure threshold', () => {
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();

    expect(circuitBreaker.currentState).toBe('open');
    expect(circuitBreaker.canExecute()).toBe(false);
  });

  it('should record success and stay closed', () => {
    circuitBreaker.recordSuccess();
    expect(circuitBreaker.currentState).toBe('closed');
  });

  it('should transition to half-open after recovery time', async () => {
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();

    expect(circuitBreaker.currentState).toBe('open');

    // Wait for recovery time
    await new Promise((resolve) => setTimeout(resolve, 1100));

    expect(circuitBreaker.currentState).toBe('half-open');
    expect(circuitBreaker.canExecute()).toBe(true);
  });
});

// ============================================================================
// Rate Limiter Tests
// ============================================================================

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      requestsPerMinute: 5,
      tokensPerMinute: 1000,
    });
  });

  it('should allow requests within limit', () => {
    expect(rateLimiter.canMakeRequest()).toBe(true);
    rateLimiter.recordRequest(100);
    expect(rateLimiter.canMakeRequest()).toBe(true);
  });

  it('should block requests when limit exceeded', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.recordRequest(100);
    }
    expect(rateLimiter.canMakeRequest()).toBe(false);
  });

  it('should block requests when token limit exceeded', () => {
    rateLimiter.recordRequest(500);
    rateLimiter.recordRequest(400);
    expect(rateLimiter.canMakeRequest(200)).toBe(false);
  });

  it('should return correct wait time', () => {
    for (let i = 0; i < 5; i++) {
      rateLimiter.recordRequest(100);
    }
    const waitTime = rateLimiter.getWaitTimeMs();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(60000);
  });
});

// ============================================================================
// Retry Handler Tests
// ============================================================================

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = new RetryHandler({
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      retryableErrors: ['PROVIDER_ERROR', 'RATE_LIMIT_EXCEEDED', 'TIMEOUT'],
    });
  });

  it('should succeed on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retryHandler.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new AIError('Error', 'PROVIDER_ERROR', undefined, true))
      .mockResolvedValueOnce('success');

    const result = await retryHandler.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new AIError('Error', 'AUTHENTICATION_ERROR', undefined, false));

    await expect(retryHandler.execute(operation)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new AIError('Error', 'PROVIDER_ERROR', undefined, true))
      .mockResolvedValueOnce('success');

    const onRetry = vi.fn();
    await retryHandler.execute(operation, onRetry);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(AIError));
  });
});

// ============================================================================
// Provider Registry Tests
// ============================================================================

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should register providers', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    registry.register(provider);

    expect(registry.get('groq')).toBe(provider);
  });

  it('should return undefined for unregistered provider', () => {
    expect(registry.get('openai')).toBeUndefined();
  });

  it('should list all providers', () => {
    const groq = createGroqProvider({ apiKey: 'test-api-key-123' });
    const anthropic = createAnthropicProvider({ apiKey: 'sk-ant-test' });

    registry.register(groq);
    registry.register(anthropic);

    const providers = registry.getAll();
    expect(providers).toHaveLength(2);
    expect(providers).toContain(groq);
    expect(providers).toContain(anthropic);
  });

  it('should filter available providers', () => {
    const groq = createGroqProvider({ apiKey: 'test-api-key-123', enabled: true });
    const anthropic = createAnthropicProvider({ apiKey: 'sk-ant-test', enabled: false });

    registry.register(groq);
    registry.register(anthropic);

    const available = registry.getAvailable();
    expect(available).toHaveLength(1);
    expect(available[0]).toBe(groq);
  });
});

// ============================================================================
// Provider Factory Tests
// ============================================================================

describe('Provider Factories', () => {
  it('should create Groq provider with default config', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    expect(provider.type).toBe('groq');
    expect(provider.name).toBe('Groq');
  });

  it('should create Anthropic provider with default config', () => {
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    expect(provider.type).toBe('anthropic');
    expect(provider.name).toBe('Anthropic');
  });

  it('should create OpenAI provider with default config', () => {
    const provider = createOpenAIProvider({ apiKey: 'sk-test-key-123' });
    expect(provider.type).toBe('openai');
    expect(provider.name).toBe('OpenAI');
  });

  it('should create Google provider with default config', () => {
    const provider = createGoogleProvider({ apiKey: 'test-api-key-123' });
    expect(provider.type).toBe('google');
    expect(provider.name).toBe('Google AI');
  });

  it('should create xAI provider with default config', () => {
    const provider = createXAIProvider({ apiKey: 'test-api-key-123' });
    expect(provider.type).toBe('xai');
    expect(provider.name).toBe('xAI');
  });

  it('should create OpenRouter provider with default config', () => {
    const provider = createOpenRouterProvider({ apiKey: 'test-api-key-123' });
    expect(provider.type).toBe('openrouter');
    expect(provider.name).toBe('OpenRouter');
  });
});

// ============================================================================
// Model Info Tests
// ============================================================================

describe('Model Information', () => {
  it('should list Groq models', async () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    const models = await provider.getModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.id === 'llama-3.3-70b-versatile')).toBe(true);
    expect(models.every((m) => m.provider === 'groq')).toBe(true);
  });

  it('should list Anthropic models', async () => {
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test' });
    const models = await provider.getModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.id.includes('claude'))).toBe(true);
  });

  it('should list OpenAI models', async () => {
    const provider = createOpenAIProvider({ apiKey: 'sk-test-key-123' });
    const models = await provider.getModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.id.includes('gpt'))).toBe(true);
  });

  it('should have model cost information', async () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    const models = await provider.getModels();

    for (const model of models) {
      expect(model.inputCostPer1kTokens).toBeGreaterThanOrEqual(0);
      expect(model.outputCostPer1kTokens).toBeGreaterThanOrEqual(0);
      expect(model.contextWindow).toBeGreaterThan(0);
    }
  });

  it('should have model capabilities', async () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    const models = await provider.getModels();

    for (const model of models) {
      expect(model.capabilities).toBeDefined();
      expect(['fast', 'medium', 'slow']).toContain(model.capabilities.speed);
      expect(['basic', 'standard', 'advanced', 'expert']).toContain(model.capabilities.reasoning);
    }
  });
});

// ============================================================================
// Provider Status Tests
// ============================================================================

describe('Provider Status', () => {
  it('should return status for Groq provider', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    const status = provider.getStatus();

    expect(status.type).toBe('groq');
    expect(status.available).toBe(true);
    expect(status.circuitState).toBe('closed');
    expect(status.lastChecked).toBeInstanceOf(Date);
  });

  it('should report unavailable when disabled', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123', enabled: false });
    const status = provider.getStatus();

    expect(status.available).toBe(false);
  });
});

// ============================================================================
// API Key Security Tests
// ============================================================================

describe('API Key Security', () => {
  it('should reject empty API key for Groq provider', () => {
    expect(() => createGroqProvider({ apiKey: '' })).toThrow(
      'GroqProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for Groq provider', () => {
    expect(() => createGroqProvider({ apiKey: 'short' })).toThrow(
      'GroqProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject empty API key for Anthropic provider', () => {
    expect(() => createAnthropicProvider({ apiKey: '' })).toThrow(
      'AnthropicProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for Anthropic provider', () => {
    expect(() => createAnthropicProvider({ apiKey: 'short' })).toThrow(
      'AnthropicProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject empty API key for OpenAI provider', () => {
    expect(() => createOpenAIProvider({ apiKey: '' })).toThrow(
      'OpenAIProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for OpenAI provider', () => {
    expect(() => createOpenAIProvider({ apiKey: 'short' })).toThrow(
      'OpenAIProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject empty API key for Google provider', () => {
    expect(() => createGoogleProvider({ apiKey: '' })).toThrow(
      'GoogleProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for Google provider', () => {
    expect(() => createGoogleProvider({ apiKey: 'short' })).toThrow(
      'GoogleProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject empty API key for xAI provider', () => {
    expect(() => createXAIProvider({ apiKey: '' })).toThrow(
      'XAIProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for xAI provider', () => {
    expect(() => createXAIProvider({ apiKey: 'short' })).toThrow(
      'XAIProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject empty API key for OpenRouter provider', () => {
    expect(() => createOpenRouterProvider({ apiKey: '' })).toThrow(
      'OpenRouterProvider: apiKey must be at least 10 characters'
    );
  });

  it('should reject short API key for OpenRouter provider', () => {
    expect(() => createOpenRouterProvider({ apiKey: 'short' })).toThrow(
      'OpenRouterProvider: apiKey must be at least 10 characters'
    );
  });

  it('should mask API key showing only first 4 and last 4 characters for Groq', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    expect(provider.maskedApiKey).toBe('test...-123');
    expect(provider.maskedApiKey).not.toContain('test-api-key-123');
  });

  it('should mask API key showing only first 4 and last 4 characters for Anthropic', () => {
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test-key-123' });
    expect(provider.maskedApiKey).toBe('sk-a...-123');
    expect(provider.maskedApiKey).not.toContain('sk-ant-test-key-123');
  });

  it('should mask API key showing only first 4 and last 4 characters for OpenAI', () => {
    const provider = createOpenAIProvider({ apiKey: 'sk-test-key-123' });
    expect(provider.maskedApiKey).toBe('sk-t...-123');
    expect(provider.maskedApiKey).not.toContain('sk-test-key-123');
  });

  it('should mask API key showing only first 4 and last 4 characters for Google', () => {
    const provider = createGoogleProvider({ apiKey: 'test-api-key-123' });
    expect(provider.maskedApiKey).toBe('test...-123');
    expect(provider.maskedApiKey).not.toContain('test-api-key-123');
  });

  it('should mask API key showing only first 4 and last 4 characters for xAI', () => {
    const provider = createXAIProvider({ apiKey: 'test-api-key-123' });
    expect(provider.maskedApiKey).toBe('test...-123');
    expect(provider.maskedApiKey).not.toContain('test-api-key-123');
  });

  it('should mask API key showing only first 4 and last 4 characters for OpenRouter', () => {
    const provider = createOpenRouterProvider({ apiKey: 'test-api-key-123' });
    expect(provider.maskedApiKey).toBe('test...-123');
    expect(provider.maskedApiKey).not.toContain('test-api-key-123');
  });

  it('should not expose raw API key on provider instance', () => {
    const provider = createGroqProvider({ apiKey: 'test-api-key-123' });
    const serialized = JSON.stringify(provider);
    expect(serialized).not.toContain('test-api-key-123');
  });
});
