/**
 * Finance Domain Exports
 *
 * Investment layer, prime brokerage, clearing house, liquidity network,
 * systemic risk, and inter-protocol liquidity standard.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/investment'
 *   import { ... } from '@tonaiagent/core/prime-brokerage'
 *   import { ... } from '@tonaiagent/core/clearing-house'
 *   import { ... } from '@tonaiagent/core/liquidity-network'
 *   import { ... } from '@tonaiagent/core/cross-chain-liquidity'
 *   import { ... } from '@tonaiagent/core/ipls'
 */

// Autonomous AI Investment Layer (Issue #102)
export * as InvestmentLayerModule from '../../services/investment';
export {
  // Unified layer
  DefaultInvestmentLayer,
  createInvestmentLayer,
  DEFAULT_INVESTMENT_LAYER_CONFIG,
  // Vault manager
  DefaultVaultManager,
  createVaultManager,
  // Risk engine
  // Note: exported as InvestmentDefaultRiskEngine to avoid conflict with security module
  DefaultRiskEngine as InvestmentDefaultRiskEngine,
  // Note: exported as createInvestmentRiskEngine to avoid conflict with security module
  createRiskEngine as createInvestmentRiskEngine,
  // Allocation engine
  DefaultAllocationEngine,
  createAllocationEngine,
  // Portfolio optimizer
  DefaultPortfolioOptimizer,
  createPortfolioOptimizer,
  // Institutional mode
  DefaultInstitutionalModeManager,
  createInstitutionalModeManager,
  // Performance analytics
  DefaultPerformanceAnalyticsEngine,
  createPerformanceAnalyticsEngine,
  // Types
  type InvestmentLayerService,
  type InvestmentLayerConfig,
  type InvestmentLayerHealth,
  type VaultManager,
  type Vault,
  type VaultType,
  type VaultStatus,
  type VaultRiskParameters,
  type VaultAllocationLimits,
  type CreateVaultInput,
  type DepositResult,
  type WithdrawalRequest,
  // Note: exported as InvestmentRiskEngine to avoid conflict with security module's RiskEngine
  type RiskEngine as InvestmentRiskEngine,
  type AgentRiskProfile,
  // Note: exported as InvestmentRiskLevel to avoid conflict with security/regulatory module's RiskLevel
  type RiskLevel as InvestmentRiskLevel,
  type RiskCheckResult,
  type RiskViolation,
  type CircuitBreakerEvent,
  type EmergencyStopEvent,
  type AllocationEngine,
  type AllocationPlan,
  type AllocationStrategy,
  type StrategyAllocation,
  type CreateAllocationPlanInput,
  type RebalanceResult,
  type PortfolioOptimizer,
  type StrategyPerformanceScore,
  type OptimizationResult,
  type OptimizationObjective,
  type VolatilityMetrics,
  type InstitutionalModeManager,
  type ManagedVault,
  type InstitutionalTier,
  // Note: exported as VaultComplianceStatus to avoid conflict with regulatory module's ComplianceStatus
  type ComplianceStatus as VaultComplianceStatus,
  type ComplianceConstraint,
  // Note: exported as InvestmentAuditEntry to avoid conflict with lifecycle-orchestrator's AuditEntry
  type AuditEntry as InvestmentAuditEntry,
  type DelegationPermission,
  type CreateManagedVaultInput,
  type PerformanceAnalyticsEngine,
  type VaultPerformanceMetrics,
  type PerformanceSnapshot,
  type HistoricalReturn,
  type PerformanceDashboardData,
  type InvestmentEvent,
  type InvestmentEventType,
  type InvestmentEventCallback,
} from '../../services/investment';

// AI Prime Brokerage (Issue #108)
export * as PrimeBrokerage from '../../services/prime-brokerage';
export {
  // Unified manager
  DefaultPrimeBrokerageManager,
  createPrimeBrokerageManager,
  // Custody & Clearing
  DefaultCustodyAndClearingManager,
  createCustodyAndClearingManager,
  // Margin & Leverage
  DefaultMarginAndLeverageEngine,
  createMarginAndLeverageEngine,
  // Risk Aggregation
  DefaultRiskAggregationLayer,
  createRiskAggregationLayer,
  DEFAULT_STRESS_SCENARIOS,
  // Capital Efficiency
  DefaultCapitalEfficiencyModule,
  createCapitalEfficiencyModule,
  // Institutional Reporting
  DefaultInstitutionalReportingSuite,
  createInstitutionalReportingSuite,
  // Securities Lending
  DefaultSecuritiesLendingManager,
  createSecuritiesLendingManager,
  // Cross-Chain Prime Brokerage
  DefaultCrossChainPrimeBrokerageManager,
  createCrossChainPrimeBrokerageManager,
  // Types
  type PrimeBrokerageManager,
  type PrimeBrokerageSystemStatus,
  type PrimeBrokerageConfig,
  type PrimeBrokerageEvent,
  type PrimeBrokerageEventCallback,
} from '../../services/prime-brokerage';

