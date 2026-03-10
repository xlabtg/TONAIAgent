/**
 * TONAIAgent - Strategy Registry
 *
 * Central registry for strategy metadata, deployment configurations, and
 * performance tracking. Integrates with the Agent Runtime to enable
 * strategy-to-agent deployment and automated performance updates.
 *
 * Responsibilities:
 * - Stores strategy metadata (id, creator, name, description, asset_types,
 *   risk_score, performance_metrics, deployment_config)
 * - Tracks performance metrics (ROI, Sharpe ratio, max drawdown, win rate,
 *   historical returns) updated automatically via the runtime
 * - Manages capital allocation tracking (total AUM per strategy)
 * - Supports creator revenue model (performance fee 20%, management fee 2%)
 * - Provides strategy discovery (filter by asset class, risk level, type)
 * - Handles strategy security & verification (sandbox status, audit badge,
 *   verified creator)
 */

import {
  MarketplaceEvent,
  MarketplaceEventCallback,
  StrategyCategory,
  StrategyStatus,
} from './types';

// ============================================================================
// Strategy Registry Types
// ============================================================================

/** Asset types supported by a strategy */
export type AssetType =
  | 'TON'
  | 'Jetton'
  | 'NFT'
  | 'LP_Token'
  | 'DeFi_Yield'
  | 'RWA'
  | 'Stablecoin'
  | 'Cross_Chain';

/** Strategy type classification */
export type StrategyType =
  | 'defi_yield'
  | 'arbitrage'
  | 'ai_trading'
  | 'portfolio_management'
  | 'copy_trading'
  | 'dca'
  | 'grid_trading'
  | 'rebalancing'
  | 'liquidity_provision';

/** Verification level for a strategy */
export type VerificationLevel = 'unverified' | 'basic' | 'audited' | 'certified';

/** Strategy performance metrics updated by agent runtime */
export interface RegistryPerformanceMetrics {
  /** Return on investment (percentage) */
  roi: number;
  /** 30-day ROI */
  roi30d: number;
  /** 90-day ROI */
  roi90d: number;
  /** 365-day ROI */
  roi365d: number;
  /** Sharpe ratio (risk-adjusted return) */
  sharpeRatio: number;
  /** Maximum drawdown percentage */
  maxDrawdown: number;
  /** Win rate percentage (0–100) */
  winRate: number;
  /** Number of historical return snapshots */
  historicalReturnCount: number;
  /** Historical return snapshots (timestamp → cumulative return %) */
  historicalReturns: HistoricalReturnSnapshot[];
  /** Last updated timestamp */
  updatedAt: Date;
}

/** A single historical return data point */
export interface HistoricalReturnSnapshot {
  timestamp: Date;
  cumulativeReturn: number;
  periodReturn: number;
}

/** Capital allocation summary for a strategy */
export interface StrategyCapitalAllocation {
  /** Total capital under management (in TON) */
  totalAUM: number;
  /** Number of direct allocators */
  directAllocators: number;
  /** Number of copy traders */
  copyTraders: number;
  /** Number of fund-style pool participants */
  poolParticipants: number;
  /** Last updated timestamp */
  updatedAt: Date;
}

/** Creator revenue configuration */
export interface CreatorRevenueConfig {
  /** Performance fee percentage (default 20%) */
  performanceFeePercent: number;
  /** Management fee percentage (default 2%) */
  managementFeeAnnualPercent: number;
  /** Creator share of fees (0–100) */
  creatorSharePercent: number;
  /** Platform share of fees (0–100) */
  platformSharePercent: number;
}

