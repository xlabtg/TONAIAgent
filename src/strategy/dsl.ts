/**
 * TONAIAgent - Strategy DSL (Domain-Specific Language)
 *
 * Provides parsing, validation, and manipulation of strategy definitions
 * using a structured DSL format (JSON/YAML).
 */

import {
  StrategySpec,
  StrategyTrigger,
  StrategyCondition,
  StrategyAction,
  RiskControl,
  StrategyParameter,
  CapitalAllocation,
  TriggerType,
  ActionType,
  RiskControlType,
  ConditionType,
  ComparisonOperator,
  Timeframe,
  AmountSpec,
} from './types';

// ============================================================================
// DSL Schema Types
// ============================================================================

/**
 * YAML/JSON schema for strategy definition
 */
export interface StrategyDSL {
  strategy: {
    name: string;
    description?: string;
    version?: string;
    type?: 'rule_based' | 'ai_driven' | 'hybrid';
    tags?: string[];

    triggers: DSLTrigger[];
    conditions?: DSLCondition[];
    actions: DSLAction[];
    risk_controls?: DSLRiskControl[];
    parameters?: DSLParameter[];
    capital?: DSLCapitalAllocation;
  };
}

export interface DSLTrigger {
  type: TriggerType;
  name?: string;
  enabled?: boolean;
  cooldown_seconds?: number;
  max_per_day?: number;

  // Type-specific configs
  cron?: string;
  timezone?: string;
  token?: string;
  operator?: string;
  value?: number | string;
  currency?: 'USD' | 'TON';
  timeframe?: string;
  indicator?: string;
  event_type?: string;
  tokens?: string[];
  protocols?: string[];
  metric?: string;
  expression?: string;
  variables?: Record<string, string>;
}

export interface DSLCondition {
  name?: string;
  type?: ConditionType;
  operator?: 'and' | 'or';
  required?: boolean;
  rules: DSLRule[];
}

export interface DSLRule {
  field: string;
  operator: string;
  value: number | string | boolean;
}

export interface DSLAction {
  type: ActionType;
  name?: string;
  priority?: number;

  // Common fields
  token?: string;
  from?: string;
  to?: string;
  amount?: string | number;
  percentage?: number;
  slippage?: number;
  protocol?: string;
  allowed_protocols?: string[];
  destination?: string;
  memo?: string;
  validator?: string;
  pool?: string;
  lock_period?: number;
  token_a?: string;
  token_b?: string;
  amount_a?: string | number;
  amount_b?: string | number;
  target_allocations?: Array<{ token: string; percentage: number }>;
  tolerance?: number;
  channel?: 'telegram' | 'email' | 'webhook';
  message?: string;
  data?: Record<string, unknown>;
  handler?: string;
  params?: Record<string, unknown>;

  // Retry config
  retry?: {
    max_attempts?: number;
    delay_ms?: number;
    backoff?: number;
    max_delay_ms?: number;
  };
  fallback_action?: string;
}

export interface DSLRiskControl {
  type: RiskControlType;
  name?: string;
  enabled?: boolean;
  percentage?: number;
  token?: string;
  sell_percentage?: number;
  activation_percentage?: number;
  max_percentage?: number;
  max_absolute?: number;
  timeframe?: string;
  max_transactions?: number;
  max_volume?: number;
  max_transactions_per_hour?: number;
  max_volume_per_hour?: number;
  max_single_token_exposure?: number;
  max_protocol_exposure?: number;
  action?: {
    type: 'notify' | 'pause' | 'reduce' | 'close';
    sell_percentage?: number;
    notify_channels?: string[];
  };
}

export interface DSLParameter {
  name: string;
  type?: 'number' | 'string' | 'boolean' | 'token' | 'protocol' | 'address';
  value: number | string | boolean;
  default?: number | string | boolean;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: (string | number)[];
  pattern?: string;
  optimizable?: boolean;
}

export interface DSLCapitalAllocation {
  mode?: 'fixed' | 'percentage' | 'dynamic';
  amount?: number;
  percentage?: number;
  min?: number;
  max?: number;
  reserve?: number;
}

// ============================================================================
// Parser Implementation
// ============================================================================

