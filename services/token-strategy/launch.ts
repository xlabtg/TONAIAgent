/**
 * TONAIAgent - Token Launch Strategy Module
 *
 * Manages phased token launch, TGE configuration, and launch incentives.
 */

import {
  LaunchConfig,
  LaunchPhase,
  LaunchPhaseConfig,
  LaunchProgress,
  LaunchIncentiveConfig,
  TGEConfig,
  TGESimulation,
  AntiWhaleConfig,
  TokenStrategyEvent,
  TokenStrategyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface LaunchManager {
  readonly config: LaunchConfig;

  // Phase management
  getPhase(): LaunchPhase;
  getPhaseConfig(phase: LaunchPhase): LaunchPhaseConfig | undefined;
  getProgress(): LaunchProgress;
  advancePhase(): LaunchPhase;

  // TGE
  getTGEConfig(): TGEConfig;
  simulateTGE(params?: Partial<TGEConfig>): TGESimulation;

  // Incentives
  getActiveIncentives(): LaunchIncentiveConfig[];
  calculateIncentiveReward(
    incentiveType: string,
    baseAmount: string
  ): string;

  // Anti-whale
  getAntiWhaleConfig(): AntiWhaleConfig;
  validateTransaction(
    amount: string,
    walletBalance: string,
    daysSinceLaunch: number
  ): TransactionValidation;

  // Events
  onEvent(callback: TokenStrategyEventCallback): void;
}

export interface TransactionValidation {
  allowed: boolean;
  reason?: string;
  maxAllowed?: string;
  taxRate?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LAUNCH_CONFIG: LaunchConfig = {
  totalSupply: '1000000000', // 1 billion
  initialCirculating: '130000000', // 130 million (13%)
  initialPrice: '0.03',
  phases: [
    {
      name: 'private',
      targetRaise: '5000000',
      tokenPrice: '0.01',
      allocation: '50000000',
      vestingCliff: 180,
      vestingDuration: 730,
      minInvestment: '10000',
      maxInvestment: '500000',
    },
    {
      name: 'strategic',
      targetRaise: '15000000',
      tokenPrice: '0.02',
      allocation: '75000000',
      vestingCliff: 90,
      vestingDuration: 365,
      minInvestment: '25000',
      maxInvestment: '2000000',
    },
    {
      name: 'community',
      targetRaise: '10000000',
      tokenPrice: '0.03',
      allocation: '50000000',
      vestingCliff: 30,
      vestingDuration: 180,
      minInvestment: '100',
      maxInvestment: '10000',
    },
    {
      name: 'public',
      targetRaise: '0',
      tokenPrice: '0.03',
      allocation: '0',
      vestingCliff: 0,
      vestingDuration: 0,
    },
  ],
  tge: {
    initialMarketCap: '3900000',
    initialFDV: '30000000',
    dexLiquidity: '2000000',
    priceFloor: '0.015',
  },
  antiWhale: {
    maxWalletPercent: 2,
    maxTransactionPercent: 0.5,
    sellTaxFirstDays: 30,
    sellTaxRate: 0.03,
  },
  launchIncentives: [
    {
      name: 'Early Staker Bonus',
      type: 'staking_bonus',
      multiplier: 2,
      duration: 30,
      allocation: '10000000',
    },
    {
      name: 'LP Provider Boost',
      type: 'lp_boost',
      multiplier: 3,
      duration: 14,
      allocation: '15000000',
    },
    {
      name: 'Referral Program',
      type: 'referral',
      multiplier: 1.05,
      duration: 365,
      allocation: '5000000',
    },
    {
      name: 'Launch Trading Competition',
      type: 'competition',
      multiplier: 1,
      duration: 7,
      allocation: '1000000',
    },
  ],
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultLaunchManager implements LaunchManager {
  readonly config: LaunchConfig;

  private currentPhaseIndex: number = 0;
  private phasesCompleted: LaunchPhase[] = [];
  private totalRaised: bigint = 0n;
  private participantCount: number = 0;
  private tokensDistributed: bigint = 0n;
  private launchDate: Date | undefined;

  private readonly eventCallbacks: TokenStrategyEventCallback[] = [];

  constructor(config?: Partial<LaunchConfig>) {
    this.config = {
      ...DEFAULT_LAUNCH_CONFIG,
      ...config,
      phases: config?.phases || DEFAULT_LAUNCH_CONFIG.phases,
      tge: { ...DEFAULT_LAUNCH_CONFIG.tge, ...config?.tge },
      antiWhale: { ...DEFAULT_LAUNCH_CONFIG.antiWhale, ...config?.antiWhale },
      launchIncentives:
        config?.launchIncentives || DEFAULT_LAUNCH_CONFIG.launchIncentives,
    };
  }

  getPhase(): LaunchPhase {
    if (this.currentPhaseIndex >= this.config.phases.length) {
      return 'public';
    }
    return this.config.phases[this.currentPhaseIndex].name;
  }

  getPhaseConfig(phase: LaunchPhase): LaunchPhaseConfig | undefined {
    return this.config.phases.find((p) => p.name === phase);
  }

  getProgress(): LaunchProgress {
    const phases = this.config.phases;
    const totalTarget = phases.reduce(
      (sum, p) => sum + BigInt(p.targetRaise || '0'),
      0n
    );
    const completion =
      totalTarget > 0n
        ? Number((this.totalRaised * 100n) / totalTarget)
        : 0;

    return {
      currentPhase: this.getPhase(),
      phasesCompleted: [...this.phasesCompleted],
      totalRaised: this.totalRaised.toString(),
      participantCount: this.participantCount,
      tokensDistributed: this.tokensDistributed.toString(),
      nextMilestone: this.getNextMilestone(),
      completionPercent: Math.min(100, completion),
    };
  }

  advancePhase(): LaunchPhase {
    const currentPhase = this.getPhase();

    if (currentPhase !== 'public') {
      this.phasesCompleted.push(currentPhase);
      this.currentPhaseIndex++;

      this.emitEvent({
        id: `phase-complete-${Date.now()}`,
        timestamp: new Date(),
        type: 'launch_phase_completed',
        category: 'launch',
        data: {
          completedPhase: currentPhase,
          newPhase: this.getPhase(),
          totalRaised: this.totalRaised.toString(),
        },
      });
    }

    const newPhase = this.getPhase();

    if (newPhase === 'public' && !this.launchDate) {
      this.launchDate = new Date();
      this.emitEvent({
        id: `tge-${Date.now()}`,
        timestamp: new Date(),
        type: 'tge_executed',
        category: 'launch',
        data: {
          launchDate: this.launchDate,
          initialCirculating: this.config.initialCirculating,
          initialPrice: this.config.initialPrice,
        },
      });
    }

    return newPhase;
  }

  getTGEConfig(): TGEConfig {
    return this.config.tge;
  }

  simulateTGE(params?: Partial<TGEConfig>): TGESimulation {
    const tgeConfig = { ...this.config.tge, ...params };
    const initialCirculating = BigInt(this.config.initialCirculating);
    const initialPrice = parseFloat(this.config.initialPrice);

    // Calculate expected metrics
    const initialMarketCap = Number(initialCirculating) * initialPrice;
    const totalSupply = BigInt(this.config.totalSupply);
    const fdv = Number(totalSupply) * initialPrice;

    // Expected 24h volume (typically 5-15% of market cap on launch)
    const expectedVolumeLow = initialMarketCap * 0.05;
    const expectedVolumeHigh = initialMarketCap * 0.15;
    const expectedVolumeMid = (expectedVolumeLow + expectedVolumeHigh) / 2;

    // Price range based on liquidity and expected volume
    const liquidity = parseFloat(tgeConfig.dexLiquidity || '2000000');
    const priceImpact = expectedVolumeMid / liquidity;
    const priceLow = initialPrice * (1 - priceImpact * 0.5);
    const priceHigh = initialPrice * (1 + priceImpact * 0.5);

    // Expected staking (20-30% in first week typically)
    const projectedStakingRatio = 0.25;

    return {
      initialCirculating: initialCirculating.toString(),
      initialMarketCap: initialMarketCap.toFixed(0),
      initialFDV: fdv.toFixed(0),
      expectedVolume24h: expectedVolumeMid.toFixed(0),
      expectedPriceRange: {
        low: priceLow.toFixed(4),
        mid: initialPrice.toFixed(4),
        high: priceHigh.toFixed(4),
      },
      liquidityDepth: tgeConfig.dexLiquidity || '2000000',
      projectedStakingRatio,
    };
  }

  getActiveIncentives(): LaunchIncentiveConfig[] {
    if (!this.launchDate) {
      // Pre-launch: all incentives are pending
      return [];
    }

    const daysSinceLaunch = this.getDaysSinceLaunch();

    return this.config.launchIncentives.filter(
      (incentive) => daysSinceLaunch <= incentive.duration
    );
  }

  calculateIncentiveReward(
    incentiveType: string,
    baseAmount: string
  ): string {
    const activeIncentives = this.getActiveIncentives();
    const incentive = activeIncentives.find((i) => i.type === incentiveType);

    if (!incentive) {
      return baseAmount;
    }

    const base = BigInt(baseAmount);
    const multiplied = (base * BigInt(Math.floor(incentive.multiplier * 1000))) / 1000n;

    return multiplied.toString();
  }

  getAntiWhaleConfig(): AntiWhaleConfig {
    return this.config.antiWhale;
  }

  validateTransaction(
    amount: string,
    walletBalance: string,
    daysSinceLaunch: number
  ): TransactionValidation {
    const antiWhale = this.config.antiWhale;
    const totalSupply = BigInt(this.config.totalSupply);
    const txAmount = BigInt(amount);
    const balance = BigInt(walletBalance);

    // Check max transaction
    const maxTx = (totalSupply * BigInt(Math.floor(antiWhale.maxTransactionPercent * 100))) / 10000n;
    if (txAmount > maxTx) {
      return {
        allowed: false,
        reason: 'Transaction exceeds maximum allowed',
        maxAllowed: maxTx.toString(),
      };
    }

    // Check max wallet (for buys)
    const maxWallet = (totalSupply * BigInt(Math.floor(antiWhale.maxWalletPercent * 100))) / 10000n;
    const newBalance = balance + txAmount;
    if (newBalance > maxWallet) {
      return {
        allowed: false,
        reason: 'Would exceed maximum wallet balance',
        maxAllowed: (maxWallet - balance).toString(),
      };
    }

    // Calculate sell tax if applicable
    let taxRate = 0;
    if (daysSinceLaunch <= antiWhale.sellTaxFirstDays) {
      taxRate = antiWhale.sellTaxRate;
    }

    return {
      allowed: true,
      taxRate,
    };
  }

  onEvent(callback: TokenStrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getNextMilestone(): string | undefined {
    const phase = this.getPhase();
    const phaseConfig = this.getPhaseConfig(phase);

    if (!phaseConfig || phase === 'public') {
      return undefined;
    }

    const target = BigInt(phaseConfig.targetRaise || '0');
    if (target > 0n && this.totalRaised < target) {
      return `$${Number(target - this.totalRaised).toLocaleString()} to complete ${phase} phase`;
    }

    return `Complete ${phase} phase`;
  }

  private getDaysSinceLaunch(): number {
    if (!this.launchDate) {
      return 0;
    }
    const now = new Date();
    const diff = now.getTime() - this.launchDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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

  recordInvestment(amount: string, _investor: string): void {
    this.totalRaised += BigInt(amount);
    this.participantCount++;

    const phaseConfig = this.getPhaseConfig(this.getPhase());
    if (phaseConfig) {
      // Calculate tokens based on phase price
      const price = parseFloat(phaseConfig.tokenPrice);
      const tokens = BigInt(Math.floor(parseFloat(amount) / price));
      this.tokensDistributed += tokens;
    }
  }

  setLaunchDate(date: Date): void {
    this.launchDate = date;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLaunchManager(
  config?: Partial<LaunchConfig>
): DefaultLaunchManager {
  return new DefaultLaunchManager(config);
}