/** Deployment configuration for running a strategy as an agent */
export interface StrategyDeploymentConfig {
  /** Minimum capital to deploy this strategy (in TON) */
  minCapital: number;
  /** Maximum capital this strategy can manage (in TON) */
  maxCapital: number;
  /** Supported asset types */
  assetTypes: AssetType[];
  /** Supported protocols (e.g., "STON.fi", "DeDust", "Tonstakers") */
  protocols: string[];
  /** Rebalance interval in minutes */
  rebalanceIntervalMinutes: number;
  /** Stop-loss percentage */
  stopLossPercent: number;
  /** Take-profit percentage */
  takeProfitPercent: number;
  /** Maximum slippage tolerance percentage */
  maxSlippagePercent: number;
  /** Whether sandbox/simulation mode is available */
  sandboxEnabled: boolean;
  /** Custom deployment parameters */
  parameters: Record<string, unknown>;
}

/** Security and verification metadata */
export interface StrategySecurityInfo {
  /** Verification level */
  verificationLevel: VerificationLevel;
  /** Whether the strategy has been sandbox-tested */
  sandboxTested: boolean;
  /** Whether the strategy has been audited */
  audited: boolean;
  /** Auditor name (if audited) */
  auditor?: string;
  /** Audit date */
  auditDate?: Date;
  /** Audit report URL */
  auditReportUrl?: string;
  /** Whether the creator is verified */
  verifiedCreator: boolean;
  /** Risk score (0–100, higher = riskier) */
  riskScore: number;
  /** Code verification status */
  codeVerified: boolean;
  /** Known security issues */
  securityFlags: string[];
}

/** Full strategy registry entry */
export interface StrategyRegistryEntry {
  /** Unique strategy identifier */
  id: string;
  /** Creator user ID */
  creatorId: string;
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Strategy category */
  category: StrategyCategory;
  /** Strategy type for discovery */
  strategyType: StrategyType;
  /** Asset types the strategy trades */
  assetTypes: AssetType[];
  /** Current status */
  status: StrategyStatus;
  /** Semantic version */
  version: string;
  /** Performance metrics (updated by agent runtime) */
  performanceMetrics: RegistryPerformanceMetrics;
  /** Capital allocation summary */
  capitalAllocation: StrategyCapitalAllocation;
  /** Deployment configuration */
  deploymentConfig: StrategyDeploymentConfig;
  /** Creator revenue configuration */
  revenueConfig: CreatorRevenueConfig;
  /** Security and verification info */
  securityInfo: StrategySecurityInfo;
  /** Searchable tags */
  tags: string[];
  /** When strategy was registered */
  registeredAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** When strategy was published to marketplace */
  publishedAt?: Date;
}

// ============================================================================
// Input Types
// ============================================================================

/** Input for registering a new strategy */
export interface RegisterStrategyInput {
  creatorId: string;
  name: string;
  description: string;
  category: StrategyCategory;
  strategyType: StrategyType;
  assetTypes: AssetType[];
  deploymentConfig: Partial<StrategyDeploymentConfig>;
  revenueConfig?: Partial<CreatorRevenueConfig>;
  tags?: string[];
}

/** Input for updating performance metrics (called by agent runtime) */
export interface UpdatePerformanceInput {
  roi?: number;
  roi30d?: number;
  roi90d?: number;
  roi365d?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  winRate?: number;
  historicalReturnSnapshot?: HistoricalReturnSnapshot;
}

/** Input for updating capital allocation */
export interface UpdateCapitalAllocationInput {
  deltaAUM?: number;
  directAllocatorDelta?: number;
  copyTraderDelta?: number;
  poolParticipantDelta?: number;
}