// AI-native Clearing House (Issue #120)
export * as ClearingHouse from '../../services/clearing-house';
export {
  // Unified manager
  DefaultClearingHouseManager,
  createClearingHouseManager,
  // Central Clearing
  DefaultCentralClearingManager,
  createCentralClearingManager,
  // Netting Engine
  DefaultNettingEngine,
  createNettingEngine,
  // Collateral Management
  DefaultCollateralManager,
  createCollateralManager,
  // Default Resolution
  DefaultDefaultResolutionManager,
  createDefaultResolutionManager,
  // Settlement Layer
  DefaultSettlementLayer,
  createSettlementLayer,
  // Audit Module
  DefaultClearingAuditModule,
  createClearingAuditModule,
  // Types
  type ClearingHouseManager,
  type ClearingHouseSystemStatus,
  type ClearingHouseConfig,
  type ClearingHouseEvent,
  type ClearingHouseEventCallback,
} from '../../services/clearing-house';

// Institutional Liquidity Network (Issue #119)
export * as LiquidityNetwork from '../../connectors/liquidity-network';
export {
  // Unified manager
  DefaultLiquidityNetworkManager,
  createLiquidityNetworkManager,
  // Aggregation Layer
  DefaultLiquidityAggregationManager,
  createLiquidityAggregationManager,
  // Smart Order Routing
  DefaultSmartOrderRoutingEngine,
  createSmartOrderRoutingEngine,
  // Internal Liquidity Pools
  DefaultInternalLiquidityPoolManager,
  createInternalLiquidityPoolManager,
  // Deep Liquidity Vaults
  DefaultDeepLiquidityVaultManager,
  createDeepLiquidityVaultManager,
  // Risk-Controlled Execution
  DefaultRiskControlledExecutionManager,
  createRiskControlledExecutionManager,
  // Types
  type LiquidityNetworkManager,
  type LiquidityNetworkSystemStatus,
  type LiquidityNetworkConfig,
  type LiquidityNetworkEvent,
  type LiquidityNetworkEventCallback,
} from '../../connectors/liquidity-network';

// Systemic Risk & Stability Framework (Issue #122)
export * as SystemicRisk from '../../services/systemic-risk';
export {
  // Unified manager
  DefaultSystemicRiskManager,
  createSystemicRiskManager,
  // Exposure Monitoring
  DefaultGlobalExposureMonitor,
  createGlobalExposureMonitor,
  // Leverage Governor
  DefaultDynamicLeverageGovernor,
  createDynamicLeverageGovernor,
  // Circuit Breaker
  DefaultCircuitBreakerSystem,
  createCircuitBreakerSystem,
  DEFAULT_CIRCUIT_BREAKER_RULES,
  // Insurance Fund
  DefaultInsuranceAndStabilityFund,
  createInsuranceAndStabilityFund,
  // Stress Testing
  DefaultAIStressTestingEngine,
  createAIStressTestingEngine,
  // Stability Score
  DefaultStabilityScoreEngine,
  createStabilityScoreEngine,
  // Types
  type SystemicRiskManager,
  type SystemicRiskSystemStatus,
  type SystemicRiskConfig,
  type SystemicRiskEvent,
  type SystemicRiskEventCallback,
  // Note: exported as SystemicRiskCircuitBreakerState to avoid conflict with dao-governance module
  type CircuitBreakerState as SystemicRiskCircuitBreakerState,
  // Note: exported as SystemicRiskCircuitBreakerEvent to avoid conflict with investment module
  type CircuitBreakerEvent as SystemicRiskCircuitBreakerEvent,
} from '../../services/systemic-risk';

// Inter-Protocol Liquidity Standard (Issue #124)
export * as IPLSModule from '../../connectors/ipls';
export {
  // Unified manager
  DefaultIPLSManager,
  createIPLSManager,
  DEFAULT_IPLS_CONFIG,
  // Liquidity Standard
  DefaultLiquidityStandardManager,
  createLiquidityStandardManager,
  // Cross-Protocol Risk
  DefaultCrossProtocolRiskManager,
  createCrossProtocolRiskManager,
  // Liquidity Passport
  DefaultLiquidityPassportManager,
  createLiquidityPassportManager,
  // Adapter Layer
  DefaultAdapterLayerManager,
  createAdapterLayerManager,
  // Protocol API
  DefaultProtocolApiManager,
  createProtocolApiManager,
  // Types
  type IPLSManager,
  type IPLSConfig,
  type IPLSHealth,
  type IPLSEventCallback,
  type LiquidityProvider,
  type LiquidityConsumer,
  type LiquidityRequest,
  type LiquidityResponse,
  type LiquidityRoute,
  type ExposureReport,
  type CrossProtocolRiskAssessment,
  type LiquidityPassport,
  type CrossChainAdapter,
  type ClearingSession,
  type CapitalRequest,
  type ReportingPayload,
  type RiskDisclosure,
  type GovernanceHook,
  type IPLSEvent,
  type LiquidityStandardManager,
  type CrossProtocolRiskManager,
  type LiquidityPassportManager,
  type AdapterLayerManager,
  type ProtocolApiManager,
} from '../../connectors/ipls';

// Cross-Chain Liquidity Integration Layer
export * as CrossChainLiquidity from '../../connectors/cross-chain-liquidity';
