/**
 * TONAIAgent - Strategy DSL (Domain Specific Language)
 *
 * Provides a DSL for defining and executing visual strategies.
 * Converts visual block representations to executable strategy definitions.
 */

import {
  Block,
  BlockCategory,
  Connection,
  Strategy,
  StrategyConfig,
  StrategyRiskParams,
  TriggerType,
  DataType,
  Position,
  ConnectionPoint,
} from './types';

// ============================================================================
// Block Registry
// ============================================================================

/**
 * Block definition for the registry
 */
export interface BlockDefinition {
  type: string;
  category: BlockCategory;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  inputs: ConnectionPoint[];
  outputs: ConnectionPoint[];
  configSchema: ConfigSchema;
  defaultConfig: Record<string, unknown>;
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumLabels?: string[];
  min?: number;
  max?: number;
  format?: string;
  items?: ConfigProperty;
}

/**
 * Registry of all available blocks
 */
export class BlockRegistry {
  private readonly definitions: Map<string, BlockDefinition> = new Map();

  constructor() {
    this.registerCoreBlocks();
  }

  /**
   * Register a block definition
   */
  register(definition: BlockDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  /**
   * Get a block definition by type
   */
  get(type: string): BlockDefinition | undefined {
    return this.definitions.get(type);
  }

  /**
   * Get all definitions in a category
   */
  getByCategory(category: BlockCategory): BlockDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (d) => d.category === category
    );
  }

  /**
   * Get all definitions
   */
  getAll(): BlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Create a new block instance from a definition
   */
  createBlock(type: string, id: string, position: Position): Block | undefined {
    const definition = this.definitions.get(type);
    if (!definition) return undefined;

    return {
      id,
      category: definition.category,
      name: definition.name,
      description: definition.description,
      version: '1.0.0',
      config: { ...definition.defaultConfig },
      position,
      inputs: definition.inputs.map((i) => ({ ...i })),
      outputs: definition.outputs.map((o) => ({ ...o })),
      enabled: true,
    };
  }

  /**
   * Register all core block types
   */
  private registerCoreBlocks(): void {
    // Trigger blocks
    this.registerTriggerBlocks();
    // Condition blocks
    this.registerConditionBlocks();
    // Action blocks
    this.registerActionBlocks();
    // Risk blocks
    this.registerRiskBlocks();
    // Capital blocks
    this.registerCapitalBlocks();
    // Utility blocks
    this.registerUtilityBlocks();
  }

  private registerTriggerBlocks(): void {
    this.register({
      type: 'trigger_price_threshold',
      category: 'trigger',
      name: 'Price Threshold',
      description: 'Triggers when a token price crosses a threshold',
      icon: '📊',
      color: '#4CAF50',
      inputs: [],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token', description: 'Token to monitor' },
          threshold: { type: 'number', title: 'Price', description: 'Price threshold' },
          direction: {
            type: 'string',
            title: 'Direction',
            enum: ['above', 'below', 'cross'],
            enumLabels: ['Above', 'Below', 'Cross'],
            default: 'above',
          },
          currency: { type: 'string', title: 'Currency', default: 'USD' },
        },
        required: ['token', 'threshold', 'direction'],
      },
      defaultConfig: {
        token: 'TON',
        threshold: 5.0,
        direction: 'above',
        currency: 'USD',
      },
    });

    this.register({
      type: 'trigger_price_change',
      category: 'trigger',
      name: 'Price Change %',
      description: 'Triggers when price changes by a percentage',
      icon: '📈',
      color: '#4CAF50',
      inputs: [],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token' },
          percentage: { type: 'number', title: 'Change %', min: 0.1, max: 100 },
          direction: {
            type: 'string',
            title: 'Direction',
            enum: ['up', 'down', 'any'],
            default: 'any',
          },
          timeframe: {
            type: 'string',
            title: 'Timeframe',
            enum: ['1m', '5m', '15m', '1h', '4h', '1d'],
            default: '1h',
          },
        },
        required: ['token', 'percentage'],
      },
      defaultConfig: {
        token: 'TON',
        percentage: 5,
        direction: 'any',
        timeframe: '1h',
      },
    });

    this.register({
      type: 'trigger_schedule',
      category: 'trigger',
      name: 'Schedule',
      description: 'Triggers on a time schedule',
      icon: '⏰',
      color: '#4CAF50',
      inputs: [],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          scheduleType: {
            type: 'string',
            title: 'Type',
            enum: ['interval', 'cron', 'daily', 'weekly'],
            default: 'interval',
          },
          interval: { type: 'number', title: 'Interval (seconds)', min: 60 },
          cron: { type: 'string', title: 'Cron Expression' },
          time: { type: 'string', title: 'Time (HH:MM)', format: 'time' },
          dayOfWeek: {
            type: 'number',
            title: 'Day of Week',
            min: 0,
            max: 6,
          },
        },
      },
      defaultConfig: {
        scheduleType: 'interval',
        interval: 3600,
      },
    });

    this.register({
      type: 'trigger_portfolio',
      category: 'trigger',
      name: 'Portfolio Change',
      description: 'Triggers on portfolio value or allocation changes',
      icon: '💼',
      color: '#4CAF50',
      inputs: [],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            title: 'Metric',
            enum: ['total_value', 'token_allocation', 'pnl_percent'],
            default: 'total_value',
          },
          condition: {
            type: 'string',
            title: 'Condition',
            enum: ['above', 'below', 'change_by'],
            default: 'above',
          },
          value: { type: 'number', title: 'Value' },
          token: { type: 'string', title: 'Token (for allocation)' },
        },
        required: ['metric', 'condition', 'value'],
      },
      defaultConfig: {
        metric: 'total_value',
        condition: 'above',
        value: 1000,
      },
    });

    this.register({
      type: 'trigger_ai_signal',
      category: 'trigger',
      name: 'AI Signal',
      description: 'Triggers on AI-generated trading signals',
      icon: '🤖',
      color: '#4CAF50',
      inputs: [],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          signalType: {
            type: 'string',
            title: 'Signal Type',
            enum: ['buy', 'sell', 'rebalance', 'opportunity', 'risk'],
            default: 'opportunity',
          },
          minConfidence: { type: 'number', title: 'Min Confidence', min: 0, max: 1, default: 0.7 },
          tokens: {
            type: 'array',
            title: 'Filter Tokens',
            items: { type: 'string', title: 'Token' },
          },
        },
        required: ['signalType', 'minConfidence'],
      },
      defaultConfig: {
        signalType: 'opportunity',
        minConfidence: 0.7,
        tokens: [],
      },
    });
  }

  private registerConditionBlocks(): void {
    this.register({
      type: 'condition_price',
      category: 'condition',
      name: 'Price Condition',
      description: 'Check current token price',
      icon: '💵',
      color: '#2196F3',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token' },
          operator: {
            type: 'string',
            title: 'Operator',
            enum: ['gt', 'gte', 'lt', 'lte', 'eq'],
            enumLabels: ['>', '>=', '<', '<=', '='],
          },
          value: { type: 'number', title: 'Price' },
          currency: { type: 'string', title: 'Currency', default: 'USD' },
        },
        required: ['token', 'operator', 'value'],
      },
      defaultConfig: {
        token: 'TON',
        operator: 'gt',
        value: 5.0,
        currency: 'USD',
      },
    });

    this.register({
      type: 'condition_balance',
      category: 'condition',
      name: 'Balance Check',
      description: 'Check wallet balance',
      icon: '💰',
      color: '#2196F3',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token' },
          operator: {
            type: 'string',
            title: 'Operator',
            enum: ['gt', 'gte', 'lt', 'lte'],
          },
          value: { type: 'number', title: 'Amount' },
        },
        required: ['token', 'operator', 'value'],
      },
      defaultConfig: {
        token: 'TON',
        operator: 'gt',
        value: 100,
      },
    });

    this.register({
      type: 'condition_market',
      category: 'condition',
      name: 'Market Condition',
      description: 'Check market conditions (trend, volatility)',
      icon: '📉',
      color: '#2196F3',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            title: 'Metric',
            enum: ['trend', 'volatility', 'volume', 'sentiment'],
          },
          condition: {
            type: 'string',
            title: 'Is',
            enum: ['bullish', 'bearish', 'neutral', 'high', 'low', 'normal'],
          },
          token: { type: 'string', title: 'Token (optional)' },
          timeframe: {
            type: 'string',
            title: 'Timeframe',
            enum: ['1h', '4h', '1d', '7d'],
            default: '1d',
          },
        },
        required: ['metric', 'condition'],
      },
      defaultConfig: {
        metric: 'trend',
        condition: 'bullish',
        timeframe: '1d',
      },
    });

    this.register({
      type: 'condition_time',
      category: 'condition',
      name: 'Time Condition',
      description: 'Check current time/date',
      icon: '🕐',
      color: '#2196F3',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'true', type: 'output', dataType: 'trigger', label: 'True', required: true },
        { id: 'false', type: 'output', dataType: 'trigger', label: 'False', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          checkType: {
            type: 'string',
            title: 'Check',
            enum: ['hour_range', 'day_of_week', 'day_of_month'],
          },
          startHour: { type: 'number', title: 'Start Hour (0-23)', min: 0, max: 23 },
          endHour: { type: 'number', title: 'End Hour (0-23)', min: 0, max: 23 },
          days: {
            type: 'array',
            title: 'Days',
            items: { type: 'number', title: 'Day', min: 0, max: 6 },
          },
        },
      },
      defaultConfig: {
        checkType: 'hour_range',
        startHour: 9,
        endHour: 17,
      },
    });

    this.register({
      type: 'condition_logic',
      category: 'condition',
      name: 'Logic Gate',
      description: 'Combine conditions with AND/OR/NOT',
      icon: '🔀',
      color: '#2196F3',
      inputs: [
        { id: 'a', type: 'input', dataType: 'boolean', label: 'A', required: true },
        { id: 'b', type: 'input', dataType: 'boolean', label: 'B', required: false },
      ],
      outputs: [
        { id: 'result', type: 'output', dataType: 'boolean', label: 'Result', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          operator: {
            type: 'string',
            title: 'Operator',
            enum: ['and', 'or', 'not', 'xor'],
            default: 'and',
          },
        },
        required: ['operator'],
      },
      defaultConfig: {
        operator: 'and',
      },
    });
  }

  private registerActionBlocks(): void {
    this.register({
      type: 'action_swap',
      category: 'action',
      name: 'Swap',
      description: 'Swap tokens on DEX',
      icon: '🔄',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          fromToken: { type: 'string', title: 'From Token' },
          toToken: { type: 'string', title: 'To Token' },
          amountType: {
            type: 'string',
            title: 'Amount Type',
            enum: ['fixed', 'percentage', 'all'],
            default: 'percentage',
          },
          amount: { type: 'number', title: 'Amount' },
          maxSlippage: { type: 'number', title: 'Max Slippage %', default: 1, min: 0.1, max: 10 },
          dex: {
            type: 'string',
            title: 'DEX',
            enum: ['dedust', 'stonfi', 'auto'],
            default: 'auto',
          },
        },
        required: ['fromToken', 'toToken', 'amountType', 'amount'],
      },
      defaultConfig: {
        fromToken: 'USDT',
        toToken: 'TON',
        amountType: 'percentage',
        amount: 50,
        maxSlippage: 1,
        dex: 'auto',
      },
    });

    this.register({
      type: 'action_transfer',
      category: 'action',
      name: 'Transfer',
      description: 'Transfer tokens to address',
      icon: '📤',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token' },
          destination: { type: 'string', title: 'Destination Address' },
          amountType: {
            type: 'string',
            title: 'Amount Type',
            enum: ['fixed', 'percentage', 'all'],
          },
          amount: { type: 'number', title: 'Amount' },
          memo: { type: 'string', title: 'Memo (optional)' },
        },
        required: ['token', 'destination', 'amountType', 'amount'],
      },
      defaultConfig: {
        token: 'TON',
        amountType: 'fixed',
        amount: 10,
      },
    });

    this.register({
      type: 'action_stake',
      category: 'action',
      name: 'Stake',
      description: 'Stake tokens in validator/pool',
      icon: '📍',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', title: 'Token', default: 'TON' },
          protocol: {
            type: 'string',
            title: 'Protocol',
            enum: ['tonstakers', 'bemo', 'whales', 'auto'],
            default: 'auto',
          },
          amountType: {
            type: 'string',
            title: 'Amount Type',
            enum: ['fixed', 'percentage', 'all'],
          },
          amount: { type: 'number', title: 'Amount' },
        },
        required: ['token', 'amountType', 'amount'],
      },
      defaultConfig: {
        token: 'TON',
        protocol: 'auto',
        amountType: 'percentage',
        amount: 50,
      },
    });

    this.register({
      type: 'action_provide_liquidity',
      category: 'action',
      name: 'Provide Liquidity',
      description: 'Add liquidity to DEX pool',
      icon: '💧',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          tokenA: { type: 'string', title: 'Token A' },
          tokenB: { type: 'string', title: 'Token B' },
          amountType: {
            type: 'string',
            title: 'Amount Type',
            enum: ['fixed', 'percentage'],
          },
          amount: { type: 'number', title: 'Amount (Token A)' },
          dex: {
            type: 'string',
            title: 'DEX',
            enum: ['dedust', 'stonfi'],
          },
          range: {
            type: 'object',
            title: 'Price Range',
            description: 'For concentrated liquidity',
          },
        },
        required: ['tokenA', 'tokenB', 'amountType', 'amount', 'dex'],
      },
      defaultConfig: {
        tokenA: 'TON',
        tokenB: 'USDT',
        amountType: 'percentage',
        amount: 50,
        dex: 'dedust',
      },
    });

    this.register({
      type: 'action_dca',
      category: 'action',
      name: 'DCA Order',
      description: 'Dollar cost averaging order',
      icon: '📅',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            title: 'Direction',
            enum: ['buy', 'sell'],
          },
          fromToken: { type: 'string', title: 'From Token' },
          toToken: { type: 'string', title: 'To Token' },
          amountPerOrder: { type: 'number', title: 'Amount Per Order' },
          totalOrders: { type: 'number', title: 'Total Orders' },
          intervalSeconds: { type: 'number', title: 'Interval (seconds)' },
        },
        required: ['direction', 'fromToken', 'toToken', 'amountPerOrder', 'totalOrders', 'intervalSeconds'],
      },
      defaultConfig: {
        direction: 'buy',
        fromToken: 'USDT',
        toToken: 'TON',
        amountPerOrder: 100,
        totalOrders: 10,
        intervalSeconds: 86400,
      },
    });

    this.register({
      type: 'action_rebalance',
      category: 'action',
      name: 'Rebalance Portfolio',
      description: 'Rebalance portfolio to target allocations',
      icon: '⚖️',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'success', type: 'output', dataType: 'trigger', label: 'Success', required: true },
        { id: 'failure', type: 'output', dataType: 'trigger', label: 'Failure', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          allocations: {
            type: 'array',
            title: 'Target Allocations',
            items: {
              type: 'object',
              title: 'Allocation Entry',
            },
          },
          threshold: {
            type: 'number',
            title: 'Drift Threshold %',
            default: 5,
            min: 1,
            max: 20,
          },
          maxSlippage: { type: 'number', title: 'Max Slippage %', default: 1 },
        },
        required: ['allocations'],
      },
      defaultConfig: {
        allocations: [
          { token: 'TON', target: 50 },
          { token: 'USDT', target: 30 },
          { token: 'ETH', target: 20 },
        ],
        threshold: 5,
        maxSlippage: 1,
      },
    });

    this.register({
      type: 'action_notification',
      category: 'action',
      name: 'Send Notification',
      description: 'Send notification to user',
      icon: '🔔',
      color: '#FF9800',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Continue', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          channel: {
            type: 'string',
            title: 'Channel',
            enum: ['telegram', 'email', 'webhook'],
            default: 'telegram',
          },
          message: { type: 'string', title: 'Message' },
          priority: {
            type: 'string',
            title: 'Priority',
            enum: ['low', 'normal', 'high'],
            default: 'normal',
          },
        },
        required: ['channel', 'message'],
      },
      defaultConfig: {
        channel: 'telegram',
        message: 'Strategy notification',
        priority: 'normal',
      },
    });
  }

  private registerRiskBlocks(): void {
    this.register({
      type: 'risk_stop_loss',
      category: 'risk',
      name: 'Stop Loss',
      description: 'Exit position on loss threshold',
      icon: '🛑',
      color: '#F44336',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'triggered', type: 'output', dataType: 'trigger', label: 'Triggered', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            title: 'Type',
            enum: ['percentage', 'fixed', 'trailing'],
            default: 'percentage',
          },
          value: { type: 'number', title: 'Loss Limit' },
          trailingDistance: { type: 'number', title: 'Trailing Distance %' },
        },
        required: ['type', 'value'],
      },
      defaultConfig: {
        type: 'percentage',
        value: 5,
      },
    });

    this.register({
      type: 'risk_take_profit',
      category: 'risk',
      name: 'Take Profit',
      description: 'Exit position on profit target',
      icon: '🎯',
      color: '#F44336',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'triggered', type: 'output', dataType: 'trigger', label: 'Triggered', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            title: 'Type',
            enum: ['percentage', 'fixed', 'trailing'],
          },
          value: { type: 'number', title: 'Profit Target' },
          partial: { type: 'boolean', title: 'Partial Exit', default: false },
          partialPercent: { type: 'number', title: 'Exit %', default: 50 },
        },
        required: ['type', 'value'],
      },
      defaultConfig: {
        type: 'percentage',
        value: 10,
        partial: false,
      },
    });

    this.register({
      type: 'risk_max_position',
      category: 'risk',
      name: 'Max Position Size',
      description: 'Limit maximum position size',
      icon: '📏',
      color: '#F44336',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'blocked', type: 'output', dataType: 'trigger', label: 'Blocked', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          maxType: {
            type: 'string',
            title: 'Limit Type',
            enum: ['percentage', 'fixed'],
          },
          maxValue: { type: 'number', title: 'Maximum' },
          token: { type: 'string', title: 'Token (optional)' },
        },
        required: ['maxType', 'maxValue'],
      },
      defaultConfig: {
        maxType: 'percentage',
        maxValue: 25,
      },
    });

    this.register({
      type: 'risk_daily_limit',
      category: 'risk',
      name: 'Daily Limits',
      description: 'Limit daily trading activity',
      icon: '📊',
      color: '#F44336',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'blocked', type: 'output', dataType: 'trigger', label: 'Blocked', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          maxTrades: { type: 'number', title: 'Max Trades', min: 1 },
          maxVolume: { type: 'number', title: 'Max Volume (USD)' },
          maxLoss: { type: 'number', title: 'Max Loss %' },
          resetTime: { type: 'string', title: 'Reset Time (UTC)', default: '00:00' },
        },
      },
      defaultConfig: {
        maxTrades: 20,
        maxVolume: 10000,
        maxLoss: 5,
        resetTime: '00:00',
      },
    });

    this.register({
      type: 'risk_cooldown',
      category: 'risk',
      name: 'Cooldown',
      description: 'Enforce minimum time between actions',
      icon: '⏳',
      color: '#F44336',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'pass', type: 'output', dataType: 'trigger', label: 'Pass', required: true },
        { id: 'blocked', type: 'output', dataType: 'trigger', label: 'Blocked', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          seconds: { type: 'number', title: 'Cooldown (seconds)', min: 1 },
          scope: {
            type: 'string',
            title: 'Scope',
            enum: ['strategy', 'action', 'token'],
            default: 'strategy',
          },
        },
        required: ['seconds'],
      },
      defaultConfig: {
        seconds: 60,
        scope: 'strategy',
      },
    });
  }

  private registerCapitalBlocks(): void {
    this.register({
      type: 'capital_allocate',
      category: 'capital',
      name: 'Allocate Capital',
      description: 'Allocate capital to strategy',
      icon: '💰',
      color: '#9C27B0',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Trigger', required: true },
      ],
      outputs: [
        { id: 'out', type: 'output', dataType: 'amount', label: 'Amount', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            title: 'Type',
            enum: ['fixed', 'percentage', 'dynamic'],
          },
          amount: { type: 'number', title: 'Amount' },
          reserve: { type: 'number', title: 'Reserve %', default: 10 },
        },
        required: ['type', 'amount'],
      },
      defaultConfig: {
        type: 'percentage',
        amount: 50,
        reserve: 10,
      },
    });

    this.register({
      type: 'capital_split',
      category: 'capital',
      name: 'Split Capital',
      description: 'Split capital into multiple streams',
      icon: '🔀',
      color: '#9C27B0',
      inputs: [
        { id: 'in', type: 'input', dataType: 'amount', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'out1', type: 'output', dataType: 'amount', label: 'Output 1', required: true },
        { id: 'out2', type: 'output', dataType: 'amount', label: 'Output 2', required: true },
        { id: 'out3', type: 'output', dataType: 'amount', label: 'Output 3', required: false },
      ],
      configSchema: {
        type: 'object',
        properties: {
          splits: {
            type: 'array',
            title: 'Splits (%)',
            items: { type: 'number', title: 'Split %' },
          },
        },
        required: ['splits'],
      },
      defaultConfig: {
        splits: [50, 50],
      },
    });
  }

  private registerUtilityBlocks(): void {
    this.register({
      type: 'utility_delay',
      category: 'utility',
      name: 'Delay',
      description: 'Wait before continuing',
      icon: '⏱️',
      color: '#607D8B',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'out', type: 'output', dataType: 'trigger', label: 'Output', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          seconds: { type: 'number', title: 'Delay (seconds)', min: 1 },
          randomize: { type: 'boolean', title: 'Randomize', default: false },
          maxSeconds: { type: 'number', title: 'Max Delay (seconds)' },
        },
        required: ['seconds'],
      },
      defaultConfig: {
        seconds: 60,
        randomize: false,
      },
    });

    this.register({
      type: 'utility_loop',
      category: 'utility',
      name: 'Loop',
      description: 'Repeat actions multiple times',
      icon: '🔁',
      color: '#607D8B',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'iteration', type: 'output', dataType: 'trigger', label: 'Each', required: true },
        { id: 'complete', type: 'output', dataType: 'trigger', label: 'Done', required: true },
      ],
      configSchema: {
        type: 'object',
        properties: {
          count: { type: 'number', title: 'Iterations', min: 1, max: 100 },
          delayBetween: { type: 'number', title: 'Delay Between (seconds)', default: 0 },
        },
        required: ['count'],
      },
      defaultConfig: {
        count: 5,
        delayBetween: 0,
      },
    });

    this.register({
      type: 'utility_parallel',
      category: 'utility',
      name: 'Parallel',
      description: 'Execute multiple branches in parallel',
      icon: '⚡',
      color: '#607D8B',
      inputs: [
        { id: 'in', type: 'input', dataType: 'trigger', label: 'Input', required: true },
      ],
      outputs: [
        { id: 'branch1', type: 'output', dataType: 'trigger', label: 'Branch 1', required: true },
        { id: 'branch2', type: 'output', dataType: 'trigger', label: 'Branch 2', required: true },
        { id: 'branch3', type: 'output', dataType: 'trigger', label: 'Branch 3', required: false },
      ],
      configSchema: {
        type: 'object',
        properties: {
          waitForAll: { type: 'boolean', title: 'Wait for All', default: true },
        },
      },
      defaultConfig: {
        waitForAll: true,
      },
    });

    this.register({
      type: 'utility_comment',
      category: 'utility',
      name: 'Comment',
      description: 'Add notes to the strategy (no execution)',
      icon: '💬',
      color: '#607D8B',
      inputs: [],
      outputs: [],
      configSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', title: 'Comment' },
          color: { type: 'string', title: 'Color', default: '#FFEB3B' },
        },
        required: ['text'],
      },
      defaultConfig: {
        text: 'Add your notes here',
        color: '#FFEB3B',
      },
    });
  }
}