export class StrategyDSLParser {
  /**
   * Parse DSL from JSON or object
   */
  parse(input: string | StrategyDSL): StrategySpec {
    const dsl: StrategyDSL = typeof input === 'string' ? JSON.parse(input) : input;

    if (!dsl.strategy) {
      throw new DSLParseError('Missing "strategy" root element', 'strategy');
    }

    return {
      triggers: this.parseTriggers(dsl.strategy.triggers),
      conditions: this.parseConditions(dsl.strategy.conditions ?? []),
      actions: this.parseActions(dsl.strategy.actions),
      riskControls: this.parseRiskControls(dsl.strategy.risk_controls ?? []),
      parameters: this.parseParameters(dsl.strategy.parameters ?? []),
      capitalAllocation: this.parseCapitalAllocation(dsl.strategy.capital),
    };
  }

  /**
   * Serialize strategy definition to DSL format
   */
  serialize(definition: StrategySpec, name: string, description?: string): StrategyDSL {
    return {
      strategy: {
        name,
        description,
        triggers: this.serializeTriggers(definition.triggers),
        conditions: this.serializeConditions(definition.conditions),
        actions: this.serializeActions(definition.actions),
        risk_controls: this.serializeRiskControls(definition.riskControls),
        parameters: this.serializeParameters(definition.parameters),
        capital: this.serializeCapitalAllocation(definition.capitalAllocation),
      },
    };
  }

  // ============================================================================
  // Trigger Parsing
  // ============================================================================

  private parseTriggers(triggers: DSLTrigger[]): StrategyTrigger[] {
    if (!triggers || triggers.length === 0) {
      throw new DSLParseError('At least one trigger is required', 'strategy.triggers');
    }

    return triggers.map((t, i) => this.parseTrigger(t, i));
  }

  private parseTrigger(t: DSLTrigger, index: number): StrategyTrigger {
    const id = `trigger_${index + 1}`;
    const name = t.name ?? `${t.type} trigger`;

    const base = {
      id,
      type: t.type,
      name,
      enabled: t.enabled ?? true,
      cooldownSeconds: t.cooldown_seconds,
      maxTriggersPerDay: t.max_per_day,
    };

    switch (t.type) {
      case 'schedule':
        if (!t.cron) {
          throw new DSLParseError('Schedule trigger requires "cron" field', `triggers[${index}]`);
        }
        return {
          ...base,
          config: { type: 'schedule', cron: t.cron, timezone: t.timezone },
        };

      case 'price':
        this.requireFields(t, ['token', 'operator', 'value'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'price',
            token: t.token!,
            operator: this.parseOperator(t.operator!),
            value: Number(t.value),
            currency: t.currency ?? 'USD',
          },
        };

      case 'volume':
        this.requireFields(t, ['token', 'operator', 'value', 'timeframe'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'volume',
            token: t.token!,
            operator: this.parseOperator(t.operator!),
            value: Number(t.value),
            timeframe: t.timeframe as Timeframe,
          },
        };

      case 'indicator':
        this.requireFields(t, ['indicator', 'token', 'operator', 'value', 'timeframe'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'indicator',
            indicator: t.indicator as StrategyTrigger['config'] extends { indicator: infer I } ? I : never,
            token: t.token!,
            operator: this.parseOperator(t.operator!),
            value: Number(t.value),
            timeframe: t.timeframe as Timeframe,
          },
        };

      case 'event':
        this.requireFields(t, ['event_type'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'event',
            eventType: t.event_type as any,
            tokens: t.tokens,
            protocols: t.protocols,
          },
        };

      case 'portfolio':
        this.requireFields(t, ['metric', 'operator', 'value'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'portfolio',
            metric: t.metric as any,
            operator: this.parseOperator(t.operator!),
            value: Number(t.value),
          },
        };

      case 'market':
        this.requireFields(t, ['metric', 'operator', 'value', 'timeframe'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'market',
            metric: t.metric as any,
            operator: this.parseOperator(t.operator!),
            value: Number(t.value),
            timeframe: t.timeframe as Timeframe,
          },
        };

      case 'custom':
        this.requireFields(t, ['expression'], `triggers[${index}]`);
        return {
          ...base,
          config: {
            type: 'custom',
            expression: t.expression!,
            variables: t.variables ?? {},
          },
        };

      default:
        throw new DSLParseError(`Unknown trigger type: ${t.type}`, `triggers[${index}]`);
    }
  }

