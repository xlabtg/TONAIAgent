/**
 * TONAIAgent - AI-Assisted Strategy Builder
 *
 * Uses AI (primarily Groq) to help users create, optimize, and understand strategies.
 * Supports natural language to strategy conversion, optimization suggestions, and risk analysis.
 */

import {
  Strategy,
  Block,
  Connection,
  AIStrategyRequest,
  AIStrategyResponse,
  AIAlternative,
  AIOptimizationSuggestion,
  AIContext,
  StrategyCategory,
  StrategyStatus,
  StrategyRiskParams,
  StrategyConfig,
  ValidationError,
  BacktestResult,
} from './types';
import { BlockRegistry } from './dsl';
import { TemplateRegistry } from './templates';

// ============================================================================
// AI Assistant Configuration
// ============================================================================

export interface AIAssistantConfig {
  /** Provider to use (groq, anthropic, openai, etc.) */
  provider?: 'groq' | 'anthropic' | 'openai' | 'auto';
  /** Model to use */
  model?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Enable verbose explanations */
  verboseExplanations?: boolean;
  /** Include risk warnings */
  includeRiskWarnings?: boolean;
  /** Suggest alternatives */
  suggestAlternatives?: boolean;
}

const DEFAULT_CONFIG: AIAssistantConfig = {
  provider: 'groq',
  model: 'llama-3.1-70b-versatile',
  temperature: 0.7,
  maxTokens: 4096,
  verboseExplanations: true,
  includeRiskWarnings: true,
  suggestAlternatives: true,
};

// ============================================================================
// AI Strategy Assistant
// ============================================================================

/**
 * AI-powered assistant for strategy creation and optimization
 */
export class AIStrategyAssistant {
  private readonly config: AIAssistantConfig;
  private readonly blockRegistry: BlockRegistry;
  private readonly templateRegistry: TemplateRegistry;

  constructor(
    config: Partial<AIAssistantConfig> = {},
    blockRegistry?: BlockRegistry,
    templateRegistry?: TemplateRegistry
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.blockRegistry = blockRegistry ?? new BlockRegistry();
    this.templateRegistry = templateRegistry ?? new TemplateRegistry();
  }

  /**
   * Generate a strategy from natural language description
   */
  async generateStrategy(request: AIStrategyRequest): Promise<AIStrategyResponse> {
    // Parse the user's intent
    const intent = this.parseIntent(request.prompt);

    // Find matching templates
    const matchingTemplates = this.findMatchingTemplates(intent, request.context);

    // Generate strategy based on intent and templates
    const strategy = this.buildStrategy(intent, matchingTemplates, request.context);

    // Generate explanation
    const explanation = this.generateExplanation(strategy, intent);

    // Analyze risks
    const riskAnalysis = this.analyzeRisks(strategy);

    // Generate alternatives
    const alternatives = this.config.suggestAlternatives
      ? this.generateAlternatives(intent, request.context)
      : [];

    // Calculate confidence
    const confidence = this.calculateConfidence(intent, matchingTemplates);

    return {
      strategy,
      explanation,
      riskAnalysis,
      alternatives,
      confidence,
    };
  }

  /**
   * Suggest optimizations for an existing strategy
   */
  suggestOptimizations(
    strategy: Strategy,
    backtestResults?: BacktestResult[]
  ): AIOptimizationSuggestion[] {
    const suggestions: AIOptimizationSuggestion[] = [];

    // Analyze strategy structure
    const structureSuggestions = this.analyzeStructure(strategy);
    suggestions.push(...structureSuggestions);

    // Analyze risk parameters
    const riskSuggestions = this.analyzeRiskParams(strategy.riskParams);
    suggestions.push(...riskSuggestions);

    // Analyze backtest results if available
    if (backtestResults && backtestResults.length > 0) {
      const performanceSuggestions = this.analyzePerformance(backtestResults);
      suggestions.push(...performanceSuggestions);
    }

    // Analyze block configurations
    const blockSuggestions = this.analyzeBlockConfigs(strategy.blocks);
    suggestions.push(...blockSuggestions);

    return suggestions;
  }

