/**
 * TONAIAgent - Institutional Liquidity Network Manager
 *
 * Manages the liquidity network for institutional trading including exchanges,
 * AMMs, OTC desks, market makers, and aggregated liquidity. Provides smart
 * routing, capital routing, institutional-grade trade execution, and
 * comprehensive liquidity analytics.
 */

import {
  LiquiditySource,
  LiquiditySourceType,
  LiquiditySourceConfig,
  LiquidityMetrics,
  RoutingConfig,
  FeeStructure,
  LiquidityLimits,
  TradingPair,
  VolumeDiscount,
  Rebate,
  LiquidityAggregator,
  AggregationStrategy,
  SmartRoutingConfig,
  ExecutionConfig,
  AggregatorRiskLimits,
  AggregatorMetrics,
  LiquidityNetworkConfig,
  LiquidityNetworkMetrics,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface LiquidityNetworkManager {
  // Liquidity Source CRUD
  addLiquiditySource(request: AddLiquiditySourceRequest): Promise<LiquiditySource>;
  getLiquiditySource(sourceId: string): Promise<LiquiditySource | null>;
  updateLiquiditySource(sourceId: string, updates: LiquiditySourceUpdates): Promise<LiquiditySource>;
  removeLiquiditySource(sourceId: string): Promise<void>;

  // Liquidity Source queries
  listLiquiditySources(filters?: LiquiditySourceFilters): Promise<LiquiditySource[]>;
  getSourcesByType(type: LiquiditySourceType): Promise<LiquiditySource[]>;
  getActiveSources(): Promise<LiquiditySource[]>;
  searchSources(query: string): Promise<LiquiditySource[]>;

  // Liquidity Source status management
  activateSource(sourceId: string): Promise<void>;
  deactivateSource(sourceId: string, reason: string): Promise<void>;
  suspendSource(sourceId: string, reason: string, duration?: number): Promise<void>;
  getSourceMetrics(sourceId: string): Promise<LiquidityMetrics>;

  // Routing configuration
  updateRoutingConfig(sourceId: string, routing: Partial<RoutingConfig>): Promise<void>;
  getRoutingConfig(sourceId: string): Promise<RoutingConfig>;
  setSourcePriority(sourceId: string, priority: number): Promise<void>;
  setSourceWeight(sourceId: string, weight: number): Promise<void>;

  // Fee management
  updateFeeStructure(sourceId: string, fees: Partial<FeeStructure>): Promise<void>;
  getFeeStructure(sourceId: string): Promise<FeeStructure>;
  addVolumeDiscount(sourceId: string, discount: VolumeDiscount): Promise<void>;
  addRebate(sourceId: string, rebate: Rebate): Promise<void>;

  // Trading pairs management
  addTradingPair(sourceId: string, pair: TradingPair): Promise<void>;
  updateTradingPair(sourceId: string, symbol: string, updates: Partial<TradingPair>): Promise<void>;
  removeTradingPair(sourceId: string, symbol: string): Promise<void>;
  getSupportedPairs(sourceId: string): Promise<TradingPair[]>;

  // Liquidity limits
  updateLimits(sourceId: string, limits: Partial<LiquidityLimits>): Promise<void>;
  getLimits(sourceId: string): Promise<LiquidityLimits>;
  checkLimitAvailability(sourceId: string, amount: string): Promise<LimitAvailability>;

  // Aggregator management
  createAggregator(config: CreateAggregatorRequest): Promise<LiquidityAggregator>;
  getAggregator(aggregatorId: string): Promise<LiquidityAggregator | null>;
  updateAggregator(aggregatorId: string, updates: AggregatorUpdates): Promise<LiquidityAggregator>;
  removeAggregator(aggregatorId: string): Promise<void>;
  listAggregators(): Promise<LiquidityAggregator[]>;

  // Smart routing
  getOptimalRoute(trade: TradeRequest): Promise<OptimalRoute>;
  simulateRoute(trade: TradeRequest, route: OptimalRoute): Promise<RouteSimulation>;
  validateRoute(route: OptimalRoute): Promise<RouteValidation>;

  // Trade execution
  executeTrade(trade: TradeRequest): Promise<TradeExecution>;
  executeWithRoute(trade: TradeRequest, route: OptimalRoute): Promise<TradeExecution>;
  cancelTrade(tradeId: string): Promise<void>;
  getTradeStatus(tradeId: string): Promise<TradeStatus>;

  // Network analytics
  getNetworkLiquidity(): Promise<NetworkLiquidityReport>;
  getSpreadAnalysis(): Promise<SpreadAnalysis>;
  getDepthAnalysis(pair: string): Promise<DepthAnalysis>;
  getVolumeAnalysis(period: string): Promise<VolumeAnalysis>;
  getLiquidityHealth(): Promise<LiquidityHealthReport>;

  // Metrics and monitoring
  updateSourceMetrics(sourceId: string, metrics: Partial<LiquidityMetrics>): Promise<void>;
  getAggregatorMetrics(aggregatorId: string): Promise<AggregatorMetrics>;
  getNetworkMetrics(): Promise<LiquidityNetworkMetrics>;
  getSourcePerformance(sourceId: string, period: string): Promise<SourcePerformanceReport>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;

  // Health check
  getHealth(): LiquidityNetworkHealth;
}

export interface AddLiquiditySourceRequest {
  name: string;
  type: LiquiditySourceType;
  partnerId?: string;
  configuration: Partial<LiquiditySourceConfig>;
  pairs?: TradingPair[];
  routing?: Partial<RoutingConfig>;
  fees?: Partial<FeeStructure>;
  limits?: Partial<LiquidityLimits>;
  metadata?: Record<string, unknown>;
}

export interface LiquiditySourceUpdates {
  name?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  configuration?: Partial<LiquiditySourceConfig>;
  routing?: Partial<RoutingConfig>;
  fees?: Partial<FeeStructure>;
  limits?: Partial<LiquidityLimits>;
  metadata?: Record<string, unknown>;
}

export interface LiquiditySourceFilters {
  types?: LiquiditySourceType[];
  statuses?: ('active' | 'inactive' | 'pending' | 'suspended')[];
  partnerIds?: string[];
  minVolume?: string;
  maxSpread?: number;
  minUptime?: number;
  hasPair?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LimitAvailability {
  available: boolean;
  dailyRemaining: string;
  weeklyRemaining: string;
  monthlyRemaining: string;
  perTradeRemaining: string;
  restrictions?: string[];
}

export interface CreateAggregatorRequest {
  name: string;
  sourceIds: string[];
  strategy: Partial<AggregationStrategy>;
  routing?: Partial<SmartRoutingConfig>;
  execution?: Partial<ExecutionConfig>;
  riskLimits?: Partial<AggregatorRiskLimits>;
  metadata?: Record<string, unknown>;
}

export interface AggregatorUpdates {
  name?: string;
  sourceIds?: string[];
  strategy?: Partial<AggregationStrategy>;
  routing?: Partial<SmartRoutingConfig>;
  execution?: Partial<ExecutionConfig>;
  riskLimits?: Partial<AggregatorRiskLimits>;
  status?: 'active' | 'paused' | 'maintenance';
  metadata?: Record<string, unknown>;
}

export interface TradeRequest {
  id?: string;
  pair: string;
  side: 'buy' | 'sell';
  amount: string;
  orderType: 'market' | 'limit' | 'ioc' | 'fok' | 'twap' | 'vwap';
  limitPrice?: string;
  slippageTolerance?: number;
  timeInForce?: 'gtc' | 'ioc' | 'fok' | 'day';
  preferredSources?: string[];
  excludedSources?: string[];
  aggregatorId?: string;
  clientOrderId?: string;
  metadata?: Record<string, unknown>;
}

export interface OptimalRoute {
  id: string;
  trade: TradeRequest;
  legs: RouteLeg[];
  estimatedPrice: string;
  estimatedFees: string;
  estimatedSlippage: number;
  totalAmount: string;
  confidence: number;
  validUntil: Date;
  alternatives: AlternativeRoute[];
}

export interface RouteLeg {
  sourceId: string;
  sourceName: string;
  sourceType: LiquiditySourceType;
  amount: string;
  percentage: number;
  estimatedPrice: string;
  estimatedFees: string;
  estimatedLatency: number;
  priority: number;
}

export interface AlternativeRoute {
  legs: RouteLeg[];
  estimatedPrice: string;
  estimatedFees: string;
  estimatedSlippage: number;
  reason: string;
}

export interface RouteSimulation {
  route: OptimalRoute;
  simulatedPrice: string;
  simulatedFees: string;
  simulatedSlippage: number;
  priceImpact: number;
  fillProbability: number;
  executionRisk: 'low' | 'medium' | 'high';
  warnings: string[];
  timestamp: Date;
}

export interface RouteValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sourcesAvailable: boolean;
  liquidityAvailable: boolean;
  limitsOk: boolean;
  complianceOk: boolean;
}

export interface TradeExecution {
  id: string;
  trade: TradeRequest;
  route: OptimalRoute;
  status: TradeExecutionStatus;
  fills: TradeFill[];
  totalFilled: string;
  totalFees: string;
  averagePrice: string;
  slippage: number;
  executionTime: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type TradeExecutionStatus =
  | 'pending'
  | 'routing'
  | 'executing'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'failed'
  | 'expired';

export interface TradeFill {
  id: string;
  legIndex: number;
  sourceId: string;
  amount: string;
  price: string;
  fees: string;
  timestamp: Date;
}

export interface TradeStatus {
  tradeId: string;
  status: TradeExecutionStatus;
  filledAmount: string;
  remainingAmount: string;
  averagePrice: string;
  totalFees: string;
  lastUpdate: Date;
}

export interface NetworkLiquidityReport {
  timestamp: Date;
  totalLiquidity: string;
  liquidityBySource: Record<string, string>;
  liquidityByType: Record<LiquiditySourceType, string>;
  liquidityByPair: Record<string, PairLiquidity>;
  topSources: SourceLiquiditySummary[];
  trends: LiquidityTrend[];
}

export interface PairLiquidity {
  pair: string;
  totalLiquidity: string;
  bidLiquidity: string;
  askLiquidity: string;
  spread: number;
  depth: DepthLevel[];
  lastUpdated: Date;
}

export interface DepthLevel {
  price: string;
  amount: string;
  total: string;
}

export interface SourceLiquiditySummary {
  sourceId: string;
  sourceName: string;
  sourceType: LiquiditySourceType;
  totalLiquidity: string;
  pairCount: number;
  spread: number;
  volume24h: string;
}

export interface LiquidityTrend {
  period: string;
  liquidity: string;
  change: number;
  changePercent: number;
}

export interface SpreadAnalysis {
  timestamp: Date;
  overallAverageSpread: number;
  spreadByPair: Record<string, PairSpreadAnalysis>;
  spreadBySource: Record<string, number>;
  bestSpreads: BestSpread[];
  spreadTrends: SpreadTrend[];
}

export interface PairSpreadAnalysis {
  pair: string;
  averageSpread: number;
  minSpread: number;
  maxSpread: number;
  medianSpread: number;
  volatility: number;
  bestSource: string;
}

export interface BestSpread {
  pair: string;
  sourceId: string;
  sourceName: string;
  spread: number;
  lastUpdated: Date;
}

export interface SpreadTrend {
  period: string;
  averageSpread: number;
  change: number;
}

export interface DepthAnalysis {
  pair: string;
  timestamp: Date;
  bidDepth: DepthLevel[];
  askDepth: DepthLevel[];
  totalBidVolume: string;
  totalAskVolume: string;
  imbalance: number;
  depthBySource: Record<string, SourceDepth>;
  priceImpactAnalysis: PriceImpactAnalysis;
}

export interface SourceDepth {
  sourceId: string;
  sourceName: string;
  bidDepth: string;
  askDepth: string;
  contribution: number;
}

export interface PriceImpactAnalysis {
  buyImpact: ImpactLevel[];
  sellImpact: ImpactLevel[];
}

export interface ImpactLevel {
  amount: string;
  estimatedPrice: string;
  priceImpact: number;
  slippage: number;
}

export interface VolumeAnalysis {
  period: string;
  timestamp: Date;
  totalVolume: string;
  volumeByPair: Record<string, string>;
  volumeBySource: Record<string, string>;
  volumeByHour: Record<number, string>;
  topPairs: PairVolumeSummary[];
  topSources: SourceVolumeSummary[];
  trends: VolumeTrend[];
}

export interface PairVolumeSummary {
  pair: string;
  volume: string;
  trades: number;
  averageSize: string;
}

export interface SourceVolumeSummary {
  sourceId: string;
  sourceName: string;
  volume: string;
  trades: number;
  marketShare: number;
}

export interface VolumeTrend {
  period: string;
  volume: string;
  change: number;
  changePercent: number;
}

export interface LiquidityHealthReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  healthScore: number;
  sourceHealth: SourceHealthStatus[];
  aggregatorHealth: AggregatorHealthStatus[];
  alerts: LiquidityAlert[];
  recommendations: string[];
}

export interface SourceHealthStatus {
  sourceId: string;
  sourceName: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  uptime: number;
  latency: number;
  fillRate: number;
  lastCheck: Date;
  issues: string[];
}

export interface AggregatorHealthStatus {
  aggregatorId: string;
  aggregatorName: string;
  status: 'active' | 'paused' | 'maintenance';
  sourcesHealthy: number;
  sourcesTotal: number;
  performance: 'optimal' | 'suboptimal' | 'degraded';
}

export interface LiquidityAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  sourceId?: string;
  pair?: string;
  timestamp: Date;
  resolved: boolean;
}

