/**
 * TONAIAgent - AI-Native Credit, Lending & Underwriting Layer
 *
 * Comprehensive AI-native credit and lending infrastructure integrated with
 * CoinRabbit as the initial CeFi lending provider. The system enables:
 *
 * - AI agents to autonomously borrow, lend, refinance, and manage collateral
 * - Real-time credit and risk scoring
 * - Adaptive loan optimization
 * - Automated liquidation and hedging
 * - Capital efficiency optimization
 *
 * This is a core pillar of the autonomous financial economy built on The Open Network.
 *
 * @example
 * ```typescript
 * import { createAICreditManager } from '@tonaiagent/core/ai-credit';
 *
 * const credit = createAICreditManager({
 *   lending: { enabled: true, maxLTV: 0.75 },
 *   creditScoring: { enabled: true, scoringModel: 'ai_powered' },
 *   collateralManagement: { autoMonitoring: true, hedgingEnabled: true },
 *   underwriting: { riskModel: 'moderate' },
 * });
 *
 * // Get credit score
 * const score = await credit.creditScorer.calculateScore('user-1');
 *
 * // Get loan quote
 * const quote = await credit.lending.getBestQuote({
 *   collateralAsset: 'TON',
 *   collateralAmount: '1000',
 *   borrowAsset: 'USDT',
 * });
 *
 * // Create loan
 * const loan = await credit.lending.createLoan({
 *   collateralAssets: [{ symbol: 'TON', amount: '1000' }],
 *   borrowAsset: 'USDT',
 *   borrowAmount: '500',
 * });
 *
 * // Create leveraged strategy
 * const strategy = await credit.strategies.createStrategy('user-1', {
 *   name: 'TON Yield Farm',
 *   type: 'leveraged_yield_farming',
 *   config: { maxLeverage: 2, targetAPY: 0.20 },
 * });
 * ```
 */

// Export all types
export * from './types';

// Export CoinRabbit adapter
export {
  DefaultCoinRabbitAdapter,
  createCoinRabbitAdapter,
  type CoinRabbitAdapter,
  type CoinRabbitAPIConfig,
} from './coinrabbit-adapter';

// Export Lending Manager
export {
  DefaultLendingManager,
  createLendingManager,
  type LendingManager,
  type ProviderAdapter,
  type LoanHealthCheck,
  type LendingStats,
} from './lending-manager';

// Export Credit Scorer
export {
  DefaultCreditScorer,
  createCreditScorer,
  type CreditScorer,
  type UserWalletData,
  type UserDeFiData,
  type UserLoanHistory,
  type UserPortfolioData,
  type UserBehavioralData,
} from './credit-scoring';

// Export Collateral Manager
export {
  DefaultCollateralManager,
  createCollateralManager,
  type CollateralManager,
  type CollateralAssetInput,
  type CollateralStats,
} from './collateral-manager';

// Export Underwriting Engine
export {
  DefaultUnderwritingEngine,
  createUnderwritingEngine,
  type UnderwritingEngine,
  type UnderwritingStats,
} from './underwriting-engine';

// Export Strategy Engine
export {
  DefaultStrategyEngine,
  createStrategyEngine,
  type StrategyEngine,
  type PositionRequest,
  type RebalanceAnalysis,
  type AllocationState,
  type OptimizationResult,
  type StrategyRecommendation,
  type SuggestedStrategy,
  type EstimatedReturns,
  type StrategyEngineStats,
} from './strategy-engine';

// ============================================================================
// Import Components for Manager
// ============================================================================

import {
  AICreditConfig,
  AICreditEvent,
  AICreditEventCallback,
} from './types';

import { DefaultCoinRabbitAdapter, createCoinRabbitAdapter } from './coinrabbit-adapter';
import { DefaultLendingManager, createLendingManager } from './lending-manager';
import { DefaultCreditScorer, createCreditScorer } from './credit-scoring';
import { DefaultCollateralManager, createCollateralManager } from './collateral-manager';
import { DefaultUnderwritingEngine, createUnderwritingEngine } from './underwriting-engine';
import { DefaultStrategyEngine, createStrategyEngine } from './strategy-engine';

// ============================================================================
// AI Credit Manager - Unified Entry Point
// ============================================================================

export interface AICreditManager {
  readonly enabled: boolean;
  readonly coinrabbit: DefaultCoinRabbitAdapter;
  readonly lending: DefaultLendingManager;
  readonly creditScorer: DefaultCreditScorer;
  readonly collateral: DefaultCollateralManager;
  readonly underwriting: DefaultUnderwritingEngine;
  readonly strategies: DefaultStrategyEngine;

  // Health check
  getHealth(): Promise<AICreditHealth>;

  // Statistics
  getStats(): Promise<AICreditStats>;

  // Events
  onEvent(callback: AICreditEventCallback): void;
}

