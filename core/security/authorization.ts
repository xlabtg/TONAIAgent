/**
 * TONAIAgent - Transaction Authorization Engine
 *
 * Implements multi-layer validation pipeline:
 * 1. Intent Validation - AI generates intent
 * 2. Strategy Validation - Validates against strategy rules
 * 3. Risk Engine - Checks limits and risk scores
 * 4. Policy Engine - Enforces permissions
 * 5. Simulation - Pre-execution simulation
 * 6. Signing Service - Final execution
 *
 * SECURITY: AI never has direct access to signing.
 */

import {
  TransactionRequest,
  AuthorizationContext,
  AuthorizationResult,
  AuthorizationDecision,
  AuthorizationLayer,
  AuthorizationLayerResult,
  RequiredAction,
  RiskLevel,
  AgentPermissions,
  UserLimits,
  SessionContext,
  RiskContext,
  BehavioralRiskScore,
  SecurityEvent,
  SecurityEventCallback,
  AuthorizationConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AuthorizationEngine {
  // Main authorization flow
  authorize(
    request: TransactionRequest,
    context: Partial<AuthorizationContext>
  ): Promise<AuthorizationResult>;

  // Individual layer checks (for granular control)
  validateIntent(request: TransactionRequest): Promise<AuthorizationLayerResult>;
  validateStrategy(request: TransactionRequest): Promise<AuthorizationLayerResult>;
  checkRisk(request: TransactionRequest, context: RiskContext): Promise<AuthorizationLayerResult>;
  checkPolicy(
    request: TransactionRequest,
    permissions: AgentPermissions
  ): Promise<AuthorizationLayerResult>;
  checkLimits(request: TransactionRequest, limits: UserLimits): Promise<AuthorizationLayerResult>;
  checkRateLimit(session: SessionContext): Promise<AuthorizationLayerResult>;
  simulate(request: TransactionRequest): Promise<AuthorizationLayerResult>;

  // Configuration
  setConfig(config: Partial<AuthorizationConfig>): void;
  getConfig(): AuthorizationConfig;

  // Events
  onEvent(callback: SecurityEventCallback): void;
}

export interface IntentValidator {
  validate(request: TransactionRequest): Promise<IntentValidationResult>;
}

export interface IntentValidationResult {
  valid: boolean;
  intentType: string;
  confidence: number;
  extractedParams: Record<string, unknown>;
  warnings: string[];
  errors: string[];
}

export interface StrategyValidator {
  validate(request: TransactionRequest, strategyId?: string): Promise<StrategyValidationResult>;
}

export interface StrategyValidationResult {
  valid: boolean;
  matchesStrategy: boolean;
  strategyId?: string;
  violations: string[];
  suggestions: string[];
}

export interface TransactionSimulator {
  simulate(request: TransactionRequest): Promise<SimulationResult>;
}

export interface SimulationResult {
  success: boolean;
  gasEstimate: number;
  gasCostTon: number;
  expectedOutcome: {
    balanceChanges: Array<{
      token: string;
      amount: string;
      direction: 'in' | 'out';
    }>;
    stateChanges: Record<string, unknown>;
  };
  risks: string[];
  errors: string[];
  executionTimeMs: number;
}

// ============================================================================
// Intent Validator
// ============================================================================

export class DefaultIntentValidator implements IntentValidator {
  async validate(request: TransactionRequest): Promise<IntentValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const extractedParams: Record<string, unknown> = {};

    // Validate transaction has required fields
    if (!request.type) {
      errors.push('Transaction type is required');
    }

    if (!request.source) {
      errors.push('Source wallet is required');
    }

    // Validate destination for transfers
    if (request.type === 'transfer' && !request.destination) {
      errors.push('Destination is required for transfers');
    }

    // Validate amount
    if (request.amount) {
      extractedParams.token = request.amount.token;
      extractedParams.amount = request.amount.amount;
      extractedParams.valueTon = request.amount.valueTon;

      if (parseFloat(request.amount.amount) <= 0) {
        errors.push('Amount must be positive');
      }
    }

    // Check for suspicious patterns
    if (request.destination?.isNew && request.amount?.valueTon && request.amount.valueTon > 100) {
      warnings.push('Large transfer to new destination');
    }

    // Determine intent type confidence
    const intentType = request.type;
    const confidence = this.calculateConfidence(request, errors.length);

    return {
      valid: errors.length === 0,
      intentType,
      confidence,
      extractedParams,
      warnings,
      errors,
    };
  }

  private calculateConfidence(request: TransactionRequest, errorCount: number): number {
    let confidence = 1.0;

    // Reduce confidence based on errors
    confidence -= errorCount * 0.2;

    // Reduce confidence for complex operations
    if (request.type === 'contract_call') {
      confidence -= 0.1;
    }

    // Reduce confidence for missing metadata
    if (!request.metadata?.protocol) {
      confidence -= 0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

// ============================================================================
// Strategy Validator
// ============================================================================

export class DefaultStrategyValidator implements StrategyValidator {
  private readonly strategies = new Map<string, StrategyDefinition>();

  registerStrategy(strategy: StrategyDefinition): void {
    this.strategies.set(strategy.id, strategy);
  }

  async validate(
    request: TransactionRequest,
    strategyId?: string
  ): Promise<StrategyValidationResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // If no strategy specified, allow but suggest adding one
    if (!strategyId) {
      return {
        valid: true,
        matchesStrategy: false,
        violations: [],
        suggestions: ['Consider assigning this agent to a strategy for better risk management'],
      };
    }

    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return {
        valid: true,
        matchesStrategy: false,
        strategyId,
        violations: [],
        suggestions: [`Strategy ${strategyId} not found`],
      };
    }

    // Check if operation matches strategy allowed operations
    if (!strategy.allowedOperations.includes(request.type)) {
      violations.push(`Operation ${request.type} is not allowed by strategy ${strategy.name}`);
    }

    // Check token restrictions
    if (
      request.amount &&
      strategy.allowedTokens.length > 0 &&
      !strategy.allowedTokens.includes(request.amount.symbol)
    ) {
      violations.push(`Token ${request.amount.symbol} is not allowed by strategy ${strategy.name}`);
    }

    // Check amount limits
    if (request.amount?.valueTon && request.amount.valueTon > strategy.maxAmountPerTrade) {
      violations.push(
        `Amount ${request.amount.valueTon} TON exceeds strategy limit of ${strategy.maxAmountPerTrade} TON`
      );
    }

    return {
      valid: violations.length === 0,
      matchesStrategy: violations.length === 0,
      strategyId,
      violations,
      suggestions,
    };
  }
}

export interface StrategyDefinition {
  id: string;
  name: string;
  allowedOperations: string[];
  allowedTokens: string[];
  allowedProtocols: string[];
  maxAmountPerTrade: number;
  maxDailyVolume: number;
  riskLevel: RiskLevel;
}

// ============================================================================
// Transaction Simulator
// ============================================================================

export class DefaultTransactionSimulator implements TransactionSimulator {
  async simulate(request: TransactionRequest): Promise<SimulationResult> {
    const startTime = Date.now();
    const risks: string[] = [];
    const errors: string[] = [];

    // Estimate gas based on operation type
    const gasEstimate = this.estimateGas(request.type);
    const gasCostTon = gasEstimate * 0.000001; // Simplified gas cost

    // Simulate balance changes
    const balanceChanges: SimulationResult['expectedOutcome']['balanceChanges'] = [];

    if (request.amount) {
      balanceChanges.push({
        token: request.amount.symbol,
        amount: request.amount.amount,
        direction: 'out',
      });

      // Simulate swap output
      if (request.type === 'swap' && request.metadata?.protocol) {
        balanceChanges.push({
          token: 'OUTPUT_TOKEN',
          amount: this.estimateSwapOutput(request.amount.amount),
          direction: 'in',
        });
      }
    }

    // Check for risks
    if (request.amount?.valueTon && request.amount.valueTon > 1000) {
      risks.push('Large transaction may have significant price impact');
    }

    if (request.destination?.isNew) {
      risks.push('Sending to a new destination');
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: errors.length === 0,
      gasEstimate,
      gasCostTon,
      expectedOutcome: {
        balanceChanges,
        stateChanges: {},
      },
      risks,
      errors,
      executionTimeMs,
    };
  }

  private estimateGas(type: string): number {
    const gasEstimates: Record<string, number> = {
      transfer: 30000,
      swap: 100000,
      stake: 80000,
      unstake: 80000,
      provide_liquidity: 150000,
      remove_liquidity: 150000,
      contract_call: 200000,
      default: 50000,
    };

    return gasEstimates[type] ?? gasEstimates.default;
  }

  private estimateSwapOutput(inputAmount: string): string {
    // Simplified swap output estimation
    const input = parseFloat(inputAmount);
    return (input * 0.997).toFixed(6); // 0.3% slippage estimate
  }
}

// ============================================================================
// Authorization Layer Implementations
// ============================================================================

class IntentValidationLayer {
  private readonly validator: IntentValidator;

  constructor() {
    this.validator = new DefaultIntentValidator();
  }

  async check(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const result = await this.validator.validate(request);

    return {
      layer: 'intent_validation',
      passed: result.valid,
      decision: result.valid ? 'approved' : 'rejected',
      reason: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      latencyMs: Date.now() - startTime,
      metadata: {
        intentType: result.intentType,
        confidence: result.confidence,
        warnings: result.warnings,
      },
    };
  }
}

class StrategyValidationLayer {
  private readonly validator: DefaultStrategyValidator;

  constructor() {
    this.validator = new DefaultStrategyValidator();
  }

  async check(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const strategyId = request.metadata?.strategyId as string | undefined;
    const result = await this.validator.validate(request, strategyId);

    return {
      layer: 'strategy_validation',
      passed: result.valid,
      decision: result.valid ? 'approved' : 'rejected',
      reason: result.violations.length > 0 ? result.violations.join('; ') : undefined,
      latencyMs: Date.now() - startTime,
      metadata: {
        strategyId: result.strategyId,
        matchesStrategy: result.matchesStrategy,
        suggestions: result.suggestions,
      },
    };
  }

  registerStrategy(strategy: StrategyDefinition): void {
    this.validator.registerStrategy(strategy);
  }
}

class RiskEngineLayer {
  async check(
    _request: TransactionRequest,
    context: RiskContext
  ): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();

    // Evaluate overall risk
    const overallRisk = context.overallRisk;
    let decision: AuthorizationDecision = 'approved';
    let reason: string | undefined;

    if (overallRisk === 'critical') {
      decision = 'rejected';
      reason = 'Risk level is critical';
    } else if (overallRisk === 'high') {
      decision = 'pending_review';
      reason = 'High risk transaction requires review';
    } else if (overallRisk === 'medium') {
      decision = 'approved_with_confirmation';
      reason = 'Medium risk - user confirmation recommended';
    }

    return {
      layer: 'risk_engine',
      passed: decision !== 'rejected',
      decision,
      reason,
      latencyMs: Date.now() - startTime,
      metadata: {
        transactionRiskScore: context.transactionRisk.score,
        behavioralRiskScore: context.behavioralRisk.score,
        marketRiskScore: context.marketRisk.score,
        flags: context.transactionRisk.flags,
      },
    };
  }
}

