/**
 * TONAIAgent - Strategy Registry Storage
 *
 * Provides storage and management for published strategies.
 * Handles strategy metadata, versioning, and performance metrics.
 *
 * Database Schema:
 * - strategies: Core strategy metadata
 * - strategy_versions: Version history for each strategy
 * - strategy_metrics: Performance metrics tracked per strategy
 *
 * Implements Issue #217: Strategy Publishing System
 */

import type {
  StrategyMetadata,
  StrategyVersion,
  StrategyPerformanceMetrics,
  StrategyPackage,
  StrategyVisibilityState,
  DeveloperStrategyFilter,
  PublishingEvent,
  PublishingEventCallback,
} from '../publishing/types';

// ============================================================================
// Registry Interface
// ============================================================================

/**
 * Strategy Registry interface for storage operations
 */
export interface StrategyRegistryStorage {
  // Strategy CRUD operations
  /** Save a new strategy to the registry */
  saveStrategy(metadata: StrategyMetadata): Promise<void>;
  /** Get a strategy by ID */
  getStrategy(strategyId: string): Promise<StrategyMetadata | null>;
  /** Update an existing strategy */
  updateStrategy(strategyId: string, updates: Partial<StrategyMetadata>): Promise<StrategyMetadata>;
  /** Delete a strategy from the registry */
  deleteStrategy(strategyId: string): Promise<void>;

  // Developer queries
  /** Get all strategies by developer */
  getStrategiesByDeveloper(developerId: string, filter?: DeveloperStrategyFilter): Promise<StrategyMetadata[]>;
  /** Count strategies by developer */
  countStrategiesByDeveloper(developerId: string, status?: StrategyVisibilityState): Promise<number>;

  // Version management
  /** Save a new version */
  saveVersion(version: StrategyVersion): Promise<void>;
  /** Get version history for a strategy */
  getVersionHistory(strategyId: string): Promise<StrategyVersion[]>;
  /** Get a specific version */
  getVersion(strategyId: string, version: string): Promise<StrategyVersion | null>;

  // Metrics management
  /** Get metrics for a strategy */
  getMetrics(strategyId: string): Promise<StrategyPerformanceMetrics | null>;
  /** Update metrics for a strategy */
  updateMetrics(strategyId: string, updates: Partial<StrategyPerformanceMetrics>): Promise<void>;

  // Publishing lifecycle
  /** Publish a strategy (change status to published) */
  publishStrategy(strategyId: string): Promise<StrategyMetadata>;
  /** Deprecate a strategy */
  deprecateStrategy(strategyId: string): Promise<StrategyMetadata>;
  /** Hide a strategy */
  hideStrategy(strategyId: string): Promise<StrategyMetadata>;

  // Discovery
  /** List published strategies for marketplace */
  listPublishedStrategies(options?: {
    category?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<StrategyMetadata[]>;

  // Events
  /** Subscribe to registry events */
  onEvent(callback: PublishingEventCallback): void;
}

// ============================================================================
// In-Memory Registry Implementation
// ============================================================================

/**
 * In-memory implementation of the Strategy Registry Storage.
 * Suitable for MVP and testing. Production should use a persistent database.
 */
export class InMemoryStrategyRegistry implements StrategyRegistryStorage {
  private readonly strategies: Map<string, StrategyMetadata> = new Map();
  private readonly versions: Map<string, StrategyVersion[]> = new Map();
  private readonly metrics: Map<string, StrategyPerformanceMetrics> = new Map();
  private readonly eventCallbacks: PublishingEventCallback[] = [];

  // ============================================================================
  // Strategy CRUD Operations
  // ============================================================================

  async saveStrategy(metadata: StrategyMetadata): Promise<void> {
    this.strategies.set(metadata.strategy_id, { ...metadata });

    // Initialize metrics for new strategy
    if (!this.metrics.has(metadata.strategy_id)) {
      this.metrics.set(metadata.strategy_id, this.createEmptyMetrics(metadata.strategy_id));
    }

    // Save initial version
    const initialVersion: StrategyVersion = {
      strategy_id: metadata.strategy_id,
      version: metadata.version,
      config: this.metadataToPackage(metadata),
      created_at: metadata.created_at,
      deprecated: false,
    };
    this.saveVersionInternal(initialVersion);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'strategy_submitted',
      timestamp: new Date(),
      strategy_id: metadata.strategy_id,
      developer_id: metadata.author,
      data: { name: metadata.name, version: metadata.version },
    });
  }

  async getStrategy(strategyId: string): Promise<StrategyMetadata | null> {
    return this.strategies.get(strategyId) ?? null;
  }