// ============================================================================
// DSL Compiler
// ============================================================================

/**
 * Compiled strategy representation
 */
export interface CompiledStrategy {
  id: string;
  name: string;
  version: string;
  triggers: CompiledTrigger[];
  nodes: CompiledNode[];
  edges: CompiledEdge[];
  riskParams: StrategyRiskParams;
  config: StrategyConfig;
  hash: string;
}

export interface CompiledTrigger {
  id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  nextNodes: string[];
}

export interface CompiledNode {
  id: string;
  type: string;
  category: BlockCategory;
  config: Record<string, unknown>;
  inputs: Record<string, string[]>;
  outputs: Record<string, string[]>;
}

export interface CompiledEdge {
  from: string;
  fromOutput: string;
  to: string;
  toInput: string;
}

/**
 * DSL Compiler - converts visual strategy to executable format
 */
export class DSLCompiler {
  readonly registry: BlockRegistry;

  constructor(registry?: BlockRegistry) {
    this.registry = registry ?? new BlockRegistry();
  }

  /**
   * Compile a strategy to executable format
   */
  compile(strategy: Strategy): CompiledStrategy {
    // Extract triggers
    const triggerBlocks = strategy.blocks.filter((b) => b.category === 'trigger');
    const triggers: CompiledTrigger[] = triggerBlocks.map((tb) => {
      const triggerConfig = tb.config as { type?: TriggerType };
      const nextNodes = this.getConnectedNodes(tb.id, strategy.connections);
      return {
        id: tb.id,
        type: triggerConfig.type ?? 'manual',
        config: tb.config,
        nextNodes,
      };
    });

    // Compile all nodes
    const nodes: CompiledNode[] = strategy.blocks.map((block) => {
      return {
        id: block.id,
        type: block.name,
        category: block.category,
        config: block.config,
        inputs: this.getInputConnections(block.id, strategy.connections),
        outputs: this.getOutputConnections(block.id, strategy.connections),
      };
    });

    // Compile edges
    const edges: CompiledEdge[] = strategy.connections.map((conn) => ({
      from: conn.sourceBlockId,
      fromOutput: conn.sourceOutputId,
      to: conn.targetBlockId,
      toInput: conn.targetInputId,
    }));

    // Generate hash
    const hash = this.generateHash(strategy);

    return {
      id: strategy.id,
      name: strategy.name,
      version: strategy.version,
      triggers,
      nodes,
      edges,
      riskParams: strategy.riskParams,
      config: strategy.config,
      hash,
    };
  }