class PolicyEngineLayer {
  async check(
    request: TransactionRequest,
    permissions: AgentPermissions
  ): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const violations: string[] = [];

    // Check trading capability
    if (request.type === 'swap') {
      if (!permissions.capabilities.trading.enabled) {
        violations.push('Trading is not enabled for this agent');
      } else if (
        !permissions.capabilities.trading.allowedOperations.includes('swap')
      ) {
        violations.push('Swap operation is not allowed');
      }
    }

    // Check transfer capability
    if (request.type === 'transfer') {
      if (!permissions.capabilities.transfers.enabled) {
        violations.push('Transfers are not enabled for this agent');
      }

      if (
        permissions.capabilities.transfers.whitelistOnly &&
        request.destination &&
        !permissions.capabilities.transfers.allowedDestinations.includes(
          request.destination.address
        )
      ) {
        violations.push('Destination is not in whitelist');
      }

      if (
        request.amount?.valueTon &&
        request.amount.valueTon > permissions.capabilities.transfers.maxSingleTransfer
      ) {
        violations.push(
          `Transfer amount exceeds limit of ${permissions.capabilities.transfers.maxSingleTransfer} TON`
        );
      }
    }

    // Check token access
    if (request.amount) {
      const tokenAccess = permissions.accessControl.allowedTokens.find(
        (t) => t.symbol === request.amount!.symbol || t.symbol === '*'
      );

      if (!tokenAccess) {
        violations.push(`Token ${request.amount.symbol} is not allowed`);
      } else if (
        tokenAccess.maxAmount &&
        parseFloat(request.amount.amount) > tokenAccess.maxAmount
      ) {
        violations.push(
          `Token amount exceeds limit of ${tokenAccess.maxAmount}`
        );
      }
    }

