/**
 * TONAIAgent - Strategy Manager
 *
 * Manages strategy templates, publishing, versioning, and discovery.
 * Supports creation, updating, and lifecycle management of trading strategies.
 */

import {
  Strategy,
  StrategyVersion,
  StrategyConfig,
  StrategyRiskProfile,
  StrategyPerformance,
  StrategyMetadata,
  StrategyCategory,
  StrategyVisibility,
  StrategyStatus,
  BacktestResult,
  MarketplaceEvent,
  MarketplaceEventCallback,
} from './types';

// ============================================================================
// Strategy Manager Interface
// ============================================================================

export interface StrategyManager {
  // CRUD operations
  create(input: CreateStrategyInput): Promise<Strategy>;
  get(strategyId: string): Promise<Strategy | null>;
  update(strategyId: string, updates: UpdateStrategyInput): Promise<Strategy>;
  delete(strategyId: string): Promise<void>;
  list(filter?: StrategyFilter): Promise<Strategy[]>;

  // Publishing lifecycle
  publish(strategyId: string): Promise<Strategy>;
  unpublish(strategyId: string): Promise<Strategy>;
  deprecate(strategyId: string, reason: string): Promise<Strategy>;
  archive(strategyId: string): Promise<Strategy>;

  // Versioning
  createVersion(strategyId: string, input: CreateVersionInput): Promise<StrategyVersion>;
  getVersion(strategyId: string, version: string): Promise<StrategyVersion | null>;
  listVersions(strategyId: string): Promise<StrategyVersion[]>;
  rollbackToVersion(strategyId: string, version: string): Promise<Strategy>;

  // Validation
  validate(config: StrategyConfig): ValidationResult;
  validateRiskProfile(profile: StrategyRiskProfile): ValidationResult;

  // Performance tracking
  updatePerformance(strategyId: string, performance: Partial<StrategyPerformance>): Promise<void>;
  getPerformanceHistory(strategyId: string, period: string): Promise<StrategyPerformance[]>;

  // Events
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateStrategyInput {
  name: string;
  description: string;
  creatorId: string;
  category: StrategyCategory;
  visibility: StrategyVisibility;
  config: StrategyConfig;
  riskProfile?: Partial<StrategyRiskProfile>;
  metadata?: Partial<StrategyMetadata>;
  backtestResults?: BacktestResult;
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string;
  category?: StrategyCategory;
  visibility?: StrategyVisibility;
  config?: Partial<StrategyConfig>;
  riskProfile?: Partial<StrategyRiskProfile>;
  metadata?: Partial<StrategyMetadata>;
}

export interface CreateVersionInput {
  changelog: string;
  config: StrategyConfig;
  breakingChanges?: boolean;
}

export interface StrategyFilter {
  creatorId?: string;
  categories?: StrategyCategory[];
  visibility?: StrategyVisibility[];
  status?: StrategyStatus[];
  minCapital?: number;
  maxCapital?: number;
  protocols?: string[];
  tokens?: string[];
  tags?: string[];
  search?: string;
  sortBy?: 'created' | 'updated' | 'name' | 'followers' | 'performance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Default Strategy Manager Implementation
// ============================================================================

export class DefaultStrategyManager implements StrategyManager {
  private readonly strategies: Map<string, Strategy> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: StrategyManagerConfig;

  constructor(config?: Partial<StrategyManagerConfig>) {
    this.config = {
      maxStrategiesPerCreator: config?.maxStrategiesPerCreator ?? 100,
      maxVersionsPerStrategy: config?.maxVersionsPerStrategy ?? 50,
      minNameLength: config?.minNameLength ?? 3,
      maxNameLength: config?.maxNameLength ?? 100,
      minDescriptionLength: config?.minDescriptionLength ?? 10,
      maxDescriptionLength: config?.maxDescriptionLength ?? 5000,
      maxParametersPerStrategy: config?.maxParametersPerStrategy ?? 50,
      maxProtocolsPerStrategy: config?.maxProtocolsPerStrategy ?? 20,
      maxTokensPerStrategy: config?.maxTokensPerStrategy ?? 50,
      requireBacktest: config?.requireBacktest ?? false,
    };
  }

