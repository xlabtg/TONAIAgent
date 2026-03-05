/**
 * ACMS Layer 3 — Liquidity Layer
 *
 * Institutional deep liquidity infrastructure for the ACMS:
 * liquidity aggregation from multiple sources, smart order routing,
 * internal liquidity pooling, and cross-chain liquidity management.
 * This layer connects the Asset Layer and Agent/Fund Layer to execution.
 */

import {
  AssetId,
  LiquiditySource,
  LiquiditySourceType,
  LiquidityPool,
  SmartOrderRoute,
  RouteSegment,
  OrderType,
  OrderSide,
  LiquidityLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
  ChainId,
} from './types';

// ============================================================================
// Liquidity Layer Interfaces
// ============================================================================

export interface LiquidityLayerManager {
  registerSource(params: RegisterSourceParams): LiquiditySource;
  deactivateSource(sourceId: string): void;
  getSource(sourceId: string): LiquiditySource | undefined;
  listSources(filters?: SourceFilters): LiquiditySource[];
  updateSourceTvl(sourceId: string, tvlUsd: number): void;

  createPool(params: CreatePoolParams): LiquidityPool;
  addLiquidityToPool(poolId: string, amountUsd: number): void;
  removeLiquidityFromPool(poolId: string, amountUsd: number): void;
  getPool(poolId: string): LiquidityPool | undefined;
  listPools(): LiquidityPool[];

  routeOrder(params: RouteOrderParams): SmartOrderRoute;
  executeRoute(routeId: string): RouteExecutionResult;
  getRoute(routeId: string): SmartOrderRoute | undefined;
  listRoutes(filters?: RouteFilters): SmartOrderRoute[];

  getLayerStatus(): LiquidityLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface RegisterSourceParams {
  type: LiquiditySourceType;
  name: string;
  chainId: ChainId;
  tvlUsd: number;
  dailyVolumeUsd: number;
  feeBps: number;
  latencyMs: number;
}

export interface SourceFilters {
  type?: LiquiditySourceType;
  chainId?: ChainId;
  isActive?: boolean;
  minTvlUsd?: number;
  maxFeeBps?: number;
}

export interface CreatePoolParams {
  name: string;
  assetIds: AssetId[];
  initialTvlUsd: number;
  targetApy: number;
}

export interface RouteOrderParams {
  assetIn: AssetId;
  assetOut: AssetId;
  amountIn: number;
  orderType: OrderType;
  side: OrderSide;
  maxSlippageBps: number;
  preferredSources?: string[];
}

export interface RouteExecutionResult {
  routeId: string;
  executed: boolean;
  executedAmountIn: number;
  executedAmountOut: number;
  actualSlippageBps: number;
  totalFeePaid: number;
  executionTimeMs: number;
}

export interface RouteFilters {
  assetIn?: AssetId;
  assetOut?: AssetId;
  orderType?: OrderType;
}

// ============================================================================
// Default Liquidity Layer Manager
// ============================================================================

export class DefaultLiquidityLayerManager implements LiquidityLayerManager {
  private readonly sources: Map<string, LiquiditySource> = new Map();
  private readonly pools: Map<string, LiquidityPool> = new Map();
  private readonly routes: Map<string, SmartOrderRoute> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  registerSource(params: RegisterSourceParams): LiquiditySource {
    const source: LiquiditySource = {
      id: this.generateId('src'),
      type: params.type,
      name: params.name,
      chainId: params.chainId,
      tvlUsd: params.tvlUsd,
      dailyVolumeUsd: params.dailyVolumeUsd,
      feeBps: params.feeBps,
      latencyMs: params.latencyMs,
      isActive: true,
    };
    this.sources.set(source.id, source);
    return source;
  }

  deactivateSource(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    this.sources.set(sourceId, { ...source, isActive: false });
  }

  getSource(sourceId: string): LiquiditySource | undefined {
    return this.sources.get(sourceId);
  }

  listSources(filters?: SourceFilters): LiquiditySource[] {
    let result = Array.from(this.sources.values());
    if (filters?.type) result = result.filter(s => s.type === filters.type);
    if (filters?.chainId) result = result.filter(s => s.chainId === filters.chainId);
    if (filters?.isActive !== undefined) result = result.filter(s => s.isActive === filters.isActive);
    if (filters?.minTvlUsd !== undefined) result = result.filter(s => s.tvlUsd >= filters.minTvlUsd!);
    if (filters?.maxFeeBps !== undefined) result = result.filter(s => s.feeBps <= filters.maxFeeBps!);
    return result;
  }

  updateSourceTvl(sourceId: string, tvlUsd: number): void {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    this.sources.set(sourceId, { ...source, tvlUsd });
  }

  createPool(params: CreatePoolParams): LiquidityPool {
    const pool: LiquidityPool = {
      id: this.generateId('pool'),
      name: params.name,
      assetIds: params.assetIds,
      tvlUsd: params.initialTvlUsd,
      utilizationRate: 0,
      apy: params.targetApy,
      participantCount: 0,
      createdAt: new Date(),
    };
    this.pools.set(pool.id, pool);
    return pool;
  }