  /**
   * Decompile back to visual strategy
   */
  decompile(compiled: CompiledStrategy): Strategy {
    const blocks: Block[] = compiled.nodes.map((node, index) => ({
      id: node.id,
      category: node.category,
      name: node.type,
      description: '',
      version: '1.0.0',
      config: node.config,
      position: { x: 100 + (index % 5) * 200, y: 100 + Math.floor(index / 5) * 150 },
      inputs: Object.keys(node.inputs).map((key) => ({
        id: key,
        type: 'input' as const,
        dataType: 'trigger' as DataType,
        label: key,
        required: true,
      })),
      outputs: Object.keys(node.outputs).map((key) => ({
        id: key,
        type: 'output' as const,
        dataType: 'trigger' as DataType,
        label: key,
        required: true,
      })),
      enabled: true,
    }));

    const connections: Connection[] = compiled.edges.map((edge, index) => ({
      id: `conn_${index}`,
      sourceBlockId: edge.from,
      sourceOutputId: edge.fromOutput,
      targetBlockId: edge.to,
      targetInputId: edge.toInput,
    }));

    return {
      id: compiled.id,
      name: compiled.name,
      description: '',
      category: 'custom',
      version: compiled.version,
      author: { id: 'system' },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      blocks,
      connections,
      config: compiled.config,
      riskParams: compiled.riskParams,
      tags: [],
      isPublic: false,
      versionHistory: [],
    };
  }

