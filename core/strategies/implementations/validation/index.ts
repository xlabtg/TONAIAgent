/**
 * TONAIAgent - Strategy Validation Layer
 *
 * Validates strategy packages before publishing to the marketplace.
 * Ensures strategies meet all required criteria for configuration,
 * supported assets, valid parameters, and runtime compatibility.
 *
 * Implements Issue #217: Strategy Publishing System
 */

import type {
  StrategyPackage,
  StrategyParameter,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  StrategyRiskLevel,
  StrategyPublishCategory,
} from '../publishing/types';

// ============================================================================
// Constants
// ============================================================================

/** Valid risk levels */
const VALID_RISK_LEVELS: StrategyRiskLevel[] = ['low', 'medium', 'high'];

/** Valid strategy categories */
const VALID_CATEGORIES: StrategyPublishCategory[] = [
  'momentum',
  'mean_reversion',
  'arbitrage',
  'grid_trading',
  'yield_farming',
  'trend_following',
  'dca',
  'scalping',
  'swing_trading',
  'experimental',
];

/** Supported asset pairs */
const SUPPORTED_PAIRS = [
  'TON/USDT',
  'TON/USDC',
  'BTC/USDT',
  'ETH/USDT',
  'ETH/BTC',
  'SOL/USDT',
  'MATIC/USDT',
  'AVAX/USDT',
  'DOT/USDT',
  'LINK/USDT',
  'UNI/USDT',
  'AAVE/USDT',
  'ATOM/USDT',
  'NEAR/USDT',
  'APT/USDT',
];

/** Minimum and maximum values */
const LIMITS = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MIN_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 1000,
  VERSION_REGEX: /^\d+\.\d+(\.\d+)?$/,
  MIN_CAPITAL: 1,
  MAX_CAPITAL: 1_000_000,
  MIN_INTERVAL: 1,
  MAX_INTERVAL: 86400, // 24 hours
  MAX_PARAMETERS: 20,
  MAX_TAGS: 10,
  TAG_MAX_LENGTH: 30,
  MAX_PAIRS: 20,
};

// ============================================================================
// Validator Interface
// ============================================================================

/**
 * Strategy Validator interface
 */
export interface StrategyValidator {
  /** Validate a strategy package */
  validate(pkg: StrategyPackage): ValidationResult;
  /** Validate a strategy update */
  validateUpdate(strategyId: string, update: Partial<StrategyPackage>): ValidationResult;
  /** Check if a trading pair is supported */
  isPairSupported(pair: string): boolean;
  /** Get list of supported pairs */
  getSupportedPairs(): string[];
}

// ============================================================================
// Default Strategy Validator
// ============================================================================

/**
 * Default implementation of strategy validation
 */
export class DefaultStrategyValidator implements StrategyValidator {
  private readonly supportedPairs: Set<string>;
  private readonly validRiskLevels: Set<string>;
  private readonly validCategories: Set<string>;

  constructor() {
    this.supportedPairs = new Set(SUPPORTED_PAIRS);
    this.validRiskLevels = new Set(VALID_RISK_LEVELS);
    this.validCategories = new Set(VALID_CATEGORIES);
  }

  /**
   * Validate a strategy package for publishing
   */
  validate(pkg: StrategyPackage): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validations
    this.validateName(pkg.name, errors);
    this.validateDescription(pkg.description, errors);
    this.validateVersion(pkg.version, errors);
    this.validateAuthor(pkg.author, errors);
    this.validateRiskLevel(pkg.risk_level, errors);
    this.validateCategory(pkg.category, errors);
    this.validateSupportedPairs(pkg.supported_pairs, errors, warnings);

    // Optional field validations
    if (pkg.recommended_capital !== undefined) {
      this.validateCapital(pkg.recommended_capital, errors, warnings);
    }

    if (pkg.execution_interval !== undefined) {
      this.validateInterval(pkg.execution_interval, errors, warnings);
    }

