/**
 * TONAIAgent - OpenRouter Provider
 *
 * OpenRouter unified API provider implementation.
 * Access 300+ models through a single API, with automatic fallbacks.
 */

import {
  AIError,
  CompletionRequest,
  CompletionResponse,
  CompletionChoice,
  Message,
  ModelInfo,
  ProviderConfig,
  ProviderType,
  StreamCallback,
  StreamChunk,
  UsageInfo,
  FinishReason,
} from '../types';
import { BaseProvider } from './base';

// ============================================================================
// OpenRouter API Types (OpenAI-compatible format)
// ============================================================================

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
}

interface OpenRouterToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenRouterCompletionRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: OpenRouterTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  transforms?: string[];
  route?: 'fallback';
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
}

interface OpenRouterCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

interface OpenRouterChoice {
  index: number;
  message: OpenRouterMessage;
  finish_reason: string;
}

interface OpenRouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<OpenRouterMessage>;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  };
}

// ============================================================================
// OpenRouter Popular Model Definitions
// ============================================================================

const OPENROUTER_MODELS: ModelInfo[] = [
  // Meta Llama models via OpenRouter
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    provider: 'openrouter',
    name: 'Llama 3.3 70B (OpenRouter)',
    description: 'Meta Llama 3.3 70B via OpenRouter',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00035,
    outputCostPer1kTokens: 0.0004,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
  // DeepSeek models
  {
    id: 'deepseek/deepseek-r1',
    provider: 'openrouter',
    name: 'DeepSeek R1',
    description: 'DeepSeek reasoning model with chain-of-thought',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00055,
    outputCostPer1kTokens: 0.00219,
    supportedFeatures: ['chat', 'completion', 'streaming', 'reasoning', 'code'],
    capabilities: {
      speed: 'medium',
      reasoning: 'expert',
      coding: 'expert',
      costTier: 'low',
    },
    recommended: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    provider: 'openrouter',
    name: 'DeepSeek Chat',
    description: 'DeepSeek general chat model',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00014,
    outputCostPer1kTokens: 0.00028,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'free',
    },
  },
  // Qwen models
  {
    id: 'qwen/qwen-2.5-72b-instruct',
    provider: 'openrouter',
    name: 'Qwen 2.5 72B',
    description: 'Alibaba Qwen 2.5 large model',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00035,
    outputCostPer1kTokens: 0.0004,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'low',
    },
  },
  // Mistral models
  {
    id: 'mistralai/mistral-large-2411',
    provider: 'openrouter',
    name: 'Mistral Large',
    description: 'Mistral AI flagship model',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.002,
    outputCostPer1kTokens: 0.006,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
  },
  {
    id: 'mistralai/codestral-2501',
    provider: 'openrouter',
    name: 'Codestral',
    description: 'Mistral AI specialized coding model',
    contextWindow: 256000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.0003,
    outputCostPer1kTokens: 0.0009,
    supportedFeatures: ['chat', 'completion', 'streaming', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'expert',
      costTier: 'low',
    },
  },
  // Cohere models
  {
    id: 'cohere/command-r-plus-08-2024',
    provider: 'openrouter',
    name: 'Command R+',
    description: 'Cohere enterprise-grade model',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCostPer1kTokens: 0.002375,
    outputCostPer1kTokens: 0.0095,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'standard',
      costTier: 'medium',
    },
  },
  // Auto-router (best model selection)
  {
    id: 'openrouter/auto',
    provider: 'openrouter',
    name: 'OpenRouter Auto',
    description: 'Automatic model selection based on task',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.001,
    outputCostPer1kTokens: 0.003,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'medium',
    },
  },
];

// ============================================================================
// OpenRouter Provider Implementation
// ============================================================================

