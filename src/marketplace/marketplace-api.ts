/**
 * TONAIAgent - Marketplace API
 *
 * Unified API layer for the Strategy Marketplace v1.
 * Connects Strategy Registry, Agent Runtime integration, and all marketplace
 * operations into a single cohesive interface.
 *
 * Handles:
 * - Publishing strategies to marketplace
 * - Discovering strategies (filter by asset class, risk level, type, performance)
 * - Deploying strategies as AI agents (via agent runtime integration)
 * - Copying or allocating capital to strategies
 * - Revenue sharing (performance fee 20%, management fee 2%, creator share)
 * - Strategy security and verification
 * - Demo flow: publish → list → allocate → run → track
 */

import {
  MarketplaceEvent,
  MarketplaceEventCallback,
  StrategyCategory,
  StrategyStatus,
} from './types';

import {
  DefaultStrategyRegistry,
  createStrategyRegistry,
  StrategyRegistryConfig,
  StrategyRegistryEntry,
  RegisterStrategyInput,
  UpdatePerformanceInput,
  RegistryFilter,
  RegistryDiscoveryResult,
  AssetType,
  StrategyType,
  VerificationLevel,
  CreatorRevenueConfig,
} from './strategy-registry';

// ============================================================================
// Marketplace API Types
// ============================================================================

/** Strategy deployment request — deploys a registered strategy as an AI agent */
export interface DeployStrategyInput {
  /** Strategy ID to deploy */
  strategyId: string;
  /** User deploying the strategy */
  userId: string;
  /** Capital to allocate on deployment (in TON) */
  capitalTON: number;
  /** Optional agent name override */
  agentName?: string;
  /** Whether to run in simulation mode */
  simulationMode?: boolean;
  /** Custom deployment parameters */
  customParameters?: Record<string, unknown>;
}

/** Deployed strategy agent record */
export interface DeployedStrategyAgent {
  /** Unique agent ID */
  agentId: string;
  /** Strategy it is executing */
  strategyId: string;
  /** Owner user ID */
  userId: string;
  /** Agent name */
  name: string;
  /** Capital allocated (in TON) */
  capitalAllocated: number;
  /** Whether running in simulation */
  simulationMode: boolean;
  /** Current agent status */
  status: 'running' | 'paused' | 'stopped' | 'error';
  /** Deployment timestamp */
  deployedAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Cumulative PnL since deployment */
  cumulativePnL: number;
  /** Custom parameters used */
  customParameters: Record<string, unknown>;
}

/** Capital allocation request */
export interface AllocateCapitalInput {
  /** User making allocation */
  userId: string;
  /** Target strategy ID */
  strategyId: string;
  /** Capital amount in TON */
  amountTON: number;
  /** Allocation type */
  allocationType: 'direct' | 'copy_trading' | 'fund_pool';
}

/** Capital allocation record */
export interface CapitalAllocation {
  /** Unique allocation ID */
  id: string;
  /** User who allocated */
  userId: string;
  /** Strategy allocated to */
  strategyId: string;
  /** Amount allocated (TON) */
  amountTON: number;
  /** Allocation type */
  allocationType: 'direct' | 'copy_trading' | 'fund_pool';
  /** Status */
  status: 'active' | 'withdrawn' | 'pending';
  /** Allocated at timestamp */
  allocatedAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Current value (TON) */
  currentValueTON: number;
  /** Unrealized PnL (TON) */
  unrealizedPnL: number;
}

/** Revenue share earned by a creator */
export interface CreatorRevenueRecord {
  /** Creator user ID */
  creatorId: string;
  /** Strategy ID the revenue was generated from */
  strategyId: string;
  /** Period (e.g., "2026-03") */
  period: string;
  /** Performance fees earned (TON) */
  performanceFees: number;
  /** Management fees earned (TON) */
  managementFees: number;
  /** Total revenue (TON) */
  totalRevenue: number;
  /** Creator share (TON) */
  creatorShare: number;
  /** Platform share (TON) */
  platformShare: number;
  /** Calculated at timestamp */
  calculatedAt: Date;
}

