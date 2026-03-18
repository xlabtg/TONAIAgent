/**
 * TONAIAgent - Plugin AI Integration
 *
 * Integrates the plugin system with the AI layer, providing:
 * - Tool definition conversion for AI models
 * - Tool execution via AI function calling
 * - Safety validation and confirmation flows
 * - Multi-provider compatibility
 */

import {
  PluginId,
  ToolDefinition as PluginToolDefinition,
  ToolExecutionRequest,
  PermissionScope,
} from './types';
import { PluginRegistry } from './registry';
import { PluginRuntime } from './runtime';
import { ToolDefinition, Message } from '../ai/types';

// ============================================================================
// AI Integration Types
// ============================================================================

/**
 * AI tool execution context
 */
export interface AIToolContext {
  userId: string;
  agentId: string;
  sessionId: string;
  requestId: string;
  walletAddress?: string;
  availableBalance?: string;
}

/**
 * AI tool execution options
 */
export interface AIToolExecutionOptions {
  /** Skip user confirmation */
  skipConfirmation?: boolean;

  /** Dry run mode */
  dryRun?: boolean;

  /** Timeout in milliseconds */
  timeoutMs?: number;

  /** Confirmation callback */
  onConfirmationRequired?: (
    toolName: string,
    description: string,
    params: Record<string, unknown>
  ) => Promise<boolean>;
}

/**
 * Tool call result for AI response
 */
export interface AIToolCallResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result: unknown;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

// ============================================================================
// Plugin Tool Executor
// ============================================================================

/**
 * PluginToolExecutor
 *
 * Bridges the AI layer with the plugin system, handling:
 * - Tool definition conversion
 * - Execution request routing
 * - Result formatting
 * - Safety validation
 */
export class PluginToolExecutor {
  private readonly registry: PluginRegistry;
  private readonly runtime: PluginRuntime;

  constructor(registry: PluginRegistry, runtime: PluginRuntime) {
    this.registry = registry;
    this.runtime = runtime;
  }

  // ==========================================================================
  // Tool Definition Conversion
  // ==========================================================================

  /**
   * Get all available tools formatted for AI function calling
   */
  getAIToolDefinitions(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    for (const { tool } of this.registry.getAllTools()) {
      tools.push(this.convertToAITool(tool));
    }

    return tools;
  }

  /**
   * Get tools for a specific plugin
   */
  getPluginAITools(pluginId: PluginId): ToolDefinition[] {
    const plugin = this.registry.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      return [];
    }

