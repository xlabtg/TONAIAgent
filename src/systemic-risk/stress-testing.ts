/**
 * AI Stress Testing Engine
 * Continuous simulation of 2008-style liquidity crisis, exchange failure,
 * stablecoin depeg, RWA illiquidity, black swan correlation spikes.
 * Outputs: required capital buffers, adjusted margin requirements, stability index inputs.
 */

import {
  type FundId,
  type AgentId,
  type AssetId,
  type StressScenarioType,
  type SystemStressScenario,
  type SystemStressTestResult,
  type FundStressImpact,
  type AgentStressImpact,
  type StressTestingConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
} from './types';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FundPortfolioSnapshot {
  fundId: FundId;
  totalValue: number;
  marginRequirement: number;  // current margin as a fraction (e.g. 0.10 = 10%)
  leverage: number;
  agents: Array<{
    agentId: AgentId;
    positions: Array<{ assetId: AssetId; value: number; leverage: number }>;
  }>;
}

export interface AIStressTestingEngine {
  registerScenario(scenario: SystemStressScenario): void;
  getScenario(scenarioId: string): SystemStressScenario | undefined;
  listScenarios(): SystemStressScenario[];
  runStressTest(
    scenarioId: string,
    portfolios: FundPortfolioSnapshot[],
  ): SystemStressTestResult;
  runAllStressTests(portfolios: FundPortfolioSnapshot[]): SystemStressTestResult[];
  getLatestResults(): SystemStressTestResult[];
  getResultForScenario(scenarioId: string): SystemStressTestResult | undefined;
  onEvent(callback: SystemicRiskEventCallback): void;
}

// ─── Built-in Scenarios ───────────────────────────────────────────────────────

export const DEFAULT_STRESS_SCENARIOS: SystemStressScenario[] = [
  {
    id: 'scenario-2008-liquidity',
    name: '2008-Style Liquidity Crisis',
    type: 'liquidity_crisis',
    description: 'Severe market-wide liquidity freeze with cascading forced selling',
    shocks: { ALL_ASSETS: 0.65 },   // 35% price drop on all assets
    liquidityImpact: 0.80,           // 80% reduction in liquidity
    correlationSpike: 0.40,
    volatilityMultiplier: 3.0,
    durationDays: 90,
  },
  {
    id: 'scenario-exchange-failure',
    name: 'Major Exchange Failure',
    type: 'exchange_failure',
    description: 'Sudden collapse of a major trading venue (FTX-style)',
    shocks: { ALL_ASSETS: 0.50 },   // 50% price drop
    liquidityImpact: 0.60,
    correlationSpike: 0.30,
    volatilityMultiplier: 4.0,
    durationDays: 30,
  },
  {
    id: 'scenario-stablecoin-depeg',
    name: 'Stablecoin Depeg Event',
    type: 'stablecoin_depeg',
    description: 'UST/LUNA-style collapse of major stablecoin',
    shocks: { USDT: 0.90, USDC: 0.95, ALL_ASSETS: 0.75 },
    liquidityImpact: 0.50,
    correlationSpike: 0.25,
    volatilityMultiplier: 2.5,
    durationDays: 14,
  },
  {
    id: 'scenario-rwa-illiquidity',
    name: 'RWA Illiquidity Shock',
    type: 'rwa_illiquidity',
    description: 'Real-world asset tokenisation redemption halt',
    shocks: { RWA: 0.60, ALL_ASSETS: 0.85 },
    liquidityImpact: 0.70,
    correlationSpike: 0.20,
    volatilityMultiplier: 2.0,
    durationDays: 60,
  },
  {
    id: 'scenario-black-swan-correlation',
    name: 'Black Swan Correlation Spike',
    type: 'black_swan_correlation',
    description: 'All assets become perfectly correlated during extreme panic',
    shocks: { ALL_ASSETS: 0.55 },
    liquidityImpact: 0.65,
    correlationSpike: 0.60,
    volatilityMultiplier: 5.0,
    durationDays: 7,
  },
];

// ─── Default Config ───────────────────────────────────────────────────────────

const DEFAULT_STRESS_CONFIG: StressTestingConfig = {
  runFrequencyMs: 60 * 60 * 1000,  // hourly
  confidenceLevel: 0.99,
  capitalBufferMultiplier: 1.5,
  autoAdjustMargins: true,
};

// ─── Implementation ───────────────────────────────────────────────────────────

export class DefaultAIStressTestingEngine implements AIStressTestingEngine {
  private readonly config: StressTestingConfig;
  private scenarios: Map<string, SystemStressScenario> = new Map();
  private latestResults: Map<string, SystemStressTestResult> = new Map();
  private eventCallbacks: SystemicRiskEventCallback[] = [];

  constructor(config?: Partial<StressTestingConfig>) {
    this.config = { ...DEFAULT_STRESS_CONFIG, ...config };

    // Register all built-in scenarios
    for (const scenario of DEFAULT_STRESS_SCENARIOS) {
      this.scenarios.set(scenario.id, scenario);
    }
  }

