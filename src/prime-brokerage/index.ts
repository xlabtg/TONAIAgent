/**
 * TONAIAgent - AI Prime Brokerage
 *
 * Comprehensive Prime Brokerage infrastructure for autonomous AI funds and agents
 * on The Open Network (TON). Provides institutional-grade services including
 * multi-fund custody & clearing, margin & leverage engine, risk aggregation,
 * capital efficiency optimization, institutional reporting, securities lending,
 * and cross-chain prime brokerage.
 *
 * Architecture:
 * Investors → Tokenized Fund → Prime Brokerage Layer → AI Risk Engine → Agent Strategies → Execution (TON + Cross-chain)
 *
 * Features:
 * - Multi-Fund Custody & Clearing: centralized capital pools, multi-agent capital allocation,
 *   internal clearing, net exposure calculation, cross-strategy netting, capital efficiency,
 *   automated collateral management
 * - Margin & Leverage Engine: risk-based leverage, dynamic margin requirements,
 *   volatility-adjusted collateral, real-time liquidation protection
 * - Risk Aggregation Layer: portfolio-level and cross-agent exposure, systemic risk modeling,
 *   VaR and stress simulations
 * - Capital Efficiency Module: idle capital optimization, yield stacking, cross-fund liquidity,
 *   internal liquidity routing
 * - Institutional Reporting Suite: NAV calculations, risk exposure reports, audit logs,
 *   regulatory-ready statements
 * - Securities Lending & Yield: token lending, agent-to-agent liquidity, RWA-backed lending,
 *   structured yield products
 * - Cross-Chain Prime Brokerage: multi-chain capital, cross-chain collateral, bridge-aware margin
 *
 * @example
 * ```typescript
 * import { createPrimeBrokerageManager } from '@tonaiagent/core/prime-brokerage';
 *
 * // Initialize the prime brokerage
 * const pb = createPrimeBrokerageManager();
 *
 * // Set up capital pools
 * const pool = pb.custody.createCapitalPool('Main Pool', 10000000);
 * pb.custody.allocateToFund(pool.id, 'fund_alpha', 5000000, 'Alpha AI Fund');
 * pb.custody.allocateToFund(pool.id, 'fund_beta', 3000000, 'Beta AI Fund');
 *
 * // Allocate to agents with leverage
 * pb.custody.allocateToAgent('fund_alpha', 'agent_1', 1000000, 'arbitrage', 2.0);
 * pb.custody.allocateToAgent('fund_alpha', 'agent_2', 1000000, 'yield_farming', 1.5);
 *
 * // Set up margin accounts
 * const marginAccount = pb.marginEngine.createMarginAccount('agent_1', 'agent');
 * pb.marginEngine.updateMarginAccount(marginAccount.id, { totalEquity: 1000000, usedMargin: 400000 });
 *
 * // Calculate safe leverage
 * const leverage = pb.marginEngine.calculateSafeLeverage('agent_1', 0.25, 0.8);
 * console.log('Max safe leverage:', leverage.currentMaxLeverage);
 *
 * // Run stress tests
 * const stressResults = pb.riskAggregation.runAllStressTests([]);
 * console.log('Stress test results:', stressResults.length, 'scenarios');
 *
 * // Generate NAV report
 * const navReport = pb.reporting.generateNAVReport({ type: 'system' }, []);
 * console.log('Total NAV:', navReport.totalNAV);
 *
 * // Get system status
 * const status = pb.getSystemStatus();
 * console.log('Prime Brokerage Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Custody & Clearing Module
export {
  DefaultCustodyAndClearingManager,
  createCustodyAndClearingManager,
  type CustodyAndClearingManager,
  type ClearingFilters,
  type DepositCollateralParams,
  type NettingResult,
  type CollateralRebalanceResult,
} from './custody-clearing';

// Export Margin & Leverage Engine
export {
  DefaultMarginAndLeverageEngine,
  createMarginAndLeverageEngine,
  type MarginAndLeverageEngine,
  type MarginAccountUpdate,
  type LiquidationRiskAssessment,
  type SystemLeverageMetrics,
  type CascadeRiskResult,
  type CascadeScenario,
} from './margin-leverage';

// Export Risk Aggregation Layer
export {
  DefaultRiskAggregationLayer,
  createRiskAggregationLayer,
  DEFAULT_STRESS_SCENARIOS,
  type RiskAggregationLayer,
  type AggregatedPosition,
  type CrossPortfolioExposure,
  type AssetClassExposure,
  type ChainExposure,
  type StrategyExposure,
  type AgentExposureSummary,
  type FundExposureSummary,
  type VaRResult,
  type RiskLimitCheckResult,
  type RiskLimitViolation,
  type RiskLimitWarning,
} from './risk-aggregation';

// Export Capital Efficiency Module
export {
  DefaultCapitalEfficiencyModule,
  createCapitalEfficiencyModule,
  type CapitalEfficiencyModule,
  type FundCapitalSnapshot,
  type FundContribution,
  type BorrowingRecord,
  type RoutingRequest,
  type NettablePosition,
  type NettingOptimization,
  type InternalRouteRecommendation,
  type YieldStackOptimization,
  type YieldLayer,
  type CapitalEfficiencyScore,
  type CapitalOptimizationReport,
  type CreateYieldStackParams,
} from './capital-efficiency';

// Export Institutional Reporting Suite
export {
  DefaultInstitutionalReportingSuite,
  createInstitutionalReportingSuite,
  type InstitutionalReportingSuite,
  type ReportScope,
  type PositionForNAV,
  type PositionForRisk,
  type ReportFilters,
  type AuditLogFilters,
  type PerformanceAttribution,
  type StrategyAttribution,
  type AssetAttribution,
  type RiskFactorAttribution,
} from './reporting';

// Export Securities Lending Manager
export {
  DefaultSecuritiesLendingManager,
  createSecuritiesLendingManager,
  type SecuritiesLendingManager,
  type ListTokenParams,
  type TokenFilters,
  type InitiateLendingParams,
  type AgreementFilters,
  type CreateAgentLoanParams,
  type CreateStructuredProductParams,
  type SubscriptionResult,
  type ProductFilters,
  type MaturityResult,
  type LendingRevenueReport,
  type AgreementRevenue,
  type AssetRevenue,
  type TokenUtilizationReport,
  type AssetUtilization,
} from './securities-lending';

// Export Cross-Chain Prime Brokerage Manager
export {
  DefaultCrossChainPrimeBrokerageManager,
  createCrossChainPrimeBrokerageManager,
  type CrossChainPrimeBrokerageManager,
  type RegisterChainPositionParams,
  type ChainPositionUpdate,
  type BridgeCollateralParams,
  type CollateralBridgeFilters,
  type RouteCapitalParams,
  type RouteFilters,
  type ConsolidatedCapital,
  type MultiChainSummary,
  type BridgeCostAnalysis,
  type BridgeAlternative,
  type BridgeRouteRecommendation,
  type BridgeUtilization,
} from './cross-chain-brokerage';

// ============================================================================
// Unified Prime Brokerage Manager
// ============================================================================

import { DefaultCustodyAndClearingManager, createCustodyAndClearingManager } from './custody-clearing';
import { DefaultMarginAndLeverageEngine, createMarginAndLeverageEngine } from './margin-leverage';
import { DefaultRiskAggregationLayer, createRiskAggregationLayer } from './risk-aggregation';
import { DefaultCapitalEfficiencyModule, createCapitalEfficiencyModule } from './capital-efficiency';
import { DefaultInstitutionalReportingSuite, createInstitutionalReportingSuite } from './reporting';
import { DefaultSecuritiesLendingManager, createSecuritiesLendingManager } from './securities-lending';
import { DefaultCrossChainPrimeBrokerageManager, createCrossChainPrimeBrokerageManager } from './cross-chain-brokerage';
import {
  PrimeBrokerageConfig,
  PrimeBrokerageEvent,
  PrimeBrokerageEventCallback,
} from './types';

export interface PrimeBrokerageSystemStatus {
  capitalPools: number;
  totalPooledCapital: number;
  marginAccounts: number;
  accountsAtRisk: number;
  activeStressScenarios: number;
  yieldStacks: number;
  activeSecuritiesLoans: number;
  crossChainPositions: number;
  liquidityPools: number;
  pendingClearingEntries: number;
  generatedAt: Date;
}

export interface PrimeBrokerageManager {
  readonly custody: DefaultCustodyAndClearingManager;
  readonly marginEngine: DefaultMarginAndLeverageEngine;
  readonly riskAggregation: DefaultRiskAggregationLayer;
  readonly capitalEfficiency: DefaultCapitalEfficiencyModule;
  readonly reporting: DefaultInstitutionalReportingSuite;
  readonly securitiesLending: DefaultSecuritiesLendingManager;
  readonly crossChain: DefaultCrossChainPrimeBrokerageManager;

  onEvent(callback: PrimeBrokerageEventCallback): void;
  getSystemStatus(): PrimeBrokerageSystemStatus;
}

export class DefaultPrimeBrokerageManager implements PrimeBrokerageManager {
  readonly custody: DefaultCustodyAndClearingManager;
  readonly marginEngine: DefaultMarginAndLeverageEngine;
  readonly riskAggregation: DefaultRiskAggregationLayer;
  readonly capitalEfficiency: DefaultCapitalEfficiencyModule;
  readonly reporting: DefaultInstitutionalReportingSuite;
  readonly securitiesLending: DefaultSecuritiesLendingManager;
  readonly crossChain: DefaultCrossChainPrimeBrokerageManager;

  private readonly eventCallbacks: PrimeBrokerageEventCallback[] = [];

  constructor(config?: PrimeBrokerageConfig) {
    this.custody = createCustodyAndClearingManager(config?.custody);
    this.marginEngine = createMarginAndLeverageEngine(config?.marginEngine);
    this.riskAggregation = createRiskAggregationLayer(config?.riskAggregation);
    this.capitalEfficiency = createCapitalEfficiencyModule(config?.capitalEfficiency);
    this.reporting = createInstitutionalReportingSuite(config?.reporting);
    this.securitiesLending = createSecuritiesLendingManager(config?.securitiesLending);
    this.crossChain = createCrossChainPrimeBrokerageManager(config?.crossChain);

    // Wire up event forwarding
    this.setupEventForwarding();
  }

  onEvent(callback: PrimeBrokerageEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): PrimeBrokerageSystemStatus {
    const pools = this.custody.listCapitalPools();
    const totalCapital = pools.reduce((sum, p) => sum + p.totalCapital, 0);
    const marginAccounts = this.marginEngine.listMarginAccounts();
    const atRisk = marginAccounts.filter(
      a => a.status === 'margin_call' || a.status === 'warning'
    ).length;
    const stressScenarios = this.riskAggregation.listScenarios();
    const yieldStacks = this.capitalEfficiency.listYieldStacks();
    const lendingAgreements = this.securitiesLending.listLendingAgreements({ status: 'on_loan' });
    const chainPositions = this.crossChain.listChainPositions();
    const liquidityPools = this.capitalEfficiency.listLiquidityPools();
    const clearingEntries = this.custody.listClearingEntries({ status: 'pending' });

    return {
      capitalPools: pools.length,
      totalPooledCapital: totalCapital,
      marginAccounts: marginAccounts.length,
      accountsAtRisk: atRisk,
      activeStressScenarios: stressScenarios.length,
      yieldStacks: yieldStacks.length,
      activeSecuritiesLoans: lendingAgreements.length,
      crossChainPositions: chainPositions.length,
      liquidityPools: liquidityPools.length,
      pendingClearingEntries: clearingEntries.length,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: PrimeBrokerageEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.custody.onEvent(forwardEvent);
    this.marginEngine.onEvent(forwardEvent);
    this.riskAggregation.onEvent(forwardEvent);
    this.capitalEfficiency.onEvent(forwardEvent);
    this.reporting.onEvent(forwardEvent);
    this.securitiesLending.onEvent(forwardEvent);
    this.crossChain.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPrimeBrokerageManager(config?: PrimeBrokerageConfig): DefaultPrimeBrokerageManager {
  return new DefaultPrimeBrokerageManager(config);
}

// Default export
export default DefaultPrimeBrokerageManager;
