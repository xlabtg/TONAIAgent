/**
 * TONAIAgent - Strategy Templates Library
 *
 * Pre-built strategy templates for common DeFi strategies.
 * Users can customize these templates for their own use.
 */

import {
  StrategyTemplate,
  StrategyCategory,
  Block,
  Connection,
  TemplateInput,
} from './types';

// ============================================================================
// Template Registry
// ============================================================================

/**
 * Registry for strategy templates
 */
export class TemplateRegistry {
  private readonly templates: Map<string, StrategyTemplate> = new Map();

  constructor() {
    this.registerBuiltInTemplates();
  }

  /**
   * Register a template
   */
  register(template: StrategyTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   */
  get(id: string): StrategyTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates
   */
  getAll(): StrategyTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getByCategory(category: StrategyCategory): StrategyTemplate[] {
    return this.getAll().filter((t) => t.category === category);
  }

  /**
   * Get templates by difficulty
   */
  getByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): StrategyTemplate[] {
    return this.getAll().filter((t) => t.difficulty === difficulty);
  }

  /**
   * Get templates by risk level
   */
  getByRiskLevel(riskLevel: 'low' | 'medium' | 'high'): StrategyTemplate[] {
    return this.getAll().filter((t) => t.riskLevel === riskLevel);
  }