  /**
   * Export to JSON DSL format
   */
  toJSON(strategy: Strategy): string {
    const compiled = this.compile(strategy);
    return JSON.stringify(compiled, null, 2);
  }

  /**
   * Import from JSON DSL format
   */
  fromJSON(json: string): Strategy {
    const compiled = JSON.parse(json) as CompiledStrategy;
    return this.decompile(compiled);
  }

  private getConnectedNodes(blockId: string, connections: Connection[]): string[] {
    return connections
      .filter((c) => c.sourceBlockId === blockId)
      .map((c) => c.targetBlockId);
  }

  private getInputConnections(blockId: string, connections: Connection[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    connections
      .filter((c) => c.targetBlockId === blockId)
      .forEach((c) => {
        if (!result[c.targetInputId]) {
          result[c.targetInputId] = [];
        }
        result[c.targetInputId].push(c.sourceBlockId);
      });
    return result;
  }

  private getOutputConnections(blockId: string, connections: Connection[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    connections
      .filter((c) => c.sourceBlockId === blockId)
      .forEach((c) => {
        if (!result[c.sourceOutputId]) {
          result[c.sourceOutputId] = [];
        }
        result[c.sourceOutputId].push(c.targetBlockId);
      });
    return result;
  }

  private generateHash(strategy: Strategy): string {
    // Simple hash based on strategy content
    const content = JSON.stringify({
      blocks: strategy.blocks.map((b) => ({ id: b.id, config: b.config })),
      connections: strategy.connections,
    });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new block registry with all core blocks
 */
export function createBlockRegistry(): BlockRegistry {
  return new BlockRegistry();
}

/**
 * Create a new DSL compiler
 */
export function createDSLCompiler(registry?: BlockRegistry): DSLCompiler {
  return new DSLCompiler(registry);
}