  // ============================================================================
  // Condition Parsing
  // ============================================================================

  private parseConditions(conditions: DSLCondition[]): StrategyCondition[] {
    return conditions.map((c, i) => this.parseCondition(c, i));
  }

  private parseCondition(c: DSLCondition, index: number): StrategyCondition {
    return {
      id: `condition_${index + 1}`,
      name: c.name ?? `Condition ${index + 1}`,
      type: c.type ?? 'custom',
      operator: c.operator,
      rules: c.rules.map((r, ri) => ({
        id: `rule_${index + 1}_${ri + 1}`,
        field: r.field,
        operator: this.parseOperator(r.operator),
        value: r.value,
        valueType: 'static',
      })),
      required: c.required ?? true,
    };
  }

  // ============================================================================
  // Action Parsing
  // ============================================================================

  private parseActions(actions: DSLAction[]): StrategyAction[] {
    if (!actions || actions.length === 0) {
      throw new DSLParseError('At least one action is required', 'strategy.actions');
    }

    return actions.map((a, i) => this.parseAction(a, i));
  }

  private parseAction(a: DSLAction, index: number): StrategyAction {
    const id = `action_${index + 1}`;
    const name = a.name ?? `${a.type} action`;
    const priority = a.priority ?? index + 1;

    const retryConfig = a.retry ? {
      maxAttempts: a.retry.max_attempts ?? 3,
      delayMs: a.retry.delay_ms ?? 1000,
      backoffMultiplier: a.retry.backoff ?? 2,
      maxDelayMs: a.retry.max_delay_ms ?? 30000,
    } : undefined;

    const base = { id, type: a.type, name, priority, retryConfig, fallbackActionId: a.fallback_action };

    switch (a.type) {
      case 'swap':
        this.requireFields(a, ['from', 'to', 'amount'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'swap',
            fromToken: a.from!,
            toToken: a.to!,
            amount: this.parseAmount(a.amount!, a.percentage),
            slippageTolerance: a.slippage ?? 0.5,
            preferredProtocol: a.protocol,
            allowedProtocols: a.allowed_protocols,
          },
        };

      case 'transfer':
        this.requireFields(a, ['token', 'amount', 'destination'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'transfer',
            token: a.token!,
            amount: this.parseAmount(a.amount!, a.percentage),
            destination: a.destination!,
            memo: a.memo,
          },
        };

      case 'stake':
        this.requireFields(a, ['token', 'amount'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'stake',
            token: a.token!,
            amount: this.parseAmount(a.amount!, a.percentage),
            validator: a.validator,
            pool: a.pool,
            lockPeriod: a.lock_period,
          },
        };

      case 'unstake':
        this.requireFields(a, ['token', 'amount'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'unstake',
            token: a.token!,
            amount: this.parseAmount(a.amount!, a.percentage),
            validator: a.validator,
            pool: a.pool,
          },
        };

      case 'provide_liquidity':
      case 'remove_liquidity':
        this.requireFields(a, ['protocol', 'pool', 'token_a', 'token_b'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: a.type,
            protocol: a.protocol!,
            pool: a.pool!,
            tokenA: a.token_a!,
            tokenB: a.token_b!,
            amountA: a.amount_a ? this.parseAmount(a.amount_a) : undefined,
            amountB: a.amount_b ? this.parseAmount(a.amount_b) : undefined,
            percentage: a.percentage,
          },
        };

      case 'rebalance':
        this.requireFields(a, ['target_allocations'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'rebalance',
            targetAllocations: a.target_allocations!.map(ta => ({
              token: ta.token,
              targetPercentage: ta.percentage,
            })),
            tolerance: a.tolerance ?? 5,
            maxSlippage: a.slippage ?? 1,
            preferredProtocol: a.protocol,
          },
        };

      case 'notify':
        this.requireFields(a, ['channel', 'message'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'notify',
            channel: a.channel!,
            message: a.message!,
            data: a.data,
          },
        };

      case 'pause_strategy':
        return {
          ...base,
          config: {
            type: 'custom',
            handler: 'pause_strategy',
            params: {},
          },
        };

      case 'custom':
        this.requireFields(a, ['handler'], `actions[${index}]`);
        return {
          ...base,
          config: {
            type: 'custom',
            handler: a.handler!,
            params: a.params ?? {},
          },
        };

      default:
        throw new DSLParseError(`Unknown action type: ${a.type}`, `actions[${index}]`);
    }
  }