  /**
   * Explain a strategy in natural language
   */
  explainStrategy(strategy: Strategy): string {
    const parts: string[] = [];

    // Overview
    parts.push(`## Strategy: ${strategy.name}\n`);
    parts.push(`${strategy.description}\n`);

    // Triggers
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
    if (triggers.length > 0) {
      parts.push('\n### When does this strategy run?\n');
      triggers.forEach((t) => {
        parts.push(`- **${t.name}**: ${this.explainBlock(t)}`);
      });
    }

    // Conditions
    const conditions = strategy.blocks.filter((b) => b.category === 'condition');
    if (conditions.length > 0) {
      parts.push('\n### What conditions are checked?\n');
      conditions.forEach((c) => {
        parts.push(`- **${c.name}**: ${this.explainBlock(c)}`);
      });
    }

    // Actions
    const actions = strategy.blocks.filter((b) => b.category === 'action');
    if (actions.length > 0) {
      parts.push('\n### What actions are taken?\n');
      actions.forEach((a) => {
        parts.push(`- **${a.name}**: ${this.explainBlock(a)}`);
      });
    }

    // Risk controls
    const riskBlocks = strategy.blocks.filter((b) => b.category === 'risk');
    if (riskBlocks.length > 0) {
      parts.push('\n### Risk Controls\n');
      riskBlocks.forEach((r) => {
        parts.push(`- **${r.name}**: ${this.explainBlock(r)}`);
      });
    }

    // Risk parameters summary
    parts.push('\n### Safety Limits\n');
    parts.push(`- Maximum position size: ${strategy.riskParams.maxPositionSize}%`);
    parts.push(`- Maximum daily loss: ${strategy.riskParams.maxDailyLoss}%`);
    parts.push(`- Stop loss: ${strategy.riskParams.stopLossPercent}%`);
    parts.push(`- Maximum slippage: ${strategy.riskParams.maxSlippage}%`);
    parts.push(`- Maximum trades per day: ${strategy.riskParams.maxTradesPerDay}`);

    return parts.join('\n');
  }

  /**
   * Detect potential risks in a strategy
   */
  detectRisks(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for high risk parameters
    if (strategy.riskParams.maxPositionSize > 50) {
      errors.push({
        code: 'risk_exceeded',
        message: 'Position size exceeds 50% - high concentration risk',
        severity: 'warning',
      });
    }

    if (strategy.riskParams.maxDailyLoss > 10) {
      errors.push({
        code: 'risk_exceeded',
        message: 'Daily loss limit exceeds 10% - consider reducing',
        severity: 'warning',
      });
    }

    if (strategy.riskParams.maxSlippage > 3) {
      errors.push({
        code: 'risk_exceeded',
        message: 'Slippage tolerance is very high - may result in poor execution',
        severity: 'warning',
      });
    }

    // Check for missing risk controls
    const hasStopLoss = strategy.blocks.some((b) => b.category === 'risk');
    if (!hasStopLoss) {
      errors.push({
        code: 'missing_required_input',
        message: 'No risk control blocks - strategy has no automatic safety limits',
        severity: 'warning',
      });
    }

    // Check for high-frequency trading patterns
    const hasTrigger = strategy.blocks.some((b) => b.category === 'trigger');
    if (hasTrigger) {
      const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
      triggers.forEach((t) => {
        const config = t.config as { interval?: number };
        if (config.interval && config.interval < 60) {
          errors.push({
            code: 'risk_exceeded',
            message: 'Very high frequency trigger - may result in excessive gas costs',
            severity: 'info',
          });
        }
      });
    }

    // Check for missing notifications
    const hasNotification = strategy.blocks.some(
      (b) => b.category === 'action' && b.name.includes('Notification')
    );
    if (!hasNotification) {
      errors.push({
        code: 'missing_required_input',
        message: 'No notification actions - you won\'t be notified of strategy executions',
        severity: 'info',
      });
    }

    // Check for complex branching that might be confusing
    const connections = strategy.connections;
    const blockWithMultipleOutputs = strategy.blocks.filter((b) => {
      const outputs = connections.filter((c) => c.sourceBlockId === b.id);
      return outputs.length > 3;
    });
    if (blockWithMultipleOutputs.length > 0) {
      errors.push({
        code: 'invalid_config',
        message: 'Complex branching detected - strategy may be difficult to maintain',
        severity: 'info',
      });
    }

    return errors;
  }

