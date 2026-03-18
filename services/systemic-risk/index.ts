/**
 * Systemic Risk & Stability Framework — Main Module Index
 * Issue #122: System-wide risk containment and stability controls
 *
 * Architecture:
 *   Agents/Funds → Prime Brokerage → Clearing House
 *   → Systemic Risk Engine → Leverage Governor → Stability Fund
 */

// ─── Re-export types ──────────────────────────────────────────────────────────

export * from './types';

// ─── Re-export sub-modules ───────────────────────────────────────────────────

export {
  DefaultGlobalExposureMonitor,
  createGlobalExposureMonitor,
  type GlobalExposureMonitor,
  type FundExposureInput,
} from './exposure-monitoring';

export {
  DefaultDynamicLeverageGovernor,
  createDynamicLeverageGovernor,
  type DynamicLeverageGovernor,
  type LeverageCheckResult,
} from './leverage-governor';

export {
  DefaultCircuitBreakerSystem,
  createCircuitBreakerSystem,
  DEFAULT_CIRCUIT_BREAKER_RULES,
  type CircuitBreakerSystem,
  type TriggerInput,
} from './circuit-breaker';

export {
  DefaultInsuranceAndStabilityFund,
  createInsuranceAndStabilityFund,
  type InsuranceAndStabilityFund,
  type ContributeParams,
  type SubmitClaimParams,
} from './insurance-fund';

export {
  DefaultAIStressTestingEngine,
  createAIStressTestingEngine,
  DEFAULT_STRESS_SCENARIOS,
  type AIStressTestingEngine,
  type FundPortfolioSnapshot,
} from './stress-testing';

export {
  DefaultStabilityScoreEngine,
  createStabilityScoreEngine,
  type StabilityScoreEngine,
  type StabilityInputs,
} from './stability-score';

// ─── Unified Manager ─────────────────────────────────────────────────────────

import { DefaultGlobalExposureMonitor } from './exposure-monitoring';
import { DefaultDynamicLeverageGovernor } from './leverage-governor';
import { DefaultCircuitBreakerSystem } from './circuit-breaker';
import { DefaultInsuranceAndStabilityFund } from './insurance-fund';
import { DefaultAIStressTestingEngine } from './stress-testing';
import { DefaultStabilityScoreEngine } from './stability-score';

import type { GlobalExposureMonitor } from './exposure-monitoring';
import type { DynamicLeverageGovernor } from './leverage-governor';
import type { CircuitBreakerSystem } from './circuit-breaker';
import type { InsuranceAndStabilityFund } from './insurance-fund';
import type { AIStressTestingEngine } from './stress-testing';
import type { StabilityScoreEngine } from './stability-score';

import type {
  SystemicRiskConfig,
  SystemicRiskEvent,
  SystemicRiskEventCallback,
  StabilityIndex,
  CircuitBreakerState,
  InsuranceFundState,
  LeverageGovernorState,
  ExposureHeatMap,
} from './types';

export interface SystemicRiskSystemStatus {
  stabilityIndex: StabilityIndex | undefined;
  circuitBreaker: CircuitBreakerState;
  insuranceFund: InsuranceFundState;
  leverageGovernor: LeverageGovernorState;
  heatMap: ExposureHeatMap;
  stressTestCount: number;
}

export interface SystemicRiskManager {
  readonly exposureMonitor: GlobalExposureMonitor;
  readonly leverageGovernor: DynamicLeverageGovernor;
  readonly circuitBreaker: CircuitBreakerSystem;
  readonly insuranceFund: InsuranceAndStabilityFund;
  readonly stressTesting: AIStressTestingEngine;
  readonly stabilityScore: StabilityScoreEngine;
  getSystemStatus(): SystemicRiskSystemStatus;
  onEvent(callback: SystemicRiskEventCallback): void;
}

export class DefaultSystemicRiskManager implements SystemicRiskManager {
  readonly exposureMonitor: GlobalExposureMonitor;
  readonly leverageGovernor: DynamicLeverageGovernor;
  readonly circuitBreaker: CircuitBreakerSystem;
  readonly insuranceFund: InsuranceAndStabilityFund;
  readonly stressTesting: AIStressTestingEngine;
  readonly stabilityScore: StabilityScoreEngine;

  private globalCallbacks: SystemicRiskEventCallback[] = [];

  constructor(config?: SystemicRiskConfig) {
    this.exposureMonitor = new DefaultGlobalExposureMonitor(config?.exposureMonitoring);
    this.leverageGovernor = new DefaultDynamicLeverageGovernor(config?.leverageGovernor);
    this.circuitBreaker = new DefaultCircuitBreakerSystem(config?.circuitBreaker);
    this.insuranceFund = new DefaultInsuranceAndStabilityFund(config?.insuranceFund);
    this.stressTesting = new DefaultAIStressTestingEngine(config?.stressTesting);
    this.stabilityScore = new DefaultStabilityScoreEngine(config?.stabilityScore);

    this.setupEventForwarding();
  }

  getSystemStatus(): SystemicRiskSystemStatus {
    const heatMap = this.exposureMonitor.getHeatMap();
    return {
      stabilityIndex: this.stabilityScore.getLatestIndex(),
      circuitBreaker: this.circuitBreaker.getState(),
      insuranceFund: this.insuranceFund.getState(),
      leverageGovernor: this.leverageGovernor.getState(),
      heatMap,
      stressTestCount: this.stressTesting.getLatestResults().length,
    };
  }

  onEvent(callback: SystemicRiskEventCallback): void {
    this.globalCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forward = (event: SystemicRiskEvent) => {
      for (const cb of this.globalCallbacks) {
        cb(event);
      }
    };

    this.exposureMonitor.onEvent(forward);
    this.leverageGovernor.onEvent(forward);
    this.circuitBreaker.onEvent(forward);
    this.insuranceFund.onEvent(forward);
    this.stressTesting.onEvent(forward);
    this.stabilityScore.onEvent(forward);
  }
}

export function createSystemicRiskManager(
  config?: SystemicRiskConfig,
): SystemicRiskManager {
  return new DefaultSystemicRiskManager(config);
}