export interface AICreditHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    coinrabbit: boolean;
    lending: boolean;
    creditScorer: boolean;
    collateral: boolean;
    underwriting: boolean;
    strategies: boolean;
  };
  lastCheck: Date;
  details: Record<string, unknown>;
}

export interface AICreditStats {
  // Lending stats
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: string;
  totalCollateral: string;
  averageLTV: number;

  // Credit stats
  totalScored: number;
  averageCreditScore: number;

  // Collateral stats
  totalPositions: number;
  positionsAtRisk: number;
  averageHealthFactor: number;

  // Strategy stats
  activeStrategies: number;
  totalStrategyTVL: string;
  averageStrategyAPY: number;

  // Underwriting stats
  totalAssessments: number;
  approvalRate: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAICreditManager implements AICreditManager {
  readonly enabled: boolean;
  readonly coinrabbit: DefaultCoinRabbitAdapter;
  readonly lending: DefaultLendingManager;
  readonly creditScorer: DefaultCreditScorer;
  readonly collateral: DefaultCollateralManager;
  readonly underwriting: DefaultUnderwritingEngine;
  readonly strategies: DefaultStrategyEngine;

  private readonly eventCallbacks: AICreditEventCallback[] = [];

  constructor(config: Partial<AICreditConfig> = {}) {
    this.enabled = true;

    // Initialize CoinRabbit adapter
    this.coinrabbit = createCoinRabbitAdapter(config.providers?.coinrabbit);

    // Initialize lending manager
    this.lending = createLendingManager(config.lending, config.borrowing);

    // Initialize credit scorer
    this.creditScorer = createCreditScorer(config.creditScoring);

    // Initialize collateral manager
    this.collateral = createCollateralManager(config.collateralManagement);

    // Initialize underwriting engine (with shared credit scorer)
    this.underwriting = createUnderwritingEngine(config.underwriting, this.creditScorer);

    // Initialize strategy engine
    this.strategies = createStrategyEngine(config.strategyEngine);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  async getHealth(): Promise<AICreditHealth> {
    const [
      coinrabbitHealthy,
    ] = await Promise.all([
      this.coinrabbit.connected || this.coinrabbit.connect().then(() => true).catch(() => false),
    ]);

    const components = {
      coinrabbit: coinrabbitHealthy,
      lending: this.lending.config.enabled,
      creditScorer: this.creditScorer.config.enabled,
      collateral: this.collateral.config.enabled,
      underwriting: this.underwriting.config.enabled,
      strategies: this.strategies.config.enabled,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    let overall: AICreditHealth['overall'];
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
      lastCheck: new Date(),
      details: {
        coinrabbitConnected: this.coinrabbit.connected,
        lendingEnabled: this.lending.config.enabled,
        creditScoringEnabled: this.creditScorer.config.enabled,
        collateralMonitoring: this.collateral.config.autoMonitoring,
        underwritingModel: this.underwriting.config.riskModel,
        strategiesEnabled: this.strategies.config.enabled,
      },
    };
  }

  async getStats(): Promise<AICreditStats> {
    const [
      lendingStats,
      collateralStats,
      underwritingStats,
      strategyStats,
    ] = await Promise.all([
      this.lending.getStats(),
      this.collateral.getStats(),
      this.underwriting.getStats(),
      this.strategies.getStats(),
    ]);

    return {
      // Lending stats
      totalLoans: lendingStats.totalLoans,
      activeLoans: lendingStats.activeLoans,
      totalBorrowed: lendingStats.totalBorrowed,
      totalCollateral: lendingStats.totalCollateral,
      averageLTV: lendingStats.averageLTV,

      // Credit stats (would track scored users)
      totalScored: 0,
      averageCreditScore: 0,

      // Collateral stats
      totalPositions: collateralStats.totalPositions,
      positionsAtRisk: collateralStats.positionsAtRisk,
      averageHealthFactor: collateralStats.averageHealthFactor,

      // Strategy stats
      activeStrategies: strategyStats.activeStrategies,
      totalStrategyTVL: strategyStats.totalTVL,
      averageStrategyAPY: strategyStats.averageAPY,

      // Underwriting stats
      totalAssessments: underwritingStats.totalAssessments,
      approvalRate: underwritingStats.approvalRate,
    };
  }

  onEvent(callback: AICreditEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private setupEventForwarding(): void {
    const forwardEvent = (event: AICreditEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    // Subscribe to all component events
    this.coinrabbit.onEvent(forwardEvent);
    this.lending.onEvent(forwardEvent);
    this.creditScorer.onEvent(forwardEvent);
    this.collateral.onEvent(forwardEvent);
    this.underwriting.onEvent(forwardEvent);
    this.strategies.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAICreditManager(
  config?: Partial<AICreditConfig>
): DefaultAICreditManager {
  return new DefaultAICreditManager(config);
}

// Default export
export default DefaultAICreditManager;