  /**
   * Convert natural language to strategy blocks
   */
  async naturalLanguageToBlocks(prompt: string): Promise<Block[]> {
    const intent = this.parseIntent(prompt);
    const blocks: Block[] = [];
    let posY = 100;

    // Generate trigger block
    if (intent.triggerType) {
      const trigger = this.createTriggerBlock(intent.triggerType, intent, posY);
      if (trigger) {
        blocks.push(trigger);
        posY += 150;
      }
    }

    // Generate condition blocks
    if (intent.conditions && intent.conditions.length > 0) {
      intent.conditions.forEach((cond) => {
        const condition = this.createConditionBlock(cond, posY);
        if (condition) {
          blocks.push(condition);
          posY += 150;
        }
      });
    }

    // Generate risk blocks
    if (intent.riskControls && intent.riskControls.length > 0) {
      intent.riskControls.forEach((risk) => {
        const riskBlock = this.createRiskBlock(risk, posY);
        if (riskBlock) {
          blocks.push(riskBlock);
          posY += 150;
        }
      });
    }

    // Generate action blocks
    if (intent.actions && intent.actions.length > 0) {
      intent.actions.forEach((action) => {
        const actionBlock = this.createActionBlock(action, posY);
        if (actionBlock) {
          blocks.push(actionBlock);
          posY += 150;
        }
      });
    }

    return blocks;
  }

