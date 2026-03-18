/**
 * TONAIAgent - Capital Pooling Service
 *
 * Enables pooled capital management with multiple contributors,
 * configurable allocation, and permissioned access controls.
 */

import {
  CapitalPool,
  CapitalPoolType,
  PoolContributor,
  CapitalAllocation,
  PoolLimits,
  PoolPerformance,
  LaunchpadEvent,
  LaunchpadEventCallback,
} from './types';

// ============================================================================
// Capital Pool Manager Interface
// ============================================================================

export interface CapitalPoolManager {
  // Pool CRUD
  createPool(input: CreatePoolInput): Promise<CapitalPool>;
  getPool(poolId: string): CapitalPool | undefined;
  updatePool(poolId: string, updates: UpdatePoolInput): Promise<CapitalPool>;
  closePool(poolId: string, reason: string): Promise<boolean>;
  listPools(organizationId: string): CapitalPool[];

  // Pool lifecycle
  openPool(poolId: string): Promise<void>;
  pausePool(poolId: string, reason: string): Promise<void>;
  liquidatePool(poolId: string): Promise<LiquidationResult>;

  // Contributions
  contribute(input: ContributeInput): Promise<ContributionResult>;
  requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalRequest>;
  processWithdrawal(requestId: string): Promise<WithdrawalResult>;
  getContributor(poolId: string, userId: string): PoolContributor | undefined;
  listContributors(poolId: string): PoolContributor[];

  // Allocations
  allocateToAgent(input: AllocationInput): Promise<CapitalAllocation>;
  deallocateFromAgent(allocationId: string): Promise<boolean>;
  rebalanceAllocations(poolId: string): Promise<RebalanceResult>;
  listAllocations(poolId: string): CapitalAllocation[];

  // Performance
  getPoolPerformance(poolId: string): PoolPerformance | undefined;
  calculateReturns(poolId: string): PoolReturns;

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreatePoolInput {
  organizationId: string;
  name: string;
  description: string;
  type: CapitalPoolType;
  limits?: Partial<PoolLimits>;
}

export interface UpdatePoolInput {
  name?: string;
  description?: string;
  limits?: Partial<PoolLimits>;
}

export interface ContributeInput {
  poolId: string;
  userId: string;
  amount: number;
  lockDays?: number;
}

export interface ContributionResult {
  success: boolean;
  poolId: string;
  contributorId: string;
  amount: number;
  sharePercent: number;
  timestamp: Date;
  error?: string;
}

export interface WithdrawalRequestInput {
  poolId: string;
  contributorId: string;
  amount?: number;
  percentage?: number;
}

export interface WithdrawalRequest {
  id: string;
  poolId: string;
  contributorId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
  processAfter: Date;
}

export interface WithdrawalResult {
  success: boolean;
  requestId: string;
  amountWithdrawn: number;
  penaltyApplied: number;
  timestamp: Date;
  error?: string;
}

export interface AllocationInput {
  poolId: string;
  agentId: string;
  amount: number;
  maxAmount?: number;
  purpose: string;
}

export interface LiquidationResult {
  success: boolean;
  poolId: string;
  totalDistributed: number;
  distributions: { contributorId: string; amount: number }[];
  timestamp: Date;
}

export interface RebalanceResult {
  success: boolean;
  poolId: string;
  adjustments: { allocationId: string; oldAmount: number; newAmount: number }[];
  timestamp: Date;
}

export interface PoolReturns {
  poolId: string;
  totalReturns: number;
  returnsPercent: number;
  contributorReturns: { contributorId: string; returns: number; returnsPercent: number }[];
}

// ============================================================================
// Default Capital Pool Manager Implementation
// ============================================================================

export interface CapitalPoolManagerConfig {
  defaultLockPeriodDays?: number;
  defaultWithdrawalNoticeDays?: number;
  maxPoolsPerOrganization?: number;
  minContribution?: number;
}

export class DefaultCapitalPoolManager implements CapitalPoolManager {
  private pools: Map<string, CapitalPool> = new Map();
  private withdrawalRequests: Map<string, WithdrawalRequest> = new Map();
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private config: CapitalPoolManagerConfig;

