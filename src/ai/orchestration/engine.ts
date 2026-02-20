/**
 * TONAIAgent - AI Orchestration Engine
 *
 * Core orchestration layer that coordinates:
 * - Provider routing
 * - Memory management
 * - Tool execution
 * - Safety validation
 * - Observability
 */

import {
  AgentConfig,
  CompletionRequest,
  CompletionResponse,
  ExecutionContext,
  ExecutionResult,
  ExecutionMetrics,
  Message,
  ToolDefinition,
  ToolResult,
  AIEvent,
  AIEventType,
  SafetyCheckResult,
  StreamCallback,
  AIError,
} from '../types';
import { AIRouter, createAIRouter } from '../routing';
import { MemoryManager, createMemoryManager } from '../memory';
import { SafetyManager, createSafetyManager } from '../safety';
import { ProviderRegistry } from '../providers/base';

// ============================================================================
// Tool Executor Interface
// ============================================================================

export interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>): Promise<unknown>;
  isAvailable(name: string): boolean;
}

// ============================================================================
// Default Tool Executor (placeholder)
// ============================================================================

export class DefaultToolExecutor implements ToolExecutor {
  private readonly tools = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  register(name: string, handler: (args: Record<string, unknown>) => Promise<unknown>): void {
    this.tools.set(name, handler);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool ${name} not found`);
    }
    return handler(args);
  }

  isAvailable(name: string): boolean {
    return this.tools.has(name);
  }
}

// ============================================================================
// Orchestration Engine
// ============================================================================

export interface OrchestrationConfig {
  maxIterations: number;
  timeoutMs: number;
  enableMemory: boolean;
  enableSafety: boolean;
  enableObservability: boolean;
  onEvent?: (event: AIEvent) => void;
}

export class OrchestrationEngine {
  private readonly router: AIRouter;
  private readonly memoryManager: MemoryManager;
  private readonly safetyManager: SafetyManager;
  private readonly toolExecutor: ToolExecutor;
  private readonly config: OrchestrationConfig;

  constructor(
    registry: ProviderRegistry,
    config: Partial<OrchestrationConfig> = {},
    toolExecutor?: ToolExecutor
  ) {
    this.config = {
      maxIterations: 10,
      timeoutMs: 120000,
      enableMemory: true,
      enableSafety: true,
      enableObservability: true,
      ...config,
    };

    this.router = createAIRouter(registry, {
      mode: 'balanced',
      primaryProvider: 'groq',
      fallbackChain: ['anthropic', 'openai', 'google', 'xai', 'openrouter'],
      enableAnalytics: this.config.enableObservability,
      onEvent: config.onEvent,
    });

    this.memoryManager = createMemoryManager({
      enabled: this.config.enableMemory,
      shortTermCapacity: 50,
      longTermEnabled: true,
      vectorSearch: false,
      contextWindowRatio: 0.3,
    });

    this.safetyManager = createSafetyManager();
    this.toolExecutor = toolExecutor ?? new DefaultToolExecutor();
  }

  /**
   * Execute an agent task with full orchestration
   */
  async execute(
    agent: AgentConfig,
    messages: Message[],
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const safetyChecks: SafetyCheckResult[] = [];
    const toolResults: ToolResult[] = [];
    let iterationCount = 0;
    let retryCount = 0;

    this.emitEvent('request_started', context, {
      agentId: agent.id,
      messageCount: messages.length,
    });

    try {
      // Build initial context with memory
      let contextMessages: Message[] = [];
      if (this.config.enableMemory) {
        contextMessages = await this.memoryManager.buildContext(
          agent.id,
          context.sessionId,
          messages[messages.length - 1]?.content
        );
      }

      // Add system prompt
      const fullMessages: Message[] = [
        { role: 'system', content: agent.systemPrompt },
        ...contextMessages,
        ...messages,
      ];

      // Validate input
      if (this.config.enableSafety) {
        const inputChecks = this.safetyManager.validateRequest({
          messages: fullMessages,
        });
        safetyChecks.push(...inputChecks);

        const blocked = inputChecks.find((c) => c.action === 'block');
        if (blocked) {
          throw new AIError(
            blocked.reason ?? 'Input blocked by safety check',
            'SAFETY_VIOLATION',
            undefined,
            false,
            { check: blocked }
          );
        }
      }

      // Add messages to short-term memory
      if (this.config.enableMemory) {
        for (const msg of messages) {
          this.memoryManager.addToShortTerm(agent.id, context.sessionId, msg);
        }
      }

      // Execute with tool loop
      let currentMessages = [...fullMessages];
      let response: CompletionResponse | undefined;
      let llmLatencyMs = 0;
      let toolLatencyMs = 0;

      while (iterationCount < this.config.maxIterations) {
        iterationCount++;

        // Check timeout
        if (Date.now() - startTime > this.config.timeoutMs) {
          throw new AIError(
            'Execution timeout exceeded',
            'TIMEOUT',
            undefined,
            false
          );
        }

        // Execute completion
        const completionStart = Date.now();
        const request: CompletionRequest = {
          messages: currentMessages,
          tools: agent.tools,
          toolChoice: agent.tools.length > 0 ? 'auto' : undefined,
          temperature: 0.7,
          maxTokens: 4096,
        };

        response = await this.router.execute(request);
        llmLatencyMs += Date.now() - completionStart;

        // Validate output
        if (this.config.enableSafety) {
          const outputChecks = this.safetyManager.validateResponse(response);
          safetyChecks.push(...outputChecks);

          const blocked = outputChecks.find((c) => c.action === 'block');
          if (blocked) {
            // Redact and continue rather than fail
            response.choices[0].message.content = this.safetyManager.redactOutput(
              response.choices[0].message.content
            );
          }
        }

        // Check for tool calls
        const toolCalls = response.choices[0]?.message.toolCalls;
        if (!toolCalls || toolCalls.length === 0) {
          break;
        }

        // Execute tools
        const toolStart = Date.now();
        const toolCallResults = await this.executeTools(toolCalls, agent.tools);
        toolResults.push(...toolCallResults);
        toolLatencyMs += Date.now() - toolStart;

        // Add assistant message and tool results to conversation
        currentMessages.push(response.choices[0].message);

        for (const result of toolCallResults) {
          currentMessages.push({
            role: 'tool',
            content: JSON.stringify(result.result),
            toolCallId: result.toolCallId,
            name: result.name,
          });
        }
      }

      if (!response) {
        throw new AIError(
          'No response generated',
          'UNKNOWN_ERROR',
          undefined,
          true
        );
      }

      // Add assistant response to memory
      if (this.config.enableMemory) {
        this.memoryManager.addToShortTerm(agent.id, context.sessionId, {
          role: 'assistant',
          content: response.choices[0].message.content,
        });

        // Extract and store important information
        await this.memoryManager.extractAndStore(
          agent.id,
          [response.choices[0].message],
          { sessionId: context.sessionId, userId: context.userId }
        );
      }

      const totalLatencyMs = Date.now() - startTime;

      const metrics: ExecutionMetrics = {
        totalLatencyMs,
        llmLatencyMs,
        toolLatencyMs,
        memoryLatencyMs: totalLatencyMs - llmLatencyMs - toolLatencyMs,
        tokenUsage: response.usage,
        iterationCount,
        retryCount,
        provider: response.provider,
        model: response.model,
      };

      this.emitEvent('request_completed', context, {
        agentId: agent.id,
        latencyMs: totalLatencyMs,
        tokenUsage: response.usage,
        provider: response.provider,
        model: response.model,
      });

      return {
        success: true,
        response,
        toolResults,
        safetyChecks,
        metrics,
      };
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;

      this.emitEvent('request_failed', context, {
        agentId: agent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: totalLatencyMs,
      });

      const aiError =
        error instanceof AIError
          ? error
          : new AIError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
              undefined,
              true
            );

      return {
        success: false,
        response: this.createErrorResponse(aiError),
        toolResults,
        safetyChecks,
        metrics: {
          totalLatencyMs,
          llmLatencyMs: 0,
          toolLatencyMs: 0,
          memoryLatencyMs: 0,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          iterationCount,
          retryCount,
          provider: 'groq',
          model: 'unknown',
        },
        error: aiError,
      };
    }
  }

  /**
   * Execute a streaming agent task
   */
  async stream(
    agent: AgentConfig,
    messages: Message[],
    context: ExecutionContext,
    callback: StreamCallback
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const safetyChecks: SafetyCheckResult[] = [];

    this.emitEvent('request_started', context, {
      agentId: agent.id,
      messageCount: messages.length,
      streaming: true,
    });

    try {
      // Build context
      let contextMessages: Message[] = [];
      if (this.config.enableMemory) {
        contextMessages = await this.memoryManager.buildContext(
          agent.id,
          context.sessionId,
          messages[messages.length - 1]?.content
        );
      }

      const fullMessages: Message[] = [
        { role: 'system', content: agent.systemPrompt },
        ...contextMessages,
        ...messages,
      ];

      // Validate input
      if (this.config.enableSafety) {
        const inputChecks = this.safetyManager.validateRequest({
          messages: fullMessages,
        });
        safetyChecks.push(...inputChecks);

        const blocked = inputChecks.find((c) => c.action === 'block');
        if (blocked) {
          throw new AIError(
            blocked.reason ?? 'Input blocked by safety check',
            'SAFETY_VIOLATION',
            undefined,
            false
          );
        }
      }

      // Execute streaming completion
      const request: CompletionRequest = {
        messages: fullMessages,
        temperature: 0.7,
        maxTokens: 4096,
        stream: true,
      };

      const response = await this.router.stream(request, callback);
      const totalLatencyMs = Date.now() - startTime;

      // Add to memory
      if (this.config.enableMemory) {
        for (const msg of messages) {
          this.memoryManager.addToShortTerm(agent.id, context.sessionId, msg);
        }
        this.memoryManager.addToShortTerm(agent.id, context.sessionId, {
          role: 'assistant',
          content: response.choices[0].message.content,
        });
      }

      const metrics: ExecutionMetrics = {
        totalLatencyMs,
        llmLatencyMs: totalLatencyMs,
        toolLatencyMs: 0,
        memoryLatencyMs: 0,
        tokenUsage: response.usage,
        iterationCount: 1,
        retryCount: 0,
        provider: response.provider,
        model: response.model,
      };

      this.emitEvent('request_completed', context, {
        agentId: agent.id,
        latencyMs: totalLatencyMs,
        tokenUsage: response.usage,
        provider: response.provider,
        model: response.model,
        streaming: true,
      });

      return {
        success: true,
        response,
        safetyChecks,
        metrics,
      };
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;

      const aiError =
        error instanceof AIError
          ? error
          : new AIError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
              undefined,
              true
            );

      this.emitEvent('request_failed', context, {
        agentId: agent.id,
        error: aiError.message,
        latencyMs: totalLatencyMs,
      });

      return {
        success: false,
        response: this.createErrorResponse(aiError),
        safetyChecks,
        metrics: {
          totalLatencyMs,
          llmLatencyMs: 0,
          toolLatencyMs: 0,
          memoryLatencyMs: 0,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          iterationCount: 1,
          retryCount: 0,
          provider: 'groq',
          model: 'unknown',
        },
        error: aiError,
      };
    }
  }

  /**
   * Simple completion without full orchestration
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return this.router.execute(request);
  }

  /**
   * Get the router instance
   */
  getRouter(): AIRouter {
    return this.router;
  }

  /**
   * Get the memory manager instance
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Get the safety manager instance
   */
  getSafetyManager(): SafetyManager {
    return this.safetyManager;
  }

  private async executeTools(
    toolCalls: NonNullable<Message['toolCalls']>,
    availableTools: ToolDefinition[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const startTime = Date.now();
      const toolName = call.function.name;

      // Validate tool is available
      const toolDef = availableTools.find((t) => t.function.name === toolName);
      if (!toolDef) {
        results.push({
          toolCallId: call.id,
          name: toolName,
          result: { error: `Tool ${toolName} not found` },
          success: false,
          latencyMs: Date.now() - startTime,
          error: `Tool ${toolName} not found`,
        });
        continue;
      }

      try {
        const args = JSON.parse(call.function.arguments);
        const result = await this.toolExecutor.execute(toolName, args);

        results.push({
          toolCallId: call.id,
          name: toolName,
          result,
          success: true,
          latencyMs: Date.now() - startTime,
        });

        this.emitToolEvent('tool_executed', {
          toolName,
          success: true,
          latencyMs: Date.now() - startTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          toolCallId: call.id,
          name: toolName,
          result: { error: errorMessage },
          success: false,
          latencyMs: Date.now() - startTime,
          error: errorMessage,
        });

        this.emitToolEvent('tool_executed', {
          toolName,
          success: false,
          error: errorMessage,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  private createErrorResponse(error: AIError): CompletionResponse {
    return {
      id: `error-${Date.now()}`,
      provider: 'groq',
      model: 'error',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `I encountered an error: ${error.message}`,
          },
          finishReason: 'error',
        },
      ],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      latencyMs: 0,
      finishReason: 'error',
    };
  }

  private emitEvent(
    type: AIEventType,
    context: ExecutionContext,
    metadata: Record<string, unknown>
  ): void {
    if (!this.config.enableObservability || !this.config.onEvent) {
      return;
    }

    const event: AIEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      agentId: context.agentId,
      userId: context.userId,
      sessionId: context.sessionId,
      success: type !== 'request_failed',
      metadata,
    };

    this.config.onEvent(event);
  }

  private emitToolEvent(type: AIEventType, metadata: Record<string, unknown>): void {
    if (!this.config.enableObservability || !this.config.onEvent) {
      return;
    }

    const event: AIEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      success: metadata.success as boolean,
      metadata,
    };

    this.config.onEvent(event);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrationEngine(
  registry: ProviderRegistry,
  config?: Partial<OrchestrationConfig>,
  toolExecutor?: ToolExecutor
): OrchestrationEngine {
  return new OrchestrationEngine(registry, config, toolExecutor);
}