    // Check protocol access
    if (request.metadata?.protocol) {
      const protocol = request.metadata.protocol as string;
      const protocolAccess = permissions.accessControl.allowedProtocols.find(
        (p) => p.name === protocol || p.name === '*'
      );

      if (!protocolAccess) {
        violations.push(`Protocol ${protocol} is not allowed`);
      }
    }

    return {
      layer: 'policy_engine',
      passed: violations.length === 0,
      decision: violations.length === 0 ? 'approved' : 'rejected',
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      latencyMs: Date.now() - startTime,
      metadata: {
        violations,
        agentId: permissions.agentId,
      },
    };
  }
}

class LimitCheckLayer {
  async check(
    request: TransactionRequest,
    limits: UserLimits
  ): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const violations: string[] = [];
    const valueTon = request.amount?.valueTon ?? 0;

    // Check single transaction limit
    if (valueTon > limits.singleTransactionLimit) {
      violations.push(
        `Amount ${valueTon} TON exceeds single transaction limit of ${limits.singleTransactionLimit} TON`
      );
    }

    // Check daily limit
    if (limits.usedToday + valueTon > limits.dailyTransactionLimit) {
      violations.push(
        `Transaction would exceed daily limit of ${limits.dailyTransactionLimit} TON (used: ${limits.usedToday} TON)`
      );
    }

