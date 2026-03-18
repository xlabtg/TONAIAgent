/**
 * TONAIAgent - AI Router
 *
 * Dynamic multi-model routing system with intelligent provider selection,
 * fallback chains, and cost/latency optimization.
 */

import {
  AIError,
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  ProviderType,
  RoutingConfig,
  RoutingDecision,
  RoutingMode,
  TaskType,
  StreamCallback,
  AIEvent,
  AIEventType,
  ModelFeature,
} from '../types';
import { BaseProvider, ProviderRegistry } from '../providers/base';

// ============================================================================
// Task Analyzer
// ============================================================================

interface TaskAnalysis {
  taskType: TaskType;
  complexity: 'low' | 'medium' | 'high';
  requiresTools: boolean;
  requiresVision: boolean;
  requiresReasoning: boolean;
  estimatedTokens: number;
  keywords: string[];
}

export class TaskAnalyzer {
  private readonly complexityIndicators = {
    high: [
      'analyze', 'design', 'architect', 'optimize', 'debug', 'refactor',
      'implement', 'complex', 'advanced', 'comprehensive', 'detailed',
    ],
    medium: [
      'explain', 'compare', 'evaluate', 'review', 'modify', 'update',
      'create', 'build', 'develop',
    ],
    low: [
      'simple', 'quick', 'basic', 'what is', 'how to', 'define',
      'list', 'summarize', 'translate',
    ],
  };

  private readonly taskTypeIndicators: Record<TaskType, string[]> = {
    general: ['help', 'assist', 'question'],
    code_generation: ['write code', 'implement', 'create function', 'generate', 'code'],
    code_analysis: ['review', 'analyze code', 'debug', 'explain code', 'find bug'],
    reasoning: ['think', 'reason', 'solve', 'logic', 'deduce', 'infer', 'calculate'],
    tool_use: ['search', 'fetch', 'call', 'execute', 'run', 'api'],
    conversation: ['chat', 'talk', 'discuss', 'conversation'],
    summarization: ['summarize', 'summary', 'brief', 'tldr', 'condense'],
    translation: ['translate', 'convert language', 'in french', 'in spanish'],
    classification: ['classify', 'categorize', 'label', 'tag', 'identify type'],
    extraction: ['extract', 'parse', 'find', 'get data', 'pull out'],
  };

  analyze(request: CompletionRequest): TaskAnalysis {
    const content = this.getRequestContent(request);
    const lowerContent = content.toLowerCase();

    // Determine task type
    let taskType: TaskType = 'general';
    let maxScore = 0;

    for (const [type, indicators] of Object.entries(this.taskTypeIndicators)) {
      const score = indicators.filter((ind) => lowerContent.includes(ind)).length;
      if (score > maxScore) {
        maxScore = score;
        taskType = type as TaskType;
      }
    }

    // Determine complexity
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    const highScore = this.complexityIndicators.high.filter((ind) =>
      lowerContent.includes(ind)
    ).length;
    const lowScore = this.complexityIndicators.low.filter((ind) =>
      lowerContent.includes(ind)
    ).length;

    if (highScore > lowScore) {
      complexity = 'high';
    } else if (lowScore > highScore) {
      complexity = 'low';
    }

    // Check for special requirements
    const requiresTools = request.tools !== undefined && request.tools.length > 0;
    const requiresVision = content.includes('image') || content.includes('picture');
    const requiresReasoning =
      complexity === 'high' ||
      taskType === 'reasoning' ||
      lowerContent.includes('step by step');

    // Estimate tokens
    const estimatedTokens = this.estimateTokens(content);

    // Extract keywords
    const keywords = this.extractKeywords(content);

    return {
      taskType,
      complexity,
      requiresTools,
      requiresVision,
      requiresReasoning,
      estimatedTokens,
      keywords,
    };
  }

  private getRequestContent(request: CompletionRequest): string {
    return request.messages
      .map((m) => m.content)
      .join(' ');
  }

  private estimateTokens(content: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
    ]);

    return words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }
}

// ============================================================================
// Model Scorer
// ============================================================================

interface ModelScore {
  model: ModelInfo;
  provider: ProviderType;
  score: number;
  breakdown: {
    speedScore: number;
    capabilityScore: number;
    costScore: number;
    reliabilityScore: number;
    featureScore: number;
  };
}

