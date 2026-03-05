/**
 * TONAIAgent - AGFI Global Liquidity Fabric
 *
 * Extends the Liquidity Network and Inter-Protocol Liquidity Standard to provide
 * cross-chain liquidity, cross-protocol settlement, institutional corridors, and RWA bridges.
 * Enables seamless global capital movement with intelligent route optimization.
 *
 * This is Pillar 2 of the AI-native Global Financial Infrastructure (AGFI).
 */

import {
  LiquidityCorridor,
  CrossChainLiquidityRoute,
  InstitutionalLiquidityPool,
  RWALiquidityBridge,
  LiquidityCorridorId,
  InstitutionId,
  ChainId,
  GlobalLiquidityFabricConfig,
  AGFIEvent,
  AGFIEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LIQUIDITY_FABRIC_CONFIG: GlobalLiquidityFabricConfig = {
  enableCrossChainLiquidity: true,
  enableInstitutionalCorridors: true,
  enableRWABridges: true,
  maxCorridorFeePercent: 0.5,
  minLiquidityUtilizationTarget: 0.3,
  maxSingleExposurePercent: 20,
};

// ============================================================================
// Global Liquidity Fabric Interface
// ============================================================================

export interface GlobalLiquidityFabric {
  readonly config: GlobalLiquidityFabricConfig;

  // Liquidity Corridors
  openCorridor(params: OpenCorridorParams): LiquidityCorridor;
  getCorridor(id: LiquidityCorridorId): LiquidityCorridor | undefined;
  listCorridors(filters?: CorridorFilters): LiquidityCorridor[];
  updateCorridorLiquidity(id: LiquidityCorridorId, amount: number): LiquidityCorridor;
  suspendCorridor(id: LiquidityCorridorId, reason: string): void;
  closeCorridor(id: LiquidityCorridorId): void;

  // Liquidity Routing
  computeOptimalRoute(params: ComputeRouteParams): CrossChainLiquidityRoute;
  executeRoute(routeId: string): CrossChainLiquidityRoute;
  listRoutes(filters?: RouteFilters): CrossChainLiquidityRoute[];

  // Institutional Pools
  createInstitutionalPool(params: CreatePoolParams): InstitutionalLiquidityPool;
  getInstitutionalPool(id: string): InstitutionalLiquidityPool | undefined;
  listInstitutionalPools(): InstitutionalLiquidityPool[];
  addPoolParticipant(poolId: string, institutionId: InstitutionId, contribution: number): void;
  removePoolParticipant(poolId: string, institutionId: InstitutionId): void;

  // RWA Bridges
  registerRWABridge(params: RegisterRWABridgeParams): RWALiquidityBridge;
  getRWABridge(id: string): RWALiquidityBridge | undefined;
  listRWABridges(filters?: RWABridgeFilters): RWALiquidityBridge[];

  // Analytics
  getFabricMetrics(): LiquidityFabricMetrics;
  getChainLiquidityProfile(chain: ChainId): ChainLiquidityProfile;

  // Events
  onEvent(callback: AGFIEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface OpenCorridorParams {
  name: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  sourceProtocol: string;
  destinationProtocol: string;
  corridorType: LiquidityCorridor['corridorType'];
  initialLiquidity: number;
  feePercent?: number;
  maxSingleTransfer?: number;
  minSingleTransfer?: number;
}

export interface CorridorFilters {
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  corridorType?: LiquidityCorridor['corridorType'];
  status?: LiquidityCorridor['status'];
  minLiquidity?: number;
}

export interface ComputeRouteParams {
  sourceChain: ChainId;
  destinationChain: ChainId;
  asset: string;
  amount: number;
  optimizeFor?: 'speed' | 'cost' | 'liquidity';
}

export interface RouteFilters {
  sourceChain?: ChainId;
  destinationChain?: ChainId;
  status?: CrossChainLiquidityRoute['status'];
  optimizedFor?: string;
}

export interface CreatePoolParams {
  name: string;
  initialInstitutions: InstitutionId[];
  initialContributions: Record<InstitutionId, number>;
  internalBorrowRate?: number;
  internalLendRate?: number;
  utilizationTarget?: number;
}

export interface RegisterRWABridgeParams {
  rwaAssetId: string;
  rwaAssetName: string;
  custodian: string;
  onChainToken: string;
  onChainChain: ChainId;
  totalTokenized: number;
  redemptionTime: number;
  bridgeFee?: number;
}

export interface RWABridgeFilters {
  rwaType?: string;
  chain?: ChainId;
  status?: RWALiquidityBridge['status'];
}

export interface LiquidityFabricMetrics {
  totalLiquidity: number;
  activeLiquidity: number;
  utilizationRate: number;
  activeCorridors: number;
  totalCorridors: number;
  institutionalPools: number;
  rwaBridges: number;
  avgCorridorFee: number;
  avgRouteLatencyMs: number;
  topCorridorsByLiquidity: Array<{ corridorId: LiquidityCorridorId; name: string; liquidity: number }>;
  generatedAt: Date;
}

export interface ChainLiquidityProfile {
  chain: ChainId;
  totalLiquidity: number;
  inboundCorridors: number;
  outboundCorridors: number;
  dominantProtocols: string[];
  avgTransferFee: number;
  avgSettlementTimeMs: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGlobalLiquidityFabric implements GlobalLiquidityFabric {
  readonly config: GlobalLiquidityFabricConfig;

  private readonly corridors = new Map<LiquidityCorridorId, LiquidityCorridor>();
  private readonly routes = new Map<string, CrossChainLiquidityRoute>();
  private readonly institutionalPools = new Map<string, InstitutionalLiquidityPool>();
  private readonly rwaBridges = new Map<string, RWALiquidityBridge>();
  private readonly eventCallbacks: AGFIEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GlobalLiquidityFabricConfig>) {
    this.config = { ...DEFAULT_LIQUIDITY_FABRIC_CONFIG, ...config };
  }

  // ============================================================================
  // Liquidity Corridors
  // ============================================================================

  openCorridor(params: OpenCorridorParams): LiquidityCorridor {
    const corridor: LiquidityCorridor = {
      id: this.generateId('corr'),
      name: params.name,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      sourceProtocol: params.sourceProtocol,
      destinationProtocol: params.destinationProtocol,
      corridorType: params.corridorType,
      totalLiquidity: params.initialLiquidity,
      availableLiquidity: params.initialLiquidity,
      utilizationRate: 0,
      feePercent: params.feePercent ?? 0.1,
      estimatedLatencyMs: this.estimateLatency(params.corridorType),
      maxSingleTransfer: params.maxSingleTransfer ?? params.initialLiquidity * 0.1,
      minSingleTransfer: params.minSingleTransfer ?? 1000,
      status: 'active',
      openedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.corridors.set(corridor.id, corridor);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'liquidity_corridor_opened',
      severity: 'info',
      source: 'GlobalLiquidityFabric',
      message: `Liquidity corridor opened: ${params.sourceChain} → ${params.destinationChain} via ${params.corridorType}`,
      data: { corridorId: corridor.id, sourceChain: params.sourceChain, destinationChain: params.destinationChain, liquidity: params.initialLiquidity },
      timestamp: new Date(),
    });

    return corridor;
  }

  getCorridor(id: LiquidityCorridorId): LiquidityCorridor | undefined {
    return this.corridors.get(id);
  }

  listCorridors(filters?: CorridorFilters): LiquidityCorridor[] {
    let results = Array.from(this.corridors.values());

    if (filters?.sourceChain) results = results.filter(c => c.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) results = results.filter(c => c.destinationChain === filters.destinationChain);
    if (filters?.corridorType) results = results.filter(c => c.corridorType === filters.corridorType);
    if (filters?.status) results = results.filter(c => c.status === filters.status);
    if (filters?.minLiquidity !== undefined) results = results.filter(c => c.availableLiquidity >= filters.minLiquidity!);

    return results;
  }

  updateCorridorLiquidity(id: LiquidityCorridorId, amount: number): LiquidityCorridor {
    const corridor = this.corridors.get(id);
    if (!corridor) throw new Error(`Corridor not found: ${id}`);

    corridor.totalLiquidity += amount;
    corridor.availableLiquidity = Math.max(0, corridor.availableLiquidity + amount);
    corridor.utilizationRate = corridor.totalLiquidity > 0
      ? 1 - (corridor.availableLiquidity / corridor.totalLiquidity)
      : 0;
    corridor.lastActivityAt = new Date();

    return corridor;
  }

  suspendCorridor(id: LiquidityCorridorId, reason: string): void {
    const corridor = this.corridors.get(id);
    if (!corridor) throw new Error(`Corridor not found: ${id}`);

    corridor.status = 'suspended';

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'liquidity_corridor_closed',
      severity: 'warning',
      source: 'GlobalLiquidityFabric',
      message: `Liquidity corridor suspended: ${corridor.name}. Reason: ${reason}`,
      data: { corridorId: id, reason },
      timestamp: new Date(),
    });
  }

  closeCorridor(id: LiquidityCorridorId): void {
    const corridor = this.corridors.get(id);
    if (!corridor) throw new Error(`Corridor not found: ${id}`);

    this.corridors.delete(id);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'liquidity_corridor_closed',
      severity: 'info',
      source: 'GlobalLiquidityFabric',
      message: `Liquidity corridor closed: ${corridor.name}`,
      data: { corridorId: id },
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // Liquidity Routing
  // ============================================================================

  computeOptimalRoute(params: ComputeRouteParams): CrossChainLiquidityRoute {
    const optimizeFor = params.optimizeFor ?? 'cost';

    // Find viable corridors for the route
    const viableCorridors = this.listCorridors({
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      status: 'active',
      minLiquidity: params.amount,
    });

    // Sort based on optimization preference
    const sorted = [...viableCorridors].sort((a, b) => {
      if (optimizeFor === 'speed') return a.estimatedLatencyMs - b.estimatedLatencyMs;
      if (optimizeFor === 'cost') return a.feePercent - b.feePercent;
      return b.availableLiquidity - a.availableLiquidity; // 'liquidity'
    });

    const selectedCorridors = sorted.slice(0, 2); // Use up to 2 corridors
    const totalFee = selectedCorridors.reduce((sum, c) => sum + c.feePercent, 0);
    const totalLatency = selectedCorridors.reduce((sum, c) => sum + c.estimatedLatencyMs, 0);

    const route: CrossChainLiquidityRoute = {
      id: this.generateId('route'),
      corridors: selectedCorridors.map(c => c.id),
      totalHops: selectedCorridors.length,
      totalFeePercent: totalFee,
      estimatedTotalLatencyMs: totalLatency,
      amount: params.amount,
      asset: params.asset,
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      optimizedFor: optimizeFor,
      status: 'computed',
      computedAt: new Date(),
    };

    this.routes.set(route.id, route);
    return route;
  }

  executeRoute(routeId: string): CrossChainLiquidityRoute {
    const route = this.routes.get(routeId);
    if (!route) throw new Error(`Route not found: ${routeId}`);
    if (route.status !== 'computed') throw new Error(`Cannot execute route with status: ${route.status}`);

    route.status = 'executing';

    // Update corridor utilization
    for (const corridorId of route.corridors) {
      const corridor = this.corridors.get(corridorId);
      if (corridor) {
        corridor.availableLiquidity = Math.max(0, corridor.availableLiquidity - route.amount);
        corridor.utilizationRate = corridor.totalLiquidity > 0
          ? 1 - (corridor.availableLiquidity / corridor.totalLiquidity)
          : 0;
        corridor.lastActivityAt = new Date();
      }
    }

    route.status = 'completed';
    return route;
  }

  listRoutes(filters?: RouteFilters): CrossChainLiquidityRoute[] {
    let results = Array.from(this.routes.values());

    if (filters?.sourceChain) results = results.filter(r => r.sourceChain === filters.sourceChain);
    if (filters?.destinationChain) results = results.filter(r => r.destinationChain === filters.destinationChain);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    if (filters?.optimizedFor) results = results.filter(r => r.optimizedFor === filters.optimizedFor);

    return results;
  }

  // ============================================================================
  // Institutional Pools
  // ============================================================================

  createInstitutionalPool(params: CreatePoolParams): InstitutionalLiquidityPool {
    const contributions = params.initialContributions ?? {};
    const totalLiquidity = Object.values(contributions).reduce((sum, v) => sum + v, 0);

    const pool: InstitutionalLiquidityPool = {
      id: this.generateId('pool'),
      name: params.name,
      participatingInstitutions: [...params.initialInstitutions],
      totalLiquidity,
      availableLiquidity: totalLiquidity,
      reservedLiquidity: 0,
      assets: [],
      internalBorrowRate: params.internalBorrowRate ?? 0.03,
      internalLendRate: params.internalLendRate ?? 0.05,
      utilizationTarget: params.utilizationTarget ?? 0.8,
      currentUtilization: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.institutionalPools.set(pool.id, pool);
    return pool;
  }

  getInstitutionalPool(id: string): InstitutionalLiquidityPool | undefined {
    return this.institutionalPools.get(id);
  }

  listInstitutionalPools(): InstitutionalLiquidityPool[] {
    return Array.from(this.institutionalPools.values());
  }

  addPoolParticipant(poolId: string, institutionId: InstitutionId, contribution: number): void {
    const pool = this.institutionalPools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    if (!pool.participatingInstitutions.includes(institutionId)) {
      pool.participatingInstitutions.push(institutionId);
    }
    pool.totalLiquidity += contribution;
    pool.availableLiquidity += contribution;
    pool.updatedAt = new Date();
  }

  removePoolParticipant(poolId: string, institutionId: InstitutionId): void {
    const pool = this.institutionalPools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    pool.participatingInstitutions = pool.participatingInstitutions.filter(id => id !== institutionId);
    pool.updatedAt = new Date();
  }

  // ============================================================================
  // RWA Bridges
  // ============================================================================

  registerRWABridge(params: RegisterRWABridgeParams): RWALiquidityBridge {
    const bridge: RWALiquidityBridge = {
      id: this.generateId('rwa'),
      rwaAssetId: params.rwaAssetId,
      rwaAssetName: params.rwaAssetName,
      custodian: params.custodian,
      onChainToken: params.onChainToken,
      onChainChain: params.onChainChain,
      totalTokenized: params.totalTokenized,
      liquidityDepth: params.totalTokenized,
      redemptionTime: params.redemptionTime,
      bridgeFee: params.bridgeFee ?? 0.05,
      status: 'active',
    };

    this.rwaBridges.set(bridge.id, bridge);
    return bridge;
  }

  getRWABridge(id: string): RWALiquidityBridge | undefined {
    return this.rwaBridges.get(id);
  }

  listRWABridges(filters?: RWABridgeFilters): RWALiquidityBridge[] {
    let results = Array.from(this.rwaBridges.values());

    if (filters?.chain) results = results.filter(b => b.onChainChain === filters.chain);
    if (filters?.status) results = results.filter(b => b.status === filters.status);

    return results;
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  getFabricMetrics(): LiquidityFabricMetrics {
    const corridors = Array.from(this.corridors.values());
    const activeCorridors = corridors.filter(c => c.status === 'active');
    const totalLiquidity = corridors.reduce((sum, c) => sum + c.totalLiquidity, 0);
    const activeLiquidity = corridors.reduce((sum, c) => sum + c.availableLiquidity, 0);

    const avgFee = activeCorridors.length > 0
      ? activeCorridors.reduce((sum, c) => sum + c.feePercent, 0) / activeCorridors.length
      : 0;
    const avgLatency = activeCorridors.length > 0
      ? activeCorridors.reduce((sum, c) => sum + c.estimatedLatencyMs, 0) / activeCorridors.length
      : 0;

    const topCorridors = [...activeCorridors]
      .sort((a, b) => b.availableLiquidity - a.availableLiquidity)
      .slice(0, 5)
      .map(c => ({ corridorId: c.id, name: c.name, liquidity: c.availableLiquidity }));

    return {
      totalLiquidity,
      activeLiquidity,
      utilizationRate: totalLiquidity > 0 ? 1 - (activeLiquidity / totalLiquidity) : 0,
      activeCorridors: activeCorridors.length,
      totalCorridors: corridors.length,
      institutionalPools: this.institutionalPools.size,
      rwaBridges: this.rwaBridges.size,
      avgCorridorFee: avgFee,
      avgRouteLatencyMs: avgLatency,
      topCorridorsByLiquidity: topCorridors,
      generatedAt: new Date(),
    };
  }

  getChainLiquidityProfile(chain: ChainId): ChainLiquidityProfile {
    const inbound = this.listCorridors({ destinationChain: chain, status: 'active' });
    const outbound = this.listCorridors({ sourceChain: chain, status: 'active' });

    const allChainCorridors = [...inbound, ...outbound];
    const protocols = new Set<string>();
    allChainCorridors.forEach(c => {
      protocols.add(c.sourceProtocol);
      protocols.add(c.destinationProtocol);
    });

    const totalLiquidity = allChainCorridors.reduce((sum, c) => sum + c.availableLiquidity, 0);
    const avgFee = allChainCorridors.length > 0
      ? allChainCorridors.reduce((sum, c) => sum + c.feePercent, 0) / allChainCorridors.length
      : 0;
    const avgLatency = allChainCorridors.length > 0
      ? allChainCorridors.reduce((sum, c) => sum + c.estimatedLatencyMs, 0) / allChainCorridors.length
      : 0;

    return {
      chain,
      totalLiquidity,
      inboundCorridors: inbound.length,
      outboundCorridors: outbound.length,
      dominantProtocols: Array.from(protocols).slice(0, 5),
      avgTransferFee: avgFee,
      avgSettlementTimeMs: avgLatency,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFIEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private estimateLatency(corridorType: LiquidityCorridor['corridorType']): number {
    const latencyMap: Record<LiquidityCorridor['corridorType'], number> = {
      direct_bridge: 180000,         // 3 min
      atomic_swap: 60000,            // 1 min
      synthetic_routing: 30000,      // 30 sec
      institutional_corridor: 300000, // 5 min
      rwa_bridge: 3600000,           // 1 hour
      otc_settlement: 86400000,      // 24 hours
    };
    return latencyMap[corridorType] ?? 300000;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGlobalLiquidityFabric(
  config?: Partial<GlobalLiquidityFabricConfig>
): DefaultGlobalLiquidityFabric {
  return new DefaultGlobalLiquidityFabric(config);
}

export default DefaultGlobalLiquidityFabric;