  registerScenario(scenario: SystemStressScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  getScenario(scenarioId: string): SystemStressScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  listScenarios(): SystemStressScenario[] {
    return Array.from(this.scenarios.values());
  }

  runStressTest(
    scenarioId: string,
    portfolios: FundPortfolioSnapshot[],
  ): SystemStressTestResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Stress scenario '${scenarioId}' not found`);

    const fundImpacts: FundStressImpact[] = [];
    const agentImpacts: AgentStressImpact[] = [];
    let totalInitialValue = 0;
    let totalStressedValue = 0;
    let leverageBreaches = 0;
    let estimatedLiquidations = 0;

    for (const fund of portfolios) {
      let stressedFundValue = 0;
      totalInitialValue += fund.totalValue;

      for (const agent of fund.agents) {
        let agentInitialValue = 0;
        let agentStressedValue = 0;

        for (const pos of agent.positions) {
          const shock = this.getShockForAsset(pos.assetId, scenario.shocks);
          const stressedPositionValue = pos.value * shock;
          agentInitialValue += pos.value;
          agentStressedValue += stressedPositionValue;
        }

        const agentLossPct = agentInitialValue > 0
          ? (agentInitialValue - agentStressedValue) / agentInitialValue
          : 0;
        const liquidated = agentLossPct >= (1 - fund.marginRequirement);

        if (liquidated) estimatedLiquidations++;

        agentImpacts.push({
          agentId: agent.agentId,
          fundId: fund.fundId,
          initialValue: agentInitialValue,
          stressedValue: agentStressedValue,
          lossPct: agentLossPct,
          liquidated,
        });

        stressedFundValue += agentStressedValue;
      }

      const fundLossPct = fund.totalValue > 0
        ? (fund.totalValue - stressedFundValue) / fund.totalValue
        : 0;

      // Check if leverage would breach maintenance margin
      const stressedLeverage = fund.leverage / Math.max(1 - fundLossPct, 0.01);
      const leverageBreached = stressedLeverage > fund.leverage * 2;
      const marginBreached = fundLossPct >= (1 - fund.marginRequirement * 2);

      if (leverageBreached) leverageBreaches++;

      fundImpacts.push({
        fundId: fund.fundId,
        initialValue: fund.totalValue,
        stressedValue: stressedFundValue,
        lossPct: fundLossPct,
        marginBreached,
        leverageBreached,
      });

      totalStressedValue += stressedFundValue;
    }

    const totalLoss = totalInitialValue - totalStressedValue;
    const totalLossPct = totalInitialValue > 0 ? totalLoss / totalInitialValue : 0;

    // Capital buffer = total loss * buffer multiplier
    const capitalBufferRequired = totalLoss * this.config.capitalBufferMultiplier;

    // Adjusted margin = max(base 10%, stressed loss pct * 1.25)
    const baseMargin = 0.10;
    const adjustedMarginRequirement = Math.max(
      baseMargin,
      Math.min(0.50, totalLossPct * 1.25),
    );

    // Survivability assessment
    let systemSurvivability: 'passes' | 'marginal' | 'fails';
    if (totalLossPct < 0.20 && leverageBreaches === 0) {
      systemSurvivability = 'passes';
    } else if (totalLossPct < 0.40 && leverageBreaches <= 2) {
      systemSurvivability = 'marginal';
    } else {
      systemSurvivability = 'fails';
    }

    const recommendations = this.generateRecommendations(
      totalLossPct,
      leverageBreaches,
      estimatedLiquidations,
      scenario,
    );

    const result: SystemStressTestResult = {
      scenarioId,
      scenarioName: scenario.name,
      timestamp: Date.now(),
      totalPortfolioLoss: totalLoss,
      totalPortfolioLossPct: totalLossPct,
      fundImpacts,
      agentImpacts,
      insuranceFundDraw: totalLoss * 0.10,  // estimate 10% covered by insurance
      leverageBreaches,
      estimatedLiquidations,
      capitalBufferRequired,
      adjustedMarginRequirement,
      systemSurvivability,
      recommendations,
    };

    this.latestResults.set(scenarioId, result);

    this.emit({ type: 'stress_test_completed', timestamp: Date.now(), payload: result });

    return result;
  }

  runAllStressTests(portfolios: FundPortfolioSnapshot[]): SystemStressTestResult[] {
    return Array.from(this.scenarios.keys()).map(id => this.runStressTest(id, portfolios));
  }

  getLatestResults(): SystemStressTestResult[] {
    return Array.from(this.latestResults.values());
  }

  getResultForScenario(scenarioId: string): SystemStressTestResult | undefined {
    return this.latestResults.get(scenarioId);
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private getShockForAsset(
    assetId: AssetId,
    shocks: Record<string, number>,
  ): number {
    // Exact match first, then wildcards
    if (shocks[assetId] !== undefined) return shocks[assetId];

    // Category match (e.g. 'RWA' matches 'RWA_TOKEN_XYZ')
    for (const [key, factor] of Object.entries(shocks)) {
      if (key !== 'ALL_ASSETS' && assetId.toUpperCase().startsWith(key.toUpperCase())) {
        return factor;
      }
    }

    // Global fallback
    return shocks['ALL_ASSETS'] ?? 1.0;
  }

  private generateRecommendations(
    lossPct: number,
    leverageBreaches: number,
    liquidations: number,
    scenario: SystemStressScenario,
  ): string[] {
    const recs: string[] = [];

    if (lossPct >= 0.30) {
      recs.push('Reduce system-wide leverage immediately to below 3x');
    }
    if (leverageBreaches > 0) {
      recs.push(`${leverageBreaches} fund(s) would breach leverage limits — pre-emptive deleveraging recommended`);
    }
    if (liquidations > 0) {
      recs.push(`${liquidations} agent(s) face liquidation risk — increase margin requirements`);
    }
    if (scenario.liquidityImpact >= 0.60) {
      recs.push('Increase insurance fund target coverage ratio by 2-5%');
    }
    if (scenario.correlationSpike >= 0.40) {
      recs.push('Diversify asset exposure to reduce correlation clustering');
    }
    if (recs.length === 0) {
      recs.push('System resilience adequate — maintain current risk controls');
    }

    return recs;
  }

  private emit(event: SystemicRiskEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}

export function createAIStressTestingEngine(
  config?: Partial<StressTestingConfig>,
): AIStressTestingEngine {
  return new DefaultAIStressTestingEngine(config);
}