  // ============================================================================
  // Risk Control Parsing
  // ============================================================================

  private parseRiskControls(controls: DSLRiskControl[]): RiskControl[] {
    return controls.map((c, i) => this.parseRiskControl(c, i));
  }

  private parseRiskControl(c: DSLRiskControl, index: number): RiskControl {
    const id = `risk_${index + 1}`;
    const name = c.name ?? `${c.type} control`;

    const action = c.action ?? { type: 'notify' as const };

    const base = { id, type: c.type, name, enabled: c.enabled ?? true, action };

    switch (c.type) {
      case 'stop_loss':
        this.requireFields(c, ['percentage'], `risk_controls[${index}]`);
        return {
          ...base,
          config: { type: 'stop_loss', percentage: c.percentage!, token: c.token },
        };

      case 'take_profit':
        this.requireFields(c, ['percentage'], `risk_controls[${index}]`);
        return {
          ...base,
          config: {
            type: 'take_profit',
            percentage: c.percentage!,
            token: c.token,
            sellPercentage: c.sell_percentage,
          },
        };

      case 'trailing_stop':
        this.requireFields(c, ['percentage'], `risk_controls[${index}]`);
        return {
          ...base,
          config: {
            type: 'trailing_stop',
            percentage: c.percentage!,
            token: c.token,
            activationPercentage: c.activation_percentage,
          },
        };

      case 'max_position':
        this.requireFields(c, ['token', 'max_percentage'], `risk_controls[${index}]`);
        return {
          ...base,
          config: {
            type: 'max_position',
            token: c.token!,
            maxPercentage: c.max_percentage!,
            maxAbsolute: c.max_absolute,
          },
        };

      case 'max_drawdown':
        this.requireFields(c, ['max_percentage'], `risk_controls[${index}]`);
        return {
          ...base,
          config: {
            type: 'max_drawdown',
            maxPercentage: c.max_percentage!,
            timeframe: (c.timeframe ?? '1d') as Timeframe,
          },
        };

      case 'daily_limit':
        return {
          ...base,
          config: {
            type: 'daily_limit',
            maxTransactions: c.max_transactions ?? 50,
            maxVolume: c.max_volume ?? 10000,
          },
        };

      case 'velocity_limit':
        return {
          ...base,
          config: {
            type: 'velocity_limit',
            maxTransactionsPerHour: c.max_transactions_per_hour ?? 10,
            maxVolumePerHour: c.max_volume_per_hour ?? 1000,
          },
        };

      case 'exposure_limit':
        return {
          ...base,
          config: {
            type: 'exposure_limit',
            maxSingleTokenExposure: c.max_single_token_exposure ?? 30,
            maxProtocolExposure: c.max_protocol_exposure ?? 50,
          },
        };

      default:
        throw new DSLParseError(`Unknown risk control type: ${c.type}`, `risk_controls[${index}]`);
    }
  }

  // ============================================================================
  // Parameter Parsing
  // ============================================================================

  private parseParameters(params: DSLParameter[]): StrategyParameter[] {
    return params.map((p, _i) => ({
      id: `param_${p.name}`,
      name: p.name,
      description: p.description,
      type: p.type ?? 'number',
      value: p.value,
      defaultValue: p.default ?? p.value,
      constraints: {
        min: p.min,
        max: p.max,
        step: p.step,
        options: p.options,
        pattern: p.pattern,
      },
      optimizable: p.optimizable ?? false,
    }));
  }

  // ============================================================================
  // Capital Allocation Parsing
  // ============================================================================

