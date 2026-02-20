/**
 * TONAIAgent - OpenAI Provider
 *
 * OpenAI GPT models provider implementation.
 * Industry standard with wide ecosystem support.
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
// OpenAI API Types
// ============================================================================

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  user?: string;
  response_format?: { type: 'text' | 'json_object' };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
  logprobs?: unknown;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<OpenAIMessage>;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// OpenAI Model Definitions
// ============================================================================

const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: 'Most capable multimodal model',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputCostPer1kTokens: 0.0025,
    outputCostPer1kTokens: 0.01,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'json_mode', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
    recommended: true,
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    description: 'Fast and affordable for most tasks',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.0006,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'json_mode', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'GPT-4 Turbo',
    description: 'Previous generation flagship model',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'json_mode', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'high',
    },
  },
  {
    id: 'o1',
    provider: 'openai',
    name: 'o1',
    description: 'Advanced reasoning model for complex problems',
    contextWindow: 200000,
    maxOutputTokens: 100000,
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.06,
    supportedFeatures: ['chat', 'completion', 'reasoning', 'code'],
    capabilities: {
      speed: 'slow',
      reasoning: 'expert',
      coding: 'expert',
      costTier: 'premium',
    },
  },
  {
    id: 'o1-mini',
    provider: 'openai',
    name: 'o1 Mini',
    description: 'Fast reasoning model for coding and math',
    contextWindow: 128000,
    maxOutputTokens: 65536,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.012,
    supportedFeatures: ['chat', 'completion', 'reasoning', 'code'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
  },
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for simple tasks',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputCostPer1kTokens: 0.0005,
    outputCostPer1kTokens: 0.0015,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'fast',
      reasoning: 'basic',
      coding: 'standard',
      costTier: 'free',
    },
  },
];

// ============================================================================
// OpenAI Provider Implementation
// ============================================================================

export class OpenAIProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.apiKey = config.apiKey ?? '';
  }

  get type(): ProviderType {
    return 'openai';
  }

  get name(): string {
    return 'OpenAI';
  }

  protected getDefaultModel(): string {
    return 'gpt-4o';
  }

  async getModels(): Promise<ModelInfo[]> {
    return OPENAI_MODELS;
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

    const openaiRequest = this.convertRequest(request, modelId);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(openaiRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const openaiResponse = (await response.json()) as OpenAICompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(openaiResponse, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const openaiRequest = this.convertRequest(request, modelId);
    openaiRequest.stream = true;
    openaiRequest.stream_options = { include_usage: true };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(openaiRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'openai');
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
              const chunk: OpenAIStreamChunk = JSON.parse(data);
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
                provider: 'openai',
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
      provider: 'openai',
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

  private convertRequest(request: CompletionRequest, model: string): OpenAICompletionRequest {
    const messages: OpenAIMessage[] = request.messages.map((msg) => ({
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

    const openaiRequest: OpenAICompletionRequest = {
      model,
      messages,
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      openaiRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      openaiRequest.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      openaiRequest.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      openaiRequest.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      openaiRequest.presence_penalty = request.presencePenalty;
    }

    if (request.stop !== undefined) {
      openaiRequest.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      openaiRequest.tools = request.tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));

      if (request.toolChoice !== undefined) {
        openaiRequest.tool_choice = request.toolChoice;
      }
    }

    if (request.user !== undefined) {
      openaiRequest.user = request.user;
    }

    return openaiRequest;
  }

  private convertResponse(
    openaiResponse: OpenAICompletionResponse,
    latencyMs: number
  ): CompletionResponse {
    const choices: CompletionChoice[] = openaiResponse.choices.map((choice) => ({
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
      promptTokens: openaiResponse.usage.prompt_tokens,
      completionTokens: openaiResponse.usage.completion_tokens,
      totalTokens: openaiResponse.usage.total_tokens,
    };

    // Calculate estimated cost
    const model = OPENAI_MODELS.find((m) => m.id === openaiResponse.model);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: openaiResponse.id,
      provider: 'openai',
      model: openaiResponse.model,
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
    let message = `OpenAI API error (${status})`;
    let code: AIError['code'] = 'PROVIDER_ERROR';
    let retryable = false;

    try {
      const error = JSON.parse(body);
      message = error.error?.message ?? error.message ?? message;

      if (error.error?.type === 'invalid_api_key') {
        code = 'AUTHENTICATION_ERROR';
      } else if (error.error?.type === 'rate_limit_error' || status === 429) {
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

    return new AIError(message, code, 'openai', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOpenAIProvider(config: Partial<ProviderConfig> = {}): OpenAIProvider {
  return new OpenAIProvider({
    type: 'openai',
    apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'gpt-4o',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 3,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 500,
      tokensPerMinute: 200000,
    },
    customHeaders: config.customHeaders,
  });
}
