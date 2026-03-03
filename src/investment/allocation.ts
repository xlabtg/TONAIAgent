/**
 * Capital Allocation Framework
 *
 * Manages single-strategy and multi-strategy capital allocation for investment vaults.
 * Supports weighted distribution, AI-driven dynamic rebalancing, and
 * performance-based reallocation.
 *
 * Example: Vault → 40% Trading Agent, 30% Yield Agent, 30% Arbitrage Agent
 */

import type {
  AllocationPlan,
  AllocationStrategy,
  AllocationStatus,
  StrategyAllocation,
  CreateAllocationPlanInput,
  RebalanceResult,
  InvestmentEvent,
  InvestmentEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface AllocationEngine {
  // Plan management
  createAllocationPlan(input: CreateAllocationPlanInput): Promise<AllocationPlan>;
  getAllocationPlan(planId: string): Promise<AllocationPlan | null>;
  listAllocationPlans(vaultId: string): Promise<AllocationPlan[]>;
  updateAllocationStatus(planId: string, status: AllocationStatus): Promise<AllocationPlan>;
  terminateAllocationPlan(planId: string): Promise<AllocationPlan>;

  // Allocation operations
  updateAllocations(planId: string, allocations: Partial<StrategyAllocation>[]): Promise<AllocationPlan>;
  rebalance(planId: string, reason?: RebalanceResult['reason']): Promise<RebalanceResult>;
  checkRebalanceNeeded(planId: string): Promise<boolean>;
  listRebalanceHistory(planId: string): Promise<RebalanceResult[]>;

  // Performance-based operations
  updatePerformanceScores(planId: string, scores: Record<string, number>): Promise<AllocationPlan>;
  applyPerformanceReallocation(planId: string): Promise<RebalanceResult>;

  // Events
  onEvent(callback: InvestmentEventCallback): () => void;
}

// ============================================================================
// Configuration
// ============================================================================

export interface AllocationEngineConfig {
  defaultRebalanceThreshold: number; // % drift before auto-rebalance
  maxStrategiesPerPlan: number;
  minAllocationPercent: number;
  maxAllocationPercent: number;
  performanceReallocationStep: number; // % shift per rebalance cycle
}

const DEFAULT_CONFIG: AllocationEngineConfig = {
  defaultRebalanceThreshold: 5, // 5% drift
  maxStrategiesPerPlan: 20,
  minAllocationPercent: 1,
  maxAllocationPercent: 80,
  performanceReallocationStep: 5,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAllocationEngine implements AllocationEngine {
  private readonly config: AllocationEngineConfig;
  private readonly plans: Map<string, AllocationPlan> = new Map();
  private readonly rebalanceHistory: Map<string, RebalanceResult[]> = new Map();
  private readonly eventCallbacks: InvestmentEventCallback[] = [];

  constructor(config: Partial<AllocationEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createAllocationPlan(input: CreateAllocationPlanInput): Promise<AllocationPlan> {
    // Validate allocations
    this.validateAllocations(input.allocations.map(a => ({ ...a, targetPercent: a.targetPercent })));

    if (input.allocations.length > this.config.maxStrategiesPerPlan) {
      throw new Error(`Too many strategies: max ${this.config.maxStrategiesPerPlan}`);
    }

    const now = new Date();
    const planId = this.generateId('plan');

    const allocations: StrategyAllocation[] = input.allocations.map(a => ({
      ...a,
      currentPercent: a.targetPercent,
      allocatedAmount: 0, // Will be computed when vault balance is known
      performanceScore: 50, // Neutral starting score
    }));

    const plan: AllocationPlan = {
      id: planId,
      vaultId: input.vaultId,
      strategy: input.strategy,
      status: 'active',
      allocations,
      totalAllocated: 0,
      rebalanceThreshold: input.rebalanceThreshold ?? this.config.defaultRebalanceThreshold,
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(planId, plan);
    this.rebalanceHistory.set(planId, []);

    this.emitEvent({
      type: 'allocation_created',
      timestamp: now,
      data: { planId, vaultId: input.vaultId, strategy: input.strategy, allocationCount: allocations.length },
    });

    return plan;
  }

  async getAllocationPlan(planId: string): Promise<AllocationPlan | null> {
    return this.plans.get(planId) ?? null;
  }

  async listAllocationPlans(vaultId: string): Promise<AllocationPlan[]> {
    return Array.from(this.plans.values()).filter(p => p.vaultId === vaultId);
  }

  async updateAllocationStatus(planId: string, status: AllocationStatus): Promise<AllocationPlan> {
    const plan = this.getPlanOrThrow(planId);
    const updatedPlan: AllocationPlan = { ...plan, status, updatedAt: new Date() };
    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  async terminateAllocationPlan(planId: string): Promise<AllocationPlan> {
    return this.updateAllocationStatus(planId, 'terminated');
  }

  async updateAllocations(planId: string, updates: Partial<StrategyAllocation>[]): Promise<AllocationPlan> {
    const plan = this.getPlanOrThrow(planId);

    const updatedAllocations = plan.allocations.map(existing => {
      const update = updates.find(u => u.strategyId === existing.strategyId);
      if (!update) return existing;
      return { ...existing, ...update };
    });

    // Check for new allocations being added via updates
    for (const update of updates) {
      if (update.strategyId && !plan.allocations.find(a => a.strategyId === update.strategyId)) {
        if (update.targetPercent !== undefined && update.agentId && update.weight !== undefined) {
          updatedAllocations.push({
            strategyId: update.strategyId,
            agentId: update.agentId,
            targetPercent: update.targetPercent,
            currentPercent: update.targetPercent,
            allocatedAmount: update.allocatedAmount ?? 0,
            weight: update.weight,
            performanceScore: update.performanceScore ?? 50,
          });
        }
      }
    }

    this.validateAllocations(updatedAllocations);

    const updatedPlan: AllocationPlan = {
      ...plan,
      allocations: updatedAllocations,
      updatedAt: new Date(),
    };
    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  async rebalance(planId: string, reason: RebalanceResult['reason'] = 'manual'): Promise<RebalanceResult> {
    const plan = this.getPlanOrThrow(planId);

    const previousAllocations = plan.allocations.map(a => ({ ...a }));

    // Rebalance: reset current allocations to target
    const newAllocations: StrategyAllocation[] = plan.allocations.map(a => ({
      ...a,
      currentPercent: a.targetPercent,
    }));

    const totalRebalanced = previousAllocations.reduce((sum, prev) => {
      const next = newAllocations.find(a => a.strategyId === prev.strategyId);
      if (!next) return sum;
      return sum + Math.abs(next.currentPercent - prev.currentPercent);
    }, 0);

    const now = new Date();
    const result: RebalanceResult = {
      planId,
      previousAllocations,
      newAllocations,
      totalRebalanced,
      reason,
      timestamp: now,
    };

    const history = this.rebalanceHistory.get(planId) ?? [];
    history.push(result);
    this.rebalanceHistory.set(planId, history);

    const updatedPlan: AllocationPlan = {
      ...plan,
      allocations: newAllocations,
      lastRebalancedAt: now,
      updatedAt: now,
      status: 'active',
    };
    this.plans.set(planId, updatedPlan);

    this.emitEvent({
      type: 'allocation_rebalanced',
      timestamp: now,
      data: { planId, vaultId: plan.vaultId, reason, totalRebalanced },
    });

    return result;
  }

  async checkRebalanceNeeded(planId: string): Promise<boolean> {
    const plan = this.getPlanOrThrow(planId);
    for (const allocation of plan.allocations) {
      const drift = Math.abs(allocation.currentPercent - allocation.targetPercent);
      if (drift >= plan.rebalanceThreshold) return true;
    }
    return false;
  }

  async listRebalanceHistory(planId: string): Promise<RebalanceResult[]> {
    return this.rebalanceHistory.get(planId) ?? [];
  }

  async updatePerformanceScores(planId: string, scores: Record<string, number>): Promise<AllocationPlan> {
    const plan = this.getPlanOrThrow(planId);
    const updatedAllocations = plan.allocations.map(a => ({
      ...a,
      performanceScore: scores[a.strategyId] ?? a.performanceScore,
    }));
    const updatedPlan: AllocationPlan = { ...plan, allocations: updatedAllocations, updatedAt: new Date() };
    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  async applyPerformanceReallocation(planId: string): Promise<RebalanceResult> {
    const plan = this.getPlanOrThrow(planId);

    // Calculate total performance score
    const totalScore = plan.allocations.reduce((sum, a) => sum + a.performanceScore, 0);

    if (totalScore === 0) {
      return this.rebalance(planId, 'performance_trigger');
    }

    // Shift allocations proportional to performance scores
    const step = this.config.performanceReallocationStep;
    const performanceAllocations = plan.allocations.map(a => ({
      ...a,
      // Bias the target toward performance-weighted allocation
      targetPercent: Math.min(
        this.config.maxAllocationPercent,
        Math.max(
          this.config.minAllocationPercent,
          a.targetPercent + (a.performanceScore / totalScore * 100 - a.targetPercent) * (step / 100)
        )
      ),
    }));

    // Normalize to sum to 100
    const totalTarget = performanceAllocations.reduce((sum, a) => sum + a.targetPercent, 0);
    const normalizedAllocations = performanceAllocations.map(a => ({
      ...a,
      targetPercent: (a.targetPercent / totalTarget) * 100,
    }));

    const updatedPlan: AllocationPlan = {
      ...plan,
      allocations: normalizedAllocations,
      updatedAt: new Date(),
    };
    this.plans.set(planId, updatedPlan);

    return this.rebalance(planId, 'performance_trigger');
  }

  onEvent(callback: InvestmentEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Internal helpers
  // ============================================================================

  private getPlanOrThrow(planId: string): AllocationPlan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Allocation plan ${planId} not found`);
    return plan;
  }

  private validateAllocations(allocations: Pick<StrategyAllocation, 'targetPercent' | 'strategyId'>[]): void {
    for (const a of allocations) {
      if (a.targetPercent < this.config.minAllocationPercent) {
        throw new Error(
          `Allocation for ${a.strategyId} is ${a.targetPercent}% — below minimum ${this.config.minAllocationPercent}%`
        );
      }
      if (a.targetPercent > this.config.maxAllocationPercent) {
        throw new Error(
          `Allocation for ${a.strategyId} is ${a.targetPercent}% — exceeds maximum ${this.config.maxAllocationPercent}%`
        );
      }
    }

    const totalPercent = allocations.reduce((sum, a) => sum + a.targetPercent, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error(`Allocations must sum to 100%, got ${totalPercent.toFixed(2)}%`);
    }
  }

  private emitEvent(event: InvestmentEvent): void {
    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Swallow callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // For health checks
  getStats(): { activeAllocations: number } {
    return {
      activeAllocations: Array.from(this.plans.values()).filter(p => p.status === 'active').length,
    };
  }
}

export function createAllocationEngine(config?: Partial<AllocationEngineConfig>): DefaultAllocationEngine {
  return new DefaultAllocationEngine(config);
}
