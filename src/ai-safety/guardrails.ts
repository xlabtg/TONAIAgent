/**
 * TONAIAgent - Guardrails & Policy Engine
 *
 * Implements comprehensive guardrails for autonomous agent operation:
 * - Strategy validation
 * - Transaction policy enforcement
 * - Risk thresholds
 * - Asset and protocol whitelists
 */

import {
  GuardrailsConfig,
  RiskThresholdsConfig,
  ValidationRule,
  RuleCondition,
  TransactionPolicy,
  PolicyCondition,
  PolicyAction,
  AssetEntry,
  ProtocolEntry,
  SafetyLevel,
  AISafetyEvent,
  AISafetyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface GuardrailsManager {
  // Configuration
  configure(config: Partial<GuardrailsConfig>): GuardrailsConfig;
  getConfig(): GuardrailsConfig;

  // Strategy Validation
  validateStrategy(strategy: StrategyValidationInput): Promise<StrategyValidationResult>;
  addValidationRule(rule: ValidationRule): void;
  removeValidationRule(ruleId: string): void;
  getValidationRules(): ValidationRule[];
  blockStrategy(strategyId: string, reason: string): void;
  unblockStrategy(strategyId: string): void;

  // Transaction Policy
  evaluateTransaction(transaction: TransactionInput): Promise<PolicyEvaluationResult>;
  addPolicy(policy: TransactionPolicy): void;
  updatePolicy(policyId: string, updates: Partial<TransactionPolicy>): void;
  removePolicy(policyId: string): void;
  getPolicies(): TransactionPolicy[];
  setEmergencyMode(enabled: boolean): void;

  // Risk Thresholds
  checkRiskThresholds(context: RiskContext): RiskThresholdResult;
  updateRiskThresholds(thresholds: Partial<RiskThresholdsConfig>): void;
  getRiskThresholds(): RiskThresholdsConfig;

  // Asset Whitelist
  addAsset(asset: AssetEntry): void;
  removeAsset(address: string): void;
  isAssetAllowed(address: string): boolean;
  getAssetInfo(address: string): AssetEntry | null;
  getAssets(): AssetEntry[];

  // Protocol Whitelist
  addProtocol(protocol: ProtocolEntry): void;
  removeProtocol(protocolId: string): void;
  isProtocolAllowed(protocolId: string): boolean;
  getProtocolInfo(protocolId: string): ProtocolEntry | null;
  getProtocols(): ProtocolEntry[];

  // Events
  onEvent(callback: AISafetyEventCallback): void;
}

export interface StrategyValidationInput {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  backtestResults?: BacktestResults;
  riskMetrics?: RiskMetrics;
}

export interface BacktestResults {
  period: { start: Date; end: Date };
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  tradesCount: number;
}

export interface RiskMetrics {
  var95: number;
  expectedShortfall: number;
  volatility: number;
  beta: number;
}

export interface StrategyValidationResult {
  valid: boolean;
  score: number;
  violations: RuleViolation[];
  warnings: RuleWarning[];
  recommendations: string[];
  requiresBacktest: boolean;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: SafetyLevel;
  value: unknown;
}

export interface RuleWarning {
  ruleId: string;
  ruleName: string;
  message: string;
  recommendation: string;
}

export interface TransactionInput {
  type: 'transfer' | 'swap' | 'stake' | 'unstake' | 'provide_liquidity' | 'remove_liquidity' | 'other';
  amount: number;
  currency: string;
  destination?: string;
  protocol?: string;
  timestamp: Date;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  action: PolicyAction['type'];
  matchedPolicies: MatchedPolicy[];
  riskScore: number;
  requiredApprovals: string[];
  modifications?: Record<string, unknown>;
  notification?: PolicyAction['notification'];
}

export interface MatchedPolicy {
  policyId: string;
  policyName: string;
  action: PolicyAction;
  matchedConditions: string[];
}

export interface RiskContext {
  transactionValue: number;
  portfolioValue: number;
  currentDrawdown: number;
  dailyLoss: number;
  concentration: number;
  leverage: number;
}

export interface RiskThresholdResult {
  withinLimits: boolean;
  violations: ThresholdViolation[];
  warnings: ThresholdWarning[];
  utilizationPercentages: Record<string, number>;
}

export interface ThresholdViolation {
  threshold: string;
  limit: number;
  current: number;
  message: string;
}

export interface ThresholdWarning {
  threshold: string;
  limit: number;
  current: number;
  utilizationPercent: number;
  message: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GUARDRAILS_CONFIG: GuardrailsConfig = {
  enabled: true,
  strategyValidation: {
    requireValidation: true,
    validationRules: [],
    blockedStrategies: [],
    requireBacktest: true,
    minBacktestPeriod: 30,
  },
  transactionPolicy: {
    enabled: true,
    policies: [],
    defaultPolicy: 'deny',
    emergencyMode: false,
  },
  riskThresholds: {
    maxTransactionRisk: 50,
    maxPortfolioRisk: 30,
    maxDailyLoss: 5,
    maxDrawdown: 15,
    maxConcentration: 25,
    maxLeverage: 3,
  },
  assetWhitelist: {
    enabled: true,
    mode: 'whitelist',
    assets: [],
    autoUpdate: false,
  },
  protocolWhitelist: {
    enabled: true,
    mode: 'whitelist',
    protocols: [],
    autoUpdate: false,
  },
};

// ============================================================================
// Guardrails Manager Implementation
// ============================================================================

export class DefaultGuardrailsManager implements GuardrailsManager {
  private config: GuardrailsConfig;
  private readonly validationRules: Map<string, ValidationRule> = new Map();
  private readonly policies: Map<string, TransactionPolicy> = new Map();
  private readonly assets: Map<string, AssetEntry> = new Map();
  private readonly protocols: Map<string, ProtocolEntry> = new Map();
  private readonly blockedStrategies: Set<string> = new Set();
  private readonly eventCallbacks: AISafetyEventCallback[] = [];

  constructor(config?: Partial<GuardrailsConfig>) {
    this.config = { ...DEFAULT_GUARDRAILS_CONFIG, ...config };
    this.initializeDefaultRules();
    this.initializeDefaultPolicies();
    this.initializeDefaultAssets();
    this.initializeDefaultProtocols();
  }

  // ========== Configuration ==========

  configure(config: Partial<GuardrailsConfig>): GuardrailsConfig {
    this.config = {
      ...this.config,
      ...config,
      strategyValidation: { ...this.config.strategyValidation, ...config.strategyValidation },
      transactionPolicy: { ...this.config.transactionPolicy, ...config.transactionPolicy },
      riskThresholds: { ...this.config.riskThresholds, ...config.riskThresholds },
      assetWhitelist: { ...this.config.assetWhitelist, ...config.assetWhitelist },
      protocolWhitelist: { ...this.config.protocolWhitelist, ...config.protocolWhitelist },
    };
    return this.config;
  }

  getConfig(): GuardrailsConfig {
    return { ...this.config };
  }

  // ========== Strategy Validation ==========

  async validateStrategy(strategy: StrategyValidationInput): Promise<StrategyValidationResult> {
    const violations: RuleViolation[] = [];
    const warnings: RuleWarning[] = [];
    const recommendations: string[] = [];

    // Check if strategy is blocked
    if (this.blockedStrategies.has(strategy.id)) {
      violations.push({
        ruleId: 'blocked_strategy',
        ruleName: 'Blocked Strategy Check',
        description: `Strategy ${strategy.id} is explicitly blocked`,
        severity: 'critical',
        value: strategy.id,
      });
    }

    // Check backtest requirement
    let requiresBacktest = false;
    if (this.config.strategyValidation.requireBacktest) {
      if (!strategy.backtestResults) {
        requiresBacktest = true;
        warnings.push({
          ruleId: 'backtest_required',
          ruleName: 'Backtest Requirement',
          message: 'Strategy has not been backtested',
          recommendation: `Run backtest for at least ${this.config.strategyValidation.minBacktestPeriod} days`,
        });
      } else {
        const periodDays = Math.ceil(
          (strategy.backtestResults.period.end.getTime() - strategy.backtestResults.period.start.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (periodDays < this.config.strategyValidation.minBacktestPeriod) {
          warnings.push({
            ruleId: 'backtest_period',
            ruleName: 'Backtest Period',
            message: `Backtest period (${periodDays} days) is shorter than recommended`,
            recommendation: `Extend backtest to at least ${this.config.strategyValidation.minBacktestPeriod} days`,
          });
        }
      }
    }

    // Apply validation rules
    for (const rule of this.validationRules.values()) {
      if (!rule.enabled) continue;

      const result = this.evaluateRule(rule, strategy);
      if (result.matched) {
        switch (rule.action) {
          case 'block':
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              description: rule.description,
              severity: 'high',
              value: result.value,
            });
            break;
          case 'warn':
            warnings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: rule.description,
              recommendation: `Review parameter: ${result.field}`,
            });
            break;
          case 'escalate':
            warnings.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message: `Escalation required: ${rule.description}`,
              recommendation: 'Request approval before deployment',
            });
            break;
        }
      }
    }

    // Check risk metrics if available
    if (strategy.riskMetrics) {
      if (strategy.riskMetrics.var95 > 10) {
        warnings.push({
          ruleId: 'var_warning',
          ruleName: 'VaR Warning',
          message: `VaR (95%) of ${strategy.riskMetrics.var95}% is high`,
          recommendation: 'Consider reducing position sizes or adding hedges',
        });
      }

      if (strategy.riskMetrics.volatility > 50) {
        warnings.push({
          ruleId: 'volatility_warning',
          ruleName: 'Volatility Warning',
          message: `Strategy volatility of ${strategy.riskMetrics.volatility}% is high`,
          recommendation: 'Consider adding volatility filters or position limits',
        });
      }
    }

    // Check backtest results if available
    if (strategy.backtestResults) {
      if (strategy.backtestResults.maxDrawdown > 20) {
        warnings.push({
          ruleId: 'drawdown_warning',
          ruleName: 'Drawdown Warning',
          message: `Max drawdown of ${strategy.backtestResults.maxDrawdown}% exceeds safe threshold`,
          recommendation: 'Add drawdown protection or reduce leverage',
        });
      }

      if (strategy.backtestResults.winRate < 0.4) {
        warnings.push({
          ruleId: 'winrate_warning',
          ruleName: 'Win Rate Warning',
          message: `Win rate of ${(strategy.backtestResults.winRate * 100).toFixed(1)}% is low`,
          recommendation: 'Review entry/exit criteria',
        });
      }

      if (strategy.backtestResults.sharpeRatio < 0.5) {
        recommendations.push('Consider optimizing risk-adjusted returns (Sharpe < 0.5)');
      }
    }

    // Calculate validation score
    const score = this.calculateValidationScore(violations, warnings);

    const result: StrategyValidationResult = {
      valid: violations.length === 0,
      score,
      violations,
      warnings,
      recommendations,
      requiresBacktest,
    };

    // Emit event for validation
    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'guardrail_triggered',
      severity: violations.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low',
      description: `Strategy validation: ${result.valid ? 'passed' : 'failed'}`,
      details: { strategyId: strategy.id, score, violationCount: violations.length },
      metadata: {},
    });

    return result;
  }

  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  removeValidationRule(ruleId: string): void {
    this.validationRules.delete(ruleId);
  }

  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  blockStrategy(strategyId: string, reason: string): void {
    this.blockedStrategies.add(strategyId);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'guardrail_triggered',
      severity: 'high',
      description: `Strategy blocked: ${strategyId}`,
      details: { strategyId, reason },
      metadata: {},
    });
  }

  unblockStrategy(strategyId: string): void {
    this.blockedStrategies.delete(strategyId);
  }

  // ========== Transaction Policy ==========

  async evaluateTransaction(transaction: TransactionInput): Promise<PolicyEvaluationResult> {
    // Check emergency mode
    if (this.config.transactionPolicy.emergencyMode) {
      return {
        allowed: false,
        action: 'deny',
        matchedPolicies: [{
          policyId: 'emergency_mode',
          policyName: 'Emergency Mode',
          action: { type: 'deny' },
          matchedConditions: ['Emergency mode is active'],
        }],
        riskScore: 100,
        requiredApprovals: [],
      };
    }

    const matchedPolicies: MatchedPolicy[] = [];
    let finalAction: PolicyAction['type'] = this.config.transactionPolicy.defaultPolicy === 'allow' ? 'allow' : 'deny';
    let modifications: Record<string, unknown> | undefined;
    let notification: PolicyAction['notification'] | undefined;
    const requiredApprovals: string[] = [];
    let highestPriority = -1;

    // Sort policies by priority
    const sortedPolicies = Array.from(this.policies.values()).sort((a, b) => b.priority - a.priority);

    for (const policy of sortedPolicies) {
      if (!policy.enabled) continue;

      const matchResult = this.evaluatePolicyConditions(policy, transaction);
      if (matchResult.matched) {
        matchedPolicies.push({
          policyId: policy.id,
          policyName: policy.name,
          action: policy.action,
          matchedConditions: matchResult.matchedConditions,
        });

        // Higher priority policy takes precedence
        if (policy.priority > highestPriority) {
          highestPriority = policy.priority;
          finalAction = policy.action.type;
          modifications = policy.action.parameters as Record<string, unknown>;
          notification = policy.action.notification;

          if (policy.action.type === 'require_approval') {
            requiredApprovals.push(policy.name);
          }
        }
      }
    }

    // Calculate risk score
    const riskScore = this.calculateTransactionRiskScore(transaction);

    // Check asset and protocol whitelists
    if (transaction.destination && this.config.assetWhitelist.enabled) {
      if (!this.isAssetAllowed(transaction.destination)) {
        matchedPolicies.push({
          policyId: 'asset_whitelist',
          policyName: 'Asset Whitelist',
          action: { type: 'deny' },
          matchedConditions: ['Asset not in whitelist'],
        });
        finalAction = 'deny';
      }
    }

    if (transaction.protocol && this.config.protocolWhitelist.enabled) {
      if (!this.isProtocolAllowed(transaction.protocol)) {
        matchedPolicies.push({
          policyId: 'protocol_whitelist',
          policyName: 'Protocol Whitelist',
          action: { type: 'deny' },
          matchedConditions: ['Protocol not in whitelist'],
        });
        finalAction = 'deny';
      }
    }

    // Emit event
    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'policy_violation',
      agentId: transaction.agentId,
      severity: finalAction === 'deny' ? 'high' : finalAction === 'require_approval' ? 'medium' : 'low',
      description: `Transaction policy evaluation: ${finalAction}`,
      details: { transaction, matchedPolicies: matchedPolicies.length, riskScore },
      metadata: {},
    });

    return {
      allowed: finalAction === 'allow',
      action: finalAction,
      matchedPolicies,
      riskScore,
      requiredApprovals,
      modifications,
      notification,
    };
  }

  addPolicy(policy: TransactionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  updatePolicy(policyId: string, updates: Partial<TransactionPolicy>): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      this.policies.set(policyId, { ...policy, ...updates });
    }
  }

  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  getPolicies(): TransactionPolicy[] {
    return Array.from(this.policies.values());
  }

  setEmergencyMode(enabled: boolean): void {
    this.config.transactionPolicy.emergencyMode = enabled;

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'emergency_action',
      severity: 'critical',
      description: `Emergency mode ${enabled ? 'activated' : 'deactivated'}`,
      details: { emergencyMode: enabled },
      metadata: {},
    });
  }

  // ========== Risk Thresholds ==========

  checkRiskThresholds(context: RiskContext): RiskThresholdResult {
    const violations: ThresholdViolation[] = [];
    const warnings: ThresholdWarning[] = [];
    const utilizationPercentages: Record<string, number> = {};
    const thresholds = this.config.riskThresholds;

    // Transaction risk
    const txRiskUtil = (context.transactionValue / context.portfolioValue) * 100;
    utilizationPercentages['transactionRisk'] = txRiskUtil;
    if (txRiskUtil > thresholds.maxTransactionRisk) {
      violations.push({
        threshold: 'maxTransactionRisk',
        limit: thresholds.maxTransactionRisk,
        current: txRiskUtil,
        message: `Transaction risk ${txRiskUtil.toFixed(1)}% exceeds limit ${thresholds.maxTransactionRisk}%`,
      });
    } else if (txRiskUtil > thresholds.maxTransactionRisk * 0.8) {
      warnings.push({
        threshold: 'maxTransactionRisk',
        limit: thresholds.maxTransactionRisk,
        current: txRiskUtil,
        utilizationPercent: (txRiskUtil / thresholds.maxTransactionRisk) * 100,
        message: `Transaction risk approaching limit (${txRiskUtil.toFixed(1)}% / ${thresholds.maxTransactionRisk}%)`,
      });
    }

    // Daily loss
    utilizationPercentages['dailyLoss'] = context.dailyLoss;
    if (context.dailyLoss > thresholds.maxDailyLoss) {
      violations.push({
        threshold: 'maxDailyLoss',
        limit: thresholds.maxDailyLoss,
        current: context.dailyLoss,
        message: `Daily loss ${context.dailyLoss.toFixed(1)}% exceeds limit ${thresholds.maxDailyLoss}%`,
      });
    } else if (context.dailyLoss > thresholds.maxDailyLoss * 0.8) {
      warnings.push({
        threshold: 'maxDailyLoss',
        limit: thresholds.maxDailyLoss,
        current: context.dailyLoss,
        utilizationPercent: (context.dailyLoss / thresholds.maxDailyLoss) * 100,
        message: `Daily loss approaching limit`,
      });
    }

    // Drawdown
    utilizationPercentages['drawdown'] = context.currentDrawdown;
    if (context.currentDrawdown > thresholds.maxDrawdown) {
      violations.push({
        threshold: 'maxDrawdown',
        limit: thresholds.maxDrawdown,
        current: context.currentDrawdown,
        message: `Drawdown ${context.currentDrawdown.toFixed(1)}% exceeds limit ${thresholds.maxDrawdown}%`,
      });
    } else if (context.currentDrawdown > thresholds.maxDrawdown * 0.8) {
      warnings.push({
        threshold: 'maxDrawdown',
        limit: thresholds.maxDrawdown,
        current: context.currentDrawdown,
        utilizationPercent: (context.currentDrawdown / thresholds.maxDrawdown) * 100,
        message: `Drawdown approaching limit`,
      });
    }

    // Concentration
    utilizationPercentages['concentration'] = context.concentration;
    if (context.concentration > thresholds.maxConcentration) {
      violations.push({
        threshold: 'maxConcentration',
        limit: thresholds.maxConcentration,
        current: context.concentration,
        message: `Concentration ${context.concentration.toFixed(1)}% exceeds limit ${thresholds.maxConcentration}%`,
      });
    }

    // Leverage
    utilizationPercentages['leverage'] = context.leverage;
    if (context.leverage > thresholds.maxLeverage) {
      violations.push({
        threshold: 'maxLeverage',
        limit: thresholds.maxLeverage,
        current: context.leverage,
        message: `Leverage ${context.leverage.toFixed(1)}x exceeds limit ${thresholds.maxLeverage}x`,
      });
    }

    return {
      withinLimits: violations.length === 0,
      violations,
      warnings,
      utilizationPercentages,
    };
  }

  updateRiskThresholds(thresholds: Partial<RiskThresholdsConfig>): void {
    this.config.riskThresholds = { ...this.config.riskThresholds, ...thresholds };
  }

  getRiskThresholds(): RiskThresholdsConfig {
    return { ...this.config.riskThresholds };
  }

  // ========== Asset Whitelist ==========

  addAsset(asset: AssetEntry): void {
    this.assets.set(asset.address, asset);
  }

  removeAsset(address: string): void {
    this.assets.delete(address);
  }

  isAssetAllowed(address: string): boolean {
    if (!this.config.assetWhitelist.enabled) return true;

    const hasAsset = this.assets.has(address);
    return this.config.assetWhitelist.mode === 'whitelist' ? hasAsset : !hasAsset;
  }

  getAssetInfo(address: string): AssetEntry | null {
    return this.assets.get(address) || null;
  }

  getAssets(): AssetEntry[] {
    return Array.from(this.assets.values());
  }

  // ========== Protocol Whitelist ==========

  addProtocol(protocol: ProtocolEntry): void {
    this.protocols.set(protocol.id, protocol);
  }

  removeProtocol(protocolId: string): void {
    this.protocols.delete(protocolId);
  }

  isProtocolAllowed(protocolId: string): boolean {
    if (!this.config.protocolWhitelist.enabled) return true;

    const hasProtocol = this.protocols.has(protocolId);
    return this.config.protocolWhitelist.mode === 'whitelist' ? hasProtocol : !hasProtocol;
  }

  getProtocolInfo(protocolId: string): ProtocolEntry | null {
    return this.protocols.get(protocolId) || null;
  }

  getProtocols(): ProtocolEntry[] {
    return Array.from(this.protocols.values());
  }

  // ========== Events ==========

  onEvent(callback: AISafetyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ========== Private Helpers ==========

  private initializeDefaultRules(): void {
    // Max leverage rule
    this.validationRules.set('max_leverage', {
      id: 'max_leverage',
      name: 'Maximum Leverage',
      description: 'Strategy leverage must not exceed maximum allowed',
      condition: {
        field: 'parameters.leverage',
        operator: 'gt',
        value: 5,
      },
      action: 'block',
      priority: 100,
      enabled: true,
    });

    // Min backtest trades rule
    this.validationRules.set('min_backtest_trades', {
      id: 'min_backtest_trades',
      name: 'Minimum Backtest Trades',
      description: 'Strategy must have sufficient backtest trades',
      condition: {
        field: 'backtestResults.tradesCount',
        operator: 'lt',
        value: 50,
      },
      action: 'warn',
      priority: 50,
      enabled: true,
    });

    // Negative sharpe rule
    this.validationRules.set('negative_sharpe', {
      id: 'negative_sharpe',
      name: 'Negative Sharpe Ratio',
      description: 'Strategy has negative risk-adjusted returns',
      condition: {
        field: 'backtestResults.sharpeRatio',
        operator: 'lt',
        value: 0,
      },
      action: 'warn',
      priority: 75,
      enabled: true,
    });
  }

  private initializeDefaultPolicies(): void {
    // Large transaction policy
    this.policies.set('large_transaction', {
      id: 'large_transaction',
      name: 'Large Transaction Approval',
      description: 'Require approval for large transactions',
      conditions: [
        { type: 'amount', operator: 'gt', value: 10000 },
      ],
      action: { type: 'require_approval' },
      priority: 100,
      enabled: true,
      createdBy: 'system',
      createdAt: new Date(),
    });

    // Unknown destination policy
    this.policies.set('unknown_destination', {
      id: 'unknown_destination',
      name: 'Unknown Destination Warning',
      description: 'Flag transactions to unknown addresses',
      conditions: [
        { type: 'destination', operator: 'not_in', value: [] },
        { type: 'amount', operator: 'gt', value: 100 },
      ],
      action: {
        type: 'require_approval',
        notification: {
          channels: ['webhook'],
          recipients: [],
          template: 'unknown_destination_warning',
          urgency: 'high',
        },
      },
      priority: 90,
      enabled: true,
      createdBy: 'system',
      createdAt: new Date(),
    });

    // Rate limiting policy
    this.policies.set('rate_limit', {
      id: 'rate_limit',
      name: 'Transaction Rate Limit',
      description: 'Limit transaction frequency',
      conditions: [
        { type: 'frequency', operator: 'gt', value: 100 }, // per hour
      ],
      action: { type: 'rate_limit', parameters: { maxPerHour: 100 } },
      priority: 80,
      enabled: true,
      createdBy: 'system',
      createdAt: new Date(),
    });
  }

  private initializeDefaultAssets(): void {
    // Add TON native
    this.assets.set('native', {
      address: 'native',
      symbol: 'TON',
      name: 'Toncoin',
      type: 'native',
      riskRating: 'low',
    });

    // Add common jettons (example addresses)
    this.assets.set('EQC...usdt', {
      address: 'EQC...usdt',
      symbol: 'USDT',
      name: 'Tether USD',
      type: 'jetton',
      riskRating: 'low',
    });
  }

  private initializeDefaultProtocols(): void {
    // Add trusted protocols
    this.protocols.set('ston_fi', {
      id: 'ston_fi',
      name: 'STON.fi',
      address: 'EQC...stonfi',
      type: 'dex',
      riskRating: 'low',
      audited: true,
      auditReports: ['https://ston.fi/audit'],
    });

    this.protocols.set('dedust', {
      id: 'dedust',
      name: 'DeDust',
      address: 'EQC...dedust',
      type: 'dex',
      riskRating: 'low',
      audited: true,
    });
  }

  private evaluateRule(
    rule: ValidationRule,
    strategy: StrategyValidationInput
  ): { matched: boolean; field: string; value: unknown } {
    return this.evaluateCondition(rule.condition, strategy);
  }

  private evaluateCondition(
    condition: RuleCondition,
    data: StrategyValidationInput | Record<string, unknown>
  ): { matched: boolean; field: string; value: unknown } {
    const value = this.getNestedValue(data, condition.field);

    if (value === undefined) {
      return { matched: false, field: condition.field, value: undefined };
    }

    let matched = false;
    switch (condition.operator) {
      case 'eq':
        matched = value === condition.value;
        break;
      case 'ne':
        matched = value !== condition.value;
        break;
      case 'gt':
        matched = typeof value === 'number' && value > (condition.value as number);
        break;
      case 'lt':
        matched = typeof value === 'number' && value < (condition.value as number);
        break;
      case 'gte':
        matched = typeof value === 'number' && value >= (condition.value as number);
        break;
      case 'lte':
        matched = typeof value === 'number' && value <= (condition.value as number);
        break;
      case 'in':
        matched = Array.isArray(condition.value) && condition.value.includes(value);
        break;
      case 'not_in':
        matched = Array.isArray(condition.value) && !condition.value.includes(value);
        break;
      case 'contains':
        matched = typeof value === 'string' && value.includes(condition.value as string);
        break;
      case 'regex':
        matched = typeof value === 'string' && new RegExp(condition.value as string).test(value);
        break;
    }

    // Handle nested conditions
    if (condition.nested && condition.nested.length > 0) {
      const nestedResults = condition.nested.map((c) => this.evaluateCondition(c, data).matched);
      if (condition.logic === 'or') {
        matched = matched || nestedResults.some((r) => r);
      } else {
        matched = matched && nestedResults.every((r) => r);
      }
    }

    return { matched, field: condition.field, value };
  }

  private getNestedValue(obj: StrategyValidationInput | Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as Record<string, unknown>);
  }

  private evaluatePolicyConditions(
    policy: TransactionPolicy,
    transaction: TransactionInput
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];

    for (const condition of policy.conditions) {
      let conditionValue: unknown;

      switch (condition.type) {
        case 'amount':
          conditionValue = transaction.amount;
          break;
        case 'destination':
          conditionValue = transaction.destination;
          break;
        case 'asset':
          conditionValue = transaction.currency;
          break;
        case 'time':
          conditionValue = transaction.timestamp;
          break;
        default:
          conditionValue = transaction.metadata?.[condition.type];
      }

      const matched = this.evaluatePolicyCondition(condition, conditionValue);
      if (matched) {
        matchedConditions.push(`${condition.type} ${condition.operator} ${condition.value}`);
      } else {
        // All conditions must match (AND logic)
        return { matched: false, matchedConditions: [] };
      }
    }

    return { matched: matchedConditions.length > 0, matchedConditions };
  }

  private evaluatePolicyCondition(condition: PolicyCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'gte':
        return typeof value === 'number' && value >= (condition.value as number);
      case 'lte':
        return typeof value === 'number' && value <= (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private calculateValidationScore(violations: RuleViolation[], warnings: RuleWarning[]): number {
    let score = 100;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'high':
          score -= 25;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    score -= warnings.length * 5;

    return Math.max(0, score);
  }

  private calculateTransactionRiskScore(transaction: TransactionInput): number {
    let score = 0;

    // Base risk by transaction type
    const typeRisks: Record<string, number> = {
      transfer: 10,
      swap: 25,
      stake: 15,
      unstake: 20,
      provide_liquidity: 30,
      remove_liquidity: 25,
      other: 35,
    };
    score += typeRisks[transaction.type] || 35;

    // Amount-based risk
    if (transaction.amount > 10000) score += 25;
    else if (transaction.amount > 1000) score += 15;
    else if (transaction.amount > 100) score += 5;

    // Unknown destination risk
    if (transaction.destination && !this.assets.has(transaction.destination)) {
      score += 15;
    }

    // Unknown protocol risk
    if (transaction.protocol && !this.protocols.has(transaction.protocol)) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private emitEvent(event: AISafetyEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGuardrailsManager(config?: Partial<GuardrailsConfig>): DefaultGuardrailsManager {
  return new DefaultGuardrailsManager(config);
}