export class ModelScorer {
  score(
    models: Array<{ model: ModelInfo; provider: BaseProvider }>,
    task: TaskAnalysis,
    config: RoutingConfig
  ): ModelScore[] {
    const scores: ModelScore[] = [];

    for (const { model, provider } of models) {
      const status = provider.getStatus();

      // Skip unavailable providers
      if (!status.available || status.circuitState === 'open') {
        continue;
      }

      // Check required features
      if (config.requireFeatures) {
        const hasAllFeatures = config.requireFeatures.every((f) =>
          model.supportedFeatures.includes(f)
        );
        if (!hasAllFeatures) {
          continue;
        }
      }

      // Check excluded models
      if (config.excludeModels?.includes(model.id)) {
        continue;
      }

      const breakdown = this.calculateBreakdown(model, task, config, status.latencyMs);
      const totalScore = this.calculateTotalScore(breakdown, config.mode);

      scores.push({
        model,
        provider: model.provider,
        score: totalScore,
        breakdown,
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  private calculateBreakdown(
    model: ModelInfo,
    task: TaskAnalysis,
    config: RoutingConfig,
    latencyMs?: number
  ): ModelScore['breakdown'] {
    // Speed score (0-100)
    let speedScore: number;
    switch (model.capabilities.speed) {
      case 'fast':
        speedScore = 100;
        break;
      case 'medium':
        speedScore = 70;
        break;
      case 'slow':
        speedScore = 40;
        break;
    }

    // Adjust for actual latency if available
    if (latencyMs !== undefined && config.maxLatencyMs) {
      if (latencyMs > config.maxLatencyMs) {
        speedScore *= 0.5;
      }
    }

    // Capability score based on task requirements (0-100)
    let capabilityScore = 50;

    // Check reasoning capability
    if (task.requiresReasoning) {
      switch (model.capabilities.reasoning) {
        case 'expert':
          capabilityScore = 100;
          break;
        case 'advanced':
          capabilityScore = 85;
          break;
        case 'standard':
          capabilityScore = 60;
          break;
        case 'basic':
          capabilityScore = 40;
          break;
      }
    }

    // Check coding capability for code tasks
    if (task.taskType === 'code_generation' || task.taskType === 'code_analysis') {
      switch (model.capabilities.coding) {
        case 'expert':
          capabilityScore = Math.max(capabilityScore, 100);
          break;
        case 'advanced':
          capabilityScore = Math.max(capabilityScore, 85);
          break;
        case 'standard':
          capabilityScore = Math.max(capabilityScore, 60);
          break;
        case 'basic':
          capabilityScore = Math.max(capabilityScore, 40);
          break;
      }
    }

    // Cost score (0-100, lower cost = higher score)
    let costScore: number;
    const avgCost = (model.inputCostPer1kTokens + model.outputCostPer1kTokens) / 2;

    if (avgCost === 0) {
      costScore = 100;
    } else if (avgCost < 0.001) {
      costScore = 95;
    } else if (avgCost < 0.005) {
      costScore = 80;
    } else if (avgCost < 0.01) {
      costScore = 60;
    } else if (avgCost < 0.05) {
      costScore = 40;
    } else {
      costScore = 20;
    }

    // Check cost constraint
    if (config.maxCostPerRequest) {
      const estimatedCost =
        (task.estimatedTokens / 1000) * model.inputCostPer1kTokens +
        (task.estimatedTokens / 1000) * model.outputCostPer1kTokens;

      if (estimatedCost > config.maxCostPerRequest) {
        costScore *= 0.3;
      }
    }

    // Reliability score (based on circuit state)
    const reliabilityScore = 80; // Default, could be improved with historical data

    // Feature score
    let featureScore = 50;
    const requiredFeatures: ModelFeature[] = [];

    if (task.requiresTools) {
      requiredFeatures.push('tool_use');
    }
    if (task.requiresVision) {
      requiredFeatures.push('vision');
    }
    if (task.requiresReasoning) {
      requiredFeatures.push('reasoning');
    }
    if (task.taskType === 'code_generation' || task.taskType === 'code_analysis') {
      requiredFeatures.push('code');
    }

    if (requiredFeatures.length > 0) {
      const matchedFeatures = requiredFeatures.filter((f) =>
        model.supportedFeatures.includes(f)
      ).length;
      featureScore = (matchedFeatures / requiredFeatures.length) * 100;
    }

    return {
      speedScore,
      capabilityScore,
      costScore,
      reliabilityScore,
      featureScore,
    };
  }

  private calculateTotalScore(
    breakdown: ModelScore['breakdown'],
    mode: RoutingMode
  ): number {
    // Weight factors based on routing mode
    let weights: {
      speed: number;
      capability: number;
      cost: number;
      reliability: number;
      feature: number;
    };

    switch (mode) {
      case 'fast':
        weights = { speed: 0.4, capability: 0.2, cost: 0.15, reliability: 0.15, feature: 0.1 };
        break;
      case 'quality':
        weights = { speed: 0.1, capability: 0.4, cost: 0.1, reliability: 0.2, feature: 0.2 };
        break;
      case 'cost_optimized':
        weights = { speed: 0.15, capability: 0.2, cost: 0.4, reliability: 0.15, feature: 0.1 };
        break;
      case 'balanced':
      default:
        weights = { speed: 0.2, capability: 0.25, cost: 0.2, reliability: 0.2, feature: 0.15 };
        break;
    }

    return (
      breakdown.speedScore * weights.speed +
      breakdown.capabilityScore * weights.capability +
      breakdown.costScore * weights.cost +
      breakdown.reliabilityScore * weights.reliability +
      breakdown.featureScore * weights.feature
    );
  }
}

// ============================================================================
// AI Router
// ============================================================================

export interface RouterConfig extends RoutingConfig {
  enableAnalytics?: boolean;
  onEvent?: (event: AIEvent) => void;
}

export class AIRouter {
  private readonly registry: ProviderRegistry;
  private readonly taskAnalyzer: TaskAnalyzer;
  private readonly modelScorer: ModelScorer;
  private readonly config: RouterConfig;

  constructor(registry: ProviderRegistry, config: RouterConfig) {
    this.registry = registry;
    this.taskAnalyzer = new TaskAnalyzer();
    this.modelScorer = new ModelScorer();
    this.config = config;
  }

  /**
   * Route a completion request to the best provider/model
   */
  async route(request: CompletionRequest): Promise<RoutingDecision> {
    const task = this.taskAnalyzer.analyze(request);

    // Get all available models from all providers
    const modelsWithProviders: Array<{ model: ModelInfo; provider: BaseProvider }> = [];

    for (const provider of this.registry.getAvailable()) {
      const models = await provider.getModels();
      for (const model of models) {
        modelsWithProviders.push({ model, provider });
      }
    }

    if (modelsWithProviders.length === 0) {
      throw new AIError(
        'No available providers for routing',
        'NO_AVAILABLE_PROVIDERS',
        undefined,
        true
      );
    }

    // Check if user specified a preferred model
    if (request.model) {
      const match = modelsWithProviders.find((m) => m.model.id === request.model);
      if (match) {
        return this.createDecision(match.model, match.provider, 'User specified model', []);
      }
    }

    // Check for task-specific routing
    if (this.config.taskTypeRouting?.[task.taskType]) {
      const taskRouting = this.config.taskTypeRouting[task.taskType];
      if (taskRouting.preferredModel) {
        const match = modelsWithProviders.find(
          (m) => m.model.id === taskRouting.preferredModel
        );
        if (match) {
          return this.createDecision(
            match.model,
            match.provider,
            `Task-specific routing for ${task.taskType}`,
            []
          );
        }
      }
    }

    // Score all models
    const scores = this.modelScorer.score(modelsWithProviders, task, this.config);

    if (scores.length === 0) {
      throw new AIError(
        'No suitable models available for this request',
        'NO_AVAILABLE_PROVIDERS',
        undefined,
        true
      );
    }

    // Select the best model
    const best = scores[0];
    const alternatives = scores.slice(1, 4);

    const provider = this.registry.get(best.provider);
    if (!provider) {
      throw new AIError(
        `Provider ${best.provider} not found`,
        'ROUTING_ERROR',
        best.provider
      );
    }

    // Calculate estimated latency and cost
    const estimatedLatencyMs = this.estimateLatency(best.model);
    const estimatedCostUsd = this.estimateCost(best.model, task.estimatedTokens);

    // Emit routing event
    this.emitEvent('routing_decision', {
      provider: best.provider,
      model: best.model.id,
      score: best.score,
      taskType: task.taskType,
      complexity: task.complexity,
    });

    return {
      provider: best.provider,
      model: best.model.id,
      reason: `Best match for ${task.taskType} task (score: ${best.score.toFixed(2)})`,
      alternatives: alternatives.map((a) => ({
        provider: a.provider,
        model: a.model.id,
        score: a.score,
      })),
      estimatedLatencyMs,
      estimatedCostUsd,
    };
  }

  /**
   * Execute a request with automatic routing and fallback
   */
  async execute(request: CompletionRequest): Promise<CompletionResponse> {
    const decision = await this.route(request);

    // Build fallback chain
    const fallbackChain: Array<{ provider: ProviderType; model: string }> = [
      { provider: decision.provider, model: decision.model },
      ...decision.alternatives.map((a) => ({ provider: a.provider, model: a.model })),
    ];

    // Add configured fallback chain
    if (this.config.fallbackChain) {
      for (const providerType of this.config.fallbackChain) {
        if (!fallbackChain.some((f) => f.provider === providerType)) {
          const provider = this.registry.get(providerType);
          if (provider) {
            const models = await provider.getModels();
            if (models.length > 0) {
              fallbackChain.push({
                provider: providerType,
                model: models[0].id,
              });
            }
          }
        }
      }
    }

    let lastError: AIError | undefined;

    // Try each provider in the fallback chain
    for (const fallback of fallbackChain) {
      const provider = this.registry.get(fallback.provider);
      if (!provider) continue;

      const status = provider.getStatus();
      if (!status.available || status.circuitState === 'open') {
        continue;
      }

      try {
        const requestWithModel = { ...request, model: fallback.model };
        const response = await provider.complete(requestWithModel);

        // If we had to fallback, emit event
        if (fallback.provider !== decision.provider) {
          this.emitEvent('provider_fallback', {
            originalProvider: decision.provider,
            fallbackProvider: fallback.provider,
            reason: lastError?.message ?? 'Unknown',
          });
        }

        return response;
      } catch (error) {
        if (error instanceof AIError) {
          lastError = error;

          this.emitEvent('request_failed', {
            provider: fallback.provider,
            model: fallback.model,
            error: error.message,
            code: error.code,
          });

          // If it's a non-retryable error, don't try fallbacks
          if (!error.retryable) {
            throw error;
          }
        } else {
          lastError = new AIError(
            error instanceof Error ? error.message : 'Unknown error',
            'PROVIDER_ERROR',
            fallback.provider,
            true
          );
        }
      }
    }

    throw lastError ?? new AIError(
      'All providers failed',
      'NO_AVAILABLE_PROVIDERS',
      undefined,
      false
    );
  }

  /**
   * Execute a streaming request with automatic routing and fallback
   */
  async stream(
    request: CompletionRequest,
    callback: StreamCallback
  ): Promise<CompletionResponse> {
    const decision = await this.route(request);

    // Build fallback chain
    const fallbackChain: Array<{ provider: ProviderType; model: string }> = [
      { provider: decision.provider, model: decision.model },
      ...decision.alternatives.map((a) => ({ provider: a.provider, model: a.model })),
    ];

    let lastError: AIError | undefined;

    // Try each provider in the fallback chain
    for (const fallback of fallbackChain) {
      const provider = this.registry.get(fallback.provider);
      if (!provider) continue;

      const status = provider.getStatus();
      if (!status.available || status.circuitState === 'open') {
        continue;
      }

      try {
        const requestWithModel = { ...request, model: fallback.model, stream: true };
        const response = await provider.stream(requestWithModel, callback);

        // If we had to fallback, emit event
        if (fallback.provider !== decision.provider) {
          this.emitEvent('provider_fallback', {
            originalProvider: decision.provider,
            fallbackProvider: fallback.provider,
            reason: lastError?.message ?? 'Unknown',
          });
        }

        return response;
      } catch (error) {
        if (error instanceof AIError) {
          lastError = error;

          // If it's a non-retryable error, don't try fallbacks
          if (!error.retryable) {
            throw error;
          }
        } else {
          lastError = new AIError(
            error instanceof Error ? error.message : 'Unknown error',
            'PROVIDER_ERROR',
            fallback.provider,
            true
          );
        }
      }
    }

    throw lastError ?? new AIError(
      'All providers failed',
      'NO_AVAILABLE_PROVIDERS',
      undefined,
      false
    );
  }

  /**
   * Get the current routing config
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }

  /**
   * Update the routing config
   */
  updateConfig(updates: Partial<RouterConfig>): void {
    Object.assign(this.config, updates);
  }

  private createDecision(
    model: ModelInfo,
    _provider: BaseProvider,
    reason: string,
    alternatives: RoutingDecision['alternatives']
  ): RoutingDecision {
    return {
      provider: model.provider,
      model: model.id,
      reason,
      alternatives,
      estimatedLatencyMs: this.estimateLatency(model),
      estimatedCostUsd: this.estimateCost(model, 1000),
    };
  }

  private estimateLatency(model: ModelInfo): number {
    switch (model.capabilities.speed) {
      case 'fast':
        return 500;
      case 'medium':
        return 2000;
      case 'slow':
        return 5000;
      default:
        return 2000;
    }
  }

  private estimateCost(model: ModelInfo, estimatedTokens: number): number {
    return (
      (estimatedTokens / 1000) * model.inputCostPer1kTokens +
      (estimatedTokens / 1000) * model.outputCostPer1kTokens
    );
  }

  private emitEvent(type: AIEventType, metadata: Record<string, unknown>): void {
    if (!this.config.enableAnalytics || !this.config.onEvent) {
      return;
    }

    const event: AIEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type,
      success: type !== 'request_failed',
      metadata,
    };

    this.config.onEvent(event);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAIRouter(
  registry: ProviderRegistry,
  config: Partial<RouterConfig> = {}
): AIRouter {
  const defaultConfig: RouterConfig = {
    mode: 'balanced',
    primaryProvider: 'groq',
    fallbackChain: ['anthropic', 'openai', 'google', 'xai', 'openrouter'],
    enableAnalytics: true,
    ...config,
  };

  return new AIRouter(registry, defaultConfig);
}