/** Filter for discovering strategies in the registry */
export interface RegistryFilter {
  categories?: StrategyCategory[];
  strategyTypes?: StrategyType[];
  assetTypes?: AssetType[];
  riskScoreMax?: number;
  minROI?: number;
  minSharpeRatio?: number;
  maxDrawdownMax?: number;
  verificationLevel?: VerificationLevel;
  verifiedCreatorOnly?: boolean;
  creatorId?: string;
  status?: StrategyStatus[];
  tags?: string[];
  search?: string;
  sortBy?: 'roi' | 'sharpe' | 'aum' | 'win_rate' | 'newest' | 'risk_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/** Result of strategy discovery */
export interface RegistryDiscoveryResult {
  entries: StrategyRegistryEntry[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================================================
// Strategy Registry Interface
// ============================================================================

export interface StrategyRegistry {
  /** Register a new strategy */
  register(input: RegisterStrategyInput): Promise<StrategyRegistryEntry>;
  /** Get strategy by ID */
  get(strategyId: string): Promise<StrategyRegistryEntry | null>;
  /** Update strategy metadata */
  update(strategyId: string, updates: Partial<RegisterStrategyInput>): Promise<StrategyRegistryEntry>;
  /** Remove a strategy from the registry */
  deregister(strategyId: string): Promise<void>;
  /** Publish strategy to marketplace */
  publish(strategyId: string): Promise<StrategyRegistryEntry>;
  /** Unpublish strategy from marketplace */
  unpublish(strategyId: string): Promise<StrategyRegistryEntry>;

  /** Update performance metrics (called by agent runtime after execution) */
  updatePerformance(strategyId: string, metrics: UpdatePerformanceInput): Promise<void>;
  /** Update capital allocation (called when users allocate/deallocate) */
  updateCapitalAllocation(strategyId: string, update: UpdateCapitalAllocationInput): Promise<void>;

  /** Discover strategies with filters */
  discover(filter?: RegistryFilter): Promise<RegistryDiscoveryResult>;
  /** Get top strategies by a metric */
  getTopStrategies(metric: 'roi' | 'sharpe' | 'aum' | 'win_rate', limit?: number): Promise<StrategyRegistryEntry[]>;

  /** Verify a strategy (mark as audited/certified) */
  verify(strategyId: string, level: VerificationLevel, info?: Partial<StrategySecurityInfo>): Promise<StrategyRegistryEntry>;

  /** Subscribe to registry events */
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default Strategy Registry Implementation
// ============================================================================

export class DefaultStrategyRegistry implements StrategyRegistry {
  private readonly entries: Map<string, StrategyRegistryEntry> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: StrategyRegistryConfig;

  constructor(config?: Partial<StrategyRegistryConfig>) {
    this.config = {
      defaultPerformanceFeePercent: config?.defaultPerformanceFeePercent ?? 20,
      defaultManagementFeePercent: config?.defaultManagementFeePercent ?? 2,
      defaultCreatorSharePercent: config?.defaultCreatorSharePercent ?? 80,
      maxHistoricalSnapshots: config?.maxHistoricalSnapshots ?? 365,
      requireSandboxForPublish: config?.requireSandboxForPublish ?? false,
    };
  }

  async register(input: RegisterStrategyInput): Promise<StrategyRegistryEntry> {
    this.validateRegisterInput(input);

    const id = this.generateId('strategy');
    const now = new Date();

    const entry: StrategyRegistryEntry = {
      id,
      creatorId: input.creatorId,
      name: input.name,
      description: input.description,
      category: input.category,
      strategyType: input.strategyType,
      assetTypes: input.assetTypes,
      status: 'draft',
      version: '1.0.0',
      performanceMetrics: this.createEmptyMetrics(),
      capitalAllocation: this.createEmptyAllocation(),
      deploymentConfig: this.buildDeploymentConfig(input.deploymentConfig),
      revenueConfig: this.buildRevenueConfig(input.revenueConfig),
      securityInfo: this.createDefaultSecurityInfo(),
      tags: input.tags ?? [],
      registeredAt: now,
      updatedAt: now,
    };

    this.entries.set(id, entry);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_published',
      severity: 'info',
      source: 'strategy_registry',
      message: `Strategy "${entry.name}" registered`,
      data: { strategyId: id, creatorId: input.creatorId },
    });

    return entry;
  }

  async get(strategyId: string): Promise<StrategyRegistryEntry | null> {
    return this.entries.get(strategyId) ?? null;
  }

  async update(strategyId: string, updates: Partial<RegisterStrategyInput>): Promise<StrategyRegistryEntry> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (entry.status === 'archived') {
      throw new Error('Cannot update archived strategy');
    }

    const now = new Date();
    const updated: StrategyRegistryEntry = {
      ...entry,
      name: updates.name ?? entry.name,
      description: updates.description ?? entry.description,
      category: updates.category ?? entry.category,
      strategyType: updates.strategyType ?? entry.strategyType,
      assetTypes: updates.assetTypes ?? entry.assetTypes,
      deploymentConfig: updates.deploymentConfig
        ? { ...entry.deploymentConfig, ...updates.deploymentConfig }
        : entry.deploymentConfig,
      revenueConfig: updates.revenueConfig
        ? { ...entry.revenueConfig, ...updates.revenueConfig }
        : entry.revenueConfig,
      tags: updates.tags ?? entry.tags,
      updatedAt: now,
    };

    this.entries.set(strategyId, updated);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_updated',
      severity: 'info',
      source: 'strategy_registry',
      message: `Strategy "${updated.name}" updated`,
      data: { strategyId, fields: Object.keys(updates) },
    });