  addLiquidityToPool(poolId: string, amountUsd: number): void {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);
    this.pools.set(poolId, {
      ...pool,
      tvlUsd: pool.tvlUsd + amountUsd,
      participantCount: pool.participantCount + 1,
    });
  }

  removeLiquidityFromPool(poolId: string, amountUsd: number): void {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool ${poolId} not found`);
    if (amountUsd > pool.tvlUsd) throw new Error('Insufficient liquidity in pool');
    const newTvl = pool.tvlUsd - amountUsd;
    const participantCount = Math.max(0, pool.participantCount - 1);
    this.pools.set(poolId, { ...pool, tvlUsd: newTvl, participantCount });
  }

  getPool(poolId: string): LiquidityPool | undefined {
    return this.pools.get(poolId);
  }

  listPools(): LiquidityPool[] {
    return Array.from(this.pools.values());
  }

  routeOrder(params: RouteOrderParams): SmartOrderRoute {
    // Smart order routing: split across active sources by TVL weight
    const activeSources = Array.from(this.sources.values()).filter(s => s.isActive);
    const preferredSources = params.preferredSources
      ? activeSources.filter(s => params.preferredSources!.includes(s.id))
      : activeSources;
    const sourcesForRouting = preferredSources.length > 0 ? preferredSources : activeSources;

    const totalTvl = sourcesForRouting.reduce((s, src) => s + src.tvlUsd, 0);
    const segments: RouteSegment[] = sourcesForRouting.slice(0, 3).map(src => {
      const weight = totalTvl > 0 ? src.tvlUsd / totalTvl : 1 / sourcesForRouting.length;
      const segmentAmountIn = params.amountIn * weight;
      // Apply slippage model: larger orders have higher slippage
      const slippageFactor = 1 - (segmentAmountIn / (src.tvlUsd + 1)) * 0.01;
      return {
        sourceId: src.id,
        sourceType: src.type,
        assetIn: params.assetIn,
        assetOut: params.assetOut,
        amountIn: segmentAmountIn,
        expectedAmountOut: segmentAmountIn * slippageFactor,
        weight,
      };
    });

    const totalFeeBps = sourcesForRouting.length > 0
      ? sourcesForRouting.slice(0, 3).reduce((s, src) => s + src.feeBps * (src.tvlUsd / (totalTvl || 1)), 0)
      : 30;
    const expectedAmountOut = segments.reduce((s, seg) => s + seg.expectedAmountOut, 0);
    const expectedSlippageBps = Math.round((params.amountIn - expectedAmountOut) / params.amountIn * 10000);

    const route: SmartOrderRoute = {
      id: this.generateId('route'),
      orderId: this.generateId('order'),
      assetIn: params.assetIn,
      assetOut: params.assetOut,
      amountIn: params.amountIn,
      expectedAmountOut,
      expectedSlippageBps: Math.max(0, expectedSlippageBps),
      routeSegments: segments,
      totalFeeBps,
      estimatedGasUsd: 0.1 * segments.length,
      estimatedExecutionMs: Math.max(...sourcesForRouting.slice(0, 3).map(s => s.latencyMs), 100),
      createdAt: new Date(),
    };
    this.routes.set(route.id, route);
    this.emitEvent('liquidity_routed', 3, {
      routeId: route.id,
      assetIn: route.assetIn,
      assetOut: route.assetOut,
      amountIn: route.amountIn,
    });
    return route;
  }

  executeRoute(routeId: string): RouteExecutionResult {
    const route = this.routes.get(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);
    // Simulate execution with slight variance
    const variance = 1 - Math.random() * 0.001;
    return {
      routeId,
      executed: true,
      executedAmountIn: route.amountIn,
      executedAmountOut: route.expectedAmountOut * variance,
      actualSlippageBps: Math.round(route.expectedSlippageBps * (1 + Math.random() * 0.1)),
      totalFeePaid: route.amountIn * route.totalFeeBps / 10000,
      executionTimeMs: route.estimatedExecutionMs,
    };
  }

  getRoute(routeId: string): SmartOrderRoute | undefined {
    return this.routes.get(routeId);
  }

  listRoutes(filters?: RouteFilters): SmartOrderRoute[] {
    let result = Array.from(this.routes.values());
    if (filters?.assetIn) result = result.filter(r => r.assetIn === filters.assetIn);
    if (filters?.assetOut) result = result.filter(r => r.assetOut === filters.assetOut);
    return result;
  }

  getLayerStatus(): LiquidityLayerStatus {
    const sources = Array.from(this.sources.values());
    const activeSources = sources.filter(s => s.isActive);
    const pools = Array.from(this.pools.values());
    return {
      totalSources: sources.length,
      activeSources: activeSources.length,
      totalTvlUsd: activeSources.reduce((s, src) => s + src.tvlUsd, 0),
      dailyVolumeUsd: activeSources.reduce((s, src) => s + src.dailyVolumeUsd, 0),
      averageSlippageBps: activeSources.length > 0
        ? activeSources.reduce((s, src) => s + src.feeBps, 0) / activeSources.length
        : 0,
      liquidityPools: pools.length,
      totalPoolTvlUsd: pools.reduce((s, p) => s + p.tvlUsd, 0),
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createLiquidityLayerManager(): DefaultLiquidityLayerManager {
  return new DefaultLiquidityLayerManager();
}