    // Check weekly limit
    if (limits.usedThisWeek + valueTon > limits.weeklyTransactionLimit) {
      violations.push(
        `Transaction would exceed weekly limit of ${limits.weeklyTransactionLimit} TON`
      );
    }

    // Check monthly limit
    if (limits.usedThisMonth + valueTon > limits.monthlyTransactionLimit) {
      violations.push(
        `Transaction would exceed monthly limit of ${limits.monthlyTransactionLimit} TON`
      );
    }

    // Check if confirmation is required
    const requiresConfirmation = valueTon > limits.largeTransactionThreshold;

    return {
      layer: 'limit_check',
      passed: violations.length === 0,
      decision:
        violations.length === 0
          ? requiresConfirmation
            ? 'approved_with_confirmation'
            : 'approved'
          : 'rejected',
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      latencyMs: Date.now() - startTime,
      metadata: {
        valueTon,
        usedToday: limits.usedToday,
        dailyLimit: limits.dailyTransactionLimit,
        requiresConfirmation,
      },
    };
  }
}

class RateLimitLayer {
  private readonly transactionCounts = new Map<string, number[]>();

  async check(session: SessionContext): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const now = Date.now();
    const sessionKey = `${session.userId}_${session.agentId}`;

    // Get recent transaction timestamps
    const timestamps = this.transactionCounts.get(sessionKey) ?? [];

    // Remove old timestamps (older than 1 minute)
    const recentTimestamps = timestamps.filter((t) => now - t < 60 * 1000);

    // Check rate limit (max 10 transactions per minute)
    const maxPerMinute = 10;
    const passed = recentTimestamps.length < maxPerMinute;

    // Add current timestamp
    if (passed) {
      recentTimestamps.push(now);
      this.transactionCounts.set(sessionKey, recentTimestamps);
    }

    return {
      layer: 'rate_limit',
      passed,
      decision: passed ? 'approved' : 'rejected',
      reason: passed
        ? undefined
        : `Rate limit exceeded: ${recentTimestamps.length} transactions in the last minute`,
      latencyMs: Date.now() - startTime,
      metadata: {
        transactionsInLastMinute: recentTimestamps.length,
        limit: maxPerMinute,
      },
    };
  }
}

class AnomalyDetectionLayer {
  async check(
    _request: TransactionRequest,
    behavioralRisk: BehavioralRiskScore
  ): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();

    let decision: AuthorizationDecision = 'approved';
    let reason: string | undefined;