  /**
   * Search templates
   */
  search(query: string): StrategyTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get popular templates
   */
  getPopular(limit = 10): StrategyTemplate[] {
    return this.getAll()
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Register all built-in templates
   */
  private registerBuiltInTemplates(): void {
    // DCA Templates
    this.register(createDCABuyTemplate());
    this.register(createDCASellTemplate());

    // Yield Farming Templates
    this.register(createAutoCompoundTemplate());
    this.register(createYieldOptimizerTemplate());

    // Trading Templates
    this.register(createGridTradingTemplate());
    this.register(createMomentumTradingTemplate());
    this.register(createMeanReversionTemplate());

    // Portfolio Templates
    this.register(createRebalancingTemplate());
    this.register(createDiversificationTemplate());

    // Arbitrage Templates
    this.register(createDEXArbitrageTemplate());

    // Risk Management Templates
    this.register(createStopLossProtectionTemplate());
    this.register(createProfitTakingTemplate());

    // Staking Templates
    this.register(createAutoStakingTemplate());
    this.register(createStakingRewardsTemplate());

    // Liquidity Templates
    this.register(createLiquidityProvisionTemplate());
  }
}

// ============================================================================
// DCA Templates
// ============================================================================

function createDCABuyTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_schedule',
      category: 'trigger',
      name: 'Schedule',
      description: 'Triggers on schedule',
      version: '1.0.0',
      config: {
        scheduleType: 'interval',
        interval: 86400, // Daily
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_balance',
      category: 'condition',
      name: 'Balance Check',
      description: 'Check if enough balance',
      version: '1.0.0',
      config: {
        token: '{{sourceToken}}',
        operator: 'gte',
        value: '{{amountPerOrder}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'swap_action',
      category: 'action',
      name: 'Swap',
      description: 'Execute DCA buy',
      version: '1.0.0',
      config: {
        fromToken: '{{sourceToken}}',
        toToken: '{{targetToken}}',
        amountType: 'fixed',
        amount: '{{amountPerOrder}}',
        maxSlippage: 1,
        dex: 'auto',
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'notify_success',
      category: 'action',
      name: 'Send Notification',
      description: 'Notify on success',
      version: '1.0.0',
      config: {
        channel: 'telegram',
        message: 'DCA buy executed successfully!',
        priority: 'normal',
      },
      position: { x: 700, y: 50 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Continue', required: true }],
      enabled: true,
    },
    {
      id: 'notify_failure',
      category: 'action',
      name: 'Send Notification',
      description: 'Notify on failure',
      version: '1.0.0',
      config: {
        channel: 'telegram',
        message: 'DCA buy failed. Please check your balance.',
        priority: 'high',
      },
      position: { x: 700, y: 150 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Continue', required: true }],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_schedule', sourceOutputId: 'out', targetBlockId: 'check_balance', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_balance', sourceOutputId: 'true', targetBlockId: 'swap_action', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'swap_action', sourceOutputId: 'success', targetBlockId: 'notify_success', targetInputId: 'in' },
    { id: 'c4', sourceBlockId: 'swap_action', sourceOutputId: 'failure', targetBlockId: 'notify_failure', targetInputId: 'in' },
    { id: 'c5', sourceBlockId: 'check_balance', sourceOutputId: 'false', targetBlockId: 'notify_failure', targetInputId: 'in' },
  ];

  const requiredInputs: TemplateInput[] = [
    {
      id: 'sourceToken',
      name: 'Source Token',
      description: 'Token to spend (e.g., USDT)',
      type: 'token',
      required: true,
      default: 'USDT',
    },
    {
      id: 'targetToken',
      name: 'Target Token',
      description: 'Token to buy (e.g., TON)',
      type: 'token',
      required: true,
      default: 'TON',
    },
    {
      id: 'amountPerOrder',
      name: 'Amount Per Order',
      description: 'Amount to buy each time',
      type: 'amount',
      required: true,
      default: 100,
      validation: { min: 1 },
    },
    {
      id: 'intervalDays',
      name: 'Interval (days)',
      description: 'Days between purchases',
      type: 'number',
      required: true,
      default: 1,
      validation: { min: 1, max: 30 },
    },
  ];

  return {
    id: 'dca_buy',
    name: 'DCA Buy Strategy',
    description: 'Dollar-cost averaging buy strategy. Automatically buys a fixed amount of tokens at regular intervals to reduce the impact of volatility.',
    category: 'trading',
    difficulty: 'beginner',
    estimatedApy: undefined,
    riskLevel: 'low',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 0.5,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH', 'BTC'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 5,
      maxDrawdown: 10,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 1,
      cooldownSeconds: 3600,
    },
    requiredInputs,
    tags: ['dca', 'buy', 'beginner', 'low-risk', 'automated'],
    popularity: 950,
    createdBy: 'TONAIAgent',
  };
}

function createDCASellTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_schedule',
      category: 'trigger',
      name: 'Schedule',
      description: 'Triggers on schedule',
      version: '1.0.0',
      config: {
        scheduleType: 'interval',
        interval: 86400,
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_balance',
      category: 'condition',
      name: 'Balance Check',
      description: 'Check token balance',
      version: '1.0.0',
      config: {
        token: '{{sourceToken}}',
        operator: 'gte',
        value: '{{amountPerOrder}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'swap_action',
      category: 'action',
      name: 'Swap',
      description: 'Execute DCA sell',
      version: '1.0.0',
      config: {
        fromToken: '{{sourceToken}}',
        toToken: '{{targetToken}}',
        amountType: 'fixed',
        amount: '{{amountPerOrder}}',
        maxSlippage: 1,
        dex: 'auto',
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_schedule', sourceOutputId: 'out', targetBlockId: 'check_balance', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_balance', sourceOutputId: 'true', targetBlockId: 'swap_action', targetInputId: 'in' },
  ];

  return {
    id: 'dca_sell',
    name: 'DCA Sell Strategy',
    description: 'Dollar-cost averaging sell strategy. Automatically sells a fixed amount of tokens at regular intervals.',
    category: 'trading',
    difficulty: 'beginner',
    riskLevel: 'low',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 0.5,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 5,
      maxDrawdown: 10,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 1,
      cooldownSeconds: 3600,
    },
    requiredInputs: [
      { id: 'sourceToken', name: 'Token to Sell', description: 'Token to sell', type: 'token', required: true, default: 'TON' },
      { id: 'targetToken', name: 'Receive Token', description: 'Token to receive', type: 'token', required: true, default: 'USDT' },
      { id: 'amountPerOrder', name: 'Amount Per Order', description: 'Amount to sell each time', type: 'amount', required: true, default: 10 },
    ],
    tags: ['dca', 'sell', 'beginner', 'low-risk'],
    popularity: 720,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Yield Farming Templates
// ============================================================================

function createAutoCompoundTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_schedule',
      category: 'trigger',
      name: 'Schedule',
      description: 'Check for rewards periodically',
      version: '1.0.0',
      config: {
        scheduleType: 'interval',
        interval: 21600, // Every 6 hours
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_rewards',
      category: 'condition',
      name: 'Balance Check',
      description: 'Check if rewards are claimable',
      version: '1.0.0',
      config: {
        token: '{{rewardToken}}',
        operator: 'gte',
        value: '{{minClaimAmount}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'claim_rewards',
      category: 'action',
      name: 'Claim Rewards',
      description: 'Claim staking rewards',
      version: '1.0.0',
      config: {
        protocol: '{{protocol}}',
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'swap_to_stake',
      category: 'action',
      name: 'Swap',
      description: 'Swap rewards to staking token',
      version: '1.0.0',
      config: {
        fromToken: '{{rewardToken}}',
        toToken: '{{stakeToken}}',
        amountType: 'all',
        maxSlippage: 1,
        dex: 'auto',
      },
      position: { x: 700, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'restake',
      category: 'action',
      name: 'Stake',
      description: 'Restake the tokens',
      version: '1.0.0',
      config: {
        token: '{{stakeToken}}',
        protocol: '{{protocol}}',
        amountType: 'all',
      },
      position: { x: 900, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_schedule', sourceOutputId: 'out', targetBlockId: 'check_rewards', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_rewards', sourceOutputId: 'true', targetBlockId: 'claim_rewards', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'claim_rewards', sourceOutputId: 'success', targetBlockId: 'swap_to_stake', targetInputId: 'in' },
    { id: 'c4', sourceBlockId: 'swap_to_stake', sourceOutputId: 'success', targetBlockId: 'restake', targetInputId: 'in' },
  ];

  return {
    id: 'auto_compound',
    name: 'Auto-Compound Yield',
    description: 'Automatically compound staking rewards. Claims rewards, swaps to staking token, and restakes for maximum yield.',
    category: 'yield_farming',
    difficulty: 'intermediate',
    estimatedApy: 15,
    riskLevel: 'low',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 120000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'stTON', 'tsTON'],
      protocolWhitelist: ['tonstakers', 'bemo', 'whales'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 2,
      maxDrawdown: 5,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 4,
      cooldownSeconds: 21600,
    },
    requiredInputs: [
      { id: 'stakeToken', name: 'Staking Token', description: 'Token being staked', type: 'token', required: true, default: 'TON' },
      { id: 'rewardToken', name: 'Reward Token', description: 'Token received as rewards', type: 'token', required: true, default: 'TON' },
      { id: 'protocol', name: 'Protocol', description: 'Staking protocol', type: 'string', required: true, default: 'tonstakers' },
      { id: 'minClaimAmount', name: 'Min Claim Amount', description: 'Minimum amount to trigger claim', type: 'amount', required: true, default: 1 },
    ],
    tags: ['yield', 'compound', 'staking', 'automated', 'passive'],
    popularity: 880,
    createdBy: 'TONAIAgent',
  };
}

function createYieldOptimizerTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_yield',
      category: 'trigger',
      name: 'AI Signal',
      description: 'AI detects better yield opportunity',
      version: '1.0.0',
      config: {
        signalType: 'opportunity',
        minConfidence: 0.8,
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_yield_diff',
      category: 'condition',
      name: 'Market Condition',
      description: 'Check if yield difference is significant',
      version: '1.0.0',
      config: {
        metric: 'yield_difference',
        condition: 'above',
        value: '{{minYieldDiff}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'unstake_current',
      category: 'action',
      name: 'Unstake',
      description: 'Unstake from current protocol',
      version: '1.0.0',
      config: {
        token: '{{stakeToken}}',
        amountType: 'all',
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'stake_new',
      category: 'action',
      name: 'Stake',
      description: 'Stake in better protocol',
      version: '1.0.0',
      config: {
        token: '{{stakeToken}}',
        protocol: 'auto',
        amountType: 'all',
      },
      position: { x: 700, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_yield', sourceOutputId: 'out', targetBlockId: 'check_yield_diff', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_yield_diff', sourceOutputId: 'true', targetBlockId: 'unstake_current', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'unstake_current', sourceOutputId: 'success', targetBlockId: 'stake_new', targetInputId: 'in' },
  ];

  return {
    id: 'yield_optimizer',
    name: 'AI Yield Optimizer',
    description: 'AI-powered yield optimization. Automatically moves funds to higher-yielding protocols when opportunities arise.',
    category: 'yield_farming',
    difficulty: 'advanced',
    estimatedApy: 20,
    riskLevel: 'medium',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 2,
      executionTimeout: 180000,
      retryPolicy: { maxRetries: 3, backoffMs: 5000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'stTON', 'tsTON'],
      protocolWhitelist: ['tonstakers', 'bemo', 'whales', 'evaa'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 5,
      maxDrawdown: 10,
      stopLossPercent: 5,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 2,
      cooldownSeconds: 86400,
    },
    requiredInputs: [
      { id: 'stakeToken', name: 'Staking Token', description: 'Token to optimize yield for', type: 'token', required: true, default: 'TON' },
      { id: 'minYieldDiff', name: 'Min Yield Difference', description: 'Minimum APY difference to trigger switch (%)', type: 'percentage', required: true, default: 2 },
    ],
    tags: ['yield', 'ai', 'optimizer', 'staking', 'advanced'],
    popularity: 650,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Trading Templates
// ============================================================================

function createGridTradingTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_price',
      category: 'trigger',
      name: 'Price Threshold',
      description: 'Monitor price levels',
      version: '1.0.0',
      config: {
        token: '{{targetToken}}',
        direction: 'cross',
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_grid_level',
      category: 'condition',
      name: 'Price Condition',
      description: 'Check which grid level triggered',
      version: '1.0.0',
      config: {
        token: '{{targetToken}}',
        gridLevels: '{{gridLevels}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'buy', type: 'output', dataType: 'trigger', label: 'Buy', required: true },
        { id: 'sell', type: 'output', dataType: 'trigger', label: 'Sell', required: true },
      ],
      enabled: true,
    },
    {
      id: 'buy_action',
      category: 'action',
      name: 'Swap',
      description: 'Buy at grid level',
      version: '1.0.0',
      config: {
        fromToken: '{{quoteToken}}',
        toToken: '{{targetToken}}',
        amountType: 'fixed',
        amount: '{{orderSize}}',
        maxSlippage: 0.5,
        dex: 'auto',
      },
      position: { x: 500, y: 50 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'sell_action',
      category: 'action',
      name: 'Swap',
      description: 'Sell at grid level',
      version: '1.0.0',
      config: {
        fromToken: '{{targetToken}}',
        toToken: '{{quoteToken}}',
        amountType: 'fixed',
        amount: '{{orderSize}}',
        maxSlippage: 0.5,
        dex: 'auto',
      },
      position: { x: 500, y: 150 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_price', sourceOutputId: 'out', targetBlockId: 'check_grid_level', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_grid_level', sourceOutputId: 'buy', targetBlockId: 'buy_action', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'check_grid_level', sourceOutputId: 'sell', targetBlockId: 'sell_action', targetInputId: 'in' },
  ];

  return {
    id: 'grid_trading',
    name: 'Grid Trading Bot',
    description: 'Automated grid trading strategy. Places buy and sell orders at predetermined price levels to profit from price oscillations.',
    category: 'trading',
    difficulty: 'intermediate',
    estimatedApy: 25,
    riskLevel: 'medium',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 50,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 10,
      takeProfitPercent: 0,
      maxSlippage: 1,
      maxTradesPerDay: 50,
      cooldownSeconds: 60,
    },
    requiredInputs: [
      { id: 'targetToken', name: 'Trading Token', description: 'Token to trade', type: 'token', required: true, default: 'TON' },
      { id: 'quoteToken', name: 'Quote Token', description: 'Quote currency', type: 'token', required: true, default: 'USDT' },
      { id: 'gridLevels', name: 'Grid Levels', description: 'Number of grid levels', type: 'number', required: true, default: 10 },
      { id: 'priceRange', name: 'Price Range (%)', description: 'Price range for grid', type: 'percentage', required: true, default: 20 },
      { id: 'orderSize', name: 'Order Size', description: 'Size per grid order', type: 'amount', required: true, default: 50 },
    ],
    tags: ['grid', 'trading', 'bot', 'automated', 'range'],
    popularity: 780,
    createdBy: 'TONAIAgent',
  };
}

function createMomentumTradingTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_ai',
      category: 'trigger',
      name: 'AI Signal',
      description: 'AI momentum signal',
      version: '1.0.0',
      config: {
        signalType: 'buy',
        minConfidence: 0.75,
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_trend',
      category: 'condition',
      name: 'Market Condition',
      description: 'Confirm trend direction',
      version: '1.0.0',
      config: {
        metric: 'trend',
        condition: 'bullish',
        timeframe: '4h',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'risk_check',
      category: 'risk',
      name: 'Max Position Size',
      description: 'Check position limits',
      version: '1.0.0',
      config: {
        maxType: 'percentage',
        maxValue: 25,
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'blocked', type: 'output', dataType: 'trigger', label: 'Blocked', required: true },
      ],
      enabled: true,
    },
    {
      id: 'buy_action',
      category: 'action',
      name: 'Swap',
      description: 'Execute momentum buy',
      version: '1.0.0',
      config: {
        fromToken: 'USDT',
        toToken: '{{targetToken}}',
        amountType: 'percentage',
        amount: '{{positionSize}}',
        maxSlippage: 1,
        dex: 'auto',
      },
      position: { x: 700, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'stop_loss',
      category: 'risk',
      name: 'Stop Loss',
      description: 'Set stop loss',
      version: '1.0.0',
      config: {
        type: 'trailing',
        value: 5,
        trailingDistance: 3,
      },
      position: { x: 900, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'triggered', type: 'output', dataType: 'trigger', label: 'Triggered', required: true },
      ],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_ai', sourceOutputId: 'out', targetBlockId: 'check_trend', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_trend', sourceOutputId: 'true', targetBlockId: 'risk_check', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'risk_check', sourceOutputId: 'pass', targetBlockId: 'buy_action', targetInputId: 'in' },
    { id: 'c4', sourceBlockId: 'buy_action', sourceOutputId: 'success', targetBlockId: 'stop_loss', targetInputId: 'in' },
  ];

  return {
    id: 'momentum_trading',
    name: 'AI Momentum Trading',
    description: 'AI-powered momentum trading strategy. Enters positions based on AI signals and trend confirmation with trailing stop loss.',
    category: 'trading',
    difficulty: 'advanced',
    estimatedApy: 40,
    riskLevel: 'high',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 25,
      maxDailyLoss: 10,
      maxDrawdown: 20,
      stopLossPercent: 5,
      takeProfitPercent: 15,
      maxSlippage: 1,
      maxTradesPerDay: 10,
      cooldownSeconds: 300,
    },
    requiredInputs: [
      { id: 'targetToken', name: 'Trading Token', description: 'Token to trade', type: 'token', required: true, default: 'TON' },
      { id: 'positionSize', name: 'Position Size (%)', description: 'Percentage of portfolio per trade', type: 'percentage', required: true, default: 10 },
    ],
    tags: ['momentum', 'ai', 'trading', 'trend', 'advanced'],
    popularity: 560,
    createdBy: 'TONAIAgent',
  };
}

function createMeanReversionTemplate(): StrategyTemplate {
  return {
    id: 'mean_reversion',
    name: 'Mean Reversion Strategy',
    description: 'Trades when price deviates significantly from moving average, betting on return to mean.',
    category: 'trading',
    difficulty: 'intermediate',
    estimatedApy: 30,
    riskLevel: 'medium',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 30,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 5,
      takeProfitPercent: 10,
      maxSlippage: 1,
      maxTradesPerDay: 20,
      cooldownSeconds: 300,
    },
    requiredInputs: [
      { id: 'targetToken', name: 'Trading Token', description: 'Token to trade', type: 'token', required: true, default: 'TON' },
      { id: 'deviationThreshold', name: 'Deviation %', description: 'Percentage deviation to trigger trade', type: 'percentage', required: true, default: 5 },
    ],
    tags: ['mean-reversion', 'trading', 'statistical'],
    popularity: 420,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Portfolio Templates
// ============================================================================

function createRebalancingTemplate(): StrategyTemplate {
  const blocks: Block[] = [
    {
      id: 'trigger_schedule',
      category: 'trigger',
      name: 'Schedule',
      description: 'Check portfolio periodically',
      version: '1.0.0',
      config: {
        scheduleType: 'interval',
        interval: 86400, // Daily
      },
      position: { x: 100, y: 100 },
      inputs: [],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true }],
      enabled: true,
    },
    {
      id: 'check_drift',
      category: 'condition',
      name: 'Portfolio Check',
      description: 'Check if rebalancing needed',
      version: '1.0.0',
      config: {
        metric: 'allocation_drift',
        condition: 'above',
        value: '{{driftThreshold}}',
      },
      position: { x: 300, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true }],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      enabled: true,
    },
    {
      id: 'rebalance_action',
      category: 'action',
      name: 'Rebalance Portfolio',
      description: 'Execute rebalancing trades',
      version: '1.0.0',
      config: {
        allocations: '{{targetAllocations}}',
        threshold: '{{driftThreshold}}',
        maxSlippage: 1,
      },
      position: { x: 500, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      enabled: true,
    },
    {
      id: 'notify',
      category: 'action',
      name: 'Send Notification',
      description: 'Notify rebalancing complete',
      version: '1.0.0',
      config: {
        channel: 'telegram',
        message: 'Portfolio rebalanced successfully!',
        priority: 'normal',
      },
      position: { x: 700, y: 100 },
      inputs: [{ id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true }],
      outputs: [{ id: 'out', type: 'output', dataType: 'trigger', label: 'Continue', required: true }],
      enabled: true,
    },
  ];

  const connections: Connection[] = [
    { id: 'c1', sourceBlockId: 'trigger_schedule', sourceOutputId: 'out', targetBlockId: 'check_drift', targetInputId: 'in' },
    { id: 'c2', sourceBlockId: 'check_drift', sourceOutputId: 'true', targetBlockId: 'rebalance_action', targetInputId: 'in' },
    { id: 'c3', sourceBlockId: 'rebalance_action', sourceOutputId: 'success', targetBlockId: 'notify', targetInputId: 'in' },
  ];

  return {
    id: 'portfolio_rebalancing',
    name: 'Portfolio Rebalancing',
    description: 'Automatic portfolio rebalancing. Maintains target allocations by periodically adjusting positions.',
    category: 'portfolio_automation',
    difficulty: 'beginner',
    riskLevel: 'low',
    blocks,
    connections,
    config: {
      maxGasPerExecution: 2,
      executionTimeout: 180000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH', 'BTC'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 3,
      maxDrawdown: 10,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 10,
      cooldownSeconds: 86400,
    },
    requiredInputs: [
      {
        id: 'targetAllocations',
        name: 'Target Allocations',
        description: 'Target portfolio allocations',
        type: 'string',
        required: true,
        default: '[{"token":"TON","target":50},{"token":"USDT","target":30},{"token":"ETH","target":20}]',
      },
      { id: 'driftThreshold', name: 'Drift Threshold (%)', description: 'Rebalance when drift exceeds this', type: 'percentage', required: true, default: 5 },
    ],
    tags: ['portfolio', 'rebalancing', 'allocation', 'passive'],
    popularity: 820,
    createdBy: 'TONAIAgent',
  };
}

function createDiversificationTemplate(): StrategyTemplate {
  return {
    id: 'diversification',
    name: 'Smart Diversification',
    description: 'AI-assisted portfolio diversification across multiple assets and protocols.',
    category: 'portfolio_automation',
    difficulty: 'intermediate',
    riskLevel: 'low',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 3,
      executionTimeout: 300000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH', 'BTC', 'stTON'],
      protocolWhitelist: ['dedust', 'stonfi', 'tonstakers', 'evaa'],
    },
    riskParams: {
      maxPositionSize: 30,
      maxDailyLoss: 3,
      maxDrawdown: 10,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 20,
      cooldownSeconds: 3600,
    },
    requiredInputs: [
      { id: 'riskLevel', name: 'Risk Level', description: 'Preferred risk level', type: 'string', required: true, default: 'moderate' },
    ],
    tags: ['diversification', 'portfolio', 'ai', 'allocation'],
    popularity: 580,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Arbitrage Templates
// ============================================================================

function createDEXArbitrageTemplate(): StrategyTemplate {
  return {
    id: 'dex_arbitrage',
    name: 'DEX Arbitrage',
    description: 'Automated arbitrage between DEXs. Profits from price differences across decentralized exchanges.',
    category: 'arbitrage',
    difficulty: 'advanced',
    estimatedApy: 50,
    riskLevel: 'high',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 2,
      executionTimeout: 30000,
      retryPolicy: { maxRetries: 1, backoffMs: 500, backoffMultiplier: 1 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 20,
      maxDailyLoss: 5,
      maxDrawdown: 10,
      stopLossPercent: 2,
      takeProfitPercent: 0,
      maxSlippage: 0.5,
      maxTradesPerDay: 100,
      cooldownSeconds: 10,
    },
    requiredInputs: [
      { id: 'minProfit', name: 'Min Profit (%)', description: 'Minimum profit percentage to execute', type: 'percentage', required: true, default: 0.5 },
      { id: 'maxAmount', name: 'Max Trade Amount', description: 'Maximum trade amount', type: 'amount', required: true, default: 1000 },
    ],
    tags: ['arbitrage', 'dex', 'advanced', 'high-frequency'],
    popularity: 350,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Risk Management Templates
// ============================================================================

function createStopLossProtectionTemplate(): StrategyTemplate {
  return {
    id: 'stop_loss_protection',
    name: 'Portfolio Stop Loss',
    description: 'Automatic portfolio protection with configurable stop loss levels.',
    category: 'portfolio_automation',
    difficulty: 'beginner',
    riskLevel: 'low',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 2,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 5,
      maxDrawdown: 10,
      stopLossPercent: 10,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 5,
      cooldownSeconds: 300,
    },
    requiredInputs: [
      { id: 'stopLossPercent', name: 'Stop Loss (%)', description: 'Percentage loss to trigger stop', type: 'percentage', required: true, default: 10 },
      { id: 'safeToken', name: 'Safe Asset', description: 'Token to convert to on stop loss', type: 'token', required: true, default: 'USDT' },
    ],
    tags: ['risk', 'stop-loss', 'protection', 'safety'],
    popularity: 720,
    createdBy: 'TONAIAgent',
  };
}

function createProfitTakingTemplate(): StrategyTemplate {
  return {
    id: 'profit_taking',
    name: 'Automated Profit Taking',
    description: 'Automatically takes profits when targets are reached.',
    category: 'portfolio_automation',
    difficulty: 'beginner',
    riskLevel: 'low',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 60000,
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 0,
      maxDrawdown: 0,
      stopLossPercent: 0,
      takeProfitPercent: 20,
      maxSlippage: 1,
      maxTradesPerDay: 10,
      cooldownSeconds: 300,
    },
    requiredInputs: [
      { id: 'profitTarget', name: 'Profit Target (%)', description: 'Percentage gain to take profit', type: 'percentage', required: true, default: 20 },
      { id: 'takeAmount', name: 'Take Amount (%)', description: 'Percentage of position to sell', type: 'percentage', required: true, default: 50 },
    ],
    tags: ['profit', 'take-profit', 'automated'],
    popularity: 680,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Staking Templates
// ============================================================================

function createAutoStakingTemplate(): StrategyTemplate {
  return {
    id: 'auto_staking',
    name: 'Auto Staking',
    description: 'Automatically stakes idle tokens to earn yield.',
    category: 'yield_farming',
    difficulty: 'beginner',
    estimatedApy: 8,
    riskLevel: 'low',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 120000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON'],
      protocolWhitelist: ['tonstakers', 'bemo', 'whales'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 1,
      maxDrawdown: 5,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 0,
      maxTradesPerDay: 2,
      cooldownSeconds: 86400,
    },
    requiredInputs: [
      { id: 'minStakeAmount', name: 'Min Stake Amount', description: 'Minimum amount to stake', type: 'amount', required: true, default: 100 },
      { id: 'protocol', name: 'Staking Protocol', description: 'Protocol to stake with', type: 'string', required: true, default: 'tonstakers' },
    ],
    tags: ['staking', 'passive', 'yield', 'beginner'],
    popularity: 890,
    createdBy: 'TONAIAgent',
  };
}

function createStakingRewardsTemplate(): StrategyTemplate {
  return {
    id: 'staking_rewards',
    name: 'Staking Rewards Harvester',
    description: 'Automatically claims and optionally reinvests staking rewards.',
    category: 'yield_farming',
    difficulty: 'beginner',
    estimatedApy: 10,
    riskLevel: 'low',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 1,
      executionTimeout: 120000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: false, onLossLimit: false, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'stTON', 'tsTON'],
      protocolWhitelist: ['tonstakers', 'bemo', 'whales'],
    },
    riskParams: {
      maxPositionSize: 100,
      maxDailyLoss: 1,
      maxDrawdown: 5,
      stopLossPercent: 0,
      takeProfitPercent: 0,
      maxSlippage: 1,
      maxTradesPerDay: 4,
      cooldownSeconds: 21600,
    },
    requiredInputs: [
      { id: 'minClaimAmount', name: 'Min Claim Amount', description: 'Minimum rewards to claim', type: 'amount', required: true, default: 1 },
      { id: 'reinvest', name: 'Reinvest', description: 'Reinvest rewards into staking', type: 'string', required: true, default: 'true' },
    ],
    tags: ['staking', 'rewards', 'harvest', 'passive'],
    popularity: 750,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Liquidity Templates
// ============================================================================

function createLiquidityProvisionTemplate(): StrategyTemplate {
  return {
    id: 'liquidity_provision',
    name: 'Liquidity Provider',
    description: 'Provide liquidity to DEX pools and earn trading fees.',
    category: 'liquidity_management',
    difficulty: 'intermediate',
    estimatedApy: 25,
    riskLevel: 'medium',
    blocks: [],
    connections: [],
    config: {
      maxGasPerExecution: 2,
      executionTimeout: 180000,
      retryPolicy: { maxRetries: 3, backoffMs: 2000, backoffMultiplier: 2 },
      notifications: { onExecution: true, onError: true, onProfitTarget: true, onLossLimit: true, channels: ['telegram'] },
      tokenWhitelist: ['TON', 'USDT', 'USDC', 'ETH'],
      protocolWhitelist: ['dedust', 'stonfi'],
    },
    riskParams: {
      maxPositionSize: 50,
      maxDailyLoss: 5,
      maxDrawdown: 15,
      stopLossPercent: 10,
      takeProfitPercent: 0,
      maxSlippage: 2,
      maxTradesPerDay: 5,
      cooldownSeconds: 3600,
    },
    requiredInputs: [
      { id: 'tokenA', name: 'Token A', description: 'First token of the pair', type: 'token', required: true, default: 'TON' },
      { id: 'tokenB', name: 'Token B', description: 'Second token of the pair', type: 'token', required: true, default: 'USDT' },
      { id: 'dex', name: 'DEX', description: 'DEX to provide liquidity', type: 'string', required: true, default: 'dedust' },
      { id: 'amount', name: 'Amount', description: 'Amount of Token A to provide', type: 'amount', required: true, default: 100 },
    ],
    tags: ['liquidity', 'lp', 'dex', 'yield'],
    popularity: 620,
    createdBy: 'TONAIAgent',
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new template registry with all built-in templates
 */
export function createTemplateRegistry(): TemplateRegistry {
  return new TemplateRegistry();
}