  /**
   * Get improvement suggestions based on similar successful strategies
   */
  getSimilarStrategySuggestions(strategy: Strategy): string[] {
    const suggestions: string[] = [];

    // Analyze category
    if (strategy.category === 'trading') {
      suggestions.push('Consider adding a trailing stop loss for trend-following trades');
      suggestions.push('Add volatility-based position sizing for more consistent risk');
    }

    if (strategy.category === 'yield_farming') {
      suggestions.push('Consider auto-compounding to maximize APY');
      suggestions.push('Add gas price monitoring to optimize claim timing');
    }

    if (strategy.category === 'portfolio_automation') {
      suggestions.push('Consider tax-loss harvesting opportunities');
      suggestions.push('Add correlation analysis for better diversification');
    }

    // General suggestions
    if (!strategy.blocks.some((b) => b.name.includes('Notification'))) {
      suggestions.push('Add notification blocks to stay informed of executions');
    }

    if (strategy.riskParams.cooldownSeconds < 60) {
      suggestions.push('Consider adding a cooldown period between executions');
    }

    return suggestions;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private parseIntent(prompt: string): StrategyIntent {
    const lowerPrompt = prompt.toLowerCase();
    const intent: StrategyIntent = {
      category: 'custom',
      triggerType: undefined,
      actions: [],
      conditions: [],
      riskControls: [],
      tokens: [],
      parameters: {},
    };

    // Detect category
    if (lowerPrompt.includes('dca') || lowerPrompt.includes('dollar cost')) {
      intent.category = 'trading';
      intent.triggerType = 'time_schedule';
      intent.actions.push('swap');
    } else if (lowerPrompt.includes('yield') || lowerPrompt.includes('staking') || lowerPrompt.includes('farm')) {
      intent.category = 'yield_farming';
      intent.triggerType = 'time_schedule';
      intent.actions.push('stake');
    } else if (lowerPrompt.includes('rebalanc')) {
      intent.category = 'portfolio_automation';
      intent.triggerType = 'time_schedule';
      intent.actions.push('rebalance');
    } else if (lowerPrompt.includes('arbitrage')) {
      intent.category = 'arbitrage';
      intent.triggerType = 'market_event';
      intent.actions.push('swap');
    } else if (lowerPrompt.includes('trade') || lowerPrompt.includes('buy') || lowerPrompt.includes('sell')) {
      intent.category = 'trading';
      if (lowerPrompt.includes('price')) {
        intent.triggerType = 'price_threshold';
      } else {
        intent.triggerType = 'ai_signal';
      }
      intent.actions.push('swap');
    } else if (lowerPrompt.includes('liquidity') || lowerPrompt.includes('lp')) {
      intent.category = 'liquidity_management';
      intent.triggerType = 'time_schedule';
      intent.actions.push('provide_liquidity');
    }

    // Detect tokens
    const tokenPatterns = ['ton', 'usdt', 'usdc', 'eth', 'btc', 'stton'];
    tokenPatterns.forEach((token) => {
      if (lowerPrompt.includes(token)) {
        intent.tokens.push(token.toUpperCase());
      }
    });

    // Detect risk controls
    if (lowerPrompt.includes('stop loss') || lowerPrompt.includes('stop-loss')) {
      intent.riskControls.push('stop_loss');
    }
    if (lowerPrompt.includes('take profit')) {
      intent.riskControls.push('take_profit');
    }
    if (lowerPrompt.includes('low risk') || lowerPrompt.includes('safe') || lowerPrompt.includes('conservative')) {
      intent.parameters.riskLevel = 'low';
    } else if (lowerPrompt.includes('high risk') || lowerPrompt.includes('aggressive')) {
      intent.parameters.riskLevel = 'high';
    }

    // Detect amount patterns
    const amountMatch = prompt.match(/(\$?\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      intent.parameters.amount = parseFloat(amountMatch[1].replace(/[$,]/g, ''));
    }

    // Detect percentage patterns
    const percentMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      intent.parameters.percentage = parseFloat(percentMatch[1]);
    }

    // Detect time patterns
    if (lowerPrompt.includes('daily') || lowerPrompt.includes('every day')) {
      intent.parameters.interval = 86400;
    } else if (lowerPrompt.includes('weekly')) {
      intent.parameters.interval = 604800;
    } else if (lowerPrompt.includes('hourly') || lowerPrompt.includes('every hour')) {
      intent.parameters.interval = 3600;
    }

    return intent;
  }

  private findMatchingTemplates(intent: StrategyIntent, context?: AIContext): string[] {
    const templates = this.templateRegistry.getAll();
    const matches: { id: string; score: number }[] = [];

    templates.forEach((template) => {
      let score = 0;

      // Category match
      if (template.category === intent.category) {
        score += 30;
      }

      // Risk level match
      if (context?.riskTolerance) {
        if (template.riskLevel === context.riskTolerance) {
          score += 20;
        }
      }

      // Token match
      intent.tokens.forEach((token) => {
        if (template.requiredInputs.some((i) => i.default === token)) {
          score += 10;
        }
      });

      // Tag match
      const intentTags = [intent.category, ...intent.actions, ...intent.riskControls];
      intentTags.forEach((tag) => {
        if (template.tags.includes(tag)) {
          score += 5;
        }
      });

      if (score > 0) {
        matches.push({ id: template.id, score });
      }
    });

    return matches.sort((a, b) => b.score - a.score).map((m) => m.id);
  }

  private buildStrategy(
    intent: StrategyIntent,
    templateIds: string[],
    _context?: AIContext
  ): Strategy {
    // Use best matching template as base if available
    let blocks: Block[] = [];
    let connections: Connection[] = [];

    if (templateIds.length > 0) {
      const template = this.templateRegistry.get(templateIds[0]);
      if (template) {
        blocks = template.blocks.map((b) => ({ ...b }));
        connections = template.connections.map((c) => ({ ...c }));
      }
    }

    // If no template, build from intent
    if (blocks.length === 0) {
      const generatedBlocks = this.generateBlocksFromIntent(intent);
      blocks = generatedBlocks.blocks;
      connections = generatedBlocks.connections;
    }

    // Apply risk level adjustments
    const riskParams = this.getRiskParamsForLevel(
      intent.parameters.riskLevel || _context?.riskTolerance || 'medium'
    );

    // Build strategy
    const strategy: Strategy = {
      id: `strategy_${Date.now()}`,
      name: this.generateStrategyName(intent),
      description: this.generateDescription(intent),
      category: intent.category as StrategyCategory,
      version: '1.0.0',
      author: { id: 'ai_assistant' },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft' as StrategyStatus,
      blocks,
      connections,
      config: this.getDefaultConfig(),
      riskParams,
      tags: this.generateTags(intent),
      isPublic: false,
      versionHistory: [],
    };

    return strategy;
  }

  private generateBlocksFromIntent(intent: StrategyIntent): { blocks: Block[]; connections: Connection[] } {
    const blocks: Block[] = [];
    const connections: Connection[] = [];
    let posY = 100;
    let blockIndex = 0;

    // Add trigger
    const triggerId = `block_${blockIndex++}`;
    const trigger = this.createTriggerBlock(intent.triggerType || 'manual', intent, posY);
    if (trigger) {
      trigger.id = triggerId;
      blocks.push(trigger);
      posY += 150;
    }

    let lastBlockId = triggerId;
    let lastOutputId = 'out';

    // Add conditions if any
    intent.conditions.forEach((cond) => {
      const condId = `block_${blockIndex++}`;
      const condition = this.createConditionBlock(cond, posY);
      if (condition) {
        condition.id = condId;
        blocks.push(condition);
        connections.push({
          id: `conn_${connections.length}`,
          sourceBlockId: lastBlockId,
          sourceOutputId: lastOutputId,
          targetBlockId: condId,
          targetInputId: 'in',
        });
        lastBlockId = condId;
        lastOutputId = 'true';
        posY += 150;
      }
    });

    // Add risk controls
    intent.riskControls.forEach((risk) => {
      const riskId = `block_${blockIndex++}`;
      const riskBlock = this.createRiskBlock(risk, posY);
      if (riskBlock) {
        riskBlock.id = riskId;
        blocks.push(riskBlock);
        connections.push({
          id: `conn_${connections.length}`,
          sourceBlockId: lastBlockId,
          sourceOutputId: lastOutputId,
          targetBlockId: riskId,
          targetInputId: 'in',
        });
        lastBlockId = riskId;
        lastOutputId = 'pass';
        posY += 150;
      }
    });

    // Add actions
    intent.actions.forEach((action) => {
      const actionId = `block_${blockIndex++}`;
      const actionBlock = this.createActionBlock(action, posY);
      if (actionBlock) {
        actionBlock.id = actionId;
        blocks.push(actionBlock);
        connections.push({
          id: `conn_${connections.length}`,
          sourceBlockId: lastBlockId,
          sourceOutputId: lastOutputId,
          targetBlockId: actionId,
          targetInputId: 'in',
        });
        lastBlockId = actionId;
        lastOutputId = 'success';
        posY += 150;
      }
    });

    // Add notification at the end
    const notifyId = `block_${blockIndex++}`;
    blocks.push({
      id: notifyId,
      category: 'action',
      name: 'Send Notification',
      description: 'Notify on execution',
      version: '1.0.0',
      config: {
        channel: 'telegram',
        message: 'Strategy executed successfully!',
        priority: 'normal',
      },
      position: { x: 300, y: posY },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Continue', required: true }],
      enabled: true,
    });
    connections.push({
      id: `conn_${connections.length}`,
      sourceBlockId: lastBlockId,
      sourceOutputId: lastOutputId,
      targetBlockId: notifyId,
      targetInputId: 'in',
    });

    return { blocks, connections };
  }

  private createTriggerBlock(type: string | undefined, intent: StrategyIntent, posY: number): Block | null {
    const triggerType = type || 'manual';
    const definition = this.blockRegistry.get(`trigger_${triggerType.replace('_', '')}`);

    const config: Record<string, unknown> = {};
    if (triggerType === 'time_schedule' || triggerType === 'time_interval') {
      config.scheduleType = 'interval';
      config.interval = intent.parameters.interval || 86400;
    } else if (triggerType === 'price_threshold') {
      config.token = intent.tokens[0] || 'TON';
      config.threshold = intent.parameters.amount || 5;
      config.direction = 'above';
    }

    return {
      id: 'trigger',
      category: 'trigger',
      name: definition?.name || 'Schedule',
      description: definition?.description || 'Triggers on schedule',
      version: '1.0.0',
      config,
      position: { x: 100, y: posY },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    };
  }

  private createConditionBlock(_conditionType: string, posY: number): Block | null {
    return {
      id: `condition_${Date.now()}`,
      category: 'condition',
      name: 'Price Condition',
      description: 'Check price condition',
      version: '1.0.0',
      config: {
        token: 'TON',
        operator: 'gt',
        value: 5,
      },
      position: { x: 300, y: posY },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    };
  }

  private createRiskBlock(riskType: string, posY: number): Block | null {
    if (riskType === 'stop_loss') {
      return {
        id: `risk_${Date.now()}`,
        category: 'risk',
        name: 'Stop Loss',
        description: 'Exit on loss threshold',
        version: '1.0.0',
        config: {
          type: 'percentage',
          value: 5,
        },
        position: { x: 500, y: posY },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
        outputs: [
          { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
          { id: 'triggered', type: 'output', dataType: 'trigger', label: 'Triggered', required: true },
        ],
        enabled: true,
      };
    }

    if (riskType === 'take_profit') {
      return {
        id: `risk_${Date.now()}`,
        category: 'risk',
        name: 'Take Profit',
        description: 'Exit on profit target',
        version: '1.0.0',
        config: {
          type: 'percentage',
          value: 10,
        },
        position: { x: 500, y: posY },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
        outputs: [
          { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
          { id: 'triggered', type: 'output', dataType: 'trigger', label: 'Triggered', required: true },
        ],
        enabled: true,
      };
    }

    return null;
  }

  private createActionBlock(actionType: string, posY: number): Block | null {
    if (actionType === 'swap') {
      return {
        id: `action_${Date.now()}`,
        category: 'action',
        name: 'Swap',
        description: 'Swap tokens',
        version: '1.0.0',
        config: {
          fromToken: 'USDT',
          toToken: 'TON',
          amountType: 'percentage',
          amount: 10,
          maxSlippage: 1,
          dex: 'auto',
        },
        position: { x: 700, y: posY },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
        outputs: [
          { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
          { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
        ],
        enabled: true,
      };
    }

    if (actionType === 'stake') {
      return {
        id: `action_${Date.now()}`,
        category: 'action',
        name: 'Stake',
        description: 'Stake tokens',
        version: '1.0.0',
        config: {
          token: 'TON',
          protocol: 'auto',
          amountType: 'percentage',
          amount: 50,
        },
        position: { x: 700, y: posY },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
        outputs: [
          { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
          { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
        ],
        enabled: true,
      };
    }

    if (actionType === 'rebalance') {
      return {
        id: `action_${Date.now()}`,
        category: 'action',
        name: 'Rebalance Portfolio',
        description: 'Rebalance to target allocations',
        version: '1.0.0',
        config: {
          allocations: [
            { token: 'TON', target: 50 },
            { token: 'USDT', target: 30 },
            { token: 'ETH', target: 20 },
          ],
          threshold: 5,
          maxSlippage: 1,
        },
        position: { x: 700, y: posY },
        inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
        outputs: [
          { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
          { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
        ],
        enabled: true,
      };
    }

    return null;
  }

  private getRiskParamsForLevel(level: string): StrategyRiskParams {
    if (level === 'low') {
      return {
        maxPositionSize: 20,
        maxDailyLoss: 2,
        maxDrawdown: 5,
        stopLossPercent: 3,
        takeProfitPercent: 5,
        maxSlippage: 1,
        maxTradesPerDay: 5,
        cooldownSeconds: 3600,
      };
    }

    if (level === 'high') {
      return {
        maxPositionSize: 50,
        maxDailyLoss: 10,
        maxDrawdown: 25,
        stopLossPercent: 10,
        takeProfitPercent: 20,
        maxSlippage: 3,
        maxTradesPerDay: 50,
        cooldownSeconds: 60,
      };
    }

    // Medium (default)
    return {
      maxPositionSize: 30,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      maxSlippage: 2,
      maxTradesPerDay: 20,
      cooldownSeconds: 300,
    };
  }

  private getDefaultConfig(): StrategyConfig {
    return {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: {
        onExecution: true,
        onError: true,
        onProfitTarget: true,
        onLossLimit: true,
        channels: ['telegram'],
      },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi', 'tonstakers'],
    };
  }

  private generateStrategyName(intent: StrategyIntent): string {
    const parts: string[] = [];

    if (intent.parameters.riskLevel) {
      parts.push(intent.parameters.riskLevel.charAt(0).toUpperCase() + intent.parameters.riskLevel.slice(1));
    }

    if (intent.tokens.length > 0) {
      parts.push(intent.tokens[0]);
    }

    if (intent.actions.length > 0) {
      const action = intent.actions[0];
      parts.push(action.charAt(0).toUpperCase() + action.slice(1));
    } else {
      parts.push(intent.category.charAt(0).toUpperCase() + intent.category.slice(1));
    }

    parts.push('Strategy');

    return parts.join(' ');
  }

  private generateDescription(intent: StrategyIntent): string {
    const parts: string[] = [];

    if (intent.category === 'trading') {
      parts.push('Automated trading strategy');
    } else if (intent.category === 'yield_farming') {
      parts.push('Yield farming strategy');
    } else if (intent.category === 'portfolio_automation') {
      parts.push('Portfolio management strategy');
    } else {
      parts.push('Custom strategy');
    }

    if (intent.tokens.length > 0) {
      parts.push(`for ${intent.tokens.join(', ')}`);
    }

    if (intent.actions.length > 0) {
      parts.push(`with ${intent.actions.join(', ')} actions`);
    }

    if (intent.riskControls.length > 0) {
      parts.push(`including ${intent.riskControls.join(', ')} protections`);
    }

    return parts.join(' ') + '.';
  }

  private generateTags(intent: StrategyIntent): string[] {
    const tags: string[] = [intent.category];

    tags.push(...intent.actions);
    tags.push(...intent.riskControls);
    tags.push(...intent.tokens.map((t) => t.toLowerCase()));

    if (intent.parameters.riskLevel) {
      tags.push(`${intent.parameters.riskLevel}-risk`);
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private generateExplanation(strategy: Strategy, intent: StrategyIntent): string {
    const parts: string[] = [];

    parts.push(`This ${intent.category.replace('_', ' ')} strategy has been created based on your requirements.\n`);

    parts.push(`\n**How it works:**`);

    // Explain trigger
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
    if (triggers.length > 0) {
      const trigger = triggers[0];
      const config = trigger.config as { interval?: number; scheduleType?: string };
      if (config.scheduleType === 'interval' && config.interval) {
        const hours = config.interval / 3600;
        parts.push(`- Runs every ${hours} hour(s)`);
      } else {
        parts.push(`- Triggered by: ${trigger.name}`);
      }
    }

    // Explain actions
    const actions = strategy.blocks.filter((b) => b.category === 'action');
    actions.forEach((action) => {
      parts.push(`- ${action.name}: ${action.description}`);
    });

    // Risk summary
    parts.push(`\n**Risk Controls:**`);
    parts.push(`- Maximum position: ${strategy.riskParams.maxPositionSize}% of portfolio`);
    parts.push(`- Stop loss: ${strategy.riskParams.stopLossPercent}%`);
    parts.push(`- Max daily trades: ${strategy.riskParams.maxTradesPerDay}`);

    return parts.join('\n');
  }

  private analyzeRisks(strategy: Strategy): string {
    const risks: string[] = [];

    risks.push('**Risk Analysis:**\n');

    // Market risks
    if (strategy.category === 'trading' || strategy.category === 'arbitrage') {
      risks.push('- **Market Risk**: Price movements can result in losses');
      risks.push('- **Execution Risk**: Slippage may affect trade outcomes');
    }

    // Yield farming risks
    if (strategy.category === 'yield_farming' || strategy.category === 'liquidity_management') {
      risks.push('- **Impermanent Loss**: LP positions may underperform holding');
      risks.push('- **Protocol Risk**: Smart contract vulnerabilities');
    }

    // General risks
    risks.push('- **Gas Risk**: Network congestion may increase costs');
    risks.push('- **Liquidity Risk**: Large trades may have higher slippage');

    // Risk score
    let riskScore = 0;
    if (strategy.riskParams.maxPositionSize > 30) riskScore += 20;
    if (strategy.riskParams.maxDailyLoss > 5) riskScore += 20;
    if (strategy.riskParams.stopLossPercent === 0) riskScore += 30;
    if (strategy.category === 'arbitrage') riskScore += 20;

    risks.push(`\n**Overall Risk Score**: ${Math.min(100, riskScore)}/100`);

    if (riskScore < 30) {
      risks.push('*Low risk strategy suitable for conservative investors*');
    } else if (riskScore < 60) {
      risks.push('*Moderate risk strategy - monitor regularly*');
    } else {
      risks.push('*High risk strategy - requires active monitoring*');
    }

    return risks.join('\n');
  }

  private generateAlternatives(intent: StrategyIntent, _context?: AIContext): AIAlternative[] {
    const alternatives: AIAlternative[] = [];

    if (intent.category === 'trading') {
      alternatives.push({
        name: 'DCA Strategy',
        description: 'Dollar cost averaging approach for consistent accumulation',
        tradeoffs: 'Lower returns potential but more consistent and less risky',
      });
    }

    if (intent.category === 'yield_farming') {
      alternatives.push({
        name: 'Staking Only',
        description: 'Simple staking without yield optimization',
        tradeoffs: 'Lower APY but simpler and safer',
      });
    }

    alternatives.push({
      name: 'Conservative Version',
      description: 'Same strategy with reduced risk parameters',
      tradeoffs: 'Lower potential returns but better capital preservation',
    });

    return alternatives;
  }

  private calculateConfidence(intent: StrategyIntent, templateIds: string[]): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if matching templates found
    if (templateIds.length > 0) {
      confidence += 0.2;
    }

    // Higher confidence for well-defined intents
    if (intent.category !== 'custom') {
      confidence += 0.1;
    }

    if (intent.tokens.length > 0) {
      confidence += 0.05;
    }

    if (intent.actions.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private explainBlock(block: Block): string {
    const config = block.config as Record<string, unknown>;

    switch (block.category) {
      case 'trigger':
        if (config.scheduleType === 'interval') {
          const hours = (config.interval as number) / 3600;
          return `Runs every ${hours} hour(s)`;
        }
        if (config.token && config.threshold) {
          return `Triggers when ${config.token} price is ${config.direction} ${config.threshold}`;
        }
        return 'Triggers based on configured conditions';

      case 'condition':
        if (config.token && config.operator && config.value) {
          return `Checks if ${config.token} ${this.operatorToString(config.operator as string)} ${config.value}`;
        }
        return 'Evaluates configured condition';

      case 'action':
        if (config.fromToken && config.toToken) {
          return `Swaps ${config.fromToken} to ${config.toToken}`;
        }
        if (config.token && config.protocol) {
          return `Stakes ${config.token} on ${config.protocol}`;
        }
        return `Executes ${block.name.toLowerCase()}`;

      case 'risk':
        if (config.type && config.value) {
          return `${config.type} limit set at ${config.value}%`;
        }
        return 'Enforces risk limits';

      default:
        return block.description;
    }
  }

  private operatorToString(op: string): string {
    const operators: Record<string, string> = {
      gt: 'is greater than',
      gte: 'is at least',
      lt: 'is less than',
      lte: 'is at most',
      eq: 'equals',
    };
    return operators[op] || op;
  }

  private analyzeStructure(strategy: Strategy): AIOptimizationSuggestion[] {
    const suggestions: AIOptimizationSuggestion[] = [];

    // Check for orphan blocks
    const connectedBlocks = new Set<string>();
    strategy.connections.forEach((c) => {
      connectedBlocks.add(c.sourceBlockId);
      connectedBlocks.add(c.targetBlockId);
    });

    const orphans = strategy.blocks.filter(
      (b) => b.category !== 'trigger' && !connectedBlocks.has(b.id)
    );

    if (orphans.length > 0) {
      suggestions.push({
        type: 'structure',
        target: 'connections',
        currentValue: orphans.length,
        suggestedValue: 0,
        reason: `${orphans.length} block(s) are not connected and won't be executed`,
        expectedImprovement: 0,
      });
    }

    return suggestions;
  }

  private analyzeRiskParams(params: StrategyRiskParams): AIOptimizationSuggestion[] {
    const suggestions: AIOptimizationSuggestion[] = [];

    if (params.stopLossPercent === 0) {
      suggestions.push({
        type: 'risk',
        target: 'stopLossPercent',
        currentValue: 0,
        suggestedValue: 5,
        reason: 'No stop loss configured - consider adding one for protection',
        expectedImprovement: 0,
      });
    }

    if (params.maxPositionSize > 50) {
      suggestions.push({
        type: 'risk',
        target: 'maxPositionSize',
        currentValue: params.maxPositionSize,
        suggestedValue: 30,
        reason: 'High position concentration increases risk',
        expectedImprovement: 0,
      });
    }

    return suggestions;
  }

  private analyzePerformance(results: BacktestResult[]): AIOptimizationSuggestion[] {
    const suggestions: AIOptimizationSuggestion[] = [];

    const latestResult = results[results.length - 1];
    if (latestResult && latestResult.metrics) {
      const metrics = latestResult.metrics;

      if (metrics.maxDrawdown > 20) {
        suggestions.push({
          type: 'parameter',
          target: 'stopLossPercent',
          currentValue: 'current',
          suggestedValue: 'tighter',
          reason: `High max drawdown (${metrics.maxDrawdown.toFixed(1)}%) - consider tighter stop loss`,
          expectedImprovement: -metrics.maxDrawdown * 0.3,
        });
      }

      if (metrics.winRate < 0.4) {
        suggestions.push({
          type: 'parameter',
          target: 'entryConditions',
          currentValue: 'current',
          suggestedValue: 'stricter',
          reason: `Low win rate (${(metrics.winRate * 100).toFixed(1)}%) - consider stricter entry conditions`,
          expectedImprovement: 0,
        });
      }
    }

    return suggestions;
  }

  private analyzeBlockConfigs(blocks: Block[]): AIOptimizationSuggestion[] {
    const suggestions: AIOptimizationSuggestion[] = [];

    blocks.forEach((block) => {
      const config = block.config as Record<string, unknown>;

      // Check slippage settings
      if (config.maxSlippage && (config.maxSlippage as number) > 3) {
        suggestions.push({
          type: 'parameter',
          target: `${block.id}.maxSlippage`,
          currentValue: config.maxSlippage,
          suggestedValue: 1,
          reason: 'High slippage tolerance may result in poor execution',
          expectedImprovement: 0,
        });
      }
    });

    return suggestions;
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface StrategyIntent {
  category: string;
  triggerType?: string;
  actions: string[];
  conditions: string[];
  riskControls: string[];
  tokens: string[];
  parameters: {
    amount?: number;
    percentage?: number;
    interval?: number;
    riskLevel?: string;
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new AI strategy assistant
 */
export function createAIStrategyAssistant(
  config?: Partial<AIAssistantConfig>,
  blockRegistry?: BlockRegistry,
  templateRegistry?: TemplateRegistry
): AIStrategyAssistant {
  return new AIStrategyAssistant(config, blockRegistry, templateRegistry);
}