  async updateStrategy(
    strategyId: string,
    updates: Partial<StrategyMetadata>
  ): Promise<StrategyMetadata> {
    const existing = this.strategies.get(strategyId);
    if (!existing) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const updated: StrategyMetadata = {
      ...existing,
      ...updates,
      strategy_id: strategyId, // Cannot change ID
      author: existing.author, // Cannot change author
      created_at: existing.created_at, // Cannot change creation date
      updated_at: new Date(),
    };

    this.strategies.set(strategyId, updated);

    // Save new version if version changed
    if (updates.version && updates.version !== existing.version) {
      const newVersion: StrategyVersion = {
        strategy_id: strategyId,
        version: updates.version,
        config: this.metadataToPackage(updated),
        created_at: new Date(),
        deprecated: false,
      };
      this.saveVersionInternal(newVersion);

      this.emitEvent({
        id: this.generateId('event'),
        type: 'strategy_updated',
        timestamp: new Date(),
        strategy_id: strategyId,
        developer_id: existing.author,
        data: { oldVersion: existing.version, newVersion: updates.version },
      });
    }

    return updated;
  }

  async deleteStrategy(strategyId: string): Promise<void> {
    const existing = this.strategies.get(strategyId);
    if (!existing) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Check if strategy has active users
    const metrics = this.metrics.get(strategyId);
    if (metrics && metrics.agents_using > 0) {
      throw new Error('Cannot delete strategy with active agents. Deprecate it instead.');
    }

    this.strategies.delete(strategyId);
    this.versions.delete(strategyId);
    this.metrics.delete(strategyId);
  }

  // ============================================================================
  // Developer Queries
  // ============================================================================

  async getStrategiesByDeveloper(
    developerId: string,
    filter?: DeveloperStrategyFilter
  ): Promise<StrategyMetadata[]> {
    let results = Array.from(this.strategies.values()).filter(
      (s) => s.author === developerId
    );

    if (filter) {
      if (filter.status) {
        results = results.filter((s) => s.status === filter.status);
      }

      if (filter.category) {
        results = results.filter((s) => s.category === filter.category);
      }

      // Sorting
      if (filter.sort_by) {
        const order = filter.sort_order === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          switch (filter.sort_by) {
            case 'name':
              return a.name.localeCompare(b.name) * order;
            case 'created_at':
              return (a.created_at.getTime() - b.created_at.getTime()) * order;
            case 'updated_at':
              return (a.updated_at.getTime() - b.updated_at.getTime()) * order;
            case 'agents_using': {
              const metricsA = this.metrics.get(a.strategy_id);
              const metricsB = this.metrics.get(b.strategy_id);
              return ((metricsA?.agents_using ?? 0) - (metricsB?.agents_using ?? 0)) * order;
            }
            default:
              return 0;
          }
        });
      }

