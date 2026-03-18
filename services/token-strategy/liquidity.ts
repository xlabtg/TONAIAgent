/**
 * TONAIAgent - Liquidity Flywheel Module
 *
 * Manages liquidity mining, flywheel mechanics, and liquidity health monitoring.
 */

import {
  FlywheelConfig,
  FlywheelPhaseConfig,
  LiquidityPoolConfig,
  LiquidityHealthThresholds,
  FlywheelMetrics,
  FlywheelStage,
  LiquidityHealth,
  TokenStrategyEvent,
  TokenStrategyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface LiquidityFlywheelManager {
  readonly config: FlywheelConfig;

  // Flywheel management
  getCurrentPhase(): FlywheelPhaseConfig;
  getFlywheelStage(): FlywheelStage;
  getFlywheelMetrics(): FlywheelMetrics;
  advancePhase(): FlywheelPhaseConfig;

  // Pool management
  getPools(): LiquidityPoolConfig[];
  getPool(pair: string): LiquidityPoolConfig | undefined;
  calculateAPY(pair: string, lockPeriod: number, boostEnabled: boolean): number;
  estimateRewards(
    pair: string,
    amount: string,
    lockPeriod: number
  ): RewardEstimate;

  // Health monitoring
  getLiquidityHealth(): LiquidityHealth;
  getHealthThresholds(): LiquidityHealthThresholds;
  checkHealthAlerts(): HealthAlert[];

  // Incentive calculation
  calculateIncentives(params: IncentiveParams): IncentiveProjection;

  // Events
  onEvent(callback: TokenStrategyEventCallback): void;
}

export interface RewardEstimate {
  dailyReward: string;
  weeklyReward: string;
  monthlyReward: string;
  yearlyReward: string;
  effectiveAPY: number;
  boostMultiplier: number;
}

export interface HealthAlert {
  type: 'depth' | 'spread' | 'utilization' | 'concentration';
  severity: 'warning' | 'critical';
  message: string;
  currentValue: string | number;
  threshold: string | number;
  recommendation: string;
}

export interface IncentiveParams {
  pair: string;
  amount: string;
  lockPeriod: number;
  durationMonths: number;
}

export interface IncentiveProjection {
  totalRewards: string;
  monthlyRewards: string[];
  effectiveAPY: number;
  comparisonToBase: number;
  unlockSchedule: UnlockScheduleEntry[];
}

export interface UnlockScheduleEntry {
  date: Date;
  amount: string;
  type: 'reward' | 'principal';
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_FLYWHEEL_CONFIG: FlywheelConfig = {
  phases: [
    {
      name: 'Bootstrap',
      durationMonths: 3,
      emission: '15000000',
      targetTVL: '10000000',
    },
    {
      name: 'Growth',
      durationMonths: 3,
      emission: '10000000',
      targetTVL: '50000000',
    },
    {
      name: 'Maturity',
      durationMonths: 6,
      emission: '5000000',
      targetTVL: '100000000',
    },
    {
      name: 'Sustainable',
      durationMonths: 12,
      emission: '2000000',
      targetTVL: '500000000',
    },
  ],
  liquidityPools: [
    {
      pair: 'TONAI/TON',
      baseAPY: 0.15,
      boostMultiplier: 2.0,
      minLockPeriod: 30,
      emissionShare: 0.4,
    },
    {
      pair: 'TONAI/USDT',
      baseAPY: 0.12,
      boostMultiplier: 1.8,
      minLockPeriod: 30,
      emissionShare: 0.35,
    },
    {
      pair: 'Strategy Pools',
      baseAPY: 0.2,
      boostMultiplier: 2.5,
      minLockPeriod: 90,
      emissionShare: 0.25,
    },
  ],
  healthThresholds: {
    depthWarning: '100000',
    depthCritical: '50000',
    spreadWarning: 0.01,
    spreadCritical: 0.02,
    utilizationLow: 0.4,
    utilizationHigh: 0.9,
    concentrationWarning: 0.15,
    concentrationCritical: 0.25,
  },
  incentiveBudget: '50000000',
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultLiquidityFlywheelManager implements LiquidityFlywheelManager {
  readonly config: FlywheelConfig;

  private currentPhaseIndex: number = 0;
  private tvl: bigint = 0n;
  private liquidityDepth: bigint = 500000n * 10n ** 9n; // $500K default
  private averageSpread: number = 0.003; // 0.3%
  private utilization: number = 0.65; // 65%
  private topHolderConcentration: number = 0.08; // 8%
  private activeProviders: number = 0;
  private pendingRewards: bigint = 0n;
  private distributedRewards: bigint = 0n;

  private readonly eventCallbacks: TokenStrategyEventCallback[] = [];

  constructor(config?: Partial<FlywheelConfig>) {
    this.config = {
      ...DEFAULT_FLYWHEEL_CONFIG,
      ...config,
      phases: config?.phases || DEFAULT_FLYWHEEL_CONFIG.phases,
      liquidityPools: config?.liquidityPools || DEFAULT_FLYWHEEL_CONFIG.liquidityPools,
      healthThresholds: {
        ...DEFAULT_FLYWHEEL_CONFIG.healthThresholds,
        ...config?.healthThresholds,
      },
    };
  }

  getCurrentPhase(): FlywheelPhaseConfig {
    const phases = this.config.phases;
    if (this.currentPhaseIndex >= phases.length) {
      return phases[phases.length - 1];
    }
    return phases[this.currentPhaseIndex];
  }

  getFlywheelStage(): FlywheelStage {
    // Map TVL to flywheel stage (1-5)
    const tvlNumber = Number(this.tvl / 10n ** 9n); // Convert to whole units

    if (tvlNumber < 1000000) {
      return {
        stage: 1,
        name: 'Capital Inflow',
        description: 'Users bring capital to the ecosystem',
        metrics: {
          users: this.activeProviders.toString(),
          yield: '0',
          liquidity: tvlNumber.toLocaleString(),
          value: '0',
          incentives: this.getCurrentPhase().emission,
        },
      };
    }

    if (tvlNumber < 10000000) {
      return {
        stage: 2,
        name: 'Yield Generation',
        description: 'Agents generate yield from capital',
        metrics: {
          users: this.activeProviders.toString(),
          yield: '10-20%',
          liquidity: tvlNumber.toLocaleString(),
          value: 'Growing',
          incentives: this.getCurrentPhase().emission,
        },
      };
    }

    if (tvlNumber < 50000000) {
      return {
        stage: 3,
        name: 'Liquidity Attraction',
        description: 'Yield attracts more liquidity',
        metrics: {
          users: this.activeProviders.toString(),
          yield: '15-25%',
          liquidity: tvlNumber.toLocaleString(),
          value: 'Increasing',
          incentives: this.getCurrentPhase().emission,
        },
      };
    }

    if (tvlNumber < 100000000) {
      return {
        stage: 4,
        name: 'Value Increase',
        description: 'Liquidity increases token value',
        metrics: {
          users: this.activeProviders.toString(),
          yield: '12-20%',
          liquidity: tvlNumber.toLocaleString(),
          value: 'Strong',
          incentives: this.getCurrentPhase().emission,
        },
      };
    }

    return {
      stage: 5,
      name: 'User Attraction',
      description: 'Token incentives attract more users',
      metrics: {
        users: this.activeProviders.toString(),
        yield: '10-15%',
        liquidity: tvlNumber.toLocaleString(),
        value: 'Stable',
        incentives: this.getCurrentPhase().emission,
      },
    };
  }

  getFlywheelMetrics(): FlywheelMetrics {
    const health = this.getLiquidityHealth();

    // Flywheel velocity is a measure of how fast the flywheel is spinning
    // Based on TVL growth rate, user growth, and incentive efficiency
    const velocity = this.calculateFlywheelVelocity();

    // Health score from 0-100
    const healthScore = this.calculateHealthScore(health);

    return {
      currentPhase: this.getCurrentPhase().name,
      totalValueLocked: this.tvl.toString(),
      liquidityDepth: this.liquidityDepth.toString(),
      averageSpread: this.averageSpread,
      utilization: this.utilization,
      topHolderConcentration: this.topHolderConcentration,
      activeProviders: this.activeProviders,
      pendingRewards: this.pendingRewards.toString(),
      distributedRewards: this.distributedRewards.toString(),
      flywheelVelocity: velocity,
      healthScore,
    };
  }

  advancePhase(): FlywheelPhaseConfig {
    const previousPhase = this.getCurrentPhase();

    if (this.currentPhaseIndex < this.config.phases.length - 1) {
      this.currentPhaseIndex++;

      this.emitEvent({
        id: `flywheel-phase-${Date.now()}`,
        timestamp: new Date(),
        type: 'flywheel_phase_changed',
        category: 'liquidity',
        data: {
          previousPhase: previousPhase.name,
          newPhase: this.getCurrentPhase().name,
          tvl: this.tvl.toString(),
        },
      });
    }

    return this.getCurrentPhase();
  }

  getPools(): LiquidityPoolConfig[] {
    return this.config.liquidityPools;
  }

  getPool(pair: string): LiquidityPoolConfig | undefined {
    return this.config.liquidityPools.find((p) => p.pair === pair);
  }

  calculateAPY(pair: string, lockPeriod: number, boostEnabled: boolean): number {
    const pool = this.getPool(pair);
    if (!pool) {
      return 0;
    }

    let apy = pool.baseAPY;

    // Lock period bonus (up to 50% extra for 365 days)
    const lockBonus = Math.min(0.5, lockPeriod / 730);
    apy *= 1 + lockBonus;

    // Boost multiplier
    if (boostEnabled && lockPeriod >= pool.minLockPeriod) {
      apy *= pool.boostMultiplier;
    }

    return apy;
  }

  estimateRewards(
    pair: string,
    amount: string,
    lockPeriod: number
  ): RewardEstimate {
    const pool = this.getPool(pair);
    if (!pool) {
      return {
        dailyReward: '0',
        weeklyReward: '0',
        monthlyReward: '0',
        yearlyReward: '0',
        effectiveAPY: 0,
        boostMultiplier: 1,
      };
    }

    const principal = BigInt(amount);
    const boostEnabled = lockPeriod >= pool.minLockPeriod;
    const effectiveAPY = this.calculateAPY(pair, lockPeriod, boostEnabled);

    const yearlyReward = (principal * BigInt(Math.floor(effectiveAPY * 10000))) / 10000n;
    const monthlyReward = yearlyReward / 12n;
    const weeklyReward = yearlyReward / 52n;
    const dailyReward = yearlyReward / 365n;

    return {
      dailyReward: dailyReward.toString(),
      weeklyReward: weeklyReward.toString(),
      monthlyReward: monthlyReward.toString(),
      yearlyReward: yearlyReward.toString(),
      effectiveAPY,
      boostMultiplier: boostEnabled ? pool.boostMultiplier : 1,
    };
  }

  getLiquidityHealth(): LiquidityHealth {
    const thresholds = this.config.healthThresholds;
    const depth = Number(this.liquidityDepth / 10n ** 9n);

    const depthStatus = this.getStatusForThreshold(
      depth,
      parseFloat(thresholds.depthWarning),
      parseFloat(thresholds.depthCritical),
      true // Higher is better
    );

    const spreadStatus = this.getStatusForThreshold(
      this.averageSpread,
      thresholds.spreadWarning,
      thresholds.spreadCritical,
      false // Lower is better
    );

    const utilizationStatus =
      this.utilization < thresholds.utilizationLow
        ? 'warning'
        : this.utilization > thresholds.utilizationHigh
          ? 'warning'
          : 'ok';

    const concentrationStatus = this.getStatusForThreshold(
      this.topHolderConcentration,
      thresholds.concentrationWarning,
      thresholds.concentrationCritical,
      false // Lower is better
    );

    const statuses = [depthStatus, spreadStatus, utilizationStatus, concentrationStatus];
    const overall = statuses.includes('critical')
      ? 'critical'
      : statuses.includes('warning')
        ? 'warning'
        : 'healthy';

    const recommendations: string[] = [];
    if (depthStatus !== 'ok') {
      recommendations.push('Increase liquidity incentives to deepen pools');
    }
    if (spreadStatus !== 'ok') {
      recommendations.push('Reduce slippage by attracting more market makers');
    }
    if (utilizationStatus !== 'ok') {
      recommendations.push('Rebalance pool utilization through dynamic fees');
    }
    if (concentrationStatus !== 'ok') {
      recommendations.push('Implement anti-whale measures to reduce concentration');
    }

    return {
      overall,
      depth: { value: depth.toString(), status: depthStatus },
      spread: { value: this.averageSpread, status: spreadStatus },
      utilization: { value: this.utilization, status: utilizationStatus },
      concentration: { value: this.topHolderConcentration, status: concentrationStatus },
      recommendations,
    };
  }

  getHealthThresholds(): LiquidityHealthThresholds {
    return this.config.healthThresholds;
  }

  checkHealthAlerts(): HealthAlert[] {
    const health = this.getLiquidityHealth();
    const alerts: HealthAlert[] = [];

    if (health.depth.status !== 'ok') {
      alerts.push({
        type: 'depth',
        severity: health.depth.status,
        message: `Liquidity depth is ${health.depth.status}`,
        currentValue: health.depth.value,
        threshold:
          health.depth.status === 'critical'
            ? this.config.healthThresholds.depthCritical
            : this.config.healthThresholds.depthWarning,
        recommendation: 'Increase liquidity mining rewards or add protocol-owned liquidity',
      });
    }

    if (health.spread.status !== 'ok') {
      alerts.push({
        type: 'spread',
        severity: health.spread.status,
        message: `Trading spread is ${health.spread.status}`,
        currentValue: health.spread.value,
        threshold:
          health.spread.status === 'critical'
            ? this.config.healthThresholds.spreadCritical
            : this.config.healthThresholds.spreadWarning,
        recommendation: 'Attract market makers with reduced fees or incentives',
      });
    }

    if (health.utilization.status !== 'ok') {
      alerts.push({
        type: 'utilization',
        severity: 'warning',
        message: 'Pool utilization is outside optimal range',
        currentValue: health.utilization.value,
        threshold: `${this.config.healthThresholds.utilizationLow}-${this.config.healthThresholds.utilizationHigh}`,
        recommendation: 'Adjust pool parameters or incentives',
      });
    }

    if (health.concentration.status !== 'ok') {
      alerts.push({
        type: 'concentration',
        severity: health.concentration.status,
        message: `Top holder concentration is ${health.concentration.status}`,
        currentValue: health.concentration.value,
        threshold:
          health.concentration.status === 'critical'
            ? this.config.healthThresholds.concentrationCritical
            : this.config.healthThresholds.concentrationWarning,
        recommendation: 'Consider whale caps or gradual unlock incentives',
      });
    }

    if (alerts.length > 0) {
      this.emitEvent({
        id: `health-alert-${Date.now()}`,
        timestamp: new Date(),
        type: 'health_alert',
        category: 'liquidity',
        data: { alerts },
      });
    }

    return alerts;
  }

  calculateIncentives(params: IncentiveParams): IncentiveProjection {
    const rewards = this.estimateRewards(params.pair, params.amount, params.lockPeriod);
    const monthlyRewards: string[] = [];

    const principal = BigInt(params.amount);
    const monthlyReward = BigInt(rewards.monthlyReward);

    for (let i = 0; i < params.durationMonths; i++) {
      monthlyRewards.push(monthlyReward.toString());
    }

    const totalRewards = monthlyReward * BigInt(params.durationMonths);

    // Calculate unlock schedule
    const unlockSchedule: UnlockScheduleEntry[] = [];
    const now = new Date();

    // Add reward unlock entries (monthly)
    for (let i = 1; i <= params.durationMonths; i++) {
      const unlockDate = new Date(now);
      unlockDate.setMonth(unlockDate.getMonth() + i);
      unlockSchedule.push({
        date: unlockDate,
        amount: monthlyReward.toString(),
        type: 'reward',
      });
    }

    // Add principal unlock at end
    const principalUnlockDate = new Date(now);
    principalUnlockDate.setDate(principalUnlockDate.getDate() + params.lockPeriod);
    unlockSchedule.push({
      date: principalUnlockDate,
      amount: principal.toString(),
      type: 'principal',
    });

    // Sort by date
    unlockSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Comparison to base (pool without boost)
    const pool = this.getPool(params.pair);
    const baseAPY = pool?.baseAPY || 0.1;
    const comparisonToBase = rewards.effectiveAPY / baseAPY;

    return {
      totalRewards: totalRewards.toString(),
      monthlyRewards,
      effectiveAPY: rewards.effectiveAPY,
      comparisonToBase,
      unlockSchedule,
    };
  }

  onEvent(callback: TokenStrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getStatusForThreshold(
    value: number,
    warning: number,
    critical: number,
    higherIsBetter: boolean
  ): 'ok' | 'warning' | 'critical' {
    if (higherIsBetter) {
      if (value < critical) return 'critical';
      if (value < warning) return 'warning';
      return 'ok';
    } else {
      if (value > critical) return 'critical';
      if (value > warning) return 'warning';
      return 'ok';
    }
  }

  private calculateFlywheelVelocity(): number {
    // Velocity is a composite metric (0-100)
    const tvlScore = Math.min(100, Number(this.tvl / 10n ** 9n) / 10000000 * 100);
    const providerScore = Math.min(100, this.activeProviders / 100 * 100);
    const healthScore = this.calculateHealthScore(this.getLiquidityHealth());

    return (tvlScore * 0.4 + providerScore * 0.3 + healthScore * 0.3);
  }

  private calculateHealthScore(health: LiquidityHealth): number {
    const statusScore = (status: 'ok' | 'warning' | 'critical'): number => {
      switch (status) {
        case 'ok':
          return 100;
        case 'warning':
          return 50;
        case 'critical':
          return 0;
      }
    };

    const depthScore = statusScore(health.depth.status);
    const spreadScore = statusScore(health.spread.status);
    const utilizationScore = statusScore(health.utilization.status);
    const concentrationScore = statusScore(health.concentration.status);

    return (depthScore + spreadScore + utilizationScore + concentrationScore) / 4;
  }

  private emitEvent(event: TokenStrategyEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Administrative Methods (for testing/simulation)
  // ============================================================================

  setTVL(tvl: string): void {
    this.tvl = BigInt(tvl);
  }

  setLiquidityDepth(depth: string): void {
    this.liquidityDepth = BigInt(depth);
  }

  setSpread(spread: number): void {
    this.averageSpread = spread;
  }

  setUtilization(utilization: number): void {
    this.utilization = utilization;
  }

  setConcentration(concentration: number): void {
    this.topHolderConcentration = concentration;
  }

  setActiveProviders(count: number): void {
    this.activeProviders = count;
  }

  addLiquidity(amount: string): void {
    this.tvl += BigInt(amount);
    this.liquidityDepth += BigInt(amount) / 2n;
    this.activeProviders++;
  }

  removeLiquidity(amount: string): void {
    const removeAmount = BigInt(amount);
    if (this.tvl >= removeAmount) {
      this.tvl -= removeAmount;
      this.liquidityDepth -= removeAmount / 2n;
    }
  }

  distributeRewards(amount: string): void {
    const rewardAmount = BigInt(amount);
    this.distributedRewards += rewardAmount;
    if (this.pendingRewards >= rewardAmount) {
      this.pendingRewards -= rewardAmount;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiquidityFlywheelManager(
  config?: Partial<FlywheelConfig>
): DefaultLiquidityFlywheelManager {
  return new DefaultLiquidityFlywheelManager(config);
}
