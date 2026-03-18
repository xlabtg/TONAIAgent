/**
 * TONAIAgent - Liquidity Aggregation Layer
 *
 * Aggregates liquidity from on-chain DEXs, institutional OTC desks,
 * internal agent liquidity, and cross-chain bridges into unified pools
 * for institutional-grade capital routing.
 */

import {
  LiquiditySource,
  LiquiditySourceKind,
  LiquiditySourceStatus,
  LiquiditySourceMetrics,
  LiquiditySourceRoutingConfig,
  LiquiditySourceFees,
  LiquiditySourceLimits,
  AggregationPool,
  AggregationStrategy,
  LiquidityNetworkEvent,
  LiquidityNetworkEventCallback,
} from './types';

export interface CreateLiquiditySourceParams {
  name: string;
  kind: LiquiditySourceKind;
  supportedPairs?: string[];
  routing?: Partial<LiquiditySourceRoutingConfig>;
  fees?: Partial<LiquiditySourceFees>;
  limits?: Partial<LiquiditySourceLimits>;
  metadata?: Record<string, unknown>;
}

export interface UpdateLiquiditySourceParams {
  name?: string;
  status?: LiquiditySourceStatus;
  supportedPairs?: string[];
  routing?: Partial<LiquiditySourceRoutingConfig>;
  fees?: Partial<LiquiditySourceFees>;
  limits?: Partial<LiquiditySourceLimits>;
  metadata?: Record<string, unknown>;
}

export interface LiquiditySourceFilters {
  kinds?: LiquiditySourceKind[];
  statuses?: LiquiditySourceStatus[];
  hasPair?: string;
  minUptime?: number;
  maxSpread?: number;
}

export interface CreateAggregationPoolParams {
  name: string;
  sourceIds: string[];
  strategy?: AggregationStrategy;
}

export interface LiquidityAggregationManager {
  // Source management
  addSource(params: CreateLiquiditySourceParams): LiquiditySource;
  getSource(sourceId: string): LiquiditySource | undefined;
  updateSource(sourceId: string, params: UpdateLiquiditySourceParams): LiquiditySource;
  removeSource(sourceId: string): void;
  listSources(filters?: LiquiditySourceFilters): LiquiditySource[];
  activateSource(sourceId: string): void;
  deactivateSource(sourceId: string, reason?: string): void;
  updateSourceMetrics(sourceId: string, metrics: Partial<LiquiditySourceMetrics>): void;

  // Aggregation pool management
  createPool(params: CreateAggregationPoolParams): AggregationPool;
  getPool(poolId: string): AggregationPool | undefined;
  updatePool(poolId: string, params: { strategy?: AggregationStrategy; sourceIds?: string[] }): AggregationPool;
  removePool(poolId: string): void;
  listPools(): AggregationPool[];

  // Event handling
  onEvent(callback: LiquidityNetworkEventCallback): void;
}

export class DefaultLiquidityAggregationManager implements LiquidityAggregationManager {
  private sources: Map<string, LiquiditySource> = new Map();
  private pools: Map<string, AggregationPool> = new Map();
  private eventCallbacks: LiquidityNetworkEventCallback[] = [];