  constructor(config: Partial<CapitalPoolManagerConfig> = {}) {
    this.config = {
      defaultLockPeriodDays: config.defaultLockPeriodDays ?? 30,
      defaultWithdrawalNoticeDays: config.defaultWithdrawalNoticeDays ?? 7,
      maxPoolsPerOrganization: config.maxPoolsPerOrganization ?? 50,
      minContribution: config.minContribution ?? 10,
    };
  }

  // ============================================================================
  // Pool CRUD
  // ============================================================================

  async createPool(input: CreatePoolInput): Promise<CapitalPool> {
    const poolId = `pool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    const pool: CapitalPool = {
      id: poolId,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: 'open',
      totalCapital: 0,
      availableCapital: 0,
      allocatedCapital: 0,
      reservedCapital: 0,
      contributors: [],
      allocations: [],
      limits: this.buildLimits(input.limits),
      performance: this.initializePerformance(),
      createdAt: now,
      updatedAt: now,
    };

    this.pools.set(poolId, pool);

    this.emitEvent('pool_created', input.organizationId, undefined, {
      poolId,
      poolName: input.name,
      type: input.type,
    });

    return pool;
  }

  getPool(poolId: string): CapitalPool | undefined {
    return this.pools.get(poolId);
  }

  async updatePool(poolId: string, updates: UpdatePoolInput): Promise<CapitalPool> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    if (updates.name) pool.name = updates.name;
    if (updates.description) pool.description = updates.description;
    if (updates.limits) pool.limits = { ...pool.limits, ...updates.limits };

    pool.updatedAt = new Date();
    return pool;
  }

  async closePool(poolId: string, _reason: string): Promise<boolean> {
    const pool = this.pools.get(poolId);
    if (!pool) return false;

    if (pool.allocatedCapital > 0) {
      throw new Error('Cannot close pool with active allocations');
    }

    pool.status = 'closed';
    pool.updatedAt = new Date();
    return true;
  }

  listPools(organizationId: string): CapitalPool[] {
    return Array.from(this.pools.values()).filter(
      (pool) => pool.organizationId === organizationId
    );
  }

  // ============================================================================
  // Pool Lifecycle
  // ============================================================================

  async openPool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    pool.status = 'open';
    pool.updatedAt = new Date();
  }

  async pausePool(poolId: string, _reason: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);

    pool.status = 'paused';
    pool.updatedAt = new Date();
  }

  async liquidatePool(poolId: string): Promise<LiquidationResult> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { success: false, poolId, totalDistributed: 0, distributions: [], timestamp: new Date() };
    }

    // Deallocate all allocations first
    for (const allocation of pool.allocations) {
      pool.availableCapital += allocation.amount;
      allocation.status = 'withdrawn';
    }
    pool.allocatedCapital = 0;

    // Distribute to contributors
    const distributions: { contributorId: string; amount: number }[] = [];
    for (const contributor of pool.contributors) {
      const distribution = (contributor.sharePercent / 100) * pool.availableCapital;
      distributions.push({ contributorId: contributor.id, amount: distribution });
      contributor.withdrawable = distribution;
      contributor.status = 'exited';
    }

    pool.status = 'liquidating';
    pool.totalCapital = 0;
    pool.availableCapital = 0;
    pool.updatedAt = new Date();

    return {
      success: true,
      poolId,
      totalDistributed: pool.totalCapital,
      distributions,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Contributions
  // ============================================================================

  async contribute(input: ContributeInput): Promise<ContributionResult> {
    const pool = this.pools.get(input.poolId);
    if (!pool) {
      return {
        success: false,
        poolId: input.poolId,
        contributorId: '',
        amount: 0,
        sharePercent: 0,
        timestamp: new Date(),
        error: 'Pool not found',
      };
    }

    if (pool.status !== 'open') {
      return {
        success: false,
        poolId: input.poolId,
        contributorId: '',
        amount: 0,
        sharePercent: 0,
        timestamp: new Date(),
        error: `Pool is ${pool.status}`,
      };
    }

    // Check limits
    if (input.amount < pool.limits.minContribution) {
      return {
        success: false,
        poolId: input.poolId,
        contributorId: '',
        amount: 0,
        sharePercent: 0,
        timestamp: new Date(),
        error: `Minimum contribution is ${pool.limits.minContribution}`,
      };
    }

    if (pool.totalCapital + input.amount > pool.limits.maxCapital) {
      return {
        success: false,
        poolId: input.poolId,
        contributorId: '',
        amount: 0,
        sharePercent: 0,
        timestamp: new Date(),
        error: 'Pool capacity exceeded',
      };
    }

    // Find or create contributor
    let contributor = pool.contributors.find((c) => c.userId === input.userId);
    const now = new Date();

    if (!contributor) {
      if (pool.contributors.length >= pool.limits.maxContributors) {
        return {
          success: false,
          poolId: input.poolId,
          contributorId: '',
          amount: 0,
          sharePercent: 0,
          timestamp: new Date(),
          error: 'Maximum contributors reached',
        };
      }

      contributor = {
        id: `contributor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: input.userId,
        poolId: input.poolId,
        contribution: 0,
        sharePercent: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        withdrawable: 0,
        joinedAt: now,
        lastContributionAt: now,
        status: 'active',
      };
      pool.contributors.push(contributor);
    }

