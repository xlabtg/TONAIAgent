/**
 * TONAIAgent - Tokenomics Simulation Module
 *
 * Provides supply/demand simulation, valuation modeling, equilibrium analysis,
 * and stress testing for the token economy.
 */

import {
  SimulationConfig,
  SimulationParams,
  SimulationResult,
  SimulationSummary,
  YearlyProjection,
  ConfidenceInterval,
  StressScenario,
  StressTestResult,
  ValuationConfig,
  ValuationMetrics,
  SupplyProjection,
  EquilibriumAnalysis,
  GrowthAssumptions,
  TokenStrategyEvent,
  TokenStrategyEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface TokenStrategySimulation {
  readonly config: SimulationConfig;
  readonly valuationConfig: ValuationConfig;

  // Supply projections
  projectSupply(years: number): SupplyProjection[];
  getCirculatingSupply(year: number): string;

  // Valuation
  getValuationMetrics(): ValuationMetrics;
  calculateEquilibrium(): EquilibriumAnalysis;

  // Simulation
  runSimulation(params: SimulationParams): SimulationResult;
  runSupplySimulation(params: SimulationParams): SimulationResult;
  runDemandSimulation(params: SimulationParams): SimulationResult;

  // Stress testing
  runStressTest(scenario: StressScenario | string): StressTestResult;
  getStressScenarios(): StressScenario[];

  // Events
  onEvent(callback: TokenStrategyEventCallback): void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  initialSupply: '1000000000',
  initialCirculating: '130000000',
  emissionSchedule: ['100000000', '75000000', '50000000', '25000000'],
  burnRate: 0.02,
  stakingTarget: 0.6,
  growthAssumptions: {
    userGrowthRate: 0.1, // 10% monthly Y1
    tvlGrowthRate: 0.15, // 15% monthly Y1
    revenueGrowthRate: 0.12, // 12% monthly Y1
    adoptionCurve: 's_curve',
  },
  scenarios: [
    {
      name: 'base',
      type: 'base',
      adjustments: {
        growthMultiplier: 1.0,
        burnMultiplier: 1.0,
        stakingMultiplier: 1.0,
        priceVolatility: 0.3,
      },
    },
    {
      name: 'bull',
      type: 'bull',
      adjustments: {
        growthMultiplier: 1.5,
        burnMultiplier: 1.2,
        stakingMultiplier: 1.1,
        priceVolatility: 0.4,
      },
    },
    {
      name: 'bear',
      type: 'bear',
      adjustments: {
        growthMultiplier: 0.5,
        burnMultiplier: 0.8,
        stakingMultiplier: 0.9,
        priceVolatility: 0.5,
      },
    },
    {
      name: 'stress',
      type: 'stress',
      adjustments: {
        growthMultiplier: 0.2,
        burnMultiplier: 0.5,
        stakingMultiplier: 0.7,
        priceVolatility: 0.8,
      },
    },
  ],
};

const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  supplyModel: {
    initialSupply: '1000000000',
    initialCirculating: '130000000',
    yearlyEmissions: ['100000000', '75000000', '50000000', '25000000'],
    emissionDecay: 0.25,
  },
  demandDrivers: [
    { name: 'Platform Usage', weight: 0.3, growthRate: 0.2, description: 'Trading and agent operations' },
    { name: 'Agent Staking', weight: 0.25, growthRate: 0.15, description: 'Tokens locked for agent deployment' },
    { name: 'Governance', weight: 0.15, growthRate: 0.05, description: 'Participation in protocol governance' },
    { name: 'Liquidity Mining', weight: 0.2, growthRate: 0.1, description: 'LP incentives and rewards' },
    { name: 'Institutional', weight: 0.1, growthRate: 0.08, description: 'Institutional staking and custody' },
  ],
  equilibriumTargets: {
    stakingRatio: 0.6,
    liquidityRatio: 0.15,
    burnRate: 0.03,
    velocityTarget: 4,
  },
  burnMechanics: {
    transactionFee: 0.01,
    slashingBurn: 0.5,
    expiredGovernanceBurn: 1.0,
    agentDecommissionBurn: 0.25,
  },
};

