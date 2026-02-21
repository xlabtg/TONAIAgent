/**
 * TONAIAgent - Token Strategy Module
 *
 * Comprehensive token strategy for the AI-native autonomous financial ecosystem.
 * Includes launch strategy, liquidity flywheel, valuation modeling, and simulation.
 *
 * @example
 * ```typescript
 * import {
 *   createTokenStrategyManager,
 *   TokenStrategyConfig,
 * } from '@tonaiagent/core/token-strategy';
 *
 * const strategy = createTokenStrategyManager({
 *   launch: { totalSupply: '1000000000', ... },
 *   flywheel: { phases: [...], ... },
 *   simulation: { initialSupply: '1000000000', ... },
 * });
 *
 * // Get launch progress
 * const progress = strategy.launch.getProgress();
 *
 * // Check liquidity health
 * const health = strategy.liquidity.getLiquidityHealth();
 *
 * // Run simulation
 * const results = strategy.simulation.runSimulation({
 *   years: 5,
 *   scenario: 'base',
 * });
 * ```
 */

// Export all types
export * from './types';

// Export launch manager
export {
  DefaultLaunchManager,
  createLaunchManager,
  type LaunchManager,
  type TransactionValidation,
} from './launch';

// Export liquidity flywheel manager
export {
  DefaultLiquidityFlywheelManager,
  createLiquidityFlywheelManager,
  type LiquidityFlywheelManager,
  type RewardEstimate,
  type HealthAlert,
  type IncentiveParams,
  type IncentiveProjection,
  type UnlockScheduleEntry,
} from './liquidity';

// Export simulation
export {
  DefaultTokenStrategySimulation,
  createTokenStrategySimulation,
  type TokenStrategySimulation,
} from './simulation';

// ============================================================================
// Import Components for Manager
// ============================================================================

import {
  TokenStrategyConfig,
  TokenStrategyEvent,
  TokenStrategyEventCallback,
  LaunchProgress,
  FlywheelMetrics,
  LiquidityHealth,
  ValuationMetrics,
  EquilibriumAnalysis,
  SimulationResult,
  StressTestResult,
} from './types';

import { DefaultLaunchManager, createLaunchManager } from './launch';
import { DefaultLiquidityFlywheelManager, createLiquidityFlywheelManager } from './liquidity';
import { DefaultTokenStrategySimulation, createTokenStrategySimulation } from './simulation';

// ============================================================================
// Token Strategy Manager - Unified Entry Point
// ============================================================================

export interface TokenStrategyManager {
  readonly enabled: boolean;
  readonly launch: DefaultLaunchManager;
  readonly liquidity: DefaultLiquidityFlywheelManager;
  readonly simulation: DefaultTokenStrategySimulation;

  // Health check
  getHealth(): Promise<TokenStrategyHealth>;

  // Quick access methods
  getLaunchProgress(): LaunchProgress;
  getFlywheelMetrics(): FlywheelMetrics;
  getLiquidityHealth(): LiquidityHealth;
  getValuationMetrics(): ValuationMetrics;
  calculateEquilibrium(): EquilibriumAnalysis;
  runSimulation(years: number, scenario?: string): SimulationResult;
  runStressTest(scenario: string): StressTestResult;

  // Events
  onEvent(callback: TokenStrategyEventCallback): void;
}

export interface TokenStrategyHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    launch: boolean;
    liquidity: boolean;
    simulation: boolean;
  };
  liquidityHealth: LiquidityHealth;
  launchPhase: string;
  flywheelStage: number;
  sustainabilityScore: number;
  lastCheck: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultTokenStrategyManager implements TokenStrategyManager {
  readonly enabled: boolean;
  readonly launch: DefaultLaunchManager;
  readonly liquidity: DefaultLiquidityFlywheelManager;
  readonly simulation: DefaultTokenStrategySimulation;

  private readonly eventCallbacks: TokenStrategyEventCallback[] = [];

  constructor(config?: Partial<TokenStrategyConfig>) {
    this.enabled = true;

    // Initialize launch manager
    this.launch = createLaunchManager(config?.launch);

    // Initialize liquidity flywheel
    this.liquidity = createLiquidityFlywheelManager(config?.flywheel);

    // Initialize simulation
    this.simulation = createTokenStrategySimulation(
      config?.simulation,
      config?.valuation
    );

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<TokenStrategyHealth> {
    const liquidityHealth = this.liquidity.getLiquidityHealth();
    const equilibrium = this.simulation.calculateEquilibrium();
    const flywheelStage = this.liquidity.getFlywheelStage();

    const components = {
      launch: true,
      liquidity: liquidityHealth.overall !== 'critical',
      simulation: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: TokenStrategyHealth['overall'];
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      liquidityHealth,
      launchPhase: this.launch.getPhase(),
      flywheelStage: flywheelStage.stage,
      sustainabilityScore: equilibrium.sustainabilityScore,
      lastCheck: new Date(),
    };
  }

  getLaunchProgress(): LaunchProgress {
    return this.launch.getProgress();
  }

  getFlywheelMetrics(): FlywheelMetrics {
    return this.liquidity.getFlywheelMetrics();
  }

  getLiquidityHealth(): LiquidityHealth {
    return this.liquidity.getLiquidityHealth();
  }

  getValuationMetrics(): ValuationMetrics {
    return this.simulation.getValuationMetrics();
  }

  calculateEquilibrium(): EquilibriumAnalysis {
    return this.simulation.calculateEquilibrium();
  }

  runSimulation(years: number, scenario: string = 'base'): SimulationResult {
    return this.simulation.runSimulation({ years, scenario });
  }

  runStressTest(scenario: string): StressTestResult {
    return this.simulation.runStressTest(scenario);
  }

  onEvent(callback: TokenStrategyEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: TokenStrategyEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.launch.onEvent(forwardEvent);
    this.liquidity.onEvent(forwardEvent);
    this.simulation.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTokenStrategyManager(
  config?: Partial<TokenStrategyConfig>
): DefaultTokenStrategyManager {
  return new DefaultTokenStrategyManager(config);
}

// Default export
export default DefaultTokenStrategyManager;