  async create(input: CreateStrategyInput): Promise<Strategy> {
    // Validate input
    const validation = this.validateCreateInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid strategy input: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check creator limits
    const creatorStrategies = await this.list({ creatorId: input.creatorId });
    if (creatorStrategies.length >= this.config.maxStrategiesPerCreator) {
      throw new Error(`Creator has reached maximum strategy limit of ${this.config.maxStrategiesPerCreator}`);
    }

    const strategyId = this.generateId('strategy');
    const now = new Date();
    const version = '1.0.0';

    const strategy: Strategy = {
      id: strategyId,
      name: input.name,
      description: input.description,
      creatorId: input.creatorId,
      category: input.category,
      visibility: input.visibility,
      status: 'draft',
      version,
      versionHistory: [
        {
          version,
          changelog: 'Initial version',
          config: input.config,
          createdAt: now,
        },
      ],
      config: input.config,
      riskProfile: this.calculateRiskProfile(input.config, input.riskProfile),
      performance: this.createEmptyPerformance(),
      metadata: {
        tags: input.metadata?.tags ?? [],
        backtestResults: input.backtestResults,
        socialLinks: input.metadata?.socialLinks,
        totalFollowers: 0,
        totalCapitalManaged: 0,
        avgUserRating: 0,
        ratingCount: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.strategies.set(strategyId, strategy);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_published',
      severity: 'info',
      source: 'strategy_manager',
      message: `Strategy "${strategy.name}" created`,
      data: { strategyId, creatorId: input.creatorId },
    });

    return strategy;
  }

  async get(strategyId: string): Promise<Strategy | null> {
    return this.strategies.get(strategyId) ?? null;
  }

  async update(strategyId: string, updates: UpdateStrategyInput): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status === 'archived') {
      throw new Error('Cannot update archived strategy');
    }

    const now = new Date();
    const updatedStrategy: Strategy = {
      ...strategy,
      name: updates.name ?? strategy.name,
      description: updates.description ?? strategy.description,
      category: updates.category ?? strategy.category,
      visibility: updates.visibility ?? strategy.visibility,
      config: updates.config
        ? { ...strategy.config, ...updates.config }
        : strategy.config,
      riskProfile: updates.riskProfile
        ? { ...strategy.riskProfile, ...updates.riskProfile }
        : strategy.riskProfile,
      metadata: updates.metadata
        ? { ...strategy.metadata, ...updates.metadata }
        : strategy.metadata,
      updatedAt: now,
    };