  private parseCapitalAllocation(cap?: DSLCapitalAllocation): CapitalAllocation {
    if (!cap) {
      return {
        mode: 'percentage',
        allocatedPercentage: 10,
        minCapital: 10,
        reservePercentage: 20,
      };
    }

    return {
      mode: cap.mode ?? 'percentage',
      allocatedAmount: cap.amount,
      allocatedPercentage: cap.percentage,
      minCapital: cap.min ?? 10,
      maxCapital: cap.max,
      reservePercentage: cap.reserve ?? 20,
    };
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  private serializeTriggers(triggers: StrategyTrigger[]): DSLTrigger[] {
    return triggers.map(t => {
      const base: DSLTrigger = {
        type: t.type,
        name: t.name,
        enabled: t.enabled,
        cooldown_seconds: t.cooldownSeconds,
        max_per_day: t.maxTriggersPerDay,
      };

      const config = t.config as any;
      return {
        ...base,
        cron: config.cron,
        timezone: config.timezone,
        token: config.token,
        operator: config.operator,
        value: config.value,
        currency: config.currency,
        timeframe: config.timeframe,
        indicator: config.indicator,
        event_type: config.eventType,
        tokens: config.tokens,
        protocols: config.protocols,
        metric: config.metric,
        expression: config.expression,
        variables: config.variables,
      };
    });
  }

  private serializeConditions(conditions: StrategyCondition[]): DSLCondition[] {
    return conditions.map(c => ({
      name: c.name,
      type: c.type,
      operator: c.operator,
      required: c.required,
      rules: c.rules.map(r => ({
        field: r.field,
        operator: r.operator,
        value: r.value,
      })),
    }));
  }

  private serializeActions(actions: StrategyAction[]): DSLAction[] {
    return actions.map(a => {
      const config = a.config as any;
      return {
        type: a.type,
        name: a.name,
        priority: a.priority,
        from: config.fromToken,
        to: config.toToken,
        token: config.token,
        amount: config.amount?.value,
        percentage: config.amount?.type === 'percentage' ? config.amount.value : config.percentage,
        slippage: config.slippageTolerance ?? config.maxSlippage,
        protocol: config.preferredProtocol ?? config.protocol,
        allowed_protocols: config.allowedProtocols,
        destination: config.destination,
        memo: config.memo,
        validator: config.validator,
        pool: config.pool,
        lock_period: config.lockPeriod,
        token_a: config.tokenA,
        token_b: config.tokenB,
        target_allocations: config.targetAllocations?.map((ta: any) => ({
          token: ta.token,
          percentage: ta.targetPercentage,
        })),
        tolerance: config.tolerance,
        channel: config.channel,
        message: config.message,
        data: config.data,
        handler: config.handler,
        params: config.params,
        retry: a.retryConfig ? {
          max_attempts: a.retryConfig.maxAttempts,
          delay_ms: a.retryConfig.delayMs,
          backoff: a.retryConfig.backoffMultiplier,
          max_delay_ms: a.retryConfig.maxDelayMs,
        } : undefined,
        fallback_action: a.fallbackActionId,
      };
    });
  }

  private serializeRiskControls(controls: RiskControl[]): DSLRiskControl[] {
    return controls.map(c => {
      const config = c.config as any;
      return {
        type: c.type,
        name: c.name,
        enabled: c.enabled,
        percentage: config.percentage,
        token: config.token,
        sell_percentage: config.sellPercentage,
        activation_percentage: config.activationPercentage,
        max_percentage: config.maxPercentage,
        max_absolute: config.maxAbsolute,
        timeframe: config.timeframe,
        max_transactions: config.maxTransactions,
        max_volume: config.maxVolume,
        max_transactions_per_hour: config.maxTransactionsPerHour,
        max_volume_per_hour: config.maxVolumePerHour,
        max_single_token_exposure: config.maxSingleTokenExposure,
        max_protocol_exposure: config.maxProtocolExposure,
        action: c.action,
      };
    });
  }

  private serializeParameters(params: StrategyParameter[]): DSLParameter[] {
    return params.map(p => ({
      name: p.name,
      type: p.type,
      value: p.value,
      default: p.defaultValue,
      description: p.description,
      min: p.constraints?.min,
      max: p.constraints?.max,
      step: p.constraints?.step,
      options: p.constraints?.options,
      pattern: p.constraints?.pattern,
      optimizable: p.optimizable,
    }));
  }

  private serializeCapitalAllocation(cap: CapitalAllocation): DSLCapitalAllocation {
    return {
      mode: cap.mode,
      amount: cap.allocatedAmount,
      percentage: cap.allocatedPercentage,
      min: cap.minCapital,
      max: cap.maxCapital,
      reserve: cap.reservePercentage,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private parseOperator(op: string): ComparisonOperator {
    const operators: Record<string, ComparisonOperator> = {
      '==': 'equals',
      '!=': 'not_equals',
      '>': 'greater_than',
      '<': 'less_than',
      '>=': 'greater_or_equal',
      '<=': 'less_or_equal',
      'equals': 'equals',
      'not_equals': 'not_equals',
      'greater_than': 'greater_than',
      'less_than': 'less_than',
      'greater_or_equal': 'greater_or_equal',
      'less_or_equal': 'less_or_equal',
      'between': 'between',
      'crosses_above': 'crosses_above',
      'crosses_below': 'crosses_below',
    };

    const result = operators[op];
    if (!result) {
      throw new DSLParseError(`Unknown operator: ${op}`, '');
    }
    return result;
  }

  private parseAmount(value: string | number, percentage?: number): AmountSpec {
    if (percentage !== undefined) {
      return { type: 'percentage', value: percentage };
    }

    if (typeof value === 'number') {
      return { type: 'fixed', value };
    }

    // Parse string expressions like "${params.amount}" or "50%"
    if (value.startsWith('${params.')) {
      return { type: 'parameter', value: value.slice(9, -1) };
    }

    if (value.endsWith('%')) {
      return { type: 'percentage', value: parseFloat(value) };
    }

    if (value === 'remaining' || value === 'all') {
      return { type: 'remaining', value: 100 };
    }

    return { type: 'fixed', value: parseFloat(value) };
  }

  private requireFields(obj: any, fields: string[], path: string): void {
    for (const field of fields) {
      if (obj[field] === undefined || obj[field] === null) {
        throw new DSLParseError(`Missing required field: ${field}`, path);
      }
    }
  }
}

// ============================================================================
// DSL Validator
// ============================================================================

export interface DSLValidationResult {
  valid: boolean;
  errors: DSLValidationError[];
  warnings: DSLValidationWarning[];
}

export interface DSLValidationError {
  path: string;
  message: string;
  code: string;
}

export interface DSLValidationWarning {
  path: string;
  message: string;
  code: string;
}

export class StrategyDSLValidator {
  /**
   * Validate a DSL document
   */
  validate(dsl: StrategyDSL | string): DSLValidationResult {
    const errors: DSLValidationError[] = [];
    const warnings: DSLValidationWarning[] = [];

    let parsed: StrategyDSL;
    try {
      parsed = typeof dsl === 'string' ? JSON.parse(dsl) : dsl;
    } catch {
      return {
        valid: false,
        errors: [{ path: '', message: 'Invalid JSON', code: 'PARSE_ERROR' }],
        warnings: [],
      };
    }

    if (!parsed.strategy) {
      errors.push({ path: '', message: 'Missing strategy root', code: 'MISSING_ROOT' });
      return { valid: false, errors, warnings };
    }

    const s = parsed.strategy;

    // Validate name
    if (!s.name || s.name.trim().length === 0) {
      errors.push({ path: 'strategy.name', message: 'Name is required', code: 'REQUIRED' });
    }

    // Validate triggers
    if (!s.triggers || s.triggers.length === 0) {
      errors.push({ path: 'strategy.triggers', message: 'At least one trigger is required', code: 'REQUIRED' });
    } else {
      for (let i = 0; i < s.triggers.length; i++) {
        const t = s.triggers[i];
        if (!t.type) {
          errors.push({ path: `strategy.triggers[${i}].type`, message: 'Trigger type is required', code: 'REQUIRED' });
        }
      }
    }

    // Validate actions
    if (!s.actions || s.actions.length === 0) {
      errors.push({ path: 'strategy.actions', message: 'At least one action is required', code: 'REQUIRED' });
    } else {
      for (let i = 0; i < s.actions.length; i++) {
        const a = s.actions[i];
        if (!a.type) {
          errors.push({ path: `strategy.actions[${i}].type`, message: 'Action type is required', code: 'REQUIRED' });
        }
      }
    }

    // Warnings for missing risk controls
    if (!s.risk_controls || s.risk_controls.length === 0) {
      warnings.push({
        path: 'strategy.risk_controls',
        message: 'No risk controls defined. Consider adding stop-loss protection.',
        code: 'MISSING_RISK_CONTROL',
      });
    }

    // Validate capital allocation
    if (s.capital) {
      if (s.capital.reserve !== undefined && (s.capital.reserve < 0 || s.capital.reserve > 100)) {
        errors.push({
          path: 'strategy.capital.reserve',
          message: 'Reserve must be between 0 and 100',
          code: 'INVALID_VALUE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Perform static analysis on strategy
   */
  analyze(definition: StrategySpec): StrategyAnalysisResult {
    const issues: AnalysisIssue[] = [];
    const suggestions: AnalysisSuggestion[] = [];

    // Check for potential infinite loops in triggers
    const scheduleTriggers = definition.triggers.filter(t => t.config.type === 'schedule');
    for (const trigger of scheduleTriggers) {
      const config = trigger.config as { cron: string };
      if (config.cron.includes('* * * * *')) {
        issues.push({
          type: 'warning',
          path: `triggers.${trigger.id}`,
          message: 'Very frequent schedule (every minute) may cause rate limiting',
        });
      }
    }

    // Check for missing stop-loss on high-risk actions
    const hasSwap = definition.actions.some(a => a.type === 'swap');
    const hasStopLoss = definition.riskControls.some(r => r.type === 'stop_loss');
    if (hasSwap && !hasStopLoss) {
      suggestions.push({
        type: 'risk',
        message: 'Consider adding a stop-loss for swap actions',
        implementation: {
          riskControls: [{
            id: 'auto_stop_loss',
            type: 'stop_loss',
            name: 'Auto Stop Loss',
            enabled: true,
            config: { type: 'stop_loss', percentage: 10 },
            action: { type: 'close' },
          }],
        },
      });
    }

    // Check slippage settings
    for (const action of definition.actions) {
      if (action.type === 'swap') {
        const config = action.config as { slippageTolerance: number };
        if (config.slippageTolerance > 5) {
          issues.push({
            type: 'warning',
            path: `actions.${action.id}`,
            message: `High slippage tolerance (${config.slippageTolerance}%) may result in unfavorable trades`,
          });
        }
      }
    }

    // Check capital allocation
    if (definition.capitalAllocation.allocatedPercentage && definition.capitalAllocation.allocatedPercentage > 50) {
      issues.push({
        type: 'warning',
        path: 'capitalAllocation',
        message: 'Allocating more than 50% of portfolio may be risky',
      });
    }

    return {
      complexity: this.calculateComplexity(definition),
      issues,
      suggestions,
      estimatedGasPerExecution: this.estimateGas(definition),
    };
  }

  private calculateComplexity(definition: StrategySpec): 'low' | 'medium' | 'high' {
    const score =
      definition.triggers.length +
      definition.conditions.length * 2 +
      definition.actions.length * 3 +
      definition.riskControls.length;

    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  private estimateGas(definition: StrategySpec): number {
    let gas = 50000; // Base gas

    for (const action of definition.actions) {
      switch (action.type) {
        case 'swap':
          gas += 200000;
          break;
        case 'transfer':
          gas += 50000;
          break;
        case 'stake':
        case 'unstake':
          gas += 150000;
          break;
        case 'provide_liquidity':
        case 'remove_liquidity':
          gas += 300000;
          break;
        case 'rebalance':
          const config = action.config as { targetAllocations: unknown[] };
          gas += config.targetAllocations.length * 200000;
          break;
        default:
          gas += 30000;
      }
    }

    return gas;
  }
}

export interface StrategyAnalysisResult {
  complexity: 'low' | 'medium' | 'high';
  issues: AnalysisIssue[];
  suggestions: AnalysisSuggestion[];
  estimatedGasPerExecution: number;
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  path: string;
  message: string;
}

export interface AnalysisSuggestion {
  type: 'optimization' | 'risk' | 'cost';
  message: string;
  implementation?: Partial<StrategySpec>;
}

// ============================================================================
// Error Classes
// ============================================================================

export class DSLParseError extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(`DSL Parse Error at ${path}: ${message}`);
    this.name = 'DSLParseError';
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDSLParser(): StrategyDSLParser {
  return new StrategyDSLParser();
}

export function createDSLValidator(): StrategyDSLValidator {
  return new StrategyDSLValidator();
}
