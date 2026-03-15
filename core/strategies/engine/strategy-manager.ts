/**
 * TONAIAgent - Strategy Manager
 *
 * Manages strategy lifecycle, versioning, and persistence.
 * Provides the core abstraction layer for strategy operations.
 */

import {
  Strategy,
  StrategySpec,
  StrategyStatus,
  StrategyType,
  StrategyPerformance,
  StrategyEvent,
  StrategyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface CreateStrategyOptions {
  name: string;
  description: string;
  type: StrategyType;
  definition: StrategySpec;
  userId: string;
  agentId: string;
  templateId?: string;
  parentStrategyId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateStrategyOptions {
  name?: string;
  description?: string;
  definition?: Partial<StrategySpec>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CloneStrategyOptions {
  newName?: string;
  newUserId?: string;
  newAgentId?: string;
  modifications?: Partial<UpdateStrategyOptions>;
}

export interface StrategyQuery {
  userId?: string;
  agentId?: string;
  status?: StrategyStatus | StrategyStatus[];
  type?: StrategyType | StrategyType[];
  tags?: string[];
  templateId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'performance';
  orderDirection?: 'asc' | 'desc';
}

export interface StrategyQueryResult {
  strategies: Strategy[];
  total: number;
  hasMore: boolean;
}

export interface StrategyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

// ============================================================================
// Strategy Manager Implementation
// ============================================================================

export class StrategyManager {
  private readonly strategies: Map<string, Strategy> = new Map();
  private readonly eventCallbacks: StrategyEventCallback[] = [];
  private readonly versionHistory: Map<string, Strategy[]> = new Map();

  constructor() {
    // Initialize with empty state
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new strategy
   */
  async createStrategy(options: CreateStrategyOptions): Promise<Strategy> {
    const id = this.generateId();
    const now = new Date();

    const strategy: Strategy = {
      id,
      name: options.name,
      description: options.description,
      type: options.type,
      version: 1,
      status: 'draft',
      userId: options.userId,
      agentId: options.agentId,
      definition: this.normalizeDefinition(options.definition),
      createdAt: now,
      updatedAt: now,
      tags: options.tags ?? [],
      templateId: options.templateId,
      parentStrategyId: options.parentStrategyId,
      metadata: options.metadata ?? {},
    };

    // Validate before saving
    const validation = await this.validateStrategy(strategy);
    if (!validation.valid) {
      throw new Error(`Invalid strategy: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.strategies.set(id, strategy);
    this.saveToHistory(strategy);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_created',
      strategyId: id,
      timestamp: now,
      data: { strategy },
      severity: 'info',
    });

    return strategy;
  }

  /**
   * Get a strategy by ID
   */
  async getStrategy(id: string): Promise<Strategy | null> {
    return this.strategies.get(id) ?? null;
  }

  /**
   * Update an existing strategy
   */
  async updateStrategy(id: string, options: UpdateStrategyOptions): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    // Cannot update active strategies without stopping first
    if (existing.status === 'active') {
      throw new Error('Cannot update active strategy. Pause or stop it first.');
    }

    const now = new Date();
    const updated: Strategy = {
      ...existing,
      name: options.name ?? existing.name,
      description: options.description ?? existing.description,
      definition: options.definition
        ? this.mergeDefinitions(existing.definition, options.definition)
        : existing.definition,
      tags: options.tags ?? existing.tags,
      metadata: options.metadata
        ? { ...existing.metadata, ...options.metadata }
        : existing.metadata,
      version: existing.version + 1,
      updatedAt: now,
      // Reset validation status
      status: existing.status === 'validated' || existing.status === 'backtested'
        ? 'draft'
        : existing.status,
      validatedAt: undefined,
    };

    // Validate before saving
    const validation = await this.validateStrategy(updated);
    if (!validation.valid) {
      throw new Error(`Invalid strategy: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.strategies.set(id, updated);
    this.saveToHistory(updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_updated',
      strategyId: id,
      timestamp: now,
      data: { previous: existing, updated },
      severity: 'info',
    });

    return updated;
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(id: string): Promise<void> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    if (existing.status === 'active') {
      throw new Error('Cannot delete active strategy. Stop it first.');
    }

    // Archive instead of delete for audit trail
    await this.archiveStrategy(id);
  }

  /**
   * Query strategies
   */
  async queryStrategies(query: StrategyQuery): Promise<StrategyQueryResult> {
    let results = Array.from(this.strategies.values());

    // Apply filters
    if (query.userId) {
      results = results.filter(s => s.userId === query.userId);
    }
    if (query.agentId) {
      results = results.filter(s => s.agentId === query.agentId);
    }
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter(s => statuses.includes(s.status));
    }
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(s => types.includes(s.type));
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter(s => query.tags!.some(tag => s.tags.includes(tag)));
    }
    if (query.templateId) {
      results = results.filter(s => s.templateId === query.templateId);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(s =>
        s.name.toLowerCase().includes(searchLower) ||
        s.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const orderBy = query.orderBy ?? 'createdAt';
    const direction = query.orderDirection ?? 'desc';
    results.sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'performance':
          comparison = (a.performance?.metrics.totalReturn ?? 0) -
                       (b.performance?.metrics.totalReturn ?? 0);
          break;
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
      }
      return direction === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const total = results.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const paginated = results.slice(offset, offset + limit);

    return {
      strategies: paginated,
      total,
      hasMore: offset + limit < total,
    };
  }

  // ============================================================================
  // Lifecycle Operations
  // ============================================================================

  /**
   * Validate a strategy
   */
  async validateStrategy(strategy: Strategy | string): Promise<StrategyValidationResult> {
    const s = typeof strategy === 'string' ? this.strategies.get(strategy) : strategy;
    if (!s) {
      return {
        valid: false,
        errors: [{ path: '', message: 'Strategy not found', code: 'NOT_FOUND' }],
        warnings: [],
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate basic fields
    if (!s.name || s.name.trim().length === 0) {
      errors.push({ path: 'name', message: 'Strategy name is required', code: 'REQUIRED' });
    }
    if (!s.userId) {
      errors.push({ path: 'userId', message: 'User ID is required', code: 'REQUIRED' });
    }
    if (!s.agentId) {
      errors.push({ path: 'agentId', message: 'Agent ID is required', code: 'REQUIRED' });
    }

    // Validate definition
    const def = s.definition;

    // Must have at least one trigger
    if (!def.triggers || def.triggers.length === 0) {
      errors.push({
        path: 'definition.triggers',
        message: 'At least one trigger is required',
        code: 'REQUIRED',
      });
    }

    // Must have at least one action
    if (!def.actions || def.actions.length === 0) {
      errors.push({
        path: 'definition.actions',
        message: 'At least one action is required',
        code: 'REQUIRED',
      });
    }

    // Validate triggers
    for (let i = 0; i < (def.triggers?.length ?? 0); i++) {
      const trigger = def.triggers[i];
      if (!trigger.id) {
        errors.push({
          path: `definition.triggers[${i}].id`,
          message: 'Trigger ID is required',
          code: 'REQUIRED',
        });
      }
      if (!trigger.type) {
        errors.push({
          path: `definition.triggers[${i}].type`,
          message: 'Trigger type is required',
          code: 'REQUIRED',
        });
      }
    }

    // Validate actions
    for (let i = 0; i < (def.actions?.length ?? 0); i++) {
      const action = def.actions[i];
      if (!action.id) {
        errors.push({
          path: `definition.actions[${i}].id`,
          message: 'Action ID is required',
          code: 'REQUIRED',
        });
      }
      if (!action.type) {
        errors.push({
          path: `definition.actions[${i}].type`,
          message: 'Action type is required',
          code: 'REQUIRED',
        });
      }
    }

    // Validate capital allocation
    const cap = def.capitalAllocation;
    if (cap.minCapital <= 0) {
      warnings.push({
        path: 'definition.capitalAllocation.minCapital',
        message: 'Minimum capital should be greater than 0',
        code: 'VALUE_WARNING',
      });
    }
    if (cap.reservePercentage < 0 || cap.reservePercentage > 100) {
      errors.push({
        path: 'definition.capitalAllocation.reservePercentage',
        message: 'Reserve percentage must be between 0 and 100',
        code: 'INVALID_VALUE',
      });
    }

    // Warn about missing risk controls
    if (!def.riskControls || def.riskControls.length === 0) {
      warnings.push({
        path: 'definition.riskControls',
        message: 'No risk controls defined. Consider adding stop-loss or other protections.',
        code: 'MISSING_RISK_CONTROL',
      });
    }

    // Update status if validating an existing strategy
    if (typeof strategy === 'string' && errors.length === 0) {
      const existing = this.strategies.get(strategy);
      if (existing && existing.status === 'draft') {
        existing.status = 'validated';
        existing.validatedAt = new Date();
        this.strategies.set(strategy, existing);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Activate a strategy for live execution
   */
  async activateStrategy(id: string): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    // Must be validated or backtested first
    if (!['validated', 'backtested', 'paused'].includes(existing.status)) {
      throw new Error(
        `Cannot activate strategy with status "${existing.status}". ` +
        'Strategy must be validated or backtested first.'
      );
    }

    const now = new Date();
    const updated: Strategy = {
      ...existing,
      status: 'active',
      activatedAt: now,
      updatedAt: now,
    };

    this.strategies.set(id, updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_activated',
      strategyId: id,
      timestamp: now,
      data: { strategy: updated },
      severity: 'info',
    });

    return updated;
  }

  /**
   * Pause a running strategy
   */
  async pauseStrategy(id: string, reason?: string): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    if (existing.status !== 'active') {
      throw new Error(`Cannot pause strategy with status "${existing.status}"`);
    }

    const now = new Date();
    const updated: Strategy = {
      ...existing,
      status: 'paused',
      updatedAt: now,
      metadata: {
        ...existing.metadata,
        pausedAt: now.toISOString(),
        pauseReason: reason,
      },
    };

    this.strategies.set(id, updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_paused',
      strategyId: id,
      timestamp: now,
      data: { strategy: updated, reason },
      severity: 'info',
    });

    return updated;
  }

  /**
   * Stop a strategy completely
   */
  async stopStrategy(id: string, reason?: string): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    if (!['active', 'paused', 'error'].includes(existing.status)) {
      throw new Error(`Cannot stop strategy with status "${existing.status}"`);
    }

    const now = new Date();
    const updated: Strategy = {
      ...existing,
      status: 'stopped',
      updatedAt: now,
      metadata: {
        ...existing.metadata,
        stoppedAt: now.toISOString(),
        stopReason: reason,
      },
    };

    this.strategies.set(id, updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_stopped',
      strategyId: id,
      timestamp: now,
      data: { strategy: updated, reason },
      severity: 'info',
    });

    return updated;
  }

  /**
   * Archive a strategy
   */
  async archiveStrategy(id: string): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    if (existing.status === 'active') {
      throw new Error('Cannot archive active strategy. Stop it first.');
    }

    const now = new Date();
    const updated: Strategy = {
      ...existing,
      status: 'archived',
      updatedAt: now,
      metadata: {
        ...existing.metadata,
        archivedAt: now.toISOString(),
      },
    };

    this.strategies.set(id, updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'strategy_archived',
      strategyId: id,
      timestamp: now,
      data: { strategy: updated },
      severity: 'info',
    });

    return updated;
  }

  // ============================================================================
  // Cloning and Versioning
  // ============================================================================

  /**
   * Clone a strategy
   */
  async cloneStrategy(id: string, options: CloneStrategyOptions = {}): Promise<Strategy> {
    const source = this.strategies.get(id);
    if (!source) {
      throw new Error(`Strategy not found: ${id}`);
    }

    const cloneOptions: CreateStrategyOptions = {
      name: options.newName ?? `${source.name} (Copy)`,
      description: source.description,
      type: source.type,
      definition: JSON.parse(JSON.stringify(source.definition)),
      userId: options.newUserId ?? source.userId,
      agentId: options.newAgentId ?? source.agentId,
      parentStrategyId: source.id,
      tags: [...source.tags],
      metadata: {
        ...source.metadata,
        clonedFrom: source.id,
        clonedAt: new Date().toISOString(),
      },
    };

    // Apply modifications if provided
    if (options.modifications) {
      if (options.modifications.name) {
        cloneOptions.name = options.modifications.name;
      }
      if (options.modifications.description) {
        cloneOptions.description = options.modifications.description;
      }
      if (options.modifications.tags) {
        cloneOptions.tags = options.modifications.tags;
      }
      if (options.modifications.definition) {
        cloneOptions.definition = this.mergeDefinitions(
          cloneOptions.definition,
          options.modifications.definition
        );
      }
    }

    return this.createStrategy(cloneOptions);
  }

  /**
   * Get version history for a strategy
   */
  async getVersionHistory(id: string): Promise<Strategy[]> {
    return this.versionHistory.get(id) ?? [];
  }

  /**
   * Revert to a previous version
   */
  async revertToVersion(id: string, version: number): Promise<Strategy> {
    const history = this.versionHistory.get(id);
    if (!history) {
      throw new Error(`No version history for strategy: ${id}`);
    }

    const targetVersion = history.find(s => s.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for strategy: ${id}`);
    }

    const current = this.strategies.get(id);
    if (!current) {
      throw new Error(`Strategy not found: ${id}`);
    }

    if (current.status === 'active') {
      throw new Error('Cannot revert active strategy. Stop it first.');
    }

    const reverted: Strategy = {
      ...targetVersion,
      version: current.version + 1,
      updatedAt: new Date(),
      status: 'draft',
      metadata: {
        ...targetVersion.metadata,
        revertedFrom: current.version,
        revertedTo: version,
        revertedAt: new Date().toISOString(),
      },
    };

    this.strategies.set(id, reverted);
    this.saveToHistory(reverted);

    return reverted;
  }

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  /**
   * Update strategy performance metrics
   */
  async updatePerformance(id: string, performance: StrategyPerformance): Promise<Strategy> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    const updated: Strategy = {
      ...existing,
      performance,
      updatedAt: new Date(),
    };

    this.strategies.set(id, updated);

    this.emitEvent({
      id: this.generateId(),
      type: 'performance_updated',
      strategyId: id,
      timestamp: new Date(),
      data: { performance },
      severity: 'info',
    });

    return updated;
  }

  /**
   * Record last execution time
   */
  async recordExecution(id: string): Promise<void> {
    const existing = this.strategies.get(id);
    if (!existing) {
      throw new Error(`Strategy not found: ${id}`);
    }

    existing.lastExecutedAt = new Date();
    this.strategies.set(id, existing);
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Subscribe to strategy events
   */
  onEvent(callback: StrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Emit a strategy event
   */
  private emitEvent(event: StrategyEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(): string {
    return `strat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private normalizeDefinition(definition: StrategySpec): StrategySpec {
    return {
      triggers: definition.triggers ?? [],
      conditions: definition.conditions ?? [],
      actions: definition.actions ?? [],
      riskControls: definition.riskControls ?? [],
      parameters: definition.parameters ?? [],
      capitalAllocation: definition.capitalAllocation ?? {
        mode: 'percentage',
        allocatedPercentage: 10,
        minCapital: 10,
        reservePercentage: 20,
      },
    };
  }

  private mergeDefinitions(
    base: StrategySpec,
    updates: Partial<StrategySpec>
  ): StrategySpec {
    return {
      triggers: updates.triggers ?? base.triggers,
      conditions: updates.conditions ?? base.conditions,
      actions: updates.actions ?? base.actions,
      riskControls: updates.riskControls ?? base.riskControls,
      parameters: updates.parameters ?? base.parameters,
      capitalAllocation: updates.capitalAllocation ?? base.capitalAllocation,
    };
  }

  private saveToHistory(strategy: Strategy): void {
    const history = this.versionHistory.get(strategy.id) ?? [];
    history.push(JSON.parse(JSON.stringify(strategy)));

    // Keep only last 50 versions
    if (history.length > 50) {
      history.shift();
    }

    this.versionHistory.set(strategy.id, history);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get strategy statistics for a user
   */
  async getStatistics(userId: string): Promise<StrategyStatistics> {
    const userStrategies = Array.from(this.strategies.values())
      .filter(s => s.userId === userId);

    const byStatus: Record<StrategyStatus, number> = {
      draft: 0,
      validating: 0,
      validated: 0,
      backtesting: 0,
      backtested: 0,
      active: 0,
      paused: 0,
      stopped: 0,
      archived: 0,
      error: 0,
    };

    for (const s of userStrategies) {
      byStatus[s.status]++;
    }

    const withPerformance = userStrategies.filter(s => s.performance);
    const totalReturn = withPerformance.reduce(
      (sum, s) => sum + (s.performance?.metrics.totalReturn ?? 0),
      0
    );

    return {
      totalStrategies: userStrategies.length,
      byStatus,
      averageReturn: withPerformance.length > 0 ? totalReturn / withPerformance.length : 0,
      bestPerforming: withPerformance.length > 0
        ? withPerformance.reduce((best, s) =>
            (s.performance?.metrics.totalReturn ?? 0) > (best.performance?.metrics.totalReturn ?? 0)
              ? s
              : best
          )
        : undefined,
    };
  }
}

export interface StrategyStatistics {
  totalStrategies: number;
  byStatus: Record<StrategyStatus, number>;
  averageReturn: number;
  bestPerforming?: Strategy;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyManager(): StrategyManager {
  return new StrategyManager();
}