    if (behavioralRisk.anomalyScore > 0.8) {
      decision = 'rejected';
      reason = 'High anomaly score detected';
    } else if (behavioralRisk.anomalyScore > 0.6) {
      decision = 'pending_review';
      reason = 'Moderate anomaly detected - requires review';
    } else if (behavioralRisk.deviationFromNormal > 3) {
      decision = 'approved_with_confirmation';
      reason = 'Activity deviates significantly from normal pattern';
    }

    return {
      layer: 'anomaly_detection',
      passed: decision !== 'rejected',
      decision,
      reason,
      latencyMs: Date.now() - startTime,
      metadata: {
        anomalyScore: behavioralRisk.anomalyScore,
        deviationFromNormal: behavioralRisk.deviationFromNormal,
      },
    };
  }
}

class SimulationLayer {
  private readonly simulator: TransactionSimulator;

  constructor() {
    this.simulator = new DefaultTransactionSimulator();
  }

  async check(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    const startTime = Date.now();
    const result = await this.simulator.simulate(request);

    return {
      layer: 'simulation',
      passed: result.success,
      decision: result.success ? 'approved' : 'rejected',
      reason: result.errors.length > 0 ? result.errors.join('; ') : undefined,
      latencyMs: Date.now() - startTime,
      metadata: {
        gasEstimate: result.gasEstimate,
        gasCostTon: result.gasCostTon,
        balanceChanges: result.expectedOutcome.balanceChanges,
        risks: result.risks,
        executionTimeMs: result.executionTimeMs,
      },
    };
  }
}

// ============================================================================
// Main Authorization Engine
// ============================================================================

export class TransactionAuthorizationEngine implements AuthorizationEngine {
  private config: AuthorizationConfig;
  private readonly intentLayer: IntentValidationLayer;
  private readonly strategyLayer: StrategyValidationLayer;
  private readonly riskLayer: RiskEngineLayer;
  private readonly policyLayer: PolicyEngineLayer;
  private readonly limitLayer: LimitCheckLayer;
  private readonly rateLimitLayer: RateLimitLayer;
  private readonly anomalyLayer: AnomalyDetectionLayer;
  private readonly simulationLayer: SimulationLayer;
  private readonly eventCallbacks: SecurityEventCallback[] = [];

  constructor(config?: Partial<AuthorizationConfig>) {
    this.config = {
      enabledLayers: config?.enabledLayers ?? [
        'intent_validation',
        'strategy_validation',
        'risk_engine',
        'policy_engine',
        'limit_check',
        'rate_limit',
        'anomaly_detection',
        'simulation',
      ],
      simulationRequired: config?.simulationRequired ?? true,
      maxLatencyMs: config?.maxLatencyMs ?? 5000,
      cacheDecisionSeconds: config?.cacheDecisionSeconds ?? 60,
      requireMultiSigAbove: config?.requireMultiSigAbove ?? 10000,
    };

    this.intentLayer = new IntentValidationLayer();
    this.strategyLayer = new StrategyValidationLayer();
    this.riskLayer = new RiskEngineLayer();
    this.policyLayer = new PolicyEngineLayer();
    this.limitLayer = new LimitCheckLayer();
    this.rateLimitLayer = new RateLimitLayer();
    this.anomalyLayer = new AnomalyDetectionLayer();
    this.simulationLayer = new SimulationLayer();
  }

