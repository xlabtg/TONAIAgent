/**
 * TONAIAgent - Economic Simulation & Modeling
 *
 * Runs economic stress tests, token velocity modeling, and inflation vs
 * deflation scenario simulations to validate sustainability of the token
 * utility model under various market conditions.
 */

import {
  EconomicSimulationParams,
  EconomicScenarioType,
  EconomicSimulationResult,
  EconomicDaySnapshot,
  EconomicSimulationSummary,
  StressTestResult,
  TokenVelocityModel,
  VelocityDriver,
  EconomicShock,
  TokenUtilityEconomyEvent,
  TokenUtilityEconomyEventCallback,
} from './types';

// ============================================================================
// Scenario Presets
// ============================================================================

const SCENARIO_PARAMS: Record<EconomicScenarioType, {
  agentGrowthRate: number;
  userGrowthRate: number;
  tokenPriceVolatility: number;
  stakingYieldMultiplier: number;
  feeRevenueMultiplier: number;
  churnRate: number;
}> = {
  base_case: { agentGrowthRate: 0.05, userGrowthRate: 0.08, tokenPriceVolatility: 0.05, stakingYieldMultiplier: 1.0, feeRevenueMultiplier: 1.0, churnRate: 0.02 },
  bull_market: { agentGrowthRate: 0.15, userGrowthRate: 0.20, tokenPriceVolatility: 0.10, stakingYieldMultiplier: 1.5, feeRevenueMultiplier: 2.0, churnRate: 0.01 },
  bear_market: { agentGrowthRate: -0.02, userGrowthRate: -0.03, tokenPriceVolatility: 0.15, stakingYieldMultiplier: 0.7, feeRevenueMultiplier: 0.5, churnRate: 0.05 },
  mass_adoption: { agentGrowthRate: 0.30, userGrowthRate: 0.50, tokenPriceVolatility: 0.20, stakingYieldMultiplier: 2.0, feeRevenueMultiplier: 3.0, churnRate: 0.03 },
  market_crash: { agentGrowthRate: -0.10, userGrowthRate: -0.20, tokenPriceVolatility: 0.40, stakingYieldMultiplier: 0.3, feeRevenueMultiplier: 0.2, churnRate: 0.15 },
  mass_unstaking: { agentGrowthRate: 0.02, userGrowthRate: 0.02, tokenPriceVolatility: 0.20, stakingYieldMultiplier: 0.4, feeRevenueMultiplier: 0.8, churnRate: 0.08 },
  protocol_exploit: { agentGrowthRate: -0.20, userGrowthRate: -0.30, tokenPriceVolatility: 0.50, stakingYieldMultiplier: 0.1, feeRevenueMultiplier: 0.1, churnRate: 0.30 },
  regulatory_action: { agentGrowthRate: -0.05, userGrowthRate: -0.10, tokenPriceVolatility: 0.25, stakingYieldMultiplier: 0.6, feeRevenueMultiplier: 0.5, churnRate: 0.10 },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface EconomicSimulationModule {
  runSimulation(params: EconomicSimulationParams): EconomicSimulationResult;
  runStressTests(params: EconomicSimulationParams): StressTestResult[];
  modelTokenVelocity(circulatingSupply: string, dailyVolume: string, stakingRate: number): TokenVelocityModel;
  getSimulationHistory(): EconomicSimulationResult[];
  onEvent(callback: TokenUtilityEconomyEventCallback): () => void;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultEconomicSimulationModule implements EconomicSimulationModule {
  private readonly simulationHistory: EconomicSimulationResult[] = [];
  private readonly eventCallbacks: TokenUtilityEconomyEventCallback[] = [];

  runSimulation(params: EconomicSimulationParams): EconomicSimulationResult {
    const scenarioConfig = SCENARIO_PARAMS[params.scenarioType] ?? SCENARIO_PARAMS.base_case;
    const effectiveParams = {
      ...scenarioConfig,
      ...params.parameters,
    };

    const dailySnapshots: EconomicDaySnapshot[] = [];
    let tokenPrice = params.initialTokenPrice;
    let circulatingSupply = BigInt(params.initialCirculatingSupply);
    let stakedSupply = (circulatingSupply * BigInt(Math.floor(params.initialStakingRate * 100))) / BigInt(100);
    let activeAgents = params.initialActiveAgents;
    let activeUsers = Math.floor(activeAgents * 10); // Assume 10 users per agent initially
    let treasuryBalance = BigInt(0);

    const dailyAgentGrowth = effectiveParams.agentGrowthRate / 30;
    const dailyUserGrowth = effectiveParams.userGrowthRate / 30;
    const dailyChurn = effectiveParams.churnRate / 30;

    for (let day = 0; day < params.durationDays; day++) {
      // Apply any shocks
      const shock = params.parameters.additionalShocks?.find(s => s.dayOfOccurrence === day);
      if (shock) {
        this.applyShock(shock, { tokenPrice, activeAgents, activeUsers });
        tokenPrice = Math.max(0.001, tokenPrice * (1 + shock.magnitude * 0.5));
      }

      // Price movement (random walk with drift)
      const priceChange = (Math.random() - 0.5) * effectiveParams.tokenPriceVolatility * tokenPrice;
      tokenPrice = Math.max(0.001, tokenPrice + priceChange);

      // Agent growth (net of churn)
      const newAgents = Math.max(0, Math.round(activeAgents * (dailyAgentGrowth - dailyChurn)));
      activeAgents = Math.max(1, activeAgents + newAgents);

      // User growth
      const newUsers = Math.max(0, Math.round(activeUsers * (dailyUserGrowth - dailyChurn)));
      activeUsers = Math.max(1, activeUsers + newUsers);

      // Daily volume estimate
      const dailyVolumeTons = activeUsers * tokenPrice * 10; // ~10 tokens per user per day
      const dailyVolumeTokens = BigInt(Math.floor(dailyVolumeTons * 1e9));

      // Daily revenue estimate (1% fee on volume)
      const dailyRevenue = dailyVolumeTokens / BigInt(100);
      treasuryBalance += dailyRevenue / BigInt(5); // 20% to treasury

      // Staking rate evolution
      const stakingRateChange = (effectiveParams.stakingYieldMultiplier - 1) * 0.001;
      const currentStakingRate = Math.max(0.05, Math.min(0.90,
        params.initialStakingRate + stakingRateChange * day
      ));
      stakedSupply = (circulatingSupply * BigInt(Math.floor(currentStakingRate * 10000))) / BigInt(10000);

      // Inflation/burn
      const dailyBurn = dailyRevenue / BigInt(10); // 10% of revenue burned
      circulatingSupply = circulatingSupply > dailyBurn ? circulatingSupply - dailyBurn : BigInt(0);

      const tokenVelocity = Number(dailyVolumeTokens) / Number(circulatingSupply > BigInt(0) ? circulatingSupply : BigInt(1));

      dailySnapshots.push({
        day,
        tokenPrice: Math.round(tokenPrice * 10000) / 10000,
        circulatingSupply: circulatingSupply.toString(),
        stakedSupply: stakedSupply.toString(),
        stakingRate: currentStakingRate,
        activeAgents,
        activeUsers,
        dailyVolume: dailyVolumeTokens.toString(),
        dailyRevenue: dailyRevenue.toString(),
        treasuryBalance: treasuryBalance.toString(),
        tokenVelocity: Math.round(tokenVelocity * 10000) / 10000,
        inflationRate: 0.05 / 365,
      });
    }

    const summary = this.computeSummary(params, dailySnapshots);
    const result: EconomicSimulationResult = {
      simulationId: params.simulationId,
      params,
      dailySnapshots,
      summary,
      generatedAt: new Date(),
    };

    this.simulationHistory.push(result);

    this.emitEvent({
      id: `sim-${Date.now()}`,
      type: 'simulation.completed',
      data: {
        simulationId: params.simulationId,
        scenarioType: params.scenarioType,
        sustainabilityScore: summary.sustainabilityScore,
        priceChange: summary.priceChange,
      },
      timestamp: new Date(),
    });

    return result;
  }

  runStressTests(params: EconomicSimulationParams): StressTestResult[] {
    const stressScenarios: EconomicScenarioType[] = [
      'market_crash',
      'mass_unstaking',
      'protocol_exploit',
      'regulatory_action',
    ];

    return stressScenarios.map(scenario => {
      const stressParams: EconomicSimulationParams = {
        ...params,
        simulationId: `${params.simulationId}-stress-${scenario}`,
        scenarioType: scenario,
        durationDays: 90, // 90-day stress test
      };

      const result = this.runSimulation(stressParams);
      const initialSnap = result.dailySnapshots[0];
      const finalSnap = result.dailySnapshots[result.dailySnapshots.length - 1];

      const maxDrawdown = Math.min(0, ...result.dailySnapshots.map(s =>
        (s.tokenPrice - params.initialTokenPrice) / params.initialTokenPrice
      ));

      // Count recovery days (days to get back above 90% of initial price)
      const recoveryThreshold = params.initialTokenPrice * 0.90;
      let recoveryDays = -1;
      const minPriceDay = result.dailySnapshots.reduce((minDay, s, i) =>
        s.tokenPrice < result.dailySnapshots[minDay].tokenPrice ? i : minDay, 0);
      for (let i = minPriceDay; i < result.dailySnapshots.length; i++) {
        if (result.dailySnapshots[i].tokenPrice >= recoveryThreshold) {
          recoveryDays = i - minPriceDay;
          break;
        }
      }

      const scenarioConfig = SCENARIO_PARAMS[scenario];

      return {
        scenarioName: scenario.replace(/_/g, ' '),
        description: `Stress test: ${scenario}`,
        initialState: { tokenPrice: initialSnap.tokenPrice, activeAgents: initialSnap.activeAgents, stakingRate: initialSnap.stakingRate },
        finalState: { tokenPrice: finalSnap.tokenPrice, activeAgents: finalSnap.activeAgents, stakingRate: finalSnap.stakingRate },
        maxDrawdown: Math.abs(maxDrawdown),
        recoveryDays: recoveryDays === -1 ? -1 : recoveryDays,
        systemCollapse: finalSnap.tokenPrice < 0.01 || finalSnap.activeAgents < 5,
        vulnerabilities: this.identifyVulnerabilities(scenario, result),
        mitigations: this.suggestMitigations(scenario),
      } as StressTestResult;
    });
  }

  modelTokenVelocity(circulatingSupply: string, dailyVolume: string, stakingRate: number): TokenVelocityModel {
    const supply = Number(BigInt(circulatingSupply));
    const volume = Number(BigInt(dailyVolume));
    const annualVolume = volume * 365;
    const currentVelocity = supply > 0 ? annualVolume / supply : 0;

    const drivers: VelocityDriver[] = [
      {
        factor: 'Staking Lock-up',
        contribution: -stakingRate * 0.8,
        description: `${Math.round(stakingRate * 100)}% of supply staked, reducing velocity`,
      },
      {
        factor: 'Agent Economy Activity',
        contribution: 0.15,
        description: 'Autonomous agent transactions increase daily velocity',
      },
      {
        factor: 'Fee Burns',
        contribution: -0.05,
        description: 'Token burns reduce circulating supply and velocity',
      },
      {
        factor: 'Marketplace Activity',
        contribution: 0.20,
        description: 'Strategy marketplace creates consistent token flow',
      },
      {
        factor: 'Governance Participation',
        contribution: -0.10,
        description: 'Governance staking reduces speculative velocity',
      },
    ];

    const optimalVelocity = 3; // 3x per year is considered healthy
    const recommendation: TokenVelocityModel['recommendation'] =
      currentVelocity < optimalVelocity * 0.5 ? 'increase_utility'
      : currentVelocity > optimalVelocity * 2 ? 'reduce_velocity'
      : 'stable';

    return {
      currentVelocity: Math.round(currentVelocity * 100) / 100,
      targetVelocity: optimalVelocity,
      velocityDrivers: drivers,
      stabilizationMechanisms: [
        'Long-term staking incentives reduce float',
        'Agent economic activity creates organic demand',
        'Governance participation locks tokens',
        'Buyback and burn reduces circulating supply',
        'Treasury allocation removes tokens from circulation',
      ],
      recommendation,
    };
  }

  getSimulationHistory(): EconomicSimulationResult[] {
    return [...this.simulationHistory];
  }

  onEvent(callback: TokenUtilityEconomyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  private computeSummary(
    params: EconomicSimulationParams,
    snapshots: EconomicDaySnapshot[]
  ): EconomicSimulationSummary {
    if (snapshots.length === 0) {
      return {
        finalTokenPrice: params.initialTokenPrice,
        priceChange: 0,
        finalCirculatingSupply: params.initialCirculatingSupply,
        supplyChange: 0,
        finalStakingRate: params.initialStakingRate,
        stakingRateChange: 0,
        totalRevenueGenerated: '0',
        totalTokensBurned: '0',
        finalTreasuryBalance: '0',
        averageTokenVelocity: 0,
        peakActiveAgents: params.initialActiveAgents,
        sustainabilityScore: 50,
        recommendations: [],
      };
    }

    const last = snapshots[snapshots.length - 1];
    const priceChange = ((last.tokenPrice - params.initialTokenPrice) / params.initialTokenPrice) * 100;
    const initialSupply = BigInt(params.initialCirculatingSupply);
    const finalSupply = BigInt(last.circulatingSupply);
    const supplyChange = initialSupply > BigInt(0)
      ? Number((finalSupply - initialSupply) * BigInt(10000) / initialSupply) / 100
      : 0;

    const totalRevenue = snapshots.reduce((acc, s) => acc + BigInt(s.dailyRevenue), BigInt(0));
    const totalBurned = initialSupply > finalSupply ? (initialSupply - finalSupply).toString() : '0';
    const peakAgents = Math.max(...snapshots.map(s => s.activeAgents));
    const avgVelocity = snapshots.reduce((acc, s) => acc + s.tokenVelocity, 0) / snapshots.length;

    // Sustainability score (0-100)
    const priceScore = Math.min(50, Math.max(0, 25 + priceChange / 4));
    const stakingScore = last.stakingRate > 0.3 ? 25 : last.stakingRate * 83;
    const agentScore = last.activeAgents > params.initialActiveAgents ? 25 : 0;
    const sustainabilityScore = Math.round(priceScore + stakingScore + agentScore);

    const recommendations: string[] = [];
    if (priceChange < -20) recommendations.push('Implement emergency buyback program');
    if (last.stakingRate < 0.15) recommendations.push('Increase staking rewards to incentivize locking');
    if (last.activeAgents < params.initialActiveAgents) recommendations.push('Developer incentive program needed');

    return {
      finalTokenPrice: last.tokenPrice,
      priceChange: Math.round(priceChange * 100) / 100,
      finalCirculatingSupply: last.circulatingSupply,
      supplyChange: Math.round(supplyChange * 100) / 100,
      finalStakingRate: last.stakingRate,
      stakingRateChange: Math.round((last.stakingRate - params.initialStakingRate) * 10000) / 100,
      totalRevenueGenerated: totalRevenue.toString(),
      totalTokensBurned: totalBurned,
      finalTreasuryBalance: last.treasuryBalance,
      averageTokenVelocity: Math.round(avgVelocity * 100) / 100,
      peakActiveAgents: peakAgents,
      sustainabilityScore: Math.min(100, Math.max(0, sustainabilityScore)),
      recommendations,
    };
  }

  private applyShock(shock: EconomicShock, _state: { tokenPrice: number; activeAgents: number; activeUsers: number }): void {
    // Shocks are applied inline in the simulation loop
    void shock;
  }

  private identifyVulnerabilities(scenario: EconomicScenarioType, result: EconomicSimulationResult): string[] {
    const vulnerabilities: string[] = [];
    const last = result.dailySnapshots[result.dailySnapshots.length - 1];

    if (last.tokenPrice < result.params.initialTokenPrice * 0.5) {
      vulnerabilities.push('Token price severely impacted - insufficient price support mechanisms');
    }
    if (last.stakingRate < 0.10) {
      vulnerabilities.push('Low staking rate under stress - liquidity risk');
    }
    if (last.activeAgents < result.params.initialActiveAgents * 0.5) {
      vulnerabilities.push('Significant agent ecosystem contraction');
    }
    if (scenario === 'protocol_exploit') {
      vulnerabilities.push('Smart contract exploit risk requires audits and insurance');
    }
    if (scenario === 'mass_unstaking') {
      vulnerabilities.push('Insufficient exit liquidity in stress scenarios');
    }

    return vulnerabilities.length > 0 ? vulnerabilities : ['System shows adequate resilience in this scenario'];
  }

  private suggestMitigations(scenario: EconomicScenarioType): string[] {
    const mitigations: Record<EconomicScenarioType, string[]> = {
      market_crash: [
        'Increase buyback program funding',
        'Temporarily boost staking yields',
        'Activate DAO emergency fund',
      ],
      mass_unstaking: [
        'Implement unstaking cooldown periods',
        'Create staking insurance fund',
        'Add exit liquidity reserves',
      ],
      protocol_exploit: [
        'Regular smart contract audits',
        'Bug bounty program',
        'Protocol insurance coverage',
        'Multi-sig controls for treasury',
      ],
      regulatory_action: [
        'Jurisdictional diversification',
        'Regulatory compliance team',
        'Legal reserve fund',
        'DAO governance for adaptability',
      ],
      base_case: ['Maintain current strategies'],
      bull_market: ['Scale infrastructure ahead of demand'],
      bear_market: ['Activate emergency measures'],
      mass_adoption: ['Scale infrastructure and team'],
    };
    return mitigations[scenario] ?? ['Review governance parameters'];
  }

  private emitEvent(event: TokenUtilityEconomyEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}

export function createEconomicSimulationModule(): DefaultEconomicSimulationModule {
  return new DefaultEconomicSimulationModule();
}