  addSource(params: CreateLiquiditySourceParams): LiquiditySource {
    const sourceId = this.generateId('src');
    const now = new Date();

    const source: LiquiditySource = {
      id: sourceId,
      name: params.name,
      kind: params.kind,
      status: 'pending',
      supportedPairs: params.supportedPairs ?? [],
      metrics: {
        totalVolume24h: '0',
        totalVolume7d: '0',
        averageSpread: 0,
        averageDepth: '0',
        fillRate: 0,
        averageSlippage: 0,
        uptime: 100,
        latencyMs: 0,
        lastTradeAt: now,
        updatedAt: now,
      },
      routing: {
        priority: 50,
        weight: 1,
        maxAllocationPercent: 100,
        minAllocationPercent: 0,
        excludedPairs: [],
        enableSmartRouting: true,
        ...params.routing,
      },
      fees: {
        makerFee: 0.001,
        takerFee: 0.002,
        settlementFee: 0,
        ...params.fees,
      },
      limits: {
        dailyLimit: '10000000',
        weeklyLimit: '50000000',
        monthlyLimit: '200000000',
        perTradeLimit: '1000000',
        maxExposure: '5000000',
        ...params.limits,
      },
      metadata: params.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.sources.set(sourceId, source);
    this.emitEvent('source_added', 'source', sourceId, { name: source.name, kind: source.kind });
    return source;
  }

  getSource(sourceId: string): LiquiditySource | undefined {
    return this.sources.get(sourceId);
  }

  updateSource(sourceId: string, params: UpdateLiquiditySourceParams): LiquiditySource {
    const source = this.requireSource(sourceId);
    const updated: LiquiditySource = {
      ...source,
      name: params.name ?? source.name,
      status: params.status ?? source.status,
      supportedPairs: params.supportedPairs ?? source.supportedPairs,
      routing: params.routing ? { ...source.routing, ...params.routing } : source.routing,
      fees: params.fees ? { ...source.fees, ...params.fees } : source.fees,
      limits: params.limits ? { ...source.limits, ...params.limits } : source.limits,
      metadata: params.metadata ? { ...source.metadata, ...params.metadata } : source.metadata,
      updatedAt: new Date(),
    };
    this.sources.set(sourceId, updated);
    this.emitEvent('source_updated', 'source', sourceId, { updates: params });
    return updated;
  }

  removeSource(sourceId: string): void {
    const source = this.requireSource(sourceId);
    // Remove from any pools
    for (const pool of this.pools.values()) {
      pool.sourceIds = pool.sourceIds.filter(id => id !== sourceId);
    }
    this.sources.delete(sourceId);
    this.emitEvent('source_removed', 'source', sourceId, { name: source.name });
  }

  listSources(filters?: LiquiditySourceFilters): LiquiditySource[] {
    let sources = Array.from(this.sources.values());
    if (!filters) return sources;

    if (filters.kinds?.length) {
      sources = sources.filter(s => filters.kinds!.includes(s.kind));
    }
    if (filters.statuses?.length) {
      sources = sources.filter(s => filters.statuses!.includes(s.status));
    }
    if (filters.hasPair) {
      sources = sources.filter(s => s.supportedPairs.includes(filters.hasPair!));
    }
    if (filters.minUptime !== undefined) {
      sources = sources.filter(s => s.metrics.uptime >= filters.minUptime!);
    }
    if (filters.maxSpread !== undefined) {
      sources = sources.filter(s => s.metrics.averageSpread <= filters.maxSpread!);
    }
    return sources;
  }

  activateSource(sourceId: string): void {
    const source = this.requireSource(sourceId);
    source.status = 'active';
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
    this.emitEvent('source_activated', 'source', sourceId, {});
  }

  deactivateSource(sourceId: string, reason?: string): void {
    const source = this.requireSource(sourceId);
    source.status = 'inactive';
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
    this.emitEvent('source_deactivated', 'source', sourceId, { reason });
  }

  updateSourceMetrics(sourceId: string, metrics: Partial<LiquiditySourceMetrics>): void {
    const source = this.requireSource(sourceId);
    source.metrics = { ...source.metrics, ...metrics, updatedAt: new Date() };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  createPool(params: CreateAggregationPoolParams): AggregationPool {
    // Validate all source IDs exist
    for (const sid of params.sourceIds) {
      this.requireSource(sid);
    }
    const poolId = this.generateId('pool');
    const now = new Date();
    const pool: AggregationPool = {
      id: poolId,
      name: params.name,
      sourceIds: params.sourceIds,
      strategy: params.strategy ?? 'best_execution',
      totalLiquidity: this.calculatePoolLiquidity(params.sourceIds),
      weightedSpread: this.calculateWeightedSpread(params.sourceIds),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.pools.set(poolId, pool);
    this.emitEvent('pool_created', 'pool', poolId, { name: pool.name, strategy: pool.strategy });
    return pool;
  }

  getPool(poolId: string): AggregationPool | undefined {
    return this.pools.get(poolId);
  }

  updatePool(
    poolId: string,
    params: { strategy?: AggregationStrategy; sourceIds?: string[] }
  ): AggregationPool {
    const pool = this.requirePool(poolId);
    if (params.sourceIds) {
      for (const sid of params.sourceIds) {
        this.requireSource(sid);
      }
    }
    const updatedSourceIds = params.sourceIds ?? pool.sourceIds;
    const updated: AggregationPool = {
      ...pool,
      strategy: params.strategy ?? pool.strategy,
      sourceIds: updatedSourceIds,
      totalLiquidity: this.calculatePoolLiquidity(updatedSourceIds),
      weightedSpread: this.calculateWeightedSpread(updatedSourceIds),
      updatedAt: new Date(),
    };
    this.pools.set(poolId, updated);
    this.emitEvent('pool_updated', 'pool', poolId, { updates: params });
    return updated;
  }

  removePool(poolId: string): void {
    this.requirePool(poolId);
    this.pools.delete(poolId);
  }

  listPools(): AggregationPool[] {
    return Array.from(this.pools.values());
  }

  onEvent(callback: LiquidityNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private requireSource(sourceId: string): LiquiditySource {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Liquidity source not found: ${sourceId}`);
    return source;
  }

  private requirePool(poolId: string): AggregationPool {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Aggregation pool not found: ${poolId}`);
    return pool;
  }

  private calculatePoolLiquidity(sourceIds: string[]): string {
    let total = 0;
    for (const sid of sourceIds) {
      const source = this.sources.get(sid);
      if (source?.status === 'active') {
        total += parseFloat(source.limits.maxExposure) || 0;
      }
    }
    return total.toString();
  }

  private calculateWeightedSpread(sourceIds: string[]): number {
    const activeSources = sourceIds
      .map(sid => this.sources.get(sid))
      .filter((s): s is LiquiditySource => s?.status === 'active');
    if (activeSources.length === 0) return 0;
    const sumSpread = activeSources.reduce((sum, s) => sum + s.metrics.averageSpread, 0);
    return sumSpread / activeSources.length;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private emitEvent(
    type: LiquidityNetworkEvent['type'],
    entityKind: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const event: LiquidityNetworkEvent = {
      id: this.generateId('evt'),
      type,
      entityId,
      entityKind,
      payload,
      timestamp: new Date(),
    };
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export function createLiquidityAggregationManager(): DefaultLiquidityAggregationManager {
  return new DefaultLiquidityAggregationManager();
}
