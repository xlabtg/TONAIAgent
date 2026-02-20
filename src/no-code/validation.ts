/**
 * TONAIAgent - Strategy Validation System
 *
 * Real-time validation for visual strategies.
 * Checks for logical correctness, risk limits, compliance, and security.
 */

import {
  Strategy,
  Block,
  Connection,
  ValidationResult,
  ValidationError,
  SecurityCheck,
  DataType,
} from './types';
import { BlockRegistry } from './dsl';

// ============================================================================
// Validation Configuration
// ============================================================================

export interface ValidationConfig {
  /** Enable strict mode (treats warnings as errors) */
  strictMode?: boolean;
  /** Maximum allowed risk score (0-100) */
  maxRiskScore?: number;
  /** Token whitelist */
  allowedTokens?: string[];
  /** Protocol whitelist */
  allowedProtocols?: string[];
  /** Maximum gas budget */
  maxGasBudget?: number;
  /** Enable security checks */
  enableSecurityChecks?: boolean;
  /** Custom validation rules */
  customRules?: CustomValidationRule[];
}

export interface CustomValidationRule {
  id: string;
  name: string;
  validate: (strategy: Strategy) => ValidationError | null;
}

const DEFAULT_CONFIG: ValidationConfig = {
  strictMode: false,
  maxRiskScore: 80,
  allowedTokens: ['TON', 'USDT', 'USDC', 'ETH', 'BTC', 'stTON', 'tsTON'],
  allowedProtocols: ['dedust', 'stonfi', 'tonstakers', 'bemo', 'whales', 'evaa'],
  maxGasBudget: 5, // TON
  enableSecurityChecks: true,
  customRules: [],
};

// ============================================================================
// Strategy Validator
// ============================================================================

/**
 * Validates strategies for correctness, safety, and compliance
 */
export class StrategyValidator {
  private readonly config: ValidationConfig;
  private readonly blockRegistry: BlockRegistry;

