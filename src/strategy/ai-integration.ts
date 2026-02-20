/**
 * TONAIAgent - Strategy AI Integration
 *
 * Integrates the Strategy Engine with the AI Layer for intelligent
 * strategy generation, analysis, and optimization.
 */

import {
  Strategy,
  StrategySpec,
  StrategyType,
  AIStrategyResponse,
  AIStrategyConstraints,
  StrategyAnalysis,
  StrategySuggestion,
  StrategyTrigger,
  StrategyAction,
  RiskControl,
  StrategyRiskLevel,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AIIntegrationConfig {
  enabled: boolean;
  modelPreference?: 'fast' | 'balanced' | 'quality';
  maxTokens?: number;
  temperature?: number;
}

export interface StrategyGenerationRequest {
  userProfile: {
    riskTolerance: StrategyRiskLevel;
    investmentHorizon: 'short' | 'medium' | 'long';
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferences: string[];
    availableCapital: number;
  };
  marketConditions?: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    liquidity: 'low' | 'medium' | 'high';
  };
  constraints?: AIStrategyConstraints;
  description?: string;
}

export interface StrategyAnalysisRequest {
  strategy: Strategy;
  includeBacktest?: boolean;
  compareToTemplates?: boolean;
}

export interface StrategyImprovementRequest {
  strategy: Strategy;
  targetMetric?: 'return' | 'sharpe' | 'drawdown' | 'win_rate';
  constraints?: AIStrategyConstraints;
}

// ============================================================================
// AI Strategy Generator
// ============================================================================

export class AIStrategyGenerator {
  private readonly templates: Map<string, StrategySpec> = new Map();

  constructor(
    private readonly config: AIIntegrationConfig
  ) {
    this.initializeTemplates();
  }

  /**
   * Generate a strategy based on user requirements
   */
  async generateStrategy(request: StrategyGenerationRequest): Promise<AIStrategyResponse> {
    if (!this.config.enabled) {
      throw new Error('AI integration is disabled');
    }

    // Select template based on user profile
    const template = this.selectTemplate(request);

    // Customize template based on constraints
    const customized = this.customizeTemplate(template, request);

    // Add risk controls based on risk tolerance
    const withRiskControls = this.addRiskControls(customized, request.userProfile.riskTolerance);

    // Calculate confidence based on how well we matched requirements
    const confidence = this.calculateConfidence(request, withRiskControls);

    return {
      strategy: withRiskControls,
      confidence,
      explanation: this.generateExplanation(request, withRiskControls),
    };
  }

