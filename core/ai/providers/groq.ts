/**
 * TONAIAgent - Groq Provider
 *
 * Primary AI provider implementation using Groq's ultra-fast inference.
 * Groq is optimized for low-latency, real-time AI operations.
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
// Groq API Types
// ============================================================================

interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
}

interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface GroqTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface GroqCompletionRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: GroqTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  user?: string;
}

interface GroqCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    queue_time?: number;
    prompt_time?: number;
    completion_time?: number;
    total_time?: number;
  };
  system_fingerprint?: string;
  x_groq?: {
    id: string;
  };
}

interface GroqChoice {
  index: number;
  message: GroqMessage;
  finish_reason: string;
  logprobs?: unknown;
}

interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<GroqMessage>;
    finish_reason: string | null;
  }>;
  x_groq?: {
    id: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}

// ============================================================================
// Groq Model Definitions
// ============================================================================

const GROQ_MODELS: ModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    name: 'Llama 3.3 70B Versatile',
    description: 'High-performance 70B model with excellent general capabilities',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    inputCostPer1kTokens: 0.00059,
    outputCostPer1kTokens: 0.00079,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code', 'reasoning'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
  {
    id: 'llama-3.1-70b-versatile',
    provider: 'groq',
    name: 'Llama 3.1 70B Versatile',
    description: 'Versatile 70B model for general tasks',
    contextWindow: 128000,
    maxOutputTokens: 32768,
    inputCostPer1kTokens: 0.00059,
    outputCostPer1kTokens: 0.00079,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'low',
    },
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    name: 'Llama 3.1 8B Instant',
    description: 'Ultra-fast 8B model for quick responses',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00005,
    outputCostPer1kTokens: 0.00008,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'fast',
      reasoning: 'basic',
      coding: 'standard',
      costTier: 'free',
    },
    recommended: true,
  },
  {
    id: 'llama3-groq-70b-8192-tool-use-preview',
    provider: 'groq',
    name: 'Llama 3 Groq 70B Tool Use',
    description: 'Optimized for tool/function calling',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00089,
    outputCostPer1kTokens: 0.00089,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'standard',
      costTier: 'low',
    },
  },
  {
    id: 'mixtral-8x7b-32768',
    provider: 'groq',
    name: 'Mixtral 8x7B',
    description: 'Mixture of experts model with good performance',
    contextWindow: 32768,
    maxOutputTokens: 32768,
    inputCostPer1kTokens: 0.00024,
    outputCostPer1kTokens: 0.00024,
    supportedFeatures: ['chat', 'completion', 'streaming', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'advanced',
      costTier: 'low',
    },
  },
  {
    id: 'gemma2-9b-it',
    provider: 'groq',
    name: 'Gemma 2 9B',
    description: 'Google Gemma 2 instruction-tuned model',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.0002,
    outputCostPer1kTokens: 0.0002,
    supportedFeatures: ['chat', 'completion', 'streaming'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'standard',
      costTier: 'free',
    },
  },
  {
    id: 'llama-guard-3-8b',
    provider: 'groq',
    name: 'Llama Guard 3 8B',
    description: 'Safety classifier for content moderation',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.0002,
    outputCostPer1kTokens: 0.0002,
    supportedFeatures: ['chat', 'completion'],
    capabilities: {
      speed: 'fast',
      reasoning: 'basic',
      coding: 'basic',
      costTier: 'free',
    },
  },
];

// ============================================================================
// Groq Provider Implementation
// ============================================================================

export class GroqProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://api.groq.com/openai/v1';
    this.apiKey = config.apiKey ?? '';
  }

  get type(): ProviderType {
    return 'groq';
  }

  get name(): string {
    return 'Groq';
  }

  protected getDefaultModel(): string {
    return 'llama-3.3-70b-versatile';
  }

  async getModels(): Promise<ModelInfo[]> {
    return GROQ_MODELS;
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

  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const groqRequest = this.convertRequest(request, modelId);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(groqRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const groqResponse = (await response.json()) as GroqCompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(groqResponse, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const groqRequest = this.convertRequest(request, modelId);
    groqRequest.stream = true;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(groqRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'groq');
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
              const chunk: GroqStreamChunk = JSON.parse(data);
              responseId = chunk.id;

              if (chunk.choices[0]?.delta?.content) {
                fullContent += chunk.choices[0].delta.content;
              }

              if (chunk.choices[0]?.finish_reason) {
                finishReason = this.convertFinishReason(chunk.choices[0].finish_reason);
              }

              if (chunk.x_groq?.usage) {
                usage = {
                  promptTokens: chunk.x_groq.usage.prompt_tokens,
                  completionTokens: chunk.x_groq.usage.completion_tokens,
                  totalTokens: chunk.x_groq.usage.total_tokens,
                };
              }

              const streamChunk: StreamChunk = {
                id: chunk.id,
                provider: 'groq',
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
                usage: chunk.x_groq?.usage
                  ? {
                      promptTokens: chunk.x_groq.usage.prompt_tokens,
                      completionTokens: chunk.x_groq.usage.completion_tokens,
                      totalTokens: chunk.x_groq.usage.total_tokens,
                    }
                  : undefined,
              };

              callback(streamChunk);
            } catch {
              // Skip malformed JSON chunks
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
      provider: 'groq',
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

  private convertRequest(request: CompletionRequest, model: string): GroqCompletionRequest {
    const messages: GroqMessage[] = request.messages.map((msg) => ({
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

    const groqRequest: GroqCompletionRequest = {
      model,
      messages,
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      groqRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      groqRequest.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      groqRequest.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      groqRequest.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      groqRequest.presence_penalty = request.presencePenalty;
    }

    if (request.stop !== undefined) {
      groqRequest.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      groqRequest.tools = request.tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));

      if (request.toolChoice !== undefined) {
        groqRequest.tool_choice = request.toolChoice;
      }
    }

    if (request.user !== undefined) {
      groqRequest.user = request.user;
    }

    return groqRequest;
  }

  private convertResponse(
    groqResponse: GroqCompletionResponse,
    latencyMs: number
  ): CompletionResponse {
    const choices: CompletionChoice[] = groqResponse.choices.map((choice) => ({
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
      promptTokens: groqResponse.usage.prompt_tokens,
      completionTokens: groqResponse.usage.completion_tokens,
      totalTokens: groqResponse.usage.total_tokens,
    };

    // Calculate estimated cost
    const model = GROQ_MODELS.find((m) => m.id === groqResponse.model);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: groqResponse.id,
      provider: 'groq',
      model: groqResponse.model,
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
    let message = `Groq API error (${status})`;
    let code: AIError['code'] = 'PROVIDER_ERROR';
    let retryable = false;

    try {
      const error = JSON.parse(body);
      message = error.error?.message ?? error.message ?? message;

      if (error.error?.type === 'invalid_api_key') {
        code = 'AUTHENTICATION_ERROR';
      } else if (error.error?.type === 'rate_limit_exceeded') {
        code = 'RATE_LIMIT_EXCEEDED';
        retryable = true;
      } else if (error.error?.code === 'context_length_exceeded') {
        code = 'CONTEXT_LENGTH_EXCEEDED';
      } else if (status >= 500) {
        retryable = true;
      }
    } catch {
      message = body || message;
    }

    return new AIError(message, code, 'groq', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGroqProvider(config: Partial<ProviderConfig> = {}): GroqProvider {
  return new GroqProvider({
    type: 'groq',
    apiKey: config.apiKey ?? process.env.GROQ_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'llama-3.3-70b-versatile',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 1,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 30,
      tokensPerMinute: 100000,
      requestsPerDay: 14400,
    },
    customHeaders: config.customHeaders,
  });
}