  constructor(config: Partial<ValidationConfig> = {}, blockRegistry?: BlockRegistry) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.blockRegistry = blockRegistry ?? new BlockRegistry();
  }

  /**
   * Validate a complete strategy
   */
  validate(strategy: Strategy): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Structural validation
    const structuralErrors = this.validateStructure(strategy);
    errors.push(...structuralErrors.filter((e) => e.severity === 'error'));
    warnings.push(...structuralErrors.filter((e) => e.severity === 'warning' || e.severity === 'info'));

    // Connection validation
    const connectionErrors = this.validateConnections(strategy);
    errors.push(...connectionErrors.filter((e) => e.severity === 'error'));
    warnings.push(...connectionErrors.filter((e) => e.severity === 'warning' || e.severity === 'info'));

    // Block validation
    const blockErrors = this.validateBlocks(strategy);
    errors.push(...blockErrors.filter((e) => e.severity === 'error'));
    warnings.push(...blockErrors.filter((e) => e.severity === 'warning' || e.severity === 'info'));

    // Risk validation
    const riskErrors = this.validateRisks(strategy);
    errors.push(...riskErrors.filter((e) => e.severity === 'error'));
    warnings.push(...riskErrors.filter((e) => e.severity === 'warning' || e.severity === 'info'));

    // Compliance validation
    const complianceErrors = this.validateCompliance(strategy);
    errors.push(...complianceErrors.filter((e) => e.severity === 'error'));
    warnings.push(...complianceErrors.filter((e) => e.severity === 'warning' || e.severity === 'info'));

    // Custom rules
    if (this.config.customRules) {
      this.config.customRules.forEach((rule) => {
        const error = rule.validate(strategy);
        if (error) {
          if (error.severity === 'error') {
            errors.push(error);
          } else {
            warnings.push(error);
          }
        }
      });
    }

    // Security checks
    const securityChecks = this.config.enableSecurityChecks
      ? this.runSecurityChecks(strategy)
      : [];

    // Calculate risk score
    const riskScore = this.calculateRiskScore(strategy, errors, warnings);

    // Estimate gas
    const estimatedGas = this.estimateGas(strategy);

    // Determine validity
    const valid = this.config.strictMode
      ? errors.length === 0 && warnings.length === 0
      : errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      riskScore,
      estimatedGas,
      securityChecks,
    };
  }

  /**
   * Validate a single block
   */
  validateBlock(block: Block): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check if block type is registered
    const definition = this.blockRegistry.get(block.name.toLowerCase().replace(/\s+/g, '_'));
    if (!definition && block.name !== 'Comment') {
      // Allow custom blocks, but warn
      errors.push({
        blockId: block.id,
        code: 'invalid_config',
        message: `Unknown block type: ${block.name}`,
        severity: 'info',
      });
    }

    // Validate config
    const configErrors = this.validateBlockConfig(block);
    errors.push(...configErrors);

    return errors;
  }

  /**
   * Validate a single connection
   */
  validateConnection(connection: Connection, strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check source block exists
    const sourceBlock = strategy.blocks.find((b) => b.id === connection.sourceBlockId);
    if (!sourceBlock) {
      errors.push({
        connectionId: connection.id,
        code: 'invalid_connection',
        message: `Source block not found: ${connection.sourceBlockId}`,
        severity: 'error',
      });
      return errors;
    }

    // Check target block exists
    const targetBlock = strategy.blocks.find((b) => b.id === connection.targetBlockId);
    if (!targetBlock) {
      errors.push({
        connectionId: connection.id,
        code: 'invalid_connection',
        message: `Target block not found: ${connection.targetBlockId}`,
        severity: 'error',
      });
      return errors;
    }

    // Check output exists
    const output = sourceBlock.outputs.find((o) => o.id === connection.sourceOutputId);
    if (!output) {
      errors.push({
        connectionId: connection.id,
        code: 'invalid_connection',
        message: `Output not found: ${connection.sourceOutputId} on ${sourceBlock.name}`,
        severity: 'error',
      });
      return errors;
    }

    // Check input exists
    const input = targetBlock.inputs.find((i) => i.id === connection.targetInputId);
    if (!input) {
      errors.push({
        connectionId: connection.id,
        code: 'invalid_connection',
        message: `Input not found: ${connection.targetInputId} on ${targetBlock.name}`,
        severity: 'error',
      });
      return errors;
    }

    // Check type compatibility
    if (!this.areTypesCompatible(output.dataType, input.dataType)) {
      errors.push({
        connectionId: connection.id,
        code: 'type_mismatch',
        message: `Type mismatch: ${output.dataType} -> ${input.dataType}`,
        severity: 'error',
      });
    }

    return errors;
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  private validateStructure(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for at least one trigger
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
    if (triggers.length === 0) {
      errors.push({
        code: 'missing_trigger',
        message: 'Strategy must have at least one trigger block',
        severity: 'error',
      });
    }

    // Check for at least one action
    const actions = strategy.blocks.filter((b) => b.category === 'action');
    if (actions.length === 0) {
      errors.push({
        code: 'missing_required_input',
        message: 'Strategy must have at least one action block',
        severity: 'warning',
      });
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(strategy);
    if (circularDeps.length > 0) {
      errors.push({
        code: 'circular_dependency',
        message: `Circular dependency detected: ${circularDeps.join(' -> ')}`,
        severity: 'error',
      });
    }

    // Check for unreachable blocks
    const unreachable = this.findUnreachableBlocks(strategy);
    unreachable.forEach((blockId) => {
      const block = strategy.blocks.find((b) => b.id === blockId);
      if (block && block.category !== 'utility') {
        errors.push({
          blockId,
          code: 'unreachable_block',
          message: `Block "${block?.name}" is not connected and will not execute`,
          severity: 'warning',
        });
      }
    });

    return errors;
  }

  private validateConnections(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    strategy.connections.forEach((connection) => {
      const connectionErrors = this.validateConnection(connection, strategy);
      errors.push(...connectionErrors);
    });

    // Check for required inputs not connected
    strategy.blocks.forEach((block) => {
      block.inputs
        .filter((input) => input.required)
        .forEach((input) => {
          const hasConnection = strategy.connections.some(
            (c) => c.targetBlockId === block.id && c.targetInputId === input.id
          );

          if (!hasConnection && block.category !== 'trigger') {
            errors.push({
              blockId: block.id,
              field: input.id,
              code: 'missing_required_input',
              message: `Required input "${input.label}" is not connected on "${block.name}"`,
              severity: 'error',
            });
          }
        });
    });

    return errors;
  }

  private validateBlocks(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    strategy.blocks.forEach((block) => {
      const blockErrors = this.validateBlock(block);
      errors.push(...blockErrors);
    });

    return errors;
  }

  private validateBlockConfig(block: Block): ValidationError[] {
    const errors: ValidationError[] = [];
    const config = block.config as Record<string, unknown>;

    // Validate based on block category
    switch (block.category) {
      case 'trigger':
        // Check trigger-specific config
        if (config.scheduleType === 'interval' && !config.interval) {
          errors.push({
            blockId: block.id,
            field: 'interval',
            code: 'missing_required_input',
            message: 'Interval is required for scheduled triggers',
            severity: 'error',
          });
        }
        if (config.token && !this.isValidToken(config.token as string)) {
          errors.push({
            blockId: block.id,
            field: 'token',
            code: 'unsupported_token',
            message: `Token "${config.token}" is not in the whitelist`,
            severity: 'warning',
          });
        }
        break;

      case 'action':
        // Check action-specific config
        if (config.fromToken && !this.isValidToken(config.fromToken as string)) {
          errors.push({
            blockId: block.id,
            field: 'fromToken',
            code: 'unsupported_token',
            message: `Token "${config.fromToken}" is not in the whitelist`,
            severity: 'warning',
          });
        }
        if (config.toToken && !this.isValidToken(config.toToken as string)) {
          errors.push({
            blockId: block.id,
            field: 'toToken',
            code: 'unsupported_token',
            message: `Token "${config.toToken}" is not in the whitelist`,
            severity: 'warning',
          });
        }
        if (config.dex && !this.isValidProtocol(config.dex as string)) {
          errors.push({
            blockId: block.id,
            field: 'dex',
            code: 'unsupported_protocol',
            message: `Protocol "${config.dex}" is not in the whitelist`,
            severity: 'warning',
          });
        }
        if (config.maxSlippage && (config.maxSlippage as number) > 10) {
          errors.push({
            blockId: block.id,
            field: 'maxSlippage',
            code: 'risk_exceeded',
            message: 'Slippage tolerance is very high (>10%)',
            severity: 'warning',
          });
        }
        break;

      case 'risk':
        // Check risk control config
        if (config.value !== undefined && (config.value as number) <= 0) {
          errors.push({
            blockId: block.id,
            field: 'value',
            code: 'invalid_config',
            message: 'Risk limit value must be positive',
            severity: 'error',
          });
        }
        break;

      case 'condition':
        // Check condition config
        if (config.operator && !this.isValidOperator(config.operator as string)) {
          errors.push({
            blockId: block.id,
            field: 'operator',
            code: 'invalid_config',
            message: `Invalid operator: ${config.operator}`,
            severity: 'error',
          });
        }
        break;
    }

    return errors;
  }

  private validateRisks(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];
    const params = strategy.riskParams;

    // Validate risk parameters
    if (params.maxPositionSize > 100) {
      errors.push({
        field: 'maxPositionSize',
        code: 'risk_exceeded',
        message: 'Maximum position size cannot exceed 100%',
        severity: 'error',
      });
    }

    if (params.maxPositionSize > 50) {
      errors.push({
        field: 'maxPositionSize',
        code: 'risk_exceeded',
        message: 'High position concentration (>50%) increases risk',
        severity: 'warning',
      });
    }

    if (params.maxDailyLoss > 20) {
      errors.push({
        field: 'maxDailyLoss',
        code: 'risk_exceeded',
        message: 'Daily loss limit exceeds 20% - very high risk',
        severity: 'warning',
      });
    }

    if (params.maxDrawdown > 50) {
      errors.push({
        field: 'maxDrawdown',
        code: 'risk_exceeded',
        message: 'Maximum drawdown exceeds 50% - extreme risk',
        severity: 'warning',
      });
    }

    if (params.stopLossPercent === 0 && strategy.category === 'trading') {
      errors.push({
        field: 'stopLossPercent',
        code: 'risk_exceeded',
        message: 'No stop loss configured for trading strategy',
        severity: 'warning',
      });
    }

    if (params.maxSlippage > 5) {
      errors.push({
        field: 'maxSlippage',
        code: 'risk_exceeded',
        message: 'High slippage tolerance may result in poor execution',
        severity: 'warning',
      });
    }

    if (params.maxTradesPerDay > 100) {
      errors.push({
        field: 'maxTradesPerDay',
        code: 'risk_exceeded',
        message: 'Very high trade frequency may incur excessive gas costs',
        severity: 'info',
      });
    }

    // Check if risk blocks are present
    const hasRiskBlocks = strategy.blocks.some((b) => b.category === 'risk');
    if (!hasRiskBlocks) {
      errors.push({
        code: 'risk_exceeded',
        message: 'No risk control blocks - consider adding stop loss or position limits',
        severity: 'info',
      });
    }

    return errors;
  }

  private validateCompliance(strategy: Strategy): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check gas budget
    const estimatedGas = this.estimateGas(strategy);
    if (this.config.maxGasBudget && estimatedGas > this.config.maxGasBudget) {
      errors.push({
        code: 'invalid_config',
        message: `Estimated gas (${estimatedGas.toFixed(2)} TON) exceeds budget (${this.config.maxGasBudget} TON)`,
        severity: 'warning',
      });
    }

    // Check allowed tokens
    const usedTokens = this.extractUsedTokens(strategy);
    usedTokens.forEach((token) => {
      if (!this.isValidToken(token)) {
        errors.push({
          code: 'unsupported_token',
          message: `Token "${token}" is not in the allowed list`,
          severity: 'warning',
        });
      }
    });

    // Check allowed protocols
    const usedProtocols = this.extractUsedProtocols(strategy);
    usedProtocols.forEach((protocol) => {
      if (!this.isValidProtocol(protocol)) {
        errors.push({
          code: 'unsupported_protocol',
          message: `Protocol "${protocol}" is not in the allowed list`,
          severity: 'warning',
        });
      }
    });

    return errors;
  }

  private runSecurityChecks(strategy: Strategy): SecurityCheck[] {
    const checks: SecurityCheck[] = [];

    // Check 1: No hardcoded addresses
    const hasHardcodedAddresses = this.checkForHardcodedAddresses(strategy);
    checks.push({
      name: 'No hardcoded addresses',
      passed: !hasHardcodedAddresses,
      message: hasHardcodedAddresses
        ? 'Strategy contains hardcoded addresses - use variables instead'
        : undefined,
    });

    // Check 2: Risk controls present
    const hasRiskControls = strategy.blocks.some((b) => b.category === 'risk');
    checks.push({
      name: 'Risk controls present',
      passed: hasRiskControls,
      message: hasRiskControls
        ? undefined
        : 'Add risk control blocks for safety',
    });

    // Check 3: Reasonable position sizes
    const reasonablePositions = strategy.riskParams.maxPositionSize <= 50;
    checks.push({
      name: 'Reasonable position sizes',
      passed: reasonablePositions,
      message: reasonablePositions
        ? undefined
        : 'Position size exceeds 50% - high concentration risk',
    });

    // Check 4: Stop loss configured
    const hasStopLoss =
      strategy.riskParams.stopLossPercent > 0 ||
      strategy.blocks.some((b) => b.name.toLowerCase().includes('stop loss'));
    checks.push({
      name: 'Stop loss configured',
      passed: hasStopLoss,
      message: hasStopLoss
        ? undefined
        : 'Consider adding a stop loss for protection',
    });

    // Check 5: Notifications enabled
    const hasNotifications = strategy.config?.notifications?.onExecution ||
      strategy.config?.notifications?.onError;
    checks.push({
      name: 'Notifications enabled',
      passed: hasNotifications ?? false,
      message: hasNotifications
        ? undefined
        : 'Enable notifications to stay informed',
    });

    // Check 6: Whitelisted tokens only
    const usedTokens = this.extractUsedTokens(strategy);
    const allTokensWhitelisted = usedTokens.every((t) => this.isValidToken(t));
    checks.push({
      name: 'Whitelisted tokens only',
      passed: allTokensWhitelisted,
      message: allTokensWhitelisted
        ? undefined
        : 'Some tokens are not in the whitelist',
    });

    // Check 7: Whitelisted protocols only
    const usedProtocols = this.extractUsedProtocols(strategy);
    const allProtocolsWhitelisted = usedProtocols.every((p) => this.isValidProtocol(p));
    checks.push({
      name: 'Whitelisted protocols only',
      passed: allProtocolsWhitelisted,
      message: allProtocolsWhitelisted
        ? undefined
        : 'Some protocols are not in the whitelist',
    });

    // Check 8: No infinite loops
    const hasCircular = this.detectCircularDependencies(strategy).length > 0;
    checks.push({
      name: 'No infinite loops',
      passed: !hasCircular,
      message: hasCircular
        ? 'Circular dependencies detected - may cause infinite loops'
        : undefined,
    });

    return checks;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private detectCircularDependencies(strategy: Strategy): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (blockId: string): boolean => {
      visited.add(blockId);
      recursionStack.add(blockId);
      path.push(blockId);

      const outgoing = strategy.connections.filter((c) => c.sourceBlockId === blockId);
      for (const conn of outgoing) {
        if (!visited.has(conn.targetBlockId)) {
          if (dfs(conn.targetBlockId)) {
            return true;
          }
        } else if (recursionStack.has(conn.targetBlockId)) {
          path.push(conn.targetBlockId);
          return true;
        }
      }

      recursionStack.delete(blockId);
      path.pop();
      return false;
    };

    // Start from trigger blocks
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
    for (const trigger of triggers) {
      if (!visited.has(trigger.id)) {
        if (dfs(trigger.id)) {
          return path;
        }
      }
    }

    return [];
  }

  private findUnreachableBlocks(strategy: Strategy): string[] {
    const reachable = new Set<string>();

    // Start from triggers
    const triggers = strategy.blocks.filter((b) => b.category === 'trigger');
    const queue = triggers.map((t) => t.id);

    while (queue.length > 0) {
      const blockId = queue.shift()!;
      if (reachable.has(blockId)) continue;
      reachable.add(blockId);

      // Find all connected blocks
      const outgoing = strategy.connections.filter((c) => c.sourceBlockId === blockId);
      outgoing.forEach((conn) => {
        if (!reachable.has(conn.targetBlockId)) {
          queue.push(conn.targetBlockId);
        }
      });
    }

    // Find unreachable
    return strategy.blocks
      .filter((b) => !reachable.has(b.id) && b.category !== 'trigger')
      .map((b) => b.id);
  }

  private areTypesCompatible(sourceType: DataType, targetType: DataType): boolean {
    if (sourceType === targetType) return true;
    if (targetType === 'any') return true;
    if (sourceType === 'trigger' && targetType === 'boolean') return true;
    return false;
  }

  private isValidToken(token: string): boolean {
    if (!this.config.allowedTokens) return true;
    const normalized = token.toUpperCase();
    return this.config.allowedTokens.some((t) => t.toUpperCase() === normalized);
  }

  private isValidProtocol(protocol: string): boolean {
    if (!this.config.allowedProtocols) return true;
    if (protocol === 'auto') return true;
    const normalized = protocol.toLowerCase();
    return this.config.allowedProtocols.some((p) => p.toLowerCase() === normalized);
  }

  private isValidOperator(operator: string): boolean {
    const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'];
    return validOperators.includes(operator);
  }

  private extractUsedTokens(strategy: Strategy): string[] {
    const tokens = new Set<string>();

    strategy.blocks.forEach((block) => {
      const config = block.config as Record<string, unknown>;
      if (config.token) tokens.add(config.token as string);
      if (config.fromToken) tokens.add(config.fromToken as string);
      if (config.toToken) tokens.add(config.toToken as string);
      if (config.tokenA) tokens.add(config.tokenA as string);
      if (config.tokenB) tokens.add(config.tokenB as string);
    });

    // Also check config whitelist
    if (strategy.config?.tokenWhitelist) {
      strategy.config.tokenWhitelist.forEach((t) => tokens.add(t));
    }

    return Array.from(tokens).filter((t) => t && !t.startsWith('{{'));
  }

  private extractUsedProtocols(strategy: Strategy): string[] {
    const protocols = new Set<string>();

    strategy.blocks.forEach((block) => {
      const config = block.config as Record<string, unknown>;
      if (config.protocol) protocols.add(config.protocol as string);
      if (config.dex) protocols.add(config.dex as string);
    });

    return Array.from(protocols).filter((p) => p && p !== 'auto' && !p.startsWith('{{'));
  }

  private checkForHardcodedAddresses(strategy: Strategy): boolean {
    const addressPattern = /EQ[A-Za-z0-9_-]{46}/;

    for (const block of strategy.blocks) {
      const configStr = JSON.stringify(block.config);
      if (addressPattern.test(configStr)) {
        return true;
      }
    }

    return false;
  }

  private calculateRiskScore(
    strategy: Strategy,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): number {
    let score = 0;

    // Base risk from parameters
    if (strategy.riskParams.maxPositionSize > 30) {
      score += (strategy.riskParams.maxPositionSize - 30) * 1.5;
    }
    if (strategy.riskParams.maxDailyLoss > 5) {
      score += (strategy.riskParams.maxDailyLoss - 5) * 2;
    }
    if (strategy.riskParams.maxDrawdown > 15) {
      score += (strategy.riskParams.maxDrawdown - 15);
    }
    if (strategy.riskParams.stopLossPercent === 0) {
      score += 15;
    }
    if (strategy.riskParams.maxSlippage > 2) {
      score += (strategy.riskParams.maxSlippage - 2) * 5;
    }

    // Risk from category
    switch (strategy.category) {
      case 'arbitrage':
        score += 20;
        break;
      case 'trading':
        score += 10;
        break;
      case 'liquidity_management':
        score += 10;
        break;
      case 'yield_farming':
        score += 5;
        break;
      case 'portfolio_automation':
        score += 0;
        break;
    }

    // Risk from errors/warnings
    const riskErrors = [...errors, ...warnings].filter((e) => e.code === 'risk_exceeded');
    score += riskErrors.length * 5;

    // Cap at 100
    return Math.min(Math.round(score), 100);
  }

  private estimateGas(strategy: Strategy): number {
    let gas = 0;

    strategy.blocks.forEach((block) => {
      switch (block.category) {
        case 'action':
          const actionType = block.name.toLowerCase();
          if (actionType.includes('swap')) {
            gas += 0.15; // Swap gas
          } else if (actionType.includes('stake') || actionType.includes('unstake')) {
            gas += 0.1;
          } else if (actionType.includes('transfer')) {
            gas += 0.05;
          } else if (actionType.includes('liquidity')) {
            gas += 0.2;
          } else if (actionType.includes('rebalance')) {
            gas += 0.3; // Multiple swaps
          } else {
            gas += 0.05;
          }
          break;

        case 'condition':
          gas += 0.01; // Minimal gas for checks
          break;

        case 'risk':
          gas += 0.01;
          break;

        default:
          break;
      }
    });

    return gas;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Quick validation check for a strategy
 */
export function validateStrategy(strategy: Strategy): ValidationResult {
  const validator = new StrategyValidator();
  return validator.validate(strategy);
}

/**
 * Check if a strategy is valid for deployment
 */
export function isDeployable(strategy: Strategy): boolean {
  const result = validateStrategy(strategy);
  return result.valid && result.riskScore < 80;
}

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.valid) {
    parts.push('✅ Strategy is valid');
  } else {
    parts.push('❌ Strategy has errors');
  }

  parts.push(`\nRisk Score: ${result.riskScore}/100`);

  if (result.errors.length > 0) {
    parts.push(`\n\n**Errors (${result.errors.length}):**`);
    result.errors.forEach((e) => {
      parts.push(`- ${e.message}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push(`\n\n**Warnings (${result.warnings.length}):**`);
    result.warnings.forEach((w) => {
      parts.push(`- ${w.message}`);
    });
  }

  const passedChecks = result.securityChecks.filter((c) => c.passed).length;
  parts.push(`\n\n**Security: ${passedChecks}/${result.securityChecks.length} checks passed**`);

  parts.push(`\nEstimated gas: ${result.estimatedGas.toFixed(2)} TON`);

  return parts.join('\n');
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a strategy validator with custom configuration
 */
export function createStrategyValidator(
  config?: Partial<ValidationConfig>,
  blockRegistry?: BlockRegistry
): StrategyValidator {
  return new StrategyValidator(config, blockRegistry);
}
