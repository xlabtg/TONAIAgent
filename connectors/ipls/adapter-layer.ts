/**
 * TONAIAgent - Cross-Chain Execution Adapter Layer
 *
 * Implements the Cross-Chain Execution Adapter Layer for the IPLS framework,
 * providing cross-chain vault management, bridge abstraction, gas-aware routing,
 * and failover capabilities for institutional cross-chain liquidity (Issue #124).
 */

import {
  CrossChainAdapter,
  AdapterId,
  ChainId,
  BridgeType,
  AdapterConfig,
  AdapterMetrics,
  GasConfig,
  FailoverConfig,
  CrossChainVaultConfig,
  LiquidityRequest,
  LiquidityRoute,
  RouteStep,
  IPLSEvent,
  IPLSEventCallback,
  AdapterLayerConfig,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AdapterLayerManager {
  // Adapter registration and management
  registerAdapter(request: RegisterAdapterRequest): Promise<CrossChainAdapter>;
  getAdapter(adapterId: AdapterId): Promise<CrossChainAdapter | null>;
  updateAdapter(adapterId: AdapterId, updates: UpdateAdapterRequest): Promise<CrossChainAdapter>;
  removeAdapter(adapterId: AdapterId): Promise<void>;
  listAdapters(filters?: AdapterFilters): Promise<CrossChainAdapter[]>;
  getActiveAdapters(): Promise<CrossChainAdapter[]>;
  setAdapterStatus(adapterId: AdapterId, status: CrossChainAdapter['status'], reason?: string): Promise<void>;

  // Cross-chain transfer execution
  executeTransfer(request: CrossChainTransferRequest): Promise<CrossChainTransferResult>;
  estimateTransfer(request: CrossChainTransferRequest): Promise<TransferEstimate>;
  getTransferStatus(transferId: string): Promise<TransferStatus>;
  cancelTransfer(transferId: string): Promise<void>;

  // Route optimization
  findOptimalRoute(request: CrossChainTransferRequest): Promise<CrossChainRoute>;
  compareRoutes(from: ChainId, to: ChainId, asset: string, amount: string): Promise<RouteComparison>;

  // Gas management
  estimateGas(adapterId: AdapterId, action: string, chain: ChainId): Promise<GasEstimate>;
  updateGasConfig(adapterId: AdapterId, config: Partial<GasConfig>): Promise<void>;
  getGasPrices(): Promise<Record<ChainId, GasPriceInfo>>;

  // Vault management
  getVaultBalance(adapterId: AdapterId, chain: ChainId): Promise<VaultBalance>;
  rebalanceVaults(adapterId: AdapterId): Promise<VaultRebalanceResult>;
  getVaultStatus(adapterId: AdapterId): Promise<VaultStatus>;

  // Failover management
  getFailoverStatus(adapterId: AdapterId): Promise<FailoverStatus>;
  triggerFailover(adapterId: AdapterId, reason: string): Promise<FailoverResult>;
  resetCircuitBreaker(adapterId: AdapterId): Promise<void>;

  // Bridge abstraction
  getBridgeQuote(request: BridgeQuoteRequest): Promise<BridgeQuote>;
  getSupportedBridges(from: ChainId, to: ChainId): Promise<BridgeInfo[]>;

  // Analytics
  getAdapterMetrics(adapterId: AdapterId): Promise<AdapterMetrics>;
  getLayerMetrics(): Promise<AdapterLayerMetrics>;
  getTransferHistory(filters?: TransferHistoryFilters): Promise<CrossChainTransferResult[]>;

  // Events
  onEvent(callback: IPLSEventCallback): void;

  // Health
  getHealth(): AdapterLayerHealth;
}

export interface RegisterAdapterRequest {
  name: string;
  bridgeType: BridgeType;
  supportedChains: ChainId[];
  supportedAssets: string[];
  config: Partial<AdapterConfig>;
  gasConfig?: Partial<GasConfig>;
  failoverConfig?: Partial<FailoverConfig>;
  vaultConfig?: Partial<CrossChainVaultConfig>;
}

export interface UpdateAdapterRequest {
  name?: string;
  supportedChains?: ChainId[];
  supportedAssets?: string[];
  config?: Partial<AdapterConfig>;
  gasConfig?: Partial<GasConfig>;
  failoverConfig?: Partial<FailoverConfig>;
  vaultConfig?: Partial<CrossChainVaultConfig>;
}

export interface AdapterFilters {
  bridgeTypes?: BridgeType[];
  statuses?: CrossChainAdapter['status'][];
  fromChain?: ChainId;
  toChain?: ChainId;
  asset?: string;
  maxFee?: string;
  limit?: number;
  offset?: number;
}

export interface CrossChainTransferRequest {
  id?: string;
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  amount: string;
  recipient: string;
  preferredAdapterId?: AdapterId;
  maxFeeUsd?: string;
  deadline?: Date;
  urgency?: 'standard' | 'high' | 'critical';
  liquidityRequest?: LiquidityRequest;
}

export interface CrossChainTransferResult {
  id: string;
  request: CrossChainTransferRequest;
  adapterId: AdapterId;
  status: TransferExecutionStatus;
  txHashSource?: string;
  txHashDestination?: string;
  amount: string;
  fee: string;
  gasUsed?: string;
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletionAt: Date;
  error?: string;
}

export type TransferExecutionStatus =
  | 'pending'
  | 'submitted'
  | 'bridging'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface TransferEstimate {
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  amount: string;
  estimatedFeeUsd: string;
  estimatedGasUsd: string;
  estimatedTimeMs: number;
  recommendedAdapterId: AdapterId;
  alternativeAdapters: AdapterId[];
  validUntil: Date;
}

export interface TransferStatus {
  transferId: string;
  status: TransferExecutionStatus;
  currentStep: string;
  progress: number; // 0–100
  txHashSource?: string;
  txHashDestination?: string;
  estimatedCompletionAt: Date;
  lastUpdated: Date;
}

export interface CrossChainRoute {
  hops: RouteHop[];
  totalFeeUsd: string;
  totalGasUsd: string;
  estimatedTimeMs: number;
  riskScore: number;
  adaptersUsed: AdapterId[];
  recommended: boolean;
  reasoning: string;
}

export interface RouteHop {
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  adapterId: AdapterId;
  estimatedFeeUsd: string;
  estimatedTimeMs: number;
  bridgeType: BridgeType;
}

export interface RouteComparison {
  request: { from: ChainId; to: ChainId; asset: string; amount: string };
  routes: CrossChainRoute[];
  bestByFee: CrossChainRoute;
  bestBySpeed: CrossChainRoute;
  bestByRisk: CrossChainRoute;
  recommended: CrossChainRoute;
}

export interface GasEstimate {
  adapterId: AdapterId;
  chain: ChainId;
  action: string;
  estimatedGasUnits: number;
  gasPriceGwei: number;
  estimatedCostNative: string;
  estimatedCostUsd: string;
  bufferMultiplier: number;
  finalEstimateUsd: string;
}

export interface GasPriceInfo {
  chain: ChainId;
  safeGwei: number;
  standardGwei: number;
  fastGwei: number;
  baseFeeGwei?: number;
  priorityFeeGwei?: number;
  timestamp: Date;
}

export interface VaultBalance {
  adapterId: AdapterId;
  chain: ChainId;
  asset: string;
  balance: string;
  balanceUsd: string;
  pendingInflow: string;
  pendingOutflow: string;
  lastUpdated: Date;
}

export interface VaultRebalanceResult {
  adapterId: AdapterId;
  rebalancedAt: Date;
  operations: VaultRebalanceOperation[];
  totalMovedUsd: string;
  newBalances: Record<ChainId, string>;
}

export interface VaultRebalanceOperation {
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  amount: string;
  fee: string;
  status: 'initiated' | 'completed' | 'failed';
}

export interface VaultStatus {
  adapterId: AdapterId;
  totalValueLockedUsd: string;
  balancesByChain: Record<ChainId, VaultBalance>;
  utilizationRate: number;
  rebalanceNeeded: boolean;
  lastRebalancedAt?: Date;
}

export interface FailoverStatus {
  adapterId: AdapterId;
  circuitBreakerOpen: boolean;
  failureCount: number;
  lastFailureAt?: Date;
  nextRetryAt?: Date;
  activeFailover?: AdapterId;
  healthScore: number;
}

export interface FailoverResult {
  originalAdapterId: AdapterId;
  failoverAdapterId: AdapterId;
  reason: string;
  failedAt: Date;
  estimatedRecoveryAt?: Date;
  affectedTransfers: string[];
}

export interface BridgeQuoteRequest {
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  amount: string;
  bridgeType?: BridgeType;
}

export interface BridgeQuote {
  adapterId: AdapterId;
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  inputAmount: string;
  outputAmount: string;
  feeUsd: string;
  feeBps: number;
  estimatedTimeMs: number;
  bridgeType: BridgeType;
  validUntil: Date;
  quoteId: string;
}

export interface BridgeInfo {
  adapterId: AdapterId;
  adapterName: string;
  bridgeType: BridgeType;
  supportedAssets: string[];
  estimatedFeeRange: { min: string; max: string };
  estimatedTimeRange: { min: number; max: number };
  auditScore: number;
  tvlUsd: string;
  successRate: number;
}

export interface AdapterLayerMetrics {
  totalAdapters: number;
  activeAdapters: number;
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  totalVolumeUsd: string;
  averageFeeUsd: string;
  averageTimeMs: number;
  crossChainPairsSupported: number;
  lastUpdated: Date;
}

export interface TransferHistoryFilters {
  adapterId?: AdapterId;
  fromChain?: ChainId;
  toChain?: ChainId;
  status?: TransferExecutionStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AdapterLayerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  adapterCount: number;
  activeAdapters: number;
  pendingTransfers: number;
  failedTransfers24h: number;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultAdapterLayerManager implements AdapterLayerManager {
  private adapters: Map<AdapterId, CrossChainAdapter> = new Map();
  private transfers: Map<string, CrossChainTransferResult> = new Map();
  private circuitBreakers: Map<AdapterId, FailoverStatus> = new Map();
  private vaultBalances: Map<string, VaultBalance> = new Map(); // key: `${adapterId}:${chain}`
  private eventCallbacks: IPLSEventCallback[] = [];
  private config: AdapterLayerConfig;

  constructor(config?: Partial<AdapterLayerConfig>) {
    this.config = {
      enabled: true,
      defaultFailover: true,
      gasBufferMultiplier: 1.2,
      vaultRebalanceEnabled: true,
      maxConcurrentBridges: 10,
      ...config,
    };
  }

  async registerAdapter(request: RegisterAdapterRequest): Promise<CrossChainAdapter> {
    const adapterId = this.generateId('adapter');
    const now = new Date();

    const adapter: CrossChainAdapter = {
      id: adapterId,
      name: request.name,
      bridgeType: request.bridgeType,
      supportedChains: request.supportedChains,
      supportedAssets: request.supportedAssets,
      status: 'inactive',
      config: {
        contractAddresses: {} as Record<ChainId, string>,
        relayerEndpoints: [],
        confirmationsRequired: {} as Record<ChainId, number>,
        maxTransferAmount: '1000000',
        minTransferAmount: '1',
        timeout: 300000,
        retryPolicy: {
          maxRetries: 3,
          initialDelayMs: 5000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
          retryableErrors: ['timeout', 'gas_price_too_low', 'nonce_too_low'],
        },
        securityMode: 'multisig',
        ...request.config,
      },
      metrics: {
        totalTransfers: 0,
        totalVolumeUsd: '0',
        successRate: 100,
        averageTimeMs: 0,
        averageFeeUsd: '0',
        failureCount30d: 0,
        lastTransferAt: now,
        uptimePercent: 100,
      },
      gasConfig: {
        gasEstimationBuffer: this.config.gasBufferMultiplier,
        maxGasPriceGwei: {} as Record<ChainId, number>,
        priorityFeeGwei: {} as Record<ChainId, number>,
        gasLimitOverrides: {},
        dynamicGasPricing: true,
        gasTokenFallback: {} as Record<ChainId, string>,
        ...request.gasConfig,
      },
      failoverConfig: {
        enabled: this.config.defaultFailover,
        alternateAdapters: [],
        maxFailoverAttempts: 2,
        circuitBreakerThreshold: 5,
        circuitBreakerResetMs: 3600000,
        autoFailback: true,
        ...request.failoverConfig,
      },
      vaultConfig: request.vaultConfig
        ? {
            vaultAddresses: {} as Record<ChainId, string>,
            rebalanceThreshold: 0.2,
            rebalanceStrategy: 'proportional',
            targetWeights: {} as Record<ChainId, number>,
            autoRebalance: this.config.vaultRebalanceEnabled,
            rebalanceIntervalMs: 86400000,
            ...request.vaultConfig,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.adapters.set(adapterId, adapter);

    this.circuitBreakers.set(adapterId, {
      adapterId,
      circuitBreakerOpen: false,
      failureCount: 0,
      healthScore: 100,
    });

    // Initialize vault balances
    for (const chain of request.supportedChains) {
      for (const asset of request.supportedAssets) {
        const key = `${adapterId}:${chain}:${asset}`;
        this.vaultBalances.set(key, {
          adapterId,
          chain,
          asset,
          balance: '0',
          balanceUsd: '0',
          pendingInflow: '0',
          pendingOutflow: '0',
          lastUpdated: now,
        });
      }
    }

    this.emitEvent('adapter_connected', adapterId, 'register_adapter', { adapter });

    return adapter;
  }

  async getAdapter(adapterId: AdapterId): Promise<CrossChainAdapter | null> {
    return this.adapters.get(adapterId) || null;
  }

  async updateAdapter(adapterId: AdapterId, updates: UpdateAdapterRequest): Promise<CrossChainAdapter> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const updated: CrossChainAdapter = {
      ...adapter,
      name: updates.name || adapter.name,
      supportedChains: updates.supportedChains || adapter.supportedChains,
      supportedAssets: updates.supportedAssets || adapter.supportedAssets,
      config: updates.config ? { ...adapter.config, ...updates.config } : adapter.config,
      gasConfig: updates.gasConfig
        ? { ...adapter.gasConfig, ...updates.gasConfig }
        : adapter.gasConfig,
      failoverConfig: updates.failoverConfig
        ? { ...adapter.failoverConfig, ...updates.failoverConfig }
        : adapter.failoverConfig,
      vaultConfig:
        updates.vaultConfig && adapter.vaultConfig
          ? { ...adapter.vaultConfig, ...updates.vaultConfig }
          : adapter.vaultConfig,
      updatedAt: new Date(),
    };

    this.adapters.set(adapterId, updated);
    return updated;
  }

  async removeAdapter(adapterId: AdapterId): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    this.adapters.delete(adapterId);
    this.circuitBreakers.delete(adapterId);

    this.emitEvent('adapter_disconnected', adapterId, 'remove_adapter', {
      adapterName: adapter.name,
    });
  }

  async listAdapters(filters?: AdapterFilters): Promise<CrossChainAdapter[]> {
    let adapters = Array.from(this.adapters.values());

    if (filters) {
      if (filters.bridgeTypes?.length) {
        adapters = adapters.filter((a) => filters.bridgeTypes!.includes(a.bridgeType));
      }
      if (filters.statuses?.length) {
        adapters = adapters.filter((a) => filters.statuses!.includes(a.status));
      }
      if (filters.fromChain) {
        adapters = adapters.filter((a) => a.supportedChains.includes(filters.fromChain!));
      }
      if (filters.toChain) {
        adapters = adapters.filter((a) => a.supportedChains.includes(filters.toChain!));
      }
      if (filters.asset) {
        adapters = adapters.filter((a) => a.supportedAssets.includes(filters.asset!));
      }

      if (filters.offset !== undefined) {
        adapters = adapters.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        adapters = adapters.slice(0, filters.limit);
      }
    }

    return adapters;
  }

  async getActiveAdapters(): Promise<CrossChainAdapter[]> {
    return this.listAdapters({ statuses: ['active'] });
  }

  async setAdapterStatus(
    adapterId: AdapterId,
    status: CrossChainAdapter['status'],
    reason?: string
  ): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    adapter.status = status;
    adapter.updatedAt = new Date();
    this.adapters.set(adapterId, adapter);

    if (status === 'active') {
      this.emitEvent('adapter_connected', adapterId, 'set_status_active', { reason });
    } else if (status === 'inactive' || status === 'maintenance') {
      this.emitEvent('adapter_disconnected', adapterId, 'set_status_inactive', { status, reason });
    }
  }

  async executeTransfer(request: CrossChainTransferRequest): Promise<CrossChainTransferResult> {
    const transferId = request.id || this.generateId('transfer');

    const route = await this.findOptimalRoute(request);
    if (route.adaptersUsed.length === 0) {
      throw new Error(`No route found from ${request.fromChain} to ${request.toChain} for ${request.asset}`);
    }

    const adapterId = route.adaptersUsed[0];
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not available: ${adapterId}`);
    }

    const cbStatus = this.circuitBreakers.get(adapterId);
    if (cbStatus?.circuitBreakerOpen) {
      if (this.config.defaultFailover && adapter.failoverConfig.enabled) {
        const failoverResult = await this.triggerFailover(adapterId, 'circuit_breaker_open');
        if (failoverResult.failoverAdapterId) {
          return this.executeTransferWithAdapter(transferId, request, failoverResult.failoverAdapterId, route);
        }
      }
      throw new Error(`Circuit breaker open for adapter ${adapterId}`);
    }

    return this.executeTransferWithAdapter(transferId, request, adapterId, route);
  }

  async estimateTransfer(request: CrossChainTransferRequest): Promise<TransferEstimate> {
    const activeAdapters = await this.getActiveAdapters();
    const eligibleAdapters = activeAdapters.filter(
      (a) =>
        a.supportedChains.includes(request.fromChain) &&
        a.supportedChains.includes(request.toChain) &&
        a.supportedAssets.includes(request.asset)
    );

    if (eligibleAdapters.length === 0) {
      throw new Error(
        `No adapters found for ${request.fromChain} → ${request.toChain} (${request.asset})`
      );
    }

    const bestAdapter = eligibleAdapters.sort((a, b) => {
      const scoreA = a.metrics.successRate * 0.5 - a.metrics.failureCount30d * 2;
      const scoreB = b.metrics.successRate * 0.5 - b.metrics.failureCount30d * 2;
      return scoreB - scoreA;
    })[0];

    const gasEstimate = await this.estimateGas(bestAdapter.id, 'transfer', request.fromChain);
    const bridgeFee = (parseFloat(request.amount) * 0.001).toString(); // 0.1% bridge fee estimate

    return {
      fromChain: request.fromChain,
      toChain: request.toChain,
      asset: request.asset,
      amount: request.amount,
      estimatedFeeUsd: bridgeFee,
      estimatedGasUsd: gasEstimate.estimatedCostUsd,
      estimatedTimeMs: bestAdapter.config.timeout / 2,
      recommendedAdapterId: bestAdapter.id,
      alternativeAdapters: eligibleAdapters.slice(1).map((a) => a.id),
      validUntil: new Date(Date.now() + 60000),
    };
  }

  async getTransferStatus(transferId: string): Promise<TransferStatus> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    const progress =
      transfer.status === 'completed'
        ? 100
        : transfer.status === 'confirming'
          ? 80
          : transfer.status === 'bridging'
            ? 50
            : transfer.status === 'submitted'
              ? 20
              : 0;

    return {
      transferId,
      status: transfer.status,
      currentStep: transfer.status,
      progress,
      txHashSource: transfer.txHashSource,
      txHashDestination: transfer.txHashDestination,
      estimatedCompletionAt: transfer.estimatedCompletionAt,
      lastUpdated: transfer.completedAt || transfer.startedAt,
    };
  }

  async cancelTransfer(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer not found: ${transferId}`);
    }

    if (transfer.status === 'completed' || transfer.status === 'cancelled') {
      throw new Error(`Cannot cancel transfer in status: ${transfer.status}`);
    }

    transfer.status = 'cancelled';
    transfer.completedAt = new Date();
    this.transfers.set(transferId, transfer);
  }

  async findOptimalRoute(request: CrossChainTransferRequest): Promise<CrossChainRoute> {
    const activeAdapters = await this.getActiveAdapters();

    const directAdapters = activeAdapters.filter(
      (a) =>
        a.supportedChains.includes(request.fromChain) &&
        a.supportedChains.includes(request.toChain) &&
        a.supportedAssets.includes(request.asset)
    );

    if (request.preferredAdapterId) {
      const preferred = directAdapters.find((a) => a.id === request.preferredAdapterId);
      if (preferred) {
        return this.buildRoute([preferred], request, 'Preferred adapter selected by user');
      }
    }

    if (directAdapters.length > 0) {
      const best = directAdapters.sort((a, b) => {
        const urgencyBonus = request.urgency === 'critical' ? 0 : 0;
        void urgencyBonus;
        return b.metrics.successRate - a.metrics.successRate;
      })[0];

      return this.buildRoute([best], request, 'Direct route via highest reliability adapter');
    }

    // Try 2-hop route
    const hopAdapters = activeAdapters.filter((a) =>
      a.supportedChains.includes(request.fromChain) && a.supportedAssets.includes(request.asset)
    );

    for (const hop1 of hopAdapters) {
      const intermediateChains = hop1.supportedChains.filter(
        (c) => c !== request.fromChain
      );
      for (const intermediate of intermediateChains) {
        const hop2 = activeAdapters.find(
          (a) =>
            a.supportedChains.includes(intermediate) &&
            a.supportedChains.includes(request.toChain) &&
            a.supportedAssets.includes(request.asset)
        );
        if (hop2) {
          return this.buildRoute([hop1, hop2], request, `2-hop route via ${intermediate}`);
        }
      }
    }

    // No route found — return empty route
    return {
      hops: [],
      totalFeeUsd: '0',
      totalGasUsd: '0',
      estimatedTimeMs: 0,
      riskScore: 100,
      adaptersUsed: [],
      recommended: false,
      reasoning: 'No route found',
    };
  }

  async compareRoutes(
    from: ChainId,
    to: ChainId,
    asset: string,
    amount: string
  ): Promise<RouteComparison> {
    const request: CrossChainTransferRequest = {
      fromChain: from,
      toChain: to,
      asset,
      amount,
      recipient: '',
    };

    const activeAdapters = await this.getActiveAdapters();
    const eligibleAdapters = activeAdapters.filter(
      (a) =>
        a.supportedChains.includes(from) &&
        a.supportedChains.includes(to) &&
        a.supportedAssets.includes(asset)
    );

    const routes: CrossChainRoute[] = await Promise.all(
      eligibleAdapters.map((a) =>
        this.buildRoute([a], request, `Route via ${a.name}`)
      )
    );

    if (routes.length === 0) {
      const emptyRoute: CrossChainRoute = {
        hops: [],
        totalFeeUsd: '0',
        totalGasUsd: '0',
        estimatedTimeMs: 0,
        riskScore: 100,
        adaptersUsed: [],
        recommended: false,
        reasoning: 'No routes available',
      };
      return {
        request: { from, to, asset, amount },
        routes: [],
        bestByFee: emptyRoute,
        bestBySpeed: emptyRoute,
        bestByRisk: emptyRoute,
        recommended: emptyRoute,
      };
    }

    const bestByFee = routes.reduce((best, r) =>
      parseFloat(r.totalFeeUsd) < parseFloat(best.totalFeeUsd) ? r : best
    );
    const bestBySpeed = routes.reduce((best, r) =>
      r.estimatedTimeMs < best.estimatedTimeMs ? r : best
    );
    const bestByRisk = routes.reduce((best, r) =>
      r.riskScore < best.riskScore ? r : best
    );

    // Recommended = lowest composite score of fee + time + risk
    const recommended = routes.reduce((best, r) => {
      const score =
        parseFloat(r.totalFeeUsd) * 0.4 + r.estimatedTimeMs * 0.0001 + r.riskScore * 0.5;
      const bestScore =
        parseFloat(best.totalFeeUsd) * 0.4 + best.estimatedTimeMs * 0.0001 + best.riskScore * 0.5;
      return score < bestScore ? r : best;
    });

    return {
      request: { from, to, asset, amount },
      routes,
      bestByFee,
      bestBySpeed,
      bestByRisk,
      recommended,
    };
  }

  async estimateGas(adapterId: AdapterId, action: string, chain: ChainId): Promise<GasEstimate> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const gasLimitDefaults: Record<string, number> = {
      transfer: 150000,
      bridge: 250000,
      approve: 50000,
      deposit: 100000,
      withdraw: 120000,
    };

    const gasUnits = adapter.gasConfig.gasLimitOverrides[action] || gasLimitDefaults[action] || 200000;
    const gasPriceGwei = adapter.gasConfig.maxGasPriceGwei[chain] || 30;
    const costNative = (gasUnits * gasPriceGwei * 1e-9).toString();
    const costUsd = (parseFloat(costNative) * 2000).toString(); // approximate ETH price
    const finalUsd = (parseFloat(costUsd) * adapter.gasConfig.gasEstimationBuffer).toString();

    return {
      adapterId,
      chain,
      action,
      estimatedGasUnits: gasUnits,
      gasPriceGwei,
      estimatedCostNative: costNative,
      estimatedCostUsd: costUsd,
      bufferMultiplier: adapter.gasConfig.gasEstimationBuffer,
      finalEstimateUsd: finalUsd,
    };
  }

  async updateGasConfig(adapterId: AdapterId, config: Partial<GasConfig>): Promise<void> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    adapter.gasConfig = { ...adapter.gasConfig, ...config };
    adapter.updatedAt = new Date();
    this.adapters.set(adapterId, adapter);
  }

  async getGasPrices(): Promise<Record<ChainId, GasPriceInfo>> {
    const chains: ChainId[] = ['ton', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'solana', 'avalanche', 'bsc'];
    const now = new Date();

    const mockPrices: Record<ChainId, GasPriceInfo> = {} as Record<ChainId, GasPriceInfo>;
    const chainGasRanges: Partial<Record<ChainId, [number, number, number]>> = {
      ethereum: [10, 20, 50],
      polygon: [30, 80, 200],
      arbitrum: [0.1, 0.2, 0.5],
      optimism: [0.001, 0.003, 0.01],
      base: [0.001, 0.002, 0.005],
      avalanche: [25, 30, 50],
      bsc: [3, 5, 10],
      ton: [0.01, 0.01, 0.01],
      solana: [0.001, 0.001, 0.001],
    };

    for (const chain of chains) {
      const [safe, standard, fast] = chainGasRanges[chain] || [1, 2, 5];
      mockPrices[chain] = {
        chain,
        safeGwei: safe,
        standardGwei: standard,
        fastGwei: fast,
        timestamp: now,
      };
    }

    return mockPrices;
  }

  async getVaultBalance(adapterId: AdapterId, chain: ChainId): Promise<VaultBalance> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const key = `${adapterId}:${chain}:${adapter.supportedAssets[0] || 'usdt'}`;
    return (
      this.vaultBalances.get(key) || {
        adapterId,
        chain,
        asset: adapter.supportedAssets[0] || 'usdt',
        balance: '0',
        balanceUsd: '0',
        pendingInflow: '0',
        pendingOutflow: '0',
        lastUpdated: new Date(),
      }
    );
  }

  async rebalanceVaults(adapterId: AdapterId): Promise<VaultRebalanceResult> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter || !adapter.vaultConfig) {
      throw new Error(`Adapter not found or no vault config: ${adapterId}`);
    }

    const operations: VaultRebalanceOperation[] = [];
    const newBalances: Record<ChainId, string> = {} as Record<ChainId, string>;

    for (const chain of adapter.supportedChains) {
      newBalances[chain] = '0';
    }

    return {
      adapterId,
      rebalancedAt: new Date(),
      operations,
      totalMovedUsd: '0',
      newBalances,
    };
  }

  async getVaultStatus(adapterId: AdapterId): Promise<VaultStatus> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    let totalTvl = 0;
    const balancesByChain: Record<ChainId, VaultBalance> = {} as Record<ChainId, VaultBalance>;

    for (const chain of adapter.supportedChains) {
      const balance = await this.getVaultBalance(adapterId, chain);
      balancesByChain[chain] = balance;
      totalTvl += parseFloat(balance.balanceUsd);
    }

    return {
      adapterId,
      totalValueLockedUsd: totalTvl.toString(),
      balancesByChain,
      utilizationRate: 0,
      rebalanceNeeded: false,
    };
  }

  async getFailoverStatus(adapterId: AdapterId): Promise<FailoverStatus> {
    const status = this.circuitBreakers.get(adapterId);
    if (!status) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }
    return { ...status };
  }

  async triggerFailover(adapterId: AdapterId, reason: string): Promise<FailoverResult> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    const now = new Date();
    const cbStatus = this.circuitBreakers.get(adapterId);
    if (cbStatus) {
      cbStatus.circuitBreakerOpen = true;
      cbStatus.lastFailureAt = now;
      cbStatus.nextRetryAt = new Date(now.getTime() + adapter.failoverConfig.circuitBreakerResetMs);
      this.circuitBreakers.set(adapterId, cbStatus);
    }

    // Find available failover adapter
    const failoverAdapterId = adapter.failoverConfig.alternateAdapters.find((id) => {
      const alt = this.adapters.get(id);
      const altCb = this.circuitBreakers.get(id);
      return alt?.status === 'active' && !altCb?.circuitBreakerOpen;
    }) || '';

    const pendingTransfers = Array.from(this.transfers.values())
      .filter((t) => t.adapterId === adapterId && t.status === 'bridging')
      .map((t) => t.id);

    this.emitEvent('adapter_disconnected', adapterId, 'trigger_failover', {
      reason,
      failoverAdapterId,
    });

    return {
      originalAdapterId: adapterId,
      failoverAdapterId,
      reason,
      failedAt: now,
      estimatedRecoveryAt: cbStatus?.nextRetryAt,
      affectedTransfers: pendingTransfers,
    };
  }

  async resetCircuitBreaker(adapterId: AdapterId): Promise<void> {
    const status = this.circuitBreakers.get(adapterId);
    if (!status) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }

    status.circuitBreakerOpen = false;
    status.failureCount = 0;
    status.healthScore = 100;
    delete status.nextRetryAt;
    this.circuitBreakers.set(adapterId, status);

    this.emitEvent('adapter_connected', adapterId, 'reset_circuit_breaker', {});
  }

  async getBridgeQuote(request: BridgeQuoteRequest): Promise<BridgeQuote> {
    const adapters = await this.listAdapters({
      fromChain: request.fromChain,
      toChain: request.toChain,
      asset: request.asset,
      statuses: ['active'],
    });

    if (adapters.length === 0) {
      throw new Error(`No bridge available for ${request.fromChain} → ${request.toChain}`);
    }

    const adapter = request.bridgeType
      ? adapters.find((a) => a.bridgeType === request.bridgeType) || adapters[0]
      : adapters[0];

    const feeRate = adapter.bridgeType === 'lock_mint' ? 0.001 : 0.0015;
    const fee = (parseFloat(request.amount) * feeRate).toString();
    const outputAmount = (parseFloat(request.amount) - parseFloat(fee)).toString();

    return {
      adapterId: adapter.id,
      fromChain: request.fromChain,
      toChain: request.toChain,
      asset: request.asset,
      inputAmount: request.amount,
      outputAmount,
      feeUsd: fee,
      feeBps: Math.round(feeRate * 10000),
      estimatedTimeMs: adapter.config.timeout / 2,
      bridgeType: adapter.bridgeType,
      validUntil: new Date(Date.now() + 60000),
      quoteId: this.generateId('quote'),
    };
  }

  async getSupportedBridges(from: ChainId, to: ChainId): Promise<BridgeInfo[]> {
    const adapters = await this.listAdapters({ fromChain: from, toChain: to });

    return adapters.map((a) => ({
      adapterId: a.id,
      adapterName: a.name,
      bridgeType: a.bridgeType,
      supportedAssets: a.supportedAssets,
      estimatedFeeRange: { min: '0.1', max: '50' },
      estimatedTimeRange: { min: 60000, max: a.config.timeout },
      auditScore: 80,
      tvlUsd: '10000000',
      successRate: a.metrics.successRate,
    }));
  }

  async getAdapterMetrics(adapterId: AdapterId): Promise<AdapterMetrics> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }
    return { ...adapter.metrics };
  }

  async getLayerMetrics(): Promise<AdapterLayerMetrics> {
    const adapters = Array.from(this.adapters.values());
    const activeAdapters = adapters.filter((a) => a.status === 'active');
    const transfers = Array.from(this.transfers.values());
    const completedTransfers = transfers.filter((t) => t.status === 'completed');

    const totalVolume = completedTransfers.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );
    const totalFees = completedTransfers.reduce(
      (sum, t) => sum + parseFloat(t.fee),
      0
    );

    const chainPairs = new Set<string>();
    for (const a of adapters) {
      for (const c1 of a.supportedChains) {
        for (const c2 of a.supportedChains) {
          if (c1 !== c2) chainPairs.add(`${c1}-${c2}`);
        }
      }
    }

    return {
      totalAdapters: adapters.length,
      activeAdapters: activeAdapters.length,
      totalTransfers: transfers.length,
      successfulTransfers: completedTransfers.length,
      failedTransfers: transfers.filter((t) => t.status === 'failed').length,
      totalVolumeUsd: totalVolume.toString(),
      averageFeeUsd:
        completedTransfers.length > 0 ? (totalFees / completedTransfers.length).toString() : '0',
      averageTimeMs:
        completedTransfers.length > 0
          ? completedTransfers.reduce(
              (sum, t) => sum + (t.completedAt ? t.completedAt.getTime() - t.startedAt.getTime() : 0),
              0
            ) / completedTransfers.length
          : 0,
      crossChainPairsSupported: chainPairs.size,
      lastUpdated: new Date(),
    };
  }

  async getTransferHistory(filters?: TransferHistoryFilters): Promise<CrossChainTransferResult[]> {
    let transfers = Array.from(this.transfers.values());

    if (filters) {
      if (filters.adapterId) {
        transfers = transfers.filter((t) => t.adapterId === filters.adapterId);
      }
      if (filters.fromChain) {
        transfers = transfers.filter((t) => t.request.fromChain === filters.fromChain);
      }
      if (filters.toChain) {
        transfers = transfers.filter((t) => t.request.toChain === filters.toChain);
      }
      if (filters.status) {
        transfers = transfers.filter((t) => t.status === filters.status);
      }
      if (filters.fromDate) {
        transfers = transfers.filter((t) => t.startedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        transfers = transfers.filter((t) => t.startedAt <= filters.toDate!);
      }

      if (filters.offset !== undefined) {
        transfers = transfers.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        transfers = transfers.slice(0, filters.limit);
      }
    }

    return transfers.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): AdapterLayerHealth {
    const adapters = Array.from(this.adapters.values());
    const activeAdapters = adapters.filter((a) => a.status === 'active').length;
    const pendingTransfers = Array.from(this.transfers.values()).filter(
      (t) => t.status === 'bridging' || t.status === 'submitted'
    ).length;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const failedTransfers24h = Array.from(this.transfers.values()).filter(
      (t) => t.status === 'failed' && t.startedAt >= oneDayAgo
    ).length;

    const issues: string[] = [];
    if (activeAdapters === 0) {
      issues.push('No active adapters');
    }
    if (failedTransfers24h > 10) {
      issues.push(`High failure rate: ${failedTransfers24h} failures in 24h`);
    }

    const openCircuitBreakers = Array.from(this.circuitBreakers.values()).filter(
      (cb) => cb.circuitBreakerOpen
    ).length;
    if (openCircuitBreakers > 0) {
      issues.push(`${openCircuitBreakers} circuit breaker(s) open`);
    }

    return {
      status:
        activeAdapters === 0
          ? 'unhealthy'
          : issues.length > 0
            ? 'degraded'
            : 'healthy',
      adapterCount: adapters.length,
      activeAdapters,
      pendingTransfers,
      failedTransfers24h,
      issues,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: IPLSEvent['type'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: IPLSEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      severity: 'info',
      source: 'adapter_layer',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedProtocols: [sourceId],
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

  private async executeTransferWithAdapter(
    transferId: string,
    request: CrossChainTransferRequest,
    adapterId: AdapterId,
    route: CrossChainRoute
  ): Promise<CrossChainTransferResult> {
    const adapter = this.adapters.get(adapterId)!;
    const now = new Date();

    const fee = (parseFloat(request.amount) * 0.001).toString();
    const estimatedCompletion = new Date(now.getTime() + adapter.config.timeout / 2);

    const result: CrossChainTransferResult = {
      id: transferId,
      request,
      adapterId,
      status: 'completed',
      txHashSource: `0x${this.generateId('tx').replace(/[^a-f0-9]/g, '')}`,
      txHashDestination: `0x${this.generateId('tx').replace(/[^a-f0-9]/g, '')}`,
      amount: request.amount,
      fee,
      startedAt: now,
      completedAt: new Date(),
      estimatedCompletionAt: estimatedCompletion,
    };

    this.transfers.set(transferId, result);

    // Update adapter metrics
    adapter.metrics.totalTransfers++;
    adapter.metrics.totalVolumeUsd = (
      parseFloat(adapter.metrics.totalVolumeUsd) + parseFloat(request.amount)
    ).toString();
    adapter.metrics.lastTransferAt = new Date();
    this.adapters.set(adapterId, adapter);

    this.emitEvent('liquidity_routed', adapterId, 'execute_transfer', {
      transferId,
      amount: request.amount,
      route: route.reasoning,
    });

    return result;
  }

  private async buildRoute(
    adapters: CrossChainAdapter[],
    request: CrossChainTransferRequest,
    reasoning: string
  ): Promise<CrossChainRoute> {
    const hops: RouteHop[] = [];
    let totalFee = 0;
    let totalTime = 0;
    let maxRisk = 0;

    const chains = [request.fromChain, ...adapters.slice(1).flatMap((a) =>
      a.supportedChains.filter((c) => c !== request.fromChain && c !== request.toChain)
    ), request.toChain];

    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const fromChain = chains[i] || request.fromChain;
      const toChain = i === adapters.length - 1 ? request.toChain : chains[i + 1] || request.toChain;

      const feeRate = 0.001;
      const fee = parseFloat(request.amount) * feeRate;
      totalFee += fee;
      totalTime += adapter.config.timeout / 2;
      maxRisk = Math.max(maxRisk, 100 - adapter.metrics.successRate);

      hops.push({
        fromChain,
        toChain,
        asset: request.asset,
        adapterId: adapter.id,
        estimatedFeeUsd: fee.toString(),
        estimatedTimeMs: adapter.config.timeout / 2,
        bridgeType: adapter.bridgeType,
      });
    }

    return {
      hops,
      totalFeeUsd: totalFee.toString(),
      totalGasUsd: (totalFee * 0.1).toString(),
      estimatedTimeMs: totalTime,
      riskScore: maxRisk,
      adaptersUsed: adapters.map((a) => a.id),
      recommended: adapters.length === 1,
      reasoning,
    };
  }

  /** Build a LiquidityRoute from a CrossChainRoute (for IPLS compatibility) */
  buildLiquidityRoute(crossChainRoute: CrossChainRoute, requestId: string): LiquidityRoute {
    const steps: RouteStep[] = crossChainRoute.hops.map((hop, i) => ({
      order: i + 1,
      fromChain: hop.fromChain,
      toChain: hop.toChain,
      asset: 'usdt',
      amount: '0',
      protocol: hop.adapterId,
      action: 'bridge' as const,
      estimatedTimeMs: hop.estimatedTimeMs,
      estimatedFee: hop.estimatedFeeUsd,
    }));

    return {
      id: requestId,
      steps,
      totalFee: crossChainRoute.totalFeeUsd,
      estimatedGas: crossChainRoute.totalGasUsd,
      estimatedTimeMs: crossChainRoute.estimatedTimeMs,
      bridgesUsed: crossChainRoute.adaptersUsed,
      riskScore: crossChainRoute.riskScore,
      confidence: crossChainRoute.recommended ? 0.9 : 0.7,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAdapterLayerManager(
  config?: Partial<AdapterLayerConfig>
): DefaultAdapterLayerManager {
  return new DefaultAdapterLayerManager(config);
}

export default DefaultAdapterLayerManager;
