/**
 * Protocol & Infrastructure Domain Exports
 *
 * Open Agent Protocol, TON Factory, multi-tenancy, distributed scheduling,
 * global infrastructure, and Agent Developer SDK.
 * Import directly via subpath for tree-shaking:
 *   import { ... } from '@tonaiagent/core/protocol'
 *   import { ... } from '@tonaiagent/core/ton-factory'
 *   import { ... } from '@tonaiagent/core/multi-tenant'
 *   import { ... } from '@tonaiagent/core/distributed-scheduler'
 *   import { ... } from '@tonaiagent/core/global-infrastructure'
 *   import { ... } from '@tonaiagent/core/sdk'
 */

// Open Agent Protocol - Universal standard for autonomous agents
export * as Protocol from '../protocol';
export {
  // Main protocol class
  OpenAgentProtocol,
  createAgent,
  // Types
  type OpenAgentProtocolConfig,
  type CreateAgentInput,
  type ProtocolAgent,
  type ProtocolEventHandler,
} from '../protocol';

// TON Smart Contract Factory
export * as TonFactory from '../../connectors/ton-factory';
export {
  // Main service
  createTonFactoryService,
  DefaultTonFactoryService,
  // Factory Contract
  createFactoryContractManager,
  FactoryContractManager,
  deriveContractAddress,
  // Agent Wallet
  createAgentWalletManager,
  AgentWalletManager,
  // Note: exported as TonFactoryNonCustodialProvider to avoid conflict with security module
  NonCustodialProvider as TonFactoryNonCustodialProvider,
  MPCProvider,
  // Note: exported as TonFactorySmartContractWalletProvider to avoid conflict with security module
  SmartContractWalletProvider as TonFactorySmartContractWalletProvider,
  // Strategy Executor
  createStrategyExecutor,
  StrategyExecutor,
  // On-Chain Registry
  createAgentRegistry,
  AgentRegistry,
  // Fee Manager
  createFeeManager,
  FeeManager,
  // Types
  type TonFactoryConfig,
  type TonFactoryHealth,
  type TonFactoryService,
  type DeployAgentInput,
  type DeployStrategyInput,
  type DeploymentResult,
  type AgentWallet,
  type AgentRegistryEntry,
  type FeeRecord,
} from '../../connectors/ton-factory';

// Secure Multi-Tenant Agent Infrastructure & Isolation Layer (Issue #99)
export * as MultiTenantModule from '../../services/multi-tenant';
export {
  // Manager
  MultiTenantManager,
  createMultiTenantManager,
  DEFAULT_MULTI_TENANT_CONFIG,
  // Components
  TenantManager,
  createTenantManager,
  RbacManager,
  createRbacManager,
  IsolationEngine,
  createIsolationEngine,
  TenantVault,
  createTenantVault,
  WalletIsolationManager,
  createWalletIsolationManager,
  // Constants
  TIER_LIMITS,
  SYSTEM_ROLES,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_WALLET_LIMITS,
  // Types
  type MultiTenantManagerInterface,
  type Tenant,
  type TenantStatus,
  type TenantTier,
  type TenantLimits,
  type TenantSettings,
  type TenantContext,
  type CreateTenantInput,
  type TenantUser,
  type Role,
  type RoleName,
  type Permission,
  type ResourceType,
  type ActionType,
  type RbacPolicy,
  type AccessCheckRequest,
  type AccessCheckResult,
  type TenantSandbox,
  type SandboxStatus,
  type SandboxResourceLimits,
  type NetworkPolicy,
  type SandboxViolation,
  type IsolationMode,
  type TenantSecret,
  type SecretType,
  type CreateSecretInput,
  type GetSecretResult,
  type IsolatedWallet,
  type WalletIsolationStatus,
  type WalletIsolationLimits,
  type MultiTenantConfig,
  type MultiTenantHealth,
  type MultiTenantEvent,
  type MultiTenantEventType,
  type MultiTenantEventCallback,
  type TenantIsolationReport,
} from '../../services/multi-tenant';

// Distributed Scheduler & Event Engine (Issue #93)
export * as DistributedSchedulerModule from '../../services/distributed-scheduler';
export {
  // Scheduler
  DistributedScheduler,
  createDistributedScheduler,
  DEFAULT_SCHEDULER_CONFIG,
  // Event Bus
  EventBus,
  createEventBus,
  // Worker Pool
  WorkerPool,
  createWorkerPool,
  DEFAULT_WORKER_POOL_CONFIG,
  // Retry Engine
  RetryEngine,
  createRetryEngine,
  DEFAULT_RETRY_POLICY,
  // On-Chain Listener
  OnChainListenerManager,
  createOnChainListenerManager,
  // API
  DistributedSchedulerApi,
  createDistributedSchedulerApi,
  // Error
  DistributedSchedulerError,
  // Types
  type ExecutionMode,
  type JobPriority,
  type JobStatus,
  type CreateJobInput,
  type ScheduledJob as DistributedSchedulerJob,
  type ExecutionRecord,
  type BusEvent,
  type EventSubscriberCallback,
  type EventUnsubscribe,
  type SubscribeOptions,
  type WorkerStatus,
  type WorkerInfo,
  type WorkerPoolConfig,
  type OnChainEventType,
  type CreateListenerInput,
  type OnChainListener,
  type OnChainEvent,
  type RetryPolicy,
  type DeadLetterEntry,
  type DistributedSchedulerConfig,
  type SchedulerHealth,
  type SchedulerMetrics,
  type SchedulerEventType,
  type SchedulerEvent,
  type SchedulerEventHandler,
  type SchedulerUnsubscribe,
  type DistributedSchedulerErrorCode,
  type SchedulerApiRequest,
  type SchedulerApiResponse,
  type SystemEventTopic,
} from '../../services/distributed-scheduler';

