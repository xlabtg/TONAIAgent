/**
 * Services Domain Exports
 *
 * Omnichain, monitoring, reputation, revenue, regulatory, and autonomous discovery.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/omnichain'
 *   import { ... } from '@tonaiagent/core/monitoring'
 *   import { ... } from '@tonaiagent/core/reputation'
 *   import { ... } from '@tonaiagent/core/revenue'
 *   import { ... } from '@tonaiagent/core/regulatory'
 *   import { ... } from '@tonaiagent/core/autonomous-discovery'
 */

// Re-export omnichain with namespace to avoid naming conflicts
// (omnichain defines its own ActionResult, ChainId, and other common types)
export * as Omnichain from '../../services/omnichain';

// Autonomous Strategy Discovery Engine
export * as AutonomousDiscovery from '../../services/autonomous-discovery';

// Global Regulatory Strategy & Jurisdictional Framework
export * as Regulatory from '../../services/regulatory';
export {
  // Main regulatory manager
  RegulatoryManager,
  createRegulatoryManager,
  // Jurisdiction analyzer
  JurisdictionAnalyzer,
  createJurisdictionAnalyzer,
  // KYC/AML manager
  KycAmlManager,
  createKycAmlManager,
  // AI governance
  AiGovernanceManager,
  createAiGovernanceManager,
  // Regulatory risk engine
  RegulatoryRiskEngine,
  createRegulatoryRiskEngine,
  // Types
  type RegulatoryManagerConfig,
  type JurisdictionCode,
  type ComplianceStatus,
  type KycResult,
  // Note: exported as RegulatoryRiskLevel to avoid conflict with security module's RiskLevel
  type RiskLevel as RegulatoryRiskLevel,
  type AiSystemClassification,
} from '../../services/regulatory';

// Agent Monitoring Dashboard (Issue #215)
export * as Monitoring from '../../services/monitoring';
export {
  // Metrics Service
  MonitoringMetricsService,
  createMonitoringMetricsService,
  createDemoMonitoringMetricsService,
  // API
  MonitoringApi,
  createMonitoringApi,
  createDemoMonitoringApi,
  // Dashboard UI
  DashboardRenderer,
  createDashboardRenderer,
  renderDashboardOverview,
  renderMetricsPanel,
  renderPositionsTable,
  renderTradesTable,
  renderRiskPanel,
  renderEquityCurve,
  getStatusEmoji,
  getRiskEmoji,
  formatPnl,
  formatRoi,
  formatCurrency,
  // Error
  MonitoringError,
  // Config
  DEFAULT_MONITORING_CONFIG,
  // Key types
  type AgentMonitoringStatus,
  type RiskLevel as MonitoringRiskLevel,
  type AgentDashboardSummary,
  type DashboardOverview,
  type AgentMetrics,
  type MonitoringPosition,
  type MonitoringTrade,
  type PositionsResponse as MonitoringPositionsResponse,
  type TradeHistoryResponse as MonitoringTradeHistoryResponse,
  type EquityPoint,
  type EquityCurveResponse,
  type RiskIndicators,
  type MonitoringUpdate,
  type MonitoringUpdateType,
  type MonitoringUpdateHandler,
  type MonitoringUnsubscribe,
  type MonitoringConfig,
  type MonitoringErrorCode,
  type MonitoringApiRequest,
  type MonitoringApiResponse,
} from '../../services/monitoring';

// Strategy Reputation & Ranking Engine (Issue #218)
export * as Reputation from '../../services/reputation';
export {
  // Metrics aggregator
  DefaultMetricsAggregator,
  createMetricsAggregator,
  // Ranking engine
  DefaultStrategyRankingEngine,
  createStrategyRankingEngine,
  // API
  ReputationApi,
  createReputationApi,
  createDemoReputationApi,
  // Error
  ReputationApiError,
  // Key types
  type StrategyPerformanceMetrics,
  type StrategyRiskMetrics,
  type StrategyUsageMetrics,
  type StrategyCommunityFeedback,
  type AggregatedStrategyMetrics,
  type StrategyReputationScore,
  type ReputationTier,
  type ReputationBadge,
  type RankingCategory,
  type Leaderboard,
  type LeaderboardEntry,
  type ReputationWeights,
  type RankingEngineConfig,
  type ReputationEvent,
  type ReputationEventType,
  type ReputationEventCallback,
  type MetricsAggregator,
  type StrategyRankingEngine,
  type StrategyMetricsInput,
  type TradeRecord as ReputationTradeRecord,
  type ReputationApiRequest,
  type ReputationApiResponse,
  type ReputationApiErrorCode,
} from '../../services/reputation';

// Strategy Revenue Sharing System (Issue #219)
export * as Revenue from '../../services/revenue';
export {
  // Fee calculator
  DefaultFeeCalculator,
  createFeeCalculator,
  // Distribution service
  DefaultRevenueDistributionService,
  createRevenueDistributionService,
  // API
  RevenueApi,
  createRevenueApi,
  createDemoRevenueApi,
  // Error
  RevenueApiError,
  // Config
  DEFAULT_REVENUE_SPLIT,
  REVENUE_SPLIT_WITH_REFERRER,
  DEFAULT_REVENUE_CONFIG,
  // Key types
  type FeeType,
  type StrategyMonetization,
  type RevenueSplitConfig,
  type PerformanceFeeInput,
  type PerformanceFeeResult,
  type SubscriptionFeeInput,
  type SubscriptionFeeResult,
  type RevenueEvent as RevenueEventRecord,
  type DeveloperEarnings,
  type StrategyEarnings,
  type StrategyRevenueMetrics,
  type PlatformRevenueMetrics,
  type RevenueSystemEvent,
  type RevenueEventType,
  type RevenueEventCallback,
  type RevenueEngineConfig,
  type FeeCalculator,
  type HybridFeeResult,
  type RevenueSplit,
  type RevenueDistributionService,
  type MonetizationOptions,
  type RevenueApiRequest,
  type RevenueApiResponse,
  type RevenueApiErrorCode,
} from '../../services/revenue';