      // Pagination
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 50;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  async countStrategiesByDeveloper(
    developerId: string,
    status?: StrategyVisibilityState
  ): Promise<number> {
    let count = 0;
    for (const strategy of this.strategies.values()) {
      if (strategy.author === developerId) {
        if (!status || strategy.status === status) {
          count++;
        }
      }
    }
    return count;
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  async saveVersion(version: StrategyVersion): Promise<void> {
    this.saveVersionInternal(version);
  }

  private saveVersionInternal(version: StrategyVersion): void {
    const existing = this.versions.get(version.strategy_id) ?? [];
    existing.push(version);
    this.versions.set(version.strategy_id, existing);
  }

  async getVersionHistory(strategyId: string): Promise<StrategyVersion[]> {
    return this.versions.get(strategyId) ?? [];
  }

  async getVersion(strategyId: string, version: string): Promise<StrategyVersion | null> {
    const versions = this.versions.get(strategyId) ?? [];
    return versions.find((v) => v.version === version) ?? null;
  }

  // ============================================================================
  // Metrics Management
  // ============================================================================

  async getMetrics(strategyId: string): Promise<StrategyPerformanceMetrics | null> {
    return this.metrics.get(strategyId) ?? null;
  }

  async updateMetrics(
    strategyId: string,
    updates: Partial<StrategyPerformanceMetrics>
  ): Promise<void> {
    const existing = this.metrics.get(strategyId);
    if (!existing) {
      throw new Error(`Metrics not found for strategy: ${strategyId}`);
    }

    const updated: StrategyPerformanceMetrics = {
      ...existing,
      ...updates,
      strategy_id: strategyId,
      updated_at: new Date(),
    };

    this.metrics.set(strategyId, updated);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'metrics_updated',
      timestamp: new Date(),
      strategy_id: strategyId,
      developer_id: '', // Unknown at this level
      data: { updates: Object.keys(updates) },
    });
  }

  // ============================================================================
  // Publishing Lifecycle
  // ============================================================================

  async publishStrategy(strategyId: string): Promise<StrategyMetadata> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status === 'published') {
      throw new Error('Strategy is already published');
    }

    if (strategy.status === 'deprecated') {
      throw new Error('Cannot publish a deprecated strategy');
    }

    const now = new Date();
    const published: StrategyMetadata = {
      ...strategy,
      status: 'published',
      updated_at: now,
      published_at: now,
    };

    this.strategies.set(strategyId, published);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'strategy_published',
      timestamp: now,
      strategy_id: strategyId,
      developer_id: strategy.author,
      data: { name: strategy.name },
    });

    return published;
  }

  async deprecateStrategy(strategyId: string): Promise<StrategyMetadata> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const deprecated: StrategyMetadata = {
      ...strategy,
      status: 'deprecated',
      updated_at: now,
    };

    this.strategies.set(strategyId, deprecated);

    // Mark all versions as deprecated
    const versions = this.versions.get(strategyId) ?? [];
    for (const v of versions) {
      v.deprecated = true;
    }

    this.emitEvent({
      id: this.generateId('event'),
      type: 'strategy_deprecated',
      timestamp: now,
      strategy_id: strategyId,
      developer_id: strategy.author,
      data: { name: strategy.name },
    });

    return deprecated;
  }

  async hideStrategy(strategyId: string): Promise<StrategyMetadata> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const hidden: StrategyMetadata = {
      ...strategy,
      status: 'hidden',
      updated_at: now,
    };

    this.strategies.set(strategyId, hidden);

    this.emitEvent({
      id: this.generateId('event'),
      type: 'strategy_hidden',
      timestamp: now,
      strategy_id: strategyId,
      developer_id: strategy.author,
      data: { name: strategy.name },
    });

    return hidden;
  }

  // ============================================================================
  // Discovery
  // ============================================================================

  async listPublishedStrategies(options?: {
    category?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<StrategyMetadata[]> {
    let results = Array.from(this.strategies.values()).filter(
      (s) => s.status === 'published'
    );

    if (options) {
      if (options.category) {
        results = results.filter((s) => s.category === options.category);
      }

      if (options.riskLevel) {
        results = results.filter((s) => s.risk_level === options.riskLevel);
      }

      // Sorting
      if (options.sortBy) {
        const order = options.sortOrder === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          switch (options.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name) * order;
            case 'created_at':
              return (a.created_at.getTime() - b.created_at.getTime()) * order;
            case 'published_at':
              return (
                ((a.published_at?.getTime() ?? 0) - (b.published_at?.getTime() ?? 0)) * order
              );
            default:
              return 0;
          }
        });
      }

      // Pagination
      const offset = options.offset ?? 0;
      const limit = options.limit ?? 50;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PublishingEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private createEmptyMetrics(strategyId: string): StrategyPerformanceMetrics {
    return {
      strategy_id: strategyId,
      agents_using: 0,
      avg_roi: 0,
      avg_drawdown: 0,
      trade_count: 0,
      avg_win_rate: 0,
      sharpe_ratio: 0,
      total_aum: 0,
      avg_rating: 0,
      rating_count: 0,
      updated_at: new Date(),
    };
  }

  private metadataToPackage(metadata: StrategyMetadata): StrategyPackage {
    return {
      strategy_id: metadata.strategy_id,
      name: metadata.name,
      description: metadata.description,
      version: metadata.version,
      author: metadata.author,
      author_name: metadata.author_name,
      supported_pairs: metadata.supported_pairs,
      risk_level: metadata.risk_level,
      category: metadata.category,
      recommended_capital: metadata.recommended_capital,
      execution_interval: metadata.execution_interval,
      tags: metadata.tags,
      parameters: metadata.parameters,
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(event: PublishingEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Registry Statistics (for admin/monitoring)
  // ============================================================================

  /**
   * Get registry statistics
   */
  getStats(): {
    totalStrategies: number;
    publishedStrategies: number;
    draftStrategies: number;
    deprecatedStrategies: number;
    totalDevelopers: number;
  } {
    const strategies = Array.from(this.strategies.values());
    const developers = new Set(strategies.map((s) => s.author));

    return {
      totalStrategies: strategies.length,
      publishedStrategies: strategies.filter((s) => s.status === 'published').length,
      draftStrategies: strategies.filter((s) => s.status === 'draft').length,
      deprecatedStrategies: strategies.filter((s) => s.status === 'deprecated').length,
      totalDevelopers: developers.size,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Strategy Registry Storage instance
 */
export function createStrategyRegistry(): InMemoryStrategyRegistry {
  return new InMemoryStrategyRegistry();
}

// ============================================================================
// Exports
// ============================================================================

// Note: StrategyRegistryStorage is already exported at declaration