    return plugin.manifest.capabilities.tools.map((tool) =>
      this.convertToAITool(tool)
    );
  }

  /**
   * Get tools filtered by permission scope
   */
  getToolsByPermission(
    permissions: PermissionScope[]
  ): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    for (const { tool } of this.registry.getAllTools()) {
      // Check if tool requires any of the provided permissions
      const hasRequiredPermission = tool.requiredPermissions.every(
        (required) => permissions.includes(required)
      );

      if (hasRequiredPermission || tool.requiredPermissions.length === 0) {
        tools.push(this.convertToAITool(tool));
      }
    }

    return tools;
  }

  /**
   * Convert plugin tool definition to AI tool definition
   */
  private convertToAITool(tool: PluginToolDefinition): ToolDefinition {
    // Build parameter schema
    const parameters: Record<string, unknown> = {
      type: 'object',
      properties: {} as Record<string, unknown>,
      required: tool.parameters.required ?? [],
    };

    for (const [name, prop] of Object.entries(tool.parameters.properties)) {
      const aiProp: Record<string, unknown> = {
        type: prop.type,
        description: prop.description,
      };

      if (prop.enum) {
        aiProp.enum = prop.enum;
      }

      if (prop.default !== undefined) {
        aiProp.default = prop.default;
      }

      if (prop.minimum !== undefined) {
        aiProp.minimum = prop.minimum;
      }

      if (prop.maximum !== undefined) {
        aiProp.maximum = prop.maximum;
      }

      if (prop.minLength !== undefined) {
        aiProp.minLength = prop.minLength;
      }

      if (prop.maxLength !== undefined) {
        aiProp.maxLength = prop.maxLength;
      }

      if (prop.pattern) {
        aiProp.pattern = prop.pattern;
      }

      (parameters.properties as Record<string, unknown>)[name] = aiProp;
    }

    // Build full description including examples
    let fullDescription = tool.description;

    if (tool.requiresConfirmation) {
      fullDescription += ' (Requires user confirmation)';
    }

    if (tool.examples && tool.examples.length > 0) {
      fullDescription += '\n\nExamples:';
      for (const example of tool.examples.slice(0, 2)) {
        fullDescription += `\n- ${example.description}: ${JSON.stringify(example.input)}`;
      }
    }

    return {
      type: 'function',
      function: {
        name: tool.name,
        description: fullDescription,
        parameters,
      },
    };
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool call from AI
   */
  async executeToolCall(
    toolCallId: string,
    toolName: string,
    args: Record<string, unknown>,
    context: AIToolContext,
    options: AIToolExecutionOptions = {}
  ): Promise<AIToolCallResult> {
    // Find the plugin that owns this tool
    const pluginId = this.registry.findPluginByTool(toolName);
    if (!pluginId) {
      return {
        toolCallId,
        name: toolName,
        success: false,
        result: null,
        error: `Tool ${toolName} not found`,
      };
    }

    // Check if plugin is active
    if (!this.registry.isActive(pluginId)) {
      return {
        toolCallId,
        name: toolName,
        success: false,
        result: null,
        error: `Plugin ${pluginId} is not active`,
      };
    }

    // Get tool definition to check if confirmation is required
    const tool = this.registry.getTool(toolName);
    if (tool?.requiresConfirmation && !options.skipConfirmation) {
      if (options.onConfirmationRequired) {
        const confirmed = await options.onConfirmationRequired(
          toolName,
          tool.description,
          args
        );

        if (!confirmed) {
          return {
            toolCallId,
            name: toolName,
            success: false,
            result: null,
            error: 'User cancelled the operation',
            requiresConfirmation: true,
            confirmationMessage: `Operation ${toolName} requires confirmation`,
          };
        }
      } else {
        // Return that confirmation is needed
        return {
          toolCallId,
          name: toolName,
          success: false,
          result: null,
          requiresConfirmation: true,
          confirmationMessage: this.buildConfirmationMessage(tool, args),
        };
      }
    }

    // Build execution request
    const request: ToolExecutionRequest = {
      requestId: `${toolCallId}-${Date.now()}`,
      pluginId,
      toolName,
      parameters: args,
      context: {
        userId: context.userId,
        agentId: context.agentId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        caller: 'ai',
        transactionContext: context.walletAddress
          ? {
              walletAddress: context.walletAddress,
              availableBalance: context.availableBalance ?? '0',
              dailySpendingUsed: '0',
              dailySpendingLimit: '1000',
              requiresMultiSig: false,
            }
          : undefined,
      },
      options: {
        timeoutMs: options.timeoutMs,
        dryRun: options.dryRun,
      },
    };

    // Execute
    const result = await this.runtime.execute(request);

    return {
      toolCallId,
      name: toolName,
      success: result.success,
      result: result.data,
      error: result.error?.message,
    };
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeToolCalls(
    calls: Array<{
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }>,
    context: AIToolContext,
    options: AIToolExecutionOptions = {}
  ): Promise<AIToolCallResult[]> {
    const results: AIToolCallResult[] = [];

    for (const call of calls) {
      const result = await this.executeToolCall(
        call.toolCallId,
        call.toolName,
        call.args,
        context,
        options
      );

      results.push(result);

      // Stop on first error if not in dry run mode
      if (!result.success && !options.dryRun) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute tool calls in parallel (for independent operations)
   */
  async executeToolCallsParallel(
    calls: Array<{
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }>,
    context: AIToolContext,
    options: AIToolExecutionOptions = {}
  ): Promise<AIToolCallResult[]> {
    const promises = calls.map((call) =>
      this.executeToolCall(call.toolCallId, call.toolName, call.args, context, options)
    );

    return Promise.all(promises);
  }

  // ==========================================================================
  // Message Formatting
  // ==========================================================================

  /**
   * Format tool results as AI messages
   */
  formatToolResultsAsMessages(results: AIToolCallResult[]): Message[] {
    return results.map((result) => ({
      role: 'tool' as const,
      content: JSON.stringify(
        result.success
          ? result.result
          : { error: result.error, requiresConfirmation: result.requiresConfirmation }
      ),
      toolCallId: result.toolCallId,
      name: result.name,
    }));
  }

  /**
   * Build system message with available tools
   */
  buildToolsSystemMessage(): string {
    const tools = this.registry.getAllTools();

    if (tools.length === 0) {
      return 'No tools are currently available.';
    }

    const toolsByCategory = new Map<string, typeof tools>();

    for (const tool of tools) {
      const category = tool.tool.category;
      if (!toolsByCategory.has(category)) {
        toolsByCategory.set(category, []);
      }
      toolsByCategory.get(category)!.push(tool);
    }

    let message = 'Available tools:\n\n';

    for (const [category, categoryTools] of toolsByCategory) {
      message += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n`;

      for (const { tool } of categoryTools) {
        message += `- **${tool.name}**: ${tool.description}\n`;
        if (tool.requiresConfirmation) {
          message += '  (Requires confirmation)\n';
        }
      }

      message += '\n';
    }

    return message;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Build confirmation message for a tool
   */
  private buildConfirmationMessage(
    tool: PluginToolDefinition,
    args: Record<string, unknown>
  ): string {
    let message = `Confirm ${tool.name}?\n\n`;
    message += `Description: ${tool.description}\n\n`;
    message += 'Parameters:\n';

    for (const [key, value] of Object.entries(args)) {
      message += `- ${key}: ${JSON.stringify(value)}\n`;
    }

    if (tool.safetyConstraints) {
      message += '\nSafety constraints:\n';

      if (tool.safetyConstraints.maxValuePerExecution) {
        message += `- Max value: ${tool.safetyConstraints.maxValuePerExecution} TON\n`;
      }

      if (tool.safetyConstraints.requireMultiSigAbove) {
        message += `- Multi-sig required above: ${tool.safetyConstraints.requireMultiSigAbove} TON\n`;
      }
    }

    return message;
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(toolName: string): boolean {
    const pluginId = this.registry.findPluginByTool(toolName);
    return pluginId !== undefined && this.registry.isActive(pluginId);
  }

  /**
   * Get tool information
   */
  getToolInfo(toolName: string): PluginToolDefinition | undefined {
    return this.registry.getTool(toolName);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a plugin tool executor
 */
export function createPluginToolExecutor(
  registry: PluginRegistry,
  runtime: PluginRuntime
): PluginToolExecutor {
  return new PluginToolExecutor(registry, runtime);
}