const STRESS_SCENARIOS: StressScenario[] = [
  {
    name: 'market_crash',
    trigger: '90% price drop',
    priceImpact: -0.9,
    stakingImpact: -0.4,
    liquidityImpact: -0.6,
    duration: 90,
  },
  {
    name: 'mass_unstaking',
    trigger: 'Fear event causing 50% unstaking',
    priceImpact: -0.5,
    stakingImpact: -0.5,
    liquidityImpact: -0.3,
    duration: 30,
  },
  {
    name: 'protocol_exploit',
    trigger: 'Security breach',
    priceImpact: -0.7,
    stakingImpact: -0.3,
    liquidityImpact: -0.5,
    duration: 14,
  },
  {
    name: 'regulatory_action',
    trigger: 'Regulatory enforcement',
    priceImpact: -0.6,
    stakingImpact: -0.2,
    liquidityImpact: -0.7,
    duration: 180,
  },
];

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenStrategySimulation implements TokenStrategySimulation {
  readonly config: SimulationConfig;
  readonly valuationConfig: ValuationConfig;

  private circulatingSupply: bigint;
  private totalStaked: bigint = 0n;
  private totalBurned: bigint = 0n;
  private currentPrice: number = 0.03;

  private readonly eventCallbacks: TokenStrategyEventCallback[] = [];

  constructor(
    config?: Partial<SimulationConfig>,
    valuationConfig?: Partial<ValuationConfig>
  ) {
    this.config = {
      ...DEFAULT_SIMULATION_CONFIG,
      ...config,
      growthAssumptions: {
        ...DEFAULT_SIMULATION_CONFIG.growthAssumptions,
        ...config?.growthAssumptions,
      },
      scenarios: config?.scenarios || DEFAULT_SIMULATION_CONFIG.scenarios,
    };

    this.valuationConfig = {
      ...DEFAULT_VALUATION_CONFIG,
      ...valuationConfig,
      supplyModel: {
        ...DEFAULT_VALUATION_CONFIG.supplyModel,
        ...valuationConfig?.supplyModel,
      },
      equilibriumTargets: {
        ...DEFAULT_VALUATION_CONFIG.equilibriumTargets,
        ...valuationConfig?.equilibriumTargets,
      },
      burnMechanics: {
        ...DEFAULT_VALUATION_CONFIG.burnMechanics,
        ...valuationConfig?.burnMechanics,
      },
      demandDrivers:
        valuationConfig?.demandDrivers || DEFAULT_VALUATION_CONFIG.demandDrivers,
    };

    this.circulatingSupply = BigInt(this.config.initialCirculating);
  }

  projectSupply(years: number): SupplyProjection[] {
    const projections: SupplyProjection[] = [];
    let circulating = BigInt(this.config.initialCirculating);
    let totalBurned = 0n;
    const totalSupply = BigInt(this.config.initialSupply);
    const stakingTarget = this.config.stakingTarget;

    for (let year = 1; year <= years; year++) {
      // Add yearly emissions
      const emissionIndex = Math.min(year - 1, this.config.emissionSchedule.length - 1);
      const emission = BigInt(this.config.emissionSchedule[emissionIndex] || '25000000');
      circulating += emission;

      // Calculate burns
      const burnAmount = (circulating * BigInt(Math.floor(this.config.burnRate * 10000))) / 10000n;
      circulating -= burnAmount;
      totalBurned += burnAmount;

      // Calculate staked and liquid
      const staked = (circulating * BigInt(Math.floor(stakingTarget * 10000))) / 10000n;
      const liquid = circulating - staked;

      // Calculate inflation rate
      const inflationRate =
        Number(emission) / Number(circulating - emission + burnAmount);

      // Project price (simplified model)
      const demandGrowth = this.calculateDemandGrowth(year);
      const supplyPressure = Number(emission) / Number(totalSupply);
      const projectedPrice = this.currentPrice * (1 + demandGrowth - supplyPressure);

      projections.push({
        year,
        circulating: circulating.toString(),
        staked: staked.toString(),
        liquid: liquid.toString(),
        totalBurned: totalBurned.toString(),
        inflationRate,
        projectedPrice: projectedPrice.toFixed(4),
      });
    }

    return projections;
  }

  getCirculatingSupply(year: number): string {
    const projections = this.projectSupply(year);
    return projections[year - 1]?.circulating || this.config.initialCirculating;
  }

  getValuationMetrics(): ValuationMetrics {
    const stakingRatio = Number(this.totalStaked) / Number(this.circulatingSupply) || 0;
    const totalSupply = BigInt(this.config.initialSupply);
    const burnRate = Number(this.totalBurned) / Number(totalSupply);

    // Calculate velocity (transactions per token per year)
    const velocity = 4; // Simplified estimate

    // Calculate inflation
    const currentEmission = BigInt(this.config.emissionSchedule[0] || '100000000');
    const inflationRate = Number(currentEmission) / Number(this.circulatingSupply);

    const marketCap = Number(this.circulatingSupply) * this.currentPrice;
    const fdv = Number(totalSupply) * this.currentPrice;

    return {
      circulatingSupply: this.circulatingSupply.toString(),
      totalStaked: this.totalStaked.toString(),
      stakingRatio,
      totalBurned: this.totalBurned.toString(),
      burnRate,
      velocity,
      inflationRate,
      marketCap: marketCap.toFixed(0),
      fdv: fdv.toFixed(0),
      price: this.currentPrice.toFixed(4),
      priceChange24h: 0,
      priceChange7d: 0,
      priceChange30d: 0,
    };
  }

  calculateEquilibrium(): EquilibriumAnalysis {
    const metrics = this.getValuationMetrics();
    const targets = this.valuationConfig.equilibriumTargets;

    const currentState = {
      stakingRatio: metrics.stakingRatio,
      liquidityRatio: 0.12, // Simplified
      burnRate: metrics.burnRate,
      velocity: metrics.velocity,
    };

    const gapAnalysis = {
      stakingGap: targets.stakingRatio - currentState.stakingRatio,
      liquidityGap: targets.liquidityRatio - currentState.liquidityRatio,
      burnGap: targets.burnRate - currentState.burnRate,
      velocityGap: targets.velocityTarget - currentState.velocity,
    };

    const recommendations: string[] = [];

    if (gapAnalysis.stakingGap > 0.1) {
      recommendations.push('Increase staking rewards to incentivize locking');
    }
    if (gapAnalysis.stakingGap < -0.1) {
      recommendations.push('Consider reducing staking rewards to improve liquidity');
    }
    if (gapAnalysis.liquidityGap > 0.05) {
      recommendations.push('Boost liquidity mining incentives');
    }
    if (gapAnalysis.burnGap > 0.01) {
      recommendations.push('Increase fee burn rate or add new burn mechanisms');
    }
    if (Math.abs(gapAnalysis.velocityGap) > 1) {
      recommendations.push('Adjust transaction incentives to normalize velocity');
    }

    // Estimate time to equilibrium based on gap sizes
    const maxGap = Math.max(
      Math.abs(gapAnalysis.stakingGap),
      Math.abs(gapAnalysis.liquidityGap),
      Math.abs(gapAnalysis.burnGap) * 10,
      Math.abs(gapAnalysis.velocityGap) / 4
    );
    const estimatedDays = Math.ceil(maxGap * 365); // Rough estimate

    // Sustainability score (0-100)
    const gapPenalty = (Math.abs(gapAnalysis.stakingGap) + Math.abs(gapAnalysis.liquidityGap)) * 50;
    const sustainabilityScore = Math.max(0, 100 - gapPenalty);

    return {
      currentState,
      targetState: targets,
      gapAnalysis,
      recommendations,
      estimatedTimeToEquilibrium: estimatedDays,
      sustainabilityScore,
    };
  }

  runSimulation(params: SimulationParams): SimulationResult {
    const scenario = this.config.scenarios.find((s) => s.name === params.scenario);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${params.scenario}`);
    }

    const projections: YearlyProjection[] = [];
    let circulating = BigInt(this.config.initialCirculating);
    let staked = 0n;
    let burned = 0n;
    let price = this.currentPrice;
    let tvl = 10000000; // $10M starting TVL
    let revenue = 100000; // $100K starting monthly revenue
    let users = 10000;
    let agents = 100;

    const growth = this.config.growthAssumptions;
    const adj = scenario.adjustments;

    for (let year = 1; year <= params.years; year++) {
      for (let month = 1; month <= 12; month++) {
        // Apply growth with scenario adjustments
        const monthlyGrowth = this.calculateMonthlyGrowth(
          year,
          month,
          growth,
          adj.growthMultiplier
        );

        // Update metrics
        users = Math.floor(users * (1 + monthlyGrowth.users));
        agents = Math.floor(agents * (1 + monthlyGrowth.agents));
        tvl = Math.floor(tvl * (1 + monthlyGrowth.tvl));
        revenue = Math.floor(revenue * (1 + monthlyGrowth.revenue));

        // Update supply
        if (month === 1) {
          const emissionIndex = Math.min(year - 1, this.config.emissionSchedule.length - 1);
          const yearlyEmission = BigInt(this.config.emissionSchedule[emissionIndex] || '25000000');
          circulating += yearlyEmission / 12n;
        } else {
          const emissionIndex = Math.min(year - 1, this.config.emissionSchedule.length - 1);
          const yearlyEmission = BigInt(this.config.emissionSchedule[emissionIndex] || '25000000');
          circulating += yearlyEmission / 12n;
        }

        // Apply burns
        const burnAmount =
          (circulating * BigInt(Math.floor(this.config.burnRate * adj.burnMultiplier * 1000))) /
          12000n;
        circulating -= burnAmount;
        burned += burnAmount;

        // Update staking
        const stakingRatio = this.config.stakingTarget * adj.stakingMultiplier;
        staked = (circulating * BigInt(Math.floor(stakingRatio * 10000))) / 10000n;

        // Update price (simplified model)
        const demandFactor = (users / 10000) * (tvl / 10000000);
        const supplyFactor = Number(circulating) / Number(BigInt(this.config.initialCirculating));
        const volatility = (Math.random() - 0.5) * adj.priceVolatility;
        price = price * (1 + (demandFactor / supplyFactor - 1) * 0.01 + volatility * 0.1);
        price = Math.max(0.001, price); // Floor price
      }

      // Record yearly projection
      projections.push({
        year,
        circulating: circulating.toString(),
        staked: staked.toString(),
        burned: burned.toString(),
        price: price.toFixed(4),
        marketCap: (Number(circulating) * price).toFixed(0),
        tvl: tvl.toString(),
        revenue: (revenue * 12).toString(),
        users,
        agents,
        stakingRatio: Number(staked) / Number(circulating),
        burnRate: Number(burned) / Number(BigInt(this.config.initialSupply)),
      });
    }

    const summary = this.calculateSimulationSummary(projections);
    const confidence = params.monteCarlo
      ? this.runMonteCarloConfidence(params)
      : [];

    this.emitEvent({
      id: `simulation-${Date.now()}`,
      timestamp: new Date(),
      type: 'simulation_completed',
      category: 'simulation',
      data: { scenario: params.scenario, years: params.years, summary },
    });

    return {
      scenario: params.scenario,
      projections,
      summary,
      confidence,
    };
  }

  runSupplySimulation(params: SimulationParams): SimulationResult {
    // Supply-focused simulation
    return this.runSimulation(params);
  }

  runDemandSimulation(params: SimulationParams): SimulationResult {
    // Demand-focused simulation
    return this.runSimulation(params);
  }

  runStressTest(scenarioInput: StressScenario | string): StressTestResult {
    let scenario: StressScenario;

    if (typeof scenarioInput === 'string') {
      const found = STRESS_SCENARIOS.find((s) => s.name === scenarioInput);
      if (!found) {
        throw new Error(`Unknown stress scenario: ${scenarioInput}`);
      }
      scenario = found;
    } else {
      scenario = scenarioInput;
    }

    // Simulate stress impact
    const initialStakingRatio = this.config.stakingTarget;
    const initialLiquidityRatio = 0.15;

    // Apply stress impacts
    const stakingRatioLow = initialStakingRatio * (1 + scenario.stakingImpact);
    const liquidityRatioLow = initialLiquidityRatio * (1 + scenario.liquidityImpact);
    const maxDrawdown = Math.abs(scenario.priceImpact);

    // Check circuit breakers
    const circuitBreakersTriggered: string[] = [];
    if (maxDrawdown > 0.5) {
      circuitBreakersTriggered.push('Emergency pause');
    }
    if (stakingRatioLow < 0.3) {
      circuitBreakersTriggered.push('Staking incentive boost');
    }
    if (liquidityRatioLow < 0.05) {
      circuitBreakersTriggered.push('Protocol liquidity injection');
    }

    // Calculate recovery time
    const recoveryRate = 0.02; // 2% recovery per day
    const recoveryTime = Math.ceil(Math.abs(scenario.priceImpact) / recoveryRate);

    // Determine survival
    const survived =
      stakingRatioLow > 0.2 && liquidityRatioLow > 0.03 && maxDrawdown < 0.95;

    const recommendations: string[] = [];
    if (!survived) {
      recommendations.push('Review protocol parameters for extreme scenarios');
      recommendations.push('Increase insurance fund allocation');
    }
    if (circuitBreakersTriggered.length > 0) {
      recommendations.push('Circuit breakers activated - monitor recovery');
    }
    if (recoveryTime > scenario.duration) {
      recommendations.push('Recovery slower than stress duration - prepare extended support');
    }

    this.emitEvent({
      id: `stress-test-${Date.now()}`,
      timestamp: new Date(),
      type: 'stress_test_triggered',
      category: 'simulation',
      data: { scenario: scenario.name, survived, recoveryTime },
    });

    return {
      scenario: scenario.name,
      survived,
      recoveryTime,
      maxDrawdown,
      stakingRatioLow,
      liquidityRatioLow,
      circuitBreakersTriggered,
      recommendations,
    };
  }

  getStressScenarios(): StressScenario[] {
    return [...STRESS_SCENARIOS];
  }

  onEvent(callback: TokenStrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateDemandGrowth(year: number): number {
    const drivers = this.valuationConfig.demandDrivers;
    let totalGrowth = 0;

    for (const driver of drivers) {
      // Apply S-curve decay for later years
      const yearMultiplier = Math.max(0.1, 1 - (year - 1) * 0.15);
      totalGrowth += driver.weight * driver.growthRate * yearMultiplier;
    }

    return totalGrowth;
  }

  private calculateMonthlyGrowth(
    year: number,
    month: number,
    growth: GrowthAssumptions,
    multiplier: number
  ): { users: number; agents: number; tvl: number; revenue: number } {
    // Apply S-curve for adoption
    const monthsElapsed = (year - 1) * 12 + month;
    let adoptionFactor: number;

    switch (growth.adoptionCurve) {
      case 'exponential':
        adoptionFactor = Math.pow(0.95, monthsElapsed / 12); // Decay
        break;
      case 's_curve':
        // S-curve: slow start, fast middle, slow end
        adoptionFactor = 1 / (1 + Math.exp(-(monthsElapsed - 24) / 12));
        adoptionFactor = 1 - adoptionFactor * 0.8; // Convert to decay
        break;
      default: // linear
        adoptionFactor = Math.max(0.1, 1 - monthsElapsed / 60);
    }

    return {
      users: growth.userGrowthRate * multiplier * adoptionFactor,
      agents: growth.userGrowthRate * 0.5 * multiplier * adoptionFactor,
      tvl: growth.tvlGrowthRate * multiplier * adoptionFactor,
      revenue: growth.revenueGrowthRate * multiplier * adoptionFactor,
    };
  }

  private calculateSimulationSummary(projections: YearlyProjection[]): SimulationSummary {
    const final = projections[projections.length - 1];
    const prices = projections.map((p) => parseFloat(p.price));
    const stakingRatios = projections.map((p) => p.stakingRatio);

    return {
      finalCirculating: final.circulating,
      finalStaked: final.staked,
      totalBurned: final.burned,
      averageStakingRatio: stakingRatios.reduce((a, b) => a + b, 0) / stakingRatios.length,
      peakPrice: Math.max(...prices).toFixed(4),
      troughPrice: Math.min(...prices).toFixed(4),
      sustainabilityScore: this.calculateEquilibrium().sustainabilityScore,
      riskScore: 100 - this.calculateEquilibrium().sustainabilityScore,
    };
  }

  private runMonteCarloConfidence(params: SimulationParams): ConfidenceInterval[] {
    const iterations = params.iterations || 100;
    const results: Map<string, number[][]> = new Map();

    // Run multiple iterations with random variations
    for (let i = 0; i < iterations; i++) {
      const result = this.runSimulation({
        ...params,
        monteCarlo: false, // Avoid recursion
      });

      for (const projection of result.projections) {
        if (!results.has(`year${projection.year}`)) {
          results.set(`year${projection.year}`, []);
        }
        results.get(`year${projection.year}`)!.push([
          parseFloat(projection.price),
          projection.stakingRatio,
          projection.users,
        ]);
      }
    }

    // Calculate confidence intervals
    const confidence: ConfidenceInterval[] = [];

    results.forEach((yearResults, key) => {
      const year = parseInt(key.replace('year', ''));
      const prices = yearResults.map((r) => r[0]).sort((a, b) => a - b);

      confidence.push({
        year,
        metric: 'price',
        p10: prices[Math.floor(iterations * 0.1)].toFixed(4),
        p25: prices[Math.floor(iterations * 0.25)].toFixed(4),
        p50: prices[Math.floor(iterations * 0.5)].toFixed(4),
        p75: prices[Math.floor(iterations * 0.75)].toFixed(4),
        p90: prices[Math.floor(iterations * 0.9)].toFixed(4),
      });
    });

    return confidence;
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
  // Administrative Methods (for testing)
  // ============================================================================

  setCirculatingSupply(supply: string): void {
    this.circulatingSupply = BigInt(supply);
  }

  setTotalStaked(staked: string): void {
    this.totalStaked = BigInt(staked);
  }

  setTotalBurned(burned: string): void {
    this.totalBurned = BigInt(burned);
  }

  setPrice(price: number): void {
    this.currentPrice = price;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenStrategySimulation(
  config?: Partial<SimulationConfig>,
  valuationConfig?: Partial<ValuationConfig>
): DefaultTokenStrategySimulation {
  return new DefaultTokenStrategySimulation(config, valuationConfig);
}