    return updated;
  }

  async deregister(strategyId: string): Promise<void> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (entry.capitalAllocation.totalAUM > 0) {
      throw new Error('Cannot deregister strategy with active capital allocation. Withdraw funds first.');
    }

    this.entries.delete(strategyId);
  }

  async publish(strategyId: string): Promise<StrategyRegistryEntry> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (entry.status !== 'draft' && entry.status !== 'pending_review') {
      throw new Error(`Cannot publish strategy in "${entry.status}" status`);
    }

    if (this.config.requireSandboxForPublish && !entry.securityInfo.sandboxTested) {
      throw new Error('Sandbox testing required before publishing');
    }

    const now = new Date();
    const published: StrategyRegistryEntry = {
      ...entry,
      status: 'active',
      publishedAt: now,
      updatedAt: now,
    };

    this.entries.set(strategyId, published);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'strategy_published',
      severity: 'info',
      source: 'strategy_registry',
      message: `Strategy "${entry.name}" published to marketplace`,
      data: { strategyId, category: entry.category },
    });

    return published;
  }

  async unpublish(strategyId: string): Promise<StrategyRegistryEntry> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (entry.status !== 'active') {
      throw new Error('Can only unpublish active strategies');
    }

    const now = new Date();
    const unpublished: StrategyRegistryEntry = {
      ...entry,
      status: 'paused',
      updatedAt: now,
    };

    this.entries.set(strategyId, unpublished);
    return unpublished;
  }

  async updatePerformance(strategyId: string, metrics: UpdatePerformanceInput): Promise<void> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const current = entry.performanceMetrics;

    // Append historical snapshot if provided
    let historicalReturns = [...current.historicalReturns];
    if (metrics.historicalReturnSnapshot) {
      historicalReturns = [
        ...historicalReturns,
        metrics.historicalReturnSnapshot,
      ].slice(-this.config.maxHistoricalSnapshots);
    }

    const updatedMetrics: RegistryPerformanceMetrics = {
      roi: metrics.roi ?? current.roi,
      roi30d: metrics.roi30d ?? current.roi30d,
      roi90d: metrics.roi90d ?? current.roi90d,
      roi365d: metrics.roi365d ?? current.roi365d,
      sharpeRatio: metrics.sharpeRatio ?? current.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown ?? current.maxDrawdown,
      winRate: metrics.winRate ?? current.winRate,
      historicalReturnCount: historicalReturns.length,
      historicalReturns,
      updatedAt: now,
    };

    const updated: StrategyRegistryEntry = {
      ...entry,
      performanceMetrics: updatedMetrics,
      updatedAt: now,
    };

    this.entries.set(strategyId, updated);
  }

  async updateCapitalAllocation(strategyId: string, update: UpdateCapitalAllocationInput): Promise<void> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const current = entry.capitalAllocation;

    const updatedAllocation: StrategyCapitalAllocation = {
      totalAUM: Math.max(0, current.totalAUM + (update.deltaAUM ?? 0)),
      directAllocators: Math.max(0, current.directAllocators + (update.directAllocatorDelta ?? 0)),
      copyTraders: Math.max(0, current.copyTraders + (update.copyTraderDelta ?? 0)),
      poolParticipants: Math.max(0, current.poolParticipants + (update.poolParticipantDelta ?? 0)),
      updatedAt: now,
    };

    const updated: StrategyRegistryEntry = {
      ...entry,
      capitalAllocation: updatedAllocation,
      updatedAt: now,
    };

    this.entries.set(strategyId, updated);
  }

  async discover(filter?: RegistryFilter): Promise<RegistryDiscoveryResult> {
    let results = Array.from(this.entries.values());

    if (filter) {
      results = results.filter(e => {
        if (filter.categories && !filter.categories.includes(e.category)) return false;
        if (filter.strategyTypes && !filter.strategyTypes.includes(e.strategyType)) return false;
        if (filter.assetTypes && !filter.assetTypes.some(a => e.assetTypes.includes(a))) return false;
        if (filter.riskScoreMax !== undefined && e.securityInfo.riskScore > filter.riskScoreMax) return false;
        if (filter.minROI !== undefined && e.performanceMetrics.roi < filter.minROI) return false;
        if (filter.minSharpeRatio !== undefined && e.performanceMetrics.sharpeRatio < filter.minSharpeRatio) return false;
        if (filter.maxDrawdownMax !== undefined && e.performanceMetrics.maxDrawdown > filter.maxDrawdownMax) return false;
        if (filter.verificationLevel && e.securityInfo.verificationLevel !== filter.verificationLevel) return false;
        if (filter.verifiedCreatorOnly && !e.securityInfo.verifiedCreator) return false;
        if (filter.creatorId && e.creatorId !== filter.creatorId) return false;
        if (filter.status && !filter.status.includes(e.status)) return false;
        if (filter.tags && !filter.tags.some(t => e.tags.includes(t))) return false;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          if (!e.name.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
        }
        return true;
      });

      // Sort
      if (filter.sortBy) {
        const order = filter.sortOrder === 'asc' ? 1 : -1;
        results.sort((a, b) => {
          switch (filter.sortBy) {
            case 'roi':
              return (a.performanceMetrics.roi - b.performanceMetrics.roi) * order;
            case 'sharpe':
              return (a.performanceMetrics.sharpeRatio - b.performanceMetrics.sharpeRatio) * order;
            case 'aum':
              return (a.capitalAllocation.totalAUM - b.capitalAllocation.totalAUM) * order;
            case 'win_rate':
              return (a.performanceMetrics.winRate - b.performanceMetrics.winRate) * order;
            case 'newest':
              return (a.registeredAt.getTime() - b.registeredAt.getTime()) * order;
            case 'risk_score':
              return (a.securityInfo.riskScore - b.securityInfo.riskScore) * order;
            default:
              return 0;
          }
        });
      }
    }

    const total = results.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 50;
    const paginated = results.slice(offset, offset + limit);

    return { entries: paginated, total, offset, limit };
  }

  async getTopStrategies(
    metric: 'roi' | 'sharpe' | 'aum' | 'win_rate',
    limit = 10
  ): Promise<StrategyRegistryEntry[]> {
    const result = await this.discover({
      status: ['active'],
      sortBy: metric,
      sortOrder: 'desc',
      limit,
    });
    return result.entries;
  }

  async verify(
    strategyId: string,
    level: VerificationLevel,
    info?: Partial<StrategySecurityInfo>
  ): Promise<StrategyRegistryEntry> {
    const entry = await this.get(strategyId);
    if (!entry) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    const now = new Date();
    const updated: StrategyRegistryEntry = {
      ...entry,
      securityInfo: {
        ...entry.securityInfo,
        verificationLevel: level,
        sandboxTested: info?.sandboxTested ?? entry.securityInfo.sandboxTested,
        audited: info?.audited ?? entry.securityInfo.audited,
        auditor: info?.auditor ?? entry.securityInfo.auditor,
        auditDate: info?.auditDate ?? entry.securityInfo.auditDate,
        auditReportUrl: info?.auditReportUrl ?? entry.securityInfo.auditReportUrl,
        verifiedCreator: info?.verifiedCreator ?? entry.securityInfo.verifiedCreator,
        riskScore: info?.riskScore ?? entry.securityInfo.riskScore,
        codeVerified: info?.codeVerified ?? entry.securityInfo.codeVerified,
        securityFlags: info?.securityFlags ?? entry.securityInfo.securityFlags,
      },
      updatedAt: now,
    };

    this.entries.set(strategyId, updated);
    return updated;
  }

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private validateRegisterInput(input: RegisterStrategyInput): void {
    if (!input.creatorId) throw new Error('creatorId is required');
    if (!input.name || input.name.length < 3) throw new Error('name must be at least 3 characters');
    if (!input.description || input.description.length < 10) throw new Error('description must be at least 10 characters');
    if (!input.assetTypes || input.assetTypes.length === 0) throw new Error('at least one assetType is required');
  }

  private createEmptyMetrics(): RegistryPerformanceMetrics {
    return {
      roi: 0,
      roi30d: 0,
      roi90d: 0,
      roi365d: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      historicalReturnCount: 0,
      historicalReturns: [],
      updatedAt: new Date(),
    };
  }

  private createEmptyAllocation(): StrategyCapitalAllocation {
    return {
      totalAUM: 0,
      directAllocators: 0,
      copyTraders: 0,
      poolParticipants: 0,
      updatedAt: new Date(),
    };
  }

  private buildDeploymentConfig(partial: Partial<StrategyDeploymentConfig>): StrategyDeploymentConfig {
    return {
      minCapital: partial.minCapital ?? 10,
      maxCapital: partial.maxCapital ?? 1_000_000,
      assetTypes: partial.assetTypes ?? ['TON'],
      protocols: partial.protocols ?? [],
      rebalanceIntervalMinutes: partial.rebalanceIntervalMinutes ?? 60,
      stopLossPercent: partial.stopLossPercent ?? 10,
      takeProfitPercent: partial.takeProfitPercent ?? 20,
      maxSlippagePercent: partial.maxSlippagePercent ?? 1,
      sandboxEnabled: partial.sandboxEnabled ?? true,
      parameters: partial.parameters ?? {},
    };
  }

  private buildRevenueConfig(partial?: Partial<CreatorRevenueConfig>): CreatorRevenueConfig {
    const performanceFee = Math.min(partial?.performanceFeePercent ?? this.config.defaultPerformanceFeePercent, 30);
    const managementFee = Math.min(partial?.managementFeeAnnualPercent ?? this.config.defaultManagementFeePercent, 5);
    const creatorShare = partial?.creatorSharePercent ?? this.config.defaultCreatorSharePercent;
    const platformShare = 100 - creatorShare;

    return {
      performanceFeePercent: performanceFee,
      managementFeeAnnualPercent: managementFee,
      creatorSharePercent: creatorShare,
      platformSharePercent: platformShare,
    };
  }

  private createDefaultSecurityInfo(): StrategySecurityInfo {
    return {
      verificationLevel: 'unverified',
      sandboxTested: false,
      audited: false,
      verifiedCreator: false,
      riskScore: 50,
      codeVerified: false,
      securityFlags: [],
    };
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

export interface StrategyRegistryConfig {
  /** Default performance fee percentage (default: 20%) */
  defaultPerformanceFeePercent: number;
  /** Default annual management fee percentage (default: 2%) */
  defaultManagementFeePercent: number;
  /** Default creator share of fee revenue (default: 80%) */
  defaultCreatorSharePercent: number;
  /** Maximum historical return snapshots to keep per strategy (default: 365) */
  maxHistoricalSnapshots: number;
  /** Whether sandbox testing is required before publishing (default: false) */
  requireSandboxForPublish: boolean;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyRegistry(config?: Partial<StrategyRegistryConfig>): DefaultStrategyRegistry {
  return new DefaultStrategyRegistry(config);
}
