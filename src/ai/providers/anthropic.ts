/**
 * TONAIAgent - Anthropic Provider
 *
 * Anthropic Claude models provider implementation.
 * Known for strong reasoning and safety capabilities.
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
// Anthropic API Types
// ============================================================================

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicCompletionRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: AnthropicTool[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  metadata?: { user_id?: string };
}

interface AnthropicCompletionResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  message?: AnthropicCompletionResponse;
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// ============================================================================
// Anthropic Model Definitions
// ============================================================================

const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    description: 'Latest Claude Sonnet - excellent balance of intelligence and speed',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
    recommended: true,
  },
  {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    name: 'Claude Opus 4',
    description: 'Most capable Claude model for complex reasoning tasks',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.015,
    outputCostPer1kTokens: 0.075,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code', 'reasoning'],
    capabilities: {
      speed: 'slow',
      reasoning: 'expert',
      coding: 'expert',
      costTier: 'premium',
    },
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    description: 'Excellent performance for most tasks',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.015,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient for everyday tasks',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.001,
    outputCostPer1kTokens: 0.005,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
];

// ============================================================================
// Anthropic Provider Implementation
// ============================================================================

export class AnthropicProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
    this.apiKey = config.apiKey ?? '';
  }

  get type(): ProviderType {
    return 'anthropic';
  }

  get name(): string {
    return 'Anthropic';
  }

  protected getDefaultModel(): string {
    return 'claude-sonnet-4-20250514';
  }

  async getModels(): Promise<ModelInfo[]> {
    return ANTHROPIC_MODELS;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple validation by checking API key format
      return this.apiKey.startsWith('sk-ant-');
    } catch {
      return false;
    }
  }

  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const anthropicRequest = this.convertRequest(request, modelId);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.getHeaders(),
      },
      body: JSON.stringify(anthropicRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const anthropicResponse = (await response.json()) as AnthropicCompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(anthropicResponse, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const anthropicRequest = this.convertRequest(request, modelId);
    anthropicRequest.stream = true;

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.getHeaders(),
      },
      body: JSON.stringify(anthropicRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'anthropic');
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
              const event: AnthropicStreamEvent = JSON.parse(data);

              if (event.type === 'message_start' && event.message) {
                responseId = event.message.id;
                if (event.message.usage) {
                  usage.promptTokens = event.message.usage.input_tokens;
                }
              }

              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullContent += event.delta.text;

                const streamChunk: StreamChunk = {
                  id: responseId,
                  provider: 'anthropic',
                  model: modelId,
                  delta: {
                    content: event.delta.text,
                  },
                };

                callback(streamChunk);
              }

              if (event.type === 'message_delta') {
                if (event.usage?.output_tokens) {
                  usage.completionTokens = event.usage.output_tokens;
                  usage.totalTokens = usage.promptTokens + usage.completionTokens;
                }
              }

              if (event.type === 'message_stop') {
                finishReason = 'stop';
              }
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
      provider: 'anthropic',
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

  private convertRequest(request: CompletionRequest, model: string): AnthropicCompletionRequest {
    // Extract system message if present
    let systemPrompt: string | undefined;
    const messagesWithoutSystem = request.messages.filter((msg) => {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        return false;
      }
      return true;
    });

    // Convert messages to Anthropic format
    const messages: AnthropicMessage[] = messagesWithoutSystem.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId,
              content: msg.content,
            },
          ],
        };
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const contentBlocks: AnthropicContentBlock[] = [];

        if (msg.content) {
          contentBlocks.push({ type: 'text', text: msg.content });
        }

        for (const toolCall of msg.toolCalls) {
          contentBlocks.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        }

        return {
          role: msg.role as 'user' | 'assistant',
          content: contentBlocks,
        };
      }

      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      };
    });

    const anthropicRequest: AnthropicCompletionRequest = {
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      stream: request.stream ?? false,
    };

    if (systemPrompt) {
      anthropicRequest.system = systemPrompt;
    }

    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      anthropicRequest.top_p = request.topP;
    }

    if (request.stop) {
      anthropicRequest.stop_sequences = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));

      if (request.toolChoice) {
        if (request.toolChoice === 'auto') {
          anthropicRequest.tool_choice = { type: 'auto' };
        } else if (request.toolChoice === 'none') {
          // Anthropic doesn't have a "none" equivalent, just don't send tools
          delete anthropicRequest.tools;
        } else if (typeof request.toolChoice === 'object') {
          anthropicRequest.tool_choice = {
            type: 'tool',
            name: request.toolChoice.function.name,
          };
        }
      }
    }

    if (request.user) {
      anthropicRequest.metadata = { user_id: request.user };
    }

    return anthropicRequest;
  }

  private convertResponse(
    anthropicResponse: AnthropicCompletionResponse,
    latencyMs: number
  ): CompletionResponse {
    // Extract text content and tool calls
    let textContent = '';
    const toolCalls: Message['toolCalls'] = [];

    for (const block of anthropicResponse.content) {
      if (block.type === 'text' && block.text) {
        textContent += block.text;
      } else if (block.type === 'tool_use' && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input ?? {}),
          },
        });
      }
    }

    const finishReason = this.convertFinishReason(anthropicResponse.stop_reason);

    const choices: CompletionChoice[] = [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason,
      },
    ];

    const usage: UsageInfo = {
      promptTokens: anthropicResponse.usage.input_tokens,
      completionTokens: anthropicResponse.usage.output_tokens,
      totalTokens:
        anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
    };

    // Calculate estimated cost
    const model = ANTHROPIC_MODELS.find((m) => m.id === anthropicResponse.model);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: anthropicResponse.id,
      provider: 'anthropic',
      model: anthropicResponse.model,
      choices,
      usage,
      latencyMs,
      finishReason,
    };
  }

  private convertFinishReason(reason: string | null): FinishReason {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  private handleError(status: number, body: string): AIError {
    let message = `Anthropic API error (${status})`;
    let code: AIError['code'] = 'PROVIDER_ERROR';
    let retryable = false;

    try {
      const error = JSON.parse(body);
      message = error.error?.message ?? error.message ?? message;

      if (error.error?.type === 'authentication_error') {
        code = 'AUTHENTICATION_ERROR';
      } else if (error.error?.type === 'rate_limit_error') {
        code = 'RATE_LIMIT_EXCEEDED';
        retryable = true;
      } else if (error.error?.type === 'invalid_request_error') {
        code = 'INVALID_REQUEST';
        if (message.includes('context length') || message.includes('token')) {
          code = 'CONTEXT_LENGTH_EXCEEDED';
        }
      } else if (status >= 500) {
        retryable = true;
      }
    } catch {
      message = body || message;
    }

    return new AIError(message, code, 'anthropic', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAnthropicProvider(
  config: Partial<ProviderConfig> = {}
): AnthropicProvider {
  return new AnthropicProvider({
    type: 'anthropic',
    apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'claude-sonnet-4-20250514',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 2,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 60,
      tokensPerMinute: 100000,
    },
    customHeaders: config.customHeaders,
  });
}