  /**
   * Main authorization flow - runs all enabled layers
   */
  async authorize(
    request: TransactionRequest,
    context: Partial<AuthorizationContext>
  ): Promise<AuthorizationResult> {
    const startTime = Date.now();
    const resultId = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const checkedLayers: AuthorizationLayerResult[] = [];
    const requiredActions: RequiredAction[] = [];

    // Build full context with defaults
    const fullContext = this.buildFullContext(request, context);

    // Run each enabled layer
    for (const layer of this.config.enabledLayers) {
      const layerResult = await this.runLayer(layer, request, fullContext);
      checkedLayers.push(layerResult);

      // If layer rejects, stop processing
      if (layerResult.decision === 'rejected') {
        return this.buildResult(
          resultId,
          request.id,
          'rejected',
          checkedLayers,
          fullContext.riskContext.overallRisk,
          requiredActions,
          startTime
        );
      }

      // Collect required actions
      if (layerResult.decision === 'approved_with_confirmation') {
        requiredActions.push({
          type: 'user_confirmation',
          priority: 'normal',
          description: layerResult.reason ?? 'User confirmation required',
        });
      } else if (layerResult.decision === 'pending_review') {
        requiredActions.push({
          type: 'manual_review',
          priority: 'immediate',
          description: layerResult.reason ?? 'Manual review required',
        });
      } else if (layerResult.decision === 'pending_multisig') {
        requiredActions.push({
          type: 'multi_sig',
          priority: 'immediate',
          description: 'Multi-signature required',
        });
      }

      // Check timeout
      if (Date.now() - startTime > this.config.maxLatencyMs) {
        return this.buildResult(
          resultId,
          request.id,
          'rejected',
          checkedLayers,
          'high',
          [],
          startTime,
          { timeout: true }
        );
      }
    }

    // Check if multi-sig is required
    const valueTon = request.amount?.valueTon ?? 0;
    if (valueTon > this.config.requireMultiSigAbove) {
      requiredActions.push({
        type: 'multi_sig',
        priority: 'immediate',
        description: `Transaction value ${valueTon} TON requires multi-signature`,
      });
    }

    // Determine final decision
    let finalDecision: AuthorizationDecision = 'approved';
    if (requiredActions.some((a) => a.type === 'multi_sig')) {
      finalDecision = 'pending_multisig';
    } else if (requiredActions.some((a) => a.type === 'manual_review')) {
      finalDecision = 'pending_review';
    } else if (requiredActions.some((a) => a.type === 'user_confirmation')) {
      finalDecision = 'approved_with_confirmation';
    }

    const result = this.buildResult(
      resultId,
      request.id,
      finalDecision,
      checkedLayers,
      fullContext.riskContext.overallRisk,
      requiredActions,
      startTime
    );

    // Emit event - at this point we're approved (possibly with conditions)
    // Rejections are returned earlier in the flow
    this.emitEvent({
      id: `evt_${Date.now()}`,
      timestamp: new Date(),
      type: 'transaction_authorized',
      severity: 'low',
      source: 'authorization',
      message: `Transaction ${request.id} ${finalDecision}`,
      data: {
        transactionId: request.id,
        decision: finalDecision,
        layersChecked: checkedLayers.length,
        requiredActions: requiredActions.length,
      },
    });

    return result;
  }

  async validateIntent(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    return this.intentLayer.check(request);
  }

  async validateStrategy(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    return this.strategyLayer.check(request);
  }

  async checkRisk(
    request: TransactionRequest,
    context: RiskContext
  ): Promise<AuthorizationLayerResult> {
    return this.riskLayer.check(request, context);
  }

  async checkPolicy(
    request: TransactionRequest,
    permissions: AgentPermissions
  ): Promise<AuthorizationLayerResult> {
    return this.policyLayer.check(request, permissions);
  }

  async checkLimits(
    request: TransactionRequest,
    limits: UserLimits
  ): Promise<AuthorizationLayerResult> {
    return this.limitLayer.check(request, limits);
  }

  async checkRateLimit(session: SessionContext): Promise<AuthorizationLayerResult> {
    return this.rateLimitLayer.check(session);
  }

  async simulate(request: TransactionRequest): Promise<AuthorizationLayerResult> {
    return this.simulationLayer.check(request);
  }

