/**
 * TONAIAgent - Liquidity & DeFi Integration
 *
 * Manages staking pools, liquidity incentives, yield farming, and
 * TON DeFi protocol integrations for the token utility ecosystem.
 */

import {
  StakingPoolConfig,
  LiquidityPoolPosition,
  YieldFarmingOpportunity,
  DeFiIntegrationHealth,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Default Pool Configurations
// ============================================================================

const DEFAULT_STAKING_POOLS: StakingPoolConfig[] = [
  {
    poolId: 'tonai-single',
    name: 'TONAI Single Asset',
    assetPair: 'TONAI',
    rewardToken: 'TONAI',
    baseApy: 0.12,                   // 12% base APY
    boostMultiplier: 3.0,            // Up to 3x for long-term lockers
    lockPeriodDays: 0,               // Flexible
    minDeposit: '100000000000',      // 100 tokens
    maxCapacity: '1000000000000000', // 1M tokens
    active: true,
  },
  {
    poolId: 'tonai-ton-lp',
    name: 'TONAI/TON Liquidity',
    assetPair: 'TONAI/TON',
    rewardToken: 'TONAI',
    baseApy: 0.25,                   // 25% base APY
    boostMultiplier: 2.0,
    lockPeriodDays: 30,
    minDeposit: '500000000000',      // 500 tokens
    maxCapacity: '5000000000000000', // 5M tokens
    active: true,
  },
  {
    poolId: 'tonai-locked-90',
    name: 'TONAI 90-Day Lock',
    assetPair: 'TONAI',
    rewardToken: 'TONAI',
    baseApy: 0.35,                   // 35% APY for commitment
    boostMultiplier: 1.5,
    lockPeriodDays: 90,
    minDeposit: '1000000000000',     // 1000 tokens
    maxCapacity: '2000000000000000', // 2M tokens
    active: true,
  },
];

const DEFAULT_YIELD_OPPORTUNITIES: YieldFarmingOpportunity[] = [
  {
    id: 'tonfi-v2-tonai',
    protocol: 'TON DeFi v2',
    poolName: 'TONAI/TON Yield Farm',
    assets: ['TONAI', 'TON'],
    currentApy: 0.45,
    boostedApy: 0.80,
    tvl: '5000000000000000',
    rewardTokens: ['TONAI', 'TON'],
    minInvestment: '1000000000000',
    riskLevel: 'medium',
    verified: true,
    integrationStatus: 'live',
  },
  {
    id: 'ton-defi-stable',
    protocol: 'TON DeFi Stable',
    poolName: 'TONAI/USDT Stable Pool',
    assets: ['TONAI', 'USDT'],
    currentApy: 0.20,
    boostedApy: 0.40,
    tvl: '10000000000000000',
    rewardTokens: ['TONAI'],
    minInvestment: '500000000000',
    riskLevel: 'low',
    verified: true,
    integrationStatus: 'live',
  },
];

// ============================================================================
// Interfaces
// ============================================================================

export interface DeFiIntegrationConfig {
  stakingPools?: StakingPoolConfig[];
  yieldOpportunities?: YieldFarmingOpportunity[];
}

export interface AddLiquidityRequest {
  userId: string;
  poolId: string;
  depositAmount: string;
  lockPeriodDays?: number;
}

export interface RemoveLiquidityRequest {
  userId: string;
  positionId: string;
  percentToRemove?: number;          // 0-1, default 1.0 (full withdrawal)
}

export interface DeFiIntegrationModule {
  readonly stakingPools: StakingPoolConfig[];
  readonly yieldOpportunities: YieldFarmingOpportunity[];

  addLiquidity(request: AddLiquidityRequest): LiquidityPoolPosition;
  removeLiquidity(request: RemoveLiquidityRequest): { success: boolean; amountReturned: string; rewards: string; reason?: string };
  getPosition(positionId: string): LiquidityPoolPosition | null;
  getUserPositions(userId: string): LiquidityPoolPosition[];
  claimYield(positionId: string): { success: boolean; amount: string };
  getPoolApy(poolId: string, lockPeriodDays: number): number;
  getYieldOpportunities(riskLevel?: 'low' | 'medium' | 'high'): YieldFarmingOpportunity[];
  getHealth(): DeFiIntegrationHealth;
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultDeFiIntegrationModule implements DeFiIntegrationModule {
  readonly stakingPools: StakingPoolConfig[];
  readonly yieldOpportunities: YieldFarmingOpportunity[];

  private readonly positions: Map<string, LiquidityPoolPosition> = new Map();
  private totalLiquidityProvided: bigint = BigInt(0);
  private totalYieldGenerated: bigint = BigInt(0);
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  constructor(config: DeFiIntegrationConfig = {}) {
    this.stakingPools = config.stakingPools ?? DEFAULT_STAKING_POOLS;
    this.yieldOpportunities = config.yieldOpportunities ?? DEFAULT_YIELD_OPPORTUNITIES;
  }

  addLiquidity(request: AddLiquidityRequest): LiquidityPoolPosition {
    const pool = this.stakingPools.find(p => p.poolId === request.poolId);
    if (!pool) {
      throw new Error(`Pool ${request.poolId} not found`);
    }
    if (!pool.active) {
      throw new Error(`Pool ${request.poolId} is not active`);
    }

    const deposit = BigInt(request.depositAmount);
    const minDeposit = BigInt(pool.minDeposit);
    if (deposit < minDeposit) {
      throw new Error(`Deposit ${deposit} below minimum ${minDeposit}`);
    }

    const lockDays = request.lockPeriodDays ?? pool.lockPeriodDays;
    const apy = this.getPoolApy(request.poolId, lockDays);

    let lockEndsAt: Date | undefined;
    if (lockDays > 0) {
      lockEndsAt = new Date();
      lockEndsAt.setDate(lockEndsAt.getDate() + lockDays);
    }

    const position: LiquidityPoolPosition = {
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: request.userId,
      poolId: request.poolId,
      depositedAmount: request.depositAmount,
      lpTokens: deposit.toString(),  // 1:1 for simplicity
      currentValue: request.depositAmount,
      pendingRewards: '0',
      claimedRewards: '0',
      impermanentLoss: 0,
      netApy: apy,
      startedAt: new Date(),
      lockEndsAt,
      status: lockDays > 0 ? 'locked' : 'active',
    };

    this.positions.set(position.id, position);
    this.totalLiquidityProvided += deposit;

    this.emitEvent({
      id: `liq-${Date.now()}`,
      type: 'liquidity.added',
      data: { userId: request.userId, poolId: request.poolId, amount: request.depositAmount, apy },
      userId: request.userId,
      timestamp: new Date(),
    });

    return position;
  }

  removeLiquidity(request: RemoveLiquidityRequest): { success: boolean; amountReturned: string; rewards: string; reason?: string } {
    const position = this.positions.get(request.positionId);
    if (!position) {
      return { success: false, amountReturned: '0', rewards: '0', reason: 'Position not found' };
    }
    if (position.userId !== undefined && position.status === 'locked') {
      const now = new Date();
      if (position.lockEndsAt && now < position.lockEndsAt) {
        return { success: false, amountReturned: '0', rewards: '0', reason: 'Position is still locked' };
      }
    }

    const removePercent = request.percentToRemove ?? 1.0;
    const deposit = BigInt(position.depositedAmount);
    const amountReturned = (deposit * BigInt(Math.floor(removePercent * 10000))) / BigInt(10000);
    const rewards = BigInt(position.pendingRewards);

    this.totalLiquidityProvided = this.totalLiquidityProvided > amountReturned
      ? this.totalLiquidityProvided - amountReturned
      : BigInt(0);

    if (removePercent >= 1) {
      this.positions.set(request.positionId, { ...position, status: 'exited', pendingRewards: '0', claimedRewards: (BigInt(position.claimedRewards) + rewards).toString() });
    } else {
      const remaining = deposit - amountReturned;
      this.positions.set(request.positionId, { ...position, depositedAmount: remaining.toString(), pendingRewards: '0', claimedRewards: (BigInt(position.claimedRewards) + rewards).toString() });
    }

    this.emitEvent({
      id: `liq-remove-${Date.now()}`,
      type: 'liquidity.removed',
      data: { positionId: request.positionId, amountReturned: amountReturned.toString(), rewards: rewards.toString() },
      timestamp: new Date(),
    });

    return { success: true, amountReturned: amountReturned.toString(), rewards: rewards.toString() };
  }

  getPosition(positionId: string): LiquidityPoolPosition | null {
    return this.positions.get(positionId) ?? null;
  }

  getUserPositions(userId: string): LiquidityPoolPosition[] {
    return Array.from(this.positions.values()).filter(p => p.userId === userId);
  }

  claimYield(positionId: string): { success: boolean; amount: string } {
    const position = this.positions.get(positionId);
    if (!position) return { success: false, amount: '0' };

    const pending = BigInt(position.pendingRewards);
    if (pending === BigInt(0)) return { success: false, amount: '0' };

    this.totalYieldGenerated += pending;
    const updated: LiquidityPoolPosition = {
      ...position,
      pendingRewards: '0',
      claimedRewards: (BigInt(position.claimedRewards) + pending).toString(),
    };
    this.positions.set(positionId, updated);

    this.emitEvent({
      id: `yield-${Date.now()}`,
      type: 'yield.distributed',
      data: { positionId, amount: pending.toString(), userId: position.userId },
      userId: position.userId,
      timestamp: new Date(),
    });

    return { success: true, amount: pending.toString() };
  }

  getPoolApy(poolId: string, lockPeriodDays: number): number {
    const pool = this.stakingPools.find(p => p.poolId === poolId);
    if (!pool) return 0;

    const lockBoost = lockPeriodDays > 0
      ? Math.min(pool.boostMultiplier, 1 + (lockPeriodDays / 365) * (pool.boostMultiplier - 1))
      : 1;

    return pool.baseApy * lockBoost;
  }

  getYieldOpportunities(riskLevel?: 'low' | 'medium' | 'high'): YieldFarmingOpportunity[] {
    return riskLevel
      ? this.yieldOpportunities.filter(o => o.riskLevel === riskLevel && o.integrationStatus === 'live')
      : this.yieldOpportunities.filter(o => o.integrationStatus === 'live');
  }

  getHealth(): DeFiIntegrationHealth {
    const activePositions = Array.from(this.positions.values()).filter(p => p.status !== 'exited');
    const uniqueUsers = new Set(activePositions.map(p => p.userId)).size;
    const activePools = this.stakingPools.filter(p => p.active).length;

    const avgApy = this.stakingPools.reduce((acc, p) => acc + p.baseApy, 0) / this.stakingPools.length;

    return {
      overall: activePools > 0 ? 'healthy' : 'critical',
      activeStakingPools: activePools,
      totalLiquidityProvided: this.totalLiquidityProvided.toString(),
      totalYieldGenerated: this.totalYieldGenerated.toString(),
      activeFarmers: uniqueUsers,
      averageApy: Math.round(avgApy * 10000) / 10000,
    };
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createDeFiIntegrationModule(
  config?: DeFiIntegrationConfig
): DefaultDeFiIntegrationModule {
  return new DefaultDeFiIntegrationModule(config);
}