  /**
   * Analyze an existing strategy
   */
  async analyzeStrategy(request: StrategyAnalysisRequest): Promise<AIStrategyResponse> {
    const strategy = request.strategy;
    const def = strategy.definition;

    const analysis: StrategyAnalysis = {
      strengths: [],
      weaknesses: [],
      risks: [],
      opportunities: [],
      overallScore: 0,
    };

    // Analyze triggers
    if (def.triggers.length > 0) {
      analysis.strengths.push(`Has ${def.triggers.length} trigger(s) for execution`);
      if (def.triggers.some(t => t.config.type === 'schedule')) {
        analysis.strengths.push('Uses scheduled execution for consistent operation');
      }
      if (def.triggers.some(t => t.config.type === 'price')) {
        analysis.strengths.push('Responds to price movements');
      }
    } else {
      analysis.weaknesses.push('No triggers defined');
    }

    // Analyze actions
    const actionTypes = new Set(def.actions.map(a => a.type));
    if (actionTypes.has('swap')) {
      analysis.strengths.push('Includes swap actions for portfolio management');
    }
    if (actionTypes.has('rebalance')) {
      analysis.strengths.push('Has rebalancing capability');
    }
    if (def.actions.length > 5) {
      analysis.weaknesses.push('High number of actions may increase complexity and gas costs');
    }

    // Analyze risk controls
    const riskTypes = new Set(def.riskControls.map(r => r.type));
    if (riskTypes.has('stop_loss')) {
      analysis.strengths.push('Has stop-loss protection');
    } else {
      analysis.weaknesses.push('Missing stop-loss protection');
      analysis.risks.push('No downside protection may lead to significant losses');
    }
    if (riskTypes.has('take_profit')) {
      analysis.strengths.push('Has take-profit rules');
    }
    if (riskTypes.has('max_drawdown')) {
      analysis.strengths.push('Monitors maximum drawdown');
    }

    // Analyze capital allocation
    const cap = def.capitalAllocation;
    if (cap.reservePercentage < 10) {
      analysis.risks.push('Low reserve percentage may leave insufficient buffer');
    }
    if (cap.allocatedPercentage && cap.allocatedPercentage > 50) {
      analysis.risks.push('High capital allocation increases risk exposure');
    }

    // Opportunities
    if (!riskTypes.has('trailing_stop')) {
      analysis.opportunities.push('Consider adding trailing stop-loss for trend-following');
    }
    if (!actionTypes.has('notify')) {
      analysis.opportunities.push('Add notifications for important events');
    }
    if (def.conditions.length === 0) {
      analysis.opportunities.push('Add conditions to filter execution timing');
    }

    // Calculate overall score
    const strengthScore = analysis.strengths.length * 10;
    const weaknessScore = analysis.weaknesses.length * -8;
    const riskScore = analysis.risks.length * -5;
    const opportunityScore = analysis.opportunities.length * 2;

    analysis.overallScore = Math.max(0, Math.min(100,
      50 + strengthScore + weaknessScore + riskScore + opportunityScore
    ));

    return {
      analysis,
      confidence: 0.85,
    };
  }

  /**
   * Suggest improvements for a strategy
   */
  async suggestImprovements(request: StrategyImprovementRequest): Promise<AIStrategyResponse> {
    const suggestions: StrategySuggestion[] = [];
    const def = request.strategy.definition;

    // Check for missing risk controls
    const hasStopLoss = def.riskControls.some(r => r.type === 'stop_loss');
    if (!hasStopLoss) {
      suggestions.push({
        type: 'add_risk_control',
        description: 'Add a stop-loss to protect against significant losses',
        rationale: 'Stop-losses are essential for risk management and can prevent catastrophic drawdowns',
        expectedImpact: 0.3,
        implementation: {
          riskControls: [{
            id: 'suggested_stop_loss',
            type: 'stop_loss',
            name: 'Suggested Stop Loss',
            enabled: true,
            config: { type: 'stop_loss', percentage: 10 },
            action: { type: 'close' },
          }],
        },
      });
    }

    // Check for missing take-profit
    const hasTakeProfit = def.riskControls.some(r => r.type === 'take_profit');
    if (!hasTakeProfit) {
      suggestions.push({
        type: 'add_risk_control',
        description: 'Add a take-profit to lock in gains',
        rationale: 'Take-profit rules help capture gains and prevent giving back profits',
        expectedImpact: 0.2,
        implementation: {
          riskControls: [{
            id: 'suggested_take_profit',
            type: 'take_profit',
            name: 'Suggested Take Profit',
            enabled: true,
            config: { type: 'take_profit', percentage: 20, sellPercentage: 50 },
            action: { type: 'reduce', sellPercentage: 50 },
          }],
        },
      });
    }

    // Check trigger frequency
    const scheduleTriggers = def.triggers.filter(t => t.config.type === 'schedule');
    for (const trigger of scheduleTriggers) {
      const config = trigger.config as { cron: string };
      if (config.cron.includes('* * * * *')) {
        suggestions.push({
          type: 'modify_condition',
          description: 'Reduce trigger frequency to avoid excessive gas costs',
          rationale: 'Very frequent execution can lead to high gas costs without proportional benefits',
          expectedImpact: 0.15,
        });
      }
    }

    // Check capital allocation
    if (def.capitalAllocation.reservePercentage < 20) {
      suggestions.push({
        type: 'modify_condition',
        description: 'Increase reserve percentage for better risk management',
        rationale: 'Higher reserves provide more buffer for unexpected market conditions',
        expectedImpact: 0.1,
        implementation: {
          capitalAllocation: {
            ...def.capitalAllocation,
            reservePercentage: 20,
          },
        },
      });
    }

    // Target-specific suggestions
    if (request.targetMetric === 'sharpe') {
      suggestions.push({
        type: 'optimize_parameter',
        description: 'Consider optimizing position sizing to improve risk-adjusted returns',
        rationale: 'Optimal position sizing can significantly improve Sharpe ratio',
        expectedImpact: 0.25,
      });
    }

    if (request.targetMetric === 'drawdown') {
      suggestions.push({
        type: 'add_risk_control',
        description: 'Add maximum drawdown control',
        rationale: 'Explicit drawdown limits prevent severe portfolio damage',
        expectedImpact: 0.35,
        implementation: {
          riskControls: [{
            id: 'suggested_max_drawdown',
            type: 'max_drawdown',
            name: 'Max Drawdown Control',
            enabled: true,
            config: { type: 'max_drawdown', maxPercentage: 15, timeframe: '1d' },
            action: { type: 'pause' },
          }],
        },
      });
    }

    return {
      suggestions,
      confidence: 0.8,
    };
  }