    // Update contribution
    contributor.contribution += input.amount;
    contributor.lastContributionAt = now;

    if (input.lockDays) {
      contributor.lockedUntil = new Date(Date.now() + input.lockDays * 24 * 60 * 60 * 1000);
    }

    // Update pool
    pool.totalCapital += input.amount;
    pool.availableCapital += input.amount;

    // Recalculate shares
    this.recalculateShares(pool);

    pool.updatedAt = now;

    this.emitEvent('capital_contributed', pool.organizationId, undefined, {
      poolId: input.poolId,
      contributorId: contributor.id,
      amount: input.amount,
    });

    return {
      success: true,
      poolId: input.poolId,
      contributorId: contributor.id,
      amount: input.amount,
      sharePercent: contributor.sharePercent,
      timestamp: now,
    };
  }

  async requestWithdrawal(input: WithdrawalRequestInput): Promise<WithdrawalRequest> {
    const pool = this.pools.get(input.poolId);
    if (!pool) throw new Error(`Pool not found: ${input.poolId}`);

    const contributor = pool.contributors.find((c) => c.id === input.contributorId);
    if (!contributor) throw new Error(`Contributor not found: ${input.contributorId}`);

    // Check lock period
    if (contributor.lockedUntil && new Date() < contributor.lockedUntil) {
      throw new Error(`Locked until ${contributor.lockedUntil.toISOString()}`);
    }

    // Calculate amount
    let amount: number;
    if (input.amount !== undefined) {
      amount = Math.min(input.amount, contributor.contribution);
    } else if (input.percentage !== undefined) {
      amount = contributor.contribution * (input.percentage / 100);
    } else {
      amount = contributor.contribution;
    }

    const now = new Date();
    const processAfter = new Date(
      now.getTime() + pool.limits.withdrawalNoticeDays * 24 * 60 * 60 * 1000
    );

    const request: WithdrawalRequest = {
      id: `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      poolId: input.poolId,
      contributorId: input.contributorId,
      amount,
      status: 'pending',
      createdAt: now,
      processAfter,
    };

    this.withdrawalRequests.set(request.id, request);

    // Reserve the amount
    pool.reservedCapital += amount;
    contributor.status = 'exiting';

    return request;
  }

  async processWithdrawal(requestId: string): Promise<WithdrawalResult> {
    const request = this.withdrawalRequests.get(requestId);
    if (!request) {
      return { success: false, requestId, amountWithdrawn: 0, penaltyApplied: 0, timestamp: new Date(), error: 'Request not found' };
    }

    if (new Date() < request.processAfter) {
      return { success: false, requestId, amountWithdrawn: 0, penaltyApplied: 0, timestamp: new Date(), error: 'Notice period not elapsed' };
    }

    const pool = this.pools.get(request.poolId);
    if (!pool) {
      return { success: false, requestId, amountWithdrawn: 0, penaltyApplied: 0, timestamp: new Date(), error: 'Pool not found' };
    }

    const contributor = pool.contributors.find((c) => c.id === request.contributorId);
    if (!contributor) {
      return { success: false, requestId, amountWithdrawn: 0, penaltyApplied: 0, timestamp: new Date(), error: 'Contributor not found' };
    }

    // Process withdrawal
    contributor.contribution -= request.amount;
    contributor.realizedPnl += contributor.unrealizedPnl * (request.amount / contributor.contribution);

    if (contributor.contribution <= 0) {
      contributor.status = 'exited';
    } else {
      contributor.status = 'active';
    }

    pool.totalCapital -= request.amount;
    pool.availableCapital -= request.amount;
    pool.reservedCapital -= request.amount;

    this.recalculateShares(pool);
    pool.updatedAt = new Date();

    request.status = 'completed';

    this.emitEvent('capital_withdrawn', pool.organizationId, undefined, {
      poolId: request.poolId,
      contributorId: request.contributorId,
      amount: request.amount,
    });

    return {
      success: true,
      requestId,
      amountWithdrawn: request.amount,
      penaltyApplied: 0,
      timestamp: new Date(),
    };
  }

  getContributor(poolId: string, userId: string): PoolContributor | undefined {
    const pool = this.pools.get(poolId);
    return pool?.contributors.find((c) => c.userId === userId);
  }

  listContributors(poolId: string): PoolContributor[] {
    return this.pools.get(poolId)?.contributors ?? [];
  }

  // ============================================================================
  // Allocations
  // ============================================================================

  async allocateToAgent(input: AllocationInput): Promise<CapitalAllocation> {
    const pool = this.pools.get(input.poolId);
    if (!pool) throw new Error(`Pool not found: ${input.poolId}`);

    if (input.amount > pool.availableCapital) {
      throw new Error(`Insufficient available capital. Available: ${pool.availableCapital}`);
    }

    // Check allocation limits
    const currentAllocated = pool.allocations.reduce((sum, a) => sum + a.amount, 0);
    const maxAllocatable = pool.totalCapital * (pool.limits.maxAllocationPercent / 100);
    if (currentAllocated + input.amount > maxAllocatable) {
      throw new Error('Would exceed maximum allocation percentage');
    }

    const allocation: CapitalAllocation = {
      id: `allocation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      poolId: input.poolId,
      agentId: input.agentId,
      amount: input.amount,
      maxAmount: input.maxAmount ?? input.amount * 2,
      percentOfPool: (input.amount / pool.totalCapital) * 100,
      purpose: input.purpose,
      status: 'active',
      allocatedAt: new Date(),
    };

    pool.allocations.push(allocation);
    pool.availableCapital -= input.amount;
    pool.allocatedCapital += input.amount;
    pool.updatedAt = new Date();

    this.emitEvent('capital_allocated', pool.organizationId, input.agentId, {
      poolId: input.poolId,
      allocationId: allocation.id,
      amount: input.amount,
    });

    return allocation;
  }

  async deallocateFromAgent(allocationId: string): Promise<boolean> {
    for (const pool of this.pools.values()) {
      const allocationIndex = pool.allocations.findIndex((a) => a.id === allocationId);
      if (allocationIndex !== -1) {
        const allocation = pool.allocations[allocationIndex];
        pool.availableCapital += allocation.amount;
        pool.allocatedCapital -= allocation.amount;
        allocation.status = 'withdrawn';
        pool.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  async rebalanceAllocations(poolId: string): Promise<RebalanceResult> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { success: false, poolId, adjustments: [], timestamp: new Date() };
    }

    // Simple rebalancing: equalize allocations
    const activeAllocations = pool.allocations.filter((a) => a.status === 'active');
    if (activeAllocations.length === 0) {
      return { success: true, poolId, adjustments: [], timestamp: new Date() };
    }

    const totalAllocated = activeAllocations.reduce((sum, a) => sum + a.amount, 0);
    const targetPerAllocation = totalAllocated / activeAllocations.length;

    const adjustments: { allocationId: string; oldAmount: number; newAmount: number }[] = [];

    for (const allocation of activeAllocations) {
      const oldAmount = allocation.amount;
      allocation.amount = targetPerAllocation;
      allocation.percentOfPool = (targetPerAllocation / pool.totalCapital) * 100;
      allocation.lastRebalanceAt = new Date();
      adjustments.push({ allocationId: allocation.id, oldAmount, newAmount: targetPerAllocation });
    }

    pool.updatedAt = new Date();

    return { success: true, poolId, adjustments, timestamp: new Date() };
  }

  listAllocations(poolId: string): CapitalAllocation[] {
    return this.pools.get(poolId)?.allocations ?? [];
  }

  // ============================================================================
  // Performance
  // ============================================================================

  getPoolPerformance(poolId: string): PoolPerformance | undefined {
    return this.pools.get(poolId)?.performance;
  }

  calculateReturns(poolId: string): PoolReturns {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { poolId, totalReturns: 0, returnsPercent: 0, contributorReturns: [] };
    }

    const totalReturns = pool.performance.totalReturns;
    const totalContributions = pool.contributors.reduce((sum, c) => sum + c.contribution, 0);
    const returnsPercent = totalContributions > 0 ? (totalReturns / totalContributions) * 100 : 0;

    const contributorReturns = pool.contributors.map((c) => ({
      contributorId: c.id,
      returns: c.realizedPnl + c.unrealizedPnl,
      returnsPercent: c.contribution > 0 ? ((c.realizedPnl + c.unrealizedPnl) / c.contribution) * 100 : 0,
    }));

    return { poolId, totalReturns, returnsPercent, contributorReturns };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private buildLimits(input?: Partial<PoolLimits>): PoolLimits {
    return {
      maxCapital: input?.maxCapital ?? 10000000,
      minContribution: input?.minContribution ?? this.config.minContribution ?? 10,
      maxContribution: input?.maxContribution ?? 1000000,
      maxContributors: input?.maxContributors ?? 1000,
      maxAllocationPercent: input?.maxAllocationPercent ?? 80,
      reserveRatio: input?.reserveRatio ?? 0.2,
      lockPeriodDays: input?.lockPeriodDays ?? this.config.defaultLockPeriodDays ?? 30,
      withdrawalNoticeDays: input?.withdrawalNoticeDays ?? this.config.defaultWithdrawalNoticeDays ?? 7,
    };
  }

  private initializePerformance(): PoolPerformance {
    return {
      totalReturns: 0,
      returnsPercent: 0,
      allTimeHigh: 0,
      allTimeLow: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      avgMonthlyReturn: 0,
      volatility: 0,
      lastUpdated: new Date(),
    };
  }

  private recalculateShares(pool: CapitalPool): void {
    const totalContributions = pool.contributors.reduce((sum, c) => sum + c.contribution, 0);
    for (const contributor of pool.contributors) {
      contributor.sharePercent = totalContributions > 0
        ? (contributor.contribution / totalContributions) * 100
        : 0;
    }
  }

  private emitEvent(
    type: LaunchpadEvent['type'],
    organizationId: string,
    agentId?: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: LaunchpadEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      organizationId,
      agentId,
      timestamp: new Date(),
      data,
      severity: 'info',
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
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCapitalPoolManager(
  config?: Partial<CapitalPoolManagerConfig>
): DefaultCapitalPoolManager {
  return new DefaultCapitalPoolManager(config);
}