// Global Infrastructure & Edge Deployment (Issue #100)
export * as GlobalInfrastructureModule from '../../services/global-infrastructure';
export {
  // Manager
  GlobalInfrastructureManager,
  createGlobalInfrastructureManager,
  DEFAULT_GLOBAL_INFRA_CONFIG,
  // Node Registry
  EdgeNodeRegistry,
  createEdgeNodeRegistry,
  DEFAULT_EDGE_FEATURES,
  REGION_ZONE_MAP,
  REGION_COMPLIANCE_MAP,
  // Geo Router
  GeoRouter,
  createGeoRouter,
  // Compliance Engine
  ComplianceEngine,
  createComplianceEngine,
  REGIONAL_COMPLIANCE_PROFILES,
  // Global Scheduler
  GlobalScheduler,
  createGlobalScheduler,
  // Cost Optimizer
  CostOptimizer,
  createCostOptimizer,
  DEFAULT_PRICING,
  // Global Monitor
  GlobalMonitor,
  createGlobalMonitor,
  // Edge Intelligence
  EdgeIntelligenceLayer,
  createEdgeIntelligenceLayer,
  // Types
  type CloudProvider as GlobalCloudProvider,
  type RegionCode,
  type GeographicZone,
  type NodeStatus,
  type DeploymentModel,
  type EdgeNode,
  type EdgeNodeFeatures,
  type EdgeNodeMetrics,
  type RoutingStrategy,
  type RoutingRule,
  type AgentPlacementRequest,
  type AgentPlacementResult,
  type InferenceModel,
  type EdgeInferenceTask,
  type EdgeCacheConfig,
  type GlobalJobTrigger,
  type GlobalScheduledJob,
  type GlobalJobExecution,
  type ComplianceFramework,
  type RegionalComplianceProfile,
  type ComplianceCheckRequest,
  type ComplianceCheckResult,
  type ComputePricing,
  type CostAllocation,
  type CostOptimizationRecommendation,
  type GlobalHealthStatus,
  type RegionHealthStatus,
  type GlobalMetricsSummary,
  type GlobalInfraEventType,
  type GlobalInfraEvent,
  type GlobalInfraEventCallback,
  type GlobalInfrastructureConfig,
} from '../../services/global-infrastructure';

// Agent Developer SDK (Issue #158)
export * as AgentDeveloperSDK from '../../packages/sdk';
export {
  // Agent Framework
  AgentDeveloperFramework,
  createAgentFramework,
  AgentFrameworkError,
  // Runtime API
  DefaultRuntimeAPI,
  createRuntimeAPI,
  RuntimeAPIError,
  // Strategy Toolkit
  StrategyDevelopmentToolkit,
  createStrategyToolkit,
  RiskConfigHelper,
  ExampleAlgorithms,
  // Backtesting
  BacktestingCompatLayer,
  createBacktestingCompat,
  // Key agent framework types
  type AgentDefinition,
  type AgentStrategySpec,
  type AgentStrategyType,
  type AgentCondition,
  type AgentRiskRules,
  type AgentExecutionContext,
  type AgentExecutionLogic,
  type AgentExecutionSummary,
  type AgentConfiguration,
  type AgentEventHandlers,
  type AgentMarketDataSnapshot,
  type AgentOrderRequest,
  type AgentOrderResult,
  type AgentPortfolioSnapshot,
  type AgentPosition,
  type AgentCapitalAllocation,
  type AgentAllocationResult,
  type AgentRiskMetrics,
  type AgentValidationResult,
  type AgentDeploymentOptions,
  type AgentDeploymentResult,
  // Key runtime API types
  type RuntimeAPI,
  type RuntimeAPIConfig,
  type RuntimeMarketData,
  type OHLCVBar,
  type RuntimePortfolio,
  type RuntimeRiskMetrics,
  type RuntimeSimulationState,
  // Key strategy toolkit types
  type StrategyTemplate,
  type PositionSizeParams,
  type BollingerBands,
  type MACDResult,
  // Key backtesting types
  type BacktestConfig,
  type BacktestResult,
  type BacktestPerformance,
  type BacktestTrade,
  type BacktestValidationRequirements,
  type BacktestValidationResult,
} from '../../packages/sdk';
