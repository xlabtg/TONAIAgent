/**
 * TONAIAgent - Inter-Protocol Liquidity Standard (IPLS) (Issue #124)
 *
 * A standardized framework for cross-protocol liquidity routing, risk-aware
 * capital allocation, shared clearing logic, and institutional interoperability
 * on The Open Network. IPLS v1 enables any IPLS-compliant protocol to act as
 * a LiquidityProvider or LiquidityConsumer with full on-chain trust guarantees.
 *
 * Architecture:
 * GAAMP → Liquidity Network → IPLS Layer → External Protocols → Cross-chain Liquidity
 *
 * Components:
 * - LiquidityStandardManager  — IPLS v1 provider/consumer interfaces + routing
 * - CrossProtocolRiskManager  — risk assessment, AI insights, stress testing
 * - LiquidityPassportManager  — on-chain identity, credit history, compliance
 * - AdapterLayerManager       — cross-chain vaults, bridge abstraction, failover
 * - ProtocolApiManager        — capital request standards, reporting, governance
 *
 * @example
 * ```typescript
 * import { createIPLSManager } from '@tonaiagent/core/ipls';
 *
 * const ipls = createIPLSManager({
 *   version: '1.0.0',
 *   crossChainEnabled: true,
 *   aiRiskEnabled: true,
 *   governanceEnabled: true,
 * });
 *
 * // Register a liquidity provider
 * const provider = await ipls.liquidity.registerProvider({
 *   name: 'TON AMM Pool',
 *   type: 'dex',
 *   chainIds: ['ton'],
 *   supportedAssets: ['ton', 'usdt', 'usdc'],
 * });
 *
 * // Issue a liquidity passport
 * const passport = await ipls.passport.issuePassport({
 *   holderId: provider.id,
 *   holderName: provider.name,
 *   capitalOrigin: { primaryChain: 'ton', capitalType: 'native' },
 * });
 *
 * // Assess protocol risk
 * const assessment = await ipls.risk.assessProtocol({
 *   protocolId: provider.id,
 *   protocolName: provider.name,
 *   includeAIInsights: true,
 * });
 *
 * // Register a cross-chain adapter
 * const adapter = await ipls.adapter.registerAdapter({
 *   name: 'TON↔ETH Bridge',
 *   bridgeType: 'lock_mint',
 *   supportedChains: ['ton', 'ethereum'],
 *   supportedAssets: ['usdt', 'usdc'],
 *   config: {},
 * });
 * await ipls.adapter.setAdapterStatus(adapter.id, 'active');
 *
 * console.log('IPLS system health:', ipls.getHealth());
 * ```
 */

// Export all types
export * from './types';

// Export LiquidityStandard components
export {
  DefaultLiquidityStandardManager,
  createLiquidityStandardManager,
  type LiquidityStandardManager,
  type RegisterProviderRequest,
  type UpdateProviderRequest,
  type ProviderFilters,
  type RegisterConsumerRequest,
  type UpdateConsumerRequest,
  type ConsumerFilters,
  type DepositResult,
  type WithdrawResult,
  type LiquidityQuote,
  type ReturnResult,
  type ConsumerRiskReport,
  type MatchResult,
  type OptimalAllocation,
  type AllocationLeg,
  type ProviderMetricsReport,
  type ConsumerMetricsReport,
  type StandardMetrics,
  type LiquidityStandardHealth,
} from './liquidity-standard';

// Export CrossProtocolRisk components
export {
  DefaultCrossProtocolRiskManager,
  createCrossProtocolRiskManager,
  type CrossProtocolRiskManager,
  type AssessProtocolRequest,
  type RiskDimensionOverrides,
  type AssessmentFilters,
  type NetworkExposureMap,
  type NetworkNode,
  type NetworkEdge,
  type ClusterRisk,
  type ContagionAnalysis,
  type ContagionPath,
  type StressTestScenario,
  type MarketShock,
  type StressTestResult,
  type ProtocolStressResult,
  type RiskThresholds,
  type RiskSummary,
  type RiskTrendData,
  type RiskModuleHealth,
} from './risk-module';

// Export LiquidityPassport components
export {
  DefaultLiquidityPassportManager,
  createLiquidityPassportManager,
  type LiquidityPassportManager,
  type IssuePassportRequest,
  type UpdatePassportRequest,
  type PassportFilters,
  type VerificationResult,
  type ComplianceCheckResult,
  type PassportRequirements,
  type EligibilityResult,
  type PassportValidationResult,
  type PassportMetrics,
  type PassportSystemHealth,
} from './liquidity-passport';

// Export AdapterLayer components
export {
  DefaultAdapterLayerManager,
  createAdapterLayerManager,
  type AdapterLayerManager,
  type RegisterAdapterRequest,
  type UpdateAdapterRequest,
  type AdapterFilters,
  type CrossChainTransferRequest,
  type CrossChainTransferResult,
  type TransferExecutionStatus,
  type TransferEstimate,
  type TransferStatus,
  type CrossChainRoute,
  type RouteHop,
  type RouteComparison,
  type GasEstimate,
  type GasPriceInfo,
  type VaultBalance,
  type VaultRebalanceResult,
  type VaultRebalanceOperation,
  type VaultStatus,
  type FailoverStatus,
  type FailoverResult,
  type BridgeQuoteRequest,
  type BridgeQuote,
  type BridgeInfo,
  type AdapterLayerMetrics,
  type TransferHistoryFilters,
  type AdapterLayerHealth,
} from './adapter-layer';