    this.strategies.set(strategyId, updatedStrategy);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_updated',
      severity: 'info',
      source: 'strategy_manager',
      message: `Strategy "${updatedStrategy.name}" updated`,
      data: { strategyId, updates: Object.keys(updates) },
    });

    return updatedStrategy;
  }

  async delete(strategyId: string): Promise<void> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status === 'active' && strategy.metadata.totalFollowers > 0) {
      throw new Error('Cannot delete active strategy with followers. Deprecate first.');
    }

    this.strategies.delete(strategyId);
  }

  async list(filter?: StrategyFilter): Promise<Strategy[]> {
    let strategies = Array.from(this.strategies.values());

    if (filter) {
      strategies = strategies.filter(s => {
        if (filter.creatorId && s.creatorId !== filter.creatorId) return false;
        if (filter.categories && !filter.categories.includes(s.category)) return false;
        if (filter.visibility && !filter.visibility.includes(s.visibility)) return false;
        if (filter.status && !filter.status.includes(s.status)) return false;
        if (filter.minCapital && s.config.minCapital < filter.minCapital) return false;
        if (filter.maxCapital && s.config.maxCapital > filter.maxCapital) return false;
        if (filter.protocols && !filter.protocols.some(p => s.config.supportedProtocols.includes(p))) return false;
        if (filter.tokens && !filter.tokens.some(t => s.config.supportedTokens.includes(t))) return false;
        if (filter.tags && !filter.tags.some(t => s.metadata.tags.includes(t))) return false;
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          if (!s.name.toLowerCase().includes(searchLower) &&
              !s.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
        return true;
      });

      // Sort
      if (filter.sortBy) {
        const order = filter.sortOrder === 'desc' ? -1 : 1;
        strategies.sort((a, b) => {
          switch (filter.sortBy) {
            case 'created':
              return (a.createdAt.getTime() - b.createdAt.getTime()) * order;
            case 'updated':
              return (a.updatedAt.getTime() - b.updatedAt.getTime()) * order;
            case 'name':
              return a.name.localeCompare(b.name) * order;
            case 'followers':
              return (a.metadata.totalFollowers - b.metadata.totalFollowers) * order;
            case 'performance':
              return (a.performance.totalReturns - b.performance.totalReturns) * order;
            default:
              return 0;
          }
        });
      }

      // Pagination
      if (filter.offset) {
        strategies = strategies.slice(filter.offset);
      }
      if (filter.limit) {
        strategies = strategies.slice(0, filter.limit);
      }
    }

    return strategies;
  }

  async publish(strategyId: string): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status !== 'draft' && strategy.status !== 'pending_review') {
      throw new Error(`Cannot publish strategy in ${strategy.status} status`);
    }

    // Validate strategy is complete
    const validation = this.validate(strategy.config);
    if (!validation.valid) {
      throw new Error(`Strategy validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check backtest requirement
    if (this.config.requireBacktest && !strategy.metadata.backtestResults) {
      throw new Error('Backtest results required before publishing');
    }

    const now = new Date();
    const publishedStrategy: Strategy = {
      ...strategy,
      status: 'active',
      publishedAt: now,
      updatedAt: now,
    };

    this.strategies.set(strategyId, publishedStrategy);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_published',
      severity: 'info',
      source: 'strategy_manager',
      message: `Strategy "${strategy.name}" published to marketplace`,
      data: { strategyId, category: strategy.category },
    });

    return publishedStrategy;
  }

  async unpublish(strategyId: string): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status !== 'active') {
      throw new Error('Can only unpublish active strategies');
    }

    const now = new Date();
    const unpublishedStrategy: Strategy = {
      ...strategy,
      status: 'paused',
      updatedAt: now,
    };

    this.strategies.set(strategyId, unpublishedStrategy);
    return unpublishedStrategy;
  }

  async deprecate(strategyId: string, reason: string): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const deprecatedStrategy: Strategy = {
      ...strategy,
      status: 'deprecated',
      updatedAt: now,
      riskProfile: {
        ...strategy.riskProfile,
        warnings: [...strategy.riskProfile.warnings, `Deprecated: ${reason}`],
      },
    };

    this.strategies.set(strategyId, deprecatedStrategy);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_deprecated',
      severity: 'warning',
      source: 'strategy_manager',
      message: `Strategy "${strategy.name}" deprecated: ${reason}`,
      data: { strategyId, reason },
    });

    return deprecatedStrategy;
  }

  async archive(strategyId: string): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.metadata.totalFollowers > 0) {
      throw new Error('Cannot archive strategy with active followers');
    }

    const now = new Date();
    const archivedStrategy: Strategy = {
      ...strategy,
      status: 'archived',
      updatedAt: now,
    };

    this.strategies.set(strategyId, archivedStrategy);
    return archivedStrategy;
  }

  async createVersion(strategyId: string, input: CreateVersionInput): Promise<StrategyVersion> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.versionHistory.length >= this.config.maxVersionsPerStrategy) {
      throw new Error(`Maximum versions (${this.config.maxVersionsPerStrategy}) reached`);
    }

    const validation = this.validate(input.config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const newVersion = this.incrementVersion(strategy.version, input.breakingChanges);
    const now = new Date();

    const version: StrategyVersion = {
      version: newVersion,
      changelog: input.changelog,
      config: input.config,
      createdAt: now,
    };

    const updatedStrategy: Strategy = {
      ...strategy,
      version: newVersion,
      versionHistory: [...strategy.versionHistory, version],
      config: input.config,
      riskProfile: this.calculateRiskProfile(input.config, strategy.riskProfile),
      updatedAt: now,
    };

    this.strategies.set(strategyId, updatedStrategy);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_updated',
      severity: 'info',
      source: 'strategy_manager',
      message: `Strategy "${strategy.name}" updated to version ${newVersion}`,
      data: { strategyId, version: newVersion, breakingChanges: input.breakingChanges },
    });

    return version;
  }

  async getVersion(strategyId: string, version: string): Promise<StrategyVersion | null> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      return null;
    }
    return strategy.versionHistory.find(v => v.version === version) ?? null;
  }

  async listVersions(strategyId: string): Promise<StrategyVersion[]> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      return [];
    }
    return [...strategy.versionHistory].reverse();
  }

  async rollbackToVersion(strategyId: string, version: string): Promise<Strategy> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const targetVersion = strategy.versionHistory.find(v => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version not found: ${version}`);
    }

    const now = new Date();
    const rollbackVersion = this.incrementVersion(strategy.version, false);

    const newVersionEntry: StrategyVersion = {
      version: rollbackVersion,
      changelog: `Rollback to version ${version}`,
      config: targetVersion.config,
      createdAt: now,
    };

    const updatedStrategy: Strategy = {
      ...strategy,
      version: rollbackVersion,
      versionHistory: [...strategy.versionHistory, newVersionEntry],
      config: targetVersion.config,
      riskProfile: this.calculateRiskProfile(targetVersion.config, strategy.riskProfile),
      updatedAt: now,
    };

    this.strategies.set(strategyId, updatedStrategy);
    return updatedStrategy;
  }

  validate(config: StrategyConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate required fields
    if (!config.supportedProtocols || config.supportedProtocols.length === 0) {
      errors.push({
        field: 'supportedProtocols',
        message: 'At least one supported protocol is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!config.supportedTokens || config.supportedTokens.length === 0) {
      errors.push({
        field: 'supportedTokens',
        message: 'At least one supported token is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate capital limits
    if (config.minCapital < 0) {
      errors.push({
        field: 'minCapital',
        message: 'Minimum capital cannot be negative',
        code: 'INVALID_VALUE',
      });
    }

    if (config.maxCapital < config.minCapital) {
      errors.push({
        field: 'maxCapital',
        message: 'Maximum capital must be greater than minimum capital',
        code: 'INVALID_RANGE',
      });
    }

    // Validate slippage tolerance
    if (config.slippageTolerance < 0 || config.slippageTolerance > 100) {
      errors.push({
        field: 'slippageTolerance',
        message: 'Slippage tolerance must be between 0 and 100 percent',
        code: 'OUT_OF_RANGE',
      });
    }

    if (config.slippageTolerance > 5) {
      warnings.push({
        field: 'slippageTolerance',
        message: 'High slippage tolerance may result in significant losses',
        suggestion: 'Consider reducing slippage tolerance below 5%',
      });
    }

    // Validate stop loss and take profit
    if (config.stopLossPercent !== undefined) {
      if (config.stopLossPercent < 0 || config.stopLossPercent > 100) {
        errors.push({
          field: 'stopLossPercent',
          message: 'Stop loss must be between 0 and 100 percent',
          code: 'OUT_OF_RANGE',
        });
      }
    }

    if (config.takeProfitPercent !== undefined) {
      if (config.takeProfitPercent < 0) {
        errors.push({
          field: 'takeProfitPercent',
          message: 'Take profit cannot be negative',
          code: 'INVALID_VALUE',
        });
      }
    }

    // Validate parameters
    if (config.parameters) {
      const paramCount = Object.keys(config.parameters).length;
      if (paramCount > this.config.maxParametersPerStrategy) {
        errors.push({
          field: 'parameters',
          message: `Maximum ${this.config.maxParametersPerStrategy} parameters allowed`,
          code: 'TOO_MANY_ITEMS',
        });
      }

      for (const [key, param] of Object.entries(config.parameters)) {
        if (!param.name || param.name.length === 0) {
          errors.push({
            field: `parameters.${key}.name`,
            message: 'Parameter name is required',
            code: 'REQUIRED_FIELD',
          });
        }

        if (param.type === 'number' && param.minValue !== undefined && param.maxValue !== undefined) {
          if (param.minValue > param.maxValue) {
            errors.push({
              field: `parameters.${key}`,
              message: 'Min value cannot be greater than max value',
              code: 'INVALID_RANGE',
            });
          }
        }

        if (param.type === 'select' && (!param.options || param.options.length === 0)) {
          errors.push({
            field: `parameters.${key}.options`,
            message: 'Select type requires at least one option',
            code: 'REQUIRED_FIELD',
          });
        }
      }
    }

    // Validate array sizes
    if (config.supportedProtocols.length > this.config.maxProtocolsPerStrategy) {
      errors.push({
        field: 'supportedProtocols',
        message: `Maximum ${this.config.maxProtocolsPerStrategy} protocols allowed`,
        code: 'TOO_MANY_ITEMS',
      });
    }

    if (config.supportedTokens.length > this.config.maxTokensPerStrategy) {
      errors.push({
        field: 'supportedTokens',
        message: `Maximum ${this.config.maxTokensPerStrategy} tokens allowed`,
        code: 'TOO_MANY_ITEMS',
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateRiskProfile(profile: StrategyRiskProfile): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (profile.volatilityScore < 0 || profile.volatilityScore > 100) {
      errors.push({
        field: 'volatilityScore',
        message: 'Volatility score must be between 0 and 100',
        code: 'OUT_OF_RANGE',
      });
    }

    if (profile.maxDrawdown < 0 || profile.maxDrawdown > 100) {
      errors.push({
        field: 'maxDrawdown',
        message: 'Max drawdown must be between 0 and 100 percent',
        code: 'OUT_OF_RANGE',
      });
    }

    if (profile.maxDrawdown > 50) {
      warnings.push({
        field: 'maxDrawdown',
        message: 'High maximum drawdown may be unsuitable for risk-averse users',
        suggestion: 'Consider adding risk warnings or implementing safeguards',
      });
    }

    if (profile.riskLevel === 'extreme') {
      warnings.push({
        field: 'riskLevel',
        message: 'Extreme risk strategies may have limited audience',
        suggestion: 'Ensure clear risk disclosure and user acknowledgment',
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async updatePerformance(strategyId: string, performance: Partial<StrategyPerformance>): Promise<void> {
    const strategy = await this.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const updatedPerformance: StrategyPerformance = {
      ...strategy.performance,
      ...performance,
      updatedAt: new Date(),
    };

    const updatedStrategy: Strategy = {
      ...strategy,
      performance: updatedPerformance,
      updatedAt: new Date(),
    };

    this.strategies.set(strategyId, updatedStrategy);
  }

  async getPerformanceHistory(_strategyId: string, _period: string): Promise<StrategyPerformance[]> {
    // In production, this would fetch historical performance snapshots
    // For now, return empty array as placeholder
    return [];
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateCreateInput(input: CreateStrategyInput): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!input.name || input.name.length < this.config.minNameLength) {
      errors.push({
        field: 'name',
        message: `Name must be at least ${this.config.minNameLength} characters`,
        code: 'MIN_LENGTH',
      });
    }

    if (input.name && input.name.length > this.config.maxNameLength) {
      errors.push({
        field: 'name',
        message: `Name must not exceed ${this.config.maxNameLength} characters`,
        code: 'MAX_LENGTH',
      });
    }

    if (!input.description || input.description.length < this.config.minDescriptionLength) {
      errors.push({
        field: 'description',
        message: `Description must be at least ${this.config.minDescriptionLength} characters`,
        code: 'MIN_LENGTH',
      });
    }

    if (input.description && input.description.length > this.config.maxDescriptionLength) {
      errors.push({
        field: 'description',
        message: `Description must not exceed ${this.config.maxDescriptionLength} characters`,
        code: 'MAX_LENGTH',
      });
    }

    if (!input.creatorId) {
      errors.push({
        field: 'creatorId',
        message: 'Creator ID is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate config
    const configValidation = this.validate(input.config);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);

    return { valid: errors.length === 0, errors, warnings };
  }

  private calculateRiskProfile(
    config: StrategyConfig,
    existingProfile?: Partial<StrategyRiskProfile>
  ): StrategyRiskProfile {
    // Calculate risk metrics based on config
    let volatilityScore = existingProfile?.volatilityScore ?? 50;
    let maxDrawdown = existingProfile?.maxDrawdown ?? config.stopLossPercent ?? 20;
    const warnings: string[] = existingProfile?.warnings ?? [];

    // Higher slippage tolerance = higher risk
    if (config.slippageTolerance > 2) {
      volatilityScore += 10;
      warnings.push('High slippage tolerance may impact returns');
    }

    // No stop loss = higher risk
    if (!config.stopLossPercent) {
      volatilityScore += 15;
      warnings.push('No stop loss configured');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (volatilityScore < 25) {
      riskLevel = 'low';
    } else if (volatilityScore < 50) {
      riskLevel = 'medium';
    } else if (volatilityScore < 75) {
      riskLevel = 'high';
    } else {
      riskLevel = 'extreme';
    }

    return {
      riskLevel: existingProfile?.riskLevel ?? riskLevel,
      volatilityScore: Math.min(100, Math.max(0, volatilityScore)),
      maxDrawdown: maxDrawdown,
      smartContractRisk: existingProfile?.smartContractRisk ?? 'medium',
      liquidityRisk: existingProfile?.liquidityRisk ?? 'medium',
      impermanentLossRisk: existingProfile?.impermanentLossRisk,
      warnings: [...new Set(warnings)],
    };
  }

  private createEmptyPerformance(): StrategyPerformance {
    return {
      totalReturns: 0,
      roi30d: 0,
      roi90d: 0,
      roi365d: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      avgDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      volatility: 0,
      updatedAt: new Date(),
    };
  }

  private incrementVersion(currentVersion: string, breakingChange?: boolean): string {
    const parts = currentVersion.split('.').map(Number);
    if (breakingChange) {
      return `${parts[0] + 1}.0.0`;
    } else {
      return `${parts[0]}.${parts[1] + 1}.0`;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: MarketplaceEvent): void {
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
// Configuration Types
// ============================================================================

export interface StrategyManagerConfig {
  maxStrategiesPerCreator: number;
  maxVersionsPerStrategy: number;
  minNameLength: number;
  maxNameLength: number;
  minDescriptionLength: number;
  maxDescriptionLength: number;
  maxParametersPerStrategy: number;
  maxProtocolsPerStrategy: number;
  maxTokensPerStrategy: number;
  requireBacktest: boolean;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyManager(config?: Partial<StrategyManagerConfig>): DefaultStrategyManager {
  return new DefaultStrategyManager(config);
}