/** Marketplace API configuration */
export interface MarketplaceAPIConfig {
  /** Strategy registry configuration */
  registry?: Partial<StrategyRegistryConfig>;
  /** Whether to require capital minimum before deployment */
  enforceCapitalMinimum?: boolean;
  /** Maximum capital per allocation (in TON) */
  maxAllocationTON?: number;
  /** Platform fee percentage (taken from creator revenue) */
  platformFeePercent?: number;
}

// ============================================================================
// Marketplace API Interface
// ============================================================================

export interface MarketplaceAPI {
  // — Strategy Publishing —
  /** Publish a new strategy to the marketplace */
  publishStrategy(input: RegisterStrategyInput): Promise<StrategyRegistryEntry>;
  /** Update an existing strategy listing */
  updateStrategy(strategyId: string, updates: Partial<RegisterStrategyInput>): Promise<StrategyRegistryEntry>;
  /** Remove a strategy from the marketplace */
  removeStrategy(strategyId: string): Promise<void>;
  /** Make strategy live (from draft/pending) */
  activateStrategy(strategyId: string): Promise<StrategyRegistryEntry>;
  /** Deactivate strategy (pause from marketplace) */
  deactivateStrategy(strategyId: string): Promise<StrategyRegistryEntry>;

  // — Strategy Discovery —
  /** List strategies with filters */
  listStrategies(filter?: RegistryFilter): Promise<RegistryDiscoveryResult>;
  /** Get strategy details */
  getStrategy(strategyId: string): Promise<StrategyRegistryEntry | null>;
  /** Get top-performing strategies */
  getTopStrategies(metric: 'roi' | 'sharpe' | 'aum' | 'win_rate', limit?: number): Promise<StrategyRegistryEntry[]>;
  /** Get featured/curated strategies */
  getFeaturedStrategies(limit?: number): Promise<StrategyRegistryEntry[]>;

  // — Strategy Deployment —
  /** Deploy a strategy as an AI agent */
  deployStrategy(input: DeployStrategyInput): Promise<DeployedStrategyAgent>;
  /** Stop a deployed strategy agent */
  stopAgent(agentId: string): Promise<void>;
  /** Get deployed agent status */
  getDeployedAgent(agentId: string): Promise<DeployedStrategyAgent | null>;
  /** List deployed agents for a user */
  listUserAgents(userId: string): Promise<DeployedStrategyAgent[]>;

  // — Capital Allocation —
  /** Allocate capital to a strategy */
  allocateCapital(input: AllocateCapitalInput): Promise<CapitalAllocation>;
  /** Withdraw capital from a strategy */
  withdrawCapital(allocationId: string): Promise<CapitalAllocation>;
  /** Get capital allocation by ID */
  getAllocation(allocationId: string): Promise<CapitalAllocation | null>;
  /** List allocations for a user */
  listUserAllocations(userId: string): Promise<CapitalAllocation[]>;
  /** List allocations for a strategy */
  listStrategyAllocations(strategyId: string): Promise<CapitalAllocation[]>;

  // — Performance Tracking —
  /** Update performance metrics for a strategy (called by agent runtime) */
  updatePerformance(strategyId: string, metrics: UpdatePerformanceInput): Promise<void>;

  // — Creator Revenue —
  /** Calculate creator revenue for a period */
  calculateCreatorRevenue(creatorId: string, period: string): Promise<CreatorRevenueRecord[]>;
  /** Get creator revenue configuration */
  getCreatorRevenueConfig(strategyId: string): Promise<CreatorRevenueConfig>;

  // — Verification —
  /** Verify a strategy */
  verifyStrategy(strategyId: string, level: VerificationLevel, info?: Record<string, unknown>): Promise<StrategyRegistryEntry>;

  // — Events —
  /** Subscribe to marketplace events */
  onEvent(callback: MarketplaceEventCallback): void;
}

// ============================================================================
// Default Marketplace API Implementation
// ============================================================================