export class OpenRouterProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly appName: string;
  private readonly siteUrl: string;

  constructor(config: ProviderConfig & { appName?: string; siteUrl?: string }) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1';
    this.apiKey = config.apiKey ?? '';
    this.appName = config.appName ?? 'TONAIAgent';
    this.siteUrl = config.siteUrl ?? 'https://tonaiagent.com';
  }

  get type(): ProviderType {
    return 'openrouter';
  }

  get name(): string {
    return 'OpenRouter';
  }

  protected getDefaultModel(): string {
    return 'meta-llama/llama-3.3-70b-instruct';
  }

  async getModels(): Promise<ModelInfo[]> {
    // Optionally fetch live models from OpenRouter API
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = (await response.json()) as { data: OpenRouterModel[] };
        const liveModels: ModelInfo[] = data.data.slice(0, 50).map((m) => ({
          id: m.id,
          provider: 'openrouter' as const,
          name: m.name,
          description: m.description,
          contextWindow: m.context_length,
          maxOutputTokens: m.top_provider?.max_completion_tokens ?? 4096,
          inputCostPer1kTokens: parseFloat(m.pricing.prompt) * 1000,
          outputCostPer1kTokens: parseFloat(m.pricing.completion) * 1000,
          supportedFeatures: ['chat', 'completion', 'streaming'],
          capabilities: {
            speed: 'medium' as const,
            reasoning: 'standard' as const,
            coding: 'standard' as const,
            costTier: 'low' as const,
          },
        }));

        return liveModels.length > 0 ? liveModels : OPENROUTER_MODELS;
      }
    } catch {
      // Fallback to static list
    }

    return OPENROUTER_MODELS;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...this.getHeaders(),
        },
        signal: AbortSignal.timeout(this.config.timeout ?? 10000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl,
      'X-Title': this.appName,
      ...this.config.customHeaders,
    };
  }

  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const orRequest = this.convertRequest(request, modelId);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(orRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const orResponse = (await response.json()) as OpenRouterCompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(orResponse, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const orRequest = this.convertRequest(request, modelId);
    orRequest.stream = true;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(orRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'openrouter');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finishReason: FinishReason = 'stop';
    let usage: UsageInfo = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    let responseId = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const chunk: OpenRouterStreamChunk = JSON.parse(data);
              responseId = chunk.id;

              if (chunk.choices[0]?.delta?.content) {
                fullContent += chunk.choices[0].delta.content;
              }

              if (chunk.choices[0]?.finish_reason) {
                finishReason = this.convertFinishReason(chunk.choices[0].finish_reason);
              }

              if (chunk.usage) {
                usage = {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                };
              }

              const streamChunk: StreamChunk = {
                id: chunk.id,
                provider: 'openrouter',
                model: modelId,
                delta: {
                  role: chunk.choices[0]?.delta?.role as Message['role'],
                  content: chunk.choices[0]?.delta?.content ?? undefined,
                  toolCalls: chunk.choices[0]?.delta?.tool_calls?.map((tc) => ({
                    id: tc.id,
                    type: tc.type,
                    function: tc.function,
                  })),
                },
                finishReason: chunk.choices[0]?.finish_reason
                  ? this.convertFinishReason(chunk.choices[0].finish_reason)
                  : undefined,
                usage: chunk.usage
                  ? {
                      promptTokens: chunk.usage.prompt_tokens,
                      completionTokens: chunk.usage.completion_tokens,
                      totalTokens: chunk.usage.total_tokens,
                    }
                  : undefined,
              };

              callback(streamChunk);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const latencyMs = Date.now() - startTime;

    return {
      id: responseId || this.generateRequestId(),
      provider: 'openrouter',
      model: modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: fullContent,
          },
          finishReason,
        },
      ],
      usage,
      latencyMs,
      finishReason,
    };
  }

  private convertRequest(request: CompletionRequest, model: string): OpenRouterCompletionRequest {
    const messages: OpenRouterMessage[] = request.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
      tool_call_id: msg.toolCallId,
      tool_calls: msg.toolCalls?.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
    }));

    const orRequest: OpenRouterCompletionRequest = {
      model,
      messages,
      stream: request.stream ?? false,
      // Enable fallbacks for reliability
      route: 'fallback',
      provider: {
        allow_fallbacks: true,
      },
    };

    if (request.temperature !== undefined) {
      orRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      orRequest.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      orRequest.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      orRequest.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      orRequest.presence_penalty = request.presencePenalty;
    }

    if (request.stop !== undefined) {
      orRequest.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      orRequest.tools = request.tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));

      if (request.toolChoice !== undefined) {
        orRequest.tool_choice = request.toolChoice;
      }
    }

    return orRequest;
  }

  private convertResponse(
    orResponse: OpenRouterCompletionResponse,
    latencyMs: number
  ): CompletionResponse {
    const choices: CompletionChoice[] = orResponse.choices.map((choice) => ({
      index: choice.index,
      message: {
        role: choice.message.role as Message['role'],
        content: choice.message.content ?? '',
        toolCalls: choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function,
        })),
      },
      finishReason: this.convertFinishReason(choice.finish_reason),
    }));

    const usage: UsageInfo = {
      promptTokens: orResponse.usage.prompt_tokens,
      completionTokens: orResponse.usage.completion_tokens,
      totalTokens: orResponse.usage.total_tokens,
    };

    // Estimate cost based on the actual model used
    const model = OPENROUTER_MODELS.find((m) => m.id === orResponse.model);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: orResponse.id,
      provider: 'openrouter',
      model: orResponse.model,
      choices,
      usage,
      latencyMs,
      finishReason: choices[0]?.finishReason ?? 'stop',
    };
  }

  private convertFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  private handleError(status: number, body: string): AIError {
    let message = `OpenRouter API error (${status})`;
    let code: AIError['code'] = 'PROVIDER_ERROR';
    let retryable = false;

    try {
      const error = JSON.parse(body);
      message = error.error?.message ?? error.message ?? message;

      if (status === 401 || status === 403) {
        code = 'AUTHENTICATION_ERROR';
      } else if (status === 429) {
        code = 'RATE_LIMIT_EXCEEDED';
        retryable = true;
      } else if (message.includes('context') || message.includes('token')) {
        code = 'CONTEXT_LENGTH_EXCEEDED';
      } else if (status >= 500) {
        retryable = true;
      }
    } catch {
      message = body || message;
    }

    return new AIError(message, code, 'openrouter', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOpenRouterProvider(
  config: Partial<ProviderConfig> & { appName?: string; siteUrl?: string } = {}
): OpenRouterProvider {
  return new OpenRouterProvider({
    type: 'openrouter',
    apiKey: config.apiKey ?? process.env.OPENROUTER_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'meta-llama/llama-3.3-70b-instruct',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 6,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 200,
      tokensPerMinute: 500000,
    },
    customHeaders: config.customHeaders,
    appName: config.appName,
    siteUrl: config.siteUrl,
  });
}