  /**
   * Explain a strategy in natural language
   */
  explainStrategy(strategy: Strategy): string {
    const def = strategy.definition;
    const parts: string[] = [];

    parts.push(`## Strategy: ${strategy.name}`);
    parts.push('');
    parts.push(`**Type:** ${this.formatStrategyType(strategy.type)}`);
    parts.push('');

    // Explain triggers
    parts.push('### When it executes:');
    for (const trigger of def.triggers) {
      parts.push(`- ${this.explainTrigger(trigger)}`);
    }
    parts.push('');

    // Explain conditions
    if (def.conditions.length > 0) {
      parts.push('### Conditions required:');
      for (const condition of def.conditions) {
        parts.push(`- ${condition.name}: ${condition.rules.length} rule(s)`);
      }
      parts.push('');
    }

    // Explain actions
    parts.push('### What it does:');
    for (const action of def.actions) {
      parts.push(`- ${this.explainAction(action)}`);
    }
    parts.push('');

    // Explain risk controls
    if (def.riskControls.length > 0) {
      parts.push('### Risk protections:');
      for (const control of def.riskControls) {
        parts.push(`- ${this.explainRiskControl(control)}`);
      }
      parts.push('');
    }

    // Capital allocation
    parts.push('### Capital allocation:');
    const cap = def.capitalAllocation;
    if (cap.mode === 'percentage') {
      parts.push(`- Uses ${cap.allocatedPercentage}% of portfolio`);
    } else if (cap.mode === 'fixed') {
      parts.push(`- Uses fixed amount of ${cap.allocatedAmount} TON`);
    }
    parts.push(`- Keeps ${cap.reservePercentage}% as reserve`);

    return parts.join('\n');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeTemplates(): void {
    // DCA Basic template
    this.templates.set('dca_basic', {
      triggers: [{
        id: 'scheduled_buy',
        type: 'schedule',
        name: 'Regular DCA Buy',
        enabled: true,
        config: { type: 'schedule', cron: '0 */6 * * *' },
      }],
      conditions: [],
      actions: [{
        id: 'buy_ton',
        type: 'swap',
        name: 'Buy TON',
        priority: 1,
        config: {
          type: 'swap',
          fromToken: 'USDT',
          toToken: 'TON',
          amount: { type: 'parameter', value: 'buy_amount' },
          slippageTolerance: 0.5,
        },
      }],
      riskControls: [{
        id: 'stop_loss',
        type: 'stop_loss',
        name: 'Stop Loss',
        enabled: true,
        config: { type: 'stop_loss', percentage: 15 },
        action: { type: 'notify' },
      }],
      parameters: [{
        id: 'param_buy_amount',
        name: 'buy_amount',
        type: 'number',
        value: 100,
        defaultValue: 100,
        optimizable: true,
        constraints: { min: 10, max: 1000 },
      }],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: 10,
        minCapital: 50,
        reservePercentage: 30,
      },
    });

    // Momentum trading template
    this.templates.set('momentum', {
      triggers: [{
        id: 'price_momentum',
        type: 'indicator',
        name: 'Momentum Signal',
        enabled: true,
        config: {
          type: 'indicator',
          indicator: 'momentum',
          token: 'TON',
          operator: 'greater_than',
          value: 0.05,
          timeframe: '1d',
        },
      }],
      conditions: [{
        id: 'volume_check',
        name: 'Volume Confirmation',
        type: 'market',
        rules: [{
          id: 'min_volume',
          field: "market.volume('TON')",
          operator: 'greater_than',
          value: 100000,
          valueType: 'static',
        }],
        required: true,
      }],
      actions: [{
        id: 'buy_momentum',
        type: 'swap',
        name: 'Buy on Momentum',
        priority: 1,
        config: {
          type: 'swap',
          fromToken: 'USDT',
          toToken: 'TON',
          amount: { type: 'percentage', value: 25 },
          slippageTolerance: 1,
        },
      }],
      riskControls: [
        {
          id: 'trailing_stop',
          type: 'trailing_stop',
          name: 'Trailing Stop',
          enabled: true,
          config: { type: 'trailing_stop', percentage: 8, activationPercentage: 5 },
          action: { type: 'close' },
        },
        {
          id: 'take_profit',
          type: 'take_profit',
          name: 'Take Profit',
          enabled: true,
          config: { type: 'take_profit', percentage: 30, sellPercentage: 50 },
          action: { type: 'reduce', sellPercentage: 50 },
        },
      ],
      parameters: [],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: 25,
        minCapital: 100,
        reservePercentage: 25,
      },
    });