export interface SourcePerformanceReport {
  sourceId: string;
  sourceName: string;
  period: string;
  metrics: {
    totalVolume: string;
    totalTrades: number;
    averageTradeSize: string;
    fillRate: number;
    averageSlippage: number;
    averageLatency: number;
    uptime: number;
    errorRate: number;
  };
  trends: {
    volumeTrend: 'up' | 'down' | 'stable';
    volumeChange: number;
    fillRateTrend: 'up' | 'down' | 'stable';
    latencyTrend: 'up' | 'down' | 'stable';
  };
  comparison: {
    vsTypeAverage: number;
    vsNetworkAverage: number;
    ranking: number;
    totalSources: number;
  };
  highlights: string[];
  concerns: string[];
}

export interface LiquidityNetworkHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  sourceCount: number;
  activeSources: number;
  aggregatorCount: number;
  lastHealthCheck: Date;
  issues: string[];
}

// ============================================================================
// Type Aliases for API Compatibility
// ============================================================================

/** Alias for AddLiquiditySourceRequest for API compatibility */
export type CreateLiquiditySourceRequest = AddLiquiditySourceRequest;

/** Alias for TradeExecution for API compatibility */
export type TradeResult = TradeExecution;

/** Alias for RouteLeg for API compatibility */
export type RouteStep = RouteLeg;

