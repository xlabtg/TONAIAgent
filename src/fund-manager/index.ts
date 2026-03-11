/**
 * TONAIAgent - AI Fund Manager Module
 *
 * Enables creation and management of AI-driven investment funds that:
 * - Allocate capital across multiple strategies from the Strategy Marketplace
 * - Rebalance portfolios automatically based on drift, schedule, or market conditions
 * - Manage risk exposure with fund-level controls (drawdown, concentration, daily loss)
 * - Track performance metrics (returns, Sharpe ratio, max drawdown, win rate)
 * - Distribute fees to fund creators, strategy developers, and the platform treasury
 * - Support investor participation (deposit, withdraw, track position)
 *
 * Architecture:
 * ```
 * Investors
 *     ↓
 * AI Fund Manager
 *     ↓
 * Allocation Engine
 *     ↓
 * Strategy Agents (via Agent Runtime)
 *     ↓
 * Live Trading Infrastructure
 * ```
 *
 * @example
 * ```typescript
 * import { createAIFundManager } from '@tonaiagent/core/fund-manager';
 *
 * const manager = createAIFundManager({ enabled: true });
 *
 * // 1. Create a fund
 * const fund = manager.funds.createFund({
 *   name: 'Alpha Growth Fund',
 *   description: 'AI-managed diversified DeFi fund',
 *   creatorId: 'creator_123',
 *   type: 'open',
 *   baseAsset: 'TON',
 *   strategyAllocations: [
 *     { strategyId: 'dca-strategy-1', targetWeightPercent: 40 },
 *     { strategyId: 'yield-optimizer-1', targetWeightPercent: 35 },
 *     { strategyId: 'grid-trading-1', targetWeightPercent: 25 },
 *   ],
 *   riskProfile: 'moderate',
 *   managementFeePercent: 2.0,
 *   performanceFeePercent: 20.0,
 * });
 *
 * // 2. Activate the fund
 * manager.funds.activateFund(fund.fundId);
 *
 * // 3. Accept investor deposit
 * const portfolio = manager.funds.getFundPortfolio(fund.fundId)!;
 * const deposit = await manager.investors.deposit(
 *   { fundId: fund.fundId, investorId: 'investor_001', investorAddress: 'EQD...', amount: BigInt(100_000_000_000) },
 *   fund,
 *   portfolio
 * );
 *
 * // 4. Allocate capital to strategies
 * const updatedPortfolio = manager.funds.getFundPortfolio(fund.fundId)!;
 * const { result } = manager.allocation.allocateDeposit(updatedPortfolio, fund, BigInt(100_000_000_000));
 *
 * // 5. Check if rebalancing is needed
 * const trigger = manager.rebalancing.shouldRebalance(fund, updatedPortfolio);
 * if (trigger) {
 *   const plan = manager.rebalancing.generatePlan(fund, updatedPortfolio, trigger);
 *   const { result: rebalResult } = await manager.rebalancing.executePlan(plan, updatedPortfolio);
 * }
 *
 * // 6. Assess risk
 * const riskStatus = manager.riskManagement.assessRisk(fund, updatedPortfolio);
 *
 * // 7. Track performance
 * manager.performance.recordSnapshot(updatedPortfolio, 1);
 * const metrics = manager.performance.calculateMetrics(fund.fundId, 'all_time');
 *
 * // 8. Collect fees
 * manager.fees.collectManagementFee(fund, updatedPortfolio);
 *
 * // 9. Check health
 * const health = manager.getHealth();
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types';

// ============================================================================
// Component Exports
// ============================================================================

export {
  FundCreationManager,
  createFundCreationManager,
  type FundCreationManagerConfig,
  type CreateFundInput,
  type UpdateFundInput,
} from './fund-creation';

export {
  AllocationEngine,
  createAllocationEngine,
  type AllocationEngineConfig,
} from './allocation-engine';

export {
  RebalancingEngine,
  createRebalancingEngine,
  type RebalancingEngineConfig,
} from './rebalancing';

export {
  RiskManagementService,
  createRiskManagementService,
  type RiskManagementConfig,
} from './risk-management';

export {
  InvestorParticipationManager,
  createInvestorParticipationManager,
  type InvestorParticipationConfig,
} from './investor-participation';

export {
  PerformanceTrackingService,
  createPerformanceTrackingService,
  type PerformanceTrackingConfig,
} from './performance-tracking';

export {
  FeeDistributionEngine,
  createFeeDistributionEngine,
  type FeeDistributionConfig,
} from './fee-distribution';

// ============================================================================
// AI Fund Manager — Unified Entry Point
// ============================================================================

import {
  AIFundManagerConfig,
  FundManagerHealth,
  FundManagerMetrics,
  FundManagerEvent,
  FundManagerEventHandler,
  FundManagerUnsubscribe,
  FundRiskLimits,
  RebalancingRules,
} from './types';

import { FundCreationManager, createFundCreationManager } from './fund-creation';
import { AllocationEngine, createAllocationEngine } from './allocation-engine';
import { RebalancingEngine, createRebalancingEngine } from './rebalancing';
import { RiskManagementService, createRiskManagementService } from './risk-management';
import { InvestorParticipationManager, createInvestorParticipationManager } from './investor-participation';
import { PerformanceTrackingService, createPerformanceTrackingService } from './performance-tracking';
import { FeeDistributionEngine, createFeeDistributionEngine } from './fee-distribution';

const DEFAULT_RISK_LIMITS: FundRiskLimits = {
  maxStrategyExposurePercent: 50,
  maxDrawdownPercent: 25,
  maxAssetConcentrationPercent: 40,
  dailyLossLimitPercent: 5,
  volatilityWindowDays: 30,
};

const DEFAULT_REBALANCING_RULES: RebalancingRules = {
  driftThresholdPercent: 5,
  minIntervalSeconds: 3600,
  maxIntervalSeconds: 86400,
  rebalanceOnVolatility: true,
  volatilityThresholdPercent: 30,
};

export const DEFAULT_FUND_MANAGER_CONFIG: AIFundManagerConfig = {
  enabled: true,
  maxActiveFunds: 100,
  defaultRiskLimits: DEFAULT_RISK_LIMITS,
  defaultRebalancingRules: DEFAULT_REBALANCING_RULES,
  maxAumSnapshotsPerFund: 365,
  maxPerformanceRecordsPerFund: 100,
  observability: {
    enableLogging: true,
    logLevel: 'info',
  },
};

export class AIFundManager {
  readonly config: AIFundManagerConfig;
  readonly funds: FundCreationManager;
  readonly allocation: AllocationEngine;
  readonly rebalancing: RebalancingEngine;
  readonly riskManagement: RiskManagementService;
  readonly investors: InvestorParticipationManager;
  readonly performance: PerformanceTrackingService;
  readonly fees: FeeDistributionEngine;

  private readonly eventCallbacks: FundManagerEventHandler[] = [];
  private readonly startTime: Date;
  private running = false;

  constructor(config: Partial<AIFundManagerConfig> = {}) {
    this.config = {
      ...DEFAULT_FUND_MANAGER_CONFIG,
      ...config,
      defaultRiskLimits: { ...DEFAULT_RISK_LIMITS, ...config.defaultRiskLimits },
      defaultRebalancingRules: { ...DEFAULT_REBALANCING_RULES, ...config.defaultRebalancingRules },
      observability: { ...DEFAULT_FUND_MANAGER_CONFIG.observability, ...config.observability },
    };

    this.startTime = new Date();

    this.funds = createFundCreationManager({
      defaultRebalancingRules: this.config.defaultRebalancingRules,
    });

    this.allocation = createAllocationEngine();

    this.rebalancing = createRebalancingEngine();

    this.riskManagement = createRiskManagementService({
      defaultRiskLimits: this.config.defaultRiskLimits,
    });

    this.investors = createInvestorParticipationManager();

    this.performance = createPerformanceTrackingService({
      maxSnapshotsPerFund: this.config.maxAumSnapshotsPerFund,
    });

    this.fees = createFeeDistributionEngine();

    this.wireEventForwarding();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  start(): void {
    if (this.running) return;
    this.running = true;
    this.log('info', 'AIFundManager started');
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.log('info', 'AIFundManager stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  // ============================================================================
  // Health & Metrics
  // ============================================================================

  getHealth(): FundManagerHealth {
    const activeFunds = this.funds.listActiveFunds().length;
    const totalFunds = this.funds.listFunds().length;
    const totalAum = this.funds.listActiveFunds().reduce(
      (sum, f) => sum + (this.funds.getFundPortfolio(f.fundId)?.totalAum ?? BigInt(0)),
      BigInt(0)
    );

    const components = {
      fundCreation: true,
      allocationEngine: true,
      rebalancingEngine: true,
      riskManagement: true,
      investorParticipation: true,
      performanceTracking: true,
      feeDistribution: true,
    };

    const healthyCount = Object.values(components).filter(Boolean).length;
    const totalCount = Object.keys(components).length;

    const overall: FundManagerHealth['overall'] = healthyCount === totalCount ? 'healthy'
      : healthyCount >= Math.ceil(totalCount / 2) ? 'degraded'
      : 'unhealthy';

    const metrics: FundManagerMetrics = {
      totalFunds,
      activeFunds,
      totalAum,
      totalInvestors: this.funds.listActiveFunds().reduce(
        (sum, f) => sum + this.investors.getInvestorCount(f.fundId),
        0
      ),
      totalRebalancings: 0, // Would be tracked in a full implementation
      totalFeesCollected: this.funds.listFunds().reduce(
        (sum, f) => sum + this.fees.getTotalFeesCollected(f.fundId),
        BigInt(0)
      ),
      updatedAt: new Date(),
    };

    return {
      overall,
      running: this.running,
      components,
      metrics,
      lastCheck: new Date(),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(handler: FundManagerEventHandler): FundManagerUnsubscribe {
    this.eventCallbacks.push(handler);
    return () => {
      const idx = this.eventCallbacks.indexOf(handler);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private wireEventForwarding(): void {
    const forward = (event: FundManagerEvent) => {
      for (const cb of this.eventCallbacks) {
        try {
          cb(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.funds.onEvent(forward);
    this.allocation.onEvent(forward);
    this.rebalancing.onEvent(forward);
    this.riskManagement.onEvent(forward);
    this.investors.onEvent(forward);
    this.performance.onEvent(forward);
    this.fees.onEvent(forward);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.observability.enableLogging) return;
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.config.observability.logLevel]) return;

    const entry = { level, message, timestamp: new Date().toISOString(), service: 'fund-manager' };
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry));
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an AI Fund Manager instance.
 *
 * @example
 * ```typescript
 * import { createAIFundManager } from '@tonaiagent/core/fund-manager';
 *
 * const manager = createAIFundManager({ enabled: true });
 * manager.start();
 *
 * const fund = manager.funds.createFund({
 *   name: 'Multi-Strategy Alpha Fund',
 *   description: 'Diversified AI fund across DeFi strategies',
 *   creatorId: 'creator_001',
 *   type: 'open',
 *   baseAsset: 'TON',
 *   strategyAllocations: [
 *     { strategyId: 'strategy-a', targetWeightPercent: 50 },
 *     { strategyId: 'strategy-b', targetWeightPercent: 50 },
 *   ],
 *   riskProfile: 'moderate',
 * });
 *
 * manager.funds.activateFund(fund.fundId);
 * ```
 */
export function createAIFundManager(config?: Partial<AIFundManagerConfig>): AIFundManager {
  return new AIFundManager(config);
}

export default AIFundManager;