    if (pkg.parameters) {
      this.validateParameters(pkg.parameters, errors, warnings);
    }

    if (pkg.tags) {
      this.validateTags(pkg.tags, errors, warnings);
    }

    // Add warnings for missing recommended fields
    if (!pkg.recommended_capital) {
      warnings.push({
        code: 'MISSING_RECOMMENDED_CAPITAL',
        message: 'Recommended capital not specified. Users may not know how much to allocate.',
        field: 'recommended_capital',
      });
    }

    if (!pkg.execution_interval) {
      warnings.push({
        code: 'MISSING_EXECUTION_INTERVAL',
        message: 'Execution interval not specified. Default interval will be used.',
        field: 'execution_interval',
      });
    }

    if (!pkg.tags || pkg.tags.length === 0) {
      warnings.push({
        code: 'NO_TAGS',
        message: 'No tags specified. Tags help users discover your strategy.',
        field: 'tags',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a strategy update
   */
  validateUpdate(strategyId: string, update: Partial<StrategyPackage>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!strategyId) {
      errors.push({
        code: 'MISSING_STRATEGY_ID',
        message: 'Strategy ID is required for updates',
      });
    }

    // Version must be provided for updates
    if (!update.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'New version is required for updates',
        field: 'version',
      });
    } else {
      this.validateVersion(update.version, errors);
    }

    // Validate optional update fields if provided
    if (update.name !== undefined) {
      this.validateName(update.name, errors);
    }

    if (update.description !== undefined) {
      this.validateDescription(update.description, errors);
    }

    if (update.risk_level !== undefined) {
      this.validateRiskLevel(update.risk_level, errors);
    }

    if (update.category !== undefined) {
      this.validateCategory(update.category, errors);
    }

    if (update.supported_pairs !== undefined) {
      this.validateSupportedPairs(update.supported_pairs, errors, warnings);
    }

    if (update.recommended_capital !== undefined) {
      this.validateCapital(update.recommended_capital, errors, warnings);
    }

    if (update.execution_interval !== undefined) {
      this.validateInterval(update.execution_interval, errors, warnings);
    }

    if (update.parameters !== undefined) {
      this.validateParameters(update.parameters, errors, warnings);
    }

    if (update.tags !== undefined) {
      this.validateTags(update.tags, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a trading pair is supported
   */
  isPairSupported(pair: string): boolean {
    return this.supportedPairs.has(pair.toUpperCase());
  }

  /**
   * Get list of supported trading pairs
   */
  getSupportedPairs(): string[] {
    return Array.from(this.supportedPairs);
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  private validateName(name: string | undefined, errors: ValidationError[]): void {
    if (!name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Strategy name is required',
        field: 'name',
      });
      return;
    }

    if (name.length < LIMITS.NAME_MIN_LENGTH) {
      errors.push({
        code: 'NAME_TOO_SHORT',
        message: `Strategy name must be at least ${LIMITS.NAME_MIN_LENGTH} characters`,
        field: 'name',
      });
    }

    if (name.length > LIMITS.NAME_MAX_LENGTH) {
      errors.push({
        code: 'NAME_TOO_LONG',
        message: `Strategy name must be at most ${LIMITS.NAME_MAX_LENGTH} characters`,
        field: 'name',
      });
    }
  }

  private validateDescription(description: string | undefined, errors: ValidationError[]): void {
    if (!description) {
      errors.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Strategy description is required',
        field: 'description',
      });
      return;
    }

    if (description.length < LIMITS.DESCRIPTION_MIN_LENGTH) {
      errors.push({
        code: 'DESCRIPTION_TOO_SHORT',
        message: `Description must be at least ${LIMITS.DESCRIPTION_MIN_LENGTH} characters`,
        field: 'description',
      });
    }

    if (description.length > LIMITS.DESCRIPTION_MAX_LENGTH) {
      errors.push({
        code: 'DESCRIPTION_TOO_LONG',
        message: `Description must be at most ${LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
        field: 'description',
      });
    }
  }

  private validateVersion(version: string | undefined, errors: ValidationError[]): void {
    if (!version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Strategy version is required',
        field: 'version',
      });
      return;
    }

    if (!LIMITS.VERSION_REGEX.test(version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning format (e.g., 1.0 or 1.0.0)',
        field: 'version',
      });
    }
  }

  private validateAuthor(author: string | undefined, errors: ValidationError[]): void {
    if (!author) {
      errors.push({
        code: 'MISSING_AUTHOR',
        message: 'Author ID is required',
        field: 'author',
      });
    }
  }

  private validateRiskLevel(riskLevel: string | undefined, errors: ValidationError[]): void {
    if (!riskLevel) {
      errors.push({
        code: 'MISSING_RISK_LEVEL',
        message: 'Risk level is required',
        field: 'risk_level',
      });
      return;
    }

    if (!this.validRiskLevels.has(riskLevel)) {
      errors.push({
        code: 'INVALID_RISK_LEVEL',
        message: `Risk level must be one of: ${VALID_RISK_LEVELS.join(', ')}`,
        field: 'risk_level',
      });
    }
  }

  private validateCategory(category: string | undefined, errors: ValidationError[]): void {
    if (!category) {
      errors.push({
        code: 'MISSING_CATEGORY',
        message: 'Strategy category is required',
        field: 'category',
      });
      return;
    }

    if (!this.validCategories.has(category)) {
      errors.push({
        code: 'INVALID_CATEGORY',
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        field: 'category',
      });
    }
  }

  private validateSupportedPairs(
    pairs: string[] | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!pairs || pairs.length === 0) {
      errors.push({
        code: 'MISSING_SUPPORTED_PAIRS',
        message: 'At least one supported trading pair is required',
        field: 'supported_pairs',
      });
      return;
    }

    if (pairs.length > LIMITS.MAX_PAIRS) {
      errors.push({
        code: 'TOO_MANY_PAIRS',
        message: `Maximum ${LIMITS.MAX_PAIRS} trading pairs allowed`,
        field: 'supported_pairs',
      });
    }

    const unsupportedPairs: string[] = [];
    for (const pair of pairs) {
      if (!this.isPairSupported(pair)) {
        unsupportedPairs.push(pair);
      }
    }

    if (unsupportedPairs.length > 0) {
      warnings.push({
        code: 'UNSUPPORTED_PAIRS',
        message: `Some trading pairs may not be fully supported: ${unsupportedPairs.join(', ')}`,
        field: 'supported_pairs',
      });
    }
  }

  private validateCapital(
    capital: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (capital < LIMITS.MIN_CAPITAL) {
      errors.push({
        code: 'CAPITAL_TOO_LOW',
        message: `Recommended capital must be at least ${LIMITS.MIN_CAPITAL} TON`,
        field: 'recommended_capital',
      });
    }

    if (capital > LIMITS.MAX_CAPITAL) {
      errors.push({
        code: 'CAPITAL_TOO_HIGH',
        message: `Recommended capital must be at most ${LIMITS.MAX_CAPITAL} TON`,
        field: 'recommended_capital',
      });
    }

    if (capital > 10000) {
      warnings.push({
        code: 'HIGH_CAPITAL_REQUIREMENT',
        message: 'High capital requirement may limit user adoption',
        field: 'recommended_capital',
      });
    }
  }

  private validateInterval(
    interval: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (interval < LIMITS.MIN_INTERVAL) {
      errors.push({
        code: 'INTERVAL_TOO_SHORT',
        message: `Execution interval must be at least ${LIMITS.MIN_INTERVAL} second`,
        field: 'execution_interval',
      });
    }

    if (interval > LIMITS.MAX_INTERVAL) {
      errors.push({
        code: 'INTERVAL_TOO_LONG',
        message: `Execution interval must be at most ${LIMITS.MAX_INTERVAL} seconds (24 hours)`,
        field: 'execution_interval',
      });
    }

    if (interval < 60) {
      warnings.push({
        code: 'VERY_SHORT_INTERVAL',
        message: 'Very short execution intervals may incur higher costs',
        field: 'execution_interval',
      });
    }
  }

  private validateParameters(
    parameters: Record<string, StrategyParameter>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const paramKeys = Object.keys(parameters);

    if (paramKeys.length > LIMITS.MAX_PARAMETERS) {
      errors.push({
        code: 'TOO_MANY_PARAMETERS',
        message: `Maximum ${LIMITS.MAX_PARAMETERS} parameters allowed`,
        field: 'parameters',
      });
    }

    for (const key of paramKeys) {
      const param = parameters[key];

      if (!param.name) {
        errors.push({
          code: 'MISSING_PARAMETER_NAME',
          message: `Parameter "${key}" must have a name`,
          field: `parameters.${key}.name`,
        });
      }

      if (!param.type) {
        errors.push({
          code: 'MISSING_PARAMETER_TYPE',
          message: `Parameter "${key}" must have a type`,
          field: `parameters.${key}.type`,
        });
      }

      if (!['number', 'string', 'boolean', 'select'].includes(param.type)) {
        errors.push({
          code: 'INVALID_PARAMETER_TYPE',
          message: `Parameter "${key}" has invalid type. Must be: number, string, boolean, or select`,
          field: `parameters.${key}.type`,
        });
      }

      if (param.type === 'select' && (!param.options || param.options.length === 0)) {
        errors.push({
          code: 'MISSING_SELECT_OPTIONS',
          message: `Parameter "${key}" of type 'select' must have options`,
          field: `parameters.${key}.options`,
        });
      }

      if (param.type === 'number') {
        if (param.min_value !== undefined && param.max_value !== undefined) {
          if (param.min_value > param.max_value) {
            errors.push({
              code: 'INVALID_PARAMETER_RANGE',
              message: `Parameter "${key}" has invalid range: min > max`,
              field: `parameters.${key}`,
            });
          }
        }
      }

      if (!param.description) {
        warnings.push({
          code: 'MISSING_PARAMETER_DESCRIPTION',
          message: `Parameter "${key}" should have a description`,
          field: `parameters.${key}.description`,
        });
      }
    }
  }

  private validateTags(
    tags: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (tags.length > LIMITS.MAX_TAGS) {
      errors.push({
        code: 'TOO_MANY_TAGS',
        message: `Maximum ${LIMITS.MAX_TAGS} tags allowed`,
        field: 'tags',
      });
    }

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (tag.length > LIMITS.TAG_MAX_LENGTH) {
        errors.push({
          code: 'TAG_TOO_LONG',
          message: `Tag "${tag}" exceeds maximum length of ${LIMITS.TAG_MAX_LENGTH} characters`,
          field: `tags[${i}]`,
        });
      }

      if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
        warnings.push({
          code: 'TAG_FORMAT_WARNING',
          message: `Tag "${tag}" contains special characters. Consider using alphanumeric characters only.`,
          field: `tags[${i}]`,
        });
      }
    }

    // Check for duplicate tags
    const uniqueTags = new Set(tags.map(t => t.toLowerCase()));
    if (uniqueTags.size !== tags.length) {
      warnings.push({
        code: 'DUPLICATE_TAGS',
        message: 'Some tags are duplicated',
        field: 'tags',
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Strategy Validator instance
 */
export function createStrategyValidator(): StrategyValidator {
  return new DefaultStrategyValidator();
}

// ============================================================================
// Exports
// ============================================================================

export { SUPPORTED_PAIRS, VALID_RISK_LEVELS, VALID_CATEGORIES, LIMITS };