/** Alias for LiquidityNetworkHealth for API compatibility */
export type LiquidityHealth = LiquidityNetworkHealth;

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultLiquidityNetworkManager implements LiquidityNetworkManager {
  private sources: Map<string, LiquiditySource> = new Map();
  private aggregators: Map<string, LiquidityAggregator> = new Map();
  private trades: Map<string, TradeExecution> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: LiquidityNetworkConfig;
  private lastHealthCheck: Date = new Date();

  constructor(config?: Partial<LiquidityNetworkConfig>) {
    this.config = {
      enabled: true,
      aggregationEnabled: true,
      defaultRoutingStrategy: 'best_execution',
      maxSlippage: 0.01,
      minLiquidityThreshold: '1000',
      healthCheckInterval: 30000,
      ...config,
    };
  }

  async addLiquiditySource(request: AddLiquiditySourceRequest): Promise<LiquiditySource> {
    const sourceId = this.generateId('source');

    const source: LiquiditySource = {
      id: sourceId,
      name: request.name,
      type: request.type,
      partnerId: request.partnerId,
      status: 'pending',
      configuration: {
        connectionType: 'rest',
        authentication: 'api_key',
        rateLimit: 100,
        timeout: 5000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          backoffMultiplier: 2,
          maxBackoffMs: 10000,
        },
        healthCheckInterval: 30000,
        ...request.configuration,
      },
      pairs: request.pairs || [],
      metrics: {
        totalVolume24h: '0',
        totalVolume30d: '0',
        averageSpread: 0,
        averageDepth: '0',
        fillRate: 0,
        averageSlippage: 0,
        uptime: 100,
        latencyMs: 0,
        lastTradeAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      routing: {
        priority: 50,
        weight: 1,
        maxAllocation: 100,
        minAllocation: 0,
        excludedPairs: [],
        smartRouting: true,
        priceImprovement: true,
        antiGaming: true,
        ...request.routing,
      },
      fees: {
        makerFee: 0.001,
        takerFee: 0.002,
        volumeDiscounts: [],
        rebates: [],
        settlementFee: 0,
        withdrawalFee: {},
        ...request.fees,
      },
      limits: {
        dailyLimit: '10000000',
        weeklyLimit: '50000000',
        monthlyLimit: '200000000',
        perTradeLimit: '1000000',
        exposureLimit: '5000000',
        concentrationLimit: 25,
        ...request.limits,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sources.set(sourceId, source);
    this.emitEvent('liquidity_added', 'liquidity', sourceId, 'add_source', { source });

    return source;
  }

  async getLiquiditySource(sourceId: string): Promise<LiquiditySource | null> {
    return this.sources.get(sourceId) || null;
  }

  async updateLiquiditySource(
    sourceId: string,
    updates: LiquiditySourceUpdates
  ): Promise<LiquiditySource> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    const updatedSource: LiquiditySource = {
      ...source,
      ...updates,
      configuration: updates.configuration
        ? { ...source.configuration, ...updates.configuration }
        : source.configuration,
      routing: updates.routing ? { ...source.routing, ...updates.routing } : source.routing,
      fees: updates.fees ? { ...source.fees, ...updates.fees } : source.fees,
      limits: updates.limits ? { ...source.limits, ...updates.limits } : source.limits,
      updatedAt: new Date(),
    };

    this.sources.set(sourceId, updatedSource);
    this.emitEvent('liquidity_added', 'liquidity', sourceId, 'update_source', { updates });

    return updatedSource;
  }

  async removeLiquiditySource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    // Remove from any aggregators
    Array.from(this.aggregators.values()).forEach((aggregator) => {
      aggregator.sources = aggregator.sources.filter((id) => id !== sourceId);
    });

    this.sources.delete(sourceId);
    this.emitEvent('liquidity_removed', 'liquidity', sourceId, 'remove_source', {
      sourceName: source.name,
    });
  }

  async listLiquiditySources(filters?: LiquiditySourceFilters): Promise<LiquiditySource[]> {
    let sources = Array.from(this.sources.values());

    if (filters) {
      if (filters.types?.length) {
        sources = sources.filter((s) => filters.types!.includes(s.type));
      }
      if (filters.statuses?.length) {
        sources = sources.filter((s) => filters.statuses!.includes(s.status));
      }
      if (filters.partnerIds?.length) {
        sources = sources.filter((s) => s.partnerId && filters.partnerIds!.includes(s.partnerId));
      }
      if (filters.minVolume) {
        const minVol = BigInt(filters.minVolume);
        sources = sources.filter((s) => {
          try {
            return BigInt(s.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0') >= minVol;
          } catch {
            return false;
          }
        });
      }
      if (filters.maxSpread !== undefined) {
        sources = sources.filter((s) => s.metrics.averageSpread <= filters.maxSpread!);
      }
      if (filters.minUptime !== undefined) {
        sources = sources.filter((s) => s.metrics.uptime >= filters.minUptime!);
      }
      if (filters.hasPair) {
        sources = sources.filter((s) => s.pairs.some((p) => p.symbol === filters.hasPair));
      }

      // Sorting
      if (filters.sortBy) {
        sources.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!) as number | string;
          const bVal = this.getNestedValue(b, filters.sortBy!) as number | string;
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        sources = sources.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        sources = sources.slice(0, filters.limit);
      }
    }

    return sources;
  }

  async getSourcesByType(type: LiquiditySourceType): Promise<LiquiditySource[]> {
    return this.listLiquiditySources({ types: [type] });
  }

  async getActiveSources(): Promise<LiquiditySource[]> {
    return this.listLiquiditySources({ statuses: ['active'] });
  }

  async searchSources(query: string): Promise<LiquiditySource[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.sources.values()).filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.type.toLowerCase().includes(lowerQuery) ||
        s.pairs.some((p) => p.symbol.toLowerCase().includes(lowerQuery))
    );
  }

  async activateSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.status = 'active';
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);

    this.emitEvent('liquidity_added', 'liquidity', sourceId, 'activate_source', {});
  }

  async deactivateSource(sourceId: string, reason: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.status = 'inactive';
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);

    this.emitEvent('liquidity_removed', 'liquidity', sourceId, 'deactivate_source', { reason });
  }

  async suspendSource(sourceId: string, reason: string, duration?: number): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.status = 'suspended';
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);

    this.emitEvent('liquidity_removed', 'liquidity', sourceId, 'suspend_source', {
      reason,
      duration,
    });
  }

  async getSourceMetrics(sourceId: string): Promise<LiquidityMetrics> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }
    return source.metrics;
  }

  async updateRoutingConfig(sourceId: string, routing: Partial<RoutingConfig>): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.routing = { ...source.routing, ...routing };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async getRoutingConfig(sourceId: string): Promise<RoutingConfig> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }
    return source.routing;
  }

  async setSourcePriority(sourceId: string, priority: number): Promise<void> {
    await this.updateRoutingConfig(sourceId, { priority });
  }

  async setSourceWeight(sourceId: string, weight: number): Promise<void> {
    await this.updateRoutingConfig(sourceId, { weight });
  }

  async updateFeeStructure(sourceId: string, fees: Partial<FeeStructure>): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.fees = { ...source.fees, ...fees };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async getFeeStructure(sourceId: string): Promise<FeeStructure> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }
    return source.fees;
  }

  async addVolumeDiscount(sourceId: string, discount: VolumeDiscount): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.fees.volumeDiscounts.push(discount);
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async addRebate(sourceId: string, rebate: Rebate): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.fees.rebates.push(rebate);
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async addTradingPair(sourceId: string, pair: TradingPair): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    const existingIndex = source.pairs.findIndex((p) => p.symbol === pair.symbol);
    if (existingIndex !== -1) {
      source.pairs[existingIndex] = pair;
    } else {
      source.pairs.push(pair);
    }
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async updateTradingPair(
    sourceId: string,
    symbol: string,
    updates: Partial<TradingPair>
  ): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    const pairIndex = source.pairs.findIndex((p) => p.symbol === symbol);
    if (pairIndex === -1) {
      throw new Error(`Trading pair not found: ${symbol}`);
    }

    source.pairs[pairIndex] = { ...source.pairs[pairIndex], ...updates };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async removeTradingPair(sourceId: string, symbol: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.pairs = source.pairs.filter((p) => p.symbol !== symbol);
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async getSupportedPairs(sourceId: string): Promise<TradingPair[]> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }
    return source.pairs;
  }

  async updateLimits(sourceId: string, limits: Partial<LiquidityLimits>): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.limits = { ...source.limits, ...limits };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async getLimits(sourceId: string): Promise<LiquidityLimits> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }
    return source.limits;
  }

  async checkLimitAvailability(sourceId: string, amount: string): Promise<LimitAvailability> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    // In a real implementation, this would track actual usage
    const requestedAmount = BigInt(amount.replace(/[^0-9]/g, '') || '0');
    const dailyLimit = BigInt(source.limits.dailyLimit.replace(/[^0-9]/g, '') || '0');
    const weeklyLimit = BigInt(source.limits.weeklyLimit.replace(/[^0-9]/g, '') || '0');
    const monthlyLimit = BigInt(source.limits.monthlyLimit.replace(/[^0-9]/g, '') || '0');
    const perTradeLimit = BigInt(source.limits.perTradeLimit.replace(/[^0-9]/g, '') || '0');

    const restrictions: string[] = [];
    if (requestedAmount > perTradeLimit) {
      restrictions.push('Exceeds per-trade limit');
    }
    if (requestedAmount > dailyLimit) {
      restrictions.push('Exceeds daily limit');
    }

    return {
      available: restrictions.length === 0,
      dailyRemaining: dailyLimit.toString(),
      weeklyRemaining: weeklyLimit.toString(),
      monthlyRemaining: monthlyLimit.toString(),
      perTradeRemaining: perTradeLimit.toString(),
      restrictions,
    };
  }

  async createAggregator(config: CreateAggregatorRequest): Promise<LiquidityAggregator> {
    const aggregatorId = this.generateId('aggregator');

    // Validate source IDs
    for (const sourceId of config.sourceIds) {
      if (!this.sources.has(sourceId)) {
        throw new Error(`Liquidity source not found: ${sourceId}`);
      }
    }

    const aggregator: LiquidityAggregator = {
      id: aggregatorId,
      name: config.name,
      sources: config.sourceIds,
      strategy: {
        type: 'best_execution',
        parameters: {},
        rebalanceFrequency: '1h',
        slippageTolerance: 0.01,
        priceDeviationThreshold: 0.005,
        ...config.strategy,
      },
      routing: {
        enabled: true,
        algorithm: 'optimized',
        considerFees: true,
        considerLatency: true,
        considerDepth: true,
        maxSources: 5,
        minSources: 1,
        splitOrders: true,
        maxSplits: 3,
        ...config.routing,
      },
      execution: {
        defaultOrderType: 'limit',
        timeInForce: 'ioc',
        partialFillAllowed: true,
        priceProtection: true,
        maxSlippage: 0.02,
        retryOnFailure: true,
        maxRetries: 3,
        ...config.execution,
      },
      riskLimits: {
        maxExposure: '10000000',
        maxDrawdown: 0.05,
        maxLossPerTrade: '100000',
        maxDailyLoss: '500000',
        concentrationLimit: 30,
        velocityLimitPerMinute: 100,
        ...config.riskLimits,
      },
      metrics: {
        totalVolume: '0',
        totalTrades: 0,
        averageExecutionPrice: 0,
        priceSavings: '0',
        averageLatency: 0,
        fillRate: 0,
        rejectionRate: 0,
        slippageStats: {
          average: 0,
          median: 0,
          p95: 0,
          max: 0,
          distribution: {},
        },
      },
      status: 'active',
    };

    this.aggregators.set(aggregatorId, aggregator);
    this.emitEvent('liquidity_added', 'liquidity', aggregatorId, 'create_aggregator', {
      aggregator,
    });

    return aggregator;
  }

  async getAggregator(aggregatorId: string): Promise<LiquidityAggregator | null> {
    return this.aggregators.get(aggregatorId) || null;
  }

  async updateAggregator(
    aggregatorId: string,
    updates: AggregatorUpdates
  ): Promise<LiquidityAggregator> {
    const aggregator = this.aggregators.get(aggregatorId);
    if (!aggregator) {
      throw new Error(`Aggregator not found: ${aggregatorId}`);
    }

    // Validate source IDs if updating
    if (updates.sourceIds) {
      for (const sourceId of updates.sourceIds) {
        if (!this.sources.has(sourceId)) {
          throw new Error(`Liquidity source not found: ${sourceId}`);
        }
      }
    }

    const updatedAggregator: LiquidityAggregator = {
      ...aggregator,
      ...updates,
      sources: updates.sourceIds || aggregator.sources,
      strategy: updates.strategy
        ? { ...aggregator.strategy, ...updates.strategy }
        : aggregator.strategy,
      routing: updates.routing ? { ...aggregator.routing, ...updates.routing } : aggregator.routing,
      execution: updates.execution
        ? { ...aggregator.execution, ...updates.execution }
        : aggregator.execution,
      riskLimits: updates.riskLimits
        ? { ...aggregator.riskLimits, ...updates.riskLimits }
        : aggregator.riskLimits,
    };

    this.aggregators.set(aggregatorId, updatedAggregator);
    return updatedAggregator;
  }

  async removeAggregator(aggregatorId: string): Promise<void> {
    if (!this.aggregators.has(aggregatorId)) {
      throw new Error(`Aggregator not found: ${aggregatorId}`);
    }

    this.aggregators.delete(aggregatorId);
    this.emitEvent('liquidity_removed', 'liquidity', aggregatorId, 'remove_aggregator', {});
  }

  async listAggregators(): Promise<LiquidityAggregator[]> {
    return Array.from(this.aggregators.values());
  }

  async getOptimalRoute(trade: TradeRequest): Promise<OptimalRoute> {
    const activeSources = await this.getActiveSources();
    const eligibleSources = activeSources.filter((source) => {
      // Check if source supports the pair
      const supportsPair = source.pairs.some((p) => p.symbol === trade.pair && p.status === 'active');
      if (!supportsPair) return false;

      // Check exclusions
      if (trade.excludedSources?.includes(source.id)) return false;

      // Check preferences
      if (trade.preferredSources?.length && !trade.preferredSources.includes(source.id)) {
        return false;
      }

      // Check if pair is excluded in routing
      if (source.routing.excludedPairs.includes(trade.pair)) return false;

      return true;
    });

    if (eligibleSources.length === 0) {
      throw new Error(`No eligible sources found for pair: ${trade.pair}`);
    }

    // Sort sources by priority and metrics
    const sortedSources = eligibleSources.sort((a, b) => {
      const priorityDiff = b.routing.priority - a.routing.priority;
      if (priorityDiff !== 0) return priorityDiff;

      // Prefer lower spread
      return a.metrics.averageSpread - b.metrics.averageSpread;
    });

    // Calculate route legs
    const legs: RouteLeg[] = [];
    const tradeAmount = parseFloat(trade.amount);
    let remainingAmount = tradeAmount;

    for (const source of sortedSources) {
      if (remainingAmount <= 0) break;

      const maxAllocation = (tradeAmount * source.routing.maxAllocation) / 100;
      const allocation = Math.min(remainingAmount, maxAllocation);

      if (allocation > 0) {
        legs.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceType: source.type,
          amount: allocation.toString(),
          percentage: (allocation / tradeAmount) * 100,
          estimatedPrice: this.estimatePrice(source, trade.pair, trade.side, allocation),
          estimatedFees: this.estimateFees(source, allocation),
          estimatedLatency: source.metrics.latencyMs,
          priority: source.routing.priority,
        });

        remainingAmount -= allocation;
      }
    }

    const routeId = this.generateId('route');
    const totalFees = legs.reduce((sum, leg) => sum + parseFloat(leg.estimatedFees), 0);
    const weightedPrice = this.calculateWeightedPrice(legs, tradeAmount);

    return {
      id: routeId,
      trade,
      legs,
      estimatedPrice: weightedPrice.toString(),
      estimatedFees: totalFees.toString(),
      estimatedSlippage: this.estimateSlippage(legs),
      totalAmount: trade.amount,
      confidence: this.calculateRouteConfidence(legs),
      validUntil: new Date(Date.now() + 30000), // 30 seconds validity
      alternatives: this.generateAlternativeRoutes(trade, sortedSources, legs),
    };
  }

  async simulateRoute(_trade: TradeRequest, route: OptimalRoute): Promise<RouteSimulation> {
    const fillProbability = this.calculateFillProbability(route);
    const priceImpact = this.calculatePriceImpact(route);

    let executionRisk: 'low' | 'medium' | 'high' = 'low';
    if (fillProbability < 0.9 || priceImpact > 0.01) {
      executionRisk = 'medium';
    }
    if (fillProbability < 0.7 || priceImpact > 0.03) {
      executionRisk = 'high';
    }

    const warnings: string[] = [];
    if (route.legs.length > 3) {
      warnings.push('Order split across multiple sources may increase execution time');
    }
    if (priceImpact > 0.005) {
      warnings.push(`Estimated price impact: ${(priceImpact * 100).toFixed(2)}%`);
    }

    return {
      route,
      simulatedPrice: route.estimatedPrice,
      simulatedFees: route.estimatedFees,
      simulatedSlippage: route.estimatedSlippage,
      priceImpact,
      fillProbability,
      executionRisk,
      warnings,
      timestamp: new Date(),
    };
  }

  async validateRoute(route: OptimalRoute): Promise<RouteValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sourcesAvailable = true;
    let liquidityAvailable = true;
    let limitsOk = true;

    // Check source availability
    for (const leg of route.legs) {
      const source = this.sources.get(leg.sourceId);
      if (!source) {
        errors.push(`Source not found: ${leg.sourceId}`);
        sourcesAvailable = false;
        continue;
      }

      if (source.status !== 'active') {
        errors.push(`Source not active: ${source.name}`);
        sourcesAvailable = false;
      }

      // Check limits
      const limitCheck = await this.checkLimitAvailability(leg.sourceId, leg.amount);
      if (!limitCheck.available) {
        errors.push(`Limit exceeded for ${source.name}: ${limitCheck.restrictions?.join(', ')}`);
        limitsOk = false;
      }
    }

    // Check route validity
    if (new Date() > route.validUntil) {
      warnings.push('Route has expired, prices may have changed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sourcesAvailable,
      liquidityAvailable,
      limitsOk,
      complianceOk: true, // Would implement compliance checks
    };
  }

  async executeTrade(trade: TradeRequest): Promise<TradeExecution> {
    const route = await this.getOptimalRoute(trade);
    return this.executeWithRoute(trade, route);
  }

  async executeWithRoute(trade: TradeRequest, route: OptimalRoute): Promise<TradeExecution> {
    const validation = await this.validateRoute(route);
    if (!validation.valid) {
      throw new Error(`Route validation failed: ${validation.errors.join(', ')}`);
    }

    const executionId = trade.id || this.generateId('execution');
    const execution: TradeExecution = {
      id: executionId,
      trade,
      route,
      status: 'executing',
      fills: [],
      totalFilled: '0',
      totalFees: '0',
      averagePrice: '0',
      slippage: 0,
      executionTime: 0,
      startedAt: new Date(),
    };

    this.trades.set(executionId, execution);

    // Simulate execution of each leg
    let totalFilled = 0;
    let totalFees = 0;
    let weightedPriceSum = 0;

    for (let i = 0; i < route.legs.length; i++) {
      const leg = route.legs[i];
      const fillAmount = parseFloat(leg.amount);
      const fillPrice = parseFloat(leg.estimatedPrice);
      const fillFees = parseFloat(leg.estimatedFees);

      const fill: TradeFill = {
        id: this.generateId('fill'),
        legIndex: i,
        sourceId: leg.sourceId,
        amount: leg.amount,
        price: leg.estimatedPrice,
        fees: leg.estimatedFees,
        timestamp: new Date(),
      };

      execution.fills.push(fill);
      totalFilled += fillAmount;
      totalFees += fillFees;
      weightedPriceSum += fillAmount * fillPrice;
    }

    execution.totalFilled = totalFilled.toString();
    execution.totalFees = totalFees.toString();
    execution.averagePrice = (weightedPriceSum / totalFilled).toString();
    execution.slippage = this.calculateActualSlippage(route, execution);
    execution.status = 'filled';
    execution.completedAt = new Date();
    execution.executionTime = execution.completedAt.getTime() - execution.startedAt.getTime();

    this.trades.set(executionId, execution);

    // Update source metrics
    for (const leg of route.legs) {
      await this.incrementSourceVolume(leg.sourceId, leg.amount);
    }

    this.emitEvent('liquidity_added', 'liquidity', executionId, 'trade_executed', {
      trade,
      execution,
    });

    return execution;
  }

  async cancelTrade(tradeId: string): Promise<void> {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    if (trade.status === 'filled' || trade.status === 'cancelled') {
      throw new Error(`Cannot cancel trade in status: ${trade.status}`);
    }

    trade.status = 'cancelled';
    this.trades.set(tradeId, trade);
  }

  async getTradeStatus(tradeId: string): Promise<TradeStatus> {
    const trade = this.trades.get(tradeId);
    if (!trade) {
      throw new Error(`Trade not found: ${tradeId}`);
    }

    const totalAmount = parseFloat(trade.trade.amount);
    const filledAmount = parseFloat(trade.totalFilled);

    return {
      tradeId: trade.id,
      status: trade.status,
      filledAmount: trade.totalFilled,
      remainingAmount: (totalAmount - filledAmount).toString(),
      averagePrice: trade.averagePrice,
      totalFees: trade.totalFees,
      lastUpdate: trade.completedAt || trade.startedAt,
    };
  }

  async getNetworkLiquidity(): Promise<NetworkLiquidityReport> {
    const sources = Array.from(this.sources.values());
    const activeSources = sources.filter((s) => s.status === 'active');

    const liquidityBySource: Record<string, string> = {};
    const liquidityByType: Record<LiquiditySourceType, string> = {} as Record<LiquiditySourceType, string>;
    const liquidityByPair: Record<string, PairLiquidity> = {};

    let totalLiquidity = BigInt(0);

    for (const source of activeSources) {
      const volume = BigInt(source.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
      liquidityBySource[source.id] = source.metrics.totalVolume24h;

      // Aggregate by type
      const existingTypeVol = BigInt(liquidityByType[source.type]?.replace(/[^0-9]/g, '') || '0');
      liquidityByType[source.type] = (existingTypeVol + volume).toString();

      totalLiquidity += volume;

      // Aggregate by pair
      for (const pair of source.pairs) {
        if (!liquidityByPair[pair.symbol]) {
          liquidityByPair[pair.symbol] = {
            pair: pair.symbol,
            totalLiquidity: '0',
            bidLiquidity: '0',
            askLiquidity: '0',
            spread: source.metrics.averageSpread,
            depth: [],
            lastUpdated: new Date(),
          };
        }
      }
    }

    const topSources: SourceLiquiditySummary[] = activeSources
      .sort((a, b) => {
        const aVol = BigInt(a.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
        const bVol = BigInt(b.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
        return aVol > bVol ? -1 : 1;
      })
      .slice(0, 10)
      .map((s) => ({
        sourceId: s.id,
        sourceName: s.name,
        sourceType: s.type,
        totalLiquidity: s.metrics.totalVolume24h,
        pairCount: s.pairs.length,
        spread: s.metrics.averageSpread,
        volume24h: s.metrics.totalVolume24h,
      }));

    return {
      timestamp: new Date(),
      totalLiquidity: totalLiquidity.toString(),
      liquidityBySource,
      liquidityByType,
      liquidityByPair,
      topSources,
      trends: this.calculateLiquidityTrends(),
    };
  }

  async getSpreadAnalysis(): Promise<SpreadAnalysis> {
    const sources = await this.getActiveSources();
    const spreadByPair: Record<string, PairSpreadAnalysis> = {};
    const spreadBySource: Record<string, number> = {};
    const bestSpreads: BestSpread[] = [];

    let totalSpread = 0;
    let sourceCount = 0;

    for (const source of sources) {
      spreadBySource[source.id] = source.metrics.averageSpread;
      totalSpread += source.metrics.averageSpread;
      sourceCount++;

      for (const pair of source.pairs) {
        if (!spreadByPair[pair.symbol]) {
          spreadByPair[pair.symbol] = {
            pair: pair.symbol,
            averageSpread: source.metrics.averageSpread,
            minSpread: source.metrics.averageSpread,
            maxSpread: source.metrics.averageSpread,
            medianSpread: source.metrics.averageSpread,
            volatility: 0,
            bestSource: source.id,
          };

          bestSpreads.push({
            pair: pair.symbol,
            sourceId: source.id,
            sourceName: source.name,
            spread: source.metrics.averageSpread,
            lastUpdated: new Date(),
          });
        } else {
          const existing = spreadByPair[pair.symbol];
          if (source.metrics.averageSpread < existing.minSpread) {
            existing.minSpread = source.metrics.averageSpread;
            existing.bestSource = source.id;

            // Update best spread
            const bestIdx = bestSpreads.findIndex((b) => b.pair === pair.symbol);
            if (bestIdx !== -1) {
              bestSpreads[bestIdx] = {
                pair: pair.symbol,
                sourceId: source.id,
                sourceName: source.name,
                spread: source.metrics.averageSpread,
                lastUpdated: new Date(),
              };
            }
          }
          existing.maxSpread = Math.max(existing.maxSpread, source.metrics.averageSpread);
        }
      }
    }

    return {
      timestamp: new Date(),
      overallAverageSpread: sourceCount > 0 ? totalSpread / sourceCount : 0,
      spreadByPair,
      spreadBySource,
      bestSpreads: bestSpreads.sort((a, b) => a.spread - b.spread),
      spreadTrends: [],
    };
  }

  async getDepthAnalysis(pair: string): Promise<DepthAnalysis> {
    const sources = await this.getActiveSources();
    const depthBySource: Record<string, SourceDepth> = {};

    let totalBid = BigInt(0);
    let totalAsk = BigInt(0);

    for (const source of sources) {
      const supportsPair = source.pairs.some((p) => p.symbol === pair);
      if (!supportsPair) continue;

      const depth = BigInt(source.metrics.averageDepth.replace(/[^0-9]/g, '') || '0');
      depthBySource[source.id] = {
        sourceId: source.id,
        sourceName: source.name,
        bidDepth: (depth / BigInt(2)).toString(),
        askDepth: (depth / BigInt(2)).toString(),
        contribution: 0,
      };

      totalBid += depth / BigInt(2);
      totalAsk += depth / BigInt(2);
    }

    // Calculate contributions
    const totalDepth = totalBid + totalAsk;
    for (const sourceId of Object.keys(depthBySource)) {
      const sourceDepth =
        BigInt(depthBySource[sourceId].bidDepth) + BigInt(depthBySource[sourceId].askDepth);
      depthBySource[sourceId].contribution =
        totalDepth > 0 ? Number((sourceDepth * BigInt(100)) / totalDepth) : 0;
    }

    return {
      pair,
      timestamp: new Date(),
      bidDepth: [],
      askDepth: [],
      totalBidVolume: totalBid.toString(),
      totalAskVolume: totalAsk.toString(),
      imbalance:
        totalBid + totalAsk > 0
          ? Number((totalBid - totalAsk) * BigInt(100)) / Number(totalBid + totalAsk)
          : 0,
      depthBySource,
      priceImpactAnalysis: {
        buyImpact: this.generatePriceImpactLevels(pair, 'buy'),
        sellImpact: this.generatePriceImpactLevels(pair, 'sell'),
      },
    };
  }

  async getVolumeAnalysis(period: string): Promise<VolumeAnalysis> {
    const sources = await this.getActiveSources();
    const volumeByPair: Record<string, string> = {};
    const volumeBySource: Record<string, string> = {};
    const volumeByHour: Record<number, string> = {};

    let totalVolume = BigInt(0);

    for (const source of sources) {
      const volume = BigInt(source.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
      volumeBySource[source.id] = source.metrics.totalVolume24h;
      totalVolume += volume;

      for (const pair of source.pairs) {
        const existing = BigInt(volumeByPair[pair.symbol]?.replace(/[^0-9]/g, '') || '0');
        volumeByPair[pair.symbol] = (existing + volume / BigInt(source.pairs.length)).toString();
      }
    }

    // Generate hourly distribution
    for (let i = 0; i < 24; i++) {
      volumeByHour[i] = (totalVolume / BigInt(24)).toString();
    }

    const topPairs: PairVolumeSummary[] = Object.entries(volumeByPair)
      .map(([pair, vol]) => ({
        pair,
        volume: vol,
        trades: 0,
        averageSize: '0',
      }))
      .sort((a, b) => {
        const aVol = BigInt(a.volume.replace(/[^0-9]/g, '') || '0');
        const bVol = BigInt(b.volume.replace(/[^0-9]/g, '') || '0');
        return aVol > bVol ? -1 : 1;
      })
      .slice(0, 10);

    const topSources: SourceVolumeSummary[] = sources
      .map((s) => ({
        sourceId: s.id,
        sourceName: s.name,
        volume: s.metrics.totalVolume24h,
        trades: 0,
        marketShare:
          totalVolume > 0
            ? Number(
                (BigInt(s.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0') * BigInt(100)) /
                  totalVolume
              )
            : 0,
      }))
      .sort((a, b) => {
        const aVol = BigInt(a.volume.replace(/[^0-9]/g, '') || '0');
        const bVol = BigInt(b.volume.replace(/[^0-9]/g, '') || '0');
        return aVol > bVol ? -1 : 1;
      })
      .slice(0, 10);

    return {
      period,
      timestamp: new Date(),
      totalVolume: totalVolume.toString(),
      volumeByPair,
      volumeBySource,
      volumeByHour,
      topPairs,
      topSources,
      trends: [],
    };
  }

  async getLiquidityHealth(): Promise<LiquidityHealthReport> {
    const sources = Array.from(this.sources.values());
    const aggregators = Array.from(this.aggregators.values());
    const alerts: LiquidityAlert[] = [];

    const sourceHealth: SourceHealthStatus[] = sources.map((source) => {
      const issues: string[] = [];

      if (source.metrics.uptime < 99) {
        issues.push(`Low uptime: ${source.metrics.uptime}%`);
      }
      if (source.metrics.latencyMs > 1000) {
        issues.push(`High latency: ${source.metrics.latencyMs}ms`);
      }
      if (source.metrics.fillRate < 90) {
        issues.push(`Low fill rate: ${source.metrics.fillRate}%`);
      }

      let status: 'healthy' | 'degraded' | 'down' | 'unknown' = 'healthy';
      if (source.status !== 'active') {
        status = source.status === 'suspended' ? 'down' : 'unknown';
      } else if (issues.length > 0) {
        status = 'degraded';
      }

      return {
        sourceId: source.id,
        sourceName: source.name,
        status,
        uptime: source.metrics.uptime,
        latency: source.metrics.latencyMs,
        fillRate: source.metrics.fillRate,
        lastCheck: new Date(),
        issues,
      };
    });

    const aggregatorHealth: AggregatorHealthStatus[] = aggregators.map((agg) => {
      const healthySources = agg.sources.filter((sourceId) => {
        const source = this.sources.get(sourceId);
        return source && source.status === 'active';
      }).length;

      return {
        aggregatorId: agg.id,
        aggregatorName: agg.name,
        status: agg.status,
        sourcesHealthy: healthySources,
        sourcesTotal: agg.sources.length,
        performance:
          healthySources === agg.sources.length
            ? 'optimal'
            : healthySources > agg.sources.length / 2
              ? 'suboptimal'
              : 'degraded',
      };
    });

    // Generate alerts
    for (const sh of sourceHealth) {
      if (sh.status === 'down') {
        alerts.push({
          id: this.generateId('alert'),
          severity: 'critical',
          type: 'source_down',
          message: `Liquidity source ${sh.sourceName} is down`,
          sourceId: sh.sourceId,
          timestamp: new Date(),
          resolved: false,
        });
      } else if (sh.status === 'degraded') {
        alerts.push({
          id: this.generateId('alert'),
          severity: 'warning',
          type: 'source_degraded',
          message: `Liquidity source ${sh.sourceName} is degraded: ${sh.issues.join(', ')}`,
          sourceId: sh.sourceId,
          timestamp: new Date(),
          resolved: false,
        });
      }
    }

    const healthyCount = sourceHealth.filter((s) => s.status === 'healthy').length;
    const degradedCount = sourceHealth.filter((s) => s.status === 'degraded').length;
    const downCount = sourceHealth.filter((s) => s.status === 'down').length;

    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (downCount > 0) {
      overallHealth = 'critical';
    } else if (degradedCount > sourceHealth.length / 4) {
      overallHealth = 'degraded';
    }

    const healthScore =
      sourceHealth.length > 0
        ? Math.round(
            ((healthyCount * 100 + degradedCount * 50 + downCount * 0) / sourceHealth.length) * 100
          ) / 100
        : 100;

    const recommendations: string[] = [];
    if (downCount > 0) {
      recommendations.push('Investigate and restore down liquidity sources');
    }
    if (degradedCount > 0) {
      recommendations.push('Address performance issues in degraded sources');
    }
    if (sources.length < 3) {
      recommendations.push('Add more liquidity sources for redundancy');
    }

    this.lastHealthCheck = new Date();

    return {
      timestamp: new Date(),
      overallHealth,
      healthScore,
      sourceHealth,
      aggregatorHealth,
      alerts,
      recommendations,
    };
  }

  async updateSourceMetrics(sourceId: string, metrics: Partial<LiquidityMetrics>): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    source.metrics = {
      ...source.metrics,
      ...metrics,
      lastUpdatedAt: new Date(),
    };
    source.updatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  async getAggregatorMetrics(aggregatorId: string): Promise<AggregatorMetrics> {
    const aggregator = this.aggregators.get(aggregatorId);
    if (!aggregator) {
      throw new Error(`Aggregator not found: ${aggregatorId}`);
    }
    return aggregator.metrics;
  }

  async getNetworkMetrics(): Promise<LiquidityNetworkMetrics> {
    const sources = await this.getActiveSources();

    let totalVolume24h = BigInt(0);
    let totalVolume7d = BigInt(0);
    let totalVolume30d = BigInt(0);
    let totalSpread = 0;
    let totalDepth = BigInt(0);
    let totalUptime = 0;

    for (const source of sources) {
      totalVolume24h += BigInt(source.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
      totalVolume30d += BigInt(source.metrics.totalVolume30d.replace(/[^0-9]/g, '') || '0');
      totalSpread += source.metrics.averageSpread;
      totalDepth += BigInt(source.metrics.averageDepth.replace(/[^0-9]/g, '') || '0');
      totalUptime += source.metrics.uptime;
    }

    const sourceCount = sources.length;

    return {
      totalLiquiditySources: this.sources.size,
      activeLiquiditySources: sourceCount,
      totalAvailableLiquidity: totalDepth.toString(),
      averageSpread: sourceCount > 0 ? totalSpread / sourceCount : 0,
      averageDepth: sourceCount > 0 ? (totalDepth / BigInt(sourceCount)).toString() : '0',
      totalVolume24h: totalVolume24h.toString(),
      totalVolume7d: totalVolume7d.toString(),
      totalVolume30d: totalVolume30d.toString(),
      fillRate: sourceCount > 0 ? sources.reduce((sum, s) => sum + s.metrics.fillRate, 0) / sourceCount : 0,
      averageSlippage: sourceCount > 0 ? sources.reduce((sum, s) => sum + s.metrics.averageSlippage, 0) / sourceCount : 0,
      uptime: sourceCount > 0 ? totalUptime / sourceCount : 100,
    };
  }

  async getSourcePerformance(sourceId: string, period: string): Promise<SourcePerformanceReport> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Liquidity source not found: ${sourceId}`);
    }

    const typeSources = await this.getSourcesByType(source.type);
    const allSources = Array.from(this.sources.values());

    const typeAvgVolume = this.calculateAverageVolume(typeSources);
    const networkAvgVolume = this.calculateAverageVolume(allSources);
    const sourceVolume = parseFloat(source.metrics.totalVolume24h.replace(/[^0-9.]/g, '') || '0');

    // Calculate ranking
    const sortedByVolume = allSources.sort((a, b) => {
      const aVol = parseFloat(a.metrics.totalVolume24h.replace(/[^0-9.]/g, '') || '0');
      const bVol = parseFloat(b.metrics.totalVolume24h.replace(/[^0-9.]/g, '') || '0');
      return bVol - aVol;
    });
    const ranking = sortedByVolume.findIndex((s) => s.id === sourceId) + 1;

    return {
      sourceId: source.id,
      sourceName: source.name,
      period,
      metrics: {
        totalVolume: source.metrics.totalVolume24h,
        totalTrades: 0, // Would track from actual trades
        averageTradeSize: '0',
        fillRate: source.metrics.fillRate,
        averageSlippage: source.metrics.averageSlippage,
        averageLatency: source.metrics.latencyMs,
        uptime: source.metrics.uptime,
        errorRate: 100 - source.metrics.fillRate,
      },
      trends: {
        volumeTrend: 'stable',
        volumeChange: 0,
        fillRateTrend: 'stable',
        latencyTrend: 'stable',
      },
      comparison: {
        vsTypeAverage: typeAvgVolume > 0 ? ((sourceVolume - typeAvgVolume) / typeAvgVolume) * 100 : 0,
        vsNetworkAverage:
          networkAvgVolume > 0 ? ((sourceVolume - networkAvgVolume) / networkAvgVolume) * 100 : 0,
        ranking,
        totalSources: allSources.length,
      },
      highlights: this.generateSourceHighlights(source),
      concerns: this.generateSourceConcerns(source),
    };
  }

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): LiquidityNetworkHealth {
    const sources = Array.from(this.sources.values());
    const activeSources = sources.filter((s) => s.status === 'active').length;
    const issues: string[] = [];

    // Check for issues
    const downSources = sources.filter((s) => s.status === 'suspended').length;
    if (downSources > 0) {
      issues.push(`${downSources} sources are suspended`);
    }

    const degradedSources = sources.filter(
      (s) => s.status === 'active' && (s.metrics.uptime < 99 || s.metrics.fillRate < 90)
    ).length;
    if (degradedSources > 0) {
      issues.push(`${degradedSources} sources have degraded performance`);
    }

    if (sources.length === 0) {
      issues.push('No liquidity sources configured');
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > 2 || downSources > sources.length / 2) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      sourceCount: sources.length,
      activeSources,
      aggregatorCount: this.aggregators.size,
      lastHealthCheck: this.lastHealthCheck,
      issues,
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): LiquidityNetworkConfig {
    return this.config;
  }

  /**
   * Check if the liquidity network is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'liquidity_network',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'liquidity_source', id: sourceId, impact: 'direct' }],
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return 0;
    }, obj);
  }

  private estimatePrice(
    source: LiquiditySource,
    _pair: string,
    side: 'buy' | 'sell',
    amount: number
  ): string {
    // Simplified price estimation - would use actual order book data
    // In production, _pair would be used to look up the actual price
    const basePrice = 100; // Placeholder
    const slippage = source.metrics.averageSlippage * (amount / 10000);
    const adjustedPrice = side === 'buy' ? basePrice * (1 + slippage) : basePrice * (1 - slippage);
    return adjustedPrice.toFixed(8);
  }

  private estimateFees(source: LiquiditySource, amount: number): string {
    const fee = amount * source.fees.takerFee;
    return fee.toFixed(8);
  }

  private estimateSlippage(legs: RouteLeg[]): number {
    if (legs.length === 0) return 0;
    const totalSlippage = legs.reduce((sum, leg) => {
      const source = this.sources.get(leg.sourceId);
      return sum + (source?.metrics.averageSlippage || 0) * leg.percentage;
    }, 0);
    return totalSlippage / 100;
  }

  private calculateWeightedPrice(legs: RouteLeg[], totalAmount: number): number {
    if (totalAmount === 0) return 0;
    return legs.reduce((sum, leg) => {
      return sum + (parseFloat(leg.estimatedPrice) * parseFloat(leg.amount)) / totalAmount;
    }, 0);
  }

  private calculateRouteConfidence(legs: RouteLeg[]): number {
    if (legs.length === 0) return 0;
    const avgFillRate = legs.reduce((sum, leg) => {
      const source = this.sources.get(leg.sourceId);
      return sum + (source?.metrics.fillRate || 0);
    }, 0) / legs.length;
    return Math.min(avgFillRate / 100, 1);
  }

  private generateAlternativeRoutes(
    trade: TradeRequest,
    sources: LiquiditySource[],
    primaryLegs: RouteLeg[]
  ): AlternativeRoute[] {
    // Generate alternative routes using different source combinations
    const alternatives: AlternativeRoute[] = [];

    if (sources.length > 1 && primaryLegs.length > 0) {
      // Single source alternative
      for (const source of sources.slice(0, 3)) {
        if (primaryLegs[0]?.sourceId === source.id) continue;

        alternatives.push({
          legs: [
            {
              sourceId: source.id,
              sourceName: source.name,
              sourceType: source.type,
              amount: trade.amount,
              percentage: 100,
              estimatedPrice: this.estimatePrice(source, trade.pair, trade.side, parseFloat(trade.amount)),
              estimatedFees: this.estimateFees(source, parseFloat(trade.amount)),
              estimatedLatency: source.metrics.latencyMs,
              priority: source.routing.priority,
            },
          ],
          estimatedPrice: this.estimatePrice(source, trade.pair, trade.side, parseFloat(trade.amount)),
          estimatedFees: this.estimateFees(source, parseFloat(trade.amount)),
          estimatedSlippage: source.metrics.averageSlippage,
          reason: `Single source: ${source.name}`,
        });
      }
    }

    return alternatives.slice(0, 3);
  }

  private calculateFillProbability(route: OptimalRoute): number {
    if (route.legs.length === 0) return 0;
    const avgFillRate = route.legs.reduce((sum, leg) => {
      const source = this.sources.get(leg.sourceId);
      return sum + (source?.metrics.fillRate || 0);
    }, 0) / route.legs.length;
    return avgFillRate / 100;
  }

  private calculatePriceImpact(route: OptimalRoute): number {
    // Simplified price impact calculation
    const totalAmount = parseFloat(route.totalAmount);
    return Math.min(totalAmount / 1000000, 0.1); // Max 10% impact
  }

  private calculateActualSlippage(route: OptimalRoute, execution: TradeExecution): number {
    const estimatedPrice = parseFloat(route.estimatedPrice);
    const actualPrice = parseFloat(execution.averagePrice);
    if (estimatedPrice === 0) return 0;
    return Math.abs((actualPrice - estimatedPrice) / estimatedPrice);
  }

  private async incrementSourceVolume(sourceId: string, amount: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;

    const currentVolume = BigInt(source.metrics.totalVolume24h.replace(/[^0-9]/g, '') || '0');
    const addedVolume = BigInt(amount.replace(/[^0-9]/g, '') || '0');
    source.metrics.totalVolume24h = (currentVolume + addedVolume).toString();
    source.metrics.lastTradeAt = new Date();
    source.metrics.lastUpdatedAt = new Date();
    this.sources.set(sourceId, source);
  }

  private calculateLiquidityTrends(): LiquidityTrend[] {
    // Would calculate from historical data
    return [
      { period: '1h', liquidity: '0', change: 0, changePercent: 0 },
      { period: '24h', liquidity: '0', change: 0, changePercent: 0 },
      { period: '7d', liquidity: '0', change: 0, changePercent: 0 },
    ];
  }

  private generatePriceImpactLevels(_pair: string, _side: 'buy' | 'sell'): ImpactLevel[] {
    // Would calculate from actual order book data using _pair and _side
    return [
      { amount: '10000', estimatedPrice: '100', priceImpact: 0.001, slippage: 0.0001 },
      { amount: '100000', estimatedPrice: '100.1', priceImpact: 0.01, slippage: 0.001 },
      { amount: '1000000', estimatedPrice: '101', priceImpact: 0.1, slippage: 0.01 },
    ];
  }

  private calculateAverageVolume(sources: LiquiditySource[]): number {
    if (sources.length === 0) return 0;
    const total = sources.reduce((sum, s) => {
      return sum + parseFloat(s.metrics.totalVolume24h.replace(/[^0-9.]/g, '') || '0');
    }, 0);
    return total / sources.length;
  }

  private generateSourceHighlights(source: LiquiditySource): string[] {
    const highlights: string[] = [];

    if (source.metrics.uptime >= 99.9) {
      highlights.push('Excellent uptime (99.9%+)');
    }
    if (source.metrics.fillRate >= 98) {
      highlights.push('High fill rate (98%+)');
    }
    if (source.metrics.latencyMs < 50) {
      highlights.push('Low latency (<50ms)');
    }
    if (source.metrics.averageSpread < 0.001) {
      highlights.push('Tight spreads (<0.1%)');
    }
    if (source.routing.priority >= 80) {
      highlights.push('High priority source');
    }

    return highlights;
  }

  private generateSourceConcerns(source: LiquiditySource): string[] {
    const concerns: string[] = [];

    if (source.metrics.uptime < 99) {
      concerns.push(`Uptime below threshold (${source.metrics.uptime}%)`);
    }
    if (source.metrics.fillRate < 90) {
      concerns.push(`Low fill rate (${source.metrics.fillRate}%)`);
    }
    if (source.metrics.latencyMs > 500) {
      concerns.push(`High latency (${source.metrics.latencyMs}ms)`);
    }
    if (source.metrics.averageSpread > 0.01) {
      concerns.push(`Wide spreads (${(source.metrics.averageSpread * 100).toFixed(2)}%)`);
    }
    if (source.status === 'suspended') {
      concerns.push('Source is suspended');
    }

    return concerns;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiquidityNetworkManager(
  config?: Partial<LiquidityNetworkConfig>
): DefaultLiquidityNetworkManager {
  return new DefaultLiquidityNetworkManager(config);
}

// Default export
export default DefaultLiquidityNetworkManager;