    // Rebalancing template
    this.templates.set('rebalance', {
      triggers: [{
        id: 'weekly_rebalance',
        type: 'schedule',
        name: 'Weekly Rebalance',
        enabled: true,
        config: { type: 'schedule', cron: '0 0 * * 0' },
      }],
      conditions: [],
      actions: [{
        id: 'rebalance_portfolio',
        type: 'rebalance',
        name: 'Rebalance',
        priority: 1,
        config: {
          type: 'rebalance',
          targetAllocations: [
            { token: 'TON', targetPercentage: 50 },
            { token: 'USDT', targetPercentage: 30 },
            { token: 'SCALE', targetPercentage: 20 },
          ],
          tolerance: 5,
          maxSlippage: 1,
        },
      }],
      riskControls: [{
        id: 'max_position',
        type: 'max_position',
        name: 'Max Position',
        enabled: true,
        config: { type: 'max_position', token: 'TON', maxPercentage: 60 },
        action: { type: 'notify' },
      }],
      parameters: [],
      capitalAllocation: {
        mode: 'percentage',
        allocatedPercentage: 100,
        minCapital: 500,
        reservePercentage: 0,
      },
    });
  }

  private selectTemplate(request: StrategyGenerationRequest): StrategySpec {
    const { riskTolerance, investmentHorizon: _investmentHorizon, preferences } = request.userProfile;

    // Select based on user profile
    if (preferences.includes('dca') || preferences.includes('conservative')) {
      return this.templates.get('dca_basic')!;
    }

    if (preferences.includes('momentum') || preferences.includes('active')) {
      return this.templates.get('momentum')!;
    }

    if (preferences.includes('rebalance') || preferences.includes('passive')) {
      return this.templates.get('rebalance')!;
    }

    // Default based on risk tolerance
    switch (riskTolerance) {
      case 'low':
        return this.templates.get('dca_basic')!;
      case 'medium':
        return this.templates.get('rebalance')!;
      case 'high':
      case 'critical':
        return this.templates.get('momentum')!;
      default:
        return this.templates.get('dca_basic')!;
    }
  }

  private customizeTemplate(
    template: StrategySpec,
    request: StrategyGenerationRequest
  ): StrategySpec {
    const customized = JSON.parse(JSON.stringify(template)) as StrategySpec;

    // Adjust capital allocation based on available capital
    if (request.userProfile.availableCapital) {
      const cap = request.userProfile.availableCapital;
      customized.capitalAllocation.minCapital = Math.min(cap * 0.05, 100);
      customized.capitalAllocation.maxCapital = cap * 0.8;
    }

    // Adjust based on investment horizon
    if (request.userProfile.investmentHorizon === 'short') {
      // More frequent triggers for short-term
      for (const trigger of customized.triggers) {
        if (trigger.config.type === 'schedule') {
          (trigger.config as { cron: string }).cron = '0 * * * *'; // Hourly
        }
      }
    } else if (request.userProfile.investmentHorizon === 'long') {
      // Less frequent for long-term
      for (const trigger of customized.triggers) {
        if (trigger.config.type === 'schedule') {
          (trigger.config as { cron: string }).cron = '0 0 * * 0'; // Weekly
        }
      }
    }

    // Apply constraints
    if (request.constraints) {
      if (request.constraints.allowedActions) {
        customized.actions = customized.actions.filter(
          a => request.constraints!.allowedActions!.includes(a.type)
        );
      }

      if (request.constraints.forbiddenTokens) {
        // Filter out actions using forbidden tokens
        customized.actions = customized.actions.filter(a => {
          const config = a.config as { token?: string; fromToken?: string; toToken?: string };
          const tokens = [config.token, config.fromToken, config.toToken].filter(Boolean);
          return !tokens.some(t => request.constraints!.forbiddenTokens!.includes(t!));
        });
      }
    }

    return customized;
  }

  private addRiskControls(
    definition: StrategySpec,
    riskTolerance: StrategyRiskLevel
  ): StrategySpec {
    const result = JSON.parse(JSON.stringify(definition)) as StrategySpec;

    // Adjust stop-loss based on risk tolerance
    const stopLoss = result.riskControls.find(r => r.type === 'stop_loss');
    if (stopLoss) {
      const config = stopLoss.config as { percentage: number };
      switch (riskTolerance) {
        case 'low':
          config.percentage = 5;
          break;
        case 'medium':
          config.percentage = 10;
          break;
        case 'high':
          config.percentage = 15;
          break;
        case 'critical':
          config.percentage = 20;
          break;
      }
    }

    // Add max drawdown for conservative users
    if (riskTolerance === 'low' || riskTolerance === 'medium') {
      const hasMaxDrawdown = result.riskControls.some(r => r.type === 'max_drawdown');
      if (!hasMaxDrawdown) {
        result.riskControls.push({
          id: 'auto_max_drawdown',
          type: 'max_drawdown',
          name: 'Maximum Drawdown',
          enabled: true,
          config: {
            type: 'max_drawdown',
            maxPercentage: riskTolerance === 'low' ? 10 : 20,
            timeframe: '1d',
          },
          action: { type: 'pause' },
        });
      }
    }

    // Adjust reserve percentage
    switch (riskTolerance) {
      case 'low':
        result.capitalAllocation.reservePercentage = 40;
        break;
      case 'medium':
        result.capitalAllocation.reservePercentage = 25;
        break;
      case 'high':
        result.capitalAllocation.reservePercentage = 15;
        break;
      case 'critical':
        result.capitalAllocation.reservePercentage = 5;
        break;
    }

    return result;
  }

  private calculateConfidence(
    request: StrategyGenerationRequest,
    result: StrategySpec
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase if we have specific preferences
    if (request.userProfile.preferences.length > 0) {
      confidence += 0.1;
    }

    // Increase if market conditions provided
    if (request.marketConditions) {
      confidence += 0.05;
    }

    // Increase if strategy has good risk controls
    if (result.riskControls.length >= 2) {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  private generateExplanation(
    request: StrategyGenerationRequest,
    result: StrategySpec
  ): string {
    const parts: string[] = [];

    parts.push('This strategy was generated based on your profile:');
    parts.push(`- Risk tolerance: ${request.userProfile.riskTolerance}`);
    parts.push(`- Investment horizon: ${request.userProfile.investmentHorizon}`);
    parts.push(`- Experience: ${request.userProfile.experience}`);
    parts.push('');

    parts.push('Key features:');
    parts.push(`- ${result.triggers.length} trigger(s) for execution`);
    parts.push(`- ${result.actions.length} action(s) to perform`);
    parts.push(`- ${result.riskControls.length} risk control(s) for protection`);
    parts.push(`- ${result.capitalAllocation.reservePercentage}% capital reserve`);

    return parts.join('\n');
  }

  private formatStrategyType(type: StrategyType): string {
    switch (type) {
      case 'rule_based':
        return 'Rule-Based';
      case 'ai_driven':
        return 'AI-Driven';
      case 'hybrid':
        return 'Hybrid';
      case 'template_based':
        return 'Template-Based';
      default:
        return type;
    }
  }

  private explainTrigger(trigger: StrategyTrigger): string {
    const config = trigger.config;
    switch (config.type) {
      case 'schedule':
        return `Runs on schedule: ${(config as { cron: string }).cron}`;
      case 'price':
        const priceConfig = config as { token: string; operator: string; value: number };
        return `When ${priceConfig.token} price ${priceConfig.operator.replace('_', ' ')} ${priceConfig.value}`;
      case 'indicator':
        const indConfig = config as { indicator: string; token: string; operator: string; value: number };
        return `When ${indConfig.indicator} on ${indConfig.token} ${indConfig.operator.replace('_', ' ')} ${indConfig.value}`;
      default:
        return `${config.type} trigger`;
    }
  }

  private explainAction(action: StrategyAction): string {
    const config = action.config;
    switch (config.type) {
      case 'swap':
        const swapConfig = config as { fromToken: string; toToken: string };
        return `Swap ${swapConfig.fromToken} to ${swapConfig.toToken}`;
      case 'transfer':
        const transferConfig = config as { token: string; destination: string };
        return `Transfer ${transferConfig.token} to ${transferConfig.destination}`;
      case 'stake':
        const stakeConfig = config as { token: string };
        return `Stake ${stakeConfig.token}`;
      case 'rebalance':
        return 'Rebalance portfolio to target allocations';
      case 'notify':
        const notifyConfig = config as { channel: string };
        return `Send notification via ${notifyConfig.channel}`;
      default:
        return `${config.type} action`;
    }
  }

  private explainRiskControl(control: RiskControl): string {
    const config = control.config;
    switch (config.type) {
      case 'stop_loss':
        return `Stop loss at ${(config as { percentage: number }).percentage}% loss`;
      case 'take_profit':
        return `Take profit at ${(config as { percentage: number }).percentage}% gain`;
      case 'trailing_stop':
        return `Trailing stop at ${(config as { percentage: number }).percentage}%`;
      case 'max_position':
        const maxPosConfig = config as { token: string; maxPercentage: number };
        return `Max ${maxPosConfig.token} position: ${maxPosConfig.maxPercentage}%`;
      case 'max_drawdown':
        return `Max drawdown: ${(config as { maxPercentage: number }).maxPercentage}%`;
      default:
        return `${config.type} control`;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createAIStrategyGenerator(
  config?: Partial<AIIntegrationConfig>
): AIStrategyGenerator {
  return new AIStrategyGenerator({
    enabled: config?.enabled ?? true,
    modelPreference: config?.modelPreference ?? 'balanced',
    maxTokens: config?.maxTokens ?? 4096,
    temperature: config?.temperature ?? 0.7,
  });
}
