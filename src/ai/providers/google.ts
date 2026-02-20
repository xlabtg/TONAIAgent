/**
 * TONAIAgent - Google AI Provider
 *
 * Google Gemini models provider implementation.
 * Known for multimodal capabilities and long context.
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
// Google AI API Types
// ============================================================================

interface GoogleContent {
  role: 'user' | 'model';
  parts: GooglePart[];
}

interface GooglePart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GoogleTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

interface GoogleGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
}

interface GoogleCompletionRequest {
  contents: GoogleContent[];
  systemInstruction?: { parts: GooglePart[] };
  generationConfig?: GoogleGenerationConfig;
  tools?: GoogleTool[];
  toolConfig?: {
    functionCallingConfig: {
      mode: 'AUTO' | 'NONE' | 'ANY';
      allowedFunctionNames?: string[];
    };
  };
}

interface GoogleCompletionResponse {
  candidates: Array<{
    content: GoogleContent;
    finishReason: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
    index: number;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

// ============================================================================
// Google AI Model Definitions
// ============================================================================

const GOOGLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.0-flash',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    description: 'Fast and efficient with multimodal capabilities',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00010,
    outputCostPer1kTokens: 0.00040,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'advanced',
      costTier: 'low',
    },
    recommended: true,
  },
  {
    id: 'gemini-2.0-flash-thinking-exp',
    provider: 'google',
    name: 'Gemini 2.0 Flash Thinking',
    description: 'Enhanced reasoning with thinking capabilities',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00015,
    outputCostPer1kTokens: 0.00060,
    supportedFeatures: ['chat', 'completion', 'streaming', 'vision', 'reasoning', 'code'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'advanced',
      costTier: 'low',
    },
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable Gemini model with 2M context',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.00125,
    outputCostPer1kTokens: 0.005,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code', 'reasoning'],
    capabilities: {
      speed: 'medium',
      reasoning: 'advanced',
      coding: 'expert',
      costTier: 'medium',
    },
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    description: 'Fast model for high-volume tasks',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.000075,
    outputCostPer1kTokens: 0.0003,
    supportedFeatures: ['chat', 'completion', 'streaming', 'tool_use', 'vision', 'code'],
    capabilities: {
      speed: 'fast',
      reasoning: 'standard',
      coding: 'advanced',
      costTier: 'free',
    },
    recommended: true,
  },
  {
    id: 'gemini-1.5-flash-8b',
    provider: 'google',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Lightweight model for simple tasks',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    inputCostPer1kTokens: 0.0000375,
    outputCostPer1kTokens: 0.00015,
    supportedFeatures: ['chat', 'completion', 'streaming', 'vision'],
    capabilities: {
      speed: 'fast',
      reasoning: 'basic',
      coding: 'standard',
      costTier: 'free',
    },
  },
];

// ============================================================================
// Google AI Provider Implementation
// ============================================================================

export class GoogleProvider extends BaseProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    this.apiKey = config.apiKey ?? '';
  }

  get type(): ProviderType {
    return 'google';
  }

  get name(): string {
    return 'Google AI';
  }

  protected getDefaultModel(): string {
    return 'gemini-2.0-flash';
  }

  async getModels(): Promise<ModelInfo[]> {
    return GOOGLE_MODELS;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.config.timeout ?? 10000),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  protected async executeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const googleRequest = this.convertRequest(request);
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(googleRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    const googleResponse = (await response.json()) as GoogleCompletionResponse;
    const latencyMs = Date.now() - startTime;

    return this.convertResponse(googleResponse, modelId, latencyMs);
  }

  protected async executeStreamingCompletion(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    const modelId = this.getModelId(request);

    const googleRequest = this.convertRequest(request);
    const url = `${this.baseUrl}/models/${modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(googleRequest),
      signal: AbortSignal.timeout(this.config.timeout ?? 120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.handleError(response.status, errorBody);
    }

    if (!response.body) {
      throw new AIError('No response body for streaming', 'PROVIDER_ERROR', 'google');
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
    const responseId = this.generateRequestId();

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
            if (!data || data === '[DONE]') continue;

            try {
              const chunk: GoogleCompletionResponse = JSON.parse(data);

              if (chunk.candidates?.[0]?.content?.parts) {
                for (const part of chunk.candidates[0].content.parts) {
                  if (part.text) {
                    fullContent += part.text;

                    const streamChunk: StreamChunk = {
                      id: responseId,
                      provider: 'google',
                      model: modelId,
                      delta: {
                        content: part.text,
                      },
                    };

                    callback(streamChunk);
                  }
                }
              }

              if (chunk.candidates?.[0]?.finishReason) {
                finishReason = this.convertFinishReason(chunk.candidates[0].finishReason);
              }

              if (chunk.usageMetadata) {
                usage = {
                  promptTokens: chunk.usageMetadata.promptTokenCount,
                  completionTokens: chunk.usageMetadata.candidatesTokenCount,
                  totalTokens: chunk.usageMetadata.totalTokenCount,
                };
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
      id: responseId,
      provider: 'google',
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

  private convertRequest(request: CompletionRequest): GoogleCompletionRequest {
    // Extract system message and convert to Google format
    let systemInstruction: GoogleCompletionRequest['systemInstruction'];
    const contents: GoogleContent[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
        continue;
      }

      const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';
      const parts: GooglePart[] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments),
            },
          });
        }
      }

      if (msg.role === 'tool' && msg.toolCallId) {
        parts.push({
          functionResponse: {
            name: msg.name ?? 'function',
            response: { result: msg.content },
          },
        });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    const googleRequest: GoogleCompletionRequest = {
      contents,
    };

    if (systemInstruction) {
      googleRequest.systemInstruction = systemInstruction;
    }

    const generationConfig: GoogleGenerationConfig = {};

    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      generationConfig.topP = request.topP;
    }

    if (request.stop) {
      generationConfig.stopSequences = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    if (Object.keys(generationConfig).length > 0) {
      googleRequest.generationConfig = generationConfig;
    }

    if (request.tools && request.tools.length > 0) {
      googleRequest.tools = [
        {
          functionDeclarations: request.tools.map((tool) => ({
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          })),
        },
      ];

      if (request.toolChoice) {
        if (request.toolChoice === 'auto') {
          googleRequest.toolConfig = {
            functionCallingConfig: { mode: 'AUTO' },
          };
        } else if (request.toolChoice === 'none') {
          googleRequest.toolConfig = {
            functionCallingConfig: { mode: 'NONE' },
          };
        } else if (typeof request.toolChoice === 'object') {
          googleRequest.toolConfig = {
            functionCallingConfig: {
              mode: 'ANY',
              allowedFunctionNames: [request.toolChoice.function.name],
            },
          };
        }
      }
    }

    return googleRequest;
  }

  private convertResponse(
    googleResponse: GoogleCompletionResponse,
    modelId: string,
    latencyMs: number
  ): CompletionResponse {
    const choices: CompletionChoice[] = googleResponse.candidates.map((candidate) => {
      let textContent = '';
      const toolCalls: Message['toolCalls'] = [];

      for (const part of candidate.content.parts) {
        if (part.text) {
          textContent += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args),
            },
          });
        }
      }

      return {
        index: candidate.index,
        message: {
          role: 'assistant' as const,
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: this.convertFinishReason(candidate.finishReason),
      };
    });

    const usage: UsageInfo = {
      promptTokens: googleResponse.usageMetadata.promptTokenCount,
      completionTokens: googleResponse.usageMetadata.candidatesTokenCount,
      totalTokens: googleResponse.usageMetadata.totalTokenCount,
    };

    // Calculate estimated cost
    const model = GOOGLE_MODELS.find((m) => m.id === modelId);
    if (model) {
      usage.estimatedCostUsd =
        (usage.promptTokens / 1000) * model.inputCostPer1kTokens +
        (usage.completionTokens / 1000) * model.outputCostPer1kTokens;
    }

    return {
      id: this.generateRequestId(),
      provider: 'google',
      model: modelId,
      choices,
      usage,
      latencyMs,
      finishReason: choices[0]?.finishReason ?? 'stop',
    };
  }

  private convertFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
        return 'content_filter';
      case 'RECITATION':
        return 'content_filter';
      case 'OTHER':
        return 'stop';
      default:
        return 'stop';
    }
  }

  private handleError(status: number, body: string): AIError {
    let message = `Google AI API error (${status})`;
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

    return new AIError(message, code, 'google', retryable);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGoogleProvider(config: Partial<ProviderConfig> = {}): GoogleProvider {
  return new GoogleProvider({
    type: 'google',
    apiKey: config.apiKey ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel ?? 'gemini-2.0-flash',
    timeout: config.timeout ?? 120000,
    maxRetries: config.maxRetries ?? 3,
    enabled: config.enabled ?? true,
    priority: config.priority ?? 4,
    rateLimit: config.rateLimit ?? {
      requestsPerMinute: 60,
      tokensPerMinute: 1000000,
    },
    customHeaders: config.customHeaders,
  });
}
