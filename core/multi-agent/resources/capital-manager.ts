/**
 * TONAIAgent - Capital Management
 *
 * Manages capital pools, allocations, and risk distribution across agents.
 */

import {
  CapitalPool,
  CapitalAllocation,
  CapitalLimits,
  CapitalRequest,
  CapitalManager,
  TaskPriority,
  MultiAgentEvent,
} from '../types';

// ============================================================================
// Default Capital Manager Implementation
// ============================================================================

export class DefaultCapitalManager implements CapitalManager {
  private pools: Map<string, CapitalPool> = new Map();
  private requestHistory: CapitalRequest[] = [];
  private eventCallback?: (event: MultiAgentEvent) => void;
  private defaultLimits: CapitalLimits;

  constructor(options?: CapitalManagerOptions) {
    this.eventCallback = options?.eventCallback;
    this.defaultLimits = options?.defaultLimits ?? {
      maxPerAgent: 5000,
      maxPerOperation: 1000,
      dailyLimit: 10000,
      reserveRatio: 0.2,
      rebalanceThreshold: 0.1,
    };
  }

  async getPool(poolId: string): Promise<CapitalPool | undefined> {
    return this.pools.get(poolId);
  }

  async createPool(params: CreatePoolParams): Promise<CapitalPool> {
    const pool: CapitalPool = {
      id: params.id ?? `pool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      totalCapital: params.totalCapital,
      availableCapital: params.totalCapital * (1 - (params.limits?.reserveRatio ?? this.defaultLimits.reserveRatio)),
      reservedCapital: params.totalCapital * (params.limits?.reserveRatio ?? this.defaultLimits.reserveRatio),
      allocations: [],
      limits: params.limits ?? this.defaultLimits,
      lastUpdated: new Date(),
    };

    this.pools.set(pool.id, pool);

    this.emitEvent('capital_pool_created', {
      poolId: pool.id,
      totalCapital: pool.totalCapital,
    });

    return pool;
  }

  async requestCapital(request: CapitalRequest): Promise<CapitalAllocation | null> {
    // Validate request
    if (request.amount <= 0) {
      request.status = 'rejected';
      request.reason = 'Invalid amount';
      this.requestHistory.push(request);
      return null;
    }

    // Find available pool
    const pool = await this.findPoolForRequest(request);
    if (!pool) {
      request.status = 'rejected';
      request.reason = 'No pool available';
      this.requestHistory.push(request);
      return null;
    }

    // Check limits
    const limitCheck = this.checkLimits(pool, request);
    if (!limitCheck.passed) {
      request.status = 'rejected';
      request.reason = limitCheck.reason;
      this.requestHistory.push(request);
      return null;
    }

    // Check available capital
    if (request.amount > pool.availableCapital) {
      // Try partial allocation for lower priority requests
      if (request.priority >= 3 && pool.availableCapital > 0) {
        request.amount = pool.availableCapital;
      } else {
        request.status = 'rejected';
        request.reason = 'Insufficient available capital';
        this.requestHistory.push(request);
        return null;
      }
    }

    // Create allocation
    const allocation: CapitalAllocation = {
      agentId: request.agentId,
      amount: request.amount,
      purpose: request.purpose,
      status: 'active',
      allocatedAt: new Date(),
      expiresAt: request.duration ? new Date(Date.now() + request.duration) : undefined,
      performance: 0,
    };

    // Update pool
    pool.allocations.push(allocation);
    pool.availableCapital -= request.amount;
    pool.lastUpdated = new Date();

    // Update request
    request.status = 'approved';
    request.processedAt = new Date();
    this.requestHistory.push(request);

    this.emitEvent('capital_allocated', {
      agentId: request.agentId,
      amount: request.amount,
      poolId: pool.id,
      purpose: request.purpose,
    });

    return allocation;
  }

  async releaseCapital(agentId: string, amount: number): Promise<boolean> {
    for (const [, pool] of this.pools) {
      const allocation = pool.allocations.find(
        (a) => a.agentId === agentId && a.status === 'active'
      );

      if (allocation) {
        const releaseAmount = Math.min(amount, allocation.amount);

        allocation.amount -= releaseAmount;
        pool.availableCapital += releaseAmount;
        pool.lastUpdated = new Date();

        if (allocation.amount <= 0) {
          allocation.status = 'released';
          pool.allocations = pool.allocations.filter((a) => a !== allocation);
        }

        this.emitEvent('capital_released', {
          agentId,
          amount: releaseAmount,
          poolId: pool.id,
        });

        return true;
      }
    }

    return false;
  }

  async getAgentAllocation(agentId: string): Promise<number> {
    let total = 0;

    for (const [, pool] of this.pools) {
      for (const allocation of pool.allocations) {
        if (allocation.agentId === agentId && allocation.status === 'active') {
          total += allocation.amount;
        }
      }
    }

    return total;
  }

  async rebalance(): Promise<void> {
    for (const [, pool] of this.pools) {
      await this.rebalancePool(pool);
    }
  }

  async getUtilization(): Promise<number> {
    let totalCapital = 0;
    let allocatedCapital = 0;

    for (const [, pool] of this.pools) {
      totalCapital += pool.totalCapital - pool.reservedCapital;
      allocatedCapital += pool.totalCapital - pool.reservedCapital - pool.availableCapital;
    }

    return totalCapital > 0 ? allocatedCapital / totalCapital : 0;
  }

  async updatePerformance(agentId: string, pnl: number): Promise<void> {
    for (const [, pool] of this.pools) {
      for (const allocation of pool.allocations) {
        if (allocation.agentId === agentId && allocation.status === 'active') {
          allocation.performance += pnl;

          // Update pool based on performance
          if (pnl > 0) {
            pool.totalCapital += pnl;
            pool.availableCapital += pnl;
          }

          pool.lastUpdated = new Date();

          this.emitEvent('performance_updated', {
            agentId,
            pnl,
            totalPerformance: allocation.performance,
            poolId: pool.id,
          });

          return;
        }
      }
    }
  }

  // ============================================================================
  // Additional Methods
  // ============================================================================

  getAllPools(): CapitalPool[] {
    return Array.from(this.pools.values());
  }

  getStats(): CapitalManagerStats {
    let totalCapital = 0;
    let availableCapital = 0;
    let reservedCapital = 0;
    let allocatedCapital = 0;
    let totalPerformance = 0;
    const allocationsByAgent: Record<string, number> = {};

    for (const [, pool] of this.pools) {
      totalCapital += pool.totalCapital;
      availableCapital += pool.availableCapital;
      reservedCapital += pool.reservedCapital;
      allocatedCapital += pool.totalCapital - pool.availableCapital - pool.reservedCapital;

      for (const allocation of pool.allocations) {
        if (allocation.status === 'active') {
          allocationsByAgent[allocation.agentId] =
            (allocationsByAgent[allocation.agentId] ?? 0) + allocation.amount;
          totalPerformance += allocation.performance;
        }
      }
    }

    const requestStats = {
      total: this.requestHistory.length,
      approved: this.requestHistory.filter((r) => r.status === 'approved').length,
      rejected: this.requestHistory.filter((r) => r.status === 'rejected').length,
    };

    return {
      totalCapital,
      availableCapital,
      reservedCapital,
      allocatedCapital,
      utilization: totalCapital > 0 ? allocatedCapital / (totalCapital - reservedCapital) : 0,
      poolCount: this.pools.size,
      activeAllocations: Object.keys(allocationsByAgent).length,
      totalPerformance,
      allocationsByAgent,
      requestStats,
    };
  }

  private async findPoolForRequest(request: CapitalRequest): Promise<CapitalPool | null> {
    // For now, use the first pool with available capital
    // In a real implementation, this would consider pool-specific rules
    for (const [, pool] of this.pools) {
      if (pool.availableCapital >= request.amount) {
        return pool;
      }
    }

    // Return pool with most available capital for partial allocation
    let bestPool: CapitalPool | null = null;
    let maxAvailable = 0;

    for (const [, pool] of this.pools) {
      if (pool.availableCapital > maxAvailable) {
        bestPool = pool;
        maxAvailable = pool.availableCapital;
      }
    }

    return bestPool;
  }

  private checkLimits(
    pool: CapitalPool,
    request: CapitalRequest
  ): { passed: boolean; reason?: string } {
    // Check per-agent limit
    const currentAgentAllocation = pool.allocations
      .filter((a) => a.agentId === request.agentId && a.status === 'active')
      .reduce((sum, a) => sum + a.amount, 0);

    if (currentAgentAllocation + request.amount > pool.limits.maxPerAgent) {
      return { passed: false, reason: 'Exceeds per-agent limit' };
    }

    // Check per-operation limit
    if (request.amount > pool.limits.maxPerOperation) {
      return { passed: false, reason: 'Exceeds per-operation limit' };
    }

    // Check risk level for high amounts
    if (request.riskLevel === 'high' && request.amount > pool.limits.maxPerOperation * 0.5) {
      return { passed: false, reason: 'High-risk requests limited to 50% of operation limit' };
    }

    return { passed: true };
  }

  private async rebalancePool(pool: CapitalPool): Promise<void> {
    // Check if rebalancing is needed
    const totalAllocated = pool.allocations
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + a.amount, 0);

    const utilizationRatio = totalAllocated / (pool.totalCapital - pool.reservedCapital);

    if (utilizationRatio < pool.limits.rebalanceThreshold) {
      // Pool is underutilized, no action needed
      return;
    }

    // Identify underperforming allocations
    const allocations = pool.allocations.filter((a) => a.status === 'active');
    const avgPerformance = allocations.reduce((sum, a) => sum + a.performance, 0) / allocations.length;

    for (const allocation of allocations) {
      if (allocation.performance < avgPerformance * 0.5) {
        // Reduce allocation for underperformers
        const reduction = allocation.amount * 0.2; // 20% reduction
        allocation.amount -= reduction;
        pool.availableCapital += reduction;

        this.emitEvent('allocation_reduced', {
          agentId: allocation.agentId,
          reduction,
          reason: 'Underperformance during rebalance',
        });
      }
    }

    pool.lastUpdated = new Date();
  }

  private emitEvent(
    type: string,
    data: Record<string, unknown>
  ): void {
    if (!this.eventCallback) return;

    this.eventCallback({
      id: `cap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      type: type as never,
      source: 'capital_manager',
      sourceRole: 'portfolio',
      data,
      severity: 'info',
    });
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CapitalManagerOptions {
  eventCallback?: (event: MultiAgentEvent) => void;
  defaultLimits?: CapitalLimits;
}

export interface CreatePoolParams {
  id?: string;
  totalCapital: number;
  limits?: CapitalLimits;
}

export interface CapitalManagerStats {
  totalCapital: number;
  availableCapital: number;
  reservedCapital: number;
  allocatedCapital: number;
  utilization: number;
  poolCount: number;
  activeAllocations: number;
  totalPerformance: number;
  allocationsByAgent: Record<string, number>;
  requestStats: {
    total: number;
    approved: number;
    rejected: number;
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCapitalManager(
  options?: CapitalManagerOptions
): DefaultCapitalManager {
  return new DefaultCapitalManager(options);
}

// ============================================================================
// Capital Request Factory
// ============================================================================

export function createCapitalRequest(params: CreateCapitalRequestParams): CapitalRequest {
  return {
    id: params.id ?? `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    agentId: params.agentId,
    amount: params.amount,
    purpose: params.purpose,
    priority: params.priority ?? 3,
    duration: params.duration,
    expectedReturn: params.expectedReturn,
    riskLevel: params.riskLevel ?? 'medium',
    status: 'pending',
    createdAt: new Date(),
  };
}

export interface CreateCapitalRequestParams {
  id?: string;
  agentId: string;
  amount: number;
  purpose: string;
  priority?: TaskPriority;
  duration?: number;
  expectedReturn?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}