export class DefaultMarketplaceAPI implements MarketplaceAPI {
  private readonly registry: DefaultStrategyRegistry;
  private readonly agents: Map<string, DeployedStrategyAgent> = new Map();
  private readonly allocations: Map<string, CapitalAllocation> = new Map();
  private readonly revenueRecords: Map<string, CreatorRevenueRecord[]> = new Map();
  private readonly eventCallbacks: MarketplaceEventCallback[] = [];
  private readonly config: Required<MarketplaceAPIConfig>;

  constructor(config: MarketplaceAPIConfig = {}) {
    this.config = {
      registry: config.registry ?? {},
      enforceCapitalMinimum: config.enforceCapitalMinimum ?? true,
      maxAllocationTON: config.maxAllocationTON ?? 1_000_000,
      platformFeePercent: config.platformFeePercent ?? 20,
    };

    this.registry = createStrategyRegistry(this.config.registry);

    // Forward registry events
    this.registry.onEvent((event: MarketplaceEvent) => {
      this.emitEvent(event);
    });
  }

  // ============================================================================
  // Strategy Publishing
  // ============================================================================

  async publishStrategy(input: RegisterStrategyInput): Promise<StrategyRegistryEntry> {
    return this.registry.register(input);
  }

  async updateStrategy(strategyId: string, updates: Partial<RegisterStrategyInput>): Promise<StrategyRegistryEntry> {
    return this.registry.update(strategyId, updates);
  }

  async removeStrategy(strategyId: string): Promise<void> {
    return this.registry.deregister(strategyId);
  }

  async activateStrategy(strategyId: string): Promise<StrategyRegistryEntry> {
    return this.registry.publish(strategyId);
  }

  async deactivateStrategy(strategyId: string): Promise<StrategyRegistryEntry> {
    return this.registry.unpublish(strategyId);
  }

  // ============================================================================
  // Strategy Discovery
  // ============================================================================

  async listStrategies(filter?: RegistryFilter): Promise<RegistryDiscoveryResult> {
    return this.registry.discover(filter);
  }

  async getStrategy(strategyId: string): Promise<StrategyRegistryEntry | null> {
    return this.registry.get(strategyId);
  }

  async getTopStrategies(
    metric: 'roi' | 'sharpe' | 'aum' | 'win_rate',
    limit = 10
  ): Promise<StrategyRegistryEntry[]> {
    return this.registry.getTopStrategies(metric, limit);
  }

  async getFeaturedStrategies(limit = 5): Promise<StrategyRegistryEntry[]> {
    // Featured = audited/certified active strategies with highest AUM
    const result = await this.registry.discover({
      status: ['active'],
      sortBy: 'aum',
      sortOrder: 'desc',
      limit,
    });
    return result.entries;
  }

  // ============================================================================
  // Strategy Deployment
  // ============================================================================