  setConfig(config: Partial<AuthorizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AuthorizationConfig {
    return { ...this.config };
  }

  onEvent(callback: SecurityEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  registerStrategy(strategy: StrategyDefinition): void {
    this.strategyLayer.registerStrategy(strategy);
  }

  private async runLayer(
    layer: AuthorizationLayer,
    request: TransactionRequest,
    context: AuthorizationContext
  ): Promise<AuthorizationLayerResult> {
    switch (layer) {
      case 'intent_validation':
        return this.intentLayer.check(request);
      case 'strategy_validation':
        return this.strategyLayer.check(request);
      case 'risk_engine':
        return this.riskLayer.check(request, context.riskContext);
      case 'policy_engine':
        return this.policyLayer.check(request, context.agentPermissions);
      case 'limit_check':
        return this.limitLayer.check(request, context.userLimits);
      case 'rate_limit':
        return this.rateLimitLayer.check(context.sessionContext);
      case 'anomaly_detection':
        return this.anomalyLayer.check(request, context.riskContext.behavioralRisk);
      case 'simulation':
        return this.simulationLayer.check(request);
      default:
        return {
          layer,
          passed: true,
          decision: 'approved',
          latencyMs: 0,
        };
    }
  }

  private buildFullContext(
    request: TransactionRequest,
    context: Partial<AuthorizationContext>
  ): AuthorizationContext {
    return {
      transactionRequest: request,
      agentPermissions: context.agentPermissions ?? this.getDefaultPermissions(request.agentId),
      userLimits: context.userLimits ?? this.getDefaultLimits(request.userId),
      sessionContext: context.sessionContext ?? this.getDefaultSession(request),
      riskContext: context.riskContext ?? this.getDefaultRiskContext(),
    };
  }

  private getDefaultPermissions(agentId: string): AgentPermissions {
    return {
      agentId,
      userId: '',
      capabilities: {
        trading: {
          enabled: true,
          allowedOperations: ['swap'],
          maxSlippagePercent: 0.5,
          allowedProtocols: ['dedust', 'stonfi'],
        },
        transfers: {
          enabled: true,
          whitelistOnly: false,
          allowedDestinations: [],
          maxSingleTransfer: 100,
        },
        staking: {
          enabled: true,
          allowedValidators: [],
          maxStakePercent: 50,
          allowUnstake: true,
        },
        nft: {
          enabled: false,
          allowedOperations: [],
          allowedCollections: [],
        },
        governance: {
          enabled: false,
          allowedOperations: [],
          allowedDaos: [],
        },
      },
      accessControl: {
        allowedTokens: [{ symbol: 'TON', maxAmount: 1000 }, { symbol: 'USDT', maxAmount: 5000 }],
        allowedProtocols: [
          { name: 'dedust', allowedOperations: ['swap'], riskTier: 'low' },
          { name: 'stonfi', allowedOperations: ['swap'], riskTier: 'low' },
        ],
        timeRestrictions: { tradingHours: '00:00-23:59' },
      },
      sessionLimits: {
        maxTradesPerSession: 50,
        sessionTimeoutMinutes: 60,
        maxConcurrentSessions: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
  }

  private getDefaultLimits(userId: string): UserLimits {
    return {
      userId,
      dailyTransactionLimit: 1000,
      weeklyTransactionLimit: 5000,
      monthlyTransactionLimit: 20000,
      singleTransactionLimit: 500,
      largeTransactionThreshold: 100,
      usedToday: 0,
      usedThisWeek: 0,
      usedThisMonth: 0,
      lastReset: new Date(),
    };
  }

  private getDefaultSession(request: TransactionRequest): SessionContext {
    return {
      sessionId: request.metadata?.sessionId as string ?? `session_${Date.now()}`,
      userId: request.userId,
      agentId: request.agentId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      transactionCount: 0,
      totalVolume: 0,
      authenticated: true,
      authenticationMethod: 'telegram',
    };
  }

  private getDefaultRiskContext(): RiskContext {
    return {
      transactionRisk: {
        score: 0.2,
        factors: [],
        flags: [],
      },
      behavioralRisk: {
        score: 0.1,
        anomalyScore: 0.1,
        deviationFromNormal: 0.5,
        recentActivityScore: 0.3,
      },
      marketRisk: {
        score: 0.3,
        volatilityScore: 0.2,
        liquidityScore: 0.1,
        priceImpactEstimate: 0.001,
      },
      overallRisk: 'low',
      recommendations: [],
    };
  }

  private buildResult(
    id: string,
    transactionId: string,
    decision: AuthorizationDecision,
    checkedLayers: AuthorizationLayerResult[],
    overallRisk: RiskLevel,
    requiredActions: RequiredAction[],
    startTime: number,
    additionalMetadata?: Record<string, unknown>
  ): AuthorizationResult {
    return {
      id,
      transactionId,
      decision,
      checkedLayers,
      overallRisk,
      requiredActions,
      validUntil: new Date(Date.now() + this.config.cacheDecisionSeconds * 1000),
      metadata: {
        totalLatencyMs: Date.now() - startTime,
        layersChecked: checkedLayers.length,
        ...additionalMetadata,
      },
    };
  }

  private emitEvent(event: SecurityEvent): void {
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

export function createAuthorizationEngine(
  config?: Partial<AuthorizationConfig>
): TransactionAuthorizationEngine {
  return new TransactionAuthorizationEngine(config);
}
