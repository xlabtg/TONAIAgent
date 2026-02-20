/**
 * TONAIAgent - xAI Provider
 *
 * xAI Grok models provider implementation.
 * Known for real-time information and witty responses.
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
// xAI API Types (OpenAI-compatible format)
// ============================================================================

interface XAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: XAIToolCall[];
}

interface XAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface XAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface XAICompletionRequest {
  model: string;
  messages: XAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: XAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  user?: string;
}

interface XAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: XAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

interface XAIChoice {
  index: number;
  message: XAIMessage;
  finish_reason: string;
}

interface XAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<XAIMessage>;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// xAI Model Definitions
// ============================================================================

const XAI_MODELS: ModelInfo[] = [
  {
    id: 'grok-3',
    provider: 'xai',
    name: 'Grok 3',
    description: 'Most capable Grok model with advanced reasoning',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'expert',
      coding: 'expert',
      costTier: 'medium',
    },
    recommended: true,
  },
  {
    id: 'grok-3-fast',
    provider: 'xai',
    name: 'Grok 3 Fast',
    description: 'Faster version of Grok 3',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.001,
    outputCostPer1kTokens: 0.004,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
  {
    id: 'grok-2',
    provider: 'xai',
    name: 'Grok 2',
    description: 'Previous generation Grok model',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.002,
    outputCostPer1kTokens: 0.01,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'code'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'medium',
    },
  },
  {
    id: 'grok-2-mini',
    provider: 'xai',
    name: 'Grok 2 Mini',
    description: 'Lightweight Grok model for simple tasks',
    contextWindow: 131072,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.0002,
    outputCostPer1kTokens: 0.001,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'standard',
      costTier: 'low',
    },
  },
];

// ============================================================================
// xAI Provider Implementation
// ============================================================================

export class XAIProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://api.x.ai/v1';
    this.apiKey = config.apiKey ?? '';
  }

  get type(): ProviderType {
    return 'xai';
  }

  get name(): string {
    return 'xAI';
  }

  protected getDefaultModel(): string {
    return 'grok-3-fast';
  }

  async getModels(): Promise<ModelInfo[]> {
    return XAI_MODELS;
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

    const xaiRequest = this.convertRequest(request, modelId);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(xaiRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const xaiResponse = (await response.json()) as XAICompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(xaiResponse, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const xaiRequest = this.convertRequest(request, modelId);
    xaiRequest.stream = true;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...this.getHeaders(),
      },
      body: JSON.stringify(xaiRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'xai');
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
              const chunk: XAIStreamChunk = JSON.parse(data);
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
                provider: 'xai',
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
      provider: 'xai',
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

  private convertRequest(request: CompletionRequest, model: string): XAICompletionRequest {
    const messages: XAIMessage[] = request.messages.map((msg) => ({
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

    const xaiRequest: XAICompletionRequest = {
      model,
      messages,
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      xaiRequest.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      xaiRequest.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      xaiRequest.top_p = request.topP;
    }

    if (request.frequencyPenalty !== undefined) {
      xaiRequest.frequency_penalty = request.frequencyPenalty;
    }

    if (request.presencePenalty !== undefined) {
      xaiRequest.presence_penalty = request.presencePenalty;
    }

    if (request.stop !== undefined) {
      xaiRequest.stop = request.stop;
    }

    if (request.tools && request.tools.length > 0) {
      xaiRequest.tools = request.tools.map((tool) => ({
        type: tool.type,
        function: tool.function,
      }));

      if (request.toolChoice !== undefined) {
        xaiRequest.tool_choice = request.toolChoice;
      }
    }

    if (request.user !== undefined) {
      xaiRequest.user = request.user;
    }

    return xaiRequest;
  }

  private convertResponse(
    xaiResponse: XAICompletionResponse,
    latencyMs: number
  ): CompletionResponse {
    const choices: CompletionChoice[] = xaiResponse.choices.map((choice) => ({
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
      promptTokens: xaiResponse.usage.prompt_tokens,
      completionTokens: xaiResponse.usage.completion_tokens,
      totalTokens: xaiResponse.usage.total_tokens,
    };

    // Calculate estimated cost
    const model = XAI_MODELS.find((m) => m.id === xaiResponse.model);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: xaiResponse.id,
      provider: 'xai',
      model: xaiResponse.model,
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
    let message = `xAI API error (${status})`;
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

    return new AIError(message, code, 'xai', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createXAIProvider(config: Partial<ProviderConfig> = {}): XAIProvider {
  return new XAIProvider({
    type: 'xai',
    apiKey: config.apiKey ?? process.env.XAI_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'grok-3-fast',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 5,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 60,
      tokensPerMinute: 100000,
    },
    customHeaders: config.customHeaders,
  });
}