  async deployStrategy(input: DeployStrategyInput): Promise<DeployedStrategyAgent> {
    const strategy = await this.registry.get(input.strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${input.strategyId}`);
    }

    if (strategy.status !== 'active') {
      throw new Error(`Strategy is not active (status: ${strategy.status})`);
    }

    if (this.config.enforceCapitalMinimum) {
      const minCapital = strategy.deploymentConfig.minCapital;
      if (input.capitalTON < minCapital) {
        throw new Error(`Minimum capital for this strategy is ${minCapital} TON`);
      }
    }

    const maxCapital = strategy.deploymentConfig.maxCapital;
    if (input.capitalTON > maxCapital) {
      throw new Error(`Maximum capital for this strategy is ${maxCapital} TON`);
    }

    const agentId = this.generateId('agent');
    const now = new Date();

    const agent: DeployedStrategyAgent = {
      agentId,
      strategyId: input.strategyId,
      userId: input.userId,
      name: input.agentName ?? `${strategy.name} Agent`,
      capitalAllocated: input.capitalTON,
      simulationMode: input.simulationMode ?? false,
      status: 'running',
      deployedAt: now,
      lastActivityAt: now,
      cumulativePnL: 0,
      customParameters: input.customParameters ?? {},
    };

    this.agents.set(agentId, agent);

    // Update capital allocation in registry
    await this.registry.updateCapitalAllocation(input.strategyId, {
      deltaAUM: input.capitalTON,
      directAllocatorDelta: 1,
    });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'agent_deployed',
      severity: 'info',
      source: 'marketplace_api',
      message: `Strategy "${strategy.name}" deployed as agent ${agentId}`,
      data: {
        agentId,
        strategyId: input.strategyId,
        userId: input.userId,
        capitalTON: input.capitalTON,
        simulationMode: input.simulationMode ?? false,
      },
    });

    return agent;
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const updatedAgent: DeployedStrategyAgent = {
      ...agent,
      status: 'stopped',
      lastActivityAt: new Date(),
    };
    this.agents.set(agentId, updatedAgent);

    // Return capital to registry
    await this.registry.updateCapitalAllocation(agent.strategyId, {
      deltaAUM: -agent.capitalAllocated,
      directAllocatorDelta: -1,
    });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'agent_stopped',
      severity: 'info',
      source: 'marketplace_api',
      message: `Agent ${agentId} stopped`,
      data: { agentId, strategyId: agent.strategyId },
    });
  }

  async getDeployedAgent(agentId: string): Promise<DeployedStrategyAgent | null> {
    return this.agents.get(agentId) ?? null;
  }

  async listUserAgents(userId: string): Promise<DeployedStrategyAgent[]> {
    return Array.from(this.agents.values()).filter(a => a.userId === userId);
  }

  // ============================================================================
  // Capital Allocation
  // ============================================================================

  async allocateCapital(input: AllocateCapitalInput): Promise<CapitalAllocation> {
    const strategy = await this.registry.get(input.strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${input.strategyId}`);
    }

    if (strategy.status !== 'active') {
      throw new Error(`Strategy is not active (status: ${strategy.status})`);
    }

    if (input.amountTON <= 0) {
      throw new Error('Allocation amount must be positive');
    }

    if (input.amountTON > this.config.maxAllocationTON) {
      throw new Error(`Maximum allocation is ${this.config.maxAllocationTON} TON`);
    }

    if (this.config.enforceCapitalMinimum) {
      const min = strategy.deploymentConfig.minCapital;
      if (input.amountTON < min) {
        throw new Error(`Minimum allocation for this strategy is ${min} TON`);
      }
    }

    const allocationId = this.generateId('alloc');
    const now = new Date();

    const allocation: CapitalAllocation = {
      id: allocationId,
      userId: input.userId,
      strategyId: input.strategyId,
      amountTON: input.amountTON,
      allocationType: input.allocationType,
      status: 'active',
      allocatedAt: now,
      updatedAt: now,
      currentValueTON: input.amountTON,
      unrealizedPnL: 0,
    };

    this.allocations.set(allocationId, allocation);

