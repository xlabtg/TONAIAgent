/**
 * TONAIAgent - AI Layer
 *
 * Multi-provider AI abstraction layer with Groq as primary provider.
 *
 * Features:
 * - Provider abstraction (Groq, Anthropic, OpenAI, Google, xAI, OpenRouter)
 * - Dynamic multi-model routing
 * - Provider fallback with circuit breaker
 * - Memory and context management
 * - Safety guardrails
 * - Observability and monitoring
 *
 * @example
 * ```typescript
 * import { createAIService, AIServiceConfig } from './ai';
 *
 * const config: AIServiceConfig = {
 *   providers: {
 *     groq: { apiKey: process.env.GROQ_API_KEY },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
 *   },
 *   routing: { mode: 'balanced', primaryProvider: 'groq' },
 * };
 *
 * const ai = createAIService(config);
 *
 * const response = await ai.complete({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */

// Export all types
export * from './types';

// Export providers
export {
  BaseProvider,
  ProviderRegistry,
  CircuitBreaker,
  RateLimiter,
  RetryHandler,
} from './providers/base';

export { GroqProvider, createGroqProvider } from './providers/groq';
export { AnthropicProvider, createAnthropicProvider } from './providers/anthropic';
export { OpenAIProvider, createOpenAIProvider } from './providers/openai';
export { GoogleProvider, createGoogleProvider } from './providers/google';
export { XAIProvider, createXAIProvider } from './providers/xai';
export { OpenRouterProvider, createOpenRouterProvider } from './providers/openrouter';

// Export routing
export { AIRouter, TaskAnalyzer, ModelScorer, createAIRouter } from './routing';
export type { RouterConfig } from './routing';

// Export memory
export {
  MemoryManager,
  InMemoryStore,
  SimpleVectorStore,
  createMemoryManager,
} from './memory';
export type { MemoryStore, EmbeddingProvider } from './memory';

// Export safety
export {
  SafetyManager,
  InputValidator,
  OutputValidator,
  ContentFilter,
  RiskValidator,
  createSafetyManager,
} from './safety';
export type { TransactionContext } from './safety';

// Export orchestration
export {
  OrchestrationEngine,
  DefaultToolExecutor,
  createOrchestrationEngine,
} from './orchestration';
export type { ToolExecutor, OrchestrationConfig } from './orchestration';

// ============================================================================
// AI Service - Unified Entry Point
// ============================================================================

import {
  CompletionRequest,
  CompletionResponse,
  ProviderConfig,
  ProviderType,
  RoutingConfig,
  SafetyConfig,
  AIEvent,
  AgentConfig,
  ExecutionContext,
  ExecutionResult,
  StreamCallback,
  Message,
} from './types';

import { ProviderRegistry } from './providers/base';
import { createGroqProvider } from './providers/groq';
import { createAnthropicProvider } from './providers/anthropic';
import { createOpenAIProvider } from './providers/openai';
import { createGoogleProvider } from './providers/google';
import { createXAIProvider } from './providers/xai';
import { createOpenRouterProvider } from './providers/openrouter';
import { createOrchestrationEngine, OrchestrationEngine, ToolExecutor } from './orchestration';

export interface AIServiceConfig {
  providers?: Partial<Record<ProviderType, Partial<ProviderConfig>>>;
  routing?: Partial<RoutingConfig>;
  safety?: Partial<SafetyConfig>;
  maxIterations?: number;
  timeoutMs?: number;
  enableMemory?: boolean;
  enableSafety?: boolean;
  enableObservability?: boolean;
  onEvent?: (event: AIEvent) => void;
}

export class AIService {
  private readonly engine: OrchestrationEngine;
  private readonly registry: ProviderRegistry;

  constructor(config: AIServiceConfig = {}, toolExecutor?: ToolExecutor) {
    this.registry = new ProviderRegistry();

    // Initialize providers
    if (config.providers?.groq?.apiKey || process.env.GROQ_API_KEY) {
      this.registry.register(createGroqProvider(config.providers?.groq));
    }

    if (config.providers?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY) {
      this.registry.register(createAnthropicProvider(config.providers?.anthropic));
    }

    if (config.providers?.openai?.apiKey || process.env.OPENAI_API_KEY) {
      this.registry.register(createOpenAIProvider(config.providers?.openai));
    }

    if (config.providers?.google?.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      this.registry.register(createGoogleProvider(config.providers?.google));
    }

    if (config.providers?.xai?.apiKey || process.env.XAI_API_KEY) {
      this.registry.register(createXAIProvider(config.providers?.xai));
    }

    if (config.providers?.openrouter?.apiKey || process.env.OPENROUTER_API_KEY) {
      this.registry.register(createOpenRouterProvider(config.providers?.openrouter));
    }

    // Create orchestration engine
    this.engine = createOrchestrationEngine(
      this.registry,
      {
        maxIterations: config.maxIterations ?? 10,
        timeoutMs: config.timeoutMs ?? 120000,
        enableMemory: config.enableMemory ?? true,
        enableSafety: config.enableSafety ?? true,
        enableObservability: config.enableObservability ?? true,
        onEvent: config.onEvent,
      },
      toolExecutor
    );
  }

  /**
   * Simple completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return this.engine.complete(request);
  }

  /**
   * Chat with messages
   */
  async chat(messages: Message[], options?: Partial<CompletionRequest>): Promise<string> {
    const response = await this.complete({
      messages,
      ...options,
    });
    return response.choices[0]?.message.content ?? '';
  }

  /**
   * Streaming completion
   */
  async stream(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    return this.engine.getRouter().stream(request, callback);
  }

  /**
   * Execute an agent task with full orchestration
   */
  async executeAgent(
    agent: AgentConfig,
    messages: Message[],
    context: Partial<ExecutionContext>
  ): Promise<ExecutionResult> {
    const fullContext: ExecutionContext = {
      agentId: agent.id,
      sessionId: context.sessionId ?? `session_${Date.now()}`,
      userId: context.userId ?? 'anonymous',
      requestId: context.requestId ?? `req_${Date.now()}`,
      startTime: new Date(),
      ...context,
    };

    return this.engine.execute(agent, messages, fullContext);
  }

  /**
   * Stream an agent task
   */
  async streamAgent(
    agent: AgentConfig,
    messages: Message[],
    context: Partial<ExecutionContext>,
    callback: StreamCallback
  ): Promise<ExecutionResult> {
    const fullContext: ExecutionContext = {
      agentId: agent.id,
      sessionId: context.sessionId ?? `session_${Date.now()}`,
      userId: context.userId ?? 'anonymous',
      requestId: context.requestId ?? `req_${Date.now()}`,
      startTime: new Date(),
      ...context,
    };

    return this.engine.stream(agent, messages, fullContext, callback);
  }

  /**
   * Get available providers
   */
  getProviders(): ProviderType[] {
    return this.registry.getAvailable().map((p) => p.type);
  }

  /**
   * Get all available models
   */
  async getModels(): Promise<Array<{ provider: ProviderType; models: string[] }>> {
    const result: Array<{ provider: ProviderType; models: string[] }> = [];

    for (const provider of this.registry.getAvailable()) {
      const models = await provider.getModels();
      result.push({
        provider: provider.type,
        models: models.map((m) => m.id),
      });
    }

    return result;
  }

  /**
   * Get the orchestration engine
   */
  getEngine(): OrchestrationEngine {
    return this.engine;
  }

  /**
   * Get the provider registry
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAIService(
  config?: AIServiceConfig,
  toolExecutor?: ToolExecutor
): AIService {
  return new AIService(config, toolExecutor);
}

// Default export
export default AIService;