// Export ProtocolApi components
export {
  DefaultProtocolApiManager,
  createProtocolApiManager,
  type ProtocolApiManager,
  type CapitalRequestResult,
  type CapitalRequestFilters,
  type ReportSubmissionResult,
  type ReportFilters,
  type AggregatedReport,
  type RiskDisclosureResult,
  type DisclosureFilters,
  type GovernanceFilters,
  type GovernanceExecutionResult,
  type ProtocolRegistration,
  type RegisteredProtocol,
  type ProtocolListFilters,
  type ApiMetrics,
  type ProtocolActivity,
  type ProtocolApiHealth,
} from './protocol-api';

// ============================================================================
// Unified IPLS Manager Interface
// ============================================================================

import {
  IPLSConfig,
  IPLSHealth,
  IPLSEventCallback,
} from './types';

import {
  DefaultLiquidityStandardManager,
  createLiquidityStandardManager,
  type LiquidityStandardManager,
} from './liquidity-standard';

import {
  DefaultCrossProtocolRiskManager,
  createCrossProtocolRiskManager,
  type CrossProtocolRiskManager,
} from './risk-module';

import {
  DefaultLiquidityPassportManager,
  createLiquidityPassportManager,
  type LiquidityPassportManager,
} from './liquidity-passport';

import {
  DefaultAdapterLayerManager,
  createAdapterLayerManager,
  type AdapterLayerManager,
} from './adapter-layer';

import {
  DefaultProtocolApiManager,
  createProtocolApiManager,
  type ProtocolApiManager,
} from './protocol-api';

export interface IPLSManager {
  readonly liquidity: LiquidityStandardManager;
  readonly risk: CrossProtocolRiskManager;
  readonly passport: LiquidityPassportManager;
  readonly adapter: AdapterLayerManager;
  readonly api: ProtocolApiManager;

  onEvent(callback: IPLSEventCallback): void;
  getHealth(): IPLSHealth;
  getConfig(): IPLSConfig;
}

// ============================================================================
// Default Unified Implementation
// ============================================================================

export class DefaultIPLSManager implements IPLSManager {
  readonly liquidity: DefaultLiquidityStandardManager;
  readonly risk: DefaultCrossProtocolRiskManager;
  readonly passport: DefaultLiquidityPassportManager;
  readonly adapter: DefaultAdapterLayerManager;
  readonly api: DefaultProtocolApiManager;

  private config: IPLSConfig;
  private eventCallbacks: IPLSEventCallback[] = [];

  constructor(config?: Partial<IPLSConfig>) {
    this.config = {
      enabled: true,
      version: '1.0.0',
      defaultAllocationStrategy: 'ai_optimized',
      maxProviders: 100,
      maxConsumers: 500,
      riskAssessmentIntervalMs: 3600000,
      passportExpiryDays: 365,
      clearingEnabled: true,
      defaultNettingMode: 'bilateral',
      aiRiskEnabled: true,
      crossChainEnabled: true,
      governanceEnabled: true,
      ...config,
    };

    this.liquidity = createLiquidityStandardManager();
    this.risk = createCrossProtocolRiskManager(this.config.riskModuleConfig);
    this.passport = createLiquidityPassportManager(this.config.passportConfig);
    this.adapter = createAdapterLayerManager(this.config.adapterLayerConfig);
    this.api = createProtocolApiManager(this.config.protocolApiConfig);

    this.wireEventPropagation();
  }

  onEvent(callback: IPLSEventCallback): void {
    this.eventCallbacks.push(callback);
    this.liquidity.onEvent(callback);
    this.risk.onEvent(callback);
    this.passport.onEvent(callback);
    this.adapter.onEvent(callback);
    this.api.onEvent(callback);
  }

  getHealth(): IPLSHealth {
    const liquidityHealth = this.liquidity.getHealth();
    const riskHealth = this.risk.getHealth();
    const passportHealth = this.passport.getHealth();
    const adapterHealth = this.adapter.getHealth();
    const apiHealth = this.api.getHealth();

    const subStatuses = [
      liquidityHealth.status,
      riskHealth.status,
      passportHealth.status,
      adapterHealth.status,
      apiHealth.status,
    ];

    const status =
      subStatuses.includes('unhealthy')
        ? 'unhealthy'
        : subStatuses.includes('degraded')
          ? 'degraded'
          : 'healthy';

    return {
      status,
      providerCount: liquidityHealth.providerCount,
      activeProviders: liquidityHealth.activeProviders,
      consumerCount: liquidityHealth.consumerCount,
      activeConsumers: liquidityHealth.activeConsumers,
      adapterCount: adapterHealth.adapterCount,
      activeAdapters: adapterHealth.activeAdapters,
      openClearingSessions: 0,
      lastHealthCheck: new Date(),
      issues: [
        ...liquidityHealth.issues,
        ...riskHealth.issues,
        ...passportHealth.issues,
        ...adapterHealth.issues,
        ...apiHealth.issues,
      ],
    };
  }

  getConfig(): IPLSConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private wireEventPropagation(): void {
    // Each sub-manager emits independently; the unified manager just fan-outs
    // via the onEvent registrations set during construction. No additional
    // wiring needed beyond the `onEvent` call above.
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createIPLSManager(config?: Partial<IPLSConfig>): DefaultIPLSManager {
  return new DefaultIPLSManager(config);
}

export default DefaultIPLSManager;

// ============================================================================
// Default Configuration Export
// ============================================================================

export const DEFAULT_IPLS_CONFIG: IPLSConfig = {
  enabled: true,
  version: '1.0.0',
  defaultAllocationStrategy: 'ai_optimized',
  maxProviders: 100,
  maxConsumers: 500,
  riskAssessmentIntervalMs: 3600000,
  passportExpiryDays: 365,
  clearingEnabled: true,
  defaultNettingMode: 'bilateral',
  aiRiskEnabled: true,
  crossChainEnabled: true,
  governanceEnabled: true,
};
