/**
 * ACMS Layer 6 — Risk & Stability Layer
 *
 * Systemic risk monitoring and stability management for the ACMS:
 * real-time Stability Index computation, leverage governance,
 * circuit breakers, insurance fund management, and stress testing.
 * Implements the Systemic Risk & Stability Framework (Issue #122).
 */

import {
  AgentId,
  RiskLevel,
  SystemStabilityIndex,
  LeverageGovernor,
  CircuitBreaker,
  CircuitBreakerState,
  InsuranceFund,
  RiskStabilityLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Risk & Stability Layer Interfaces
// ============================================================================

export interface RiskStabilityLayerManager {
  computeStabilityIndex(metrics: StabilityMetrics): SystemStabilityIndex;
  getLatestStabilityIndex(): SystemStabilityIndex | undefined;

  updateLeverageGovernor(params: UpdateLeverageParams): LeverageGovernor;
  getLeverageGovernor(): LeverageGovernor;
  setAgentLeverageLimit(agentId: AgentId, maxLeverage: number): void;
  triggerAutoDeleverage(): DelevaragingResult;

  registerCircuitBreaker(params: RegisterCircuitBreakerParams): CircuitBreaker;
  triggerCircuitBreaker(breakerId: string, currentValue: number): CircuitBreaker;
  resetCircuitBreaker(breakerId: string): void;
  getCircuitBreaker(breakerId: string): CircuitBreaker | undefined;
  listCircuitBreakers(state?: CircuitBreakerState): CircuitBreaker[];

  getInsuranceFund(): InsuranceFund;
  addInsurancePremium(amountUsd: number): void;
  drawFromInsuranceFund(amountUsd: number, purpose: string): InsuranceFundDrawdown;

  runStressTest(scenario: StressTestScenario): StressTestResult;
  listStressTestResults(): StressTestResult[];

  getLayerStatus(): RiskStabilityLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface StabilityMetrics {
  liquidityScore: number;        // 0-100
  leverageScore: number;         // 0-100
  collateralizationScore: number; // 0-100
  concentrationScore: number;    // 0-100
  volatilityScore: number;       // 0-100
}

export interface UpdateLeverageParams {
  systemMaxLeverage: number;
  autoDeleverageThreshold: number;
}

export interface DelevaragingResult {
  agentsDelevered: number;
  capitalReleased: number;
  newSystemLeverage: number;
  completedAt: Date;
}

export interface RegisterCircuitBreakerParams {
  name: string;
  triggerCondition: string;
  triggerThreshold: number;
  affectedSystems: string[];
}

export interface StressTestScenario {
  name: string;
  description: string;
  liquidityShock: number;     // % decline in liquidity
  priceShock: number;         // % asset price decline
  leverageShock: number;      // Multiplier on leverage ratio
  correlationBreakdown: boolean;
}

export interface StressTestResult {
  id: string;
  scenarioName: string;
  systemLossUsd: number;
  affectedAgents: number;
  insuranceFundDepletion: number;  // % of insurance fund used
  stabilityIndexImpact: number;    // Points change to stability index
  worstCaseDrawdown: number;
  recoveryTimeEstimateDays: number;
  riskLevel: RiskLevel;
  testedAt: Date;
}

export interface InsuranceFundDrawdown {
  amount: number;
  purpose: string;
  remainingBalance: number;
  drawnAt: Date;
}

// ============================================================================
// Default Risk & Stability Layer Manager
// ============================================================================

export class DefaultRiskStabilityLayerManager implements RiskStabilityLayerManager {
  private latestStabilityIndex: SystemStabilityIndex | undefined;
  private leverageGovernor: LeverageGovernor = {
    systemMaxLeverage: 10,
    currentSystemLeverage: 1,
    agentLeverageLimits: new Map(),
    autoDeleverageThreshold: 8,
    autoDeleverageActive: false,
  };
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly stressResults: StressTestResult[] = [];
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;
  private insuranceFund: InsuranceFund = {
    id: 'insurance_fund_main',
    totalValueUsd: 10_000_000,
    reserveRatio: 0.05,
    coverage: {
      maxSingleDefault: 5_000_000,
      maxTotalLoss: 10_000_000,
      fundedByProtocol: 7_000_000,
      fundedByPremiums: 3_000_000,
    },
    triggerConditions: ['default_exposure > coverage.maxSingleDefault', 'stability_index < 30'],
  };

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  computeStabilityIndex(metrics: StabilityMetrics): SystemStabilityIndex {
    const weights = { liquidity: 0.25, leverage: 0.25, collateralization: 0.2, concentration: 0.15, volatility: 0.15 };
    const score = Math.round(
      metrics.liquidityScore * weights.liquidity +
      metrics.leverageScore * weights.leverage +
      metrics.collateralizationScore * weights.collateralization +
      metrics.concentrationScore * weights.concentration +
      metrics.volatilityScore * weights.volatility
    );

    const prevScore = this.latestStabilityIndex?.score;
    const trend = prevScore === undefined ? 'stable'
      : score > prevScore + 2 ? 'improving'
      : score < prevScore - 2 ? 'deteriorating'
      : 'stable';

    const riskLevel: RiskLevel = score >= 70 ? 'low' : score >= 50 ? 'medium' : score >= 30 ? 'high' : 'critical';

    const index: SystemStabilityIndex = {
      score,
      components: {
        liquidityScore: metrics.liquidityScore,
        leverageScore: metrics.leverageScore,
        collateralizationScore: metrics.collateralizationScore,
        concentrationScore: metrics.concentrationScore,
        volatilityScore: metrics.volatilityScore,
      },
      trend,
      riskLevel,
      computedAt: new Date(),
    };
    this.latestStabilityIndex = index;
    this.emitEvent('stability_index_updated', 6, { score, riskLevel, trend });
    return index;
  }

  getLatestStabilityIndex(): SystemStabilityIndex | undefined {
    return this.latestStabilityIndex;
  }

  updateLeverageGovernor(params: UpdateLeverageParams): LeverageGovernor {
    this.leverageGovernor = {
      ...this.leverageGovernor,
      systemMaxLeverage: params.systemMaxLeverage,
      autoDeleverageThreshold: params.autoDeleverageThreshold,
    };
    return this.leverageGovernor;
  }

  getLeverageGovernor(): LeverageGovernor {
    return this.leverageGovernor;
  }

  setAgentLeverageLimit(agentId: AgentId, maxLeverage: number): void {
    this.leverageGovernor.agentLeverageLimits.set(agentId, maxLeverage);
  }

  triggerAutoDeleverage(): DelevaragingResult {
    const result: DelevaragingResult = {
      agentsDelevered: 3,
      capitalReleased: 5_000_000,
      newSystemLeverage: this.leverageGovernor.currentSystemLeverage * 0.8,
      completedAt: new Date(),
    };
    this.leverageGovernor = {
      ...this.leverageGovernor,
      currentSystemLeverage: result.newSystemLeverage,
      autoDeleverageActive: true,
    };
    return result;
  }

  registerCircuitBreaker(params: RegisterCircuitBreakerParams): CircuitBreaker {
    const breaker: CircuitBreaker = {
      id: this.generateId('cb'),
      name: params.name,
      triggerCondition: params.triggerCondition,
      triggerThreshold: params.triggerThreshold,
      currentValue: 0,
      state: 'normal',
      affectedSystems: params.affectedSystems,
    };
    this.circuitBreakers.set(breaker.id, breaker);
    return breaker;
  }

  triggerCircuitBreaker(breakerId: string, currentValue: number): CircuitBreaker {
    const breaker = this.circuitBreakers.get(breakerId);
    if (!breaker) throw new Error(`Circuit breaker ${breakerId} not found`);
    const triggered = currentValue >= breaker.triggerThreshold;
    const updated: CircuitBreaker = {
      ...breaker,
      currentValue,
      state: triggered ? 'triggered' : 'normal',
      triggeredAt: triggered ? new Date() : breaker.triggeredAt,
    };
    this.circuitBreakers.set(breakerId, updated);
    if (triggered) {
      this.emitEvent('circuit_breaker_triggered', 6, {
        breakerId,
        name: breaker.name,
        currentValue,
        threshold: breaker.triggerThreshold,
      });
    }
    return updated;
  }

  resetCircuitBreaker(breakerId: string): void {
    const breaker = this.circuitBreakers.get(breakerId);
    if (!breaker) throw new Error(`Circuit breaker ${breakerId} not found`);
    this.circuitBreakers.set(breakerId, {
      ...breaker,
      state: 'normal',
      currentValue: 0,
      resetAt: new Date(),
    });
  }

  getCircuitBreaker(breakerId: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(breakerId);
  }

  listCircuitBreakers(state?: CircuitBreakerState): CircuitBreaker[] {
    const all = Array.from(this.circuitBreakers.values());
    if (state) return all.filter(cb => cb.state === state);
    return all;
  }

  getInsuranceFund(): InsuranceFund {
    return this.insuranceFund;
  }

  addInsurancePremium(amountUsd: number): void {
    this.insuranceFund = {
      ...this.insuranceFund,
      totalValueUsd: this.insuranceFund.totalValueUsd + amountUsd,
      coverage: {
        ...this.insuranceFund.coverage,
        fundedByPremiums: this.insuranceFund.coverage.fundedByPremiums + amountUsd,
      },
    };
  }

  drawFromInsuranceFund(amountUsd: number, purpose: string): InsuranceFundDrawdown {
    const drawn = Math.min(amountUsd, this.insuranceFund.totalValueUsd);
    this.insuranceFund = {
      ...this.insuranceFund,
      totalValueUsd: this.insuranceFund.totalValueUsd - drawn,
    };
    return {
      amount: drawn,
      purpose,
      remainingBalance: this.insuranceFund.totalValueUsd,
      drawnAt: new Date(),
    };
  }

  runStressTest(scenario: StressTestScenario): StressTestResult {
    // Simplified stress test model
    const systemTvl = 100_000_000;
    const systemLoss = systemTvl * (scenario.priceShock / 100) * (scenario.leverageShock);
    const insuranceDepletion = Math.min(100, (systemLoss / this.insuranceFund.totalValueUsd) * 100);
    const stabilityImpact = -(scenario.priceShock + scenario.liquidityShock) / 2;

    const riskLevel: RiskLevel = systemLoss > systemTvl * 0.2 ? 'critical'
      : systemLoss > systemTvl * 0.1 ? 'high'
      : systemLoss > systemTvl * 0.05 ? 'medium'
      : 'low';

    const result: StressTestResult = {
      id: this.generateId('stress'),
      scenarioName: scenario.name,
      systemLossUsd: systemLoss,
      affectedAgents: Math.round(scenario.priceShock * 0.5),
      insuranceFundDepletion: Math.round(insuranceDepletion),
      stabilityIndexImpact: Math.round(stabilityImpact),
      worstCaseDrawdown: scenario.priceShock + scenario.leverageShock * 5,
      recoveryTimeEstimateDays: Math.round(scenario.priceShock / 5) + 1,
      riskLevel,
      testedAt: new Date(),
    };
    this.stressResults.push(result);
    return result;
  }

  listStressTestResults(): StressTestResult[] {
    return [...this.stressResults];
  }

  getLayerStatus(): RiskStabilityLayerStatus {
    const breakers = Array.from(this.circuitBreakers.values());
    const triggered = breakers.filter(cb => cb.state !== 'normal');
    return {
      stabilityIndex: this.latestStabilityIndex?.score ?? 0,
      riskLevel: this.latestStabilityIndex?.riskLevel ?? 'medium',
      circuitBreakersActive: triggered.length,
      circuitBreakersTotal: breakers.length,
      systemLeverage: this.leverageGovernor.currentSystemLeverage,
      insuranceFundUsd: this.insuranceFund.totalValueUsd,
      autoDeleverageActive: this.leverageGovernor.autoDeleverageActive,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createRiskStabilityLayerManager(): DefaultRiskStabilityLayerManager {
  return new DefaultRiskStabilityLayerManager();
}
