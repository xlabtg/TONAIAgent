/**
 * TONAIAgent - IPLS v1 Liquidity Standard
 *
 * Implements the standardized LiquidityProvider and LiquidityConsumer interfaces
 * for cross-protocol liquidity routing and interoperability (Issue #124).
 */

import {
  LiquidityProvider,
  LiquidityConsumer,
  LiquidityRequest,
  LiquidityResponse,
  ExposureReport,
  ProviderCapabilities,
  ProviderRiskProfile,
  ProviderLimits,
  ProviderCompliance,
  ProviderMetadata,
  ClearingConfig,
  FeeSchedule,
  ConsumerRequirements,
  ConsumerRiskLimits,
  ConsumerMetadata,
  LiquidityRoute,
  RouteStep,
  ProtocolExposure,
  ChainId,
  ProtocolType,
  LiquidityProviderStatus,
  LiquidityConsumerStatus,
  AllocationStrategy,
  IPLSEvent,
  IPLSEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface LiquidityStandardManager {
  // Provider registration
  registerProvider(request: RegisterProviderRequest): Promise<LiquidityProvider>;
  getProvider(providerId: string): Promise<LiquidityProvider | null>;
  updateProvider(providerId: string, updates: UpdateProviderRequest): Promise<LiquidityProvider>;
  removeProvider(providerId: string): Promise<void>;
  listProviders(filters?: ProviderFilters): Promise<LiquidityProvider[]>;
  getActiveProviders(): Promise<LiquidityProvider[]>;
  updateProviderStatus(providerId: string, status: LiquidityProviderStatus, reason?: string): Promise<void>;

  // Consumer registration
  registerConsumer(request: RegisterConsumerRequest): Promise<LiquidityConsumer>;
  getConsumer(consumerId: string): Promise<LiquidityConsumer | null>;
  updateConsumer(consumerId: string, updates: UpdateConsumerRequest): Promise<LiquidityConsumer>;
  removeConsumer(consumerId: string): Promise<void>;
  listConsumers(filters?: ConsumerFilters): Promise<LiquidityConsumer[]>;
  updateConsumerStatus(consumerId: string, status: LiquidityConsumerStatus, reason?: string): Promise<void>;

  // Liquidity operations — Provider side
  deposit(providerId: string, asset: string, amount: string, chain: ChainId): Promise<DepositResult>;
  withdraw(providerId: string, asset: string, amount: string, chain: ChainId): Promise<WithdrawResult>;
  quote(providerId: string, asset: string, amount: string, chain: ChainId): Promise<LiquidityQuote>;
  route(providerId: string, request: LiquidityRequest): Promise<LiquidityRoute>;
  reportExposure(providerId: string, exposures: ProtocolExposure[]): Promise<ExposureReport>;

  // Liquidity operations — Consumer side
  requestLiquidity(consumerId: string, request: LiquidityRequest): Promise<LiquidityResponse>;
  returnLiquidity(consumerId: string, requestId: string, amount: string): Promise<ReturnResult>;
  reportRisk(consumerId: string, riskReport: ConsumerRiskReport): Promise<void>;

  // Matching and routing
  matchProvidersToRequest(request: LiquidityRequest): Promise<MatchResult[]>;
  getBestRoute(request: LiquidityRequest): Promise<OptimalAllocation>;

  // Analytics
  getProviderMetrics(providerId: string): Promise<ProviderMetricsReport>;
  getConsumerMetrics(consumerId: string): Promise<ConsumerMetricsReport>;
  getStandardMetrics(): Promise<StandardMetrics>;

  // Events
  onEvent(callback: IPLSEventCallback): void;

  // Health
  getHealth(): LiquidityStandardHealth;
}

export interface RegisterProviderRequest {
  name: string;
  type: ProtocolType;
  chainIds: ChainId[];
  supportedAssets: string[];
  capabilities?: Partial<ProviderCapabilities>;
  riskProfile?: Partial<ProviderRiskProfile>;
  clearingConfig?: Partial<ClearingConfig>;
  feeSchedule?: Partial<FeeSchedule>;
  limits?: Partial<ProviderLimits>;
  compliance?: Partial<ProviderCompliance>;
  metadata?: Partial<ProviderMetadata>;
}

export interface UpdateProviderRequest {
  name?: string;
  status?: LiquidityProviderStatus;
  chainIds?: ChainId[];
  supportedAssets?: string[];
  capabilities?: Partial<ProviderCapabilities>;
  riskProfile?: Partial<ProviderRiskProfile>;
  clearingConfig?: Partial<ClearingConfig>;
  feeSchedule?: Partial<FeeSchedule>;
  limits?: Partial<ProviderLimits>;
  compliance?: Partial<ProviderCompliance>;
  metadata?: Partial<ProviderMetadata>;
}

export interface ProviderFilters {
  types?: ProtocolType[];
  statuses?: LiquidityProviderStatus[];
  chains?: ChainId[];
  assets?: string[];
  minRiskScore?: number;
  maxRiskScore?: number;
  requireAudit?: boolean;
  minLiquidityDepth?: string;
  limit?: number;
  offset?: number;
}

export interface RegisterConsumerRequest {
  name: string;
  type: ProtocolType;
  requestedChains: ChainId[];
  preferredAssets: string[];
  requirements?: Partial<ConsumerRequirements>;
  riskLimits?: Partial<ConsumerRiskLimits>;
  metadata?: Partial<ConsumerMetadata>;
}

export interface UpdateConsumerRequest {
  name?: string;
  status?: LiquidityConsumerStatus;
  requestedChains?: ChainId[];
  preferredAssets?: string[];
  requirements?: Partial<ConsumerRequirements>;
  riskLimits?: Partial<ConsumerRiskLimits>;
  metadata?: Partial<ConsumerMetadata>;
}

export interface ConsumerFilters {
  types?: ProtocolType[];
  statuses?: LiquidityConsumerStatus[];
  chains?: ChainId[];
  assets?: string[];
  kycStatus?: string;
  limit?: number;
  offset?: number;
}

export interface DepositResult {
  txId: string;
  providerId: string;
  asset: string;
  amount: string;
  chain: ChainId;
  confirmedAt: Date;
  newBalance: string;
}

export interface WithdrawResult {
  txId: string;
  providerId: string;
  asset: string;
  amount: string;
  chain: ChainId;
  initiatedAt: Date;
  estimatedCompletionAt: Date;
  newBalance: string;
}

export interface LiquidityQuote {
  providerId: string;
  asset: string;
  amount: string;
  chain: ChainId;
  availableAmount: string;
  effectiveFeesBps: number;
  estimatedRateUsd: string;
  estimatedSlippage: number;
  validUntil: Date;
  quoteId: string;
}

export interface ReturnResult {
  txId: string;
  requestId: string;
  consumerId: string;
  returnedAmount: string;
  fee: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface ConsumerRiskReport {
  consumerId: string;
  timestamp: Date;
  currentExposure: string;
  collateralizationRatio: number;
  riskEvents: string[];
  status: 'normal' | 'elevated' | 'critical';
}

export interface MatchResult {
  providerId: string;
  providerName: string;
  availableAmount: string;
  feesBps: number;
  riskScore: number;
  estimatedSettlementMs: number;
  suitabilityScore: number;
  chain: ChainId;
}

export interface OptimalAllocation {
  requestId: string;
  allocations: AllocationLeg[];
  totalFeesBps: number;
  totalEstimatedSettlementMs: number;
  overallRiskScore: number;
  confidence: number;
  strategy: AllocationStrategy;
}

export interface AllocationLeg {
  providerId: string;
  providerName: string;
  asset: string;
  amount: string;
  percentage: number;
  feesBps: number;
  chain: ChainId;
  route: LiquidityRoute;
}

export interface ProviderMetricsReport {
  providerId: string;
  providerName: string;
  period: string;
  totalLiquidityProvided: string;
  requestsFulfilled: number;
  requestsRejected: number;
  avgFulfillmentTimeMs: number;
  totalFeesEarned: string;
  averageRiskScore: number;
  uptimePercent: number;
}

export interface ConsumerMetricsReport {
  consumerId: string;
  consumerName: string;
  period: string;
  totalLiquidityRequested: string;
  requestsFulfilled: number;
  requestsPending: number;
  avgRequestSizeUsd: string;
  totalFeesPaid: string;
  repaymentRate: number;
  creditScore: number;
}

export interface StandardMetrics {
  totalProviders: number;
  activeProviders: number;
  totalConsumers: number;
  activeConsumers: number;
  totalLiquidityPooledUsd: string;
  totalRequestsProcessed: number;
  averageFulfillmentTimeMs: number;
  systemUtilizationRate: number;
  lastUpdated: Date;
}

export interface LiquidityStandardHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providerCount: number;
  activeProviders: number;
  consumerCount: number;
  activeConsumers: number;
  pendingRequests: number;
  issues: string[];
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultLiquidityStandardManager implements LiquidityStandardManager {
  private providers: Map<string, LiquidityProvider> = new Map();
  private consumers: Map<string, LiquidityConsumer> = new Map();
  private requests: Map<string, LiquidityRequest> = new Map();
  private exposureReports: Map<string, ExposureReport> = new Map();
  private eventCallbacks: IPLSEventCallback[] = [];

  async registerProvider(request: RegisterProviderRequest): Promise<LiquidityProvider> {
    const providerId = this.generateId('provider');
    const now = new Date();

    const provider: LiquidityProvider = {
      id: providerId,
      name: request.name,
      type: request.type,
      status: 'pending_approval',
      chainIds: request.chainIds,
      supportedAssets: request.supportedAssets,
      capabilities: {
        canDeposit: true,
        canWithdraw: true,
        canQuote: true,
        canRoute: true,
        canReportExposure: true,
        canCrossChain: false,
        supportedNettingModes: ['bilateral'],
        maxConcurrentRequests: 100,
        minLiquidityDepth: '10000',
        maxResponseTimeMs: 5000,
        ...request.capabilities,
      },
      riskProfile: {
        riskTier: 'tier3',
        riskScore: 50,
        auditScore: 0,
        smartContractRisk: {
          auditsPassed: 0,
          criticalVulnerabilities: 0,
          highVulnerabilities: 0,
          mediumVulnerabilities: 0,
          upgradeability: 'unverified',
          bugBountyProgram: false,
          insuranceCoverage: '0',
        },
        liquidityDepthMetrics: {
          totalValueLocked: '0',
          avgDailyVolume: '0',
          maxSingleWithdrawal: '0',
          withdrawalQueue24h: '0',
          utilizationRate: 0,
          concentrationRisk: 0,
        },
        volatilityMetrics: {
          dailyVolatility30d: 0,
          weeklyVolatility: 0,
          maxDrawdown30d: 0,
          sharpeRatio: 0,
          correlationToMarket: 0,
        },
        lastAuditDate: now,
        nextAuditDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        ...request.riskProfile,
      },
      clearingConfig: {
        nettingMode: 'bilateral',
        settlementFinality: 'probabilistic',
        settlementCycleMs: 86400000,
        marginPortability: 'none',
        acceptedCollateral: ['ton', 'usdt', 'usdc'],
        haircuts: { ton: 0.2, usdt: 0.05, usdc: 0.05 },
        minimumMargin: '1000',
        autoRebalance: false,
        ...request.clearingConfig,
      },
      feeSchedule: {
        depositFee: 0,
        withdrawalFee: 10,
        routingFee: 5,
        flashFee: 9,
        performanceFee: 0,
        volumeDiscounts: [],
        feeAsset: 'usdt',
        feeRecipient: '',
        ...request.feeSchedule,
      },
      limits: {
        dailyDepositLimit: '1000000',
        dailyWithdrawalLimit: '1000000',
        singleTransactionLimit: '100000',
        totalExposureLimit: '5000000',
        maxConsumersPerCycle: 50,
        cooldownPeriodMs: 0,
        ...request.limits,
      },
      compliance: {
        status: 'under_review',
        jurisdictions: [],
        licenses: [],
        kycRequired: true,
        amlRequired: true,
        allowedJurisdictions: [],
        restrictedJurisdictions: [],
        lastComplianceCheck: now,
        ...request.compliance,
      },
      metadata: {
        website: '',
        documentation: '',
        contactEmail: '',
        description: '',
        tags: [],
        version: '1.0.0',
        ...request.metadata,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.providers.set(providerId, provider);
    this.emitEvent('provider_registered', 'provider', providerId, 'register_provider', { provider });

    return provider;
  }

  async getProvider(providerId: string): Promise<LiquidityProvider | null> {
    return this.providers.get(providerId) || null;
  }

  async updateProvider(providerId: string, updates: UpdateProviderRequest): Promise<LiquidityProvider> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const updated: LiquidityProvider = {
      ...provider,
      ...updates,
      capabilities: updates.capabilities
        ? { ...provider.capabilities, ...updates.capabilities }
        : provider.capabilities,
      riskProfile: updates.riskProfile
        ? { ...provider.riskProfile, ...updates.riskProfile }
        : provider.riskProfile,
      clearingConfig: updates.clearingConfig
        ? { ...provider.clearingConfig, ...updates.clearingConfig }
        : provider.clearingConfig,
      feeSchedule: updates.feeSchedule
        ? { ...provider.feeSchedule, ...updates.feeSchedule }
        : provider.feeSchedule,
      limits: updates.limits ? { ...provider.limits, ...updates.limits } : provider.limits,
      compliance: updates.compliance
        ? { ...provider.compliance, ...updates.compliance }
        : provider.compliance,
      metadata: updates.metadata ? { ...provider.metadata, ...updates.metadata } : provider.metadata,
      updatedAt: new Date(),
    };

    this.providers.set(providerId, updated);
    this.emitEvent('provider_updated', 'provider', providerId, 'update_provider', { updates });

    return updated;
  }

  async removeProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    this.providers.delete(providerId);
    this.emitEvent('provider_removed', 'provider', providerId, 'remove_provider', {
      providerName: provider.name,
    });
  }

  async listProviders(filters?: ProviderFilters): Promise<LiquidityProvider[]> {
    let providers = Array.from(this.providers.values());

    if (filters) {
      if (filters.types?.length) {
        providers = providers.filter((p) => filters.types!.includes(p.type));
      }
      if (filters.statuses?.length) {
        providers = providers.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.chains?.length) {
        providers = providers.filter((p) =>
          filters.chains!.some((c) => p.chainIds.includes(c))
        );
      }
      if (filters.assets?.length) {
        providers = providers.filter((p) =>
          filters.assets!.some((a) => p.supportedAssets.includes(a))
        );
      }
      if (filters.minRiskScore !== undefined) {
        providers = providers.filter((p) => p.riskProfile.riskScore >= filters.minRiskScore!);
      }
      if (filters.maxRiskScore !== undefined) {
        providers = providers.filter((p) => p.riskProfile.riskScore <= filters.maxRiskScore!);
      }
      if (filters.requireAudit) {
        providers = providers.filter((p) => p.riskProfile.smartContractRisk.auditsPassed > 0);
      }

      if (filters.offset !== undefined) {
        providers = providers.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        providers = providers.slice(0, filters.limit);
      }
    }

    return providers;
  }

  async getActiveProviders(): Promise<LiquidityProvider[]> {
    return this.listProviders({ statuses: ['active'] });
  }

  async updateProviderStatus(
    providerId: string,
    status: LiquidityProviderStatus,
    reason?: string
  ): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    provider.status = status;
    provider.updatedAt = new Date();
    this.providers.set(providerId, provider);

    this.emitEvent('provider_updated', 'provider', providerId, 'update_status', { status, reason });
  }

  async registerConsumer(request: RegisterConsumerRequest): Promise<LiquidityConsumer> {
    const consumerId = this.generateId('consumer');
    const now = new Date();

    const consumer: LiquidityConsumer = {
      id: consumerId,
      name: request.name,
      type: request.type,
      status: 'pending_kyc',
      requestedChains: request.requestedChains,
      preferredAssets: request.preferredAssets,
      requirements: {
        minProviderRiskTier: 'tier2',
        minLiquidityDepth: '10000',
        maxFeesBps: 50,
        requiredSettlementFinality: 'probabilistic',
        requiredNettingModes: ['bilateral'],
        preferredStrategy: 'ai_optimized',
        maxProviderCount: 5,
        requireAudit: false,
        requireInsurance: false,
        ...request.requirements,
      },
      riskLimits: {
        maxSingleExposure: '100000',
        maxTotalExposure: '500000',
        maxExposurePerChain: {} as Record<ChainId, string>,
        maxCounterpartyConcentration: 0.5,
        stopLossThreshold: 0.1,
        requiredCollateralizationRatio: 1.2,
        ...request.riskLimits,
      },
      passport: null,
      activeRequests: [],
      metadata: {
        contactEmail: '',
        description: '',
        onboardedAt: now,
        kycStatus: 'pending',
        tags: [],
        ...request.metadata,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.consumers.set(consumerId, consumer);
    this.emitEvent('consumer_registered', 'consumer', consumerId, 'register_consumer', { consumer });

    return consumer;
  }

  async getConsumer(consumerId: string): Promise<LiquidityConsumer | null> {
    return this.consumers.get(consumerId) || null;
  }

  async updateConsumer(consumerId: string, updates: UpdateConsumerRequest): Promise<LiquidityConsumer> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    const updated: LiquidityConsumer = {
      ...consumer,
      ...updates,
      requirements: updates.requirements
        ? { ...consumer.requirements, ...updates.requirements }
        : consumer.requirements,
      riskLimits: updates.riskLimits
        ? { ...consumer.riskLimits, ...updates.riskLimits }
        : consumer.riskLimits,
      metadata: updates.metadata ? { ...consumer.metadata, ...updates.metadata } : consumer.metadata,
      updatedAt: new Date(),
    };

    this.consumers.set(consumerId, updated);
    this.emitEvent('consumer_updated', 'consumer', consumerId, 'update_consumer', { updates });

    return updated;
  }

  async removeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    this.consumers.delete(consumerId);
  }

  async listConsumers(filters?: ConsumerFilters): Promise<LiquidityConsumer[]> {
    let consumers = Array.from(this.consumers.values());

    if (filters) {
      if (filters.types?.length) {
        consumers = consumers.filter((c) => filters.types!.includes(c.type));
      }
      if (filters.statuses?.length) {
        consumers = consumers.filter((c) => filters.statuses!.includes(c.status));
      }
      if (filters.chains?.length) {
        consumers = consumers.filter((c) =>
          filters.chains!.some((ch) => c.requestedChains.includes(ch))
        );
      }
      if (filters.kycStatus) {
        consumers = consumers.filter((c) => c.metadata.kycStatus === filters.kycStatus);
      }

      if (filters.offset !== undefined) {
        consumers = consumers.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        consumers = consumers.slice(0, filters.limit);
      }
    }

    return consumers;
  }

  async updateConsumerStatus(
    consumerId: string,
    status: LiquidityConsumerStatus,
    reason?: string
  ): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    consumer.status = status;
    consumer.updatedAt = new Date();
    this.consumers.set(consumerId, consumer);

    this.emitEvent('consumer_updated', 'consumer', consumerId, 'update_status', { status, reason });
  }

  async deposit(
    providerId: string,
    asset: string,
    amount: string,
    chain: ChainId
  ): Promise<DepositResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    if (provider.status !== 'active') {
      throw new Error(`Provider is not active: ${provider.status}`);
    }
    if (!provider.supportedAssets.includes(asset)) {
      throw new Error(`Asset not supported by provider: ${asset}`);
    }
    if (!provider.chainIds.includes(chain)) {
      throw new Error(`Chain not supported by provider: ${chain}`);
    }

    const amountNum = parseFloat(amount);
    const singleLimit = parseFloat(provider.limits.singleTransactionLimit);
    if (amountNum > singleLimit) {
      throw new Error(`Amount exceeds single transaction limit: ${singleLimit}`);
    }

    const currentTvl = parseFloat(provider.riskProfile.liquidityDepthMetrics.totalValueLocked);
    provider.riskProfile.liquidityDepthMetrics.totalValueLocked = (currentTvl + amountNum).toString();
    provider.updatedAt = new Date();
    this.providers.set(providerId, provider);

    return {
      txId: this.generateId('tx'),
      providerId,
      asset,
      amount,
      chain,
      confirmedAt: new Date(),
      newBalance: (currentTvl + amountNum).toString(),
    };
  }

  async withdraw(
    providerId: string,
    asset: string,
    amount: string,
    chain: ChainId
  ): Promise<WithdrawResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    if (provider.status !== 'active') {
      throw new Error(`Provider is not active: ${provider.status}`);
    }

    const amountNum = parseFloat(amount);
    const currentTvl = parseFloat(provider.riskProfile.liquidityDepthMetrics.totalValueLocked);
    if (amountNum > currentTvl) {
      throw new Error(`Insufficient liquidity: requested ${amount}, available ${currentTvl}`);
    }

    provider.riskProfile.liquidityDepthMetrics.totalValueLocked = (currentTvl - amountNum).toString();
    provider.updatedAt = new Date();
    this.providers.set(providerId, provider);

    const now = new Date();
    return {
      txId: this.generateId('tx'),
      providerId,
      asset,
      amount,
      chain,
      initiatedAt: now,
      estimatedCompletionAt: new Date(now.getTime() + provider.clearingConfig.settlementCycleMs),
      newBalance: (currentTvl - amountNum).toString(),
    };
  }

  async quote(
    providerId: string,
    asset: string,
    amount: string,
    chain: ChainId
  ): Promise<LiquidityQuote> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    if (!provider.supportedAssets.includes(asset)) {
      throw new Error(`Asset not supported: ${asset}`);
    }

    const tvl = parseFloat(provider.riskProfile.liquidityDepthMetrics.totalValueLocked);
    const requestedAmount = parseFloat(amount);
    const available = Math.min(tvl, parseFloat(provider.limits.singleTransactionLimit));

    const volumeDiscount = this.calculateVolumeDiscount(provider, requestedAmount);
    const effectiveFees = Math.max(0, provider.feeSchedule.routingFee - volumeDiscount);

    return {
      providerId,
      asset,
      amount,
      chain,
      availableAmount: available.toString(),
      effectiveFeesBps: effectiveFees,
      estimatedRateUsd: '1.0', // stablecoin assumption, override for non-stables
      estimatedSlippage: requestedAmount > available * 0.1 ? 0.01 : 0.001,
      validUntil: new Date(Date.now() + 30000),
      quoteId: this.generateId('quote'),
    };
  }

  async route(providerId: string, request: LiquidityRequest): Promise<LiquidityRoute> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const steps: RouteStep[] = [
      {
        order: 1,
        fromChain: provider.chainIds[0] || 'ton',
        toChain: request.targetChain,
        asset: request.asset,
        amount: request.amount,
        protocol: provider.name,
        action: provider.chainIds.includes(request.targetChain) ? 'deposit' : 'bridge',
        estimatedTimeMs: provider.clearingConfig.settlementCycleMs,
        estimatedFee: this.calculateFee(provider, request.amount),
        contractAddress: undefined,
      },
    ];

    const routeId = this.generateId('route');
    const totalFee = steps.reduce((sum, s) => sum + parseFloat(s.estimatedFee), 0);
    const totalTime = steps.reduce((sum, s) => sum + s.estimatedTimeMs, 0);

    return {
      id: routeId,
      steps,
      totalFee: totalFee.toString(),
      estimatedGas: '0.1',
      estimatedTimeMs: totalTime,
      bridgesUsed: steps
        .filter((s) => s.action === 'bridge')
        .map((s) => s.protocol),
      riskScore: provider.riskProfile.riskScore,
      confidence: provider.riskProfile.auditScore > 0 ? 0.9 : 0.6,
    };
  }

  async reportExposure(providerId: string, exposures: ProtocolExposure[]): Promise<ExposureReport> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const reportId = this.generateId('exposure');
    let totalExposure = 0;

    for (const exp of exposures) {
      totalExposure += parseFloat(exp.grossExposure);
    }

    const report: ExposureReport = {
      reportId,
      reporterId: providerId,
      timestamp: new Date(),
      exposures,
      totalExposureUsd: totalExposure.toString(),
      netExposureUsd: exposures
        .reduce((sum, e) => sum + parseFloat(e.netExposure), 0)
        .toString(),
      riskBreakdown: this.buildRiskBreakdown(exposures),
      topCounterparties: exposures
        .sort((a, b) => parseFloat(b.grossExposure) - parseFloat(a.grossExposure))
        .slice(0, 5)
        .map((e) => ({
          protocolId: e.counterpartyId,
          protocolName: e.counterpartyName,
          totalExposureUsd: e.grossExposure,
          concentrationRatio: parseFloat(e.grossExposure) / totalExposure,
          riskRating: 'tier2' as const,
        })),
    };

    this.exposureReports.set(reportId, report);
    this.emitEvent('risk_assessed', 'provider', providerId, 'report_exposure', { report });

    return report;
  }

  async requestLiquidity(consumerId: string, request: LiquidityRequest): Promise<LiquidityResponse> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }
    if (consumer.status !== 'active') {
      throw new Error(`Consumer is not active: ${consumer.status}`);
    }

    const matches = await this.matchProvidersToRequest(request);
    if (matches.length === 0) {
      return {
        requestId: request.id,
        providerId: '',
        approved: false,
        allocatedAmount: '0',
        allocatedAsset: request.asset,
        fee: '0',
        feeBps: 0,
        route: {
          id: '',
          steps: [],
          totalFee: '0',
          estimatedGas: '0',
          estimatedTimeMs: 0,
          bridgesUsed: [],
          riskScore: 100,
          confidence: 0,
        },
        estimatedSettlementMs: 0,
        expiresAt: new Date(),
        rejectionReason: 'No eligible liquidity providers found',
      };
    }

    const bestMatch = matches[0];
    const provider = this.providers.get(bestMatch.providerId)!;
    const route = await this.route(bestMatch.providerId, request);

    consumer.activeRequests.push(request.id);
    consumer.updatedAt = new Date();
    this.consumers.set(consumerId, consumer);
    this.requests.set(request.id, request);

    const fee = (parseFloat(request.amount) * bestMatch.feesBps) / 10000;

    this.emitEvent('liquidity_requested', 'consumer', consumerId, 'request_liquidity', { request });

    return {
      requestId: request.id,
      providerId: bestMatch.providerId,
      approved: true,
      allocatedAmount: bestMatch.availableAmount,
      allocatedAsset: request.asset,
      fee: fee.toString(),
      feeBps: bestMatch.feesBps,
      route,
      estimatedSettlementMs: provider.clearingConfig.settlementCycleMs,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  async returnLiquidity(
    consumerId: string,
    requestId: string,
    amount: string
  ): Promise<ReturnResult> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    consumer.activeRequests = consumer.activeRequests.filter((id) => id !== requestId);
    consumer.updatedAt = new Date();
    this.consumers.set(consumerId, consumer);

    this.emitEvent('liquidity_returned', 'consumer', consumerId, 'return_liquidity', {
      requestId,
      amount,
    });

    return {
      txId: this.generateId('tx'),
      requestId,
      consumerId,
      returnedAmount: amount,
      fee: '0',
      timestamp: new Date(),
      status: 'completed',
    };
  }

  async reportRisk(consumerId: string, riskReport: ConsumerRiskReport): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    if (riskReport.status === 'critical') {
      this.emitEvent('risk_alert', 'consumer', consumerId, 'risk_critical', { riskReport });
    }
  }

  async matchProvidersToRequest(request: LiquidityRequest): Promise<MatchResult[]> {
    const activeProviders = await this.getActiveProviders();
    const matches: MatchResult[] = [];

    for (const provider of activeProviders) {
      if (!provider.supportedAssets.includes(request.asset)) continue;
      if (!provider.chainIds.includes(request.targetChain)) {
        if (!provider.capabilities.canCrossChain) continue;
      }

      const tvl = parseFloat(provider.riskProfile.liquidityDepthMetrics.totalValueLocked);
      const requestedAmount = parseFloat(request.amount);

      if (tvl < requestedAmount) continue;
      if (provider.feeSchedule.routingFee > request.maxFeeBps) continue;

      const volumeDiscount = this.calculateVolumeDiscount(provider, requestedAmount);
      const effectiveFees = Math.max(0, provider.feeSchedule.routingFee - volumeDiscount);

      const suitabilityScore = this.calculateSuitabilityScore(provider, request);

      matches.push({
        providerId: provider.id,
        providerName: provider.name,
        availableAmount: Math.min(tvl, parseFloat(provider.limits.singleTransactionLimit)).toString(),
        feesBps: effectiveFees,
        riskScore: provider.riskProfile.riskScore,
        estimatedSettlementMs: provider.clearingConfig.settlementCycleMs,
        suitabilityScore,
        chain: provider.chainIds[0] || 'ton',
      });
    }

    return matches.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  async getBestRoute(request: LiquidityRequest): Promise<OptimalAllocation> {
    const matches = await this.matchProvidersToRequest(request);
    const allocations: AllocationLeg[] = [];

    let remaining = parseFloat(request.amount);
    let totalFees = 0;
    let maxSettlementTime = 0;
    let weightedRiskScore = 0;

    for (const match of matches) {
      if (remaining <= 0) break;

      const alloc = Math.min(remaining, parseFloat(match.availableAmount));
      const percentage = (alloc / parseFloat(request.amount)) * 100;
      const provider = this.providers.get(match.providerId)!;
      const route = await this.route(match.providerId, {
        ...request,
        amount: alloc.toString(),
      });

      allocations.push({
        providerId: match.providerId,
        providerName: match.providerName,
        asset: request.asset,
        amount: alloc.toString(),
        percentage,
        feesBps: match.feesBps,
        chain: match.chain,
        route,
      });

      totalFees += (match.feesBps * percentage) / 100;
      maxSettlementTime = Math.max(maxSettlementTime, provider.clearingConfig.settlementCycleMs);
      weightedRiskScore += (match.riskScore * percentage) / 100;
      remaining -= alloc;
    }

    return {
      requestId: request.id,
      allocations,
      totalFeesBps: totalFees,
      totalEstimatedSettlementMs: maxSettlementTime,
      overallRiskScore: weightedRiskScore,
      confidence: allocations.length > 0 ? 0.85 : 0,
      strategy: request.strategy,
    };
  }

  async getProviderMetrics(providerId: string): Promise<ProviderMetricsReport> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return {
      providerId: provider.id,
      providerName: provider.name,
      period: '24h',
      totalLiquidityProvided: provider.riskProfile.liquidityDepthMetrics.totalValueLocked,
      requestsFulfilled: 0,
      requestsRejected: 0,
      avgFulfillmentTimeMs: provider.clearingConfig.settlementCycleMs,
      totalFeesEarned: '0',
      averageRiskScore: provider.riskProfile.riskScore,
      uptimePercent: 99.9,
    };
  }

  async getConsumerMetrics(consumerId: string): Promise<ConsumerMetricsReport> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found: ${consumerId}`);
    }

    return {
      consumerId: consumer.id,
      consumerName: consumer.name,
      period: '24h',
      totalLiquidityRequested: '0',
      requestsFulfilled: 0,
      requestsPending: consumer.activeRequests.length,
      avgRequestSizeUsd: '0',
      totalFeesPaid: '0',
      repaymentRate: 100,
      creditScore: consumer.passport?.riskProfile.creditScore || 0,
    };
  }

  async getStandardMetrics(): Promise<StandardMetrics> {
    const providers = Array.from(this.providers.values());
    const consumers = Array.from(this.consumers.values());
    const activeProviders = providers.filter((p) => p.status === 'active');
    const activeConsumers = consumers.filter((c) => c.status === 'active');

    const totalPooled = activeProviders.reduce(
      (sum, p) => sum + parseFloat(p.riskProfile.liquidityDepthMetrics.totalValueLocked),
      0
    );

    return {
      totalProviders: providers.length,
      activeProviders: activeProviders.length,
      totalConsumers: consumers.length,
      activeConsumers: activeConsumers.length,
      totalLiquidityPooledUsd: totalPooled.toString(),
      totalRequestsProcessed: this.requests.size,
      averageFulfillmentTimeMs: 0,
      systemUtilizationRate: 0,
      lastUpdated: new Date(),
    };
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getHealth(): LiquidityStandardHealth {
    const providers = Array.from(this.providers.values());
    const consumers = Array.from(this.consumers.values());
    const activeProviders = providers.filter((p) => p.status === 'active').length;
    const activeConsumers = consumers.filter((c) => c.status === 'active').length;
    const pendingRequests = Array.from(this.consumers.values()).reduce(
      (sum, c) => sum + c.activeRequests.length,
      0
    );

    const issues: string[] = [];
    if (activeProviders === 0) {
      issues.push('No active liquidity providers');
    }
    if (providers.filter((p) => p.status === 'suspended').length > 0) {
      issues.push('Some providers are suspended');
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (activeProviders === 0) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      providerCount: providers.length,
      activeProviders,
      consumerCount: consumers.length,
      activeConsumers,
      pendingRequests,
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
    _category: string,
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: IPLSEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      severity: 'info',
      source: 'liquidity_standard',
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

  private calculateVolumeDiscount(provider: LiquidityProvider, amount: number): number {
    let discount = 0;
    for (const vd of provider.feeSchedule.volumeDiscounts) {
      if (amount >= parseFloat(vd.volumeThreshold)) {
        discount = Math.max(discount, vd.discountBps);
      }
    }
    return discount;
  }

  private calculateFee(provider: LiquidityProvider, amount: string): string {
    const amountNum = parseFloat(amount);
    const fee = (amountNum * provider.feeSchedule.routingFee) / 10000;
    return fee.toString();
  }

  private calculateSuitabilityScore(provider: LiquidityProvider, request: LiquidityRequest): number {
    let score = 100;

    // Lower risk score = better (safer)
    score -= provider.riskProfile.riskScore * 0.3;

    // Lower fees = better
    score -= (provider.feeSchedule.routingFee / request.maxFeeBps) * 20;

    // Audit bonus
    if (provider.riskProfile.smartContractRisk.auditsPassed > 0) {
      score += 10;
    }

    // Direct chain support bonus
    if (provider.chainIds.includes(request.targetChain)) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private buildRiskBreakdown(exposures: ProtocolExposure[]): Record<string, string> {
    const breakdown: Record<string, string> = {};
    for (const exp of exposures) {
      const existing = parseFloat(breakdown[exp.exposureType] || '0');
      breakdown[exp.exposureType] = (existing + parseFloat(exp.grossExposure)).toString();
    }
    return breakdown;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiquidityStandardManager(): DefaultLiquidityStandardManager {
  return new DefaultLiquidityStandardManager();
}

export default DefaultLiquidityStandardManager;