    // Update registry
    await this.registry.updateCapitalAllocation(input.strategyId, {
      deltaAUM: input.amountTON,
      directAllocatorDelta: input.allocationType === 'direct' ? 1 : 0,
      copyTraderDelta: input.allocationType === 'copy_trading' ? 1 : 0,
      poolParticipantDelta: input.allocationType === 'fund_pool' ? 1 : 0,
    });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'copy_started',
      severity: 'info',
      source: 'marketplace_api',
      message: `Capital allocated to strategy ${input.strategyId}`,
      data: {
        allocationId,
        userId: input.userId,
        strategyId: input.strategyId,
        amountTON: input.amountTON,
        allocationType: input.allocationType,
      },
    });

    return allocation;
  }

  async withdrawCapital(allocationId: string): Promise<CapitalAllocation> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation) {
      throw new Error(`Allocation not found: ${allocationId}`);
    }

    if (allocation.status !== 'active') {
      throw new Error(`Allocation is not active (status: ${allocation.status})`);
    }

    const now = new Date();
    const withdrawn: CapitalAllocation = {
      ...allocation,
      status: 'withdrawn',
      updatedAt: now,
    };
    this.allocations.set(allocationId, withdrawn);

    // Update registry
    await this.registry.updateCapitalAllocation(allocation.strategyId, {
      deltaAUM: -allocation.amountTON,
      directAllocatorDelta: allocation.allocationType === 'direct' ? -1 : 0,
      copyTraderDelta: allocation.allocationType === 'copy_trading' ? -1 : 0,
      poolParticipantDelta: allocation.allocationType === 'fund_pool' ? -1 : 0,
    });

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'copy_stopped',
      severity: 'info',
      source: 'marketplace_api',
      message: `Capital withdrawn from strategy ${allocation.strategyId}`,
      data: { allocationId, strategyId: allocation.strategyId, amountTON: allocation.amountTON },
    });

    return withdrawn;
  }

  async getAllocation(allocationId: string): Promise<CapitalAllocation | null> {
    return this.allocations.get(allocationId) ?? null;
  }

  async listUserAllocations(userId: string): Promise<CapitalAllocation[]> {
    return Array.from(this.allocations.values()).filter(a => a.userId === userId);
  }

  async listStrategyAllocations(strategyId: string): Promise<CapitalAllocation[]> {
    return Array.from(this.allocations.values()).filter(a => a.strategyId === strategyId);
  }

  // ============================================================================
  // Performance Tracking
  // ============================================================================

  async updatePerformance(strategyId: string, metrics: UpdatePerformanceInput): Promise<void> {
    return this.registry.updatePerformance(strategyId, metrics);
  }

  // ============================================================================
  // Creator Revenue
  // ============================================================================

  async calculateCreatorRevenue(creatorId: string, period: string): Promise<CreatorRevenueRecord[]> {
    // Discover all strategies by this creator
    const result = await this.registry.discover({ creatorId });
    const records: CreatorRevenueRecord[] = [];

    for (const strategy of result.entries) {
      const aum = strategy.capitalAllocation.totalAUM;
      if (aum === 0) continue;

      const revenueConfig = strategy.revenueConfig;
      const roi = strategy.performanceMetrics.roi;

      // Performance fees: AUM * ROI * performanceFeePercent / 100
      const performanceFees = roi > 0 ? (aum * roi / 100) * (revenueConfig.performanceFeePercent / 100) : 0;

      // Management fees: AUM * (managementFeeAnnualPercent / 12) / 100 (monthly)
      const managementFees = aum * (revenueConfig.managementFeeAnnualPercent / 12) / 100;

      const totalRevenue = performanceFees + managementFees;
      const creatorShare = totalRevenue * (revenueConfig.creatorSharePercent / 100);
      const platformShare = totalRevenue * (revenueConfig.platformSharePercent / 100);

      records.push({
        creatorId,
        strategyId: strategy.id,
        period,
        performanceFees,
        managementFees,
        totalRevenue,
        creatorShare,
        platformShare,
        calculatedAt: new Date(),
      });
    }

    return records;
  }

  async getCreatorRevenueConfig(strategyId: string): Promise<CreatorRevenueConfig> {
    const strategy = await this.registry.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }
    return strategy.revenueConfig;
  }

  // ============================================================================
  // Verification
  // ============================================================================

  async verifyStrategy(
    strategyId: string,
    level: VerificationLevel,
    info?: Record<string, unknown>
  ): Promise<StrategyRegistryEntry> {
    return this.registry.verify(strategyId, level, info as never);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: MarketplaceEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

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
// Factory Function
// ============================================================================

export function createMarketplaceAPI(config?: MarketplaceAPIConfig): DefaultMarketplaceAPI {
  return new DefaultMarketplaceAPI(config);
}

// ============================================================================
// Re-export core registry types needed by API consumers
// ============================================================================

export type {
  StrategyRegistryEntry,
  RegisterStrategyInput,
  UpdatePerformanceInput,
  RegistryFilter,
  RegistryDiscoveryResult,
  AssetType,
  StrategyType,
  VerificationLevel,
  CreatorRevenueConfig,
  RegistryPerformanceMetrics,
  StrategyCapitalAllocation,
  StrategyDeploymentConfig,
  StrategySecurityInfo,
  HistoricalReturnSnapshot,
};
