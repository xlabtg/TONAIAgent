/**
 * TONAIAgent - GAAMP Prime & Liquidity Layer
 *
 * Implements the Prime & Liquidity Layer of the Global Autonomous Asset Management Protocol.
 * Aggregates liquidity, provides smart routing across chains, and handles internal
 * capital netting to maximize capital efficiency.
 *
 * Capabilities:
 * - Liquidity pool aggregation (AMM, orderbook, RFQ, internal)
 * - AI-optimized smart routing across chains
 * - Internal capital netting
 * - Cross-chain capital flows
 * - Liquidity health monitoring
 */

import {
  FundId,
  AgentId,
  AssetId,
  ChainId,
  LiquidityPool,
  LiquidityPoolType,
  LiquidityRoute,
  RoutingAlgorithm,
  CapitalFlowRequest,
  CapitalFlowResult,
  InternalNettingResult,
  RouteHop,
  LiquidityLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LIQUIDITY_LAYER_CONFIG: LiquidityLayerConfig = {
  enableInternalNetting: true,
  smartRoutingEnabled: true,
  crossChainEnabled: true,
  defaultRoutingAlgorithm: 'ai_optimized',
  maxSlippagePercent: 1.0,
};

// ============================================================================
// Interfaces
// ============================================================================

export interface PrimeLiquidityLayer {
  readonly config: LiquidityLayerConfig;

  // Pool management
  registerPool(params: RegisterPoolParams): LiquidityPool;
  deregisterPool(poolId: string): void;
  getPool(poolId: string): LiquidityPool | undefined;
  listPools(filters?: PoolFilters): LiquidityPool[];
  updatePoolLiquidity(poolId: string, delta: number): LiquidityPool;

  // Smart routing
  findBestRoute(params: FindRouteParams): LiquidityRoute | null;
  estimateExecution(params: FindRouteParams): ExecutionEstimate;

  // Capital flows
  initiateCapitalFlow(request: CapitalFlowRequest): CapitalFlowResult;

  // Internal netting
  runInternalNetting(positions: NettingPosition[]): InternalNettingResult;

  // Liquidity health
  getSystemLiquidity(): SystemLiquidityMetrics;
  getLiquidityForAsset(assetId: AssetId, chain?: ChainId): number;

  onEvent(callback: GAMPEventCallback): void;
}

export interface RegisterPoolParams {
  name: string;
  type: LiquidityPoolType;
  assets: AssetId[];
  totalLiquidity: number;
  chain: ChainId;
  apy?: number;
}

export interface PoolFilters {
  type?: LiquidityPoolType;
  chain?: ChainId;
  asset?: AssetId;
  minLiquidity?: number;
  status?: LiquidityPool['status'];
}

export interface FindRouteParams {
  fromAsset: AssetId;
  toAsset: AssetId;
  fromChain: ChainId;
  toChain: ChainId;
  amount: number;
  algorithm?: RoutingAlgorithm;
  maxHops?: number;
  maxSlippage?: number;
}

export interface ExecutionEstimate {
  estimatedOutput: number;
  estimatedFees: number;
  estimatedTimeMs: number;
  priceImpact: number;
  routes: LiquidityRoute[];
}

export interface NettingPosition {
  fundId: FundId;
  asset: AssetId;
  chain: ChainId;
  amount: number;
  side: 'long' | 'short';
}

export interface SystemLiquidityMetrics {
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number;
  poolCount: number;
  assetCoverage: Record<AssetId, number>;
  chainCoverage: Record<ChainId, number>;
  generatedAt: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultPrimeLiquidityLayer implements PrimeLiquidityLayer {
  readonly config: LiquidityLayerConfig;
  private readonly pools: Map<string, LiquidityPool> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private poolCounter = 0;
  private flowCounter = 0;
  private nettingCounter = 0;

  constructor(config?: Partial<LiquidityLayerConfig>) {
    this.config = { ...DEFAULT_LIQUIDITY_LAYER_CONFIG, ...config };
  }

  // ============================================================================
  // Pool Management
  // ============================================================================

  registerPool(params: RegisterPoolParams): LiquidityPool {
    const id = `pool_${Date.now()}_${++this.poolCounter}`;

    const pool: LiquidityPool = {
      id,
      name: params.name,
      type: params.type,
      assets: params.assets,
      totalLiquidity: params.totalLiquidity,
      availableLiquidity: params.totalLiquidity,
      utilizationRate: 0,
      chain: params.chain,
      status: 'active',
      apy: params.apy ?? 0,
      createdAt: new Date(),
    };

    this.pools.set(id, pool);
    return pool;
  }

  deregisterPool(poolId: string): void {
    if (!this.pools.has(poolId)) {
      throw new Error(`Pool not found: ${poolId}`);
    }
    this.pools.delete(poolId);
  }

  getPool(poolId: string): LiquidityPool | undefined {
    return this.pools.get(poolId);
  }

  listPools(filters?: PoolFilters): LiquidityPool[] {
    let result = Array.from(this.pools.values());

    if (filters) {
      if (filters.type) result = result.filter(p => p.type === filters.type);
      if (filters.chain) result = result.filter(p => p.chain === filters.chain);
      if (filters.asset) result = result.filter(p => p.assets.includes(filters.asset!));
      if (filters.minLiquidity !== undefined) {
        result = result.filter(p => p.availableLiquidity >= filters.minLiquidity!);
      }
      if (filters.status) result = result.filter(p => p.status === filters.status);
    }

    return result;
  }

  updatePoolLiquidity(poolId: string, delta: number): LiquidityPool {
    const pool = this.requirePool(poolId);

    const newAvailable = pool.availableLiquidity + delta;
    if (newAvailable < 0) {
      throw new Error(
        `Insufficient pool liquidity: available=${pool.availableLiquidity}, requested=${Math.abs(delta)}`
      );
    }

    const updated: LiquidityPool = {
      ...pool,
      availableLiquidity: newAvailable,
      utilizationRate: (pool.totalLiquidity - newAvailable) / pool.totalLiquidity,
    };

    this.pools.set(poolId, updated);
    return updated;
  }

  // ============================================================================
  // Smart Routing
  // ============================================================================

  findBestRoute(params: FindRouteParams): LiquidityRoute | null {
    if (!this.config.smartRoutingEnabled) {
      return null;
    }

    const {
      fromAsset,
      toAsset,
      fromChain,
      toChain,
      amount,
      algorithm = this.config.defaultRoutingAlgorithm,
      maxHops = 3,
      maxSlippage = this.config.maxSlippagePercent / 100,
    } = params;

    // Find eligible pools for the trade
    const eligiblePools = this.listPools({
      status: 'active',
      minLiquidity: amount * 0.1,
    });

    if (eligiblePools.length === 0) {
      return null;
    }

    const hops = this.buildRouteHops(fromAsset, toAsset, fromChain, toChain, amount, eligiblePools);
    const totalOutput = hops.reduce((acc, h) => h.output, amount);
    const totalFees = hops.reduce((sum, h) => sum + h.fee, 0);
    const priceImpact = this.estimatePriceImpact(amount, eligiblePools);

    if (priceImpact > maxSlippage) {
      return null;
    }

    return {
      id: `route_${Date.now()}`,
      fromAsset,
      toAsset,
      fromChain,
      toChain,
      amount,
      estimatedOutput: totalOutput,
      priceImpact,
      fees: totalFees,
      hops,
      estimatedTimeMs: this.estimateTimeMs(fromChain, toChain, algorithm),
      algorithm,
    };
  }

  estimateExecution(params: FindRouteParams): ExecutionEstimate {
    const route = this.findBestRoute(params);

    if (!route) {
      return {
        estimatedOutput: 0,
        estimatedFees: 0,
        estimatedTimeMs: 0,
        priceImpact: 0,
        routes: [],
      };
    }

    return {
      estimatedOutput: route.estimatedOutput,
      estimatedFees: route.fees,
      estimatedTimeMs: route.estimatedTimeMs,
      priceImpact: route.priceImpact,
      routes: [route],
    };
  }

  // ============================================================================
  // Capital Flows
  // ============================================================================

  initiateCapitalFlow(request: CapitalFlowRequest): CapitalFlowResult {
    if (!this.config.crossChainEnabled && request.sourceChain !== request.targetChain) {
      return {
        requestId: request.requestId,
        success: false,
        error: 'Cross-chain capital flows are disabled',
      };
    }

    const route = this.findBestRoute({
      fromAsset: request.asset,
      toAsset: request.asset,
      fromChain: request.sourceChain,
      toChain: request.targetChain,
      amount: request.amount,
    });

    if (!route) {
      return {
        requestId: request.requestId,
        success: false,
        error: `No liquidity route found for ${request.amount} ${request.asset} from ${request.sourceChain} to ${request.targetChain}`,
      };
    }

    // Simulate consuming liquidity from pools
    const relevantPools = this.listPools({
      chain: request.sourceChain,
      asset: request.asset,
      minLiquidity: request.amount * 0.01,
    });

    let remaining = request.amount;
    for (const pool of relevantPools) {
      if (remaining <= 0) break;
      const consume = Math.min(remaining, pool.availableLiquidity * 0.5);
      this.updatePoolLiquidity(pool.id, -consume);
      remaining -= consume;
    }

    this.emitEvent('capital_routed', {
      requestId: request.requestId,
      asset: request.asset,
      amount: request.amount,
      sourceChain: request.sourceChain,
      targetChain: request.targetChain,
    });

    return {
      requestId: request.requestId,
      success: true,
      actualAmount: route.estimatedOutput,
      fees: route.fees,
      settledAt: new Date(),
    };
  }

  // ============================================================================
  // Internal Netting
  // ============================================================================

  runInternalNetting(positions: NettingPosition[]): InternalNettingResult {
    if (!this.config.enableInternalNetting) {
      return {
        nettingId: this.generateNettingId(),
        grossPositions: positions.length,
        netPositions: positions.length,
        capitalFreed: 0,
        tradesEliminated: 0,
        nettedAt: new Date(),
      };
    }

    // Group positions by asset + chain
    const groups = new Map<string, NettingPosition[]>();
    for (const pos of positions) {
      const key = `${pos.asset}:${pos.chain}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(pos);
    }

    let tradesEliminated = 0;
    let capitalFreed = 0;

    for (const [, group] of groups) {
      const longs = group.filter(p => p.side === 'long');
      const shorts = group.filter(p => p.side === 'short');

      const grossLong = longs.reduce((s, p) => s + p.amount, 0);
      const grossShort = shorts.reduce((s, p) => s + p.amount, 0);

      const netted = Math.min(grossLong, grossShort);
      capitalFreed += netted * 2;

      // Count eliminated trades
      const longCount = longs.length;
      const shortCount = shorts.length;
      tradesEliminated += Math.min(longCount, shortCount);
    }

    return {
      nettingId: this.generateNettingId(),
      grossPositions: positions.length,
      netPositions: positions.length - tradesEliminated,
      capitalFreed,
      tradesEliminated,
      nettedAt: new Date(),
    };
  }

  // ============================================================================
  // Liquidity Health
  // ============================================================================

  getSystemLiquidity(): SystemLiquidityMetrics {
    const pools = Array.from(this.pools.values());

    const totalLiquidity = pools.reduce((s, p) => s + p.totalLiquidity, 0);
    const availableLiquidity = pools.reduce((s, p) => s + p.availableLiquidity, 0);

    const assetCoverage: Record<AssetId, number> = {};
    const chainCoverage: Record<ChainId, number> = {};

    for (const pool of pools) {
      for (const asset of pool.assets) {
        assetCoverage[asset] = (assetCoverage[asset] ?? 0) + pool.availableLiquidity;
      }
      chainCoverage[pool.chain] = (chainCoverage[pool.chain] ?? 0) + pool.availableLiquidity;
    }

    return {
      totalLiquidity,
      availableLiquidity,
      utilizationRate: totalLiquidity > 0 ? (totalLiquidity - availableLiquidity) / totalLiquidity : 0,
      poolCount: pools.length,
      assetCoverage,
      chainCoverage,
      generatedAt: new Date(),
    };
  }

  getLiquidityForAsset(assetId: AssetId, chain?: ChainId): number {
    const pools = this.listPools({ asset: assetId, chain, status: 'active' });
    return pools.reduce((s, p) => s + p.availableLiquidity, 0);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private requirePool(poolId: string): LiquidityPool {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }
    return pool;
  }

  private buildRouteHops(
    fromAsset: AssetId,
    toAsset: AssetId,
    fromChain: ChainId,
    toChain: ChainId,
    amount: number,
    pools: LiquidityPool[]
  ): RouteHop[] {
    const hops: RouteHop[] = [];
    const feeRate = 0.003; // 0.3% typical swap fee

    if (fromChain === toChain) {
      // Single-chain swap
      const pool = pools.find(p => p.chain === fromChain) ?? pools[0];
      if (pool) {
        hops.push({
          poolId: pool.id,
          fromAsset,
          toAsset,
          chain: fromChain,
          amount,
          output: amount * (1 - feeRate),
          fee: amount * feeRate,
          protocol: pool.type,
        });
      }
    } else {
      // Cross-chain: source swap → bridge → destination swap
      const sourcePools = pools.filter(p => p.chain === fromChain);
      const destPools = pools.filter(p => p.chain === toChain);

      if (sourcePools.length > 0) {
        hops.push({
          poolId: sourcePools[0].id,
          fromAsset,
          toAsset: 'usdc',
          chain: fromChain,
          amount,
          output: amount * (1 - feeRate),
          fee: amount * feeRate,
          protocol: sourcePools[0].type,
        });
      }

      // Bridge hop
      const bridgeAmount = hops.length > 0 ? hops[hops.length - 1].output : amount;
      hops.push({
        poolId: `bridge_${fromChain}_${toChain}`,
        fromAsset: 'usdc',
        toAsset: 'usdc',
        chain: toChain,
        amount: bridgeAmount,
        output: bridgeAmount * 0.999,
        fee: bridgeAmount * 0.001,
        protocol: 'cross_chain_bridge',
      });

      if (destPools.length > 0) {
        const bridgeOut = hops[hops.length - 1].output;
        hops.push({
          poolId: destPools[0].id,
          fromAsset: 'usdc',
          toAsset,
          chain: toChain,
          amount: bridgeOut,
          output: bridgeOut * (1 - feeRate),
          fee: bridgeOut * feeRate,
          protocol: destPools[0].type,
        });
      }
    }

    return hops;
  }

  private estimatePriceImpact(amount: number, pools: LiquidityPool[]): number {
    const totalLiquidity = pools.reduce((s, p) => s + p.availableLiquidity, 0);
    if (totalLiquidity === 0) return 1;
    // Simple AMM price impact approximation
    return Math.min(amount / totalLiquidity, 1);
  }

  private estimateTimeMs(
    fromChain: ChainId,
    toChain: ChainId,
    algorithm: RoutingAlgorithm
  ): number {
    const baseMs = fromChain === toChain ? 3_000 : 60_000;
    const speedMultiplier = algorithm === 'fastest_settlement' ? 0.5 : 1;
    return baseMs * speedMultiplier;
  }

  private generateNettingId(): string {
    return `netting_${Date.now()}_${++this.nettingCounter}`;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
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

// ============================================================================
// Factory Function
// ============================================================================

export function createPrimeLiquidityLayer(
  config?: Partial<LiquidityLayerConfig>
): DefaultPrimeLiquidityLayer {
  return new DefaultPrimeLiquidityLayer(config);
}

export default DefaultPrimeLiquidityLayer;
